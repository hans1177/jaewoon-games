-- 파일명: assets/roblox/survival-wildlife/WildlifeAnimator.luau
-- 역할: 3D 야생동물 Motor6D 관절을 프레임 연속 곡선으로 구동한다.
-- 원칙: Root 이동은 게임플레이가 소유하고, 이 모듈은 관절/체중/접지/보조동작만 담당한다.

local RunService = game:GetService("RunService")

local Catalog = require(script.Parent.WildlifeCatalog)

local Animator = {}

local TAU = math.pi * 2

local function expAlpha(speed, dt)
	return 1 - math.exp(-math.max(0.01, speed) * math.max(0, dt))
end

local function smooth01(t)
	t = math.clamp(t, 0, 1)
	return t * t * (3 - 2 * t)
end

local function easeOutBack(t)
	t = math.clamp(t, 0, 1)
	local c1 = 1.70158
	local c3 = c1 + 1
	return 1 + c3 * (t - 1) ^ 3 + c1 * (t - 1) ^ 2
end

local function curvePulse(t, attack, peak, release)
	if t <= 0 or t >= release then
		return 0
	end
	if t < attack then
		return smooth01(t / attack)
	end
	if t < peak then
		return 1
	end
	return 1 - smooth01((t - peak) / math.max(0.001, release - peak))
end

local function pitch(degrees)
	return CFrame.Angles(math.rad(degrees), 0, 0)
end

local function yaw(degrees)
	return CFrame.Angles(0, math.rad(degrees), 0)
end

local function roll(degrees)
	return CFrame.Angles(0, 0, math.rad(degrees))
end

local function pose(x, y, z, rx, ry, rz)
	return CFrame.new(x or 0, y or 0, z or 0)
		* CFrame.Angles(math.rad(rx or 0), math.rad(ry or 0), math.rad(rz or 0))
end

local function gaitTuning(gait)
	if gait == "HEAVY" then
		return 0.70, 15, 20, 0.65
	elseif gait == "LOW_HEAVY" or gait == "SMALL_MAMMAL_HEAVY" then
		return 0.82, 19, 24, 0.78
	elseif gait == "HOOFED_HEAVY" then
		return 0.88, 23, 28, 0.90
	elseif gait == "HOOFED_LIGHT" or gait == "HOOFED_CLIMBER" then
		return 1.02, 29, 34, 1.02
	elseif gait == "CANINE" then
		return 1.05, 27, 31, 1.04
	elseif gait == "CANINE_LIGHT" or gait == "SMALL_MAMMAL_FAST" then
		return 1.16, 31, 36, 1.14
	elseif gait == "HOPPER" then
		return 1.12, 36, 42, 1.18
	elseif gait == "GROUND_BIRD" or gait == "BIRD" then
		return 1.12, 28, 30, 1.12
	end
	return 1.0, 24, 30, 1.0
end

local function getJoints(model)
	local joints = {}
	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("Motor6D") then
			joints[descendant.Name] = descendant
		end
	end
	return joints
end

local function zeroTargets(joints)
	local targets = {}
	for name in pairs(joints) do
		targets[name] = CFrame.identity
	end
	return targets
end

local function set(targets, name, value)
	if targets[name] then
		targets[name] = value
	end
end

local function add(targets, name, value)
	if targets[name] then
		targets[name] = targets[name] * value
	end
end

local function applyLeg(targets, prefix, phase, strideDeg, kneeDeg, lift, stance)
	local s = math.sin(phase)
	local c = math.cos(phase)
	local swing = s * strideDeg
	local forwardPlant = math.max(0, -s)
	local knee = math.max(0, c) * kneeDeg + math.max(0, s) * kneeDeg * 0.25
	local yLift = math.max(0, s) * lift
	local ankleComp = -swing * 0.38 - knee * 0.22

	if stance > 0.72 then
		swing = swing * 0.82
		knee = knee * 0.70
	end

	set(targets, prefix .. "Hip", pose(0, yLift * 0.12, 0, swing, 0, 0))
	set(targets, prefix .. "Knee", pitch(-knee))
	set(targets, prefix .. "Ankle", pose(0, yLift * 0.14, -forwardPlant * 0.04, ankleComp, 0, 0))
end

