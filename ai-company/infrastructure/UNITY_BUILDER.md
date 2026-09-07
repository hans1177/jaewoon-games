# Unity Builder Architecture

Initial target: UNITY-BUILDER-01, a dedicated local/self-hosted build machine when available.

Conceptual flow: GitHub → CI workflow → compatible Unity Builder → automated build/test → WebGL/Android artifact → QA/test environment → CEO mobile testing.

The architecture must support later multiple builders (for example WebGL/general, Android, heavy/release) without changing company governance. Build jobs should be routed by capability labels.

The builder is replaceable infrastructure. Source, project state, build configuration and recovery information must live in durable company systems rather than only on the builder.

Do not require the CEO to operate Unity Editor directly for routine company operation.
