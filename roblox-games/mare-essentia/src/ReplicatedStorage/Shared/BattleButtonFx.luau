--!nonstrict
-- BattleButtonFx.luau · 전투 버튼 누름·준비 효과 (2026-11-28 오너 지시: "전투 시 버튼 파티클 시각화 효과 좀 더 크고 확실하게")
-- 해상(NavalBattle)·지상(FieldScene) 공용. 버튼 안은 잘리므로(ClipsDescendants) 효과는 버튼과 같은 부모에
-- 겹쳐 띄운다. 판정·쿨타임·입력은 건드리지 않는 화면 효과만. 움직임 줄이기 설정이면 짧은 섬광만.
local TweenService = game:GetService("TweenService")
local GuiService = game:GetService("GuiService")
local AssetIds = require(script.Parent.AssetIds)

local Fx = {}

local function overlayFor(button)
	local parent = button.Parent
	if not parent then return nil end
	local o = Instance.new("Frame")
	o.Name = "BattleButtonFx"
	o.AnchorPoint = Vector2.new(0.5, 0.5)
	o.BackgroundTransparency = 1
	o.Active = false
	o.ZIndex = button.ZIndex + 8
	local abs, pos = button.AbsoluteSize, button.AbsolutePosition
	local pabs = parent:IsA("GuiObject") and parent.AbsolutePosition or Vector2.zero
	o.Position = UDim2.fromOffset(pos.X - pabs.X + abs.X / 2, pos.Y - pabs.Y + abs.Y / 2)
	o.Size = UDim2.fromOffset(abs.X, abs.Y)
	o.Parent = parent
	return o, math.max(abs.X, abs.Y)
end

local function ring(o, size, color, thickness, grow, dur, z)
	local art = AssetIds["CardArt/fx_button_ring"]
	local r = Instance.new(if art then "ImageLabel" else "Frame")
	r.AnchorPoint = Vector2.new(0.5, 0.5)
	r.Position = UDim2.fromScale(0.5, 0.5)
	r.Size = UDim2.fromOffset(size, size)
	r.BackgroundTransparency = 1
	r.ZIndex = z
	r.Parent = o
	if r:IsA("ImageLabel") then
		r.Image = "rbxassetid://" .. tostring(art)
		r.ImageColor3 = color
		r.ScaleType = Enum.ScaleType.Fit
		TweenService:Create(r, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(size * grow, size * grow), ImageTransparency = 1 }):Play()
		return
	end
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(1, 0)
	c.Parent = r
	local st = Instance.new("UIStroke")
	st.Color = color
	st.Thickness = thickness
	st.Parent = r
	TweenService:Create(r, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(size * grow, size * grow) }):Play()
	TweenService:Create(st, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Transparency = 1, Thickness = 0.5 }):Play()
end

local function sparks(o, size, color, count, dist, dur, z)
	local art = AssetIds["CardArt/fx_button_spark"]
	for i = 1, count do
		local a = (i / count) * math.pi * 2 + math.random() * 0.4
		local s = Instance.new(if art then "ImageLabel" else "Frame")
		s.AnchorPoint = Vector2.new(0.5, 0.5)
		s.Position = UDim2.fromScale(0.5, 0.5)
		local w = math.max(4, size * 0.07)
		s.Size = UDim2.fromOffset(w, w * 2.4)
		s.Rotation = math.deg(a) + 90
		s.BackgroundColor3 = color
		s.BorderSizePixel = 0
		s.ZIndex = z
		s.Parent = o
		local d = dist * (0.8 + math.random() * 0.4)
		if s:IsA("ImageLabel") then
			s.BackgroundTransparency = 1
			s.Image = "rbxassetid://" .. tostring(art)
			s.ImageColor3 = color
			s.ScaleType = Enum.ScaleType.Fit
			TweenService:Create(s, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = UDim2.new(0.5, math.cos(a) * d, 0.5, math.sin(a) * d),
				Size = UDim2.fromOffset(w * 0.4, w * 0.6),
				ImageTransparency = 1,
			}):Play()
		else
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(1, 0)
			c.Parent = s
			TweenService:Create(s, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = UDim2.new(0.5, math.cos(a) * d, 0.5, math.sin(a) * d),
				Size = UDim2.fromOffset(w * 0.4, w * 0.6),
				BackgroundTransparency = 1,
			}):Play()
		end
	end
