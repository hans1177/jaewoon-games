import test from 'node:test';
import assert from 'node:assert/strict';
import {createDnaStore,recordDnaEvidence,jayApproveCompanyStandard,recomputeDnaItem} from '../tools/company-dna-learning.mjs';

function success(id,gameId,genre,conditionKey,delta=4){return{id,type:'MOTION',patternId:'heavy-hit-v1',gameId,genre,conditionKey,outcome:'SUCCESS',delta,blockers:[],verified:true,sourceRevision:`${id}-sha`,evidence:[`${id}-evidence`]};}
function failure(id,gameId){return{id,type:'GRAPHICS',patternId:'particle-overload',gameId,genre:'action',conditionKey:'MID',outcome:'FAILURE',delta:-4,blockers:['CONTROL_REGRESSION'],verified:true,sourceRevision:`${id}-sha`,evidence:[`${id}-evidence`]};}

test('single-game success is only GAME_VERIFIED',()=>{const s=createDnaStore();recordDnaEvidence(s,success('e1','P0001','survival','LOW'));const i=s.items[0];assert.equal(i.stage,'GAME_VERIFIED');assert.equal(i.summary.distinctGames,1);assert.equal(i.summary.selfPromote,false);assert.throws(()=>jayApproveCompanyStandard(s,i.key),/다중게임 검증 전/);});

test('three heterogeneous games become MULTI_GAME_VERIFIED but not standard automatically',()=>{const s=createDnaStore();recordDnaEvidence(s,success('e1','P0001','survival','LOW'));recordDnaEvidence(s,success('e2','P0003','defense','MID'));recordDnaEvidence(s,success('e3','P0006','rpg','HIGH'));const i=s.items[0];assert.equal(i.stage,'MULTI_GAME_VERIFIED');assert.equal(i.summary.multiGameEligible,true);assert.equal(i.jayApproved,false);assert.equal(i.summary.jayDecisionRequired,true);});

test('JAY approval is required for COMPANY_STANDARD',()=>{const s=createDnaStore();for(const r of [success('e1','P0001','survival','LOW'),success('e2','P0003','defense','MID'),success('e3','P0006','rpg','HIGH')])recordDnaEvidence(s,r);const i=jayApproveCompanyStandard(s,'MOTION:heavy-hit-v1','2026-09-09T00:00:00Z');assert.equal(i.stage,'COMPANY_STANDARD');assert.equal(i.jayApproved,true);});

test('duplicate evidence id is ignored',()=>{const s=createDnaStore();const e=success('e1','P0001','survival','LOW');assert.equal(recordDnaEvidence(s,e).added,true);assert.equal(recordDnaEvidence(s,e).added,false);assert.equal(s.items[0].evidence.length,1);});

test('repeated verified failures become anti-pattern',()=>{const s=createDnaStore();recordDnaEvidence(s,failure('f1','P0001'));recordDnaEvidence(s,failure('f2','P0002'));recomputeDnaItem(s.items[0],s);assert.equal(s.antiPatterns.length,1);assert.equal(s.antiPatterns[0].reason,'REPEATED_VERIFIED_FAILURE');});

test('unverified evidence is rejected',()=>{const s=createDnaStore();assert.throws(()=>recordDnaEvidence(s,{...success('e1','P0001','survival','LOW'),verified:false}),/불완전/);});
