-- 쿼터뷰 액션 전투장: 적을 R15 사람 모양으로 소환하고 ActionCombat 규칙으로 움직인다.
-- ModuleScript 이다. 어디서도 자동으로 부르지 않는다(화면 확인 전까지 게임 흐름에 연결하지 않음).
-- 사용: local Arena = require(script.Parent.ActionArena); Arena.start(player, CFrame.new(...), { "grunt", "grunt", "archer" })
-- 주의: Studio 에서 아직 확인하지 않았다(R15 소환, 걷기 애니메이션 id, 공격 예고 표시).
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local A = require(Shared:WaitForChild("ActionCombat"))

local Arena = {}

local COLORS = {
	grunt = Color3.fromRGB(150, 70, 55),
	archer = Color3.fromRGB(70, 110, 80),
	shield = Color3.fromRGB(80, 90, 130),
	boss = Color3.fromRGB(120, 60, 120),
}

-- R15 사람 모양을 만든다. HumanoidDescription 의 색만 바꿔서 종류를 구분한다.
local function buildR15(kind, def)
	local desc = Instance.new("HumanoidDescription")
	local c = COLORS[kind] or Color3.fromRGB(120, 120, 120)
	desc.HeadColor, desc.TorsoColor, desc.LeftArmColor, desc.RightArmColor, desc.LeftLegColor, desc.RightLegColor = c, c, c, c, c, c
	local ok, model = pcall(function()
		return Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	end)
	if not ok or not model then
		warn("R15 적 소환 실패: " .. tostring(model))
		return nil
	end
	model.Name = def.name
	local hum = model:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.MaxHealth = def.hp
		hum.Health = def.hp
		hum.WalkSpeed = def.speed
		hum.DisplayName = def.name
	end
	if def.boss then
		model:ScaleTo(2.2)
	end
	-- 공격 예고: 켜지면 몸 전체가 붉게 빛난다
	local hl = Instance.new("Highlight")
	hl.Name = "AttackAnticipation"
	hl.FillColor = if def.boss then Color3.fromRGB(238, 65, 65) else Color3.fromRGB(255, 185, 89)
	hl.FillTransparency = 0.6
	hl.OutlineTransparency = 0.1
	hl.Enabled = false
	hl.Parent = model
	return model
end

-- 적 한 무리를 소환한다. 반환: 정리 함수
function Arena.start(player, origin, kinds)
	local enemies = {}
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not root then return function() end end
	for i, kind in kinds do
		local def = A.Enemies[kind]
		if def then
			local model = buildR15(kind, def)
			if model then
				local angle = (i / #kinds) * math.pi * 2
				model:PivotTo(origin * CFrame.new(math.cos(angle) * 22, 3, math.sin(angle) * 22))
				model.Parent = workspace
				table.insert(enemies, { state = A.newEnemy(kind), model = model })
			end
		end
	end
	local conn
	conn = RunService.Heartbeat:Connect(function(dt)
		if not player.Parent or not root.Parent then
			conn:Disconnect()
			return
		end
		local now = os.clock()
		for _, en in enemies do
			local e, model = en.state, en.model
			local hum = model:FindFirstChildOfClass("Humanoid")
			local eroot = model:FindFirstChild("HumanoidRootPart")
			if e.dead or not hum or not eroot then
				continue
			end
			local dist = (eroot.Position - root.Position).Magnitude
			local event, hit = A.stepEnemy(e, dt, dist)
			local hl = model:FindFirstChild("AttackAnticipation")
			if hl then hl.Enabled = e.state == "windup" end
			if event == "strike" and hit then
				local pHum = char:FindFirstChildOfClass("Humanoid")
				if pHum then pHum:TakeDamage(e.def.dmg) end
			end
			local wish = A.moveWish(e, dist)
			if wish ~= 0 then
				local dir = (root.Position - eroot.Position) * Vector3.new(1, 0, 1)
				if dir.Magnitude > 0.1 then hum:Move(dir.Unit * wish) end
			else
				hum:Move(Vector3.zero)
			end
			-- 방향은 항상 주인공 쪽을 본다 (공격 중에는 고정)
			if e.state ~= "windup" and e.state ~= "active" then
				local look = Vector3.new(root.Position.X, eroot.Position.Y, root.Position.Z)
				if (look - eroot.Position).Magnitude > 0.1 then
					eroot.CFrame = CFrame.lookAt(eroot.Position, look)
				end
			end
		end
	end)
	return function()
		if conn then conn:Disconnect() end
		for _, en in enemies do en.model:Destroy() end
	end
end

-- 주인공이 쓴 동작을 맞은 적에게 적용한다. 반환: 맞은 적 수
function Arena.applyMove(player, enemies, moveId, mult, mv, now)
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not root then return 0 end
	local hits = 0
	for _, en in enemies do
		local eroot = en.model:FindFirstChild("HumanoidRootPart")
		if eroot and not en.state.dead then
			local to = eroot.Position - root.Position
			local dist = to.Magnitude
			local flat = Vector3.new(to.X, 0, to.Z)
			local angle = 0
			if flat.Magnitude > 0.01 then
				local look = Vector3.new(root.CFrame.LookVector.X, 0, root.CFrame.LookVector.Z)
				angle = math.deg(math.acos(math.clamp(look.Unit:Dot(flat.Unit), -1, 1)))
			end
			if A.inReach(mv.range, mv.arc, dist, angle) then
				-- 적이 주인공을 보고 있으면 앞에서 친 것
				local eLook = eroot.CFrame.LookVector
				local fromFront = eLook:Dot(-flat.Unit) > 0.3
				A.damageEnemy(en.state, 10, mult, fromFront, mv.stagger)
				hits += 1
				local hum = en.model:FindFirstChildOfClass("Humanoid")
				if hum then hum.Health = en.state.hp end
				if en.state.dead then en.model:Destroy() end
			end
		end
	end
	return hits
end

return Arena
