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
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "NpcInteractionPrompt"
  root.Size=options.size or UDim2.fromOffset(300,64)
  root.BackgroundColor3=theme.Panel
  root.BackgroundTransparency=0.06;root.BorderSizePixel=0
  tag(root,"NPC_INTERACTION_PROMPT")
  corner(root,14);stroke(root,theme.BorderBright,1.3,0.10)
  gradient(root,theme.PanelRaised,theme.Panel,90)
  local key=commonText(root,"Key",options.keyText or "E",
    UDim2.fromOffset(10,10),UDim2.fromOffset(44,44),theme.Text,16,true)
  key.TextXAlignment=Enum.TextXAlignment.Center
  key.BackgroundColor3=theme.Primary;key.BackgroundTransparency=0;corner(key,11);stroke(key,theme.PrimaryTop,1,0.05)
  local title=commonText(root,"Title",options.title or "상호작용",
    UDim2.fromOffset(66,9),UDim2.new(1,-76,0,24),theme.Text,14,true)
  local subtitle=commonText(root,"Subtitle",options.subtitle or "",
    UDim2.fromOffset(66,32),UDim2.new(1,-76,0,18),theme.MutedText,11,false)
  local function sync(state)
    state=type(state)=="table"and state or {}
    key.Text=tostring(state.keyText or options.keyText or "E")
    title.Text=tostring(state.title or options.title or "상호작용")
    subtitle.Text=tostring(state.subtitle or state.reason or options.subtitle or "")
    local enabled=state.available~=false
    subtitle.TextColor3=enabled and theme.MutedText or theme.Warning
    root:SetAttribute("InteractionId",tostring(state.id or options.interactionId or ""))
    root:SetAttribute("InteractionKind",tostring(state.kind or "NPC"))
    root:SetAttribute("InteractionAvailable",enabled)
    root:SetAttribute("InteractionStateRevision",tostring(state.revision or "UNKNOWN"))
  end
  sync(options.interaction or {})
  root:SetAttribute("PresentationRole","NPC_INTERACTION_PROMPT")
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,key,title,subtitle,sync
end

