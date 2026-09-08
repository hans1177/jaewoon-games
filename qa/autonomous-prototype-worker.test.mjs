import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrototypeRequest,validatePrototypeCandidate} from '../tools/autonomous-prototype-worker.mjs';
import {parseModelCandidate} from '../tools/autonomous-development-worker.mjs';

const request={version:1,candidateId:'NG00001',projectId:'P0010',gameId:'P0010',slug:'time-trace',name:'시간흔적',sourcePath:'web-games/time-trace',concept:{identitySentence:'흔적이 다음 지형을 만든다',coreLoop:'탐험→흔적',storyHook:'시간층',signatureSystems:['흔적'],signatureScenes:['a','b','c'],worldRules:['1','2','3','4','5'],forbiddenPatterns:['a','b','c'],prototypeHypothesis:'반복 선택 변화'},artbookId:'ab1',artbookEvidence:{id:'ab1',productionApproval:false,cuts:[],departmentOpinions:{}},goal:'10분 루프',acceptanceCriteria:['시작','완주','모바일'],candidateBranchOnly:true,publicStableWrite:false,publicRelease:false};

test('valid prototype request requires artbook and no public write',()=>{assert.equal(validatePrototypeRequest(request).pass,true);assert.equal(validatePrototypeRequest({...request,publicStableWrite:true}).pass,false);assert.equal(validatePrototypeRequest({...request,artbookEvidence:null}).pass,false);});
test('prototype candidate requires index.html',()=>{const candidate=parseModelCandidate(JSON.stringify({files:[{path:'game.js',content:'console.log(1)'}]}));assert.equal(validatePrototypeCandidate(candidate).pass,false);});
test('first prototype forbids persistent storage',()=>{const candidate=parseModelCandidate(JSON.stringify({files:[{path:'index.html',content:'<script>localStorage.setItem("x","1")</script>'}]}));const v=validatePrototypeCandidate(candidate);assert.equal(v.pass,false);assert.ok(v.errors.some(x=>x.includes('PERSISTENT_STORAGE_FORBIDDEN')));});
test('small self-contained prototype is allowed',()=>{const candidate=parseModelCandidate(JSON.stringify({summary:'x',files:[{path:'index.html',content:'<!doctype html><button id="b">시작</button>'},{path:'game.js',content:'document.querySelector("#b").onclick=()=>{};'}]}));assert.equal(validatePrototypeCandidate(candidate).pass,true);});
test('paid key patterns are blocked',()=>{const candidate=parseModelCandidate(JSON.stringify({files:[{path:'index.html',content:'OPENAI_API_KEY="secret"'}]}));assert.equal(validatePrototypeCandidate(candidate).pass,false);});
