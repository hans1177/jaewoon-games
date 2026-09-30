-- 파일명: roblox-games/horror-escape-room/client/ManorLobby.client.luau
-- 임포트 · 저택 전용 화면, 실제 전투 HUD는 Game.client.luau에 유지.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local TweenService=game:GetService("TweenService")
local p=Players.LocalPlayer
local C=require(RS.Shared.GameConfig)
local Assets=require(RS.Shared.ManorAssets)
local Stories=require(RS.Shared.MonsterStories)
local remote=RS:WaitForChild(C.RemoteName)
local gui=Instance.new("ScreenGui");gui.Name="PersonalManorUI";gui.ResetOnSpawn=false;gui.DisplayOrder=15
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets;gui.Parent=p:WaitForChild("PlayerGui")
local ink=Color3.fromRGB(27,30,29)
local parchment=Color3.fromRGB(235,218,182)
local accent=Color3.fromRGB(150,104,71)
local activeMenu=nil
local notebookOpen=false
local function corner(parent,n)
 local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,n or 4);x.Parent=parent
 local line=Instance.new("UIStroke");line.ApplyStrokeMode=Enum.ApplyStrokeMode.Border;line.Color=Color3.fromRGB(158,133,83);line.Transparency=.35;line.Thickness=1;line.Parent=parent
end
local function label(parent,text,height,size)
 local x=Instance.new("TextLabel");x.BackgroundTransparency=1;x.Size=UDim2.new(1,-12,0,height or 32)
 x.Text=text;x.TextColor3=parchment;x.TextSize=size or 14;x.TextWrapped=true;x.Font=Enum.Font.Gotham
 x.TextXAlignment=Enum.TextXAlignment.Left;x.Parent=parent;return x
end
local function button(parent,text,fn,color)
 local x=Instance.new("TextButton");x.Size=UDim2.new(1,-12,0,44);x.BackgroundColor3=color or Color3.fromRGB(56,51,62)
 x.Text=text;x.TextColor3=parchment;x.TextSize=14;x.Font=Enum.Font.GothamBold;x.AutoButtonColor=true
 x.Parent=parent;corner(x,5);x.Activated:Connect(fn);return x
end
-- 화면 구성 · 작은 명패와 접히는 가족 수첩. 이동 중 중앙 시야는 비운다.
local header=Instance.new("Frame");header.Name="ManorNameplate";header.Size=UDim2.new(1,-174,0,46);header.Position=UDim2.fromOffset(10,6)
header.BackgroundColor3=ink;header.BackgroundTransparency=.18;header.Parent=gui;corner(header)
local headerLimit=Instance.new("UISizeConstraint");headerLimit.MaxSize=Vector2.new(206,46);headerLimit.Parent=header
local title=label(header,"MIDNIGHT ESCAPE",22,15);title.Position=UDim2.fromOffset(10,2);title.AutoLocalize=false
local status=label(header,"괴물 가족의 저택",18,10);status.Position=UDim2.fromOffset(10,25)
local commands=Instance.new("Frame");commands.Name="ManorCommands";commands.AnchorPoint=Vector2.new(1,0)
commands.Position=UDim2.new(1,-10,0,6);commands.Size=UDim2.fromOffset(144,44);commands.BackgroundTransparency=1;commands.Parent=gui
local nav=Instance.new("Frame");nav.Name="FamilyNotebook";nav.AnchorPoint=Vector2.new(1,0);nav.Position=UDim2.new(1,-10,0,58)
nav.Size=UDim2.new(1,-20,0,60);nav.BackgroundColor3=ink;nav.BackgroundTransparency=.04;nav.Visible=false;nav.Parent=gui;corner(nav,5)
local max=Instance.new("UISizeConstraint");max.MaxSize=Vector2.new(360,60);max.Parent=nav
local grid=Instance.new("UIGridLayout");grid.CellSize=UDim2.new(1/5,-4,1,0);grid.CellPadding=UDim2.fromOffset(5,0);grid.Parent=nav
local panel=Instance.new("Frame");panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.52)
panel.Size=UDim2.new(1,-28,1,-74);panel.BackgroundColor3=Color3.fromRGB(29,24,25);panel.Visible=false;panel.Parent=gui;corner(panel,10)
local limit=Instance.new("UISizeConstraint");limit.MaxSize=Vector2.new(460,550);limit.Parent=panel
local panelTitle=label(panel,"",38,20);panelTitle.Position=UDim2.fromOffset(14,8);panelTitle.Size=UDim2.new(1,-85,0,38)
local close=button(panel,"×",function()activeMenu=nil;panel.Visible=false end);close.Size=UDim2.fromOffset(42,38);close.Position=UDim2.new(1,-52,0,8)
local body=Instance.new("ScrollingFrame");body.Position=UDim2.fromOffset(12,56);body.Size=UDim2.new(1,-20,1,-68)
body.BackgroundTransparency=1;body.BorderSizePixel=0;body.ScrollBarThickness=3;body.AutomaticCanvasSize=Enum.AutomaticSize.Y;body.CanvasSize=UDim2.new();body.Parent=panel
local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,8);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=body
local function clear()for _,x in ipairs(body:GetChildren())do if x~=layout then x:Destroy()end end end
local function progress()
 local r={};for id,n in string.gmatch(tostring(p:GetAttribute("GhostProgress")or""),"([^:,]+):(%d+)")do r[id]=tonumber(n)or 0 end;return r
