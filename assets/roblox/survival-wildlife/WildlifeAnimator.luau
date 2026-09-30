-- 파일명: assets/roblox/survival-wildlife/WildlifeAnimator.luau
-- 역할: 3D 야생동물을 캐릭터 애니메이션 원칙(키포즈/발접지/오버랩/스프링 블렌드)으로 구동한다.
-- 원칙: Root 이동은 게임플레이가 소유한다. 이 모듈은 관절·체중·접지·후행동작을 담당한다.

local RunService = game:GetService("RunService")
local Catalog = require(script.Parent.WildlifeCatalog)

local Animator = {}

local function clamp01(v)
	return math.clamp(v, 0, 1)
end

local function smooth01(v)
	v = clamp01(v)
	return v * v * (3 - 2 * v)
end

local function smoother(v)
	v = clamp01(v)
	return v * v * v * (v * (v * 6 - 15) + 10)
end

local function springNumber(value, target, velocity, frequency, dt)
	local omega = 2 * math.pi * math.max(0.01, frequency)
	local x = value - target
	local exp = math.exp(-omega * math.max(0, dt))
	local nextValue = target + (x + (velocity + omega * x) * dt) * exp
	local nextVelocity = (velocity - omega * (velocity + omega * x) * dt) * exp
	return nextValue, nextVelocity
end

local function expAlpha(speed, dt)
	return 1 - math.exp(-math.max(0.01, speed) * math.max(0, dt))
end

local function pose(x, y, z, rx, ry, rz)
	return CFrame.new(x or 0, y or 0, z or 0)
		* CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
end

local function pitch(deg)
	return CFrame.Angles(math.rad(deg), 0, 0)
end

local function yaw(deg)
	return CFrame.Angles(0, math.rad(deg), 0)
end

local function roll(deg)
	return CFrame.Angles(0, 0, math.rad(deg))
end

local function pulse(t, a, b, c, d)
	if t <= a or t >= d then
		return 0
	end
	if t < b then
		return smooth01((t - a) / math.max(0.001, b - a))
	end
	if t < c then
		return 1
	end
	return 1 - smooth01((t - c) / math.max(0.001, d - c))
end

local function getJoints(model)
	local joints = {}
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("Motor6D") then
			joints[item.Name] = item
		end
	end
	return joints
end

local function zeroTargets(joints)
	local result = {}
	for name in pairs(joints) do
		result[name] = CFrame.identity
	end
	return result
end

local function set(targets, name, cf)
	if targets[name] then
		targets[name] = cf
	end
end

local function add(targets, name, cf)
	if targets[name] then
		targets[name] = targets[name] * cf
	end
end

local function phase01(radians)
	local p = radians / (math.pi * 2)
	return p - math.floor(p)
end

-- stance를 swing보다 길게 유지해서 발이 바닥 위에서 미끄러지는 인상을 줄인다.
local function stanceSample(radians)
	local p = phase01(radians)
	if p < 0.58 then
		local u = smoother(p / 0.58)
		return {
			x = 0.34 + (-0.34 - 0.34) * u,
			y = 0,
			stance = 1,
			swing = 0,
		}
	end
	local u = smoother((p - 0.58) / 0.42)
	return {
		x = -0.34 + (0.34 + 0.34) * u,
		y = math.sin(math.pi * u),
		stance = 0,
		swing = 1,
	}
end

local function gaitTuning(gait)
	if gait == "HEAVY" then
		return 0.72, 19, 24, 0.68
	elseif gait == "LOW_HEAVY" or gait == "SMALL_MAMMAL_HEAVY" then
		return 0.84, 22, 27, 0.80
	elseif gait == "HOOFED_HEAVY" then
		return 0.92, 27, 31, 0.94
	elseif gait == "HOOFED_LIGHT" or gait == "HOOFED_CLIMBER" then
		return 1.04, 31, 36, 1.05
	elseif gait == "CANINE" then
		return 1.08, 30, 34, 1.06
	elseif gait == "CANINE_LIGHT" or gait == "SMALL_MAMMAL_FAST" then
		return 1.18, 34, 39, 1.16
	elseif gait == "HOPPER" then
		return 1.14, 37, 43, 1.20
	elseif gait == "GROUND_BIRD" or gait == "BIRD" then
		return 1.12, 29, 32, 1.14
	end
	return 1, 26, 31, 1
end

