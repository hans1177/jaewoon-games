-- 파일명: roblox-games/horror-escape-room/client/ManorLobby.client.luau
-- 임포트 · 저택 전용 화면, 실제 전투 HUD는 Game.client.luau에 유지.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local RunService=game:GetService("RunService")
local Lighting=game:GetService("Lighting")
local p=Players.LocalPlayer
local C=require(RS.Shared.GameConfig)
local Assets=require(RS.Shared.ManorAssets)
local Stories=require(RS.Shared.MonsterStories)
local remote=RS:WaitForChild(C.RemoteName)
local gui=Instance.new("ScreenGui");gui.Name="PersonalManorUI";gui.ResetOnSpawn=false;gui.DisplayOrder=15
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets;gui.Parent=p:WaitForChild("PlayerGui")
local ink=Color3.fromRGB(29,31,39)
local parchment=Color3.fromRGB(235,218,182)
local accent=Color3.fromRGB(150,104,71)
local activeMenu=nil
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
local header=Instance.new("Frame");header.Size=UDim2.fromOffset(276,68);header.Position=UDim2.fromOffset(16,14)
header.BackgroundColor3=ink;header.BackgroundTransparency=.12;header.Parent=gui;corner(header)
local title=label(header,"MIDNIGHT ESCAPE",30,19);title.Position=UDim2.fromOffset(12,5);title.AutoLocalize=false
local status=label(header,"나만의 저택",24,11);status.Position=UDim2.fromOffset(12,38)
local nav=Instance.new("Frame");nav.AnchorPoint=Vector2.new(.5,1);nav.Position=UDim2.new(.5,0,1,-14)
nav.Size=UDim2.new(1,-24,0,96);nav.BackgroundTransparency=1;nav.Parent=gui
local max=Instance.new("UISizeConstraint");max.MaxSize=Vector2.new(600,96);max.Parent=nav
nav.Size=UDim2.new(1,-24,0,72)
local grid=Instance.new("UIGridLayout");grid.CellSize=UDim2.new(1/5,-5,0,66);grid.CellPadding=UDim2.fromOffset(6,0);grid.Parent=nav
local panel=Instance.new("Frame");panel.AnchorPoint=Vector2.new(.5,.5);panel.Position=UDim2.fromScale(.5,.47)
panel.Size=UDim2.new(1,-32,.72,0);panel.BackgroundColor3=ink;panel.Visible=false;panel.Parent=gui;corner(panel,10)
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
 activeMenu=key;panel.Visible=true;clear();body.CanvasPosition=Vector2.zero
 if key=="PLAY"then
  panelTitle.Text="오늘 밤의 출정"
  local preference=p:GetAttribute("MonsterPreference")=="MONSTER"and"몬스터"or"인간"
  label(body,"현재 모습 · "..preference.."   |   혼자서도 AI와 플레이",36,13)
  button(body,"인간으로 준비",function()send(C.Actions.PREFER_SURVIVOR)end)
  button(body,"몬스터로 준비",function()send(C.Actions.PREFER_MONSTER)end)
  for _,map in ipairs(C.Maps)do
   local chosen=(p:GetAttribute("SelectedLobbyMap")or"SCHOOL")==map.Id
   button(body,(chosen and"✓  "or"    ")..map.Name,function()send(C.Actions.SELECT_MAP,map.Id)end,chosen and Color3.fromRGB(63,88,81)or nil)
  end
  button(body,"1인 플레이 · 빈자리는 AI",function()send(C.Actions.MANOR_SOLO);panel.Visible=false end,Color3.fromRGB(107,56,64))
  button(body,"대전 참가 · 공개 경기",function()send(C.Actions.QUICK_JOIN_PUBLIC);panel.Visible=false end,Color3.fromRGB(70,81,105))
  button(body,"친구 경기 만들기",function()send(C.Actions.CREATE_ROOM,"FRIENDS");panel.Visible=false end)
  button(body,"초대 코드로 참가",function()open("CODE")end)
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
  panelTitle.Text=key=="DRESS"and"장의사의 의상실"or"장의사의 상점"
  label(body,string.format("보유 %d 코인 · 인간과 몬스터 공용 장식",p:GetAttribute("Coins")or 0),36,13)
  if key=="DRESS"then
   label(body,"선택한 귀신으로 저택을 돌아다녀. 경기에서 변신하면 같은 귀신을 사용해.",60,13)
   button(body,"인간 모습",function()send(C.Actions.SELECT_LOBBY_FORM,"SURVIVOR")end)
   for _,form in ipairs(C.MonsterForms)do
    local unlocked=(p:GetAttribute("MonsterXP")or 0)>=(form.UnlockXP or 0)
    local selected=p:GetAttribute("MonsterForm")==form.Id
    local choose=button(body,form.Name..(selected and" · 선택 중"or unlocked and" · 선택"or" · 잠김"),function()
     if unlocked then send(C.Actions.SELECT_LOBBY_FORM,form.Id)end
    end)
    choose.Active=unlocked;choose.AutoButtonColor=unlocked
   end
   button(body,"다음 인간 직업",function()send(C.Actions.NEXT_HUMAN)end)
   button(body,"장의사의 상점",function()open("SHOP")end)
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
-- 무료 Lucide 아이콘: 원본 ISC/MIT 라이선스를 모델 폴더에 보관.
for index,entry in ipairs({{"PLAY","현관"},{"BOOK","도감"},{"DRESS","옷장"},{"EVENT","초대장"},{"RECORD","기록"}})do
 local item=button(nav,"",function()if activeMenu==entry[1]and panel.Visible then activeMenu=nil;panel.Visible=false else open(entry[1])end end,entry[1]=="PLAY"and Color3.fromRGB(85,58,52)or ink)
 local icon=Instance.new("ImageLabel");icon.BackgroundTransparency=1;icon.Image="rbxassetid://"..tostring(Assets.IconsId or 0)
 icon.ImageRectOffset=Vector2.new((index-1)*64,0);icon.ImageRectSize=Vector2.new(64,64);icon.Size=UDim2.fromOffset(30,30);icon.AnchorPoint=Vector2.new(.5,0);icon.Position=UDim2.new(.5,0,0,4);icon.Parent=item
 local text=label(item,entry[2],24,12);text.Size=UDim2.new(1,0,0,24);text.Position=UDim2.fromOffset(0,36);text.TextXAlignment=Enum.TextXAlignment.Center
