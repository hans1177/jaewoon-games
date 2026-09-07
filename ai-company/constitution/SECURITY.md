# Security

## Levels
L5 CEO; L4 AI CEO; L3 Department Head; L2 Worker; L1 Trainee/temporary worker; L0 untrusted/external.

Apply least privilege. Workers receive only access required for assigned tasks. No AI worker can become L5.

## Restricted operations
Verified-build deletion, force-changing protected/main history, company-data destruction, deployment architecture changes, secret access, mass deletion, project cancellation and alteration of final CEO decisions require elevated handling. Significant/irreversible cases require CEO decision.

Secrets must never be stored in plaintext company knowledge or source documents. Use dedicated secret stores such as repository/environment secrets and expose execution capability rather than secret values whenever possible.

Important commands, changes, tests, builds, deployments and decisions must be auditable.
