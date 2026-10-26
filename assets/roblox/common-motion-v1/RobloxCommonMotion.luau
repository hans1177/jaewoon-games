-- 파일명: assets/roblox/common-motion-v1/RobloxCommonMotion.luau
-- 역할: 모든 Roblox R15 게임에서 재사용 가능한 회사 공용 관절 모션 원본 61종
-- 원칙: 관절 포즈만 소유한다. Humanoid 이동속도/위치/루트모션/데미지/게임플레이 권한은 소유하지 않는다.

local KeyframeSequenceProvider = game:GetService("KeyframeSequenceProvider")

local RobloxCommonMotion = {}

local MOTION = table.freeze({
	IDLE_RELAXED = table.freeze({looped = true, priority = Enum.AnimationPriority.Idle, duration = 3.2, mode = "IDLE"}),
	WALK = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.00, mode = "LOCOMOTION", stride = 0.62, lift = 0.18, lean = 0.035, stance = 0.625}),
	JOG = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.78, mode = "LOCOMOTION", stride = 0.82, lift = 0.25, lean = 0.070, stance = 0.50}),
	RUN = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.60, mode = "LOCOMOTION", stride = 1.04, lift = 0.33, lean = 0.125, stance = 0.4375}),
	START = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.42, mode = "START"}),
	STOP = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.45, mode = "STOP"}),
	TURN_90 = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.55, mode = "TURN"}),
	JUMP_START = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.38, mode = "JUMP"}),
	LAND = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.48, mode = "LAND"}),
	HIT_FRONT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.52, mode = "HIT"}),
	DEATH_FRONT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action4, duration = 1.65, mode = "DEATH"}),
	BLOCK_RAISE = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.24, mode = "BLOCK_RAISE"}),
	BLOCK_HOLD = table.freeze({looped = true, priority = Enum.AnimationPriority.Action2, duration = 1.10, mode = "BLOCK_HOLD"}),
	PARRY_PERFECT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.32, mode = "PARRY"}),
	GUARD_BREAK = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.70, mode = "GUARD_BREAK"}),
	COUNTER_READY = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.42, mode = "COUNTER_READY"}),
	SPRINT = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.48, mode = "LOCOMOTION", stride = 1.28, lift = 0.40, lean = 0.18, stance = 0.375}),
	CROUCH_IDLE = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.40, mode = "CROUCH"}),
	DODGE_LEFT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.46, mode = "DODGE", direction = -1}),
	DODGE_RIGHT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.46, mode = "DODGE", direction = 1}),
	ROLL_FORWARD = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.62, mode = "ROLL"}),
	CLIMB_LOOP = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.10, mode = "CLIMB"}),
	SWIM_FORWARD = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.20, mode = "SWIM"}),
	INTERACT_USE = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.55, mode = "INTERACT"}),
	GATHER_SWING = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.74, mode = "GATHER"}),
	CRAFT_LOOP = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.25, mode = "CRAFT"}),
	CARRY_IDLE = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.60, mode = "CARRY"}),
	EQUIP_DRAW = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.52, mode = "EQUIP"}),
	UNEQUIP_STOW = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.52, mode = "UNEQUIP"}),
	USE_CONSUMABLE = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 0.78, mode = "CONSUMABLE"}),
	DOWNED_IDLE = table.freeze({looped = true, priority = Enum.AnimationPriority.Action3, duration = 1.50, mode = "DOWNED"}),
	REVIVE_HELP = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 1.05, mode = "REVIVE"}),
	EMOTE_WAVE = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 1.20, mode = "EMOTE"}),
	LIGHT_ATTACK_1 = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.46, mode = "LIGHT_ATTACK"}),
	HEAVY_ATTACK_1 = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.88, mode = "HEAVY_ATTACK"}),
	RANGED_DRAW_SHOT = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.82, mode = "RANGED_ATTACK"}),
	CAST_BURST = table.freeze({looped = false, priority = Enum.AnimationPriority.Action3, duration = 0.72, mode = "CAST"}),
	CHANNEL_LOOP = table.freeze({looped = true, priority = Enum.AnimationPriority.Action3, duration = 1.20, mode = "CHANNEL"}),
	HIT_BACK = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.55, mode = "HIT_BACK"}),
	BLEND_NEUTRAL = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.24, mode = "BLEND"}),
	SIT_DOWN = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.75, mode = "LIFE_ACTION", variant = "SIT_DOWN"}),
	STAND_UP = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.72, mode = "LIFE_ACTION", variant = "STAND_UP"}),
	LEAN_WALL_IDLE = table.freeze({looped = true, priority = Enum.AnimationPriority.Idle, duration = 1.80, mode = "LIFE_ACTION", variant = "LEAN"}),
	OPEN_DOOR = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.75, mode = "LIFE_ACTION", variant = "OPEN_DOOR"}),
	OPEN_CONTAINER = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.68, mode = "LIFE_ACTION", variant = "OPEN_CONTAINER"}),
	PICKUP_GROUND = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.72, mode = "LIFE_ACTION", variant = "PICKUP"}),
	PLACE_GROUND = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 0.72, mode = "LIFE_ACTION", variant = "PLACE"}),
	PUSH_OBJECT = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.20, mode = "LIFE_ACTION", variant = "PUSH"}),
	PULL_OBJECT = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.20, mode = "LIFE_ACTION", variant = "PULL"}),
	TALK_GESTURE = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 1.10, mode = "LIFE_ACTION", variant = "TALK_GESTURE"}),
	NPC_WORK_LOOP = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.40, mode = "LIFE_ACTION", variant = "NPC_WORK"}),
	COOK_LOOP = table.freeze({looped = true, priority = Enum.AnimationPriority.Action, duration = 1.30, mode = "LIFE_ACTION", variant = "COOK"}),
	FARM_TEND = table.freeze({looped = true, priority = Enum.AnimationPriority.Action2, duration = 1.15, mode = "LIFE_ACTION", variant = "FARM"}),
	FISH_CAST = table.freeze({looped = false, priority = Enum.AnimationPriority.Action2, duration = 1.00, mode = "LIFE_ACTION", variant = "FISH"}),
	BED_LIE_DOWN = table.freeze({looped = false, priority = Enum.AnimationPriority.Action, duration = 1.10, mode = "LIFE_ACTION", variant = "BED"}),
	LADDER_ENTER = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.60, mode = "LIFE_ACTION", variant = "LADDER_ENTER"}),
	LADDER_EXIT = table.freeze({looped = false, priority = Enum.AnimationPriority.Movement, duration = 0.65, mode = "LIFE_ACTION", variant = "LADDER_EXIT"}),
	SLOPE_ASCEND = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.90, mode = "LIFE_ACTION", variant = "SLOPE_ASCEND"}),
	SLOPE_DESCEND = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.90, mode = "LIFE_ACTION", variant = "SLOPE_DESCEND"}),
	FATIGUED_IDLE = table.freeze({looped = true, priority = Enum.AnimationPriority.Idle, duration = 1.80, mode = "LIFE_ACTION", variant = "FATIGUE"}),
	INJURED_WALK = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.15, mode = "LIFE_ACTION", variant = "INJURY"}),
})

local HIERARCHY = table.freeze({
	name = "HumanoidRootPart",
	children = table.freeze({
		table.freeze({
			name = "LowerTorso",
			children = table.freeze({
				table.freeze({
					name = "UpperTorso",
					children = table.freeze({
						table.freeze({name = "Head"}),
						table.freeze({
							name = "LeftUpperArm",
							children = table.freeze({
								table.freeze({
									name = "LeftLowerArm",
									children = table.freeze({table.freeze({name = "LeftHand"})}),
								}),
							}),
						}),
						table.freeze({
							name = "RightUpperArm",
							children = table.freeze({
								table.freeze({
									name = "RightLowerArm",
									children = table.freeze({table.freeze({name = "RightHand"})}),
								}),
							}),
						}),
					}),
				}),
				table.freeze({
					name = "LeftUpperLeg",
					children = table.freeze({
						table.freeze({
							name = "LeftLowerLeg",
							children = table.freeze({table.freeze({name = "LeftFoot"})}),
						}),
					}),
				}),
				table.freeze({
					name = "RightUpperLeg",
					children = table.freeze({
						table.freeze({
							name = "RightLowerLeg",
							children = table.freeze({table.freeze({name = "RightFoot"})}),
						}),
					}),
				}),
			}),
		}),
	}),
})

local function angles(x, y, z)
	return CFrame.Angles(math.rad(x or 0), math.rad(y or 0), math.rad(z or 0))
end

local function clamp(value, a, b)
	return math.max(a, math.min(b, tonumber(value) or 0))
end

local function poseTree(node, transforms, root, easing)
	local pose = Instance.new("Pose")
	pose.Name = node.name
	pose.Weight = node.name == "HumanoidRootPart" and 0 or 1
	pose.CFrame = transforms[node.name] or CFrame.new()
	pose.EasingStyle = easing or Enum.PoseEasingStyle.Linear
	pose.EasingDirection = Enum.PoseEasingDirection.InOut
	if root then
		root:AddPose(pose)
	end
	for _, child in ipairs(node.children or {}) do
		poseTree(child, transforms, pose, easing)
	end
	return pose
end

local function addFrame(sequence, time, transforms, name, easing)
	local keyframe = Instance.new("Keyframe")
	keyframe.Name = name or string.format("K_%03d", math.floor(time * 1000 + 0.5))
	keyframe.Time = time
	poseTree(HIERARCHY, transforms, keyframe, easing)
	sequence:AddKeyframe(keyframe)
	return keyframe
end

local function locomotionTransforms(phase, row)
	local stride = row.stride or 0.7
	local lift = row.lift or 0.2
	local lean = row.lean or 0.05
	local stance = row.stance or 0.5625
	local cycle = (phase / (math.pi * 2)) % 1
	local pelvisPitch = -lean * 38
	local pelvisRoll = math.sin(phase) * 1.2
	local pelvisYaw = math.cos(phase) * (2 + stride * 1.2)
	local bob = -math.cos(phase * 2) * (0.018 + lift * 0.045)
	local reach = 0.15 + stride * 0.11
	local armLag = phase - 0.20
	local elbowLag = phase - 0.42
	local wristLag = phase - 0.66
	local armArc = 14 + stride * 19
	local elbowBend = 12 + lean * 170
	local transforms = {
		LowerTorso = CFrame.new(0, bob, 0) * angles(pelvisPitch, pelvisYaw, pelvisRoll),
		UpperTorso = angles(lean * 17 + math.sin(phase * 2 - 0.2) * 0.8, -pelvisYaw * 1.65, -pelvisRoll * 1.25),
		Head = angles(lean * 18 - math.sin(phase * 2 - 0.35) * 0.65, pelvisYaw * 0.65, pelvisRoll * 0.25),
		LeftUpperArm = angles(-math.cos(armLag) * armArc, -3, -5 - math.sin(armLag) * 2),
		RightUpperArm = angles(math.cos(armLag) * armArc, 3, 5 - math.sin(armLag) * 2),
		LeftLowerArm = angles(elbowBend + (1 - math.cos(elbowLag)) * 7, 0, -2),
		RightLowerArm = angles(elbowBend + (1 + math.cos(elbowLag)) * 7, 0, 2),
		LeftHand = angles(math.cos(wristLag) * 3, 0, -1),
		RightHand = angles(-math.cos(wristLag) * 3, 0, 1),
	}
	-- 모션: 지지 발은 일정한 속도로 뒤로 보내고, 회수 발만 위로 들어 올린다.
	-- 표준 R15 비율의 관절 원본이다. 게임 속도 동기화·다른 비율 리타깃은 소비자가 검증한다.
	for index, side in ipairs({"Left", "Right"}) do
		local p = (cycle + (index - 1) * 0.5) % 1
		local forward, height, footRoll
		if p <= stance then
			local u = p / stance
			forward = reach * (1 - 2 * u)
			height = 0
			local heel = math.max(0, 1 - u / 0.18)
			local toe = math.max(0, (u - 0.78) / 0.22)
			footRoll = heel * heel * 7 - toe * toe * 12
		else
			local u = (p - stance) / (1 - stance)
			local u2, u3 = u * u, u * u * u
			local tangent = -2 * reach * (1 - stance) / stance
			forward = -reach * (2 * u3 - 3 * u2 + 1) + reach * (-2 * u3 + 3 * u2)
				+ tangent * (2 * u3 - 3 * u2 + u)
			height = (0.07 + lift * 0.28) * math.sin(math.pi * u) ^ 2
			local ease = u2 * (3 - 2 * u)
			footRoll = -12 + 19 * ease
		end
		local down = 0.935 + bob / 2.1 - height
		local distance = math.sqrt(forward * forward + down * down)
		local bend = math.acos(clamp(distance, 0.1, 0.999))
		local hip = math.deg(math.atan2(forward, down) + bend) - pelvisPitch
		local knee = -math.deg(bend * 2)
		transforms[side .. "UpperLeg"] = angles(hip, -pelvisYaw, -pelvisRoll)
		transforms[side .. "LowerLeg"] = angles(knee, 0, 0)
		transforms[side .. "Foot"] = angles(footRoll - hip - knee - pelvisPitch, 0, 0)
	end
	return transforms
end

local function makeIdle(sequence, row)
	local samples = 32
	for i = 0, samples do
		local t = row.duration * i / samples
		local phase = math.pi * 2 * i / samples
		local breathe = math.sin(phase)
		local sway = math.sin(phase)
		local chest = math.sin(phase - 0.22)
		local head = math.sin(phase - 0.42)
		addFrame(sequence, t, {
			LowerTorso = angles(-1.2 + breathe * 0.45, sway * 0.7, sway * 0.35),
			UpperTorso = angles(1.1 - chest * 0.65, -sway * 0.9, -sway * 0.4),
			Head = angles(-1.0 + head * 0.35, sway * 0.3, sway * 0.1),
			LeftUpperArm = angles(-4 + breathe * 1.1, -2, -4),
			LeftLowerArm = angles(7 + chest * 1.4, 0, -2),
			LeftHand = angles(math.sin(phase - 0.6) * 0.9, 0, -1),
			RightUpperArm = angles(-4 - breathe * 1.1, 2, 4),
			RightLowerArm = angles(7 - chest * 1.4, 0, 2),
			RightHand = angles(-math.sin(phase - 0.6) * 0.9, 0, 1),
			LeftUpperLeg = angles(2.2 - breathe * 0.45, -sway * 0.7, -sway * 0.35),
			RightUpperLeg = angles(2.2 - breathe * 0.45, -sway * 0.7, -sway * 0.35),
			LeftLowerLeg = angles(-2, 0, 0),
			RightLowerLeg = angles(-2, 0, 0),
			LeftFoot = angles(1, 0, 0),
			RightFoot = angles(1, 0, 0),
		}, i == 0 and "LoopStart" or i == samples and "LoopEnd" or nil)
	end
end

local function makeLocomotion(sequence, row)
	local samples = 32
	for i = 0, samples do
		local t = row.duration * i / samples
		local phase = math.pi * 2 * i / samples
		addFrame(sequence, t, locomotionTransforms(phase, row), i == 0 and "LoopStart" or i == samples and "LoopEnd" or nil)
	end
end

local function makeStart(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(0, 0, 0),
		UpperTorso = angles(0, 0, 0),
		LeftUpperLeg = angles(0, 0, 0),
		RightUpperLeg = angles(0, 0, 0),
	}, "Start")
	addFrame(sequence, row.duration * 0.16, {
		LowerTorso = angles(2, -2, -1), UpperTorso = angles(-1, 3, 1), Head = angles(-2, 0, 0),
		LeftUpperLeg = angles(10, 0, 1), LeftLowerLeg = angles(-14, 0, 0), LeftFoot = angles(2, 0, 0),
		RightUpperLeg = angles(8, 0, 1), RightLowerLeg = angles(-12, 0, 0), RightFoot = angles(2, 0, 0),
		LeftUpperArm = angles(-8, 0, -5), RightUpperArm = angles(3, 0, 5),
		LeftLowerArm = angles(14, 0, -2), RightLowerArm = angles(12, 0, 2),
	}, "Load")
	addFrame(sequence, row.duration * 0.38, {
		LowerTorso = angles(-8, 0, -2),
		UpperTorso = angles(4, 0, 2),
		LeftUpperArm = angles(22, 0, -6),
		RightUpperArm = angles(-22, 0, 6),
		LeftUpperLeg = angles(-18, 0, -2),
		RightUpperLeg = angles(23, 0, 2),
		LeftLowerLeg = angles(-12, 0, 0), RightLowerLeg = angles(-34, 0, 0),
		LeftFoot = angles(38, 0, 0), RightFoot = angles(19, 0, 0),
		LeftLowerArm = angles(22, 0, -2), RightLowerArm = angles(20, 0, 2), Head = angles(3, 0, 0),
	}, "Commit")
	addFrame(sequence, row.duration * 0.68, locomotionTransforms(math.pi * 1.72, MOTION.WALK), "FirstSwing")
	addFrame(sequence, row.duration * 0.86, locomotionTransforms(math.pi * 1.90, MOTION.WALK), "HeelApproach")
	addFrame(sequence, row.duration, locomotionTransforms(0, MOTION.WALK), "BlendOut")
