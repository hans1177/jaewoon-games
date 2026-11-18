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
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local r15Template = nil
local r15RetryAt = 0 -- 일시적인 아바타 생성 실패 후 재시도. 영구적으로 모든 동료를 숨기지 않는다.
local rigMotors = setmetatable({}, { __mode = "k" })
-- R15 모션 전환: 게임 데이터에 저장하지 않는 NPC별 관절 보간 상태.
local r15ActionBlends = setmetatable({}, { __mode = "k" })

-- 얼굴: 기본 얼굴 데칼 대신 눈썹·눈·입·수염·흉터를 UI 로 그려, 사람마다 표정과 생김새가 다르게 한다.
-- (뷰포트 초상화는 SurfaceGui 를 그리지 못하므로 그때는 기본 얼굴을 그대로 둔다)
local function drawFace(head, role, skin, rng, gender)
	local decal = head:FindFirstChildWhichIsA("Decal")
	local gui = Instance.new("SurfaceGui")
	gui.Name = "MareFace"
	-- [주민 얼굴 정면] 기존 머리 데칼의 Face가 Back인 아바타에서도
	-- 몸통 전면과 같은 로컬 -Z에만 얼굴을 그린다. 필요 시 목 관절의 180도 교정은 아래 한 곳에서 한다.
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
	if gender ~= "female" and (role == "Barbarian" or beard == 1) then
		box(100, 176, 100, 40, hair, 0, true)
		box(100, 132, 56, 12, hair, 0, true)
	elseif gender ~= "female" and beard == 2 then
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

-- [직업별 실제 복식] 주민 직군만 외형 분류한다. 경제 직업·게임 저장·전투 판정은 원본 그대로다.
local NPC_PROFESSION_LOOK = {
	-- [1차 산업/도시 장인/해양직] 기존 직업 ID만 외형 분류한다. 수익·생산량·저장값 불변.
	farmer = "worker", docker = "worker", herder = "worker", laborer = "worker",
	royal_stablehand = "worker", royal_gardener = "worker",
	carpenter = "artisan", smith = "artisan", tailor = "artisan", baker = "artisan",
	shipwright = "artisan", industry_artisan = "artisan",
	fisher = "sailor", sailor = "sailor", boatswain = "sailor",
	guard = "guard", royal_guard = "guard", royal_gate_guard = "guard",
	royal_ceremonial_guard = "guard", royal_light_cavalry = "guard",
	merchant = "official", banker = "official", clerk = "official", teacher = "official",
	royal_scholar = "official", royal_scribe = "official", royal_archivist = "official",
	royal_administrator = "official", royal_court_officer = "official", royal_servant = "official",
	royal_messenger = "official",
}
-- [지역/시대] 서유럽 근세 재단복만 적용하고 비유럽·중세 복식은 그대로 보존한다.
local EUROPEAN_DETAIL_CULTURES = {
	north = true, med = true, brick = true, nordic = true, stone = true,
	iberia = true, italy = true, france = true, britain = true,
	england = true, portugal = true, spain = true, netherlands = true,
}
-- outfit 추가 필드: age("child"|"adult"|"elder"), hair("short"|"bun"|"long"), hairColor, skirt(Color3), skirtLong
function Pose.createR15(parent, bottomPosition, facing, coat, rng, role, height, outfit)
	if not r15Template then
		if os.clock() < r15RetryAt then return nil end
		local description = Instance.new("HumanoidDescription")
		local ok, result = pcall(function()
			return Players:CreateHumanoidModelFromDescriptionAsync(description, Enum.HumanoidRigType.R15)
		end)
		description:Destroy()
		if not ok or not result then
			warn("[MareEssentia] R15 모델 생성 실패", result)
			r15RetryAt = os.clock() + 8
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
			r15RetryAt = os.clock() + 8
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
				descendant.Color = skin
				descendant.Material = Enum.Material.SmoothPlastic
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
			if head and head:IsA("BasePart") and neck and (neck:IsA("Motor6D") or neck:IsA("AnimationConstraint")) then
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
		if outfit.gender == "female" or outfit.gender == "male" then model:SetAttribute("AppearanceGender", outfit.gender) end
		-- [실물 머리 맞춤] 기존 머리/연령 선택을 다시 뽑지 않고 3D 머리 메시와 같은 값으로 묶는다.
		if outfit.hair == "short" or outfit.hair == "bun" or outfit.hair == "long" then
			model:SetAttribute("NpcHairStyle", outfit.hair)
		end
		if typeof(outfit.hairColor) == "Color3" then model:SetAttribute("NpcHairTint", outfit.hairColor) end
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
		pcall(drawFace, headPart, role, skin, rng, outfit and outfit.gender)
	end
	humanoid.AutoRotate = false
	humanoid.WalkSpeed = 0
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	model.Name = "R15NPC"
	-- [공통 R15 외형] 직업·나이에 따라 실루엣과 몸짓을 부여한다. 게임 수치·저장은 변경하지 않는다.
	local physique = if outfit and type(outfit.bodyType) == "string" then outfit.bodyType
		elseif outfit and outfit.age == "elder" then "elder"
		elseif outfit and outfit.gender == "female" then "slim"
		elseif role == "Barbarian" then "heavy" elseif role == "Rogue" or role == "Rogue_Hooded" then "slim"
		elseif role == "Knight" then "athletic" else "average"
	local style = if outfit and type(outfit.motionStyle) == "string" then outfit.motionStyle
		elseif outfit and outfit.age == "elder" then "elder"
		elseif role == "Knight" then "disciplined" elseif role == "Barbarian" then "heavy"
		elseif role == "Mage" then "scholar" elseif role == "Rogue" or role == "Rogue_Hooded" then "nimble" else "civilian"
	local personality = if outfit and type(outfit.persona) == "number" then math.clamp(math.floor(outfit.persona), 1, 3) else rng:NextInteger(1, 3)
	model:SetAttribute("AppearancePhysique", physique)
	model:SetAttribute("MotionStyle", style)
	model:SetAttribute("MotionPersonality", personality)
	model.Parent = parent
	-- [비주얼 래더] 승인된 2단계 안에서 R15 체형만 바꿔 복제 인간 느낌을 줄인다.
	if ladderNpcTier >= 2 and humanoid.AutomaticScalingEnabled ~= false then
		local function vary(name, lo, hi)
			local value = humanoid:FindFirstChild(name)
			if value and value:IsA("NumberValue") then value.Value = lo + rng:NextNumber() * (hi - lo) end
		end
		if physique == "heavy" then
			vary("BodyWidthScale", 1.08, 1.17); vary("BodyDepthScale", 1.05, 1.13); vary("HeadScale", 0.96, 1.02)
		elseif physique == "slim" then
			vary("BodyWidthScale", 0.85, 0.94); vary("BodyDepthScale", 0.88, 0.98); vary("HeadScale", 0.98, 1.08)
		elseif physique == "athletic" then
			vary("BodyWidthScale", 1.01, 1.10); vary("BodyDepthScale", 0.98, 1.07); vary("HeadScale", 0.95, 1.04)
		elseif physique == "elder" then
			vary("BodyWidthScale", 0.91, 1.02); vary("BodyDepthScale", 0.93, 1.04); vary("HeadScale", 1.01, 1.1)
		else
			vary("BodyWidthScale", 0.94, 1.08); vary("BodyDepthScale", 0.94, 1.07); vary("HeadScale", 0.97, 1.07)
		end
	end
	local currentHeight = model:GetExtentsSize().Y
	if currentHeight < 0.01 then model:Destroy(); return nil end
	model:ScaleTo((height or 5.8) / currentHeight)
	local bounds, size = model:GetBoundingBox()
	local bottom = bounds.Position - Vector3.new(0, size.Y / 2, 0)
	-- [주민·동료 발바닥 접지] 머리/모자/루트 외곽 상자 대신 실제 R15 두 발의
	-- 지면 접촉 높이를 쓴다. 지면에 파묻히거나 공중에 뜨는 초기 오프셋을 같이 없앤다.
	-- 기존 키·신장·장비·부품 구성은 그대로 두고 최초 배치 Y만 교정한다.
	if not parent:IsA("WorldModel") or (outfit and outfit.companion) then
		local leftFoot = model:FindFirstChild("LeftFoot")
		local rightFoot = model:FindFirstChild("RightFoot")
		if leftFoot and rightFoot and leftFoot:IsA("BasePart") and rightFoot:IsA("BasePart") then
			bottom = Vector3.new(bottom.X,
				math.min(leftFoot.Position.Y - leftFoot.Size.Y * 0.5, rightFoot.Position.Y - rightFoot.Size.Y * 0.5), bottom.Z)
		end
	end
	model:PivotTo(CFrame.new(bottomPosition - bottom) * model:GetPivot())
	local placed = model:GetPivot()
	model:PivotTo(CFrame.new(placed.Position) * CFrame.Angles(0, facing or 0, 0))
	-- [R15 머리 전후 검사] 표준 Head/UpperTorso 실제 전방(-Z) 벡터로 뒤집힌 목 연결만 판별한다.
	-- Motor6D.C1/AnimationConstraint.Attachment는 변경하지 않고 기존 목 Transform에 한 번 보정한다.
	local faceHead, faceTorso = model:FindFirstChild("Head"), model:FindFirstChild("UpperTorso")
	model:SetAttribute("NpcFaceReversed", faceHead ~= nil and faceTorso ~= nil
		and faceHead.CFrame.LookVector:Dot(faceTorso.CFrame.LookVector) < -0.35)
	model:SetAttribute("RigType", "R15")
	rigMotors[model] = {
		leftArm = model:FindFirstChild("LeftShoulder", true),
		rightArm = model:FindFirstChild("RightShoulder", true),
		leftLeg = model:FindFirstChild("LeftHip", true),
		rightLeg = model:FindFirstChild("RightHip", true),
		leftKnee = model:FindFirstChild("LeftKnee", true),
		rightKnee = model:FindFirstChild("RightKnee", true),
		leftAnkle = model:FindFirstChild("LeftAnkle", true),
		rightAnkle = model:FindFirstChild("RightAnkle", true),
		leftElbow = model:FindFirstChild("LeftElbow", true),
		rightElbow = model:FindFirstChild("RightElbow", true),
		waist = model:FindFirstChild("Waist", true),
		neck = model:FindFirstChild("Neck", true),
		root = model:FindFirstChild("Root", true),
	}
	-- [주민·동료 3D 복식] 원본 R15 15관절과 스케일을 보존한 채 승인된 People 메시를 장착한다.
	-- 외형 전용 속성만 사용한다. 미로드 시 항구 자산 인입 이벤트에서 원래 장착 함수를 재호출한다.
	if outfit and (outfit.gender == "female" or outfit.gender == "male") then
		local look = if outfit.companion then "companion" else "citizen"
		if outfit.companion then
			if outfit.profession == "성직자" or outfit.profession == "수녀" or outfit.profession == "승려"
				or outfit.profession == "비구니" or outfit.profession == "순례자" then
				look = "companion_clergy"
			end
		else
			local jobLook = NPC_PROFESSION_LOOK[outfit.profession]
			if jobLook then look = "citizen_" .. jobLook end
		end
		model:SetAttribute("NpcAssetProfile", look .. "_" .. outfit.gender)
		Pose.applyRegisteredMobOutfit(model)
	end
	return model
