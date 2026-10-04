-- 파일명: assets/roblox/common-ui-v1/RobloxCommonIcons.luau
-- 역할: 외부 이미지 ID 없이 공용 UI에서 재사용하는 Roblox 벡터형 아이콘 12종
-- 원칙: 순수 표시 자산이다. 입력, 퀘스트, 재화, 인벤토리, 네트워크 권한을 소유하지 않는다.

local RobloxCommonIcons = {}

local ICONS = table.freeze({
  "CHAT", "AI_SPARK", "INVENTORY", "CHARACTER", "EQUIPMENT", "MINIMAP",
  "QUEST", "PARTY", "CRAFT", "SHOP", "NOTIFICATION", "SETTINGS",
})

local function corner(parent, scale)
  local ui = Instance.new("UICorner")
  ui.CornerRadius = UDim.new(scale or 0.5, 0)
  ui.Parent = parent
  return ui
end

local function tag(root, iconId)
  root:SetAttribute("StudioAssetId", "ICON_" .. iconId)
  root:SetAttribute("StudioAssetPack", "roblox-common-ui-v1")
  root:SetAttribute("StudioAssetFamily", "UI")
  root:SetAttribute("PresentationRole", "COMMON_VECTOR_ICON")
  root:SetAttribute("CompanyCommonBase", true)
  root:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  root:SetAttribute("GameplayAuthority", false)
  root:SetAttribute("ProductionVerified", false)
  root:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
end

local function shape(parent, name, x, y, w, h, color, radius, rotation)
  local frame = Instance.new("Frame")
  frame.Name = name
  frame.AnchorPoint = Vector2.new(0.5, 0.5)
  frame.Position = UDim2.fromScale(x, y)
  frame.Size = UDim2.fromScale(w, h)
  frame.BackgroundColor3 = color
  frame.BorderSizePixel = 0
  frame.Rotation = rotation or 0
  frame.Parent = parent
  if radius and radius > 0 then corner(frame, radius) end
  return frame
end

local function line(parent, name, x, y, length, thickness, color, rotation)
  return shape(parent, name, x, y, length, thickness, color, 0.5, rotation or 0)
end

local function rootFor(iconId, options)
  options = options or {}
  local root = Instance.new("Frame")
  root.Name = options.name or ("Icon_" .. iconId)
  root.Size = options.size or UDim2.fromOffset(32, 32)
  root.BackgroundTransparency = 1
  root.BorderSizePixel = 0
  tag(root, iconId)
  return root, options.color or Color3.fromRGB(240, 243, 247), options.accentColor or Color3.fromRGB(108, 174, 225)
end

local function drawChat(root, color, accent)
  shape(root, "Bubble", 0.48, 0.44, 0.72, 0.52, color, 0.24)
  shape(root, "BubbleInset", 0.48, 0.44, 0.60, 0.38, root.BackgroundColor3, 0.22)
  shape(root, "Tail", 0.29, 0.72, 0.18, 0.16, color, 0.12, 45)
  for i = 1, 3 do shape(root, "Dot"..i, 0.32 + (i-1)*0.16, 0.44, 0.07, 0.07, accent, 0.5) end
end

local function drawSpark(root, color, accent)
  line(root, "Vertical", 0.5, 0.5, 0.72, 0.09, accent, 90)
  line(root, "Horizontal", 0.5, 0.5, 0.72, 0.09, accent, 0)
  line(root, "SlashA", 0.5, 0.5, 0.50, 0.07, color, 45)
  line(root, "SlashB", 0.5, 0.5, 0.50, 0.07, color, -45)
  shape(root, "Core", 0.5, 0.5, 0.16, 0.16, accent, 0.5)
end

local function drawInventory(root, color, accent)
  shape(root, "Bag", 0.5, 0.58, 0.68, 0.58, color, 0.16)
  shape(root, "BagInset", 0.5, 0.58, 0.54, 0.44, root.BackgroundColor3, 0.14)
  line(root, "HandleL", 0.40, 0.28, 0.25, 0.07, accent, 78)
  line(root, "HandleR", 0.60, 0.28, 0.25, 0.07, accent, 102)
  line(root, "HandleTop", 0.5, 0.20, 0.23, 0.07, accent, 0)
end

local function drawCharacter(root, color, accent)
  shape(root, "Head", 0.5, 0.30, 0.28, 0.28, accent, 0.5)
  shape(root, "Torso", 0.5, 0.66, 0.62, 0.42, color, 0.24)
  shape(root, "ChestInset", 0.5, 0.66, 0.46, 0.28, root.BackgroundColor3, 0.20)
end

local function drawEquipment(root, color, accent)
  line(root, "Blade", 0.48, 0.46, 0.68, 0.10, color, -45)
  shape(root, "Tip", 0.72, 0.22, 0.13, 0.13, color, 0.1, -45)
  line(root, "Guard", 0.35, 0.59, 0.34, 0.09, accent, 45)
  line(root, "Grip", 0.24, 0.74, 0.28, 0.12, accent, -45)
