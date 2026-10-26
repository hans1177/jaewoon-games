
-- 파일명: client/Game.client.luau
-- 임포트
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Run=game:GetService("RunService")
local Input=game:GetService("UserInputService")
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("Config"))
local remote=RS:WaitForChild(C.Remote)
-- 회사 보유 공용 게임창/버튼/아이콘 라이브러리(동일 저장소 자산)를 실물 UI에 사용한다.
local CommonUI=require(RS:WaitForChild("Shared"):WaitForChild("RobloxCommonUI"))
local Icons=require(RS:WaitForChild("Shared"):WaitForChild("RobloxCommonIcons"))
local theme=CommonUI.CreateTheme({
 Panel=Color3.fromRGB(24,34,41),PanelRaised=Color3.fromRGB(41,59,66),
 PanelInset=Color3.fromRGB(14,25,33),Border=Color3.fromRGB(88,119,125),
 BorderBright=Color3.fromRGB(169,197,173),Text=Color3.fromRGB(249,243,222),
 MutedText=Color3.fromRGB(180,199,199),Accent=Color3.fromRGB(229,185,95),
 Primary=Color3.fromRGB(61,110,98),PrimaryTop=Color3.fromRGB(84,144,113),
 PrimaryBottom=Color3.fromRGB(40,76,75),Positive=Color3.fromRGB(83,173,126),
 Warning=Color3.fromRGB(225,180,96),HealthGood=Color3.fromRGB(93,184,125),
 HealthWarn=Color3.fromRGB(217,155,67),HealthCritical=Color3.fromRGB(218,92,79),
 HealthTrack=Color3.fromRGB(45,54,57),Shadow=Color3.fromRGB(5,11,15),Corner=15,TouchHeight=44,
})
local gui=Instance.new("ScreenGui")
gui.Name="BaeksuHUD";gui.ResetOnSpawn=false;gui.DisplayOrder=12
gui.ZIndexBehavior=Enum.ZIndexBehavior.Global
gui.Parent=p:WaitForChild("PlayerGui")
local modalLayer=Instance.new("Frame")
modalLayer.Name="게임 시스템 창";modalLayer.BackgroundTransparency=1
modalLayer.Size=UDim2.fromScale(1,1);modalLayer.ZIndex=15
modalLayer.Visible=false;modalLayer.Parent=gui
local backdrop=Instance.new("TextButton")
backdrop.Name="창 바깥 터치해서 닫기";backdrop.Size=UDim2.fromScale(1,1)
backdrop.Text="";backdrop.BorderSizePixel=0
backdrop.BackgroundColor3=Color3.fromRGB(3,12,18)
backdrop.BackgroundTransparency=.38;backdrop.AutoButtonColor=false
backdrop.ZIndex=15;backdrop.Parent=modalLayer
local setWindow
-- UI: 모든 소환/전투는 자동. 슬롯 구매·건설·업그레이드 버튼만 제공.
-- 공용 라이브러리에서 창과 버튼을 만들고 게임 테마·ZIndex만 설정한다.
local function panel(parent,size,pos)
 local f=CommonUI.CreatePanel({name="군단 게임창",size=size,theme=theme,cornerRadius=16})
 f.Position=pos;f.Parent=parent
 local shift=parent==modalLayer and 21 or 2
 for _,child in ipairs(f:GetDescendants()) do
  if child:IsA("GuiObject") then child.ZIndex+=shift end
 end
 f.ZIndex=shift+1
 return f
end
local function label(parent,txt,size,pos)
 local l=Instance.new("TextLabel")
 l.Size=size;l.Position=pos;l.BackgroundTransparency=1;l.Text=txt
 l.TextColor3=theme.Text;l.TextSize=15;l.TextWrapped=true
 l.Font=Enum.Font.GothamBold;l.TextXAlignment=Enum.TextXAlignment.Left
 l.TextYAlignment=Enum.TextYAlignment.Center
 l.ZIndex=parent:IsA("GuiObject") and parent.ZIndex+4 or 4
 l.Parent=parent
 return l
end
local function iconFor(txt)
 if txt:find("지도") or txt:find("이동") then return "MINIMAP" end
 if txt:find("건설") or txt:find("슬롯") or txt:find("집") then return "CRAFT" end
 if txt:find("군단") or txt:find("진격") or txt:find("집결") or txt:find("방어") then return "PARTY" end
 if txt:find("연구") then return "EQUIPMENT" end
 if txt:find("임무") then return "QUEST" end
 if txt:find("일꾼") then return "CHARACTER" end
 return nil
