-- 회사 공용 UI 컨트롤. 시각/상태 피드백만 소유하고 실제 행동 권한은 게임 코드가 소유한다.
local M={}

local THEME=table.freeze({
  Panel=Color3.fromRGB(31,36,43),PanelRaised=Color3.fromRGB(44,51,61),PanelInset=Color3.fromRGB(21,25,30),
  Border=Color3.fromRGB(95,109,127),BorderBright=Color3.fromRGB(145,158,176),Text=Color3.fromRGB(240,243,247),
  Muted=Color3.fromRGB(173,181,192),Primary=Color3.fromRGB(76,120,183),PrimaryBright=Color3.fromRGB(108,174,225),
  Positive=Color3.fromRGB(91,181,120),Warning=Color3.fromRGB(224,170,69),Danger=Color3.fromRGB(214,82,76),
  Shadow=Color3.fromRGB(8,10,13),Corner=12,TouchHeight=48
})

local function themeFor(overrides)
  local t={}
  for k,v in pairs(THEME) do t[k]=v end
  for k,v in pairs(overrides or {}) do if t[k]~=nil then t[k]=v end end
  return t
end
local function corner(p,n)local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,n or 10);x.Parent=p;return x end
local function stroke(p,c,n,a)local x=Instance.new("UIStroke");x.Color=c;x.Thickness=n or 1;x.Transparency=a or 0;x.Parent=p;return x end
local function tag(x,id,role)
  x:SetAttribute("StudioAssetId",id);x:SetAttribute("StudioAssetPack","roblox-common-ui-v1");x:SetAttribute("StudioAssetFamily","UI")
  x:SetAttribute("PresentationRole",role or id);x:SetAttribute("CompanyCommonBase",true);x:SetAttribute("GameplayAuthority",false)
  x:SetAttribute("InputAuthority",false);x:SetAttribute("ProductionVerified",false);x:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end
local function label(p,n,txt,pos,size,c,sz,bold)
  local x=Instance.new("TextLabel");x.Name=n;x.Position=pos or UDim2.new();x.Size=size or UDim2.fromScale(1,1);x.BackgroundTransparency=1
  x.Text=tostring(txt or "");x.TextColor3=c;x.TextSize=sz or 13;x.TextWrapped=true;x.TextXAlignment=Enum.TextXAlignment.Left
  x.Font=bold and Enum.Font.GothamBold or Enum.Font.Gotham;x.Parent=p;return x
end
local function baseButton(options,id,role)
  options=options or {};local t=themeFor(options.theme)
  local x=Instance.new("TextButton");x.Name=options.name or id;x.Size=options.size or UDim2.fromOffset(180,48);x.BorderSizePixel=0
  x.AutoButtonColor=false;x.Selectable=true;x.Text=tostring(options.text or "");x.TextSize=options.textSize or 14;x.Font=Enum.Font.GothamBold
  x.TextColor3=t.Text;tag(x,id,role);corner(x,options.cornerRadius or t.Corner);local outline=stroke(x,t.Border,1.2,0.12)
  local state="DEFAULT"
  local function apply(nextState)
    state=string.upper(tostring(nextState or "DEFAULT"));x:SetAttribute("VisualState",state)
    local variant=string.upper(tostring(options.variant or "PRIMARY"))
    local bg=t.Primary
    if variant=="SECONDARY" then bg=t.PanelRaised
    elseif variant=="GHOST" then bg=t.PanelInset
    elseif variant=="DANGER" then bg=t.Danger
    elseif variant=="SUCCESS" then bg=t.Positive
    elseif variant=="WARNING" then bg=t.Warning end
    x.BackgroundColor3=bg
    x.BackgroundTransparency=variant=="GHOST" and 0.35 or 0
    x.TextColor3=(state=="DISABLED" or state=="LOCKED") and t.Muted or t.Text
    outline.Color=(state=="FOCUSED" or state=="SELECTED") and t.PrimaryBright or t.Border
    outline.Thickness=(state=="FOCUSED" or state=="SELECTED") and 2 or 1.2
    x.BackgroundTransparency=(state=="DISABLED" or state=="LOCKED") and 0.45 or x.BackgroundTransparency
    x.Position=state=="PRESSED" and UDim2.new(x.Position.X.Scale,x.Position.X.Offset,x.Position.Y.Scale,x.Position.Y.Offset+1) or x.Position
  end
  local controller={}
  function controller.SetState(v) apply(v) end
  function controller.GetState() return state end
  apply(options.state)
  x:SetAttribute("OwnsActionAuthority",false)
  return x,controller,t
