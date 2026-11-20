import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeEvolutionEvidence } from '../tools/evolution-evidence-recorder.mjs';
import { CORE_DEPARTMENT_ROLES, ingestVerifiedDepartmentEvidence, normalizeVerifiedDepartmentLearning, selectVerifiedDepartmentLearning } from '../tools/department-learning-memory.mjs';

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


// [Vibe5.9 전문 학습] 모델 이름은 QA 증거에서만 취득하고 미승인/미검증 모델은 배정 점수에 반영하지 않는다.
test('Vibe59 independently verified specialist identity survives existing learning ledger',()=>{
  const evidence={id:'vibe59-expert-pass',type:'VIBE2',gameId:'mare-essentia',
    outcome:'SUCCESS',verified:true,independentQa:'PASS',
    sourceRevision:'1'.repeat(40),verifiedAt:'2026-11-18T06:40:00Z',
    departmentLearning:{gate:'PASS',gameId:'mare-essentia',gameSlug:'mare-essentia',
      sourcePath:'roblox-games/mare-essentia',workLane:'FULL',results:[
        resultFor('planning',{provider:'GEMINI',model:'gemini-3.5-flash-lite',
          specialistDomain:'PLANNING'}),
        resultFor('development',{provider:'GROQ',model:'openai/gpt-oss-20b',
          specialistDomain:'DEVELOPMENT'}),
        resultFor('graphics',{provider:'OPENROUTER',model:'google/gemma-4-31b-it:free',
          specialistDomain:'NPC'}),
        resultFor('qa',{provider:'OPENROUTER',model:'unknown-paid-model',
          specialistDomain:'QA'}),
        resultFor('balance')
      ]}
  };
  const rows=normalizeVerifiedDepartmentLearning(evidence);
  assert.equal(rows.length,5);
  assert.equal(rows.find(x=>x.role==='graphics').specialistDomain,'NPC');
  assert.equal(rows.find(x=>x.role==='graphics').provider,'OPENROUTER');
  assert.equal(rows.find(x=>x.role==='qa').model,null,'승인 안 된 모델의 성적은 보존하지 않는다');
  const ledger={version:1,departments:{graphics:{xp:110}},history:[]};
  assert.equal(ingestVerifiedDepartmentEvidence(ledger,evidence).added,5);
  assert.equal(ledger.departments.graphics.xp,110,'모델 성적 학습이 회사 XP를 임의로 바꾸지 않는다');
  const selected=selectVerifiedDepartmentLearning(ledger,{role:'graphics',
    gameId:'mare-essentia',sourcePath:'roblox-games/mare-essentia'},5);
  assert.equal(selected[0].model,'google/gemma-4-31b-it:free');
  assert.equal(selected[0].specialistDomain,'NPC');
  assert.equal(selected[0].verified,true);
  assert.equal(selected[0].independentQa,'PASS');
  assert.equal(normalizeVerifiedDepartmentLearning({...evidence,independentQa:'FAIL'}).length,0);
});


// [부서 전문성] 현재 목표와 연결된 독립 검증 경험만 다른 게임에서 재사용한다.
test('부서 경험은 현재 목표의 동일 주제를 먼저 검색하고 무관한 타게임 경험을 제외한다',()=>{
  const shared={verified:true,independentQa:'PASS',role:'graphics',workLane:'FULL',
    outcome:'SUCCESS',sourceRevision:'abcdef123456',verifiedAt:'2026-11-20T00:00:00Z'};
  const ledger={verifiedLearning:[
    {...shared,sourceEvidenceId:'unrelated',gameId:'P0100',gameSlug:'city-game',
      sourcePath:'web-games/city-game',summary:'상점 메뉴 버튼 재배치',nextAction:'상점 목록 정렬'},
    {...shared,sourceEvidenceId:'related',gameId:'P0200',gameSlug:'ocean-battle',
      sourcePath:'web-games/ocean-battle',summary:'선박 포격 물보라 렌더링',nextAction:'물보라 화면 효과 검증'},
    {...shared,sourceEvidenceId:'same',gameId:'P0001',gameSlug:'mare-essentia',
      sourcePath:'roblox-games/mare-essentia',summary:'선박 포격 물보라 시각효과',nextAction:'모바일 선박 물보라 확인'},
  ]};
  const selected=selectVerifiedDepartmentLearning(ledger,{
    role:'graphics',gameId:'P0001',gameSlug:'mare-essentia',
    sourcePath:'roblox-games/mare-essentia',workLane:'FULL',
    goal:'선박 포격 물보라 표현 개선',
  },4);
  assert.deepEqual(selected.map(row=>row.sourceEvidenceId),['same','related']);
  assert.ok(selected[0].relevance>selected[1].relevance);
  assert.deepEqual(selectVerifiedDepartmentLearning(ledger,{role:'qa',goal:'선박 포격 물보라 표현 개선'}),[]);
  // 이전 작업자는 목표를 전달하지 않았으므로 기존 방식의 과거 경험 조회를 유지한다.
  assert.equal(selectVerifiedDepartmentLearning(ledger,{role:'graphics'}).length,3);
});


