-- 파일명: roblox-games/base/client/Main.client.luau
-- 역할: Roblox 클라이언트 런타임 기본 진입점

local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
if player then
    player:SetAttribute("JaewoonTouchEnabled", UserInputService.TouchEnabled)
end
