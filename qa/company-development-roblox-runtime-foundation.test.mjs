// 파일명: qa/company-development-roblox-runtime-foundation.test.mjs
// 역할: 클라우드 런타임 증거와 검수 경계 회귀 검사.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fetchRobloxRuntimeFoundationEvidence,probeRobloxOpenCloudEngine,probeRobloxOpenCloudImageEvidence,validateRobloxRuntimeFoundationEvidence,validateRobloxMultiplayerSourceContract} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=(name,sequence)=>({name,at:1,sequence,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21,...(name==='MULTIPLAYER_SYNC'?{participantCount:2}:{})});
const names=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','SAVE_ROUNDTRIP','MULTIPLAYER_SYNC','CORE_LOOP_READY'];
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,requirements:{saveEnabled:true,multiplayerRequired:true},checkpoints:Object.fromEntries(names.map((x,index)=>[x,checkpoint(x,index+1)]))};


test('Roblox runtime foundation push wake includes its deterministic QA contracts but ignores descriptive architecture edits',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const pushStart=workflow.indexOf('  push:');
 const pushEnd=workflow.indexOf('  workflow_dispatch:',pushStart);
 const pushBlock=workflow.slice(pushStart,pushEnd);
 assert.ok(pushStart>=0&&pushEnd>pushStart);
 assert.match(pushBlock,/qa\/company-development-roblox-runtime-foundation\.test\.mjs/);
 assert.match(pushBlock,/qa\/company-development-roblox-studio-local-play\.test\.mjs/);
 assert.doesNotMatch(pushBlock,/company-learning\/company-architecture-map\.json/);
 assert.match(pushBlock,/tools\/company-development-roblox-runtime-foundation\.mjs/);
 assert.match(pushBlock,/tools\/company-development-roblox-studio-local-play\.mjs/);
 assert.match(pushBlock,/company-learning\/platform-release-roadmap\.json/);
 assert.match(pushBlock,/roblox-games\/\.company-runtime-trigger/);
});
test('Roblox post-work verification defaults to Open Cloud runtime plus image sanity without requiring Studio',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/SERVER_DIAGNOSTIC_ENABLED:\s*true/);
 assert.match(workflow,/probeRobloxOpenCloudImageEvidence/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_IMAGE_CHECK=/);
 assert.match(workflow,/openCloudImageEvidence:engineProbe\?\.imageEvidence\|\|null/);
 assert.match(workflow,/run_studio:[\s\S]*?default:\s*false/);
});

test('event-driven Roblox runtime foundation QA has no delayed cron and does not require full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
 assert.doesNotMatch(header,/schedule:/);
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
});

test('actual Roblox sentinel passes F1 through F8 only for the exact deployed place version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 for(const field of ['f1ServerBootPassed','f2WorldFoundationPassed','f3CharacterFoundationPassed','f4PhysicsAndMovementPassed','f5InputCameraUiPassed','f6CoreServicesPassed','f8GameplaySystemsPassed'])assert.equal(r[field],true,field);
 assert.equal(r.f7MultiplayerFoundationPassed,false,'multiplayer F7 is verified by the exact-source code contract separately');
});


test('foundation sentinel blocks causally out-of-order boot world spawn character evidence',()=>{
 const broken=structuredClone(good);
 const worldSequence=broken.checkpoints.WORLD_READY.sequence;
 broken.checkpoints.WORLD_READY.sequence=broken.checkpoints.SPAWN_READY.sequence;
 broken.checkpoints.SPAWN_READY.sequence=worldSequence;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.checkpointOrderPassed,false);
 assert.equal(r.runtimeFoundationPassed,false);
 assert.ok(r.blockers.includes('checkpointOrder'));
});

test('cozy island runtime probe uses monotonic sentinel sequence and full ground-contact timeout',()=>{
 const server=fs.readFileSync('roblox-games/cozy-island/server/Game.server.luau','utf8');
 assert.match(server,/data\.sequence=math\.max\(0,math\.floor\(tonumber\(data\.sequence\)or 0\)\)\+1/);
 assert.match(server,/row\.sequence=data\.sequence/);
 assert.match(server,/local deadline=os\.clock\(\)\+3/);
 assert.match(server,/task\.wait\(\.1\)/);
 assert.match(server,/SPAWN_FOUNDATION_MISSING/);
 assert.match(server,/INVALID_ROOT_POSITION/);
 assert.doesNotMatch(server,/task\.delay\(\.6,function\(\)/);
});

test('foundation sentinel blocks floating character evidence without ground contact',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.GROUND_CONTACT;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,false);assert.equal(r.runtimeAcceptancePassed,false);assert.ok(r.blockers.includes('checkpoint:GROUND_CONTACT'));
});


test('runtime foundation does not wait for live multiplayer synchronization',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.MULTIPLAYER_SYNC;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 assert.equal(r.f7MultiplayerFoundationPassed,false);
 assert.equal(r.multiplayerPromotionPending,false);
 assert.equal(r.requiredCheckpoints.includes('MULTIPLAYER_SYNC'),false);
});


test('runtime foundation ignores multiplayer participant count because F7 is source-contract only',()=>{
 const onePlayer=structuredClone(good);onePlayer.checkpoints.MULTIPLAYER_SYNC.participantCount=1;
 const one=validateRobloxRuntimeFoundationEvidence({sentinel:onePlayer,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 const twoPlayers=structuredClone(good);twoPlayers.checkpoints.MULTIPLAYER_SYNC.participantCount=2;
 const two=validateRobloxRuntimeFoundationEvidence({sentinel:twoPlayers,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(one.runtimeAcceptancePassed,true);
 assert.equal(two.runtimeAcceptancePassed,true);
 assert.equal(one.f7MultiplayerFoundationPassed,false);
 assert.equal(two.f7MultiplayerFoundationPassed,false);
});

test('multiplayer F7 passes from exact source code contract without launching two clients',()=>{
 const server=[
  'local participants=Players:GetPlayers()',
  'if #participants>=2 then shared=1 end',
  'remote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})',
 ].join('\n');
 const client='remote.OnClientEvent:Connect(function(kind,payload) if kind~="MULTIPLAYER_SYNC" then return end local n=payload.ParticipantCount end)';
 const r=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
 assert.equal(r.passed,true);
 assert.equal(r.runtimeTwoClientExecutionRequired,false);
 assert.equal(r.checks.twoParticipantCapablePath,true);
 assert.equal(r.authority,'roblox-static-two-client-source-contract');
});

test('F9 final review uses shallow checkout instead of full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
 assert.match(workflow,/Checkout canonical runtime state[\s\S]*?fetch-depth:\s*1/);
});

test('central policy makes multiplayer F7 an exact-source code contract with no two-client runtime launch',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const stack=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack;
 const f7=stack.layers.find(layer=>layer.id==='F7');
 assert.equal(f7.releaseGateMode,'STATIC_CODE_CONTRACT');
 assert.deepEqual(f7.checks,['MINIMUM_TWO_PARTICIPANT_CODE_PATH','ONE_AUTHORITATIVE_SHARED_STATE_BROADCAST_CODE','CLIENT_MULTIPLAYER_SYNC_HANDLER_CONTRACT']);
 const proof=stack.robloxContract.multiplayerReleaseProof;
 assert.equal(proof.mode,'STATIC_CODE_CONTRACT');
 assert.equal(proof.minimumParticipants,2);
 assert.equal(proof.runtimeExecutionRequired,false);
 assert.equal(proof.actualRuntimeCheckpointRequired,false);
 assert.equal(proof.sourceContractRequired,true);
 assert.equal(proof.sameProofReusedForInternalAndPublic,true);
 assert.equal(proof.duplicatePublicMultiplayerCheckRequired,false);
 assert.equal(stack.releaseGate.f9Checkout.sameCheckoutContractForInternalAndPublic,true);
});
test('runtime acceptance stays pending until actual gameplay core-loop action occurs',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.CORE_LOOP_READY;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);assert.equal(r.runtimeAcceptancePassed,false);assert.equal(r.f8GameplaySystemsPassed,false);
});

test('foundation sentinel blocks stale evidence from another published version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:22});
 assert.equal(r.runtimeFoundationPassed,false);assert.equal(r.runtimeAcceptancePassed,false);assert.ok(r.blockers.includes('exactVersion'));
});


test('foundation sentinel rejects checkpoints carried over from an older published place version',()=>{
 const stale=structuredClone(good);
 stale.placeVersion=22;
 for(const row of Object.values(stale.checkpoints))row.placeVersion=21;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:stale,gameId:'cozy-island',placeId:'116850096561713',versionNumber:22});
 assert.equal(r.runtimeFoundationPassed,false);
 assert.equal(r.runtimeAcceptancePassed,false);
 assert.ok(r.blockers.includes('checkpoint:SERVER_BOOT'));
});


test('local F0 artifact never enters runtime or cloud-image validation before private candidate deployment',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const start=workflow.indexOf('            if(localPreF9Candidate){');
  const cloudImage=workflow.indexOf("            if(engineProbe?.imageEvidence?.imageContentPassed!==true){",start);
  assert.ok(start>0&&cloudImage>start);
  const guard=workflow.slice(start,cloudImage);
  assert.match(guard,/ROBLOX_LOCAL_F0_STATE_REPAIRED_TO_PRIVATE_DEPLOY=/);
  assert.match(guard,/ROBLOX_LOCAL_F0_WAITING_PRIVATE_DEPLOY=/);
  assert.match(guard,/item\.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'/);
  assert.match(guard,/item\.robloxFailureStage='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'/);
  assert.match(guard,/item\.robloxFailureSignature='ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING'/);
  assert.match(guard,/item\.routingBlockers=\['roblox-runtime-candidate-deploy-pending'\]/);
  assert.match(guard,/item\.robloxCloudImageEvidence=null/);
  assert.match(guard,/localF0PrivateDeployIds\.push\(item\.gameId\)/);
  assert.match(guard,/pending\+\+;\s*continue;/);
  assert.match(workflow,/roblox-local-f0-private-deploy-ids/);
  assert.match(workflow,/Resume repaired local F0 candidates through canonical Roblox runtime/);
  assert.match(workflow,/gh workflow run company-development-roblox-runtime\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow,/ROBLOX_LOCAL_F0_RUNTIME_RESUME=DEDUPED_CURRENT_MAIN:/);
  assert.match(workflow,/String\(run\.head_sha\|\|''\)===currentMain/);
  assert.ok(workflow.indexOf('if(localPreF9Candidate){')<workflow.indexOf("if(engineProbe?.persistentFailure===true){"));
});


