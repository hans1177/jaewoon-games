-- 파일명: assets/roblox/survival-wildlife/SurvivalWildlife.luau
-- 역할: 게임 코드에서 바로 호출하는 Roblox 네이티브 야생동물 패키지 API
-- 서버는 생성/상태/이동 명령을 소유하고 클라이언트는 관절 애니메이션을 재생한다.

local RunService = game:GetService("RunService")
local CollectionService = game:GetService("CollectionService")

local Factory = require(script.Parent.WildlifeFactory)
local Catalog = require(script.Parent.WildlifeCatalog)

local Wildlife = {}

Wildlife.Tag = "VibeSurvivalWildlife"
Wildlife.Version = 3

local function assertServer()
	assert(RunService:IsServer(), "SurvivalWildlife spawn/state API must be called on the server")
end

function Wildlife.GetSpecies()
	local names = {}
	for name in pairs(Catalog.Species) do
		table.insert(names, name)
	end
	table.sort(names)
	return names
end

function Wildlife.Spawn(species, skin, cframe, parent)
	assertServer()
	local model = Factory.create(species, skin)
	model.Parent = parent or workspace
	model:PivotTo(cframe or CFrame.new())
	model:SetAttribute("WildlifeMotionState", "LOCOMOTION")
	model:SetAttribute("WildlifeDesiredSpeed", nil)
	model:SetAttribute("WildlifePackageVersion", Wildlife.Version)
	if not CollectionService:HasTag(model, Wildlife.Tag) then
		CollectionService:AddTag(model, Wildlife.Tag)
	end
	return model
end

function Wildlife.SetMotionState(model, state, options)
	assertServer()
	assert(model and model:IsA("Model"), "model required")
	local nextState = string.upper(tostring(state or "LOCOMOTION"))
	model:SetAttribute("WildlifeMotionState", nextState)
	if options then
		if options.hitSide ~= nil then
			model:SetAttribute("WildlifeHitSide", math.clamp(tonumber(options.hitSide) or 0, -1, 1))
		end
		if options.deathSide ~= nil then
			model:SetAttribute("WildlifeDeathSide", (tonumber(options.deathSide) or -1) >= 0 and 1 or -1)
		end
		if options.attackDuration ~= nil then
			model:SetAttribute("WildlifeAttackDuration", math.max(0.58, tonumber(options.attackDuration) or 0.92))
		end
	end
end

function Wildlife.SetDesiredSpeed(model, studsPerSecond)
	assertServer()
	assert(model and model:IsA("Model"), "model required")
	if studsPerSecond == nil then
		model:SetAttribute("WildlifeDesiredSpeed", nil)
	else
		model:SetAttribute("WildlifeDesiredSpeed", math.max(0, tonumber(studsPerSecond) or 0))
	end
end

function Wildlife.ApplySkin(model, skin)
	assertServer()
	return Factory.applySkin(model, skin)
end

function Wildlife.Destroy(model)
	assertServer()
	if model then
		CollectionService:RemoveTag(model, Wildlife.Tag)
		model:Destroy()
	end
end

return table.freeze(Wildlife)
