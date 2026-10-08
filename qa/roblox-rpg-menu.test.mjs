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
local party=Model.partySummary({PartyCount=9,PartyKills=4,Contribution=7,RoomCode=3,UnlockedCompanions='ONE'},config)
assert(party.size==4 and party.companionCount==3 and party.companionSlots==3)
assert(party.unlockedCount==1 and party.totalBossCompanions==1 and party.huntKills==4 and party.contribution==7 and party.roomCode==3)
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
 local object=setmetatable({},{__index=function(_,k)
  if methods[k] then return methods[k] end
  if data[k]~=nil then return data[k] end
  for _,child in ipairs(data.children)do if child.Name==k then return child end end
 end,__newindex=function(self,k,v)
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
player:SetAttribute('Gold',250);player:SetAttribute('CurrentZone',0)
local backpack=Instance.new('Backpack');backpack.Parent=player
local character=Instance.new('Model');player.Character=character
local humanoid=Instance.new('Humanoid');humanoid.Health=100;humanoid.Parent=character
local equipped=0
humanoid.EquipTool=function(_,tool)equipped+=1;tool.Parent=character end
humanoid.UnequipTools=function()for _,tool in ipairs(character:GetChildren())do if tool:IsA('Tool')then tool.Parent=backpack end end end
local tool=Instance.new('Tool');tool.Name='실제 도구';tool.Parent=backpack
local allowed=false;local combat=true
local weaponOrders=0;local armorOrders=0
local api=Menu.install({Portals={},Classes={},WeaponPrices={50,120,240},ArmorPrices={45,110,220}},gui,player,{
 canOpen=function()return allowed end,onOpen=function(open)combat=not open end,
 buyWeapon=function()weaponOrders+=1 end,buyArmor=function()armorOrders+=1 end
})
local function find(name)for i=#instances,1,-1 do if instances[i].Name==name and instances[i].Parent then return instances[i]end end error('missing '..name)end
api.button.Activated:Fire();assert(not api.isOpen())
allowed=true;api.button.Activated:Fire();assert(api.isOpen() and not combat)
find('Tab3').Activated:Fire()
assert(find('CharacterSummary').Text:find('Lv.1',1,true))
find('Tab4').Activated:Fire()
assert(find('ShopSummary').Text:find('골드 250',1,true))
find('BuyWeapon').Activated:Fire();find('BuyArmor').Activated:Fire()
assert(weaponOrders==1 and armorOrders==1,'shop callbacks belong to client owner')
player:SetAttribute('Gold',0)
assert(not find('BuyWeapon').Active and not find('BuyArmor').Active,'no client-side false purchase')
find('Tab1').Activated:Fire()
local stableSlot=find('InventorySlot1');player:SetAttribute('Gold',10);assert(find('InventorySlot1')==stableSlot)
find('Filter3').Activated:Fire();find('ItemAction').Activated:Fire();assert(equipped==1 and tool.Parent==character)
find('ItemAction').Activated:Fire();assert(tool.Parent==backpack)
input.focused={};input.InputBegan:Fire({KeyCode='B'},false);assert(api.isOpen())
input.focused=nil;input.InputBegan:Fire({KeyCode='Escape'},false);assert(not api.isOpen() and combat)
input.InputBegan:Fire({KeyCode='B'},false);assert(api.isOpen())
find('CloseMenu').Activated:Fire();assert(not api.isOpen() and combat)
`));

test('character and merchant pages use actual replicated state and server requests without changing item prices',()=>{
 const config=fs.readFileSync('roblox-games/daechung-rpg/shared/GameConfig.luau','utf8');
 const server=fs.readFileSync('roblox-games/daechung-rpg/server/Game.server.luau','utf8');
 const client=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
 const shared=fs.readFileSync('roblox-games/daechung-rpg/shared/RPGMenuModel.luau','utf8');
 assert.match(model,/function Model\.character\(attributes,config\)/);
 assert.match(model,/function Model\.shop\(attributes,config,merchantAccess\)/);
 assert.match(model,/source="SERVER_REPLICATED_EQUIPMENT_AND_CANONICAL_CATALOG"/);
 assert.match(model,/sellSupported=false/);
 assert.match(server,/local prices=isWeapon and C\.WeaponPrices or C\.ArmorPrices/);
 assert.equal(shared,model,'shared model must match the exact internal asset');
 for(const name of ['캐릭터','상점']){
   assert.match(menu,new RegExp('"' + name + '"'));
 }
 assert.match(menu,/character=Model\.character\(a,config\)/);
 assert.match(menu,/offers=Model\.shop\(a,config,access\)/);
 assert.match(menu,/buyWeapon\.Activated:Connect/);
 assert.match(menu,/buyArmor\.Activated:Connect/);
 assert.match(menu,/if options\.buyWeapon then options\.buyWeapon\(\)end/);
 assert.match(menu,/if options\.buyArmor then options\.buyArmor\(\)end/);
 assert.match(menu,/CurrentZone=true,XP=true,AdvancementId=true,SecondAdvancementId=true/);
 assert.match(menu,/humanoid\.HealthChanged:Connect\(scheduleRefresh\)/);
 assert.match(config,/BUY_WEAPON="BUY_WEAPON",BUY_ARMOR="BUY_ARMOR"/);
 assert.match(client,/buyWeapon=function\(\)remote:FireServer\(C\.Actions\.BUY_WEAPON\)end/);
 assert.match(client,/buyArmor=function\(\)remote:FireServer\(C\.Actions\.BUY_ARMOR\)end/);
 assert.match(client,/merchantAccess=function\(\)/);
 assert.match(client,/\(playerRoot\.Position-weapon\.Position\)\.Magnitude<=16/);
 assert.match(client,/\(playerRoot\.Position-armor\.Position\)\.Magnitude<=16/);
 assert.match(client,/p:GetAttribute\("InCombat"\)~=true/);
 assert.match(menu,/options\.merchantAccess\(\)/);
 assert.match(menu,/Heartbeat:Connect\(function\(\)/);
 assert.match(menu,/activeTab~="상점"then return/);
 assert.match(model,/proximityObserved=merchantAccess~=nil/);
 const buy=server.slice(server.indexOf('local function purchaseMerchantEquipment('),server.indexOf('local function makeVillage()'));
 assert.match(buy,/merchant=village and village:FindFirstChild\(merchantName\)/);
 assert.match(buy,/health\.Health<=0/);
 assert.match(buy,/n\(p,"CurrentZone",0\)~=0/);
 assert.match(buy,/p:GetAttribute\("InCombat"\)==true/);
 assert.match(buy,/\(characterRoot\.Position-merchant\.Position\)\.Magnitude>16/);
 assert.match(buy,/p:SetAttribute\("Gold",n\(p,"Gold",0\)-cost\)/);
 assert.match(buy,/p:SetAttribute\(tierKey,tier\+1\)/);
 assert.match(buy,/setStats\(p,not isWeapon\)/);
 assert.doesNotMatch(buy,/GetDataStore|SetAsync|UpdateAsync|RemoteEvent:FireServer/);
 assert.match(server,/if a==C\.Actions\.BUY_WEAPON then accepted=purchaseMerchantEquipment\(p,"WEAPON"\)/);
 assert.match(server,/elseif a==C\.Actions\.BUY_ARMOR then accepted=purchaseMerchantEquipment\(p,"ARMOR"\)/);
 assert.equal((server.match(/purchaseMerchantEquipment\(p,"WEAPON"\)/g)||[]).length,2,'NPC prompt and menu must share one purchase owner');
 assert.equal((server.match(/purchaseMerchantEquipment\(p,"ARMOR"\)/g)||[]).length,2);
});
test('live character and shop view model reads tiers and availability without mutating player',{skip:!luau},()=>run(`
local Model=(function()${model}\nend)()
local config={Classes={RUNE={Name='룬술사'}},WeaponPrices={50,120,240},ArmorPrices={45,110,220},
 WeaponBonus={0,8,18},ArmorBonus={0,10,22}}
local a={ClassId='RUNE',Level=6,XP=18,Gold=130,MaxHP=250,AttackPower=35,WeaponTier=1,ArmorTier=2,CurrentZone=0}
local c=Model.character(a,config)
assert(c.className=='룬술사' and c.level==6 and c.gold==130 and c.maxHp==250)
assert(c.weaponTier==1 and c.armorTier==2 and c.attack==35)
local shop=Model.shop(a,config)
assert(shop.weapon.price==120 and shop.weapon.canBuy and shop.weapon.nextTier==2)
assert(shop.armor.price==220 and not shop.armor.canBuy)
local far=Model.shop(a,config,{weapon=false,armor=false})
assert(far.proximityObserved and not far.weapon.canBuy and not far.armor.canBuy)
local near=Model.shop(a,config,{weapon=true,armor=false})
assert(near.proximityObserved and near.weapon.canBuy and not near.armor.canBuy)
assert(not shop.sellSupported)
a.Gold=0
assert(not Model.shop(a,config).weapon.canBuy)
a.CurrentZone=1
a.Gold=999
assert(not Model.shop(a,config).weapon.canBuy)
a.CurrentZone=0
a.WeaponTier=3
assert(Model.shop(a,config).weapon.price==nil)
`));

test('each authored world object uses its existing server action with replicated interaction identity',()=>{
 const server=fs.readFileSync('roblox-games/daechung-rpg/server/Game.server.luau','utf8');
 const client=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
 const kinds=[
   'QUEST_NPC','WEAPON_MERCHANT','ARMOR_MERCHANT','HEALER','ADVANCEMENT_NPC',
   'ENTRY_PORTAL','RETURN_PORTAL','EVENT_ALTAR','TREASURE_CHEST','SECRET_RUNE','BOSS_COMPANION'
 ];
 assert.match(server,/local function prompt\(target,objectText,actionText,kind,interactionId\)/);
 assert.match(server,/p\.MaxActivationDistance=11;p\.HoldDuration=\.12/);
 assert.match(server,/p:SetAttribute\("InteractionId",id\);p:SetAttribute\("InteractionKind",objectKind\)/);
 assert.match(server,/target:SetAttribute\("ObjectInteractionId",id\);target:SetAttribute\("ObjectInteractionKind",objectKind\)/);
 for(const kind of kinds)assert.match(server,new RegExp('"'+kind+'"'),'missing '+kind);
 for(const kind of kinds.filter(kind=>kind!=='BOSS_COMPANION')){
   const lines=server.split('\n').filter(line=>line.includes('prompt(')&&line.includes('"'+kind+'"'));
   assert.equal(lines.length,1,'each object type must have one original prompt handler: '+kind);
 }
 assert.match(server,/portalPrompt:SetAttribute\("DestinationZone",z\.Id\)/);
 assert.match(server,/returnPrompt:SetAttribute\("DestinationZone",0\)/);
 assert.match(server,/altarPrompt:SetAttribute\("ClaimAttribute",altarKey\)/);
 assert.match(server,/chestPrompt:SetAttribute\("ClaimAttribute",chestKey\)/);
 assert.match(server,/p:SetAttribute\(altarKey,true\);p:SetAttribute\("Gold",n\(p,"Gold",0\)\+25\)/);
 assert.match(server,/p:SetAttribute\(chestKey,true\);p:SetAttribute\("Gold",n\(p,"Gold",0\)\+40\)/);
 assert.match(server,/stone:SetAttribute\("Revealed",true\);pr.Enabled=false/);
 assert.match(server,/clickTimes\[p\]\[def\.Id\]/);
 assert.match(server,/cd:SetAttribute\("InteractionKind","BOSS_COMPANION"\)/);
 assert.match(server,/if combat or p:GetAttribute\("InCombat"\)==true then msg\(p,"전투 중에는 마을로 돌아갈 수 없어"\)return end/);
 assert.match(client,/ProximityPromptService=game:GetService\("ProximityPromptService"\)/);
 assert.match(client,/ProximityPromptService\.PromptShown:Connect/);
 assert.match(client,/ProximityPromptService\.PromptHidden:Connect/);
 assert.match(client,/refreshObjectInteraction/);
 assert.match(client,/kind=="TREASURE_CHEST"or kind=="EVENT_ALTAR"/);
 assert.match(client,/p:GetAttribute\(claimKey\)==true/);
 assert.match(client,/kind=="WEAPON_MERCHANT"or kind=="ARMOR_MERCHANT"/);
 assert.match(client,/kind=="RETURN_PORTAL"/);
 assert.match(client,/kind=="SECRET_RUNE"/);
 assert.match(client,/BoundInteractionId/);
 assert.match(client,/BoundInteractionKind/);
 assert.match(client,/BoundInteractionState/);
 assert.match(client,/OwnsGameplayAuthority",false/);
 assert.doesNotMatch(client,/p:SetAttribute\(.*Gold|p:SetAttribute\(.*WeaponTier/);
});
