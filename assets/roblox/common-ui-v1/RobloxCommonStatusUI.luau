-- 회사 공용 능력치/상태정보 UI. 값의 진실성/계산/게임플레이 권한은 게임 코드가 소유한다.
local M={}

local T=table.freeze({
  Panel=Color3.fromRGB(31,36,43),PanelRaised=Color3.fromRGB(44,51,61),PanelInset=Color3.fromRGB(21,25,30),
  Border=Color3.fromRGB(95,109,127),Text=Color3.fromRGB(240,243,247),Muted=Color3.fromRGB(173,181,192),
  Health=Color3.fromRGB(91,181,91),Shield=Color3.fromRGB(88,148,210),Stamina=Color3.fromRGB(207,177,74),
  Mana=Color3.fromRGB(108,116,220),Xp=Color3.fromRGB(176,111,218),Positive=Color3.fromRGB(91,181,120),
  Warning=Color3.fromRGB(224,170,69),Danger=Color3.fromRGB(214,82,76),Accent=Color3.fromRGB(108,174,225),
  Epic=Color3.fromRGB(155,105,214),Legendary=Color3.fromRGB(228,168,66),Corner=10
})

local function themeFor(o)local t={};for k,v in pairs(T)do t[k]=v end;for k,v in pairs(o or {})do if t[k]~=nil then t[k]=v end end;return t end
local function corner(p,n)local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,n or 8);x.Parent=p;return x end
local function stroke(p,c,n,a)local x=Instance.new("UIStroke");x.Color=c;x.Thickness=n or 1;x.Transparency=a or 0;x.Parent=p;return x end
local function tag(x,id,role)
  x:SetAttribute("StudioAssetId",id);x:SetAttribute("StudioAssetPack","roblox-common-ui-v1");x:SetAttribute("StudioAssetFamily","UI")
  x:SetAttribute("PresentationRole",role or id);x:SetAttribute("CompanyCommonBase",true);x:SetAttribute("GameplayAuthority",false)
  x:SetAttribute("ValueAuthority",false);x:SetAttribute("ProductionVerified",false);x:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end
local function label(p,n,txt,pos,size,c,sz,bold)
  local x=Instance.new("TextLabel");x.Name=n;x.Position=pos or UDim2.new();x.Size=size or UDim2.fromScale(1,1);x.BackgroundTransparency=1
  x.Text=tostring(txt or "");x.TextColor3=c;x.TextSize=sz or 12;x.TextWrapped=true;x.TextXAlignment=Enum.TextXAlignment.Left
  x.Font=bold and Enum.Font.GothamBold or Enum.Font.Gotham;x.Parent=p;return x
end
local function panel(name,size,t)
  local x=Instance.new("Frame");x.Name=name;x.Size=size;x.BackgroundColor3=t.Panel;x.BorderSizePixel=0;corner(x,12);stroke(x,t.Border,1,0.14);return x
end
local function bar(parent,name,position,size,color,ratio,t)
  local track=Instance.new("Frame");track.Name=name;track.Position=position;track.Size=size;track.BackgroundColor3=t.PanelInset;track.BorderSizePixel=0;track.Parent=parent;corner(track,999)
  local fill=Instance.new("Frame");fill.Name="Fill";fill.Size=UDim2.fromScale(math.clamp(tonumber(ratio) or 0,0,1),1);fill.BackgroundColor3=color;fill.BorderSizePixel=0;fill.Parent=track;corner(fill,999)
  return track,fill
end

