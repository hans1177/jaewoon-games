local A = require("./Shared/ActionCombat")
local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then passed += 1 else failed += 1; print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or "")) end
end

-- 주인공: 3연타 콤보
do
	local p = A.newPlayer()
	local _, m1 = A.tryMove(p, "rush", 0)
	local _, m2 = A.tryMove(p, "rush", 0.3)
	local _, m3 = A.tryMove(p, "rush", 0.6)
	check("콤보: 3타째가 가장 세다", m1 == 1 and m2 == 1 and m3 == 1.6, m1 .. "/" .. m2 .. "/" .. m3)
	local _, m4 = A.tryMove(p, "rush", 0.9)
	check("콤보: 3타 뒤에는 처음부터", m4 == 1 and p.combo == 1, p.combo)
	local _, m5 = A.tryMove(p, "rush", 2.0)
	check("콤보: 시간이 지나면 끊긴다", m5 == 1 and p.combo == 1)
end
-- 쿨타임·기력
do
	local p = A.newPlayer()
	local ok1 = A.tryMove(p, "heavy", 0)
	local ok2 = A.tryMove(p, "heavy", 2)
	local ok3 = A.tryMove(p, "heavy", 5.1)
	check("쿨타임: 쿨타임 안에는 못 쓰고 지나면 쓴다", ok1 and not ok2 and ok3)
	local q = A.newPlayer()
	q.stamina = 15
	local okU = A.tryMove(q, "uppercut", 0)
	check("기력: 모자라면 못 쓴다", okU == false and q.stamina == 15)
	local okK = A.tryMove(q, "kick", 0)
	check("기력: 충분하면 쓰고 깎인다", okK == true and q.stamina == 1)
	A.regen(q, 1)
	check("기력: 시간이 지나면 찬다", q.stamina > 12)
	check("없는 동작은 거절", A.tryMove(q, "nope", 0) == false)
end
-- 회피·방어·완벽 방어
do
	local p = A.newPlayer()
	A.tryMove(p, "dodge", 1)
	local d1 = A.takeHit(p, 10, 1.2)
	local d2 = A.takeHit(p, 10, 1.5)
	check("회피 중에는 피해가 없고 끝나면 맞는다", d1 == 0 and d2 == 10 and p.hp == 90, d1 .. "/" .. d2)
	local g = A.newPlayer()
	A.tryMove(g, "guard", 0)
	check("방어 중에는 피해가 70% 줄어든다", A.takeHit(g, 10, 1) == 3)
	local pr = A.newPlayer()
	local dmg, countered = A.takeHit(pr, 10, 5.1, 5.0)
	check("완벽 방어: 피해 없이 반격 신호", dmg == 0 and countered == true and pr.hp == 100)
	local late, c2 = A.takeHit(A.newPlayer(), 10, 6, 5.0)
	check("완벽 방어 타이밍을 놓치면 맞는다", late == 10 and c2 == false)
end
-- 적 상태 기계
do
	local e = A.newEnemy("grunt")
	local ev = A.stepEnemy(e, 0.1, 100)
	check("적: 멀면 가만히 있다", ev == nil and e.state == "idle")
	A.stepEnemy(e, 0.1, 30)
	check("적: 시야에 들어오면 쫓아온다", e.state == "chase")
	local ev2 = A.stepEnemy(e, 0.1, 3)
	check("적: 가까워지면 공격 예고(telegraph)", ev2 == "telegraph" and e.state == "windup")
	local ev3, hit = nil, nil
	local t = 0
	while t < 2 and ev3 ~= "strike" do
		ev3, hit = A.stepEnemy(e, 0.1, 3)
		t += 0.1
	end
	check("적: 예고 뒤에 공격하고 닿는다", ev3 == "strike" and hit == true and t >= 0.65, t)
	local e2 = A.newEnemy("grunt")
	A.stepEnemy(e2, 0.1, 30); A.stepEnemy(e2, 0.1, 3)
	local ev4, hit4
	local tt = 0
	while tt < 2 and ev4 ~= "strike" do
		ev4, hit4 = A.stepEnemy(e2, 0.1, 12) -- 예고 중에 멀리 도망
		tt += 0.1
	end
	check("적: 예고 중에 멀리 피하면 헛친다", ev4 == "strike" and hit4 == false)
	-- 한 번 공격하면 회복 시간을 거쳐 다시 쫓는다
	local cycle = 0
	local e3 = A.newEnemy("grunt")
	A.stepEnemy(e3, 0.1, 30)
	for _ = 1, 100 do
		local ev5 = A.stepEnemy(e3, 0.1, 3)
		if ev5 == "strike" then cycle += 1 end
	end
	check("적: 공격이 반복되고 간격이 있다", cycle >= 3 and cycle <= 8, cycle)
end
-- 피해 계산
do
	local sh = A.newEnemy("shield")
	local front = A.damageEnemy(sh, 10, 1, true)
	local back = A.damageEnemy(A.newEnemy("shield"), 10, 1, false)
	check("방패병: 앞에서 치면 피해가 줄고 뒤에서는 그대로", front == 3 and back == 10, front .. "/" .. back)
	local g = A.newEnemy("grunt")
	A.damageEnemy(g, 10, 2.2, false, true)
	check("강한 공격은 졸개를 경직시킨다", g.state == "stagger" and g.stagger > 0)
	for _ = 1, 10 do A.stepEnemy(g, 0.2, 3) end
	check("경직이 풀리면 다시 움직인다", g.state ~= "stagger")
	local b = A.newEnemy("boss")
	A.damageEnemy(b, 10, 2.5, false, true)
	check("보스는 경직하지 않는다", b.state ~= "stagger")
	local k = A.newEnemy("archer")
	local _, dead = A.damageEnemy(k, 100, 1, false)
	check("체력이 다하면 쓰러진다", dead == true and k.dead == true and A.stepEnemy(k, 0.1, 3) == nil)
	check("사수는 가까우면 물러난다", A.moveWish((function() local a = A.newEnemy("archer"); a.state = "chase"; return a end)(), 5) == -1)
	check("졸개는 멀면 다가온다", A.moveWish((function() local a = A.newEnemy("grunt"); a.state = "chase"; return a end)(), 20) == 1)
end
-- 범위 판정
do
	check("범위: 정면 안은 맞고 뒤는 빗나간다", A.inReach(5, 120, 3, 30) and not A.inReach(5, 120, 3, 100))
	check("범위: 회전 베기는 사방", A.inReach(7, 360, 5, 170) and not A.inReach(7, 360, 8, 0))
end
-- 마력숲 출처 id 가 모두 남아 있다
do
	local missing = 0
	for _, mv in A.Moves do if type(mv.src) ~= "string" or #mv.src < 5 then missing += 1 end end
	check("동작 출처(마력숲 id)가 모두 있다", missing == 0)
	check("적 4종이 정의돼 있다", A.Enemies.grunt and A.Enemies.archer and A.Enemies.shield and A.Enemies.boss and true)
end
print(string.format("액션 전투 테스트: 통과 %d, 실패 %d", passed, failed))
if failed > 0 then error("액션 전투 테스트 실패") end
