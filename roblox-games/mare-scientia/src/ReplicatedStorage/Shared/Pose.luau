--!nonstrict
-- 뼈대가 있는 사람 모델의 T자 자세를 풀어 팔을 내린다 (클라이언트 전용).
-- 팔 방향을 월드 좌표로 계산해서, 뼈의 로컬 축 방향과 상관없이 아래쪽으로 돌린다.

local Pose = {}

local function findBone(model, pattern)
	for _, d in model:GetDescendants() do
		if d:IsA("Bone") and string.find(string.lower(d.Name), pattern) then
			return d
		end
	end
	return nil
end

local function lowerArm(upper, lower)
	if not upper or not lower then
		return
	end
	local a = upper.TransformedWorldCFrame
	local b = lower.TransformedWorldCFrame
	local dir = b.Position - a.Position
	if dir.Magnitude < 1e-4 then
		return
	end
	dir = dir.Unit
	local down = Vector3.new(0, -1, 0)
	local dot = math.clamp(dir:Dot(down), -1, 1)
	local angle = math.acos(dot)
	if angle < 0.15 then
		return -- 이미 내려가 있다
	end
	local axis = dir:Cross(down)
	if axis.Magnitude < 1e-4 then
		return
	end
	local turn = CFrame.fromAxisAngle(axis.Unit, angle * 0.88)
	local rot = a.Rotation
	upper.Transform = rot:Inverse() * turn * rot
end

function Pose.relaxArms(model)
	pcall(function()
		for _, side in { "l", "r" } do
			local upper = findBone(model, "upperarm[%._]" .. side)
			local lower = findBone(model, "lowerarm[%._]" .. side)
			lowerArm(upper, lower)
		end
	end)
end


-- 실제 Roblox R15 리그: 기본 도형으로 NPC를 만드는 대신 15관절 Humanoid를 생성한다.
-- 장면별 모든 인간 NPC는 이 원본을 복제하므로 뼈대 없는 정적 메시를 NPC로 사용하지 않는다.
local Players = game:GetService("Players")
local r15Template = nil
local r15Unavailable = false
local rigMotors = setmetatable({}, { __mode = "k" })

function Pose.createR15(parent, bottomPosition, facing, coat, rng, role, height)
	if not r15Template then
		if r15Unavailable then return nil end
		local description = Instance.new("HumanoidDescription")
		local ok, result = pcall(function()
			return Players:CreateHumanoidModelFromDescriptionAsync(description, Enum.HumanoidRigType.R15)
		end)
		description:Destroy()
		if not ok or not result then
			warn("[MareScientia] R15 모델 생성 실패", result)
			r15Unavailable = true
			return nil
		end
		local humanoid = result:FindFirstChildOfClass("Humanoid")
		local function countJoints()
			local n = 0
			for _, descendant in result:GetDescendants() do
				if descendant:IsA("Motor6D") then n += 1 end
			end
			return n
		end
		local joints = countJoints()
		-- 설명서로 만든 모델은 부품과 부착점만 있고 관절(Motor6D)이 없을 수 있다: 부착점으로 관절을 만든다
		if joints < 12 and humanoid then
			result.Parent = workspace
			pcall(function() humanoid:BuildRigFromAttachments() end)
			result.Parent = nil
			joints = countJoints()
		end
		if not humanoid or humanoid.RigType ~= Enum.HumanoidRigType.R15 or joints < 12 or not result:FindFirstChild("HumanoidRootPart") then
			warn("[MareScientia] 불완전한 R15 리그", joints)
			result:Destroy()
			r15Unavailable = true
			return nil
		end
		r15Template = result
	end

	local model = r15Template:Clone()
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	if not humanoid or not root then model:Destroy(); return nil end
	local skins = { Color3.fromRGB(242, 205, 170), Color3.fromRGB(214, 165, 125), Color3.fromRGB(176, 125, 90), Color3.fromRGB(128, 88, 62) }
	local skin = skins[rng:NextInteger(1, #skins)]
	local trousers = Color3.fromRGB(rng:NextInteger(38, 85), rng:NextInteger(35, 75), rng:NextInteger(33, 72))
	local coats = {
		Knight = Color3.fromRGB(110, 120, 142), Barbarian = Color3.fromRGB(128, 88, 62),
		Mage = Color3.fromRGB(102, 80, 144), Rogue = Color3.fromRGB(92, 108, 78),
		Rogue_Hooded = Color3.fromRGB(80, 90, 106),
	}
	local jacket = coat or coats[role] or Color3.fromRGB(140, 108, 80)
	for _, descendant in model:GetDescendants() do
		if descendant:IsA("BasePart") then
			descendant.Anchored = descendant == root
			descendant.CanCollide = false
			descendant.CanTouch = false
			descendant.Massless = descendant ~= root
			if descendant == root then
				descendant.Transparency = 1
			elseif descendant.Name == "Head" or string.find(descendant.Name, "Arm") or string.find(descendant.Name, "Hand") then
				descendant.Color = skin
			elseif string.find(descendant.Name, "Leg") or string.find(descendant.Name, "Foot") then
				descendant.Color = trousers
			elseif string.find(descendant.Name, "Torso") then
				descendant.Color = jacket
			end
		end
	end
	humanoid.AutoRotate = false
	humanoid.WalkSpeed = 0
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	model.Name = "R15NPC"
	model.Parent = parent
	local currentHeight = model:GetExtentsSize().Y
	if currentHeight < 0.01 then model:Destroy(); return nil end
	model:ScaleTo((height or 5.8) / currentHeight)
	local bounds, size = model:GetBoundingBox()
	local bottom = bounds.Position - Vector3.new(0, size.Y / 2, 0)
	model:PivotTo(CFrame.new(bottomPosition - bottom) * model:GetPivot())
	local placed = model:GetPivot()
	model:PivotTo(CFrame.new(placed.Position) * CFrame.Angles(0, facing or 0, 0))
	model:SetAttribute("RigType", "R15")
	rigMotors[model] = {
		leftArm = model:FindFirstChild("LeftShoulder", true),
		rightArm = model:FindFirstChild("RightShoulder", true),
		leftLeg = model:FindFirstChild("LeftHip", true),
		rightLeg = model:FindFirstChild("RightHip", true),
	}
	return model
end

function Pose.walkR15(model, phase, moving)
	local motors = rigMotors[model]
	if not motors then return end
	local stride = if moving then math.sin(phase) * 0.48 else 0
	if motors.leftArm then motors.leftArm.Transform = CFrame.Angles(-stride, 0, 0) end
	if motors.rightArm then motors.rightArm.Transform = CFrame.Angles(stride, 0, 0) end
	if motors.leftLeg then motors.leftLeg.Transform = CFrame.Angles(stride, 0, 0) end
	if motors.rightLeg then motors.rightLeg.Transform = CFrame.Angles(-stride, 0, 0) end
end

return Pose
