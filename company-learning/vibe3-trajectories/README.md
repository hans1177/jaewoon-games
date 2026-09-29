# Vibe3 Trajectory Memory

This directory stores observable Vibe3 development trajectories for the canonical learning pipeline.

Rules:
- Preserve successful and failed candidate outcomes with observable evidence only.
- Never store hidden chain-of-thought.
- Failed candidates are warning memory and never positive training samples.
- A successful trajectory becomes positive memory only after runtime, independent QA, regression, exact-revision and protected-state evidence are bound.
- Benchmark cases are practice work and do not count as training samples until independently verified through the existing canonical evidence/distillation gates.
- Commercial external-game observations remain black-box only; proprietary source, assets and hidden algorithms are forbidden.
- No parallel learning pipeline is created by this directory.
