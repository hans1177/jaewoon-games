-- 파일명: roblox-games/animal-auto-battle/shared/Rules.luau
-- 메인: 서버 권한 자동전투와 상점이 공유하는 규칙
local Rules = {}
Rules.TeamLimit = 5
Rules.StartGold = 10
Rules.StartHearts = 5
Rules.TargetWins = 8
Rules.MaxStat = 50
Rules.Pets = {
 bunny={name="토끼",tier=1,attack=1,health=4,ability="food_hp"},
 cat={name="고양이",tier=1,attack=2,health=3,ability="food_attack"},
 dog={name="강아지",tier=1,attack=2,health=2,ability="team_attack"},
 pig={name="돼지",tier=1,attack=3,health=2,ability="sell_gold"},
 fox={name="여우",tier=2,attack=4,health=3,ability="first_strike"},
 turtle={name="거북이",tier=2,attack=2,health=6,ability="armor"},
 wolf={name="늑대",tier=3,attack=5,health=4,ability="knockout"},
 cow={name="젖소",tier=3,attack=3,health=7,ability="team_hp"},
}
Rules.Foods={
 berry={name="열매",tier=1,attack=0,health=2},
 seed={name="씨앗",tier=1,attack=1,health=1},
 meal={name="영양식",tier=2,attack=2,health=2},
 feast={name="진수성찬",tier=3,attack=3,health=3},
}
function Rules.tier(round) return math.clamp(math.floor((round+1)/2),1,3) end
function Rules.level(exp) return exp>=5 and 3 or (exp>=2 and 2 or 1) end
function Rules.stat(v) return math.clamp(math.floor(v),1,Rules.MaxStat) end
function Rules.newPet(id)
 local def=Rules.Pets[id]
 if not def then return nil end
 return {id=id,attack=def.attack,health=def.health,exp=0,level=1}
end
function Rules.cleanPet(raw)
 if typeof(raw)~="table" or not Rules.Pets[raw.id] then return nil end
 local a,h,x=tonumber(raw.attack),tonumber(raw.health),tonumber(raw.exp)
 if not a or not h or not x or a~=a or h~=h or x~=x then return nil end
 local exp=math.clamp(math.floor(x),0,5)
 return {id=raw.id,attack=Rules.stat(a),health=Rules.stat(h),exp=exp,level=Rules.level(exp)}
end
return table.freeze(Rules)
