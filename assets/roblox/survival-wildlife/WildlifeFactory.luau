-- 파일명: assets/roblox/survival-wildlife/WildlifeFactory.luau
-- 역할: WildlifeCatalog을 실제 3D 저폴리 관절 모델로 생성한다.
-- 금지: BillboardGui/ImageLabel/SurfaceGui 기반 동물, 한 덩어리 root 이동만으로 걷는 동물.

local CollectionService = game:GetService("CollectionService")
local Catalog = require(script.Parent.WildlifeCatalog)

local Factory = {}

local function smoothPart(name, size, color, shape)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Massless = true
	part.CastShadow = true
	if shape == "BALL" then
		part.Shape = Enum.PartType.Ball
	elseif shape == "CYLINDER" then
		part.Shape = Enum.PartType.Cylinder
	end
	return part
end

local function wedgePart(name, size, color)
	local part = Instance.new("WedgePart")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Massless = true
	part.CastShadow = true
	return part
end

local function motor(parentPart, childPart, name, localCFrame)
	childPart.CFrame = parentPart.CFrame * localCFrame
	local joint = Instance.new("Motor6D")
	joint.Name = name
	joint.Part0 = parentPart
	joint.Part1 = childPart
	joint.C0 = localCFrame
	joint.C1 = CFrame.identity
	joint.Parent = parentPart
	return joint
end

local function weld(parentPart, childPart, localCFrame)
	childPart.CFrame = parentPart.CFrame * localCFrame
	local joint = Instance.new("WeldConstraint")
	joint.Part0 = parentPart
	joint.Part1 = childPart
	joint.Parent = childPart
	return joint
end

local function addEye(model, head, side, skin, headSize)
	local eye = smoothPart(side < 0 and "EyeL" or "EyeR", Vector3.new(0.17, 0.17, 0.17), Color3.fromRGB(18, 17, 15), "BALL")
	eye.Parent = model
	local x = side * headSize.X * 0.33
	local y = headSize.Y * 0.13
	local z = -headSize.Z * 0.43
	weld(head, eye, CFrame.new(x, y, z))
	return eye
end

local function addNose(model, muzzle, skin, muzzleSize)
	local nose = smoothPart("Nose", Vector3.new(muzzleSize.X * 0.48, muzzleSize.Y * 0.34, muzzleSize.Z * 0.30), skin.dark, "BALL")
	nose.Parent = model
	weld(muzzle, nose, CFrame.new(0, 0, -muzzleSize.Z * 0.48))
	return nose
end

local function addEar(model, head, name, side, kind, skin, headSize)
	if kind == "NONE" then
		return nil
	end
	local width = headSize.X * 0.23
	local height = headSize.Y * 0.38
	if kind == "LONG" or kind == "POINT_LONG" then
		height = headSize.Y * 0.62
	elseif kind == "RABBIT" then
		width = headSize.X * 0.24
		height = headSize.Y * 1.35
	elseif kind == "ROUND" or kind == "ROUND_SMALL" then
		height = headSize.Y * 0.28
	end
	local ear
	if kind == "ROUND" or kind == "ROUND_SMALL" then
		ear = smoothPart(name, Vector3.new(width, height, width * 0.55), skin.body, "BALL")
	else
		ear = wedgePart(name, Vector3.new(width, height, width * 0.45), skin.body)
	end
	ear.Parent = model
	local x = side * headSize.X * 0.31
	local y = headSize.Y * 0.47
	local z = -headSize.Z * 0.04
	local tilt = math.rad(side * 12)
	motor(head, ear, name .. "Joint", CFrame.new(x, y, z) * CFrame.Angles(0, 0, tilt))
	return ear
end

local function addLeg(model, parentPart, prefix, x, z, cfg, skin)
	local upper = smoothPart(prefix .. "Upper", cfg.legUpper, skin.body, "BALL")
	upper.Parent = model
	local upperJoint = motor(parentPart, upper, prefix .. "Hip", CFrame.new(x, -parentPart.Size.Y * 0.36, z))

	local lower = smoothPart(prefix .. "Lower", cfg.legLower, skin.dark, "BALL")
	lower.Parent = model
	local lowerJoint = motor(upper, lower, prefix .. "Knee", CFrame.new(0, -cfg.legUpper.Y * 0.70, 0.02))

	local foot = smoothPart(prefix .. "Foot", cfg.foot, skin.dark, "BALL")
	foot.Parent = model
	local footJoint = motor(lower, foot, prefix .. "Ankle", CFrame.new(0, -cfg.legLower.Y * 0.70, -cfg.foot.Z * 0.18))

	return {
		upper = upper,
		lower = lower,
		foot = foot,
		hip = upperJoint,
		knee = lowerJoint,
		ankle = footJoint,
	}
