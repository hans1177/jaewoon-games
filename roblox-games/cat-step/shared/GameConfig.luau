-- 파일명: roblox-games/cat-step/shared/GameConfig.luau
-- 캣 스텝 공통 설정

-- 메인
local Config = {
    PolicySource = "company-learning/platform-release-roadmap.json",
    Platform = "ROBLOX",
    MobileFirst = true,

    GameId = "cat-step",
    GameName = "캣 스텝",
    GameNameEnglish = "Cat Step",
    Genre = "Arcade",
    PlayMode = "SOLO",
    SaveEnabled = false,

    Lanes = {
        0.22,
        0.50,
        0.78,
    },

    VisiblePlatforms = 8,
    PlatformBaseY = 0.70,
    PlatformGapY = 0.115,
    CatBaseY = 0.655,

    JumpDuration = 0.24,
    MinimumJumpDuration = 0.13,
    JumpDurationStep = 0.012,
    SpeedUpEvery = 10,

    Palette = {
        SkyTop = Color3.fromRGB(40, 49, 92),
        SkyBottom = Color3.fromRGB(110, 180, 210),
        Platform = Color3.fromRGB(72, 82, 104),
        PlatformTop = Color3.fromRGB(124, 212, 164),
        Milestone = Color3.fromRGB(250, 194, 82),
        Cat = Color3.fromRGB(247, 165, 76),
        CatDark = Color3.fromRGB(92, 61, 49),
        Text = Color3.fromRGB(255, 255, 255),
        ButtonLeft = Color3.fromRGB(71, 118, 201),
        ButtonRight = Color3.fromRGB(220, 102, 103),
        Overlay = Color3.fromRGB(16, 20, 31),
    },
}

return table.freeze(Config)