end

local function makeStop(sequence, row)
	addFrame(sequence, 0, locomotionTransforms(math.pi * 0.25, {stride = 0.72, lift = 0.22, lean = 0.07}), "Moving")
	addFrame(sequence, row.duration * 0.48, {
		LowerTorso = angles(8, 0, 2),
		UpperTorso = angles(-4, 0, -2),
		LeftUpperArm = angles(-12, 0, -4),
		RightUpperArm = angles(12, 0, 4),
		LeftUpperLeg = angles(12, 0, -2),
		RightUpperLeg = angles(-8, 0, 2),
		LeftLowerLeg = angles(-28, 0, 0), RightLowerLeg = angles(-12, 0, 0),
		LeftFoot = angles(8, 0, 0), RightFoot = angles(12, 0, 0),
		LeftLowerArm = angles(20, 0, -2), RightLowerArm = angles(26, 0, 2), Head = angles(-3, 0, 0),
	}, "Brake")
	addFrame(sequence, row.duration * 0.70, {
		LowerTorso = angles(3, 0, 1), UpperTorso = angles(-1, 0, -1), Head = angles(-2, 0, 0),
		LeftUpperLeg = angles(8, 0, -1), LeftLowerLeg = angles(-13, 0, 0), LeftFoot = angles(2, 0, 0),
		RightUpperLeg = angles(5, 0, -1), RightLowerLeg = angles(-10, 0, 0), RightFoot = angles(2, 0, 0),
		LeftUpperArm = angles(-6, 0, -4), RightUpperArm = angles(7, 0, 4),
		LeftLowerArm = angles(16, 0, -2), RightLowerArm = angles(20, 0, 2),
	}, "Overshoot", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration * 0.86, {
		LowerTorso = angles(-2, 0, 0), UpperTorso = angles(2, 0, 0), Head = angles(-1, 0, 0),
		LeftUpperArm = angles(-5, 0, -4), RightUpperArm = angles(-2, 0, 4),
		LeftLowerArm = angles(10, 0, -2), RightLowerArm = angles(12, 0, 2),
		LeftUpperLeg = angles(4, 0, 0), RightUpperLeg = angles(4, 0, 0),
		LeftLowerLeg = angles(-3, 0, 0), RightLowerLeg = angles(-3, 0, 0),
		LeftFoot = angles(1, 0, 0), RightFoot = angles(1, 0, 0),
	}, "Rebalance", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 0, 0),
		UpperTorso = angles(1, 0, 0),
		LeftUpperArm = angles(-3, 0, -3),
		RightUpperArm = angles(-3, 0, 3),
		LeftLowerArm = angles(7, 0, -2), RightLowerArm = angles(7, 0, 2),
		LeftUpperLeg = angles(2, 0, 0), RightUpperLeg = angles(2, 0, 0),
		LeftLowerLeg = angles(-2, 0, 0), RightLowerLeg = angles(-2, 0, 0),
		LeftFoot = angles(1, 0, 0), RightFoot = angles(1, 0, 0), Head = angles(-1, 0, 0),
	}, "Settle")
end

local function makeTurn(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(-2, -10, 0),
		UpperTorso = angles(1, 16, 0),
		Head = angles(0, 24, 0),
		LeftUpperLeg = angles(-6, 8, -2),
		RightUpperLeg = angles(8, -6, 2),
	}, "Anticipate")
	addFrame(sequence, row.duration * 0.18, {
		LowerTorso = angles(-2, -4, -1), UpperTorso = angles(1, 20, 2), Head = angles(-1, 32, 0),
		LeftUpperLeg = angles(12, 4, 1), LeftLowerLeg = angles(-16, 0, 0), LeftFoot = angles(6, -4, 0),
		RightUpperLeg = angles(6, 4, 1), RightLowerLeg = angles(-8, 0, 0), RightFoot = angles(4, -4, 0),
		LeftUpperArm = angles(4, -4, -5), RightUpperArm = angles(-8, 6, 6),
		LeftLowerArm = angles(16, 0, -2), RightLowerArm = angles(14, 0, 2),
	}, "LookLead")
	addFrame(sequence, row.duration * 0.45, {
		LowerTorso = angles(-4, 23, -2),
		UpperTorso = angles(2, 30, 3),
		Head = angles(-1, 36, 1),
		LeftUpperArm = angles(10, -8, -6),
		RightUpperArm = angles(-12, 10, 7),
		LeftUpperLeg = angles(14, 10, -4),
		RightUpperLeg = angles(-17, -8, 4),
		LeftLowerLeg = angles(-26, 0, 0), RightLowerLeg = angles(-6, 0, 0),
		LeftFoot = angles(16, -10, 0), RightFoot = angles(27, 8, 0),
		LeftLowerArm = angles(20, 0, -2), RightLowerArm = angles(22, 0, 2),
	}, "Pivot")
	addFrame(sequence, row.duration * 0.67, {
		LowerTorso = angles(-2, 14, 1), UpperTorso = angles(2, 19, -1), Head = angles(0, 18, 0),
		LeftUpperLeg = angles(10, -6, -1), LeftLowerLeg = angles(-12, 0, 0), LeftFoot = angles(4, 4, 0),
		RightUpperLeg = angles(8, -6, -1), RightLowerLeg = angles(-15, 0, 0), RightFoot = angles(9, 4, 0),
		LeftUpperArm = angles(14, -6, -5), RightUpperArm = angles(-15, 8, 6),
		LeftLowerArm = angles(18, 0, -2), RightLowerArm = angles(20, 0, 2),
	}, "BodyFollow", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration * 0.84, {
		LowerTorso = angles(-1, 5, 0), UpperTorso = angles(1, 8, 0), Head = angles(0, 9, 0),
		LeftUpperArm = angles(3, -2, -4), RightUpperArm = angles(-6, 2, 4),
		LeftLowerArm = angles(10, 0, -2), RightLowerArm = angles(13, 0, 2),
		LeftUpperLeg = angles(5, -2, 0), RightUpperLeg = angles(5, -2, 0),
		LeftLowerLeg = angles(-5, 0, 0), RightLowerLeg = angles(-5, 0, 0),
		LeftFoot = angles(1, 2, 0), RightFoot = angles(1, 2, 0),
	}, "ArmFollow", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 4, 0),
		UpperTorso = angles(1, 6, 0),
		Head = angles(0, 8, 0),
		LeftUpperArm = angles(-3, 0, -4), RightUpperArm = angles(-3, 0, 4),
		LeftLowerArm = angles(7, 0, -2), RightLowerArm = angles(7, 0, 2),
		LeftUpperLeg = angles(3, -4, 0), RightUpperLeg = angles(3, -4, 0),
		LeftLowerLeg = angles(-3, 0, 0), RightLowerLeg = angles(-3, 0, 0),
		LeftFoot = angles(1, 0, 0), RightFoot = angles(1, 0, 0),
	}, "Recover")
end

local function makeJump(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(8, 0, 0),
		UpperTorso = angles(-5, 0, 0),
		LeftUpperLeg = angles(22, 0, -3),
		RightUpperLeg = angles(22, 0, 3),
		LeftLowerLeg = angles(-44, 0, 0),
		RightLowerLeg = angles(-44, 0, 0),
		LeftFoot = angles(14, 0, 0), RightFoot = angles(14, 0, 0),
		LeftUpperArm = angles(18, 0, -8),
		RightUpperArm = angles(18, 0, 8),
		LeftLowerArm = angles(18, 0, -2), RightLowerArm = angles(18, 0, 2), Head = angles(-2, 0, 0),
	}, "Crouch")
	addFrame(sequence, row.duration * 0.22, {
		LowerTorso = angles(11, 0, 0), UpperTorso = angles(-7, 0, 0), Head = angles(-3, 0, 0),
		LeftUpperLeg = angles(31, 0, -3), RightUpperLeg = angles(31, 0, 3),
		LeftLowerLeg = angles(-60, 0, 0), RightLowerLeg = angles(-60, 0, 0),
		LeftFoot = angles(18, 0, 0), RightFoot = angles(18, 0, 0),
		LeftUpperArm = angles(-22, 0, -9), RightUpperArm = angles(-22, 0, 9),
		LeftLowerArm = angles(25, 0, -2), RightLowerArm = angles(25, 0, 2),
	}, "Compression")
	addFrame(sequence, row.duration * 0.40, {
		LowerTorso = angles(1, 0, 0), UpperTorso = angles(-1, 0, 0), Head = angles(-3, 0, 0),
		LeftUpperLeg = angles(16, 0, -2), RightUpperLeg = angles(16, 0, 2),
		LeftLowerLeg = angles(-25, 0, 0), RightLowerLeg = angles(-25, 0, 0),
		LeftFoot = angles(8, 0, 0), RightFoot = angles(8, 0, 0),
		LeftUpperArm = angles(30, 0, -12), RightUpperArm = angles(30, 0, 12),
		LeftLowerArm = angles(28, 0, -2), RightLowerArm = angles(28, 0, 2),
	}, "Extension")
	addFrame(sequence, row.duration * 0.55, {
		LowerTorso = angles(-7, 0, 0),
		UpperTorso = angles(3, 0, 0),
		LeftUpperLeg = angles(16, 0, -2),
		RightUpperLeg = angles(16, 0, 2),
		LeftLowerLeg = angles(-8, 0, 0),
		RightLowerLeg = angles(-8, 0, 0),
		LeftFoot = angles(-10, 0, 0), RightFoot = angles(-10, 0, 0),
		LeftUpperArm = angles(64, 0, -12),
		RightUpperArm = angles(64, 0, 12),
		LeftLowerArm = angles(20, 0, -2), RightLowerArm = angles(20, 0, 2), Head = angles(1, 0, 0),
	}, "Takeoff")
	addFrame(sequence, row.duration * 0.76, {
		LowerTorso = angles(-5, 0, 0), UpperTorso = angles(2, 0, 0), Head = angles(1, 0, 0),
		LeftUpperLeg = angles(23, 0, -2), RightUpperLeg = angles(20, 0, 2),
		LeftLowerLeg = angles(-38, 0, 0), RightLowerLeg = angles(-32, 0, 0),
		LeftFoot = angles(8, 0, 0), RightFoot = angles(7, 0, 0),
		LeftUpperArm = angles(47, 0, -14), RightUpperArm = angles(43, 0, 14),
		LeftLowerArm = angles(30, 0, -2), RightLowerArm = angles(28, 0, 2),
	}, "FollowThrough", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-4, 0, 0),
		UpperTorso = angles(2, 0, 0),
		LeftUpperLeg = angles(8, 0, -1),
		RightUpperLeg = angles(8, 0, 1),
		LeftLowerLeg = angles(-18, 0, 0),
		RightLowerLeg = angles(-18, 0, 0),
		LeftFoot = angles(14, 0, 0), RightFoot = angles(14, 0, 0),
		LeftUpperArm = angles(22, 0, -10), RightUpperArm = angles(22, 0, 10),
		LeftLowerArm = angles(22, 0, -2), RightLowerArm = angles(22, 0, 2), Head = angles(0, 0, 0),
	}, "Air")
end

local function makeLand(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(-4, 0, 0),
		LeftUpperLeg = angles(8, 0, -1),
		RightUpperLeg = angles(8, 0, 1),
		UpperTorso = angles(2, 0, 0),
		LeftLowerLeg = angles(-18, 0, 0), RightLowerLeg = angles(-18, 0, 0),
		LeftFoot = angles(14, 0, 0), RightFoot = angles(14, 0, 0),
		LeftUpperArm = angles(22, 0, -10), RightUpperArm = angles(22, 0, 10),
		LeftLowerArm = angles(22, 0, -2), RightLowerArm = angles(22, 0, 2),
	}, "Air")
	addFrame(sequence, row.duration * 0.12, {
		LowerTorso = angles(3, 0, 0), UpperTorso = angles(-1, 0, 0), Head = angles(-2, 0, 0),
		LeftUpperLeg = angles(18, 0, -2), RightUpperLeg = angles(18, 0, 2),
		LeftLowerLeg = angles(-34, 0, 0), RightLowerLeg = angles(-34, 0, 0),
		LeftFoot = angles(13, 0, 0), RightFoot = angles(13, 0, 0),
		LeftUpperArm = angles(29, 0, -12), RightUpperArm = angles(29, 0, 12),
		LeftLowerArm = angles(24, 0, -2), RightLowerArm = angles(24, 0, 2),
	}, "Contact")
	addFrame(sequence, row.duration * 0.35, {
		LowerTorso = angles(13, 0, 0),
		UpperTorso = angles(-7, 0, 0),
		LeftUpperLeg = angles(28, 0, -3),
		RightUpperLeg = angles(28, 0, 3),
		LeftLowerLeg = angles(-62, 0, 0),
		RightLowerLeg = angles(-62, 0, 0),
		LeftFoot = angles(21, 0, 0), RightFoot = angles(21, 0, 0),
		LeftUpperArm = angles(24, 0, -12),
		RightUpperArm = angles(24, 0, 12),
		LeftLowerArm = angles(34, 0, -3), RightLowerArm = angles(34, 0, 3), Head = angles(-4, 0, 0),
	}, "Impact")
	addFrame(sequence, row.duration * 0.58, {
		LowerTorso = angles(5, 0, 0), UpperTorso = angles(-1, 0, 0), Head = angles(-3, 0, 0),
		LeftUpperLeg = angles(15, 0, -2), RightUpperLeg = angles(15, 0, 2),
		LeftLowerLeg = angles(-28, 0, 0), RightLowerLeg = angles(-28, 0, 0),
		LeftFoot = angles(8, 0, 0), RightFoot = angles(8, 0, 0),
		LeftUpperArm = angles(-6, 0, -8), RightUpperArm = angles(-6, 0, 8),
		LeftLowerArm = angles(24, 0, -2), RightLowerArm = angles(24, 0, 2),
	}, "Rebound", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration * 0.82, {
		LowerTorso = angles(-2, 0, 0), UpperTorso = angles(3, 0, 0), Head = angles(-1, 0, 0),
		LeftUpperLeg = angles(5, 0, 0), RightUpperLeg = angles(5, 0, 0),
		LeftLowerLeg = angles(-5, 0, 0), RightLowerLeg = angles(-5, 0, 0),
		LeftFoot = angles(2, 0, 0), RightFoot = angles(2, 0, 0),
		LeftUpperArm = angles(-7, 0, -5), RightUpperArm = angles(-7, 0, 5),
		LeftLowerArm = angles(12, 0, -2), RightLowerArm = angles(12, 0, 2),
	}, "Settle", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 0, 0),
		UpperTorso = angles(1, 0, 0),
		LeftUpperLeg = angles(3, 0, 0), RightUpperLeg = angles(3, 0, 0),
		LeftLowerLeg = angles(-3, 0, 0), RightLowerLeg = angles(-3, 0, 0),
		LeftFoot = angles(1, 0, 0), RightFoot = angles(1, 0, 0),
		LeftUpperArm = angles(-3, 0, -4), RightUpperArm = angles(-3, 0, 4),
		LeftLowerArm = angles(7, 0, -2), RightLowerArm = angles(7, 0, 2), Head = angles(-1, 0, 0),
	}, "Recover")
end

