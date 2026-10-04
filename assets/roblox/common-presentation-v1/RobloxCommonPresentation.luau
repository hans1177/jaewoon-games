-- 파일명: assets/roblox/common-presentation-v1/RobloxCommonPresentation.luau
-- 역할: 회사 공용 Roblox 로딩/메뉴/인트로/컷신 표시 자산
-- 원칙: 표현만 소유한다. 게임 상태/저장/퀘스트/카메라/네트워크/입력 권한은 게임 코드가 소유한다.

local M = {}

local THEME = table.freeze({
  Backdrop = Color3.fromRGB(12, 17, 24),
  Panel = Color3.fromRGB(29, 36, 46),
  PanelRaised = Color3.fromRGB(44, 54, 68),
  PanelInset = Color3.fromRGB(20, 26, 34),
  Border = Color3.fromRGB(91, 109, 132),
  BorderBright = Color3.fromRGB(151, 174, 202),
  Text = Color3.fromRGB(242, 246, 250),
  Muted = Color3.fromRGB(165, 178, 195),
  Accent = Color3.fromRGB(94, 158, 222),
  AccentBright = Color3.fromRGB(132, 196, 244),
  Positive = Color3.fromRGB(91, 184, 123),
  Warning = Color3.fromRGB(229, 173, 73),
  Danger = Color3.fromRGB(219, 82, 76),
  Shadow = Color3.fromRGB(4, 7, 11),
  SubtitleBackground = Color3.fromRGB(5, 7, 10),
  Corner = 14,
  TouchHeight = 48,
})

local STYLE_PRESETS = table.freeze({
  CINEMATIC_DARK = table.freeze({Backdrop=Color3.fromRGB(10,13,18),Panel=Color3.fromRGB(24,29,37),PanelRaised=Color3.fromRGB(40,48,60),Accent=Color3.fromRGB(96,151,205),Corner=10}),
  FANTASY_CARVED = table.freeze({Backdrop=Color3.fromRGB(28,24,21),Panel=Color3.fromRGB(54,45,37),PanelRaised=Color3.fromRGB(74,60,47),Accent=Color3.fromRGB(191,145,72),Corner=8}),
  SCI_FI_GLASS = table.freeze({Backdrop=Color3.fromRGB(8,18,26),Panel=Color3.fromRGB(19,40,54),PanelRaised=Color3.fromRGB(27,59,78),Accent=Color3.fromRGB(70,199,224),Corner=6}),
  HORROR_MUTED = table.freeze({Backdrop=Color3.fromRGB(15,15,16),Panel=Color3.fromRGB(31,30,31),PanelRaised=Color3.fromRGB(48,43,43),Accent=Color3.fromRGB(157,65,59),Corner=4}),
  COZY_SOFT = table.freeze({Backdrop=Color3.fromRGB(44,48,50),Panel=Color3.fromRGB(75,81,79),PanelRaised=Color3.fromRGB(96,104,98),Accent=Color3.fromRGB(174,190,132),Corner=18}),
  ARCADE_BOLD = table.freeze({Backdrop=Color3.fromRGB(18,21,33),Panel=Color3.fromRGB(38,44,72),PanelRaised=Color3.fromRGB(56,68,108),Accent=Color3.fromRGB(244,127,69),Corner=12}),
  MINIMAL_LIGHT = table.freeze({Backdrop=Color3.fromRGB(220,225,230),Panel=Color3.fromRGB(242,245,248),PanelRaised=Color3.fromRGB(255,255,255),Border=Color3.fromRGB(163,174,187),Text=Color3.fromRGB(28,33,40),Muted=Color3.fromRGB(92,102,115),Accent=Color3.fromRGB(53,102,176),Corner=12}),
})

local function cloneTheme(overrides)
  local out = {}
  for key, value in pairs(THEME) do out[key] = value end
  for key, value in pairs(overrides or {}) do if out[key] ~= nil then out[key] = value end end
  return out
end

local function tag(instance, atomId, role)
  instance:SetAttribute("StudioAssetId", atomId)
  instance:SetAttribute("StudioAssetPack", "roblox-common-presentation-v1")
  instance:SetAttribute("StudioAssetFamily", "UI")
  instance:SetAttribute("PresentationRole", role or atomId)
  instance:SetAttribute("CompanyCommonBase", true)
  instance:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  instance:SetAttribute("GameplayAuthority", false)
  instance:SetAttribute("CameraAuthority", false)
  instance:SetAttribute("InputAuthority", false)
  instance:SetAttribute("ProductionVerified", false)
  instance:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

local function corner(parent, px)
  local x = Instance.new("UICorner")
  x.CornerRadius = UDim.new(0, px or 12)
  x.Parent = parent
  return x
