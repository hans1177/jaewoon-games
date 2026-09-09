import test from 'node:test';
import assert from 'node:assert/strict';
import { selectContinuousTarget } from '../tools/autonomous-24h-work-planner.mjs';

const filesystem={existsSync:()=>true};
const portfolio={projects:[
  {id:'P1',slug:'a',sourcePath:'web-games/a',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE'},
  {id:'P2',slug:'b',sourcePath:'web-games/b',profileStatus:'NEEDS_AUDIT',mode:'EXPERIMENT_ONLY'},
  {id:'P3',slug:'release',sourcePath:'web-games/release',profileStatus:'RELEASE_CONFIRMED',mode:'MAINTENANCE'},
]};
const artbooks={artbooks:[
  {id:'a1',gameId:'a',createdAt:'2026-09-09T01:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'b1',gameId:'b',createdAt:'2026-09-09T02:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
  {id:'r1',gameId:'release',createdAt:'2026-09-09T03:00:00Z',status:'completed-artbook',lifecycle:{state:'DESIGN_BASELINE'}},
]};
const catalog={games:[
  {id:'a',homepageCategory:'development-confirmed'},
  {id:'b',homepageCategory:'reviewing'},
  {id:'release',homepageCategory:'release-confirmed'},
]};

test('24h target rotates toward the completed artbook with fewer floors today',()=>{
  const queueState={version:1,attempts:[
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P1'},
    {date:'2026-09-09',gameId:'P2'},
  ]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',filesystem});
  assert.equal(target.project.id,'P2');
  assert.equal(target.attemptsToday,1);
});

test('newly completed artbook priority handoff overrides round-robin selection',()=>{
  const queueState={version:1,attempts:[{date:'2026-09-09',gameId:'P2'}]};
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date:'2026-09-09',priorityGameId:'a',filesystem});
  assert.equal(target.project.id,'P1');
  assert.equal(target.explicitPriority,true);
});

test('release-confirmed stable game is not fed into arbitrary 24h feature development',()=>{
  const target=selectContinuousTarget({portfolio:{projects:[portfolio.projects[2]]},artbooks,catalog,queueState:{version:1,attempts:[]},date:'2026-09-09',filesystem});
  assert.equal(target,null);
});
