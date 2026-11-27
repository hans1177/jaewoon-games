-- [비주얼 래더 · 마을 분위기] Features.town 에 "mood" 가 켜지면, 경제 시뮬의 호황/불황에 맞춰 색조만 살짝 바꾼다.
-- 도형·모델을 만들지 않고 Lighting 의 ColorCorrectionEffect 만 쓴다. 표시 전용이며 판정·저장과 무관하다.
-- Game.client 가 마을을 그릴 때 workspace 속성 PortMood("boom"|"slump"|"steady")를 정한다.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local enabled = false
do
	local shared = ReplicatedStorage:WaitForChild("Shared", 10)
	local module = shared and shared:WaitForChild("VisualLadderState", 10)
	local ok, data = pcall(function() return require(module) end)
	if ok and typeof(data) == "table" and data.Features and data.Features.town then
		enabled = table.find(data.Features.town, "mood") ~= nil
	end
end
if not enabled then return end

local fx = Instance.new("ColorCorrectionEffect")
fx.Name = "TownMood"
fx.Parent = Lighting
local TARGET = {
	boom = { Saturation = 0.05, Brightness = 0.01, TintColor = Color3.fromRGB(255, 246, 228) },
	slump = { Saturation = -0.12, Brightness = -0.02, TintColor = Color3.fromRGB(226, 232, 244) },
	steady = { Saturation = 0, Brightness = 0, TintColor = Color3.fromRGB(255, 255, 255) },
}
local function apply()
	local m = workspace:GetAttribute("PortMood")
	local t = TARGET[m] or TARGET.steady
	TweenService:Create(fx, TweenInfo.new(1.5), t):Play()
end
workspace:GetAttributeChangedSignal("PortMood"):Connect(apply)
apply()
