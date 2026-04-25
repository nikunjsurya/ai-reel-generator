"""Generate docs/architecture.excalidraw - reviewer-facing decision board.

Layout follows the AMZ Prep walkthrough style (warm cream canvas, Virgil
italic taglines, roughness 1.5 hand-drawn boxes). Structured as 7 vertical
bands that map 1:1 to the CSC evaluation rubric:

  Hero       -> "How I Think"
  Band 1     -> The Problem
  Band 2     -> What I Built (pipeline)        [rubric: working automation, flow structure]
  Band 3     -> Why These Tools (decisions)    [rubric: tool specificity, communication]
  Band 4     -> Edge Cases I Handle            [rubric: priority #2 error handling]
  Band 5     -> What Stays Human               [questionnaire Q7, governance]
  Band 6     -> How It Would Scale             [rubric: priority #3 scalability]
  Band 7     -> What I'd Do Differently        [packet Section 3: "what you'd do differently"]

Run:  python docs/architecture_generator.py
Open: the produced .excalidraw in excalidraw.com or the VS Code extension.
"""

from __future__ import annotations

import json
import random
import string
import time
from pathlib import Path


# ---------- palette (AMZ-match) ----------
CANVAS_BG = "#FAF8F3"          # warm cream
INK_DARK = "#1F2937"            # body ink
INK_GRAY = "#6B7280"            # secondary
ORANGE = "#D97706"              # headline accent
ORANGE_SOFT = "#FDE68A"         # orange tint fill
BLUE = "#2563EB"                # decisions / research
BLUE_SOFT = "#DBEAFE"
GREEN = "#059669"               # success / render
GREEN_SOFT = "#D1FAE5"
RED = "#DC2626"                 # errors / traps
RED_SOFT = "#FECACA"
PURPLE = "#7C3AED"              # bridge / infra
PURPLE_SOFT = "#E9D5FF"


# ---------- primitive helpers ----------
def _sid(prefix: str = "el") -> str:
    return prefix + "_" + "".join(random.choices(string.ascii_letters + string.digits, k=14))


def _base(kind: str, x: int, y: int, w: int, h: int, **extra) -> dict:
    el = {
        "id": _sid(),
        "type": kind,
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "angle": 0,
        "strokeColor": INK_DARK,
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1.5,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": None,
        "seed": random.randint(1, 10**9),
        "version": 2,
        "versionNonce": random.randint(1, 10**9),
        "isDeleted": False,
        "boundElements": [],
        "updated": int(time.time() * 1000),
        "link": None,
        "locked": False,
    }
    el.update(extra)
    return el


def text(x, y, w, h, content, *, size=20, color=INK_DARK, font=2,
         align="left", valign="top", auto_resize=False):
    """Creates a text element.

    auto_resize=False is the default so the (x, y, w, h) bbox is respected
    by Excalidraw on render, essential for centered titles and wrapped
    multi-line body text. auto_resize=True is only useful when we truly
    want the element to hug its content (rare in this diagram).
    """
    return _base(
        "text", x, y, w, h,
        strokeColor=color,
        fontFamily=font,
        fontSize=size,
        text=content,
        textAlign=align,
        verticalAlign=valign,
        baseline=int(size * 0.8),
        originalText=content,
        lineHeight=1.25,
        containerId=None,
        autoResize=auto_resize,
    )


def _rect_dict(x, y, w, h, *, stroke=INK_DARK, bg="transparent", fill="hachure",
               rough=1.5, stroke_width=1.5, rounded=True):
    roundness = {"type": 3} if rounded else None
    return _base(
        "rectangle", x, y, w, h,
        strokeColor=stroke,
        backgroundColor=bg,
        fillStyle=fill if bg != "transparent" else "solid",
        strokeWidth=stroke_width,
        roughness=rough,
        roundness=roundness,
    )


def rect(*args, **kwargs):
    """Returns a single-element list so `e += rect(...)` works."""
    return [_rect_dict(*args, **kwargs)]


def rect_with_text(x, y, w, h, content, *,
                   stroke=INK_DARK, bg="transparent", text_color=None,
                   size=18, font=2, align="center", valign="middle",
                   rough=1.5, fill="hachure", rounded=True):
    box = _rect_dict(x, y, w, h, stroke=stroke, bg=bg, fill=fill, rough=rough, rounded=rounded)
    txt = _base(
        "text",
        x + 12, y + 8, w - 24, h - 16,
        strokeColor=text_color or stroke,
        fontFamily=font,
        fontSize=size,
        text=content,
        textAlign=align,
        verticalAlign=valign,
        baseline=int(size * 0.8),
        originalText=content,
        lineHeight=1.25,
        containerId=box["id"],
        autoResize=False,
    )
    box["boundElements"] = [{"id": txt["id"], "type": "text"}]
    return [box, txt]


def arrow(x1, y1, x2, y2, *, color=INK_DARK, dashed=False, thickness=1.5, label_str=None):
    dx, dy = x2 - x1, y2 - y1
    a = _base(
        "arrow", x1, y1, max(abs(dx), 1), max(abs(dy), 1),
        strokeColor=color,
        strokeStyle="dashed" if dashed else "solid",
        strokeWidth=thickness,
        roughness=1,
        points=[[0, 0], [dx, dy]],
        lastCommittedPoint=None,
        startBinding=None,
        endBinding=None,
        startArrowhead=None,
        endArrowhead="arrow",
    )
    out = [a]
    if label_str:
        mx, my = (x1 + x2) // 2, (y1 + y2) // 2 - 22
        out.append(text(mx - 90, my, 180, 20, label_str, size=13, color=INK_GRAY, font=1, align="center"))
    return out


