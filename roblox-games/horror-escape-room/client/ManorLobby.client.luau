-- 파일명: roblox-games/horror-escape-room/client/ManorLobby.client.luau
-- 임포트 · 저택 전용 화면, 실제 전투 HUD는 Game.client.luau에 유지.
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local RunService=game:GetService("RunService")
local TweenService=game:GetService("TweenService")
local Lighting=game:GetService("Lighting")
local UserInputService=game:GetService("UserInputService")
local p=Players.LocalPlayer
local C=require(RS.Shared.GameConfig)
local Assets=require(RS.Shared.ManorAssets)
local Stories=require(RS.Shared.MonsterStories)
local remote=RS:WaitForChild(C.RemoteName)
local gui=Instance.new("ScreenGui");gui.Name="PersonalManorUI";gui.ResetOnSpawn=false;gui.DisplayOrder=15;gui.Enabled=false
gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling
gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
gui:SetAttribute("ArtbookId","horror-escape-room-2026-10-02-manor-rebuild")
gui:SetAttribute("ArtbookStyle","DARK_CARTOON_GOTHIC_HALLOWEEN")
gui:SetAttribute("UIAssetAtlasId",Assets.IconsId)
gui:SetAttribute("UIAssetSource","INTERNAL_MANOR_ICONS")
gui.Parent=p:WaitForChild("PlayerGui")
-- 아트북 팔레트: #141012 / #4C1826 / #DAC291 / #97713D / #E6D6B0 / #301B15.
local ink=Color3.fromRGB(20,16,18)
local parchment=Color3.fromRGB(218,194,145)
local ivory=Color3.fromRGB(230,214,176)
local wood=Color3.fromRGB(48,27,21)
local leather=Color3.fromRGB(35,18,31)
local brass=Color3.fromRGB(151,113,61)
local wine=Color3.fromRGB(76,24,38)
local purple=Color3.fromRGB(61,28,82)
local ember=Color3.fromRGB(211,72,22)
local activeMenu=nil
local activeStory=nil
local invitationCode=""
local rankingRows={}
local notebookOpen=false

local function frameStroke(parent,thickness,transparency)
 local line=Instance.new("UIStroke");line.ApplyStrokeMode=Enum.ApplyStrokeMode.Border;line.Color=brass
 line.Transparency=transparency or .10;line.Thickness=thickness or 2;line.Parent=parent;return line
end
local function corner(parent,n)
 local x=Instance.new("UICorner");x.CornerRadius=UDim.new(0,n or 1);x.Parent=parent
 frameStroke(parent,2,.10)
end
local function brassRule(parent,y)
 local rule=Instance.new("Frame");rule.BackgroundColor3=brass;rule.BackgroundTransparency=.18
 rule.BorderSizePixel=0;rule.Size=UDim2.new(1,-18,0,2);rule.Position=UDim2.new(0,9,0,y);rule.Parent=parent;return rule
end
local function gothicCorners(parent)
 for _,spec in ipairs({
  {0,7,0,7,45},{1,-7,0,7,45},{0,7,1,-7,45},{1,-7,1,-7,45}
 })do
  local mark=Instance.new("Frame");mark.Name="GothicCorner";mark.AnchorPoint=Vector2.new(.5,.5)
  mark.Position=UDim2.new(spec[1],spec[2],spec[3],spec[4]);mark.Size=UDim2.fromOffset(8,8)
  mark.BackgroundColor3=brass;mark.BackgroundTransparency=.08;mark.BorderSizePixel=0;mark.Rotation=spec[5];mark.Parent=parent
 end
end
local function label(parent,text,height,size,color)
 local x=Instance.new("TextLabel");x.BackgroundTransparency=1;x.Size=UDim2.new(1,-12,0,height or 32)
 x.Text=text;x.TextColor3=color or parchment;x.TextSize=size or 14;x.TextWrapped=true;x.Font=Enum.Font.Antique;x.AutomaticSize=Enum.AutomaticSize.Y
 x.TextXAlignment=Enum.TextXAlignment.Left;x.Parent=parent;return x
end
local function button(parent,text,fn,color)
 local x=Instance.new("TextButton");x.Size=UDim2.new(1,-12,0,54);x.BackgroundColor3=color or wood
 x.Text=text;x.TextColor3=ivory;x.TextSize=15;x.TextWrapped=true;x.Font=Enum.Font.Antique;x.AutoButtonColor=false
 x.Parent=parent;corner(x,1)
 local left=Instance.new("Frame");left.BackgroundColor3=brass;left.BackgroundTransparency=.08;left.BorderSizePixel=0
 left.Size=UDim2.fromOffset(3,38);left.Position=UDim2.new(0,6,.5,-19);left.Parent=x
 x.MouseEnter:Connect(function()if x.Active then x.BackgroundColor3=color or purple end end)
 x.MouseLeave:Connect(function()if x.Active then x.BackgroundColor3=color or wood end end)
 x.Activated:Connect(fn);return x
end

local function internalIcon(parent,index,size,position,tint)
 local icon=Instance.new("ImageLabel");icon.Name="InternalArtbookIcon";icon.BackgroundTransparency=1
 icon.Image="rbxassetid://"..tostring(Assets.IconsId or 0);icon.ImageRectOffset=Vector2.new((index or 0)*64,0);icon.ImageRectSize=Vector2.new(64,64)
 icon.Size=UDim2.fromOffset(size or 28,size or 28);icon.Position=position or UDim2.fromOffset(12,12);icon.ImageColor3=tint or ivory;icon.ZIndex=parent.ZIndex+1;icon.Parent=parent
 return icon
end
local function artbookButton(parent,text,subtitle,fn,color,iconIndex)
 local x=button(parent,"",fn,color);x.Name="ArtbookButton_"..tostring(text);x.Size=UDim2.new(1,-12,0,64)
 internalIcon(x,iconIndex or 0,30,UDim2.fromOffset(14,17),ivory)
 local title=label(x,text,24,15,ivory);title.Position=UDim2.fromOffset(54,7);title.Size=UDim2.new(1,-66,0,24);title.ZIndex=x.ZIndex+1
 local detail=label(x,subtitle or"",22,10,parchment);detail.Position=UDim2.fromOffset(54,32);detail.Size=UDim2.new(1,-66,0,22);detail.ZIndex=x.ZIndex+1
 gothicCorners(x)
 return x
end
local function ledgerRow(parent,leftText,rightText)
 local row=Instance.new("Frame");row.Size=UDim2.new(1,-12,0,42);row.BackgroundColor3=Color3.fromRGB(43,19,47);row.BorderSizePixel=0;row.Parent=parent
 frameStroke(row,1,.48)
 local left=label(row,leftText,36,13,ivory);left.Position=UDim2.fromOffset(10,3);left.Size=UDim2.new(.66,-12,0,36)
 local right=label(row,rightText or"",36,12,brass);right.AnchorPoint=Vector2.new(1,0);right.Position=UDim2.new(1,-9,0,3);right.Size=UDim2.new(.34,-8,0,36);right.TextXAlignment=Enum.TextXAlignment.Right
 return row