function M.CreateResourceBar(options)
  options=options or {};local t=themeFor(options.theme);local kind=string.upper(tostring(options.kind or "HEALTH"))
  local colors={HEALTH=t.Health,SHIELD=t.Shield,STAMINA=t.Stamina,MANA=t.Mana,XP=t.Xp}
  local root=panel(options.name or (kind.."Bar"),options.size or UDim2.fromOffset(300,44),t);tag(root,"RESOURCE_BAR_"..kind,kind.."_RESOURCE_BAR")
  local title=label(root,"Label",options.label or kind,UDim2.fromOffset(10,3),UDim2.new(.46,0,0,18),t.Muted,10,true)
  local value=label(root,"Value",options.valueText or "",UDim2.new(.52,0,0,3),UDim2.new(.44,-10,0,18),t.Text,10,true);value.TextXAlignment=Enum.TextXAlignment.Right
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,25),UDim2.new(1,-20,0,10),colors[kind] or t.Accent,options.ratio,t)
  local c={}
  function c.SetRatio(v)fill.Size=UDim2.fromScale(math.clamp(tonumber(v) or 0,0,1),1)end
  function c.SetValueText(v)value.Text=tostring(v or "")end
  return root,c,title,value,track,fill
end

function M.CreateBossBar(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "BossBar",options.size or UDim2.new(.72,0,0,62),t);tag(root,"BOSS_BAR","BOSS_STATUS")
  local title=label(root,"Name",options.title or "",UDim2.fromOffset(12,4),UDim2.new(.65,0,0,22),t.Text,13,true)
  local phase=label(root,"Phase",options.phaseText or "",UDim2.new(.66,0,0,4),UDim2.new(.30,-12,0,22),t.Danger,10,true);phase.TextXAlignment=Enum.TextXAlignment.Right
  local track,fill=bar(root,"Health",UDim2.fromOffset(12,32),UDim2.new(1,-24,0,14),t.Danger,options.ratio,t)
  root:SetAttribute("OwnsBossHealth",false);root:SetAttribute("OwnsPhaseState",false)
  return root,title,phase,track,fill
end

function M.CreateStatRow(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "StatRow";root.Size=options.size or UDim2.new(1,0,0,34);root.BackgroundTransparency=1;tag(root,"STAT_ROW","STAT_VALUE")
  label(root,"Label",options.label or "",UDim2.new(),UDim2.new(.58,0,1,0),t.Muted,11,false)
  local value=label(root,"Value",options.valueText or "",UDim2.new(.58,0,0,0),UDim2.new(.42,0,1,0),t.Text,11,true);value.TextXAlignment=Enum.TextXAlignment.Right
  return root,value
end

function M.CreateStatDeltaRow(options)
  options=options or {};local t=themeFor(options.theme)
  local root,value=M.CreateStatRow(options);root.Name=options.name or "StatDeltaRow";tag(root,"STAT_DELTA_ROW","STAT_COMPARISON")
  local delta=tonumber(options.delta) or 0
  local deltaText=label(root,"Delta",(delta>0 and "+" or "")..tostring(options.deltaText or delta),UDim2.new(.72,0,0,0),UDim2.new(.28,0,1,0),delta>0 and t.Positive or delta<0 and t.Danger or t.Muted,10,true);deltaText.TextXAlignment=Enum.TextXAlignment.Right
  value.Size=UDim2.new(.18,0,1,0);value.Position=UDim2.new(.54,0,0,0)
  return root,value,deltaText
end

function M.CreateStatBar(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "StatBar",options.size or UDim2.new(1,0,0,52),t);tag(root,"STAT_BAR","STAT_BAR")
  label(root,"Label",options.label or "",UDim2.fromOffset(10,3),UDim2.new(.55,0,0,18),t.Muted,10,true)
  local value=label(root,"Value",options.valueText or "",UDim2.new(.6,0,0,3),UDim2.new(.35,-10,0,18),t.Text,10,true);value.TextXAlignment=Enum.TextXAlignment.Right
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,29),UDim2.new(1,-20,0,9),options.color or t.Accent,options.ratio,t)
  return root,value,track,fill
end

