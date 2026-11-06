-- 파일명: RPGMenuModel.luau
-- 메인: 서버 소유 장비·퀘스트와 안전 영역 기준 화면 배치를 표시한다.
local Model = {}

function Model.layout(width, height)
 local w = math.min(960, math.max(1, width - 24))
 local h = math.min(680, math.max(1, height - 24))
 return {width=w, height=h, compact=w<660, columns=w<400 and 2 or w<660 and 3 or 4}
end

-- HUD: 한 안내 영역만 사용하고 기본 이동·점프 터치 영역을 비워 둔다.
function Model.hudLayout(width, height)
 local w=math.max(240,width);local h=math.max(240,height)
 local landscape=w>h and h<500
 local function box(x,y,bw,bh)return {x=x,y=y,width=bw,height=bh}end
 local noticeWidth=landscape and math.max(120,w-296)or math.min(480,w-16)
 local noticeX=landscape and 148 or (w-noticeWidth)/2
 local noticeY=landscape and 84 or 140
 return {
  landscape=landscape,
  stats=box(8,8,w-140,72),party=box(w-124,8,116,64),
  menu=box(8,landscape and 88 or 84,128,52),
  village=box(landscape and 8 or w-160,landscape and 148 or 84,landscape and 128 or 152,52),
  notice=box(noticeX,noticeY,noticeWidth,math.max(52,math.min(148,h-noticeY-(landscape and 16 or 232)))),
  combat=box(w-136,math.max(80,h-224),128,116),
  class=box((w-math.min(380,w-16))/2,(h-math.min(230,h-16))/2,math.min(380,w-16),math.min(230,h-16))
 }
end

function Model.hudMessage(menuOpen, classOpen, startupOpen, bossActive, speechActive, objectActive, tipsActive)
 if menuOpen or classOpen or startupOpen then return "NONE" end
 if bossActive then return "BOSS" end
 if speechActive then return "SPEECH" end
 if objectActive then return "OBJECT" end
 if tipsActive then return "TIPS" end
 return "OBJECTIVE"
end

function Model.equipment(attributes, config)
 local rows = {}
 local class = (config.Classes or {})[attributes.ClassId]
 local weapon = tonumber(attributes.WeaponTier)
 local armor = tonumber(attributes.ArmorTier)
 if weapon and weapon >= 1 then
  table.insert(rows, {id="Weapon", name=(class and class.Name or "기본").." 무기", category="장비", tier=weapon, icon="W",
   description="현재 착용 중인 무기\n추가 공격력 +"..tostring((config.WeaponBonus or {})[weapon] or 0).."\n\n마을 무기상인에게 다음 단계를 구매할 수 있어.", equipped=true})
 end
 if armor and armor >= 1 then
  table.insert(rows, {id="Armor", name="모험가 방어구", category="장비", tier=armor, icon="A",
   description="현재 착용 중인 방어구\n추가 최대 체력 +"..tostring((config.ArmorBonus or {})[armor] or 0).."\n\n마을 방어구상인에게 다음 단계를 구매할 수 있어.", equipped=true})
 end
 local relic = attributes.RelicId
 if typeof(relic)=="string" and relic~="" and relic~="NONE" then
  table.insert(rows, {id="Relic", name=relic, category="장비", tier=1, icon="R", description="보유한 유물\n현재 장비 슬롯에 적용 중이야.", equipped=true})
 end
 return rows
end

-- 캐릭터/매매창의 표시 상태는 복제된 서버 속성과 원본 GameConfig만 참조한다.
function Model.character(attributes,config)
 attributes=attributes or {};config=config or {}
 local class=(config.Classes or {})[attributes.ClassId]
 local weapon=math.max(0,math.floor(tonumber(attributes.WeaponTier)or 0))
 local armor=math.max(0,math.floor(tonumber(attributes.ArmorTier)or 0))
 return {
  className=class and class.Name or "직업 미선택",
  level=math.max(1,math.floor(tonumber(attributes.Level)or 1)),
  xp=math.max(0,tonumber(attributes.XP)or 0),
  gold=math.max(0,tonumber(attributes.Gold)or 0),
  hp=math.max(0,tonumber(attributes.CurrentHP)or 0),
  maxHp=math.max(1,tonumber(attributes.MaxHP)or config.BaseMaxHP or 100),
  attack=math.max(0,tonumber(attributes.AttackPower)or 0),
  weaponTier=weapon,armorTier=armor,
  weaponBonus=(config.WeaponBonus or {})[weapon]or 0,
  armorBonus=(config.ArmorBonus or {})[armor]or 0,
  advancement=tostring(attributes.AdvancementId or ""),
  secondaryAdvancement=tostring(attributes.SecondAdvancementId or ""),
  relic=attributes.RelicId=="NONE"and "없음"or tostring(attributes.RelicId or "없음"),
 }
end