local function locomotionTargets(controller, targets, dt, speed)
	local cfg = controller.cfg
	local gait = cfg.gait
	local speedFactor, strideDeg, kneeDeg, cadenceFactor = gaitTuning(gait)
	local normalized = math.clamp(speed / math.max(1, controller.nominalRunSpeed), 0, 1.45)
	local moving = normalized > 0.04

	if moving then
		local cadence = (2.7 + normalized * 4.0) * cfg.stride * cadenceFactor
		controller.phase += dt * cadence
	else
		controller.phase += dt * 0.45
	end

	local phase = controller.phase
	local amplitude = moving and math.clamp(normalized, 0.18, 1.0) or 0
	local legStride = strideDeg * amplitude * speedFactor
	local legKnee = kneeDeg * math.clamp(amplitude + 0.08, 0, 1)
	local footLift = cfg.footLift * amplitude

	if gait == "HOPPER" and moving then
		local hop = math.max(0, math.sin(phase))
		applyLeg(targets, "FL", phase + 0.15, legStride * 0.45, legKnee * 0.55, footLift * 0.55, 0)
		applyLeg(targets, "FR", phase - 0.15, legStride * 0.45, legKnee * 0.55, footLift * 0.55, 0)
		applyLeg(targets, "BL", phase + math.pi, legStride * 1.15, legKnee, footLift, 0)
		applyLeg(targets, "BR", phase + math.pi, legStride * 1.15, legKnee, footLift, 0)
		add(targets, "BodyJoint", pose(0, hop * cfg.bodyBob * 0.75, 0, -hop * 5, 0, 0))
	else
		-- 자연스러운 대각 보행: 앞왼-뒤오 / 앞오-뒤왼 위상이 반대다.
		applyLeg(targets, "FL", phase, legStride, legKnee, footLift, normalized)
		applyLeg(targets, "BR", phase, legStride, legKnee, footLift, normalized)
		applyLeg(targets, "FR", phase + math.pi, legStride, legKnee, footLift, normalized)
		applyLeg(targets, "BL", phase + math.pi, legStride, legKnee, footLift, normalized)

		local doublePhase = phase * 2
		local bob = moving and math.abs(math.sin(doublePhase)) * cfg.bodyBob * amplitude or 0
		local rollDeg = moving and math.sin(phase) * 2.2 * amplitude or 0
		local pitchDeg = moving and math.sin(doublePhase + 0.45) * 1.7 * amplitude or 0
		add(targets, "BodyJoint", pose(0, bob, 0, pitchDeg, 0, rollDeg))
		add(targets, "ChestJoint", pose(0, -bob * 0.16, 0, -pitchDeg * 0.72, 0, -rollDeg * 0.55))
	end

	local breath = math.sin(controller.time * 1.72) * 0.5 + 0.5
	if not moving then
		add(targets, "ChestJoint", pose(0, breath * 0.025, 0, breath * 0.75, 0, 0))
		add(targets, "BodyJoint", pose(0, breath * 0.010, 0, -breath * 0.28, 0, 0))
	end

	local headCounter = moving and -math.sin(phase * 2 + 0.55) * 2.7 * amplitude or math.sin(controller.time * 0.72) * 1.1
	add(targets, "NeckJoint", pitch(headCounter * 0.45))
	add(targets, "HeadJoint", pitch(headCounter))

	local tailSway = math.sin(controller.time * (moving and 3.2 or 1.35) + 0.4) * (moving and 9 or 5)
	add(targets, "TailBaseJoint", yaw(tailSway))
	add(targets, "TailTipJoint", yaw(tailSway * 0.75))

	local ear = math.sin(controller.time * 2.1 + controller.earPhase)
	add(targets, "EarLJoint", roll(ear * 2.0))
	add(targets, "EarRJoint", roll(-ear * 1.7))

	if gait == "GROUND_BIRD" and moving then
		add(targets, "NeckJoint", pitch(math.sin(phase * 2) * 5.5))
		add(targets, "HeadJoint", pitch(-math.sin(phase * 2) * 7.5))
	end
end

local function alertTargets(controller, targets)
	local t = smooth01(math.min(1, controller.stateTime / 0.32))
	add(targets, "ChestJoint", pitch(-4 * t))
	add(targets, "NeckJoint", pitch(-9 * t))
	add(targets, "HeadJoint", pitch(-11 * t))
	add(targets, "EarLJoint", roll(-6 * t))
	add(targets, "EarRJoint", roll(6 * t))
	add(targets, "TailBaseJoint", pitch(6 * t))
