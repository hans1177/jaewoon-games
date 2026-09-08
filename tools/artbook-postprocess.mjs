// 파일명: tools/artbook-postprocess.mjs
// 역할: 5개 부서 통합 아트북을 새 설정 추가 없이 정확히 10컷으로 후처리하고 완료 상태를 확정한다.
import fs from 'node:fs';
import path from 'node:path';

const ROLES=['planning','graphics','development','qa','balance'];
const NAMES={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스'};
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,max)=>{const s=clean(v);return s.length>max?s.slice(0,max-1)+'…':s;};
const todayKst=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return`${g('year')}-${g('month')}-${g('day')}`;};

function collectText(value,out=[],depth=0){
  if(depth>5||out.length>=24)return out;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean'){
    const s=clean(value);if(s.length>=8&&!out.includes(s))out.push(s);return out;
  }
  if(Array.isArray(value)){for(const item of value)collectText(item,out,depth+1);return out;}
  if(value&&typeof value==='object'){for(const item of Object.values(value))collectText(item,out,depth+1);}
  return out;
}
function distinct(values){const seen=new Set(),out=[];for(const value of values){const key=clean(value).toLowerCase();if(!key||seen.has(key))continue;seen.add(key);out.push(clean(value));}return out;}

const gate=readJson('artbook-gate-status.json',{}),queue=readJson('artbook-submission-queue.json',{}),registry=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[]});
const gameId=clean(process.env.ARTBOOK_GAME_ID||gate.gameId||queue.currentDailyTarget),date=clean(process.env.ARTBOOK_DATE||gate.date||todayKst());
if(!gameId)throw new Error('ARTBOOK_GAME_ID missing');
const base=path.join('artbook-submissions',gameId,date),artbookFile=path.join(base,'artbook.json'),artbook=readJson(artbookFile,null);
if(!artbook)throw new Error(`artbook missing: ${artbookFile}`);
if(String(artbook.gameId||'')!==gameId||String(artbook.date||'')!==date)throw new Error('artbook identity/date mismatch');
if(!artbook.departments||typeof artbook.departments!=='object')throw new Error('artbook departments missing');

const originalCuts=Array.isArray(artbook.cuts)?artbook.cuts:[];
const cuts=[];
for(const role of ROLES){
  const department=artbook.departments[role];
  if(!department||typeof department!=='object')throw new Error(`${role}: department result missing`);
  const visual=path.join(base,'visuals',`${role}.svg`).replaceAll('\\','/');
  if(!fs.existsSync(visual))throw new Error(`${role}: visual missing: ${visual}`);
  const existing=originalCuts.find(c=>c&&String(c.sourceDepartment||c.kind||'')===role)||null;
  const sectionTexts=distinct(collectText(department.section));
  const evidenceTexts=distinct((Array.isArray(department.evidence)?department.evidence:[]).map(x=>typeof x==='string'?x:(x?.usage||x?.source||'')));
  const candidates=distinct([existing?.body,department.headline,...sectionTexts,...evidenceTexts]);
  if(candidates.length<2)throw new Error(`${role}: not enough owned material for two postprocessed cuts`);
  const overviewBody=clip(candidates[0],360),detailBody=clip(candidates.find(x=>clean(x)!==clean(overviewBody))||candidates[1],360);
  if(!overviewBody||!detailBody)throw new Error(`${role}: empty postprocessed body`);
  cuts.push({no:cuts.length+1,kind:role,title:clip(existing?.title||department.headline||`${NAMES[role]} 부서`,100),body:overviewBody,image:clean(existing?.image)||visual,sourceDepartment:role,pageType:'department-overview',postprocessed:true});
  cuts.push({no:cuts.length+1,kind:role,title:`${NAMES[role]} · 세부 정리`,body:detailBody,image:visual,sourceDepartment:role,pageType:'department-detail',postprocessed:true});
}

if(cuts.length!==10)throw new Error(`artbook must be exactly 10 cuts, got ${cuts.length}`);
const missingImages=cuts.filter(c=>!c.image||!fs.existsSync(c.image));
if(missingImages.length)throw new Error(`missing cut images: ${missingImages.map(c=>c.no).join(',')}`);
const emptyCuts=cuts.filter(c=>!clean(c.title)||!clean(c.body));
if(emptyCuts.length)throw new Error(`empty cuts: ${emptyCuts.map(c=>c.no).join(',')}`);
const perDepartment=Object.fromEntries(ROLES.map(role=>[role,cuts.filter(c=>c.sourceDepartment===role).length]));
if(ROLES.some(role=>perDepartment[role]!==2))throw new Error(`department cut distribution invalid: ${JSON.stringify(perDepartment)}`);
const duplicateKeys=cuts.map(c=>`${clean(c.title).toLowerCase()}|${clean(c.body).toLowerCase()}`),duplicateCount=duplicateKeys.length-new Set(duplicateKeys).size;
if(duplicateCount>0)throw new Error(`duplicate postprocessed cuts: ${duplicateCount}`);

const postprocess={version:1,complete:true,checkedAt:new Date().toISOString(),requiredCuts:10,cutCount:10,cutsPerDepartment:perDepartment,formatChecked:true,emptyContentChecked:true,duplicateChecked:true,imagePathsChecked:true,newClaimsAdded:false,sourceMode:'DEPARTMENT_OWNED_MATERIAL_ONLY'};
artbook.version=Math.max(6,Number(artbook.version)||0);artbook.status='COMPLETED';artbook.cuts=cuts;artbook.postprocess=postprocess;artbook.publication={...(artbook.publication||{}),displayReady:true,requiredCuts:10,exactCutCountRequired:true,postprocessRequired:true,postprocessComplete:true};
writeJson(artbookFile,artbook);

const registered=(registry.artbooks||[]).find(x=>x.sourceFile===artbookFile)||(registry.artbooks||[]).filter(x=>x.gameId===gameId&&x.createdAt===date).sort((a,b)=>(b.edition||0)-(a.edition||0))[0];
if(!registered)throw new Error('registered artbook missing');
registered.status='completed-artbook';registered.published=true;registered.homepageVisible=true;registered.cuts=cuts;registered.cutCount=10;registered.requiredCuts=10;registered.completionLabel='완료';registered.postprocess=postprocess;
for(const daily of registry.dailySubmissions||[])if(daily.gameId===gameId&&daily.date===date){daily.status='completed-artbook';daily.cutCount=10;daily.postprocessComplete=true;}
registry.version=Math.max(9,Number(registry.version)||0);registry.updatedAt=date;writeJson('game-artbooks.json',registry);

writeJson('artbook-gate-status.json',{...gate,checkedAt:new Date().toISOString(),postprocessComplete:true,postprocessChecks:postprocess,cutCount:10,requiredCuts:10,homepagePublished:true,completedArtbook:true,formalProductionGate:'ARTBOOK_COMPLETED_AWAITING_OWNER_PRODUCTION_DECISION'});
console.log('ARTBOOK_POSTPROCESS=PASS');
console.log('ARTBOOK_CUTS=10/10');
console.log('ARTBOOK_DEPARTMENT_DISTRIBUTION=2_EACH');
console.log('ARTBOOK_EMPTY_CUTS=0');
console.log('ARTBOOK_MISSING_IMAGES=0');
console.log('ARTBOOK_DUPLICATES=0');
console.log('ARTBOOK_COMPLETED=YES');
console.log('HOMEPAGE_PUBLISHED=YES');
console.log('PRODUCTION_APPROVAL=NO');
