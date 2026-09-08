// 파일명: tools/artbook-assemble.mjs
// 역할: 검증된 5개 부서 1차 제출과 2차 협업 리뷰만 복사해 통합 아트북을 만들고 공개 가능한 초안으로 등록한다.
// 총괄은 새 설정/주장/부서 내용을 만들지 않는다. 홈페이지 노출은 제작 승인과 무관하다.
import fs from 'node:fs';
import path from 'node:path';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};

const queue=readJson('artbook-submission-queue.json',null),gate=readJson('artbook-gate-status.json',null),styles=readJson('artbook-style-profiles.json',{games:{}}),registry=readJson('game-artbooks.json',{version:4,policy:{},dailySubmissions:[],artbooks:[],legacyArchive:[]}),feedbackThreads=readJson('artbook-feedback-threads.json',{games:{}});
if(!queue||!gate)throw new Error('artbook queue/gate status missing');
const roles=Array.isArray(queue.requiredRoles)&&queue.requiredRoles.length?queue.requiredRoles:['planning','graphics','development','qa','balance'];
const gameId=String(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget||'').trim(),date=String(process.env.ARTBOOK_DATE||gate.date||todayKst()).trim();
const game=(queue.games||[]).find(x=>x.gameId===gameId)||null,base=path.join('artbook-submissions',gameId,date),output=path.join(base,'artbook.json');
if(!gameId)throw new Error('gameId missing');
if(gate.gameId!==gameId||gate.date!==date)throw new Error('gate target/date mismatch');
if(gate.readyForDirectorAssembly!==true||Number(gate.readyCount)!==roles.length||Number(gate.reviewReadyCount)!==roles.length||gate.collaborationComplete!==true)throw new Error(`section/collaboration gate incomplete: sections ${gate.readyCount||0}/${roles.length}, reviews ${gate.reviewReadyCount||0}/${roles.length}`);
if(gate.directorMayAuthorMissingSections!==false||gate.directorMayAuthorMissingReviews!==false)throw new Error('director ghostwriting guard missing');