end

local function addTail(model, body, cfg, skin)
	local kind = cfg.tail
	if not kind or kind == "NONE" then
		return
	end
	local baseSize = Vector3.new(0.44, 0.44, 1.2)
	local tipSize = Vector3.new(0.35, 0.35, 1.0)
	if kind == "FOX" or kind == "SQUIRREL" then
		baseSize = Vector3.new(0.72, 0.72, 1.55)
		tipSize = Vector3.new(0.62, 0.62, 1.35)
	elseif kind == "PUFF" then
		baseSize = Vector3.new(0.72, 0.72, 0.72)
		tipSize = Vector3.new(0.01, 0.01, 0.01)
	elseif kind == "BEAVER" then
		baseSize = Vector3.new(0.70, 0.30, 1.45)
		tipSize = Vector3.new(0.82, 0.28, 1.15)
	elseif kind == "SHORT" then
		baseSize = Vector3.new(0.45, 0.45, 0.62)
		tipSize = Vector3.new(0.30, 0.30, 0.45)
	elseif kind == "BIRD_FAN" then
		baseSize = Vector3.new(1.45, 0.28, 1.15)
		tipSize = Vector3.new(1.82, 0.20, 0.90)
	elseif kind == "BIRD" then
		baseSize = Vector3.new(0.72, 0.22, 0.88)
		tipSize = Vector3.new(0.78, 0.18, 0.68)
	end

	local base = smoothPart("TailBase", baseSize, skin.body, kind == "BEAVER" and nil or "BALL")
	base.Parent = model
	motor(body, base, "TailBaseJoint", CFrame.new(0, body.Size.Y * 0.05, body.Size.Z * 0.52) * CFrame.Angles(math.rad(-12), 0, 0))

	if tipSize.X > 0.05 then
		local tip = smoothPart("TailTip", tipSize, kind == "FOX" and skin.light or skin.body, kind == "BEAVER" and nil or "BALL")
		tip.Parent = model
		motor(base, tip, "TailTipJoint", CFrame.new(0, 0, baseSize.Z * 0.68))
	end
end

local function addTusks(model, muzzle, cfg, skin)
	if not cfg.tusks then
		return
	end
	for _, side in ipairs({ -1, 1 }) do
		local tusk = smoothPart(side < 0 and "TuskL" or "TuskR", Vector3.new(0.16, 0.52, 0.16), Color3.fromRGB(226, 214, 181), "CYLINDER")
		tusk.Parent = model
		weld(muzzle, tusk, CFrame.new(side * muzzle.Size.X * 0.43, -muzzle.Size.Y * 0.18, -muzzle.Size.Z * 0.34) * CFrame.Angles(0, 0, math.rad(70)))
	end
end

local function addHornPair(model, head, kind, skin)
	if not kind then
		return
	end
	local length = kind == "BISON" and 0.82 or 0.92
	local sweep = kind == "BISON" and 34 or 18
	for _, side in ipairs({ -1, 1 }) do
		local horn = smoothPart(side < 0 and "HornL" or "HornR", Vector3.new(0.18, length, 0.18), Color3.fromRGB(184, 172, 143), "CYLINDER")
		horn.Parent = model
		weld(head, horn, CFrame.new(side * head.Size.X * 0.34, head.Size.Y * 0.45, -head.Size.Z * 0.02) * CFrame.Angles(0, 0, math.rad(90 + side * sweep)))
	end
end

