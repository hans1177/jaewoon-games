// 파일명: qa/company-dna-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDnaStore,recordDnaEvidence,jayApproveCompanyStandard,recomputeDnaItem,validateDnaEvidence} from '../tools/company-dna-learning.mjs';

function success(id,gameId,genre,conditionKey,delta=4){return{id,type:'MOTION',patternId:'heavy-hit-v1',gameId,genre,conditionKey,outcome:'SUCCESS',delta,blockers:[],verified:true,sourceRevision:`${id}-sha`,evidence:[`${id}-evidence`]};}
function failure(id,gameId){return{id,type:'GRAPHICS',patternId:'particle-overload',gameId,genre:'action',conditionKey:'MID',outcome:'FAILURE',delta:-4,blockers:['CONTROL_REGRESSION'],verified:true,sourceRevision:`${id}-sha`,evidence:[`${id}-evidence`]};}
function vibe2PostRelease(id='v1'){return{id,type:'VIBE2',patternId:'public-release-health-verified',gameId:'P0009',genre:'rpg',conditionKey:'POST_RELEASE_PUBLIC_HEALTH',outcome:'SUCCESS',delta:4,blockers:[],verified:true,sourceRevision:`${id}-sha`,evidence:['release-task-123','public-game-health.json','company-qa-runtime-evidence.json']};}

test('single-game success is only GAME_VERIFIED',()=>{const s=createDnaStore();recordDnaEvidence(s,success('e1','P0001','survival','LOW'));const i=s.items[0];assert.equal(i.stage,'GAME_VERIFIED');assert.equal(i.summary.distinctGames,1);assert.equal(i.summary.selfPromote,false);assert.throws(()=>jayApproveCompanyStandard(s,i.key),/다중게임 검증 전/);});

test('three heterogeneous games become MULTI_GAME_VERIFIED but not standard automatically',()=>{const s=createDnaStore();recordDnaEvidence(s,success('e1','P0001','survival','LOW'));recordDnaEvidence(s,success('e2','P0003','defense','MID'));recordDnaEvidence(s,success('e3','P0006','rpg','HIGH'));const i=s.items[0];assert.equal(i.stage,'MULTI_GAME_VERIFIED');assert.equal(i.summary.multiGameEligible,true);assert.equal(i.jayApproved,false);assert.equal(i.summary.jayDecisionRequired,true);});

test('JAY approval is required for COMPANY_STANDARD',()=>{const s=createDnaStore();for(const r of [success('e1','P0001','survival','LOW'),success('e2','P0003','defense','MID'),success('e3','P0006','rpg','HIGH')])recordDnaEvidence(s,r);const i=jayApproveCompanyStandard(s,'MOTION:heavy-hit-v1','2026-09-09T00:00:00Z');assert.equal(i.stage,'COMPANY_STANDARD');assert.equal(i.jayApproved,true);});

test('duplicate evidence id is ignored',()=>{const s=createDnaStore();const e=success('e1','P0001','survival','LOW');assert.equal(recordDnaEvidence(s,e).added,true);assert.equal(recordDnaEvidence(s,e).added,false);assert.equal(s.items[0].evidence.length,1);});

test('repeated verified failures become anti-pattern',()=>{const s=createDnaStore();recordDnaEvidence(s,failure('f1','P0001'));recordDnaEvidence(s,failure('f2','P0002'));recomputeDnaItem(s.items[0],s);assert.equal(s.antiPatterns.length,1);assert.equal(s.antiPatterns[0].reason,'REPEATED_VERIFIED_FAILURE');});

test('unverified evidence is rejected',()=>{const s=createDnaStore();assert.throws(()=>recordDnaEvidence(s,{...success('e1','P0001','survival','LOW'),verified:false}),/불완전/);});

test('Vibe2 positive requires post-release release runtime and QA binding',()=>{
  assert.equal(validateDnaEvidence(vibe2PostRelease()).pass,true);
  const preRelease={...vibe2PostRelease('pre'),patternId:'autonomous-candidate-safe-promotion',conditionKey:'AUTONOMOUS_DEV',evidence:['candidate-commit','independent-candidate-browser-qa','vibe-regression']};
  const checked=validateDnaEvidence(preRelease);
  assert.equal(checked.pass,false);
  assert.ok(checked.missing.includes('complete-vibe2-positive-trace'));
});

test('legacy pre-release Vibe2 success already in DNA no longer counts as positive',()=>{
  const s=createDnaStore();
  s.items.push({key:'VIBE2:autonomous-candidate-safe-promotion',type:'VIBE2',patternId:'autonomous-candidate-safe-promotion',stage:'GAME_VERIFIED',jayApproved:false,evidence:[{id:'old-v1',gameId:'P0009',genre:'rpg',conditionKey:'AUTONOMOUS_DEV',outcome:'SUCCESS',delta:4,blockers:[],sourceRevision:'old-sha',evidence:['independent-candidate-browser-qa','vibe-regression']} ]});
  recomputeDnaItem(s.items[0],s);
  assert.equal(s.items[0].stage,'EXPERIMENTING');
  assert.equal(s.items[0].summary.successEvidence,0);
  assert.equal(s.items[0].summary.incompletePositiveEvidence,1);
});

// [학습 CI 회귀] 기존 검증 단계는 유지하고 대용량 저장소 전체 이력 다운로드만 피한다.
test('Company DNA 학습 검사는 담당 영역만 얕게 체크아웃하고 기존 QA 단계는 보존한다',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-dna-learning.yml',import.meta.url),'utf8');
  assert.match(workflow,/fetch-depth: 1/);
  assert.doesNotMatch(workflow,/fetch-depth: 0/);
  assert.match(workflow,/sparse-checkout:[\s\S]*?tools\n\s+qa\n\s+assets\n\s+company-learning/);
  assert.match(workflow,/node --test qa\/department-learning-memory\.test\.mjs/);
  assert.match(workflow,/node tools\/department-learning-memory\.mjs/);
  assert.match(workflow,/Guard company-standard authority/);
});
