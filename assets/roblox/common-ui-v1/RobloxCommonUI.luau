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
  end
  error("UNKNOWN_COMMON_UI_ATOM: " .. tostring(atomId))
end

function RobloxCommonUI.Audit()
  return table.freeze({
    version = 2,
    packId = "roblox-common-ui-v1",
    atoms = table.freeze({
      "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH",
      "INVENTORY_SLOT", "TOOLTIP", "MODAL", "TAB_BUTTON",
      "QUEST_CARD", "CURRENCY_CHIP", "BAR_PROGRESS", "MOBILE_ACTION_BUTTON"
    }),
    atomCount = 11,
    companyCommonBase = true,
    themeAdaptationRequiredPerGame = true,
    gameplayAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    touchMinimumHeight = DEFAULT_THEME.TouchHeight,
  })
end

return table.freeze(RobloxCommonUI)
