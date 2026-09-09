// 파일명: tools/artbook-lifecycle-scheduling-test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const prepareScript=path.join(here,'artbook-prepare-daily.mjs');
const roles=['planning','graphics','development','qa','balance'];
const kstDate=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const pick=type=>parts.find(x=>x.type===type)?.value||'';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
};
const date=kstDate();
const write=(root,file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');};
const completed=(gameId,edition=1,lifecycleState='DESIGN_BASELINE',workMode='INITIAL')=>({
  id:`${gameId}-v${edition}`,gameId,gameName:gameId,edition,createdAt:date,workMode,status:'completed-artbook',
  cuts:Array.from({length:12},(_,i)=>({no:i+1,title:`p${i+1}`})),
  postprocess:{complete:true,sourceMode:'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION',assistantAuthorship:false,imageFirst:true},
  presentation:{mode:'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_AUTHORED',assistantAuthored:false},
  lifecycle:{state:lifecycleState,currentBaseline:true}
});
function runFixture({games,artbooks,dailySubmissions=[],revisions=[],secondTasks=[],queueExtra={}}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-life-'));
  write(root,'artbook-submission-queue.json',{requiredRoles:roles,queueOrder:games.map(x=>x.id),games:games.map(x=>({gameId:x.id,name:x.name||x.id,styleProfile:''})),...queueExtra});
  write(root,'game-catalog.json',{games:games.map(x=>({id:x.id,name:x.name||x.id,hasWebArchive:true,homepageCategory:x.stage||'reviewing'}))});
  write(root,'game-artbooks.json',{policy:{dailyFinalSubmissionLimit:1},artbooks,dailySubmissions});
  write(root,'artbook-second-work-queue.json',{tasks:secondTasks});
  write(root,'artbook-revision-queue.json',{tasks:revisions});
  const result=spawnSync(process.execPath,[prepareScript],{cwd:root,encoding:'utf8'});
  if(result.status!==0)throw new Error(`prepare failed\nSTDOUT:${result.stdout}\nSTDERR:${result.stderr}`);
  const context=JSON.parse(fs.readFileSync(path.join(root,'artbook-daily-context.json'),'utf8'));
  const queue=JSON.parse(fs.readFileSync(path.join(root,'artbook-submission-queue.json'),'utf8'));
  return {context,queue,stdout:result.stdout,root};
}

// 기존 게임 최초 아트북이 남아 있으면 같은 날 이미 INITIAL이 완료됐어도 다음 기존 게임 INITIAL을 계속 처리한다.
{
  const games=[{id:'a',stage:'development-confirmed'},{id:'b',stage:'release-confirmed'}];
  const a=completed('a');
  const result=runFixture({games,artbooks:[a],dailySubmissions:[{date,gameId:'a',artbookId:a.id,status:'completed-artbook'}]});
  assert.equal(result.context.run,true);
  assert.equal(result.context.gameId,'b');
  assert.equal(result.context.mode,'INITIAL');
  assert.equal(result.context.submissionCountPolicy,'UNLIMITED');
  assert.deepEqual(result.context.existingInitialRemaining,['b']);
}

// 모든 기존 게임이 최초 설계본을 가진 뒤 release-confirmed는 출시 기준 업그레이드가 최우선이다.
{
  const games=[{id:'a',stage:'development-confirmed'},{id:'b',stage:'release-confirmed'}];
  const a=completed('a'),b=completed('b');
  const result=runFixture({games,artbooks:[a,b],dailySubmissions:[{date,gameId:'a',artbookId:a.id,status:'completed-artbook'}]});
  assert.equal(result.context.run,true);
  assert.equal(result.context.gameId,'b');
  assert.equal(result.context.mode,'RELEASE_UPGRADE');
  assert.equal(result.context.lifecycle.targetState,'RELEASE_BASELINE');
  assert.equal(result.context.lifecycle.trigger,'RELEASE_CONFIRMED');
}

// release 업그레이드가 없으면 development-confirmed가 개발 기준 업그레이드된다.
{
  const games=[{id:'a',stage:'development-confirmed'}];
  const a=completed('a');
  const result=runFixture({games,artbooks:[a]});
  assert.equal(result.context.mode,'DEVELOPMENT_UPGRADE');
  assert.equal(result.context.lifecycle.targetState,'DEVELOPMENT_BASELINE');
}

// V1 최초 설계본 이력과 V2 개발 기준본을 모두 보존한 상태에서 필요 수정 요청은 V3 후보 REVISION으로 처리한다.
{
  const games=[{id:'a',stage:'development-confirmed'}];
  const v1=completed('a',1,'DESIGN_BASELINE','INITIAL');
  v1.lifecycle.currentBaseline=false;
  const v2=completed('a',2,'DEVELOPMENT_BASELINE','DEVELOPMENT_UPGRADE');
  const revisions=[{id:'r1',gameId:'a',status:'SCHEDULED',dueDate:date,requestedAt:`${date}T00:00:00Z`,trigger:'QA_DESIGN_FINDING',reason:'후반 설계 수정',selectedDepartments:['planning','qa'],sourceArtbookId:v2.id,sourceLifecycleState:'DEVELOPMENT_BASELINE'}];
  const result=runFixture({games,artbooks:[v1,v2],dailySubmissions:[{date,gameId:'a',artbookId:v1.id,status:'completed-artbook'}],revisions});
  assert.equal(result.context.run,true);
  assert.equal(result.context.mode,'REVISION');
  assert.equal(result.context.lifecycle.targetState,'DEVELOPMENT_BASELINE');
  assert.equal(result.context.lifecycle.sourceArtbookId,v2.id);
  assert.equal(result.context.lifecycle.overwriteApprovedVersion,false);
}

// 처리할 작업이 없으면 과거 currentDailyTarget/currentTargetExecution을 남기지 않고 큐를 IDLE로 갱신한다.
{
  const games=[{id:'a',stage:'development-confirmed'},{id:'b',stage:'release-confirmed'}];
  const a1=completed('a',1,'DESIGN_BASELINE','INITIAL');a1.lifecycle.currentBaseline=false;
  const a2=completed('a',2,'DEVELOPMENT_BASELINE','DEVELOPMENT_UPGRADE');
  const b1=completed('b',1,'DESIGN_BASELINE','INITIAL');b1.lifecycle.currentBaseline=false;
  const b2=completed('b',2,'RELEASE_BASELINE','RELEASE_UPGRADE');
  const result=runFixture({games,artbooks:[a1,a2,b1,b2],queueExtra:{updatedAt:'2026-09-01',currentDailyTarget:'stale-game',currentTargetExecution:{date:'2026-09-01',mode:'INITIAL'}}});
  assert.equal(result.context.run,false);
  assert.equal(result.context.reason,'NO_ARTBOOK_WORK_DUE');
  assert.equal(result.queue.currentDailyTarget,'');
  assert.equal(result.queue.updatedAt,date);
  assert.equal(result.queue.currentTargetExecution.mode,'IDLE');
  assert.equal(result.queue.currentTargetExecution.status,'NO_ARTBOOK_WORK_DUE');
  assert.match(result.stdout,/ARTBOOK_QUEUE_STATE=IDLE/);
}

console.log('ARTBOOK_LIFECYCLE_SCHEDULING_TEST=PASS');