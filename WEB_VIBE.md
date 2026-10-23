# GitHub cloud and local WEB Vibe: independent development

**GitHub continues to develop in the cloud as before**, even if the
owner's PC, Ollama and local WEB Vibe are offline.

## GitHub development (restored)

- In `.github/workflows/pwa-command-bridge.yml`, the `github-cloud` job
  polls the existing PWA service **and receives authenticated local chat
  WEB development dispatches** into the existing `vibe2-unreal-core` queue.
- Once GitHub accepts an instruction, the owner PC and Ollama may be
  powered off. The GitHub worker continues the task independently.
  Uncommitted files existing only on the owner PC are not uploaded and
  cannot be continued while that PC is off.
- `tools/pwa-command-vibe2-task.mjs` and the Vibe2 execution guards
  restrict these WEB owner requests to `web-games/<gameId>`.
- GitHub's `vibe2-continuous-core.yml` runs the existing cloud workflow
  and keeps its QA, security, review and publishing requirements.
- GitHub native-game development continues in its own workflows.
  Editing a WEB source no longer dispatches Roblox or Unity developers.
- Cloud GitHub development **does not require** the dedicated local
  model, port 11435, or `WEB_VIBE_GH_TOKEN`.

## Separate local WEB Vibe (optional)

- Local chat `/develop` dispatches to the existing GitHub cloud queue
  and does not depend on PC uptime after it has been accepted.
- Owner issue comments using `/vibe-local-web` still enter the optional
  `web-vibe-control` `.web-vibe/queue.json` via the **`bridge`** job.
- `WEB_VIBE_1` is independent of the cloud queue and native worker.
- The optional local `tools/web-vibe-worker.mjs` can use a dedicated
  Ollama server at `127.0.0.1:11435` and private
  `WEB_VIBE_GH_TOKEN` to prepare a scoped web-game PR.
- Without local setup, local requests can execute through the GitHub-hosted
  WEB_VIBE_1 job when its dedicated GitHub secrets are configured. Missing
  secrets leave the request queued or blocked; GitHub cloud PWA development
  continues separately as before.

For optional local setup in Windows PowerShell:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11435"
ollama serve
```

In another PowerShell window:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11435"
ollama pull qwen2.5-coder:3b
```

Only if using the local PR worker, provide `WEB_VIBE_GH_TOKEN`
privately (never commit a token). GitHub tokens cannot enforce
per-directory file access by themselves; all resulting PRs require
independent source and QA checks.

```powershell
node tools/web-vibe-worker.mjs --check
node tools/web-vibe-worker.mjs --task=pwa-<UUID>
node tools/web-vibe-worker.mjs --task=pwa-<UUID> --apply --pr
```

The local commands do not auto-approve or deploy a change. Existing
shared assets remain read-only from WEB owner work. Existing queue
items are not erased, silently migrated, or marked complete.


## WEB_VIBE_1 onepatch running on GitHub

Authenticated owner issue comments starting with /vibe-local-web are ingested
into the existing WEB_VIBE_1 independent queue on web-vibe-control. In the
existing pwa-command-bridge.yml workflow, the web-cloud-onepatch GitHub Actions
job uses that same WEB-only task and invokes the current web-vibe-worker.mjs
with --cloud --apply --pr. The owner PC and localhost Ollama are not required.

The GitHub repository must configure Actions secrets WEB_VIBE_GH_TOKEN
(a dedicated Web repository token with contents / pull request permissions,
including normal PR workflow triggering) and GEMINI_API_KEY (existing
approved free-model provider). Missing or expired credentials stop the run
without fallback to Roblox, Unity or paid providers. Tokens are never
committed or printed.

Example issue comment, with a fresh UUIDv4 and a real Web catalog game ID:

    /vibe-local-web {"id":"11111111-2222-4333-8444-555555555555","game_id":"insect-survival","platform":"web","kind":"directive","autoDeployAfterVerifiedQa":true,"body":"Fix the game HUD and add gameplay content","files":"*"}

The files field can be "*" to enumerate all eligible existing game-local
text files with no count limit, or a comma-separated set such as
"index.html,client/game.js". No game-external, binary, native or policy files
are writable. Each source edit is validated, and zero real changes fail.

The cloud job opens a reviewable Web-only PR, but does not self-merge it,
declare QA or runtime success, or deploy. Existing independent PR QA,
owner approval, main merge and GitHub Pages exact-main publication remain
the release authority. Existing local worker mode is optional and unchanged.

There is no Cloudflare publishing in this flow.
