local Style={
  Lighting={Brightness=2.05,ClockTime=0.35,Ambient=Color3.fromRGB(72,78,90),OutdoorAmbient=Color3.fromRGB(58,64,76),FogColor=Color3.fromRGB(50,57,68),FogEnd=270},
  Floor=Color3.fromRGB(82,88,99),
  Wall=Color3.fromRGB(122,128,137),
  Locker=Color3.fromRGB(74,101,118),
  SafeLight=Color3.fromRGB(202,230,238),
  Frozen=Color3.fromRGB(112,202,255),
  Survivor=Color3.fromRGB(201,219,231),
  Monsters={
    DRACULA={Color=Color3.fromRGB(76,18,30),Accent=Color3.fromRGB(232,48,72),Label="드라큘라"},
    FRANKENSTEIN={Color=Color3.fromRGB(75,108,74),Accent=Color3.fromRGB(153,245,132),Label="프랑켄슈타인"},
    WEREWOLF={Color=Color3.fromRGB(91,70,58),Accent=Color3.fromRGB(239,181,94),Label="늑대인간"},
    MUMMY={Color=Color3.fromRGB(176,160,116),Accent=Color3.fromRGB(244,229,177),Label="미라"},
    GRIM_REAPER={Color=Color3.fromRGB(42,34,56),Accent=Color3.fromRGB(165,92,255),Label="사신"},
  }
}
return table.freeze(Style)