local function antlerBranch(model, head, side, palm)
	local color = Color3.fromRGB(104, 82, 58)
	local base = smoothPart(side < 0 and "AntlerL" or "AntlerR", Vector3.new(0.16, palm and 1.25 or 1.55, 0.16), color, "CYLINDER")
	base.Parent = model
	weld(head, base, CFrame.new(side * head.Size.X * 0.31, head.Size.Y * 0.50, 0) * CFrame.Angles(0, 0, math.rad(90 + side * 18)))
	for i = 1, palm and 3 or 4 do
		local tine = smoothPart((side < 0 and "AntlerL" or "AntlerR") .. "Tine" .. i, Vector3.new(0.12, 0.62 + i * 0.09, 0.12), color, "CYLINDER")
		tine.Parent = model
		local along = -0.36 + i * 0.25
		weld(base, tine, CFrame.new(0, along, 0) * CFrame.Angles(0, 0, math.rad(side * (palm and 38 or 28))))
	end
	if palm then
		local plate = wedgePart((side < 0 and "AntlerL" or "AntlerR") .. "Palm", Vector3.new(0.46, 0.82, 0.16), color)
		plate.Parent = model
		weld(base, plate, CFrame.new(0, 0.32, 0))
	end
end

local function addAntlers(model, head, kind)
	if not kind then
		return
	end
	if kind == "PALMATE" then
		antlerBranch(model, head, -1, true)
		antlerBranch(model, head, 1, true)
	else
		antlerBranch(model, head, -1, false)
		antlerBranch(model, head, 1, false)
	end
end

local function addFaceMarkings(model, head, cfg, skin)
	if cfg.faceMask then
		for _, side in ipairs({ -1, 1 }) do
			local mask = smoothPart(side < 0 and "MaskL" or "MaskR", Vector3.new(head.Size.X * 0.34, head.Size.Y * 0.20, 0.08), skin.dark, "BALL")
			mask.Parent = model
			weld(head, mask, CFrame.new(side * head.Size.X * 0.20, head.Size.Y * 0.06, -head.Size.Z * 0.49))
		end
	elseif cfg.faceStripe then
		for _, side in ipairs({ -1, 1 }) do
			local stripe = smoothPart(side < 0 and "StripeL" or "StripeR", Vector3.new(head.Size.X * 0.20, head.Size.Y * 0.72, 0.08), skin.light, nil)
			stripe.Parent = model
			weld(head, stripe, CFrame.new(side * head.Size.X * 0.20, head.Size.Y * 0.03, -head.Size.Z * 0.50) * CFrame.Angles(0, 0, math.rad(side * 10)))
		end
	end
end

local function addWing(model, body, side, skin)
	local wing = wedgePart(side < 0 and "WingL" or "WingR", Vector3.new(body.Size.X * 0.72, body.Size.Y * 0.24, body.Size.Z * 0.75), skin.dark)
	wing.Parent = model
	motor(body, wing, side < 0 and "WingLJoint" or "WingRJoint", CFrame.new(side * body.Size.X * 0.48, 0.05, 0) * CFrame.Angles(0, math.rad(side * 5), math.rad(side * 8)))
end

local function addHump(model, chest, skin)
	local hump = smoothPart("ShoulderHump", Vector3.new(chest.Size.X * 0.88, chest.Size.Y * 0.52, chest.Size.Z * 0.72), skin.dark, "BALL")
	hump.Parent = model
	weld(chest, hump, CFrame.new(0, chest.Size.Y * 0.38, chest.Size.Z * 0.04))
end

