local Config={
 PolicySource="company-learning/platform-release-roadmap.json",
 Platform="ROBLOX",MobileFirst=true,
 GameId="daechung-rpg",GameName="Whatever RPG",GameNameKorean="대충 RPG",SaveEnabled=true,
 Genre = "RPG",PlayMode = "COOP",SoloPlayable=true,CoopRequired=true,CompetitiveRequired=false,
 MultiplayerRequired = true,MinimumParticipants=2,PartySlots=4,RemoteName="GameAction",RemoteMinInterval=.08,
 VillageCenter=Vector3.new(0,2,0),VillageHealRadius=92,CombatLockSeconds=5,
 BaseMaxHP=100,BaseAttack=10,LevelHPGain=10,LevelAttackGain=10,
 QuestBaseGold=50,QuestBaseXP=50,PartyHuntTarget=15,
 WeaponPrices={50,120,240,420,700},ArmorPrices={45,110,220,390,650},
 WeaponBonus={0,8,18,30,45},ArmorBonus={0,10,22,36,55},
 Audio={Background="rbxassetid://1839010065",Battle="rbxassetid://1837821768",Boss="rbxassetid://1839321582",Action="rbxassetid://7171761940",Hit="rbxassetid://7171761940",Skill="rbxassetid://1837821768",LevelUp="rbxassetid://1839321582",BossAppear="rbxassetid://1837821768",Victory="rbxassetid://1839321582"},
 Portals={
  {Id=1,Name="초원 사냥터",Center=Vector3.new(900,2,0),Color=Color3.fromRGB(95,185,104),Enemy="초원 늑대",EnemyHP=70,EnemyDamage=8,RewardGold=12,RewardXP=18,Aggro=52,Leash=78,Theme="MEADOW"},
  {Id=2,Name="붉은 협곡",Center=Vector3.new(0,2,900),Color=Color3.fromRGB(190,105,72),Enemy="협곡 도적",EnemyHP=105,EnemyDamage=12,RewardGold=18,RewardXP=26,Aggro=58,Leash=84,Theme="CANYON"},
  {Id=3,Name="룬 유적",Center=Vector3.new(-900,2,0),Color=Color3.fromRGB(130,91,196),Enemy="룬 골렘",EnemyHP=145,EnemyDamage=17,RewardGold=26,RewardXP=36,Aggro=62,Leash=90,Theme="RUINS",Boss={Name="유적 수호자",HP=650,Damage=28,Gold=140,XP=180}},
  {Id=4,Name="설원 요새",Center=Vector3.new(0,2,-900),Color=Color3.fromRGB(142,190,214),Enemy="설원 야수",EnemyHP=190,EnemyDamage=22,RewardGold=34,RewardXP=48,Aggro=66,Leash=96,Theme="SNOW"},
  {Id=5,Name="심연 던전",Center=Vector3.new(900,2,900),Color=Color3.fromRGB(82,61,111),Enemy="심연 기사",EnemyHP=250,EnemyDamage=28,RewardGold=46,RewardXP=62,Aggro=72,Leash=104,Theme="ABYSS",Boss={Name="심연 군주",HP=1100,Damage=38,Gold=250,XP=320}},
 },
 AIUsers={
  {Name="민준",Class="NONE"},{Name="서윤",Class="NONE"},
  {Name="하린",Class="HEALER"},{Name="도윤",Class="HEALER"},
  {Name="태오",Class="WARRIOR"},{Name="지후",Class="WARRIOR"},{Name="현우",Class="WARRIOR"},
  {Name="유나",Class="ARCHER"},{Name="시아",Class="ARCHER"},{Name="준서",Class="ARCHER"},
 },
 Actions={ATTACK="ATTACK",SKILL="SKILL",DODGE="DODGE",RETURN_VILLAGE="RETURN_VILLAGE",NEXT_ROOM_CODE="NEXT_ROOM_CODE"},
 QACameraEnabled=true,QACaptureRemoteName="QACaptureReport",OwnerDirectDevelopment=true,
}
return table.freeze(Config)
