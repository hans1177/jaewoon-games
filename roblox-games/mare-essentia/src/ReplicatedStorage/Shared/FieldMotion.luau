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
	local ctl = CM.BindJointPose(joints, { followAnimator = followAnimator, response = 11 })
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

-- 관절 회전량을 키운다(폰 화면에서도 큼직하게 읽히도록). gain 1 = 원본.
function FM.scale(canon, gain: number)
	for k, cf in canon do
		if typeof(cf) == "CFrame" then
			local axis, ang = cf:ToAxisAngle()
			if ang > 1e-4 and ang == ang then
				canon[k] = CFrame.fromAxisAngle(axis, math.clamp(ang * gain, -2.4, 2.4))
			end
		end
	end
end

-- 사람형 적·동료: 상태(IDLE/RUN/ANTICIPATION/ATTACK/RECOVERY/HIT)와 위상(0~1)으로 자세를 만든다.
function FM.actor(h, state: string, phase: number, dt: number, isBoss: boolean?, gain: number?, rootRot: CFrame?)
	table.clear(h.canon)
	CM.SampleProceduralActorMotion(state, phase, {
		bodyPlan = "BIPED",
		actorClass = if isBoss then "BOSS" else "ENEMY",
		availableJoints = AVAILABLE,
		secondary = 0.65,
	}, h.canon)
	-- 전투 AI와 공격 타이밍은 건드리지 않고 직업/괴물 체형에 맞는 관절 표정만 합성한다.
	local role = h.model:GetAttribute("MotionRole")
	local A = CFrame.Angles
	local id = CFrame.identity
	local function bend(joint, x, y, z)
		h.canon[joint] = (h.canon[joint] or id) * A(x, y, z)
	end
	local attack = state == "ANTICIPATION" or state == "ATTACK"
	local pulse = math.sin(math.clamp(phase, 0, 1) * math.pi)
	if role == "grunt" then
		-- 잡졸: 공격 직전 한쪽 어깨를 높이 들어 위협하고 피격 시 움츠린다.
		if state == "ANTICIPATION" then
			bend("UpperArmR", -0.45 - pulse * 0.65, 0, -0.20)
			bend("Chest", -0.12 * pulse, 0.16 * pulse, 0)
		elseif state == "HIT" then
			bend("Head", 0.24 * pulse, 0, 0.10 * pulse)
		end
	elseif role == "shield" then
		-- 방패병: 왼팔을 몸 앞에 세우고 오른팔은 반격 준비.
		if state == "IDLE" or state == "RUN" or attack then
			bend("UpperArmL", -0.58, 0, -0.26)
			bend("ForearmL", -0.70, 0, 0)
			bend("UpperArmR", -0.22, 0, 0.08)
			bend("Chest", 0.09, 0, 0)
		elseif state == "HIT" then
			bend("UpperArmL", -0.55 * pulse, 0, -0.23 * pulse)
			bend("Chest", -0.19 * pulse, 0, 0)
		end
	elseif role == "archer" then
		-- 사수: 예고 단계에 두 손으로 조준하고 타격 후 팔을 낮춘다.
		if attack then
			bend("UpperArmL", -0.72 - pulse * 0.24, 0, -0.14)
			bend("UpperArmR", -0.92 - pulse * 0.16, 0, 0.17)
			bend("ForearmL", -0.38, 0, 0)
			bend("ForearmR", -0.55, 0, 0)
			bend("Head", -0.09, 0, 0)
		elseif state == "RUN" and h.model:GetAttribute("MotionRetreat") then
			-- 사수 뒷걸음: 이동 규칙은 유지하고 어깨로 상체를 방어한다.
			bend("Chest", -0.18, 0, 0)
			bend("UpperArmL", -0.58, 0, -0.18)
			bend("UpperArmR", -0.30, 0, 0.15)
		elseif state == "HIT" then
			bend("Head", 0.18 * pulse, 0.17 * pulse, 0)
		end
	elseif role == "charger" then
		-- 돌진병: 어깨를 말고 주먹을 낮춰 무게감 있는 공격 예고.
		if attack then
			bend("Chest", 0.28 * pulse, 0, 0)
			bend("UpperArmL", 0.28, 0, 0.22)
			bend("UpperArmR", 0.28, 0, -0.22)
			bend("ForearmL", -0.42, 0, 0)
			bend("ForearmR", -0.42, 0, 0)
		elseif state == "RECOVERY" then
			bend("Chest", -0.20 * (1 - phase), 0, 0)
			bend("Head", 0.18 * (1 - phase), 0, 0)
		end
	elseif role == "boss" then
		-- 두목: 큰 준비 자세와 비대칭 내려치기, 피격 뒤 고개 숙이기.
		if attack then
			bend("UpperArmR", -0.44 - pulse * 0.28, 0, -0.12)
			bend("UpperArmL", -0.12, 0, 0.25)
			bend("Chest", 0.14 * pulse, -0.12 * pulse, 0)
		elseif state == "HIT" or state == "RECOVERY" then
			bend("Head", 0.18 * (1 - math.clamp(phase, 0, 1)), 0, 0)
		end
	elseif role == "ally-ranged" or role == "ally-melee" then
		-- 회복·보호막·격려는 무기 공격과 분리해 실제 지원 행동으로 보이게 한다.
		local skill = h.model:GetAttribute("MotionSkill")
		if state == "INTERACT" and (skill == "heal" or skill == "armor" or skill == "rally" or skill == "luck") then
			local lift = math.sin(math.clamp(phase, 0, 1) * math.pi)
			if skill == "heal" then
				bend("UpperArmL", -1.25 * lift, 0, -0.28)
				bend("UpperArmR", -1.25 * lift, 0, 0.28)
				bend("Head", 0.16 * lift, 0, 0)
			elseif skill == "armor" then
				bend("UpperArmL", -1.1 * lift, 0, -0.52)
				bend("UpperArmR", -1.1 * lift, 0, 0.52)
				bend("ForearmL", -0.55 * lift, 0, 0)
				bend("ForearmR", -0.55 * lift, 0, 0)
			elseif skill == "rally" then
				bend("UpperArmR", -2.0 * lift, 0, -0.18)
				bend("Chest", -0.14 * lift, 0, 0)
			else
				bend("UpperArmL", -0.9 * lift, 0, -0.18)
				bend("UpperArmR", -0.5 * lift, 0, 0.2)
			end
		elseif role == "ally-ranged" then
			-- 원거리 동료: 걷는 중에도 사격 준비 팔을 낮게 유지한다.
		if state == "IDLE" or attack then
			bend("UpperArmL", -0.32, 0, -0.10)
			bend("UpperArmR", -0.52, 0, 0.10)
			bend("ForearmR", -0.32, 0, 0)
		end
		if role == "ally-melee" and (state == "IDLE" or attack) then
			bend("UpperArmL", -0.28, 0, -0.14)
			bend("UpperArmR", -0.35, 0, 0.12)
		end
	end
	-- 폰 화면에서도 읽히도록 관절 회전량을 키운다 (gain 1 = 원본)
	if gain and gain ~= 1 then
		for k, cf in h.canon do
			if typeof(cf) == "CFrame" then
				local axis, ang = cf:ToAxisAngle()
				if ang > 1e-4 and ang == ang then
					h.canon[k] = CFrame.fromAxisAngle(axis, math.clamp(ang * gain, -2.4, 2.4))
				end
			end
		end
	end
	FM.step(h, dt, rootRot)
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

-- 무기(CommonMotion 프로필 id)의 n번째 동작. 맨손(motion=nil)은 주먹·발차기 연타. 만들 수 없으면 nil.
local UNARMED_CHAIN = { "U:JAB_LEFT", "U:CROSS_RIGHT", "U:FRONT_KICK_L" }
function FM.weaponCombo(motion: string?, idx: number)
	local key = "wpn:" .. tostring(motion) .. ":" .. idx
	local c = comboCache[key]
	if c == nil then
		local ok, res = pcall(function()
			if motion == nil then
				return CM.CreateCombatCombo("UNARMED", { UNARMED_CHAIN[(idx - 1) % #UNARMED_CHAIN + 1] })
			end
			local prof = CM.DescribeWeaponProfiles()[motion]
			local route = prof and prof.route
			if not route then
				return nil
			end
			return CM.CreateCombatCombo(motion, { route[(idx - 1) % #route + 1] })
		end)
		c = if ok and res then res else false
		comboCache[key] = c
	end
	return c or nil
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
