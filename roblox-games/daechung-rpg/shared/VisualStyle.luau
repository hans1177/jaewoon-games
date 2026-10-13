local Style={
  -- 기존 공용 네이티브 원본의 실제 등록 ID. 적용은 시각/모션 검수 완료를 뜻하지 않는다.
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
