// 파일명: tools/artbook-demo-concept-gate.mjs
// 역할: 완료 아트북 기준선과 2분류 데모 결과의 근거 기반 환류 계약을 검사한다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export const roles=['planning','graphics','development','qa','balance'];
export const axes=['characterReadability','monsterReadability','environmentFit','cameraCombatReadability','artCohesion','mobilePerformance'];
export const feedbackKeys=['DECISION','ROOT_CAUSE_CLASS','ROOT_CAUSE','EVIDENCE','UNITY_IMPLEMENTATION_NOTE','UNITY_ART_NOTE'];
export const decisions=['KEEP','CHANGE','DROP','FIX_REQUIRED'];
export const defectRootCauses=['VIBE2','ARTBOOK_GENERATION','VALIDATION_GATE','PROMPT_ASSEMBLY','DATA_BINDING','TOOL_CODE','TEST_GAP','IMPLEMENTATION_DEFECT','RUNTIME_DEFECT'];
export const dropRootCauses=['DESIGN_REDUNDANT','GOAL_CONFLICT'];

const clean=value=>String(value??'').trim();

export function validateDemoFeedback(gameId,feedback){
  if(!feedback||typeof feedback!=='object')throw new Error(`${gameId}: demo feedback missing`);
  for(const key of feedbackKeys)if(!clean(feedback[key]))throw new Error(`${gameId}: feedback ${key} missing`);
  if(!decisions.includes(feedback.DECISION))throw new Error(`${gameId}: invalid feedback decision`);
  const root=feedback.ROOT_CAUSE_CLASS;
  if(feedback.DECISION==='DROP'&&!dropRootCauses.includes(root))throw new Error(`${gameId}: DROP may only represent redundant design or goal conflict`);
  if(defectRootCauses.includes(root)&&!['CHANGE','FIX_REQUIRED'].includes(feedback.DECISION))throw new Error(`${gameId}: system or implementation defect must be CHANGE/FIX_REQUIRED`);
  if(feedback.DECISION==='FIX_REQUIRED'&&!defectRootCauses.includes(root))throw new Error(`${gameId}: FIX_REQUIRED requires a system or implementation defect root cause`);
  if(feedback.DECISION==='KEEP'&&dropRootCauses.includes(root))throw new Error(`${gameId}: KEEP conflicts with design/goal rejection root cause`);
  return true;
}

export function validateGate(gate,registry){
  if(gate?.policy?.stage!=='ARTBOOK_TO_PLAYABLE_DEMO_CONCEPT')throw new Error('demo concept stage contract missing');
  if(gate.policy.artbookIsBaseline!==true)throw new Error('artbook baseline contract missing');
  if(gate.policy.baselineResolution!=='LATEST_COMPLETED_ARTBOOK')throw new Error('latest completed artbook baseline resolution missing');
  if(JSON.stringify(gate.policy.requiredVariants)!==JSON.stringify(['A_ARTBOOK_BASELINE','B_PLAYABLE_CHALLENGER']))throw new Error('A/B demo variants changed');
  if(JSON.stringify(gate.policy.comparisonAxes)!==JSON.stringify(axes))throw new Error('demo comparison axes changed');
  if(JSON.stringify(gate.policy.departmentReviewRoles)!==JSON.stringify(roles))throw new Error('demo department review roles changed');
  if(gate.policy.directorReviewRequired!==true||gate.policy.iterationUntilPass!==true)throw new Error('demo repeat review contract missing');
  if(gate.policy.mustMeetOrExceedBaselineEveryAxis!==true||gate.policy.challengerMustBeBetterOverall!==true)throw new Error('artbook baseline quality gate weakened');
  if(gate.policy.productionBlockedUntilPass!==true||gate.policy.artbookFailureMayNotBePromoted!==true)throw new Error('production block contract missing');
  const feedbackContract=gate.policy.feedbackContract||{};
  if(JSON.stringify(feedbackContract.requiredKeys)!==JSON.stringify(feedbackKeys))throw new Error('demo feedback keys contract missing');
  if(JSON.stringify(feedbackContract.decisions)!==JSON.stringify(decisions))throw new Error('demo feedback decisions contract missing');
  if(JSON.stringify(feedbackContract.defectRootCauses)!==JSON.stringify(defectRootCauses))throw new Error('demo defect root-cause contract missing');
  if(JSON.stringify(feedbackContract.dropAllowedRootCauses)!==JSON.stringify(dropRootCauses))throw new Error('demo DROP root-cause contract missing');
  if(feedbackContract.systemDefectMayNotBeDropped!==true)throw new Error('system defect DROP protection missing');

  for(const [gameId,state] of Object.entries(gate.games||{})){
    const completed=(registry.artbooks||[])
      .filter(x=>x.gameId===gameId&&x.status==='completed-artbook'&&Array.isArray(x.cuts)&&x.cuts.length===10&&x.postprocess?.complete===true)
      .sort((a,b)=>Number(b.edition||0)-Number(a.edition||0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    if(!completed.length)throw new Error(`${gameId}: completed 10-cut artbook baseline missing`);
    if(state.productionApproval===true&&state.status!=='DEMO_CONCEPT_APPROVED')throw new Error(`${gameId}: production opened before demo approval`);
    const hasTestResult=Number(state.iteration)>0||state.feedback!=null;
    if(hasTestResult)validateDemoFeedback(gameId,state.feedback);
    if(state.status==='DEMO_CONCEPT_APPROVED'){
      if(Number(state.iteration)<1)throw new Error(`${gameId}: approved without demo iteration`);
      if(!state.selectedCharacter||!Array.isArray(state.selectedMonsters)||!state.selectedMonsters.length||!state.selectedEnvironment||!state.selectedCamera)throw new Error(`${gameId}: approved demo selections incomplete`);
      if(Object.keys(state.departmentReviews||{}).length!==roles.length)throw new Error(`${gameId}: approved without 5/5 department reviews`);
      if(!state.directorReview)throw new Error(`${gameId}: approved without director review`);
      const comparison=state.comparison||{};
      if(!axes.every(axis=>comparison?.axes?.[axis]?.notBelowBaseline===true))throw new Error(`${gameId}: approved while an axis is below artbook baseline`);
      if(comparison.challengerBetterOverall!==true)throw new Error(`${gameId}: approved challenger did not beat baseline overall`);
      if(state.feedback?.DECISION!=='KEEP'&&state.feedback?.DECISION!=='CHANGE')throw new Error(`${gameId}: approved demo requires KEEP or CHANGE feedback`);
    }else if(state.productionApproval!==false){
      throw new Error(`${gameId}: production approval must stay false before demo pass`);
    }
  }
  return true;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  validateGate(readJson('artbook-demo-concept-gate.json'),readJson('game-artbooks.json'));
  console.log('ARTBOOK_DEMO_CONCEPT_GATE=PASS');
  console.log('ARTBOOK_BASELINE=LATEST_COMPLETED_ARTBOOK');
  console.log('DEMO_ITERATION_UNTIL_PASS=YES');
  console.log('PRODUCTION_BLOCKED_UNTIL_DEMO_PASS=YES');
  console.log('DEMO_FEEDBACK_ROOT_CAUSE_GUARD=YES');
}
