import test from 'node:test';
import assert from 'node:assert/strict';
import { build24hAutonomousWorkOrder } from '../tools/autonomous-24h-work-planner.mjs';

const filesystem={existsSync:()=>true};

test('FAST runtime recovery preserves deterministic diagnostic scope',()=>{
  const issue={
    type:'BROKEN_LOCAL_PATH',
    severity:'high',
    file:'index.html',
    message:'존재하지 않는 로컬 경로: assets/runtime.js',
    reference:'assets/runtime.js',
    needle:'assets/runtime.js',
    relatedFiles:['index.html'],
    microTask:'index.html의 깨진 runtime 경로 1개만 복구한다.',
  };
  const portfolio={
    status:'ACTIVE',
    paidApi:false,
    maxModelCallsPerRun:2,
    maxRunnerMinutesPerRun:20,
    developmentFocusPolicy:{
      maxFocusedGames:1,
      fastLane:{reviewRoles:['development','qa'],implementationRoles:['development']},
    },
    projects:[{
      id:'P3',
      slug:'release',
      name:'Release',
      sourcePath:'web-games/release',
      profileStatus:'RELEASE_CONFIRMED',
      mode:'MAINTENANCE',
      protectedValues:['public-stable'],
    }],
  };
  const health={games:[{
    gameId:'release',
    status:'warning',
    issues:['requestfailed: http://127.0.0.1:4173/assets/runtime.js net::ERR_ABORTED'],
    healthReason:'same-origin-resource-failure',
  }]};
  const diagnostics={release:{
    version:2,
    sourcePath:'web-games/release',
    filesScanned:1,
    issues:[issue],
    counts:{critical:0,high:1,medium:0,low:0},
    topIssue:issue,
    hasActionableIssue:true,
  }};

  const order=build24hAutonomousWorkOrder({
    portfolio,
    artbooks:{artbooks:[]},
    health,
    catalog:{games:[{id:'release',homepageCategory:'release-confirmed'}]},
    diagnostics,
    queueState:{version:2,attempts:[]},
    date:'2026-09-10',
    filesystem,
  });

  assert.equal(order.selectedReason,'RUNTIME_INCIDENT_FIRST');
  assert.equal(order.workLane,'FAST');
  assert.equal(order.diagnosticTopIssue.type,'BROKEN_LOCAL_PATH');
  assert.deepEqual(order.responsibilityFiles,['index.html']);
  assert.equal(order.microTask.file,'index.html');
  assert.equal(order.microTask.goal,'index.html의 깨진 runtime 경로 1개만 복구한다.');
});