end
local function button(parent,txt,size,order,fn)
 local b=CommonUI.CreatePrimaryButton({
  name="액션 "..tostring(order),text=txt,size=size,
  minWidth=44,minHeight=44,textSize=14,theme=theme,
 })
 b.LayoutOrder=order;b.Position=UDim2.new()
 local base=parent:IsA("GuiObject") and parent.ZIndex+4 or 4
 for _,child in ipairs(b:GetDescendants()) do
  if child:IsA("GuiObject") then child.ZIndex+=base end
 end
 b.ZIndex=base
 local icon=iconFor(txt)
 if icon and size.X.Offset~=0 and size.X.Offset>=90 or icon and size.X.Scale>0 then
  local art=Icons.Create(icon,{size=UDim2.fromOffset(23,23),color=theme.Text,accentColor=theme.Accent})
  art.Position=UDim2.fromOffset(8,10);art.ZIndex=b.ZIndex+2
  for _,node in ipairs(art:GetDescendants()) do
   if node:IsA("GuiObject") then node.ZIndex=art.ZIndex+1 end
  end
  art.Parent=b;b.TextXAlignment=Enum.TextXAlignment.Right
  local padding=Instance.new("UIPadding");padding.PaddingRight=UDim.new(0,10)
  padding.Parent=b
 end
 b.Parent=parent
 b.Activated:Connect(fn)
 return b
end
local top=panel(gui,UDim2.fromOffset(364,62),UDim2.fromOffset(7,6))
local title=label(top,"백수대전쟁 · 군단전선 타이쿤",UDim2.new(1,-12,0,23),UDim2.fromOffset(8,3))
title.TextSize=15
local status=label(top,"불러오는 중",UDim2.new(1,-12,0,34),UDim2.fromOffset(8,25))
status.TextSize=12
local dock=panel(modalLayer,UDim2.fromOffset(174,226),UDim2.new(1,-182,0,60))
dock.Visible=false
label(dock,"건물 슬롯",UDim2.new(1,-8,0,28),UDim2.fromOffset(8,4))
local list=Instance.new("ScrollingFrame");list.Size=UDim2.new(1,-14,1,-90)
list.Position=UDim2.fromOffset(7,32);list.BackgroundTransparency=1;list.BorderSizePixel=0
list.ScrollBarThickness=3;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new()
list.Parent=dock
local ll=Instance.new("UIListLayout");ll.SortOrder=Enum.SortOrder.LayoutOrder;ll.Padding=UDim.new(0,5);ll.Parent=list
local buy=Instance.new("TextButton");buy.Size=UDim2.new(1,-14,0,43);buy.Position=UDim2.new(0,7,1,-49)
buy.TextSize=13;buy.TextColor3=Color3.new(1,1,1);buy.BackgroundColor3=Color3.fromRGB(111,89,51)
buy.Font=Enum.Font.GothamBold;buy.Text="전장 준비 중";buy.Parent=dock
local menu=panel(modalLayer,UDim2.fromOffset(228,306),UDim2.new(0,8,.52,-135))
menu.Visible=false
local caption=label(menu,"집 선택",UDim2.new(1,-48,0,33),UDim2.fromOffset(8,5))
local close=button(menu,"뒤로",UDim2.fromOffset(69,44),0,function()setWindow("BUILD")end)
close.Position=UDim2.new(1,-76,0,7)
local choices=Instance.new("ScrollingFrame");choices.Size=UDim2.new(1,-12,1,-48)
choices.Position=UDim2.fromOffset(6,41);choices.BackgroundTransparency=1;choices.BorderSizePixel=0
choices.ScrollBarThickness=3;choices.AutomaticCanvasSize=Enum.AutomaticSize.Y;choices.CanvasSize=UDim2.new()
choices.Parent=menu
local cl=Instance.new("UIListLayout");cl.SortOrder=Enum.SortOrder.LayoutOrder;cl.Padding=UDim.new(0,5);cl.Parent=choices
local notice=label(gui,"섬 전체 1000×1280 · 기지에서 전선까지 직접 탐험! 건물 슬롯을 눌러 건설해.",UDim2.new(1,-20,0,38),UDim2.new(0,9,1,-45))
notice.TextColor3=Color3.fromRGB(252,226,137)
-- 군단 지휘와 경제 패널: 모바일에서는 버튼으로 펼쳐 화면을 확보한다.
local controlPanel=panel(modalLayer,UDim2.fromOffset(218,346),UDim2.fromOffset(8,133))
controlPanel.Visible=false
local mapPanel
local controlToggle=button(gui,"군단 · 경제",UDim2.fromOffset(137,46),0,function()setWindow("COMMAND")end)
controlToggle.Position=UDim2.new(1,-255,0,10)
-- 전장 가시성을 위해 건축 메뉴는 기본적으로 접는다.
local buildToggle=button(gui,"건설 · 슬롯",UDim2.fromOffset(116,46),1,function()setWindow("BUILD")end)
buildToggle.Position=UDim2.new(1,-128,0,10)

