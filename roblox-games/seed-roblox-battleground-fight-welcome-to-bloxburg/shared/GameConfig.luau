local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = false,
  GameId = "seed-roblox-battleground-fight-welcome-to-bloxburg",
  GameName = "Vector Clash",
  RemoteName = "GameAction",
  RateLimitSeconds = 0.10,
  InitialState = {
    Score = 0, Coins = 0, Level = 1, Progress = 0, Health = 100,
    Wave = 1, Position = 0, Objective = 0, Combo = 0, EnemyHealth = 100,
  },
  Actions = {
    { Id = "scope-corefun-ffd2fe2735", Label = "combat, opponent, skill, cooldown", Kind = "COMBAT", Order = 1 },
    { Id = "scope-coreloop-0-6f5fdb28ec", Label = "Enter a short competitive encounter, read opponent movement, and use movement, attacks, aim, abilities, or combos to create an advantage.", Kind = "COMBAT", Order = 2 },
    { Id = "scope-coreloop-1-1f5252bf24", Label = "Damage or eliminate opponents, receive clear hit and score feedback, then reposition around cooldowns, cover, objectives, or team pressure.", Kind = "COMBAT", Order = 3 },
    { Id = "scope-coreloop-2-910337c938", Label = "Complete the round or score target, receive progression or loadout rewards, and re-enter a new match with a changed tactical choice or mastery goal.", Kind = "PROGRESSION", Order = 4 },
    { Id = "scope-mobileux-055ea7b800", Label = "The game is designed to be played on mobile devices with a user-friendly interface that allows players to easily navigate and engage with the game.", Kind = "MOVEMENT", Order = 5 },
  },
}

return table.freeze(Config)