local function makeHit(sequence, row)
	addFrame(sequence, 0, {}, "Ready")
	addFrame(sequence, row.duration * 0.08, {
		LowerTorso = angles(2, 0, 1), UpperTorso = angles(14, -3, 8), Head = angles(1, -2, -1),
		LeftUpperArm = angles(-8, 0, -10), RightUpperArm = angles(10, 0, 10),
		LeftLowerArm = angles(14, 0, -2), RightLowerArm = angles(18, 0, 2),
		LeftUpperLeg = angles(6, 0, -1), RightUpperLeg = angles(6, 0, -1),
		LeftLowerLeg = angles(-9, 0, 0), RightLowerLeg = angles(-9, 0, 0),
		LeftFoot = angles(1, 0, 0), RightFoot = angles(1, 0, 0),
	}, "ImpactLead")
	addFrame(sequence, row.duration * 0.22, {
		LowerTorso = angles(12, 0, 8),
		UpperTorso = angles(18, -5, 12),
		Head = angles(10, -8, -8),
		LeftUpperArm = angles(-14, 0, -18),
		RightUpperArm = angles(21, 0, 16),
		LeftUpperLeg = angles(-9, 0, -3),
		RightUpperLeg = angles(13, 0, 3),
		LeftLowerLeg = angles(-12, 0, 0), RightLowerLeg = angles(-28, 0, 0),
		LeftFoot = angles(9, 0, 0), RightFoot = angles(3, 0, 0),
		LeftLowerArm = angles(24, 0, -3), RightLowerArm = angles(32, 0, 3),
	}, "Recoil")
	addFrame(sequence, row.duration * 0.38, {
		LowerTorso = angles(10, 0, 6), UpperTorso = angles(13, -4, 10), Head = angles(15, -9, -10),
		LeftUpperArm = angles(-18, 0, -20), RightUpperArm = angles(26, 0, 18),
		LeftLowerArm = angles(30, 0, -3), RightLowerArm = angles(36, 0, 3),
		LeftHand = angles(-6, 0, -3), RightHand = angles(7, 0, 3),
		LeftUpperLeg = angles(-4, 0, -6), LeftLowerLeg = angles(-12, 0, 0), LeftFoot = angles(6, 0, 0),
		RightUpperLeg = angles(14, 0, -6), RightLowerLeg = angles(-30, 0, 0), RightFoot = angles(6, 0, 0),
	}, "HeadFollow", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration * 0.62, {
		LowerTorso = angles(4, 0, 3),
		UpperTorso = angles(6, -2, 5),
		Head = angles(3, -2, -3),
		LeftUpperArm = angles(-6, 0, -9), RightUpperArm = angles(9, 0, 9),
		LeftLowerArm = angles(15, 0, -2), RightLowerArm = angles(18, 0, 2),
		LeftUpperLeg = angles(4, 0, -3), RightUpperLeg = angles(8, 0, -3),
		LeftLowerLeg = angles(-12, 0, 0), RightLowerLeg = angles(-16, 0, 0),
		LeftFoot = angles(4, 0, 0), RightFoot = angles(4, 0, 0),
	}, "Absorb", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration * 0.84, {
		LowerTorso = angles(-1, 0, -1), UpperTorso = angles(-2, 1, -2), Head = angles(0, 1, 1),
		LeftUpperArm = angles(-2, 0, -3), RightUpperArm = angles(1, 0, 3),
		LeftLowerArm = angles(5, 0, -1), RightLowerArm = angles(6, 0, 1),
		LeftUpperLeg = angles(3, 0, 1), RightUpperLeg = angles(3, 0, 1),
		LeftLowerLeg = angles(-4, 0, 0), RightLowerLeg = angles(-4, 0, 0),
		LeftFoot = angles(2, 0, 0), RightFoot = angles(2, 0, 0),
	}, "Rebalance", Enum.PoseEasingStyle.Cubic)
	addFrame(sequence, row.duration, {}, "Recover")
end

local function makeDeath(sequence, row)
	addFrame(sequence, 0, {}, "Alive")
	addFrame(sequence, row.duration * 0.20, {
		LowerTorso = angles(12, 0, 2),
		UpperTorso = angles(15, 0, -4),
		Head = angles(12, 0, 5),
		LeftUpperArm = angles(18, 0, -18),
		RightUpperArm = angles(22, 0, 20),
	}, "Stagger")
	addFrame(sequence, row.duration * 0.52, {
		LowerTorso = angles(36, 0, 4),
		UpperTorso = angles(42, 0, -5),
		Head = angles(30, 0, 6),
		LeftUpperLeg = angles(-18, 0, -5),
		RightUpperLeg = angles(-10, 0, 5),
		LeftLowerLeg = angles(28, 0, 0),
		RightLowerLeg = angles(18, 0, 0),
		LeftUpperArm = angles(35, -8, -28),
		RightUpperArm = angles(28, 10, 30),
	}, "Fall")
	addFrame(sequence, row.duration, {
		LowerTorso = angles(72, 0, 3),
		UpperTorso = angles(68, 0, -5),
		Head = angles(42, 0, 8),
		LeftUpperLeg = angles(-26, 0, -7),
		RightUpperLeg = angles(-18, 0, 8),
		LeftLowerLeg = angles(42, 0, 0),
		RightLowerLeg = angles(30, 0, 0),
		LeftUpperArm = angles(55, -10, -34),
		RightUpperArm = angles(46, 12, 38),
	}, "Down")
end


local function makeBlockRaise(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(1,0,0),
		LeftUpperArm=angles(-8,-8,-6),RightUpperArm=angles(-8,8,6),
	},"Ready")
	addFrame(sequence,row.duration*0.55,{
		LowerTorso=angles(4,0,0),UpperTorso=angles(-5,0,0),
		LeftUpperArm=angles(-48,-18,-26),LeftLowerArm=angles(-72,0,-12),
		RightUpperArm=angles(-42,16,24),RightLowerArm=angles(-68,0,10),
		Head=angles(-3,0,0),
	},"GuardUp")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(3,0,0),UpperTorso=angles(-4,0,0),
		LeftUpperArm=angles(-44,-15,-24),LeftLowerArm=angles(-70,0,-10),
		RightUpperArm=angles(-40,14,22),RightLowerArm=angles(-66,0,10),
	},"GuardSet")
end

local function makeBlockHold(sequence,row)
	for i=0,4 do
		local t=row.duration*i/4
		local breathe=math.sin(i*math.pi/2)
		addFrame(sequence,t,{
			LowerTorso=angles(3+breathe*0.6,0,0),UpperTorso=angles(-4-breathe*0.5,0,0),
			Head=angles(-2+breathe*0.3,0,0),
			LeftUpperArm=angles(-44,-15,-24),LeftLowerArm=angles(-70+breathe*1.5,0,-10),
			RightUpperArm=angles(-40,14,22),RightLowerArm=angles(-66-breathe*1.5,0,10),
			LeftUpperLeg=angles(-4,0,-2),RightUpperLeg=angles(6,0,2),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
	end
end

local function makeParry(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(3,0,0),UpperTorso=angles(-4,0,0),
		LeftUpperArm=angles(-44,-15,-24),LeftLowerArm=angles(-70,0,-10),
		RightUpperArm=angles(-40,14,22),RightLowerArm=angles(-66,0,10),
	},"Guard")
	addFrame(sequence,row.duration*0.28,{
		LowerTorso=angles(-6,-4,-3),UpperTorso=angles(8,7,6),Head=angles(-4,8,-2),
		LeftUpperArm=angles(-22,-32,-38),LeftLowerArm=angles(-40,0,-20),
		RightUpperArm=angles(-16,34,42),RightLowerArm=angles(-36,0,20),
		LeftUpperLeg=angles(-9,-3,-3),RightUpperLeg=angles(12,4,4),
	},"PerfectContact")
	addFrame(sequence,row.duration*0.62,{
		LowerTorso=angles(2,3,2),UpperTorso=angles(-2,-4,-2),
		LeftUpperArm=angles(-34,-20,-28),LeftLowerArm=angles(-58,0,-14),
		RightUpperArm=angles(-30,18,27),RightLowerArm=angles(-56,0,13),
	},"Recenter")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(0,0,0),UpperTorso=angles(0,0,0),
		LeftUpperArm=angles(-8,-4,-4),RightUpperArm=angles(-8,4,4),
	},"Ready")
end

local function makeGuardBreak(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(3,0,0),UpperTorso=angles(-4,0,0),
		LeftUpperArm=angles(-44,-15,-24),RightUpperArm=angles(-40,14,22),
	},"Guard")
	addFrame(sequence,row.duration*0.25,{
		LowerTorso=angles(16,0,10),UpperTorso=angles(25,-7,14),Head=angles(13,-9,-8),
		LeftUpperArm=angles(20,-8,-44),RightUpperArm=angles(28,8,48),
		LeftUpperLeg=angles(-16,0,-5),RightUpperLeg=angles(22,0,5),
	},"Break")
	addFrame(sequence,row.duration*0.65,{
		LowerTorso=angles(10,0,6),UpperTorso=angles(12,-3,8),
		LeftUpperArm=angles(6,-4,-22),RightUpperArm=angles(10,4,25),
		LeftLowerLeg=angles(18,0,0),
	},"Stagger")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(2,0,0),UpperTorso=angles(1,0,0),
		LeftUpperArm=angles(-6,0,-5),RightUpperArm=angles(-6,0,5),
	},"Recover")
end

local function makeCounterReady(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-4,-2,0),UpperTorso=angles(6,4,0),
		LeftUpperArm=angles(-28,-12,-18),RightUpperArm=angles(18,12,14),
		LeftUpperLeg=angles(-10,0,-3),RightUpperLeg=angles(14,0,3),
	},"WindowOpen")
	addFrame(sequence,row.duration*0.55,{
		LowerTorso=angles(-7,4,-2),UpperTorso=angles(9,-5,3),Head=angles(-2,-6,0),
		LeftUpperArm=angles(-18,-14,-12),RightUpperArm=angles(32,18,18),
	},"CounterPose")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(-1,0,0),UpperTorso=angles(1,0,0),
		LeftUpperArm=angles(-8,-4,-4),RightUpperArm=angles(-8,4,4),
	},"Close")
end


local function makeCrouch(sequence,row)
	for i=0,4 do
		local t=row.duration*i/4
		local sway=math.sin(i*math.pi/2)
		addFrame(sequence,t,{
			LowerTorso=angles(14+sway*1.2,0,sway*1.0),UpperTorso=angles(-8-sway*0.8,0,-sway*0.7),
			Head=angles(-4+sway*0.4,0,0),
			LeftUpperLeg=angles(-38,0,-5),RightUpperLeg=angles(-38,0,5),
			LeftLowerLeg=angles(62,0,0),RightLowerLeg=angles(62,0,0),
			LeftUpperArm=angles(-10,0,-8),RightUpperArm=angles(-10,0,8),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
	end
end

local function makeDodge(sequence,row)
	local d=row.direction or 1
	addFrame(sequence,0,{LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0)},"Ready")
	addFrame(sequence,row.duration*0.30,{
		LowerTorso=angles(8,-d*8,d*18),UpperTorso=angles(-5,d*10,-d*20),Head=angles(-2,d*12,-d*7),
		LeftUpperArm=angles(-18,-d*10,-22),RightUpperArm=angles(-18,d*10,22),
		LeftUpperLeg=angles(d<0 and -22 or 12,0,-6),RightUpperLeg=angles(d>0 and -22 or 12,0,6),
	},"Commit")
	addFrame(sequence,row.duration*0.68,{
		LowerTorso=angles(4,-d*5,d*9),UpperTorso=angles(-2,d*7,-d*10),
		LeftUpperLeg=angles(6,0,-2),RightUpperLeg=angles(6,0,2),
	},"Slide")
	addFrame(sequence,row.duration,{LowerTorso=angles(-1,0,0),UpperTorso=angles(1,0,0)},"Recover")
end

local function makeRoll(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(12,0,0),UpperTorso=angles(-8,0,0),
		LeftUpperLeg=angles(-24,0,-3),RightUpperLeg=angles(-24,0,3),
		LeftLowerLeg=angles(48,0,0),RightLowerLeg=angles(48,0,0),
	},"Compress")
	addFrame(sequence,row.duration*0.32,{
		LowerTorso=angles(52,0,0),UpperTorso=angles(38,0,0),Head=angles(28,0,0),
		LeftUpperArm=angles(42,0,-20),RightUpperArm=angles(42,0,20),
	},"Tuck")
	addFrame(sequence,row.duration*0.65,{
		LowerTorso=angles(78,0,0),UpperTorso=angles(70,0,0),Head=angles(45,0,0),
		LeftUpperLeg=angles(-42,0,-4),RightUpperLeg=angles(-42,0,4),
		LeftLowerLeg=angles(72,0,0),RightLowerLeg=angles(72,0,0),
	},"Roll")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(-3,0,0),UpperTorso=angles(2,0,0),
		LeftUpperLeg=angles(8,0,-2),RightUpperLeg=angles(8,0,2),
	},"Recover")
end

local function makeClimb(sequence,row)
	for i=0,6 do
		local t=row.duration*i/6
		local phase=math.pi*2*i/6
		local a=math.sin(phase)
		addFrame(sequence,t,{
			LowerTorso=angles(-6,0,a*2),UpperTorso=angles(9,0,-a*2),Head=angles(-3,0,a),
			LeftUpperArm=angles(-95+a*32,0,-8),LeftLowerArm=angles(-28-math.max(0,a)*32,0,0),
			RightUpperArm=angles(-95-a*32,0,8),RightLowerArm=angles(-28-math.max(0,-a)*32,0,0),
			LeftUpperLeg=angles(18-a*28,0,-3),LeftLowerLeg=angles(38+math.max(0,-a)*26,0,0),
			RightUpperLeg=angles(18+a*28,0,3),RightLowerLeg=angles(38+math.max(0,a)*26,0,0),
		},i==0 and "LoopStart" or i==6 and "LoopEnd" or nil)
	end
end

local function makeSwim(sequence,row)
	for i=0,6 do
		local t=row.duration*i/6
		local phase=math.pi*2*i/6
		local a=math.sin(phase)
		addFrame(sequence,t,{
			LowerTorso=angles(-12,a*2,a*3),UpperTorso=angles(8,-a*3,-a*4),Head=angles(-5,a*2,0),
			LeftUpperArm=angles(-55+a*48,-18,-12),LeftLowerArm=angles(-25-a*22,0,-6),
			RightUpperArm=angles(-55-a*48,18,12),RightLowerArm=angles(-25+a*22,0,6),
			LeftUpperLeg=angles(a*18,0,-2),RightUpperLeg=angles(-a*18,0,2),
			LeftLowerLeg=angles(math.max(0,-a)*22,0,0),RightLowerLeg=angles(math.max(0,a)*22,0,0),
		},i==0 and "LoopStart" or i==6 and "LoopEnd" or nil)
	end
end

local function makeInteract(sequence,row)
	addFrame(sequence,0,{},"Ready")
	addFrame(sequence,row.duration*0.45,{
		UpperTorso=angles(3,-8,0),Head=angles(-2,-10,0),
		RightUpperArm=angles(-52,22,18),RightLowerArm=angles(-38,0,6),RightHand=angles(-8,0,-3),
	},"Reach")
	addFrame(sequence,row.duration,{UpperTorso=angles(1,0,0),RightUpperArm=angles(-6,3,5)},"Return")
end

local function makeGather(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-5,-8,0),UpperTorso=angles(8,12,0),
		RightUpperArm=angles(-78,18,32),RightLowerArm=angles(-35,0,12),
	},"Windup")
	addFrame(sequence,row.duration*0.42,{
		LowerTorso=angles(8,14,4),UpperTorso=angles(-8,-18,-6),
		RightUpperArm=angles(42,-26,18),RightLowerArm=angles(-12,0,8),
		LeftUpperArm=angles(-18,0,-10),
	},"Contact")
	addFrame(sequence,row.duration,{LowerTorso=angles(-1,0,0),UpperTorso=angles(1,0,0)},"Recover")
end

