local Config={
 PolicySource="company-learning/platform-release-roadmap.json",
 Platform="ROBLOX",MobileFirst=true,
 GameId="daechung-rpg",GameName="Five Portal RPG",GameNameKorean="5포탈 RPG: 던전 파티",GameNameEnglish="Five Portal RPG: Dungeon Party",SaveEnabled=true,
 Genre = "RPG",PlayMode = "COOP",SoloPlayable=true,CoopRequired=true,CompetitiveRequired=false,
 MultiplayerRequired = true,MinimumParticipants=2,PartySlots=4,RemoteName="GameAction",RemoteMinInterval=.08,
 VillageCenter=Vector3.new(0,2,0),VillageHealRadius=92,CombatLockSeconds=5,
 BaseMaxHP=100,BaseAttack=10,LevelHPGain=10,LevelAttackGain=10,
 QuestBaseGold=50,QuestBaseXP=50,PartyHuntTarget=15,
 WeaponPrices={50,120,240,420,700},ArmorPrices={45,110,220,390,650},
 WeaponBonus={0,8,18,30,45},ArmorBonus={0,10,22,36,55},
 AdvancementLevel=15,AdvancementTrialTarget=5,AdvancementSwitchCost=300,
 MedievalCharacterAssetId=91766715515988,
 MedievalHouseAssetIds={1819167267,254849325},
 Classes={
  BREAKER={Name="파쇄기사",Color=Color3.fromRGB(173,92,68),Weapon="GREATSWORD",HPMult=1.12,AttackMult=1.08,SkillMult=2.35,
   Advancements={
    A={Id="IRON_BREAKER",Name="철벽파쇄자",Role="방어·반격",Color=Color3.fromRGB(116,151,177)},
    B={Id="RAGE_BREAKER",Name="광전파쇄자",Role="분노·강공격",Color=Color3.fromRGB(190,72,59)},
   }},
  SHADOW={Name="그림자추적자",Color=Color3.fromRGB(89,75,124),Weapon="DUAL_DAGGER",HPMult=.96,AttackMult=1.06,SkillMult=2.05,
   Advancements={
    A={Id="ASSASSIN_TRACKER",Name="암살추적자",Role="배후·치명타",Color=Color3.fromRGB(67,57,91)},
    B={Id="MIRAGE_TRACKER",Name="환영추적자",Role="회피·교란",Color=Color3.fromRGB(103,93,170)},
   }},
  RUNE={Name="룬술사",Color=Color3.fromRGB(91,128,186),Weapon="RUNE_STAFF",HPMult=1,AttackMult=1,SkillMult=2.25,
   Advancements={
    A={Id="ELEMENTAL_RUNER",Name="원소룬술사",Role="원소조합",Color=Color3.fromRGB(76,157,189)},
    B={Id="OVERLOAD_RUNER",Name="폭주룬술사",Role="과부하·순간화력",Color=Color3.fromRGB(167,83,196)},
   }},
  SOUL={Name="영혼소환사",Color=Color3.fromRGB(94,123,107),Weapon="SOUL_STAFF",HPMult=1.04,AttackMult=.98,SkillMult=2,
   Advancements={
    A={Id="GUARDIAN_MEDIUM",Name="수호영매사",Role="보호·회복",Color=Color3.fromRGB(119,181,176)},
    B={Id="WRAITH_MASTER",Name="망령지배자",Role="공격소환",Color=Color3.fromRGB(100,73,139)},
   }},
 },
 Audio={Background="rbxassetid://1839010065",Battle="rbxassetid://1837821768",Boss="rbxassetid://1839321582",Action="rbxassetid://7171761940",Hit="rbxassetid://7171761940",Skill="rbxassetid://1837821768",LevelUp="rbxassetid://1839321582",BossAppear="rbxassetid://1837821768",Victory="rbxassetid://1839321582"},
 Portals={
  {Id=1,Name="초원 사냥터",Center=Vector3.new(900,2,0),Color=Color3.fromRGB(95,185,104),Enemy="초원 늑대",EnemyHP=70,EnemyDamage=8,RewardGold=12,RewardXP=18,Aggro=52,Leash=78,Theme="MEADOW"},
  {Id=2,Name="붉은 협곡",Center=Vector3.new(0,2,900),Color=Color3.fromRGB(190,105,72),Enemy="협곡 도적",EnemyHP=105,EnemyDamage=12,RewardGold=18,RewardXP=26,Aggro=58,Leash=84,Theme="CANYON"},
  {Id=3,Name="룬 유적",Center=Vector3.new(-900,2,0),Color=Color3.fromRGB(130,91,196),Enemy="룬 골렘",EnemyHP=145,EnemyDamage=17,RewardGold=26,RewardXP=36,Aggro=62,Leash=90,Theme="RUINS",Boss={Name="유적 수호자",HP=650,Damage=28,Gold=140,XP=180}},
  {Id=4,Name="설원 요새",Center=Vector3.new(0,2,-900),Color=Color3.fromRGB(142,190,214),Enemy="설원 야수",EnemyHP=190,EnemyDamage=22,RewardGold=34,RewardXP=48,Aggro=66,Leash=96,Theme="SNOW"},
  {Id=5,Name="심연 던전",Center=Vector3.new(900,2,900),Color=Color3.fromRGB(82,61,111),Enemy="심연 기사",EnemyHP=250,EnemyDamage=28,RewardGold=46,RewardXP=62,Aggro=72,Leash=104,Theme="ABYSS",Boss={Name="심연 군주",HP=1100,Damage=38,Gold=250,XP=320}},
 },
 AIUsers={
  {Name="민준",Class="BREAKER",Advance="A"},{Name="서윤",Class="BREAKER",Advance="B"},{Name="태오",Class="BREAKER",Advance="B"},
  {Name="유나",Class="SHADOW",Advance="A"},{Name="시아",Class="SHADOW",Advance="B"},{Name="준서",Class="SHADOW",Advance="A"},
  {Name="하린",Class="RUNE",Advance="A"},{Name="도윤",Class="RUNE",Advance="B"},
  {Name="지후",Class="SOUL",Advance="A"},{Name="현우",Class="SOUL",Advance="B"},
 },
 Actions={
  ATTACK="ATTACK",SKILL="SKILL",DODGE="DODGE",RETURN_VILLAGE="RETURN_VILLAGE",NEXT_ROOM_CODE="NEXT_ROOM_CODE",
  SELECT_BREAKER="SELECT_BREAKER",SELECT_SHADOW="SELECT_SHADOW",SELECT_RUNE="SELECT_RUNE",SELECT_SOUL="SELECT_SOUL",
  START_ADVANCEMENT_TRIAL="START_ADVANCEMENT_TRIAL",ADVANCE_A="ADVANCE_A",ADVANCE_B="ADVANCE_B",
 },
 QACameraEnabled=true,QACaptureRemoteName="QACaptureReport",OwnerDirectDevelopment=true,
}
return table.freeze(Config)
