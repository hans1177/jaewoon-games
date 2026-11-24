# 동물 관절·애니메이션·리액션 지시서 (필독 · 몬스터 재사용 포함)

**ChatGPT·Claude·바이브코딩 도구 등 누구든 `mare-essentia`의 동물 모델에 뼈대(리그)·애니메이션·행동(리액션)을 만들거나, 동물을 몬스터로 바꿀 때 반드시 읽고 그대로 따른다.**
먼저 `docs/discoveries/README.md`(발견물 대표 모양)와 `docs/ASSET_MANAGEMENT.md`(등록·256색 금지)를 읽는다. 루트 `AGENTS.md`(파츠·원형·임의 생성물 금지)가 우선한다.

목표: **동물 한 마리를 한 번 제대로 만들면** ① 지상 탐험 발견물 ② 항구 목장·배경 ③ 몬스터(변형) 세 곳에서 그대로 쓴다. 그래서 몸 구조별 **표준 뼈대 이름**과 **표준 애니메이션 이름**을 반드시 지킨다.

---

## 1. 몸 구조별 표준 뼈대 7종
모든 뼈 이름은 영어, 좌우는 `_L` / `_R`. 루트(`Root`)는 발밑 바닥 중앙, 정면은 **-Z**, 위는 +Y. 1스터드 ≈ 0.28m 기준으로 실제 크기 비율을 맞춘다(크기는 `PortBuildings.AnimalVisual` 과 맞춘다).

| 뼈대 | 쓰는 동물 | 필수 뼈 (부모 → 자식) | 뼈 수 |
|---|---|---|---|
| **QUAD** 네발 | 말·코끼리·호랑이·늑대·하마·코뿔소·사슴·곰·판다·낙타 | Root → Hips → Spine1~3 → Neck1~2 → Head → Jaw · Ear_L/R · (Trunk1~4 코끼리) · Tail1~4 · FrontLeg_L/R: Upper → Lower → Foot → Toe · BackLeg_L/R: Upper → Lower → Foot → Toe | 30~45 |
| **BIRD** 걷는 새 | 펭귄·홍학·타조·퍼핀·갈매기(지상) | Root → Hips → Spine1~2 → Neck1~3 → Head → Beak · Wing_L/R: 1 → 2 → 3 · Leg_L/R: Upper → Lower → Foot · TailFan | 22~30 |
| **FLYER** 나는 것 | 날아가는 새·박쥐·나비 | BIRD 와 같고 Wing 끝에 Primary1~3 깃 뼈 추가(접기·펼치기) | 26~36 |
| **SWIM** 헤엄 | 물고기·상어·고래·돌고래·가오리·해마 | Root → Body1~4(척추 사슬) → Head → Jaw · Tail1~3 → TailFin · Fin_Pectoral_L/R · Fin_Dorsal · (가오리: Wing_L/R 1~3) | 14~24 |
| **SERPENT** 긴 몸 | 뱀·코브라·장어·악어(꼬리)·바다뱀 | Root → Body1~12(사슬) → Neck → Head → Jaw · (코브라: Hood_L/R) · (악어: QUAD 다리 + Tail1~8) | 16~40 |
| **ARTHRO** 다리 많은 것 | 곤충·게·가재·거미·전갈 | Root → Thorax → Head → Antenna_L/R · Abdomen1~3 · Leg1~4_L/R: Upper → Lower → Tip · (집게: Claw_L/R → Pincer) · (날개: Wing_L/R) | 24~40 |
| **PRIMATE** 영장류 | 고릴라·원숭이·여우원숭이 | **Roblox R15 와 같은 이름**(LowerTorso·UpperTorso·Head·LeftUpperArm…)으로 만든다 → 회사 공용 모션(`CommonMotion`)을 바로 쓸 수 있다 · Tail1~6 추가 | 15~25 |

- 모델 형식: **스킨드 메시(MeshPart + Bone)**. 뼈 50개 이하, 한 모델 1~3천 폴리곤.
- Roblox 안에서는 `Model` → `AnimationController` → `Animator` 구조. Humanoid 는 영장류만 선택.
- 가져온 원본(Quaternius·Mesh2Motion·Kenney 등, `assets/inbox-hold/Animals/`)은 뼈 이름을 위 표준으로 **이름만 바꿔** 맞춘다. 원본 라이선스·해시 기록은 그대로 유지.

## 2. 표준 애니메이션 이름 (같은 이름 = 어디서나 재사용)
`<동물id>_<상태>` 로 등록한다(예: `Animals/tiger_Walk`). **굵게** 표시가 필수, 나머지는 선택.