function M.CreateStatPips(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "StatPips";root.Size=options.size or UDim2.fromOffset(180,28);root.BackgroundTransparency=1;tag(root,"STAT_PIPS","STAT_PIPS")
  local count=math.clamp(tonumber(options.count) or 5,1,12);local value=math.clamp(tonumber(options.value) or 0,0,count);local pips={}
  for i=1,count do
    local p=Instance.new("Frame");p.Name="Pip"..i;p.Size=UDim2.new(1/count,-4,0,10);p.Position=UDim2.new((i-1)/count,2,0.5,-5);p.BackgroundColor3=i<=value and (options.color or t.Accent) or t.PanelInset;p.BorderSizePixel=0;p.Parent=root;corner(p,4);pips[i]=p
  end
  return root,pips
end

function M.CreateAttributeGrid(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "AttributeGrid",options.size or UDim2.fromOffset(360,260),t);tag(root,"ATTRIBUTE_GRID","ATTRIBUTE_GRID")
  local grid=Instance.new("UIGridLayout");grid.CellSize=options.cellSize or UDim2.fromOffset(160,54);grid.CellPadding=UDim2.fromOffset(8,8);grid.HorizontalAlignment=Enum.HorizontalAlignment.Center;grid.VerticalAlignment=Enum.VerticalAlignment.Top;grid.Parent=root
  local pad=Instance.new("UIPadding");pad.PaddingTop=UDim.new(0,10);pad.PaddingBottom=UDim.new(0,10);pad.PaddingLeft=UDim.new(0,10);pad.PaddingRight=UDim.new(0,10);pad.Parent=root
  local cards={}
  for i,row in ipairs(options.attributes or {})do
    local card=panel(tostring(row.id or i),UDim2.fromOffset(160,54),t);card.LayoutOrder=i;card.Parent=root
    label(card,"Label",row.label or row.id or "",UDim2.fromOffset(8,4),UDim2.new(1,-16,0,18),t.Muted,9,false)
    local v=label(card,"Value",row.value or "",UDim2.fromOffset(8,21),UDim2.new(1,-16,0,28),row.color or t.Text,15,true);v.TextXAlignment=Enum.TextXAlignment.Right
    cards[i]=card
  end
  return root,grid,cards
end

function M.CreateResistanceGrid(options)
  options=options or {};options.attributes=options.resistances or options.attributes or {}
  local root,grid,cards=M.CreateAttributeGrid(options);root.Name=options.name or "ResistanceGrid";tag(root,"RESISTANCE_GRID","RESISTANCE_GRID");return root,grid,cards
end

function M.CreateStatusEffectStack(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "StatusEffectStack";root.Size=options.size or UDim2.fromOffset(260,180);root.BackgroundTransparency=1;tag(root,"STATUS_EFFECT_STACK","STATUS_EFFECT_STACK")
  local list=Instance.new("UIListLayout");list.FillDirection=Enum.FillDirection.Vertical;list.SortOrder=Enum.SortOrder.LayoutOrder;list.Padding=UDim.new(0,5);list.Parent=root
  local rows={}
  for i,row in ipairs(options.effects or {})do
    local chip=panel(tostring(row.id or i),UDim2.new(1,0,0,38),t);chip.LayoutOrder=i;chip.Parent=root
    local marker=Instance.new("Frame");marker.Size=UDim2.fromOffset(5,24);marker.Position=UDim2.fromOffset(7,7);marker.BackgroundColor3=row.debuff and t.Danger or t.Positive;marker.BorderSizePixel=0;marker.Parent=chip;corner(marker,3)
    label(chip,"Label",row.label or row.id or "",UDim2.fromOffset(20,0),UDim2.new(.60,0,1,0),t.Text,10,true)
    local time=label(chip,"Time",row.timeText or "",UDim2.new(.68,0,0,0),UDim2.new(.28,-8,1,0),t.Muted,9,false);time.TextXAlignment=Enum.TextXAlignment.Right
    rows[i]=chip
  end
  root:SetAttribute("OwnsStatusState",false)
  return root,rows
end

function M.CreateCooldownIndicator(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "CooldownIndicator",options.size or UDim2.fromOffset(72,72),t);tag(root,"COOLDOWN_INDICATOR","COOLDOWN_STATUS")
  local icon=Instance.new("Frame");icon.Name="IconSlot";icon.AnchorPoint=Vector2.new(.5,.5);icon.Position=UDim2.fromScale(.5,.45);icon.Size=UDim2.fromOffset(34,34);icon.BackgroundColor3=t.PanelInset;icon.BorderSizePixel=0;icon.Parent=root;corner(icon,9)
  local text=label(root,"Time",options.timeText or "",UDim2.new(0,0,.67,0),UDim2.new(1,0,.28,0),t.Text,10,true);text.TextXAlignment=Enum.TextXAlignment.Center
  local shade=Instance.new("Frame");shade.Name="CooldownShade";shade.AnchorPoint=Vector2.new(0,1);shade.Position=UDim2.new(0,0,1,0);shade.Size=UDim2.fromScale(1,math.clamp(tonumber(options.ratio) or 0,0,1));shade.BackgroundColor3=t.PanelInset;shade.BackgroundTransparency=.18;shade.BorderSizePixel=0;shade.Parent=root;corner(shade,12)
  root:SetAttribute("OwnsCooldownState",false)
  return root,icon,text,shade
end

function M.CreateChargeMeter(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "ChargeMeter",options.size or UDim2.fromOffset(220,40),t);tag(root,"CHARGE_METER","CHARGE_STATUS")
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,15),UDim2.new(1,-20,0,10),options.color or t.Accent,options.ratio,t)
  root:SetAttribute("OwnsChargeState",false)
  return root,track,fill
