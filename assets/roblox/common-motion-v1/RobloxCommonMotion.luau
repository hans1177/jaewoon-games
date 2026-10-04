-- 파일명: assets/roblox/common-motion-v1/RobloxCommonMotion.luau
-- 역할: 모든 Roblox R15 게임에서 재사용 가능한 회사 공용 관절 모션 원본 40종
-- 원칙: 관절 포즈만 소유한다. Humanoid 이동속도/위치/루트모션/데미지/게임플레이 권한은 소유하지 않는다.

local KeyframeSequenceProvider = game:GetService("KeyframeSequenceProvider")

local RobloxCommonMotion = {}

local MOTION = table.freeze({
	IDLE_RELAXED = table.freeze({looped = true, priority = Enum.AnimationPriority.Idle, duration = 3.2, mode = "IDLE"}),
	WALK = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 1.00, mode = "LOCOMOTION", stride = 0.62, lift = 0.18, lean = 0.035}),
	JOG = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.78, mode = "LOCOMOTION", stride = 0.82, lift = 0.25, lean = 0.070}),
	RUN = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.60, mode = "LOCOMOTION", stride = 1.04, lift = 0.33, lean = 0.125}),
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
	SPRINT = table.freeze({looped = true, priority = Enum.AnimationPriority.Movement, duration = 0.48, mode = "LOCOMOTION", stride = 1.28, lift = 0.40, lean = 0.18}),
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

local function poseTree(node, transforms, root)
	local pose = Instance.new("Pose")
	pose.Name = node.name
	pose.Weight = node.name == "HumanoidRootPart" and 0 or 1
	pose.CFrame = transforms[node.name] or CFrame.new()
	if root then
		root:AddPose(pose)
	end
	for _, child in ipairs(node.children or {}) do
		poseTree(child, transforms, pose)
	end
	return pose
end

local function addFrame(sequence, time, transforms, name)
	local keyframe = Instance.new("Keyframe")
	keyframe.Name = name or string.format("K_%03d", math.floor(time * 1000 + 0.5))
	keyframe.Time = time
	poseTree(HIERARCHY, transforms, keyframe)
	sequence:AddKeyframe(keyframe)
	return keyframe
end

local function locomotionTransforms(phase, row)
	local s = math.sin(phase)
	local c = math.cos(phase)
	local stride = row.stride or 0.7
	local lift = row.lift or 0.2
	local lean = row.lean or 0.05

	local leftSwing = s * stride
	local rightSwing = -leftSwing
	local leftKnee = math.max(0, -s) * (32 + lift * 50)
	local rightKnee = math.max(0, s) * (32 + lift * 50)
	local armSwing = stride * 0.70

	return {
		LowerTorso = angles(-lean * 38, c * 1.8, -s * 1.4),
		UpperTorso = angles(lean * 18, -c * 2.4, s * 1.8),
		Head = angles(-lean * 8, c * 1.5, -s * 0.8),

		LeftUpperArm = angles(-leftSwing * 50, -3, -5),
		LeftLowerArm = angles(-8 - math.max(0, leftSwing) * 22, 0, -2),
		LeftHand = angles(3, 0, 1),
		RightUpperArm = angles(-rightSwing * 50, 3, 5),
		RightLowerArm = angles(-8 - math.max(0, rightSwing) * 22, 0, 2),
		RightHand = angles(3, 0, -1),

		LeftUpperLeg = angles(leftSwing * 52, 0, -1.5),
		LeftLowerLeg = angles(leftKnee, 0, 0),
		LeftFoot = angles(-leftSwing * 15 - leftKnee * 0.32, 0, 0),
		RightUpperLeg = angles(rightSwing * 52, 0, 1.5),
		RightLowerLeg = angles(rightKnee, 0, 0),
		RightFoot = angles(-rightSwing * 15 - rightKnee * 0.32, 0, 0),
	}
end

