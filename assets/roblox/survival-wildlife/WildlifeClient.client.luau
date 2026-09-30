-- 파일명: assets/roblox/survival-wildlife/WildlifeClient.client.luau
-- 역할: 태그된 야생동물에 Roblox 네이티브 관절 애니메이터를 자동 연결한다.

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local folder = ReplicatedStorage:WaitForChild("SurvivalWildlife")
local WildlifeAnimator = require(folder:WaitForChild("WildlifeAnimator"))

local controllers = setmetatable({}, { __mode = "k" })
local connections = setmetatable({}, { __mode = "k" })

local function disconnectAll(model)
	local list = connections[model]
	if list then
		for _, connection in ipairs(list) do
			connection:Disconnect()
		end
	end
	connections[model] = nil
	local controller = controllers[model]
	if controller then
		controller:Destroy()
	end
	controllers[model] = nil
end

local function applyReplicatedState(model, controller)
	local desiredSpeed = model:GetAttribute("WildlifeDesiredSpeed")
	if desiredSpeed == nil then
		controller:SetSpeed(nil)
	else
		controller:SetSpeed(desiredSpeed)
	end

	local state = tostring(model:GetAttribute("WildlifeMotionState") or "LOCOMOTION")
	controller:SetState(state, {
		side = model:GetAttribute("WildlifeHitSide"),
		duration = model:GetAttribute("WildlifeAttackDuration"),
	})
end

local function bind(model)
	if controllers[model] or not model:IsA("Model") then
		return
	end
	if not model.PrimaryPart then
		model:GetPropertyChangedSignal("PrimaryPart"):Wait()
	end
	if not model.PrimaryPart then
		return
	end

	local controller = WildlifeAnimator.bind(model, {
		nominalRunSpeed = 15,
	})
	controllers[model] = controller
	applyReplicatedState(model, controller)

	local list = {}
	table.insert(list, model:GetAttributeChangedSignal("WildlifeDesiredSpeed"):Connect(function()
		applyReplicatedState(model, controller)
	end))
	table.insert(list, model:GetAttributeChangedSignal("WildlifeMotionState"):Connect(function()
		applyReplicatedState(model, controller)
	end))
	table.insert(list, model:GetAttributeChangedSignal("WildlifeHitSide"):Connect(function()
		applyReplicatedState(model, controller)
	end))
	table.insert(list, model:GetAttributeChangedSignal("WildlifeAttackDuration"):Connect(function()
		applyReplicatedState(model, controller)
	end))
	table.insert(list, model.AncestryChanged:Connect(function(_, parent)
		if parent == nil then
			disconnectAll(model)
		end
	end))
	connections[model] = list
end

for _, model in ipairs(CollectionService:GetTagged("VibeSurvivalWildlife")) do
	task.defer(bind, model)
end

CollectionService:GetInstanceAddedSignal("VibeSurvivalWildlife"):Connect(function(model)
	task.defer(bind, model)
end)

CollectionService:GetInstanceRemovedSignal("VibeSurvivalWildlife"):Connect(function(model)
	disconnectAll(model)
end)
