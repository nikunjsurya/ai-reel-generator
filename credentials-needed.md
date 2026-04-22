# Credentials Needed (By Phase)

## Phase 1 (before building Workflow 1)

- [ ] **Telegram Bot Token.** Create a new bot with @BotFather in Telegram: send `/newbot`, name it (e.g. `AI Reel Generator`), copy the token. Add to n8n Credentials as **"Telegram Bot (Reel Generator)"**.
- [ ] **Your Telegram user ID.** Message @userinfobot to get your numeric ID. This goes into the allowlist.
- [ ] **Anthropic API key.** From console.anthropic.com. Add to n8n Credentials as **"Anthropic API (Reel Generator)"**.

## Phase 2 (before building Workflow 2)

- [ ] **ElevenLabs API key.** Already provisioned (per memory). Add to n8n Credentials as **"ElevenLabs API (Reel Generator)"**.
- [ ] **Shorts Factory working locally.** Confirm `npm install` is clean in `shorts-factory/` and a known-good render completes. User has confirmed it runs today.

## Phase 4 (optional, before enabling publish)

- [ ] **Upload-Post account.** Sign up at upload-post.com, pick Basic ($16/mo), connect IG + FB + TikTok profiles, copy API key. Add to n8n Credentials as **"Upload-Post (Reel Generator)"**.

## Security Notes

- Never paste keys into Code nodes. Use n8n's Credentials UI for every external call.
- `.env` is for local dev / Python helpers only. Gitignored. n8n reads from its own credential store.
- If a key is committed by accident: `git reset` before push, rotate the key, check GitHub's secret scanner.
- Telegram bot should use webhook secret-token header (`X-Telegram-Bot-Api-Secret-Token`) in n8n Telegram Trigger settings.
