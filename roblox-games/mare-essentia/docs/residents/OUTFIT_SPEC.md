# 주민 복장·헤어 제작 규격 (파일 이름 · 부위 · 색 · 프롬프트)

> 2026-11-28 오너: "주민 복장·헤어 — 구현 미흡? 프롬프트 미흡? 더 디테일하게."
> 드롭박스: `/Vibe2Transfer/inbox/People/<파일이름>.glb` → 자동 검사 → 등록 → **아래 이름이면 코드가 자동으로 그 문화권 주민에게 입힌다**(`Pose.applyRegisteredMobOutfit`, 2026-11-28 반영).
> 기본 규칙은 `README.md`(층·재질·모션), 직업은 `jobs.md`, 문화권 설명은 `<문화권>.md`. 이 문서는 **만들 파일 목록과 숫자**를 정한다.

## 0. 진단 — 왜 주민이 다 비슷한가

| 문제 | 원인 | 구분 |
|---|---|---|
| 런던·이스탄불·부산 주민이 같은 옷 | 등록된 옷 조각이 서유럽식 9종(`outfit_vest·coat·apron·guard·belt·boot·cuff·sash·stole`)뿐이라 **모든 문화권이 같은 조각을 색만 바꿔** 입는다 | 구현(자산 부족) |
| 머리 모양 반복 | 헤어 13종을 22개 문화권이 나눠 씀. 문화권 전용 헤어 0개 | 구현(자산 부족) |
| 갓·터번·삿갓 같은 머리쓰개 부족 | 모자는 코드 도형 몇 종(`hat = "wide"/"turban"/"kasa"…`)뿐 | 구현 |
| 지시서가 "짧은 재킷·넓은 모자" 같은 한 줄 | 부위·크기·색·파일 이름이 없어 만들 수가 없음 | **프롬프트** |

결론: **둘 다 미흡.** 코드는 이제 문화권 전용 파일을 받을 준비가 됐다(이름 규칙 1절). 남은 것은 아래 목록대로 **실제 GLB를 만드는 것**이다.

## 1. 파일 이름 규칙 (이대로면 자동 적용)

| 종류 | 이름 | 붙는 부위 | 예 |
|---|---|---|---|
| 상의(조끼 자리) | `outfit_<문화권>_vest.glb` | UpperTorso | `outfit_korea_vest.glb` (저고리) |
| 겉옷(추울 때·관리) | `outfit_<문화권>_coat.glb` | UpperTorso | `outfit_ottoman_coat.glb` (카프탄) |
| 앞치마(일꾼·장인) | `outfit_<문화권>_apron.glb` | LowerTorso | `outfit_japan_apron.glb` (마에카케) |
| 경비 상의 | `outfit_<문화권>_guard.glb` | UpperTorso | `outfit_china_guard.glb` |
| 허리띠 | `outfit_<문화권>_belt.glb` | LowerTorso | `outfit_malabar_belt.glb` |
| 신발(한 짝, 좌우 같이 씀) | `outfit_<문화권>_boot.glb` | Left/RightLowerLeg | `outfit_korea_boot.glb` (짚신) |
| 소매 끝(한 쪽) | `outfit_<문화권>_cuff.glb` | Left/RightLowerArm | |
| 띠·숄(선원) | `outfit_<문화권>_sash.glb` | UpperTorso | |
| 영대(성직) | `outfit_<문화권>_stole.glb` | UpperTorso | |
| 남자 머리 | `hair_<문화권>_male.glb` | Head | `hair_korea_male.glb` (상투) |
| 여자 머리 | `hair_<문화권>_female.glb` | Head | `hair_japan_female.glb` (시마다) |

- `<문화권>` = `brick britain china colonial creole desert france hanse iberia italy japan korea malabar med nordic ottoman pacific seasia stone swahili tropic wafrica` 중 하나(코드 `PortCultures.OUTFIT` 키).
- 없는 파일은 기존 일반 조각을 그대로 쓴다 → **한 문화권에서 vest·hair 두 개만 먼저 만들어도 바로 효과**가 보인다.
- 수염(`hair_beard`)은 교체 대상이 아니다.

## 2. 메시 규격 (모든 조각 공통)

