# Efficiency notes, what's heavy, what's light, what I'd rethink

Not a refactor plan. A mental model of where the cost lives so you can speak
to it honestly in the Loom.

## Where the time goes on a happy-path run (~100s end-to-end)

Approximate numbers from exec 312 and 314, on the existing Windows box.

| Stage | Typical | Why | Worth optimizing? |
|---|---|---|---|
| RSS fetch + dedupe + Claude rank (Haiku) | 8-12s | 6 parallel HTTPS fetches + 1 Haiku call (~2k input / 256 output tokens) | No. RSS latency is the floor; Haiku is already the cheapest option. |
| Claude Scene Plan (Sonnet, 3 candidates) | 15-25s | Runs `runOnceForEachItem`, 3 sequential Sonnet calls with 2-4k output each | **Yes.** See below, parallelize these 3 calls. |
| Format + send 3 cards via Telegram | 2-3s | 3 HTTP POSTs | No. |
| **(user approves, external wait)** | - |, | - |
| ElevenLabs /with-timestamps | 5-10s | ~180-word narration, 6-9 real-time factor | No. Turbo v2.5 is already their fastest high-quality model. |
| og:image fetch (two HTTPs) | 1-3s | 1 page fetch + 1 image fetch | No. |
| Captions + content write | <1s | Local file I/O | No. |
| Remotion render | 45-70s | 900-2700 frames @ 30fps with headless Chrome; scales linearly with duration | **Yes, optionally.** Remotion supports `--concurrency=N`; could shave 30-40%. |
| MP4 read + send via Telegram | 3-6s | 5-10MB upload over the tunnel | No. |

## Three things that are unnecessary / duplicated today

### 1. `Claude Scene Plan` runs sequentially for 3 candidates

It's a `runOnceForEachItem` Code-prep-node followed by an HTTP-request-per-item. n8n's HTTP Request node will still fire all 3 in parallel if the upstream emits 3 items... actually let me verify: yes, n8n fans out HTTP Request across items concurrently by default. So this **might** already be parallel, and my "sequential" claim is wrong. Worth double-checking with an execution log before claiming the optimization.

**Claim for the Loom**: "If I confirmed this runs sequentially, I'd switch to 3 parallel `httpRequest` items, Sonnet latency per call is ~5-8s, doing them in parallel is ~5-8s total instead of 15-25s."

### 2. Two Claude calls where one might do

Right now: Haiku rank (pick top 3 indices) → 3 Sonnet scene plans (one per candidate).

Alternative: one Sonnet call that takes all ~60 stories and returns 3 scene plans directly. Pros: one API round-trip. Cons: 60-story context bloats the input; Sonnet output cap of 4K may get truncated; you lose the cheap Haiku first-pass filter.

**Verdict: keep as-is.** The Haiku-first pattern is a well-known cost-efficiency move. Defensible in the Loom.

### 3. Two readWriteFile writes on the n8n side we no longer need

`Write Narration MP3` and `Write Content File` were necessary when n8n called `executeCommand` to invoke Remotion directly. Now that we have render-bridge on the host, ALL file writes happen inside the bridge. n8n's readWriteFile writes of narration.mp3 and content.json are **effectively no-ops**, the bridge already wrote them moments earlier in `/narration` and `/content`.

Wait, let me verify. Looking at current WF2:
- `Bridge: Narration` → bridge writes `narration-<id>.mp3` to `./public/` inside the project mount. n8n doesn't write this a second time.
- `Bridge: Content` → bridge writes `content/<id>.json`. n8n doesn't write this a second time.

So actually there are NO redundant writes. The `readWriteFile` nodes from the earlier architecture were cleaned up during the adaptive migration. I was wrong to claim this. Flag it to double-check before speaking to it.

### Things that ARE redundant

- **`Store for Approval` Code node in WF1**, it still writes to `$getWorkflowStaticData('global')` even though WF2 reads from the filesystem, not static data. The static-data write is dead code. ~4 lines. Safe to delete, cosmetic.
- **`Telegram Button Click` node in WF2**, left disabled for reference; takes up canvas space and is never wired to anything. Safe to delete.
- **`Notify Telegram (Success)` node in WF2**, the pre-adaptive text-only delivery node, left after being replaced by `Send Video to Telegram`. Dangling, no incoming connection. Safe to delete.

## One real efficiency win available, not yet taken

**The whole Claude Scene Plan stage for rejected candidates is wasted.**

Flow today: we rank 3 candidates, scene-plan all 3 via Sonnet, send all 3 cards. User picks one. We use ONE scene plan, discard 2.

Cost of 2 discarded Sonnet calls: ~$0.02-0.05 per run, ~10-15s of latency.

Alternative: rank 3, send SHORT cards (just source + title), let user pick, THEN scene-plan only the chosen one. Saves 2/3 of Sonnet calls.

Downside: after the user picks, there's a new ~8s wait before the render starts. So the user sees "approved... planning... narrating... rendering..." instead of "approved... rendering...". Might feel less snappy.

**Verdict: keep current design, but call it out in the Loom as a tradeoff. "I spend ~$0.04 per run to give the user the richest possible cards before approval, they see exact scenes, not just titles. Post-approval latency stays under 90s."**

## Two heaviness I'd accept forever

### a) Windows-native Remotion

Running Remotion on the Windows host (not in a Linux container) is intentional, Chromium font rendering is measurably more consistent on the OS the operator actually uses, and the cold-start cost of a containerized Chromium every render would dwarf any portability win. The tradeoff is that ops is manual (a watchdog, not Kubernetes).

### b) Quick-tunnel for demo

Cloudflared named tunnels are the right production answer. For this assessment, `trycloudflare.com` quick-tunnel with a watchdog is the right demo answer, zero CF account setup, fresh URL every restart auto-reconciled. I wouldn't spend time moving to a named tunnel for the submission.

## Net reading

The hot paths are Remotion render (45-70s, Chrome-bound, CPU-bound, mostly unavoidable) and Claude Scene Plan (15-25s, potentially parallel, could drop to 5-8s with a config check). Everything else is noise. The "duplicated readWriteFile" claim I made above was wrong, no duplicate file writes exist; the real cleanup is 3 cosmetic dead nodes on the canvas.
