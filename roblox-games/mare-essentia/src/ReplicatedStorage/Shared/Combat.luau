--!strict
-- 자동 해전 시뮬레이션: 포격 단계 → 접현 백병전.
-- 장착한 스킬 순서가 우선순위이고, 쿨타임이 돌아온 첫 스킬이 자동으로 발동한다.

local SkillsData = require(script.Parent.Skills)

export type Fighter = {
	name: string,
	hull: number,
	maxHull: number,
	crew: number,
	maxCrew: number,
	cannons: number,
	speed: number,
	steam: boolean,
	fuel: number, -- 증기 스킬에 쓸 수 있는 석탄
	cannonMult: number,
	meleeMult: number, -- 백병전 공격 배율
	pumpReduction: number,
	skills: { string },
	level: number,
}

export type Result = {
	winner: string, -- "a" | "b" | "draw"
	reason: string, -- sunk | crew | boarded | surrender | fled | stalemate
	rounds: number,
	log: { string },
	a: Fighter,
	b: Fighter,
}

type Runtime = {
	f: Fighter,
	cd: { [string]: number },
	speedDebuff: number,
	rally: number,
	stunned: number,
	luck: number, -- 이번 전투의 컨디션 (0.85 ~ 1.15)
}

local Combat = {}

-- 실시간 해전 규칙 (클라이언트 장면과 서버 검증이 같은 값을 쓴다)
Combat.SIM = {
	volley = 0.32, -- 한 번 일제 포격으로 줄 수 있는 피해: 자동 해전 한 라운드 포격의 비율
	minCd = 0.8, -- 포 발사 사이의 최소 간격(초)
	skillMargin = 2.6, -- 스킬 배율의 최대치(검증 여유)
}

-- 이 배가 elapsed 초 동안 낼 수 있는 선체 피해의 최대치 (서버가 클라이언트 보고를 검증할 때 쓴다)
function Combat.maxHullDamage(f: Fighter, elapsed: number): number
	local base = f.cannons * 1.6 * f.cannonMult * 1.15 * 1.2
	local volleys = math.floor(elapsed / Combat.SIM.minCd) + 1
	return volleys * base * Combat.SIM.volley * Combat.SIM.skillMargin
end

local RANGED_ROUNDS = 5
local BOARDING_ROUNDS = 12
local MAX_LOG = 60

local function clone(f: Fighter): Fighter
	local c = table.clone(f)
	c.skills = table.clone(f.skills)
	return c
end

local function newRuntime(f: Fighter): Runtime
	return { f = f, cd = {}, speedDebuff = 0, rally = 0, stunned = 0, luck = 1 }
end

local function tick(r: Runtime)
	for id, v in r.cd do
		if v > 0 then
			r.cd[id] = v - 1
		end
	end
end

local function pickSkill(rt: Runtime, phase: string): string?
	for _, id in rt.f.skills do
		local s = SkillsData.Skills[id]
		if s and (s.phase == "any" or s.phase == phase) and (rt.cd[id] or 0) <= 0 then
			if not s.steamOnly or (rt.f.steam and rt.f.fuel > 0) then
				rt.cd[id] = s.cooldown
				return id
			end
		end
	end
	return nil
end

local function isDown(r: Runtime): boolean
	return r.f.hull <= 0 or r.f.crew <= 0
end

