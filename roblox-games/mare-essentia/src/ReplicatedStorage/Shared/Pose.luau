--!nonstrict
-- 뼈대가 있는 사람 모델의 T자 자세를 풀어 팔을 내린다 (클라이언트 전용).
-- 팔 방향을 월드 좌표로 계산해서, 뼈의 로컬 축 방향과 상관없이 아래쪽으로 돌린다.

local Pose = {}

-- [비주얼 래더] 자동개발 루프가 올려 주는 NPC 디테일 단계(tools/vibe-visual-ladder.mjs 생성). 읽기 실패 시 1단계로 동작한다.
local ladderNpcTier = 1
do
	local module = script.Parent:FindFirstChild("VisualLadderState")
	if module then
		local ok, data = pcall(require, module)
		if ok and type(data) == "table" and type(data.Tier) == "table" then
			ladderNpcTier = tonumber(data.Tier.npc) or 1
		end
	end
end

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


-- 지역 복식: 머리에 간단한 모자를 얹는다 (부품 몇 개로 만든 모자: 챙 넓은 모자, 모자(캡), 삼각모, 털모자, 깃털 모자, 터번, 밀짚모자)
local function addHat(model, kind, color)
	local head = model:FindFirstChild("Head")
	if not (head and head:IsA("BasePart") and kind) then
		return
	end
	local h = head.Size
	local function piece(shape, size, offset, rot, mat)
		local q = Instance.new("Part")
		q.Name = "Hat"
		q.Shape = shape
		q.Size = size
		q.Color = color
		q.Material = mat or Enum.Material.Fabric
		q.CanCollide, q.CanTouch, q.CanQuery, q.Massless = false, false, false, true
		q.CFrame = head.CFrame * CFrame.new(offset) * (rot or CFrame.identity)
		q.Parent = model
		local w = Instance.new("WeldConstraint")
		w.Part0, w.Part1 = head, q
		w.Parent = q
		return q
	end
	local flat = CFrame.Angles(0, 0, math.pi / 2) -- 원기둥(축이 X)을 눕혀 가로로 놓는다
	if kind == "wide" or kind == "plume" or kind == "straw" then
		piece(Enum.PartType.Cylinder, Vector3.new(0.1, h.X * 1.9, h.X * 1.9), Vector3.new(0, h.Y * 0.5, 0), flat)
		piece(Enum.PartType.Cylinder, Vector3.new(h.Y * 0.55, h.X * 1.05, h.X * 1.05), Vector3.new(0, h.Y * 0.78, 0), flat)
		if kind == "plume" then
			piece(Enum.PartType.Block, Vector3.new(0.08, h.Y * 0.9, h.X * 0.25), Vector3.new(h.X * 0.45, h.Y * 1.0, 0), CFrame.Angles(0, 0, -0.7)).Color = Color3.fromRGB(240, 236, 226)
		end
	elseif kind == "cap" then
		piece(Enum.PartType.Ball, Vector3.new(h.X * 1.2, h.Y * 0.85, h.X * 1.2), Vector3.new(0, h.Y * 0.38, 0))
		piece(Enum.PartType.Block, Vector3.new(h.X * 0.9, 0.08, h.X * 0.45), Vector3.new(0, h.Y * 0.35, -h.X * 0.62))
	elseif kind == "tricorn" then
		for i = 0, 2 do
			piece(Enum.PartType.Block, Vector3.new(h.X * 1.9, 0.1, h.X * 0.7), Vector3.new(0, h.Y * 0.55, 0), CFrame.Angles(0, math.rad(60 * i), 0))
		end
		piece(Enum.PartType.Cylinder, Vector3.new(h.Y * 0.4, h.X * 0.95, h.X * 0.95), Vector3.new(0, h.Y * 0.72, 0), flat)
	elseif kind == "knit" then
		piece(Enum.PartType.Ball, Vector3.new(h.X * 1.15, h.Y * 0.95, h.X * 1.15), Vector3.new(0, h.Y * 0.42, 0))
		piece(Enum.PartType.Ball, Vector3.new(h.X * 0.3, h.X * 0.3, h.X * 0.3), Vector3.new(0, h.Y * 0.95, 0)).Color = Color3.fromRGB(236, 232, 220)
	elseif kind == "turban" then
		piece(Enum.PartType.Ball, Vector3.new(h.X * 1.3, h.Y * 1.0, h.X * 1.3), Vector3.new(0, h.Y * 0.45, 0))
	elseif kind == "fez" then
		-- 페즈: 위가 좁은 붉은 원통 + 검은 술
		piece(Enum.PartType.Cylinder, Vector3.new(h.Y * 0.75, h.X * 0.95, h.X * 0.95), Vector3.new(0, h.Y * 0.72, 0), CFrame.Angles(0, 0, math.pi / 2))
		piece(Enum.PartType.Block, Vector3.new(0.06, h.Y * 0.4, 0.06), Vector3.new(h.X * 0.4, h.Y * 0.8, 0)).Color = Color3.fromRGB(30, 30, 34)
	elseif kind == "kofia" then
		-- 코피아: 스와힐리 해안의 둥글고 납작한 수놓은 모자
		piece(Enum.PartType.Cylinder, Vector3.new(h.Y * 0.5, h.X * 1.02, h.X * 1.02), Vector3.new(0, h.Y * 0.62, 0), CFrame.Angles(0, 0, math.pi / 2))
	elseif kind == "kasa" then
		-- 삿갓: 넓고 납작한 원뿔 (원기둥 세 겹을 쌓아 만든다)
		piece(Enum.PartType.Cylinder, Vector3.new(0.08, h.X * 2.2, h.X * 2.2), Vector3.new(0, h.Y * 0.5, 0), CFrame.Angles(0, 0, math.pi / 2), Enum.Material.Wood)
		piece(Enum.PartType.Cylinder, Vector3.new(0.1, h.X * 1.5, h.X * 1.5), Vector3.new(0, h.Y * 0.62, 0), CFrame.Angles(0, 0, math.pi / 2), Enum.Material.Wood)
		piece(Enum.PartType.Cylinder, Vector3.new(0.12, h.X * 0.8, h.X * 0.8), Vector3.new(0, h.Y * 0.74, 0), CFrame.Angles(0, 0, math.pi / 2), Enum.Material.Wood)
	end
