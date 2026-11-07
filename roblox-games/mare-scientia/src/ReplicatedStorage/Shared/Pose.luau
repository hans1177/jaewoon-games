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

-- 얼굴: 기본 얼굴 데칼 대신 눈썹·눈·입·수염·흉터를 UI 로 그려, 사람마다 표정과 생김새가 다르게 한다.
-- (뷰포트 초상화는 SurfaceGui 를 그리지 못하므로 그때는 기본 얼굴을 그대로 둔다)
local function drawFace(head, role, skin, rng)
	local decal = head:FindFirstChildWhichIsA("Decal")
	local gui = Instance.new("SurfaceGui")
	gui.Name = "MareFace"
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.FixedSize
	gui.CanvasSize = Vector2.new(200, 200)
	gui.LightInfluence = 0.6
	gui.Parent = head
	local function box(x, y, w, h, color, rot, round)
		local f = Instance.new("Frame")
		f.AnchorPoint = Vector2.new(0.5, 0.5)
		f.Position = UDim2.fromOffset(x, y)
		f.Size = UDim2.fromOffset(w, h)
		f.BackgroundColor3 = color
		f.BorderSizePixel = 0
		f.Rotation = rot or 0
		f.Parent = gui
		if round then
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(0.5, 0)
			c.Parent = f
		end
		return f
	end
	local dark = Color3.fromRGB(34, 26, 22)
	local hair = ({ Color3.fromRGB(40, 28, 20), Color3.fromRGB(92, 60, 34), Color3.fromRGB(150, 112, 60), Color3.fromRGB(120, 120, 120), Color3.fromRGB(24, 22, 22) })[rng:NextInteger(1, 5)]
	local angry = role == "Barbarian" or role == "Rogue" or role == "Rogue_Hooded"
	local eyeY = 92
	-- 눈썹: 험상궂은 사람은 안쪽이 내려가고, 점잖은 사람은 부드럽게 올라간다
	local tilt = if angry then 16 else -6
	box(66, eyeY - 22, 36, 8, hair, tilt)
	box(134, eyeY - 22, 36, 8, hair, -tilt)
	-- 눈
	local eyeW = rng:NextInteger(14, 20)
	box(66, eyeY, eyeW, eyeW * (if angry then 0.7 else 1), Color3.fromRGB(245, 245, 240), 0, true)
	box(134, eyeY, eyeW, eyeW * (if angry then 0.7 else 1), Color3.fromRGB(245, 245, 240), 0, true)
	box(66 + 1, eyeY, eyeW * 0.55, eyeW * 0.55 * (if angry then 1.1 else 1), dark, 0, true)
	box(134 - 1, eyeY, eyeW * 0.55, eyeW * 0.55 * (if angry then 1.1 else 1), dark, 0, true)
	-- 코 그림자
	box(100, 112, 10, 18, skin:Lerp(Color3.new(0, 0, 0), 0.18), 0, true)
	-- 입
	local mouth = rng:NextInteger(1, 3)
	if role == "Knight" then
		box(100, 148, 40, 6, dark, 0)
	elseif angry then
		box(100, 150, 44, 8, dark, 0)
		box(80, 156, 8, 6, dark, 30)
		box(120, 156, 8, 6, dark, -30)
	elseif mouth == 1 then
		box(100, 148, 38, 7, dark, 0, true)
		box(80, 144, 7, 7, dark, 25, true)
		box(120, 144, 7, 7, dark, -25, true)
	else
		box(100, 150, 30, 6, dark, 0, true)
	end
	-- 수염과 콧수염
	local beard = rng:NextInteger(1, 4)
	if role == "Barbarian" or beard == 1 then
		box(100, 176, 100, 40, hair, 0, true)
		box(100, 132, 56, 12, hair, 0, true)
	elseif beard == 2 then
		box(100, 132, 60, 12, hair, 0, true)
	end
	-- 흉터와 안대
	if role == "Rogue" or role == "Rogue_Hooded" then
		if rng:NextInteger(1, 2) == 1 then
			box(66, eyeY, 40, 30, dark, 0, true)
			box(100, eyeY - 14, 130, 4, dark, -8)
		else
			box(140, 100, 5, 46, Color3.fromRGB(150, 70, 62), 14)
		end
	end
	if decal and gui.Parent then
		decal:Destroy()
	end
