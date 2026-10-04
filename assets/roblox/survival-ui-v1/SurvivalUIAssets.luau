-- 파일명: assets/roblox/survival-ui-v1/SurvivalUIAssets.luau
-- 역할: survival Roblox용 공용 UI 비주얼 자산 3종
-- 원칙: 표시만 소유하며 체력/보상/입력 권한/세이브/네트워크 권한은 게임 코드가 소유한다.

local SurvivalUIAssets = {}

local TOKENS = table.freeze({
  Panel = Color3.fromRGB(27, 36, 31),
  PanelRaised = Color3.fromRGB(38, 49, 42),
  PanelInset = Color3.fromRGB(18, 24, 21),
  Border = Color3.fromRGB(94, 121, 99),
  BorderBright = Color3.fromRGB(139, 164, 133),
  Text = Color3.fromRGB(236, 242, 229),
  MutedText = Color3.fromRGB(168, 181, 165),
  Primary = Color3.fromRGB(83, 139, 75),
  PrimaryTop = Color3.fromRGB(112, 166, 96),
  PrimaryBottom = Color3.fromRGB(60, 106, 58),
  Danger = Color3.fromRGB(198, 70, 62),
  HealthGood = Color3.fromRGB(91, 181, 91),
  HealthWarn = Color3.fromRGB(220, 159, 54),
  HealthCritical = Color3.fromRGB(210, 76, 69),
  HealthTrack = Color3.fromRGB(58, 67, 58),
  Shadow = Color3.fromRGB(8, 12, 10),
  Corner = 14,
  TouchHeight = 48,
})

local function tag(instance, atomId)
  instance:SetAttribute("StudioAssetId", atomId)
  instance:SetAttribute("StudioAssetPack", "roblox-survival-ui-v1")
  instance:SetAttribute("StudioAssetFamily", "UI")
  instance:SetAttribute("ProductionVerified", false)
  instance:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
  instance:SetAttribute("GameplayAuthority", false)
end

local function corner(parent, radius)
  local ui = Instance.new("UICorner")
  ui.CornerRadius = UDim.new(0, radius or TOKENS.Corner)
  ui.Parent = parent
  return ui
end

local function stroke(parent, color, thickness, transparency)
  local ui = Instance.new("UIStroke")
  ui.Color = color or TOKENS.Border
  ui.Thickness = thickness or 1
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
  local c = Instance.new("UISizeConstraint")
  c.MinSize = Vector2.new(minX or 0, minY or 0)
  c.Parent = parent
  return c
end

function SurvivalUIAssets.CreatePanel(options)
  options = options or {}
  local frame = Instance.new("Frame")
  frame.Name = options.name or "SurvivalPanel"
  frame.Size = options.size or UDim2.fromOffset(320, 180)
  frame.BackgroundColor3 = TOKENS.Panel
  frame.BorderSizePixel = 0
  frame.ClipsDescendants = options.clipsDescendants == true
  tag(frame, "FRAME_PANEL")

  corner(frame, tonumber(options.cornerRadius) or TOKENS.Corner)
  stroke(frame, TOKENS.Border, 1.5, 0.08)
  gradient(frame, TOKENS.PanelRaised, TOKENS.Panel, 90)

  local shadow = Instance.new("Frame")
  shadow.Name = "DepthShadow"
  shadow.AnchorPoint = Vector2.new(0.5, 0.5)
  shadow.Position = UDim2.new(0.5, 0, 0.5, 5)
  shadow.Size = UDim2.new(1, 4, 1, 4)
  shadow.BackgroundColor3 = TOKENS.Shadow
  shadow.BackgroundTransparency = 0.46
  shadow.BorderSizePixel = 0
  shadow.ZIndex = math.max(0, frame.ZIndex - 1)
  shadow.Parent = frame
  corner(shadow, (tonumber(options.cornerRadius) or TOKENS.Corner) + 2)

  local inner = Instance.new("Frame")
  inner.Name = "InnerSurface"
  inner.Position = UDim2.fromOffset(7, 7)
  inner.Size = UDim2.new(1, -14, 1, -14)
  inner.BackgroundColor3 = TOKENS.PanelInset
  inner.BackgroundTransparency = 0.54
  inner.BorderSizePixel = 0
  inner.ZIndex = frame.ZIndex + 1
  inner.Parent = frame
  corner(inner, math.max(6, (tonumber(options.cornerRadius) or TOKENS.Corner) - 4))
  stroke(inner, TOKENS.BorderBright, 1, 0.72)

  frame:SetAttribute("PresentationRole", "SURVIVAL_READABLE_PANEL")
  frame:SetAttribute("TouchSafe", true)
  return frame, inner
end

