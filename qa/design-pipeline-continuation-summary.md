# DESIGN_ONLY continuation candidate

This candidate repairs only existing central progression bottlenecks.

- No central threshold changes.
- DESIGN_ONLY strict promotion remains PASS + score >= 80 + zero hard failures.
- No pre-Web artbook creation is added.
- Schema-shaped model failures remain bounded to the existing two-attempt retry budget.
- Persisted strict-ready games are still evaluated when another game in the same matrix fails.
- Existing bootstrap -> design progression continues when ACTIVE DESIGN_ONLY work remains even if seed state itself did not change.
- HOLD, DEVELOPMENT_CONFIRMED, and RELEASE_CONFIRMED seeds are excluded from DESIGN_ONLY continuation.
- Active design batches are not duplicated.