# ---------- band-level helpers ----------
def section_title(x, y, content, *, size=56, color=ORANGE):
    return text(x, y, 1400, int(size * 1.5), content, size=size, color=color, font=2, align="center")


def section_tagline(x, y, content, *, size=22, color=INK_GRAY):
    # Virgil = fontFamily 1 (hand-drawn, reads as italic)
    return text(x, y, 1400, int(size * 1.8), content, size=size, color=color, font=1, align="center")


def subhead(x, y, content, *, size=26, color=INK_DARK):
    return text(x, y, 1400, int(size * 1.5), content, size=size, color=color, font=2, align="center")


def note(x, y, w, content, *, size=14, color=INK_GRAY, font=1, align="center"):
    return text(x, y, w, size + 12, content, size=size, color=color, font=font, align=align)


def wrap(content: str, max_chars: int) -> str:
    """Insert newlines so no physical line exceeds max_chars. Preserves
    existing newlines. Used to pre-wrap standalone text (Excalidraw only
    wraps container-bound text automatically)."""
    out_lines: list[str] = []
    for paragraph in content.split("\n"):
        if len(paragraph) <= max_chars or not paragraph.strip():
            out_lines.append(paragraph)
            continue
        words = paragraph.split(" ")
        cur = ""
        for w in words:
            candidate = (cur + " " + w).strip() if cur else w
            if len(candidate) > max_chars and cur:
                out_lines.append(cur)
                cur = w
            else:
                cur = candidate
        if cur:
            out_lines.append(cur)
    return "\n".join(out_lines)


# ---------- Band: HERO ----------
def band_hero(y0: int, canvas_w: int) -> list[dict]:
    """Hero band = the 60 / 30 / 10 framework. The lens the whole rest of the
    board is read through. Every pipeline node, every edge case, every scale
    card downstream is a consequence of this split."""
    e = []
    center_x = canvas_w // 2

    # Title + tagline
    e.append(text(center_x - 700, y0, 1400, 120, "How I Think",
                  size=82, color=ORANGE, align="center"))
    e.append(text(center_x - 700, y0 + 140, 1400, 40,
                  "Every automation I build splits into three layers.",
                  size=24, color=INK_GRAY, font=1, align="center"))

    # 60 / 30 / 10 cards, the whole framework in one glance.
    card_w = 500
    card_h = 340
    gap = 48
    total_w = card_w * 3 + gap * 2
    start_x = center_x - total_w // 2
    card_y = y0 + 210

    cards = [
        ("60%", "DETERMINISTIC CODE",
         "Plain rules.  Parsing commands.\nReading RSS feeds.  Writing files.\nEncoding video.  Delivery.",
         "The parts a computer should\nnever get wrong.",
         BLUE, BLUE_SOFT),
        ("30%", "AI-ASSISTED",
         "What only an LLM does well:\nrank 50 stories by topic.\nDraft reel scripts.\nNarrate the voiceover.",
         "The thinking layer.",
         GREEN, GREEN_SOFT),
        ("10%", "HUMAN JUDGMENT",
         "The one decision I deliberately\ndo NOT automate.\nYou pick one of three drafts.",
         "AI is often confident and wrong.\nHumans choose which truth ships.",
         ORANGE, ORANGE_SOFT),
    ]

    for i, (pct, name, body, footer, color, soft) in enumerate(cards):
        x = start_x + i * (card_w + gap)
        e += rect(x, card_y, card_w, card_h,
                  stroke=color, bg=soft, fill="hachure", rough=1.8, stroke_width=2)
        # Big percentage
        e.append(text(x, card_y + 24, card_w, 100, pct,
                      size=88, color=color, font=2, align="center"))
        # Layer name
        e.append(text(x + 20, card_y + 140, card_w - 40, 40, name,
                      size=22, color=color, font=2, align="center"))
        # Body
        e.append(text(x + 24, card_y + 196, card_w - 48, 100, body,
                      size=15, color=INK_DARK, font=2, align="center"))
        # Footer (italic, Virgil)
        e.append(text(x + 24, card_y + card_h - 70, card_w - 48, 58, footer,
                      size=14, color=INK_GRAY, font=1, align="center"))

    # Bottom anchor, names the ratio for THIS build so the reader carries it
    # into Band 2's pipeline.
    e.append(text(center_x - 700, card_y + card_h + 32, 1400, 36,
                  "This reel generator is 60% code, 30% Claude + ElevenLabs, 10% you.",
                  size=22, color=INK_DARK, font=2, align="center"))
    return e


