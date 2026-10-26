local Style={
  -- 공용 캐릭터·NPC·몬스터는 CC0 원본 등록부에 있는 로블록스 자산 ID만 사용한다. 스튜디오 시각/모션 검수는 아직 별도 필요하다.
  -- Native-imported shared GLB candidates; fallback to established NPC models if loading/binding fails.
  -- Player appearance candidates are only applied if a compatible articulated R15 part rig is found.
  SharedPlayerModels={NONE=106583720750028,BREAKER=71960136671229,SHADOW=106583720750028,RUNE=71830244663306,SOUL=125105321260088},
  SharedNpcModels={VillageChief=71960136671229,WeaponMerchant=71830244663306,ArmorMerchant=71960136671229,VillageHealer=106583720750028,AdvancementMaster=71960136671229},
  -- 등록된 CC0-1.0 원본 GLB 기반 외형 후보만 사용한다. 게임 전투 수치·저장·권한은 변경하지 않는다.
  SharedEnemyModels={MEADOW=104892549506438,RUINS=135382255157972,ABYSS=104892549506438},
  SharedEnemyVariants={
    MEADOW={104892549506438,99895015440866,132224690298312,79270829530403},
    CANYON={79270829530403,132224690298312,99895015440866,104892549506438},
    RUINS={135382255157972,135382255157972,99895015440866,104892549506438,132224690298312},
    SNOW={104892549506438,99895015440866,79270829530403,132224690298312},
    ABYSS={135382255157972,79270829530403,135382255157972,99895015440866,104892549506438,132224690298312}
  },
  -- 비전투 주민 10개 역할에 검증 대기 중인 공용 CC0 원본 GLB를 분산 연결한다.
  SharedResidentModels={106583720750028,125105321260088,71830244663306,106583720750028,125105321260088,71830244663306,71960136671229,71960136671229,106583720750028,125105321260088},
  NpcModels={VillageChief=71960136671229,WeaponMerchant=71830244663306,ArmorMerchant=95529290247720,VillageHealer=106583720750028,AdvancementMaster=71960136671229},
  ResidentModels={71960136671229,125105321260088,106583720750028,71830244663306,125105321260088,95529290247720},
  Biomes={
    MEADOW={Nature={"tree","grass","flower","bush"},Structure={"log","rock"},Density=.10,Haze=.55,Color=Color3.fromRGB(204,224,198),Ambient=Color3.fromRGB(112,132,108)},
    CANYON={Nature={"rock","dead","log"},Structure={"rock","pillar","ruin"},Density=.13,Haze=.8,Color=Color3.fromRGB(220,183,148),Ambient=Color3.fromRGB(137,106,85)},
    RUINS={Nature={"bush","vine","plant"},Structure={"rune","pillar","ruin","arch"},Density=.16,Haze=.85,Color=Color3.fromRGB(193,181,221),Ambient=Color3.fromRGB(112,103,137)},
    SNOW={Nature={"pine","tree","rock"},Structure={"wall","pillar","bridge"},Density=.12,Haze=.7,Color=Color3.fromRGB(206,228,240),Ambient=Color3.fromRGB(115,139,156)},
    ABYSS={Nature={"rock","dead"},Structure={"rune","pillar","crystal","wall"},Density=.18,Haze=1,Color=Color3.fromRGB(171,157,199),Ambient=Color3.fromRGB(102,91,123)}
  },
  Lighting={Brightness=2.0,ClockTime=17.3,Ambient=Color3.fromRGB(95,92,116),OutdoorAmbient=Color3.fromRGB(112,106,132)},
  Ground=Color3.fromRGB(86,94,82),
  Stone=Color3.fromRGB(94,91,101),
  Crystal=Color3.fromRGB(125,96,255),
  Gold=Color3.fromRGB(239,191,86),
  Enemy=Color3.fromRGB(158,69,73),
  Boss=Color3.fromRGB(73,35,94),
  CompanionColors={
    KYLE=Color3.fromRGB(190,96,65),
    SERA=Color3.fromRGB(75,104,128),
    IRIS=Color3.fromRGB(130,89,196),
  }
}
return table.freeze(Style)
