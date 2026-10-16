// Game-only test routing. Never treats missing QA as a passing QA result.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildGameDevelopmentMap} from './game-development-sync.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=s=>String(s??'').trim().replaceAll('\\','/').replace(/^\.\//,'');
export function chooseGameQa({games=[],changedFiles=[],gameId='',all=false}={}){
  const changes=new Set(changedFiles.map(clean).filter(Boolean));
  if(gameId&&!games.some(x=>x.gameId===gameId))throw new Error('GAME_NOT_FOUND:'+gameId);
  return games.filter(g=>{
    if(gameId)return g.gameId===gameId;
    if(all)return true;
    for(const p of changes){
      if(g.qa.includes(p))return true;
      if(Object.values(g.sources).some(src=>p.startsWith(src+'/')))return true;
      if(p.startsWith('assets/external/'+g.gameId+'/'))return true;
      if(p.startsWith('assets/roblox/actors/native/'+g.gameId+'/'))return true;
    }
    return false;
  }).map(g=>({
    gameId:g.gameId,
    tests:[...g.qa].sort(),
    selectionSource:gameId?'EXPLICIT_GAME':all?'ALL_GAMES':'CHANGED_GAME_FILES',
    previousValidationEvidenceReused:false
  }));
}
export function runGameQa({selected=[],repoRoot=ROOT,execute=false,timeoutMs=120000}={}){
  const results=[];
  for(const game of selected){
    if(game.tests.length===0){
      results.push({gameId:game.gameId,state:'NO_GAME_SCOPED_QA',testCount:0});continue;
    }
    if(!execute){
      results.push({gameId:game.gameId,state:'PENDING_EXECUTION',testCount:game.tests.length});continue;
    }
    // All tests come from repository discovery, never user-injected shell.
    // A parent Node test runner sets NODE_TEST_CONTEXT; inherited by this child,
    // it suppresses the standalone test result and can falsely report PASS.
    const childEnv={...process.env,GAME_ID:game.gameId};
    delete childEnv.NODE_TEST_CONTEXT;
    const check=spawnSync(process.execPath,['--test',...game.tests],{
      cwd:repoRoot,encoding:'utf8',timeout:timeoutMs,maxBuffer:4*1024*1024,
      env:childEnv
    });
    results.push({
      gameId:game.gameId,testCount:game.tests.length,
      state:check.error||check.status!==0?'GAME_QA_FAILED':'GAME_QA_PASSED',
      exitCode:check.status,
      error:check.error?.message||null,
      outputTail:(check.stdout||'').slice(-3500),
      errorTail:(check.stderr||'').slice(-1200)
    });
  }
  return{
    pass:results.every(x=>x.state!=='GAME_QA_FAILED'),
    gameQaPassedCount:results.filter(x=>x.state==='GAME_QA_PASSED').length,
    gameQaFailedCount:results.filter(x=>x.state==='GAME_QA_FAILED').length,
    gameQaMissingCount:results.filter(x=>x.state==='NO_GAME_SCOPED_QA').length,
    results
  };
}
function args(){
  const out={};
  for(const input of process.argv.slice(2)){
    if(!input.startsWith('--'))continue;
    const eq=input.indexOf('=');
    out[eq>=0?input.slice(2,eq):input.slice(2)]=eq>=0?input.slice(eq+1):true;
  }
  return out;
}
function main(){
  const options=args(),repoRoot=options.root||ROOT;
  const map=buildGameDevelopmentMap({repoRoot});
  const changes=options['changed-files']?
    fs.readFileSync(options['changed-files'],'utf8').split(/\r?\n/).filter(Boolean):[];
  const selected=chooseGameQa({
    games:map.games,changedFiles:changes,
    gameId:options['game-id']||'',all:options.all===true
  });
  const report={
    schemaVersion:1,scope:options['game-id']||options.all&&'ALL' ||'CHANGED_GAME_FILES',
    gamesSelected:selected.length, ...runGameQa({selected,repoRoot,execute:options.run===true})
  };
  if(options.output){
    const target=path.resolve(options.output);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  }
  console.log('GAME_SCOPED_QA_SELECTED='+report.gamesSelected);
  console.log('GAME_SCOPED_QA_PASSED='+report.gameQaPassedCount);
  console.log('GAME_SCOPED_QA_FAILED='+report.gameQaFailedCount);
  console.log('GAME_SCOPED_QA_NO_TEST='+report.gameQaMissingCount);
  for(const r of report.results)console.log('GAME_SCOPED_QA='+r.gameId+':'+r.state);
  if(!report.pass)process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url))main();
