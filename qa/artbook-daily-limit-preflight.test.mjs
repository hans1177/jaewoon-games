import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const prepare=path.resolve('tools/artbook-prepare-daily.mjs');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`;}
function writeJson(root,name,value){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n');}
function completedInitial(gameId,date){return{
  id:`${gameId}-${date}-initial`,gameId,edition:1,createdAt:date,workMode:'INITIAL',status:'completed-artbook',
  cuts:Array.from({length:12},(_,i)=>({no:i+1,title:`p${i+1}`})),
  postprocess:{complete:true,sourceMode:'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_OWNED_VISUAL_PAGES_PLUS_DIRECTOR_PRESENTATION',assistantAuthorship:false,imageFirst:true},
  presentation:{mode:'VIBE2_FIRST_DRAFT_PLUS_EMPLOYEE_AUTHORED',assistantAuthored:false},
  lifecycle:{state:'DESIGN_BASELINE',currentBaseline:true}
};}
function fixture({completed=[]}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-unlimited-')),date=kstDate();
  const games=['game-a','game-b'];
  writeJson(root,'artbook-submission-queue.json',{queueOrder:games,games:games.map(gameId=>({gameId,name:gameId}))});
  writeJson(root,'game-catalog.json',{games:games.map(id=>({id,hasWebArchive:true}))});
  writeJson(root,'artbook-second-work-queue.json',{tasks:[]});
  writeJson(root,'artbook-revision-queue.json',{tasks:[]});
  const artbooks=completed.map(id=>completedInitial(id,date));
  writeJson(root,'game-artbooks.json',{
    policy:{dailyFinalSubmissionLimit:1},
    dailySubmissions:artbooks.map(x=>({date,gameId:x.gameId,artbookId:x.id,status:'completed-artbook'})),
    artbooks
  });
  return {root,date};
}

test('a completed initial today does not block another existing initial today',()=>{
  const {root,date}=fixture({completed:['game-a']});
  try{
    const result=spawnSync(process.execPath,[prepare],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/ARTBOOK_DAILY_TARGET=game-b/);
    assert.match(result.stdout,/ARTBOOK_SUBMISSION_COUNT_POLICY=UNLIMITED/);
    assert.doesNotMatch(result.stdout,/DAILY_INITIAL_ARTBOOK_LIMIT/);
    const context=JSON.parse(fs.readFileSync(path.join(root,'artbook-daily-context.json'),'utf8'));
    assert.equal(context.run,true);
    assert.equal(context.gameId,'game-b');
    assert.equal(context.mode,'INITIAL');
    assert.equal(context.submissionCountPolicy,'UNLIMITED');
    assert.equal(fs.existsSync(path.join(root,'artbook-work-orders',`${date}-game-b.json`)),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('legacy dailyFinalSubmissionLimit value is ignored for initial backfill',()=>{
  const {root,date}=fixture();
  try{
    const result=spawnSync(process.execPath,[prepare],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/ARTBOOK_DAILY_TARGET=game-a/);
    const context=JSON.parse(fs.readFileSync(path.join(root,'artbook-daily-context.json'),'utf8'));
    assert.equal(context.submissionCountPolicy,'UNLIMITED');
    assert.equal(context.gameId,'game-a');
    const order=JSON.parse(fs.readFileSync(path.join(root,'artbook-work-orders',`${date}-game-a.json`),'utf8'));
    assert.equal(order.submissionCountPolicy,'UNLIMITED');
    assert.equal('finalSubmissionLimitToday' in order,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
