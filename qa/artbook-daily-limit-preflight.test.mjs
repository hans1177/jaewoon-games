import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const prepare=path.resolve('tools/artbook-prepare-daily.mjs');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`;}
function writeJson(root,name,value){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n');}
function fixture({withCompletedToday}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-daily-limit-')),date=kstDate();
  writeJson(root,'artbook-submission-queue.json',{queueOrder:['game-a'],games:[{gameId:'game-a',name:'게임 A'}]});
  writeJson(root,'game-catalog.json',{games:[{id:'game-a',hasWebArchive:true}]});
  writeJson(root,'artbook-second-work-queue.json',{tasks:[]});
  writeJson(root,'game-artbooks.json',{policy:{dailyFinalSubmissionLimit:1},dailySubmissions:withCompletedToday?[{date,gameId:'done-game',artbookId:'done-today',status:'completed-artbook'}]:[],artbooks:[]});
  return {root,date};
}

test('daily final limit stops before target scheduling and model work',()=>{
  const {root,date}=fixture({withCompletedToday:true});
  try{
    const result=spawnSync(process.execPath,[prepare],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/ARTBOOK_DAILY=SKIP_DAILY_FINAL_LIMIT/);
    assert.match(result.stdout,/ARTBOOK_FINALS_TODAY=1\/1/);
    const context=JSON.parse(fs.readFileSync(path.join(root,'artbook-daily-context.json'),'utf8'));
    assert.equal(context.run,false);
    assert.equal(context.reason,'DAILY_FINAL_ARTBOOK_LIMIT_REACHED');
    assert.equal(context.finalSubmissionLimitToday,1);
    const queue=JSON.parse(fs.readFileSync(path.join(root,'artbook-submission-queue.json'),'utf8'));
    assert.equal(queue.currentDailyTarget,undefined);
    assert.equal(fs.existsSync(path.join(root,'artbook-work-orders',`${date}-game-a.json`)),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('under the daily limit still schedules the next existing initial artbook',()=>{
  const {root,date}=fixture({withCompletedToday:false});
  try{
    const result=spawnSync(process.execPath,[prepare],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/ARTBOOK_DAILY_TARGET=game-a/);
    const context=JSON.parse(fs.readFileSync(path.join(root,'artbook-daily-context.json'),'utf8'));
    assert.equal(context.run,true);
    assert.equal(context.gameId,'game-a');
    assert.equal(context.finalSubmissionLimitToday,1);
    assert.equal(fs.existsSync(path.join(root,'artbook-work-orders',`${date}-game-a.json`)),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
