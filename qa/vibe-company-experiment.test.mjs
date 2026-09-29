import assert from 'node:assert/strict';
import {
  auditBossDesign,auditVibeIdentity,classifyPlayLogSignals,classifyVibeCompanyRisk,
  createDepartmentPredictionRecord,createVibeCompanyExperimentPlan,createVibeExperimentBundle,
  createVibeGameProfile,createVibeLearningRecord,evaluateMidgameCollapse,evaluateVibeABResult
} from '../assets/vibe-company-experiment.js';

const pass=n=>console.log(`PASS ${n}`);
const profile=createVibeGameProfile({
  gameId:'P0001',gameName:'나의 생존기',repository:'hans1177/jaewoon-games',path:'web-games/survival',
  saveKeys:['jaewoon-survival-v1'],protectedValues:['hp','damage'],coreSystems:['survival-loop'],protectedFiles:['index.html'],
  mobileTargets:['360x800','390x844'],performanceTargets:{fps:55,maxFrameMs:22},status:'ACTIVE'
});
assert.equal(profile.valid,true);pass('game profile');

assert.equal(classifyVibeCompanyRisk({motionEngineChange:true}).risk,'NORMAL');
assert.equal(classifyVibeCompanyRisk({saveSchemaChange:true}).risk,'MAJOR');pass('risk classification');

const bundle=createVibeExperimentBundle({
  profile,baselineRef:'main@A',candidateRef:'dev@B',safeImprovements:['UI 가독성','피격 피드백'],riskyIdeas:['생태 흔적'],
  conditions:{device:'Android mid',resolution:'390x844',playtime:'10m',segment:'first-night',input:'touch'},expected:{fun:'+2'}
});
assert.equal(bundle.ready,true);assert.equal(bundle.stableAProtected,true);pass('safe2 risky1 A/B bundle');

const ab=evaluateVibeABResult({baselineScore:78,candidateScore:84,categoryDeltas:{visual:2,feel:1},regressions:[]});
assert.equal(ab.verdict,'ADOPT');assert.equal(ab.companyGateStillRequired,true);pass('A/B result');

const mid=evaluateMidgameCollapse({
  progress30:{repetition:20,storyStall:10,growthStall:10,contentDepletion:10,difficultySpike:20,rewardMeaninglessness:10,noveltyShortage:20},
  progress50:{repetition:35,storyStall:25,growthStall:20,contentDepletion:30,difficultySpike:20,rewardMeaninglessness:20,noveltyShortage:30},
  progress70:{repetition:40,storyStall:30,growthStall:30,contentDepletion:35,difficultySpike:25,rewardMeaninglessness:30,noveltyShortage:35}
});
assert.equal(mid.pass,true);pass('midgame collapse');

const identity=auditVibeIdentity({identitySentence:'이 게임은 생태 흔적 때문에 다른 게임과 다르다.',signatureSystems:['생태 흔적'],signatureScenes:['첫 밤','생태 변화','거점 붕괴'],coreLoop:'채집 생태 반응 생존',otherGames:[{gameId:'P0002',coreLoop:'곤충 전투 장비 제작'}]});
assert.equal(identity.pass,true);pass('identity audit');

assert.equal(auditBossDesign({testAbility:'위치선정',features:['unique-pattern','space-use'],hpMultiplierOnly:false}).pass,true);pass('boss audit');
assert.equal(classifyPlayLogSignals({earlyExitRate:.4,uiMisclickRate:.2}).needsReview,true);pass('play log signals');

const learning=createVibeLearningRecord({gameId:'P0001',ideaId:'I1',department:'PIXEL',expected:'가독성 상승',actual:'가독성 +2',verdict:'ADOPT',evidence:['ab-1']});
assert.equal(learning.knowledgeState,'VERIFIED');pass('learning record');
const prediction=createDepartmentPredictionRecord({department:'CHECK',domain:'performance',gameId:'P0001',prediction:'프레임 저하',predictedDelta:-4,actualDelta:-3});
assert.equal(prediction.directionCorrect,true);pass('prediction evidence');

const plan=createVibeCompanyExperimentPlan({
  profile,
  identity:{identitySentence:'이 게임은 생태 흔적 때문에 다른 게임과 다르다.',signatureSystems:['생태 흔적'],signatureScenes:['첫 밤','생태 변화','거점 붕괴'],coreLoop:'생태 반응 생존',otherGames:[]},
  experiment:{baselineRef:'A',candidateRef:'B',safeImprovements:['UI','피격'],riskyIdeas:['생태 흔적'],conditions:{device:'Android',resolution:'390x844',playtime:'10m',segment:'first-night',input:'touch'}}
});
assert.equal(plan.ready,true);assert.equal(plan.jayGateRequired,true);pass('company experiment plan');
