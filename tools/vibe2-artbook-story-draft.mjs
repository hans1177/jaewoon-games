import fs from 'node:fs';
import path from 'node:path';
import { clean, clip, REQUIRED_STAGES, gameplayEvidenceSnippets, buildFallbackSeed, expandCompactSeed, validExpandedDraft } from './vibe2-artbook-story-core.mjs';

const readJson=(f,v=null)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return v;}};
const writeJson=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const readText=(f,max=90000)=>{try{const b=fs.readFileSync(f);return b.subarray(0,Math.min(b.length,max)).toString('utf8');}catch{return'';}};
const listFiles=(root,exts,max=28)=>{const out=[];if(!fs.existsSync(root))return out;const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(out.length>=max)return;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(exts.some(x=>e.name.toLowerCase().endsWith(x)))out.push(p.replaceAll('\\','/'));}};walk(root);return out;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const stageKey=stage=>clean(stage).toUpperCase().replaceAll('-','_').replaceAll(' ','_');
const date=clean(process.env.ARTBOOK_DATE),gameId=clean(process.env.ARTBOOK_GAME_ID);
if(!date||!gameId)throw new Error('ARTBOOK_DATE/GAME_ID missing');
const workOrderPath=`artbook-work-orders/${date}-${gameId}.json`,workOrder=readJson(workOrderPath,null);
if(!workOrder)throw new Error(`work order missing: ${workOrderPath}`);
const base=path.join('artbook-submissions',gameId,date),output=path.join(base,'vibe2-first-draft.json');
const sourceDate=clean(workOrder.secondWork?.sourceDate||date),reusablePath=path.join('artbook-submissions',gameId,sourceDate,'vibe2-first-draft.json');
const catalog=readJson('game-catalog.json',{games:[]}),catalogGame=(catalog.games||[]).find(x=>clean(x.id)===gameId)||{};
const genreText=Array.isArray(catalogGame.genre)?catalogGame.genre.join(' '):clean(catalogGame.genre||'');

