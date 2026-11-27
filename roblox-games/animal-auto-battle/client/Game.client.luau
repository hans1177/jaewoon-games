-- 파일명: roblox-games/animal-auto-battle/client/Game.client.luau
-- 임포트: 모바일 터치 HUD. 동물 3D 모델은 로블록스 사용 권한 검증 전까지 만들거나 대체하지 않는다.
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local player=Players.LocalPlayer
local Rules=require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Rules"))
local channel=ReplicatedStorage:WaitForChild("AnimalAutoBattle")
local request=channel:WaitForChild("Request")
local snapshot=channel:WaitForChild("Snapshot")

-- UI: 모바일·가로 화면 크기에 맞춰 같은 책임 화면에서 재배치한다.
local gui=Instance.new("ScreenGui")
gui.Name="AnimalAutoBattleUI"
gui.ResetOnSpawn=false
gui.Parent=player:WaitForChild("PlayerGui")
local background=Instance.new("Frame")
background.Size=UDim2.fromScale(1,1)
background.BackgroundColor3=Color3.fromRGB(22,34,39)
background.BorderSizePixel=0
background.Parent=gui
local panel=Instance.new("Frame")
panel.AnchorPoint=Vector2.new(0.5,0)
panel.Position=UDim2.fromScale(0.5,0)
panel.Size=UDim2.fromOffset(440,700)
panel.BackgroundTransparency=1
panel.Parent=background
local scale=Instance.new("UIScale")
scale.Parent=panel
local function fitScreen()
 local camera=workspace.CurrentCamera
 if not camera then return end
 local v=camera.ViewportSize
 scale.Scale=math.clamp(math.min(v.X/460,v.Y/715),0.4,1.1)
end
if workspace.CurrentCamera then
 workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(fitScreen)
end
fitScreen()

local function label(parent,x,y,w,h,text,size)
 local item=Instance.new("TextLabel")
 item.BackgroundTransparency=1
 item.Position=UDim2.fromOffset(x,y)
 item.Size=UDim2.fromOffset(w,h)
 item.Text=text
 item.TextColor3=Color3.fromRGB(243,244,229)
 item.Font=Enum.Font.GothamBold
 item.TextSize=size or 17
 item.TextWrapped=true
 item.Parent=parent
 return item
end
local function button(parent,x,y,w,h,text,size)
 local b=Instance.new("TextButton")
 b.Position=UDim2.fromOffset(x,y)
 b.Size=UDim2.fromOffset(w,h)
 b.Text=text
 b.TextWrapped=true
 b.Font=Enum.Font.GothamBold
 b.TextSize=size or 15
 b.TextColor3=Color3.fromRGB(255,255,245)
 b.BackgroundColor3=Color3.fromRGB(58,82,87)
 b.BorderSizePixel=0
 b.AutoButtonColor=true
 local corner=Instance.new("UICorner")
 corner.CornerRadius=UDim.new(0,8)
 corner.Parent=b
 b.Parent=parent
 return b
end

label(panel,12,5,416,40,"동물 자동대전",26)
local status=label(panel,12,46,416,34,"진행 데이터 로딩 중",16)
local hint=label(panel,12,83,416,38,"팀 칸을 선택하고 상점 동물을 구매해",13)
hint.TextColor3=Color3.fromRGB(249,210,141)
label(panel,12,123,416,30,"내 팀 · 왼쪽부터 공격",17)
local teamButtons={}
local shopButtons={}
local freezeButtons={}
local state,selected=nil,nil
local replayLayer
for i=1,Rules.TeamLimit do
 local b=button(panel,12+(i-1)*84,158,80,94,tostring(i),13)
 teamButtons[i]=b
 b.Activated:Connect(function()
  if not state or not state.ready then return end
  if selected and selected~=i and state.team[selected] and state.team[i] then
   request:FireServer({action="MOVE",from=selected,to=i})
   selected=nil
  else
   selected=i
  end
  for j,other in ipairs(teamButtons) do
   other.BackgroundColor3=(selected==j) and Color3.fromRGB(43,128,119) or Color3.fromRGB(58,82,87)
  end
 end)
end
label(panel,12,264,416,33,"상점 · 구매하거나 먹이 주기",17)
for i=1,4 do
 local x=12+(i-1)*105
 local buy=button(panel,x,302,101,73,"상점",13)
 local freeze=button(panel,x,379,101,35,"고정",12)
 shopButtons[i]=buy
 freezeButtons[i]=freeze
 buy.Activated:Connect(function()
  request:FireServer({action="BUY",slot=i,target=selected})
 end)
 freeze.Activated:Connect(function()
  request:FireServer({action="FREEZE",slot=i})
 end)