end

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
				if descendant:IsA("Motor6D") or descendant:IsA("AnimationConstraint") then n += 1 end
			end
			return n
		end
		local joints = countJoints()
		-- 설명서로 만든 모델은 부품과 부착점만 있고 관절(Motor6D)이 없을 수 있다: 부착점으로 관절을 만든다
		if joints < 12 and humanoid then
			-- BuildRigFromAttachments 가 관절을 만들지 못하는 환경이 있어, R15 표준 관절표대로 직접 잇는다
			local LINKS = {
				{ "Root", "HumanoidRootPart", "LowerTorso" }, { "Waist", "LowerTorso", "UpperTorso" }, { "Neck", "UpperTorso", "Head" },
				{ "LeftShoulder", "UpperTorso", "LeftUpperArm" }, { "LeftElbow", "LeftUpperArm", "LeftLowerArm" }, { "LeftWrist", "LeftLowerArm", "LeftHand" },
				{ "RightShoulder", "UpperTorso", "RightUpperArm" }, { "RightElbow", "RightUpperArm", "RightLowerArm" }, { "RightWrist", "RightLowerArm", "RightHand" },
				{ "LeftHip", "LowerTorso", "LeftUpperLeg" }, { "LeftKnee", "LeftUpperLeg", "LeftLowerLeg" }, { "LeftAnkle", "LeftLowerLeg", "LeftFoot" },
				{ "RightHip", "LowerTorso", "RightUpperLeg" }, { "RightKnee", "RightUpperLeg", "RightLowerLeg" }, { "RightAnkle", "RightLowerLeg", "RightFoot" },
			}
			for _, link in LINKS do
				local p0, p1 = result:FindFirstChild(link[2]), result:FindFirstChild(link[3])
				local a0 = p0 and p0:FindFirstChild(link[1] .. "RigAttachment")
				local a1 = p1 and p1:FindFirstChild(link[1] .. "RigAttachment")
				if p0 and p1 and a0 and a1 and not p1:FindFirstChild(link[1]) then
					local m = Instance.new("Motor6D")
					m.Name = link[1]
					m.Part0, m.Part1 = p0, p1
					m.C0, m.C1 = a0.CFrame, a1.CFrame
					m.Parent = p1
				end
			end
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
	local trousers = Color3.fromRGB(rng:NextInteger(70, 120), rng:NextInteger(62, 105), rng:NextInteger(55, 95))
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
			local n = descendant.Name
			if descendant == root then
				descendant.Transparency = 1
			elseif n == "Head" then
				descendant.Color = if role == "Rogue_Hooded" then jacket else skin
				descendant.Material = if role == "Rogue_Hooded" then Enum.Material.Fabric else Enum.Material.SmoothPlastic
			elseif string.find(n, "Hand") then
				-- 손: 기사·도적은 가죽 장갑, 나머지는 맨손
				local gloved = role == "Knight" or role == "Rogue" or role == "Rogue_Hooded"
				descendant.Color = if gloved then trousers:Lerp(Color3.new(0, 0, 0), 0.25) else skin
				descendant.Material = if gloved then Enum.Material.Leather else Enum.Material.SmoothPlastic
			elseif string.find(n, "Arm") then
				if role == "Knight" then
					descendant.Color = jacket
					descendant.Material = Enum.Material.Metal
				elseif role == "Barbarian" then
					descendant.Color = skin
					descendant.Material = Enum.Material.SmoothPlastic
				else
					descendant.Color = jacket
					descendant.Material = Enum.Material.Fabric
				end
			elseif string.find(n, "Foot") then
				descendant.Color = trousers:Lerp(Color3.new(0, 0, 0), 0.4)
				descendant.Material = if role == "Knight" then Enum.Material.Metal else Enum.Material.Leather
			elseif string.find(n, "Leg") then
				descendant.Color = trousers
				descendant.Material = if role == "Knight" then Enum.Material.Metal else Enum.Material.Fabric
			elseif string.find(n, "Torso") then
				-- 윗몸은 겉옷 색, 아랫몸은 조금 어둡게 (허리띠 느낌)
				descendant.Color = if n == "LowerTorso" then jacket:Lerp(Color3.new(0, 0, 0), 0.22) else jacket
				descendant.Material = if role == "Knight" then Enum.Material.Metal elseif role == "Barbarian" then Enum.Material.Leather else Enum.Material.Fabric
			end
		end
	end
	local headPart = model:FindFirstChild("Head")
	if headPart and headPart:IsA("BasePart") and not parent:IsA("WorldModel") then
		pcall(drawFace, headPart, role, skin, rng)
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
		leftKnee = model:FindFirstChild("LeftKnee", true),
		rightKnee = model:FindFirstChild("RightKnee", true),
		leftElbow = model:FindFirstChild("LeftElbow", true),
		rightElbow = model:FindFirstChild("RightElbow", true),
		waist = model:FindFirstChild("Waist", true),
		neck = model:FindFirstChild("Neck", true),
		root = model:FindFirstChild("Root", true),
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