-- Noob Army Tycoon과 같은 규모의 전장은 현재 위치가 읽히는 지도가 필요하다.
-- 화면에 계속 떠 있는 패널 대신 버튼을 눌렀을 때만 펼친다.
local mapToggle=button(gui,"지도 · 이동",UDim2.fromOffset(112,46),2,function()setWindow("MAP")end)
mapToggle.Position=UDim2.new(1,-120,0,55)
mapPanel=panel(modalLayer,UDim2.fromOffset(190,273),UDim2.new(1,-198,0,98))
mapPanel.Visible=false
local modalExit=button(modalLayer,"닫기  ×",UDim2.fromOffset(101,44),10,function()setWindow(nil)end)
modalExit.ZIndex=48
-- 패널 간 상태는 단일 창 전환기로 제어. 지도/건설/군단 메뉴 중 하나만 보인다.
setWindow=function(kind)
 local active=(kind=="BUILD" and dock.Visible or kind=="SLOT" and menu.Visible
  or kind=="COMMAND" and controlPanel.Visible or kind=="MAP" and mapPanel.Visible)
 if active then kind=nil end
 dock.Visible=kind=="BUILD";menu.Visible=kind=="SLOT"
 controlPanel.Visible=kind=="COMMAND";mapPanel.Visible=kind=="MAP"
 modalLayer.Visible=kind~=nil
 gui:SetAttribute("OpenedSystemWindow",kind or "")
end
backdrop.Activated:Connect(function()setWindow(nil)end)

label(mapPanel,"동물 군단 섬 지도",UDim2.new(1,-12,0,26),UDim2.fromOffset(8,4))
local mapSurface=Instance.new("Frame")
mapSurface.Name="섬 전체 지도"
mapSurface.Size=UDim2.new(1,-16,0,125);mapSurface.Position=UDim2.fromOffset(8,30)
mapSurface.BackgroundColor3=Color3.fromRGB(43,82,90)
mapSurface.BorderSizePixel=0;mapSurface.Parent=mapPanel
local oceanEdge=Instance.new("UICorner");oceanEdge.CornerRadius=UDim.new(0,8);oceanEdge.Parent=mapSurface
local road=Instance.new("Frame")
road.Name="군단 진격로";road.AnchorPoint=Vector2.new(.5,.5)
road.Position=UDim2.fromScale(.5,.5);road.Size=UDim2.fromScale(.045,.76)
road.BorderSizePixel=0;road.BackgroundColor3=Color3.fromRGB(207,184,139);road.Parent=mapSurface
local function mapPin(txt,x,z,color)
 local pin=Instance.new("TextLabel")
 pin.Name="지도 "..txt
 pin.AnchorPoint=Vector2.new(.5,.5);pin.Size=UDim2.fromOffset(37,19)
 pin.BackgroundColor3=color;pin.BackgroundTransparency=.08
 pin.Text=txt;pin.TextSize=11;pin.TextColor3=Color3.fromRGB(255,255,255)
 pin.Font=Enum.Font.GothamBold;pin.BorderSizePixel=0
 pin.Position=UDim2.fromScale(.5+x/C.World.IslandWidth,1-(z+C.World.IslandLength*.5)/C.World.IslandLength)
 pin.Parent=mapSurface
 local radius=Instance.new("UICorner");radius.CornerRadius=UDim.new(0,7);radius.Parent=pin
 return pin
