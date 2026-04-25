import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Beat, CaptionsFile, FormatKey } from "../types";

// Map sfx hint names to file paths. Must match generate-sfx.mjs catalog keys.
const SFX_PATH: Record<string, string> = {
  cold_open_stinger: "sfx/cold-open-stinger.mp3",
  slidein_badge: "sfx/ui/badge_ping.mp3",
  mech_click_1: "sfx/typing/mech_click_1.mp3",
  mech_click_2: "sfx/typing/mech_click_2.mp3",
  mech_click: "sfx/typing/mech_click_1.mp3",
  typewriter: "sfx/typing/typewriter.mp3",
  soft_tap: "sfx/typing/soft_tap.mp3",
  click_hard: "sfx/ui/click_hard.mp3",
  click_soft: "sfx/ui/click_soft.mp3",
  tick: "sfx/ui/tick.mp3",
  ui_tick: "sfx/ui/tick.mp3",
  blip: "sfx/ui/blip.mp3",
  ui_blip: "sfx/ui/blip.mp3",
  beep: "sfx/ui/beep.mp3",
  pop: "sfx/ui/pop.mp3",
  ding: "sfx/ui/ding.mp3",
  chime: "sfx/ui/chime.mp3",
  ui_chime: "sfx/ui/chime.mp3",
  badge_ping: "sfx/ui/badge_ping.mp3",
  whoosh_short: "sfx/transitions/whoosh_short.mp3",
  whoosh_long: "sfx/transitions/whoosh_long.mp3",
  swoosh_up: "sfx/transitions/swoosh_up.mp3",
  swoosh_down: "sfx/transitions/swoosh_down.mp3",
  slide_in: "sfx/transitions/slide_in.mp3",
  slide_out: "sfx/transitions/slide_out.mp3",
  card_flip: "sfx/transitions/card_flip.mp3",
  zoom_in: "sfx/transitions/zoom_in.mp3",
  success_ding: "sfx/states/success_ding.mp3",
  success_fanfare: "sfx/states/success_fanfare.mp3",
  error_buzz: "sfx/states/error_buzz.mp3",
  error_static: "sfx/states/error_static.mp3",
  fail_thud: "sfx/states/fail_thud.mp3",
  alert: "sfx/states/alert.mp3",
  confirm_accept: "sfx/states/confirm_accept.mp3",
  reject_deny: "sfx/states/reject_deny.mp3",
  lock: "sfx/states/lock.mp3",
  unlock: "sfx/states/unlock.mp3",
  notification: "sfx/states/notification.mp3",
  counter_tick: "sfx/data/counter_tick.mp3",
  countdown_beep: "sfx/data/countdown_beep.mp3",
  progress_complete: "sfx/data/progress_complete.mp3",
  compile_done: "sfx/data/compile_done.mp3",
};

type SfxEvent = { startSec: number; sfx: string; volume?: number };

// Generate SFX events from beats + scene props.
// Rules:
//  - Beat transition: whoosh_short at beat boundary (except first and final).
//  - Scene-specific cues (counter ticks, editor check chimes, progress bar completion).
//  - Explicit beat.sfxHints, emitted at beat start, sequentially 60ms apart.
export function planSfx(beats: Beat[], captions: CaptionsFile, format: FormatKey = "short"): SfxEvent[] {
  const events: SfxEvent[] = [];

  // Cold-open stinger: DIY Smart Code uses it only on Shorts (4 of 5 longforms
  // have no stinger; the one that did was a leaked shorts-pipeline artifact).
  // We match that pattern. Shorts get the 393ms DIY-extracted B3 stab at vol 0.35
  // (per memory measurement). Longform opens voice-first with a soft 0.6s lead-in
  // baked into the narration; no stinger event fires here.
  if (format !== "longform") {
    events.push({ startSec: 0, sfx: "cold_open_stinger", volume: 0.35 });
  }

  const beatsBySec = beats.map((b, i) => {
    const ct = captions.beats.find((c) => c.id === b.id);
    const startSec = ct?.startSec ?? 0;
    const endSec = ct?.endSec ?? startSec + 3;
    return { beat: b, startSec, endSec, index: i };
  });

  // V4 philosophy (measured against DIY's actual videos, ~6-8 audible SFX per 90s):
  //   - NO whoosh on every cut. Transitions are silent; a soft fade does the work.
  //   - NO per-click / per-check / per-tick loops. One sound marks the WHOLE moment.
  //   - Keep one anchor stinger per major beat only (hook, skill-done, scan-result,
  //     severity-reveal, CTA). Script `sfxHints` stay.
  //   - Volumes lifted to 0.14–0.22 since each event is rarer and needs presence.
  for (const { beat, startSec, endSec } of beatsBySec) {
    // Explicit hints from the script, offset each by 80ms.
    (beat.sfxHints ?? []).forEach((h, k) => {
      const ev = SFX_PATH[h] ? h : null;
      if (ev) events.push({ startSec: startSec + 0.08 + k * 0.10, sfx: ev, volume: 0.17 });
    });

    const p = beat.props;

    if (beat.scene === "CounterPain" && p.counter) {
      events.push({ startSec: startSec + 0.15, sfx: "whoosh_long", volume: 0.13 });
    }

    if (beat.scene === "MockTerminal") {
      const n = p.logLines?.length ?? 0;
      events.push({ startSec: startSec + 0.7 + n * 0.28 + 1.7, sfx: "success_ding", volume: 0.19 });
    }

    if (beat.scene === "MockEditor") {
      const checks = (p.lines ?? []).filter((l) => l.check).length;
      if (checks > 0) {
        events.push({
          startSec: startSec + 0.8 + (checks - 1) * 0.32 + 0.1,
          sfx: "confirm_accept",
          volume: 0.17,
        });
      }
    }

    if (beat.scene === "ProgressBars") {
      events.push({ startSec: endSec - 0.35, sfx: "progress_complete", volume: 0.19 });
    }

    if (beat.scene === "SeverityCards") {
      const n = p.cards?.length ?? 0;
      for (let i = 0; i < n; i++) {
        events.push({ startSec: startSec + 1.0 + i * 0.7, sfx: "badge_ping", volume: 0.22 });
      }
    }

    if (beat.scene === "ComparisonCards") {
      // Sync'd to the winner ribbon spring-in at frame 36 into the beat (=1.2s).
      // Soft ping marks the "winner" animation so it doesn't land in silence.
      events.push({ startSec: startSec + 1.2, sfx: "badge_ping", volume: 0.2 });
    }

    if (beat.scene === "SkillDone") {
      events.push({ startSec: startSec + 0.1, sfx: "success_ding", volume: 0.26 });
    }

    if (beat.scene === "CTAOutro") {
      events.push({ startSec: endSec - 1.2, sfx: "success_fanfare", volume: 0.26 });
    }
  }

  return events.sort((a, b) => a.startSec - b.startSec);
}

export const SfxLayer: React.FC<{ events: SfxEvent[] }> = ({ events }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {events.map((e, i) => {
        const path = SFX_PATH[e.sfx];
        if (!path) return null;
        const from = Math.max(0, Math.round(e.startSec * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={fps * 3}>
            <Audio src={staticFile(path)} volume={e.volume ?? 0.5} />
          </Sequence>
        );
      })}
    </>
  );
};
