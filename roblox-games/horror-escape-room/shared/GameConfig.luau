local Config={
 PolicySource = "company-learning/platform-release-roadmap.json",
 Platform = "ROBLOX",
 MobileFirst = true,
 GameId="horror-escape-room",GameName="심야 술래잡기",SaveEnabled=true,
 Genre = "Survival",
 PlayMode = "COMPETITIVE",
 MultiplayerRequired = true,
 SoloPlayable=true,CoopRequired=false,CompetitiveRequired=true,MinimumParticipants=2,
 TargetPopulation=6,RoundSeconds=120,IntermissionSeconds=8,TagDistance=5.5,RescueDistance=8,RemoteName="GameAction",
 SurvivorDashCooldown=7,MonsterAbilityCooldown=7,
 RemoteMinInterval=.08,MaxHorizontalVelocity=92,MaxTeleportStep=36,ArenaLimit=86,
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
 MonsterForms={
  {Id="DRAK",Name="드라크",UnlockXP=0,Ability="BAT_DASH"},
  {Id="FRANKEN",Name="프랑켄",UnlockXP=250,Ability="POWER_CHARGE"},
  {Id="WOLF",Name="울프",UnlockXP=500,Ability="RAGE_RUN"},
  {Id="MIRAA",Name="미이라",UnlockXP=800,Ability="CURSE_SLOW"},
  {Id="REAPER",Name="리퍼",UnlockXP=1200,Ability="SHADOW_STEP"},
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
