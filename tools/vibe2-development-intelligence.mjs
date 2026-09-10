// 파일명: tools/vibe2-development-intelligence.mjs
// 역할: Vibe2 개발 작업의 실패 지문, 적응형 컨텍스트, 정책, 체크포인트, 영향도와 Android 설치 증거를 결정론적으로 정리한다.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const VIBE2_DEVELOPMENT_INTELLIGENCE_VERSION = 2;
export const DEFAULT_CONTEXT_LIMITS = Object.freeze({ maxFiles:8, maxBytes:48_000, maxFileBytes:24_000 });

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const posix=value=>String(value??'').replaceAll('\\','/').replace(/^\.\//,'');
const uniq=values=>[...new Set((values||[]).map(posix).filter(Boolean))];
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const safeArray=value=>Array.isArray(value)?value:[];

function truncateUtf8(text,maxBytes){
  const source=Buffer.from(String(text??''),'utf8');
  if(source.length<=maxBytes)return source.toString('utf8');
  let end=Math.max(0,Math.min(source.length,maxBytes));
  while(end>0&&(source[end]&0b11000000)===0b10000000)end--;
  return source.subarray(0,end).toString('utf8');
}

export function failureFingerprint(input={}){
  const payload={
    type:clean(input.type||input.code).toUpperCase(),
    message:clean(input.message||input.symptom).toLowerCase().slice(0,1200),
    stack:clean(input.stack).replace(/0x[0-9a-f]+/gi,'0x*').slice(0,1800),
    test:clean(input.test||input.testName).toLowerCase().slice(0,300),
    platform:clean(input.platform).toLowerCase().slice(0,200),
    file:posix(input.file||input.path).toLowerCase().slice(0,500),
  };
  const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0,24);
  return Object.freeze({version:1,id:`vibe2-failure-${digest}`,digest,payload});
}

function rolePathBoost(role,file){
  const rel=posix(file).toLowerCase();
  if(role==='graphics'&&/(?:\.css$|\.svg$|ui|hud|render|visual|sprite|animation|animator|effect|vfx|shader|material)/.test(rel))return 22;
  if(role==='qa'&&/(?:^|\/)(?:qa|test|tests|spec)(?:\/|\.|-|_)/.test(rel))return 20;
  if(role==='balance'&&/(?:balance|economy|enemy|wave|reward|loot|difficulty|stat)/.test(rel))return 18;
  if(role==='development'&&/(?:main|game|runtime|core|player|world|controller|bootstrap)/.test(rel))return 14;
  return 0;
}

export function rankAdaptiveContextCandidates({files=[],diagnostic=null,responsibilityFiles=[],recentChangedFiles=[],role='development'}={}){
  const responsibilities=new Set(uniq(responsibilityFiles));
  const related=new Set(uniq(diagnostic?.relatedFiles));
  const recent=new Set(uniq(recentChangedFiles));
  const diagnosticFile=posix(diagnostic?.file||diagnostic?.path||'');
  const needle=clean(diagnostic?.needle);
  return safeArray(files).map((file,index)=>{
    const rel=posix(file?.path||file?.relative||file);
    const content=typeof file==='object'?String(file.content??''):'';
    let score=Number(file?.baseScore||0);
    if(rel===diagnosticFile)score+=120;
    if(responsibilities.has(rel))score+=90;
    if(related.has(rel))score+=55;
    if(recent.has(rel))score+=35;
    if(needle&&content.includes(needle))score+=45;
    score+=rolePathBoost(role,rel);
    if(/(?:^|\/)(?:qa|test|tests|spec)(?:\/|\.|-|_)/i.test(rel)&&role!=='qa')score+=4;
    return {...(typeof file==='object'?file:{}),path:rel,contextScore:score,_index:index};
  }).filter(row=>row.path).sort((a,b)=>b.contextScore-a.contextScore||a._index-b._index||a.path.localeCompare(b.path)).map(({_index,...row})=>row);
}

