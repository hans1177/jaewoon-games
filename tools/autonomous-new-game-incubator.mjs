import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const REVIEW_ROLES=['planning','graphics','development','qa','balance'];
const MODEL_TIMEOUT_MS=Number(process.env.INCUBATOR_MODEL_TIMEOUT_MS||240000);
const MODEL_MAX_PREDICT=Math.max(1024,Math.min(6144,Number(process.env.INCUBATOR_MODEL_MAX_PREDICT||1536)));
const MAX_QUALITY_ATTEMPTS_PER_KST_DAY=3;
const clean=v=>String(v??'').trim();
const unique=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const slugify=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return structuredClone(fallback);}};
const writeJson=(file,value)=>{fs.mkdirSync(file.includes('/')?file.slice(0,file.lastIndexOf('/')):'.',{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const firstText=(...values)=>{for(const value of values){const text=clean(value);if(text)return text;}return'';};
const listFrom=value=>{
  if(Array.isArray(value))return unique(value);
  if(typeof value!=='string')return[];
  return unique(value.split(/\r?\n|[|;•]+/).map(x=>x.replace(/^\s*(?:[-*]|\d+[.)])\s*/,'')));
};
const firstList=(...values)=>{for(const value of values){const items=listFrom(value);if(items.length)return items;}return[];};
const fillTo=(items,count,factories)=>{const out=unique(items);for(const factory of factories){if(out.length>=count)break;const value=clean(typeof factory==='function'?factory():factory);if(value&&!out.includes(value))out.push(value);}return out.slice(0,Math.max(count,out.length));};

function kstDate(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=type=>parts.find(x=>x.type===type)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const qualityRejected=candidate=>candidate?.status==='REDESIGN_REQUIRED'&&candidate?.qualityGate?.pass===false;
export function conceptCreatedOnKstDate(state,date=kstDate()){
  return (state.candidates||[]).some(candidate=>!qualityRejected(candidate)&&candidate.createdAt&&kstDate(candidate.createdAt)===date);
}
export function qualityAttemptsOnKstDate(state,date=kstDate()){
  return (state.candidates||[]).filter(candidate=>candidate.createdAt&&kstDate(candidate.createdAt)===date).length;
}

export function normalizeIncubatorState(raw={}){
  const state=raw&&typeof raw==='object'&&!Array.isArray(raw)?structuredClone(raw):{};
  state.version=Math.max(2,Number(state.version)||0);
  state.status=clean(state.status)||'ACTIVE';
  if(!Array.isArray(state.candidates))state.candidates=[];
  if(!Number.isInteger(state.nextCandidateNumber)||state.nextCandidateNumber<1)state.nextCandidateNumber=1;
  return state;
}

export function normalizeOperationalConceptProposal(input={}){
  const proposal=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const name=firstText(proposal.name,proposal.gameName,proposal.title);
  const slug=slugify(firstText(proposal.slug,name));
  const identitySentence=firstText(proposal.identitySentence,proposal.identity,proposal.differentiation);
  const coreLoop=firstText(proposal.coreLoop,proposal.gameplayLoop,proposal.loop);
  const storyHook=firstText(proposal.storyHook,proposal.story,proposal.worldHook);
  const prototypeHypothesis=firstText(proposal.prototypeHypothesis,proposal.hypothesis,proposal.testHypothesis);
  const styleProfile=firstText(proposal.styleProfile,proposal.visualStyle,proposal.style);

  let signatureSystems=firstList(proposal.signatureSystems,proposal.signatureSystem,proposal.signatureMechanics,proposal.signatureMechanic);
  let signatureScenes=firstList(proposal.signatureScenes,proposal.signatureScene,proposal.keyScenes,proposal.memorableScenes);
  let worldRules=firstList(proposal.worldRules,proposal.worldRule,proposal.rules);
  let forbiddenPatterns=firstList(proposal.forbiddenPatterns,proposal.forbiddenPattern,proposal.forbidden,proposal.antiPatterns);
  let risks=firstList(proposal.risks,proposal.risk,proposal.keyRisks);

  // The local model owns the creative spine. Deterministic completion only fills list-shaped
  // contract slots so malformed small-model output can be evaluated instead of blindly accepted.
  if(name&&coreLoop&&storyHook&&prototypeHypothesis){
    signatureSystems=fillTo(signatureSystems,1,[`${name}: ${coreLoop}의 선택 결과가 다음 플레이 상태를 바꾸는 핵심 연계 시스템`]);
    signatureScenes=fillTo(signatureScenes,3,[
      `${name} 시작 장면: ${storyHook}가 플레이 공간에서 처음 드러난다`,
      `${name} 중반 장면: ${coreLoop}의 선택 결과가 즉시 눈에 보이게 뒤집힌다`,
      `${name} 검증 장면: ${prototypeHypothesis}를 한 번의 플레이로 확인한다`,
    ]);
    worldRules=fillTo(worldRules,5,[
      `${storyHook}는 배경 설명이 아니라 이동·전투·선택 중 최소 하나를 실제로 바꾼다`,
      `${coreLoop}의 각 단계 결과는 다음 단계에 원인과 결과로 이어진다`,
      `핵심 위험과 보상은 선택 전에 화면에서 읽을 수 있어야 한다`,
      `실패 후에는 다음 시도에서 활용할 수 있는 학습 정보가 남는다`,
      `같은 상황을 변화 없이 반복하는 진행은 허용하지 않는다`,
    ]);
    forbiddenPatterns=fillTo(forbiddenPatterns,3,[
      `기존 게임의 이름과 그래픽만 바꾼 복제형 핵심루프`,
      `설명에는 있지만 실제 입력과 결과를 바꾸지 않는 대표 시스템`,
      `체력·공격력 숫자만 커져서 정체성을 대신하는 성장과 보스`,
    ]);
    risks=fillTo(risks,2,[
      `${coreLoop}가 첫 플레이에서 복잡하게 느껴질 위험`,
      `모바일 화면에서 대표 시스템의 원인과 결과가 충분히 읽히지 않을 위험`,
    ]);
  }

  return{name,slug,identitySentence,coreLoop,storyHook,signatureSystems,signatureScenes,worldRules,forbiddenPatterns,prototypeHypothesis,risks,styleProfile};
}

export function validateOperationalConcept(concept={}){
  const missing=[];
  if(!clean(concept.name))missing.push('name');
  if(!clean(concept.identitySentence))missing.push('identitySentence');
  if(!clean(concept.coreLoop))missing.push('coreLoop');
  if(!clean(concept.storyHook))missing.push('storyHook');
  if(unique(concept.signatureSystems).length<1)missing.push('signatureSystems>=1');
  if(unique(concept.signatureScenes).length<3)missing.push('signatureScenes>=3');
  if(unique(concept.worldRules).length<5)missing.push('worldRules>=5');
  if(unique(concept.forbiddenPatterns).length<3)missing.push('forbiddenPatterns>=3');
  if(!clean(concept.prototypeHypothesis))missing.push('prototypeHypothesis');
  if(unique(concept.risks).length<2)missing.push('risks>=2');
  if(!clean(concept.styleProfile))missing.push('styleProfile');
  return{pass:missing.length===0,missing};
}

export function evaluateOperationalConceptQuality(concept={}){
  const reasons=[];
  const name=clean(concept.name),identity=clean(concept.identitySentence),loop=clean(concept.coreLoop),story=clean(concept.storyHook);
  if(/재운\s*컴퍼니|신규\s*게임|게임\s*후보|후보\s*\d*|new\s*game|candidate/i.test(name))reasons.push('PLACEHOLDER_OR_COMPANY_TITLE');
  if(/재운\s*컴퍼니|회사|company/i.test(`${identity} ${loop} ${story}`))reasons.push('COMPANY_META_CONCEPT');
  const phases=loop.split(/\s*(?:→|->|⇒|▶|\|)\s*/).map(clean).filter(Boolean);
  if(phases.length<3||new Set(phases.map(x=>x.toLowerCase())).size<3)reasons.push('CORE_LOOP_NOT_ACTION_SEQUENCE');
  if(/전략적 역할|경험을 제공|경험을 개선|신뢰를 구축|다양한 전략/i.test(loop)&&phases.length<3)reasons.push('GENERIC_ABSTRACT_LOOP');
  const systems=unique(concept.signatureSystems),scenes=unique(concept.signatureScenes);
  if(!systems.some(x=>!x.includes('선택 결과가 다음 플레이 상태를 바꾸는 핵심 연계 시스템')))reasons.push('NO_MODEL_AUTHORED_SIGNATURE_SYSTEM');
  if(!scenes.some(x=>!/( 시작 장면:| 중반 장면:| 검증 장면:)/.test(x)))reasons.push('NO_MODEL_AUTHORED_SIGNATURE_SCENE');
  const styleWords=clean(concept.styleProfile).toLowerCase().split(/[\s,;/+]+/).filter(Boolean);
  if(styleWords.length>=4&&new Set(styleWords).size<=2)reasons.push('REPETITIVE_STYLE_PROFILE');
  return{pass:reasons.length===0,reasons};
}

export function nextPortfolioProjectId(portfolio={}){
  const max=Math.max(0,...(portfolio.projects||[]).map(p=>Number(String(p.id||'').match(/^P(\d+)$/)?.[1]||0)));
  return `P${String(max+1).padStart(4,'0')}`;
}

function activeCandidate(state){return(state.candidates||[]).find(c=>['CONCEPT_CREATED','ARTBOOK_QUEUED','ARTBOOK_COMPLETE','PROTOTYPE_REGISTERED'].includes(c.status)&&c.prototypeDevComplete!==true)||null;}
function candidateId(state){state.nextCandidateNumber??=1;return`NG${String(state.nextCandidateNumber++).padStart(5,'0')}`;}

function conceptDigest(concept){
  return [concept.styleProfile,`정체성:${concept.identitySentence}`,`핵심루프:${concept.coreLoop}`,`스토리:${concept.storyHook}`,`대표시스템:${concept.signatureSystems.join(' / ')}`,`대표장면:${concept.signatureScenes.join(' / ')}`,`세계규칙:${concept.worldRules.join(' / ')}`,`금지:${concept.forbiddenPatterns.join(' / ')}`,`가설:${concept.prototypeHypothesis}`].join(' | ').slice(0,1800);
}

export function createOperationalCandidate(state,portfolio,concept,timestamp=new Date().toISOString()){
  const v=validateOperationalConcept(concept);if(!v.pass)throw new Error(`신규 컨셉 불완전: ${v.missing.join(', ')}`);
  const quality=evaluateOperationalConceptQuality(concept);if(!quality.pass)throw new Error(`신규 컨셉 품질게이트 실패: ${quality.reasons.join(', ')}`);
  const active=activeCandidate(state);if(active)throw new Error(`동시 신규게임 후보 금지: ${active.id}`);
  if(conceptCreatedOnKstDate(state,kstDate(timestamp)))throw new Error('하루 유효 신규게임 컨셉 1개 제한');
  const slug=slugify(concept.slug||concept.name);if(!slug)throw new Error('slug 생성 실패');
  if((portfolio.projects||[]).some(p=>p.slug===slug||clean(p.name).toLowerCase()===clean(concept.name).toLowerCase()))throw new Error('기존 게임과 이름/slug 중복');
  const reservedProjectId=nextPortfolioProjectId(portfolio);
  state.candidates??=[];
  const candidate={id:candidateId(state),reservedProjectId,artbookGameId:`incubator-${reservedProjectId.toLowerCase()}-${slug}`,status:'CONCEPT_CREATED',concept:{name:clean(concept.name),slug,identitySentence:clean(concept.identitySentence),coreLoop:clean(concept.coreLoop),storyHook:clean(concept.storyHook),signatureSystems:unique(concept.signatureSystems),signatureScenes:unique(concept.signatureScenes),worldRules:unique(concept.worldRules),forbiddenPatterns:unique(concept.forbiddenPatterns),prototypeHypothesis:clean(concept.prototypeHypothesis),risks:unique(concept.risks),styleProfile:clean(concept.styleProfile)},qualityGate:quality,artbookId:null,artbookSourceFile:null,prototypeRegisteredAt:null,prototypeDevComplete:false,publicReleaseApproved:false,createdAt:timestamp,updatedAt:timestamp};
  state.candidates.push(candidate);return candidate;
}

export function recordRejectedConcept(state,portfolio,concept,quality,timestamp=new Date().toISOString()){
  const slug=slugify(concept.slug||concept.name||'rejected-concept');
  const rejected={id:candidateId(state),reservedProjectId:nextPortfolioProjectId(portfolio),artbookGameId:null,status:'REDESIGN_REQUIRED',concept:{...concept,slug},qualityGate:{pass:false,reasons:unique(quality?.reasons)},prototypeDevComplete:false,publicReleaseApproved:false,createdAt:timestamp,updatedAt:timestamp};
  state.candidates??=[];state.candidates.push(rejected);return rejected;
}

export function quarantineLowQualityCandidate(candidate,queue,timestamp=new Date().toISOString()){
  const quality=evaluateOperationalConceptQuality(candidate.concept||{});if(quality.pass)return{quarantined:false,quality};
  candidate.status='REDESIGN_REQUIRED';candidate.qualityGate=quality;candidate.updatedAt=timestamp;candidate.redesignRequiredAt=timestamp;
  queue.queueOrder=(queue.queueOrder||[]).filter(id=>id!==candidate.artbookGameId);
  const game=(queue.games||[]).find(g=>g.gameId===candidate.artbookGameId);if(game){game.status='REDESIGN_REQUIRED';game.currentStage='incubator-concept-redesign';game.formalProductionAllowed=false;game.qualityGate=quality;}
  return{quarantined:true,quality};
}

export function enqueueOperationalArtbook(candidate,queue,timestamp=new Date().toISOString()){
  if(candidate.status!=='CONCEPT_CREATED')throw new Error(`아트북 큐 상태 오류: ${candidate.status}`);
  const quality=evaluateOperationalConceptQuality(candidate.concept||{});if(!quality.pass)throw new Error(`아트북 투자 차단: ${quality.reasons.join(', ')}`);
  queue.games??=[];queue.queueOrder??=[];
  if(!queue.games.some(g=>g.gameId===candidate.artbookGameId))queue.games.push({gameId:candidate.artbookGameId,name:candidate.concept.name,source:'INCUBATOR_METADATA_ONLY',status:'QUEUED',sectionsReady:[],requiredSections:5,styleProfile:conceptDigest(candidate.concept),currentStage:'incubator-artbook-review',incubatorCandidateId:candidate.id,reservedProjectId:candidate.reservedProjectId,incubatorConcept:candidate.concept,formalProductionAllowed:false});
  if(!queue.queueOrder.includes(candidate.artbookGameId)){const currentIndex=queue.queueOrder.indexOf(queue.currentDailyTarget);const insertion=currentIndex>=0?currentIndex+1:queue.queueOrder.length;queue.queueOrder.splice(insertion,0,candidate.artbookGameId);}
  candidate.status='ARTBOOK_QUEUED';candidate.artbookQueuedAt=timestamp;candidate.updatedAt=timestamp;queue.updatedAt=timestamp.slice(0,10);return candidate;
}

export function detectCompletedIncubatorArtbook(candidate,registry={}){
  const matches=(registry.artbooks||[]).filter(book=>book.gameId===candidate.artbookGameId&&book.status==='completed-artbook'&&book.productionApproval===false);
  const book=matches.at(-1);if(!book)return{complete:false,reason:'NO_COMPLETED_ARTBOOK'};
  const opinions=book.departmentOpinions||{};
  const fiveOpinions=REVIEW_ROLES.every(role=>opinions[role]&&Number(opinions[role].reviewsReceived)===5);
  const collaboration=book.collaboration?.allFiveDepartmentsReviewed===true||fiveOpinions;
  const cutsOk=Array.isArray(book.cuts)&&book.cuts.length===10;
  if(!fiveOpinions||!collaboration||!cutsOk)return{complete:false,reason:'ARTBOOK_EVIDENCE_INCOMPLETE',bookId:book.id};
  return{complete:true,bookId:book.id,sourceFile:book.sourceFile||null,book};
}

export function registerPrototypeAfterArtbook(candidate,portfolio,registry,timestamp=new Date().toISOString()){
  if(!['ARTBOOK_QUEUED','ARTBOOK_COMPLETE'].includes(candidate.status))throw new Error(`프로토타입 등록 상태 오류: ${candidate.status}`);
  const quality=evaluateOperationalConceptQuality(candidate.concept||{});if(!quality.pass)return{registered:false,evidence:{complete:false,reason:'CONCEPT_QUALITY_REGRESSION',quality}};
  const evidence=detectCompletedIncubatorArtbook(candidate,registry);if(!evidence.complete)return{registered:false,evidence};
  candidate.status='ARTBOOK_COMPLETE';candidate.artbookId=evidence.bookId;candidate.artbookSourceFile=evidence.sourceFile;candidate.updatedAt=timestamp;
  portfolio.projects??=[];
  const existing=portfolio.projects.find(p=>p.id===candidate.reservedProjectId||p.incubatorCandidateId===candidate.id);
  if(existing){candidate.status='PROTOTYPE_REGISTERED';candidate.prototypeRegisteredAt??=timestamp;return{registered:false,existing:true,project:existing,evidence};}
  const project={id:candidate.reservedProjectId,slug:candidate.concept.slug,name:candidate.concept.name,sourcePath:`web-games/${candidate.concept.slug}`,profileStatus:'NEW_PROTOTYPE_PENDING_SOURCE',mode:'PROTOTYPE',protectedValues:['save-meaning','core-loop'],incubatorCandidateId:candidate.id,artbookId:candidate.artbookId,identitySentence:candidate.concept.identitySentence,prototypeHypothesis:candidate.concept.prototypeHypothesis,publicReleaseApproved:false};
  portfolio.projects.push(project);candidate.status='PROTOTYPE_REGISTERED';candidate.prototypeRegisteredAt=timestamp;candidate.updatedAt=timestamp;
  return{registered:true,project,evidence};
}

function summarizeArtbook(book){
  if(!book)return null;
  const opinions=Object.fromEntries(REVIEW_ROLES.map(role=>[role,book.departmentOpinions?.[role]?{averageStars:book.departmentOpinions[role].averageStars,priorityImprovement:clean(book.departmentOpinions[role].priorityImprovement),readiness:clean(book.departmentOpinions[role].readiness)}:null]));
  return{id:book.id,title:clean(book.title),subtitle:clean(book.subtitle),status:book.status,productionApproval:book.productionApproval===true,cuts:(book.cuts||[]).slice(0,10).map(cut=>({no:cut.no,title:clean(cut.title),body:clean(cut.body).slice(0,700)})),departmentOpinions:opinions};
}

export function buildPrototypeRequest(candidate,portfolio,registry={}){
  const project=(portfolio.projects||[]).find(p=>p.incubatorCandidateId===candidate.id);if(!project||candidate.status!=='PROTOTYPE_REGISTERED')return null;
  const evidence=detectCompletedIncubatorArtbook(candidate,registry);
  return{version:1,candidateId:candidate.id,projectId:project.id,gameId:project.id,slug:project.slug,name:project.name,sourcePath:project.sourcePath,artbookGameId:candidate.artbookGameId,artbookId:candidate.artbookId,concept:candidate.concept,artbookEvidence:summarizeArtbook(evidence.book),goal:`${candidate.concept.prototypeHypothesis} 가설을 검증하는 10분 이내 Web 핵심 루프 프로토타입`,acceptanceCriteria:['브라우저에서 시작 가능','핵심 루프 1회 완주 가능','대표 시스템이 실제 입력으로 체감됨','모바일 기본 입력 대응','치명 오류 없이 재시작 가능'],candidateBranchOnly:true,publicStableWrite:false,publicRelease:false,noPersistentSaveInFirstPrototype:true};
}

function appendOllamaLine(line,state){
  const text=clean(line);if(!text)return;
  const event=JSON.parse(text);if(event.error)throw new Error(`Ollama 실패: ${event.error}`);if(typeof event.response==='string')state.response+=event.response;
}
async function callOllama(prompt,model){
  const host=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  try{
    const response=await fetch(`${host}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt:`/no_think\n${prompt}\nJSON 객체만 출력.`,stream:true,format:'json',options:{temperature:0.7,num_ctx:4096,num_predict:MODEL_MAX_PREDICT}}),signal:controller.signal});
    if(!response.ok)throw new Error(`Ollama 실패: ${response.status}`);if(!response.body)throw new Error('Ollama stream 없음');
    const decoder=new TextDecoder();const state={response:''};let pending='';
    for await(const chunk of response.body){pending+=decoder.decode(chunk,{stream:true});const lines=pending.split(/\r?\n/);pending=lines.pop()??'';for(const line of lines)appendOllamaLine(line,state);}
    pending+=decoder.decode();if(pending.trim())appendOllamaLine(pending,state);if(!clean(state.response))throw new Error('Ollama 응답 비어 있음');return JSON.parse(clean(state.response));
  }catch(error){if(controller.signal.aborted)throw new Error(`Ollama 생성 제한시간 초과: ${MODEL_TIMEOUT_MS}ms`);throw error;}finally{clearTimeout(timer);}
}

export async function runOperationalIncubator({modelResponse=null,timestamp=new Date().toISOString(),allowNewConcept=true}={}){
  const state=normalizeIncubatorState(readJson('autonomous-incubator.json',{}));
  const portfolio=readJson('autonomous-portfolio.json',{projects:[]});
  const queue=readJson('artbook-submission-queue.json',{games:[],queueOrder:[]});
  const registry=readJson('game-artbooks.json',{artbooks:[]});
  let candidate=activeCandidate(state),action='NOOP',modelCalls=0,prototypeRequest=null,retryAllowed=false;

  if(candidate&&['CONCEPT_CREATED','ARTBOOK_QUEUED'].includes(candidate.status)){
    const quarantine=quarantineLowQualityCandidate(candidate,queue,timestamp);
    if(quarantine.quarantined){
      action='REDESIGN_REQUIRED';retryAllowed=qualityAttemptsOnKstDate(state,kstDate(timestamp))<MAX_QUALITY_ATTEMPTS_PER_KST_DAY;state.lastRunAt=timestamp;
      writeJson('autonomous-incubator.json',state);writeJson('autonomous-portfolio.json',portfolio);writeJson('artbook-submission-queue.json',queue);
      return{action,candidateId:candidate.id,status:candidate.status,modelCalls:0,prototypeRequest:null,paidApi:false,retryAllowed,qualityGate:quarantine.quality};
    }
  }

  if(!candidate){
    if(!allowNewConcept||conceptCreatedOnKstDate(state,kstDate(timestamp)))return{action:'DAILY_CONCEPT_LIMIT_OR_DISABLED',candidateId:null,status:null,modelCalls:0,prototypeRequest:null,paidApi:false,retryAllowed:false};
    if(qualityAttemptsOnKstDate(state,kstDate(timestamp))>=MAX_QUALITY_ATTEMPTS_PER_KST_DAY)return{action:'QUALITY_ATTEMPT_CAP_REACHED',candidateId:null,status:null,modelCalls:0,prototypeRequest:null,paidApi:false,retryAllowed:false};
    const existing=(portfolio.projects||[]).map(p=>({id:p.id,name:p.name,slug:p.slug,mode:p.mode}));
    const rejectedToday=(state.candidates||[]).filter(c=>qualityRejected(c)&&c.createdAt&&kstDate(c.createdAt)===kstDate(timestamp)).map(c=>({name:c.concept?.name,identity:c.concept?.identitySentence,reasons:c.qualityGate?.reasons}));
    const prompt=`재운컴퍼니가 검증할 완전히 새로운 게임 컨셉 1개를 설계한다. 회사 자체를 소재로 쓰지 말고 실제 플레이어 행동으로 설명한다. 게임 제목은 2~6어절의 고유한 제목이며 '재운컴퍼니','신규게임','후보','candidate'를 절대 넣지 않는다. coreLoop는 반드시 구체적 동사 4단계를 '행동→행동→행동→행동' 형식으로 쓴다. signatureSystems는 플레이 규칙 이름과 작동방식을 1개 이상 직접 작성하고, signatureScenes는 장소/상황/플레이 변화가 구체적인 장면 3개 이상을 직접 작성한다. '신뢰 구축','경험 개선','다양한 전략' 같은 추상 문구로 핵심루프를 대신하지 않는다. 기존과 정체성/핵심루프가 겹치지 않고 Web으로 10분 이내 검증 가능해야 한다. 기존=${JSON.stringify(existing)}. 오늘 거절=${JSON.stringify(rejectedToday)}. 필수키 name,slug,identitySentence,coreLoop,storyHook,signatureSystems(1+),signatureScenes(3+),worldRules(5+),forbiddenPatterns(3+),prototypeHypothesis,risks(2+),styleProfile. 배열 키는 반드시 JSON 배열로 작성한다.`;
    const rawProposal=modelResponse??await callOllama(prompt,process.env.INCUBATOR_LOCAL_MODEL||'qwen3:0.6b');modelCalls=1;
    const proposal=normalizeOperationalConceptProposal(rawProposal);
    const structural=validateOperationalConcept(proposal);if(!structural.pass)throw new Error(`신규 컨셉 불완전: ${structural.missing.join(', ')}`);
    const quality=evaluateOperationalConceptQuality(proposal);
    if(!quality.pass){
      candidate=recordRejectedConcept(state,portfolio,proposal,quality,timestamp);action='CONCEPT_REJECTED';retryAllowed=qualityAttemptsOnKstDate(state,kstDate(timestamp))<MAX_QUALITY_ATTEMPTS_PER_KST_DAY;
    }else{
      candidate=createOperationalCandidate(state,portfolio,proposal,timestamp);enqueueOperationalArtbook(candidate,queue,timestamp);action='CONCEPT_AND_ARTBOOK_QUEUED';
    }
  }else if(candidate.status==='CONCEPT_CREATED'){enqueueOperationalArtbook(candidate,queue,timestamp);action='ARTBOOK_QUEUED';}
  else if(['ARTBOOK_QUEUED','ARTBOOK_COMPLETE'].includes(candidate.status)){const result=registerPrototypeAfterArtbook(candidate,portfolio,registry,timestamp);action=result.registered?'PROTOTYPE_REGISTERED':`WAIT_${result.evidence?.reason||'ARTBOOK'}`;}
  else if(candidate.status==='PROTOTYPE_REGISTERED'){prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);action='PROTOTYPE_REQUEST_READY';}
  if(candidate?.status==='PROTOTYPE_REGISTERED')prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);
  state.lastRunAt=timestamp;
  writeJson('autonomous-incubator.json',state);writeJson('autonomous-portfolio.json',portfolio);writeJson('artbook-submission-queue.json',queue);if(prototypeRequest)writeJson('.autonomous/prototype-request.json',prototypeRequest);
  return{action,candidateId:candidate?.id||null,status:candidate?.status||null,modelCalls,prototypeRequest:prototypeRequest?.projectId||null,paidApi:false,modelTransport:modelCalls?'NDJSON_STREAM':null,retryAllowed,qualityGate:candidate?.qualityGate||null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runOperationalIncubator().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});}

export { MAX_QUALITY_ATTEMPTS_PER_KST_DAY };