end
mapPin("기지",0,C.World.PlayerSpawnZ,Color3.fromRGB(48,140,100))
local pointOne=mapPin("거점1",0,C.World.CaptureZ[1],Color3.fromRGB(117,115,96))
local pointTwo=mapPin("거점2",0,C.World.CaptureZ[2],Color3.fromRGB(117,115,96))
mapPin("적진",0,C.World.EnemyGateZ,Color3.fromRGB(183,83,72))
local playerPin=mapPin("나",0,C.World.PlayerSpawnZ+42,Color3.fromRGB(69,139,221))
playerPin.ZIndex=3
local mapTravelHome=button(mapPanel,"내 기지 이동",UDim2.new(1,-16,0,30),4,function()
 remote:FireServer("TRAVEL","BASE");setWindow(nil)
end)
mapTravelHome.Position=UDim2.fromOffset(8,164)
local mapTravelFront=button(mapPanel,"중앙 전선 이동",UDim2.new(1,-16,0,30),5,function()
 remote:FireServer("TRAVEL","FRONT");setWindow(nil)
end)
mapTravelFront.Position=UDim2.fromOffset(8,199)
local mapTravelFar=button(mapPanel,"전방 거점 이동",UDim2.new(1,-16,0,30),6,function()
 remote:FireServer("TRAVEL","FORWARD");setWindow(nil)
end)
mapTravelFar.Position=UDim2.fromOffset(8,234)

label(controlPanel,"전선 사령부 · 군단 성장",UDim2.new(1,-12,0,28),UDim2.fromOffset(8,5))
local economyInfo=label(controlPanel,"자원 정보 불러오는 중",UDim2.new(1,-12,0,65),UDim2.fromOffset(8,35))
economyInfo.TextSize=12
local commandScroll=Instance.new("ScrollingFrame")
commandScroll.Size=UDim2.new(1,-12,1,-109)
commandScroll.Position=UDim2.fromOffset(6,103)
commandScroll.BackgroundTransparency=1;commandScroll.BorderSizePixel=0
commandScroll.ScrollBarThickness=3;commandScroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
commandScroll.CanvasSize=UDim2.new();commandScroll.Parent=controlPanel
local commandLayout=Instance.new("UIListLayout")
commandLayout.SortOrder=Enum.SortOrder.LayoutOrder;commandLayout.Padding=UDim.new(0,5)
commandLayout.Parent=commandScroll
local push=button(commandScroll,"전면 진격",UDim2.new(1,-10,0,36),1,function()remote:FireServer("SET_COMMAND","PUSH")end)
local rally=button(commandScroll,"거점 집결",UDim2.new(1,-10,0,36),2,function()remote:FireServer("SET_COMMAND","RALLY")end)
local defend=button(commandScroll,"본진 방어",UDim2.new(1,-10,0,36),3,function()remote:FireServer("SET_COMMAND","DEFEND")end)
local workerBtn=button(commandScroll,"일꾼 고용",UDim2.new(1,-10,0,39),4,function()remote:FireServer("HIRE_WORKER")end)
local labBtn=button(commandScroll,"연구소 확장",UDim2.new(1,-10,0,39),5,function()remote:FireServer("UPGRADE_LAB")end)
local techBtn=button(commandScroll,"전투 연구",UDim2.new(1,-10,0,39),6,function()remote:FireServer("RESEARCH")end)
local missionBtn=button(commandScroll,"임무",UDim2.new(1,-10,0,65),7,function()remote:FireServer("CLAIM_MISSION")end)
local function renderEconomy(e)
 if type(e)~="table" then return end
 local labels={PUSH="전면 진격",RALLY="거점 집결",DEFEND="본진 방어"}
 economyInfo.Text=string.format("일꾼 %d/8 · 연구소 %d/5 · 훈련 %d/5\n연구 %dRP · 거점 %d/2 · +%dG/2초\n현재 명령: %s",
  e.Workers or 0,e.Lab or 0,e.Tech or 0,e.Research or 0,e.Points or 0,e.PassiveGold or 0,labels[e.Command] or "전면 진격")
 for _,b in ipairs({push,rally,defend}) do
  b.BackgroundColor3=(b==push and e.Command=="PUSH" or b==rally and e.Command=="RALLY" or b==defend and e.Command=="DEFEND")
   and Color3.fromRGB(69,137,97) or Color3.fromRGB(67,111,109)
 end
 workerBtn.Text=(e.Workers or 0)>=8 and "일꾼 최대 고용" or ("일꾼 고용 · "..tostring(e.WorkerCost or 0).."G")
 labBtn.Text=(e.Lab or 0)>=5 and "연구소 최대 단계" or ("연구소 확장 · "..tostring(e.LabCost or 0).."G")
 techBtn.Text=(e.Tech or 0)>=5 and "군단 훈련 연구 완료" or ("군단 훈련 연구 · "..tostring(e.TechCost or 0).."RP")
 missionBtn.Text=string.format("임무: %s\n%s",e.MissionTitle or "준비 중",
  (e.Mission or 1)>5 and "모두 완료" or (e.CanClaim and ("보상 받기 +"..tostring(e.MissionReward or 0).."G") or "조건 달성 시 보상"))
 missionBtn.BackgroundColor3=e.CanClaim and Color3.fromRGB(134,106,52) or Color3.fromRGB(67,111,109)
