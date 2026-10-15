--!strict
-- 파일명: roblox-games/simple-rpg/client/InventoryUI.client.luau
-- 역할: 수제 원목/양피지 인벤토리, 4열 x 8행 슬롯, 8개 단축 슬롯. 권한은 서버에 있다.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local HttpService = game:GetService("HttpService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName) :: RemoteEvent
local theme = Config.Civilization
local names: {[string]: string} = {Wood="목재", Stone="석재", Bronze="청동", Iron="철광", Food="식량"}
local colors: {[string]: Color3} = {
  Wood=Color3.fromRGB(111,151,83), Stone=Color3.fromRGB(154,157,151),
  Bronze=Color3.fromRGB(197,142,76), Iron=Color3.fromRGB(129,153,162),
  Food=Color3.fromRGB(209,153,86),
}
local gui = Instance.new("ScreenGui")
gui.Name = "CivInventoryGui"
gui.ResetOnSpawn = false
gui.DisplayOrder = 25
gui.Parent = playerGui

local function panel(parent: Instance, title: string, size: UDim2, pos: UDim2, wood: boolean): Frame
  local frame = Instance.new("Frame")
  frame.Name = title
  frame.Size = size
  frame.Position = pos
  frame.BackgroundColor3 = wood and Color3.fromRGB(84,61,43) or Color3.fromRGB(215,197,152)
  frame.BorderSizePixel = 0
  frame.Parent = parent
  local grad = Instance.new("UIGradient")
  grad.Rotation = 65
  grad.Color = ColorSequence.new(
    wood and Color3.fromRGB(129,94,56) or Color3.fromRGB(239,220,169),
    wood and Color3.fromRGB(64,44,31) or Color3.fromRGB(184,159,109))
  grad.Parent = frame
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 9)
  corner.Parent = frame
  local stroke = Instance.new("UIStroke")
  stroke.Color = wood and Color3.fromRGB(193,147,91) or Color3.fromRGB(115,81,47)
  stroke.Thickness = wood and 3 or 2
  stroke.Parent = frame
  -- 9-Slice는 실제 업로드한 소유 이미지가 존재할 때만 렌더링한다.
  local imageId = wood and theme.UIWoodImage or theme.UIParchmentImage
  if typeof(imageId) == "string" and #imageId > 0 then
    local trim = Instance.new("ImageLabel")
    trim.Name = "NineSliceTexture"
    trim.BackgroundTransparency = 1
    trim.Image = imageId
    trim.ScaleType = Enum.ScaleType.Slice
    local r = theme.UISlice
    trim.SliceCenter = Rect.new(r[1], r[2], r[3], r[4])
    trim.Size = UDim2.fromScale(1, 1)
    trim.ZIndex = frame.ZIndex
    trim.Parent = frame
  end
  return frame
end
local function label(parent: Instance, text: string, size: UDim2, pos: UDim2): TextLabel
  local object = Instance.new("TextLabel")
  object.BackgroundTransparency = 1
  object.Text = text
  object.Size = size
  object.Position = pos
  object.TextColor3 = Color3.fromRGB(48,33,22)
  object.TextSize = 16
  object.TextWrapped = true
  object.Font = Enum.Font.GothamBold
  object.Parent = parent
  return object
end
local function button(parent: Instance, text: string, size: UDim2, pos: UDim2): TextButton
  local object = Instance.new("TextButton")
  object.Size = size
  object.Position = pos
  object.BackgroundColor3 = Color3.fromRGB(232,211,168)
  object.TextColor3 = Color3.fromRGB(54,37,24)
  object.TextSize = 15
  object.TextWrapped = true
  object.Font = Enum.Font.GothamBold
  object.AutoButtonColor = true
  object.BorderSizePixel = 0
  object.Text = text
  object.Parent = parent
  local rounded = Instance.new("UICorner")
  rounded.CornerRadius = UDim.new(0, 6)
  rounded.Parent = object
  return object
end

local toggle = button(gui, "가방", UDim2.fromOffset(82, 42), UDim2.new(1,-92,0,198))
toggle.BackgroundColor3 = Color3.fromRGB(116,80,49)
toggle.TextColor3 = Color3.fromRGB(249,235,198)