-- 전투용 모션: 걷기(무릎·팔꿈치·몸 흔들림), 숨쉬기, 공격 휘두르기, 맞아서 휘청임
-- st = { phase, moving, t, attack = 0..1 (휘두르는 진행도, 0이면 안 함), hurt = 0..1 }
function Pose.animateR15(model, st)
	local m = rigMotors[model]
	if not m then
		return
	end
	local moving = st.moving
	local sw = if moving then math.sin(st.phase) else 0
	local atk = st.attack or 0
	local hurt = st.hurt or 0
	local swing = if atk > 0 then math.sin(math.min(atk, 1) * math.pi) else 0
	local breathe = math.sin((st.t or 0) * 2.2) * 0.025
	local bob = if moving then math.abs(math.cos(st.phase)) * 0.18 else 0
	if m.root then
		m.root.Transform = CFrame.new(0, bob, 0) * CFrame.Angles(if moving then -0.1 else 0, if moving then sw * 0.07 else 0, 0)
	end
	if m.waist then
		m.waist.Transform = CFrame.Angles(breathe + swing * 0.35 - hurt * 0.4, -swing * 0.5 + (if moving then -sw * 0.12 else 0), 0)
	end
	if m.neck then
		m.neck.Transform = CFrame.Angles(hurt * 0.3 - swing * 0.1, 0, 0)
	end
	local armA = -sw * 0.65
	if m.leftArm then
		m.leftArm.Transform = CFrame.Angles(armA - hurt * 0.5, 0, 0.08 + hurt * 0.2)
	end
	if m.rightArm then
		local raise = -swing * 2.4
		m.rightArm.Transform = CFrame.Angles(-armA + raise - hurt * 0.5, 0, -0.08 - hurt * 0.2)
	end
	if m.leftElbow then
		m.leftElbow.Transform = CFrame.Angles(-(if moving then math.max(0, -sw) * 0.5 else 0.12) - hurt * 0.3, 0, 0)
	end
	if m.rightElbow then
		m.rightElbow.Transform = CFrame.Angles(-(if moving then math.max(0, sw) * 0.5 else 0.12) - swing * 0.7, 0, 0)
	end
	if m.leftLeg then
		m.leftLeg.Transform = CFrame.Angles(sw * 0.7, 0, 0)
	end
	if m.rightLeg then
		m.rightLeg.Transform = CFrame.Angles(-sw * 0.7, 0, 0)
	end
	if m.leftKnee then
		m.leftKnee.Transform = CFrame.Angles(if moving then math.max(0, -sw) * 0.9 else 0, 0, 0)
	end
	if m.rightKnee then
		m.rightKnee.Transform = CFrame.Angles(if moving then math.max(0, sw) * 0.9 else 0, 0, 0)
	end
end

-- 쓰러지는 모션: alpha 0 -> 1 동안 뒤로 눕고 점점 투명해진다
function Pose.dieR15(model, alpha)
	local m = rigMotors[model]
	if m and m.root then
		local a = math.clamp(alpha, 0, 1)
		m.root.Transform = CFrame.new(0, -a * 1.2, a * 0.8) * CFrame.Angles(-a * 1.45, 0, 0)
	end
	local t = math.clamp((alpha - 0.4) / 0.6, 0, 1)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" then
			d.Transparency = t
		end
	end
end

return Pose