function SurvivalUIAssets.CreatePrimaryButton(options)
  options = options or {}
  local button = Instance.new("TextButton")
  button.Name = options.name or "PrimaryAction"
  button.Size = options.size or UDim2.fromOffset(180, TOKENS.TouchHeight)
  button.BackgroundColor3 = TOKENS.Primary
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Text = tostring(options.text or "확인")
  button.TextColor3 = TOKENS.Text
  button.TextSize = tonumber(options.textSize) or 16
  button.TextWrapped = true
  button.Font = Enum.Font.GothamBold
  button.Selectable = true
  tag(button, "BUTTON_PRIMARY")

  corner(button, tonumber(options.cornerRadius) or 12)
  local outline = stroke(button, TOKENS.BorderBright, 1.4, 0.06)
  local fill = gradient(button, TOKENS.PrimaryTop, TOKENS.PrimaryBottom, 90)
  sizeConstraint(button, tonumber(options.minWidth) or 112, tonumber(options.minHeight) or TOKENS.TouchHeight)

  local sheen = Instance.new("Frame")
  sheen.Name = "TopSheen"
  sheen.Size = UDim2.new(1, -10, 0, 2)
  sheen.Position = UDim2.fromOffset(5, 5)
  sheen.BackgroundColor3 = Color3.fromRGB(204, 231, 192)
  sheen.BackgroundTransparency = 0.65
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
  button:SetAttribute("MinimumTouchHeight", TOKENS.TouchHeight)
  button:SetAttribute("OwnsGameplayAction", false)
  button:SetAttribute("OwnsRemoteAuthority", false)
  return button, fill
end

function SurvivalUIAssets.CreateHealthBar(options)
  options = options or {}

  local root = Instance.new("Frame")
  root.Name = options.name or "HealthBar"
  root.Size = options.size or UDim2.fromOffset(220, 26)
  root.BackgroundColor3 = TOKENS.HealthTrack
  root.BorderSizePixel = 0
  root.ClipsDescendants = true
  tag(root, "BAR_HEALTH")

  corner(root, tonumber(options.cornerRadius) or 9)
  stroke(root, TOKENS.Border, 1.2, 0.12)

  local fill = Instance.new("Frame")
  fill.Name = "Fill"
  fill.Size = UDim2.fromScale(1, 1)
  fill.BackgroundColor3 = TOKENS.HealthGood
  fill.BorderSizePixel = 0
  fill.Parent = root
  corner(fill, tonumber(options.cornerRadius) or 9)
  local fillGradient = gradient(fill, Color3.fromRGB(121, 211, 112), Color3.fromRGB(63, 145, 72), 90)

  local gloss = Instance.new("Frame")
  gloss.Name = "ReadabilityGloss"
  gloss.Size = UDim2.new(1, 0, 0.42, 0)
  gloss.BackgroundColor3 = Color3.new(1, 1, 1)
  gloss.BackgroundTransparency = 0.85
  gloss.BorderSizePixel = 0
  gloss.ZIndex = root.ZIndex + 2
  gloss.Parent = root
  corner(gloss, tonumber(options.cornerRadius) or 9)

  local label = Instance.new("TextLabel")
  label.Name = "Value"
  label.Size = UDim2.fromScale(1, 1)
  label.BackgroundTransparency = 1
  label.Text = tostring(options.text or "")
  label.TextColor3 = TOKENS.Text
  label.TextSize = tonumber(options.textSize) or 12
  label.Font = Enum.Font.GothamBold
  label.ZIndex = root.ZIndex + 3
  label.Parent = root

  root:SetAttribute("PresentationRole", "HEALTH_STATUS_READOUT")
  root:SetAttribute("OwnsHealthValue", false)
  root:SetAttribute("OwnsDamageAuthority", false)

  local controller = {}

  function controller.SetRatio(ratio, labelText)
    local value = math.clamp(tonumber(ratio) or 0, 0, 1)
    fill.Size = UDim2.fromScale(value, 1)

    local top
    local bottom
    if value <= 0.25 then
      fill.BackgroundColor3 = TOKENS.HealthCritical
      top = Color3.fromRGB(232, 100, 88)
      bottom = Color3.fromRGB(166, 50, 48)
    elseif value <= 0.55 then
      fill.BackgroundColor3 = TOKENS.HealthWarn
      top = Color3.fromRGB(238, 188, 75)
      bottom = Color3.fromRGB(184, 122, 36)
    else
      fill.BackgroundColor3 = TOKENS.HealthGood
      top = Color3.fromRGB(121, 211, 112)
      bottom = Color3.fromRGB(63, 145, 72)
    end

    fillGradient.Color = ColorSequence.new({
      ColorSequenceKeypoint.new(0, top),
      ColorSequenceKeypoint.new(1, bottom),
    })
    if labelText ~= nil then
      label.Text = tostring(labelText)
    end
    root:SetAttribute("DisplayedRatio", value)
  end

  controller.SetRatio(tonumber(options.ratio) or 1, options.text)
  return root, controller
end

function SurvivalUIAssets.Create(atomId, options)
  local id = string.upper(tostring(atomId or ""))
  if id == "FRAME_PANEL" then
    return SurvivalUIAssets.CreatePanel(options)
  elseif id == "BUTTON_PRIMARY" then
    return SurvivalUIAssets.CreatePrimaryButton(options)
  elseif id == "BAR_HEALTH" then
    return SurvivalUIAssets.CreateHealthBar(options)
  end
  error("UNKNOWN_SURVIVAL_UI_ATOM: " .. tostring(atomId))
end

function SurvivalUIAssets.Audit()
  return table.freeze({
    version = 1,
    packId = "roblox-survival-ui-v1",
    atoms = table.freeze({"FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH"}),
    atomCount = 3,
    gameplayAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    touchMinimumHeight = TOKENS.TouchHeight,
  })
end

return table.freeze(SurvivalUIAssets)