end

local function stroke(parent, color, thickness, transparency)
  local x = Instance.new("UIStroke")
  x.Color = color
  x.Thickness = thickness or 1
  x.Transparency = transparency or 0
  x.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  x.Parent = parent
  return x
end

local function gradient(parent, top, bottom, rotation)
  local x = Instance.new("UIGradient")
  x.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, top),
    ColorSequenceKeypoint.new(1, bottom),
  })
  x.Rotation = rotation or 90
  x.Parent = parent
  return x
end

local function label(parent, name, textValue, position, size, color, textSize, bold)
  local x = Instance.new("TextLabel")
  x.Name = name
  x.Position = position or UDim2.new()
  x.Size = size or UDim2.fromScale(1, 1)
  x.BackgroundTransparency = 1
  x.Text = tostring(textValue or "")
  x.TextColor3 = color or Color3.new(1, 1, 1)
  x.TextSize = textSize or 14
  x.TextWrapped = true
  x.TextXAlignment = Enum.TextXAlignment.Left
  x.TextYAlignment = Enum.TextYAlignment.Center
  x.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
  x.Parent = parent
  return x
end

local function button(parent, name, textValue, size, theme)
  local x = Instance.new("TextButton")
  x.Name = name
  x.Size = size or UDim2.fromOffset(180, 48)
  x.BackgroundColor3 = theme.PanelRaised
  x.BorderSizePixel = 0
  x.AutoButtonColor = false
  x.Text = tostring(textValue or "")
  x.TextColor3 = theme.Text
  x.TextSize = 14
  x.Font = Enum.Font.GothamBold
  x.Selectable = true
  x.Parent = parent
  corner(x, 10)
  stroke(x, theme.Border, 1, 0.12)
  return x
end

local function panel(name, size, theme)
  local root = Instance.new("Frame")
  root.Name = name
  root.Size = size
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  corner(root, theme.Corner)
  stroke(root, theme.Border, 1.2, 0.10)
  gradient(root, theme.PanelRaised, theme.Panel, 90)
  return root
end

local function verticalList(parent, padding)
  local list = Instance.new("UIListLayout")
  list.FillDirection = Enum.FillDirection.Vertical
  list.SortOrder = Enum.SortOrder.LayoutOrder
  list.Padding = UDim.new(0, padding or 8)
  list.Parent = parent
  return list
end

local function horizontalList(parent, padding)
  local list = Instance.new("UIListLayout")
  list.FillDirection = Enum.FillDirection.Horizontal
  list.SortOrder = Enum.SortOrder.LayoutOrder
  list.Padding = UDim.new(0, padding or 8)
  list.VerticalAlignment = Enum.VerticalAlignment.Center
  list.Parent = parent
  return list
end

function M.CreateStyleTheme(styleId, overrides)
  local id=string.upper(tostring(styleId or "CINEMATIC_DARK"))
  local preset=STYLE_PRESETS[id] or STYLE_PRESETS.CINEMATIC_DARK
  local merged={}
  for key,value in pairs(THEME) do merged[key]=value end
  for key,value in pairs(preset) do if merged[key]~=nil then merged[key]=value end end
  for key,value in pairs(overrides or {}) do if merged[key]~=nil then merged[key]=value end end
  return table.freeze(merged)
end

function M.CreateTheme(overrides)
  return table.freeze(cloneTheme(overrides))
end

