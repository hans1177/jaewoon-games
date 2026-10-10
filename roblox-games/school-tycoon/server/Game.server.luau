-- 파일명: Game.server.luau
-- 임포트: 서버 권한, 저장, 월드
local Players=game:GetService("Players")
local DataStoreService=game:GetService("DataStoreService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local TweenService=game:GetService("TweenService")
local Config=require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameConfig"))
local remote=ReplicatedStorage:FindFirstChild(Config.RemoteName)
if not remote then remote=Instance.new("RemoteEvent");remote.Name=Config.RemoteName;remote.Parent=ReplicatedStorage end
local store
pcall(function() store=DataStoreService:GetDataStore(Config.SaveKey) end)
local schoolWorld=workspace:FindFirstChild("SchoolTycoonWorld")
if schoolWorld then schoolWorld:Destroy() end
schoolWorld=Instance.new("Folder");schoolWorld.Name="SchoolTycoonWorld";schoolWorld.Parent=workspace
local sessions={}
local nextPlot=0
local SIZE=Config.GridSize
local CELL=Config.TileSize
local WORLD_LIMIT=1e9
local function key(x,y)return x..","..y end
local function copyTiles(raw)
 local out={}
 if type(raw)~="table" then return out end
 for k,v in pairs(raw)do
  if type(k)=="string" and type(v)=="table" then
   local x,y=k:match("^(%d+),(%d+)$");x=tonumber(x);y=tonumber(y)
   if x and y and x>=1 and x<=SIZE and y>=1 and y<=SIZE and not(x==4 and y==8) and Config.Items[v.kind] then
    out[key(x,y)]={kind=v.kind,level=math.clamp(math.floor(tonumber(v.level)or 1),1,Config.Items[v.kind].maxLevel or 1)}
   end
  end
 end
 return out
end
local function fresh()
 return {version=Config.SaveVersion,coins=Config.StartingCoins,rep=Config.StartingReputation,teachers=1,
  open=false,days=1,earnings=0,students=0,goal=1,
  tiles={["4,7"]={kind="path",level=1},["4,6"]={kind="path",level=1},["3,6"]={kind="classroom",level=1}}}
end
local function safeNumber(v,fall,low,high)
 local n=tonumber(v)
 if not n or n~=n or n<low or n>high then return fall end
 return math.floor(n)
end
local function load(player)
 local state=fresh()
 if not store then return state end
 local ok,old=pcall(function()return store:GetAsync(tostring(player.UserId))end)
 if ok and type(old)=="table" and old.version==Config.SaveVersion then
  state.coins=safeNumber(old.coins,state.coins,0,WORLD_LIMIT)
  state.rep=safeNumber(old.rep,state.rep,0,100)
  state.teachers=safeNumber(old.teachers,1,0,Config.MaxTeachers)
  state.days=safeNumber(old.days,1,1,1000000)
  state.earnings=safeNumber(old.earnings,0,0,WORLD_LIMIT)
  state.goal=safeNumber(old.goal,1,1,#Config.Goals+1)
  state.open=old.open==true
  state.tiles=copyTiles(old.tiles)
 end
 return state
end
local function save(player,session)
 if not store or not session then return end
 local state=session.state
 local payload={version=Config.SaveVersion,coins=state.coins,rep=state.rep,teachers=state.teachers,days=state.days,earnings=state.earnings,goal=state.goal,open=state.open,tiles=state.tiles}
 local ok,err=pcall(function()store:SetAsync(tostring(player.UserId),payload)end)
 if not ok then warn("[학교 타이쿤] 저장 오류 "..tostring(err)) end
end
-- 월드: 각 사용자는 독립된 학교 부지를 갖는다.
local function part(parent,name,size,cf,color,material)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.CanCollide=true
 p.Size=size;p.CFrame=cf;p.Color=color;p.Material=material or Enum.Material.SmoothPlastic;p.Parent=parent
 return p
end
local function labelOn(parent,txt,pos,width)
 local anchor=part(parent,"안내판",Vector3.new(width,2.7,.35),CFrame.new(pos),Color3.fromRGB(28,45,66))
 local b=Instance.new("BillboardGui");b.Size=UDim2.fromOffset(190,40);b.StudsOffsetWorldSpace=Vector3.new(0,1.3,0);b.AlwaysOnTop=true;b.MaxDistance=75;b.Parent=anchor
 local t=Instance.new("TextLabel");t.BackgroundTransparency=1;t.Size=UDim2.fromScale(1,1);t.Text=txt;t.TextScaled=true;t.Font=Enum.Font.GothamBold;t.TextColor3=Color3.new(1,1,1);t.Parent=b
end
local function cellPos(session,x,y)
 return Vector3.new(session.origin+(x-4.5)*CELL,0,(y-4.5)*CELL)
end
local function roomModel(session,x,y,item)
 local kind=item.kind
 local entry=Config.Items[kind]
 local old=session.models[key(x,y)]
 if old then old:Destroy() end
 local m=Instance.new("Model");m.Name="시설_"..key(x,y);m.Parent=session.folder
 session.models[key(x,y)]=m
 local p=cellPos(session,x,y)
 if kind=="path" then
  part(m,"복도_바닥",Vector3.new(CELL-.5,.4,CELL-.5),CFrame.new(p+Vector3.new(0,.35,0)),entry.color,Enum.Material.Concrete)
  for i=-1,1,2 do
   part(m,"복도_테두리",Vector3.new(.35,.65,CELL-2),CFrame.new(p+Vector3.new(i*(CELL/2-1),.5,0)),Color3.fromRGB(234,223,197))
  end
 elseif kind=="garden" then
  part(m,"정원",Vector3.new(CELL-1,.45,CELL-1),CFrame.new(p+Vector3.new(0,.45,0)),Color3.fromRGB(74,150,91),Enum.Material.Grass)
  for i=1,3 do
   local ox=(i-2)*4;local oz=i%2==0 and -4 or 3
   part(m,"꽃줄기",Vector3.new(.5,2,.5),CFrame.new(p+Vector3.new(ox,1.4,oz)),Color3.fromRGB(62,115,64))
   local bloom=part(m,"꽃",Vector3.new(1.5,1.5,1.5),CFrame.new(p+Vector3.new(ox,2.6,oz)),i==2 and Color3.fromRGB(255,214,98) or Color3.fromRGB(255,139,170))
   bloom.Shape=Enum.PartType.Ball
  end
 else
  local tint=entry.color
  part(m,"기초",Vector3.new(CELL-2,.8,CELL-2),CFrame.new(p+Vector3.new(0,.55,0)),Color3.fromRGB(229,220,202),Enum.Material.Concrete)
  for _,side in ipairs({-1,1}) do
   part(m,"측벽",Vector3.new(.8,9,CELL-3),CFrame.new(p+Vector3.new(side*(CELL/2-1.6),5,0)),tint)
   local glass=part(m,"창문",Vector3.new(1,3,5),CFrame.new(p+Vector3.new(side*(CELL/2-1.05),6,0)),Color3.fromRGB(181,227,244),Enum.Material.Glass);glass.Transparency=.2
  end
  part(m,"후벽",Vector3.new(CELL-2,9,.8),CFrame.new(p+Vector3.new(0,5,-CELL/2+1.7)),tint)
  for _,a in ipairs({-1,1})do
   part(m,"전면벽",Vector3.new(4.5,9,.8),CFrame.new(p+Vector3.new(a*4.9,5,CELL/2-1.7)),tint)
  end
  local door=part(m,"문",Vector3.new(4.2,6.3,.65),CFrame.new(p+Vector3.new(0,3.9,CELL/2-1.5)),Color3.fromRGB(101,74,58),Enum.Material.Wood)
  door.CanCollide=false
  part(m,"지붕",Vector3.new(CELL-1,1.1,CELL-1),CFrame.new(p+Vector3.new(0,10.1,0)),Color3.fromRGB(46,65,88),Enum.Material.Slate)
  part(m,"지붕_테두리",Vector3.new(CELL-.5,.4,CELL-.5),CFrame.new(p+Vector3.new(0,10.8,0)),tint)
  local furniture=kind=="gym" and "운동기구" or kind=="cafeteria" and "급식대" or kind=="library" and "책장" or kind=="lab" and "실험대" or "책상"
  for i=1,3 do
   local xoff=(i-2)*4
   part(m,furniture,Vector3.new(3,2,2.1),CFrame.new(p+Vector3.new(xoff,2.1,-2)),Color3.fromRGB(158,111,65),Enum.Material.Wood)
  end
  labelOn(m,entry.label.." "..tostring(item.level).."단계",p+Vector3.new(0,10.9,CELL/2-1),10)
 end
end
local function pathNetwork(state)
 local reached={["4,8"]=true}
 local q={{4,8}};local h=1
 while q[h] do
  local xy=q[h];h+=1
  for _,d in ipairs({{0,1},{0,-1},{1,0},{-1,0}}) do
   local x,y=xy[1]+d[1],xy[2]+d[2];local k=key(x,y)
   if x>=1 and x<=SIZE and y>=1 and y<=SIZE and not reached[k] then
    local tile=state.tiles[k]
    if tile and tile.kind=="path" then reached[k]=true;table.insert(q,{x,y}) end
   end
  end
 end
 return reached
end
local function connected(x,y,network)
 for _,d in ipairs({{0,1},{0,-1},{1,0},{-1,0}})do
  if network[key(x+d[1],y+d[2])] then return true end
 end
 return false
end
local function numbers(state)
 local network=pathNetwork(state)
 local capacity,rooms,quality,decor=0,0,0,0
 for k,t in pairs(state.tiles) do
  local x,y=k:match("^(%d+),(%d+)$");x=tonumber(x);y=tonumber(y)
  if t.kind=="garden" then decor+=1 end
  if t.kind~="garden" and t.kind~="path" and connected(x,y,network) then
   local cfg=Config.Items[t.kind];rooms+=1;capacity+=cfg.capacity*t.level
   quality+=t.kind=="library" and 3 or t.kind=="gym" and 4 or t.kind=="lab" and 5 or t.kind=="cafeteria" and 5 or 1
  end
 end
 local teachers=state.teachers
 local students=math.min(capacity,teachers*24,math.max(0,math.floor((state.rep+quality)*.55)+rooms*4))
 local satisfaction=math.clamp(40+teachers*5+decor*4+quality+math.floor(state.rep/5)-math.floor(math.max(0,students-teachers*14)*1.4),15,100)
 return {students=students,capacity=capacity,rooms=rooms,quality=quality,decor=decor,satisfaction=satisfaction,network=network}
end
local function snapshot(session)
 local s=session.state
 local stats=numbers(s)
 s.students=stats.students
 return {coins=s.coins,rep=s.rep,teachers=s.teachers,open=s.open,days=s.days,earnings=s.earnings,students=stats.students,
  capacity=stats.capacity,rooms=stats.rooms,satisfaction=stats.satisfaction,goal=s.goal,tiles=s.tiles,plot=session.index,message=session.message or ""}
end
local function update(player,session,msg)
 if not player.Parent then return end
 session.message=msg
 remote:FireClient(player,"state",snapshot(session))
end
local function createPlot(player,session)
 local f=Instance.new("Folder");f.Name="학교_"..tostring(player.UserId);f.Parent=schoolWorld;session.folder=f
 local o=session.origin
 part(f,"잔디_부지",Vector3.new(155,1.1,164),CFrame.new(o,-.5,0),Color3.fromRGB(104,167,108),Enum.Material.Grass)
 part(f,"바닥_출입구",Vector3.new(CELL-.5,.4,CELL-1),CFrame.new(cellPos(session,4,8)+Vector3.new(0,.2,0)),Color3.fromRGB(224,214,183),Enum.Material.Concrete)
 labelOn(f,player.DisplayName.."의 학교",Vector3.new(o,8,86),28)
 local gate=part(f,"교문",Vector3.new(18,1.4,1.2),CFrame.new(o,6,86),Color3.fromRGB(250,216,121));gate.CanCollide=false
 for _,dx in ipairs({-9,9})do part(f,"교문기둥",Vector3.new(2,10,2),CFrame.new(o+dx,4.5,86),Color3.fromRGB(230,220,209)) end
 for x=1,SIZE do
  for y=1,SIZE do
   local pos=cellPos(session,x,y)
   local ground=part(f,"구획_"..key(x,y),Vector3.new(CELL-.75,.16,CELL-.75),CFrame.new(pos+Vector3.new(0,-.2,0)),Color3.fromRGB((x+y)%2==0 and 112 or 106,173,109),Enum.Material.Grass)
   ground.CanCollide=false
   local t=session.state.tiles[key(x,y)]
   if t then roomModel(session,x,y,t) end
  end
 end
end
local function humanoidStudent(session,i)
 local description=Instance.new("HumanoidDescription")
 description.HeadColor=Color3.fromRGB(242,197,154)
 description.TorsoColor=Color3.fromRGB(74,113,181)
 description.LeftArmColor=Color3.fromRGB(242,197,154);description.RightArmColor=Color3.fromRGB(242,197,154)
 description.LeftLegColor=Color3.fromRGB(54,69,96);description.RightLegColor=Color3.fromRGB(54,69,96)
 local ok,model=pcall(function()return Players:CreateHumanoidModelFromDescription(description,Enum.HumanoidRigType.R15)end)
 description:Destroy()
 if not ok or not model then return end
 model.Name="학생"..i;model.Parent=session.folder
 local root=model:FindFirstChild("HumanoidRootPart")
 local hum=model:FindFirstChildOfClass("Humanoid")
 if not root or not hum then model:Destroy();return end
 root.CFrame=CFrame.new(cellPos(session,4,8)+Vector3.new((i%3-1)*2,4,0))
 hum.WalkSpeed=8+(i%3)*2;hum.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None
 local animator=hum:FindFirstChildOfClass("Animator")
 if not animator then animator=Instance.new("Animator");animator.Parent=hum end
 session.actors[i]=model
end
local function updateStudents(session)
 local s=session.state;local n=numbers(s)
 local desired=s.open and math.min(Config.MaxStudentActors,math.ceil(n.students/5)) or 0
 for i=desired+1,#session.actors do if session.actors[i] then session.actors[i]:Destroy() end;session.actors[i]=nil end
 for i=1,desired do if not session.actors[i] then humanoidStudent(session,i)end end
 local stops={}
 for k,t in pairs(s.tiles) do
  if t.kind~="path" and t.kind~="garden" then
   local x,y=k:match("^(%d+),(%d+)$");x=tonumber(x);y=tonumber(y)
   if connected(x,y,n.network) then table.insert(stops,cellPos(session,x,y)) end
  end
 end
 for i=1,desired do
  local model=session.actors[i];local hum=model and model:FindFirstChildOfClass("Humanoid")
  if hum and #stops>0 then
   local idx=((session.walkCycle+i-2)%#stops)+1
   hum:MoveTo(stops[idx]+Vector3.new((i%3-1)*3,2,2))
  end
 end
 session.walkCycle+=1
end
local function teleportPlayer(player,session,char)
 local root=char:WaitForChild("HumanoidRootPart",10)
 if root then root.CFrame=CFrame.new(cellPos(session,4,8)+Vector3.new(0,5,3)) end
end
local function finishGoal(state)
 local goal=Config.Goals[state.goal]
 if not goal then return nil end
 local n=numbers(state)
 if n.students<goal.students then return nil end
 state.coins+=goal.reward;state.goal+=1
 return goal.reward
end
-- 메인: 모든 재화·배치·업그레이드 검증은 서버에서 처리한다.
local function perform(player,session,action,x,y,kind)
 local s=session.state
 if action=="toggle" then
  local n=numbers(s)
  if not s.open and (n.rooms==0 or n.capacity==0) then return "교문과 복도로 연결된 교실부터 지어." end
  s.open=not s.open
  return s.open and "학교 개교! 학생들이 등교하고 있어." or "학교를 잠시 닫았어."
 end
 if action=="hire" then
  if s.teachers>=Config.MaxTeachers then return "선생님은 최대 12명까지야." end
  if s.coins<Config.TeacherCost then return "선생님 고용 비용이 부족해." end
  s.coins-=Config.TeacherCost;s.teachers+=1
  return "선생님이 합류했어!"
 end
 x=tonumber(x);y=tonumber(y)
 if not x or not y or x%1~=0 or y%1~=0 or x<1 or x>SIZE or y<1 or y>SIZE then return "구획을 선택해." end
 if x==4 and y==8 then return "교문은 변경할 수 없어." end
 local k=key(x,y);local current=s.tiles[k]
 if action=="build" then
  if current then return "이미 시설이 있는 칸이야." end
  if type(kind)~="string" or not Config.Items[kind] then return "시설을 선택해." end
  local cfg=Config.Items[kind]
  if s.coins<cfg.cost then return "건설 비용이 부족해." end
  local network=pathNetwork(s)
  if kind~="garden" and not connected(x,y,network) then return "교문과 이어진 복도 옆에 지어야 해." end
  s.coins-=cfg.cost;s.tiles[k]={kind=kind,level=1}
  roomModel(session,x,y,s.tiles[k])
  return cfg.label.." 건설 완료!"
 elseif action=="upgrade" then
  if not current then return "업그레이드할 시설이 없어." end
  local cfg=Config.Items[current.kind]
  if current.level>=cfg.maxLevel then return "최대 단계야." end
  local price=cfg.upCost*current.level
  if s.coins<price then return "업그레이드 비용이 부족해." end
  s.coins-=price;current.level+=1
  roomModel(session,x,y,current)
  return cfg.label.." "..current.level.."단계!"
 elseif action=="remove" then
  if not current then return "철거할 시설이 없어." end
  local cfg=Config.Items[current.kind]
  s.tiles[k]=nil
  local mdl=session.models[k]
  if mdl then mdl:Destroy();session.models[k]=nil end
  s.coins+=math.floor(cfg.cost*.35)
  return "시설 철거 완료. 건설비 35%를 돌려받았어."
 end
 return "알 수 없는 행동이야."
end
remote.OnServerEvent:Connect(function(player,action,x,y,kind)
 local session=sessions[player]
 if not session then return end
 if type(action)~="string" then return end
 local now=os.clock()
 if now-(session.lastAction or 0)<.16 then return end
 session.lastAction=now
 if action=="request" then update(player,session,"");return end
 if action~="build" and action~="upgrade" and action~="remove" and action~="hire" and action~="toggle" then return end
 local ok,message=pcall(perform,player,session,action,x,y,kind)
 if not ok then warn("[학교 타이쿤] 행동 오류 "..tostring(message));update(player,session,"잠시 후 다시 시도해.");return end
 local award=finishGoal(session.state)
 if award then message=message.." 목표 보상 +"..award.."코인!" end
 update(player,session,message)
 updateStudents(session)
end)
Players.PlayerAdded:Connect(function(player)
 nextPlot+=1
 local session={index=nextPlot,origin=(nextPlot-1)*190,state=load(player),models={},actors={},walkCycle=0,lastAction=0}
 sessions[player]=session
 createPlot(player,session)
 player.CharacterAdded:Connect(function(char)teleportPlayer(player,session,char)end)
 if player.Character then task.defer(teleportPlayer,player,session,player.Character)end
 update(player,session,"시설을 배치해 학교를 성장시켜 봐.")
 task.spawn(function()
  while sessions[player]==session and player.Parent do
   task.wait(Config.TickSeconds)
   if sessions[player]~=session then break end
   local s=session.state
   if s.open then
    local stats=numbers(s);local gross=0
    for k,t in pairs(s.tiles)do
     if t.kind~="path" and t.kind~="garden" and Config.Items[t.kind] then
      local x,y=k:match("^(%d+),(%d+)$")
      if connected(tonumber(x),tonumber(y),stats.network) then
       gross+=Config.Items[t.kind].income*t.level
      end
     end
    end
    local earned=math.floor(gross*stats.satisfaction/100)-s.teachers*Config.TeacherSalary
    earned=math.max(0,earned)
    s.coins=math.min(WORLD_LIMIT,s.coins+earned);s.earnings+=earned
    s.days+=1
    s.rep=math.clamp(s.rep+(stats.satisfaction>=75 and 1 or -1),0,100)
    local award=finishGoal(s)
    update(player,session,award and ("신입생 목표 달성! +"..award.."코인") or ("운영 수익 +"..earned.."코인"))
   end
   updateStudents(session)
  end
 end)
 task.spawn(function()
  while sessions[player]==session and player.Parent do
   task.wait(90)
   if sessions[player]==session then save(player,session) end
  end
 end)
end)
Players.PlayerRemoving:Connect(function(player)
 local session=sessions[player]
 if not session then return end
 save(player,session)
 sessions[player]=nil
 if session.folder then session.folder:Destroy() end
end)
game:BindToClose(function()
 for p,s in pairs(sessions)do save(p,s)end
end)
