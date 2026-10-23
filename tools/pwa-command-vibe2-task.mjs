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
  const gameId=clean(task?.game_id||task?.gameId);
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(gameId))throw new Error('WEB_ORG_GAME_ID_INVALID');
  const policy=readJson(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),null);
  const active=policy?.ownerActiveDevelopmentScope20261009;
  const webChat=policy?.localVibeWebChat;
  // 기존 중앙정책의 WEB 권한만 사용한다. 로블록스/유니티 작업 권한을 웹 접수에서 상속하지 않는다.
  if(policy?.status!=='OWNER_DIRECT_LOCKED'||
     policy?.developmentAccess?.WEB!=='ALWAYS_ALLOWED'||
     active?.status!=='ACTIVE'||!active.activeTargets?.includes('WEB')||
     webChat?.enabled!==true||webChat?.platform!=='WEB'||
     policy?.finalDevelopmentLock?.sequenceLock?.status!=='LOCKED')
    throw new Error('WEB_ORG_CENTRAL_BOUNDARY_NOT_VERIFIED');
  const game=(catalog.games||[]).find(row=>clean(row.id)===gameId);
  if(!game)throw new Error('게임 카탈로그에서 찾을 수 없음: '+gameId);
  const requestedPlatform=clean(task?.platform||task?.requestedPlatform).toLowerCase();
  if(requestedPlatform&&requestedPlatform!=='web')throw new Error('명시적 플랫폼 요청은 웹만 지원');
  // 웹게임 index.html만 개발 대상으로 인정한다. 공유 라이브러리는 읽기 전용이며 타 조직 소스는 접근하지 않는다.
  const web=webRoot(game);
  if(web!=='web-games/'+gameId)throw new Error('WEB_ORG_WEB_SOURCE_MISMATCH');
  try{
    const rootReal=filesystem.realpathSync(repoRoot);
    const webReal=filesystem.realpathSync(path.join(repoRoot,'web-games'));
    const sourceReal=filesystem.realpathSync(path.join(repoRoot,web));
    const indexReal=filesystem.realpathSync(path.join(repoRoot,web,'index.html'));
    if(webReal!==path.join(rootReal,'web-games')||
       sourceReal!==path.join(webReal,gameId)||
       indexReal!==path.join(sourceReal,'index.html')||
       !filesystem.statSync(indexReal).isFile())throw new Error('WEB_ORG_SOURCE_OUTSIDE_WEB');
  }catch(error){
    if(error?.message==='WEB_ORG_SOURCE_OUTSIDE_WEB')throw error;
    throw new Error('웹게임 소스가 없어 작업을 접수할 수 없음: '+gameId);
  }
  void status;
  return {game,target:'web',sourceRoot:web,actualReleaseState:actualReleaseState(game)};
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
// An owner idea is a development task, not permission to create orchestration work.
// Keep implementation inside the already-selected project and existing Vibe DAG.
export function buildGithubDevelopmentFocus({gameId='',sourceRoot=''}={}){
 const id=clean(gameId),root=posix(sourceRoot);
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)||
    !/^web-games\/[a-zA-Z0-9._-]+$/.test(root)||
    root.split('/')[1]!==id)throw new Error('GITHUB_DEVELOPMENT_FOCUS_SOURCE_MISMATCH');
 return [
  '[GITHUB_DEVELOPMENT_FIRST]',
  '대상 게임: '+id+' · 기존 소스: '+root,
  '우선순위: 실제 게임 코드 수정 -> 해당 게임 집중 QA -> 브라우저/입력/저장 실동작 증거 -> 기존 PR 검토.',
  '기존 책임 함수와 원본 에셋·애니메이션을 먼저 재사용한다. 새 엔진/파이프라인/우회 래퍼를 만들지 않는다.',
  '웹 조직은 web-games/ 게임 코드만 개발한다. 로블록스·유니티 소스, 타 조직의 작업 큐·정책·인증키는 수정하거나 호출하지 않는다.',
  '공유 assets/ 라이브러리는 읽기 전용이다. 홈페이지에는 게임 소개·출시 상태·실행 링크만 전달하고 개발 명령은 보내지 않는다.',
  '지시와 무관한 홈페이지, 타 게임, 관리 보고서, 학습 상태, 회사 정책 수정은 별도 작업으로 확장하지 않는다.',
  '코드 변경이 없거나 테스트 증거가 없으면 개발 완료로 표시하지 않는다.',
  '보안, 중앙 정책, 실제 실행, F0-F9, 독립 QA, 소유자 승인·병합 관문은 그대로 적용한다.'
 ].join('\n');
}
export function buildPwaVibeTask(task,context={}){
  const taskId=safeUuid(task?.id);if(!taskId)throw new Error('PWA 작업 UUID 오류');
  const body=clean(task?.body);if(!body)throw new Error('PWA 작업 내용 비어 있음');
  const resolved=resolveProject(task,context),kind=clean(task.kind)==='feedback'?'feedback':'directive',originalPriority=['normal','priority','urgent'].includes(clean(task.priority))?clean(task.priority):'normal';
  const goal=['[OWNER_IMMEDIATE_PWA]',`게임: ${resolved.game.name||resolved.game.id}`,`사용자 ${kind==='feedback'?'플레이 피드백':'직접 지시'}: ${body}${ownerContext(task)}`,buildGithubDevelopmentFocus({gameId:resolved.game.id,sourceRoot:resolved.sourceRoot}),'최신 main과 기존 구조를 먼저 확인하고 기존 책임 함수/파일을 직접 수정한다.','기존 게임 규칙·밸런스·저장 의미를 지시 없이 바꾸지 말고 임시 wrapper/override/우회 패치를 만들지 않는다.','모바일 우선으로 실제 실행·입력·화면 잘림·저장/불러오기·런타임 오류를 QA한 뒤 검증된 후보만 main 자동반영한다.'].join('\n');
  return {id:`pwa-${taskId}`,gameId:resolved.game.id,target:resolved.target,sourceRoot:resolved.sourceRoot,department:'development',type:'implementation',goal,responsibleFiles:[],dependencies:[],priority:'owner-immediate',releaseState:executionReleaseState(resolved.game),status:'queued',retries:0,maxRetries:2,ownerDirective:true,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,evidence:[`pwa-task:${taskId}`,`pwa-kind:${kind}`,`pwa-priority:${originalPriority}`,`actual-release-state:${resolved.actualReleaseState}`,`source-root:${resolved.sourceRoot}`,'owner-auto-deploy-authorization','verified-qa-required','web-organization-boundary:v1',...(task.source==='LOCAL_VIBE_WEB_CHAT'?['vibe-local-web-owner-directive']:[])],companyContext:{stageId:'owner-immediate',role:'director',assignmentAuthority:'owner-directive',sourceRef:`pwa-task:${taskId}`,reviewRequired:true}};
}
export function ingestPwaTask({task,queue={},catalog={},status={},repoRoot=process.cwd(),filesystem=fs}={}){
  const next=buildPwaVibeTask(task,{catalog,status,repoRoot,filesystem}),tasks=Array.isArray(queue.tasks)?queue.tasks:[];
  // 웹 조직의 UUID가 공용 큐의 다른 플랫폼 작업과 충돌하면 덮어쓰거나 성공 처리하지 않는다.
  const existing=tasks.find(row=>row.id===next.id);
  if(existing){
    if(clean(existing.target).toLowerCase()!=='web'||clean(existing.gameId)!==next.gameId||
       (clean(existing.sourceRoot)&&clean(existing.sourceRoot)!==next.sourceRoot))
      throw new Error('WEB_ORG_QUEUE_IDENTITY_COLLISION');
    return {...queue,tasks,ingest:{added:false,taskId:next.id,reason:'ALREADY_QUEUED'}};
  }
  // 웹 작업 접수에서 로블록스/유니티 큐의 전역 동시 실행 수나 모드를 바꾸지 않는다.
  // 오직 명시적으로 웹 작업만 존재하는 과거 직렬화 큐에서만 복구한다.
  const hasNonWebTasks=tasks.some(row=>clean(row.target).toLowerCase()!=='web');
  if(hasNonWebTasks)return {
    ...queue,tasks:[...tasks,next],
    ingest:{added:true,taskId:next.id,gameId:next.gameId,target:next.target,reason:'OWNER_IMMEDIATE_PWA'}
  };
  // Owner-submitted source edits share the existing DAG worker pool, not a new one-slot queue.
  // Preserve a real capacity limit. Recover old PWA-only serialized queues without touching tasks.
  const priorMax=Number(queue.maxConcurrentTasks);
  const maxConcurrentTasks=Number.isSafeInteger(priorMax)&&priorMax>1?priorMax:256;
  const mode=queue.mode&&queue.mode!=='single-worker-priority-serial-queue'
    ?queue.mode:'hierarchical-dag-sharded-work-stealing-queue';
  return {...queue,version:Number(queue.version)||3,mode,maxConcurrentTasks,ownerDirectivePreemptsAutonomy:true,tasks:[...tasks,next],ingest:{added:true,taskId:next.id,gameId:next.gameId,target:next.target,reason:'OWNER_IMMEDIATE_PWA'}};
}
function pwaTaskId(row={}){const match=clean(row.id).match(/^pwa-([0-9a-f-]{36})$/i);return match?match[1]:null;}
function mapStatus(row={}){const status=clean(row.status).toLowerCase(),blocker=clean(row.blocker).toLowerCase();if(status==='queued')return'working';if(status==='running')return blocker.includes('candidate-awaiting-qa-and-deployment')?'testing':'working';if(status==='blocked')return'needs_input';if(status==='done')return'done';if(status==='failed')return'failed';if(status==='cancelled')return'cancelled';return null;}
export function buildSyncPayload(queue={}){
  const updates=[];
  for(const row of(Array.isArray(queue.tasks)?queue.tasks:[])){
    // 공유 상태 브랜치가 남아 있어도 웹 PWA로 타 조직 작업의 상태를 반환하지 않는다.
    if(clean(row.target).toLowerCase()!=='web'||(row.evidence||[]).includes('vibe-local-web-owner-directive'))continue;
    const taskId=pwaTaskId(row),status=mapStatus(row);
    if(taskId&&status)updates.push({taskId,status,blocker:clean(row.blocker)||null});
  }
  return {action:'sync',updates};
}

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