local function rangedAttack(x: Runtime, y: Runtime, rng: () -> number, say: (string) -> (), round: number)
	local f = x.f
	local base = f.cannons * 1.6 * f.cannonMult * x.luck * (0.8 + 0.4 * rng())
	local hullDmg = base
	local crewDmg = base * 0.06
	local text = "포격"
	local id = pickSkill(x, "ranged")

	if id == "broadside" then
		hullDmg = base * 1.8
		text = "일제 사격"
	elseif id == "chain_shot" then
		hullDmg = base * 0.6
		y.speedDebuff = math.min(0.5, y.speedDebuff + 0.2)
		text = "사슬탄"
	elseif id == "grapeshot" then
		hullDmg = base * 0.3
		crewDmg = f.cannons * 0.7 * f.cannonMult * (0.8 + 0.4 * rng())
		text = "산탄"
	elseif id == "ram" then
		local mine = f.speed * (1 - x.speedDebuff)
		local theirs = math.max(1, y.f.speed * (1 - y.speedDebuff))
		hullDmg = base * math.clamp(1.2 + (mine / theirs - 1) * 2, 1.0, 3.0)
		f.hull = math.max(1, f.hull - hullDmg * 0.1)
		text = "충각 돌진"
	elseif id == "steam_burst" then
		f.fuel -= 1
		hullDmg = base * 2.5
		y.speedDebuff = math.min(0.5, y.speedDebuff + 0.1)
		text = "증기 분사"
	elseif id == "repair" then
		f.hull = math.min(f.maxHull, f.hull + f.maxHull * 0.08)
		hullDmg = base * 0.5
		text = "응급 수리"
	elseif id == "relic_ward" then
		f.hull = math.min(f.maxHull, f.hull + f.maxHull * 0.14)
		hullDmg = base * 0.5
		text = "유물의 가호"
	elseif id == "predator_decoy" then
		hullDmg = base * 0.4
		crewDmg = base * 0.15
		y.luck = math.max(0.7, y.luck - 0.1)
		text = "맹수 울음"
	elseif id == "chart_course" then
		hullDmg = base * 1.0
		y.speedDebuff = math.min(0.5, y.speedDebuff + 0.35)
		text = "해도 항로 차단"
	elseif id == "star_fix" then
		hullDmg = base * 2.0
		text = "별자리 조준"
	elseif id == "pressure_valve" then
		hullDmg = base * 2.2
		text = "압력 밸브 방출"
	elseif id == "gravity_calc" then
		hullDmg = base * 2.4
		text = "만유인력 계산"
	elseif id == "chrono_fix" then
		hullDmg = base * 1.0
		y.speedDebuff = math.min(0.5, y.speedDebuff + 0.3)
		text = "정밀 항로 차단"
	elseif id == "buttress" then
		f.hull = math.min(f.maxHull, f.hull + f.maxHull * 0.12)
		hullDmg = base * 0.5
		text = "버팀목 보강"
	elseif id == "lightning_rod" then
		hullDmg = base * 0.5
		crewDmg = base * 0.1
		y.luck = math.max(0.7, y.luck - 0.15)
		text = "피뢰침 신호"
	elseif id == "telescope_range" then
		hullDmg = base * 1.8
		y.speedDebuff = math.min(0.5, y.speedDebuff + 0.15)
		text = "망원경 관측"
	end

	local d = math.floor(hullDmg * (1 - y.f.pumpReduction) + 0.5)
	local c = math.floor(crewDmg + 0.5)
	y.f.hull = math.max(0, y.f.hull - d)
	y.f.crew = math.max(0, y.f.crew - c)
	say(string.format("[%d] %s: %s! 선체 -%d, 선원 -%d", round, f.name, text, d, c))
end

local function boardingAttack(x: Runtime, y: Runtime, rng: () -> number, say: (string) -> (), round: number)
	local f = x.f
	if x.stunned > 0 then
		x.stunned -= 1
		say(string.format("[%d] %s: 붙잡혀서 움직이지 못한다", round, f.name))
		return
	end

	local buff = if x.rally > 0 then 1.25 else 1.0
	if x.rally > 0 then
		x.rally -= 1
	end
	local base = f.crew * 0.12 * f.meleeMult * x.luck * (0.8 + 0.4 * rng()) * buff
	local dmg = base
	local text = "백병전"
	local id = pickSkill(x, "boarding")

	if id == "cutlass_flurry" then
		dmg = base * 1.6
		text = "베기 연타"
	elseif id == "pistol_volley" then
		dmg = base * 1.3 + f.crew * 0.02
		text = "총병 연사"
	elseif id == "rally" then
		x.rally = 2
		dmg = base * 0.8
		text = "사기 고양"
	elseif id == "surgeon" then
		f.crew = math.min(f.maxCrew, f.crew + math.floor(f.maxCrew * 0.05 + 0.5))
		dmg = base * 0.8
		text = "군의관 치료"
	elseif id == "steam_hook" then
		y.stunned = 1
		text = "증기 갈고리"
	elseif id == "repair" then
		f.hull = math.min(f.maxHull, f.hull + f.maxHull * 0.08)
		dmg = base * 0.7
		text = "응급 수리"
	elseif id == "relic_ward" then
		f.hull = math.min(f.maxHull, f.hull + f.maxHull * 0.14)
		dmg = base * 0.6
		text = "유물의 가호"
	elseif id == "herbal_remedy" then
		f.crew = math.min(f.maxCrew, f.crew + math.floor(f.maxCrew * 0.09 + 0.5))
		dmg = base * 0.7
		text = "약초 치료"
	elseif id == "bribe_gunners" then
		y.stunned = 1
		dmg = base * 0.5
		text = "뇌물 공작"
	end

	local d = math.floor(dmg + 0.5)
	y.f.crew = math.max(0, y.f.crew - d)
	say(string.format("[%d] %s: %s! 적 선원 -%d", round, f.name, text, d))
