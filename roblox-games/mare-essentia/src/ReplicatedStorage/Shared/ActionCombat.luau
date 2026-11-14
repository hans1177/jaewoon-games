--!strict
-- 쿼터뷰 액션 전투의 규칙 (엔진과 상관없는 순수 계산).
-- 동작 이름·쿨타임·모션은 마력숲(fantasy-survival)의 검증된 값을 가져왔다. 출처 id 는 src 칸에 남긴다.
-- 적은 R15 휴머노이드로 만들고(ServerScriptService/ActionArena), 여기서는 상태 기계와 피해만 계산한다.
local A = {}

A.COMBO_WINDOW = 0.45 -- 이 시간 안에 다시 누르면 다음 타로 이어진다
A.COMBO_MULT = { 1.0, 1.0, 1.6 } -- 3연타, 마지막이 가장 세다
A.STAMINA_MAX = 100
A.STAMINA_REGEN = 12 -- 초당

-- 주인공 동작
A.Moves = {
	rush = { id = "rush", label = "연속권", src = "meadow-unarmed-rush", motion = "LIGHT_ATTACK_1", vfx = "SHAPE_BURST", cooldown = 0, stamina = 0, mult = 1, range = 5, arc = 120 },
	uppercut = { id = "uppercut", label = "어퍼컷", src = "meadow-unarmed-uppercut", motion = "HEAVY_ATTACK_1", vfx = "CRITICAL_BURST", cooldown = 0, stamina = 20, mult = 2.2, range = 5, arc = 90, stagger = true },
	kick = { id = "kick", label = "회전 발차기", src = "meadow-unarmed-kick", motion = "LIGHT_ATTACK_1", vfx = "SHAPE_BURST", cooldown = 0, stamina = 14, mult = 1.4, range = 6, arc = 360 },
	heavy = { id = "heavy", label = "강타", src = "skill-meadow-heavy", motion = "HEAVY_ATTACK_1", vfx = "CRITICAL_BURST", cooldown = 5, stamina = 0, mult = 2.5, range = 5, arc = 90, stagger = true },
	sweep = { id = "sweep", label = "회전 베기", src = "skill-meadow-sweep", motion = "LIGHT_ATTACK_1", vfx = "SHAPE_BURST", cooldown = 9, stamina = 0, mult = 1.6, range = 7, arc = 360 },
	bolt = { id = "bolt", label = "마력 탄환", src = "skill-meadow-bolt", motion = "CAST_BURST", vfx = "IMPACT_FLASH", cooldown = 7, stamina = 0, mult = 1.8, range = 30, arc = 20 },
	guard = { id = "guard", label = "방어 자세", src = "skill-meadow-guard", motion = "BLOCK_HOLD", vfx = "BLOCK_IMPACT", cooldown = 9, stamina = 0, mult = 0, range = 0, arc = 0 },
	parry = { id = "parry", label = "완벽 방어", src = "skill-meadow-parry", motion = "PARRY_PERFECT", vfx = "PARRY_PERFECT_FLASH", cooldown = 7, stamina = 0, mult = 0, range = 0, arc = 0 },
	dodge = { id = "dodge", label = "회피", src = "skill-meadow-dodge-left", motion = "DODGE_LEFT", vfx = "DODGE_EVASION_PULSE", cooldown = 4, stamina = 10, mult = 0, range = 0, arc = 0, invuln = 0.35 },
	sprint = { id = "sprint", label = "질주", src = "skill-meadow-sprint", motion = "SPRINT", vfx = "BUFF_PULSE", cooldown = 8, stamina = 0, mult = 0, range = 0, arc = 0 },
	heal = { id = "heal", label = "회복", src = "skill-meadow-heal", motion = "CAST_BURST", vfx = "HEAL_PULSE", cooldown = 16, stamina = 0, mult = 0, range = 0, arc = 0 },
}

-- 적 (모두 R15). pattern 이름은 마력숲과 같다. 시간은 초.
A.Enemies = {
	grunt = { id = "grunt", name = "해적 졸개", hp = 40, speed = 12, dmg = 6, pattern = "BANDIT_SLASH", windup = 0.7, active = 0.2, recover = 0.8, range = 4, aggro = 45 },
	archer = { id = "archer", name = "사수", hp = 28, speed = 10, dmg = 7, pattern = "ARROW_SHOT", windup = 0.9, active = 0.15, recover = 1.2, range = 28, aggro = 55, keepAway = 14 },
	shield = { id = "shield", name = "방패병", hp = 70, speed = 9, dmg = 8, pattern = "SHIELD_BASH", windup = 0.8, active = 0.25, recover = 1.0, range = 4, aggro = 40, frontGuard = 0.7 },
	boss = { id = "boss", name = "거인 두목", hp = 300, speed = 8, dmg = 20, pattern = "GOLEM_SLAM", windup = 1.1, active = 0.3, recover = 1.4, range = 10, aggro = 80, aoe = true, boss = true },
}

-- ── 주인공 상태 ──────────────────────────────────────────────────────────────────
function A.newPlayer(hp: number?)
	return { hp = hp or 100, maxHp = hp or 100, stamina = A.STAMINA_MAX, combo = 0, lastHit = -100, cd = {} :: { [string]: number }, invulnUntil = -1, guarding = false }
