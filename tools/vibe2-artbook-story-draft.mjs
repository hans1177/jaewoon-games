import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clip=(v,n=220)=>{const s=clean(v);return s.length>n?s.slice(0,n-1)+'…':s;};
const readJson=(f,v=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return v;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const readText=(f,max=90000)=>{try{const b=fs.readFileSync(f);return b.subarray(0,Math.min(b.length,max)).toString('utf8');}catch{return'';}};
const listFiles=(root,exts,max=28)=>{const out=[];if(!fs.existsSync(root))return out;const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(out.length>=max)return;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(exts.some(x=>e.name.toLowerCase().endsWith(x)))out.push(p.replaceAll('\\','/'));}};walk(root);return out;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const date=clean(process.env.ARTBOOK_DATE),gameId=clean(process.env.ARTBOOK_GAME_ID);
if(!date||!gameId)throw new Error('ARTBOOK_DATE/GAME_ID missing');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`,workOrder=readJson(workOrderPath,null);
if(!workOrder)throw new Error(`work order missing: ${workOrderPath}`);
const base=path.join('artbook-submissions',gameId,date),output=path.join(base,'vibe2-first-draft.json');
const sourceDate=clean(workOrder.secondWork?.sourceDate||date),reusablePath=path.join('artbook-submissions',gameId,sourceDate,'vibe2-first-draft.json');

function validDraft(d){
  const s=d?.storySpine||{};
  return Boolean(d&&['opening','early','mid','late','finalBoss','ending'].every(k=>clean(s[k]))&&Number(d.recommendedPages)>=12&&Number(d.recommendedPages)<=30);
}
function storyPageCount(target){return Math.max(2,Math.min(20,Math.floor(target)-10));}
function pageLabels(count){
  const fixed=['오프닝','초반','중반','후반','최종보스','엔딩','지역 흐름','메인 퀘스트','주요 NPC','보스 인과','성장 전환','갈등 확대','핵심 반전','최종 지역','엔딩 이후','빈 구간','서브 퀘스트','플레이 동기','사건 인과','전체 점검'];
  return fixed.slice(0,count);
}
function planChunks(d,count){
  const s=d.storySpine||{},regions=Array.isArray(d.regions)?d.regions:[],quests=Array.isArray(d.mainQuestChain)?d.mainQuestChain:[],chars=Array.isArray(d.majorCharacters)?d.majorCharacters:[],bosses=Array.isArray(d.majorBosses)?d.majorBosses:[],gaps=Array.isArray(d.gaps)?d.gaps:[];
  const core=[
    {title:'오프닝',items:[s.opening,s.early]},
    {title:'초반',items:[s.early,quests.slice(0,2).join(' → ')]},
    {title:'중반',items:[s.mid,regions.slice(0,3).join(' → ')]},
    {title:'후반',items:[s.late,quests.slice(2,5).join(' → ')]},
    {title:'최종보스',items:[s.finalBoss,bosses.slice(0,3).join(' · ')]},
    {title:'엔딩',items:[s.ending,clean(d.endgame)]},
    {title:'지역 흐름',items:[regions.join(' → ')]},
    {title:'메인 퀘스트',items:[quests.join(' → ')]},
    {title:'주요 NPC',items:[chars.join(' · ')]},
    {title:'보스 인과',items:[bosses.join(' → ')]},
    {title:'성장 전환',items:[clean(d.progressionBridge)]},
    {title:'갈등 확대',items:[clean(d.conflictEscalation)]},
    {title:'핵심 반전',items:[clean(d.twist)]},
    {title:'최종 지역',items:[clean(d.finalRegion)]},
    {title:'엔딩 이후',items:[clean(d.endgame)]},
    {title:'빈 구간',items:[gaps.join(' · ')]},
    {title:'서브 퀘스트',items:[(Array.isArray(d.sideQuestHooks)?d.sideQuestHooks:[]).join(' · ')]},
    {title:'플레이 동기',items:[clean(d.playerMotivation)]},
    {title:'사건 인과',items:[clean(d.causalitySummary)]},
    {title:'전체 점검',items:['OPENING → EARLY → MID → LATE → FINAL → ENDING',gaps.join(' · ')]}
  ];
  const labels=pageLabels(count);
  return labels.map((label,i)=>{const src=core.find(x=>x.title===label)||core[i%core.length];const items=src.items.map(x=>clip(x,180)).filter(Boolean);return{title:label,items:items.length?items:['기획 AI가 검토·보완할 Vibe2 제안 구간']};});
}
function renderPage({gameName,title,items,index,total}){
  const rows=items.slice(0,4);while(rows.length<3)rows.push('기획 AI 검토 대상');
  const y=[260,365,470,560];
  const boxes=rows.map((item,i)=>`<g><rect x="90" y="${y[i]-48}" width="1020" height="82" rx="22" fill="#07131d" fill-opacity=".72" stroke="#71d4ff" stroke-opacity=".5"/><text x="122" y="${y[i]}" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="21" font-weight="750" fill="#eefaff">${esc(clip(item,58))}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c273a"/><stop offset="1" stop-color="#183f61"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1050" cy="70" r="210" fill="#75ddff" opacity=".08"/><text x="70" y="72" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="18" font-weight="800" fill="#8adfff">VIBE2 FIRST DRAFT · PROPOSAL</text><text x="70" y="125" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="36" font-weight="950" fill="#fff">${esc(gameName)} · ${esc(title)}</text><text x="1115" y="70" text-anchor="end" font-family="system-ui" font-size="17" fill="#b9dceb">${index+1}/${total}</text>${boxes}<text x="70" y="640" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="16" fill="#9fc8da">기존 근거를 출발점으로 만든 1차 초안 · 기획부 검토 전 확정 설정 아님</text></svg>`;
}
function applyDraft(draft){
  const target=Math.max(12,Math.min(30,Math.round(Number(draft.recommendedPages)||16)));
  draft.recommendedPages=target;
  const count=storyPageCount(target),gameName=clean(workOrder.gameName||gameId),plans=planChunks(draft,count),visuals=[];
  for(let i=0;i<plans.length;i++){
    const image=path.join(base,'visuals',`vibe2-draft-${i+1}.svg`).replaceAll('\\','/');
    fs.mkdirSync(path.dirname(image),{recursive:true});fs.writeFileSync(image,renderPage({gameName,title:plans[i].title,items:plans[i].items,index:i,total:plans.length}));
    visuals.push({no:i+1,title:plans[i].title,body:clip(plans[i].items.join(' · '),260),image,sourceDepartment:'vibe2',pageType:'vibe2-first-draft',vibe2Authored:true,assistantAuthored:false,proposal:true});
  }
  draft.version=1;draft.gameId=gameId;draft.date=date;draft.status='FIRST_DRAFT_READY';draft.author='vibe2';draft.proposalOnly=true;draft.requiredStoryStages=['OPENING','EARLY','MID','LATE','FINAL_BOSS','ENDING'];draft.visualPages=visuals;draft.visualPageCount=visuals.length;draft.targetArtbookPages=target;draft.sourceOfTruth='proposal-before-planning-review';
  writeJson(output,draft);
  const spine=draft.storySpine;
  const summary=[`OPENING=${clip(spine.opening,120)}`,`EARLY=${clip(spine.early,120)}`,`MID=${clip(spine.mid,120)}`,`LATE=${clip(spine.late,120)}`,`FINAL=${clip(spine.finalBoss,120)}`,`ENDING=${clip(spine.ending,120)}`].join(' | ');
  workOrder.version=Math.max(9,Number(workOrder.version)||0);workOrder.vibe2FirstDraftPath=output;workOrder.vibe2FirstDraft={status:'FIRST_DRAFT_READY',proposalOnly:true,targetArtbookPages:target,requiredStoryStages:draft.requiredStoryStages};
  workOrder.pagePolicy={min:12,default:16,max:30,target,legacyCompletedPages:10,homepageMode:'compact-card-detail-viewer'};
  workOrder.presentation={...(workOrder.presentation||{}),visualFirst:true,exactPages:target,minPages:12,maxPages:30,vibe2DraftPages:visuals.length,departmentAuthoredPages:8,directorAuthoredPages:2,assistantAuthoredPages:0,pagePlan:['director-cover',...visuals.map((_,i)=>`vibe2-draft-${i+1}`),'planning-1','planning-2','graphics-1','graphics-2','development-1','development-2','qa-1','balance-1','director-summary']};
  workOrder.departmentTasks=workOrder.departmentTasks||{};workOrder.departmentTasks.planning=workOrder.departmentTasks.planning||{};workOrder.departmentTasks.planning.vibe2FirstDraftPath=output;workOrder.departmentTasks.planning.scope=`${clean(workOrder.departmentTasks.planning.scope)} Vibe2 1차 초안(PROPOSAL)을 검토·보완하고 기존 근거와 충돌하면 근거를 우선한다. ${summary}`.trim();
  workOrder.sourceEvidence=[...(Array.isArray(workOrder.sourceEvidence)?workOrder.sourceEvidence:[]),`${output} (Vibe2 proposal before planning review)`].filter((v,i,a)=>a.indexOf(v)===i);
  writeJson(workOrderPath,workOrder);
  const daily=readJson('artbook-daily-context.json',{});writeJson('artbook-daily-context.json',{...daily,vibe2FirstDraftPath:output,targetArtbookPages:target,vibe2DraftPages:visuals.length,pagePolicy:workOrder.pagePolicy});
  console.log(`VIBE2_FIRST_DRAFT=${output}`);console.log('VIBE2_STORY_STAGES=OPENING,EARLY,MID,LATE,FINAL_BOSS,ENDING');console.log(`ARTBOOK_TARGET_PAGES=${target}`);console.log(`VIBE2_DRAFT_PAGES=${visuals.length}`);console.log('VIBE2_DRAFT_PROPOSAL_ONLY=YES');
}