end
local roll=button(panel,12,430,131,50,"새로고침 -1",14)
local sell=button(panel,154,430,131,50,"선택 동물 판매",14)
local fight=button(panel,296,430,132,50,"자동전투",15)
roll.Activated:Connect(function() request:FireServer({action="ROLL"}) end)
sell.Activated:Connect(function()
 if selected then request:FireServer({action="SELL",slot=selected}) end
end)
fight.Activated:Connect(function()
 if replayLayer and replayLayer.Visible then return end
 request:FireServer({action=(state and state.phase=="ended") and "NEW" or "BATTLE"})
end)
label(panel,12,487,416,28,"전투 기록",17)
local logs=Instance.new("ScrollingFrame")
logs.Name="FightLog"
logs.Position=UDim2.fromOffset(12,519)
logs.Size=UDim2.fromOffset(416,172)
logs.BackgroundColor3=Color3.fromRGB(34,47,53)
logs.BorderSizePixel=0
logs.ScrollBarThickness=5
logs.CanvasSize=UDim2.fromOffset(0,170)
logs.Parent=panel
local fightLog=label(logs,10,6,388,153,"첫 전투를 시작해",13)
fightLog.Font=Enum.Font.Gotham
fightLog.TextXAlignment=Enum.TextXAlignment.Left
fightLog.TextYAlignment=Enum.TextYAlignment.Top

-- 전투 재생: 서버가 확정한 프레임만 읽는다. 피해·보상을 계산하지 않는다.
replayLayer=Instance.new("Frame")
replayLayer.Name="BattleReplay"
replayLayer.Position=UDim2.fromOffset(8,57)
replayLayer.Size=UDim2.fromOffset(424,635)
replayLayer.BackgroundColor3=Color3.fromRGB(23,38,48)
replayLayer.BorderSizePixel=0
replayLayer.ZIndex=10
replayLayer.Visible=false
replayLayer.Parent=panel
local replayCorner=Instance.new("UICorner")
replayCorner.CornerRadius=UDim.new(0,14)
replayCorner.Parent=replayLayer
local replayStroke=Instance.new("UIStroke")
replayStroke.Thickness=2
replayStroke.Color=Color3.fromRGB(102,157,143)
replayStroke.Parent=replayLayer
local replayTitle=label(replayLayer,12,8,400,42,"자동전투",25)
replayTitle.ZIndex=11
local replayOutcome=label(replayLayer,12,50,400,34,"서버 판정 불러오는 중",16)
replayOutcome.ZIndex=11
local mineHeading=label(replayLayer,12,91,400,26,"내 동물 팀 · 앞열이 먼저 싸워",15)
mineHeading.ZIndex=11
local foeHeading=label(replayLayer,12,277,400,26,"상대 동물 팀",15)
foeHeading.ZIndex=11
local vs=label(replayLayer,12,235,400,32,"대 결",22)
vs.TextColor3=Color3.fromRGB(252,207,112)
vs.ZIndex=11
local allyCards,foeCards={},{}
for i=1,Rules.TeamLimit do
 local x=9+(i-1)*83
 local ally=button(replayLayer,x,125,78,99,"",12)
 ally.AutoButtonColor=false
 ally.Active=false
 ally.BackgroundColor3=Color3.fromRGB(44,90,86)
 ally.ZIndex=11
 allyCards[i]=ally
 local foe=button(replayLayer,x,311,78,99,"",12)
 foe.AutoButtonColor=false
 foe.Active=false
 foe.BackgroundColor3=Color3.fromRGB(104,59,67)
 foe.ZIndex=11
 foeCards[i]=foe
