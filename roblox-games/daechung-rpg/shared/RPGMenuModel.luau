-- Read-only presentation of the existing server-owned equipment and quest schema.
local Model = {}

function Model.layout(width, height)
 local w = math.min(960, math.max(240, width - 24))
 local h = math.min(680, math.max(240, height - 24))
 return {width=w, height=h, compact=w<660, columns=w<400 and 2 or w<660 and 3 or 4}
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

function Model.filter(rows, category, query)
 local result = {}
 query = string.lower(query or "")
 for _, row in ipairs(rows) do
  if (category=="전체" or category==row.category) and (query=="" or string.find(string.lower(row.name),query,1,true)) then
   table.insert(result,row)
  end
 end
 table.sort(result,function(a,b)
  if (a.equipped==true)~=(b.equipped==true) then return a.equipped==true end
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
  table.insert(rows,{name=companion.Name,role=companion.Role,unlocked=unlocked[companion.Id]==true})
 end
 return rows
end

return Model
