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
 Maps={
  {Id="SCHOOL",Name="학교",Events={
   {Id="LIGHTS_OUT",Name="복도 소등"},{Id="RED_HALL",Name="비상등 점등"},{Id="FOG_HALL",Name="안개 낀 복도"},
  }},
  {Id="HOSPITAL",Name="폐병원",Events={
   {Id="POWER_OUTAGE",Name="병동 정전"},{Id="EMERGENCY_LIGHTS",Name="응급등 점등"},{Id="STERILE_FOG",Name="소독 안개"},
  }},
  {Id="THEME_PARK",Name="폐놀이공원",Events={
   {Id="NEON_SURGE",Name="네온 폭주"},{Id="RIDE_BLACKOUT",Name="놀이기구 정전"},{Id="MIDWAY_FOG",Name="광장 안개"},
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
 OwnerDirectDevelopment=true,
}
return table.freeze(Config)