end
local replayMessage=label(replayLayer,13,430,398,58,"",15)
replayMessage.ZIndex=11
local replayProgress=label(replayLayer,13,490,398,29,"",13)
replayProgress.TextColor3=Color3.fromRGB(185,213,205)
replayProgress.ZIndex=11
local skipReplay=button(replayLayer,12,546,192,52,"결과 바로 보기",15)
skipReplay.ZIndex=11
local closeReplay=button(replayLayer,218,546,192,52,"상점으로 돌아가기",15)
closeReplay.BackgroundColor3=Color3.fromRGB(52,115,97)
closeReplay.ZIndex=11
local replayGeneration,shownReplaySerial=0,0
local currentReplayFrames={}
local replayVerdict=""
local function drawReplayFrame(i)
 local frame=currentReplayFrames[i]
 if typeof(frame)~="table" then return end
 local function paint(cards,units,frontColor,restColor)
  for slot,card in ipairs(cards) do
   local pet=typeof(units)=="table" and units[slot] or nil
   local def=pet and Rules.Pets[pet.id] or nil
   if def then
    card.Text=string.format("%s\n공격 %d\n체력 %d · %d레벨",
     def.name,pet.attack,pet.health,pet.level)
    card.BackgroundColor3=(slot==1) and frontColor or restColor
    card.TextTransparency=0
   else
    card.Text="빈 칸"
    card.BackgroundColor3=Color3.fromRGB(45,54,60)
    card.TextTransparency=0.2
   end
  end
 end
 paint(allyCards,frame.mine,Color3.fromRGB(35,136,114),Color3.fromRGB(44,90,86))
 paint(foeCards,frame.foes,Color3.fromRGB(158,76,73),Color3.fromRGB(104,59,67))
 replayMessage.Text=frame.text or ""
 replayProgress.Text=string.format("진행 %d / %d",i,#currentReplayFrames)
 if i==#currentReplayFrames then
  replayOutcome.Text="판정 완료 · "..(replayVerdict or "")
 else replayOutcome.Text="전투 재생 중" end
end
skipReplay.Activated:Connect(function()
 if not replayLayer.Visible then return end
 replayGeneration+=1
 drawReplayFrame(#currentReplayFrames)
end)
closeReplay.Activated:Connect(function()
 replayGeneration+=1
 replayLayer.Visible=false
end)
local function playReplay(data)
 local serial=tonumber(data.replaySerial) or 0
 if serial<=shownReplaySerial then return end
 shownReplaySerial=serial
 local replay=data.replay
 if typeof(replay)~="table" or typeof(replay.frames)~="table" or #replay.frames==0 then return end
 replayGeneration+=1
 local generation=replayGeneration
 currentReplayFrames=replay.frames
 replayVerdict=replay.verdict or ""
 replayTitle.Text=string.format("%d라운드 · 자동전투",replay.round or 1)
 replayLayer.Visible=true
 task.spawn(function()
  for i=1,#currentReplayFrames do
   if generation~=replayGeneration or not replayLayer.Visible then return end
   drawReplayFrame(i)
   if i<#currentReplayFrames then task.wait(i==1 and 0.7 or 0.38) end
  end
 end)
end

-- 메인: 서버의 스냅샷만 표시하고 전투 보상·피해를 클라이언트에서 계산하지 않는다.
local function render(data)
 state=data
 if not data.ready then return end
 status.Text=string.format("%d라운드 · 금화 %d · 체력 %d · 승리 %d/%d",
  data.round,data.gold,data.hearts,data.wins,Rules.TargetWins)
 hint.Text=(data.error and data.error~="") and data.error
  or (data.phase=="ended" and "도전 종료 · 새 도전을 시작할 수 있어"
  or "팀 칸 선택 → 구매 · 두 팀 칸 선택 → 위치 변경")
 for i,b in ipairs(teamButtons) do
  local unit=data.team[i]
  local pet=unit and Rules.Pets[unit.id]
  if pet then
   b.Text=string.format("%d. %s\n공격 %d / 체력 %d\n레벨 %d",i,pet.name,unit.attack,unit.health,unit.level)
  else b.Text=tostring(i).."\n빈 칸" end
  b.BackgroundColor3=(selected==i) and Color3.fromRGB(43,128,119) or Color3.fromRGB(58,82,87)
 end
 for i,b in ipairs(shopButtons) do
  local offer=data.shop[i]
  local item=typeof(offer)=="table" and
   ((offer.kind=="pet" and Rules.Pets[offer.id]) or Rules.Foods[offer.id]) or nil
  if item and offer.kind=="pet" then
   b.Text=string.format("%s · %d단계\n공격 %d / 체력 %d\n금화 3",
    item.name,item.tier,item.attack,item.health)
  elseif item then
   b.Text=string.format("%s\n공격 +%d / 체력 +%d\n금화 3",
    item.name,item.attack,item.health)
  else b.Text="비어 있음" end
  freezeButtons[i].Visible=item~=nil
  freezeButtons[i].Text=item and (offer.frozen and "고정 해제" or "고정") or ""
 end
 fight.Text=data.phase=="ended" and "새 도전" or "자동전투"
 local events=data.events or {}
 fightLog.Text=(#events>0) and table.concat(events,"\n") or "편성 후 자동전투를 눌러"
 fightLog.Size=UDim2.fromOffset(388,math.max(153,#events*23))
 logs.CanvasSize=UDim2.fromOffset(0,math.max(172,#events*23+15))
 playReplay(data)
end
snapshot.OnClientEvent:Connect(render)
task.delay(0.5,function() request:FireServer({action="SYNC"}) end)
