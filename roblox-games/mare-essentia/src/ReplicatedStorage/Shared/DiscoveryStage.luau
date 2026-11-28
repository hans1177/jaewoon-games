--!nonstrict
-- DiscoveryStage.luau · 지상 탐험 발견 지점 실물 연출 (클라이언트 전용, 2026-11-24 오너 지시)
-- DiscoveryForms 매핑표대로 승인 모델을 배치하고 단계별로 보여 준다.
--  · 멀리서는 어두운 실루엣 → 가까이 가면 실물이 또렷해진다.
--  · 맞는 모델이 없으면 다른 종으로 때우지 않고 '관찰 기록 현장'(야영 흔적 + 카드 원화)으로 보여 준다.
--  · 시간·날씨 조건(밤·비 온 뒤)이 안 맞으면 흔적만 남고, 조건이 맞으면 실물이 나타난다(보상은 막지 않음).
--  · 식물은 무리로 자라고, 꽃은 봄·여름에만 핀다(그 밖엔 잎만).
--  · 동물은 뛰어서 다가가면 놀라 달아난다(최대 3번). 천천히 다가가야 스케치할 수 있다.
--  · 조사 방법: 스케치(동물)·채집(식물·광물)·탁본(유적)·조사(유물). 채집하면 하나가 사라진다.
--  · 유적은 크게 세워 멀리서도 보이는 탐험 목표가 된다.
-- 서버 보상·저장·발견 판정은 바꾸지 않는다(기존 Explore 처리 그대로).

local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")

local DF = require(script.Parent:WaitForChild("DiscoveryForms"))
-- [드롭박스 자동 배치] 카드 id 이름으로 등록된 전용 모델을 찾을 수 있게 등록표를 넘긴다.
pcall(function() DF.assetIds = require(script.Parent:WaitForChild("AssetIds", 5)) end)
-- 동물 실물은 항구 목장과 같은 크기·품종색(AnimalVisual)을 쓴다.
local okPB, PortBuildings = pcall(function() return require(script.Parent:WaitForChild("PortBuildings", 5)) end)
if not okPB then PortBuildings = nil end

local Stage = {}

local HOLD = { sketch = 1.4, collect = 0.8, rubbing = 1.8, inspect = 0.6 }

local function conditionMet(cond, folder): boolean
	if not cond then return true end
	if cond.time == "night" then
		local t = Lighting.ClockTime
		if not (t < 6 or t > 18.5) then return false end
	end
	if cond.weather == "rain" then
		local w = tostring(folder:GetAttribute("FieldWeather") or "")
		if not (string.find(w, "비", 1, true) or string.find(w, "소나기", 1, true) or string.find(w, "안개", 1, true)) then return false end
	end
	return true
end

