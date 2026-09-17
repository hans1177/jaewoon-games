// 파일명: _worker.js
// 역할: 재운게임즈 정적 자산 라우팅, 게임 런타임 AI, Vibe Maker 서버 관측 경계, 서버 기준 홈페이지 카탈로그 동기화
const AI_JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const GAME_AI_PURPOSES = new Set(['dialogue','strategy','companion','npc','enemy','boss','party','merchant','quest','coop','director']);
const VIBE_REPOSITORY = 'hans1177/jaewoon-games';
const VIBE_RUNTIME_BRANCH = 'company-runtime';
const VIBE_WORKFLOWS = new Set(['Vibe QA','Vibe Integrated Regression']);
const RUNTIME_SYNC_SECONDS = 30;
const MIN_DEVELOPMENT_SCORE_SCHEMA = 13;
const RUNTIME_SUPPORTED_PLATFORMS = ['UNITY','ROBLOX','FORTNITE_UEFN'];
const UNIVERSAL_TOUCH_SCRIPT='<script src="/web-games/_shared/touch-controls.js?v=20260913-touch1"></script>';

function aiJson(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{status,headers:{...AI_JSON_HEADERS,...extraHeaders}});
}
function clipText(value,max=4000){return String(value??'').trim().slice(0,max);}
function handleAiStatus(env){
  return aiJson({ok:true,geminiConfigured:Boolean(env.GEMINI_API_KEY),model:clipText(env.GEMINI_MODEL||'gemini-2.5-flash-lite',80),scope:'in-game-runtime-only',purposes:[...GAME_AI_PURPOSES]});
}
function outputContract(purpose){
  if(purpose==='dialogue'||purpose==='npc'||purpose==='merchant'||purpose==='quest')return '{"speech":"short natural in-game line","mood":"neutral|happy|angry|afraid|sad|excited","intent":"talk|warn|help|refuse|trade|quest"}';
  return '{"action":"short_action_id","target":"optional game entity id","reason":"short reason","speech":"optional short line"}';
}
async function handleGemini(request,env){
  if(request.method!=='POST')return aiJson({error:'method_not_allowed'},405);
  if(!env.GEMINI_API_KEY)return aiJson({error:'gemini_not_configured'},503);
  let body={};
  try{body=await request.json();}catch{return aiJson({error:'invalid_json'},400);}
  const purpose=clipText(body.purpose||'dialogue',40).toLowerCase();
  if(!GAME_AI_PURPOSES.has(purpose))return aiJson({error:'unsupported_game_ai_purpose',allowed:[...GAME_AI_PURPOSES]},400);
  const system=clipText(body.system||'',1600),context=clipText(body.context||'',5000),userText=clipText(body.user_text||'',2000);
  if(!context&&!userText)return aiJson({error:'empty_prompt'},400);
  const model=clipText(env.GEMINI_MODEL||'gemini-2.5-flash-lite',80);
  const instruction=[
    'You are an AI used only at runtime inside a video game.',
    `Runtime role: ${purpose}.`,
    'You may control dialogue, companion/NPC/enemy/boss/party/co-op decisions, merchant or quest reactions, and game-director suggestions only through the supplied game context and allowed action ids.',
    'Never edit, generate, review, diagnose, or return source code. Never act as Vibe Maker or as a game-development agent.',
    'Never invent or directly mutate authoritative game rules, stats, rewards, inventory, save data, progression, or combat results. The game engine remains authoritative.',
    'Choose only actions that are explicitly available in GAME CONTEXT. If none are valid, use action "idle" or a non-authoritative speech response.',
    `Return JSON only in this shape: ${outputContract(purpose)}.`,
    system
  ].filter(Boolean).join('\n');
  const prompt=[context?`GAME CONTEXT:\n${context}`:'',userText?`PLAYER INPUT:\n${userText}`:''].filter(Boolean).join('\n\n');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:purpose==='dialogue'||purpose==='npc'?0.8:0.35,maxOutputTokens:220,responseMimeType:'application/json'}})
    });
    const raw=await upstream.json().catch(()=>({}));
    if(!upstream.ok)return aiJson({error:'gemini_upstream_error',status:upstream.status},upstream.status>=500?502:429);
    const text=raw?.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('')||'';
    let result=null;
    try{result=JSON.parse(text);}catch{return aiJson({error:'invalid_model_json'},502);}
    return aiJson({ok:true,purpose,model,result});
  }catch(error){
    return aiJson({error:error?.name==='AbortError'?'gemini_timeout':'gemini_request_failed'},502);
  }finally{clearTimeout(timeout);}
}