end
local hasState=false
local current={Gold=0,Stage=1,HomeHP=500,EnemyHP=380,Unlocked=3,Buildings={},Economy={}}
local function updateMap()
 local e=current.Economy
 local colors={ALLY=Color3.fromRGB(61,161,103),ENEMY=Color3.fromRGB(189,84,77),NEUTRAL=Color3.fromRGB(117,115,96)}
 if type(e)=="table" and type(e.CaptureOwners)=="table" then
  pointOne.BackgroundColor3=colors[e.CaptureOwners[1]] or colors.NEUTRAL
  pointTwo.BackgroundColor3=colors[e.CaptureOwners[2]] or colors.NEUTRAL
 end
 local arenaX=p:GetAttribute("ArenaX")
 local character=p.Character
 local root=character and character:FindFirstChild("HumanoidRootPart")
 if type(arenaX)~="number" or not root then return end
 local x=math.clamp(.5+(root.Position.X-arenaX)/C.World.IslandWidth,.08,.92)
 local z=math.clamp(1-(root.Position.Z+C.World.IslandLength*.5)/C.World.IslandLength,.08,.92)
 playerPin.Position=UDim2.fromScale(x,z)
end
task.spawn(function()
 while gui.Parent do
  if mapPanel.Visible then updateMap() end
  task.wait(.33)
 end
end)
local function updateStatus()
 status.Text=string.format("스테이지 %d · 골드 %d\n우리 성문 %d  |  적 성문 %d",
  current.Stage or 1,current.Gold or 0,math.ceil(current.HomeHP or 500),math.ceil(current.EnemyHP or 380))
end
local function updateSaveNotice()
 if p:GetAttribute("SaveStatus")=="SESSION_ONLY" then
  notice.Text="비공개 테스트 · 임시 세션 (저장 연결 확인 필요)"
 end
end
p:GetAttributeChangedSignal("SaveStatus"):Connect(updateSaveNotice)
local chosen=1
local function redrawMenu(index)
 chosen=index;setWindow("SLOT")
 for _,x in ipairs(choices:GetChildren()) do if x:IsA("GuiObject") then x:Destroy() end end
 local b=current.Buildings[index]
 if b and b.Kind~="" and C.ById[b.Kind] then
  local u=C.ById[b.Kind];caption.Text=u.Home.." "..b.Level.."/10"
  if b.Level<C.MaxLevel then
   button(choices,"다음 진화 · "..C.UpgradeCost(u,b.Level).."G",UDim2.new(1,-8,0,43),1,function() remote:FireServer("UPGRADE",chosen) end)
  else
   local done=label(choices,"10단계 진화 완료",UDim2.new(1,-10,0,43),UDim2.fromOffset(2,0))
   done.LayoutOrder=1
  end
 else
  caption.Text="슬롯 "..index.." · 집 선택"
  for i,u in ipairs(C.Units) do
   local kind=u.Id
   button(choices,u.Home.." · "..u.Cost.."G",UDim2.new(1,-8,0,38),i,function()remote:FireServer("BUILD",chosen,kind)end)
  end
 end
end
local function refresh()
 updateStatus()
 renderEconomy(current.Economy)
 local scroll=list.CanvasPosition
 for _,x in ipairs(list:GetChildren()) do if x:IsA("TextButton") then x:Destroy() end end
 for i=1,(current.Unlocked or 3) do
  local index=i
  local b=current.Buildings[i];local u=b and C.ById[b.Kind]
  local name=u and (i..". "..u.Home.." Lv."..b.Level) or (i..". 빈 슬롯 · 건설")
  button(list,name,UDim2.new(1,-7,0,41),i,function()redrawMenu(index)end)
 end
 list.CanvasPosition=scroll
 buy.Text="슬롯 "..(current.Unlocked+1).." 구매 · "..C.SlotCost(current.Unlocked+1).."G"
 if menu.Visible then redrawMenu(chosen) end