| 항목 | 값 |
|---|---|
| 기준 몸 | Roblox R15 기본 체형(키 약 5.5 스터드). 부위별 크기 비율은 코드 표와 같게: 상의 1.18×1.50×1.22(부위 대비), 머리 1.15×1.23×1.18, 신발 1.24×1.36×1.25 |
| 피벗 | 붙는 부위의 중심. 앞 = −Z |
| 텍스처 | **색 텍스처 필수(회색 기본색 금지)**, 512px(얼굴 가까운 머리 1024px), 풀컬러(256색 금지) |
| 재질 | 면·리넨 거칠기 0.85, 모직 0.9, 실크 0.4, 가죽 0.6 (`README.md` 재질표) |
| 겹침 | 안쪽 몸을 뚫고 나오지 않게 몸에서 0.02~0.06 띄움. 머리는 이마선 위, **얼굴(눈썹~턱) 가리지 않음** |
| 출처 | 승인 CC0 원본 가공(`RULES.md`), `.license.json`에 원본·"derived" 기록 |

## 3. 문화권별 제작 목록 (남·여 · 색은 코드 팔레트)

| 문화권 | 남 상의(vest) | 여 상의(vest) | 남 머리 | 여 머리 | 신발 | 색(코드 팔레트) |
|---|---|---|---|---|---|---|
| britain | 무릎 길이 웨이스트코트 + 셔츠 | 보디스 + 숄 | 뒤로 묶은 꽁지머리 | 모브캡 아래 올림머리 | 버클 구두 | #6E7076 #6E523A #28345A #54603C |
| france | 수 놓은 쥐스토코르 | 코르셋 드레스 상체 | 가발풍 웨이브 | 퐁탕주 올림 | 굽 구두 | #2C468C #822438 #E8DEC4 #603878 |
| iberia | 짧은 재킷 + 허리 장식 | 만티야 + 숄 | 짧은 검은 머리 + 수염 | 뒤 쪽머리 + 빗 장식 | 가죽 구두 | #1E1C1E #802428 #CEAA64 #ECE6D6 |
| italy | 더블릿 + 망토 고리 | 소매 분리 드레스 | 짧은 곱슬 | 땋아 올림 | 가죽 구두 | #782838 #285A42 #DEB046 #28386E |
| brick(네덜란드) | 검은 더블릿 + 흰 칼라 | 검은 드레스 + 흰 앞치마·칼라 | 단발 | 흰 보닛 속 올림 | 나막신 | #222022 #463428 #3A3C42 #284638 |
| hanse | 모직 튜닉 + 모피 깃 | 모직 드레스 + 두건 | 단발 | 땋은 머리 + 두건 | 장화 | #36543C #684C34 #6E7074 #8C462C |
| nordic | 니트 스웨터 + 가죽 조끼 | 자수 앞치마 드레스 | 긴 머리 + 수염 | 두 갈래 땋음 | 털 장화 | #345A8C #AA342C #78563C #E8E2D4 |
| stone(발트·러시아·스코틀랜드) | 긴 카프탄 + 허리띠 | 사라판 | 단발 + 턱수염 | 한 갈래 땋음 + 코코시닉 | 장화 | #7E2F30 #28395F #A47E45 #DED3BC |
| med | 헐렁한 리넨 셔츠 + 조끼 | 블라우스 + 숄 | 짧은 곱슬 | 스카프 머리 | 샌들 | #D6AA50 #F0ECE0 #3C828C |
| ottoman | 카프탄(무릎) + 허리 띠 | 페라제 겉옷 + 베일 | 짧은 머리(터번 아래) + 수염 | 베일 속 땋음 | 끝 올라간 구두 | #B02C30 #305296 #F4F0E4 #347854 #D6AA46 |
| desert(북아프리카·레반트) | 젤라바(후드 겉옷) | 하이크(몸 감싸는 천) | 짧은 머리 + 수염 | 천 속 머리 | 바부슈 | #F4EEDE #E4D6B4 #344682 #78583C |
| swahili | 칸주(흰 긴 셔츠) | 캉가(무늬 천 두 장) | 짧은 머리 + 코피아 | 캉가 머리 감싸기 | 가죽 샌들 | #FAF8F0 #3C4682 #D6A046 |
| malabar | 문두(허리 천) + 맨 상체 또는 짧은 셔츠 | 문두 네랴투(흰 천 두 장, 금테) | 짧은 머리 + 콧수염 | 긴 머리 뒤 매듭 + 꽃 | 맨발 | #FAF6EC #ECA236 #468C50 #C8463C |
| seasia | 바주(짧은 상의) + 사롱 | 크바야 + 사롱 | 짧은 머리 | 뒤 쪽머리 + 핀 | 맨발·샌들 | #DC9632 #46825A #B03C50 #F0E8D2 |
| china | 장삼(긴 겉옷, 옆 여밈) | 오(짧은 상의) + 치마 | 변발 | 올림머리 + 비녀 | 천 신 | #B0302C #2E606E #D6AA3C #3C3C5A |
| japan | 고소데 + 하카마 | 고소데 + 오비 | 존마게 | 시마다 올림 + 빗 | 조리·게타 | #364678 #96343C #466450 #D2BE82 |
| korea | 저고리 + 바지(대님) + 두루마기 | 짧은 저고리 + 긴 치마 | 상투(갓 아래) | 쪽머리 + 비녀 / 처녀 땋은 머리 + 댕기 | 짚신·가죽신 | #273D61 #385549 #BAB7A8 #74363A |
| wafrica | 아그바다(넓은 겉옷) | 랩 스커트 + 블라우스 + 겔레 | 짧은 머리 + 쿠피 | 겔레(머리 감싸기) | 가죽 샌들 | #D6A032 #3C6496 #BE3C32 #468250 |
| pacific | 타파 천 허리 두름 | 타파 천 상의·치마 | 긴 곱슬 + 꽃 | 긴 머리 + 꽃 화관 | 맨발 | #F0ECE0 #D25A46 #3C96AA #ECBE46 |
| tropic(카리브·열대 혼합) | 리넨 셔츠 + 밀짚모자 | 면 블라우스 + 머리 수건 | 짧은 머리 | 머리 수건 | 맨발·샌들 | #ECE4CC #DE9646 #46A096 #C85A50 |
| creole | 리넨 정장 조끼 | 마드라스 체크 드레스 + 티뇽 | 짧은 머리 | 티뇽(머리 감싸기) | 구두 | #F0E2BE #4696AA #DC6E82 #FAD25A |
| colonial | 짧은 재킷 + 판초 | 블라우스 + 레보소 숄 | 짧은 머리 + 수염 | 두 갈래 땋음 | 가죽 구두 | #DC7850 #ECDCAA #46968C #B0465A |