async function handleVibeWorkflowObservation(request,env,url){
  if(request.method!=='GET')return aiJson({error:'method_not_allowed'},405);
  const headSha=clipText(url.searchParams.get('head_sha'),40).toLowerCase();
  if(!/^[0-9a-f]{40}$/.test(headSha))return aiJson({error:'invalid_head_sha'},400);
  const headers={Accept:'application/vnd.github+json','User-Agent':'jaewoon-vibe-maker','X-GitHub-Api-Version':'2022-11-28'};
  if(env.GITHUB_TOKEN)headers.Authorization=`Bearer ${env.GITHUB_TOKEN}`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const endpoint=`https://api.github.com/repos/${VIBE_REPOSITORY}/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=50`;
    const upstream=await fetch(endpoint,{headers,signal:controller.signal});
    const raw=await upstream.json().catch(()=>({}));
    if(!upstream.ok)return aiJson({error:'github_actions_upstream_error',status:upstream.status},upstream.status>=500?502:upstream.status);
    const runs=(Array.isArray(raw.workflow_runs)?raw.workflow_runs:[])
      .filter(run=>VIBE_WORKFLOWS.has(run?.name)&&String(run?.head_sha||'').toLowerCase()===headSha)
      .map(run=>({id:run.id,name:run.name,head_sha:run.head_sha,status:run.status,conclusion:run.conclusion,event:run.event,run_attempt:run.run_attempt,created_at:run.created_at,updated_at:run.updated_at}));
    return aiJson({ok:true,repository:VIBE_REPOSITORY,head_sha:headSha,runs,authority:'github-actions-workflow-source'});
  }catch(error){
    return aiJson({error:error?.name==='AbortError'?'github_actions_timeout':'github_actions_request_failed'},502);
  }finally{clearTimeout(timeout);}
}

