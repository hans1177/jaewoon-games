
-- 파일명: client/Game.client.luau
-- 임포트
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local Run=game:GetService("RunService")
local Input=game:GetService("UserInputService")
local p=Players.LocalPlayer
local C=require(RS:WaitForChild("Shared"):WaitForChild("Config"))
local remote=RS:WaitForChild(C.Remote)
local gui=Instance.new("ScreenGui")
gui.Name="BaeksuHUD";gui.ResetOnSpawn=false;gui.Parent=p:WaitForChild("PlayerGui")
-- UI: 모든 소환/전투는 자동. 슬롯 구매·건설·업그레이드 버튼만 제공.
local function panel(parent,size,pos)
 local f=Instance.new("Frame");f.Size=size;f.Position=pos;f.BackgroundColor3=Color3.fromRGB(32,42,50)
 f.BackgroundTransparency=.04;f.BorderSizePixel=0;f.Parent=parent
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,12);c.Parent=f
 local border=Instance.new("UIStroke");border.Color=Color3.fromRGB(130,170,154);border.Thickness=1;border.Transparency=.43;border.Parent=f
 local gradient=Instance.new("UIGradient");gradient.Color=ColorSequence.new(Color3.fromRGB(44,66,64),Color3.fromRGB(29,38,49));gradient.Rotation=90;gradient.Parent=f
 return f
end
local function label(parent,txt,size,pos)
 local l=Instance.new("TextLabel");l.Size=size;l.Position=pos;l.BackgroundTransparency=1
 l.Text=txt;l.TextColor3=Color3.fromRGB(246,240,216);l.TextSize=14
 l.TextWrapped=true;l.Font=Enum.Font.GothamBold;l.TextXAlignment=Enum.TextXAlignment.Left;l.Parent=parent
 return l
end
local function button(parent,txt,size,order,fn)
 local b=Instance.new("TextButton");b.Name=txt;b.Size=size;b.LayoutOrder=order
 b.BackgroundColor3=Color3.fromRGB(67,111,109);b.Text=txt;b.TextSize=13;b.TextWrapped=true
 b.TextColor3=Color3.new(1,1,1);b.Font=Enum.Font.GothamBold;b.Parent=parent
 local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,8);c.Parent=b
 local stroke=Instance.new("UIStroke");stroke.Color=Color3.fromRGB(156,215,177);stroke.Transparency=.6;stroke.Parent=b
 b.Activated:Connect(fn)
 return b
