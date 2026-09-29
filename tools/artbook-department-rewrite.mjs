// 역할: 5부서 제출물의 얕은 내용을 감지하고 같은 로컬 모델에 실패 원인을 돌려 최대 2회 재작성한다.
import fs from 'node:fs';
import path from 'node:path';
import { departmentInformationProblems, ROLE_SECTION_KEYS } from './artbook-semantic-quality.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const role=clean(process.env.ARTBOOK_ROLE);
const gameId=clean(process.env.ARTBOOK_GAME_ID);
const date=clean(process.env.ARTBOOK_DATE);
if(!ROLE_SECTION_KEYS[role])throw new Error('ARTBOOK_ROLE is required');
if(!gameId||!date)throw new Error('ARTBOOK_GAME_ID and ARTBOOK_DATE are required');
const file=path.join('artbook-submissions',gameId,date,`${role}.json`);
const factFile=path.join('artbook-submissions',gameId,date,'fact-pack.json');
const readJson=(f,fallback=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return fallback;}};
const writeJson=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');
let submission=readJson(file,null);
if(!submission)throw new Error(`missing department submission: ${file}`);
let problems=departmentInformationProblems(role,submission);
if(!problems.length){console.log(`ARTBOOK_REWRITE=${role}:NOT_NEEDED`);process.exit(0);}
if(submission.runner?.type!=='vibe2-local-open-model-department-bot'){
  console.log(`ARTBOOK_REWRITE=${role}:SKIP_EXTERNAL_SUBMISSION`);
  process.exit(0);
}
const factPack=readJson(factFile,{});
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||submission.runner?.model||'qwen3:0.6b');
const schema={type:'object',required:['headline','readiness','section','conceptPlan','unverified','visualNotes'],additionalProperties:false,properties:{headline:{type:'string',minLength:4,maxLength:140},readiness:{type:'string',enum:['READY','NEEDS_VALIDATION','BLOCKED']},section:{type:'object',required:ROLE_SECTION_KEYS[role],additionalProperties:false,properties:Object.fromEntries(ROLE_SECTION_KEYS[role].map(k=>[k,{type:'string',minLength:20,maxLength:180}]))},conceptPlan:{type:'object',required:['creativeIdeas','implementationPlan','demoValidation'],additionalProperties:false,properties:{creativeIdeas:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:20,maxLength:180}},implementationPlan:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:20,maxLength:180}},demoValidation:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:20,maxLength:180}}}},unverified:{type:'array',maxItems:4,items:{type:'string',maxLength:180}},visualNotes:{type:'array',minItems:1,maxItems:3,items:{type:'string',maxLength:180}}}};
async function rewriteOnce(current,issues,attempt){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:'/no_think\n너는 재운컴퍼니 아트북 품질 교정 AI다. 근거 없는 사실·수치·승인을 만들지 않는다. 서로 다른 필드에 서로 다른 정보를 쓰고 true/false/none/1/0 같은 채움값을 쓰지 않는다. 기존 readiness의 검증 수준을 과장하지 않는다.'},{role:'user',content:JSON.stringify({department:role,attempt,qualityProblems:issues,current:{headline:current.headline,readiness:current.departmentReadiness||current.readiness,section:current.section,conceptPlan:current.conceptPlan,unverified:current.unverified,visualNotes:current.visualNotes},factPack})}],options:{temperature:0.12,seed:707+attempt*31,num_ctx:8192,num_predict:1500}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();
  return JSON.parse(clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim());
}
let attempts=0;
for(;attempts<2&&problems.length;attempts++){
  try{
    const revised=await rewriteOnce(submission,problems,attempts+1);
    const nextProblems=departmentInformationProblems(role,revised);
    submission={...submission,headline:revised.headline,departmentReadiness:revised.readiness,section:revised.section,conceptPlan:revised.conceptPlan,unverified:revised.unverified,visualNotes:revised.visualNotes,runner:{...submission.runner,semanticRewrite:true,semanticRewriteAttempts:attempts+1,lastSemanticProblems:problems}};
    problems=nextProblems;
  }catch(error){console.error(`ARTBOOK_REWRITE_RETRY=${role}:attempt=${attempts+1}:${error.message}`);}
}
writeJson(file,submission);
console.log(`ARTBOOK_REWRITE=${role}:${problems.length?'STILL_SHALLOW':'PASS'}`);
console.log(`ARTBOOK_REWRITE_ATTEMPTS=${attempts}`);
if(problems.length){console.error(`ARTBOOK_REWRITE_PROBLEMS=${problems.join(',')}`);process.exit(2);}
