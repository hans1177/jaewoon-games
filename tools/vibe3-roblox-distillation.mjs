// 파일명: tools/vibe3-roblox-distillation.mjs
// 역할: 내부 Roblox의 검증된 source+runtime 패턴과 외부 Roblox의 black-box 관찰 원리를 기존 학습 fabric용 ledger로 정규화한다.
// 규칙: 외부 코드/바이너리/에셋 추출·저장 금지, 내부도 raw code 저장 금지, 전이 시 fresh QA 필수.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeId=value=>clean(value).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';
const sha=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex');
const isCommit=value=>/^[0-9a-f]{40}$/i.test(clean(value));
const isArtifact=value=>/^sha256:[0-9a-f]{64}$/i.test(clean(value));

const PRINCIPLES=Object.freeze({
  SERVER_AUTHORITATIVE_REMOTE_BOUNDARY:'Keep gameplay authority on the server and validate client remote requests before state mutation.',
  SAVE_DATASTORE_REJOIN:'Persist durable progression through a versioned server-owned save path and verify rejoin compatibility.',
  MOBILE_NATIVE_INPUT:'Bind mobile/touch input to the same real gameplay actions used by the authoritative game state.',
  MULTIPLAYER_SHARED_STATE:'Replicate shared session state from one server-owned source of truth instead of per-client simulation.',
  COMBAT_SERVER_AUTHORITY:'Resolve damage, cooldowns and combat outcomes on the server while clients present feedback.',
  AI_NAVIGATION_RESPONSIBILITY:'Keep navigation and target-selection responsibility explicit so AI repair does not leak into unrelated systems.',
  RIG_ANIMATION_BINDING:'Bind authored rig animation to gameplay state transitions and impact timing rather than decorative playback only.',
  VFX_GAMEPLAY_BINDING:'Drive bounded VFX from real gameplay events while preserving readability and mobile performance.',
  MESH_ASSET_BINDING:'Use explicit Roblox-native asset bindings for primary presentation instead of treating primitive placeholders as final art.'
});