end

local function finish(winner: string, reason: string, round: number, log: { string }, ra: Runtime, rb: Runtime): Result
	return { winner = winner, reason = reason, rounds = round, log = log, a = ra.f, b = rb.f }
end

-- 한쪽이 쓰러졌는지 확인한다. 쓰러졌으면 (winner, reason), 아니면 nil.
local function downOutcome(ra: Runtime, rb: Runtime): (string?, string?)
	local aDown = isDown(ra)
	local bDown = isDown(rb)
	if not aDown and not bDown then
		return nil, nil
	end
	if aDown and bDown then
		return "draw", "sunk"
	end
	local loser = if aDown then ra else rb
	local reason = if loser.f.hull <= 0 then "sunk" else "crew"
	return (if aDown then "b" else "a"), reason
end

function Combat.run(a: Fighter, b: Fighter, rng: () -> number): Result
	local ra = newRuntime(clone(a))
	local rb = newRuntime(clone(b))
	local log: { string } = {}
	local function say(s: string)
		if #log < MAX_LOG then
			table.insert(log, s)
		end
	end
	local round = 0
	ra.luck = 0.85 + 0.3 * rng()
	rb.luck = 0.85 + 0.3 * rng()

	say(string.format("%s vs %s, 해전 시작!", a.name, b.name))

	for _ = 1, RANGED_ROUNDS do
		round += 1
		tick(ra)
		tick(rb)
		rangedAttack(ra, rb, rng, say, round)
		rangedAttack(rb, ra, rng, say, round)
		if isDown(ra) or isDown(rb) then
			break
		end
	end

	local w, r = downOutcome(ra, rb)
	if w and r then
		return finish(w, r, round, log, ra, rb)
	end

	-- 접현 전 판단
	if ra.f.crew < rb.f.crew * 0.3 then
		say(string.format("%s: 선원이 너무 적다. 전장을 이탈한다", a.name))
		return finish("draw", "fled", round, log, ra, rb)
	end
	if rb.f.crew < ra.f.crew * 0.3 then
		say(string.format("%s: 항복했다!", b.name))
		return finish("a", "surrender", round, log, ra, rb)
	end

	return Combat.boardingPhase(ra, rb, rng, say, round, log)
end

-- 접현 백병전만 따로 돌린다 (실시간 해전에서 두 배가 맞닿았을 때도 같은 규칙을 쓴다)
function Combat.boardingPhase(ra: Runtime, rb: Runtime, rng: () -> number, say: (string) -> (), round: number, log: { string }): Result
	say("두 배가 접현했다! 백병전 돌입")
	for _ = 1, BOARDING_ROUNDS do
		round += 1
		tick(ra)
		tick(rb)
		boardingAttack(ra, rb, rng, say, round)
		boardingAttack(rb, ra, rng, say, round)
		if ra.f.crew <= 0 or rb.f.crew <= 0 then
			break
		end
	end

	if ra.f.crew <= 0 and rb.f.crew <= 0 then
		return finish("draw", "boarded", round, log, ra, rb)
	elseif rb.f.crew <= 0 then
		return finish("a", "boarded", round, log, ra, rb)
	elseif ra.f.crew <= 0 then
		return finish("b", "boarded", round, log, ra, rb)
	end

	if ra.f.crew > rb.f.crew * 1.1 then
		return finish("a", "stalemate", round, log, ra, rb)
	elseif rb.f.crew > ra.f.crew * 1.1 then
		return finish("b", "stalemate", round, log, ra, rb)
	end
	return finish("draw", "stalemate", round, log, ra, rb)
