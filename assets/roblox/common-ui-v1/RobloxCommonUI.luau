-- 파일명: assets/roblox/common-ui-v1/RobloxCommonUI.luau
-- 역할: 모든 Roblox 게임에서 스타일만 바꿔 재사용하는 회사 공용 UI 베이스
-- 원칙: 표시/터치 피드백만 소유한다. 체력/보상/입력 권한/세이브/네트워크 권한은 게임 코드가 소유한다.

local RobloxCommonUI = {}

local DEFAULT_THEME = table.freeze({
  Panel = Color3.fromRGB(31, 36, 43),
  PanelRaised = Color3.fromRGB(44, 51, 61),
  PanelInset = Color3.fromRGB(21, 25, 30),
  Border = Color3.fromRGB(95, 109, 127),
  BorderBright = Color3.fromRGB(145, 158, 176),
  Text = Color3.fromRGB(240, 243, 247),
  MutedText = Color3.fromRGB(173, 181, 192),
  Primary = Color3.fromRGB(76, 120, 183),
  PrimaryTop = Color3.fromRGB(102, 146, 207),
  PrimaryBottom = Color3.fromRGB(52, 91, 151),
  Accent = Color3.fromRGB(108, 174, 225),
  Positive = Color3.fromRGB(91, 181, 120),
  Warning = Color3.fromRGB(224, 170, 69),
  Danger = Color3.fromRGB(214, 82, 76),
  Map = Color3.fromRGB(20, 29, 35),
  MapGrid = Color3.fromRGB(72, 89, 98),
  HealthGood = Color3.fromRGB(91, 181, 91),
  HealthWarn = Color3.fromRGB(220, 159, 54),
  HealthCritical = Color3.fromRGB(210, 76, 69),
  HealthTrack = Color3.fromRGB(55, 62, 69),
  Shadow = Color3.fromRGB(8, 10, 13),
  Corner = 14,
  TouchHeight = 48,
})

local function cloneTheme(theme)
  local out = {}
  for key, value in pairs(DEFAULT_THEME) do
    out[key] = value
  end
  for key, value in pairs(theme or {}) do
    if out[key] ~= nil then
      out[key] = value
    end
  end
  return out
end

local function tag(instance, atomId)
  instance:SetAttribute("StudioAssetId", atomId)
  instance:SetAttribute("StudioAssetPack", "roblox-common-ui-v1")
  instance:SetAttribute("StudioAssetFamily", "UI")
  instance:SetAttribute("CompanyCommonBase", true)
  instance:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  instance:SetAttribute("ProductionVerified", false)
  instance:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
  instance:SetAttribute("GameplayAuthority", false)
end

local function corner(parent, radius)
  local ui = Instance.new("UICorner")
  ui.CornerRadius = UDim.new(0, radius)
  ui.Parent = parent
  return ui
end

local function stroke(parent, color, thickness, transparency)
  local ui = Instance.new("UIStroke")
  ui.Color = color
  ui.Thickness = thickness
  ui.Transparency = transparency or 0
  ui.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  ui.Parent = parent
  return ui
end

local function gradient(parent, top, bottom, rotation)
  local ui = Instance.new("UIGradient")
  ui.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, top),
    ColorSequenceKeypoint.new(1, bottom),
  })
  ui.Rotation = rotation or 90
  ui.Parent = parent
  return ui
end

local function sizeConstraint(parent, minX, minY)
  local ui = Instance.new("UISizeConstraint")
  ui.MinSize = Vector2.new(minX or 0, minY or 0)
  ui.Parent = parent
  return ui
end

function RobloxCommonUI.CreateTheme(overrides)
  return table.freeze(cloneTheme(overrides))
end