end

function M.CreateActionButton(options)
  local x,c=baseButton(options,"ACTION_BUTTON","ACTION_BUTTON")
  return x,c
end

function M.CreateIconLabelButton(options)
  options=options or {}
  local x,c,t=baseButton(options,"ICON_LABEL_BUTTON","ICON_LABEL_ACTION")
  x.Text=""
  local icon=Instance.new("Frame");icon.Name="IconSlot";icon.Position=UDim2.fromOffset(10,8);icon.Size=UDim2.fromOffset(32,32);icon.BackgroundColor3=t.PanelInset;icon.BorderSizePixel=0;icon.Parent=x;corner(icon,8)
  local text=label(x,"Label",options.text or "",UDim2.fromOffset(52,0),UDim2.new(1,-62,1,0),t.Text,13,true)
  return x,c,icon,text
end

function M.CreateHoldActionButton(options)
  options=options or {}
  local x,c,t=baseButton(options,"HOLD_ACTION_BUTTON","HOLD_ACTION")
  local track=Instance.new("Frame");track.Name="HoldTrack";track.AnchorPoint=Vector2.new(0,1);track.Position=UDim2.new(0,0,1,0);track.Size=UDim2.new(1,0,0,4);track.BackgroundColor3=t.PanelInset;track.BorderSizePixel=0;track.Parent=x
  local fill=Instance.new("Frame");fill.Name="Fill";fill.Size=UDim2.fromScale(0,1);fill.BackgroundColor3=t.PrimaryBright;fill.BorderSizePixel=0;fill.Parent=track
  local oldSetState=c.SetState
  function c.SetProgress(v)fill.Size=UDim2.fromScale(math.clamp(tonumber(v) or 0,0,1),1)end
  function c.SetState(v)oldSetState(v)end
  x:SetAttribute("OwnsHoldCompletion",false)
  return x,c
end

function M.CreateSplitActionButton(options)
  options=options or {}
  local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SplitActionButton";root.Size=options.size or UDim2.fromOffset(220,48);root.BackgroundTransparency=1;tag(root,"SPLIT_ACTION_BUTTON","SPLIT_ACTION")
  local main=M.CreateActionButton({name="Main",text=options.text or "",variant=options.variant or "PRIMARY",theme=t,size=UDim2.new(1,-50,1,0)})
  main.Parent=root
  local more=M.CreateActionButton({name="More",text=options.moreText or "⋯",variant=options.variant or "SECONDARY",theme=t,size=UDim2.fromOffset(46,48)})
  more.AnchorPoint=Vector2.new(1,0);more.Position=UDim2.new(1,0,0,0);more.Parent=root
  root:SetAttribute("OwnsActionAuthority",false)
  return root,main,more
end