test('현행 5개 부서는 오디오를 포함하며 기존 밸런스 기록도 보존한다',()=>{
  assert.deepEqual(CORE_DEPARTMENT_ROLES,['planning','graphics','development','qa','audio']);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-audio-learning-'));
  try{
    const candidatePath=path.join(dir,'audio-cycle.json');
    fs.writeFileSync(candidatePath,JSON.stringify(candidateEvidence({
      candidateId:'audio-verified-1',departmentCycle:{
        gameId:'mare-essentia',gameSlug:'mare-essentia',sourcePath:'roblox-games/mare-essentia',
        workLane:'FULL',finalDecision:'PROCEED',results:CORE_DEPARTMENT_ROLES.map(role=>
          resultFor(role,{provider:'GROQ',model:'openai/gpt-oss-20b',specialistDomain:role.toUpperCase(),
            summary:role==='audio'?'선박 포격 효과음 이벤트와 실제 런타임 동기화':'verified '+role})),
      }
    }),null,2));
    const output=path.join(dir,'verified-audio.json');
    const evidence=writeEvolutionEvidence(output,{
      id:'vibe2-audio-verified',type:'VIBE2',patternId:'audio-binding',
      gameId:'mare-essentia',outcome:'SUCCESS',delta:0,sourceRevision:'b'.repeat(40),
      independentQaPass:true,evidence:[candidatePath,'independent-qa-pass'],
    });
    assert.deepEqual(evidence.departmentLearning.results.map(row=>row.role),CORE_DEPARTMENT_ROLES);
    const ledger={version:1,departments:{audio:{xp:200},balance:{xp:350}},history:[]};
    const before=JSON.stringify(ledger.departments);
    assert.equal(ingestVerifiedDepartmentEvidence(ledger,evidence).added,5);
    assert.equal(ingestVerifiedDepartmentEvidence(ledger,evidence).added,0);
    assert.equal(JSON.stringify(ledger.departments),before);
    const audio=selectVerifiedDepartmentLearning(ledger,{role:'audio',gameId:'mare-essentia',
      goal:'선박 포격 효과음 동기화'},3);
    assert.equal(audio.length,1);
    assert.match(audio[0].summary,/효과음/);
    assert.equal(audio[0].specialistDomain,'AUDIO');
    assert.equal(audio[0].model,'openai/gpt-oss-20b');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('과거 밸런스 검증 기록은 그대로 학습·조회되지만 현재 오디오 부서를 대신하지 않는다',()=>{
  const legacy={id:'old-balance',type:'VIBE2',gameId:'P0001',outcome:'SUCCESS',
    verified:true,independentQa:'PASS',sourceRevision:'abc123',
    departmentLearning:{gate:'PASS',gameId:'P0001',results:roles.map(resultFor)}};
  const ledger={version:1,verifiedLearning:[]};
  assert.deepEqual(normalizeVerifiedDepartmentLearning(legacy).map(row=>row.role),roles);
  assert.equal(ingestVerifiedDepartmentEvidence(ledger,legacy).added,5);
  assert.equal(selectVerifiedDepartmentLearning(ledger,{role:'balance',gameId:'P0001'}).length,1);
  assert.deepEqual(selectVerifiedDepartmentLearning(ledger,{role:'audio',gameId:'P0001'}),[]);
});