function RobloxCommonUI.CreatePanel(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local frame = Instance.new("Frame")
  frame.Name = options.name or "CommonPanel"
  frame.Size = options.size or UDim2.fromOffset(320, 180)
  frame.BackgroundColor3 = theme.Panel
  frame.BorderSizePixel = 0
  frame.ClipsDescendants = options.clipsDescendants == true
  tag(frame, "FRAME_PANEL")

  corner(frame, tonumber(options.cornerRadius) or theme.Corner)
  stroke(frame, theme.Border, 1.5, 0.08)
  gradient(frame, theme.PanelRaised, theme.Panel, 90)

  local shadow = Instance.new("Frame")
  shadow.Name = "DepthShadow"
  shadow.AnchorPoint = Vector2.new(0.5, 0.5)
  shadow.Position = UDim2.new(0.5, 0, 0.5, 5)
  shadow.Size = UDim2.new(1, 4, 1, 4)
  shadow.BackgroundColor3 = theme.Shadow
  shadow.BackgroundTransparency = 0.46
  shadow.BorderSizePixel = 0
  shadow.ZIndex = math.max(0, frame.ZIndex - 1)
  shadow.Parent = frame
  corner(shadow, (tonumber(options.cornerRadius) or theme.Corner) + 2)

  local inner = Instance.new("Frame")
  inner.Name = "InnerSurface"
  inner.Position = UDim2.fromOffset(7, 7)
  inner.Size = UDim2.new(1, -14, 1, -14)
  inner.BackgroundColor3 = theme.PanelInset
  inner.BackgroundTransparency = 0.54
  inner.BorderSizePixel = 0
  inner.ZIndex = frame.ZIndex + 1
  inner.Parent = frame
  corner(inner, math.max(6, (tonumber(options.cornerRadius) or theme.Corner) - 4))
  stroke(inner, theme.BorderBright, 1, 0.72)

  frame:SetAttribute("PresentationRole", "COMMON_READABLE_PANEL")
  frame:SetAttribute("TouchSafe", true)
  return frame, inner
end

function RobloxCommonUI.CreatePrimaryButton(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local button = Instance.new("TextButton")
  button.Name = options.name or "PrimaryAction"
  button.Size = options.size or UDim2.fromOffset(180, theme.TouchHeight)
  button.BackgroundColor3 = theme.Primary
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.text or "확인")
  button.TextColor3 = theme.Text
  button.TextSize = tonumber(options.textSize) or 16
  button.TextWrapped = true
  button.Font = options.font or Enum.Font.GothamBold
  button.Selectable = true
  tag(button, "BUTTON_PRIMARY")

  corner(button, tonumber(options.cornerRadius) or 12)
  local outline = stroke(button, theme.BorderBright, 1.4, 0.06)
  gradient(button, theme.PrimaryTop, theme.PrimaryBottom, 90)
  sizeConstraint(button, tonumber(options.minWidth) or 112, tonumber(options.minHeight) or theme.TouchHeight)

  local sheen = Instance.new("Frame")
  sheen.Name = "TopSheen"
  sheen.Size = UDim2.new(1, -10, 0, 2)
  sheen.Position = UDim2.fromOffset(5, 5)
  sheen.BackgroundColor3 = Color3.new(1, 1, 1)
  sheen.BackgroundTransparency = 0.72
  sheen.BorderSizePixel = 0
  sheen.ZIndex = button.ZIndex + 1
  sheen.Parent = button
  corner(sheen, 2)

  local scale = Instance.new("UIScale")
  scale.Scale = 1
  scale.Parent = button

  button.MouseEnter:Connect(function()
    outline.Transparency = 0
    scale.Scale = 1.015
  end)
  button.MouseLeave:Connect(function()
    outline.Transparency = 0.06
    scale.Scale = 1
  end)
  button.MouseButton1Down:Connect(function()
    scale.Scale = 0.97
  end)
  button.MouseButton1Up:Connect(function()
    scale.Scale = 1
  end)

  button:SetAttribute("PresentationRole", "PRIMARY_TOUCH_ACTION")
  button:SetAttribute("MinimumTouchHeight", theme.TouchHeight)
  button:SetAttribute("OwnsGameplayAction", false)
  button:SetAttribute("OwnsRemoteAuthority", false)
  return button
end

function RobloxCommonUI.CreateHealthBar(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local root = Instance.new("Frame")
  root.Name = options.name or "HealthBar"
  root.Size = options.size or UDim2.fromOffset(220, 26)
  root.BackgroundColor3 = theme.HealthTrack
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, "BAR_HEALTH")

  corner(root, tonumber(options.cornerRadius) or 9)
  stroke(root, theme.Border, 1.2, 0.12)

  local fill = Instance.new("Frame")
  fill.Name = "Fill"
  fill.Size = UDim2.fromScale(1, 1)
  fill.BackgroundColor3 = theme.HealthGood
  fill.BorderSizePixel = 0
  fill.Parent = root
  corner(fill, tonumber(options.cornerRadius) or 9)
  local fillGradient = gradient(fill, theme.HealthGood:Lerp(Color3.new(1,1,1), 0.18), theme.HealthGood:Lerp(Color3.new(0,0,0), 0.20), 90)

  local label = Instance.new("TextLabel")
  label.Name = "Value"
  label.Size = UDim2.fromScale(1, 1)
  label.BackgroundTransparency = 1
  label.Text = tostring(options.text or "")
  label.TextColor3 = theme.Text
  label.TextSize = tonumber(options.textSize) or 12
  label.Font = options.font or Enum.Font.GothamBold
  label.ZIndex = root.ZIndex + 2
  label.Parent = root

  root:SetAttribute("PresentationRole", "HEALTH_STATUS_READOUT")
  root:SetAttribute("OwnsHealthValue", false)
  root:SetAttribute("OwnsDamageAuthority", false)

  local controller = {}

  function controller.SetRatio(ratio, labelText)
    local value = math.clamp(tonumber(ratio) or 0, 0, 1)
    fill.Size = UDim2.fromScale(value, 1)
    local base = value <= 0.25 and theme.HealthCritical or value <= 0.55 and theme.HealthWarn or theme.HealthGood
    fill.BackgroundColor3 = base
    fillGradient.Color = ColorSequence.new({
      ColorSequenceKeypoint.new(0, base:Lerp(Color3.new(1,1,1), 0.18)),
      ColorSequenceKeypoint.new(1, base:Lerp(Color3.new(0,0,0), 0.20)),
    })
    if labelText ~= nil then
      label.Text = tostring(labelText)
    end
    root:SetAttribute("DisplayedRatio", value)
  end

  controller.SetRatio(tonumber(options.ratio) or 1, options.text)
  return root, controller
end


function RobloxCommonUI.CreateInventorySlot(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local button = Instance.new("ImageButton")
  button.Name = options.name or "InventorySlot"
  button.Size = options.size or UDim2.fromOffset(64, 64)
  button.BackgroundColor3 = theme.PanelInset
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Image = ""
  button.Selectable = true
  tag(button, "INVENTORY_SLOT")

  corner(button, tonumber(options.cornerRadius) or 10)
  local outline = stroke(button, theme.Border, 1.3, 0.08)
  sizeConstraint(button, 52, 52)

  local icon = Instance.new("ImageLabel")
  icon.Name = "Icon"
  icon.Position = UDim2.fromOffset(7, 7)
  icon.Size = UDim2.new(1, -14, 1, -14)
  icon.BackgroundTransparency = 1
  icon.Image = tostring(options.image or "")
  icon.ScaleType = Enum.ScaleType.Fit
  icon.Parent = button

  local quantity = Instance.new("TextLabel")
  quantity.Name = "Quantity"
  quantity.AnchorPoint = Vector2.new(1, 1)
  quantity.Position = UDim2.new(1, -5, 1, -4)
  quantity.Size = UDim2.fromOffset(34, 18)
  quantity.BackgroundTransparency = 1
  quantity.Text = tostring(options.quantityText or "")
  quantity.TextColor3 = theme.Text
  quantity.TextSize = tonumber(options.textSize) or 12
  quantity.Font = options.font or Enum.Font.GothamBold
  quantity.TextXAlignment = Enum.TextXAlignment.Right
  quantity.Parent = button

  local selected = Instance.new("Frame")
  selected.Name = "SelectedRing"
  selected.Size = UDim2.fromScale(1, 1)
  selected.BackgroundTransparency = 1
  selected.Visible = options.selected == true
  selected.Parent = button
  corner(selected, tonumber(options.cornerRadius) or 10)
  stroke(selected, theme.PrimaryTop, 2.5, 0)

  button.MouseEnter:Connect(function()
    outline.Transparency = 0
  end)
  button.MouseLeave:Connect(function()
    outline.Transparency = 0.08
  end)

  button:SetAttribute("PresentationRole", "INVENTORY_SLOT")
  button:SetAttribute("OwnsInventoryAuthority", false)
  button:SetAttribute("OwnsEquipAuthority", false)
  return button, icon, quantity, selected
end

function RobloxCommonUI.CreateTooltip(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local root = Instance.new("Frame")
  root.Name = options.name or "Tooltip"
  root.Size = options.size or UDim2.fromOffset(260, 112)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  tag(root, "TOOLTIP")

  corner(root, tonumber(options.cornerRadius) or 10)
  stroke(root, theme.BorderBright, 1.2, 0.12)
  gradient(root, theme.PanelRaised, theme.Panel, 90)

  local title = Instance.new("TextLabel")
  title.Name = "Title"
  title.Position = UDim2.fromOffset(12, 10)
  title.Size = UDim2.new(1, -24, 0, 24)
  title.BackgroundTransparency = 1
  title.Text = tostring(options.title or "")
  title.TextColor3 = theme.Text
  title.TextSize = tonumber(options.titleSize) or 15
  title.Font = options.font or Enum.Font.GothamBold
  title.TextXAlignment = Enum.TextXAlignment.Left
  title.Parent = root

  local body = Instance.new("TextLabel")
  body.Name = "Body"
  body.Position = UDim2.fromOffset(12, 38)
  body.Size = UDim2.new(1, -24, 1, -48)
  body.BackgroundTransparency = 1
  body.Text = tostring(options.text or "")
  body.TextColor3 = theme.MutedText
  body.TextSize = tonumber(options.textSize) or 13
  body.Font = options.bodyFont or Enum.Font.Gotham
  body.TextWrapped = true
  body.TextXAlignment = Enum.TextXAlignment.Left
  body.TextYAlignment = Enum.TextYAlignment.Top
  body.Parent = root

  root:SetAttribute("PresentationRole", "CONTEXT_TOOLTIP")
  root:SetAttribute("OwnsGameplayDecision", false)
  return root, title, body
end

function RobloxCommonUI.CreateModal(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local dim = Instance.new("Frame")
  dim.Name = options.name or "Modal"
  dim.Size = UDim2.fromScale(1, 1)
  dim.BackgroundColor3 = theme.Shadow
  dim.BackgroundTransparency = tonumber(options.dimTransparency) or 0.28
  dim.BorderSizePixel = 0
  tag(dim, "MODAL")

  local panel = Instance.new("Frame")
  panel.Name = "Dialog"
  panel.AnchorPoint = Vector2.new(0.5, 0.5)
  panel.Position = UDim2.fromScale(0.5, 0.5)
  panel.Size = options.dialogSize or UDim2.fromOffset(340, 210)
  panel.BackgroundColor3 = theme.Panel
  panel.BorderSizePixel = 0
  panel.Parent = dim
  corner(panel, 16)
  stroke(panel, theme.BorderBright, 1.6, 0.06)
  gradient(panel, theme.PanelRaised, theme.Panel, 90)
  sizeConstraint(panel, 280, 170)

  local title = Instance.new("TextLabel")
  title.Name = "Title"
  title.Position = UDim2.fromOffset(18, 16)
  title.Size = UDim2.new(1, -36, 0, 30)
  title.BackgroundTransparency = 1
  title.Text = tostring(options.title or "")
  title.TextColor3 = theme.Text
  title.TextSize = 18
  title.Font = options.font or Enum.Font.GothamBold
  title.TextXAlignment = Enum.TextXAlignment.Left
  title.Parent = panel

  local body = Instance.new("TextLabel")
  body.Name = "Body"
  body.Position = UDim2.fromOffset(18, 54)
  body.Size = UDim2.new(1, -36, 1, -116)
  body.BackgroundTransparency = 1
  body.Text = tostring(options.text or "")
  body.TextColor3 = theme.MutedText
  body.TextSize = 14
  body.Font = options.bodyFont or Enum.Font.Gotham
  body.TextWrapped = true
  body.TextXAlignment = Enum.TextXAlignment.Left
  body.TextYAlignment = Enum.TextYAlignment.Top
  body.Parent = panel

  dim:SetAttribute("PresentationRole", "MODAL_DIALOG")
  dim:SetAttribute("OwnsPauseAuthority", false)
  dim:SetAttribute("OwnsConfirmationAuthority", false)
  return dim, panel, title, body
end

function RobloxCommonUI.CreateTabButton(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local button = Instance.new("TextButton")
  button.Name = options.name or "TabButton"
  button.Size = options.size or UDim2.fromOffset(124, 44)
  button.BackgroundColor3 = options.selected == true and theme.Primary or theme.PanelRaised
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.text or "탭")
  button.TextColor3 = theme.Text
  button.TextSize = tonumber(options.textSize) or 14
  button.Font = options.font or Enum.Font.GothamBold
  button.Selectable = true
  tag(button, "TAB_BUTTON")

  corner(button, 10)
  stroke(button, options.selected == true and theme.PrimaryTop or theme.Border, 1.2, 0.08)
  sizeConstraint(button, 92, 44)

  local underline = Instance.new("Frame")
  underline.Name = "SelectedUnderline"
  underline.AnchorPoint = Vector2.new(0.5, 1)
  underline.Position = UDim2.new(0.5, 0, 1, 0)
  underline.Size = UDim2.new(1, -20, 0, 3)
  underline.BackgroundColor3 = theme.PrimaryTop
  underline.BorderSizePixel = 0
  underline.Visible = options.selected == true
  underline.Parent = button
  corner(underline, 2)

  button:SetAttribute("PresentationRole", "TAB_NAVIGATION")
  button:SetAttribute("OwnsNavigationAuthority", false)
  return button, underline
end

function RobloxCommonUI.CreateQuestCard(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local root = Instance.new("Frame")
  root.Name = options.name or "QuestCard"
  root.Size = options.size or UDim2.fromOffset(320, 94)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  tag(root, "QUEST_CARD")

  corner(root, 12)
  stroke(root, theme.Border, 1.2, 0.10)

  local marker = Instance.new("Frame")
  marker.Name = "PriorityMarker"
  marker.Size = UDim2.fromOffset(5, 70)
  marker.Position = UDim2.fromOffset(9, 12)
  marker.BackgroundColor3 = theme.Primary
  marker.BorderSizePixel = 0
  marker.Parent = root
  corner(marker, 3)

  local title = Instance.new("TextLabel")
  title.Name = "Title"
  title.Position = UDim2.fromOffset(24, 12)
  title.Size = UDim2.new(1, -36, 0, 25)
  title.BackgroundTransparency = 1
  title.Text = tostring(options.title or "")
  title.TextColor3 = theme.Text
  title.TextSize = 15
  title.Font = options.font or Enum.Font.GothamBold
  title.TextXAlignment = Enum.TextXAlignment.Left
  title.Parent = root

  local detailLabel = Instance.new("TextLabel")
  detailLabel.Name = "Detail"
  detailLabel.Position = UDim2.fromOffset(24, 40)
  detailLabel.Size = UDim2.new(1, -36, 0, 20)
  detailLabel.BackgroundTransparency = 1
  detailLabel.Text = tostring(options.detail or "")
  detailLabel.TextColor3 = theme.MutedText
  detailLabel.TextSize = 13
  detailLabel.Font = options.bodyFont or Enum.Font.Gotham
  detailLabel.TextXAlignment = Enum.TextXAlignment.Left
  detailLabel.Parent = root

  local reward = Instance.new("TextLabel")
  reward.Name = "Reward"
  reward.Position = UDim2.fromOffset(24, 64)
  reward.Size = UDim2.new(1, -36, 0, 18)
  reward.BackgroundTransparency = 1
  reward.Text = tostring(options.rewardText or "")
  reward.TextColor3 = theme.PrimaryTop
  reward.TextSize = 12
  reward.Font = Enum.Font.GothamBold
  reward.TextXAlignment = Enum.TextXAlignment.Left
  reward.Parent = root

  root:SetAttribute("PresentationRole", "QUEST_SUMMARY")
  root:SetAttribute("OwnsQuestProgress", false)
  root:SetAttribute("OwnsRewardAuthority", false)
  return root, title, detailLabel, reward
end

function RobloxCommonUI.CreateCurrencyChip(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local root = Instance.new("Frame")
  root.Name = options.name or "CurrencyChip"
  root.Size = options.size or UDim2.fromOffset(142, 40)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "CURRENCY_CHIP")

  corner(root, 20)
  stroke(root, theme.Border, 1.1, 0.12)

  local icon = Instance.new("ImageLabel")
  icon.Name = "Icon"
  icon.Position = UDim2.fromOffset(8, 7)
  icon.Size = UDim2.fromOffset(26, 26)
  icon.BackgroundTransparency = 1
  icon.Image = tostring(options.image or "")
  icon.ScaleType = Enum.ScaleType.Fit
  icon.Parent = root

  local value = Instance.new("TextLabel")
  value.Name = "Value"
  value.Position = UDim2.fromOffset(40, 4)
  value.Size = UDim2.new(1, -48, 1, -8)
  value.BackgroundTransparency = 1
  value.Text = tostring(options.text or "0")
  value.TextColor3 = theme.Text
  value.TextSize = tonumber(options.textSize) or 14
  value.Font = options.font or Enum.Font.GothamBold
  value.TextXAlignment = Enum.TextXAlignment.Right
  value.Parent = root

  root:SetAttribute("PresentationRole", "CURRENCY_READOUT")
  root:SetAttribute("OwnsCurrencyValue", false)
  root:SetAttribute("OwnsEconomyAuthority", false)
  return root, icon, value
end

function RobloxCommonUI.CreateProgressBar(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local root = Instance.new("Frame")
  root.Name = options.name or "ProgressBar"
  root.Size = options.size or UDim2.fromOffset(250, 22)
  root.BackgroundColor3 = theme.HealthTrack
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, "BAR_PROGRESS")

  corner(root, 8)
  stroke(root, theme.Border, 1.1, 0.14)

  local fill = Instance.new("Frame")
  fill.Name = "Fill"
  fill.BackgroundColor3 = theme.Primary
  fill.BorderSizePixel = 0
  fill.Parent = root
  corner(fill, 8)
  gradient(fill, theme.PrimaryTop, theme.PrimaryBottom, 90)

  local label = Instance.new("TextLabel")
  label.Name = "Value"
  label.Size = UDim2.fromScale(1, 1)
  label.BackgroundTransparency = 1
  label.TextColor3 = theme.Text
  label.TextSize = tonumber(options.textSize) or 12
  label.Font = options.font or Enum.Font.GothamBold
  label.Parent = root

  local controller = {}
  function controller.SetRatio(ratio, labelText)
    local value = math.clamp(tonumber(ratio) or 0, 0, 1)
    fill.Size = UDim2.fromScale(value, 1)
    label.Text = labelText == nil and label.Text or tostring(labelText)
    root:SetAttribute("DisplayedRatio", value)
  end
  controller.SetRatio(tonumber(options.ratio) or 0, options.text or "")

  root:SetAttribute("PresentationRole", "GENERIC_PROGRESS_READOUT")
  root:SetAttribute("OwnsProgressValue", false)
  return root, controller
end

function RobloxCommonUI.CreateMobileActionButton(options)
  options = options or {}
  local theme = cloneTheme(options.theme)

  local button = Instance.new("TextButton")
  button.Name = options.name or "MobileActionButton"
  button.Size = options.size or UDim2.fromOffset(76, 76)
  button.BackgroundColor3 = theme.Primary
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.text or "액션")
  button.TextColor3 = theme.Text
  button.TextSize = tonumber(options.textSize) or 14
  button.TextWrapped = true
  button.Font = options.font or Enum.Font.GothamBold
  button.Selectable = true
  tag(button, "MOBILE_ACTION_BUTTON")

  corner(button, tonumber(options.cornerRadius) or 38)
  local outline = stroke(button, theme.BorderBright, 1.5, 0.04)
  gradient(button, theme.PrimaryTop, theme.PrimaryBottom, 90)
  sizeConstraint(button, 64, 64)

  local scale = Instance.new("UIScale")
  scale.Scale = 1
  scale.Parent = button
  button.MouseButton1Down:Connect(function()
    scale.Scale = 0.94
    outline.Transparency = 0
  end)
  button.MouseButton1Up:Connect(function()
    scale.Scale = 1
    outline.Transparency = 0.04
  end)

  button:SetAttribute("PresentationRole", "MOBILE_TOUCH_ACTION")
  button:SetAttribute("MinimumTouchHeight", 64)
  button:SetAttribute("OwnsGameplayAction", false)
  button:SetAttribute("OwnsRemoteAuthority", false)
  return button
end


local function commonText(parent, name, textValue, position, size, color, textSize, bold)
  local label = Instance.new("TextLabel")
  label.Name = name
  label.Position = position or UDim2.new()
  label.Size = size or UDim2.fromScale(1, 1)
  label.BackgroundTransparency = 1
  label.Text = tostring(textValue or "")
  label.TextColor3 = color or Color3.new(1, 1, 1)
  label.TextSize = tonumber(textSize) or 14
  label.TextWrapped = true
  label.TextXAlignment = Enum.TextXAlignment.Left
  label.TextYAlignment = Enum.TextYAlignment.Center
  label.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
  label.Parent = parent
  return label
end

local function commonIcon(parent, name, image, position, size)
  local icon = Instance.new("ImageLabel")
  icon.Name = name
  icon.Position = position or UDim2.new()
  icon.Size = size or UDim2.fromOffset(32, 32)
  icon.BackgroundTransparency = 1
  icon.Image = tostring(image or "")
  icon.ScaleType = Enum.ScaleType.Fit
  icon.Parent = parent
  return icon
end

local function commonList(parent, horizontal, padding)
  local layout = Instance.new("UIListLayout")
  layout.FillDirection = horizontal and Enum.FillDirection.Horizontal or Enum.FillDirection.Vertical
  layout.SortOrder = Enum.SortOrder.LayoutOrder
  layout.Padding = UDim.new(0, tonumber(padding) or 6)
  layout.VerticalAlignment = Enum.VerticalAlignment.Center
  layout.Parent = parent
  return layout
end

function RobloxCommonUI.CreateIconButton(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local button = Instance.new("ImageButton")
  button.Name = options.name or "IconButton"
  button.Size = options.size or UDim2.fromOffset(52, 52)
  button.BackgroundColor3 = theme.PanelRaised
  button.BorderSizePixel = 0
  button.Image = tostring(options.image or "")
  button.ScaleType = Enum.ScaleType.Fit
  button.Selectable = true
  tag(button, "ICON_BUTTON")
  corner(button, tonumber(options.cornerRadius) or 12)
  local outline = stroke(button, theme.Border, 1.2, 0.10)
  sizeConstraint(button, 48, 48)

  local badge = commonText(button, "Badge", options.badgeText or "", UDim2.new(1, -23, 0, 3), UDim2.fromOffset(20, 18), theme.Text, 10, true)
  badge.TextXAlignment = Enum.TextXAlignment.Center
  badge.BackgroundColor3 = theme.Danger
  badge.BackgroundTransparency = badge.Text == "" and 1 or 0
  corner(badge, 9)

  button.MouseButton1Down:Connect(function() outline.Transparency = 0 end)
  button.MouseButton1Up:Connect(function() outline.Transparency = 0.10 end)
  button:SetAttribute("PresentationRole", "ICON_ACTION")
  button:SetAttribute("OwnsGameplayAction", false)
  button:SetAttribute("OwnsRemoteAuthority", false)
  return button, badge
end

function RobloxCommonUI.CreateDialogueAssistantButton(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local button = Instance.new("TextButton")
  button.Name = options.name or "DialogueAssistantButton"
  button.Size = options.size or UDim2.fromOffset(64, 64)
  button.BackgroundColor3 = theme.Primary
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.shortLabel or "AI")
  button.TextColor3 = theme.Text
  button.TextSize = 17
  button.Font = Enum.Font.GothamBold
  button.Selectable = true
  tag(button, "DIALOGUE_ASSISTANT_BUTTON")
  corner(button, 32)
  stroke(button, theme.BorderBright, 1.5, 0.04)
  gradient(button, theme.PrimaryTop, theme.PrimaryBottom, 90)
  sizeConstraint(button, 56, 56)

  local ring = Instance.new("Frame")
  ring.Name = "AssistantRing"
  ring.AnchorPoint = Vector2.new(0.5, 0.5)
  ring.Position = UDim2.fromScale(0.5, 0.5)
  ring.Size = UDim2.new(1, -10, 1, -10)
  ring.BackgroundTransparency = 1
  ring.Parent = button
  corner(ring, 28)
  stroke(ring, theme.Accent, 1, 0.35)

  local status = Instance.new("Frame")
  status.Name = "StatusDot"
  status.AnchorPoint = Vector2.new(1, 0)
  status.Position = UDim2.new(1, -2, 0, 2)
  status.Size = UDim2.fromOffset(14, 14)
  status.BackgroundColor3 = options.available == false and theme.MutedText or theme.Positive
  status.BorderSizePixel = 0
  status.Parent = button
  corner(status, 7)
  stroke(status, theme.PanelInset, 2, 0)

  button:SetAttribute("PresentationRole", "AI_DIALOGUE_HELPER")
  button:SetAttribute("OwnsDialogueTruth", false)
  button:SetAttribute("OwnsGameplayAuthority", false)
  return button, status
end

function RobloxCommonUI.CreateDialoguePanel(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root, inner = RobloxCommonUI.CreatePanel({
    name = options.name or "DialoguePanel",
    size = options.size or UDim2.fromOffset(430, 184),
    theme = theme,
  })
  tag(root, "DIALOGUE_PANEL")

  local portrait = Instance.new("ImageLabel")
  portrait.Name = "Portrait"
  portrait.Position = UDim2.fromOffset(12, 12)
  portrait.Size = UDim2.fromOffset(78, 78)
  portrait.BackgroundColor3 = theme.PanelRaised
  portrait.BorderSizePixel = 0
  portrait.Image = tostring(options.portrait or "")
  portrait.ScaleType = Enum.ScaleType.Fit
  portrait.Parent = inner
  corner(portrait, 14)
  stroke(portrait, theme.BorderBright, 1.2, 0.10)

  local identity = Instance.new("Frame")
  identity.Name = "IdentityAccent"
  identity.Position = UDim2.fromOffset(12, 96)
  identity.Size = UDim2.fromOffset(78, 4)
  identity.BackgroundColor3 = options.accentColor or theme.Accent
  identity.BorderSizePixel = 0
  identity.Parent = inner
  corner(identity, 2)

  local speaker = commonText(inner, "Speaker", options.speaker or "", UDim2.fromOffset(102, 10), UDim2.new(1, -114, 0, 24), theme.Accent, 15, true)
  local role = commonText(inner, "Role", options.roleText or "", UDim2.fromOffset(102, 33), UDim2.new(1, -114, 0, 18), theme.MutedText, 11, false)
  local body = commonText(inner, "Body", options.text or "", UDim2.fromOffset(102, 55), UDim2.new(1, -114, 1, -68), theme.Text, 14, false)
  body.TextYAlignment = Enum.TextYAlignment.Top

  local continueHint = commonText(inner, "ContinueHint", options.continueText or "", UDim2.new(1, -132, 1, -24), UDim2.fromOffset(120, 18), theme.MutedText, 10, true)
  continueHint.TextXAlignment = Enum.TextXAlignment.Right

  root:SetAttribute("PresentationRole", "DIALOGUE_SURFACE")
  root:SetAttribute("OwnsDialogueState", false)
  root:SetAttribute("OwnsQuestAuthority", false)
  return root, inner, portrait, speaker, role, body, continueHint
end

function RobloxCommonUI.CreateDialogueChoice(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local button = Instance.new("TextButton")
  button.Name = options.name or "DialogueChoice"
  button.Size = options.size or UDim2.new(1, 0, 0, 48)
  button.BackgroundColor3 = theme.PanelRaised
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.text or "선택")
  button.TextColor3 = theme.Text
  button.TextSize = tonumber(options.textSize) or 14
  button.TextWrapped = true
  button.TextXAlignment = Enum.TextXAlignment.Left
  button.Font = Enum.Font.GothamMedium
  button.Selectable = true
  tag(button, "DIALOGUE_CHOICE")
  corner(button, 10)
  local outline = stroke(button, theme.Border, 1.2, 0.10)
  sizeConstraint(button, 160, 48)
  local pad = Instance.new("UIPadding")
  pad.PaddingLeft = UDim.new(0, 14)
  pad.PaddingRight = UDim.new(0, 12)
  pad.Parent = button
  local marker = Instance.new("Frame")
  marker.Name = "ChoiceMarker"
  marker.Size = UDim2.fromOffset(4, 28)
  marker.Position = UDim2.fromOffset(5, 10)
  marker.BackgroundColor3 = options.accentColor or theme.PrimaryTop
  marker.BorderSizePixel = 0
  marker.Parent = button
  corner(marker, 2)
  button.MouseEnter:Connect(function() outline.Color = theme.PrimaryTop end)
  button.MouseLeave:Connect(function() outline.Color = theme.Border end)
  button:SetAttribute("PresentationRole", "DIALOGUE_CHOICE")
  button:SetAttribute("OwnsDialogueBranchAuthority", false)
  return button
end

function RobloxCommonUI.CreateDialogueInput(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "DialogueInput"
  root.Size = options.size or UDim2.fromOffset(430, 54)
  root.BackgroundColor3 = theme.PanelInset
  root.BorderSizePixel = 0
  tag(root, "DIALOGUE_INPUT")
  corner(root, 12)
  stroke(root, theme.Border, 1.2, 0.12)

  local input = Instance.new("TextBox")
  input.Name = "Input"
  input.Position = UDim2.fromOffset(12, 5)
  input.Size = UDim2.new(1, -78, 1, -10)
  input.BackgroundTransparency = 1
  input.ClearTextOnFocus = false
  input.MultiLine = false
  input.PlaceholderText = tostring(options.placeholder or "말을 입력...")
  input.PlaceholderColor3 = theme.MutedText
  input.Text = tostring(options.text or "")
  input.TextColor3 = theme.Text
  input.TextSize = tonumber(options.textSize) or 14
  input.TextXAlignment = Enum.TextXAlignment.Left
  input.Font = Enum.Font.Gotham
  input.Parent = root

  local send = Instance.new("TextButton")
  send.Name = "Send"
  send.AnchorPoint = Vector2.new(1, 0.5)
  send.Position = UDim2.new(1, -6, 0.5, 0)
  send.Size = UDim2.fromOffset(56, 42)
  send.BackgroundColor3 = theme.Primary
  send.BorderSizePixel = 0
  send.AutoButtonColor = false
  send.Text = tostring(options.sendText or "전송")
  send.TextColor3 = theme.Text
  send.TextSize = 12
  send.Font = Enum.Font.GothamBold
  send.Parent = root
  corner(send, 10)
  gradient(send, theme.PrimaryTop, theme.PrimaryBottom, 90)

  root:SetAttribute("PresentationRole", "DIALOGUE_TEXT_INPUT")
  root:SetAttribute("OwnsChatTransport", false)
  root:SetAttribute("OwnsRemoteAuthority", false)
  return root, input, send
end

function RobloxCommonUI.CreateTypingIndicator(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "TypingIndicator"
  root.Size = options.size or UDim2.fromOffset(64, 30)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "TYPING_INDICATOR")
  corner(root, 15)
  stroke(root, theme.Border, 1, 0.18)

  local dots = {}
  for i = 1, 3 do
    local dot = Instance.new("Frame")
    dot.Name = "Dot" .. i
    dot.Size = UDim2.fromOffset(7, 7)
    dot.Position = UDim2.fromOffset(14 + (i - 1) * 15, 12)
    dot.BackgroundColor3 = theme.Accent
    dot.BackgroundTransparency = 0.18 + (i - 1) * 0.16
    dot.BorderSizePixel = 0
    dot.Parent = root
    corner(dot, 4)
    dots[i] = dot
  end

  local controller = {}
  function controller.SetActive(active)
    root.Visible = active == true
    root:SetAttribute("Typing", active == true)
  end
  controller.SetActive(options.active ~= false)
  root:SetAttribute("PresentationRole", "DIALOGUE_TYPING_STATE")
  return root, controller
end

function RobloxCommonUI.CreateDialogueHistory(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("ScrollingFrame")
  root.Name = options.name or "DialogueHistory"
  root.Size = options.size or UDim2.fromOffset(430, 230)
  root.BackgroundColor3 = theme.PanelInset
  root.BackgroundTransparency = 0.08
  root.BorderSizePixel = 0
  root.CanvasSize = UDim2.fromOffset(0, 0)
  root.AutomaticCanvasSize = Enum.AutomaticSize.Y
  root.ScrollBarThickness = 5
  root.ScrollBarImageColor3 = theme.BorderBright
  tag(root, "DIALOGUE_HISTORY")
  corner(root, 12)
  stroke(root, theme.Border, 1, 0.16)
  commonList(root, false, 8)

  local padding = Instance.new("UIPadding")
  padding.PaddingTop = UDim.new(0, 10)
  padding.PaddingBottom = UDim.new(0, 10)
  padding.PaddingLeft = UDim.new(0, 10)
  padding.PaddingRight = UDim.new(0, 10)
  padding.Parent = root

  local controller = {}
  function controller.AddEntry(speakerText, bodyText, isPlayer)
    local entry = Instance.new("Frame")
    entry.Name = "Entry"
    entry.Size = UDim2.new(1, -4, 0, 64)
    entry.BackgroundColor3 = isPlayer and theme.PrimaryBottom or theme.PanelRaised
    entry.BackgroundTransparency = 0.10
    entry.BorderSizePixel = 0
    entry.AutomaticSize = Enum.AutomaticSize.Y
    entry.Parent = root
    corner(entry, 10)
    local speaker = commonText(entry, "Speaker", speakerText, UDim2.fromOffset(10, 6), UDim2.new(1, -20, 0, 18), isPlayer and theme.Text or theme.Accent, 11, true)
    local body = commonText(entry, "Body", bodyText, UDim2.fromOffset(10, 25), UDim2.new(1, -20, 0, 32), theme.Text, 13, false)
    body.AutomaticSize = Enum.AutomaticSize.Y
    return entry, speaker, body
  end
  root:SetAttribute("PresentationRole", "DIALOGUE_HISTORY")
  root:SetAttribute("OwnsConversationMemory", false)
  return root, controller
end

function RobloxCommonUI.CreateNpcInteractionPrompt(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "NpcInteractionPrompt"
  root.Size = options.size or UDim2.fromOffset(300, 64)
  root.BackgroundColor3 = theme.Panel
  root.BackgroundTransparency = 0.06
  root.BorderSizePixel = 0
  tag(root, "NPC_INTERACTION_PROMPT")
  corner(root, 14)
  stroke(root, theme.BorderBright, 1.3, 0.10)
  gradient(root, theme.PanelRaised, theme.Panel, 90)

  local key = commonText(root, "Key", options.keyText or "E", UDim2.fromOffset(10, 10), UDim2.fromOffset(44, 44), theme.Text, 16, true)
  key.TextXAlignment = Enum.TextXAlignment.Center
  key.BackgroundColor3 = theme.Primary
  key.BackgroundTransparency = 0
  corner(key, 11)
  stroke(key, theme.PrimaryTop, 1, 0.05)

  local title = commonText(root, "Title", options.title or "대화하기", UDim2.fromOffset(66, 9), UDim2.new(1, -76, 0, 24), theme.Text, 14, true)
  local subtitle = commonText(root, "Subtitle", options.subtitle or "", UDim2.fromOffset(66, 32), UDim2.new(1, -76, 0, 18), theme.MutedText, 11, false)
  root:SetAttribute("PresentationRole", "NPC_INTERACTION_PROMPT")
  root:SetAttribute("InteractionId", tostring(options.interactionId or ""))
  root:SetAttribute("OwnsInteractionAuthority", false)
  return root, key, title, subtitle
end

function RobloxCommonUI.CreateNpcInteractionMenu(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root, inner = RobloxCommonUI.CreatePanel({
    name = options.name or "NpcInteractionMenu",
    size = options.size or UDim2.fromOffset(330, 300),
    theme = theme,
  })
  tag(root, "NPC_INTERACTION_MENU")

  commonText(inner, "Title", options.title or "상호작용", UDim2.fromOffset(12, 8), UDim2.new(1, -24, 0, 26), theme.Text, 17, true)
  commonText(inner, "NpcName", options.npcName or "", UDim2.fromOffset(12, 34), UDim2.new(1, -24, 0, 18), theme.Accent, 12, true)

  local list = Instance.new("Frame")
  list.Name = "Actions"
  list.Position = UDim2.fromOffset(12, 62)
  list.Size = UDim2.new(1, -24, 1, -74)
  list.BackgroundTransparency = 1
  list.Parent = inner
  commonList(list, false, 7)

  local buttons = {}
  for index, action in ipairs(options.actions or {
    {id="TALK", label="대화"},
    {id="QUEST", label="의뢰"},
    {id="TRADE", label="거래"},
    {id="GIVE_ITEM", label="아이템 전달"},
  }) do
    local button = RobloxCommonUI.CreateDialogueChoice({
      name = tostring(action.id or ("Action" .. index)),
      text = tostring(action.label or action.id or "상호작용"),
      theme = theme,
      size = UDim2.new(1, 0, 0, 46),
    })
    button.LayoutOrder = index
    button.Parent = list
    button:SetAttribute("InteractionActionId", tostring(action.id or index))
    button:SetAttribute("Locked", action.locked == true)
    if action.locked == true then
      button.TextColor3 = theme.MutedText
      button.BackgroundTransparency = 0.45
    end
    buttons[index] = button
  end
  root:SetAttribute("PresentationRole", "NPC_INTERACTION_MENU")
  root:SetAttribute("OwnsInteractionAuthority", false)
  root:SetAttribute("OwnsQuestAuthority", false)
  root:SetAttribute("OwnsTradeAuthority", false)
  return root, inner, list, buttons
end

function RobloxCommonUI.CreateNpcRelationshipCard(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "NpcRelationshipCard"
  root.Size = options.size or UDim2.fromOffset(300, 92)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "NPC_RELATIONSHIP_CARD")
  corner(root, 12)
  stroke(root, theme.Border, 1.1, 0.12)

  local portrait = commonIcon(root, "Portrait", options.portrait, UDim2.fromOffset(10, 10), UDim2.fromOffset(58, 58))
  portrait.BackgroundColor3 = theme.PanelInset
  portrait.BackgroundTransparency = 0
  corner(portrait, 10)

  commonText(root, "Name", options.npcName or "", UDim2.fromOffset(80, 8), UDim2.new(1, -90, 0, 22), theme.Text, 14, true)
  commonText(root, "Relationship", options.relationshipText or "", UDim2.fromOffset(80, 29), UDim2.new(1, -90, 0, 18), theme.Accent, 11, true)
  commonText(root, "Mood", options.moodText or "", UDim2.fromOffset(80, 49), UDim2.new(1, -90, 0, 18), theme.MutedText, 11, false)

  local track = Instance.new("Frame")
  track.Name = "RelationshipTrack"
  track.Position = UDim2.fromOffset(80, 70)
  track.Size = UDim2.new(1, -92, 0, 8)
  track.BackgroundColor3 = theme.HealthTrack
  track.BorderSizePixel = 0
  track.Parent = root
  corner(track, 4)
  local fill = Instance.new("Frame")
  fill.Name = "Fill"
  fill.Size = UDim2.fromScale(math.clamp(tonumber(options.ratio) or 0, 0, 1), 1)
  fill.BackgroundColor3 = options.accentColor or theme.Accent
  fill.BorderSizePixel = 0
  fill.Parent = track
  corner(fill, 4)

  root:SetAttribute("PresentationRole", "NPC_RELATIONSHIP_READOUT")
  root:SetAttribute("OwnsRelationshipValue", false)
  return root, portrait, track, fill
end

function RobloxCommonUI.CreateInventoryGrid(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "InventoryGrid"
  root.Size = options.size or UDim2.fromOffset(316, 244)
  root.BackgroundColor3 = theme.PanelInset
  root.BackgroundTransparency = 0.18
  root.BorderSizePixel = 0
  tag(root, "INVENTORY_GRID")
  corner(root, 12)
  stroke(root, theme.Border, 1.1, 0.14)

  local grid = Instance.new("UIGridLayout")
  grid.CellSize = options.cellSize or UDim2.fromOffset(64, 64)
  grid.CellPadding = options.cellPadding or UDim2.fromOffset(8, 8)
  grid.SortOrder = Enum.SortOrder.LayoutOrder
  grid.HorizontalAlignment = Enum.HorizontalAlignment.Center
  grid.VerticalAlignment = Enum.VerticalAlignment.Top
  grid.Parent = root
  local padding = Instance.new("UIPadding")
  padding.PaddingTop = UDim.new(0, 10)
  padding.PaddingBottom = UDim.new(0, 10)
  padding.PaddingLeft = UDim.new(0, 10)
  padding.PaddingRight = UDim.new(0, 10)
  padding.Parent = root

  local slots = {}
  local count = math.clamp(tonumber(options.slotCount) or 12, 1, 60)
  for index = 1, count do
    local slot = RobloxCommonUI.CreateInventorySlot({name="Slot"..index, theme=theme})
    slot.LayoutOrder = index
    slot.Parent = root
    slots[index] = slot
  end
  root:SetAttribute("PresentationRole", "INVENTORY_GRID")
  root:SetAttribute("OwnsInventoryAuthority", false)
  return root, grid, slots
end

function RobloxCommonUI.CreateEquipmentSlot(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local button, icon, quantity, selected = RobloxCommonUI.CreateInventorySlot(options)
  button.Name = options.name or "EquipmentSlot"
  tag(button, "EQUIPMENT_SLOT")
  quantity.Text = tostring(options.label or "")
  quantity.TextColor3 = theme.MutedText
  button:SetAttribute("PresentationRole", "EQUIPMENT_SLOT")
  button:SetAttribute("EquipmentRole", tostring(options.role or "GENERIC"))
  button:SetAttribute("OwnsEquipAuthority", false)
  return button, icon, quantity, selected
end

function RobloxCommonUI.CreateCharacterSheet(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root, inner = RobloxCommonUI.CreatePanel({
    name = options.name or "CharacterSheet",
    size = options.size or UDim2.fromOffset(430, 330),
    theme = theme,
  })
  tag(root, "CHARACTER_SHEET")

  local portrait = Instance.new("ImageLabel")
  portrait.Name = "Portrait"
  portrait.Position = UDim2.fromOffset(14, 14)
  portrait.Size = UDim2.fromOffset(112, 112)
  portrait.BackgroundColor3 = theme.PanelRaised
  portrait.BorderSizePixel = 0
  portrait.Image = tostring(options.portrait or "")
  portrait.ScaleType = Enum.ScaleType.Fit
  portrait.Parent = inner
  corner(portrait, 14)
  stroke(portrait, theme.Border, 1.2, 0.08)

  commonText(inner, "CharacterName", options.characterName or "캐릭터", UDim2.fromOffset(140, 16), UDim2.new(1, -154, 0, 28), theme.Text, 18, true)
  commonText(inner, "Class", options.classText or "", UDim2.fromOffset(140, 46), UDim2.new(1, -154, 0, 20), theme.Accent, 12, true)
  commonText(inner, "Level", options.levelText or "", UDim2.fromOffset(140, 68), UDim2.new(1, -154, 0, 20), theme.MutedText, 12, false)

  local stats = Instance.new("Frame")
  stats.Name = "Stats"
  stats.Position = UDim2.fromOffset(14, 142)
  stats.Size = UDim2.new(1, -28, 1, -156)
  stats.BackgroundColor3 = theme.PanelInset
  stats.BackgroundTransparency = 0.18
  stats.BorderSizePixel = 0
  stats.Parent = inner
  corner(stats, 12)
  stroke(stats, theme.Border, 1, 0.18)
  local list = commonList(stats, false, 4)
  list.VerticalAlignment = Enum.VerticalAlignment.Top
  local pad = Instance.new("UIPadding")
  pad.PaddingTop = UDim.new(0, 8)
  pad.PaddingLeft = UDim.new(0, 10)
  pad.PaddingRight = UDim.new(0, 10)
  pad.Parent = stats

  local rows = {}
  for index, row in ipairs(options.stats or {}) do
    local line = Instance.new("Frame")
    line.Name = tostring(row.id or ("Stat" .. index))
    line.Size = UDim2.new(1, 0, 0, 26)
    line.BackgroundTransparency = 1
    line.LayoutOrder = index
    line.Parent = stats
    commonText(line, "Label", row.label or row.id or "", UDim2.new(), UDim2.new(0.58, 0, 1, 0), theme.MutedText, 12, false)
    local value = commonText(line, "Value", row.value or "", UDim2.new(0.58, 0, 0, 0), UDim2.new(0.42, 0, 1, 0), theme.Text, 12, true)
    value.TextXAlignment = Enum.TextXAlignment.Right
    rows[index] = line
  end
  root:SetAttribute("PresentationRole", "CHARACTER_SHEET")
  root:SetAttribute("OwnsStatsAuthority", false)
  root:SetAttribute("OwnsProgressionAuthority", false)
  return root, inner, portrait, stats, rows
end

function RobloxCommonUI.CreateMinimap(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "Minimap"
  root.Size = options.size or UDim2.fromOffset(180, 180)
  root.BackgroundColor3 = theme.Map
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, "MINIMAP")
  corner(root, tonumber(options.cornerRadius) or 18)
  stroke(root, theme.BorderBright, 1.4, 0.08)

  for i = 1, 3 do
    local vertical = Instance.new("Frame")
    vertical.Name = "GridV" .. i
    vertical.Position = UDim2.new(i / 4, 0, 0, 0)
    vertical.Size = UDim2.new(0, 1, 1, 0)
    vertical.BackgroundColor3 = theme.MapGrid
    vertical.BackgroundTransparency = 0.60
    vertical.BorderSizePixel = 0
    vertical.Parent = root

    local horizontal = Instance.new("Frame")
    horizontal.Name = "GridH" .. i
    horizontal.Position = UDim2.new(0, 0, i / 4, 0)
    horizontal.Size = UDim2.new(1, 0, 0, 1)
    horizontal.BackgroundColor3 = theme.MapGrid
    horizontal.BackgroundTransparency = 0.60
    horizontal.BorderSizePixel = 0
    horizontal.Parent = root
  end

  local player = Instance.new("Frame")
  player.Name = "PlayerMarker"
  player.AnchorPoint = Vector2.new(0.5, 0.5)
  player.Position = UDim2.fromScale(0.5, 0.5)
  player.Size = UDim2.fromOffset(12, 12)
  player.BackgroundColor3 = theme.Accent
  player.BorderSizePixel = 0
  player.Parent = root
  corner(player, 6)
  stroke(player, theme.Text, 1, 0.12)

  local objective = Instance.new("Frame")
  objective.Name = "ObjectiveMarker"
  objective.AnchorPoint = Vector2.new(0.5, 0.5)
  objective.Position = UDim2.fromScale(0.75, 0.32)
  objective.Size = UDim2.fromOffset(10, 10)
  objective.BackgroundColor3 = theme.Warning
  objective.BorderSizePixel = 0
  objective.Parent = root
  corner(objective, 2)

  local controller = {}
  function controller.SetPlayerNormalized(x, y)
    player.Position = UDim2.fromScale(math.clamp(tonumber(x) or 0.5, 0, 1), math.clamp(tonumber(y) or 0.5, 0, 1))
  end
  function controller.SetObjectiveNormalized(x, y, visible)
    objective.Position = UDim2.fromScale(math.clamp(tonumber(x) or 0.5, 0, 1), math.clamp(tonumber(y) or 0.5, 0, 1))
    objective.Visible = visible ~= false
  end
  root:SetAttribute("PresentationRole", "MINIMAP")
  root:SetAttribute("OwnsWorldPosition", false)
  root:SetAttribute("OwnsNavigationAuthority", false)
  return root, player, objective, controller
end

function RobloxCommonUI.CreateQuestTracker(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "QuestTracker"
  root.Size = options.size or UDim2.fromOffset(300, 128)
  root.BackgroundColor3 = theme.Panel
  root.BackgroundTransparency = 0.06
  root.BorderSizePixel = 0
  tag(root, "QUEST_TRACKER")
  corner(root, 12)
  stroke(root, theme.Border, 1.1, 0.14)

  local marker = Instance.new("Frame")
  marker.Name = "Marker"
  marker.Size = UDim2.fromOffset(5, 104)
  marker.Position = UDim2.fromOffset(10, 12)
  marker.BackgroundColor3 = options.accentColor or theme.Warning
  marker.BorderSizePixel = 0
  marker.Parent = root
  corner(marker, 3)

  commonText(root, "Title", options.title or "퀘스트", UDim2.fromOffset(26, 10), UDim2.new(1, -36, 0, 24), theme.Text, 15, true)
  commonText(root, "Objective", options.objective or "", UDim2.fromOffset(26, 36), UDim2.new(1, -36, 0, 42), theme.MutedText, 12, false)
  local progress = RobloxCommonUI.CreateProgressBar({name="Progress", size=UDim2.new(1, -42, 0, 18), theme=theme, ratio=options.ratio or 0, text=options.progressText or ""})
  progress.Position = UDim2.fromOffset(26, 88)
  progress.Parent = root

  root:SetAttribute("PresentationRole", "QUEST_TRACKER")
  root:SetAttribute("OwnsQuestProgress", false)
  root:SetAttribute("OwnsRewardAuthority", false)
  return root, progress
end

function RobloxCommonUI.CreatePartyMemberCard(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "PartyMemberCard"
  root.Size = options.size or UDim2.fromOffset(270, 76)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "PARTY_MEMBER_CARD")
  corner(root, 11)
  stroke(root, theme.Border, 1, 0.14)

  local portrait = commonIcon(root, "Portrait", options.portrait, UDim2.fromOffset(8, 8), UDim2.fromOffset(54, 54))
  portrait.BackgroundColor3 = theme.PanelInset
  portrait.BackgroundTransparency = 0
  corner(portrait, 10)

  commonText(root, "Name", options.memberName or "", UDim2.fromOffset(72, 8), UDim2.new(1, -82, 0, 20), theme.Text, 13, true)
  commonText(root, "Role", options.roleText or "", UDim2.fromOffset(72, 28), UDim2.new(1, -82, 0, 16), theme.MutedText, 10, false)
  local health = RobloxCommonUI.CreateHealthBar({name="Health", size=UDim2.new(1, -84, 0, 16), theme=theme, ratio=options.healthRatio or 1})
  health.Position = UDim2.fromOffset(72, 49)
  health.Parent = root

  root:SetAttribute("PresentationRole", "PARTY_MEMBER_STATUS")
  root:SetAttribute("OwnsPartyAuthority", false)
  root:SetAttribute("OwnsHealthValue", false)
  return root, portrait, health
end

function RobloxCommonUI.CreateCraftingRecipeCard(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "CraftingRecipeCard"
  root.Size = options.size or UDim2.fromOffset(330, 108)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "CRAFTING_RECIPE_CARD")
  corner(root, 12)
  stroke(root, options.craftable == false and theme.Danger or theme.Border, 1.1, 0.12)

  local icon = commonIcon(root, "Icon", options.image, UDim2.fromOffset(10, 10), UDim2.fromOffset(70, 70))
  icon.BackgroundColor3 = theme.PanelInset
  icon.BackgroundTransparency = 0
  corner(icon, 10)
  commonText(root, "Name", options.itemName or "", UDim2.fromOffset(92, 10), UDim2.new(1, -104, 0, 22), theme.Text, 14, true)
  commonText(root, "Ingredients", options.ingredientsText or "", UDim2.fromOffset(92, 35), UDim2.new(1, -104, 0, 36), theme.MutedText, 11, false)

  local action = RobloxCommonUI.CreatePrimaryButton({name="Craft", text=options.actionText or "제작", size=UDim2.fromOffset(92, 32), minWidth=86, minHeight=32, textSize=11, theme=theme})
  action.AnchorPoint = Vector2.new(1, 1)
  action.Position = UDim2.new(1, -10, 1, -10)
  action.Parent = root
  action:SetAttribute("OwnsCraftAuthority", false)

  root:SetAttribute("PresentationRole", "CRAFTING_RECIPE")
  root:SetAttribute("OwnsInventoryAuthority", false)
  return root, icon, action
end

function RobloxCommonUI.CreateShopItemCard(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "ShopItemCard"
  root.Size = options.size or UDim2.fromOffset(260, 142)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "SHOP_ITEM_CARD")
  corner(root, 12)
  stroke(root, theme.Border, 1.1, 0.12)

  local icon = commonIcon(root, "Icon", options.image, UDim2.fromOffset(10, 10), UDim2.fromOffset(64, 64))
  icon.BackgroundColor3 = theme.PanelInset
  icon.BackgroundTransparency = 0
  corner(icon, 10)

  commonText(root, "Name", options.itemName or "", UDim2.fromOffset(84, 10), UDim2.new(1, -94, 0, 22), theme.Text, 14, true)
  commonText(root, "Description", options.description or "", UDim2.fromOffset(84, 34), UDim2.new(1, -94, 0, 38), theme.MutedText, 10, false)
  commonText(root, "Price", options.priceText or "", UDim2.fromOffset(12, 86), UDim2.new(0.5, -16, 0, 30), theme.Warning, 13, true)

  local buy = RobloxCommonUI.CreatePrimaryButton({name="Buy", text=options.actionText or "구매", size=UDim2.fromOffset(96, 34), minWidth=90, minHeight=34, textSize=11, theme=theme})
  buy.AnchorPoint = Vector2.new(1, 1)
  buy.Position = UDim2.new(1, -10, 1, -10)
  buy.Parent = root
  buy:SetAttribute("OwnsEconomyAuthority", false)

  root:SetAttribute("PresentationRole", "SHOP_ITEM")
  root:SetAttribute("OwnsPurchaseAuthority", false)
  return root, icon, buy
end

function RobloxCommonUI.CreateNotificationToast(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local kind = string.upper(tostring(options.kind or "INFO"))
  local accent = kind == "SUCCESS" and theme.Positive or kind == "WARNING" and theme.Warning or kind == "ERROR" and theme.Danger or theme.Accent
  local root = Instance.new("Frame")
  root.Name = options.name or "NotificationToast"
  root.Size = options.size or UDim2.fromOffset(330, 72)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  tag(root, "NOTIFICATION_TOAST")
  corner(root, 12)
  stroke(root, accent, 1.3, 0.06)

  local marker = Instance.new("Frame")
  marker.Name = "Accent"
  marker.Size = UDim2.fromOffset(5, 52)
  marker.Position = UDim2.fromOffset(10, 10)
  marker.BackgroundColor3 = accent
  marker.BorderSizePixel = 0
  marker.Parent = root
  corner(marker, 3)
  commonText(root, "Title", options.title or "", UDim2.fromOffset(26, 9), UDim2.new(1, -36, 0, 22), theme.Text, 13, true)
  commonText(root, "Body", options.text or "", UDim2.fromOffset(26, 31), UDim2.new(1, -36, 0, 30), theme.MutedText, 11, false)

  root:SetAttribute("PresentationRole", "NOTIFICATION_TOAST")
  root:SetAttribute("NotificationKind", kind)
  root:SetAttribute("OwnsNotificationEvent", false)
  return root
end

function RobloxCommonUI.CreateStatusEffectChip(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "StatusEffectChip"
  root.Size = options.size or UDim2.fromOffset(116, 38)
  root.BackgroundColor3 = theme.PanelRaised
  root.BorderSizePixel = 0
  tag(root, "STATUS_EFFECT_CHIP")
  corner(root, 10)
  stroke(root, options.debuff == true and theme.Danger or theme.Border, 1, 0.12)

  commonIcon(root, "Icon", options.image, UDim2.fromOffset(6, 6), UDim2.fromOffset(26, 26))
  commonText(root, "Label", options.text or "", UDim2.fromOffset(38, 4), UDim2.new(1, -44, 0, 18), theme.Text, 10, true)
  local timer = commonText(root, "Timer", options.timeText or "", UDim2.fromOffset(38, 20), UDim2.new(1, -44, 0, 14), theme.MutedText, 9, false)

  root:SetAttribute("PresentationRole", "STATUS_EFFECT")
  root:SetAttribute("OwnsStatusAuthority", false)
  return root, timer
end

function RobloxCommonUI.CreateHotbar(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "Hotbar"
  root.Size = options.size or UDim2.fromOffset(430, 72)
  root.BackgroundColor3 = theme.Panel
  root.BackgroundTransparency = 0.08
  root.BorderSizePixel = 0
  tag(root, "HOTBAR")
  corner(root, 14)
  stroke(root, theme.Border, 1.2, 0.12)

  local holder = Instance.new("Frame")
  holder.Name = "Slots"
  holder.Position = UDim2.fromOffset(8, 8)
  holder.Size = UDim2.new(1, -16, 1, -16)
  holder.BackgroundTransparency = 1
  holder.Parent = root
  local list = commonList(holder, true, 6)
  list.HorizontalAlignment = Enum.HorizontalAlignment.Center

  local slots = {}
  local count = math.clamp(tonumber(options.slotCount) or 6, 1, 10)
  for index = 1, count do
    local slot = RobloxCommonUI.CreateInventorySlot({name="HotbarSlot"..index, size=UDim2.fromOffset(54,54), theme=theme})
    slot.LayoutOrder = index
    slot.Parent = holder
    slot:SetAttribute("HotbarIndex", index)
    slots[index] = slot
  end
  root:SetAttribute("PresentationRole", "HOTBAR")
  root:SetAttribute("OwnsEquipAuthority", false)
  root:SetAttribute("OwnsInputAuthority", false)
  return root, holder, slots
end

function RobloxCommonUI.Create(atomId, options)
  local id = string.upper(tostring(atomId or ""))
  if id == "FRAME_PANEL" then
    return RobloxCommonUI.CreatePanel(options)
  elseif id == "BUTTON_PRIMARY" then
    return RobloxCommonUI.CreatePrimaryButton(options)
  elseif id == "BAR_HEALTH" then
    return RobloxCommonUI.CreateHealthBar(options)
  elseif id == "INVENTORY_SLOT" then
    return RobloxCommonUI.CreateInventorySlot(options)
  elseif id == "TOOLTIP" then
    return RobloxCommonUI.CreateTooltip(options)
  elseif id == "MODAL" then
    return RobloxCommonUI.CreateModal(options)
  elseif id == "TAB_BUTTON" then
    return RobloxCommonUI.CreateTabButton(options)
  elseif id == "QUEST_CARD" then
    return RobloxCommonUI.CreateQuestCard(options)
  elseif id == "CURRENCY_CHIP" then
    return RobloxCommonUI.CreateCurrencyChip(options)
  elseif id == "BAR_PROGRESS" then
    return RobloxCommonUI.CreateProgressBar(options)
  elseif id == "MOBILE_ACTION_BUTTON" then
    return RobloxCommonUI.CreateMobileActionButton(options)
  elseif id == "ICON_BUTTON" then
    return RobloxCommonUI.CreateIconButton(options)
  elseif id == "DIALOGUE_ASSISTANT_BUTTON" then
    return RobloxCommonUI.CreateDialogueAssistantButton(options)
  elseif id == "DIALOGUE_PANEL" then
    return RobloxCommonUI.CreateDialoguePanel(options)
  elseif id == "DIALOGUE_CHOICE" then
    return RobloxCommonUI.CreateDialogueChoice(options)
  elseif id == "DIALOGUE_INPUT" then
    return RobloxCommonUI.CreateDialogueInput(options)
  elseif id == "TYPING_INDICATOR" then
    return RobloxCommonUI.CreateTypingIndicator(options)
  elseif id == "DIALOGUE_HISTORY" then
    return RobloxCommonUI.CreateDialogueHistory(options)
  elseif id == "NPC_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateNpcInteractionPrompt(options)
  elseif id == "NPC_INTERACTION_MENU" then
    return RobloxCommonUI.CreateNpcInteractionMenu(options)
  elseif id == "NPC_RELATIONSHIP_CARD" then
    return RobloxCommonUI.CreateNpcRelationshipCard(options)
  elseif id == "INVENTORY_GRID" then
    return RobloxCommonUI.CreateInventoryGrid(options)
  elseif id == "EQUIPMENT_SLOT" then
    return RobloxCommonUI.CreateEquipmentSlot(options)
  elseif id == "CHARACTER_SHEET" then
    return RobloxCommonUI.CreateCharacterSheet(options)
  elseif id == "MINIMAP" then
    return RobloxCommonUI.CreateMinimap(options)
  elseif id == "QUEST_TRACKER" then
    return RobloxCommonUI.CreateQuestTracker(options)
  elseif id == "PARTY_MEMBER_CARD" then
    return RobloxCommonUI.CreatePartyMemberCard(options)
  elseif id == "CRAFTING_RECIPE_CARD" then
    return RobloxCommonUI.CreateCraftingRecipeCard(options)
  elseif id == "SHOP_ITEM_CARD" then
    return RobloxCommonUI.CreateShopItemCard(options)
  elseif id == "NOTIFICATION_TOAST" then
    return RobloxCommonUI.CreateNotificationToast(options)
  elseif id == "STATUS_EFFECT_CHIP" then
    return RobloxCommonUI.CreateStatusEffectChip(options)
  elseif id == "HOTBAR" then
    return RobloxCommonUI.CreateHotbar(options)
  end
  error("UNKNOWN_COMMON_UI_ATOM: " .. tostring(atomId))
end

function RobloxCommonUI.Audit()
  return table.freeze({
    version = 3,
    packId = "roblox-common-ui-v1",
    atoms = table.freeze({
      "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH",
      "INVENTORY_SLOT", "TOOLTIP", "MODAL", "TAB_BUTTON",
      "QUEST_CARD", "CURRENCY_CHIP", "BAR_PROGRESS", "MOBILE_ACTION_BUTTON",
      "ICON_BUTTON", "DIALOGUE_ASSISTANT_BUTTON", "DIALOGUE_PANEL", "DIALOGUE_CHOICE",
      "DIALOGUE_INPUT", "TYPING_INDICATOR", "DIALOGUE_HISTORY",
      "NPC_INTERACTION_PROMPT", "NPC_INTERACTION_MENU", "NPC_RELATIONSHIP_CARD",
      "INVENTORY_GRID", "EQUIPMENT_SLOT", "CHARACTER_SHEET", "MINIMAP", "QUEST_TRACKER",
      "PARTY_MEMBER_CARD", "CRAFTING_RECIPE_CARD", "SHOP_ITEM_CARD",
      "NOTIFICATION_TOAST", "STATUS_EFFECT_CHIP", "HOTBAR"
    }),
    atomCount = 32,
    companyCommonBase = true,
    themeAdaptationRequiredPerGame = true,
    gameplayAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    touchMinimumHeight = DEFAULT_THEME.TouchHeight,
  })
end

return table.freeze(RobloxCommonUI)