function M.CreateBrandMark(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "BrandMark"
  root.Size = options.size or UDim2.fromOffset(84, 84)
  root.BackgroundTransparency = 1
  tag(root, "BRAND_MARK", "BRAND_IDENTITY")

  local outer = Instance.new("Frame")
  outer.Name = "Outer"
  outer.AnchorPoint = Vector2.new(0.5,0.5)
  outer.Position = UDim2.fromScale(0.5,0.5)
  outer.Size = UDim2.fromScale(0.82,0.82)
  outer.BackgroundColor3 = options.primaryColor or theme.Accent
  outer.BorderSizePixel = 0
  outer.Rotation = 45
  outer.Parent = root
  corner(outer, 12)
  stroke(outer, theme.AccentBright, 2, 0.08)

  local inner = Instance.new("Frame")
  inner.Name = "Inner"
  inner.AnchorPoint = Vector2.new(0.5,0.5)
  inner.Position = UDim2.fromScale(0.5,0.5)
  inner.Size = UDim2.fromScale(0.48,0.48)
  inner.BackgroundColor3 = theme.Backdrop
  inner.BorderSizePixel = 0
  inner.Rotation = 45
  inner.Parent = root
  corner(inner, 8)

  local glyph = label(root,"Glyph",options.glyph or "J",UDim2.fromScale(0,0),UDim2.fromScale(1,1),theme.Text,28,true)
  glyph.TextXAlignment = Enum.TextXAlignment.Center
  return root, glyph
end

function M.CreateLoadingSpinner(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "LoadingSpinner"
  root.Size = options.size or UDim2.fromOffset(48,48)
  root.BackgroundTransparency = 1
  tag(root, "LOADING_SPINNER", "LOADING_ACTIVITY")

  local segments = {}
  for i=1,8 do
    local seg = Instance.new("Frame")
    seg.Name = "Segment"..i
    seg.AnchorPoint = Vector2.new(0.5,0.5)
    seg.Position = UDim2.fromScale(0.5,0.5)
    seg.Size = UDim2.fromScale(0.12,0.34)
    seg.BackgroundColor3 = options.color or theme.AccentBright
    seg.BackgroundTransparency = (i-1)/10
    seg.BorderSizePixel = 0
    seg.Rotation = (i-1)*45
    seg.Parent = root
    corner(seg, 4)
    segments[i]=seg
  end

  local controller = {}
  function controller.SetPhase(phase)
    local p = math.floor((tonumber(phase) or 0)*8)%8
    for i, seg in ipairs(segments) do
      local delta = (i-1-p)%8
      seg.BackgroundTransparency = math.clamp(delta/9,0.05,0.82)
    end
  end
  return root, controller
end

function M.CreateLoadingScreen(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "LoadingScreen"
  root.Size = UDim2.fromScale(1,1)
  root.BackgroundColor3 = options.backgroundColor or theme.Backdrop
  root.BorderSizePixel = 0
  tag(root, "LOADING_SCREEN", "LOADING_SCREEN")

  local shade = Instance.new("Frame")
  shade.Name = "Shade"
  shade.Size = UDim2.fromScale(1,1)
  shade.BackgroundColor3 = theme.Shadow
  shade.BackgroundTransparency = tonumber(options.shadeTransparency) or 0.28
  shade.BorderSizePixel = 0
  shade.Parent = root

  local brand = M.CreateBrandMark({size=UDim2.fromOffset(78,78),theme=theme,glyph=options.brandGlyph or "J"})
  brand.AnchorPoint = Vector2.new(0.5,0.5)
  brand.Position = UDim2.fromScale(0.5,0.38)
  brand.Parent = root

  local title = label(root,"Title",options.title or "",UDim2.new(0.15,0,0.50,0),UDim2.new(0.7,0,0,38),theme.Text,24,true)
  title.TextXAlignment = Enum.TextXAlignment.Center
  local status = label(root,"Status",options.status or "불러오는 중",UDim2.new(0.15,0,0.58,0),UDim2.new(0.7,0,0,22),theme.Muted,12,false)
  status.TextXAlignment = Enum.TextXAlignment.Center

  local track = Instance.new("Frame")
  track.Name = "ProgressTrack"
  track.AnchorPoint = Vector2.new(0.5,0.5)
  track.Position = UDim2.fromScale(0.5,0.66)
  track.Size = UDim2.new(0.48,0,0,12)
  track.BackgroundColor3 = theme.PanelRaised
  track.BorderSizePixel = 0
  track.Parent = root
  corner(track, 6)

  local fill = Instance.new("Frame")
  fill.Name = "Fill"
  fill.Size = UDim2.fromScale(0,1)
  fill.BackgroundColor3 = theme.Accent
  fill.BorderSizePixel = 0
  fill.Parent = track
  corner(fill,6)
  gradient(fill,theme.AccentBright,theme.Accent,0)

  local tip = label(root,"Tip",options.tip or "",UDim2.new(0.18,0,0.72,0),UDim2.new(0.64,0,0,44),theme.Muted,12,false)
  tip.TextXAlignment = Enum.TextXAlignment.Center

  local controller={}
  function controller.SetProgress(ratio,textValue)
    fill.Size=UDim2.fromScale(math.clamp(tonumber(ratio) or 0,0,1),1)
    if textValue~=nil then status.Text=tostring(textValue) end
  end
  function controller.SetTip(textValue) tip.Text=tostring(textValue or "") end
  root:SetAttribute("OwnsLoadState",false)
  return root,controller
end

function M.CreateBrandSplash(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "BrandSplash"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundColor3=options.backgroundColor or theme.Backdrop
  root.BorderSizePixel=0
  tag(root,"BRAND_SPLASH","INTRO_SPLASH")

  local mark=M.CreateBrandMark({size=UDim2.fromOffset(96,96),theme=theme,glyph=options.brandGlyph or "J"})
  mark.AnchorPoint=Vector2.new(0.5,0.5)
  mark.Position=UDim2.fromScale(0.5,0.44)
  mark.Parent=root
  local title=label(root,"BrandName",options.brandName or "",UDim2.new(0.15,0,0.56,0),UDim2.new(0.7,0,0,36),theme.Text,22,true)
  title.TextXAlignment=Enum.TextXAlignment.Center
  local subtitle=label(root,"Tagline",options.tagline or "",UDim2.new(0.2,0,0.62,0),UDim2.new(0.6,0,0,26),theme.Muted,12,false)
  subtitle.TextXAlignment=Enum.TextXAlignment.Center
  return root,mark,title,subtitle
end

function M.CreateMainMenuShell(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "MainMenuShell"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundTransparency=1
  tag(root,"MAIN_MENU_SHELL","MAIN_MENU")

  local title=label(root,"GameTitle",options.title or "",UDim2.new(0.06,0,0.09,0),UDim2.new(0.54,0,0,54),theme.Text,30,true)
  local subtitle=label(root,"Subtitle",options.subtitle or "",UDim2.new(0.06,0,0.16,0),UDim2.new(0.5,0,0,28),theme.Muted,13,false)
  local menu=panel("Menu",UDim2.fromOffset(280,330),theme)
  menu.Position=UDim2.new(0.06,0,0.28,0)
  menu.BackgroundTransparency=0.06
  menu.Parent=root

  local holder=Instance.new("Frame")
  holder.Name="Items"
  holder.Position=UDim2.fromOffset(14,14)
  holder.Size=UDim2.new(1,-28,1,-28)
  holder.BackgroundTransparency=1
  holder.Parent=menu
  verticalList(holder,8)

  local buttons={}
  for i,row in ipairs(options.items or {
    {id="CONTINUE",label="계속"},
    {id="NEW_GAME",label="새 게임"},
    {id="SETTINGS",label="설정"},
  }) do
    local b=button(holder,tostring(row.id or i),row.label or row.id,UDim2.new(1,0,0,52),theme)
    b.LayoutOrder=i
    b:SetAttribute("MenuActionId",tostring(row.id or i))
    b:SetAttribute("OwnsMenuAction",false)
    buttons[i]=b
  end
  root:SetAttribute("OwnsNavigationAuthority",false)
  return root,title,subtitle,menu,buttons
end

function M.CreateTopBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "TopBar"
  root.Size=options.size or UDim2.new(1,0,0,58)
  root.BackgroundColor3=theme.Panel
  root.BackgroundTransparency=0.03
  root.BorderSizePixel=0
  tag(root,"TOP_BAR","MENU_TOP_BAR")
  stroke(root,theme.Border,1,0.22)

  local title=label(root,"Title",options.title or "",UDim2.fromOffset(18,0),UDim2.new(0.42,0,1,0),theme.Text,16,true)
  local context=label(root,"Context",options.context or "",UDim2.new(0.42,0,0,0),UDim2.new(0.28,0,1,0),theme.Muted,11,false)
  context.TextXAlignment=Enum.TextXAlignment.Center
  local right=Instance.new("Frame")
  right.Name="Actions"
  right.AnchorPoint=Vector2.new(1,0)
  right.Position=UDim2.new(1,-12,0,0)
  right.Size=UDim2.new(0.28,0,1,0)
  right.BackgroundTransparency=1
  right.Parent=root
  horizontalList(right,6).HorizontalAlignment=Enum.HorizontalAlignment.Right
  return root,title,context,right
end

function M.CreateSideNavigation(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=panel(options.name or "SideNavigation",options.size or UDim2.fromOffset(210,420),theme)
  tag(root,"SIDE_NAVIGATION","MENU_SIDE_NAVIGATION")
  local holder=Instance.new("Frame")
  holder.Position=UDim2.fromOffset(10,10)
  holder.Size=UDim2.new(1,-20,1,-20)
  holder.BackgroundTransparency=1
  holder.Parent=root
  verticalList(holder,6)

  local buttons={}
  for i,row in ipairs(options.items or {}) do
    local b=button(holder,tostring(row.id or i),row.label or row.id,UDim2.new(1,0,0,46),theme)
    b.LayoutOrder=i
    b.TextXAlignment=Enum.TextXAlignment.Left
    local pad=Instance.new("UIPadding")
    pad.PaddingLeft=UDim.new(0,14)
    pad.Parent=b
    b:SetAttribute("NavigationId",tostring(row.id or i))
    b:SetAttribute("OwnsNavigationAuthority",false)
    buttons[i]=b
  end
  return root,holder,buttons
end

function M.CreateSearchFilterBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "SearchFilterBar"
  root.Size=options.size or UDim2.new(1,0,0,50)
  root.BackgroundTransparency=1
  tag(root,"SEARCH_FILTER_BAR","SEARCH_FILTER")

  local search=Instance.new("TextBox")
  search.Name="Search"
  search.Size=UDim2.new(0.58,-6,1,0)
  search.BackgroundColor3=theme.PanelInset
  search.BorderSizePixel=0
  search.ClearTextOnFocus=false
  search.PlaceholderText=options.placeholder or "검색"
  search.PlaceholderColor3=theme.Muted
  search.Text=""
  search.TextColor3=theme.Text
  search.TextSize=13
  search.TextXAlignment=Enum.TextXAlignment.Left
  search.Font=Enum.Font.Gotham
  search.Parent=root
  corner(search,10)
  stroke(search,theme.Border,1,0.16)
  local pad=Instance.new("UIPadding")
  pad.PaddingLeft=UDim.new(0,12)
  pad.PaddingRight=UDim.new(0,12)
  pad.Parent=search

  local filter=button(root,"Filter",options.filterText or "필터",UDim2.new(0.2,-4,1,0),theme)
  filter.Position=UDim2.new(0.60,0,0,0)
  local sort=button(root,"Sort",options.sortText or "정렬",UDim2.new(0.2,-4,1,0),theme)
  sort.Position=UDim2.new(0.80,4,0,0)
  root:SetAttribute("OwnsSearchData",false)
  root:SetAttribute("OwnsSortState",false)
  return root,search,filter,sort
end

function M.CreateBreadcrumbBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "BreadcrumbBar"
  root.Size=options.size or UDim2.new(1,0,0,30)
  root.BackgroundTransparency=1
  tag(root,"BREADCRUMB_BAR","MENU_BREADCRUMB")
  local textLabel=label(root,"Path",table.concat(options.items or {},"  ›  "),UDim2.new(),UDim2.fromScale(1,1),theme.Muted,11,false)
  return root,textLabel
end

function M.CreateFooterHintBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "FooterHintBar"
  root.Size=options.size or UDim2.new(1,0,0,42)
  root.BackgroundColor3=theme.PanelInset
  root.BackgroundTransparency=0.10
  root.BorderSizePixel=0
  tag(root,"FOOTER_HINT_BAR","INPUT_HINT_BAR")
  local holder=Instance.new("Frame")
  holder.Position=UDim2.fromOffset(12,0)
  holder.Size=UDim2.new(1,-24,1,0)
  holder.BackgroundTransparency=1
  holder.Parent=root
  horizontalList(holder,18)
  local hints={}
  for i,row in ipairs(options.hints or {}) do
    local x=label(holder,"Hint"..i,(row.key and "["..row.key.."] " or "")..tostring(row.label or ""),nil,UDim2.fromOffset(130,42),theme.Muted,11,false)
    x.LayoutOrder=i
    hints[i]=x
  end
  root:SetAttribute("OwnsInputBinding",false)
  return root,holder,hints
end

local function createScreenShell(atomId,role,options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or atomId
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundColor3=theme.Backdrop
  root.BackgroundTransparency=tonumber(options.backgroundTransparency) or 0.10
  root.BorderSizePixel=0
  tag(root,atomId,role)

  local top=M.CreateTopBar({title=options.title or "",context=options.context or "",theme=theme})
  top.Parent=root
  local nav=M.CreateSideNavigation({items=options.navItems or {},theme=theme,size=UDim2.new(0,210,1,-112)})
  nav.Position=UDim2.fromOffset(0,58)
  nav.Parent=root
  local content=panel("Content",UDim2.new(1,-230,1,-128),theme)
  content.Position=UDim2.fromOffset(220,66)
  content.Parent=root
  local footer=M.CreateFooterHintBar({hints=options.hints or {},theme=theme})
  footer.AnchorPoint=Vector2.new(0,1)
  footer.Position=UDim2.new(0,0,1,0)
  footer.Parent=root
  return root,top,nav,content,footer
end

function M.CreateInventoryScreenShell(options) return createScreenShell("INVENTORY_SCREEN","INVENTORY_FULL_SCREEN",options) end
function M.CreateCharacterScreenShell(options) return createScreenShell("CHARACTER_SCREEN","CHARACTER_FULL_SCREEN",options) end
function M.CreateMapScreenShell(options) return createScreenShell("MAP_SCREEN","MAP_FULL_SCREEN",options) end
function M.CreateQuestLogScreenShell(options) return createScreenShell("QUEST_LOG_SCREEN","QUEST_LOG_FULL_SCREEN",options) end
function M.CreateCodexScreenShell(options) return createScreenShell("CODEX_SCREEN","CODEX_FULL_SCREEN",options) end

function M.CreateSettingsScreenShell(options)
  options=options or {}
  options.title=options.title or "설정"
  local root,top,nav,content,footer=createScreenShell("SETTINGS_SCREEN","SETTINGS_FULL_SCREEN",options)
  root:SetAttribute("OwnsSettingsPersistence",false)
  return root,top,nav,content,footer
end

function M.CreatePauseMenuShell(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "PauseMenu"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundColor3=theme.Shadow
  root.BackgroundTransparency=0.30
  root.BorderSizePixel=0
  tag(root,"PAUSE_MENU","PAUSE_MENU")

  local menu=panel("PausePanel",options.panelSize or UDim2.fromOffset(320,420),theme)
  menu.AnchorPoint=Vector2.new(0.5,0.5)
  menu.Position=UDim2.fromScale(0.5,0.5)
  menu.Parent=root
  local title=label(menu,"Title",options.title or "일시정지",UDim2.fromOffset(18,18),UDim2.new(1,-36,0,36),theme.Text,22,true)
  local holder=Instance.new("Frame")
  holder.Position=UDim2.fromOffset(18,70)
  holder.Size=UDim2.new(1,-36,1,-88)
  holder.BackgroundTransparency=1
  holder.Parent=menu
  verticalList(holder,8)
  local buttons={}
  for i,row in ipairs(options.items or {{id="RESUME",label="계속"},{id="SETTINGS",label="설정"},{id="EXIT",label="나가기"}}) do
    local b=button(holder,tostring(row.id or i),row.label or row.id,UDim2.new(1,0,0,50),theme)
    b.LayoutOrder=i
    b:SetAttribute("PauseActionId",tostring(row.id or i))
    b:SetAttribute("OwnsPauseAuthority",false)
    buttons[i]=b
  end
  root:SetAttribute("OwnsPauseAuthority",false)
  return root,menu,title,buttons
end

function M.CreateLetterbox(options)
  options=options or {}
  local root=Instance.new("Frame")
  root.Name=options.name or "Letterbox"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundTransparency=1
  tag(root,"LETTERBOX","CUTSCENE_LETTERBOX")
  local top=Instance.new("Frame")
  top.Name="Top"
  top.Size=UDim2.new(1,0,0,tonumber(options.height) or 56)
  top.BackgroundColor3=Color3.new(0,0,0)
  top.BorderSizePixel=0
  top.Parent=root
  local bottom=top:Clone()
  bottom.Name="Bottom"
  bottom.AnchorPoint=Vector2.new(0,1)
  bottom.Position=UDim2.new(0,0,1,0)
  bottom.Parent=root
  return root,top,bottom
end

function M.CreateSubtitlePanel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "SubtitlePanel"
  root.AnchorPoint=Vector2.new(0.5,1)
  root.Position=UDim2.new(0.5,0,1,-70)
  root.Size=options.size or UDim2.new(0.72,0,0,92)
  root.BackgroundColor3=theme.SubtitleBackground
  root.BackgroundTransparency=tonumber(options.backgroundTransparency) or 0.18
  root.BorderSizePixel=0
  tag(root,"SUBTITLE_PANEL","CUTSCENE_SUBTITLE")
  corner(root,10)

  local speaker=label(root,"Speaker",options.speaker or "",UDim2.fromOffset(16,8),UDim2.new(1,-32,0,22),options.speakerColor or theme.AccentBright,13,true)
  local body=label(root,"Body",options.text or "",UDim2.fromOffset(16,30),UDim2.new(1,-48,1,-38),theme.Text,15,false)
  body.TextYAlignment=Enum.TextYAlignment.Top
  local direction=label(root,"Direction",options.directionText or "",UDim2.new(1,-34,0,8),UDim2.fromOffset(22,22),theme.Muted,12,true)
  direction.TextXAlignment=Enum.TextXAlignment.Center

  local controller={}
  function controller.SetText(speakerText,bodyText,directionText)
    if speakerText~=nil then speaker.Text=tostring(speakerText) end
    if bodyText~=nil then body.Text=tostring(bodyText) end
    if directionText~=nil then direction.Text=tostring(directionText) end
  end
  root:SetAttribute("OwnsDialogueState",false)
  root:SetAttribute("SpeakerNameSupported",true)
  root:SetAttribute("SpeakerDirectionSupported",true)
  return root,controller
end

function M.CreateSkipPrompt(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "SkipPrompt"
  root.AnchorPoint=Vector2.new(1,1)
  root.Position=UDim2.new(1,-24,1,-24)
  root.Size=options.size or UDim2.fromOffset(180,42)
  root.BackgroundColor3=theme.PanelInset
  root.BackgroundTransparency=0.10
  root.BorderSizePixel=0
  tag(root,"SKIP_PROMPT","CUTSCENE_SKIP_PROMPT")
  corner(root,10)
  stroke(root,theme.Border,1,0.18)
  local textLabel=label(root,"Text",options.text or "길게 눌러 건너뛰기",UDim2.fromOffset(10,0),UDim2.new(1,-20,1,0),theme.Muted,11,true)
  textLabel.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("OwnsSkipAuthority",false)
  root:SetAttribute("HoldProgressVisualOnly",true)
  return root,textLabel
end

function M.CreateChapterCard(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "ChapterCard"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundTransparency=1
  tag(root,"CHAPTER_CARD","CINEMATIC_CHAPTER_CARD")
  local kicker=label(root,"Kicker",options.kicker or "",UDim2.new(0.16,0,0.42,0),UDim2.new(0.68,0,0,24),theme.AccentBright,12,true)
  kicker.TextXAlignment=Enum.TextXAlignment.Center
  local title=label(root,"Title",options.title or "",UDim2.new(0.10,0,0.47,0),UDim2.new(0.80,0,0,52),theme.Text,30,true)
  title.TextXAlignment=Enum.TextXAlignment.Center
  local subtitle=label(root,"Subtitle",options.subtitle or "",UDim2.new(0.16,0,0.54,0),UDim2.new(0.68,0,0,28),theme.Muted,13,false)
  subtitle.TextXAlignment=Enum.TextXAlignment.Center
  return root,kicker,title,subtitle
end

function M.CreateSceneTransition(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "SceneTransition"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundColor3=options.color or theme.Backdrop
  root.BackgroundTransparency=1
  root.BorderSizePixel=0
  tag(root,"SCENE_TRANSITION","SCENE_TRANSITION")
  local controller={}
  function controller.SetCoverage(value)
    root.BackgroundTransparency=1-math.clamp(tonumber(value) or 0,0,1)
  end
  root:SetAttribute("OwnsSceneChange",false)
  return root,controller
end

function M.CreateBossTitleCard(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "BossTitleCard"
  root.AnchorPoint=Vector2.new(0.5,0.5)
  root.Position=UDim2.fromScale(0.5,0.76)
  root.Size=options.size or UDim2.new(0.72,0,0,96)
  root.BackgroundTransparency=1
  tag(root,"BOSS_TITLE_CARD","BOSS_REVEAL")
  local role=label(root,"Role",options.roleText or "BOSS",UDim2.new(0,0,0,4),UDim2.new(1,0,0,20),theme.Danger,11,true)
  role.TextXAlignment=Enum.TextXAlignment.Center
  local title=label(root,"Title",options.title or "",UDim2.new(0,0,0,24),UDim2.new(1,0,0,42),theme.Text,28,true)
  title.TextXAlignment=Enum.TextXAlignment.Center
  local divider=Instance.new("Frame")
  divider.AnchorPoint=Vector2.new(0.5,0.5)
  divider.Position=UDim2.new(0.5,0,0,74)
  divider.Size=UDim2.new(0.44,0,0,2)
  divider.BackgroundColor3=theme.Danger
  divider.BorderSizePixel=0
  divider.Parent=root
  return root,title
end

function M.CreateRegionTitleCard(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "RegionTitleCard"
  root.Position=options.position or UDim2.new(0.06,0,0.72,0)
  root.Size=options.size or UDim2.new(0.56,0,0,92)
  root.BackgroundTransparency=1
  tag(root,"REGION_TITLE_CARD","REGION_REVEAL")
  local kicker=label(root,"Kicker",options.kicker or "",UDim2.new(),UDim2.new(1,0,0,20),theme.AccentBright,10,true)
  local title=label(root,"Title",options.title or "",UDim2.new(0,0,0,20),UDim2.new(1,0,0,38),theme.Text,24,true)
  local detail=label(root,"Detail",options.detail or "",UDim2.new(0,0,0,60),UDim2.new(1,0,0,24),theme.Muted,11,false)
  return root,title,detail
end

function M.CreateCinematicChoiceStrip(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "CinematicChoiceStrip"
  root.AnchorPoint=Vector2.new(0.5,1)
  root.Position=UDim2.new(0.5,0,1,-36)
  root.Size=options.size or UDim2.new(0.72,0,0,148)
  root.BackgroundTransparency=1
  tag(root,"CINEMATIC_CHOICE_STRIP","CUTSCENE_CHOICE")
  verticalList(root,6)
  local buttons={}
  for i,row in ipairs(options.choices or {}) do
    local b=button(root,tostring(row.id or i),row.label or row.text or "",UDim2.new(1,0,0,44),theme)
    b.LayoutOrder=i
    b.TextXAlignment=Enum.TextXAlignment.Left
    local pad=Instance.new("UIPadding")
    pad.PaddingLeft=UDim.new(0,14)
    pad.Parent=b
    b:SetAttribute("ChoiceId",tostring(row.id or i))
    b:SetAttribute("OwnsDialogueBranchAuthority",false)
    buttons[i]=b
  end
  return root,buttons
end

function M.CreateCutsceneOverlay(options)
  options=options or {}
  local root=Instance.new("Frame")
  root.Name=options.name or "CutsceneOverlay"
  root.Size=UDim2.fromScale(1,1)
  root.BackgroundTransparency=1
  tag(root,"CUTSCENE_OVERLAY","CUTSCENE_OVERLAY")

  local letterbox=M.CreateLetterbox({height=options.letterboxHeight})
  letterbox.Parent=root
  local subtitles=M.CreateSubtitlePanel({
    speaker=options.speaker,text=options.text,directionText=options.directionText,theme=options.theme
  })
  subtitles.Parent=root
  local skip=M.CreateSkipPrompt({text=options.skipText,theme=options.theme})
  skip.Parent=root
  root:SetAttribute("ReducedMotionCompatible",true)
  root:SetAttribute("OwnsCameraAuthority",false)
  root:SetAttribute("OwnsInputAuthority",false)
  return root,letterbox,subtitles,skip
end

function M.Create(atomId, options)
  local id=string.upper(tostring(atomId or ""))
  if id=="BRAND_MARK" then return M.CreateBrandMark(options)
  elseif id=="LOADING_SPINNER" then return M.CreateLoadingSpinner(options)
  elseif id=="LOADING_SCREEN" then return M.CreateLoadingScreen(options)
  elseif id=="BRAND_SPLASH" then return M.CreateBrandSplash(options)
  elseif id=="MAIN_MENU_SHELL" then return M.CreateMainMenuShell(options)
  elseif id=="TOP_BAR" then return M.CreateTopBar(options)
  elseif id=="SIDE_NAVIGATION" then return M.CreateSideNavigation(options)
  elseif id=="SEARCH_FILTER_BAR" then return M.CreateSearchFilterBar(options)
  elseif id=="BREADCRUMB_BAR" then return M.CreateBreadcrumbBar(options)
  elseif id=="FOOTER_HINT_BAR" then return M.CreateFooterHintBar(options)
  elseif id=="PAUSE_MENU" then return M.CreatePauseMenuShell(options)
  elseif id=="SETTINGS_SCREEN" then return M.CreateSettingsScreenShell(options)
  elseif id=="INVENTORY_SCREEN" then return M.CreateInventoryScreenShell(options)
  elseif id=="CHARACTER_SCREEN" then return M.CreateCharacterScreenShell(options)
  elseif id=="MAP_SCREEN" then return M.CreateMapScreenShell(options)
  elseif id=="QUEST_LOG_SCREEN" then return M.CreateQuestLogScreenShell(options)
  elseif id=="CODEX_SCREEN" then return M.CreateCodexScreenShell(options)
  elseif id=="LETTERBOX" then return M.CreateLetterbox(options)
  elseif id=="SUBTITLE_PANEL" then return M.CreateSubtitlePanel(options)
  elseif id=="SKIP_PROMPT" then return M.CreateSkipPrompt(options)
  elseif id=="CHAPTER_CARD" then return M.CreateChapterCard(options)
  elseif id=="SCENE_TRANSITION" then return M.CreateSceneTransition(options)
  elseif id=="BOSS_TITLE_CARD" then return M.CreateBossTitleCard(options)
  elseif id=="REGION_TITLE_CARD" then return M.CreateRegionTitleCard(options)
  elseif id=="CINEMATIC_CHOICE_STRIP" then return M.CreateCinematicChoiceStrip(options)
  elseif id=="CUTSCENE_OVERLAY" then return M.CreateCutsceneOverlay(options)
  end
  error("UNKNOWN_COMMON_PRESENTATION_ATOM: "..tostring(atomId))
end

function M.Audit()
  return table.freeze({
    version=1,
    packId="roblox-common-presentation-v1",
    atomCount=26,
    stylePresetCount=7,
    stylePresets=table.freeze({"CINEMATIC_DARK","FANTASY_CARVED","SCI_FI_GLASS","HORROR_MUTED","COZY_SOFT","ARCADE_BOLD","MINIMAL_LIGHT"}),
    studioRequiredForInternalAudit=false,
    gameplayAuthority=false,
    cameraAuthority=false,
    inputAuthority=false,
    reducedMotionCompatible=true,
    subtitleSpeakerNameSupported=true,
    subtitleSpeakerDirectionSupported=true,
  })
end

return table.freeze(M)