const submissionsRoot='artbook-submissions';
if(fs.existsSync(submissionsRoot))for(const entry of fs.readdirSync(submissionsRoot,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const candidate=path.join(submissionsRoot,entry.name,date,'artbook.json');
  if(fs.existsSync(candidate)&&path.normalize(candidate)!==path.normalize(output))throw new Error(`daily final artbook limit reached by ${candidate}`);
}

const departments={},collaborationReviews={},sourceFiles=[],reviewFiles=[],cuts=[];
for(const role of roles){
  const file=path.join(base,`${role}.json`),submission=readJson(file,null);
  if(!submission)throw new Error(`${role} submission missing after gate`);
  if(String(submission.gameId||'')!==gameId||String(submission.date||'')!==date||String(submission.department||submission.role||'')!==role||String(submission.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`${role} submission identity/status mismatch`);
  if(!Array.isArray(submission.evidence)||submission.evidence.length===0||!submission.section||typeof submission.section!=='object'||Array.isArray(submission.section)||Object.keys(submission.section).length===0)throw new Error(`${role} submission evidence/section missing`);
  sourceFiles.push(file);
  departments[role]={status:'SUBMITTED',readiness:submission.departmentReadiness||'NEEDS_VALIDATION',sourceFile:file,headline:submission.headline||null,evidence:submission.evidence,section:submission.section,unverified:Array.isArray(submission.unverified)?submission.unverified:[]};
  for(const cut of Array.isArray(submission.cuts)?submission.cuts:[]){if(cuts.length>=10)break;if(!cut||!cut.title||!cut.body||!cut.image)continue;cuts.push({no:cuts.length+1,kind:cut.kind||role,title:cut.title,body:cut.body,image:cut.image,sourceDepartment:role});}

  const reviewFile=path.join(base,'reviews',`${role}.json`),review=readJson(reviewFile,null);
  if(!review||String(review.status||'').toUpperCase()!=='REVIEWED'||Number(review.round)!==2||String(review.department||'')!==role)throw new Error(`${role} collaboration review missing after gate`);
  reviewFiles.push(reviewFile);
  collaborationReviews[role]={sourceFile:reviewFile,protocol:review.protocol,agree:review.agree||[],counter:review.counter||[],test:review.test||[],result:review.result||[],decision:review.decision||'',ownSectionAddendum:review.ownSectionAddendum||{},unverified:review.unverified||[]};
}

const style=styles?.games?.[gameId]||{},gameName=game?.name||style.name||gameId,readinessSummary=Object.fromEntries(roles.map(role=>[role,departments[role].readiness]));
const final={version:1,gameId,gameName,date,status:'SUBMITTED',initialArtbook:true,productionApproval:false,styleProfile:game?.styleProfile||style.identity||null,departments,collaboration:{protocol:'AGREE_COUNTER_TEST_RESULT_DECISION',reviews:collaborationReviews,sourceFiles:reviewFiles,allFiveDepartmentsReviewed:true},directorSummary:{assemblyMode:'verbatim-department-material-plus-metadata-only',sourceDepartments:roles,sourceFiles,reviewFiles,readinessSummary,newClaimsAdded:false,productionDecisionMade:false},cuts,publication:{automaticProductionApproval:false,homepageVisibilityMayBeEnabledSeparately:true,displayReady:cuts.length>0}};
writeJson(output,final);

const feedback=feedbackThreads.games?.[gameId]||null,artbookId=`${gameId}-${date}-initial`,previous=(registry.artbooks||[]).find(x=>x.id===artbookId)||null,priorEditions=(registry.artbooks||[]).filter(x=>x.gameId===gameId).map(x=>Number(x.edition)||0),edition=previous?.edition||Math.max(0,...priorEditions)+1;
const registered={id:artbookId,gameId,gameName,edition,title:`${gameName} · 통합 아트북`,subtitle:game?.styleProfile||style.identity||'5개 부서 근거 통합 기록',status:'draft-integrated-artbook',published:Boolean(feedback&&cuts.length>0),productionApproval:false,createdAt:date,intent:'5개 부서의 독립 1차 검토와 상호 공개 후 2차 협업 리뷰를 새 주장 없이 한 권으로 묶은 초기 아트북.',sourceFile:output,departmentReadiness:readinessSummary,collaborationProtocol:'AGREE_COUNTER_TEST_RESULT_DECISION',cuts,feedback:feedback?{issueNumber:feedback.issueNumber,issueUrl:feedback.issueUrl}:null};
registry.version=Math.max(4,Number(registry.version)||0);registry.updatedAt=date;registry.artbooks=[...(registry.artbooks||[]).filter(x=>x.id!==artbookId),registered];registry.dailySubmissions=[...(registry.dailySubmissions||[]).filter(x=>!(x.date===date&&x.gameId===gameId)),{date,gameId,artbookId,status:'draft-integrated-artbook',productionApproval:false}];writeJson('game-artbooks.json',registry);

writeJson('artbook-gate-status.json',{...gate,checkedAt:new Date().toISOString(),assembled:true,assembledFile:output,registeredArtbookId:artbookId,homepagePublished:registered.published,assemblyAddsNewClaims:false,formalProductionGate:'INITIAL_ARTBOOK_ASSEMBLED_AWAITING_OWNER_PRODUCTION_DECISION'});
console.log('ARTBOOK_ASSEMBLED=YES');console.log(`ARTBOOK_FILE=${output}`);console.log(`ARTBOOK_DEPARTMENTS=${roles.length}/${roles.length}`);console.log(`ARTBOOK_REVIEWS=${roles.length}/${roles.length}`);console.log(`ARTBOOK_CUTS=${cuts.length}/10`);console.log(`ARTBOOK_REGISTERED=${artbookId}`);console.log(`HOMEPAGE_PUBLISHED=${registered.published?'YES':'NO'}`);console.log('PRODUCTION_APPROVAL=NO');