end

local function grazeTargets(controller, targets)
	local t = smooth01(math.min(1, controller.stateTime / 0.42))
	add(targets, "NeckJoint", pitch(48 * t))
	add(targets, "HeadJoint", pitch(34 * t))
	add(targets, "ChestJoint", pitch(4 * t))
	local chew = math.sin(controller.time * 5.0) * 5
	add(targets, "JawJoint", pitch(math.max(0, chew)))
end

local function attackTargets(controller, targets)
	local cfg = controller.cfg
	local family = cfg.gait
	local duration = controller.attackDuration
	local t = math.clamp(controller.stateTime / duration, 0, 1)
	local wind = curvePulse(t, 0.16, 0.26, 0.44)
	local strike = curvePulse(t, 0.25, 0.52, 0.80)
	local recover = smooth01(math.clamp((t - 0.68) / 0.32, 0, 1))

	if family == "HEAVY" then
		add(targets, "ChestJoint", pose(0, 0, -0.08 * wind, 10 * wind - 13 * strike, 9 * strike, 7 * strike))
		add(targets, "NeckJoint", pitch(12 * wind - 20 * strike))
		add(targets, "HeadJoint", pitch(8 * wind - 16 * strike))
		add(targets, "FLHip", pitch(-30 * strike))
	elseif family == "LOW_HEAVY" then
		add(targets, "BodyJoint", pitch(8 * wind - 12 * strike))
		add(targets, "ChestJoint", pose(0, 0, -0.10 * strike, 11 * wind - 19 * strike, 0, 0))
		add(targets, "NeckJoint", pitch(15 * wind - 25 * strike))
		add(targets, "HeadJoint", pitch(10 * wind - 20 * strike))
	elseif family == "CANINE" or family == "CANINE_LIGHT" then
		add(targets, "BodyJoint", pose(0, 0, -0.05 * strike, 5 * wind - 11 * strike, 0, 0))
		add(targets, "NeckJoint", pitch(16 * wind - 30 * strike))
		add(targets, "HeadJoint", pitch(12 * wind - 24 * strike))
		add(targets, "JawJoint", pitch(28 * strike))
	elseif family == "HOOFED_HEAVY" or family == "HOOFED_LIGHT" or family == "HOOFED_CLIMBER" then
		add(targets, "ChestJoint", pitch(9 * wind - 16 * strike))
		add(targets, "NeckJoint", pitch(20 * wind - 28 * strike))
		add(targets, "HeadJoint", pitch(15 * wind - 20 * strike))
		add(targets, "FLHip", pitch(-18 * strike))
		add(targets, "FRHip", pitch(-18 * strike))
	elseif family == "GROUND_BIRD" or family == "BIRD" then
		add(targets, "NeckJoint", pitch(22 * wind - 38 * strike))
		add(targets, "HeadJoint", pitch(18 * wind - 34 * strike))
		add(targets, "WingLJoint", roll(-24 * strike))
		add(targets, "WingRJoint", roll(24 * strike))
	else
		add(targets, "ChestJoint", pitch(8 * wind - 14 * strike))
		add(targets, "HeadJoint", pitch(-18 * strike))
	end

	if recover > 0 then
		add(targets, "ChestJoint", pitch(3 * (1 - recover)))
	end
end

local function hitTargets(controller, targets)
	local t = math.clamp(controller.stateTime / 0.55, 0, 1)
	local pulse = curvePulse(t, 0.06, 0.16, 0.62)
	local side = controller.hitSide
	add(targets, "BodyJoint", pose(0, 0, 0.05 * pulse, 5 * pulse, side * 7 * pulse, side * 8 * pulse))
	add(targets, "ChestJoint", pose(0, 0, 0.04 * pulse, -11 * pulse, -side * 10 * pulse, -side * 8 * pulse))
	add(targets, "NeckJoint", pose(0, 0, 0, 8 * pulse, side * 5 * pulse, 0))
	add(targets, "HeadJoint", pose(0, 0, 0, 10 * pulse, side * 8 * pulse, side * 5 * pulse))
