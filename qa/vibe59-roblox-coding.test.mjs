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
// [루아우 회귀] 긴 문자열·주석·보간 문자열을 실행 코드로 오판하지 않는다.
test('Luau long-bracket literals and comments do not create false damage findings',()=>{
  const source=[
    'local first = [[humanoid:TakeDamage(5)',
    ' --[=[ store:SetAsync(player.Name, profile) ]=]',
    ']]',
    'local second = [=[humanoid:TakeDamage(6)]=]',
    'local third = '+String.fromCharCode(96)+'humanoid:TakeDamage(7)'+String.fromCharCode(96),
    '--[=[ humanoid:TakeDamage(8) ]=]',
    'humanoid:TakeDamage(9)'
  ].join('\n');
  const report=diagnoseVibe59RobloxOffline({path:'client/Fight.client.luau',source});
  assert.deepEqual(report.diagnostics.filter(x=>x.code==='COMBAT_CLIENT_DAMAGE')
    .map(x=>x.line),[7]);
});

test('Luau static rules retain whitelisted real literal arguments without quoted fake calls',()=>{
  const source=[
    'local hint = "Heartbeat:Connect(function() npc:MoveTo() end)"',
    'local fake = "humanoid:TakeDamage(77)"',
    'local store = game:GetService("DataStoreService")',
    "local root = model:FindFirstChild('HumanoidRootPart').Position",
    'local tool = Instance.new("Tool")',
    'humanoid:TakeDamage(4)'
  ].join('\r\n');
  const report=diagnoseVibe59RobloxOffline({path:'client/Fight.client.luau',source});
  const codes=new Set(report.diagnostics.map(row=>row.code));
  assert.ok(codes.has('SAVE_CLIENT_SERVICE'));
  assert.ok(codes.has('AI_UNCHECKED_ROOT_POSITION'));
  assert.ok(codes.has('INVENTORY_CLIENT_TOOL_GRANT'));
  assert.deepEqual(report.diagnostics.filter(row=>row.code==='COMBAT_CLIENT_DAMAGE')
    .map(row=>row.line),[6]);
  assert.ok(!codes.has('AI_HEARTBEAT_MOVETO'));
});

