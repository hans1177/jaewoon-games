# QA Protocol

QA verifies behavior; AI CEO evaluates technical/design completeness and cross-department consistency; CEO+AI CEO demo evaluates fun and strategic direction.

Minimum completion path: worker self-check → department review → QA → AI CEO integrated review.

QA FAIL automatically returns the task to REWORK with evidence. Regression checks protect previously verified functionality.

Risk classes: SAFE, NORMAL, HIGH, CRITICAL. HIGH/CRITICAL work requires stronger evidence and a recovery point. CRITICAL deployment/data/build-system changes require explicit safeguards and appropriate approval.
