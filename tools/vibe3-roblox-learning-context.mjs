// 파일명: tools/vibe3-roblox-learning-context.mjs
// 역할: Roblox 작업에 기존 playbook/recombination과 검증된 Roblox 증류 원리를 함께 제공한다.
// 규칙: 원본 외부 코드·에셋 표현은 전달하지 않고, 전이된 원리는 fresh QA를 다시 통과해야 한다.

const clean=value=>String(value??'').trim();
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const stableHash=value=>{let h=2166136261;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

function coreKind(profile={}){
  const genre=clean(profile.genre),sub=clean(profile.subgenre);
  if(genre==='Puzzle')return'PUZZLE';
  if(genre==='Obby & platformer'||genre==='Sports & racing')return'MOVEMENT';
  if(genre==='Shooter'||genre==='Action')return'COMBAT';
  if(genre==='Strategy'&&sub==='Tower Defense')return'DEFENSE';
  if(genre==='Strategy'||genre==='Adventure'||genre==='Party & casual')return'OBJECTIVE';
  if(genre==='RPG')return'PROGRESSION';
  if(genre==='Survival')return'SURVIVAL';
  if(genre==='Simulation')return sub==='Tycoon'?'ECONOMY':'PROGRESSION';
  if(genre==='Roleplay & avatar sim'||genre==='Social')return'SOCIAL';
  return'OBJECTIVE';
}

function selectDistilled(records=[],{gameId='',terms=[],profileText=''}={}){
  const eligible=(Array.isArray(records)?records:[]).filter(row=>
    row?.retrievalEligible===true
    &&row?.engine==='roblox'
    &&row?.rawCodeStored===false
    &&row?.rawAssetStored===false
    &&row?.rawBinaryStored===false
    &&(
      row?.sourceKind==='internal-roblox-source-runtime'
        ? row?.authority==='VERIFIED_INTERNAL_ROBLOX_DISTILLATION'&&row?.verified===true
        : row?.sourceKind==='external-roblox-runtime-reference'&&row?.authority==='PRACTICE_ONLY'&&row?.observationKind==='BLACK_BOX_RUNTIME_ONLY'
    )
  );
  const scored=eligible.map(row=>{
    const patterns=unique(row.patterns||[]),principles=unique(row.principles||[]);
    const haystack=[...patterns,...principles,...(row.observations||[])].join(' ').toLowerCase();
    let score=terms.reduce((sum,term)=>sum+(haystack.includes(term)?2:0),0);
    score+=patterns.reduce((sum,pattern)=>sum+(profileText.includes(pattern.toLowerCase())?2:0),0);
    if(clean(row.gameId)===clean(gameId)&&row.sourceKind==='internal-roblox-source-runtime')score+=12;
    if(row.sourceKind==='internal-roblox-source-runtime')score+=3;
    return{row,score,tie:stableHash(clean(gameId)+'|'+clean(row.id))};
  }).filter(x=>x.score>0||clean(x.row.gameId)===clean(gameId))
    .sort((a,b)=>b.score-a.score||a.tie.localeCompare(b.tie));
  const selected=scored.map(x=>x.row);
  return Object.freeze({
    ids:Object.freeze(selected.map(row=>clean(row.id)).filter(Boolean)),
    patterns:Object.freeze(unique(selected.flatMap(row=>row.patterns||[]))),
    principles:Object.freeze(unique(selected.flatMap(row=>row.principles||[]))),
    externalIds:Object.freeze(selected.filter(row=>row.sourceKind==='external-roblox-runtime-reference').map(row=>clean(row.id)).filter(Boolean)),
    externalAdvisoryUsed:selected.some(row=>row.sourceKind==='external-roblox-runtime-reference'),
    crossGameUsed:selected.some(row=>clean(row.gameId)!==clean(gameId)),
    freshQaRequired:selected.length>0
  });
}

export function verifiedExternalBlackBoxPlaybookContract(playbooks={}, {required=false,requiredTaskTypes=['roblox','coding']}={}){
  const taskTypes=playbooks?.taskTypes&&typeof playbooks.taskTypes==='object'?playbooks.taskTypes:{};
  const allRows=[];
  for(const task of Object.values(taskTypes))for(const row of task?.reuse||[])if(clean(row?.id).startsWith('external-black-box-'))allRows.push(row);
  const byId=new Map();
  for(const row of allRows){
    const id=clean(row?.id);
    if(!id)continue;
    const previous=byId.get(id)||{id,project:clean(row?.project),sourceRevision:clean(row?.sourceRevision),distilledApplicationPrinciples:[],distilledAvoidancePrinciples:[],distilledLearningUseAllowed:[],distilledLearningUseForbidden:[]};
    previous.distilledApplicationPrinciples=unique([...previous.distilledApplicationPrinciples,...(row?.distilledApplicationPrinciples||[])]);
    previous.distilledAvoidancePrinciples=unique([...previous.distilledAvoidancePrinciples,...(row?.distilledAvoidancePrinciples||[])]);
    previous.distilledLearningUseAllowed=unique([...previous.distilledLearningUseAllowed,...(row?.distilledLearningUseAllowed||[])]);
    previous.distilledLearningUseForbidden=unique([...previous.distilledLearningUseForbidden,...(row?.distilledLearningUseForbidden||[])]);
    byId.set(id,previous);
  }
  const rows=[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
  const ids=rows.map(row=>row.id);
  const contentIds=rows.filter(row=>row.distilledApplicationPrinciples.length>0).map(row=>row.id);
  const complete=ids.length>0&&contentIds.length===ids.length;
  const coveragePct=ids.length?Math.floor((contentIds.length/ids.length)*100):0;
  if(required){
    if(playbooks?.policy?.verifiedExternalBlackBoxAllTaskTypesRequired!==true||playbooks?.policy?.verifiedExternalBlackBoxTruncationForbidden!==true)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_POLICY_REQUIRED');
    if(!ids.length)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_REQUIRED');
    for(const taskType of requiredTaskTypes){
      const task=taskTypes?.[taskType]||{};
      const taskIds=unique((task?.reuse||[]).filter(row=>clean(row?.id).startsWith('external-black-box-')).map(row=>row.id)).sort();
      if(clean(task?.authority)!=='verified-task-playbook'||Number(task?.verifiedExternalBlackBoxCoveragePct||0)!==100||taskIds.length!==ids.length||!ids.every(id=>taskIds.includes(id)))throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_TASK_COVERAGE_INVALID:'+taskType);
    }
    if(!complete||coveragePct!==100)throw new Error('ROBLOX_VERIFIED_EXTERNAL_LEARNING_CONTENT_INCOMPLETE');
  }
  return Object.freeze({
    rows:Object.freeze(rows.map(row=>Object.freeze({...row}))),
    ids:Object.freeze([...ids]),
    contentIds:Object.freeze([...contentIds]),
    retrievedCount:ids.length,
    appliedCount:contentIds.length,
    coveragePct,
    distilledContentComplete:complete,
    truncationForbidden:playbooks?.policy?.verifiedExternalBlackBoxTruncationForbidden===true,
    fingerprint:ids.length?stableHash(JSON.stringify(rows)):null
  });
}

export function createRobloxVibe3LearningContext({gameId='',profile={},artbook={},playbooks={},recombination={},distillation={}}={}){
  const roblox=playbooks?.taskTypes?.roblox||{};
  const coding=playbooks?.taskTypes?.coding||{};
  const checklist=unique([...(roblox.checklist||[]),...(coding.checklist||[])]);
  const reuseRows=[...(roblox.reuse||[]),...(coding.reuse||[])];
  const reuseProjects=unique(reuseRows.map(row=>row?.project));
  const verifiedExternalContract=verifiedExternalBlackBoxPlaybookContract(playbooks);
  const verifiedExternalReuseRows=[...verifiedExternalContract.rows];
  const verifiedExternalPlaybookIds=[...verifiedExternalContract.ids];
  const verifiedExternalContentIds=[...verifiedExternalContract.contentIds];
  const verifiedExternalDistilledContentComplete=verifiedExternalContract.distilledContentComplete;
  const verifiedExternalLearningCoveragePct=verifiedExternalContract.coveragePct;
  const verifiedExternalLearningPrinciples=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledApplicationPrinciples||[]));
  const verifiedExternalGameDevelopmentPrinciples=Object.freeze([...verifiedExternalLearningPrinciples]);
  const verifiedExternalAvoidancePrinciples=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledAvoidancePrinciples||[]));
  const verifiedExternalLearningUseAllowed=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledLearningUseAllowed||[]));
  const verifiedExternalLearningUseForbidden=unique(verifiedExternalReuseRows.flatMap(row=>row.distilledLearningUseForbidden||[]));
  const recipes=(Array.isArray(recombination?.recipes)?recombination.recipes:[])
    .filter(recipe=>Array.isArray(recipe?.sourceProjects)&&new Set(recipe.sourceProjects.map(clean).filter(Boolean)).size>=2)
    .filter(recipe=>!(recipe.sourceProjects||[]).map(clean).includes(clean(gameId)));

  const kind=coreKind(profile);
  const terms={
    PUZZLE:['board','grid','combo','goal','puzzle','match','touch'],
    COMBAT:['combat','attack','damage','enemy','combo','cooldown','arena','server'],
    MOVEMENT:['movement','input','touch','position','session','checkpoint'],
    DEFENSE:['tower','wave','defense','resource','placement','progression'],
    PROGRESSION:['progression','level','upgrade','save','reward','growth'],
    SURVIVAL:['survival','wave','health','risk','session','enemy','save'],
    ECONOMY:['economy','resource','income','upgrade','progression','save'],
    SOCIAL:['social','shared','session','input','reward','progression','multiplayer'],
    OBJECTIVE:['goal','objective','session','progression','reward','input']
  }[kind]||['session','progression','input','reward'];

  const artbookText=JSON.stringify(artbook?.content||artbook||{}).toLowerCase();
  const profileText=[profile?.genre,profile?.subgenre,profile?.playMode,artbookText].map(clean).join(' ').toLowerCase();
  const scored=recipes.map(recipe=>{
    const features=(recipe.featureBlend||[]).map(clean).filter(Boolean);
    const haystack=features.join(' ').toLowerCase();
    let score=terms.reduce((sum,term)=>sum+(haystack.includes(term)?2:0),0);
    score+=features.reduce((sum,feature)=>sum+(profileText.includes(feature.toLowerCase())?3:0),0);
    return{recipe,score,tie:stableHash(gameId+'|'+clean(recipe.id))};
  }).sort((a,b)=>b.score-a.score||a.tie.localeCompare(b.tie));

  const selected=scored[0]?.recipe||null;
  const featureBlend=unique(selected?.featureBlend||[]).slice(0,12);
  const sourceProjects=unique(selected?.sourceProjects||[]).slice(0,6);
  const distilled=selectDistilled(distillation?.records||[],{gameId,terms,profileText});
  // PRACTICE_ONLY black-box observations remain advisory. Only verified task-playbook
  // memory may count toward the mandatory 100% verified external learning coverage.
  const verifiedExternalLearningIds=unique(verifiedExternalPlaybookIds);
  const externalBlackBoxAdvisoryIds=unique(distilled.externalIds||[]);
  const verifiedExternalLearningApplyAxes=Object.freeze([
    'ROBLOX_ENVIRONMENT_BACKGROUND_AND_LIGHTING',
    'ROBLOX_CHARACTER_ANIMATION_AND_MOTION',
    'ROBLOX_SKILL_VFX_AND_IMPACT_FEEDBACK',
    'ROBLOX_CAMERA_AND_VISUAL_FEEDBACK',
    'ROBLOX_UI_UX_TOUCH_AND_CONTROLS',
    'ROBLOX_GAMEPLAY_STATE_AND_PROGRESSION',
    'ROBLOX_RUNTIME_QA_AND_RELIABILITY'
  ]);
  const applied=verifiedExternalLearningIds.length>0
    &&verifiedExternalDistilledContentComplete
    &&verifiedExternalLearningPrinciples.length>0;

  return Object.freeze({
    applied,
    coreKind:kind,
    playbookAuthority:clean(roblox.authority)||null,
    checklist:Object.freeze(checklist),
    reuseProjects:Object.freeze(reuseProjects),
    recipeId:clean(selected?.id)||null,
    transformationOperator:clean(selected?.transformationOperator)||null,
    featureBlend:Object.freeze(featureBlend),
    sourceProjects:Object.freeze(sourceProjects),
    distilledSourceIds:distilled.ids,
    distilledPatterns:distilled.patterns,
    distilledPrinciples:distilled.principles,
    verifiedExternalLearningIds:Object.freeze(verifiedExternalLearningIds),
    verifiedExternalLearningFingerprint:verifiedExternalContract.fingerprint,
    verifiedExternalLearningRetrievedCount:verifiedExternalLearningIds.length,
    verifiedExternalLearningAppliedCount:verifiedExternalContentIds.length,
    verifiedExternalLearningCoveragePct,
    verifiedExternalDistilledContentIds:Object.freeze(verifiedExternalContentIds),
    verifiedExternalDistilledContentComplete,
    verifiedExternalLearningApplyAxes,
    verifiedExternalLearningPrinciples:Object.freeze(verifiedExternalLearningPrinciples),
    verifiedExternalGameDevelopmentPrinciples:Object.freeze(verifiedExternalGameDevelopmentPrinciples),
    verifiedExternalGameDevelopmentPrincipleCount:verifiedExternalGameDevelopmentPrinciples.length,
    verifiedExternalRobloxNativeUseRequired:true,
    verifiedExternalAvoidancePrinciples:Object.freeze(verifiedExternalAvoidancePrinciples),
    verifiedExternalLearningUseAllowed:Object.freeze(verifiedExternalLearningUseAllowed),
    verifiedExternalLearningUseForbidden:Object.freeze(verifiedExternalLearningUseForbidden),
    verifiedExternalLearningFirst:true,
    verifiedExternalLearningTruncationForbidden:true,
    externalBlackBoxAdvisoryIds:Object.freeze(externalBlackBoxAdvisoryIds),
    externalBlackBoxAdvisoryUsed:distilled.externalAdvisoryUsed,
    crossGameDistillationUsed:distilled.crossGameUsed,
    freshQaRequiredForDistilledTransfer:distilled.freshQaRequired,
    originalModifierRequired:selected?.internalCreationRequirement==='ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
    rawSourceOutputAllowed:false,
    rawAssetOutputAllowed:false,
    externalExpressionCopyAllowed:false,
    artbookIdentity:clean(artbook?.content?.identity||artbook?.gameName)||null,
    authority:applied?'vibe3-roblox-learning-context':'roblox-baseline-only'
  });
}

export function decorateRobloxActionsWithLearning(actions=[],learning={}){
  const patterns=unique([
    ...(learning?.verifiedExternalLearningPrinciples||[]),
    ...(learning?.featureBlend||[]),
    ...(learning?.distilledPatterns||[])
  ]);
  return actions.map((action,index)=>Object.freeze({
    ...action,
    learningPattern:clean(patterns[index%Math.max(1,patterns.length)])||null
  }));
}
