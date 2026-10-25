// 파일명: qa/company-development-roblox-multiplayer-qa.test.mjs
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRobloxMultiplayerSourceContract} from '../tools/company-development-roblox-runtime-foundation.mjs';

test('all native multiplayer completion gates use static source evidence and never fabricate actual participants',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.completionEvidence,'EXACT_SOURCE_STATIC_MULTIPLAYER_CONTRACT');
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.runtimeExecutionRequired,false);
  assert.equal(policy.unityWebFirstStage.multiplayer.actualTwoOrMorePlayersRequiredWhenMultiplayerDesigned,false);
  for(const file of ['unity-web-first-stage-build.yml','company-development-unity-runtime.yml']){
    const source=fs.readFileSync('.github/workflows/'+file,'utf8');
    assert.match(source,/auditUnityWebNativeSystems/);
    assert.match(source,/MULTIPLAYER_VERIFICATION_SCOPE=STATIC_CODE_CONTRACT/);
    assert.doesNotMatch(source,/const multiplayerPass[^;]*participantCount/s);
    assert.match(source,/sourceRevision===process\.env\.SOURCE_(?:COMMIT|REVISION)/);
  }
});

test('separate Roblox two-client Studio workflow remains disabled',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-multiplayer-qa.yml','utf8');
  assert.match(workflow,/Multiplayer Studio QA \(Disabled\)/);
  assert.match(workflow,/ROBLOX_STUDIO_MULTIPLAYER_QA=REMOVED/);
  assert.match(workflow,/disabled:\s*\n(?:\s*#[^\n]*\n)*\s*if: false/);
  assert.doesNotMatch(workflow,/self-hosted, Windows, X64, roblox-studio-authenticated/);
});

test('multiplayer release gate passes from authoritative two-participant source contract',()=>{
  const server=[
    'local participants=Players:GetPlayers()',
    'if #participants>=2 then shared=shared+1 end',
    'remote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})',
  ].join('\n');
  const client=[
    'remote.OnClientEvent:Connect(function(kind,snapshot)',
    ' if kind~="MULTIPLAYER_SYNC" then return end',
    ' local participantCount=snapshot.ParticipantCount',
    'end)',
  ].join('\n');
  const result=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(result.passed,true);
  assert.equal(result.runtimeTwoClientExecutionRequired,false);
});

test('multiplayer code gate accepts roster-count broadcast without requiring a literal >=2 branch',()=>{
  const server='local participants=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})';
  const client='remote.OnClientEvent:Connect(function(kind,payload) if kind=="MULTIPLAYER_SYNC" then local n=payload.ParticipantCount end end)';
  const result=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(result.passed,true);
  assert.equal(result.checks.twoParticipantCapablePath,true);
});

test('multiplayer code gate still rejects missing client sync handler',()=>{
  const server='local participants=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})';
  assert.equal(validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:'print("no sync handler")'}).passed,false);
});

test('common multiplayer worker has a verifiable static-only contract on free Workers',()=>{
  const worker=fs.readFileSync('multiplayer/worker.js','utf8');
  const client=fs.readFileSync('multiplayer/multiplayer-client.js','utf8');
  for(const [name,source] of [['worker',worker],['client',client]]){
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(result.status,0,name+': '+result.stderr);
  }
  const config=fs.readFileSync('multiplayer/wrangler.toml','utf8');
  assert.match(config,/^main\s*=\s*"worker\.js"\s*$/m);
  assert.match(config,/^workers_dev\s*=\s*true\s*$/m);
  assert.match(config,/new_sqlite_classes\s*=\s*\["Matchmaker",\s*"GameRoom"\]/);
  for(const binding of ['MATCHMAKER','ROOMS'])
    assert.match(config,new RegExp('name\\s*=\\s*"'+binding+'"'));
  assert.match(worker,/export class Matchmaker/);
  assert.match(worker,/export class GameRoom/);
  assert.match(worker,/new WebSocketPair\(\)/);
  assert.match(worker,/this\.ctx\.acceptWebSocket\(server\)/);
  assert.match(worker,/async webSocketMessage\(ws,\s*message\)/);
  assert.match(worker,/async webSocketClose\(ws\)/);
  assert.match(worker,/r\.mode === mode && r\.gameId === gameId/);
  for(const route of ['/matchmake','/friend/create','/friend/join'])
    assert.ok(worker.includes(route),'missing '+route);
  // Static contract is not evidence of live session, deployment or two clients.
  assert.doesNotMatch(config,/^\s*route\s*=/m);
});


