// 파일명: tools/artbook-collaboration-runner.mjs
// 역할: 1차 독립 제출 5개가 끝난 뒤에만 서로 의견을 공개해 2차 부서 협업 리뷰를 만든다.
// 각 부서는 다른 부서의 섹션을 수정하지 않고 자기 관점의 AGREE/COUNTER/TEST/RESULT/DECISION만 제출한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error('invalid ARTBOOK_ROLE');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
const queue=readJson('artbook-submission-queue.json',{});
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
const base=path.join('artbook-submissions',gameId,date);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:1.7b');
const submissions={};
for(const r of ROLES){
  const file=path.join(base,`${r}.json`),data=readJson(file,null);
  if(!data||String(data.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`first-round submission missing: ${r}`);
  submissions[r]={department:r,headline:data.headline||'',readiness:data.departmentReadiness||'NEEDS_VALIDATION',section:data.section,unverified:Array.isArray(data.unverified)?data.unverified:[]};
}
const own=submissions[role];
const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서다. 지금은 1차 독립 검토가 끝난 뒤 처음으로 다른 네 부서 의견을 보는 2차 협업 단계다. 다른 부서 섹션을 대신 작성하거나 수정하지 않는다. 자기 담당 관점에서만 충돌과 연결점을 검토한다. 근거 없는 테스트 결과를 만들지 말고 실제 실행 근거가 없으면 RESULT에 미검증/미실행이라고 적는다. 숫자 품질 점수와 PASS/본개발/출시 승인을 만들지 않는다. 답은 한국어 JSON 객체만 출력한다. 필수 키는 agree(array), counter(array), test(array), result(array), decision(string), ownSectionAddendum(object), unverified(array)다. decision은 자기 부서가 다음에 무엇을 보완할지에 대한 결정이지 게임 제작 승인 판정이 아니다.`;
const payload={gameId,date,reviewingDepartment:role,ownFirstRound:own,revealedAfterIndependentRound:Object.values(submissions)};
async function call(){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:'json',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload,null,2)}],options:{temperature:0.2,seed:701+ROLES.indexOf(role)*131,num_ctx:16384,num_predict:1100}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  const raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  return JSON.parse(raw);
}
const candidate=await call();
if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw new Error('collaboration output is not object');
const arr=(v,max=8)=>Array.isArray(v)?v.map(clean).filter(Boolean).slice(0,max):[];
const review={
  version:1,gameId,date,department:role,status:'REVIEWED',round:2,
  runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,independentFirstRoundCompleted:true},
  protocol:'AGREE_COUNTER_TEST_RESULT_DECISION',
  agree:arr(candidate.agree),counter:arr(candidate.counter),test:arr(candidate.test),result:arr(candidate.result),
  decision:clean(candidate.decision||'추가 검증 후 자기 부서 파트 보완'),
  ownSectionAddendum:candidate.ownSectionAddendum&&typeof candidate.ownSectionAddendum==='object'&&!Array.isArray(candidate.ownSectionAddendum)?candidate.ownSectionAddendum:{},
  unverified:arr(candidate.unverified),
  guard:{mayRewriteOtherDepartments:false,productionApproval:false,numericQualityScore:false}
};
const output=path.join(base,'reviews',`${role}.json`);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log(`ARTBOOK_COLLAB_REVIEWED=${role}`);
console.log(`ARTBOOK_COLLAB_FILE=${output}`);
console.log('CROSS_DEPARTMENT_GHOSTWRITING=NO');
