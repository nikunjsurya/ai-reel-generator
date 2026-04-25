#!/usr/bin/env node
// HTTP bridge so n8n (running in Docker) can reach Remotion + ElevenLabs on the
// Windows host. Endpoints:
//   GET  /health               -> { ok: true }
//   POST /narration            -> body {job_id, text, voice_id, model_id?}; calls
//                                 ElevenLabs /with-timestamps, writes
//                                 public/narration-<jobId>.mp3, returns
//                                 {word_timings: [{text,start,end}], duration_sec}
//   POST /captions             -> body {job_id, word_timings, beats, pad_sec?};
//                                 matches beats to word stream, writes
//                                 public/captions-<jobId>.json, returns {duration_sec}
//   POST /content              -> body {job_id, content_json}; writes
//                                 content/<jobId>.json, returns {path}
//   POST /render               -> body {job_id, composition_id?}; runs
//                                 `node scripts/batch-render.mjs [--composition=<id>] content/<jobId>.json`
//                                 returns {mp4_path, elapsed_ms, stdout_tail}
//   POST /broll                -> body {job_id, url, source?}; fetches the
//                                 article page, extracts og:image, downloads it
//                                 to public/broll-<jobId>.<ext>, returns {broll_src}.
//                                 On any failure returns { ok: false } (callers
//                                 can fall back to a solid-color BrollClip).
//   GET  /jobs/recent?topic=X&window_sec=N
//                              -> checks /project/jobs/*.json for a job with a
//                                 matching normalized topic created within the
//                                 last N seconds. Used by Parse Command + Authorize
//                                 for idempotency on repeated /reel <topic>.
//   GET  /jobs/stats           -> {jobs_count, mp4_count, last_job}. Powers /status.
//   POST /jobs/cancel          -> body {user_id?}; marks every recent pending
//                                 job as status:"cancelled". WF2 Load Stored Job
//                                 reads this flag and refuses to render.
//   POST /jobs/clear           -> body {user_id?}; deletes all job files.
//   GET  /mp4-exists?id=<id>   -> {ok, exists, bytes}. Cheap HEAD-style check
//                                 so WF2 can short-circuit the whole render
//                                 pipeline when the user taps Approve on a
//                                 candidate we've already rendered.
//   GET  /mp4/:job_id          -> returns the MP4 binary body (content-type: video/mp4)
//
// All file I/O resolves relative to the repo root so paths are consistent
// whether the bridge is invoked from n8n or a shell session.

