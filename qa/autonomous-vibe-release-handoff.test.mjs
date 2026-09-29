import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutonomousVibeReleaseHandoff } from '../tools/autonomous-vibe-release-handoff.mjs';

const catalog={games:[
  {id:'bug-defense',homepageCategory:'development-confirmed'},
  {id:'chess-battle',homepageCategory:'release-confirmed'},
  {id:'human-go',homepageCategory:'reviewing'},
]};
const baseEvidence={
  gameId:'P0004',candidateId:'P0004-20260909-1',sourcePath:'web-games/bug-defense',departmentCycleGate:'PASS',
};

test('verified internal project id maps to catalog slug and existing Vibe manifest contract',()=>{
  const row=buildAutonomousVibeReleaseHandoff({evidence:baseEvidence,catalog,baseMainSha:'main123',promotedDevRevision:'dev456',independentQaPass:true});
  assert.equal(row.gameId,'bug-defense');
  assert.equal(row.autonomousProjectId,'P0004');
  assert.equal(row.target,'web');
  assert.equal(row.sourceRoot,'web-games/bug-defense');
  assert.equal(row.baseMainSha,'main123');
  assert.equal(row.promotedDevRevision,'dev456');
  assert.equal(row.independentQa,'PASS');
  assert.equal(row.departmentCycleGate,'PASS');
  assert.equal(row.publicMainDirectWrite,false);
  assert.match(row.taskId,/^autonomous-P0004-20260909-1$/);
});

test('handoff fails closed without department or independent QA',()=>{
  assert.throws(()=>buildAutonomousVibeReleaseHandoff({evidence:{...baseEvidence,departmentCycleGate:'FAIL'},catalog,baseMainSha:'m',promotedDevRevision:'d',independentQaPass:true}),/부서 협업/);
  assert.throws(()=>buildAutonomousVibeReleaseHandoff({evidence:baseEvidence,catalog,baseMainSha:'m',promotedDevRevision:'d',independentQaPass:false}),/독립 QA/);
});

test('reviewing game and unsupported source roots never enter automatic release',()=>{
  assert.throws(()=>buildAutonomousVibeReleaseHandoff({evidence:{...baseEvidence,sourcePath:'web-games/human-go'},catalog,baseMainSha:'m',promotedDevRevision:'d',independentQaPass:true}),/릴리즈 자동 인수인계 불가/);
  assert.throws(()=>buildAutonomousVibeReleaseHandoff({evidence:{...baseEvidence,sourcePath:'godot-games/bug-defense'},catalog,baseMainSha:'m',promotedDevRevision:'d',independentQaPass:true}),/미지원 source root/);
});
