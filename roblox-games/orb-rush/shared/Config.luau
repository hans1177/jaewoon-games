-- Orb Rush shared gameplay configuration.
local Config = {
    GameId = "orb-rush",
    DisplayName = "Orb Rush",
    RoundSeconds = 90,
    IntermissionSeconds = 10,
    ResultSeconds = 6,
    ArenaHalfSize = 56,
    OrbTargetCount = 18,
    OrbRespawnSeconds = 0.35,
    OrbScore = 1,
    HazardDamage = 20,
    HazardCooldownSeconds = 1.0,
    MobileFirst = true,
    SaveEnabled = false,
    MultiplayerEnabled = true,
}

return table.freeze(Config)