export function extractRobloxSourcePatterns({serverSource='',clientSource='',sharedSource=''}={}){
  const server=String(serverSource||''),client=String(clientSource||''),shared=String(sharedSource||''),all=[server,client,shared].join('\n');
  const patterns=[];
  if(/RemoteEvent/.test(all)&&/OnServerEvent/.test(server))patterns.push('SERVER_AUTHORITATIVE_REMOTE_BOUNDARY');
  if(/DataStoreService/.test(server)&&/GetAsync/.test(server)&&/(?:SetAsync|UpdateAsync)/.test(server))patterns.push('SAVE_DATASTORE_REJOIN');
  if(/(?:UserInputService|ContextActionService|\.Activated\b)/.test(client))patterns.push('MOBILE_NATIVE_INPUT');
  if(/Players/.test(server)&&/(?:FireAllClients|FireClient|OnServerEvent)/.test(server))patterns.push('MULTIPLAYER_SHARED_STATE');
  if(/(?:TakeDamage|damage|Damage)/.test(server)&&/OnServerEvent/.test(server))patterns.push('COMBAT_SERVER_AUTHORITY');
  if(/(?:PathfindingService|MoveTo\s*\(|Humanoid:MoveTo)/.test(server))patterns.push('AI_NAVIGATION_RESPONSIBILITY');
  if(/(?:Animator|LoadAnimation|AnimationTrack|AnimationId)/.test(all))patterns.push('RIG_ANIMATION_BINDING');
  if(/(?:ParticleEmitter|Trail|Beam|TweenService)/.test(all))patterns.push('VFX_GAMEPLAY_BINDING');
  if(/(?:MeshPart|SpecialMesh|SurfaceAppearance|AnimationId)/.test(all))patterns.push('MESH_ASSET_BINDING');
  return Object.freeze(unique(patterns));
}

export function buildInternalRobloxDistillation({
  gameId='',sourceRevision='',artifactIdentity='',artifactRunId=0,
  runtimeEvidence={},postRuntimeQaEvidence={},multiplayerQaEvidence={},publicationTarget={},source={}
}={}){
  const id=clean(gameId),revision=clean(sourceRevision),artifact=clean(artifactIdentity);
  if(!id)throw new Error('ROBLOX_INTERNAL_GAME_ID_REQUIRED');
  if(!isCommit(revision))throw new Error('ROBLOX_INTERNAL_EXACT_REVISION_REQUIRED');
  if(!isArtifact(artifact))throw new Error('ROBLOX_INTERNAL_ARTIFACT_REQUIRED');
  if(runtimeEvidence?.runtimePassed!==true)throw new Error('ROBLOX_INTERNAL_RUNTIME_PASS_REQUIRED');
  if(postRuntimeQaEvidence?.exactRevision!==true)throw new Error('ROBLOX_INTERNAL_EXACT_RUNTIME_REVISION_REQUIRED');
  if(postRuntimeQaEvidence?.regressionPassed!==true)throw new Error('ROBLOX_INTERNAL_REGRESSION_PASS_REQUIRED');
  if(multiplayerQaEvidence&&Object.keys(multiplayerQaEvidence).length&&multiplayerQaEvidence.multiplayerQaPassed!==true)throw new Error('ROBLOX_INTERNAL_MULTIPLAYER_QA_REQUIRED_WHEN_EVIDENCE_PRESENT');
  const patterns=extractRobloxSourcePatterns(source);
  if(!patterns.length)throw new Error('ROBLOX_INTERNAL_DISTILLABLE_PATTERN_MISSING');
  const principles=patterns.map(pattern=>PRINCIPLES[pattern]).filter(Boolean);
  return Object.freeze({
    version:1,
    id:`roblox-internal-${safeId(id)}-${revision.slice(0,12)}`,
    sourceKind:'internal-roblox-source-runtime',
    authority:'VERIFIED_INTERNAL_ROBLOX_DISTILLATION',
    practiceOnly:false,
    runtimePromotionAllowed:false,
    gameId:id,
    engine:'roblox',
    sourceRevision:revision,
    artifactIdentity:artifact,
    artifactRunId:Number(artifactRunId)||null,
    observationKind:'SOURCE_PLUS_RUNTIME_VERIFIED',
    patterns:Object.freeze(patterns),
    principles:Object.freeze(principles),
    evidence:Object.freeze(unique([
      `source-revision:${revision}`,
      `artifact:${artifact}`,
      'runtime:PASS','exact-revision:PASS','regression:PASS',
      multiplayerQaEvidence&&Object.keys(multiplayerQaEvidence).length?'multiplayer-qa:PASS':''
    ])),
    publicationTarget:Object.freeze({
      universeId:clean(publicationTarget?.universeId)||null,
      placeId:clean(publicationTarget?.placeId)||null
    }),
    verified:true,
    retrievalEligible:true,
    advisoryOnly:false,
    freshTransferQaRequired:true,
    rawCodeStored:false,
    rawAssetStored:false,
    rawBinaryStored:false,
    hiddenReasoningStored:false,
    directSourceWriteAuthority:false,
    automaticCapabilityPromotion:false
  });
}

export function normalizeExternalRobloxBlackBoxObservation(record={}){
  const provenance=record?.provenance||{},qa=record?.qa||{};
  if(record.sourceKind!=='external-roblox-runtime-reference')throw new Error('ROBLOX_EXTERNAL_SOURCE_KIND_INVALID');
  if(record.authority!=='PRACTICE_ONLY'||record.practiceOnly!==true||record.runtimePromotionAllowed!==false)throw new Error('ROBLOX_EXTERNAL_AUTHORITY_INVALID');
  if(upper(provenance.observationKind)!=='BLACK_BOX_RUNTIME_ONLY')throw new Error('ROBLOX_EXTERNAL_BLACK_BOX_ONLY_REQUIRED');
  if(provenance.codeExtracted!==false||provenance.binaryRedistributed!==false||provenance.assetExtracted!==false)throw new Error('ROBLOX_EXTERNAL_EXTRACTION_BOUNDARY_INVALID');
  if(upper(qa.runtime)!=='PASS'||upper(qa.teacherReview)!=='PASS')throw new Error('ROBLOX_EXTERNAL_RUNTIME_REVIEW_REQUIRED');
  if(record.rawCode||record.rawAsset||record.binaryPayload)throw new Error('ROBLOX_EXTERNAL_RAW_PAYLOAD_FORBIDDEN');
  const project=clean(record.project||record.gameId);
  const sourceRevision=clean(record.sourceRevision);
  const observations=unique(Array.isArray(record.observations)?record.observations:Object.entries(record.observations||{}).filter(([,v])=>Boolean(v)).map(([k,v])=>`${k}:${String(v)}`)).slice(0,32);
  const principles=unique(record.principles||record.reusablePrinciples||[]).slice(0,24);
  const patterns=unique(record.patterns||record.tags||[]).slice(0,24);
  if(!project||!sourceRevision)throw new Error('ROBLOX_EXTERNAL_IDENTITY_REQUIRED');
  if(!observations.length||!principles.length)throw new Error('ROBLOX_EXTERNAL_DISTILLED_CONTENT_REQUIRED');
  return Object.freeze({
    version:1,
    id:clean(record.id)||`roblox-external-${safeId(project)}-${sha(sourceRevision+'|'+principles.join('|')).slice(0,12)}`,
    sourceKind:'external-roblox-runtime-reference',
    authority:'PRACTICE_ONLY',
    practiceOnly:true,
    runtimePromotionAllowed:false,
    gameId:project,
    engine:'roblox',
    sourceRevision,
    observationKind:'BLACK_BOX_RUNTIME_ONLY',
    observations:Object.freeze(observations),
    patterns:Object.freeze(patterns),
    principles:Object.freeze(principles),
    evidence:Object.freeze(unique(['runtime:PASS','teacher-review:PASS',...(record.evidence||[])]).slice(0,24)),
    verified:false,
    retrievalEligible:true,
    advisoryOnly:true,
    freshTransferQaRequired:true,
    codeExtracted:false,
    assetExtracted:false,
    binaryRedistributed:false,
    rawCodeStored:false,
    rawAssetStored:false,
    rawBinaryStored:false,
    hiddenReasoningStored:false,
    directSourceWriteAuthority:false,
    automaticCapabilityPromotion:false
  });
}

export function normalizeRobloxDistillationRecord(record={}){
  if(record?.sourceKind==='internal-roblox-source-runtime'){
    if(record.authority!=='VERIFIED_INTERNAL_ROBLOX_DISTILLATION'||record.verified!==true||record.retrievalEligible!==true)throw new Error('ROBLOX_INTERNAL_NORMALIZED_AUTHORITY_INVALID');
    if(!isCommit(record.sourceRevision)||!isArtifact(record.artifactIdentity))throw new Error('ROBLOX_INTERNAL_NORMALIZED_IDENTITY_INVALID');
    if(record.rawCodeStored!==false||record.rawAssetStored!==false||record.rawBinaryStored!==false)throw new Error('ROBLOX_INTERNAL_RAW_STORAGE_FORBIDDEN');
    return Object.freeze({...record,patterns:Object.freeze(unique(record.patterns||[])),principles:Object.freeze(unique(record.principles||[])),evidence:Object.freeze(unique(record.evidence||[]))});
  }
  return normalizeExternalRobloxBlackBoxObservation(record);
}

export function mergeRobloxDistillationLedger(ledgerInput={},records=[]){
  const map=new Map();
  for(const raw of Array.isArray(ledgerInput?.records)?ledgerInput.records:[]){
    try{const row=normalizeRobloxDistillationRecord(raw);map.set(row.id,row);}catch{}
  }
  let added=0,replaced=0,rejected=0;
  for(const raw of records||[]){
    try{
      const row=normalizeRobloxDistillationRecord(raw);
      if(map.has(row.id))replaced+=1;else added+=1;
      map.set(row.id,row);
    }catch{rejected+=1;}
  }
  const rows=[...map.values()].sort((a,b)=>clean(a.id).localeCompare(clean(b.id)));
  return Object.freeze({
    version:1,
    kind:'vibe3-roblox-distillation-ledger',
    policy:Object.freeze({
      unifiedLearningFabricOnly:true,
      externalBlackBoxOnly:true,
      externalCodeAssetExtractionForbidden:true,
      internalExactRevisionRuntimeEvidenceRequired:true,
      rawCodeOrAssetStorageForbidden:true,
      freshQaRequiredOnTransfer:true,
      automaticCapabilityPromotion:false
    }),
    records:Object.freeze(rows),
    stats:Object.freeze({added,replaced,rejected,total:rows.length,internal:rows.filter(x=>x.sourceKind==='internal-roblox-source-runtime').length,external:rows.filter(x=>x.sourceKind==='external-roblox-runtime-reference').length})
  });
}

function gitShow(repoRoot,revision,relative){
  return execFileSync('git',['-C',repoRoot,'show',`${revision}:${relative}`],{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:8*1024*1024});
}

export function distillKnownGoodRobloxRecords({knownGood={},repoRoot='.',sourceLoader=gitShow}={}){
  const records=[],skipped=[];
  for(const row of Array.isArray(knownGood?.records)?knownGood.records:[]){
    const gameId=clean(row?.gameId),revision=clean(row?.sourceRevision),root=`roblox-games/${gameId}`;
    try{
      const source={
        sharedSource:sourceLoader(repoRoot,revision,`${root}/shared/GameConfig.luau`),
        serverSource:sourceLoader(repoRoot,revision,`${root}/server/Game.server.luau`),
        clientSource:sourceLoader(repoRoot,revision,`${root}/client/Game.client.luau`)
      };
      records.push(buildInternalRobloxDistillation({
        gameId,sourceRevision:revision,artifactIdentity:row.artifactIdentity,artifactRunId:row.artifactRunId,
        runtimeEvidence:row.runtimeEvidence||{},postRuntimeQaEvidence:row.postRuntimeQaEvidence||{},
        multiplayerQaEvidence:row.multiplayerQaEvidence||{},publicationTarget:row.publicationTarget||{},source
      }));
    }catch(error){skipped.push({gameId:gameId||'unknown',sourceRevision:revision||null,reason:String(error?.message||error)});}
  }
  return Object.freeze({records:Object.freeze(records),skipped:Object.freeze(skipped)});
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const raw=argv[i];if(!raw.startsWith('--'))continue;
    const body=raw.slice(2),at=body.indexOf('=');
    if(at>=0)out[body.slice(0,at)]=body.slice(at+1);else out[body]=argv[++i]??true;
  }
  return out;
}
function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

