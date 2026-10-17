-- 파일명: roblox-games/base/shared/Config.luau
-- 역할: 새 Roblox 게임이 공통으로 읽는 최소 실행 설정

local Config = {
    PolicySource = "company-learning/platform-release-roadmap.json",
    Platform = "ROBLOX",
    MobileFirst = true,
    SaveEnabled = false,
    MultiplayerEnabled = false,
}

return table.freeze(Config)
