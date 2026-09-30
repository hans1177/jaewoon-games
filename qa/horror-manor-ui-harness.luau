-- 파일명: qa/horror-manor-ui-harness.luau
-- 실제 클라이언트 코드를 삽입해 메뉴·모바일 배치·느린 접속의 상태 전환을 검증한다.
local function signal()
 local callbacks={}
 return {Connect=function(_,fn)table.insert(callbacks,fn)end,Fire=function(_,...)for _,fn in ipairs(callbacks)do fn(...)end end}
end
local all={}
local methods={}
function methods:GetChildren()
 local children={};for _,o in ipairs(all)do if o.Parent==self then table.insert(children,o)end end;return children
end
function methods:Destroy()self.Parent=nil end
function methods:FindFirstChildOfClass(class)for _,o in ipairs(self:GetChildren())do if o.ClassName==class then return o end end end
function methods:WaitForChild(name)return self[name]end
function methods:FindFirstChild(name)for _,o in ipairs(self:GetChildren())do if o.Name==name then return o end end end
function methods:GetPropertyChangedSignal(key)
 self.PropertySignals[key]=self.PropertySignals[key]or signal();return self.PropertySignals[key]
end
Instance={new=function(class)
 local values={ClassName=class,Activated=signal(),AttributeChanged=signal(),PropertySignals={},Visible=true,Enabled=true,Active=true,CanvasPosition={X=0,Y=0}}
 local o=setmetatable({}, {__index=function(_,k)return methods[k]or values[k]end,__newindex=function(_,k,v)
  local changed=values[k]~=v;values[k]=v
  if changed and values.PropertySignals[k]then values.PropertySignals[k]:Fire()end
 end})
 table.insert(all,o);return o
end}
local function enum()return setmetatable({}, {__index=function(_,k)return k end})end
Enum=setmetatable({}, {__index=function()return enum()end})
UDim={new=function(...)return {...}end}
UDim2={new=function(...)return {...}end,fromOffset=function(x,y)return {0,x,0,y}end,fromScale=function(x,y)return {x,0,y,0}end}
Vector2={new=function(x,y)return {X=x,Y=y}end,zero={X=0,Y=0}}
Vector3={new=function(...)return {...}end}
CFrame={lookAt=function(...)return {...}end}
Color3={fromRGB=function(...)return {...}end,new=function(...)return {...}end}
local deferred={}
task={spawn=function(fn)fn()end,defer=function(fn)table.insert(deferred,fn)end,delay=function()end,wait=function()end}
local function flush()while #deferred>0 do local queue=deferred;deferred={};for _,fn in ipairs(queue)do fn()end end end
local attrs={LobbyClientReady=true,PersonalLobbyOwner=7,RoundState="ROOM_BROWSER",MonsterForm="DRACULA",LobbyAppearance="SURVIVOR",Coins=100,MonsterXP=0}
local changes={}
local p=Instance.new("Player");p.UserId=7;p.DisplayName="Tester";p.PlayerGui=Instance.new("PlayerGui")
function p:GetAttribute(key)return attrs[key]end
function p:GetAttributeChangedSignal(key)changes[key]=changes[key]or signal();return changes[key]end
function p:SetAttribute(key,value)
 if attrs[key]==value then return end;attrs[key]=value
 if changes[key]then changes[key]:Fire()end;self.AttributeChanged:Fire(key)
