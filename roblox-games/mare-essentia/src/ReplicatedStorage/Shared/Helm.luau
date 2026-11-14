--!strict
-- 수동 항해 물리: 바람·돛·키·암초·해류. Roblox 와 무관한 순수 계산이라 로직 테스트로 검증한다.
-- 좌표는 (x, z) 숫자, 방향 yaw 는 라디안. 앞쪽 벡터 = (cos yaw, -sin yaw). 오른쪽으로 틀면 yaw 가 줄어든다.
local Helm = {}

export type State = { x: number, z: number, yaw: number, trim: number, speed: number }
export type Env = {
	windFrom: number, -- 바람이 불어오는 방향(yaw)
	baseSpeed: number,
	steam: boolean?,
	t: number,
	shoals: { { x: number, z: number } }?,
	currents: { { x: number, z: number, dx: number, dz: number } }?,
}

local function wrap(a: number): number
	return (a + math.pi) % (math.pi * 2) - math.pi
end
Helm.wrap = wrap

-- 바람과 이루는 각도(0 = 맞바람)에 따른 속도 비율
function Helm.polar(a: number): number
	local d = math.deg(math.abs(a))
	if d < 30 then
		return 0.1
	elseif d < 60 then
		return 0.1 + (d - 30) / 30 * 0.6
	elseif d < 100 then
		return 0.7 + (d - 60) / 40 * 0.3
	elseif d < 150 then
		return 1
	end
	return 1 - (d - 150) / 30 * 0.15
end

-- 한 걸음 진행. 반환: 안내 문구("" 이면 없음)
function Helm.step(s: State, steer: number, trimIn: number, dt: number, env: Env): string
	steer = math.clamp(steer, -1, 1)
	s.trim = math.clamp(s.trim + trimIn * dt * 0.6, 0.1, 1)
	local gust = 1 + 0.12 * math.sin(env.t * 0.3) + 0.05 * math.sin(env.t * 0.9 + 1)
	local eff = if env.steam then 0.95 else Helm.polar(wrap(s.yaw - env.windFrom)) * gust
	local target = env.baseSpeed * s.trim * eff
	local note = ""
	for _, c in env.shoals or {} do
		if math.sqrt((s.x - c.x) ^ 2 + (s.z - c.z) ^ 2) < 42 then
			target *= 0.45
			note = "암초 지대! 속도가 크게 줄어요"
		end
	end
	for _, cu in env.currents or {} do
		if math.sqrt((s.x - cu.x) ^ 2 + (s.z - cu.z) ^ 2) < 70 then
			if math.cos(s.yaw) * cu.dx - math.sin(s.yaw) * cu.dz > 0 then
				target *= 1.3
				note = "해류를 탔어요! 가속"
			end
		end
	end
	s.speed += (target - s.speed) * math.min(1, dt * 0.9)
	-- 속도가 있어야 키가 듣는다. 맞바람에 서 있으면(돛이 처지면) 방향을 틀기 어렵다.
	local turn = 0.95 * (0.35 + 0.65 * math.min(1, s.speed / math.max(env.baseSpeed * 0.5, 1)))
	s.yaw -= steer * turn * dt
	s.x += math.cos(s.yaw) * s.speed * dt
	s.z -= math.sin(s.yaw) * s.speed * dt
	return note
end

-- 자동 항해: 목적지로 가되 맞바람이면 지그재그(태킹). 반환: steer, trimIn, 새 tackSide
function Helm.autopilot(s: State, destX: number, destZ: number, windFrom: number, tackSide: number): (number, number, number)
	local want = math.atan2(-(destZ - s.z), destX - s.x)
	if math.abs(wrap(want - windFrom)) < math.rad(50) then
		want = windFrom + tackSide * math.rad(52)
		if math.abs(wrap(want - s.yaw)) < 0.05 then
			tackSide = -tackSide
		end
	end
	return -math.clamp(wrap(want - s.yaw) * 2.5, -1, 1), (0.95 - s.trim) * 2, tackSide
end

return Helm
