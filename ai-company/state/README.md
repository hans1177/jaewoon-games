# Persistent Company State

This directory is the canonical operational state layer for projects, tasks and final/operational decisions.

- `projects.json`: project portfolio registry and lifecycle state.
- `tasks.json`: active work queue plus completed task references.
- `decisions.json`: permanent CEO/AI CEO decision ledger.

Rules:
1. Company state survives worker/model rotation.
2. Do not reconstruct canonical state solely from an AI conversation when a recorded company state exists.
3. Final CEO decisions must not be silently overwritten; supersede them with traceable decision records.
4. Task completion requires the review/QA chain defined by company protocols.
5. HOLD projects receive no active allocation unless explicitly authorized.
6. Significant state mutations should be represented in the audit log.