end
p.PlayerScripts={WaitForChild=function()return "PLAYER_MODULE"end}
local controls={Enable=function()end,Disable=function()end}
local remote={OnClientEvent=signal(),sent={}}
function remote:FireServer(action,value)table.insert(self.sent,{action,value})end
local C={RemoteName="GameEvent",Actions=setmetatable({}, {__index=function(_,k)return k end}),Maps={{Id="SCHOOL",Name="학교"}},GhostCatalog={{Id="BRIDE",Name="처녀귀신",Origin="한국"}},MonsterForms={{Id="DRACULA",Name="드라큘라",UnlockXP=0}},Cosmetics={{Id="DEFAULT",Name="기본",Price=0}}}
local RS={Shared={GameConfig="CONFIG",ManorAssets="ASSETS",MonsterStories="STORIES"},WaitForChild=function()return remote end}
local Lighting={FindFirstChildOfClass=function()return nil end}
local services={Players={LocalPlayer=p},ReplicatedStorage=RS,Lighting=Lighting,RunService={RenderStepped=signal(),Heartbeat=signal()}}
game={GetService=function(_,name)return services[name]end}
workspace={CurrentCamera={},GetAttribute=function(_,key)return key=="PhysicalLobbyReady"end,GetAttributeChangedSignal=function()return signal()end}
local function require(id)
 if id=="CONFIG"then return C elseif id=="ASSETS"then return {IconsId=1} elseif id=="PLAYER_MODULE"then return {GetControls=function()return controls end}else return {}end
end
local function alive(o)
 while o do if o==p.PlayerGui then return true end;o=o.Parent end;return false
end
local function find(text)
 for i=#all,1,-1 do local o=all[i];if alive(o)and o.Text==text then return o end end
end
local function click(text)
 local o=assert(find(text),"Missing button: "..text);assert(o.ClassName=="TextButton");o.Activated:Fire();flush();return o
