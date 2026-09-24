-- 파일명: roblox-games/star-frontier/shared/GameConfig.luau
-- 역할: 별길 개척자 Roblox 공통 설정

local Config = {
    GameId = "star-frontier",
    GameName = "별길 개척자",
    GameNameEnglish = "Star Frontier",
    Platform = "ROBLOX",
    Genre = "우주 탐험 · 채굴 · 전투",
    PlayMode = "SHARED_WORLD",
    RemoteName = "StarFrontierRemote",
    SaveStoreName = "star-frontier-player-v1",
    SaveEnabled = true,
    MultiplayerEnabled = true,
    MobileFirst = true,

    World = {
        Bounds = 1500,
        StationDockRadius = 70,
        AsteroidCountPerSector = 16,
        DroneCountPerSector = 5,
        AsteroidRespawnSeconds = 18,
        DroneRespawnSeconds = 14,
        SectorCenters = {
            Vector3.new(0, 80, 0),
            Vector3.new(850, 160, -280),
            Vector3.new(-900, 240, 420),
        },
        SectorNames = {
            "청람 성역",
            "적동 운석대",
            "유령 성운",
        },
    },

    Ship = {
        BaseSpeed = 92,
        BoostMultiplier = 1.75,
        BoostDrainPerSecond = 24,
        EnergyRechargePerSecond = 16,
        BaseHull = 120,
        HullPerTier = 35,
        MaxEnergy = 100,
    },

    Mining = {
        Range = 155,
        BaseDamage = 28,
        CargoPerOre = 1,
        CargoBase = 30,
        CargoPerShipTier = 15,
    },

    Combat = {
        LaserRange = 230,
        LaserBaseDamage = 24,
        LaserDamagePerLevel = 8,
        DroneAttackRange = 82,
        DroneAttackCooldown = 2.4,
        DroneBaseDamage = 9,
    },

    Economy = {
        OreSellPrice = 6,
        ShipUpgradeCosts = {90, 220, 480},
        LaserUpgradeCosts = {70, 180, 390, 760},
        RepairCost = 24,
        DroneCreditReward = {16, 28, 45},
    },

    InitialState = {
        Credits = 0,
        Ore = 0,
        ShipTier = 1,
        LaserLevel = 1,
        Sector = 1,
    },

    ActionCooldowns = {
        CONTROL = 0.045,
        MINE = 0.24,
        FIRE = 0.22,
        SELL = 0.4,
        UPGRADE_SHIP = 0.4,
        UPGRADE_LASER = 0.4,
        REPAIR = 0.4,
    },
}

return table.freeze(Config)
