
-- 파일명: shared/Config.luau
-- 백수대전쟁 공식 경제·생물 밸런스
local C={GameId="baeksu-war",SaveKey="baeksu-war-v1",StartGold=300,StartSlots=3,MaxLevel=10,GateHP=500,EnemyHP=380,Cap=55,Remote="BeastWarAction"}
C.Units={
 {Id="sparrow",Name="참새",Home="참새집",Cost=0,Upgrade=38,HP=38,Damage=7,Speed=13,Interval=3.2,Range=4,Color=Color3.fromRGB(226,192,113),Shape="BIRD"},
 {Id="ant",Name="개미",Home="개미굴",Cost=65,Upgrade=54,HP=65,Damage=9,Speed=9,Interval=3,Range=3.5,Color=Color3.fromRGB(100,73,66),Shape="ANT"},
 {Id="beetle",Name="장수풍뎅이",Home="풍뎅이집",Cost=110,Upgrade=70,HP=130,Damage=15,Speed=6,Interval=4.2,Range=4,Color=Color3.fromRGB(66,126,90),Shape="BUG"},
 {Id="wolf",Name="늑대",Home="늑대굴",Cost=145,Upgrade=90,HP=94,Damage=22,Speed=14,Interval=4.6,Range=4,Color=Color3.fromRGB(141,163,170),Shape="WOLF"},
 {Id="turtle",Name="거북",Home="거북이집",Cost=175,Upgrade=108,HP=255,Damage=10,Speed=5,Interval=5.5,Range=4,Color=Color3.fromRGB(88,158,105),Shape="TURTLE"},
 {Id="slime",Name="슬라임",Home="슬라임 연못",Cost=205,Upgrade=125,HP=142,Damage=17,Speed=8.5,Interval=4.8,Range=4,Color=Color3.fromRGB(84,215,188),Shape="SLIME"},
 {Id="golem",Name="골렘",Home="골렘 제단",Cost=270,Upgrade=148,HP=365,Damage=31,Speed=4.6,Interval=6.3,Range=5,Color=Color3.fromRGB(141,125,112),Shape="GOLEM"},
 {Id="dragon",Name="용",Home="용의 둥지",Cost=400,Upgrade=210,HP=230,Damage=43,Speed=10,Interval=7.3,Range=7,Color=Color3.fromRGB(193,90,76),Shape="DRAGON"}
}
C.ById={} for _,u in ipairs(C.Units) do C.ById[u.Id]=u end
function C.SlotCost(i) if i<=3 then return 0 end return math.floor(110*1.42^(i-4)) end
function C.UpgradeCost(u,lv) return math.floor(u.Upgrade*1.42^(lv-1)) end
function C.Stats(u,lv)
 local k=1+(lv-1)*.23
 return {HP=math.floor(u.HP*k),Damage=math.floor(u.Damage*k),Speed=u.Speed*(1+(lv-1)*.025),Range=u.Range,Interval=math.max(1.7,u.Interval-(lv-1)*.12),Count=lv>=10 and 3 or (lv>=5 and 2 or 1)}
end
return C