test('Open Cloud image check records thumbnail metadata as visual sanity without claiming runtime screenshot proof',async()=>{
 const ok=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:1,networkRetryDelayMs:0,
  fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify({
   thumbnails:[{homepageThumbnailId:'thumb-1',imageUrl:'https://tr.rbxcdn.com/example-thumbnail.png'}]
  })}),
 });
 assert.equal(ok.available,true);
 assert.equal(ok.imageMetadataAvailable,true);
 assert.equal(ok.thumbnailCount,1);
 assert.equal(ok.runtimeScreenshot,false);
 assert.equal(ok.exactRuntimeVersionImage,false);
 assert.equal(ok.state,'IMAGE_CONTENT_UNVERIFIED');
 assert.equal(ok.imageContentPassed,false);
 assert.equal(ok.imageVisualQualityVerified,false);
 assert.equal(ok.authority,'roblox-open-cloud-thumbnail-image-sanity');

 const denied=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:1,networkRetryDelayMs:0,
  fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({message:'required scope <universe.thumbnail:read>'})}),
 });
 assert.equal(denied.available,false);
 assert.equal(denied.permissionDenied,true);
 assert.equal(denied.requiredScope,'universe.thumbnail:read');
});

test('cloud image evidence fetches actual CDN bytes without leaking the API key or claiming rendered gameplay',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=','base64');
 const calls=[];
 const result=await probeRobloxOpenCloudImageEvidence({universeId:'1',apiKey:'secret-test-key',networkRetryAttempts:1,fetchImpl:async(url,init)=>{
  calls.push({url,init});
  if(url.startsWith('https://apis.roblox.com/'))return new Response(JSON.stringify({thumbnails:[{imageUrl:'https://tr.rbxcdn.com/image.png'},{imageUrl:'https://tr.rbxcdn.com/image.png'}]}));
  assert.equal(init.headers?.['x-api-key'],undefined);
  assert.equal(init.redirect,'error');
  return new Response(png,{headers:{'content-type':'image/png'}});
 }});
 assert.equal(calls.length,2,'same CDN image is read only once');
 assert.equal(result.imageContentPassed,true);
 assert.equal(result.imageContent[0].bytes,png.length);
 assert.match(result.imageContent[0].sha256,/^[a-f0-9]{64}$/);
 assert.equal(result.runtimeScreenshot,false);
 assert.equal(result.exactRuntimeVersionImage,false);
 assert.equal(result.imageVisualQualityVerified,false);
});



test('cloud image content verification keeps full coverage with bounded worker concurrency',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=','base64');
 const urls=Array.from({length:12},(_,i)=>'https://tr.rbxcdn.com/image-'+i+'.png');
 let active=0,maxActive=0,imageCalls=0;
 const result=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:1,networkRetryDelayMs:0,
  fetchImpl:async(url,init={})=>{
   if(url.startsWith('https://apis.roblox.com/'))return new Response(JSON.stringify({thumbnails:urls.map(imageUrl=>({imageUrl}))}));
   assert.ok(init.signal,'CDN request must remain bounded');
   imageCalls++;
   active++;
   maxActive=Math.max(maxActive,active);
   await new Promise(resolve=>setTimeout(resolve,5));
   active--;
   return new Response(png,{headers:{'content-type':'image/png'}});
  },
 });
 assert.equal(imageCalls,12,'every returned CDN image is verified');
 assert.equal(result.imageContent.length,12);
 assert.equal(result.imageContentPassed,true);
 assert.ok(maxActive>4,'image verification is no longer limited to serial batches of four');
 assert.ok(maxActive<=8,'image verification stays within the bounded worker pool');
 const source=fs.readFileSync('tools/company-development-roblox-runtime-foundation.mjs','utf8');
 assert.match(source,/const imageWorkerCount=Math\.max\(1,Math\.min\(8,urls\.length\|\|1\)\)/);
 assert.match(source,/AbortSignal\.timeout\(12000\)/);
});

test('cloud image validation rejects unsafe URLs corrupt payloads and metadata-only responses',async()=>{
 for(const [imageUrl,response,expected] of [
  ['https://example.com/image.png',null,'UNTRUSTED_IMAGE_URL'],
  ['https://tr.rbxcdn.com/image.png',new Response('<html>failure</html>',{headers:{'content-type':'text/html'}}),'IMAGE_CONTENT_TYPE_INVALID'],
  ['https://tr.rbxcdn.com/image.png',new Response('corrupt',{headers:{'content-type':'image/png'}}),'IMAGE_SIGNATURE_INVALID'],
  ['https://tr.rbxcdn.com/image.png',new Response('',{headers:{'content-type':'image/png','content-length':String(9*1024*1024)}}),'IMAGE_TOO_LARGE']
 ]){
  let calls=0;
  const result=await probeRobloxOpenCloudImageEvidence({universeId:'1',apiKey:'k',networkRetryAttempts:1,fetchImpl:async url=>{
   calls++;if(url.startsWith('https://apis.roblox.com/'))return new Response(JSON.stringify({thumbnails:[{imageUrl}]}));
   return response;
  }});
  assert.equal(result.imageContentPassed,false,expected);
  assert.equal(result.imageContent[0].error,expected);
  if(expected==='UNTRUSTED_IMAGE_URL')assert.equal(calls,1);
 }
 const noUrl=await probeRobloxOpenCloudImageEvidence({universeId:'1',apiKey:'k',fetchImpl:async()=>new Response(JSON.stringify({thumbnails:[{homepageThumbnailId:'1'}]}))});
 assert.equal(noUrl.imageContentPassed,false);
 assert.equal(noUrl.state,'IMAGE_CONTENT_UNVERIFIED');
});

test('cloud workflow runs independent engine and image requests together and preserves sibling results on failure',async()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('          const probes=new Array(candidates.length);');
 const end=workflow.indexOf("          fs.writeFileSync('/tmp/roblox-open-cloud-engine-probes.json'",start);
 assert.ok(start>0&&end>start);
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('candidates','requested','process','probeRobloxOpenCloudEngine','probeRobloxOpenCloudImageEvidence','console',workflow.slice(start,end)+'\nreturn probes;');
 let images=0,engines=0;
 const rows=[1,2].map(n=>({gameId:'game-'+n,robloxSourceCommit:'source-'+n,robloxBuildArtifactIdentity:'artifact-'+n,robloxRuntimeCandidateEvidence:{universeId:'1',placeId:String(n),versionNumber:n}}));
 const probes=await run(rows,'',{env:{ROBLOX_OPEN_CLOUD_API_KEY:'k'}},async({placeId})=>{
  engines++;assert.equal(images,1,'image request starts before waiting for engine completion');
  await Promise.resolve();if(placeId==='1')throw Error('ROBLOX_OPEN_CLOUD_HTTP_503');
  return{engineExecuted:true,exactPlace:true,exactVersion:true};
 },async()=>{images++;return{imageContentPassed:true,runtimeScreenshot:false,exactRuntimeVersionImage:false};},{log(){}});
 assert.equal(images,1,'shared universe image read is coalesced');
 assert.equal(engines,2);
 assert.equal(probes[0].persistentFailure,true);
 assert.equal(probes[0].imageEvidence.imageContentPassed,true);
 assert.equal(probes[1].engineExecuted,true);
 assert.equal(probes[1].imageEvidence.requestContext.sourceRevision,'source-2');
 assert.equal(probes[1].imageEvidence.requestContext.observedImageRevision,false);
});

test('Open Cloud runtime reads retry transient DNS failures without weakening API errors',async()=>{
 const dnsError=()=>Object.assign(new TypeError('fetch failed'),{cause:{code:'EAI_AGAIN'}});
 let datastoreCalls=0;
 const sentinel=await fetchRobloxRuntimeFoundationEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   datastoreCalls++;
   if(datastoreCalls===1)throw dnsError();
   return {ok:true,status:200,text:async()=>JSON.stringify({value:{gameId:'g',placeId:'2',placeVersion:3,checkpoints:{}}})};
  },
 });
 assert.equal(datastoreCalls,2);
 assert.equal(sentinel.gameId,'g');

 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
  ]}]}}
 ];
 let engineCalls=0;
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:2,
  networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   engineCalls++;
   if(engineCalls===1)throw dnsError();
   const row=responses.shift();
   return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
  },
 });
 assert.equal(engineCalls,4);
 assert.equal(result.engineExecuted,true);
 assert.equal(result.exactPlace,true);
 assert.equal(result.exactVersion,true);
});

test('Open Cloud requests bound each attempt and retry request timeouts',async()=>{
 let calls=0;
 const result=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:2,networkRetryDelayMs:0,
  fetchImpl:async(_url,init={})=>{
   calls++;
   assert.ok(init.signal,'Open Cloud request must carry a bounded abort signal');
   if(calls===1){
    const error=new Error('request timed out');
    error.name='TimeoutError';
    throw error;
   }
   return new Response(JSON.stringify({thumbnails:[]}));
  },
 });
 assert.equal(calls,2);
 assert.equal(result.available,true);
 assert.equal(result.state,'NO_IMAGE_METADATA');
});

test('Open Cloud engine probe retries transient HTTP throttling without weakening persistent API failures',async()=>{
 let calls=0;
 const responses=[
  {ok:false,status:429,body:{errors:[{code:0,message:'rate limited'}]}},
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
  ]}]}}
 ];
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:2,
  networkRetryAttempts:4,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   calls++;
   const row=responses.shift();
   return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
  },
 });
 assert.equal(calls,4);
 assert.equal(result.engineExecuted,true);
 assert.equal(result.exactVersion,true);

 let persistentCalls=0;
 const throttled=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:1,
  networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   persistentCalls++;
   return {ok:false,status:429,text:async()=>JSON.stringify({errors:[{code:0,message:'rate limited'}]})};
  },
 });
 assert.equal(persistentCalls,3);
 assert.equal(throttled.persistentFailure,true);
 assert.equal(throttled.externalCapacityDeferred,true);
 assert.equal(throttled.status,429);
 assert.equal(throttled.failureStage,'CREATE');
 assert.ok(Number(throttled.retryAfterSeconds)>=60);
 assert.ok(Number.isFinite(Date.parse(throttled.retryNotBefore)));
});

