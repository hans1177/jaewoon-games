// 파일명: tools/artbook-demo-concept-gate.mjs
// 역할: 완료 아트북을 기준선으로 삼아 시연 컨셉이 본개발 전에 반복 검증되도록 계약을 검사한다.
import fs from 'node:fs';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const gate=readJson('artbook-demo-concept-gate.json');
const registry=readJson('game-artbooks.json');
const roles=['planning','graphics','development','qa','balance'];
const axes=['characterReadability','monsterReadability','environmentFit','cameraCombatReadability','artCohesion','mobilePerformance'];

if(gate?.policy?.stage!=='ARTBOOK_TO_PLAYABLE_DEMO_CONCEPT')throw new Error('demo concept stage contract missing');
if(gate.policy.artbookIsBaseline!==true)throw new Error('artbook baseline contract missing');
if(gate.policy.baselineResolution!=='LATEST_COMPLETED_ARTBOOK')throw new Error('latest completed artbook baseline resolution missing');
if(JSON.stringify(gate.policy.requiredVariants)!==JSON.stringify(['A_ARTBOOK_BASELINE','B_PLAYABLE_CHALLENGER']))throw new Error('A/B demo variants changed');
if(JSON.stringify(gate.policy.comparisonAxes)!==JSON.stringify(axes))throw new Error('demo comparison axes changed');
if(JSON.stringify(gate.policy.departmentReviewRoles)!==JSON.stringify(roles))throw new Error('demo department review roles changed');
if(gate.policy.directorReviewRequired!==true||gate.policy.iterationUntilPass!==true)throw new Error('demo repeat review contract missing');
if(gate.policy.mustMeetOrExceedBaselineEveryAxis!==true||gate.policy.challengerMustBeBetterOverall!==true)throw new Error('artbook baseline quality gate weakened');
if(gate.policy.productionBlockedUntilPass!==true||gate.policy.artbookFailureMayNotBePromoted!==true)throw new Error('production block contract missing');

for(const [gameId,state] of Object.entries(gate.games||{})){
  const completed=(registry.artbooks||[])
    .filter(x=>x.gameId===gameId&&x.status==='completed-artbook'&&Array.isArray(x.cuts)&&x.cuts.length===10&&x.postprocess?.complete===true)
    .sort((a,b)=>Number(b.edition||0)-Number(a.edition||0)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  if(!completed.length)throw new Error(`${gameId}: completed 10-cut artbook baseline missing`);
  if(state.productionApproval===true&&state.status!=='DEMO_CONCEPT_APPROVED')throw new Error(`${gameId}: production opened before demo approval`);
  if(state.status==='DEMO_CONCEPT_APPROVED'){
    if(Number(state.iteration)<1)throw new Error(`${gameId}: approved without demo iteration`);
    if(!state.selectedCharacter||!Array.isArray(state.selectedMonsters)||!state.selectedMonsters.length||!state.selectedEnvironment||!state.selectedCamera)throw new Error(`${gameId}: approved demo selections incomplete`);
    if(Object.keys(state.departmentReviews||{}).length!==roles.length)throw new Error(`${gameId}: approved without 5/5 department reviews`);
    if(!state.directorReview)throw new Error(`${gameId}: approved without director review`);
    const comparison=state.comparison||{};
    if(!axes.every(axis=>comparison?.axes?.[axis]?.notBelowBaseline===true))throw new Error(`${gameId}: approved while an axis is below artbook baseline`);
    if(comparison.challengerBetterOverall!==true)throw new Error(`${gameId}: approved challenger did not beat baseline overall`);
  }else if(state.productionApproval!==false){
    throw new Error(`${gameId}: production approval must stay false before demo pass`);
  }
}

console.log('ARTBOOK_DEMO_CONCEPT_GATE=PASS');
console.log('ARTBOOK_BASELINE=LATEST_COMPLETED_ARTBOOK');
console.log('DEMO_ITERATION_UNTIL_PASS=YES');
console.log('PRODUCTION_BLOCKED_UNTIL_DEMO_PASS=YES');