end

-- 머리카락: 짧은 머리·묶음·긴 머리·흰머리. (부품 몇 개로 만든 머리, 모자와 같은 방식)
local function addHair(model, kind, color)
	local head = model:FindFirstChild("Head")
	if not (head and head:IsA("BasePart") and kind) then
		return
	end
	local h = head.Size
	local function piece(shape, size, offset)
		local q = Instance.new("Part")
		q.Name = "Hair"
		q.Shape = shape
		q.Size = size
		q.Color = color
		q.Material = Enum.Material.Fabric
		q.CanCollide, q.CanTouch, q.CanQuery, q.Massless = false, false, false, true
		q.CFrame = head.CFrame * CFrame.new(offset)
		q.Parent = model
		local w = Instance.new("WeldConstraint")
		w.Part0, w.Part1 = head, q
		w.Parent = q
	end
	piece(Enum.PartType.Ball, Vector3.new(h.X * 1.12, h.Y * 0.8, h.X * 1.12), Vector3.new(0, h.Y * 0.25, h.X * 0.06))
	if kind == "long" then
		piece(Enum.PartType.Block, Vector3.new(h.X * 1.0, h.Y * 1.5, h.X * 0.35), Vector3.new(0, -h.Y * 0.2, h.X * 0.5))
	elseif kind == "bun" then
		piece(Enum.PartType.Ball, Vector3.new(h.X * 0.5, h.X * 0.5, h.X * 0.5), Vector3.new(0, h.Y * 0.72, h.X * 0.3))
	end
end

-- 치마·앞치마: 허리 아래를 감싸는 통(여성 복식, 요리사 앞치마)
local function addSkirt(model, color, long)
	local lower = model:FindFirstChild("LowerTorso")
	if not (lower and lower:IsA("BasePart")) then
		return
	end
	local len = if long then lower.Size.Y * 2.6 else lower.Size.Y * 1.7
	local q = Instance.new("Part")
	q.Name = "Skirt"
	q.Shape = Enum.PartType.Cylinder
	q.Size = Vector3.new(len, lower.Size.X * 1.55, lower.Size.X * 1.4)
	q.Color = color
	q.Material = Enum.Material.Fabric
	q.CanCollide, q.CanTouch, q.CanQuery, q.Massless = false, false, false, true
	q.CFrame = lower.CFrame * CFrame.new(0, -len * 0.38, 0) * CFrame.Angles(0, 0, math.pi / 2)
	q.Parent = model
	local w = Instance.new("WeldConstraint")
	w.Part0, w.Part1 = lower, q
	w.Parent = q
