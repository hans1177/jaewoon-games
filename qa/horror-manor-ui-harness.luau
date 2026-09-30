-- 실제 ManorLobby.client.luau를 아래 지점에 삽입해 메뉴 클릭과 속성 갱신을 검증한다.
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
Instance={new=function(class)
 local values={ClassName=class,Activated=signal(),AttributeChanged=signal(),Visible=true,Enabled=true,Active=true,CanvasPosition={X=0,Y=0}}
 local o=setmetatable({}, {__index=function(_,k)return methods[k]or values[k]end,__newindex=function(_,k,v)values[k]=v end})
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
local C={RemoteName="GameEvent",Actions=setmetatable({}, {__index=function(_,k)return k end}),Maps={{Id="SCHOOL",Name="학교"}},GhostCatalog={},MonsterForms={{Id="DRACULA",Name="드라큘라",UnlockXP=0}},Cosmetics={{Id="DEFAULT",Name="기본",Price=0}}}
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
end
print("MANOR_MOBILE_LAYOUT_QA=PASS:5")
open("PLAY");click("친구 경기 만들기");sent("CREATE_ROOM");assert(remote.sent[#remote.sent][2]=="FRIENDS")
p:SetAttribute("RoomServer",true);p:SetAttribute("RoomState","ROOM_WAITING");p:SetAttribute("RoomIsHost",true);p:SetAttribute("RoomAutoStart",false);p:SetAttribute("RoomCode","123456");p:SetAttribute("RoomMemberCount",2);flush()
open("PLAY");assert(find("친구 준비 완료 · 출정 시작"));assert(not find("친구 경기 만들기"));click("친구 준비 완료 · 출정 시작");sent("START_ROOM")
click("방 나가기 · 저택으로");sent("LEAVE_ROOM")
p:SetAttribute("RoomIsHost",false);flush();assert(not find("친구 준비 완료 · 출정 시작"));assert(find("방장이 출정을 시작할 때까지 기다려줘."))
p:SetAttribute("RoomAutoStart",true);flush();assert(find("참가자 연결 후 곧 출정해."));assert(not find("친구 준비 완료 · 출정 시작"))
p:SetAttribute("RoomState","INTERMISSION");flush();assert(not find("방 나가기 · 저택으로"))
open("DRESS");assert(find("인간 모습 · 선택 중"));assert(find("드라큘라 · 선택"));click("드라큘라 · 선택");sent("SELECT_LOBBY_FORM")
p:SetAttribute("LobbyAppearance","MONSTER");flush();assert(find("드라큘라 · 선택 중"));assert(find("인간 모습"))
local body=assert(find("드라큘라 · 선택 중")).Parent;body.CanvasPosition=Vector2.new(0,280)
p:SetAttribute("Coins",80);p:SetAttribute("MonsterXP",10);flush();assert(body.CanvasPosition.Y==280,"Selection refresh lost scroll position")
p:SetAttribute("RoundState","RUNNING");flush()
local gui;for _,o in ipairs(all)do if o.Name=="PersonalManorUI"then gui=o end end
assert(gui and gui.Enabled==false,"Lobby remained visible during combat")
print("MANOR_UI_RUNTIME_QA=PASS:10")

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