import http from "node:http";
import { execFile } from "node:child_process";
import {
  existsSync,
  writeFileSync,
  readFileSync,
  createReadStream,
  statSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const CONTENT_DIR = join(ROOT, "content");
const OUT_DIR = join(ROOT, "out");
const JOBS_DIR = join(ROOT, "jobs");
const PORT = Number(process.env.RENDER_BRIDGE_PORT || 5555);
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || "";

mkdirSync(PUBLIC_DIR, { recursive: true });
mkdirSync(CONTENT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(JOBS_DIR, { recursive: true });

function sendJson(res, status, json) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(json));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function validJobId(s) {
  return typeof s === "string" && /^[a-zA-Z0-9._-]+$/.test(s);
}

function tail(s, n = 2000) {
  if (!s) return "";
  const str = String(s);
  return str.length > n ? str.slice(-n) : str;
}

// ------------------------ /narration ------------------------
async function handleNarration(payload) {
  const { job_id, text, voice_id, model_id } = payload;
  if (!validJobId(job_id)) return { status: 400, body: { ok: false, error: "invalid job_id" } };
  if (!text || typeof text !== "string") return { status: 400, body: { ok: false, error: "text required" } };
  if (!voice_id) return { status: 400, body: { ok: false, error: "voice_id required" } };
  if (!ELEVENLABS_KEY) return { status: 500, body: { ok: false, error: "ELEVENLABS_API_KEY not set in render-bridge env" } };

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/with-timestamps`;
  const reqBody = JSON.stringify({
    text,
    model_id: model_id || "eleven_turbo_v2_5",
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: reqBody,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    return { status: 502, body: { ok: false, error: `ElevenLabs ${resp.status}`, detail: tail(errText, 800) } };
  }

  const data = await resp.json();
  const audioBase64 = data.audio_base64 || data.audio;
  const alignment = data.alignment || data.normalized_alignment;
  if (!audioBase64 || !alignment) {
    return { status: 502, body: { ok: false, error: "ElevenLabs response missing audio_base64 or alignment" } };
  }

  const mp3Path = join(PUBLIC_DIR, `narration-${job_id}.mp3`);
  writeFileSync(mp3Path, Buffer.from(audioBase64, "base64"));

  // Group characters into words by whitespace.
  const chars = alignment.characters || [];
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];

  const words = [];
  let current = null;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const s = typeof starts[i] === "number" ? starts[i] : 0;
    const e = typeof ends[i] === "number" ? ends[i] : s;
    if (/\s/.test(ch)) {
      if (current && current.text.length > 0) {
        words.push(current);
        current = null;
      }
      continue;
    }
    if (!current) current = { text: ch, start: s, end: e };
    else {
      current.text += ch;
      current.end = e;
    }
  }
  if (current && current.text.length > 0) words.push(current);

  const durationSec =
    words.length > 0
      ? words[words.length - 1].end
      : ends.length > 0
        ? ends[ends.length - 1]
        : 0;

  return {
    status: 200,
    body: {
      ok: true,
      job_id,
      audio_path: mp3Path,
      word_timings: words,
      duration_sec: durationSec,
      char_count: chars.length,
      word_count: words.length,
    },
  };
}

// ------------------------ /captions ------------------------
function normalizeWord(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

async function handleCaptions(payload) {
  const { job_id, word_timings, beats, pad_sec } = payload;
  if (!validJobId(job_id)) return { status: 400, body: { ok: false, error: "invalid job_id" } };
  if (!Array.isArray(word_timings) || word_timings.length === 0) {
    return { status: 400, body: { ok: false, error: "word_timings array required" } };
  }
  if (!Array.isArray(beats) || beats.length === 0) {
    return { status: 400, body: { ok: false, error: "beats array required" } };
  }

  const pad = typeof pad_sec === "number" ? pad_sec : 0;

  // Match each beat's text to contiguous words in the stream.
  // Normalize both; advance a pointer through word_timings greedily.
  const captionBeats = [];
  let wordPtr = 0;
  const lastIdx = word_timings.length - 1;

  for (let bi = 0; bi < beats.length; bi++) {
    const beat = beats[bi];
    const beatWords = String(beat.text || "")
      .split(/\s+/)
      .map(normalizeWord)
      .filter(Boolean);

    if (beatWords.length === 0) {
      // Fallback: proportional slice
      const sliceLen = Math.max(1, Math.floor(word_timings.length / beats.length));
      const startIdx = Math.min(wordPtr, lastIdx);
      const endIdx = Math.min(wordPtr + sliceLen - 1, lastIdx);
      captionBeats.push({
        id: beat.id,
        intent: beat.intent,
        scene: beat.scene,
        startSec: word_timings[startIdx].start,
        endSec: word_timings[endIdx].end,
      });
      wordPtr = endIdx + 1;
      continue;
    }

    // Advance wordPtr until first beat word matches (look ahead ≤ 20 words).
    const firstBeatWord = beatWords[0];
    let startIdx = -1;
    const lookaheadEnd = Math.min(wordPtr + 20, word_timings.length);
    for (let i = wordPtr; i < lookaheadEnd; i++) {
      if (normalizeWord(word_timings[i].text) === firstBeatWord) {
        startIdx = i;
        break;
      }
    }
    if (startIdx < 0) startIdx = Math.min(wordPtr, lastIdx);

    // End index: startIdx + beatWords.length - 1, clamped.
    let endIdx = Math.min(startIdx + beatWords.length - 1, lastIdx);

    // For the final beat, extend to the last word so captions cover tail narration.
    if (bi === beats.length - 1) endIdx = lastIdx;

    captionBeats.push({
      id: beat.id,
      intent: beat.intent,
      scene: beat.scene,
      startSec: word_timings[startIdx].start,
      endSec: word_timings[endIdx].end,
    });
    wordPtr = endIdx + 1;
  }

  // Smooth boundary: make sure every beat.endSec >= next beat.startSec.
  for (let i = 0; i < captionBeats.length - 1; i++) {
    if (captionBeats[i].endSec > captionBeats[i + 1].startSec) {
      captionBeats[i].endSec = captionBeats[i + 1].startSec;
    }
  }

  const lastWordEnd = word_timings[lastIdx].end;
  const duration = lastWordEnd + pad;

  const captionsPayload = {
    words: word_timings,
    beats: captionBeats,
    duration,
  };

  const path = join(PUBLIC_DIR, `captions-${job_id}.json`);
  writeFileSync(path, JSON.stringify(captionsPayload, null, 2), "utf8");

  return {
    status: 200,
    body: {
      ok: true,
      job_id,
      captions_path: path,
      duration_sec: duration,
      word_count: word_timings.length,
      beat_count: captionBeats.length,
      // Expose per-beat time windows so downstream can compute item-level
      // highlight windows (e.g. highlight pill N when its text is spoken).
      beats: captionBeats,
    },
  };
}

// ------------------------ /content ------------------------
async function handleContent(payload) {
  const { job_id, content_json } = payload;
  if (!validJobId(job_id)) return { status: 400, body: { ok: false, error: "invalid job_id" } };
  if (!content_json || typeof content_json !== "object") {
    return { status: 400, body: { ok: false, error: "content_json object required" } };
  }
  const path = join(CONTENT_DIR, `${job_id}.json`);
  writeFileSync(path, JSON.stringify(content_json, null, 2), "utf8");
  return { status: 200, body: { ok: true, job_id, path } };
}

// ------------------------ /broll ------------------------
const OG_IMAGE_REGEX = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

function extensionFromUrlOrType(url, contentType) {
  const m = String(url || "").toLowerCase().match(/\.(png|jpe?g|webp|gif|avif)(?:\?|#|$)/);
  if (m) return m[1] === "jpeg" ? "jpg" : m[1];
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  return "jpg";
}

async function handleBroll(payload) {
  const { job_id, url } = payload;
  if (!validJobId(job_id)) return { status: 400, body: { ok: false, error: "invalid job_id" } };
  if (!url || typeof url !== "string") {
    return { status: 400, body: { ok: false, error: "url required" } };
  }

  let pageUrl = url;
  // Google News RSS wraps the real article in a redirector. Modern Google News
  // URLs use base64-encoded article IDs in the path (e.g.
  // /rss/articles/CBMi...) which only resolve via JavaScript on the client.
  // We cannot resolve these server-side without a headless browser, so we
  // bail out and let Build Final Content fall back to "no broll this run",
  // better no image than Google News's own logo squished into a 16:9 card.
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("news.google.com")) {
      // Old format only: ?url=<actual>. If absent, abort.
      const inner = u.searchParams.get("url");
      if (inner) {
        pageUrl = inner;
      } else {
        return {
          status: 200,
          body: {
            ok: false,
            error:
              "news.google.com redirector, real article URL is not resolvable server-side. skipping broll for this job.",
          },
        };
      }
    }
  } catch (_) {
    /* keep raw url */
  }

  let html = "";
  try {
    const r = await fetch(pageUrl, {
      method: "GET",
      // Several publisher CDNs (openai.com, anthropic.com) 403 requests that
      // only send User-Agent. Sending the full browser-like accept / sec-fetch
      // header set gets us 200s across all 6 sources we care about.
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { status: 200, body: { ok: false, error: `page fetch ${r.status}` } };
    html = await r.text();
  } catch (err) {
    return { status: 200, body: { ok: false, error: `page fetch: ${String(err.message || err)}` } };
  }

  let imageUrl = null;
  for (const re of OG_IMAGE_REGEX) {
    const m = html.match(re);
    if (m && m[1]) { imageUrl = m[1]; break; }
  }
  if (!imageUrl) return { status: 200, body: { ok: false, error: "no og:image found" } };

  // Decode HTML entities in the URL (meta content attributes are HTML-escaped,
  // `&amp;` must become `&` or image CDNs like Contentful return 400 on the
  // literal `&amp;` they see in the query string).
  imageUrl = imageUrl
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Resolve relative URLs against the article page.
  try {
    imageUrl = new URL(imageUrl, pageUrl).toString();
  } catch (_) {
    /* keep as-is */
  }

  let imgResp;
  try {
    imgResp = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        referer: pageUrl,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return { status: 200, body: { ok: false, error: `image fetch: ${String(err.message || err)}` } };
  }
  if (!imgResp.ok) {
    return { status: 200, body: { ok: false, error: `image ${imgResp.status}` } };
  }
  const contentType = imgResp.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { status: 200, body: { ok: false, error: `non-image content-type: ${contentType}` } };
  }

  const buf = Buffer.from(await imgResp.arrayBuffer());
  // 5MB sanity cap; oversized hero images rarely help and slow the render bundle.
  if (buf.byteLength > 5 * 1024 * 1024) {
    return { status: 200, body: { ok: false, error: `image too large: ${buf.byteLength} bytes` } };
  }

  // Aspect / size sanity check. Parse width+height from the image file header
  // (PNG and JPEG; anything else we pass through). Reject if:
  //   - image is tiny (< 400px on either side, likely a favicon/logo sprite)
  //   - image is too square/portrait (aspect < 1.2, article heroes are landscape)
  //   - image is too wide banner (aspect > 3.0, marquee strips look wrong in 16:9 cards)
  // These rules came out of the Google-News-logo-in-reel bug: a 500x500 logo
  // stuffed into a 16:9 frame reads "broken" even though object-fit: contain
  // technically doesn't stretch.
  const ext = extensionFromUrlOrType(imageUrl, contentType);
  const dims = parseImageDimensions(buf, ext);
  if (dims) {
    const { width, height } = dims;
    if (width < 400 || height < 400) {
      return {
        status: 200,
        body: { ok: false, error: `image too small (${width}x${height}), likely a logo, skipping broll` },
      };
    }
    const aspect = width / height;
    if (aspect < 1.2) {
      return {
        status: 200,
        body: { ok: false, error: `image too square/portrait (aspect ${aspect.toFixed(2)}), likely a logo, skipping broll` },
      };
    }
    if (aspect > 3.0) {
      return {
        status: 200,
        body: { ok: false, error: `image too wide (aspect ${aspect.toFixed(2)}), marquee banner, skipping broll` },
      };
    }
  }

  const diskPath = join(PUBLIC_DIR, `broll-${job_id}.${ext}`);
  writeFileSync(diskPath, buf);

  return {
    status: 200,
    body: {
      ok: true,
      job_id,
      broll_src: `broll-${job_id}.${ext}`,
      broll_path: diskPath,
      bytes: buf.byteLength,
      width: dims?.width,
      height: dims?.height,
      source_image_url: imageUrl,
      source_page_url: pageUrl,
    },
  };
}

// Minimal image-dimension sniffer. Reads PNG and JPEG headers directly,
// avoids pulling in sharp / image-size npm deps. Returns null for other
// formats (webp/gif/avif) and the caller skips the aspect check.
function parseImageDimensions(buf, extHint) {
  try {
    // PNG: 8-byte signature, then IHDR chunk at offset 16 carries width+height big-endian.
    if (buf.length >= 24 && buf.slice(1, 4).toString("ascii") === "PNG") {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG: walk SOF0/2 marker for frame dimensions.
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const marker = buf[i + 1];
        const segLen = buf.readUInt16BE(i + 2);
        // SOF markers carry dimensions.
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          const height = buf.readUInt16BE(i + 5);
          const width = buf.readUInt16BE(i + 7);
          return { width, height };
        }
        i += 2 + segLen;
      }
    }
  } catch (_) { /* fall through */ }
  return null;
}

// ------------------------ /render ------------------------
async function handleRender(payload) {
  const { job_id, composition_id } = payload;
  if (!validJobId(job_id)) return { status: 400, body: { ok: false, error: "invalid job_id" } };

  const contentPath = join(CONTENT_DIR, `${job_id}.json`);
  if (!existsSync(contentPath)) {
    return { status: 404, body: { ok: false, error: `content file missing: ${contentPath}` } };
  }

  const args = ["scripts/batch-render.mjs"];
  if (composition_id && /^[a-zA-Z0-9_]+$/.test(composition_id)) {
    args.push(`--composition=${composition_id}`);
  }
  args.push(`content/${job_id}.json`);

  const t0 = Date.now();
  return await new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      { cwd: ROOT, maxBuffer: 100 * 1024 * 1024, timeout: 600_000 },
      (err, stdout, stderr) => {
        const outPath = join(OUT_DIR, `${job_id}.mp4`);
        const exists = existsSync(outPath);
        if (err || !exists) {
          resolve({
            status: 500,
            body: {
              ok: false,
              error: err ? err.message : "mp4 not produced",
              mp4_path: outPath,
              stdout_tail: tail(stdout),
              stderr_tail: tail(stderr),
              elapsed_ms: Date.now() - t0,
            },
          });
          return;
        }
        resolve({
          status: 200,
          body: {
            ok: true,
            job_id,
            mp4_path: outPath,
            mp4_size_bytes: statSync(outPath).size,
            elapsed_ms: Date.now() - t0,
            stdout_tail: tail(stdout),
          },
        });
      },
    );
  });
}

// ------------------------ /jobs/* ------------------------
// Jobs on disk are JSON documents with shape:
//   { created_at: ISO, chat_id, candidates: [{...}], status?: "cancelled" }
// Topic is not stored verbatim; we infer it from each candidate's stored
// content_json.title + link slug for idempotency matching.

function listJobFiles() {
  try {
    return readdirSync(JOBS_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .map((f) => join(JOBS_DIR, f));
  } catch (_) {
    return [];
  }
}

function normalizeTopic(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function jobTopicSignals(job) {
  // Concatenate candidate titles + content_json.title + topic field for fuzzy
  // match against incoming /reel topic. We stored the raw topic on each job
  // starting from this patch; older jobs (pre-patch) fall back to candidate titles.
  const parts = [];
  if (job.topic) parts.push(normalizeTopic(job.topic));
  for (const c of job.candidates || []) {
    if (c.title) parts.push(normalizeTopic(c.title));
    if (c.content_json && c.content_json.title) parts.push(normalizeTopic(c.content_json.title));
  }
  return parts.join(" ");
}

function handleJobsRecent(url) {
  const topic = normalizeTopic(url.searchParams.get("topic") || "");
  const windowSec = Math.max(60, Math.min(86400, Number(url.searchParams.get("window_sec") || 3600)));
  if (!topic) {
    return { status: 400, body: { ok: false, error: "topic query param required" } };
  }
  const tokens = topic.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) {
    return { status: 200, body: { ok: true, match: null } };
  }
  const now = Date.now();
  const files = listJobFiles();
  let best = null;
  for (const path of files) {
    try {
      const job = JSON.parse(readFileSync(path, "utf8"));
      const createdMs = Date.parse(job.created_at || 0);
      if (!createdMs || now - createdMs > windowSec * 1000) continue;
      const signals = jobTopicSignals(job);
      const hits = tokens.filter((t) => signals.includes(t)).length;
      // Require at least 2/3 of the meaningful tokens to overlap so we don't
      // false-match on generic words like "openai".
      const threshold = Math.max(1, Math.ceil(tokens.length * 0.66));
      if (hits >= threshold) {
        const jobId = path.split(/[\\/]/).pop().replace(/\.json$/, "");
        const ageSec = Math.floor((now - createdMs) / 1000);
        if (!best || ageSec < best.age_sec) {
          best = { job_id: jobId, age_sec: ageSec, hit_tokens: hits };
        }
      }
    } catch (_) { /* skip malformed */ }
  }
  return { status: 200, body: { ok: true, match: best } };
}

function handleJobsStats() {
  const jobs = listJobFiles();
  let mp4Count = 0;
  try {
    mp4Count = readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp4")).length;
  } catch (_) { /* ignore */ }
  let lastJob = null;
  if (jobs.length > 0) {
    const sorted = jobs
      .map((p) => ({ p, mtime: statSync(p).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const top = sorted[0];
    lastJob = top.p.split(/[\\/]/).pop().replace(/\.json$/, "");
  }
  return {
    status: 200,
    body: { ok: true, jobs_count: jobs.length, mp4_count: mp4Count, last_job: lastJob },
  };
}

async function handleJobsCancel(payload) {
  const now = Date.now();
  // Cancel any job created in the last 24 hours that isn't already cancelled.
  // Future extension: filter by payload.user_id once jobs store the requester.
  let cancelled = 0;
  for (const path of listJobFiles()) {
    try {
      const job = JSON.parse(readFileSync(path, "utf8"));
      const createdMs = Date.parse(job.created_at || 0);
      if (!createdMs || now - createdMs > 86400 * 1000) continue;
      if (job.status === "cancelled") continue;
      job.status = "cancelled";
      job.cancelled_at = new Date().toISOString();
      writeFileSync(path, JSON.stringify(job, null, 2), "utf8");
      cancelled += 1;
    } catch (_) { /* skip malformed */ }
  }
  return { status: 200, body: { ok: true, cancelled_count: cancelled } };
}

async function handleJobsClear(payload) {
  let removed = 0;
  for (const path of listJobFiles()) {
    try {
      unlinkSync(path);
      removed += 1;
    } catch (_) { /* skip */ }
  }
  return { status: 200, body: { ok: true, removed_count: removed } };
}

// ------------------------ /mp4-exists ------------------------
// Cheap existence probe for WF2's cache short-circuit. Queried with the
// composite id (<baseJobId>_<candidate_label>) so each approved candidate
// has its own cache line.
function handleMp4Exists(url) {
  const id = url.searchParams.get("id");
  if (!id || !validJobId(id)) {
    return { status: 400, body: { ok: false, error: "invalid id" } };
  }
  const mp4Path = join(OUT_DIR, `${id}.mp4`);
  if (existsSync(mp4Path)) {
    const st = statSync(mp4Path);
    return {
      status: 200,
      body: { ok: true, exists: true, bytes: st.size, mtime: st.mtime.toISOString() },
    };
  }
  return { status: 200, body: { ok: true, exists: false } };
}

// ------------------------ /mp4/:job_id ------------------------
function handleMp4Get(req, res, jobId) {
  if (!validJobId(jobId)) {
    return sendJson(res, 400, { ok: false, error: "invalid job_id" });
  }
  const mp4Path = join(OUT_DIR, `${jobId}.mp4`);
  if (!existsSync(mp4Path)) {
    return sendJson(res, 404, { ok: false, error: `mp4 not found: ${mp4Path}` });
  }
  const stat = statSync(mp4Path);
  res.writeHead(200, {
    "content-type": "video/mp4",
    "content-length": stat.size,
    "content-disposition": `attachment; filename="${jobId}.mp4"`,
  });
  createReadStream(mp4Path).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, { ok: true, root: ROOT, port: PORT });
    }
    const mp4Match = req.method === "GET" && req.url && req.url.match(/^\/mp4\/([^/?]+)/);
    if (mp4Match) {
      return handleMp4Get(req, res, decodeURIComponent(mp4Match[1]));
    }
    // Jobs endpoints, lightweight, live near the top so they win over generic POST body parsing.
    if (req.method === "GET" && req.url && req.url.startsWith("/jobs/recent")) {
      const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const r = handleJobsRecent(u);
      return sendJson(res, r.status, r.body);
    }
    if (req.method === "GET" && req.url === "/jobs/stats") {
      const r = handleJobsStats();
      return sendJson(res, r.status, r.body);
    }
    if (req.method === "GET" && req.url && req.url.startsWith("/mp4-exists")) {
      const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const r = handleMp4Exists(u);
      return sendJson(res, r.status, r.body);
    }
    if (req.method === "POST" && (req.url === "/jobs/cancel" || req.url === "/jobs/clear")) {
      const raw = await readBody(req);
      let payload = {};
      if (raw) {
        try { payload = JSON.parse(raw); } catch (e) {
          return sendJson(res, 400, { ok: false, error: "invalid JSON body" });
        }
      }
      const r = req.url === "/jobs/cancel"
        ? await handleJobsCancel(payload)
        : await handleJobsClear(payload);
      return sendJson(res, r.status, r.body);
    }
    if (req.method === "POST" && ["/narration", "/captions", "/content", "/render", "/broll"].includes(req.url)) {
      const raw = await readBody(req);
      let payload = {};
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (e) {
          return sendJson(res, 400, { ok: false, error: "invalid JSON body" });
        }
      }
      let result;
      switch (req.url) {
        case "/narration":
          result = await handleNarration(payload);
          break;
        case "/captions":
          result = await handleCaptions(payload);
          break;
        case "/content":
          result = await handleContent(payload);
          break;
        case "/render":
          result = await handleRender(payload);
          break;
        case "/broll":
          result = await handleBroll(payload);
          break;
      }
      return sendJson(res, result.status, result.body);
    }
    sendJson(res, 404, { ok: false, error: "not found" });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`render-bridge listening on :${PORT} (ROOT=${ROOT})`);
  console.log(`  ELEVENLABS_API_KEY set: ${Boolean(ELEVENLABS_KEY)}`);
});