end

-- outfit 추가 필드: age("child"|"adult"|"elder"), hair("short"|"bun"|"long"), hairColor, skirt(Color3), skirtLong
function Pose.createR15(parent, bottomPosition, facing, coat, rng, role, height, outfit)
	if not r15Template then
		if r15Unavailable then return nil end
		local description = Instance.new("HumanoidDescription")
		local ok, result = pcall(function()
			return Players:CreateHumanoidModelFromDescriptionAsync(description, Enum.HumanoidRigType.R15)
		end)
		description:Destroy()
		if not ok or not result then
			warn("[MareEssentia] R15 모델 생성 실패", result)
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
			warn("[MareEssentia] 불완전한 R15 리그", joints)
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
	local trousers = (outfit and outfit.trousers) or Color3.fromRGB(rng:NextInteger(70, 120), rng:NextInteger(62, 105), rng:NextInteger(55, 95))
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
	-- 어린이: 머리를 크게 하고 목 관절을 올려 머리가 몸에 파묻히지 않게 한다 (모자·머리카락보다 먼저)
	if outfit and outfit.age == "child" then
		pcall(function()
			local head = model:FindFirstChild("Head")
			local neck = model:FindFirstChild("Neck", true)
			if head and head:IsA("BasePart") and neck and neck:IsA("Motor6D") then
				local delta = head.Size.Y * 0.3
				head.Size = head.Size * 1.3
				neck.C1 = neck.C1 * CFrame.new(0, -delta / 2, 0)
			end
		end)
	end
	if outfit and outfit.age then
		model:SetAttribute("Age", outfit.age)
	end
	-- [시대·문화·직업] 비주얼 메타데이터는 게임 세이브·경제·판정에 기록하지 않는다.
	if outfit then
		if type(outfit.year) == "number" then model:SetAttribute("AppearanceYear", outfit.year) end
		if type(outfit.culture) == "string" then model:SetAttribute("AppearanceCulture", outfit.culture) end
		if type(outfit.profession) == "string" then model:SetAttribute("AppearanceProfession", outfit.profession) end
	end
	if outfit and outfit.hair then
		pcall(addHair, model, outfit.hair, outfit.hairColor or Color3.fromRGB(60, 42, 30))
	end
	if outfit and outfit.skirt then
		pcall(addSkirt, model, outfit.skirt, outfit.skirtLong)
	end
	if outfit and outfit.hat then
		pcall(addHat, model, outfit.hat, outfit.hatColor or jacket)
	end
	-- 어린이는 머리가 크고 키가 작다, 노인은 조금 작다
	if outfit and outfit.age == "child" then
		height = (height or 5.8) * 0.62
	elseif outfit and outfit.age == "elder" then
		height = (height or 5.8) * 0.95
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
	-- [래더 NPC 2단계] 사람마다 체격·깊이·머리 크기를 조금씩 달리해 복제 인간처럼 보이지 않게 한다.
	if ladderNpcTier >= 2 and humanoid.AutomaticScalingEnabled ~= false then
		local function vary(name, lo, hi)
			local value = humanoid:FindFirstChild(name)
			if value and value:IsA("NumberValue") then
				value.Value = lo + rng:NextNumber() * (hi - lo)
			end
		end
		vary("BodyWidthScale", 0.92, 1.1)
		vary("BodyDepthScale", 0.94, 1.08)
		vary("HeadScale", 0.96, 1.08)
	end
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

