local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  GameId = "seed-roblox-roleplay-life-avat-brookhaven-rp",
  GameName = "Harbor Days",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-351887f47a", Label = "roleplay, avatar, home, social", Kind = "OBJECTIVE", Order = 1 },
    { Id = "scope-coreloop-0-e539e1b5ee", Label = "Enter a shared social space, choose an avatar identity or role, and pick a short activity, location, or interaction goal with other players.", Kind = "OBJECTIVE", Order = 2 },
    { Id = "scope-coreloop-1-2dd38ea9a8", Label = "Perform roleplay activities, jobs, collection, customization, or social interactions that produce visible rewards and identity feedback.", Kind = "PROGRESSION", Order = 3 },
    { Id = "scope-coreloop-2-79f7ac8d9d", Label = "Use rewards to expand avatar, home, vehicle, or social expression options, then choose a new roleplay goal or group activity in the same persistent world.", Kind = "PROGRESSION", Order = 4 },
    { Id = "scope-mobileux-2a88f0b92e", Label = "Designed for Android, with a focus on low-friction social play and a realistic suburban setting", Kind = "MOBILE", Order = 5 },
  },
}

return table.freeze(Config)
