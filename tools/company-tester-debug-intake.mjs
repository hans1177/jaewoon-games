import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { enqueueRecovery, normalizeRecoveryQueue } from './company-recovery-queue.mjs';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function hash(parts){return crypto.createHash('sha256').update(parts.map(clean).join('|')).digest('hex').slice(0,20);}
function severity(sig=''){
  const s=upper(sig);
  if(/CRASH|START_FAILURE|SERVER_BOOT_FAILURE|WORLD_READY_FAILURE|SPAWN_FAILURE|CHARACTER_FOUNDATION_FAILURE|GROUND_CONTACT_FAILURE|SAVE_CORRUPTION|MULTIPLAYER_STATE_CORRUPTION|RELEASE_BLOCKING_PLATFORM_ERROR/.test(s))return'CRITICAL';
  if(/PROGRESSION_BLOCK|INPUT_UNUSABLE|MOVEMENT_FAILURE|CAMERA_FOUNDATION_FAILURE|RUNTIME_FOUNDATION|FOUNDATION_UNVERIFIED|FATAL_RUNTIME_BUG|REGRESSION|TARGET_PLATFORM_RUNTIME|INDEPENDENT_QA|F0_SOURCE|SOURCE_INTEGRITY|SOURCE_BIND|BUILD_PACKAGE|BUILD_PREFLIGHT|EXECUTOR_UNAVAILABLE|PERMISSION_DENIED|CREDENTIAL|SCOPE_MISSING/.test(s))return'HIGH';
  if(/UI|AUDIO|PRESENTATION|IMPLEMENTATION|MECHANIC|SYSTEM_COUNT|MUSIC_|MOBILE_|APPROVED_SCOPE_/.test(s))return'MEDIUM';
  return'LOW';
}
function category(sig=''){
  const s=upper(sig);
  if(/FOUNDATION|GROUND_CONTACT|WORLD_READY|SPAWN|CHARACTER/.test(s))return'FOUNDATION';
  if(/CRASH|START|LAUNCH/.test(s))return'STARTUP';
  if(/INPUT|TOUCH|CONTROL|JOYSTICK/.test(s))return'INPUT';
  if(/SAVE|LOAD/.test(s))return'SAVE';
  if(/MULTIPLAYER|SYNC|REMOTE/.test(s))return'MULTIPLAYER';
  if(/PERFORMANCE|FPS|FRAME|MEMORY/.test(s))return'PERFORMANCE';
  if(/AUDIO|MUSIC|SOUND/.test(s))return'AUDIO';
  if(/UI|UX|MOBILE|OVERFLOW|VIEWPORT/.test(s))return'UI_UX';
  if(/PRESENTATION|VFX|ANIMATION|GRAPHIC/.test(s))return'PRESENTATION';
  if(/REGRESSION/.test(s))return'REGRESSION';
  if(/PLATFORM|RUNTIME|STUDIO|APK|ANDROID|ROBLOX|UNITY/.test(s))return'PLATFORM';
  if(/PROGRESSION|WIN_|LOSS_|GAMEPLAY|MECHANIC|SYSTEM_COUNT|SCOPE_/.test(s))return'GAMEPLAY_IMPLEMENTATION';
  return'UNKNOWN';
}
function sourcePath(item={}){return clean(item.sourcePath||item.webSourcePath||item.targetSourcePath);}
function responsibleFiles(item={},surface='WEB'){
  const explicit=uniq(item.responsibleFiles);
  if(explicit.length)return explicit;
  const src=sourcePath(item);
  if(surface==='WEB'&&src)return[src.replace(/\/$/,'')+'/index.html'];
  return[];
}
function splitSignatures(raw=''){
  return uniq(clean(raw).split('|').map(x=>x.replace(/^vibe-web-implementation-required:[^:]+:/i,'').trim()).filter(Boolean)).slice(0,24);
}
function webTickets(item={},stamp=''){
  const gameId=clean(item.gameId),stage=clean(item.vibeWebRequestedStage||item.currentStep||'WEB_RUNTIME');
  const raw=clean(item.vibeWebImplementationReason)||(item.routingBlockers||[]).map(clean).join('|');
  const sigs=splitSignatures(raw);
  return sigs.map(sig=>({
    id:'bug-'+hash([gameId,'WEB',stage,sig]),gameId,surface:'WEB',phase:'DEVELOPMENT_IN_PROGRESS',
    severity:severity(sig),category:category(sig),signature:sig,reproduction:'RERUN_WEB_GAMEPLAY_VALIDATION_AND_TRIGGER_THE_SAME_REAL_PLAYER_PATH',
    responsibleFiles:responsibleFiles(item,'WEB'),evidence:uniq([...(item.routingBlockers||[]),`web-current-step:${stage}`,`web-last-attempt:${clean(item.webValidationLastAttemptAt)}`]),
    exactFailedStage:stage,route:'FOCUSED_REPAIR_AND_RECOVERY',status:'OPEN',createdAt:stamp,updatedAt:stamp
  }));
}
function platformTickets(item={},stamp=''){
  const out=[],gameId=clean(item.gameId),platform=upper(item.selectedPlatform||item.targetPlatform);
  const add=(stage,sig,evidence=[],options={})=>{
    if(!clean(stage)&&!clean(sig))return;
    const signature=clean(sig||stage); if(!signature)return;
    out.push({id:'bug-'+hash([gameId,platform,stage,signature]),gameId,surface:platform||'PLATFORM',phase:'NATIVE_RUNTIME_OR_REGRESSION',
      severity:severity(signature),category:category(signature),signature,
      reproduction:clean(options.reproduction)||'RERUN_EXACT_IMMUTABLE_ARTIFACT_STAGE_AND_CAPTURE_RUNTIME_EVIDENCE',
      responsibleFiles:Array.isArray(options.responsibleFiles)?uniq(options.responsibleFiles):(options.responsibleFiles===false?[]:responsibleFiles(item,platform)),evidence:uniq(evidence),exactFailedStage:clean(stage||'TARGET_PLATFORM_RUNTIME'),
      route:clean(options.route)||'FOCUSED_REPAIR_AND_RECOVERY',
      repairEligible:options.repairEligible!==false,
      internalFlowBlocking:options.internalFlowBlocking!==false,
      externalReleaseBlockingOnly:options.externalReleaseBlockingOnly===true,
      status:'OPEN',createdAt:stamp,updatedAt:stamp});
  };
  const ex=item.executionEvidence||{};
  if(ex.failureStage)add(ex.failureStage,ex.failureSignature||ex.failureStage,[JSON.stringify(ex)],{
    internalFlowBlocking:clean(ex.failureStage)!=='PUBLIC_RELEASE_RUNTIME_FINDING',
    externalReleaseBlockingOnly:clean(ex.failureStage)==='PUBLIC_RELEASE_RUNTIME_FINDING'
  });
  if(platform==='ROBLOX'){
    const rr=item.robloxRuntimeEvidence||{};
    const foundation=item.robloxRuntimeFoundationEvidence||{};
    const candidate=item.robloxRuntimeCandidateEvidence||{};
    const failureStage=upper(item.robloxFailureStage);
    const failureSignature=clean(item.robloxFailureSignature);
    const publicRuntimeFailureSignature=clean(item.robloxPublicReleaseFailureSignature);
    if(item.robloxRuntimeFailureExternalReleaseOnly===true&&publicRuntimeFailureSignature){
      add('PUBLIC_RELEASE_RUNTIME_FINDING',publicRuntimeFailureSignature,[
        JSON.stringify(foundation),
        JSON.stringify(candidate),
        ...(item.robloxPublicReleaseBlockers||[])
      ],{
        reproduction:'REPAIR_THE_RECORDED_EXACT_RUNTIME_FINDING_AND_RERUN_CANONICAL_ROBLOX_RUNTIME_QA_WITHOUT_PAUSING_INTERNAL_DEVELOPMENT',
        route:'FOCUSED_REPAIR_AND_RECOVERY',
        repairEligible:true,
        internalFlowBlocking:false,
        externalReleaseBlockingOnly:true
      });
    }
    const preRuntimeRepairStages=new Set(['TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_BUILD_OR_PACKAGE','VIBE_SHARED_MODEL_BUILD_PREFLIGHT','F0_SOURCE_INTEGRITY']);
    const preRuntimePending=/PENDING|AWAITING|UNVERIFIED/.test(upper(failureSignature));
    if(failureSignature&&!preRuntimePending&&preRuntimeRepairStages.has(failureStage)){
      add(failureStage,failureSignature,[
        ...(item.routingBlockers||[]),
        JSON.stringify({
          sourceRevision:item.robloxSourceCommit||null,
          buildSourceRevision:item.robloxBuildSourceRevision||null,
          artifactIdentity:item.robloxBuildArtifactIdentity||null,
          buildPreflightPassed:item.robloxBuildPreflightPassed===true,
          foundationF0Passed:item.robloxFoundationF0Passed===true
        })
      ],{
        reproduction:'RERUN_EXACT_ROBLOX_SOURCE_BUILD_PREFLIGHT_STAGE_AND_CAPTURE_COMPILER_PACKAGE_OR_F0_EVIDENCE'
      });
    }
    if(candidate.published===true&&item.robloxRuntimeFoundationPassed!==true){
      if(failureSignature==='ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED'){
        add('TARGET_PLATFORM_RUNTIME_FOUNDATION',failureSignature,[
          JSON.stringify(candidate),
          JSON.stringify(foundation),
          `required-scope:${clean(foundation.requiredScope)||'UNKNOWN'}`,
          `http-status:${Math.max(0,Number(foundation.httpStatus||0))}`
        ],{
          reproduction:'GRANT_REQUIRED_ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_SCOPE_TO_THE_EXISTING_API_KEY_AND_RERUN_FOUNDATION_QA',
          responsibleFiles:false,
          route:'EXTERNAL_CREDENTIAL_REPAIR_REQUIRED',
          repairEligible:false
        });
      }else if(failureSignature==='ROBLOX_RUNTIME_FOUNDATION_AWAITING_REAL_SERVER_BOOT'){
        add('TARGET_PLATFORM_RUNTIME_FOUNDATION',failureSignature,[
          JSON.stringify(candidate),
          JSON.stringify(foundation),
          `runtime-observation-attempts:${Math.max(0,Number(item.robloxRuntimeRetryCount||0))}`
        ],{
          reproduction:'OBSERVE_THE_EXACT_PRIVATE_CANDIDATE_AFTER_A_REAL_ROBLOX_GAME_SERVER_BOOT_AND_RERUN_FOUNDATION_QA',
          responsibleFiles:false,
          route:'REAL_SERVER_RUNTIME_OBSERVATION_REQUIRED',
          repairEligible:false
        });
      }else if(failureSignature==='ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE'){
        add('TARGET_PLATFORM_RUNTIME_FOUNDATION',failureSignature,[
          JSON.stringify(candidate),
          `runtime-observation-attempts:${Math.max(0,Number(item.robloxRuntimeRetryCount||0))}`
        ],{
          reproduction:'RESTORE_MACHINE_DRIVEN_ACTUAL_ROBLOX_RUNTIME_OBSERVATION_FOR_THE_EXACT_PRIVATE_CANDIDATE_AND_RERUN_FOUNDATION_QA',
          responsibleFiles:[
            '.github/workflows/company-development-roblox-post-runtime-qa.yml',
            'tools/company-development-roblox-runtime-foundation.mjs'
          ],
          route:'SYSTEM_AI_RUNTIME_EXECUTOR_RECOVERY'
        });
      }else if(foundation.state==='BLOCKED'||clean(item.robloxFailureSignature).match(/FOUNDATION_FAILURE|GROUND_CONTACT_FAILURE|MOVEMENT_FAILURE|SERVER_BOOT_FAILURE|WORLD_READY_FAILURE|SPAWN_FAILURE|CHARACTER_FOUNDATION_FAILURE/)){
        add('TARGET_PLATFORM_RUNTIME_FOUNDATION',foundation.failureSignature||item.robloxFailureSignature||'ROBLOX_RUNTIME_FOUNDATION_FAILED',[JSON.stringify(foundation),JSON.stringify(candidate)]);
      }else{
        add('TARGET_PLATFORM_RUNTIME_FOUNDATION','ROBLOX_RUNTIME_FOUNDATION_UNVERIFIED',[JSON.stringify(candidate)],{
          reproduction:'RUN_EXISTING_GAME_TESTER_F0_TO_F4_FOUNDATION_SCENARIO_ON_EXACT_PRIVATE_RUNTIME_CANDIDATE',
          responsibleFiles:false,
          route:'GAME_TESTER_FOUNDATION_EXECUTION',
          repairEligible:false
        });
      }
    }
    const runtimePending=/PENDING|AWAITING|UNVERIFIED/.test(upper(item.robloxFailureSignature));
    if(rr.failure||(
      item.robloxRuntimePassed===false
      &&item.robloxRuntimeFoundationPassed===true
      &&runtimePending===false
    ))add('TARGET_PLATFORM_RUNTIME',rr.failure||item.robloxFailureSignature||'ROBLOX_RUNTIME_FAILED',[JSON.stringify(rr)]);
    if(item.robloxRegressionPassed===false&&item.robloxRuntimePassed===true)add('REGRESSION','ROBLOX_REGRESSION_FAILED',[JSON.stringify(item.robloxPostRuntimeQaEvidence||{})]);
  }
  if(platform==='UNITY'){
    if(ex.runtimePassed===false)add('TARGET_PLATFORM_RUNTIME',ex.failureSignature||'UNITY_RUNTIME_FAILED',[JSON.stringify(ex)]);
    if(ex.regressionPassed===false&&ex.independentQaPassed===true)add('REGRESSION',ex.failureSignature||'UNITY_REGRESSION_FAILED',[JSON.stringify(ex)]);
  }
  return out;
}
function mergeTickets(existing={},incoming=[]){
  const rows=[...(existing.tickets||[])],by=new Map(rows.map(x=>[x.id,x]));
  for(const t of incoming){
    const prev=by.get(t.id);
    if(prev){
      Object.assign(prev,{...t,createdAt:prev.createdAt||t.createdAt,status:['FIXED','VERIFIED'].includes(upper(prev.status))?prev.status:'OPEN',
        occurrenceCount:Number(prev.occurrenceCount||1)+1,evidence:uniq([...(prev.evidence||[]),...(t.evidence||[])])});
    }else{
      const row={...t,occurrenceCount:1};rows.push(row);by.set(row.id,row);
    }
  }
  return{version:1,kind:'tester-debug-tickets',policy:'UNIFIED_WEB_NATIVE_POST_RELEASE_TESTER_DEBUG_INTAKE',updatedAt:new Date().toISOString(),tickets:rows};
}
export function ingestTesterDebug({developmentQueue={},ticketQueue={},recoveryQueue={}}={}){
  const stamp=new Date().toISOString(),incoming=[];
  for(const item of developmentQueue.items||[]){
    if(clean(item.status).toUpperCase()==='REMOVED')continue;
    if(item.vibeWebImplementationRequired===true||upper(item.canonicalState)==='WEB_VIBE_REPAIR_REQUIRED')incoming.push(...webTickets(item,stamp));
    incoming.push(...platformTickets(item,stamp));
  }
  const tickets=mergeTickets(ticketQueue,incoming);
  let recovery=normalizeRecoveryQueue(recoveryQueue),added=[];
  for(const t of tickets.tickets){
    if(t.status!=='OPEN'||!['CRITICAL','HIGH','MEDIUM'].includes(t.severity)||t.repairEligible===false)continue;
    const rec=enqueueRecovery(recovery,{
      id:'recovery-ticket-'+t.id,priority:['CRITICAL','HIGH'].includes(t.severity)?'critical':'high',
      sourceQueue:'tester-debug',sourceTaskId:t.id,gameId:t.gameId,responsibleFiles:t.responsibleFiles,
      failureStage:t.exactFailedStage,failureSignature:t.signature,blastRadius:'single-ticket',
      recurrenceCount:Math.max(1,Number(t.occurrenceCount||1)),
      evidence:uniq([...(t.evidence||[]),`tester-debug-ticket:${t.id}`,`tester-debug-category:${t.category}`,`tester-debug-severity:${t.severity}`,`tester-debug-occurrence-count:${Math.max(1,Number(t.occurrenceCount||1))}`]),
      recoveryStrategy:'REPAIR_REPRODUCIBLE_TESTER_BUG_AND_RERUN_EXACT_FAILED_STAGE',
      verificationPlan:['RERUN_EXACT_FAILED_STAGE','INDEPENDENT_QA_WHEN_APPLICABLE','REGRESSION_WHEN_APPLICABLE','CONFIRM_FAILURE_SIGNATURE_NOT_RECURRING'],
      recoveryOwner:t.responsibleFiles.length?'SYSTEM_AI':'VIBE2_VIBE3'
    },{reactivateDispatched:Number(t.occurrenceCount||0)>1});
    recovery=rec.queue;if(rec.added||rec.reactivated)added.push(rec.id);
  }
  return{tickets,recovery,ingested:incoming.length,recoveryTouched:added};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args(),dev=readJson(a['development-queue'],{items:[]}),tickets=readJson(a.tickets,{tickets:[]}),recovery=readJson(a.recovery,{tasks:[]});
  const result=ingestTesterDebug({developmentQueue:dev,ticketQueue:tickets,recoveryQueue:recovery});
  writeJson(a.tickets,result.tickets);writeJson(a.recovery,result.recovery);
  if(a.output)writeJson(a.output,{version:1,ingested:result.ingested,recoveryTouched:result.recoveryTouched,updatedAt:new Date().toISOString()});
  console.log('TESTER_DEBUG_INGESTED='+result.ingested);
  console.log('TESTER_DEBUG_RECOVERY_TOUCHED='+result.recoveryTouched.length);
}