end

function M.CreateConditionGauge(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "ConditionGauge",options.size or UDim2.fromOffset(240,48),t);tag(root,"CONDITION_GAUGE","CONDITION_STATUS")
  label(root,"Label",options.label or "",UDim2.fromOffset(10,3),UDim2.new(.58,0,0,18),t.Muted,10,true)
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,28),UDim2.new(1,-20,0,9),options.color or t.Warning,options.ratio,t)
  return root,track,fill
end

function M.CreateThreatIndicator(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "ThreatIndicator";root.Size=options.size or UDim2.fromOffset(84,84);root.BackgroundTransparency=1;tag(root,"THREAT_INDICATOR","THREAT_DIRECTION")
  local ring=Instance.new("Frame");ring.AnchorPoint=Vector2.new(.5,.5);ring.Position=UDim2.fromScale(.5,.5);ring.Size=UDim2.fromScale(.84,.84);ring.BackgroundTransparency=1;ring.Parent=root;corner(ring,999);stroke(ring,options.color or t.Danger,3,.18)
  local arrow=Instance.new("Frame");arrow.AnchorPoint=Vector2.new(.5,.5);arrow.Position=UDim2.fromScale(.5,.10);arrow.Size=UDim2.fromOffset(10,24);arrow.BackgroundColor3=options.color or t.Danger;arrow.BorderSizePixel=0;arrow.Rotation=tonumber(options.directionDegrees) or 0;arrow.Parent=root;corner(arrow,4)
  root:SetAttribute("OwnsThreatState",false);root:SetAttribute("OwnsDirectionState",false)
  return root,ring,arrow
end

function M.CreateComboMeter(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "ComboMeter",options.size or UDim2.fromOffset(180,84),t);tag(root,"COMBO_METER","COMBO_STATUS")
  local value=label(root,"Value",options.valueText or "0",UDim2.fromOffset(12,6),UDim2.new(.40,0,0,42),t.Accent,30,true)
  local rank=label(root,"Rank",options.rankText or "",UDim2.new(.46,0,0,9),UDim2.new(.48,-12,0,28),options.rankColor or t.Warning,18,true);rank.TextXAlignment=Enum.TextXAlignment.Right
  label(root,"Label",options.label or "COMBO",UDim2.fromOffset(12,52),UDim2.new(1,-24,0,20),t.Muted,9,true)
  root:SetAttribute("OwnsComboState",false)
  return root,value,rank
end

function M.CreateRarityBadge(options)
  options=options or {};local t=themeFor(options.theme);local rarity=string.upper(tostring(options.rarity or "COMMON"))
  local colors={COMMON=t.Muted,UNCOMMON=t.Positive,RARE=t.Accent,EPIC=t.Epic,LEGENDARY=t.Legendary}
  local root=Instance.new("TextLabel");root.Name=options.name or "RarityBadge";root.Size=options.size or UDim2.fromOffset(92,24);root.BackgroundColor3=colors[rarity] or t.Muted;root.BorderSizePixel=0;root.Text=options.text or rarity;root.TextColor3=t.Text;root.TextSize=9;root.Font=Enum.Font.GothamBold;root.TextXAlignment=Enum.TextXAlignment.Center;tag(root,"RARITY_BADGE","RARITY_PRESENTATION");corner(root,8)
  return root
end

function M.CreateItemDetailPanel(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "ItemDetailPanel",options.size or UDim2.fromOffset(360,420),t);tag(root,"ITEM_DETAIL_PANEL","ITEM_DETAIL")
  local visual=Instance.new("Frame");visual.Name="VisualSlot";visual.Position=UDim2.fromOffset(14,14);visual.Size=UDim2.new(1,-28,0,142);visual.BackgroundColor3=t.PanelInset;visual.BorderSizePixel=0;visual.Parent=root;corner(visual,12)
  label(root,"Title",options.title or "",UDim2.fromOffset(14,168),UDim2.new(1,-28,0,30),t.Text,17,true)
  label(root,"Type",options.typeText or "",UDim2.fromOffset(14,198),UDim2.new(1,-28,0,20),t.Accent,10,true)
  local stats=Instance.new("Frame");stats.Name="Stats";stats.Position=UDim2.fromOffset(14,228);stats.Size=UDim2.new(1,-28,0,112);stats.BackgroundTransparency=1;stats.Parent=root
  local detail=label(root,"Description",options.description or "",UDim2.fromOffset(14,344),UDim2.new(1,-28,1,-356),t.Muted,10,false);detail.TextYAlignment=Enum.TextYAlignment.Top
  root:SetAttribute("OwnsInventoryAuthority",false);root:SetAttribute("OwnsEquipAuthority",false)
  return root,visual,stats,detail
end

function M.CreateLoadoutCard(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "LoadoutCard",options.size or UDim2.fromOffset(240,110),t);tag(root,"LOADOUT_CARD","LOADOUT_SUMMARY")
  local icon=Instance.new("Frame");icon.Position=UDim2.fromOffset(10,10);icon.Size=UDim2.fromOffset(64,64);icon.BackgroundColor3=t.PanelInset;icon.BorderSizePixel=0;icon.Parent=root;corner(icon,10)
  label(root,"Title",options.title or "",UDim2.fromOffset(86,9),UDim2.new(1,-96,0,24),t.Text,12,true)
  label(root,"Detail",options.detail or "",UDim2.fromOffset(86,34),UDim2.new(1,-96,0,36),t.Muted,10,false)
  local state=label(root,"State",options.stateText or "",UDim2.fromOffset(10,82),UDim2.new(1,-20,0,20),t.Accent,9,true);state.TextXAlignment=Enum.TextXAlignment.Right
  root:SetAttribute("OwnsEquipAuthority",false)
  return root,icon,state
end

function M.CreateObjectiveStateChip(options)
  options=options or {};local t=themeFor(options.theme);local state=string.upper(tostring(options.state or "ACTIVE"))
  local colors={ACTIVE=t.Accent,COMPLETE=t.Positive,FAILED=t.Danger,LOCKED=t.Muted}
  local root=Instance.new("TextLabel");root.Name=options.name or "ObjectiveStateChip";root.Size=options.size or UDim2.fromOffset(86,24);root.BackgroundColor3=colors[state] or t.Accent;root.BorderSizePixel=0;root.Text=options.text or state;root.TextColor3=t.Text;root.TextSize=9;root.Font=Enum.Font.GothamBold;root.TextXAlignment=Enum.TextXAlignment.Center;tag(root,"OBJECTIVE_STATE_CHIP","OBJECTIVE_STATUS");corner(root,8);root:SetAttribute("OwnsQuestState",false);return root
end

function M.CreateReputationBar(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "ReputationBar",options.size or UDim2.fromOffset(300,54),t);tag(root,"REPUTATION_BAR","REPUTATION_STATUS")
  label(root,"Label",options.label or "",UDim2.fromOffset(10,4),UDim2.new(.62,0,0,18),t.Text,10,true)
  local rank=label(root,"Rank",options.rankText or "",UDim2.new(.64,0,0,4),UDim2.new(.32,-10,0,18),t.Accent,10,true);rank.TextXAlignment=Enum.TextXAlignment.Right
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,30),UDim2.new(1,-20,0,9),options.color or t.Accent,options.ratio,t)
  root:SetAttribute("OwnsReputationValue",false)
  return root,rank,track,fill
