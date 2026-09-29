local Style={
  Lighting={Brightness=2.6,ClockTime=14.2,Ambient=Color3.fromRGB(165,180,185),OutdoorAmbient=Color3.fromRGB(182,197,202)},
  Water=Color3.fromRGB(70,157,188),
  SeaLevel=2,
  Regions={
    {Name="기본섬",Pos=Vector3.new(0,0,0),Size=Vector3.new(176,10,176),Color=Color3.fromRGB(126,188,112),Material=Enum.Material.Grass,Accent=Color3.fromRGB(103,160,88)},
    {Name="산악 철광산",Pos=Vector3.new(178,7,-92),Size=Vector3.new(122,20,122),Color=Color3.fromRGB(112,118,128),Material=Enum.Material.Slate,Accent=Color3.fromRGB(77,85,96)},
    {Name="초원 목장",Pos=Vector3.new(184,3,92),Size=Vector3.new(132,14,132),Color=Color3.fromRGB(155,199,103),Material=Enum.Material.Grass,Accent=Color3.fromRGB(210,190,120)},
    {Name="암석 채석장",Pos=Vector3.new(-178,5,104),Size=Vector3.new(124,18,124),Color=Color3.fromRGB(137,129,121),Material=Enum.Material.Rock,Accent=Color3.fromRGB(92,87,82)},
    {Name="사막 금광",Pos=Vector3.new(-184,3,-98),Size=Vector3.new(136,14,136),Color=Color3.fromRGB(221,190,119),Material=Enum.Material.Sand,Accent=Color3.fromRGB(194,145,67)},
    {Name="화산 유황요새",Pos=Vector3.new(0,12,-232),Size=Vector3.new(126,26,126),Color=Color3.fromRGB(69,64,67),Material=Enum.Material.Basalt,Accent=Color3.fromRGB(255,126,42)},
  },
  Banner=Color3.fromRGB(248,232,178),
}
return table.freeze(Style)
