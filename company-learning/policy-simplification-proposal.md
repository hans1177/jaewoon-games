# Four-principle policy simplification proposal

Status: PROPOSAL_ONLY — non-executable, not a replacement for existing owner-locked machine policy.

## Four owner-facing principles

1. **Account and security safety:** use official Roblox Open Cloud / Studio MCP paths only. No public-server bots, anti-detection, player injection, or unauthorized account automation. Never expose secrets or trust client state as server authority.
2. **Actual game quality:** no PASS without artifact-matched evidence for the specific tested behavior. Server/API success does not prove client UI, inputs, rendering, save or rejoin.
3. **Release integrity:** retain canonical F0–F9, immutable commit/Place/version identity, required checks, fail-closed gates and rollback. Never mark skipped, pending or unavailable tests PASS.
4. **Cost and throughput:** prefer existing free tools; require owner approval for paid resources. Parallelize independent checks and deduplicate identical work without weakening evidence or gates.

## Safe implementation plan (not yet authorized as a gate change)

- Display the four principles as the concise human-facing policy summary; retain machine-enforced rules until each migration is independently proven equivalent.
- Before reusing a check, require identical source/policy/checker versions, immutable evidence reference, same game and exact artifact, and a verified unexpired result. Changes in any identity invalidate the cache.
- Execute independent checks concurrently. Keep all mandatory checks required; timeout is BLOCKED/UNKNOWN, never PASS.
- Report three user-facing phases: development checks, Open Cloud server checks, and actual client play evidence. These are summaries, not substitutes for canonical F0–F9.
- Preserve official Studio MCP local-place-only constraints, and avoid automated Roblox Player/public server activity.
- First measure current policy QA duration and repeated identical validations, then propose narrowly scoped implementation PRs with tests. No changes to owner-locked policy, protected workflows, or required checks in this proposal.

## Acceptance criteria for a later implementation

- Existing owner-locked policy, security, Roblox account-safety and release gates still pass unchanged.
- No new bypass, silent skip, unsupported PASS or paid dependency.
- A policy-only or game-only change cannot accidentally reuse invalid evidence.
- Runtime gameplay screenshots are explicitly attributed to the client/Studio test environment; Open Cloud server probes cannot masquerade as real client play.
