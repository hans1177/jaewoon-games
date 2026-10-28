// 파일명: qa/vibe59-roblox-coding.test.mjs
// 역할: 외부 AI 없는 루아우 50종 진단과 기존 코딩 경로의 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import {VIBE59_ROBLOX_OFFLINE_RULES,diagnoseVibe59RobloxOffline,
  inspectVibe59RobloxCoding,planVibe59RobloxOfflineRepairs,
  synthesizeVibe59RobloxServerAction} from '../tools/vibe59-roblox-coding.mjs';
test('50 offline Roblox checks across six systems',()=>{
  assert.equal(VIBE59_ROBLOX_OFFLINE_RULES.length,50);
  assert.equal(new Set(VIBE59_ROBLOX_OFFLINE_RULES.map(x=>x.id)).size,50);
  assert.deepEqual(Object.fromEntries(['ai','combat','building','inventory','bestiary','saving']
    .map(x=>[x,VIBE59_ROBLOX_OFFLINE_RULES.filter(r=>r.system===x).length])),
    {ai:8,combat:9,building:8,inventory:8,bestiary:8,saving:9});
  for(const row of VIBE59_ROBLOX_OFFLINE_RULES)
    assert.doesNotThrow(()=>new RegExp(row.pattern,'g'));
});
test('static detection finds six classes without claiming runtime pass',()=>{
  const rows=[
    ['server/AI.server.luau','while true do\n local wolf = template:Clone()\nend','AI_BUSY_LOOP'],
    ['client/Fight.client.luau','humanoid:TakeDamage(12)','COMBAT_CLIENT_DAMAGE'],
    ['client/Build.client.luau','building:PivotTo(CFrame.new(1,2,3))','BUILD_CLIENT_PIVOT'],
    ['client/Bag.client.luau',"local item = Instance.new('Tool')",'INVENTORY_CLIENT_TOOL_GRANT'],
    ['client/Dex.client.luau','bestiary[species] = true','BESTIARY_CLIENT_DISCOVERY'],
    ['server/Save.server.luau','store:SetAsync(player.Name, profile)','SAVE_NAME_KEY']
  ];
  for(const [path,source,expected] of rows){
    const result=diagnoseVibe59RobloxOffline({path,source});
    assert.ok(result.diagnostics.some(x=>x.code===expected),expected);
    assert.equal(result.modelUsed,false);
    assert.equal(result.sourceWrite,false);
    assert.equal(result.runtimeVerified,false);
  }
});
test('comments and quoted snippets are excluded',()=>{
  const source="-- humanoid:TakeDamage(7)\n--[[ humanoid:TakeDamage(12) ]]\nlocal text = 'humanoid:TakeDamage(3)'";
  assert.deepEqual(diagnoseVibe59RobloxOffline({path:'client/Fight.client.luau',source}).diagnostics,[]);
});
test('repairs remain review plans limited to responsible source',()=>{
  const files=[
    {path:'client/Fight.client.luau',source:'humanoid:TakeDamage(20)'},
    {path:'server/Save.server.luau',source:'store:SetAsync(player.Name, profile)'}
  ];
  const result=inspectVibe59RobloxCoding({files,responsiblePaths:[files[0].path]});
  assert.equal(result.offlineRuleCount,50);
  const plan=planVibe59RobloxOfflineRepairs({files,responsiblePaths:[files[0].path]});
  assert.ok(plan.plans.length);
  assert.ok(plan.plans.every(row=>row.path===files[0].path&&row.sourceChange===false));
  assert.equal(plan.runtimeVerified,false);
});
test('existing authorized Luau code synthesis stays intact',()=>{
  const machine={handlerName:'handleFight',stateVariable:'phase',states:['idle','fight'],
    events:['attack'],transitions:[{from:'idle',to:'fight',event:'attack',actions:[]}]};
  const binding={remoteVariable:'remote',playerStateTable:'states',authorizeFunction:'authorize'};
  const source="local remote = {}\nlocal states = {}\nlocal function authorize(player,eventName) return true end\n-- ANCHOR\n";
  const result=synthesizeVibe59RobloxServerAction({machine,binding,source,
    replaceAnchor:'-- ANCHOR',sourcePath:'server/Main.server.luau'});
  assert.match(result.source,/remote.OnServerEvent:Connect/);
  assert.equal(result.runtimeVerified,false);
  assert.throws(()=>synthesizeVibe59RobloxServerAction({machine,binding,source,
    replaceAnchor:'-- ANCHOR',sourcePath:'client/Main.client.luau'}),/SERVER_SOURCE_REQUIRED/);
});