end
local mapDifficultyLabel={BEGINNER="입문",CHASE="추격",ADVANCED="고급"}
local mapIconIndex={SCHOOL=0,HOSPITAL=4,THEME_PARK=3}
local function mapPostcard(parent,map,chosen,fn)
 local x=button(parent,"",fn,chosen and wine or wood)
 x.Name="MapPostcard_"..tostring(map.Id);x.Size=UDim2.new(1,-12,0,72)
 local photo=Instance.new("Frame");photo.Name="FieldPhoto";photo.Position=UDim2.fromOffset(11,10);photo.Size=UDim2.fromOffset(50,50)
 photo.BackgroundColor3=parchment;photo.BackgroundTransparency=.04;photo.BorderSizePixel=0;photo.Parent=x;frameStroke(photo,1,.28)
 internalIcon(photo,mapIconIndex[map.Id]or 0,32,UDim2.fromOffset(9,9),ink)
 local pin=Instance.new("Frame");pin.Name="BrassPin";pin.AnchorPoint=Vector2.new(.5,.5);pin.Position=UDim2.new(0,57,0,13);pin.Size=UDim2.fromOffset(9,9)
 pin.BackgroundColor3=brass;pin.BorderSizePixel=0;pin.Parent=x
 local pinCorner=Instance.new("UICorner");pinCorner.CornerRadius=UDim.new(1,0);pinCorner.Parent=pin
 local name=label(x,map.Name,24,16,ivory);name.Position=UDim2.fromOffset(70,8);name.Size=UDim2.new(1,-142,0,24)
 local areas=table.concat(map.Areas or{}," · ")
 if #areas>26 then areas=string.sub(areas,1,26).."…"end
 local meta=(mapDifficultyLabel[map.Difficulty]or tostring(map.Difficulty or"")).." · "..areas
 local tag=label(x,meta,22,10,parchment);tag.Position=UDim2.fromOffset(70,37);tag.Size=UDim2.new(1,-88,0,22)
 local state=label(x,chosen and"선택됨"or"선택",22,10,chosen and ivory or brass);state.AnchorPoint=Vector2.new(1,0);state.Position=UDim2.new(1,-10,0,9);state.Size=UDim2.fromOffset(54,22);state.TextXAlignment=Enum.TextXAlignment.Right
 return x
end
-- 화면 구성 · 황동 명패, 가죽 책갈피, 좌측/하단 장부. 중앙 플레이 시야를 최대한 비운다.
local header=Instance.new("Frame");header.Name="ManorNameplate";header.Size=UDim2.fromOffset(238,56);header.Position=UDim2.fromOffset(10,6)
header.BackgroundColor3=wood;header.BackgroundTransparency=.01;header.Parent=gui;corner(header,1);brassRule(header,27);gothicCorners(header)
local title=label(header,"MIDNIGHT ESCAPE",23,15,ivory);title.Position=UDim2.fromOffset(11,2);title.AutoLocalize=false
local status=label(header,"괴물 가족의 저택",22,10,parchment);status.Position=UDim2.fromOffset(11,30);status.Size=UDim2.new(1,-22,0,22)

local commands=Instance.new("Frame");commands.Name="ManorCommands";commands.AnchorPoint=Vector2.new(1,0)
commands.Position=UDim2.new(1,-10,0,6);commands.Size=UDim2.fromOffset(162,54);commands.BackgroundTransparency=1;commands.Parent=gui

local nav=Instance.new("Frame");nav.Name="FamilyNotebook";nav.AnchorPoint=Vector2.new(1,0);nav.Position=UDim2.new(1,-10,0,62)
nav.Size=UDim2.fromOffset(84,274);nav.BackgroundColor3=leather;nav.BackgroundTransparency=.01;nav.Visible=false;nav.Parent=gui;corner(nav,1);gothicCorners(nav)
local navItems={}
local compactMobile=false
local depart,notebook
local navPadding=Instance.new("UIPadding");navPadding.PaddingTop=UDim.new(0,7);navPadding.PaddingBottom=UDim.new(0,7);navPadding.PaddingLeft=UDim.new(0,6);navPadding.PaddingRight=UDim.new(0,6);navPadding.Parent=nav
local navList=Instance.new("UIListLayout");navList.Padding=UDim.new(0,6);navList.SortOrder=Enum.SortOrder.LayoutOrder;navList.Parent=nav

local shade=Instance.new("Frame");shade.Name="NotebookShade";shade.Size=UDim2.fromScale(1,1)
shade.BackgroundTransparency=1;shade.Active=true;shade.Visible=false;shade.ZIndex=10;shade.Parent=gui

local panel=Instance.new("CanvasGroup");panel.Name="NotebookPage";panel.AnchorPoint=Vector2.new(0,0);panel.Position=UDim2.fromOffset(10,70)
panel.Size=UDim2.fromOffset(420,520);panel.BackgroundColor3=leather;panel.Visible=false;panel.ZIndex=11;panel.Parent=gui;corner(panel,1);gothicCorners(panel)
local binding=Instance.new("Frame");binding.Name="LeatherBinding";binding.BackgroundColor3=wood;binding.BorderSizePixel=0
binding.Size=UDim2.new(0,13,1,-8);binding.Position=UDim2.fromOffset(4,4);binding.Parent=panel
local bindingLine=Instance.new("Frame");bindingLine.BackgroundColor3=brass;bindingLine.BackgroundTransparency=.18;bindingLine.BorderSizePixel=0
bindingLine.Size=UDim2.new(0,2,1,-14);bindingLine.Position=UDim2.fromOffset(17,7);bindingLine.Parent=panel
panel:GetPropertyChangedSignal("Visible"):Connect(function()shade.Visible=panel.Visible end)
local panelTitle=label(panel,"",42,21,ivory);panelTitle.Position=UDim2.fromOffset(28,8);panelTitle.Size=UDim2.new(1,-104,0,42)
brassRule(panel,55)
local function hidePanel()
 activeMenu=nil;activeStory=nil
 if not panel.Visible then return end
 local tween=TweenService:Create(panel,TweenInfo.new(.16,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{GroupTransparency=1})
 tween:Play();tween.Completed:Once(function()
  if panel.GroupTransparency>=.99 then panel.Visible=false end
  if gui.Enabled then header.Visible=true;commands.Visible=true end
 end)
end
local close=button(panel,"×",hidePanel);close.Size=UDim2.fromOffset(54,54);close.Position=UDim2.new(1,-62,0,5)
local body=Instance.new("ScrollingFrame");body.Position=UDim2.fromOffset(25,65);body.Size=UDim2.new(1,-36,1,-78)
body.BackgroundColor3=Color3.fromRGB(24,13,27);body.BackgroundTransparency=.06;body.BorderSizePixel=0;body.ScrollBarThickness=3
body.ScrollBarImageColor3=brass;body.AutomaticCanvasSize=Enum.AutomaticSize.Y;body.CanvasSize=UDim2.new();body.Parent=panel
local bodyPad=Instance.new("UIPadding");bodyPad.PaddingTop=UDim.new(0,7);bodyPad.PaddingBottom=UDim.new(0,10);bodyPad.PaddingLeft=UDim.new(0,5);bodyPad.PaddingRight=UDim.new(0,3);bodyPad.Parent=body
local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,8);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=body