local function applyLeg(targets, prefix, phase, amplitude, lift, turnLean, side)
	local sample = stanceSample(phase)
	local swing = sample.x * amplitude
	local knee = (0.16 + sample.y * 0.72) * amplitude
	local ankle = -swing * 0.30 + knee * 0.24
	local yLift = sample.y * lift

	set(targets, prefix .. "Hip", pose(0, yLift * 0.11, 0, swing, 0, side * turnLean * 5.2))
	set(targets, prefix .. "Knee", pitch(-knee))
	set(targets, prefix .. "Ankle", pose(0, yLift * 0.13, -sample.stance * 0.025, ankle, 0, 0))

	return sample
end

local function addBreathing(controller, targets, moving)
	local breath = 0.5 + 0.5 * math.sin(controller.time * 1.52)
	if moving then
		return
	end
	add(targets, "ChestJoint", pose(0, breath * 0.022, 0, breath * 0.85, 0, 0))
	add(targets, "BodyJoint", pose(0, breath * 0.010, 0, -breath * 0.30, 0, 0))
	add(targets, "HeadJoint", pitch(math.sin(controller.time * 0.63) * 0.9))
end

local function locomotionTargets(controller, targets, dt, requestedSpeed)
	local cfg = controller.cfg
	local speedFactor, strideDeg, kneeDeg, cadenceFactor = gaitTuning(cfg.gait)

	controller.speed, controller.speedVelocity = springNumber(
		controller.speed,
		requestedSpeed,
		controller.speedVelocity,
		1.55,
		dt
	)

	local normalized = math.clamp(controller.speed / math.max(1, controller.nominalRunSpeed), 0, 1.35)
	local runTarget = smooth01((normalized - 0.35) / 0.55)
	controller.locomotionBlend, controller.locomotionBlendVelocity = springNumber(
		controller.locomotionBlend,
		runTarget,
		controller.locomotionBlendVelocity,
		1.20,
		dt
	)

	local moving = normalized > 0.025
	local cadence = (2.65 + normalized * 4.35) * cfg.stride * cadenceFactor
	if moving then
		controller.phase += dt * cadence
	else
		controller.phase += dt * 0.28
	end

	local amplitude = math.clamp(normalized * 1.15, 0.22, 1)
	local stride = strideDeg * speedFactor * amplitude * (1 + controller.locomotionBlend * 0.12)
	local lift = cfg.footLift * amplitude * (1 + controller.locomotionBlend * 0.30)
	local kneeScale = kneeDeg / math.max(1, strideDeg)

	local fl = applyLeg(targets, "FL", controller.phase, stride, lift, controller.turnLean, -1)
	local br = applyLeg(targets, "BR", controller.phase + 0.04, stride, lift, controller.turnLean, 1)
	local fr = applyLeg(targets, "FR", controller.phase + math.pi, stride, lift, controller.turnLean, 1)
	local bl = applyLeg(targets, "BL", controller.phase + math.pi + 0.04, stride, lift, controller.turnLean, -1)
	controller.footPlant = {
		FL = fl.stance,
		FR = fr.stance,
		BL = bl.stance,
		BR = br.stance,
	}

	local doublePhase = controller.phase * 2
	local suspension = math.sin(doublePhase)
	local compression = math.max(0, math.cos(doublePhase))
	local lateral = math.sin(controller.phase)

	local bob = moving and math.abs(suspension) * cfg.bodyBob * amplitude * (1 + controller.locomotionBlend * 0.35) or 0
	local pelvisRoll = moving and -lateral * 2.1 * amplitude or 0
	local shoulderRoll = -pelvisRoll * 0.92
	local pelvisPitch = moving and suspension * (1.2 + controller.locomotionBlend * 1.8) * amplitude or 0
	local chestPitch = -pelvisPitch * 0.82

	add(targets, "BodyJoint", pose(0, bob, 0, pelvisPitch, 0, pelvisRoll + controller.turnLean * 5.5))
	add(targets, "ChestJoint", pose(0, -bob * 0.14, 0, chestPitch - controller.spineLag * 3.5, 0, shoulderRoll - controller.turnLean * 3.2))

	-- 큰 동물도 몸통이 판자처럼 움직이지 않도록 척추와 머리가 한 박자 늦게 따라온다.
	local headCounter = moving and (-suspension * 3.0 - lateral * 0.9) * amplitude or math.sin(controller.time * 0.74) * 1.1
	add(targets, "NeckJoint", pitch(headCounter * 0.52 - controller.spineLag * 2.3))
	add(targets, "HeadJoint", pose(0, 0, 0, headCounter - controller.headLag * 4.2, 0, -shoulderRoll * 0.42))

	local tailSway = math.sin(controller.time * (moving and 3.2 or 1.35) + 0.4) * (moving and 8.5 or 4.5)
	add(targets, "TailBaseJoint", yaw(tailSway - controller.turnLean * 7))
	add(targets, "TailTipJoint", yaw(-tailSway * 0.58 - controller.headLag * 4))

	local ear = math.sin(controller.time * 2.15 + controller.earPhase)
	add(targets, "EarLJoint", roll(ear * 2.1 - controller.turnLean * 2))
	add(targets, "EarRJoint", roll(-ear * 1.8 - controller.turnLean * 2))

	if cfg.gait == "HOPPER" and moving then
		local hop = math.max(0, math.sin(controller.phase))
		add(targets, "BodyJoint", pose(0, hop * cfg.bodyBob * 0.82, 0, -hop * 5, 0, 0))
	end
	if cfg.gait == "GROUND_BIRD" and moving then
		add(targets, "NeckJoint", pitch(math.sin(doublePhase) * 5.5))
		add(targets, "HeadJoint", pitch(-math.sin(doublePhase) * 7.5))
	end

	controller.compression = compression * amplitude
	controller.kneeScale = kneeScale
	addBreathing(controller, targets, moving)