export function packAdaptiveContext(options={}){
  const limits={...DEFAULT_CONTEXT_LIMITS,...(options.limits||{})};
  const ranked=rankAdaptiveContextCandidates(options);
  const packed=[];let bytes=0;
  for(const row of ranked){
    if(packed.length>=limits.maxFiles||bytes>=limits.maxBytes)break;
    const available=Math.min(limits.maxFileBytes,limits.maxBytes-bytes);
    if(available<=0)break;
    const content=truncateUtf8(row.content??'',available),used=Buffer.byteLength(content);
    if(used<1)continue;
    packed.push({...row,content,packedBytes:used,truncated:used<Buffer.byteLength(String(row.content??''))});
    bytes+=used;
  }
  return Object.freeze({version:1,files:Object.freeze(packed),bytes,limits:Object.freeze(limits)});
}

export function compileDevelopmentPolicy({activeIntent={},agentsPolicy={},projectPolicy={},verifiedLearning={},role='development'}={}){
  const hardSafety=Object.freeze({
    directMainWrite:false,
    selfApprove:false,
    paidApi:false,
    bypassIndependentQa:false,
    graphicsGameplayAuthority:false,
  });
  const effective={...verifiedLearning,...projectPolicy,...agentsPolicy,...activeIntent,...hardSafety};
  return Object.freeze({
    version:1,
    role:clean(role)||'development',
    precedence:Object.freeze(['VERIFIED_LEARNING','PROJECT_POLICY','AGENTS_POLICY','ACTIVE_OWNER_INTENT','IMMUTABLE_SAFETY']),
    effective:Object.freeze(effective),
    immutableSafety:hardSafety,
  });
}

function isMetaOnlyPath(file){
  const rel=posix(file).toLowerCase();
  return rel.endsWith('.md')||rel.startsWith('.github/')||rel.startsWith('.autonomous/')||rel.startsWith('company-learning/')||/(?:^|\/)(?:company-status|department-experience|company-directive)\.(?:json|js)$/.test(rel);
}
function isVisualPath(file){
  const rel=posix(file).toLowerCase();
  return /\.(?:css|svg|shader|mat|anim|controller)$/.test(rel)||/(?:ui|hud|render|visual|sprite|animation|animator|effect|vfx|shader|material)/.test(rel);
}
function isGameplayPath(file){
  const rel=posix(file).toLowerCase();
  return !isMetaOnlyPath(rel)&&(/^(?:web-games|unity-games)\//.test(rel)||/\.(?:js|mjs|cjs|html?|cs|json)$/.test(rel));
}

export function classifyImplementationImpact({changedFiles=[],role='development'}={}){
  const files=uniq(changedFiles),nonMeta=files.filter(file=>!isMetaOnlyPath(file));
  const visual=nonMeta.filter(isVisualPath),gameplay=nonMeta.filter(isGameplayPath);
  let status='NO_GAME_CHANGE',score=0;
  if(nonMeta.length&&visual.length&&gameplay.some(file=>!visual.includes(file))){status='MIXED_GAME_VISUAL_CHANGE';score=5;}
  else if(nonMeta.length&&visual.length){status='VISUAL_IMPLEMENTATION';score=role==='graphics'?5:4;}
  else if(gameplay.length){status='GAMEPLAY_IMPLEMENTATION';score=5;}
  else if(nonMeta.length){status='IMPLEMENTATION_OTHER';score=2;}
  return Object.freeze({version:1,status,score,max:5,changedFiles:Object.freeze(files),metaOnly:Object.freeze(files.filter(isMetaOnlyPath)),visualFiles:Object.freeze(visual),gameplayFiles:Object.freeze(gameplay),implementationCredit:score>0});
}

export function buildExecutionCheckpoint({gameId='',role='development',sourceCommit='',candidateId='',goal='',completed=[],nextAction='',pendingCi=[],blocker=null,acceptanceCriteria=[],status='IMPLEMENTED_PENDING_QA',fingerprint=null,changedFiles=[]}={}){
  const allowed=new Set(['STARTED','IMPLEMENTED_PENDING_QA','VERIFIED','BLOCKED']);
  const resolvedStatus=allowed.has(clean(status).toUpperCase())?clean(status).toUpperCase():'IMPLEMENTED_PENDING_QA';
  return Object.freeze({
    version:1,status:resolvedStatus,gameId:clean(gameId),role:clean(role)||'development',sourceCommit:clean(sourceCommit)||null,candidateId:clean(candidateId)||null,
    goal:clean(goal),completed:Object.freeze(safeArray(completed).map(clean).filter(Boolean).slice(0,12)),changedFiles:Object.freeze(uniq(changedFiles)),nextAction:clean(nextAction),pendingCi:Object.freeze(safeArray(pendingCi).map(clean).filter(Boolean).slice(0,12)),blocker:blocker?clean(blocker):null,acceptanceCriteria:Object.freeze(safeArray(acceptanceCriteria).map(clean).filter(Boolean).slice(0,12)),failureFingerprint:fingerprint?.id||clean(fingerprint)||null,updatedAt:new Date().toISOString(),
  });
}

function verifiedEvidenceRows(root){
  if(!root||!fs.existsSync(root)||!fs.statSync(root).isDirectory())return [];
  return fs.readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.endsWith('.json')).map(entry=>{
    const file=path.join(root,entry.name),value=readJson(file);return value?{file,value}:null;
  }).filter(Boolean);
}

