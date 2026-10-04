-- 파일명: assets/roblox/common-menu-v1/RobloxCommonMenu.luau
-- 역할: 여러 Roblox 게임에서 재사용하는 회사 공용 메뉴/운영 UI 셸
-- 원칙: 표시·레이아웃·포커스·입력 힌트만 제공한다. 게임 규칙/저장/경제/네트워크 권한은 게임 코드가 소유한다.

local RobloxCommonMenu = {}

local function c(r,g,b) return Color3.fromRGB(r,g,b) end

local STYLE_PRESETS = table.freeze({
  MINIMAL_HERO = table.freeze({
    Surface=c(23,28,34),Raised=c(34,41,50),Inset=c(16,20,25),Border=c(81,96,114),
    Text=c(244,246,249),Muted=c(160,171,184),Accent=c(108,174,225),Danger=c(214,82,76),
    Corner=14,Spacing=10,HeaderHeight=58,NavWidth=220,Depth=0.18,MotionScale=0.85,
  }),
  DENSE_TACTICAL = table.freeze({
    Surface=c(27,29,34),Raised=c(39,42,49),Inset=c(19,21,26),Border=c(98,103,113),
    Text=c(241,241,237),Muted=c(171,171,164),Accent=c(213,164,80),Danger=c(197,73,69),
    Corner=8,Spacing=7,HeaderHeight=52,NavWidth=238,Depth=0.10,MotionScale=0.65,
  }),
  CINEMATIC_DARK = table.freeze({
    Surface=c(18,20,24),Raised=c(29,32,38),Inset=c(12,14,18),Border=c(73,80,92),
    Text=c(244,242,236),Muted=c(153,157,164),Accent=c(187,149,92),Danger=c(186,68,68),
    Corner=6,Spacing=12,HeaderHeight=62,NavWidth=240,Depth=0.26,MotionScale=0.75,
  }),
  BRIGHT_CARD = table.freeze({
    Surface=c(239,242,246),Raised=c(255,255,255),Inset=c(226,231,238),Border=c(170,181,194),
    Text=c(35,42,50),Muted=c(92,103,116),Accent=c(62,116,190),Danger=c(191,69,66),
    Corner=18,Spacing=12,HeaderHeight=60,NavWidth=216,Depth=0.08,MotionScale=1.0,
  }),
  DIEGETIC_MAP = table.freeze({
    Surface=c(54,48,39),Raised=c(70,62,50),Inset=c(39,35,30),Border=c(137,118,88),
    Text=c(238,224,193),Muted=c(181,164,133),Accent=c(201,159,79),Danger=c(177,72,63),
    Corner=5,Spacing=9,HeaderHeight=56,NavWidth=226,Depth=0.15,MotionScale=0.70,
  }),
  CLEAN_CONSOLE = table.freeze({
    Surface=c(25,30,36),Raised=c(36,43,52),Inset=c(17,21,27),Border=c(91,108,128),
    Text=c(245,247,250),Muted=c(169,179,190),Accent=c(91,162,226),Danger=c(213,79,73),
    Corner=12,Spacing=10,HeaderHeight=56,NavWidth=232,Depth=0.14,MotionScale=0.80,
  }),
})

local function cloneStyle(styleId, overrides)
  local src=STYLE_PRESETS[string.upper(tostring(styleId or "MINIMAL_HERO"))] or STYLE_PRESETS.MINIMAL_HERO
  local out={}
  for k,v in pairs(src) do out[k]=v end
  for k,v in pairs(overrides or {}) do if out[k]~=nil then out[k]=v end end
  return out
end

local function corner(parent, radius)
  local u=Instance.new("UICorner");u.CornerRadius=UDim.new(0,radius);u.Parent=parent;return u
end
local function stroke(parent,color,thickness,transparency)
  local u=Instance.new("UIStroke");u.Color=color;u.Thickness=thickness or 1;u.Transparency=transparency or 0;u.Parent=parent;return u
