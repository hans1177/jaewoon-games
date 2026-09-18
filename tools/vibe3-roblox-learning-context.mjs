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

export function createRobloxVibe3LearningContext({gameId='',profile={},artbook={},playbooks={},recombination={}}={}){
  const roblox=playbooks?.taskTypes?.roblox||{};
  const coding=playbooks?.taskTypes?.coding||{};
  const checklist=unique([...(roblox.checklist||[]),...(coding.checklist||[])]).slice(0,16);
  const reuseProjects=unique([...(roblox.reuse||[]).map(row=>row?.project),...(coding.reuse||[]).map(row=>row?.project)]).slice(0,16);
  const recipes=(Array.isArray(recombination?.recipes)?recombination.recipes:[])
    .filter(recipe=>Array.isArray(recipe?.sourceProjects)&&new Set(recipe.sourceProjects.map(clean).filter(Boolean)).size>=2)
    .filter(recipe=>!(recipe.sourceProjects||[]).map(clean).includes(clean(gameId)));

  const kind=coreKind(profile);
  const terms={
    PUZZLE:['board','grid','combo','goal','puzzle','match','touch'],
    COMBAT:['combat','attack','damage','enemy','combo','cooldown','arena'],
    MOVEMENT:['movement','input','touch','position','session','checkpoint'],
    DEFENSE:['tower','wave','defense','resource','placement','progression'],
    PROGRESSION:['progression','level','upgrade','save','reward','growth'],
    SURVIVAL:['survival','wave','health','risk','session','enemy'],
    ECONOMY:['economy','resource','income','upgrade','progression','save'],
    SOCIAL:['social','shared','session','input','reward','progression'],
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
  const applied=checklist.length>0&&Boolean(selected);

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
    originalModifierRequired:selected?.internalCreationRequirement==='ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
    rawSourceOutputAllowed:false,
    rawAssetOutputAllowed:false,
    artbookIdentity:clean(artbook?.content?.identity||artbook?.gameName)||null,
    authority:applied?'vibe3-roblox-learning-context':'roblox-baseline-only'
  });
}

export function decorateRobloxActionsWithLearning(actions=[],learning={}){
  const patterns=learning?.featureBlend||[];
  return actions.map((action,index)=>Object.freeze({
    ...action,
    learningPattern:clean(patterns[index%Math.max(1,patterns.length)])||null
  }));
}
