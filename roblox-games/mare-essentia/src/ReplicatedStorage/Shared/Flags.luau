--!nonstrict
-- 국가 국기: UI 도형만으로 그린 단순한 상징 (실제 국기의 간략화 표현이며 외부 이미지는 쓰지 않는다)
-- 도형: { x, y, w, h, 색 } 비율(0~1) 사각형, 원은 { "o", cx, cy, 지름비, 색 }

local W, R, B = Color3.fromRGB(240, 240, 236), Color3.fromRGB(190, 40, 50), Color3.fromRGB(40, 70, 150)

local FLAGS = {
	england = { { 0, 0, 1, 1, W }, { 0.42, 0, 0.16, 1, R }, { 0, 0.4, 1, 0.2, R } },
	netherlands = { { 0, 0, 1, 0.34, Color3.fromRGB(232, 124, 36) }, { 0, 0.33, 1, 0.34, W }, { 0, 0.66, 1, 0.34, B } },
	france = { { 0, 0, 0.34, 1, B }, { 0.33, 0, 0.34, 1, W }, { 0.66, 0, 0.34, 1, R } },
	portugal = { { 0, 0, 0.4, 1, Color3.fromRGB(30, 110, 60) }, { 0.4, 0, 0.6, 1, R }, { "o", 0.4, 0.5, 0.34, Color3.fromRGB(240, 200, 60) } },
	ottoman = { { 0, 0, 1, 1, Color3.fromRGB(176, 32, 56) }, { "o", 0.4, 0.5, 0.42, W }, { "o", 0.47, 0.5, 0.36, Color3.fromRGB(176, 32, 56) }, { "o", 0.66, 0.5, 0.12, W } },
	swahili = { { 0, 0, 1, 0.34, Color3.fromRGB(40, 150, 90) }, { 0, 0.33, 1, 0.34, Color3.fromRGB(240, 240, 236) }, { 0, 0.66, 1, 0.34, Color3.fromRGB(30, 50, 100) }, { "o", 0.5, 0.5, 0.26, R } },
	malabar = { { 0, 0, 1, 1, Color3.fromRGB(232, 164, 44) }, { 0, 0.7, 1, 0.3, Color3.fromRGB(50, 120, 70) }, { "o", 0.5, 0.38, 0.3, R } },
	japan = { { 0, 0, 1, 1, W }, { "o", 0.5, 0.5, 0.5, Color3.fromRGB(190, 30, 50) } },
	new_spain = { { 0, 0, 1, 1, W }, { "r", 0.5, 0.5, 1.25, 0.16, 35, R }, { "r", 0.5, 0.5, 1.25, 0.16, -35, R } },
	denmark = { { 0, 0, 1, 1, R }, { 0.28, 0, 0.14, 1, W }, { 0, 0.43, 1, 0.14, W } },
	sweden = { { 0, 0, 1, 1, Color3.fromRGB(0, 106, 167) }, { 0.3, 0, 0.14, 1, Color3.fromRGB(254, 204, 0) }, { 0, 0.43, 1, 0.14, Color3.fromRGB(254, 204, 0) } },
	china = { { 0, 0, 1, 1, Color3.fromRGB(240, 200, 60) }, { "o", 0.5, 0.5, 0.46, Color3.fromRGB(190, 40, 50) }, { "o", 0.5, 0.5, 0.22, Color3.fromRGB(240, 200, 60) } },
	spain = { { 0, 0, 1, 1, Color3.fromRGB(190, 40, 50) }, { 0, 0.25, 1, 0.5, Color3.fromRGB(240, 196, 52) } },
	korea = { { 0, 0, 1, 1, W }, { "o", 0.5, 0.5, 0.46, Color3.fromRGB(190, 40, 50) }, { "o", 0.5, 0.64, 0.22, Color3.fromRGB(40, 70, 150) }, { 0, 0.08, 0.14, 0.2, Color3.fromRGB(20, 20, 24) }, { 0.86, 0.72, 0.14, 0.2, Color3.fromRGB(20, 20, 24) } },
	venice = { { 0, 0, 1, 1, Color3.fromRGB(170, 30, 45) }, { 0, 0, 1, 0.08, Color3.fromRGB(226, 182, 92) }, { 0, 0.92, 1, 0.08, Color3.fromRGB(226, 182, 92) }, { "o", 0.5, 0.5, 0.42, Color3.fromRGB(226, 182, 92) }, { "o", 0.5, 0.5, 0.3, Color3.fromRGB(170, 30, 45) }, { "o", 0.5, 0.5, 0.12, Color3.fromRGB(226, 182, 92) } },
}
local FALLBACK = { { 0, 0, 1, 1, Color3.fromRGB(60, 80, 120) } }

local Flags = {}

function Flags.build(parent, nationId, w, h)
	local root = Instance.new("Frame")
	root.Name = "NationFlag"
	root.Size = UDim2.fromOffset(w, h)
	root.BackgroundColor3 = W
	root.BorderSizePixel = 0
	root.ClipsDescendants = true
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 6)
	c.Parent = root
	local st = Instance.new("UIStroke")
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = root
	for _, sh in FLAGS[nationId] or FALLBACK do
		local f = Instance.new("Frame")
		f.BorderSizePixel = 0
		if sh[1] == "r" then
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.fromScale(sh[2], sh[3])
			f.Size = UDim2.fromOffset(sh[4] * w, sh[5] * h)
			f.Rotation = sh[6]
			f.BackgroundColor3 = sh[7]
		elseif sh[1] == "o" then
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.fromScale(sh[2], sh[3])
			f.Size = UDim2.fromOffset(sh[4] * w, sh[4] * w)
			f.BackgroundColor3 = sh[5]
			local rc = Instance.new("UICorner")
			rc.CornerRadius = UDim.new(0.5, 0)
			rc.Parent = f
		else
			f.Position = UDim2.fromScale(sh[1], sh[2])
			f.Size = UDim2.fromScale(sh[3], sh[4])
			f.BackgroundColor3 = sh[5]
		end
		f.Parent = root
	end
	root.Parent = parent
	return root
end

Flags.Ids = FLAGS

return Flags
