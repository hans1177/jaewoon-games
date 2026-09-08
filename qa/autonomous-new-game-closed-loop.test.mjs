import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPrototypeRequest,
  createOperationalCandidate,
  enqueueOperationalArtbook,
  registerPrototypeAfterArtbook,
} from '../tools/autonomous-new-game-incubator.mjs';
import {generatePrototypeCandidate} from '../tools/autonomous-prototype-worker.mjs';
import {reviewAutonomousCandidate} from '../tools/autonomous-candidate-review.mjs';
import {applyVerifiedPrototypePromotion} from '../tools/incubator-promotion-state.mjs';

const concept={
  name:'시간흔적 원정대',slug:'time-trace-expedition',identitySentence:'시간흔적이 다음 원정 지형을 만든다.',
  coreLoop:'탐험→전투→흔적→다음 지형',storyHook:'붕괴한 시간층을 복구한다.',signatureSystems:['시간흔적 지형'],
  signatureScenes:['첫 흔적','도시 붕괴','최종 복구'],worldRules:['흔적 유지','죽음이 흔적 생성','보스가 흔적 왜곡','마을 복구','시간층별 규칙'],
  forbiddenPatterns:['색만 다른 적','무의미 왕복','숫자만 큰 보스'],prototypeHypothesis:'흔적이 다음 선택을 바꾸면 재도전이 의미 있다.',
  risks:['규칙 설명 복잡','누적 성능'],styleProfile:'시간 탐험기 + 흔적 지도첩'
};

function completedArtbook(gameId){
  const opinions=Object.fromEntries(['planning','graphics','development','qa','balance'].map(role=>[role,{reviewsReceived:5,averageStars:4.4,priorityImprovement:`${role} 검증`,readiness:'READY'}]));
  return {id:'ab-p0010',gameId,status:'completed-artbook',productionApproval:false,cuts:Array.from({length:10},(_,i)=>({no:i+1,title:`cut${i+1}`,body:'검증 근거'})),departmentOpinions:opinions,collaboration:{allFiveDepartmentsReviewed:true},sourceFile:'artbook.json'};
}

test('concept -> artbook -> P0010 -> prototype candidate -> independent QA -> dev verified metadata',async()=>{
  const state={version:1,status:'ACTIVE',nextCandidateNumber:1,candidates:[]};
  const portfolio={version:1,fixedProjectCount:false,projects:[{id:'P0009',slug:'monster-adventure',name:'몬스터 어드벤처'}]};
  const queue={games:[],queueOrder:['monster-adventure'],currentDailyTarget:'monster-adventure'};
  const candidate=createOperationalCandidate(state,portfolio,concept,'2026-09-09T00:00:00Z');
  assert.equal(candidate.reservedProjectId,'P0010');
  enqueueOperationalArtbook(candidate,queue,'2026-09-09T00:01:00Z');
  assert.equal(candidate.status,'ARTBOOK_QUEUED');

  const registry={artbooks:[completedArtbook(candidate.artbookGameId)]};
  const registration=registerPrototypeAfterArtbook(candidate,portfolio,registry,'2026-09-09T00:02:00Z');
  assert.equal(registration.registered,true);
  assert.equal(candidate.status,'PROTOTYPE_REGISTERED');
  const request=buildPrototypeRequest(candidate,portfolio,registry);
  assert.equal(request.projectId,'P0010');
  assert.equal(request.publicStableWrite,false);

  const original=process.cwd();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-new-game-loop-'));
  try{
    process.chdir(temp);
    const modelResponse=JSON.stringify({summary:'10분 핵심루프 프로토타입',expectedEffect:'대표 시스템 체감',tests:['시작','한 루프'],files:[
      {path:'index.html',content:'<!doctype html><meta name="viewport" content="width=device-width"><button id="start">원정 시작</button><script src="game.js"></script>'},
      {path:'game.js',content:'document.querySelector("#start").addEventListener("click",()=>{document.body.dataset.loop="trace-created";});'}
    ]});
    const evidence=await generatePrototypeCandidate({request,modelResponse,candidateId:'prototype-NG00001-dryrun'});
    evidence.sourceCommit='dev-before';
    assert.equal(evidence.newProject,true);
    assert.equal(fs.existsSync(request.sourcePath),false,'public/stable source path must not be created by candidate generation');
    assert.equal(fs.existsSync(evidence.candidatePath),true);
    const review=reviewAutonomousCandidate({evidence,expectedSourceCommit:'dev-before'});
    assert.equal(review.pass,true,review.blockers?.join(','));

    const completed=applyVerifiedPrototypePromotion({state,portfolio,evidence,devRevision:'dev-after',timestamp:'2026-09-09T00:03:00Z'});
    assert.equal(completed.changed,true);
    assert.equal(candidate.status,'PROTOTYPE_DEV_VERIFIED');
    assert.equal(candidate.prototypeDevComplete,true);
    const p=portfolio.projects.find(x=>x.id==='P0010');
    assert.equal(p.profileStatus,'PROTOTYPE_DEV_VERIFIED');
    assert.equal(p.mode,'EXPERIMENT_ONLY');
    assert.equal(p.publicReleaseApproved,false);
  }finally{
    process.chdir(original);
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
