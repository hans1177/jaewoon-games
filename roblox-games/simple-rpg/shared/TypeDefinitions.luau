--!strict
-- 파일명: roblox-games/simple-rpg/shared/TypeDefinitions.luau
-- 공용 자료형 계약. 기존 서버 DataStore와 문명/연구 실제 필드는 변경하지 않는다.
local TypeDefinitions = {}

export type RaceInfo = {
  ID: number,
  Name: string,
  PassiveDescription: string,
  LandmarkName: string,
  SpecialResource: string,
  AttackMultiplier: number,
  DefenseBonus: number,
}

export type PlayerData = {
  RaceID: number,
  IsNewPlayer: boolean,
  TechProgress: {[number]: boolean},
  Inventory: {[string]: number},
  Level: number,
  Gold: number,
  Gem: number,
}

export type TechNode = {
  ID: number,
  Name: string,
  Era: string,
  Cost: number,
  EurekaCondition: string,
  Prerequisites: {number},
  StatBonus: {[string]: number},
}

return TypeDefinitions
