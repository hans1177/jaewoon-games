// 역할: 5부서 제출물을 서로 교차검토하고 다음 revision에서 재사용 가능한 검증 피드백을 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import { validateDemoFeedback, decisions, defectRootCauses, dropRootCauses } from './artbook-demo-concept-gate.mjs';

const ROLES=['planning','graphics','development','qa','balance'];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(f,d=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`;}
const queue=readJson('artbook-submission-queue.json',{}),gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');
const base=path.join('artbook-submissions',gameId,date),submissions=Object.fromEntries(ROLES.map(role=>[role,readJson(path.join(base,`${role}.json`),null)]));
const missing=ROLES.filter(role=>!submissions[role]);
if(missing.length){console.log(`ARTBOOK_CROSS_REVIEW_SKIP=missing:${missing.join(',')}`);process.exit(0);}

const schema={type:'object',required:['DECISION','ROOT_CAUSE_CLASS','ROOT_CAUSE','EVIDENCE','UNITY_IMPLEMENTATION_NOTE','UNITY_ART_NOTE'],additionalProperties:false,properties:{DECISION:{type:'string',enum:decisions},ROOT_CAUSE_CLASS:{type:'string',enum:[...defectRootCauses,...dropRootCauses]},ROOT_CAUSE:{type:'string',minLength:20,maxLength:240},EVIDENCE:{type:'string',minLength:20,maxLength:300},UNITY_IMPLEMENTATION_NOTE:{type:'string',minLength:20,maxLength:260},UNITY_ART_NOTE:{type:'string',minLength:20,maxLength:260}}};
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const compactSubmission=(role,s)=>({role,readiness:s.departmentReadiness,headline:s.headline,section:s.section,conceptPlan:s.conceptPlan,unverified:s.unverified,verification:s.verification});
async function review(reviewer){
  const packet=ROLES.map(role=>compactSubmission(role,submissions[role]));
  const system=`/no_think\n너는 재운컴퍼니 ${reviewer} 부서의 교차검토 AI다. 다섯 부서 제출물의 일관성, 근거 연결, 구현 가능성, 검증 가능성을 비교한다. DECISION은 KEEP/CHANGE/DROP/FIX_REQUIRED 중 하나다. 시스템/도구/구현 결함은 DROP하지 말고 CHANGE 또는 FIX_REQUIRED로 분류한다. DROP은 DESIGN_REDUNDANT 또는 GOAL_CONFLICT에만 허용한다. 사실을 발명하지 말고 제공된 제출물 안의 구체 근거를 EVIDENCE에 적는다. 제작 승인이나 출시 승인을 만들지 않는다. JSON 스키마만 출력한다.`;
  const user=`gameId=${gameId}. reviewer=${reviewer}. 자기 부서 포함 5부서 결과를 서로 대조해 다음 revision에 가장 영향이 큰 피드백 1개를 작성해. ROOT_CAUSE_CLASS와 DECISION 계약을 반드시 지켜.\n${JSON.stringify(packet)}`;
  let last=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const res=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:user}],options:{temperature:0.08,seed:911+ROLES.indexOf(reviewer)*37+attempt,num_ctx:8192,num_predict:900}})});
      if(!res.ok)throw new Error(`ollama ${res.status}`);
      const body=await res.json(),raw=clean(body?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
      const feedback=JSON.parse(raw);
      validateDemoFeedback(gameId,feedback);
      return {reviewer,feedback,attempts:attempt};
    }catch(error){last=error;console.error(`ARTBOOK_CROSS_REVIEW_RETRY=${reviewer}:attempt=${attempt}:${clean(error.message)}`);}
  }
  throw last||new Error(`${reviewer}: cross review failed`);
}

const reviews=[];
for(const role of ROLES)reviews.push(await review(role));
const output=path.join(base,'cross-review.json');
writeJson(output,{version:1,gameId,date,generatedBy:'vibe2-local-open-model-cross-review',model,localInference:true,paidApi:false,productionApproval:false,reviews,contracts:{fiveDepartments:true,validatedFeedbackContract:true,systemDefectMayNotBeDropped:true,dropRequiresDesignRootCause:true,nextRevisionLearningEligible:true}});
console.log(`ARTBOOK_CROSS_REVIEW=${output}`);
console.log(`ARTBOOK_CROSS_REVIEW_COUNT=${reviews.length}`);
console.log('ARTBOOK_CROSS_REVIEW_VALIDATED=YES');
console.log('PAID_API=NO');