end

-- 실시간 해전용: 지금 선원 수로 곧바로 백병전을 돌린다. seed가 같으면 결과도 같다 (서버가 다시 돌려 확인한다).
function Combat.board(a: Fighter, b: Fighter, seed: number): Result
	-- 어느 기기에서나 같은 수열이 나오는 간단한 난수 (클라이언트와 서버가 같은 결과를 얻어야 한다)
	local x = math.floor(seed) % 2147483647
	if x <= 0 then
		x += 2147483646
	end
	local function nextNumber(): number
		x = (x * 48271) % 2147483647
		return x / 2147483647
	end
	local ra = newRuntime(clone(a))
	local rb = newRuntime(clone(b))
	local log: { string } = {}
	local function say(s: string)
		if #log < MAX_LOG then
			table.insert(log, s)
		end
	end
	ra.luck = 0.85 + 0.3 * nextNumber()
	rb.luck = 0.85 + 0.3 * nextNumber()
	return Combat.boardingPhase(ra, rb, nextNumber, say, 0, log)
end

local PIRATE_NAMES = { "검은 갈매기호", "붉은 파도호", "안개 속의 늑대호", "녹슨 닻호", "북해의 독수리호" }

-- 레벨에 맞는 사략선(해적선) 생성
function Combat.pirate(level: number, rng: () -> number): Fighter
	local lv = math.max(1, level)
	local hull = math.floor(70 + 14 * lv + 15 * rng())
	local crew = math.floor(12 + 2.5 * lv + 4 * rng())
	return {
		name = PIRATE_NAMES[1 + math.floor(rng() * #PIRATE_NAMES) % #PIRATE_NAMES],
		hull = hull,
		maxHull = hull,
		crew = crew,
		maxCrew = crew,
		cannons = 3 + math.floor(lv * 0.9),
		speed = 7,
		steam = false,
		fuel = 0,
		cannonMult = 1,
		meleeMult = 1,
		pumpReduction = 0,
		skills = { "broadside", "grapeshot", "cutlass_flurry", "pistol_volley" },
		level = lv,
	}
end

-- 신화 보스(Bosses.luau 항목)를 전투원으로 바꾼다. 증기선이면 엔진 소리에 자극받아 더 사나워진다.
function Combat.boss(def: any, playerSteam: boolean): Fighter
	local rage = if playerSteam then def.steamRage else 1
	return {
		name = def.name,
		hull = def.hull,
		maxHull = def.hull,
		crew = def.crew,
		maxCrew = def.crew,
		cannons = def.cannons,
		speed = 8,
		steam = false,
		fuel = 0,
		cannonMult = def.cannonMult * rage,
		meleeMult = def.meleeMult * rage,
		pumpReduction = 0,
		skills = def.skills,
		level = 10,
	}
end

-- 배의 능력치가 사략선 몇 레벨에 해당하는지 환산한다 (포·선원 위주, 선체는 보조).
function Combat.equivalentLevel(cannons: number, hull: number, crew: number): number
	local byCannons = (cannons - 3) / 0.9
	local byHull = (hull - 70) / 14
	local byCrew = (crew - 12) / 2.5
	-- 선체는 승패에 덜 중요해서 가중치를 낮췄다
	return math.max(1, math.floor((3 * byCannons + 3 * byCrew + byHull) / 7))
end

function Combat.pirateReward(level: number): { coins: number, xp: number, fame: number }
	local lv = math.max(1, level)
	return { coins = 80 + 40 * lv, xp = 40 + 15 * lv, fame = 2 + math.floor(lv / 3) }
end

return Combat