test('Open Cloud long Retry-After becomes exact deferred-capacity evidence without holding the current runner',async()=>{
 let calls=0;
 const before=Date.now();
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:1,
  networkRetryAttempts:3,networkRetryDelayMs:1000,
  fetchImpl:async()=>{
   calls++;
   return {
    ok:false,
    status:429,
    headers:{get:name=>String(name).toLowerCase()==='retry-after'?'1200':null},
    text:async()=>JSON.stringify({code:'RESOURCE_EXHAUSTED',message:'rate limited'}),
   };
  },
 });
 assert.equal(calls,1,'long provider capacity wait is deferred instead of sleeping inside this run');
 assert.equal(result.persistentFailure,true);
 assert.equal(result.externalCapacityDeferred,true);
 assert.equal(result.status,429);
 assert.equal(result.failureStage,'CREATE');
 assert.equal(result.retryAfterSeconds,1200);
 assert.ok(Date.parse(result.retryNotBefore)>=before+1199000);
 assert.match(result.error,/ROBLOX_OPEN_CLOUD_ENGINE_CREATE_HTTP_429/);
});

test('Open Cloud engine probe binds exact place version without granting runtime acceptance',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=false'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,init});
  const row=responses.shift();
  return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
 };
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
 assert.equal(r.engineExecuted,true);
 assert.equal(r.exactPlace,true);
 assert.equal(r.exactVersion,true);
 assert.equal(r.playerCount,0);
 assert.equal(r.serverBootObserved,true);
 assert.equal(r.serverBootEvidence.headlessServerExecution,true);
 assert.equal(r.serverBootEvidence.livePlayerSimulationClaimed,false);
 assert.equal(r.serverBootEvidence.legacyFoundationServerBootMarkerObserved,false);
 assert.match(calls[0].url,/versions\/20\/luau-execution-session-tasks$/);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_VERSION/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true/);
 assert.doesNotMatch(body.script,/MULTIPLAYER_SYNC.*true|runtimeAcceptancePassed|robloxRuntimePassed/);
});

test('Open Cloud engine probe records headless Luau execution without pretending it is a live simulation',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING_BEFORE=false'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ATTEMPTED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_SUCCEEDED=false'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ERROR=permission denied'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING=false'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=false'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{calls.push({url,init});const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
 assert.equal(r.simulationRunningBefore,false);
 assert.equal(r.simulationStartAttempted,true);
 assert.equal(r.simulationStartSucceeded,false);
 assert.equal(r.simulationStartError,'permission denied');
 assert.equal(r.simulationRunning,false);
 assert.equal(r.serverBootObserved,true);
 assert.equal(r.serverBootEvidence.headlessServerExecution,true);
 assert.equal(r.serverBootEvidence.livePlayerSimulationClaimed,false);
 assert.equal(r.serverBootEvidence.simulationStartAttempted,true);
 assert.equal(r.serverBootEvidence.simulationStartSucceeded,false);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/RunService:IsRunning\(\)/);
 assert.match(body.script,/pcall\(function\(\) RunService:Run\(\) end\)/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_ATTEMPTED/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_START_SUCCEEDED/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true/);
 assert.match(body.script,/Foundation_SERVER_BOOT/);
 assert.doesNotMatch(body.script,/task\.wait\(0\.5\)/);
 assert.doesNotMatch(body.script,/SetAttribute\("Foundation_SERVER_BOOT",true\)/);
 assert.doesNotMatch(body.script,/MULTIPLAYER_SYNC.*true|runtimeAcceptancePassed|robloxRuntimePassed/);
});

test('Open Cloud engine probe matches the exact selected Studio material atoms in the deployed target version',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=1'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,init});
  const row=responses.shift();
  return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
 };
 const expected={applied:true,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']}};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:expected,
 });
 assert.equal(r.engineExecuted,true);
 assert.equal(r.studioAssetBindingRequired,true);
 assert.equal(r.studioAssetApplied,true);
 assert.equal(r.studioAssetBindingVersion,1);
 assert.deepEqual(r.expectedStudioAssetAtoms,['BAR_HEALTH','BUTTON_PRIMARY','FRAME_PANEL']);
 assert.deepEqual(r.observedStudioAssetAtoms,['BAR_HEALTH','BUTTON_PRIMARY','FRAME_PANEL']);
 assert.equal(r.studioAssetSelectionMatched,true);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/STUDIO_ASSET_APPLIED/);
 assert.match(body.script,/StudioAssets/);
});

test('Open Cloud engine probe matches the declared current Studio asset binding version',async()=>{
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async()=>{const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:{applied:true,bindingVersion:2,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']}},
 });
 assert.equal(r.expectedStudioAssetBindingVersion,2);
 assert.equal(r.studioAssetBindingVersion,2);
 assert.equal(r.studioAssetSelectionMatched,true);
});

test('Open Cloud engine probe binds exact package selection fingerprint and library version on the deployed version',async()=>{
 const fingerprint='a'.repeat(64);
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_SELECTION_FINGERPRINT='+fingerprint},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_LIBRARY_VERSION=109'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async()=>{const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const expected={
  required:true,bindingVersion:2,libraryVersion:109,selectionFingerprint:fingerprint,
  expectedAtomIds:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
  buildUpAssetSourceUsageFingerprint:'b'.repeat(64)
 };
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:expected,
 });
 assert.equal(r.studioAssetBindingRequired,true);
 assert.equal(r.studioAssetSelectionMatched,true);
 assert.equal(r.studioAssetAtomMatch,true);
 assert.equal(r.studioAssetFingerprintMatch,true);
 assert.equal(r.studioAssetLibraryVersionMatch,true);
 assert.equal(r.expectedStudioAssetSelectionFingerprint,fingerprint);
 assert.equal(r.observedStudioAssetSelectionFingerprint,fingerprint);
 assert.equal(r.expectedStudioAssetLibraryVersion,109);
 assert.equal(r.observedStudioAssetLibraryVersion,109);
 assert.equal(r.expectedBuildUpAssetSourceUsageFingerprint,'b'.repeat(64));

 const mismatchResponses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t2',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_SELECTION_FINGERPRINT='+'c'.repeat(64)},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_LIBRARY_VERSION=108'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const mismatch=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:expected,
  fetchImpl:async()=>{const row=mismatchResponses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};},
 });
 assert.equal(mismatch.studioAssetSelectionMatched,false);
 assert.equal(mismatch.studioAssetFingerprintMatch,false);
 assert.equal(mismatch.studioAssetLibraryVersionMatch,false);
});

test('Open Cloud engine probe rejects a deployed Studio material selection mismatch',async()=>{
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=1'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async()=>{const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:{applied:true,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY']}},
 });
 assert.equal(r.studioAssetSelectionMatched,false);
});

test('post-runtime QA requires target-engine Studio material selection match before binding PASS',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/expectedStudioAssetBinding:\(item\.robloxStudioAssetBindingApplied===true\|\|item\.robloxStudioAssetBinding\?\.required===true\)\?item\.robloxStudioAssetBinding:null/);
 assert.match(workflow,/engineProbe\?\.studioAssetSelectionMatched===true/);
 assert.match(workflow,/if\(exactStudioPlay\)item\.robloxNativeFailureClass=null/);
 assert.match(workflow,/targetEngineSelectionMatched:engineProbe\?\.studioAssetSelectionMatched===true/);
 assert.match(workflow,/expectedStudioAssetAtoms:engineProbe\?\.expectedStudioAssetAtoms\|\|\[\]/);
 assert.match(workflow,/observedStudioAssetAtoms:engineProbe\?\.observedStudioAssetAtoms\|\|\[\]/);
});

test('Open Cloud engine probe reports missing scope without fabricating evidence',async()=>{
 const fetchImpl=async()=>({ok:false,status:403,text:async()=>JSON.stringify({code:'PERMISSION_DENIED',message:'The required scope <universe.place.luau-execution-session:1:write> is missing.'})});
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:1});
 assert.equal(r.available,false);
 assert.equal(r.permissionDenied,true);
 assert.equal(r.engineExecuted,false);
 assert.equal(r.exactVersion,false);
 assert.equal(r.failureStage,'CREATE');
 assert.equal(r.requiredScope,'universe.place.luau-execution-session:1:write');
 assert.equal(r.errorCode,'PERMISSION_DENIED');
});

test('F9 final review requires exact Studio asset runtime proof when a binding was applied',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(workflow,/const studioAssetBindingRequired=item\.robloxStudioAssetBindingApplied===true/);
 assert.match(workflow,/const studioAssetRuntimeBindingExact=!studioAssetBindingRequired/);
 assert.match(workflow,/ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS/);
 assert.match(workflow,/post\.studioAssetRuntimeBindingEvidence\?\.sourceRevision===sourceRevision/);
 assert.match(workflow,/post\.studioAssetRuntimeBindingEvidence\?\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
 assert.match(workflow,/&&studioAssetRuntimeBindingExact===true/);
});

