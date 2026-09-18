// 파일명: tools/vibe2-exploration-worker.mjs
// 역할: 구현 전에 소스 구조·영향 범위·관련 파일·검증 대상을 읽기 전용으로 수집해 재사용 가능한 handoff를 만든다.
// 원칙: 소스는 절대 수정하지 않고, 책임 파일 바깥은 읽기 전용 영향 분석에만 사용한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assessExistingWebRepository } from './vibe2-existing-web-assessment.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const IGNORED_DIRS=new Set(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.cache']);
const TARGET_EXTENSIONS=Object.freeze({
  roblox:new Set(['.luau','.lua','.json']),
  web:new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']),
  unity:new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']),
  unreal:new Set(['.h','.hpp','.cpp','.cc','.cxx','.cs','.ini','.uproject','.uplugin','.json']),
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json'])
});
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const MAX_SCAN_FILES=180;
const MAX_RELATED_FILES=12;
const MAX_READ_BYTES=320000;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function extensions(target){const set=TARGET_EXTENSIONS[clean(target).toLowerCase()];if(!set)throw new Error(`지원하지 않는 exploration target: ${target}`);return set;}
function sourcePrefix(target){if(target==='roblox')return'roblox-games/';if(target==='web')return'web-games/';if(target==='unity')return'unity-games/';if(target==='unreal')return'unreal-games/';if(target==='godot')return'godot-games/';return'';}
function assertRoot(root,target){const normalized=posix(root),prefix=sourcePrefix(target);if(!prefix||!normalized.startsWith(prefix)||normalized.includes('..'))throw new Error(`허용되지 않은 exploration source root: ${root}`);return normalized;}
function normalizeRelative(value,root){const normalized=posix(value);return normalized.startsWith(`${root}/`)?normalized.slice(root.length+1):normalized;}
function sha(text){return crypto.createHash('sha256').update(String(text)).digest('hex');}
function safeRead(file){try{const stat=fs.statSync(file);if(!stat.isFile()||stat.size>MAX_READ_BYTES)return'';return fs.readFileSync(file,'utf8');}catch{return'';}}
function listFiles(root,target,ignored=[]){const allowed=extensions(target),ignore=ignored.map(posix).filter(Boolean),rows=[];const walk=current=>{if(rows.length>=MAX_SCAN_FILES)return;for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(rows.length>=MAX_SCAN_FILES)return;if(entry.isDirectory()&&IGNORED_DIRS.has(entry.name))continue;const full=path.join(current,entry.name),relative=posix(path.relative(root,full));if(ignore.some(v=>relative===v||relative.startsWith(`${v}/`)))continue;if(entry.isDirectory())walk(full);else{const ext=path.extname(entry.name).toLowerCase();if(allowed.has(ext)&&!BINARY_EXTENSIONS.has(ext))rows.push({full,relative,ext});}}};walk(root);return rows;}
function goalTokens(goal=''){return unique(clean(goal).toLowerCase().split(/[^a-z0-9가-힣_]+/).filter(x=>x.length>=3)).slice(0,24);}
function protectedSignals(text=''){const checks=[['save',/save|세이브|progress|진행/i],['combat-number',/damage|attack|health|hp|reward|drop|데미지|공격|체력|보상|드랍/i],['network',/fetch\(|axios|websocket|http:/i],['storage',/localStorage|PlayerPrefs|SaveGame|DataStore/i]];return checks.filter(([,re])=>re.test(text)).map(([name])=>name);}
function scoreRelated(row,{responsible,goalTokens:tokens,responsibleNames,responsibleDirs}){let score=0;const text=safeRead(row.full);if(responsible.has(row.relative))return{...row,score:10000,text};const lower=row.relative.toLowerCase(),dir=posix(path.dirname(row.relative));if(responsibleDirs.has(dir))score+=35;for(const token of tokens)if(lower.includes(token))score+=5;for(const name of responsibleNames)if(name&&text.includes(name))score+=24;if(/(?:test|spec|qa|playmode|editmode)/i.test(row.relative))score+=8;return{...row,score,text};}
function compactFile(row){return{path:row.relative,hash:sha(row.text||safeRead(row.full)).slice(0,16),bytes:Buffer.byteLength(row.text||safeRead(row.full),'utf8')};}
function ownerBootstrapAllowed(order,target,responsible=[]){
  const goal=clean(order?.goal);
  return target==='web'&&order?.selectedTask?.ownerDirective===true&&/FULL_WEB_GAME_REBUILD/i.test(goal)&&/SOURCE_ROOT_BOOTSTRAP_ALLOWED/i.test(goal)&&responsible.length===1&&responsible[0]==='index.html';
}
function reusableArtifact(cwd,order){
  const file=clean(process.env.VIBE2_EXPLORATION_FILE);
  if(!file)return null;
  const resolved=path.isAbsolute(file)?file:path.resolve(cwd,file);
  if(!fs.existsSync(resolved))return null;
  const cached=readJson(resolved);
  if(cached?.role!=='exploration'||cached?.sourceWrite!==false||!clean(cached?.reuseKey))throw new Error('잘못된 exploration handoff artifact');
  if(clean(cached.taskId)!==clean(order.taskId))throw new Error('exploration handoff task 불일치');
  const expectedRoot=posix(order?.source?.root);
  if(posix(cached.sourceRoot)!==expectedRoot)throw new Error('exploration handoff source root 불일치');
  return{...cached,reused:true,reusedFrom:posix(path.relative(cwd,resolved))||path.basename(resolved)};
}

export function exploreVibe2WorkOrder({cwd=process.cwd(),order={},outputFile=''}={}){
  if(!order||typeof order!=='object')throw new Error('exploration work order 필요');
  const cached=reusableArtifact(cwd,order);
  if(cached){if(outputFile)writeJson(path.resolve(cwd,outputFile),cached);return cached;}
  const target=clean(order.target).toLowerCase();
  const rootRelative=assertRoot(order?.source?.root,target);
  const root=path.resolve(cwd,rootRelative);
  const responsible=unique(order?.source?.responsibleFiles||[]).map(v=>normalizeRelative(v,rootRelative));
  const baseMainSha=clean(process.env.VIBE2_BASE_MAIN_SHA)||null;
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()){
    if(!ownerBootstrapAllowed(order,target,responsible))throw new Error(`exploration source root 없음: ${rootRelative}`);
    const diagnosticEvidence=unique([...(order?.workPackage?.sharedContext?.diagnosticEvidence||[]),'source-root-missing-owner-bootstrap-authorized']);
    const reuseKey=sha(JSON.stringify({taskId:order.taskId,baseMainSha,rootRelative,responsible,diagnosticEvidence})).slice(0,24);
    const handoff={
      version:1,role:'exploration',sourceWrite:false,reused:false,taskId:clean(order.taskId)||null,
      packageId:clean(order?.workPackage?.id)||null,target,sourceRoot:rootRelative,baseMainSha,
      responsibleFiles:responsible,impactFiles:responsible,contextFiles:[],relatedFiles:[],testTargets:[],
      protectedScopeSignals:[],diagnosticEvidence,fileDigests:[],reuseKey,sourceRootMissing:true,bootstrapAuthorized:true,
      generatedAt:new Date().toISOString()
    };
    if(outputFile)writeJson(path.resolve(cwd,outputFile),handoff);
    return handoff;
  }
  const responsibleSet=new Set(responsible);
  const responsibleNames=new Set(responsible.map(v=>path.basename(v)).filter(Boolean));
  const responsibleDirs=new Set(responsible.map(v=>posix(path.dirname(v))).filter(Boolean));
  const rows=listFiles(root,target,order?.source?.ignoredPaths||[]);
  const scored=rows.map(row=>scoreRelated(row,{responsible:responsibleSet,goalTokens:goalTokens(order.goal),responsibleNames,responsibleDirs})).sort((a,b)=>b.score-a.score||a.relative.localeCompare(b.relative));
  const responsibilityRows=responsible.map(relative=>{const full=path.join(root,relative),text=safeRead(full);return{relative,full,text,score:10000};}).filter(row=>fs.existsSync(row.full));
  const related=scored.filter(row=>!responsibleSet.has(row.relative)&&row.score>0).slice(0,MAX_RELATED_FILES);
  const impactFiles=unique([...responsible,...related.slice(0,8).map(row=>row.relative)]);
  const contextFiles=unique([...responsible,...related.map(row=>row.relative)]).slice(0,12);
  const testTargets=unique(scored.filter(row=>/(?:test|spec|qa|playmode|editmode)/i.test(row.relative)).slice(0,8).map(row=>row.relative));
  const protectedScopeSignals=unique(responsibilityRows.flatMap(row=>protectedSignals(row.text)));
  const diagnosticEvidence=unique(order?.workPackage?.sharedContext?.diagnosticEvidence||[]);
  const fileDigests=[...responsibilityRows,...related.slice(0,6)].map(compactFile);
  const existingWebAssessment=target==='web'?assessExistingWebRepository({cwd,gameId:order.gameId,sourceRoot:rootRelative,order}):null;
  const reuseKey=sha(JSON.stringify({taskId:order.taskId,baseMainSha,rootRelative,fileDigests,diagnosticEvidence,existingWebAssessment})).slice(0,24);
  const handoff={
    version:1,
    role:'exploration',
    sourceWrite:false,
    reused:false,
    taskId:clean(order.taskId)||null,
    packageId:clean(order?.workPackage?.id)||null,
    target,
    sourceRoot:rootRelative,
    baseMainSha,
    responsibleFiles:responsible,
    impactFiles,
    contextFiles,
    relatedFiles:related.map(row=>({path:row.relative,score:row.score})),
    testTargets,
    protectedScopeSignals,
    diagnosticEvidence,
    existingWebAssessment,
    fileDigests,
    reuseKey,
    generatedAt:new Date().toISOString()
  };
  if(outputFile)writeJson(path.resolve(cwd,outputFile),handoff);
  return handoff;
}

