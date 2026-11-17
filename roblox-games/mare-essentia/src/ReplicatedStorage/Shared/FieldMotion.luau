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
			-- 기존 공용 모션과 동일하게 실제 Part0/Part1 연결을 검사한다. Avatar Joint Upgrade의 AnimationConstraint는 Attachment0/1 값만으로 판정하면 누락된다.
			local connected = (d:IsA("AnimationConstraint") or d:IsA("Motor6D"))
				and d.Part0 ~= nil and d.Part1 ~= nil
			if connected and (not joints[d.Name] or d:IsA("AnimationConstraint")) then
				joints[d.Name] = d
			end
		end
	end
	-- [R15 관절 반응] 손과 팔은 타격을 따라가고 무게중심과 발은 조금 느리게 반응한다.
	local ctl = CM.BindJointPose(joints, { followAnimator = followAnimator, response = 12,
		responseByJoint = {
			Waist = 15, Neck = 17, LeftShoulder = 22, RightShoulder = 22,
			LeftElbow = 25, RightElbow = 25, LeftWrist = 28, RightWrist = 28,
			LeftHip = 13, RightHip = 13, LeftKnee = 15, RightKnee = 15,
			LeftAnkle = 16, RightAnkle = 16,
		},
	})
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
function FM.step(h, dt: number, rootRot: CFrame?, responseScale: number?)
	if h.r6 then
		mapR6(h, h.canon, rootRot)
	else
		CM.MapCombatPoseToR15(h.canon, h.r15)
		if rootRot then
			h.r15.Root = rootRot
		end
	end
	h.ctl.Step(h.r15, dt, responseScale)
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
function FM.actor(h, state: string, phase: number, dt: number, isBoss: boolean?, gain: number?, rootRot: CFrame?, retreat: boolean?, skill: string?, weaponMotion: string?, moveEffort: number?, strafe: number?, attackAdvance: number?)
	-- [상태 전이] 이전 프레임의 실제 관절 자세를 보존해 급작스러운 팔·다리 교체를 방지한다.
	if h.lastActorState and h.lastActorState ~= state then
		h.transitionPose = table.clone(h.canon)
		h.transitionElapsed = 0
	end
	h.lastActorState = state
	table.clear(h.canon)
	CM.SampleProceduralActorMotion(if state == "EVADE" then "RUN"
		elseif state == "KNOCKDOWN" or state == "GETUP" then "HIT"
		elseif state == "BLOCK" or state == "PARRY" then "ANTICIPATION" else state, phase, {
		bodyPlan = "BIPED",
		actorClass = if isBoss then "BOSS" elseif h.model:GetAttribute("MotionRole") == "ally-ranged" or h.model:GetAttribute("MotionRole") == "ally-melee" then "NPC" else "ENEMY",
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
	-- [실전 적 방어·회복 전신] 새 리그/도형이 아닌 기존 R15 Motor6D와 AnimationConstraint를 굽힌다.
	-- 바닥에서 무릎을 접고 손으로 지탱했다가 좌우로 올라오는 동작, 병종별 무기 받아치기/방패 버티기.
	local fallSide = if ((h.model:GetAttribute("FieldHitVariant") or 1) % 2 == 0) then -1 else 1
	if state == "KNOCKDOWN" then
		local collapse = math.sin(math.clamp(phase * 1.8, 0, 1) * math.pi * 0.5)
		rootRot = (rootRot or id) * A(-1.20 * collapse, 0, 0.28 * fallSide * collapse)
		bend("Spine", -0.25 * collapse, 0, 0.12 * fallSide * collapse)
		bend("Chest", -0.32 * collapse, 0.06 * fallSide, 0)
		bend("Head", 0.38 * collapse, -0.15 * fallSide, 0)
		bend("UpperArmL", -0.70 * collapse, 0, -0.50 * collapse)
		bend("UpperArmR", -1.15 * collapse, 0, 0.35 * collapse)
		bend("ForearmL", -0.80 * collapse, 0, 0)
		bend("ForearmR", -0.65 * collapse, 0, 0)
		bend("ThighL", 0.72 * collapse, 0, -0.12 * collapse)
		bend("ThighR", 0.48 * collapse, 0, 0.18 * collapse)
		bend("ShinL", -1.10 * collapse, 0, 0)
		bend("ShinR", -0.85 * collapse, 0, 0)
		-- [쓰러짐 관성] 몸을 비스듬히 무너뜨리면서 한 손과 양발로 지면을 받는다.
		bend("FootL", 0.24 * collapse, 0, -0.08 * fallSide * collapse)
		bend("FootR", -0.19 * collapse, 0, 0.08 * fallSide * collapse)
		bend("HandL", -0.28 * collapse, 0, -0.11 * collapse)
	elseif state == "GETUP" then
		local onGround = (1 - math.clamp(phase, 0, 1)) ^ 1.45
		local brace = math.sin(math.clamp(phase, 0, 1) * math.pi)
		rootRot = (rootRot or id) * A(-1.20 * onGround - 0.18 * brace, 0, 0.28 * fallSide * onGround)
		bend("Spine", -0.25 * onGround + 0.33 * brace, 0, 0.09 * fallSide * brace)
		bend("Chest", -0.32 * onGround + 0.24 * brace, 0, 0)
		bend("Head", 0.38 * onGround - 0.20 * brace, 0, 0)
		bend("UpperArmL", -0.70 * onGround - 0.45 * brace, 0, -0.50 * onGround)
		bend("UpperArmR", -1.15 * onGround - 0.20 * brace, 0, 0.35 * onGround)
		bend("ForearmL", -0.80 * onGround - 0.38 * brace, 0, 0)
		bend("ForearmR", -0.65 * onGround - 0.22 * brace, 0, 0)
		bend("ThighL", 0.72 * onGround + 0.35 * brace, 0, -0.12 * onGround)
		bend("ThighR", 0.48 * onGround - 0.18 * brace, 0, 0.18 * onGround)
		bend("ShinL", -1.10 * onGround - 0.42 * brace, 0, 0)
		bend("ShinR", -0.85 * onGround - 0.22 * brace, 0, 0)
		bend("FootL", -0.15 * brace, 0, 0)
		-- [기상 3단] 손으로 바닥을 밀고, 한쪽 무릎을 세운 뒤 양발의 균형을 되찾는다.
		bend("HandL", -0.26 * onGround + 0.20 * brace, 0, 0)
		bend("FootR", 0.20 * onGround - 0.18 * brace, 0, 0)
		bend("ShinR", -0.34 * brace, 0, 0)
	elseif state == "BLOCK" then
		-- 방패병: 왼손 방패를 눈높이로 세우고 양발을 벌려 실제 가드 판정을 표현.
		bend("Spine", 0.19 + 0.08 * pulse, 0, 0)
		bend("Chest", 0.14, 0.10 * fallSide, 0)
		bend("Head", -0.14, 0, 0)
		bend("UpperArmL", -1.36, -0.12, -0.45)
		bend("ForearmL", -0.83, 0, 0)
		bend("HandL", -0.16, 0, 0)
		bend("UpperArmR", -0.42, 0.10, 0.20)
		bend("ThighL", 0.32, 0, -0.15)
		bend("ThighR", 0.25, 0, 0.16)
		bend("ShinL", -0.52, 0, 0)
		bend("ShinR", -0.44, 0, 0)
	elseif state == "PARRY" then
		-- 검병/돌격병/두목: 오른손 무기를 비스듬히 세운 뒤 허리와 축발로 흘려낸다.
		local deflect = math.sin(math.clamp(phase, 0, 1) * math.pi)
		bend("Spine", -0.09 * deflect, 0.28 * fallSide * deflect, 0)
		bend("Chest", -0.17 * deflect, 0.35 * fallSide * deflect, 0.17 * fallSide * deflect)
		bend("Head", -0.10 * deflect, -0.22 * fallSide * deflect, 0)
		bend("UpperArmR", -1.44 * deflect, 0, 0.49 * deflect)
		bend("ForearmR", -0.88 * deflect, 0, 0)
		bend("HandR", -0.35 * deflect, 0, 0)
		bend("UpperArmL", -0.42 * deflect, 0, -0.18 * deflect)
		bend("ThighL", 0.21 * deflect, 0, -0.10 * deflect)
		bend("ThighR", -0.12 * deflect, 0, 0.09 * deflect)
		bend("FootL", -0.18 * deflect, 0, 0)
	elseif state == "HIT" then
		-- 3종 피격: 가슴 젖힘/옆구리 접힘/어깨 충격. 동일 연타가 반복 제스처처럼 보이지 않게 한다.
		local hitStyle = h.model:GetAttribute("FieldHitVariant") or 1
		local recoil = math.sin(math.clamp(phase, 0, 1) * math.pi)
		bend("Chest", (if hitStyle == 2 then -0.34 else 0.36) * recoil, 0.16 * fallSide * recoil, (if hitStyle == 3 then 0.34 else -0.20) * recoil)
		bend("UpperArmR", -0.42 * recoil, 0, 0.32 * recoil)
		bend("UpperArmL", -0.21 * recoil, 0, -0.23 * recoil)
		bend("ThighL", 0.18 * recoil, 0, 0)
		bend("Head", 0.23 * recoil, -0.14 * fallSide * recoil, 0)
		-- [피격 충격 전달] 상체에서 골반→발로 충격이 이어지고 손이 옆구리를 감싼다.
		bend("Spine", 0.13 * recoil, -0.17 * fallSide * recoil, 0)
		bend("ForearmL", -0.42 * recoil, 0, 0)
		bend("ShinR", -0.28 * recoil, 0, 0)
		bend("FootR", 0.20 * recoil, 0, 0.09 * fallSide * recoil)
	end
	-- [공통 R15 모션] 체형·성격에 따라 관절의 무게중심과 보행·시선을 조절한다.
	local style = h.model:GetAttribute("MotionStyle") or "civilian"
	local persona = h.model:GetAttribute("MotionPersonality") or 1
	-- [지면 접지] 실제 이동속도를 누적해 출발 시 보폭이 커지고 정지 시 발이 자연스럽게 모이도록 한다.
	-- 루트 이동은 FieldScene 원래 AI가 소유하며 여기서는 관절 자세만 변경한다.
	local targetEffort = if state == "RUN" then math.clamp(moveEffort or 1, 0, 1.25) else 0
	local oldEffort = h.groundEffort or targetEffort
	h.groundEffort = oldEffort + (targetEffort - oldEffort)
		* (1 - math.exp(-(if targetEffort > oldEffort then 8 else 12) * math.clamp(dt, 0, 0.1)))
	-- [몸 방향] 회전이 먼저 끝나도 고개→상체→발의 미세 반작용이 남아 급회전 느낌을 줄인다.
	local facing = h.model:GetPivot().LookVector
	local previous = h.lastFacing
	local turn = if previous then math.atan2(previous:Cross(facing).Y, previous:Dot(facing)) else 0
	h.lastFacing = facing
	local smooth = 1 - math.exp(-7 * math.clamp(dt, 0, 0.12))
	h.turnLag = (h.turnLag or 0) + (math.clamp(turn * 2.2, -0.4, 0.4) - (h.turnLag or 0)) * smooth
	if state == "IDLE" then
		local lean = if style == "heavy" then -0.07 elseif style == "scholar" then 0.07 else 0
		bend("Chest", lean + 0.025 * math.sin(phase * math.pi * 2 + persona), 0, 0)
		bend("Head", 0, 0.07 * math.sin(phase * math.pi * 2 + persona), 0)
		-- [생체 대기] 매 프레임 같은 팔 흔들기가 아니라 성격별 짧은 시선·손목·체중 이동.
		local t = os.clock() - h.t0 + persona * 3.4
		local breathe = math.sin(t * (if style == "heavy" then 1.1 else 1.65))
		local shift = math.sin(t * 0.43 + persona)
		local stance = if style == "heavy" then 1.12 elseif style == "nimble" then 0.88 else 1
		bend("Chest", breathe * 0.018, shift * 0.045, shift * 0.022)
		-- [적 경계 동작] 시선을 천천히 옮기고 골반과 반대 방향으로 어깨를 돌려 정지 인형 느낌을 줄인다.
		if role ~= "ally-melee" and role ~= "ally-ranged" then
			bend("Head", 0.025 * breathe, math.sin(t * 0.47 + persona) * 0.13, -shift * 0.025)
			bend("Spine", 0, -shift * 0.045, 0)
		end
		-- [지상 모션] 가만히 선 몬스터도 어깨·양다리 관절이 실제로 움직이도록
		-- 기존 호흡·체중 이동에 낮은 전투 대기 자세를 더한다. 이동·공격·피해 판정은 불변.
		bend("ThighL", (-0.075 - shift * 0.028) * stance, 0, -0.032 * shift)
		bend("ThighR", (0.075 + shift * 0.028) * stance, 0, 0.032 * shift)
		bend("UpperArmL", (-0.13 - 0.025 * breathe) * stance, 0, -0.035)
		bend("UpperArmR", (-0.13 + 0.025 * breathe) * stance, 0, 0.035)
		-- 달리다가 멈출 때 마지막 반 걸음에 체중을 싣고 뒤꿈치를 내린다.
		local settle = math.clamp(h.groundEffort or 0, 0, 1)
		bend("ShinL", -0.11 * settle, 0, 0)
		bend("ShinR", -0.11 * settle, 0, 0)
		bend("FootL", 0.16 * settle, 0, -0.035 * shift)
		bend("FootR", 0.16 * settle, 0, 0.035 * shift)
	elseif state == "RUN" then
		-- [관절 보행] 이동 거리 → 발 디딤 위상, 실제 속도 → 보폭 크기. 후퇴는 발 순서를 반전한다.
		local stride = if style == "heavy" then 0.78 elseif style == "nimble" then 1.08 elseif style == "scholar" then 0.86 else 1
		local effort = math.clamp(moveEffort or 1, 0.18, 1.25)
		effort = math.clamp((h.groundEffort or effort), 0.18, 1.25)
		local plant = math.sin(phase * math.pi * 2) * (if retreat then -1 else 1)
		local heel = math.cos(phase * math.pi * 2)
		local liftL, liftR = math.max(0, -plant), math.max(0, plant)
		local side = math.clamp(strafe or 0, -1, 1)
		-- [측면 관성] 발 디딤과 몸 기울기만 감속 보간한다. 실제 이동 속도는 기존 AI 소유.
		h.sideEffort = (h.sideEffort or side) + (side - (h.sideEffort or side)) * (1 - math.exp(-10 * math.clamp(dt, 0, 0.1)))
		side = h.sideEffort
		local sway = (if style == "heavy" then 0.055 else 0.08) * effort
		bend("Chest", -0.11 * effort, -plant * 0.11 * effort - side * 0.09, plant * sway + side * 0.07)
		bend("Spine", -0.05 * effort, plant * 0.085 * effort, -plant * sway * 0.5 - side * 0.06)
		bend("Head", 0.06 * effort, plant * 0.025 + side * 0.035, -side * 0.025)
		bend("ThighL", plant * 0.60 * stride * effort, 0, -0.035 - side * 0.12 * effort)
		bend("ThighR", -plant * 0.60 * stride * effort, 0, 0.035 - side * 0.12 * effort)
		bend("ShinL", -liftL * 0.52 * stride * effort, 0, 0)
		bend("ShinR", -liftR * 0.52 * stride * effort, 0, 0)
		-- 체중이 실리는 발은 뒤꿈치부터 구르고, 떠 있는 발은 발끝을 들어 다음 착지를 준비한다.
		bend("FootL", (-plant * 0.20 + liftL * 0.20 + heel * 0.045) * stride * effort, -side * 0.08, 0)
		bend("FootR", (plant * 0.20 + liftR * 0.20 - heel * 0.045) * stride * effort, -side * 0.08, 0)
		bend("UpperArmL", -plant * 0.38 * stride * effort, 0, -0.045 - side * 0.04)
		bend("UpperArmR", plant * 0.38 * stride * effort, 0, 0.045 - side * 0.04)
		bend("ForearmL", -0.17 - liftL * 0.25 * effort, 0, 0)
		bend("ForearmR", -0.17 - liftR * 0.25 * effort, 0, 0)
		-- [적 보행 접지] 발이 땅을 디딜 때 무릎을 굽히고 뒤꿈치가 구르며, 골반이 어깨보다 반 박자 늦게 따라간다.
		-- 이동 거리·속도는 FieldScene의 기존 AI를 사용하고 이 값은 관절에만 적용한다.
		if role ~= "ally-melee" and role ~= "ally-ranged" then
			local support = math.max(0, math.cos(phase * math.pi * 4)) * effort
			local weight = if role == "boss" or role == "charger" then 0.75 else 1
			bend("Spine", -0.055 * effort, -plant * 0.075 * weight, side * 0.045)
			bend("ShinL", -support * 0.085 * weight, 0, 0)
			bend("ShinR", -support * 0.085 * weight, 0, 0)
			bend("FootL", -plant * 0.095 * weight - support * 0.055, 0, 0)
			bend("FootR", plant * 0.095 * weight - support * 0.055, 0, 0)
			bend("Chest", 0, plant * 0.045 * weight, side * 0.035)
		end
		-- [전투 동료 달리기] 실제 보폭과 동일한 위상으로 질주·뒤꿈치 밀기·팔꿈치 역스윙을 크게 표현.
		-- 루트 이동속도/공격/스킬 판정은 FieldScene 원본 그대로. 허리와 발목은 부드럽게 회수한다.
		if role == "ally-melee" or role == "ally-ranged" then
			local sprint = math.clamp(effort, 0, 1.25)
			local drive = if style == "heavy" then 0.75 else 1
			bend("Spine", -0.15 * drive * sprint, plant * 0.075 * sprint, 0)
			bend("Chest", -0.10 * drive * sprint, -plant * 0.09 * sprint, plant * 0.055 * sprint)
			bend("ThighL", plant * 0.24 * drive * sprint, 0, 0)
			bend("ThighR", -plant * 0.24 * drive * sprint, 0, 0)
			bend("ShinL", -liftL * 0.22 * sprint, 0, 0)
			bend("ShinR", -liftR * 0.22 * sprint, 0, 0)
			bend("UpperArmL", -plant * 0.26 * sprint, 0, 0)
			bend("UpperArmR", plant * 0.26 * sprint, 0, 0)
			bend("ForearmL", -0.14 * sprint, 0, 0)
			bend("ForearmR", -0.14 * sprint, 0, 0)
			bend("FootL", liftL * 0.12 * sprint, 0, 0)
			bend("FootR", liftR * 0.12 * sprint, 0, 0)
			rootRot = (rootRot or id) * CFrame.new(0, (1 - math.abs(plant)) * 0.09 * sprint, 0)
		end
	elseif state == "EVADE" then
		-- [정예 회피] 기존 R15 달리기 포즈에 측면 체중 이동과 가드·발 디딤을 더한다.
		local side = if (h.model:GetAttribute("MotionVariant") or 1) % 2 == 0 then -1 else 1
		local slip = math.sin(math.clamp(phase, 0, 1) * math.pi)
		bend("Spine", -0.19 * slip, 0.22 * side * slip, 0.16 * side * slip)
		bend("Chest", -0.24 * slip, -0.19 * side * slip, 0.20 * side * slip)
		bend("Head", 0, -0.16 * side * slip, 0)
		bend("UpperArmL", -0.55 * slip, 0, -0.20 * slip)
		bend("UpperArmR", -0.55 * slip, 0, 0.20 * slip)
		bend("ThighL", 0.30 * slip, 0, -0.13 * side * slip)
		bend("ThighR", -0.25 * slip, 0, 0.13 * side * slip)
		bend("ShinL", -0.34 * slip, 0, 0)
		bend("ShinR", -0.20 * slip, 0, 0)
		-- 미끄러지듯 측면으로 움직이는 대신 축발 발목을 세우고 회피발을 들어 딛는다.
		bend("FootL", 0.24 * slip, -0.14 * side * slip, -0.06 * side * slip)
		bend("FootR", -0.18 * slip, 0.15 * side * slip, 0.08 * side * slip)
		-- [병종별 접지] 기존 정예 회피 이동·확률·무적 판정과 무관한 고유 R15 동작.
		if role == "archer" then
			-- 사수는 고개를 표적에 남겨 두고 무릎을 낮춰 뒤로 측보한다.
			bend("Chest", 0.26 * slip, -0.18 * side * slip, 0)
			bend("Head", -0.08 * slip, 0.20 * side * slip, 0)
			bend("UpperArmL", -0.35 * slip, 0, -0.17 * slip)
			bend("ForearmR", -0.28 * slip, 0, 0)
			bend("ShinL", -0.22 * slip, 0, 0)
		elseif role == "shield" then
			-- 방패병은 왼손 방패를 앞세워 몸을 옆으로 틀고 축발을 지탱한다.
			bend("UpperArmL", -0.72 * slip, 0, -0.31 * slip)
			bend("ForearmL", -0.48 * slip, 0, 0)
			bend("Chest", 0.18 * slip, 0.10 * side * slip, 0)
			bend("ThighR", -0.24 * slip, 0, 0.10 * slip)
			bend("FootR", 0.18 * slip, 0, 0)
		elseif role == "charger" then
			-- 돌진병은 체중을 뒤로 뺐다가 몸을 앞으로 던져 다음 공격 자세를 준비한다.
			bend("Spine", -0.29 * slip, 0.08 * side * slip, 0)
			bend("Chest", -0.34 * slip, 0.12 * side * slip, 0)
			bend("FootR", 0.29 * slip, 0, -0.06 * side * slip)
		elseif role == "thrower" then
			-- 투척병은 폭탄을 든 손을 높이 두고 어깨·머리를 낮춘다.
			bend("Chest", 0.33 * slip, -0.08 * side * slip, 0)
			bend("Head", -0.22 * slip, 0, 0)
			bend("UpperArmR", -0.64 * slip, 0, 0.19 * slip)
			bend("ShinR", -0.21 * slip, 0, 0)
		elseif role == "boss" then
			-- 두목은 얇은 발 미끄러짐 대신 느린 무게중심 이동과 넓은 축발.
			bend("Spine", -0.11 * slip, 0.24 * side * slip, 0)
			bend("ThighL", -0.29 * slip, 0, -0.12 * side * slip)
			bend("ShinL", -0.33 * slip, 0, 0)
			bend("FootL", 0.28 * slip, 0, 0)
		elseif role == "grunt" then
			-- 검병은 상체를 틀고 가벼운 교차 디딤으로 빠져나간다.
			bend("Chest", -0.14 * slip, 0.24 * side * slip, 0)
			bend("FootR", -0.17 * slip, 0, 0.12 * side * slip)
		end
	elseif state == "HIT" then
		bend("Head", 0.1 * pulse, 0.1 * pulse * (if persona == 1 then -1 else 1), 0)
	end
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
			bend("ThighL", 0.13, 0, -0.08)
			bend("ThighR", 0.13, 0, 0.08)
			bend("ShinL", -0.20, 0, 0)
			bend("ShinR", -0.20, 0, 0)
		elseif state == "HIT" then
			bend("UpperArmL", -0.55 * pulse, 0, -0.23 * pulse)
			bend("Chest", -0.19 * pulse, 0, 0)
		end
	elseif role == "thrower" then
		-- [폭탄·투척 무기] 오른쪽 어깨 뒤로 무게 저장→앞발 고정→팔꿈치·손목 순차 이탈→자세 복귀.
		-- 폭발 판정과 실제 투사체 시각은 FieldScene 기존 경로가 소유한다.
		if state == "ANTICIPATION" then
			local load = math.sin(math.clamp(phase, 0, 1) * math.pi * 0.5)
			bend("UpperArmR", -1.30 * load, 0.24 * load, 0.48 * load)
			bend("ForearmR", -0.80 * load, 0, 0)
			bend("HandR", -0.24 * load, 0, 0)
			bend("UpperArmL", -0.30 * load, 0, -0.22 * load)
			bend("Chest", 0.20 * load, -0.45 * load, 0)
			bend("Spine", 0.12 * load, -0.18 * load, 0)
			bend("ThighR", 0.28 * load, 0, 0)
			bend("ShinR", -0.25 * load, 0, 0)
			bend("FootR", 0.16 * load, 0, 0)
		elseif state == "ATTACK" then
			local release = math.sin(math.clamp((phase - 0.25) / 0.35, 0, 1) * math.pi)
			bend("UpperArmR", -1.75 * release, -0.18 * release, -0.30 * release)
			bend("ForearmR", 0.94 * release, 0, 0)
			bend("HandR", 0.46 * release, 0, 0)
			bend("Chest", -0.35 * release, 0.49 * release, 0)
			bend("Spine", -0.22 * release, 0.22 * release, 0)
			bend("ThighL", -0.23 * release, 0, 0)
			bend("FootL", -0.18 * release, 0, 0)
		elseif state == "RECOVERY" then
			local settle = 1 - math.clamp(phase, 0, 1)
			bend("UpperArmR", -0.40 * settle, 0, 0)
			bend("ForearmR", -0.25 * settle, 0, 0)
			bend("Chest", -0.17 * settle, 0, 0)
			bend("ThighL", 0.10 * settle, 0, 0)
		end
	elseif role == "archer" then
		-- [화약 투척병] 승인된 실제 폭탄 모델을 오른손에서 던지는 독립 R15 모션.
		if attack and h.model:GetAttribute("EnemyWeaponId") == "bomb" then
			local throw = if state == "ANTICIPATION" then 1 - math.clamp(phase, 0, 1) * 0.25 else -0.5
			bend("UpperArmR", -1.25 * throw, 0, 0.35)
			bend("ForearmR", -0.55 * throw, 0, 0)
			bend("UpperArmL", -0.16, 0, -0.1)
			bend("Chest", 0.24 * throw, -0.24 * throw, 0)
		elseif attack then
			bend("UpperArmL", -0.72 - pulse * 0.24, 0, -0.14)
			bend("UpperArmR", -0.92 - pulse * 0.16, 0, 0.17)
			bend("ForearmL", -0.38, 0, 0)
			bend("ForearmR", -0.55, 0, 0)
			bend("Head", -0.09, 0, 0)
			bend("Spine", -0.06 * pulse, 0.14 * pulse, 0)
			bend("ForearmR", -0.15 * pulse, 0, 0)
		elseif state == "RUN" and retreat then
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
			bend("ThighL", 0.22 * pulse, 0, -0.07)
			bend("ThighR", 0.20 * pulse, 0, 0.07)
			bend("ShinL", -0.31 * pulse, 0, 0)
			bend("ShinR", -0.31 * pulse, 0, 0)
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
			bend("ThighL", 0.12 * pulse, 0, 0)
			bend("ThighR", 0.10 * pulse, 0, 0)
			bend("Spine", -0.10 * pulse, 0, 0)
		elseif state == "HIT" or state == "RECOVERY" then
			bend("Head", 0.18 * (1 - math.clamp(phase, 0, 1)), 0, 0)
		end
	elseif role == "ally-ranged" or role == "ally-melee" then
		-- 회복·보호막·격려는 무기 공격과 분리해 실제 지원 행동으로 보이게 한다.
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
		elseif state == "RECOVERY" then
			-- [동료 반동] 전투 수치와 무관한 무기 회수·호흡·시선 복귀.
			local settle = (1 - math.clamp(phase, 0, 1)) ^ 2
			bend("UpperArmR", -0.32 * settle, 0, 0.12 * settle)
			bend("ForearmR", -0.42 * settle, 0, 0)
			bend("Chest", 0.10 * settle, -0.10 * settle, 0)
			bend("Head", 0, 0.06 * settle, 0)
		elseif role == "ally-ranged" then
			-- 원거리 동료: 걷는 중에도 사격 준비 팔을 낮게 유지한다.
			if state == "IDLE" or attack then
				bend("UpperArmL", -0.32, 0, -0.10)
				bend("UpperArmR", -0.52, 0, 0.10)
				bend("ForearmR", -0.32, 0, 0)
			end
		elseif role == "ally-melee" then
			if state == "IDLE" or attack then
				bend("UpperArmL", -0.28, 0, -0.14)
				bend("UpperArmR", -0.35, 0, 0.12)
			end
		end
	end
	-- [몹 액션 다양화] 직군별 기존 공격 타이밍을 보존하면서 준비/타격/회복의 몸짓을 3가지로 차별화한다.
	local variant = h.model:GetAttribute("MotionVariant")
	if variant and (role == "grunt" or role == "archer" or role == "shield" or role == "charger" or role == "boss" or role == "thrower") then
		if state == "ANTICIPATION" or state == "ATTACK" then
			local sign = if state == "ANTICIPATION" then 1 else -1
			if variant == 1 then
				-- 검객/궁수 계열: 어깨를 틀고 목표를 조준한 뒤 날카롭게 뻗는다.
				bend("Chest", sign * 0.09 * pulse, 0.24 * pulse * sign, 0)
				bend("UpperArmR", -0.26 * pulse, 0.08, -0.14 * pulse)
				bend("Head", 0, -0.12 * pulse * sign, 0)
			elseif variant == 2 then
				-- 난투/근위 계열: 양팔을 모아 가드를 세우고 체중을 실어 때린다.
				bend("Chest", -0.18 * pulse * sign, 0, 0.08 * pulse)
				bend("UpperArmL", -0.34 * pulse, 0, -0.20)
				bend("UpperArmR", -0.40 * pulse, 0, 0.20)
			else
				-- 척후/습격 계열: 반대쪽 어깨를 내밀며 낮게 기습한다.
				bend("Chest", 0.17 * pulse * sign, -0.22 * pulse, -0.09 * pulse)
				bend("UpperArmL", -0.46 * pulse, 0, -0.13)
				bend("Head", -0.13 * pulse, 0.14 * pulse, 0)
			end
		elseif state == "RUN" and variant == 3 then
			bend("Chest", -0.10, -0.05, 0)
			bend("UpperArmL", -0.18, 0, -0.08)
		elseif state == "RECOVERY" and variant == 2 then
			bend("Chest", -0.16 * (1 - phase), 0, 0)
		end
	end
	-- [전투 몹 모션] 몹이 공격 준비·공격·회복 중에도 실제 양다리와 허리로 무게를 싣도록 한다.
	-- 기존 공용 R15 리그의 관절만 움직이고 공격 시각·사거리·피해량은 바꾸지 않는다.
	-- 이전에는 일부 몹이 공격 상태에서 팔 두 관절만 움직여 정적 모델처럼 보였다.
	if role == "grunt" or role == "archer" or role == "shield" or role == "charger" or role == "boss" or role == "thrower" then
		local p = math.clamp(phase, 0, 1)
		if state == "ANTICIPATION" then
			local set = math.sin(p * math.pi * 0.5)
			bend("ThighL", 0.10 + 0.12 * set, 0, -0.035)
			bend("ThighR", 0.09 + 0.08 * set, 0, 0.035)
			bend("Chest", 0.06 + 0.10 * set, 0, 0)
		elseif state == "ATTACK" then
			local release = math.sin(p * math.pi)
			bend("ThighL", -0.12 - 0.09 * release, 0, -0.04)
			bend("ThighR", 0.10 + 0.06 * release, 0, 0.04)
			bend("Chest", -0.10 - 0.10 * release, 0, 0)
		elseif state == "RECOVERY" then
			local settle = (1 - p) ^ 2
			bend("ThighL", 0.08 + 0.08 * settle, 0, 0)
			bend("ThighR", -0.08 - 0.07 * settle, 0, 0)
			bend("Chest", 0.07 + 0.07 * settle, 0, 0)
		elseif state == "HIT" then
			local recoil = math.sin(p * math.pi)
			bend("ThighL", 0.08 + recoil * 0.1, 0, 0)
			bend("ThighR", 0.08 + recoil * 0.07, 0, 0)
			bend("Chest", 0.08 + recoil * 0.13, 0, 0)
		end
	end
	-- [실제 타격 동기화] 원본 키프레임의 CONTACT를 기존 공격 판정 시각에 배치한다.
	-- 예고 동안 준비, 공격 동안 충격과 반동, 회복 동안 동일 원본 가드를 자연스럽게 풀어 준다.
	if (state == "ANTICIPATION" or state == "ATTACK" or state == "RECOVERY")
		and (weaponMotion ~= nil or role == "ally-melee" or role == "ally-ranged") then
		-- [적·동료 사격 일치] 매 발 실제 공격 구간에는 격발 자세를 사용한다.
		-- 연타 2·3단의 재장전/재조준은 주인공 숙련 시각 연계에만 적용한다.
		local rangedActor = weaponMotion == "BOW" or weaponMotion == "LONGBOW" or weaponMotion == "CROSSBOW"
			or weaponMotion == "PISTOL" or weaponMotion == "RIFLE"
		local actorBeat = if rangedActor then 1 else (h.weaponBeat or 1)
		local weaponCombo = FM.weaponCombo(weaponMotion, actorBeat) or FM.weaponCombo(weaponMotion, 1)
		if weaponCombo then
			local contact = math.clamp(weaponCombo.steps[1].contact / weaponCombo.duration, 0.1, 0.85)
			local motionProgress = if state == "ANTICIPATION" then math.clamp(phase, 0, 1) * contact
				elseif state == "ATTACK" then contact + math.clamp((phase - 0.25) / 0.35, 0, 1) * (1 - contact)
				else 1 + math.clamp(phase, 0, 1) * weaponCombo.fadeDuration / weaponCombo.duration
			FM.sample(weaponCombo, motionProgress * weaponCombo.duration, h.canon)
		end
	end
	-- [무기별 전신 모션] 원본 공격 자세에 예고→발사/충격→후속 반동→손목 회수·재장전을 동기화한다.
	-- 관절 전용: 기존 공격 이벤트/피해/쿨타임/사거리/저장값/루트 이동에는 관여하지 않는다.
	local grip = weaponMotion or ""
	if grip ~= "" and state ~= "INTERACT" and state ~= "HIT"
		and state ~= "KNOCKDOWN" and state ~= "GETUP" and state ~= "BLOCK" and state ~= "PARRY" then
		local t = math.clamp(phase, 0, 1)
		local attackT = math.clamp((t - 0.25) / 0.35, 0, 1)
		-- [공격 연결] 예비 자세는 공격 첫 프레임까지 유지하고, 충격 뒤 관성은 회복 첫 프레임까지 연결한다.
		local easeAttack = attackT * attackT * (3 - 2 * attackT)
		local prepare = if state == "ANTICIPATION" then math.sin(t * math.pi * 0.5)
			elseif state == "ATTACK" then 1 - easeAttack else 0
		local strike = if state == "ATTACK" then math.sin(attackT * math.pi) else 0
		local follow = if state == "ATTACK" then math.clamp((attackT - 0.42) / 0.58, 0, 1)
			elseif state == "RECOVERY" then (1 - t) * (1 - t) else 0
		-- [손목 회수] 회복 초입에서 갑자기 꺾이지 않도록 중간 구간에만 회수력을 준다.
		local returnGrip = if state == "RECOVERY" then math.sin(t * math.pi) else 0
		local hold = if state == "IDLE" or state == "RUN" then 1 else 0
		local gun = grip == "PISTOL" or grip == "RIFLE"
		local bow = grip == "BOW" or grip == "LONGBOW"
		local crossbow = grip == "CROSSBOW"
		local spear = grip == "SPEAR"
		local dagger = grip == "DAGGER"
		local axe = grip == "WAR_AXE"
		local blunt = grip == "MACE"
		local point = grip == "RAPIER"
		local curved = grip == "SABRE" or grip == "SCIMITAR" or grip == "KATANA"
		local pistol = grip == "PISTOL"
		if gun then
			-- [총] 권총은 한 손 조준/손목 반동, 장총은 왼손 지지/양어깨 견착/탄환 후 장전.
			local support = if pistol then 0.4 else 1
			bend("UpperArmR", -0.34 * hold - 0.64 * prepare + 0.44 * strike + 0.20 * follow - 0.30 * returnGrip, 0.05 * prepare, 0.10)
			bend("ForearmR", -0.30 * hold - 0.48 * prepare + 0.42 * strike + 0.30 * follow - 0.52 * returnGrip, 0, 0)
			bend("HandR", -0.15 * prepare + 0.36 * strike + 0.16 * follow - 0.22 * returnGrip, 0, -0.12 * strike)
			bend("UpperArmL", -0.12 * hold - support * (0.56 * prepare + 0.18 * strike + 0.42 * returnGrip), 0, -0.17 * support)
			bend("ForearmL", -support * (0.32 * prepare - 0.16 * strike + 0.58 * returnGrip), 0, 0)
			bend("Chest", -0.14 * prepare + 0.27 * strike + 0.16 * follow - 0.14 * returnGrip, -0.10 * prepare + 0.09 * follow, 0)
			bend("Spine", -0.12 * prepare + 0.18 * strike + 0.10 * follow, 0, 0)
			bend("Head", -0.12 * prepare + 0.11 * strike, 0.04 * follow, 0)
			bend("ThighR", 0.19 * prepare + 0.08 * strike, 0, 0.06 * strike)
			bend("FootR", -0.13 * strike + 0.08 * returnGrip, 0, 0)
		elseif bow then
			-- [활·장궁] 앞팔 고정→뒤팔로 시위 끝까지 당김→손가락 이탈→가슴 회전·팔 복귀.
			local draw = if grip == "LONGBOW" then 1.16 else 1
			bend("UpperArmL", -0.34 * hold - draw * (0.82 * prepare + 0.24 * strike), 0, -0.18 * prepare)
			bend("UpperArmR", -0.18 * hold - draw * 0.80 * prepare + 0.46 * strike + 0.24 * follow - 0.32 * returnGrip, 0.17 * prepare, 0.17)
			bend("ForearmR", -draw * 0.78 * prepare + 0.66 * strike + 0.15 * follow - 0.44 * returnGrip, 0, 0)
			bend("HandR", -0.28 * prepare + 0.42 * strike + 0.20 * follow, 0, 0)
			bend("HandL", -0.16 * prepare, 0, -0.09 * strike)
			bend("Chest", -0.12 * prepare + 0.13 * strike, 0.18 * prepare - 0.16 * follow, 0)
			bend("Head", -0.13 * prepare, -0.06 * prepare + 0.07 * follow, 0)
			bend("ThighL", 0.10 * prepare, 0, -0.08 * prepare)
		elseif crossbow then
			-- [R15 석궁병] 왼팔 전방 지지, 오른팔 방아쇠 견착, 시선/몸통은 볼트 발사선에 수평 정렬.
			-- 예고-격발-재장전 구간의 관절만 변경한다. AI 거리·피해·사격 횟수는 FieldScene 그대로.
			local brace = math.clamp(hold * 0.70 + prepare + 0.52 * strike, 0, 1)
			bend("UpperArmL", -0.58 * brace - 0.08 * strike + 0.38 * returnGrip, -0.08 * brace, -0.15)
			bend("UpperArmR", -0.55 * brace + 0.26 * strike + 0.27 * returnGrip, 0.06 * brace, 0.12)
			bend("ForearmL", -0.45 * brace + 0.35 * returnGrip, 0, 0)
			bend("ForearmR", -0.42 * brace + 0.34 * strike - 0.32 * returnGrip, 0, 0)
			bend("HandL", -0.10 * brace + 0.21 * returnGrip, 0, -0.04)
			bend("HandR", 0.18 * strike - 0.16 * returnGrip, 0, 0)
			bend("Chest", -0.10 * brace + 0.15 * strike + 0.12 * returnGrip, 0.06 * prepare, 0)
			bend("Head", -0.12 * brace + 0.08 * returnGrip, -0.03 * brace, 0)
			bend("Spine", 0.11 * returnGrip, 0, 0)
			bend("ThighL", 0.10 * brace - 0.04 * strike, 0, -0.035)
			bend("FootL", -0.08 * brace + 0.06 * strike, 0, 0)
		elseif spear then
			-- [창] 뒷다리에 힘을 저장→양손 축 정렬→앞발 내디딤 찌르기→창대 회수.
			bend("UpperArmL", -0.35 * hold - 0.59 * prepare - 0.26 * strike - 0.22 * returnGrip, 0, -0.13)
			bend("UpperArmR", -0.30 * hold - 0.57 * prepare - 0.79 * strike + 0.22 * follow - 0.29 * returnGrip, 0, 0.10)
			bend("ForearmL", -0.44 * prepare - 0.22 * strike + 0.38 * returnGrip, 0, 0)
			bend("ForearmR", -0.48 * prepare - 0.47 * strike + 0.30 * follow + 0.24 * returnGrip, 0, 0)
			bend("HandR", -0.14 * strike + 0.19 * returnGrip, 0, 0)
			bend("Chest", 0.17 * prepare - 0.38 * strike - 0.15 * follow + 0.13 * returnGrip, -0.14 * prepare + 0.10 * strike, 0)
			bend("Spine", 0.12 * prepare - 0.25 * strike, 0, 0)
			bend("ThighL", 0.27 * prepare - 0.37 * strike + 0.10 * returnGrip, 0, -0.06)
			bend("ShinL", -0.29 * strike, 0, 0)
			bend("FootL", -0.25 * strike + 0.12 * follow, 0, 0)
			bend("FootR", 0.15 * strike, 0, 0)
		elseif dagger then
			-- [단검] 짧은 역수·횡찌르기, 어깨 선행→허리 비틀기→빠른 손목 복귀.
			bend("UpperArmR", -0.38 * hold - 0.56 * prepare - 0.79 * strike + 0.22 * follow - 0.27 * returnGrip, 0.17, 0.17)
			bend("ForearmR", -0.42 * prepare - 0.66 * strike + 0.36 * follow - 0.29 * returnGrip, 0, 0)
			bend("HandR", 0.32 * prepare - 0.42 * strike + 0.13 * follow, 0, -0.18)
			bend("UpperArmL", -0.24 * hold - 0.36 * prepare + 0.10 * strike, 0, -0.18)
			bend("Chest", 0.19 * prepare - 0.27 * strike, -0.22 * prepare + 0.38 * strike - 0.22 * follow, 0)
			bend("Spine", 0, -0.17 * prepare + 0.26 * strike, 0)
			bend("ThighR", 0.23 * prepare - 0.27 * strike, 0, 0)
			bend("FootR", -0.20 * strike, 0, 0)
		elseif axe then
			-- [도끼] 양손 머리 위로 들어 올림→뒷발 축 고정→체중 실은 내려찍기→긴 후속 흔들림.
			bend("UpperArmR", -0.25 * hold - 1.09 * prepare - 0.46 * strike + 0.34 * follow - 0.35 * returnGrip, 0, -0.18)
			bend("UpperArmL", -0.19 * hold - 0.90 * prepare - 0.34 * strike + 0.30 * follow - 0.22 * returnGrip, 0, 0.17)
			bend("ForearmR", -0.65 * prepare + 0.58 * strike + 0.32 * follow - 0.52 * returnGrip, 0, 0)
			bend("ForearmL", -0.48 * prepare + 0.46 * strike + 0.24 * follow, 0, 0)
			bend("HandR", -0.20 * prepare + 0.42 * strike + 0.14 * follow, 0, 0)
			bend("Chest", 0.27 * prepare - 0.51 * strike - 0.22 * follow + 0.20 * returnGrip, 0.16 * prepare - 0.13 * strike, 0)
			bend("Spine", 0.19 * prepare - 0.36 * strike, 0, 0)
			bend("ThighL", 0.26 * prepare - 0.31 * strike, 0, -0.05)
			bend("ShinL", -0.27 * strike, 0, 0)
			bend("FootL", 0.21 * strike, 0, 0)
		elseif blunt then
			-- [철퇴·망치] 옆으로 크게 감아치기→골반 회전→충격 후 팔꿈치가 늦게 되돌아온다.
			bend("UpperArmR", -0.27 * hold - 0.72 * prepare - 0.48 * strike + 0.23 * follow - 0.35 * returnGrip, 0, -0.14)
			bend("UpperArmL", -0.23 * hold - 0.44 * prepare - 0.22 * strike, 0, 0.14)
			bend("ForearmR", -0.36 * prepare + 0.56 * strike + 0.43 * follow - 0.47 * returnGrip, 0, 0)
			bend("HandR", -0.16 * prepare + 0.30 * strike, 0, 0)
			bend("Chest", 0.12 * prepare - 0.43 * strike - 0.12 * follow + 0.14 * returnGrip, 0.28 * prepare - 0.38 * strike, 0)
			bend("Spine", -0.07 * strike, 0.18 * prepare - 0.24 * strike, 0)
			bend("ThighR", 0.20 * prepare - 0.19 * strike, 0, 0)
			bend("ShinR", -0.20 * strike, 0, 0)
			bend("FootR", 0.15 * strike, 0, 0)
		else
			-- [검] 레이피어는 곧은 찌르기, 곡도는 허리 회전 베기, 직검은 좌우 교차 베기.
			local slice = if point then 0.45 elseif curved then 1.18 else 0.92
			bend("UpperArmR", -0.31 * hold - 0.67 * prepare - (if point then 0.77 else 0.34) * strike + 0.23 * follow - 0.36 * returnGrip, 0, 0.08)
			bend("ForearmR", -0.32 * prepare - (if point then 0.49 else 0.33) * strike + 0.34 * follow - 0.30 * returnGrip, 0, 0)
			bend("HandR", -0.16 * prepare + 0.29 * strike, (if point then 0.02 else 0.19) * strike, 0.09 * slice)
			bend("UpperArmL", -0.21 * hold - 0.30 * prepare + 0.08 * strike, 0, -0.17)
			bend("Chest", 0.16 * prepare - (if point then 0.30 else 0.22) * strike, -0.28 * slice * prepare + 0.43 * slice * strike - 0.22 * slice * follow, 0)
			bend("Spine", 0.05 * prepare - 0.12 * strike, -0.15 * slice * prepare + 0.20 * slice * strike, 0)
			bend("Head", 0, 0.12 * slice * prepare - 0.09 * strike, 0)
			bend("ThighL", 0.14 * prepare - 0.18 * strike, 0, 0)
			bend("FootR", -0.18 * strike + 0.08 * follow, 0, 0)
		end
		-- [무기 질량] 무거운 도끼·망치는 상체 관성이 길고 활·권총은 짧다. 관절 전용 연출.
		if state == "ATTACK" or state == "RECOVERY" then
			local inertia = if axe or blunt then 1 elseif spear or grip == "RIFLE" then 0.72
				elseif bow or crossbow or pistol then 0.36 else 0.55
			local settle = if state == "ATTACK" then follow else (1 - t) * (1 - t)
			bend("Neck", 0.04 * inertia * settle, -0.05 * inertia * settle, 0)
			bend("Spine", 0.09 * inertia * settle, -0.035 * inertia * settle, 0)
			bend("ThighR", 0.055 * inertia * settle, 0, 0)
		end
		-- [좌우 연속타] 무기 2타의 회전 방향에 맞춰 골반·몸통·디딤발 반작용을 준다.
		if state == "ATTACK" and not (gun or bow or crossbow) then
			local beatSide = if (h.weaponBeat or 1) % 2 == 0 then -1 else 1
			bend("Spine", 0, 0.05 * beatSide * strike, 0)
			bend("Chest", 0, 0.09 * beatSide * strike, 0.035 * beatSide * strike)
			bend("FootR", 0, 0, 0.035 * beatSide * strike)
		end
		-- [방패병] 무기 타격 전에도 왼팔 방패면을 유지하고 반격 후 충격을 무릎으로 흡수한다.
		if role == "shield" then
			local brace = math.clamp(hold + prepare + 0.6 * follow + returnGrip, 0, 1)
			bend("UpperArmL", -0.25 * brace, 0, -0.18 * brace)
			bend("ForearmL", -0.27 * brace, 0, 0)
			bend("Chest", -0.09 * brace + 0.10 * strike, 0, 0)
			bend("ThighL", 0.13 * brace, 0, -0.05 * brace)
			bend("ShinL", -0.18 * brace, 0, 0)
		end
	elseif grip == "" and state == "ATTACK" and (role == "ally-melee" or role == "ally-ranged") then
		-- [맨손 동료] 공용 잽/크로스와 함께 축발 반전·허리 회전을 넣는다.
		local punch = math.sin(math.clamp((phase - 0.25) / 0.35, 0, 1) * math.pi)
		bend("Chest", -0.18 * punch, 0.23 * punch, 0)
		bend("Spine", 0, 0.15 * punch, 0)
		bend("ThighL", 0.16 * punch, 0, 0)
		bend("ThighR", -0.15 * punch, 0, 0)
		bend("FootL", -0.14 * punch, 0, 0)
	end
	-- [적 검무 발놀림] 준비 동작 → 축발 회전 → 실제 타격 순간 → 반동 자세 회수.
	-- 무기별 승인 모션 포즈를 적용한 뒤 양발·골반·고개만 덧그려, 팔만 흔드는 인형 모션을 방지한다.
	-- 공격 판정·공격 속도·이동 거리·피해·저장에는 영향이 없다.
	if role == "grunt" or role == "archer" or role == "shield" or role == "charger" or role == "boss" or role == "thrower" then
		local side = if (h.model:GetAttribute("MotionVariant") or 1) % 2 == 0 then -1 else 1
		local weight = if role == "boss" or role == "charger" then 1.22 elseif role == "archer" or role == "thrower" then 0.64 else 1
		local p = math.clamp(phase, 0, 1)
		if state == "ANTICIPATION" then
			local wind = p * p * (3 - 2 * p)
			bend("Spine", 0.11 * wind * weight, side * 0.18 * wind, 0)
			bend("Chest", 0.05 * wind, side * 0.20 * wind, side * 0.04 * wind)
			bend("Head", -0.05 * wind, -side * 0.21 * wind, 0)
			bend("ThighR", 0.19 * wind * weight, 0, side * 0.07 * wind)
			bend("ShinR", -0.25 * wind * weight, 0, 0)
			bend("FootR", 0.18 * wind, -side * 0.07 * wind, 0)
		elseif state == "ATTACK" then
			local t = math.clamp((p - 0.25) / 0.35, 0, 1)
			local thrust = math.sin(t * math.pi)
			local follow = t * t * (3 - 2 * t)
			bend("Spine", -0.12 * thrust * weight, side * (0.25 * thrust - 0.18 * follow), 0)
			bend("Chest", -0.17 * thrust * weight, -side * 0.24 * thrust, -side * 0.08 * follow)
			bend("Head", 0.06 * thrust, side * 0.15 * thrust, 0)
			bend("ThighL", -0.28 * thrust * weight, 0, -side * 0.06 * thrust)
			bend("ShinL", -0.19 * thrust * weight, 0, 0)
			bend("FootL", 0.21 * thrust - 0.13 * follow, 0, side * 0.06 * follow)
		elseif state == "RECOVERY" then
			local recoil = (1 - p) * (1 - p)
			bend("Spine", -0.12 * weight * recoil, -side * 0.14 * recoil, 0)
			bend("Chest", -0.10 * recoil, side * 0.16 * recoil, 0)
			bend("Head", 0.08 * recoil, -side * 0.11 * recoil, 0)
			bend("ThighL", 0.17 * recoil, 0, 0)
			bend("ShinL", -0.18 * recoil, 0, 0)
			bend("FootL", 0.16 * recoil, 0, 0)
		elseif state == "BLOCK" or state == "PARRY" then
			local brace = math.sin(p * math.pi)
			bend("Spine", 0.10 * brace, side * (if state == "PARRY" then 0.19 else -0.07) * brace, 0)
			bend("ThighR", 0.16 * brace, 0, side * 0.07 * brace)
			bend("ShinR", -0.26 * brace, 0, 0)
			bend("FootR", 0.20 * brace, 0, 0)
		end
	end
	-- [실제 타격 발동작] 무기 상체 모션 뒤에도 디딤발은 고정하고 반대쪽 발을 앞으로 딛는다.
	-- 공격 판정·거리·시간은 전혀 바꾸지 않는다. 서 있는 상태에서 뿌리째 미끄러지는 느낌만 줄인다.
	if state == "ATTACK" and (role == "grunt" or role == "archer" or role == "shield"
		or role == "charger" or role == "thrower" or role == "boss"
		or role == "ally-melee" or role == "ally-ranged") then
		local release = math.clamp((phase - 0.25) / 0.35, 0, 1)
		-- 공격 Root 전진 거리를 앞발 들기·무릎 굽힘에 반영한다. 전진이 없는 공격은 기존 자세.
		local advance = math.clamp((attackAdvance or 0) * 2, 0, 0.55)
		local step = math.sin(release * math.pi) * (1 + advance) + advance * (1 - release) * 0.4
		-- [착지 연속] 원거리 사수는 발을 작게, 근접 전투원은 크게 디딘다.
		local rangedGrip = weaponMotion == "BOW" or weaponMotion == "LONGBOW"
			or weaponMotion == "CROSSBOW" or weaponMotion == "RIFLE" or weaponMotion == "PISTOL"
		local weight = if rangedGrip then 0.35 elseif role == "shield" or role == "boss" then 0.75
			elseif role == "ally-melee" then 0.85 else 1
		local landed = release * release * (3 - 2 * release)
		bend("ThighL", (-0.22 + release * 0.28 - advance * 0.12) * weight, 0, -0.04)
		bend("ThighR", (0.21 - release * 0.14) * weight, 0, 0.04)
		bend("ShinL", -0.24 * step * weight - 0.13 * landed * weight, 0, 0)
		bend("FootL", (0.20 * step + 0.16 * landed) * weight, 0, 0)
		bend("FootR", (-0.13 * step - 0.07 * landed) * weight, 0, 0)
	elseif state == "RECOVERY" and (role == "grunt" or role == "archer" or role == "shield"
		or role == "charger" or role == "thrower" or role == "boss"
		or role == "ally-melee" or role == "ally-ranged") then
		local land = (1 - math.clamp(phase, 0, 1)) ^ 2
		local rangedGrip = weaponMotion == "BOW" or weaponMotion == "LONGBOW"
			or weaponMotion == "CROSSBOW" or weaponMotion == "RIFLE" or weaponMotion == "PISTOL"
		local weight = if rangedGrip then 0.35 elseif role == "shield" or role == "boss" then 0.75
			elseif role == "ally-melee" then 0.85 else 1
		bend("ShinL", -0.13 * land * weight, 0, 0)
		bend("FootL", 0.16 * land * weight, 0, 0)
		bend("FootR", -0.07 * land * weight, 0, 0)
	end
	-- [지연 회전] 공격 중에는 정확한 방향을 방해하지 않으며 이동/대기만 목·허리가 따라간다.
	if state == "IDLE" or state == "RUN" then
		local lag = h.turnLag or 0
		bend("Head", 0, -lag * 0.64, 0)
		bend("Chest", 0, -lag * 0.28, lag * 0.10)
		bend("FootL", 0, lag * 0.18, -lag * 0.045)
		bend("FootR", 0, -lag * 0.12, lag * 0.045)
		-- 목→가슴→골반→발 방향으로 약한 비틀림이 잔상처럼 따라온다.
		bend("Spine", 0, -lag * 0.16, 0)
		bend("ThighL", 0, lag * 0.08, 0)
		bend("ThighR", 0, -lag * 0.08, 0)
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
	-- [시작·정지·피격·예고 연결] 현재 AI의 공격 타이밍은 그대로 두고 관절만 짧게 보간한다.
	if h.transitionPose then
		h.transitionElapsed = (h.transitionElapsed or 0) + math.clamp(dt, 0, 0.15)
		local duration = if state == "ATTACK" or state == "HIT" or state == "EVADE"
			or state == "KNOCKDOWN" or state == "BLOCK" or state == "PARRY" then 0.065
			elseif state == "GETUP" then 0.14
			elseif state == "ANTICIPATION" or state == "INTERACT" then 0.12
			elseif state == "RECOVERY" then 0.16 else 0.23
		local q = math.clamp(h.transitionElapsed / duration, 0, 1)
		local eased = q * q * (3 - 2 * q)
		for joint, target in h.canon do
			local old = h.transitionPose[joint]
			if old and typeof(old) == "CFrame" then
				h.canon[joint] = old:Lerp(target, eased)
			elseif typeof(target) == "CFrame" then
				h.canon[joint] = CFrame.identity:Lerp(target, eased)
			end
		end
		for joint, old in h.transitionPose do
			if h.canon[joint] == nil and typeof(old) == "CFrame" then
				h.canon[joint] = old:Lerp(CFrame.identity, eased)
			end
		end
		if q >= 1 then h.transitionPose = nil end
	end
	-- [무기 관성] 단검의 재빠른 타격과 도끼의 무거운 회복을 기존 공용 포즈 필터로 구분한다.
	local fastWeapon = weaponMotion == "DAGGER" or weaponMotion == "RAPIER"
	local heavyWeapon = weaponMotion == "WAR_AXE" or weaponMotion == "MACE"
	local response = if state == "ATTACK" then (if fastWeapon then 2.05 else 1.75)
		elseif state == "HIT" or state == "EVADE" or state == "BLOCK" or state == "PARRY" or state == "KNOCKDOWN" then 1.55
		elseif state == "GETUP" then 1.20
		elseif state == "ANTICIPATION" then 1.20
		elseif state == "RECOVERY" then (if heavyWeapon then 0.82 else 1)
		else 1
	FM.step(h, dt, rootRot, response)
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

-- [마력숲 원본 맨손 액션] 검증된 공용 R15 포즈만 사용한다.
-- 첫 단타는 잽 1개만 재생하며, 실전 숙련 확률이 결정한 단계만 이후 재생한다.
local UNARMED_CHAIN = { "U:JAB_LEFT", "U:CROSS_RIGHT", "U:FRONT_KICK_L" }
local UNARMED_STYLES = {
	UNARMED_RUSH = { "U:JAB_LEFT", "U:CROSS_RIGHT", "U:HOOK_LEFT", "U:HOOK_RIGHT", "U:BACKFIST_LEFT" },
	UNARMED_UPPERCUT = { "U:UPPERCUT_RIGHT", "U:UPPERCUT_LEFT", "U:CROSS_RIGHT", "U:UPPERCUT_LEFT", "U:UPPERCUT_RIGHT" },
	UNARMED_KICK = { "U:LOW_KICK_R", "U:ROUND_KICK_R", "U:SIDE_KICK_L", "U:FRONT_KICK_R", "U:ROUND_KICK_L" },
	UNARMED_ELBOW = { "U:ELBOW_RIGHT", "U:KNEE_LEFT", "U:ELBOW_LEFT", "U:KNEE_RIGHT", "U:DIAGONAL_KNEE_LEFT" },
}
-- [무기 숙련 4·5단] 각 무기 계열의 실제 공용 동작 원자를 사용한다.
-- 근접형 1~3단은 지역 무기 프로필의 원본 순서를 유지하고, 원거리·레이피어는 아래 시각 연계로 구분한다.
local WEAPON_HIGH_BEATS = {
	BLADE = { "W:BLADE_RISING", "W:BLADE_RIPOSTE" },
	AXE = { "W:AXE_CLEAVE", "W:AXE_DIAGONAL" },
	SPEAR = { "W:SPEAR_SWEEP", "W:SPEAR_BUTT_STRIKE" },
	BLUNT = { "W:BLUNT_GROUND_SLAM", "W:BLUNT_RISING" },
	BOW = { "W:BOW_RELEASE", "W:BOW_RELEASE" },
	FIREARM = { "W:FIREARM_BURST", "W:FIREARM_RECOIL" },
	DUAL = { "W:DUAL_CROSS", "W:DUAL_REVERSE" },
}
-- [원거리 10단 영화식 연사] 기존 확인된 격발 관절만 재사용하며 장전 동작 없이 이어진다.
-- 손·발·척추 회전은 FieldScene에서 합성하고 기존 1회 명중 판정에는 영향이 없다.
local WEAPON_CHAIN_STANCES = {
	CROSSBOW = { "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_BURST", "W:FIREARM_RECOIL" },
	PISTOL = { "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_BURST", "W:FIREARM_RECOIL" },
	RIFLE = { "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_RECOIL", "W:FIREARM_BURST", "W:FIREARM_BURST", "W:FIREARM_RECOIL" },
	BOW = { "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE" },
	LONGBOW = { "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE", "W:BOW_RELEASE" },
	RAPIER = { "W:BLADE_THRUST", "W:BLADE_RIPOSTE", "W:BLADE_SLASH_L" },
}
function FM.weaponCombo(motion: string?, idx: number)
	local key = "wpn:" .. tostring(motion) .. ":" .. idx
	local c = comboCache[key]
	if c == nil then
		local ok, res = pcall(function()
			if motion == nil or UNARMED_STYLES[motion] then
				local actions = if motion == nil then UNARMED_CHAIN else UNARMED_STYLES[motion]
				return CM.CreateCombatCombo("UNARMED", { actions[(idx - 1) % #actions + 1] })
			end
			local prof = CM.DescribeWeaponProfiles()[motion]
			local route = prof and prof.route
			if not route then
				return nil
			end
			local stage = math.clamp(math.floor(idx), 1, 10)
			local extras = WEAPON_HIGH_BEATS[prof.family]
			local stances = WEAPON_CHAIN_STANCES[motion]
			local action = if stances and stances[stage] then stances[stage]
				elseif stage > #route and extras then extras[((stage - #route - 1) % #extras) + 1]
				else route[(stage - 1) % #route + 1]
			return CM.CreateCombatCombo(motion, { action })
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