function main(){
  const args=parseArgs(process.argv.slice(2)),root=clean(args.root)||process.cwd();
  const existing=readJson(clean(args.existing),{version:1,records:[]});
  const incoming=[];
  let knownGoodSkipped=[];
  if(clean(args['known-good'])){
    const distilled=distillKnownGoodRobloxRecords({knownGood:readJson(clean(args['known-good']),{}),repoRoot:root});
    incoming.push(...distilled.records);knownGoodSkipped=distilled.skipped;
  }
  if(clean(args['external-dir'])&&fs.existsSync(clean(args['external-dir']))){
    for(const name of fs.readdirSync(clean(args['external-dir'])).filter(x=>/^roblox-black-box-.*\.json$/i.test(x)).sort()){
      incoming.push(readJson(path.join(clean(args['external-dir']),name),{}));
    }
  }
  const ledger=mergeRobloxDistillationLedger(existing,incoming);
  if(!clean(args.output))throw new Error('usage: --output <ledger.json> [--existing <ledger>] [--known-good <json>] [--external-dir <dir>] [--root <repo>]');
  writeJson(clean(args.output),ledger);
  console.log(`VIBE3_ROBLOX_DISTILLATION_TOTAL=${ledger.stats.total}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_INTERNAL=${ledger.stats.internal}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_EXTERNAL=${ledger.stats.external}`);
  console.log(`VIBE3_ROBLOX_DISTILLATION_KNOWN_GOOD_SKIPPED=${knownGoodSkipped.length}`);
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
