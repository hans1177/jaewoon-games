// 파일명: tools/company-post-modification-review.mjs
// 역할: 수정 후 7개 부서가 독립 재평가하고 총괄은 실제 근거 게이트를 통과한 제출 결과만 종합한다.
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPANY_DEPARTMENT_ROLES,
  evaluateDepartmentEvidence,
  extractDepartmentRuntimeEvidence,
  getDepartmentStandard
} from '../assets/company-department-standards.js';
import { extractGroundedDepartmentEvidence } from './vibe3-department-evidence-extract.mjs';

const ROLES=[...COMPANY_DEPARTMENT_ROLES];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스',music:'음악',intro:'인트로',director:'총괄'};
const clean=v=>String(v??'').trim();
const readText=(f,max=120000)=>{try{const b=fs.readFileSync(f);return b.subarray(0,Math.min(max,b.length)).toString('utf8');}catch{return'';}};
const readJson=(f,d=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const requestFile=clean(process.env.REVIEW_REQUEST_FILE||process.argv.find(x=>x.startsWith('--request='))?.split('=')[1]);
const role=clean(process.env.REVIEW_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!requestFile||!fs.existsSync(requestFile))throw new Error('REVIEW_REQUEST_FILE missing');
if(![...ROLES,'director'].includes(role))throw new Error('invalid REVIEW_ROLE');
const req=readJson(requestFile,{});
if(req.version!==1||!req.gameId||!req.requestId)throw new Error('invalid review request');
const gameId=clean(req.gameId),requestId=clean(req.requestId),model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const outputRoot=clean(process.env.REVIEW_OUTPUT_ROOT||'.company-revote-output');

async function callModel(system,user,seed=1501){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:'json',messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:0.1,seed,num_ctx:8192,num_predict:800}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  return JSON.parse(clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim());
}
function normalizeDecision(v){const s=clean(v).toUpperCase();return ['PASS','REVISE','DROP'].includes(s)?s:'REVISE';}
function normalizeScore(v){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;}
function arr(v,max=8){return Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];}
function unique(items,max=24){return [...new Set(items.map(clean).filter(Boolean))].slice(0,max);}

