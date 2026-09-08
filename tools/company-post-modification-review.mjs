// 파일명: tools/company-post-modification-review.mjs
// 역할: 수정 후 기획/개발/QA/그래픽/밸런스가 독립 재평가하고 총괄은 제출된 5개 결과만 종합한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','development','qa','graphics','balance'];
const NAMES={planning:'기획',development:'개발',qa:'QA',graphics:'그래픽',balance:'밸런스',director:'총괄'};
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
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:'json',messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:0.1,seed,num_ctx:8192,num_predict:650}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  return JSON.parse(clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim());
}
function normalizeDecision(v){const s=clean(v).toUpperCase();return ['PASS','REVISE','DROP'].includes(s)?s:'REVISE';}
function normalizeScore(v){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;}
function arr(v,max=8){return Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];}

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
    const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.cs')&&files.length<22)files.push(p.replaceAll('\\','/'));}};walk(scriptsRoot);
  }
  const evidence=files.map(f=>({file:f,text:readText(f,50000)})).filter(x=>x.text).map(x=>({file:x.file,excerpt:x.text.slice(0,12000)}));
  const guides={
    planning:'핵심 재미·게임 루프·스토리/콘티 연결이 이번 수정으로 훼손되는지 평가한다. 기술 수정만으로 기획 내용을 새로 만들지 않는다.',
    development:'Unity 빌드 구조·라이선스 활성화 방식·재현성·확장성·구현 위험을 평가한다.',
    qa:'실제 빌드 결과, 실패 단계, 회귀 가능성, 검증 누락, APK 생성 가능성을 평가한다.',
    graphics:'시각 자산·화면 구성·그래픽 파이프라인에 이번 수정이 미치는 영향만 평가한다. 근거 없는 시각 설정을 만들지 않는다.',
    balance:'전투 난이도·성장·보상 수치에 이번 수정이 영향을 주는지 평가한다. 영향이 없으면 그 사실을 명시한다.'
  };
  const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서의 독립 수정후 재평가자다. ${guides[role]} 다른 부서의 판단을 보지 않고 제공된 근거만 사용한다. 결론은 PASS|REVISE|DROP 중 하나다. score는 0~100의 근거 기반 신뢰/준비 점수다. 새 사실을 만들지 않는다. JSON 객체만 반환하고 키는 decision, score, summary, evidence, blockers, recommendations다.`;
  const payload={request:{requestId,gameId,modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',buildStage:req.buildStage||'',buildError:req.buildError||'',scope:req.scope||''},department:role,evidence};
  let candidate=null,last=null;
  for(let i=0;i<3;i++){
    try{candidate=await callModel(system,JSON.stringify(payload),1701+ROLES.indexOf(role)*101+i);if(candidate&&candidate.summary)break;}catch(e){last=e;}
  }
  if(!candidate)throw last||new Error(`${role} review failed`);
  const out={version:1,requestId,gameId,role,department:NAMES[role],decision:normalizeDecision(candidate.decision),score:normalizeScore(candidate.score),summary:clean(candidate.summary).slice(0,800),evidence:arr(candidate.evidence,8),blockers:arr(candidate.blockers,8),recommendations:arr(candidate.recommendations,8),modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',generatedBy:`local-${model}`,independent:true};
  writeJson(`${outputRoot}/${role}.json`,out);
  console.log(`POST_MODIFICATION_REVIEW=${role}:${out.decision}:${out.score}`);
  process.exit(0);
}

const reviews=ROLES.map(r=>readJson(`${outputRoot}/${r}.json`,null));
if(reviews.some(x=>!x))throw new Error('director requires all five department reviews');
const system=`/no_think\n너는 재운컴퍼니 총괄 AI다. 제출된 5개 부서 재평가만 종합한다. 없는 근거를 만들거나 부서 내용을 대신 작성하지 않는다. 각 부서 투표를 그대로 존중하고, 최종 요약/최우선 조치만 제시한다. JSON 객체만 반환하고 키는 summary, nextAction다.`;
let candidate={summary:'',nextAction:''};
try{candidate=await callModel(system,JSON.stringify({request:req,reviews}),2601);}catch{}
const decisions=reviews.map(x=>x.decision);
const finalDecision=decisions.includes('DROP')?'DROP':decisions.includes('REVISE')?'REVISE':'PASS';
const avg=Math.round(reviews.reduce((s,x)=>s+Number(x.score||0),0)/reviews.length);
const blockers=[...new Set(reviews.flatMap(x=>x.blockers||[]))].slice(0,12);
const out={version:1,requestId,gameId,role:'director',department:'총괄',decision:finalDecision,score:avg,summary:clean(candidate.summary||`5개 부서 재평가 종합: ${finalDecision}`).slice(0,1000),nextAction:clean(candidate.nextAction||blockers[0]||'검증된 다음 단계 진행').slice(0,800),departmentVotes:Object.fromEntries(reviews.map(x=>[x.role,{decision:x.decision,score:x.score,summary:x.summary}])),blockers,modificationCommit:req.modificationCommit||'',buildRunId:req.buildRunId||null,buildConclusion:req.buildConclusion||'unknown',aggregationRule:'DROP if any DROP; REVISE if any REVISE; otherwise PASS',inventedDepartmentContent:false,generatedBy:`local-${model}`};
writeJson(`${outputRoot}/director.json`,out);
console.log(`POST_MODIFICATION_DIRECTOR_VOTE=${out.decision}:${out.score}`);