test('worker permits the GitHub Pages browser origin without opening third-party CORS',async()=>{
  const source=fs.readFileSync('multiplayer/worker.js','utf8');
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const configured='https://jaewoon-games.pages.dev';
  const origins=[
    ['https://hans1177.github.io','https://hans1177.github.io'],
    [configured,configured],
    ['https://other.example',configured]
  ];
  for(const [origin,expected] of origins){
    const request=new Request('https://jaewoon-multiplayer.anyanguy12.workers.dev/health',{
      method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}
    });
    const response=await module.default.fetch(request,{ALLOWED_ORIGIN:configured});
    assert.equal(response.status,204);
    assert.equal(response.headers.get('access-control-allow-origin'),expected);
    assert.equal(response.headers.get('vary'),'Origin');
    assert.equal(response.headers.get('access-control-allow-methods'),'GET, POST, OPTIONS');
  }
});

// 보석 생존전: 서버는 한 자리 번호의 동시 중복을 막고 실제 참가자 토큰을 확인한다.
test('gem-survivor guest rooms use one digit without email and enforce 4 players',async()=>{
  const source=fs.readFileSync('multiplayer/worker.js','utf8');
  const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const store=new Map();
  const ctx={storage:{
    get:async key=>store.get(key),
    put:async(key,value)=>store.set(key,structuredClone(value))
  }};
  const matcher=new mod.Matchmaker(ctx,{});
  const created=[];
  for(let i=0;i<10;i++){
    const response=await matcher.gemCreate();
    assert.equal(response.status,200);
    const room=await response.json();
    assert.match(room.inviteCode,/^[0-9]$/);
    assert.equal(room.gameId,'gem-survivor');
    assert.equal(room.players,1);
    assert.ok(room.guestToken.length>=64);
    created.push(room);
  }
  assert.equal(new Set(created.map(room=>room.inviteCode)).size,10);
  assert.equal((await matcher.gemCreate()).status,409);
  const room=created[0];
  for(let i=2;i<=4;i++){
    const response=await matcher.gemJoin({inviteCode:room.inviteCode});
    assert.equal(response.status,200);
    assert.equal((await response.json()).players,i);
  }
  assert.equal((await matcher.gemJoin({inviteCode:room.inviteCode})).status,409);
  assert.equal((await matcher.gemJoin({inviteCode:'99'})).status,400);
  assert.equal((await matcher.gemJoin({inviteCode:'x'})).status,400);
  assert.equal((await matcher.gemAuthorize({roomId:room.roomId,guestToken:'not-valid'})).status,401);
  assert.equal((await matcher.gemAuthorize({roomId:'another-room',guestToken:room.guestToken})).status,401);
  assert.equal((await matcher.gemAuthorize({roomId:room.roomId,guestToken:room.guestToken})).status,200);
  assert.equal((await matcher.gemLeave({guestToken:room.guestToken})).status,200);
  assert.equal((await matcher.gemAuthorize({roomId:room.roomId,guestToken:room.guestToken})).status,401);
  assert.equal((await matcher.gemJoin({inviteCode:room.inviteCode})).status,200);
});

