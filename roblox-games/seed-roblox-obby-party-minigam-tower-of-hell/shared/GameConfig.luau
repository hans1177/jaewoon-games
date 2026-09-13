local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = false,
  GameId = "seed-roblox-obby-party-minigam-tower-of-hell",
  GameName = "Skyline Sprint",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-5fe4e45e2f", Label = "obstacle, round, checkpoint, timing", Kind = "MOVEMENT", Order = 1 },
    { Id = "scope-coreloop-0-a308868121", Label = "Start a short timed round with a clear obstacle, movement, survival, or party objective that is readable within seconds on mobile controls.", Kind = "MOVEMENT", Order = 2 },
    { Id = "scope-coreloop-1-7a2dd10fe3", Label = "Jump, dodge, race, collect, or react through hazards while checkpoints, score, position, or remaining-time feedback shows immediate progress.", Kind = "MOVEMENT", Order = 3 },
    { Id = "scope-coreloop-2-c23e57ccd6", Label = "Finish or fail the round, receive score or cosmetic progression, then retry quickly or rotate into a different minigame pattern with minimal downtime.", Kind = "PROGRESSION", Order = 4 },
    { Id = "scope-mobileux-d4b46ab266", Label = "mobile", Kind = "MOBILE", Order = 5 },
  },
}

return table.freeze(Config)