end
local function owned(id)
 return string.find(","..tostring(p:GetAttribute("OwnedCosmetics")or"DEFAULT")..",",","..id..",",1,true)~=nil
end
local open
local function send(action,value)remote:FireServer(action,value)end
local function openStory(item,stage)
 clear();panelTitle.Text=item.Name
 label(body,(item.Origin or"저택의 손님").." · "..(stage==3 and"기록 완성"or("기록 "..stage.."/3")),34,13)
 local stories=Stories[item.Id]or{"아직 수집된 기록이 없다."}
 for i=1,3 do
  label(body,i<=stage and(({"흔적","목격","사연"})[i].."\n"..tostring(stories[i]or"기록 정리 중"))or("봉인된 기록 "..i.." · 현장에서 더 목격하면 열린다"),86,14)
 end
 button(body,"도감으로",function()open("BOOK")end)
end
open=function(key)
 activeMenu=key;notebookOpen=false;nav.Visible=false;panel.Visible=true;clear();body.CanvasPosition=Vector2.zero
 if key=="PLAY"then
  panelTitle.Text="오늘 밤의 출정"
  local inRoom=p:GetAttribute("RoomServer")==true
  local waiting=p:GetAttribute("RoomState")=="ROOM_WAITING"
  if inRoom then
   panelTitle.Text="출정 대기실"
   label(body,string.format("초대 코드 %s\n%s · 참가 %d/%d명",p:GetAttribute("RoomCode")or"------",p:GetAttribute("RoomSelectedMapName")or"학교",p:GetAttribute("RoomMemberCount")or 1,p:GetAttribute("RoomMaxPlayers")or 8),64,15)
   if waiting and p:GetAttribute("RoomIsHost")==true and p:GetAttribute("RoomAutoStart")~=true then
    button(body,"친구 준비 완료 · 출정 시작",function()send(C.Actions.START_ROOM)end,Color3.fromRGB(107,56,64))
   else
    label(body,p:GetAttribute("RoomAutoStart")==true and"참가자 연결 후 곧 출정해."or"방장이 출정을 시작할 때까지 기다려줘.",48,13)
   end
   if waiting then button(body,"방 나가기 · 저택으로",function()send(C.Actions.LEAVE_ROOM)end)end
  end
  local preference=p:GetAttribute("MonsterPreference")=="MONSTER"and"몬스터"or"인간"
  label(body,"현재 모습 · "..preference.."   |   혼자서도 AI와 플레이",36,13)
  button(body,"인간으로 준비",function()send(C.Actions.PREFER_SURVIVOR)end)
  button(body,"몬스터로 준비",function()send(C.Actions.PREFER_MONSTER)end)
  if not inRoom then
  for _,map in ipairs(C.Maps)do
   local chosen=(p:GetAttribute("SelectedLobbyMap")or"SCHOOL")==map.Id
   button(body,(chosen and"✓  "or"    ")..map.Name,function()send(C.Actions.SELECT_MAP,map.Id)end,chosen and Color3.fromRGB(63,88,81)or nil)
  end
  button(body,"1인 플레이 · 빈자리는 AI",function()send(C.Actions.MANOR_SOLO);panel.Visible=false end,Color3.fromRGB(107,56,64))
  button(body,"대전 참가 · 공개 경기",function()send(C.Actions.QUICK_JOIN_PUBLIC);panel.Visible=false end,Color3.fromRGB(70,81,105))
  button(body,"친구 경기 만들기",function()send(C.Actions.CREATE_ROOM,"FRIENDS");panel.Visible=false end)
  button(body,"초대 코드로 참가",function()open("CODE")end)
  end
 elseif key=="CODE"then
  panelTitle.Text="초대장 번호"
  local input=Instance.new("TextBox");input.Size=UDim2.new(1,-12,0,50);input.PlaceholderText="6자리 방 코드";input.Text="";input.ClearTextOnFocus=false
  input.TextSize=22;input.TextColor3=ink;input.BackgroundColor3=parchment;input.Parent=body;corner(input)
  button(body,"참가",function()send(C.Actions.JOIN_ROOM_CODE,input.Text)end)
 elseif key=="BOOK"then
  panelTitle.Text="기록관의 괴담 도감"
  local stages=progress()
  label(body,string.format("발견 %d / %d · 완성 %d\n현장 목격 → 흔적 → 사연 · 완성한 기록은 저택에 남는다",p:GetAttribute("GhostSeenCount")or 0,#C.GhostCatalog,p:GetAttribute("GhostCompleted")or 0),52,13)
  for _,item in ipairs(C.GhostCatalog)do
   local stage=stages[item.Id]or 0
   button(body,(stage==0 and"◇ "or stage==3 and"◆ "or"◈ ")..item.Name.."   "..stage.."/3",function()openStory(item,stage)end)
  end
  label(body,"플레이 가능한 몬스터의 이야기",34,15)
  for _,item in ipairs(C.MonsterForms)do
   local unlocked=(p:GetAttribute("MonsterXP")or 0)>=(item.UnlockXP or 0)
   button(body,item.Name..(unlocked and" · 이야기"or" · 봉인"),function()openStory(item,unlocked and 3 or 0)end)
  end
 elseif key=="DRESS"or key=="SHOP"then
  panelTitle.Text=key=="DRESS"and"벨라의 의상실"or"벨라의 상점"
  label(body,string.format("보유 %d 코인 · 인간과 몬스터 공용 장식",p:GetAttribute("Coins")or 0),36,13)
  if key=="DRESS"then
   label(body,"선택한 귀신으로 저택을 돌아다녀. 경기에서 변신하면 같은 귀신을 사용해.",60,13)
   button(body,"인간 모습"..(p:GetAttribute("LobbyAppearance")~="MONSTER"and" · 선택 중"or""),function()send(C.Actions.SELECT_LOBBY_FORM,"SURVIVOR")end)
   for _,form in ipairs(C.MonsterForms)do
    local unlocked=(p:GetAttribute("MonsterXP")or 0)>=(form.UnlockXP or 0)
    local selected=p:GetAttribute("LobbyAppearance")=="MONSTER"and p:GetAttribute("MonsterForm")==form.Id
    local choose=button(body,form.Name..(selected and" · 선택 중"or unlocked and" · 선택"or" · 잠김"),function()
     if unlocked then send(C.Actions.SELECT_LOBBY_FORM,form.Id)end
    end)
    choose.Active=unlocked;choose.AutoButtonColor=unlocked
   end
   for _,form in ipairs(C.HumanForms or{})do
    if form.Id==p:GetAttribute("HumanForm")then label(body,"인간 직업 · "..form.Name,32,13);break end
   end
   button(body,"다음 인간 직업",function()send(C.Actions.NEXT_HUMAN)end)
   button(body,"벨라의 상점",function()open("SHOP")end)
  end
  for _,item in ipairs(C.Cosmetics)do
   if key=="SHOP"or owned(item.Id)then
    local equipped=p:GetAttribute("EquippedCosmetic")==item.Id
    local text=item.Name..(equipped and" · 착용 중"or owned(item.Id)and" · 착용"or(" · "..item.Price.." 코인"))
    button(body,text,function()send(owned(item.Id)and C.Actions.EQUIP_COSMETIC or C.Actions.BUY_COSMETIC,item.Id)end)
   end
  end
 elseif key=="EVENT"then
  panelTitle.Text="저택의 초대장"
  label(body,"기록관의 첫 부탁",34,18)
  label(body,"학교·폐병원·폐놀이공원에서 괴담을 찾아봐. 같은 괴담을 여러 판에서 목격하면 사연이 완성돼.",82,14)
  label(body,string.format("세계 괴담 완성  %d / %d\n도감 전체 완성 보상: 기존 괴담 계약서 1장",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog),64,14)
  button(body,"괴담 도감 확인",function()open("BOOK")end)
  button(body,"집사에게 인사 · 기묘한 사고",function()send(C.Actions.MANOR_GAG);panel.Visible=false end)
 elseif key=="RECORD"then
  panelTitle.Text="괴담 수집 랭킹"
  send(C.Actions.MANOR_RANK)
  label(body,p.DisplayName.."의 저택",38,18)
  label(body,tostring(p:GetAttribute("GhostTitle")or"괴담 견습생"),40,17)
  label(body,string.format("괴담 발견  %d\n괴담 완성  %d\n현장 문서  %d\n몬스터 경험  %d",p:GetAttribute("GhostSeenCount")or 0,p:GetAttribute("GhostCompleted")or 0,p:GetAttribute("LoreCount")or 0,p:GetAttribute("MonsterXP")or 0),140,16)
 end
end
local depart=button(commands,"출정",function()open("PLAY")end,Color3.fromRGB(81,42,47))
depart.Size=UDim2.fromOffset(64,44)
local notebook=button(commands,"수첩",function()
 notebookOpen=not notebookOpen;nav.Visible=notebookOpen
 if notebookOpen then activeMenu=nil;panel.Visible=false end
end)
notebook.Size=UDim2.fromOffset(74,44);notebook.Position=UDim2.fromOffset(70,0)
-- 무료 Lucide 아이콘: 원본 ISC/MIT 라이선스를 모델 폴더에 보관.
for index,entry in ipairs({{"PLAY","현관"},{"BOOK","도감"},{"DRESS","옷장"},{"EVENT","초대장"},{"RECORD","기록"}})do
 local item=button(nav,"",function()if activeMenu==entry[1]and panel.Visible then activeMenu=nil;panel.Visible=false else open(entry[1])end end,entry[1]=="PLAY"and Color3.fromRGB(85,58,52)or ink)
 local icon=Instance.new("ImageLabel");icon.BackgroundTransparency=1;icon.Image="rbxassetid://"..tostring(Assets.IconsId or 0)
 icon.ImageRectOffset=Vector2.new((index-1)*64,0);icon.ImageRectSize=Vector2.new(64,64);icon.Size=UDim2.fromOffset(24,24);icon.AnchorPoint=Vector2.new(.5,0);icon.Position=UDim2.new(.5,0,0,6);icon.Parent=item
 local text=label(item,entry[2],24,12);text.Size=UDim2.new(1,0,0,24);text.Position=UDim2.fromOffset(0,32);text.TextXAlignment=Enum.TextXAlignment.Center
end
local toast=label(gui,"",70,14);toast.AnchorPoint=Vector2.new(.5,1);toast.Position=UDim2.new(.5,0,1,-92)
toast.Size=UDim2.new(.66,0,0,62);toast.BackgroundColor3=ink;toast.BackgroundTransparency=.08;toast.Visible=false;corner(toast)
local toastLimit=Instance.new("UISizeConstraint");toastLimit.MaxSize=Vector2.new(520,70);toastLimit.Parent=toast
local serial=0
local function notify(text)
 serial+=1;local n=serial;toast.Text="  "..text;toast.Visible=true
 task.delay(4.5,function()if serial==n then toast.Visible=false end end)
end
remote.OnClientEvent:Connect(function(kind,value)
 if kind=="MANOR_MENU"then open(value)
 elseif kind=="MANOR_RANKING"and activeMenu=="RECORD"then
  if value==false then label(body,"랭킹을 가져오지 못했어. 잠시 후 다시 확인해줘.",48,12);return end
  if #value==0 then label(body,"첫 기록을 남겨봐. 아직 등록된 수집 기록이 없어.",48,13)end
  for i,row in ipairs(value)do label(body,string.format("%d. %s  ·  완성 %d / 발견 %d",i,row.Name,row.Complete,row.Seen),42,13)end
 end
end)
p:GetAttributeChangedSignal("LobbyStoryEvent"):Connect(function()
 local speaker,text=string.match(tostring(p:GetAttribute("LobbyStoryEvent")or""),"^([^|]+)|([^|]+)|")
 if speaker then notify(speaker.."\n"..text)end
end)
p:GetAttributeChangedSignal("RoomFeedback"):Connect(function()local text=tostring(p:GetAttribute("RoomFeedback")or"");if text~=""then notify(text:gsub("^[^:]+:",""))end end)
p:GetAttributeChangedSignal("CosmeticFeedback"):Connect(function()
 local code=tostring(p:GetAttribute("CosmeticFeedback")or""):match("^[^:]+")
 notify(code=="NEED_COINS"and"코인이 부족해"or code=="PURCHASED"and"구매 완료 · 의상실에서 착용할 수 있어"or code=="EQUIPPED"and"장식 착용 완료"or"소지품을 확인했어")
end)
local refreshQueued=false
for _,key in ipairs({"MonsterPreference","MonsterForm","HumanForm","LobbyAppearance","SelectedLobbyMap","OwnedCosmetics","EquippedCosmetic","Coins","MonsterXP","RoomServer","RoomState","RoomIsHost","RoomAutoStart","RoomCode","RoomMemberCount","RoomSelectedMapName"})do
 p:GetAttributeChangedSignal(key):Connect(function()
  if refreshQueued then return end;refreshQueued=true
  task.defer(function()
   refreshQueued=false
   if activeMenu and panel.Visible then local position=body.CanvasPosition;open(activeMenu);body.CanvasPosition=position end
  end)
 end)
end
-- 접속 메인: 입장 버튼을 누르면 기본 카메라/조작으로 정확히 복귀한다.
local entered=false
local welcome=Instance.new("Frame");welcome.Size=UDim2.fromScale(1,1);welcome.BackgroundColor3=ink;welcome.BackgroundTransparency=.58;welcome.Parent=gui
local card=Instance.new("Frame");card.AnchorPoint=Vector2.new(.5,.5);card.Position=UDim2.fromScale(.5,.46);card.Size=UDim2.new(1,-48,0,224);card.BackgroundColor3=ink;card.BackgroundTransparency=.06;card.Parent=welcome;corner(card,5)
local cardLimit=Instance.new("UISizeConstraint");cardLimit.MaxSize=Vector2.new(430,224);cardLimit.Parent=card
local mainTitle=label(card,"MIDNIGHT ESCAPE",54,26);mainTitle.Size=UDim2.new(1,-24,0,54);mainTitle.Position=UDim2.fromOffset(12,14);mainTitle.TextXAlignment=Enum.TextXAlignment.Center;mainTitle.AutoLocalize=false
local subtitle=label(card,"심야 대탈출 · 괴물 가족의 저택",38,14);subtitle.Position=UDim2.fromOffset(12,65);subtitle.TextXAlignment=Enum.TextXAlignment.Center
local greeting=label(card,"집사가 문을 열어두었어.\n이 집에서는 기이한 일도 일상이야.",54,13);greeting.Position=UDim2.fromOffset(12,105);greeting.TextXAlignment=Enum.TextXAlignment.Center
local controls=nil
local mainCameraActive=false
local function releaseMainCamera()
 if not mainCameraActive then return end
 mainCameraActive=false
 local camera=workspace.CurrentCamera;local humanoid=p.Character and p.Character:FindFirstChildOfClass("Humanoid")
 if camera then camera.CameraType=Enum.CameraType.Custom;if humanoid then camera.CameraSubject=humanoid end end
 if controls then controls:Enable()end
 local root=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 if camera and root then camera.CFrame=CFrame.lookAt(root.Position+Vector3.new(0,4.5,9),root.Position+Vector3.new(0,2,0))end
end
task.spawn(function()
 local scripts=p:WaitForChild("PlayerScripts");local module=scripts:WaitForChild("PlayerModule",10)
 if module then local ok,value=pcall(require,module);if ok then controls=value:GetControls()end end
end)
local visibility
local enter=button(card,"저택 들어가기",function()
 entered=true
 releaseMainCamera()
 if visibility then visibility()end
end,Color3.fromRGB(99,77,53));enter.Position=UDim2.fromOffset(18,166);enter.Size=UDim2.new(1,-36,0,46)
local oldLighting=nil
local atmosphere=nil
local oldAtmosphere=nil
local oldZoom=nil
local grade=Instance.new("ColorCorrectionEffect");grade.Name="ManorColor";grade.TintColor=Color3.fromRGB(255,255,255)
grade.Brightness=.04;grade.Contrast=0;grade.Saturation=0;grade.Enabled=false;grade.Parent=Lighting
local bloom=Instance.new("BloomEffect");bloom.Name="ManorCandleBloom";bloom.Intensity=.12;bloom.Size=12;bloom.Threshold=1.8;bloom.Enabled=false;bloom.Parent=Lighting
visibility=function()
 local round=tostring(p:GetAttribute("RoundState")or"")
 local visible=p:GetAttribute("LobbyClientReady")==true and workspace:GetAttribute("PhysicalLobbyReady")==true and p:GetAttribute("PersonalLobbyOwner")==p.UserId and round~="RUNNING"and round~="SPECTATING"and not round:match("^RESULT_")
 gui.Enabled=visible
 if p:GetAttribute("RoomServer")==true then entered=true;releaseMainCamera()end
 welcome.Visible=visible and not entered;nav.Visible=visible and entered and notebookOpen;header.Visible=visible and entered;commands.Visible=visible and entered
 grade.Enabled=visible;bloom.Enabled=visible
 if not visible then panel.Visible=false;activeMenu=nil;notebookOpen=false;releaseMainCamera()end
 status.Text=string.format("괴담 %d/%d  ·  %d 코인",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog,p:GetAttribute("Coins")or 0)
 if p:GetAttribute("RoomServer")==true then
  status.Text=round=="INTERMISSION"and string.format("출정까지 %d초",p:GetAttribute("TimeLeft")or 0)or string.format("초대 %s · 참가 %d명",p:GetAttribute("RoomCode")or"------",p:GetAttribute("RoomMemberCount")or 1)
 end
 if visible and not oldLighting then
  oldLighting={ClockTime=Lighting.ClockTime,Brightness=Lighting.Brightness,Ambient=Lighting.Ambient,OutdoorAmbient=Lighting.OutdoorAmbient,FogStart=Lighting.FogStart,FogEnd=Lighting.FogEnd,ExposureCompensation=Lighting.ExposureCompensation,EnvironmentDiffuseScale=Lighting.EnvironmentDiffuseScale,EnvironmentSpecularScale=Lighting.EnvironmentSpecularScale}
  -- 저택 전체가 환하게 보이는 기본광. 검은 의복·벽지·구석을 밝기로 숨기지 않는다.
  Lighting.ClockTime=0.35;Lighting.Brightness=2.5;Lighting.Ambient=Color3.fromRGB(190,185,190);Lighting.OutdoorAmbient=Color3.fromRGB(185,195,210)
  Lighting.ExposureCompensation=.4;Lighting.EnvironmentDiffuseScale=1;Lighting.EnvironmentSpecularScale=.35;Lighting.FogStart=170;Lighting.FogEnd=400
  oldZoom={min=p.CameraMinZoomDistance,max=p.CameraMaxZoomDistance};p.CameraMinZoomDistance=5;p.CameraMaxZoomDistance=18
  atmosphere=Lighting:FindFirstChildOfClass("Atmosphere")
  if atmosphere then oldAtmosphere={Density=atmosphere.Density,Haze=atmosphere.Haze};atmosphere.Density=.035;atmosphere.Haze=.15 end
 elseif not visible and oldLighting then
  for k,v in pairs(oldLighting)do Lighting[k]=v end;oldLighting=nil
  if oldZoom then p.CameraMinZoomDistance=oldZoom.min;p.CameraMaxZoomDistance=oldZoom.max;oldZoom=nil end
  if atmosphere and atmosphere.Parent and oldAtmosphere then for k,v in pairs(oldAtmosphere)do atmosphere[k]=v end end
  atmosphere=nil;oldAtmosphere=nil
 end
end
p.AttributeChanged:Connect(visibility);workspace:GetAttributeChangedSignal("PhysicalLobbyReady"):Connect(visibility);visibility()
-- 실제 입장 위치가 보이는 실내 메인 카메라. 입장 후에는 기본 카메라/터치 조작을 쓴다.
RunService.RenderStepped:Connect(function()
 if not gui.Enabled or entered then return end
 local x=p:GetAttribute("ManorOriginX");local camera=workspace.CurrentCamera
 if x and camera then
  mainCameraActive=true
  camera.CameraType=Enum.CameraType.Scriptable
  camera.CFrame=CFrame.lookAt(Vector3.new(x,9,264),Vector3.new(x,7,242))
  if controls then controls:Disable()end
 end
end)

-- 생활 연출 · 거울의 시선, 시계추, 막내의 숨결, 촛불. 서버 물리와 분리한다.
local animatedScene=nil
local details={}
local elapsed=0
RunService.Heartbeat:Connect(function(dt)
 elapsed+=dt;if elapsed<.05 or not gui.Enabled then return end;elapsed=0
 local root=workspace:FindFirstChild("MidnightLobby")
 local room=root and root:FindFirstChild("PersonalManor_"..p.UserId)
 local scene=room and room:FindFirstChild("ManorScene")
 if scene~=animatedScene then
  animatedScene=scene;details={}
  if scene then for _,mesh in ipairs(scene:GetDescendants())do
   if mesh:IsA("BasePart")and(mesh.Name:match("^MirrorPupil")or mesh.Name:match("^ClockPendulum")or mesh.Name:match("^LittleGhost")or mesh.Name:match("^HearthFlame"))then
    table.insert(details,{part=mesh,home=mesh.CFrame,size=mesh.Size})
   end
  end end
 end
 local now=workspace:GetServerTimeNow();local playerRoot=p.Character and p.Character:FindFirstChild("HumanoidRootPart")
 for _,row in ipairs(details)do
  local mesh=row.part
  if mesh.Parent then
   if mesh.Name:match("^MirrorPupil")and playerRoot then
    local delta=playerRoot.Position-row.home.Position
    mesh.CFrame=row.home+Vector3.new(math.clamp(delta.X*.022,-.38,.38),math.clamp((delta.Y+10)*.018,-.13,.13),0)
   elseif mesh.Name:match("^ClockPendulum")then
    local pivot=Vector3.new((p:GetAttribute("ManorOriginX")or 0)-9,6.7,230.85)
    mesh.CFrame=CFrame.new(pivot)*CFrame.Angles(0,0,math.sin(now*2.2)*.12)*CFrame.new(-pivot)*row.home
   elseif mesh.Name:match("^LittleGhost")then mesh.CFrame=row.home+Vector3.new(0,math.sin(now*1.6)*.18,0)
   elseif mesh.Name:match("^HearthFlame")then mesh.Size=Vector3.new(row.size.X,row.size.Y*(1+math.sin(now*7+row.home.Position.X)*.07),row.size.Z)end
  end
 end
end)
