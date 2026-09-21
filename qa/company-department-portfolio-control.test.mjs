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
