local Config={
 Platform="ROBLOX",GameId="daechung-rpg",GameName="대충 RPG",MobileFirst=true,SaveEnabled=true,
 PlayMode="SINGLE_OR_COOP",SoloPlayable=true,MultiplayerRequired=true,CoopRequired=true,PartySlots=4,RemoteName="GameAction",
 Classes={
  {Id="BREAKER",Name="파쇄기사",Damage=14,Skill=36},
  {Id="SHADOW",Name="그림자추적자",Damage=13,Skill=42},
  {Id="RUNE",Name="룬술사",Damage=12,Skill=30},
  {Id="SOUL",Name="영혼소환사",Damage=11,Skill=28},
 },
 StarterCompanions={
  {Id="KYLE",Name="카일",Class="BREAKER",Story="폐광에서 괴물을 막던 파쇄기사"},
  {Id="SERA",Name="세라",Class="SHADOW",Story="도적단 사건에서 구출되는 추적자"},
  {Id="IRIS",Name="이리스",Class="RUNE",Story="고대 룬에 갇혀 있던 룬술사"},
 },
 FutureCompanions={{Id="NOA",Name="노아",Kind="STORY"},{Id="WARDEN",Name="심연의 간수",Kind="BOSS"},{Id="NAMELESS",Name="무명의 동료",Kind="HIDDEN"}},
 AIStyles={"AGGRESSIVE","PROTECT","CONTROL"},Relics={"FURY","GUARD","CONTROL"},
 Actions={ATTACK="ATTACK",SKILL="SKILL",DODGE="DODGE",NEXT_CLASS="NEXT_CLASS",NEXT_AI="NEXT_AI",NEXT_RELIC="NEXT_RELIC",UPGRADE_WEAPON="UPGRADE_WEAPON"},
 OwnerDirectDevelopment=true,
}
return table.freeze(Config)