test('F9 canonical publish uses exact F9 released-game identity and immediately reopens the next evolution cycle',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const dispatchAt=workflow.indexOf('Dispatch exact F9-verified artifact to canonical Roblox game target');
 const fanInAt=workflow.indexOf('Fan verified F9 runtime proof into waiting Vibe Roblox tasks');
 assert.ok(dispatchAt>=0&&fanInAt>dispatchAt,'canonical publish dispatch must precede Vibe refill');
 assert.match(workflow,/robloxF9VerifiedPrepublishEvidence/);
 assert.match(workflow,/robloxCanonicalPublishQueue/);
 assert.match(workflow,/status:'PENDING'/);
 assert.match(workflow,/const releaseReadiness=evaluateInternalRelease\(item,'ROBLOX',roadmap\)/);
 assert.match(workflow,/const serverPublishEligible=[\s\S]*?releaseReadiness\.ready===true[\s\S]*?item\.robloxFinalReviewPassed===true[\s\S]*?item\.robloxF9ReleaseRegressionPassed===true[\s\S]*?candidate\.sourceRevision===sourceRevision[\s\S]*?candidate\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/item\.robloxInternalReleaseReady=serverPublishEligible/);
 assert.match(workflow,/if\(serverPublishEligible&&!publishQueue/);
 assert.match(workflow,/item\.currentStep='POST_F9_CONTINUOUS_EVOLUTION'/);
 assert.match(workflow,/ROBLOX_F9_CANONICAL_PUBLISH_DISPATCHED=/);
 const dispatch=workflow.slice(dispatchAt,workflow.indexOf('Immediately continue each successfully persisted Roblox F9 game',dispatchAt));
 assert.match(dispatch,/row\.finalReviewPassed!==true\|\|row\.f9ReleaseRegressionPassed!==true/);
 assert.match(dispatch,/row\.f9Evidence\?\.sourceRevision!==row\.sourceRevision/);
 assert.match(dispatch,/row\.f0Evidence\?\.artifactIdentity!==row\.artifactIdentity/);
 assert.match(dispatch,/currentCycle&&\(item\.robloxQualityBuildUpRequired===true/);
 assert.doesNotMatch(dispatch,/evaluateInternalRelease/);
 assert.match(workflow,/ROBLOX_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);
 assert.match(workflow,/event_type:"vibe2-fanin-refill"/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_DISPATCHED=\$refill_count/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_REQUIRES_SETTLED_WAITER=NO/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_GAME_DISPATCHED=\$game_id/);
});


test('post-runtime Open Cloud engine probes keep bounded cross-game parallelism while retrying 429 per game',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const foundation=fs.readFileSync('tools/company-development-roblox-runtime-foundation.mjs','utf8');
 assert.doesNotMatch(workflow,/const throttlePressure=candidates\.some/);
 assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_PARALLEL_MODE=MAX8_FILL_AVAILABLE/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_429_SCOPE=PER_GAME_RETRY_ONLY/);
 assert.match(workflow,/networkRetryAttempts:3,networkRetryDelayMs:1000/);
 assert.match(workflow,/networkRetryAttempts:2,networkRetryDelayMs:750/);
 assert.match(foundation,/const exponentialDelay=Math\.min\(30000,baseDelayMs\*Math\.max\(1,2\*\*Math\.max\(0,attempt-1\)\)\)/);
 assert.match(foundation,/openCloudEngineCreateAdmissionTail=Promise\.resolve\(\)/);
 assert.match(foundation,/createAdmissionIntervalMs=12500/);
 assert.match(foundation,/ROBLOX_OPEN_CLOUD_ENGINE_CREATE_ADMISSION_WAIT=/);
 assert.match(foundation,/ROBLOX_OPEN_CLOUD_ENGINE_CREATE_CAPACITY_BLOCKED/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_RATE_LIMIT_WAIT=/);
 assert.match(workflow,/retryNotBefore/);
 assert.match(workflow,/externalCapacityDeferred/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_EXACT_GATE_RETRY_DEFERRED=/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_FAILURE=/);
 assert.match(workflow,/probes\[index\]=probe/);
 assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_PROBE_COUNT=/);
 assert.match(workflow,/writeFileSync\('\/tmp\/roblox-open-cloud-engine-probes\.json'/);
 assert.doesNotMatch(workflow,/Promise\.all\(candidates\.map/);
});

test('post-runtime Open Cloud retries are bounded so one transient candidate cannot occupy the batch for the full job timeout',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('      - name: Probe exact Roblox Open Cloud engine execution');
 const end=workflow.indexOf('      - name: Read exact runtime sentinel and persist tester QA evidence',start);
 const block=workflow.slice(start,end);
 assert.match(block,/networkRetryAttempts:2,networkRetryDelayMs:750/);
 assert.match(block,/networkRetryAttempts:3,networkRetryDelayMs:1000/);
 assert.match(block,/maxPolls:45/);
 assert.doesNotMatch(block,/networkRetryAttempts:6/);
});

test('post-runtime scan persists successful sibling probes before surfacing persistent peer failures',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/persistentFailure:true/);
 assert.match(workflow,/ROBLOX_FOUNDATION_OPEN_CLOUD_PROBE_PERSISTENT_FAILURE=/);
 assert.match(workflow,/roblox-open-cloud-engine-probe-failure/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_PERSISTENT_PROBE_FAILURE_COUNT=/);
 assert.match(workflow,/Enforce persistent Open Cloud probe failures after evidence persistence/);
 const stateWriteAt=workflow.indexOf("git add development-queue.json");
 const studioDispatchAt=workflow.indexOf("ROBLOX_STUDIO_MCP_POST_FOUNDATION_DISPATCH_COUNT=");
 const failGateAt=workflow.indexOf("ROBLOX_OPEN_CLOUD_PERSISTENT_PROBE_FAILURE=YES");
 assert.ok(stateWriteAt>0&&studioDispatchAt>stateWriteAt&&failGateAt>studioDispatchAt);
});


test('exact Open Cloud server boot continues internal F9 without making Studio a gate',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEngineServerBootFromProbe){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false;[\s\S]{0,900}if\(exactEngineServerBootFromProbe\)\{/);
 assert.match(workflow,/item\.robloxRuntimePassed=false;[\s\S]{0,900}if\(exactEngineServerBootFromProbe\)\{/);
 assert.match(block,/serverBootObserved:true/);
 assert.match(block,/actualServerRuntimeEvidence:true/);
 assert.match(block,/actualClientRuntimeEvidence:false/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/externalServerBootRequired:false/);
 assert.match(block,/officialStudioMcpActualPlayPassed:exactStudioInternalValidation/);
 assert.match(block,/item\.robloxInternalReleaseReady=true/);
 assert.match(block,/item\.robloxF9PendingInParallel=true/);
 assert.match(block,/f9Ids\.push\(item\.gameId\)/);
 assert.doesNotMatch(block,/queueStudioFollowupIfEligible\(item\)/);
});


test('exact engine preboot with matching sentinel continues F9 while real server boot stays pending',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEngineVersionAwaitingRealServerBoot){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/const exactEngineVersionAwaitingRealServerBoot=[\s\S]*?engineProbe\?\.serverBootObserved!==true/);
 assert.match(block,/item\.robloxRuntimeFoundationInternalReleaseException=true/);
 assert.match(block,/item\.robloxPublicReleaseRuntimeObservationPending=true/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/externalServerBootRequired:false/);
 assert.match(block,/officialStudioMcpActualPlayPassed:exactStudioInternalValidation/);
 const runtimeResetAt=workflow.lastIndexOf('item.robloxRuntimePassed=false;',start);
 assert.ok(runtimeResetAt>0&&start-runtimeResetAt<6000);
 assert.match(block,/f9Ids\.push\(item\.gameId\)/);
 assert.doesNotMatch(block,/queueStudioFollowupIfEligible\(item\)/);
});


test('runtime sentinel 404 keeps verified Open Cloud server boot and defers only client runtime',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEngineServerBootFromProbe){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/if\(\/HTTP_404\/\.test\(message\)\)[\s\S]*?const exactEngineServerBootFromProbe=/);
 assert.match(workflow,/exactEngineServerBootFromProbe=[\s\S]*?engineProbe\?\.serverBootObserved===true/);
 assert.match(block,/authority:'roblox-open-cloud-exact-server-boot-runtime-sentinel-unavailable'/);
 assert.match(block,/observedVersionNumber:null/);
 assert.match(block,/exactVersion:true/);
 assert.match(block,/serverBootObserved:true/);
 assert.match(block,/validationProvider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY'/);
 assert.match(block,/actualServerRuntimeEvidence:true/);
 assert.match(block,/actualClientRuntimeEvidence:false/);
 assert.match(block,/ROBLOX_PUBLIC_RELEASE_CLIENT_RUNTIME_OBSERVATION_PENDING/);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false;[\s\S]{0,900}if\(exactEngineServerBootFromProbe\)\{/);
 assert.match(workflow,/item\.robloxRuntimePassed=false;[\s\S]{0,900}if\(exactEngineServerBootFromProbe\)\{/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/ROBLOX_OPEN_CLOUD_SERVER_BOOT_PASS_CLIENT_RUNTIME_PENDING=/);
 assert.doesNotMatch(block,/STUDIO_FOLLOWUP|queueStudioFollowupIfEligible/);
});


test('stale runtime sentinel keeps only exact current Open Cloud server boot and defers client runtime',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf("const exactEngineServerBootObserved=");
 const end=workflow.indexOf("}else if(exactEngineVersionAwaitingRealServerBoot){",start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(block,/engineProbe\?\.exactPlace===true/);
 assert.match(block,/engineProbe\?\.exactVersion===true/);
 assert.match(block,/engineProbe\?\.serverBootObserved===true/);
 assert.match(block,/const staleSentinelWithVerifiedServerBoot=result\.exactVersion!==true&&exactEngineServerBootObserved/);
 assert.match(block,/authority:staleSentinelWithVerifiedServerBoot[\s\S]*?'roblox-open-cloud-exact-server-boot-stale-runtime-sentinel'/);
 assert.match(block,/sentinelExactVersion:result\.exactVersion===true/);
 assert.match(block,/validationProvider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY'/);
 assert.match(block,/actualServerRuntimeEvidence:true/);
 assert.match(block,/actualClientRuntimeEvidence:false/);
 assert.match(block,/ROBLOX_PUBLIC_RELEASE_CLIENT_RUNTIME_OBSERVATION_PENDING/);
 assert.match(block,/ROBLOX_OPEN_CLOUD_SERVER_BOOT_PASS_STALE_CLIENT_RUNTIME_PENDING=/);
 assert.doesNotMatch(block,/roblox-public-release-awaiting-real-server-boot/);
});


test('central policy keeps runtime and Studio optional while code and static QA drive Roblox continuation',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
 const verify=roadmap.roblox?.developmentVerification||{};
 const studio=roadmap.roblox?.studioExecution||{};
 const stack=roadmap.developmentLifecycleMachine?.nativeGameFoundationValidationStack||{};
 const topology=architecture.robloxDevelopmentVerificationTopology||{};
 assert.deepEqual(verify.postBuildUpRequired,['CODE_QA','STATIC_QA']);
 assert.equal(verify.studio,'OPTIONAL_DIAGNOSTIC');
 assert.equal(verify.studioBlocksDevelopment,false);
 assert.equal(verify.studioBlocksF9,false);
 assert.equal(verify.studioBlocksDeployment,false);
 assert.equal(studio.required,false);
 assert.equal(studio.requiredForInternalRelease,false);
 assert.equal(studio.deploymentGate,false);
 assert.equal(studio.f9Gate,false);
 assert.equal(stack.governingPrinciples.robloxExternalServerBootRequiredBeforeInternalRelease,false);
 assert.equal(stack.releaseGate.runtimeFoundationRequiredForInternalRelease,false);
 assert.equal(stack.releaseGate.internalRuntimeValidationRequiredForInternalRelease,false);
 assert.equal(stack.releaseGate.studioRequiredForInternalRelease,false);
 assert.equal(topology.studioRole,'OPTIONAL_DIAGNOSTIC_AND_VERIFIED_LEARNING');
 assert.equal(topology.studioBlocksDevelopment,false);
 assert.equal(topology.studioBlocksF9,false);
 assert.equal(topology.studioBlocksDeployment,false);
});

