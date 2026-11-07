-- RobloxCommonCombatStatus: 장비 특수 효과(치명·화염·독·출혈·빙결·기절·흡수)와 상태이상 지속 피해를 계산하는 공용 서버 모듈.
-- 순수 규칙만 담는다: 장비 목록·피해 적용·저장은 게임이 콜백으로 넘기므로 서버 권한은 그대로 게임 서버에 있다.
-- 마력숲에서 검증한 수치(상한 포함)를 기본값으로 쓰고, 게임별로 Options로 덮어쓸 수 있다.
-- 보강: ValidateEffectTable(효과표 검증) · Describe(한글 설명) · FilterByResist(상태 저항) · Purge(정화/사망 정리) · DefendRoll(회피·피해감소) · onStatus 콜백.
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
    if (profile.bossImmune and target.isBoss) or now < (target.frostCooldown or 0) then
      Combat.Notify(ctx, target, kind, "immune")
      return false
    end
    target.frostCooldown = now + profile.cooldown
    target.stunUntil = math.max(target.stunUntil or 0, now + profile.seconds)
    target.status.frost = now + profile.seconds
    target.model:SetAttribute("MeadowStatus", names.frost)
    Combat.Notify(ctx, target, kind, "apply")
    return true
  end
  local already = (target.status[kind] or 0) > now
  target.status[kind] = now + profile.seconds
  target.model:SetAttribute("MeadowStatus", names[kind])
  if already then
    Combat.Notify(ctx, target, kind, "refresh")
    return true
  end
  Combat.Notify(ctx, target, kind, "apply")
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

-- ───────── 보강 기능 ─────────

-- 효과표(effectTable) 검증: 알 수 없는 키·범위 밖 값·음수를 모아서 돌려준다(빈 배열이면 정상).
local KNOWN_KEYS = {crit = true, burn = true, poison = true, frost = true, bleed = true, stun = true, leech = true, dr = true, dodge = true}
function Combat.ValidateEffectTable(effectTable)
  local problems = {}
  for id, fx in pairs(effectTable or {}) do
    if type(fx) ~= "table" then
      problems[#problems + 1] = tostring(id) .. ": 효과가 표가 아님"
    else
      for key, value in pairs(fx) do
        if not KNOWN_KEYS[key] then
          problems[#problems + 1] = tostring(id) .. ": 알 수 없는 효과 '" .. tostring(key) .. "'"
        elseif type(value) ~= "number" or value < 0 or value > 1 then
          problems[#problems + 1] = tostring(id) .. "." .. key .. ": 0~1 사이 숫자여야 함 (" .. tostring(value) .. ")"
        end
      end
    end
  end
  table.sort(problems)
  return problems
end

local LABELS = {
  crit = "치명타", burn = "화염", poison = "독", frost = "빙결", bleed = "출혈",
  stun = "기절", leech = "생명 흡수", dr = "받는 피해 감소", dodge = "회피",
}
local LABEL_ORDER = {"crit", "burn", "poison", "frost", "bleed", "stun", "leech", "dr", "dodge"}

-- 효과표를 한글 한 줄 설명으로 만든다. 예) "치명타 5% · 화염 10%". 효과가 없으면 빈 문자열.
function Combat.Describe(fx)
  local parts = {}
  for _, key in ipairs(LABEL_ORDER) do
    local value = fx and fx[key]
    if value and value > 0 then
      parts[#parts + 1] = string.format("%s %d%%", LABELS[key], math.floor(value * 100 + .5))
    end
  end
  return table.concat(parts, " · ")
end

-- 대상의 상태 저항. target.resist = {burn=.5, ...}: 걸릴 확률에 (1 - 저항)을 곱해 다시 굴린다.
function Combat.ResistChance(target, kind)
  local resist = target and target.resist and target.resist[kind] or 0
  return math.clamp(1 - resist, 0, 1)
end

-- 저항을 반영해 상태이상 목록을 걸러낸다(RollHitEffects 결과 뒤에 호출).
function Combat.FilterByResist(statuses, target, random)
  random = random or math.random
  local kept = {}
  for _, kind in ipairs(statuses) do
    if random() <= Combat.ResistChance(target, kind) then kept[#kept + 1] = kind end
  end
  return kept
end

-- 모든 상태이상 제거(정화·사망·리스폰 정리용). 걸려 있던 종류 목록을 돌려준다.
function Combat.Purge(target)
  local removed = {}
  if target and target.status then
    for kind in pairs(target.status) do removed[#removed + 1] = kind end
    table.clear(target.status)
  end
  if target then
    target.frostCooldown = nil
    if target.model and target.model.Parent then target.model:SetAttribute("MeadowStatus", nil) end
  end
  table.sort(removed)
  return removed
end

-- 치명타 피해 배율을 적용한 값(정수). 배율 상한은 CAPS.critMultiplier.
function Combat.CritDamage(damage, caps)
  caps = caps or Combat.CAPS
  return math.floor(damage * caps.critMultiplier)
end

-- 받는 피해 감소(dr)·회피(dodge) 판정. 각각 상한이 있어 장비를 쌓아도 무적이 되지 않는다.
Combat.CAPS.dr = .3
Combat.CAPS.dodge = .2
function Combat.DefendRoll(fx, random, caps)
  caps = caps or Combat.CAPS
  random = random or math.random
  local dodgeChance = (fx and fx.dodge) or 0
  if dodgeChance > 0 and random() < math.min(caps.dodge, dodgeChance) then return {dodged = true, multiplier = 0} end
  local reduction = math.min(caps.dr, (fx and fx.dr) or 0)
  return {dodged = false, multiplier = 1 - reduction}
end

-- 받는 피해 감소만 필요할 때(난수 없음). 1 - min(상한, dr).
function Combat.DamageMultiplier(fx, caps)
  caps = caps or Combat.CAPS
  return 1 - math.min(caps.dr, (fx and fx.dr) or 0)
end

-- 상태 변화 알림(HUD·로그용). 게임이 ctx.onStatus(target, kind, "apply"|"refresh"|"resisted"|"immune")를 넘기면 호출된다.
function Combat.Notify(ctx, target, kind, event)
  if ctx and ctx.onStatus then pcall(ctx.onStatus, target, kind, event) end
end

return Combat
