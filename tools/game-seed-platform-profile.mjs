import fs from 'node:fs';

const clean=v=>String(v??'').trim();
const uniq=values=>[...new Set((Array.isArray(values)?values:[]).map(clean).filter(Boolean))];

export const PLATFORM_PROFILE_FILE='game-seed-platform-profiles.json';

export function normalizeSeedPlatform(value){
  const raw=clean(value).toUpperCase().replaceAll('-','_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE_UEFN','UEFN','FORTNITE'].includes(raw))return 'FORTNITE_UEFN';
  return raw;
}

export function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}

export function loadPlatformProfiles(file=PLATFORM_PROFILE_FILE){
  return readJson(file,{version:1,platforms:{}})||{version:1,platforms:{}};
}

export function platformProfileCategories(platformProfiles,platform){
  const p=normalizeSeedPlatform(platform);
  return Object.keys(platformProfiles?.platforms?.[p]?.categories||{});
}

export function representativeCategoriesForPlatform(directive,platform,platformProfiles=null){
  const p=normalizeSeedPlatform(platform);
  const direct=directive?.platformPortfolioSets?.platformSets?.[p]?.categories;
  if(Array.isArray(direct)&&direct.length)return uniq(direct);
  const profileCategories=platformProfileCategories(platformProfiles||loadPlatformProfiles(),p);
  if(profileCategories.length)return uniq(profileCategories);
  if(p==='UNITY')return uniq(directive?.gameSeed?.bootstrap?.categories);
  return [];
}

export function requiredCategoriesForPlatform(directive,platform){
  const p=normalizeSeedPlatform(platform);
  return uniq(directive?.platformPortfolioSets?.platformSets?.[p]?.requiredCategories);
}

export function categorySeedProfile({platform,category,marketEvidence={},platformProfiles={}}={}){
  const p=normalizeSeedPlatform(platform),c=clean(category);
  const platformCfg=platformProfiles?.platforms?.[p]?.categories?.[c];
  if(platformCfg)return platformCfg;
  const legacy=marketEvidence?.categories?.[c];
  return legacy||null;
}
