# WEB Vibe organization

WEB Vibe is a separate, fail-closed **WEB-only** development engine, not an alias
for Roblox/Unity Vibe2. It may change only the selected existing
`web-games/<gameId>/index.html` in a scoped development candidate.
Shared `assets/` are readable but never writable by this worker.

## Identity and task ingress

- Engine: `WEB_VIBE_1` (`tools/web-vibe-organization.mjs`)
- Dedicated task branch: `web-vibe-control`
- State file, on that branch only: `.web-vibe/queue.json`
- PWA/owner-command bridge: `.github/workflows/pwa-command-bridge.yml`
- Local code worker: `tools/web-vibe-worker.mjs`
- Separate verification: `.github/workflows/web-vibe-qa.yml`

The PWA bridge no longer submits web tasks into `vibe2-unreal-core`,
`.vibe2/queue.json`, `vibe2-continuous-core.yml` or a native runner.
A disconnected WEB model does **not** cause a fallback to native Vibe2.
An accepted task means **queued**, not developed or deployed.

## Local WEB-only model setup (Windows)

In one PowerShell window, start a **separate** Ollama server:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11435"
ollama serve
```

In a second window, with the same `OLLAMA_HOST` value, install the model:

```powershell
$env:OLLAMA_HOST = "127.0.0.1:11435"
ollama pull qwen2.5-coder:3b
```

Provide a **separate WEB-only GitHub credential** as the process environment
variable `WEB_VIBE_GH_TOKEN`. Never commit or paste it into repository files.
The token must be authorized to read the dedicated control branch and to create
a scoped candidate branch/PR in this repository. **GitHub cannot enforce
per-directory source restrictions using a repository token alone**; source-scope
validation and human review remain mandatory. Existing SSH remotes and stored
native Git credentials are rejected by the worker.

From a clean and current `main` checkout (HTTPS origin):

```powershell
node tools/web-vibe-worker.mjs --check
node tools/web-vibe-worker.mjs --task=pwa-<UUID>
node tools/web-vibe-worker.mjs --task=pwa-<UUID> --apply --pr
```

The first command checks queue access and local branch prerequisites; it does
**not** prove that the separate model server is running. The second requests
a model proposal without writing any source. The third is a separate explicit
owner action: it writes only the selected existing web-game index, runs scoped
QA and proposes a PR. No candidate auto-merge, runtime QA certification,
production publication or claim of release success is performed.

## Separation status

Dedicated queue, independent worker code and WEB-only intake are implemented.
The user-managed WEB model server and dedicated GitHub token must still be set
up and verified on the owner's machine. The existing main repository and
shared asset library remain common. Historical items already present in the
native Vibe2 queue are not silently migrated, erased or marked successful.
The independent owner workflow does not promise those historical items are
automatically transferred.
