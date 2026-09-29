import assert from 'node:assert/strict';
import {
  createArtbookLifecycle,
  createArtbookRevisionRequest,
  resolveRequiredArtbookUpgrade,
  promoteArtbookVersion
} from '../assets/artbook-lifecycle.js';

const v1={
  id:'game-v1',version:1,label:'최초 통합 설계본',state:'DESIGN_BASELINE',
  milestone:'AI_INTEGRATED_DESIGN_BASELINE',approved:true,ref:'artbooks/game/v1.json'
};
const candidate={
  id:'game-v2',version:2,label:'개발확정 업그레이드',state:'REVISION_CANDIDATE',
  sourceVersionId:'game-v1',trigger:'DEVELOPMENT_CONFIRMED',ref:'artbooks/game/v2.json'
};

const initial=createArtbookLifecycle({gameId:'game',versions:[v1,candidate]});
assert.equal(initial.latestBaselineId,'game-v1');
assert.equal(initial.revisionAllowedAnytime,true);
assert.equal(initial.previousVersionsImmutable,true);

const required=resolveRequiredArtbookUpgrade({gameStage:'development-confirmed',currentBaselineState:'DESIGN_BASELINE'});
assert.deepEqual(required,{required:true,trigger:'DEVELOPMENT_CONFIRMED',targetState:'DEVELOPMENT_BASELINE'});

const releaseRequired=resolveRequiredArtbookUpgrade({gameStage:'release-confirmed',currentBaselineState:'DEVELOPMENT_BASELINE'});
assert.deepEqual(releaseRequired,{required:true,trigger:'RELEASE_CONFIRMED',targetState:'RELEASE_BASELINE'});

const request=createArtbookRevisionRequest({
  gameId:'game',currentBaseline:v1,trigger:'QA_DESIGN_FINDING',reason:'후반 퀘스트 인과 보완',evidence:['qa-report.json'],requestedBy:'qa'
});
assert.equal(request.type,'ARTBOOK_REVISION_REQUEST');
assert.equal(request.createsNewVersion,true);
assert.equal(request.mayEditCurrentBaseline,false);
assert.equal(request.currentBaselineId,'game-v1');

const promoted=promoteArtbookVersion({versions:[v1,candidate],candidateId:'game-v2',targetState:'DEVELOPMENT_BASELINE',approvedAt:'2026-09-09'});
assert.equal(promoted.latestBaselineId,'game-v2');
assert.equal(promoted.latestBaseline.state,'DEVELOPMENT_BASELINE');
assert.equal(promoted.versions.find(x=>x.id==='game-v1').state,'SUPERSEDED');
assert.equal(promoted.historyPreserved,true);
assert.equal(promoted.overwritePreviousVersion,false);

console.log('ARTBOOK_LIFECYCLE_TEST=PASS');