test('many quoted diagnostic decoys remain bounded and exact last-line locations survive',()=>{
  const lines=Array.from({length:1200},()=>'local msg = "humanoid:TakeDamage(7)"');
  lines.push('humanoid:TakeDamage(10)');
  const report=diagnoseVibe59RobloxOffline({
    path:'client/Fight.client.luau',source:lines.join('\n')
  });
  assert.deepEqual(report.diagnostics.filter(row=>row.code==='COMBAT_CLIENT_DAMAGE')
    .map(row=>row.line),[1201]);
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
// [품질 감독 회귀] 기존 Luau 책임 분석만 사용하며 품질 통과나 쓰기 권한을 만들지 않는다.
test('Roblox director traces server-client remote candidates and unique source edit anchors',()=>{
  const files=[
    {path:'client/Fight.client.luau',source:[
      'local remote = script.Parent.Remote',
      'remote:FireServer("hit")',
      'humanoid:TakeDamage(8)'
    ].join('\n')},
    {path:'server/Fight.server.luau',source:[
      'local remote = script.Parent.Remote',
      'remote.OnServerEvent:Connect(function(player) end)'
    ].join('\n')}
  ];
  const result=inspectVibe59RobloxCoding({files,responsiblePaths:[files[0].path]});
  const call=result.remoteLinks.find(x=>x.method==='FireServer');
  assert.equal(call.path,files[0].path);
  assert.deepEqual(call.possibleReceivers,[files[1].path]);
  assert.equal(call.status,'POTENTIAL_RECEIVER');
  assert.equal(call.runtimeVerified,false);
  const finding=result.qualityDirector.priorityFindings.find(x=>x.code==='COMBAT_CLIENT_DAMAGE');
  assert.ok(finding);
  assert.equal(finding.path,files[0].path);
  assert.equal(finding.exactAnchorUnique,true);
  assert.equal(finding.exactFind,'humanoid:TakeDamage(8)');
  const plans=planVibe59RobloxOfflineRepairs({files,responsiblePaths:[files[0].path]});
  assert.ok(plans.plans.some(x=>x.exactFind==='humanoid:TakeDamage(8)'&&x.exactAnchorUnique));
  assert.equal(result.qualityDirector.qualityScore,null);
  assert.equal(result.qualityDirector.gameplayPass,false);
  assert.equal(result.qualityDirector.sourceWrite,false);
  assert.equal(result.qualityDirector.runtimeVerified,false);
});

test('duplicate edit anchors fail closed and missing receivers never become proven defects',()=>{
  const files=[{path:'client/Fight.client.luau',source:[
    'humanoid:TakeDamage(8)',
    'humanoid:TakeDamage(8)',
    'remote:FireServer("hit")'
  ].join('\n')}];
  const result=inspectVibe59RobloxCoding({files,responsiblePaths:[files[0].path]});
  assert.equal(result.remoteLinks[0].status,'RECEIVER_NOT_OBSERVED');
  assert.equal(result.qualityDirector.missingReceiverMeansConfirmedDefect,false);
  assert.ok(result.qualityDirector.priorityFindings.filter(x=>x.code==='COMBAT_CLIENT_DAMAGE')
    .every(x=>x.exactAnchorUnique===false&&x.exactFind===null));
  const plans=planVibe59RobloxOfflineRepairs({files,responsiblePaths:[files[0].path]});
  assert.ok(plans.plans.every(x=>x.exactFind===null));
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

test('comment-only and string-only fields cannot authorize domain source edits',()=>{
  const spec={operation:'inventory-grant',collection:'data',field:'value',
    amount:2,limit:10,functionName:'handler'};
  const source='local function handler(player)\n local state = profiles[player]\n'+
    " -- state.data.value\n local example = 'state.data.value'\n -- ACTION\nend";
  assert.throws(()=>synthesizeVibe59RobloxDomainAction({spec,source,
    replaceAnchor:'-- ACTION',sourcePath:'server/Main.server.luau'}),
    /EXISTING_FIELDS_REQUIRED/);
});


// [실제 기존 작업 흐름] 외부 모델 없이 코드 수정 후보가 생성되고 원본은 보존되는지 확인.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createVibe59CodeCandidate} from '../tools/vibe2-v59-autonomy.mjs';

test('offline Roblox coding integrates with canonical source candidate without modifying game files',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-domain-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'));
  const relative='server/Main.server.luau',filename=path.join(root,relative);
  const original='local function handler(player)\n'+
    ' local state = profiles[player]\n if state.inventory.wood then end\n -- ACTION\nend\n';
  fs.writeFileSync(filename,original);
  const spec={operation:'inventory-grant',collection:'inventory',field:'wood',
    amount:2,limit:10,functionName:'handler'};
  const approved={ownerApproved:true,path:relative,find:'-- ACTION',
    robloxDomainAction:spec,scenarios:[
      {initialState:{inventory:{wood:4}},expectedState:{inventory:{wood:6}},expectedApplied:true},
      {initialState:{inventory:{wood:10}},expectedState:{inventory:{wood:10}},expectedApplied:false}
    ]};
  const run=code=>createVibe59CodeCandidate({order:{target:'roblox',vibe59CodeRequest:code},
    target:'roblox',sourceRoot:root,responsibleFiles:[relative]});
  const candidate=run(approved);
  assert.equal(candidate.vibe59CodeKind,'ROBLOX_DOMAIN_OPERATION');
  assert.equal(candidate.vibe59DomainPattern,'inventory-grant');
  assert.equal(candidate.vibe59DomainOracle.pass,true);
  assert.equal(candidate.modelUsed,false);
  assert.equal(candidate.sourceWrite,false);
  assert.deepEqual(candidate.newFiles,[]);
  assert.equal(candidate.edits.length,1);
  assert.equal(candidate.edits[0].path,relative);
  assert.match(candidate.edits[0].replace,/state\.inventory\.wood = math\.min\(10/);
  assert.equal(fs.readFileSync(filename,'utf8'),original);
  assert.throws(()=>run({...approved,ownerApproved:false}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
  assert.throws(()=>run({...approved,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
  assert.throws(()=>run({...approved,path:'../Main.server.luau'}),/UNAPPROVED_SOURCE/);
  assert.throws(()=>run({...approved,scenarios:[
    approved.scenarios[0],{...approved.scenarios[1],expectedApplied:true}]}),
    /BOUNDARY_PROOF_REQUIRED|DOMAIN_TEST_COUNTEREXAMPLE/);
});


test('unsafe JavaScript prototype property names are never Luau state bindings',()=>{
  const source='local function handler(player)\n local state = profiles[player]\n'+
    ' if state.data.__proto__ then end\n -- ANCHOR\nend';
  const spec={operation:'inventory-grant',collection:'data',field:'__proto__',
    amount:2,limit:10,functionName:'handler'};
  assert.throws(()=>synthesizeVibe59RobloxDomainAction({spec,source,
    replaceAnchor:'-- ANCHOR',sourcePath:'server/Main.server.luau'}),/BAD_IDENTIFIER/);
});

 // [정적 흐름 회귀] Aider/SWE-agent 방식의 원본 근거 확인: 주석·문자열 오탐 제거.
test('remote and state flow uses executable Luau only and preserves original lines',()=>{
  const client='client/Fight.client.luau',server='server/Fight.server.luau';
  const files=[
    {path:client,source:[
      '-- remote:FireServer("fake")',
      'local text = "remote:FireClient()"',
      '--[=[ remote:FireServer("blocked")',
      'local ghost = game:GetService("DataStoreService")',
      ']=]',
      'local literal = [[remote:InvokeServer()]]',
      'local note = '+String.fromCharCode(96)+'remote:FireServer()'+String.fromCharCode(96),
      'remote:FireServer("hit")',
      'local store = game:GetService("DataStoreService")'
    ].join('\n')},
    {path:server,source:[
      'local fake = "remote.OnServerEvent:Connect(function() end)"',
      '-- remote.OnServerEvent:Connect(function() end)',
      'remote.OnServerEvent:Connect(function(player) end)',
      'local ignored = [[store:SetAsync(player.Name, data)]]',
      'store:SetAsync(player.Name, data)'
    ].join('\n')}
  ];
  const report=inspectVibe59RobloxCoding({files,responsiblePaths:[client]});
  assert.deepEqual(report.files[0].calls,[{remote:'remote',method:'FireServer',line:8}]);
  assert.deepEqual(report.files[0].stateEffects,[]);
  assert.deepEqual(report.files[1].events,[{remote:'remote',signal:'OnServerEvent',line:3}]);
  assert.deepEqual(report.files[1].stateEffects,[{method:'SetAsync',line:5}]);
  assert.deepEqual(report.warnings.filter(x=>x.code==='CLIENT_DATASTORE_SERVICE')
    .map(x=>x.line),[9]);
  assert.deepEqual(report.remoteLinks[0].possibleReceivers,[server]);
  assert.equal(report.remoteLinks[0].runtimeVerified,false);
  assert.equal(report.qualityDirector.gameplayPass,false);
});

 // [코딩 두뇌 회귀] 선언→호출 연결은 Luau 주석/문자열을 제외하고 실제 파일 안에서만 추적한다.
test('Luau same-file function dependencies stay source-grounded and bounded',()=>{
  const source=[
    '-- local function ghost() end',
    'local fake = "ghost() and check()"',
    'local function check(player)',
    '  return player ~= nil',
    'end',
    'local handler = function(player)',
    '  return check(player)',
    'end',
    'handler(player)',
    'other.check(player)',
    '--[=[ check(player) ]=]'
  ].join('\n');
  const report=inspectVibe59RobloxCoding({
    files:[{path:'server/Combat.server.luau',source}],
    responsiblePaths:['server/Combat.server.luau']
  });
  assert.deepEqual(report.files[0].functionDefinitions,[
    {name:'check',line:3},{name:'handler',line:6}
  ]);
  assert.deepEqual(report.functionLinks.map(row=>[row.symbol,row.callLine,row.possibleDefinitions[0].line]),[
    ['check',7,3],['handler',9,6]
  ]);
  assert.ok(report.functionLinks.every(row=>row.status==='POTENTIAL_SAME_FILE_FUNCTION'&&row.runtimeVerified===false));
  assert.deepEqual(report.qualityDirector.functionLinks,report.functionLinks);
  assert.equal(report.qualityDirector.completeRepositoryGraph,false);
});
test('duplicate Luau declarations remain ambiguous and cross-file names never imply dependencies',()=>{
  const files=[
    {path:'server/A.server.luau',source:'local function run() end\nlocal function run() end\nrun()'},
    {path:'server/B.server.luau',source:'run()'}
  ];
  const report=inspectVibe59RobloxCoding({files,responsiblePaths:[files[0].path]});
  assert.equal(report.functionLinks.length,1);
  assert.equal(report.functionLinks[0].status,'AMBIGUOUS_SAME_FILE_FUNCTION');
  assert.deepEqual(report.functionLinks[0].possibleDefinitions,[
    {path:files[0].path,line:1},{path:files[0].path,line:2}
  ]);
  assert.equal(report.functionLinks[0].runtimeVerified,false);
});

// [로블록스 원격 이벤트] 4천 줄 뒤의 여러 줄 호출도 실제 서버/클라이언트 관계로 추적한다.
test('Vibe59 remote graph covers multiline Luau calls beyond the bounded function summary',()=>{
  const filler=Array.from({length:4050},()=>'-- existing game source').join('\n');
  const client=[
    'local fake = "remote:FireServer(0)"',
    filler,
    'remote',
    '  :FireServer("attack")',
    'remote',
    '  :FireClient(player)'
  ].join('\n');
  const server=[
    'local fake = "remote.OnServerEvent:Connect(function(player) end)"',
    filler,
    'remote',
    '  .OnServerEvent',
    '  :Connect(function(player) end)'
  ].join('\n');
  const files=[
    {path:'client/Fight.client.luau',source:client},
    {path:'server/Fight.server.luau',source:server}
  ];
  const result=inspectVibe59RobloxCoding({files,responsiblePaths:files.map(x=>x.path)});
  const call=result.remoteLinks.find(x=>x.method==='FireServer');
  assert.ok(call,'multiline FireServer call should be detected after line 4000');
  assert.equal(call.line,4052);
  assert.deepEqual(call.possibleReceivers,['server/Fight.server.luau']);
  assert.equal(call.status,'POTENTIAL_RECEIVER');
  assert.equal(result.files[1].events[0].signal,'OnServerEvent');
  assert.equal(result.files[1].events[0].line,4052);
  assert.ok(result.warnings.some(x=>x.code==='SERVER_REMOTE_CALL_IN_CLIENT'&&x.line===4054));
  assert.equal(result.qualityDirector.runtimeVerified,false);
  assert.equal(result.qualityDirector.sourceWrite,false);
});

test('Vibe59 Roblox server synthesis refuses absent or duplicated exact edit anchors',()=>{
  const machine={handlerName:'handleFight',stateVariable:'phase',states:['idle','fight'],
    events:['attack'],transitions:[{from:'idle',to:'fight',event:'attack',actions:[]}]};
  const binding={remoteVariable:'remote',playerStateTable:'states',authorizeFunction:'authorize'};
  const source='local remote = {}\nlocal states = {}\nlocal function authorize(player,eventName) return true end\n-- ANCHOR\n';
  const create=(text,anchor)=>synthesizeVibe59RobloxServerAction({
    machine,binding,source:text,replaceAnchor:anchor,sourcePath:'server/Main.server.luau'
  });
  assert.match(create(source,'-- ANCHOR').source,/remote.OnServerEvent:Connect/);
  for(const [text,anchor] of [
    [source,'-- DOES NOT EXIST'],
    [source+'-- ANCHOR\n','-- ANCHOR'],
    [source,'']
  ])assert.throws(()=>create(text,anchor),/VIBE59_ROBLOX_ANCHOR_REQUIRED/);
});
// [로블록스 저장 흐름] 오프라인 감사가 긴 파일의 실수와 줄바꿈 호출을 놓치지 않는다.
test('Vibe59 detects late multiline datastore operations without comment or string decoys',()=>{
  const filler=Array.from({length:4050},()=>'-- existing game logic');
  const clientSource=[
    'local text = "game:GetService(\'DataStoreService\')"',
    ...filler,
    'local store = game:GetService(',
    '  "DataStoreService")',
    'store',
    '  :GetDataStore("characters")',
    'store',
    '  :UpdateAsync("profile", function() end)',
    '-- store:SetAsync("fake", 5)',
    'local fake = [[store:GetAsync("fake")]]'
  ].join('\n');
  const path='client/Save.client.luau';
  const report=inspectVibe59RobloxCoding({
    files:[{path,source:clientSource}],responsiblePaths:[path]
  });
  assert.deepEqual(report.files[0].stateEffects,[
    {method:'GetDataStore',line:4055},
    {method:'UpdateAsync',line:4057}
  ]);
  assert.deepEqual(report.warnings.map(x=>[x.code,x.line]),[
    ['CLIENT_DATASTORE_ACCESS',4055],
    ['CLIENT_DATASTORE_SERVICE',4052]
  ]);
  assert.equal(report.qualityDirector.runtimeVerified,false);
  assert.equal(report.qualityDirector.sourceWrite,false);
});

test('Vibe59 Roblox server binding proof requires executable declarations before edit anchor',()=>{
  const machine={handlerName:'handleFight',stateVariable:'phase',states:['idle','fight'],
    events:['attack'],transitions:[{from:'idle',to:'fight',event:'attack',actions:[]}]};
  const binding={remoteVariable:'remote',playerStateTable:'states',authorizeFunction:'authorize'};
  const valid=[
    'local remote = {}',
    'local states = {}',
    'local function authorize(player,eventName) return true end'
  ].join('\n');
  const slot='-- TARGET SLOT';
  const make=source=>synthesizeVibe59RobloxServerAction({
    machine,binding,source,replaceAnchor:slot,sourcePath:'server/Fight.server.luau'
  });
  assert.match(make(valid+'\n'+slot).source,/remote.OnServerEvent:Connect/);
  assert.throws(()=>make(
    '-- local remote = {}\nlocal states = {}\nlocal function authorize(player,eventName) return true end\n'+slot
  ),/VIBE59_ROBLOX_EXISTING_BINDING_REQUIRED/);
  assert.throws(()=>make(
    'local fake = "local remote = {}"\nlocal states = {}\nlocal function authorize(player,eventName) return true end\n'+slot
  ),/VIBE59_ROBLOX_EXISTING_BINDING_REQUIRED/);
  assert.throws(()=>make(slot+'\n'+valid),/VIBE59_ROBLOX_EXISTING_BINDING_REQUIRED/);
  assert.match(make(valid+'\n-- remote.OnServerEvent:Connect(function(player) end)\n'
    +'local comment = "remote.OnServerEvent:Connect(function(player) end)"\n'+slot).source,
    /remote.OnServerEvent:Connect/);
  assert.throws(()=>make(valid+'\nremote\n  .OnServerEvent\n  :Connect(function(player) end)\n'+slot),
    /VIBE59_ROBLOX_DUPLICATE_REMOTE_HANDLER/);
});
// [바이브5.9 로블록스 함수 영향] 긴 게임 소스도 기존 책임 함수까지 안전하게 추적한다.
test('Vibe59 preserves late same-file Luau function dependencies after line 4000',()=>{
  const path='server/Combat.server.luau';
  const source=[
    ...Array.from({length:4050},()=>'-- retained existing Lua source'),
    'local function applyDefense(player)',
    '  return player ~= nil',
    'end',
    'applyDefense(player)'
  ].join('\n');
  const report=inspectVibe59RobloxCoding({files:[{path,source}],responsiblePaths:[path]});
  assert.deepEqual(report.files[0].functionDefinitions,[{name:'applyDefense',line:4051}]);
  assert.deepEqual(report.functionLinks.map(row=>({
    symbol:row.symbol,callLine:row.callLine,possibleDefinitions:row.possibleDefinitions,
    status:row.status,runtimeVerified:row.runtimeVerified
  })),[{
    symbol:'applyDefense',callLine:4054,
    possibleDefinitions:[{path,line:4051}],
    status:'POTENTIAL_SAME_FILE_FUNCTION',runtimeVerified:false
  }]);
  assert.equal(report.qualityDirector.completeRepositoryGraph,false);
  assert.equal(report.sourceWrite,false);
});

test('Vibe59 dedupes repeated invalid remotes so later datastore security findings survive',()=>{
  const path='client/Storage.client.luau';
  const source=[
    ...Array.from({length:40},()=>'remote:FireClient(player)'),
    'local store = game:GetService("DataStoreService")',
    'store:GetDataStore("profile")'
  ].join('\n');
  const report=inspectVibe59RobloxCoding({files:[{path,source}],responsiblePaths:[path]});
  const expected=[
    ['SERVER_REMOTE_CALL_IN_CLIENT',1],
    ['CLIENT_DATASTORE_ACCESS',42],
    ['CLIENT_DATASTORE_SERVICE',41]
  ];
  assert.deepEqual(report.files[0].warnings.map(row=>[row.code,row.line]),expected);
  assert.deepEqual(report.warnings.map(row=>[row.code,row.line]),expected);
  assert.ok(report.qualityDirector.priorityFindings.some(row=>row.code==='CLIENT_DATASTORE_ACCESS'));
  assert.ok(report.qualityDirector.priorityFindings.some(row=>row.code==='CLIENT_DATASTORE_SERVICE'));
  assert.equal(report.runtimeVerified,false);
  assert.equal(report.sourceWrite,false);
});

// [프레임 성능 회귀] 반복 원격 요청·이벤트 연결을 같은 기존 소스 검사에서 추적한다.
test('Vibe59 locates per-frame remote pressure and nested connection accumulation',()=>{
  const path='client/Mobile.client.luau';
  const source=[
    'RunService.Heartbeat:Connect(function(dt)',
    '  remote:FireServer("aim")',
    '  player.CharacterAdded:Connect(function(character) print(character) end)',
    'end)'
  ].join('\r\n');
  const report=inspectVibe59RobloxCoding({files:[{path,source}],responsiblePaths:[path]});
  const warnings=new Map(report.warnings.map(row=>[row.code,row]));
  assert.equal(warnings.get('FRAME_REMOTE_REQUEST')?.line,2);
  assert.equal(warnings.get('FRAME_CONNECTION_ACCUMULATION')?.line,3);
  assert.ok(report.qualityDirector.priorityFindings.some(row=>row.code==='FRAME_REMOTE_REQUEST'));
  assert.ok(report.qualityDirector.priorityFindings.some(row=>row.code==='FRAME_CONNECTION_ACCUMULATION'));
  assert.equal(report.scanCoverage.responsibleComplete,true);
  assert.equal(report.sourceWrite,false);
  assert.equal(report.runtimeVerified,false);
  assert.equal(report.qualityDirector.gameplayPass,false);
});

test('Vibe59 excludes commented, quoted and out-of-frame remote calls',()=>{
  const path='client/Idle.client.luau';
  const source=[
    '-- RunService.Heartbeat:Connect(function() remote:FireServer() end)',
    'local fake = "RenderStepped:Connect(function() remote:FireServer() end)"',
    'RunService.RenderStepped:Connect(function(dt)',
    '  local aim = dt',
    'end)',
    'remote:FireServer("one-shot")',
    'player.CharacterAdded:Connect(function(character) print(character) end)'
  ].join('\n');
  const report=inspectVibe59RobloxCoding({files:[{path,source}],responsiblePaths:[path]});
  assert.ok(!report.warnings.some(row=>row.code==='FRAME_REMOTE_REQUEST'));
  assert.ok(!report.warnings.some(row=>row.code==='FRAME_CONNECTION_ACCUMULATION'));
  assert.equal(report.runtimeVerified,false);
});

// [로블록스 파일 검증] 스캔 상한 초과·경로 누락은 안전하다는 증거가 아니다.
test('Vibe59 exposes oversized responsible Luau files instead of silently clearing findings',()=>{
  const path='server/Combat.server.luau',source='--'+'.'.repeat(260001);
  const files=[{path,source}];
  const result=inspectVibe59RobloxCoding({files,responsiblePaths:[path]});
  assert.deepEqual(result.files,[]);
  assert.deepEqual(result.scanCoverage.unscanned,[
    {path,reason:'LUAU_SOURCE_LIMIT_EXCEEDED',responsible:true}
  ]);
  assert.equal(result.scanCoverage.requiredResponsibleFiles,1);
  assert.equal(result.scanCoverage.observedResponsibleFiles,0);
  assert.equal(result.scanCoverage.responsibleComplete,false);
  assert.equal(result.qualityDirector.responsibleSourceCoverageComplete,false);
  assert.deepEqual(result.qualityDirector.unscannedResponsiblePaths,[path]);
  assert.equal(result.qualityDirector.gameplayPass,false);
  const plan=planVibe59RobloxOfflineRepairs({files,responsiblePaths:[path]});
  assert.deepEqual(plan.plans,[]);
  assert.deepEqual(plan.scanCoverage,result.scanCoverage);
  assert.equal(plan.sourceWrite,false);
});

test('Vibe59 reports missing owners while preserving ordinary observed Luau findings',()=>{
  const owner='server/Storage.server.luau',observed='client/Combat.client.luau';
  const result=inspectVibe59RobloxCoding({
    files:[{path:observed,source:'humanoid:TakeDamage(10)'}],
    responsiblePaths:[owner]
  });
  assert.deepEqual(result.scanCoverage.unscanned,[
    {path:owner,reason:'RESPONSIBLE_SOURCE_NOT_OBSERVED',responsible:true}
  ]);
  assert.ok(result.diagnostics.some(x=>x.code==='COMBAT_CLIENT_DAMAGE'));
  assert.equal(result.scanCoverage.responsibleComplete,false);
  assert.equal(result.qualityDirector.sourceWrite,false);
  const invalid=inspectVibe59RobloxCoding({
    files:[{path:'server/Schema.json',source:'{}'}],
    responsiblePaths:['server/Schema.json']
  });
  assert.deepEqual(invalid.scanCoverage.unscanned,[
    {path:'server/Schema.json',reason:'RESPONSIBLE_SOURCE_NOT_LUAU',responsible:true}
  ]);
});
// [로블록스 정적검사 완전성] 비어 있거나 충돌한 소스는 안전 판정 근거가 아니다.
test('Vibe59 refuses missing or empty responsible Luau source evidence',()=>{
  const path='server/Actions.server.luau';
  for(const source of [undefined,null,'','  \n\t']){
    const report=inspectVibe59RobloxCoding({
      files:[{path,source}],responsiblePaths:[path]
    });
    assert.deepEqual(report.files,[]);
    assert.deepEqual(report.scanCoverage.unscanned,[
      {path,reason:'LUAU_SOURCE_UNAVAILABLE_OR_EMPTY',responsible:true}
    ]);
    assert.equal(report.scanCoverage.version,2);
    assert.equal(report.scanCoverage.requiredResponsibleFiles,1);
    assert.equal(report.scanCoverage.observedResponsibleFiles,0);
    assert.equal(report.scanCoverage.responsibleComplete,false);
    assert.equal(report.qualityDirector.responsibleSourceCoverageComplete,false);
    assert.equal(report.qualityDirector.runtimeVerified,false);
    const plan=planVibe59RobloxOfflineRepairs({files:[{path,source}],responsiblePaths:[path]});
    assert.deepEqual(plan.plans,[]);
    assert.equal(plan.scanCoverage.responsibleComplete,false);
  }
});

test('Vibe59 marks duplicated same-path sources as incomplete even if first source was valid',()=>{
  const path='server/Combat.server.luau';
  const report=inspectVibe59RobloxCoding({
    files:[
      {path,source:'local function fight(player) return player end\nfight(player)'},
      {path,source:'local function fight(player) return nil end'}
    ],
    responsiblePaths:[path]
  });
  assert.equal(report.files.length,1);
  assert.equal(report.scanCoverage.observedResponsibleFiles,1);
  assert.equal(report.scanCoverage.requiredResponsibleFiles,1);
  assert.equal(report.scanCoverage.responsibleComplete,false);
  assert.deepEqual(report.scanCoverage.unscanned,[
    {path,reason:'LUAU_DUPLICATE_SOURCE_PATH',responsible:true}
  ]);
  assert.equal(report.qualityDirector.responsibleSourceCoverageComplete,false);
  assert.equal(report.functionLinks.length,1);
  assert.equal(report.runtimeVerified,false);
});

test('Vibe59 requires an assigned owner to claim complete responsible-source coverage',()=>{
  const result=inspectVibe59RobloxCoding({
    files:[{path:'server/Fight.server.luau',source:'local healthy = true'}],
    responsiblePaths:[]
  });
  assert.equal(result.scanCoverage.version,2);
  assert.equal(result.scanCoverage.requiredResponsibleFiles,0);
  assert.equal(result.scanCoverage.responsibleComplete,false);
  assert.equal(result.qualityDirector.gameplayPass,false);
  assert.equal(result.sourceWrite,false);
});

// [루아우 자동검사 회귀] main과 PR에서 동일한 입력 변경을 감지해야 정식 컴파일·실행 검사가 빠지지 않는다.
test('Vibe5.9 Luau compiler gate covers every tested source on push and pull request',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/vibe59-luau-compiler.yml',import.meta.url),'utf8');
 const push=workflow.split('\n  push:\n')[1]?.split('\n  pull_request:\n')[0];
 const pr=workflow.split('\n  pull_request:\n')[1]?.split('\n  workflow_dispatch:\n')[0];
 assert.ok(push&&pr,'VIBE59_COMPILER_BOTH_TRIGGERS_REQUIRED');
 const paths=section=>[...section.matchAll(/^\s+- '([^']+)'/gm)].map(x=>x[1]).sort();
 assert.deepEqual(paths(push),paths(pr),'VIBE59_COMPILER_PUSH_PR_TRIGGER_DRIFT');
 for(const required of [
   'tools/vibe59-*.mjs','tools/vibe2-v59-autonomy.mjs','tools/vibe2-source-worker.mjs',
   'qa/vibe59-roblox-coding.test.mjs','qa/vibe59-crafting-transaction.test.mjs',
   'qa/vibe59-luau-compiler.mjs','qa/vibe59-luau-runtime.mjs',
   'qa/vibe59-crafting-runtime.mjs'
 ])assert.ok(paths(push).includes(required),'VIBE59_COMPILER_MISSING_TRIGGER:'+required);
 for(const command of [
   'node --test qa/vibe59-roblox-coding.test.mjs',
   'node --test qa/vibe59-crafting-transaction.test.mjs',
   'node qa/vibe59-luau-compiler.mjs',
   'node qa/vibe59-luau-runtime.mjs',
   'node qa/vibe59-crafting-runtime.mjs'
 ])assert.ok(workflow.includes(command),'VIBE59_COMPILER_MISSING_TEST:'+command);
});