test('F9 consumes exact deferred engine evidence without requiring Studio actual play',()=>{
 const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=f9.indexOf('const internalRuntimeObservationDeferred=');
 const end=f9.indexOf('const internalRuntimeFindingDeferred=',start);
 assert.ok(start>0&&end>start);
 const block=f9.slice(start,end);
 assert.match(block,/runtime\.authority==='exact-engine-version-awaiting-real-server-boot'/);
 assert.match(block,/runtime\.authority==='roblox-open-cloud-exact-server-boot-runtime-sentinel-unavailable'/);
 assert.match(block,/runtime\.authority==='roblox-open-cloud-exact-server-boot-stale-runtime-sentinel'/);
 assert.match(block,/runtime\.exactEngineVersion===true/);
 assert.match(block,/runtime\.engineExecuted===true/);
 assert.match(block,/runtime\.serverBootObserved!==true/);
 assert.match(block,/post\.internalRuntimeObservationDeferred===true/);
 assert.match(block,/post\.exactEngineExecutionEvidence===true/);
 assert.match(block,/post\.externalServerBootRequired===false/);
 assert.match(block,/post\.independentQaPassed===true/);
 assert.match(block,/post\.regressionPassed===true/);
 assert.doesNotMatch(block,/studioPlay\.|officialStudioMcp|actualPlay/);
});


test('runtime QA validates the private candidate through cloud APIs with local Studio disabled',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/Probe exact Roblox Open Cloud engine execution/);
 assert.doesNotMatch(workflow,/Probe exact Roblox Open Cloud engine execution[\s\S]*?if: \$\{\{ inputs\.retry_open_cloud_only == true \}\}/);
 assert.match(workflow,/SERVER_DIAGNOSTIC_ENABLED: true/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_API_KEY_REQUIRED_FOR_RUNTIME_VALIDATION/);
 assert.match(workflow,/const exactStudioInternalValidation=/);
 assert.match(workflow,/if: \$\{\{ false \}\} # OWNER_DIRECTIVE_2026-10-05_CLOUD_API_ONLY/);
 assert.match(workflow,/internalStudioValidationOnly:true/);
 assert.match(workflow,/externalServerBootRequired:false/);
 assert.match(workflow,/authority:'roblox-internal-studio-single-session-qa'/);
 assert.match(workflow,/ROBLOX_INTERNAL_STUDIO_SINGLE_SESSION_PASS=/);
 assert.match(workflow,/F1_F8=COLLECTED:F9=FAN_IN_ONLY/);
});

test('exact private Roblox runtime failures continue internal flow but remain external-release blockers',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const exactPrivateRuntimeFinding=/);
 assert.match(workflow,/result\.exactGame===true/);
 assert.match(workflow,/result\.exactPlace===true/);
 assert.match(workflow,/result\.exactVersion===true/);
 assert.match(workflow,/result\.actualRuntimeEvidence===true/);
 assert.match(workflow,/item\.robloxRuntimeFailureExternalReleaseOnly=true/);
 assert.match(workflow,/item\.robloxInternalQaContinuationAllowed=true/);
 assert.match(workflow,/item\.robloxInternalRegressionContinuationAllowed=true/);
 assert.match(workflow,/item\.robloxPublicReleaseRuntimeObservationPending=true/);
 assert.match(workflow,/runtimeFailureExternalReleaseOnly:true/);
 assert.match(workflow,/internalQaContinuationAllowed:true/);
 assert.match(workflow,/internalRegressionContinuationAllowed:true/);
 assert.match(workflow,/item\.currentStep='ROBLOX_FINAL_REVIEW_REVALIDATION'/);
 assert.match(workflow,/ROBLOX_INTERNAL_FLOW_CONTINUES_RUNTIME_FINDING_EXTERNAL_ONLY=/);
 assert.match(workflow,/item\.robloxRuntimePassed=false/);
 assert.match(workflow,/item\.robloxInternalReleaseReady=true/);
 assert.match(workflow,/item\.robloxF9PendingInParallel=true/);
 assert.match(workflow,/item\.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
 assert.match(workflow,/item\.robloxFailureStage='PUBLIC_RELEASE_RUNTIME_FINDING'/);
});

test('runtime QA preserves exact permission evidence instead of misclassifying stale sentinel as executor failure',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/roblox-open-cloud-engine-probes\.json/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED/);
 assert.match(workflow,/roblox-open-cloud-luau-execution-scope-missing/);
 assert.match(workflow,/universe\.place\.luau-execution-session:write/);
 assert.match(workflow,/samePermissionBlock/);
 assert.match(workflow,/item\.robloxRuntimeRetryCount=0/);
 assert.match(workflow,/priorRetryCount===0/);
 const permissionIndex=workflow.indexOf("engineProbe?.permissionDenied===true");
 const retryResetIndex=workflow.indexOf('item.robloxRuntimeRetryCount=0');
 const sentinelIndex=workflow.indexOf('let sentinel;');
 assert.ok(permissionIndex>0&&retryResetIndex>permissionIndex&&sentinelIndex>retryResetIndex,'permission blocker must reset stale retry count before sentinel read');
});


test('post-runtime F7 accepts multiplayer code contract and does not create two-client wait state',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/validateRobloxMultiplayerSourceContract/);
 assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PASS=/);
 assert.match(workflow,/runtimeTwoClientExecutionRequired:false/);
 assert.match(workflow,/authority:'roblox-static-two-client-source-contract'/);
 assert.match(workflow,/multiplayerReleasePassed=/);
 assert.match(workflow,/runtimeAcceptanceForRelease=/);
});
test('post-runtime QA keeps exact Studio MCP-passed candidates eligible after Studio clears the runtime failure stage',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const exactStudioPlayPendingRuntime=/);
 assert.match(workflow,/studioPlay\.pass===true/);
 assert.match(workflow,/studioPlay\.actualPlay===true/);
 assert.match(workflow,/studioPlay\.officialStudioMcp===true/);
 assert.match(workflow,/studioPlay\.localPlaceFile===true/);
 assert.match(workflow,/studioPlay\.sourceRevision===sourceRevision/);
 assert.match(workflow,/studioPlay\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/Number\(studioPlay\.versionNumber\)===Number\(candidate\.versionNumber\)/);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed!==true/);
 assert.match(workflow,/item\.robloxRuntimePassed!==true/);
 assert.match(workflow,/&&\(explicitRuntimeStage\|\|exactStudioPlayPendingRuntime\|\|externalRuntimeObservationPending\)/);
});

test('post-runtime QA never waits for live multiplayer measurement',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/staticMultiplayerCodePass/);
 assert.match(workflow,/PASS_CODE_CONTRACT/);
 assert.match(workflow,/PENDING_CODE_CONTRACT/);
 assert.match(workflow,/multiplayerCodeContractMissing=multiplayer\.required===true&&!multiplayerReleasePassed/);
 assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_REPAIR=/);
 assert.doesNotMatch(workflow,/ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING/);
 assert.doesNotMatch(workflow,/roblox-runtime-foundation-f7-two-client-one-sync/);
});
test('F7 multiplayer code proof is exact-source static evidence and remains reusable by artifact identity',()=>{
 const runtime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(runtime,/const multiplayerSourceContractFor=item=>/);
 assert.match(runtime,/validateRobloxMultiplayerSourceContract/);
 assert.match(runtime,/staticMultiplayerCodePass/);
 assert.match(runtime,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PASS=/);
 assert.match(runtime,/authority:'roblox-static-two-client-source-contract'/);
 assert.match(runtime,/runtimeTwoClientExecutionRequired:false/);
 assert.match(runtime,/priorMultiplayer\.artifactIdentity===artifactIdentity/);
 assert.doesNotMatch(runtime,/priorRuntime\.f7MultiplayerFoundationPassed===true/);
 assert.match(finalReview,/post\.multiplayerValidationPassed===true/);
 assert.doesNotMatch(finalReview,/publishRobloxPlace/);
});
test('exact unchanged runtime candidate reuses verified server boot evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_EXACT_EVIDENCE_REUSE/);
  assert.match(workflow,/ROBLOX_RUNTIME_EVIDENCE_REUSED=/);
  assert.match(workflow,/reusedServerBootEvidence:exactExternalRuntimeEvidenceReusable/);
  assert.match(workflow,/EXACT_SOURCE_ARTIFACT_PLACE_VERSION_ALREADY_VERIFIED/);
  assert.match(workflow,/priorRuntime\.sourceRevision===sourceRevision/);
  assert.match(workflow,/priorRuntime\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/Number\(priorRuntime\.candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
});

test('central policy requires Roblox checkout through final promotion to stay game-parallel',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const parallel=roadmap.developmentSpeedExecution.robloxEndToEndParallelExecution;
  assert.equal(parallel.gameLevelExecution,'PARALLEL_BY_DEFAULT');
  assert.equal(parallel.checkoutParallel,true);
  assert.equal(parallel.buildParallel,true);
  assert.equal(parallel.f0Parallel,true);
  assert.equal(parallel.runtimeFoundationQaParallel,true);
  assert.equal(parallel.finalReviewParallel,true);
  assert.equal(parallel.promotionParallel,true);
  assert.equal(parallel.internalGameConcurrencyCapsForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.runtimeRunnerCapacityMaySerializeRuntimeQa,false);
  assert.equal(parallel.runtimeQaMayQueueOnlyWhenExternalProviderCapacityIsExhausted,true);
  assert.equal(parallel.serverBootEvidenceReuse.reuseOnlyWhenExactCandidateUnchanged,true);
  assert.deepEqual(parallel.serverBootEvidenceReuse.requiredExactBindings,['SOURCE_REVISION','BUILD_ARTIFACT_IDENTITY','PLACE_ID','CANDIDATE_VERSION_NUMBER']);
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.doesNotMatch(workflow,/candidates\.slice\(0,4\)/);
  assert.doesNotMatch(workflow,/const throttlePressure=candidates\.some\(item=>/);
  assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_PARALLEL_MODE=MAX8_FILL_AVAILABLE/);
  assert.match(workflow,/await Promise\.all\(Array\.from\(\{length:probeConcurrency\},\(\)=>runProbeWorker\(\)\)\)/);
  assert.doesNotMatch(workflow,/Promise\.all\(candidates\.map\(async item=>/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_PARALLEL_COUNT=/);
});


test('shared FAST_MVP runtime QA keeps only newest shared candidate current and skips superseded versions',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/const sharedCurrent=\(q\.items\|\|\[\]\)/);
  assert.match(workflow,/robloxRuntimeCandidateEvidence\?\.versionNumber\|\|0\)-Number\(a\.robloxRuntimeCandidateEvidence\?\.versionNumber/);
  assert.match(workflow,/const actualCurrent=sharedCurrent\[0\]\|\|null/);
  assert.match(workflow,/item\.robloxSharedTargetCurrent=false/);
  assert.match(workflow,/item\.robloxFastMvpSupersededBy=actualCurrent\?\.gameId\|\|null/);
  assert.match(workflow,/roblox-shared-runtime-target-capacity-republish-required/);
  assert.match(workflow,/if\(isSharedCandidate\(candidate\)&&item\.robloxSharedTargetCurrent===false\)return false/);
  assert.match(workflow,/ROBLOX_SHARED_TARGET_SUPERSEDED=/);
});


