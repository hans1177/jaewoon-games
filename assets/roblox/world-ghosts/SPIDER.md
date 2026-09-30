# 고디테일 거미 3D 자산

처녀귀신 `bride.glb`와 같은 방식으로 저장소 안에서 직접 제작·재생성하는 거미 원본 자산이다. 외부 모델이나 생성 이미지에서 메시를 가져오지 않는다.

## 구성

- 원본 제작 코드: `build-spider.py`
- 생성 모델: `native/spider/spider.glb`
- 렌더 미리보기: `native/spider/spider.png`
- 검증자료: `native/spider/evidence.json`
- 웹 모델 뷰어: `native/spider/view.html`
- 8개 다리 각각 4관절, 촉지·송곳니·방적돌기까지 별도 리그
- 8개 눈, 복부 갑각 무늬, 다리 가시, 감각모(setae), 발톱 포함

## 12개 동작

`idle`, `walk`, `run`, `strafe`, `climb`, `threat`, `bite`, `pounce`, `web_cast`, `hit`, `stagger`, `death`

## 플랫폼

GLB를 공용 원본으로 사용한다. Unity는 glTF 임포터를 통해 가져오고 Roblox는 3D Importer로 가져온 뒤 각 플랫폼에서 재질·애니메이션·LOD를 최젍화한다. 공용 원본이 존재한다는 사실과 실제 플랫폼 런타임 검증 완료는 구분한다.

현재 자동 생성 단계에서는 GLB 구조와 12개 클립 존재 여부를 검사한다. 실제 Roblox Studio와 Unity WebGL 실행 검증 전에는 `productionVerified=false`를 유지한다.