function RobloxCommonUI.CreateNpcInteractionMenu(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({
    name=options.name or "NpcInteractionMenu",
    size=options.size or UDim2.new(1,-24,1,-24),theme=theme
  })
  tag(root,"NPC_INTERACTION_MENU")
  local title=commonText(inner,"Title",options.title or "상호작용",
    UDim2.fromOffset(12,8),UDim2.new(1,-24,0,26),theme.Text,17,true)
  local npc=commonText(inner,"NpcName",options.npcName or "",
    UDim2.fromOffset(12,34),UDim2.new(1,-24,0,18),theme.Accent,12,true)
  local list=Instance.new("ScrollingFrame")
  list.Name="Actions";list.Position=UDim2.fromOffset(12,62);list.Size=UDim2.new(1,-24,1,-74)
  list.BackgroundTransparency=1;list.BorderSizePixel=0;list.ScrollBarThickness=4
  list.ScrollingDirection=Enum.ScrollingDirection.Y
  list.CanvasSize=UDim2.fromOffset(0,0);list.AutomaticCanvasSize=Enum.AutomaticSize.Y
  list.Active=true;list.Parent=inner
  local layout=commonList(list,false,7)
  layout.VerticalAlignment=Enum.VerticalAlignment.Top
  local buttons,rows={},{}
  local function sync(state)
    state=type(state)=="table"and state or {}
    rows=type(state.actions)=="table"and state.actions or {}
    title.Text=tostring(state.title or options.title or "상호작용")
    npc.Text=tostring(state.npcName or options.npcName or "")
    for index,row in ipairs(rows)do
      if not buttons[index]then
        local button=RobloxCommonUI.CreateDialogueChoice({
          name="NpcAction"..index,text="",size=UDim2.new(1,0,0,48),theme=theme
        })
        button.LayoutOrder=index;button.Parent=list;buttons[index]=button
        local captured=index
        button.Activated:Connect(function()
          local selected=rows[captured]
          if not selected or selected.available==false then return end
          if type(options.onSelect)=="function"then options.onSelect(selected.id,selected)end
        end)
      end
      local button=buttons[index]
      button.Text=tostring(row.label or row.id or "상호작용")
      button.Name="NpcAction"..index
      button.LayoutOrder=index;button.Visible=true
      button.Active=row.available~=false
      button.AutoButtonColor=row.available~=false
      button.TextColor3=row.available==false and theme.MutedText or theme.Text
      button:SetAttribute("InteractionActionId",tostring(row.id or index))
      button:SetAttribute("Locked",row.available==false)
      button:SetAttribute("MinimumTouchHeight",48)
    end
    for index=#rows+1,#buttons do buttons[index].Visible=false end
    root:SetAttribute("InteractionId",tostring(state.id or options.interactionId or ""))
    root:SetAttribute("BoundInteractionActionCount",#rows)
    root:SetAttribute("InteractionStateRevision",tostring(state.revision or "UNKNOWN"))
  end
  sync(options.interaction or {actions=options.actions or {}})
  root:SetAttribute("PresentationRole","NPC_INTERACTION_MENU")
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsQuestAuthority",false)
  root:SetAttribute("OwnsTradeAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,inner,list,buttons,sync
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


-- 전체 메뉴/내비게이션/상태 화면
-- 이 블록은 기존 공통 UI 모듈 안에서만 동작하며 게임 규칙/저장/Remote/구매 권한을 소유하지 않는다.
local function surfaceShell(options, atomId, role)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or role
  root.Size = options.size or UDim2.fromScale(1, 1)
  root.BackgroundColor3 = theme.PanelInset
  root.BackgroundTransparency = tonumber(options.backgroundTransparency) or 0.04
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, atomId)

  local chrome = Instance.new("Frame")
  chrome.Name = "Chrome"
  chrome.Position = UDim2.fromOffset(10, 10)
  chrome.Size = UDim2.new(1, -20, 1, -20)
  chrome.BackgroundColor3 = theme.Panel
  chrome.BorderSizePixel = 0
  chrome.Parent = root
  corner(chrome, theme.Corner)
  stroke(chrome, theme.Border, 1.5, 0.08)
  gradient(chrome, theme.PanelRaised, theme.Panel, 90)

  local header = Instance.new("Frame")
  header.Name = "Header"
  header.Position = UDim2.fromOffset(16, 12)
  header.Size = UDim2.new(1, -32, 0, 64)
  header.BackgroundTransparency = 1
  header.Parent = chrome

  local title = commonText(header, "Title", options.title or role, UDim2.fromOffset(0,0), UDim2.new(1,-8,0,34), theme.Text, tonumber(options.titleSize) or 24, true)
  local subtitle = commonText(header, "Subtitle", options.subtitle or "", UDim2.fromOffset(0,32), UDim2.new(1,-8,0,24), theme.MutedText, 13, false)

  local body = Instance.new("Frame")
  body.Name = "Body"
  body.Position = UDim2.fromOffset(16, 82)
  body.Size = UDim2.new(1, -32, 1, -98)
  body.BackgroundTransparency = 1
  body.Parent = chrome

  root:SetAttribute("PresentationRole", role)
  root:SetAttribute("NavigationDepth", tonumber(options.navigationDepth) or 1)
  root:SetAttribute("TransitionStyle", tostring(options.transitionStyle or "SIMPLE_FADE"))
  root:SetAttribute("InputModes", "TOUCH|KEYBOARD_MOUSE|GAMEPAD")
  root:SetAttribute("OwnsGameplayAuthority", false)
  root:SetAttribute("OwnsSaveAuthority", false)
  root:SetAttribute("OwnsRemoteAuthority", false)
  return root, body, header, title, subtitle
end

local function stateCard(options, atomId, role, defaultTitle, defaultBody, accentKey)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root, inner = RobloxCommonUI.CreatePanel({
    name=options.name or role,
    size=options.size or UDim2.fromOffset(420, 220),
    theme=theme
  })
  tag(root, atomId)
  local accent = theme[accentKey or "Accent"] or theme.Accent
  local badge = Instance.new("Frame")
  badge.Name = "StateMark"
  badge.Position = UDim2.fromOffset(18, 18)
  badge.Size = UDim2.fromOffset(10, 54)
  badge.BackgroundColor3 = accent
  badge.BorderSizePixel = 0
  badge.Parent = inner
  corner(badge, 5)
  commonText(inner, "Title", options.title or defaultTitle, UDim2.fromOffset(42, 16), UDim2.new(1,-58,0,34), theme.Text, 22, true)
  commonText(inner, "Body", options.body or defaultBody, UDim2.fromOffset(42, 52), UDim2.new(1,-58,0,62), theme.MutedText, 14, false)
  local action = RobloxCommonUI.CreatePrimaryButton({name="StateAction", text=options.actionText or "확인", size=UDim2.fromOffset(150,48), theme=theme})
  action.Position = UDim2.new(0,42,1,-66)
  action.Parent = inner
  root:SetAttribute("PresentationRole", role)
  root:SetAttribute("OwnsRecoveryAuthority", false)
  root:SetAttribute("OwnsUnlockAuthority", false)
  return root, action
end

function RobloxCommonUI.CreateMainMenu(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root, body = surfaceShell(options, "MAIN_MENU", "MAIN_MENU")
  local hero = Instance.new("Frame")
  hero.Name = "Hero"
  hero.BackgroundColor3 = theme.PanelInset
  hero.BackgroundTransparency = 0.20
  hero.BorderSizePixel = 0
  hero.Parent = body
  corner(hero, theme.Corner)
  stroke(hero, theme.Border, 1.2, 0.25)
  local logo = commonText(hero, "Logo", options.logoText or options.gameTitle or "JAEWOON GAMES",
    UDim2.fromOffset(22, 22), UDim2.new(1, -44, 0, 52), theme.Text, 32, true)
  local tagline = commonText(hero, "Tagline", options.tagline or "계속하기 · 새 게임 · 설정",
    UDim2.fromOffset(22, 78), UDim2.new(1, -44, 0, 48), theme.MutedText, 15, false)

  -- 작고 낮은 화면에서도 모든 메뉴가 보이도록 수직 스크롤을 사용한다.
  local actions = Instance.new("ScrollingFrame")
  actions.Name = "Actions"
  actions.BackgroundTransparency = 1
  actions.BorderSizePixel = 0
  actions.ScrollingDirection = Enum.ScrollingDirection.Y
  actions.ScrollBarThickness = 4
  actions.CanvasSize = UDim2.fromOffset(0, 0)
  actions.AutomaticCanvasSize = Enum.AutomaticSize.Y
  actions.Active = true
  actions.Parent = body
  local layout = commonList(actions, false, 10)
  layout.VerticalAlignment = Enum.VerticalAlignment.Top

  local labels = options.actions or {"계속하기","새 게임","게임 선택","설정","종료"}
  local buttons = {}
  for i, label in ipairs(labels) do
    local button = RobloxCommonUI.CreatePrimaryButton({
      name="MenuAction"..i, text=tostring(label), size=UDim2.new(1, -8, 0, 52), theme=theme
    })
    button.LayoutOrder = i
    button.Parent = actions
    buttons[i] = button
  end

  -- 부모에 붙인 뒤의 실제 뷰포트 너비만 이용한다. 상시 RenderStepped 갱신은 없다.
  local function refreshLayout()
    local compact = body.AbsoluteSize.X < 580
    if compact then
      local bannerHeight = math.clamp(math.floor(body.AbsoluteSize.Y * 0.30), 104, 160)
      hero.Position = UDim2.fromOffset(0, 0)
      hero.Size = UDim2.new(1, 0, 0, bannerHeight)
      logo.Position = UDim2.fromOffset(14, 8)
      logo.Size = UDim2.new(1, -28, 0, 54)
      logo.TextSize = 24
      tagline.Position = UDim2.fromOffset(14, 64)
      tagline.Size = UDim2.new(1, -28, 0, 30)
      tagline.TextSize = 13
      actions.Position = UDim2.fromOffset(0, bannerHeight + 8)
      actions.Size = UDim2.new(1, 0, 1, -bannerHeight - 8)
    else
      hero.Position = UDim2.fromOffset(0, 0)
      hero.Size = UDim2.new(0.58, -8, 1, 0)
      logo.Position = UDim2.fromOffset(22, 22)
      logo.Size = UDim2.new(1, -44, 0, 52)
      logo.TextSize = 32
      tagline.Position = UDim2.fromOffset(22, 78)
      tagline.Size = UDim2.new(1, -44, 0, 48)
      tagline.TextSize = 15
      actions.Position = UDim2.new(0.60, 8, 0, 0)
      actions.Size = UDim2.new(0.40, -8, 1, 0)
    end
    root:SetAttribute("MobileStackedLayout", compact)
  end
  body:GetPropertyChangedSignal("AbsoluteSize"):Connect(refreshLayout)
  refreshLayout()
  root:SetAttribute("InformationHierarchy", "BRAND>PRIMARY_ACTIONS>SECONDARY_STATUS")
  root:SetAttribute("MobileResponsive", true)
  root:SetAttribute("OwnsNavigationAuthority", false)
  return root, buttons
end

function RobloxCommonUI.CreateTopBar(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "TopBar"
  root.Size = options.size or UDim2.new(1,0,0,64)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  tag(root,"TOP_BAR")
  stroke(root,theme.Border,1,0.22)
  local title = commonText(root,"Title",options.title or "현재 화면",UDim2.fromOffset(16,0),UDim2.new(0.42,-16,1,0),theme.Text,17,true)
  local path = commonText(root,"Path",options.pathText or "",UDim2.new(0.42,8,0,0),UDim2.new(0.32,-8,1,0),theme.MutedText,12,false)
  local status = commonText(root,"Status",options.statusText or "",UDim2.new(0.74,8,0,0),UDim2.new(0.26,-24,1,0),theme.Accent,12,true)
  status.TextXAlignment=Enum.TextXAlignment.Right
  root:SetAttribute("PresentationRole","TOP_BAR")
  root:SetAttribute("OwnsNavigationAuthority",false)
  return root,{title=title,path=path,status=status}
end

function RobloxCommonUI.CreateSideNavigation(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  local root = Instance.new("Frame")
  root.Name = options.name or "SideNavigation"
  root.Size = options.size or UDim2.fromOffset(220,520)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  tag(root,"SIDE_NAVIGATION")
  corner(root,theme.Corner)
  stroke(root,theme.Border,1.2,0.14)
  local holder=Instance.new("Frame")
  holder.Name="Items"; holder.Position=UDim2.fromOffset(10,10); holder.Size=UDim2.new(1,-20,1,-20); holder.BackgroundTransparency=1; holder.Parent=root
  commonList(holder,false,8)
  local items=options.items or {"요약","인벤토리","장비","캐릭터","지도","퀘스트","제작","상점","설정"}
  local buttons={}
  for i,label in ipairs(items) do
    local button=RobloxCommonUI.CreateTabButton({name="Nav"..i,text=tostring(label),selected=i==(tonumber(options.selectedIndex) or 1),size=UDim2.new(1,0,0,48),theme=theme})
    button.LayoutOrder=i; button.Parent=holder; button:SetAttribute("NavigationIndex",i); buttons[i]=button
  end
  root:SetAttribute("PresentationRole","SIDE_NAVIGATION")
  root:SetAttribute("OwnsNavigationAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreatePauseMenu(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"PAUSE_MENU","PAUSE_MENU")
  local actions=Instance.new("Frame")
  actions.Name="PauseActions"; actions.Size=UDim2.fromOffset(320,340); actions.AnchorPoint=Vector2.new(0.5,0.5); actions.Position=UDim2.fromScale(0.5,0.5); actions.BackgroundTransparency=1; actions.Parent=body
  commonList(actions,false,10)
  local labels=options.actions or {"계속","설정","조작법","메인 메뉴"}
  local buttons={}
  for i,label in ipairs(labels) do local b=RobloxCommonUI.CreatePrimaryButton({text=label,size=UDim2.new(1,0,0,54),theme=theme}); b.LayoutOrder=i;b.Parent=actions;buttons[i]=b end
  root:SetAttribute("OwnsPauseAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateSettingsPanel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"SETTINGS_PANEL","SETTINGS_PANEL")
  local categories=options.categories or {"게임","그래픽","오디오","조작","접근성"}
  local nav=RobloxCommonUI.CreateSideNavigation({name="SettingsCategories",items=categories,selectedIndex=options.selectedIndex or 1,size=UDim2.new(0.28,-8,1,0),theme=theme})
  nav.Parent=body
  local content=Instance.new("Frame"); content.Name="SettingsContent"; content.Position=UDim2.new(0.28,8,0,0); content.Size=UDim2.new(0.72,-8,1,0); content.BackgroundColor3=theme.PanelInset; content.BorderSizePixel=0; content.Parent=body; corner(content,theme.Corner)
  local rows=options.rows or {"화면","텍스트 크기","UI 크기","카메라 흔들림","색상 보조","입력 방식"}
  local list=Instance.new("Frame");list.Name="Rows";list.Position=UDim2.fromOffset(14,14);list.Size=UDim2.new(1,-28,1,-28);list.BackgroundTransparency=1;list.Parent=content;commonList(list,false,8)
  for i,label in ipairs(rows) do
    local row=Instance.new("Frame");row.Name="Setting"..i;row.Size=UDim2.new(1,0,0,54);row.BackgroundColor3=theme.Panel;row.BorderSizePixel=0;row.LayoutOrder=i;row.Parent=list;corner(row,10)
    commonText(row,"Label",label,UDim2.fromOffset(12,0),UDim2.new(0.62,-12,1,0),theme.Text,14,i==1)
    local value=commonText(row,"Value","조정",UDim2.new(0.62,0,0,0),UDim2.new(0.38,-12,1,0),theme.Accent,13,true);value.TextXAlignment=Enum.TextXAlignment.Right
  end
  root:SetAttribute("OwnsSettingsPersistence",false)
  return root,content
end

function RobloxCommonUI.CreateSearchField(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local box=Instance.new("TextBox")
  box.Name=options.name or "SearchField";box.Size=options.size or UDim2.fromOffset(260,48);box.BackgroundColor3=theme.PanelInset;box.BorderSizePixel=0;box.ClearTextOnFocus=false;box.PlaceholderText=options.placeholder or "검색";box.Text=tostring(options.text or "");box.TextColor3=theme.Text;box.PlaceholderColor3=theme.MutedText;box.TextSize=14;box.Font=Enum.Font.Gotham;box.TextXAlignment=Enum.TextXAlignment.Left;box.Selectable=true
  tag(box,"SEARCH_FIELD");corner(box,10);stroke(box,theme.Border,1.2,0.16);sizeConstraint(box,160,48)
  local pad=Instance.new("UIPadding");pad.PaddingLeft=UDim.new(0,14);pad.PaddingRight=UDim.new(0,14);pad.Parent=box
  box:SetAttribute("PresentationRole","SEARCH_FIELD");box:SetAttribute("OwnsSearchData",false)
  return box
end

function RobloxCommonUI.CreateFilterBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  -- 좁은 화면에서 필터를 잘라내지 않고 가로 스와이프로 모두 접근할 수 있게 한다.
  local root=Instance.new("ScrollingFrame")
  root.Name=options.name or "FilterBar"
  root.Size=options.size or UDim2.new(1,0,0,52)
  root.BackgroundTransparency=1
  root.BorderSizePixel=0
  root.ScrollingDirection=Enum.ScrollingDirection.X
  root.ScrollBarThickness=3
  root.CanvasSize=UDim2.fromOffset(0,0)
  root.AutomaticCanvasSize=Enum.AutomaticSize.X
  root.Active=true
  tag(root,"FILTER_BAR")
  local layout=commonList(root,true,8)
  layout.HorizontalAlignment=Enum.HorizontalAlignment.Left
  local filters=options.filters or {"전체","추천","새 항목","사용 가능","잠김"}
  local buttons={}
  for i,label in ipairs(filters) do
    local glyphs=utf8.len(tostring(label)) or string.len(tostring(label))
    local width=math.max(92,glyphs*12+30)
    local button=RobloxCommonUI.CreateTabButton({
      name="Filter"..i,text=tostring(label),selected=i==(options.selectedIndex or 1),
      size=UDim2.fromOffset(width,48),theme=theme
    })
    button.LayoutOrder=i
    button.Parent=root
    button:SetAttribute("FilterIndex",i)
    buttons[i]=button
  end
  root:SetAttribute("TouchScrollable",true)
  root:SetAttribute("OwnsFilterAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateSortControl(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local button=RobloxCommonUI.CreatePrimaryButton({name=options.name or "SortControl",text=options.text or "정렬: 추천순",size=options.size or UDim2.fromOffset(160,48),theme=theme})
  tag(button,"SORT_CONTROL");button:SetAttribute("PresentationRole","SORT_CONTROL");button:SetAttribute("OwnsSortAuthority",false)
  return button
end

function RobloxCommonUI.CreateInventoryFullScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"INVENTORY_FULL_SCREEN","INVENTORY_FULL_SCREEN")
  local search=RobloxCommonUI.CreateSearchField({size=UDim2.new(0.42,0,0,48),theme=theme});search.Parent=body
  local sort=RobloxCommonUI.CreateSortControl({size=UDim2.fromOffset(170,48),theme=theme});sort.AnchorPoint=Vector2.new(1,0);sort.Parent=body
  local filters=RobloxCommonUI.CreateFilterBar({size=UDim2.new(1,0,0,52),theme=theme});filters.Parent=body
  local scroll=Instance.new("ScrollingFrame")
  scroll.Name="InventoryScroll";scroll.BackgroundTransparency=1;scroll.BorderSizePixel=0;scroll.ScrollBarThickness=4
  scroll.ScrollingDirection=Enum.ScrollingDirection.Y;scroll.CanvasSize=UDim2.fromOffset(0,0);scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
  scroll.Active=true;scroll.Parent=body
  local grid,cellLayout,slots=RobloxCommonUI.CreateInventoryGrid({
    name="FullInventoryGrid",columns=options.columns or 6,
    slotCount=options.slotCount or (options.items and #options.items or 1),
    size=UDim2.new(1,-8,0,160),theme=theme
  });grid.Parent=scroll
  local rows={}
  local selectedId=nil
  local function resizeGrid()
    local available=scroll.AbsoluteSize.X-8
    if available<=0 then return end
    local desired=math.max(2,math.floor((available-20+8)/76))
    local columns=math.clamp(math.min(desired,tonumber(options.columns)or 6),2,6)
    local cell=math.max(52,math.floor((available-20-(columns-1)*8)/columns))
    cellLayout.CellSize=UDim2.fromOffset(cell,cell)
    grid.Size=UDim2.new(1,-8,0,cellLayout.AbsoluteContentSize.Y+20)
  end
  local function placePanels()
    local compact=body.AbsoluteSize.X<560
    if compact then
      search.Size=UDim2.new(1,0,0,48)
      sort.AnchorPoint=Vector2.new(0,0);sort.Position=UDim2.fromOffset(0,56);sort.Size=UDim2.new(1,0,0,48)
      filters.Position=UDim2.fromOffset(0,112)
      scroll.Position=UDim2.fromOffset(0,172);scroll.Size=UDim2.new(1,0,1,-172)
    else
      search.Size=UDim2.new(0.42,0,0,48)
      sort.AnchorPoint=Vector2.new(1,0);sort.Position=UDim2.new(1,0,0,0);sort.Size=UDim2.fromOffset(170,48)
      filters.Position=UDim2.fromOffset(0,58)
      scroll.Position=UDim2.fromOffset(0,116);scroll.Size=UDim2.new(1,0,1,-116)
    end
    root:SetAttribute("MobileStackedLayout",compact)
    resizeGrid()
  end
  local function sync(items)
    rows=type(items)=="table"and items or {}
    for i,row in ipairs(rows)do
      if not slots[i]then
        local slot=RobloxCommonUI.CreateInventorySlot({name="Slot"..i,theme=theme})
        slot.LayoutOrder=i;slot.Parent=grid;slots[i]=slot
      end
      local slot=slots[i]
      if not slot:GetAttribute("InventoryInputBound")then
        slot:SetAttribute("InventoryInputBound",true)
        local index=i
        slot.Activated:Connect(function()
          local current=rows[index]
          if current and type(options.onSelect)=="function"then options.onSelect(current.id,current)end
        end)
      end
      slot.Visible=true
      slot.Name="Slot"..i
      slot.LayoutOrder=i
      slot:SetAttribute("BoundItemId",tostring(row.id or ""))
      slot:SetAttribute("BoundFromGameState",true)
      local icon=slot:FindFirstChild("Icon")
      local quantity=slot:FindFirstChild("Quantity")
      local highlight=slot:FindFirstChild("SelectedRing")
      if icon then icon.Image=tostring(row.image or "")end
      if quantity then quantity.Text=tostring(row.quantity or row.count or "")end
      if highlight then highlight.Visible=row.selected==true or (selectedId~=nil and selectedId==row.id)end
      slot.Active=row.locked~=true
    end
    for i=#rows+1,#slots do slots[i].Visible=false end
    root:SetAttribute("BoundItemCount",#rows)
    resizeGrid()
  end
  body:GetPropertyChangedSignal("AbsoluteSize"):Connect(placePanels)
  scroll:GetPropertyChangedSignal("AbsoluteSize"):Connect(resizeGrid)
  cellLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
    grid.Size=UDim2.new(1,-8,0,cellLayout.AbsoluteContentSize.Y+20)
  end)
  placePanels()
  sync(options.items or {})
  root:SetAttribute("TouchScrollable",true)
  root:SetAttribute("OwnsInventoryAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,{search=search,sort=sort,filters=filters,grid=grid,scroll=scroll,slots=slots,Sync=sync}
end

function RobloxCommonUI.CreateEquipmentFullScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"EQUIPMENT_FULL_SCREEN","EQUIPMENT_FULL_SCREEN")
  local sheet=RobloxCommonUI.CreateCharacterSheet({name="CharacterSummary",size=UDim2.new(0.46,-8,1,0),theme=theme});sheet.Parent=body
  local slots=Instance.new("Frame");slots.Name="EquipmentSlots";slots.Position=UDim2.new(0.46,8,0,0);slots.Size=UDim2.new(0.54,-8,1,0);slots.BackgroundTransparency=1;slots.Parent=body
  local grid=Instance.new("UIGridLayout");grid.CellSize=UDim2.new(0.5,-6,0,110);grid.CellPadding=UDim2.fromOffset(10,10);grid.SortOrder=Enum.SortOrder.LayoutOrder;grid.Parent=slots
  local names=options.slots or {"무기","보조","머리","몸","장갑","신발","장신구","특수"}
  local built,state={},{}
  for i,label in ipairs(names)do
    local slot=RobloxCommonUI.CreateEquipmentSlot({name="Equipment"..i,label=label,size=UDim2.new(1,0,1,0),theme=theme})
    slot.LayoutOrder=i;slot.Parent=slots;built[i]=slot
    slot.Activated:Connect(function()
      local row=state[i]
      if row and row.id and type(options.onEquip)=="function"then options.onEquip(row.id,row)end
    end)
  end
  local function sync(items)
    state=type(items)=="table"and items or {}
    for index,slot in ipairs(built)do
      local row=state[index]or {}
      slot:SetAttribute("BoundItemId",tostring(row.id or ""))
      slot:SetAttribute("BoundFromGameState",true)
      slot.Active=row.id~=nil and row.locked~=true
      local icon=slot:FindFirstChild("Icon")
      local caption=slot:FindFirstChild("Quantity")
      local highlight=slot:FindFirstChild("SelectedRing")
      if icon then icon.Image=tostring(row.image or "")end
      if caption then caption.Text=tostring(row.name or names[index] or "")end
      if highlight then highlight.Visible=row.equipped==true end
    end
    root:SetAttribute("BoundEquipmentCount",#state)
  end
  sync(options.equipment or {})
  root:SetAttribute("OwnsEquipAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  return root,{sheet=sheet,slots=built,Sync=sync}
end

function RobloxCommonUI.CreateCharacterDetailScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"CHARACTER_DETAIL_SCREEN","CHARACTER_DETAIL_SCREEN")
  local sheet=RobloxCommonUI.CreateCharacterSheet({
    name="CharacterDetail",size=UDim2.new(0.58,-8,1,0),theme=theme,
    characterName=options.displayName,stats=options.stats or {}
  })
  sheet.Parent=body
  local details=Instance.new("Frame")
  details.Name="DetailStats";details.Position=UDim2.new(0.58,8,0,0);details.Size=UDim2.new(0.42,-8,1,0)
  details.BackgroundColor3=theme.PanelInset;details.BorderSizePixel=0;details.Parent=body;corner(details,theme.Corner)
  local rows=options.detailRows or {"상태","역할","장비 요약","효과","진행도","최근 획득"}
  local labels={}
  for i,name in ipairs(rows)do
    labels[i]=commonText(details,"Row"..i,name,UDim2.fromOffset(16,12+(i-1)*44),UDim2.new(1,-32,0,36),i==1 and theme.Accent or theme.Text,14,i==1)
  end
  local inner=sheet:FindFirstChild("InnerSurface")
  local function sync(state)
    state=type(state)=="table"and state or {}
    if inner then
      if inner:FindFirstChild("CharacterName")then inner.CharacterName.Text=tostring(state.name or options.displayName or "캐릭터")end
      if inner:FindFirstChild("Class")then inner.Class.Text=tostring(state.className or "")end
      if inner:FindFirstChild("Level")then inner.Level.Text=tostring(state.levelText or "")end
      local values=inner:FindFirstChild("Stats")
      if values then
        local active={}
        for index,stat in ipairs(state.stats or {})do
          local id=tostring(stat.id or ("Stat"..index))
          active[id]=true
          local row=values:FindFirstChild(id)
          if not row then
            row=Instance.new("Frame")
            row.Name=id;row.Size=UDim2.new(1,0,0,26);row.BackgroundTransparency=1;row.Parent=values
            commonText(row,"Label","",UDim2.new(),UDim2.new(.58,0,1,0),theme.MutedText,12,false)
            local value=commonText(row,"Value","",UDim2.new(.58,0,0,0),UDim2.new(.42,0,1,0),theme.Text,12,true)
            value.TextXAlignment=Enum.TextXAlignment.Right
          end
          row.Visible=true;row.LayoutOrder=index
          if row:FindFirstChild("Label")then row.Label.Text=tostring(stat.label or stat.id or "")end
          if row:FindFirstChild("Value")then row.Value.Text=tostring(stat.value or "")end
        end
        for _,child in ipairs(values:GetChildren())do
          if child:IsA("Frame")and not active[child.Name]then child.Visible=false end
        end
      end
    end
    for i,label in ipairs(labels)do label.Text=tostring((state.details or {})[i]or "")end
    root:SetAttribute("CharacterStateRevision",tostring(state.revision or "UNKNOWN"))
  end
  sync(options.character or {})
  root:SetAttribute("OwnsCharacterStats",false)
  root:SetAttribute("OwnsProgressionAuthority",false)
  return root,{sheet=sheet,details=details,Sync=sync}
end

function RobloxCommonUI.CreateMapFullScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"MAP_FULL_SCREEN","MAP_FULL_SCREEN")
  local map=Instance.new("Frame");map.Name="MapCanvas";map.Size=UDim2.new(0.76,-8,1,0);map.BackgroundColor3=theme.Map;map.BorderSizePixel=0;map.Parent=body;corner(map,theme.Corner);stroke(map,theme.MapGrid,1,0.28)
  local legend=Instance.new("Frame");legend.Name="Legend";legend.Position=UDim2.new(0.76,8,0,0);legend.Size=UDim2.new(0.24,-8,1,0);legend.BackgroundColor3=theme.PanelInset;legend.BorderSizePixel=0;legend.Parent=body;corner(legend,theme.Corner)
  local entries=options.legend or {"플레이어","목표","파티","위험","관심 지점","미발견"}
  for i,label in ipairs(entries) do commonText(legend,"Legend"..i,"• "..label,UDim2.fromOffset(14,12+(i-1)*38),UDim2.new(1,-28,0,32),i==2 and theme.Accent or theme.Text,13,i==2) end
  root:SetAttribute("OwnsWorldMapAuthority",false)
  return root,{map=map,legend=legend}
end

function RobloxCommonUI.CreateQuestLog(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"QUEST_LOG","QUEST_LOG")
  local filters=RobloxCommonUI.CreateFilterBar({filters=options.filters or {"진행중","완료","실패","전체"},size=UDim2.new(1,0,0,48),theme=theme});filters.Parent=body
  local list=Instance.new("ScrollingFrame");list.Name="QuestList";list.Position=UDim2.fromOffset(0,58);list.Size=UDim2.new(1,0,1,-58);list.BackgroundTransparency=1;list.BorderSizePixel=0;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new();list.Parent=body;commonList(list,false,8)
  local cards={}
  for i=1,(tonumber(options.previewCount) or 4) do local c=RobloxCommonUI.CreateQuestCard({name="Quest"..i,title="퀘스트 "..i,description="목표와 진행 상태",size=UDim2.new(1,-8,0,92),theme=theme});c.LayoutOrder=i;c.Parent=list;cards[i]=c end
  root:SetAttribute("OwnsQuestAuthority",false)
  return root,{filters=filters,cards=cards}
end

function RobloxCommonUI.CreateCraftingFullScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"CRAFTING_FULL_SCREEN","CRAFTING_FULL_SCREEN")
  local search=RobloxCommonUI.CreateSearchField({size=UDim2.new(0.45,0,0,48),theme=theme,placeholder="제작법 검색"});search.Parent=body
  local filters=RobloxCommonUI.CreateFilterBar({filters=options.filters or {"전체","제작 가능","무기","방어구","도구","기타"},size=UDim2.new(1,0,0,48),theme=theme});filters.Position=UDim2.fromOffset(0,58);filters.Parent=body
  local list=Instance.new("ScrollingFrame");list.Name="Recipes";list.Position=UDim2.fromOffset(0,116);list.Size=UDim2.new(1,0,1,-116);list.BackgroundTransparency=1;list.BorderSizePixel=0;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new();list.Parent=body;commonList(list,false,8)
  local cards={}
  for i=1,(tonumber(options.previewCount) or 4) do local c=RobloxCommonUI.CreateCraftingRecipeCard({name="Recipe"..i,title="제작 항목 "..i,size=UDim2.new(1,-8,0,96),theme=theme});c.LayoutOrder=i;c.Parent=list;cards[i]=c end
  root:SetAttribute("OwnsCraftAuthority",false)
  return root,{search=search,filters=filters,cards=cards}
end

function RobloxCommonUI.CreateShopFullScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"SHOP_FULL_SCREEN","SHOP_FULL_SCREEN")
  local search=RobloxCommonUI.CreateSearchField({size=UDim2.new(0.42,0,0,48),theme=theme,placeholder="상품 검색"});search.Parent=body
  local sort=RobloxCommonUI.CreateSortControl({text="정렬: 추천순",theme=theme});sort.AnchorPoint=Vector2.new(1,0);sort.Position=UDim2.new(1,0,0,0);sort.Parent=body
  local list=Instance.new("ScrollingFrame")
  list.Name="Products";list.Position=UDim2.fromOffset(0,58);list.Size=UDim2.new(1,0,1,-58)
  list.BackgroundTransparency=1;list.BorderSizePixel=0;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new()
  list.ScrollBarThickness=4;list.Parent=body
  local grid=Instance.new("UIGridLayout")
  grid.CellSize=UDim2.new(0.5,-7,0,142);grid.CellPadding=UDim2.fromOffset(10,10);grid.SortOrder=Enum.SortOrder.LayoutOrder;grid.Parent=list
  local cards,rows,shown={}, {},{}
  local sortByPrice=false
  local function sync(items)
    rows=type(items)=="table"and items or {}
    shown={}
    local query=string.lower(search.Text)
    for _,item in ipairs(rows)do
      if query==""or string.find(string.lower(tostring(item.name or item.title or "")),query,1,true)then
        shown[#shown+1]=item
      end
    end
    if sortByPrice then table.sort(shown,function(a,b)return (tonumber(a.price)or math.huge)<(tonumber(b.price)or math.huge)end)end
    for i,item in ipairs(shown)do
      if not cards[i]then
        local index=i
        local card,icon,buy=RobloxCommonUI.CreateShopItemCard({
          name="Product"..i,theme=theme,size=UDim2.new(1,0,1,0)
        })
        card.LayoutOrder=i;card.Parent=list;cards[i]=card
        buy.Activated:Connect(function()
          local current=shown[index]
          if not current then return end
          if current.canSell==true and type(options.onSell)=="function"then options.onSell(current.id,current)
          elseif current.canBuy==true and type(options.onBuy)=="function"then options.onBuy(current.id,current)end
        end)
      end
      local card=cards[i]
      card.Visible=true
      card:SetAttribute("BoundItemId",tostring(item.id or ""))
      card:SetAttribute("BoundFromGameState",true)
      card.Name="Product"..i
      card.LayoutOrder=i
      local icon=card:FindFirstChild("Icon")
      local nameText=card:FindFirstChild("Name")
      local description=card:FindFirstChild("Description")
      local priceText=card:FindFirstChild("Price")
      if icon then icon.Image=tostring(item.image or "")end
      if nameText then nameText.Text=tostring(item.name or item.title or "")end
      if description then description.Text=tostring(item.description or "")end
      if priceText then priceText.Text=item.price~=nil and tostring(item.price).."G"or"가격 미확인"end
      local buy=card:FindFirstChild("Buy")
      if buy then
        local enabled=(item.canSell==true and type(options.onSell)=="function")
          or(item.canBuy==true and type(options.onBuy)=="function")
        buy.Active=enabled
        buy.AutoButtonColor=enabled
        buy.Text=enabled and(item.canSell==true and"판매"or"구매")or"거래 불가"
      end
    end
    for i=#shown+1,#cards do cards[i].Visible=false end
    root:SetAttribute("BoundShopItemCount",#shown)
  end
  local function resize()
    grid.CellSize=list.AbsoluteSize.X<430 and UDim2.new(1,-8,0,142)or UDim2.new(0.5,-7,0,142)
  end
  list:GetPropertyChangedSignal("AbsoluteSize"):Connect(resize)
  search:GetPropertyChangedSignal("Text"):Connect(function()sync(rows)end)
  sort.Activated:Connect(function()sortByPrice=not sortByPrice;sort.Text=sortByPrice and"정렬: 가격순"or"정렬: 추천순";sync(rows)end)
  resize()
  sync(options.items or {})
  root:SetAttribute("OwnsPurchaseAuthority",false)
  root:SetAttribute("OwnsEconomyAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,{search=search,sort=sort,cards=cards,Sync=sync}
end

function RobloxCommonUI.CreateConfirmDialog(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateModal({name=options.name or "ConfirmDialog",title=options.title or "확인",body=options.body or "이 작업을 진행할까?",size=options.size or UDim2.fromOffset(430,240),theme=theme})
  tag(root,"CONFIRM_DIALOG")
  local actions=Instance.new("Frame");actions.Name="Actions";actions.AnchorPoint=Vector2.new(1,1);actions.Position=UDim2.new(1,-18,1,-18);actions.Size=UDim2.fromOffset(300,50);actions.BackgroundTransparency=1;actions.Parent=root;local l=commonList(actions,true,8);l.HorizontalAlignment=Enum.HorizontalAlignment.Right
  local cancel=RobloxCommonUI.CreateTabButton({text=options.cancelText or "취소",size=UDim2.fromOffset(136,48),theme=theme});cancel.Parent=actions
  local confirm=RobloxCommonUI.CreatePrimaryButton({text=options.confirmText or "확인",size=UDim2.fromOffset(150,48),theme=theme});confirm.Parent=actions
  root:SetAttribute("PresentationRole","CONFIRM_DIALOG");root:SetAttribute("OwnsConfirmedAction",false)
  return root,{cancel=cancel,confirm=confirm}
end

function RobloxCommonUI.CreatePopupPanel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({name=options.name or "PopupPanel",size=options.size or UDim2.fromOffset(420,260),theme=theme})
  tag(root,"POPUP_PANEL")
  commonText(inner,"Title",options.title or "알림",UDim2.fromOffset(14,10),UDim2.new(1,-28,0,34),theme.Text,20,true)
  commonText(inner,"Body",options.body or "",UDim2.fromOffset(14,50),UDim2.new(1,-28,1,-64),theme.MutedText,14,false)
  root:SetAttribute("PresentationRole","POPUP_PANEL");root:SetAttribute("OwnsModalAuthority",false)
  return root
end

function RobloxCommonUI.CreateLoadingState(options)
  return stateCard(options,"LOADING_STATE","LOADING_STATE","불러오는 중","데이터와 자산을 준비하고 있어.","Accent")
end

function RobloxCommonUI.CreateEmptyState(options)
  return stateCard(options,"EMPTY_STATE","EMPTY_STATE","아직 항목이 없어","조건을 바꾸거나 새로운 항목을 추가해.","MutedText")
end

function RobloxCommonUI.CreateFailureState(options)
  return stateCard(options,"FAILURE_STATE","FAILURE_STATE","불러오지 못했어","연결 또는 데이터 상태를 확인하고 다시 시도해.","Danger")
end

function RobloxCommonUI.CreateLockedState(options)
  return stateCard(options,"LOCKED_STATE","LOCKED_STATE","잠겨 있어","필요 조건을 확인하면 이용할 수 있어.","Warning")
end

function RobloxCommonUI.CreateInputHint(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "InputHint";root.Size=options.size or UDim2.fromOffset(260,40);root.BackgroundColor3=theme.PanelInset;root.BackgroundTransparency=0.10;root.BorderSizePixel=0;tag(root,"INPUT_HINT");corner(root,10);stroke(root,theme.Border,1,0.26)
  local mode=tostring(options.mode or "AUTO")
  local label=commonText(root,"Hint",(options.glyph or "●").."  "..tostring(options.text or "선택"),UDim2.fromOffset(12,0),UDim2.new(1,-24,1,0),theme.Text,12,true)
  root:SetAttribute("PresentationRole","INPUT_HINT");root:SetAttribute("InputMode",mode);root:SetAttribute("SupportsAutomaticInputModeSwap",true);root:SetAttribute("OwnsInputAuthority",false)
  return root,label
end


-- 아이템/인벤토리/장비 시스템 깊이 v5
local function deepSystemPanel(options, atomId, role, defaultTitle, defaultRows)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({
    name=options.name or role,
    size=options.size or UDim2.fromOffset(460,360),
    theme=theme
  })
  tag(root,atomId)
  commonText(inner,"Title",options.title or defaultTitle,UDim2.fromOffset(14,10),UDim2.new(1,-28,0,34),theme.Text,20,true)
  local rows=options.rows or defaultRows or {}
  local list=Instance.new("Frame")
  list.Name="Rows";list.Position=UDim2.fromOffset(14,54);list.Size=UDim2.new(1,-28,1,-68);list.BackgroundTransparency=1;list.Parent=inner
  commonList(list,false,6)
  local labels={}
  for i,rowText in ipairs(rows) do
    local row=Instance.new("Frame");row.Name="Row"..i;row.Size=UDim2.new(1,0,0,38);row.BackgroundColor3=theme.Panel;row.BackgroundTransparency=0.18;row.BorderSizePixel=0;row.LayoutOrder=i;row.Parent=list;corner(row,8)
    local label=commonText(row,"Label",tostring(rowText),UDim2.fromOffset(10,0),UDim2.new(1,-20,1,0),i==1 and theme.Accent or theme.Text,13,i==1)
    labels[i]=label
  end
  root:SetAttribute("PresentationRole",role)
  root:SetAttribute("OwnsItemAuthority",false)
  root:SetAttribute("OwnsInventoryAuthority",false)
  root:SetAttribute("OwnsEquipAuthority",false)
  root:SetAttribute("OwnsEconomyAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,{inner=inner,list=list,labels=labels}
end

function RobloxCommonUI.CreateItemDetailPanel(options)
  options=options or {}
  return deepSystemPanel(options,"ITEM_DETAIL_PANEL","ITEM_DETAIL_PANEL",options.itemName or "아이템 상세",{
    options.rarityText or "희귀도 · 상태 · 신규 여부",
    options.categoryText or "분류 · 무게 · 수량 · 가치",
    "효과 / 조건 / 장착 위치",
    "획득처 / 사용처 / 제작 연결",
    "세트 / 소켓 / 강화 경로"
  })
end

function RobloxCommonUI.CreateItemComparePanel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,parts=deepSystemPanel(options,"ITEM_COMPARE_PANEL","ITEM_COMPARE_PANEL","아이템 비교",{"현재 장비 ↔ 선택 아이템","주요 수치 변화","효과/세트 변화","요구조건","무게/가치 변화"})
  local delta=commonText(parts.inner,"Delta",options.deltaText or "▲ 개선  ·  ▼ 감소  ·  = 동일",UDim2.new(0,14,1,-34),UDim2.new(1,-28,0,24),theme.Positive,12,true)
  delta.TextXAlignment=Enum.TextXAlignment.Right
  return root,parts
end

function RobloxCommonUI.CreateItemContextMenu(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({name=options.name or "ItemContextMenu",size=options.size or UDim2.fromOffset(250,360),theme=theme})
  tag(root,"ITEM_CONTEXT_MENU")
  local holder=Instance.new("Frame");holder.Name="Actions";holder.Position=UDim2.fromOffset(10,10);holder.Size=UDim2.new(1,-20,1,-20);holder.BackgroundTransparency=1;holder.Parent=inner;commonList(holder,false,6)
  local actions=options.actions or {"사용","장착","퀵슬롯","즐겨찾기","잠금","분할","이동","판매","버리기","상세보기"}
  local buttons={}
  for i,label in ipairs(actions) do
    local b=RobloxCommonUI.CreateTabButton({name="Action"..i,text=tostring(label),size=UDim2.new(1,0,0,42),theme=theme})
    b.LayoutOrder=i;b.Parent=holder;b:SetAttribute("ContextActionIndex",i);buttons[i]=b
  end
  root:SetAttribute("PresentationRole","ITEM_CONTEXT_MENU");root:SetAttribute("OwnsItemActionAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateStackSplitDialog(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateModal({name=options.name or "StackSplitDialog",title=options.title or "수량 나누기",body="",size=options.size or UDim2.fromOffset(420,250),theme=theme})
  tag(root,"STACK_SPLIT_DIALOG")
  local value=commonText(root,"Amount",tostring(options.amount or 1),UDim2.new(0.5,-70,0.44,0),UDim2.fromOffset(140,46),theme.Text,24,true);value.TextXAlignment=Enum.TextXAlignment.Center
  local minus=RobloxCommonUI.CreateTabButton({text="−",size=UDim2.fromOffset(54,46),theme=theme});minus.Position=UDim2.new(0.5,-138,0.44,0);minus.Parent=root
  local plus=RobloxCommonUI.CreateTabButton({text="+",size=UDim2.fromOffset(54,46),theme=theme});plus.Position=UDim2.new(0.5,84,0.44,0);plus.Parent=root
  root:SetAttribute("OwnsStackAuthority",false)
  return root,{minus=minus,plus=plus,value=value}
end

function RobloxCommonUI.CreateMultiSelectBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "MultiSelectBar";root.Size=options.size or UDim2.new(1,0,0,58);root.BackgroundColor3=theme.Panel;root.BorderSizePixel=0;tag(root,"MULTI_SELECT_BAR");corner(root,10);stroke(root,theme.Border,1,0.18)
  commonText(root,"Count",options.countText or "0개 선택",UDim2.fromOffset(12,0),UDim2.new(0.28,-12,1,0),theme.Text,13,true)
  local actions=commonText(root,"Actions",options.actionsText or "이동 · 판매 · 잠금 · 분해",UDim2.new(0.28,0,0,0),UDim2.new(0.72,-12,1,0),theme.Accent,12,true);actions.TextXAlignment=Enum.TextXAlignment.Right
  root:SetAttribute("OwnsMultiSelectAction",false)
  return root
end

function RobloxCommonUI.CreateItemStateBadges(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "ItemStateBadges";root.Size=options.size or UDim2.new(1,0,0,34);root.BackgroundTransparency=1;tag(root,"ITEM_STATE_BADGES")
  local layout=commonList(root,true,6);layout.HorizontalAlignment=Enum.HorizontalAlignment.Left
  local states=options.states or {"NEW","FAVORITE","LOCKED","EQUIPPED","QUEST"}
  local badges={}
  for i,state in ipairs(states) do
    local b=commonText(root,"Badge"..i,tostring(state),UDim2.new(),UDim2.fromOffset(76,30),i==1 and theme.Accent or theme.Text,10,true)
    b.BackgroundColor3=theme.PanelRaised;b.BackgroundTransparency=0.08;corner(b,8);b.TextXAlignment=Enum.TextXAlignment.Center;b.LayoutOrder=i;badges[i]=b
  end
  root:SetAttribute("ColorOnlyStateForbidden",true)
  return root,badges
end

function RobloxCommonUI.CreateInventoryContainerPanel(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"INVENTORY_CONTAINER_PANEL","INVENTORY_CONTAINER_PANEL",options.title or "컨테이너",{"가방 / 주머니 / 퀘스트함","현재 수량 / 최대 수량","무게 / 정렬 / 필터","컨테이너 간 이동"})
  root:SetAttribute("NestedContainerPresentation",true)
  return root,parts
end

function RobloxCommonUI.CreateInventoryWeightMeter(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateProgressBar({name=options.name or "InventoryWeightMeter",label=options.label or "무게",value=options.value or 0,size=options.size or UDim2.fromOffset(300,42),theme=theme})
  tag(root,"INVENTORY_WEIGHT_METER");root:SetAttribute("PresentationRole","INVENTORY_WEIGHT_METER");root:SetAttribute("OwnsWeightValue",false)
  return root
end

function RobloxCommonUI.CreateInventoryCapacityMeter(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateProgressBar({name=options.name or "InventoryCapacityMeter",label=options.label or "칸",value=options.value or 0,size=options.size or UDim2.fromOffset(300,42),theme=theme})
  tag(root,"INVENTORY_CAPACITY_METER");root:SetAttribute("PresentationRole","INVENTORY_CAPACITY_METER");root:SetAttribute("OwnsCapacityValue",false)
  return root
end

function RobloxCommonUI.CreateStashScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"STASH_SCREEN","STASH_SCREEN")
  local left=RobloxCommonUI.CreateInventoryGrid({name="PlayerInventory",columns=5,slotCount=options.inventorySlots or 25,size=UDim2.new(0.49,-6,1,-58),theme=theme});left.Position=UDim2.fromOffset(0,58);left.Parent=body
  local right=RobloxCommonUI.CreateInventoryGrid({name="StashInventory",columns=5,slotCount=options.stashSlots or 30,size=UDim2.new(0.49,-6,1,-58),theme=theme});right.Position=UDim2.new(0.51,6,0,58);right.Parent=body
  local search=RobloxCommonUI.CreateSearchField({size=UDim2.new(0.45,0,0,48),placeholder="보관함 검색",theme=theme});search.Parent=body
  root:SetAttribute("OwnsStorageAuthority",false)
  return root,{player=left,stash=right,search=search}
end

function RobloxCommonUI.CreateLootWindow(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,parts=deepSystemPanel(options,"LOOT_WINDOW","LOOT_WINDOW",options.title or "획득 가능",{"아이템 1","아이템 2","아이템 3","아이템 4"})
  local take=RobloxCommonUI.CreatePrimaryButton({text=options.takeAllText or "모두 획득",size=UDim2.fromOffset(160,46),theme=theme});take.AnchorPoint=Vector2.new(1,1);take.Position=UDim2.new(1,-16,1,-16);take.Parent=parts.inner
  root:SetAttribute("OwnsLootAuthority",false)
  return root,{takeAll=take,parts=parts}
end

function RobloxCommonUI.CreateLootFeed(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"LOOT_FEED","LOOT_FEED","최근 획득",options.rows or {"신규 · 회복 포션 ×2","희귀 · 강화 파편 ×1","재료 · 철괴 ×4"})
  root.Size=options.size or UDim2.fromOffset(330,190)
  return root,parts
end

function RobloxCommonUI.CreateQuickSlotBar(options)
  options=options or {}
  local root,holder,slots=RobloxCommonUI.CreateHotbar({name=options.name or "QuickSlotBar",slotCount=options.slotCount or 4,size=options.size or UDim2.fromOffset(280,70),theme=options.theme})
  tag(root,"QUICK_SLOT_BAR");root:SetAttribute("PresentationRole","QUICK_SLOT_BAR");root:SetAttribute("OwnsUseAuthority",false)
  return root,holder,slots
end

function RobloxCommonUI.CreateRadialMenu(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "RadialMenu";root.Size=options.size or UDim2.fromOffset(360,360);root.BackgroundTransparency=1;tag(root,"RADIAL_MENU")
  local center=Instance.new("Frame");center.Name="Center";center.AnchorPoint=Vector2.new(0.5,0.5);center.Position=UDim2.fromScale(0.5,0.5);center.Size=UDim2.fromOffset(92,92);center.BackgroundColor3=theme.Panel;center.BorderSizePixel=0;center.Parent=root;corner(center,46);stroke(center,theme.Border,1.5,0.10)
  commonText(center,"CenterLabel",options.centerText or "퀵 액션",UDim2.new(),UDim2.fromScale(1,1),theme.Text,12,true).TextXAlignment=Enum.TextXAlignment.Center
  local actions=options.actions or {"사용","장비","스킬","지도","도감","제작","상점","취소"}
  local buttons={}
  for i,label in ipairs(actions) do
    local angle=math.rad((i-1)*360/#actions-90)
    local b=RobloxCommonUI.CreateTabButton({text=tostring(label),size=UDim2.fromOffset(82,46),theme=theme})
    b.AnchorPoint=Vector2.new(0.5,0.5);b.Position=UDim2.new(0.5,math.cos(angle)*125,0.5,math.sin(angle)*125);b.Parent=root;b:SetAttribute("RadialIndex",i);buttons[i]=b
  end
  root:SetAttribute("OwnsActionAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateLoadoutPresetPanel(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"LOADOUT_PRESET_PANEL","LOADOUT_PRESET_PANEL","로드아웃",options.rows or {"프리셋 1 · 균형","프리셋 2 · 공격","프리셋 3 · 생존","프리셋 4 · 탐험"})
  root:SetAttribute("OwnsLoadoutAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateEquipmentComparePanel(options)
  return deepSystemPanel(options,"EQUIPMENT_COMPARE_PANEL","EQUIPMENT_COMPARE_PANEL","장비 비교",{"착용 중","선택 장비","주요 수치 변화","세트/효과 변화","요구조건 / 무게"})
end

function RobloxCommonUI.CreateSetBonusPanel(options)
  local root,parts=deepSystemPanel(options,"SET_BONUS_PANEL","SET_BONUS_PANEL","세트 효과",{"2세트 효과","3세트 효과","4세트 효과","현재 활성 효과"})
  root:SetAttribute("OwnsSetBonusAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateSocketEnchantPanel(options)
  local root,parts=deepSystemPanel(options,"SOCKET_ENCHANT_PANEL","SOCKET_ENCHANT_PANEL","소켓 / 인챈트",{"빈 소켓","장착된 룬","장착된 보석","스탯 요구조건","세트/영역 시너지"})
  root:SetAttribute("OwnsEnchantAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateUpgradePanel(options)
  local root,parts=deepSystemPanel(options,"UPGRADE_PANEL","UPGRADE_PANEL","강화",{"현재 단계 → 다음 단계","필요 재료","변경되는 수치","해금 효과","외형 단계"})
  root:SetAttribute("OwnsUpgradeAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateRepairPanel(options)
  local root,parts=deepSystemPanel(options,"REPAIR_PANEL","REPAIR_PANEL","수리",{"현재 상태","수리 후 상태","필요 재화/재료","일괄 수리"})
  root:SetAttribute("OwnsRepairAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateDismantlePanel(options)
  local root,parts=deepSystemPanel(options,"DISMANTLE_PANEL","DISMANTLE_PANEL","분해",{"선택 아이템","예상 반환 재료","보호/잠금 상태","다중 선택 분해"})
  root:SetAttribute("OwnsDismantleAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCraftingTree(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"CRAFTING_TREE","CRAFTING_TREE")
  local nodes=options.nodes or {"기초 재료","중간 부품","장비","강화","특수 제작"}
  local built={}
  for i,label in ipairs(nodes) do
    local n=RobloxCommonUI.CreateQuestCard({name="CraftNode"..i,title=tostring(label),description=i==1 and "시작 노드" or "선행 제작 필요",size=UDim2.fromOffset(170,88),theme=theme})
    n.Position=UDim2.new(0.08+(i-1)*0.18,0,0.22+((i%2)*0.28),0);n.Parent=body;n:SetAttribute("CraftTreeNodeIndex",i);built[i]=n
  end
  root:SetAttribute("OwnsRecipeUnlockAuthority",false)
  return root,built
end

function RobloxCommonUI.CreateRecipeDetailPanel(options)
  local root,parts=deepSystemPanel(options,"RECIPE_DETAIL_PANEL","RECIPE_DETAIL_PANEL","제작법 상세",{"결과 아이템","필요 재료","보유/부족 수량","대체 재료","제작대/조건","추적 여부"})
  root:SetAttribute("OwnsCraftAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMaterialTracker(options)
  local root,parts=deepSystemPanel(options,"MATERIAL_TRACKER","MATERIAL_TRACKER","재료 추적",{"철괴 3 / 5","약초 8 / 8","강화 파편 1 / 2","획득처 표시"})
  root:SetAttribute("OwnsMaterialTrackingAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateBuySellPanel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({
    name=options.name or "BuySellPanel",size=options.size or UDim2.new(1,-24,1,-24),theme=theme
  })
  tag(root,"BUY_SELL_PANEL")
  commonText(inner,"Title",options.title or "장비 매매",UDim2.fromOffset(14,8),UDim2.new(1,-28,0,34),theme.Text,20,true)
  local buyTab=RobloxCommonUI.CreateTabButton({name="TradeBuyTab",text="구매",selected=true,size=UDim2.new(.5,-4,0,48),theme=theme})
  buyTab.Position=UDim2.fromOffset(10,44);buyTab.Parent=inner
  local sellTab=RobloxCommonUI.CreateTabButton({name="TradeSellTab",text="판매",selected=false,size=UDim2.new(.5,-4,0,48),theme=theme})
  sellTab.Position=UDim2.new(.5,4,0,44);sellTab.Parent=inner
  local scroll=Instance.new("ScrollingFrame")
  scroll.Name="TradeItems";scroll.Position=UDim2.fromOffset(10,102);scroll.Size=UDim2.new(1,-20,1,-160)
  scroll.BackgroundTransparency=1;scroll.BorderSizePixel=0;scroll.ScrollBarThickness=4;scroll.Active=true
  scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y;scroll.CanvasSize=UDim2.fromOffset(0,0);scroll.Parent=inner
  local layout=commonList(scroll,false,6)
  layout.VerticalAlignment=Enum.VerticalAlignment.Top
  local action=RobloxCommonUI.CreatePrimaryButton({name="TradeAction",text="상품을 선택해",size=UDim2.new(1,-20,0,48),theme=theme})
  action.Position=UDim2.new(0,10,1,-52);action.Parent=inner
  local buttons,items,visible={}, {},{}
  local mode="BUY"
  local selected=nil
  local gold=0
  local function sync(state)
    state=type(state)=="table"and state or {}
    items=type(state.items)=="table"and state.items or {}
    gold=tonumber(state.gold)or 0
    visible={}
    for _,item in ipairs(items)do
      local price=mode=="BUY"and item.price or item.sellPrice
      if price~=nil then visible[#visible+1]=item end
    end
    for index,item in ipairs(visible)do
      if not buttons[index]then
        local button=RobloxCommonUI.CreateTabButton({name="TradeItem"..index,size=UDim2.new(1,-6,0,48),theme=theme})
        button.LayoutOrder=index;button.Parent=scroll;buttons[index]=button
        local at=index
        button.Activated:Connect(function()
          local itemNow=visible[at]
          if itemNow then selected=itemNow.id;sync({items=items,gold=gold})end
        end)
      end
      local price=mode=="BUY"and item.price or item.sellPrice
      buttons[index].Visible=true
      buttons[index].Text=tostring(item.name or item.id or "아이템").." · "..tostring(price).."G"
      buttons[index].BackgroundColor3=item.id==selected and theme.Primary or theme.PanelRaised
      buttons[index]:SetAttribute("BoundItemId",tostring(item.id or ""))
    end
    for index=#visible+1,#buttons do buttons[index].Visible=false end
    local chosen
    for _,item in ipairs(visible)do if item.id==selected then chosen=item;break end end
    local enabled=chosen~=nil and ((mode=="BUY"and chosen.canBuy==true and type(options.onBuy)=="function")
      or(mode=="SELL"and chosen.canSell==true and type(options.onSell)=="function"))
    action.Active=enabled
    action.AutoButtonColor=enabled
    action.Text=enabled and (mode=="BUY"and"구매하기"or"판매하기")or"거래 가능한 상품을 선택해"
    buyTab.BackgroundColor3=mode=="BUY"and theme.Primary or theme.PanelRaised
    sellTab.BackgroundColor3=mode=="SELL"and theme.Primary or theme.PanelRaised
    root:SetAttribute("BoundTradeItemCount",#visible)
    root:SetAttribute("TradeMode",mode)
  end
  buyTab.Activated:Connect(function()mode="BUY";selected=nil;sync({items=items,gold=gold})end)
  sellTab.Activated:Connect(function()mode="SELL";selected=nil;sync({items=items,gold=gold})end)
  action.Activated:Connect(function()
    if not action.Active then return end
    for _,item in ipairs(visible)do
      if item.id==selected then
        if mode=="BUY"and item.canBuy==true and type(options.onBuy)=="function"then options.onBuy(item.id,item)
        elseif mode=="SELL"and item.canSell==true and type(options.onSell)=="function"then options.onSell(item.id,item)end
        return
      end
    end
  end)
  sync({items=options.items or {},gold=options.gold or 0})
  root:SetAttribute("OwnsTradeAuthority",false)
  root:SetAttribute("OwnsEconomyAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,{inner=inner,list=scroll,labels=buttons,buy=buyTab,sell=sellTab,action=action,Sync=sync}
end

function RobloxCommonUI.CreateBuybackPanel(options)
  local root,parts=deepSystemPanel(options,"BUYBACK_PANEL","BUYBACK_PANEL","되사기",{"최근 판매 아이템","판매 가격","되사기 가격","판매 시간/세션"})
  root:SetAttribute("OwnsTradeAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCodexScreen(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"CODEX_SCREEN","CODEX_SCREEN")
  local nav=RobloxCommonUI.CreateSideNavigation({name="CodexCategories",items=options.categories or {"아이템","장비","몬스터","지역","인물","기록"},size=UDim2.new(0.26,-8,1,0),theme=theme});nav.Parent=body
  local detail=Instance.new("Frame");detail.Name="CodexDetail";detail.Position=UDim2.new(0.26,8,0,0);detail.Size=UDim2.new(0.74,-8,1,0);detail.BackgroundColor3=theme.PanelInset;detail.BorderSizePixel=0;detail.Parent=body;corner(detail,theme.Corner)
  commonText(detail,"Title",options.entryTitle or "발견한 항목",UDim2.fromOffset(16,12),UDim2.new(1,-32,0,38),theme.Text,20,true)
  commonText(detail,"Body",options.entryBody or "설명 · 획득처 · 관련 제작 · 관련 퀘스트",UDim2.fromOffset(16,56),UDim2.new(1,-32,1,-72),theme.MutedText,14,false)
  root:SetAttribute("OwnsDiscoveryAuthority",false)
  return root,{nav=nav,detail=detail}
end

function RobloxCommonUI.CreateCollectionProgress(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateProgressBar({name=options.name or "CollectionProgress",label=options.label or "수집률",value=options.value or 0,size=options.size or UDim2.fromOffset(320,44),theme=theme})
  tag(root,"COLLECTION_PROGRESS");root:SetAttribute("OwnsCollectionProgress",false)
  return root
end

function RobloxCommonUI.CreateRecentItemsPanel(options)
  local root,parts=deepSystemPanel(options,"RECENT_ITEMS_PANEL","RECENT_ITEMS_PANEL","최근 획득",options and options.rows or {"방금 획득","새 아이템","새 제작법","새 도감 항목"})
  root:SetAttribute("OwnsAcquisitionHistory",false)
  return root,parts
end

function RobloxCommonUI.CreateItemSourceUsagePanel(options)
  local root,parts=deepSystemPanel(options,"ITEM_SOURCE_USAGE_PANEL","ITEM_SOURCE_USAGE_PANEL","획득처 / 사용처",{"획득 지역","획득 대상","제작 재료 사용처","강화 사용처","퀘스트/상점 연결"})
  root:SetAttribute("OwnsSourceTruthAuthority",false)
  return root,parts
end


-- 하우징/샌드박스/정착지 시스템 깊이 v6
function RobloxCommonUI.CreateBuildCatalogPanel(options)
  return deepSystemPanel(options,"BUILD_CATALOG_PANEL","BUILD_CATALOG_PANEL","건축 목록",{"기초","벽/문/창","천장/지붕","계단/난간","가구","제작소","장식"})
end

function RobloxCommonUI.CreateBuildPieceCard(options)
  return deepSystemPanel(options,"BUILD_PIECE_CARD","BUILD_PIECE_CARD",options and options.title or "건축 부품",{"분류 / 티어","필요 재료","스냅 유형","지원 역할","배치 가능 상태"})
end

function RobloxCommonUI.CreatePlacementGhostState(options)
  local root,parts=deepSystemPanel(options,"PLACEMENT_GHOST_STATE","PLACEMENT_GHOST_STATE","배치 미리보기",{"위치","회전","스냅 대상","유효/무효","필요 재료"})
  root:SetAttribute("OwnsPlacementAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateSnapIndicator(options)
  local root,parts=deepSystemPanel(options,"SNAP_INDICATOR","SNAP_INDICATOR","스냅",{"스냅 지점","스냅 유형","연결 대상","회전 단계"})
  root.Size=options and options.size or UDim2.fromOffset(300,190)
  root:SetAttribute("OwnsSnapAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateStabilityMeter(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateProgressBar({name=options.name or "StabilityMeter",label=options.label or "구조 안정성",value=options.value or 0,size=options.size or UDim2.fromOffset(320,44),theme=theme})
  tag(root,"STABILITY_METER")
  root:SetAttribute("PresentationRole","STABILITY_METER")
  root:SetAttribute("OwnsStabilityCalculation",false)
  return root
end

function RobloxCommonUI.CreateBuildTierBadge(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "BuildTierBadge";root.Size=options.size or UDim2.fromOffset(150,38);root.BackgroundColor3=theme.PanelRaised;root.BorderSizePixel=0;tag(root,"BUILD_TIER_BADGE");corner(root,10);stroke(root,theme.Border,1,0.18)
  local label=commonText(root,"Tier",options.text or "건축 티어",UDim2.fromOffset(10,0),UDim2.new(1,-20,1,0),theme.Text,12,true);label.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("OwnsTierAuthority",false)
  return root,label
end

function RobloxCommonUI.CreatePlacementValidityBanner(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "PlacementValidityBanner";root.Size=options.size or UDim2.fromOffset(340,48);root.BackgroundColor3=theme.Panel;root.BorderSizePixel=0;tag(root,"PLACEMENT_VALIDITY_BANNER");corner(root,10);stroke(root,theme.Border,1,0.12)
  local label=commonText(root,"State",options.text or "배치 가능",UDim2.fromOffset(12,0),UDim2.new(1,-24,1,0),options.valid==false and theme.Danger or theme.Positive,13,true)
  root:SetAttribute("ColorOnlyStateForbidden",true);root:SetAttribute("OwnsPlacementValidation",false)
  return root,label
end

function RobloxCommonUI.CreateBuildActionBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "BuildActionBar";root.Size=options.size or UDim2.new(1,0,0,58);root.BackgroundColor3=theme.Panel;root.BorderSizePixel=0;tag(root,"BUILD_ACTION_BAR");corner(root,10);stroke(root,theme.Border,1,0.14)
  local holder=Instance.new("Frame");holder.Name="Actions";holder.Position=UDim2.fromOffset(8,6);holder.Size=UDim2.new(1,-16,1,-12);holder.BackgroundTransparency=1;holder.Parent=root;commonList(holder,true,6)
  local labels=options.actions or {"배치","회전","이동","복사","철거","재질"}
  local buttons={}
  for i,label in ipairs(labels) do local b=RobloxCommonUI.CreateTabButton({text=label,size=UDim2.fromOffset(84,44),theme=theme});b.LayoutOrder=i;b.Parent=holder;buttons[i]=b end
  root:SetAttribute("OwnsBuildAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateObjectTransformPanel(options)
  local root,parts=deepSystemPanel(options,"OBJECT_TRANSFORM_PANEL","OBJECT_TRANSFORM_PANEL","오브젝트 편집",{"이동","회전","높이","복사","정렬","삭제"})
  root:SetAttribute("OwnsTransformAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateGridSnapControl(options)
  local root,parts=deepSystemPanel(options,"GRID_SNAP_CONTROL","GRID_SNAP_CONTROL","그리드 / 스냅",{"자유 배치","그리드 배치","각도 스냅","표면 스냅","소켓 스냅"})
  root:SetAttribute("OwnsSnapAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMaterialPalettePanel(options)
  local root,parts=deepSystemPanel(options,"MATERIAL_PALETTE_PANEL","MATERIAL_PALETTE_PANEL","재질 / 색상",{"재질","색상","마모","오염","습윤","스타일 변형"})
  root:SetAttribute("OwnsMaterialAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateBlueprintPanel(options)
  local root,parts=deepSystemPanel(options,"BLUEPRINT_PANEL","BLUEPRINT_PANEL","블루프린트",{"저장된 설계","새 설계 저장","불러오기","미리보기","필요 재료"})
  root:SetAttribute("OwnsBlueprintSaveAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateUndoRedoBar(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame");root.Name=options.name or "UndoRedoBar";root.Size=options.size or UDim2.fromOffset(220,50);root.BackgroundTransparency=1;tag(root,"UNDO_REDO_BAR");commonList(root,true,8)
  local undo=RobloxCommonUI.CreateTabButton({text="되돌리기",size=UDim2.fromOffset(104,46),theme=theme});undo.Parent=root
  local redo=RobloxCommonUI.CreateTabButton({text="다시 실행",size=UDim2.fromOffset(104,46),theme=theme});redo.Parent=root
  root:SetAttribute("OwnsHistoryAuthority",false)
  return root,{undo=undo,redo=redo}
end

function RobloxCommonUI.CreateOwnershipPermissionPanel(options)
  local root,parts=deepSystemPanel(options,"OWNERSHIP_PERMISSION_PANEL","OWNERSHIP_PERMISSION_PANEL","소유 / 권한",{"소유자","파티/클랜 권한","배치 권한","보관함 권한","철거 권한"})
  root:SetAttribute("OwnsPermissionAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateRepairBuildingPanel(options)
  local root,parts=deepSystemPanel(options,"REPAIR_BUILDING_PANEL","REPAIR_BUILDING_PANEL","건축 수리",{"현재 상태","수리 후 상태","필요 재료","일괄 수리"})
  root:SetAttribute("OwnsRepairAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateDemolishPreviewPanel(options)
  local root,parts=deepSystemPanel(options,"DEMOLISH_PREVIEW_PANEL","DEMOLISH_PREVIEW_PANEL","철거 미리보기",{"철거 대상","연결된 부품","예상 반환","보관함/가구 영향","확인"})
  root:SetAttribute("OwnsDemolishAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateUpkeepDecayPanel(options)
  local root,parts=deepSystemPanel(options,"UPKEEP_DECAY_PANEL","UPKEEP_DECAY_PANEL","유지 / 부식",{"보호 범위","현재 유지 상태","필요 자원","예상 지속","경고"})
  root:SetAttribute("OwnsDecayAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateBedRespawnPanel(options)
  local root,parts=deepSystemPanel(options,"BED_RESPAWN_PANEL","BED_RESPAWN_PANEL","침대 / 재시작 지점",{"등록 상태","위치","사용 조건","재사용 상태"})
  root:SetAttribute("OwnsRespawnAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateRoomScorePanel(options)
  local root,parts=deepSystemPanel(options,"ROOM_SCORE_PANEL","ROOM_SCORE_PANEL","주거 상태",{"실내 여부","조명","가구","장식","쾌적도/방 점수"})
  root:SetAttribute("OwnsRoomScoreAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateFurnitureCatalog(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,body=surfaceShell(options,"FURNITURE_CATALOG","FURNITURE_CATALOG")
  local search=RobloxCommonUI.CreateSearchField({size=UDim2.new(0.44,0,0,48),placeholder="가구 검색",theme=theme});search.Parent=body
  local filters=RobloxCommonUI.CreateFilterBar({filters=options.filters or {"전체","침실","수납","조명","제작","농사","장식"},size=UDim2.new(1,0,0,48),theme=theme});filters.Position=UDim2.fromOffset(0,58);filters.Parent=body
  local list=Instance.new("ScrollingFrame");list.Name="Furniture";list.Position=UDim2.fromOffset(0,116);list.Size=UDim2.new(1,0,1,-116);list.BackgroundTransparency=1;list.BorderSizePixel=0;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new();list.Parent=body
  local grid=Instance.new("UIGridLayout");grid.CellSize=UDim2.new(0.33,-8,0,118);grid.CellPadding=UDim2.fromOffset(10,10);grid.Parent=list
  root:SetAttribute("OwnsFurniturePlacementAuthority",false)
  return root,{search=search,filters=filters,list=list}
end

function RobloxCommonUI.CreateSettlementOverview(options)
  local root,parts=deepSystemPanel(options,"SETTLEMENT_OVERVIEW","SETTLEMENT_OVERVIEW","정착지",{"주거","보관","제작소","조명","농사","NPC/침대","서비스","경고"})
  root:SetAttribute("OwnsSettlementAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateFarmPlotPanel(options)
  local root,parts=deepSystemPanel(options,"FARM_PLOT_PANEL","FARM_PLOT_PANEL","재배 구획",{"씨앗","성장 단계","물/관리","수확","계절/지역 조건"})
  root:SetAttribute("OwnsFarmingAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateAnimalHousingPanel(options)
  local root,parts=deepSystemPanel(options,"ANIMAL_HOUSING_PANEL","ANIMAL_HOUSING_PANEL","동물 우리",{"수용 수","먹이","상태","생산물","청결/관리"})
  root:SetAttribute("OwnsAnimalAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateProcessingMachinePanel(options)
  local root,parts=deepSystemPanel(options,"PROCESSING_MACHINE_PANEL","PROCESSING_MACHINE_PANEL","가공 설비",{"입력","처리 중","출력","대기열","연료/전력 조건"})
  root:SetAttribute("OwnsProcessingAuthority",false)
  return root,parts
end


-- AI 동료/NPC 상호작용 시스템 깊이 v7
function RobloxCommonUI.CreateAiCompanionStatusCard(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"AI_COMPANION_STATUS_CARD","AI_COMPANION_STATUS_CARD",options.nameText or "AI 동료",{
    options.roleText or "역할 / 현재 행동",
    options.distanceText or "거리 / 합류 상태",
    options.moodText or "관계 / 기분",
    options.contextText or "현재 상황 반응"
  })
  root:SetAttribute("OwnsCompanionStateAuthority",false)
  root:SetAttribute("OwnsAiDecisionAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionCommandWheel(options)
  options=options or {}
  local actions=options.actions or {"따라와","대기","이동","공격 지원","방어","후퇴","상호작용","도움"}
  local root,buttons=RobloxCommonUI.CreateRadialMenu({name=options.name or "CompanionCommandWheel",actions=actions,centerText=options.centerText or "동료 명령",size=options.size,theme=options.theme})
  tag(root,"COMPANION_COMMAND_WHEEL")
  root:SetAttribute("PresentationRole","COMPANION_COMMAND_WHEEL")
  root:SetAttribute("OwnsCommandAuthority",false)
  root:SetAttribute("OwnsAiDecisionAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateCompanionOrderQueue(options)
  local root,parts=deepSystemPanel(options,"COMPANION_ORDER_QUEUE","COMPANION_ORDER_QUEUE","명령 대기열",{
    "현재 명령","다음 명령","상호작용 예약","취소/순서변경"
  })
  root:SetAttribute("OwnsCommandQueueAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionRolePanel(options)
  local root,parts=deepSystemPanel(options,"COMPANION_ROLE_PANEL","COMPANION_ROLE_PANEL","동료 역할",{
    "전투 지원","채집/운반","정찰","제작/서비스","치유/보조"
  })
  root:SetAttribute("OwnsRoleAssignmentAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionFormationPanel(options)
  local root,parts=deepSystemPanel(options,"COMPANION_FORMATION_PANEL","COMPANION_FORMATION_PANEL","진형 / 거리",{
    "가까이","기본 거리","멀리","좌/우 위치","후방 지원"
  })
  root:SetAttribute("OwnsFormationAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionCombatStancePanel(options)
  local root,parts=deepSystemPanel(options,"COMPANION_COMBAT_STANCE_PANEL","COMPANION_COMBAT_STANCE_PANEL","전투 성향",{
    "방어적","균형","공격적","플레이어 보호","대상 집중"
  })
  root:SetAttribute("OwnsCombatAiAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionTargetPingCard(options)
  local root,parts=deepSystemPanel(options,"COMPANION_TARGET_PING_CARD","COMPANION_TARGET_PING_CARD","대상 지시",{
    "공격 대상","이동 지점","상호작용 대상","위험/관심 지점"
  })
  root:SetAttribute("OwnsTargetAuthority",false)
  root:SetAttribute("OwnsPingAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionHelpRequest(options)
  local root,parts=deepSystemPanel(options,"COMPANION_HELP_REQUEST","COMPANION_HELP_REQUEST","도움 요청",{
    "위험 상태","도움 종류","거리","응답 상태"
  })
  root:SetAttribute("OwnsHelpResolutionAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionReviveRescuePanel(options)
  local root,parts=deepSystemPanel(options,"COMPANION_REVIVE_RESCUE_PANEL","COMPANION_REVIVE_RESCUE_PANEL","구조 / 회복",{
    "쓰러짐 상태","구조 가능 여부","거리","위험도","진행 상태"
  })
  root:SetAttribute("OwnsReviveAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionInventoryHandoff(options)
  local root,parts=deepSystemPanel(options,"COMPANION_INVENTORY_HANDOFF","COMPANION_INVENTORY_HANDOFF","아이템 전달",{
    "내 인벤토리","동료 보유","전달 수량","무게/용량","잠금/퀘스트 상태"
  })
  root:SetAttribute("OwnsInventoryAuthority",false)
  root:SetAttribute("OwnsTransferAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionGiftPanel(options)
  local root,parts=deepSystemPanel(options,"COMPANION_GIFT_PANEL","COMPANION_GIFT_PANEL","선물 / 호감 상호작용",{
    "선택 아이템","반응 예상 표시","관계 상태","선물 가능 여부"
  })
  root:SetAttribute("OwnsRelationshipAuthority",false)
  root:SetAttribute("OwnsGiftOutcomeAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionRelationshipDetail(options)
  local root,parts=deepSystemPanel(options,"COMPANION_RELATIONSHIP_DETAIL","COMPANION_RELATIONSHIP_DETAIL","관계 상세",{
    "관계 단계","신뢰","기분","최근 상호작용","잠긴 대화/행동"
  })
  root:SetAttribute("OwnsRelationshipValue",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcMemorySummary(options)
  local root,parts=deepSystemPanel(options,"NPC_MEMORY_SUMMARY","NPC_MEMORY_SUMMARY","기억 요약",{
    "최근 사건","플레이어와의 약속","중요 인물","알고 있는 장소","미해결 대화"
  })
  root:SetAttribute("OwnsMemoryTruthAuthority",false)
  root:SetAttribute("OwnsAiMemoryAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcTopicBrowser(options)
  local root,parts=deepSystemPanel(options,"NPC_TOPIC_BROWSER","NPC_TOPIC_BROWSER","대화 주제",{
    "현재 사건","지역","인물","의뢰","소문","개인 이야기"
  })
  root:SetAttribute("OwnsDialogueTruth",false)
  root:SetAttribute("OwnsTopicUnlockAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcContextReaction(options)
  local root,parts=deepSystemPanel(options,"NPC_CONTEXT_REACTION","NPC_CONTEXT_REACTION","상황 반응",{
    "날씨/시간","전투 직후","지역 상태","플레이어 장비/상태","최근 사건"
  })
  root:SetAttribute("OwnsWorldStateAuthority",false)
  root:SetAttribute("OwnsAiDecisionAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcScheduleAvailability(options)
  local root,parts=deepSystemPanel(options,"NPC_SCHEDULE_AVAILABILITY","NPC_SCHEDULE_AVAILABILITY","일정 / 이용 가능",{
    "현재 위치","현재 활동","다음 활동","서비스 가능","특수 일정"
  })
  root:SetAttribute("OwnsScheduleAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcServiceMenu(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"NPC_SERVICE_MENU","NPC_SERVICE_MENU",options.title or "서비스",{
    "거래","수리","제작","치유","훈련","정보","보관"
  })
  root:SetAttribute("OwnsServiceAuthority",false)
  root:SetAttribute("OwnsEconomyAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcQuestHandoff(options)
  local root,parts=deepSystemPanel(options,"NPC_QUEST_HANDOFF","NPC_QUEST_HANDOFF","의뢰 인계",{
    "현재 목표","진행 요약","전달 아이템","완료 조건","보상 미리보기"
  })
  root:SetAttribute("OwnsQuestAuthority",false)
  root:SetAttribute("OwnsRewardAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcRecruitDismissPanel(options)
  local root,parts=deepSystemPanel(options,"NPC_RECRUIT_DISMISS_PANEL","NPC_RECRUIT_DISMISS_PANEL","영입 / 해산",{
    "동료 역할","현재 파티","영입 조건","해산 영향","확인"
  })
  root:SetAttribute("OwnsPartyAuthority",false)
  root:SetAttribute("OwnsRecruitAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcRumorKnowledgePanel(options)
  local root,parts=deepSystemPanel(options,"NPC_RUMOR_KNOWLEDGE_PANEL","NPC_RUMOR_KNOWLEDGE_PANEL","소문 / 지식",{
    "최근 소문","지역 정보","위험 정보","인물 정보","확실성 표시"
  })
  root:SetAttribute("OwnsKnowledgeTruthAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcCampActivityPanel(options)
  local root,parts=deepSystemPanel(options,"NPC_CAMP_ACTIVITY_PANEL","NPC_CAMP_ACTIVITY_PANEL","캠프 활동",{
    "휴식","경계","제작","요리","대화","정리/운반"
  })
  root:SetAttribute("OwnsCampTaskAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreatePartyTacticsPanel(options)
  local root,parts=deepSystemPanel(options,"PARTY_TACTICS_PANEL","PARTY_TACTICS_PANEL","파티 전술",{
    "대상 우선순위","거리 유지","집중 공격","보호 대상","후퇴 조건"
  })
  root:SetAttribute("OwnsPartyCombatAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCompanionEquipmentSummary(options)
  local root,parts=deepSystemPanel(options,"COMPANION_EQUIPMENT_SUMMARY","COMPANION_EQUIPMENT_SUMMARY","동료 장비",{
    "무기","방어구","유틸리티","세트/효과","장착 제한"
  })
  root:SetAttribute("OwnsEquipAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateAiCompanionAutonomyPanel(options)
  local root,parts=deepSystemPanel(options,"AI_COMPANION_AUTONOMY_PANEL","AI_COMPANION_AUTONOMY_PANEL","행동 선호",{
    "자율 행동 표시","위험 회피","도움 우선","자원 상호작용","대화 참여"
  })
  root:SetAttribute("OwnsAiDecisionAuthority",false)
  root:SetAttribute("OwnsAutonomyAuthority",false)
  return root,parts
end


-- 탑승/이동 상호작용 시스템 깊이 v8
function RobloxCommonUI.CreateMountInteractionPrompt(options)
  options=options or {}
  local root,key,title,subtitle=RobloxCommonUI.CreateNpcInteractionPrompt({
    name=options.name or "MountInteractionPrompt",
    keyText=options.keyText or "E",
    title=options.title or "탑승",
    subtitle=options.subtitle or "좌석과 상태를 확인해",
    size=options.size or UDim2.fromOffset(300,64),
    theme=options.theme,
    interactionId=options.interactionId
  })
  tag(root,"MOUNT_INTERACTION_PROMPT")
  root:SetAttribute("PresentationRole","MOUNT_INTERACTION_PROMPT")
  root:SetAttribute("OwnsMountAuthority",false)
  root:SetAttribute("OwnsSeatAuthority",false)
  return root,key,title,subtitle
end

function RobloxCommonUI.CreateMountStatusHud(options)
  local root,parts=deepSystemPanel(options,"MOUNT_STATUS_HUD","MOUNT_STATUS_HUD","탑승 상태",{
    "탈것 / 차량","속도 상태","체력 / 내구 상태","기력 / 연료","지형 / 경로"
  })
  root.Size=options and options.size or UDim2.fromOffset(360,230)
  root:SetAttribute("OwnsMovementAuthority",false)
  root:SetAttribute("OwnsPhysicsAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMountStaminaMeter(options)
  options=options or {}
  local root=RobloxCommonUI.CreateProgressBar({
    name=options.name or "MountStaminaMeter",
    label=options.label or "탈것 기력",
    value=options.value or 0,
    size=options.size or UDim2.fromOffset(300,42),
    theme=options.theme
  })
  tag(root,"MOUNT_STAMINA_METER")
  root:SetAttribute("OwnsStaminaAuthority",false)
  return root
end

function RobloxCommonUI.CreateRideSeatSelector(options)
  local root,parts=deepSystemPanel(options,"RIDE_SEAT_SELECTOR","RIDE_SEAT_SELECTOR","좌석 선택",{
    "운전/조종","동승석","후방 좌석","화물 좌석","잠긴 좌석"
  })
  root:SetAttribute("OwnsSeatAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreatePassengerList(options)
  local root,parts=deepSystemPanel(options,"PASSENGER_LIST","PASSENGER_LIST","동승자",{
    "운전자","동승자 1","동승자 2","빈 좌석","연결 상태"
  })
  root:SetAttribute("OwnsPartyAuthority",false)
  root:SetAttribute("OwnsSeatAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateBoardingProgress(options)
  options=options or {}
  local root=RobloxCommonUI.CreateProgressBar({
    name=options.name or "BoardingProgress",
    label=options.label or "탑승 중",
    value=options.value or 0,
    size=options.size or UDim2.fromOffset(280,42),
    theme=options.theme
  })
  tag(root,"BOARDING_PROGRESS")
  root:SetAttribute("OwnsBoardingAuthority",false)
  return root
end

function RobloxCommonUI.CreateDisembarkPrompt(options)
  options=options or {}
  local root=RobloxCommonUI.CreateInputHint({
    name=options.name or "DisembarkPrompt",
    text=options.text or "내리기",
    glyph=options.glyph or "↓",
    mode=options.mode or "AUTO",
    size=options.size or UDim2.fromOffset(220,40),
    theme=options.theme
  })
  tag(root,"DISEMBARK_PROMPT")
  root:SetAttribute("OwnsDisembarkAuthority",false)
  return root
end

function RobloxCommonUI.CreateSeatSwitchPanel(options)
  local root,parts=deepSystemPanel(options,"SEAT_SWITCH_PANEL","SEAT_SWITCH_PANEL","좌석 전환",{
    "현재 좌석","앞 좌석","옆 좌석","뒤 좌석","잠긴 좌석"
  })
  root:SetAttribute("OwnsSeatAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMountCommandWheel(options)
  options=options or {}
  local root,buttons=RobloxCommonUI.CreateRadialMenu({
    name=options.name or "MountCommandWheel",
    actions=options.actions or {"따라와","대기","이리와","멀어져","짐 확인","장비"},
    centerText=options.centerText or "탈것 명령",
    size=options.size,
    theme=options.theme
  })
  tag(root,"MOUNT_COMMAND_WHEEL")
  root:SetAttribute("OwnsMountAiAuthority",false)
  root:SetAttribute("OwnsCommandAuthority",false)
  return root,buttons
end

function RobloxCommonUI.CreateMountInventoryPanel(options)
  local root,parts=deepSystemPanel(options,"MOUNT_INVENTORY_PANEL","MOUNT_INVENTORY_PANEL","탈것 보관",{
    "화물 슬롯","무게 / 용량","아이템 전달","잠금 상태","소유 권한"
  })
  root:SetAttribute("OwnsInventoryAuthority",false)
  root:SetAttribute("OwnsCargoAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMountEquipmentPanel(options)
  local root,parts=deepSystemPanel(options,"MOUNT_EQUIPMENT_PANEL","MOUNT_EQUIPMENT_PANEL","탈것 장비",{
    "안장","고삐","가방","조명","보호 장비"
  })
  root:SetAttribute("OwnsEquipAuthority",false)
  root:SetAttribute("OwnsMountStatsAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateVehicleDamageStatus(options)
  local root,parts=deepSystemPanel(options,"VEHICLE_DAMAGE_STATUS","VEHICLE_DAMAGE_STATUS","차량 상태",{
    "프레임","바퀴/추진","좌석","화물부","외형 손상"
  })
  root:SetAttribute("OwnsDamageAuthority",false)
  root:SetAttribute("OwnsRepairAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateFuelEnergyMeter(options)
  options=options or {}
  local root=RobloxCommonUI.CreateProgressBar({
    name=options.name or "FuelEnergyMeter",
    label=options.label or "연료 / 에너지",
    value=options.value or 0,
    size=options.size or UDim2.fromOffset(300,42),
    theme=options.theme
  })
  tag(root,"FUEL_ENERGY_METER")
  root:SetAttribute("OwnsFuelAuthority",false)
  return root
end

function RobloxCommonUI.CreateCargoPanel(options)
  local root,parts=deepSystemPanel(options,"CARGO_PANEL","CARGO_PANEL","화물",{
    "적재량","최대 용량","무게","잠금","빠른 이동"
  })
  root:SetAttribute("OwnsCargoAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateTravelRoutePanel(options)
  local root,parts=deepSystemPanel(options,"TRAVEL_ROUTE_PANEL","TRAVEL_ROUTE_PANEL","이동 경로",{
    "출발지","목적지","경유지","예상 경로","위험/차단 구간"
  })
  root:SetAttribute("OwnsPathfindingAuthority",false)
  root:SetAttribute("OwnsTravelAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateDestinationCard(options)
  local root,parts=deepSystemPanel(options,"DESTINATION_CARD","DESTINATION_CARD",options and options.title or "목적지",{
    "발견 상태","거리","지역 유형","위험 정보","이동 조건"
  })
  root.Size=options and options.size or UDim2.fromOffset(330,230)
  root:SetAttribute("OwnsDestinationUnlockAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateTravelProgressHud(options)
  options=options or {}
  local root=RobloxCommonUI.CreateProgressBar({
    name=options.name or "TravelProgressHud",
    label=options.label or "이동 중",
    value=options.value or 0,
    size=options.size or UDim2.fromOffset(340,42),
    theme=options.theme
  })
  tag(root,"TRAVEL_PROGRESS_HUD")
  root:SetAttribute("OwnsTravelProgressAuthority",false)
  return root
end

function RobloxCommonUI.CreateMountRecallPanel(options)
  local root,parts=deepSystemPanel(options,"MOUNT_RECALL_PANEL","MOUNT_RECALL_PANEL","탈것 호출",{
    "호출 가능","현재 거리","도착 상태","차단 이유","호출 취소"
  })
  root:SetAttribute("OwnsRecallAuthority",false)
  root:SetAttribute("OwnsMountAiAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMountWhistleState(options)
  options=options or {}
  local root=RobloxCommonUI.CreateInputHint({
    name=options.name or "MountWhistleState",
    text=options.text or "탈것 호출",
    glyph=options.glyph or "♪",
    mode=options.mode or "AUTO",
    size=options.size or UDim2.fromOffset(230,40),
    theme=options.theme
  })
  tag(root,"MOUNT_WHISTLE_STATE")
  root:SetAttribute("OwnsRecallAuthority",false)
  return root
end

function RobloxCommonUI.CreateTerrainAccessWarning(options)
  local root,parts=deepSystemPanel(options,"TERRAIN_ACCESS_WARNING","TERRAIN_ACCESS_WARNING","이동 조건",{
    "통과 가능","험지","차단","특수 장비 필요","다른 경로 추천"
  })
  root.Size=options and options.size or UDim2.fromOffset(320,220)
  root:SetAttribute("OwnsTerrainTraversalAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateVehicleControlHints(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "VehicleControlHints"
  root.Size=options.size or UDim2.fromOffset(420,48)
  root.BackgroundTransparency=1
  tag(root,"VEHICLE_CONTROL_HINTS")
  commonList(root,true,8)
  local hints=options.hints or {"가속","감속","회전","내리기"}
  local built={}
  for i,label in ipairs(hints) do
    local hint=RobloxCommonUI.CreateInputHint({text=tostring(label),glyph=tostring(i),mode=options.mode or "AUTO",size=UDim2.fromOffset(94,40),theme=theme})
    hint.LayoutOrder=i
    hint.Parent=root
    built[i]=hint
  end
  root:SetAttribute("OwnsInputAuthority",false)
  root:SetAttribute("OwnsVehicleControlAuthority",false)
  return root,built
end

function RobloxCommonUI.CreateMountSpeedState(options)
  local root,parts=deepSystemPanel(options,"MOUNT_SPEED_STATE","MOUNT_SPEED_STATE","이동 상태",{
    "정지","걷기","달리기","전력 이동","제한 상태"
  })
  root.Size=options and options.size or UDim2.fromOffset(280,210)
  root:SetAttribute("OwnsSpeedAuthority",false)
  return root,parts
end


-- 패링/가드 표현 UI
function RobloxCommonUI.CreateParryTimingIndicator(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "ParryTimingIndicator"
  root.Size=options.size or UDim2.fromOffset(118,118)
  root.BackgroundColor3=theme.PanelInset
  root.BackgroundTransparency=0.18
  root.BorderSizePixel=0
  tag(root,"PARRY_TIMING_INDICATOR")
  corner(root,59)
  stroke(root,theme.BorderBright,2,0.15)

  local inner=Instance.new("Frame")
  inner.Name="TimingCore"
  inner.AnchorPoint=Vector2.new(0.5,0.5)
  inner.Position=UDim2.fromScale(0.5,0.5)
  inner.Size=UDim2.fromScale(0.62,0.62)
  inner.BackgroundColor3=theme.Accent
  inner.BackgroundTransparency=0.42
  inner.BorderSizePixel=0
  inner.Parent=root
  corner(inner,42)

  local label=commonText(root,"State",options.text or "패링",UDim2.fromScale(0,0.34),UDim2.fromScale(1,0.32),theme.Text,13,true)
  label.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("PresentationRole","PARRY_TIMING_INDICATOR")
  root:SetAttribute("OwnsParryTimingAuthority",false)
  root:SetAttribute("OwnsDamageAuthority",false)
  root:SetAttribute("ReducedMotionSafe",true)

  local controller={}
  function controller.SetDisplayRatio(ratio,stateText)
    local value=math.clamp(tonumber(ratio) or 0,0,1)
    inner.Size=UDim2.fromScale(0.42+value*0.20,0.42+value*0.20)
    if stateText~=nil then label.Text=tostring(stateText) end
  end
  return root,controller
end

function RobloxCommonUI.CreateGuardMeter(options)
  options=options or {}
  local root,controller=RobloxCommonUI.CreateProgressBar({
    name=options.name or "GuardMeter",label=options.label or "가드",value=options.value or 0,
    size=options.size or UDim2.fromOffset(260,42),theme=options.theme
  })
  tag(root,"GUARD_METER")
  root:SetAttribute("PresentationRole","GUARD_METER")
  root:SetAttribute("OwnsGuardValue",false)
  root:SetAttribute("OwnsStaminaAuthority",false)
  return root,controller
end

function RobloxCommonUI.CreateGuardBreakWarning(options)
  local root,parts=deepSystemPanel(options,"GUARD_BREAK_WARNING","GUARD_BREAK_WARNING","가드 붕괴",{"방어가 무너졌어","회복 상태 확인","입력/이동 가능 여부는 게임 상태 기준"})
  root.Size=options and options.size or UDim2.fromOffset(330,210)
  root:SetAttribute("OwnsGuardBreakAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCounterReadyIndicator(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "CounterReadyIndicator"
  root.Size=options.size or UDim2.fromOffset(180,42)
  root.BackgroundColor3=theme.Positive
  root.BackgroundTransparency=0.18
  root.BorderSizePixel=0
  tag(root,"COUNTER_READY_INDICATOR")
  corner(root,11)
  stroke(root,theme.BorderBright,1,0.18)
  local label=commonText(root,"Label",options.text or "반격 가능",UDim2.fromOffset(10,0),UDim2.new(1,-20,1,0),theme.Text,13,true)
  label.TextXAlignment=Enum.TextXAlignment.Center
  root:SetAttribute("OwnsCounterWindowAuthority",false)
  return root,label
end

function RobloxCommonUI.CreateAttackTelegraphIndicator(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "AttackTelegraphIndicator"
  root.Size=options.size or UDim2.fromOffset(220,48)
  root.BackgroundColor3=theme.Warning
  root.BackgroundTransparency=0.18
  root.BorderSizePixel=0
  tag(root,"ATTACK_TELEGRAPH_INDICATOR")
  corner(root,12)
  stroke(root,theme.BorderBright,1.2,0.15)
  local label=commonText(root,"Label",options.text or "공격 예고",UDim2.fromOffset(12,0),UDim2.new(1,-24,1,0),theme.Text,13,true)
  root:SetAttribute("OwnsEnemyAttackTiming",false)
  root:SetAttribute("ColorOnlyStateForbidden",true)
  return root,label
end

-- 월드 소품 상호작용 표현 UI
function RobloxCommonUI.CreateWorldPropInteractionPrompt(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=Instance.new("Frame")
  root.Name=options.name or "WorldPropInteractionPrompt"
  root.Size=options.size or UDim2.fromOffset(280,64)
  root.BackgroundColor3=theme.Panel
  root.BackgroundTransparency=0.08
  root.BorderSizePixel=0
  tag(root,"WORLD_PROP_INTERACTION_PROMPT")
  corner(root,12)
  stroke(root,theme.BorderBright,1,0.18)
  local action=commonText(root,"Action",options.actionText or "상호작용",
    UDim2.fromOffset(12,2),UDim2.new(.46,-12,0,27),theme.Accent,13,true)
  local target=commonText(root,"Target",options.targetText or "대상",
    UDim2.new(.46,4,0,2),UDim2.new(.54,-16,0,27),theme.Text,13,false)
  target.TextXAlignment=Enum.TextXAlignment.Right
  local status=commonText(root,"Status","",
    UDim2.fromOffset(12,32),UDim2.new(1,-24,0,23),theme.MutedText,12,false)
  local function sync(state)
    state=type(state)=="table"and state or {}
    action.Text=tostring(state.actionText or options.actionText or "상호작용")
    target.Text=tostring(state.targetText or options.targetText or "대상")
    status.Text=tostring(state.statusText or state.reason or "")
    local available=state.available~=false
    action.TextColor3=available and theme.Accent or theme.Warning
    status.TextColor3=available and theme.MutedText or theme.Warning
    root:SetAttribute("BoundInteractionId",tostring(state.id or options.interactionId or ""))
    root:SetAttribute("BoundInteractionKind",tostring(state.kind or "GENERIC"))
    root:SetAttribute("BoundInteractionState",tostring(state.state or "UNVERIFIED"))
    root:SetAttribute("InteractionAvailable",available)
    root:SetAttribute("InteractionStateRevision",tostring(state.revision or "UNKNOWN"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  root:SetAttribute("InputModes","TOUCH|KEYBOARD_MOUSE|GAMEPAD")
  return root,{action=action,target=target,status=status,Sync=sync}
end

function RobloxCommonUI.CreateWorldPropActionWheel(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root=RobloxCommonUI.CreateRadialMenu({
    name=options.name or "WorldPropActionWheel",actions={},
    centerText=options.centerText or "상호작용",size=options.size,theme=theme
  })
  tag(root,"WORLD_PROP_ACTION_WHEEL")
  local buttons,actions={},{}
  local function sync(state)
    state=type(state)=="table"and state or {}
    actions=type(state.actions)=="table"and state.actions or {}
    for index,row in ipairs(actions)do
      if not buttons[index]then
        local button=RobloxCommonUI.CreateTabButton({
          name="Action"..index,text="",size=UDim2.fromOffset(92,48),theme=theme
        })
        button.Parent=root;buttons[index]=button
        local captured=index
        button.Activated:Connect(function()
          local current=actions[captured]
          if not current or (type(current)=="table"and current.available==false)then return end
          local actionId=type(current)=="table"and (current.id or tostring(captured))or tostring(captured)
          if type(options.onSelect)=="function"then options.onSelect(actionId,current)end
        end)
      end
      local button=buttons[index]
      local angle=math.rad((index-1)*360/#actions-90)
      button.AnchorPoint=Vector2.new(.5,.5)
      button.Position=UDim2.new(.5,math.cos(angle)*125,.5,math.sin(angle)*125)
      button.Name="Action"..index
      local name=type(row)=="table"and (row.label or row.id)or row
      local enabled=type(row)~="table"or row.available~=false
      button.Text=tostring(name or "상호작용")
      button.Active=enabled;button.AutoButtonColor=enabled
      button.Visible=true
      button:SetAttribute("InteractionActionId",tostring(type(row)=="table"and (row.id or index)or index))
      button:SetAttribute("MinimumTouchHeight",48)
    end
    for index=#actions+1,#buttons do buttons[index].Visible=false end
    local center=root:FindFirstChild("Center")
    local label=center and center:FindFirstChild("CenterLabel")
    if label then label.Text=tostring(state.target or options.centerText or "상호작용")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("BoundInteractionKind",tostring(state.kind or "GENERIC"))
    root:SetAttribute("BoundActionCount",#actions)
  end
  sync(options.interaction or {actions=options.actions or {}})
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,buttons,sync
end

function RobloxCommonUI.CreateInteractionProgress(options)
  options=options or {}
  local root,controller=RobloxCommonUI.CreateProgressBar({
    name=options.name or "InteractionProgress",text=options.label or "진행",
    ratio=options.ratio or 0,size=options.size or UDim2.fromOffset(260,40),theme=options.theme
  })
  tag(root,"INTERACTION_PROGRESS")
  local function sync(state)
    state=type(state)=="table"and state or {}
    if state.ratio~=nil then controller.SetRatio(state.ratio,state.text or state.label)
    elseif state.text~=nil or state.label~=nil then controller.SetRatio(root:GetAttribute("DisplayedRatio"),state.text or state.label)end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionDuration",false)
  return root,controller,sync
end

function RobloxCommonUI.CreateInteractionStateCard(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"INTERACTION_STATE_CARD","INTERACTION_STATE_CARD",options.title or "상호작용 상태",
    {"대상","현재 상태","조건","결과"})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.target or "",state.status or "",
      state.requirements or "",state.result or ""}
    for index,label in ipairs(parts.labels)do label.Text=tostring(values[index] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("BoundInteractionKind",tostring(state.kind or "GENERIC"))
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
    root:SetAttribute("OwnsInteractionAuthority",false)
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateSeatInteractionPrompt(options)
  options=options or {}
  return RobloxCommonUI.CreateWorldPropInteractionPrompt({name=options.name or "SeatInteractionPrompt",actionText=options.actionText or "앉기",targetText=options.targetText or "좌석",size=options.size,theme=options.theme})
end

function RobloxCommonUI.CreateBedInteractionPrompt(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"BED_INTERACTION_PROMPT","BED_INTERACTION_PROMPT","침대",{"","","",""})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.action,state.respawnPoint,state.status,state.requirements}
    for i,label in ipairs(parts.labels)do label.Text=tostring(values[i] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("InteractionAvailable",state.available~=false)
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateHarvestInteractionPrompt(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"HARVEST_INTERACTION_PROMPT","HARVEST_INTERACTION_PROMPT","채집 / 수확",{"","","",""})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.target,state.requiredTool,state.progress,state.resourceCategory}
    for i,label in ipairs(parts.labels)do label.Text=tostring(values[i] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("InteractionAvailable",state.available~=false)
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsLootAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateContainerInteractionPrompt(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"CONTAINER_INTERACTION_PROMPT","CONTAINER_INTERACTION_PROMPT","보관함",{"","","",""})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.target,state.status,state.capacity,state.access}
    for i,label in ipairs(parts.labels)do label.Text=tostring(values[i] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("BoundInteractionState",tostring(state.state or "UNVERIFIED"))
    root:SetAttribute("InteractionAvailable",state.available~=false)
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsInventoryAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateLightControlPrompt(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"LIGHT_CONTROL_PROMPT","LIGHT_CONTROL_PROMPT","조명",{"","","",""})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.action,state.status,state.connection,state.requirements}
    for i,label in ipairs(parts.labels)do label.Text=tostring(values[i] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("InteractionAvailable",state.available~=false)
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateReadInspectPanel(options)
  options=options or {}
  local root,parts=deepSystemPanel(options,"READ_INSPECT_PANEL","READ_INSPECT_PANEL",options.title or "조사",{"","","",""})
  local function sync(state)
    state=type(state)=="table"and state or {}
    local values={state.target,state.description,state.status,state.related}
    for i,label in ipairs(parts.labels)do label.Text=tostring(values[i] or "")end
    root:SetAttribute("BoundInteractionId",tostring(state.id or ""))
    root:SetAttribute("BoundInteractionState",tostring(state.state or "UNVERIFIED"))
    root:SetAttribute("SourceAuthority",tostring(state.source or "UNVERIFIED"))
  end
  sync(options.interaction or {})
  root:SetAttribute("OwnsInteractionAuthority",false)
  root:SetAttribute("OwnsDiscoveryAuthority",false)
  return root,{inner=parts.inner,list=parts.list,labels=parts.labels,Sync=sync}
end

function RobloxCommonUI.CreateInventorySmartSortPreview(options)
  local root,parts=deepSystemPanel(options,"INVENTORY_SMART_SORT_PREVIEW","INVENTORY_SMART_SORT_PREVIEW","자동 정렬 미리보기",{"정렬 기준","변경 전/후","즐겨찾기/잠금 보존","적용 전 확인"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateInventoryCapacityForecast(options)
  local root,parts=deepSystemPanel(options,"INVENTORY_CAPACITY_FORECAST","INVENTORY_CAPACITY_FORECAST","용량 예측",{"현재 용량","획득 예정","초과 예상","정리 추천"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateInventoryOverweightResolution(options)
  local root,parts=deepSystemPanel(options,"INVENTORY_OVERWEIGHT_RESOLUTION","INVENTORY_OVERWEIGHT_RESOLUTION","무게 초과 해결",{"초과 무게","버리기 후보","보관함 이동","장비 교체"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateEquipConflictPreview(options)
  local root,parts=deepSystemPanel(options,"EQUIP_CONFLICT_PREVIEW","EQUIP_CONFLICT_PREVIEW","장비 충돌 미리보기",{"현재 장비","교체 대상","해제되는 슬롯","세트/소켓 영향"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateLootFilterPreset(options)
  local root,parts=deepSystemPanel(options,"LOOT_FILTER_PRESET","LOOT_FILTER_PRESET","루팅 필터",{"등급 필터","아이템 종류","자동 줍기","필터 저장"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateStashTransferQueue(options)
  local root,parts=deepSystemPanel(options,"STASH_TRANSFER_QUEUE","STASH_TRANSFER_QUEUE","보관함 이동 대기열",{"이동 예정","용량 확인","충돌 항목","일괄 이동"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMenuSystemSwitcherDrawer(options)
  options=options or {}
  local theme=cloneTheme(options.theme)
  local root,inner=RobloxCommonUI.CreatePanel({
    name=options.name or "MenuSystemSwitcherDrawer",
    size=options.size or UDim2.new(1,-24,1,-24),theme=theme,clipsDescendants=true
  })
  tag(root,"MENU_SYSTEM_SWITCHER_DRAWER")
  commonText(inner,"Title",options.title or "시스템 전환",UDim2.fromOffset(12,8),
    UDim2.new(1,-24,0,36),theme.Text,20,true)
  local scroller=Instance.new("ScrollingFrame")
  scroller.Name="SystemButtons"
  scroller.Position=UDim2.fromOffset(10,52)
  scroller.Size=UDim2.new(1,-20,1,-64)
  scroller.BackgroundTransparency=1;scroller.BorderSizePixel=0
  scroller.ScrollBarThickness=4;scroller.Active=true
  scroller.ScrollingDirection=Enum.ScrollingDirection.Y
  scroller.CanvasSize=UDim2.fromOffset(0,0)
  scroller.AutomaticCanvasSize=Enum.AutomaticSize.Y
  scroller.Parent=inner
  local layout=commonList(scroller,false,8)
  layout.VerticalAlignment=Enum.VerticalAlignment.Top
  local buttons,rows={},{}
  local selectedId=tostring(options.selectedId or "")
  local function sync(state)
    state=type(state)=="table"and state or {}
    rows=type(state.systems)=="table"and state.systems or {}
    if state.selectedId~=nil then selectedId=tostring(state.selectedId)end
    for index,row in ipairs(rows)do
      if not buttons[index]then
        local button=RobloxCommonUI.CreateTabButton({
          name="System"..index,text="",size=UDim2.new(1,-8,0,52),theme=theme
        })
        button.LayoutOrder=index;button.Parent=scroller;buttons[index]=button
        local capturedIndex=index
        button.Activated:Connect(function()
          local current=rows[capturedIndex]
          if not current then return end
          local id=type(current)=="table"and tostring(current.id or capturedIndex)or tostring(capturedIndex)
          if type(current)=="table"and current.enabled==false then return end
          selectedId=id
          sync({systems=rows,selectedId=id})
          if type(options.onSelect)=="function"then options.onSelect(id,current)end
        end)
      end
      local button=buttons[index]
      local id=type(row)=="table"and tostring(row.id or index)or tostring(index)
      local title=type(row)=="table"and (row.title or row.label or row.name)or row
      local enabled=type(row)~="table"or row.enabled~=false
      button.Name="System"..index
      button.LayoutOrder=index
      button.Text=tostring(title or id)
      button.BackgroundColor3=id==selectedId and theme.Primary or theme.PanelRaised
      button.Active=enabled
      button.AutoButtonColor=enabled
      button.Visible=true
      button:SetAttribute("SystemId",id)
      button:SetAttribute("Available",enabled)
      button:SetAttribute("MinimumTouchHeight",48)
      local underline=button:FindFirstChild("SelectedUnderline")
      if underline then underline.Visible=id==selectedId end
    end
    for index=#rows+1,#buttons do buttons[index].Visible=false end
    root:SetAttribute("CurrentSystemId",selectedId)
    root:SetAttribute("BoundSystemCount",#rows)
  end
  sync({systems=options.systems or {"인벤토리","장비","지도","퀘스트","제작","도감"},selectedId=selectedId})
  root:SetAttribute("PresentationRole","MENU_SYSTEM_SWITCHER_DRAWER")
  root:SetAttribute("OwnsSystemAuthority",false)
  root:SetAttribute("OwnsNavigationAuthority",false)
  root:SetAttribute("OwnsSaveAuthority",false)
  root:SetAttribute("OwnsRemoteAuthority",false)
  return root,{inner=inner,list=scroller,labels=buttons,buttons=buttons,Sync=sync}
end

function RobloxCommonUI.CreateNavigationBreadcrumbBackstack(options)
  local root,parts=deepSystemPanel(options,"NAVIGATION_BREADCRUMB_BACKSTACK","NAVIGATION_BREADCRUMB_BACKSTACK","이동 경로",{"현재 위치","이전 화면","상위 시스템","돌아가기"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMenuLastLocationResume(options)
  local root,parts=deepSystemPanel(options,"MENU_LAST_LOCATION_RESUME","MENU_LAST_LOCATION_RESUME","마지막 화면 복귀",{"마지막 시스템","마지막 탭","선택 항목","복귀"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMenuContextQuickActionSheet(options)
  local root,parts=deepSystemPanel(options,"MENU_CONTEXT_QUICK_ACTION_SHEET","MENU_CONTEXT_QUICK_ACTION_SHEET","빠른 작업",{"현재 대상","추천 작업","보조 작업","닫기"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateOneHandBottomNav(options)
  options = options or {}
  local theme = cloneTheme(options.theme)
  -- 기존 더미 카드 대신 모바일에서 실제로 스와이프/터치 가능한 하단 메뉴를 만든다.
  local root = Instance.new("Frame")
  root.Name = options.name or "OneHandBottomNav"
  root.AnchorPoint = Vector2.new(0.5, 1)
  root.Position = options.position or UDim2.new(0.5, 0, 1, -12)
  root.Size = options.size or UDim2.new(1, -24, 0, 76)
  root.BackgroundColor3 = theme.Panel
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, "ONE_HAND_BOTTOM_NAV")
  corner(root, theme.Corner)
  stroke(root, theme.BorderBright, 1.2, 0.14)

  local scroller = Instance.new("ScrollingFrame")
  scroller.Name = "Items"
  scroller.Position = UDim2.fromOffset(7, 5)
  scroller.Size = UDim2.new(1, -14, 1, -10)
  scroller.BackgroundTransparency = 1
  scroller.BorderSizePixel = 0
  scroller.ScrollBarThickness = 3
  scroller.ScrollingDirection = Enum.ScrollingDirection.X
  scroller.CanvasSize = UDim2.fromOffset(0, 0)
  scroller.AutomaticCanvasSize = Enum.AutomaticSize.X
  scroller.Active = true
  scroller.Parent = root
  local layout = commonList(scroller, true, 8)
  layout.HorizontalAlignment = Enum.HorizontalAlignment.Left

  local items = options.items or {"인벤토리","장비","지도","퀘스트","제작","도감"}
  local buttons, underlines = {}, {}
  local selected = math.clamp(tonumber(options.selectedIndex) or 1, 1, math.max(1, #items))
  for i, label in ipairs(items) do
    local button, underline = RobloxCommonUI.CreateTabButton({
      name="Navigation"..i, text=tostring(label), selected=i==selected,
      size=UDim2.fromOffset(108, 52), theme=theme
    })
    button.LayoutOrder = i
    button.Parent = scroller
    button:SetAttribute("NavigationIndex", i)
    button:SetAttribute("MinimumTouchHeight", 48)
    button.Activated:Connect(function()
      selected = i
      for index, other in ipairs(buttons) do
        other.BackgroundColor3 = index==selected and theme.Primary or theme.PanelRaised
        underlines[index].Visible = index==selected
      end
      root:SetAttribute("SelectedNavigationIndex", selected)
      if type(options.onSelect)=="function" then options.onSelect(i, label) end
    end)
    buttons[i], underlines[i] = button, underline
  end
  root:SetAttribute("SelectedNavigationIndex", selected)
  root:SetAttribute("PresentationRole", "ONE_HAND_BOTTOM_NAV")
  root:SetAttribute("MobileThumbReachable", true)
  root:SetAttribute("OwnsSystemAuthority", false)
  root:SetAttribute("OwnsNavigationAuthority", false)
  root:SetAttribute("OwnsSaveAuthority", false)
  root:SetAttribute("OwnsRemoteAuthority", false)
  return root, {inner=scroller, list=scroller, labels=buttons, buttons=buttons}
end

function RobloxCommonUI.CreateSetProgressTracker(options)
  local root,parts=deepSystemPanel(options,"SET_PROGRESS_TRACKER","SET_PROGRESS_TRACKER","세트 진행도",{"착용 부위","완성 단계","다음 보너스","누락 부위"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateSocketRoutePreview(options)
  local root,parts=deepSystemPanel(options,"SOCKET_ROUTE_PREVIEW","SOCKET_ROUTE_PREVIEW","소켓 경로",{"현재 소켓","장착 후보","조합 경로","변경 결과"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateDurabilityWearPreview(options)
  local root,parts=deepSystemPanel(options,"DURABILITY_WEAR_PREVIEW","DURABILITY_WEAR_PREVIEW","내구도/마모",{"현재 상태","마모 단계","수리 효과","외형 변화"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCraftQueueOverview(options)
  local root,parts=deepSystemPanel(options,"CRAFT_QUEUE_OVERVIEW","CRAFT_QUEUE_OVERVIEW","제작 대기열",{"대기 제작","진행 중","필요 재료","완료 예정"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateRecipePrerequisiteChain(options)
  local root,parts=deepSystemPanel(options,"RECIPE_PREREQUISITE_CHAIN","RECIPE_PREREQUISITE_CHAIN","제작 선행 경로",{"선행 제작","현재 보유","부족 재료","다음 단계"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateMaterialShortageRoute(options)
  local root,parts=deepSystemPanel(options,"MATERIAL_SHORTAGE_ROUTE","MATERIAL_SHORTAGE_ROUTE","재료 부족 경로",{"부족 재료","획득 지역","획득 대상","대체 경로"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateShopPriceDeltaCompare(options)
  local root,parts=deepSystemPanel(options,"SHOP_PRICE_DELTA_COMPARE","SHOP_PRICE_DELTA_COMPARE","가격 비교",{"현재 가격","기준 가격","구매/판매 차이","보유 재화"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateVendorStockState(options)
  local root,parts=deepSystemPanel(options,"VENDOR_STOCK_STATE","VENDOR_STOCK_STATE","상점 재고 상태",{"재고 있음","품절","해금 조건","갱신 상태"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateQuestDependencyChain(options)
  local root,parts=deepSystemPanel(options,"QUEST_DEPENDENCY_CHAIN","QUEST_DEPENDENCY_CHAIN","퀘스트 연결",{"선행 퀘스트","현재 목표","후속 퀘스트","막힌 조건"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateLoreRelationGraph(options)
  local root,parts=deepSystemPanel(options,"LORE_RELATION_GRAPH","LORE_RELATION_GRAPH","기록 관계",{"인물","지역","사건","관련 기록"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateNpcRelationshipTimeline(options)
  local root,parts=deepSystemPanel(options,"NPC_RELATIONSHIP_TIMELINE","NPC_RELATIONSHIP_TIMELINE","관계 변화",{"최근 변화","중요 사건","현재 관계","다음 경계"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreatePartyRoleOverview(options)
  local root,parts=deepSystemPanel(options,"PARTY_ROLE_OVERVIEW","PARTY_ROLE_OVERVIEW","파티 역할",{"전투 역할","지원 역할","현재 상태","중복/빈 역할"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateRouteRiskPreview(options)
  local root,parts=deepSystemPanel(options,"ROUTE_RISK_PREVIEW","ROUTE_RISK_PREVIEW","이동 위험도",{"목적지","경로 위험","날씨/환경","준비 항목"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateThreatEdgeIndicator(options)
  local root,parts=deepSystemPanel(options,"THREAT_EDGE_INDICATOR","THREAT_EDGE_INDICATOR","위협 방향",{"좌/우/후방","위협 등급","거리","시야 밖 상태"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateBossPhaseStrip(options)
  local root,parts=deepSystemPanel(options,"BOSS_PHASE_STRIP","BOSS_PHASE_STRIP","보스 페이즈",{"현재 페이즈","다음 변화","위험 패턴","진행도"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateWaveForecastRibbon(options)
  local root,parts=deepSystemPanel(options,"WAVE_FORECAST_RIBBON","WAVE_FORECAST_RIBBON","웨이브 예고",{"현재 웨이브","다음 구성","정예/보스","준비 시간"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateStatusEffectTimeline(options)
  local root,parts=deepSystemPanel(options,"STATUS_EFFECT_TIMELINE","STATUS_EFFECT_TIMELINE","상태효과 타임라인",{"현재 효과","남은 시간","중첩","해제 가능"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateHousingStructuralSupportOverlay(options)
  local root,parts=deepSystemPanel(options,"HOUSING_STRUCTURAL_SUPPORT_OVERLAY","HOUSING_STRUCTURAL_SUPPORT_OVERLAY","구조 지지 오버레이",{"지지됨","약한 연결","끊긴 연결","보강 지점"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateHousingRoomFunctionHeatmap(options)
  local root,parts=deepSystemPanel(options,"HOUSING_ROOM_FUNCTION_HEATMAP","HOUSING_ROOM_FUNCTION_HEATMAP","방 기능 히트맵",{"생활","제작","보관","이동 동선"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateCropGrowthTimeline(options)
  local root,parts=deepSystemPanel(options,"CROP_GROWTH_TIMELINE","CROP_GROWTH_TIMELINE","작물 성장",{"파종","성장","수확 가능","계절/환경"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateAccessibilityReducedFlashMode(options)
  local root,parts=deepSystemPanel(options,"ACCESSIBILITY_REDUCED_FLASH_MODE","ACCESSIBILITY_REDUCED_FLASH_MODE","번쩍임 감소",{"현재 설정","강한 플래시 대체","경고 표현","미리보기"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateAccessibilityColorBlindShapeBackup(options)
  local root,parts=deepSystemPanel(options,"ACCESSIBILITY_COLOR_BLIND_SHAPE_BACKUP","ACCESSIBILITY_COLOR_BLIND_SHAPE_BACKUP","색상 보조 표식",{"색상 상태","모양 표식","텍스트 보조","미리보기"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateLoadingRetryWithCause(options)
  local root,parts=deepSystemPanel(options,"LOADING_RETRY_WITH_CAUSE","LOADING_RETRY_WITH_CAUSE","재시도 원인 표시",{"실패 원인","재시도","오프라인 대안","안전한 복귀"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
end

function RobloxCommonUI.CreateFailureRecoveryCheckpoint(options)
  local root,parts=deepSystemPanel(options,"FAILURE_RECOVERY_CHECKPOINT","FAILURE_RECOVERY_CHECKPOINT","복구 지점",{"마지막 정상 상태","복구 가능 항목","유실 없음 표시","다시 시작"})
  root:SetAttribute("OwnsSystemAuthority",false)
  return root,parts
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
  elseif id == "MAIN_MENU" then
    return RobloxCommonUI.CreateMainMenu(options)
  elseif id == "TOP_BAR" then
    return RobloxCommonUI.CreateTopBar(options)
  elseif id == "SIDE_NAVIGATION" then
    return RobloxCommonUI.CreateSideNavigation(options)
  elseif id == "PAUSE_MENU" then
    return RobloxCommonUI.CreatePauseMenu(options)
  elseif id == "SETTINGS_PANEL" then
    return RobloxCommonUI.CreateSettingsPanel(options)
  elseif id == "SEARCH_FIELD" then
    return RobloxCommonUI.CreateSearchField(options)
  elseif id == "FILTER_BAR" then
    return RobloxCommonUI.CreateFilterBar(options)
  elseif id == "SORT_CONTROL" then
    return RobloxCommonUI.CreateSortControl(options)
  elseif id == "INVENTORY_FULL_SCREEN" then
    return RobloxCommonUI.CreateInventoryFullScreen(options)
  elseif id == "EQUIPMENT_FULL_SCREEN" then
    return RobloxCommonUI.CreateEquipmentFullScreen(options)
  elseif id == "CHARACTER_DETAIL_SCREEN" then
    return RobloxCommonUI.CreateCharacterDetailScreen(options)
  elseif id == "MAP_FULL_SCREEN" then
    return RobloxCommonUI.CreateMapFullScreen(options)
  elseif id == "QUEST_LOG" then
    return RobloxCommonUI.CreateQuestLog(options)
  elseif id == "CRAFTING_FULL_SCREEN" then
    return RobloxCommonUI.CreateCraftingFullScreen(options)
  elseif id == "SHOP_FULL_SCREEN" then
    return RobloxCommonUI.CreateShopFullScreen(options)
  elseif id == "CONFIRM_DIALOG" then
    return RobloxCommonUI.CreateConfirmDialog(options)
  elseif id == "POPUP_PANEL" then
    return RobloxCommonUI.CreatePopupPanel(options)
  elseif id == "LOADING_STATE" then
    return RobloxCommonUI.CreateLoadingState(options)
  elseif id == "EMPTY_STATE" then
    return RobloxCommonUI.CreateEmptyState(options)
  elseif id == "FAILURE_STATE" then
    return RobloxCommonUI.CreateFailureState(options)
  elseif id == "LOCKED_STATE" then
    return RobloxCommonUI.CreateLockedState(options)
  elseif id == "INPUT_HINT" then
    return RobloxCommonUI.CreateInputHint(options)
  elseif id == "ITEM_DETAIL_PANEL" then
    return RobloxCommonUI.CreateItemDetailPanel(options)
  elseif id == "ITEM_COMPARE_PANEL" then
    return RobloxCommonUI.CreateItemComparePanel(options)
  elseif id == "ITEM_CONTEXT_MENU" then
    return RobloxCommonUI.CreateItemContextMenu(options)
  elseif id == "STACK_SPLIT_DIALOG" then
    return RobloxCommonUI.CreateStackSplitDialog(options)
  elseif id == "MULTI_SELECT_BAR" then
    return RobloxCommonUI.CreateMultiSelectBar(options)
  elseif id == "ITEM_STATE_BADGES" then
    return RobloxCommonUI.CreateItemStateBadges(options)
  elseif id == "INVENTORY_CONTAINER_PANEL" then
    return RobloxCommonUI.CreateInventoryContainerPanel(options)
  elseif id == "INVENTORY_WEIGHT_METER" then
    return RobloxCommonUI.CreateInventoryWeightMeter(options)
  elseif id == "INVENTORY_CAPACITY_METER" then
    return RobloxCommonUI.CreateInventoryCapacityMeter(options)
  elseif id == "STASH_SCREEN" then
    return RobloxCommonUI.CreateStashScreen(options)
  elseif id == "LOOT_WINDOW" then
    return RobloxCommonUI.CreateLootWindow(options)
  elseif id == "LOOT_FEED" then
    return RobloxCommonUI.CreateLootFeed(options)
  elseif id == "QUICK_SLOT_BAR" then
    return RobloxCommonUI.CreateQuickSlotBar(options)
  elseif id == "RADIAL_MENU" then
    return RobloxCommonUI.CreateRadialMenu(options)
  elseif id == "LOADOUT_PRESET_PANEL" then
    return RobloxCommonUI.CreateLoadoutPresetPanel(options)
  elseif id == "EQUIPMENT_COMPARE_PANEL" then
    return RobloxCommonUI.CreateEquipmentComparePanel(options)
  elseif id == "SET_BONUS_PANEL" then
    return RobloxCommonUI.CreateSetBonusPanel(options)
  elseif id == "SOCKET_ENCHANT_PANEL" then
    return RobloxCommonUI.CreateSocketEnchantPanel(options)
  elseif id == "UPGRADE_PANEL" then
    return RobloxCommonUI.CreateUpgradePanel(options)
  elseif id == "REPAIR_PANEL" then
    return RobloxCommonUI.CreateRepairPanel(options)
  elseif id == "DISMANTLE_PANEL" then
    return RobloxCommonUI.CreateDismantlePanel(options)
  elseif id == "CRAFTING_TREE" then
    return RobloxCommonUI.CreateCraftingTree(options)
  elseif id == "RECIPE_DETAIL_PANEL" then
    return RobloxCommonUI.CreateRecipeDetailPanel(options)
  elseif id == "MATERIAL_TRACKER" then
    return RobloxCommonUI.CreateMaterialTracker(options)
  elseif id == "BUY_SELL_PANEL" then
    return RobloxCommonUI.CreateBuySellPanel(options)
  elseif id == "BUYBACK_PANEL" then
    return RobloxCommonUI.CreateBuybackPanel(options)
  elseif id == "CODEX_SCREEN" then
    return RobloxCommonUI.CreateCodexScreen(options)
  elseif id == "COLLECTION_PROGRESS" then
    return RobloxCommonUI.CreateCollectionProgress(options)
  elseif id == "RECENT_ITEMS_PANEL" then
    return RobloxCommonUI.CreateRecentItemsPanel(options)
  elseif id == "ITEM_SOURCE_USAGE_PANEL" then
    return RobloxCommonUI.CreateItemSourceUsagePanel(options)
  elseif id == "BUILD_CATALOG_PANEL" then
    return RobloxCommonUI.CreateBuildCatalogPanel(options)
  elseif id == "BUILD_PIECE_CARD" then
    return RobloxCommonUI.CreateBuildPieceCard(options)
  elseif id == "PLACEMENT_GHOST_STATE" then
    return RobloxCommonUI.CreatePlacementGhostState(options)
  elseif id == "SNAP_INDICATOR" then
    return RobloxCommonUI.CreateSnapIndicator(options)
  elseif id == "STABILITY_METER" then
    return RobloxCommonUI.CreateStabilityMeter(options)
  elseif id == "BUILD_TIER_BADGE" then
    return RobloxCommonUI.CreateBuildTierBadge(options)
  elseif id == "PLACEMENT_VALIDITY_BANNER" then
    return RobloxCommonUI.CreatePlacementValidityBanner(options)
  elseif id == "BUILD_ACTION_BAR" then
    return RobloxCommonUI.CreateBuildActionBar(options)
  elseif id == "OBJECT_TRANSFORM_PANEL" then
    return RobloxCommonUI.CreateObjectTransformPanel(options)
  elseif id == "GRID_SNAP_CONTROL" then
    return RobloxCommonUI.CreateGridSnapControl(options)
  elseif id == "MATERIAL_PALETTE_PANEL" then
    return RobloxCommonUI.CreateMaterialPalettePanel(options)
  elseif id == "BLUEPRINT_PANEL" then
    return RobloxCommonUI.CreateBlueprintPanel(options)
  elseif id == "UNDO_REDO_BAR" then
    return RobloxCommonUI.CreateUndoRedoBar(options)
  elseif id == "OWNERSHIP_PERMISSION_PANEL" then
    return RobloxCommonUI.CreateOwnershipPermissionPanel(options)
  elseif id == "REPAIR_BUILDING_PANEL" then
    return RobloxCommonUI.CreateRepairBuildingPanel(options)
  elseif id == "DEMOLISH_PREVIEW_PANEL" then
    return RobloxCommonUI.CreateDemolishPreviewPanel(options)
  elseif id == "UPKEEP_DECAY_PANEL" then
    return RobloxCommonUI.CreateUpkeepDecayPanel(options)
  elseif id == "BED_RESPAWN_PANEL" then
    return RobloxCommonUI.CreateBedRespawnPanel(options)
  elseif id == "ROOM_SCORE_PANEL" then
    return RobloxCommonUI.CreateRoomScorePanel(options)
  elseif id == "FURNITURE_CATALOG" then
    return RobloxCommonUI.CreateFurnitureCatalog(options)
  elseif id == "SETTLEMENT_OVERVIEW" then
    return RobloxCommonUI.CreateSettlementOverview(options)
  elseif id == "FARM_PLOT_PANEL" then
    return RobloxCommonUI.CreateFarmPlotPanel(options)
  elseif id == "ANIMAL_HOUSING_PANEL" then
    return RobloxCommonUI.CreateAnimalHousingPanel(options)
  elseif id == "PROCESSING_MACHINE_PANEL" then
    return RobloxCommonUI.CreateProcessingMachinePanel(options)
  elseif id == "AI_COMPANION_STATUS_CARD" then
    return RobloxCommonUI.CreateAiCompanionStatusCard(options)
  elseif id == "COMPANION_COMMAND_WHEEL" then
    return RobloxCommonUI.CreateCompanionCommandWheel(options)
  elseif id == "COMPANION_ORDER_QUEUE" then
    return RobloxCommonUI.CreateCompanionOrderQueue(options)
  elseif id == "COMPANION_ROLE_PANEL" then
    return RobloxCommonUI.CreateCompanionRolePanel(options)
  elseif id == "COMPANION_FORMATION_PANEL" then
    return RobloxCommonUI.CreateCompanionFormationPanel(options)
  elseif id == "COMPANION_COMBAT_STANCE_PANEL" then
    return RobloxCommonUI.CreateCompanionCombatStancePanel(options)
  elseif id == "COMPANION_TARGET_PING_CARD" then
    return RobloxCommonUI.CreateCompanionTargetPingCard(options)
  elseif id == "COMPANION_HELP_REQUEST" then
    return RobloxCommonUI.CreateCompanionHelpRequest(options)
  elseif id == "COMPANION_REVIVE_RESCUE_PANEL" then
    return RobloxCommonUI.CreateCompanionReviveRescuePanel(options)
  elseif id == "COMPANION_INVENTORY_HANDOFF" then
    return RobloxCommonUI.CreateCompanionInventoryHandoff(options)
  elseif id == "COMPANION_GIFT_PANEL" then
    return RobloxCommonUI.CreateCompanionGiftPanel(options)
  elseif id == "COMPANION_RELATIONSHIP_DETAIL" then
    return RobloxCommonUI.CreateCompanionRelationshipDetail(options)
  elseif id == "NPC_MEMORY_SUMMARY" then
    return RobloxCommonUI.CreateNpcMemorySummary(options)
  elseif id == "NPC_TOPIC_BROWSER" then
    return RobloxCommonUI.CreateNpcTopicBrowser(options)
  elseif id == "NPC_CONTEXT_REACTION" then
    return RobloxCommonUI.CreateNpcContextReaction(options)
  elseif id == "NPC_SCHEDULE_AVAILABILITY" then
    return RobloxCommonUI.CreateNpcScheduleAvailability(options)
  elseif id == "NPC_SERVICE_MENU" then
    return RobloxCommonUI.CreateNpcServiceMenu(options)
  elseif id == "NPC_QUEST_HANDOFF" then
    return RobloxCommonUI.CreateNpcQuestHandoff(options)
  elseif id == "NPC_RECRUIT_DISMISS_PANEL" then
    return RobloxCommonUI.CreateNpcRecruitDismissPanel(options)
  elseif id == "NPC_RUMOR_KNOWLEDGE_PANEL" then
    return RobloxCommonUI.CreateNpcRumorKnowledgePanel(options)
  elseif id == "NPC_CAMP_ACTIVITY_PANEL" then
    return RobloxCommonUI.CreateNpcCampActivityPanel(options)
  elseif id == "PARTY_TACTICS_PANEL" then
    return RobloxCommonUI.CreatePartyTacticsPanel(options)
  elseif id == "COMPANION_EQUIPMENT_SUMMARY" then
    return RobloxCommonUI.CreateCompanionEquipmentSummary(options)
  elseif id == "AI_COMPANION_AUTONOMY_PANEL" then
    return RobloxCommonUI.CreateAiCompanionAutonomyPanel(options)
  elseif id == "MOUNT_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateMountInteractionPrompt(options)
  elseif id == "MOUNT_STATUS_HUD" then
    return RobloxCommonUI.CreateMountStatusHud(options)
  elseif id == "MOUNT_STAMINA_METER" then
    return RobloxCommonUI.CreateMountStaminaMeter(options)
  elseif id == "RIDE_SEAT_SELECTOR" then
    return RobloxCommonUI.CreateRideSeatSelector(options)
  elseif id == "PASSENGER_LIST" then
    return RobloxCommonUI.CreatePassengerList(options)
  elseif id == "BOARDING_PROGRESS" then
    return RobloxCommonUI.CreateBoardingProgress(options)
  elseif id == "DISEMBARK_PROMPT" then
    return RobloxCommonUI.CreateDisembarkPrompt(options)
  elseif id == "SEAT_SWITCH_PANEL" then
    return RobloxCommonUI.CreateSeatSwitchPanel(options)
  elseif id == "MOUNT_COMMAND_WHEEL" then
    return RobloxCommonUI.CreateMountCommandWheel(options)
  elseif id == "MOUNT_INVENTORY_PANEL" then
    return RobloxCommonUI.CreateMountInventoryPanel(options)
  elseif id == "MOUNT_EQUIPMENT_PANEL" then
    return RobloxCommonUI.CreateMountEquipmentPanel(options)
  elseif id == "VEHICLE_DAMAGE_STATUS" then
    return RobloxCommonUI.CreateVehicleDamageStatus(options)
  elseif id == "FUEL_ENERGY_METER" then
    return RobloxCommonUI.CreateFuelEnergyMeter(options)
  elseif id == "CARGO_PANEL" then
    return RobloxCommonUI.CreateCargoPanel(options)
  elseif id == "TRAVEL_ROUTE_PANEL" then
    return RobloxCommonUI.CreateTravelRoutePanel(options)
  elseif id == "DESTINATION_CARD" then
    return RobloxCommonUI.CreateDestinationCard(options)
  elseif id == "TRAVEL_PROGRESS_HUD" then
    return RobloxCommonUI.CreateTravelProgressHud(options)
  elseif id == "MOUNT_RECALL_PANEL" then
    return RobloxCommonUI.CreateMountRecallPanel(options)
  elseif id == "MOUNT_WHISTLE_STATE" then
    return RobloxCommonUI.CreateMountWhistleState(options)
  elseif id == "TERRAIN_ACCESS_WARNING" then
    return RobloxCommonUI.CreateTerrainAccessWarning(options)
  elseif id == "VEHICLE_CONTROL_HINTS" then
    return RobloxCommonUI.CreateVehicleControlHints(options)
  elseif id == "MOUNT_SPEED_STATE" then
    return RobloxCommonUI.CreateMountSpeedState(options)
  elseif id == "PARRY_TIMING_INDICATOR" then
    return RobloxCommonUI.CreateParryTimingIndicator(options)
  elseif id == "GUARD_METER" then
    return RobloxCommonUI.CreateGuardMeter(options)
  elseif id == "GUARD_BREAK_WARNING" then
    return RobloxCommonUI.CreateGuardBreakWarning(options)
  elseif id == "COUNTER_READY_INDICATOR" then
    return RobloxCommonUI.CreateCounterReadyIndicator(options)
  elseif id == "ATTACK_TELEGRAPH_INDICATOR" then
    return RobloxCommonUI.CreateAttackTelegraphIndicator(options)
  elseif id == "WORLD_PROP_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateWorldPropInteractionPrompt(options)
  elseif id == "WORLD_PROP_ACTION_WHEEL" then
    return RobloxCommonUI.CreateWorldPropActionWheel(options)
  elseif id == "INTERACTION_PROGRESS" then
    return RobloxCommonUI.CreateInteractionProgress(options)
  elseif id == "INTERACTION_STATE_CARD" then
    return RobloxCommonUI.CreateInteractionStateCard(options)
  elseif id == "SEAT_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateSeatInteractionPrompt(options)
  elseif id == "BED_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateBedInteractionPrompt(options)
  elseif id == "HARVEST_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateHarvestInteractionPrompt(options)
  elseif id == "CONTAINER_INTERACTION_PROMPT" then
    return RobloxCommonUI.CreateContainerInteractionPrompt(options)
  elseif id == "LIGHT_CONTROL_PROMPT" then
    return RobloxCommonUI.CreateLightControlPrompt(options)
  elseif id == "READ_INSPECT_PANEL" then
    return RobloxCommonUI.CreateReadInspectPanel(options)
  elseif id == "INVENTORY_SMART_SORT_PREVIEW" then
    return RobloxCommonUI.CreateInventorySmartSortPreview(options)
  elseif id == "INVENTORY_CAPACITY_FORECAST" then
    return RobloxCommonUI.CreateInventoryCapacityForecast(options)
  elseif id == "INVENTORY_OVERWEIGHT_RESOLUTION" then
    return RobloxCommonUI.CreateInventoryOverweightResolution(options)
  elseif id == "EQUIP_CONFLICT_PREVIEW" then
    return RobloxCommonUI.CreateEquipConflictPreview(options)
  elseif id == "LOOT_FILTER_PRESET" then
    return RobloxCommonUI.CreateLootFilterPreset(options)
  elseif id == "STASH_TRANSFER_QUEUE" then
    return RobloxCommonUI.CreateStashTransferQueue(options)
  elseif id == "MENU_SYSTEM_SWITCHER_DRAWER" then
    return RobloxCommonUI.CreateMenuSystemSwitcherDrawer(options)
  elseif id == "NAVIGATION_BREADCRUMB_BACKSTACK" then
    return RobloxCommonUI.CreateNavigationBreadcrumbBackstack(options)
  elseif id == "MENU_LAST_LOCATION_RESUME" then
    return RobloxCommonUI.CreateMenuLastLocationResume(options)
  elseif id == "MENU_CONTEXT_QUICK_ACTION_SHEET" then
    return RobloxCommonUI.CreateMenuContextQuickActionSheet(options)
  elseif id == "ONE_HAND_BOTTOM_NAV" then
    return RobloxCommonUI.CreateOneHandBottomNav(options)
  elseif id == "SET_PROGRESS_TRACKER" then
    return RobloxCommonUI.CreateSetProgressTracker(options)
  elseif id == "SOCKET_ROUTE_PREVIEW" then
    return RobloxCommonUI.CreateSocketRoutePreview(options)
  elseif id == "DURABILITY_WEAR_PREVIEW" then
    return RobloxCommonUI.CreateDurabilityWearPreview(options)
  elseif id == "CRAFT_QUEUE_OVERVIEW" then
    return RobloxCommonUI.CreateCraftQueueOverview(options)
  elseif id == "RECIPE_PREREQUISITE_CHAIN" then
    return RobloxCommonUI.CreateRecipePrerequisiteChain(options)
  elseif id == "MATERIAL_SHORTAGE_ROUTE" then
    return RobloxCommonUI.CreateMaterialShortageRoute(options)
  elseif id == "SHOP_PRICE_DELTA_COMPARE" then
    return RobloxCommonUI.CreateShopPriceDeltaCompare(options)
  elseif id == "VENDOR_STOCK_STATE" then
    return RobloxCommonUI.CreateVendorStockState(options)
  elseif id == "QUEST_DEPENDENCY_CHAIN" then
    return RobloxCommonUI.CreateQuestDependencyChain(options)
  elseif id == "LORE_RELATION_GRAPH" then
    return RobloxCommonUI.CreateLoreRelationGraph(options)
  elseif id == "NPC_RELATIONSHIP_TIMELINE" then
    return RobloxCommonUI.CreateNpcRelationshipTimeline(options)
  elseif id == "PARTY_ROLE_OVERVIEW" then
    return RobloxCommonUI.CreatePartyRoleOverview(options)
  elseif id == "ROUTE_RISK_PREVIEW" then
    return RobloxCommonUI.CreateRouteRiskPreview(options)
  elseif id == "THREAT_EDGE_INDICATOR" then
    return RobloxCommonUI.CreateThreatEdgeIndicator(options)
  elseif id == "BOSS_PHASE_STRIP" then
    return RobloxCommonUI.CreateBossPhaseStrip(options)
  elseif id == "WAVE_FORECAST_RIBBON" then
    return RobloxCommonUI.CreateWaveForecastRibbon(options)
  elseif id == "STATUS_EFFECT_TIMELINE" then
    return RobloxCommonUI.CreateStatusEffectTimeline(options)
  elseif id == "HOUSING_STRUCTURAL_SUPPORT_OVERLAY" then
    return RobloxCommonUI.CreateHousingStructuralSupportOverlay(options)
  elseif id == "HOUSING_ROOM_FUNCTION_HEATMAP" then
    return RobloxCommonUI.CreateHousingRoomFunctionHeatmap(options)
  elseif id == "CROP_GROWTH_TIMELINE" then
    return RobloxCommonUI.CreateCropGrowthTimeline(options)
  elseif id == "ACCESSIBILITY_REDUCED_FLASH_MODE" then
    return RobloxCommonUI.CreateAccessibilityReducedFlashMode(options)
  elseif id == "ACCESSIBILITY_COLOR_BLIND_SHAPE_BACKUP" then
    return RobloxCommonUI.CreateAccessibilityColorBlindShapeBackup(options)
  elseif id == "LOADING_RETRY_WITH_CAUSE" then
    return RobloxCommonUI.CreateLoadingRetryWithCause(options)
  elseif id == "FAILURE_RECOVERY_CHECKPOINT" then
    return RobloxCommonUI.CreateFailureRecoveryCheckpoint(options)
  end
  error("UNKNOWN_COMMON_UI_ATOM: " .. tostring(atomId))
end

function RobloxCommonUI.Audit()
  return table.freeze({
    version = 10,
    packId = "roblox-common-ui-v1",
    atoms = table.freeze({
      "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH", "INVENTORY_SLOT",
      "TOOLTIP", "MODAL", "TAB_BUTTON", "QUEST_CARD",
      "CURRENCY_CHIP", "BAR_PROGRESS", "MOBILE_ACTION_BUTTON", "ICON_BUTTON",
      "DIALOGUE_ASSISTANT_BUTTON", "DIALOGUE_PANEL", "DIALOGUE_CHOICE", "DIALOGUE_INPUT",
      "TYPING_INDICATOR", "DIALOGUE_HISTORY", "NPC_INTERACTION_PROMPT", "NPC_INTERACTION_MENU",
      "NPC_RELATIONSHIP_CARD", "INVENTORY_GRID", "EQUIPMENT_SLOT", "CHARACTER_SHEET",
      "MINIMAP", "QUEST_TRACKER", "PARTY_MEMBER_CARD", "CRAFTING_RECIPE_CARD",
      "SHOP_ITEM_CARD", "NOTIFICATION_TOAST", "STATUS_EFFECT_CHIP", "HOTBAR",
      "MAIN_MENU", "TOP_BAR", "SIDE_NAVIGATION", "PAUSE_MENU",
      "SETTINGS_PANEL", "SEARCH_FIELD", "FILTER_BAR", "SORT_CONTROL",
      "INVENTORY_FULL_SCREEN", "EQUIPMENT_FULL_SCREEN", "CHARACTER_DETAIL_SCREEN", "MAP_FULL_SCREEN",
      "QUEST_LOG", "CRAFTING_FULL_SCREEN", "SHOP_FULL_SCREEN", "CONFIRM_DIALOG",
      "POPUP_PANEL", "LOADING_STATE", "EMPTY_STATE", "FAILURE_STATE",
      "LOCKED_STATE", "INPUT_HINT",
      "ITEM_DETAIL_PANEL", "ITEM_COMPARE_PANEL", "ITEM_CONTEXT_MENU", "STACK_SPLIT_DIALOG",
      "MULTI_SELECT_BAR", "ITEM_STATE_BADGES", "INVENTORY_CONTAINER_PANEL", "INVENTORY_WEIGHT_METER",
      "INVENTORY_CAPACITY_METER", "STASH_SCREEN", "LOOT_WINDOW", "LOOT_FEED",
      "QUICK_SLOT_BAR", "RADIAL_MENU", "LOADOUT_PRESET_PANEL", "EQUIPMENT_COMPARE_PANEL",
      "SET_BONUS_PANEL", "SOCKET_ENCHANT_PANEL", "UPGRADE_PANEL", "REPAIR_PANEL",
      "DISMANTLE_PANEL", "CRAFTING_TREE", "RECIPE_DETAIL_PANEL", "MATERIAL_TRACKER",
      "BUY_SELL_PANEL", "BUYBACK_PANEL", "CODEX_SCREEN", "COLLECTION_PROGRESS",
      "RECENT_ITEMS_PANEL", "ITEM_SOURCE_USAGE_PANEL",
      "BUILD_CATALOG_PANEL", "BUILD_PIECE_CARD", "PLACEMENT_GHOST_STATE", "SNAP_INDICATOR",
      "STABILITY_METER", "BUILD_TIER_BADGE", "PLACEMENT_VALIDITY_BANNER", "BUILD_ACTION_BAR",
      "OBJECT_TRANSFORM_PANEL", "GRID_SNAP_CONTROL", "MATERIAL_PALETTE_PANEL", "BLUEPRINT_PANEL",
      "UNDO_REDO_BAR", "OWNERSHIP_PERMISSION_PANEL", "REPAIR_BUILDING_PANEL", "DEMOLISH_PREVIEW_PANEL",
      "UPKEEP_DECAY_PANEL", "BED_RESPAWN_PANEL", "ROOM_SCORE_PANEL", "FURNITURE_CATALOG",
      "SETTLEMENT_OVERVIEW", "FARM_PLOT_PANEL", "ANIMAL_HOUSING_PANEL", "PROCESSING_MACHINE_PANEL",
      "AI_COMPANION_STATUS_CARD", "COMPANION_COMMAND_WHEEL", "COMPANION_ORDER_QUEUE", "COMPANION_ROLE_PANEL",
      "COMPANION_FORMATION_PANEL", "COMPANION_COMBAT_STANCE_PANEL", "COMPANION_TARGET_PING_CARD", "COMPANION_HELP_REQUEST",
      "COMPANION_REVIVE_RESCUE_PANEL", "COMPANION_INVENTORY_HANDOFF", "COMPANION_GIFT_PANEL", "COMPANION_RELATIONSHIP_DETAIL",
      "NPC_MEMORY_SUMMARY", "NPC_TOPIC_BROWSER", "NPC_CONTEXT_REACTION", "NPC_SCHEDULE_AVAILABILITY",
      "NPC_SERVICE_MENU", "NPC_QUEST_HANDOFF", "NPC_RECRUIT_DISMISS_PANEL", "NPC_RUMOR_KNOWLEDGE_PANEL",
      "NPC_CAMP_ACTIVITY_PANEL", "PARTY_TACTICS_PANEL", "COMPANION_EQUIPMENT_SUMMARY", "AI_COMPANION_AUTONOMY_PANEL",
      "MOUNT_INTERACTION_PROMPT", "MOUNT_STATUS_HUD", "MOUNT_STAMINA_METER", "RIDE_SEAT_SELECTOR",
      "PASSENGER_LIST", "BOARDING_PROGRESS", "DISEMBARK_PROMPT", "SEAT_SWITCH_PANEL",
      "MOUNT_COMMAND_WHEEL", "MOUNT_INVENTORY_PANEL", "MOUNT_EQUIPMENT_PANEL", "VEHICLE_DAMAGE_STATUS",
      "FUEL_ENERGY_METER", "CARGO_PANEL", "TRAVEL_ROUTE_PANEL", "DESTINATION_CARD",
      "TRAVEL_PROGRESS_HUD", "MOUNT_RECALL_PANEL", "MOUNT_WHISTLE_STATE", "TERRAIN_ACCESS_WARNING",
      "VEHICLE_CONTROL_HINTS", "MOUNT_SPEED_STATE",
      "PARRY_TIMING_INDICATOR", "GUARD_METER", "GUARD_BREAK_WARNING", "COUNTER_READY_INDICATOR", "ATTACK_TELEGRAPH_INDICATOR",
      "WORLD_PROP_INTERACTION_PROMPT", "WORLD_PROP_ACTION_WHEEL", "INTERACTION_PROGRESS", "INTERACTION_STATE_CARD",
      "SEAT_INTERACTION_PROMPT", "BED_INTERACTION_PROMPT", "HARVEST_INTERACTION_PROMPT", "CONTAINER_INTERACTION_PROMPT",
      "LIGHT_CONTROL_PROMPT", "READ_INSPECT_PANEL",
      "INVENTORY_SMART_SORT_PREVIEW", "INVENTORY_CAPACITY_FORECAST", "INVENTORY_OVERWEIGHT_RESOLUTION", "EQUIP_CONFLICT_PREVIEW", "LOOT_FILTER_PRESET",
      "STASH_TRANSFER_QUEUE", "MENU_SYSTEM_SWITCHER_DRAWER", "NAVIGATION_BREADCRUMB_BACKSTACK", "MENU_LAST_LOCATION_RESUME", "MENU_CONTEXT_QUICK_ACTION_SHEET",
      "ONE_HAND_BOTTOM_NAV", "SET_PROGRESS_TRACKER", "SOCKET_ROUTE_PREVIEW", "DURABILITY_WEAR_PREVIEW", "CRAFT_QUEUE_OVERVIEW",
      "RECIPE_PREREQUISITE_CHAIN", "MATERIAL_SHORTAGE_ROUTE", "SHOP_PRICE_DELTA_COMPARE", "VENDOR_STOCK_STATE", "QUEST_DEPENDENCY_CHAIN",
      "LORE_RELATION_GRAPH", "NPC_RELATIONSHIP_TIMELINE", "PARTY_ROLE_OVERVIEW", "ROUTE_RISK_PREVIEW", "THREAT_EDGE_INDICATOR",
      "BOSS_PHASE_STRIP", "WAVE_FORECAST_RIBBON", "STATUS_EFFECT_TIMELINE", "HOUSING_STRUCTURAL_SUPPORT_OVERLAY", "HOUSING_ROOM_FUNCTION_HEATMAP",
      "CROP_GROWTH_TIMELINE", "ACCESSIBILITY_REDUCED_FLASH_MODE", "ACCESSIBILITY_COLOR_BLIND_SHAPE_BACKUP", "LOADING_RETRY_WITH_CAUSE", "FAILURE_RECOVERY_CHECKPOINT"
    }),
    atomCount = 204,
    fullScreenSurfaceCount = 17,
    deepSystemComponentCount = 150,
    subsystemDepthExpansionCount = 35,
    parryPresentationComponentCount = 5,
    worldInteractionComponentCount = 10,
    housingSandboxComponentCount = 24,
    aiNpcInteractionComponentCount = 24,
    mountTravelComponentCount = 22,
    stateSurfaceCount = 4,
    companyCommonBase = true,
    themeAdaptationRequiredPerGame = true,
    gameplayAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    touchMinimumHeight = DEFAULT_THEME.TouchHeight,
    inputModes = table.freeze({"TOUCH","KEYBOARD_MOUSE","GAMEPAD"}),
    transitionPrinciples = table.freeze({"SIMPLE_FADE","FOCUS_PRESERVE","DEPTH_AWARE","BACK_STACK_SAFE"}),
  })
end

return table.freeze(RobloxCommonUI)