function complexityMinimumPages(){
  const text=`${workOrder.gameName||gameId} ${genreText} ${workOrder.styleProfile||''} ${workOrder.departmentTasks?.planning?.scope||''}`;
  if(/rpg|생존|어드벤처|스토리|퀘스트|모험/i.test(text))return 18;
  if(/디펜스|전략|수집|전투/i.test(text))return 16;
  return 12;
}
function storyPageCount(target){return Math.max(2,Math.min(20,Math.floor(target)-10));}
function pageLabels(count){return ['오프닝','초반','중반','후반','최종보스','엔딩','지역 흐름','메인 퀘스트','주요 NPC','보스 인과','성장 전환','갈등 확대','핵심 반전','최종 지역','엔딩 이후','빈 구간','서브 퀘스트','플레이 동기','사건 인과','전체 점검'].slice(0,count);}
function phaseText(d,stage){const p=(d.phasePlans||[]).find(x=>stageKey(x.stage)===stage);return p?`${p.region}: ${p.cause} → ${p.playerAction} → ${p.result} → ${p.nextHook}`:'';}
function questText(q){return q?`${q.stage}/${q.region}: ${q.quest} · ${q.cause} → ${q.playerAction} → ${q.result} → ${q.nextHook}`:'';}
function bossText(b){return b?`${b.boss}: ${b.trigger} → ${b.whyNow} → 승리 결과 ${b.winConsequence}`:'';}
function npcText(n){return n?`${n.name}: 목표 ${n.goal} · 갈등 ${n.conflict} · 플레이어 ${n.relationshipToPlayer}`:'';}
function transitionText(t){return t?`${t.from} → ${t.to}: ${t.cause} / 해금 ${t.unlock}`:'';}
function planChunks(d,count){
  const s=d.storySpine||{},regions=Array.isArray(d.regions)?d.regions:[],quests=Array.isArray(d.mainQuestChain)?d.mainQuestChain:[],chars=Array.isArray(d.npcMotivations)?d.npcMotivations:[],bosses=Array.isArray(d.bossCausality)?d.bossCausality:[],gaps=Array.isArray(d.gaps)?d.gaps:[],transitions=Array.isArray(d.regionTransitions)?d.regionTransitions:[];
  const core=[
    {title:'오프닝',items:[s.opening,phaseText(d,'OPENING')]},{title:'초반',items:[s.early,phaseText(d,'EARLY'),...quests.filter(x=>stageKey(x.stage)==='EARLY').slice(0,2).map(questText)]},{title:'중반',items:[s.mid,phaseText(d,'MID'),...quests.filter(x=>stageKey(x.stage)==='MID').slice(0,3).map(questText)]},{title:'후반',items:[s.late,phaseText(d,'LATE'),...quests.filter(x=>stageKey(x.stage)==='LATE').slice(0,3).map(questText)]},{title:'최종보스',items:[s.finalBoss,phaseText(d,'FINAL_BOSS'),...bosses.slice(0,2).map(bossText)]},{title:'엔딩',items:[s.ending,phaseText(d,'ENDING'),clean(d.endgame),clean(d.postgame)]},
    {title:'지역 흐름',items:[regions.join(' → '),...transitions.slice(0,3).map(transitionText)]},{title:'메인 퀘스트',items:quests.slice(0,4).map(questText)},{title:'주요 NPC',items:chars.slice(0,4).map(npcText)},{title:'보스 인과',items:bosses.slice(0,4).map(bossText)},{title:'성장 전환',items:[clean(d.progressionBridge)]},{title:'갈등 확대',items:[clean(d.conflictEscalation),clean(d.centralConflict)]},{title:'핵심 반전',items:[clean(d.twist)]},{title:'최종 지역',items:[clean(d.finalRegion)]},{title:'엔딩 이후',items:[clean(d.endgame),clean(d.postgame)]},{title:'빈 구간',items:gaps},{title:'서브 퀘스트',items:Array.isArray(d.sideQuestHooks)?d.sideQuestHooks:[]},{title:'플레이 동기',items:[clean(d.playerMotivation)]},{title:'사건 인과',items:[clean(d.causalitySummary)]},{title:'전체 점검',items:['OPENING → EARLY → MID → LATE → FINAL BOSS → ENDING',`메인 퀘스트 ${quests.length}개 · 인과 보스 ${bosses.length}개 · 빈 구간 ${gaps.length}개`]}
  ];
  return pageLabels(count).map((label,i)=>{const src=core.find(x=>x.title===label)||core[i%core.length],items=src.items.map(x=>clip(x,180)).filter(Boolean);return{title:label,items:items.length?items:['기획 AI가 검토·보완할 Vibe2 제안 구간']};});
}
function renderPage({gameName,title,items,index,total}){
  const rows=items.slice(0,4);while(rows.length<3)rows.push('기획 AI 검토 대상');const y=[260,365,470,560];
  const boxes=rows.map((item,i)=>`<g><rect x="90" y="${y[i]-48}" width="1020" height="82" rx="22" fill="#07131d" fill-opacity=".72" stroke="#71d4ff" stroke-opacity=".5"/><text x="122" y="${y[i]}" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="21" font-weight="750" fill="#eefaff">${esc(clip(item,58))}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c273a"/><stop offset="1" stop-color="#183f61"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1050" cy="70" r="210" fill="#75ddff" opacity=".08"/><text x="70" y="72" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="18" font-weight="800" fill="#8adfff">VIBE2 FIRST DRAFT · PROPOSAL</text><text x="70" y="125" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="36" font-weight="950" fill="#fff">${esc(gameName)} · ${esc(title)}</text><text x="1115" y="70" text-anchor="end" font-family="system-ui" font-size="17" fill="#b9dceb">${index+1}/${total}</text>${boxes}<text x="70" y="640" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="16" fill="#9fc8da">기존 근거와 새 제안을 분리한 Vibe2 1차 초안 · 기획부 검토 전 확정 설정 아님</text></svg>`;
}
function applyDraft(draft){
  const target=Math.max(complexityMinimumPages(),Math.min(30,Math.round(Number(draft.recommendedPages)||16)));draft.recommendedPages=target;
  const count=storyPageCount(target),gameName=clean(workOrder.gameName||gameId),plans=planChunks(draft,count),visuals=[];
  for(let i=0;i<plans.length;i++){const image=path.join(base,'visuals',`vibe2-draft-${i+1}.svg`).replaceAll('\\','/');fs.mkdirSync(path.dirname(image),{recursive:true});fs.writeFileSync(image,renderPage({gameName,title:plans[i].title,items:plans[i].items,index:i,total:plans.length}));visuals.push({no:i+1,title:plans[i].title,body:clip(plans[i].items.join(' · '),260),image,sourceDepartment:'vibe2',pageType:'vibe2-first-draft',vibe2Authored:true,assistantAuthored:false,proposal:true});}
  draft.version=3;draft.gameId=gameId;draft.date=date;draft.status='FIRST_DRAFT_READY';draft.author='vibe2';draft.proposalOnly=true;draft.requiredStoryStages=REQUIRED_STAGES;draft.qualityContract={phasePlans:6,minMainQuests:6,causalityRequired:true,evidenceProposalSeparation:true,compactGeneration:true,technicalNarrativeFilter:true};draft.visualPages=visuals;draft.visualPageCount=visuals.length;draft.targetArtbookPages=target;draft.sourceOfTruth='proposal-before-planning-review';writeJson(output,draft);
  const spine=draft.storySpine,summary=[`OPENING=${clip(spine.opening,100)}`,`EARLY=${clip(spine.early,100)}`,`MID=${clip(spine.mid,100)}`,`LATE=${clip(spine.late,100)}`,`FINAL=${clip(spine.finalBoss,100)}`,`ENDING=${clip(spine.ending,100)}`,`QUESTS=${draft.mainQuestChain.length}`].join(' | ');
  workOrder.version=Math.max(11,Number(workOrder.version)||0);workOrder.vibe2FirstDraftPath=output;workOrder.vibe2FirstDraft={status:'FIRST_DRAFT_READY',proposalOnly:true,targetArtbookPages:target,requiredStoryStages:REQUIRED_STAGES,qualityContract:draft.qualityContract,generationMode:draft.generationMode};workOrder.pagePolicy={min:12,default:16,max:30,target,legacyCompletedPages:10,homepageMode:'compact-card-detail-viewer'};workOrder.presentation={...(workOrder.presentation||{}),visualFirst:true,exactPages:target,minPages:12,maxPages:30,vibe2DraftPages:visuals.length,departmentAuthoredPages:8,directorAuthoredPages:2,assistantAuthoredPages:0,pagePlan:['director-cover',...visuals.map((_,i)=>`vibe2-draft-${i+1}`),'planning-1','planning-2','graphics-1','graphics-2','development-1','development-2','qa-1','balance-1','director-summary']};
  workOrder.departmentTasks=workOrder.departmentTasks||{};workOrder.departmentTasks.planning=workOrder.departmentTasks.planning||{};workOrder.departmentTasks.planning.vibe2FirstDraftPath=output;workOrder.departmentTasks.planning.scope=`${clean(workOrder.departmentTasks.planning.scope)} Vibe2 1차 초안(PROPOSAL)의 6단계 인과, 메인 퀘스트 체인, 지역 전환, NPC 동기, 보스 등장 이유를 검토·보완한다. 기존 근거와 충돌하면 근거를 우선한다. ${draft.generationMode==='DETERMINISTIC_FALLBACK'?'로컬 모델 형식 실패로 안전 골격을 사용했으므로 기획부가 창작 세부를 반드시 재작성한다.':''} ${summary}`.trim();workOrder.sourceEvidence=[...(Array.isArray(workOrder.sourceEvidence)?workOrder.sourceEvidence:[]),`${output} (Vibe2 proposal before planning review)`].filter((v,i,a)=>a.indexOf(v)===i);writeJson(workOrderPath,workOrder);
  const daily=readJson('artbook-daily-context.json',{});writeJson('artbook-daily-context.json',{...daily,vibe2FirstDraftPath:output,targetArtbookPages:target,vibe2DraftPages:visuals.length,pagePolicy:workOrder.pagePolicy});console.log(`VIBE2_FIRST_DRAFT=${output}`);console.log('VIBE2_STORY_STAGES=OPENING,EARLY,MID,LATE,FINAL_BOSS,ENDING');console.log(`VIBE2_MAIN_QUESTS=${draft.mainQuestChain.length}`);console.log(`ARTBOOK_TARGET_PAGES=${target}`);console.log(`VIBE2_DRAFT_PAGES=${visuals.length}`);console.log(`VIBE2_DRAFT_GENERATION_MODE=${draft.generationMode}`);console.log(`VIBE2_TECHNICAL_CONTAMINATION_REMOVED=${draft.technicalContaminationRemoved?.length||0}`);console.log('VIBE2_DRAFT_PROPOSAL_ONLY=YES');
}
if(String(workOrder.mode||'INITIAL').toUpperCase()==='SECOND_WORK'&&fs.existsSync(reusablePath)){const reusable=readJson(reusablePath,null);if(validExpandedDraft(reusable)){applyDraft({...reusable,date,sourceReusedFrom:reusablePath,generationMode:reusable.generationMode||'REUSED'});process.exit(0);}}

const unityFiles=listFiles(path.join('unity-games',gameId,'Assets','Scripts'),['.cs'],28),webFiles=listFiles(path.join('web-games',gameId),['.html','.js','.css','.json'],28),evidenceFiles=[...unityFiles,...webFiles];
const combined=evidenceFiles.map(f=>`\n### ${f}\n${readText(f)}`).join('\n').slice(0,500000),sourceMode=unityFiles.length&&webFiles.length?'UNITY_PLUS_WEB_ARCHIVE':unityFiles.length?'UNITY':webFiles.length?'WEB_ARCHIVE_READ_ONLY':'METADATA_ONLY';
const evidenceSnippets=gameplayEvidenceSnippets(combined,{max:32,radius:150});
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b'),minimumPages=complexityMinimumPages(),gameName=clean(workOrder.gameName||gameId);
const shortString={type:'string',maxLength:110};
const phaseSeed={type:'object',required:['stage','region','quest','cause','playerAction','result'],additionalProperties:false,properties:{stage:{type:'string',enum:REQUIRED_STAGES},region:shortString,quest:shortString,cause:shortString,playerAction:shortString,result:shortString}};
const compactSchema={type:'object',required:['recommendedPages','playerMotivation','centralConflict','twist','phases','finalBoss','ending','postgame','npcSeeds'],additionalProperties:false,properties:{recommendedPages:{type:'integer',minimum:12,maximum:30},playerMotivation:shortString,centralConflict:shortString,twist:shortString,phases:{type:'array',minItems:6,maxItems:6,items:phaseSeed},finalBoss:{type:'object',required:['boss','trigger','whyNow','winConsequence'],additionalProperties:false,properties:{boss:shortString,trigger:shortString,whyNow:shortString,winConsequence:shortString}},ending:shortString,postgame:shortString,npcSeeds:{type:'array',maxItems:4,items:{type:'object',required:['name','goal','conflict','relationshipToPlayer'],additionalProperties:false,properties:{name:shortString,goal:shortString,conflict:shortString,relationshipToPlayer:shortString}}}}};
async function callCompact(){
  let last=null;
  const system='/no_think\n너는 Vibe2 게임 기획 1차 초안 엔진이다. 반드시 한국어의 짧은 문장으로만 작성한다. 입력은 코드에서 게임플레이/스토리 키워드 주변만 추린 근거다. 렌더링·카메라·canvas·DPR·resize·DOM·CSS·픽셀·이벤트리스너 같은 기술 구현을 세계관, 지역, 퀘스트, 원인, 반전으로 쓰지 않는다. OPENING/EARLY/MID/LATE/FINAL_BOSS/ENDING을 정확히 한 번씩 만들고 각 단계의 원인→행동→결과가 다음 단계로 이어져야 한다. 기존 근거가 부족한 중후반은 PROPOSAL로 창작하되 기존 사실인 것처럼 쓰지 않는다. 각 문자열은 짧게, 전체 JSON은 6000자 이하를 목표로 한다. JSON만 출력한다.';
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:compactSchema,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({gameId,gameName,genre:genreText,sourceMode,minimumRecommendedPages:minimumPages,evidenceSnippets:evidenceSnippets.slice(0,attempt===1?28:16)})}],options:{temperature:attempt===1?0.18:0.08,seed:8100+attempt,num_ctx:6144,num_predict:1800}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const packet=await response.json(),text=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'');
      const parsed=JSON.parse(text);
      if(!Array.isArray(parsed.phases)||new Set(parsed.phases.map(x=>stageKey(x.stage))).size!==6)throw new Error('compact phase set invalid');
      return {seed:parsed,attempt};
    }catch(error){last=error;console.error(`VIBE2_COMPACT_RETRY=${attempt}:${error.message}`);}
  }
  return {seed:buildFallbackSeed({gameName,genreText,minimumPages}),attempt:2,fallbackReason:clean(last?.message||'compact generation failed')};
}
const generated=await callCompact();
const draft=expandCompactSeed(generated.seed,{gameName,genreText,minimumPages,evidenceSnippets});
draft.generationMode=generated.fallbackReason?'DETERMINISTIC_FALLBACK':'COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION';
draft.fallbackReason=generated.fallbackReason||null;
draft.runner={type:'vibe2-local-open-model-compact-first-draft',model,localInference:true,paidApi:false,apiKeyRequired:false,modelAttempts:generated.attempt,stages:['DETERMINISTIC_GAMEPLAY_EVIDENCE','COMPACT_CAUSALITY_SEED','DETERMINISTIC_EXPANSION','TECHNICAL_NARRATIVE_FILTER']};
draft.sourceMode=sourceMode;draft.evidenceFiles=evidenceFiles.slice(0,24);draft.evidenceSnippets=evidenceSnippets.slice(0,32);
if(!validExpandedDraft(draft))throw new Error('Vibe2 draft quality contract failed after compact expansion');
applyDraft(draft);
