-- 파일명: GameConfig.luau
-- 메인: 학교 타이쿤 규칙 및 저장 구조
local Config = {
 GameId="school-tycoon", GameName="학교 타이쿤", Platform="ROBLOX",
 RemoteName="SchoolTycoonAction", SaveKey="school-tycoon-v1", SaveVersion=1,
 GridSize=8, TileSize=18, StartingCoins=2400, StartingReputation=65,
 MaxTeachers=12, TickSeconds=6, MaxStudentActors=8,
 Items={
  path={label="복도",cost=35,color=Color3.fromRGB(192,191,182)},
  classroom={label="교실",cost=300,color=Color3.fromRGB(80,157,223),capacity=12,income=12,upCost=230,maxLevel=3},
  library={label="도서관",cost=460,color=Color3.fromRGB(149,112,207),capacity=8,income=17,upCost=340,maxLevel=3},
  cafeteria={label="급식실",cost=520,color=Color3.fromRGB(238,165,81),capacity=16,income=10,upCost=380,maxLevel=3},
  gym={label="체육관",cost=680,color=Color3.fromRGB(80,190,151),capacity=18,income=14,upCost=490,maxLevel=3},
  lab={label="과학실",cost=850,color=Color3.fromRGB(92,202,203),capacity=10,income=28,upCost=610,maxLevel=3},
  garden={label="정원",cost=180,color=Color3.fromRGB(91,181,109),capacity=0,income=0,upCost=0,maxLevel=1},
 },
 TeacherCost=280, TeacherSalary=8,
 Goals={{students=15,reward=250},{students=30,reward=450},{students=55,reward=700},{students=90,reward=1200}},
}
return Config