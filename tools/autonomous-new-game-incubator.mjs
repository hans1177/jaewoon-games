import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const REVIEW_ROLES=['planning','graphics','development','qa','balance'];
const clean=v=>String(v??'').trim();
const unique=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const slugify=v=>clean(v).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return structuredClone(fallback);}};
const writeJson=(file,value)=>{fs.mkdirSync(file.includes('/')?file.slice(0,file.lastIndexOf('/')):'.',{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

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
  return [
    concept.styleProfile,
    `정체성:${concept.identitySentence}`,
    `핵심루프:${concept.coreLoop}`,
    `스토리:${concept.storyHook}`,
    `대표시스템:${concept.signatureSystems.join(' / ')}`,
    `대표장면:${concept.signatureScenes.join(' / ')}`,
    `세계규칙:${concept.worldRules.join(' / ')}`,
    `금지:${concept.forbiddenPatterns.join(' / ')}`,
    `가설:${concept.prototypeHypothesis}`,
  ].join(' | ').slice(0,1800);
}

export function createOperationalCandidate(state,portfolio,concept,timestamp=new Date().toISOString()){
  const v=validateOperationalConcept(concept);if(!v.pass)throw new Error(`신규 컨셉 불완전: ${v.missing.join(', ')}`);
  const active=activeCandidate(state);if(active)throw new Error(`동시 신규게임 후보 금지: ${active.id}`);
  const slug=slugify(concept.slug||concept.name);if(!slug)throw new Error('slug 생성 실패');
  if((portfolio.projects||[]).some(p=>p.slug===slug||clean(p.name).toLowerCase()===clean(concept.name).toLowerCase()))throw new Error('기존 게임과 이름/slug 중복');
  const reservedProjectId=nextPortfolioProjectId(portfolio);
  state.nextCandidateNumber??=1;state.candidates??=[];
  const candidate={
    id:`NG${String(state.nextCandidateNumber++).padStart(5,'0')}`,
    reservedProjectId,
    artbookGameId:`incubator-${reservedProjectId.toLowerCase()}-${slug}`,
    status:'CONCEPT_CREATED',
    concept:{
      name:clean(concept.name),slug,identitySentence:clean(concept.identitySentence),coreLoop:clean(concept.coreLoop),storyHook:clean(concept.storyHook),
      signatureSystems:unique(concept.signatureSystems),signatureScenes:unique(concept.signatureScenes),worldRules:unique(concept.worldRules),
      forbiddenPatterns:unique(concept.forbiddenPatterns),prototypeHypothesis:clean(concept.prototypeHypothesis),risks:unique(concept.risks),styleProfile:clean(concept.styleProfile),
    },
    artbookId:null,artbookSourceFile:null,prototypeRegisteredAt:null,prototypeDevComplete:false,publicReleaseApproved:false,createdAt:timestamp,updatedAt:timestamp,
  };
  state.candidates.push(candidate);return candidate;
}

export function enqueueOperationalArtbook(candidate,queue,timestamp=new Date().toISOString()){
  if(candidate.status!=='CONCEPT_CREATED')throw new Error(`아트북 큐 상태 오류: ${candidate.status}`);
  queue.games??=[];queue.queueOrder??=[];
  if(!queue.games.some(g=>g.gameId===candidate.artbookGameId)){
    queue.games.push({
      gameId:candidate.artbookGameId,
      name:candidate.concept.name,
      source:'INCUBATOR_METADATA_ONLY',
      status:'QUEUED',
      sectionsReady:[],requiredSections:5,
      styleProfile:conceptDigest(candidate.concept),
      currentStage:'incubator-artbook-review',
      incubatorCandidateId:candidate.id,
      reservedProjectId:candidate.reservedProjectId,
      incubatorConcept:candidate.concept,
      formalProductionAllowed:false,
    });
  }
  if(!queue.queueOrder.includes(candidate.artbookGameId)){
    const currentIndex=queue.queueOrder.indexOf(queue.currentDailyTarget);
    const insertion=currentIndex>=0?currentIndex+1:queue.queueOrder.length;
    queue.queueOrder.splice(insertion,0,candidate.artbookGameId);
  }
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
  const project={
    id:candidate.reservedProjectId,slug:candidate.concept.slug,name:candidate.concept.name,sourcePath:`web-games/${candidate.concept.slug}`,
    profileStatus:'NEW_PROTOTYPE_PENDING_SOURCE',mode:'PROTOTYPE',protectedValues:['save-meaning','core-loop'],
    incubatorCandidateId:candidate.id,artbookId:candidate.artbookId,identitySentence:candidate.concept.identitySentence,
    prototypeHypothesis:candidate.concept.prototypeHypothesis,publicReleaseApproved:false,
  };
  portfolio.projects.push(project);candidate.status='PROTOTYPE_REGISTERED';candidate.prototypeRegisteredAt=timestamp;candidate.updatedAt=timestamp;
  return{registered:true,project,evidence};
}

function summarizeArtbook(book){
  if(!book)return null;
  const opinions=Object.fromEntries(REVIEW_ROLES.map(role=>[role,book.departmentOpinions?.[role]?{
    averageStars:book.departmentOpinions[role].averageStars,
    priorityImprovement:clean(book.departmentOpinions[role].priorityImprovement),
    readiness:clean(book.departmentOpinions[role].readiness),
  }:null]));
  return{
    id:book.id,title:clean(book.title),subtitle:clean(book.subtitle),status:book.status,productionApproval:book.productionApproval===true,
    cuts:(book.cuts||[]).slice(0,10).map(cut=>({no:cut.no,title:clean(cut.title),body:clean(cut.body).slice(0,700)})),
    departmentOpinions:opinions,
  };
}

export function buildPrototypeRequest(candidate,portfolio,registry={}){
  const project=(portfolio.projects||[]).find(p=>p.incubatorCandidateId===candidate.id);if(!project||candidate.status!=='PROTOTYPE_REGISTERED')return null;
  const evidence=detectCompletedIncubatorArtbook(candidate,registry);
  return{
    version:1,candidateId:candidate.id,projectId:project.id,gameId:project.id,slug:project.slug,name:project.name,sourcePath:project.sourcePath,
    artbookGameId:candidate.artbookGameId,artbookId:candidate.artbookId,concept:candidate.concept,artbookEvidence:summarizeArtbook(evidence.book),
    goal:`${candidate.concept.prototypeHypothesis} 가설을 검증하는 10분 이내 Web 핵심 루프 프로토타입`,
    acceptanceCriteria:['브라우저에서 시작 가능','핵심 루프 1회 완주 가능','대표 시스템이 실제 입력으로 체감됨','모바일 기본 입력 대응','치명 오류 없이 재시작 가능'],
    candidateBranchOnly:true,publicStableWrite:false,publicRelease:false,noPersistentSaveInFirstPrototype:true,
  };
}

async function callOllama(prompt,model){
  const host=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
  const response=await fetch(`${host}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt:`/no_think\n${prompt}\nJSON 객체만 출력.`,stream:false,format:'json',options:{temperature:0.55,num_ctx:4096}})});
  if(!response.ok)throw new Error(`Ollama 실패: ${response.status}`);const body=await response.json();return JSON.parse(clean(body.response));
}

export async function runOperationalIncubator({modelResponse=null,timestamp=new Date().toISOString()}={}){
  const state=readJson('autonomous-incubator.json',{version:1,status:'ACTIVE',nextCandidateNumber:1,candidates:[]});
  const portfolio=readJson('autonomous-portfolio.json',{projects:[]});
  const queue=readJson('artbook-submission-queue.json',{games:[],queueOrder:[]});
  const registry=readJson('game-artbooks.json',{artbooks:[]});
  let candidate=activeCandidate(state),action='NOOP',modelCalls=0,prototypeRequest=null;
  if(!candidate){
    const existing=(portfolio.projects||[]).map(p=>({id:p.id,name:p.name,slug:p.slug,mode:p.mode}));
    const prompt=`재운컴퍼니 신규게임 후보 1개를 제안한다. 기존과 정체성/핵심루프가 겹치지 않고 Web으로 작게 검증 가능해야 한다. 기존=${JSON.stringify(existing)}. 필수키 name,slug,identitySentence,coreLoop,storyHook,signatureSystems(1+),signatureScenes(3+),worldRules(5+),forbiddenPatterns(3+),prototypeHypothesis,risks(2+),styleProfile.`;
    const proposal=modelResponse??await callOllama(prompt,process.env.INCUBATOR_LOCAL_MODEL||'qwen3:0.6b');modelCalls=1;
    candidate=createOperationalCandidate(state,portfolio,proposal,timestamp);enqueueOperationalArtbook(candidate,queue,timestamp);action='CONCEPT_AND_ARTBOOK_QUEUED';
  }else if(candidate.status==='CONCEPT_CREATED'){
    enqueueOperationalArtbook(candidate,queue,timestamp);action='ARTBOOK_QUEUED';
  }else if(['ARTBOOK_QUEUED','ARTBOOK_COMPLETE'].includes(candidate.status)){
    const result=registerPrototypeAfterArtbook(candidate,portfolio,registry,timestamp);action=result.registered?'PROTOTYPE_REGISTERED':`WAIT_${result.evidence?.reason||'ARTBOOK'}`;
  }else if(candidate.status==='PROTOTYPE_REGISTERED'){
    prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);action='PROTOTYPE_REQUEST_READY';
  }
  if(candidate?.status==='PROTOTYPE_REGISTERED')prototypeRequest=buildPrototypeRequest(candidate,portfolio,registry);
  writeJson('autonomous-incubator.json',state);writeJson('autonomous-portfolio.json',portfolio);writeJson('artbook-submission-queue.json',queue);
  if(prototypeRequest)writeJson('.autonomous/prototype-request.json',prototypeRequest);
  return{action,candidateId:candidate?.id||null,status:candidate?.status||null,modelCalls,prototypeRequest:prototypeRequest?.projectId||null,paidApi:false};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){runOperationalIncubator().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});}