end

local function alertTargets(controller, targets)
	local t = smooth01(math.min(1, controller.stateTime / 0.30))
	add(targets, "ChestJoint", pose(0, 0.03 * t, -0.03 * t, -5 * t, 0, 0))
	add(targets, "NeckJoint", pitch(-11 * t))
	add(targets, "HeadJoint", pose(0, 0, 0, -9 * t, math.sin(controller.time * 0.8) * 3 * t, 0))
	add(targets, "EarLJoint", roll(-7 * t))
	add(targets, "EarRJoint", roll(7 * t))
	add(targets, "TailBaseJoint", pitch(7 * t))
end

local function grazeTargets(controller, targets)
	local t = smooth01(math.min(1, controller.stateTime / 0.42))
	add(targets, "NeckJoint", pitch(48 * t))
	add(targets, "HeadJoint", pitch(32 * t))
	add(targets, "ChestJoint", pitch(4 * t))
	local chew = math.max(0, math.sin(controller.time * 5.0)) * 5
	add(targets, "JawJoint", pitch(chew))
end

local function attackTargets(controller, targets)
	local duration = controller.attackDuration
	local t = math.clamp(controller.stateTime / duration, 0, 1)
	local anticipate = pulse(t, 0.02, 0.10, 0.18, 0.30)
	local contact = pulse(t, 0.22, 0.32, 0.39, 0.52)
	local follow = pulse(t, 0.38, 0.50, 0.64, 0.78)
	local settle = pulse(t, 0.70, 0.78, 0.90, 0.99)

	local gait = controller.cfg.gait
	if gait == "HEAVY" then
		add(targets, "BodyJoint", pose(0, 0, -0.04 * contact, 7 * anticipate - 10 * contact, -6 * anticipate + 10 * contact, -5 * anticipate + 8 * follow))
		add(targets, "ChestJoint", pose(0, 0, -0.08 * contact, 12 * anticipate - 20 * contact + 7 * follow, -10 * anticipate + 14 * contact, -7 * anticipate + 10 * follow))
		add(targets, "NeckJoint", pitch(14 * anticipate - 25 * contact + 8 * follow))
		add(targets, "HeadJoint", pitch(10 * anticipate - 22 * contact + 7 * follow))
		add(targets, "FLHip", pitch(-44 * contact + 12 * follow))
		add(targets, "FLKnee", pitch(18 * contact))
	elseif gait == "LOW_HEAVY" then
		add(targets, "BodyJoint", pitch(9 * anticipate - 15 * contact))
		add(targets, "ChestJoint", pose(0, 0, -0.12 * contact, 13 * anticipate - 22 * contact, 0, 0))
		add(targets, "NeckJoint", pitch(17 * anticipate - 29 * contact))
		add(targets, "HeadJoint", pitch(12 * anticipate - 24 * contact))
	elseif gait == "CANINE" or gait == "CANINE_LIGHT" then
		add(targets, "BodyJoint", pose(0, 0, -0.05 * contact, 6 * anticipate - 14 * contact, 0, 0))
		add(targets, "NeckJoint", pitch(18 * anticipate - 34 * contact))
		add(targets, "HeadJoint", pitch(14 * anticipate - 28 * contact))
		add(targets, "JawJoint", pitch(31 * contact))
	else
		add(targets, "ChestJoint", pitch(10 * anticipate - 17 * contact + 5 * follow))
		add(targets, "NeckJoint", pitch(18 * anticipate - 25 * contact))
		add(targets, "HeadJoint", pitch(12 * anticipate - 22 * contact))
	end

	if settle > 0 then
		add(targets, "TailBaseJoint", yaw(math.sin(t * 18) * 5 * settle))
	end