**먼저 만들 10개(효과 큰 순):** `hair_korea_male`, `hair_korea_female`, `outfit_korea_vest`, `hair_japan_male`, `outfit_japan_vest`, `outfit_ottoman_coat`, `hair_ottoman_male`, `outfit_china_vest`, `hair_china_male`, `outfit_tropic_vest`.

## 4. 나이·계층 변형

- 지금 코드가 하는 것: 개인별 옷 색(`NpcClothTint`, 문화권 팔레트 안에서)·체격 개성.
- 노인·아이·부유층 전용 모양이 필요하면 `hair_<문화권>_male_old.glb`, `_child`, `_rich`처럼 뒤에 붙여 만든다. **이 뒤붙임 이름은 아직 코드에 연결되지 않았다**(다음 작업). 먼저 1절 기본 이름부터 만든다.

## 5. ChatGPT 프롬프트 틀 (복사해서 문화권·부위만 바꿈)

```
Roblox R15 layered accessory, early-modern {CULTURE} (1500-1800) {GARMENT} for a {male/female} townsperson,
fits the R15 {UpperTorso|Head|LowerTorso|LowerLeg} with a 0.03-stud gap, pivot at part centre, front = -Z,
semi-realistic hand-painted PBR (albedo+normal+roughness 512px, hair 1024px), full colour, no grey default,
palette {HEX LIST}, fabric {linen/wool/silk/cotton}, no logos, no text, does not cover the face,
derived from an approved CC0 base mesh (record source in .license.json as derived).
Deliver as GLB named {file name from section 1}.
```

예) 조선 남자 상의:
`... early-modern Korean (Joseon) jeogori jacket with goreum ties and baji waist for a male townsperson, fits the R15 UpperTorso ... palette #273D61 #BAB7A8, fabric ramie/cotton ... named outfit_korea_vest.glb`

## 6. 확인

- 올린 뒤 Studio 자동 점검에서 주민 모델 속성 `NpcCultureOutfit = <문화권>` 이 보이면 연결 성공.
- 회색·얼굴 가림·몸 뚫림이 보이면 `README.md` "현재 문제" 표 기준으로 다시 만든다.