end
local function open(key)remote.OnClientEvent:Fire("MANOR_MENU",key);flush()end
local function sent(action)assert(remote.sent[#remote.sent][1]==action,"Incorrect remote action")end
-- __MANOR_CLIENT_SOURCE__
click("저택 들어가기")
local named={};for _,o in ipairs(all)do if o.Name then named[o.Name]=o end end
assert(named.FamilyNotebook.Visible==false,"Navigation obscures the lobby before user opens it")
click("수첩");assert(named.FamilyNotebook.Visible==true)
click("수첩");assert(named.FamilyNotebook.Visible==false)
click("출정");assert(find("오늘 밤의 출정"))
local function bounds(o,width,height)
 if not o or o.ClassName=="ScreenGui"or o==p.PlayerGui then return {x=0,y=0,w=width,h=height}end
 local parent=bounds(o.Parent,width,height);local size=o.Size or{0,0,0,0};local pos=o.Position or{0,0,0,0};local anchor=o.AnchorPoint or Vector2.zero
 local w=parent.w*size[1]+size[2];local h=parent.h*size[3]+size[4]
 for _,child in ipairs(o:GetChildren())do if child.ClassName=="UISizeConstraint"then w=math.min(w,child.MaxSize.X);h=math.min(h,child.MaxSize.Y)end end
 return{x=parent.x+parent.w*pos[1]+pos[2]-w*anchor.X,y=parent.y+parent.h*pos[3]+pos[4]-h*anchor.Y,w=w,h=h}
end
for _,viewport in ipairs({{320,520},{390,760},{740,274},{844,320},{1024,640}})do
 local head=bounds(named.ManorNameplate,viewport[1],viewport[2]);local commands=bounds(named.ManorCommands,viewport[1],viewport[2])
 assert(head.x+head.w<=commands.x,"Mobile header and controls overlap")
 assert(commands.y+commands.h<=52,"Controls obscure gameplay")
 local panel=find("오늘 밤의 출정").Parent;local rect=bounds(panel,viewport[1],viewport[2])
 assert(rect.x>=0 and rect.y>=0 and rect.x+rect.w<=viewport[1] and rect.y+rect.h<=viewport[2],"Menu clips the viewport")
 assert(rect.y>=commands.y+commands.h+8,"Menu overlaps mobile commands")
 local close=bounds(find("×"),viewport[1],viewport[2]);assert(close.w>=44 and close.h>=44,"Close target too small for touch")
end
print("MANOR_MOBILE_LAYOUT_QA=PASS:5")
assert(named.NotebookShade.Visible==true,"Open menu does not intercept background touches")
click("×");assert(named.NotebookShade.Visible==false,"Closed menu blocks movement")
open("CODE")
local input=assert(find(""));for _,o in ipairs(all)do if o.Name=="InvitationCode"and alive(o)then input=o end end
input.Text=" 123456 "
p:SetAttribute("Coins",99);p:SetAttribute("TimeLeft",3);flush()
assert(alive(input)and input.Text==" 123456 ","Attribute refresh reset code input or keyboard focus")
click("참가");sent("JOIN_ROOM_CODE");assert(remote.sent[#remote.sent][2]==" 123456 ")
click("출정 메뉴로");open("CODE");assert(find(" 123456 "),"Reopening code entry lost its draft")
open("BOOK");click("◇ 처녀귀신   0/3");assert(find("처녀귀신"))
local storyBody=find("처녀귀신").Parent:FindFirstChildOfClass("ScrollingFrame");storyBody.CanvasPosition=Vector2.new(0,85)
p:SetAttribute("Coins",98);flush();assert(find("처녀귀신")and find("한국 · 기록 0/3"),"Unseen ghost story was reset or unlocked")
assert(storyBody.CanvasPosition.Y==85,"Story refresh lost reading position")
p:SetAttribute("GhostProgress","BRIDE:1");flush();assert(find("한국 · 기록 1/3"),"Story progress did not refresh")
click("도감으로");assert(find("◈ 처녀귀신   1/3"))
open("RECORD");local requests=#remote.sent
remote.OnClientEvent:Fire("MANOR_RANKING",{{Name="수집가",Complete=2,Seen=5}})
assert(find("1. 수집가  ·  완성 2 / 발견 5"));assert(not find("수집가들의 기록을 가져오는 중"))
p:SetAttribute("Coins",97);p:SetAttribute("RoomMemberCount",1);flush();assert(#remote.sent==requests,"Unrelated refresh requested ranking again")
remote.OnClientEvent:Fire("MANOR_RANKING",{})
assert(not find("1. 수집가  ·  완성 2 / 발견 5"),"Ranking rows accumulated")
click("×");remote.OnClientEvent:Fire("MANOR_RANKING",{{Name="늦은 응답",Complete=0,Seen=1}})
assert(not find("1. 늦은 응답  ·  완성 0 / 발견 1"),"Closed menu accepted a late response")
open("PLAY");click("친구 경기 만들기");sent("CREATE_ROOM");assert(remote.sent[#remote.sent][2]=="FRIENDS")
p:SetAttribute("RoomFeedback","ERROR:예약 서버 생성 실패");flush();assert(named.NotebookPage.Visible,"Connection failure did not reopen departure controls")
p:SetAttribute("RoomServer",true);p:SetAttribute("RoomState","ROOM_WAITING");p:SetAttribute("RoomIsHost",true);p:SetAttribute("RoomAutoStart",false);p:SetAttribute("RoomCode","123456");p:SetAttribute("RoomMemberCount",2);flush()
open("PLAY");assert(find("친구 준비 완료 · 출정 시작"));assert(not find("친구 경기 만들기"));click("친구 준비 완료 · 출정 시작");sent("START_ROOM")
click("방 나가기 · 저택으로");sent("LEAVE_ROOM")
p:SetAttribute("RoomIsHost",false);flush();assert(not find("친구 준비 완료 · 출정 시작"));assert(find("방장이 출정을 시작할 때까지 기다려줘."))
p:SetAttribute("RoomAutoStart",true);flush();assert(find("참가자 연결 후 곧 출정해."));assert(not find("친구 준비 완료 · 출정 시작"))
p:SetAttribute("RoomState","INTERMISSION");p:SetAttribute("TimeLeft",2);flush();assert(not find("방 나가기 · 저택으로"));assert(find("출정까지 2초"))
open("DRESS");assert(find("인간 모습 · 선택 중"));assert(find("드라큘라 · 선택"));click("드라큘라 · 선택");sent("SELECT_LOBBY_FORM")
p:SetAttribute("LobbyAppearance","MONSTER");flush();assert(find("드라큘라 · 선택 중"));assert(find("인간 모습"))
local body=assert(find("드라큘라 · 선택 중")).Parent;body.CanvasPosition=Vector2.new(0,280)
p:SetAttribute("Coins",80);p:SetAttribute("MonsterXP",10);flush();assert(body.CanvasPosition.Y==280,"Selection refresh lost scroll position")
p:SetAttribute("RoundState","RUNNING");flush()
local gui;for _,o in ipairs(all)do if o.Name=="PersonalManorUI"then gui=o end end
assert(gui and gui.Enabled==false,"Lobby remained visible during combat")
open("PLAY");assert(named.NotebookPage.Visible==false,"Late lobby prompt opened over combat")
assert(named.NotebookShade.Visible==false,"Notebook intercepts combat touches")
print("MANOR_UI_RUNTIME_QA=PASS:22")

do
 local roomServer=true;local state="WAITING";local roomHostUserId=7;local roomStartRequested=false
 local roomSolo=false;local roomVisibility="FRIENDS";local roomExpectedCount=1;local roomFirstJoinAt=0
 local players={p};local Players={GetPlayers=function()return players end}
 local workspace={SetAttribute=function()end}
 local function roomMaxPlayers()return 8 end
 local function roomFeedback()end
 local function syncRoomState()end
 local function syncLobbyState()end
 -- __ROOM_START_SOURCE__
 local function tickWaiting()
 -- __ROOM_WAIT_SOURCE__
 end
 tickWaiting();assert(roomStartRequested==false,"Friend room started before host invited friends")
 startRoomMatch({UserId=8});assert(roomStartRequested==false,"Guest started the room")
 startRoomMatch(p);assert(roomStartRequested==true,"Host cannot start friend room")
 roomStartRequested=false;state="RUNNING";startRoomMatch(p);assert(roomStartRequested==false,"Started a running match")
 state="WAITING";roomSolo=true;tickWaiting();assert(roomStartRequested==true,"Solo fast start regressed")
 roomStartRequested=false;roomSolo=false;roomVisibility="PUBLIC";tickWaiting();assert(roomStartRequested==true,"Public fast start regressed")
 roomStartRequested=false;roomVisibility="PRIVATE";tickWaiting();assert(roomStartRequested==false,"Private room bypassed host")
 print("MANOR_ROOM_RUNTIME_QA=PASS:7")
end

-- 로딩 회귀: 실제 로딩 루프를 지연 접속·공중 스폰·전투 전환에서 실행한다.
do
 local scenarios={
  {name="grounded lobby",steps={{round="ROOM_BROWSER",grounded=true,lobby=true}}},
  {name="airborne lobby",steps={{round="ROOM_BROWSER",grounded=false,lobby=true},{round="ROOM_BROWSER",grounded=true,lobby=true}}},
  {name="late solo join",steps={{round="RUNNING",map=false},{round="RUNNING",map=true}}},
  {name="spectator join",steps={{round="SPECTATING",map=true}}},
  {name="result join",steps={{round="RESULT_SURVIVOR",map=true}}},
  {name="transition before lobby loads",steps={{round="ROOM_BROWSER"},{round="RUNNING",map=true}}},
 }
 for _,scenario in ipairs(scenarios)do
  local step=1;local finished=false;local loadingVisible=true
  local function current()return scenario.steps[step]end
  local root={Position=setmetatable({X=0,Y=3,Z=0},{__sub=function(a,b)return{X=a.X-b.X,Y=a.Y-b.Y,Z=a.Z-b.Z}end})}
  local char={FindFirstChild=function()return root end,FindFirstChildOfClass=function()return{FloorMaterial=current().grounded and "Wood"or"Air"}end}
  local p={Parent=true,UserId=7,Character=char,GetAttribute=function(_,key)
   if key=="RoundState"then return current().round
   elseif key=="PersonalLobbyOwner"then return 7
   elseif key=="LobbySpawnGroundedAt"then return 10 end
  end}
  local ground={Position={X=0,Y=0,Z=0},Size={X=84,Y=1,Z=90}}
  local room={FindFirstChild=function()return ground end}
  local lobby={FindFirstChild=function()return room end}
  local workspace={FindFirstChild=function(_,name)
   if name=="MidnightLobby"and current().lobby then return lobby end
   if name=="MidnightArena"and current().map then return {}end
  end,GetAttribute=function(_,key)
   if key=="PhysicalLobbyReady"then return current().lobby end
   if key=="MapReady"then return current().map end
  end}
  local task={spawn=function(fn)fn()end,wait=function()
   step+=1;assert(step<=#scenario.steps,"Loading never finished: "..scenario.name)
  end}
  local ContentProvider={PreloadAsync=function()end};local lobbyBgm={};local retry={}
  local function setLoadingProgress()end
  local function finishLoading()
   assert(step==#scenario.steps,"Loading dismissed before ready: "..scenario.name)
   finished=true;loadingVisible=false
  end
  -- __LOADING_SOURCE__
  assert(finished,"Loading blocked: "..scenario.name)
 end
 print("MANOR_LOADING_RUNTIME_QA=PASS:6")
end

-- 서버 스폰: 대기 중 라운드가 바뀌어도 이전 로비 목적지를 적용하지 않는다.
do
 for _,scenario in ipairs({"lobby","lobby wait","avatar wait","replaced avatar"})do
  local state="WAITING";local waits=0;local target=nil
  local h={};local r={};local player={UserId=7,Parent=true};local attrs={Role="SURVIVOR"}
  local char={Parent=true,GetDescendants=function()return {}end}
  function char:WaitForChild(name)
   if scenario=="avatar wait"then state="RUNNING"end
   return name=="Humanoid"and h or r
  end
  player.Character=char
  function player:GetAttribute(key)return attrs[key]end
  function player:SetAttribute(key,value)attrs[key]=value end
  local task={wait=function()
   waits+=1;assert(waits<4,"Spawn remains blocked")
   if waits==2 then
    if scenario=="lobby wait"then state="RUNNING"end
    if scenario=="replaced avatar"then player.Character={}end
   end
  end,delay=function()end}
  local workspace={GetAttribute=function(_,key)
   if key=="PhysicalLobbyReady"then return scenario~="lobby wait"and(scenario~="replaced avatar"or waits>=2)end
   if key=="MapReady"then return true end
  end,GetServerTimeNow=function()return 1 end}
  local lobbySpawnLocation={Parent=true};local foundationSpawn={Parent=true}
  local survivorSpawns={"arena"};local monsterSpawns={"monster"}
  local function setEnergy()end;local function energyMax()return 100 end
  local function personalSpawn()return "lobby",nil,lobbySpawnLocation end
  local function teleport(_,pos)target=pos end
  local function applyRoleVisual()end;local function setRole()end;local function restoreMovement()end
  -- __CHARACTER_SOURCE__
  onCharacter(player)
  local expected=scenario=="lobby"and"lobby"or scenario=="replaced avatar"and nil or"arena"
  if scenario=="replaced avatar"then assert(target==nil,"Old callback moved the replacement avatar")
  else assert(target==expected,"Spawn used stale round state: "..scenario)end
 end
 print("MANOR_SPAWN_RUNTIME_QA=PASS:4")
end

do
 local roomServer=true;local state="WAITING";local studioRoomFallback=false
 local allowed=true;local fail=true;local calls=0;local feedback=nil
 local function roomActionReady()return allowed end
 local function roomFeedback(_,kind)feedback=kind end
 local function warn()end
 local game={PlaceId=98222620265768}
 local TeleportService={TeleportAsync=function()calls+=1;if fail then error("connection lost")end end}
 -- __ROOM_LEAVE_SOURCE__
 leaveReservedRoom(p);assert(calls==1 and feedback=="ERROR","Return failure remained stuck on connecting")
 fail=false;leaveReservedRoom(p);assert(calls==2 and feedback=="TELEPORTING","Return retry failed")
 allowed=false;leaveReservedRoom(p);assert(calls==2,"Return click flood ignored cooldown")
 allowed=true;state="RUNNING";leaveReservedRoom(p);assert(calls==2,"Return bypassed running match")
 print("MANOR_RETURN_RUNTIME_QA=PASS:4")
end
