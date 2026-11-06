const clean=value=>String(value??'').trim();

export const PRODUCTION_CLASSES=Object.freeze({
  DESIGN_ONLY:'DESIGN_ONLY',
  DEVELOPMENT_CONFIRMED:'DEVELOPMENT_CONFIRMED',
  RELEASE_CONFIRMED:'RELEASE_CONFIRMED',
});

const VALID_CLASSES=new Set(Object.values(PRODUCTION_CLASSES));

export function normalizeProductionClass(value){
  const normalized=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  return VALID_CLASSES.has(normalized)?normalized:null;
}

export function productionClassFromHomepageCategory(value){
  const category=clean(value).toLowerCase();
  if(category==='release-confirmed')return PRODUCTION_CLASSES.RELEASE_CONFIRMED;
  if(category==='development-confirmed')return PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED;
  if(category==='design-only')return PRODUCTION_CLASSES.DESIGN_ONLY;
  return null;
}

function ownerRedesignResetClass(entity={}){
  const source=clean(entity?.productionClassSource).toUpperCase();
  if(source.startsWith('OWNER_REDESIGN_RESET_')||source.startsWith('OWNER_ALL_GAMES_DESIGN_RESET_')){
    return PRODUCTION_CLASSES.DESIGN_ONLY;
  }
  return null;
}

export function releaseEvidenceConfirmed(project={},game={}){
  const evidence=[project,game];
  for(const entity of evidence){
    if(entity?.releasePublished===true||entity?.platformReleasePublished===true||entity?.productionReleased===true)return true;
    if(entity?.robloxReleaseEvidence?.published===true&&entity?.robloxReleaseEvidence?.verified!==false)return true;
    if(entity?.robloxPublicationTarget?.published===true&&entity?.robloxPublicationTarget?.verified===true)return true;
    if(entity?.unityReleaseEvidence?.published===true&&entity?.unityReleaseEvidence?.verified!==false)return true;
    if(entity?.playStoreReleaseEvidence?.published===true&&entity?.playStoreReleaseEvidence?.verified!==false)return true;
    if(entity?.uefnReleaseEvidence?.published===true&&entity?.uefnReleaseEvidence?.verified!==false)return true;
    if(entity?.fortniteReleaseEvidence?.published===true&&entity?.fortniteReleaseEvidence?.verified!==false)return true;
  }
  return false;
}

export function productionClassOf(project={},game={}){
  // Latest owner-directed redesign reset outranks stale runtime/project evidence.
  // RELEASE_CONFIRMED means actually released. Without explicit platform release
  // evidence, a previously release-confirmed item is DEVELOPMENT_CONFIRMED.
  const ownerReset=ownerRedesignResetClass(game)||ownerRedesignResetClass(project);
  if(ownerReset)return ownerReset;
  const direct=[project?.productionClass,game?.productionClass,project?.profileStatus]
    .map(normalizeProductionClass)
    .find(Boolean);
  if(direct===PRODUCTION_CLASSES.RELEASE_CONFIRMED&&!releaseEvidenceConfirmed(project,game)){
    return PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED;
  }
  if(direct)return direct;
  const categoryClass=productionClassFromHomepageCategory(game?.homepageCategory);
  if(categoryClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED&&!releaseEvidenceConfirmed(project,game)){
    return PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED;
  }
  return categoryClass||PRODUCTION_CLASSES.DESIGN_ONLY;
}

export function tierAliasForProductionClass(value,{numericLabels={}}={}){
  const productionClass=normalizeProductionClass(value);
  if(!productionClass)return null;
  const configured=Number(numericLabels?.[productionClass]);
  if(Number.isFinite(configured)&&configured>0)return configured;
  if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED)return 1;
  if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED)return 2;
  if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)return 3;
  return null;
}

export function homepageCategoryForProductionClass(value){
  switch(normalizeProductionClass(value)){
    case PRODUCTION_CLASSES.RELEASE_CONFIRMED:return 'release-confirmed';
    case PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED:return 'development-confirmed';
    case PRODUCTION_CLASSES.DESIGN_ONLY:return 'design-only';
    default:return null;
  }
}

export function productionClassCounts(rows=[]){
  const counts={
    releaseConfirmed:0,
    developmentConfirmed:0,
    designOnly:0,
  };
  for(const row of rows){
    const productionClass=normalizeProductionClass(row?.productionClass??row);
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED)counts.releaseConfirmed+=1;
    else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED)counts.developmentConfirmed+=1;
    else if(productionClass===PRODUCTION_CLASSES.DESIGN_ONLY)counts.designOnly+=1;
  }
  return counts;
}
