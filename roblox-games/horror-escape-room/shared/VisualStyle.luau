local Style={
  Lighting={Brightness=1.45,ClockTime=0.2,Ambient=Color3.fromRGB(54,60,70),OutdoorAmbient=Color3.fromRGB(42,48,58),FogColor=Color3.fromRGB(45,52,62),FogEnd=235},
  Floor=Color3.fromRGB(69,74,83),
  Wall=Color3.fromRGB(103,111,119),
  Locker=Color3.fromRGB(68,91,105),
  SafeLight=Color3.fromRGB(188,215,224),
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
