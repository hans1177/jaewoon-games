import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROBLOX_STUDIO_LESSONS,selectRobloxStudioLessons,studioLessonMetadata} from '../tools/vibe3-roblox-studio-lessons.mjs';
import {buildRobloxSourceCoaching} from '../tools/vibe3-roblox-distillation.mjs';

test('studio retrieval is relevant and bounded, keeps complete examples, and never turns teaching into runtime proof',()=>{
  const rows=selectRobloxStudioLessons('save schema migration session lease 저장 마이그레이션');
  assert.equal(rows.length,2);
  assert.ok(rows.every(x=>x.domain==='PERSISTENCE'));
  assert.ok(rows.reduce((n,x)=>n+Buffer.byteLength(x.exampleCode),0)<=3200);
  assert.equal(selectRobloxStudioLessons('unrelated text').length,0);
  assert.equal(selectRobloxStudioLessons('save',{limit:0}).length,0);
  assert.equal(selectRobloxStudioLessons('save',{maxCodeBytes:1}).length,0);
  for(const [goal,id] of [['회계 원장','ECONOMY_BALANCED_JOURNAL'],['화풍 수채화 픽셀','STYLE_GRAMMAR_PROFILES'],['로비 공간 면적','LOBBY_SPACE_ALLOCATION'],['메뉴 깊이 뒤로가기','UI_NAVIGATION_STACK'],['데미지 방어 치명타','DAMAGE_MODIFIER_PIPELINE']]){
    assert.ok(selectRobloxStudioLessons(goal).some(x=>x.id===id),goal);
  }
  assert.equal(new Set(ROBLOX_STUDIO_LESSONS.map(x=>x.id)).size,ROBLOX_STUDIO_LESSONS.length);
  for(const row of ROBLOX_STUDIO_LESSONS){
    const metadata=studioLessonMetadata(row);
    assert.equal(metadata.runtimeVerified,false);assert.equal(metadata.applicationVerified,false);assert.equal(metadata.weightTraining,false);
    assert.equal(metadata.exampleReference.sha256,crypto.createHash('sha256').update(row.exampleCode).digest('hex'));
    assert.equal(JSON.stringify(metadata).includes(row.exampleCode.trim()),false);
    assert.ok(row.principle&&row.application&&row.failureMode&&row.transferCheck);
  }
});

test('source worker retrieves original studio code only with a valid current Roblox responsibility, including source without named lessons',t=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-studio-'));t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const root='roblox-games/demo',file='server/Game.server.luau';fs.mkdirSync(path.join(cwd,root,'server'),{recursive:true});
  fs.writeFileSync(path.join(cwd,root,file),'return {}\n');
  fs.writeFileSync(path.join(cwd,'outside.luau'),'return {}\n');
  fs.symlinkSync(path.join(cwd,'outside.luau'),path.join(cwd,root,'server/escape.luau'));
  const order={target:'roblox',source:{root},goal:'remote payload schema finite 입력 리모트 보안 검증'};
  const result=buildRobloxSourceCoaching({cwd,order,responsibleFiles:['server/missing.luau',file]});
  assert.equal(result.evidence.retrieved,true);
  assert.equal(result.evidence.studioLessons[0].id,'REMOTE_PAYLOAD_SCHEMA');
  assert.match(result.block,/return function\(payload\)/);
  assert.ok(Buffer.byteLength(result.block)<14000);
  assert.equal(result.evidence.studioAdvisoryOnly,true);
  assert.equal(JSON.stringify(result.evidence).includes('return function(payload)'),false);
  for(const responsibleFiles of [[],['../outside.luau'],['server/escape.luau']]){
    assert.equal(buildRobloxSourceCoaching({cwd,order,responsibleFiles}).evidence.retrieved,false);
  }
  assert.equal(buildRobloxSourceCoaching({cwd,order:{...order,source:{root,internalAssetMotion:true}},responsibleFiles:[file]}).evidence.retrieved,false);
  assert.equal(buildRobloxSourceCoaching({cwd,order:{...order,target:'unity'},responsibleFiles:[file]}).evidence.retrieved,false);
});