test('gem-survivor web entry uses guest rooms while existing email auth remains scoped to other games',async()=>{
  const html=fs.readFileSync('web-games/gem-survivor/index.html','utf8');
  const worker=fs.readFileSync('multiplayer/worker.js','utf8');
  const source=fs.readFileSync('multiplayer/multiplayer-client.js','utf8');
  const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.doesNotMatch(html,/id="netEmail"|id="netPassword"|id="netLogin"|id="netMatch"/);
  assert.match(html,/id="netCode"[^>]*maxlength="1"/);
  assert.match(html,/client\.createGemRoom\(\)/);
  assert.match(html,/client\.joinGemRoom\(code\)/);
  assert.match(worker,/async gemAuthorize\(/);
  assert.match(worker,/\/gem-survivor\/create/);
  assert.match(worker,/\/guest\/create/);
  const client=new mod.JaewoonMultiplayerClient();
  const requests=[];
  client.request=async(endpoint,options)=>{
    requests.push({endpoint,options});
    if(endpoint==='/gem-survivor/create')return {ok:true,status:200,data:{roomId:'id-1',inviteCode:'3',gameId:'gem-survivor',guestToken:'guest-token'}};
    if(endpoint==='/gem-survivor/join')return {ok:true,status:200,data:{roomId:'id-2',inviteCode:options.body.inviteCode,gameId:'gem-survivor',guestToken:'joined-token'}};
    return {ok:true,status:200,data:{}};
  };
  const created=await client.createGemRoom(false);
  assert.equal(created.data.inviteCode,'3');
  assert.equal(client.guestToken,'guest-token');
  assert.equal(client.accessToken,'');
  assert.equal((await client.joinGemRoom('12',false)).ok,false);
  assert.equal((await client.joinGemRoom('x',false)).ok,false);
  assert.equal((await client.joinGemRoom('8',false)).data.inviteCode,'8');
  assert.equal(client.currentGameId,'gem-survivor');
  assert.equal(client.guestToken,'joined-token');
  assert.deepEqual(requests.map(row=>row.endpoint),['/gem-survivor/create','/gem-survivor/leave','/gem-survivor/join']);
  assert.equal(requests[2].options.body.inviteCode,'8');
  await client.leaveGemRoom();
  assert.equal(client.guestToken,'');
  assert.match(source,/async createFriendRoomForGame\(/);
  assert.match(worker,/if \(url\.pathname === '\/auth\/login'/);
});

test('all four games use independent numeric rooms with the original per-game player limits',async()=>{
 const worker=fs.readFileSync('multiplayer/worker.js','utf8');
 const client=fs.readFileSync('multiplayer/multiplayer-client.js','utf8');
 const ocean=fs.readFileSync('web-games/ocean-voyage/main.mjs','utf8');
 const cozy=fs.readFileSync('web-games/cozy-island/kingdom-system.js','utf8');
 const party=fs.readFileSync('web-games/party-rpg/index.html','utf8');
 const renderer=fs.readFileSync('web-games/party-rpg/view.mjs','utf8');
 const oceanScene=fs.readFileSync('web-games/ocean-voyage/ocean3d.mjs','utf8');
 const mod=await import('data:text/javascript;base64,'+Buffer.from(worker).toString('base64'));
 const store=new Map(),ctx={storage:{get:async key=>store.get(key),put:async(key,value)=>store.set(key,structuredClone(value))}};
 const mm=new mod.Matchmaker(ctx,{});
 const samples=[];
 for(const gameId of ['gem-survivor','ocean-voyage','cozy-island','party-rpg']){
  const room=await (await mm.gemCreate(gameId)).json();
  const maxPlayers=gameId==='cozy-island'?2:4;
  assert.match(room.inviteCode,/^[0-9]$/);
  assert.equal(room.gameId,gameId);
  assert.equal(room.maxPlayers,maxPlayers);
  assert.equal(room.players,1);
  samples.push(room);
  for(let i=2;i<=maxPlayers;i++){
   const joined=await mm.gemJoin({gameId,inviteCode:room.inviteCode});
   assert.equal(joined.status,200);
   assert.equal((await joined.json()).players,i);
  }
  assert.equal((await mm.gemJoin({gameId,inviteCode:room.inviteCode})).status,409);
  assert.equal((await mm.gemAuthorize({roomId:room.roomId,guestToken:room.guestToken})).status,200);
 }
 assert.equal(new Set(samples.map(row=>row.inviteCode)).size,1,'each game gets a separate one-digit room namespace');
 assert.notEqual(samples[0].roomId,samples[1].roomId);
 assert.equal((await mm.gemAuthorize({roomId:samples[1].roomId,guestToken:samples[2].guestToken})).status,401);
 assert.equal((await mm.gemLeave({roomId:samples[1].roomId,guestToken:samples[1].guestToken})).status,200);
 assert.equal((await mm.gemAuthorize({roomId:samples[1].roomId,guestToken:samples[1].guestToken})).status,401);
 assert.match(client,/async createNumberRoomForGame\(/);
 assert.match(client,/async joinNumberRoomForGame\(/);
 assert.match(ocean,/createNumberRoomForGame\('ocean-voyage'\)/);
 assert.match(ocean,/joinNumberRoomForGame\('ocean-voyage',code\)/);
 assert.match(oceanScene,/setCoopShips\(list\)/);
 assert.match(cozy,/createNumberRoomForGame\('cozy-island'\)/);
 assert.match(cozy,/joinNumberRoomForGame\('cozy-island',code\)/);
 assert.doesNotMatch(cozy,/RTCPeerConnection|ks-peer-code|ks-own-code/);
 assert.match(party,/createNumberRoomForGame\('party-rpg'\)/);
 assert.match(party,/joinNumberRoomForGame\('party-rpg',number\)/);
 assert.match(renderer,/live\.coopPlayers/);
 assert.match(party,/coopPlayers:\[\.\.\.coop\.peers\.values\(\)\]/);
 for(const html of [fs.readFileSync('web-games/ocean-voyage/index.html','utf8'),party]){
  assert.match(html,/maxlength="1"/);
  assert.match(html,/방 만들기/);
  assert.match(html,/방 참가/);
 }
});