end


-- [R15 몹 실물 외형] 기존 승인된 People 조각만 표준 R15 몸통·머리·어깨에 붙인다.
-- 통짜 스킨을 정적 몸체로 덮지 않는다. 모터 15관절·피격·공격·저장·속도는 그대로 유지한다.
-- 이름 / 대상 R15 부위 / 가로·세로·두께 / 높이 오프셋. 기존 AssetIds와 MareAssets를 재사용한다.
local MOB_OUTFIT_PARTS = {
	knight = {
		{ "male_ranger_body", "UpperTorso", 1.22, 1.56, 1.27, -0.10 },
		{ "female_ranger_acc_pauldrons", "UpperTorso", 1.52, 1.10, 1.48, 0.30 },
	},
	rogue = {
		{ "male_ranger_body", "UpperTorso", 1.16, 1.50, 1.22, -0.10 },
		{ "male_ranger_head_hood", "Head", 1.23, 1.31, 1.21, 0.16 },
	},
	ranger = {
		{ "female_ranger_body", "UpperTorso", 1.17, 1.52, 1.23, -0.10 },
		{ "female_ranger_head_hood", "Head", 1.24, 1.32, 1.22, 0.16 },
	},
	pirate = {
		{ "male_peasant_body", "UpperTorso", 1.21, 1.55, 1.26, -0.10 },
		{ "hair_beard", "Head", 1.14, 1.25, 1.15, 0.18 },
	},
	pirate_female = {
		{ "female_peasant_body", "UpperTorso", 1.19, 1.53, 1.26, -0.10 },
		{ "hair_buns", "Head", 1.17, 1.26, 1.17, 0.19 },
	},
	brute = {
		{ "male_peasant_body", "UpperTorso", 1.23, 1.57, 1.27, -0.10 },
		{ "male_ranger_acc_pauldron", "RightUpperArm", 1.35, 1.15, 1.36, 0.30 },
	},
	bombard = {
		{ "female_peasant_body", "UpperTorso", 1.19, 1.51, 1.22, -0.10 },
		{ "male_ranger_head_hood", "Head", 1.24, 1.30, 1.23, 0.16 },
	},
	-- [대항해시대 복식 4종] 기등록 GLB 실물 메시로 주민/동료의 남녀 복장을 분리한다.
	-- 각 부위는 본체 R15 관절에 용접되며 전투/이동 관절 자체는 대체하지 않는다.
	citizen_male = {
		{ "male_peasant_body", "UpperTorso", 1.18, 1.52, 1.25, -0.08 },
		{ "hair_simpleparted", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_vest", "UpperTorso", 1.18, 1.49, 1.22, -0.04 },
	},
	citizen_female = {
		{ "female_peasant_body", "UpperTorso", 1.16, 1.50, 1.22, -0.08 },
		{ "hair_buns", "Head", 1.16, 1.24, 1.18, 0.14 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_vest", "UpperTorso", 1.18, 1.49, 1.22, -0.04 },
	},
	-- [항구 주민 2차 복식] 중노동·궁정 경비·상점/행정 구분. 등록된 소형 People 메시만 쓴다.
	citizen_worker_male = {
		{ "male_peasant_body", "UpperTorso", 1.20, 1.52, 1.25, -0.08 },
		{ "hair_buzzed", "Head", 1.14, 1.22, 1.17, 0.12 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_apron", "LowerTorso", 1.20, 1.49, 1.21, -0.08 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
	},
	citizen_worker_female = {
		{ "female_peasant_body", "UpperTorso", 1.18, 1.50, 1.22, -0.08 },
		{ "hair_buzzedfemale", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_apron", "LowerTorso", 1.20, 1.49, 1.21, -0.08 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
	},
	citizen_guard_male = {
		{ "male_ranger_body", "UpperTorso", 1.22, 1.55, 1.25, -0.10 },
		{ "male_ranger_acc_pauldron", "RightUpperArm", 1.30, 1.12, 1.29, 0.25 },
		{ "hair_simpleparted", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_guard", "UpperTorso", 1.22, 1.51, 1.22, 0.00 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	citizen_guard_female = {
		{ "female_ranger_body", "UpperTorso", 1.18, 1.53, 1.23, -0.10 },
		{ "female_ranger_acc_pauldrons", "UpperTorso", 1.48, 1.08, 1.45, 0.29 },
		{ "hair_buns", "Head", 1.16, 1.24, 1.18, 0.14 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_guard", "UpperTorso", 1.22, 1.51, 1.22, 0.00 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	citizen_official_male = {
		{ "male_peasant_body", "UpperTorso", 1.19, 1.53, 1.25, -0.08 },
		{ "hair_simpleparted", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_coat", "UpperTorso", 1.21, 1.53, 1.23, -0.04 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	citizen_official_female = {
		{ "female_peasant_body", "UpperTorso", 1.17, 1.51, 1.22, -0.08 },
		{ "hair_long", "Head", 1.16, 1.26, 1.18, 0.12 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_coat", "UpperTorso", 1.21, 1.53, 1.23, -0.04 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	-- [3차 직능 복식] 선원은 활동복, 장인은 생활복으로 구분한다. 신규 자산/파트 생성 없음.
	citizen_sailor_male = {
		{ "male_ranger_body", "UpperTorso", 1.18, 1.54, 1.24, -0.08 },
		{ "hair_simpleparted", "Head", 1.14, 1.22, 1.17, 0.12 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_sash", "LowerTorso", 1.20, 1.16, 1.22, 0.02 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
	},
	citizen_sailor_female = {
		{ "female_ranger_body", "UpperTorso", 1.17, 1.52, 1.22, -0.08 },
		{ "hair_buns", "Head", 1.15, 1.23, 1.17, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_sash", "LowerTorso", 1.20, 1.16, 1.22, 0.02 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
	},
	citizen_artisan_male = {
		{ "male_peasant_body", "UpperTorso", 1.19, 1.52, 1.24, -0.08 },
		{ "hair_simpleparted", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_vest", "UpperTorso", 1.18, 1.49, 1.22, -0.04 },
		{ "outfit_apron", "LowerTorso", 1.20, 1.49, 1.21, -0.08 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	citizen_artisan_female = {
		{ "female_peasant_body", "UpperTorso", 1.17, 1.50, 1.22, -0.08 },
		{ "hair_buns", "Head", 1.16, 1.24, 1.18, 0.14 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_vest", "UpperTorso", 1.18, 1.49, 1.22, -0.04 },
		{ "outfit_apron", "LowerTorso", 1.20, 1.49, 1.21, -0.08 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	-- [성직 동료] 금속 갑옷 대신 승인된 생활복·후드를 써 직책을 시각적으로 구별한다.
	companion_clergy_male = {
		{ "male_peasant_body", "UpperTorso", 1.18, 1.53, 1.23, -0.08 },
		{ "male_ranger_head_hood", "Head", 1.22, 1.29, 1.21, 0.15 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_stole", "UpperTorso", 1.19, 1.45, 1.21, -0.05 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
	},
	companion_clergy_female = {
		{ "female_peasant_body", "UpperTorso", 1.16, 1.51, 1.22, -0.08 },
		{ "female_ranger_head_hood", "Head", 1.22, 1.29, 1.21, 0.15 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_stole", "UpperTorso", 1.19, 1.45, 1.21, -0.05 },
		{ "outfit_belt", "LowerTorso", 1.22, 0.90, 1.23, 0.02 },
	},
	companion_male = {
		{ "male_ranger_body", "UpperTorso", 1.23, 1.56, 1.26, -0.10 },
		{ "male_ranger_acc_pauldron", "RightUpperArm", 1.27, 1.13, 1.29, 0.25 },
		{ "hair_simpleparted", "Head", 1.15, 1.23, 1.18, 0.13 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_coat", "UpperTorso", 1.21, 1.53, 1.23, -0.04 },
		{ "outfit_sash", "LowerTorso", 1.20, 1.16, 1.22, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	companion_female = {
		{ "female_ranger_body", "UpperTorso", 1.18, 1.52, 1.23, -0.10 },
		{ "female_ranger_acc_pauldrons", "UpperTorso", 1.48, 1.08, 1.45, 0.29 },
		{ "hair_long", "Head", 1.16, 1.26, 1.18, 0.12 },
		-- [입체 재단복] 기본 R15 관절을 보존하는 직업별 착용 메시.
		{ "outfit_coat", "UpperTorso", 1.21, 1.53, 1.23, -0.04 },
		{ "outfit_sash", "LowerTorso", 1.20, 1.16, 1.22, 0.02 },
		{ "outfit_boot", "LeftLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_boot", "RightLowerLeg", 1.24, 1.36, 1.25, -0.04 },
		{ "outfit_cuff", "LeftLowerArm", 1.21, 0.85, 1.25, -0.01 },
		{ "outfit_cuff", "RightLowerArm", 1.21, 0.85, 1.25, -0.01 },
	},
	warlord = {
		{ "male_ranger_body", "UpperTorso", 1.27, 1.61, 1.32, -0.12 },
		{ "female_ranger_acc_pauldrons", "UpperTorso", 1.64, 1.16, 1.57, 0.33 },
	},
}

-- [주민·동료 추가 실물 헤어 6종] 기등록 모델을 먼저 유지하고 등록된 원본 번호가 있을 때만 전환한다.
-- 주민 역할/성별/머리색 결정은 기존 R15에서 가져오고 저장·전투·직업 수치는 변경하지 않는다.
local NPC_REGISTERED_HAIR = {
	-- [직업·개성별 머리] 기존 People 실물 헤어만 사용하며 인물의 MotionPersonality 값으로
	-- 재호출·자산 지연 로드 후에도 같은 머리 메시를 유지한다.
	citizen_male = { short = { "hair_simpleparted", "hair_court_curls", "hair_buzzed" } },
	citizen_female = { long = { "hair_shoulder_waves", "hair_side_braid" }, bun = { "hair_low_bun", "hair_braided_crown" } },
	citizen_worker_male = { short = { "hair_buzzed", "hair_simpleparted" } },
	citizen_worker_female = { long = { "hair_side_braid", "hair_shoulder_waves" }, bun = { "hair_low_bun", "hair_buzzedfemale" } },
	citizen_guard_male = { short = { "hair_simpleparted", "hair_court_curls" } },
	citizen_guard_female = { long = { "hair_shoulder_waves", "hair_braided_crown" }, bun = { "hair_braided_crown", "hair_low_bun" } },
	citizen_official_male = { short = { "hair_court_curls", "hair_simpleparted" } },
	citizen_official_female = { long = { "hair_shoulder_waves", "hair_court_curls" }, bun = { "hair_braided_crown", "hair_low_bun" } },
	citizen_sailor_male = { short = { "hair_simpleparted", "hair_buzzed" } },
	citizen_sailor_female = { long = { "hair_sailor_ponytail", "hair_side_braid" }, bun = { "hair_low_bun", "hair_sailor_ponytail" } },
	citizen_artisan_male = { short = { "hair_buzzed", "hair_simpleparted" } },
	citizen_artisan_female = { long = { "hair_side_braid", "hair_shoulder_waves" }, bun = { "hair_low_bun", "hair_braided_crown" } },
	companion_male = { short = { "hair_simpleparted", "hair_court_curls" } },
	companion_female = { long = { "hair_side_braid", "hair_shoulder_waves" }, bun = { "hair_braided_crown", "hair_low_bun" } },
}
-- [승인된 헤드·몸통 액세서리 5종] 추가 요소만 분리한다. 위치는 R15 부위의 상대 좌표.
-- 배열 7/8열: 기존 Y 오프셋 뒤의 X/Z 배율(미지정이면 0). 금속 배지는 겉옷 바깥쪽에 보이게 장착한다.
local NPC_REGISTERED_ACCESSORY = {
	citizen_female = { "acc_ribbon_bow", "Head", 0.85, 0.90, 0.90, 0.33, 0.12, -0.08 },
	citizen_official_male = { "acc_guild_badge", "UpperTorso", 0.45, 0.50, 0.60, 0.12, -0.28, -0.56 },
	citizen_official_female = { "acc_pearl_hairpin", "Head", 0.55, 0.58, 0.60, 0.28, 0.33, -0.06 },
	citizen_sailor_male = { "acc_sailor_headband", "Head", 1.12, 1.12, 1.13, 0.14 },
	citizen_sailor_female = { "acc_sailor_headband", "Head", 1.12, 1.12, 1.13, 0.14 },
	citizen_guard_male = { "acc_feather_hat", "Head", 1.22, 1.26, 1.22, 0.37 },
	citizen_artisan_male = { "acc_guild_badge", "UpperTorso", 0.45, 0.50, 0.60, 0.12, -0.28, -0.56 },
	companion_male = { "acc_feather_hat", "Head", 1.22, 1.26, 1.22, 0.37 },
	companion_female = { "acc_pearl_hairpin", "Head", 0.55, 0.58, 0.60, 0.28, 0.33, -0.06 },
}

-- 이미 생성된 R15 몹에 승인 실물 외형을 적용한다. People 자산이 늦게 로드되면 같은 함수를 재호출한다.
function Pose.applyRegisteredMobOutfit(model)
	if not model or not model.Parent or model:GetAttribute("RigType") ~= "R15" then return false end
	local npcProfile = model:GetAttribute("NpcAssetProfile")
	local profile = model:GetAttribute("MobAssetProfile") or npcProfile
	local npcOutfit = npcProfile ~= nil and model:GetAttribute("MobAssetProfile") == nil
	-- [근세 유럽 복식] 연도/문화권을 검사하고 모바일에는 서로 다른 세부 메시 2종만 표시한다.
	local year = model:GetAttribute("AppearanceYear")
	local culture = model:GetAttribute("AppearanceCulture")
	local detailAllowed = npcOutfit and type(year) == "number" and year >= 1500 and year < 1800
		and EUROPEAN_DETAIL_CULTURES[culture] == true
	local detailLimit = if UserInputService.TouchEnabled then 2 else 4
	local detailOrder = {}
	local detailKinds = 0
	local specs = MOB_OUTFIT_PARTS[profile]
	if not specs then return false end
	-- [모바일 복식 실루엣] 한 NPC당 상세 모델 2종을 유지하되 복부 벨트보다 장화·소매를
	-- 먼저 보여준다. 좌우 부위는 같은 실물 메시 종류로 계산해 추가 메모리를 쓰지 않는다.
	local mobileEssentials = nil
	if UserInputService.TouchEnabled then
		if string.find(profile, "^citizen_guard_") then
			mobileEssentials = { outfit_guard = true, outfit_boot = true }
		elseif string.find(profile, "^citizen_official_") then
			mobileEssentials = { outfit_coat = true, outfit_cuff = true }
		elseif string.find(profile, "^citizen_sailor_") then
			mobileEssentials = { outfit_sash = true, outfit_boot = true }
		elseif string.find(profile, "^citizen_artisan_") then
			mobileEssentials = { outfit_vest = true, outfit_apron = true }
		elseif string.find(profile, "^companion_clergy_") then
			mobileEssentials = { outfit_stole = true, outfit_belt = true }
		elseif string.find(profile, "^companion_") then
			mobileEssentials = { outfit_coat = true, outfit_boot = true }
		end
	end
	-- [등록·사용 권한 관문] 기존 AssetIds에 등록된 추가 액세서리만 장착 시도한다.
	-- 등록 전에는 기등록 복식만 사용한다. 기존 프로필 표는 수정하지 않는다.
	local accessory = npcOutfit and NPC_REGISTERED_ACCESSORY[profile]
	if accessory and AssetIds["People/" .. accessory[1]] then
		specs = table.clone(specs)
		table.insert(specs, accessory)
	end
	local shelf = ReplicatedStorage:FindFirstChild("MareAssets")
	local people = shelf and shelf:FindFirstChild("People")

	-- [기본 복식 재질] 실제 GLB가 지연될 때도 병종별 실루엣·소재가 다르게 보인다.
	-- 얼굴·피부·R15 관절은 원본 그대로, 몸통·장갑·장화의 표시용 재질만 한 번 교정한다.
	if not npcOutfit and model:GetAttribute("MobMaterialProfileApplied") ~= profile then
		local armored = profile == "knight" or profile == "warlord"
		local leather = profile == "brute" or profile == "rogue" or profile == "ranger"
		local cloth = if armored then Color3.fromRGB(59, 68, 79)
			elseif profile == "bombard" then Color3.fromRGB(100, 75, 59)
			elseif profile == "pirate_female" then Color3.fromRGB(103, 83, 69)
			elseif leather then Color3.fromRGB(81, 89, 77)
			else Color3.fromRGB(114, 89, 70)
		local steel = if profile == "warlord" then Color3.fromRGB(80, 93, 105) else Color3.fromRGB(115, 123, 131)
		for _, part in model:GetChildren() do
			if not part:IsA("BasePart") or part.Name == "HumanoidRootPart" or part.Name == "Head" then continue end
			local n = part.Name
			if n:find("Hand", 1, true) or n:find("Foot", 1, true) then
				part.Material = Enum.Material.Leather
				part.Color = part.Color:Lerp(Color3.fromRGB(53, 42, 36), 0.52)
				part.Reflectance = 0
			elseif armored and (n:find("Arm", 1, true) or n:find("Leg", 1, true) or n == "UpperTorso") then
				part.Material = Enum.Material.Metal
				part.Color = part.Color:Lerp(steel, 0.64)
				part.Reflectance = 0.025
			elseif n:find("Torso", 1, true) or n:find("Arm", 1, true) then
				part.Material = if leather then Enum.Material.Leather else Enum.Material.Fabric
				part.Color = part.Color:Lerp(cloth, 0.56)
				part.Reflectance = 0
			elseif n:find("Leg", 1, true) then
				part.Material = Enum.Material.Fabric
				part.Color = part.Color:Lerp(cloth:Lerp(Color3.new(0, 0, 0), 0.24), 0.45)
				part.Reflectance = 0
			end
		end
		model:SetAttribute("MobMaterialProfileApplied", profile)
	end

	-- [승인 메시 부착] 천/가죽/강철/머리카락을 부위별로 구분하며 실제 원본 텍스처와 PBR 맵은 보존한다.
	local attached = 0
	for _, spec in specs do
		local assetName, boneName = spec[1], spec[2]
		-- [직접 제작 GLB] 좌우 소매·장화를 하나씩 개별 장착하고 모바일 부하를 제한한다.
		if string.sub(assetName, 1, 7) == "outfit_" then
			-- 모바일에서는 지정된 직능별 실루엣만 세어 실제 장착 메시를 2종 이내로 제한한다.
			if not detailAllowed or (mobileEssentials and not mobileEssentials[assetName]) then
				attached += 1
				continue
			end
			if not detailOrder[assetName] then
				detailKinds += 1
				detailOrder[assetName] = detailKinds
			end
			if detailOrder[assetName] > detailLimit then
				attached += 1
				continue
			end
		end
		-- [신규 메시 자동 선택] 실제로 등록된 머리만 기존 스타일·성별·직업에 맞춰 교체한다.
		-- 신규 등록이 없으면 기등록 긴머리/올림머리/짧은머리를 정확히 보존한다.
		if npcOutfit and string.sub(assetName, 1, 5) == "hair_" then
			local hairstyle = model:GetAttribute("NpcHairStyle")
			local femaleLong = profile == "citizen_female" or profile == "citizen_official_female"
				or profile == "citizen_sailor_female" or profile == "citizen_artisan_female"
				or profile == "companion_female"
			local preferred = NPC_REGISTERED_HAIR[profile]
			local options = preferred and preferred[hairstyle or "short"]
			local persona = math.clamp(tonumber(model:GetAttribute("MotionPersonality")) or 1, 1, 3)
			local candidate = if type(options) == "table" and #options > 0
				then options[(math.floor(persona) - 1) % #options + 1] else options
			if candidate and AssetIds["People/" .. candidate] then
				assetName = candidate
			elseif femaleLong and hairstyle == "long" then
				assetName = "hair_long"
			elseif femaleLong and hairstyle == "bun" then
				assetName = "hair_buns"
			end
		end
		local slotName = "R15Asset_" .. assetName .. "_" .. boneName
		if model:FindFirstChild(slotName) then
			attached += 1
			continue
		end
		local registeredId = AssetIds["People/" .. assetName]
		local source = registeredId and people and people:FindFirstChild(assetName)
		local target = model:FindFirstChild(boneName)
		if not (source and source:IsA("Model") and target and target:IsA("BasePart")) then continue end
		local skin = source:Clone()
		skin.Name = slotName
		local parts = {}
		for _, item in skin:GetDescendants() do
			if item:IsA("Script") or item:IsA("LocalScript") or item:IsA("ModuleScript")
				or item:IsA("Humanoid") or item:IsA("Animator") or item:IsA("Motor6D")
				or item:IsA("WeldConstraint") then
				item:Destroy()
			elseif item:IsA("BasePart") then
				table.insert(parts, item)
			end
		end
		-- [모바일·리그 안전] 통짜 다관절 인물이나 과도한 메시 파츠는 덧씌우지 않는다.
		if #parts < 1 or #parts > 12 then skin:Destroy(); continue end
		local ok = pcall(function()
			local bounds, ext = skin:GetBoundingBox()
			if ext.X < 0.01 or ext.Y < 0.01 or ext.Z < 0.01 then error("empty mesh") end
			local ratio = math.min(
				target.Size.X * spec[3] / ext.X,
				target.Size.Y * spec[4] / ext.Y,
				target.Size.Z * spec[5] / ext.Z
			)
			if ratio <= 0 or ratio ~= ratio or ratio > 100 then error("invalid scale") end
			skin:ScaleTo(ratio)
			bounds = skin:GetBoundingBox()
			-- 신규 머리핀/길드 배지는 기존 Y축 부착을 보존하면서 R15 상대 X/Z 위치도 반영한다.
			skin:PivotTo((target.CFrame * CFrame.new(target.Size.X * (spec[7] or 0),
				target.Size.Y * spec[6], target.Size.Z * (spec[8] or 0))) * bounds:ToObjectSpace(skin:GetPivot()))
			for _, part in parts do
				part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery = false, false, false, false
				part.Massless = true
				local textured = part:FindFirstChildOfClass("SurfaceAppearance") ~= nil
					or (part:IsA("MeshPart") and part.TextureID ~= "")
				-- [PBR 보존] 직접 제작한 옷의 황동·가죽·천 원본 색과 재질은 덮지 않는다.
				if not textured and string.sub(assetName, 1, 7) ~= "outfit_" then
					local meshName = (assetName .. "_" .. part.Name):lower()
					local armor = meshName:find("pauldron", 1, true) or meshName:find("plate", 1, true)
					local hair = meshName:find("hair_", 1, true)
					local hide = meshName:find("hood", 1, true)
					local tunic = meshName:find("peasant", 1, true)
					local badge = meshName:find("acc_guild_badge", 1, true)
					local hairpin = meshName:find("acc_pearl_hairpin", 1, true)
					local ribbon = meshName:find("acc_ribbon_bow", 1, true)
					local headwear = meshName:find("acc_feather_hat", 1, true) or meshName:find("acc_sailor_headband", 1, true)
					-- [실물 장신구] 텍스처가 없는 모델만 소재 보정한다. 배지는 금속, 머리핀은 진주,
					-- 리본·선원 머리띠는 천으로 표시하고 PBR 원본은 절대 덮지 않는다.
					part.Material = if armor or badge or hairpin then Enum.Material.Metal
						elseif hair or hide or tunic or ribbon or headwear then Enum.Material.Fabric else Enum.Material.Leather
					local tint = if armor then Color3.fromRGB(108, 117, 124)
						elseif badge then Color3.fromRGB(188, 151, 80)
						elseif hairpin then Color3.fromRGB(230, 216, 190)
						elseif ribbon then Color3.fromRGB(137, 66, 79)
						elseif headwear then Color3.fromRGB(91, 78, 64)
						elseif hair then (if npcOutfit then model:GetAttribute("NpcHairTint") else nil) or Color3.fromRGB(69, 52, 41)
						elseif hide then Color3.fromRGB(71, 78, 71)
						elseif npcOutfit and (tunic or meshName:find("ranger_body", 1, true)) then target.Color
						elseif tunic then Color3.fromRGB(126, 108, 86)
						else Color3.fromRGB(96, 79, 65)
					local neutral = math.max(part.Color.R, part.Color.G, part.Color.B)
						- math.min(part.Color.R, part.Color.G, part.Color.B) < 0.11
					part.Color = part.Color:Lerp(tint,
						if hair and npcOutfit and model:GetAttribute("NpcHairTint") then 0.72
						elseif (badge or hairpin or ribbon) and neutral then 0.54
						elseif neutral and part.Color.R > 0.72 then 0.78 else 0.14)
					part.Reflectance = if armor or badge or hairpin then 0.025 else 0
				end
				local weld = Instance.new("WeldConstraint")
				weld.Part0, weld.Part1, weld.Parent = target, part, part
			end
			skin.Parent = model
		end)
		if ok then
			attached += 1
			if npcOutfit and (string.sub(assetName, 1, 5) == "hair_"
				or assetName == "acc_feather_hat" or assetName == "acc_sailor_headband") then
				-- [실제 메시 우선] 기등록 머리·모자가 장착된 뒤에만 과거 도형 예비품을 숨긴다.
				-- 원본 에셋이 미로드 상태라면 예비 외형을 유지해 NPC가 순간적으로 사라지지 않는다.
				local fallbackName = if string.sub(assetName, 1, 5) == "hair_" then "Hair" else "Hat"
				for _, piece in model:GetChildren() do
					if piece:IsA("BasePart") and piece.Name == fallbackName then piece.Transparency = 1 end
				end
			end
		else skin:Destroy() end
	end
	model:SetAttribute(if npcOutfit then "NpcAppearanceState" else "MobAppearanceState",
		if attached == #specs then "ready" elseif attached > 0 then "partial" else "asset_pending")
	return attached == #specs
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
-- [주민 R15 통합 모션] 기존 제자리 일·보행·관절 보간을 한 책임 함수에서 처리한다. 중복 함수/래퍼 없음.
local workSmooth = setmetatable({}, { __mode = "k" }) -- NPC 모델이 사라지면 보간 상태도 정리한다.
function Pose.work(model, kind, t, moving)
	local m = rigMotors[model]
	if not m then return end
	local function set(motor, cf)
		if not motor then return end
		if motor == m.leftArm or motor == m.rightArm then
			-- [주민 팔 정상화] R15 어깨의 음수 X는 등 뒤 방향이다. 기존 작업 동작의
			-- 큰 음수 전방 제스처만 앞쪽(+X)으로 바꿔 망치질·손짓·집기에서 팔 역관절을 막는다.
			local pitch, yaw, roll = cf:ToEulerAnglesXYZ()
			if pitch < -0.30 then cf = CFrame.Angles(-pitch, yaw, roll) end
		elseif motor == m.neck and model:GetAttribute("NpcFaceReversed") then
			cf = CFrame.Angles(0, math.pi, 0) * cf
		end
		motor.Transform = cf
	end
	local A = CFrame.Angles
	-- [주민 동작 전환] 정지 자세만 초기화한다. 이동 중에는 보행의 반대 팔·접지 관절을 유지한다.
	if not moving then
		set(m.leftLeg, CFrame.identity); set(m.rightLeg, CFrame.identity)
		set(m.leftKnee, CFrame.identity); set(m.rightKnee, CFrame.identity)
		set(m.leftAnkle, CFrame.identity); set(m.rightAnkle, CFrame.identity)
		set(m.root, CFrame.identity)
		set(m.leftArm, A(-0.12, 0, 0.08)); set(m.rightArm, A(-0.12, 0, -0.08))
		set(m.leftElbow, A(-0.15, 0, 0)); set(m.rightElbow, A(-0.15, 0, 0))
		set(m.waist, CFrame.identity); set(m.neck, CFrame.identity)
	end
	if kind == "carry" then
		-- 짐을 든 채 앞으로 걷는 주민: 양팔을 가슴 앞쪽으로 뻗는다.
		-- 뒤로 -1.25rad 젖혀 두던 어깨를 전방으로 교정하고 보행 다리는 유지한다.
		set(m.leftArm, A(0.95, 0, 0.12)); set(m.rightArm, A(0.95, 0, -0.12))
		set(m.leftElbow, A(-0.38, 0, 0)); set(m.rightElbow, A(-0.38, 0, 0))
	elseif kind == "look" then
		-- 손을 흔들다 둘러보기로 돌아왔을 때 팔이 허공에 남지 않도록 중립으로 복귀.
		if not moving then
			set(m.leftArm, A(-0.12, 0, 0.08)); set(m.rightArm, A(-0.12, 0, -0.08))
			set(m.leftElbow, A(-0.15, 0, 0)); set(m.rightElbow, A(-0.15, 0, 0))
		end
		-- [주민 시선] 주기적으로 둘러보다가 시선을 안정적으로 고정한다.
		local glance = (t * 0.65 + (model:GetAttribute("MotionPersonality") or 1) * 2.1) % 12
		local angle = if glance < 3 then math.sin(glance / 3 * math.pi) * 0.34
			elseif glance < 6.5 then -math.sin((glance - 3) / 3.5 * math.pi) * 0.27 else 0
		set(m.neck, A(-0.025, angle, 0))
	elseif kind == "stoop" then
		set(m.waist, A(0.28, 0, 0))
		set(m.neck, A(-0.25, 0, 0))
	end
	-- [주민 R15] 이동 작업은 실제 걷기 포즈 위에 필요한 관절만 겹쳐 반대 팔 교차를 보존한다.
	if kind ~= "carry" and kind ~= "look" and kind ~= "stoop" then
	local elder = model:GetAttribute("Age") == "elder"
	if kind == "hammer" then
		local beat = (t * 0.94) % 1
		local s = if beat < 0.55 then math.sin(beat / 0.55 * math.pi * 0.5)
			elseif beat < 0.72 then math.max(0, 1 - (beat - 0.55) / 0.17) else 0
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
		-- [대화] 손짓 사이의 자연스러운 멈춤.
		local gesture = (t * 0.82 + (model:GetAttribute("MotionPersonality") or 1) * 0.4) % 7
		local g = if gesture < 2.8 then math.sin(gesture / 2.8 * math.pi) else 0
		set(m.rightArm, A(-0.68 - g * 0.5, 0, -0.24)); set(m.rightElbow, A(-0.9, 0, 0))
		set(m.leftArm, A(-0.4 - g * 0.2, 0, 0.3)); set(m.neck, A(math.sin(t * 1.7) * 0.12, math.sin(t * 0.8) * 0.25, 0))
	elseif kind == "sweep" then
		local s = math.sin(t * 3)
		set(m.waist, A(0.22, 0, 0))
		set(m.leftArm, A(-0.9, 0, 0.1 + s * 0.15)); set(m.rightArm, A(-1.0, 0, -0.1 + s * 0.2))
	elseif kind == "stall" then
		local g = math.max(0, math.sin(t * 1.4))
		set(m.rightArm, A(-0.5 - g * 1.2, 0, -0.5)); set(m.rightElbow, A(-0.5, 0, 0))
		set(m.leftArm, A(-0.3, 0, 0.25)); set(m.neck, A(0, math.sin(t * 0.7) * 0.4, 0))
	elseif kind == "write" then
		-- 장부 쓰기: 고개를 숙이고 오른손이 작게 움직인다
		set(m.waist, A(0.2, 0, 0)); set(m.neck, A(0.3, 0, 0))
		set(m.leftArm, A(-0.9, 0, 0.25)); set(m.leftElbow, A(-1.0, 0, 0))
		set(m.rightArm, A(-1.0, 0, -0.1)); set(m.rightElbow, A(-1.1 + math.sin(t * 6) * 0.08, 0, 0))
	elseif kind == "lift" then
		-- 짐 들었다 놓기: 허리 숙여 들어올림
		local s = (math.sin(t * 1.3) + 1) / 2
		set(m.waist, A(0.6 - s * 0.55, 0, 0))
		set(m.leftArm, A(-0.4 - s * 1.0, 0, 0.1)); set(m.rightArm, A(-0.4 - s * 1.0, 0, -0.1))
		set(m.leftElbow, A(-0.3 - s * 0.8, 0, 0)); set(m.rightElbow, A(-0.3 - s * 0.8, 0, 0))
		set(m.leftKnee, A(-0.5 + s * 0.4, 0, 0)); set(m.rightKnee, A(-0.5 + s * 0.4, 0, 0))
		set(m.leftLeg, A(0.35 - s * 0.3, 0, 0)); set(m.rightLeg, A(0.35 - s * 0.3, 0, 0))
	elseif kind == "wave" then
		-- 멀리 인사
		local g = math.sin(t * 5)
		set(m.rightArm, A(-2.5, 0, -0.35 + g * 0.3)); set(m.rightElbow, A(-0.5 + g * 0.2, 0, 0))
		set(m.neck, A(0, 0.15, 0))
	elseif kind == "point" then
		-- 손가락으로 가리키며 설명
		local g = math.max(0, math.sin(t * 0.8))
		set(m.rightArm, A(-1.5 * (0.3 + g * 0.7), 0, -0.5 * g)); set(m.rightElbow, A(-0.1, 0, 0))
		set(m.neck, A(0, math.sin(t * 0.4) * 0.4, 0)); set(m.leftArm, A(-0.2, 0, 0.3))
	elseif kind == "lean" then
		-- 벽에 기대 쉼: 팔짱
		set(m.waist, A(-0.1, 0.1, 0)); set(m.root, CFrame.new(0, 0, 0.15) * A(-0.08, 0, 0))
		set(m.leftArm, A(-0.8, 0, -0.5)); set(m.rightArm, A(-0.8, 0, 0.5))
		set(m.leftElbow, A(-1.5, 0, 0)); set(m.rightElbow, A(-1.5, 0, 0))
		set(m.neck, A(0, math.sin(t * 0.5) * 0.35, 0)); set(m.leftLeg, A(0.1, 0, 0.05)); set(m.rightLeg, A(-0.15, 0, -0.05))
	elseif kind == "pray" then
		set(m.waist, A(0.18, 0, 0)); set(m.neck, A(0.35, 0, 0))
		set(m.leftArm, A(-1.0, 0, -0.15)); set(m.rightArm, A(-1.0, 0, 0.15))
		set(m.leftElbow, A(-1.5, 0, 0)); set(m.rightElbow, A(-1.5, 0, 0))
	elseif kind == "harvest" then
		-- [수확] 허리를 굽혀 이삭을 잡고 바구니 쪽으로 천천히 옮긴다.
		local s = (math.sin(t * 1.75) + 1) * 0.5
		set(m.waist, A(0.46 + s * 0.22, math.sin(t * 0.7) * 0.12, 0))
		set(m.leftArm, A(-0.75 - s * 0.36, 0, 0.18))
		set(m.rightArm, A(-1.05 + s * 0.3, 0, -0.22))
		set(m.leftElbow, A(-0.68, 0, 0)); set(m.rightElbow, A(-0.85, 0, 0))
		set(m.leftKnee, A(-0.22 - s * 0.12, 0, 0))
	elseif kind == "weigh" then
		-- [상인 계량] 양손에 저울과 물품을 들고 균형을 맞춘다.
		local s = math.sin(t * 1.55)
		set(m.leftArm, A(-1.15 + s * 0.12, 0, 0.27))
		set(m.rightArm, A(-0.98 - s * 0.13, 0, -0.27))
		set(m.leftElbow, A(-0.86, 0, 0)); set(m.rightElbow, A(-0.92, 0, 0))
		set(m.neck, A(0.12, s * 0.14, 0))
	elseif kind == "milk" then
		-- [낙농] 무릎을 굽혀 한 손으로 통을 받치고 다른 손으로 착유한다.
		local beat = math.sin(t * 3.1)
		set(m.root, CFrame.new(0, -0.42, 0))
		set(m.waist, A(0.38, 0.1, 0))
		set(m.leftLeg, A(0.3, 0, 0)); set(m.rightKnee, A(-0.75, 0, 0))
		set(m.leftArm, A(-0.9, 0, 0.32))
		set(m.rightArm, A(-0.98 + beat * 0.13, 0, -0.2))
		set(m.rightElbow, A(-1.05 - beat * 0.18, 0, 0))
	elseif kind == "kneel" then
		-- [종교·의례] 기도 중 한쪽 무릎을 굽히고 양손을 모은다.
		set(m.root, CFrame.new(0, -0.34, 0))
		set(m.leftKnee, A(-0.84, 0, 0)); set(m.rightLeg, A(0.4, 0, 0))
		set(m.waist, A(0.25, 0, 0)); set(m.neck, A(0.32, 0, 0))
		set(m.leftArm, A(-1.0, 0, -0.18)); set(m.rightArm, A(-1.0, 0, 0.18))
		set(m.leftElbow, A(-1.35, 0, 0)); set(m.rightElbow, A(-1.35, 0, 0))
	elseif kind == "fold" then
		-- [재단] 두 손으로 천을 펼쳤다가 접는다.
		local s = math.sin(t * 2.3)
		set(m.waist, A(0.18 + s * 0.06, 0, 0))
		set(m.leftArm, A(-0.86, 0, 0.28 - s * 0.17))
		set(m.rightArm, A(-0.86, 0, -0.28 + s * 0.17))
		set(m.leftElbow, A(-0.88, 0, 0)); set(m.rightElbow, A(-0.88, 0, 0))
	elseif kind == "knead" then
		-- 제빵사: 양손으로 반죽을 밀고 접으며 허리 무게중심을 움직인다.
		local beat = math.sin(t * 2.7)
		set(m.waist, A(0.27 + beat * 0.12, 0, 0))
		set(m.leftArm, A(-1.0 - beat * 0.28, 0, 0.18))
		set(m.rightArm, A(-1.05 + beat * 0.28, 0, -0.18))
		set(m.leftElbow, A(-0.9, 0, 0)); set(m.rightElbow, A(-0.9, 0, 0))
		set(m.neck, A(0.2, 0, 0))
	elseif kind == "sew" then
		-- 재단사: 천을 잡고 바늘을 내미는 손과 고개가 함께 움직인다.
		local beat = math.sin(t * 3.4)
		set(m.leftArm, A(-0.95, 0, 0.25))
		set(m.rightArm, A(-1.1 - beat * 0.2, 0, -0.23))
		set(m.rightElbow, A(-1.15 + beat * 0.18, 0, 0))
		set(m.neck, A(0.25, beat * 0.06, 0))
	elseif kind == "forge" then
		-- 대장장이: 일정한 간격으로 망치를 내리치고 작업물을 확인한다.
		local beat = (t * 1.5) % 1
		local strike = if beat < 0.4 then beat / 0.4 elseif beat < 0.7 then (0.7 - beat) / 0.3 else 0
		set(m.rightArm, A(-2.3 + strike * 1.65, 0, -0.2))
		set(m.rightElbow, A(-0.65 - strike * 0.35, 0, 0))
		set(m.leftArm, A(-0.8, 0, 0.22))
		set(m.waist, A(0.18 + strike * 0.22, 0, 0))
	elseif kind == "read" then
		-- 학자·서기: 책을 잡고 페이지를 넘기는 동작.
		local page = math.max(0, math.sin(t * 1.15))
		set(m.leftArm, A(-1.15, 0, 0.16))
		set(m.leftElbow, A(-1.25, 0, 0))
		set(m.rightArm, A(-1.0 - page * 0.24, 0, -0.18))
		set(m.rightElbow, A(-1.15 + page * 0.28, 0, 0))
		set(m.neck, A(0.21, math.sin(t * 0.45) * 0.09, 0))
	elseif kind == "dance" then
		-- 축제의 손짓과 체중 이동: 공격/보행 모션과 충돌하지 않는다.
		local beat = math.sin(t * 2.5)
		set(m.leftArm, A(-1.4 + beat * 0.35, 0, 0.45))
		set(m.rightArm, A(-1.4 - beat * 0.35, 0, -0.45))
		set(m.waist, A(0, beat * 0.18, beat * 0.09))
		set(m.leftLeg, A(0.12 * beat, 0, 0)); set(m.rightLeg, A(-0.12 * beat, 0, 0))
	elseif kind == "polish" then
		-- 궁정 시종·관리인: 천으로 난간을 천천히 닦는다.
		local beat = math.sin(t * 2.1)
		set(m.rightArm, A(-1.0, beat * 0.27, -0.22))
		set(m.leftArm, A(-0.45, 0, 0.18))
		set(m.waist, A(0.27, beat * 0.13, 0))
	elseif kind == "inspect" then
		-- 상인·학자: 물건을 들여다보고 손끝으로 살핀다.
		local s = math.sin(t * 1.8)
		set(m.waist, A(0.16 + s * 0.045, 0, 0)); set(m.neck, A(0.22, s * 0.14, 0))
		set(m.leftArm, A(-0.85, 0, 0.24)); set(m.rightArm, A(-1.1 + s * 0.18, 0, -0.22))
		set(m.leftElbow, A(-0.8, 0, 0)); set(m.rightElbow, A(-0.95, 0, 0))
	elseif kind == "count" then
		-- 장부·재고 확인: 한 손으로 세고 다른 손으로 받친다.
		local s = math.sin(t * 3.1)
		set(m.leftArm, A(-0.9, 0, 0.18)); set(m.rightArm, A(-0.8 + s * 0.24, 0, -0.16))
		set(m.leftElbow, A(-1.05, 0, 0)); set(m.rightElbow, A(-0.85, 0, 0))
		set(m.neck, A(0.14, math.sin(t * 0.55) * 0.15, 0))
	elseif kind == "salute" then
		-- 경비병·항해사: 짧게 경례하고 주변을 확인한다.
		local s = math.max(0, math.sin(t * 1.3))
		set(m.rightArm, A(-1.5 - s * 0.75, 0, -0.4))
		set(m.rightElbow, A(-0.95 - s * 0.35, 0, 0))
		set(m.neck, A(0, math.sin(t * 0.4) * 0.18, 0))
	elseif kind == "stretch" then
		-- 일하다 쉬는 주민: 어깨와 등을 느리게 펴고 내린다.
		local s = (math.sin(t * 1.1) + 1) * 0.5
		set(m.leftArm, A(-0.35 - s * 1.65, 0, 0.25))
		set(m.rightArm, A(-0.35 - s * 1.65, 0, -0.25))
		set(m.waist, A(-s * 0.14, 0, 0))
	elseif kind == "offer" then
		-- 상인이 물건을 내미는 몸짓. 실제 소유권·교역 판정과 무관한 연출이다.
		local s = (math.sin(t * 2.0) + 1) * 0.5
		set(m.rightArm, A(-0.75 - s * 0.72, 0, -0.25))
		set(m.rightElbow, A(-0.65 + s * 0.32, 0, 0))
		set(m.leftArm, A(-0.48, 0, 0.18))
		set(m.neck, A(0.12, math.sin(t * 0.5) * 0.1, 0))
	elseif kind == "receive" then
		-- 상대가 내민 물건을 두 손으로 받아 확인하는 몸짓.
		local s = (math.sin(t * 2.0) + 1) * 0.5
		set(m.leftArm, A(-0.6 - s * 0.52, 0, 0.2))
		set(m.rightArm, A(-0.65 - s * 0.5, 0, -0.2))
		set(m.leftElbow, A(-0.78, 0, 0)); set(m.rightElbow, A(-0.78, 0, 0))
		set(m.neck, A(0.16, 0, 0))
	elseif kind == "nod" then
		-- 상대가 말하는 동안 고개를 끄덕이며 듣는다.
		set(m.neck, A(0.07 + math.sin(t * 3.1) * 0.12, math.sin(t * 0.6) * 0.1, 0))
		set(m.leftArm, A(-0.22, 0, 0.12)); set(m.rightArm, A(-0.22, 0, -0.12))
	elseif kind == "drink" then
		-- 선술집 손님: 천천히 잔을 입에 가져가는 몸짓.
		local s = (math.sin(t * 1.5) + 1) * 0.5
		set(m.rightArm, A(-0.65 - s * 1.15, 0, -0.16))
		set(m.rightElbow, A(-0.8 - s * 0.65, 0, 0))
		set(m.leftArm, A(-0.35, 0, 0.16)); set(m.neck, A(-s * 0.10, 0, 0))
	elseif kind == "listen" then
		-- 대화 듣기: 고개를 기울이고 자세를 낮춘다.
		local s = math.sin(t * 0.75)
		set(m.neck, A(0.05, s * 0.30, s * 0.07))
		set(m.waist, A(0, s * 0.08, 0))
		set(m.leftArm, A(-0.25, 0, 0.2)); set(m.rightArm, A(-0.25, 0, -0.2))
	elseif kind == "bell" then
		local s = math.max(0, math.sin(t * 1.2))
		set(m.rightArm, A(-2.2 + s * 0.6, 0, -0.1)); set(m.leftArm, A(-2.2 + s * 0.6, 0, 0.1))
	end
	-- 노인은 어떤 일을 해도 등이 조금 굽는다
	if elder and m.waist and kind ~= "sit" then
		m.waist.Transform = m.waist.Transform * A(0.2, 0, 0)
	end
	end -- [직업 동작] 걷는 동안은 기존 보행 관절을 보존한다.
	-- [전신 보간] 몸통의 호흡·하체 체중 이동·직업 동작을 실제 관절의 현재 자세로 연결한다.
	-- [이동-발걸음 동기화] 이동 중에는 초 단위 흔들림을 더하지 않고 거리 기반 체중 이동만 사용한다.
	if not moving and m.root and kind ~= "sit" and kind ~= "fish" then
		m.root.Transform = m.root.Transform * CFrame.new(0, math.sin(t * 1.9) * 0.05, 0) * CFrame.Angles(0, math.sin(t * 0.7) * 0.05, math.sin(t * 0.8) * 0.035)
	end
	if m.neck and kind ~= "look" and kind ~= "stoop" and kind ~= "carry" then
		m.neck.Transform = m.neck.Transform * CFrame.Angles(math.sin(t * 0.6) * 0.06, math.sin(t * 0.45) * 0.22, 0)
	end
	-- 온몸 거들기: 팔만 움직이지 않고 무릎·허리·체중도 일에 맞춰 같이 움직인다(더해서 곱한다)
	local function add(motor, cf)
		if motor then motor.Transform = motor.Transform * cf end
	end
	local A = CFrame.Angles
	local standing = not moving and kind ~= "sit" and kind ~= "fish" and kind ~= "carry" and kind ~= "look" and kind ~= "stoop"
	if kind == "hammer" then
		local beat = (t * 0.94) % 1
		local s = if beat < 0.55 then math.sin(beat / 0.55 * math.pi * 0.5)
			elseif beat < 0.72 then math.max(0, 1 - (beat - 0.55) / 0.17) else 0
		add(m.root, CFrame.new(0, -0.14 * s, 0)); add(m.leftKnee, A(-0.3 * s, 0, 0)); add(m.rightKnee, A(-0.3 * s, 0, 0))
		add(m.waist, A(0, math.sin(t * 2.5) * 0.1, 0)); add(m.leftLeg, A(0.15 * s, 0, 0)); add(m.rightLeg, A(0.15 * s, 0, 0))
	elseif kind == "hoe" then
		local s = (math.sin(t * 2.2) + 1) / 2
		add(m.root, CFrame.new(0, -0.1 * s, -0.12 * s)); add(m.leftKnee, A(-0.3 * s, 0, 0)); add(m.rightKnee, A(-0.3 * s, 0, 0))
		add(m.waist, A(0, math.sin(t * 1.1) * 0.12, 0)); add(m.leftLeg, A(0.2 * s, 0, 0)); add(m.rightLeg, A(-0.1 * s, 0, 0))
	elseif kind == "sweep" then
		local s = math.sin(t * 3)
		add(m.waist, A(0, 0.22 * s, 0)); add(m.root, CFrame.new(0.07 * s, 0, 0)); add(m.leftLeg, A(0.1 * s, 0, 0)); add(m.rightLeg, A(-0.1 * s, 0, 0))
	elseif kind == "stir" then
		add(m.waist, A(0, math.sin(t * 3) * 0.14, math.cos(t * 3) * 0.04))
	elseif kind == "lift" or kind == "bell" then
		add(m.waist, A(0, math.sin(t * 0.9) * 0.06, 0))
	end
	if standing then
		-- 체중을 이쪽저쪽 발로 옮기며 선다
		local w = math.sin(t * 0.8 + 1.3)
		add(m.leftLeg, A(w * 0.05, 0, -w * 0.03)); add(m.rightLeg, A(-w * 0.05, 0, -w * 0.03))
		add(m.root, CFrame.new(w * 0.05, 0, 0))
		add(m.waist, A(0, 0, -w * 0.025))
	end
	-- 모든 관절을 이전 프레임에서 현재 목표로 부드럽게 잇는다(일이 바뀌거나 사인파가 끊기는 곳의 툭툭 끊김 방지)
	local now = os.clock()
	local st = workSmooth[model]
	if not st then
		st = { at = now, prev = {} }
		workSmooth[model] = st
	end
	local dt = now - st.at
	st.at = now
	local alpha = if dt > 0.25 then 1 else 1 - math.exp(-14 * dt)
	for _, joint in m do
		if joint and (joint:IsA("Motor6D") or joint:IsA("AnimationConstraint")) then
			local prev = st.prev[joint]
			local target = joint.Transform
			-- [보행 보존] 작업 상체 보간이 이전 제자리 자세를 하체 보행에 덮어쓰지 않도록 한다.
			local gaitJoint = moving and (joint == m.leftLeg or joint == m.rightLeg
				or joint == m.leftKnee or joint == m.rightKnee
				or joint == m.leftAnkle or joint == m.rightAnkle)
			if prev and not gaitJoint then
				target = prev:Lerp(target, alpha)
				joint.Transform = target
			end
			st.prev[joint] = target
		end
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
	local bob = if moving then math.abs(math.cos(st.phase)) * 0.24 else 0
	if m.root then
		m.root.Transform = CFrame.new(0, bob, 0) * CFrame.Angles(if moving then -0.1 else 0, if moving then sw * 0.07 else 0, 0)
	end
	if m.waist then
		m.waist.Transform = CFrame.Angles(breathe + swing * 0.35 - hurt * 0.4, -swing * 0.5 + (if moving then -sw * 0.12 else 0), 0)
	end
	if m.neck then
		m.neck.Transform = CFrame.Angles(hurt * 0.3 - swing * 0.1, 0, 0)
	end
	local armA = -sw * 0.85
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
		m.leftLeg.Transform = CFrame.Angles(sw * 0.9, 0, 0)
	end
	if m.rightLeg then
		m.rightLeg.Transform = CFrame.Angles(-sw * 0.9, 0, 0)
	end
	if m.leftKnee then
		m.leftKnee.Transform = CFrame.Angles(if moving then -math.max(0, -sw) * 0.9 else 0, 0, 0)
	end
	if m.rightKnee then
		m.rightKnee.Transform = CFrame.Angles(if moving then -math.max(0, sw) * 0.9 else 0, 0, 0)
	end
end

-- [로블록스 전용 R15 모션 제작기] 기존 NPC 관절을 사용해 직업/스킬별 액션을 실시간 합성한다.
-- 게임의 공격 판정·스킬 수치·저장 구조는 변경하지 않는다.
-- state: idle, walk, run, attack, shoot, reload, guard, hurt, cheer, talk
-- progress: 동작 진행률(0~1), t: 누적 시간(초)
function Pose.makeR15Action(model, state, progress, t, moveEffort)
	local m = rigMotors[model]
	if not m then return false end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if not humanoid or humanoid.RigType ~= Enum.HumanoidRigType.R15 then return false end
	-- 잘못된 동작 요청이 들어와도 기존 관절 자세를 지우지 않는다.
	if state ~= "idle" and state ~= "walk" and state ~= "run" and state ~= "attack"
		and state ~= "shoot" and state ~= "reload" and state ~= "guard"
		and state ~= "hurt" and state ~= "cheer" and state ~= "talk" then
		return false
	end
	local p = math.clamp(tonumber(progress) or 0, 0, 1)
	local time = tonumber(t) or 0
	local motionStyle = model:GetAttribute("MotionStyle") or "civilian"
	local personality = model:GetAttribute("MotionPersonality") or 1
	-- t는 걸음거리/동작 위상일 수도 있으므로 실제 경과시간으로 보간한다.
	local blendTime = os.clock()
	local blend = r15ActionBlends[model]
	if not blend then
		blend = { state = state, applied = {} }
		r15ActionBlends[model] = blend
	elseif blend.state ~= state then
		-- 이전 프레임의 실제 관절 자세에서 새 동작으로 부드럽게 이어진다.
		blend.from = table.clone(blend.applied)
		blend.changedAt = blendTime
		blend.state = state
	end
	-- [R15 회전 고도화] 이동 방향을 바꾸면 시선·가슴·발이 몸보다 조금 늦게 따라온다.
	local facing = model:GetPivot().LookVector
	local previous = blend.lastFacing
	local rawTurn = if previous then math.atan2(previous:Cross(facing).Y, previous:Dot(facing)) else 0
	local turnDt = math.clamp(blendTime - (blend.lastPoseTime or blendTime), 0, 0.1)
	local turnAlpha = 1 - math.exp(-14 * turnDt)
	blend.turn = (blend.turn or 0) + (math.clamp(rawTurn * 3, -0.42, 0.42) - (blend.turn or 0)) * turnAlpha
	blend.lastPoseTime = blendTime
	blend.lastFacing = facing
	local A = CFrame.Angles
	local wave = math.sin(p * math.pi)
	local function set(joint, cf)
		if joint and (joint:IsA("Motor6D") or joint:IsA("AnimationConstraint")) then
			-- [R15 주민 공통 방향] 보행의 짧은 뒤팔 스윙은 보존하고
			-- 공격·손짓 등 큰 전방 제스처가 등 뒤로 접히는 역부호만 바로잡는다.
			if model.Name == "Villager" and state ~= "walk" and state ~= "run"
				and (joint == m.leftArm or joint == m.rightArm) then
				local pitch, yaw, roll = cf:ToEulerAnglesXYZ()
				if pitch < -0.30 then cf = CFrame.Angles(-pitch, yaw, roll) end
			elseif joint == m.neck and model:GetAttribute("NpcFaceReversed") then
				cf = CFrame.Angles(0, math.pi, 0) * cf
			end
			joint.Transform = cf
		end
	end
	-- 모든 관절을 초기화해 이전 동작이 다음 동작에 남지 않도록 한다.
	for _, joint in m do set(joint, CFrame.identity) end
	if state == "idle" then
		-- 숨쉬기 + 체중 이동 + 가끔 두리번: 가만히 서 있어도 살아 있게
		local weight = if motionStyle == "heavy" then 0.65 elseif motionStyle == "nimble" then 1.16 else 0.9
		local lean = if motionStyle == "elder" then 0.13 elseif motionStyle == "scholar" then 0.06 else 0
		local gaze = if motionStyle == "nimble" or motionStyle == "scholar" then 0.17 else 0.09
		set(m.waist, A(lean + math.sin(time * 1.7) * 0.028, math.sin(time * 0.5 + personality) * gaze, 0))
		set(m.root, CFrame.new(math.sin(time * 0.45) * 0.052 * weight, math.sin(time * 1.7) * 0.019, 0) * A(0, 0, math.sin(time * 0.45) * 0.025 * weight))
		set(m.neck, A(math.sin(time * 0.9) * 0.045 - lean * 0.4, math.sin(time * 0.37 + personality) * gaze, 0))
		set(m.leftArm, A(math.sin(time * 1.1) * 0.07, 0, 0.1)); set(m.rightArm, A(-math.sin(time * 1.1) * 0.07, 0, -0.1))
		set(m.leftElbow, A(-0.15, 0, 0)); set(m.rightElbow, A(-0.15, 0, 0))
	elseif state == "walk" or state == "run" then
		-- 걸음 주기: 발 앞으로(무릎 굽힘) → 딛기 → 뒤로 밀기. 반대 팔이 같이 흔들리고 몸이 위아래·좌우로 자연스럽게 흔들린다.
		local run = state == "run"
		local companionMove = model:GetAttribute("CompanionId") ~= nil
		local companionRun = run and companionMove
		-- [실제 이동 연동] 느리게 접근하면 팔·발걸음이 줄고 전속력에서만 크게 뛴다.
		local speedStride = if companionMove then 0.42 + 0.58 * math.clamp(tonumber(moveEffort) or 1, 0.12, 1) else 1
		-- [발걸음] 걷기·달리기 모두 이동거리로 받은 위상을 사용한다.
		local w = time
		local s, c = math.sin(w), math.cos(w)
		local stride = if motionStyle == "heavy" then 0.84 elseif motionStyle == "elder" then 0.7 elseif motionStyle == "nimble" then 1.1 else 1
		local amp = (if run then 0.96 else 0.74) * stride * (if companionRun then 1.17 else 1) * speedStride
		local kneeAmp = (if run then 1.22 else 0.91) * stride * (if companionRun then 1.15 else 1) * speedStride
		-- [동료 축발] 관절 각도를 일정하게 왕복시키는 인형식 보행 대신 착지-밀기-들기 위상을 나눈다.
		local pushL, pushR = math.max(0, -s), math.max(0, s)
		set(m.leftLeg, A(s * amp + (if companionRun then -pushL * 0.10 else 0), 0, 0))
		set(m.rightLeg, A(-s * amp + (if companionRun then -pushR * 0.10 else 0), 0, 0))
		-- 무릎은 다리가 앞으로 나올 때 접힌다 (R15 무릎은 음수 방향이 접힘)
		set(m.leftKnee, A(-(math.max(0, c) * kneeAmp + 0.08), 0, 0))
		set(m.rightKnee, A(-(math.max(0, -c) * kneeAmp + 0.08), 0, 0))
		-- [착지 발목] 디딤 발은 지면에 남기고 들린 발끝은 착지를 준비한다.
		set(m.leftAnkle, A(-s * 0.15 - math.max(0, c) * 0.14 + (if companionRun then pushL * 0.16 else 0), 0, 0))
		set(m.rightAnkle, A(s * 0.15 - math.max(0, -c) * 0.14 + (if companionRun then pushR * 0.16 else 0), 0, 0))
		-- 반대 다리와 교차하는 팔. 앞팔은 충분히 나가되 뒤팔은 짧게 흔들어
		-- 뒤로 과하게 꺾이거나 등 뒤에 고정돼 보이지 않게 한다 (R15 전방 = 양의 X 회전).
		-- [팔-다리 역위상] 짧은 후방 스윙 때문에 교차가 사라진 회귀 수정. 팔 전후 비대칭은 유지한다.
		-- [실제 스튜디오 회귀] 노인·중갑병의 짧은 보폭에서도 팔·반대 다리 교차가 식별되도록 조절한다.
		local armForward = (if run then 0.90 else 0.78) * stride * (if companionRun then 1.18 else 1) * speedStride
		local armBack = (if run then 0.49 else 0.50) * stride * (if companionRun then 1.1 else 1) * speedStride
		local leftForward, rightForward = math.max(0, -s), math.max(0, s)
		local leftBack, rightBack = math.max(0, s), math.max(0, -s)
		set(m.leftArm, A(leftForward * armForward - leftBack * armBack, 0, 0.06))
		set(m.rightArm, A(rightForward * armForward - rightBack * armBack, 0, -0.06))
		-- 팔꿈치는 앞에 나오는 팔만 확실히 접고 뒤팔은 가볍게 구부린다.
		local elbowFront = if run then 0.95 else 0.36
		local elbowBack = if run then 0.38 else 0.15
		set(m.leftElbow, A(-(elbowBack + (elbowFront - elbowBack) * leftForward), 0, 0))
		set(m.rightElbow, A(-(elbowBack + (elbowFront - elbowBack) * rightForward), 0, 0))
		-- [지면 접지] 과도한 수직 바운스를 줄이고 하중 이동은 무릎·발목에 분산한다.
		local bob = (math.cos(2 * w) * 0.5 + 0.5)
			* (if companionMove then 0.022 elseif run then 0.12 else 0.075) * stride
		-- 동료는 착지 순간 골반을 높이 띄우지 않는다. 비주얼 요철은 무릎·발목이 담당한다.
		local lean = if motionStyle == "elder" then 0.12 elseif motionStyle == "nimble" then -0.06 else 0
		-- [유기적 질주] 발이 지면을 차는 순간 골반 회전·어깨 반작용·시선 안정화를 각기 다른 위상으로 준다.
		local pelvisShift = if companionRun then s * 0.055 * stride else 0
		set(m.root, CFrame.new(pelvisShift, bob, 0) * A((if companionRun then -0.20 elseif run then -0.13 else -0.03) + lean,
			s * (if companionRun then 0.12 else 0.08), s * (if companionRun then 0.06 else 0.03)))
		set(m.waist, A((if companionRun then -0.10 elseif run then -0.04 else 0) - lean * 0.4,
			-s * (if companionRun then 0.20 else 0.13), s * (if companionRun then 0.055 else 0)))
		set(m.neck, A(if run then 0.085 else 0, s * (if companionRun then 0.052 else 0.035), -s * (if companionRun then 0.028 else 0)))
		-- [몸 좌우 기울기] 착지한 쪽에 허리 힘을 싣고 목으로 균형을 잡는다.
		set(m.waist, m.waist.Transform * A(0, 0, -s * 0.024))
		set(m.neck, m.neck.Transform * A(0, 0, s * 0.014))
	elseif state == "attack" then
		-- [전투 전신 반작용] 기존 공격 진행률을 유지하고 반대 팔·허리·무릎으로 타격 하중을 전달한다.
		set(m.rightArm, A(-0.7 - wave * 2.1, 0, -0.3))
		set(m.rightElbow, A(-0.4 - wave * 0.5, 0, 0))
		set(m.leftArm, A(-0.3 - wave * 0.35, 0, 0.22))
		set(m.leftElbow, A(-0.28 - wave * 0.15, 0, 0))
		set(m.waist, A(wave * 0.2, -wave * 0.4, wave * 0.07))
		set(m.leftKnee, A(-wave * 0.16, 0, 0)); set(m.rightKnee, A(-wave * 0.22, 0, 0))
		set(m.neck, A(-wave * 0.07, wave * 0.12, 0))
	elseif state == "shoot" then
		set(m.rightArm, A(-1.5 - wave * 0.2, 0, -0.15))
		set(m.rightElbow, A(-0.2, 0, 0))
		set(m.leftArm, A(-1.2, 0, 0.3))
		set(m.waist, A(-wave * 0.08, -wave * 0.15, 0))
	elseif state == "reload" then
		set(m.leftArm, A(-1.2, 0, 0.3)); set(m.rightArm, A(-1.1, 0, -0.2))
		set(m.leftElbow, A(-0.7 - wave * 0.3, 0, 0))
		set(m.rightElbow, A(-0.8 + wave * 0.3, 0, 0))
	elseif state == "guard" then
		-- [방어 자세] 두 팔만 고정하지 않고 하체를 낮춰 받치는 자세로 연결한다.
		set(m.leftArm, A(-1.1, 0, 0.45)); set(m.rightArm, A(-1.2, 0, -0.4))
		set(m.leftElbow, A(-0.8, 0, 0)); set(m.rightElbow, A(-0.8, 0, 0))
		set(m.leftKnee, A(-0.16, 0, 0)); set(m.rightKnee, A(-0.19, 0, 0))
		set(m.waist, A(0.08, 0, -0.035))
	elseif state == "hurt" then
		-- [피격 흡수] 판정과 무관한 시각 반응으로 상체 충격에 무릎 굽힘을 동기화한다.
		set(m.waist, A(-wave * 0.35, 0, wave * 0.18))
		set(m.leftArm, A(-wave * 0.65, 0, 0.2))
		set(m.rightArm, A(-wave * 0.65, 0, -0.2))
		set(m.leftKnee, A(-wave * 0.25, 0, 0)); set(m.rightKnee, A(-wave * 0.18, 0, 0))
		set(m.neck, A(wave * 0.14, -wave * 0.1, 0))
	elseif state == "cheer" then
		set(m.leftArm, A(-2.3 + wave * 0.2, 0, 0.25))
		set(m.rightArm, A(-2.3 + wave * 0.2, 0, -0.25))
		set(m.waist, A(-wave * 0.12, 0, 0))
	elseif state == "talk" then
		set(m.rightArm, A(-0.7 + math.sin(time * 3) * 0.3, 0, -0.2))
		set(m.rightElbow, A(-0.6, 0, 0))
		set(m.neck, A(0, math.sin(time) * 0.16, 0))
	end
	-- [선행 시선·후행 상체] 역할과 관계없이 기존 이동·대기 자세 위에 작은 회전 반작용만 합성한다.
	if state == "idle" or state == "walk" or state == "run" then
		local turn = blend.turn or 0
		if m.neck then set(m.neck, m.neck.Transform * A(0, -turn * 0.85, 0)) end
		if m.waist then set(m.waist, m.waist.Transform * A(0, -turn * 0.42, 0)) end
		if m.leftLeg then set(m.leftLeg, m.leftLeg.Transform * A(0, turn * 0.14, 0)) end
		if m.rightLeg then set(m.rightLeg, m.rightLeg.Transform * A(0, turn * 0.14, 0)) end
	end
	-- 히트/공격은 반응성을 유지하고, 일반 자세만 조금 더 길게 연결한다.
	local duration = if state == "attack" or state == "hurt" then 0.10 else 0.26
	local elapsed = if blend.from then math.clamp((blendTime - blend.changedAt) / duration, 0, 1) else 1
	local eased = elapsed * elapsed * (3 - 2 * elapsed)
	for _, joint in m do
		if joint and (joint:IsA("Motor6D") or joint:IsA("AnimationConstraint")) then
			if blend.from then
				joint.Transform = (blend.from[joint] or CFrame.identity):Lerp(joint.Transform, eased)
			end
			blend.applied[joint] = joint.Transform
		end
	end
	if elapsed >= 1 then blend.from = nil end
	return true
end

-- [사망 3종 R15 관절] 후방 주저앉기·전방 붕괴·측면 구르기. 메시/시체 오브젝트를 새로 만들지 않는다.
-- 임팩트→무릎 붕괴→바닥 착지→마지막 짧은 페이드 순서로 연결하며 피통/전리품 판정은 호출자 소유다.
function Pose.dieR15(model, alpha, variant)
	local a = math.clamp(alpha, 0, 1)
	local style = math.clamp(math.floor(tonumber(variant) or 1), 1, 3)
	local fall = math.clamp((a - 0.04) / 0.54, 0, 1)
	fall = fall * fall * (3 - 2 * fall)
	local flinch = math.sin(math.clamp(a / 0.30, 0, 1) * math.pi)
	local lastBreath = math.sin(math.clamp((a - 0.55) / 0.28, 0, 1) * math.pi) * 0.05
	local m = rigMotors[model]
	if m then
		local A = CFrame.Angles
		if m.root then
			m.root.Transform = CFrame.new(0, -fall * 1.10, fall * (if style == 2 then -0.45 else 0.65))
				* A((if style == 2 then 1.42 else -1.44) * fall, 0, (if style == 3 then 1.22 else 0.16) * fall)
		end
		if m.waist then m.waist.Transform = A(-0.36 * flinch + 0.22 * fall, 0.15 * (if style == 3 then 1 else -1) * fall, 0.15 * fall) end
		if m.neck then m.neck.Transform = A(0.28 * flinch - 0.15 * fall + lastBreath, 0.16 * fall, 0.13 * fall) end
		if m.leftArm then m.leftArm.Transform = A(-0.55 * fall - 0.30 * flinch, 0, -0.45 * fall) end
		if m.rightArm then m.rightArm.Transform = A(-1.05 * fall - 0.22 * flinch, 0, 0.52 * fall) end
		if m.leftElbow then m.leftElbow.Transform = A(-0.70 * fall, 0, 0) end
		if m.rightElbow then m.rightElbow.Transform = A(-0.90 * fall, 0, 0) end
		if m.leftLeg then m.leftLeg.Transform = A(0.45 * fall, 0, -0.20 * fall) end
		if m.rightLeg then m.rightLeg.Transform = A(0.25 * fall, 0, 0.23 * fall) end
		if m.leftKnee then m.leftKnee.Transform = A(-0.83 * fall, 0, 0) end
		if m.rightKnee then m.rightKnee.Transform = A(-1.06 * fall, 0, 0) end
	end
	-- 즉시 사라지는 종이 인형 방지: 쓰러진 상태로 잠시 남고 마지막 22%에서만 페이드한다.
	local fade = math.clamp((a - 0.78) / 0.22, 0, 1)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" then
			d.Transparency = fade
		end
	end
end

return Pose
