-- 파일명: assets/roblox/survival-wildlife/BearWalkSample.server.luau
-- 역할: Roblox Studio에서 바로 실행하는 곰 1마리 네이티브 3D 애니메이션 샘플
-- 서버는 위치/상태를 소유하고 관절 애니메이션은 WildlifeClient가 각 클라이언트에서 부드럽게 재생한다.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local wildlifeFolder = ReplicatedStorage:WaitForChild("SurvivalWildlife")
local Wildlife = require(wildlifeFolder:WaitForChild("SurvivalWildlife"))

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

local bear = Wildlife.Spawn(
	"BEAR",
	"DARK_BROWN",
	CFrame.new(-13, 0, 0) * CFrame.Angles(0, math.rad(-90), 0),
	sampleRoot
)
bear.Name = "BearSample"
bear:SetAttribute("SampleMotion", "BEAR_CHARACTER_ANIMATION_V3")
bear:SetAttribute("SampleQuality", "ROBLOX_NATIVE_ARTICULATED_CHARACTER_ANIMATION")
bear:SetAttribute("Sample2DForbidden", true)
bear:SetAttribute("SampleClientAnimation", true)

local elapsed = 0
local segment = "WALK"
local currentSpeed = 5.5
local targetSpeed = 5.5
local distance = 0

local function setSegment(name, speed, state)
	segment = name
	targetSpeed = speed
	Wildlife.SetDesiredSpeed(bear, speed)
	Wildlife.SetMotionState(bear, state or "LOCOMOTION", {
		attackDuration = 0.92,
	})
	bear:SetAttribute("SampleSegment", name)
end

setSegment("WALK", 5.5, "LOCOMOTION")

RunService.Heartbeat:Connect(function(dt)
	if not bear.Parent or not bear.PrimaryPart then
		return
	end

	elapsed += dt
	currentSpeed += (targetSpeed - currentSpeed) * (1 - math.exp(-4.5 * dt))
	Wildlife.SetDesiredSpeed(bear, currentSpeed)

	-- 이 이동은 샘플용 서버 authoritative root 경로다.
	-- 다리/척추/머리/귀/꼬리 관절은 클라이언트 WildlifeAnimator가 별도로 재생한다.
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
		if elapsed > 1.3 then
			elapsed = 0
			setSegment("WALK", 5.5, "LOCOMOTION")
		end
	end
end)
