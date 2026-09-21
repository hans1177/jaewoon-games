# PRIMARY THREE — FAST MVP

Updated: 2026-09-22

Canonical machine policy remains `company-learning/platform-release-roadmap.json`.

## Priority

1. 포근섬 (`cozy-island`)
2. 대충 RPG / **Whatever RPG** (`daechung-rpg`)
3. 심야 술래잡기 (`horror-escape-room`)

영토전쟁은 보존하지만 주력 3개 FAST_MVP가 끝날 때까지 deferred 상태다.

## Shared release rule

- Roblox first.
- New feature expansion is frozen until the first private/restricted MVP release.
- Roblox Studio is not used.
- Roblox validation is Headless FAST_MVP.
- Internal release gate is deliberately minimal:
  1. exact source + Rojo package SHA256
  2. Vibe + one shared model preflight
  3. one combined core headless QA (authority/security/mobile/save/multiplayer/exact artifact)
  4. Open Cloud private/restricted publish
- Separate independent QA, separate regression stage, separate final review, and Web revalidation are **not** internal-release blockers.
- Public release remains a separate stricter policy.
- Unity may continue in parallel but does not block Roblox MVP.

## Design quality

- 포근섬: warm diorama islands, biome/resource silhouettes, visible army movement.
- Whatever RPG: highest character/combat visual budget, anime-fantasy stylization, readable companions and bosses.
- 심야 술래잡기: readable night horror, strong monster silhouettes, chase visibility over darkness.
