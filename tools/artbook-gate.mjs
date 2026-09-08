// 파일명: tools/artbook-gate.mjs
// 역할: 실제 부서 1차 제출 5개 + 타부서 보완점/별점 리뷰 5개를 검증한다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
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
    if(!data.section||typeof data.section!=='object'||Array.isArray(data.section)||Object.keys(data.section).length===0)problems.push('non-empty-section-required');
    if(/NO_CHANGE/i.test(raw))problems.push('NO_CHANGE-token-forbidden');
  }
  if(problems.length)invalid.push({role,file,problems});else ready.push({role,file});
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
    const seen=new Set();
    for(const rating of ratings){
      const target=String(rating?.targetDepartment||'');const stars=Number(rating?.stars);
      if(!expectedPeers.includes(target)||target===role)problems.push('peer-rating-target-invalid');
      if(seen.has(target))problems.push('duplicate-peer-rating-target');seen.add(target);
      if(!String(rating?.improvement||'').trim())problems.push('peer-improvement-required');
      if(!Number.isInteger(stars)||stars<1||stars>5)problems.push('peer-stars-must-be-1-to-5');
    }
    if(expectedPeers.some(x=>!seen.has(x)))problems.push('all-other-departments-must-be-rated');
    if(data.guard?.mayRewriteOtherDepartments!==false)problems.push('cross-department-rewrite-guard-missing');
    if(data.guard?.mayEvaluateOwnDepartment!==false)problems.push('own-department-rating-forbidden');
  }
  if(problems.length)reviewInvalid.push({role,file,problems});else reviewReady.push({role,file});
}
const collaborationComplete=reviewReady.length===requiredRoles.length&&reviewMissing.length===0&&reviewInvalid.length===0;
const readyForDirectorAssembly=initialComplete&&collaborationComplete;
let formalProductionGate='BLOCKED_WAITING_FOR_REAL_DEPARTMENT_SUBMISSIONS';
if(initialComplete&&!collaborationComplete)formalProductionGate='BLOCKED_WAITING_FOR_PEER_IMPROVEMENT_STAR_REVIEWS';
if(readyForDirectorAssembly)formalProductionGate='SECTION_AND_PEER_REVIEW_GATE_COMPLETE_DIRECTOR_ASSEMBLY_ALLOWED';

const status={version:4,checkedAt:new Date().toISOString(),date,gameId,gameName:targetGame?.name||gameId,requiredRoles,readyRoles:ready.map(x=>x.role),readyCount:ready.length,requiredCount:requiredRoles.length,missing,invalid,independentRoundComplete:initialComplete,reviewReadyRoles:reviewReady.map(x=>x.role),reviewReadyCount:reviewReady.length,reviewRequiredCount:requiredRoles.length,reviewMissing,reviewInvalid,collaborationProtocol:'PEER_IMPROVEMENT_STAR_5',homepageOpinionMode:'PEER_IMPROVEMENT_AND_AVERAGE_STARS',collaborationComplete,readyForDirectorAssembly,directorMayAuthorMissingSections:false,directorMayAuthorMissingReviews:false,formalProductionGate};
writeJson('artbook-gate-status.json',status);
console.log(`ARTBOOK_GAME_ID=${gameId}`);console.log(`ARTBOOK_DATE=${date}`);console.log(`ARTBOOK_SECTION_READY=${ready.length}/${requiredRoles.length}`);console.log(`ARTBOOK_REVIEW_READY=${reviewReady.length}/${requiredRoles.length}`);console.log(`ARTBOOK_DIRECTOR_ASSEMBLY=${readyForDirectorAssembly?'YES':'NO'}`);if(missing.length)console.log(`ARTBOOK_MISSING=${missing.map(x=>x.role).join(',')}`);if(invalid.length)console.log(`ARTBOOK_INVALID=${invalid.map(x=>x.role).join(',')}`);if(reviewMissing.length)console.log(`ARTBOOK_REVIEW_MISSING=${reviewMissing.map(x=>x.role).join(',')}`);if(reviewInvalid.length)console.log(`ARTBOOK_REVIEW_INVALID=${reviewInvalid.map(x=>x.role).join(',')}`);
