import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const REVIEW_ROLES=['planning','graphics','development','qa','balance'];
const MODEL_TIMEOUT_MS=Number(process.env.INCUBATOR_MODEL_TIMEOUT_MS||240000);
const MODEL_MAX_PREDICT=Math.max(1024,Math.min(6144,Number(process.env.INCUBATOR_MODEL_MAX_PREDICT||1536)));
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
export function conceptCreatedOnKstDate(state,date=kstDate()){
  return (state.candidates||[]).some(candidate=>candidate.createdAt&&kstDate(candidate.createdAt)===date);
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

  // The local 0.6B model must provide the creative spine. Deterministic completion only
  // expands missing list-shaped contract fields; it never invents the name/identity/loop/story/hypothesis/style.
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

export function nextPortfolioProjectId(portfolio={}){
  const max=Math.max(0,...(portfolio.projects||[]).map(p=>Number(String(p.id||'').match(/^P(\d+)$/)?.[1]||0)));
  return `P${String(max+1).padStart(4,'0')}`;
}

function activeCandidate(state){return(state.candidates||[]).find(c=>['CONCEPT_CREATED','ARTBOOK_QUEUED','ARTBOOK_COMPLETE','PROTOTYPE_REGISTERED'].includes(c.status)&&c.prototypeDevComplete!==true)||null;}

function conceptDigest(concept){
  return [concept.styleProfile,`정체성:${concept.identitySentence}`,`핵심루프:${concept.coreLoop}`,`스토리:${concept.storyHook}`,`대표시스템:${concept.signatureSystems.join(' / ')}`,`대표장면:${concept.signatureScenes.join(' / ')}`,`세계규칙:${concept.worldRules.join(' / ')}`,`금지:${concept.forbiddenPatterns.join(' / ')}`,`가설:${concept.prototypeHypothesis}`].join(' | ').slice(0,1800);
}

export function createOperationalCandidate(state,portfolio,concept,timestamp=new Date().toISOString()){
  const v=validateOperationalConcept(concept);if(!v.pass)throw new Error(`신규 컨셉 불완전: ${v.missing.join(', ')}`);
  const active=activeCandidate(state);if(active)throw new Error(`동시 신규게임 후보 금지: ${active.id}`);
  if(conceptCreatedOnKstDate(state,kstDate(timestamp)))throw new Error('하루 신규게임 컨셉 1개 제한');
  const slug=slugify(concept.slug||concept.name);if(!slug)throw new Error('slug 생성 실패');
  if((portfolio.projects||[]).some(p=>p.slug===slug||clean(p.name).toLowerCase()===clean(concept.name).toLowerCase()))throw new Error('기존 게임과 이름/slug 중복');
  const reservedProjectId=nextPortfolioProjectId(portfolio);
  state.nextCandidateNumber??=1;state.candidates??=[];
  const candidate={id:`NG${String(state.nextCandidateNumber++).padStart(5,'0')}`,reservedProjectId,artbookGameId:`incubator-${reservedProjectId.toLowerCase()}-${slug}`,status:'CONCEPT_CREATED',concept:{name:clean(concept.name),slug,identitySentence:clean(concept.identitySentence),coreLoop:clean(concept.coreLoop),storyHook:clean(concept.storyHook),signatureSystems:unique(concept.signatureSystems),signatureScenes:unique(concept.signatureScenes),worldRules:unique(concept.worldRules),forbiddenPatterns:unique(concept.forbiddenPatterns),prototypeHypothesis:clean(concept.prototypeHypothesis),risks:unique(concept.risks),styleProfile:clean(concept.styleProfile)},artbookId:null,artbookSourceFile:null,prototypeRegisteredAt:null,prototypeDevComplete:false,publicReleaseApproved:false,createdAt:timestamp,updatedAt:timestamp};
  state.candidates.push(candidate);return candidate;
}

export function enqueueOperationalArtbook(candidate,queue,timestamp=new Date().toISOString()){
  if(candidate.status!=='CONCEPT_CREATED')throw new Error(`아트북 큐 상태 오류: ${candidate.status}`);
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
    const response=await fetch(`${host}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt:`/no_think\n${prompt}\nJSON 객체만 출력.`,stream:true,format:'json',options:{temperature:0.55,num_ctx:4096,num_predict:MODEL_MAX_PREDICT}}),signal:controller.signal});
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
  let candidate=activeCandidate(state),action='NOOP',modelCalls=0,prototypeRequest=null;
  if(!candidate){
    if(!allowNewConcept||conceptCreatedOnKstDate(state,kstDate(timestamp)))return{action:'DAILY_CONCEPT_LIMIT_OR_DISABLED',candidateId:null,status:null,modelCalls:0,prototypeRequest:null,paidApi:false};
    const existing=(portfolio.projects||[]).map(p=>({id:p.id,name:p.name,slug:p.slug,mode:p.mode}));
    const prompt=`재운컴퍼니 신규게임 후보 1개를 제안한다. 기존과 정체성/핵심루프가 겹치지 않고 Web으로 작게 검증 가능해야 한다. 기존=${JSON.stringify(existing)}. 필수키 name,slug,identitySentence,coreLoop,storyHook,signatureSystems(1+),signatureScenes(3+),worldRules(5+),forbiddenPatterns(3+),prototypeHypothesis,risks(2+),styleProfile. 배열 키는 반드시 JSON 배열로 작성한다.`;
    const rawProposal=modelResponse??await callOllama(prompt,process.env.INCUBATOR_LOCAL_MODEL||'qwen3:0.6b');modelCalls=1;
    const proposal=normalizeOperationalConceptProposal(rawProposal);
    candidate=createOperationalCandidate(state,portfolio,proposal,timestamp);enqueueOperationalArtbook(candidate,queue,timestamp);action='CONCEPT_AND_ARTBOOK_QUEUED';
  }else if(candidate.status==='CONCEPT_CREATED'){enqueueOperationalArtbook(candidate,queue,timestamp);action='ARTBOOK_QUEUED';}
  else if(['ARTBOOK_QUEUED','ARTBOOK_COMPLETE'].includes(candidate.status)){const result=registerPrototypeAfterArtbook(candidate,portfolio,registry,timestamp);action=result.registered?'PROTOTYPE_REGISTERED':`WAIT_${result.evidence?.reason||'ARTBOOK'}`;}
  else if(candidate.status==='PROTOTYPE_REGISTERED'){prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);action='PROTOTYPE_REQUEST_READY';}
  if(candidate?.status==='PROTOTYPE_REGISTERED')prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);
  state.lastRunAt=timestamp;
  writeJson('autonomous-incubator.json',state);writeJson('autonomous-portfolio.json',portfolio);writeJson('artbook-submission-queue.json',queue);if(prototypeRequest)writeJson('.autonomous/prototype-request.json',prototypeRequest);
  return{action,candidateId:candidate?.id||null,status:candidate?.status||null,modelCalls,prototypeRequest:prototypeRequest?.projectId||null,paidApi:false,modelTransport:modelCalls?'NDJSON_STREAM':null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){runOperationalIncubator().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});}