end

local function drawMinimap(root, color, accent)
  shape(root, "Map", 0.5, 0.5, 0.78, 0.78, color, 0.18)
  shape(root, "MapInset", 0.5, 0.5, 0.62, 0.62, root.BackgroundColor3, 0.16)
  line(root, "RouteA", 0.42, 0.56, 0.38, 0.06, accent, -20)
  line(root, "RouteB", 0.59, 0.43, 0.34, 0.06, accent, 55)
  shape(root, "Player", 0.41, 0.59, 0.12, 0.12, accent, 0.5)
  shape(root, "Objective", 0.67, 0.29, 0.10, 0.10, color, 0.15, 45)
end

local function drawQuest(root, color, accent)
  shape(root, "Page", 0.50, 0.52, 0.64, 0.76, color, 0.10)
  shape(root, "PageInset", 0.50, 0.52, 0.50, 0.62, root.BackgroundColor3, 0.08)
  line(root, "Line1", 0.50, 0.42, 0.34, 0.05, accent, 0)
  line(root, "Line2", 0.46, 0.54, 0.28, 0.05, accent, 0)
  line(root, "TickA", 0.42, 0.68, 0.18, 0.06, accent, 45)
  line(root, "TickB", 0.54, 0.64, 0.30, 0.06, accent, -45)
end

local function drawParty(root, color, accent)
  shape(root, "Head1", 0.36, 0.34, 0.22, 0.22, accent, 0.5)
  shape(root, "Head2", 0.64, 0.34, 0.22, 0.22, accent, 0.5)
  shape(root, "Body1", 0.34, 0.67, 0.38, 0.34, color, 0.3)
  shape(root, "Body2", 0.66, 0.67, 0.38, 0.34, color, 0.3)
end

local function drawCraft(root, color, accent)
  line(root, "Handle", 0.44, 0.57, 0.62, 0.11, color, -45)
  shape(root, "HammerHead", 0.64, 0.30, 0.42, 0.18, accent, 0.12, -45)
  shape(root, "GripEnd", 0.25, 0.77, 0.16, 0.16, accent, 0.3, -45)
end

local function drawShop(root, color, accent)
  shape(root, "Store", 0.50, 0.60, 0.72, 0.50, color, 0.10)
  shape(root, "Door", 0.50, 0.68, 0.22, 0.34, root.BackgroundColor3, 0.08)
  line(root, "Awning", 0.50, 0.30, 0.76, 0.14, accent, 0)
  for i = 1, 4 do
    shape(root, "Stripe"..i, 0.23 + (i-1)*0.18, 0.30, 0.09, 0.14, i%2==0 and color or accent, 0.08)
  end
end

local function drawNotification(root, color, accent)
  shape(root, "Bell", 0.50, 0.48, 0.52, 0.56, color, 0.45)
  shape(root, "BellCut", 0.50, 0.64, 0.64, 0.24, root.BackgroundColor3, 0.50)
  line(root, "Rim", 0.50, 0.68, 0.62, 0.08, accent, 0)
  shape(root, "Clapper", 0.50, 0.79, 0.12, 0.12, accent, 0.5)
end

local function drawSettings(root, color, accent)
  shape(root, "Core", 0.50, 0.50, 0.30, 0.30, root.BackgroundColor3, 0.5)
  for i = 0, 7 do
    line(root, "Tooth"..i, 0.50, 0.50, 0.72, 0.10, i%2==0 and color or accent, i*45)
  end
  shape(root, "Center", 0.50, 0.50, 0.18, 0.18, accent, 0.5)
end

local DRAW = {
  CHAT = drawChat,
  AI_SPARK = drawSpark,
  INVENTORY = drawInventory,
  CHARACTER = drawCharacter,
  EQUIPMENT = drawEquipment,
  MINIMAP = drawMinimap,
  QUEST = drawQuest,
  PARTY = drawParty,
  CRAFT = drawCraft,
  SHOP = drawShop,
  NOTIFICATION = drawNotification,
  SETTINGS = drawSettings,
}

function RobloxCommonIcons.Create(iconId, options)
  local id = string.upper(tostring(iconId or ""))
  local draw = DRAW[id]
  if not draw then error("UNKNOWN_COMMON_UI_ICON: " .. tostring(iconId)) end
  local root, color, accent = rootFor(id, options)
  draw(root, color, accent)
  return root
end

function RobloxCommonIcons.Audit()
  return table.freeze({
    version = 1,
    packId = "roblox-common-ui-v1",
    iconIds = ICONS,
    iconCount = #ICONS,
    imageAssetDependency = false,
    companyCommonBase = true,
    gameplayAuthority = false,
    productionVerified = false,
    internalAuditStudioRequired = false,
  })
end

return table.freeze(RobloxCommonIcons)