-- args: folder, pos(Vector3 바닥), anchor(BasePart), prompt(ProximityPrompt), card, placeModel(fn), say(fn),
--       season(string), isFinished(fn) → 반환: { onObserved = fn, form = form }
function Stage.setup(args)
	local card = args.card
	local form = DF.form(card)
	if not form then return nil end
	local folder, pos, anchor, prompt = args.folder, args.pos, args.anchor, args.prompt
	local placeModel, say = args.placeModel, args.say
	local rng = Random.new(#card.id * 7919 + math.floor(pos.X))
	local models = {}
	local traceModels = {}
	local reduced = game:GetService("GuiService").ReducedMotionEnabled

	prompt.ActionText = DF.METHOD_TEXT[form.method] or "조사"
	prompt.HoldDuration = HOLD[form.method] or 0.6
	folder:SetAttribute("FieldDiscoveryArchetype", form.archetype)
	folder:SetAttribute("FieldDiscoveryMethod", form.method)

	-- 관찰 기록 현장(모델이 없거나 조건이 안 맞을 때): 야영 흔적 + 기록장
	local function placeTrace()
		if #traceModels > 0 then return end
		for i, spec in { { "Terrain", "campfire-stones", 2.4, Vector3.new(2.6, 0, 1.2) }, { "Relics", "journal-open", 1.4, Vector3.new(-1.6, 0, 1.8) }, { "Terrain", "tent-detailedopen", 6, Vector3.new(-5, 0, -4) } } do
			local m = placeModel(folder, spec[1], spec[2], pos + spec[4], spec[3], false)
			if m then
				m.Name = "FieldDiscoveryTrace" .. i
				table.insert(traceModels, m)
			end
		end
	end
	local function clearTrace()
		for _, m in traceModels do if m.Parent then m:Destroy() end end
		table.clear(traceModels)
	end

	-- 실물 배치(무리·크기 변형·색)
	local function placeForm()
		if #models > 0 or form.missing then return end
		local list = form.models
		local bloomOff = form.bloom and not (args.season == "봄" or args.season == "여름")
		local count = math.max(1, form.cluster or 1)
		for i = 1, count do
			local spec = list[(i - 1) % #list + 1]
			if bloomOff then spec = { "Terrain", "plant-bushsmall" } end
			local offset = if i == 1 then Vector3.zero
				else Vector3.new(rng:NextNumber(-1, 1), 0, rng:NextNumber(-1, 1)).Unit * rng:NextNumber(2.2, 3.4 + form.size * 0.5)
			local size = form.size * (if i == 1 then 1 else rng:NextNumber(0.7, 1.05))
			local tint = form.tint and Color3.fromRGB(table.unpack(form.tint)) or nil
			local av = form.exact and PortBuildings and PortBuildings.AnimalVisual and PortBuildings.AnimalVisual[form.exact]
			if av then
				local coats = av.coats
				size = av.size
				tint = Color3.fromRGB(table.unpack(coats[1]))
			end
			local m = placeModel(folder, spec[1], spec[2], pos + offset, size, form.landmark, tint)
			if m then
				m.Name = "FieldDiscoveryForm" .. i
				m:SetAttribute("DiscoveryCard", card.id)
				m:SetAttribute("DiscoveryArchetype", form.archetype)
				if form.kind == "animal" then m:SetAttribute("ObservedSpecies", card.id) end
				m:PivotTo(m:GetPivot() * CFrame.Angles(0, math.rad(rng:NextNumber(0, 360)), 0))
				table.insert(models, m)
			end
		end
		if form.tools then
			local t = placeModel(folder, form.tools[1], form.tools[2], pos + Vector3.new(2, 0, 2), 1.4, false)
			if t then t.Name = "FieldDiscoveryTool"; table.insert(models, t) end
		end
		if form.landmark then
			-- 큰 유적은 앞쪽에서 조사하도록 지점을 앞으로 뺀다
			anchor.CFrame = CFrame.new(pos + Vector3.new(0, 1.5, form.size * 0.45))
		end
		if bloomOff then say("꽃은 봄·여름에 피어. 지금은 잎만 보여.", 3) end
	end

	-- 실루엣: 멀리서는 어둡게, 가까이 가면 또렷하게
	local silhouettes = {}
	local function silhouette(on)
		for _, h in silhouettes do if h.Parent then h:Destroy() end end
		table.clear(silhouettes)
		if not on then return end
		for _, m in models do
			local h = Instance.new("Highlight")
			h.Name = "DiscoverySilhouette"
			h.FillColor = Color3.fromRGB(18, 16, 14)
			h.FillTransparency = 0.12
			h.OutlineColor = Color3.fromRGB(240, 200, 120)
			h.OutlineTransparency = 0.55
			h.DepthMode = Enum.HighlightDepthMode.Occluded
			h.Adornee = m
			h.Parent = m
			table.insert(silhouettes, h)
		end
	end

	local observed = false
	local revealed = false
	local flees = 0
	local available = conditionMet(form.condition, folder)
	if form.missing or not available then
		placeTrace()
		if not form.missing and form.condition then
			say(string.format("%s의 흔적이 있어. %s에 다시 보면 실물을 볼 수 있어.", card.name, form.condition.text), 4)
		end
	end
	if available then placeForm() end
	silhouette(#models > 0)
	-- 모델이 아직 내려받는 중이면(지연 로딩) 흔적을 먼저 보여 주고, 도착하면 실물로 바꾼다.
	if available and #models == 0 and not form.missing then
		placeTrace()
		local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
		local wanted = {}
		for _, m in form.models do wanted[m[1]] = true end
		for groupName in wanted do
			local group = lib and lib:FindFirstChild(groupName)
			if group then
				local conn
				conn = group.ChildAdded:Connect(function()
					if #models > 0 or args.isFinished() or not anchor.Parent then
						if conn then conn:Disconnect() end
						return
					end
					task.defer(function()
						if #models > 0 or args.isFinished() then return end
						placeForm()
						if #models > 0 then
							clearTrace()
							silhouette(not revealed)
							if conn then conn:Disconnect() end
						end
					end)
				end)
			end
		end
	end

	task.spawn(function()
		while not observed and anchor.Parent and not args.isFinished() do
			task.wait(0.25)
			-- 조건이 새로 맞으면 실물 등장
			if not available and conditionMet(form.condition, folder) then
				available = true
				clearTrace()
				placeForm()
				silhouette(not revealed)
				say(card.name .. "이(가) 모습을 드러냈다!", 3)
			end
			local hrp = Players.LocalPlayer.Character and Players.LocalPlayer.Character:FindFirstChild("HumanoidRootPart")
			if hrp and #models > 0 then
				local d = (hrp.Position - anchor.Position).Magnitude
				-- 동물: 뛰어서 다가가면 달아난다
				if form.kind == "animal" and d < 12 and flees < 3 and hrp.AssemblyLinearVelocity.Magnitude > 17 then
					flees += 1
					local away = (anchor.Position - hrp.Position) * Vector3.new(1, 0, 1)
					away = if away.Magnitude > 0.1 then away.Unit * 16 else Vector3.new(16, 0, 0)
					for _, m in models do
						local cf = m:GetPivot() + away
						if reduced then m:PivotTo(cf) else
							local v = Instance.new("CFrameValue")
							v.Value = m:GetPivot()
							v.Changed:Connect(function(c) if m.Parent then m:PivotTo(c) end end)
							TweenService:Create(v, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Value = cf }):Play()
							task.delay(1, function() v:Destroy() end)
						end
					end
					anchor.CFrame = anchor.CFrame + away
					say(card.name .. "이(가) 놀라 달아났다! 천천히 다가가자.", 3)
				elseif not revealed and d < 20 then
					revealed = true
					silhouette(false)
				end
			end
		end
	end)

	return {
		form = form,
		onObserved = function()
			observed = true
			silhouette(false)
			-- 채집: 하나를 거둬 간다
			if form.method == "collect" and #models > 0 then
				local m = table.remove(models, 1)
				if m and m.Parent then
					if reduced then m:Destroy() else
						local start = m:GetScale()
						local v = Instance.new("NumberValue")
						v.Value = start
						v.Changed:Connect(function(x) if m.Parent then pcall(function() m:ScaleTo(math.max(0.01, x)) end) end end)
						TweenService:Create(v, TweenInfo.new(0.5), { Value = start * 0.05 }):Play()
						task.delay(0.55, function() v:Destroy(); if m.Parent then m:Destroy() end end)
					end
				end
			end
		end,
	}
end

return Stage