test('Roblox post-runtime QA runs independently without cancelling active validation',()=>{
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const postJobs=post.indexOf('\njobs:\n');
  const f9Jobs=f9.indexOf('\njobs:\n');
  assert.ok(postJobs>0&&f9Jobs>0);
  const postHeader=post.slice(0,postJobs);
  assert.match(postHeader,/group: roblox-runtime-foundation-\$\{\{ github\.run_id \}\}/);
  assert.match(postHeader,/cancel-in-progress: false/);
  assert.doesNotMatch(postHeader,/inputs\.game_id \|\| github\.sha/);
  assert.doesNotMatch(f9.slice(0,f9Jobs),/\nconcurrency:/);
});


test('F9 keeps only newest same-identity run and scan clears stale queued F9 work before deterministic review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox F9 · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/Cancel stale queued F9 runs before scan/);
  assert.match(workflow,/const states=new Set\(\['queued','pending','requested'\]\)/);
  assert.doesNotMatch(workflow.slice(workflow.indexOf('Cancel stale queued F9 runs before scan'),workflow.indexOf('Select newest same-identity F9 run')),/'in_progress'/);
  assert.match(workflow,/ROBLOX_STALE_F9_RUN_CANCELLED=/);
  assert.match(workflow,/ROBLOX_STALE_F9_RUN_CANCEL_COUNT=/);
  assert.match(workflow,/ROBLOX_F9_ACTIVE_WINNER=/);
  assert.match(workflow,/ROBLOX_F9_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_F9_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/final-review:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
});

test('post-runtime dedupe job uses the lightweight controller runner with stage-scoped ingress coalescing',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const start=workflow.indexOf('  dedupe:');
  const end=workflow.indexOf('\n  runtime-foundation-qa:',start);
  const block=workflow.slice(start,end);
  assert.match(block,/runs-on:\s*ubuntu-slim/);
  assert.match(block,/\n\s+concurrency:\n\s+group: roblox-runtime-foundation-dedupe-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\n\s+cancel-in-progress: true/);
  assert.match(block,/ROBLOX_RUNTIME_FOUNDATION_QA_ACTIVE_WINNER=/);
});

test('F9 dedupe job itself has no same-game concurrency lock',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const start=workflow.indexOf('\n  dedupe:\n');
  const end=workflow.indexOf('\n  final-review:\n',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(block,/concurrency:/);
  assert.match(block,/ROBLOX_F9_ACTIVE_WINNER=/);
});

test('F9 persistence accepts the exact locally validated F0 artifact and rejects changed identity',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const persist=workflow.slice(workflow.indexOf('      - name: Persist F9 internal release state'));
 assert.match(workflow,/candidateOrigin:localF0Candidate\?'LOCAL_F0':'PERSISTED_RUNTIME'/);
 assert.match(persist,/delta\.candidateOrigin==='LOCAL_F0'/);
 assert.match(persist,/item\.robloxBuildSourceRevision\|\|''\)===String\(delta\.sourceRevision/);
 assert.match(persist,/f0\.sourceRevision\|\|''\)===String\(delta\.sourceRevision/);
 assert.match(persist,/f0\.artifactIdentity\|\|''\)===String\(delta\.artifactIdentity/);
 assert.match(persist,/f0\.artifactRunId\|\|item\.robloxHeadlessFastMvpEvidence\?\.artifactRunId/);
 assert.match(persist,/candidate\.published!==true/);
 assert.match(persist,/localF0Identity\|\|persistedRuntimeIdentity/);
 assert.match(persist,/EXACT_CANDIDATE_IDENTITY/);
});

test('F9 optimistic persistence binds the tested local artifact and fails closed on source or artifact drift',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=workflow.indexOf('            const candidate=item.robloxRuntimeCandidateEvidence||{};',workflow.indexOf('      - name: Persist F9 internal release state'));
 const end=workflow.indexOf('            if(!identityExact){',start);
 assert.ok(start>0&&end>start);
 const predicate=new Function('item','delta',workflow.slice(start,end)+'return identityExact;');
 const source='a'.repeat(40);
 const artifact='sha256:verified';
 const item={
   robloxSourceCommit:source,
   robloxBuildArtifactIdentity:artifact,
   robloxRuntimeCandidateEvidence:{published:false,versionNumber:12},
   robloxFoundationF0Passed:true,
   robloxBuildPreflightPassed:true,
   robloxBuildOrPackagePassed:true,
   robloxBuildSourceRevision:source,
   robloxFoundationF0Evidence:{sourceRevision:source,artifactIdentity:artifact,artifactRunId:50},
 };
 const delta={candidateOrigin:'LOCAL_F0',sourceRevision:source,artifactIdentity:artifact,candidateVersionNumber:50};
 assert.equal(predicate(item,delta),true,'local F0 run identity is authoritative even with an older runtime candidate');
 assert.equal(predicate({...item,robloxSourceCommit:'b'.repeat(40)},delta),false);
 assert.equal(predicate({...item,robloxFoundationF0Evidence:{...item.robloxFoundationF0Evidence,artifactIdentity:'sha256:changed'}},delta),false);
 assert.equal(predicate({...item,robloxFoundationF0Evidence:{...item.robloxFoundationF0Evidence,artifactRunId:51}},delta),false);
 assert.equal(predicate({...item,robloxRuntimeCandidateEvidence:{published:true}},delta),false);
});

test('F9 scan dedupe cancels only older queued runs and preserves a newer main scan',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const dedupe=workflow.slice(workflow.indexOf('      - name: Cancel stale queued F9 runs before scan'),workflow.indexOf('      - name: Select newest same-identity F9 run'));
 assert.match(dedupe,/Number\(r\.id\)>=Number\(process\.env\.CURRENT_RUN_ID\|\|0\)/);
 assert.match(dedupe,/String\(r\.head_sha\|\|''\)===String\(process\.env\.CURRENT_SHA\|\|''\)/);
 assert.match(dedupe,/states\.has\(String\(r\.status\|\|''\)\.toLowerCase\(\)\)/);
 assert.match(workflow,/CURRENT_CONTROL_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/String\(r\.head_sha\|\|''\)===controlSha/);
 assert.match(workflow,/ROBLOX_F9_CONTROL_SHA=/);
});

test('F9 runtime critical path reuses current-main contract QA instead of replaying repository tests per game',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=workflow.indexOf('\n  final-review:');
 const end=workflow.indexOf('\n      - name: Promote only the exact tested runtime candidate',start);
 const block=workflow.slice(start,end);
 const vibe3=fs.readFileSync('.github/workflows/vibe3-engine-contract.yml','utf8');
 assert.ok(start>0&&end>start);
 assert.match(block,/Verify only F9 executable syntax/);
 assert.match(block,/node --input-type=module --check < tools\/company-tester-debug-intake\.mjs/);
 assert.match(block,/ROBLOX_F9_CONTRACT_QA=REUSED_CURRENT_MAIN_CI/);
 assert.match(block,/ROBLOX_F9_CRITICAL_PATH_DUPLICATE_TESTS=0/);
 assert.doesNotMatch(block,/node --test/);
 assert.match(vibe3,/qa\/company-development-roblox-runtime-foundation\.test\.mjs/);
 assert.match(vibe3,/qa\/company-development-roblox-headless-fast-mvp\.test\.mjs/);
 assert.match(vibe3,/qa\/company-development-roblox-release-promotion\.test\.mjs/);
 assert.match(vibe3,/qa\/company-tester-debug-intake\.test\.mjs/);
 assert.match(vibe3,/qa\/vibe3-roblox-platform\.test\.mjs/);
});


test('F9 Vibe fan-in shell parses so verified publication never strands the next evolution',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const step=workflow.slice(workflow.indexOf('      - name: Fan verified F9 runtime proof into waiting Vibe Roblox tasks'));
 const body=step.slice(step.indexOf('        run: |\n')+'        run: |\n'.length);
 const script=body.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
 const result=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('F9 fan-in reads a shallow Vibe queue and fetches each exact source revision once',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const fanin=workflow.slice(workflow.indexOf('      - name: Fan verified F9 runtime proof into waiting Vibe Roblox tasks'));
 assert.match(fanin,/--single-branch --depth 1 --filter=blob:none/);
 assert.match(fanin,/if ! git -C main cat-file -e "\$source_revision\^\{commit\}" 2>\/dev\/null; then/);
 assert.match(fanin,/git -C main fetch --no-tags --depth=1 origin "\$source_revision" --quiet/);
});

