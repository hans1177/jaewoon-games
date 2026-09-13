local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  GameId = "seed-roblox-story-rpg-adventur-blox-fruits",
  GameName = "Shardbound Odyssey",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-afb3aa364d", Label = "quest,explore,combat,boss", Kind = "COMBAT", Order = 1 },
    { Id = "scope-coreloop-0-512fbeed03", Label = "Accept a quest or story objective, travel through a Roblox world area, and discover enemies, NPCs, resources, or events that advance the current adventure goal.", Kind = "MOVEMENT", Order = 2 },
    { Id = "scope-coreloop-1-fee638072f", Label = "Fight enemies or bosses using readable skills and equipment, gain experience and loot, and make a progression choice that changes the next combat approach.", Kind = "COMBAT", Order = 3 },
    { Id = "scope-coreloop-2-d36d57e8a3", Label = "Complete the quest or major encounter, unlock a new area or story beat, and continue toward a larger adventure milestone while preserving persistent character growth.", Kind = "PROGRESSION", Order = 4 },
    { Id = "scope-mobileux-a6b8e71cfe", Label = "asciicase", Kind = "MOBILE", Order = 5 },
  },
}

return table.freeze(Config)
