# Self-hosted Runner Security Gate

## Current decision
`BLOCKED_PUBLIC_REPOSITORY`

The current `hans1177/jaewoon-games` repository is public. A privileged Unity self-hosted runner must not be attached to it in v1.

## Required boundary before activation
Preferred v1 architecture:
1. keep the public game/site repository free of privileged local runner credentials;
2. create/use a private orchestration/build repository for trusted build workflows and runner registration;
3. allow only reviewed trusted refs/workflows to request Unity builds;
4. use least-privilege tokens/secrets and never commit them;
5. isolate the runner machine/account from unrelated personal or sensitive data;
6. preserve logs/audit events and VERIFIED artifacts;
7. require explicit authority for release/deployment operations.

## Gate states
- BLOCKED_PUBLIC_REPOSITORY — no runner activation permitted.
- PENDING_REVIEW — private/restricted boundary exists but security configuration is not yet accepted.
- APPROVED — runner may be registered and heartbeat/build execution enabled.

Changing this gate to APPROVED requires evidence of the restricted execution boundary and AI CEO security review. Any significant paid infrastructure or major architecture change remains a CEO decision.