test('Roblox F0-F9 orchestration dispatches exact games without cross-game fan-in while preserving required serialization',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const release=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');

  assert.match(runtime,/ROBLOX_PRE_F9_VALIDATION_TARGET=PRIVATE_DEDICATED/);
  assert.match(runtime,/ROBLOX_CANONICAL_GAME_TARGET_MUTATED=NO/);
  assert.match(runtime,/ROBLOX_STUDIO_REQUIRED_FOR_DEVELOPMENT_CONTINUATION=NO/);
  assert.match(runtime,/publish_stage=validation/);

  const f9Dispatch=post.slice(
    post.indexOf('Dispatch exact F9 review for every runtime-accepted candidate'),
    post.indexOf('Dispatch exact Studio MCP follow-up after new runtime foundation evidence')
  );
  assert.match(f9Dispatch,/company-development-roblox-final-review-revalidation\.yml[\s\S]*?-f game_id="\$id"/);
  assert.match(f9Dispatch,/ROBLOX_F9_EXACT_DISPATCH=DEDUPED_CURRENT_MAIN:/);
  assert.doesNotMatch(f9Dispatch,/--ref main\s*$/m);

  const foundationPersist=post.slice(
    post.indexOf('Persist runtime tester and QA evidence'),
    post.indexOf('Dispatch exact F9 review for every runtime-accepted candidate')
  );
  assert.match(post,/ROBLOX_FOUNDATION_RUNTIME_PATCH_COUNT=/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_PERSIST_OPTIMISTIC_ATTEMPT=\$attempt\/5/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_PERSIST_SAME_FIELD_CONFLICT=/);
  assert.match(foundationPersist,/EXACT_SOURCE_REVISION/);
  assert.match(foundationPersist,/EXACT_ARTIFACT_IDENTITY/);
  assert.match(foundationPersist,/EXACT_CANDIDATE_VERSION/);
  assert.match(post,/beforeUpdatedAt:String\(before\.updatedAt\|\|''\)/);
  assert.match(foundationPersist,/SAME_GAME_ATOMIC_STATE/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_DOWNSTREAM_CONFLICT_FILTER_COUNT=/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_CONFLICT_REVALIDATION_DISPATCHED=\$id/);
  assert.match(foundationPersist,/company-development-roblox-post-runtime-qa\.yml[\s\S]*?-f game_id="\$id"/);
  assert.doesNotMatch(foundationPersist,/git rebase/);
  assert.doesNotMatch(foundationPersist,/DEFERRED_TO_NEXT_CYCLE/);

  const studio=post.slice(post.indexOf('  studio-mcp-auto-play:'),post.indexOf('\n  studio-mcp-evidence:',post.indexOf('  studio-mcp-auto-play:')));
  assert.match(studio,/group: roblox-studio-shared-host/);
  assert.match(studio,/max-parallel:\s*1/);

  const publishAt=f9.indexOf('Dispatch exact F9-verified artifact to canonical Roblox game target');
  const continueAt=f9.indexOf('Immediately continue each successfully persisted Roblox F9 game');
  const fanInAt=f9.indexOf('Fan verified F9 runtime proof into waiting Vibe Roblox tasks');
  assert.ok(publishAt>=0&&continueAt>publishAt&&fanInAt>continueAt);
  const continueBlock=f9.slice(continueAt,fanInAt);
  assert.match(continueBlock,/company-development-confirmed-runtime\.yml[\s\S]*?-f game_id="\$id"/);
  assert.match(continueBlock,/trigger_source=ROBLOX_F9_PER_GAME_CONTINUATION/);
  assert.match(continueBlock,/roblox-f9-persist-same-field-conflicts/);
  assert.match(continueBlock,/ROBLOX_F9_NEXT_CYCLE_DISPATCH=DEDUPED_CURRENT_MAIN:/);
  assert.match(continueBlock,/String\(run\.head_sha\|\|''\)===currentSha/);
  assert.match(continueBlock,/ROBLOX_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);

  const releaseHeader=release.slice(0,release.indexOf('\njobs:\n'));
  assert.match(releaseHeader,/group: roblox-publish-exact-\$\{\{ inputs\.game_id \|\| 'sync' \}\}-\$\{\{ inputs\.publish_stage \|\| 'validation' \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(releaseHeader,/cancel-in-progress: false/);
  assert.match(release,/retry_window_seconds=900/);
  assert.match(release,/ROBLOX_PUBLISH_SERVER_BUSY_ATTEMPT=/);
  assert.match(release,/company-development-roblox-final-review-revalidation\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID"/);
});



test('Open Cloud engine reuses the same Luau session to capture map and world evidence',async()=>{
  const calls=[];
  const responses=[
    {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
    {ok:true,status:200,body:{state:'COMPLETE'}},
    {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
      {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
      {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS=42'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SPAWNS=2'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_MARKER_SPAWNS=1'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SPAWN_GROUNDING_OBSERVED=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_UNSUPPORTED_SPAWNS=1'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_FLOATING_SPAWNS=1'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_MAX_SPAWN_GROUND_GAP=35.5'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SPAWNS_IN_BOUNDS=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_FINITE=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE=100.00,20.00,80.00'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_LANDMARKS=3'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_OBJECTIVES=1'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_TERRAIN_PRESENT=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_LIGHTING_ATMOSPHERE=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_STREAMING_ENABLED=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SCAN_CAPPED=false'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_OBJECT_IDS=3'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_DUPLICATE_IDS=1'},
      {message:'JAEWOON_OPEN_CLOUD_RESOURCE_PROMPTS=2'},
      {message:'JAEWOON_OPEN_CLOUD_RESOURCE_PROMPTS_ENABLED=0'}
    ]}]}}
  ];
  const fetchImpl=async(url,init={})=>{calls.push({url,init});const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
  const result=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
  assert.equal(calls.length,3,'no extra Open Cloud request is added for world evidence');
  assert.equal(result.worldEvidence.sameLuauExecutionSession,true);
  assert.equal(result.worldEvidence.basePartCount,42);
  assert.equal(result.worldEvidence.spawnCount,2);
  assert.equal(result.worldEvidence.markerSpawnCount,1);
  assert.equal(result.worldEvidence.spawnGroundingObserved,true);
  assert.equal(result.worldEvidence.unsupportedSpawns,1);
  assert.equal(result.worldEvidence.floatingSpawns,1);
  assert.equal(result.worldEvidence.maximumSpawnGroundGap,35.5);
  assert.equal(result.worldEvidence.spawnsInBounds,true);
  assert.deepEqual(result.worldEvidence.boundsSize,{x:100,y:20,z:80});
  assert.equal(result.worldEvidence.landmarkCount,3);
  assert.equal(result.worldEvidence.objectiveCount,1);
  assert.equal(result.worldEvidence.terrainPresent,true);
  assert.equal(result.worldEvidence.lightingAtmospherePresent,true);
  assert.equal(result.worldEvidence.streamingEnabled,true);
  assert.equal(result.worldEvidence.worldObjectBinding.observed,true);
  assert.equal(result.worldEvidence.worldObjectBinding.stableIdCount,3);
  assert.equal(result.worldEvidence.worldObjectBinding.duplicateStableIdCount,1);
  assert.equal(result.worldEvidence.worldObjectBinding.resourcePromptCount,2);
  assert.equal(result.worldEvidence.worldObjectBinding.enabledResourcePromptCount,0);
  assert.equal(result.worldEvidence.worldObjectBinding.gameplayInteractionVerified,false);
  const body=JSON.parse(calls[0].init.body);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE/);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_OBJECT_IDS/);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_DUPLICATE_IDS/);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_RESOURCE_PROMPTS_ENABLED/);
  assert.match(body.script,/item:GetAttribute\("WorldObjectId"\)/);
  assert.match(body.script,/pcall\(function\(\) RunService:Run\(\) end\)/);
  assert.match(body.script,/startupWaitDeadline=startupWaitStarted\+8/);
  assert.match(body.script,/while not runtimeWorldReady\(\) and os\.clock\(\)<startupWaitDeadline do task\.wait\(0\.25\) end/);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_RUNTIME_READY/);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_STARTUP_WAIT_SECONDS/);
  assert.match(body.script,/workspace:GetDescendants\(\)/);
  assert.match(body.script,/item:IsA\("SpawnLocation"\) or item:GetAttribute\("SpawnMarkerOnly"\)==true/);
  assert.match(body.script,/not isSpawn and item.CanCollide/);
  assert.match(body.script,/table.insert\(supportExclusions,player.Character\)/);
  assert.match(body.script,/spawnParams.ExcludeInstances=supportExclusions/);
  assert.match(body.script,/spawnParams.RespectCanCollide=true/);
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/openCloudWorldEvidence:engineProbe\?\.worldEvidence\|\|null/);
});



test('Open Cloud world interaction markers absent never become a fabricated gameplay pass',async()=>{
  const responses=[
    {path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'COMPLETE'},
    {luauExecutionSessionTaskLogs:[{messages:[
      'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2',
      'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'
    ]}]}
  ];
  const result=await probeRobloxOpenCloudEngine({
    universeId:'1',placeId:'2',versionNumber:20,apiKey:'test-key',
    fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify(responses.shift())})
  });
  assert.equal(result.worldEvidence.worldObjectBinding.observed,false);
  assert.equal(result.worldEvidence.worldObjectBinding.stableIdCount,0);
  assert.equal(result.worldEvidence.worldObjectBinding.gameplayInteractionVerified,false);
});

test('Open Cloud requested game is isolated while empty game_id keeps bounded cross-game parallel batch scanning',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const probeStart=workflow.indexOf("const candidates=(q.items||[]).filter(item=>{",workflow.indexOf('Probe exact Roblox Open Cloud engine execution'));
  const probeEnd=workflow.indexOf("fs.writeFileSync('/tmp/roblox-open-cloud-engine-probes.json'",probeStart);
  const probeBlock=workflow.slice(probeStart,probeEnd);
  const persistStart=workflow.indexOf("const candidates=(q.items||[]).filter(item=>{",workflow.indexOf('Read exact runtime sentinel and persist tester QA evidence'));
  const persistEnd=workflow.indexOf('const f9Ids=[];',persistStart);
  const persistBlock=workflow.slice(persistStart,persistEnd);
  assert.ok(probeStart>0&&probeEnd>probeStart);
  assert.ok(persistStart>0&&persistEnd>persistStart);
  assert.match(probeBlock,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(persistBlock,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(probeBlock,/retryOpenCloudOnly&&requested&&item\.gameId===requested/);
  assert.match(probeBlock,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_REQUESTED_SCOPE=.*EXACT_GAME_ONLY.*ALL_PENDING_PARALLEL_BATCH/);
  assert.match(workflow,/ROBLOX_FOUNDATION_REQUESTED_SCOPE=.*EXACT_GAME_ONLY.*ALL_PENDING_PARALLEL_BATCH/);
  assert.match(workflow,/if\(sharedRotationEnabled&&!requested\)\{/);
  assert.match(probeBlock,/ROBLOX_OPEN_CLOUD_429_SCOPE=PER_GAME_RETRY_ONLY/);
  assert.doesNotMatch(probeBlock,/ACTIVE_SERIAL|ACTIVE_MIN4_PARALLEL/);
});


test('Open Cloud server boot rejects an older place version even when server context executes',async()=>{
 const responses=[
  {path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'COMPLETE'},
  {luauExecutionSessionTaskLogs:[{messages:[
    'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2',
    'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=19',
    'JAEWOON_OPEN_CLOUD_ENGINE_SERVER_CONTEXT=true'
  ]}]}
 ];
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',
  fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify(responses.shift())})
 });
 assert.equal(result.engineExecuted,true);
 assert.equal(result.exactPlace,true);
 assert.equal(result.exactVersion,false);
 assert.equal(result.serverContextExecuted,true);
 assert.equal(result.serverBootObserved,false);
 assert.equal(result.serverBootEvidence.observed,false);
});

