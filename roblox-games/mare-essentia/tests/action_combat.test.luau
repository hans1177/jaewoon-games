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
-- [필드 피해] 기존 곱셈 순서·반올림·방패·경직·격파를 모두 보존한다.
do
	local count, identical = 0, true
	for _, kind in { "grunt", "archer", "shield", "charger", "boss" } do
		for _, power in { 0.7, 1, 1.35 } do
			for _, weak in { 1, 1.4, 1.8, 2 } do
				for mask = 0, 31 do
					local buff = bit32.band(mask, 1) ~= 0
					local parry = bit32.band(mask, 2) ~= 0
					local counter = bit32.band(mask, 4) ~= 0
					local armor = bit32.band(mask, 8) ~= 0
					local front = bit32.band(mask, 16) ~= 0
					local old, new = A.newEnemy(kind), A.newEnemy(kind)
					local base = 10 * power * (if buff then 1.3 else 1)
						* (if parry then 0.52 else 1) * weak * (if counter then 2 else 1)
						* (if armor then 0.6 else 1)
					local dealtOld, deadOld = A.damageEnemy(old, base, 2.5, front, true)
					local dealtNew, deadNew = A.damageEnemy(new, 10, 2.5, front, true,
						power, buff, parry, weak, counter, armor)
					identical = identical and dealtOld == dealtNew and deadOld == deadNew
						and old.hp == new.hp and old.state == new.state and old.stagger == new.stagger
					count += 1
				end
			end
		end
	end
	check("공용 필드 피해 보정 조합 " .. count .. "개 일치", identical and count == 1920)
	local b = A.newEnemy("boss")
	A.damageEnemy(b, 10000, 1, false)
	local dealt, died = A.damageEnemy(b, 10, 2, false, true, 1, true, false, 1.8, true, false)
	check("이미 격파된 두목은 피해 중복 없음", dealt == 0 and not died and b.hp == 0)
end
-- 서버와 장면의 기존 편성/체력 일치 검사.
do
	local counts = { {20, 0}, {26, 0}, {32, 1}, {38, 2}, {44, 2} }
	for danger, expected in counts do
		local regular, bosses = A.fieldEnemyCounts(danger)
		check("지상 편성 유지 " .. danger, regular == expected[1] and bosses == expected[2])
	end
	local regular, bosses = A.fieldEnemyCounts(99)
	check("지상 적 수 상한 유지", regular + bosses == 100 and bosses == 8)
	check("지상 기존 최대 체력", A.fieldEnemyMaxHp("grunt") == 94 and A.fieldEnemyMaxHp("archer") == 66
		and A.fieldEnemyMaxHp("shield") == math.floor(70 * 2.55 + 0.5) and A.fieldEnemyMaxHp("charger") == math.floor(50 * 2.55 + 0.5)
		and A.fieldEnemyMaxHp("boss") == 1980)
	check("공용 적 정의 원본 체력 유지", A.Enemies.boss.hp == 720)
end
-- 두목의 실제 피해·재개 체력에서 공용 능력과 기술 단계를 복구한다.
do
	local b = A.newEnemy("boss")
	local maxHp = b.hp
	check("두목 기술 경계", A.bossPhase(70, 100) == 1 and A.bossPhase(69, 100) == 2 and A.bossPhase(40, 100) == 2 and A.bossPhase(39, 100) == 3 and A.bossPhase(15, 100) == 3 and A.bossPhase(14, 100) == 4)
	A.damageEnemy(b, maxHp - 100, 1, false)
	local f, r, g = A.advanceBossAbilities(b, maxHp)
	check("큰 피해로 모든 능력 경계를 건너도 빠짐없이 반영", f and r and g)
	local def = b.def
	check("기존 두목 배율 유지", math.abs(def.speed - A.Enemies.boss.speed * 1.25 * 1.3) < 0.0001 and math.abs(def.windup - A.Enemies.boss.windup * 0.85 * 0.7) < 0.0001 and math.abs(def.range - A.Enemies.boss.range * 1.2) < 0.0001 and math.abs(def.recover - A.Enemies.boss.recover * 1.6 * 0.7) < 0.0001)
	local f2, r2, g2 = A.advanceBossAbilities(b, maxHp)
	check("같은 체력 반복 갱신은 배율 중복 없음", not f2 and not r2 and not g2 and b.def == def)
	local restored = A.newEnemy("boss")
	restored.hp = b.hp -- 신뢰된 전투 상태를 재구성하는 순수 계산 검사. 저장 RPC는 아님.
	A.advanceBossAbilities(restored, maxHp)
	check("재구성 체력에서 동일한 기술 단계·능력", A.bossPhase(restored.hp, maxHp) == A.bossPhase(b.hp, maxHp) and restored.def.speed == def.speed and restored.def.range == def.range and restored.def.windup == def.windup and restored.def.recover == def.recover)
	check("다른 두목과 원본 정의는 독립", A.newEnemy("boss").def.speed == 8 and A.newEnemy("boss").hp == maxHp)
	local dead = A.newEnemy("boss")
	A.damageEnemy(dead, maxHp, 1, false)
	local df, dr, dg = A.advanceBossAbilities(dead, maxHp)
	check("격파된 두목은 능력 재발동 없음", not df and not dr and not dg)
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
	check("돌진병: 멀리서 예고하고 사거리 안에서 맞는다", A.Enemies.charger and A.Enemies.charger.charge and A.Enemies.charger.range > A.Enemies.grunt.range)
	check("적 4종이 정의돼 있다", A.Enemies.grunt and A.Enemies.archer and A.Enemies.shield and A.Enemies.boss and true)
end
-- 동시 공격 제한(공격권)
do
	local list = {}
	for i = 1, 4 do
		local e = A.newEnemy("grunt")
		e.state = "chase"
		table.insert(list, e)
	end
	list[1].state = "windup"
	list[2].state = "active"
	check("공격권: 준비·타격 중인 적을 센다", A.attackersCount(list) == 2)
	local ev = A.stepEnemy(list[3], 0.1, 1, false)
	check("공격권: 차례 아닌 적은 사거리 안이어도 공격을 시작하지 않는다", ev == nil and list[3].state == "chase")
	local ev2 = A.stepEnemy(list[4], 0.1, 1, true)
	check("공격권: 차례가 오면 예고를 시작한다", ev2 == "telegraph")
end
print(string.format("액션 전투 테스트: 통과 %d, 실패 %d", passed, failed))
if failed > 0 then error("액션 전투 테스트 실패") end