local lastViewport=Vector2.zero
local function applyManorLayout()
 local camera=workspace.CurrentCamera;local v=camera and camera.ViewportSize or Vector2.new(1280,720)
 if v==lastViewport then return end;lastViewport=v
 compactMobile=UserInputService.TouchEnabled or v.X<900 or v.Y<600
 if compactMobile then
  header.Position=UDim2.fromOffset(8,6);header.Size=UDim2.fromOffset(math.min(218,math.max(188,v.X-160)),48)
  title.TextSize=14;title.Position=UDim2.fromOffset(10,1);title.Size=UDim2.new(1,-20,0,21)
  status.TextSize=9;status.Position=UDim2.fromOffset(10,25);status.Size=UDim2.new(1,-20,0,18)
  commands.Position=UDim2.new(1,-8,0,6);commands.Size=UDim2.fromOffset(132,44)
  if depart then depart.Size=UDim2.fromOffset(62,42)end
  if notebook then notebook.Size=UDim2.fromOffset(62,42);notebook.Position=UDim2.fromOffset(68,0)end
  nav.Position=UDim2.new(1,-8,0,56);nav.Size=UDim2.fromOffset(74,236)
  navPadding.PaddingTop=UDim.new(0,5);navPadding.PaddingBottom=UDim.new(0,5);navPadding.PaddingLeft=UDim.new(0,5);navPadding.PaddingRight=UDim.new(0,5)
  navList.Padding=UDim.new(0,4)
  for _,row in ipairs(navItems)do
   row.item.Size=UDim2.new(1,0,0,40);row.icon.Size=UDim2.fromOffset(17,17);row.icon.Position=UDim2.new(.5,0,0,3)
   row.text.TextSize=10;row.text.Position=UDim2.fromOffset(0,22);row.text.Size=UDim2.new(1,0,0,16)
  end
  panel.AnchorPoint=Vector2.new(.5,1);panel.Position=UDim2.new(.5,0,1,-8)
  panel.Size=UDim2.new(1,-16,0,math.floor(math.min(420,v.Y*.64)))
  local limit=panel:FindFirstChild("MobileWidthLimit")or Instance.new("UISizeConstraint")
  limit.Name="MobileWidthLimit";limit.MaxSize=Vector2.new(460,430);limit.MinSize=Vector2.new(300,250);limit.Parent=panel
  panelTitle.TextSize=18;close.Size=UDim2.fromOffset(48,48);close.Position=UDim2.new(1,-55,0,4)
  body.Position=UDim2.fromOffset(22,60);body.Size=UDim2.new(1,-32,1,-70)
 else
  header.Position=UDim2.fromOffset(10,6);header.Size=UDim2.fromOffset(238,56)
  title.TextSize=15;title.Position=UDim2.fromOffset(11,2);title.Size=UDim2.new(1,-12,0,23)
  status.TextSize=10;status.Position=UDim2.fromOffset(11,30);status.Size=UDim2.new(1,-22,0,22)
  commands.Position=UDim2.new(1,-10,0,6);commands.Size=UDim2.fromOffset(162,54)
  if depart then depart.Size=UDim2.fromOffset(68,52)end
  if notebook then notebook.Size=UDim2.fromOffset(78,52);notebook.Position=UDim2.fromOffset(74,0)end
  nav.Position=UDim2.new(1,-10,0,68);nav.Size=UDim2.fromOffset(92,304)
  navPadding.PaddingTop=UDim.new(0,7);navPadding.PaddingBottom=UDim.new(0,7);navPadding.PaddingLeft=UDim.new(0,6);navPadding.PaddingRight=UDim.new(0,6)
  navList.Padding=UDim.new(0,6)
  for _,row in ipairs(navItems)do
   row.item.Size=UDim2.new(1,0,0,52);row.icon.Size=UDim2.fromOffset(24,24);row.icon.Position=UDim2.new(.5,0,0,6)
   row.text.TextSize=12;row.text.Position=UDim2.fromOffset(0,32);row.text.Size=UDim2.new(1,0,0,24)
  end
  panel.AnchorPoint=Vector2.new(0,0);panel.Position=UDim2.fromOffset(10,70)
  panel.Size=UDim2.new(0,420,1,-84)
  local limit=panel:FindFirstChild("MobileWidthLimit");if limit then limit:Destroy()end
  panelTitle.TextSize=21;close.Size=UDim2.fromOffset(54,54);close.Position=UDim2.new(1,-62,0,5)
  body.Position=UDim2.fromOffset(25,65);body.Size=UDim2.new(1,-36,1,-78)
 end
end
applyManorLayout()
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
 activeStory={item=item,stage=stage};body.CanvasPosition=Vector2.zero
 clear();panelTitle.Text=item.Name
 label(body,(item.Origin or"저택의 손님").." · "..(stage==3 and"기록 완성"or("기록 "..stage.."/3")),34,13)
 local stories=Stories[item.Id]or{"아직 수집된 기록이 없다."}
 for i=1,3 do
  label(body,i<=stage and(({"흔적","목격","사연"})[i].."\n"..tostring(stories[i]or"기록 정리 중"))or("봉인된 기록 "..i.." · 현장에서 더 목격하면 열린다"),86,14)
 end
 button(body,"도감으로",function()open("BOOK")end)