local window = panel(gui, "InventoryPanel", UDim2.new(1,-24,0.76,0), UDim2.fromScale(0.5,0.5), true)
window.AnchorPoint = Vector2.new(0.5,0.5)
window.Visible = false
local constraint = Instance.new("UISizeConstraint")
constraint.MaxSize = Vector2.new(560, 760)
constraint.MinSize = Vector2.new(280, 330)
constraint.Parent = window
local parchment = panel(window, "Parchment", UDim2.new(1,-18,1,-18), UDim2.fromOffset(9,9), false)
parchment.ClipsDescendants = true
label(parchment, "문명 인벤토리  |  32칸", UDim2.new(1,-92,0,43), UDim2.fromOffset(8,2))
local close = button(parchment, "닫기", UDim2.fromOffset(70,39), UDim2.new(1,-76,0,4))
close.Activated:Connect(function() window.Visible = false end)
local message = label(parchment, "아이템을 눌러 선택하거나 다른 칸으로 끌어 이동해.", UDim2.new(1,-14,0,37), UDim2.fromOffset(7,44))
message.TextSize = 12
local gridFrame = Instance.new("ScrollingFrame")
gridFrame.Name = "InventorySlots"
gridFrame.Size = UDim2.new(1,-16,1,-178)
gridFrame.Position = UDim2.fromOffset(8,81)
gridFrame.BackgroundTransparency = 1
gridFrame.ScrollBarThickness = 5
gridFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
gridFrame.CanvasSize = UDim2.new()
gridFrame.ScrollingDirection = Enum.ScrollingDirection.Y
gridFrame.Parent = parchment
local grid = Instance.new("UIGridLayout")
grid.Name = "FourByEight"
grid.CellPadding = UDim2.fromOffset(6,6)
grid.FillDirectionMaxCells = 4
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.Parent = gridFrame
local function resizeGrid()
  local cell = math.floor((gridFrame.AbsoluteSize.X-33)/4)
  grid.CellSize = UDim2.fromOffset(cell,math.max(54,math.min(cell,70)))
end
gridFrame:GetPropertyChangedSignal("AbsoluteSize"):Connect(resizeGrid)
task.defer(resizeGrid)
local quickTitle = label(parchment, "퀵슬롯 1~8 | 선택한 칸 → 단축 슬롯 터치", UDim2.new(1,-16,0,28), UDim2.new(0,8,1,-92))
quickTitle.TextSize = 12
local quickScroll = Instance.new("ScrollingFrame")
quickScroll.Name = "QuickBar"
quickScroll.Size = UDim2.new(1,-16,0,57)
quickScroll.Position = UDim2.new(0,8,1,-65)
quickScroll.BackgroundTransparency = 1
quickScroll.ScrollBarThickness = 4
quickScroll.ScrollDirection = Enum.ScrollingDirection.X
quickScroll.ScrollingDirection = Enum.ScrollingDirection.X
quickScroll.CanvasSize = UDim2.fromOffset(8*62,0)
quickScroll.Parent = parchment
local quickLayout = Instance.new("UIListLayout")
quickLayout.FillDirection = Enum.FillDirection.Horizontal
quickLayout.SortOrder = Enum.SortOrder.LayoutOrder
quickLayout.Padding = UDim.new(0,5)
quickLayout.Parent = quickScroll

local hoverSound = Instance.new("Sound")
hoverSound.SoundId = "rbxassetid://7171761940"
hoverSound.Volume = 0.08
hoverSound.Parent = gui
local inventory: {any} = {}
local hotbar: {number} = {}
local slots: {TextButton} = {}
local quickButtons: {TextButton} = {}
local selectedIndex = 0
local dragOrigin = 0
local dragInput: InputObject? = nil
local dragStart: Vector2? = nil
local dragMoved = false
local lastDrag = 0
local ghost = label(gui,"",UDim2.fromOffset(108,54),UDim2.fromOffset(0,0))
ghost.Visible = false
ghost.BackgroundTransparency = 0.16
ghost.BackgroundColor3 = Color3.fromRGB(219,183,122)
ghost.TextSize = 13
ghost.ZIndex = 110
local function readJSON(attr: string): {any}
  local raw = player:GetAttribute(attr)
  if typeof(raw) ~= "string" or #raw > 12000 then return {} end
  local ok, value = pcall(function(): any return HttpService:JSONDecode(raw) end)
  return ok and typeof(value) == "table" and value or {}
end
local function readSlot(index: number): (string,number)
  local entry = inventory[index]
  if typeof(entry) ~= "table" or not names[entry.id] or typeof(entry.count) ~= "number" then return "",0 end
  return entry.id,entry.count
end
local function refresh()
  inventory = readJSON("CivInventoryJSON")
  hotbar = readJSON("CivHotbarJSON")
  for index, control in ipairs(slots) do
    local item,count = readSlot(index)
    control.Text = item ~= "" and (names[item] .. "\n" .. count) or ("빈 칸\n" .. index)
    control.BackgroundColor3 = index == selectedIndex and Color3.fromRGB(245,199,115)
      or item ~= "" and colors[item] or Color3.fromRGB(186,171,139)
  end
  for index, control in ipairs(quickButtons) do
    local bound = hotbar[index] or 0
    local item = readSlot(bound)
    control.Text = tostring(index) .. "\n" .. (item ~= "" and names[item] or "-")
  end