| 묶음 | 이름 | 반복 | 길이(초) | 설명 |
|---|---|---|---|---|
| 기본 | **Idle** | ○ | 3~5 | 숨쉬기·꼬리·귀 흔들림 |
| 기본 | **Idle_Look** | × | 2~3 | 고개 돌려 주변 살피기 |
| 생활 | **Graze / Peck / Sniff** (몸 구조별 하나) | ○ | 3~4 | 풀 뜯기·쪼기·킁킁 |
| 생활 | Drink · Eat · Sleep · Call(울음) · Groom(털 고르기) | 혼합 | 2~6 | 탐험 분위기용 |
| 이동 | **Walk** | ○ | 0.9~1.4 | 발이 바닥에서 미끄러지지 않게(보폭 = 이동속도 × 길이) |
| 이동 | **Run** (네발은 Gallop) | ○ | 0.5~0.8 | |
| 이동 | Trot · Turn_L · Turn_R · Stop | 혼합 | 0.4~1 | |
| 반응 | **Alert** | × | 0.6~1 | 귀·고개 번쩍, 몸 굳음 |
| 반응 | **Flee_Start** | × | 0.3~0.5 | 놀라 튀어 나가는 첫 동작 → Run 으로 이어짐 |
| 반응 | Curious | × | 1.5~2.5 | 한두 걸음 다가와 냄새 맡기 |
| 반응 | **Threat** (위협) | × | 0.8~1.2 | 이빨·뿔·후드·날개 펼치기. 공격 전 경고 |
| 전투 | **Attack** (몸 구조별: Bite·Claw·Charge·Peck·TailWhip·Spit·Sting·Pinch) | × | 0.7~1.2 | **예고 동작 0.45초 이상** 뒤 타격 |
| 전투 | **Hit** · **Death** | × | 0.4 / 1.2~1.8 | Death 마지막 자세는 바닥에 누운 채 고정 |
| 헤엄 | **Swim_Slow** · Swim_Fast · Surface(수면 위로) · Dive · Breach(고래 점프) | 혼합 | | SWIM 전용 |
| 비행 | **Fly_Flap** · Fly_Glide · TakeOff · Land · Hover | 혼합 | | FLYER 전용 |

**키프레임 표시(마커)** — 이름 고정. 코드가 이것으로 소리·피해·발자국을 맞춘다.
`Step`(발 닿음) · `Hit`(타격 순간) · `Roar`(울음 시작) · `Splash`(물보라) · `WingBeat`(날갯짓 정점)

## 3. 리액션(행동) 규칙 — 탐험에서 살아 있는 느낌
동물마다 **성격(temperament)** 한 가지를 정한다. 숫자는 스터드 기준 기본값.

| 성격 | 예 | 경계 거리 | 도망 거리 | 행동 |
|---|---|---|---|---|
| **timid** 겁많음 | 사슴·토끼·새·물고기·나비 | 22 | 12 | Alert → Flee. 뛰어 다가가면 즉시 도망. 무리는 함께 흩어짐 |
| **curious** 호기심 | 펭귄·돌고래·여우원숭이·퍼핀 | 18 | 6 | 천천히 다가가면 Curious 로 먼저 다가옴. 갑자기 뛰면 Flee |
| **neutral** 무던함 | 코끼리·소·라마·거북·하마(평소) | 14 | 5 | 무시하다 가까이 붙으면 Idle_Look → 비켜 걷기 |
| **territorial** 영역 | 하마·코뿔소·백조·코브라·악어 | 16 | — | Threat 경고 → 계속 다가오면 Attack(Charge) 한 번 → 물러남. **탐험에선 피해 없이 넘어뜨리기만** |
| **predator** 포식 | 호랑이·늑대·상어·곰 | 26 | — | 몸 낮추고 따라옴(Stalk) → Threat. 무리 사냥은 둘러싸기. 탐험 기본은 비전투, 몬스터 변형에서만 공격 |

공통 규칙
- **천천히(걷기)·몸 낮춤**으로 다가가면 경계 거리가 절반. 뛰거나 소리(전투·포)가 나면 1.5배.
- **무리(herd/flock)**: 우두머리 1마리 + 따라가는 2~8마리. 우두머리가 도망치면 모두 같은 방향.
- **시간·날씨**: 야행성은 낮에 Sleep, 밤에 활동(매핑표 `condition`). 비 오면 새는 덜 날고 개구리·버섯 활동.
- **스케치(관찰)**는 동물이 `Idle/Graze` 상태일 때만 성공. Alert 중엔 손 떨림 → 실패하고 다시.
- 한 번 도망친 동물은 15초 뒤 다른 자리에서 다시 Idle. 최대 3번(지금 코드와 같음) 뒤엔 그 자리에 머문다.
- 바다 동물: 배 근처 수면에 Surface → 몇 초 뒤 Dive. 고래는 멀리서 Breach 로 존재를 알린다.

