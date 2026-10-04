# Roblox Common Presentation v1

회사 공용 로딩/브랜드/인트로/전환 그래픽 팩.

## 기본 연출

처음부터 복잡한 컷씬을 강제하지 않는다.

1. SIMPLE_FADE
2. LOGO_REVEAL
3. TITLE_CARD
4. 필요하면 LAYERED_PARALLAX와 VIGNETTE/LETTERBOX 조합
5. TRANSITION_CURTAIN으로 메뉴 또는 실제 게임 화면에 넘김

## 로딩

- BRAND_MARK
- LOADING_SCREEN
- LOADING_SPINNER
- LOADING_PROGRESS
- LOADING_TIP

실제 로딩 진행도와 완료 여부는 게임이 소유한다. 표시만 한다.

## 인트로

- INTRO_CANVAS
- INTRO_TITLE_CARD
- SIMPLE_FADE
- LOGO_REVEAL
- LAYERED_PARALLAX
- VIGNETTE_OVERLAY
- LETTERBOX
- TRANSITION_CURTAIN

기본 인트로는 4초 이내 짧은 구성 권장. 감소모션 모드에서는 패럴랙스/확대/흔들림을 제거하고 페이드+타이틀로 대체한다.

## 플로우 사용

기존 Asset Universe를 통해 DESIGN_REFINEMENT → GRAPHICS_PRODUCTION → SOURCE_COMPOSITION → BUILD_UP → PRESENTATION_POLISH에 같은 팩을 전달한다. 새 플로우는 만들지 않는다.

Studio는 내부 사용/점수/응용에 필수 아님.
