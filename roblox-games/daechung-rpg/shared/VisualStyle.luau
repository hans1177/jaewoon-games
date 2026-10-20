local Style={
  -- 기존 공용 네이티브 원본의 실제 등록 ID. 적용은 시각/모션 검수 완료를 뜻하지 않는다.
  -- Native-imported shared GLB candidates; fallback to established NPC models if loading/binding fails.
  -- Player appearance candidates are only applied if a compatible articulated R15 part rig is found.
  SharedPlayerModels={NONE=103829007217036,BREAKER=110863257572824,SHADOW=133331287956378,RUNE=102792311375491,SOUL=85536157214273},
  SharedNpcModels={VillageChief=110863257572824,WeaponMerchant=87698901546908,ArmorMerchant=110863257572824,VillageHealer=103829007217036,AdvancementMaster=76197736552279},
  -- 라이브러리 등록·로블록스 임포트된 외부/공용 GLB 10종. 전투 데이터가 아닌 외형 후보만 제공.
  SharedEnemyModels={MEADOW=110808635634531,RUINS=123382901571219,ABYSS=104892549506438},
  SharedEnemyVariants={
    MEADOW={110808635634531,122386724686135,98440047381376,133759547998155},
    CANYON={133759547998155,98440047381376,99895015440866,104892549506438},
    RUINS={123382901571219,135382255157972,99895015440866,104892549506438,132224690298312},
    SNOW={110808635634531,122386724686135,79270829530403,132224690298312},
    ABYSS={123382901571219,79270829530403,135382255157972,99895015440866,104892549506438,132224690298312}
  },
  -- 총 10종의 비전투 주민 역할에 기존 검증 대기 중인 캐릭터 GLB를 분산 연결.
  SharedResidentModels={103829007217036,85536157214273,102792311375491,133331287956378,91869903175689,87698901546908,76197736552279,110863257572824,103829007217036,85536157214273},
  NpcModels={VillageChief=89472411044669,WeaponMerchant=71830244663306,ArmorMerchant=95529290247720,VillageHealer=106583720750028,AdvancementMaster=71960136671229},
  ResidentModels={89472411044669,116599489319716,133560049433012,94002783932866,92558150738144,89066815382766},
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