export function findVerifiedFailureResolution({root='company-learning/evidence',gameId='',fingerprint=''}={}){
  const id=typeof fingerprint==='object'?fingerprint?.id:clean(fingerprint);
  const rows=verifiedEvidenceRows(root).filter(({value})=>clean(value.gameId)===clean(gameId)&&clean(value?.vibe2DevelopmentIntelligence?.failureFingerprint?.id)===id);
  rows.sort((a,b)=>String(b.value.generatedAt||b.value.recordedAt||'').localeCompare(String(a.value.generatedAt||a.value.recordedAt||'')));
  const row=rows[0];if(!row)return null;
  return Object.freeze({source:posix(row.file),candidateId:row.value.candidateId||null,changedFiles:Object.freeze(uniq(row.value.changedFiles)),summary:clean(row.value.summary),expectedEffect:clean(row.value.expectedEffect)});
}

export function loadLatestVerifiedCheckpoint({root='company-learning/evidence',gameId='',role=''}={}){
  const rows=verifiedEvidenceRows(root).map(({file,value})=>({file,value,checkpoint:value?.vibe2DevelopmentIntelligence?.checkpoint})).filter(row=>row.checkpoint&&clean(row.checkpoint.gameId)===clean(gameId)&&(!role||clean(row.checkpoint.role)===clean(role)));
  rows.sort((a,b)=>String(b.checkpoint.updatedAt||b.value.generatedAt||'').localeCompare(String(a.checkpoint.updatedAt||a.value.generatedAt||'')));
  const row=rows[0];return row?Object.freeze({source:posix(row.file),candidateId:row.value.candidateId||null,checkpoint:row.checkpoint}):null;
}

export function evaluateAndroidInstallGate(evidence={}){
  const deviceApi=Number(evidence.deviceApi||0),minSdk=Number(evidence.minSdk||0),nativeAbis=uniq(evidence.nativeAbis),deviceAbis=uniq(evidence.deviceAbis);
  const checks={
    packageId:Boolean(clean(evidence.package||evidence.packageId)),
    signingCertificate:Boolean(clean(evidence.certSha256||evidence.signingCertificateSha256)),
    versionCode:Number(evidence.versionCode)>0,
    sdkCompatible:deviceApi>0&&minSdk>0&&minSdk<=deviceApi,
    abiCompatible:nativeAbis.length===0||nativeAbis.some(abi=>deviceAbis.includes(abi)),
    freshInstall:evidence.freshInstallPassed===true,
    launchAndRuntime:evidence.runtimeSmokePassed===true,
    updateInstall:evidence.updateInstallPassed===true,
  };
  const failed=Object.entries(checks).filter(([,pass])=>!pass).map(([name])=>name);
  return Object.freeze({version:1,pass:failed.length===0,checks:Object.freeze(checks),failed:Object.freeze(failed)});
}