if(String(workOrder.mode||'INITIAL').toUpperCase()==='SECOND_WORK'&&fs.existsSync(reusablePath)){
  const reusable=readJson(reusablePath,null);if(validDraft(reusable)){applyDraft({...reusable,date,sourceReusedFrom:reusablePath});process.exit(0);}
}

const unityFiles=listFiles(path.join('unity-games',gameId,'Assets','Scripts'),['.cs'],28),webFiles=listFiles(path.join('web-games',gameId),['.html','.js','.css','.json'],28),evidenceFiles=[...unityFiles,...webFiles];
const combined=evidenceFiles.map(f=>`\n### ${f}\n${readText(f)}`).join('\n').slice(0,500000);
const sourceMode=unityFiles.length&&webFiles.length?'UNITY_PLUS_WEB_ARCHIVE':unityFiles.length?'UNITY':webFiles.length?'WEB_ARCHIVE_READ_ONLY':'METADATA_ONLY';
const evidenceExcerpt=combined.split(/\r?\n/).filter(line=>/story|quest|region|dialog|npc|world|boss|ending|chapter|스토리|퀘스트|지역|대사|보스|엔딩|챕터/i.test(line)).slice(0,180).join('\n');
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b');
const schema={type:'object',required:['storySpine','recommendedPages','gaps'],properties:{recommendedPages:{type:'integer',minimum:12,maximum:30},playerMotivation:{type:'string'},causalitySummary:{type:'string'},conflictEscalation:{type:'string'},twist:{type:'string'},finalRegion:{type:'string'},endgame:{type:'string'},progressionBridge:{type:'string'},storySpine:{type:'object',required:['opening','early','mid','late','finalBoss','ending'],properties:{opening:{type:'string'},early:{type:'string'},mid:{type:'string'},late:{type:'string'},finalBoss:{type:'string'},ending:{type:'string'}},additionalProperties:false},regions:{type:'array',items:{type:'string'},maxItems:10},mainQuestChain:{type:'array',items:{type:'string'},maxItems:14},sideQuestHooks:{type:'array',items:{type:'string'},maxItems:8},majorCharacters:{type:'array',items:{type:'string'},maxItems:10},majorBosses:{type:'array',items:{type:'string'},maxItems:8},gaps:{type:'array',items:{type:'string'},maxItems:10}},additionalProperties:false};
const system=`/no_think\n너는 Vibe2의 게임 기획 1차 초안 엔진이다. 기존 게임 코드/설정 근거를 먼저 보존하고, 비어 있는 중반·후반·엔딩만 PROPOSAL로 보완한다. 이 결과는 기획부 확정안이 아니다. 반드시 OPENING, EARLY, MID, LATE, FINAL_BOSS, ENDING 전 구간을 연결하고 사건의 원인→결과가 이어지게 한다. 메인 퀘스트는 지역 전환과 보스 등장 이유를 포함한다. 현재 코드에 없는 내용을 구현됨/확정됨이라고 쓰지 않는다. 아트북 장수는 단순 게임 12~14, 일반 15~18, RPG/생존/어드벤처 18~24, 대형 스토리 게임 25~30 범위에서 필요한 만큼만 추천한다. JSON만 출력한다.`;
const user={gameId,gameName:workOrder.gameName||gameId,sourceMode,styleProfile:workOrder.styleProfile||'',existingWorkOrder:workOrder.departmentTasks?.planning||{},evidenceFiles:evidenceFiles.slice(0,24),storyEvidence:evidenceExcerpt};
let draft=null,last=null;
for(let attempt=0;attempt<3;attempt++){
  try{
    const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:schema,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(user)}],options:{temperature:0.24,seed:7301+attempt,num_ctx:8192,num_predict:2200}})});
    if(!r.ok)throw new Error(`ollama ${r.status}: ${await r.text()}`);const packet=await r.json();draft=JSON.parse(clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,''));if(!validDraft(draft))throw new Error('draft missing full story spine');break;
  }catch(e){last=e;console.error(`VIBE2_FIRST_DRAFT_RETRY=${attempt+1}:${e.message}`);draft=null;}
}
if(!draft)throw last||new Error('Vibe2 first draft generation failed');
draft.runner={type:'vibe2-local-open-model-first-draft',model,localInference:true,paidApi:false,apiKeyRequired:false};draft.sourceMode=sourceMode;draft.evidenceFiles=evidenceFiles.slice(0,24);applyDraft(draft);