function runtimeBucket(){return Math.floor(Date.now()/(RUNTIME_SYNC_SECONDS*1000));}
async function fetchRuntimeJson(path){
  const endpoint=`https://raw.githubusercontent.com/${VIBE_REPOSITORY}/${VIBE_RUNTIME_BRANCH}/${path}?runtime=${runtimeBucket()}`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const upstream=await fetch(endpoint,{headers:{Accept:'application/json','Cache-Control':'no-cache','User-Agent':'jaewoon-homepage-runtime-sync'},signal:controller.signal});
    if(!upstream.ok)throw new Error(`runtime_${path}_${upstream.status}`);
    return await upstream.json();
  }finally{clearTimeout(timeout);}
}
function normalizePlatform(value){
  const raw=String(value??'').trim().toUpperCase().replaceAll('-','_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE_UEFN','UEFN','FORTNITE'].includes(raw))return 'FORTNITE_UEFN';
  return '';
}
function targetForPlatform(platform){
  if(platform==='ROBLOX')return 'roblox';
  if(platform==='UNITY')return 'unity-android';
  if(platform==='FORTNITE_UEFN')return 'fortnite-uefn';
  return 'design-only';
}
function categoryMeta(category=''){
  const key=String(category).toUpperCase();
  if(key==='ACTION_SURVIVAL_ROGUELITE')return {genre:['액션','생존','로그라이트'],image:'assets/page-bg-v4.webp'};
  if(key==='SINGLE_DEFENSE_STRATEGY')return {genre:['디펜스','전략'],image:'assets/crystal-v2.webp'};
  if(key==='PUZZLE')return {genre:['퍼즐','모바일'],image:'assets/homepage-covers/chromatic-cascade.svg'};
  if(key==='CASUAL')return {genre:['캐주얼','생활'],image:'assets/page-bg-v3.webp'};
  if(key==='IDLE_GROWTH_RPG')return {genre:['방치형','RPG'],image:'assets/card-rpg-v2.webp'};
  if(key==='STORY_COMPLETE_RPG')return {genre:['스토리','RPG'],image:'assets/fantasy-rpg-v2.webp'};
  return {genre:['게임'],image:'assets/page-bg-v4.webp'};
}
function productionCategory(productionClass){
  if(productionClass==='RELEASE_CONFIRMED')return 'release-confirmed';
  if(productionClass==='DEVELOPMENT_CONFIRMED')return 'development-confirmed';
  return 'design-only';
}
function releaseEvidenceConfirmed(...entities){
  for(const entity of entities){
    if(!entity)continue;
    if(entity.releasePublished===true||entity.platformReleasePublished===true||entity.productionReleased===true)return true;
    if(entity.robloxReleaseEvidence?.published===true&&entity.robloxReleaseEvidence?.verified!==false)return true;
    if(entity.robloxPublicationTarget?.published===true&&entity.robloxPublicationTarget?.verified===true)return true;
    if(entity.unityReleaseEvidence?.published===true&&entity.unityReleaseEvidence?.verified!==false)return true;
    if(entity.playStoreReleaseEvidence?.published===true&&entity.playStoreReleaseEvidence?.verified!==false)return true;
    if(entity.uefnReleaseEvidence?.published===true&&entity.uefnReleaseEvidence?.verified!==false)return true;
    if(entity.fortniteReleaseEvidence?.published===true&&entity.fortniteReleaseEvidence?.verified!==false)return true;
  }
  return false;
}
function stageFor(project,seed,productionClass,platform){
  if(productionClass==='RELEASE_CONFIRMED')return `출시 · ${platform||'플랫폼 선택 필요'}`;
  if(productionClass==='DEVELOPMENT_CONFIRMED')return `개발확정 · ${platform||'플랫폼 선택 필요'}`;
  const state=String(seed?.lifecycleState||'').replaceAll('_',' ').trim();
  if(state&&state!=='DESIGN ONLY')return `기획 · ${state}`;
  return '기획 · 서버 설계 진행중';
}
function bindingMatches(current,initial){
  const c=String(current??'').trim(),i=String(initial??'').trim();
  return !c||(!!i&&c===i);
}
function reworkOrRevalidation(row){
  return [row?.canonicalState,row?.currentStep,row?.homepageTestVerdict,row?.formalImplementationVerdict,row?.resumeStage].some(value=>{
    const v=String(value??'').trim().toUpperCase();
    return v.includes('REWORK')||v.includes('REVALIDATION');
  });
}
function numericScore(value){
  if(value===null||value===undefined||value==='')return null;
  const score=Number(value);
  return Number.isFinite(score)&&score>=0&&score<=100?score:null;
}
function designScoreInfo(seed){
  const score=numericScore(seed?.strictDesignReview?.totalScore);
  if(score===null)return null;
  const verdict=String(seed?.strictDesignReview?.verdict||'').toUpperCase();
  const hardFailures=Array.isArray(seed?.strictDesignReview?.hardFailures)?seed.strictDesignReview.hardFailures:[];
  const passed=verdict==='PASS'&&hardFailures.length===0;
  return {score,label:passed?`${score}점`:`${score}점 · 설계 재검토`,current:true,source:'SERVER_SEED_STRICT_DESIGN_REVIEW'};
}
function scoreInfo(row,productionClass,seed){
  const design=designScoreInfo(seed);
  const seedClass=String(seed?.productionClass||'').trim().toUpperCase();
  const seedGeneration=String(seed?.generation||seed?.ownerResetRevision||'').trim().toUpperCase();
  const ownerResetDesign=seedClass==='DESIGN_ONLY'&&seedGeneration.includes('OWNER')&&seedGeneration.includes('DESIGN')&&seedGeneration.includes('RESET');
  if(ownerResetDesign||productionClass==='DESIGN_ONLY')return design||{score:null,label:'점수 미평가',current:false,source:'SERVER_SEED_STRICT_DESIGN_REVIEW'};
  const revalidating=reworkOrRevalidation(row);
  if(row){
    const queueScores=[
      [row.homepageTestScore,'SERVER_DEVELOPMENT_QUEUE_HOMEPAGE_TEST'],
      [row.strictImplementationScore,'SERVER_DEVELOPMENT_QUEUE_STRICT_IMPLEMENTATION'],
      [row.webStrictScore,'SERVER_DEVELOPMENT_QUEUE_WEB_STRICT']
    ];
    for(const [value,source] of queueScores){
      const score=numericScore(value);
      if(score!==null)return {score,label:revalidating?`${score}점 · 재검증 필요`:`${score}점`,current:!revalidating,source};
    }
    const initialPassed=row.webInitialCyclePassed===true;
    const schema=Number(row.webInitialCycleValidationSchemaVersion);
    const musicPassed=row.webInitialCycleMusicValidationPassed===true;
    const sourceBound=bindingMatches(row.webSourceIndexSha256,row.webInitialCycleSourceIndexSha256);
    const baselineBound=bindingMatches(row.webDesignBaselineSha256,row.webInitialCycleDesignBaselineSha256);
    const score=numericScore(row.webInitialCycleStrictScore);
    if(initialPassed&&Number.isFinite(schema)&&schema>=MIN_DEVELOPMENT_SCORE_SCHEMA&&musicPassed&&score!==null){
      const current=!revalidating&&sourceBound&&baselineBound;
      return {score,label:current?`${score}점`:`${score}점 · 재검증 필요`,current,source:'SERVER_DEVELOPMENT_QUEUE_INITIAL_STRICT'};
    }
  }
  if(design)return design;
  if(productionClass==='RELEASE_CONFIRMED')return {score:null,label:'출시',current:true,source:'SERVER_RUNTIME'};
  return {score:null,label:'점수 미평가',current:false,source:'SERVER_DEVELOPMENT_QUEUE'};
}
function playModeLabel(value){
  const mode=String(value??'').trim().toUpperCase();
  if(mode==='SINGLE')return '싱글';
  if(mode==='COOP')return '협동';
  if(mode==='COMPETITIVE')return '경쟁';
  if(mode==='HYBRID')return '혼합';
  return '플레이 방식 미평가';
}
function latestWork(base,queue){
  const direct=String(queue?.homepageRecentWork||'').trim();
  if(direct)return direct;
  const raw=String(queue?.currentStep||queue?.resumeStage||queue?.executionEvidence?.failureStage||queue?.canonicalState||'').trim().toUpperCase();
  const labels={WEB_GAMEPLAY_AND_MUSIC_VALIDATION:'웹 게임플레이·음악 검증',FULL_APPROVED_SCOPE_WEB_COMPANION_BOOTSTRAP:'승인 범위 웹 콘텐츠 확장',TARGET_PLATFORM_RUNTIME:'플랫폼 실행 검증',TARGET_PLATFORM_QA:'플랫폼 QA',ROBLOX_POST_RUNTIME_QA:'Roblox 실행 후 QA',FINAL_CONTENT_DEPTH:'최종 콘텐츠 깊이 검증',IMMUTABLE_ARTIFACT_BIND:'빌드 결과물 고정',WEB_CONTENT_DEVELOPMENT_REWORK:'웹 콘텐츠 재작업'};
  if(raw)return labels[raw]||raw.replaceAll('_',' ');
  return String(base?.homepageRecentWork||'개발 작업 정보 없음');
}
function latestById(rows,idField){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=String(row?.[idField]||'').trim();
    if(!id)continue;
    const old=map.get(id);
    const t=Date.parse(row?.ROBLOX_GENRE_REVIEWED_AT||row?.updatedAt||row?.webValidationLastAttemptAt||row?.createdAt||row?.enqueuedAt||'')||0;
    const oldT=Date.parse(old?.ROBLOX_GENRE_REVIEWED_AT||old?.updatedAt||old?.webValidationLastAttemptAt||old?.createdAt||old?.enqueuedAt||'')||0;
    if(!old||t>=oldT)map.set(id,row);
  }
  return map;
}
function mergeRuntimeCatalog(baseCatalog,portfolio,seedState,developmentQueue){
  const allBaseGames=Array.isArray(baseCatalog?.games)?baseCatalog.games:[];
  const baseGames=allBaseGames.filter(game=>['ACTIVE','REBUILD'].includes(String(game?.lifecycleState||'ACTIVE').toUpperCase()));
  const projects=Array.isArray(portfolio?.projects)?portfolio.projects:[];
  const activeSeeds=(Array.isArray(seedState?.seeds)?seedState.seeds:[]).filter(seed=>String(seed?.status||'').toUpperCase()==='ACTIVE');
  const queueItems=Array.isArray(developmentQueue?.items)?developmentQueue.items:[];
  const projectBySlug=latestById(projects,'slug');
  const seedById=latestById(activeSeeds,'gameId');
  const queueById=latestById(queueItems,'gameId');
  const games=baseGames.map(base=>{
    const id=String(base.id||'').trim();
    const project=projectBySlug.get(id)||null;
    const seed=seedById.get(id)||null;
    const queue=queueById.get(id)||null;
    const rawProductionClass=String(base.productionClass||queue?.productionClass||project?.productionClass||seed?.productionClass||'DESIGN_ONLY').toUpperCase();
    const releaseVerified=releaseEvidenceConfirmed(base,queue,project,seed);
    const productionClass=rawProductionClass==='RELEASE_CONFIRMED'&&!releaseVerified?'DEVELOPMENT_CONFIRMED':rawProductionClass;
    const platform=normalizePlatform(base.selectedPlatform||queue?.selectedPlatform||queue?.targetPlatform||project?.selectedPlatform||project?.targetPlatform||seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||base.productionTarget);
    const meta=categoryMeta(seed?.GAME_CATEGORY);
    const sourcePath=String(project?.sourcePath||queue?.sourcePath||'').replace(/^\/+|\/+$/g,'');
    const hasProjectWeb=sourcePath.startsWith('web-games/');
    const webPath=base.webPath||(hasProjectWeb?`/${sourcePath}/`:null);
    const baseGenres=Array.isArray(base.genre)&&base.genre.length?base.genre:meta.genre;
    const robloxGenre=String(seed?.ROBLOX_GENRE_LABEL_KO||seed?.ROBLOX_GENRE||queue?.ROBLOX_GENRE_LABEL_KO||queue?.ROBLOX_GENRE||'').trim();
    const robloxSubgenre=String(seed?.ROBLOX_SUBGENRE_LABEL_KO||seed?.ROBLOX_SUBGENRE||queue?.ROBLOX_SUBGENRE_LABEL_KO||queue?.ROBLOX_SUBGENRE||'').trim();
    const genreLabel=platform==='ROBLOX'&&robloxGenre?[robloxGenre,robloxSubgenre].filter(Boolean).join(' · '):(baseGenres.join(' · ')||'장르 미평가');
    const playMode=String(seed?.MULTIPLAYER_DESIGN_MODE||seed?.INITIAL_PLAY_MODE||queue?.ROBLOX_PLAY_MODE||queue?.playMode||'').trim().toUpperCase();
    const score=scoreInfo(queue,productionClass,seed);
    const updatedAt=queue?.updatedAt||queue?.webValidationLastAttemptAt||seed?.ROBLOX_GENRE_REVIEWED_AT||seed?.updatedAt||base.updatedAt||baseCatalog?.updatedAt||null;
    return {
      ...base,
      id,
      name:base.name||project?.name||seed?.gameName||queue?.gameName||id,
      description:String(base.description||seed?.DISTINCT_IDENTITY||project?.name||seed?.gameName||id).slice(0,240),
      genre:baseGenres,
      image:base.image||meta.image,
      webPath,
      hasWebArchive:Boolean(base.hasWebArchive||hasProjectWeb),
      homepageWebPlayable:Boolean(base.homepageWebPlayable||hasProjectWeb),
      homepageCategory:productionCategory(productionClass),
      productionClass,
      productionClassSource:rawProductionClass==='RELEASE_CONFIRMED'&&!releaseVerified?'SERVER_RELEASE_EVIDENCE_REQUIRED_2026-09-17':(base.productionClassSource||queue?.productionClassSource||project?.productionClassSource||seed?.productionClassSource||'COMPANY_RUNTIME'),
      selectedPlatform:platform||null,
      productionTarget:productionClass==='DESIGN_ONLY'?'design-only':targetForPlatform(platform),
      homepageStage:stageFor(project,seed,productionClass,platform),
      runtimeManaged:true,
      runtimeStatus:String(base.lifecycleState||'ACTIVE').toUpperCase(),
      runtimeSeedStatus:seed?.status||null,
      runtimeProjectId:project?.id||null,
      robloxPublicationTarget:queue?.robloxPublicationTarget||base.robloxPublicationTarget||null,
      robloxReleaseEvidence:queue?.robloxReleaseEvidence||base.robloxReleaseEvidence||null,
      homepageInfo:{
        authority:'company-runtime',
        platform,
        score:score.score,
        scoreLabel:score.label,
        scoreCurrent:score.current,
        scoreSource:score.source,
        genre:baseGenres,
        genreLabel,
        subgenre:platform==='ROBLOX'?robloxSubgenre:'',
        playMode,
        playModeLabel:playModeLabel(playMode),
        latestWork:latestWork(base,queue),
        updatedAt,
        status:String(queue?.canonicalState||queue?.status||seed?.status||base.lifecycleState||'ACTIVE'),
        productionClass,
        releaseEvidenceConfirmed:releaseVerified
      }
    };
  });
  return {
    ...baseCatalog,
    version:Math.max(1,Number(baseCatalog?.version)||0)+1,
    runtimeAuthority:'company-runtime',
    runtimeInfoAuthority:'company-runtime',
    runtimeSupportedPlatforms:RUNTIME_SUPPORTED_PLATFORMS,
    runtimeSyncSeconds:RUNTIME_SYNC_SECONDS,
    runtimeCounts:{games:games.length,canonicalGames:games.length,portfolioProjects:projects.length,activeSeeds:activeSeeds.length,developmentQueueItems:queueItems.length},
    games
  };
}
async function handleRuntimeCatalog(request,env){
  if(request.method!=='GET'&&request.method!=='HEAD')return aiJson({error:'method_not_allowed'},405);
  try{
    const [catalog,portfolio,seedState,developmentQueue]=await Promise.all([
      fetchRuntimeJson('game-catalog.json'),
      fetchRuntimeJson('autonomous-portfolio.json'),
      fetchRuntimeJson('game-seed-state.json'),
      fetchRuntimeJson('development-queue.json')
    ]);
    const merged=mergeRuntimeCatalog(catalog,portfolio,seedState,developmentQueue);
    const headers={...AI_JSON_HEADERS,'Cache-Control':`public, max-age=${RUNTIME_SYNC_SECONDS}`,'X-Jaewoon-Runtime-Authority':'company-runtime','X-Jaewoon-Runtime-Games':String(merged.games.length)};
    return new Response(request.method==='HEAD'?null:JSON.stringify(merged),{status:200,headers});
  }catch(error){
    const fallback=await env.ASSETS.fetch(request);
    const headers=new Headers(fallback.headers);
    headers.set('X-Jaewoon-Runtime-Authority','main-fallback');
    headers.set('Cache-Control','no-store');
    return new Response(request.method==='HEAD'?null:await fallback.arrayBuffer(),{status:fallback.status,statusText:fallback.statusText,headers});
  }
}
async function handleRuntimeStatus(request,env){
  if(request.method!=='GET'&&request.method!=='HEAD')return aiJson({error:'method_not_allowed'},405);
  try{
    const status=await fetchRuntimeJson('company-status.json');
    status.runtimeAuthority='company-runtime';
    status.runtimeSyncSeconds=RUNTIME_SYNC_SECONDS;
    const headers={...AI_JSON_HEADERS,'Cache-Control':`public, max-age=${RUNTIME_SYNC_SECONDS}`,'X-Jaewoon-Runtime-Authority':'company-runtime'};
    return new Response(request.method==='HEAD'?null:JSON.stringify(status),{status:200,headers});
  }catch(error){
    const fallback=await env.ASSETS.fetch(request);
    const headers=new Headers(fallback.headers);
    headers.set('X-Jaewoon-Runtime-Authority','main-fallback');
    headers.set('Cache-Control','no-store');
    return new Response(request.method==='HEAD'?null:await fallback.arrayBuffer(),{status:fallback.status,statusText:fallback.statusText,headers});
  }
}

