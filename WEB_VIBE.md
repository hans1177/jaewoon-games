# GitHub cloud and local WEB Vibe: independent development

**GitHub continues to develop in the cloud as before**, even if the
owner's PC, Ollama and local WEB Vibe are offline.

## GitHub development (restored)

- In `.github/workflows/pwa-command-bridge.yml`, the `github-cloud` job
  polls the existing PWA service and submits owner WEB requests to the
  existing `vibe2-unreal-core` GitHub control queue.
- `tools/pwa-command-vibe2-task.mjs` and the Vibe2 execution guards
  restrict these WEB owner requests to `web-games/<gameId>`.
- GitHub's `vibe2-continuous-core.yml` runs the existing cloud workflow
  and keeps its QA, security, review and publishing requirements.
- GitHub native-game development continues in its own workflows.
  Editing a WEB source no longer dispatches Roblox or Unity developers.
- Cloud GitHub development **does not require** the dedicated local
  model, port 11435, or `WEB_VIBE_GH_TOKEN`.

## Separate local WEB Vibe (optional)

- Local `/develop` messages enter only `web-vibe-control` and its
  `.web-vibe/queue.json` through the **`bridge`** job.
- `WEB_VIBE_1` is independent of the cloud queue and native worker.
- The optional local `tools/web-vibe-worker.mjs` can use a dedicated
  Ollama server at `127.0.0.1:11435` and private
  `WEB_VIBE_GH_TOKEN` to prepare a scoped web-game PR.
- Without local setup, local requests stay queued. **GitHub cloud
  development continues normally.**

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