end
open=function(key)
 if not gui.Enabled then return end
 if key=="PLAY"and math.floor(tonumber(p:GetAttribute("VisitedManorOwnerUserId"))or 0)>0 then key="EVENT"end
 activeMenu=key;activeStory=nil;rankingRows={};notebookOpen=false;nav.Visible=false;header.Visible=false;commands.Visible=false;panel.Visible=true;panel.GroupTransparency=1;clear();body.CanvasPosition=Vector2.zero;TweenService:Create(panel,TweenInfo.new(.18,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{GroupTransparency=0}):Play()
 if key=="PLAY"then
  panelTitle.Text="출정 지도"
  local inRoom=p:GetAttribute("RoomServer")==true
  local waiting=p:GetAttribute("RoomState")=="ROOM_WAITING"
  if inRoom then
   panelTitle.Text="출정 대기실"
   label(body,string.format("초대 코드 %s\n%s · 참가 %d/%d명",p:GetAttribute("RoomCode")or"------",p:GetAttribute("RoomSelectedMapName")or"학교",p:GetAttribute("RoomMemberCount")or 1,p:GetAttribute("RoomMaxPlayers")or 8),64,15)
   local roomPlayers=Players:GetPlayers()
   local hostId=tonumber(p:GetAttribute("RoomHostUserId"))or 0
   table.sort(roomPlayers,function(a,b)
    if a.UserId==hostId then return true end
    if b.UserId==hostId then return false end
    return a.UserId<b.UserId
   end)
   local roomSlots=Instance.new("Frame");roomSlots.Name="ManorRoomSlots";roomSlots.BackgroundTransparency=1
   roomSlots.Size=UDim2.new(1,-12,0,8*44);roomSlots.AutomaticSize=Enum.AutomaticSize.Y;roomSlots.Parent=body
   local roomLayout=Instance.new("UIListLayout");roomLayout.Padding=UDim.new(0,2);roomLayout.Parent=roomSlots
   for i=1,8 do
    local player=roomPlayers[i]
    if player then
     ledgerRow(roomSlots,string.format("%02d · %s",i,player.DisplayName),player.UserId==hostId and"방장"or"손님")
    else
     ledgerRow(roomSlots,string.format("%02d · 빈 객실",i),"AI 예약")
    end
   end
   if waiting and p:GetAttribute("RoomIsHost")==true and p:GetAttribute("RoomAutoStart")~=true then
    artbookButton(body,"출정 시작","참가자 준비 완료",function()send(C.Actions.START_ROOM)end,Color3.fromRGB(107,56,64),0)
   elseif not waiting then
    label(body,string.format("출정까지 %d초",p:GetAttribute("TimeLeft")or 0),48,15)
   else
    label(body,p:GetAttribute("RoomAutoStart")==true and"참가자 연결 후 곧 출정해."or"방장이 출정을 시작할 때까지 기다려줘.",48,13)
   end
   if waiting then artbookButton(body,"방 나가기","개인 저택으로 복귀",function()send(C.Actions.LEAVE_ROOM)end,wood,3)end
  end
  if not inRoom then
   label(body,"1. 맵 선택",30,15,ivory)
   for _,map in ipairs(C.Maps)do
    local chosen=(p:GetAttribute("SelectedLobbyMap")or"SCHOOL")==map.Id
    mapPostcard(body,map,chosen,function()send(C.Actions.SELECT_MAP,map.Id)end)
   end
  end
  local preference=p:GetAttribute("MonsterPreference")=="MONSTER"and"몬스터"or p:GetAttribute("MonsterPreference")=="SURVIVOR"and"인간"or"자동 배정"
  label(body,"2. 역할 · "..preference,30,15,ivory)
  artbookButton(body,"인간","정화·대시·직업 스킬",function()send(C.Actions.PREFER_SURVIVOR)end,Color3.fromRGB(41,64,72),1)
  artbookButton(body,"몬스터","추적·감염·고유 스킬",function()send(C.Actions.PREFER_MONSTER)end,Color3.fromRGB(76,24,38),4)
  if not inRoom then
   label(body,"3. 시작",30,15,ivory)
   artbookButton(body,"혼자 바로 시작","같은 서버에서 즉시 출정",function()send(C.Actions.MANOR_SOLO);hidePanel() end,wine,0)
   artbookButton(body,"공개방 빠른 참가","열린 방을 찾아 합류",function()send(C.Actions.QUICK_JOIN_PUBLIC);hidePanel() end,Color3.fromRGB(53,45,58),3)
   artbookButton(body,"친구방 만들기","초대 코드가 있는 전용 방",function()send(C.Actions.CREATE_ROOM,"FRIENDS");hidePanel() end,wood,2)
   artbookButton(body,"초대 코드 입력","6자리 초대장으로 합류",function()open("CODE")end,leather,4)
  end
 elseif key=="CODE"then
  panelTitle.Text="초대장 번호"
  label(body,"예약 카드의 여섯 칸을 눌러 초대 번호를 적어.",34,13,parchment)
  local codeCard=Instance.new("Frame");codeCard.Name="InvitationCard";codeCard.Size=UDim2.new(1,-12,0,68);codeCard.BackgroundColor3=parchment;codeCard.Parent=body;corner(codeCard,1)
  local codeGrid=Instance.new("UIGridLayout");codeGrid.CellSize=UDim2.new(1/6,-7,0,52);codeGrid.CellPadding=UDim2.fromOffset(6,0);codeGrid.HorizontalAlignment=Enum.HorizontalAlignment.Center;codeGrid.VerticalAlignment=Enum.VerticalAlignment.Center;codeGrid.Parent=codeCard
  local cells={}
  for i=1,6 do
   local cell=Instance.new("TextLabel");cell.Name="CodeCell"..i;cell.BackgroundColor3=Color3.fromRGB(198,170,118);cell.TextColor3=ink
   cell.TextSize=22;cell.Font=Enum.Font.Antique;cell.Text="·";cell.Parent=codeCard;corner(cell,1);cells[i]=cell
  end
  local input=Instance.new("TextBox");input.Name="InvitationCode";input.Size=UDim2.fromScale(1,1);input.BackgroundTransparency=1
  input.TextTransparency=1;input.Text=invitationCode;input.ClearTextOnFocus=false;input.MaxVisibleGraphemes=6;input.ZIndex=4;input.Parent=codeCard
  local function refreshCode()
   local clean=input.Text:gsub("[^0-9]",""):sub(1,6)
   if clean~=input.Text then input.Text=clean;return end
   invitationCode=clean
   for i=1,6 do cells[i].Text=string.sub(clean,i,i)~=""and string.sub(clean,i,i)or"·"end
  end
  input:GetPropertyChangedSignal("Text"):Connect(refreshCode);refreshCode()
  button(body,"예약 카드로 참가",function()send(C.Actions.JOIN_ROOM_CODE,invitationCode)end,wine)
  button(body,"출정 메뉴로",function()open("PLAY")end)
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
  panelTitle.Text="개인 저택 · 방문"
  local visitingId=math.floor(tonumber(p:GetAttribute("VisitedManorOwnerUserId"))or 0)
  local visitingName=tostring(p:GetAttribute("VisitedManorOwnerName")or"")
  if visitingId>0 then
   label(body,(visitingName~=""and visitingName or"다른 플레이어").."의 저택을 방문 중이야.\n방문자는 전시와 공간만 구경할 수 있어.",60,14,parchment)
   button(body,"내 저택으로 돌아가기",function()send(C.Actions.RETURN_MANOR);hidePanel()end,wine)
  else
   local visibility=tostring(p:GetAttribute("ManorVisibility")or"PRIVATE")
   local visitorCount=math.max(0,tonumber(p:GetAttribute("ManorVisitorCount"))or 0)
   label(body,string.format("내 저택 · %s · 방문자 %d명",visibility=="PUBLIC"and"공개"or"비공개",visitorCount),38,16,ivory)
   if visibility=="PUBLIC"then
    button(body,"저택 비공개로 전환",function()send(C.Actions.SET_MANOR_VISIBILITY,"PRIVATE")end,Color3.fromRGB(53,45,58))
   else
    button(body,"저택 공개하기",function()send(C.Actions.SET_MANOR_VISIBILITY,"PUBLIC")end,wine)
   end
   label(body,"공개 저택 방문",32,15,brass)
   local publicCount=0
   for _,owner in ipairs(Players:GetPlayers())do
    if owner~=p and owner:GetAttribute("ManorVisibility")=="PUBLIC"and owner:GetAttribute("RoomServer")~=true and owner:GetAttribute("RoundState")~="RUNNING"then
     publicCount+=1
     local ownerName=tostring(owner.DisplayName or owner.Name or("플레이어 "..tostring(owner.UserId)))
     button(body,ownerName.."의 저택 방문",function()send(C.Actions.VISIT_MANOR,owner.UserId);hidePanel()end)
    end
   end
   if publicCount==0 then label(body,"지금 이 서버에는 공개된 다른 저택이 없어.",42,13,parchment)end
  end
  label(body,"수집 전시",32,15,brass)
  local stages=progress()
  local fullMaps=0
  for _,map in ipairs(C.Maps or{})do
   local count=0;local full=true
   for _,ghost in ipairs(C.GhostCatalog or{})do
    if ghost.Map==map.Id then
     count+=1
     if (tonumber(stages[ghost.Id])or 0)<3 then full=false end
    end
   end
   if count>0 and full then fullMaps+=1 end
  end
  local rareTotal=0;local rareComplete=0;local featureName="미발견";local featureStage=-1
  for _,ghost in ipairs(C.GhostCatalog or{})do
   local stage=math.clamp(tonumber(stages[ghost.Id])or 0,0,3)
   if stage>featureStage then featureStage=stage;if stage>0 then featureName=ghost.Name end end
   if (tonumber(ghost.Weight)or math.huge)<=58 then
    rareTotal+=1;if stage>=3 then rareComplete+=1 end
   end
  end
  ledgerRow(body,"세계 괴담",string.format("%d / %d",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog))
  ledgerRow(body,"지역 완성 전시",string.format("%d / %d",fullMaps,#(C.Maps or{})))
  ledgerRow(body,"희귀 진열장",string.format("%d / %d",rareComplete,rareTotal))
  ledgerRow(body,"벽난로 대표 슬롯",featureName)
  label(body,"발견한 기록은 진열장에, 지역 100% 완료는 마당 대형 전시와 2층 완성 세트에 남아.",48,12,parchment)
  button(body,"괴담 도감 확인",function()open("BOOK")end)
  if visitingId==0 then button(body,"집사에게 인사 · 기묘한 사고",function()send(C.Actions.MANOR_GAG);hidePanel()end)end
 elseif key=="RECORD"then
  panelTitle.Text="괴담 수집 랭킹"
  send(C.Actions.MANOR_RANK)
  label(body,p.DisplayName.."의 저택",38,18)
  label(body,tostring(p:GetAttribute("GhostTitle")or"괴담 견습생"),40,17)
  label(body,string.format("괴담 발견  %d\n괴담 완성  %d\n현장 문서  %d\n몬스터 경험  %d",p:GetAttribute("GhostSeenCount")or 0,p:GetAttribute("GhostCompleted")or 0,p:GetAttribute("LoreCount")or 0,p:GetAttribute("MonsterXP")or 0),140,16)
  table.insert(rankingRows,label(body,"수집가들의 기록을 가져오는 중",48,13))
 end
end
depart=button(commands,"   출정",function()open("PLAY")end,wine)
depart.Size=UDim2.fromOffset(68,52);internalIcon(depart,0,18,UDim2.fromOffset(7,17),parchment)
notebook=button(commands,"   메뉴",function()
 notebookOpen=not notebookOpen;nav.Visible=notebookOpen
 if notebookOpen then activeMenu=nil;panel.Visible=false end
end)
notebook.Size=UDim2.fromOffset(78,52);notebook.Position=UDim2.fromOffset(74,0);internalIcon(notebook,1,18,UDim2.fromOffset(7,17),parchment)
-- 무료 Lucide 아이콘: 원본 ISC/MIT 라이선스를 모델 폴더에 보관.
for index,entry in ipairs({{"PLAY","지도"},{"BOOK","도감"},{"DRESS","옷장"},{"EVENT","저택"},{"RECORD","기록"}})do
 local item=button(nav,"",function()if activeMenu==entry[1]and panel.Visible then hidePanel()else open(entry[1])end end,entry[1]=="PLAY"and wine or leather);item.Size=UDim2.new(1,0,0,52)
 local icon=Instance.new("ImageLabel");icon.BackgroundTransparency=1;icon.Image="rbxassetid://"..tostring(Assets.IconsId or 0)
 icon.ImageRectOffset=Vector2.new((index-1)*64,0);icon.ImageRectSize=Vector2.new(64,64);icon.Size=UDim2.fromOffset(24,24);icon.AnchorPoint=Vector2.new(.5,0);icon.Position=UDim2.new(.5,0,0,6);icon.Parent=item
 local text=label(item,entry[2],24,12);text.Size=UDim2.new(1,0,0,24);text.Position=UDim2.fromOffset(0,32);text.TextXAlignment=Enum.TextXAlignment.Center
 table.insert(navItems,{item=item,icon=icon,text=text})
end
lastViewport=Vector2.zero;applyManorLayout()
local toast=label(gui,"",70,14);toast.ZIndex=12;toast.AnchorPoint=Vector2.new(.5,1);toast.Position=UDim2.new(.5,0,1,-92)
toast.Size=UDim2.new(.66,0,0,62);toast.BackgroundColor3=ink;toast.BackgroundTransparency=.08;toast.Visible=false;corner(toast)
local toastLimit=Instance.new("UISizeConstraint");toastLimit.MaxSize=Vector2.new(520,70);toastLimit.Parent=toast
local serial=0
local function notify(text)
 serial+=1;local n=serial;toast.Text="  "..text;toast.Visible=true
 task.delay(4.5,function()if serial==n then toast.Visible=false end end)
end
remote.OnClientEvent:Connect(function(kind,value)
 if kind=="MANOR_MENU"then open(value)
 elseif kind=="MANOR_RANKING"and activeMenu=="RECORD"and panel.Visible and gui.Enabled then
  for _,row in ipairs(rankingRows)do row:Destroy()end;rankingRows={}
  if value==false then table.insert(rankingRows,label(body,"랭킹을 가져오지 못했어. 잠시 후 다시 확인해줘.",48,12));return end
  if #value==0 then table.insert(rankingRows,label(body,"첫 기록을 남겨봐. 아직 등록된 수집 기록이 없어.",48,13))end
  for i,row in ipairs(value)do table.insert(rankingRows,label(body,string.format("%d. %s  ·  완성 %d / 발견 %d",i,row.Name,row.Complete,row.Seen),42,13))end
 end
end)
p:GetAttributeChangedSignal("LobbyStoryEvent"):Connect(function()
 local speaker,text=string.match(tostring(p:GetAttribute("LobbyStoryEvent")or""),"^([^|]+)|([^|]+)|")
 if speaker then notify(speaker.."\n"..text)end
end)
p:GetAttributeChangedSignal("RoomFeedback"):Connect(function()
 local kind,text=tostring(p:GetAttribute("RoomFeedback")or""):match("^([^:]+):?(.*)$")
 if not kind then return end
 if(kind=="CONNECTING"or kind=="TELEPORTING")and text~="로비로 이동"then text="출정할 방으로 이동 중"
 elseif kind=="CREATED"then text="초대 코드 · "..text end
 if text~=""then notify(text)end
 if kind=="ERROR"and not panel.Visible and gui.Enabled then open("PLAY")end
end)
p:GetAttributeChangedSignal("ManorVisitFeedback"):Connect(function()
 local kind,text=tostring(p:GetAttribute("ManorVisitFeedback")or""):match("^([^:]+):?(.*)$")
 if text and text~=""then notify(text)end
 if kind=="ERROR"and gui.Enabled then open("EVENT")end
end)
p:GetAttributeChangedSignal("CosmeticFeedback"):Connect(function()
 local code=tostring(p:GetAttribute("CosmeticFeedback")or""):match("^[^:]+")
 notify(code=="NEED_COINS"and"코인이 부족해"or code=="PURCHASED"and"구매 완료 · 의상실에서 착용할 수 있어"or code=="EQUIPPED"and"장식 착용 완료"or"소지품을 확인했어")
end)
local refreshQueued=false
for _,key in ipairs({"MonsterPreference","MonsterForm","HumanForm","LobbyAppearance","SelectedLobbyMap","OwnedCosmetics","EquippedCosmetic","Coins","MonsterXP","GhostProgress","GhostSeenCount","GhostCompleted","RoomServer","RoomState","RoomIsHost","RoomAutoStart","RoomCode","RoomMemberCount","RoomSelectedMapName","TimeLeft","ManorVisibility","ManorVisitorCount","VisitedManorOwnerUserId","VisitedManorOwnerName"})do
 p:GetAttributeChangedSignal(key):Connect(function()
  -- 입력칸·읽던 사연·랭킹은 다른 속성 변경으로 다시 만들지 않는다.
  if activeMenu=="CODE"or activeMenu=="RECORD"or(key=="TimeLeft"and activeMenu~="PLAY")then return end
  if refreshQueued then return end;refreshQueued=true
  task.defer(function()
   refreshQueued=false
   if activeMenu and panel.Visible and activeMenu~="CODE"and activeMenu~="RECORD"then
    local position=body.CanvasPosition
    if activeStory then
     local item=activeStory.item;local stage=progress()[item.Id]
     if stage==nil then stage=item.UnlockXP~=nil and((p:GetAttribute("MonsterXP")or 0)>=item.UnlockXP and 3 or 0)or 0 end
     openStory(item,stage)
    else open(activeMenu)end
    body.CanvasPosition=position
   end
  end)
 end)
end
-- 접속 메인: 입장 버튼을 누르면 기본 카메라/조작으로 정확히 복귀한다.
local entered=false
local welcome=Instance.new("Frame");welcome.Name="ManorWelcome";welcome.ZIndex=13;welcome.Active=true;welcome.Size=UDim2.fromScale(1,1);welcome.BackgroundColor3=ink;welcome.BackgroundTransparency=.58;welcome.Parent=gui
local card=Instance.new("Frame");card.Name="DarkCartoonWelcomeCard";card.AnchorPoint=Vector2.new(.5,.5);card.Position=UDim2.fromScale(.5,.72);card.Size=UDim2.new(1,-48,0,260);card.BackgroundColor3=leather;card.BackgroundTransparency=.02;card.Parent=welcome;corner(card,1);gothicCorners(card)
local cardLimit=Instance.new("UISizeConstraint");cardLimit.MaxSize=Vector2.new(430,260);cardLimit.Parent=card
local mainTitle=label(card,"MIDNIGHT ESCAPE",50,26);mainTitle.Size=UDim2.new(1,-24,0,50);mainTitle.Position=UDim2.fromOffset(12,10);mainTitle.TextXAlignment=Enum.TextXAlignment.Center;mainTitle.TextColor3=ivory;mainTitle.AutoLocalize=false
local subtitle=label(card,"심야 대탈출 · 괴물 가족의 저택",34,14);subtitle.Position=UDim2.fromOffset(12,58);subtitle.TextXAlignment=Enum.TextXAlignment.Center;subtitle.TextColor3=brass
local greeting=label(card,"집사가 문을 열어두었어.\n이 집에서는 기이한 일도 일상이야.",48,13);greeting.Position=UDim2.fromOffset(12,92);greeting.TextXAlignment=Enum.TextXAlignment.Center;greeting.TextColor3=parchment
local wax=Instance.new("Frame");wax.Name="WaxSeal";wax.AnchorPoint=Vector2.new(.5,.5);wax.Position=UDim2.new(.5,0,0,158);wax.Size=UDim2.fromOffset(38,38);wax.BackgroundColor3=wine;wax.Parent=card
local waxCorner=Instance.new("UICorner");waxCorner.CornerRadius=UDim.new(1,0);waxCorner.Parent=wax
internalIcon(wax,3,24,UDim2.fromOffset(7,7),brass)
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
local enter=artbookButton(card,"저택 들어가기","Version 77 앞마당에서 시작",function()
 entered=true
 releaseMainCamera()
 if visibility then visibility()end
end,wine,3);enter.Position=UDim2.fromOffset(18,184);enter.Size=UDim2.new(1,-36,0,62)
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
 if not visible then panel.Visible=false;activeMenu=nil;activeStory=nil;notebookOpen=false;releaseMainCamera()end
 local energy=math.max(0,math.floor((tonumber(p:GetAttribute("Energy"))or 0)+.5))
 local maxEnergy=math.max(1,math.floor((tonumber(p:GetAttribute("EnergyMax"))or tonumber(C.Energy and C.Energy.Max)or 100)+.5))
 local cosmeticTitle="신입 참가자"
 local equippedCosmetic=tostring(p:GetAttribute("EquippedCosmetic")or"DEFAULT")
 for _,item in ipairs(C.Cosmetics or{})do if item.Id==equippedCosmetic then cosmeticTitle=item.Title or cosmeticTitle;break end end
 local visitId=math.floor(tonumber(p:GetAttribute("VisitedManorOwnerUserId"))or 0)
 if visitId>0 then
  status.Text=string.format("%s의 저택 방문 중 · 보기 전용",tostring(p:GetAttribute("VisitedManorOwnerName")or"다른 플레이어"))
 else
  if compactMobile then
   status.Text=string.format("괴담 %d/%d · %d 코인 · E %d/%d",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog,p:GetAttribute("Coins")or 0,energy,maxEnergy)
  else
   status.Text=string.format("괴담 %d/%d · %d 코인 · 에너지 %d/%d · %s",p:GetAttribute("GhostCompleted")or 0,#C.GhostCatalog,p:GetAttribute("Coins")or 0,energy,maxEnergy,cosmeticTitle)
  end
 end
 if p:GetAttribute("RoomServer")==true then
  if compactMobile then
   status.Text=(round=="INTERMISSION"and string.format("출정 %d초",p:GetAttribute("TimeLeft")or 0)or string.format("방 %s · %d명",p:GetAttribute("RoomCode")or"------",p:GetAttribute("RoomMemberCount")or 1))..string.format(" · E %d/%d",energy,maxEnergy)
  else
   status.Text=(round=="INTERMISSION"and string.format("출정까지 %d초",p:GetAttribute("TimeLeft")or 0)or string.format("초대 %s · 참가 %d명",p:GetAttribute("RoomCode")or"------",p:GetAttribute("RoomMemberCount")or 1))..string.format(" · 에너지 %d/%d · %s",energy,maxEnergy,cosmeticTitle)
  end
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
-- 앞마당 스폰과 현관 정면축을 사람 눈높이에서 보여준다. 입장 후에는 기본 카메라/터치 조작을 쓴다.
RunService.RenderStepped:Connect(function()
 applyManorLayout()
 if not gui.Enabled or entered then return end
 local x=p:GetAttribute("ManorOriginX");local z=p:GetAttribute("ManorOriginZ");local camera=workspace.CurrentCamera
 if x and z and camera then
  mainCameraActive=true
  camera.CameraType=Enum.CameraType.Scriptable
  camera.CFrame=CFrame.lookAt(Vector3.new(x,7.2,z+76),Vector3.new(x,6.2,z+2))
  if controls then controls:Disable()end
 end
end)

-- 생활 연출 · NPC idle, 저택 호흡, 배경 시차. 서버 물리/저장/상호작용과 완전히 분리한다.
local animatedScene=nil
local animatedRoom=nil
local details={}
local npcGroups={}
local livingLights={}
local elapsed=0

local function npcRole(name)
 if string.sub(name,1,6)=="Butler"then return"BUTLER"
 elseif string.sub(name,1,10)=="Undertaker"then return"UNDERTAKER"
 elseif string.sub(name,1,9)=="Archivist"then return"ARCHIVIST"end
 return nil
end
local function npcHeadPart(name)
 return name:match("Head")or name:match("Hair")or name:match("Sclera")or name:match("Iris")or name:match("Pupil")
  or name:match("Lid")or name:match("Brow")or name:match("Nose")or name:match("Lip")or name:match("MouthCorner")
  or name:match("TempleFold")or name:match("ChinFold")or name:match("Ear")or name:match("Moustache")
  or name:match("Glass")or name:match("Hat")
end
local function rolePhase(role)return role=="BUTLER"and .3 or role=="UNDERTAKER"and 2.1 or 4.2 end
local function roleMotion(role,now)
 local phase=rolePhase(role)
 if role=="BUTLER"then
  return Vector3.new(0,math.sin(now*.95+phase)*.030,0),Vector3.new(math.sin(now*.42+phase)*.004,math.sin(now*.36+phase)*.010,math.sin(now*.55+phase)*.004)
 elseif role=="UNDERTAKER"then
  return Vector3.new(math.sin(now*.33+phase)*.010,math.sin(now*.68+phase)*.024,0),Vector3.new(math.sin(now*.31+phase)*.008,math.sin(now*.29+phase)*.007,math.sin(now*.41+phase)*.006)
 elseif role=="ARCHIVIST"then
  return Vector3.new(0,math.sin(now*.82+phase)*.026,0),Vector3.new(math.sin(now*.54+phase)*.012,math.sin(now*.38+phase)*.006,math.sin(now*.46+phase)*.005)
 end
 return Vector3.zero,Vector3.zero
end
local function around(pivot,angles)
 return CFrame.new(pivot)*CFrame.Angles(angles.X,angles.Y,angles.Z)*CFrame.new(-pivot)
end
local function rebuildLivingScene(room,scene)
 animatedRoom=room;animatedScene=scene;details={};npcGroups={};livingLights={}
 if not scene then return end
 for _,mesh in ipairs(scene:GetDescendants())do
  if mesh:IsA("BasePart")then
   local name=mesh.Name
   local role=npcRole(name)
   if role then
    local group=npcGroups[role]
    if not group then group={parts={},sum=Vector3.zero,count=0,headSum=Vector3.zero,headCount=0};npcGroups[role]=group end
    local head=npcHeadPart(name)~=nil
    local row={part=mesh,home=mesh.CFrame,size=mesh.Size,name=name,transparency=mesh.Transparency,head=head}
    table.insert(group.parts,row);group.sum+=mesh.Position;group.count+=1
    if head then group.headSum+=mesh.Position;group.headCount+=1 end
   elseif name:match("^MirrorPupil")or name:match("^ClockPendulum")or name:match("^LittleGhost")or name:match("Flame")
    or name:match("^LivingCurtain")or name:match("^LivingVineTip")or name:match("^LivingBranch")
    or name:match("^BackdropCloud")or name:match("^BackdropMist")or name:match("^BackdropBat")
    or name:match("^ChandelierDrop")or name:match("^ChandelierPearDrop")or name:match("^PaperMoonHalo")
    or name:match("^JackGlow")or name:match("^GargoyleEye")then
    if name:match("^JackGlow")or name:match("^GargoyleEye")then mesh.Material=Enum.Material.Neon end
    table.insert(details,{part=mesh,home=mesh.CFrame,size=mesh.Size,name=name,transparency=mesh.Transparency})
   end
  end
 end
 for _,group in pairs(npcGroups)do
  group.pivot=group.count>0 and group.sum/group.count or Vector3.zero
  group.headPivot=group.headCount>0 and group.headSum/group.headCount or group.pivot
 end
 if room then
  for _,item in ipairs(room:GetDescendants())do
   if item:IsA("PointLight")then table.insert(livingLights,{light=item,brightness=item.Brightness})end
  end
 end
end

RunService.Heartbeat:Connect(function(dt)
 elapsed+=dt;if elapsed<.05 or not gui.Enabled then return end;elapsed=0
 local root=workspace:FindFirstChild("MidnightLobby")
 local visited=math.floor(tonumber(p:GetAttribute("VisitedManorOwnerUserId"))or 0)
 local ownerId=visited>0 and visited or p.UserId
 local room=root and root:FindFirstChild("PersonalManor_"..ownerId)
 local scene=room and room:FindFirstChild("ManorScene")
 if scene~=animatedScene or room~=animatedRoom then rebuildLivingScene(room,scene)end
 if not scene then return end

 local now=workspace:GetServerTimeNow()
 local playerRoot=p.Character and p.Character:FindFirstChild("HumanoidRootPart")

 -- NPC는 역할마다 다른 호흡/체중 이동을 한다. 서버가 gag 연출로 잠시 unanchor한 파츠는 건드리지 않는다.
 for role,group in pairs(npcGroups)do
  local offset,angles=roleMotion(role,now)
  local transform=CFrame.new(offset)*around(group.pivot,angles)
  local phase=rolePhase(role)
  local blinkPeriod=role=="BUTLER"and 5.8 or role=="UNDERTAKER"and 7.1 or 4.6
  local blinkCycle=(now+phase*1.7)%blinkPeriod
  local blink=blinkCycle<.16 and math.sin(blinkCycle/.16*math.pi)or 0
  local attention=(now+phase*2.3)%(role=="ARCHIVIST"and 8.5 or 10.8)
  local lookWeight=attention<2.1 and 1 or .35
  local targetYaw=0
  local targetPitch=0
  if playerRoot and group.headCount>0 then
   local delta=playerRoot.Position-group.headPivot
   targetYaw=math.clamp(delta.X*.0014,-.032,.032)*lookWeight
   targetPitch=math.clamp(delta.Y*.0011,-.018,.018)*lookWeight
  end
  local idleYaw=role=="BUTLER"and math.sin(now*.23+phase)*.009 or role=="UNDERTAKER"and math.sin(now*.16+phase)*.006 or math.sin(now*.31+phase)*.014
  local idlePitch=role=="ARCHIVIST"and (.014+math.sin(now*.38+phase)*.010) or math.sin(now*.21+phase)*.005
  local headTransform=around(group.headPivot,Vector3.new(idlePitch-targetPitch,idleYaw+targetYaw,math.sin(now*.19+phase)*.004))
  for _,row in ipairs(group.parts)do
   local mesh=row.part
   if mesh.Parent and mesh.Anchored then
    local cf=transform*(row.head and headTransform or CFrame.identity)*row.home
    -- 눈은 머리 움직임 위에서 플레이어를 조금 더 따라가고 역할별 간격으로 깜빡인다.
    if playerRoot and(row.name:match("_Iris")or row.name:match("_Pupil"))then
     local delta=playerRoot.Position-row.home.Position
     cf=cf+Vector3.new(math.clamp(delta.X*.004,-.045,.045),math.clamp(delta.Y*.0025,-.028,.028),0)
    elseif row.name:match("_UpperLid")then
     cf=cf+Vector3.new(0,-blink*.060,0)
    elseif row.name:match("_LowerLid")then
     cf=cf+Vector3.new(0,blink*.035,0)
    elseif row.name:match("Tray")then
     cf=cf*CFrame.Angles(math.sin(now*.46+phase)*.003,0,math.sin(now*.72+phase)*.007)
    elseif row.name:match("PocketWatch")then
     cf=cf*CFrame.Angles(0,0,math.sin(now*.80+phase)*.012)
    elseif row.name:match("Ledger")then
     local pageBeat=role=="ARCHIVIST"and math.max(0,math.sin(now*.32+phase))or 0
     cf=cf*CFrame.Angles(math.sin(now*.61+phase)*.006+pageBeat*.004,0,math.sin(now*.43+phase)*.004)
    elseif row.name:match("Pen")then
     cf=cf*CFrame.Angles(0,0,math.sin(now*(role=="ARCHIVIST"and 1.35 or 1.05)+phase)*.014)
    elseif row.name:match("Key")then
     cf=cf*CFrame.Angles(0,0,math.sin(now*.82+phase)*.010)
    elseif row.name:match("Spade")then
     cf=cf*CFrame.Angles(math.sin(now*.22+phase)*.004,math.sin(now*.38+phase)*.007,0)
    elseif row.name:match("_Hand")or row.name:match("_Finger")or row.name:match("_Thumb")then
     local handSpeed=role=="ARCHIVIST"and .76 or role=="BUTLER"and .42 or .28
     cf=cf*CFrame.Angles(math.sin(now*handSpeed+phase)*.003,0,math.sin(now*(handSpeed*.73)+phase)*.003)
    end
    mesh.CFrame=cf
   end
  end
 end

 -- 저택/배경은 서로 다른 주기로 움직여 기계적으로 동시에 흔들리지 않는다.
 for _,row in ipairs(details)do
  local mesh=row.part
  if mesh.Parent and mesh.Anchored then
   local name=row.name
   if name:match("^MirrorPupil")and playerRoot then
    local delta=playerRoot.Position-row.home.Position
    mesh.CFrame=row.home+Vector3.new(math.clamp(delta.X*.022,-.38,.38),math.clamp((delta.Y+10)*.018,-.13,.13),0)
   elseif name:match("^ClockPendulum")then
    local pivot=row.home.Position+Vector3.new(0,3.7,0)
    mesh.CFrame=around(pivot,Vector3.new(0,0,math.sin(now*2.2)*.12))*row.home
   elseif name:match("^LittleGhost")then
    mesh.CFrame=row.home+Vector3.new(math.sin(now*.62)*.06,math.sin(now*1.6)*.18,0)
   elseif name:match("Flame")then
    local phase=row.home.Position.X*.37+row.home.Position.Z*.19
    mesh.Size=Vector3.new(row.size.X*(1+math.sin(now*5.8+phase)*.025),row.size.Y*(1+math.sin(now*7.1+phase)*.065),row.size.Z)
    mesh.CFrame=row.home+Vector3.new(math.sin(now*4.7+phase)*.018,math.sin(now*6.3+phase)*.025,0)
   elseif name:match("^LivingCurtain")then
    mesh.CFrame=around(row.home.Position,Vector3.new(math.sin(now*.55+row.home.Position.X*.07)*.018,0,math.sin(now*.43+row.home.Position.X*.05)*.030))*row.home
   elseif name:match("^LivingVineTip")or name:match("^LivingBranch")then
    mesh.CFrame=around(row.home.Position,Vector3.new(math.sin(now*.47+row.home.Position.Z*.05)*.018,math.sin(now*.38+row.home.Position.X*.04)*.020,math.sin(now*.51)*.025))*row.home
   elseif name:match("^BackdropCloud")then
    local layer=tonumber(name:match("(%d+)$"))or 0
    local speed=.050+layer*.010
    local travel=2.1+layer*.42
    mesh.CFrame=row.home+Vector3.new(math.sin(now*speed+row.home.Position.X*.01)*travel,math.sin(now*(speed*1.55)+layer)*(.12+layer*.035),0)
   elseif name:match("^BackdropMist")then
    local layer=tonumber(name:match("(%d+)$"))or 0
    local speed=.060+layer*.012
    mesh.CFrame=row.home+Vector3.new(math.sin(now*speed+layer*.8)*(1.5+layer*.35),math.sin(now*(speed*1.4)+row.home.Position.X*.02)*(.10+layer*.035),0)
   elseif name:match("^BackdropBat")then
    local layer=tonumber(name:match("(%d+)$"))or 0
    local phase=row.home.Position.X*.11+layer*.71
    local flap=math.sin(now*(1.65+layer*.08)+phase)
    mesh.CFrame=(row.home+Vector3.new(math.sin(now*(.42+layer*.025)+phase)*(1.0+layer*.10),math.sin(now*(.78+layer*.035)+phase)*(.42+layer*.05),0))*CFrame.Angles(0,0,flap*.10)
    mesh.Size=Vector3.new(row.size.X*(1+math.abs(flap)*.055),row.size.Y*(1-math.abs(flap)*.045),row.size.Z)
   elseif name:match("^ChandelierDrop")or name:match("^ChandelierPearDrop")then
    local phase=row.home.Position.X*.21+row.home.Position.Z*.17
    mesh.CFrame=around(row.home.Position+Vector3.new(0,.8,0),Vector3.new(math.sin(now*.62+phase)*.020,0,math.sin(now*.48+phase)*.024))*row.home
   elseif name:match("^PaperMoonHalo")then
    local pulse=1+math.sin(now*.35+row.home.Position.Z)*.018
    mesh.Size=Vector3.new(row.size.X*pulse,row.size.Y*pulse,row.size.Z)
   elseif name:match("^JackGlow")then
    local phase=row.home.Position.X*.19+row.home.Position.Z*.13
    local glow=.10+math.sin(now*1.35+phase)*.06
    mesh.Transparency=math.clamp((row.transparency or 0)+glow,0,.32)
    mesh.Size=Vector3.new(row.size.X*(1+math.sin(now*1.15+phase)*.025),row.size.Y*(1+math.sin(now*1.30+phase)*.025),row.size.Z)
   elseif name:match("^GargoyleEye")then
    local phase=row.home.Position.X*.23
    mesh.Transparency=.04+(.5+.5*math.sin(now*.62+phase))*.10
    mesh.CFrame=row.home+Vector3.new(0,math.sin(now*.47+phase)*.012,0)
   end
  end
 end

 -- 조명은 아주 약하게 호흡시켜 정적인 스테이지 조명 느낌을 없앤다.
 for index,row in ipairs(livingLights)do
  if row.light.Parent then
   row.light.Brightness=row.brightness*(1+math.sin(now*.72+index*.83)*.035)
  end
 end
end)
