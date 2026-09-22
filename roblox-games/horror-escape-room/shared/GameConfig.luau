local Config={
 PolicySource = "company-learning/platform-release-roadmap.json",
 Platform = "ROBLOX",
 MobileFirst = true,
 GameId="horror-escape-room",GameName="심야 술래잡기",SaveEnabled=true,
 Genre = "Survival",
 PlayMode = "COMPETITIVE",
 MultiplayerRequired = true,
 SoloPlayable=true,CoopRequired=false,CompetitiveRequired=true,MinimumParticipants=2,
 TargetPopulation=5,SurvivorSlots=4,MonsterSlots=1,RoundSeconds=180,IntermissionSeconds=8,TagDistance=5.5,RescueDistance=8,RemoteName="GameAction",
 SurvivorDashCooldown=7,MonsterAbilityCooldown=7,
 RemoteMinInterval=.08,MaxHorizontalVelocity=92,MaxTeleportStep=48,ArenaLimit=176,
 ObjectiveCount=4,EscapeUnlockObjectives=4,
 Audio={
  Background="rbxassetid://9043557976",
  Chase="rbxassetid://9042664292",
  Result="rbxassetid://1839321582",
  Action="rbxassetid://1837829181",
  Warning="rbxassetid://9043346574",
  Footstep="rbxassetid://1837829181",
  Freeze="rbxassetid://9043346574",
  Rescue="rbxassetid://1839321582",
 },
 Maps={
  {Id="SCHOOL",Name="학교",Difficulty="BEGINNER",Areas={"교실","복도","급식실","체육관"},Events={
   {Id="LIGHTS_OUT",Name="복도 소등"},{Id="RED_HALL",Name="비상등 점등"},{Id="FIRE_DRILL",Name="비상벨과 체육관 개방"},
  }},
  {Id="HOSPITAL",Name="폐병원",Difficulty="CHASE",Areas={"좁은 복도","병실","수술실","지하실"},Events={
   {Id="POWER_OUTAGE",Name="병동 정전"},{Id="WARD_LOCKDOWN",Name="병실 문 잠김"},{Id="BASEMENT_FOG",Name="지하실 짙은 안개"},
  }},
  {Id="THEME_PARK",Name="폐놀이공원",Difficulty="ADVANCED",Areas={"회전목마","귀신의 집","매표소","지하 통로"},Events={
   {Id="CAROUSEL_START",Name="회전목마 오작동"},{Id="RIDE_BLACKOUT",Name="놀이기구 정전"},{Id="TUNNEL_FOG",Name="지하 통로 안개"},
  }},
 },
 OfficialAssets={
  HouseProps=10840642581,
  CityPack=6933556508,
  DungeonPack=6934021345,
  ForestPack=6432306802,
  StonePortal=12931228293,
  Shade=95401558,
  Skeleton=53604463,
  RobotSpider=285590061,
 },
 MonsterForms={
  {Id="DRACULA",Name="드라큘라",UnlockXP=0,Ability="BAT_DASH",Theme="VAMPIRE"},
  {Id="FRANKENSTEIN",Name="프랑켄슈타인",UnlockXP=250,Ability="POWER_CHARGE",Theme="FRANKEN"},
  {Id="WEREWOLF",Name="늑대인간",UnlockXP=500,Ability="RAGE_RUN",Theme="WEREWOLF",ExternalAssetId=155389113},
  {Id="MUMMY",Name="미라",UnlockXP=800,Ability="CURSE_SLOW",Theme="MUMMY",ExternalAssetId=4012084718},
  {Id="GRIM_REAPER",Name="사신",UnlockXP=1200,Ability="SHADOW_STEP",Theme="REAPER",ExternalAssetId=49353603},
 },
 Actions={
  PREFER_MONSTER="PREFER_MONSTER",PREFER_SURVIVOR="PREFER_SURVIVOR",
  SOLO_MONSTER="SOLO_MONSTER",SOLO_SURVIVOR="SOLO_SURVIVOR",
  RESCUE="RESCUE",DASH="DASH",ABILITY="ABILITY",NEXT_MONSTER="NEXT_MONSTER"
 },
 QACameraEnabled=true,QACaptureRemoteName="QACaptureReport",
 OwnerDirectDevelopment=true,
}
return table.freeze(Config)