end
local function padding(parent,l,t,r,b)
  local u=Instance.new("UIPadding")
  u.PaddingLeft=UDim.new(0,l or 0);u.PaddingTop=UDim.new(0,t or 0);u.PaddingRight=UDim.new(0,r or 0);u.PaddingBottom=UDim.new(0,b or 0)
  u.Parent=parent;return u
end
local function list(parent,horizontal,gap)
  local u=Instance.new("UIListLayout")
  u.FillDirection=horizontal and Enum.FillDirection.Horizontal or Enum.FillDirection.Vertical
  u.Padding=UDim.new(0,gap or 6);u.SortOrder=Enum.SortOrder.LayoutOrder;u.Parent=parent;return u
end
local function label(parent,name,textValue,size,pos,color,textSize,bold)
  local t=Instance.new("TextLabel");t.Name=name;t.BackgroundTransparency=1;t.Size=size or UDim2.fromScale(1,1);t.Position=pos or UDim2.new()
  t.Text=tostring(textValue or "");t.TextColor3=color;t.TextSize=textSize or 14;t.TextWrapped=true;t.TextXAlignment=Enum.TextXAlignment.Left
  t.Font=bold and Enum.Font.GothamBold or Enum.Font.Gotham;t.Parent=parent;return t
end
local function button(parent,name,textValue,style,size)
  local b=Instance.new("TextButton");b.Name=name;b.Size=size or UDim2.fromOffset(180,48);b.BackgroundColor3=style.Raised;b.BorderSizePixel=0
  b.AutoButtonColor=false;b.Text=tostring(textValue or "");b.TextColor3=style.Text;b.TextSize=14;b.Font=Enum.Font.GothamBold;b.Selectable=true;b.Parent=parent
  corner(b,style.Corner);local s=stroke(b,style.Border,1.2,0.12)
  b.MouseEnter:Connect(function() s.Color=style.Accent end);b.MouseLeave:Connect(function() s.Color=style.Border end)
  return b
end
local function tag(root, atomId, surface)
  root:SetAttribute("StudioAssetId",atomId);root:SetAttribute("StudioAssetPack","roblox-common-menu-v1")
  root:SetAttribute("StudioAssetFamily","UI");root:SetAttribute("CompanyCommonBase",true)
  root:SetAttribute("PresentationSurface",surface or "MENU");root:SetAttribute("ThemeAdaptationRequiredPerGame",true)
  root:SetAttribute("ProductionVerified",false);root:SetAttribute("InternalAuditStudioRequired",false);root:SetAttribute("GameplayAuthority",false)
end

function RobloxCommonMenu.CreateStyle(styleId, overrides)
  return table.freeze(cloneStyle(styleId,overrides))
end

