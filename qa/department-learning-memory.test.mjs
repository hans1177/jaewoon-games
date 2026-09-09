import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeEvolutionEvidence } from '../tools/evolution-evidence-recorder.mjs';
import { ingestVerifiedDepartmentEvidence, normalizeVerifiedDepartmentLearning, selectVerifiedDepartmentLearning } from '../tools/department-learning-memory.mjs';

const roles=['planning','development','graphics','qa','balance'];
const resultFor=(role,extra={})=>({role,workState:'DONE',decision:'PROCEED',summary:`${role} summary`,nextAction:`${role} action`,checks:[`${role} check`],risks:[],...extra});

function candidateEvidence(overrides={}){
  return {
    version:4,
    candidateId:'P0002-20260910-1',
    gameId:'P0002',
    gameSlug:'insect-survival',
    sourcePath:'web-games/insect-survival',
    departmentCycleGate:'PASS',
    departmentCycle:{
      gameId:'P0002',gameSlug:'insect-survival',candidateId:'P0002-20260910-1',sourcePath:'web-games/insect-survival',workLane:'FULL',finalDecision:'PROCEED',
      results:[...roles.map(resultFor),resultFor('planning-final')]
    },
    ...overrides
  };
}

test('verified VIBE2 evidence retains compact five-department cycle and memory does not mutate XP',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-department-learning-'));
  const candidatePath=path.join(dir,'candidate.json');
  const outputPath=path.join(dir,'verified.json');
  fs.writeFileSync(candidatePath,JSON.stringify(candidateEvidence(),null,2));
  const verified=writeEvolutionEvidence(outputPath,{
    id:'vibe2-P0002-20260910-1',type:'VIBE2',patternId:'autonomous-candidate-safe-promotion',title:'verified candidate',gameId:'P0002',conditionKey:'AUTONOMOUS_DEV',outcome:'SUCCESS',delta:0,sourceRevision:'abc123',independentQaPass:true,evidence:[candidatePath,'independent-candidate-browser-qa','vibe-regression'],verifiedAt:'2026-09-10T00:00:00.000Z'
  });
  assert.equal(verified.departmentLearning.gate,'PASS');
  assert.deepEqual(verified.departmentLearning.results.map(row=>row.role),roles);
  assert.equal(verified.departmentLearning.results[0].summary,'planning summary');

  const ledger={version:1,departments:{planning:{xp:320,level:3},development:{xp:6520,level:10}},history:[{type:'verified-qa-pass'}]};
  const departmentsBefore=JSON.stringify(ledger.departments),historyBefore=JSON.stringify(ledger.history);
  const first=ingestVerifiedDepartmentEvidence(ledger,verified);
  assert.equal(first.added,5);
  assert.equal(JSON.stringify(ledger.departments),departmentsBefore);
  assert.equal(JSON.stringify(ledger.history),historyBefore);
  assert.equal(ingestVerifiedDepartmentEvidence(ledger,verified).added,0);

  const planning=selectVerifiedDepartmentLearning(ledger,{role:'planning',gameId:'P0002',gameSlug:'insect-survival',sourcePath:'web-games/insect-survival',workLane:'FULL'},3);
  assert.equal(planning.length,1);
  assert.equal(planning[0].summary,'planning summary');
  assert.equal(planning[0].relevance,20);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('unverified evidence is rejected and FAST skipped departments are not learned',()=>{
  const base={
    id:'vibe2-fast',type:'VIBE2',gameId:'P0004',outcome:'SUCCESS',verified:true,independentQa:'PASS',sourceRevision:'def456',verifiedAt:'2026-09-10T01:00:00.000Z',
    departmentLearning:{version:1,gate:'PASS',candidateId:'fast-1',gameId:'P0004',gameSlug:'bug-defense',sourcePath:'web-games/bug-defense',workLane:'FAST',finalDecision:'PROCEED',results:roles.map(role=>resultFor(role,{skippedFast:!['development','qa'].includes(role)}))}
  };
  assert.equal(normalizeVerifiedDepartmentLearning({...base,verified:false}).length,0);
  const rows=normalizeVerifiedDepartmentLearning(base);
  assert.deepEqual(rows.map(row=>row.role),['development','qa']);
  const ledger={version:1,departments:{development:{xp:100}},history:[]};
  assert.equal(ingestVerifiedDepartmentEvidence(ledger,base).added,2);
  assert.equal(ledger.departments.development.xp,100);
});

test('verified failure learning is retained as evidence without awarding XP',()=>{
  const failure={
    id:'vibe2-failure',type:'VIBE2',gameId:'P0003',outcome:'FAILURE',verified:true,independentQa:'PASS',sourceRevision:'failed123',verifiedAt:'2026-09-10T02:00:00.000Z',
    departmentLearning:{version:1,gate:'PASS',candidateId:'failed-1',gameId:'P0003',gameSlug:'crystal-defense',sourcePath:'web-games/crystal-defense',workLane:'FULL',finalDecision:'ADJUST',results:roles.map(role=>resultFor(role,{decision:role==='qa'?'ADJUST':'PROCEED',risks:role==='qa'?['mobile regression']:[]}))}
  };
  const ledger={version:1,departments:{qa:{xp:2040}},history:[]};
  assert.equal(ingestVerifiedDepartmentEvidence(ledger,failure).added,5);
  const qa=selectVerifiedDepartmentLearning(ledger,{role:'qa',gameId:'P0003',sourcePath:'web-games/crystal-defense',workLane:'FULL'},2);
  assert.equal(qa[0].outcome,'FAILURE');
  assert.deepEqual(qa[0].risks,['mobile regression']);
  assert.equal(ledger.departments.qa.xp,2040);
});