end
local top=panel(gui,UDim2.new(1,-14,0,74),UDim2.fromOffset(7,6))
local title=label(top,"백수대전쟁 Ⅱ · 생물 군단 공성전",UDim2.new(1,-12,0,23),UDim2.fromOffset(8,3))
title.TextSize=17
local status=label(top,"불러오는 중",UDim2.new(1,-12,0,40),UDim2.fromOffset(8,27))
local dock=panel(gui,UDim2.fromOffset(208,295),UDim2.new(1,-216,.52,-125))
label(dock,"건물 슬롯",UDim2.new(1,-8,0,28),UDim2.fromOffset(8,4))
local list=Instance.new("ScrollingFrame");list.Size=UDim2.new(1,-14,1,-90)
list.Position=UDim2.fromOffset(7,32);list.BackgroundTransparency=1;list.BorderSizePixel=0
list.ScrollBarThickness=3;list.AutomaticCanvasSize=Enum.AutomaticSize.Y;list.CanvasSize=UDim2.new()
list.Parent=dock
local ll=Instance.new("UIListLayout");ll.SortOrder=Enum.SortOrder.LayoutOrder;ll.Padding=UDim.new(0,5);ll.Parent=list
local buy=Instance.new("TextButton");buy.Size=UDim2.new(1,-14,0,43);buy.Position=UDim2.new(0,7,1,-49)
buy.TextSize=13;buy.TextColor3=Color3.new(1,1,1);buy.BackgroundColor3=Color3.fromRGB(111,89,51)
buy.Font=Enum.Font.GothamBold;buy.Parent=dock
local menu=panel(gui,UDim2.fromOffset(228,306),UDim2.new(0,8,.52,-135))
menu.Visible=false
local caption=label(menu,"집 선택",UDim2.new(1,-48,0,33),UDim2.fromOffset(8,5))
local close=Instance.new("TextButton");close.Text="닫기";close.Size=UDim2.fromOffset(42,30)
close.Position=UDim2.new(1,-47,0,5);close.Parent=menu
close.Activated:Connect(function()menu.Visible=false;dock.Visible=true end)
local choices=Instance.new("ScrollingFrame");choices.Size=UDim2.new(1,-12,1,-48)
choices.Position=UDim2.fromOffset(6,41);choices.BackgroundTransparency=1;choices.BorderSizePixel=0
choices.ScrollBarThickness=3;choices.AutomaticCanvasSize=Enum.AutomaticSize.Y;choices.CanvasSize=UDim2.new()
choices.Parent=menu
local cl=Instance.new("UIListLayout");cl.SortOrder=Enum.SortOrder.LayoutOrder;cl.Padding=UDim.new(0,5);cl.Parent=choices
local notice=label(gui,"건물을 지어 병력을 모으고, 성문을 돌파해!",UDim2.new(1,-20,0,38),UDim2.new(0,9,1,-45))
notice.TextColor3=Color3.fromRGB(252,226,137)
local current={Gold=0,Stage=1,HomeHP=500,EnemyHP=380,Unlocked=3,Buildings={}}
local function updateSaveNotice()
 if p:GetAttribute("SaveStatus")=="SESSION_ONLY" then
  notice.Text="비공개 테스트 · 임시 세션 (저장 연결 확인 필요)"
 end
end
p:GetAttributeChangedSignal("SaveStatus"):Connect(updateSaveNotice)
local chosen=1
local function redrawMenu(index)
 chosen=index;menu.Visible=true;dock.Visible=false
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
 status.Text=string.format("스테이지 %d · 골드 %d\n우리 성문 %d  |  적 성문 %d",current.Stage or 1,current.Gold or 0,math.ceil(current.HomeHP or 500),math.ceil(current.EnemyHP or 380))
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
 if action~="STATE" or type(data)~="table" then return end
 current=data
 if data.Message and data.Message~="" then notice.Text=data.Message end
 updateSaveNotice()
 refresh()
end)
for _,k in ipairs({"Gold","HomeHP","EnemyHP","Stage"}) do
 p:GetAttributeChangedSignal(k):Connect(function()
  local v=p:GetAttribute(k);if type(v)=="number" then current[k]=v;status.Text=string.format("스테이지 %d · 골드 %d\n우리 성문 %d  |  적 성문 %d",current.Stage or 1,current.Gold or 0,math.ceil(current.HomeHP or 500),math.ceil(current.EnemyHP or 380)) end
 end)
end
remote:FireServer("SYNC")
-- 카메라: 횡스크롤이 아닌 고정 3D 사선 시점
local lastNarrow=nil
Run:BindToRenderStep("BaeksuWarCamera",Enum.RenderPriority.Camera.Value+1,function()
 local cam=workspace.CurrentCamera
 local x=p:GetAttribute("ArenaX")
 if not cam or type(x)~="number" then return end
 cam.CameraType=Enum.CameraType.Scriptable;cam.FieldOfView=63
 cam.CFrame=CFrame.lookAt(Vector3.new(x+57,78,-21),Vector3.new(x,2,-22))
 local narrow=cam.ViewportSize.X<700 or (Input.TouchEnabled and cam.ViewportSize.X<950)
 if narrow~=lastNarrow then
  lastNarrow=narrow
  dock.Size=narrow and UDim2.fromOffset(160,254) or UDim2.fromOffset(208,295)
  dock.Position=narrow and UDim2.new(1,-165,.52,-108) or UDim2.new(1,-216,.52,-125)
  menu.Size=narrow and UDim2.fromOffset(181,255) or UDim2.fromOffset(228,306)
  menu.Position=narrow and UDim2.new(0,5,.52,-110) or UDim2.new(0,8,.52,-135)
 end
end)
