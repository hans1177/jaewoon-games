// 파일명: tools/artbook-director-review.mjs
// 역할: 총괄이 5개 부서 결과물을 각각 보완점 1개 + 별점(5점 만점)으로 평가해 결과물당 5번째 표를 만든다.
// 원칙: 총괄은 부서 결과를 대신 작성/수정하지 않고 평가만 한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;}
function compact(value,depth=0){
  if(depth>3)return clean(typeof value==='object'?JSON.stringify(value):value).slice(0,180);
  if(Array.isArray(value))return value.slice(0,5).map(v=>compact(v,depth+1));
  if(value&&typeof value==='object'){const out={};for(const [key,val] of Object.entries(value).slice(0,10))out[key]=compact(val,depth+1);return out;}
  return clean(value).slice(0,220);
}
const normalizeStars=v=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(1,Math.min(5,n)):0;};

const queue=readJson('artbook-submission-queue.json',{});
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID missing');
const base=path.join('artbook-submissions',gameId,date),model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const submissions={};
for(const r of ROLES){
  const file=path.join(base,`${r}.json`),data=readJson(file,null);
  if(!data||String(data.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`first-round submission missing: ${r}`);
  submissions[r]={department:r,headline:clean(data.headline).slice(0,160),readiness:data.departmentReadiness||'NEEDS_VALIDATION',section:compact(data.section),evidence:compact(Array.isArray(data.evidence)?data.evidence:[]),unverified:compact(Array.isArray(data.unverified)?data.unverified:[])};
}

const system=`/no_think\n너는 재운컴퍼니 총괄이다. 지금 제공되는 부서 결과물 1개를 감독자 관점에서 평가한다. 부서 결과를 대신 작성하거나 수정하지 않는다. 장점은 쓰지 않는다. 보완점은 정확히 1개만 한국어 한 문장으로 쓴다. 별점은 1~5 정수이며 5점 만점이다. 별점은 본개발/출시 승인이나 게임 전체 품질점수가 아니라 해당 부서 결과물의 이번 검토 점수다. 근거가 부족하면 보완점에 검증 필요를 명시한다. 반드시 improvement와 stars만 가진 짧은 JSON 객체 하나를 출력한다.`;
const schema={type:'object',required:['improvement','stars'],properties:{improvement:{type:'string'},stars:{type:'integer',minimum:1,maximum:5}},additionalProperties:false};
async function callTarget(target,attempt){
  const strict=attempt>0?'보완점은 70자 이하 한 문장. 별점은 1~5 정수. 장점 금지. 설명 없이 완결된 JSON만 반환해.':'';
  const payload={gameId,date,reviewer:'director',targetDepartment:target,targetResult:submissions[target]};
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${strict}\n${JSON.stringify(payload)}`}],options:{temperature:0.08,seed:1701+ROLES.indexOf(target)*37+attempt,num_ctx:4096,num_predict:220}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json(),raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  if(!raw)throw new Error('empty JSON response');
  const value=JSON.parse(raw),improvement=clean(value?.improvement).slice(0,180),stars=normalizeStars(value?.stars);
  if(!improvement||stars<1||stars>5)throw new Error('invalid improvement/stars');
  return{targetDepartment:target,improvement,stars};
}
async function generateTarget(target){
  let lastError=null;
  for(let attempt=0;attempt<4;attempt++){
    try{return await callTarget(target,attempt);}
    catch(error){lastError=error;console.error(`ARTBOOK_DIRECTOR_RETRY=${target}:attempt=${attempt+1}:${error.message}`);}
  }
  throw lastError||new Error(`${target}: director rating failed`);
}
const ratings=[];
for(const target of ROLES)ratings.push(await generateTarget(target));
if(ratings.length!==5||new Set(ratings.map(x=>x.targetDepartment)).size!==5)throw new Error('director rating integrity failed');
const review={version:1,gameId,date,reviewer:'director',status:'REVIEWED',protocol:'DIRECTOR_IMPROVEMENT_STAR_5',reviewScope:'ALL_FIVE_DEPARTMENT_RESULTS',reviewedDepartments:[...ROLES],ratingScale:{type:'STARS',min:1,max:5},ratings,runner:{type:'vibe2-local-open-model-director-review',model,localInference:true,paidApi:false,oneDepartmentPerGeneration:true},guard:{mayRewriteDepartmentResults:false,productionApproval:false,starRatingIsProductionApproval:false}};
const output=path.join(base,'reviews','director.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log('ARTBOOK_DIRECTOR_REVIEWED=YES');console.log('ARTBOOK_DIRECTOR_RATINGS=5/5');console.log(`ARTBOOK_DIRECTOR_REVIEW_FILE=${output}`);console.log('DIRECTOR_GHOSTWRITING=NO');console.log('PRODUCTION_APPROVAL=NO');
