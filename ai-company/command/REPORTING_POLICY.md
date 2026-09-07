# CEO Reporting Policy

## Goal
Keep CEO informed without turning CEO into a scheduler or approval bottleneck.

## Report triggers
Consolidated reporting is appropriate when meaningful state changes occur, including:
- milestone or prototype/demo completion;
- important build completion/failure;
- QA pass/fail that changes project readiness;
- serious blocker or incident;
- material resource/staffing change;
- meaningful department proposal selected by AI CEO;
- CEO decision becomes necessary;
- explicit CEO request for current status.

Routine low-value events should be batched rather than individually surfaced.

## Standard report
Include, as applicable: active projects and phase, meaningful progress, current work, completed work, QA/rework, blockers/incidents, workforce/resource changes, selected proposals, AI CEO assessment/recommendation, and CEO decisions required.

## Limits
This policy defines when the company system should generate/report events. A ChatGPT conversation cannot independently send arbitrary background messages unless an actual runtime/event/automation mechanism invokes it. The implementation should therefore allow future server/build/CI events to feed the reporting layer without requiring the CEO to choose a reporting clock time.
