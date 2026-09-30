-- 파일명: assets/roblox/survival-wildlife/BearWalkSample.server.luau
-- 역할: 곰 1마리의 실제 3D 저폴리 보행/달리기/경계/공격 모션 샘플
-- 사용: Roblox Studio 서버 스크립트에서 이 폴더를 ReplicatedStorage 또는 ServerScriptService 하위에 둔다.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local wildlifeFolder = ReplicatedStorage:WaitForChild("SurvivalWildlife")
local Factory = require(wildlifeFolder:WaitForChild("WildlifeFactory"))
local Animator = require(wildlifeFolder:WaitForChild("WildlifeAnimator"))

local old = workspace:FindFirstChild("WildlifeMotionSample")
if old then
	old:Destroy()
end

local sampleRoot = Instance.new("Folder")
sampleRoot.Name = "WildlifeMotionSample"
sampleRoot.Parent = workspace

local ground = Instance.new("Part")
ground.Name = "Ground"
ground.Anchored = true
ground.CanCollide = true
ground.Size = Vector3.new(54, 1, 38)
ground.Position = Vector3.new(0, -0.5, 0)
ground.Material = Enum.Material.Grass
ground.Color = Color3.fromRGB(83, 105, 63)
ground.Parent = sampleRoot

local bear = Factory.create("BEAR", "DARK_BROWN")
bear.Name = "BearSample"
bear.Parent = sampleRoot
bear:PivotTo(CFrame.new(-13, 0, 0) * CFrame.Angles(0, math.rad(-90), 0))

local controller = Animator.bind(bear, {
	nominalRunSpeed = 15,
	speed = 5.5,
})

bear:SetAttribute("SampleMotion", "BEAR_WALK_RUN_V2")
bear:SetAttribute("SampleQuality", "SMOOTH_3D_ARTICULATED")
bear:SetAttribute("Sample2DForbidden", true)

local phase = 0
local elapsed = 0
local segment = "WALK"
local currentSpeed = 5.5
local targetSpeed = 5.5
local distance = 0

local function setSegment(name, speed, state)
	segment = name
	targetSpeed = speed
	controller:SetState(state or "LOCOMOTION")
	bear:SetAttribute("SampleSegment", name)
end

setSegment("WALK", 5.5, "LOCOMOTION")

RunService.Heartbeat:Connect(function(dt)
	if not bear.Parent or not bear.PrimaryPart then
		return
	end

	elapsed += dt
	phase += dt
	currentSpeed += (targetSpeed - currentSpeed) * (1 - math.exp(-4.5 * dt))
	controller:SetSpeed(currentSpeed)

	-- 샘플 루트 이동은 데모 전용. 관절 보행은 WildlifeAnimator가 별도로 담당한다.
	if segment == "WALK" or segment == "RUN" then
		distance += currentSpeed * dt
		local radiusX = 14
		local radiusZ = 8
		local angle = distance / 10
		local x = math.cos(angle) * radiusX
		local z = math.sin(angle) * radiusZ
		local dx = -math.sin(angle) * radiusX
		local dz = math.cos(angle) * radiusZ
		local look = Vector3.new(dx, 0, dz).Unit
		local pos = Vector3.new(x, 0, z)
		bear:PivotTo(CFrame.lookAt(pos, pos + look))

		if segment == "WALK" and elapsed > 6 then
			elapsed = 0
			setSegment("RUN", 11.5, "LOCOMOTION")
		elseif segment == "RUN" and elapsed > 5 then
			elapsed = 0
			setSegment("ALERT", 0, "ALERT")
		end
	elseif segment == "ALERT" then
		if elapsed > 2.2 then
			elapsed = 0
			setSegment("ATTACK", 0, "ATTACK")
		end
	elseif segment == "ATTACK" then
		if elapsed > 1.2 then
			elapsed = 0
			setSegment("WALK", 5.5, "LOCOMOTION")
		end
	end
end)