if(role!=='director'){
  const files=[
    `.github/workflows/unity-cloud-android-test.yml`,
    `.github/workflows/unity-hybrid-android-build.yml`,
    `.build-requests/unity/${gameId}.json`,
    `unity-games/${gameId}/ProjectSettings/ProjectVersion.txt`,
    `unity-games/${gameId}/Assets/Editor/AndroidTestBuild.cs`,
    `company-status.json`
  ];
  const scriptsRoot=`unity-games/${gameId}/Assets/Scripts`;
  if(fs.existsSync(scriptsRoot)){
    const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(?:cs|js|mjs|html|lua|luau)$/i.test(e.name)&&files.length<28)files.push(p.replaceAll('\\','/'));}};walk(scriptsRoot);
  }
  for(const file of Array.isArray(req.changedFiles)?req.changedFiles:[])if(clean(file)&&!files.includes(clean(file)))files.push(clean(file));
  const sourceEvidence=files.map(f=>({file:f,text:readText(f,50000)})).filter(x=>x.text).map(x=>({file:x.file,excerpt:x.text.slice(0,12000)}));
  const grounded=extractGroundedDepartmentEvidence({
    request:req,
    sourceEvidence:sourceEvidence.map(item=>({path:item.file,detail:item.excerpt}))
  });
  const groundedEvidence=grounded.evidence[role]||[];
  const standard=getDepartmentStandard(role);
  const runtimeEvidence=extractDepartmentRuntimeEvidence(role,req);
  const guides={
    planning:'핵심 재미·게임 루프·스토리/콘티 연결이 이번 수정으로 훼손되는지 평가한다. 기술 수정만으로 기획 내용을 새로 만들지 않는다.',
    graphics:'가독성·화면 구성·아트북 정체성·실루엣·모션/VFX·모바일 표현을 실제 스크린샷/프레임/소스 근거로 평가한다. 보이지 않은 화면을 상상하지 않는다.',
    development:'실제 수정 파일, 빌드 구조, 재현성, 의존성, 저장/데이터 호환성과 구현 위험을 평가한다. 성공한 컴파일/빌드 근거 없이는 PASS하지 않는다.',
    qa:'코드 리뷰가 아니라 게임 테스터 관점으로 평가한다. 실제 실행/플레이 스모크 증거, 재현 조건, 회귀 범위, 수정 후 재검증을 확인한다. 실행 증거 없이는 PASS하지 않는다.',
    balance:'전투 난이도·성장·보상 수치에 이번 수정이 영향을 주는지 실제 수정 범위와 값을 기준으로 평가한다. 영향이 있으면 이전 값과 변경 값을 비교한다.',
    music:'실제 런타임 오디오 증거만 사용해 첫 사용자 제스처 재생, 뮤트/볼륨, 믹스/피드백, 라이선스와 네트워크 의존성을 평가한다. 실행 증거 없이는 PASS하지 않는다.',
    intro:'실제 첫 진입 런타임 증거만 사용해 오프닝 전달, 스킵/계속, 첫 의미 있는 입력 가능 시점, 코어 루프 인계를 평가한다. 실행 증거 없이는 PASS하지 않는다.'
  };
  const checks=standard.requiredChecks.join(' / ');
  const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서의 독립 수정후 재평가자다. ${guides[role]} 필수 점검: ${checks}. groundedEvidence에 없는 사실을 evidence로 만들지 않는다. 다른 부서 판단을 대신하지 않는다. 결론은 PASS|REVISE|DROP, score는 0~100이다. JSON 객체만 반환하고 키는 decision, score, summary, evidence, blockers, recommendations다.`;
  const payload={
    request:{requestId,gameId,modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',buildStage:req.buildStage||'',buildError:req.buildError||'',scope:req.scope||'',runtimeEvidence},
    department:role,requiredChecks:standard.requiredChecks,groundedEvidence,
    sourceEvidence:sourceEvidence.map(item=>({file:item.file,excerpt:item.excerpt.slice(0,4000)}))
  };
  let candidate=null,last=null;
  for(let i=0;i<3;i++){
    try{candidate=await callModel(system,JSON.stringify(payload),1701+ROLES.indexOf(role)*101+i);if(candidate&&candidate.summary)break;}catch(e){last=e;}
  }
  if(!candidate)throw last||new Error(`${role} review failed`);

  let decision=normalizeDecision(candidate.decision);
  let score=normalizeScore(candidate.score);
  const modelEvidence=arr(candidate.evidence,8);
  let blockers=arr(candidate.blockers,8);
  let recommendations=arr(candidate.recommendations,8);
  const gate=evaluateDepartmentEvidence({role,evidence:groundedEvidence,request:req});
  const buildFailed=clean(req.buildConclusion).toLowerCase()==='failure';
  const buildCriticalRole=role==='development'||role==='qa';

  if(!gate.passed){
    if(decision==='PASS')decision='REVISE';
    if(decision==='REVISE')score=Math.min(score,59);
    blockers=unique([...blockers,...gate.blockers]);
    recommendations=unique([...recommendations,gate.runtimeRequired&&gate.runtimeEvidence.length===0?['해당 부서의 실제 런타임 증거를 기록한 뒤 동일 수정 범위로 재평가할 것']:[],'누락된 필수 근거를 확보한 뒤 동일 수정 범위로 다시 재평가할 것']);
  }

  if(buildFailed&&buildCriticalRole){
    if(decision==='PASS')decision='REVISE';
    if(decision==='REVISE')score=Math.min(score,59);
    blockers=unique([...blockers,`검증 대상 빌드 run ${req.buildRunId||'unknown'}가 ${req.buildStage||'빌드 단계'}에서 실패해 컴파일/빌드 검증이 완료되지 않음`]);
    recommendations=unique([...recommendations,'실패 원인을 수정한 뒤 동일 검증 범위로 새 빌드를 성공시키고 다시 재평가할 것']);
  }

  const out={
    version:3,requestId,gameId,role,department:NAMES[role],decision,score,
    summary:clean(candidate.summary).slice(0,800),
    evidence:groundedEvidence,
    modelObservations:modelEvidence,
    blockers,recommendations,requiredChecks:standard.requiredChecks,evidenceGate:gate,
    groundedEvidenceAuthority:grounded.authority,
    sourceEvidenceFiles:sourceEvidence.map(item=>item.file),runtimeEvidence,
    modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',
    deterministicGuards:{failedBuildCriticalRoleGuard:buildFailed&&buildCriticalRole,departmentEvidenceGate:true,groundedEvidenceOnlyForPass:true,runtimeDomainEvidenceRequired:standard.runtimeRequired},
    generatedBy:`local-${model}`,independent:true
  };
  writeJson(`${outputRoot}/${role}.json`,out);
  console.log(`POST_MODIFICATION_REVIEW=${role}:${out.decision}:${out.score}`);
  console.log(`DEPARTMENT_EVIDENCE_GATE=${role}:${out.evidenceGate.passed?'PASS':'FAIL'}`);
  console.log(`GROUNDED_EVIDENCE_COUNT=${role}:${out.evidence.length}`);
  process.exit(0);
}

const reviews=ROLES.map(r=>readJson(`${outputRoot}/${r}.json`,null));
if(reviews.some(x=>!x))throw new Error(`director requires all ${ROLES.length} department reviews`);
const system=`/no_think\n너는 재운컴퍼니 총괄 AI다. 제출된 ${ROLES.length}개 부서 재평가만 종합한다. 없는 근거를 만들거나 부서 내용을 대신 작성하지 않는다. 각 부서 decision과 evidenceGate를 그대로 존중하고 최종 요약/최우선 조치만 제시한다. JSON 객체만 반환하고 키는 summary, nextAction다.`;
let candidate={summary:'',nextAction:''};
try{candidate=await callModel(system,JSON.stringify({request:req,reviews}),2601);}catch{}
const decisions=reviews.map(x=>x.decision);
const evidenceGateFailures=reviews.filter(x=>x.evidenceGate?.passed!==true).map(x=>x.role);
const finalDecision=decisions.includes('DROP')?'DROP':(decisions.includes('REVISE')||evidenceGateFailures.length)?'REVISE':'PASS';
const avg=Math.round(reviews.reduce((s,x)=>s+Number(x.score||0),0)/reviews.length);
const blockers=unique([...reviews.flatMap(x=>x.blockers||[]),...evidenceGateFailures.map(r=>`${NAMES[r]||r} 부서 증거 게이트 미통과`)],24);
const out={
  version:3,requestId,gameId,role:'director',department:'총괄',decision:finalDecision,score:avg,
  summary:clean(candidate.summary||`${ROLES.length}개 부서 재평가 종합: ${finalDecision}`).slice(0,1000),
  nextAction:clean(candidate.nextAction||blockers[0]||'검증된 다음 단계 진행').slice(0,800),
  departments:ROLES,
  departmentVotes:Object.fromEntries(reviews.map(x=>[x.role,{decision:x.decision,score:x.score,summary:x.summary,evidenceGatePassed:x.evidenceGate?.passed===true}])),
  departmentEvidenceGates:Object.fromEntries(reviews.map(x=>[x.role,x.evidenceGate||null])),
  blockers,modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',
  aggregationRule:'DROP if any DROP; REVISE if any REVISE or any evidence gate fails; otherwise PASS',
  inventedDepartmentContent:false,groundedEvidenceRequired:true,generatedBy:`local-${model}`
};
writeJson(`${outputRoot}/director.json`,out);
console.log(`POST_MODIFICATION_DIRECTOR_VOTE=${out.decision}:${out.score}`);
console.log(`DEPARTMENT_EVIDENCE_GATES=${evidenceGateFailures.length?'FAIL:'+evidenceGateFailures.join(','):'PASS'}`);
