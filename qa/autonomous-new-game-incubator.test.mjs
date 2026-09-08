import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrototypeRequest,
  createOperationalCandidate,
  detectCompletedIncubatorArtbook,
  enqueueOperationalArtbook,
  nextPortfolioProjectId,
  registerPrototypeAfterArtbook,
  validateOperationalConcept,
} from '../tools/autonomous-new-game-incubator.mjs';

const concept={name:'시간흔적 원정대',slug:'time-trace-expedition',identitySentence:'시간흔적이 다음 원정 지형을 만든다.',coreLoop:'탐험→전투→흔적→다음 지형',storyHook:'붕괴한 시간층 복구',signatureSystems:['시간흔적'],signatureScenes:['첫 흔적','도시 붕괴','최종 복구'],worldRules:['r1','r2','r3','r4','r5'],forbiddenPatterns:['색놀이','왕복','숫자보스'],prototypeHypothesis:'흔적이 반복 선택을 바꾸면 재도전이 의미 있다.',risks:['설명 복잡','성능'],styleProfile:'시간 탐험기 + 흔적 지도첩'};
const portfolio=()=>({version:1,projects:[{id:'P0009',slug:'monster-adventure',name:'몬스터 어드벤처'}]});
const state=()=>({version:1,status:'ACTIVE',nextCandidateNumber:1,candidates:[]});

test('concept contract and P0010 reservation',()=>{assert.equal(validateOperationalConcept(concept).pass,true);assert.equal(nextPortfolioProjectId(portfolio()),'P0010');const c=createOperationalCandidate(state(),portfolio(),concept);assert.equal(c.reservedProjectId,'P0010');assert.equal(c.status,'CONCEPT_CREATED');});
test('only one operational candidate at a time',()=>{const s=state(),p=portfolio();createOperationalCandidate(s,p,concept);assert.throws(()=>createOperationalCandidate(s,p,{...concept,name:'다른 게임',slug:'other'}),/동시 신규게임 후보/);});
test('candidate enters existing artbook queue without production approval',()=>{const c=createOperationalCandidate(state(),portfolio(),concept),q={games:[],queueOrder:['survival'],currentDailyTarget:'survival'};enqueueOperationalArtbook(c,q);assert.equal(c.status,'ARTBOOK_QUEUED');assert.equal(q.queueOrder[1],c.artbookGameId);const g=q.games[0];assert.equal(g.source,'INCUBATOR_METADATA_ONLY');assert.equal(g.formalProductionAllowed,false);assert.equal(g.incubatorConcept.identitySentence,concept.identitySentence);});
test('incomplete artbook cannot materialize P0010',()=>{const c=createOperationalCandidate(state(),portfolio(),concept);c.status='ARTBOOK_QUEUED';assert.equal(detectCompletedIncubatorArtbook(c,{artbooks:[]}).complete,false);const p=portfolio();const r=registerPrototypeAfterArtbook(c,p,{artbooks:[]});assert.equal(r.registered,false);assert.equal(p.projects.length,1);});
test('5-department completed artbook materializes prototype registration only',()=>{const c=createOperationalCandidate(state(),portfolio(),concept);c.status='ARTBOOK_QUEUED';const opinions=Object.fromEntries(['planning','graphics','development','qa','balance'].map(role=>[role,{reviewsReceived:5}]));const registry={artbooks:[{id:'ab1',gameId:c.artbookGameId,status:'completed-artbook',productionApproval:false,cuts:Array.from({length:10},(_,i)=>({no:i+1})),departmentOpinions:opinions,collaboration:{allFiveDepartmentsReviewed:true},sourceFile:'artbook.json'}]};const p=portfolio();const r=registerPrototypeAfterArtbook(c,p,registry,'2026-09-09T00:00:00Z');assert.equal(r.registered,true);assert.equal(p.projects.at(-1).id,'P0010');assert.equal(p.projects.at(-1).mode,'PROTOTYPE');assert.equal(p.projects.at(-1).publicReleaseApproved,false);const request=buildPrototypeRequest(c,p);assert.equal(request.candidateBranchOnly,true);assert.equal(request.publicStableWrite,false);});
test('production-approved flag is not accepted as incubator evidence',()=>{const c=createOperationalCandidate(state(),portfolio(),concept);c.status='ARTBOOK_QUEUED';const registry={artbooks:[{id:'ab1',gameId:c.artbookGameId,status:'completed-artbook',productionApproval:true,cuts:Array(10).fill({}),departmentOpinions:{},collaboration:{allFiveDepartmentsReviewed:true}}]};assert.equal(detectCompletedIncubatorArtbook(c,registry).complete,false);});
