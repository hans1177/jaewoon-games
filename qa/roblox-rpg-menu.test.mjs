import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root='assets/roblox/rpg-menu/';
const model=fs.readFileSync(root+'RPGMenuModel.luau','utf8');
const menu=fs.readFileSync(root+'RPGMenu.luau','utf8');
const luau=process.env.VIBE2_LUAU_BINARY;
function run(source){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rpg-menu-'));
 try{
  const file=path.join(temp,'test.luau');fs.writeFileSync(file,source);
  const r=spawnSync(luau,[file],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr||r.stdout||String(r.error));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
test('internal asset is registered and vendored byte-identically into the game package',()=>{
 for(const name of ['RPGMenu.luau','RPGMenuModel.luau'])assert.equal(fs.readFileSync(root+name,'utf8'),fs.readFileSync('roblox-games/daechung-rpg/shared/'+name,'utf8'));
 const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
 const asset=registry.assets.find(a=>a.id==='roblox-rpg-system-menu-v1');
 assert.equal(asset.productionVerified,false);assert.equal(asset.verifiedCompanyReusable,false);
 assert.ok(asset.consumerGameIds.includes('daechung-rpg'));
 const client=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
 assert.match(client,/RPGMenu.install\(C,gui,p,/);
 assert.match(client,/startupOverlay.Parent==nil and not classPanel.Visible/);
});
test('inventory never fabricates unowned relics and quest progress comes from replicated state',{skip:!luau},()=>run(`
local Model=(function()${model}\nend)()
local config={Classes={BREAKER={Name='기사'}},WeaponBonus={0,8},ArmorBonus={0,10},Portals={{Name='초원'}},BossCompanions={{Id='ONE',Name='동료',Role='공격'}}}
local a={ClassId='BREAKER',WeaponTier=2,ArmorTier=1,RelicId='NONE'}
local rows=Model.equipment(a,config)
assert(#rows==2 and rows[1].tier==2 and rows[1].description:find('+8',1,true))
assert(#Model.equipment({},config)==0)
assert(#Model.filter(rows,'도구','')==0)
assert(#Model.filter(rows,'전체','무기')==1)
assert(not Model.quest({},config).active)
local q=Model.quest({QuestPortal=1,QuestKills=3,QuestNeed=5},config)
assert(q.active and q.ratio==.6 and q.text:find('3 / 5',1,true))
assert(Model.quest({QuestPortal=1,QuestKills=9,QuestNeed=5},config).ratio==1)
assert(not Model.companions({UnlockedCompanions='ONE_MORE'},config)[1].unlocked)
assert(Model.companions({UnlockedCompanions='ONE'},config)[1].unlocked)
for _,v in ipairs({{320,568},{393,852},{844,390},{1280,720}})do
 local layout=Model.layout(v[1],v[2]);assert(layout.width<=v[1]-24 and layout.height<=v[2]-24)
end
`));
test('menu opens, filters, equips real tools, preserves chat input and restores combat on close',{skip:!luau},()=>run(`
local Model=(function()${model}\nend)()
local function signal()
 local callbacks={};return {Connect=function(self,fn)table.insert(callbacks,fn);return{Disconnect=function()end}end,Fire=function(self,...)
  local copy=table.clone(callbacks);for _,fn in ipairs(copy)do fn(...)end
 end}
end
local instances={}
local methods={}
function methods:IsA(class)return self.ClassName==class or (class=='GuiObject' and (self.ClassName=='Frame' or self.ClassName=='TextLabel' or self.ClassName=='TextButton' or self.ClassName=='TextBox' or self.ClassName=='ScrollingFrame'))end
function methods:GetChildren()return table.clone(self.children)end
function methods:GetAttributes()return table.clone(self.attributes)end
function methods:SetAttribute(k,v)self.attributes[k]=v;self.AttributeChanged:Fire(k)end
function methods:GetAttribute(k)return self.attributes[k]end
function methods:GetPropertyChangedSignal(k)return signal()end
function methods:FindFirstChildOfClass(class)for _,c in ipairs(self.children)do if c:IsA(class)then return c end end end
function methods:Destroy()self.Parent=nil end
function methods:WaitForChild()return {}end
local Instance={new=function(class)
 local data={ClassName=class,children={},attributes={},ZIndex=1,Activated=signal(),ChildAdded=signal(),ChildRemoved=signal(),AttributeChanged=signal(),CharacterAdded=signal(),Destroying=signal()}
 local object=setmetatable({},{__index=function(_,k)return methods[k] or data[k]end,__newindex=function(self,k,v)
  if k=='Parent' then
   local old=data.Parent
   if old then for i,c in ipairs(old.children)do if c==self then table.remove(old.children,i);break end end end
   data[k]=v;if v then table.insert(v.children,self)end
   if old then old.ChildRemoved:Fire(self)end;if v then v.ChildAdded:Fire(self)end
  else data[k]=v end
 end});table.insert(instances,object);return object
end}
local Color3={fromRGB=function(...)return{}end,new=function(...)return{}end}
local Vector2={new=function(x,y)return{X=x,Y=y}end}
local UDim={new=function(...)return{}end}
local UDim2={new=function(...)return{}end,fromOffset=function(x,y)return{X=x,Y=y}end,fromScale=function(...)return{}end}
local Enum=setmetatable({},{__index=function(_,k)return setmetatable({},{__index=function(_,v)return v end})end})
local input={InputBegan=signal(),GamepadEnabled=false,focused=nil,GetFocusedTextBox=function(self)return self.focused end}
local selection={}
local game={GetService=function(_,name)return name=='UserInputService' and input or selection end}
local script={Parent={WaitForChild=function()return {}end}}
local require=function()return Model end
local task={defer=function(fn,...)fn(...)end}
local Menu=(function()${menu}\nend)()
local parent=Instance.new('PlayerGui')
local gui=Instance.new('ScreenGui');gui.AbsoluteSize=Vector2.new(393,852);gui.Parent=parent
local player=Instance.new('Player');player.Parent=parent
player:SetAttribute('WeaponTier',1);player:SetAttribute('ArmorTier',1);player:SetAttribute('Level',1)
local backpack=Instance.new('Backpack');backpack.Parent=player
local character=Instance.new('Model');player.Character=character
local humanoid=Instance.new('Humanoid');humanoid.Health=100;humanoid.Parent=character
local equipped=0
humanoid.EquipTool=function(_,tool)equipped+=1;tool.Parent=character end
humanoid.UnequipTools=function()for _,tool in ipairs(character:GetChildren())do if tool:IsA('Tool')then tool.Parent=backpack end end end
local tool=Instance.new('Tool');tool.Name='실제 도구';tool.Parent=backpack
local allowed=false;local combat=true
local api=Menu.install({Portals={},Classes={}},gui,player,{canOpen=function()return allowed end,onOpen=function(open)combat=not open end})
local function find(name)for i=#instances,1,-1 do if instances[i].Name==name and instances[i].Parent then return instances[i]end end error('missing '..name)end
api.button.Activated:Fire();assert(not api.isOpen())
allowed=true;api.button.Activated:Fire();assert(api.isOpen() and not combat)
find('Filter3').Activated:Fire();find('ItemAction').Activated:Fire();assert(equipped==1 and tool.Parent==character)
find('ItemAction').Activated:Fire();assert(tool.Parent==backpack)
input.focused={};input.InputBegan:Fire({KeyCode='B'},false);assert(api.isOpen())
input.focused=nil;input.InputBegan:Fire({KeyCode='Escape'},false);assert(not api.isOpen() and combat)
input.InputBegan:Fire({KeyCode='B'},false);assert(api.isOpen())
find('CloseMenu').Activated:Fire();assert(not api.isOpen() and combat)
`));