const luau=process.env.VIBE2_LUAU_BINARY,compiler=process.env.VIBE2_LUAU_COMPILER;
test('official Luau compiles every teaching module and executes pure boundary/regression cases; this is not Studio evidence',{skip:!luau||!compiler},t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-studio-luau-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const row of ROBLOX_STUDIO_LESSONS){
    const file=path.join(dir,row.id+'.luau');fs.writeFileSync(file,row.exampleCode);
    execFileSync(compiler,[file],{timeout:10000,stdio:'pipe'});
  }
  const definitions=ROBLOX_STUDIO_LESSONS.map(row=>`L["${row.id}"]=(function()\n${row.exampleCode}\nend)()`).join('\n');
  const harness=`local L = {}\n${definitions}\n`+String.raw`
local pivot=L.IMPORTED_MESH_GROUND_PIVOT(-2,2,10,.5,2,"R6",2)
assert(pivot.visualRootY==14 and pivot.characterRootY==13.5)
assert(L.IMPORTED_MESH_GROUND_PIVOT(0,1,0,2,2,"R15").clearance==3)
assert(L.IMPORTED_MESH_GROUND_PIVOT(0,1,0,0,2,"R6",nil)==nil)
assert(L.IMPORTED_MESH_GROUND_PIVOT(0,0,0,0,2,"R15")==nil)
local material=L.GLTF_PBR_CHANNEL_TRANSFER(.8,.2,.5,1)
assert(math.abs(material.unity.smoothness-.6)<.00001 and material.roblox.metalness==.2)
assert(L.GLTF_PBR_CHANNEL_TRANSFER(0/0,0,1,1)==nil)
local decode = L.REMOTE_PAYLOAD_SCHEMA
assert(decode({action="Attack",sequence=1}).sequence == 1)
for _, value in ipairs({math.huge,-math.huge,0/0,-1,1.5,"1"}) do
    assert(decode({action="Attack",sequence=value}) == nil)
end
assert(decode({action="GrantMoney",sequence=1}) == nil)
local limiter = L.SERVER_RATE_LIMIT(2,1)
assert(limiter.allow(7,0) and limiter.allow(7,0) and not limiter.allow(7,0))
assert(limiter.allow(8,0) and limiter.allow(7,1))
limiter.forget(7); assert(limiter.allow(7,1))
local raw = {version=1,coins=9,unrelated="keep"}
local migrated = L.SAVE_SCHEMA_MIGRATION(raw)
assert(migrated.wallet.coins == 9 and migrated.unrelated == "keep" and raw.coins == 9)
assert(L.SAVE_SCHEMA_MIGRATION(migrated).version == 2)
assert(L.SAVE_SCHEMA_MIGRATION({version=99}) == nil)
local profile = {session={token="A",expiresAt=20},saveGeneration=3,data={x=1}}
assert(L.SAVE_SESSION_FENCE(profile,"B",10,4,{x=2}) == nil)
assert(L.SAVE_SESSION_FENCE(profile,"A",21,4,{x=2}) == nil)
assert(L.SAVE_SESSION_FENCE(profile,"A",10,2,{x=2}) == nil)
assert(L.SAVE_SESSION_FENCE(profile,"A",10,4,{x=2}).data.x == 2 and profile.data.x == 1)
local reward = L.IDEMPOTENT_REWARD_COMMIT({coins=10},"op1",5)
assert(reward.coins == 15)
assert(L.IDEMPOTENT_REWARD_COMMIT(reward,"op1",5).coins == 15)
local full = {}; for i=1,256 do full[tostring(i)] = true end
assert(L.IDEMPOTENT_REWARD_COMMIT({coins=10,appliedOperations=full},"new",5) == nil)
local receive=L.REPLICATION_GENERATION_SEQUENCE(3)
assert(receive(3,2,"a") == "a" and receive(3,1,"old") == nil)
assert(receive(3,2,"duplicate") == nil and receive(2,9,"old actor") == nil)
assert(receive(3,3,"b") == "b")
local state, allowed = L.AI_STATE_TRANSITIONS("Dead","Chase")
assert(state == "Dead" and not allowed)
assert(L.AI_STATE_TRANSITIONS("Chase","Windup") == "Windup")
assert(L.TARGET_HYSTERESIS("A",10,"B",11,2) == "A")
assert(L.TARGET_HYSTERESIS("A",10,"B",13,2) == "B")
local steps=0; local tick=L.FIXED_STEP_COSMETICS(0.125,function(dt) assert(dt == 0.125); steps+=1 end)
tick(0.0625); assert(steps == 0); tick(0.0625); assert(steps == 1)
tick(10); assert(steps == 5)
assert(L.ACTION_TIMELINE_PRESENTATION(0,1,1,1,1) == "Waiting")
assert(L.ACTION_TIMELINE_PRESENTATION(2,1,1,1,1) == "Active")
assert(L.ACTION_TIMELINE_PRESENTATION(4,1,1,1,1) == "Complete")
local leases=L.LEASED_EFFECT_REUSE(); local old=leases.acquire(); assert(leases.release(old))
local new=leases.acquire(); assert(not leases.release(old) and leases.release(new) and not leases.release(new))
assert(L.COSMETIC_LOD_HYSTERESIS("Near",80) == "Near")
assert(L.COSMETIC_LOD_HYSTERESIS("Far",80) == "Far")
local owner=L.OWNED_RESOURCE_CLEANUP(); local order={}
owner.add(function() table.insert(order,1) end)
owner.add(function() error("expected") end)
owner.add(function() table.insert(order,3) end)
assert(#owner.dispose() == 1 and order[1] == 3 and order[2] == 1)
assert(#owner.dispose() == 0 and #order == 2)
local accepted=pcall(function() owner.add(function() end) end); assert(not accepted)
local world={Raycast=function(_,from,travel,params) return nil end}
local v={Magnitude=0}; local previous=setmetatable({}, {__sub=function() return v end})
local hit,position=L.PROJECTILE_SEGMENT_QUERY(world,previous,previous,{})
assert(hit == nil and position == previous)
local catalog={ghost={provenance="INTERNAL",sourceHash="abc",template="owned"}}
assert(L.INTERNAL_ASSET_RESOLUTION(catalog,"ghost","abc") == "owned")
assert(L.INTERNAL_ASSET_RESOLUTION(catalog,"ghost","stale") == nil)
assert(L.INTERNAL_ASSET_RESOLUTION(catalog,"outside","abc") == nil)
local reachable=L.WORLD_CIRCULATION_GRAPH({spawn={"lobby"},lobby={"spawn","exit"},locked={}},"spawn")
assert(reachable.exit and not reachable.locked)
local areas=L.LOBBY_SPACE_ALLOCATION(100,0.25,{arrival=1,social=2})
assert(areas.circulation == 25 and areas.arrival == 25 and areas.social == 50)
local a={minX=0,maxX=2,minZ=0,maxZ=2}; local b={minX=3,maxX=5,minZ=0,maxZ=2}
assert(L.PLACEMENT_CLEARANCE(a,b,1) and not L.PLACEMENT_CLEARANCE(a,b,1.1))
local near=L.DISTANCE_SCREEN_READABILITY(4,10,60,720)
local far=L.DISTANCE_SCREEN_READABILITY(4,20,60,720)
assert(math.abs(near-far*2)<1e-6 and L.DISTANCE_SCREEN_READABILITY(4,0,60,720)==nil)
local pos,velocity=L.BALLISTIC_UNITS_AND_TIME(0,10,-2,2)
local splitPos,splitVelocity=L.BALLISTIC_UNITS_AND_TIME(0,10,-2,1)
splitPos,splitVelocity=L.BALLISTIC_UNITS_AND_TIME(splitPos,splitVelocity,-2,1)
assert(pos == splitPos and velocity == splitVelocity and pos == 16)
local menus=L.UI_NAVIGATION_STACK("Home",{Home=true,Stats=true,Details=true},2)
assert(menus.back()=="Home" and menus.open("Stats") and not menus.open("Details"))
assert(menus.current()=="Stats" and menus.back()=="Home" and not menus.open("Missing"))
assert(menus.rememberFocus("start"));assert(menus.open("Stats"));menus.setModal(true)
assert(not menus.open("Home") and menus.back()=="Stats")
assert(menus.back()=="Home")
assert(menus.restoreFocus(function(id) return id=="start" end,"fallback")=="start")
assert(menus.restoreFocus(function(id) return id=="fallback" end,"fallback")=="fallback")
assert(L.RESPONSIVE_UI_GRID(100,10,8,120,4).mode=="Compact")
local grid=L.RESPONSIVE_UI_GRID(500,10,10,120,4)
assert(grid.columns==3 and grid.cardWidth>=120 and grid.cardWidth*3+20<=480.00001)
local visible=L.MENU_PROGRESSIVE_DISCLOSURE({{id="cost",essential=true,advanced=true},{id="expert",advanced=true}},false,"shop")
assert(#visible==1 and visible[1].id=="cost")
local accounts={player=true,shop=true}
assert(L.ECONOMY_BALANCED_JOURNAL({{account="player",amount=-5},{account="shop",amount=5}},accounts))
for _,bad in ipairs({4,5.5,math.huge,0/0}) do
    assert(not L.ECONOMY_BALANCED_JOURNAL({{account="player",amount=-5},{account="shop",amount=bad}},accounts))
end
local economy=L.ECONOMY_SOURCE_SINK_MODEL(0,{{income=2,cost=5},{income=4,cost=0}})
assert(economy.history[1]==-3 and economy.balance==1 and economy.earned-economy.spent==1)
local damage=L.DAMAGE_MODIFIER_PIPELINE
assert(damage(100,1,1,100,100,false)==50 and damage(100,1,1,0,100,true)==0)
assert(damage(100,1,1,200,100,false)<damage(100,1,1,100,100,false))
local stat=L.STAT_DIMINISHING_RETURNS
assert(stat(0,100,50)==0 and stat(50,100,50)==50 and stat(100,100,50)>50 and stat(1e6,100,50)<100)
local encounter,remaining=L.ENCOUNTER_BUDGET({{id="a",cost=3},{id="b",cost=4},{id="c",cost=2}},5)
assert(#encounter==2 and encounter[2]=="c" and remaining==0)
local style=L.STYLE_GRAMMAR_PROFILES("Pixel");style.edge="changed"
assert(L.STYLE_GRAMMAR_PROFILES("Pixel").edge=="consistent-texels")
assert(L.STYLE_GRAMMAR_PROFILES("Unknown")==nil)
assert(L.DEPTH_LIGHTING_LAYERS(1000,1,0.2)==0.2)
assert(L.DEPTH_LIGHTING_LAYERS(20,0.02,0.2)<L.DEPTH_LIGHTING_LAYERS(10,0.02,0.2))
local expected={sourceRevision="a",artifactIdentity="b",requiredChecks={"native","negative"}}
assert(not L.REGRESSION_ACCEPTANCE_MATRIX(expected,{sourceRevision="old",artifactIdentity="b",checks={}}))
assert(not L.REGRESSION_ACCEPTANCE_MATRIX(expected,{sourceRevision="a",artifactIdentity="b",checks={native="PASS"}}))
print("ROBLOX_STUDIO_PURE_CASES=PASS;NATIVE_STUDIO_VERIFIED=false")
`;
  const file=path.join(dir,'cases.luau');fs.writeFileSync(file,harness);
  const output=execFileSync(luau,[file],{encoding:'utf8',timeout:20000});
  assert.match(output,/ROBLOX_STUDIO_PURE_CASES=PASS/);
});