end
local function activate(index: number)
  if os.clock()-lastDrag < 0.20 then return end
  if selectedIndex > 0 and selectedIndex ~= index then
    remote:FireServer("CivInvSwap",selectedIndex,index)
    selectedIndex = 0
  else
    selectedIndex = selectedIndex == index and 0 or index
  end
  refresh()
end
for index=1,32 do
  local slot = button(gridFrame,"",UDim2.fromScale(1,1),UDim2.fromOffset(0,0))
  slot.Name = "InventorySlot" .. index
  slot.LayoutOrder = index
  slot:SetAttribute("CivInventoryIndex",index)
  slot.TextSize = 13
  slots[index] = slot
  slot.Activated:Connect(function() activate(index) end)
  slot.MouseEnter:Connect(function()
    if not UserInputService.TouchEnabled then
      hoverSound:Play()
      TweenService:Create(slot,TweenInfo.new(0.12),{BackgroundTransparency=0.10}):Play()
    end
  end)
  slot.MouseLeave:Connect(function()
    TweenService:Create(slot,TweenInfo.new(0.12),{BackgroundTransparency=0}):Play()
  end)
  slot.InputBegan:Connect(function(input)
    if (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1)
      and window.Visible then
      local id = readSlot(index)
      if id == "" then return end
      dragOrigin = index
      dragInput = input
      dragStart = Vector2.new(input.Position.X,input.Position.Y)
      dragMoved = false
    end
  end)
end
for index=1,8 do
  local slot = button(quickScroll,tostring(index),UDim2.fromOffset(57,52),UDim2.fromOffset(0,0))
  slot.Name = "HotbarSlot" .. index
  slot.LayoutOrder = index
  slot:SetAttribute("CivHotbarIndex",index)
  slot.TextSize = 12
  quickButtons[index] = slot
  slot.Activated:Connect(function()
    if selectedIndex > 0 then
      remote:FireServer("CivHotbarEquip",selectedIndex,index)
      selectedIndex = 0
      message.Text = "단축 슬롯 " .. index .. "에 연결했어."
      refresh()
    else
      remote:FireServer("CivHotbarUse",index)
    end
  end)
end
UserInputService.InputChanged:Connect(function(input)
  if not dragInput or not dragStart then return end
  if input ~= dragInput and not (dragInput.UserInputType == Enum.UserInputType.MouseButton1
    and input.UserInputType == Enum.UserInputType.MouseMovement) then return end
  local position = Vector2.new(input.Position.X,input.Position.Y)
  if (position - dragStart).Magnitude > 12 then dragMoved = true end
  if dragMoved then
    ghost.Visible = true
    local id,count = readSlot(dragOrigin)
    ghost.Text = (names[id] or "아이템") .. " " .. count
    ghost.Position = UDim2.fromOffset(position.X-50,position.Y-25)
  end
end)
UserInputService.InputEnded:Connect(function(input)
  if not dragInput or (input ~= dragInput and input.UserInputType ~= dragInput.UserInputType) then return end
  local origin = dragOrigin
  local moved = dragMoved
  dragOrigin = 0
  dragInput = nil
  dragStart = nil
  dragMoved = false
  ghost.Visible = false
  if not moved or not window.Visible then return end
  lastDrag = os.clock()
  for _, object in ipairs(playerGui:GetGuiObjectsAtPosition(input.Position.X,input.Position.Y)) do
    local slot = object:GetAttribute("CivInventoryIndex")
    local quick = object:GetAttribute("CivHotbarIndex")
    if typeof(slot) == "number" and slot ~= origin then
      remote:FireServer("CivInvSwap",origin,slot)
      break
    elseif typeof(quick) == "number" then
      remote:FireServer("CivHotbarEquip",origin,quick)
      break
    end
  end
end)
toggle.Activated:Connect(function()
  window.Visible = not window.Visible
  if window.Visible then refresh() end
end)
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService:GetFocusedTextBox() then return end
  if input.KeyCode == Enum.KeyCode.I then
    window.Visible = not window.Visible
    if window.Visible then refresh() end
  else
    local quick = ({
      [Enum.KeyCode.One]=1,[Enum.KeyCode.Two]=2,[Enum.KeyCode.Three]=3,
      [Enum.KeyCode.Four]=4,[Enum.KeyCode.Five]=5,[Enum.KeyCode.Six]=6,
      [Enum.KeyCode.Seven]=7,[Enum.KeyCode.Eight]=8,
    })[input.KeyCode]
    if quick then remote:FireServer("CivHotbarUse",quick) end
  end
end)
player:GetAttributeChangedSignal("CivInventoryJSON"):Connect(refresh)
player:GetAttributeChangedSignal("CivHotbarJSON"):Connect(refresh)
refresh()
