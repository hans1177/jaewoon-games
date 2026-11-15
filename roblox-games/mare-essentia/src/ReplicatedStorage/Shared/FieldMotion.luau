--!nonstrict
-- 지상 탐험 전투의 몸 움직임. 회사 공용 모션(CommonMotion = 마력숲과 같은 원본)의 관절 포즈를
-- R15 Motor6D 에 얹는다. 기존 Animator 가 쓴 포즈 위에 섞으므로(followAnimator) 걷기 애니메이션과 함께 간다.
-- 엔진 전용(Instance/Motor6D 사용)이라 로직 테스트에서는 불러오지 않는다.
local CM = require(script.Parent:WaitForChild("CommonMotion"))

local FM = {}

local R15_NAMES = { "Root", "Waist", "Neck", "LeftShoulder", "RightShoulder", "LeftElbow", "RightElbow", "LeftWrist", "RightWrist", "LeftHip", "RightHip", "LeftKnee", "RightKnee", "LeftAnkle", "RightAnkle" }
local AVAILABLE = {
	Spine = true, Chest = true, Head = true, Neck = true,
	UpperArmL = true, UpperArmR = true, ForearmL = true, ForearmR = true, HandL = true, HandR = true,
	ThighL = true, ThighR = true, ShinL = true, ShinR = true, FootL = true, FootR = true,
}

-- 리그의 실제 Motor6D 를 묶는다. followAnimator: 캐릭터처럼 Animator 가 돌고 있으면 true, 적 같은 정적 리그는 false.
function FM.new(model: Model, followAnimator: boolean)
	local joints = {}
	for _, n in R15_NAMES do
		local j = model:FindFirstChild(n, true)
		if j and j:IsA("Motor6D") then
			joints[n] = j
		end
	end
	local ctl = CM.BindJointPose(joints, { followAnimator = followAnimator, response = 18 })
	return { ctl = ctl, canon = {}, r15 = {}, model = model }
end

-- canon(Spine·Chest·UpperArmR… 공통 이름 포즈)를 R15 관절 이름으로 옮겨 적용한다. rootRot: 몸 전체 회전(회전베기용).
function FM.step(h, dt: number, rootRot: CFrame?)
	CM.MapCombatPoseToR15(h.canon, h.r15)
	if rootRot then
		h.r15.Root = rootRot
	end
	h.ctl.Step(h.r15, dt)
end

-- 사람형 적·동료: 상태(IDLE/RUN/ANTICIPATION/ATTACK/RECOVERY/HIT)와 위상(0~1)으로 자세를 만든다.
function FM.actor(h, state: string, phase: number, dt: number, isBoss: boolean?)
	table.clear(h.canon)
	CM.SampleProceduralActorMotion(state, phase, {
		bodyPlan = "BIPED",
		actorClass = if isBoss then "BOSS" else "ENEMY",
		availableJoints = AVAILABLE,
		secondary = 0.65,
	}, h.canon)
	FM.step(h, dt)
end

local comboCache = {}
-- 칼 콤보(1~n 동작). ids 예: { "W:BLADE_SLASH_R" }
function FM.combo(key: string, ids: { string })
	local c = comboCache[key]
	if not c then
		c = CM.CreateCombatCombo("SWORD", ids)
		comboCache[key] = c
	end
	return c
end

function FM.sample(combo, elapsed: number, out)
	CM.SampleCombatCombo(combo, elapsed, out)
end

function FM.destroy(h)
	pcall(function()
		h.ctl.Destroy(false)
	end)
end

return FM