function M.CreateSegmentedControl(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SegmentedControl";root.Size=options.size or UDim2.fromOffset(360,46);root.BackgroundColor3=t.PanelInset;root.BorderSizePixel=0;tag(root,"SEGMENTED_CONTROL","SEGMENTED_SELECTION");corner(root,12);stroke(root,t.Border,1,0.15)
  local layout=Instance.new("UIListLayout");layout.FillDirection=Enum.FillDirection.Horizontal;layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Padding=UDim.new(0,4);layout.Parent=root
  local items=options.items or {};local buttons={}
  for i,row in ipairs(items)do
    local b=M.CreateActionButton({name=tostring(row.id or i),text=row.label or row.id or "",variant="GHOST",theme=t,size=UDim2.new(1/math.max(1,#items),-4,1,0)})
    b.LayoutOrder=i;b.Parent=root;b:SetAttribute("SegmentId",tostring(row.id or i));b:SetAttribute("OwnsSelectionState",false);buttons[i]=b
  end
  return root,buttons
end

function M.CreateTabPill(options)
  options=options or {};options.variant=options.variant or "GHOST"
  local x,c=baseButton(options,"TAB_PILL","TAB_SELECTION")
  x:SetAttribute("OwnsTabState",false)
  return x,c
end

function M.CreateFilterChip(options)
  options=options or {};local t=themeFor(options.theme)
  local x,c=baseButton({name=options.name,text=options.text,variant="GHOST",theme=t,size=options.size or UDim2.fromOffset(110,36),textSize=11,state=options.state},"FILTER_CHIP","FILTER_CHIP")
  x:SetAttribute("FilterId",tostring(options.filterId or ""));x:SetAttribute("OwnsFilterState",false)
  return x,c
end

function M.CreateToggleChip(options)
  options=options or {};local t=themeFor(options.theme)
  local x,c=M.CreateFilterChip(options);x.Name=options.name or "ToggleChip";tag(x,"TOGGLE_CHIP","TOGGLE_CHIP")
  local indicator=Instance.new("Frame");indicator.Name="Indicator";indicator.Size=UDim2.fromOffset(8,8);indicator.Position=UDim2.fromOffset(8,14);indicator.BackgroundColor3=options.enabled and t.Positive or t.Muted;indicator.BorderSizePixel=0;indicator.Parent=x;corner(indicator,4)
  x:SetAttribute("OwnsToggleState",false)
  return x,c,indicator
end

function M.CreateContextActionRow(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("TextButton");root.Name=options.name or "ContextActionRow";root.Size=options.size or UDim2.new(1,0,0,56);root.BackgroundColor3=t.PanelRaised;root.BorderSizePixel=0;root.AutoButtonColor=false;root.Text="";root.Selectable=true;tag(root,"CONTEXT_ACTION_ROW","CONTEXT_ACTION");corner(root,10);stroke(root,t.Border,1,0.14)
  local icon=Instance.new("Frame");icon.Name="IconSlot";icon.Position=UDim2.fromOffset(10,10);icon.Size=UDim2.fromOffset(36,36);icon.BackgroundColor3=t.PanelInset;icon.BorderSizePixel=0;icon.Parent=root;corner(icon,9)
  label(root,"Title",options.title or "",UDim2.fromOffset(56,5),UDim2.new(1,-126,0,24),t.Text,12,true)
  label(root,"Detail",options.detail or "",UDim2.fromOffset(56,28),UDim2.new(1,-126,0,20),t.Muted,10,false)
  local key=label(root,"InputHint",options.inputHint or "",UDim2.new(1,-64,0,0),UDim2.fromOffset(52,56),t.AccentBright,11,true);key.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("OwnsActionAuthority",false)
  return root,icon,key
end

function M.CreateListActionRow(options)
  options=options or {};local root,icon,key=M.CreateContextActionRow(options);root.Name=options.name or "ListActionRow";tag(root,"LIST_ACTION_ROW","LIST_ACTION_ROW")
  return root,icon,key
end

function M.CreateCardAction(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("TextButton");root.Name=options.name or "CardAction";root.Size=options.size or UDim2.fromOffset(220,160);root.BackgroundColor3=t.PanelRaised;root.BorderSizePixel=0;root.AutoButtonColor=false;root.Text="";root.Selectable=true;tag(root,"CARD_ACTION","CARD_ACTION");corner(root,14);stroke(root,t.Border,1.2,0.12)
  local image=Instance.new("Frame");image.Name="VisualSlot";image.Position=UDim2.fromOffset(10,10);image.Size=UDim2.new(1,-20,0,82);image.BackgroundColor3=t.PanelInset;image.BorderSizePixel=0;image.Parent=root;corner(image,10)
  label(root,"Title",options.title or "",UDim2.fromOffset(12,98),UDim2.new(1,-24,0,24),t.Text,13,true)
  label(root,"Detail",options.detail or "",UDim2.fromOffset(12,123),UDim2.new(1,-24,0,26),t.Muted,10,false)
  root:SetAttribute("OwnsActionAuthority",false)
  return root,image
end

function M.CreatePromptAction(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "PromptAction";root.Size=options.size or UDim2.fromOffset(220,44);root.BackgroundColor3=t.PanelInset;root.BackgroundTransparency=.10;root.BorderSizePixel=0;tag(root,"PROMPT_ACTION","INPUT_PROMPT_ACTION");corner(root,10)
  local key=label(root,"Key",options.keyText or "E",UDim2.fromOffset(6,5),UDim2.fromOffset(34,34),t.Text,12,true);key.TextXAlignment=Enum.TextXAlignment.Center;key.BackgroundColor3=t.Primary;key.BackgroundTransparency=0;corner(key,8)
  label(root,"Label",options.text or "",UDim2.fromOffset(48,0),UDim2.new(1,-54,1,0),t.Text,11,true)
  root:SetAttribute("OwnsInputBinding",false)
  return root,key
end

function M.CreateBottomActionBar(options)
  options=options or {};local t=themeFor(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "BottomActionBar";root.Size=options.size or UDim2.new(1,0,0,64);root.BackgroundColor3=t.Panel;root.BorderSizePixel=0;tag(root,"BOTTOM_ACTION_BAR","BOTTOM_ACTION_BAR");stroke(root,t.Border,1,0.18)
  local holder=Instance.new("Frame");holder.Position=UDim2.fromOffset(10,8);holder.Size=UDim2.new(1,-20,1,-16);holder.BackgroundTransparency=1;holder.Parent=root
  local layout=Instance.new("UIListLayout");layout.FillDirection=Enum.FillDirection.Horizontal;layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Padding=UDim.new(0,8);layout.HorizontalAlignment=Enum.HorizontalAlignment.Right;layout.Parent=holder
  local buttons={}
  for i,row in ipairs(options.actions or {})do
    local b=M.CreateActionButton({name=tostring(row.id or i),text=row.label or row.id or "",variant=row.variant or "SECONDARY",theme=t,size=UDim2.fromOffset(row.width or 120,48)})
    b.LayoutOrder=i;b.Parent=holder;b:SetAttribute("ActionId",tostring(row.id or i));buttons[i]=b
  end
  return root,holder,buttons
end

function M.CreateCompactIconButton(options)
  options=options or {};local x,c,t=baseButton({name=options.name,text="",variant=options.variant or "GHOST",theme=options.theme,size=options.size or UDim2.fromOffset(44,44),cornerRadius=options.cornerRadius or 10,state=options.state},"COMPACT_ICON_BUTTON","COMPACT_ICON_ACTION")
  local slot=Instance.new("Frame");slot.Name="IconSlot";slot.AnchorPoint=Vector2.new(.5,.5);slot.Position=UDim2.fromScale(.5,.5);slot.Size=UDim2.fromOffset(26,26);slot.BackgroundTransparency=1;slot.Parent=x
  return x,c,slot,t
end

function M.CreateDestructiveConfirmButton(options)
  options=options or {};options.variant="DANGER"
  local x,c=baseButton(options,"DESTRUCTIVE_CONFIRM_BUTTON","DESTRUCTIVE_CONFIRM")
  x:SetAttribute("OwnsDestructiveAction",false)
  return x,c
end

function M.CreateSuccessActionButton(options)
  options=options or {};options.variant="SUCCESS"
  return baseButton(options,"SUCCESS_ACTION_BUTTON","SUCCESS_ACTION")
end

function M.Audit()
  return table.freeze({
    version=1,packId="roblox-common-ui-v1",controlCount=14,
    variants=table.freeze({"PRIMARY","SECONDARY","GHOST","DANGER","SUCCESS","WARNING"}),
    states=table.freeze({"DEFAULT","FOCUSED","PRESSED","SELECTED","DISABLED","LOCKED"}),
    touchMinimum=48,keyboardGamepadSelectable=true,colorOnlyStateForbidden=true,
    gameplayAuthority=false,inputAuthority=false,studioRequiredForInternalUse=false
  })
end

return table.freeze(M)
