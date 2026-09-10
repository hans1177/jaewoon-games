const clean=value=>String(value??'').trim();

export const PRODUCTION_CLASSES=Object.freeze({
  DESIGN_ONLY:'DESIGN_ONLY',
  DEVELOPMENT_CONFIRMED:'DEVELOPMENT_CONFIRMED',
  RELEASE_CONFIRMED:'RELEASE_CONFIRMED',
});

export const DEFAULT_TIER_ALIAS_BY_CLASS=Object.freeze({
  RELEASE_CONFIRMED:1,
  DEVELOPMENT_CONFIRMED:2,
  DESIGN_ONLY:3,
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

export function productionClassFromLegacyTier(value,{numericLabels=DEFAULT_TIER_ALIAS_BY_CLASS}={}){
  const tier=Number(value);
  if(!Number.isFinite(tier))return null;
  for(const [productionClass,alias] of Object.entries(numericLabels||{})){
    if(Number(alias)===tier&&VALID_CLASSES.has(productionClass))return productionClass;
  }
  return null;
}

export function productionClassOf(project={},game={},options={}){
  const direct=[project?.productionClass,game?.productionClass,project?.profileStatus]
    .map(normalizeProductionClass)
    .find(Boolean);
  if(direct)return direct;
  const category=productionClassFromHomepageCategory(game?.homepageCategory);
  if(category)return category;
  return productionClassFromLegacyTier(project?.productionTier??game?.productionTier,options)
    ||PRODUCTION_CLASSES.DESIGN_ONLY;
}

export function tierAliasForProductionClass(value,{numericLabels=DEFAULT_TIER_ALIAS_BY_CLASS}={}){
  const productionClass=normalizeProductionClass(value);
  if(!productionClass)return null;
  const alias=Number(numericLabels?.[productionClass]);
  return Number.isFinite(alias)?alias:null;
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
