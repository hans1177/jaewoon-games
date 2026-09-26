local Config={
 PolicySource="company-learning/platform-release-roadmap.json",
 Platform="ROBLOX",MobileFirst=true,
 GameId="daechung-rpg",GameName="Five Portal RPG",GameNameKorean="5포탈 RPG: 던전 파티",GameNameEnglish="Five Portal RPG: Dungeon Party",SaveEnabled=true,
 Genre = "RPG",PlayMode = "COOP",SoloPlayable=true,CoopRequired=true,CompetitiveRequired=false,
 MultiplayerRequired = true,MinimumParticipants=2,PartySlots=4,RemoteName="GameAction",RemoteMinInterval=.08,
 GuardMax=100,GuardRegenPerSecond=22,ParryWindow=.22,ParryRearmSeconds=.34,GuardBreakSeconds=1.15,
 VillageCenter=Vector3.new(0,2,0),VillageHealRadius=92,CombatLockSeconds=5,
 BaseMaxHP=100,BaseAttack=10,LevelHPGain=10,LevelAttackGain=10,LevelCap=60,
 QuestBaseGold=50,QuestBaseXP=50,PartyHuntTarget=15,
 WeaponPrices={50,120,240,420,700},ArmorPrices={45,110,220,390,650},
 WeaponBonus={0,8,18,30,45},ArmorBonus={0,10,22,36,55},
 EquipmentSlots={"Weapon","Armor","Relic"},RelicDefault="NONE",
 AdvancementLevel=15,SecondAdvancementLevel=40,AdvancementTrialTarget=5,AdvancementSwitchCost=300,
 MedievalCharacterAssetId=91766715515988,
 MedievalHouseAssetIds={1819167267,254849325},
 Classes={
  BREAKER={Name="파쇄기사",Color=Color3.fromRGB(173,92,68),Weapon="GREATSWORD",HPMult=1.12,AttackMult=1.08,SkillMult=2.35,
   Advancements={
    A={Id="IRON_BREAKER",Name="철벽파쇄자",Role="방어·반격",Color=Color3.fromRGB(116,151,177),SecondId="FORTRESS_BREAKER",SecondName="성채파쇄자"},
    B={Id="RAGE_BREAKER",Name="광전파쇄자",Role="분노·강공격",Color=Color3.fromRGB(190,72,59),SecondId="BLOODFORGE_BREAKER",SecondName="혈철파괴자"},
   }},
  SHADOW={Name="그림자추적자",Color=Color3.fromRGB(89,75,124),Weapon="DUAL_DAGGER",HPMult=.96,AttackMult=1.06,SkillMult=2.05,
   Advancements={
    A={Id="ASSASSIN_TRACKER",Name="암살추적자",Role="배후·치명타",Color=Color3.fromRGB(67,57,91),SecondId="NIGHTFANG_TRACKER",SecondName="야습추적자"},
    B={Id="MIRAGE_TRACKER",Name="환영추적자",Role="회피·교란",Color=Color3.fromRGB(103,93,170),SecondId="PHANTOM_TRACKER",SecondName="환영지배자"},
   }},
  RUNE={Name="룬술사",Color=Color3.fromRGB(91,128,186),Weapon="RUNE_STAFF",HPMult=1,AttackMult=1,SkillMult=2.25,
   Advancements={
    A={Id="ELEMENTAL_RUNER",Name="원소룬술사",Role="원소조합",Color=Color3.fromRGB(76,157,189),SecondId="PRIMAL_RUNER",SecondName="원초룬술사"},
    B={Id="OVERLOAD_RUNER",Name="폭주룬술사",Role="과부하·순간화력",Color=Color3.fromRGB(167,83,196),SecondId="ARCSTORM_RUNER",SecondName="폭풍룬술사"},
   }},
  SOUL={Name="영혼소환사",Color=Color3.fromRGB(94,123,107),Weapon="SOUL_STAFF",HPMult=1.04,AttackMult=.98,SkillMult=2,
   Advancements={
    A={Id="GUARDIAN_MEDIUM",Name="수호영매사",Role="보호·회복",Color=Color3.fromRGB(119,181,176),SecondId="ANCESTOR_GUARDIAN",SecondName="선조수호자"},
    B={Id="WRAITH_MASTER",Name="망령지배자",Role="공격소환",Color=Color3.fromRGB(100,73,139),SecondId="SOUL_LORD",SecondName="영혼군주"},
   }},
 },
 Audio={Background="rbxassetid://1839010065",Battle="rbxassetid://1837821768",Boss="rbxassetid://1839321582",Action="rbxassetid://7171761940",Hit="rbxassetid://7171761940",Skill="rbxassetid://1837821768",LevelUp="rbxassetid://1839321582",BossAppear="rbxassetid://1837821768",Victory="rbxassetid://1839321582"},
 Portals={
  {Id=1,Name="초원 사냥터",Center=Vector3.new(900,2,0),Color=Color3.fromRGB(95,185,104),Enemy="초원 늑대",EnemyHP=70,EnemyDamage=8,RewardGold=12,RewardXP=18,Aggro=58,Leash=105,Theme="MEADOW",
   Procedural={RoomCount=8,SecretChance=.8,HiddenBossChance=.35,RunSeeded=true},
   EnemyRoster={
    {Id="GRASS_WOLF",Name="초원 늑대",HP=70,Damage=8,Gold=12,XP=18,Speed=8,Stagger=42,Attack={Name="물어뜯기",Telegraph=.42,Cooldown=1.25,Range=5.5,Parryable=true,GuardDamage=18,Special="BITE"}},
    {Id="DIRE_WOLF",Name="검은갈기 늑대",HP=92,Damage=11,Gold=16,XP=22,Speed=10,Stagger=48,Attack={Name="연속 도약",Telegraph=.5,Cooldown=1.55,Range=7,Parryable=true,GuardDamage=22,Special="POUNCE",Hits=2,HitGap=.24}},
    {Id="CHARGE_BOAR",Name="돌진 멧돼지",HP=130,Damage=15,Gold=20,XP=28,Speed=7,Stagger=68,Attack={Name="직선 돌진",Telegraph=.72,Cooldown=2.1,Range=9,Parryable=true,GuardDamage=35,Special="CHARGE"}},
    {Id="THORN_WASP",Name="가시벌",HP=58,Damage=7,Gold=13,XP=20,Speed=11,Stagger=30,Attack={Name="독침",Telegraph=.35,Cooldown=1.45,Range=10,Parryable=true,GuardDamage=12,Special="POISON_STING"}},
    {Id="FOREST_LIZARD",Name="숲도마뱀",HP=85,Damage=12,Gold=16,XP=23,Speed=9,Stagger=44,Attack={Name="꼬리 휩쓸기",Telegraph=.62,Cooldown=1.85,Range=7.5,Parryable=false,Unblockable=true,GuardDamage=0,Special="TAIL_SWEEP"}},
    {Id="HORN_DEER",Name="뿔사슴",HP=110,Damage=14,Gold=18,XP=26,Speed=10,Stagger=55,Attack={Name="뿔 돌진",Telegraph=.6,Cooldown=1.95,Range=9,Parryable=true,GuardDamage=30,Special="ANTLER_CHARGE"}},
    {Id="VINE_CRAWLER",Name="덩굴괴물",HP=120,Damage=10,Gold=19,XP=29,Speed=5,Stagger=72,Attack={Name="뿌리 속박",Telegraph=.8,Cooldown=2.4,Range=13,Parryable=false,Unblockable=true,GuardDamage=0,Special="ROOT_SNARE"}},
    {Id="MEADOW_BANDIT",Name="초원 도적",HP=100,Damage=13,Gold=22,XP=27,Speed=8,Stagger=50,Attack={Name="페인트 베기",Telegraph=.78,Cooldown=1.75,Range=6,Parryable=true,GuardDamage=24,Special="FEINT_SLASH"}},
    {Id="WOLF_TAMER",Name="늑대 조련사",HP=105,Damage=10,Gold=24,XP=30,Speed=7,Stagger=52,Attack={Name="사냥 명령",Telegraph=.7,Cooldown=2.5,Range=17,Parryable=true,GuardDamage=16,Special="HOWL_COMMAND"}},
    {Id="MOSS_TURTLE",Name="이끼등 거북",HP=165,Damage=16,Gold=23,XP=31,Speed=4,Stagger=85,Attack={Name="등껍질 박치기",Telegraph=.9,Cooldown=2.25,Range=6,Parryable=true,GuardDamage=45,Special="SHELL_BASH"}}
   },
   RunBoss={Id="GOLDEN_ANTLER",Name="금빛 큰뿔",HP=760,Damage=27,Gold=180,XP=220,Speed=9,Stagger=175,
    Attacks={
     {Name="황금뿔 돌진",Telegraph=.72,Cooldown=2.0,Range=12,Parryable=true,GuardDamage=42,Special="ANTLER_CHARGE"},
     {Name="대지 짓밟기",Telegraph=1.0,Cooldown=2.7,Range=13,Parryable=false,Unblockable=true,Special="GROUND_STOMP",DamageMult=1.15},
     {Name="삼연속 돌진",Telegraph=.58,Cooldown=2.4,Range=11,Parryable=true,GuardDamage=28,Special="FANG_CHAIN",Hits=3,HitGap=.26}
    }},
   HiddenBosses={
    {Id="WHITE_FANG",Name="백색 송곳니",HP=520,Damage=22,Gold=125,XP=150,Speed=12,Stagger=125,
     Attacks={
      {Name="백아 연격",Telegraph=.42,Cooldown=1.5,Range=8,Parryable=true,GuardDamage=24,Special="FANG_CHAIN",Hits=3,HitGap=.22},
      {Name="달빛 도약",Telegraph=.72,Cooldown=2.2,Range=11,Parryable=true,GuardDamage=38,Special="MOON_POUNCE"},
      {Name="포효 충격파",Telegraph=1.0,Cooldown=3.1,Range=16,Parryable=false,Unblockable=true,Special="HOWL_BLAST"}
     }},
    {Id="ANCIENT_HEART",Name="고목의 심장",HP=680,Damage=25,Gold=150,XP=185,Speed=4,Stagger=150,
     Attacks={
      {Name="덩굴 채찍",Telegraph=.58,Cooldown=1.75,Range=10,Parryable=true,GuardDamage=32,Special="VINE_LASH"},
      {Name="대지 뿌리",Telegraph=1.05,Cooldown=2.8,Range=15,Parryable=false,Unblockable=true,Special="ROOT_ERUPTION"},
      {Name="씨앗 탄막",Telegraph=.8,Cooldown=2.35,Range=19,Parryable=true,GuardDamage=18,Special="SEED_VOLLEY",Hits=2,HitGap=.3}
     }}
   }},
  {Id=2,Name="붉은 협곡",Center=Vector3.new(0,2,900),Color=Color3.fromRGB(190,105,72),Enemy="협곡 도적",EnemyHP=105,EnemyDamage=12,RewardGold=18,RewardXP=26,Aggro=58,Leash=84,Theme="CANYON"},
  {Id=3,Name="룬 유적",Center=Vector3.new(-900,2,0),Color=Color3.fromRGB(130,91,196),Enemy="룬 골렘",EnemyHP=145,EnemyDamage=17,RewardGold=26,RewardXP=36,Aggro=62,Leash=90,Theme="RUINS",Boss={Id="RUIN_GUARDIAN",Name="유적 수호자",HP=650,Damage=28,Gold=140,XP=180}},
  {Id=4,Name="설원 요새",Center=Vector3.new(0,2,-900),Color=Color3.fromRGB(142,190,214),Enemy="설원 야수",EnemyHP=190,EnemyDamage=22,RewardGold=34,RewardXP=48,Aggro=66,Leash=96,Theme="SNOW"},
  {Id=5,Name="심연 던전",Center=Vector3.new(900,2,900),Color=Color3.fromRGB(82,61,111),Enemy="심연 기사",EnemyHP=250,EnemyDamage=28,RewardGold=46,RewardXP=62,Aggro=72,Leash=104,Theme="ABYSS",Boss={Id="ABYSS_LORD",Name="심연 군주",HP=1100,Damage=38,Gold=250,XP=320}},
 },
 BossCompanions={
  {Id="GOLDEN_ANTLER",Name="금빛 큰뿔",Zone=1,Role="돌진·균형파괴",Basic="뿔 베기",Skill="황금뿔 돌진",Trait="STAGGER_CHARGE",Range=11,Speed=12,AttackInterval=.9,BaseDamage=11,DamagePerLevel=.78,SkillCooldown=6.5,SkillMult=1.8,Color=Color3.fromRGB(245,196,73)},
  {Id="WHITE_FANG",Name="백색 송곳니",Zone=1,Role="추적·마무리",Basic="송곳니 베기",Skill="달빛 도약",Trait="FINISHER",Range=10,Speed=15,AttackInterval=.62,BaseDamage=9,DamagePerLevel=.72,SkillCooldown=5.5,SkillMult=1.65,Color=Color3.fromRGB(180,222,245)},
  {Id="ANCIENT_HEART",Name="고목의 심장",Zone=1,Role="속박·보호",Basic="덩굴 채찍",Skill="대지 뿌리",Trait="ROOT_GUARD",Range=18,Speed=7,AttackInterval=1.2,BaseDamage=8,DamagePerLevel=.64,SkillCooldown=7.5,SkillMult=1.35,Color=Color3.fromRGB(111,170,122)},
  {Id="RUIN_GUARDIAN",Name="유적 수호자",Zone=3,Role="방벽·균형",Basic="룬 강타",Skill="수호 룬",Trait="RUNE_GUARD",Range=12,Speed=9,AttackInterval=1.05,BaseDamage=10,DamagePerLevel=.7,SkillCooldown=7,SkillMult=1.5,Color=Color3.fromRGB(130,91,196)},
  {Id="ABYSS_LORD",Name="심연 군주",Zone=5,Role="압박·처형",Basic="심연 참격",Skill="심연 폭발",Trait="ABYSS_EXECUTE",Range=14,Speed=10,AttackInterval=.82,BaseDamage=12,DamagePerLevel=.82,SkillCooldown=6.8,SkillMult=1.7,Color=Color3.fromRGB(120,80,164)}
 },
 Actions={
  ATTACK="ATTACK",SKILL="SKILL",DODGE="DODGE",RETURN_VILLAGE="RETURN_VILLAGE",NEXT_ROOM_CODE="NEXT_ROOM_CODE",
  SELECT_BREAKER="SELECT_BREAKER",SELECT_SHADOW="SELECT_SHADOW",SELECT_RUNE="SELECT_RUNE",SELECT_SOUL="SELECT_SOUL",
  START_ADVANCEMENT_TRIAL="START_ADVANCEMENT_TRIAL",ADVANCE_A="ADVANCE_A",ADVANCE_B="ADVANCE_B",
  BLOCK_START="BLOCK_START",BLOCK_END="BLOCK_END",
 },
 QACameraEnabled=true,QACaptureRemoteName="QACaptureReport",OwnerDirectDevelopment=true,
  -- STUDIO_ASSET_BINDING_BEGIN
  StudioAssets = {
    Applied = true,
    BindingVersion = 2,
    LibraryVersion = 18,
    Source = "company-asset-library.json#baseMaterialLibrary",
    AtomState = "PREPARED_SEMANTIC_ATOM_LIBRARY",
    RecipeId = "NORMAL_VARIANT",
    ProductionVerified = false,
    RuntimeVerificationRequired = true,
    Families = {
      UI = { "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH" },
      ENVIRONMENT = { "TREE_TRUNK_THICK", "TREE_CROWN_ROUND", "ROCK_MEDIUM", "ROAD_DIRT" },
      BUILDING = { "FOUNDATION_RECT", "WALL_SOLID", "DOOR_SINGLE", "ROOF_GABLE" },
      PROP = { "CHEST", "CRATE", "LAMP" },
      MATERIAL = { "WOOD", "STONE", "METAL" },
      AUDIO = { "ENV_WIND", "ENV_WATER", "UI_CONFIRM" },
      VFX = { "IMPACT_FLASH", "TRAIL_SHORT", "SHAPE_BURST" },
      SKILL = { "CAST_HAND", "TELEGRAPH_CIRCLE", "IMPACT_SMALL" },
      WEAPON = { "BLADE_LONG", "GUARD_CROSS", "GRIP_LONG" },
      CHARACTER = { "TORSO_CLOTH", "SHOULDER_LIGHT", "BACK_CAPE" },
      CREATURE = { "HEAD_CANINE", "JAW_LONG", "CLAW" },
      MOTION = { "IDLE_RELAXED", "WALK", "JOG", "RUN", "START", "STOP", "TURN_90", "JUMP_START", "LAND", "HIT_FRONT", "DEATH_FRONT" },
    },
    MotionQuality = {
      Contract = "company-learning/platform-release-roadmap.json#livingMotionVisualQualityContract.robloxCharacterMotionQuality",
      LibraryFirst = true,
      ArticulatedRigRequired = true,
      AnimatorRequired = true,
      BlendAndSpeedSyncRequired = true,
      RuntimeVerificationRequired = true,
      MannequinHardFailure = "CHARACTER_MOTION_MANNEQUIN",
    },
  },
  -- STUDIO_ASSET_BINDING_END
}
return table.freeze(Config)