local function makeCraft(sequence,row)
	-- 모션 · 반주기 간격은 sin(n*pi)=0으로 모든 손동작을 없앤다. 한 주기를 8등분한다.
	for i=0,8 do
		local t=row.duration*i/8
		local a=math.sin(i*math.pi/4)
		addFrame(sequence,t,{
			UpperTorso=angles(6,a*5,0),Head=angles(4,-a*4,0),
			LeftUpperArm=angles(-48+a*12,-10,-14),LeftLowerArm=angles(-58-a*18,0,-8),
			RightUpperArm=angles(-48-a*12,10,14),RightLowerArm=angles(-58+a*18,0,8),
		},i==0 and "LoopStart" or i==8 and "LoopEnd" or nil)
	end
end

local function makeCarry(sequence,row)
	for i=0,4 do
		local t=row.duration*i/4
		local breathe=math.sin(i*math.pi/2)
		addFrame(sequence,t,{
			LowerTorso=angles(4+breathe*0.5,0,0),UpperTorso=angles(-2-breathe*0.5,0,0),
			LeftUpperArm=angles(-55,-12,-18),LeftLowerArm=angles(-78,0,-8),
			RightUpperArm=angles(-55,12,18),RightLowerArm=angles(-78,0,8),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
	end
end

local function makeEquip(sequence,row)
	addFrame(sequence,0,{RightUpperArm=angles(-6,3,5)},"Start")
	addFrame(sequence,row.duration*0.48,{
		UpperTorso=angles(2,-8,0),RightUpperArm=angles(-72,18,24),RightLowerArm=angles(-58,0,10),
	},"Draw")
	addFrame(sequence,row.duration,{
		UpperTorso=angles(0,0,0),RightUpperArm=angles(-18,8,10),RightLowerArm=angles(-20,0,5),
	},"Ready")
end

local function makeUnequip(sequence,row)
	addFrame(sequence,0,{RightUpperArm=angles(-18,8,10),RightLowerArm=angles(-20,0,5)},"Ready")
	addFrame(sequence,row.duration*0.52,{
		UpperTorso=angles(2,-8,0),RightUpperArm=angles(-72,18,24),RightLowerArm=angles(-58,0,10),
	},"Stow")
	addFrame(sequence,row.duration,{RightUpperArm=angles(-6,3,5)},"End")
end

local function makeConsumable(sequence,row)
	addFrame(sequence,0,{},"Ready")
	addFrame(sequence,row.duration*0.42,{
		Head=angles(-8,-4,0),RightUpperArm=angles(-92,14,24),RightLowerArm=angles(-105,0,12),RightHand=angles(-14,0,0),
	},"Use")
	addFrame(sequence,row.duration*0.72,{
		Head=angles(4,0,0),RightUpperArm=angles(-45,8,14),RightLowerArm=angles(-60,0,7),
	},"Finish")
	addFrame(sequence,row.duration,{},"Recover")
end

local function makeDowned(sequence,row)
	for i=0,4 do
		local t=row.duration*i/4
		local breathe=math.sin(i*math.pi/2)
		addFrame(sequence,t,{
			LowerTorso=angles(58,0,4),UpperTorso=angles(48+breathe*1.2,0,-5),Head=angles(32+breathe*0.8,0,6),
			LeftUpperArm=angles(42,0,-32),RightUpperArm=angles(38,0,30),
			LeftUpperLeg=angles(-28,0,-5),RightUpperLeg=angles(-16,0,7),
			LeftLowerLeg=angles(46,0,0),RightLowerLeg=angles(30,0,0),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
	end
end

local function makeRevive(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(10,0,0),UpperTorso=angles(-6,0,0),
		LeftUpperLeg=angles(-34,0,-4),RightUpperLeg=angles(-12,0,4),LeftLowerLeg=angles(62,0,0),RightLowerLeg=angles(28,0,0),
	},"Kneel")
	addFrame(sequence,row.duration*0.50,{
		UpperTorso=angles(12,-8,0),Head=angles(8,-8,0),
		LeftUpperArm=angles(-62,-12,-18),LeftLowerArm=angles(-72,0,-8),
		RightUpperArm=angles(-62,12,18),RightLowerArm=angles(-72,0,8),
	},"Assist")
	addFrame(sequence,row.duration,{LowerTorso=angles(2,0,0),UpperTorso=angles(0,0,0)},"Release")
end

local function makeEmote(sequence,row)
	addFrame(sequence,0,{},"Ready")
	addFrame(sequence,row.duration*0.28,{RightUpperArm=angles(-125,8,28),RightLowerArm=angles(-18,0,12),RightHand=angles(0,0,-12)},"Raise")
	addFrame(sequence,row.duration*0.52,{RightUpperArm=angles(-132,-12,18),RightLowerArm=angles(-22,0,18)},"WaveLeft")
	addFrame(sequence,row.duration*0.76,{RightUpperArm=angles(-132,18,32),RightLowerArm=angles(-22,0,4)},"WaveRight")
	addFrame(sequence,row.duration,{},"Return")
end


local function makeLightAttack(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0),Head=angles(0,0,0),
		RightUpperArm=angles(-12,6,8),RightLowerArm=angles(20,0,2),
		LeftUpperArm=angles(6,-4,-9),LeftLowerArm=angles(24,0,-2),
		LeftUpperLeg=angles(8,0,0),LeftLowerLeg=angles(-8,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(4,0,0),RightLowerLeg=angles(-4,0,0),RightFoot=angles(2,0,0),
	},"Anticipation")
	addFrame(sequence,row.duration*0.18,{
		LowerTorso=angles(-5,-12,-2),UpperTorso=angles(8,22,3),Head=angles(-3,-8,-1),
		RightUpperArm=angles(-58,22,30),RightLowerArm=angles(38,0,9),RightHand=angles(-8,4,6),
		LeftUpperArm=angles(15,-8,-16),LeftLowerArm=angles(32,0,-4),
		LeftUpperLeg=angles(15,0,2),LeftLowerLeg=angles(-14,0,0),LeftFoot=angles(4,0,0),
		RightUpperLeg=angles(7,0,2),RightLowerLeg=angles(-12,0,0),RightFoot=angles(10,0,0),
	},"Windup")
	addFrame(sequence,row.duration*0.30,{
		LowerTorso=angles(1,8,1),UpperTorso=angles(3,8,1),Head=angles(-2,-9,0),
		RightUpperArm=angles(-52,14,28),RightLowerArm=angles(30,0,6),RightHand=angles(-11,0,5),
		LeftUpperArm=angles(8,-5,-15),LeftLowerArm=angles(28,0,-3),
		LeftUpperLeg=angles(10,0,-1),LeftLowerLeg=angles(-12,0,0),LeftFoot=angles(1,0,0),
		RightUpperLeg=angles(11,0,-1),RightLowerLeg=angles(-10,0,0),RightFoot=angles(-2,0,0),
	},"Drive")
	addFrame(sequence,row.duration*0.42,{
		LowerTorso=angles(6,15,3),UpperTorso=angles(-7,-22,-5),Head=angles(-2,-12,0),
		RightUpperArm=angles(48,-38,12),RightLowerArm=angles(10,0,3),RightHand=angles(5,-4,-2),
		LeftUpperArm=angles(-16,0,-12),LeftLowerArm=angles(18,0,-2),
		LeftUpperLeg=angles(12,0,-3),LeftLowerLeg=angles(-20,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(-4,0,-3),RightLowerLeg=angles(-6,0,0),RightFoot=angles(4,0,0),
	},"Impact")
	addFrame(sequence,row.duration*0.54,{
		LowerTorso=angles(7,17,3),UpperTorso=angles(-6,-28,-4),Head=angles(0,-8,1),
		RightUpperArm=angles(58,-44,7),RightLowerArm=angles(22,0,1),RightHand=angles(11,-6,-4),
		LeftUpperArm=angles(-21,2,-10),LeftLowerArm=angles(22,0,-2),
		LeftUpperLeg=angles(12,0,-3),LeftLowerLeg=angles(-22,0,0),LeftFoot=angles(3,0,0),
		RightUpperLeg=angles(-3,0,-3),RightLowerLeg=angles(-7,0,0),RightFoot=angles(3,0,0),
	},"FollowThrough",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration*0.72,{
		LowerTorso=angles(2,5,1),UpperTorso=angles(1,-8,-1),Head=angles(0,-2,0),
		RightUpperArm=angles(12,-8,8),RightLowerArm=angles(30,0,3),RightHand=angles(4,0,-2),
		LeftUpperArm=angles(-3,-2,-9),LeftLowerArm=angles(26,0,-2),
		LeftUpperLeg=angles(10,0,-1),LeftLowerLeg=angles(-14,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(3,0,-1),RightLowerLeg=angles(-6,0,0),RightFoot=angles(1,0,0),
	},"Absorb",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration*0.88,{
		LowerTorso=angles(-2,-1,0),UpperTorso=angles(2,2,0),Head=angles(0,0,0),
		RightUpperArm=angles(-15,7,9),RightLowerArm=angles(22,0,2),RightHand=angles(-1,0,0),
		LeftUpperArm=angles(7,-4,-9),LeftLowerArm=angles(25,0,-2),
		LeftUpperLeg=angles(8,0,0),LeftLowerLeg=angles(-8,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(4,0,0),RightLowerLeg=angles(-4,0,0),RightFoot=angles(2,0,0),
	},"Settle",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0),Head=angles(0,0,0),
		RightUpperArm=angles(-12,6,8),RightLowerArm=angles(20,0,2),
		LeftUpperArm=angles(6,-4,-9),LeftLowerArm=angles(24,0,-2),
		LeftUpperLeg=angles(8,0,0),LeftLowerLeg=angles(-8,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(4,0,0),RightLowerLeg=angles(-4,0,0),RightFoot=angles(2,0,0),
	},"Recover")
end

local function makeHeavyAttack(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0),
		RightUpperArm=angles(-12,6,8),RightLowerArm=angles(20,0,2),
		LeftUpperArm=angles(6,-4,-9),LeftLowerArm=angles(24,0,-2),
		LeftUpperLeg=angles(8,0,0),LeftLowerLeg=angles(-8,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(4,0,0),RightLowerLeg=angles(-4,0,0),RightFoot=angles(2,0,0),
	},"DeepWindup")
	addFrame(sequence,row.duration*0.18,{
		LowerTorso=angles(-10,-16,-3),UpperTorso=angles(15,24,5),Head=angles(-4,-6,0),
		RightUpperArm=angles(-108,26,38),RightLowerArm=angles(48,0,12),RightHand=angles(-8,0,5),
		LeftUpperArm=angles(-62,-18,-26),LeftLowerArm=angles(40,0,-10),
		LeftUpperLeg=angles(24,0,3),LeftLowerLeg=angles(-28,0,0),LeftFoot=angles(14,0,0),
		RightUpperLeg=angles(18,0,3),RightLowerLeg=angles(-24,0,0),RightFoot=angles(16,0,0),
	},"Coil",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration*0.32,{
		LowerTorso=angles(-14,-12,-4),UpperTorso=angles(20,18,7),Head=angles(-5,-5,-1),
		RightUpperArm=angles(-142,22,35),RightLowerArm=angles(58,0,12),RightHand=angles(-12,0,6),
		LeftUpperArm=angles(-86,-14,-24),LeftLowerArm=angles(48,0,-8),
		LeftUpperLeg=angles(30,0,4),LeftLowerLeg=angles(-34,0,0),LeftFoot=angles(18,0,0),
		RightUpperLeg=angles(22,0,4),RightLowerLeg=angles(-28,0,0),RightFoot=angles(20,0,0),
	},"Commit")
	addFrame(sequence,row.duration*0.46,{
		LowerTorso=angles(3,14,2),UpperTorso=angles(10,-4,3),Head=angles(-1,-10,0),
		RightUpperArm=angles(-106,4,30),RightLowerArm=angles(35,0,7),RightHand=angles(-15,0,4),
		LeftUpperArm=angles(-56,-6,-20),LeftLowerArm=angles(32,0,-6),
		LeftUpperLeg=angles(15,0,-2),LeftLowerLeg=angles(-22,0,0),LeftFoot=angles(4,0,0),
		RightUpperLeg=angles(4,0,-2),RightLowerLeg=angles(-12,0,0),RightFoot=angles(5,0,0),
	},"Drive")
	addFrame(sequence,row.duration*0.58,{
		LowerTorso=angles(12,20,6),UpperTorso=angles(-16,-30,-8),Head=angles(5,-15,1),
		RightUpperArm=angles(68,-42,10),RightLowerArm=angles(4,0,2),RightHand=angles(8,-5,-3),
		LeftUpperArm=angles(34,24,-8),LeftLowerArm=angles(8,0,-2),
		LeftUpperLeg=angles(18,0,-6),LeftLowerLeg=angles(-34,0,0),LeftFoot=angles(4,0,0),
		RightUpperLeg=angles(-6,0,-6),RightLowerLeg=angles(-10,0,0),RightFoot=angles(4,0,0),
	},"HeavyImpact")
	addFrame(sequence,row.duration*0.69,{
		LowerTorso=angles(14,24,5),UpperTorso=angles(-14,-34,-7),Head=angles(8,-11,1),
		RightUpperArm=angles(80,-46,6),RightLowerArm=angles(20,0,2),RightHand=angles(14,-5,-4),
		LeftUpperArm=angles(44,25,-8),LeftLowerArm=angles(20,0,-3),
		LeftUpperLeg=angles(20,0,-5),LeftLowerLeg=angles(-40,0,0),LeftFoot=angles(6,0,0),
		RightUpperLeg=angles(-4,0,-5),RightLowerLeg=angles(-14,0,0),RightFoot=angles(4,0,0),
	},"FollowThrough",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration*0.86,{
		LowerTorso=angles(2,3,1),UpperTorso=angles(3,-5,-1),Head=angles(1,-1,0),
		RightUpperArm=angles(4,-4,10),RightLowerArm=angles(34,0,3),RightHand=angles(3,0,-1),
		LeftUpperArm=angles(9,0,-10),LeftLowerArm=angles(30,0,-3),
		LeftUpperLeg=angles(11,0,-1),LeftLowerLeg=angles(-14,0,0),LeftFoot=angles(1,0,0),
		RightUpperLeg=angles(5,0,-1),RightLowerLeg=angles(-8,0,0),RightFoot=angles(1,0,0),
	},"Absorb",Enum.PoseEasingStyle.Cubic)
	addFrame(sequence,row.duration,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0),
		RightUpperArm=angles(-12,6,8),RightLowerArm=angles(20,0,2),
		LeftUpperArm=angles(6,-4,-9),LeftLowerArm=angles(24,0,-2),
		LeftUpperLeg=angles(8,0,0),LeftLowerLeg=angles(-8,0,0),LeftFoot=angles(2,0,0),
		RightUpperLeg=angles(4,0,0),RightLowerLeg=angles(-4,0,0),RightFoot=angles(2,0,0),
	},"Recover")
end

local function makeRangedAttack(sequence,row)
	addFrame(sequence,0,{
		UpperTorso=angles(-3,-8,0),LeftUpperArm=angles(-82,-8,-24),LeftLowerArm=angles(-18,0,-8),
		RightUpperArm=angles(-74,22,24),RightLowerArm=angles(-98,0,12),
	},"Raise")
	addFrame(sequence,row.duration*0.48,{
		UpperTorso=angles(-5,-12,0),Head=angles(-2,-8,0),
		LeftUpperArm=angles(-92,-8,-18),LeftLowerArm=angles(-12,0,-6),
		RightUpperArm=angles(-88,26,30),RightLowerArm=angles(-112,0,14),
	},"AimDraw")
	addFrame(sequence,row.duration*0.64,{
		UpperTorso=angles(-1,-5,0),LeftUpperArm=angles(-78,-4,-16),
		RightUpperArm=angles(-40,8,12),RightLowerArm=angles(-38,0,6),
	},"Release")
	addFrame(sequence,row.duration,{},"Recover")
end

local function makeCast(sequence,row)
	addFrame(sequence,0,{LeftUpperArm=angles(-22,-8,-12),RightUpperArm=angles(-22,8,12)},"Gather")
	addFrame(sequence,row.duration*0.48,{
		UpperTorso=angles(-5,0,0),Head=angles(-4,0,0),
		LeftUpperArm=angles(-88,-24,-34),LeftLowerArm=angles(-68,0,-14),
		RightUpperArm=angles(-88,24,34),RightLowerArm=angles(-68,0,14),
	},"Charge")
	addFrame(sequence,row.duration*0.68,{
		UpperTorso=angles(5,0,0),LeftUpperArm=angles(-42,-38,-25),RightUpperArm=angles(-42,38,25),
		LeftLowerArm=angles(-18,0,-6),RightLowerArm=angles(-18,0,6),
	},"Release")
	addFrame(sequence,row.duration,{},"Recover")
end

local function makeChannel(sequence,row)
	for i=0,4 do
		local t=row.duration*i/4
		local pulse=math.sin(i*math.pi/2)
		addFrame(sequence,t,{
			LowerTorso=angles(-2+pulse*0.5,0,0),UpperTorso=angles(4-pulse*0.6,0,0),Head=angles(-3+pulse*0.4,0,0),
			LeftUpperArm=angles(-72-pulse*6,-22,-30),LeftLowerArm=angles(-58-pulse*5,0,-12),
			RightUpperArm=angles(-72+pulse*6,22,30),RightLowerArm=angles(-58+pulse*5,0,12),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
	end
end

local function makeHitBack(sequence,row)
	addFrame(sequence,0,{},"Ready")
	addFrame(sequence,row.duration*0.24,{
		LowerTorso=angles(-10,0,-8),UpperTorso=angles(-16,6,-12),Head=angles(-8,8,8),
		LeftUpperArm=angles(20,0,-18),RightUpperArm=angles(-14,0,16),
		LeftUpperLeg=angles(12,0,-3),RightUpperLeg=angles(-8,0,3),
	},"BackRecoil")
	addFrame(sequence,row.duration*0.64,{LowerTorso=angles(-4,0,-3),UpperTorso=angles(-5,2,-5)},"Absorb")
	addFrame(sequence,row.duration,{},"Recover")
end


local function makeLifeAction(sequence,row)
	local v=row.variant
	if v=="SIT_DOWN" then
		addFrame(sequence,0,{LowerTorso=angles(0,0,0),UpperTorso=angles(0,0,0)},"Stand")
		addFrame(sequence,row.duration*0.48,{LowerTorso=angles(16,0,0),UpperTorso=angles(-9,0,0),LeftUpperLeg=angles(-38,0,-4),RightUpperLeg=angles(-38,0,4),LeftLowerLeg=angles(64,0,0),RightLowerLeg=angles(64,0,0),LeftUpperArm=angles(-10,0,-8),RightUpperArm=angles(-10,0,8)},"Lower")
		addFrame(sequence,row.duration,{LowerTorso=angles(10,0,0),UpperTorso=angles(-5,0,0),LeftUpperLeg=angles(-72,0,-4),RightUpperLeg=angles(-72,0,4),LeftLowerLeg=angles(82,0,0),RightLowerLeg=angles(82,0,0)},"Seated")
	elseif v=="STAND_UP" then
		addFrame(sequence,0,{LowerTorso=angles(10,0,0),UpperTorso=angles(-5,0,0),LeftUpperLeg=angles(-72,0,-4),RightUpperLeg=angles(-72,0,4),LeftLowerLeg=angles(82,0,0),RightLowerLeg=angles(82,0,0)},"Seated")
		addFrame(sequence,row.duration*0.48,{LowerTorso=angles(18,0,0),UpperTorso=angles(-10,0,0),LeftUpperLeg=angles(-34,0,-3),RightUpperLeg=angles(-34,0,3),LeftLowerLeg=angles(58,0,0),RightLowerLeg=angles(58,0,0)},"Rise")
		addFrame(sequence,row.duration,{},"Stand")
	elseif v=="LEAN" then
		for i=0,4 do
			local t=row.duration*i/4
			local b=math.sin(i*math.pi/2)
			addFrame(sequence,t,{LowerTorso=angles(-5,0,8),UpperTorso=angles(6,0,-10),Head=angles(-2,b*2,4),LeftUpperArm=angles(-8,0,-16),RightUpperArm=angles(-5,0,8),LeftUpperLeg=angles(-6,0,-4),RightUpperLeg=angles(8,0,4)},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
		end
	elseif v=="OPEN_DOOR" or v=="OPEN_CONTAINER" then
		addFrame(sequence,0,{},"Ready")
		addFrame(sequence,row.duration*0.42,{UpperTorso=angles(5,-12,0),Head=angles(-2,-14,0),RightUpperArm=angles(-62,28,18),RightLowerArm=angles(-54,0,6),RightHand=angles(-12,0,-4)},"Grip")
		addFrame(sequence,row.duration*0.72,{LowerTorso=angles(-2,10,0),UpperTorso=angles(4,-22,0),RightUpperArm=angles(-34,48,20),RightLowerArm=angles(-42,0,8)},"Open")
		addFrame(sequence,row.duration,{UpperTorso=angles(1,0,0),RightUpperArm=angles(-8,4,5)},"Release")
	elseif v=="PICKUP" or v=="PLACE" then
		addFrame(sequence,0,{LowerTorso=angles(2,0,0)},"Ready")
		addFrame(sequence,row.duration*0.42,{LowerTorso=angles(32,0,0),UpperTorso=angles(18,0,0),Head=angles(8,0,0),LeftUpperLeg=angles(-26,0,-3),RightUpperLeg=angles(-26,0,3),LeftLowerLeg=angles(42,0,0),RightLowerLeg=angles(42,0,0),LeftUpperArm=angles(-74,-8,-18),RightUpperArm=angles(-74,8,18),LeftLowerArm=angles(-62,0,-8),RightLowerArm=angles(-62,0,8)},"ReachGround")
		addFrame(sequence,row.duration*0.70,{LowerTorso=angles(18,0,0),UpperTorso=angles(8,0,0),LeftUpperArm=angles(-48,-10,-16),RightUpperArm=angles(-48,10,16),LeftLowerArm=angles(-76,0,-8),RightLowerArm=angles(-76,0,8)},"HandleObject")
		addFrame(sequence,row.duration,{},"Recover")
	elseif v=="PUSH" or v=="PULL" then
		local dir=v=="PUSH" and 1 or -1
		for i=0,4 do
			local t=row.duration*i/4
			local a=math.sin(i*math.pi/2)
			addFrame(sequence,t,{LowerTorso=angles(-dir*9+a*2,0,0),UpperTorso=angles(dir*7-a*2,0,0),Head=angles(-dir*3,0,0),LeftUpperArm=angles(-68,-12,-18),LeftLowerArm=angles(-34-dir*24,0,-8),RightUpperArm=angles(-68,12,18),RightLowerArm=angles(-34-dir*24,0,8),LeftUpperLeg=angles(-dir*10+a*8,0,-3),RightUpperLeg=angles(dir*7-a*8,0,3)},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
		end
	elseif v=="TALK_GESTURE" then
		addFrame(sequence,0,{},"Neutral")
		addFrame(sequence,row.duration*0.32,{UpperTorso=angles(2,-5,0),Head=angles(-2,-8,0),RightUpperArm=angles(-58,24,24),RightLowerArm=angles(-72,0,12),LeftUpperArm=angles(-18,-8,-10)},"Explain")
		addFrame(sequence,row.duration*0.64,{UpperTorso=angles(1,6,0),Head=angles(-1,10,0),LeftUpperArm=angles(-52,-26,-22),LeftLowerArm=angles(-62,0,-10),RightUpperArm=angles(-24,10,12)},"Respond")
		addFrame(sequence,row.duration,{},"Neutral")
	elseif v=="NPC_WORK" or v=="COOK" or v=="FARM" then
		for i=0,4 do
			local t=row.duration*i/4
			local a=math.sin(i*math.pi/2)
			local farm=v=="FARM" and 1 or 0
			addFrame(sequence,t,{LowerTorso=angles(5+farm*8,0,a*2),UpperTorso=angles(-2+farm*5,a*4,-a*2),Head=angles(3,-a*3,0),LeftUpperArm=angles(-52+a*18,-12,-16),LeftLowerArm=angles(-62-a*18,0,-8),RightUpperArm=angles(-52-a*18,12,16),RightLowerArm=angles(-62+a*18,0,8)},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
		end
	elseif v=="FISH" then
		addFrame(sequence,0,{LowerTorso=angles(-4,-8,0),UpperTorso=angles(7,12,0),RightUpperArm=angles(-100,18,28),RightLowerArm=angles(-72,0,12),LeftUpperArm=angles(-58,-12,-18),LeftLowerArm=angles(-78,0,-8)},"BackCast")
		addFrame(sequence,row.duration*0.45,{LowerTorso=angles(7,10,2),UpperTorso=angles(-8,-16,-3),RightUpperArm=angles(28,-22,12),RightLowerArm=angles(-12,0,4),LeftUpperArm=angles(-36,-8,-12)},"Cast")
		addFrame(sequence,row.duration,{UpperTorso=angles(1,0,0),RightUpperArm=angles(-38,8,12),RightLowerArm=angles(-58,0,8),LeftUpperArm=angles(-32,-8,-12),LeftLowerArm=angles(-54,0,-8)},"Hold")
	elseif v=="BED" then
		addFrame(sequence,0,{},"Stand")
		addFrame(sequence,row.duration*0.45,{LowerTorso=angles(30,0,0),UpperTorso=angles(22,0,0),LeftUpperLeg=angles(-28,0,-3),RightUpperLeg=angles(-28,0,3),LeftLowerLeg=angles(46,0,0),RightLowerLeg=angles(46,0,0)},"Lower")
		addFrame(sequence,row.duration,{LowerTorso=angles(78,0,0),UpperTorso=angles(72,0,0),Head=angles(34,0,0),LeftUpperArm=angles(22,0,-16),RightUpperArm=angles(20,0,16),LeftUpperLeg=angles(-12,0,-3),RightUpperLeg=angles(-8,0,3),LeftLowerLeg=angles(18,0,0),RightLowerLeg=angles(14,0,0)},"Lie")
	elseif v=="LADDER_ENTER" then
		addFrame(sequence,0,{},"Approach")
		addFrame(sequence,row.duration*0.52,{LowerTorso=angles(-5,0,0),UpperTorso=angles(8,0,0),LeftUpperArm=angles(-88,-6,-8),RightUpperArm=angles(-72,8,8),LeftUpperLeg=angles(18,0,-3),RightUpperLeg=angles(-10,0,3),LeftLowerLeg=angles(42,0,0)},"Grip")
		addFrame(sequence,row.duration,{LowerTorso=angles(-6,0,0),UpperTorso=angles(9,0,0),LeftUpperArm=angles(-112,0,-8),RightUpperArm=angles(-78,0,8),LeftUpperLeg=angles(22,0,-3),RightUpperLeg=angles(-12,0,3)},"ClimbReady")
	elseif v=="LADDER_EXIT" then
		addFrame(sequence,0,{LowerTorso=angles(-6,0,0),UpperTorso=angles(9,0,0),LeftUpperArm=angles(-112,0,-8),RightUpperArm=angles(-78,0,8),LeftUpperLeg=angles(22,0,-3),RightUpperLeg=angles(-12,0,3)},"Climb")
		addFrame(sequence,row.duration*0.55,{LowerTorso=angles(18,0,0),UpperTorso=angles(-8,0,0),LeftUpperArm=angles(-58,-8,-10),RightUpperArm=angles(-52,8,10),LeftUpperLeg=angles(-34,0,-4),RightUpperLeg=angles(12,0,4),LeftLowerLeg=angles(62,0,0)},"StepOver")
		addFrame(sequence,row.duration,{},"Stand")
	elseif v=="SLOPE_ASCEND" or v=="SLOPE_DESCEND" or v=="INJURY" then
		for i=0,6 do
			local t=row.duration*i/6
			local phase=math.pi*2*i/6
			local profile=v=="INJURY" and {stride=0.40,lift=0.12,lean=0.10} or {stride=0.62,lift=0.22,lean=v=="SLOPE_ASCEND" and 0.16 or -0.08}
			local pose=locomotionTransforms(phase,profile)
			if v=="INJURY" then
				pose.UpperTorso=angles(10,-5,8)
				pose.LeftUpperArm=angles(-28,-10,-26)
				pose.LeftLowerArm=angles(-72,0,-12)
			elseif v=="SLOPE_ASCEND" then
				pose.LowerTorso=angles(-10,0,0)
				pose.UpperTorso=angles(8,0,0)
			else
				pose.LowerTorso=angles(7,0,0)
				pose.UpperTorso=angles(-5,0,0)
			end
			addFrame(sequence,t,pose,i==0 and "LoopStart" or i==6 and "LoopEnd" or nil)
		end
	elseif v=="FATIGUE" then
		for i=0,4 do
			local t=row.duration*i/4
			local b=math.sin(i*math.pi/2)
			addFrame(sequence,t,{LowerTorso=angles(10+b*1.2,0,0),UpperTorso=angles(14+b*1.5,0,0),Head=angles(10+b,0,0),LeftUpperArm=angles(-22,0,-12),LeftLowerArm=angles(-78,0,-8),RightUpperArm=angles(-22,0,12),RightLowerArm=angles(-78,0,8),LeftUpperLeg=angles(-6,0,-3),RightUpperLeg=angles(5,0,3)},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
		end
	else
		makeInteract(sequence,row)
	end
end

local function makeBlend(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-2,0,0),UpperTorso=angles(2,0,0),
		LeftUpperArm=angles(-10,0,-6),RightUpperArm=angles(-10,0,6),
	},"From")
	addFrame(sequence,row.duration,{
		LowerTorso=angles(0,0,0),UpperTorso=angles(0,0,0),
		LeftUpperArm=angles(-4,0,-4),RightUpperArm=angles(-4,0,4),
	},"Neutral")
end

local BUILDERS = table.freeze({
	IDLE = makeIdle,
	LOCOMOTION = makeLocomotion,
	START = makeStart,
	STOP = makeStop,
	TURN = makeTurn,
	JUMP = makeJump,
	LAND = makeLand,
	HIT = makeHit,
	DEATH = makeDeath,
	BLOCK_RAISE = makeBlockRaise,
	BLOCK_HOLD = makeBlockHold,
	PARRY = makeParry,
	GUARD_BREAK = makeGuardBreak,
	COUNTER_READY = makeCounterReady,
	CROUCH = makeCrouch,
	DODGE = makeDodge,
	ROLL = makeRoll,
	CLIMB = makeClimb,
	SWIM = makeSwim,
	INTERACT = makeInteract,
	GATHER = makeGather,
	CRAFT = makeCraft,
	CARRY = makeCarry,
	EQUIP = makeEquip,
	UNEQUIP = makeUnequip,
	CONSUMABLE = makeConsumable,
	DOWNED = makeDowned,
	REVIVE = makeRevive,
	EMOTE = makeEmote,
	LIGHT_ATTACK = makeLightAttack,
	HEAVY_ATTACK = makeHeavyAttack,
	RANGED_ATTACK = makeRangedAttack,
	CAST = makeCast,
	CHANNEL = makeChannel,
	HIT_BACK = makeHitBack,
	BLEND = makeBlend,
	LIFE_ACTION = makeLifeAction,
})

local function resolve(atomId)
	local id = string.upper(tostring(atomId or ""))
	local row = MOTION[id]
	assert(row, "UNKNOWN_COMMON_MOTION_ATOM: " .. tostring(atomId))
	return id, row
end

-- 메인: 호출자가 소유한 Bone/Motor6D 자세를 프레임률과 무관하게 블렌딩한다.
-- 자체 반복 루프·루트 이동·피해 판정·애니메이션 자산 등록은 만들지 않는다.
function RobloxCommonMotion.BindJointPose(joints, options)
 options=options or {}
 local rows={}
 local closed=false
 for name,joint in pairs(joints or {})do
  if typeof(joint)=="Instance"and(joint:IsA("Bone")or joint:IsA("Motor6D"))then
   rows[#rows+1]={name=name,joint=joint,base=joint.Transform,pose=CFrame.identity,
    response=math.max(1,tonumber((options.responseByJoint or {})[name])or tonumber(options.response)or 18)}
  end
 end
 local controller={jointCount=#rows}
 function controller.Step(targets,dt,responseScale)
  if closed then return end
  local elapsed=math.clamp(tonumber(dt)or 1/60,0,.15)
  local response=math.clamp(tonumber(responseScale)or 1,.1,4)
  for _,row in ipairs(rows)do
   if row.joint.Parent then
    local target=targets and targets[row.name]
    if typeof(target)~="CFrame"then target=CFrame.identity end
    local alpha=1-math.exp(-row.response*response*elapsed)
    row.pose=row.pose:Lerp(target,alpha)
    row.joint.Transform=row.base*row.pose
   end
  end
 end
 function controller.Reset()
  if closed then return end
  for _,row in ipairs(rows)do
   row.pose=CFrame.identity
   if row.joint.Parent then row.joint.Transform=row.base end
  end
 end
 function controller.Destroy(restore)
  if closed then return end
  if restore~=false then controller.Reset()end
  closed=true
  table.clear(rows)
 end
 return controller
end

-- Fast unarmed presentation for an existing articulated humanoid. One action per
-- attack event may drive a linked visual chain; damage stays with the server.
-- No root motion, physics impulse or private update loop.
-- Canonical joint deltas; callers map only joints present in their approved rig.
local unarmedKeys={"Spine","Chest","Head","UpperArmL","UpperArmR","ForearmL","ForearmR","HandL","HandR"}
local function actionFrame(x,y,z)return CFrame.Angles(math.rad(x),math.rad(y),math.rad(z))end
local unarmedGuard={
 Spine=actionFrame(-3,-8,0),Chest=actionFrame(0,-6,0),Head=actionFrame(2,9,0),
 UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-31,12,18),
 ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-88,0,0),
 HandL=actionFrame(0,0,-4),HandR=actionFrame(0,0,4),
}
local unarmedActions={
 {id="JAB_LEFT",kind="HAND",pose={Spine=actionFrame(0.9,9.9,-2),Chest=actionFrame(-3,18,-4),Head=actionFrame(3,-10.8,1.2),UpperArmL=actionFrame(-86,-8,-6),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-12,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="CROSS_RIGHT",kind="HAND",pose={Spine=actionFrame(1.2,-16.5,2.5),Chest=actionFrame(-4,-30,5),Head=actionFrame(3,18,-1.5),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-96,6,7),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-9,0,0)}},
 {id="HOOK_LEFT",kind="HAND",pose={Spine=actionFrame(0.9,20.9,-3.5),Chest=actionFrame(-3,38,-7),Head=actionFrame(3,-22.8,2.1),UpperArmL=actionFrame(-76,28,-45),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-76,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="HOOK_RIGHT",kind="HAND",pose={Spine=actionFrame(0.9,-20.9,3.5),Chest=actionFrame(-3,-38,7),Head=actionFrame(3,22.8,-2.1),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-76,-28,45),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-76,0,0)}},
 {id="UPPERCUT_LEFT",kind="HAND",pose={Spine=actionFrame(3.6,13.75,-4),Chest=actionFrame(-12,25,-8),Head=actionFrame(3,-15,2.4),UpperArmL=actionFrame(-110,4,-20),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-92,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="UPPERCUT_RIGHT",kind="HAND",pose={Spine=actionFrame(3.6,-13.75,4),Chest=actionFrame(-12,-25,8),Head=actionFrame(3,15,-2.4),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-110,-4,20),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-92,0,0)}},
 {id="BACKFIST_LEFT",kind="HAND",pose={Spine=actionFrame(0.6,-13.75,-2.5),Chest=actionFrame(-2,-25,-5),Head=actionFrame(3,15,1.5),UpperArmL=actionFrame(-73,-36,-55),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-22,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="BACKFIST_RIGHT",kind="HAND",pose={Spine=actionFrame(0.6,13.75,2.5),Chest=actionFrame(-2,25,5),Head=actionFrame(3,-15,-1.5),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-73,36,55),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-22,0,0)}},
 {id="HAMMER_LEFT",kind="HAND",pose={Spine=actionFrame(-3.6,8.8,-3.5),Chest=actionFrame(12,16,-7),Head=actionFrame(3,-9.6,2.1),UpperArmL=actionFrame(-112,-5,-12),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-35,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="HAMMER_RIGHT",kind="HAND",pose={Spine=actionFrame(-3.6,-8.8,3.5),Chest=actionFrame(12,-16,7),Head=actionFrame(3,9.6,-2.1),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-112,5,12),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-35,0,0)}},
 {id="ELBOW_LEFT",kind="HAND",pose={Spine=actionFrame(1.5,23.65,-5),Chest=actionFrame(-5,43,-10),Head=actionFrame(3,-25.8,3),UpperArmL=actionFrame(-68,37,-62),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-125,0,0),ForearmR=actionFrame(-88,0,0)}},
 {id="ELBOW_RIGHT",kind="HAND",pose={Spine=actionFrame(1.5,-23.65,5),Chest=actionFrame(-5,-43,10),Head=actionFrame(3,25.8,-3),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-68,-37,62),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-125,0,0)}},
 {id="KNEE_LEFT",kind="KNEE",pose={Spine=actionFrame(3.6,6.6,-3),Chest=actionFrame(-12,12,-6),Head=actionFrame(3,-7.2,1.8),UpperArmL=actionFrame(-46,0,-22),UpperArmR=actionFrame(-48,0,22),ForearmL=actionFrame(-80,0,0),ForearmR=actionFrame(-80,0,0),ThighL=actionFrame(-85,0,-7),ShinL=actionFrame(115,0,0),FootL=actionFrame(-25,0,0)}},
 {id="KNEE_RIGHT",kind="KNEE",pose={Spine=actionFrame(3.6,-6.6,3),Chest=actionFrame(-12,-12,6),Head=actionFrame(3,7.2,-1.8),UpperArmL=actionFrame(-48,0,-22),UpperArmR=actionFrame(-46,0,22),ForearmL=actionFrame(-80,0,0),ForearmR=actionFrame(-80,0,0),ThighR=actionFrame(-85,0,7),ShinR=actionFrame(115,0,0),FootR=actionFrame(-25,0,0)}},
 {id="DIAGONAL_KNEE_LEFT",kind="KNEE",pose={Spine=actionFrame(2.4,15.4,-6),Chest=actionFrame(-8,28,-12),Head=actionFrame(3,-16.8,3.6),UpperArmL=actionFrame(-64,0,-25),UpperArmR=actionFrame(-52,0,25),ForearmL=actionFrame(-95,0,0),ForearmR=actionFrame(-95,0,0),ThighL=actionFrame(-72,24,-22),ShinL=actionFrame(122,0,0),FootL=actionFrame(-18,0,0)}},
 {id="DIAGONAL_KNEE_RIGHT",kind="KNEE",pose={Spine=actionFrame(2.4,-15.4,6),Chest=actionFrame(-8,-28,12),Head=actionFrame(3,16.8,-3.6),UpperArmL=actionFrame(-52,0,-25),UpperArmR=actionFrame(-64,0,25),ForearmL=actionFrame(-95,0,0),ForearmR=actionFrame(-95,0,0),ThighR=actionFrame(-72,-24,22),ShinR=actionFrame(122,0,0),FootR=actionFrame(-18,0,0)}},
 {id="FRONT_KICK_L",kind="KICK",pose={Spine=actionFrame(5.1,4.4,-2.5),Chest=actionFrame(-17,8,-5),Head=actionFrame(3,-4.8,1.5),UpperArmL=actionFrame(-52,0,-28),UpperArmR=actionFrame(-52,0,28),ForearmL=actionFrame(-76,0,0),ForearmR=actionFrame(-76,0,0),ThighL=actionFrame(-92,0,-5),ShinL=actionFrame(10,0,0),FootL=actionFrame(12,0,0)}},
 {id="SIDE_KICK_L",kind="KICK",pose={Spine=actionFrame(2.4,15.4,9),Chest=actionFrame(-8,28,18),Head=actionFrame(3,-16.8,-5.4),UpperArmL=actionFrame(-45,8,-38),UpperArmR=actionFrame(-45,-8,38),ForearmL=actionFrame(-65,0,0),ForearmR=actionFrame(-65,0,0),ThighL=actionFrame(-38,32,-68),ShinL=actionFrame(12,0,0),FootL=actionFrame(0,0,15)}},
 {id="ROUND_KICK_L",kind="KICK",pose={Spine=actionFrame(2.7,25.3,7.5),Chest=actionFrame(-9,46,15),Head=actionFrame(3,-27.6,-4.5),UpperArmL=actionFrame(-34,8,-48),UpperArmR=actionFrame(-34,-8,48),ForearmL=actionFrame(-55,0,0),ForearmR=actionFrame(-55,0,0),ThighL=actionFrame(-62,36,-45),ShinL=actionFrame(18,0,0),FootL=actionFrame(-18,0,-10)}},
 {id="LOW_KICK_L",kind="KICK",pose={Spine=actionFrame(-1.8,12.1,5),Chest=actionFrame(6,22,10),Head=actionFrame(3,-13.2,-3),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-88,0,0),ThighL=actionFrame(-30,20,-22),ShinL=actionFrame(8,0,0),FootL=actionFrame(-22,0,0)}},
 {id="FRONT_KICK_R",kind="KICK",pose={Spine=actionFrame(5.1,-4.4,2.5),Chest=actionFrame(-17,-8,5),Head=actionFrame(3,4.8,-1.5),UpperArmL=actionFrame(-52,0,-28),UpperArmR=actionFrame(-52,0,28),ForearmL=actionFrame(-76,0,0),ForearmR=actionFrame(-76,0,0),ThighR=actionFrame(-92,0,5),ShinR=actionFrame(10,0,0),FootR=actionFrame(12,0,0)}},
 {id="SIDE_KICK_R",kind="KICK",pose={Spine=actionFrame(2.4,-15.4,-9),Chest=actionFrame(-8,-28,-18),Head=actionFrame(3,16.8,5.4),UpperArmL=actionFrame(-45,8,-38),UpperArmR=actionFrame(-45,-8,38),ForearmL=actionFrame(-65,0,0),ForearmR=actionFrame(-65,0,0),ThighR=actionFrame(-38,-32,68),ShinR=actionFrame(12,0,0),FootR=actionFrame(0,0,-15)}},
 {id="ROUND_KICK_R",kind="KICK",pose={Spine=actionFrame(2.7,-25.3,-7.5),Chest=actionFrame(-9,-46,-15),Head=actionFrame(3,27.6,4.5),UpperArmL=actionFrame(-34,8,-48),UpperArmR=actionFrame(-34,-8,48),ForearmL=actionFrame(-55,0,0),ForearmR=actionFrame(-55,0,0),ThighR=actionFrame(-62,-36,45),ShinR=actionFrame(18,0,0),FootR=actionFrame(-18,0,10)}},
 {id="LOW_KICK_R",kind="KICK",pose={Spine=actionFrame(-1.8,-12.1,-5),Chest=actionFrame(6,-22,-10),Head=actionFrame(3,13.2,3),UpperArmL=actionFrame(-38,-12,-18),UpperArmR=actionFrame(-31,12,18),ForearmL=actionFrame(-78,0,0),ForearmR=actionFrame(-88,0,0),ThighR=actionFrame(-30,-20,22),ShinR=actionFrame(8,0,0),FootR=actionFrame(-22,0,0)}},
 {id="SHOULDER_THROW_LEFT",kind="THROW",pose={Spine=actionFrame(-12.6,34.1,-12.5),Chest=actionFrame(42,62,-25),Head=actionFrame(3,-37.2,7.5),UpperArmL=actionFrame(-126,32,-28),UpperArmR=actionFrame(-114,-18,28),ForearmL=actionFrame(-110,0,0),ForearmR=actionFrame(-95,0,0),ThighL=actionFrame(-28,18,-12),ShinL=actionFrame(32,0,0)}},
 {id="SHOULDER_THROW_RIGHT",kind="THROW",pose={Spine=actionFrame(-12.6,-34.1,12.5),Chest=actionFrame(42,-62,25),Head=actionFrame(3,37.2,-7.5),UpperArmL=actionFrame(-114,18,-28),UpperArmR=actionFrame(-126,-32,28),ForearmL=actionFrame(-95,0,0),ForearmR=actionFrame(-110,0,0),ThighR=actionFrame(-28,-18,12),ShinR=actionFrame(32,0,0)}},
 {id="HIP_THROW_LEFT",kind="THROW",pose={Spine=actionFrame(-8.4,41.8,-10),Chest=actionFrame(28,76,-20),Head=actionFrame(3,-45.6,6),UpperArmL=actionFrame(-90,42,-38),UpperArmR=actionFrame(-80,12,18),ForearmL=actionFrame(-95,0,0),ForearmR=actionFrame(-115,0,0),ThighL=actionFrame(-38,26,-18),ShinL=actionFrame(42,0,0)}},
 {id="HIP_THROW_RIGHT",kind="THROW",pose={Spine=actionFrame(-8.4,-41.8,10),Chest=actionFrame(28,-76,20),Head=actionFrame(3,45.6,-6),UpperArmL=actionFrame(-80,-12,-18),UpperArmR=actionFrame(-90,-42,38),ForearmL=actionFrame(-115,0,0),ForearmR=actionFrame(-95,0,0),ThighR=actionFrame(-38,-26,18),ShinR=actionFrame(42,0,0)}},
 {id="LEG_REAP_LEFT",kind="THROW",pose={Spine=actionFrame(-7.2,26.4,-9),Chest=actionFrame(24,48,-18),Head=actionFrame(3,-28.8,5.4),UpperArmL=actionFrame(-72,28,-35),UpperArmR=actionFrame(-75,-12,20),ForearmL=actionFrame(-110,0,0),ForearmR=actionFrame(-105,0,0),ThighL=actionFrame(28,22,-28),ShinL=actionFrame(25,0,0),FootL=actionFrame(-12,0,0)}},
 {id="LEG_REAP_RIGHT",kind="THROW",pose={Spine=actionFrame(-7.2,-26.4,9),Chest=actionFrame(24,-48,18),Head=actionFrame(3,28.8,-5.4),UpperArmL=actionFrame(-75,12,-20),UpperArmR=actionFrame(-72,-28,35),ForearmL=actionFrame(-105,0,0),ForearmR=actionFrame(-110,0,0),ThighR=actionFrame(28,-22,28),ShinR=actionFrame(25,0,0),FootR=actionFrame(-12,0,0)}},
}
-- Eleven authored three-action routes cover all thirty actions. They keep a shared
-- guard at the seams instead of resetting to the bind pose between each strike.
local unarmedChains={{1,2,17},{3,4,18},{5,6,13},{7,8,14},{9,10,19},
 {11,12,20},{15,16,21},{22,23,24},{1,25,26},{2,27,28},{3,29,30}}