# ---------- Band 1: THE PROBLEM ----------
def band_problem(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "The Problem"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "AI news breaks daily. Teams want reels in 90 seconds, not 90 minutes."))

    # 4 manual-step boxes in a row (~crossed out further down)
    steps = [
        ("Read 10+ AI\nnews sites", "~20 min"),
        ("Write script\n+ narration", "~25 min"),
        ("Record voice\n+ retakes", "~15 min"),
        ("Edit video\n+ captions", "~30 min"),
    ]
    box_w, box_h, gap = 260, 110, 40
    total_w = box_w * len(steps) + gap * (len(steps) - 1)
    start_x = cx - total_w // 2
    row_y = y0 + 200
    for i, (label_str, cost) in enumerate(steps):
        x = start_x + i * (box_w + gap)
        e += rect_with_text(x, row_y, box_w, box_h, label_str,
                            stroke=INK_DARK, bg=ORANGE_SOFT, fill="hachure",
                            size=20, align="center", valign="middle")
        e.append(note(x, row_y + box_h + 8, box_w, cost, size=16, color=ORANGE, font=1))
        if i < len(steps) - 1:
            x1 = x + box_w + 4
            x2 = x + box_w + gap - 4
            e += arrow(x1, row_y + box_h // 2, x2, row_y + box_h // 2, color=INK_DARK)

    # summary caption below
    cap_y = row_y + box_h + 60
    e.append(note(start_x, cap_y, total_w,
                  "Today = 90+ minutes per reel. Quality drifts. No reviewer-style approval step.",
                  size=18, color=INK_DARK, align="center"))
    e.append(note(start_x, cap_y + 30, total_w,
                  "Goal: 90 seconds per reel, human still picks the direction, zero drift.",
                  size=18, color=GREEN, font=1, align="center"))
    return e


# ---------- Band 2: WHAT I BUILT (pipeline) ----------
def band_what(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "What I Built"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "The 60 / 30 / 10 split, applied node by node.  Watch the colors."))

    # 60 / 30 / 10 legend, tells the reader how to read the pipeline colors
    # before they look at it.
    legend_y = y0 + 136
    e.append(note(cx - 700, legend_y, 1400,
                  "BLUE = deterministic code (60%)     GREEN = AI-assisted (30%)     ORANGE = human judgment (10%)",
                  size=16, color=INK_DARK, font=2, align="center"))

    # Two-row S-shaped pipeline.
    #   WF1 flows left -> right across the top.
    #   Gate sits centered beneath the LAST WF1 node.
    #   WF2 flows right -> left (first logical node drawn at the rightmost
    #   position), so the last WF1 node, the gate, and the first WF2 node
    #   all share the same x -> arrows between them are clean verticals.
    node_w, node_h, gap = 200, 90, 32
    wf2_h = node_h + 30  # a touch taller so 3-line labels fit comfortably

    # Node colors map 1:1 to the 60 / 30 / 10 framework in the Hero band:
    #   BLUE  = deterministic (parsing, fetching, writing, encoding, delivery)
    #   GREEN = AI-assisted   (Claude ranking, Claude drafting, ElevenLabs narration)
    #   ORANGE= human         (the approval gate only)
    wf1_nodes = [
        ("/reel\n<topic>", BLUE),
        ("Read 6 AI\nnews feeds", BLUE),
        ("Claude Haiku\npicks 3 stories", GREEN),
        ("Claude Sonnet\ndrafts 3 reels", GREEN),
        ("Show 3 previews\nin Telegram", BLUE),
    ]
    wf2_nodes = [
        ("Build voice\nscript", BLUE),
        ("ElevenLabs\nAI voice\n+ word timing", GREEN),
        ("Sync captions\nto voice", BLUE),
        ("Remotion renders\n9:16 video\n(1080x1920)", BLUE),
        ("Deliver MP4\nin Telegram", BLUE),
    ]

    row_total = node_w * len(wf1_nodes) + gap * (len(wf1_nodes) - 1)
    row_x = cx - row_total // 2
    row_a_y = y0 + 200
    soft_map = {ORANGE: ORANGE_SOFT, BLUE: BLUE_SOFT, GREEN: GREEN_SOFT, PURPLE: PURPLE_SOFT}

    # WF1 label (left-aligned above row start)
    e.append(note(row_x, row_a_y - 34, row_total,
                  "Workflow 1 / Research + Preview  (17 n8n nodes - the 'research' half, cheap to run)",
                  size=16, color=BLUE, font=2, align="left"))

    # WF1 nodes and inter-node arrows (left -> right)
    for i, (label_str, color) in enumerate(wf1_nodes):
        x = row_x + i * (node_w + gap)
        e += rect_with_text(x, row_a_y, node_w, node_h, label_str,
                            stroke=color, bg=soft_map[color], size=16,
                            align="center", valign="middle")
        if i < len(wf1_nodes) - 1:
            e += arrow(x + node_w + 2, row_a_y + node_h // 2,
                       x + node_w + gap - 2, row_a_y + node_h // 2,
                       color=INK_DARK)

    # Last WF1 center x, shared by gate and first WF2 node.
    last_wf1_center_x = row_x + (len(wf1_nodes) - 1) * (node_w + gap) + node_w // 2

    # Gate, centered under last WF1.
    gate_w, gate_h = 340, 84
    gate_x = last_wf1_center_x - gate_w // 2
    gate_y = row_a_y + node_h + 80
    e += rect_with_text(gate_x, gate_y, gate_w, gate_h,
                        "HUMAN APPROVAL GATE\nyou tap Approve on A, B, or C",
                        stroke=ORANGE, bg=ORANGE_SOFT, text_color=ORANGE,
                        size=18, align="center", valign="middle", rough=2)

    # Clean vertical arrow: last WF1 -> gate.
    e += arrow(last_wf1_center_x, row_a_y + node_h + 4,
               last_wf1_center_x, gate_y - 4,
               color=ORANGE, thickness=2)
    e.append(note(last_wf1_center_x + 30, row_a_y + node_h + 24, 260,
                  "3 preview cards, each with Approve button",
                  size=13, color=INK_GRAY, font=1, align="left"))

    # WF2 row (flows right -> left: first logical node drawn at rightmost x).
    row_b_y = gate_y + gate_h + 80
    e.append(note(row_x, row_b_y - 34, row_total,
                  "Workflow 2 / Render + Deliver  (20 n8n nodes, fires only on Approve - the expensive half)",
                  size=16, color=GREEN, font=2, align="right"))

    for i, (label_str, color) in enumerate(wf2_nodes):
        pos_idx = len(wf2_nodes) - 1 - i  # 0th logical node goes at pos 4 (rightmost)
        x = row_x + pos_idx * (node_w + gap)
        e += rect_with_text(x, row_b_y, node_w, wf2_h, label_str,
                            stroke=color, bg=soft_map[color], size=15,
                            align="center", valign="middle")
        if i < len(wf2_nodes) - 1:
            # Arrow goes leftward: from left edge of this box to right edge of next logical box.
            next_pos = pos_idx - 1
            x_next_right = row_x + next_pos * (node_w + gap) + node_w
            e += arrow(x - 2, row_b_y + wf2_h // 2,
                       x_next_right + 2, row_b_y + wf2_h // 2,
                       color=INK_DARK)

    # Clean vertical arrow: gate -> first WF2 node (which is at rightmost x, i.e. last_wf1_center_x).
    e += arrow(last_wf1_center_x, gate_y + gate_h + 4,
               last_wf1_center_x, row_b_y - 4,
               color=GREEN, thickness=2)

    # Final metric line, centered below WF2.
    metric_y = row_b_y + wf2_h + 60
    e.append(note(row_x, metric_y, row_total,
                  "Measured on real runs:  90 seconds from tap to delivery.  $0.42 per reel.  9:16 vertical, full HD, ready for Instagram / TikTok / YouTube Shorts.",
                  size=18, color=INK_DARK, font=2, align="center"))
    # Explicit tally that proves the 60 / 30 / 10 framework from the Hero band
    # isn't just a claim, it's how the actual nodes break down.
    e.append(note(row_x, metric_y + 34, row_total,
                  "Tally:  7 blue boxes (deterministic)  +  3 green boxes (AI)  +  1 orange gate (human)  =  64% / 27% / 9%.  Matches the 60 / 30 / 10 claim.",
                  size=15, color=INK_GRAY, font=1, align="center"))
    return e


