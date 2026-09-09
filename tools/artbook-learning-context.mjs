// 역할: 과거 KEEP/CHANGE/DROP 결론과 장르 가설을 기존 work-order scope에 안전하게 재사용한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const MARK='[VIBE2_LEARNING_CONTEXT]';
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const readJson=(f,d=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return d;}};
const writeJson=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');
function kstDate(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`;}
const queue=readJson('artbook-submission-queue.json',{}),gameId=clean(process.env.ARTBOOK_GAME_ID||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||kstDate());
if(!gameId)throw new Error('ARTBOOK_GAME_ID is required');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`;
if(!fs.existsSync(workOrderPath)){console.log(`ARTBOOK_LEARNING_SKIP=no-work-order:${workOrderPath}`);process.exit(0);}
const workOrder=readJson(workOrderPath,{}),styles=readJson('artbook-style-profiles.json',{games:{}}),style=styles.games?.[gameId]||{};

function jsonFiles(root,out=[]){if(!fs.existsSync(root))return out;for(const e of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isDirectory())jsonFiles(p,out);else if(e.name.endsWith('.json'))out.push(p.replaceAll('\\','/'));}return out;}
const LABELS={keep:'KEEP',change:'CHANGE',drop:'DROP',unityimplementationnote:'UNITY_IMPLEMENTATION_NOTE',unityartnote:'UNITY_ART_NOTE'};
function collectFeedback(value,out=[]){
  if(Array.isArray(value)){for(const v of value)collectFeedback(v,out);return out;}
  if(!value||typeof value!=='object')return out;
  for(const [k,v] of Object.entries(value)){
    const nk=k.toLowerCase().replace(/[^a-z]/g,'');
    const label=LABELS[nk];
    if(label){
      const vals=Array.isArray(v)?v:[v];
      for(const item of vals){const text=clean(typeof item==='object'?JSON.stringify(item):item);if(text)out.push({type:label,text:text.slice(0,220)});}
    }
    collectFeedback(v,out);
  }
  return out;
}
const previousFiles=jsonFiles(path.join('artbook-submissions',gameId)).filter(f=>!f.includes(`/${date}/`));
const feedback=[];
for(const file of previousFiles){for(const row of collectFeedback(readJson(file,{}))){if(!feedback.some(x=>x.type===row.type&&x.text===row.text))feedback.push({...row,source:file});}}
const learned={};for(const type of Object.values(LABELS))learned[type]=feedback.filter(x=>x.type===type).slice(-3).map(({text,source})=>({text,source}));

