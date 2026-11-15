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
local R6_NAMES = { "RootJoint", "Neck", "Left Shoulder", "Right Shoulder", "Left Hip", "Right Hip" }

function FM.new(model: Model, followAnimator: boolean)
	local joints = {}
	local hum = model:FindFirstChildOfClass("Humanoid")
	local r6 = hum ~= nil and hum.RigType == Enum.HumanoidRigType.R6
	-- 마력숲과 같은 방식: 새 R15 아바타(Avatar Joint Upgrade)는 AnimationConstraint 를 쓰므로 Motor6D 보다 우선한다.
	local want = {}
	for _, n in (if r6 then R6_NAMES else R15_NAMES) do want[n] = true end
	for _, d in model:GetDescendants() do
		if want[d.Name] then
			local connected = (d:IsA("AnimationConstraint") and d.Attachment0 ~= nil and d.Attachment1 ~= nil)
				or (d:IsA("Motor6D") and d.Part0 ~= nil and d.Part1 ~= nil)
			if connected and (not joints[d.Name] or d:IsA("AnimationConstraint")) then
				joints[d.Name] = d
			end
		end
	end
	local ctl = CM.BindJointPose(joints, { followAnimator = followAnimator, response = 18 })
	local nj = 0
	for _ in joints do nj += 1 end
	return { ctl = ctl, canon = {}, r15 = {}, model = model, r6 = r6, joints = joints, nj = nj, t0 = os.clock() }
end

-- R6(구형 아바타)는 팔다리가 한 덩어리라 어깨·엉덩이·목·허리만 쓴다. 관절 축이 돌아가 있어 C0 회전으로 맞춰 준다.
local function conj(joint: Motor6D, rot: CFrame): CFrame
	local c = joint.C0.Rotation
	return c:Inverse() * rot * c
end

local function mapR6(h, canon, rootRot)
	local out = h.r15
	table.clear(out)
	local J = h.joints
	local id = CFrame.identity
	if J.RootJoint then
		local r = (canon.Spine or id) * (canon.Chest or id)
		if rootRot then
			r = rootRot * r
		end
		out.RootJoint = conj(J.RootJoint, r)
	end
	if J.Neck and canon.Head then
		out.Neck = conj(J.Neck, canon.Head)
	end
	local pairs6 = { ["Left Shoulder"] = "UpperArmL", ["Right Shoulder"] = "UpperArmR", ["Left Hip"] = "ThighL", ["Right Hip"] = "ThighR" }
	for jn, cn in pairs6 do
		if J[jn] and canon[cn] then
			out[jn] = conj(J[jn], canon[cn])
		end
	end
end

-- canon(Spine·Chest·UpperArmR… 공통 이름 포즈)를 R15 관절 이름으로 옮겨 적용한다. rootRot: 몸 전체 회전(회전베기용).
function FM.step(h, dt: number, rootRot: CFrame?)
	if h.r6 then
		mapR6(h, h.canon, rootRot)
	else
		CM.MapCombatPoseToR15(h.canon, h.r15)
		if rootRot then
			h.r15.Root = rootRot
		end
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