# ---------- Band 3: WHY THESE TOOLS (decision table) ----------
def band_why(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "Why These Tools"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "For every tool I picked:  what I chose, what I considered, and why I didn't pick the alternatives."))

    rows = [
        ("How users talk to it", "Telegram bot", BLUE,
         "Slack: needs a company workspace, corporate friction.  Discord: feels like a gamer community, not a work tool.  Custom web app: hours to build a login, hours to host.\n"
         "Telegram wins: users already have the app, zero onboarding, bots are free, buttons are built in, works from any phone anywhere."),
        ("How the flow is wired", "n8n (self-hosted)", BLUE,
         "Zapier: charges per step, weak branching, no way to show 3 options for approval.  Make.com: similar limits.  Raw code: slower to debug, harder for the next person to take over.\n"
         "n8n wins: I can SEE the flow, every step has a sticky note, free, same setup I already use for another project (proven)."),
        ("Where news comes from", "6 official RSS news feeds", GREEN,
         "Scraping websites: breaks when sites change, risks violating their terms.  Paid news API (NewsAPI): $449/month minimum.  Twitter/X: auth mess + pay-to-play.\n"
         "RSS feeds from Anthropic, OpenAI, Google AI, Meta, HuggingFace, GitHub: free, allowed, reliable, no maintenance."),
        ("Cheap AI that ranks stories", "Claude Haiku 4.5", ORANGE,
         "Claude Sonnet: ~5x more expensive for the same ranking quality.  OpenAI GPT-4o-mini: similar price but harsher on Indian-English phrasing.\n"
         "Haiku wins: ~$0.001 per run, ~2 seconds, smart enough for 'which of these stories match the topic'."),
        ("Smart AI that writes reels", "Claude Sonnet 4.6", ORANGE,
         "Claude Opus: 3x more expensive, no noticeable quality gain on a structured task like this.  Using Haiku here failed: ~20% of reels came back garbled.\n"
         "Sonnet wins: sweet spot. Reliable structure, rarely needs the auto-correcting fallback."),
        ("AI voiceover + word timing", "ElevenLabs with-timestamps", PURPLE,
         "ElevenLabs regular endpoint: gives you the MP3 but no word timings, so you'd need a 15-second extra step (Whisper) to sync captions.  Azure TTS: robotic voice.  OpenAI TTS: less natural in Indian English.\n"
         "ElevenLabs with-timestamps wins: best voice quality AND word-by-word timing in one call.  Costs 77% of the total bill, worth every cent."),
        ("Video renderer", "Remotion (React-based)", GREEN,
         "Raw ffmpeg: can't do animated motion text.  CapCut API: same input gives you a different video each time (not reliable).  After Effects: no real automation API.\n"
         "Remotion wins: code-driven, same input always gives the same output, lives in git, I already use it in another project so scenes are reusable."),
        ("Where job data lives", "JSON files in /project/jobs/", PURPLE,
         "Redis / Postgres: real databases, but overkill for a solo project.  n8n's built-in memory: only remembers things per-workflow, NOT across workflows - broke our setup.  Learned that the hard way.\n"
         "Flat JSON files win: simplest thing that works.  Both workflows read / write the same folder.  Easy to debug with a text editor."),
    ]

    # Header row
    col_w = [240, 280, 960]
    col_x = [cx - sum(col_w) // 2]
    col_x.append(col_x[0] + col_w[0])
    col_x.append(col_x[1] + col_w[1])

    header_y = y0 + 180
    header_h = 50
    headers = [("Decision", BLUE), ("I chose", GREEN), ("Alternatives I considered + why I didn't pick them", ORANGE)]
    for i, (label_str, color) in enumerate(headers):
        e += rect_with_text(col_x[i], header_y, col_w[i], header_h,
                            label_str,
                            stroke=color, bg="transparent", text_color=color,
                            size=20, align="center", valign="middle", rough=1, fill="solid")

    # Rows, pre-wrap rationale so row height and render stay in sync.
    row_y = header_y + header_h + 10
    soft_map = {BLUE: BLUE_SOFT, GREEN: GREEN_SOFT, ORANGE: ORANGE_SOFT,
                PURPLE: PURPLE_SOFT, RED: RED_SOFT}
    rationale_max_chars = max(30, (col_w[2] - 24) // 8)
    for label_str, choice, color, rationale in rows:
        rationale_wrapped = wrap(rationale, rationale_max_chars)
        line_count = rationale_wrapped.count("\n") + 1
        row_h = max(96, 30 * line_count + 36)

        e += rect_with_text(col_x[0], row_y, col_w[0], row_h, label_str,
                            stroke=INK_DARK, bg="transparent",
                            size=19, align="center", valign="middle",
                            rough=1.2)
        e += rect_with_text(col_x[1], row_y, col_w[1], row_h, choice,
                            stroke=color, bg=soft_map[color], text_color=INK_DARK,
                            size=19, align="center", valign="middle",
                            rough=1.5)
        e += rect_with_text(col_x[2], row_y, col_w[2], row_h, rationale_wrapped,
                            stroke=INK_GRAY, bg="transparent", text_color=INK_DARK,
                            size=15, align="left", valign="middle",
                            rough=1, font=2)
        row_y += row_h + 16

    return e, row_y  # next-available-y for the caller


# ---------- Band: WHAT HAPPENS WHEN... (3 visual mini-flows) ----------
def band_edge_flows(y0: int, canvas_w: int) -> list[dict]:
    """Three edge-case flows shown as mini-pipelines.  The point is for the
    reviewer to SEE the handling without the narrator having to live-demo each
    one.  Covers the three most-likely reviewer questions:
      1. What if I tap Approve twice?  (idempotency)
      2. What if I send the same topic again?  (dedupe)
      3. What if something breaks in the middle?  (error notifier)
    """
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "What Happens When..."))
    e.append(section_tagline(cx - 700, y0 + 80,
        "Three edge cases, visualized.  So a reviewer can see the handling without me live-demoing each one."))

    # Three columns.
    col_w = 580
    col_gap = 40
    total_w = col_w * 3 + col_gap * 2
    start_x = cx - total_w // 2
    top = y0 + 180
    box_w = col_w - 40
    box_h = 56
    step_gap = 34
    soft_map = {BLUE: BLUE_SOFT, GREEN: GREEN_SOFT, ORANGE: ORANGE_SOFT, RED: RED_SOFT, PURPLE: PURPLE_SOFT}

    columns = [
        {
            "title": "You tap Approve twice",
            "subtitle": "(idempotency)",
            "steps": [
                ("First tap on card A", ORANGE),
                ("Check MP4 cache\nMISS", BLUE),
                ("Full render  ~75s", GREEN),
                ("MP4 delivered", BLUE),
                ("Second tap on card A\nCache HIT", ORANGE),
                ("Same MP4 replayed\n~3s, no re-render", GREEN),
            ],
            "caption": "Same composite ID = cache hit.  No duplicate charge.  No duplicate render.  25x speedup.",
        },
        {
            "title": "Same topic within an hour",
            "subtitle": "(duplicate dedupe)",
            "steps": [
                ("/reel claude opus", ORANGE),
                ("Research + 3 cards  saved\nto /project/jobs/", GREEN),
                ("/reel claude opus\n(30 min later)", ORANGE),
                ("Duplicate check finds\nrecent job", BLUE),
                ("DM:  'You asked 30m ago.\nReply /reel! to force fresh.'", BLUE),
                ("/reel! claude opus\nFresh research, new cards", GREEN),
            ],
            "caption": "Stops accidental double-spend.  User still has an escape hatch with the ! bypass.",
        },
        {
            "title": "Something breaks mid-flow",
            "subtitle": "(error notifier)",
            "steps": [
                ("Approve tapped\nNarration starts", ORANGE),
                ("ElevenLabs times out", RED),
                ("Auto-retry 2x", BLUE),
                ("Retries still fail", RED),
                ("Error Workflow (WF3)\nfires automatically", BLUE),
                ("DM:  'WF2 / Bridge: Narration /\ntimeout / log: <link>'", BLUE),
            ],
            "caption": "One inbox for every crash.  Failing node + error + log link.  Never silent.",
        },
    ]

    for col_i, col in enumerate(columns):
        col_x = start_x + col_i * (col_w + col_gap)
        # Column title + subtitle
        e.append(text(col_x + 20, top, col_w - 40, 34, col["title"],
                      size=20, color=INK_DARK, font=2, align="center"))
        e.append(text(col_x + 20, top + 34, col_w - 40, 24, col["subtitle"],
                      size=15, color=INK_GRAY, font=1, align="center"))

        # Steps (vertical stack of rounded boxes with arrows between)
        step_x = col_x + (col_w - box_w) // 2
        step_y = top + 76
        for s_i, (label, color) in enumerate(col["steps"]):
            e += rect_with_text(step_x, step_y, box_w, box_h, label,
                                stroke=color, bg=soft_map[color], size=14,
                                align="center", valign="middle", rough=1.3)
            if s_i < len(col["steps"]) - 1:
                e += arrow(step_x + box_w // 2, step_y + box_h + 4,
                           step_x + box_w // 2, step_y + box_h + step_gap - 4,
                           color=INK_DARK)
            step_y += box_h + step_gap

        # Caption below the last step
        e.append(text(col_x + 20, step_y + 16, col_w - 40, 60,
                      wrap(col["caption"], max(30, (col_w - 40) // 7)),
                      size=13, color=INK_GRAY, font=1, align="center", valign="top"))

    # Footer pointing the reviewer at the complete matrix. Pushed 140px below
    # the last step (not 100) so it sits a clean ~64px below the column
    # captions rather than crowding them.
    footer_y = top + 76 + 6 * (box_h + step_gap) + 140
    e.append(text(cx - 700, footer_y, 1400, 30,
                  "+ 11 more cases tested.  Full matrix + destructive-test transcript in docs/audit-report.md.",
                  size=16, color=INK_DARK, font=2, align="center"))
    return e


# ---------- Band 4: EDGE CASES ----------
def band_edge_cases(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "Edge Cases I Handle"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "Tested 14 things-that-could-go-wrong + 1 destructive test (killed the render engine mid-render).  All pass."))

    # Mix of technical failures (auth, rate limits, API shape, renders)
    # and non-technical user-triggered edges (double-tap, resubmit, typo).
    cards = [
        ("Stranger tries to use the bot",
         "Only one approved user ID can trigger anything.  Anyone else gets silently ignored; owner gets an audit DM.  Keeps scanners and randoms out.",
         RED),
        ("AI provider rate-limits us",
         "Auto-retries 3x with gradually increasing waits.  If it still fails, the user gets a DM explaining what broke and the job ID so it can be re-tried.",
         RED),
        ("One news feed goes offline",
         "Each feed is fetched independently.  If 5 of 6 still work, the run continues.  Only if all 6 die does the user see a friendly 'no stories found' message.",
         RED),
        ("AI returns garbled output",
         "Auto-correct catches bad shapes and fixes them.  If it can't fix, it swaps in a safe default scene.  Render never crashes; user always gets a video.",
         RED),
        ("Voice generation fails mid-way",
         "Render engine re-requests the audio once.  If ElevenLabs is still down, the user gets a DM with the job ID and which step broke.",
         RED),
        ("Video render crashes",
         "Render exit code is captured.  Error notifier DMs the user with: which workflow, which step, which error line.  No silent failures.",
         RED),
        ("Double taps, switching, re-sending",
         "Each reel option gets its own ID.  Tap Approve A twice = instant replay from cache (~15s).  Tap B after A = fresh render, no conflict with A.  Re-sending the same topic within 24h returns the cached preview cards instantly.",
         RED),
        ("Something hangs forever",
         "Hard deadlines on every call (Claude 30s, ElevenLabs 60s, Remotion 120s).  One retry, then error notifier fires.  No silent hangs.",
         RED),
        ("User types the command wrong",
         "Typos like /rel or /ree still work - bot knows what you meant.  Empty topic shows the help menu.  Other languages pass through (AI handles them).",
         RED),
    ]

    card_w, card_h = 580, 220
    gap_x, gap_y = 32, 30
    cols = 3
    total_w = card_w * cols + gap_x * (cols - 1)
    start_x = cx - total_w // 2
    row_y = y0 + 200

    body_w = card_w - 40
    max_chars = max(30, body_w // 8)

    for i, (title_str, body_str, color) in enumerate(cards):
        col = i % cols
        row = i // cols
        x = start_x + col * (card_w + gap_x)
        y = row_y + row * (card_h + gap_y)
        soft = {RED: RED_SOFT, ORANGE: ORANGE_SOFT}[color]
        e += rect(x, y, card_w, card_h, stroke=color, bg=soft, fill="hachure", rough=1.5)
        e.append(text(x + 20, y + 18, body_w, 36, title_str,
                      size=18, color=color, font=2, align="left", valign="top"))
        body_wrapped = wrap(body_str, max_chars)
        e.append(text(x + 20, y + 62, body_w, card_h - 78, body_wrapped,
                      size=15, color=INK_DARK, font=2, align="left", valign="top"))
    return e


# ---------- Band: HOW I KNOW IT'S HEALTHY (new observability band) ----------
def band_monitoring(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "How I Know It's Healthy"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "Monitoring is built in.  No external dashboards, zero silent failures."))

    cards = [
        ("The /status  command",
         "Text the bot /status and it replies: is the bot up, is the render engine up, last 5 runs with their outcomes, how many errors in the last 24 hours.  Under 2 seconds.  Same bot, no extra infrastructure.",
         BLUE),
        ("Error notifier (auto-DM)",
         "Any failing step in either workflow triggers a shared error handler that DMs the user (or the owner, for security issues) with: which workflow, which step, the error message, and the job ID.  Never silent.",
         PURPLE),
        ("Auto-heal watchdog",
         "Runs every minute in the background.  If the render engine died, it restarts.  If the bot's public URL drifted (cloudflared rotates it on restart), it reconnects.  Zero-touch recovery.",
         GREEN),
    ]

    card_w, card_h = 580, 240
    gap = 32
    total = card_w * 3 + gap * 2
    start_x = cx - total // 2
    card_y = y0 + 200
    body_w = card_w - 40
    max_chars = max(30, body_w // 8)

    for i, (title_str, body_str, color) in enumerate(cards):
        soft = {BLUE: BLUE_SOFT, PURPLE: PURPLE_SOFT, GREEN: GREEN_SOFT}[color]
        x = start_x + i * (card_w + gap)
        e += rect(x, card_y, card_w, card_h, stroke=color, bg=soft, fill="hachure", rough=1.5)
        e.append(text(x + 22, card_y + 20, body_w, 36, title_str,
                      size=20, color=color, font=2, align="left"))
        e.append(text(x + 22, card_y + 68, body_w, card_h - 84, wrap(body_str, max_chars),
                      size=15, color=INK_DARK, font=2, align="left", valign="top"))
    return e


# ---------- Band 5: HUMAN IN THE LOOP ----------
def band_human(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "What Stays Human"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "This is the 10% from the Hero band.  The one decision I keep off the AI."))

    callout_w, callout_h = 1200, 260
    cx_box = cx - callout_w // 2
    y_box = y0 + 170
    body_w = callout_w - 80
    max_chars = max(30, body_w // 8)
    e += rect(cx_box, y_box, callout_w, callout_h,
              stroke=ORANGE, bg=ORANGE_SOFT, fill="hachure", rough=2, stroke_width=2)
    e.append(text(cx_box + 40, y_box + 26, body_w, 42,
                  "Three candidates, one human tap.  (The 10%.)",
                  size=28, color=ORANGE, font=2, align="left"))
    body = (
        "AI is often confident and wrong.  So I draft three reel options up front and let the human pick one.\n"
        "Cost of drafting three options  ~= $0.12 total.  Cost of the wrong reel going out to an audience  = brand damage.\n"
        "One approval tap  = tiny cost, massive upside.  Same pattern I would use for any customer-facing AI content flow."
    )
    e.append(text(cx_box + 40, y_box + 88, body_w, callout_h - 104,
                  wrap(body, max_chars),
                  size=17, color=INK_DARK, font=2, align="left", valign="top"))
    return e


# ---------- Band 6: HOW IT WOULD SCALE ----------
def band_scale(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "How It Would Scale"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "What changes when one user becomes one thousand.  Where I am today vs where I would take it next."))

    # Two axes of scale: operational (cards 1-5) and autonomy (card 6).
    cards = [
        ("How many reels per run",
         "One reel per /reel command.  User approves 1 of 3 options.",
         "Add flags like /reel <topic> --count 5 and get 5 different reel variants in one run - ideal when you want options for A/B testing or multiple audiences.",
         BLUE),
        ("How many users at once",
         "Render engine handles one video at a time.  Fine for 1 user.",
         "Add a job queue (so requests line up instead of colliding) and rent render servers on-demand from the cloud.  Goes from 1 user to 50+ users simultaneously without rewriting the core flow.",
         BLUE),
        ("Cost per reel",
         "$0.42 per reel today.  The AI voiceover (ElevenLabs) is 77% of the bill.",
         "Cache the voiceover audio and reuse it when the same line appears across topics.  Projected cost drops to ~$0.15 per reel once the library fills up (around 1000 reels).",
         GREEN),
        ("Where data is stored",
         "Flat JSON files on a single computer.  Simple and fast for one user.",
         "Move job data to a fast in-memory cache, videos to cloud object storage, analytics to a real database.  Same workflow logic, beefier storage behind it.  Adds reliability + history.",
         PURPLE),
        ("Publishing to social platforms",
         "Video lands in Telegram DM.  User manually uploads to Instagram, TikTok, YouTube Shorts.",
         "The same video file feeds a social-media aggregator (tools like Buffer or Later) that posts to Instagram Reels, TikTok, YouTube Shorts, and X in one tap.  One video, 4 platforms, no per-platform maintenance.",
         ORANGE),
        ("Fully autonomous mode",
         "User types /reel for every topic.  Human involved every single time.",
         "A cheap cloud server (~$6/month) runs a free open-source AI (Llama or Gemma) that watches news feeds 24/7, drafts reel candidates in the background, and queues them in Telegram.  Zero AI API cost.  Human only picks winners from a pre-filled queue.",
         RED),
    ]

    card_w, card_h = 560, 320
    gap_x, gap_y = 32, 32
    cols = 3
    total = card_w * cols + gap_x * (cols - 1)
    start_x = cx - total // 2
    grid_y = y0 + 180
    body_w = card_w - 40
    max_chars = max(30, body_w // 8)

    for i, (title_str, today_str, scale_str, color) in enumerate(cards):
        soft = {BLUE: BLUE_SOFT, GREEN: GREEN_SOFT, PURPLE: PURPLE_SOFT,
                ORANGE: ORANGE_SOFT, RED: RED_SOFT}[color]
        col = i % cols
        row = i // cols
        x = start_x + col * (card_w + gap_x)
        y = grid_y + row * (card_h + gap_y)
        e += rect(x, y, card_w, card_h, stroke=color, bg=soft, fill="hachure", rough=1.5)
        e.append(text(x + 22, y + 20, body_w, 38, title_str,
                      size=22, color=color, font=2, align="left"))
        e.append(text(x + 22, y + 72, body_w, 22, "TODAY",
                      size=13, color=INK_GRAY, font=2, align="left"))
        e.append(text(x + 22, y + 98, body_w, 70, wrap(today_str, max_chars),
                      size=15, color=INK_DARK, font=2, align="left", valign="top"))
        e.append(text(x + 22, y + 178, body_w, 22, "AT SCALE",
                      size=13, color=color, font=2, align="left"))
        e.append(text(x + 22, y + 204, body_w, card_h - 220, wrap(scale_str, max_chars),
                      size=15, color=INK_DARK, font=2, align="left", valign="top"))
    return e


# ---------- Band 7: WHAT I'D DO DIFFERENTLY ----------
def band_different(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(section_title(cx - 700, y0, "What I'd Do Differently"))
    e.append(section_tagline(cx - 700, y0 + 80,
        "Given more time, in priority order.  Honest gaps, not polish."))

    items = [
        ("Force Claude to return clean output",
         "Claude's built-in structured-output mode would guarantee the right shape every time.  Removes my auto-correcting fallback entirely.  ~5% garbled-output rate drops to 0%."),
        ("Smarter story classification",
         "Today:  classify stories by keyword matching (is this a launch? a stats roundup?).  Upgrade:  AI similarity matching, which understands meaning, not just words.  More accurate scene style selection."),
        ("Error trend dashboard (via Sentry)",
         "Today:  one DM per failure.  Upgrade:  a dashboard that spots patterns across many runs (e.g., 'ElevenLabs fails every Sunday 3am' or '10% of controversy-topic reels have audio drift')."),
        ("Multi-user access with quotas",
         "Today:  one hard-coded user.  Upgrade:  a proper login (Supabase), per-user daily reel quotas, and cost caps so no one user can run up the bill."),
        ("A / B test reel styles",
         "Measure which scene styles viewers watch through, replay, share.  Feed the winners back into the scene planner automatically.  The bot gets better over time."),
        ("More stable public URL",
         "Today:  free Cloudflare tunnel, URL changes on every restart (auto-healed by the watchdog).  Upgrade:  paid tunnel with a fixed URL, removes the reconnect dance entirely."),
    ]

    item_w, item_h = 1180, 90
    cx_item = cx - item_w // 2
    y = y0 + 180
    body_w = item_w - 100
    max_chars = max(30, body_w // 8)
    for i, (title_str, body_str) in enumerate(items):
        e += rect(cx_item, y, item_w, item_h, stroke=INK_DARK, bg="transparent", fill="solid", rough=1)
        # number tag
        num_w = 70
        e += rect(cx_item, y, num_w, item_h, stroke=ORANGE, bg=ORANGE_SOFT, fill="hachure", rough=1.5)
        e.append(text(cx_item, y + 22, num_w, 50, str(i + 1),
                      size=32, color=ORANGE, font=2, align="center"))
        # title + body
        e.append(text(cx_item + 88, y + 14, body_w, 32, title_str,
                      size=19, color=INK_DARK, font=2, align="left", valign="top"))
        e.append(text(cx_item + 88, y + 48, body_w, 40, wrap(body_str, max_chars),
                      size=15, color=INK_GRAY, font=1, align="left", valign="top"))
        y += item_h + 16
    return e


# ---------- Footer ----------
def band_footer(y0: int, canvas_w: int) -> list[dict]:
    e = []
    cx = canvas_w // 2
    e.append(text(cx - 700, y0, 1400, 24,
                  "Read the code: github.com / ai-reel-generator   /   Audit: docs / audit-report.md   /   Questionnaire: docs / questionnaire.md",
                  size=14, color=INK_GRAY, font=1, align="center"))
    e.append(text(cx - 700, y0 + 30, 1400, 24,
                  "Built April 2026 for the CSC AI Solutions Engineer take-home.",
                  size=13, color=INK_GRAY, font=1, align="center"))
    return e


# ---------- compose ----------
def build_diagram() -> dict:
    elements: list[dict] = []
    canvas_w = 2000
    y = 80

    # Hero now carries the 60/30/10 framework (3 big cards + anchor line)
    # so it needs significantly more vertical room than the old thin intro.
    elements += band_hero(y, canvas_w);       y += 720
    elements += band_problem(y, canvas_w);    y += 540
    # What-I-Built has gained a legend line (above the pipeline) and a tally
    # line (below the metric line), so add ~40px of headroom.
    elements += band_what(y, canvas_w);       y += 900
    # New visual-flow band sits BETWEEN the pipeline and the tool decisions:
    #   pipeline (happy path) -> what happens when... (edge flows) ->
    #   why these tools -> full edge-case matrix.
    # Band content (6 stacked steps + caption + footer line) extends to ~y0+926;
    # the advance is 1040 to leave a clean ~110px gap before "Why These Tools".
    elements += band_edge_flows(y, canvas_w); y += 1040
    why_elements, y_after_why = band_why(y, canvas_w)
    elements += why_elements
    y = y_after_why + 140
    elements += band_edge_cases(y, canvas_w); y += 1020
    elements += band_monitoring(y, canvas_w); y += 540
    elements += band_human(y, canvas_w);      y += 540
    elements += band_scale(y, canvas_w);      y += 920
    elements += band_different(y, canvas_w);  y += 940
    elements += band_footer(y, canvas_w)

    return {
        "type": "excalidraw",
        "version": 2,
        "source": "https://excalidraw.com",
        "elements": elements,
        "appState": {
            "gridSize": None,
            "viewBackgroundColor": CANVAS_BG,
        },
        "files": {},
    }


def main() -> None:
    out_path = Path(__file__).parent / "architecture.excalidraw"
    diagram = build_diagram()
    out_path.write_text(json.dumps(diagram, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}  ({len(diagram['elements'])} elements)")


if __name__ == "__main__":
    main()