local function makeIdle(sequence, row)
	local samples = 8
	for i = 0, samples do
		local t = row.duration * i / samples
		local phase = math.pi * 2 * i / samples
		local breathe = math.sin(phase)
		local sway = math.sin(phase * 0.5)
		addFrame(sequence, t, {
			LowerTorso = angles(-1.2 + breathe * 0.7, sway * 1.6, sway * 0.8),
			UpperTorso = angles(1.1 - breathe * 0.45, -sway * 1.2, -sway * 0.6),
			Head = angles(-1.0 + breathe * 0.30, sway * 2.1, sway * 0.5),
			LeftUpperArm = angles(-4 + breathe * 1.1, -2, -4),
			LeftLowerArm = angles(-7 - breathe * 1.4, 0, -2),
			RightUpperArm = angles(-4 - breathe * 1.1, 2, 4),
			RightLowerArm = angles(-7 + breathe * 1.4, 0, 2),
			LeftUpperLeg = angles(0.8, 0, -1.2),
			RightUpperLeg = angles(-0.8, 0, 1.2),
			LeftLowerLeg = angles(1.0, 0, 0),
			RightLowerLeg = angles(1.0, 0, 0),
		}, i == 0 and "LoopStart" or i == samples and "LoopEnd" or nil)
	end
end

local function makeLocomotion(sequence, row)
	local samples = 8
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
	addFrame(sequence, row.duration * 0.38, {
		LowerTorso = angles(-8, 0, -2),
		UpperTorso = angles(4, 0, 2),
		LeftUpperArm = angles(22, 0, -6),
		RightUpperArm = angles(-22, 0, 6),
		LeftUpperLeg = angles(-18, 0, -2),
		RightUpperLeg = angles(23, 0, 2),
		LeftLowerLeg = angles(18, 0, 0),
	}, "Commit")
	addFrame(sequence, row.duration, locomotionTransforms(math.pi * 0.5, {stride = 0.65, lift = 0.2, lean = 0.05}), "BlendOut")
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
		RightLowerLeg = angles(17, 0, 0),
	}, "Brake")
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 0, 0),
		UpperTorso = angles(1, 0, 0),
		LeftUpperArm = angles(-3, 0, -3),
		RightUpperArm = angles(-3, 0, 3),
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
	addFrame(sequence, row.duration * 0.45, {
		LowerTorso = angles(-4, 23, -2),
		UpperTorso = angles(2, 30, 3),
		Head = angles(-1, 36, 1),
		LeftUpperArm = angles(10, -8, -6),
		RightUpperArm = angles(-12, 10, 7),
		LeftUpperLeg = angles(14, 10, -4),
		RightUpperLeg = angles(-17, -8, 4),
		LeftLowerLeg = angles(20, 0, 0),
	}, "Pivot")
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 4, 0),
		UpperTorso = angles(1, 6, 0),
		Head = angles(0, 8, 0),
	}, "Recover")
end

local function makeJump(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(8, 0, 0),
		UpperTorso = angles(-5, 0, 0),
		LeftUpperLeg = angles(-18, 0, -3),
		RightUpperLeg = angles(-18, 0, 3),
		LeftLowerLeg = angles(32, 0, 0),
		RightLowerLeg = angles(32, 0, 0),
		LeftUpperArm = angles(18, 0, -8),
		RightUpperArm = angles(18, 0, 8),
	}, "Crouch")
	addFrame(sequence, row.duration * 0.55, {
		LowerTorso = angles(-7, 0, 0),
		UpperTorso = angles(3, 0, 0),
		LeftUpperLeg = angles(16, 0, -2),
		RightUpperLeg = angles(16, 0, 2),
		LeftLowerLeg = angles(8, 0, 0),
		RightLowerLeg = angles(8, 0, 0),
		LeftUpperArm = angles(-22, 0, -12),
		RightUpperArm = angles(-22, 0, 12),
	}, "Takeoff")
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-4, 0, 0),
		UpperTorso = angles(2, 0, 0),
		LeftUpperLeg = angles(8, 0, -1),
		RightUpperLeg = angles(8, 0, 1),
		LeftLowerLeg = angles(18, 0, 0),
		RightLowerLeg = angles(18, 0, 0),
	}, "Air")
end

local function makeLand(sequence, row)
	addFrame(sequence, 0, {
		LowerTorso = angles(-4, 0, 0),
		LeftUpperLeg = angles(8, 0, -1),
		RightUpperLeg = angles(8, 0, 1),
		LeftLowerLeg = angles(12, 0, 0),
		RightLowerLeg = angles(12, 0, 0),
	}, "Air")
	addFrame(sequence, row.duration * 0.35, {
		LowerTorso = angles(13, 0, 0),
		UpperTorso = angles(-7, 0, 0),
		LeftUpperLeg = angles(-22, 0, -3),
		RightUpperLeg = angles(-22, 0, 3),
		LeftLowerLeg = angles(42, 0, 0),
		RightLowerLeg = angles(42, 0, 0),
		LeftUpperArm = angles(24, 0, -12),
		RightUpperArm = angles(24, 0, 12),
	}, "Impact")
	addFrame(sequence, row.duration, {
		LowerTorso = angles(-1, 0, 0),
		UpperTorso = angles(1, 0, 0),
		LeftLowerLeg = angles(2, 0, 0),
		RightLowerLeg = angles(2, 0, 0),
	}, "Recover")
