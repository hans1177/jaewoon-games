-- 파일명: Game.client.luau
-- 임포트: 학교 타이쿤 모바일 터치 인터페이스
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local UserInputService=game:GetService("UserInputService")
local player=Players.LocalPlayer
local Config=require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameConfig"))
local remote=ReplicatedStorage:WaitForChild(Config.RemoteName)
local gui=Instance.new("ScreenGui")
gui.Name="SchoolTycoonUI";gui.ResetOnSpawn=false
gui.IgnoreGuiInset=false;gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling;gui.Parent=player:WaitForChild("PlayerGui")
local function make(class,parent,props)
 local v=Instance.new(class)
 for k,p in pairs(props or {}) do v[k]=p end
 v.Parent=parent;return v
end
local function round(frame,radius)
 make("UICorner",frame,{CornerRadius=UDim.new(0,radius or 12)})
end
local function border(frame,col)
 make("UIStroke",frame,{Color=col or Color3.fromRGB(70,91,116),Transparency=.25,Thickness=1})
end
local function label(parent,text,position,size,fs,color,weight)
 local t=make("TextLabel",parent,{BackgroundTransparency=1,Text=text,Position=position,Size=size,
  TextColor3=color or Color3.new(1,1,1),TextSize=fs or 15,Font=weight or Enum.Font.GothamBold,
  TextXAlignment=Enum.TextXAlignment.Left,TextWrapped=true})
 return t
end
local function button(parent,text,position,size,color)
 local b=make("TextButton",parent,{Text=text,Position=position,Size=size,TextSize=13,Font=Enum.Font.GothamBold,
  BackgroundColor3=color or Color3.fromRGB(50,104,165),TextColor3=Color3.new(1,1,1),AutoButtonColor=true,TextWrapped=true})
 round(b,9);return b
end
local hud=make("Frame",gui,{Name="현황",AnchorPoint=Vector2.new(.5,0),Position=UDim2.new(.5,0,0,8),
 Size=UDim2.new(.97,0,0,81),BackgroundColor3=Color3.fromRGB(21,36,58),BackgroundTransparency=.04})
round(hud);border(hud)
label(hud,"우리 학교",UDim2.new(0,12,0,6),UDim2.new(.32,0,0,23),18,Color3.fromRGB(255,233,154))
local line1=label(hud,"돈 0 · 학생 0/0 · 교사 1",UDim2.new(0,12,0,30),UDim2.new(.97,-20,0,18),12)
local line2=label(hud,"만족도 0 · 명성 0 · 운영 1일",UDim2.new(0,12,0,51),UDim2.new(.97,-20,0,18),12,Color3.fromRGB(181,221,247))
local toggle=button(hud,"학교 개교",UDim2.new(1,-116,0,8),UDim2.fromOffset(104,30),Color3.fromRGB(22,151,120))
local panel=make("Frame",gui,{Name="학교설계도",AnchorPoint=Vector2.new(.5,1),Position=UDim2.new(.5,0,1,-8),
 Size=UDim2.new(.98,0,.53,0),BackgroundColor3=Color3.fromRGB(24,39,60),BackgroundTransparency=.02})
round(panel,13);border(panel)
make("UISizeConstraint",panel,{MinSize=Vector2.new(295,275),MaxSize=Vector2.new(740,405)})
local title=label(panel,"학교 건설 · 설계도",UDim2.new(0,13,0,7),UDim2.new(.9,0,0,22),16,Color3.fromRGB(252,230,171))
local info=label(panel,"칸을 선택한 뒤 시설을 골라 건설해.",UDim2.new(0,13,0,33),UDim2.new(1,-24,0,31),12,Color3.fromRGB(208,224,242))
local board=make("Frame",panel,{Name="8x8_학교부지",Position=UDim2.new(.02,0,.20,0),Size=UDim2.new(.53,0,.58,0),BackgroundTransparency=1})
local boardAspect=make("UIAspectRatioConstraint",board,{AspectRatio=1,AspectType=Enum.AspectType.FitWithinMaxSize})
make("UIGridLayout",board,{CellSize=UDim2.new(.123,-1,.123,-1),CellPadding=UDim2.new(.002,0,.002,0),SortOrder=Enum.SortOrder.LayoutOrder})
local tiles={}
local selectedX,selectedY=4,5
local selectedKind="classroom"
local state=nil
local function getTile(x,y)
 if not state then return nil end
 return state.tiles[tostring(x)..","..tostring(y)]
end
local function render()
 if not state then return end
 line1.Text=string.format("돈 %d  ·  학생 %d/%d  ·  교사 %d",state.coins,state.students,state.capacity,state.teachers)
 line2.Text=string.format("만족도 %d%%  ·  명성 %d  ·  운영 %d일  ·  총수익 %d",state.satisfaction,state.rep,state.days,state.earnings)
 toggle.Text=state.open and "학교 휴교" or "학교 개교"
 toggle.BackgroundColor3=state.open and Color3.fromRGB(187,92,69) or Color3.fromRGB(22,151,120)
 for y=1,Config.GridSize do
  for x=1,Config.GridSize do
   local b=tiles[tostring(x)..","..tostring(y)]
   if b then
    local t=getTile(x,y)
    local conf=t and Config.Items[t.kind]
    b.BackgroundColor3=(x==4 and y==8) and Color3.fromRGB(224,203,137) or (conf and conf.color) or Color3.fromRGB(71,108,87)
    b.Text=(x==4 and y==8) and "문" or (t and (({path="━",classroom="교",library="책",cafeteria="급",gym="체",lab="과",garden="꽃"})[t.kind] or "?")) or "+"
    b.TextColor3=Color3.new(1,1,1)
    b.TextSize=(x==selectedX and y==selectedY) and 20 or 13
    local stroke=b:FindFirstChild("Selected")
    if stroke then stroke.Enabled=(x==selectedX and y==selectedY) end
   end
  end
 end
 local tile=getTile(selectedX,selectedY)
 local on=tile and Config.Items[tile.kind]
 local item=Config.Items[selectedKind]
 local goal=Config.Goals[state.goal]
 local text=string.format("선택 %d행 %d열",selectedY,selectedX)
 if tile then text=text.." · "..on.label.." "..tile.level.."단계" else text=text.." · 빈 땅" end
 if goal then text=text.." | 다음 목표: 학생 "..goal.students.."명" else text=text.." | 모든 목표 달성!" end
 info.Text=text