local function actionTiming(action)
 if action.kind=="THROW"then return .12,.23,.29,.49 end
 if action.kind=="KICK"or action.kind=="KNEE"then return .065,.13,.18,.34 end
 return .045,.095,.14,.265
end
function RobloxCommonMotion.DescribeUnarmedActions()
 local out={}
 for i,action in ipairs(unarmedActions)do
  local ready,impact,recoil,duration=actionTiming(action)
  out[i]=table.freeze({id=action.id,kind=action.kind,duration=duration,contact=impact,
   pairedTargetRequired=action.kind=="THROW",gameplayMovementAuthority=false})
 end
 return table.freeze(out)
end
function RobloxCommonMotion.SampleUnarmedAction(elapsed,combo,targets,stage)
 targets=targets or {}
 local index=math.clamp(math.floor(tonumber(combo)or 1),1,#unarmedActions)
 local action=unarmedActions[index]
 local ready,impact,recoil,duration=actionTiming(action)
 local t=math.max(0,tonumber(elapsed)or 0)
 if stage=="impact"then t+=impact
 elseif stage=="anticipation"then t=math.min(t,ready)end
 local extension,weight=0,1
 if t<ready then extension=-.16*math.sin(t/ready*math.pi*.5)
 elseif t<impact then
  local u=(t-ready)/(impact-ready);extension=-.16+1.16*u*u*(3-2*u)
 elseif t<recoil then extension=1-.22*(t-impact)/(recoil-impact)
 else
  local u=math.clamp((t-recoil)/(duration-recoil),0,1)
  extension=.78*(1-u)
  weight=stage=="chain"and 1 or 1-u*u*(3-2*u)
 end
 for _,name in ipairs(unarmedKeys)do
  local guard=unarmedGuard[name]
  local contact=action.pose[name]or guard
  local pose=guard:Lerp(contact,math.clamp(extension,0,1))
  if extension<0 then pose=guard*actionFrame(0,-extension*(index%2==0 and -16 or 16),0)end
  targets[name]=CFrame.identity:Lerp(pose,weight)
 end
 -- Only kicking/reaping actions override these joints; punching retains gait.
 for name,contact in pairs(action.pose)do
  if not unarmedGuard[name]then
   local gait=targets[name]or CFrame.identity
   targets[name]=gait:Lerp(contact,math.clamp(extension,0,1)*weight)
  end
 end
 return targets,duration,math.clamp(extension,0,1)*weight
end
function RobloxCommonMotion.SampleUnarmedChain(elapsed,chain,targets,stage,allowPairedThrows)
 targets=targets or {}
 local route=unarmedChains[(math.max(1,math.floor(tonumber(chain)or 1))-1)%#unarmedChains+1]
 local t=math.max(0,tonumber(elapsed)or 0)
 local total=0
 for _,id in ipairs(route)do local _,_,_,d=actionTiming(unarmedActions[id]);total+=d end
 local firstImpact=select(2,actionTiming(unarmedActions[route[1]]))
 if stage=="impact"then t+=firstImpact
 elseif stage=="anticipation"then t=math.min(t,select(1,actionTiming(unarmedActions[route[1]])))end
 local cursor=0
 for i,id in ipairs(route)do
  local _,_,_,duration=actionTiming(unarmedActions[id])
  if t<cursor+duration then
   -- Throws need a paired victim. Solo attacks substitute an articulated elbow,
   -- never mime grabbing an absent target or teleport a gameplay root.
   local actual=unarmedActions[id].kind=="THROW"and not allowPairedThrows and(i%2==0 and 11 or 12)or id
   local _,_,_,actualDuration=actionTiming(unarmedActions[actual])
   RobloxCommonMotion.SampleUnarmedAction((t-cursor)/duration*actualDuration,actual,targets,"chain")
   return targets,total,actual,i
  end
  cursor+=duration
 end
 -- Fade the shared guard once after the entire chain, not after each contact.
 local fade=math.clamp((t-total)/.12,0,1)
 for _,name in ipairs(unarmedKeys)do targets[name]=unarmedGuard[name]:Lerp(CFrame.identity,fade*fade*(3-2*fade))end
 return targets,total,route[#route],#route
end

-- Thirty weapon action curves + the existing thirty unarmed curves are one
-- composable presentation vocabulary. Equipment profiles do not create models,
-- shoot projectiles, change cooldowns, grant damage or move character roots.
local weaponActions={
 {id="BLADE_SLASH_R",family="BLADE",event="CONTACT",duration=0.4,pose={Spine=actionFrame(-2.4,-15.3,3.6),Chest=actionFrame(8,-34,9),Head=actionFrame(2,18.7,-2.7),UpperArmL=actionFrame(-26,-8,-17),UpperArmR=actionFrame(-65,12,46),ForearmL=actionFrame(-60,0,0),ForearmR=actionFrame(-35,0,0)}},
 {id="BLADE_SLASH_L",family="BLADE",event="CONTACT",duration=0.4,pose={Spine=actionFrame(-1.5,14.4,-3.2),Chest=actionFrame(5,32,-8),Head=actionFrame(2,-17.6,2.4),UpperArmL=actionFrame(-26,-8,-17),UpperArmR=actionFrame(-76,-36,-38),ForearmL=actionFrame(-62,0,0),ForearmR=actionFrame(-28,0,0)}},
 {id="BLADE_THRUST",family="BLADE",event="CONTACT",duration=0.34,pose={Spine=actionFrame(2.1,-7.2,1.2),Chest=actionFrame(-7,-16,3),Head=actionFrame(2,8.8,-0.9),UpperArmL=actionFrame(-26,-8,-17),UpperArmR=actionFrame(-91,2,4),ForearmL=actionFrame(-68,0,0),ForearmR=actionFrame(-8,0,0)}},
 {id="BLADE_RISING",family="BLADE",event="CONTACT",duration=0.44,pose={Spine=actionFrame(3.6,-11.25,3.2),Chest=actionFrame(-12,-25,8),Head=actionFrame(2,13.75,-2.4),UpperArmL=actionFrame(-26,-8,-17),UpperArmR=actionFrame(-118,6,18),ForearmL=actionFrame(-65,0,0),ForearmR=actionFrame(-38,0,0)}},
 {id="BLADE_OVERHEAD",family="BLADE",event="CONTACT",duration=0.54,pose={Spine=actionFrame(-6.9,-5.4,1.6),Chest=actionFrame(23,-12,4),Head=actionFrame(2,6.6,-1.2),UpperArmL=actionFrame(-83,-8,-9),UpperArmR=actionFrame(-104,5,10),ForearmL=actionFrame(-64,0,0),ForearmR=actionFrame(-45,0,0)}},
 {id="BLADE_RIPOSTE",family="BLADE",event="CONTACT",duration=0.36,pose={Spine=actionFrame(1.2,-10.35,0.8),Chest=actionFrame(-4,-23,2),Head=actionFrame(2,12.65,-0.6),UpperArmL=actionFrame(-49,-8,-25),UpperArmR=actionFrame(-86,-4,2),ForearmL=actionFrame(-85,0,0),ForearmR=actionFrame(-12,0,0)}},
 {id="AXE_CHOP",family="AXE",event="CONTACT",duration=0.56,pose={Spine=actionFrame(-8.4,-11.7,4.8),Chest=actionFrame(28,-26,12),Head=actionFrame(2,14.3,-3.6),UpperArmL=actionFrame(-74,5,-10),UpperArmR=actionFrame(-92,7,18),ForearmL=actionFrame(-82,0,0),ForearmR=actionFrame(-48,0,0)}},
 {id="AXE_DIAGONAL",family="AXE",event="CONTACT",duration=0.52,pose={Spine=actionFrame(-5.1,-19.8,7.2),Chest=actionFrame(17,-44,18),Head=actionFrame(2,24.2,-5.4),UpperArmL=actionFrame(-68,12,-22),UpperArmR=actionFrame(-77,22,38),ForearmL=actionFrame(-75,0,0),ForearmR=actionFrame(-36,0,0)}},
 {id="AXE_SWEEP",family="AXE",event="CONTACT",duration=0.58,pose={Spine=actionFrame(-3,20.7,-5.2),Chest=actionFrame(10,46,-13),Head=actionFrame(2,-25.3,3.9),UpperArmL=actionFrame(-60,-12,-25),UpperArmR=actionFrame(-59,-32,-48),ForearmL=actionFrame(-68,0,0),ForearmR=actionFrame(-30,0,0)}},
 {id="AXE_CLEAVE",family="AXE",event="CONTACT",duration=0.66,pose={Spine=actionFrame(-10.5,-3.6,1.6),Chest=actionFrame(35,-8,4),Head=actionFrame(2,4.4,-1.2),UpperArmL=actionFrame(-105,3,-10),UpperArmR=actionFrame(-114,-4,12),ForearmL=actionFrame(-66,0,0),ForearmR=actionFrame(-57,0,0)}},
 {id="SPEAR_JAB",family="SPEAR",event="CONTACT",duration=0.35,pose={Spine=actionFrame(2.4,-9,1.2),Chest=actionFrame(-8,-20,3),Head=actionFrame(2,11,-0.9),UpperArmL=actionFrame(-76,-4,-7),UpperArmR=actionFrame(-87,2,6),ForearmL=actionFrame(-18,0,0),ForearmR=actionFrame(-20,0,0)}},
 {id="SPEAR_LONG_THRUST",family="SPEAR",event="CONTACT",duration=0.47,pose={Spine=actionFrame(4.5,-13.95,2.4),Chest=actionFrame(-15,-31,6),Head=actionFrame(2,17.05,-1.8),UpperArmL=actionFrame(-89,-7,-4),UpperArmR=actionFrame(-102,3,5),ForearmL=actionFrame(-9,0,0),ForearmR=actionFrame(-12,0,0)}},
 {id="SPEAR_SWEEP",family="SPEAR",event="CONTACT",duration=0.49,pose={Spine=actionFrame(-1.5,18.9,-3.6),Chest=actionFrame(5,42,-9),Head=actionFrame(2,-23.1,2.7),UpperArmL=actionFrame(-61,-26,-35),UpperArmR=actionFrame(-56,-32,-42),ForearmL=actionFrame(-42,0,0),ForearmR=actionFrame(-38,0,0)}},
 {id="SPEAR_BUTT_STRIKE",family="SPEAR",event="CONTACT",duration=0.38,pose={Spine=actionFrame(-2.7,13.05,-1.6),Chest=actionFrame(9,29,-4),Head=actionFrame(2,-15.95,1.2),UpperArmL=actionFrame(-62,18,-15),UpperArmR=actionFrame(-48,-23,25),ForearmL=actionFrame(-95,0,0),ForearmR=actionFrame(-102,0,0)}},
 {id="BLUNT_OVERHEAD",family="BLUNT",event="CONTACT",duration=0.64,pose={Spine=actionFrame(-9.6,-6.3,2.8),Chest=actionFrame(32,-14,7),Head=actionFrame(2,7.7,-2.1),UpperArmL=actionFrame(-91,4,-8),UpperArmR=actionFrame(-99,-4,12),ForearmL=actionFrame(-77,0,0),ForearmR=actionFrame(-58,0,0)}},
 {id="BLUNT_SIDE_SMASH",family="BLUNT",event="CONTACT",duration=0.58,pose={Spine=actionFrame(-3.6,-21.6,7.2),Chest=actionFrame(12,-48,18),Head=actionFrame(2,26.4,-5.4),UpperArmL=actionFrame(-67,10,-18),UpperArmR=actionFrame(-67,24,44),ForearmL=actionFrame(-80,0,0),ForearmR=actionFrame(-48,0,0)}},
 {id="BLUNT_RISING",family="BLUNT",event="CONTACT",duration=0.52,pose={Spine=actionFrame(5.4,13.05,-3.2),Chest=actionFrame(-18,29,-8),Head=actionFrame(2,-15.95,2.4),UpperArmL=actionFrame(-77,-8,-15),UpperArmR=actionFrame(-122,6,14),ForearmL=actionFrame(-80,0,0),ForearmR=actionFrame(-76,0,0)}},
 {id="BLUNT_GROUND_SLAM",family="BLUNT",event="CONTACT",duration=0.72,pose={Spine=actionFrame(-13.8,-1.35,0.8),Chest=actionFrame(46,-3,2),Head=actionFrame(2,1.65,-0.6),UpperArmL=actionFrame(-114,2,-12),UpperArmR=actionFrame(-120,-2,12),ForearmL=actionFrame(-75,0,0),ForearmR=actionFrame(-69,0,0)}},
 {id="DUAL_ALTERNATING",family="DUAL",event="CONTACT",duration=0.32,pose={Spine=actionFrame(-2.4,12.6,-3.6),Chest=actionFrame(8,28,-9),Head=actionFrame(2,-15.4,2.7),UpperArmL=actionFrame(-88,-8,-30),UpperArmR=actionFrame(-45,18,36),ForearmL=actionFrame(-26,0,0),ForearmR=actionFrame(-68,0,0)}},
 {id="DUAL_CROSS",family="DUAL",event="CONTACT",duration=0.37,pose={Spine=actionFrame(-4.2,-1.35,0.4),Chest=actionFrame(14,-3,1),Head=actionFrame(2,1.65,-0.3),UpperArmL=actionFrame(-87,36,-18),UpperArmR=actionFrame(-87,-36,18),ForearmL=actionFrame(-25,0,0),ForearmR=actionFrame(-25,0,0)}},
 {id="DUAL_REVERSE",family="DUAL",event="CONTACT",duration=0.33,pose={Spine=actionFrame(-0.9,-17.55,4.8),Chest=actionFrame(3,-39,12),Head=actionFrame(2,21.45,-3.6),UpperArmL=actionFrame(-48,-18,-38),UpperArmR=actionFrame(-91,14,28),ForearmL=actionFrame(-74,0,0),ForearmR=actionFrame(-22,0,0)}},
 {id="DUAL_OPENING",family="DUAL",event="CONTACT",duration=0.42,pose={Spine=actionFrame(1.8,0.9,0),Chest=actionFrame(-6,2,0),Head=actionFrame(2,-1.1,0),UpperArmL=actionFrame(-73,-24,-65),UpperArmR=actionFrame(-73,24,65),ForearmL=actionFrame(-35,0,0),ForearmR=actionFrame(-35,0,0)}},
 {id="BOW_DRAW",family="BOW",event="DRAW",duration=0.62,pose={Spine=actionFrame(0.9,-12.15,0.4),Chest=actionFrame(-3,-27,1),Head=actionFrame(2,14.85,-0.3),UpperArmL=actionFrame(-84,-8,-5),UpperArmR=actionFrame(-67,32,44),ForearmL=actionFrame(-10,0,0),ForearmR=actionFrame(-118,0,0)}},
 {id="BOW_RELEASE",family="BOW",event="RELEASE",duration=0.3,pose={Spine=actionFrame(0.6,-11.25,0.4),Chest=actionFrame(-2,-25,1),Head=actionFrame(2,13.75,-0.3),UpperArmL=actionFrame(-86,-8,-4),UpperArmR=actionFrame(-62,35,48),ForearmL=actionFrame(-9,0,0),ForearmR=actionFrame(-100,0,0),HandR=actionFrame(0,12,14)}},
 {id="BOW_RENOCK",family="BOW",event="RELOAD",duration=0.58,pose={Spine=actionFrame(-1.8,-5.4,1.2),Chest=actionFrame(6,-12,3),Head=actionFrame(2,6.6,-0.9),UpperArmL=actionFrame(-51,-8,-14),UpperArmR=actionFrame(-26,12,32),ForearmL=actionFrame(-45,0,0),ForearmR=actionFrame(-105,0,0)}},
 {id="FIREARM_AIM",family="FIREARM",event="AIM",duration=0.26,pose={Spine=actionFrame(2.1,-4.5,0.4),Chest=actionFrame(-7,-10,1),Head=actionFrame(2,5.5,-0.3),UpperArmL=actionFrame(-72,-10,-11),UpperArmR=actionFrame(-82,1,9),ForearmL=actionFrame(-56,0,0),ForearmR=actionFrame(-25,0,0)}},
 {id="FIREARM_RECOIL",family="FIREARM",event="RELEASE",duration=0.24,pose={Spine=actionFrame(3.6,-5.4,0.8),Chest=actionFrame(-12,-12,2),Head=actionFrame(2,6.6,-0.6),UpperArmL=actionFrame(-77,-10,-11),UpperArmR=actionFrame(-91,1,9),ForearmL=actionFrame(-65,0,0),ForearmR=actionFrame(-37,0,0)}},
 {id="FIREARM_RELOAD",family="FIREARM",event="RELOAD",duration=0.78,pose={Spine=actionFrame(-2.4,6.75,-1.6),Chest=actionFrame(8,15,-4),Head=actionFrame(2,-8.25,1.2),UpperArmL=actionFrame(-54,22,-25),UpperArmR=actionFrame(-53,-5,14),ForearmL=actionFrame(-114,0,0),ForearmR=actionFrame(-80,0,0)}},
 {id="FIREARM_BURST",family="FIREARM",event="RELEASE",duration=0.36,pose={Spine=actionFrame(3,-6.3,1.2),Chest=actionFrame(-10,-14,3),Head=actionFrame(2,7.7,-0.9),UpperArmL=actionFrame(-76,-10,-10),UpperArmR=actionFrame(-88,2,8),ForearmL=actionFrame(-60,0,0),ForearmR=actionFrame(-32,0,0)}},
 {id="FIREARM_CYCLE",family="FIREARM",event="CYCLE",duration=0.43,pose={Spine=actionFrame(-0.9,-3.6,0.4),Chest=actionFrame(3,-8,1),Head=actionFrame(2,4.4,-0.3),UpperArmL=actionFrame(-55,-4,-17),UpperArmR=actionFrame(-76,2,10),ForearmL=actionFrame(-103,0,0),ForearmR=actionFrame(-45,0,0)}},
}
local weaponProfiles={
 SWORD={id="SWORD",family="BLADE",speed=1.15,hands="ONE",route={1,2,3}},
 LONGSWORD={id="LONGSWORD",family="BLADE",speed=1,hands="TWO",route={2,3,5}},
 GREATSWORD={id="GREATSWORD",family="BLADE",speed=0.8,hands="TWO",route={5,2,4}},
 KATANA={id="KATANA",family="BLADE",speed=1.2,hands="TWO",route={4,1,3}},
 RAPIER={id="RAPIER",family="BLADE",speed=1.3,hands="ONE",route={3,6,3}},
 SCIMITAR={id="SCIMITAR",family="BLADE",speed=1.22,hands="ONE",route={2,1,4}},
 SABRE={id="SABRE",family="BLADE",speed=1.18,hands="ONE",route={1,6,2}},
 DAGGER={id="DAGGER",family="BLADE",speed=1.4,hands="ONE",route={3,2,6}},
 DUAL_DAGGERS={id="DUAL_DAGGERS",family="DUAL",speed=1.4,hands="DUAL",route={19,21,20}},
 DUAL_SWORDS={id="DUAL_SWORDS",family="DUAL",speed=1.12,hands="DUAL",route={20,19,22}},
 WAR_AXE={id="WAR_AXE",family="AXE",speed=1,hands="ONE",route={7,8,9}},
 BATTLEAXE={id="BATTLEAXE",family="AXE",speed=0.92,hands="TWO",route={8,9,10}},
 GREATAXE={id="GREATAXE",family="AXE",speed=0.78,hands="TWO",route={10,7,9}},
 HATCHET={id="HATCHET",family="AXE",speed=1.25,hands="ONE",route={9,8,7}},
 SPEAR={id="SPEAR",family="SPEAR",speed=1.12,hands="TWO",route={11,12,14}},
 PIKE={id="PIKE",family="SPEAR",speed=0.9,hands="TWO",route={12,11,12}},
 HALBERD={id="HALBERD",family="SPEAR",speed=0.94,hands="TWO",route={13,14,12}},
 TRIDENT={id="TRIDENT",family="SPEAR",speed=1.02,hands="TWO",route={11,13,12}},
 GLAIVE={id="GLAIVE",family="SPEAR",speed=1.08,hands="TWO",route={13,11,14}},
 STAFF={id="STAFF",family="SPEAR",speed=1.22,hands="TWO",route={14,13,11}},
 HAMMER={id="HAMMER",family="BLUNT",speed=1,hands="ONE",route={15,16,17}},
 WARHAMMER={id="WARHAMMER",family="BLUNT",speed=0.8,hands="TWO",route={18,16,15}},
 MACE={id="MACE",family="BLUNT",speed=1.05,hands="ONE",route={16,17,15}},
 CLUB={id="CLUB",family="BLUNT",speed=1.15,hands="ONE",route={17,15,16}},
 BOW={id="BOW",family="BOW",speed=1,hands="TWO",route={23,24,25}},
 LONGBOW={id="LONGBOW",family="BOW",speed=0.85,hands="TWO",route={25,23,24}},
 CROSSBOW={id="CROSSBOW",family="FIREARM",speed=1.1,hands="TWO",route={28,26,27}},
 PISTOL={id="PISTOL",family="FIREARM",speed=1.25,hands="ONE",route={26,27,28}},
 RIFLE={id="RIFLE",family="FIREARM",speed=1,hands="TWO",route={26,29,28}},
 SHOTGUN={id="SHOTGUN",family="FIREARM",speed=0.95,hands="TWO",route={26,27,30}},
}
for _,action in ipairs(weaponActions)do table.freeze(action.pose);table.freeze(action)end
for _,action in ipairs(unarmedActions)do table.freeze(action.pose);table.freeze(action)end
for _,profile in pairs(weaponProfiles)do table.freeze(profile.route);table.freeze(profile)end
local weaponAliases={IronSword="SWORD",WarAxe="WAR_AXE",HuntingSpear="SPEAR",StoneHammer="HAMMER",Greatsword="GREATSWORD"}
local combatActionLookup={}
for index,action in ipairs(unarmedActions)do combatActionLookup["U:"..action.id]={source=action,index=index,unarmed=true}end
for index,action in ipairs(weaponActions)do combatActionLookup["W:"..action.id]={source=action,index=index,unarmed=false}end
local function weaponGuard(profile)
 if not profile then local copy={};for name,pose in pairs(unarmedGuard)do copy[name]=pose end;return copy end
 local two=profile.hands~="ONE"
 local guard={Spine=actionFrame(-2,-8,0),Chest=actionFrame(0,-10,0),Head=actionFrame(2,10,0),
  UpperArmL=actionFrame(two and -54 or -26,-8,two and -10 or -22),
  UpperArmR=actionFrame(-47,6,16),ForearmL=actionFrame(two and -68 or -75,0,0),
  ForearmR=actionFrame(-62,0,0),HandL=CFrame.identity,HandR=CFrame.identity}
 if profile.family=="BOW"then
  guard.UpperArmL=actionFrame(-52,-8,-7);guard.UpperArmR=actionFrame(-36,18,28)
 elseif profile.family=="FIREARM"then
  guard.UpperArmL=actionFrame(two and -63 or -26,-8,-12)
  guard.UpperArmR=actionFrame(-72,0,9);guard.ForearmR=actionFrame(-36,0,0)
 end
 return guard
end
function RobloxCommonMotion.ResolveWeaponProfile(equipmentId)
 local id=weaponAliases[tostring(equipmentId)]or string.upper(tostring(equipmentId or ""))
 return weaponProfiles[id]and id or nil
end
function RobloxCommonMotion.DescribeWeaponActions()
 local out={}
 for i,action in ipairs(weaponActions)do out[i]=table.freeze({id="W:"..action.id,family=action.family,
  event=action.event,duration=action.duration,gameplayMovementAuthority=false})end
 return table.freeze(out)
end
function RobloxCommonMotion.DescribeWeaponProfiles()
 local out={}
 for id,profile in pairs(weaponProfiles)do
  local route={};for i,index in ipairs(profile.route)do route[i]="W:"..weaponActions[index].id end
  out[id]=table.freeze({id=id,family=profile.family,speed=profile.speed,hands=profile.hands,route=table.freeze(route)})
 end
 return table.freeze(out)
end
local function smoothUnit(u)return u*u*(3-2*u)end
-- Compile once on attack/equipment change; sample repeatedly into a reused table.
-- Reject incompatible equipment instead of silently giving every weapon a slash.
function RobloxCommonMotion.CreateCombatCombo(equipmentId,ids,options)
 options=options or {}
 local profileId=RobloxCommonMotion.ResolveWeaponProfile(equipmentId)
 assert(profileId or equipmentId==nil or equipmentId=="UNARMED","UNKNOWN_COMBAT_EQUIPMENT")
 local profile=profileId and weaponProfiles[profileId]
 if ids==nil then
  ids={}
  if profile then for _,index in ipairs(profile.route)do ids[#ids+1]="W:"..weaponActions[index].id end
  else ids={"U:JAB_LEFT","U:CROSS_RIGHT","U:FRONT_KICK_L"}end
 end
 assert(type(ids)=="table"and #ids>=1 and #ids<=60,"COMBAT_COMBO_REQUIRES_1_TO_60_ACTIONS")
 local guard=weaponGuard(profile)
 local steps={}
 local cursor=0
 for actionIndex=1,#ids do
  local id=ids[actionIndex]
  local entry=combatActionLookup[id]
  assert(entry,"UNKNOWN_COMBAT_ACTION: "..tostring(id))
  local source=entry.source
  if not entry.unarmed then
   assert(profile and source.family==profile.family,"WEAPON_ACTION_INCOMPATIBLE: "..id)
  elseif source.kind=="THROW"then
   assert(options.pairedTarget==true and not profile,"THROW_REQUIRES_PAIRED_TARGET_AND_FREE_HANDS")
  elseif profile and source.kind=="HAND"then
   -- Equipped one-handed weapons leave only the left hand free. Stowed weapons
   -- require a separate UNARMED combo; stow/re-equip remains the caller's job.
   assert(profile.hands=="ONE"and entry.index%2==1,"UNARMED_ACTION_REQUIRES_FREE_HAND: "..id)
  end
  local ready,contact,recoil,duration
  if entry.unarmed then ready,contact,recoil,duration=actionTiming(source)
  else
   duration=source.duration
   ready=duration*.27;contact=duration*.44;recoil=duration*.65
  end
  local speed=math.clamp(tonumber(options.speed)or(profile and profile.speed)or 1,.5,1.75)
  duration/=speed;ready/=speed;contact/=speed;recoil/=speed
  local strike={}
  for name,pose in pairs(source.pose)do strike[name]=pose end
  if profile and profile.hands=="TWO"and not entry.unarmed
   and(profile.family=="BLADE"or profile.family=="AXE"or profile.family=="BLUNT")then
   strike.UpperArmL=strike.UpperArmR*actionFrame(0,-10,-12)
   strike.ForearmL=strike.ForearmR*actionFrame(-12,0,0)
  end
  local windup,follow={},{}
  for _,name in ipairs(unarmedKeys)do
   local base=guard[name]
   local contactPose=strike[name]or base
   -- Preparation and follow-through are authored as separate rotations around
   -- a shared grip: hips lead chest, then shoulders, then the forearms.
   local side=entry.index%2==0 and -1 or 1
   local ranged=source.family=="BOW"or source.family=="FIREARM"
   local yaw=ranged and 0 or 9*side
   windup[name]=base*actionFrame(name=="Chest"and -6 or 0,name=="Chest"and -yaw or 0,0)
   follow[name]=base:Lerp(contactPose,.68)
  end
  local step={id=id,source=source,start=cursor,duration=duration,ready=ready,contact=contact,recoil=recoil,
   pose=table.freeze(strike),windup=table.freeze(windup),follow=table.freeze(follow),event=entry.unarmed and "CONTACT"or source.event,pairedTargetRequired=source.kind=="THROW"}
  steps[#steps+1]=table.freeze(step);cursor+=duration
 end
 return table.freeze({profileId=profileId or "UNARMED",steps=table.freeze(steps),duration=cursor,
  guard=table.freeze(guard),fadeDuration=.14,gameplayMovementAuthority=false})
end
function RobloxCommonMotion.SampleCombatCombo(combo,elapsed,targets)
 targets=targets or {}
 local t=math.max(0,tonumber(elapsed)or 0)
 local step=combo.steps[#combo.steps]
 local index=#combo.steps
 for i,candidate in ipairs(combo.steps)do if t<candidate.start+candidate.duration then step=candidate;index=i;break end end
 if t>=combo.duration then
  local weight=1-smoothUnit(math.clamp((t-combo.duration)/combo.fadeDuration,0,1))
  for _,name in ipairs(unarmedKeys)do targets[name]=CFrame.identity:Lerp(combo.guard[name],weight)end
  return targets,index,t>=combo.duration+combo.fadeDuration
 end
 local u=t-step.start
 local function curve(name,base)
  local strike=step.pose[name]or base
  local windup=step.windup[name]or base
  local follow=step.follow[name]or base:Lerp(strike,.68)
  local lag=name=="Spine"and -.035 or name=="Chest"and -.02
   or name:match("^Forearm")and .015 or name:match("^Hand")and .025 or 0
  local ready=step.ready+step.duration*lag
  local contact=step.contact+step.duration*lag
  local recoil=step.recoil+step.duration*lag
  if u<ready then return base:Lerp(windup,smoothUnit(u/ready))
  elseif u<contact then return windup:Lerp(strike,smoothUnit((u-ready)/(contact-ready)))
  elseif u<recoil then return strike:Lerp(follow,smoothUnit((u-contact)/(recoil-contact)))
  else return follow:Lerp(base,smoothUnit((u-recoil)/(step.duration-recoil)))end
 end
 for _,name in ipairs(unarmedKeys)do targets[name]=curve(name,combo.guard[name])end
 for name in pairs(step.pose)do
  if not combo.guard[name]then targets[name]=curve(name,targets[name]or CFrame.identity)end
 end
 return targets,index,false
end

local r15CombatNames={Head="Neck",UpperArmL="LeftShoulder",UpperArmR="RightShoulder",
 ForearmL="LeftElbow",ForearmR="RightElbow",HandL="LeftWrist",HandR="RightWrist",
 ThighL="LeftHip",ThighR="RightHip",ShinL="LeftKnee",ShinR="RightKnee",FootL="LeftAnkle",FootR="RightAnkle"}
function RobloxCommonMotion.MapCombatPoseToR15(targets,out)
 out=out or {};table.clear(out)
 out.Waist=(targets.Spine or CFrame.identity)*(targets.Chest or CFrame.identity)
 for name,motorName in pairs(r15CombatNames)do
  local pose=targets[name]
  if pose then out[motorName]=(name:match("^Forearm")or name:match("^Shin"))and pose:Inverse()or pose end
 end
 return out
end

function RobloxCommonMotion.CreateSequence(atomId)
	local id, row = resolve(atomId)
	local builder = BUILDERS[row.mode]
	assert(builder, "COMMON_MOTION_BUILDER_MISSING: " .. row.mode)

	local sequence = Instance.new("KeyframeSequence")
	sequence.Name = "JG_Common_" .. id
	sequence.Loop = row.looped
	sequence.Priority = row.priority

	sequence:SetAttribute("StudioAssetId", id)
	sequence:SetAttribute("StudioAssetPack", "roblox-common-motion-v1")
	sequence:SetAttribute("StudioAssetFamily", "MOTION")
	sequence:SetAttribute("CompanyCommonBase", true)
	sequence:SetAttribute("CompatibleRig", "R15")
	sequence:SetAttribute("RootMotionOwned", false)
	sequence:SetAttribute("GameplayMovementAuthority", false)
	sequence:SetAttribute("ProductionVerified", false)
	sequence:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")

	builder(sequence, row)
	return sequence
end

function RobloxCommonMotion.CreatePreviewAnimation(atomId)
	local sequence = RobloxCommonMotion.CreateSequence(atomId)
	local contentId = KeyframeSequenceProvider:RegisterKeyframeSequence(sequence)
	local animation = Instance.new("Animation")
	animation.Name = sequence.Name .. "_PreviewAnimation"
	animation.AnimationId = contentId
	animation:SetAttribute("TemporaryPreviewOnly", true)
	animation:SetAttribute("PersistentUploadRequiredForProduction", true)
	animation:SetAttribute("ProductionVerified", false)
	return animation, sequence
end

function RobloxCommonMotion.PlayPreview(animator, atomId, options)
	assert(typeof(animator) == "Instance" and animator:IsA("Animator"), "COMMON_MOTION_ANIMATOR_REQUIRED")
	options = options or {}
	local animation, sequence = RobloxCommonMotion.CreatePreviewAnimation(atomId)
	local track = animator:LoadAnimation(animation)
	track.Looped = sequence.Loop
	track.Priority = sequence.Priority
	track:Play(tonumber(options.fadeTime) or 0.12, tonumber(options.weight) or 1, tonumber(options.speed) or 1)
	return track, animation, sequence
end

function RobloxCommonMotion.Describe(atomId)
	local id, row = resolve(atomId)
	return table.freeze({
		atomId = id,
		duration = row.duration,
		looped = row.looped,
		priority = row.priority.Name,
		mode = row.mode,
		rig = "R15",
		rootMotionOwned = false,
		gameplayMovementAuthority = false,
		productionVerified = false,
	})
end

function RobloxCommonMotion.Audit()
	local ids = {}
	for id in pairs(MOTION) do
		table.insert(ids, id)
	end
	table.sort(ids)
	return table.freeze({
		version = 8,
		packId = "roblox-common-motion-v1",
		atoms = table.freeze(ids),
		atomCount = #ids,
		expectedAtomCount = 61,
		companyCommonBase = true,
		compatibleRig = "R15",
		keyframeSequenceSource = true,
		animatorPreviewPath = true,
		rootMotionOwned = false,
		gameplayMovementAuthority = false,
		persistentAnimationUploadRequiredForProduction = true,
		callerOwnedJointPoseBlending = true,
		unarmedActionSampler = true,
		unarmedComboCount = 30,
		unarmedChainCount = 11,
		weaponActionCount = 30,
		weaponProfileCount = 30,
		composableCombatActionCount = 60,
		poseControllerJointTypes = table.freeze({"Bone","Motor6D"}),
		productionVerified = false,
		runtimeVerificationRequired = true,
	})
end

return table.freeze(RobloxCommonMotion)
