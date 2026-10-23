#!/usr/bin/env node
// 파일명: tools/cozy-cc0-library-audit.mjs
// Existing GitHub-only Cozy publish: audit ALL Roblox library families and admitted external CC0 originals.
// Grant only source-verified, role-matched Roblox models to the dedicated Cozy Island Universe.
// Never infer another experience's grant; never quietly publish an unchanged visual build.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const FAMILIES=Object.freeze([
  'common-building-v1','common-character-gear-v1','common-creature-parts-v1',
  'common-environment-v1','common-foliage-v1','common-items-v1',
  'common-materials-v1','common-motion-v1','common-presentation-v1',
  'common-skill-v1','common-ui-v1','common-vfx-v1','common-world-props-v1',
  'common-tools-v1'
]);
const EXPECTED_UNIVERSE='10767445741';
const okId=v=>/^[1-9][0-9]*$/.test(String(v));
const isCC0=v=>/^CC0(?:-1\.0)?$/.test(String(v||''));
const getJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function scanSources(folder){
  const totals={directories:0,files:0,nativeModels:0,originalArchives:0};
  function walk(current){
    if(!fs.statSync(current,{throwIfNoEntry:false})?.isDirectory())return;
    totals.directories++;
    for(const d of fs.readdirSync(current,{withFileTypes:true})){
      const full=path.join(current,d.name);
      if(d.isDirectory())walk(full);
      else if(d.isFile()){
        totals.files++;
        if(/\.(?:glb|gltf|fbx|obj|blend)$/i.test(d.name))totals.nativeModels++;
        if(/\.(?:zip|7z|tar|gz)$/i.test(d.name))totals.originalArchives++;
      }
    }
  }
  walk(folder);return totals;
}
function gitBlob(p,root){
  const str=execFileSync('git',['ls-tree','HEAD','--',p],{cwd:root,encoding:'utf8'}).trim();
  const match=/^100644 blob ([0-9a-f]{40})\t/.exec(str);
  return match?.[1]||null;
}
export function auditCozyCC0({root=process.cwd()}={}){
  const registry=getJson(path.join(root,'assets/roblox/common-registered-external-assets-v1.json'));
  const ledger=getJson(path.join(root,'assets/asset-license-ledger.json'));
  const original=fs.readFileSync(path.join(root,'roblox-games/cozy-island/shared/CozyCC0Library.luau'),'utf8');
  const report={gameId:'cozy-island',universeId:EXPECTED_UNIVERSE,originalLibraries:FAMILIES.length,
    libraryFamilies:{},externalRecords:(registry.registeredAssets||[]).length,licenseLedgerEntries:(ledger.entries||[]).length,
    originalSourceInventory:{},licensedPbrAvailable:false,
    acceptedCC0Models:[],blockedAssets:[],sourceDigestsVerified:0};
  if(registry.rules?.requireSourceDigestForReuse!==true||
    registry.rules?.requireUniverseGrantForEachGame!==true||
    registry.rules?.neverAssumeCrossUniversePermissions!==true)throw Error('CC0_LIBRARY_POLICY_MISSING');
  const allRobloxLibraryDirs=fs.readdirSync(path.join(root,'assets/roblox'),{withFileTypes:true})
    .filter(d=>d.isDirectory()).map(d=>d.name).sort();
  report.allRobloxLibraryDirectories=allRobloxLibraryDirs;
  if(allRobloxLibraryDirs.length<18)throw Error('ROBLOX_LIBRARY_DIRECTORY_COVERAGE_TOO_SMALL');
  for(const rootPath of ['assets/roblox','assets/external','assets/shared']){
    report.originalSourceInventory[rootPath]=scanSources(path.join(root,rootPath));
  }
  const ambientLicense=fs.readFileSync(path.join(root,'assets/roblox/common-materials-v1/LICENSE.txt'),'utf8');
  if(!/ambientCG/.test(ambientLicense)||!/CC0 1\.0/.test(ambientLicense))throw Error('PBR_MATERIAL_CC0_LICENSE_MISSING');
  const project=getJson(path.join(root,'roblox-games/cozy-island/default.project.json'));
  const materialVariants=Object.values(project.tree?.MaterialService||{}).filter(v=>v?.$className==='MaterialVariant');
  if(materialVariants.length<15)throw Error('CC0_MATERIAL_VARIANTS_NOT_IN_ROJO_BUILD');
  report.licensedPbrAvailable=true;
  report.licensedPbrVariantCount=materialVariants.length;
  for(const family of FAMILIES){
    const folder=path.join(root,'assets/roblox',family);
    if(!fs.statSync(folder,{throwIfNoEntry:false})?.isDirectory())throw Error('ROBLOX_LIBRARY_FAMILY_MISSING:'+family);
    const files=fs.readdirSync(folder).filter(f=>/\.luau$|\.json$/.test(f));
    if(!files.some(f=>f.endsWith('.luau')))throw Error('ROBLOX_LIBRARY_SOURCE_MISSING:'+family);
    report.libraryFamilies[family]={files:files.length,checked:true};
  }
  if(!Array.isArray(ledger.entries)||!ledger.entries.length||
    !ledger.entries.every(row=>isCC0(row.license)&&row.commercialUse===true&&row.modificationUse===true&&row.evidence))
    throw Error('CC0_LICENSE_LEDGER_UNVERIFIED_OR_INCOMPATIBLE');
  if(!Array.isArray(registry.registeredAssets)||registry.registeredAssets.length<9)throw Error('CC0_ASSET_REGISTRY_MISSING');
  const seen=new Set();
  const registered=new Map();
  for(const row of registry.registeredAssets){
    if(!isCC0(row.license)||!okId(row.assetId)||!row.originalPath)throw Error('CC0_REGISTRY_INVALID:'+String(row.key));
    if(seen.has(row.assetId))throw Error('CC0_REGISTRY_DUPLICATE_ID:'+row.assetId);
    seen.add(row.assetId);registered.set(row.assetId,row);
    // Undigested old world/UI imports cannot be reused or silently called CC0-verified.
    if(!row.gitBlobSha)report.blockedAssets.push({key:row.key,reason:'SOURCE_DIGEST_MISSING'});
  }
  const requested=[...original.matchAll(/^\s*(?:[A-Za-z]+[0-9]*=)?(\d{11,16}),/gm)]
    .map(m=>Number(m[1]));
  if(requested.length<12)throw Error('CC0_NPC_AND_RAIDER_USAGE_MISSING');
  for(const assetId of [...new Set(requested)]){
    const entry=registered.get(assetId);
    if(!entry||entry.family!=='actor'||!entry.originalPath.startsWith('assets/roblox/actors/sources/')||
      !/\.glb$/.test(entry.originalPath)||!/^[a-f0-9]{40}$/.test(entry.gitBlobSha||''))
      throw Error('CC0_SOURCE_NOT_VERIFIED:'+assetId);
    if(gitBlob(entry.originalPath,root)!==entry.gitBlobSha)throw Error('CC0_SOURCE_DIGEST_DRIFT:'+entry.key);
    report.sourceDigestsVerified++;
    report.acceptedCC0Models.push({key:entry.key,assetId:entry.assetId,
      source:entry.originalPath,sourceBlob:entry.gitBlobSha,license:entry.license,
      // Old simple-rpg grants are NOT Cozy grants. The deployment must grant these exact IDs.
      permissionMustBeGrantedTo:EXPECTED_UNIVERSE});
  }
  if(report.acceptedCC0Models.length<7)throw Error('CC0_DISTINCT_VISUAL_COVERAGE_TOO_SMALL');
  report.pass=true;
  return report;
}
export async function grantCozyCC0({report,apiKey=process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  cookie=process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE,
  fetchImpl=fetch}={}){
  if(report?.pass!==true||report?.universeId!==EXPECTED_UNIVERSE)throw Error('CC0_AUDIT_REQUIRED');
  if(!apiKey&&!cookie)throw Error('CC0_CLOUD_CREDENTIALS_REQUIRED');
  // Prefer the existing account's authenticated path if present; fall back to the pinned Cloud key.
  const url='https://apis.roblox.com/asset-permissions-api/v1/assets/permissions';
  const ids=report.acceptedCC0Models.map(r=>({assetId:r.assetId,grantToDependencies:true}));
  const body=JSON.stringify({subjectType:'Universe',subjectId:EXPECTED_UNIVERSE,action:'Use',requests:ids});
  const authCookie=cookie? (cookie.includes('.ROBLOSECURITY=')?cookie:'.ROBLOSECURITY='+cookie+';') : '';
  let headers={'content-type':'application/json'};
  if(authCookie)headers.cookie=authCookie;
  else headers['x-api-key']=apiKey;
  let response=await fetchImpl(url,{method:'PATCH',headers,body,signal:AbortSignal.timeout(45000)});
  if(authCookie&&response.status===403&&response.headers.get('x-csrf-token')){
    headers={...headers,'x-csrf-token':response.headers.get('x-csrf-token')};
    response=await fetchImpl(url,{method:'PATCH',headers,body,signal:AbortSignal.timeout(45000)});
  }
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.errors?.length)throw Error('COZY_CC0_UNIVERSE_GRANT_FAILED:HTTP_'+response.status);
  return {granted:true,universeId:EXPECTED_UNIVERSE,assetIds:ids.map(x=>x.assetId)};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const result=auditCozyCC0();
  if(process.argv.includes('--grant')){
    const grant=await grantCozyCC0({report:result});
    result.universeUseGranted=grant;
  }
  const out=process.env.COZY_CC0_AUDIT_OUTPUT||'/tmp/cozy-cc0-audit.json';
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
  console.log('COZY_CC0_LIBRARY_FAMILY_AUDIT=PASS:'+Object.keys(result.libraryFamilies).length);
  console.log('COZY_CC0_ALL_ROBLOX_DIRECTORIES_SCANNED='+result.allRobloxLibraryDirectories.length);
  console.log('COZY_CC0_LICENSE_ENTRIES='+result.licenseLedgerEntries);
  console.log('COZY_CC0_PBR_VARIANTS='+result.licensedPbrVariantCount);
  console.log('COZY_CC0_ORIGINAL_MODELS_IN_INVENTORY='+Object.values(result.originalSourceInventory).reduce((n,x)=>n+x.nativeModels,0));
  console.log('COZY_CC0_REGISTRY_SCANNED='+result.externalRecords);
  console.log('COZY_CC0_UNVERIFIED_ASSETS_BLOCKED='+result.blockedAssets.length);
  console.log('COZY_CC0_SOURCE_DIGEST_VERIFIED='+result.sourceDigestsVerified);
  if(process.argv.includes('--grant'))console.log('COZY_CC0_UNIVERSE_USE_GRANT=PASS:'+result.universeUseGranted.assetIds.length);
}
