// Game-only test routing. Never treats missing QA as a passing QA result.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildGameDevelopmentMap} from './game-development-sync.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=s=>String(s??'').trim().replaceAll('\\','/').replace(/^\.\//,'');
// Route a Roblox-only game edit away from tests that explicitly exercise only
// another platform's source. Mixed-platform, shared, missing and ambiguous
// tests stay in scope: no Roblox coverage is silently dropped.
export function testRelevantToRobloxChange({gameId='',testPath='',repoRoot=ROOT}={}){
  const id=clean(gameId),relative=clean(testPath);
  const absolute=path.resolve(repoRoot,relative);
  if(!absolute.startsWith(path.resolve(repoRoot)+path.sep)||!fs.existsSync(absolute))return true;
  const body=fs.readFileSync(absolute,'utf8');
  const native=body.includes('roblox-games/'+id+'/')
    ||body.includes('assets/roblox/')||body.includes('roblox-source-bootstrap.json');
  if(native)return true;
  const other=body.includes('web-games/'+id+'/')
    ||body.includes('unity-games/'+id+'/');
  // Tests with no explicit platform-specific source stay mandatory.
  return !other;
}
export function chooseGameQa({games=[],changedFiles=[],gameId='',all=false,repoRoot=ROOT}={}){
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
  }).map(g=>{
    const nativeRoot=clean(g.sources?.ROBLOX||'');
    const nativeOnly=!gameId&&!all&&nativeRoot&&changes.size>0
      &&[...changes].every(p=>p.startsWith(nativeRoot+'/'));
    const tests=nativeOnly
      ?g.qa.filter(testPath=>testRelevantToRobloxChange({gameId:g.gameId,testPath,repoRoot}))
      :g.qa;
    return {
    gameId:g.gameId,
    tests:[...tests].sort(),
    excludedOtherPlatformTests:nativeOnly?g.qa.filter(testPath=>!tests.includes(testPath)).sort():[],
    nativeOnlyQaScope:Boolean(nativeOnly),
    selectionSource:gameId?'EXPLICIT_GAME':all?'ALL_GAMES':'CHANGED_GAME_FILES',
    previousValidationEvidenceReused:false
  };
  });
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
    // 내부 node:test 실행 환경이 중첩 실행으로 전파되면 자식 테스트를 건너뛰므로 분리한다.
    const env={...process.env,GAME_ID:game.gameId};
    delete env.NODE_TEST_CONTEXT;
    const check=spawnSync(process.execPath,['--test','--test-reporter=tap',...game.tests],{
      cwd:repoRoot,encoding:'utf8',timeout:timeoutMs,maxBuffer:4*1024*1024,
      env
    });
    // 자동검증: 일부 실행 환경의 성공 종료 코드만 믿지 않고 TAP의 실제 실패 집계도 확인한다.
    const summaries=[...String(check.stdout||'').matchAll(/^# fail (\d+)\r?$/gm)];
    const reportedFailures=summaries.length?Number(summaries.at(-1)[1]):null;
    const passed=!check.error&&check.status===0&&reportedFailures===0;
    // Preserve the exact failing subtest names instead of retaining only the
    // LAST 3.5k of a 37+ case suite (which frequently contains only PASS lines).
    const failedSubtests=[...String(check.stdout||'').matchAll(/^not ok \d+ - (.+)$/gm)]
      .map(match=>match[1].trim()).slice(0,24);
    results.push({
      gameId:game.gameId,testCount:game.tests.length,
      state:passed?'GAME_QA_PASSED':'GAME_QA_FAILED',
      exitCode:check.status,
      error:check.error?.message||null,
      failedSubtests,
      outputTail:(check.stdout||'').slice(-3500),
      errorTail:(check.stderr||'').slice(-1200)
    });
  }
  // 실패를 게임별로 반복 처리하지 않고 실행 원인별 한 묶음으로 집계한다.
  // 기존 pass는 영향 없는 게임 선택/미실행 보고와 호환되지만 병합 증거로 쓰지 않는다.
  const groups=new Map();
  for(const row of results){
    if(row.state==='GAME_QA_PASSED')continue;
    const signature=row.state==='GAME_QA_FAILED'
      ?row.error?'QA_EXECUTION_ERROR'
        :/^# fail [1-9]\d*\r?$/m.test(row.outputTail||'')?'QA_ASSERTION_FAILURE':'QA_EXIT_OR_INCOMPLETE_TAP'
      :row.state;
    if(!groups.has(signature))groups.set(signature,{signature,count:0,gameIds:[]});
    const group=groups.get(signature);
    group.count+=1;
    group.gameIds.push(row.gameId);
  }
  const failureGroups=[...groups.values()].sort((a,b)=>a.signature.localeCompare(b.signature));
  // 병합 가능은 모든 선택 게임의 테스트가 실제 실행되어 PASS인 경우에만 참이다.
  const mergeReady=results.length>0&&results.every(row=>row.state==='GAME_QA_PASSED');
  return{
    mergeReady,failureGroups,
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
  console.log('GAME_SCOPED_QA_MERGE_READY='+report.mergeReady);
  for(const group of report.failureGroups)console.log('GAME_SCOPED_QA_FAILURE_GROUP='+group.signature+':'+group.gameIds.join(','));
  for(const r of report.results)console.log('GAME_SCOPED_QA='+r.gameId+':'+r.state);
  for(const r of report.results)for(const name of (r.failedSubtests||[]))
    console.log('GAME_SCOPED_QA_FAILED_SUBTEST='+r.gameId+':'+name);
  if(!report.pass||(options['require-merge-ready']===true&&!report.mergeReady))process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url))main();
