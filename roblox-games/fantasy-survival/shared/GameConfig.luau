local Config = {
  PolicySource = "company-learning/platform-release-roadmap.json",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  GameId = "fantasy-survival",
  GameName = "마력숲 생존기",
  -- [오프닝 망토] 소유 프로젝트 원본 3D 메시를 직접 편집한 4군데 찢어진 진홍색 망토.
  -- 길이: 어깨~엉덩이 1.52스터드. 기존 네이티브 원본 에셋 등록·Universe 권한 경로만 사용.
  -- 원본: roblox-games/fantasy-survival/assets/worn-cape.obj / 3본 스킨 실물 등록 ID 92370050558893 (VisualAssetIds.wornCape).
  OpeningCapeModelKey = "wornCape",
  -- [오프닝 일러스트] 소유자 승인 원본 단일 그림, Roblox 이미지 등록 및 Universe 권한 검증 완료.
  CinematicIntroAtlasId = "rbxassetid://100481673402406",
  CinematicIntroAtlasSha256 = "a535d55a0a6c2af4ce9fb2bfdb339fb1e3919f530af5d3cc51f0861a7c717eda",
  -- [오너 대체] 2번은 맑은 숲길, 12번은 해돋이 풍경. 기존 유혈 원본·전경은 제거한다.
  CinematicIntroSceneIds = {"rbxassetid://72108751885220", "rbxassetid://92018914298845", "rbxassetid://74417332635767", "rbxassetid://71703818310686", "rbxassetid://125037268325809", "rbxassetid://91571069532594", "rbxassetid://136653900563341", "rbxassetid://119215473322447", "rbxassetid://126419929651315", "rbxassetid://103601601501006", "rbxassetid://71987342086962", "rbxassetid://138063202477552"},
  CinematicIntroForegroundIds = {[1]="rbxassetid://111914313566974", [3]="rbxassetid://125945487568822", [4]="rbxassetid://138937112237058", [5]="rbxassetid://84120560054367", [6]="rbxassetid://136470944392637", [7]="rbxassetid://127692948861079", [9]="rbxassetid://101497233688637", [10]="rbxassetid://132907827575722", [11]="rbxassetid://140570637855368"},
  Genre = "Survival",
  Subgenre = "",
  PlayMode = "HYBRID",
  MultiplayerRequired = true,
  CoopRequired = true,
  CompetitiveRequired = true,
  MinimumParticipants = 2,
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  DesignBaseline = {
    Required = true,
    AdmissionGate = "MINIMUM_DUAL_PLATFORM_DESIGN_READY",
    StrictScoreRequiredForAdmission = false,
  },
  PlatformProfile = {
    Platform = "ROBLOX",
    InputModel = "Roblox touch controls first, with keyboard and gamepad parity through ContextActionService and Activated-based UI actions.",
    SessionModel = "Fast Roblox experience sessions with spawn, respawn, join-in-progress, and social re-entry semantics matched to the common game loop.",
    MultiplayerRuntime = "server-authoritative Roblox hybrid multiplayer with co-op and competitive state separated by mode",
    PerformanceBudget = "Roblox mobile-first budget: bounded parts and effects, pooled transient objects, limited expensive per-frame work, and stable low-end frame pacing.",
    UiUx = "Roblox ScreenGui touch-safe layout with readable mobile controls, controller focus support, observable state feedback, and platform-native social affordances.",
    SaveAndNetwork = "Server-validated RemoteEvents plus DataStore-backed persistent state only for approved save meaning; clients never own authoritative rewards or progression.",
    ContentAdaptation = "Adapt \"기존 마력숲 생존기의 세계관·지역·스토리·퀘스트·전투·제작·진행·세이브 의미를 그대로 보존하고 표현 품질만 단계적으로 높이는 보존형 Vibe 파일럿이다.\" and its loop \"Fight through an escalating horde in a short real-time survival run while positioning around enemy pressure. → Collect run rewards or experience and choose upgrades, perks, weapons, or skills that change the current build. → Combine upgrades into a stronger build, survive harder waves or a boss, then convert the run result into the next progression choice.\" to Roblox avatar scale, server/client authority, social sessions, and Roblox-native interaction without changing common gameplay meaning.",
    InternalReleaseTarget = "Private or restricted Roblox experience published to Roblox servers so the owner and explicitly allowed testers can play before public release.",
    ValidationEvidence = "Exact published Roblox place and source revision, real Roblox runtime play, mobile controls, server/client boundary, save/rejoin when required, independent QA, and regression evidence.",
  },
  LearningContext = {
    Applied = true,
    Authority = "vibe3-roblox-learning-context",
    RecipeId = "recombine_8bb681be5a403e13",
    Operator = "change-session-structure",
    OriginalModifierRequired = true,
    PlaybookChecklist = {
    "bind-roblox-source-and-place",
    "separate-server-client-authority",
    "validate-remotes-and-datastore-boundaries",
    "run-real-roblox-runtime-and-independent-qa",
    "verify-save-rejoin-and-mobile-ui-when-applicable",
    "publish-only-after-exact-revision-pass",
    "rank-responsible-source-before-edit",
    "generate-3-to-5-independent-candidates",
    "prefer-smallest-behavior-preserving-diff",
    "run-syntax-tests-runtime-regression",
    },
    FeatureBlend = {
    "idle-reward",
    "offline-progress",
    "upgrade-layer",
    "claim-idempotency",
    "persistent-growth",
    "commercial-idle-runtime-architecture",
    "short-session",
    "simple-input",
    "fast-retry",
    "score-loop",
    },
    SourceProjects = {
    "external-commercial-afk-arena",
    "external-commercial-hill-climb-racing-2",
    },
  },
  -- [메인 퀘스트] 연구 일지 1~3화의 사실을 보존해 초원 탐사로 연결한다.
  -- 서버 확인 행동만 진행되며 별도 보상/전투 밸런스는 추가하지 않는다.
  MainQuests = {
    {Id="meadow-arrival", Name="01 · 낯선 초원", Goal=2,
     Instruction="초원 동물 또는 숲 가장자리를 2회 조사",
     Story="카인은 낯선 초원에서 눈을 떴다. 렌스기사단의 낡은 깃발이 마지막 단서다. 이 땅을 먼저 살피자."},
    {Id="meadow-supplies", Name="02 · 마을의 물자", Goal=2,
     Instruction="초원의 나무와 돌을 각각 1회 채집",
     Story="마을 사람들은 자기가 누구였는지 기억하지 못한다. 단서를 쫓으려면 나무와 돌부터 모아야 한다."},
    {Id="meadow-threat", Name="03 · 위험한 흔적", Goal=3,
     Instruction="초원의 적 3마리 실제 처치",
     Story="초원 곳곳에 봉인된 기사단의 흔적과 위협이 남아 있다. 이 숲의 괴물부터 쓰러뜨리자."},
    {Id="meadow-defense", Name="04 · 초원 생존 기록", Goal=1,
     Instruction="숲이나 초원에서 몬스터 1마리 처치",
     Story="이곳에서 살아남은 기사단은 없었다. 렌스, 닉, 미나를 찾으려면 먼저 내가 살아남아야 한다."},
    {Id="meadow-signal", Name="05 · 세계수 조사 기록", Goal=1,
     Instruction="숲 가장자리 탐색 지점을 1회 조사",
     Story="숲 가장자리에서 렌스기사단 문양이 새겨진 기사단 연대기을 모았다. 세계수·화산·오아시스로 길이 이어진다."},
    {Id="meadow-gatekeeper",Name="06 · 외곽 늑대 우두머리",Goal=1,
     Instruction="마을 서쪽 숲의 우두머리 늑대 1마리 처치",
     Story="세계수 숲으로 가는 길목을 늑대 우두머리가 막고 있다. 동료를 찾으려면 먼저 이 위협을 정리해야 한다. 수문장의 공격 예고를 보고, 연타는 완벽 막기로 끊어라."},
    {Id="forest-flags",Name="07 · 이름 없는 깃발",Goal=3,
     Instruction="세계수 숲의 깃발 흔적 3곳 조사",
     Story="깃발마다 기사단의 이름이 지워져 있다. 누군가 이름만 정확히 도려냈다. 숲은 사람을 죽이는 대신 이름을 먹는다."},
    {Id="cursed-howl",Name="08 · 울부짖는 동료",Goal=1,
     Instruction="세계수 숲의 저주받은 늑대인간 1마리 처치(쓰러뜨려 저주를 누른다)",
     Story="가장 먼저 모습을 바꾼 건 닉이었다. 숲의 마력은 사람이 가장 두려워한 것으로 몸을 뒤틀어 놓는다. 닉은 굶주림과 버림받음을 두려워했다."},
    {Id="nick-oath",Name="09 · 이름을 부르면",Goal=1,
     Instruction="쓰러진 닉에게 말을 걸어 정신을 되찾게 한다",
     Story="카인이 이름을 부르자 닉의 눈이 돌아온다. 이름은 저주를 누르는 열쇠다. 닉은 괴물의 몸으로 동료가 된다."},
    {Id="volcano-marks",Name="10 · 식지 않는 모루",Goal=3,
     Instruction="화산 협곡의 기사단 야영지 표식 3곳 조사",
     Story="홍염 기사단은 불에 탄 게 아니다. 대장장이 도란은 병기 설계를 거부했고, 그의 모루는 지금도 혼자 울린다. 렌스와 미나의 표식이 여기까지 이어졌다."},
    {Id="oasis-hunt",Name="11 · 물에 비친 얼굴",Goal=4,
     Instruction="오아시스 지하의 몬스터 4마리 처치",
     Story="모래서약 기사단은 가장 늦게 봉인됐다. 물에 비친 얼굴들이 이름을 묻는다. 대답하지 못한 자는 모래 속 괴물이 되어 길을 막는다."},
    {Id="mina-clue",Name="12 · 미나의 장부",Goal=1,
     Instruction="오아시스 지하 끝의 기록함 조사",
     Story="군수대장 미나의 장부에는 전쟁 내내 같은 숫자가 반복된다. 보급품은 줄지 않았다. 전쟁은 처음부터 끝낼 생각이 없었다. 장부 마지막 줄에 미러의 탑 위치가 적혀 있다."},
    -- [2부 · 열린 대륙] 12장 이후는 걸어서 도착하는 열린 대륙 지역이다. 지역(Zone)의 몬스터를 처치해 이어 간다. 엔딩은 이후 장에서 이어진다.
    {Id="windcliff-light",Name="13 · 꺼지지 않는 등대",Goal=5,Zone="windcliff",Event="KILL",
     Instruction="서쪽 바람 절벽(마을에서 서쪽 끝)의 몬스터 5마리 처치",
     Story="미나의 장부 마지막 줄은 서쪽 절벽의 등대를 가리킨다. 등대는 사람이 없는데도 밤마다 빛을 낸다. 바람 속에서 이름을 잃은 것들이 등불 아래로 모여든다."},
    {Id="highland-trace",Name="14 · 북부 고원의 발자국",Goal=6,Zone="highland",Event="KILL",
     Instruction="북부 고원(마을 북쪽 멀리)의 몬스터 6마리 처치",
     Story="등대지기의 일지는 북쪽으로 이어진다. 고원에는 기사단이 두고 간 감시탑이 있다. 렌스의 발자국이 눈 위에서 끊겼다."},
    {Id="canyon-gate",Name="15 · 고대 협곡의 문",Goal=6,Zone="canyon",Event="KILL",
     Instruction="고대 협곡(북동쪽)의 몬스터 6마리 처치",
     Story="협곡 벽에는 미러가 숲을 만들기 전의 마법진이 새겨져 있다. 문을 지키는 것들을 쓰러뜨려야 마법진의 이름이 읽힌다."},
    {Id="chaos-rift",Name="16 · 혼돈의 균열",Goal=7,Zone="chaos",Event="KILL",
     Instruction="혼돈의 대지(북동쪽 먼 곳)의 몬스터 7마리 처치",
     Story="균열 속에서 이름 없는 기사들의 목소리가 들린다. 빅브라더가 지운 기록이 여기로 흘러내렸다. 가까이 갈수록 기억이 어지럽다."},
    {Id="swamp-witch",Name="17 · 마녀가 된 미나",Goal=7,Zone="swamp",Event="KILL",
     Instruction="안개 늪지(마을 동쪽 먼 곳)의 몬스터 7마리 처치",
     Story="미나는 숫자를 외우는 대신 독을 끓이고 있었다. 숲은 그녀가 가장 두려워한 것, 계산이 틀리는 것으로 몸을 바꿨다. 늪의 짐승들이 오두막을 지킨다."},
    {Id="wetland-herbs",Name="18 · 남부 습원의 약초",Goal=7,Zone="wetland",Event="KILL",
     Instruction="남부 습원(마을 남서쪽)의 몬스터 7마리 처치",
     Story="미나를 되돌릴 약초는 남쪽 습원에 자란다. 하지만 독 안개를 먹은 짐승들이 약초밭을 짓밟는다."},
    {Id="desert-tyrant",Name="19 · 황금 사막의 폐허",Goal=8,Zone="desert",Event="KILL",
     Instruction="황금 사막(마을 남동쪽)의 몬스터 8마리 처치",
     Story="사막 폐허에는 미러의 탑으로 가는 열쇠의 조각이 묻혀 있다. 모래 폭풍 속 괴물들이 열쇠를 지키고 있다."},
    {Id="deadmarsh-shrine",Name="20 · 죽음의 늪 사당",Goal=8,Zone="deadmarsh",Event="KILL",
     Instruction="죽음의 늪(동남쪽 가장 먼 곳)의 몬스터 8마리 처치",
     Story="사당의 제단에는 렌스의 이름이 가장 깊이 새겨져 있다. 렌스는 이곳에서 무언가를 팔았다. 늪은 그 대가를 아직 기억한다."},
    {Id="citadel-outer",Name="21 · 불타는 성채 외곽",Goal=10,Zone="citadel",Event="KILL",
     Instruction="불타는 성채(동쪽 끝)의 몬스터 10마리 처치",
     Story="성채는 빛의 군주의 선전이 만든 이름뿐인 전쟁터다. 불길 속 병사들은 누구와 싸우는지 모른다. 외곽을 뚫어야 옥좌 앞에 설 수 있다."},
    {Id="citadel-throne",Name="22 · 옥좌 앞의 침묵",Goal=12,Zone="citadel",Event="KILL",
     Instruction="불타는 성채 안쪽의 몬스터 12마리 처치",
     Story="옥좌는 비어 있다. 빅브라더는 처음부터 이곳에 없었다. 미러의 탑으로 가는 마지막 길이 열린다. (엔딩은 다음 장에서 이어진다.)"},
  },
  -- [세계관 설정 · 1984풍] 빛의 군주 빅브라더는 전쟁을 정치 도구로 쓰고, 마법사 미러가 만든 가상의 숲 마력숲에 불편한 기사단을 봉인한다.
  StoryBible = {
    Order={Name="렌스기사단",Members={
      {Id="lens",Name="렌스",Role="단장"},
      {Id="kain",Name="카인",Role="돌격대장 (플레이어)"},
      {Id="mina",Name="미나",Role="군수대장"},
      {Id="nick",Name="닉",Role="보병대장"},
    }},
    Factions={
      {Id="light",Name="빛의 군주 빅브라더",Role="전쟁을 통치 수단으로 삼는 지배자. 진실과 기록을 통제한다."},
      {Id="dark",Name="어둠의 군주 에레보스",Role="빅브라더와 전쟁 중인 상대 세력의 군주. 이름 설정은 제작자 임의 지정."},
      {Id="mage",Name="마법사 미러",Role="빅브라더의 마법사. 가상의 숲 마력숲을 만들어 기사단을 봉인한다."},
    },
    Forest="마력숲은 실재하지 않는 가상의 숲, 미러가 만든 기억의 감옥이다. 숲은 사람의 이름을 먹고 가장 두려워한 것으로 몸을 바꾼다. 주민 NPC는 정체성을 잊고 살아가며, 렌스기사단 이전에도 많은 기사단이 봉인됐다.",
  },
  -- [1부 구성] 지역 4개 + 엔딩 없는 메인 스토리. 2부 이후 지역은 이름만 예약한다.
  -- 상태 Open만 현재 플레이 가능하고 나머지는 지역 맵·몬스터·퀘스트 구현 전까지 잠금이다.
  Regions = {
    {Id="meadow",Name="초원 마을 (튜토리얼)",Part=1,Status="Open",Tutorial=true,Story="조작과 전투를 익히는 튜토리얼 지역. 카인이 눈을 뜬 곳. 정체성을 잊은 마을 사람들과 늑대 우두머리의 위협."},
    {Id="worldtree",Name="세계수 숲",Part=1,Status="Planned",UnlockMainStage=7,Story="백송 기사단의 숲. 이름이 지워진 깃발들과 저주에 변한 짐승의 울음. 닉이 가장 먼저 괴물이 된 곳이다."},
    {Id="volcano",Name="불꽃 화산 협곡",Part=1,Status="Planned",UnlockMainStage=10,Story="홍염 기사단의 협곡. 혼자 울리는 모루와 용암 속에 갇힌 대장장이. 렌스와 미나의 표식이 이곳까지 이어진다."},
    {Id="oasis",Name="오아시스 지하",Part=1,Status="Planned",UnlockMainStage=11,Story="모래서약 기사단의 오아시스. 물에 비친 얼굴이 이름을 묻는다. 미나의 장부에서 전쟁의 진실이 드러난다."},
    {Id="swamp",Name="안개 늪지",Part=1,Status="Open",Story="걸어서 이어진 대륙 동쪽의 늪. 고블린 무리와 독두꺼비, 늪 원혼 거미가 길을 막고, 안개 골렘이 늪의 중심을 지킨다."},
    {Id="citadel",Name="불타는 성채",Part=1,Status="Open",Story="대륙 끝의 불타는 성채. 악마와 해골 오크 병사가 지키고, 늑대인간 족장이 성채 군주로 군림한다. 희귀 재료의 최고 산지."},
    {Id="windcliff",Name="바람 절벽",Part=1,Status="Open",Story="서쪽 해안의 절벽 지대. 약탈 고블린과 늑대가 길목을 노리고, 오크 군단장이 요새를 차지했다."},
    {Id="highland",Name="북부 고원",Part=1,Status="Open",Story="마을 북쪽의 거친 고원. 설인과 늑대인간이 어슬렁거리고 고원의 왕이 군림한다."},
    {Id="canyon",Name="고대 협곡",Part=1,Status="Open",Story="붉은 사암 협곡. 해골 오크와 암살자, 랩터가 길을 막고 대족장이 제단을 지킨다."},
    {Id="chaos",Name="혼돈의 대지",Part=1,Status="Open",Story="균열이 갈라진 검은 평원. 악마와 서리 마귀가 들끓는 위험 지대."},
    {Id="wetland",Name="남부 습원",Part=1,Status="Open",Story="마을 남쪽의 질척한 습지. 독두꺼비와 고블린, 거미가 많고 재료가 풍부하다."},
    {Id="desert",Name="황금 사막",Part=1,Status="Open",Story="남쪽의 끝없는 모래 바다. 독거미와 랩터, 암살자가 사냥한다."},
    {Id="deadmarsh",Name="죽음의 늪",Part=1,Status="Open",Story="남동쪽 끝의 썩은 늪. 주술전사와 악마, 죽은 늪 거미가 산다."},
    {Id="mist-swamp",Name="안개 늪",Part=2,Status="Reserved"},
    {Id="frost-plateau",Name="서리 고원",Part=2,Status="Reserved"},
    {Id="sunken-capital",Name="잠긴 왕도",Part=2,Status="Reserved"},
    {Id="star-lake",Name="별빛 호수",Part=2,Status="Reserved"},
    {Id="dragon-ridge",Name="용의 등뼈 산맥",Part=2,Status="Reserved"},
    {Id="abyss-gate",Name="심연의 문",Part=2,Status="Reserved"},
  },
  -- [1부 메인 스토리 12장 · 기존 오프닝(카인, 렌스, 닉, 미나 / 미러의 배신) 이어서] 7~12장은 해당 지역 구현 후 열린다. 1부는 엔딩 없이 미나의 단서에서 끝난다.
  MainStoryPart1 = {
    {Stage=7,Name="07 · 이름 없는 깃발",Region="worldtree",Text="깃발마다 이름이 도려내져 있다. 마력숲은 사람을 죽이는 대신 이름과 기억을 먹는다. 카인은 이 숲이 무언가를 숨기고 있다고 느낀다."},
    {Stage=8,Name="08 · 울부짖는 동료",Region="worldtree",Text="저주받은 늑대인간이 길을 막는다. 가장 두려워한 것으로 몸이 변하는 저주. 그것은 함께 성문으로 달리던 보병대장 닉이다."},
    {Stage=9,Name="09 · 이름을 부르면",Region="worldtree",Text="이름을 부르면 저주가 누그러진다. 닉이 괴물의 몸으로 첫 동료가 된다. 단, 폭주를 누르려면 이름을 계속 불러 줘야 한다."},
    {Stage=10,Name="10 · 식지 않는 모루",Region="volcano",Text="홍염 기사단 야영지에서 혼자 울리는 모루를 발견한다. 단원들은 불타 죽은 것이 아니라 이름이 지워졌다. 렌스와 미나의 표식이 이어진다."},
    {Stage=11,Name="11 · 물에 비친 얼굴",Region="oasis",Text="오아시스 물에 비친 얼굴들이 이름을 묻는다. 대답하지 못한 단원은 모래 속 괴물이 됐다. 카인은 기록 조각을 하나씩 모은다."},
    {Stage=12,Name="12 · 미나의 장부",Region="oasis",Text="군수대장 미나의 장부에는 전쟁 내내 같은 숫자가 적혀 있다. 보급품은 줄지 않았다. 마지막 줄에 미러의 탑 위치와 '숲은 진짜가 아니다'라는 글이 있다. 이야기는 2부로 이어진다."},
  },
  -- [마력숲의 수수께끼] 메인 진행 단계(Stage)에 도달하면 세계 탭에 하나씩 공개한다.
  Mysteries = {
    {Stage=1,Text="주민들은 자기 이름을 기억하지 못한다. 매일 같은 일을 반복하면서도 이상하다고 느끼지 않는다."},
    {Stage=6,Text="우두머리 늑대의 목에 낡은 기사단 인장이 걸려 있었다. 이 숲의 짐승은 원래 짐승이 아니었을지도 모른다."},
    {Stage=7,Text="깃발의 이름이 모두 도려내져 있다. 숲은 이름을 먹는다."},
    {Stage=9,Text="이름을 부르면 저주가 누그러진다. 이름은 이 숲을 거스르는 열쇠다."},
    {Stage=10,Text="봉인된 기사단은 서로 다른 시대의 사람들이다. 숲에서는 시간이 흐르지 않는다."},
    {Stage=12,Text="전쟁은 끝낼 생각이 없었다. 마력숲은 미러가 만든 기억의 감옥이다. 미러의 탑은 하늘의 균열 너머에 있다."},
  },
  -- [파티 4인] 카인 + 닉(메인) + 이전 기사단 서브 후보 4명 중 2명 선택. 영입 기능은 구현 전까지 잠금이다.
  PartyMembers = {
    {Id="nick",Name="닉",Role="보병대장 · 늑대인간",Source="Main",UnlockMainStage=9,Story="렌스기사단의 동료. 봉인의 저주로 늑대 괴물이 됐다. 메인 1부에서 합류한다."},
    {Id="sera",Name="세라",Role="방패 기사",Source="Side",Story="렌스기사단 이전에 마력숲에 봉인된 기사단의 방패 기사. 서브 의뢰 '무너진 방패선'으로 영입."},
    {Id="rowen",Name="로웬",Role="추적 궁수",Source="Side",Story="렌스기사단 이전에 마력숲에 봉인된 기사단의 궁수. 서브 의뢰 '마지막 화살'로 영입."},
    {Id="doran",Name="도란",Role="대장장이 기사",Source="Side",Story="홍염 기사단 출신. 후보 4명 중 2명만 선택해 합류한다."},
    {Id="ifa",Name="이프",Role="치유사",Source="Side",Story="모래서약 기사단 출신. 후보 4명 중 2명만 선택해 합류한다."},
  },
  -- [이전 기사단 서브 스토리 · 설계 데이터] 아직 구현하지 않는다(지역 1개만 있음). 지역·퀘스트가 생기면 이 표로 연결한다.
  -- 서브 동료 후보 4명 중 최대 2명만 파티에 합류한다(카인 + 닉 + 후보 2명 = 4인).
  PreviousOrders = {
    {Id="azure-moon",Order="청월 기사단",Era="약 120년 전",Recruit="sera",Name="세라",Role="방패 기사",Region="meadow",UnlockMainStage=3,
     Hook="마을 우물 아래 봉인석에서 '나는 방패였다'는 속삭임이 들린다.",
     Chain={"우물의 이름 없는 방패 조사(마을 의뢰 02 '밤의 우물'과 연결)","봉인석 파편 3개 회수","깨어난 세라와 방패선 수호전"},
     Chronicle="청월 기사단은 '전쟁이 길어진다'고 진언하다 봉인됐다. 단장은 방패를 놓지 못해 속이 빈 갑옷 괴물로 변했고, 방패 기사 세라만 이름을 지켰다.",Monster="속 빈 갑옷",
     Choice="봉인을 풀고 세라를 깨우면 합류. 다시 봉인하면 우물이 안전해지는 대신 합류 불가."},
    {Id="white-pine",Order="백송 기사단",Era="약 80년 전",Recruit="rowen",Name="로웬",Role="추적 궁수",Region="worldtree",UnlockMainStage=7,
     Hook="세계수 숲 곳곳에 같은 방향을 가리키는 화살이 박혀 있다.",
     Chain={"화살 표식 추적 3곳","닉의 늑대 후각으로 숨은 야영지 발견(닉 합류 후 해금)","마지막 화살 시험: 움직이는 표적 사격 전투"},
     Chronicle="백송 기사단은 전쟁 비용을 숨긴 장부를 발견해 반역자로 지워졌다. 단원들은 숲과 융합해 뿌리 괴물이 됐고, 궁수 로웬은 화살 표식으로 단서를 남겼다.",Monster="뿌리 수호자",
     Choice="로웬은 닉의 저주를 알아본다. 합류하면 늑대 폭주 시 진정시키는 대사가 생긴다."},
    {Id="crimson-forge",Order="홍염 기사단",Era="약 50년 전",Recruit="doran",Name="도란",Role="대장장이 기사",Region="volcano",UnlockMainStage=10,
     Hook="식은 용암 속에서 계속 쇠 두드리는 소리가 난다.",
     Chain={"불타는 모루 찾기","용암 속 무기 3종 회수","화염 골렘이 된 동료 단원 진정전"},
     Chronicle="홍염 기사단은 병기 설계를 거부하다 '적과 내통'으로 조작되어 봉인됐다. 단원들은 용암 골렘이 됐고, 대장장이 도란은 모루를 놓지 않았다.",Monster="용암 골렘",
     Choice="합류하면 장비 제작 비용 감소·전설 장비 제작 해금(전설 장비 확장 때 연결)."},
    {Id="sand-oath",Order="모래서약 기사단",Era="약 20년 전",Recruit="ifa",Name="이프",Role="치유사",Region="oasis",UnlockMainStage=11,
     Hook="오아시스 물에 비친 얼굴이 '자기 이름이 뭐였지?'라고 묻는다.",
     Chain={"물에 비친 이름 3개 모으기","거대 벌레 소굴에서 환자 후송","이프의 이름을 되찾는 선택지 대화"},
     Chronicle="모래서약 기사단은 가장 늦게 봉인됐고 이름을 지우는 술식이 시작된 사례다. 단원들은 모래 속 괴물이 됐고 치유사 이프만 이름을 묻는다.",Monster="모래 벌레",
     Choice="합류하면 회복 스킬 연계. 이름을 돌려주면 이프가 미나의 단서에 대해 힌트를 준다."},
  },
  -- [몬스터 도감 · 위쳐식] 처치 횟수(Field)에 따라 1회·5회·15회에 항목이 열린다. 새 몬스터 모델이 들어오면 항목을 추가한다.
  Bestiary = {
    {Id="wolf",Name="늑대",Field="DexKillWolf",Habitat="초원 · 세계수 숲 · 화산 · 오아시스",
     Lore={"무리 지어 사냥하는 야생 늑대. 가까이 오면 물려고 달려든다.","공격 직전 몸을 낮춘다. 그 순간 막기나 회피로 연타를 끊을 수 있다.","봉인된 숲에서는 저주에 물든 개체가 늘어난다. 사람이었던 흔적이 목걸이에 남아 있다."}},
    {Id="bat",Name="황혼 박쥐",Field="DexKillBat",Habitat="초원 가장자리 · 화산 · 오아시스",
     Lore={"밤에 활동하는 박쥐. 빠르게 스치며 물고 간다.","정면으로 달려들 때 짧은 예고음이 난다. 옆으로 회피하면 쉽게 피한다.","미러의 마력이 퍼진 곳에서만 보라빛으로 변한다. 이 숲이 거짓이라는 첫 단서다."}},
    {Id="alpha",Name="우두머리 늑대",Field="DexKillAlpha",Habitat="초원 서쪽 · 세계수 숲(저주받은 늑대인간)",
     Lore={"무리를 이끄는 거대한 늑대. 연타 공격은 막기 타이밍으로 끊는다.","일정 체력 이하에서는 더 자주 달려든다. 회피 연속 단계로 거리를 벌려라.","숲 안쪽의 큰 늑대는 보병대장 닉이 저주로 변한 모습이다. 쓰러뜨려 저주를 눌러야 한다."}},
  },
  -- [현상금 게시판 · 위쳐식 몬스터 계약] 단서 2곳을 조사한 뒤 정예 몬스터를 처치하고 보상 방식을 선택한다.
  -- Offset은 지역 중심 기준 좌표. Enemy는 임시 메시(늑대/박쥐)이며 새 몬스터 확보 시 교체한다.
  Bounties = {
    {Id="moss-fang",Region="worldtree",Name="01 · 이끼 송곳니",Enemy="wolf",EnemyName="이끼 송곳니",EnemyOffset={-120,-100},Height=5.2,
     Summary="숲에서 사냥꾼 셋이 돌아오지 않았다. 흔적을 따라 사냥꾼들을 덮친 정예 늑대를 쓰러뜨려라.",
     ClueOffsets={{-60,60},{-95,-30}},Clues={"부러진 활과 늑대 발톱 자국. 사냥꾼은 도망치지 못했다.","나무에 새겨진 표식. 사냥꾼 중 한 명은 이전 기사단 출신이었다."},
     Choices={{Label="유품을 가족에게 전한다",Outcome="사냥꾼의 가족이 눈물로 감사했다.",Coins=20,Wood=6},
       {Label="증거를 마을 경비대에 넘긴다",Outcome="경비대가 포상금을 지급했다.",Coins=34,Wood=0}}},
    {Id="whisper-roots",Region="worldtree",Name="02 · 속삭이는 뿌리",Enemy="bat",EnemyName="뿌리 박쥐",EnemyOffset={110,110},Height=4.4,
     Summary="세계수 뿌리 근처에서 이름을 부르는 속삭임이 들린다. 속삭임의 근원인 박쥐를 처치하라.",
     ClueOffsets={{70,-20},{40,90}},Clues={"뿌리 틈에서 누군가의 이름이 낮게 속삭인다. 지워진 기사단원의 이름이다.","박쥐 둥지에서 낡은 기사단 문장이 나왔다."},
     Choices={{Label="속삭이는 이름을 기록한다",Outcome="지워진 이름이 연대기에 남았다.",Coins=18,Wood=8},
       {Label="뿌리를 태워 속삭임을 끊는다",Outcome="속삭임은 멎었지만 이름은 영영 사라졌다.",Coins=36,Wood=0}}},
    {Id="ash-swarm",Region="volcano",Name="03 · 재의 박쥐 떼",Enemy="bat",EnemyName="재의 박쥐",EnemyOffset={-100,100},Height=4.6,
     Summary="화산 협곡 야영지 터를 박쥐 떼가 점령했다. 우두머리 박쥐를 처치해 길을 열어라.",
     ClueOffsets={{-50,-70},{60,70}},Clues={"재 속에 파묻힌 단원의 장갑. 기사단 보급품이 약탈됐다.","검게 탄 둥지. 박쥐는 용암의 열기에 이끌렸다."},
     Choices={{Label="보급품을 회수해 야영지에 돌려둔다",Outcome="야영지 터에 쓸 만한 물자가 남았다.",Coins=24,Stone=8},
       {Label="우두머리의 날개를 전리품으로 챙긴다",Outcome="좋은 값에 팔렸다.",Coins=44,Stone=0}}},
    {Id="red-beast",Region="volcano",Name="04 · 붉은 짐승",Enemy="wolf",EnemyName="붉은 짐승",EnemyOffset={110,-80},Height=5.6,
     Summary="용암 옆에서 불타는 늑대가 순례자를 습격한다. 위험한 짐승을 처치하라.",
     ClueOffsets={{30,-110},{-80,50}},Clues={"불에 그을린 순례자의 지팡이. 짐승은 용암 근처에서만 움직인다.","늑대의 털에서 마력의 재가 떨어진다. 미러의 술식이 닿은 흔적이다."},
     Choices={{Label="순례자를 안전한 길로 인도한다",Outcome="순례자가 감사의 약초를 건넸다.",Coins=28,Stone=6},
       {Label="짐승의 심장석을 채취한다",Outcome="뜨거운 심장석이 제작 재료가 됐다.",Coins=46,Stone=0}}},
    {Id="sand-wail",Region="oasis",Name="05 · 모래의 곡소리",Enemy="bat",EnemyName="모래 박쥐",EnemyOffset={-110,-90},Height=4.8,
     Summary="오아시스 지하에서 밤마다 곡소리가 난다. 곡소리의 근원을 추적해 처치하라.",
     ClueOffsets={{-60,80},{70,-40}},Clues={"물가에 신발 한 켤레. 이름이 지워진 채 놓여 있다.","모래에 남은 날개 자국이 지하 굴로 이어진다."},
     Choices={{Label="신발의 주인을 위해 물가에 묻는다",Outcome="곡소리가 한결 잦아들었다.",Coins=30,Stone=6},
       {Label="신발을 증거로 챙긴다",Outcome="모래서약 기사단의 마지막 증거가 됐다.",Coins=50,Stone=0}}},
    {Id="deep-hunter",Region="oasis",Name="06 · 깊은 곳의 사냥꾼",Enemy="wolf",EnemyName="모래 사냥꾼",EnemyOffset={120,100},Height=5.8,
     Summary="오아시스 깊은 곳을 지키는 거대한 짐승이 보급대를 막고 있다. 쓰러뜨려 길을 열어라.",
     ClueOffsets={{0,-100},{-30,40}},Clues={"짓밟힌 천막과 보급 상자. 미나의 보급 표식이 남아 있다.","짐승의 목에 낡은 기사단 목걸이가 걸려 있다."},
     Choices={{Label="보급 상자를 열어 필요한 만큼만 가져간다",Outcome="미나의 방식 그대로 공정하게 나눴다.",Coins=34,Stone=8},
       {Label="상자를 모두 가져간다",Outcome="큰 이득을 얻었다.",Coins=56,Stone=0}}},
  },
  -- [기사단 야영지] Kenney CC0 소품(레지스트리 kenneyMiniForestCamp)의 Roblox Model 자산 ID. 업그레이드 비용·효과는 서버가 계산한다.
  CampAssets = {tent=138107993064718,flag=130533309973210,fence=114116639095318,platform=122683229132564,plant=97901069313770,rocks=139122219687710,stones=137109771506109,ladder=119331611772063,target=138101094037840,bow=124501344249201,treeHigh=96566876504132,dirt=103949521884200},
  CampUpgrades = {
    {Name="모닥불 복구",Wood=10,Stone=5,Coins=0,Desc="휴식으로 체력과 기력을 회복할 수 있어."},
    {Name="제작대 설치",Wood=20,Stone=15,Coins=30,Desc="휴식할 때 숲의 회복약을 얻을 수 있어(5분에 1개)."},
    {Name="숙소 건설",Wood=40,Stone=30,Coins=80,Desc="휴식할 때 기력 영약도 얻는다(5분에 1개)."},
  },
  -- [초원 마을 의뢰] 주민 진술 1개 · 현장 단서 1개 · 실전 전투 1회.
  -- 기존 저장 키·선택별 보상은 유지하고, 이전 조사 기록 비트는 마이그레이션 호환한다.
  VillageContracts = {
    {Id="missing-medicines",Name="01 · 사라진 약초 꾸러미",Issuer="촌장 나린",
     Summary="사라진 약초 꾸러미를 찾으러 숲길에 간 주민이 우두머리 늑대에게 쫓겼다. 늑대 보스를 쓰러뜨리고 약초를 되찾아.",
     Witness=1,WitnessName="약초상 미라",Enemy="wolf",EnemyName="우두머리 늑대",EnemySite={-321,-193},
     Clues={"약초상 미라: 약초는 열병에 걸린 아이에게 전하려던 거야."},
     Sites={{-41,-128}},
     Scenes={"뜯긴 약초 포대 옆에 작은 발자국과 늑대 발톱 자국이 함께 남았다."},
     Choices={{Label="아이를 돕고 소문을 바로잡는다",Outcome="마을은 숨겨진 사정을 알게 됐고 약초상과 가족을 도왔다.",Reward=8},
       {Label="절도 사실을 경비대에 신고한다",Outcome="약초는 회수됐지만 아이의 치료는 늦어졌다.",Reward=14}}},
    {Id="well-at-night",Name="02 · 밤의 우물",Issuer="촌장 나린",
     Summary="밤마다 우물 근처에 이상한 흔적이 남아. 우물을 조사하고 마을 동쪽 외곽의 황혼 박쥐를 물리쳐.",
     Witness=3,WitnessName="경비병 아린",Enemy="bat",EnemyName="황혼 박쥐",EnemySite={300,-212},
     Clues={"경비병 아린: 밤마다 우물 쪽에서 박쥐 소리가 들려. 동쪽 숲을 확인해."},
     Sites={{-24,-174}},
     Scenes={"우물 아래 오래된 명패와 깨진 봉인석이 남아 있다. 원혼이 이곳에 묶여 있었어."},
     Choices={{Label="봉인을 풀고 영혼을 안식시킨다",Outcome="우물의 저주가 풀렸고 주민들이 다시 물을 길을 수 있게 됐다.",Reward=10},
       {Label="우물을 다시 봉인한다",Outcome="원혼의 위협은 잠잠해졌지만 우물은 한동안 사용할 수 없게 됐다.",Reward=16}}},
    {Id="lost-wagon",Name="03 · 보급 수레 습격 조사",Issuer="촌장 나린",
     Summary="보급 수레가 습격당했어. 약탈 흔적을 조사하고 마을 서쪽 외곽의 초원 늑대를 처치해 길을 확보해.",
     Witness=2,WitnessName="추적자 라온",Enemy="wolf",EnemyName="초원 늑대",EnemySite={-299,-233},
     Clues={"추적자 라온: 수레 바퀴 자국 옆에 도적의 급한 발자국이 남아 있어."},
     Sites={{57,-207}},
     Scenes={"부서진 수레 바퀴와 도적이 떨어뜨린 도적단 표식이 발견됐다."},
     Choices={{Label="되찾은 식량을 주민에게 돌려준다",Outcome="빼앗겼던 식량이 가족에게 돌아가 마을의 굶주림을 막았다.",Reward=11},
       {Label="보급품을 경비대에 인계한다",Outcome="도적단 수사의 증거를 확보했지만 식량 분배는 늦어졌다.",Reward=17}}},
  },
  -- [동료 의뢰] 연구원 통신으로 받는 선택 의뢰. 메인 진행·경제 보상과 독립한다.
  CompanionRequests = {
    {Id="field-observation",Name="동료 조사원 · 생태 관찰",UnlockMainStage=2,Event="INSPECT",Goal=2,
     Instruction="초원 동물 2회 조사",Message="구조대가 돌아갈 길을 찾도록 초원 생태를 더 관찰해 줘."},
    {Id="supply-support",Name="동료 보급원 · 출정 준비",UnlockMainStage=3,Event="WOOD",Goal=3,
     Instruction="나무 자원 3회 채집",Message="다음 조사에 쓸 물자를 준비하고 있어. 채집 기록을 보내 줘."},
    {Id="guard-training",Name="동료 경비원 · 방어 훈련",UnlockMainStage=4,Event="PARRY",Goal=1,
     Instruction="몬스터 공격을 타이밍 맞춰 1회 막기",Message="연속 공격이 오면 막기 시작 순간을 노려 봐. 성공하면 상대의 빈틈이 생겨."},
    {Id="return-route",Name="동료 조사원 · 귀환로 확보",UnlockMainStage=5,Event="KILL",Goal=1,
     Instruction="초원 또는 숲에서 몬스터 1마리 처치",Message="세계수 조사 기록과 함께 안전한 귀환 경로도 남기자."},
    {Id="dawn-trace",Name="동료 조사원 · 새벽의 흔적",UnlockMainStage=6,Event="DAWN_TRACE",Goal=1,
     Instruction="새벽에 숲 가장자리 조사",Message="새벽에만 보이는 마력 흔적을 기록해 줘. 메인 탐사는 기다리지 않아도 돼."},
  },
  StoryRecords = {
    {Title="기사단 연대기 1 · 성문 앞의 네 명",
     Text="렌스 단장, 카인 돌격대장, 미나 군수대장, 닉 보병대장. 렌스기사단은 빛의 군주 빅브라더의 명령으로 어둠의 군주 에레보스의 성문 앞까지 진격했다."},
    {Title="기사단 연대기 2 · 끝나지 않는 전쟁",
     Text="빅브라더는 이길 수 있는 전쟁을 끝내지 않았다. 전쟁이 계속되어야 백성은 그를 따르고 비판은 반역이 되기 때문이다."},
    {Title="기사단 연대기 3 · 지워진 이름들",
     Text="마법사 미러가 만든 가상의 숲 마력숲. 이곳에 봉인된 이들은 자기 이름과 과거를 잊고, 이전의 수많은 기사단도 같은 운명을 겪었다."},
  },
  -- [마력숲 7개 숙련도] 캐릭터 레벨 없이 기존 게임 행동의 누적 숙련도만 기록한다.
  -- 미구현 생산 활동은 실제 성공 이벤트 전에는 점수를 생성하지 않는다.
  Proficiencies = {
    {Key="CombatProficiency",Name="전투",Source="실제 전투"},
    {Key="CookingProficiency",Name="요리",Source="음식 조리"},
    {Key="CraftingProficiency",Name="제작",Source="장비 제작·강화"},
    {Key="GatheringProficiency",Name="채집",Source="실제 자원 채집"},
    {Key="BuildingProficiency",Name="건축",Source="시설 설치"},
    {Key="HuntingProficiency",Name="사냥",Source="야생동물 사냥"},
    {Key="AlchemyProficiency",Name="연금술",Source="물약 조합"},
  },
  -- [장비·아이템] 위쳐식 장비 슬롯·제작법. 실제 능력치는 서버에서만 계산한다.
  -- 기존 몬스터 보상과 무기 강화 수치는 유지하며 이 카탈로그는 새 선택 보너스만 제공한다.
  MeadowEquipment = {
    {Id="wanderer_blade",Rarity="Common",Name="방랑자의 검",Slot="Weapon",ModelKey="gear_sword_01",Category="무기",Attack=0,Defense=0,Icon=2,Starter=true,Desc="기본 검. 기존 전투 공격력은 그대로 유지돼."},
    {Id="hunter_blade",Rarity="Uncommon",Name="사냥꾼 장검",Slot="Weapon",ModelKey="gear_sword_02",Category="무기",Attack=4,Defense=0,Icon=2,Wood=8,Stone=5,Coins=20,Desc="숲의 사냥꾼이 사용하는 단련 장검."},
    {Id="runic_blade",Rarity="Rare",Need=60,Name="룬 장검",Slot="Weapon",ModelKey="gear_sword_03",Category="무기",Attack=9,Defense=0,Icon=2,Wood=16,Stone=12,Coins=75,Desc="마력 문양이 새겨진 고급 검."},
    {Id="forest_blade",Rarity="Epic",Need=200,Name="숲 수호자의 검",Slot="Weapon",ModelKey="gear_sword_04",Category="무기",Attack=15,Defense=0,Icon=2,Wood=30,Stone=24,Coins=150,Desc="숙련된 수호자를 위한 주 무기."},
    {Id="travel_armor",Rarity="Common",Name="여행자 조끼",Slot="Chest",Category="갑옷",Attack=0,Defense=0,Icon=3,Starter=true,Desc="기본 방어구."},
    {Id="hunter_armor",Rarity="Uncommon",Name="사냥꾼 갑옷",Slot="Chest",Category="갑옷",Attack=0,Defense=3,Icon=3,Wood=9,Stone=6,Coins=15,Desc="가죽을 겹쳐 방어력을 높인 갑옷."},
    {Id="guardian_armor",Rarity="Rare",Need=60,Name="수호자 흉갑",Slot="Chest",Category="갑옷",Attack=0,Defense=6,Icon=3,Wood=18,Stone=16,Coins=70,Desc="묵직한 흉갑. 피격 피해를 줄여."},
    {Id="travel_gloves",Rarity="Common",Name="여행 장갑",Slot="Hands",Category="갑옷",Attack=0,Defense=0,Icon=3,Starter=true,Desc="기본 장갑."},
    {Id="hunter_gloves",Rarity="Uncommon",Name="강화 장갑",Slot="Hands",Category="갑옷",Attack=0,Defense=2,Icon=3,Wood=6,Stone=4,Coins=12,Desc="손을 보호하는 장갑."},
    {Id="travel_pants",Rarity="Common",Name="여행 바지",Slot="Legs",Category="갑옷",Attack=0,Defense=0,Icon=3,Starter=true,Desc="기본 바지."},
    {Id="guardian_pants",Rarity="Uncommon",Name="수호자 바지",Slot="Legs",Category="갑옷",Attack=0,Defense=3,Icon=3,Wood=10,Stone=8,Coins=20,Desc="두터운 하체 방어구."},
    {Id="travel_boots",Rarity="Common",Name="여행 장화",Slot="Feet",Category="갑옷",Attack=0,Defense=0,Icon=3,Starter=true,Desc="기본 장화."},
    {Id="guardian_boots",Rarity="Uncommon",Name="수호자 장화",Slot="Feet",Category="갑옷",Attack=0,Defense=2,Icon=3,Wood=8,Stone=7,Coins=18,Desc="발과 정강이를 보호하는 장화."},
    {Id="moon_amulet",Rarity="Rare",Need=40,Name="달빛 부적",Slot="Accessory",Category="장신구",Attack=2,Defense=1,Icon=6,Wood=12,Stone=12,Coins=50,Desc="공격과 방어를 조금씩 높이는 부적."},
    {Id="dew_dagger",Rarity="Uncommon",Need=40,Name="이슬 단검",Slot="Weapon",ModelKey="item_dagger",Category="무기",Attack=3,Defense=1,Icon=2,Wood=10,Stone=8,Coins=40,Desc="가볍고 빠른 숲의 단검."},
    {Id="thorn_axe",Rarity="Rare",Need=120,Name="가시 도끼",Slot="Weapon",ModelKey="item_axe_small",Category="무기",Attack=11,Defense=0,Icon=2,Wood=22,Stone=16,Coins=90,Desc="가시덤불을 엮어 벼린 묵직한 도끼."},
    {Id="worldtree_staff",Rarity="Epic",Need=300,Name="세계수 지팡이",Slot="Weapon",ModelKey="gear_relic_staff",Category="무기",Attack=14,Defense=1,Icon=2,Wood=30,Stone=28,Coins=160,Desc="세계수의 마력이 깃든 지팡이."},
    {Id="magma_greatsword",Rarity="Legendary",Need=700,Name="마그마 대검",Slot="Weapon",ModelKey="gear_sword_10",Category="무기",Attack=24,Defense=0,Icon=2,Wood=60,Stone=60,Coins=420,Desc="식지 않는 용암으로 단련한 전설의 대검."},
    {Id="moss_robe",Rarity="Uncommon",Need=40,Name="이끼 로브",Slot="Chest",Category="갑옷",Attack=0,Defense=4,Icon=2,Wood=12,Stone=8,Coins=30,Desc="이끼 섬유로 짠 가벼운 로브."},
    {Id="frost_leather",Rarity="Rare",Need=140,Name="서리 가죽 갑옷",Slot="Chest",Category="갑옷",Attack=0,Defense=8,Icon=2,Wood=24,Stone=20,Coins=95,Desc="서리늑대 가죽으로 만든 갑옷."},
    {Id="magma_plate",Rarity="Epic",Need=380,Name="용암 판금 갑옷",Slot="Chest",Category="갑옷",Attack=0,Defense=12,Icon=2,Wood=40,Stone=40,Coins=190,Desc="균열 사이로 열기가 새는 판금 갑옷."},
    {Id="worldtree_mail",Rarity="Legendary",Need=800,Name="세계수 갑주",Slot="Chest",Category="갑옷",Attack=1,Defense=18,Icon=2,Wood=60,Stone=60,Coins=380,Desc="세계수 잎사귀가 덮인 전설의 갑주."},
    {Id="guardian_gauntlet",Rarity="Rare",Need=100,Name="수호자 건틀릿",Slot="Hands",Category="갑옷",Attack=1,Defense=4,Icon=2,Wood=18,Stone=16,Coins=80,Desc="단단한 강철 건틀릿."},
    {Id="arcane_gloves",Rarity="Epic",Need=260,Name="비전 장갑",Slot="Hands",Category="갑옷",Attack=3,Defense=4,Icon=2,Wood=26,Stone=24,Coins=140,Desc="비전 마력이 손끝에 모이는 장갑."},
    {Id="hunter_greaves",Rarity="Uncommon",Need=30,Name="사냥꾼 바지",Slot="Legs",Category="갑옷",Attack=0,Defense=3,Icon=2,Wood=10,Stone=8,Coins=22,Desc="가죽 끈으로 보강한 사냥꾼 바지."},
    {Id="rune_greaves",Rarity="Epic",Need=280,Name="룬 각반",Slot="Legs",Category="갑옷",Attack=0,Defense=7,Icon=2,Wood=28,Stone=26,Coins=150,Desc="마력 문양이 흐르는 각반."},
    {Id="hunter_boots",Rarity="Uncommon",Need=30,Name="사냥꾼 장화",Slot="Feet",Category="갑옷",Attack=0,Defense=3,Icon=2,Wood=9,Stone=8,Coins=20,Desc="숲길에 알맞은 가죽 장화."},
    {Id="wind_boots",Rarity="Epic",Need=260,Name="바람 장화",Slot="Feet",Category="갑옷",Attack=0,Defense=5,Icon=2,Wood=26,Stone=22,Coins=140,Desc="날개 장식이 달린 가벼운 장화."},
    {Id="herb_bracelet",Rarity="Uncommon",Need=50,Name="약초 팔찌",Slot="Accessory",Category="장신구",Attack=1,Defense=2,Icon=2,Wood=10,Stone=10,Coins=35,Desc="약초를 엮어 만든 팔찌."},
    {Id="fang_necklace",Rarity="Uncommon",Need=70,Name="송곳니 목걸이",Slot="Accessory",Category="장신구",Attack=3,Defense=0,Icon=2,Wood=12,Stone=12,Coins=45,Desc="사냥한 늑대의 송곳니 목걸이."},
    {Id="worldtree_ring",Rarity="Epic",Need=320,Name="세계수 반지",Slot="Accessory",Category="장신구",Attack=4,Defense=4,Icon=2,Wood=30,Stone=30,Coins=170,Desc="세계수 가지로 만든 반지."},
    {Id="abyss_eye",Rarity="Legendary",Need=900,Name="심연의 눈",Slot="Accessory",Category="장신구",Attack=8,Defense=8,Icon=2,Wood=60,Stone=60,Coins=400,Desc="심연을 들여다보는 전설의 눈."},
    -- [활 · 오디세이식 원거리 계열] 등록된 CC0 활 모델(item_bow_wooden) 사용. 33번째부터는 MeadowGearOwned2 비트에 저장한다.
    {Id="hunter_bow",Rarity="Uncommon",Name="사냥꾼 활",Slot="Weapon",ModelKey="item_bow_wooden",Category="무기",Attack=4,Defense=0,Icon=2,Bow=true,Coins=30,Desc="가죽과 철로 보강한 사냥용 활. 멀리서 노려 쏘고, 거리에 따라 치명타가 터져."},
    {Id="wind_bow",Rarity="Rare",Need=60,Name="바람결 활",Slot="Weapon",ModelKey="item_bow_wooden",Category="무기",Attack=9,Defense=0,Icon=2,Bow=true,Coins=90,Desc="가볍고 빠른 장궁. 연사 속도가 빠르고 사거리가 길어."},
    {Id="worldtree_bow",Rarity="Epic",Need=220,Name="세계수 장궁",Slot="Weapon",ModelKey="item_bow_wooden",Category="무기",Attack=15,Defense=0,Icon=2,Bow=true,Coins=170,Desc="세계수 가지로 만든 장궁. 급소를 꿰뚫으면 큰 피해를 줘."},
    -- [실물 3D 무기 확장] CC0 승인 모델, 기존 35개 장비 인덱스·아이템 저장 비트 유지.
    {Id="iron_arming_sword",Rarity="Uncommon",Need=0,Name="철제 무장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_05",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 철제 무장검."},
    {Id="veteran_longsword",Rarity="Rare",Need=60,Name="베테랑 장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_06",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 베테랑 장검."},
    {Id="royal_gilded_sword",Rarity="Epic",Need=220,Name="왕실 금장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_07",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 왕실 금장검."},
    {Id="ancient_rune_sword",Rarity="Legendary",Need=700,Name="고대 룬 장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_08",ForgeOnly=true,Tint={210,191,232},Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Crystal=4,Magma=3,Desc="마력숲 대장간에서 제련·제작 가능한 고대 룬 장검."},
    {Id="mercenary_greatsword",Rarity="Uncommon",Need=0,Name="용병 대검",Slot="Weapon",Category="무기",WeaponFamily="Greatsword",ModelKey="gear_sword_11",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 용병 대검."},
    {Id="iron_greatblade",Rarity="Rare",Need=60,Name="철제 양손 대검",Slot="Weapon",Category="무기",WeaponFamily="Greatsword",ModelKey="gear_sword_12",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 철제 양손 대검."},
    {Id="guardian_greatblade",Rarity="Epic",Need=220,Name="수호자 거대검",Slot="Weapon",Category="무기",WeaponFamily="Greatsword",ModelKey="gear_relic_sword",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 수호자 거대검."},
    {Id="hunter_skinning_knife",Rarity="Uncommon",Need=0,Name="사냥용 가죽칼",Slot="Weapon",Category="무기",WeaponFamily="Dagger",ModelKey="gear_relic_dagger",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 사냥용 가죽칼."},
    {Id="shadow_assassin_dagger",Rarity="Rare",Need=60,Name="그림자 단검",Slot="Weapon",Category="무기",WeaponFamily="Dagger",ModelKey="item_dagger",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 그림자 단검."},
    {Id="moonlit_dagger",Rarity="Epic",Need=220,Name="달빛 의식단검",Slot="Weapon",Category="무기",WeaponFamily="Dagger",ModelKey="gear_relic_dagger",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 달빛 의식단검."},
    {Id="scout_hatchet",Rarity="Uncommon",Need=0,Name="정찰병 손도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="vxToolAxe",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 정찰병 손도끼."},
    {Id="woodsman_axe",Rarity="Uncommon",Need=0,Name="숲지기 도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="item_axe_small",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 숲지기 도끼."},
    {Id="iron_battleaxe",Rarity="Rare",Need=60,Name="철제 전투도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="item_axe_small",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 철제 전투도끼."},
    {Id="rune_reaver_axe",Rarity="Epic",Need=220,Name="룬 각인 도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="gear_relic_axe",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 룬 각인 도끼."},
    {Id="forge_hammer",Rarity="Uncommon",Need=0,Name="대장장이 전투망치",Slot="Weapon",Category="무기",WeaponFamily="Hammer",ModelKey="item_hammer_double",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 대장장이 전투망치."},
    {Id="steel_warhammer",Rarity="Rare",Need=60,Name="강철 전쟁망치",Slot="Weapon",Category="무기",WeaponFamily="Hammer",ModelKey="gear_relic_hammer",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 강철 전쟁망치."},
    {Id="thunder_maul",Rarity="Epic",Need=220,Name="천둥 철퇴",Slot="Weapon",Category="무기",WeaponFamily="Hammer",ModelKey="item_hammer_double",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 천둥 철퇴."},
    {Id="apprentice_staff",Rarity="Uncommon",Need=0,Name="수습 마도사 지팡이",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="item_staff",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 수습 마도사 지팡이."},
    {Id="grove_staff",Rarity="Rare",Need=60,Name="수풀 주술봉",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="gear_relic_staff",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 수풀 주술봉."},
    {Id="ember_staff",Rarity="Epic",Need=220,Name="잿불 마법봉",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="item_staff",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 잿불 마법봉."},
    {Id="crystal_staff",Rarity="Legendary",Need=700,Name="수정 마도봉",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="gear_relic_staff",ForgeOnly=true,Tint={210,191,232},Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Crystal=4,Magma=3,Desc="마력숲 대장간에서 제련·제작 가능한 수정 마도봉."},
    {Id="scout_shortbow",Rarity="Uncommon",Need=0,Name="정찰병 단궁",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="item_bow_wooden",ForgeOnly=true,Tint={180,195,175},Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Bow=true,Desc="마력숲 대장간에서 제련·제작 가능한 정찰병 단궁."},
    {Id="oak_recurve_bow",Rarity="Rare",Need=60,Name="참나무 곡궁",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="item_bow_wooden",ForgeOnly=true,Tint={170,200,225},Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Bow=true,Desc="마력숲 대장간에서 제련·제작 가능한 참나무 곡궁."},
    {Id="hunter_longbow",Rarity="Epic",Need=220,Name="명사수 장궁",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="item_bow_wooden",ForgeOnly=true,Tint={190,175,230},Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Bow=true,Desc="마력숲 대장간에서 제련·제작 가능한 명사수 장궁."},
    {Id="arcane_bow",Rarity="Legendary",Need=700,Name="비전 마력활",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="item_bow_wooden",ForgeOnly=true,Tint={210,191,232},Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Crystal=4,Magma=3,Bow=true,Desc="마력숲 대장간에서 제련·제작 가능한 비전 마력활."},
    {Id="forest_guard_shield",Rarity="Uncommon",Need=0,Name="숲 경비병 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="vxShieldA",ForgeOnly=true,Tint={180,195,175},Attack=0,Defense=2,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="마력숲 대장간에서 제련·제작 가능한 숲 경비병 방패."},
    {Id="knight_shield",Rarity="Rare",Need=60,Name="기사단 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="vxShieldB",ForgeOnly=true,Tint={170,200,225},Attack=0,Defense=3,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Crystal=1,Desc="마력숲 대장간에서 제련·제작 가능한 기사단 방패."},
    {Id="sun_shield",Rarity="Epic",Need=220,Name="금빛 수호 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="vxShieldC",ForgeOnly=true,Tint={190,175,230},Attack=0,Defense=4,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Crystal=2,Desc="마력숲 대장간에서 제련·제작 가능한 금빛 수호 방패."},
    {Id="dusk_shield",Rarity="Legendary",Need=700,Name="황혼의 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="vxShieldD",ForgeOnly=true,Tint={210,191,232},Attack=0,Defense=5,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Crystal=4,Magma=3,Desc="마력숲 대장간에서 제련·제작 가능한 황혼의 방패."},
    -- [바람 절벽 전용 장비] 65·66번째 장비는 세 번째 비트마스크(MeadowGearOwned3)에 저장한다.
    {Id="wind_feather_gloves",Rarity="Rare",Need=80,Name="깃털 장갑",Slot="Hands",Category="갑옷",Tint={170,215,240},Attack=1,Defense=3,Icon=3,Feather=4,Coins=110,Desc="바람 절벽의 깃털로 엮은 가벼운 장갑. 대장간 모루에서 제작해."},
    {Id="cliff_steel_shield",Rarity="Epic",Need=240,Name="절벽 강철 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="gear_relic_shield",ForgeOnly=true,Tint={150,190,215},Attack=0,Defense=5,Icon=2,Art=3,Feather=5,Crystal=2,Coins=200,Desc="바람 절벽의 깃털과 강철로 벼린 방패. 절벽 지역 재료가 필요해."},
    -- [망토 슬롯] 67번째부터 세 번째 비트마스크에 저장한다. 망토는 오프닝 망토 모델에 색(Tint)만 바꿔 입힌다.
    {Id="traveler_cape",Rarity="Uncommon",Need=0,Name="여행자 망토",Slot="Cape",Category="갑옷",Tint={86,110,78},Attack=0,Defense=1,Icon=3,Hide=2,Coins=30,Desc="숲 빛깔로 물들인 가벼운 망토."},
    {Id="wind_feather_cape",Rarity="Rare",Need=80,Name="바람 깃털 망토",Slot="Cape",Category="갑옷",Tint={170,215,240},Attack=1,Defense=2,Icon=3,Feather=4,Hide=2,Coins=110,Desc="바람 절벽의 깃털을 엮은 망토. 바람 절벽 재료가 필요해."},
    {Id="wraith_cape",Rarity="Epic",Need=260,Name="원혼 망토",Slot="Cape",Category="갑옷",Tint={110,200,190},Attack=2,Defense=3,Icon=3,Ectoplasm=4,Hide=3,Crystal=2,Coins=190,Desc="원혼의 잔재로 짠 망토. 안개 늪지와 죽음의 늪 재료가 필요해."},
    {Id="ember_cape",Rarity="Epic",Need=300,Name="화염 망토",Slot="Cape",Category="갑옷",Tint={210,90,50},Attack=3,Defense=2,Icon=3,Magma=4,Hide=3,Coins=200,Desc="식지 않는 화산석으로 물들인 망토."},
    {Id="dusk_cape",Rarity="Legendary",Need=700,Name="황혼의 망토",Slot="Cape",Category="갑옷",Tint={150,110,200},Attack=4,Defense=5,Icon=3,Crystal=5,Ectoplasm=4,Magma=3,Hide=4,Coins=450,Desc="세 지역의 재료로 완성한 전설 망토."},
    -- [신화 괴물 전리품 장비] 지룡·히드라·베헤모스·와이번·전설 크리처의 재료로 대장간에서 만든다.
    {Id="fafnir_edge",Rarity="Epic",Need=260,Name="파프니르의 비늘 대검",Slot="Weapon",Category="무기",WeaponFamily="Greatsword",ModelKey="item_sword_big",ForgeOnly=true,Tint={235,110,80},Attack=16,Defense=0,Icon=2,Art=5,Ingot=6,Leather=3,Claw=4,Crystal=2,Coins=170,Desc="탐욕의 지룡 파프니르의 발톱과 비늘로 벼린 대검."},
    {Id="hydra_fang_dagger",Rarity="Epic",Need=250,Name="히드라 독니 단검",Slot="Weapon",Category="무기",WeaponFamily="Dagger",ModelKey="item_dagger",ForgeOnly=true,Tint={110,230,140},Attack=15,Defense=0,Icon=2,Art=5,Ingot=5,Leather=3,Fang=5,Moonbloom=3,Coins=170,Desc="어미 히드라의 독니로 만든 단검."},
    {Id="behemoth_maul",Rarity="Epic",Need=270,Name="베헤모스 철퇴",Slot="Weapon",Category="무기",WeaponFamily="Hammer",ModelKey="gear_relic_hammer",ForgeOnly=true,Tint={235,200,110},Attack=16,Defense=0,Icon=2,Art=5,Ingot=7,Leather=3,Hide=5,Crystal=2,Coins=170,Desc="거신 베헤모스의 가죽과 뼈로 만든 철퇴."},
    {Id="wyvern_bow",Rarity="Epic",Need=260,Name="와이번 깃털활",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="item_bow_wooden",ForgeOnly=true,Tint={240,215,120},Attack=15,Defense=0,Icon=2,Art=5,Ingot=5,Leather=4,Feather=6,Crystal=2,Coins=170,Bow=true,Desc="사막 와이번의 깃털과 힘줄로 만든 활."},
    {Id="jotun_axe",Rarity="Epic",Need=250,Name="요툰의 서리 도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="gear_relic_axe",ForgeOnly=true,Tint={170,215,250},Attack=15,Defense=0,Icon=2,Art=5,Ingot=6,Leather=3,Hide=5,Crystal=3,Coins=170,Desc="눈보라 거인 요툰의 얼음 조각을 박은 도끼."},
    {Id="ifrit_staff",Rarity="Legendary",Need=700,Name="이프리트의 불꽃 지팡이",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="item_staff",ForgeOnly=true,Tint={255,120,50},Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Magma=6,Crystal=5,Coins=420,Desc="재의 이프리트의 불씨로 타오르는 지팡이."},
    {Id="arachne_blade",Rarity="Legendary",Need=700,Name="아라크네의 실검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_09",ForgeOnly=true,Tint={160,255,190},Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Fang=6,Crystal=5,Coins=420,Desc="뿌리 밑 아라크네의 실로 벼린 검."},
    {Id="fafnir_scale_mail",Rarity="Legendary",Need=720,Name="파프니르의 비늘 흉갑",Slot="Chest",Category="갑옷",Tint={235,110,80},Attack=0,Defense=16,Icon=3,Leather=6,Claw=5,Magma=4,Steel=2,Coins=450,Desc="지룡의 비늘을 겹겹이 이은 전설 흉갑."},
    {Id="hydra_hide_gloves",Rarity="Epic",Need=250,Name="히드라 가죽 장갑",Slot="Hands",Category="갑옷",Tint={110,230,140},Attack=1,Defense=5,Icon=3,Leather=4,Fang=4,Coins=190,Desc="독을 머금은 히드라 가죽 장갑."},
    {Id="behemoth_greaves",Rarity="Epic",Need=260,Name="베헤모스 각반",Slot="Legs",Category="갑옷",Tint={235,200,110},Attack=0,Defense=8,Icon=3,Leather=5,Ingot=4,Hide=4,Coins=190,Desc="거신의 가죽으로 만든 묵직한 각반."},
    {Id="wyvern_boots",Rarity="Epic",Need=250,Name="와이번 장화",Slot="Feet",Category="갑옷",Tint={240,215,120},Attack=0,Defense=6,Icon=3,Leather=4,Feather=5,Coins=190,Desc="와이번 깃털을 덧댄 가벼운 장화."},
    {Id="jotun_cape",Rarity="Epic",Need=240,Name="요툰의 서리 망토",Slot="Cape",Category="갑옷",Tint={170,215,250},Attack=2,Defense=3,Icon=3,Leather=4,Hide=4,Crystal=2,Coins=190,Desc="거인의 털가죽으로 지은 서리 망토."},
    {Id="arachne_silk_cape",Rarity="Legendary",Need=700,Name="아라크네 비단 망토",Slot="Cape",Category="갑옷",Tint={160,255,190},Attack=4,Defense=5,Icon=3,Leather=3,Fang=5,Crystal=5,Ectoplasm=3,Coins=450,Desc="거미 여왕의 비단으로 짠 전설 망토."},
    {Id="behemoth_bulwark",Rarity="Legendary",Need=720,Name="베헤모스의 성벽 방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="vxShieldD",ForgeOnly=true,Tint={235,200,110},Attack=0,Defense=9,Icon=3,Ingot=9,Leather=4,Hide=6,Crystal=4,Coins=450,Desc="거신의 등뼈로 만든 거대한 방패."},
    -- [장비 종류 보강] 기존 85종 저장 인덱스와 보상·능력치 그대로 보존. 신규 25종은 뒤에만 추가한다.
    {Id="forest_sword_01",Rarity="Uncommon",Need=0,Name="숲 경계검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_01",GearSourceKey=true,ForgeOnly=true,Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_02",Rarity="Uncommon",Need=0,Name="청동 호위검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_02",GearSourceKey=true,ForgeOnly=true,Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_03",Rarity="Uncommon",Need=0,Name="기사단 예식검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_03",GearSourceKey=true,ForgeOnly=true,Attack=4,Defense=0,Icon=2,Art=2,Ingot=2,Leather=1,Coins=30,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_04",Rarity="Rare",Need=60,Name="그림자 추적검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_04",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_05",Rarity="Rare",Need=60,Name="은빛 수호검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_05",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_06",Rarity="Rare",Need=60,Name="서리빛 검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_06",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_07",Rarity="Epic",Need=220,Name="붉은 잿불검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_07",GearSourceKey=true,ForgeOnly=true,Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_08",Rarity="Epic",Need=220,Name="달빛 사냥검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_08",GearSourceKey=true,ForgeOnly=true,Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_09",Rarity="Epic",Need=220,Name="고대 수호검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_09",GearSourceKey=true,ForgeOnly=true,Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_10",Rarity="Legendary",Need=700,Name="마력 서약검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_10",GearSourceKey=true,ForgeOnly=true,Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_11",Rarity="Legendary",Need=700,Name="황혼 진혼검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_11",GearSourceKey=true,ForgeOnly=true,Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_sword_12",Rarity="Legendary",Need=700,Name="세계수 의장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_sword_12",GearSourceKey=true,ForgeOnly=true,Attack=24,Defense=0,Icon=2,Art=18,Ingot=9,Leather=4,Coins=420,Desc="CC0 독립 원본 메시 검. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_sword",Rarity="Rare",Need=60,Name="유적 무장검",Slot="Weapon",Category="무기",WeaponFamily="Sword",ModelKey="gear_relic_sword",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_axe",Rarity="Rare",Need=60,Name="유적 전투도끼",Slot="Weapon",Category="무기",WeaponFamily="Axe",ModelKey="gear_relic_axe",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_hammer",Rarity="Rare",Need=60,Name="유적 전쟁망치",Slot="Weapon",Category="무기",WeaponFamily="Hammer",ModelKey="gear_relic_hammer",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_staff",Rarity="Epic",Need=220,Name="고대 마도 지팡이",Slot="Weapon",Category="무기",WeaponFamily="Staff",ModelKey="gear_relic_staff",GearSourceKey=true,ForgeOnly=true,Attack=15,Defense=0,Icon=2,Art=4,Ingot=6,Leather=3,Coins=170,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_shield",Rarity="Rare",Need=60,Name="유적의 수호방패",Slot="Shield",Category="방패",WeaponFamily="Shield",ModelKey="gear_relic_shield",GearSourceKey=true,ForgeOnly=true,Attack=0,Defense=4,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_dagger",Rarity="Rare",Need=60,Name="폐허의 날붙이",Slot="Weapon",Category="무기",WeaponFamily="Dagger",ModelKey="gear_relic_dagger",GearSourceKey=true,ForgeOnly=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_crossbow",Rarity="Rare",Need=60,Name="정찰용 석궁",Slot="Weapon",Category="무기",WeaponFamily="Bow",ModelKey="gear_relic_crossbow",GearSourceKey=true,ForgeOnly=true,Bow=true,Attack=9,Defense=0,Icon=2,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_relic_armor",Rarity="Rare",Need=60,Name="유적 방랑자 흉갑",Slot="Chest",Category="갑옷",ModelKey="gear_relic_armor",GearSourceKey=true,ForgeOnly=true,Attack=0,Defense=6,Icon=3,Art=3,Ingot=4,Leather=2,Coins=90,Desc="CC0 실물 원본 장비. 등록 확인 후 제작할 수 있어."},
    {Id="forest_ranger_jacket",Rarity="Uncommon",Need=0,Name="숲 정찰병 갑옷",Slot="Chest",Category="갑옷",ModelKey="item_armor_leather",Tint={150,117,74},ForgeOnly=true,Attack=0,Defense=3,Icon=3,Art=2,Ingot=2,Leather=1,Coins=30,Desc="기존 등록된 고유 갑옷 원본 모델로 제작하는 흉갑."},
    {Id="forest_steel_cuirass",Rarity="Rare",Need=60,Name="철벽 기사 흉갑",Slot="Chest",Category="갑옷",ModelKey="item_armor_metal2",Tint={155,174,190},ForgeOnly=true,Attack=0,Defense=6,Icon=3,Art=3,Ingot=4,Leather=2,Coins=90,Desc="기존 등록된 고유 갑옷 원본 모델로 제작하는 흉갑."},
    {Id="forest_dark_plate",Rarity="Epic",Need=220,Name="검은 기사 판금갑",Slot="Chest",Category="갑옷",ModelKey="item_armor_black",Tint={64,78,98},ForgeOnly=true,Attack=0,Defense=12,Icon=3,Art=4,Ingot=6,Leather=3,Coins=170,Desc="기존 등록된 고유 갑옷 원본 모델로 제작하는 흉갑."},
    {Id="forest_sun_guard",Rarity="Legendary",Need=700,Name="태양 근위갑",Slot="Chest",Category="갑옷",ModelKey="item_armor_golden",Tint={218,178,79},ForgeOnly=true,Attack=0,Defense=18,Icon=3,Art=18,Ingot=9,Leather=4,Coins=420,Desc="기존 등록된 고유 갑옷 원본 모델로 제작하는 흉갑."},
    {Id="forest_chainmail",Rarity="Rare",Need=60,Name="은빛 사슬 흉갑",Slot="Chest",Category="갑옷",ModelKey="item_armor_metal",Tint={164,172,182},ForgeOnly=true,Attack=0,Defense=7,Icon=3,Art=3,Ingot=4,Leather=2,Coins=90,Desc="기존 등록된 고유 갑옷 원본 모델로 제작하는 흉갑."},
  },
  -- [회복 소모품] 한 번 제작하면 1개 소지, 사용 시 서버에서 1개 소비.
  MeadowConsumables = {
    {Id="herbal_tonic",Art=33,Name="숲의 회복약",Category="소모품",Icon=7,Wood=3,Stone=2,Coins=8,Heal=30,Desc="체력을 최대 30 회복해."},
    {Id="energy_tonic",Art=34,Name="기력 영약",Category="소모품",Icon=7,Wood=4,Stone=1,Coins=8,Stamina=35,Desc="기력을 최대 35 회복해."},
  },
  MeadowTalentSchools = {
    {Id="Martial",Name="검술",Category="무예",Max=5,Desc="습득 단계마다 공격 피해 +1, 연타 깊이 확장(1단 단순→5단 주변 적까지 베는 마무리)"},
    {Id="Signs",Name="표식",Category="마력",Desc="습득 단계마다 마력 탄환 피해 +2"},
    {Id="Defense",Name="방호",Category="방어",Desc="습득 단계마다 받는 피해 -1"},
    {Id="Agility",Name="회피",Category="기동",Max=5,Desc="찍은 점수만큼 회피가 연속 단계로 이어지고 5단은 적 배후 도약"},
  },
  -- [기술 점수 곡선] 점수가 쌓일수록 다음 점수 비용이 커진다(첫 점수 30, 이후 +10씩, 최대 14점).
  -- 누적 비용 5n²+25n. 트리 전체(검술3·표식3·방호3·회피5=14점)는 누적 숙련 1330, 보통 사냥 약 110마리 분량.
  TalentPointProgress = function(mastery)
    local m = math.max(0, mastery or 0)
    local earned = math.min(14, math.floor((-25 + math.sqrt(625 + 20 * m)) / 10))
    local spentCost = 5 * earned * earned + 25 * earned
    return earned, m - spentCost, earned >= 14 and 0 or (30 + 10 * earned)
  end,
  -- 기존 Level/XP는 저장 호환에만 남기고 신규 성장은 누적 숙련도로 기록.
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
    PuzzleChain = 0, Towers = 0, BaseHealth = 100, SocialBond = 0,
    SharedObjective = 0, RoundScore = 0, XP = 0, CombatProficiency = 0,
    CookingProficiency = 0, CraftingProficiency = 0, GatheringProficiency = 0,
    BuildingProficiency = 0, HuntingProficiency = 0, AlchemyProficiency = 0, Wood = 0,
    Stone = 0, WeaponTier = 0, Bosses = 0,
    RedLeaf = 0, Moonbloom = 0, Mushroom = 0, Ore = 0, Crystal = 0, Magma = 0,
    Hide = 0, Fang = 0, BatWing = 0, Claw = 0, Ectoplasm = 0, Ingot = 0, Leather = 0, Steel = 0, Meat = 0, Feather = 0, MeadowGuide = 0, ArmorTier = 0, SmithXp = 0, QLSmith = 0, QLSmithP = 0, QLSmith2 = 0, QLSmith2P = 0, QLSmith3 = 0, QLSmith3P = 0,
    -- [저장 마이그레이션] 옛 세이브에는 없는 신규 장비·소모품·스킬 숫자 필드만 보충한다.
    -- 스타터 장비 인덱스 1·5·8·10·12 = bit32 1+16+128+512+2048.
    Affinity_village=0,Affinity_windcliff=0,Affinity_highland=0,Affinity_wetland=0,MeadowGearOwned=2705,MeadowGearOwned2=0,MeadowGearOwned3=0,MeadowGearOwned4=0,
    MeadowEquipWeapon=1,MeadowEquipChest=5,MeadowEquipHands=8,
    MeadowEquipLegs=10,MeadowEquipFeet=12,MeadowEquipCape=0,MeadowEquipAccessory=0,MeadowEquipShield=0,
    MeadowPotionHealth=0,MeadowPotionStamina=0,
    MeadowTalentMartial=0,MeadowTalentSigns=0,MeadowTalentDefense=0,MeadowTalentAgility=0,
    QuestStage = 1, QuestProgress = 0, QuestWood = 0, QuestStone = 0,
    ResearchRecords = 0, ExplorationGroves = 0, RuinsDiscovered = 0, DawnTraceFound = 0, NightTraceFound = 0, CompanionQuestStage = 1, CompanionQuestProgress = 0,
    -- 구형 저장은 존재하지 않는 숫자 필드를 기본값으로 읽어 이관한다.
    MeadowUltChoice = 1, MeadowRune = 0, NarinStory = 0, VillageContractIndex = 1, VillageContractPhase = 0, VillageContractEvidence = 0, VillageContractOutcomes = 0,
    -- [이어하기] 이전 프로필에 없는 필드는 0으로 마이그레이션. 서버 검증된 위치만 복원한다.
    -- [몬스터 도감·지역 발견] 처치 횟수와 지역 발견 비트(1 초원·2 숲·4 화산·8 오아시스).
    CampWorldtree = 0, CampVolcano = 0, CampOasis = 0,
    BountyIndex = 1, BountyPhase = 0, BountyClues = 0, BountyOutcomes = 0,
    DexKillWolf = 0, DexKillBat = 0, DexKillAlpha = 0, WorldDiscovered = 1, WaypointMask = 0, EstateA = 0, EstateB = 0, EstateC = 0, MountOwned = 0, MiningProficiency = 0, PickaxeTier = 0, BountyZone = 0, BountyKills = 0, BountyNeed = 0, BountyBig = 0, EcoChestMask = 0, EcoChestMask2 = 0, EcoChestMask3 = 0, QLMirror = 0, QLMirrorP = 0, QLMina = 0, QLMinaP = 0, QLNick = 0, QLNickP = 0, QLSera = 0, QLSeraP = 0, QLGarden = 0, QLGardenP = 0, LandmarkMask = 0, LandmarkClaim = 0, TrackFlags = 0, QLWind = 0, QLWindP = 0, QLWindC = 0, QLHunt = 0, QLHuntP = 0, QLHuntC = 0, QLBog = 0, QLBogP = 0, QLBogC = 0, QLRoot = 0, QLRootP = 0, QLRootC = 0, QLTrack1 = 0, QLTrack1P = 0, QLTrack1C = 0, QLTrack2 = 0, QLTrack2P = 0, QLTrack2C = 0, QLTrack3 = 0, QLTrack3P = 0, QLTrack3C = 0, QLHarJ = 0, QLHarJP = 0, QLHarJC = 0, QLRiaJ = 0, QLRiaJP = 0, QLRiaJC = 0, QLMorganJ = 0, QLMorganJP = 0, QLMorganJC = 0, QLBarenJ = 0, QLBarenJP = 0, QLBarenJC = 0, QLTiboJ = 0, QLTiboJP = 0, QLTiboJC = 0, QLCassianJ = 0, QLCassianJP = 0, QLCassianJC = 0, CompanionBond = 0, QLSeraJ = 0, QLSeraJP = 0, QLSeraJC = 0, QLRowenJ = 0, QLRowenJP = 0, QLRowenJC = 0, QLDoranJ = 0, QLDoranJP = 0, QLDoranJC = 0, QLIfaJ = 0, QLIfaJP = 0, QLIfaJC = 0, HiddenOpen = 0, CompanionOwned = 0, CompanionActive = 0, RelicMask = 0, ChapterMask = 0, PoiFound1 = 0, PoiFound2 = 0, PoiLoot1 = 0, PoiLoot2 = 0, ContractAccepted = 0, ContractDone = 0, ContractClaimed = 0, DungeonCleared = 0,
    MeadowResumeValid = 0, MeadowResumeX = 0, MeadowResumeY = 0, MeadowResumeZ = 0,
  },
  Actions = {
    { Id = "genre-core", Label = "생존 시작", Kind = "SURVIVAL", Order = 1, LearningPattern = "idle-reward" },
    { Id = "scope-corefun-ea77622450", Label = "근접 공격", Kind = "COMBAT", Order = 2, LearningPattern = "offline-progress" },
    { Id = "scope-coreloop-0-9b2d4dfbc6", Label = "연속 전투", Kind = "COMBAT", Order = 3, LearningPattern = "upgrade-layer" },
    { Id = "scope-coreloop-1-6ebe58f496", Label = "가까운 자원 채집", Kind = "GATHER", Order = 4, LearningPattern = "claim-idempotency" },
    { Id = "scope-coreloop-2-6c927cfa40", Label = "나무·돌로 장비 강화", Kind = "PROGRESSION", Order = 5, LearningPattern = "persistent-growth" },
    { Id = "scope-mobileux-5acfb2eaa6", Label = "공격 (터치)", Kind = "COMBAT", Order = 6, LearningPattern = "commercial-idle-runtime-architecture" },
    -- Roblox-native R15 punches / elbows / kicks use the existing server hit and damage authority.
    { Id = "meadow-unarmed-rush", Label = "연속권 · 잽/훅", Kind = "COMBAT", Order = 7, LearningPattern = "r15-unarmed" },
    { Id = "meadow-unarmed-uppercut", Label = "승룡 어퍼컷", Kind = "COMBAT", Order = 8, LearningPattern = "r15-unarmed" },
    { Id = "meadow-unarmed-kick", Label = "회전 발차기", Kind = "COMBAT", Order = 9, LearningPattern = "r15-unarmed" },
    { Id = "meadow-unarmed-elbow", Label = "팔꿈치·무릎", Kind = "COMBAT", Order = 10, LearningPattern = "r15-unarmed" },
    { Id = "skill-meadow-heavy", Label = "강타", Kind = "SKILL", Order = 11, MotionAtom = "HEAVY_ATTACK_1", SkillAtom = "IMPACT_SMALL", VfxAtom = "CRITICAL_BURST", Cooldown = 5, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-sweep", Label = "회전 베기", Kind = "SKILL", Order = 12, MotionAtom = "LIGHT_ATTACK_1", SkillAtom = "SKILL_TRAIL", VfxAtom = "SHAPE_BURST", Cooldown = 9, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-bolt", Label = "마력 탄환", Kind = "SKILL", Order = 13, MotionAtom = "CAST_BURST", SkillAtom = "IMPACT_SMALL", VfxAtom = "IMPACT_FLASH", Cooldown = 7, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-guard", Label = "방어 자세", Kind = "SKILL", Order = 14, MotionAtom = "BLOCK_HOLD", SkillAtom = "SHIELD_SHELL", VfxAtom = "BLOCK_IMPACT", Cooldown = 9, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-parry", Label = "완벽 방어", Kind = "SKILL", Order = 15, MotionAtom = "PARRY_PERFECT", SkillAtom = "IMPACT_SMALL", VfxAtom = "PARRY_PERFECT_FLASH", Cooldown = 7, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-dodge-left", Label = "왼쪽 회피", Kind = "SKILL", Order = 16, MotionAtom = "DODGE_LEFT", SkillAtom = "DASH_STREAK", VfxAtom = "DODGE_EVASION_PULSE", Cooldown = 4, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-dodge-right", Label = "오른쪽 회피", Kind = "SKILL", Order = 17, MotionAtom = "DODGE_RIGHT", SkillAtom = "DASH_STREAK", VfxAtom = "DODGE_EVASION_PULSE", Cooldown = 4, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-sprint", Label = "질주", Kind = "SKILL", Order = 18, MotionAtom = "SPRINT", SkillAtom = "DASH_STREAK", VfxAtom = "BUFF_PULSE", Cooldown = 8, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-heal", Label = "회복", Kind = "SKILL", Order = 19, MotionAtom = "CAST_BURST", SkillAtom = "IMPACT_SMALL", VfxAtom = "HEAL_PULSE", Cooldown = 16, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-focus", Label = "마력 집중", Kind = "SKILL", Order = 20, MotionAtom = "CHANNEL_LOOP", SkillAtom = "IMPACT_SMALL", VfxAtom = "BUFF_PULSE", Cooldown = 13, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-oath", Label = "기사단의 맹세", Kind = "SKILL", Order = 22, MotionAtom = "CHANNEL_LOOP", SkillAtom = "IMPACT_SMALL", VfxAtom = "BUFF_PULSE", Cooldown = 90, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-ultimate", Label = "궁극기", Kind = "SKILL", Order = 23, MotionAtom = "CHANNEL_LOOP", SkillAtom = "IMPACT_SMALL", VfxAtom = "SHAPE_BURST", Cooldown = 2, LearningPattern = "roblox-native-action" },
    { Id = "skill-meadow-emote", Label = "인사", Kind = "SKILL", Order = 21, MotionAtom = "EMOTE_WAVE", VfxAtom = "QUEST_UPDATE_PULSE", Cooldown = 3, LearningPattern = "roblox-native-action" },
  },
  -- STUDIO_ASSET_BINDING_BEGIN
  StudioAssets = {
    Applied = true,
    BindingVersion = 2,
    LibraryVersion = 145,
    SelectionFingerprint = "4408eaaee66d8a0c4a957aac3459d8909bd52f66d9bc3d59bb10a83d45257fff",
    SourceUsageFingerprint = "9722091214e04ccc626998b459116a027105dbb39806e58bbb3a3967b9aab29f",
    SourceUsageLibraryVersion = 145,
    Source = "company-asset-library.json#baseMaterialLibrary",
    AtomState = "PREPARED_SEMANTIC_ATOM_LIBRARY",
    RecipeId = "NORMAL_VARIANT",
    ProductionVerified = false,
    RuntimeVerificationRequired = true,
    Families = {
      UI = { "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH", "BAR_MANA", "BAR_PROGRESS", "SLOT_INVENTORY", "SLOT_EQUIPMENT", "SLOT_SKILL", "HUD_OBJECTIVE", "HUD_CURRENCY", "HUD_WAVE", "MAP_FRAME", "MINIMAP_FRAME", "MARKER_PLAYER", "MARKER_ENEMY", "MARKER_QUEST", "TOUCH_JOYSTICK", "TOUCH_ACTION", "TOUCH_DODGE", "FRAME_MODAL", "FRAME_TOOLTIP", "BUTTON_SECONDARY", "BUTTON_ICON", "ICON_ITEM", "ICON_SKILL", "ICON_STATUS" },
      ENVIRONMENT = { "TREE_TRUNK_THICK", "TREE_CROWN_ROUND", "ROCK_MEDIUM", "ROAD_DIRT", "SKY_LAYER", "TERRAIN_FLAT", "TERRAIN_SLOPE", "TERRAIN_RIDGE", "TERRAIN_VALLEY", "CLIFF_LOW", "CLIFF_HIGH", "ROCK_SMALL", "ROCK_LARGE", "TREE_TRUNK_THIN", "TREE_CROWN_TALL", "TREE_CROWN_SPARSE", "GRASS_PATCH", "BUSH", "FLOWER_PATCH", "MUSHROOM_PATCH", "DEAD_BRANCH", "LOG", "STUMP", "ROAD_STONE", "ROAD_SNOW", "PATH_NARROW", "BRIDGE_WOOD", "BRIDGE_STONE", "WATER_SHALLOW", "WATER_DEEP", "RUIN_WALL", "RUIN_PILLAR", "LANDMARK_TOWER", "LANDMARK_SHRINE", "LANDMARK_TREE", "FOG_LAYER" },
      BUILDING = { "FOUNDATION_RECT", "WALL_SOLID", "DOOR_SINGLE", "ROOF_GABLE", "BALCONY", "PILLAR", "FENCE", "SIGN", "FLOOR_TILE", "CEILING", "INTERIOR_WALL", "SOCKET_WALL", "SOCKET_FLOOR", "SOCKET_CEILING", "FOUNDATION_SQUARE", "FOUNDATION_ROUND", "WALL_WINDOW", "WALL_ARCH", "CORNER_INNER", "CORNER_OUTER", "DOOR_DOUBLE", "DOOR_GATE", "WINDOW_SMALL", "WINDOW_LARGE", "ROOF_FLAT", "ROOF_HIP", "ROOF_DOME", "STAIR_STRAIGHT", "STAIR_CORNER", "STAIR_SPIRAL" },
      PROP = { "CHEST", "CRATE", "LAMP", "WORKBENCH", "CART", "ANVIL", "FURNACE", "COOKING_POT", "RESOURCE_WOOD", "RESOURCE_STONE", "RESOURCE_ORE", "RESOURCE_HERB", "SIGNPOST", "TORCH", "ROPE", "CHAIN", "BANNER", "RUG", "BOTTLE", "BOOK", "WEAPON_RACK", "ARMOR_STAND", "CHAIR", "TABLE", "BED", "SHELF", "BENCH", "LANTERN", "BARREL", "SACK" },
      MATERIAL = { "WOOD", "STONE", "METAL", "CLOTH", "LEATHER", "SKIN", "FUR", "SCALE", "ICE", "LAVA", "CRYSTAL", "SLIME", "BONE", "MOD_CLEAN", "MOD_WORN", "MOD_DIRTY", "MOD_WET", "MOD_BURNT", "MOD_FROSTED", "MOD_RUSTED", "MOD_CRACKED", "MOD_GLOWING", "MOD_POISONED" },
      AUDIO = { "ENV_WIND", "ENV_WATER", "UI_CONFIRM", "ATTACK_SWING_LIGHT", "WEAPON_WOOD", "ENV_FOREST", "ENV_CAVE", "UI_CANCEL", "UI_WARNING", "MAGIC_CAST", "MAGIC_IMPACT", "BOSS_STINGER", "BUILDING_DOOR", "BUILDING_BREAK", "WEATHER_RAIN", "WEATHER_SNOW", "WEATHER_STORM", "FOOTSTEP_SOFT", "FOOTSTEP_HARD", "FOOTSTEP_WET", "CREATURE_SMALL", "CREATURE_HEAVY", "CREATURE_HISS", "CREATURE_ROAR", "ATTACK_SWING_HEAVY", "HIT_FLESH", "HIT_ARMOR", "HIT_STONE", "WEAPON_METAL" },
      VFX = { "IMPACT_FLASH", "TRAIL_SHORT", "SHAPE_BURST", "ELEMENT_ELECTRIC", "ELEMENT_POISON", "ELEMENT_MAGIC", "ELEMENT_DUST", "ELEMENT_WATER", "IMPACT_SPARK", "IMPACT_DEBRIS", "STATUS_GLOW", "STATUS_SMOKE", "WEATHER_RAIN", "WEATHER_SNOW", "WEATHER_FOG", "DESTRUCTION_WOOD", "DESTRUCTION_STONE", "DESTRUCTION_METAL", "SHAPE_ORB", "SHAPE_RING", "SHAPE_CONE", "SHAPE_LINE", "SHAPE_SHOCKWAVE", "TRAIL_LONG", "ELEMENT_FIRE", "ELEMENT_ICE" },
      SKILL = { "CAST_HAND", "TELEGRAPH_CIRCLE", "IMPACT_SMALL", "PROJECTILE_WAVE", "PROJECTILE_ARC", "IMPACT_HEAVY", "IMPACT_AOE", "AURA_BODY", "AURA_WEAPON", "STATUS_RING", "STATUS_MARK", "REACTION_LIGHT", "REACTION_HEAVY", "CAMERA_KICK", "CAMERA_SHAKE", "CAST_WEAPON", "CAST_GROUND", "CAST_CHANNEL", "TELEGRAPH_CONE", "TELEGRAPH_LINE", "PROJECTILE_ORB", "PROJECTILE_BOLT" },
      WEAPON = { "BLADE_LONG", "GUARD_CROSS", "GRIP_LONG", "BLADE_CURVED", "BLADE_HEAVY", "BLADE_DOUBLE", "GUARD_ROUND", "GUARD_WIDE", "GRIP_SHORT", "POMMEL_SIMPLE", "POMMEL_ORNATE", "SPEAR_HEAD", "AXE_HEAD", "HAMMER_HEAD", "MACE_HEAD", "BOW_LIMB", "BOW_GRIP", "CROSSBOW_BODY", "FIREARM_RECEIVER", "FIREARM_BARREL", "FIREARM_STOCK", "STAFF_SHAFT", "WAND_SHAFT", "MAGIC_CORE", "SHIELD_ROUND", "SHIELD_KITE", "SHIELD_TOWER", "THROWN_BLADE", "THROWN_ORB", "BLADE_SHORT" },
      CHARACTER = { "TORSO_CLOTH", "SHOULDER_LIGHT", "BACK_CAPE", "SHOULDER_HEAVY", "BACK_PACK", "ACCESSORY_POUCH", "ACCESSORY_CHARM", "BODY_STANDARD", "BODY_SMALL", "BODY_HEAVY", "BODY_SLENDER", "HEAD_ROUND", "HEAD_ANGULAR", "HEAD_BROAD", "HEAD_LONG", "FACE_NEUTRAL", "FACE_HEROIC", "FACE_ROUGH", "FACE_CUTE", "HAIR_SHORT", "HAIR_LONG", "HAIR_TIED", "HAIR_SPIKED", "HAND_BARE", "HAND_GLOVE", "FOOT_BOOT", "FOOT_SHOE", "TORSO_LEATHER", "TORSO_PLATE", "TORSO_ROBE" },
      CREATURE = { "HEAD_CANINE", "JAW_LONG", "CLAW", "FIN", "TENTACLE", "ROOT_LIMB", "CRYSTAL_CORE", "MECH_PLATE", "HEAD_FELINE", "HEAD_REPTILE", "HEAD_INSECT", "HEAD_SKULL", "HEAD_DEMON", "HEAD_GOLEM", "JAW_SHORT", "MANDIBLE", "BEAK", "HORN_SHORT", "HORN_LONG", "HORN_CURVED", "ANTLER", "ANTENNA", "EAR_POINTED", "EAR_ROUND", "EYE_PAIR", "EYE_CLUSTER", "WING_FEATHER", "WING_LEATHER", "WING_INSECT", "TAIL_SHORT", "TAIL_LONG", "TAIL_BLADE", "TAIL_STINGER", "PAW", "HOOF", "TALON", "CARAPACE", "FUR_PATCH", "SCALE_PLATE" },
      MOTION = { "IDLE_RELAXED", "WALK", "JOG", "RUN", "START", "STOP", "TURN_90", "JUMP_START", "LAND", "HIT_FRONT", "DEATH_FRONT", "BACKSTEP", "TURN_45", "TURN_180", "JUMP_AIR", "DODGE_L", "DODGE_R", "ATTACK_LIGHT_1", "ATTACK_LIGHT_2", "ATTACK_LIGHT_3", "ATTACK_HEAVY", "BLOCK", "PARRY", "HIT_BACK", "HIT_LEFT", "HIT_RIGHT", "KNOCKDOWN", "GETUP", "DEATH_SIDE", "DEATH_BACK", "CAST_PREPARE", "CAST_RELEASE", "RECOVERY", "TAUNT", "LOOK_AROUND", "IDLE_ALERT", "SPRINT", "STRAFE_L", "STRAFE_R" },
    },
    MotionQuality = {
      Contract = "tools/company-development-roblox-bootstrap.mjs#motionQuality",
      LibraryFirst = true,
      ArticulatedRigRequired = true,
      AnimatorRequired = true,
      BlendAndSpeedSyncRequired = true,
      RuntimeVerificationRequired = true,
      MannequinHardFailure = "CHARACTER_MOTION_MANNEQUIN",
    },
  },
  -- STUDIO_ASSET_BINDING_END
  -- VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN
  VerifiedExternalLearning = {
    Applied = true,
    Authority = "vibe3-roblox-learning-context",
    GameId = "fantasy-survival",
    CoreKind = "SURVIVAL",
    SemanticVariant = "SURVIVAL_RISK",
    SemanticMood = "PRESERVE_AUTHORED_PRESENTATION",
    SemanticMappingVersion = 1,
    SemanticMappingFingerprint = "qelcpi",
    MemoryFingerprint = "hfed4s",
    NativeBindingVersion = 6,
    CoveragePct = 100,
    ContentComplete = true,
    RetrievedCount = 7,
    AppliedCount = 7,
    AppliedGameDevelopmentPrincipleCount = 9,
    RetrievedPrincipleCount = 23,
    ValidationOnlyPrincipleCount = 14,
    NotApplicablePrincipleCount = 0,
    TruncationForbidden = true,
    VerifiedExternalLearningIds = {
      "external-black-box-block-blast-run-30",
      "external-black-box-cavern-cravers-run-47",
      "external-black-box-idle-fantasy-run-42",
      "external-black-box-luanti-run-10",
      "external-black-box-revengate-run-59",
      "external-black-box-sgtpuzzles-run-29",
      "external-black-box-shattered-pixel-dungeon-run-4",
    },
    ApplyAxes = {
      "CORE_GAMEPLAY_FEEL",
      "PLAYER_INPUT_AND_TOUCH",
      "VISIBLE_ACTION_FEEDBACK",
      "HUD_AND_CONTEXTUAL_GUIDANCE",
      "MOBILE_READABILITY_AND_RESPONSE",
      "PROGRESSION_RISK_READABILITY",
      "REWARD_AND_EVENT_PRESENTATION",
      "CAMERA_RESPONSE",
      "WORLD_AND_BACKGROUND_PRESENTATION",
      "CHARACTER_NPC_CREATURE_ANIMATION",
      "MOTION_AND_TRANSITIONS",
      "CONTEXTUAL_ONBOARDING",
    },
    ApplicationPrinciples = {
      "id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=The verified dungeon state presents a compact set of actionable gameplay choices, and a successful action immediately changes the visible board state in the same gameplay context.; apply=For a Roblox RPG, make bounded tactical actions produce prompt, legible state feedback without requiring the player to leave the core encounter view.",
      "id=persistent-primary-rpg-navigation; scope=mobile-rpg-ui; lesson=The verified gameplay state exposes persistent primary destinations such as skills, combat, home, quests and profile, allowing a player to move between major RPG systems without leaving the core game shell.; apply=For a Roblox RPG, keep high-frequency progression systems easy to reach and verify that each navigation action produces an immediate, legible state change.",
      "id=danger-and-level-gating-visible-before-commitment; scope=rpg-progression-observation; lesson=The verified Combat screen shows dungeon names together with level requirements and visible danger guidance before a run is chosen.; apply=Expose progression requirements and risk cues before players commit to a dangerous activity, while independently validating the actual balance in the target game.",
      "id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=For Roblox mobile 3D controls, validate look gestures with before/after scene framing while preserving consistent movement and action affordances.",
      "id=persistent-core-state-around-world-view; scope=rpg-mobile-ux; lesson=The verified gameplay view keeps the world map, player marker, health readout, inventory access and primary action controls visible together, reducing context switching during basic play.; apply=For a Roblox RPG, keep essential player state and high-frequency actions legible around the core world view without copying this game's visual design.",
      "id=movement-needs-immediate-visible-response; scope=rpg-input-feedback; lesson=A bounded gameplay input produced an immediate visible player-position change in the same world view.; apply=For mobile Roblox RPG movement, bind successful input to prompt and unambiguous world-state feedback, then validate it with semantic before and after frames.",
      "id=persistent-contextual-action-controls; scope=mobile-interaction-observation; lesson=The verified puzzle state keeps the numeric action controls visible beside the active play surface so the next valid interaction is immediately available without reopening a separate menu.; apply=When appropriate for a Roblox mobile interaction, keep the small set of context-relevant actions directly available near the active gameplay state instead of adding unnecessary navigation layers.",
      "id=immediate-spatially-anchored-input-feedback; scope=mobile-feedback-observation; lesson=The exercised input produces an immediate visible value change in the affected board cell, making the result of the touch easy to associate with the selected target.; apply=For Roblox mobile controls, prefer visible feedback at or near the affected gameplay object so the user can confirm that the touch produced the intended state change.",
      "id=touch-instruction-near-first-play-state; scope=mobile-onboarding-observation; lesson=The first verified dungeon view immediately presents a concise touch interaction instruction while the playable board and character are already visible.; apply=For Roblox mobile onboarding, prefer contextual control guidance at the moment the relevant playable state is visible rather than front-loading a long instruction sequence.",
    },
    GameDevelopmentPrinciples = {
      "id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=The verified dungeon state presents a compact set of actionable gameplay choices, and a successful action immediately changes the visible board state in the same gameplay context.; apply=For a Roblox RPG, make bounded tactical actions produce prompt, legible state feedback without requiring the player to leave the core encounter view.",
      "id=persistent-primary-rpg-navigation; scope=mobile-rpg-ui; lesson=The verified gameplay state exposes persistent primary destinations such as skills, combat, home, quests and profile, allowing a player to move between major RPG systems without leaving the core game shell.; apply=For a Roblox RPG, keep high-frequency progression systems easy to reach and verify that each navigation action produces an immediate, legible state change.",
      "id=danger-and-level-gating-visible-before-commitment; scope=rpg-progression-observation; lesson=The verified Combat screen shows dungeon names together with level requirements and visible danger guidance before a run is chosen.; apply=Expose progression requirements and risk cues before players commit to a dangerous activity, while independently validating the actual balance in the target game.",
      "id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=For Roblox mobile 3D controls, validate look gestures with before/after scene framing while preserving consistent movement and action affordances.",
      "id=persistent-core-state-around-world-view; scope=rpg-mobile-ux; lesson=The verified gameplay view keeps the world map, player marker, health readout, inventory access and primary action controls visible together, reducing context switching during basic play.; apply=For a Roblox RPG, keep essential player state and high-frequency actions legible around the core world view without copying this game's visual design.",
      "id=movement-needs-immediate-visible-response; scope=rpg-input-feedback; lesson=A bounded gameplay input produced an immediate visible player-position change in the same world view.; apply=For mobile Roblox RPG movement, bind successful input to prompt and unambiguous world-state feedback, then validate it with semantic before and after frames.",
      "id=persistent-contextual-action-controls; scope=mobile-interaction-observation; lesson=The verified puzzle state keeps the numeric action controls visible beside the active play surface so the next valid interaction is immediately available without reopening a separate menu.; apply=When appropriate for a Roblox mobile interaction, keep the small set of context-relevant actions directly available near the active gameplay state instead of adding unnecessary navigation layers.",
      "id=immediate-spatially-anchored-input-feedback; scope=mobile-feedback-observation; lesson=The exercised input produces an immediate visible value change in the affected board cell, making the result of the touch easy to associate with the selected target.; apply=For Roblox mobile controls, prefer visible feedback at or near the affected gameplay object so the user can confirm that the touch produced the intended state change.",
      "id=touch-instruction-near-first-play-state; scope=mobile-onboarding-observation; lesson=The first verified dungeon view immediately presents a concise touch interaction instruction while the playable board and character are already visible.; apply=For Roblox mobile onboarding, prefer contextual control guidance at the moment the relevant playable state is visible rather than front-loading a long instruction sequence.",
    },
    GameSpecificSemanticMappings = {
      { PrincipleId = "compact-tactical-state-with-immediate-feedback", SourceLearningId = "external-black-box-cavern-cravers-run-47", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-rpg-interaction", Domain = "CORE_GAMEPLAY_FEEL", Domains = { "CORE_GAMEPLAY_FEEL", "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK", "HUD_AND_CONTEXTUAL_GUIDANCE", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Keep the primary game state beside the active action and acknowledge the server-confirmed action immediately.", Implementation = "variant-specific action cue bound to LastApprovedScope", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "persistent-primary-rpg-navigation", SourceLearningId = "external-black-box-idle-fantasy-run-42", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-rpg-ui", Domain = "HUD_AND_CONTEXTUAL_GUIDANCE", Domains = { "HUD_AND_CONTEXTUAL_GUIDANCE", "PROGRESSION_RISK_READABILITY", "REWARD_AND_EVENT_PRESENTATION" }, Mapping = "Keep level, progression, and next-step context visible around the primary action.", Implementation = "persistent context cue uses existing Config.Actions and replicated player attributes", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "danger-and-level-gating-visible-before-commitment", SourceLearningId = "external-black-box-idle-fantasy-run-42", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-progression-observation", Domain = "PROGRESSION_RISK_READABILITY", Domains = { "PROGRESSION_RISK_READABILITY", "HUD_AND_CONTEXTUAL_GUIDANCE", "VISIBLE_ACTION_FEEDBACK" }, Mapping = "Show health and threat risk before the next survival action is committed.", Implementation = "pre-action risk cue reads existing replicated state; it never grants authority", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "touch-look-produces-immediate-spatial-feedback", SourceLearningId = "external-black-box-luanti-run-10", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-3d-controls", Domain = "PLAYER_INPUT_AND_TOUCH", Domains = { "PLAYER_INPUT_AND_TOUCH", "CAMERA_RESPONSE", "VISIBLE_ACTION_FEEDBACK", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Give threat-space feedback at the moment the survival action is confirmed.", Implementation = "variant-specific camera or spatial cue follows LastApprovedScope", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "persistent-core-state-around-world-view", SourceLearningId = "external-black-box-revengate-run-59", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-mobile-ux", Domain = "WORLD_AND_BACKGROUND_PRESENTATION", Domains = { "WORLD_AND_BACKGROUND_PRESENTATION", "HUD_AND_CONTEXTUAL_GUIDANCE", "CORE_GAMEPLAY_FEEL" }, Mapping = "Keep the core state visible while the game world remains readable.", Implementation = "world-view cue reuses the existing HUD state and does not replace the game camera", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "movement-needs-immediate-visible-response", SourceLearningId = "external-black-box-revengate-run-59", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-input-feedback", Domain = "CHARACTER_NPC_CREATURE_ANIMATION", Domains = { "CHARACTER_NPC_CREATURE_ANIMATION", "MOTION_AND_TRANSITIONS", "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK" }, Mapping = "Show the player action transition immediately after input.", Implementation = "variant-specific motion response is client feedback only and follows authoritative state", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "persistent-contextual-action-controls", SourceLearningId = "external-black-box-sgtpuzzles-run-29", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-interaction-observation", Domain = "HUD_AND_CONTEXTUAL_GUIDANCE", Domains = { "HUD_AND_CONTEXTUAL_GUIDANCE", "PLAYER_INPUT_AND_TOUCH", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Keep contextual actions anchored beside the active game state.", Implementation = "touch-sized contextual buttons remain bound to existing RemoteEvent action ids", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "immediate-spatially-anchored-input-feedback", SourceLearningId = "external-black-box-sgtpuzzles-run-29", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-feedback-observation", Domain = "PLAYER_INPUT_AND_TOUCH", Domains = { "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK", "CAMERA_RESPONSE" }, Mapping = "Anchor input feedback to the active game control.", Implementation = "control-local motion cue is separate from server authority and save state", Variant = "SURVIVAL_RISK" },
      { PrincipleId = "touch-instruction-near-first-play-state", SourceLearningId = "external-black-box-shattered-pixel-dungeon-run-4", CoreKind = "SURVIVAL", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-onboarding-observation", Domain = "CONTEXTUAL_ONBOARDING", Domains = { "CONTEXTUAL_ONBOARDING", "HUD_AND_CONTEXTUAL_GUIDANCE", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Place the first-play instruction beside the first game action.", Implementation = "contextual instruction is rendered in the game-specific HUD variant", Variant = "SURVIVAL_RISK" },
    },
    LearningDispositions = {
      { PrincipleId = "native-arm64-redroid-is-valid-free-server-route", SourceLearningId = "external-black-box-block-blast-run-30", Disposition = "VALIDATION_ONLY", Scope = "android-runtime-compatibility", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "separate-system-overlay-consent-and-game-entry", SourceLearningId = "external-black-box-block-blast-run-30", Disposition = "VALIDATION_ONLY", Scope = "black-box-playtest-automation", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "visual-state-change-plus-process-survival-strengthens-input-evidence", SourceLearningId = "external-black-box-block-blast-run-30", Disposition = "VALIDATION_ONLY", Scope = "qa-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "tutorial-separated-from-game-entry", SourceLearningId = "external-black-box-cavern-cravers-run-47", Disposition = "VALIDATION_ONLY", Scope = "mobile-rpg-onboarding", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "compact-tactical-state-with-immediate-feedback", SourceLearningId = "external-black-box-cavern-cravers-run-47", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-rpg-interaction", Domains = { "CORE_GAMEPLAY_FEEL", "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK", "HUD_AND_CONTEXTUAL_GUIDANCE", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Keep the primary game state beside the active action and acknowledge the server-confirmed action immediately.", Implementation = "variant-specific action cue bound to LastApprovedScope", Reason = "" },
      { PrincipleId = "semantic-gameplay-input-plus-survival", SourceLearningId = "external-black-box-cavern-cravers-run-47", Disposition = "VALIDATION_ONLY", Scope = "qa-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "first-run-friction-separated-from-game-entry", SourceLearningId = "external-black-box-idle-fantasy-run-42", Disposition = "VALIDATION_ONLY", Scope = "mobile-rpg-onboarding", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "persistent-primary-rpg-navigation", SourceLearningId = "external-black-box-idle-fantasy-run-42", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-rpg-ui", Domains = { "HUD_AND_CONTEXTUAL_GUIDANCE", "PROGRESSION_RISK_READABILITY", "REWARD_AND_EVENT_PRESENTATION" }, Mapping = "Keep level, progression, and next-step context visible around the primary action.", Implementation = "persistent context cue uses existing Config.Actions and replicated player attributes", Reason = "" },
      { PrincipleId = "danger-and-level-gating-visible-before-commitment", SourceLearningId = "external-black-box-idle-fantasy-run-42", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-progression-observation", Domains = { "PROGRESSION_RISK_READABILITY", "HUD_AND_CONTEXTUAL_GUIDANCE", "VISIBLE_ACTION_FEEDBACK" }, Mapping = "Show health and threat risk before the next survival action is committed.", Implementation = "pre-action risk cue reads existing replicated state; it never grants authority", Reason = "" },
      { PrincipleId = "semantic-input-plus-runtime-survival", SourceLearningId = "external-black-box-idle-fantasy-run-42", Disposition = "VALIDATION_ONLY", Scope = "qa-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "content-setup-is-separate-from-3d-game-entry", SourceLearningId = "external-black-box-luanti-run-10", Disposition = "VALIDATION_ONLY", Scope = "sandbox-onboarding-observation", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "touch-look-produces-immediate-spatial-feedback", SourceLearningId = "external-black-box-luanti-run-10", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-3d-controls", Domains = { "PLAYER_INPUT_AND_TOUCH", "CAMERA_RESPONSE", "VISIBLE_ACTION_FEEDBACK", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Give threat-space feedback at the moment the survival action is confirmed.", Implementation = "variant-specific camera or spatial cue follows LastApprovedScope", Reason = "" },
      { PrincipleId = "world-entry-needs-load-window-before-input-proof", SourceLearningId = "external-black-box-luanti-run-10", Disposition = "VALIDATION_ONLY", Scope = "mobile-runtime-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "narrative-onboarding-is-not-game-entry", SourceLearningId = "external-black-box-revengate-run-59", Disposition = "VALIDATION_ONLY", Scope = "rpg-onboarding-qa", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "persistent-core-state-around-world-view", SourceLearningId = "external-black-box-revengate-run-59", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-mobile-ux", Domains = { "WORLD_AND_BACKGROUND_PRESENTATION", "HUD_AND_CONTEXTUAL_GUIDANCE", "CORE_GAMEPLAY_FEEL" }, Mapping = "Keep the core state visible while the game world remains readable.", Implementation = "world-view cue reuses the existing HUD state and does not replace the game camera", Reason = "" },
      { PrincipleId = "movement-needs-immediate-visible-response", SourceLearningId = "external-black-box-revengate-run-59", Disposition = "APPLIED_GAME_SOURCE", Scope = "rpg-input-feedback", Domains = { "CHARACTER_NPC_CREATURE_ANIMATION", "MOTION_AND_TRANSITIONS", "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK" }, Mapping = "Show the player action transition immediately after input.", Implementation = "variant-specific motion response is client feedback only and follows authoritative state", Reason = "" },
      { PrincipleId = "gameplay-state-must-be-visually-distinct-from-selection-state", SourceLearningId = "external-black-box-sgtpuzzles-run-29", Disposition = "VALIDATION_ONLY", Scope = "mobile-runtime-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "persistent-contextual-action-controls", SourceLearningId = "external-black-box-sgtpuzzles-run-29", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-interaction-observation", Domains = { "HUD_AND_CONTEXTUAL_GUIDANCE", "PLAYER_INPUT_AND_TOUCH", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Keep contextual actions anchored beside the active game state.", Implementation = "touch-sized contextual buttons remain bound to existing RemoteEvent action ids", Reason = "" },
      { PrincipleId = "immediate-spatially-anchored-input-feedback", SourceLearningId = "external-black-box-sgtpuzzles-run-29", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-feedback-observation", Domains = { "PLAYER_INPUT_AND_TOUCH", "VISIBLE_ACTION_FEEDBACK", "CAMERA_RESPONSE" }, Mapping = "Anchor input feedback to the active game control.", Implementation = "control-local motion cue is separate from server authority and save state", Reason = "" },
      { PrincipleId = "before-after-plus-runtime-survival-evidence", SourceLearningId = "external-black-box-sgtpuzzles-run-29", Disposition = "VALIDATION_ONLY", Scope = "qa-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "separate-android-overlay-onboarding-and-gameplay-entry", SourceLearningId = "external-black-box-shattered-pixel-dungeon-run-4", Disposition = "VALIDATION_ONLY", Scope = "black-box-playtest-automation", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
      { PrincipleId = "touch-instruction-near-first-play-state", SourceLearningId = "external-black-box-shattered-pixel-dungeon-run-4", Disposition = "APPLIED_GAME_SOURCE", Scope = "mobile-onboarding-observation", Domains = { "CONTEXTUAL_ONBOARDING", "HUD_AND_CONTEXTUAL_GUIDANCE", "MOBILE_READABILITY_AND_RESPONSE" }, Mapping = "Place the first-play instruction beside the first game action.", Implementation = "contextual instruction is rendered in the game-specific HUD variant", Reason = "" },
      { PrincipleId = "input-visual-transition-plus-foreground-survival", SourceLearningId = "external-black-box-shattered-pixel-dungeon-run-4", Disposition = "VALIDATION_ONLY", Scope = "qa-evidence", Domains = {  }, Mapping = "", Implementation = "QA/Android/runtime validation only; not emitted into Roblox game source.", Reason = "QA_OR_PLATFORM_INFRASTRUCTURE" },
    },
    ValidationOnlyPrinciples = {
      "native-arm64-redroid-is-valid-free-server-route",
      "separate-system-overlay-consent-and-game-entry",
      "visual-state-change-plus-process-survival-strengthens-input-evidence",
      "tutorial-separated-from-game-entry",
      "semantic-gameplay-input-plus-survival",
      "first-run-friction-separated-from-game-entry",
      "semantic-input-plus-runtime-survival",
      "content-setup-is-separate-from-3d-game-entry",
      "world-entry-needs-load-window-before-input-proof",
      "narrative-onboarding-is-not-game-entry",
      "gameplay-state-must-be-visually-distinct-from-selection-state",
      "before-after-plus-runtime-survival-evidence",
      "separate-android-overlay-onboarding-and-gameplay-entry",
      "input-visual-transition-plus-foreground-survival",
    },
    NotApplicablePrinciples = {

    },
    AvoidancePrinciples = {
      "id=android-hosted-x86-arm-translation-native-crash; scope=android-runtime-compatibility; lesson=A successful ARM64 split-APK install on an x86_64 Android guest does not prove sustained runtime compatibility. Native translation can still fail after launch or game entry in JNI/native-library or application initialization paths.; apply=Do not promote install or game-entry success to stable runtime success. Preserve the partial success boundary, then require process survival, foreground state and crash-free input evidence for full runtime pass.",
      "id=adb-streaming-install-finalization-fragility; scope=android-package-install; lesson=Large split-APK streaming installs can fail at session finalization even when transfer appears complete; no-streaming materially changed the failure boundary and allowed installation to complete.; apply=When a split install fails at finalization or package-service transport, test a no-streaming path before changing Android API levels or application payload assumptions.",
      "id=nested-virtualization-unavailable-on-hosted-macos-arm64; scope=hosted-emulator-infrastructure; lesson=A native ARM64 CI host does not imply nested hardware virtualization is available to an Android ARM64 emulator.; apply=Probe acceleration capability before downloading or booting a large ARM64 system image; treat HV_UNSUPPORTED as an infrastructure blocker, not an app failure.",
      "id=abi-list-and-native-bridge-must-be-proven; scope=android-abi-validation; lesson=Host architecture and guest architecture labels are insufficient. The guest must explicitly expose a compatible ABI or a proven native bridge before package installation is treated as meaningful runtime evidence.; apply=Gate ARM64 package installation on observed guest ABI compatibility instead of host labels alone.",
      "id=hosted-arm64-binder-ready-does-not-guarantee-redroid-boot; scope=android-container-runtime; lesson=On GitHub-hosted ubuntu-24.04-arm, native aarch64, 4K pages, Docker availability and Binder devices can all be valid while Redroid userspace still fails to boot if the Android container/device setup is wrong.; apply=Separate host-capability PASS from Android-userspace-boot PASS and preserve boot diagnostics before changing the app payload.",
      "id=ephemeral-transfer-expiry-is-not-runtime-regression; scope=artifact-transfer; lesson=A one-use or short-lived proprietary APK transfer URL may expire after Android runtime preparation succeeds. That failure must be classified as transfer infrastructure, not application runtime regression.; apply=Refresh only the ephemeral transfer reference while preserving the package hash and already-proven runtime configuration.",
      "id=avoid-random-api-cycling-after-repeated-class-failure; scope=experiment-strategy; lesson=Repeated failures sharing the same compatibility class should narrow the search space instead of causing random Android API cycling.; apply=After two or more materially similar failures, require a new hypothesis or infrastructure capability before retrying another API/image variant.",
      "id=runtime-pass-evidence-gate; scope=qa-evidence; lesson=Install PASS, process creation or injected input are staged evidence but are not individually equivalent to verified gameplay runtime. Run 30 demonstrates the complete gate with correlated visual game entry, meaningful input response, foreground/process survival and no captured fatal crash or ANR.; apply=runtimePass:true requires launch, foreground ownership, process survival, input exercise, correlated game-entry evidence and absence of fatal exception/native crash/ANR in the captured evidence window.",
      "id=missed-coordinate-is-not-game-failure; scope=black-box-input-automation; lesson=A prior probe reached live gameplay but tapped just outside an actionable card and therefore produced no visible change; unchanged output did not prove that the game or interaction system was broken.; apply=When game entry is visually verified but an input produces no change, distinguish an automation-target miss from a product failure and re-target a directly visible control before judging the game.",
      "id=unchanged-screen-after-tap-is-not-input-pass; scope=black-box-input-automation; lesson=A prior tap left the visible home state unchanged, so process survival alone was insufficient to claim input-response success.; apply=If the intended input does not produce a meaningful visible state change, do not promote it; target a visible semantic control and capture a new before/after pair.",
      "id=nearby-menu-actions-require-visual-coordinate-correction; scope=black-box-input-automation; lesson=Earlier bounded probes hit neighboring menu actions such as content-page or new-world controls even though the application runtime was healthy.; apply=When adjacent mobile controls are close together, classify a mis-tap as an automation-coordinate failure, correct it from the captured frame, and rerun the responsible stage without lowering the game-entry gate.",
      "id=visible-onboarding-control-must-be-hit-before-judging-entry; scope=black-box-input-automation; lesson=Run 58 reached the narrative onboarding screen but missed the visible Next control, so lack of game entry there was an automation-targeting failure rather than evidence that gameplay could not be entered. Run 59 corrected only that visible-control targeting and reached live gameplay.; apply=When a clearly visible onboarding control is the only observed blocker, allow one minimal coordinate correction before abandoning the target; do not lower the game-entry criterion.",
      "id=coordinate-miss-must-not-be-promoted-as-game-failure; scope=black-box-input-automation; lesson=A bounded input can miss a visible control even when the application is healthy; the resulting lack of transition is an automation-coordinate failure, not a game runtime failure.; apply=Use captured frames to correct the observed control coordinate and rerun the responsible input stage without lowering evidence gates.",
    },
    LearningUseAllowed = {
      "runtime-infrastructure failure classification",
      "ABI/native-bridge preflight design",
      "split-APK install recovery strategy",
      "host capability versus guest readiness separation",
      "staged runtime evidence gating",
      "partial success boundary preservation",
      "actual launch/game-entry fact distillation",
      "directly observed tutorial-board interaction",
      "directly observed drag-input response and visible state change",
      "failure-to-next-experiment decision quality",
      "positive gameplay pattern distillation limited to directly captured black-box behavior",
      "mobile RPG tutorial-to-gameplay stage separation",
      "compact tactical choice presentation",
      "immediate visible feedback after a bounded gameplay action",
      "input-to-visible-state evidence binding",
      "foreground/process/crash correlation",
      "portable RPG interaction lessons that may inform later Roblox-specific implementation and verification",
      "mobile RPG onboarding stage separation",
      "persistent primary-system navigation",
      "visible progression and danger cues",
      "setup versus actual 3D-play boundary separation",
      "mobile first-person look-input evidence",
      "load-readiness before input validation",
      "automation coordinate-failure classification",
      "portable mobile 3D-control lessons that may inform later Roblox-specific implementation and verification",
      "narrative onboarding versus actual game-entry separation",
      "persistent essential RPG state around the core world view",
      "immediate visible movement feedback",
      "semantic before-and-after gameplay input validation",
      "foreground process and crash correlation",
      "portable RPG UX and QA lessons for later Roblox-specific implementation",
      "mobile gameplay-entry boundary detection",
      "contextual mobile action availability",
      "spatially anchored input feedback",
      "portable mobile interaction lessons that may inform later Roblox-specific implementation and verification",
      "mobile onboarding stage separation",
      "contextual touch-control guidance timing",
      "actual gameplay-entry boundary detection",
      "runtime infrastructure and automation failure classification",
    },
    LearningUseForbidden = {
      "source-code or internal algorithm extraction",
      "asset extraction or redistribution",
      "hidden scoring/economy inference not present in captured evidence",
      "long-run retention or pacing claims not measured by this validation window",
      "copying proprietary names, artwork, trade dress or implementation details into a new game",
      "treating Android evidence as Roblox runtime evidence",
      "inferring hidden card, combat, economy, procedural-generation or progression formulas",
      "copying game artwork, UI trade dress, names, text or implementation details into a Roblox game",
      "claims about long-run progression, balance or economy not measured by the captured validation window",
      "inferring hidden combat, dungeon, economy or progression formulas",
      "inferring or copying world-generation, physics or hidden interaction algorithms",
      "copying bundled game artwork, UI trade dress, world content or implementation details into a Roblox game",
      "claims about long-run sandbox progression, balance or performance not measured by the captured validation window",
      "inferring hidden quest, combat, loot, economy, movement-cost, pathfinding or progression formulas",
      "copying Revengate artwork, UI trade dress, names, narrative text, map content or implementation details into a Roblox game",
      "claims about long-run stability, balance or progression outside the captured validation window",
      "inferring hidden puzzle-solving algorithms or correctness logic from the captured run",
      "copying SGTPuzzles artwork, UI trade dress, puzzle content, names or implementation details into a Roblox game",
      "claims about long-run stability or behavior not measured by the captured validation window",
      "hidden algorithm or pathfinding inference from the captured run",
      "copying game artwork, UI trade dress, names or implementation details into a Roblox game",
    },
  },
  -- VERIFIED_EXTERNAL_LEARNING_BINDING_END
}


-- [잡템] 스카이림·위쳐보다 단순하게: 약초 3 · 광물 3 · 몬스터 부위 5 = 11종. 모두 제작·물약에 쓰고, 남는 건 팔 수 있다.
Config.Materials={
  {Field="RedLeaf",Name="붉은잎",Kind="약초",Value=3,Color={210,90,90},Desc="약초 덤불에서 나오는 붉은 잎. 체력 물약 재료야.",Drop="약초 덤불"},
  {Field="Moonbloom",Name="달맞이꽃",Kind="약초",Value=4,Color={190,200,255},Desc="약초 덤불과 박쥐 동굴 큰박쥐에게서 드물게 나와. 기력 물약·장신구·요리 재료야.",Drop="약초 덤불·동굴 큰박쥐"},
  {Field="Mushroom",Name="숲 버섯",Kind="약초",Value=2,Color={196,160,120},Desc="나무·약초 채집 때 가끔 나와. 기력 물약과 요리 재료야.",Drop="나무·약초 채집"},
  {Field="Ore",Name="철광석",Kind="광물",Value=5,Color={150,160,190},Desc="광맥·바위, 그리고 폐광의 고블린에게서 나와. 제련해서 무기·방패·갑옷을 만들어.",Drop="광맥·폐광 고블린"},
  {Field="Crystal",Name="마력 결정",Kind="광물",Value=12,Color={140,150,240},Desc="박쥐·원혼·광맥에서 드물게 나와. 희귀 이상 장신구·장비 제작에 쓰여.",Drop="박쥐·원혼·광맥"},
  {Field="Magma",Name="화산석",Kind="광물",Value=9,Color={240,120,60},Desc="광맥과 보스에게서 얻어. 영웅 이상 갑옷 제작에 쓰여.",Drop="광맥·보스"},
  {Field="Hide",Name="늑대 가죽",Kind="부위",Value=4,Color={176,120,80},Desc="늑대와 고블린이 떨어뜨려. 무두질해서 방어구를 만들어.",Drop="늑대·고블린"},
  {Field="Fang",Name="날카로운 송곳니",Kind="부위",Value=7,Color={235,228,210},Desc="늑대와 소굴 어미가 떨어뜨려. 희귀 이상 무기 제작에 쓰여.",Drop="늑대·소굴 어미"},
  {Field="BatWing",Name="박쥐 날개",Kind="부위",Value=4,Color={120,100,150},Desc="박쥐 둥지에서 얻어. 신발 제작에 쓰여.",Drop="박쥐"},
  {Field="Claw",Name="늑대 발톱",Kind="부위",Value=3,Color={205,195,175},Desc="늑대가 떨어뜨려. 장갑 제작에 쓰여.",Drop="늑대"},
  {Field="Ingot",Name="철 주괴",Kind="가공",Value=14,Color={190,196,206},Desc="화로에서 광석 2개를 녹여 만들어. 무기·갑옷 제작의 핵심 재료야.",Refine={From="Ore",Need=2,Verb="제련",Note="광석 2 → 주괴 1",Station="Smelter"}},
  {Field="Meat",Name="생고기",Kind="부위",Value=4,Color={196,98,92},Desc="늑대와 소굴 어미에게서 얻어. 마을 식당 화덕에서 요리하면 회복과 버프를 줘.",Drop="늑대·소굴 어미"},
  {Field="Steel",Name="강철 주괴",Kind="가공",Value=44,Color={146,168,196},Desc="제련로에서 철 주괴 3개를 담금질해 만들어. 대장 Lv4부터 가능하고, 희귀 이상 무기·방패의 재료야.",Refine={From="Ingot",Need=3,Verb="강철 제련",Note="주괴 3 → 강철 주괴 1 (대장 Lv4)",Level=4,Station="Smelter"}},
  {Field="Leather",Name="무두질 가죽",Kind="가공",Value=10,Color={150,98,60},Desc="가죽 걸이에서 늑대 가죽 2장을 가공해 만들어. 갑옷·장화·장갑에 쓰여.",Refine={From="Hide",Need=2,Verb="무두질",Note="가죽 2 → 무두질 가죽 1",Station="Tanner"}},
  {Field="Feather",Name="바람 깃털",Kind="부위",Value=9,Color={190,226,246},Desc="바람 절벽의 박쥐 둥지와 오크 정찰병에게서만 나와. 절벽 지역 전용 장갑·방패의 재료야.",Drop="바람 절벽 박쥐·정찰병"},
  {Field="Ectoplasm",Name="원혼의 잔재",Kind="부위",Value=8,Color={150,230,220},Desc="원혼이 남기는 차가운 잔재. 전설 장신구 제작에 쓰여."},
}
Config.MaterialByField={}
Config.CostFields={"Wood","Stone"}
for _,mat in ipairs(Config.Materials) do
  Config.MaterialByField[mat.Field]=mat
  table.insert(Config.CostFields,mat.Field)
end
table.insert(Config.CostFields,"Coins")
-- 부위별 대표 재료: 무기=철광석+송곳니, 가슴=가죽+화산석, 장갑=가죽+발톱, 각반=가죽+철광석, 신발=가죽+박쥐 날개, 장신구=달맞이꽃+결정+잔재.
for _,item in ipairs(Config.MeadowEquipment) do
  local t=({Uncommon=1,Rare=2,Epic=3,Legendary=4})[item.Rarity or "Common"]
  if t and not item.Starter then
    local function add(field,n) if n>0 then item[field]=(item[field] or 0)+n end end
    if item.Slot=="Weapon" then add("Ore",2*t);add("Fang",t-1);if item.Bow then add("Hide",2*t) end
    elseif item.Slot=="Shield" then add("Ore",2*t);add("Hide",2*t)
    elseif item.Slot=="Chest" then add("Hide",2*t);add("Magma",t-2)
    elseif item.Slot=="Hands" then add("Hide",t);add("Claw",t)
    elseif item.Slot=="Legs" then add("Hide",t);add("Ore",t)
    elseif item.Slot=="Feet" then add("Hide",t);add("BatWing",t)
    elseif item.Slot=="Cape" then add("Hide",t)
    else add("Moonbloom",t);add("Crystal",t-1);add("Ectoplasm",t-3) end
  end
  -- [위쳐·스카이림식 제작] 장비 제작은 나무·돌을 쓰지 않는다. 사냥한 몬스터 부위(가죽·송곳니·발톱·날개),
  -- 광맥의 광석·화산석, 약초·결정으로만 만든다. 나무·돌은 시설 건설과 무기 강화에만 남긴다.
  if not item.Starter then
    item.Wood=nil
    item.Stone=nil
    -- [스카이림식 가공] 날것(광석·가죽)이 아니라 제련·무두질한 재료(주괴·가죽)로 만든다. 2:1 환산.
    if (item.Ore or 0)>0 then item.Ingot=math.ceil(item.Ore/2);item.Ore=nil end
    if (item.Hide or 0)>0 then item.Leather=math.ceil(item.Hide/2);item.Hide=nil end
    -- 고급 이상 장비는 철광석 한두 개를 기본으로 더해 대장간 제작의 느낌을 준다.
    if t and item.Slot~="Accessory" and (item.Ingot or 0)==0 then item.Ingot=math.max(1,math.ceil(t/2)) end
  end
end
for _,tonic in ipairs(Config.MeadowConsumables) do
  if tonic.Id=="herbal_tonic" then tonic.RedLeaf=2 else tonic.Moonbloom=1;tonic.Mushroom=1 end
end

-- [대륙 지도] 서버 지형·몬스터 배치와 클라이언트 전체 지도가 같은 표를 읽는다. +X=동쪽, +Z=남쪽.
Config.WorldMap = {
  Bounds = {X0 = -2400, X1 = 6400, Z0 = -2400, Z1 = 2400},
  Village = {X0 = -352, X1 = 352, Z0 = -352, Z1 = 352},
  -- 지역(홀드)은 사각형이 아니라 '중심점 + 가중 거리 + 잡음'으로 나뉜다. ZoneAt(x,z)가 서버·클라이언트 공통 판정이다.
  Zones = {
    {Id="meadow",    Name="초원 평야",   Bit=1,    Seed={0,0},       W=.72, Color={78,140,82}},
    {Id="windcliff", Name="바람 절벽",   Bit=64,   Seed={-1700,100}, W=1,   Color={118,150,96}},
    {Id="worldtree", Name="세계수 숲",   Bit=2,    Seed={1200,0},    W=1,   Color={40,110,98}},
    {Id="volcano",   Name="재의 황야",   Bit=4,    Seed={2400,0},    W=1,   Color={130,56,42}},
    {Id="oasis",     Name="모래 폐허",   Bit=8,    Seed={3600,0},    W=1,   Color={190,160,98}},
    {Id="swamp",     Name="안개 늪지",   Bit=16,   Seed={4800,0},    W=1,   Color={70,92,66}},
    {Id="citadel",   Name="불타는 성채", Bit=32,   Seed={5850,0},    W=1,   Color={96,40,40}},
    {Id="highland",  Name="북부 고원",   Bit=128,  Seed={-900,-1700},W=1,   Color={128,128,120}},
    {Id="canyon",    Name="고대 협곡",   Bit=256,  Seed={1500,-1700},W=1,   Color={150,102,70}},
    {Id="chaos",     Name="혼돈의 대지", Bit=512,  Seed={4300,-1700},W=1,   Color={82,46,70}},
    {Id="wetland",   Name="남부 습원",   Bit=1024, Seed={-700,1750}, W=1,   Color={74,112,84}},
    {Id="desert",    Name="황금 사막",   Bit=2048, Seed={2800,1750}, W=1,   Color={214,184,118}},
    {Id="deadmarsh", Name="죽음의 늪",   Bit=4096, Seed={5200,1750}, W=1,   Color={58,70,52}},
  },
  Waypoints = {
    {"초원 이정표",520,-300},{"숲 어귀 야영지",1000,500},{"세계수 제단",1300,-700},{"갈림길 주막터",1800,300},
    {"부서진 감시탑",2100,-800},{"재의 제단",2500,600},{"용암 감시초소",2900,-500},{"옛 광산 입구",3200,800},
    {"모래 오벨리스크",3700,-650},{"침몰한 사원",4100,500},{"안개 부두",4600,-700},{"늪 마녀의 오두막",4900,700},
    {"저주받은 성문",5500,-600},{"불꽃 대장간 터",5800,700},{"성채 외곽 초소",6100,-300},{"군주의 옥좌 앞",6300,300},
    {"북부 감시탑",-1200,-1800},{"고대 협곡 제단",1600,-1900},{"혼돈의 균열",4500,-1800},{"바람 절벽 등대",-1700,300},
    {"남부 습원 부두",-600,1900},{"황금 사막 폐허",2900,1900},{"죽음의 늪 사당",5300,1900},{"서쪽 옛 요새",-1800,-800},
    -- [생태 거점 이정표] 새 거점·전설 크리처 길목에 둔 이정표(25~32). 비트 마스크 한계(32) 때문에 여기까지.
    {"협곡 지룡 전망대",1580,-1760},{"고원 폐광 초소",-820,-1720},{"습원 히드라 나루",-660,1720},{"세계수 뿌리 야영지",1200,10},
    {"오아시스 호수 나루",3620,-70},{"안개 늪 허브",4800,10},{"혼돈 서리 초소",4330,-1640},{"성채 서쪽 보루",5850,40},
  },
}


-- [지역 판정] 가중 거리 + 완만한 잡음으로 경계가 구불구불한 홀드를 만든다. 마을 사각형과 옛 섬 세 곳은 항상 자기 지역.
do
  local W = Config.WorldMap
  local b = W.Bounds
  local islands = {worldtree = 1200, volcano = 2400, oasis = 3600}
  function W.ZoneAt(x, z)
    if x < b.X0 or x >= b.X1 or z < b.Z0 or z >= b.Z1 then return nil end
    local v = W.Village
    if x >= v.X0 and x < v.X1 and z >= v.Z0 and z < v.Z1 then return "meadow" end
    for id, cx in pairs(islands) do
      if math.abs(x - cx) <= 215 and math.abs(z) <= 215 then return id end
    end
    local best, bestId = math.huge, "meadow"
    for index, zone in ipairs(W.Zones) do
      local dx, dz = x - zone.Seed[1], z - zone.Seed[2]
      local score = math.sqrt(dx * dx + dz * dz) * zone.W + math.noise(x / 520, z / 520, index * 3.7) * 330
      if score < best then best, bestId = score, zone.Id end
    end
    return bestId
  end
  function W.RandomPoint(zoneId, random, margin)
    margin = margin or 60
    for _ = 1, 120 do
      local x = random:NextNumber(b.X0 + margin, b.X1 - margin)
      local z = random:NextNumber(b.Z0 + margin, b.Z1 - margin)
      if W.ZoneAt(x, z) == zoneId then return x, z end
    end
    return nil
  end
  W.Cell = 100
  W.Cols = (b.X1 - b.X0) // W.Cell
  W.Rows = (b.Z1 - b.Z0) // W.Cell
  local indexOf = {}
  for index, zone in ipairs(W.Zones) do indexOf[zone.Id] = index; zone.Area = 0 end
  W.Grid = {}
  for row = 1, W.Rows do
    local line = table.create(W.Cols)
    for col = 1, W.Cols do
      local id = W.ZoneAt(b.X0 + (col - .5) * W.Cell, b.Z0 + (row - .5) * W.Cell)
      local index = indexOf[id] or 1
      line[col] = index
      W.Zones[index].Area += W.Cell * W.Cell
    end
    W.Grid[row] = line
  end
end

-- [탐험 지점] 스카이림식 자동 발견: 가까이 가면 이름이 뜨고 지도에 기록된다. 좌표는 고정 시드로 서버·클라이언트가 같게 만든다.
do
  local random = Random.new(2718)
  local kinds = {
    {Id="ruin", Icon="▲", Names={"무너진 신전","잊힌 제단","부서진 석상","옛 기사단 초소","이끼 낀 성벽"}},
    {Id="cave", Icon="●", Names={"어두운 동굴","메아리 동굴","박쥐 소굴","광부의 갱도","젖은 굴"}},
    {Id="camp", Icon="⌂", Names={"버려진 야영지","약탈자의 캠프","사냥꾼의 쉼터","불탄 마차","상인의 흔적"}},
    {Id="shrine", Icon="✦", Names={"마력의 샘","고대 비석","속삭이는 돌","별빛 제단","잊힌 무덤"}},
  }
  local pois = {}
  local village = Config.WorldMap.Village
  for _, zone in ipairs(Config.WorldMap.Zones) do
    local count = math.max(3, math.floor(zone.Area / 1100000))
    for _ = 1, count do
      if #pois >= 60 then break end
      local x, z = Config.WorldMap.RandomPoint(zone.Id, random, 80)
      if x and not (x > village.X0 - 80 and x < village.X1 + 80 and z > village.Z0 - 80 and z < village.Z1 + 80) then
        local kind = kinds[random:NextInteger(1, #kinds)]
        table.insert(pois, {Name = kind.Names[random:NextInteger(1, #kind.Names)], Kind = kind.Id, Icon = kind.Icon,
          X = math.floor(x), Z = math.floor(z), Zone = zone.Id})
      end
    end
  end
  local notes = {
    ruin = {"석벽에 렌스기사단 문장이 새겨져 있다. 문장 아래 '숲을 지켜라'라는 글자가 지워졌다.","부서진 방패 아래 서약문 한 조각. 서명란에 이름이 둘 있었는데 하나가 칼로 긁혀 있다.",
      "제단에 식은 촛농이 남아 있다. 누군가 매일 밤 이곳에 와서 같은 이름을 불렀다.","무너진 벽 틈에 보급 장부 쪽지. 숫자가 전쟁 내내 같다.","기사의 투구가 돌 위에 놓여 있다. 안쪽에 아이가 쓴 편지가 접혀 있다.","석상의 눈이 가려져 있다. 누가 일부러 본 것을 가리려 했다."},
    cave = {"동굴 벽에 긁은 숫자들. 날짜인지 사람 수인지 알 수 없다.","젖은 바닥에 군화 자국이 한 방향으로만 이어진다. 나온 자국은 없다.","광부의 곡괭이 옆에 마력 결정 조각. 만지면 속삭임이 들린다.","박쥐 떼가 날아간 자리에 낡은 깃발. 렌스기사단의 것이다.","굴 안쪽 벽에 지도가 그려져 있다. 한 곳에 붉은 X 표시.","횃불이 아직 타고 있다. 방금 전까지 누군가 있었다."},
    camp = {"식은 모닥불 곁에 일기장. 마지막 줄: '내일은 숲이 열린다던데.'","약탈자의 캠프. 훔친 물건 중에 기사단 인장이 섞여 있다.","사냥꾼의 쉼터. 벽에 늑대 발자국과 '저주받은 개체는 목걸이를 찬다'는 메모.","불탄 마차 잔해. 짐칸에서 미나 군수대장의 서명이 든 보급 상자가 나왔다.","버려진 천막 안에 반쯤 쓰다 만 편지. 받는 이는 '카인'이다.","상인의 흔적. 팔지 못한 약초 꾸러미와 '여기도 안전하지 않다'는 쪽지."},
    shrine = {"샘물이 수면 아래서 빛난다. 비친 얼굴이 내 것이 아니다.","고대 비석에 마력숲의 지도. 지금의 숲과 모양이 다르다.","속삭이는 돌이 이름을 묻는다. 대답하지 못하자 조용해졌다.","별빛 제단 위에 꽃이 놓여 있다. 갓 꺾은 것이다.","잊힌 무덤. 묘비에 이름 대신 숫자만 새겨져 있다.","마력이 흐르는 돌. 숲이 진짜가 아니라는 낙서가 남아 있다."},
  }
  for index, poi in ipairs(pois) do
    poi.Note = notes[poi.Kind][((index * 5) % 6) + 1]
  end
  Config.WorldMap.Pois = pois
  -- 기록 조각 장: 발견한 장소 수에 따라 열리는 이야기. 순서와 상관없이 어디서든 모을 수 있다(자유 탐험의 메인 줄기).
  Config.WorldMap.Chapters = {
    {Need = 5,  Title = "기사단의 흔적", Text = "렌스기사단은 20년 전 마력숲을 지키려 대륙 전역에 초소를 세웠다. 흩어진 기록은 같은 날짜에서 끊긴다.", Coins = 80},
    {Need = 12, Title = "갈라진 서약", Text = "서약문에는 두 이름이 있었다. 한 사람은 숲을 닫자고, 한 사람은 열어 두자고 했다. 한 이름은 지워졌다.", Coins = 160},
    {Need = 20, Title = "침묵의 장부", Text = "보급 장부의 숫자는 전쟁 내내 같다. 줄지 않은 보급품은 누구를 위한 것이었을까.", Coins = 260},
    {Need = 30, Title = "거짓 숲의 비밀", Text = "지도 속 숲과 지금의 숲은 다르다. 누군가 마력으로 숲을 새로 지었다. 이곳은 원본이 아니다.", Coins = 400},
    {Need = 45, Title = "미러의 탑", Text = "비춘 얼굴을 가두는 탑. 사라진 단원들의 이름이 탑 아래에 묻혀 있다. 카인의 이름도 거기 있다.", Coins = 600},
    {Need = 60, Title = "마지막 기록", Text = "모든 조각을 모았다. 기사단은 숲을 지키지 못한 게 아니라, 스스로 숲이 되어 대륙을 지켰다. 이야기는 이제 네 선택으로 이어진다.", Coins = 1000},
  }
  -- 유물: 던전 보스 상자에서 하나씩 얻는다. 보유 수만큼 모든 공격 피해 +5%.
  Config.WorldMap.Relics = {
    "해적왕의 나침반","뿌리 지킴이의 씨앗","용암 심장","모래 여왕의 눈물","독개구리 왕관","혼돈의 파편",
    "지하묘지 수문장의 인장","고블린 왕의 이빨","심연 제단의 불씨","거울 정원의 관",
  }
end

-- [연계 퀘스트] 메인 1줄 + 서브 3줄 + 숨겨진 지역 1줄. 단계마다 목표(도달·처치·재료)와 이야기 조각이 이어진다.
-- Need: 시작 조건(어디서든 자유롭게) {Zone=지역 발견 | Chapter=기록 장 번호 | Companion=동료 id | Field=저장 수치}. 단계 Type: reach(좌표) / kill(Zone+Named|Lord|Contract) / loot(Field,Count).
Config.QuestLines = {
  {Id="mirror", Name="[메인] 미러의 탑을 찾아서", Kind="Main", Field="QLMirror", Need={Chapter=2},
   Intro="기록 조각이 한 방향을 가리킨다. 북쪽 고원 너머, 사라진 단원들이 갇힌 '미러의 탑'.",
   Steps={
    {Type="reach", X=-1200, Z=-1800, R=70, Title="북부 감시탑에 오르다", Text="북부 감시탑 꼭대기에 카인의 이름이 적힌 쪽지가 있다.", Done="쪽지: '탑은 고원의 수문장이 쥔 열쇠로만 열린다.'"},
    {Type="kill", Zone="highland", Named=true, Count=1, Title="고원의 수문장을 쓰러뜨려라", Text="북부 고원의 명명 보스를 처치해 열쇠 조각을 얻어라.", Done="열쇠 조각에 거울 문양이 새겨져 있다. 혼돈의 균열을 가리킨다."},
    {Type="reach", X=4500, Z=-1800, R=80, Title="혼돈의 균열에 도착", Text="혼돈의 대지 한복판 균열로 가라.", Done="균열 속에서 거울에 비친 단원들의 그림자가 손짓한다."},
    {Type="kill", Zone="chaos", Lord=true, Count=1, Title="혼돈의 지배자를 쓰러뜨려라", Text="균열을 지배하는 심연 군주를 쓰러뜨려라.", Done="군주가 쥐고 있던 마지막 열쇠가 부서지며 길이 열린다."},
    {Type="reach", X=6300, Z=300, R=70, Title="옥좌 앞의 마지막 문", Text="불타는 성채 군주의 옥좌 앞으로 가라.", Done="옥좌 뒤 벽이 갈라진다. 서쪽 옛 요새에 숨겨진 문이 열렸다. 거울 정원이 부르고 있다."},
   },
   Reward={Coins=900, Xp=700, Crystal=5, OpenHidden=true}},
  -- [초원 대장장이 연속 의뢰] 스카이림식 작업대(제련로·무두질 틀·모루·숫돌)를 직접 써 보며 배운다.
  {Id="smith", Name="[서브] 브란의 첫 모루", Kind="Sub", Field="QLSmith", Need={Stage=2},
   Intro="대장장이 브란이 일손이 달려 불평을 한다. 철광석을 캐 와서 제련부터 단련까지 배워 보지 않겠느냐고 한다.",
   Steps={
    {Type="reach", X=-80, Z=-190, R=22, Title="대장장이 브란을 만나라", Text="마을 대장간의 브란에게 가라.", Done="브란: '광석, 주괴, 가죽, 무기. 이 순서야. 먼저 광석 4개부터 캐 와.'"},
    {Type="loot", Field="Ore", Count=4, Title="철광석 4개를 모아라", Text="광산이나 바위 지대에서 광석을 캐라.", Done="브란: '좋은 광석이군. 제련로에서 주괴로 녹여 봐.'"},
    {Type="event", Event="SMELT", Count=2, Title="제련로에서 주괴 2개 제련", Text="가방에서 광석을 고르고 '제련'을 눌러라. 제련로 가까이에서만 돼.", Done="브란: '불을 잘 다루는군. 이번엔 가죽이야.'"},
    {Type="event", Event="TAN", Count=1, Title="무두질 틀에서 가죽 무두질", Text="늑대 가죽 2장을 무두질 틀에서 가공하라.", Done="브란: '질긴 가죽이야. 이제 모루로 가자.'"},
    {Type="event", Event="CRAFT", Count=1, Title="모루에서 첫 무기 제작", Text="가방 장비 탭에서 무기를 골라 모루 근처에서 제작하라.", Done="브란: '내 눈엔 아직 어설프지만, 쓸 만해. 숫돌에 갈아 봐.'"},
    {Type="event", Event="TEMPER", Count=1, Title="숫돌에서 무기 단련", Text="숫돌 가까이에서 무기를 단련(강화)하라.", Done="브란: '날이 살았어. 이제 시험해 봐. 늑대 두 마리다.'"},
    {Type="kill", Count=2, Title="새 무기로 몬스터 2마리 처치", Text="직접 만든 무기로 마을 밖 몬스터를 처치하라.", Done="브란: '잘 휘두르네. 마지막 부탁이 있어.'"},
    {Type="choice", X=-80, Z=-190, R=22, Title="브란의 사례", Prompt="브란: '도와줘서 고맙다. 사례로 무엇을 줄까?'",
     Choices={{Label="강철 주괴 1개 (단단한 재료)", Done="브란이 아껴 둔 강철 주괴를 건넨다. '좋은 물건에 써.'", Steel=1, Coins=100},
              {Label="코인 400 (당장 쓸 돈)", Done="브란이 주머니를 털어 코인을 준다. '다음에 또 부탁해.'", Coins=400}}}
   },
   Reward={Coins=300, Xp=260, Ingot=3, Leather=2}},
  {Id="smith2", Name="[서브] 숯불과 강철", Kind="Sub", Field="QLSmith2", Need={Done="smith"},
   Intro="브란이 강철을 다룰 줄 알아야 진짜 대장장이라고 한다. 철 주괴를 모아 강철 제련에 도전하라.",
   Steps={
    {Type="loot", Field="Ingot", Count=6, Title="철 주괴 6개를 모아라", Text="강철 제련에 철 주괴 3개가 든다. 여유 있게 6개를 모아라. (대장 Lv4 필요)", Done="브란: '충분하군. 제련로에서 강철로 담금질해.'"},
    {Type="event", Event="SMELT_STEEL", Count=1, Title="강철 주괴 제련", Text="제련로에서 철 주괴를 '강철 제련'하라. 대장 Lv4부터 가능해.", Done="브란: '빛깔이 다르지? 이걸로 한 단계 위 무기를 만들어 봐.'"},
    {Type="event", Event="CRAFT_RARE", Count=1, Title="희귀 이상 무기 제작", Text="모루에서 희귀 등급 이상 무기나 방패를 제작하라.", Done="브란: '명장의 손이야. 이건 약속한 보답이다.'"}
   },
   Reward={Coins=700, Xp=500, Steel=2, Crystal=2}},
  {Id="smith3", Name="[서브] 경비병 아린의 방패", Kind="Sub", Field="QLSmith3", Need={Done="smith"},
   Intro="경비병 아린의 방패가 갈라졌다. 브란이 새 방패를 만들어 전해 달라고 부탁한다.",
   Steps={
    {Type="event", Event="CRAFT_SHIELD", Count=1, Title="방패 제작", Text="모루에서 방패를 하나 제작하라.", Done="브란: '튼튼하군. 아린에게 전해 줘.'"},
    {Type="reach", X=-2, Z=-188, R=20, Title="경비병 아린에게 방패 전달", Text="마을 남쪽 중심로의 경비병 아린에게 가라.", Done="아린: '묵직한데 손에 감긴다. 마을을 지킬 때 쓸게.'"},
    {Type="event", Event="CRAFT_BOW", Count=1, Title="사냥꾼의 활 제작", Text="추적자 라온이 활을 주문했다. 모루에서 활을 하나 제작하라.", Done="라온: '시위가 맑게 울어. 고마워, 대장장이.'"}
   },
   Reward={Coins=520, Xp=380, Leather=3, Moonbloom=1}},
  -- [초원 생태 의뢰] 노가다 없이, 자원이 실제로 나는 곳과 그곳을 지키는 몹을 따라가는 스카이림식 퀘스트.
  {Id="mine", Name="[서브] 폐광을 되찾아라", Kind="Sub", Field="QLMine", Need={Done="smith"},
   Intro="브란: '마을 광석은 바닥났어. 동쪽 옛 폐광에 좋은 광맥이 있는데 고블린이 눌러앉았다더군. 쫓아내면 광석은 네 몫이야.'",
   Steps={
    {Type="reach", X=215, Z=-140, R=45, Title="동쪽 폐광터로 가라", Text="마을 동쪽 폐광터. 고블린 감시병이 광맥을 지킨다.", Done="갱도 입구에 고블린 야영지가 있다. 두목만 쓰러뜨리면 흩어질 것이다."},
    {Type="kill", Boss="mine", X=222, Z=-150, Count=1, Title="폐광 고블린 두목을 쓰러뜨려라", Text="야영지 안쪽의 고블린 두목을 처치하라. 졸개는 광석을 들고 다닌다.", Done="두목이 쓰러지자 광맥이 드러난다. 곡괭이로 캐 보자."},
    {Type="event", Event="MINE_ORE", Count=2, Title="되찾은 광맥에서 광석 캐기", Text="폐광 광맥에 다가가 광석을 두 번 캐라.", Done="브란에게 가져가자. 이 광석이면 강철도 노려 볼 만하다."},
    {Type="choice", X=-80, Z=-190, R=22, Title="광맥의 주인", Prompt="브란: '폐광은 이제 안전해. 광맥을 어떻게 쓸까?'",
     Choices={{Label="브란과 함께 운영 (강철 1개)", Done="브란이 갱도 열쇠를 건넨다. '좋은 광석은 대장간으로 보내 줘.'", Steel=1, Coins=120},
              {Label="마을 공용으로 (코인 450)", Done="브란이 웃는다. '인심 좋군. 마을이 고마워할 거야.'", Coins=450}}}
   },
   Reward={Coins=300, Xp=300, Ore=6, Ingot=2}},
  {Id="den", Name="[서브] 늑대 소굴의 어미", Kind="Sub", Field="QLDen", Need={Stage=2},
   Intro="추적자 라온: '서쪽 소굴의 어미 늑대가 새끼들을 몰아 마을 가축을 노려. 그놈 가죽은 상처 없이 질기기로 유명하지.'",
   Steps={
    {Type="reach", X=-250, Z=60, R=45, Title="서쪽 늑대 소굴을 찾아라", Text="마을 서쪽 숲 속 소굴. 늑대들이 먹이를 지키고 있다.", Done="바닥에 뼈와 가죽 조각이 널려 있다. 소굴 안쪽에 큰 그림자가 보인다."},
    {Type="kill", Boss="den", X=-255, Z=55, Count=1, Title="소굴의 어미 늑대를 쓰러뜨려라", Text="소굴 한가운데의 어미 늑대를 처치하라.", Done="어미가 쓰러지자 소굴이 조용해진다. 고급 가죽과 고기가 남았다."},
    {Type="choice", X=-2, Z=-188, R=24, Title="소굴의 전리품", Prompt="라온: '솜씨가 좋군. 가죽을 어떻게 할래?'",
     Choices={{Label="가죽을 직접 쓴다 (무두질 가죽 3장)", Done="라온: '네 손으로 장비를 만들겠다니 좋아. 무두질 틀을 써 봐.'", Leather=3, Hide=2},
              {Label="가죽을 마을에 판다 (코인 400)", Done="라온이 가죽을 상인에게 넘기고 코인을 건넨다.", Coins=400}}}
   },
   Reward={Coins=200, Xp=240, Hide=2}},
  {Id="batcave", Name="[서브] 박쥐 동굴의 약초", Kind="Sub", Field="QLBatCave", Need={Stage=2},
   Intro="식당 주인: '동남쪽 동굴 입구에 달빛꽃이 핀다는데 큰박쥐가 둥지를 틀어 아무도 못 가. 약초와 날개는 요리와 연금에 귀하지.'",
   Steps={
    {Type="reach", X=255, Z=235, R=45, Title="동남쪽 박쥐 동굴로 가라", Text="마을 동남쪽 동굴 입구. 낮에는 잠잠하지만 가까이 가면 깨어난다.", Done="동굴 앞에 약초 덤불이 보인다. 위쪽에 큰박쥐가 매달려 있다."},
    {Type="kill", Boss="batcave", X=258, Z=240, Count=1, Title="동굴의 큰박쥐를 쓰러뜨려라", Text="둥지의 큰박쥐를 처치하라. 날개와 마력 수정을 떨군다.", Done="큰박쥐가 떨어진다. 이제 약초를 캘 수 있다."},
    {Type="event", Event="GATHER_HERB", Count=1, Title="동굴 앞 약초 채집", Text="동굴 앞 약초 덤불에서 약초를 채집하라.", Done="달빛꽃과 버섯이 가득하다. 식당에 가져가자."},
    {Type="choice", X=63, Z=-104, R=24, Title="식당 주인의 부탁", Prompt="식당 주인: '귀한 걸 가져왔네! 어떻게 쓸까?'",
     Choices={{Label="요리 재료로 (달빛꽃 3)", Done="주인이 달빛꽃 요리를 시험해 본다. 화덕에서 새 메뉴를 노려 보자.", Moonbloom=3},
              {Label="연금 재료로 (마력 수정 2)", Done="주인이 수정과 바꿔 준다. '약초는 내가 쓸게.'", Crystal=2}}}
   },
   Reward={Coins=240, Xp=260, Moonbloom=1}},
  {Id="stones", Name="[서브] 촌장 나린의 옛 비석", Kind="Sub", Field="QLStones", Need={Stage=2},
   Intro="촌장 나린: '초원 세 곳에 기사단이 세운 비석이 있었다. 길을 따라 순찰하며 비석을 확인해 줘. 위험한 구간은 알아서 지나가고.'",
   Steps={
    {Type="reach", X=0, Z=-270, R=40, Title="북쪽 비석", Text="마을 북쪽 초원 끝의 비석을 확인하라.", Done="비석: '렌스 기사단, 청월의 길 시작점.' 이끼에 가려져 있다."},
    {Type="reach", X=-270, Z=40, R=40, Title="서쪽 비석", Text="서쪽 숲 어귀의 비석을 확인하라.", Done="비석: '늑대를 길들인 자 있어, 이 소굴을 지켰다.'"},
    {Type="reach", X=270, Z=40, R=40, Title="동쪽 비석", Text="동쪽 평야의 비석을 확인하라.", Done="비석: '광맥과 동굴을 잇는 길, 기사단의 보급로.'"},
    {Type="choice", X=0, Z=-111, R=30, Title="촌장 나린에게 보고", Prompt="나린: '세 비석이 같은 길을 가리키는군. 이 길은 세계수 숲으로 이어진다. 렌스 기사단의 첫 단서야.'",
     Choices={{Label="단서를 지도에 기록한다 (수정 2)", Done="나린이 지도에 기사단의 길을 그려 넣는다. '이제 숲으로 갈 때가 됐어.'", Crystal=2},
              {Label="촌장에게 맡기고 포상만 받는다 (코인 350)", Done="나린: '내가 고문서를 더 찾아보지. 수고했네.'", Coins=350}}}
   },
   Reward={Coins=200, Xp=360, Moonbloom=2}},
  {Id="mina", Name="[서브] 미나의 사라진 장부", Kind="Sub", Field="QLMina", Need={Chapter=3},
   Intro="보급 장부의 숫자는 전쟁 내내 같았다. 미나 군수대장은 마지막 장부를 사막에 숨겼다.",
   Steps={
    {Type="reach", X=3700, Z=-650, R=70, Title="모래 오벨리스크", Text="오벨리스크 아래에 미나의 표식이 있다.", Done="오벨리스크 밑에서 암호문. 풀려면 수정 3개가 필요하다."},
    {Type="loot", Field="Crystal", Count=3, Title="수정 3개를 모아라", Text="암호를 푸는 데 마력 수정이 쓰인다.", Done="수정에 비친 글자: '장부는 가라앉은 사원에 있다.'"},
    {Type="reach", X=4100, Z=500, R=70, Title="침몰한 사원", Text="침몰한 사원 안쪽으로 가라.", Done="사원 바닥에 장부 상자가 있다. 그러나 지키는 자가 있다."},
    {Type="kill", Zone="desert", Named=true, Count=1, Title="장부의 수호자를 쓰러뜨려라", Text="황금 사막의 명명 보스가 장부를 노린다.", Done="장부를 펼치자 같은 숫자 아래 미나의 한 줄: '진짜 보급품은 숲으로 갔다.'"},
   },
   Reward={Coins=520, Xp=420, Moonbloom=3, Join="mina"}},
  {Id="nick", Name="[서브] 닉의 마지막 초소", Kind="Sub", Field="QLNick", Need={Companion="nick"},
   Intro="닉이 꿈속에서 같은 요새를 본다. 저주가 시작된 곳이다.",
   Steps={
    {Type="reach", X=-1800, Z=-800, R=70, Title="서쪽 옛 요새", Text="닉과 함께 서쪽 옛 요새로 가라.", Done="닉이 벽에 손을 댄다. '여기서 내가 마지막으로 사람이었어.'"},
    {Type="kill", Contract=24, Count=1, Title="저주받은 기사를 쓰러뜨려라", Text="요새를 떠도는 저주받은 기사(계약 표적)를 처치하라.", Done="기사의 목걸이는 닉의 것과 같았다. 저주가 약해진다."},
    {Type="reach", X=1000, Z=500, R=70, Title="숲 어귀로 돌아가기", Text="숲 어귀 야영지에서 닉의 이야기를 마쳐라.", Done="닉: '이제 이름을 기억해. 고마워, 카인.'"},
   },
   Reward={Coins=420, Xp=360, Claw=4}},
  {Id="sera", Name="[서브] 세라의 부러진 방패", Kind="Sub", Field="QLSera", Need={Companion="sera"},
   Intro="세라의 방패에 금이 갔다. 방패를 지켜 준 등대의 옛 주인을 찾아야 한다.",
   Steps={
    {Type="reach", X=-1700, Z=300, R=70, Title="바람 절벽 등대", Text="세라와 함께 바람 절벽 등대로 가라.", Done="등대지기의 일기: '방패를 든 아이가 도적 떼를 막았다.'"},
    {Type="kill", Zone="windcliff", Lord=true, Count=1, Title="절벽의 대장을 쓰러뜨려라", Text="등대를 점령한 오크 군단장을 처치하라.", Done="군단장의 허리에 세라의 방패 조각이 매달려 있었다."},
    {Type="reach", X=520, Z=-300, R=70, Title="초원 이정표로 돌아가기", Text="초원 이정표에서 방패를 수리하라.", Done="세라: '이제 다시 앞에 설 수 있어.'"},
   },
   Reward={Coins=420, Xp=360, Hide=4}},
  {Id="garden", Name="[히든] 거울 정원의 기사단장", Kind="Hidden", Field="QLGarden", Need={Field="HiddenOpen"},
   Intro="숨겨진 문 너머, 렌스기사단의 마지막 기록이 잠든 정원이다.",
   Steps={
    {Type="reach", X=-3500, Z=230, R=70, Title="거울 정원에 들어서다", Text="서쪽 옛 요새의 숨겨진 문으로 거울 정원에 들어가라.", Done="정원 한가운데 비어 있는 투구들. 거울 기사들이 깨어난다."},
    {Type="kill", Zone="garden", Named=true, Count=3, Title="거울 기사 3명을 쓰러뜨려라", Text="단장의 그림자를 지키는 거울 기사들.", Done="기사들이 무너지며 단장의 목소리가 들린다. '왔는가, 카인.'"},
    {Type="kill", Zone="garden", Lord=true, Count=1, Title="거울의 단장 렌스를 마주하라", Text="렌스 단장의 잔영과 마지막으로 싸워라.", Done="렌스: '숲이 된 것은 우리의 선택이었다. 이제 너의 선택이다.'"},
   },
   Reward={Coins=1500, Xp=1200, Relic=10, Crystal=8}},
}


-- [동료 합류 이야기] 동료는 돈으로 고용하지 않는다. 각자의 사연 퀘스트 끝에서 내리는 선택으로 합류(또는 다른 결말)한다.
for _, line in ipairs({
  {Id="sera-join", Name="[동료] 우물 아래의 방패", Kind="Companion", Field="QLSeraJ", Need={Zone="meadow"},
   Intro="마을 우물 밑 봉인석에서 '나는 방패였다'는 속삭임이 들린다. 청월 기사단의 마지막 이름이다.",
   Steps={
    {Type="reach", X=0, Z=-111, R=14, Title="우물 곁에 서기", Text="마을 광장의 우물로 가서 속삭임을 들어라.", Done="봉인석이 흔들린다. 파편을 지키던 존재가 초원에 흩어졌다."},
    {Type="kill", Zone="meadow", Named=true, Count=1, Title="봉인 파편의 수호자", Text="초원의 명명 보스를 쓰러뜨려 봉인 파편을 회수하라.", Done="파편을 쥐자 우물 속 목소리가 또렷해진다. 우물로 돌아가라."},
    {Type="choice", X=0, Z=-111, R=30, Title="봉인의 선택", Text="우물 앞에서 봉인을 풀지 정하라.", Prompt="봉인석 속의 목소리: '나는 청월 기사단의 방패 세라. 단장은 방패를 놓지 못해 괴물이 되었다. 나를 깨우겠는가?'",
     Choices={
      {Label="봉인을 풀어 세라를 깨운다", Done="세라가 방패를 들고 걸어 나온다. '다시 앞에 서겠다. 이름을 불러 줘서 고마워.'", Join="sera", Bond=true, Coins=200},
      {Label="봉인을 풀되 임무로만 청한다", Done="세라가 방패를 들고 나오지만 거리를 둔다. '임무라면 따르겠다. 마음은 천천히 열겠어.'", Join="sera", Coins=450, Moonbloom=3}}},
   },
   Reward={Coins=150, Xp=240}},
  {Id="rowen-join", Name="[동료] 마지막 화살", Kind="Companion", Field="QLRowenJ", Need={Zone="worldtree"},
   Intro="세계수 숲 곳곳에 같은 방향을 가리키는 화살이 박혀 있다. 백송 기사단 궁수의 표식이다.",
   Steps={
    {Type="reach", X=1000, Z=500, R=70, Title="숲 어귀의 첫 화살", Text="숲 어귀 야영지에서 첫 화살을 찾아라.", Done="화살촉에 '제단으로'라고 새겨져 있다."},
    {Type="reach", X=1300, Z=-700, R=70, Title="세계수 제단", Text="세계수 제단의 두 번째 화살을 확인하라.", Done="제단 위 장부 조각. 백송 기사단은 전쟁 비용을 숨긴 장부를 발견해 지워졌다."},
    {Type="kill", Zone="worldtree", Named=true, Count=1, Title="화살 시험의 표적", Text="숲의 명명 보스가 마지막 화살 시험의 표적이다.", Done="숲 위쪽에서 활시위 소리. 누군가 지켜보고 있다."},
    {Type="choice", X=1300, Z=-700, R=60, Title="로웬과의 약속", Text="제단으로 돌아가 로웬을 마주하라.", Prompt="로웬: '장부를 가진 자는 지워졌다. 너는 같은 길을 걸을 건가, 아니면 장부를 태울 건가?'",
     Choices={
      {Label="장부를 함께 지킨다", Done="로웬이 활을 내린다. '그럼 네 길에 화살이 되겠다.' 닉의 저주를 알아본 것도 그녀다.", Join="rowen", Bond=true, Coins=200},
      {Label="장부를 태워 위험을 끊는다", Done="장부가 재가 된다. 로웬은 한참 말이 없다가 활을 든다. '…그래도 네가 옳을 수 있겠지. 따라가겠다.'", Join="rowen", Coins=450, Hide=3}}},
   },
   Reward={Coins=200, Xp=320}},
  {Id="doran-join", Name="[동료] 식지 않는 모루", Kind="Companion", Field="QLDoranJ", Need={Zone="volcano"},
   Intro="식은 용암 속에서 쇠 두드리는 소리가 난다. 홍염 기사단의 대장장이는 모루를 놓지 않았다.",
   Steps={
    {Type="reach", X=2500, Z=600, R=70, Title="재의 제단", Text="재의 제단에서 쇠 소리를 따라가라.", Done="용암 속 모루가 붉게 달아올라 있다."},
    {Type="loot", Field="Magma", Count=2, Title="용암 조각 2개", Text="모루를 식히려면 마그마 조각 2개가 필요하다.", Done="모루가 식자 불에 탄 무기들이 드러난다. 화염 골렘이 된 단원들이 깨어난다."},
    {Type="kill", Zone="volcano", Named=true, Count=1, Title="화염이 된 단원", Text="화염 골렘이 된 동료 단원을 쓰러뜨려라.", Done="단원의 불길이 꺼진다. 도란이 모루 곁에서 일어선다."},
    {Type="choice", X=2500, Z=600, R=60, Title="도란의 모루", Text="재의 제단에서 도란과 마주하라.", Prompt="도란: '이 모루는 병기를 만들라는 명령을 거부한 대가다. 나는 다시 망치를 들어도 되나?'",
     Choices={
      {Label="함께 가자고 청한다", Done="도란이 모루를 어깨에 멘다. '그렇다면 네 칼날부터 벼리자.'", Join="doran", Bond=true, Coins=200},
      {Label="모루를 용암에 돌려보내고 청한다", Done="모루가 용암 속으로 가라앉는다. 도란은 망치 하나만 쥐고 따라나선다. 마그마가 크게 남았다.", Join="doran", Coins=450, Magma=4}}},
   },
   Reward={Coins=260, Xp=400}},
  {Id="ifa-join", Name="[동료] 물에 비친 이름", Kind="Companion", Field="QLIfaJ", Need={Zone="oasis"},
   Intro="오아시스 물에 비친 얼굴이 '자기 이름이 뭐였지?'라고 묻는다. 모래서약 기사단의 치유사 이프다.",
   Steps={
    {Type="reach", X=4100, Z=500, R=70, Title="침몰한 사원", Text="침몰한 사원의 물가로 가라.", Done="물 위에 얼굴이 떠오른다. 대답하지 못한 단원은 모래 속 괴물이 됐다."},
    {Type="kill", Zone="oasis", Named=true, Count=1, Title="이름을 잃은 단원", Text="모래 폐허의 명명 보스를 쓰러뜨려 단원들을 쉬게 하라.", Done="괴물이 사라진 자리에 이프의 목소리가 남는다. 물가로 돌아가라."},
    {Type="choice", X=4100, Z=500, R=60, Title="이프의 이름", Text="사원 물가에서 이프를 불러라.", Prompt="이프: '내 이름이... 이프, 맞나요? 그 이름을 불러 주면 나는 다시 사람으로 돌아갈 수 있어요.'",
     Choices={
      {Label="이프의 이름을 불러 준다", Done="물 위의 얼굴이 웃는다. 이프가 물에서 걸어 나온다. '이제 누군가를 고칠 수 있겠어요.'", Join="ifa", Bond=true, Coins=200},
      {Label="이름 대신 약속만 건넨다", Done="얼굴이 잠시 흔들리다 물에서 걸어 나온다. '이름은 천천히 찾을게요. 그동안 곁에 있을게요.'", Join="ifa", Coins=450, Crystal=4}}},
   },
   Reward={Coins=300, Xp=460}},
}) do table.insert(Config.QuestLines, line) end

-- 동료 동행 중 장소를 발견하면 하는 말(종류별).
Config.CompanionBanter = {
  nick = {ruin="…으르렁. 이 냄새, 기사단의 것이야. 오래됐어.", cave="동굴 안은 피 냄새가 짙어. 조심해, 카인.", camp="누가 급히 떠났어. 발자국이 둘이야.", shrine="이 샘, 어딘가 낯익은데… 기억이 안 나."},
  sera = {ruin="무너진 방패 문양이 있어. 청월 기사단도 이런 곳을 지켰어.", cave="어두운 곳에선 내가 앞장설게.", camp="누군가 남긴 모닥불이야. 아직 온기가 있어.", shrine="이런 곳은 마음이 가라앉아. 조용히 지나가자."},
  rowen = {ruin="화살 자국이 있네. 누군가 여기서 지키다 쓰러졌어.", cave="입구가 좁아. 뒤는 내가 맡을게.", camp="사냥꾼의 쉼터야. 바람이 이쪽으로 불어.", shrine="이 별빛 아래선 활이 더 잘 맞을 것 같아."},
  doran = {ruin="돌 이음새가 훌륭하군. 만든 사람 손이 좋았어.", cave="광석 냄새가 나는데? 좋은 철이 있겠어.", camp="이 천막 말뚝은 내가 벼린 거 같은데…", shrine="이런 돌에는 무기를 벼릴 수 없지. 마음이 먼저 닳을 테니."},
  ifa = {ruin="여기서 많은 이들이 아팠을 거예요. 잠깐 기도할게요.", cave="공기가 습해요. 다치면 바로 말해요.", camp="누가 아픈 몸으로 떠났나 봐요. 약초 냄새가 남아 있어요.", shrine="물이 맑아요. 마음도 맑아지는 것 같아요."},
}


-- [동료 12명] 전원 영입 가능. 성격 수치(B 대담 · C 신중 · G 탐욕 · K 온정 · L 충성, 0~10), 세계관, 서로의 호불호가 AI 행동·대사·협동을 정한다.
-- Arch: tank 방패 / melee 근접 / ranged 원거리 / healer 치유 / rogue 척후 / mage 술사 / bard 음유.
Config.Companions = {
  {Id="nick", Name="닉", Role="늑대인간 보병대장", Arch="melee", B=8, C=3, G=2, K=5, L=9, Skin={186,150,120}, Shirt={96,96,104}, Dmg=14, Interval=1.6, Range=10,
   Worldview="버려진 이들을 버리지 않는다. 이름이 사람을 사람으로 남긴다.", Likes={"rowen","sera"}, Dislikes={"mina"}, Where="메인에서 숲의 일을 마치면 합류"},
  {Id="sera", Name="세라", Role="방패 기사", Arch="tank", B=6, C=8, G=2, K=7, L=10, Skin={190,150,120}, Shirt={60,90,150}, Dmg=9, Interval=1.8, Range=10,
   Worldview="방패는 뒤에 선 사람을 위해 있다. 명령보다 맹세가 무겁다.", Likes={"nick","ifa","cassian"}, Dislikes={"har"}, Where="마을 우물 속삭임 (초원 평야)"},
  {Id="rowen", Name="로웬", Role="추적 궁수", Arch="ranged", B=4, C=7, G=3, K=5, L=6, Skin={200,160,130}, Shirt={70,120,70}, Dmg=13, Interval=2, Range=46,
   Worldview="숲은 거짓말하지 않는다. 거짓말은 언제나 사람이 한다.", Likes={"nick","baren"}, Dislikes={"cassian"}, Where="세계수 숲의 화살"},
  {Id="doran", Name="도란", Role="대장장이 기사", Arch="melee", B=7, C=4, G=6, K=4, L=7, Skin={170,125,100}, Shirt={150,70,50}, Dmg=19, Interval=2.4, Range=9,
   Worldview="쇠는 정직하다. 문제는 그걸 쥔 손이다.", Likes={"har","mina"}, Dislikes={"tibo"}, Where="재의 황야의 모루"},
  {Id="ifa", Name="이프", Role="치유사", Arch="healer", B=2, C=9, G=1, K=10, L=8, Skin={205,170,140}, Shirt={210,200,150}, Dmg=0, Interval=9, Range=0,
   Worldview="이름을 불러 주면 사람은 돌아온다. 아픈 이를 두고 가지 않는다.", Likes={"sera","tibo"}, Dislikes={"morgan"}, Where="모래 폐허의 물가"},
  {Id="mina", Name="미나", Role="군수대장", Arch="rogue", B=3, C=6, G=10, K=3, L=5, Skin={198,160,135}, Shirt={120,100,60}, Dmg=11, Interval=1.7, Range=12,
   Worldview="숫자는 거짓말하지 않는다. 장부 밖의 진실에도 값이 있다.", Likes={"doran"}, Dislikes={"nick","ifa"}, Where="서브 퀘스트 '미나의 사라진 장부' 완료"},
  {Id="har", Name="하르", Role="오크 용병", Arch="melee", B=10, C=1, G=7, K=2, L=4, Skin={110,140,90}, Shirt={90,60,50}, Dmg=21, Interval=2.2, Range=9,
   Worldview="강한 놈이 이긴다. 이유는 이긴 다음에 지어 붙이면 된다.", Likes={"doran"}, Dislikes={"sera","ifa","ria"}, Where="바람 절벽 등대의 용병 (자유 탐험)"},
  {Id="ria", Name="리아", Role="고블린 정찰병", Arch="rogue", B=3, C=10, G=6, K=5, L=6, Skin={130,160,100}, Shirt={80,90,70}, Dmg=12, Interval=1.5, Range=14,
   Worldview="먼저 보고, 먼저 도망치고, 마지막에 웃는 쪽이 이긴다.", Likes={"tibo"}, Dislikes={"har"}, Where="남부 습원 부두의 정찰병 (자유 탐험)"},
  {Id="morgan", Name="모르간", Role="늪 마녀", Arch="mage", B=5, C=5, G=4, K=3, L=5, Skin={190,175,185}, Shirt={70,40,90}, Dmg=15, Interval=2.6, Range=40,
   Worldview="마력은 빚이다. 갚지 않으면 이자가 몸을 먹는다.", Likes={"baren"}, Dislikes={"ifa"}, Where="안개 늪지의 오두막 (자유 탐험)"},
  {Id="baren", Name="바렌", Role="설인 사냥꾼", Arch="melee", B=6, C=6, G=2, K=6, L=8, Skin={180,150,130}, Shirt={90,100,110}, Dmg=16, Interval=2, Range=10,
   Worldview="말은 짧게, 발자국은 길게. 약속은 돌에 새긴다.", Likes={"rowen","morgan"}, Dislikes={"tibo"}, Where="북부 감시탑의 사냥꾼 (자유 탐험)"},
  {Id="tibo", Name="티보", Role="떠돌이 음유시인", Arch="bard", B=2, C=6, G=5, K=8, L=5, Skin={215,180,150}, Shirt={170,70,110}, Dmg=0, Interval=14, Range=0,
   Worldview="이야기가 남으면 사람은 죽지 않는다. 죽음도 노래가 되면 견딜 만하다.", Likes={"ifa","ria"}, Dislikes={"doran","baren"}, Where="초원 이정표의 길손"},
  {Id="cassian", Name="카시안", Role="몰락한 성채 기사", Arch="tank", B=8, C=4, G=3, K=4, L=9, Skin={175,140,115}, Shirt={80,30,30}, Dmg=15, Interval=2, Range=10,
   Worldview="명예는 갑옷이 아니라 선택이다. 늦은 선택도 선택이다.", Likes={"sera"}, Dislikes={"har","rowen"}, Where="저주받은 성문의 기사 (자유 탐험)"},
  {Id="garon", Name="가론", Role="저주 풀린 늑대 사냥꾼", Arch="ranged", B=7, C=5, G=2, K=5, L=8, Skin={150,120,95}, Shirt={90,80,60}, Dmg=15, Interval=1.8, Range=40,
   Worldview="달이 뜰 때마다 내 이름을 외웠다. 이제 누가 불러 주는 이름이 있다.", Likes={"nick","rowen"}, Dislikes={"har"}, Where="세계수 숲의 저주받은 소굴 (저주 해방)"},
  {Id="pafnir", Name="파프니르", Role="탐욕을 버린 용 기사", Arch="melee", B=8, C=3, G=4, K=3, L=7, Skin={170,110,90}, Shirt={140,50,40}, Dmg=22, Interval=2.4, Range=10,
   Worldview="재물에 눈이 멀어 비늘을 얻었다. 비늘을 벗고서야 지킬 것이 보였다.", Likes={"cassian","doran"}, Dislikes={"mina"}, Where="고대 협곡의 지룡 둥지 (저주 해방)"},
  {Id="lyva", Name="리바", Role="독을 이긴 치유 마법사", Arch="healer", B=2, C=8, G=2, K=9, L=7, Skin={195,185,170}, Shirt={80,150,110}, Dmg=0, Interval=8, Range=0,
   Worldview="독은 약과 한 끗 차이다. 나는 그 끗을 넘었다 돌아왔다.", Likes={"ifa","morgan"}, Dislikes={"har"}, Where="남부 습원의 히드라 늪 (저주 해방)"},
  {Id="bemus", Name="베무스", Role="대상의 수호 거신", Arch="tank", B=6, C=6, G=1, K=6, L=10, Skin={200,170,120}, Shirt={170,140,80}, Dmg=13, Interval=2.2, Range=10,
   Worldview="길은 지키는 자가 있어 길이다. 수백 년도 한 번의 걸음으로 시작했다.", Likes={"sera","cassian"}, Dislikes={"mina"}, Where="모래 폐허의 호수 (저주 해방)"},
}
-- 모집 퀘스트(전원 합류, 선택은 유대의 깊이만 바꾼다: 1=가까운 유대 +15% 피해, 2=거리를 둔 합류 +보상).
do
  local function recruit(id, name, zone, stage, wpX, wpZ, intro, reachTitle, reachText, killText, done, promptText, c1, c2)
    return {Id = id .. "-join", Name = "[동료] " .. name, Kind = "Companion", Field = "QL" .. id:sub(1, 1):upper() .. id:sub(2) .. "J",
      Need = {Zone = zone}, Intro = intro,
      Steps = {
        {Type = "reach", X = wpX, Z = wpZ, R = 80, Title = reachTitle, Text = reachText, Done = "그곳에서 낯선 기척이 느껴진다. 근처의 위협을 먼저 정리하라."},
        {Type = "kill", Zone = zone, Named = true, Count = 1, Title = "길목의 위협", Text = killText, Done = done},
        {Type = "choice", X = wpX, Z = wpZ, R = 80, Title = name .. "와(과)의 만남", Text = "만났던 자리로 돌아가라.", Prompt = promptText,
         Choices = {{Label = c1[1], Done = c1[2], Join = id, Bond = true, Coins = 120}, {Label = c2[1], Done = c2[2], Join = id, Coins = 380}}},
      },
      Reward = {Coins = 160, Xp = 260}}
  end
  Config.RecruitLines = {
    recruit("har", "바람 절벽의 용병", "windcliff", 1, -1700, 300, "바람 절벽 등대 근처에서 큰 오크 용병이 일을 구한다는 소문이 돈다.", "등대의 용병", "바람 절벽 등대로 가라.", "등대를 노리는 절벽의 명명 보스를 처치하라.", "용병이 도끼를 어깨에 얹는다.",
      "하르: '같이 싸우자는 거냐? 보수는 이긴 다음에 말해.'", {"등을 맡길 동료로 청한다", "하르: '말은 짧게 하지. 마음에 들어.'"}, {"보수를 주고 고용한다", "하르: '돈이 맞으면 어디든 간다. 나쁘지 않아.'"}),
    recruit("ria", "습원 부두의 정찰병", "wetland", 1, -600, 1900, "남부 습원 부두에서 작은 정찰병이 길 잃은 일행을 안내하고 있다.", "부두의 정찰병", "남부 습원 부두로 가라.", "부두를 위협하는 습원의 명명 보스를 처치하라.", "정찰병이 풀숲에서 고개를 내민다.",
      "리아: '큰 놈을 쓰러뜨렸네? 그럼 같이 가 줄게. 단, 위험하면 난 먼저 뛴다.'", {"믿고 함께 가자고 한다", "리아: '믿는다고? 흠… 도망칠 때 신호는 줄게.'"}, {"길 안내 값을 쳐 준다", "리아: '거래는 깔끔한 게 좋아.'"}),
    recruit("morgan", "안개 늪의 마녀", "swamp", 4, 4900, 700, "안개 늪지 깊은 곳 오두막에서 마녀가 '빚을 갚을 사람'을 찾는다.", "마녀의 오두막", "안개 늪지의 마녀 오두막으로 가라.", "마녀의 오두막을 노리는 늪의 명명 보스를 처치하라.", "마녀가 안개 속에서 모습을 드러낸다.",
      "모르간: '네 마력에도 이자가 붙어 있구나. 갚는 법을 알려 줄까?'", {"마력의 빚을 함께 갚자고 한다", "모르간: '흥미롭네. 오래 걸리겠지만 같이 가지.'"}, {"이자를 대가로 내건다", "모르간: '거래는 거래. 이자는 나중에 받겠어.'"}),
    recruit("baren", "북부 고원의 사냥꾼", "highland", 1, -1200, -1800, "북부 감시탑 아래에서 설인을 쫓는 사냥꾼의 발자국이 끝없이 이어진다.", "감시탑의 사냥꾼", "북부 감시탑으로 가라.", "고원의 명명 보스를 처치하고 사냥꾼의 길을 열어라.", "발자국의 주인이 바위 뒤에서 나온다.",
      "바렌: '…(고개를 끄덕인다) 발자국이 같은 방향이군.'", {"나란히 걷자고 한다", "바렌: '…좋다. 약속은 돌에 새기지.'"}, {"길 값을 내민다", "바렌: '…받아 두지. 걸음은 맞추겠다.'"}),
    recruit("tibo", "초원의 길손", "meadow", 2, 520, -300, "초원 이정표 곁에서 비파를 든 길손이 새 노래의 소재를 찾는다.", "이정표의 길손", "초원 이정표로 가라.", "길손을 위협하는 초원의 명명 보스를 처치하라.", "비파 소리가 다시 울린다.",
      "티보: '당신 이야기를 노래로 남기고 싶어요. 같이 가도 될까요?'", {"함께 노래가 될 이야기를 만들자고 한다", "티보: '좋아요! 첫 소절은 벌써 떠올랐어요.'"}, {"공연 값으로 동행을 청한다", "티보: '후원자라니, 영광이네요. 최고의 노래를 드릴게요.'"}),
    recruit("cassian", "성문의 몰락 기사", "citadel", 6, 5500, -600, "저주받은 성문 앞에서 갑옷 기사가 지키지 못한 문을 지키고 있다.", "성문의 기사", "저주받은 성문으로 가라.", "성문을 짓밟는 성채의 명명 보스를 처치하라.", "투구 아래 눈이 마주친다.",
      "카시안: '늦었지만 이제라도 선택하겠다. 네 곁에서 싸워도 되나?'", {"맹세를 나누자고 청한다", "카시안: '맹세는 가볍지 않다. 받아들이겠다.'"}, {"임무로서 동행을 청한다", "카시안: '임무라면 따르겠다. 명예는 지킨다.'"}),
  }
  for _, line in ipairs(Config.RecruitLines) do table.insert(Config.QuestLines, line) end
end


-- [지역 랜드마크] 멀리서도 보이는 거대 구조물(석상·첨탑·분화구·빛기둥). 처음 조사하면 경험치와 이야기를 얻고 지도에 ✪로 기록된다.
-- Stat: 석상 모델 키 / 높이. Shape: 지형 장식 종류.
Config.WorldMap.MapImage = {Asset=87436201112904, W=1024, H=680, Top=0.0882, Span=0.7566, Left=0.0391, SpanX=0.9219}
-- [저주받은 3인] 추적 3부작 보스 위치(서버 배치와 같은 값). 지도에 표시한다.
Config.WorldMap.Cursed = {
  {Id="mina", Name="저주받은 마녀 미나", X=5000, Z=-300, Field="QLTrack1"},
  {Id="nick", Name="저주받은 늑대인간 닉", X=-1500, Z=-1700, Field="QLTrack2"},
  {Id="lens", Name="영혼을 판 악마 영주 렌스", X=4800, Z=-1800, Field="QLTrack3"},
}
Config.WorldMap.Landmarks = {
  {Id="beacon", Zone="meadow", Name="봉화 언덕의 불탑", X=650, Z=-520, Statue=nil, Shape="spire", Light={255,190,90},
   Lore="렌스기사단이 길 잃은 이를 부르려 세운 봉화탑. 마지막 불은 20년째 꺼지지 않았다. 누가 기름을 대는지는 아무도 모른다."},
  {Id="lighthouse", Zone="windcliff", Name="해풍 절벽의 파수 석상", X=-2100, Z=500, Statue="orc", Height=46, Shape="plateau", Light={150,210,255},
   Lore="바다를 향해 선 거대한 오크 석상. 절벽의 주민은 이 석상이 폭풍을 막는다고 믿고 매년 소금을 바친다."},
  {Id="rootaltar", Zone="worldtree", Name="세계수 뿌리 제단", X=1500, Z=-600, Statue=nil, Shape="giantTree", Light={120,255,170},
   Lore="숲의 시작이라는 거목. 뿌리 사이 제단에는 '숲은 진짜가 아니다'라는 낙서가 그림자처럼 번져 있다."},
  {Id="crater", Zone="volcano", Name="잿불 분화구의 악마상", X=2600, Z=500, Statue="demon", Height=60, Shape="crater", Light={255,110,50},
   Lore="분화구 한가운데 묶인 악마. 쇠사슬은 홍염 기사단이 벼린 것이다. 사슬이 하나 끊어질 때마다 화산이 운다."},
  {Id="obelisk", Zone="oasis", Name="모래 오벨리스크 군", X=3800, Z=-500, Statue="raptor", Height=40, Shape="obelisks", Light={255,230,140},
   Lore="미나의 장부 첫 장이 새겨진 돌기둥들. 기둥이 그리는 그림자가 가리키는 곳에 침몰한 사원이 있다."},
  {Id="mistTower", Zone="swamp", Name="안개 마녀의 탑", X=5000, Z=-500, Statue="toad", Height=36, Shape="spire", Light={160,255,200},
   Lore="안개가 걷히지 않는 늪 한가운데 솟은 탑. 마녀는 이 탑이 늪의 숨구멍이라 말한다. 막으면 숲 전체가 마른다고."},
  {Id="gate", Zone="citadel", Name="불타는 성문의 쌍거인", X=5900, Z=500, Statue="skullorc", Height=70, Shape="gate", Light={255,90,40},
   Lore="성채 정문을 떠받치는 거대한 두 전사. 문이 열리면 그들이 걸어 나온다는 전설이 있다."},
  {Id="throne", Zone="highland", Name="고원 설인의 왕좌", X=-1500, Z=-1900, Statue="yeti", Height=64, Shape="plateau", Light={210,235,255},
   Lore="바위 위에 앉은 거대 설인. 사냥꾼들은 그 곁을 지날 때 모자를 벗는다. 왕좌에는 사냥꾼 발자국만 남았다."},
  {Id="altarOrc", Zone="canyon", Name="해골 대족장의 제단", X=2000, Z=-1900, Statue="skullorc", Height=56, Shape="spire", Light={255,140,70},
   Lore="협곡 붉은 벽에 새겨진 제단. 전쟁 전 오크 부족이 기사단과 맺은 휴전 맹세가 아직 읽힌다."},
  {Id="rift", Zone="chaos", Name="심연의 균열", X=4800, Z=-2000, Statue="demon", Height=92, Shape="crack", Light={190,90,255},
   Lore="땅이 갈라져 보랏빛 마력이 솟는다. 균열 속 거대한 손이 문을 밀고 있다. 이곳이 미러의 탑으로 가는 길목이다."},
  {Id="toadMonument", Zone="wetland", Name="습원 대두꺼비 기념비", X=-1000, Z=1900, Statue="toad", Height=44, Shape="pool", Light={150,255,190},
   Lore="습원 주민이 세운 두꺼비 기념비. 비가 오면 석상 입에서 약수가 흘러내린다. 약초꾼들의 성지."},
  {Id="sphinx", Zone="desert", Name="황금 사막의 스핑크스", X=3200, Z=2000, Statue="beastman", Height=62, Shape="obelisks", Light={255,215,120},
   Lore="수수께끼를 묻는 석상. 대답 대신 이름을 부르면 길을 연다는 소문이 있다. 이프가 이곳에서 처음 이름을 잊었다."},
  {Id="shrineDead", Zone="deadmarsh", Name="죽은 늪의 사당", X=5600, Z=1900, Statue="tribal", Height=38, Shape="pool", Light={110,160,255},
   Lore="푸른 불이 떠다니는 늪 사당. 사당 석상은 주술사의 모습이며, 불빛은 이름을 잃은 단원들이라고 한다."},
}


-- [홀드 마을 4곳] 초원에서 가까운 4개 지역의 거점 마을. 여관(휴식) · 상인(재료 판매) · 정보통(퀘스트 단서) NPC가 있다.
do
  local random = Random.new(3141)
  local defs = {
    {Id="windcliff", Zone="windcliff", Name="해풍촌", Hold="바람 절벽", Inn="소금 주막 주인 마르타", Merchant="소금 상인 베른", Scout="등대 경비 오르간"},
    {Id="highland", Zone="highland", Name="서리목 초소", Hold="북부 고원", Inn="사냥꾼 주막 주인 헬가", Merchant="모피 상인 토르", Scout="늙은 사냥꾼 올라프"},
    {Id="wetland", Zone="wetland", Name="이끼마루", Hold="남부 습원", Inn="약초집 주인 리나", Merchant="약초 상인 파블로", Scout="늪 길잡이 미르"},
    {Id="worldtree", Zone="worldtree", Name="뿌리쉼터", Hold="세계수 숲", Inn="뿌리 여관 주인 에이라", Merchant="수액 상인 로엔", Scout="숲지기 이든"},
    -- [나머지 8개 홀드 마을] 지역 허브(생태 퀘스트 보고 지점) 바로 곁에 둔다. 퀘스트 의뢰인이 그 마을의 정보통이다.
    {Id="volcano", Zone="volcano", Name="재숯 보루촌", Hold="재의 황야", Inn="화덕 주막 주인 카라", Merchant="화산석 상인 바르크", Scout="재의 순찰병", X=2400, Z=60, Buy={Magma=14,Claw=12}},
    {Id="oasis", Zone="oasis", Name="오아시스 시장", Hold="모래 폐허", Inn="오아시스 객주 잔느", Merchant="향료 상인 사이드", Scout="오아시스 상인 하미드", X=3600, Z=60, Buy={Crystal=20,Hide=8}},
    {Id="swamp", Zone="swamp", Name="안개 부두촌", Hold="안개 늪지", Inn="부두 선술집 주인 모나", Merchant="독초 상인 쿠로", Scout="안개 부두 뱃사공", X=4800, Z=60, Buy={Moonbloom=18,Mushroom=8}},
    {Id="citadel", Zone="citadel", Name="외곽 진지", Hold="불타는 성채", Inn="야전 취사병 보르", Merchant="무기 상인 데란", Scout="성채 외곽 척후병", X=5700, Z=60, Buy={Ore=10,Magma=14}},
    {Id="canyon", Zone="canyon", Name="순례자 쉼터", Hold="고대 협곡", Inn="쉼터 주인 아이샤", Merchant="광석 상인 투란", Scout="협곡 순례자", X=1500, Z=-1640, Buy={Ore=10,Fang=10}},
    {Id="chaos", Zone="chaos", Name="균열 감시소", Hold="혼돈의 대지", Inn="감시소 취사병 렌", Merchant="유물 상인 오르페", Scout="균열 감시병", X=4300, Z=-1640, Buy={Crystal=24,Ectoplasm=16}},
    {Id="desert", Zone="desert", Name="황금 시장", Hold="황금 사막", Inn="낙타 여관 주인 라일라", Merchant="황금 상인 자이드", Scout="사막 길잡이 하산", X=2800, Z=1810, Buy={Hide=8,Feather=16}},
    {Id="deadmarsh", Zone="deadmarsh", Name="등불 사당촌", Hold="죽음의 늪", Inn="등불지기 노파 베나", Merchant="뼈 상인 코르", Scout="죽음의 늪 사당지기", X=5200, Z=1810, Buy={Ectoplasm=16,Fang=10}},
  }
  Config.WorldMap.Towns = {}
  for _, d in ipairs(defs) do
    local x, z = d.X, d.Z
    if not x then x, z = Config.WorldMap.RandomPoint(d.Zone, random, 320) end
    d.X, d.Z = x or 0, z or 0
    table.insert(Config.WorldMap.Towns, d)
  end
end

-- [마을 작업장] 12개 마을마다 대장간(제련·무두질·모루·숫돌)과 요리 화덕이 있다. 초원 마을의 원래 작업대는 SmithStations/CookStation 그대로.
do
  Config.CraftSites = {}
  for _, t in ipairs(Config.WorldMap.Towns) do
    table.insert(Config.CraftSites, {Id = t.Id, Name = t.Name .. " 작업장", X = t.X + math.cos(1.2) * 24, Z = t.Z + math.sin(1.2) * 24})
  end
  -- 작업장 중심 기준 배치(스터드). 제작은 작업장 중심에서 Radius 안이면 가능.
  Config.CraftSiteLayout = {
    Smelter = {-3, 0}, Tanner = {-10, 6}, Anvil = {8, -3}, Grindstone = {2, 9}, Cook = {-9, -9},
  }
end

-- [채굴] 지역마다 광맥이 흩어져 있다. 채굴 숙련이 오르면 더 깊은 광맥을 캐고 수확량·희귀 확률이 늘어난다. 낚시는 넣지 않는다.
Config.MiningThresholds = {0, 10, 30, 70, 130, 220}
Config.MiningLevel = function(prof)
  local level = 1
  for i, need in ipairs(Config.MiningThresholds) do if (prof or 0) >= need then level = i end end
  return level
end

-- 곡괭이: 가장 높은 단계가 자동 적용된다. Level=채굴 레벨 보정(더 깊은 광맥), Amount=수확량 보정, Rare=희귀 확률 보정. 광부 NPC가 판다.
Config.Pickaxes = {
  {Name = "철 곡괭이", Level = 0, Amount = 1, Rare = 0, Coins = 300, Ingot = 3, NeedMining = 1},
  {Name = "강철 곡괭이", Level = 1, Amount = 1, Rare = .03, Coins = 900, Ingot = 4, Steel = 2, NeedMining = 3},
  {Name = "수정 곡괭이", Level = 1, Amount = 2, Rare = .08, Coins = 2400, Steel = 4, Crystal = 6, NeedMining = 5},
  {Name = "신화 곡괭이", Level = 2, Amount = 3, Rare = .15, Coins = 5000, Steel = 6, Crystal = 8, Claw = 6, Fang = 6, NeedMining = 6},
}

-- 지역별 광맥: {이름, 재료 필드, 필요 채굴 레벨, 빛 색}. 지역마다 4곳에 이 목록을 돌려 가며 놓는다.
Config.MiningVeins = {
  windcliff = {{"절벽 철광맥", "Ore", 1, {200, 200, 210}}, {"소금 수정맥", "Crystal", 2, {220, 240, 255}}},
  worldtree = {{"뿌리 철광맥", "Ore", 1, {200, 200, 210}}, {"뿌리 수정맥", "Crystal", 2, {150, 255, 200}}},
  volcano = {{"화산석 광맥", "Magma", 2, {255, 120, 60}}, {"심층 철광맥", "Ingot", 3, {255, 200, 150}}},
  oasis = {{"사막 수정맥", "Crystal", 3, {255, 235, 150}}, {"폐허 철광맥", "Ore", 2, {200, 200, 210}}},
  swamp = {{"원혼석 광맥", "Ectoplasm", 3, {150, 230, 220}}, {"늪 철광맥", "Ore", 2, {200, 200, 210}}},
  citadel = {{"성채 심층 철맥", "Ingot", 4, {255, 170, 120}}, {"화염 수정맥", "Crystal", 4, {255, 120, 120}}},
  highland = {{"고원 철광맥", "Ore", 2, {200, 200, 210}}, {"서리 수정맥", "Crystal", 3, {190, 230, 255}}},
  canyon = {{"협곡 화산석맥", "Magma", 3, {255, 140, 80}}, {"협곡 철광맥", "Ore", 2, {200, 200, 210}}},
  chaos = {{"균열 원혼석", "Ectoplasm", 4, {190, 120, 255}}, {"혼돈 수정맥", "Crystal", 5, {200, 150, 255}}},
  wetland = {{"습원 철광맥", "Ore", 1, {200, 200, 210}}, {"이끼 수정맥", "Crystal", 2, {150, 255, 200}}},
  desert = {{"사막 수정맥", "Crystal", 3, {255, 220, 130}}, {"황금 철광맥", "Ingot", 3, {255, 215, 140}}},
  deadmarsh = {{"죽음의 원혼석", "Ectoplasm", 4, {130, 255, 140}}, {"늪 심층 철맥", "Ingot", 4, {170, 190, 170}}},
}

-- [광부 의뢰] 12개 지역마다 광맥 의뢰 서브 퀘스트: 그 지역 광맥 두 종류를 캐서 마을 광부에게 보고한다. 순서·선행 조건 없음.
do
  local eventOf = {Ore = "MINE_ORE", Crystal = "MINE_CRYSTAL", Magma = "MINE_MAGMA", Ectoplasm = "MINE_SOUL", Ingot = "MINE_DEEP"}
  local matName = {Ore = "철광석", Crystal = "마력 결정", Magma = "화산석", Ectoplasm = "원혼의 잔재", Ingot = "철 주괴(심층 철맥)"}
  for _, town in ipairs(Config.WorldMap.Towns) do
    local veins = Config.MiningVeins[town.Zone]
    if veins and veins[1] and veins[2] then
      local v1, v2 = veins[1], veins[2]
      table.insert(Config.QuestLines, {Id = "mine-" .. town.Id, Name = "[광부] " .. town.Name .. "의 광맥 의뢰", Kind = "Sub", Field = "QLMine" .. town.Id,
        Need = {Zone = town.Zone},
        Intro = "광부: '" .. town.Hold .. "의 광맥을 캐 보고 싶으면 이 일을 맡아 줘. " .. v1[1] .. "과(와) " .. v2[1] .. "을(를) 한 번씩 캐 오면 요령을 가르쳐 주지.'",
        Steps = {
          {Type = "event", Event = eventOf[v1[2]], Count = 2, Title = v1[1] .. "에서 " .. matName[v1[2]] .. " 캐기", Text = v1[1] .. "을(를) 두 번 캐라. (채굴 Lv" .. v1[3] .. " 필요)", Done = "광석이 손에 묵직하게 잡힌다."},
          {Type = "event", Event = eventOf[v2[2]], Count = 2, Title = v2[1] .. "에서 " .. matName[v2[2]] .. " 캐기", Text = v2[1] .. "을(를) 두 번 캐라. (채굴 Lv" .. v2[3] .. " 필요)", Done = "깊은 맥에서 좋은 결이 나온다."},
          {Type = "choice", X = town.X, Z = town.Z, R = 110, Title = town.Name .. " 광부에게 보고", Prompt = "광부: '솜씨가 좋군! 사례는 무엇으로 줄까?'",
           Choices = {
             {Label = "철 주괴 2개 + 코인 300", Done = "광부가 주괴와 코인을 건넨다. '좋은 광석은 좋은 무기가 되지.'", Ingot = 2, Coins = 300},
             {Label = "채굴 요령 전수 (채굴 숙련 +12)", Done = "광부가 곡괭이 쥐는 법과 맥 읽는 법을 가르쳐 준다. '이 요령은 평생 가.'", MiningProficiency = 12},
           }},
        },
        Reward = {Coins = 200, Xp = 220}})
    end
  end
end

-- [탈것] 마을 마구간에서 사서 탄다. 넓은 대륙을 가로지르는 빠른 이동 수단. 피격·마을 진입·던전 입장 시 자동으로 내린다.
Config.Mounts = {
  {Id = "donkey", Name = "당나귀", Key = "mon_donkey", Height = 4.2, Speed = 24, Coins = 400},
  {Id = "horse", Name = "말", Key = "mon_horse", Height = 5.2, Speed = 30, Coins = 900},
  {Id = "bull", Name = "황소", Key = "mon_bull", Height = 4.8, Speed = 27, Coins = 1200, Ingot = 2},
  {Id = "stag", Name = "숲사슴", Key = "mon_stag", Height = 5.6, Speed = 34, Coins = 2200, Ingot = 4, Feather = 3},
}

-- [영지 · 성채 꾸미기] 스카이림 하스파이어식. 안식처 곁 영지 터에 건물을 세워 성채를 꾸민다. 플레이어마다 자기 터(5칸)를 가진다.
-- 건물은 등록된 CC0 모델만 쓴다. Cost는 코인·주괴·가죽.
Config.Estate = {
  Slots = 5,
  -- 내실 가구 5칸(EstateB, 칸당 4비트)과 동료 자리 3칸(EstateC, 자리당 5비트).
  Furniture = {
    {Name = "전시 상자", Key = "vxChest", Height = 2.6, Coins = 150},
    {Name = "성배 받침", Key = "item_chalice", Height = 2.2, Coins = 250},
    {Name = "보급 배낭", Key = "item_backpack", Height = 2.4, Coins = 120},
    {Name = "두루마리 서가", Key = "item_scroll", Height = 2, Coins = 180},
    {Name = "전리품 해골", Key = "item_skull", Height = 2.2, Coins = 200},
    {Name = "벽 횃불", Key = "item_torch", Height = 5, Coins = 100},
    {Name = "금괴 더미", Key = "item_gold_ingots", Height = 2, Coins = 400},
    {Name = "광석 진열대", Key = "item_mineral", Height = 2.4, Coins = 220},
    {Name = "작업대", Key = "vxWorkbench", Height = 3, Coins = 300, Ingot = 1},
    {Name = "식탁 접시", Key = "vxPlate", Height = 1.4, Coins = 80},
    {Name = "주머니 선반", Key = "item_pouch", Height = 2, Coins = 90},
    {Name = "주막 화덕", Key = "vxCampfirePit", Height = 3, Coins = 150},
  },
  Catalog = {
    {Name = "농가 별채", Key = "villageHouseA", Height = 12, Coins = 600, Ingot = 2},
    {Name = "관리인 저택", Key = "villageHouseB", Height = 13, Coins = 1000, Ingot = 3, Leather = 2},
    {Name = "곡물 창고", Key = "villageHouseC", Height = 11, Coins = 700, Ingot = 2},
    {Name = "마구간", Key = "villageHouseD", Height = 11, Coins = 700, Ingot = 2},
    {Name = "성문", Key = "vxCastleGate", Height = 15, Coins = 1500, Ingot = 6},
    {Name = "성벽과 모서리 탑", Key = "vxCastleCorner", Height = 12, Coins = 1200, Ingot = 5},
    {Name = "감시탑", Key = "vxTowerBase", Height = 16, Coins = 1400, Ingot = 6, Leather = 2},
    {Name = "높은 성탑", Key = "vxTowerMid", Height = 20, Coins = 2200, Ingot = 9, Leather = 3},
    {Name = "성채 기둥 회랑", Key = "vxCastlePillar", Height = 13, Coins = 900, Ingot = 3},
    {Name = "분수 광장", Key = "villageFountain", Height = 6, Coins = 800, Ingot = 1},
    {Name = "물레방아", Key = "villageWatermill", Height = 10, Coins = 900, Ingot = 3},
    {Name = "시장 노점", Key = "vxStall", Height = 4, Coins = 300, Leather = 1},
    {Name = "정원 문", Key = "vxHedgeGate", Height = 5, Coins = 250},
    {Name = "야영 화덕", Key = "vxCampfirePit", Height = 3, Coins = 150},
    {Name = "등불 거리", Key = "villageLantern", Height = 7, Coins = 200},
  },
}

-- [바람 절벽 생태 거점] 해풍촌 둘레에 자원이 나는 곳과 그곳을 지키는 몹을 둔다. 서버(몹·채집점)와 퀘스트가 같은 좌표를 읽는다.
do
  local town
  for _, t in ipairs(Config.WorldMap.Towns) do if t.Id == "windcliff" then town = t end end
  if town then
    Config.WorldMap.EcoCamps = {
      cliffmine = {X = town.X + 150, Z = town.Z - 110, Name = "절벽 광산"},
      cliffnest = {X = town.X - 60, Z = town.Z + 170, Name = "바람 박쥐 둥지"},
      orccamp   = {X = town.X - 160, Z = town.Z - 130, Name = "오크 정찰 야영지"},
    }
  end
end

-- [랜드마크 축복] 랜드마크를 처음 조사하면 두 가지 중 하나를 고른다: 지역 특산 재료 또는 수정+경험치.
Config.LandmarkBlessing = {
  meadow={"Moonbloom",2,"달맞이꽃"}, windcliff={"Feather",3,"바람 깃털"}, worldtree={"Moonbloom",3,"달맞이꽃"},
  volcano={"Magma",3,"화산석"}, oasis={"Crystal",3,"마력 수정"}, swamp={"Ectoplasm",3,"원혼의 잔재"},
  citadel={"Magma",4,"화산석"}, highland={"Claw",3,"늑대 발톱"}, canyon={"Steel",1,"강철 주괴"},
  chaos={"Crystal",4,"마력 수정"}, wetland={"Moonbloom",3,"달맞이꽃"}, desert={"Fang",3,"송곳니"},
  deadmarsh={"Ectoplasm",3,"원혼의 잔재"},
}

-- [지역 생태 거점 · 세계수 숲 / 재의 황야] 자원이 나는 곳(광맥·약초)과 지키는 몹, 그리고 거기서 시작하는 서브퀘스트를 한 표에서 만든다.
-- 서버는 같은 표로 몹·채집점을 놓고, 아래 반복문이 퀘스트 줄을 만든다. 섬 지형(중심 ±215) 안쪽에만 둔다.
Config.EcoRegions = {
  {Zone="worldtree", HubX=1200, HubZ=0, Giver="숲지기 이든", Camps={
    {Id="spidernest", Name="거미 군락", X=1120, Z=-120, Title="[서브] 거미 군락의 약초",
     Intro="숲지기 이든: '북서쪽 뿌리 틈에 거미가 군락을 틀었어. 그 밑에 달맞이꽃이 한가득인데 아무도 못 가져와. 여왕만 쓰러뜨려 줘.'",
     Reach="뿌리 틈 아래 약초가 보이지만 거미들이 실을 쳐 놨다.", BossDone="여왕이 쓰러지고 실이 느슨해진다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="spider",name="숲 거미",tier=4,height=3.4,hp=1.5,dmg=1.2,drops={{"Fang",.5,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="spider",name="거미 군락의 여왕",tier=5,height=6,hp=3.2,dmg=1.7,dx=8,dz=-6,drops={{"Fang",1,3},{"Moonbloom",.8,2},{"Crystal",.5,1}}},
     ChoiceA={Label="달맞이꽃 4개",Done="이든이 약초 꾸러미를 건넨다. '숲이 고마워할 거야.'",Moonbloom=4},
     ChoiceB={Label="거미 독니 3개",Done="이든이 독니를 건넨다. '무기에 쓰면 매서울 거야.'",Fang=3},
     Reward={Coins=420,Xp=420,Moonbloom=1}},
    {Id="rootvein", Name="뿌리 광맥", X=1290, Z=100, Title="[서브] 뿌리 사이의 광맥",
     Intro="숲지기 이든: '동남쪽 뿌리 틈에서 광석이 드러났어. 하지만 저주받은 웨어울프 무리가 지키고 있지. 우두머리를 쓰러뜨리면 광맥은 네 거야.'",
     Reach="뿌리 틈에서 광석이 반짝인다. 웨어울프들이 서성인다.", BossDone="우두머리가 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="barbarian",name="저주받은 웨어울프",tier=4,height=4.4,hp=1.7,dmg=1.3,drops={{"Ore",.5,1},{"Claw",.4,1},{"Hide",.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="barbarian",name="뿌리 광맥의 우두머리",tier=5,height=6.2,hp=3.4,dmg=1.8,dx=10,dz=-8,drops={{"Ore",1,4},{"Claw",1,3},{"Magma",.4,1}}},
     ChoiceA={Label="강철 1개 + 코인 100",Done="이든이 강철 주괴를 건넨다. '좋은 광석은 대장간으로.'",Steel=1,Coins=100},
     ChoiceB={Label="코인 500",Done="이든이 코인을 건넨다. '뿌리쉼터에 큰 도움이 됐어.'",Coins=500},
     Reward={Coins=400,Xp=400,Ore=6,Ingot=2}},
    {Id="werewolfden", Name="저주받은 소굴", X=1100, Z=110, Title="[서브] 저주받은 소굴",
     Intro="숲지기 이든: '남서쪽 소굴의 웨어울프 우두머리 눈을 봤어? 사냥꾼 가론의 눈이야. 저주에 먹혔어. 죽이지 말고 제압해 줘. 저주는 풀 수도 있어.'",
     Reach="소굴 입구에 뼈가 쌓여 있다. 안쪽에서 낮은 울음이 들린다.", BossDone="우두머리가 쓰러지고 소굴이 조용해진다.",
     Nodes={},
     Guard={model="barbarian",name="저주받은 웨어울프",tier=4,height=4.4,hp=1.7,dmg=1.3,drops={{"Claw",.5,1},{"Hide",.5,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="barbarian",name="소굴의 웨어울프 우두머리",tier=6,height=6.6,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Claw",1,4},{"Hide",1,3},{"Fang",.8,2}}},
     ChoiceA={Label="저주를 풀어 가론을 해방한다",Done="우두머리의 털이 빠지며 사냥꾼 가론이 쓰러진 채 숨을 쉰다. '…내 이름이 가론이었지. 빚을 졌다, 이 칼날로 갚겠다.'",Join="garon",Bond=true,Claw=2,Coins=150},
     ChoiceB={Label="저주받은 괴물로 끝낸다",Done="이든이 발톱과 가죽을 건넨다. '…숲에 또 하나의 전설이 묻혔구나.'",Claw=4,Leather=3,Coins=300},
     Prompt="제압당한 우두머리가 가론의 눈빛으로 올려다본다. 저주를 풀 수 있는 건 지금뿐이다. 어떻게 할까?",
     Reward={Coins=440,Xp=440,Hide=3}},
  }},
  {Zone="volcano", HubX=2400, HubZ=0, Giver="재의 순찰병", Camps={
    {Id="magmavein", Name="용암 광맥", X=2320, Z=-120, Title="[서브] 식은 용암의 광맥",
     Intro="재의 순찰병: '북서쪽 식은 용암 틈에 광맥이 드러났어. 해골 가면 오크들이 눌러앉았지. 대족장을 쓰러뜨리면 광맥을 쓸 수 있어.'",
     Reach="식은 용암 사이로 붉은 광맥이 보인다. 오크들이 지키고 있다.", BossDone="대족장이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="skullorc",name="해골 가면 오크",tier=6,height=4.8,hp=2,dmg=1.6,drops={{"Ore",.6,1},{"Magma",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="skullorc",name="용암 광맥의 대족장",tier=7,height=7,hp=4,dmg=2,dx=10,dz=-8,drops={{"Ore",1,4},{"Magma",1,3}}},
     ChoiceA={Label="화산석 3개",Done="순찰병이 화산석을 건넨다. '영웅 갑옷 재료야.'",Magma=3},
     ChoiceB={Label="강철 2개",Done="순찰병이 강철 주괴를 건넨다. '불에 잘 견뎌.'",Steel=2},
     Reward={Coins=520,Xp=520,Ore=6,Magma=2}},
    {Id="ashaltar", Name="재의 제단", X=2500, Z=110, Title="[서브] 재의 제단의 사제",
     Intro="재의 순찰병: '동남쪽 제단에서 잿불 악마가 불길을 키우고 있어. 사제를 쓰러뜨려 불을 잠재워 줘.'",
     Reach="제단 위에 불꽃이 일렁인다. 악마들이 주위를 돈다.", BossDone="사제가 쓰러지고 불길이 잦아든다.",
     Nodes={},
     Guard={model="demon",name="잿불 악마",tier=6,height=5.2,hp=2,dmg=1.7,drops={{"Magma",.5,1},{"Crystal",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="demon",name="잿불 제단의 사제",tier=7,height=7.4,hp=4.2,dmg=2.1,dx=8,dz=-6,drops={{"Magma",1,3},{"Crystal",1,2},{"Claw",.8,2}}},
     ChoiceA={Label="화산석 4개",Done="순찰병이 화산석을 건넨다. '제단의 불이 남긴 거야.'",Magma=4},
     ChoiceB={Label="마력 수정 3개",Done="순찰병이 수정을 건넨다. '불꽃이 굳은 거야.'",Crystal=3},
     Reward={Coins=540,Xp=540,Magma=2}},
    {Id="raptorden", Name="화산 랩터 둥지", X=2300, Z=100, Title="[서브] 화산 랩터 둥지",
     Intro="재의 순찰병: '남서쪽 둥지의 거대 랩터가 순찰대를 덮쳤어. 우두머리를 쓰러뜨려 줘. 가죽과 송곳니는 네 몫이야.'",
     Reach="둥지 근처에 부서진 갑옷이 널려 있다.", BossDone="거대 랩터가 쓰러지고 둥지가 조용해진다.",
     Nodes={},
     Guard={model="raptor",name="화산 랩터",tier=6,height=4.4,hp=1.8,dmg=1.5,drops={{"Hide",.5,1},{"Fang",.4,1},{"Claw",.4,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="raptor",name="거대 화산 랩터",tier=7,height=7,hp=4,dmg=2.1,dx=8,dz=-6,drops={{"Hide",1,3},{"Fang",1,3},{"Claw",1,3}}},
     ChoiceA={Label="송곳니 3개 + 발톱 3개",Done="순찰병이 부위를 건넨다. '무기와 장갑에 써.'",Fang=3,Claw=3},
     ChoiceB={Label="무두질 가죽 4장",Done="순찰병이 가죽을 건넨다. '화염에 강한 가죽이야.'",Leather=4},
     Reward={Coins=500,Xp=500,Hide=3}},
  }},
  {Zone="oasis", HubX=3600, HubZ=0, Giver="오아시스 상인 하미드", Camps={
    {Id="oasisherb", Name="오아시스 약초밭", X=3520, Z=-120, Title="[서브] 오아시스의 약초밭",
     Intro="오아시스 상인 하미드: '북서쪽 물가 약초밭에 황금 독거미가 알을 깠어. 달맞이꽃이 천지인데 아무도 못 들어가. 여왕만 쓰러뜨려 줘.'",
     Reach="물가에 약초가 무성하지만 모래 위로 독거미가 기어 다닌다.", BossDone="여왕이 쓰러지고 거미들이 흩어진다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="fangspider",name="황금 독거미",tier=6,height=3.4,hp=1.8,dmg=1.5,drops={{"Fang",.6,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="fangspider",name="황금 독거미 여왕",tier=7,height=6,hp=3.6,dmg=1.9,dx=8,dz=-6,drops={{"Fang",1,3},{"Moonbloom",.8,2},{"Crystal",.5,1}}},
     ChoiceA={Label="달맞이꽃 4개",Done="하미드가 약초 꾸러미를 건넨다. '오아시스가 숨을 쉬겠군.'",Moonbloom=4},
     ChoiceB={Label="독니 4개",Done="하미드가 독니를 건넨다. '무기에 쓰면 사막도 베겠어.'",Fang=4},
     Reward={Coins=520,Xp=520,Moonbloom=1}},
    {Id="sandcrystal", Name="폐허 수정 광맥", X=3700, Z=110, Title="[서브] 모래 속 수정 광맥",
     Intro="오아시스 상인 하미드: '동남쪽 무너진 폐허에서 수정 광맥이 드러났어. 그런데 모래 암살자들이 길목을 막았지. 두목을 쓰러뜨리면 광맥은 네 거야.'",
     Reach="폐허 틈으로 수정빛이 새어 나온다. 그림자들이 모래 위를 스친다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="assassin",name="모래 암살자",tier=6,height=4.4,hp=1.8,dmg=1.6,drops={{"Ore",.5,1},{"Claw",.4,1},{"Crystal",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="assassin",name="폐허의 암살자 두목",tier=7,height=6.2,hp=3.6,dmg=2,dx=10,dz=-8,drops={{"Ore",1,4},{"Crystal",1,3},{"Claw",.8,2}}},
     ChoiceA={Label="마력 수정 3개",Done="하미드가 수정을 건넨다. '희귀 장비에 쓰면 좋아.'",Crystal=3},
     ChoiceB={Label="강철 2개",Done="하미드가 강철 주괴를 건넨다. '모래 속에서도 안 녹슬어.'",Steel=2},
     Reward={Coins=540,Xp=540,Ore=6,Crystal=1}},
    {Id="sandraptor", Name="사막 랩터 둥지", X=3500, Z=100, Title="[서브] 사막 랩터 둥지",
     Intro="오아시스 상인 하미드: '남서쪽 둥지의 거대 랩터가 상단을 덮쳤어. 우두머리를 쓰러뜨려 줘. 가죽과 송곳니는 네 몫이야.'",
     Reach="둥지 근처에 부서진 수레가 널려 있다.", BossDone="거대 랩터가 쓰러지고 길이 열린다.",
     Nodes={},
     Guard={model="raptor",name="사막 랩터",tier=6,height=4.4,hp=1.8,dmg=1.5,drops={{"Hide",.5,1},{"Fang",.4,1},{"Claw",.4,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="raptor",name="거대 사막 랩터",tier=7,height=7,hp=4,dmg=2.1,dx=8,dz=-6,drops={{"Hide",1,3},{"Fang",1,3},{"Claw",1,3}}},
     ChoiceA={Label="송곳니 3개 + 발톱 3개",Done="하미드가 부위를 건넨다. '무기와 장갑에 써.'",Fang=3,Claw=3},
     ChoiceB={Label="무두질 가죽 4장",Done="하미드가 가죽을 건넨다. '사막 열기에 강한 가죽이야.'",Leather=4},
     Reward={Coins=520,Xp=520,Hide=3}},
    {Id="oasisbehemoth", Name="베헤모스의 호수", X=3640, Z=-170, Title="[서브] 베헤모스의 호수",
     Intro="오아시스 상인 하미드: '호숫가의 베헤모스는 대상을 지키다 저주받은 수호전사라는 전설이 있어. 제압해 줘. 저주를 풀면 우리 편이 될지도 몰라.'",
     Reach="호숫가에 거대한 발자국이 깊게 패어 있고 바실리스크가 어슬렁거린다.", BossDone="베헤모스가 쓰러지고 호숫길이 열린다.",
     Nodes={},
     Guard={model="parasaur",name="모래 바실리스크",tier=6,style="mage",myth={color=Color3.fromRGB(255,220,80)},height=4.6,hp=1.8,dmg=1.5,drops={{"Hide",.5,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="apatosaur",name="사막의 거신 베헤모스",tier=7,myth={color=Color3.fromRGB(255,190,60),range=28,rate=20},height=9,hp=3.6,dmg=1.9,dx=8,dz=-6,drops={{"Hide",1,3},{"Crystal",.4,1}}},
     ChoiceA={Label="저주를 풀어 베무스를 해방한다",Done="베헤모스의 거대한 몸이 모래로 부서지고, 방패를 든 거구의 전사 베무스가 일어선다. '수백 년 대상을 지키다 괴물이 됐군. 마지막 길까지 지키겠다.'",Join="bemus",Bond=true,Leather=2,Coins=150},
     ChoiceB={Label="저주받은 거신으로 끝낸다",Done="하미드가 가죽과 코인을 건넨다. '덕분에 호숫길이 열렸어.'",Leather=4,Coins=650},
     Prompt="거신의 몸에서 모래가 흘러내리고 그 안에서 전사의 눈이 열린다. 저주를 풀 수 있을 것 같다.",
     Reward={Coins=540,Xp=540,Hide=3}},
  }},
  {Zone="swamp", HubX=4800, HubZ=0, Giver="안개 부두 뱃사공", Camps={
    {Id="swampmush", Name="독버섯 늪", X=4700, Z=-110, Title="[서브] 독버섯 늪의 약초",
     Intro="안개 부두 뱃사공: '북서쪽 늪에 약초가 무성한데 독두꺼비 떼가 지키고 있어. 군주만 쓰러뜨리면 약초는 네 몫이야.'",
     Reach="안개 속에서 약초 덤불이 보인다. 두꺼비 울음이 사방에서 들린다.", BossDone="군주가 쓰러지고 늪이 잠잠해진다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="toad",name="독두꺼비",tier=7,height=3,hp=1.8,dmg=1.5,drops={{"Mushroom",.7,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="toad",name="독두꺼비 군주",tier=8,height=6,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Mushroom",1,3},{"Moonbloom",.8,2},{"Crystal",.5,1}}},
     ChoiceA={Label="달맞이꽃 4개",Done="뱃사공이 약초 꾸러미를 건넨다. '늪이 좀 숨 쉬겠군.'",Moonbloom=4},
     ChoiceB={Label="마력 수정 3개",Done="뱃사공이 수정을 건넨다. '안개가 굳은 거래.'",Crystal=3},
     Reward={Coins=560,Xp=560,Moonbloom=1}},
    {Id="spiderghost", Name="원혼 거미 둥지", X=4900, Z=100, Title="[서브] 원혼 거미의 둥지",
     Intro="안개 부두 뱃사공: '동남쪽 둥지에서 원혼을 먹는 거미가 자라고 있어. 여왕을 쓰러뜨려 줘. 원혼의 잔재는 귀한 재료야.'",
     Reach="둥지 주위 안개가 차갑다. 거미줄에 푸른 불빛이 걸려 있다.", BossDone="여왕이 쓰러지고 푸른 불빛이 흩어진다.",
     Nodes={},
     Guard={model="spider",name="늪 원혼 거미",tier=7,height=3.4,hp=1.8,dmg=1.5,drops={{"Ectoplasm",.6,1},{"Fang",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="spider",name="원혼 거미 여왕",tier=8,height=6.4,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Ectoplasm",1,3},{"Fang",1,3},{"Crystal",.5,1}}},
     ChoiceA={Label="원혼의 잔재 3개",Done="뱃사공이 잔재를 건넨다. '전설 장신구에 쓴다더군.'",Ectoplasm=3},
     ChoiceB={Label="독니 3개",Done="뱃사공이 독니를 건넨다. '독이 아주 매서워.'",Fang=3},
     Reward={Coins=580,Xp=580,Ectoplasm=1}},
    {Id="swampore", Name="늪 고블린 광맥", X=4700, Z=110, Title="[서브] 늪 속 광맥",
     Intro="안개 부두 뱃사공: '남서쪽 늪 바닥에서 광석이 드러났어. 주술전사 무리가 눌러앉았지. 족장을 쓰러뜨리면 광맥은 네 거야.'",
     Reach="늪 가장자리에 광석 수레가 가라앉아 있다. 주술전사들이 서성인다.", BossDone="족장이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="tribal",name="늪 주술전사",tier=7,height=4.4,hp=1.9,dmg=1.6,drops={{"Ore",.5,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="tribal",name="늪 주술사 족장",tier=8,height=6.4,hp=3.8,dmg=2.1,dx=10,dz=-8,drops={{"Ore",1,4},{"Moonbloom",.8,2},{"Magma",.4,1}}},
     ChoiceA={Label="강철 2개",Done="뱃사공이 강철 주괴를 건넨다. '습기에도 잘 버텨.'",Steel=2},
     ChoiceB={Label="코인 600",Done="뱃사공이 코인을 건넨다. '부두가 크게 도움 받았어.'",Coins=600},
     Reward={Coins=580,Xp=580,Ore=6,Ingot=2}},
    {Id="swampglub", Name="독버섯 왕의 늪", X=4880, Z=-110, Title="[서브] 독버섯 왕의 늪",
     Intro="안개 부두 뱃사공: '동쪽 늪에 독버섯 왕이 자라서 약초가 다 썩어. 왕만 쓰러뜨려 줘.'",
     Reach="썩은 늪에 거대한 버섯이 우뚝 서 있다.", BossDone="버섯 왕이 쓰러지고 포자가 가라앉는다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="glub",name="늪 글럽",tier=7,height=3,hp=1.8,dmg=1.5,drops={{"Moonbloom",.4,1},{"Fang",.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="mushroomking",name="독버섯 왕",tier=8,height=6.4,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Moonbloom",1,3},{"Crystal",.5,1}}},
     ChoiceA={Label="달맞이꽃 5개",Done="뱃사공이 약초를 건넨다. '안개가 걷혔네.'",Moonbloom=5},
     ChoiceB={Label="코인 700",Done="뱃사공이 코인을 건넨다. '덕분에 배가 다녀.'",Coins=700},
     Reward={Coins=600,Xp=600,Moonbloom=2}},
  }},
  {Zone="highland", HubX=-900, HubZ=-1700, Giver="늙은 사냥꾼 올라프", Camps={
    {Id="yetiden", Name="설인 동굴", X=-1000, Z=-1810, Title="[서브] 고원 설인의 동굴",
     Intro="늙은 사냥꾼 올라프: '북서쪽 동굴에 설인 떼가 사냥꾼을 해쳤어. 족장을 쓰러뜨려 줘. 가죽과 발톱은 네 몫이야.'",
     Reach="동굴 입구에 큰 발자국이 찍혀 있다.", BossDone="족장이 쓰러지고 동굴이 조용해진다.",
     Nodes={},
     Guard={model="yeti",name="고원 설인",tier=5,height=5,hp=2,dmg=1.5,drops={{"Hide",.6,1},{"Claw",.4,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="yeti",name="동굴의 설인 족장",tier=6,height=7.4,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Hide",1,4},{"Claw",1,3},{"Fang",.6,1}}},
     ChoiceA={Label="발톱 3개 + 가죽 3장",Done="올라프가 부위를 건넨다. '장갑이랑 갑옷에 쓰게.'",Claw=3,Hide=3},
     ChoiceB={Label="무두질 가죽 4장",Done="올라프가 가죽을 건넨다. '질기게 손질해 뒀어.'",Leather=4},
     Reward={Coins=460,Xp=460,Hide=3}},
    {Id="highore", Name="고원 철광맥", X=-800, Z=-1600, Title="[서브] 고원의 철광맥",
     Intro="늙은 사냥꾼 올라프: '동남쪽 바위 사이에 철광맥이 드러났는데 오크 약탈자가 차지했어. 감독을 쓰러뜨리면 광맥을 쓸 수 있어.'",
     Reach="바위 틈에서 광석이 반짝인다. 오크 약탈자들이 보초를 선다.", BossDone="감독이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="orc",name="고원 오크 약탈자",tier=5,height=4.6,hp=2,dmg=1.5,drops={{"Ore",.6,1},{"Hide",.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="orc",name="고원 오크 광산 감독",tier=6,height=6.6,hp=3.6,dmg=1.9,dx=10,dz=-8,drops={{"Ore",1,4},{"Hide",.8,2},{"Magma",.4,1}}},
     ChoiceA={Label="강철 2개",Done="올라프가 강철 주괴를 건넨다. '추위에도 안 갈라져.'",Steel=2},
     ChoiceB={Label="코인 600",Done="올라프가 코인을 건넨다. '초소 보수에 쓰겠네.'",Coins=600},
     Reward={Coins=480,Xp=480,Ore=6,Ingot=2}},
    {Id="wolfmanden", Name="늑대인간 소굴", X=-1000, Z=-1600, Title="[서브] 늑대인간의 소굴",
     Intro="늙은 사냥꾼 올라프: '남서쪽 소굴 앞에 약초밭이 있는데 늑대인간이 지키고 있어. 우두머리를 쓰러뜨리고 약초를 캐 줘.'",
     Reach="소굴 앞 약초밭이 짐승 냄새로 가득하다.", BossDone="우두머리가 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="barbarian",name="고원 늑대인간",tier=5,height=4.6,hp=2,dmg=1.5,drops={{"Claw",.5,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="barbarian",name="소굴의 늑대인간 우두머리",tier=6,height=6.8,hp=3.8,dmg=2,dx=8,dz=-6,drops={{"Claw",1,4},{"Moonbloom",.8,2},{"Fang",.8,2}}},
     ChoiceA={Label="달맞이꽃 4개",Done="올라프가 약초 꾸러미를 건넨다. '기력 물약에 좋지.'",Moonbloom=4},
     ChoiceB={Label="송곳니 3개 + 발톱 3개",Done="올라프가 부위를 건넨다. '무기에 써.'",Fang=3,Claw=3},
     Reward={Coins=480,Xp=480,Moonbloom=1}},
    {Id="highgoblin", Name="고원 고블린 광산", X=-790, Z=-1790, Title="[서브] 고원 고블린 광산",
     Intro="늙은 사냥꾼 올라프: '동쪽 폐광을 고블린 떼가 차지했어. 두목만 쓰러뜨리면 광석은 네 거야.'",
     Reach="폐광 입구에 고블린 척후병이 서성인다.", BossDone="두목이 쓰러지고 폐광이 열린다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="goblinscout",name="고원 고블린 척후병",tier=5,height=3.2,hp=2,dmg=1.5,drops={{"Ore",.5,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="goblin",name="고원 고블린 두목",tier=6,height=5,hp=3.6,dmg=1.9,dx=8,dz=-6,drops={{"Ore",1,4},{"Hide",.5,1}}},
     ChoiceA={Label="강철 1개 + 코인 100",Done="올라프가 강철을 건넨다. '좋은 광석이야.'",Steel=1,Coins=100},
     ChoiceB={Label="코인 550",Done="올라프가 코인을 건넨다. '폐광이 살아났어.'",Coins=550},
     Reward={Coins=480,Xp=480,Ore=5,Ingot=1}},
  }},
  {Zone="canyon", HubX=1500, HubZ=-1700, Giver="협곡 순례자", Camps={
    {Id="canyonore", Name="협곡 광맥", X=1420, Z=-1820, Title="[서브] 협곡 광맥",
     Intro="협곡 순례자: '북서쪽에서 광맥이 드러났는데 협곡 해골 오크이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 협곡 해골 오크들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="skullorc",name="협곡 해골 오크",tier=6,height=4.8,hp=2.04,dmg=1.68,drops={{"Ore",0.6,1},{"Magma",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="skullorc",name="협곡 해골 부대장",tier=7,height=7.2,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Ore",1,4},{"Magma",1,2}}},
     ChoiceA={Label="강철 2개",Done="순례자가 강철 주괴를 건넨다. '협곡의 불에도 안 녹아.'",Steel=2},
     ChoiceB={Label="코인 650",Done="순례자가 코인을 건넨다. '순례길이 한결 안전해졌어.'",Coins=650},
     Reward={Coins=540,Xp=540,Ore=6,Ingot=2}},
    {Id="canyonspider", Name="칼날 거미 굴", X=1600, Z=-1590, Title="[서브] 칼날 거미 굴",
     Intro="협곡 순례자: '동남쪽 칼날 거미 굴에 약초가 무성한데 칼날 거미이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 칼날 거미들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="bladespider",name="칼날 거미",tier=6,height=3.6,hp=2.04,dmg=1.68,drops={{"Fang",0.6,1},{"Moonbloom",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="bladespider",name="칼날 거미 여왕",tier=7,height=5.4,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Fang",1,3},{"Moonbloom",0.8,2},{"Crystal",0.5,1}}},
     ChoiceA={Label="송곳니 4개",Done="순례자가 송곳니를 건넨다. '날이 아주 매서워.'",Fang=4},
     ChoiceB={Label="달맞이꽃 4개",Done="순례자가 약초를 건넨다. '굴 안쪽에서 자란 거야.'",Moonbloom=4},
     Reward={Coins=560,Xp=560,Moonbloom=1}},
    {Id="canyonassassin", Name="암살자 야영지", X=1400, Z=-1600, Title="[서브] 암살자 야영지",
     Intro="협곡 순례자: '남서쪽 암살자 야영지의 협곡 암살자이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="암살자 야영지 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="assassin",name="협곡 암살자",tier=6,height=4.4,hp=2.04,dmg=1.68,drops={{"Claw",0.5,1},{"Crystal",0.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="assassin",name="협곡 암살자 두목",tier=7,height=6.6,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Claw",1,4},{"Crystal",1,2},{"Hide",0.8,2}}},
     ChoiceA={Label="발톱 4개",Done="순례자가 발톱을 건넨다. '장갑 재료로 좋아.'",Claw=4},
     ChoiceB={Label="마력 수정 3개",Done="순례자가 수정을 건넨다. '그림자의 전리품이야.'",Crystal=3},
     Reward={Coins=540,Xp=540,Hide=3}},
    {Id="canyonwyrm", Name="협곡 지룡의 둥지", X=1560, Z=-1830, Title="[서브] 지룡의 둥지",
     Intro="협곡 순례자: '남쪽 바위 틈의 지룡은 재물에 눈먼 기사가 저주로 변한 모습이래. 파프니르를 제압해 줘. 저주를 풀 수 있는지 보자. 가죽과 뼈는 네 몫이야.'",
     Reach="바위 틈에서 비늘 조각과 뼈 더미가 보인다.", BossDone="파프니르가 쓰러지고 둥지가 조용해진다.",
     Nodes={},
     Guard={model="triceratops",name="협곡 가시룡",tier=6,height=5.2,hp=2.04,dmg=1.68,style="mage",myth={color=Color3.fromRGB(255,120,60)},drops={{"Hide",.6,1},{"Fang",.4,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="trex",name="탐욕의 지룡 파프니르",tier=7,height=8,hp=3.9,dmg=2.14,style="mage",myth={color=Color3.fromRGB(255,80,40),range=26,rate=24},dx=8,dz=-6,drops={{"Hide",1,3},{"Fang",1,2},{"Claw",.8,2}}},
     ChoiceA={Label="저주를 풀어 파프니르를 해방한다",Done="지룡의 비늘이 재가 되어 흩어지고, 갑옷 입은 기사 파프니르가 무릎을 꿇는다. '탐욕이 나를 짐승으로 만들었다. 이번엔 지키는 데 쓰겠다.'",Join="pafnir",Bond=true,Steel=1,Coins=150},
     ChoiceB={Label="저주받은 지룡으로 끝낸다",Done="순례자가 가죽을 건넨다. '두껍고 질겨. 슬픈 재료지.'",Leather=4,Coins=450},
     Prompt="쓰러진 지룡이 갑옷 조각을 흘리며 사람의 목소리로 속삭인다. '…끝내 줘, 아니면 풀어 줘.'",
     Reward={Coins=560,Xp=560,Hide=3}},
  }},
  {Zone="wetland", HubX=-700, HubZ=1750, Giver="늪 길잡이 미르", Camps={
    {Id="wetherb", Name="습원 약초밭", X=-600, Z=1860, Title="[서브] 습원 약초밭",
     Intro="늪 길잡이 미르: '동남쪽 습원 약초밭에 약초가 무성한데 습원 독두꺼비이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 습원 독두꺼비들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="toad",name="습원 독두꺼비",tier=3,height=3,hp=1.92,dmg=1.59,drops={{"Mushroom",0.7,1},{"Moonbloom",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="toad",name="습원 대두꺼비",tier=4,height=4.5,hp=3.75,dmg=2.02,dx=8,dz=-6,drops={{"Mushroom",1,3},{"Moonbloom",0.8,2}}},
     ChoiceA={Label="달맞이꽃 4개",Done="미르가 약초 꾸러미를 건넨다. '습원이 고마워할 거야.'",Moonbloom=4},
     ChoiceB={Label="마력 수정 2개",Done="미르가 수정을 건넨다. '안개가 굳은 거래.'",Crystal=2},
     Reward={Coins=300,Xp=300,Moonbloom=1}},
    {Id="wetspider", Name="습원 거미 굴", X=-800, Z=1850, Title="[서브] 습원 거미 굴",
     Intro="늪 길잡이 미르: '남서쪽 습원 거미 굴의 습원 거미이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="습원 거미 굴 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="spider",name="습원 거미",tier=3,height=3.4,hp=1.92,dmg=1.59,drops={{"Fang",0.5,1},{"Hide",0.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="spider",name="습원 거미 여왕",tier=4,height=5.1,hp=3.75,dmg=2.02,dx=8,dz=-6,drops={{"Fang",1,3},{"Hide",1,2}}},
     ChoiceA={Label="송곳니 3개",Done="미르가 송곳니를 건넨다. '독이 아직 남았어.'",Fang=3},
     ChoiceB={Label="가죽 4장",Done="미르가 가죽을 건넨다. '질기게 손질했어.'",Hide=4},
     Reward={Coins=280,Xp=280,Hide=2}},
    {Id="wetore", Name="습원 고블린 광맥", X=-780, Z=1630, Title="[서브] 습원 고블린 광맥",
     Intro="늪 길잡이 미르: '북서쪽에서 광맥이 드러났는데 습원 고블린이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 습원 고블린들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="rogue",name="습원 고블린",tier=3,height=3.2,hp=1.92,dmg=1.59,drops={{"Ore",0.5,1},{"Hide",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="rogue",name="습원 고블린 두목",tier=4,height=4.8,hp=3.75,dmg=2.02,dx=8,dz=-6,drops={{"Ore",1,4},{"Hide",0.8,2}}},
     ChoiceA={Label="강철 1개",Done="미르가 강철 주괴를 건넨다. '첫 강철로 좋지.'",Steel=1},
     ChoiceB={Label="코인 500",Done="미르가 코인을 건넨다. '이끼마루가 숨통이 트였어.'",Coins=500},
     Reward={Coins=320,Xp=320,Ore=5,Ingot=2}},
    {Id="wethydra", Name="히드라의 늪", X=-620, Z=1620, Title="[서브] 히드라의 늪",
     Intro="늪 길잡이 미르: '북쪽 늪가의 어미 히드라는 전염병을 고치던 마법사가 저주로 변한 거래. 제압해 줘. 해독할 방법이 있을지 몰라. 근처 약초는 네 거야.'",
     Reach="늪가에 독액 자국이 가득하고 약초가 자란다.", BossDone="히드라가 쓰러지고 늪가가 열린다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="parasaur",name="히드라 새끼",tier=3,style="mage",myth={color=Color3.fromRGB(90,255,150)},height=4.6,hp=1.92,dmg=1.59,drops={{"Hide",.5,1},{"Moonbloom",.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="stegosaurus",name="아홉 머리 어미 히드라",tier=4,style="mage",myth={color=Color3.fromRGB(60,255,120),range=24,rate=22},height=7,hp=3.75,dmg=2.02,dx=8,dz=-6,drops={{"Hide",1,3},{"Moonbloom",.8,2}}},
     ChoiceA={Label="저주를 풀어 리바를 해방한다",Done="아홉 머리가 한 사람의 그림자로 줄어든다. 치유 마법사 리바가 눈을 뜬다. '독을 없애려다 독이 됐지… 이제 사람을 고치게 해 줘.'",Join="lyva",Bond=true,Moonbloom=3,Coins=120},
     ChoiceB={Label="저주받은 히드라로 끝낸다",Done="미르가 코인과 약초를 건넨다. '독이 가셨어. 길이 열렸어.'",Moonbloom=3,Coins=380},
     Prompt="머리가 하나씩 사라지며 어미 히드라가 여인의 모습으로 돌아온다. 해독의 의식을 할 수 있다.",
     Reward={Coins=420,Xp=420,Hide=2}},
  }},
  {Zone="desert", HubX=2800, HubZ=1750, Giver="사막 길잡이 하산", Camps={
    {Id="desertspider", Name="황금 독거미 굴", X=2900, Z=1860, Title="[서브] 황금 독거미 굴",
     Intro="사막 길잡이 하산: '동남쪽 황금 독거미 굴에 약초가 무성한데 황금 독거미이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 황금 독거미들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="fangspider",name="황금 독거미",tier=6,height=3.4,hp=2.04,dmg=1.68,drops={{"Fang",0.6,1},{"Moonbloom",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="fangspider",name="황금 독거미 여왕",tier=7,height=5.1,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Fang",1,3},{"Moonbloom",0.8,2},{"Crystal",0.5,1}}},
     ChoiceA={Label="송곳니 4개",Done="하산이 송곳니를 건넨다. '사막도 베겠어.'",Fang=4},
     ChoiceB={Label="마력 수정 3개",Done="하산이 수정을 건넨다. '모래가 굳은 거야.'",Crystal=3},
     Reward={Coins=560,Xp=560,Moonbloom=1}},
    {Id="desertassassin", Name="암살자 야영지", X=2700, Z=1850, Title="[서브] 암살자 야영지",
     Intro="사막 길잡이 하산: '남서쪽 암살자 야영지의 황금 암살자이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="암살자 야영지 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="assassin",name="황금 암살자",tier=6,height=4.4,hp=2.04,dmg=1.68,drops={{"Claw",0.5,1},{"Moonbloom",0.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="assassin",name="황금 암살자 두목",tier=7,height=6.6,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Claw",1,4},{"Crystal",1,2}}},
     ChoiceA={Label="발톱 4개",Done="하산이 발톱을 건넨다. '장갑에 쓰면 좋아.'",Claw=4},
     ChoiceB={Label="마력 수정 3개",Done="하산이 수정을 건넨다. '그림자의 전리품이야.'",Crystal=3},
     Reward={Coins=540,Xp=540,Hide=3}},
    {Id="desertore", Name="사막 광맥", X=2720, Z=1630, Title="[서브] 사막 광맥",
     Intro="사막 길잡이 하산: '북서쪽에서 광맥이 드러났는데 사막 해골 오크이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 사막 해골 오크들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="skullorc",name="사막 해골 오크",tier=6,height=4.8,hp=2.04,dmg=1.68,drops={{"Ore",0.6,1},{"Magma",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="skullorc",name="사막 해골 족장",tier=7,height=7.2,hp=3.9,dmg=2.14,dx=8,dz=-6,drops={{"Ore",1,4},{"Magma",1,2}}},
     ChoiceA={Label="강철 2개",Done="하산이 강철 주괴를 건넨다. '모래 폭풍에도 안 녹슬어.'",Steel=2},
     ChoiceB={Label="코인 650",Done="하산이 코인을 건넨다. '상단이 오래 기억할 거야.'",Coins=650},
     Reward={Coins=560,Xp=560,Ore=6,Ingot=2}},
  }},
  {Zone="chaos", HubX=4300, HubZ=-1700, Giver="균열 감시병", Camps={
    {Id="chaosmagma", Name="혼돈의 광맥", X=4220, Z=-1820, Title="[서브] 혼돈의 광맥",
     Intro="균열 감시병: '북서쪽에서 광맥이 드러났는데 혼돈의 오크이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 혼돈의 오크들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="skullorc",name="혼돈의 오크",tier=8,height=4.8,hp=2.12,dmg=1.74,drops={{"Ore",0.6,1},{"Magma",0.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="skullorc",name="혼돈의 오크 대장",tier=9,height=7.2,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Ore",1,4},{"Magma",1,3}}},
     ChoiceA={Label="화산석 4개",Done="감시병이 화산석을 건넨다. '균열의 열기가 배어 있어.'",Magma=4},
     ChoiceB={Label="강철 2개",Done="감시병이 강철 주괴를 건넨다. '단단하게 벼려졌어.'",Steel=2},
     Reward={Coins=700,Xp=700,Ore=6,Magma=2}},
    {Id="chaosfrost", Name="서리 마귀 야영지", X=4400, Z=-1590, Title="[서브] 서리 마귀 야영지",
     Intro="균열 감시병: '동남쪽 서리 마귀 야영지에 약초가 무성한데 서리 마귀이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 서리 마귀들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="frostfiend",name="서리 마귀",tier=8,height=5.2,hp=2.12,dmg=1.74,drops={{"Crystal",0.4,1},{"Claw",0.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="frostfiend",name="서리 마귀 군주",tier=9,height=7.8,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Crystal",1,3},{"Claw",1,3},{"Moonbloom",0.8,2}}},
     ChoiceA={Label="마력 수정 4개",Done="감시병이 수정을 건넨다. '얼어붙은 마력이야.'",Crystal=4},
     ChoiceB={Label="발톱 3개",Done="감시병이 발톱을 건넨다. '차갑게 날이 서 있어.'",Claw=3},
     Reward={Coins=720,Xp=720,Crystal=1}},
    {Id="chaosdemon", Name="균열 악마 제단", X=4200, Z=-1600, Title="[서브] 균열 악마 제단",
     Intro="균열 감시병: '남서쪽 균열 악마 제단의 혼돈의 악마이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="균열 악마 제단 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="demon",name="혼돈의 악마",tier=8,height=5.2,hp=2.12,dmg=1.74,drops={{"Magma",0.5,1},{"Crystal",0.4,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="demon",name="균열 악마 사제",tier=9,height=7.8,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Magma",1,3},{"Crystal",1,3},{"Claw",0.8,2}}},
     ChoiceA={Label="화산석 4개",Done="감시병이 화산석을 건넨다. '불꽃이 굳은 거야.'",Magma=4},
     ChoiceB={Label="마력 수정 3개",Done="감시병이 수정을 건넨다. '균열의 조각이야.'",Crystal=3},
     Reward={Coins=740,Xp=740,Magma=2}},
  }},
  {Zone="citadel", HubX=5700, HubZ=0, Giver="성채 외곽 척후병", Camps={
    {Id="citadelore", Name="성채 광맥", X=5770, Z=-120, Title="[서브] 성채 광맥",
     Intro="성채 외곽 척후병: '북서쪽에서 광맥이 드러났는데 성채 오크 병사이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 성채 오크 병사들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="orc",name="성채 오크 병사",tier=9,height=4.6,hp=2.16,dmg=1.77,drops={{"Ore",0.6,1},{"Hide",0.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="orc",name="성채 오크 감독",tier=10,height=6.9,hp=4.05,dmg=2.26,dx=8,dz=-6,drops={{"Ore",1,5},{"Magma",0.8,2}}},
     ChoiceA={Label="강철 3개",Done="척후병이 강철 주괴를 건넨다. '성채 대장간용이야.'",Steel=3},
     ChoiceB={Label="코인 800",Done="척후병이 코인을 건넨다. '외곽 초소가 버틸 수 있겠어.'",Coins=800},
     Reward={Coins=860,Xp=860,Ore=8,Ingot=3}},
    {Id="citadeldemon", Name="성채 악마 제단", X=5950, Z=110, Title="[서브] 성채 악마 제단",
     Intro="성채 외곽 척후병: '동남쪽 성채 악마 제단에 약초가 무성한데 성채 악마이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 성채 악마들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="demon",name="성채 악마",tier=9,height=5.2,hp=2.16,dmg=1.77,drops={{"Magma",0.5,1},{"Crystal",0.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="demon",name="성채 악마 사제",tier=10,height=7.8,hp=4.05,dmg=2.26,dx=8,dz=-6,drops={{"Magma",1,4},{"Crystal",1,3},{"Moonbloom",0.8,2}}},
     ChoiceA={Label="화산석 5개",Done="척후병이 화산석을 건넨다. '전설 갑옷 재료야.'",Magma=5},
     ChoiceB={Label="마력 수정 4개",Done="척후병이 수정을 건넨다. '제단의 불이 남긴 거야.'",Crystal=4},
     Reward={Coins=880,Xp=880,Magma=2}},
    {Id="citadelassassin", Name="그림자 암살자 야영지", X=5750, Z=100, Title="[서브] 그림자 암살자 야영지",
     Intro="성채 외곽 척후병: '남서쪽 그림자 암살자 야영지의 그림자 암살자이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="그림자 암살자 야영지 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="assassin",name="그림자 암살자",tier=9,height=4.4,hp=2.16,dmg=1.77,drops={{"Claw",0.5,1},{"Crystal",0.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="assassin",name="그림자 암살자 대장",tier=10,height=6.6,hp=4.05,dmg=2.26,dx=8,dz=-6,drops={{"Claw",1,5},{"Crystal",1,3},{"Hide",0.8,2}}},
     ChoiceA={Label="발톱 5개",Done="척후병이 발톱을 건넨다. '그림자의 발톱이야.'",Claw=5},
     ChoiceB={Label="마력 수정 4개",Done="척후병이 수정을 건넨다. '어둠이 굳은 거야.'",Crystal=4},
     Reward={Coins=860,Xp=860,Hide=4}},
  }},
  {Zone="deadmarsh", HubX=5200, HubZ=1750, Giver="죽음의 늪 사당지기", Camps={
    {Id="deadherb", Name="죽은 늪 약초밭", X=5300, Z=1860, Title="[서브] 죽은 늪 약초밭",
     Intro="죽음의 늪 사당지기: '동남쪽 죽은 늪 약초밭에 약초가 무성한데 죽음의 주술전사이(가) 지키고 있어. 두목을 쓰러뜨리고 약초를 캐 줘.'",
     Reach="약초가 보이지만 죽음의 주술전사들이 주위를 맴돈다.", BossDone="두목이 쓰러지고 약초밭이 드러난다.",
     Nodes={{"HERB",-8,-14},{"HERB",12,-10}},
     Guard={model="tribal",name="죽음의 주술전사",tier=8,height=4.4,hp=2.12,dmg=1.74,drops={{"Moonbloom",0.4,1},{"Ore",0.3,1}},Offs={{-14,10},{16,12}}},
     Boss={model="tribal",name="죽음의 주술사 족장",tier=9,height=6.6,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Moonbloom",1,3},{"Ore",0.8,2},{"Crystal",0.5,1}}},
     ChoiceA={Label="달맞이꽃 5개",Done="사당지기가 약초를 건넨다. '저주 속에서도 자라는 풀이야.'",Moonbloom=5},
     ChoiceB={Label="마력 수정 4개",Done="사당지기가 수정을 건넨다. '영혼이 굳은 거야.'",Crystal=4},
     Reward={Coins=720,Xp=720,Moonbloom=1}},
    {Id="deadspider", Name="죽은 늪 거미 둥지", X=5100, Z=1850, Title="[서브] 죽은 늪 거미 둥지",
     Intro="죽음의 늪 사당지기: '남서쪽 죽은 늪 거미 둥지의 죽은 늪 거미이(가) 길손을 해치고 있어. 두목을 쓰러뜨려 줘. 전리품은 네 몫이야.'",
     Reach="죽은 늪 거미 둥지 주변에 부서진 짐이 널려 있다.", BossDone="두목이 쓰러지고 주변이 조용해진다.",
     Nodes={},
     Guard={model="spider",name="죽은 늪 거미",tier=8,height=3.4,hp=2.12,dmg=1.74,drops={{"Ectoplasm",0.6,1},{"Fang",0.3,1}},Offs={{-14,10},{16,12},{-4,-16}}},
     Boss={model="spider",name="죽은 늪 거미 여왕",tier=9,height=5.1,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Ectoplasm",1,3},{"Fang",1,3},{"Crystal",0.5,1}}},
     ChoiceA={Label="원혼의 잔재 4개",Done="사당지기가 잔재를 건넨다. '영혼의 찌꺼기야.'",Ectoplasm=4},
     ChoiceB={Label="독니 4개",Done="사당지기가 독니를 건넨다. '죽음의 독이야.'",Fang=4},
     Reward={Coins=740,Xp=740,Ectoplasm=1}},
    {Id="deadore", Name="늪 악마 광맥", X=5120, Z=1630, Title="[서브] 늪 악마 광맥",
     Intro="죽음의 늪 사당지기: '북서쪽에서 광맥이 드러났는데 늪의 악마이(가) 차지했어. 두목만 쓰러뜨리면 광맥은 네 거야.'",
     Reach="광석이 반짝인다. 늪의 악마들이 보초를 서고 있다.", BossDone="두목이 쓰러지고 광맥이 드러난다.",
     Nodes={{"ORE",-6,2},{"ORE",8,-12}},
     Guard={model="demon",name="늪의 악마",tier=8,height=5.2,hp=2.12,dmg=1.74,drops={{"Magma",0.5,1},{"Ore",0.4,1}},Offs={{-14,10},{16,12}}},
     Boss={model="demon",name="늪의 악마 감독",tier=9,height=7.8,hp=4.0,dmg=2.22,dx=8,dz=-6,drops={{"Ore",1,4},{"Magma",1,3}}},
     ChoiceA={Label="강철 3개",Done="사당지기가 강철 주괴를 건넨다. '저주에도 안 녹슬어.'",Steel=3},
     ChoiceB={Label="화산석 4개",Done="사당지기가 화산석을 건넨다. '늪 밑에서 캔 거야.'",Magma=4},
     Reward={Coins=760,Xp=760,Ore=6,Ingot=2}},
  }},
}
for _, region in ipairs(Config.EcoRegions) do
  for _, camp in ipairs(region.Camps) do
    local steps = {
      {Type="reach", X=camp.X, Z=camp.Z, R=55, Title=camp.Name.."으로 가라", Text=camp.Name.."으로 가서 상황을 살펴라.", Done=camp.Reach},
      {Type="kill", Boss=camp.Id, X=camp.X+camp.Boss.dx, Z=camp.Z+camp.Boss.dz, Count=1, Title=camp.Boss.name.."를 쓰러뜨려라", Text="지킴이의 우두머리를 처치하라. 졸개는 재료를 들고 다닌다.", Done=camp.BossDone},
    }
    local hasOre, hasHerb = false, false
    for _, n in ipairs(camp.Nodes) do if n[1] == "ORE" then hasOre = true else hasHerb = true end end
    if hasOre then table.insert(steps, {Type="event", Event="MINE_ORE", Count=2, Title="되찾은 광맥에서 광석 캐기", Text="광맥에 다가가 광석을 두 번 캐라.", Done="질 좋은 광석이다. "..region.Giver.."에게 가져가자."}) end
    if hasHerb then table.insert(steps, {Type="event", Event="GATHER_HERB", Count=1, Title="약초 채집", Text="약초 덤불에서 약초를 채집하라.", Done="약초가 한가득이다. "..region.Giver.."에게 가져가자."}) end
    table.insert(steps, {Type="choice", X=region.HubX, Z=region.HubZ, R=90, Title=region.Giver.."에게 보고", Prompt=camp.Prompt or (region.Giver..": '해결해 줬군! 사례는 무엇으로 줄까?'"), Choices={camp.ChoiceA, camp.ChoiceB}})
    table.insert(Config.QuestLines, {Id=camp.Id, Name=camp.Title, Kind="Sub", Field="QLEco"..camp.Id, Need={Zone=region.Zone}, Intro=camp.Intro, Steps=steps, Reward=camp.Reward})
  end
end

-- [성지 순례] 지역마다 랜드마크(성지)를 찾아 참배하고 공물로 보상을 고르는 자유 서브 퀘스트. 순서·선행 조건 없음.
do
  local offerings = {
    meadow = {{"Moonbloom", 3, "달맞이꽃 3송이"}, {"Crystal", 1, "마력 결정 1개"}},
    windcliff = {{"Feather", 3, "바람 깃털 3개"}, {"Crystal", 1, "마력 결정 1개"}},
    worldtree = {{"Moonbloom", 4, "달맞이꽃 4송이"}, {"Crystal", 2, "마력 결정 2개"}},
    volcano = {{"Magma", 3, "화산석 3개"}, {"Crystal", 2, "마력 결정 2개"}},
    oasis = {{"Crystal", 3, "마력 결정 3개"}, {"Hide", 3, "가죽 3장"}},
    swamp = {{"Ectoplasm", 2, "원혼의 잔재 2개"}, {"Moonbloom", 4, "달맞이꽃 4송이"}},
    citadel = {{"Steel", 1, "강철 주괴 1개"}, {"Crystal", 3, "마력 결정 3개"}},
    highland = {{"Hide", 4, "가죽 4장"}, {"Feather", 3, "바람 깃털 3개"}},
    canyon = {{"Steel", 1, "강철 주괴 1개"}, {"Claw", 4, "발톱 4개"}},
    chaos = {{"Ectoplasm", 3, "원혼의 잔재 3개"}, {"Crystal", 3, "마력 결정 3개"}},
    wetland = {{"Moonbloom", 4, "달맞이꽃 4송이"}, {"Hide", 4, "가죽 4장"}},
    desert = {{"Feather", 4, "바람 깃털 4개"}, {"Crystal", 2, "마력 결정 2개"}},
    deadmarsh = {{"Ectoplasm", 3, "원혼의 잔재 3개"}, {"Fang", 4, "송곳니 4개"}},
  }
  for _, lm in ipairs(Config.WorldMap.Landmarks) do
    local o = offerings[lm.Zone]
    if o then
      local ch1 = {Label = "공물을 올린다 (" .. o[1][3] .. " 받음)", Done = "성지의 불꽃이 잠시 일렁인다. 제단 아래에서 공물의 답례가 나온다.", Coins = 120}
      ch1[o[1][1]] = o[1][2]
      local ch2 = {Label = "비문을 베껴 간다 (" .. o[2][3] .. " + 코인)", Done = "비문의 한 구절을 베껴 적자 기억 속에서 오래된 길이 열린다.", Coins = 200}
      ch2[o[2][1]] = o[2][2]
      table.insert(Config.QuestLines, {Id = "pilg-" .. lm.Id, Name = "[성지] " .. lm.Name .. " 참배", Kind = "Sub", Field = "QLPilg" .. lm.Id,
        Need = {Zone = lm.Zone}, Intro = "길손의 소문: '" .. lm.Name .. "에 참배하면 성지가 응답한다더군. 순서도 조건도 없이 누구나 가능해.'",
        Steps = {
          {Type = "reach", X = lm.X, Z = lm.Z, R = 90, Title = lm.Name .. "으로 가라", Text = lm.Name .. " 앞까지 가서 제단을 살펴라.", Done = "제단 앞에 서자 바람이 잦아든다."},
          {Type = "choice", X = lm.X, Z = lm.Z, R = 90, Title = "성지에 응답하라", Prompt = lm.Lore .. "\n\n제단이 응답을 기다린다. 어떻게 할까?", Choices = {ch1, ch2}},
        },
        Reward = {Coins = 150, Xp = 180}})
    end
  end
end

-- [스카이림식 연계 퀘스트] 홀드 미스터리 4편 + 렌스기사단 3인 추적(메인) 3부작. 선택과 모순된 행동이 이야기를 비튼다.
do
  local towns = {}
  for _, t in ipairs(Config.WorldMap.Towns) do towns[t.Id] = t end
  local function lm(id) for _, l in ipairs(Config.WorldMap.Landmarks) do if l.Id == id then return l end end end
  local lighthouse, throne, rootaltar, toadMon = lm("lighthouse"), lm("throne"), lm("rootaltar"), lm("toadMonument")
  local misttower, rift = lm("mistTower"), lm("rift")
  local town = towns.windcliff
  for _, line in ipairs({
    -- [바람 절벽 생태 의뢰] 광산·둥지·야영지를 따라가는 스카이림식 퀘스트. 몹 처치는 두목 1마리뿐.
    {Id="cliffmine", Name="[서브] 절벽 광산 탈환", Kind="Sub", Field="QLCliffMine", Need={Zone="windcliff"},
     Intro="소금 상인 베른: '절벽 광산이 오크 감독 손에 넘어갔어. 철광석이 끊겨 대장간이 굶는다. 되찾아 주면 광석은 네 몫이야.'",
     Steps={
      {Type="reach", X=Config.WorldMap.EcoCamps.cliffmine.X, Z=Config.WorldMap.EcoCamps.cliffmine.Z, R=50, Title="절벽 광산으로 가라", Text="해풍촌 북동쪽 절벽 광산. 광부 도적과 오크 감독이 지킨다.", Done="갱도 앞에 광석 수레가 쌓여 있다. 감독만 쓰러뜨리면 도적들이 흩어진다."},
      {Type="kill", Boss="cliffmine", X=Config.WorldMap.EcoCamps.cliffmine.X + 10, Z=Config.WorldMap.EcoCamps.cliffmine.Z - 8, Count=1, Title="오크 광산 감독을 쓰러뜨려라", Text="갱도 안쪽의 오크 감독을 처치하라.", Done="감독이 쓰러지고 광맥이 드러난다."},
      {Type="event", Event="MINE_ORE", Count=2, Title="되찾은 광맥에서 광석 캐기", Text="광산 광맥에서 광석을 두 번 캐라.", Done="질 좋은 광석이다. 베른에게 가져가자."},
      {Type="choice", X=town.X, Z=town.Z, R=60, Title="광산의 주인", Prompt="베른: '광산이 돌아왔군! 운영은 어떻게 할까?'",
       Choices={{Label="상인과 공동 운영 (강철 2개)", Done="베른이 강철 주괴 두 개를 건넨다. '다음 광석 값은 깎아 주지.'", Steel=2, Coins=150},
                {Label="마을 공용으로 (코인 600)", Done="촌장이 눈물을 훔친다. '해풍촌이 오래 기억할 거요.'", Coins=600}}}
     },
     Reward={Coins=400, Xp=420, Ore=8, Ingot=3}},
    {Id="cliffnest", Name="[서브] 절벽 둥지의 약초", Kind="Sub", Field="QLCliffNest", Need={Zone="windcliff"},
     Intro="소금 주막 마르타: '남쪽 절벽 둥지 밑에 달맞이꽃이 핀다네. 큰박쥐가 지키니 아무도 못 가. 날개와 약초는 값이 좋지.'",
     Steps={
      {Type="reach", X=Config.WorldMap.EcoCamps.cliffnest.X, Z=Config.WorldMap.EcoCamps.cliffnest.Z, R=50, Title="바람 박쥐 둥지로 가라", Text="해풍촌 남쪽 절벽 아래 둥지. 낮에도 박쥐가 날아다닌다.", Done="절벽 틈 아래 약초 덤불이 보인다. 위에 큰박쥐가 매달려 있다."},
      {Type="kill", Boss="cliffnest", X=Config.WorldMap.EcoCamps.cliffnest.X + 6, Z=Config.WorldMap.EcoCamps.cliffnest.Z + 8, Count=1, Title="절벽의 큰박쥐를 쓰러뜨려라", Text="둥지의 큰박쥐를 처치하라. 날개와 수정을 떨군다.", Done="큰박쥐가 절벽 아래로 떨어진다. 이제 약초를 캘 수 있다."},
      {Type="event", Event="GATHER_HERB", Count=1, Title="둥지 밑 약초 채집", Text="둥지 아래 약초 덤불에서 약초를 채집하라.", Done="달맞이꽃이 한가득이다. 마르타에게 가져가자."},
      {Type="choice", X=town.X, Z=town.Z, R=60, Title="마르타의 부탁", Prompt="마르타: '이 정도면 큰 장사야! 어떻게 나눌까?'",
       Choices={{Label="약초 현물로 (달맞이꽃 4 · 바람 깃털 2)", Done="마르타가 약초 꾸러미와 깃털을 건넨다. '깃털 장갑을 만들어 보게.'", Moonbloom=4, Feather=2},
                {Label="마력 수정으로 (수정 3)", Done="마르타가 수정을 꺼낸다. '약초는 내 가게에 쓸게.'", Crystal=3}}}
     },
     Reward={Coins=360, Xp=380, Moonbloom=1, Feather=3}},
    {Id="orccamp", Name="[서브] 오크 정찰대장", Kind="Sub", Field="QLOrcCamp", Need={Zone="windcliff"},
     Intro="등대 경비 오르간: '서쪽 야영지에 오크 정찰대가 모였어. 등대를 노리는 것 같다. 가서 대장이 뭘 원하는지 확인해.'",
     Steps={
      {Type="reach", X=Config.WorldMap.EcoCamps.orccamp.X, Z=Config.WorldMap.EcoCamps.orccamp.Z, R=50, Title="오크 정찰 야영지로 가라", Text="해풍촌 서북쪽 오크 야영지. 정찰병이 길을 막고 있다.", Done="천막 안쪽에 오크 정찰대장이 있다. 쉽게 물러설 상대가 아니다."},
      {Type="kill", Boss="orccamp", X=Config.WorldMap.EcoCamps.orccamp.X - 8, Z=Config.WorldMap.EcoCamps.orccamp.Z - 6, Count=1, Title="오크 정찰대장을 쓰러뜨려라", Text="야영지 중앙의 정찰대장을 처치하라.", Done="대장이 쓰러지며 지도 한 장을 놓친다. '군단장은 등대에…' 라고 적혀 있다."},
      {Type="choice", X=town.X, Z=town.Z, R=60, Title="오르간에게 보고", Prompt="오르간: '군단장 이야기가 적혀 있군. 이 지도를 어떻게 할래?'",
       Choices={{Label="등대 경비대에 넘긴다 (코인 500)", Done="오르간: '경비대가 길목을 막겠다. 마을이 안전해질 거야.'", Coins=500},
                {Label="내가 가진다 (송곳니 2 · 발톱 3)", Done="오르간: '혼자 군단장에게 가겠다고? 조심해.'", Fang=2, Claw=3}}}
     },
     Reward={Coins=300, Xp=340, Hide=3}},
    -- 홀드 미스터리 ---------------------------------------------------------
    {Id="wind", Name="[미스터리] 등대지기는 왜 죽었나", Kind="Sub", Field="QLWind", Need={Zone="windcliff"},
     Intro="해풍촌 사람들은 등대지기가 도적에게 죽었다고 말한다. 그런데 소금 주막의 마르타는 그날 등대에 불이 켜져 있었다고 한다.",
     Steps={
      {Type="reach", X=towns.windcliff.X, Z=towns.windcliff.Z, R=60, Title="해풍촌 주막에서 소문 듣기", Text="해풍촌의 소금 주막에서 정보통과 이야기하라.", Done="마르타: '도적이라면 소금 상자부터 털었겠지. 시신 곁에 소금이 그대로였어.'"},
      {Type="reach", X=lighthouse.X, Z=lighthouse.Z, R=70, Title="등대 꼭대기 조사", Text="해풍 절벽의 파수 석상 곁 등대를 조사하라.", Done="등대 장부에 마지막 줄: '배가 오지 않는다. 신호를 보내는 자가 있다.' 글씨가 둘이다."},
      {Type="kill", Zone="windcliff", Lord=true, Count=1, Title="해풍 요새의 영주를 추궁하라", Text="영주가 등대에 가짜 신호를 보내게 했다. 영주를 쓰러뜨려 서약서를 얻어라.", Done="영주의 서약서에 마을 촌장의 인장이 찍혀 있다. 도적이 아니라 촌장이 뒤에 있었다."},
      {Type="choice", X=towns.windcliff.X, Z=towns.windcliff.Z, R=60, Title="촌장의 인장", Text="해풍촌에서 촌장과 마주하라.", Prompt="촌장: '등대지기는 난파선에서 훔친 물건을 알아챘다. 마을이 굶는데 나더러 어쩌라고.' 서약서는 네 손에 있다.",
       Choices={
        {Label="진실을 마을에 밝힌다", Done="촌장은 무너지고 마을은 갈라졌다. 마르타가 등대에 다시 불을 켠다. '이게 옳은 일이라고 믿자.'", Coins=300, Moonbloom=2},
        {Label="서약서를 대가로 거래한다", Done="촌장이 소금 상자와 재화를 건넨다. 등대 불은 다시 켜졌지만 마르타는 너와 눈을 마주치지 않는다.", Coins=700, Hide=3}}},
     },
     Reward={Coins=260, Xp=380}},
    {Id="hunt", Name="[미스터리] 사라진 사냥꾼의 모자", Kind="Sub", Field="QLHunt", Need={Zone="highland"},
     Intro="서리목 초소의 사냥꾼 일곱 명이 돌아오지 않았다. 늙은 올라프는 모자 하나가 왕좌 바위에 걸려 있다고 말한다.",
     Steps={
      {Type="reach", X=towns.highland.X, Z=towns.highland.Z, R=60, Title="서리목 초소의 올라프", Text="서리목 초소에서 정보통을 만나라.", Done="올라프: '발자국이 왕좌로 올라가고 내려온 자국이 없다. 그런데 모두 신발끈을 풀고 갔다.'"},
      {Type="reach", X=throne.X, Z=throne.Z, R=70, Title="설인의 왕좌", Text="고원 설인의 왕좌 바위를 조사하라.", Done="바위 틈에 사냥꾼 일곱 개의 모자. 모자마다 작은 글씨가 있다. '내가 먼저 올랐다.'"},
      {Type="kill", Zone="highland", Named=true, Count=1, Title="무리장을 쓰러뜨려라", Text="늑대인간 무리장이 사냥꾼의 이름을 삼켰다.", Done="쓰러진 늑대인간의 목에 올라프의 아들이 쓰던 호루라기가 걸려 있다."},
      {Type="choice", X=towns.highland.X, Z=towns.highland.Z, R=60, Title="올라프의 질문", Text="초소로 돌아가 올라프와 마주하라.", Prompt="올라프: '내 아들이 그 괴물이었나? 이름을 가진 채 변한 거라면 나는 알아야겠다.'",
       Choices={
        {Label="사실대로 말한다", Done="올라프가 호루라기를 쥐고 오래 앉아 있다. '고맙네. 이제 일곱 명의 모자를 묻어줄 수 있겠어.'", Coins=300, Hide=3},
        {Label="아들은 영웅으로 죽었다고 말한다", Done="올라프가 웃는다. 거짓말인 줄 알면서 받아들이는 웃음이다. 그는 모피 한 짐을 건넨다.", Coins=500, Hide=5}}},
     },
     Reward={Coins=280, Xp=420}},
    {Id="bog", Name="[미스터리] 독이 든 약초밭", Kind="Sub", Field="QLBog", Need={Zone="wetland"},
     Intro="이끼마루의 약초가 한 밤에 모두 검게 썩었다. 약초집 주인 리나는 누군가 뿌리에 마력을 부었다고 말한다.",
     Steps={
      {Type="reach", X=towns.wetland.X, Z=towns.wetland.Z, R=60, Title="이끼마루 약초집", Text="이끼마루에서 리나를 만나라.", Done="리나: '독이 아니라 소금이야. 먼 해풍촌 소금이 이끼마루 우물에 부어졌어.'"},
      {Type="reach", X=toadMon.X, Z=toadMon.Z, R=70, Title="습원 대두꺼비 기념비", Text="기념비 아래 약수를 조사하라.", Done="약수 바닥에서 소금 상자 조각과 도적단 문장. 누군가 일부러 흘려둔 흔적이다."},
      {Type="loot", Field="Moonbloom", Count=3, Title="달꽃 3송이를 구하라", Text="썩지 않은 달꽃으로 약초밭 해독제를 만들어야 한다.", Done="달꽃으로 만든 해독제로 남은 약초가 살아난다. 상자 속 문장은 도적왕 그림의 것이다."},
      {Type="choice", X=towns.wetland.X, Z=towns.wetland.Z, R=60, Title="도적왕 그림의 거래", Text="이끼마루로 돌아가라.", Prompt="그림이 직접 찾아왔다. '내가 한 짓이 아니라 누가 내 이름을 팔았다. 증명할 사람은 너뿐이다.' 리나는 그를 잡으라고 한다.",
       Choices={
        {Label="그림을 잡아 마을에 넘긴다", Done="그림이 끌려가며 소리친다. '진짜 범인은 해풍촌에 있다!' 아무도 듣지 않는다.", Coins=350, Moonbloom=3},
        {Label="그림의 말을 믿고 놓아준다", Done="그림이 사라지며 지도를 한 장 두고 간다. 해풍촌 소금 창고 위치다. 리나는 침묵한다.", Coins=450, Crystal=3}}},
     },
     Reward={Coins=260, Xp=380}},
    {Id="root", Name="[미스터리] 속삭이는 뿌리", Kind="Sub", Field="QLRoot", Need={Zone="worldtree"},
     Intro="뿌리쉼터 여관 주인 에이라는 밤마다 뿌리 밑에서 자기 이름을 부르는 소리를 듣는다. 이름을 잃은 주민이 늘고 있다.",
     Steps={
      {Type="reach", X=towns.worldtree.X, Z=towns.worldtree.Z, R=60, Title="뿌리쉼터 여관", Text="뿌리쉼터에서 에이라의 이야기를 들어라.", Done="에이라: '내가 누구였는지 적어 둔 쪽지가 베개 밑에 있었어. 내 글씨인데 내가 쓴 기억이 없어.'"},
      {Type="reach", X=rootaltar.X, Z=rootaltar.Z, R=70, Title="세계수 뿌리 제단", Text="뿌리 제단의 낙서를 조사하라.", Done="낙서 '숲은 진짜가 아니다'. 그 아래 작은 글씨: '이 글을 쓴 사람은 카인.' 필체는 네 것이다."},
      {Type="kill", Zone="worldtree", Lord=true, Count=1, Title="숲의 파수 영주를 쓰러뜨려라", Text="영주가 뿌리 제단에 쓰인 글씨를 지우고 있다.", Done="영주의 일지: '카인이 오기 전에 모두 지워라. 렌스의 명령이다.' 렌스가 너를 막고 있었다."},
      {Type="choice", X=towns.worldtree.X, Z=towns.worldtree.Z, R=60, Title="에이라의 쪽지", Text="뿌리쉼터로 돌아가 에이라와 마주하라.", Prompt="에이라: '이 쪽지를 읽으면 내 이름이 사라질지도 몰라. 그래도 알고 싶어. 이름이 뭔지 말해 줄래?'",
       Choices={
        {Label="이름을 알려 준다", Done="에이라는 눈을 감고 이름을 되뇐다. 나무 껍질이 조금 풀린다. '이게 나였구나.' 뿌리의 속삭임이 잦아든다.", Coins=300, Moonbloom=3},
        {Label="이름을 숨기고 쪽지를 태운다", Done="쪽지가 재가 된다. 에이라는 아무것도 기억하지 못한 채 웃는다. 숲은 조금 더 조용해졌지만 무언가 빚이 쌓였다.", Coins=550, Crystal=2}}},
     },
     Reward={Coins=280, Xp=400}},
    -- 저주받은 세 사람 (메인 3부작): 마력숲에서 미나는 마녀로, 닉은 늑대인간으로, 렌스는 영혼을 판 악마 영주로 살아간다.
    -- 저주를 풀면 본모습이 돌아온다. Boss= 는 저주받은 몸으로 서 있는 존재를 가리킨다.
    {Id="track1", Name="[메인] 저주받은 세 사람 ① 마녀가 된 미나", Kind="Main", Field="QLTrack1", Need={Zone="windcliff"},
     Intro="렌스, 미나, 닉. 세 사람은 마력숲에서 저주받은 모습으로 살고 있다. 먼저 안개 늪의 마녀가 미나라는 소문을 쫓아라. 바람 절벽 등대 벽에 세 사람의 이름이 새겨져 있다.",
     Steps={
      {Type="reach", X=lighthouse.X, Z=lighthouse.Z, R=70, Title="등대 벽의 세 이름", Text="바람 절벽 등대에서 단서를 찾아라.", Done="벽의 세 이름 옆 날짜가 같다. 미나의 이름 옆에는 '장부를 지키려다 마녀의 약속을 받았다'라는 글귀가 있다."},
      {Type="reach", X=misttower.X, Z=misttower.Z, R=70, Title="안개 마녀의 탑", Text="늪 한가운데 안개 마녀의 탑으로 가라.", Done="탑 문에 장부 표지 같은 도장이 찍혀 있다. 안에서 숫자를 읊는 목소리. 미나다. 그러나 그녀의 눈동자는 연보라색이다."},
      {Type="loot", Field="Moonbloom", Count=3, Title="달꽃 3송이", Text="마녀의 저주를 푸는 약에는 달꽃이 필요하다. 달꽃 3송이를 모아라.", Done="달꽃으로 빚은 약이 탑 문틈에서 연기를 낸다. 저주의 근원이 깨어난다."},
      {Type="kill", Boss="mina", Count=1, Title="저주받은 마녀 미나", Text="마녀가 된 미나와 싸워 저주를 깨뜨려라. 그녀를 죽이는 것이 아니라 저주만 끊는다.", Done="마녀의 모자가 벗겨지고 미나의 본모습이 드러난다. '장부는… 거짓이었어. 아니, 진실을 숨기는 값이 장부였어. 카인, 나를 비난해도 좋아.'"},
      {Type="choice", X=misttower.X, Z=misttower.Z, R=80, Title="미나의 장부", Text="탑 안에서 미나의 장부를 마주하라.", Prompt="장부엔 렌스가 영혼을 판 날짜와 대가가 적혀 있다. 미나는 그 사실을 숨겼다고 고백한다. '빅브라더의 사상경찰이 장부를 노렸어. 거짓 숫자로 모두를 속여야 했어.' 그녀를 믿겠는가?",
       Choices={
        {Label="사정을 이해하고 손을 내민다", Done="미나가 잠깐 눈을 감았다 뜬다. '고마워. 이번엔 숫자 말고 사람 이야기를 하겠어.' 미나가 동행한다.", Join="mina", Bond=true, Flag=1, Coins=300, Moonbloom=2},
        {Label="거짓을 추궁하고 임무로 데려간다", Done="미나가 쓴웃음을 짓는다. '그럴 만하지. 값을 치르는 게 내 일이니까.' 미나가 거리를 둔 채 동행한다.", Join="mina", Flag=2, Coins=600, Ore=2}}},
     },
     Reward={Coins=260, Xp=420}},
    {Id="track2", Name="[메인] 저주받은 세 사람 ② 늑대인간이 된 닉", Kind="Main", Field="QLTrack2", Need={Done="track1"},
     Intro="닉은 단원들 대신 저주를 가져갔다. 북부 고원 왕좌 바위 근처에서 늑대인간 무리를 이끄는 거대 늑대가 사람의 말을 한다는 소문이 있다.",
     Steps={
      {Type="reach", X=throne.X, Z=throne.Z, R=70, Title="고원 왕좌의 발자국", Text="북부 고원 설인 왕좌에서 닉의 흔적을 찾아라.", Done="발자국이 사람에서 늑대로 바뀐다. 중간에 멈춘 자국은 없다. 닉은 스스로 변하기를 선택했다."},
      {Type="reach", X=-1800, Z=-800, R=70, Title="서쪽 옛 요새", Text="닉이 마지막으로 사람이었던 서쪽 옛 요새로 가라.", Done="벽에 닉의 필체: '저주를 받은 게 아니라 내가 가져갔다. 단원들이 대신 변하지 않게.' 요새 문은 안쪽에서 잠겨 있었다. 열쇠는 미나의 것이다."},
      {Type="loot", Field="Hide", Count=3, Title="늑대 가죽 3장", Text="저주를 일시적으로 잠재우는 의식에는 늑대 가죽이 필요하다. 가죽 3장을 모아라.", Done="가죽을 태운 연기가 늑대의 울음을 가라앉힌다. 닉이 부르는 소리가 가까워진다."},
      {Type="kill", Boss="nick", Count=1, Title="저주받은 늑대인간 닉", Text="늑대인간이 된 닉과 싸워 저주를 깨뜨려라.", Done="털이 빠지며 닉의 얼굴이 돌아온다. '카인… 미안하다. 단원들을 지키려고 한 일인데, 네 손에 칼을 쥐게 했구나.'"},
      {Type="choice", X=-1800, Z=-800, R=70, Title="닉의 선택", Text="요새에서 닉과 이야기하라.", Prompt="닉: '미나가 문을 잠근 건 보호였는지 배신이었는지 지금도 모르겠어. 하지만 렌스가 영혼을 판 건 틀림없다. 나는 어떻게 해야 하지?'",
       Choices={
        {Label="함께 렌스를 구하러 가자", Done="닉이 어깨를 편다. '그래. 내 이름을 기억하는 한 나는 사람이다.' 닉이 동행한다.", Join="nick", Bond=true, Flag=4, Coins=350, Claw=3},
        {Label="먼저 휴식을 취하고 따라오라 한다", Done="닉이 고개를 숙인다. '알겠다. 곧 뒤따르겠어.' 닉이 거리를 둔 채 동행한다.", Join="nick", Flag=8, Coins=500, Ore=3}}},
     },
     Reward={Coins=280, Xp=440}},
    {Id="track3", Name="[메인] 저주받은 세 사람 ③ 영혼을 판 렌스", Kind="Main", Field="QLTrack3", Need={Done="track2"},
     Intro="렌스 단장은 영혼을 팔아 악마 영주가 되어 심연의 균열을 지킨다. 그가 왜 영혼을 팔았는지는 아무도 모른다.",
     Steps={
      {Type="reach", X=rootaltar.X, Z=rootaltar.Z, R=70, Title="뿌리 제단의 서약문", Text="세계수 뿌리 제단의 서약문을 읽어라.", Done="서약문 세 개의 서명. 렌스, 미나, 그리고 카인. 카인의 서명은 네가 쓴 것이다. 기억은 없다."},
      {Type="kill", Zone="swamp", Lord=true, Count=1, Title="늪 마녀단의 수장을 쓰러뜨려라", Text="수장이 렌스의 마지막 전언을 쥐고 있다.", Done="전언: '카인, 나는 너를 속였다. 너를 속여야만 네가 숲을 나갈 수 있었다. 균열에서 기다린다.'"},
      {Type="reach", X=rift.X, Z=rift.Z, R=80, Title="심연의 균열", Text="균열에서 렌스의 기척을 따라가라.", Done="균열 속 거대한 손이 문을 밀고 있다. 악마 영주가 그 손을 붙들고 있다. 렌스의 옛 군기가 어깨에 걸려 있다."},
      {Type="loot", Field="Crystal", Count=3, Title="마력 수정 3개", Text="영혼의 계약을 끊는 의식에는 마력 수정이 필요하다.", Done="수정 속에서 계약서의 글자가 떠오른다. '단원 전원의 이름을 대가로 렌스의 영혼을 산다.' 서명은 빅브라더."},
      {Type="kill", Boss="lens", Count=1, Title="악마 영주 렌스", Text="영혼을 판 악마 영주와 싸워 계약을 끊어라. 렌스를 죽이는 것이 아니라 저주만 끊는다.", Done="악마의 뿔이 부서지고 렌스의 본모습이 드러난다. '카인… 그래, 네가 왔구나. 나는 단원들의 이름을 지키려 영혼을 팔았다. 모순된 선택이었지.'"},
      {Type="choice", X=rift.X, Z=rift.Z, R=80, Title="렌스의 선택", Text="렌스와 마주하라.", Prompt="렌스: '마력숲은 미러가 만든 가짜다. 문을 열면 모두가 나가지만 단원들의 이름이 지워진다. 닫으면 내가 영원히 문지기로 남는다. 어느 쪽이 옳은지 나도 모르겠다.'",
       Choices={
        {Label="문을 닫고 렌스를 기다린다", Done="렌스가 웃는다. '그럴 줄 알았다.' 문이 닫히고 균열이 잠잠해진다. 이름들은 지켜졌고 렌스는 사람으로 문 앞에 남았다.", Flag=16, Coins=800, Crystal=4},
        {Label="문을 열고 위험을 감수한다", Done="문이 열린다. 이름이 하나씩 흐려진다. 렌스가 외친다. '너는 틀렸다, 하지만 용감했다.' 미러의 탑이 눈을 뜬다.", Flag=32, Coins=800, Magma=3}}},
     },
     Reward={Coins=520, Xp=700, Relic=9}},
  }) do table.insert(Config.QuestLines, line) end
end


-- [영주·동료 개인 퀘스트] 1984 같은 감시 사회의 암투: 진실부 · 기억 구멍 · 텔레스크린 · 101호실 · 이중사고 · 신어.
-- 각 영주마다 사연 퀘스트, 각 동료마다 영입 후 개인 퀘스트가 있다.
do
  local function lm(id) for _, l in ipairs(Config.WorldMap.Landmarks) do if l.Id == id then return l end end end
  local function make(id, field, kind, name, need, intro, lmId, zone, namedOrLord, step1, step2, step3, prompt, c1, c2, reward)
    local landmark = lm(lmId)
    local killStep = {Type = "kill", Zone = zone, Count = 1, Title = step2[1], Text = step2[2], Done = step2[3]}
    if namedOrLord == "lord" then killStep.Lord = true else killStep.Named = true end
    return {Id = id, Name = name, Kind = kind, Field = field, Need = need, Intro = intro,
      Steps = {
        {Type = "reach", X = landmark.X, Z = landmark.Z, R = 70, Title = step1[1], Text = step1[2], Done = step1[3]},
        killStep,
        {Type = "choice", X = landmark.X, Z = landmark.Z, R = 70, Title = step3[1], Text = step3[2], Prompt = prompt,
         Choices = {
           {Label = c1[1], Done = c1[2], Coins = c1[3], Crystal = c1[4], Flag = c1[5]},
           {Label = c2[1], Done = c2[2], Coins = c2[3], Hide = c2[4], Flag = c2[5]}}},
      },
      Reward = reward or {Coins = 300, Xp = 440}}
  end
  local lines = {
    -- 영주 사연 9편 ------------------------------------------------------
    make("lord-meadow", "QLLordMeadow", "Sub", "[영주] 봉화에 기름을 대는 자", {Zone = "meadow"},
      "초원의 봉화탑은 20년째 꺼지지 않는다. 붉은 깃발 대장 로크는 기름이 어디서 오는지 말하지 않는다.",
      "beacon", "meadow", "lord", {"봉화 불탑 조사", "초원 봉화 불탑을 조사하라.", "탑 지하에 기름 창고가 있다. 창고 장부의 서명은 '진리부 초원 지부'. 등대 불은 길 잃은 이를 부르는 게 아니라 위치를 알리는 신호였다."},
      {"붉은 깃발 대장 로크", "초원의 영주 로크를 쓰러뜨려라.", "로크의 허리에 진리부 인장이 걸려 있다. 그는 사상경찰의 지부장이었다."},
      {"봉화의 불꽃", "봉화 불탑으로 돌아가라."},
      "로크: '불을 꺼 주게. 나는 20년 동안 불을 지키라는 명령을 받고, 불이 누구를 부르는지는 모르는 척했네. 이제 말해 줄 수 있어: 불빛을 보고 온 이는 아무도 돌아가지 못했다.'",
      {"봉화를 꺼서 신호를 끊는다", "불이 꺼진다. 지평선 너머 어딘가에서 경보가 울린 듯하다. 로크는 눈을 감는다. '고맙네.'", 350, 2, 1},
      {"불을 두고 신호만 바꾼다", "신호가 바뀌어 사냥꾼들이 우회한다. 로크는 한 번만 웃는다. '이중사고란 이런 거지.'", 500, 2, 2}),
    make("lord-volcano", "QLLordVolcano", "Sub", "[영주] 이름이 지워진 명부", {Zone = "volcano"},
      "홍염 기사단 잔당의 영주 카일은 매일 아침 출석을 부른다. 부르는 이름은 하나씩 줄어든다.",
      "crater", "volcano", "lord", {"분화구 악마상", "화산 분화구의 악마상으로 가라.", "악마상 발치에 종이 더미. 출석부에서 이름이 지워진 자리마다 기억 구멍이라 적혀 있다."},
      {"홍염 기사단 잔당 카일", "화산의 영주 카일을 쓰러뜨려라.", "카일의 명부에는 마지막 줄에 '카일'만 남아 있다. 그는 자기 이름이 지워질까 두려워 매일 출석을 불렀다."},
      {"마지막 출석", "분화구로 돌아가 명부를 마주하라."},
      "명부는 이제 자기 이름만 남은 종이다. 지워진 이름들을 다시 쓸 수 있다. 하지만 쓰는 순간 누군가가 그 이름을 지우러 올 것이다.",
      {"지워진 이름들을 다시 쓴다", "명부가 불에 닿아 빛난다. 이름 하나하나가 숯 같은 글자로 되살아난다. 누군가의 발자국이 멀리서 다가온다.", 400, 3, 1},
      {"명부를 태워 이름의 위험을 끊는다", "명부가 재가 된다. 이름은 사라졌지만 지울 이유도 사라졌다. 재 속에서 용암 조각이 나온다.", 550, 3, 2}),
    make("lord-oasis", "QLLordOasis", "Sub", "[영주] 어제 없는 전쟁", {Zone = "oasis"},
      "오아시스 상단의 지배자 자파르는 어제의 소식을 팔아 번 돈으로 오늘의 소문을 만든다.",
      "obelisk", "oasis", "lord", {"모래 오벨리스크의 새 글자", "오벨리스크 군을 조사하라.", "오벨리스크의 글자가 어제와 다르다. 어제의 전쟁은 '없었던 일'로 다시 새겨졌다."},
      {"사막 상단의 지배자 자파르", "오아시스의 영주 자파르를 쓰러뜨려라.", "자파르의 소식지 원판은 한 장뿐이다. 그는 매일 기사들을 시켜 새 날짜로 고쳐 쓰게 했다."},
      {"소식지의 마지막 장", "오벨리스크로 돌아가 원판을 확인하라."},
      "원판에는 '우리는 처음부터 오스티아와 전쟁 중이었다'라고 쓰여 있다. 그런데 어제는 오스티아가 동맹이었다. 진실을 새로 새길 수도, 모두가 믿는 거짓을 그대로 둘 수도 있다.",
      {"원판을 모래 위에 크게 새긴다", "상단 사람들이 모여 읽는다. 일부는 믿지 않고 일부는 운다. 진실이 퍼지는 데는 시간이 걸린다.", 350, 2, 1},
      {"원판을 숨겨 두고 때를 기다린다", "원판은 오벨리스크 밑에 묻힌다. 모두가 믿는 거짓은 그대로이지만 언젠가를 위한 씨앗이다.", 450, 2, 2}),
    make("lord-swamp", "QLLordSwamp", "Sub", "[영주] 눈이 달린 두꺼비", {Zone = "swamp"},
      "안개 마녀단의 수장 모르가나는 두꺼비들을 풀어 마을 곳곳을 감시한다. 두꺼비의 눈에는 빅브라더의 문양이 있다.",
      "mistTower", "swamp", "lord", {"안개 마녀의 탑 감시실", "마녀의 탑을 조사하라.", "탑 꼭대기 방에는 수십 개의 거울이 있고 모든 거울에 마을 사람들이 비친다. 두꺼비 눈이 거울과 연결된 텔레스크린이다."},
      {"늪 마녀단의 수장 모르가나", "늪의 영주를 쓰러뜨려 감시 거울을 끊어라.", "모르가나는 숨을 몰아쉰다. '나는 감시자가 아니라 감시당하는 자야. 두꺼비는 내 몸에도 붙어 있었어.'"},
      {"끊어진 거울", "탑으로 돌아가 남은 거울을 정하라."},
      "거울 하나는 아직 켜져 있다. 그 속에 마을 사람들이 서로를 고발하는 모습이 비친다. 거울을 끄면 감시는 끝나지만 마을이 서로를 의심한 증거도 사라진다.",
      {"모든 거울을 깨뜨린다", "거울이 깨지며 안개가 걷힌다. 두꺼비들이 눈을 잃고 늪으로 돌아간다. 마을은 서로를 의심한 기억만 안고 남았다.", 400, 3, 1},
      {"거울 하나를 남겨 증거로 둔다", "거울 하나가 탑에 남는다. 언젠가 누군가는 그 거울 속 진실을 보게 될 것이다.", 550, 3, 2}),
    make("lord-citadel", "QLLordCitadel", "Sub", "[영주] 2분간의 증오", {Zone = "citadel"},
      "몰락한 성주 아이젠은 매일 정오에 성문 앞 광장에 사람들을 모아 2분 동안 적의 초상을 보여 준다. 증오가 식으면 병사들이 사라진다.",
      "gate", "citadel", "lord", {"성문의 쌍거인", "불타는 성문을 조사하라.", "쌍거인의 눈에서 빛이 쏟아져 광장을 비춘다. 이 빛 아래서 사람들은 모두 같은 표정으로 같은 말을 외친다."},
      {"몰락한 성주 아이젠", "성채의 영주를 쓰러뜨려라.", "아이젠은 마지막 숨으로 말한다. '나는 증오를 흉내냈을 뿐이야. 그러다 진짜로 증오하게 됐다. 이 성이 두려워하는 건 적이 아니라 우리 자신이야.'"},
      {"증오의 광장", "성문으로 돌아가 쌍거인의 빛을 마주하라."},
      "쌍거인의 눈은 아직 증오의 초상을 비춘다. 빛을 끄면 광장은 침묵하지만, 침묵 속에서 사람들은 처음으로 서로의 얼굴을 보게 될 것이다.",
      {"쌍거인의 눈을 닫는다", "빛이 꺼진다. 광장은 조용해졌고 누군가 처음으로 울음을 터뜨린다. 그것이 첫 번째 목소리다.", 450, 4, 1},
      {"눈을 다른 방향으로 돌린다", "빛이 성 밖을 비춘다. 증오는 새 대상을 찾아 떠난다. 아이젠의 마지막 말이 마음에 걸린다.", 600, 4, 2}),
    make("lord-canyon", "QLLordCanyon", "Sub", "[영주] 전쟁은 평화", {Zone = "canyon"},
      "협곡 군벌 라자크는 오크 부족과 맺은 휴전 맹세를 깨라는 명령을 받았다. 명령서에는 '전쟁은 평화다'라고 쓰여 있다.",
      "altarOrc", "canyon", "lord", {"해골 대족장의 제단", "협곡의 제단을 조사하라.", "휴전 맹세의 석판이 반으로 갈라져 있다. 갈라진 면에 두 가지 다른 문구가 새겨져 있다. '평화를 지킨다'와 '평화를 위해 싸운다'."},
      {"협곡 군벌 라자크", "협곡의 영주를 쓰러뜨려라.", "라자크의 갑옷 안에 오크 부족의 팔찌가 걸려 있다. 그는 맹세를 지키려다 군벌이 되었다."},
      {"갈라진 맹세", "제단으로 돌아가 석판을 이어라."},
      "석판을 이으면 '평화를 지킨다'는 문구만 남고 전쟁 선전 문구가 사라진다. 하지만 그 순간부터 빅브라더의 군대가 협곡을 노린다.",
      {"석판을 이어 맹세를 되살린다", "석판이 맞물리며 빛난다. 오크 부족이 계곡 위에서 무기를 내려놓는다. 군대가 온다는 소문이 곧 따라올 것이다.", 400, 3, 1},
      {"석판을 숨기고 시간을 번다", "석판 조각이 제단 밑에 숨겨진다. 협곡은 잠시 평화롭다. 평화는 아직 선택이 아니다.", 500, 3, 2}),
    make("lord-chaos", "QLLordChaos", "Sub", "[영주] 지워진 단어들", {Zone = "chaos"},
      "혼돈의 사도 벨리알은 균열 속 문장을 매일 하나씩 깎는다. 단어가 줄수록 사람들은 생각하는 법을 잊는다.",
      "rift", "chaos", "lord", {"균열의 새 사전", "심연의 균열 가장자리를 조사하라.", "균열 벽에 사전이 새겨져 있다. 매 판마다 단어가 줄어든다. '자유'도 '선택'도 이미 지워졌다."},
      {"혼돈 사도 벨리알", "혼돈의 영주를 쓰러뜨려라.", "벨리알은 지워진 글자들 사이에서 속삭인다. '단어가 없으면 반항도 없다. 나는 가장 마지막에 내 이름을 지울 거야.'"},
      {"마지막 사전", "균열로 돌아가 사전을 마주하라."},
      "사전의 마지막 판에는 단어가 세 개 남아 있다. 새로 한 단어를 더할 수 있다. 어떤 단어를 쓰겠는가?",
      {"'자유'를 새긴다", "균열이 희게 빛난다. 사람들이 잊었던 단어를 입에 올리기 시작한다. 빅브라더는 이 글자를 지우러 올 것이다.", 450, 4, 1},
      {"'기억'을 새긴다", "균열이 낮게 울린다. 지워진 단어들이 기억 속에서 조금씩 되살아난다. 서두르지 않는 저항이다.", 500, 4, 2}),
    make("lord-desert", "QLLordDesert", "Sub", "[영주] 둘에 둘을 더하면", {Zone = "desert"},
      "황금 사막의 스핑크스는 길손에게 묻는다. '둘에 둘을 더하면?' 맞히면 길을 열고 틀리면 모래가 삼킨다.",
      "sphinx", "desert", "lord", {"스핑크스의 수수께끼", "황금 사막의 스핑크스 앞으로 가라.", "스핑크스 앞 모래에 수천 개의 발자국이 있다. 모두 앞으로만 향해 있다. 돌아간 자국은 없다."},
      {"모래 칼날 단장 아마르", "사막의 영주를 쓰러뜨려라.", "아마르는 스핑크스의 답을 알고 있었다. '정답은 다섯이다. 네 번째 대답은 모두 죽었다. 나는 다섯이라 답하고 살았지.'"},
      {"스핑크스의 대답", "스핑크스 앞으로 돌아가 답하라."},
      "스핑크스: '둘에 둘을 더하면?' 진실은 넷이다. 하지만 살아남은 모두는 다섯이라 답했다.",
      {"넷이라고 답한다", "스핑크스가 눈을 감는다. 모래가 갈라지며 길이 열린다. 단, 이 길을 걸은 자는 다시는 둘 더하기 둘을 다섯이라 말할 수 없다.", 400, 3, 1},
      {"다섯이라 답한다", "스핑크스가 웃는다. 길이 열리지만 모래 위에 새 발자국이 하나 더 남는다. 네 것이다.", 650, 3, 2}),
    make("lord-deadmarsh", "QLLordDeadmarsh", "Sub", "[영주] 101호실의 사제", {Zone = "deadmarsh"},
      "죽은 늪의 사제왕 말라크는 푸른 불을 모아 '101호실'이라 부르는 사당을 만들었다. 가장 두려워하는 것을 보여 주고 이름을 받아 가는 곳이다.",
      "shrineDead", "deadmarsh", "lord", {"죽은 늪의 사당", "죽은 늪의 사당 앞으로 가라.", "사당 문 위에 '101'이 새겨져 있다. 안에서 사람들의 비명이 아니라 속삭임이 들린다. '대신 저 사람을 하세요.'"},
      {"죽은 늪의 사제왕 말라크", "죽은 늪의 영주를 쓰러뜨려라.", "말라크는 사당의 열쇠를 쥔 채 웃는다. '나는 두려운 걸 보는 데 지쳤다. 네가 두려워하는 건 무엇이냐, 카인?'"},
      {"101호실 앞", "사당으로 돌아가 문을 열 것인지 정하라."},
      "사당 문이 열려 있다. 안에는 네가 가장 두려워하는 것이 있다. 들어가면 이름의 일부를 내주고 약점을 마주한다. 들어가지 않으면 푸른 불은 영원히 갇힌다.",
      {"들어가서 두려움을 마주한다", "문 안에서 네 옛 이름이 보인다. 눈을 뜨자 푸른 불 하나가 사람의 모습으로 돌아와 길을 알려 준다.", 450, 4, 1},
      {"문을 부수고 푸른 불을 해방한다", "문이 무너진다. 푸른 불들이 풀려 하늘로 오른다. 말라크의 마지막 표정은 안도였다.", 550, 4, 2}),
  }
  -- 동료 개인 퀘스트 9편 (영입 후 해금) ------------------------------------
  local personal = {
    make("p-rowen", "QLPRowen", "Companion", "[동료] 지워진 궁수 명부", {Companion = "rowen"},
      "로웬이 백송 기사단 명부를 찾는다. 이름 위에 검은 줄이 그어져 있다. 누군가 단원들을 기록에서 지웠다.",
      "rootaltar", "worldtree", "named", {"뿌리 제단의 명부", "세계수 뿌리 제단으로 가라.", "제단 틈에 명부 조각. 로웬의 이름 옆에 '배신자'라고 적혀 있다. 하지만 필체는 로웬의 동료 것이다."},
      {"명부를 지키는 파수꾼", "숲의 명명 보스를 쓰러뜨려 명부 조각을 모아라.", "명부 조각이 이어지며 숲의 진짜 이야기가 드러난다. 누가 로웬을 고발했는지."},
      {"고발자의 이름", "제단으로 돌아가 명부를 마주하라."},
      "로웬: '고발한 사람이 이름을 불리면 나는 어떻게 해야 하지? 복수를? 용서를? 아니면 이름을 다시 지울까?'",
      {"고발자의 이름을 함께 기억한다", "로웬이 고개를 끄덕인다. '지우지 않는 게 내 방식이야.'", 350, 3, 1},
      {"고발자를 찾아가 대화를 청한다", "로웬이 활을 내린다. '대화로 끝나길 바라자.' 다음 길을 열어 줄 단서를 얻는다.", 450, 3, 2}),
    make("p-doran", "QLPDoran", "Companion", "[동료] 병기 설계도의 행방", {Companion = "doran"},
      "도란이 거부한 병기 설계도는 사라지지 않았다. 누군가 복원해 홍염 기사단 잔당에게 건넸다.",
      "crater", "volcano", "lord", {"분화구의 대장간", "화산 분화구의 대장간 터를 조사하라.", "설계도는 구석구석 복사되어 있었다. 평화부 도장이 찍힌 사본. 그 도장은 '평화를 위한 무기'라 읽힌다."},
      {"설계도를 쥔 영주", "화산의 영주를 쓰러뜨려 설계도를 회수하라.", "영주의 서랍에서 설계도 원본이 나온다. 도란의 필체로 '이건 불량품이다'라 쓴 메모가 붙어 있다."},
      {"설계도의 처분", "분화구로 돌아가 설계도를 마주하라."},
      "도란: '이 설계도로 만든 칼은 많은 이를 지킬 수도, 많은 이를 죽일 수도 있다. 쇠는 정직하지만 이걸 쥔 손은 아니야.'",
      {"설계도를 용암에 던진다", "설계도가 불에 닿아 사라진다. 도란이 망치를 쥔다. '이 정도면 됐어. 이제 방패를 만들자.'", 400, 3, 1},
      {"설계도를 방어용으로 고쳐 쓴다", "도란이 설계도의 날을 방패로 바꾼다. 도란의 새 작품이 완성되기까지 시간이 걸릴 것이다.", 500, 3, 2}),
    make("p-ifa", "QLPIfa", "Companion", "[동료] 환자 명단 101", {Companion = "ifa"},
      "이프가 치유하던 환자들이 어느 날 사라졌다. 명단에는 환자 번호만 남아 있다.",
      "obelisk", "oasis", "named", {"사막 치유소 터", "오아시스의 오벨리스크 곁 치유소 터를 조사하라.", "치유소 벽에 환자 번호와 '심문 완료'가 적혀 있다. 치유가 아니라 심문이었다."},
      {"치유소를 점령한 자", "오아시스의 명명 보스를 쓰러뜨려라.", "이프의 동료들이 환자를 숨기려다 잡혀갔다. 명단의 끝에 이프의 이름이 있다."},
      {"마지막 환자", "치유소로 돌아가 명단을 마주하라."},
      "이프: '내 이름이 환자 번호 사이에 있어요. 내가 치유하던 건 누구였을까요? 나는 환자였을까요, 치유사였을까요?'",
      {"이프의 이름을 다시 불러 준다", "이프가 눈물을 닦는다. '이름이 나를 사람으로 남겨요. 앞으로도 불러 줘요.'", 350, 3, 1},
      {"환자들을 찾아 나선다", "이프가 약 보따리를 챙긴다. '먼저 그들을 찾자. 내 이름은 그다음에.'", 450, 3, 2}),
    make("p-har", "QLPHar", "Companion", "[동료] 두 곳에서 받은 계약서", {Companion = "har"},
      "하르의 오래된 계약서는 서로 적인 두 세력에게서 똑같이 받은 것이다. 한쪽 계약서가 불타고 있다.",
      "lighthouse", "windcliff", "named", {"등대의 계약서", "바람 절벽 등대 서랍을 조사하라.", "계약서 두 장은 모두 같은 서명. 두 세력은 같은 곳에서 하르를 고용했다. 전쟁은 연극이었다."},
      {"계약의 중개인", "바람 절벽의 명명 보스를 쓰러뜨려라.", "중개인의 머리말: '이긴 쪽이 누구든 승리한 건 우리다.' 하르는 이를 악문다."},
      {"계약의 값", "등대로 돌아가 하르와 이야기하라."},
      "하르: '강한 놈이 이긴다고 믿었는데, 이긴 놈이 정해져 있었다고? 그럼 나는 뭐 때문에 싸운 거지?'",
      {"하르의 이유를 함께 찾는다", "하르가 도끼를 땅에 박는다. '이유는 이긴 다음이 아니라 싸우기 전에 지어야 했군.'", 400, 3, 1},
      {"계약서를 태우고 새 계약을 맺는다", "하르가 계약서를 불에 던진다. '이번엔 내가 주인이다.' 보수는 두 배가 되었다.", 550, 3, 2}),
    make("p-ria", "QLPRia", "Companion", "[동료] 눈이 있는 석상", {Companion = "ria"},
      "리아는 습원 기념비의 두꺼비 석상 눈이 자신을 따라 움직였다고 말한다. 아무도 믿지 않았다.",
      "toadMonument", "wetland", "lord", {"대두꺼비 기념비", "습원 대두꺼비 기념비를 조사하라.", "석상 눈에는 미세한 유리 렌즈가 박혀 있다. 렌즈 뒤에 서류함. 정찰병이 본 모든 것이 기록되어 있다."},
      {"기념비의 감시자", "습원의 영주를 쓰러뜨려라.", "감시자는 리아의 정찰 일지를 가지고 있었다. 한 쪽에 '이 아이는 도망치는 법을 안다'라 적혀 있다."},
      {"정찰병의 일지", "기념비로 돌아가 일지를 마주하라."},
      "리아: '내가 도망친 곳마다 이미 누가 기다리고 있었어. 나는 먼저 본 줄 알았는데 계속 보이고 있었던 거야.'",
      {"렌즈를 모두 부순다", "렌즈가 깨지며 습원이 조용해진다. 리아가 웃는다. '이제 내가 먼저 본다.'", 350, 2, 1},
      {"렌즈를 역이용해 적을 속인다", "리아가 렌즈 방향을 틀어 가짜 정보를 보낸다. 감시자들은 한동안 헛돌 것이다.", 500, 2, 2}),
    make("p-morgan", "QLPMorgan", "Companion", "[동료] 마력의 이자", {Companion = "morgan"},
      "모르간의 빚은 마력이 아니라 약속이었다. 갚지 못한 이자가 몸을 먹고 있다.",
      "mistTower", "swamp", "named", {"탑 지하의 계약", "안개 마녀의 탑 지하를 조사하라.", "지하에 붉은 서명의 계약서. 모르간이 서명한 날짜는 아직 오지 않은 날이다."},
      {"계약의 집행관", "늪의 명명 보스를 쓰러뜨려라.", "집행관: '빚은 사라지지 않는다. 다만 다른 사람의 이름으로 옮겨질 뿐이다.'"},
      {"빚의 이전", "탑으로 돌아가 계약을 마주하라."},
      "모르간: '내 빚을 네 이름으로 옮길 수 있다고 한다. 하지만 그건 도둑질이야. 아니면 우리 둘이 나눠 갚자는 거야?'",
      {"빚을 둘이 나눠 갚자고 한다", "모르간이 오래 침묵한다. '…그럼 내가 갚는 이자는 반이 되겠군. 고맙다는 말은 안 할 거야.'", 400, 3, 1},
      {"계약서를 찢어버린다", "계약서가 찢기며 모르간의 몸에서 보라색 연기가 솟는다. 그녀는 비틀거리다 웃는다. '미쳤네. 하지만 시원하다.'", 500, 3, 2}),
    make("p-baren", "QLPBaren", "Companion", "[동료] 돌에 새긴 약속", {Companion = "baren"},
      "바렌이 돌에 새긴 약속은 누군가 몰래 고쳐 쓴 상태다. 한 글자가 바뀌어 약속이 거짓말이 되었다.",
      "throne", "highland", "lord", {"왕좌 바위의 각인", "고원 설인 왕좌 바위의 각인을 조사하라.", "각인은 '지키겠다'에서 '지켜보겠다'로 한 글자가 바뀌어 있다. 새 각인은 최근 것이다."},
      {"각인을 고친 영주", "고원의 영주를 쓰러뜨려라.", "영주의 정이 날이 닳은 상태다. 그는 말한다. '약속은 바뀌어야 하니까. 사실은 그게 기록이야.'"},
      {"바뀐 약속", "왕좌 바위로 돌아가 각인을 마주하라."},
      "바렌: '말은 짧게, 발자국은 길게. 하지만 돌이 거짓말을 하면 발자국도 따라 거짓말이 된다.'",
      {"각인을 원래대로 고친다", "바렌이 정으로 한 글자를 되돌린다. '돌은 이제 거짓을 못 해.'", 400, 3, 1},
      {"바뀐 각인 옆에 원래 글을 다시 새긴다", "두 약속이 나란히 새겨진다. 바렌: '둘 다 남기자. 사람들이 보고 고르게.'", 500, 3, 2}),
    make("p-tibo", "QLPTibo", "Companion", "[동료] 금지된 노래", {Companion = "tibo"},
      "티보가 부르던 노래의 한 소절이 금지곡 목록에 올랐다. 그 소절은 처음부터 이 땅의 노래였다.",
      "beacon", "meadow", "named", {"봉화 불탑 밑의 악보", "초원 봉화 불탑 밑을 조사하라.", "악보 한 장이 벽돌 틈에 끼어 있다. 금지된 소절이 가장 오래된 필체로 적혀 있다."},
      {"노래를 금지한 검열관", "초원의 명명 보스를 쓰러뜨려라.", "검열관의 수첩에는 금지된 노래 목록이 있다. 모든 노래가 사랑·자유·이름에 관한 것이다."},
      {"마지막 소절", "봉화 불탑으로 돌아가 노래를 마주하라."},
      "티보: '노래는 부르는 순간 사람의 것이 되는데, 금지된 순간 노래의 목숨도 사라져요. 나는 어떻게 해야 하나요?'",
      {"금지된 소절을 사람들 앞에서 부른다", "티보의 목소리가 광장에 울린다. 일부는 숨죽이고 일부는 따라 부른다. 금지는 사라지지 않았지만 노래는 살아남았다.", 400, 3, 1},
      {"가사를 바꿔 몰래 퍼뜨린다", "티보가 가사의 한 단어를 바꿔 노래를 퍼뜨린다. 검열관들은 모르는 새 같은 노래를 따라 부른다.", 500, 3, 2}),
    make("p-cassian", "QLPCassian", "Companion", "[동료] 성문의 기록", {Companion = "cassian"},
      "카시안이 지키지 못한 성문의 기록이 하룻밤 사이 다르게 쓰였다. 그는 문을 지켰다고 적혀 있다.",
      "gate", "citadel", "named", {"성문의 기록실", "성채의 쌍거인 성문 기록실을 조사하라.", "기록: '카시안은 끝까지 문을 지켰다.' 하지만 카시안은 문을 열어 주었다. 그의 기억과 기록이 정반대다."},
      {"기록을 고친 서기", "성채의 명명 보스를 쓰러뜨려라.", "서기는 말한다. '누군가의 영웅담이 필요했을 뿐이다. 진실은 영웅에게 아무 쓸모가 없으니까.'"},
      {"성문의 진실", "성문으로 돌아가 카시안과 이야기하라."},
      "카시안: '나는 문을 열었다. 도망치는 사람들을 위해. 기록은 영웅이라 쓰지만 나는 문지기가 아니라 문을 연 자다.'",
      {"진실을 새로 기록한다", "카시안이 직접 석판에 쓴다. '나는 문을 열어 사람들을 살렸다.' 늦은 선택이 기록이 된다.", 400, 4, 1},
      {"기록을 그대로 두고 이야기만 남긴다", "카시안이 고개를 숙인다. '영웅으로 남지 않아도 괜찮다. 네가 알면 충분하다.'", 500, 4, 2}),
    make("p-garon", "QLPGaron", "Companion", "[동료] 보름달의 사냥 일지", {Companion = "garon"},
      "가론은 저주에 먹힌 동안 자신이 사냥한 것이 짐승만이 아니었다는 걸 안다. 일지의 마지막 장이 비어 있다.",
      "rootaltar", "worldtree", "named", {"뿌리 제단 밑의 일지", "세계수 뿌리 제단 밑을 조사하라.", "일지 한쪽에 사람 이름들이 적혀 있다. 보름달마다 하나씩, 이름 옆엔 사과의 말이 지워지다 만 흔적이다."},
      {"일지를 쥔 숲의 파수꾼", "숲의 명명 보스를 쓰러뜨려라.", "파수꾼은 사냥꾼 마을의 유족이 맡긴 일지의 사본을 들고 있다. '용서하지 말라'고 적혀 있다."},
      {"마지막 장", "제단으로 돌아가 가론과 이야기하라."},
      "가론: '내가 해친 이들의 가족이 아직 숲 어귀에 산다. 용서받자는 게 아니야. 이름을 부르러 가고 싶다.'",
      {"유족을 함께 찾아간다", "가론이 일지를 가슴에 안고 걷는다. '용서를 구하지 않겠다. 대신 남은 날 동안 그 문 앞을 지키겠다.'", 400, 3, 1},
      {"일지를 제단에 묻는다", "가론이 일지를 묻고 오래 서 있다. '사냥은 끝났다. 이제 지키는 일만 하겠다.'", 500, 3, 2}),
    make("p-pafnir", "QLPPafnir", "Companion", "[동료] 비늘 아래의 보물", {Companion = "pafnir"},
      "파프니르가 모은 보물은 아직 협곡 어딘가에 쌓여 있다. 저주는 풀렸지만 보물이 다시 그를 부르고 있다.",
      "altarOrc", "canyon", "named", {"제단 밑 보물 방", "고대 협곡 해골 대족장의 제단 밑을 조사하라.", "금화와 갑옷 조각이 산처럼 쌓여 있다. 모두 파프니르가 지키지 못한 병사들의 것이다."},
      {"보물을 노리는 도굴꾼 두목", "협곡의 명명 보스를 쓰러뜨려라.", "도굴꾼은 말한다. '용을 잡은 보물이야, 임자가 어디 있나.' 파프니르의 손이 떨린다."},
      {"탐욕의 값", "제단으로 돌아가 파프니르와 이야기하라."},
      "파프니르: '저 보물은 내 것이 아니었어. 병사들의 유족에게 돌려주고 싶다. 하지만 나는 다시 탐욕에 흔들릴까 두렵다.'",
      {"함께 유족에게 돌려준다", "금화가 길을 따라 흩어진다. 파프니르가 처음으로 가볍게 웃는다. '비늘보다 가벼운 건 처음이군.'", 450, 4, 1},
      {"보물을 봉인하고 그를 지켜본다", "제단이 닫히고 파프니르가 열쇠를 네게 맡긴다. '내가 흔들리면 네가 열어라.'", 600, 4, 2}),
    make("p-lyva", "QLPLyva", "Companion", "[동료] 해독제의 이름", {Companion = "lyva"},
      "리바가 전염병을 막으려 만든 해독제는 사람을 구했지만 그녀를 히드라로 만들었다. 해독제의 처방이 아직 늪에 남아 있다.",
      "toadMonument", "wetland", "named", {"기념비 밑의 처방", "남부 습원 대두꺼비 기념비 밑을 조사하라.", "방수 천에 싸인 처방. 마지막 줄 재료 칸이 '치유사의 일부'로 적혀 있다."},
      {"처방을 노리는 약탈자", "습원의 명명 보스를 쓰러뜨려라.", "약탈자는 처방을 팔아 부자가 되려 했다. '독이든 약이든 값만 맞으면 돼.'"},
      {"독과 약", "기념비로 돌아가 리바와 이야기하라."},
      "리바: '이 처방은 구하는 데 쓰일 수도, 해치는 데 쓰일 수도 있어. 나는 그 끗을 알아. 어디에 두어야 할까?'",
      {"처방을 마을에 공개한다", "리바가 처방을 마을 게시판에 붙인다. '모두가 알면 아무도 독점 못 해.'", 400, 3, 1},
      {"처방을 불태우고 기억만 남긴다", "처방이 재가 된다. 리바가 머리를 짚는다. '필요하면 내가 다시 쓰겠어. 내 머릿속에만.'", 500, 3, 2}),
    make("p-bemus", "QLPBemus", "Companion", "[동료] 마지막 대상", {Companion = "bemus"},
      "베무스는 수백 년 전 마지막으로 지킨 대상이 어디로 갔는지 모른다. 모래 오벨리스크에 대상의 이름이 새겨져 있다고 한다.",
      "obelisk", "oasis", "named", {"오벨리스크의 대상 명부", "모래 오벨리스크 군을 조사하라.", "기둥에 대상의 이름이 새겨져 있다. 마지막 줄은 '베무스가 지켜 준 덕에 닿았다.'"},
      {"명부를 훔친 상인", "오아시스의 명명 보스를 쓰러뜨려라.", "상인은 명부를 지워 유적의 소유권을 주장하려 했다."},
      {"닿은 곳", "오벨리스크로 돌아가 베무스와 이야기하라."},
      "베무스: '내가 지킨 대상은 목적지에 닿았다고 새겨져 있군. 그걸로 족하다. 이제 나는 어디를 지키면 좋겠나?'",
      {"우리 곁을 지켜 달라고 청한다", "베무스가 방패를 땅에 세운다. '그럼 길이 곧 내 대상이다. 함께 걷자.'", 450, 3, 1},
      {"마을 문을 지켜 달라고 청한다", "베무스가 고개를 끄덕인다. '문은 더 오래 지킬 수 있지. 필요할 때 불러라.'", 550, 3, 2}),
  }
  for _, line in ipairs(lines) do table.insert(Config.QuestLines, line) end
  for _, line in ipairs(personal) do table.insert(Config.QuestLines, line) end
  -- [하단 퀵슬롯 저장] QuickInit=0이면 기본 배치. 칸 값: 0=비움, 1~5=무기·채집·체력약·기력약·오일, 10+n=Config.Actions[n].
  Config.InitialState.QuickInit = 0
  -- [길 안내·튜토리얼] GuideOff=1이면 목표 표시를 끈다. TutorialStep: 0=처음, 99=마침(건너뜀 포함).
  Config.InitialState.GuideOff = 0
  Config.InitialState.TutorialStep = 0
  for slotIndex = 1, 5 do Config.InitialState["QuickSlot" .. slotIndex] = 0 end
  -- 새 줄의 단계 · 진행 · 선택 저장 필드를 InitialState에 등록한다.
  for _, line in ipairs(Config.QuestLines) do
    for _, suffix in ipairs({"", "P", "C"}) do
      if Config.InitialState[line.Field .. suffix] == nil then Config.InitialState[line.Field .. suffix] = 0 end
    end
  end
end


-- [마력숲 90노드] 5계열×3분기×6노드. 60사용형(그중 고급 15), 지속효과 30.
Config.MeadowSkillSchools = {{Id="Warrior",Name="전사"},{Id="Guardian",Name="수호"},{Id="Hunter",Name="사냥"},{Id="Shadow",Name="그림자"},{Id="Magic",Name="마력"}}
Config.MeadowSkillNodes = {
  {Id="mf-warrior-1-1",Index=1,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=1,Name="돌진 베기",Kind="ACTIVE",Mode="DASH",Description="전진 공격. 가까운 적에게 피해를 주고 재배치한다.",Advanced=false,Gauge=12,Cooldown=6,Range=10,IconCell=0},
  {Id="mf-warrior-1-2",Index=2,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=2,Name="돌파의 기세",Kind="PASSIVE",Mode="W_GAUGE",Description="연속 명중하면 기력을 축적한다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=0},
  {Id="mf-warrior-1-3",Index=3,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=3,Name="균열 강타",Kind="ACTIVE",Mode="STUN",Description="적의 공격 예고를 끊는 강타.",Advanced=false,Gauge=19,Cooldown=9,Range=10,IconCell=0},
  {Id="mf-warrior-1-4",Index=4,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=4,Name="강공격 박자",Kind="PASSIVE",Mode="W_TIMING",Description="강타 뒤 정확한 연계 타격의 보상이 커진다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=0},
  {Id="mf-warrior-1-5",Index=5,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=5,Name="전진 휩쓸기",Kind="ACTIVE",Mode="SWEEP",Description="근처 여러 적에게 근접 범위 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=10,IconCell=0},
  {Id="mf-warrior-1-6",Index=6,School="Warrior",SchoolName="전사",Branch="돌파",Lane=1,Step=6,Name="전장의 격노",Kind="ACTIVE",Mode="FURY",Description="큰 기력을 사용해 잠시 무기 연계 공격력을 강화.",Advanced=true,Gauge=70,Cooldown=38,Range=10,IconCell=0},
  {Id="mf-warrior-2-1",Index=7,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=1,Name="초승달 베기",Kind="ACTIVE",Mode="STRIKE",Description="집중하는 한 적에게 강한 단일 타격.",Advanced=false,Gauge=12,Cooldown=6,Range=10,IconCell=1},
  {Id="mf-warrior-2-2",Index=8,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=2,Name="연속 명중",Kind="PASSIVE",Mode="W_COMBO",Description="연타가 이어질수록 다음 피해가 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=1},
  {Id="mf-warrior-2-3",Index=9,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=3,Name="쌍검 연타",Kind="ACTIVE",Mode="MULTI",Description="한 표적에게 빠른 연속 타격.",Advanced=false,Gauge=19,Cooldown=9,Range=10,IconCell=1},
  {Id="mf-warrior-2-4",Index=10,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=4,Name="처치 추격",Kind="PASSIVE",Mode="W_CHASE",Description="적 처치 후 추격에 쓸 기력이 회복된다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=1},
  {Id="mf-warrior-2-5",Index=11,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=5,Name="회전 베기 강화",Kind="ACTIVE",Mode="SWEEP",Description="근처 여러 적에게 근접 범위 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=10,IconCell=1},
  {Id="mf-warrior-2-6",Index=12,School="Warrior",SchoolName="전사",Branch="연속 공격",Lane=2,Step=6,Name="연속 일격",Kind="ACTIVE",Mode="FOCUS_STRIKE",Description="큰 기력을 사용해 한 적에게 집중 연타.",Advanced=true,Gauge=70,Cooldown=38,Range=10,IconCell=1},
  {Id="mf-warrior-3-1",Index=13,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=1,Name="무기 교차",Kind="ACTIVE",Mode="STRIKE",Description="집중하는 한 적에게 강한 단일 타격.",Advanced=false,Gauge=12,Cooldown=6,Range=10,IconCell=2},
  {Id="mf-warrior-3-2",Index=14,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=2,Name="무기 전환 호흡",Kind="PASSIVE",Mode="W_SWITCH",Description="무기 교체 후 첫 공격이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=2},
  {Id="mf-warrior-3-3",Index=15,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=3,Name="저격 찌르기",Kind="ACTIVE",Mode="STRIKE",Description="집중하는 한 적에게 강한 단일 타격.",Advanced=false,Gauge=19,Cooldown=9,Range=10,IconCell=2},
  {Id="mf-warrior-3-4",Index=16,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=4,Name="포위 대응",Kind="PASSIVE",Mode="W_POISE",Description="다수에게 포위되었을 때 받는 피해에 저항한다.",Advanced=false,Gauge=0,Cooldown=0,Range=10,IconCell=2},
  {Id="mf-warrior-3-5",Index=17,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=5,Name="결전 타격",Kind="ACTIVE",Mode="STUN",Description="적의 공격 예고를 끊는 강타.",Advanced=false,Gauge=26,Cooldown=13,Range=10,IconCell=2},
  {Id="mf-warrior-3-6",Index=18,School="Warrior",SchoolName="전사",Branch="무기 숙련",Lane=3,Step=6,Name="무기 해방",Kind="ACTIVE",Mode="FURY",Description="큰 기력을 사용해 잠시 무기 연계 공격력을 강화.",Advanced=true,Gauge=70,Cooldown=38,Range=10,IconCell=2},
  {Id="mf-guardian-1-1",Index=19,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=1,Name="방패 자세",Kind="ACTIVE",Mode="GUARD",Description="짧은 방어 자세로 들어오는 피해를 줄여.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=3},
  {Id="mf-guardian-1-2",Index=20,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=2,Name="정밀 반격",Kind="PASSIVE",Mode="G_PARRY",Description="정밀 방어 직후 다음 반격이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=3},
  {Id="mf-guardian-1-3",Index=21,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=3,Name="방패 강타",Kind="ACTIVE",Mode="STUN",Description="적의 공격 예고를 끊는 강타.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=3},
  {Id="mf-guardian-1-4",Index=22,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=4,Name="정면 방호",Kind="PASSIVE",Mode="G_FRONT",Description="정면에서 막는 공격의 피해를 더 줄인다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=3},
  {Id="mf-guardian-1-5",Index=23,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=5,Name="완벽 반사",Kind="ACTIVE",Mode="PARRY",Description="정확한 타이밍에 적의 공격을 끊는 반격 준비.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=3},
  {Id="mf-guardian-1-6",Index=24,School="Guardian",SchoolName="수호",Branch="방패 반격",Lane=1,Step=6,Name="불굴",Kind="ACTIVE",Mode="LAST_STAND",Description="치명적 순간을 버틸 강한 방어와 회복.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=3},
  {Id="mf-guardian-2-1",Index=25,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=1,Name="보호 결계",Kind="ACTIVE",Mode="SHIELD",Description="자신과 가까운 아군에게 피해 경감 보호를 걸어.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=4},
  {Id="mf-guardian-2-2",Index=26,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=2,Name="보호의 기세",Kind="PASSIVE",Mode="G_ALLY",Description="가까운 아군을 보호하면 기력을 얻는다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=4},
  {Id="mf-guardian-2-3",Index=27,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=3,Name="구원 돌진",Kind="ACTIVE",Mode="DASH",Description="전진 공격. 가까운 적에게 피해를 주고 재배치한다.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=4},
  {Id="mf-guardian-2-4",Index=28,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=4,Name="견고한 전열",Kind="PASSIVE",Mode="G_STAGGER",Description="방어 자세 중 밀려남을 억제한다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=4},
  {Id="mf-guardian-2-5",Index=29,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=5,Name="연대 치유",Kind="ACTIVE",Mode="HEAL_AOE",Description="근처 아군과 함께 체력을 회복해.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=4},
  {Id="mf-guardian-2-6",Index=30,School="Guardian",SchoolName="수호",Branch="아군 보호",Lane=2,Step=6,Name="기사단의 맹세 강화",Kind="ACTIVE",Mode="OATH",Description="기력을 크게 써서 주변 아군과 전선을 유지해.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=4},
  {Id="mf-guardian-3-1",Index=31,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=1,Name="강철 호흡",Kind="ACTIVE",Mode="HEAL",Description="체력이 닳은 대상을 빠르게 회복해.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=5},
  {Id="mf-guardian-3-2",Index=32,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=2,Name="위기의 보호",Kind="PASSIVE",Mode="G_CRISIS",Description="체력 위기 때 일회성 보호가 발동한다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=5},
  {Id="mf-guardian-3-3",Index=33,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=3,Name="견고한 의지",Kind="ACTIVE",Mode="GUARD",Description="짧은 방어 자세로 들어오는 피해를 줄여.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=5},
  {Id="mf-guardian-3-4",Index=34,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=4,Name="반격 보급",Kind="PASSIVE",Mode="G_REFUND",Description="정밀 반격 성공 시 기력을 회수한다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=5},
  {Id="mf-guardian-3-5",Index=35,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=5,Name="방어 폭풍",Kind="ACTIVE",Mode="SWEEP",Description="근처 여러 적에게 근접 범위 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=5},
  {Id="mf-guardian-3-6",Index=36,School="Guardian",SchoolName="수호",Branch="생존",Lane=3,Step=6,Name="철벽",Kind="ACTIVE",Mode="BULWARK",Description="기력을 크게 소모해 강한 방패 보호 상태가 돼.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=5},
  {Id="mf-hunter-1-1",Index=37,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=1,Name="약점 표식",Kind="ACTIVE",Mode="MARK",Description="대상에게 일정 시간 약점 표식을 새겨.",Advanced=false,Gauge=12,Cooldown=6,Range=42,IconCell=1},
  {Id="mf-hunter-1-2",Index=38,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=2,Name="약점 연속",Kind="PASSIVE",Mode="H_WEAK",Description="약점을 연속으로 공격하면 추가 피해.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=1},
  {Id="mf-hunter-1-3",Index=39,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=3,Name="정밀 사격",Kind="ACTIVE",Mode="SHOT",Description="거리를 유지하며 한 적에게 정밀 사격.",Advanced=false,Gauge=19,Cooldown=9,Range=42,IconCell=1},
  {Id="mf-hunter-1-4",Index=40,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=4,Name="거리 감각",Kind="PASSIVE",Mode="H_RANGE",Description="거리별 정밀 사격 피해 특성이 바뀐다.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=1},
  {Id="mf-hunter-1-5",Index=41,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=5,Name="관통 사격",Kind="ACTIVE",Mode="PIERCE",Description="한 줄의 여러 적에게 관통 피해.",Advanced=false,Gauge=26,Cooldown=13,Range=42,IconCell=1},
  {Id="mf-hunter-1-6",Index=42,School="Hunter",SchoolName="사냥",Branch="정밀 사격",Lane=1,Step=6,Name="필살 사격",Kind="ACTIVE",Mode="SNIPE",Description="기력을 크게 써서 원거리 약점을 집중 공격.",Advanced=true,Gauge=70,Cooldown=38,Range=42,IconCell=1},
  {Id="mf-hunter-2-1",Index=43,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=1,Name="부채 사격",Kind="ACTIVE",Mode="FAN",Description="전방 다수에게 넓게 퍼지는 사격.",Advanced=false,Gauge=12,Cooldown=6,Range=42,IconCell=2},
  {Id="mf-hunter-2-2",Index=44,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=2,Name="기동 조준",Kind="PASSIVE",Mode="H_MOVE",Description="이동 직후 첫 사격이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=2},
  {Id="mf-hunter-2-3",Index=45,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=3,Name="분열 화살",Kind="ACTIVE",Mode="SPLIT",Description="한 적 주변으로 갈라지는 다중 사격.",Advanced=false,Gauge=19,Cooldown=9,Range=42,IconCell=2},
  {Id="mf-hunter-2-4",Index=46,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=4,Name="관통의 기세",Kind="PASSIVE",Mode="H_PIERCE",Description="관통 공격으로 다수를 맞히면 기력이 회복된다.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=2},
  {Id="mf-hunter-2-5",Index=47,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=5,Name="연쇄 화살",Kind="ACTIVE",Mode="CHAIN",Description="표적에서 가까운 적으로 연속 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=42,IconCell=2},
  {Id="mf-hunter-2-6",Index=48,School="Hunter",SchoolName="사냥",Branch="다중 공격",Lane=2,Step=6,Name="화살 폭풍",Kind="ACTIVE",Mode="RAIN",Description="기력을 크게 써서 다수 표적을 연속 타격.",Advanced=true,Gauge=70,Cooldown=38,Range=42,IconCell=2},
  {Id="mf-hunter-3-1",Index=49,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=1,Name="추적 덫",Kind="ACTIVE",Mode="TRAP",Description="가까운 적의 이동과 공격을 잠깐 묶어.",Advanced=false,Gauge=12,Cooldown=6,Range=42,IconCell=3},
  {Id="mf-hunter-3-2",Index=50,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=2,Name="사냥 표식",Kind="PASSIVE",Mode="H_TRACK",Description="표식 적에 대한 추적 사격이 강화된다.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=3},
  {Id="mf-hunter-3-3",Index=51,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=3,Name="끈끈이 화살",Kind="ACTIVE",Mode="ROOT",Description="지정한 적을 묶어 공격 준비를 중단해.",Advanced=false,Gauge=19,Cooldown=9,Range=42,IconCell=3},
  {Id="mf-hunter-3-4",Index=52,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=4,Name="덫 연계",Kind="PASSIVE",Mode="H_TRAP",Description="덫에 걸린 적에게 사격을 연계하면 추가 피해.",Advanced=false,Gauge=0,Cooldown=0,Range=42,IconCell=3},
  {Id="mf-hunter-3-5",Index=53,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=5,Name="사냥꾼 낙인",Kind="ACTIVE",Mode="MARK",Description="대상에게 일정 시간 약점 표식을 새겨.",Advanced=false,Gauge=26,Cooldown=13,Range=42,IconCell=3},
  {Id="mf-hunter-3-6",Index=54,School="Hunter",SchoolName="사냥",Branch="추적",Lane=3,Step=6,Name="맹수 추적",Kind="ACTIVE",Mode="HUNT",Description="기력을 크게 써서 표식된 표적을 추격.",Advanced=true,Gauge=70,Cooldown=38,Range=42,IconCell=3},
  {Id="mf-shadow-1-1",Index=55,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=1,Name="기습 일격",Kind="ACTIVE",Mode="BACKSTAB",Description="표적 배후를 노리는 근접 강공격.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=6},
  {Id="mf-shadow-1-2",Index=56,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=2,Name="배후의 칼날",Kind="PASSIVE",Mode="S_BACK",Description="배후에서 맞힌 공격이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=6},
  {Id="mf-shadow-1-3",Index=57,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=3,Name="은신 걸음",Kind="ACTIVE",Mode="VANISH",Description="적의 공격에서 벗어나기 위한 회피 은신.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=6},
  {Id="mf-shadow-1-4",Index=58,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=4,Name="발각 경계",Kind="PASSIVE",Mode="S_DETECT",Description="발각 직전 재배치할 수 있는 기력을 되찾는다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=6},
  {Id="mf-shadow-1-5",Index=59,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=5,Name="암습 연계",Kind="ACTIVE",Mode="BACKSTAB",Description="표적 배후를 노리는 근접 강공격.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=6},
  {Id="mf-shadow-1-6",Index=60,School="Shadow",SchoolName="그림자",Branch="기습",Lane=1,Step=6,Name="그림자 처형",Kind="ACTIVE",Mode="EXECUTE",Description="기력을 크게 써서 약해진 표적을 마무리.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=6},
  {Id="mf-shadow-2-1",Index=61,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=1,Name="연막 투척",Kind="ACTIVE",Mode="SMOKE",Description="주변 적을 교란해 공격을 잠깐 중단시켜.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=7},
  {Id="mf-shadow-2-2",Index=62,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=2,Name="회피 연계",Kind="PASSIVE",Mode="S_DODGE",Description="회피 직후의 기습 공격이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=7},
  {Id="mf-shadow-2-3",Index=63,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=3,Name="속임수 타격",Kind="ACTIVE",Mode="STUN",Description="적의 공격 예고를 끊는 강타.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=7},
  {Id="mf-shadow-2-4",Index=64,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=4,Name="혼란의 칼날",Kind="PASSIVE",Mode="S_CONFUSE",Description="교란 상태의 적에게 추가 피해.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=7},
  {Id="mf-shadow-2-5",Index=65,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=5,Name="침묵의 칼날",Kind="ACTIVE",Mode="MARK",Description="대상에게 일정 시간 약점 표식을 새겨.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=7},
  {Id="mf-shadow-2-6",Index=66,School="Shadow",SchoolName="그림자",Branch="교란",Lane=2,Step=6,Name="어둠 장막",Kind="ACTIVE",Mode="SMOKE_ADV",Description="많은 기력을 사용해 주변 적을 넓게 교란해.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=7},
  {Id="mf-shadow-3-1",Index=67,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=1,Name="그림자 이동",Kind="ACTIVE",Mode="BLINK",Description="짧게 이동해 기습 위치를 바꿔.",Advanced=false,Gauge=12,Cooldown=6,Range=13,IconCell=8},
  {Id="mf-shadow-3-2",Index=68,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=2,Name="표식 사냥",Kind="PASSIVE",Mode="S_MARK_KILL",Description="표식한 적을 처치하면 기력이 회복된다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=8},
  {Id="mf-shadow-3-3",Index=69,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=3,Name="그림자 갈고리",Kind="ACTIVE",Mode="DASH",Description="전진 공격. 가까운 적에게 피해를 주고 재배치한다.",Advanced=false,Gauge=19,Cooldown=9,Range=13,IconCell=8},
  {Id="mf-shadow-3-4",Index=70,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=4,Name="긴급 탈출",Kind="PASSIVE",Mode="S_ESCAPE",Description="기습 실패 시 짧은 탈출 보호를 얻는다.",Advanced=false,Gauge=0,Cooldown=0,Range=13,IconCell=8},
  {Id="mf-shadow-3-5",Index=71,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=5,Name="연쇄 추격",Kind="ACTIVE",Mode="CHAIN",Description="표적에서 가까운 적으로 연속 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=13,IconCell=8},
  {Id="mf-shadow-3-6",Index=72,School="Shadow",SchoolName="그림자",Branch="추격",Lane=3,Step=6,Name="밤의 추격",Kind="ACTIVE",Mode="NIGHT",Description="기력을 크게 써서 여러 적에게 연달아 기습.",Advanced=true,Gauge=70,Cooldown=38,Range=13,IconCell=8},
  {Id="mf-magic-1-1",Index=73,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=1,Name="마력탄 연성",Kind="ACTIVE",Mode="BOLT",Description="단일 마력탄을 발사해. 마지막 단계에서 관통/분열 선택.",Advanced=false,Gauge=12,Cooldown=6,Range=34,IconCell=7},
  {Id="mf-magic-1-2",Index=74,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=2,Name="주문 교차",Kind="PASSIVE",Mode="M_CHAIN",Description="서로 다른 마법을 이어 쓰면 다음 주문이 강해진다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=7},
  {Id="mf-magic-1-3",Index=75,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=3,Name="폭발탄",Kind="ACTIVE",Mode="BURST",Description="한 적과 주변의 적에게 폭발 마법.",Advanced=false,Gauge=19,Cooldown=9,Range=34,IconCell=7},
  {Id="mf-magic-1-4",Index=76,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=4,Name="폭발 전염",Kind="PASSIVE",Mode="M_SPREAD",Description="표식 폭발 시 가까운 적에게 효과가 전파된다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=7},
  {Id="mf-magic-1-5",Index=77,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=5,Name="마력 파동",Kind="ACTIVE",Mode="SWEEP",Description="근처 여러 적에게 근접 범위 공격.",Advanced=false,Gauge=26,Cooldown=13,Range=34,IconCell=7},
  {Id="mf-magic-1-6",Index=78,School="Magic",SchoolName="마력",Branch="파괴",Lane=1,Step=6,Name="마력 폭주",Kind="ACTIVE",Mode="OVERLOAD",Description="기력을 크게 사용해 잠시 마력 주문의 공격력을 강화.",Advanced=true,Gauge=70,Cooldown=38,Range=34,IconCell=7},
  {Id="mf-magic-2-1",Index=79,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=1,Name="속박 룬",Kind="ACTIVE",Mode="ROOT",Description="지정한 적을 묶어 공격 준비를 중단해.",Advanced=false,Gauge=12,Cooldown=6,Range=34,IconCell=8},
  {Id="mf-magic-2-2",Index=80,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=2,Name="정확한 시전",Kind="PASSIVE",Mode="M_ACCURATE",Description="정확한 주문 시전으로 기력 소모를 절약한다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=8},
  {Id="mf-magic-2-3",Index=81,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=3,Name="서리 장벽",Kind="ACTIVE",Mode="GUARD",Description="짧은 방어 자세로 들어오는 피해를 줄여.",Advanced=false,Gauge=19,Cooldown=9,Range=34,IconCell=8},
  {Id="mf-magic-2-4",Index=82,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=4,Name="검과 주문",Kind="PASSIVE",Mode="M_WEAVE",Description="무기 공격과 주문을 교차하면 공격이 강화된다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=8},
  {Id="mf-magic-2-5",Index=83,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=5,Name="공명 표식",Kind="ACTIVE",Mode="MARK",Description="대상에게 일정 시간 약점 표식을 새겨.",Advanced=false,Gauge=26,Cooldown=13,Range=34,IconCell=8},
  {Id="mf-magic-2-6",Index=84,School="Magic",SchoolName="마력",Branch="제어",Lane=2,Step=6,Name="공명 붕괴",Kind="ACTIVE",Mode="RESONATE",Description="표식한 적을 기점으로 폭발을 일으켜.",Advanced=true,Gauge=70,Cooldown=38,Range=34,IconCell=8},
  {Id="mf-magic-3-1",Index=85,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=1,Name="응급 회복",Kind="ACTIVE",Mode="HEAL",Description="체력이 닳은 대상을 빠르게 회복해.",Advanced=false,Gauge=12,Cooldown=6,Range=34,IconCell=9},
  {Id="mf-magic-3-2",Index=86,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=2,Name="보호막 회수",Kind="PASSIVE",Mode="M_SHIELD_REFUND",Description="보호막이 소진되면 기력을 일부 회수한다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=9},
  {Id="mf-magic-3-3",Index=87,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=3,Name="생명 보호막",Kind="ACTIVE",Mode="SHIELD",Description="자신과 가까운 아군에게 피해 경감 보호를 걸어.",Advanced=false,Gauge=19,Cooldown=9,Range=34,IconCell=9},
  {Id="mf-magic-3-4",Index=88,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=4,Name="초과 치유",Kind="PASSIVE",Mode="M_OVERHEAL",Description="초과 회복량을 짧은 보호 효과로 바꾼다.",Advanced=false,Gauge=0,Cooldown=0,Range=34,IconCell=9},
  {Id="mf-magic-3-5",Index=89,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=5,Name="치유의 물결",Kind="ACTIVE",Mode="HEAL_AOE",Description="근처 아군과 함께 체력을 회복해.",Advanced=false,Gauge=26,Cooldown=13,Range=34,IconCell=9},
  {Id="mf-magic-3-6",Index=90,School="Magic",SchoolName="마력",Branch="회복",Lane=3,Step=6,Name="생명의 공명",Kind="ACTIVE",Mode="RALLY",Description="기력을 크게 소모해 주변 아군을 회복·보호해.",Advanced=true,Gauge=70,Cooldown=38,Range=34,IconCell=9},
}
-- [스카이림식 요리] 마을 식당 화덕에서 요리하면 즉시 먹고 회복·버프를 얻는다. 요리할수록 숙련(CookingProficiency)이 올라 새 레시피가 열린다.
Config.CookStation={Name="식당 화덕",X=63,Z=-104,Radius=16,Model="vxPotStew",Height=2.6}
-- [연금 작업대] 등록된 CC0 작업대 모델로 세운다. 물약 조합은 이 근처에서만 한다.
Config.AlchemyStation={Name="연금 작업대",X=84,Z=-104,Radius=12,Model="vxWorkbench",Height=3}
Config.MeadowFoods={
  {Id=1,Name="구운 늑대 고기",Need=0,Meat=2,Heal=50,Seconds=10,Desc="체력을 10초에 걸쳐 50 회복"},
  {Id=2,Name="숲 버섯 스튜",Need=3,Meat=1,Mushroom=2,RedLeaf=1,Def=.10,Seconds=300,Desc="5분간 받는 피해 -10%"},
  {Id=3,Name="달빛 약초 수프",Need=6,Moonbloom=1,Mushroom=1,Stamina=60,Adrenaline=20,Desc="기력 +60 · 아드레날린 +20"},
  {Id=4,Name="사냥꾼의 파이",Need=10,Meat=3,RedLeaf=2,Coins=20,Atk=.10,Seconds=300,Desc="5분간 주는 피해 +10%"},
  {Id=5,Name="마력숲 연회",Need=20,Meat=4,Mushroom=2,Moonbloom=2,RedLeaf=2,Coins=80,Atk=.12,Def=.08,Heal=80,Seconds=900,Desc="15분간 피해 +12% · 받는 피해 -8% · 체력 80 회복"},
  {Id=6,Name="용암 바비큐",Need=14,Meat=3,Magma=1,Coins=30,Atk=.15,Seconds=420,Desc="7분간 주는 피해 +15%"},
  {Id=7,Name="히드라 해독 수프",Need=16,Moonbloom=2,Fang=1,Heal=100,Def=.12,Seconds=420,Desc="7분간 받는 피해 -12% · 체력 100 회복"},
  {Id=8,Name="사막 황금 빵",Need=18,Meat=2,Crystal=1,Stamina=100,Adrenaline=40,Desc="기력 +100 · 아드레날린 +40"},
  {Id=9,Name="서리 훈제 육포",Need=22,Meat=4,Hide=1,Atk=.08,Def=.15,Seconds=900,Desc="15분간 피해 +8% · 받는 피해 -15%"},
}
-- [스카이림식 대장 기술] 제련·무두질·제작·단련을 할 때마다 대장 경험치(SmithXp)가 쌓이고 대장 레벨(1~10)이 오른다.
-- 레벨 4·7·10에서 주괴·가죽 요구량이 1개씩 줄고(최대 3단), Lv3 제련 추가 산출, Lv5 강철 제련 비용 절감, Lv8 제작 환급 퍽이 열린다.
Config.SmithThresholds={0,20,60,120,200,300,430,600,800,1050}
Config.SmithLevel=function(xp)
  xp=tonumber(xp) or 0
  local level=1
  for i,need in ipairs(Config.SmithThresholds) do if xp>=need then level=i end end
  return level
end
Config.SmithingRank=function(smithXp)
  return math.clamp(math.floor((Config.SmithLevel(smithXp)-1)/3),0,3)
end
Config.SmithPerks={
  {Level=3,Name="풍부한 제련",Desc="제련 시 15% 확률로 1개 더 나와."},
  {Level=4,Name="철의 손길",Desc="주괴·가죽 요구량 -1, 강철 제련 가능."},
  {Level=5,Name="효율 담금질",Desc="강철 제련에 철 주괴가 3개 대신 2개."},
  {Level=5,Name="명인 단련",Desc="무기·갑옷을 +7 이상으로 단련할 수 있어."},
  {Level=7,Name="숙련 대장장이",Desc="주괴·가죽 요구량 -2."},
  {Level=8,Name="재료 환급",Desc="무기 제작 시 20% 확률로 주괴 1개를 돌려받아."},
  {Level=10,Name="대장장이의 명인",Desc="주괴·가죽 요구량 -3."},
}
-- 제련·제작 작업대(마을 대장간 일대). 각 작업은 해당 작업대 반경 안에서만 가능하다.
Config.SmithStations={
  Smelter={Name="제련로",X=-90,Z=-186,Radius=14,Model="vxCampfirePit",Height=3.2,Action="광석 제련"},
  Tanner={Name="무두질 틀",X=-114,Z=-178,Radius=14,Model="vxPoles",Height=4.2,Action="가죽 무두질"},
  Anvil={Name="모루",X=-98,Z=-196,Radius=14,Model="vxWorkbenchAnvil",Height=3.0,Action="무기 제작"},
  Grindstone={Name="숫돌",X=-107,Z=-189,Radius=14,Model="vxWorkbenchGrind",Height=3.2,Action="무기 단련"},
}
-- 무기 단련(강화): 주괴(+3·6·9강마다 무두질 가죽).
Config.TemperCost=function(tier,smithXp)
  local rank=Config.SmithingRank(smithXp)
  return math.max(1,1+math.floor(tier*.8)-rank),math.floor(tier/3)
end
-- 갑옷·장갑·각반·장화도 대장간 모루에서 만든다(고급 이상). 희귀 1·영웅 2·전설 3 강철 주괴가 든다.
for _,item in ipairs(Config.MeadowEquipment or {}) do
  if (item.Slot=="Chest" or item.Slot=="Hands" or item.Slot=="Legs" or item.Slot=="Feet")
    and item.Rarity~="Common" and not item.Starter then
    item.ForgeOnly=true
    local steel=({Rare=1,Epic=2,Legendary=3})[item.Rarity]
    if steel then item.Steel=(item.Steel or 0)+steel end
  end
end
-- 갑옷 단련: 한 단계마다 착용 중인 방어구 방어력이 오른다(최대 10단계).
Config.ArmorTemperCost=function(tier,smithXp)
  local ingot,leather=Config.TemperCost(tier,smithXp)
  return ingot,leather+1
end
-- 희귀 이상 단조 무기는 강철 주괴가 필요하다(영웅 2, 전설 4).
for _,item in ipairs(Config.MeadowEquipment or {}) do
  if item.ForgeOnly then
    if item.Rarity=="Epic" then item.Steel=(item.Steel or 0)+2
    elseif item.Rarity=="Legendary" then item.Steel=(item.Steel or 0)+4 end
  end
end
-- [오디세이식 무기 계열] 계열마다 어울리는 스킬 계열이 있고, 맞는 무기를 들면 해당 계열 스킬이 강해진다.
Config.WeaponClasses={
  Sword={Name="검",Schools={Warrior=1.25,Guardian=1.15}},
  Greatsword={Name="대검",Schools={Warrior=1.35,Guardian=1.1}},
  Axe={Name="도끼",Schools={Warrior=1.3,Guardian=1.2}},
  Hammer={Name="망치·철퇴",Schools={Warrior=1.3,Guardian=1.2}},
  Shield={Name="방패",Schools={Guardian=1.25}},
  Dagger={Name="단검",Schools={Shadow=1.35}},
  Bow={Name="활",Schools={Hunter=1.35},RangeBonus={Hunter=14}},
  Staff={Name="지팡이",Schools={Magic=1.3}},
}
Config.GearWeaponClass={wanderer_blade="Sword",hunter_blade="Sword",runic_blade="Sword",forest_blade="Sword",
  dew_dagger="Dagger",thorn_axe="Axe",worldtree_staff="Staff",magma_greatsword="Greatsword",
  hunter_bow="Bow",wind_bow="Bow",worldtree_bow="Bow"}
-- [새 무기 계열] 기존 서버 공격·스킬 계산과 결합한다.
for id,className in pairs({
  fafnir_edge="Greatsword",hydra_fang_dagger="Dagger",behemoth_maul="Hammer",wyvern_bow="Bow",jotun_axe="Axe",ifrit_staff="Staff",arachne_blade="Sword",
  iron_arming_sword="Sword",
  veteran_longsword="Sword",
  royal_gilded_sword="Sword",
  ancient_rune_sword="Sword",
  mercenary_greatsword="Greatsword",
  iron_greatblade="Greatsword",
  guardian_greatblade="Greatsword",
  hunter_skinning_knife="Dagger",
  shadow_assassin_dagger="Dagger",
  moonlit_dagger="Dagger",
  scout_hatchet="Axe",
  woodsman_axe="Axe",
  iron_battleaxe="Axe",
  rune_reaver_axe="Axe",
  forge_hammer="Hammer",
  steel_warhammer="Hammer",
  thunder_maul="Hammer",
  apprentice_staff="Staff",
  grove_staff="Staff",
  ember_staff="Staff",
  crystal_staff="Staff",
  scout_shortbow="Bow",
  oak_recurve_bow="Bow",
  hunter_longbow="Bow",
  arcane_bow="Bow",
}) do Config.GearWeaponClass[id]=className end
-- [실물 장비 추가] 신규 무기는 기존 무기 계열의 전투·스킬 규칙만 그대로 재사용한다.
for _,entry in ipairs(Config.MeadowEquipment) do
  if entry.GearSourceKey and entry.WeaponFamily and entry.Slot=="Weapon" then
    Config.GearWeaponClass[entry.Id]=entry.WeaponFamily
  end
end
Config.MeadowSkillSchools[1].Weapon="검·대검·도끼·망치"
Config.MeadowSkillSchools[2].Weapon="검·도끼·망치 + 방패"
Config.MeadowSkillSchools[3].Weapon="활"
Config.MeadowSkillSchools[4].Weapon="단검"
Config.MeadowSkillSchools[5].Weapon="지팡이"
-- [각인] 무기에 룬을 새기면 명중마다 25% 확률로 상태이상을 건다. 재료는 몬스터·채집 재료만 쓴다.
Config.Runes={
  {Name="화염",Status="burn",Material="Magma",Amount=2,Coins=120,Desc="명중 시 25% 화염 지속 피해"},
  {Name="독",Status="poison",Material="Ectoplasm",Amount=2,Coins=100,Desc="명중 시 25% 독 지속 피해"},
  {Name="서리",Status="frost",Material="Crystal",Amount=2,Coins=110,Desc="명중 시 25% 빙결(짧은 정지, 보스 제외)"},
  {Name="출혈",Status="bleed",Material="Claw",Amount=2,Coins=90,Desc="명중 시 25% 출혈 지속 피해"},
}
Config.MeadowSkillNodeById = {}
for _,node in ipairs(Config.MeadowSkillNodes) do
  Config.MeadowSkillNodeById[node.Id]=node
  if node.Kind=="ACTIVE" then
    local motion=({Warrior="HEAVY_ATTACK_1",Guardian="BLOCK_HOLD",Hunter="CAST_BURST",Shadow="DODGE_LEFT",Magic="CAST_BURST"})[node.School]
    local vfx=({Warrior="CRITICAL_BURST",Guardian="BLOCK_IMPACT",Hunter="IMPACT_FLASH",Shadow="DODGE_EVASION_PULSE",Magic="HEAL_PULSE"})[node.School]
    table.insert(Config.Actions,{Id=node.Id,Label=node.Name,Kind="SKILL",Order=100+node.Index,
      MotionAtom=motion,SkillAtom="IMPACT_SMALL",VfxAtom=vfx,Cooldown=node.Cooldown,
      LearningPattern="roblox-native-action"})
  end
end
-- 기존 재능 14점과 저장 필드는 보존하고 새 노드 점수는 숙련도 기반으로 계산한다.
Config.MeadowSkillPointProgress=function(mastery)
  local m=math.max(0,tonumber(mastery) or 0)
  local points=math.clamp(math.floor((-25+math.sqrt(625+20*m))/10),0,270)
  local cost=5*points*points+25*points
  return points,math.max(0,m-cost),points>=270 and 0 or 30+10*points
end
-- [기존 DataStore] 10노드 × 3비트로 압축. 2비트 단계 + 1비트 최종 선택.
for i=1,9 do Config.InitialState["MeadowSkillBits"..i]=0 end
Config.InitialState.MeadowLoadoutActive=1
for preset=1,3 do
  Config.InitialState["MeadowLoadoutSaved"..preset]=0
  for slot=1,5 do Config.InitialState["MeadowLoadout"..preset.."Slot"..slot]=0 end
end

-- [오디세이식 장비 특수 효과] 능력치와 별개로 착용 중인 장비가 전투에 거는 고유 효과. 같은 효과는 합산(상한 있음).
-- burn/poison/frost/bleed: 명중 시 상태이상 확률 · stun: 기절 확률 · leech: 피해 흡수 비율 · crit: 치명타(1.5배) 확률
-- dr: 받는 피해 경감 · dodge: 공격 무효 확률
Config.GearEffects = {
  forest_blade={leech=.04}, worldtree_staff={leech=.05}, royal_gilded_sword={leech=.03}, guardian_greatblade={dr=.05},
  magma_greatsword={burn=.25}, ancient_rune_sword={crit=.12}, rune_reaver_axe={bleed=.2}, thunder_maul={stun=.15},
  moonlit_dagger={bleed=.3}, ember_staff={burn=.25}, crystal_staff={frost=.25}, hunter_longbow={crit=.15},
  arcane_bow={frost=.2}, worldtree_bow={poison=.2},
  fafnir_edge={burn=.2,crit=.1}, hydra_fang_dagger={poison=.35}, behemoth_maul={stun=.12}, wyvern_bow={bleed=.25,crit=.1},
  jotun_axe={frost=.25}, ifrit_staff={burn=.35}, arachne_blade={poison=.2,bleed=.2},
  magma_plate={dr=.06}, worldtree_mail={dr=.08,leech=.02}, fafnir_scale_mail={dr=.1}, arcane_gloves={crit=.05},
  hydra_hide_gloves={poison=.1}, rune_greaves={dr=.03}, behemoth_greaves={dr=.05}, wind_boots={dodge=.06}, wyvern_boots={dodge=.06},
  worldtree_ring={leech=.02}, abyss_eye={crit=.1},
  sun_shield={dr=.04}, dusk_shield={dodge=.05}, cliff_steel_shield={dr=.05}, behemoth_bulwark={dr=.08,stun=.1},
  wind_feather_cape={dodge=.03}, wraith_cape={dodge=.04}, ember_cape={burn=.1}, dusk_cape={dodge=.05},
  jotun_cape={frost=.1}, arachne_silk_cape={bleed=.1,dodge=.04},
}
do
  local label={burn="화상",poison="독",frost="빙결",bleed="출혈"}
  local function pct(v) return tostring(math.floor(v*100+.5)).."%" end
  for _, item in ipairs(Config.MeadowEquipment or {}) do
    local fx = Config.GearEffects[item.Id]
    if fx then
      local parts = {}
      for _, k in ipairs({"burn","poison","frost","bleed"}) do
        if fx[k] then parts[#parts + 1] = "명중 시 " .. pct(fx[k]) .. " " .. label[k] end
      end
      if fx.stun then parts[#parts + 1] = "명중 시 " .. pct(fx.stun) .. " 기절" end
      if fx.crit then parts[#parts + 1] = "치명타 " .. pct(fx.crit) end
      if fx.leech then parts[#parts + 1] = "피해 흡수 " .. pct(fx.leech) end
      if fx.dr then parts[#parts + 1] = "받는 피해 -" .. pct(fx.dr) end
      if fx.dodge then parts[#parts + 1] = "공격 무효 " .. pct(fx.dodge) end
      item.Desc = (item.Desc or "") .. " ◆ 특수: " .. table.concat(parts, " · ")
    end
  end
end

-- [오디세이 이야기선] 정복·악명·용병 사냥꾼·고유 기술이 이어지는 서브 퀘스트.
for _, line in ipairs({
  {Id="odykick", Name="[수련] 스파르타의 발길질", Kind="Sub", Field="QLOdyKick", Need={Stage=2},
   Intro="떠돌이 용병 노인이 네 싸움을 지켜보다 혀를 찬다. '칼만 믿다 죽는 놈 많이 봤지. 발도 무기다. 화면 오른쪽의 발차기 버튼을 써 봐.'",
   Steps={
    {Type="event", Event="KICK", Count=3, Title="스파르타 킥 3번 적중", Text="오른쪽 '킥' 버튼으로 적을 걷어차라. 적이 뒤로 밀리며 기절한다.", Done="노인: '그래, 그거다. 방패 뒤에 숨은 놈도 한 방에 흔들리지.'"},
    {Type="event", Event="RUSH", Count=2, Title="황소 돌진 2번 적중", Text="'돌진' 버튼으로 적진을 뚫고 지나가며 들이받아라.", Done="노인: '돌진은 포위당했을 때 길을 여는 기술이야.'"},
    {Type="choice", X=-80, Z=-190, R=40, Title="노인의 마지막 가르침", Prompt="노인: '내 기술은 이게 전부다. 사례는 뭐로 받을래?'",
     Choices={{Label="전투 숙련 (경험)", Done="노인이 어깨를 두드린다. '살아남아라.'", Coins=150},
              {Label="용병 인장 (코인 500)", Done="노인이 낡은 인장을 건넨다. '어디서든 용병은 이걸 알아봐.'", Coins=500}}}
   },
   Reward={Coins=200, Xp=300}},
  {Id="odyconq", Name="[정복] 깃발을 꽂아라", Kind="Sub", Field="QLOdyConq", Need={Stage=3},
   Intro="영주들이 요새를 차지하고 마을을 쥐어짠다. 영주를 쓰러뜨리면 그 요새는 네 영토가 되지만, 빼앗긴 쪽은 반격해 온다.",
   Steps={
    {Type="event", Event="CONQUER", Count=1, Title="영주의 요새를 정복하라", Text="지역 영주를 쓰러뜨려 요새를 점령하라. 영주 위치는 월드 탭에서 확인.", Done="요새에 네 깃발이 올랐다. 깃발에서 영토 수입을 거둘 수 있다."},
    {Type="event", Event="DEFEND", Count=1, Title="반격군을 막아내라", Text="점령한 요새에 반격군이 오면 제한 시간 안에 달려가 모두 쓰러뜨려라.", Done="반격군이 물러갔다. 영토는 지켜냈다."},
    {Type="choice", X=-80, Z=-190, R=40, Title="전리품의 분배", Prompt="병사들이 묻는다. '이번 전리품은 어떻게 할까요?'",
     Choices={{Label="병사들에게 나눠 준다 (악명↓ 평판↑)", Done="병사들이 환호한다. 소문이 좋게 돈다.", Coins=100, Notoriety=-1},
              {Label="전부 챙긴다 (코인 600)", Done="코인 주머니가 묵직하다. 눈초리가 따갑다.", Coins=600}}}
   },
   Reward={Coins=400, Xp=400, Crystal=3}},
  {Id="odymerc", Name="[용병] 낙인과 사냥꾼", Kind="Sub", Field="QLOdyMerc", Need={Done="odyconq"},
   Intro="영주 가문들이 네 목에 현상금을 걸고 용병 사냥꾼을 풀었다. 악명이 높을수록 더 강한 사냥꾼이 쫓아온다.",
   Steps={
    {Type="event", Event="HUNTER_DOWN", Count=3, Title="현상금 사냥꾼 3명 격파", Text="마을 밖에서 쫓아오는 사냥꾼을 쓰러뜨려라. 쓰러뜨릴 때마다 악명이 1 줄어든다.", Done="사냥꾼의 품에서 영주 가문의 인장이 나왔다. 배후는 하나다."},
    {Type="choice", X=-80, Z=-190, R=40, Title="용병단장의 제안", Prompt="용병단장이 직접 찾아온다. '네 칼솜씨가 아깝군. 우리 편이 되겠나, 아니면 여기서 끝낼까?'",
     Choices={{Label="제안을 받아들인다 (코인 800, 악명 초기화)", Done="단장이 인장을 거두고 사냥꾼을 거둬들였다.", Coins=800, Notoriety=-5},
              {Label="거절하고 맞선다 (마력 결정 6)", Done="단장이 물러서며 이를 간다. '다음엔 더 강한 놈들이 올 거다.'", Crystal=6}}}
   },
   Reward={Coins=500, Xp=500}},
}) do table.insert(Config.QuestLines, line) end

-- [장비 외형] 등록된 CC0 메시(갑옷 5종·장갑·바지·장화·목걸이·반지·수정)를 아이템별로 다르게 입히는 표.
-- model: 메시 키 · tint: 소재 색 · glow: 희귀 장비의 은은한 광원 · fit: 크기 배율 · acc: 장신구 부착 위치
Config.GearLook = {
  forest_relic_armor={model="gear_relic_armor",tint={156,175,185}},
  forest_ranger_jacket={model="item_armor_leather",tint={150,117,74}},
  forest_steel_cuirass={model="item_armor_metal2",tint={155,174,190}},
  forest_dark_plate={model="item_armor_black",tint={64,78,98}},
  forest_sun_guard={model="item_armor_golden",tint={218,178,79}},
  forest_chainmail={model="item_armor_metal",tint={164,172,182}},
  travel_armor={model="item_armor_leather",tint={150,112,72}},
  hunter_armor={model="item_armor_leather",tint={96,126,70}},
  moss_robe={model="item_armor_leather",tint={78,122,86},fit=0.96},
  frost_leather={model="item_armor_leather",tint={168,210,236},glow={150,205,255}},
  guardian_armor={model="item_armor_metal",tint={150,172,205}},
  magma_plate={model="item_armor_black",tint={196,72,42},glow={255,110,50}},
  worldtree_mail={model="item_armor_golden",tint={150,205,95},glow={160,255,140}},
  fafnir_scale_mail={model="item_armor_metal2",tint={232,112,82},glow={255,140,80}},
  travel_gloves={tint={155,118,85}}, hunter_gloves={tint={140,108,70}}, guardian_gauntlet={tint={168,182,205},fit=1.15}, arcane_gloves={tint={150,100,232},glow={190,140,255}},
  wind_feather_gloves={tint={170,215,240}}, hydra_hide_gloves={tint={110,230,140},glow={110,255,160}},
  travel_pants={tint={117,109,96}}, guardian_pants={tint={150,162,188}}, hunter_greaves={tint={122,96,62}}, rune_greaves={tint={92,122,205},glow={120,160,255}},
  behemoth_greaves={tint={235,200,110},glow={255,210,120}},
  travel_boots={tint={136,110,83}}, guardian_boots={tint={150,162,188}}, hunter_boots={tint={116,90,60}}, wind_boots={tint={150,232,232},glow={170,255,245}},
  wyvern_boots={tint={240,215,120},glow={255,225,130}},
  moon_amulet={acc={model="item_necklace1",part="UpperTorso",off={0,.5,-.58},height=.9},tint={190,210,255},glow={190,210,255}},
  fang_necklace={acc={model="item_necklace1",part="UpperTorso",off={0,.5,-.58},height=.9},tint={235,225,200}},
  herb_bracelet={acc={model="item_ring1",part="LeftHand",off={0,.25,0},height=.7},tint={110,190,100}},
  worldtree_ring={acc={model="item_ring2",part="RightHand",off={0,-.2,0},height=.4},tint={200,235,120},glow={170,255,140}},
  abyss_eye={acc={model="item_crystal1",part="UpperTorso",off={1.5,1.7,0},height=1.1},tint={170,90,240},glow={190,110,255}},
}
Config.InitialState.Notoriety = 0
Config.InitialState.ConquestMask = 0
Config.InitialState.HunterKills = 0

return table.freeze(Config)
