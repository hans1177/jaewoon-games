-- 파일명: roblox-games/daechung-rpg/shared/RPGMenu.luau
-- 임포트: 장비·퀘스트·파티의 서버 상태를 표시한다.
-- Responsive RPG menu; all progression comes from replicated state or real Tools.
local Model = require(script.Parent:WaitForChild("RPGMenuModel"))
local Input = game:GetService("UserInputService")
local GuiService = game:GetService("GuiService")
local Menu = {}
local colors = {base=Color3.fromRGB(19,23,29),panel=Color3.fromRGB(29,35,43),card=Color3.fromRGB(39,47,56),gold=Color3.fromRGB(232,193,120),text=Color3.fromRGB(240,237,225),muted=Color3.fromRGB(171,184,192)}

-- 유틸: 기존 메뉴 요소 생성.
local function make(class,parent,name,properties)
 local item=Instance.new(class);item.Name=name
 if item:IsA("GuiObject") and parent:IsA("GuiObject")then item.ZIndex=parent.ZIndex+1 end
 for key,value in pairs(properties or {})do item[key]=value end
 item.Parent=parent;return item
end
local function round(item,radius)
 make("UICorner",item,"Corner",{CornerRadius=UDim.new(0,radius or 10)})
end
local function label(parent,name,text,size)
 return make("TextLabel",parent,name,{BackgroundTransparency=1,Text=text,TextSize=size or 16,TextColor3=colors.text,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left,TextWrapped=true})
end
local function button(parent,name,text)
 local b=make("TextButton",parent,name,{Text=text,TextSize=16,Font=Enum.Font.GothamBold,TextColor3=colors.text,BackgroundColor3=colors.card,BorderSizePixel=0,AutoButtonColor=true,Size=UDim2.fromOffset(108,52)})
 round(b);return b
end