## 4. 몬스터로 다시 쓰기 (같은 뼈대 + 변형 층)
**새 몬스터를 처음부터 만들지 않는다.** 동물 리그 위에 변형 층만 얹고, 2절 애니메이션을 그대로 쓴다.

| 변형 층 | 방법 | 예 |
|---|---|---|
| 크기 | 1.5~3배 (거대 개체) · 0.6배 (새끼 무리) | 거대 악어, 늑대 새끼 떼 |
| 질감 | 텍스처만 교체: 뼈만 남은·유령(반투명)·저주(검붉은 균열)·이끼·화산석 | 해골 늑대, 유령 고래 |
| 부착물 | 뼈(Bone)에 붙는 **등록 메시**: 뿔·갑옷판·사슬·산호·따개비. 기본 도형(Part) 금지 | 갑옷 코뿔소, 산호 거북 |
| 눈·빛 | 눈 텍스처의 발광(SurfaceAppearance/Emissive). 네온 공 금지 | 붉은 눈 늑대 |
| 동작 | 같은 이름 애니메이션을 **속도 0.8~1.3배·자세 과장**으로 재생, `Roar`·`Threat` 를 더 길게 | |
| 추가 동작(몬스터 전용) | Spawn(땅·물에서 솟음) · Enrage(분노 전환) · Stagger(크게 비틀) · Attack_Heavy(예고 0.8초 이상) · Despawn | 보스 단계 |

- 전설·신화 소재(중립 카드 스토리와 맞춤, `docs/card_battle/README.md` 0절): 크라켄 = 문어 몸통(SWIM) + 촉수 8개(SERPENT 사슬), 바다뱀 = SERPENT 거대화, 그리핀 = QUAD + FLYER 날개 합성.
- 피해·체력·드롭 같은 수치는 **코드(전투 규칙)가 정한다.** 애니메이션 파일에 넣지 않는다.
- 몬스터 공격은 반드시 **예고 동작(빛·자세)이 보인 뒤** 맞는다(지상전 규칙과 같음).

## 5. 품질 체크리스트 (등록 전 모두)
- [ ] 뼈 이름이 1절 표준과 같다 (`_L/_R`, -Z 정면, Root 바닥 중앙)
- [ ] 필수 애니메이션(굵게)이 모두 있고, 반복 동작은 이음새 없이 돈다
- [ ] Walk·Run 에서 **발 미끄러짐 없음**(보폭과 이동속도 일치)
- [ ] 무게 이동·꼬리/귀/지느러미가 **한 박자 늦게 따라오는**(2차 움직임) 느낌이 있다
- [ ] Attack 은 예고 0.45초 이상, `Hit` 마커가 타격 프레임에 있다
- [ ] Death 마지막 자세가 바닥을 뚫지 않는다
- [ ] 텍스처 풀컬러(256색 금지), 512~1024px, 실제 종의 색·무늬
- [ ] 다른 종 모델에 색만 바꾼 것이 아니다
- [ ] Studio 에서 탐험(발견물)·목장 두 곳에 놓고 촬영 확인

## 6. 코드 연결 (구현 담당용)
- 지금: `DiscoveryStage.luau` 가 동물 모델을 놓고, 뛰어서 다가가면 **모델 전체를 미끄러뜨려** 도망시킨다(애니메이션 없음).
- 리그가 들어오면 할 일:
  1. `Shared/AnimalMotion.luau` 신설: `AnimalMotion.play(model, "Walk")`, 없는 이름은 같은 묶음의 기본(예: Gallop → Run → Walk)으로 내려간다. 애니메이션이 하나도 없으면 지금처럼 몸 흔들림·꼬리 흔들기 정도의 절차 움직임.
  2. `DiscoveryForms` 에 종별 `temperament`·`herd`·`rig` 필드 추가(3절 표 기본값 → 종별 덮어쓰기).
  3. `DiscoveryStage` 의 도망을 상태 머신(Calm → Curious/Alert → Flee/Threat)으로 교체하고, 이동은 실제 걸음(Walk/Run)으로.
  4. 몬스터는 `FieldScene` 적 생성에서 같은 리그 + 4절 변형 층을 쓰는 `MonsterVariants` 표로.
- 애니메이션 자산은 `assets/inbox/Animations/<동물id>_<상태>.rbxm` + `.license.json` 으로 `docs/ASSET_MANAGEMENT.md` 2절 경로만 사용. ID 는 `AssetIds["Animations/<동물id>_<상태>"]`.
