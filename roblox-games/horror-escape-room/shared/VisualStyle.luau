local Style={
  Lighting={Brightness=2.05,ClockTime=0.35,Ambient=Color3.fromRGB(72,78,90),OutdoorAmbient=Color3.fromRGB(58,64,76),FogColor=Color3.fromRGB(50,57,68),FogEnd=270},
  Floor=Color3.fromRGB(82,88,99),
  Wall=Color3.fromRGB(122,128,137),
  Locker=Color3.fromRGB(74,101,118),
  SafeLight=Color3.fromRGB(202,230,238),
  Frozen=Color3.fromRGB(112,202,255),
  Survivor=Color3.fromRGB(201,219,231),
  Monsters={
    DRAK={Color=Color3.fromRGB(112,26,40),Accent=Color3.fromRGB(255,54,81),Label="드라크"},
    FRANKEN={Color=Color3.fromRGB(75,108,74),Accent=Color3.fromRGB(153,245,132),Label="프랑켄"},
    WOLF={Color=Color3.fromRGB(92,76,67),Accent=Color3.fromRGB(239,181,94),Label="울프"},
    MIRAA={Color=Color3.fromRGB(174,156,111),Accent=Color3.fromRGB(239,221,163),Label="미이라"},
    REAPER={Color=Color3.fromRGB(53,42,70),Accent=Color3.fromRGB(161,95,255),Label="리퍼"},
  }
}
return table.freeze(Style)