end

local function makeHit(sequence, row)
	addFrame(sequence, 0, {}, "Ready")
	addFrame(sequence, row.duration * 0.22, {
		LowerTorso = angles(12, 0, 8),
		UpperTorso = angles(18, -5, 12),
		Head = angles(10, -8, -8),
		LeftUpperArm = angles(-14, 0, -18),
		RightUpperArm = angles(21, 0, 16),
		LeftUpperLeg = angles(-9, 0, -3),
		RightUpperLeg = angles(13, 0, 3),
	}, "Recoil")
	addFrame(sequence, row.duration * 0.62, {
		LowerTorso = angles(4, 0, 3),
		UpperTorso = angles(6, -2, 5),
		Head = angles(3, -2, -3),
	}, "Absorb")
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
	for i=0,4 do
		local t=row.duration*i/4
		local a=math.sin(i*math.pi)
		addFrame(sequence,t,{
			UpperTorso=angles(6,a*5,0),Head=angles(4,-a*4,0),
			LeftUpperArm=angles(-48+a*12,-10,-14),LeftLowerArm=angles(-58-a*18,0,-8),
			RightUpperArm=angles(-48-a*12,10,14),RightLowerArm=angles(-58+a*18,0,8),
		},i==0 and "LoopStart" or i==4 and "LoopEnd" or nil)
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
		LowerTorso=angles(-4,-10,0),UpperTorso=angles(7,14,0),
		RightUpperArm=angles(-72,24,34),RightLowerArm=angles(-42,0,12),
	},"Anticipation")
	addFrame(sequence,row.duration*0.42,{
		LowerTorso=angles(6,15,3),UpperTorso=angles(-7,-22,-5),Head=angles(-2,-12,0),
		RightUpperArm=angles(48,-38,12),RightLowerArm=angles(-10,0,3),
		LeftUpperArm=angles(-16,0,-12),
	},"Impact")
	addFrame(sequence,row.duration,{LowerTorso=angles(-1,0,0),UpperTorso=angles(1,0,0),RightUpperArm=angles(-12,6,8)},"Recover")
end

local function makeHeavyAttack(sequence,row)
	addFrame(sequence,0,{
		LowerTorso=angles(-10,-16,-3),UpperTorso=angles(15,24,5),Head=angles(-4,10,0),
		RightUpperArm=angles(-128,26,42),RightLowerArm=angles(-58,0,15),
		LeftUpperArm=angles(-72,-18,-28),LeftLowerArm=angles(-42,0,-10),
	},"DeepWindup")
	addFrame(sequence,row.duration*0.32,{
		LowerTorso=angles(-14,-12,-4),UpperTorso=angles(20,18,7),
		RightUpperArm=angles(-142,22,35),LeftUpperArm=angles(-86,-14,-24),
	},"Commit")
	addFrame(sequence,row.duration*0.58,{
		LowerTorso=angles(12,20,6),UpperTorso=angles(-16,-30,-8),Head=angles(5,-15,1),
		RightUpperArm=angles(68,-42,10),RightLowerArm=angles(-4,0,2),
		LeftUpperArm=angles(34,24,-8),LeftLowerArm=angles(-8,0,-2),
	},"HeavyImpact")
	addFrame(sequence,row.duration,{LowerTorso=angles(2,0,0),UpperTorso=angles(1,0,0)},"Recover")
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
})

local function resolve(atomId)
	local id = string.upper(tostring(atomId or ""))
	local row = MOTION[id]
	assert(row, "UNKNOWN_COMMON_MOTION_ATOM: " .. tostring(atomId))
	return id, row
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
		version = 4,
		packId = "roblox-common-motion-v1",
		atoms = table.freeze(ids),
		atomCount = #ids,
		expectedAtomCount = 40,
		companyCommonBase = true,
		compatibleRig = "R15",
		keyframeSequenceSource = true,
		animatorPreviewPath = true,
		rootMotionOwned = false,
		gameplayMovementAuthority = false,
		persistentAnimationUploadRequiredForProduction = true,
		productionVerified = false,
		runtimeVerificationRequired = true,
	})
end

return table.freeze(RobloxCommonMotion)
