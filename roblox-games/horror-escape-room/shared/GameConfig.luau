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
