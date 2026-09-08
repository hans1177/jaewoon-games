// 파일명: tools/artbook-collaboration-runner.mjs
// 역할: 1차 제출 5/5 뒤 각 부서가 자기 결과를 제외한 타부서 4개 결과에 보완점 1개 + 별점(5점 만점)을 남긴다.
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
  if(value&&typeof value==='object'){const out={};for(const [key,val] of Object.entries(value).slice(0,10))out[key]=compact(val,depth+1);return out;}
  return clean(value).slice(0,220);
}
const normalizeStars=v=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(1,Math.min(5,n)):0;};
const normalizeCandidate=(value,expectedPeers)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const raw=Array.isArray(value.peerReviews)?value.peerReviews:[];
  const peerReviews=raw.map(item=>({targetDepartment:clean(item?.targetDepartment),improvement:clean(item?.improvement).slice(0,180),stars:normalizeStars(item?.stars)})).filter(item=>expectedPeers.includes(item.targetDepartment));
  return{peerReviews};
};
const validCandidate=(value,expectedPeers)=>{
  if(!value||value.peerReviews.length!==expectedPeers.length)return false;
  const seen=new Set();
  for(const item of value.peerReviews){if(seen.has(item.targetDepartment)||!expectedPeers.includes(item.targetDepartment)||!item.improvement||item.stars<1||item.stars>5)return false;seen.add(item.targetDepartment);}
  return expectedPeers.every(x=>seen.has(x));
};

const queue=readJson('artbook-submission-queue.json',{});
const gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
const base=path.join('artbook-submissions',gameId,date),model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const submissions={};
for(const r of ROLES){
  const file=path.join(base,`${r}.json`),data=readJson(file,null);
  if(!data||String(data.status||'').toUpperCase()!=='SUBMITTED')throw new Error(`first-round submission missing: ${r}`);
  submissions[r]={department:r,headline:clean(data.headline).slice(0,160),readiness:data.departmentReadiness||'NEEDS_VALIDATION',section:compact(data.section),unverified:compact(Array.isArray(data.unverified)?data.unverified:[])};
}
const peers=Object.values(submissions).filter(x=>x.department!==role),peerRoles=peers.map(x=>x.department);
const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서다. 타부서 4개 결과물만 평가한다. 자기 부서 결과는 절대 평가하지 않는다. 각 타부서 결과마다 보완점은 정확히 1개만 한국어 한 문장으로 쓴다. 장점은 쓰지 않는다. 별점은 1~5 정수이며 5점 만점이다. 별점은 본개발/출시 승인이나 게임 전체 품질점수가 아니라 해당 부서 결과물의 이번 검토 점수다. 근거가 약하면 보완점에 검증 필요를 명시한다. 다른 부서 내용을 대신 작성하거나 수정하지 않는다. 반드시 peerReviews 배열만 가진 짧은 JSON 객체 하나를 출력한다.`;
const payload={gameId,date,reviewingDepartment:role,peerFirstRounds:peers,peerDepartments:peerRoles};
const schema={type:'object',required:['peerReviews'],properties:{peerReviews:{type:'array',minItems:4,maxItems:4,items:{type:'object',required:['targetDepartment','improvement','stars'],properties:{targetDepartment:{type:'string',enum:peerRoles},improvement:{type:'string'},stars:{type:'integer',minimum:1,maximum:5}},additionalProperties:false}}},additionalProperties:false};
async function call(numPredict,strict=false){
  const strictMessage=strict?'각 타부서를 정확히 한 번씩 평가해. 보완점은 70자 이하 한 문장, 별점은 1~5 정수. 장점/자기부서 평가 금지. 완결된 JSON만 반환해.':'';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:`${strictMessage}\n${JSON.stringify(payload)}`}],options:{temperature:0.1,seed:701+ROLES.indexOf(role)*131,num_ctx:8192,num_predict:numPredict}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();const raw=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim();return JSON.parse(raw);
}
async function generate(){
  const attempts=[360,260,200];let lastError=null;
  for(let i=0;i<attempts.length;i++){
    try{const candidate=normalizeCandidate(await call(attempts[i],i>0),peerRoles);if(validCandidate(candidate,peerRoles))return candidate;lastError=new Error('required peer ratings missing');console.error(`ARTBOOK_COLLAB_FORMAT_RETRY=${role}:attempt=${i+1}`);}
    catch(error){lastError=error;console.error(`ARTBOOK_COLLAB_RETRY=${role}:attempt=${i+1}:${error.message}`);}
  }
  throw lastError||new Error(`${role}: collaboration output failed`);
}
const candidate=await generate();
const review={version:5,gameId,date,department:role,status:'REVIEWED',round:2,runner:{type:'vibe2-local-open-model-department-bot',model,localInference:true,paidApi:false,independentFirstRoundCompleted:true},protocol:'PEER_IMPROVEMENT_STAR_5',reviewScope:'OTHER_DEPARTMENTS_ONLY',reviewedDepartments:peerRoles,ratingScale:{type:'STARS',min:1,max:5},peerReviews:candidate.peerReviews,guard:{mayRewriteOtherDepartments:false,mayEvaluateOwnDepartment:false,productionApproval:false,starRatingIsProductionApproval:false}};
const output=path.join(base,'reviews',`${role}.json`);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2)+'\n');
console.log(`ARTBOOK_COLLAB_REVIEWED=${role}`);console.log(`ARTBOOK_PEER_RATINGS=${role}:4/4`);console.log(`ARTBOOK_COLLAB_FILE=${output}`);console.log('SELF_RESULT_RATING=NO');console.log('CROSS_DEPARTMENT_GHOSTWRITING=NO');
