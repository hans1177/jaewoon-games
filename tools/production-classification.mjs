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
  const productionClass=normalizeProductionClass(entity?.productionClass);
  if(source.startsWith('OWNER_REDESIGN_RESET_')&&productionClass===PRODUCTION_CLASSES.DESIGN_ONLY){
    return PRODUCTION_CLASSES.DESIGN_ONLY;
  }
  return null;
}

export function productionClassOf(project={},game={}){
  // Latest owner-directed redesign reset outranks stale runtime/project evidence.
  // The override naturally ends after the canonical design promotion replaces the
  // catalog/source marker with DESIGN_BASELINE_READY and a higher production class.
  const ownerReset=ownerRedesignResetClass(game)||ownerRedesignResetClass(project);
  if(ownerReset)return ownerReset;
  const direct=[project?.productionClass,game?.productionClass,project?.profileStatus]
    .map(normalizeProductionClass)
    .find(Boolean);
  if(direct)return direct;
  return productionClassFromHomepageCategory(game?.homepageCategory)
    ||PRODUCTION_CLASSES.DESIGN_ONLY;
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
