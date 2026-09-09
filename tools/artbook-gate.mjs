// 파일명: tools/artbook-gate.mjs
// 역할: 실제 부서 1차 제출 5개 + 타부서 보완점/별점 리뷰 5개 + 총괄 5번째 표의 의미 품질까지 검증한다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const infoKey=value=>clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');
const meaningful=(value,min=12)=>{
  const text=clean(value);
  if(text.length<min)return false;
  const words=text.split(/\s+/).filter(Boolean);
  return words.length>=2||/[가-힣]{4,}/.test(text);
};
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}

const ROLE_SECTION_KEYS={
  planning:['worldEvidence','protagonistMotivationEvidence','regionCausality','storyGameplayConnection','gaps','handoffs'],
  graphics:['currentVisualEvidence','identityDirection','characterMonsterEnvironmentLogic','mobileReadability','assetConstraints','gaps','handoffs'],
  development:['implementedNow','architecture','prototypeLimits','technicalRisks','demoPlan','handoffs'],
  qa:['currentPlayableFlow','verifiedEvidence','problemScenes','mobileSaveErrorRisks','testScenarios','unverified','handoffs'],
  balance:['currentNumbers','progressionCurve','combatFeel','economyRewards','difficultyTransitions','testMeasurements','handoffs']
};
const PLACEHOLDER_EXACT=new Set(['n/a','na','none','null','true','false','tbd','todo','unknown','game','gameplay','live','realtime','serverless','edge','cloud','0','1','100']);
const REVIEW_BOILERPLATE=[/본\s*개발\s*\/\s*출시\s*승인/i,/게임\s*전체\s*품질\s*점수/i,/이번\s*검토\s*점수/i,/해당\s*부서\s*결과물의\s*이번\s*검토/i];
function placeholder(value){
  const text=clean(value),key=text.toLowerCase();
  if(!text)return true;
  if(PLACEHOLDER_EXACT.has(key))return true;
  if(/^[\d\s.,:%+\-\/]+$/.test(text))return true;
  if(/^[\[\]{}:,"']+$/.test(text))return true;
  return false;
}
function semanticTextProblem(value,min=12){return placeholder(value)||!meaningful(value,min);}
function planValues(data){
  const plan=data?.conceptPlan&&typeof data.conceptPlan==='object'&&!Array.isArray(data.conceptPlan)?data.conceptPlan:{};
  return ['creativeIdeas','implementationPlan','demoValidation'].flatMap(key=>Array.isArray(plan[key])?plan[key].map(clean).filter(Boolean):[]);
}
function repeatedInformationProblems(prefix,values,{minItems=9,minUnique=6,minVolume=180}={}){
  const problems=[],cleaned=values.map(clean).filter(Boolean),keys=cleaned.map(infoKey).filter(Boolean),unique=new Set(keys),frequencies=new Map();
  for(const key of keys)frequencies.set(key,(frequencies.get(key)||0)+1);
  const maxRepeat=Math.max(0,...frequencies.values());
  if(cleaned.length<minItems||unique.size<minUnique)problems.push(`${prefix}-content-too-repetitive`);
  if(keys.length&&maxRepeat/keys.length>=0.45)problems.push(`${prefix}-single-phrase-dominates-submission`);
  if(clean(cleaned.join(' ')).length<minVolume)problems.push(`${prefix}-information-volume-too-low`);
  return problems;
}
function departmentSemanticProblems(role,data){
  const problems=[],keys=ROLE_SECTION_KEYS[role]||[],section=data?.section&&typeof data.section==='object'&&!Array.isArray(data.section)?data.section:{};
  const readiness=clean(data?.departmentReadiness||data?.readiness).toUpperCase();
  if(readiness!=='READY')problems.push(`${role}-readiness-must-be-READY`);
  for(const key of keys){
    if(semanticTextProblem(section[key],12))problems.push(`${role}-${key}-meaningful-text-required`);
  }
  const plans=planValues(data);
  if(plans.length<3||plans.some(value=>semanticTextProblem(value,12)))problems.push(`${role}-conceptPlan-items-too-shallow`);
  const values=[...keys.map(key=>clean(section[key])).filter(Boolean),...plans];
  problems.push(...repeatedInformationProblems(role,values));
  return [...new Set(problems)];
}
function reviewImprovementProblems(value,prefix){
  const text=clean(value),problems=[];
  if(semanticTextProblem(text,20))problems.push(`${prefix}-improvement-too-shallow`);
  if(REVIEW_BOILERPLATE.some(pattern=>pattern.test(text)))problems.push(`${prefix}-improvement-boilerplate`);
  return problems;
}

const queue=readJson('artbook-submission-queue.json',{requiredRoles:['planning','graphics','development','qa','balance'],currentDailyTarget:null,games:[]});
const requiredRoles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget||'').trim();
const targetGame=(queue.games||[]).find(x=>x.gameId===gameId)||null;
const date=String(process.env.ARTBOOK_DATE||kstDate()).trim();
if(!gameId)throw new Error('ARTBOOK_GAME_ID is empty and queue has no currentDailyTarget.');

const base=path.join('artbook-submissions',gameId,date);
const ready=[],missing=[],invalid=[];
for(const role of requiredRoles){
  const file=path.join(base,`${role}.json`);
  if(!fs.existsSync(file)){missing.push({role,file,reason:'missing-file'});continue;}
  const raw=fs.readFileSync(file,'utf8'),data=readJson(file,null),problems=[];
  if(!data||typeof data!=='object'||Array.isArray(data))problems.push('invalid-json-object');
  else{
    if(String(data.gameId||'')!==gameId)problems.push('gameId-mismatch');
    if(String(data.date||'')!==date)problems.push('date-mismatch');
    if(String(data.department||data.role||'')!==role)problems.push('department-mismatch');
    if(String(data.status||'').toUpperCase()!=='SUBMITTED')problems.push('status-not-SUBMITTED');
    if(!Array.isArray(data.evidence)||data.evidence.length===0)problems.push('evidence-required');
    else if(!data.evidence.some(row=>row&&typeof row==='object'&&clean(row.source)))problems.push('evidence-source-required');
    if(!data.section||typeof data.section!=='object'||Array.isArray(data.section)||Object.keys(data.section).length===0)problems.push('non-empty-section-required');
    const submissionVersion=Number(data.version||0);
    if(submissionVersion>=5){
      const conceptPlan=data.conceptPlan;
      if(!conceptPlan||typeof conceptPlan!=='object'||Array.isArray(conceptPlan))problems.push('conceptPlan-required-for-v5');
      else{
        for(const key of ['creativeIdeas','implementationPlan','demoValidation']){
          const values=conceptPlan[key];
          if(!Array.isArray(values)||values.length===0||values.some(value=>!String(value||'').trim()))problems.push(`conceptPlan-${key}-non-empty-array-required`);
        }
      }
    }
    problems.push(...departmentSemanticProblems(role,data));
    if(/NO_CHANGE/i.test(raw))problems.push('NO_CHANGE-token-forbidden');
  }
  if(problems.length)invalid.push({role,file,problems:[...new Set(problems)]});else ready.push({role,file});
}

const initialComplete=ready.length===requiredRoles.length&&missing.length===0&&invalid.length===0;
const reviewReady=[],reviewMissing=[],reviewInvalid=[];
for(const role of requiredRoles){
  const file=path.join(base,'reviews',`${role}.json`);
  if(!fs.existsSync(file)){reviewMissing.push({role,file,reason:'missing-review'});continue;}
  const data=readJson(file,null),problems=[];
  if(!data||typeof data!=='object'||Array.isArray(data))problems.push('invalid-review-json-object');
  else{
    if(String(data.gameId||'')!==gameId)problems.push('review-gameId-mismatch');
    if(String(data.date||'')!==date)problems.push('review-date-mismatch');
    if(String(data.department||'')!==role)problems.push('review-department-mismatch');
    if(String(data.status||'').toUpperCase()!=='REVIEWED')problems.push('review-status-not-REVIEWED');
    if(Number(data.round)!==2)problems.push('review-round-not-2');
    if(String(data.protocol||'')!=='PEER_IMPROVEMENT_STAR_5')problems.push('review-protocol-mismatch');
    if(String(data.reviewScope||'')!=='OTHER_DEPARTMENTS_ONLY')problems.push('review-scope-must-be-other-departments-only');
    const peers=Array.isArray(data.reviewedDepartments)?data.reviewedDepartments:[];
    const expectedPeers=requiredRoles.filter(x=>x!==role);
    if(peers.length!==expectedPeers.length||expectedPeers.some(x=>!peers.includes(x))||peers.includes(role))problems.push('reviewed-departments-must-be-other-four');
    const ratings=Array.isArray(data.peerReviews)?data.peerReviews:[];
    if(ratings.length!==4)problems.push('exactly-four-peer-ratings-required');
    const seen=new Set(),improvements=[];
    for(const rating of ratings){
      const target=String(rating?.targetDepartment||''),stars=Number(rating?.stars),improvement=clean(rating?.improvement);
      if(!expectedPeers.includes(target)||target===role)problems.push('peer-rating-target-invalid');
      if(seen.has(target))problems.push('duplicate-peer-rating-target');seen.add(target);
      if(!improvement)problems.push('peer-improvement-required');
      problems.push(...reviewImprovementProblems(improvement,'peer'));
      if(improvement)improvements.push(infoKey(improvement));
      if(!Number.isInteger(stars)||stars<1||stars>5)problems.push('peer-stars-must-be-1-to-5');
    }
    if(expectedPeers.some(x=>!seen.has(x)))problems.push('all-other-departments-must-be-rated');
    if(improvements.length===4&&new Set(improvements).size<2)problems.push('peer-improvements-too-repetitive');
    if(data.guard?.mayRewriteOtherDepartments!==false)problems.push('cross-department-rewrite-guard-missing');
    if(data.guard?.mayEvaluateOwnDepartment!==false)problems.push('own-department-rating-forbidden');
  }
  if(problems.length)reviewInvalid.push({role,file,problems:[...new Set(problems)]});else reviewReady.push({role,file});
}
const peerReviewsComplete=reviewReady.length===requiredRoles.length&&reviewMissing.length===0&&reviewInvalid.length===0;

const directorFile=path.join(base,'reviews','director.json');
const directorProblems=[];
let directorReviewReady=false;
if(!fs.existsSync(directorFile))directorProblems.push('director-review-missing');
else{
  const data=readJson(directorFile,null);
  if(!data||typeof data!=='object'||Array.isArray(data))directorProblems.push('director-review-invalid-json-object');
  else{
    if(String(data.gameId||'')!==gameId)directorProblems.push('director-review-gameId-mismatch');
    if(String(data.date||'')!==date)directorProblems.push('director-review-date-mismatch');
    if(String(data.reviewer||'')!=='director')directorProblems.push('director-reviewer-mismatch');
    if(String(data.status||'').toUpperCase()!=='REVIEWED')directorProblems.push('director-review-status-not-REVIEWED');
    if(String(data.protocol||'')!=='DIRECTOR_IMPROVEMENT_STAR_5')directorProblems.push('director-review-protocol-mismatch');
    if(String(data.reviewScope||'')!=='ALL_FIVE_DEPARTMENT_RESULTS')directorProblems.push('director-review-scope-mismatch');
    const ratings=Array.isArray(data.ratings)?data.ratings:[];
    if(ratings.length!==requiredRoles.length)directorProblems.push('director-must-rate-all-five-departments');
    const seen=new Set(),improvements=[];
    for(const rating of ratings){
      const target=String(rating?.targetDepartment||''),stars=Number(rating?.stars),improvement=clean(rating?.improvement);
      if(!requiredRoles.includes(target))directorProblems.push('director-rating-target-invalid');
      if(seen.has(target))directorProblems.push('director-rating-target-duplicate');seen.add(target);
      if(!improvement)directorProblems.push('director-improvement-required');
      directorProblems.push(...reviewImprovementProblems(improvement,'director'));
      if(improvement)improvements.push(infoKey(improvement));
      if(!Number.isInteger(stars)||stars<1||stars>5)directorProblems.push('director-stars-must-be-1-to-5');
    }
    if(requiredRoles.some(x=>!seen.has(x)))directorProblems.push('director-must-cover-all-five-departments');
    if(improvements.length===requiredRoles.length&&new Set(improvements).size<3)directorProblems.push('director-improvements-too-repetitive');
    if(data.guard?.mayRewriteDepartmentResults!==false)directorProblems.push('director-rewrite-guard-missing');
  }
  directorReviewReady=directorProblems.length===0;
}

const ratingsPerDepartment=peerReviewsComplete&&directorReviewReady?requiredRoles.length:0;
const collaborationComplete=peerReviewsComplete&&directorReviewReady;
const readyForDirectorAssembly=initialComplete&&collaborationComplete;
let formalProductionGate='BLOCKED_WAITING_FOR_REAL_DEPARTMENT_SUBMISSIONS';
if(initialComplete&&!peerReviewsComplete)formalProductionGate='BLOCKED_WAITING_FOR_PEER_IMPROVEMENT_STAR_REVIEWS';
else if(initialComplete&&peerReviewsComplete&&!directorReviewReady)formalProductionGate='BLOCKED_WAITING_FOR_DIRECTOR_FIFTH_RATING';
else if(readyForDirectorAssembly)formalProductionGate='SECTION_AND_FIVE_RATING_GATE_COMPLETE_DIRECTOR_ASSEMBLY_ALLOWED';

const status={version:8,checkedAt:new Date().toISOString(),date,gameId,gameName:targetGame?.name||gameId,requiredRoles,readyRoles:ready.map(x=>x.role),readyCount:ready.length,requiredCount:requiredRoles.length,missing,invalid,independentRoundComplete:initialComplete,submissionContract:'V6_FIVE_DEPARTMENT_SEMANTIC_QUALITY_AND_REVIEW_SPECIFICITY',historicalPreV5Compatibility:true,reviewReadyRoles:reviewReady.map(x=>x.role),reviewReadyCount:reviewReady.length,reviewRequiredCount:requiredRoles.length,reviewMissing,reviewInvalid,peerReviewsComplete,directorReviewFile:directorFile,directorReviewReady,directorReviewProblems:[...new Set(directorProblems)],directorRatingsRequired:requiredRoles.length,ratingsPerDepartment,collaborationProtocol:'PEER_PLUS_DIRECTOR_IMPROVEMENT_STAR_5',homepageOpinionMode:'IMPROVEMENT_AND_FIVE_VOTE_AVERAGE_STARS',collaborationComplete,readyForDirectorAssembly,directorMayAuthorMissingSections:false,directorMayAuthorMissingReviews:false,formalProductionGate};
writeJson('artbook-gate-status.json',status);
console.log(`ARTBOOK_GAME_ID=${gameId}`);
console.log(`ARTBOOK_DATE=${date}`);
console.log(`ARTBOOK_SECTION_READY=${ready.length}/${requiredRoles.length}`);
console.log(`ARTBOOK_REVIEW_READY=${reviewReady.length}/${requiredRoles.length}`);
console.log(`ARTBOOK_DIRECTOR_REVIEW=${directorReviewReady?'1/1':'0/1'}`);
console.log(`ARTBOOK_RATINGS_PER_DEPARTMENT=${ratingsPerDepartment}`);
console.log(`ARTBOOK_SUBMISSION_CONTRACT=${status.submissionContract}`);
console.log(`ARTBOOK_DIRECTOR_ASSEMBLY=${readyForDirectorAssembly?'YES':'NO'}`);
if(missing.length)console.log(`ARTBOOK_MISSING=${missing.map(x=>x.role).join(',')}`);
if(invalid.length){
  console.log(`ARTBOOK_INVALID=${invalid.map(x=>x.role).join(',')}`);
  for(const row of invalid)console.log(`ARTBOOK_INVALID_DETAIL=${row.role}:${row.problems.join('|')}`);
}
if(reviewMissing.length)console.log(`ARTBOOK_REVIEW_MISSING=${reviewMissing.map(x=>x.role).join(',')}`);
if(reviewInvalid.length)console.log(`ARTBOOK_REVIEW_INVALID=${reviewInvalid.map(x=>x.role).join(',')}`);
if(directorProblems.length)console.log(`ARTBOOK_DIRECTOR_INVALID=${[...new Set(directorProblems)].join(',')}`);
