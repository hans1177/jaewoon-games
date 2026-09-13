local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  GameId = "seed-roblox-simulator-tycoon-i-adopt-me",
  GameName = "Pocket Foundry",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-b56c774462", Label = "collect, upgrade, income, unlock", Kind = "PROGRESSION", Order = 1 },
    { Id = "scope-coreloop-0-3574de4c31", Label = "Perform a simple repeatable action to collect resources or income and immediately see production, inventory, or power increase.", Kind = "ECONOMY", Order = 2 },
    { Id = "scope-coreloop-1-886c0687be", Label = "Spend earned resources on upgrades, automation, helpers, or new production nodes that make the next earning cycle faster or strategically different.", Kind = "PROGRESSION", Order = 3 },
    { Id = "scope-coreloop-2-4cc22b4bf7", Label = "Unlock a new area, tier, collection target, or prestige layer, then repeat the earning loop with a larger goal and visible long-term progression.", Kind = "PROGRESSION", Order = 4 },
    { Id = "scope-mobileux-daeb36567f", Label = "None", Kind = "MOBILE", Order = 5 },
  },
}

return table.freeze(Config)
