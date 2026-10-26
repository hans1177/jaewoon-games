# GPT / Copilot / developer assistant shared instructions

Read the latest main branch `AGENTS.md` and `DIRECT_DEV.md` before making changes to any of the owner's games.

## Owner-mandatory asset rule

- Never build visual characters, buildings, creatures, trees, weapons or props out of Roblox `Part`, `Ball`, `Cylinder`, `WedgePart`, simple spheres/boxes, or near-equivalent primitives.
- Do not invent visual assets or arbitrary substitutes not approved by the owner. Converting primitive shapes to procedural `.glb`/MeshPart (with `trimesh`, Blender primitives or any other generator) does **not** make them acceptable.
- Use an approved, actually existing, stylistically suitable 3D asset with legitimate CC0/other approved license, verified original/sha256 and Roblox Universe-specific permission. A catalog label without a model is not an asset.
- If no eligible asset exists, halt the affected asset/publication operation and report what is missing. No primitive, generic or unrelated fallback. No fake runtime/deployment/license claims.
- Preserve existing game economy, saves and unrelated games. Apply the same rule in all game-design, F0–F9, automatic builds and one-shot patch workflows.
- The owner specifically does not require Roblox Studio validation; do not invent a Studio gate. Actual license/grant/publish evidence remains necessary.

This file is a repository-shared instruction for assistants that consult the repo. It does not synchronize every independent ChatGPT conversation automatically.