-- 상점 표시만 담당한다. 실제 구매 가격·거리·재화 변경은 기존 서버 책임 함수에 남긴다.
function Model.shop(attributes,config,merchantAccess)
 attributes=attributes or {};config=config or {}
 local tierWeapon=math.floor(tonumber(attributes.WeaponTier)or 1)
 local tierArmor=math.floor(tonumber(attributes.ArmorTier)or 1)
 local gold=math.max(0,tonumber(attributes.Gold)or 0)
 local inVillage=(tonumber(attributes.CurrentZone)or 0)==0
 local function offer(tier,prices,nearMerchant)
  local maxTier=#prices
  local nextTier=math.min(maxTier,tier+1)
  local price=prices[tier+1]
  local canBuy=inVillage and nearMerchant and price~=nil and gold>=price
  return {tier=tier,nextTier=nextTier,maxTier=maxTier,price=price,canBuy=canBuy,nearMerchant=nearMerchant}
 end
 -- 호출자가 실측한 주변 상인을 알려주면 UI도 그 상태로 잠근다.
 -- 인자를 넘기지 않는 기존 메뉴/테스트 호출은 종전 표시 계약 그대로 유지한다.
 local weaponNearby=merchantAccess==nil or merchantAccess.weapon==true
 local armorNearby=merchantAccess==nil or merchantAccess.armor==true
 return {gold=gold,inVillage=inVillage,weapon=offer(tierWeapon,config.WeaponPrices or {},weaponNearby),
  armor=offer(tierArmor,config.ArmorPrices or {},armorNearby),sellSupported=false,
  proximityObserved=merchantAccess~=nil,source="SERVER_REPLICATED_EQUIPMENT_AND_CANONICAL_CATALOG"}
end

-- 유틸: 기존 장착순을 기본값으로 보존하고, 이름순은 화면 사본에만 적용한다.
function Model.filter(rows, category, query, sortByName)
 local result = {}
 query = string.lower(query or "")
 for _, row in ipairs(rows) do
  if (category=="전체" or category==row.category) and (query=="" or string.find(string.lower(row.name),query,1,true)) then
   table.insert(result,row)
  end
 end
 table.sort(result,function(a,b)
  if sortByName~=true and (a.equipped==true)~=(b.equipped==true) then return a.equipped==true end
  if a.name==b.name then return tostring(a.id)<tostring(b.id) end
  return a.name<b.name
 end)
 return result
end

function Model.quest(attributes, config)
 local portal = (config.Portals or {})[tonumber(attributes.QuestPortal) or 0]
 if not portal then return {active=false, title="새로운 모험", text="마을 이장에게 다가가 퀘스트를 받아.\n진행 중인 퀘스트가 여기에 표시돼.", ratio=0} end
 local need = math.max(1,tonumber(attributes.QuestNeed) or 1)
 local kills = math.max(0,tonumber(attributes.QuestKills) or 0)
 return {active=true, title=portal.Name.." 토벌", text=string.format("몬스터 처치  %d / %d\n\n%s",kills,need,kills>=need and "목표 달성! 마을 이장에게 돌아가 보상을 받아." or "마을 포탈을 통해 목표 지역으로 이동해."),ratio=math.clamp(kills/need,0,1)}
end

function Model.companions(attributes, config)
 local unlocked = {}
 for id in string.gmatch(tostring(attributes.UnlockedCompanions or ""),"[^,]+") do unlocked[id]=true end
 local rows = {}
 for _, companion in ipairs(config.BossCompanions or {}) do
  table.insert(rows,{
   id=companion.Id,
   name=companion.Name,
   role=companion.Role,
   zone=companion.Zone,
   basic=companion.Basic,
   skill=companion.Skill,
   trait=companion.Trait,
   unlocked=unlocked[companion.Id]==true,
  })
 end
 table.sort(rows,function(a,b)
  if a.unlocked~=b.unlocked then return a.unlocked end
  if (a.zone or 0)~=(b.zone or 0) then return (a.zone or 0)<(b.zone or 0) end
  return tostring(a.name)<tostring(b.name)
 end)
 return rows
end

function Model.partySummary(attributes, config)
 local slots=math.max(1,tonumber(config.PartySlots) or 4)
 local companionSlots=math.max(0,slots-1)
 local companionCount=math.clamp(tonumber(attributes.PartyCount) or 0,0,companionSlots)
 local companionRows=Model.companions(attributes,config)
 local unlockedCount=0
 for _,row in ipairs(companionRows)do if row.unlocked then unlockedCount+=1 end end
 return {
  size=companionCount+1,
  slots=slots,
  companionCount=companionCount,
  companionSlots=companionSlots,
  unlockedCount=unlockedCount,
  totalBossCompanions=#companionRows,
  huntKills=math.max(0,tonumber(attributes.PartyKills) or 0),
  huntNeed=math.max(1,tonumber(config.PartyHuntTarget) or 15),
  contribution=math.max(0,tonumber(attributes.Contribution) or 0),
  roomCode=tonumber(attributes.RoomCode) or 1,
 }
end

return Model
