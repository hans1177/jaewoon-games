// 파일명: tools/pwa-command-vibe2-task.mjs
// 역할: PWA 채팅 지시를 기존 Vibe2 owner-immediate 큐 형식으로 변환하고 작업 상태를 PWA 동기화 형식으로 내보낸다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');};
const safeUuid=value=>/^[0-9a-f-]{36}$/i.test(clean(value))?clean(value):null;

function parseArgs(argv=process.argv.slice(2)){
  const args={};
  for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}
  return args;
}
function webRoot(game={}){const value=posix(game.webPath).replace(/^\//,'');return /^web-games\/[a-zA-Z0-9._-]+$/.test(value)?value:null;}
function actualReleaseState(game={}){const value=clean(game.homepageCategory).toLowerCase();return ['release-confirmed','development-confirmed','reviewing','other'].includes(value)?value:'other';}
function executionReleaseState(game={}){const actual=actualReleaseState(game);return ['release-confirmed','development-confirmed'].includes(actual)?actual:'development-confirmed';}
function resolveProject(task,{catalog={},status={},repoRoot=process.cwd(),filesystem=fs}={}){
  const gameId=clean(task?.game_id||task?.gameId),game=(catalog.games||[]).find(row=>clean(row.id)===gameId);
  if(!game)throw new Error(`게임 카탈로그에서 찾을 수 없음: ${gameId||'EMPTY'}`);
  const requestedPlatform=clean(task?.platform||task?.requestedPlatform).toLowerCase();
  if(requestedPlatform&&requestedPlatform!=='web')throw new Error('명시적 플랫폼 요청은 웹만 지원');
  if(requestedPlatform==='web'){
    const onlyWeb=webRoot(game);
    if(!onlyWeb||!filesystem.existsSync(path.join(repoRoot,onlyWeb)))throw new Error('웹게임 소스가 없어 작업을 접수할 수 없음: '+gameId);
    return {game,target:'web',sourceRoot:onlyWeb,actualReleaseState:actualReleaseState(game)};
  }
  const project=(status.projects||[]).find(row=>clean(row.gameId)===gameId),unityRoot=posix(project?.projectPath||game.unityProjectPath);
  if(unityRoot&&unityRoot.startsWith('unity-games/')&&filesystem.existsSync(path.join(repoRoot,unityRoot)))return {game,target:'unity',sourceRoot:unityRoot,actualReleaseState:actualReleaseState(game)};
  const web=webRoot(game);if(web&&filesystem.existsSync(path.join(repoRoot,web)))return {game,target:'web',sourceRoot:web,actualReleaseState:actualReleaseState(game)};
  throw new Error(`실제 수정 가능한 게임 소스가 없음: ${gameId}`);
}
// The existing owner queue bridge may receive an authenticated local web directive.
// Repository dispatch identity is independently verified by GitHub Actions, never by the AI model.
export function validateLocalWebOwnerEvent(event,{actor='',repository=''}={}){
  if(clean(actor)!=='hans1177'||clean(repository)!=='hans1177/jaewoon-games'||
     !['vibe-local-web-owner-directive','created'].includes(clean(event?.action)))throw new Error('LOCAL_OWNER_EVENT_NOT_AUTHORIZED');
  let p=event?.client_payload||{};
  // 소유자 댓글은 데이터로만 해석한다. 편집/봇/타인/다른 저장소 이벤트는 거부한다.
  if(event?.action==='created'){
    if(event?.repository?.full_name!==repository||event?.sender?.login!==actor||
      event?.comment?.user?.login!==actor||event?.comment?.user?.type!=='User'||
      event?.comment?.author_association!=='OWNER'||!Number.isSafeInteger(event?.comment?.id)||
      !Number.isSafeInteger(event?.issue?.number))throw new Error('LOCAL_OWNER_COMMENT_NOT_AUTHORIZED');
    const text=String(event.comment.body??'');
    if(!text.startsWith('/vibe-local-web ')||text.length>4096)throw new Error('LOCAL_OWNER_COMMENT_INVALID');
    try{p=JSON.parse(text.slice('/vibe-local-web '.length));}catch{throw new Error('LOCAL_OWNER_COMMENT_INVALID');}
    if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('LOCAL_OWNER_COMMENT_INVALID');
  }

  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(p.id))||
     !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(clean(p.game_id))||
     clean(p.platform)!=='web'||
     clean(p.kind)!=='directive'||
     p.autoDeployAfterVerifiedQa!==true||
     !clean(p.body)||clean(p.body).length>2000||/[\x00-\x08\x0b-\x1f]/.test(clean(p.body)))throw new Error('LOCAL_OWNER_EVENT_INVALID');
  return {id:clean(p.id),game_id:clean(p.game_id),platform:'web',kind:'directive',priority:'urgent',body:clean(p.body),source:'LOCAL_VIBE_WEB_CHAT'};
}
function ownerContext(task){const rows=Array.isArray(task?.ownerMessages)?task.ownerMessages:[],messages=rows.map(row=>clean(row?.body)).filter(Boolean);return messages.length?`\n\n추가 지시:\n${messages.map(text=>`- ${text}`).join('\n')}`:'';}
export function buildPwaVibeTask(task,context={}){
  const taskId=safeUuid(task?.id);if(!taskId)throw new Error('PWA 작업 UUID 오류');
  const body=clean(task?.body);if(!body)throw new Error('PWA 작업 내용 비어 있음');
  const resolved=resolveProject(task,context),kind=clean(task.kind)==='feedback'?'feedback':'directive',originalPriority=['normal','priority','urgent'].includes(clean(task.priority))?clean(task.priority):'normal';
  const goal=['[OWNER_IMMEDIATE_PWA]',`게임: ${resolved.game.name||resolved.game.id}`,`사용자 ${kind==='feedback'?'플레이 피드백':'직접 지시'}: ${body}${ownerContext(task)}`,'최신 main과 기존 구조를 먼저 확인하고 기존 책임 함수/파일을 직접 수정한다.','기존 게임 규칙·밸런스·저장 의미를 지시 없이 바꾸지 말고 임시 wrapper/override/우회 패치를 만들지 않는다.','모바일 우선으로 실제 실행·입력·화면 잘림·저장/불러오기·런타임 오류를 QA한 뒤 검증된 후보만 main 자동반영한다.'].join('\n');
  return {id:`pwa-${taskId}`,gameId:resolved.game.id,target:resolved.target,department:'development',type:'implementation',goal,responsibleFiles:[],dependencies:[],priority:'owner-immediate',releaseState:executionReleaseState(resolved.game),status:'queued',retries:0,maxRetries:2,ownerDirective:true,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,evidence:[`pwa-task:${taskId}`,`pwa-kind:${kind}`,`pwa-priority:${originalPriority}`,`actual-release-state:${resolved.actualReleaseState}`,`source-root:${resolved.sourceRoot}`,'owner-auto-deploy-authorization','verified-qa-required',...(task.source==='LOCAL_VIBE_WEB_CHAT'?['vibe-local-web-owner-directive']:[])],companyContext:{stageId:'owner-immediate',role:'director',assignmentAuthority:'owner-directive',sourceRef:`pwa-task:${taskId}`,reviewRequired:true}};
}
export function ingestPwaTask({task,queue={},catalog={},status={},repoRoot=process.cwd(),filesystem=fs}={}){
  const next=buildPwaVibeTask(task,{catalog,status,repoRoot,filesystem}),tasks=Array.isArray(queue.tasks)?queue.tasks:[];
  if(tasks.some(row=>row.id===next.id))return {...queue,tasks,ingest:{added:false,taskId:next.id,reason:'ALREADY_QUEUED'}};
  return {...queue,version:Number(queue.version)||3,mode:queue.mode||'single-worker-priority-serial-queue',maxConcurrentTasks:1,ownerDirectivePreemptsAutonomy:true,tasks:[...tasks,next],ingest:{added:true,taskId:next.id,gameId:next.gameId,target:next.target,reason:'OWNER_IMMEDIATE_PWA'}};
}
function pwaTaskId(row={}){const match=clean(row.id).match(/^pwa-([0-9a-f-]{36})$/i);return match?match[1]:null;}
function mapStatus(row={}){const status=clean(row.status).toLowerCase(),blocker=clean(row.blocker).toLowerCase();if(status==='queued')return'working';if(status==='running')return blocker.includes('candidate-awaiting-qa-and-deployment')?'testing':'working';if(status==='blocked')return'needs_input';if(status==='done')return'done';if(status==='failed')return'failed';if(status==='cancelled')return'cancelled';return null;}
export function buildSyncPayload(queue={}){const updates=[];for(const row of(Array.isArray(queue.tasks)?queue.tasks:[])){if((row.evidence||[]).includes('vibe-local-web-owner-directive'))continue;const taskId=pwaTaskId(row),status=mapStatus(row);if(taskId&&status)updates.push({taskId,status,blocker:clean(row.blocker)||null});}return {action:'sync',updates};}

function main(){
  const [mode='']=process.argv.slice(2).filter(arg=>!arg.startsWith('--')),args=parseArgs();
  if(mode==='ingest'){
    const taskPayload=readJson(args.task,{task:null}),task=taskPayload.task||taskPayload,queue=readJson(args.queue,{version:3,tasks:[]}),catalog=readJson(args.catalog,{games:[]}),status=readJson(args.status,{projects:[]});
    const result=ingestPwaTask({task,queue,catalog,status,repoRoot:args.root||process.cwd()});writeJson(args.output||args.queue,result);
    console.log(`PWA_VIBE_INGEST=${result.ingest?.added?'ADDED':'EXISTS'}`);console.log(`PWA_VIBE_TASK=${result.ingest?.taskId||'NONE'}`);console.log(`PWA_VIBE_TARGET=${result.ingest?.target||'NONE'}`);return;
  }
  if(mode==='sync'){const payload=buildSyncPayload(readJson(args.queue,{tasks:[]}));writeJson(args.output||'/tmp/pwa-sync.json',payload);console.log(`PWA_VIBE_SYNC_COUNT=${payload.updates.length}`);return;}
  throw new Error('mode는 ingest 또는 sync');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
export {resolveProject,mapStatus};
