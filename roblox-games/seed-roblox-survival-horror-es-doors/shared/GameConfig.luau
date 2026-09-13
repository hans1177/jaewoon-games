local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = false,
  GameId = "seed-roblox-survival-horror-es-doors",
  GameName = "Last Lantern",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-39c5729957", Label = "Survive and Threat while utilizing its own world, visual identity, progression, economy, content, and interaction design.", Kind = "PROGRESSION", Order = 1 },
    { Id = "scope-coreloop-0-aec334dee8", Label = "Enter a dangerous area with limited information, identify the current threat, and search for a route, key item, resource, or safe checkpoint.", Kind = "MOVEMENT", Order = 2 },
    { Id = "scope-coreloop-1-b019bdc099", Label = "Avoid, outplay, or temporarily resist the threat while managing resources and cooperating with nearby players when teamwork is available.", Kind = "ECONOMY", Order = 3 },
    { Id = "scope-coreloop-2-fa285598a5", Label = "Reach a checkpoint or escape condition, convert survival progress into unlocks or knowledge, and attempt a harder segment with new threat patterns.", Kind = "MOVEMENT", Order = 4 },
    { Id = "scope-mobileux-7cfa90daaa", Label = "The game will be designed with mobile play in mind, with a focus on touch-screen controls and responsive gameplay. The game will be playable on a wide range of mobile devices. The", Kind = "MOBILE", Order = 5 },
  },
}

return table.freeze(Config)