end
for y=1,Config.GridSize do
 for x=1,Config.GridSize do
  local xx,yy=x,y
  local b=button(board,"+",UDim2.fromOffset(0,0),UDim2.fromScale(.12,.12),Color3.fromRGB(71,108,87))
  b.LayoutOrder=(y-1)*Config.GridSize+x;b.TextSize=13
  round(b,3)
  make("UIStroke",b,{Name="Selected",Color=Color3.fromRGB(255,242,163),Thickness=3,Enabled=false})
  tiles[tostring(x)..","..tostring(y)]=b
  b.Activated:Connect(function()selectedX=xx;selectedY=yy;render()end)
 end
end
local right=make("Frame",panel,{Position=UDim2.new(.59,0,.20,0),Size=UDim2.new(.39,0,.58,0),BackgroundTransparency=1})
local function rightBtn(txt,row,col)
 local w=.96
 local b=button(right,txt,UDim2.new(0,0,row,0),UDim2.new(w,0,.176,0),col)
 b.TextSize=12
 return b
end
local build=rightBtn("시설 건설",0,Color3.fromRGB(31,140,116))
local upgrade=rightBtn("시설 업그레이드",.205,Color3.fromRGB(43,113,175))
local remove=rightBtn("시설 철거",.41,Color3.fromRGB(163,88,80))
local teacher=rightBtn("선생님 고용",.615,Color3.fromRGB(134,101,189))
local help=rightBtn("학교 운영 안내",.82,Color3.fromRGB(83,109,138))
local picker=make("ScrollingFrame",panel,{Name="시설목록",Position=UDim2.new(.02,0,.81,0),Size=UDim2.new(.96,0,.16,0),
 BackgroundTransparency=1,BorderSizePixel=0,ScrollBarThickness=3,ScrollingDirection=Enum.ScrollingDirection.X,
 CanvasSize=UDim2.fromOffset(820,0),AutomaticCanvasSize=Enum.AutomaticSize.None})
make("UIListLayout",picker,{FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,5),SortOrder=Enum.SortOrder.LayoutOrder})
local typeOrder={"path","classroom","library","cafeteria","gym","lab","garden"}
local kindButtons={}
for i,kind in ipairs(typeOrder) do
 local cfg=Config.Items[kind]
 local b=button(picker,cfg.label.."\n"..cfg.cost.."원",UDim2.new(),UDim2.new(0,108,1,-3),cfg.color)
 b.LayoutOrder=i;b.TextSize=12
 kindButtons[kind]=b
 b.Activated:Connect(function()
  selectedKind=kind
  for k,other in pairs(kindButtons)do
   local stroke=other:FindFirstChild("Choice")
   if stroke then stroke.Enabled=(k==kind) end
  end
  info.Text=cfg.label.." 선택 · "..cfg.cost.."원 · 건설 버튼을 눌러."
 end)
 make("UIStroke",b,{Name="Choice",Color=Color3.fromRGB(255,245,155),Thickness=3,Enabled=i==2})
end
local tip=make("Frame",gui,{Visible=false,AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.37),Size=UDim2.new(.88,0,0,250),
 BackgroundColor3=Color3.fromRGB(29,46,67)})
round(tip,14);border(tip)
local tipText=label(tip,"학교 운영 안내\n\n① 복도를 이어서 시설 건설\n② 교실을 지어 학생 정원 확대\n③ 선생님 고용으로 수용력 확대\n④ 도서관·급식실·체육관·과학실로 만족도와 수익 개선\n⑤ 학교를 개교하면 운영 수익을 얻어\n⑥ 같은 시설을 누르고 업그레이드\n\n교문과 연결되지 않은 시설은 운영되지 않아.",UDim2.new(0,16,0,15),UDim2.new(1,-28,1,-65),14)
local close=button(tip,"닫기",UDim2.new(.15,0,1,-49),UDim2.new(.7,0,0,36),Color3.fromRGB(59,129,164))
close.Activated:Connect(function()tip.Visible=false end)
help.Activated:Connect(function()tip.Visible=true end)
local function send(action)
 remote:FireServer(action,selectedX,selectedY,selectedKind)
end
build.Activated:Connect(function()send("build")end)
upgrade.Activated:Connect(function()send("upgrade")end)
remove.Activated:Connect(function()send("remove")end)
teacher.Activated:Connect(function()send("hire")end)
toggle.Activated:Connect(function()send("toggle")end)
remote.OnClientEvent:Connect(function(kind,payload)
 if kind~="state" or type(payload)~="table" then return end
 state=payload
 render()
 if payload.message and payload.message~="" then
  title.Text="학교 건설 · "..payload.message
  task.delay(3,function()if title and title.Parent then title.Text="학교 건설 · 설계도" end end)
 end
end)
remote:FireServer("request")
