# Vibe 캐릭터 제작 작업실 (Blender 4.x)

이 폴더의 `tools/vibe_character_authoring.py`는 완성된 상용 캐릭터가 아니라 **실제로 수정 가능한 원본 에셋**을 만드는 출발점입니다.

## 실행
```bash
blender --background --python tools/vibe_character_authoring.py -- --output-dir build/vibe-character
```

출력:
- `vibe_character_authoring.blend` — Blender에서 편집할 수 있는 원본
- `vibe_character.glb` — 웹 엔진에서 불러올 모델
- `vibe_suit_basecolor.png` — Texture Paint에서 직접 그릴 수 있는 2048×2048 이미지

## 실제 제작 방법
1. Blender에서 .blend를 열고 **Face**를 선택합니다. Object Data > Shape Keys의 `jawOpen`, `mouthSmileLeft`, `eyeBlinkLeft` 등을 선택하고 Sculpt Mode에서 표정 형태를 세밀하게 다듬습니다. 이름을 유지하면 바이브 엔진이 자동 인식합니다.
2. **Torso**를 선택하고 Texture Paint로 이동합니다. 재질 `forest_suit_PBR`의 `Vibe_Paint_2K`를 선택해 직접 문양·음영을 그린 후 Image > Save As로 저장합니다. 4K가 필요하면 Blender에서 이미지를 4096×4096으로 확대하고 UV를 확인합니다.
3. **VibeSkeleton**을 Pose Mode로 열고 손가락 관절(`LeftHandIndex1` ~ `LeftHandIndex3`)을 회전시켜 포즈를 만듭니다. 현재 손가락 뼈는 생성되지만 손가락 메시와 스킨 가중치는 제작자가 추가해야 합니다.
4. Dope Sheet > Action Editor에서 `Idle_HandAuthored`, `Walk_HandAuthored`, `Attack_HandAuthored`를 편집합니다. 키프레임의 Bezier 핸들을 조정해 무게감과 타이밍을 수정합니다.
5. File > Export > glTF 2.0에서 **Animation, Shape Keys, Materials**를 포함해 GLB로 내보냅니다.
6. GLB를 저장소 `assets/` 아래에 넣고 `assets/vibe-model-preview.html?asset=assets/파일명.glb`로 미리봅니다.

## 품질 제작 기준
- 영화급 얼굴은 현재 기본 표정 8종을 토대로 18개 이상 세밀한 블렌드셰이프를 조각해야 합니다.
- 손가락은 관절 이름과 애니메이션 연결 규칙만 갖춰져 있습니다. 실제 손가락 메시/스키닝이 필요합니다.
- 현재 모델은 절차적으로 만든 기본 형태입니다. 고품질 실루엣·머리카락·의상·주름·재질은 Blender에서 추가 작업해야 합니다.
- 4K 텍스처는 GPU 메모리를 많이 사용하므로 모바일에서는 1K/2K LOD를 함께 제작하세요.
- 기존 상용 게임 캐릭터의 디자인·텍스처·애니메이션을 복제하지 않고 독창적인 스타일로 제작하세요.

**주의:** Blender 생성 스크립트는 GitHub에 반영되었지만 현재 환경에서 Blender 실행·GLB 생성·브라우저 렌더링 성공은 아직 검증하지 않았습니다.