end
buy.Activated:Connect(function()remote:FireServer("BUY_SLOT")end)
remote.OnClientEvent:Connect(function(action,data)
 if action=="LOAD_ERROR" then
  status.Text="전장 시작 오류 · 재접속 필요"
  notice.Text=type(data)=="table" and (data.Message or "전장 불러오기 실패") or "전장 불러오기 실패"
  buy.Text="로딩 실패"
  return
 end
 if action=="ECONOMY" and type(data)=="table" then
  current.Gold=data.Gold or current.Gold
  current.Economy=data
  updateStatus()
  renderEconomy(data)
  updateMap()
  return
 end
 if action=="OPEN_SLOT" and type(data)=="table" then
  local index=tonumber(data.Index)
  if index and index%1==0 and index>=1 and index<=(current.Unlocked or 3) then
   redrawMenu(index)
  end
  return
 end
 if action~="STATE" or type(data)~="table" then return end
 hasState=true
 current=data
 if data.Message and data.Message~="" then notice.Text=data.Message end
 updateSaveNotice()
 refresh()
 updateMap()
end)
for _,k in ipairs({"Gold","HomeHP","EnemyHP","Stage"}) do
 p:GetAttributeChangedSignal(k):Connect(function()
  local v=p:GetAttribute(k)
  if type(v)=="number" then current[k]=v;updateStatus() end
 end)
end
remote:FireServer("SYNC")
task.delay(12,function()
 if not hasState and gui.Parent then
  status.Text="전장 서버 응답 지연"
  notice.Text="전장 초기화가 지연되고 있어 · 동기화 재요청"
  remote:FireServer("SYNC")
 end
end)
-- Noob Army Tycoon형 Roblox 기본 3인칭 카메라 사용.
-- Scriptable/매 프레임 CFrame 덮어쓰기를 제거해 PC 우클릭, 휠, 모바일 드래그/핀치 및
-- 캐릭터 이동을 Roblox 기본 CameraModule이 처리하도록 한다.
p.CameraMode=Enum.CameraMode.Classic
p.CameraMinZoomDistance=11
p.CameraMaxZoomDistance=245
local function followCharacter(character)
 local humanoid=character:WaitForChild("Humanoid",10)
 if not humanoid then return end
 -- 직접 움직이는 캐릭터가 시점의 기준이며, 화면을 강제로 고정하지 않는다.
 humanoid.CameraOffset=Vector3.new(0,2.2,0)
 local camera=workspace.CurrentCamera
 if camera then
  camera.CameraType=Enum.CameraType.Custom
  camera.CameraSubject=humanoid
  camera.FieldOfView=72
 end
end
p.CharacterAdded:Connect(followCharacter)
if p.Character then task.defer(followCharacter,p.Character) end
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function()
 if p.Character then task.defer(followCharacter,p.Character) end
end)