export function explorationGuidance(handoff={}){
  if(!handoff?.reuseKey)return'';
  return[
    `[EXPLORATION HANDOFF ${handoff.reuseKey}${handoff.reused?' REUSED':''}]`,
    `책임 파일=${(handoff.responsibleFiles||[]).join(', ')||'NONE'}`,
    `읽기 전용 영향 파일=${(handoff.impactFiles||[]).filter(x=>!(handoff.responsibleFiles||[]).includes(x)).join(', ')||'NONE'}`,
    `검증 후보=${(handoff.testTargets||[]).join(', ')||'NONE'}`,
    `보호 신호=${(handoff.protectedScopeSignals||[]).join(', ')||'NONE'}`,
    handoff.sourceRootMissing===true?'소스 루트가 현재 main에 없고 오너 FULL REBUILD 부트스트랩이 승인되어 있다. exploration은 읽기 전용으로 이 사실만 기록한다.':'',
    ...(handoff.existingWebAssessment?[`[EXISTING WEB STRATEGY] ${handoff.existingWebAssessment.strategy}`,`판단 근거=${(handoff.existingWebAssessment.reasons||[]).join(', ')||'NONE'}`,`설계 scope coverage=${handoff.existingWebAssessment.evidence?.approvedScopeCoveragePct??0}% · gameplay signals=${handoff.existingWebAssessment.evidence?.gameplaySignalCount??0}`,handoff.existingWebAssessment.strategy==='KEEP_AND_CONTINUE'?'기존 구조·세이브·작동 시스템을 보존하고 필요한 개발만 이어간다.':handoff.existingWebAssessment.strategy==='PARTIAL_REPAIR'?'기존 구조를 보존하고 확인된 결함 책임 영역만 수정한다.':handoff.existingWebAssessment.strategy==='MAJOR_REWORK'?'사용 가능한 시스템과 세이브 의미는 보존하고 큰 결함 영역을 재구성한다.':'전체 재구축은 허용되지만 승인 설계·게임 정체성·보존 가능한 세이브 의미는 유지한다.']:[]),
    '영향 파일은 참고용이다. Allowed edit paths 밖 파일은 수정하지 않는다.'
  ].filter(Boolean).join('\n');
}

export function runVibe2ExplorationWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputFile=''}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  return exploreVibe2WorkOrder({cwd,order,outputFile});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runVibe2ExplorationWorker({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputFile:clean(args.output)});console.log('VIBE2_EXPLORATION_WORKER=PASS');console.log(`VIBE2_EXPLORATION_REUSE_KEY=${result.reuseKey}`);console.log(`VIBE2_EXPLORATION_REUSED=${result.reused?'YES':'NO'}`);console.log(`VIBE2_EXPLORATION_IMPACT_FILES=${result.impactFiles.join(',')}`);console.log(`VIBE2_EXISTING_WEB_STRATEGY=${result.existingWebAssessment?.strategy||'NONE'}`);console.log(`VIBE2_EXISTING_WEB_SCOPE_COVERAGE_PCT=${result.existingWebAssessment?.evidence?.approvedScopeCoveragePct??0}`);console.log(`VIBE2_EXISTING_WEB_GAMEPLAY_SIGNALS=${result.existingWebAssessment?.evidence?.gameplaySignalCount??0}`);console.log('VIBE2_EXPLORATION_SOURCE_WRITE=NO');}