end

local function deathTargets(controller, targets)
	local t = smooth01(math.clamp(controller.stateTime / 1.15, 0, 1))
	local side = controller.deathSide
	add(targets, "BodyJoint", pose(0, -0.34 * t, 0, 18 * t, 0, side * 66 * t))
	add(targets, "ChestJoint", pose(0, -0.16 * t, 0, 13 * t, 0, side * 24 * t))
	add(targets, "NeckJoint", pitch(20 * t))
	add(targets, "HeadJoint", pitch(18 * t))
	add(targets, "FLHip", pitch(-26 * t))
	add(targets, "FRHip", pitch(18 * t))
	add(targets, "BLHip", pitch(24 * t))
	add(targets, "BRHip", pitch(-18 * t))
	add(targets, "TailBaseJoint", roll(side * 22 * t))
end

local function flyTargets(controller, targets, speed)
	local phase = controller.phase
	local wing = math.sin(phase * 1.25)
	local flap = wing * (18 + math.min(speed, 20) * 1.2)
	add(targets, "WingLJoint", roll(-38 - flap))
	add(targets, "WingRJoint", roll(38 + flap))
	add(targets, "BodyJoint", pitch(-6 + math.sin(phase * 0.5) * 2))
	add(targets, "HeadJoint", pitch(6 - math.sin(phase * 0.5) * 2))
end

local function step(controller, dt)
	local model = controller.model
	if not model.Parent then
		controller:Destroy()
		return
	end

	controller.time += dt
	controller.stateTime += dt

	local root = model.PrimaryPart
	local velocity = root and root.AssemblyLinearVelocity or Vector3.zero
	local planarSpeed = Vector3.new(velocity.X, 0, velocity.Z).Magnitude
	if controller.manualSpeed then
		planarSpeed = controller.manualSpeed
	end

	local targets = zeroTargets(controller.joints)
	locomotionTargets(controller, targets, dt, planarSpeed)

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
		if controller.stateTime >= 0.55 then
			controller:SetState("LOCOMOTION")
		end
	elseif state == "DEATH" then
		deathTargets(controller, targets)
	elseif state == "FLY" then
		flyTargets(controller, targets, planarSpeed)
	end

	local smoothing = state == "HIT" and 23 or state == "ATTACK" and 18 or state == "DEATH" and 9 or 14
	local alpha = expAlpha(smoothing, dt)
	for name, joint in pairs(controller.joints) do
		local target = targets[name] or CFrame.identity
		joint.Transform = joint.Transform:Lerp(target, alpha)
	end
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
		self.attackDuration = math.max(0.42, tonumber(options.duration) or 0.78)
	elseif nextState == "HIT" then
		self.hitSide = math.clamp(tonumber(options.side) or 1, -1, 1)
	elseif nextState == "DEATH" then
		self.deathSide = (tonumber(options.side) or -1) >= 0 and 1 or -1
	end
	self.model:SetAttribute("WildlifeMotionState", nextState)
end

function Controller:SetSpeed(speed)
	if speed == nil then
		self.manualSpeed = nil
		return
	end
	self.manualSpeed = math.max(0, tonumber(speed) or 0)
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
	local controller = setmetatable({
		model = model,
		cfg = cfg,
		joints = getJoints(model),
		time = 0,
		phase = tonumber(options.phase) or 0,
		earPhase = tonumber(options.earPhase) or (species:byte(1) or 1) * 0.17,
		state = "LOCOMOTION",
		stateTime = 0,
		attackDuration = 0.78,
		hitSide = 1,
		deathSide = -1,
		manualSpeed = options.speed,
		nominalRunSpeed = tonumber(options.nominalRunSpeed) or 15,
		connection = nil,
	}, Controller)

	model:SetAttribute("WildlifeMotionDriver", "MOTOR6D_SMOOTH_CURVE_V2")
	model:SetAttribute("WildlifeMotionDimensionality", "FULL_3D")
	model:SetAttribute("WildlifeFootPlant", true)
	model:SetAttribute("WildlifeSecondaryMotion", true)

	local signal = RunService:IsClient() and RunService.RenderStepped or RunService.Heartbeat
	controller.connection = signal:Connect(function(dt)
		step(controller, dt)
	end)

	return controller
end

return table.freeze(Animator)