end

local function hitTargets(controller, targets)
	local t = math.clamp(controller.stateTime / 0.58, 0, 1)
	local impact = pulse(t, 0.00, 0.06, 0.14, 0.55)
	local side = controller.hitSide
	add(targets, "BodyJoint", pose(0, 0, 0.05 * impact, 6 * impact, side * 8 * impact, side * 8 * impact))
	add(targets, "ChestJoint", pose(0, 0, 0.04 * impact, -13 * impact, -side * 12 * impact, -side * 10 * impact))
	add(targets, "NeckJoint", pose(0, 0, 0, 9 * impact, side * 6 * impact, 0))
	add(targets, "HeadJoint", pose(0, 0, 0, 12 * impact, side * 9 * impact, side * 5 * impact))
end

local function deathTargets(controller, targets)
	local t = smoother(math.clamp(controller.stateTime / 1.30, 0, 1))
	local side = controller.deathSide
	add(targets, "BodyJoint", pose(0, -0.40 * t, 0, 19 * t, 0, side * 70 * t))
	add(targets, "ChestJoint", pose(0, -0.18 * t, 0, 14 * t, 0, side * 26 * t))
	add(targets, "NeckJoint", pitch(22 * t))
	add(targets, "HeadJoint", pitch(20 * t))
	add(targets, "FLHip", pitch(-28 * t))
	add(targets, "FRHip", pitch(19 * t))
	add(targets, "BLHip", pitch(25 * t))
	add(targets, "BRHip", pitch(-20 * t))
	add(targets, "TailBaseJoint", roll(side * 24 * t))
end

local function updateLag(controller, dt)
	local root = controller.model.PrimaryPart
	local currentLook = root and root.CFrame.LookVector or Vector3.zAxis
	local lastLook = controller.lastLook
	local cross = lastLook:Cross(currentLook).Y
	local turnTarget = math.clamp(cross * 18, -1, 1)
	controller.turnLean, controller.turnLeanVelocity = springNumber(controller.turnLean, turnTarget, controller.turnLeanVelocity, 1.8, dt)
	controller.spineLag, controller.spineLagVelocity = springNumber(controller.spineLag, controller.turnLean, controller.spineLagVelocity, 1.05, dt)
	controller.headLag, controller.headLagVelocity = springNumber(controller.headLag, controller.spineLag, controller.headLagVelocity, 0.78, dt)
	controller.lastLook = lastLook:Lerp(currentLook, expAlpha(7, dt))
end

local function step(controller, dt)
	if not controller.model.Parent then
		controller:Destroy()
		return
	end

	controller.time += dt
	controller.stateTime += dt
	updateLag(controller, dt)

	local root = controller.model.PrimaryPart
	local velocity = root and root.AssemblyLinearVelocity or Vector3.zero
	local measuredSpeed = Vector3.new(velocity.X, 0, velocity.Z).Magnitude
	local requestedSpeed = controller.manualSpeed ~= nil and controller.manualSpeed or measuredSpeed

	local targets = zeroTargets(controller.joints)
	locomotionTargets(controller, targets, dt, requestedSpeed)

	local state = controller.state
	if state == "ALERT" then
		alertTargets(controller, targets)
	elseif state == "GRAZE" or state == "FORAGE" then
		grazeTargets(controller, targets)
	elseif state == "ATTACK" then
		attackTargets(controller, targets)
		if controller.stateTime >= controller.attackDuration then
			controller:SetState("LOCOMOTION")
		end
	elseif state == "HIT" then
		hitTargets(controller, targets)
		if controller.stateTime >= 0.58 then
			controller:SetState("LOCOMOTION")
		end
	elseif state == "DEATH" then
		deathTargets(controller, targets)
	end

	local response = state == "ATTACK" and 19 or state == "HIT" and 24 or state == "DEATH" and 9 or 15
	local alpha = expAlpha(response, dt)
	for name, joint in pairs(controller.joints) do
		local target = targets[name] or CFrame.identity
		joint.Transform = joint.Transform:Lerp(target, alpha)
	end

	controller.model:SetAttribute("WildlifeSpeedBlend", controller.speed)
	controller.model:SetAttribute("WildlifeRunBlend", controller.locomotionBlend)
	controller.model:SetAttribute("WildlifeTurnLean", controller.turnLean)
	controller.model:SetAttribute("WildlifeFootPlantFL", controller.footPlant.FL or 0)
	controller.model:SetAttribute("WildlifeFootPlantFR", controller.footPlant.FR or 0)
	controller.model:SetAttribute("WildlifeFootPlantBL", controller.footPlant.BL or 0)
	controller.model:SetAttribute("WildlifeFootPlantBR", controller.footPlant.BR or 0)