end

function A.regen(p: any, dt: number)
	p.stamina = math.min(A.STAMINA_MAX, p.stamina + A.STAMINA_REGEN * dt)
end

-- 동작 시도. 성공하면 (true, 피해 배수, 동작표). 콤보 기본 공격은 rush 로 쓴다.
function A.tryMove(p: any, moveId: string, now: number): (boolean, number, any)
	local mv = A.Moves[moveId]
	if not mv then return false, 0, nil end
	if (p.cd[moveId] or -100) > now then return false, 0, mv end
	if p.stamina < mv.stamina then return false, 0, mv end
	p.stamina -= mv.stamina
	if mv.cooldown > 0 then p.cd[moveId] = now + mv.cooldown end
	local mult = mv.mult
	if moveId == "rush" then
		local combo: number = p.combo
		if now - p.lastHit <= A.COMBO_WINDOW and combo < #A.COMBO_MULT then
			p.combo = combo + 1
		else
			p.combo = 1
		end
		p.lastHit = now
		mult = A.COMBO_MULT[p.combo]
		if p.combo >= #A.COMBO_MULT then p.lastHit = -100 end -- 3타 뒤에는 처음부터
	end
	local inv: number? = mv.invuln
	if inv then p.invulnUntil = now + inv end
	if moveId == "guard" then p.guarding = true end
	return true, mult, mv
end

function A.isInvulnerable(p: any, now: number): boolean
	return now < p.invulnUntil
end

-- 적 공격을 맞는다. 회피 중이면 0, 막고 있으면 70% 줄고, 완벽 방어 타이밍이면 반격 신호를 준다.
function A.takeHit(p: any, dmg: number, now: number, parryAt: number?): (number, boolean)
	if A.isInvulnerable(p, now) then return 0, false end
	if parryAt and now - parryAt <= 0.25 then return 0, true end
	local d = if p.guarding then math.floor(dmg * 0.3 + 0.5) else dmg
	p.hp = math.max(0, p.hp - d)
	return d, false
end

-- ── 적 상태 기계 ─────────────────────────────────────────────────────────────────
function A.newEnemy(kind: string)
	local def = A.Enemies[kind]
	if not def then error("알 수 없는 적: " .. tostring(kind)) end
	return { kind = kind, def = def, hp = def.hp, state = "idle", t = 0, struck = false, dead = false, stagger = 0 }
end

-- 적 한 틱. dist = 주인공과 거리. 돌려주는 값: 이벤트 문자열 ("telegraph" | "strike") 또는 nil,
-- 그리고 "strike" 일 때 이번 공격이 닿았는지(hit). 닿는지는 공격이 시작되는 순간의 거리로 정한다.
function A.stepEnemy(e: any, dt: number, dist: number): (string?, boolean?)
	if e.dead then return nil, nil end
	local def = e.def
	if e.stagger > 0 then
		e.stagger = math.max(0, e.stagger - dt)
		e.state = "stagger"
		return nil, nil
	end
	if e.state == "stagger" then e.state = "chase" end
	e.t += dt
	if e.state == "idle" then
		if dist <= def.aggro then e.state = "chase"; e.t = 0 end
	elseif e.state == "chase" then
		if dist > def.aggro * 1.5 then
			e.state = "idle"
		elseif dist <= def.range then
			e.state = "windup"; e.t = 0; e.struck = false
			return "telegraph", nil
		end
	elseif e.state == "windup" then
		if e.t >= def.windup then
			e.state = "active"; e.t = 0; e.struck = true
			return "strike", dist <= def.range * 1.2
		end
	elseif e.state == "active" then
		if e.t >= def.active then e.state = "recover"; e.t = 0 end
	elseif e.state == "recover" then
		if e.t >= def.recover then e.state = "chase"; e.t = 0 end
	end
	return nil, nil
end

-- 적이 얼마나 움직여야 하는지: 사수는 거리를 두고, 나머지는 사거리까지 다가온다.
function A.moveWish(e: any, dist: number): number
	if e.dead or e.state ~= "chase" then return 0 end
	local def = e.def
	if def.keepAway and dist < def.keepAway then return -1 end
	if dist > def.range * 0.9 then return 1 end
	return 0
end

-- 주인공이 적을 친다. fromFront 가 true 이고 방패병이면 피해가 줄어든다. 돌려주는 값: 들어간 피해, 쓰러졌는지.
function A.damageEnemy(e: any, base: number, mult: number, fromFront: boolean, stagger: boolean?): (number, boolean)
	if e.dead then return 0, false end
	local d = base * mult
	if fromFront and e.def.frontGuard then d *= (1 - e.def.frontGuard) end
	d = math.max(1, math.floor(d + 0.5))
	e.hp = math.max(0, e.hp - d)
	if e.hp <= 0 then
		e.dead = true
		e.state = "dead"
		return d, true
	end
	if stagger and not e.def.boss then
		e.stagger = 0.8
		e.state = "stagger"
	end
	return d, false
end

-- 공격 범위 판정: 거리와 정면 각도(도). arc 360 은 사방.
function A.inReach(range: number, arc: number, dist: number, angleDeg: number): boolean
	if dist > range then return false end
	if arc >= 360 then return true end
	return math.abs(angleDeg) <= arc / 2
end

return A