const descriptor=[gameId,workOrder.gameName,style.identity,style.storyFocus,...(style.signatureSections||[])].map(clean).join(' ').toLowerCase();
const GENRES=[['survival',['survival','생존','craft','제작','hunger','허기']],['tower-defense',['tower defense','tower-defense','타워','방어','wave','웨이브']],['fishing',['fishing','낚시','fish','물고기']],['zombie-action',['zombie','좀비']],['action-rpg',['rpg','용사','quest','퀘스트','level','레벨']],['shooter',['shooter','shoot','gun','총','사격']],['platformer',['platform','점프','jump']],['puzzle',['puzzle','퍼즐']]];
let genre='general',hits=0;for(const [name,words] of GENRES){const n=words.filter(w=>descriptor.includes(w)).length;if(n>hits){genre=name;hits=n;}}
const genreHypothesis={name:genre,confidence:hits>=2?'MEDIUM':'LOW',basis:hits?`metadata/style keyword matches=${hits}`:'no reliable genre keyword; use general questions'};
const GENRE_QUESTIONS={survival:['핵심 생존 압박→탐색→채집/제작→위험 감수→귀환 루프가 끊기지 않는가?','위협 생물·자원·안전지대의 공간 논리가 플레이 선택을 만들고 있는가?'],'tower-defense':['웨이브 전 준비→배치→전투→보상→재투자의 판단 차이가 실제 플레이에 드러나는가?','적 역할과 타워 역할이 시각·수치·대응법에서 구분되는가?'],fishing:['탐색/캐스팅→입질→성공 판정→수집/판매→장비 성장 루프가 명확한가?','어종·지역·장비 차이가 단순 수치 증가가 아니라 선택을 만드는가?'],'zombie-action':['일반 적→엘리트/주기 보스→스킬 선택의 긴장 곡선이 누적되는가?','군중 가독성·이동 공간·피격 위험이 모바일에서도 즉시 읽히는가?'],'action-rpg':['퀘스트 원인→탐험/전투→보상→다음 목표의 인과가 이어지는가?','장비·성장·보스 패턴이 플레이 스타일 선택을 만드는가?'],shooter:['조준/이동→위협 우선순위→사격→재정비 루프의 피드백이 즉각적인가?','적 실루엣·탄도·피격 신호가 전투 판단을 충분히 지원하는가?'],platformer:['이동→점프 판단→실패/회복→숙련의 리듬이 공정한가?','발판·위험물·목표가 이동 중에도 즉시 구분되는가?'],puzzle:['규칙 학습→가설→시도→피드백→통찰의 단계가 자연스러운가?','새 규칙이 기존 규칙과 결합되며 복잡도만 늘리지 않고 선택을 넓히는가?'],general:['현재 게임의 핵심 행동→피드백→성장/다음 목표 루프가 무엇이며 어디서 끊기는가?','기획·그래픽·구현·QA·밸런스가 같은 플레이 목표를 서로 다른 근거로 검증하고 있는가?']};
const ROLE_FOCUS={planning:'원인→플레이어 행동→결과→다음 훅의 인과를 답한다.',graphics:'시각 계층·캐릭터/적 역할·모바일 가독성으로 답한다.',development:'기존 시스템 재사용·데이터 경계·Unity 구현 단위로 답한다.',qa:'실제 시작→핵심행동→성장→저장/재실행 시나리오로 답한다.',balance:'전투/성장/보상 수치의 선택 효과와 측정법으로 답한다.'};
const compactLearn=Object.entries(learned).flatMap(([type,rows])=>rows.slice(-2).map(x=>`${type}: ${x.text}`));
const questions=GENRE_QUESTIONS[genre]||GENRE_QUESTIONS.general;
workOrder.departmentTasks=workOrder.departmentTasks||{};
for(const role of ROLES){
  if(!workOrder.departmentTasks[role])continue;
  const old=clean(workOrder.departmentTasks[role].scope).split(MARK)[0].trim();
  const context=[MARK,`genreHypothesis=${genreHypothesis.name}(${genreHypothesis.confidence}); 확정 장르가 아니라 질문 선택용 가설이다.`,...questions.map((q,i)=>`genreQuestion${i+1}: ${q}`),`roleFocus: ${ROLE_FOCUS[role]}`,...compactLearn].join(' | ');
  workOrder.departmentTasks[role].scope=clean(`${old} ${context}`);
}
const outDir=path.join('artbook-submissions',gameId,date);fs.mkdirSync(outDir,{recursive:true});
const contextPath=path.join(outDir,'learning-context.json');
writeJson(contextPath,{version:1,gameId,date,generatedBy:'deterministic-artbook-learning-context',paidApi:false,genreHypothesis,genreQuestions:questions,learnedFeedback:learned,sourceFiles:previousFiles,contracts:{feedbackIsPriorEvidenceOnly:true,genreIsHypothesisOnly:true,noAutomaticRuleChange:true,noProductionApproval:true}});
writeJson(workOrderPath,workOrder);
console.log(`ARTBOOK_LEARNING_CONTEXT=${contextPath}`);
console.log(`ARTBOOK_GENRE_HYPOTHESIS=${genreHypothesis.name}:${genreHypothesis.confidence}`);
console.log(`ARTBOOK_FEEDBACK_REUSED=${compactLearn.length}`);
console.log('PAID_API=NO');