end
local toast=label(gui,"",70,14);toast.AnchorPoint=Vector2.new(.5,1);toast.Position=UDim2.new(.5,0,1,-120)
toast.Size=UDim2.new(1,-36,0,70);toast.BackgroundColor3=ink;toast.BackgroundTransparency=.08;toast.Visible=false;corner(toast)
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
for _,key in ipairs({"MonsterPreference","MonsterForm","LobbyAppearance","SelectedLobbyMap","OwnedCosmetics","EquippedCosmetic"})do
 p:GetAttributeChangedSignal(key):Connect(function()if activeMenu and panel.Visible then open(activeMenu)end end)
end
-- 접속 메인: 입장 버튼을 누르면 기본 카메라/조작으로 정확히 복귀한다.
local entered=false
local welcome=Instance.new("Frame");welcome.Size=UDim2.fromScale(1,1);welcome.BackgroundColor3=ink;welcome.BackgroundTransparency=.58;welcome.Parent=gui
local card=Instance.new("Frame");card.AnchorPoint=Vector2.new(.5,.5);card.Position=UDim2.fromScale(.5,.46);card.Size=UDim2.new(1,-48,0,278);card.BackgroundColor3=ink;card.BackgroundTransparency=.06;card.Parent=welcome;corner(card,5)
local cardLimit=Instance.new("UISizeConstraint");cardLimit.MaxSize=Vector2.new(430,278);cardLimit.Parent=card
local mainTitle=label(card,"MIDNIGHT ESCAPE",54,26);mainTitle.Size=UDim2.new(1,-24,0,54);mainTitle.Position=UDim2.fromOffset(12,34);mainTitle.TextXAlignment=Enum.TextXAlignment.Center;mainTitle.AutoLocalize=false
local subtitle=label(card,"심야 대탈출 · 괴물 가족의 저택",38,14);subtitle.Position=UDim2.fromOffset(12,93);subtitle.TextXAlignment=Enum.TextXAlignment.Center
local greeting=label(card,"집사가 문을 열어두었어.\n이 집에서는 기이한 일도 일상이야.",54,13);greeting.Position=UDim2.fromOffset(12,134);greeting.TextXAlignment=Enum.TextXAlignment.Center
local controls=nil
local mainCameraActive=false
local function releaseMainCamera()
 if not mainCameraActive then return end
 mainCameraActive=false
 local camera=workspace.CurrentCamera;local humanoid=p.Character and p.Character:FindFirstChildOfClass("Humanoid")
 if camera then camera.CameraType=Enum.CameraType.Custom;if humanoid then camera.CameraSubject=humanoid end end
 if controls then controls:Enable()end
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
end,Color3.fromRGB(99,77,53));enter.Position=UDim2.fromOffset(18,212);enter.Size=UDim2.new(1,-36,0,46)
local oldLighting=nil
visibility=function()
 local round=tostring(p:GetAttribute("RoundState")or"")
 local visible=p:GetAttribute("LobbyClientReady")==true and workspace:GetAttribute("PhysicalLobbyReady")==true and p:GetAttribute("PersonalLobbyOwner")==p.UserId and round~="RUNNING"and round~="SPECTATING"and not round:match("^RESULT_")
 gui.Enabled=visible
 welcome.Visible=visible and not entered;nav.Visible=visible and entered;header.Visible=visible and entered
 if not visible then panel.Visible=false;activeMenu=nil;releaseMainCamera()end
 status.Text=string.format("나만의 저택 · 괴담 %d/%d · %d 코인",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog,p:GetAttribute("Coins")or 0)
 if visible and not oldLighting then
  oldLighting={ClockTime=Lighting.ClockTime,Brightness=Lighting.Brightness,Ambient=Lighting.Ambient,OutdoorAmbient=Lighting.OutdoorAmbient,FogStart=Lighting.FogStart,FogEnd=Lighting.FogEnd}
  Lighting.ClockTime=19.6;Lighting.Brightness=2.6;Lighting.Ambient=Color3.fromRGB(91,95,109);Lighting.OutdoorAmbient=Color3.fromRGB(82,106,116)
  Lighting.FogStart=105;Lighting.FogEnd=190
 elseif not visible and oldLighting then for k,v in pairs(oldLighting)do Lighting[k]=v end;oldLighting=nil end
end
p.AttributeChanged:Connect(visibility);workspace:GetAttributeChangedSignal("PhysicalLobbyReady"):Connect(visibility);visibility()
-- 입체 소품 뒤의 평면 배경은 카메라 이동으로 시차가 생긴다. 화면을 덮는 안개는 쓰지 않는다.
RunService.RenderStepped:Connect(function()
 if not gui.Enabled or entered then return end
 local x=p:GetAttribute("ManorOriginX");local camera=workspace.CurrentCamera
 if x and camera then
  mainCameraActive=true
  camera.CameraType=Enum.CameraType.Scriptable
  camera.CFrame=CFrame.lookAt(Vector3.new(x+44,26,343),Vector3.new(x,13,257))
  if controls then controls:Disable()end
 end
end)
