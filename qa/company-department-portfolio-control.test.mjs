import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePortfolio,applyPortfolioDecisions} from '../tools/company-department-portfolio-control.mjs';

const catalog={games:[
 {id:'fast',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
 {id:'repair',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
 {id:'redesign',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}
]};
test('department portfolio decisions prioritize progress and escalate repeated blockers',()=>{
 const vibe={tasks:[
  {id:'f1',gameId:'fast',status:'done',department:'development',type:'implementation'},
  {id:'f2',gameId:'fast',status:'queued',department:'development',type:'implementation',priority:'normal'},
  {id:'r1',gameId:'repair',status:'failed',department:'development',type:'implementation',blocker:'FATAL_RUNTIME_BUG',retries:1},
  {id:'d1',gameId:'redesign',status:'failed',department:'development',type:'implementation',blocker:'CORE_FUN_WEAK repeated attempt 3',retries:3}
 ]};
 const ds=evaluatePortfolio({catalog,vibeQueue:vibe,developmentQueue:{items:[]}});
 assert.equal(ds.find(x=>x.gameId==='fast').decision,'ACCELERATE');
 assert.equal(ds.find(x=>x.gameId==='repair').decision,'FOCUSED_REPAIR');
 assert.equal(ds.find(x=>x.gameId==='redesign').decision,'REDESIGN');
 const next=applyPortfolioDecisions(vibe,ds);
 assert.equal(next.tasks.find(x=>x.id==='f2').priority,'critical');
 assert.equal(next.tasks.find(x=>x.id==='d1').portfolioDecision,'REDESIGN');
});
test('pause cancels queued work but never deletes game evidence',()=>{
 const vibe={tasks:[{id:'x',gameId:'g',status:'queued',department:'development',type:'implementation',evidence:['keep-me']}]};
 const next=applyPortfolioDecisions(vibe,[{gameId:'g',decision:'PAUSE',reason:'TEST'}]);
 const row=next.tasks[0];
 assert.equal(row.status,'cancelled');
 assert.equal(row.blocker,'portfolio-pause');
 assert.ok(row.evidence.includes('keep-me'));
});

// [정식 부서 증거] 기존 판단과 게임 상태는 유지하고 역할별 근거만 분리한다.
test('portfolio carries five department evidence surfaces and preserves legacy vote history without approval',()=>{
 const previous={decisions:[{gameId:'fast',decision:'CONTINUE',
   evidence:{balance:{structuralCoreFailure:true,recordId:'legacy-bal-001'},graphicsAudio:{state:'LEGACY_REVIEW'}},
   historicalDepartmentEvidence:{balanceArchive:{recordId:'past-002'}}}]};
 const current=evaluatePortfolio({catalog,vibeQueue:{tasks:[]},developmentQueue:{items:[]},previous});
 const game=current.find(x=>x.gameId==='fast');
 assert.equal(game.decision,'CONTINUE');
 assert.deepEqual(Object.keys(game.evidence).sort(),['planningGrowthMarketing','planning','graphics','development','qa','audio'].sort());
 assert.equal(game.evidence.planning.balanceEconomyAndRewardPreservationRequired,true);
 assert.equal(game.evidence.qa.balanceAndSaveRegressionRequired,true);
 assert.equal(game.evidence.audio.state,'UNVERIFIED_NOT_NEGATIVE');
 assert.equal(game.evidence.audio.actualPlaybackEvidenceRequiredForAudioChanges,true);
 assert.equal(game.historicalDepartmentEvidence.balance.recordId,'legacy-bal-001');
 assert.equal(game.historicalDepartmentEvidence.balanceArchive.recordId,'past-002');
 assert.equal(game.historicalDepartmentEvidence.graphicsAudio.state,'LEGACY_REVIEW');
 assert.equal(game.evidence.balance,undefined);
 assert.equal(game.evidence.graphicsAudio,undefined);
 const replay=evaluatePortfolio({catalog,vibeQueue:{tasks:[]},previous:{decisions:current}});
 const replayed=replay.find(x=>x.gameId==='fast');
 assert.equal(replayed.historicalDepartmentEvidence.balance.recordId,'legacy-bal-001');
 assert.equal(replayed.evidence.audio.state,'UNVERIFIED_NOT_NEGATIVE');
});