local function addBearCharacterDetails(model, body, chest, head, muzzle, skin)
	local belly = smoothPart("Belly", Vector3.new(body.Size.X * 0.82, body.Size.Y * 0.70, body.Size.Z * 0.64), skin.chest, "BALL")
	belly.Parent = model
	motor(body, belly, "BellyJoint", CFrame.new(0, -body.Size.Y * 0.18, body.Size.Z * 0.12))

	local rump = smoothPart("Rump", Vector3.new(body.Size.X * 0.84, body.Size.Y * 0.76, body.Size.Z * 0.56), skin.body, "BALL")
	rump.Parent = model
	motor(body, rump, "RumpJoint", CFrame.new(0, 0, body.Size.Z * 0.34))

	local ruff = smoothPart("ChestRuff", Vector3.new(chest.Size.X * 0.78, chest.Size.Y * 0.46, chest.Size.Z * 0.42), skin.light, "BALL")
	ruff.Parent = model
	motor(chest, ruff, "ChestRuffJoint", CFrame.new(0, -chest.Size.Y * 0.18, -chest.Size.Z * 0.34))

	for _, side in ipairs({ -1, 1 }) do
		local suffix = side < 0 and "L" or "R"
		local eyeWhite = smoothPart("EyeWhite" .. suffix, Vector3.new(0.30, 0.25, 0.12), Color3.fromRGB(214, 196, 166), "BALL")
		eyeWhite.Parent = model
		weld(head, eyeWhite, CFrame.new(side * head.Size.X * 0.32, head.Size.Y * 0.15, -head.Size.Z * 0.44))

		local cheek = smoothPart("Cheek" .. suffix, Vector3.new(head.Size.X * 0.34, head.Size.Y * 0.30, head.Size.Z * 0.26), skin.chest, "BALL")
		cheek.Parent = model
		motor(head, cheek, "Cheek" .. suffix .. "Joint", CFrame.new(side * head.Size.X * 0.30, -head.Size.Y * 0.10, -head.Size.Z * 0.35))

		local brow = smoothPart("Brow" .. suffix, Vector3.new(head.Size.X * 0.24, head.Size.Y * 0.08, head.Size.Z * 0.10), skin.dark, "BALL")
		brow.Parent = model
		motor(head, brow, "Brow" .. suffix .. "Joint", CFrame.new(side * head.Size.X * 0.30, head.Size.Y * 0.34, -head.Size.Z * 0.43) * CFrame.Angles(0, 0, math.rad(side * 8)))
	end

	local muzzleTop = smoothPart("MuzzleTop", Vector3.new(muzzle.Size.X * 0.88, muzzle.Size.Y * 0.62, muzzle.Size.Z * 0.72), skin.light, "BALL")
	muzzleTop.Parent = model
	weld(muzzle, muzzleTop, CFrame.new(0, muzzle.Size.Y * 0.08, -muzzle.Size.Z * 0.06))
end

