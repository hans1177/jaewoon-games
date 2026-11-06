-- 파일명: roblox-games/base/server/Main.server.luau
-- 역할: Roblox 서버 런타임 기본 진입점

local RunService = game:GetService("RunService")

local function markRuntime()
    game:SetAttribute("JaewoonPlatform", "ROBLOX")
    game:SetAttribute("JaewoonServerRuntime", true)
    game:SetAttribute("JaewoonStudioRuntime", RunService:IsStudio())
end

markRuntime()
