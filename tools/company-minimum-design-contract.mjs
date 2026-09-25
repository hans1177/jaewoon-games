// 파일명: tools/company-minimum-design-contract.mjs
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const list=v=>Array.isArray(v)?v:[];
const MULTIPLAYER_MODES=new Set(['SINGLE','COOP','COMPETITIVE','HYBRID']);
export const MINIMUM_COMMON_FIELDS=Object.freeze([
  'identity','coreFun','coreLoop','signatureSystems','progressionDirection',
  'failureRetryRisk','multiplayerMode','technicalAssumptions'
]);
export const MINIMUM_PLATFORM_PROFILE_FIELDS=Object.freeze([
  'platform','inputModel','sessionModel','multiplayerRuntime','performanceBudget',
  'uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'
]);

function textReady(v,min=8){return clean(v).length>=min;}
function multiplayerModeReady(content={}){
  const declared=clean(content.multiplayerMode).toUpperCase();
  if(MULTIPLAYER_MODES.has(declared))return true;
  const canonicalProfileMode=clean(content.robloxBuildProfile?.playMode).toUpperCase();
  return MULTIPLAYER_MODES.has(canonicalProfileMode);
}
function commonReady(content={}){
  return textReady(content.identity,24)
    &&textReady(content.coreFun,20)
    &&list(content.coreLoop).filter(v=>textReady(v,6)).length>=3
    &&list(content.signatureSystems).filter(v=>v&&textReady(v.name,2)&&textReady(v.purpose,8)).length>=2
    &&textReady(content.progressionDirection,16)
    &&content.failureRetryRisk&&list(content.failureRetryRisk.failureStates).length>=2
    &&multiplayerModeReady(content)
    &&list(content.technicalAssumptions).filter(v=>textReady(v,8)).length>=2;
}
function platformProfileReady(profile={},platform=''){
  return clean(profile.platform).toUpperCase()===platform
    &&MINIMUM_PLATFORM_PROFILE_FIELDS.filter(k=>k!=='platform').every(k=>textReady(profile[k],8));
}
export function evaluateMinimumDesignContract(record={}){
  const content=record?.content&&typeof record.content==='object'?record.content:record;
  const profiles=content?.platformProfiles&&typeof content.platformProfiles==='object'?content.platformProfiles:{};
  const common=commonReady(content||{});
  const roblox=platformProfileReady(profiles.ROBLOX||{},'ROBLOX');
  const unity=platformProfileReady(profiles.UNITY||{},'UNITY');
  const distinct=roblox&&unity&&JSON.stringify(profiles.ROBLOX)!==JSON.stringify(profiles.UNITY);
  const blockers=[];
  if(!common)blockers.push('MINIMUM_COMMON_CORE_INCOMPLETE');
  if(!roblox)blockers.push('ROBLOX_PLATFORM_PROFILE_INCOMPLETE');
  if(!unity)blockers.push('UNITY_PLATFORM_PROFILE_INCOMPLETE');
  if(roblox&&unity&&!distinct)blockers.push('PLATFORM_PROFILES_MUST_DIFFER');
  return Object.freeze({
    version:1,
    pass:common&&roblox&&unity&&distinct,
    commonCoreReady:common,
    platformProfiles:{ROBLOX:roblox,UNITY:unity,distinct},
    blockers:Object.freeze(blockers)
  });
}
export function latestMinimumDesign(root='.',gameId=''){
  const gameRoot=path.join(root,'design',gameId);
  if(!fs.existsSync(gameRoot))return null;
  const dates=fs.readdirSync(gameRoot,{withFileTypes:true})
    .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e=>e.name).sort().reverse();
  for(const date of dates){
    const file=path.join(gameRoot,date,'design-revised.json');
    if(!fs.existsSync(file))continue;
    const record=JSON.parse(fs.readFileSync(file,'utf8'));
    const gate=evaluateMinimumDesignContract(record);
    if(gate.pass)return{date,file:path.relative(root,file).replaceAll('\\','/'),record,gate};
  }
  return null;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const gameId=clean(process.argv.find(v=>v.startsWith('--game='))?.split('=')[1]||process.env.GAME_ID);
  if(!gameId)throw new Error('GAME_ID_REQUIRED');
  const latest=latestMinimumDesign('.',gameId);
  console.log(`MINIMUM_DESIGN_CONTRACT=${latest?'PASS':'PENDING'}`);
  if(latest){
    console.log(`MINIMUM_DESIGN_SOURCE=${latest.file}`);
    console.log(`MINIMUM_DESIGN_DATE=${latest.date}`);
  }
}
