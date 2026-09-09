import fs from 'node:fs';
import path from 'node:path';
import { clean, clip, REQUIRED_STAGES, gameplayEvidenceSnippets, buildFallbackSeed, expandCompactSeed, validExpandedDraft } from './vibe2-artbook-story-core.mjs';
import { buildGameFactPack, factPackPromptView, draftSemanticProblems } from './vibe2-game-fact-pack.mjs';
import { normalizeCompactSeedStages } from './vibe2-compact-seed-normalizer.mjs';

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
const gameName=clean(workOrder.gameName||catalogGame.name||gameId);

function complexityMinimumPages(){
  const text=`${gameName} ${genreText} ${workOrder.styleProfile||''} ${workOrder.departmentTasks?.planning?.scope||''}`;
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
    {title:'오프닝',items:[s.opening,phaseText(d,'OPENING')]},{title:'초반',items:[s.early,phaseText(d,'EARLY')]},{title:'중반',items:[s.mid,phaseText(d,'MID')]},{title:'후반',items:[s.late,phaseText(d,'LATE')]},{title:'최종보스',items:[s.finalBoss,phaseText(d,'FINAL_BOSS'),...bosses.slice(0,2).map(bossText)]},{title:'엔딩',items:[s.ending,phaseText(d,'ENDING'),clean(d.endgame),clean(d.postgame)]},
    {title:'지역 흐름',items:[regions.join(' → '),...transitions.slice(0,3).map(transitionText)]},{title:'메인 퀘스트',items:quests.slice(0,4).map(questText)},{title:'주요 NPC',items:chars.slice(0,4).map(npcText)},{title:'보스 인과',items:bosses.slice(0,4).map(bossText)},{title:'성장 전환',items:[clean(d.progressionBridge)]},{title:'갈등 확대',items:[clean(d.conflictEscalation),clean(d.centralConflict)]},{title:'핵심 반전',items:[clean(d.twist)]},{title:'최종 지역',items:[clean(d.finalRegion)]},{title:'엔딩 이후',items:[clean(d.endgame),clean(d.postgame)]},{title:'빈 구간',items:gaps},{title:'서브 퀘스트',items:Array.isArray(d.sideQuestHooks)?d.sideQuestHooks:[]},{title:'플레이 동기',items:[clean(d.playerMotivation)]},{title:'사건 인과',items:[clean(d.causalitySummary)]},{title:'전체 점검',items:['OPENING → EARLY → MID → LATE → FINAL BOSS → ENDING',`메인 퀘스트 ${quests.length}개 · 인과 보스 ${bosses.length}개 · 빈 구간 ${gaps.length}개`]}
  ];
  return pageLabels(count).map((label,i)=>{const src=core.find(x=>x.title===label)||core[i%core.length],items=src.items.map(x=>clip(x,180)).filter(Boolean);return{title:label,items:items.length?items:['기획 AI가 검토·보완할 Vibe2 제안 구간']};});
}
function renderPage({title,items,index,total}){
  const rows=items.slice(0,4);while(rows.length<3)rows.push('기획 AI 검토 대상');const y=[260,365,470,560];
  const boxes=rows.map((item,i)=>`<g><rect x="90" y="${y[i]-48}" width="1020" height="82" rx="22" fill="#07131d" fill-opacity=".72" stroke="#71d4ff" stroke-opacity=".5"/><text x="122" y="${y[i]}" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="21" font-weight="750" fill="#eefaff">${esc(clip(item,58))}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c273a"/><stop offset="1" stop-color="#183f61"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1050" cy="70" r="210" fill="#75ddff" opacity=".08"/><text x="70" y="72" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="18" font-weight="800" fill="#8adfff">VIBE2 FIRST DRAFT · PROPOSAL</text><text x="70" y="125" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="36" font-weight="950" fill="#fff">${esc(gameName)} · ${esc(title)}</text><text x="1115" y="70" text-anchor="end" font-family="system-ui" font-size="17" fill="#b9dceb">${index+1}/${total}</text>${boxes}<text x="70" y="640" font-family="system-ui,-apple-system,'Noto Sans KR',sans-serif" font-size="16" fill="#9fc8da">게임 사실 자료팩 기반 Vibe2 1차 초안 · 기획부 검토 전 확정 설정 아님</text></svg>`;
}

const unityFiles=listFiles(path.join('unity-games',gameId,'Assets','Scripts'),['.cs'],28),webFiles=listFiles(path.join('web-games',gameId),['.html','.js','.css','.json'],28),evidenceFiles=[...unityFiles,...webFiles];
const sourceFiles=evidenceFiles.map(file=>({path:file,text:readText(file)}));
const combined=sourceFiles.map(f=>`\n### ${f.path}\n${f.text}`).join('\n').slice(0,500000),sourceMode=unityFiles.length&&webFiles.length?'UNITY_PLUS_WEB_ARCHIVE':unityFiles.length?'UNITY':webFiles.length?'WEB_ARCHIVE_READ_ONLY':'METADATA_ONLY';
const evidenceSnippets=gameplayEvidenceSnippets(combined,{max:32,radius:150});
const gameFactPack=buildGameFactPack({gameId,gameName,genreText,files:sourceFiles});
const compactFactPack=factPackPromptView(gameFactPack);
const model=clean(process.env.ARTBOOK_LOCAL_MODEL||'qwen3:0.6b'),minimumPages=complexityMinimumPages();
const DIRECTION_IDS=['A','B','C'];
function normalizeCreativeDirections(rows){
  if(!Array.isArray(rows))return[];
  return rows.slice(0,3).map((row,index)=>({
    id:DIRECTION_IDS[index],
    focus:clip(row?.focus,110),
    playerExperience:clip(row?.playerExperience,110),
    signatureMoment:clip(row?.signatureMoment,110)
  }));
}
function creativeDirectionProblems(rows){
  const directions=normalizeCreativeDirections(rows),problems=[];
  if(directions.length!==3)return['creative-direction-count'];
  const texts=directions.map(row=>`${row.focus} ${row.playerExperience} ${row.signatureMoment}`.trim());
  if(directions.some(row=>row.focus.length<12||row.playerExperience.length<12||row.signatureMoment.length<12))problems.push('creative-direction-too-shallow');
  const keys=texts.map(text=>text.toLowerCase().replace(/[^a-z0-9가-힣]+/g,'').slice(0,180));
  if(new Set(keys).size!==3)problems.push('creative-directions-not-distinct');
  const terms=(gameFactPack.gameSpecificTerms||[]).map(term=>clean(term)).filter(term=>term.length>=2).slice(0,12);
  if(terms.length>=4){
    const used=new Set();
    for(const term of terms){if(texts.some(text=>text.toLowerCase().includes(term.toLowerCase())))used.add(term.toLowerCase());}
    if(used.size<2)problems.push('creative-directions-weak-game-grounding');
  }
  return [...new Set(problems)];
}
function fallbackCreativeDirections(){
  const terms=(gameFactPack.gameSpecificTerms||[]).map(clean).filter(Boolean).slice(0,6);
  const pick=(index,fallback)=>terms[index%Math.max(1,terms.length)]||fallback;
  return [
    {id:'A',focus:`${pick(0,gameName)}를 중심으로 관찰·판단의 재미를 전면에 둔다.`,playerExperience:`플레이어가 ${pick(1,'핵심 대상')}의 상태와 주변 단서를 읽고 다음 행동을 스스로 고르게 한다.`,signatureMoment:`${pick(0,gameName)}와 ${pick(2,'핵심 환경')}의 관계를 한 장면에서 바로 이해하는 순간을 만든다.`},
    {id:'B',focus:`${pick(3,gameName)}를 중심으로 위험·압박과 돌파의 재미를 강조한다.`,playerExperience:`플레이어가 ${pick(4,'핵심 위협')} 때문에 익숙한 방식이 막히고 다른 수단으로 위기를 넘기게 한다.`,signatureMoment:`${pick(3,gameName)}의 위협이 ${pick(5,'핵심 규칙')}과 동시에 작동해 선택을 강요하는 장면을 만든다.`},
    {id:'C',focus:`${pick(2,gameName)}를 중심으로 성장·구축·변화의 재미를 강조한다.`,playerExperience:`플레이어의 반복 행동이 ${pick(0,'핵심 시스템')}을 눈에 보이게 바꾸고 다음 목표를 열도록 한다.`,signatureMoment:`초반의 ${pick(1,'핵심 요소')}가 후반에는 완전히 다른 역할로 돌아오는 장면을 만든다.`}
  ];
}

function applyDraft(draft){
  let creativeDirections=normalizeCreativeDirections(draft.creativeDirections);
  const directionProblems=creativeDirectionProblems(creativeDirections);
  if(directionProblems.length)creativeDirections=fallbackCreativeDirections();
  draft.creativeDirections=creativeDirections;
  draft.storySpine={...(draft.storySpine||{}),creativeDirections};
  const semanticProblems=draftSemanticProblems(draft,{factPack:gameFactPack,generationMode:draft.generationMode});
  draft.gameFactPack=gameFactPack;
  draft.semanticQuality={pass:semanticProblems.length===0,problems:semanticProblems,gameSpecificTermsUsed:(gameFactPack.gameSpecificTerms||[]).filter(term=>JSON.stringify(draft).toLowerCase().includes(String(term).toLowerCase())).slice(0,16),creativeDirectionsPass:creativeDirectionProblems(creativeDirections).length===0,creativeDirectionFallbackUsed:directionProblems.length>0};
  draft.validationStatus=draft.semanticQuality.pass?'PASS':'NEEDS_VALIDATION';
  const target=Math.max(minimumPages,Math.min(30,Math.round(Number(draft.recommendedPages)||16)));draft.recommendedPages=target;
  const count=storyPageCount(target),plans=planChunks(draft,count),visuals=[];
  for(let i=0;i<plans.length;i++){const image=path.join(base,'visuals',`vibe2-draft-${i+1}.svg`).replaceAll('\\','/');fs.mkdirSync(path.dirname(image),{recursive:true});fs.writeFileSync(image,renderPage({title:plans[i].title,items:plans[i].items,index:i,total:plans.length}));visuals.push({no:i+1,title:plans[i].title,body:clip(plans[i].items.join(' · '),260),image,sourceDepartment:'vibe2',pageType:'vibe2-first-draft',vibe2Authored:true,assistantAuthored:false,proposal:true});}
  draft.version=5;draft.gameId=gameId;draft.date=date;draft.status='FIRST_DRAFT_READY';draft.author='vibe2';draft.proposalOnly=true;draft.requiredStoryStages=REQUIRED_STAGES;
  draft.qualityContract={phasePlans:6,minMainQuests:6,causalityRequired:true,evidenceProposalSeparation:true,compactGeneration:true,technicalNarrativeFilter:true,gameFactPackRequired:true,semanticDistinctnessRequired:true,gameSpecificGroundingRequired:true,creativeDirections:3,planningSelectOrMix:true,nameSwapGenericityRejected:true};
  draft.visualPages=visuals;draft.visualPageCount=visuals.length;draft.targetArtbookPages=target;draft.sourceOfTruth='proposal-before-planning-review';writeJson(output,draft);
  const spine=draft.storySpine,summary=[`OPENING=${clip(spine.opening,100)}`,`EARLY=${clip(spine.early,100)}`,`MID=${clip(spine.mid,100)}`,`LATE=${clip(spine.late,100)}`,`FINAL=${clip(spine.finalBoss,100)}`,`ENDING=${clip(spine.ending,100)}`,`QUESTS=${draft.mainQuestChain.length}`].join(' | ');
  workOrder.version=Math.max(13,Number(workOrder.version)||0);workOrder.vibe2FirstDraftPath=output;workOrder.vibe2FirstDraft={status:'FIRST_DRAFT_READY',proposalOnly:true,targetArtbookPages:target,requiredStoryStages:REQUIRED_STAGES,qualityContract:draft.qualityContract,generationMode:draft.generationMode,validationStatus:draft.validationStatus,semanticProblems:draft.semanticQuality.problems,factPackStats:gameFactPack.stats,stageLabelsNormalized:draft.runner?.stageLabelsNormalized===true,creativeDirections};
  workOrder.pagePolicy={min:12,default:16,max:30,target,legacyCompletedPages:10,homepageMode:'compact-card-detail-viewer'};workOrder.presentation={...(workOrder.presentation||{}),visualFirst:true,exactPages:target,minPages:12,maxPages:30,vibe2DraftPages:visuals.length,departmentAuthoredPages:8,directorAuthoredPages:2,assistantAuthoredPages:0,pagePlan:['director-cover',...visuals.map((_,i)=>`vibe2-draft-${i+1}`),'planning-1','planning-2','graphics-1','graphics-2','development-1','development-2','qa-1','balance-1','director-summary']};
  workOrder.departmentTasks=workOrder.departmentTasks||{};workOrder.departmentTasks.planning=workOrder.departmentTasks.planning||{};workOrder.departmentTasks.planning.vibe2FirstDraftPath=output;workOrder.departmentTasks.planning.scope=`${clean(workOrder.departmentTasks.planning.scope)} 게임 사실 자료팩과 Vibe2 1차 초안(PROPOSAL)을 대조한다. FACT/EVIDENCE와 UNKNOWN/PROPOSAL을 섞지 말고, 6단계가 서로 다른 실제 게임 특징을 사용했는지 검증한다. Vibe2 초안의 storySpine.creativeDirections A/B/C는 서로 다른 가벼운 방향 제안이다. 기획부는 셋 중 하나를 선택하거나 최대 두 개를 혼합해도 되고 셋을 모두 살릴 필요는 없다. conceptPlan.creativeIdeas 첫 항목을 [DIRECTION:A], [DIRECTION:B], [DIRECTION:C] 또는 [MIX:A+B]처럼 시작해 선택 이유와 이 게임에서만 통하는 근거를 적는다. 다른 게임 이름으로 바꿔도 자연스러운 일반론이면 버린다. ${draft.validationStatus!=='PASS'?`초안 의미 품질 미통과(${draft.semanticQuality.problems.join(', ')})이므로 그대로 설계 기준선으로 넘기지 말고 반드시 재검토한다.`:''} ${summary}`.trim();
  workOrder.sourceEvidence=[...(Array.isArray(workOrder.sourceEvidence)?workOrder.sourceEvidence:[]),`${output} (Vibe2 proposal + embedded deterministic game fact pack + three creative directions)`].filter((v,i,a)=>a.indexOf(v)===i);writeJson(workOrderPath,workOrder);
  const daily=readJson('artbook-daily-context.json',{});writeJson('artbook-daily-context.json',{...daily,vibe2FirstDraftPath:output,targetArtbookPages:target,vibe2DraftPages:visuals.length,pagePolicy:workOrder.pagePolicy,vibe2ValidationStatus:draft.validationStatus,factPackStats:gameFactPack.stats,creativeDirectionCount:creativeDirections.length});
  console.log(`VIBE2_FIRST_DRAFT=${output}`);console.log(`VIBE2_FACT_PACK_EVIDENCE=${gameFactPack.stats.totalEvidence}`);console.log(`VIBE2_FACT_PACK_TERMS=${gameFactPack.stats.gameSpecificTerms}`);console.log(`VIBE2_DRAFT_STAGE_LABELS_NORMALIZED=${draft.runner?.stageLabelsNormalized===true?'YES':'NO'}`);console.log(`VIBE2_DRAFT_VALIDATION=${draft.validationStatus}`);if(semanticProblems.length)console.log(`VIBE2_DRAFT_SEMANTIC_PROBLEMS=${semanticProblems.join('|')}`);console.log(`VIBE2_DRAFT_GENERATION_MODE=${draft.generationMode}`);console.log(`VIBE2_CREATIVE_DIRECTIONS=${creativeDirections.map(x=>x.id).join(',')}`);console.log(`VIBE2_CREATIVE_DIRECTION_FALLBACK=${directionProblems.length?'YES':'NO'}`);console.log('VIBE2_DRAFT_PROPOSAL_ONLY=YES');
}

if(String(workOrder.mode||'INITIAL').toUpperCase()==='SECOND_WORK'&&fs.existsSync(reusablePath)){
  const reusable=readJson(reusablePath,null);
  if(validExpandedDraft(reusable)&&reusable?.semanticQuality?.pass===true&&reusable?.gameFactPack){applyDraft({...reusable,date,sourceReusedFrom:reusablePath,generationMode:reusable.generationMode||'REUSED'});process.exit(0);}
}

const shortString={type:'string',maxLength:110};
const phaseSeed={type:'object',required:['stage','region','quest','cause','playerAction','result'],additionalProperties:false,properties:{stage:{type:'string',enum:REQUIRED_STAGES},region:shortString,quest:shortString,cause:shortString,playerAction:shortString,result:shortString}};
const creativeDirectionSeed={type:'object',required:['id','focus','playerExperience','signatureMoment'],additionalProperties:false,properties:{id:{type:'string',enum:DIRECTION_IDS},focus:shortString,playerExperience:shortString,signatureMoment:shortString}};
const compactSchema={type:'object',required:['recommendedPages','playerMotivation','centralConflict','twist','phases','finalBoss','ending','postgame','npcSeeds','creativeDirections'],additionalProperties:false,properties:{recommendedPages:{type:'integer',minimum:12,maximum:30},playerMotivation:shortString,centralConflict:shortString,twist:shortString,phases:{type:'array',minItems:6,maxItems:6,items:phaseSeed},finalBoss:{type:'object',required:['boss','trigger','whyNow','winConsequence'],additionalProperties:false,properties:{boss:shortString,trigger:shortString,whyNow:shortString,winConsequence:shortString}},ending:shortString,postgame:shortString,npcSeeds:{type:'array',maxItems:4,items:{type:'object',required:['name','goal','conflict','relationshipToPlayer'],additionalProperties:false,properties:{name:shortString,goal:shortString,conflict:shortString,relationshipToPlayer:shortString}}},creativeDirections:{type:'array',minItems:3,maxItems:3,items:creativeDirectionSeed}}};
async function callCompact(){
  let last=null;
  const system='/no_think\n너는 Vibe2 게임 기획 1차 초안 엔진이다. 입력의 gameFactPack은 코드에서 먼저 추출한 검토 자료다. categories의 SOURCE_EVIDENCE는 실제 근거이며 unknownAreas는 확인되지 않은 영역이다. 확인되지 않은 세계관을 FACT처럼 만들지 말고 PROPOSAL로만 보완한다. gameSpecificTerms가 4개 이상이면 서로 다른 실제 용어를 최소 2개 이상 사용하고, 최소 2개 단계가 실제 게임 특징에 직접 연결되어야 한다. phases 배열 순서는 반드시 OPENING, EARLY, MID, LATE, FINAL_BOSS, ENDING 순서다. 각 단계의 원인→행동→결과가 다음 단계로 이어져야 한다. 단계마다 같은 전략적 계획/전략적 이해 같은 문장을 반복하지 않는다. creativeDirections는 A/B/C 정확히 3개를 만든다. 세 방향은 플레이어가 무엇을 보고·결정하고·반복하는지가 서로 달라야 하며, 각 방향에 이 게임 코드에서 나온 고유 용어나 규칙을 넣는다. A/B/C 중 하나만 채택해도 완성될 정도로 독립된 짧은 방향이어야 한다. 다른 게임 이름으로 바꿔도 자연스러운 일반론은 쓰지 않는다. 렌더링·카메라·canvas·DPR·resize·DOM·CSS·픽셀·이벤트리스너 같은 기술 구현을 세계관이나 사건으로 쓰지 않는다. 짧은 한국어 JSON만 출력한다.';
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const payload={gameId,gameName,genre:genreText,sourceMode,minimumRecommendedPages:minimumPages,gameFactPack:compactFactPack,evidenceSnippets:evidenceSnippets.slice(0,attempt===1?18:10)};
      const response=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:compactSchema,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}],options:{temperature:attempt===1?0.24:0.12,seed:8100+attempt,num_ctx:6144,num_predict:1800}})});
      if(!response.ok)throw new Error(`ollama ${response.status}: ${await response.text()}`);
      const packet=await response.json(),text=clean(packet?.message?.content).replace(/^```json\s*/i,'').replace(/```$/,'');
      const parsed=JSON.parse(text),normalized=normalizeCompactSeedStages(parsed);
      if(!normalized.valid)throw new Error(`compact ${normalized.reason}`);
      normalized.seed.creativeDirections=normalizeCreativeDirections(normalized.seed.creativeDirections);
      const directionProblems=creativeDirectionProblems(normalized.seed.creativeDirections);
      if(directionProblems.length)throw new Error(`creative directions: ${directionProblems.join(',')}`);
      const preview=expandCompactSeed(normalized.seed,{gameName,genreText,minimumPages,evidenceSnippets});
      preview.creativeDirections=normalized.seed.creativeDirections;
      preview.storySpine={...(preview.storySpine||{}),creativeDirections:normalized.seed.creativeDirections};
      if(!validExpandedDraft(preview))throw new Error('expanded draft shape invalid');
      const semantic=draftSemanticProblems(preview,{factPack:gameFactPack,generationMode:'COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION'});
      if(semantic.length)throw new Error(`semantic quality: ${semantic.join(',')}`);
      if(normalized.normalized)console.error(`VIBE2_COMPACT_STAGE_LABELS_NORMALIZED=${normalized.originalStages.join('>')}`);
      return {seed:normalized.seed,attempt,stageLabelsNormalized:normalized.normalized,originalStages:normalized.originalStages};
    }catch(error){last=error;console.error(`VIBE2_COMPACT_RETRY=${attempt}:${error.message}`);}
  }
  return {seed:{...buildFallbackSeed({gameName,genreText,minimumPages}),creativeDirections:fallbackCreativeDirections()},attempt:2,fallbackReason:clean(last?.message||'compact generation failed'),stageLabelsNormalized:false,originalStages:null};
}
const generated=await callCompact();
const draft=expandCompactSeed(generated.seed,{gameName,genreText,minimumPages,evidenceSnippets});
draft.creativeDirections=normalizeCreativeDirections(generated.seed.creativeDirections);
draft.storySpine={...(draft.storySpine||{}),creativeDirections:draft.creativeDirections};
draft.generationMode=generated.fallbackReason?'DETERMINISTIC_FALLBACK':'COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION';
draft.fallbackReason=generated.fallbackReason||null;
draft.runner={type:'vibe2-local-open-model-compact-first-draft',model,localInference:true,paidApi:false,apiKeyRequired:false,modelAttempts:generated.attempt,stageLabelsNormalized:generated.stageLabelsNormalized===true,originalStageLabels:generated.originalStages||null,stages:['DETERMINISTIC_GAME_FACT_PACK','COMPACT_CAUSALITY_SEED','THREE_CREATIVE_DIRECTIONS','DETERMINISTIC_STAGE_LABEL_NORMALIZATION','DETERMINISTIC_EXPANSION','SEMANTIC_GROUNDING_GATE','TECHNICAL_NARRATIVE_FILTER']};
draft.sourceMode=sourceMode;draft.evidenceFiles=evidenceFiles.slice(0,24);draft.evidenceSnippets=evidenceSnippets.slice(0,32);
if(!validExpandedDraft(draft))throw new Error('Vibe2 draft quality contract failed after compact expansion');
applyDraft(draft);