-- 마을 주민의 일 모션. kind 에 따라 관절을 직접 놓는다 (t = 초, 제자리 일), 또는 걷기 위에 덧씌운다.
-- 제자리: hammer(망치질) hoe(괭이질) stir(젓기) sit(앉아 쉼) fish(낚시) talk(대화) sweep(쓸기) stall(손님 부름) bell(종 치기)
-- 걷기 위 덧씌움: carry(짐 들기) look(두리번) stoop(굽은 등)
function Pose.work(model, kind, t)
	local m = rigMotors[model]
	if not m then return end
	local function set(motor, cf)
		if motor then motor.Transform = cf end
	end
	local A = CFrame.Angles
	if kind == "carry" then
		set(m.leftArm, A(-1.25, 0, 0.1)); set(m.rightArm, A(-1.25, 0, -0.1))
		set(m.leftElbow, A(-0.5, 0, 0)); set(m.rightElbow, A(-0.5, 0, 0))
		return
	elseif kind == "look" then
		set(m.neck, A(0, math.sin(t * 0.9) * 0.9, 0))
		return
	elseif kind == "stoop" then
		set(m.waist, A(0.28, 0, 0))
		set(m.neck, A(-0.25, 0, 0))
		return
	end
	-- 제자리 일: 먼저 걷기 흔적을 지운다
	set(m.leftLeg, CFrame.identity); set(m.rightLeg, CFrame.identity)
	set(m.leftKnee, CFrame.identity); set(m.rightKnee, CFrame.identity)
	set(m.root, CFrame.identity); set(m.waist, CFrame.identity); set(m.neck, CFrame.identity)
	set(m.leftElbow, A(-0.15, 0, 0)); set(m.rightElbow, A(-0.15, 0, 0))
	local elder = model:GetAttribute("Age") == "elder"
	if kind == "hammer" then
		local s = math.max(0, math.sin(t * 5))
		set(m.rightArm, A(-1.5 - s * 1.0, 0, -0.1)); set(m.rightElbow, A(-0.6 - s * 0.5, 0, 0))
		set(m.leftArm, A(-0.9, 0, 0.2)); set(m.waist, A(0.12 + s * 0.15, 0, 0))
	elseif kind == "hoe" then
		local s = math.sin(t * 2.2)
		set(m.waist, A(0.55 + s * 0.3, 0, 0))
		set(m.leftArm, A(-1.0 - s * 0.5, 0, 0.1)); set(m.rightArm, A(-1.0 - s * 0.5, 0, -0.1))
		set(m.leftKnee, A(-0.15, 0, 0)); set(m.rightKnee, A(-0.15, 0, 0))
	elseif kind == "stir" then
		set(m.rightArm, A(-1.0 + math.sin(t * 3) * 0.15, 0, 0.15 * math.cos(t * 3))); set(m.rightElbow, A(-0.8, 0, 0))
		set(m.leftArm, A(-0.2, 0, 0.35)); set(m.waist, A(0.18, 0, 0))
	elseif kind == "sit" or kind == "fish" then
		set(m.root, CFrame.new(0, -1.1, 0))
		set(m.leftLeg, A(1.45, 0, 0.05)); set(m.rightLeg, A(1.45, 0, -0.05))
		set(m.leftKnee, A(-1.45, 0, 0)); set(m.rightKnee, A(-1.45, 0, 0))
		set(m.leftArm, A(-0.45, 0, 0.1)); set(m.rightArm, A(-0.45, 0, -0.1))
		set(m.waist, A(0.08, 0, 0))
		if kind == "fish" then
			local cast = math.max(0, math.sin(t * 0.6))
			set(m.rightArm, A(-1.0 - cast * 1.1, 0, -0.1)); set(m.rightElbow, A(-0.9, 0, 0))
			set(m.leftArm, A(-1.0, 0, 0.15)); set(m.neck, A(0.2, 0, 0))
		end
	elseif kind == "talk" then
		local g = math.sin(t * 3)
		set(m.rightArm, A(-0.9 + g * 0.5, 0, -0.35)); set(m.rightElbow, A(-0.9, 0, 0))
		set(m.leftArm, A(-0.4 - g * 0.2, 0, 0.3)); set(m.neck, A(math.sin(t * 1.7) * 0.12, math.sin(t * 0.8) * 0.25, 0))
	elseif kind == "sweep" then
		local s = math.sin(t * 3)
		set(m.waist, A(0.22, 0, 0))
		set(m.leftArm, A(-0.9, 0, 0.1 + s * 0.15)); set(m.rightArm, A(-1.0, 0, -0.1 + s * 0.2))
	elseif kind == "stall" then
		local g = math.max(0, math.sin(t * 1.4))
		set(m.rightArm, A(-0.5 - g * 1.2, 0, -0.5)); set(m.rightElbow, A(-0.5, 0, 0))
		set(m.leftArm, A(-0.3, 0, 0.25)); set(m.neck, A(0, math.sin(t * 0.7) * 0.4, 0))
	elseif kind == "bell" then
		local s = math.max(0, math.sin(t * 1.2))
		set(m.rightArm, A(-2.2 + s * 0.6, 0, -0.1)); set(m.leftArm, A(-2.2 + s * 0.6, 0, 0.1))
	end
	-- 노인은 어떤 일을 해도 등이 조금 굽는다
	if elder and m.waist and kind ~= "sit" then
		m.waist.Transform = m.waist.Transform * A(0.2, 0, 0)
	end
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