function Factory.create(speciesName, skinName)
	local key = string.upper(tostring(speciesName or "BEAR"))
	local cfg = Catalog.getSpecies(key) or Catalog.getSpecies("BEAR")
	local skinData, resolvedSkin = Catalog.getSkin(key, skinName)
	if not skinData then
		key = "BEAR"
		cfg = Catalog.getSpecies(key)
		skinData, resolvedSkin = Catalog.getSkin(key, skinName)
	end

	local model = Instance.new("Model")
	model.Name = key
	model:SetAttribute("WildlifeSpecies", key)
	model:SetAttribute("WildlifeSkin", resolvedSkin)
	model:SetAttribute("WildlifeGait", cfg.gait)
	model:SetAttribute("WildlifeRigVersion", 2)
	model:SetAttribute("AnimationQuality", "SMOOTH_3D_ARTICULATED")
	model:SetAttribute("TwoDimensionalPresentationForbidden", true)
	model:SetAttribute("RootOnlyLocomotionForbidden", true)
	model:SetAttribute("RuntimeVerified", false)
	model:SetAttribute("WildlifeMotionState", "LOCOMOTION")
	model:SetAttribute("WildlifeDesiredSpeed", nil)
	model:SetAttribute("WildlifeAnimatorRuntime", "ROBLOX_NATIVE")
	model:SetAttribute("WildlifeAnimationSource", "MOTOR6D_ARTICULATED_CHARACTER_ANIMATION")

	local animationController = Instance.new("AnimationController")
	animationController.Name = "AnimationController"
	animationController.Parent = model
	local robloxAnimator = Instance.new("Animator")
	robloxAnimator.Name = "Animator"
	robloxAnimator.Parent = animationController

	local rootHeight = cfg.legUpper.Y * 0.78 + cfg.legLower.Y * 0.78 + cfg.foot.Y * 0.65 + cfg.body.Y * 0.54
	local root = smoothPart("Root", Vector3.new(cfg.body.X * 0.62, math.max(0.8, cfg.body.Y * 0.62), cfg.body.Z * 0.58), skinData.body)
	root.Transparency = 1
	root.CanCollide = true
	root.CanTouch = true
	root.CanQuery = true
	root.Massless = false
	root.CFrame = CFrame.new(0, rootHeight, 0)
	root.Parent = model
	model.PrimaryPart = root

	local body = smoothPart("Body", cfg.body, skinData.body, "BALL")
	body.Parent = model
	motor(root, body, "BodyJoint", CFrame.new(0, 0, 0))

	local chest = smoothPart("Chest", cfg.chest, skinData.chest, "BALL")
	chest.Parent = model
	motor(body, chest, "ChestJoint", CFrame.new(0, cfg.body.Y * 0.06, -cfg.body.Z * 0.30))

	local neckSize = Vector3.new(cfg.head.X * 0.68, math.max(0.45, cfg.neckLength), cfg.head.Z * 0.62)
	local neck = smoothPart("Neck", neckSize, skinData.chest, "BALL")
	neck.Parent = model
	motor(chest, neck, "NeckJoint", CFrame.new(0, chest.Size.Y * 0.16, -chest.Size.Z * 0.48 - cfg.neckLength * 0.22) * CFrame.Angles(math.rad(-16), 0, 0))

	local head = smoothPart("Head", cfg.head, skinData.body, "BALL")
	head.Parent = model
	motor(neck, head, "HeadJoint", CFrame.new(0, cfg.neckLength * 0.55, -neck.Size.Z * 0.54))

	local muzzle = smoothPart("Muzzle", cfg.muzzle, skinData.light, "BALL")
	muzzle.Parent = model
	motor(head, muzzle, "MuzzleJoint", CFrame.new(0, -cfg.head.Y * 0.12, -cfg.head.Z * 0.55))

	local jaw = smoothPart("Jaw", Vector3.new(cfg.muzzle.X * 0.86, cfg.muzzle.Y * 0.36, cfg.muzzle.Z * 0.82), skinData.dark, "BALL")
	jaw.Parent = model
	motor(muzzle, jaw, "JawJoint", CFrame.new(0, -cfg.muzzle.Y * 0.35, -cfg.muzzle.Z * 0.04))

	addEye(model, head, -1, skinData, cfg.head)
	addEye(model, head, 1, skinData, cfg.head)
	addNose(model, muzzle, skinData, cfg.muzzle)
	if key == "BEAR" then
		addBearCharacterDetails(model, body, chest, head, muzzle, skinData)
	end
	addEar(model, head, "EarL", -1, cfg.ear, skinData, cfg.head)
	addEar(model, head, "EarR", 1, cfg.ear, skinData, cfg.head)
	addTail(model, body, cfg, skinData)
	addTusks(model, muzzle, cfg, skinData)
	addHornPair(model, head, cfg.horns, skinData)
	addAntlers(model, head, cfg.antlers)
	addFaceMarkings(model, head, cfg, skinData)
	if cfg.hump then
		addHump(model, chest, skinData)
	end
	if cfg.wing then
		addWing(model, body, -1, skinData)
		addWing(model, body, 1, skinData)
	end

	local frontZ = -cfg.body.Z * 0.30
	local backZ = cfg.body.Z * 0.30
	local x = cfg.body.X * 0.34
	addLeg(model, chest, "FL", -x, -cfg.chest.Z * 0.08, cfg, skinData)
	addLeg(model, chest, "FR", x, -cfg.chest.Z * 0.08, cfg, skinData)
	addLeg(model, body, "BL", -x, backZ, cfg, skinData)
	addLeg(model, body, "BR", x, backZ, cfg, skinData)

	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("BasePart") then
			descendant:SetAttribute("Wildlife3DPart", true)
		end
	end

	model:ScaleTo(cfg.scale)
	CollectionService:AddTag(model, "VibeSurvivalWildlife")
	return model
end

function Factory.applySkin(model, skinName)
	if not model then
		return false
	end
	local species = tostring(model:GetAttribute("WildlifeSpecies") or model.Name)
	local cfg = Catalog.getSpecies(species)
	local skinData, resolvedSkin = Catalog.getSkin(species, skinName)
	if not cfg or not skinData then
		return false
	end
	for _, part in ipairs(model:GetDescendants()) do
		if part:IsA("BasePart") then
			local name = part.Name
			if name == "Chest" or name == "Neck" then
				part.Color = skinData.chest
			elseif name:find("Lower") or name:find("Foot") or name:find("Mask") or name:find("Jaw") or name:find("ShoulderHump") then
				part.Color = skinData.dark
			elseif name:find("Stripe") or name == "Muzzle" or name == "TailTip" then
				part.Color = skinData.light
			elseif name ~= "Root" and not name:find("Eye") and not name:find("Nose") and not name:find("Horn") and not name:find("Antler") and not name:find("Tusk") then
				part.Color = skinData.body
			end
		end
	end
	model:SetAttribute("WildlifeSkin", resolvedSkin)
	return true
end

return table.freeze(Factory)