// [직접 코딩 회귀] 24개 실제 Luau 동작의 생성·성공/거부 시나리오 검증.
import {VIBE59_ROBLOX_DOMAIN_PATTERNS,synthesizeVibe59RobloxDomainAction,
  verifyVibe59RobloxDomainScenarios} from '../tools/vibe59-roblox-coding.mjs';
test('24 offline domain code generators preserve existing state and source authorization',()=>{
  assert.equal(VIBE59_ROBLOX_DOMAIN_PATTERNS.length,24);
  assert.equal(new Set(VIBE59_ROBLOX_DOMAIN_PATTERNS.map(x=>x.id)).size,24);
  const cases=[
    ['ai-aggro-enter','enter','flag',3,false,true],
    ['combat-damage','damage','value',4,4,2],
    ['building-count-place','add','value',4,4,6],
    ['inventory-consume','sub','value',4,4,2],
    ['bestiary-discover','confirm-true','flag',true,false,true],
    ['saving-mark-dirty','true','flag',3,false,true]
  ];
  for(const [operation,kind,field,check,start,finish] of cases){
    const spec={operation,collection:'data',field,conditionField:'check',
      functionName:'handler',amount:2,limit:10,threshold:5};
    const before={data:{value:field==='value'?start:4,flag:field==='flag'?start:false,check}};
    const after=structuredClone(before);after.data[field]=finish;
    const rejected=structuredClone(before);
    if(kind==='enter')rejected.data.check=9;
    else if(kind==='damage'||kind==='sub')rejected.data.value=0;
    else if(kind==='add')rejected.data.value=10;
    else if(kind==='confirm-true')rejected.data.check=false;
    else rejected.data.flag=true;
    const proof=verifyVibe59RobloxDomainScenarios({spec,scenarios:[
      {initialState:before,expectedState:after,expectedApplied:true},
      {initialState:rejected,expectedState:rejected,expectedApplied:false}
    ]});
    assert.equal(proof.pass,true,operation);
    const source='local function handler(player)\n local state = profiles[player]\n'+
      ' if state.data.value and state.data.flag and state.data.check then end\n -- ACTION\nend';
    const code=synthesizeVibe59RobloxDomainAction({spec,source,
      replaceAnchor:'-- ACTION',sourcePath:'server/Main.server.luau'});
    assert.match(code.source,/return false/);
    assert.equal(code.modelUsed,false);
    assert.equal(code.sourceWrite,false);
    assert.equal(code.runtimeVerified,false);
    assert.throws(()=>synthesizeVibe59RobloxDomainAction({spec,source,
      replaceAnchor:'-- ACTION',sourcePath:'client/Main.client.luau'}),/SERVER_SOURCE_REQUIRED/);
    assert.throws(()=>synthesizeVibe59RobloxDomainAction({spec:{...spec,field:'missing'},
      source,replaceAnchor:'-- ACTION',sourcePath:'server/Main.server.luau'}),/EXISTING_FIELDS_REQUIRED/);
  }
  assert.throws(()=>verifyVibe59RobloxDomainScenarios({spec:{operation:'inventory-grant',
    collection:'data',field:'value',amount:2,limit:10},scenarios:[]}),/TWO_SCENARIOS_REQUIRED/);
});
