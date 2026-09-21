# 대충 RPG Unity Web 테스트

대충 RPG의 본체 엔진은 Unity 6로 전환한다.

- Unity project: `unity-games/daechung-rpg`
- Editor: Unity 6000.6.0f1
- Web test build output: `Builds/Web`
- Android: Chrome
- iOS: Safari
- PlayCanvas build remains only as temporary fallback/reference.

## Build

Unity Editor:
`Jaewoon Games > 대충 RPG > Build Web`

Command line:
`Unity -batchmode -quit -projectPath unity-games/daechung-rpg -executeMethod Jaewoon.DaechungRpg.Editor.WebBuild.BuildWeb`

The resulting Web build is intended to be published under the Jaewoon Games web host for immediate phone testing.