-- 메인: 메뉴와 입력·상태 갱신 연결.
function Menu.install(config,gui,player,options)
 options=options or {}
 local opened=false
 local activeTab="배낭"
 local category="전체"
 local selectedId=nil
 local selectedTool=nil
 local rows={}
 local itemButtons={}
 local itemRows={}
 local connections={}
 local toolConnections={}
 local previousSelection=nil
 local muted=false
 local originalVolumes=setmetatable({},{__mode="k"})
 local refresh
 local relayout
 local setOpen

 local tabNames={"배낭","장비","캐릭터","상점","퀘스트","파티","설정"}
 local toggle=button(gui,"RPGMenuToggle","배낭 · 메뉴")
 toggle.Position=UDim2.fromOffset(12,150);toggle.Size=UDim2.fromOffset(136,52)
 local overlay=make("Frame",gui,"RPGSystemMenu",{Visible=false,Active=true,BackgroundColor3=Color3.new(0,0,0),BackgroundTransparency=.28,Size=UDim2.fromScale(1,1),ZIndex=50})
 local panel=make("Frame",overlay,"MenuPanel",{AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),BackgroundColor3=colors.base,BorderSizePixel=0,ZIndex=51})
 round(panel,16)
 make("UIStroke",panel,"Outline",{Color=colors.gold,Transparency=.55,Thickness=1})
 local title=label(panel,"MenuTitle","모험가의 배낭",22);title.Font=Enum.Font.GothamBold;title.Position=UDim2.fromOffset(18,8);title.Size=UDim2.new(1,-88,0,30)
 local balance=label(panel,"MenuBalance","",13);balance.TextColor3=colors.gold;balance.Position=UDim2.fromOffset(18,39);balance.Size=UDim2.new(1,-88,0,20)
 local close=button(panel,"CloseMenu","×");close.Position=UDim2.new(1,-62,0,8);close.Size=UDim2.fromOffset(52,52)
 local tabs=make("ScrollingFrame",panel,"MenuTabs",{Position=UDim2.fromOffset(12,68),Size=UDim2.new(1,-24,0,58),BackgroundTransparency=1,BorderSizePixel=0,ScrollBarThickness=2,CanvasSize=UDim2.fromOffset(#tabNames*112,0),ScrollingDirection=Enum.ScrollingDirection.X})
 local tabButtons={}
 local body=make("Frame",panel,"MenuBody",{Position=UDim2.fromOffset(12,134),Size=UDim2.new(1,-24,1,-190),BackgroundTransparency=1})
 local footer=label(panel,"MenuFooter","",13);footer.TextColor3=colors.muted;footer.Position=UDim2.new(0,18,1,-48);footer.Size=UDim2.new(1,-36,0,40)
 local pages={}
 for _,name in ipairs(tabNames)do
  pages[name]=make(name=="배낭" and "ScrollingFrame" or "Frame",body,"Page"..name,{Size=UDim2.fromScale(1,1),BackgroundTransparency=1,Visible=false,BorderSizePixel=0})
 end

 local inventory=pages["배낭"]
 inventory.ScrollBarThickness=4;inventory.CanvasSize=UDim2.new()
 local search=make("TextBox",inventory,"ItemSearch",{PlaceholderText="아이템 이름 검색",Text="",ClearTextOnFocus=false,TextSize=16,TextColor3=colors.text,PlaceholderColor3=colors.muted,Font=Enum.Font.Gotham,BackgroundColor3=colors.panel,Size=UDim2.new(1,0,0,44),BorderSizePixel=0})
 round(search)
 local filters=make("Frame",inventory,"InventoryFilters",{BackgroundTransparency=1,Position=UDim2.fromOffset(0,50),Size=UDim2.new(1,0,0,52)})
 local filterButtons={}
 for index,name in ipairs({"전체","장비","도구"})do
  local b=button(filters,"Filter"..index,name);b.Position=UDim2.new((index-1)/3,2,0,0);b.Size=UDim2.new(1/3,-4,0,52)
  filterButtons[name]=b
  b.Activated:Connect(function()category=name;refresh()end)
 end
 local items=make("ScrollingFrame",inventory,"InventoryGrid",{Position=UDim2.fromOffset(0,112),BackgroundTransparency=1,BorderSizePixel=0,ScrollBarThickness=4,CanvasSize=UDim2.new(),AutomaticCanvasSize=Enum.AutomaticSize.Y})
 local grid=make("UIGridLayout",items,"ItemGridLayout",{CellPadding=UDim2.fromOffset(8,8),SortOrder=Enum.SortOrder.LayoutOrder})
 local empty=label(items,"EmptyInventory","표시할 아이템이 없어.",15);empty.Size=UDim2.fromOffset(140,110)
 local details=make("ScrollingFrame",inventory,"ItemDetails",{BackgroundColor3=colors.panel,BorderSizePixel=0,ScrollBarThickness=4,CanvasSize=UDim2.new(),AutomaticCanvasSize=Enum.AutomaticSize.Y});round(details)
 local detailTitle=label(details,"SelectedItemName","아이템을 선택해",19);detailTitle.Font=Enum.Font.GothamBold;detailTitle.Position=UDim2.fromOffset(14,14);detailTitle.Size=UDim2.new(1,-28,0,50)
 local detailText=label(details,"SelectedItemDescription","보유 장비와 실제 배낭 속 도구를 확인할 수 있어.",15);detailText.TextColor3=colors.muted;detailText.TextYAlignment=Enum.TextYAlignment.Top;detailText.Position=UDim2.fromOffset(14,72);detailText.Size=UDim2.new(1,-28,0,130)
 local itemAction=button(details,"ItemAction","착용 중");itemAction.Position=UDim2.fromOffset(14,218);itemAction.Size=UDim2.new(1,-28,0,52);itemAction.Visible=false
 local function selectItem(row)
  selectedId=row.id;selectedTool=row.tool
  detailTitle.Text=row.name..(row.tier and (" · T"..row.tier) or "")
  detailText.Text=row.description or "배낭에 보관 중인 도구야. 장착한 뒤 월드에서 사용할 수 있어."
  itemAction.Visible=true;itemAction.Active=row.tool~=nil;itemAction.AutoButtonColor=row.tool~=nil
  itemAction.Text=row.tool and (row.equipped and "장착 해제" or "장착") or "현재 착용 중"
  for id,b in pairs(itemButtons)do b.BackgroundColor3=id==row.id and Color3.fromRGB(73,65,48) or colors.card end
 end
 itemAction.Activated:Connect(function()
  if not selectedTool then return end
  local backpack=player:FindFirstChildOfClass("Backpack")
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health<=0 then return end
  if selectedTool.Parent==character then humanoid:UnequipTools()
  elseif backpack and selectedTool.Parent==backpack then humanoid:EquipTool(selectedTool)end
 end)

 local content={}
 for _,name in ipairs({"장비","캐릭터","상점","퀘스트","파티","설정"})do
  local scroll=make("ScrollingFrame",pages[name],"Content",{Size=UDim2.fromScale(1,1),BackgroundTransparency=1,BorderSizePixel=0,ScrollBarThickness=4,CanvasSize=UDim2.new(),AutomaticCanvasSize=Enum.AutomaticSize.Y})
  make("UIListLayout",scroll,"Rows",{Padding=UDim.new(0,12),SortOrder=Enum.SortOrder.LayoutOrder})
  content[name]=scroll
 end
 local equipmentText=label(content["장비"],"EquipmentSummary","",18);equipmentText.Size=UDim2.new(1,-8,0,230);equipmentText.TextYAlignment=Enum.TextYAlignment.Top
 local equipmentHint=label(content["장비"],"EquipmentHelp","장비 강화는 마을 상인에게서 진행해. 배낭의 장비를 누르면 적용 능력치를 볼 수 있어.",15);equipmentHint.Size=UDim2.new(1,-8,0,80);equipmentHint.TextColor3=colors.muted
 -- 캐릭터 및 상점: 표시 데이터는 서버 Player Attributes / 원본 GameConfig에서만 동기화한다.
 local characterText=label(content["캐릭터"],"CharacterSummary","",17)
 characterText.Size=UDim2.new(1,-8,0,300);characterText.TextYAlignment=Enum.TextYAlignment.Top
 local characterHint=label(content["캐릭터"],"CharacterSource","서버에서 확인된 직업·장비·경험치만 표시해.",14)
 characterHint.Size=UDim2.new(1,-8,0,52);characterHint.TextColor3=colors.muted
 local shopSummary=label(content["상점"],"ShopSummary","",16)
 shopSummary.Size=UDim2.new(1,-8,0,68);shopSummary.TextYAlignment=Enum.TextYAlignment.Top
 local weaponOffer=label(content["상점"],"WeaponOffer","",17);weaponOffer.Size=UDim2.new(1,-8,0,74)
 local buyWeapon=button(content["상점"],"BuyWeapon","다음 무기 구매");buyWeapon.Size=UDim2.new(1,-8,0,52)
 local armorOffer=label(content["상점"],"ArmorOffer","",17);armorOffer.Size=UDim2.new(1,-8,0,74)
 local buyArmor=button(content["상점"],"BuyArmor","다음 방어구 구매");buyArmor.Size=UDim2.new(1,-8,0,52)
 local saleNotice=label(content["상점"],"SaleNotice",
  "티어 장비 재판매 가격은 기존 규칙에 없어 판매할 수 없어.\n구매는 마을 상인 가까이에서 서버가 확인해.",14)
 saleNotice.Size=UDim2.new(1,-8,0,94);saleNotice.TextColor3=colors.muted
 buyWeapon.Activated:Connect(function()
  local offer=Model.shop(player:GetAttributes(),config).weapon
  if not opened or activeTab~="상점"or not offer.canBuy then return end
  if options.buyWeapon then options.buyWeapon()end
 end)
 buyArmor.Activated:Connect(function()
  local offer=Model.shop(player:GetAttributes(),config).armor
  if not opened or activeTab~="상점"or not offer.canBuy then return end
  if options.buyArmor then options.buyArmor()end
 end)
 local questTitle=label(content["퀘스트"],"QuestTitle","",22);questTitle.Size=UDim2.new(1,-8,0,48)
 local questText=label(content["퀘스트"],"QuestProgress","",18);questText.Size=UDim2.new(1,-8,0,140);questText.TextYAlignment=Enum.TextYAlignment.Top
 local track=button(content["퀘스트"],"TrackQuest","퀘스트 추적 켜기");track.Size=UDim2.new(1,-8,0,52)
 track.Activated:Connect(function()if options.trackQuest then options.trackQuest();setOpen(false)end end)
 local partyText=label(content["파티"],"PartySummary","",18);partyText.Size=UDim2.new(1,-8,0,100)
 local room=button(content["파티"],"ChangePartyCode","멀티 코드 변경");room.Size=UDim2.new(1,-8,0,52)
 room.Activated:Connect(function()if options.changeRoom then options.changeRoom()end end)
 local companions=label(content["파티"],"CompanionRoster","",16);companions.Size=UDim2.new(1,-8,0,0);companions.AutomaticSize=Enum.AutomaticSize.Y;companions.TextYAlignment=Enum.TextYAlignment.Top
 local soundButton=button(content["설정"],"ToggleMenuSound","효과음 켜짐");soundButton.Size=UDim2.new(1,-8,0,52)
 soundButton.Activated:Connect(function()
  muted=not muted
  for _,sound in ipairs(options.sounds or {})do
   if sound.Parent then originalVolumes[sound]=originalVolumes[sound] or sound.Volume;sound.Volume=muted and 0 or originalVolumes[sound]end
  end
  soundButton.Text=muted and "효과음 꺼짐" or "효과음 켜짐"
 end)
 local tips=button(content["설정"],"ToggleWorldTips","조작 안내 켜기 / 끄기");tips.Size=UDim2.new(1,-8,0,52)
 tips.Activated:Connect(function()if options.toggleTips then options.toggleTips()end end)
 local help=label(content["설정"],"MenuControls","B : 배낭 열기\n닫기 / Esc : 게임으로 돌아가기\n게임패드 Y : 메뉴 · B : 닫기\n\n메뉴를 열어도 게임은 계속돼. 안전한 장소에서 확인해.\n효과음 설정은 이번 접속 동안 유지돼.",16);help.Size=UDim2.new(1,-8,0,200);help.TextYAlignment=Enum.TextYAlignment.Top;help.TextColor3=colors.muted

 local function switchTab(name)
  activeTab=name
  for key,page in pairs(pages)do page.Visible=key==name end
  for key,b in pairs(tabButtons)do b.BackgroundColor3=key==name and Color3.fromRGB(82,67,44) or colors.card end
  title.Text=name=="배낭" and "모험가의 배낭" or name
 end
 for index,name in ipairs(tabNames)do
  local b=button(tabs,"Tab"..index,name);b.Position=UDim2.fromOffset((index-1)*112,0);tabButtons[name]=b
  b.Activated:Connect(function()switchTab(name);refresh()end)
 end

 refresh=function()
  if not opened then return end
  local a=player:GetAttributes()
  balance.Text=string.format("Lv.%d   ·   골드 %d",tonumber(a.Level) or 1,tonumber(a.Gold) or 0)
  footer.Text=tostring(a.LastAction or "월드에서 장비와 동료를 모아 모험을 이어가.")
  rows=Model.equipment(a,config)
  local backpack=player:FindFirstChildOfClass("Backpack")
  for _,container in pairs({backpack=backpack,character=player.Character})do
   for _,tool in ipairs(container:GetChildren())do
    if tool:IsA("Tool")then table.insert(rows,{id=tool,tool=tool,name=tool.Name,icon="T",category="도구",equipped=container==player.Character})end
   end
  end
  -- 같은 아이템 버튼은 유지해 상태 갱신 중 터치·게임패드 선택이 끊기지 않게 한다.
  local filtered=Model.filter(rows,category,search.Text)
  itemRows={}
  empty.Visible=#filtered==0
  local selection=nil
  local removedFocus=false
  for index,row in ipairs(filtered)do
   local id=row.id
   itemRows[id]=row
   local b=itemButtons[id]
   if not b then
    b=button(items,"InventorySlot"..index,"");itemButtons[id]=b
    local icon=label(b,"ItemIcon",row.icon,28);icon.Font=Enum.Font.GothamBold;icon.TextColor3=colors.gold;icon.TextXAlignment=Enum.TextXAlignment.Center;icon.Position=UDim2.fromOffset(4,6);icon.Size=UDim2.new(1,-8,0,36)
    local name=label(b,"ItemName",row.name,13);name.TextXAlignment=Enum.TextXAlignment.Center;name.Position=UDim2.fromOffset(4,45);name.Size=UDim2.new(1,-8,0,34)
    local badge=label(b,"ItemState","",11);badge.TextColor3=colors.gold;badge.TextXAlignment=Enum.TextXAlignment.Center;badge.Position=UDim2.fromOffset(4,82);badge.Size=UDim2.new(1,-8,0,18)
    b.Activated:Connect(function()
     local current=itemRows[id]
     if current then selectItem(current)end
    end)
   end
   b.Name="InventorySlot"..index;b.LayoutOrder=index
   b.ItemIcon.Text=row.icon;b.ItemName.Text=row.name
   b.ItemState.Text=row.equipped and "착용 중" or "도구"
   if id==selectedId then selection=row end
  end
  for id,b in pairs(itemButtons)do
   if not itemRows[id]then
    if GuiService.SelectedObject==b then removedFocus=true end
    b:Destroy();itemButtons[id]=nil
   end
  end
  for key,b in pairs(filterButtons)do b.BackgroundColor3=key==category and Color3.fromRGB(82,67,44) or colors.card end
  selection=selection or filtered[1]
  if selection then selectItem(selection)else selectedId=nil;selectedTool=nil;detailTitle.Text="아이템 없음";detailText.Text="검색어나 분류를 바꿔 봐. 없는 아이템은 표시되지 않아.";itemAction.Visible=false end
  if removedFocus then GuiService.SelectedObject=itemButtons[selectedId] or filterButtons[category]end
  local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if humanoid then a.CurrentHP=humanoid.Health end
  local character=Model.character(a,config)
  characterText.Text=string.format(
   "%s  ·  Lv.%d\n체력  %d / %d     공격력  %d\n경험치  %d     보유 골드  %d\n\n무기 T%d (기본 보너스 +%d)\n방어구 T%d (기본 보너스 +%d)\n유물  %s\n\n1차 전직  %s\n2차 전직  %s",
   character.className,character.level,character.hp,character.maxHp,character.attack,
   character.xp,character.gold,character.weaponTier,character.weaponBonus,
   character.armorTier,character.armorBonus,character.relic,
   character.advancement~=""and character.advancement or "없음",
   character.secondaryAdvancement~=""and character.secondaryAdvancement or "없음")
  local offers=Model.shop(a,config)
  shopSummary.Text=string.format("골드 %d    ·    %s\n무기·방어구 강화는 서버 상태와 즉시 동기화돼.",
   offers.gold,offers.inVillage and "마을 상인에게 가까이 가서 구매"or"상점 이용은 마을에서만 가능")
  weaponOffer.Text=offers.weapon.price and
   string.format("무기 T%d → T%d   ·   %dG",offers.weapon.tier,offers.weapon.nextTier,offers.weapon.price) or
   "무기 최고 티어 보유"
  armorOffer.Text=offers.armor.price and
   string.format("방어구 T%d → T%d   ·   %dG",offers.armor.tier,offers.armor.nextTier,offers.armor.price) or
   "방어구 최고 티어 보유"
  buyWeapon.Active=offers.weapon.canBuy
  buyArmor.Active=offers.armor.canBuy
  buyWeapon.AutoButtonColor=offers.weapon.canBuy
  buyArmor.AutoButtonColor=offers.armor.canBuy
  buyWeapon.Text=offers.weapon.canBuy and "다음 무기 구매"or"구매 불가 / 조건 미충족"
  buyArmor.Text=offers.armor.canBuy and "다음 방어구 구매"or"구매 불가 / 조건 미충족"
  local class=(config.Classes or {})[a.ClassId]
  equipmentText.Text=string.format("%s  ·  Lv.%d\n\n최대 체력  %d\n공격력  %d\n\n무기  T%d    방어구  T%d\n유물  %s",class and class.Name or "직업 미선택",a.Level or 1,a.MaxHP or 100,a.AttackPower or 0,a.WeaponTier or 0,a.ArmorTier or 0,a.RelicId=="NONE" and "비어 있음" or tostring(a.RelicId or "비어 있음"))
  local quest=Model.quest(a,config);questTitle.Text=quest.title;questText.Text=quest.text;track.Visible=quest.active
  local party=Model.partySummary(a,config)
  partyText.Text=string.format("편성 %d/%d  ·  동료 슬롯 %d/%d\n보스 동료 해금 %d/%d  ·  멀티 코드 %d\n사냥 %d/%d  ·  기여 %d",party.size,party.slots,party.companionCount,party.companionSlots,party.unlockedCount,party.totalBossCompanions,party.roomCode,party.huntKills,party.huntNeed,party.contribution)
  local roster={"보스 동료 도감 · 해금한 동료를 월드에서 두 번 터치해 편성"}
  for _,row in ipairs(Model.companions(a,config))do
   local zone=tonumber(row.zone)or 0
   if row.unlocked then
    table.insert(roster,string.format("● %s · %s · %d번 포탈\n기본 %s · 스킬 %s",tostring(row.name),tostring(row.role),zone,tostring(row.basic or"-"),tostring(row.skill or"-")))
   else
    table.insert(roster,string.format("○ %s · %s\n%d번 포탈 보스 첫 처치로 해금",tostring(row.name),tostring(row.role),zone))
   end
  end
  companions.Text=table.concat(roster,"\n\n")
  relayout()
 end

 relayout=function()
  local size=gui.AbsoluteSize
  local layout=Model.layout(size.X,size.Y)
  panel.Size=UDim2.fromOffset(layout.width,layout.height)
  local availableWidth=layout.width-30
  local availableHeight=math.max(350,layout.height-190)
  -- Short landscape screens scroll the complete inventory without shrinking touch targets.
  inventory.CanvasSize=UDim2.fromOffset(0,availableHeight)
  local split=layout.compact
  local listWidth=split and availableWidth or math.floor(availableWidth*.58)
  local listHeight=split and math.max(64,math.floor((availableHeight-120)*.5)) or math.max(64,availableHeight-112)
  items.Size=UDim2.fromOffset(listWidth,listHeight)
  grid.CellSize=UDim2.fromOffset(math.floor((listWidth-8*(layout.columns-1)-6)/layout.columns),106)
  details.Position=split and UDim2.fromOffset(0,120+listHeight) or UDim2.fromOffset(listWidth+12,112)
  details.Size=split and UDim2.fromOffset(availableWidth,availableHeight-120-listHeight) or UDim2.fromOffset(availableWidth-listWidth-12,availableHeight-112)
 end

 setOpen=function(value)
  if value==opened then return end
  if value and options.canOpen and not options.canOpen()then return end
  opened=value;overlay.Visible=value;gui:SetAttribute("RPGMenuOpen",value)
  if options.onOpen then options.onOpen(value)end
  if value then previousSelection=GuiService.SelectedObject;refresh();if Input.GamepadEnabled then GuiService.SelectedObject=tabButtons[activeTab]end
  else GuiService.SelectedObject=previousSelection and previousSelection.Parent and previousSelection or nil end
 end
 toggle.Activated:Connect(function()setOpen(not opened)end)
 close.Activated:Connect(function()setOpen(false)end)
 table.insert(connections,Input.InputBegan:Connect(function(input,processed)
  if Input:GetFocusedTextBox()then return end
  if opened and (input.KeyCode==Enum.KeyCode.Escape or input.KeyCode==Enum.KeyCode.ButtonB)then setOpen(false);return end
  if not processed and (input.KeyCode==Enum.KeyCode.B or input.KeyCode==Enum.KeyCode.ButtonY)then setOpen(not opened)end
 end))
 table.insert(connections,search:GetPropertyChangedSignal("Text"):Connect(refresh))
 table.insert(connections,gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(relayout))
 local pending=false
 local function scheduleRefresh()
  if pending or not opened then return end
  pending=true;task.defer(function()pending=false;if gui.Parent then refresh()end end)
 end
 local watched={Level=true,Gold=true,ClassId=true,MaxHP=true,AttackPower=true,WeaponTier=true,ArmorTier=true,RelicId=true,QuestPortal=true,QuestKills=true,QuestNeed=true,RoomCode=true,PartyCount=true,PartyKills=true,Contribution=true,UnlockedCompanions=true,CompanionUnlockCount=true,LastAction=true,CurrentZone=true,XP=true,AdvancementId=true,SecondAdvancementId=true}
 table.insert(connections,player.AttributeChanged:Connect(function(name)if watched[name]then scheduleRefresh()end end))
 local function watchTools()
  for _,c in ipairs(toolConnections)do c:Disconnect()end;toolConnections={}
  for _,container in pairs({backpack=player:FindFirstChildOfClass("Backpack"),character=player.Character})do
   table.insert(toolConnections,container.ChildAdded:Connect(scheduleRefresh));table.insert(toolConnections,container.ChildRemoved:Connect(scheduleRefresh))
  end
  local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if humanoid then table.insert(toolConnections,humanoid.HealthChanged:Connect(scheduleRefresh))end
  scheduleRefresh()
 end
 table.insert(connections,player.ChildAdded:Connect(function(child)if child:IsA("Backpack")then watchTools()end end))
 table.insert(connections,player.CharacterAdded:Connect(function()setOpen(false);watchTools()end))
 table.insert(connections,gui.Destroying:Connect(function()
  for _,c in ipairs(connections)do c:Disconnect()end
  for _,c in ipairs(toolConnections)do c:Disconnect()end
 end))
 switchTab(activeTab);watchTools();relayout()
 return {close=function()setOpen(false)end,isOpen=function()return opened end,button=toggle}
end

return Menu
