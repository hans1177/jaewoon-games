local Style={
  Lighting={Brightness=2.4,ClockTime=14.2,Ambient=Color3.fromRGB(155,170,175),OutdoorAmbient=Color3.fromRGB(170,185,190)},
  Water=Color3.fromRGB(78,164,190),
  Regions={
    {Name="기본섬",Pos=Vector3.new(0,0,0),Size=Vector3.new(72,6,72),Color=Color3.fromRGB(126,188,112),Material=Enum.Material.Grass,Accent=Color3.fromRGB(103,160,88)},
    {Name="산악 철광산",Pos=Vector3.new(105,4,-55),Size=Vector3.new(58,12,58),Color=Color3.fromRGB(112,118,128),Material=Enum.Material.Slate,Accent=Color3.fromRGB(77,85,96)},
    {Name="초원 목장",Pos=Vector3.new(112,1,58),Size=Vector3.new(64,8,64),Color=Color3.fromRGB(155,199,103),Material=Enum.Material.Grass,Accent=Color3.fromRGB(210,190,120)},
    {Name="암석 채석장",Pos=Vector3.new(-105,3,65),Size=Vector3.new(60,10,60),Color=Color3.fromRGB(137,129,121),Material=Enum.Material.Rock,Accent=Color3.fromRGB(92,87,82)},
    {Name="사막 금광",Pos=Vector3.new(-110,1,-58),Size=Vector3.new(66,8,66),Color=Color3.fromRGB(221,190,119),Material=Enum.Material.Sand,Accent=Color3.fromRGB(194,145,67)},
    {Name="화산 유황요새",Pos=Vector3.new(0,8,-142),Size=Vector3.new(62,16,62),Color=Color3.fromRGB(69,64,67),Material=Enum.Material.Basalt,Accent=Color3.fromRGB(255,126,42)},
  },
  Banner=Color3.fromRGB(248,232,178),
}
return table.freeze(Style)