end

function M.CreateMilestoneProgress(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "MilestoneProgress",options.size or UDim2.fromOffset(340,76),t);tag(root,"MILESTONE_PROGRESS","PROGRESSION_MILESTONE")
  label(root,"Title",options.title or "",UDim2.fromOffset(10,5),UDim2.new(1,-20,0,22),t.Text,11,true)
  local track,fill=bar(root,"Track",UDim2.fromOffset(10,36),UDim2.new(1,-20,0,10),options.color or t.Accent,options.ratio,t)
  local detail=label(root,"Detail",options.detail or "",UDim2.fromOffset(10,51),UDim2.new(1,-20,0,18),t.Muted,9,false)
  root:SetAttribute("OwnsProgressionValue",false)
  return root,track,fill,detail
end

function M.CreateCurrencyBreakdown(options)
  options=options or {};local t=themeFor(options.theme)
  local root=panel(options.name or "CurrencyBreakdown",options.size or UDim2.fromOffset(280,120),t);tag(root,"CURRENCY_BREAKDOWN","CURRENCY_BREAKDOWN")
  local list=Instance.new("UIListLayout");list.FillDirection=Enum.FillDirection.Vertical;list.SortOrder=Enum.SortOrder.LayoutOrder;list.Padding=UDim.new(0,4);list.Parent=root
  local pad=Instance.new("UIPadding");pad.PaddingTop=UDim.new(0,8);pad.PaddingBottom=UDim.new(0,8);pad.PaddingLeft=UDim.new(0,10);pad.PaddingRight=UDim.new(0,10);pad.Parent=root
  local rows={}
  for i,row in ipairs(options.items or {})do
    local line=Instance.new("Frame");line.Name=tostring(row.id or i);line.Size=UDim2.new(1,0,0,28);line.BackgroundTransparency=1;line.LayoutOrder=i;line.Parent=root
    label(line,"Label",row.label or row.id or "",UDim2.new(),UDim2.new(.62,0,1,0),t.Muted,10,false)
    local v=label(line,"Value",row.value or "",UDim2.new(.62,0,0,0),UDim2.new(.38,0,1,0),row.color or t.Text,10,true);v.TextXAlignment=Enum.TextXAlignment.Right
    rows[i]=line
  end
  root:SetAttribute("OwnsEconomyValue",false)
  return root,rows
end

function M.Audit()
  return table.freeze({
    version=1,packId="roblox-common-ui-v1",componentCount=22,
    resourceKinds=table.freeze({"HEALTH","SHIELD","STAMINA","MANA","XP"}),
    statModes=table.freeze({"VALUE","DELTA","BAR","PIPS","GRID","RESISTANCE"}),
    statusModes=table.freeze({"EFFECT_STACK","COOLDOWN","CHARGE","CONDITION","THREAT","COMBO","RARITY","OBJECTIVE","REPUTATION","MILESTONE"}),
    colorOnlyMeaningForbidden=true,gameplayAuthority=false,valueAuthority=false,studioRequiredForInternalUse=false
  })
end

return table.freeze(M)