-- 자유 카메라와 별개로 UI 폭만 화면 크기에 맞춘다. 시점에는 개입하지 않는다.
-- ===== 카메라·모바일 HUD =====
-- Roblox 기본 카메라가 PC 마우스/휠과 모바일 드래그/핀치를 처리한다.
-- 조작 UI는 화면 크기에 맞추되 시점 회전·이동을 가로막지 않는다.
local lastWidth=0
local function resizeHud()
 local camera=workspace.CurrentCamera
 if not camera then return end
 local width=camera.ViewportSize.X
 if math.abs(width-lastWidth)<2 then return end
 lastWidth=width
 local narrow=width<690 or (Input.TouchEnabled and width<1000)
 local compact=width<490
 -- 오버레이가 전투장 대부분을 가리지 않도록 크기를 제한한다.
 local topWidth=compact and math.min(width-14,300) or (narrow and 314 or 364)
 top.Size=UDim2.fromOffset(topWidth,compact and 60 or 62)
 title.TextSize=compact and 13 or 15
 status.TextSize=compact and 11 or 12
 controlPanel.Size=compact and UDim2.fromOffset(176,292) or UDim2.fromOffset(205,318)
 controlPanel.Position=UDim2.fromOffset(8,compact and 115 or 79)
 controlToggle.Size=compact and UDim2.fromOffset(98,34) or UDim2.fromOffset(114,36)
 buildToggle.Size=compact and UDim2.fromOffset(98,34) or UDim2.fromOffset(112,36)
 mapToggle.Size=compact and UDim2.fromOffset(96,32) or UDim2.fromOffset(112,35)
 mapPanel.Size=compact and UDim2.fromOffset(174,273) or UDim2.fromOffset(190,273)
 if compact then
  controlToggle.Position=UDim2.fromOffset(8,74)
  buildToggle.Position=UDim2.fromOffset(113,74)
  mapToggle.Position=UDim2.fromOffset(218,74)
  mapPanel.Position=UDim2.new(1,-181,0,114)
 else
  controlToggle.Position=UDim2.new(1,-251,0,10)
  buildToggle.Position=UDim2.new(1,-127,0,10)
  mapToggle.Position=UDim2.new(1,-120,0,55)
  mapPanel.Position=UDim2.new(1,-198,0,98)
 end
 dock.Size=compact and UDim2.fromOffset(157,214) or (narrow and UDim2.fromOffset(165,223) or UDim2.fromOffset(181,239))
 dock.Position=compact and UDim2.new(1,-164,0,115) or UDim2.new(1,narrow and -172 or -189,0,54)
 menu.Size=compact and UDim2.fromOffset(186,238) or (narrow and UDim2.fromOffset(192,262) or UDim2.fromOffset(221,286))
 menu.Position=compact and UDim2.fromOffset(5,115) or UDim2.fromOffset(8,74)
 notice.TextSize=compact and 11 or 12
end
Run:BindToRenderStep("BaeksuWarResponsiveHUD",Enum.RenderPriority.Last.Value,resizeHud)

-- ===== 전장 건축 인터랙션 =====
-- UI 슬롯 외에 3D Terrain 위의 실제 건축 슬롯을 눌러 같은 건설 메뉴를 연다.
-- 추가 Parts/투명 감지 파츠/임의 모델 없이 기존 슬롯 좌표를 그대로 재사용한다.
local function openWorldSlot(screenPosition)
 local camera=workspace.CurrentCamera
 local arenaX=p:GetAttribute("ArenaX")
 if not camera or type(arenaX)~="number" then return end
 local ray=camera:ViewportPointToRay(screenPosition.X,screenPosition.Y)
 local filter=RaycastParams.new()
 filter.FilterType=Enum.RaycastFilterType.Exclude
 if p.Character then filter.FilterDescendantsInstances={p.Character} end
 local hit=workspace:Raycast(ray.Origin,ray.Direction*500,filter)
 if not hit then return end
 local at=hit.Position
 local row=math.floor((C.World.BuildZ-at.Z)/19+.5)
 local col=math.floor((at.X-arenaX+18)/18+.5)
 if row<0 or col<0 or col>2 then return end
 local index=row*3+col+1
 if index>(current.Unlocked or 0) then return end
 local expectedX=arenaX+(col-1)*18
 local expectedZ=C.World.BuildZ-row*19
 if math.abs(at.X-expectedX)>7.5 or math.abs(at.Z-expectedZ)>7.5 then return end
 redrawMenu(index)
end
local touchStart={}
local activeTouches=0
local pinchGesture=false
Input.InputBegan:Connect(function(input,processed)
 if processed then return end
 if input.UserInputType==Enum.UserInputType.Touch then
  activeTouches+=1
  if activeTouches>1 then pinchGesture=true end
  touchStart[input]=Vector2.new(input.Position.X,input.Position.Y)
 end
end)
Input.InputEnded:Connect(function(input,processed)
 local kind=input.UserInputType
 if kind==Enum.UserInputType.Touch then
  local first=touchStart[input]
  touchStart[input]=nil
  activeTouches=math.max(0,activeTouches-1)
  local cancelled=pinchGesture
  if activeTouches==0 then pinchGesture=false end
  if processed or not first or cancelled then return end
  local last=Vector2.new(input.Position.X,input.Position.Y)
  if (last-first).Magnitude>13 then return end
  openWorldSlot(last)
 elseif kind==Enum.UserInputType.MouseButton1 and not processed then
  openWorldSlot(Vector2.new(input.Position.X,input.Position.Y))
 end
end)