end

local Controller = {}
Controller.__index = Controller

function Controller:SetState(state, options)
	local nextState = string.upper(tostring(state or "LOCOMOTION"))
	if nextState == self.state and nextState ~= "ATTACK" and nextState ~= "HIT" then
		return
	end
	self.state = nextState
	self.stateTime = 0
	options = options or {}
	if nextState == "ATTACK" then
		self.attackDuration = math.max(0.58, tonumber(options.duration) or 0.92)
	elseif nextState == "HIT" then
		self.hitSide = math.clamp(tonumber(options.side) or 1, -1, 1)
	elseif nextState == "DEATH" then
		self.deathSide = (tonumber(options.side) or -1) >= 0 and 1 or -1
	end
	self.model:SetAttribute("WildlifeMotionState", nextState)
end

function Controller:SetSpeed(speed)
	self.manualSpeed = speed == nil and nil or math.max(0, tonumber(speed) or 0)
end

function Controller:Destroy()
	if self.connection then
		self.connection:Disconnect()
		self.connection = nil
	end
end

function Animator.bind(model, options)
	assert(model and model:IsA("Model"), "WildlifeAnimator.bind requires Model")
	assert(model.PrimaryPart, "Wildlife model requires PrimaryPart")
	options = options or {}

	local species = string.upper(tostring(model:GetAttribute("WildlifeSpecies") or model.Name))
	local cfg = Catalog.getSpecies(species) or Catalog.getSpecies("BEAR")
	local initialLook = model.PrimaryPart.CFrame.LookVector
	local controller = setmetatable({
		model = model,
		cfg = cfg,
		joints = getJoints(model),
		time = 0,
		phase = tonumber(options.phase) or 0,
		earPhase = tonumber(options.earPhase) or (species:byte(1) or 1) * 0.17,
		state = "LOCOMOTION",
		stateTime = 0,
		attackDuration = 0.92,
		hitSide = 1,
		deathSide = -1,
		manualSpeed = options.speed,
		nominalRunSpeed = tonumber(options.nominalRunSpeed) or 15,
		speed = tonumber(options.speed) or 0,
		speedVelocity = 0,
		locomotionBlend = 0,
		locomotionBlendVelocity = 0,
		turnLean = 0,
		turnLeanVelocity = 0,
		spineLag = 0,
		spineLagVelocity = 0,
		headLag = 0,
		headLagVelocity = 0,
		lastLook = initialLook,
		footPlant = { FL = 1, FR = 0, BL = 0, BR = 1 },
		connection = nil,
	}, Controller)

	model:SetAttribute("WildlifeMotionDriver", "CHARACTER_ANIMATION_SPRING_GAIT_V3")
	model:SetAttribute("WildlifeMotionDimensionality", "FULL_3D")
	model:SetAttribute("WildlifeFootPlant", true)
	model:SetAttribute("WildlifeSecondaryMotion", true)
	model:SetAttribute("WildlifeAnimationPrinciples", "KEY_POSE_ANTICIPATION_OVERLAP_FOLLOW_THROUGH_SETTLE")

	local signal = RunService:IsClient() and RunService.RenderStepped or RunService.Heartbeat
	controller.connection = signal:Connect(function(dt)
		step(controller, math.min(dt, 1 / 20))
	end)

	return controller
end

return table.freeze(Animator)
