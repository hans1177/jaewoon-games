// 파일명: tools/artbook-second-work-runner.mjs
// 역할: 5표 평균이 전체 부서 평균 이하로 선택된 부서만 같은 날 즉시 보완하고, 나머지 부서는 1차 결과를 그대로 이월한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const readJson=(f,d=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const role=clean(process.env.ARTBOOK_ROLE||process.argv.find(x=>x.startsWith('--role='))?.split('=')[1]);
if(!ROLES.includes(role))throw new Error('invalid ARTBOOK_ROLE');
const queue=readJson('artbook-submission-queue.json',{}),date=clean(process.env.ARTBOOK_DATE),gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),workOrder=readJson(`artbook-work-orders/${date}-${gameId}.json`,{});
if(String(workOrder.mode||'').toUpperCase()!=='SECOND_WORK')throw new Error('second-work order required');
const sourceDate=clean(workOrder.secondWork?.sourceDate),selected=Array.isArray(workOrder.secondWork?.selectedDepartments)?workOrder.secondWork.selectedDepartments:[];
if(!sourceDate)throw new Error('second-work sourceDate missing');
const previousPath=`artbook-submissions/${gameId}/${sourceDate}/${role}.json`,previous=readJson(previousPath,null);
if(!previous)throw new Error(`previous submission missing: ${previousPath}`);
const output=`artbook-submissions/${gameId}/${date}/${role}.json`,sourceVisual=`artbook-submissions/${gameId}/${sourceDate}/visuals/${role}.svg`,outputVisual=`artbook-submissions/${gameId}/${date}/visuals/${role}.svg`;
fs.mkdirSync(path.dirname(outputVisual),{recursive:true});

if(!selected.includes(role)){
  const carried={...previous,date,status:'SUBMITTED',workRound:2,revision:{type:'CARRIED_FORWARD',sourceDate,selectedForSecondWork:false,sectionChanged:false}};
  writeJson(output,carried);
  if(fs.existsSync(sourceVisual)&&path.resolve(sourceVisual)!==path.resolve(outputVisual))fs.copyFileSync(sourceVisual,outputVisual);
  else if(!fs.existsSync(outputVisual))fs.writeFileSync(outputVisual,`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#102d42"/><text x="60" y="100" fill="white" font-size="32">${NAMES[role]} · carried forward</text></svg>`);
  console.log(`ARTBOOK_SECOND_WORK_CARRIED=${role}`);console.log(`ARTBOOK_SECOND_WORK_SAME_DAY=${sourceDate===date?'YES':'NO'}`);process.exit(0);
}

const feedback=(workOrder.secondWork?.feedbackByDepartment?.[role]||[]).map(x=>({reviewerDepartment:x.reviewerDepartment,reviewerType:x.reviewerType||'department',stars:x.stars,improvement:clean(x.improvement)}));
if(feedback.length!==5)throw new Error(`${role}: exactly five feedback votes required`);
if(feedback.filter(x=>x.reviewerDepartment==='director').length!==1)throw new Error(`${role}: director fifth vote missing`);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const system=`/no_think\n너는 재운컴퍼니 ${NAMES[role]} 부서다. 같은 날 1차 결과가 타부서 4표 + 총괄 1표의 5표 평균 기준으로 전체 부서 평균 이하라 즉시 2차 작업을 한다. previousSubmission의 자기 부서 내용과 receivedFiveVoteFeedback의 보완점만 사용해 자기 부서 결과를 개선한다. 다른 부서 섹션을 대신 쓰지 않는다. 근거가 없는 새 사실/설정은 추가하지 않는다. 해결할 수 없는 보완점은 unverified에 남긴다. 별점 자체를 올리기 위한 과장이나 본개발/출시 승인을 만들지 않는다. JSON 객체만 반환하고 최상위 키는 headline, readiness, section, unverified다. section은 반드시 객체다.`;
const payload={gameId,date,sourceDate,department:role,previousSubmission:{headline:previous.headline,departmentReadiness:previous.departmentReadiness,section:previous.section,evidence:previous.evidence,unverified:previous.unverified},receivedFiveVoteFeedback:feedback};
async function call(limit,strict=false){
  const note=strict?'headline 80자 이하, section 각 값은 짧게, unverified 최대 4개. 완결된 JSON만 반환해.':'';
  const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,format:'json',messages:[{role:'system',content:system},{role:'user',content:`${note}\n${JSON.stringify(payload)}`}],options:{temperature:0.1,seed:1701+ROLES.indexOf(role)*97,num_ctx:8192,num_predict:limit}})});
  if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
  const packet=await response.json();return JSON.parse(clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'').trim());
}
let candidate=null,lastError=null;
for(const [i,limit] of [620,420,300].entries()){
  try{const x=await call(limit,i>0);if(x&&x.section&&typeof x.section==='object'&&!Array.isArray(x.section)&&Object.keys(x.section).length){candidate=x;break;}lastError=new Error('section object missing');}catch(error){lastError=error;}
}
if(!candidate)throw lastError||new Error(`${role}: second work failed`);
const readiness=String(candidate.readiness||previous.departmentReadiness||'NEEDS_VALIDATION').toUpperCase();
const revised={...previous,date,status:'SUBMITTED',workRound:2,headline:clean(candidate.headline||previous.headline).slice(0,160),departmentReadiness:['READY','NEEDS_VALIDATION','BLOCKED'].includes(readiness)?readiness:'NEEDS_VALIDATION',section:candidate.section,unverified:Array.isArray(candidate.unverified)?candidate.unverified.map(clean).filter(Boolean).slice(0,6):(previous.unverified||[]),revision:{type:'SECOND_WORK',sourceDate,selectedForSecondWork:true,sectionChanged:true,criterion:'FIVE_VOTE_AVERAGE_OR_BELOW_OVERALL_AVERAGE',receivedFiveVoteFeedback:feedback}};
writeJson(output,revised);
const escaped=clean(revised.headline).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&apos;'}[c]));
fs.writeFileSync(outputVisual,`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#102d42"/><rect x="54" y="54" width="1092" height="567" rx="32" fill="#07131d" fill-opacity=".42"/><text x="78" y="115" fill="#90dbff" font-size="24">${NAMES[role]} 부서 · 2차 작업</text><text x="78" y="180" fill="white" font-size="32">${escaped}</text><text x="78" y="590" fill="#89aabe" font-size="18">타부서 4표 + 총괄 1표 보완점 반영 · 제작 승인 아님</text></svg>`);
console.log(`ARTBOOK_SECOND_WORK_REVISED=${role}`);console.log(`ARTBOOK_SECOND_WORK_FEEDBACK=${feedback.length}/5`);console.log('ARTBOOK_SECOND_WORK_DIRECTOR_VOTE=1/1');console.log(`ARTBOOK_SECOND_WORK_SAME_DAY=${sourceDate===date?'YES':'NO'}`);console.log('PRODUCTION_APPROVAL=NO');