async function injectUniversalTouchControls(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('/web-games/_shared/touch-controls.js'))html=html.replace('</body>',UNIVERSAL_TOUCH_SCRIPT+'</body>');
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, no-cache, must-revalidate');
  headers.delete('Content-Length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function serveSurvival2(request,env){
  const response=await env.ASSETS.fetch(request),type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const scripts=[];
  if(!html.includes('survival-25d-runtime.js'))scripts.push('<script src="/web-games/survival2/survival-25d-runtime.js?v=20260906-original1"></script>');
  if(!html.includes('survival-25d-buildings.js'))scripts.push('<script src="/web-games/survival2/survival-25d-buildings.js?v=20260906-3"></script>');
  if(!html.includes('/web-games/_shared/touch-controls.js'))scripts.push(UNIVERSAL_TOUCH_SCRIPT);
  if(scripts.length)html=html.replace('</body>',scripts.join('')+'</body>');
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store, no-cache, must-revalidate');
  headers.delete('Content-Length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/ai/status')return handleAiStatus(env);
    if(url.pathname==='/api/ai/gemini')return handleGemini(request,env);
    if(url.pathname==='/api/vibe/workflow-observation')return handleVibeWorkflowObservation(request,env,url);
    if(url.pathname==='/game-catalog.json')return handleRuntimeCatalog(request,env);
    if(url.pathname==='/company-status.json')return handleRuntimeStatus(request,env);
    if(url.pathname==='/web-games/egg-heist/'||url.pathname==='/web-games/egg-heist/index.html')return new Response('Not Found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate'}});
    if(url.pathname==='/web-games/survival2/'||url.pathname==='/web-games/survival2/index.html')return serveSurvival2(request,env);
    const response=await env.ASSETS.fetch(request);
    if(url.pathname.startsWith('/web-games/'))return injectUniversalTouchControls(response);
    if(!['/','/index.html'].includes(url.pathname))return response;
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    let html=await response.text();
    html=html.replace("image:'assets/insect-main-v3.webp',link:'/web-games/monster-adventure/'","image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'");
    html=html.replace("image:'assets/monster-adventure-card.webp',link:'/web-games/monster-adventure/'","image:'assets/monster-adventure-card.webp?v=20260905-1',link:'/web-games/monster-adventure/'");
    const territory="{title:'영토전쟁',logo:\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='180'%3E%3Ctext x='8' y='120' font-size='72' font-family='sans-serif' font-weight='900' fill='%23fff4a8' stroke='%232b5ca8' stroke-width='7' paint-order='stroke'%3E영토전쟁%3C/text%3E%3C/svg%3E\",stars:2,subtitle:'영토를 넓히고 대륙을 정복해!',tags:['전략','영토','실시간전투','AI'],image:'assets/page-bg-v4.webp',link:'/web-games/territory-war/'}";
    if(!html.includes("title:'영토전쟁'"))html=html.replace('const games=[','const games=['+territory+',');
    html=html.replace('게임 9종을 좌우로 밀어서 선택할 수 있어요!','게임 10종을 좌우로 밀어서 선택할 수 있어요!');
    const headers=new Headers(response.headers);
    headers.set('Cache-Control','no-store, no-cache, must-revalidate');
    headers.delete('Content-Length');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
