const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const key=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');
const PLACEHOLDER=new Set(['n/a','na','none','null','true','false','tbd','todo','unknown','game','gameplay','live','realtime','serverless','edge','cloud','0','1','100']);
export const ROLE_SECTION_KEYS={planning:['worldEvidence','protagonistMotivationEvidence','regionCausality','storyGameplayConnection','gaps','handoffs'],graphics:['currentVisualEvidence','identityDirection','characterMonsterEnvironmentLogic','mobileReadability','assetConstraints','gaps','handoffs'],development:['implementedNow','architecture','prototypeLimits','technicalRisks','demoPlan','handoffs'],qa:['currentPlayableFlow','verifiedEvidence','problemScenes','mobileSaveErrorRisks','testScenarios','unverified','handoffs'],balance:['currentNumbers','progressionCurve','combatFeel','economyRewards','difficultyTransitions','testMeasurements','handoffs']};
function shallow(v,min=12){const t=clean(v),words=t.split(/\s+/).filter(Boolean);return !t||PLACEHOLDER.has(t.toLowerCase())||/^[\d\s.,:%+\-\/]+$/.test(t)||t.length<min||(words.length<2&&!/[가-힣]{4,}/.test(t));}
export function departmentInformationProblems(role,candidate){
  if(!candidate||typeof candidate!=='object')return[`${role}-candidate-missing`];
  const section=candidate.section||{},plan=candidate.conceptPlan||{},problems=[];
  for(const name of ROLE_SECTION_KEYS[role]||[])if(shallow(section[name]))problems.push(`${role}-${name}-too-shallow`);
  const planValues=['creativeIdeas','implementationPlan','demoValidation'].flatMap(name=>Array.isArray(plan[name])?plan[name].map(clean).filter(Boolean):[]);
  if(planValues.length<3)problems.push(`${role}-concept-plan-too-small`);
  if(planValues.some(v=>shallow(v,16)))problems.push(`${role}-concept-plan-item-too-shallow`);
  const values=[...(ROLE_SECTION_KEYS[role]||[]).map(name=>clean(section[name])).filter(Boolean),...planValues];
  const keys=values.map(key).filter(Boolean),unique=new Set(keys),freq=new Map();for(const item of keys)freq.set(item,(freq.get(item)||0)+1);
  const maxRepeat=Math.max(0,...freq.values());
  if(values.length<9||unique.size<6)problems.push(`${role}-content-too-repetitive`);
  if(keys.length&&maxRepeat/keys.length>=0.45)problems.push(`${role}-single-phrase-dominates`);
  if(clean(values.join(' ')).length<180)problems.push(`${role}-information-volume-too-low`);
  return [...new Set(problems)];
}
