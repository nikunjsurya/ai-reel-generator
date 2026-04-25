#!/usr/bin/env bash
# Self-heal the ai-reel-generator runtime. One-shot check; run on demand or
# via Windows Task Scheduler every 60s.
#
# Responsibilities:
#   1. render-bridge alive on :5555 (restart if not)
#   2. cloudflared quick-tunnel URL in-sync with n8n's WEBHOOK_URL env
#      (recreate n8n container with fresh URL if they've drifted)
#
# Required env (from .env.local or shell):
#   ELEVENLABS_API_KEY   needed when relaunching the bridge
#
# Exit 0 = healthy (or healed). Non-zero = something needs human attention.
set -u

# Resolve project root from the script's own location, so the watchdog
# works no matter where the repo is cloned.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REEL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Windows-style path for the Docker bind mount. cygpath -m converts an
# MSYS path like /c/Users/foo to C:/Users/foo. Falls back to REEL_ROOT
# when cygpath is not available (non-Windows hosts).
REEL_ROOT_WIN="$(cygpath -m "$REEL_ROOT" 2>/dev/null || echo "$REEL_ROOT")"

BRIDGE_LOG="/tmp/render-bridge.log"
N8N_IMAGE="n8nio/n8n:latest"

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  # Fallback to .env.local so Task Scheduler can run this without an
  # interactive shell.
  if [[ -f "$REEL_ROOT/.env.local" ]]; then
    # shellcheck disable=SC1091
    set -a; . "$REEL_ROOT/.env.local"; set +a
  fi
fi

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "[watchdog] ELEVENLABS_API_KEY not set and not found in .env.local" >&2
  echo "[watchdog] export it or add it to $REEL_ROOT/.env.local" >&2
  exit 3
fi

log() { echo "[watchdog $(date +%H:%M:%S)] $*"; }

# ---------- 1. render-bridge ----------
if curl -sS -m 3 -f "http://localhost:5555/health" >/dev/null 2>&1; then
  log "render-bridge: ok"
else
  log "render-bridge: DOWN, relaunching"
  (
    cd "$REEL_ROOT" || exit 1
    ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" \
      nohup node scripts/render-bridge.mjs >"$BRIDGE_LOG" 2>&1 &
    disown
  )
  sleep 4
  if curl -sS -m 3 -f "http://localhost:5555/health" >/dev/null 2>&1; then
    log "render-bridge: healed"
  else
    log "render-bridge: FAILED to relaunch, check $BRIDGE_LOG"
    exit 2
  fi
fi

# ---------- 2. cloudflared tunnel URL ----------
TUNNEL_URL=$(docker logs cloudflared 2>&1 \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' \
  | tail -1)
if [[ -z "$TUNNEL_URL" ]]; then
  log "cloudflared: could NOT determine tunnel URL, skipping reconcile"
  exit 0
fi

CURRENT_N8N_URL=$(docker inspect n8n --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
  | grep -E '^WEBHOOK_URL=' \
  | head -1 \
  | cut -d= -f2-)

norm() { echo "${1%/}"; }
if [[ "$(norm "$CURRENT_N8N_URL")" == "$(norm "$TUNNEL_URL")" ]]; then
  log "tunnel URL: in sync ($TUNNEL_URL)"
  exit 0
fi

log "tunnel URL drift detected"
log "  cloudflared: $TUNNEL_URL"
log "  n8n env:    $CURRENT_N8N_URL"
log "  recreating n8n container to pick up fresh URL..."

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "[watchdog] TELEGRAM_BOT_TOKEN not set, recreated n8n will not be able to send Telegram messages." >&2
  echo "[watchdog] add TELEGRAM_BOT_TOKEN=... to .env.local before next run." >&2
fi

docker rm -f n8n >/dev/null 2>&1 || true
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -v "${REEL_ROOT_WIN}:/project" \
  -e N8N_SECURE_COOKIE=false \
  -e "WEBHOOK_URL=${TUNNEL_URL}/" \
  -e N8N_RUNNERS_ENABLED=true \
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
  -e "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}" \
  -e NODES_EXCLUDE='[]' \
  -e N8N_RESTRICT_FILE_ACCESS_TO='/project' \
  -e N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES=true \
  "$N8N_IMAGE" >/dev/null

for i in {1..12}; do
  if curl -sS -m 3 "http://localhost:5678/healthz" 2>/dev/null | grep -q ok; then
    log "n8n: ready after ${i}x3s"
    break
  fi
  sleep 3
done

log "reminder: workflows need their Telegram webhooks re-registered after recreate"
log "  POST /api/v1/workflows/<id>/activate for WF1 + WF2 + Error Notifier"
