-- 파일명: roblox-games/rpg-adventure/shared/Config.luau
-- 메인: 신규 3D RPG 규칙. 기존 게임/저장 키와 분리.
local Config = {
    PolicySource = "company-learning/platform-release-roadmap.json",
    Platform = "ROBLOX",
    GameId = "rpg-adventure",
    GameName = "모험 RPG",
    MobileFirst = true,
    SaveEnabled = true,
    MultiplayerEnabled = true,
    RemoteName = "RpgAction",
    SaveName = "rpg-adventure-v1",
    SaveVersion = 1,
    SaveInterval = 60,
    MaxLevel = 60,
    MaxWeapon = 15,
    TrainingBaseHealth = 80,
    TrainingBaseDamage = 6,
    MeleeRange = 12,
    AttackCooldown = 0.65,
    SkillCooldown = 5,
    GuardCooldown = 4,
    PotionCooldown = 3,
    RemoteRateLimit = 0.12,
    DefaultSave = {
        Level = 1, XP = 0, Gold = 0,
        Weapon = 1, Potions = 3, TrainingWins = 0,
        DuelWins = 0, QuestStage = 1,
    },
}
return table.freeze(Config)