end

-- 누를 때: 눌림(0.88) → 튀어나옴, 버튼 1.8배까지 퍼지는 충격 고리 두 겹, 사방 불꽃 12개, 가운데 섬광
function Fx.press(button, accent)
	if not (button and button.Parent) then return end
	accent = accent or Color3.fromRGB(255, 214, 110)
	local scale = button:FindFirstChild("BattleFxScale") or Instance.new("UIScale")
	scale.Name = "BattleFxScale"
	scale.Parent = button
	scale.Scale = 0.88
	TweenService:Create(scale, TweenInfo.new(0.28, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
	local o, size = overlayFor(button)
	if not o then return end
	local z = o.ZIndex
	local flash = Instance.new("Frame")
	flash.AnchorPoint = Vector2.new(0.5, 0.5)
	flash.Position = UDim2.fromScale(0.5, 0.5)
	flash.Size = UDim2.fromOffset(size * 0.9, size * 0.9)
	flash.BackgroundColor3 = Color3.new(1, 1, 1)
	flash.BackgroundTransparency = 0.25
	flash.ZIndex = z
	flash.Parent = o
	local fc = Instance.new("UICorner")
	fc.CornerRadius = UDim.new(1, 0)
	fc.Parent = flash
	TweenService:Create(flash, TweenInfo.new(0.22), { BackgroundTransparency = 1, Size = UDim2.fromOffset(size * 1.15, size * 1.15) }):Play()
	if not GuiService.ReducedMotionEnabled then
		ring(o, size * 0.95, accent, 6, 1.8, 0.38, z + 1)
		task.delay(0.07, function() if o.Parent then ring(o, size * 0.95, Color3.new(1, 1, 1), 3, 1.5, 0.3, z + 1) end end)
		sparks(o, size, accent, 12, size * 0.95, 0.42, z + 2)
	end
	task.delay(0.5, function() o:Destroy() end)
end

-- 다시 쓸 수 있게 됐을 때: 금빛 고리 3겹 + "준비!" 글자 튀어 오름
function Fx.ready(button, accent)
	if not (button and button.Parent) then return end
	accent = accent or Color3.fromRGB(255, 226, 120)
	local o, size = overlayFor(button)
	if not o then return end
	local z = o.ZIndex
	if not GuiService.ReducedMotionEnabled then
		for i = 0, 2 do
			task.delay(i * 0.09, function()
				if o.Parent then ring(o, size * 0.9, accent, 5 - i, 1.55 + i * 0.15, 0.45, z + 1) end
			end)
		end
		sparks(o, size, accent, 8, size * 0.75, 0.38, z + 2)
	end
	local t = Instance.new("TextLabel")
	t.AnchorPoint = Vector2.new(0.5, 1)
	t.Position = UDim2.new(0.5, 0, 0, 0)
	t.Size = UDim2.fromOffset(size * 1.2, 26)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.GothamBlack
	t.TextSize = 18
	t.TextColor3 = accent
	t.TextStrokeTransparency = 0.2
	t.Text = "준비!"
	t.ZIndex = z + 3
	t.Parent = o
	TweenService:Create(t, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = UDim2.new(0.5, 0, 0, -18), TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
	task.delay(0.65, function() o:Destroy() end)
end

-- 버튼에 한 번 붙이면 누를 때마다 효과
function Fx.attach(button, accent)
	if not button or button:GetAttribute("BattleFxAttached") then return end
	button:SetAttribute("BattleFxAttached", true)
	button.InputBegan:Connect(function(input)
		if (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1)
			and button.Active ~= false and button.Interactable ~= false then
			Fx.press(button, accent)
		end
	end)
end

return Fx
