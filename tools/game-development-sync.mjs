// Read-only development source map for every game. No policy/authentication decisions.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const GAME_PLATFORM_ROOTS=Object.freeze({
  WEB:'web-games',ROBLOX:'roblox-games',UNITY:'unity-games',
  GODOT:'godot-games',UEFN:'uefn-games'
});
const safeId=id=>/^[a-z0-9][a-z0-9_-]*$/.test(id);
const exists=(root,rel)=>fs.existsSync(path.join(root,rel));
const readJson=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const dirNames=(root,rel)=>exists(root,rel)?
  fs.readdirSync(path.join(root,rel),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name):[];
const sortedUnique=items=>[...new Set(items)].sort();
const stable=(a,b)=>a.localeCompare(b,'en');

function catalogSourceClaims(row){
  const paths=[];
  for(const field of ['robloxProjectPath','unityProjectPath','targetSourcePath','ownerWebEntryFile']){
    if(typeof row[field]==='string'&&row[field])paths.push(row[field]);
  }
  if(row.targetSourcePaths&&typeof row.targetSourcePaths==='object'){
    for(const value of Object.values(row.targetSourcePaths))
      if(typeof value==='string'&&value)paths.push(value);
  }
  return sortedUnique(paths);
}
function relevantQaFiles(allQa,id){
  return allQa.filter(f=>f===id+'.test.mjs'||f.startsWith(id+'-'))
    .map(f=>'qa/'+f).sort();
}
function curatedAssetLinks(root,id,platforms){
  const paths=[];
  for(const rel of [
    'assets/external/'+id+'/manifest.json',
    'assets/external/'+id+'/priority-v1/manifest.json',
    'assets/roblox/actors/native/'+id+'/manifest.json',
    'assets/'+id+'/manifest.json'
  ])if(exists(root,rel))paths.push(rel);
  if(platforms.ROBLOX){
    const rel='roblox-games/'+id+'/default.project.json';
    if(exists(root,rel))paths.push(rel);
  }
  return sortedUnique(paths);
}
export function buildGameDevelopmentMap({repoRoot=ROOT,gameId=''}={}){
  const catalog=readJson(repoRoot,'game-catalog.json');
  if(!Array.isArray(catalog.games))throw new Error('GAME_CATALOG_INVALID');
  if(gameId&&!safeId(gameId))throw new Error('GAME_ID_INVALID');
  const index=new Map();
  for(const row of catalog.games){
    const id=String(row?.id||'');
    if(!safeId(id)||index.has(id))throw new Error('GAME_CATALOG_DUPLICATE_OR_INVALID_ID:'+id);
    index.set(id,row);
  }
  const platformIds={};
  for(const [platform,folder] of Object.entries(GAME_PLATFORM_ROOTS)){
    platformIds[platform]=new Set(dirNames(repoRoot,folder).filter(safeId).filter(id=>
      !['shared','common','_shared','templates','template','node_modules'].includes(id)
    ));
  }
  const discovered=new Set([...index.keys()]);
  for(const ids of Object.values(platformIds))for(const id of ids)discovered.add(id);
  const qaFiles=exists(repoRoot,'qa')?
    fs.readdirSync(path.join(repoRoot,'qa')).filter(x=>x.endsWith('.test.mjs')):[];
  const games=[];
  const targetIds=gameId?[gameId]:[...discovered].sort(stable);
  for(const id of targetIds){
    const item=index.get(id);
    if(!item&&!discovered.has(id))throw new Error('GAME_ID_NOT_FOUND:'+id);
    const sources={};
    const platforms={};
    for(const [platform,folder] of Object.entries(GAME_PLATFORM_ROOTS)){
      const rel=folder+'/'+id;
      if(platformIds[platform].has(id)){
        sources[platform]=rel;
        platforms[platform]=true;
      }
    }
    const issues=[];
    for(const ref of item?catalogSourceClaims(item):[]){
      // Missing catalog paths are evidence gaps, not a reason to block other games.
      const local=ref.replace(/^\/+/,'');
      if(/^(web-games|roblox-games|unity-games|godot-games|uefn-games)\//.test(local)
        && !exists(repoRoot,local))issues.push('CATALOG_SOURCE_NOT_FOUND:'+local);
    }
    let project=null;
    if(sources.ROBLOX&&exists(repoRoot,sources.ROBLOX+'/default.project.json')){
      try{project=readJson(repoRoot,sources.ROBLOX+'/default.project.json');}
      catch{issues.push('ROBLOX_PROJECT_JSON_INVALID');}
    }
    const name=item?.name||project?.name||id;
    if(project&&item?.name&&project.name&&project.name!==item.name){
      issues.push('NAME_DIFFERS_FROM_PROJECT:'+project.name);
    }
    // A per-game bootstrap is historical evidence, not a second source of truth.
    if(sources.ROBLOX&&exists(repoRoot,sources.ROBLOX+'/roblox-source-bootstrap.json')){
      try{
        const bootstrap=readJson(repoRoot,sources.ROBLOX+'/roblox-source-bootstrap.json');
        if(bootstrap.gameId&&bootstrap.gameId!==id)
          issues.push('BOOTSTRAP_GAME_ID_MISMATCH');
        if(bootstrap.gameName&&bootstrap.gameName!==name)
          issues.push('BOOTSTRAP_GAME_NAME_MISMATCH:'+bootstrap.gameName);
        if(bootstrap.policyDocument&&!exists(repoRoot,bootstrap.policyDocument))
          issues.push('BOOTSTRAP_LEGACY_POLICY_REFERENCE');
      }catch{issues.push('ROBLOX_BOOTSTRAP_JSON_INVALID');}
    }
    if(!Object.keys(sources).length)issues.push('SOURCE_NOT_FOUND');
    games.push({
      gameId:id,gameName:name,
      cataloged:!!item,productionClass:item?.productionClass||'SOURCE_ONLY',
      sources,qa:relevantQaFiles(qaFiles,id),
      assetLinks:curatedAssetLinks(repoRoot,id,sources),
      buildStatus:'NOT_RUN_BY_SYNC',runtimeStatus:'NOT_RUN_BY_SYNC',
      publicationStatus:'NOT_VERIFIED_BY_SYNC',
      sourceIssues:sortedUnique(issues)
    });
  }
  return {
    schemaVersion:1,catalogSource:'game-catalog.json',
    platforms:Object.keys(GAME_PLATFORM_ROOTS),
    scope:gameId||'ALL_DISCOVERED_GAME_SOURCES',
    stats:{
      registeredGameCount:index.size,
      selectedGameCount:games.length,
      sourceOnlyGameCount:games.filter(x=>!x.cataloged).length,
      gamesWithSource:games.filter(x=>Object.keys(x.sources).length).length,
      gamesMissingSource:games.filter(x=>!Object.keys(x.sources).length).length
    },
    games
  };
}
function run(){
  const opts=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--'))
    .map(x=>{const at=x.indexOf('=');return at<0?[x.slice(2),true]:[x.slice(2,at),x.slice(at+1)];}));
  const data=buildGameDevelopmentMap({repoRoot:opts.root||ROOT,gameId:opts['game-id']||''});
  if(opts.output){
    const target=path.resolve(opts.output);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  }
  console.log('GAME_DEVELOPMENT_DISCOVERED='+data.stats.selectedGameCount);
  console.log('GAME_DEVELOPMENT_SOURCE_ONLY='+data.stats.sourceOnlyGameCount);
  console.log('GAME_DEVELOPMENT_WITH_SOURCE='+data.stats.gamesWithSource);
  console.log('GAME_DEVELOPMENT_GAME_SCOPE='+data.scope);
  console.log('GAME_DEVELOPMENT_PUBLICATION_CLAIM=NOT_VERIFIED');
  for(const g of data.games)for(const issue of g.sourceIssues)
    console.log('GAME_DEVELOPMENT_SOURCE_NOTE='+g.gameId+':'+issue);
  if(opts.strict&&data.games.some(g=>!Object.keys(g.sources).length))
    throw new Error('GAME_DEVELOPMENT_SELECTED_SOURCE_MISSING');
}
if(process.argv[1]===fileURLToPath(import.meta.url))run();