test('cloud place and version checks reject numeric prefix collisions',async()=>{
 const result=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,networkRetryAttempts:1,fetchImpl:async url=>new Response(JSON.stringify(url.includes('/logs?')?{luauExecutionSessionTaskLogs:[{messages:['JAEWOON_OPEN_CLOUD_ENGINE_PLACE=200','JAEWOON_OPEN_CLOUD_ENGINE_VERSION=200']}]}:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'COMPLETE'}))});
 assert.equal(result.exactPlace,false);
 assert.equal(result.exactVersion,false);
 assert.equal(result.worldEvidence.observed,false);
});


// 일반 Part 표식 누락이나 로그 일부 누락은 접지 관찰 성공이 아니다.
test('Open Cloud grounding rejects zero spawn and incomplete grounding observations',async()=>{
  for(const [count,counts] of [[0,true],[2,false]]){
    const messages=[
      'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2','JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20',
      'JAEWOON_OPEN_CLOUD_WORLD_SPAWN_GROUNDING_OBSERVED=true',
      `JAEWOON_OPEN_CLOUD_WORLD_SPAWNS=${count}`,
      ...(counts?['JAEWOON_OPEN_CLOUD_WORLD_UNSUPPORTED_SPAWNS=0','JAEWOON_OPEN_CLOUD_WORLD_FLOATING_SPAWNS=0']:[])
    ];
    const responses=[
      {path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'COMPLETE'},
      {luauExecutionSessionTaskLogs:[{messages}]}
    ];
    const result=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify(responses.shift())})});
    assert.equal(result.worldEvidence.spawnGroundingObserved,false);
  }
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/worldEvidence\?\.spawnGroundingObserved!==true/);
});

test('managed spawn executes destination grounding and rejects stale blocked or floating characters',{skip:!process.env.VIBE2_LUAU_BINARY},async()=>{
 const {foundationCharacterSource}=await import('../tools/company-development-roblox-bootstrap.mjs');
 const os=await import('node:os'),path=await import('node:path');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'foundation-execution-'));
 const harness=`
local clock=0
local os={clock=function() return clock end}
local mt={}
local function vec(x,y,z) return setmetatable({X=x,Y=y,Z=z},mt) end
mt.__add=function(a,b) return vec(a.X+b.X,a.Y+b.Y,a.Z+b.Z) end
mt.__sub=function(a,b) return vec(a.X-b.X,a.Y-b.Y,a.Z-b.Z) end
mt.__mul=function(a,b) return vec(a.X*b.X,a.Y*b.Y,a.Z*b.Z) end
mt.__index=function(a,k) if k=="Magnitude" then return math.sqrt(a.X*a.X+a.Y*a.Y+a.Z*a.Z) end end
local Vector3={new=vec,zero=vec(0,0,0)}
local CFrame={new=function(v) return v end}
local Enum={HumanoidRigType={R6=6,R15=15},Material={Air="Air"}}
local RaycastParams={new=function() return {} end}
local OverlapParams={new=function() return {} end}
local function object(kind)
 local o={Parent=true,Anchored=true,CanCollide=true,attrs={}}
 function o:IsA(k) return k==kind or k=="BasePart" and kind=="SpawnLocation" end
 function o:GetAttribute(k) return self.attrs[k] end
 function o:SetAttribute(k,v) self.attrs[k]=v end
 return o
end
local foundationSpawn=object("SpawnLocation");foundationSpawn.Position=vec(10,.55,20);foundationSpawn.Size=vec(8,1,8)
local floor=object("BasePart");floor.attrs.WalkableGround=true
local rootPart=object("BasePart");rootPart.Position=vec(90,400,90);rootPart.Size=vec(2,2,1);rootPart.CollisionGroup="Default";rootPart.AssemblyLinearVelocity=vec(0,0,0)
local humanoid={HipHeight=2,RigType=15,Health=100,FloorMaterial="Concrete",Running={Connect=function() return {Disconnect=function() end} end}}
local character=object("Model")
function character:WaitForChild(k) return k=="Humanoid" and humanoid or rootPart end
function character:FindFirstChild(k) if k=="Left Leg" then return {Size=vec(1,2,1)} end end
function character:GetPivot() return rootPart.Position end
function character:PivotTo(v) rootPart.Position=v;self.moves=(self.moves or 0)+1 end
local player={Character=character}
local Players={GetPlayerFromCharacter=function() return player end,GetPlayers=function() return {player} end}
local blocked=false;local badContact=false;local rays={}
local workspace={GetDescendants=function() return {floor,foundationSpawn} end,
 GetPartBoundsInBox=function() return blocked and {object("BasePart")} or {} end,
 Raycast=function(_,origin,delta,params)
  table.insert(rays,origin)
  assert(params.RespectCanCollide and params.ExcludeInstances and params.IncludeInstances[1]==floor)
  return {Position=vec(origin.X,badContact and #rays>1 and -4 or 0,origin.Z),Normal=vec(0,1,0),Instance=floor}
 end}
local task={wait=function(dt) clock+=dt end}
`;
 const body=foundationCharacterSource('bindFoundationCharacter','foundationSpawn');
 const checks=`
bindFoundationCharacter(character)
assert(character.attrs.GROUND_CONTACT==true and character.attrs.NativeFoundationGroundingVersion==3)
assert(rootPart.Position.X==10 and rootPart.Position.Z==20 and math.abs(rootPart.Position.Y-3.05)<.0001)
assert(rays[1].Y<3 and foundationSpawn.CanCollide==false)
assert(clock>=.2)
-- A stale character must not move after waiting for its parts.
local moves=character.moves;player.Character={};bindFoundationCharacter(character);assert(character.moves==moves)
player.Character=character;blocked=true;bindFoundationCharacter(character);assert(character.moves==moves and character.attrs.FoundationFailure=="SPAWN_CLEARANCE_BLOCKED")
blocked=false;badContact=true;rays={};bindFoundationCharacter(character)
assert(character.attrs.GROUND_CONTACT==false and character.attrs.FoundationFailure=="GROUND_CONTACT_FAILURE")
badContact=false;rays={};humanoid.RigType=6;humanoid.HipHeight=.5;bindFoundationCharacter(character)
assert(math.abs(rootPart.Position.Y-3.55)<.0001 and character.attrs.GROUND_CONTACT==true)
print("FOUNDATION_PHYSICS_LOGIC_ONLY")
`;
 try{
  const file=path.join(root,'check.luau');fs.writeFileSync(file,harness+body+'\n'+checks);
  const run=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
  assert.match(run.stdout,/FOUNDATION_PHYSICS_LOGIC_ONLY/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('survival anchored world ground contains the camp, resources and enemy spawn',()=>{
  const source=fs.readFileSync('roblox-games/survival/server/Game.server.luau','utf8');
  const ground=source.match(/ensureWorldPart\(world, "SurvivalGround", Vector3\.new\((\d+), (\d+), (\d+)\), Vector3\.new\(0, (-?[\d.]+), 0\)/);
  assert.ok(ground,'the existing Roblox world builder must create a collision ground');
  const halfWidth=Number(ground[1])/2;
  const halfLength=Number(ground[3])/2;
  const groundTop=Number(ground[4])+Number(ground[2])/2;
  assert.ok(halfWidth>=15 && halfLength>=26,'existing resource and enemy spawns must remain on the ground');
  assert.ok(groundTop>=0,'resource nodes must rest on a collision floor');
  assert.match(source,/local enemySpawn = ensureWorldPart\(world, "SurvivalEnemySpawn",.*Vector3\.new\(0, 0\.25, 24\)/);
  assert.match(source,/spawnHit\.Position\.Y \+ nativeFoundationSpawn\.Size\.Y \* 0\.5 \+ 0\.05/);
  assert.doesNotMatch(source,/spawnHit\.Position\.Y - nativeFoundationSpawn\.Size\.Y \* 0\.5/);
  assert.match(source,/params\.ExcludeInstances = \{character, nativeFoundationSpawn\}/);
});

test('bug-defense source contract exposes real two-player server authority without fake runtime PASS',()=>{
  const server=fs.readFileSync('roblox-games/bug-defense/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/bug-defense/client/Game.client.luau','utf8');
  const config=fs.readFileSync('roblox-games/bug-defense/shared/GameConfig.luau','utf8');
  const codeContract=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(codeContract.passed,true);
  assert.equal(codeContract.runtimeTwoClientExecutionRequired,false);
  assert.match(config,/MultiplayerRequired = true/);
  assert.match(config,/CoopRequired = true/);
  assert.match(config,/MinimumParticipants = 2/);
  assert.match(server,/remote:FireAllClients\("MULTIPLAYER_SYNC", multiplayerSnapshot/);
  assert.match(server,/damageEnemy\(teammate, target, \(12 \+ level \* 2\) \* multiplier\)/);
  assert.match(server,/verifiedSaveRead\[player\] ~= true/);
  assert.match(server,/BUG_DEFENSE_SAVE_WRITE_SKIPPED_UNVERIFIED_READ/);
  assert.match(client,/remote.OnClientEvent:Connect\(function\(eventName, snapshot\)/);
  assert.match(client,/remote:FireServer\("coop-assist"\)/);
});