function RobloxCommonMenu.CreateMainMenuShell(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "MainMenuShell";root.Size=options.size or UDim2.fromScale(1,1);root.BackgroundColor3=s.Surface;root.BorderSizePixel=0
  tag(root,"MAIN_MENU_SHELL","MAIN_MENU")
  local hero=Instance.new("Frame");hero.Name="HeroArea";hero.Size=UDim2.new(0.62,0,1,0);hero.BackgroundColor3=s.Inset;hero.BorderSizePixel=0;hero.Parent=root
  local overlay=Instance.new("UIGradient");overlay.Color=ColorSequence.new({ColorSequenceKeypoint.new(0,s.Inset),ColorSequenceKeypoint.new(1,s.Surface)});overlay.Parent=hero
  local nav=Instance.new("Frame");nav.Name="Navigation";nav.AnchorPoint=Vector2.new(1,0);nav.Position=UDim2.fromScale(1,0);nav.Size=UDim2.new(0.38,0,1,0);nav.BackgroundColor3=s.Surface;nav.BorderSizePixel=0;nav.Parent=root;padding(nav,24,42,28,30)
  local title=label(nav,"GameTitle",options.title or "GAME TITLE",UDim2.new(1,0,0,54),nil,s.Text,28,true);title.LayoutOrder=1
  local subtitle=label(nav,"Subtitle",options.subtitle or "",UDim2.new(1,0,0,40),nil,s.Muted,12,false);subtitle.LayoutOrder=2
  local items=Instance.new("Frame");items.Name="MenuItems";items.Size=UDim2.new(1,0,1,-130);items.BackgroundTransparency=1;items.LayoutOrder=3;items.Parent=nav;list(items,false,s.Spacing)
  local buttons={}
  for i,row in ipairs(options.items or {{id="CONTINUE",label="계속"},{id="NEW_GAME",label="새 게임"},{id="SETTINGS",label="설정"},{id="QUIT",label="나가기"}}) do
    local b=button(items,tostring(row.id or i),row.label or row.id,s,UDim2.new(1,0,0,48));b.LayoutOrder=i;b:SetAttribute("MenuActionId",tostring(row.id or i));buttons[i]=b
  end
  root:SetAttribute("OwnsMenuNavigationAuthority",false);root:SetAttribute("OwnsSaveAuthority",false)
  return root,hero,nav,buttons
end

function RobloxCommonMenu.CreateTopStatusBar(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "TopStatusBar";root.Size=options.size or UDim2.new(1,0,0,s.HeaderHeight);root.BackgroundColor3=s.Surface;root.BackgroundTransparency=0.05;root.BorderSizePixel=0
  tag(root,"TOP_STATUS_BAR","HUD_MENU_BRIDGE");padding(root,14,6,14,6)
  local layout=list(root,true,10);layout.VerticalAlignment=Enum.VerticalAlignment.Center
  local slots={}
  for i,row in ipairs(options.items or {}) do
    local item=Instance.new("Frame");item.Name=tostring(row.id or ("Status"..i));item.Size=UDim2.fromOffset(132,40);item.BackgroundColor3=s.Raised;item.BorderSizePixel=0;item.LayoutOrder=i;item.Parent=root;corner(item,10)
    label(item,"Label",row.label or "",UDim2.new(0.52,0,1,0),UDim2.fromOffset(10,0),s.Muted,10,false)
    local v=label(item,"Value",row.value or "",UDim2.new(0.48,-12,1,0),UDim2.new(0.52,0,0,0),s.Text,12,true);v.TextXAlignment=Enum.TextXAlignment.Right
    slots[i]=item
  end
  root:SetAttribute("OwnsDisplayedValues",false);return root,slots
end

function RobloxCommonMenu.CreateSideNavigation(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SideNavigation";root.Size=options.size or UDim2.new(0,s.NavWidth,1,0);root.BackgroundColor3=s.Surface;root.BorderSizePixel=0
  tag(root,"SIDE_NAVIGATION","NAVIGATION");padding(root,10,12,10,12);local l=list(root,false,7);l.VerticalAlignment=Enum.VerticalAlignment.Top
  local buttons={}
  for i,row in ipairs(options.items or {}) do
    local b=button(root,tostring(row.id or i),row.label or row.id,s,UDim2.new(1,0,0,46));b.LayoutOrder=i;b:SetAttribute("NavigationId",tostring(row.id or i))
    if row.selected==true then b.BackgroundColor3=s.Accent;b:SetAttribute("Selected",true) end
    buttons[i]=b
  end
  root:SetAttribute("OwnsNavigationAuthority",false);return root,buttons
end

function RobloxCommonMenu.CreateBottomActionBar(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "BottomActionBar";root.Size=options.size or UDim2.new(1,0,0,56);root.BackgroundColor3=s.Surface;root.BackgroundTransparency=0.04;root.BorderSizePixel=0
  tag(root,"BOTTOM_ACTION_BAR","ACTION_BAR");padding(root,12,6,12,6);local l=list(root,true,8);l.HorizontalAlignment=Enum.HorizontalAlignment.Right;l.VerticalAlignment=Enum.VerticalAlignment.Center
  local buttons={}
  for i,row in ipairs(options.actions or {}) do local b=button(root,tostring(row.id or i),row.label or row.id,s,UDim2.fromOffset(132,42));b.LayoutOrder=i;buttons[i]=b end
  root:SetAttribute("OwnsGameplayAction",false);return root,buttons
end

function RobloxCommonMenu.CreatePauseMenu(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local dim=Instance.new("Frame");dim.Name=options.name or "PauseMenu";dim.Size=UDim2.fromScale(1,1);dim.BackgroundColor3=c(6,8,10);dim.BackgroundTransparency=0.24;dim.BorderSizePixel=0;tag(dim,"PAUSE_MENU","PAUSE")
  local panel=Instance.new("Frame");panel.Name="Panel";panel.AnchorPoint=Vector2.new(0,0.5);panel.Position=UDim2.new(0,30,0.5,0);panel.Size=options.panelSize or UDim2.fromOffset(320,460);panel.BackgroundColor3=s.Surface;panel.BorderSizePixel=0;panel.Parent=dim;corner(panel,s.Corner);stroke(panel,s.Border,1.2,0.1);padding(panel,20,22,20,20)
  local title=label(panel,"Title",options.title or "일시정지",UDim2.new(1,0,0,42),nil,s.Text,24,true);title.LayoutOrder=1
  local items=Instance.new("Frame");items.Name="Items";items.Size=UDim2.new(1,0,1,-62);items.BackgroundTransparency=1;items.LayoutOrder=2;items.Parent=panel;list(items,false,8)
  local buttons={}
  for i,row in ipairs(options.items or {{id="RESUME",label="계속하기"},{id="SETTINGS",label="설정"},{id="HELP",label="도움말"},{id="EXIT",label="메인 메뉴"}}) do local b=button(items,tostring(row.id),row.label,s,UDim2.new(1,0,0,48));b.LayoutOrder=i;buttons[i]=b end
  dim:SetAttribute("OwnsPauseAuthority",false);dim:SetAttribute("OwnsExitAuthority",false);return dim,panel,buttons
end

function RobloxCommonMenu.CreateSettingsRow(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SettingsRow";root.Size=options.size or UDim2.new(1,0,0,58);root.BackgroundColor3=s.Raised;root.BackgroundTransparency=0.05;root.BorderSizePixel=0;tag(root,"SETTINGS_ROW","SETTINGS");corner(root,10)
  local title=label(root,"Title",options.label or "설정",UDim2.new(0.52,-16,0,24),UDim2.fromOffset(12,7),s.Text,13,true)
  local desc=label(root,"Description",options.description or "",UDim2.new(0.58,-16,0,18),UDim2.fromOffset(12,31),s.Muted,10,false)
  local value=label(root,"Value",options.valueText or "",UDim2.new(0.40,-12,1,0),UDim2.new(0.60,0,0,0),s.Accent,12,true);value.TextXAlignment=Enum.TextXAlignment.Right
  root:SetAttribute("SettingId",tostring(options.settingId or ""));root:SetAttribute("OwnsSettingPersistence",false);return root,title,desc,value
end

function RobloxCommonMenu.CreateSettingsPanel(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SettingsPanel";root.Size=options.size or UDim2.fromOffset(680,520);root.BackgroundColor3=s.Surface;root.BorderSizePixel=0;tag(root,"SETTINGS_PANEL","SETTINGS");corner(root,s.Corner);stroke(root,s.Border,1.2,0.1);padding(root,18,18,18,18)
  label(root,"Title",options.title or "설정",UDim2.new(1,0,0,40),nil,s.Text,22,true)
  local tabs=Instance.new("Frame");tabs.Name="Categories";tabs.Position=UDim2.fromOffset(0,48);tabs.Size=UDim2.new(0,160,1,-48);tabs.BackgroundColor3=s.Inset;tabs.BorderSizePixel=0;tabs.Parent=root;corner(tabs,10);padding(tabs,8,8,8,8);list(tabs,false,6)
  local body=Instance.new("ScrollingFrame");body.Name="Options";body.Position=UDim2.fromOffset(172,48);body.Size=UDim2.new(1,-172,1,-48);body.BackgroundTransparency=1;body.BorderSizePixel=0;body.AutomaticCanvasSize=Enum.AutomaticSize.Y;body.CanvasSize=UDim2.new();body.ScrollBarThickness=5;body.Parent=root;list(body,false,7)
  local tabButtons={}
  for i,row in ipairs(options.categories or {{id="GAMEPLAY",label="게임플레이"},{id="CONTROLS",label="조작"},{id="VIDEO",label="화면"},{id="AUDIO",label="오디오"},{id="ACCESSIBILITY",label="접근성"}}) do
    local b=button(tabs,tostring(row.id),row.label,s,UDim2.new(1,0,0,42));b.LayoutOrder=i;tabButtons[i]=b
  end
  root:SetAttribute("OwnsSettingsPersistence",false);root:SetAttribute("AccessibilityPresetCompatible",true);return root,tabs,body,tabButtons
end

function RobloxCommonMenu.CreateSearchBar(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SearchBar";root.Size=options.size or UDim2.fromOffset(320,46);root.BackgroundColor3=s.Inset;root.BorderSizePixel=0;tag(root,"SEARCH_BAR","SEARCH");corner(root,10);stroke(root,s.Border,1,0.14)
  local box=Instance.new("TextBox");box.Name="Input";box.Position=UDim2.fromOffset(12,4);box.Size=UDim2.new(1,-24,1,-8);box.BackgroundTransparency=1;box.ClearTextOnFocus=false;box.PlaceholderText=options.placeholder or "검색";box.PlaceholderColor3=s.Muted;box.Text="";box.TextColor3=s.Text;box.TextSize=13;box.Font=Enum.Font.Gotham;box.TextXAlignment=Enum.TextXAlignment.Left;box.Parent=root
  root:SetAttribute("OwnsSearchData",false);return root,box
end

function RobloxCommonMenu.CreateFilterChip(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local b=button(nil,options.name or "FilterChip",options.text or "필터",s,options.size or UDim2.fromOffset(112,38));tag(b,"FILTER_CHIP","FILTER");b.BackgroundColor3=options.selected==true and s.Accent or s.Raised;b:SetAttribute("Selected",options.selected==true);return b
end

function RobloxCommonMenu.CreateSortSelector(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SortSelector";root.Size=options.size or UDim2.fromOffset(190,42);root.BackgroundColor3=s.Raised;root.BorderSizePixel=0;tag(root,"SORT_SELECTOR","SORT");corner(root,10);stroke(root,s.Border,1,0.14)
  label(root,"Label",options.label or "정렬",UDim2.new(0.42,0,1,0),UDim2.fromOffset(10,0),s.Muted,10,false)
  local value=label(root,"Value",options.valueText or "기본",UDim2.new(0.58,-18,1,0),UDim2.new(0.42,0,0,0),s.Text,11,true);value.TextXAlignment=Enum.TextXAlignment.Right
  root:SetAttribute("OwnsSortAuthority",false);return root,value
end

local function createTwoPane(options,atomId,surface,leftTitle,rightTitle)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or atomId;root.Size=options.size or UDim2.fromOffset(760,520);root.BackgroundColor3=s.Surface;root.BorderSizePixel=0;tag(root,atomId,surface);corner(root,s.Corner);stroke(root,s.Border,1.2,0.1)
  local header=label(root,"Title",options.title or leftTitle,UDim2.new(1,-32,0,46),UDim2.fromOffset(16,10),s.Text,20,true)
  local left=Instance.new("Frame");left.Name=leftTitle;left.Position=UDim2.fromOffset(16,64);left.Size=UDim2.new(0.58,-22,1,-80);left.BackgroundColor3=s.Inset;left.BorderSizePixel=0;left.Parent=root;corner(left,10)
  local right=Instance.new("Frame");right.Name=rightTitle;right.Position=UDim2.new(0.58,6,0,64);right.Size=UDim2.new(0.42,-22,1,-80);right.BackgroundColor3=s.Raised;right.BorderSizePixel=0;right.Parent=root;corner(right,10)
  return root,left,right,header,s
end

function RobloxCommonMenu.CreateInventoryPanel(options)
  local root,left,right,header,s=createTwoPane(options,"INVENTORY_PANEL","INVENTORY","InventoryGrid","ItemDetail")
  root:SetAttribute("OwnsInventoryAuthority",false);root:SetAttribute("OwnsEquipAuthority",false);return root,left,right,header,s
end
function RobloxCommonMenu.CreateItemDetailPanel(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "ItemDetailPanel";root.Size=options.size or UDim2.fromOffset(300,360);root.BackgroundColor3=s.Raised;root.BorderSizePixel=0;tag(root,"ITEM_DETAIL_PANEL","ITEM_DETAIL");corner(root,12);stroke(root,s.Border,1,0.12);padding(root,14,14,14,14)
  local preview=Instance.new("Frame");preview.Name="Preview";preview.Size=UDim2.new(1,0,0,150);preview.BackgroundColor3=s.Inset;preview.BorderSizePixel=0;preview.Parent=root;corner(preview,10)
  local name=label(root,"ItemName",options.itemName or "아이템",UDim2.new(1,0,0,28),UDim2.fromOffset(0,162),s.Text,16,true)
  local meta=label(root,"Meta",options.metaText or "",UDim2.new(1,0,0,22),UDim2.fromOffset(0,192),s.Accent,11,true)
  local desc=label(root,"Description",options.description or "",UDim2.new(1,0,1,-228),UDim2.fromOffset(0,220),s.Muted,12,false);desc.TextYAlignment=Enum.TextYAlignment.Top
  root:SetAttribute("OwnsItemData",false);return root,preview,name,meta,desc
end
function RobloxCommonMenu.CreateEquipmentPanel(options)
  local root,left,right,header,s=createTwoPane(options,"EQUIPMENT_PANEL","EQUIPMENT","EquipmentSlots","CharacterPreview")
  root:SetAttribute("OwnsEquipAuthority",false);return root,left,right,header,s
end
function RobloxCommonMenu.CreateMapPanel(options)
  local root,left,right,header,s=createTwoPane(options,"MAP_PANEL","MAP","MapSurface","LegendAndObjectives")
  root:SetAttribute("OwnsWorldPosition",false);root:SetAttribute("OwnsFastTravelAuthority",false);return root,left,right,header,s
end
function RobloxCommonMenu.CreateJournalPanel(options)
  local root,left,right,header,s=createTwoPane(options,"JOURNAL_PANEL","JOURNAL","EntryList","EntryDetail")
  root:SetAttribute("OwnsQuestAuthority",false);return root,left,right,header,s
end

function RobloxCommonMenu.CreateInputHintBar(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "InputHintBar";root.Size=options.size or UDim2.new(1,0,0,42);root.BackgroundColor3=s.Surface;root.BackgroundTransparency=0.08;root.BorderSizePixel=0;tag(root,"INPUT_HINT_BAR","INPUT_HINT");padding(root,10,4,10,4);local l=list(root,true,16);l.HorizontalAlignment=Enum.HorizontalAlignment.Right;l.VerticalAlignment=Enum.VerticalAlignment.Center
  local hints={}
  for i,row in ipairs(options.hints or {}) do local t=label(root,"Hint"..i,(row.key or "").."  "..(row.label or ""),UDim2.fromOffset(130,34),nil,s.Muted,10,true);t.TextXAlignment=Enum.TextXAlignment.Center;t.LayoutOrder=i;hints[i]=t end
  root:SetAttribute("OwnsInputBinding",false);return root,hints
end

function RobloxCommonMenu.CreateSaveStatus(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "SaveStatus";root.Size=options.size or UDim2.fromOffset(150,34);root.BackgroundColor3=s.Raised;root.BackgroundTransparency=0.08;root.BorderSizePixel=0;tag(root,"SAVE_STATUS","SAVE_STATUS");corner(root,17)
  local dot=Instance.new("Frame");dot.Name="Dot";dot.Position=UDim2.fromOffset(10,11);dot.Size=UDim2.fromOffset(12,12);dot.BackgroundColor3=options.saving==true and s.Accent or c(91,181,120);dot.BorderSizePixel=0;dot.Parent=root;corner(dot,6)
  local text=label(root,"Label",options.text or (options.saving==true and "저장 중" or "저장됨"),UDim2.new(1,-38,1,0),UDim2.fromOffset(30,0),s.Text,10,true)
  root:SetAttribute("OwnsSaveAuthority",false);return root,dot,text
end

function RobloxCommonMenu.CreateProfileSummary(options)
  options=options or {};local s=cloneStyle(options.style,options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "ProfileSummary";root.Size=options.size or UDim2.fromOffset(260,76);root.BackgroundColor3=s.Raised;root.BorderSizePixel=0;tag(root,"PROFILE_SUMMARY","PROFILE");corner(root,12);stroke(root,s.Border,1,0.15)
  local portrait=Instance.new("ImageLabel");portrait.Name="Portrait";portrait.Position=UDim2.fromOffset(8,8);portrait.Size=UDim2.fromOffset(60,60);portrait.BackgroundColor3=s.Inset;portrait.BorderSizePixel=0;portrait.Image=tostring(options.image or "");portrait.Parent=root;corner(portrait,10)
  local name=label(root,"Name",options.playerName or "Player",UDim2.new(1,-82,0,24),UDim2.fromOffset(78,10),s.Text,13,true)
  local detail=label(root,"Detail",options.detailText or "",UDim2.new(1,-82,0,32),UDim2.fromOffset(78,35),s.Muted,10,false)
  root:SetAttribute("OwnsProfileData",false);return root,portrait,name,detail
end

local FACTORIES = table.freeze({
  MAIN_MENU_SHELL=RobloxCommonMenu.CreateMainMenuShell,
  TOP_STATUS_BAR=RobloxCommonMenu.CreateTopStatusBar,
  SIDE_NAVIGATION=RobloxCommonMenu.CreateSideNavigation,
  BOTTOM_ACTION_BAR=RobloxCommonMenu.CreateBottomActionBar,
  PAUSE_MENU=RobloxCommonMenu.CreatePauseMenu,
  SETTINGS_PANEL=RobloxCommonMenu.CreateSettingsPanel,
  SETTINGS_ROW=RobloxCommonMenu.CreateSettingsRow,
  SEARCH_BAR=RobloxCommonMenu.CreateSearchBar,
  FILTER_CHIP=RobloxCommonMenu.CreateFilterChip,
  SORT_SELECTOR=RobloxCommonMenu.CreateSortSelector,
  INVENTORY_PANEL=RobloxCommonMenu.CreateInventoryPanel,
  ITEM_DETAIL_PANEL=RobloxCommonMenu.CreateItemDetailPanel,
  EQUIPMENT_PANEL=RobloxCommonMenu.CreateEquipmentPanel,
  MAP_PANEL=RobloxCommonMenu.CreateMapPanel,
  JOURNAL_PANEL=RobloxCommonMenu.CreateJournalPanel,
  INPUT_HINT_BAR=RobloxCommonMenu.CreateInputHintBar,
  SAVE_STATUS=RobloxCommonMenu.CreateSaveStatus,
  PROFILE_SUMMARY=RobloxCommonMenu.CreateProfileSummary,
})

function RobloxCommonMenu.Create(atomId, options)
  local id=string.upper(tostring(atomId or ""));local f=FACTORIES[id];assert(f,"UNKNOWN_COMMON_MENU_ATOM: "..tostring(atomId));return f(options)
end

function RobloxCommonMenu.Audit()
  local ids={};for id in pairs(FACTORIES) do table.insert(ids,id) end;table.sort(ids)
  return table.freeze({
    version=1,packId="roblox-common-menu-v1",atomIds=table.freeze(ids),atomCount=#ids,
    styleIds=table.freeze({"MINIMAL_HERO","DENSE_TACTICAL","CINEMATIC_DARK","BRIGHT_CARD","DIEGETIC_MAP","CLEAN_CONSOLE"}),
    inputModes=table.freeze({"TOUCH","KEYBOARD_MOUSE","GAMEPAD"}),
    companyCommonBase=true,gameplayAuthority=false,internalAuditStudioRequired=false,productionVerified=false,
  })
end

return table.freeze(RobloxCommonMenu)
