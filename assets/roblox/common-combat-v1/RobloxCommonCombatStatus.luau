-- RobloxCommonCombatStatus: 장비 특수 효과(치명·화염·독·출혈·빙결·기절·흡수)와 상태이상 지속 피해를 계산하는 공용 서버 모듈.
-- 순수 규칙만 담는다: 장비 목록·피해 적용·저장은 게임이 콜백으로 넘기므로 서버 권한은 그대로 게임 서버에 있다.
-- 마력숲에서 검증한 수치(상한 포함)를 기본값으로 쓰고, 게임별로 Options로 덮어쓸 수 있다.
-- 사용 예(서버):
--   local fx = Combat.SumEffects(Config.GearEffects, equippedIds)
--   local crit = Combat.RollCrit(fx)                       -- 피해 계산 전에
--   ...피해 적용...
--   local out = Combat.RollHitEffects(fx, {isBoss=target.isBoss, stunReady=(target.stunUntil or 0)<=now})
--   for _,kind in ipairs(out.statuses) do Combat.ApplyStatus(target, kind, ctx) end
local Combat = {}

Combat.STATUS_NAMES = {bleed = "출혈", poison = "독", burn = "화염", frost = "빙결"}

-- seconds: 지속 시간, tickRatio: 기준 피해 대비 틱 피해 비율(1초마다).
Combat.STATUS_PROFILES = {
  burn = {seconds = 5, tickRatio = .32},
  poison = {seconds = 6, tickRatio = .22},
  bleed = {seconds = 6, tickRatio = .26},
  frost = {seconds = .9, cooldown = 6, bossImmune = true}, -- 지속 피해 없이 짧은 기절
}

Combat.CAPS = {crit = .4, status = .6, stun = .25, leech = .15, critMultiplier = 1.5, stunSeconds = .8}

local STATUS_ORDER = {"burn", "poison", "frost", "bleed"}

-- 장비 id 목록에서 효과 합계를 만든다. effectTable[id] = {crit=.05, burn=.1, ...}
function Combat.SumEffects(effectTable, equippedIds)
  local sum = {}
  for _, id in ipairs(equippedIds or {}) do
    local fx = effectTable and effectTable[id]
    if fx then
      for key, value in pairs(fx) do sum[key] = (sum[key] or 0) + value end
    end
  end
  return sum
end

-- 치명타 판정. random 은 0~1 난수 함수(테스트용으로 교체 가능).
function Combat.RollCrit(fx, random, caps)
  caps = caps or Combat.CAPS
  random = random or math.random
  local chance = (fx and fx.crit) or 0
  if chance > 0 and random() < math.min(caps.crit, chance) then return true end
  return false
end

-- 명중 뒤 효과 판정: 상태이상 목록, 기절 여부, 흡수 비율.
function Combat.RollHitEffects(fx, options, random, caps)
  caps = caps or Combat.CAPS
  random = random or math.random
  options = options or {}
  local out = {statuses = {}, stun = false, leechRatio = 0}
  if not fx then return out end
  if not options.targetDead then
    for _, kind in ipairs(STATUS_ORDER) do
      local chance = fx[kind] or 0
      if chance > 0 and random() < math.min(caps.status, chance) then out.statuses[#out.statuses + 1] = kind end
    end
    local stunChance = fx.stun or 0
    if stunChance > 0 and not options.isBoss and options.stunReady ~= false and random() < math.min(caps.stun, stunChance) then
      out.stun = true
    end
  end
  local leech = fx.leech or 0
  if leech > 0 then out.leechRatio = math.min(caps.leech, leech) end
  return out
end

-- 상태이상 적용. target: {HP, model(Instance), isBoss, status, stunUntil, frostCooldown}
-- ctx: {now=os.clock(), spawn=task.spawn, wait=task.wait, tickBase=function(kind)->기준피해, dealTick=function(target,tick), names=선택}
function Combat.ApplyStatus(target, kind, ctx)
  if not target or target.HP <= 0 or not target.model or not target.model.Parent then return false end
  local profile = Combat.STATUS_PROFILES[kind]
  if not profile then return false end
  local names = ctx.names or Combat.STATUS_NAMES
  local now = ctx.now or os.clock()
  target.status = target.status or {}
  if kind == "frost" then
    if (profile.bossImmune and target.isBoss) or now < (target.frostCooldown or 0) then return false end
    target.frostCooldown = now + profile.cooldown
    target.stunUntil = math.max(target.stunUntil or 0, now + profile.seconds)
    target.status.frost = now + profile.seconds
    target.model:SetAttribute("MeadowStatus", names.frost)
    return true
  end
  local already = (target.status[kind] or 0) > now
  target.status[kind] = now + profile.seconds
  target.model:SetAttribute("MeadowStatus", names[kind])
  if already then return true end
  ctx.spawn(function()
    while target.HP > 0 and target.model.Parent and (target.status[kind] or 0) > os.clock() do
      ctx.wait(1)
      if target.HP <= 0 or not target.model.Parent then break end
      local tick = math.max(1, math.floor(ctx.tickBase(kind) * profile.tickRatio))
      ctx.dealTick(target, tick)
    end
    if target.model.Parent then target.model:SetAttribute("MeadowStatus", nil) end
  end)
  return true
end

-- 지금 걸려 있는 상태이상 수(연계 보너스 계산용).
function Combat.CountActive(target, now)
  local n = 0
  now = now or os.clock()
  if target and target.status then
    for _, untilTime in pairs(target.status) do if untilTime > now then n += 1 end end
  end
  return n
end

return Combat
