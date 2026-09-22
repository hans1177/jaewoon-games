local Config={
  PolicySource = "company-learning/platform-release-roadmap.json",
  Platform = "ROBLOX",
  MobileFirst = true,
  GameId="cozy-island",GameName="포근섬",SaveEnabled=true,TargetSessionMinutes={20,30},
  Genre = "Simulation",
  PlayMode = "COOP",
  MultiplayerRequired = true,
  SoloPlayable=true,CoopRequired=true,CompetitiveRequired=false,MinimumParticipants=2,
  RemoteName="GameAction",AutomationTickSeconds=5,AutoGatherTickSeconds=1.5,AutoGatherAmount=1,AutoGatherWoodRadius=34,AutoGatherFoodRadius=28,RateLimitSeconds=0.12,
  Audio={Background="rbxassetid://1837169004",Battle="rbxassetid://1847075059",Action="rbxassetid://7171761940",Victory="rbxassetid://1839321582",Resource="rbxassetid://7171761940",Build="rbxassetid://7171761940",Hit="rbxassetid://1847075059",Capture="rbxassetid://1839321582"},
  InitialState={Coins=30,Wood=0,Food=0,Iron=0,Horses=0,Stone=0,Gold=0,Sulfur=0,Residents=0,WoodWorkers=0,Farmers=0,BarracksLevel=1,Troops=0,CapturedBases=0,CapturedIslands=0,NextBaseIndex=1,BattleProgress=0},
  Bases={
    {Id="MINE",Name="산악 철광산",Enemy="광산 약탈병",Strength=28,Reward="Iron",Amount=12,Coins=18},
    {Id="RANCH",Name="초원 목장",Enemy="기마 정찰대",Strength=42,Reward="Horses",Amount=10,Coins=22},
    {Id="QUARRY",Name="암석 채석장",Enemy="석갑 수비대",Strength=58,Reward="Stone",Amount=16,Coins=26,IslandFinal=true},
    {Id="GOLD",Name="사막 금광",Enemy="사막 용병단",Strength=78,Reward="Gold",Amount=9,Coins=34},
    {Id="VOLCANO",Name="화산 유황요새",Enemy="화산 군단",BossName="유황 장군",Boss=true,Strength=105,Reward="Sulfur",Amount=8,Coins=45,IslandFinal=true},
  },
  Actions={CHOP="CHOP",FOOD="FOOD",HIRE="HIRE",WOOD_JOB="WOOD_JOB",FOOD_JOB="FOOD_JOB",BARRACKS="BARRACKS",RECRUIT="RECRUIT",ATTACK="ATTACK",SUPPORT="SUPPORT"},
  QACameraEnabled=true,QACaptureRemoteName="QACaptureReport",
  OwnerDirectDevelopment=true,
}
return table.freeze(Config)
