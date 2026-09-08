// 파일명: tools/artbook-collaboration-runner.mjs
// 역할: 1차 독립 제출 5개가 끝난 뒤에만 서로 의견을 공개해 2차 부서 협업 리뷰를 만든다.
// 원칙: 각 부서는 다른 부서 섹션을 수정하지 않고 자기 관점의 AGREE/COUNTER/TEST/RESULT/DECISION만 제출한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error('invalid ARTBOOK_ROLE');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function compact(value,depth=0){
  if(depth>3)return clean(typeof value==='object'?JSON.stringify(value):value).slice(0,180);
  if(Array.isArray(value))return value.slice(0,5).map(v=>compact(v,depth+1));
  if(value&&typeof value==='object'){
    const out={};
    for(const [key,val] of Object.entries(value).slice(0,10))out[key]=compact(val,depth+1);
    return out;
  }
  return clean(value).slice(0,220);
}
const toArray=(value,max=3)=>{
  if(Array.isArray(value))return value.map(v=>clean(typeof v==='object'?JSON.stringify(v):v)).filter(Boolean).slice(0,max);
  const text=clean(value);return text?[text]:[];
};
const normalizeAddendum=value=>{
  if(!value)return{};
  if(typeof value==='string')return clean(value)?{note:clean(value).slice(0,220)}:{};
  if(Array.isArray(value))return value.length?{items:value.slice(0,3).map(v=>clean(typeof v==='object'?JSON.stringify(v):v)).filter(Boolean)}:{};
  if(typeof value==='object'){
    const out={};for(const [key,val] of Object.entries(value).slice(0,4)){const text=clean(typeof val==='object'?JSON.stringify(val):val);if(text)out[key]=text.slice(0,220);}return out;
  }
  return{};
};
const normalizeCandidate=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const candidate={
    agree:toArray(value.agree),
    counter:toArray(value.counter),
    test:toArray(value.test),
    result:toArray(value.result),
    decision:clean(value.decision).slice(0,260),
    ownSectionAddendum:normalizeAddendum(value.ownSectionAddendum),
    unverified:toArray(value.unverified,4)
  };
  return candidate;
};
const validCandidate=value=>Boolean(value&&value.decision&&value.agree.length&&value.counter.length&&value.test.length&&value.result.length);

const queue=readJson('artbook-submission-queue.json',{});
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
const base=path.join('artbook-submissions',gameId,date);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const submissions={};
for(const r of ROLES){
  const file=path.join(base,`${r}.json`),data=readJson(file,null);
  if(!data||String(data.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`first-round submission missing: ${r}`);
  submissions[r]={department:r,headline:clean(data.headline).slice(0,160),readiness:data.departmentReadiness||'NEEDS_VALIDATION',section:compact(data.section),unverified:compact(Array.isArray(data.unverified)?data.unverified:[])};
}
const own=submissions[role];
const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서다. 1차 독립 검토 5개가 모두 끝난 뒤 처음으로 타 부서 의견을 보는 2차 협업 단계다. 다른 부서 내용을 대신 쓰거나 수정하지 않는다. 자기 부서 관점에서만 의견을 낸다. 근거 없는 결과를 만들지 말고 실제 실행 근거가 없으면 RESULT에 미검증이라고 명시한다. 숫자 품질 점수, PASS, 본개발/출시 승인을 만들지 않는다. 반드시 짧은 한국어 JSON 객체 하나만 출력한다. agree, counter, test, result 배열에는 각각 1~2개의 짧은 문장만 넣는다. decision은 1개의 짧은 문장이다. ownSectionAddendum은 자기 부서 보완점만 담은 작은 객체다. 원문 소스나 긴 근거를 복사하지 않는다.`;
const payload={gameId,date,reviewingDepartment:role,ownFirstRound:own,revealedAfterIndependentRound:Object.values(submissions)};
const schema={
  type:'object',
  required:['agree','counter','test','result','decision','ownSectionAddendum','unverified'],
  properties:{
    agree:{type:'array',items:{type:'string'},minItems:1,maxItems:2},
    counter:{type:'array',items:{type:'string'},minItems:1,maxItems:2},
    test:{type:'array',items:{type:'string'},minItems:1,maxItems:2},
    result:{type:'array',items:{type:'string'},minItems:1,maxItems:2},
    decision:{type:'string'},
    ownSectionAddendum:{type:'object',additionalProperties:{type:'string'}},
    unverified:{type:'array',items:{type:'string'},maxItems:3}
  },
  additionalProperties:false
};
async function call(numPredict,strict=false){
  const strictMessage=strict?'출력은 각 배열 1개 항목, 각 문장 90자 이하로 줄이고 JSON을 반드시 닫아.':'';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${strictMessage}\n${JSON.stringify(payload)}`}],options:{temperature:0.12,seed:701+ROLES.indexOf(role)*131,num_ctx:8192,num_predict:numPredict}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  const raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  return JSON.parse(raw);
}
async function generate(){
  const attempts=[420,300,220];let lastError=null;
  for(let i=0;i<attempts.length;i++){
    try{
      const candidate=normalizeCandidate(await call(attempts[i],i>0));
      if(validCandidate(candidate))return candidate;
      lastError=new Error('required collaboration fields missing');
      console.error(`ARTBOOK_COLLAB_FORMAT_RETRY=${role}:attempt=${i+1}`);
    }catch(error){
      lastError=error;
      console.error(`ARTBOOK_COLLAB_RETRY=${role}:attempt=${i+1}:${error.message}`);
    }
  }
  throw lastError||new Error(`${role}: collaboration output failed`);
}
const candidate=await generate();
const review={
  version:3,gameId,date,department:role,status:'REVIEWED',round:2,
  runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,independentFirstRoundCompleted:true},
  protocol:'AGREE_COUNTER_TEST_RESULT_DECISION',
  agree:candidate.agree,counter:candidate.counter,test:candidate.test,result:candidate.result,decision:candidate.decision,
  ownSectionAddendum:candidate.ownSectionAddendum,unverified:candidate.unverified,
  guard:{mayRewriteOtherDepartments:false,productionApproval:false,numericQualityScore:false}
};
const output=path.join(base,'reviews',`${role}.json`);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log(`ARTBOOK_COLLAB_REVIEWED=${role}`);console.log(`ARTBOOK_COLLAB_FILE=${output}`);console.log('CROSS_DEPARTMENT_GHOSTWRITING=NO');
