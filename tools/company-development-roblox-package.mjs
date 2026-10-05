import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hasVerifiedVibe2SourceHandoff,validateExistingRobloxSourceTree} from './company-development-roblox-source-reconcile.mjs';
import {buildRobloxStudioAssetBootstrapPlan,robloxBuildProfileFromBaseline,ROBLOX_COMMON_LIBRARY_PROJECT_MODULES} from './company-development-roblox-bootstrap.mjs';

const SHA=/^[0-9a-f]{40}$/i;
const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const safeName=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);

export const ROBLOX_PACKAGE_TOOL=Object.freeze({
  rojoVersion:'7.7.0',
  linuxX64Asset:'rojo-7.7.0-linux-x86_64.zip',
  linuxX64AssetSha256:'22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073',
  internalAssetContractVersion:2,
});

function walkFiles(root){
  const files=[];
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const full=path.join(root,entry.name);
    if(entry.isDirectory())files.push(...walkFiles(full));
    else if(entry.isFile())files.push(full);
  }
  return files;
}

export function collectRobloxSourceScriptInventory(root){
  const inventory={Script:0,LocalScript:0,ModuleScript:0,total:0};
  for(const file of walkFiles(path.resolve(root))){
    const name=path.basename(file).toLowerCase();
    if(/\.server\.(?:lua|luau)$/.test(name))inventory.Script++;
    else if(/\.client\.(?:lua|luau)$/.test(name))inventory.LocalScript++;
    else if(/\.(?:lua|luau)$/.test(name))inventory.ModuleScript++;
  }
  inventory.total=inventory.Script+inventory.LocalScript+inventory.ModuleScript;
  return Object.freeze(inventory);
}

export function validateRobloxArtifactScriptInventory({artifactPath='',expected={}}={}){
  const artifact=path.resolve(clean(artifactPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  const xml=fs.readFileSync(artifact,'utf8');
  const actual={
    Script:(xml.match(/<Item\s+class="Script"(?:\s|>)/g)||[]).length,
    LocalScript:(xml.match(/<Item\s+class="LocalScript"(?:\s|>)/g)||[]).length,
    ModuleScript:(xml.match(/<Item\s+class="ModuleScript"(?:\s|>)/g)||[]).length,
  };
  actual.total=actual.Script+actual.LocalScript+actual.ModuleScript;
  const missing=[];
  for(const type of ['Script','LocalScript','ModuleScript']){
    const required=Number(expected?.[type]||0);
    if(actual[type]<required)missing.push(`${type}:${actual[type]}/${required}`);
  }
  if(missing.length)throw new Error(`Rojo artifact script inventory incomplete: ${missing.join(',')}`);
  return Object.freeze(actual);
}

export function validateRobloxArtifactInternalLibraryInventory({artifactPath='',requiredModules=Object.keys(ROBLOX_COMMON_LIBRARY_PROJECT_MODULES)}={}){
  const artifact=path.resolve(clean(artifactPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  const xml=fs.readFileSync(artifact,'utf8');
  const required=[...new Set((requiredModules||[]).map(clean).filter(Boolean))];
  const names=new Set();
  for(const match of xml.matchAll(/<Item\s+class="ModuleScript"(?:\s[^>]*)?>[\s\S]*?<\/Item>/g)){
    const name=clean(match[0].match(/<string\s+name="Name">\s*([^<]+?)\s*<\/string>/)?.[1]);
    if(name)names.add(name);
  }
  const missing=required.filter(name=>!names.has(name));
  if(missing.length)throw new Error('ROBLOX_INTERNAL_LIBRARY_ARTIFACT_MODULES_MISSING:'+missing.join('|'));
  return Object.freeze({
    pass:true,
    requiredCount:required.length,
    packagedCount:required.length,
    requiredModules:Object.freeze(required),
    packagedModules:Object.freeze(required.filter(name=>names.has(name))),
  });
}

function robloxLightingSerializationProfile(project={}){
  const sourceProperties=project?.tree?.Lighting?.$properties||{};
  const technology=clean(sourceProperties.Technology)||'Voxel';
  const profiles={
    Voxel:{technologyToken:1,lightingStyle:'Soft',lightingStyleToken:1,prioritizeLightingQuality:false},
    ShadowMap:{technologyToken:3,lightingStyle:'Soft',lightingStyleToken:1,prioritizeLightingQuality:true},
    Future:{technologyToken:4,lightingStyle:'Realistic',lightingStyleToken:0,prioritizeLightingQuality:true},
  };
  const profile=profiles[technology];
  if(!profile)throw new Error('ROBLOX_LIGHTING_SOURCE_TECHNOLOGY_UNSUPPORTED:'+technology);
  const lightingStyle=clean(sourceProperties.LightingStyle)||profile.lightingStyle;
  const lightingStyleToken=lightingStyle==='Realistic'?0:lightingStyle==='Soft'?1:null;
  if(lightingStyleToken===null)throw new Error('ROBLOX_LIGHTING_SOURCE_STYLE_UNSUPPORTED:'+lightingStyle);
  const prioritizeLightingQuality=sourceProperties.PrioritizeLightingQuality??profile.prioritizeLightingQuality;
  const expectsRetro=clean(project?.tree?.Lighting?.CompatibilityToneMap?.$properties?.TonemapperPreset)==='Retro';
  return Object.freeze({
    technology,
    technologyToken:profile.technologyToken,
    lightingStyle,
    lightingStyleToken,
    prioritizeLightingQuality,
    expectsRetro,
  });
}

function upsertRobloxXmlProperty(propertiesXml,{tag,name,value}){
  const expression=new RegExp(`<${tag}\\s+name="${name}">[\\s\\S]*?<\\/${tag}>`,'i');
  const serialized=`<${tag} name="${name}">${value}</${tag}>`;
  if(expression.test(propertiesXml))return propertiesXml.replace(expression,serialized);
  return propertiesXml.replace(/<\/Properties>/i,`  ${serialized}\n    </Properties>`);
}

export function normalizeRobloxArtifactLightingSerialization({artifactPath='',projectPath=''}={}){
  const artifact=path.resolve(clean(artifactPath));
  const projectFile=path.resolve(clean(projectPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  if(!fs.existsSync(projectFile))throw new Error(`Roblox project missing: ${projectFile}`);
  const project=readJson(projectFile);
  const profile=robloxLightingSerializationProfile(project);
  let xml=fs.readFileSync(artifact,'utf8');
  const lightingStart=xml.search(/<Item\s+class="Lighting"(?:\s|>)/i);
  if(lightingStart<0)throw new Error('ROBLOX_LIGHTING_ITEM_REQUIRED');
  const propertiesStart=xml.indexOf('<Properties>',lightingStart);
  const propertiesClose=xml.indexOf('</Properties>',propertiesStart);
  if(propertiesStart<0||propertiesClose<0)throw new Error('ROBLOX_LIGHTING_PROPERTIES_REQUIRED');
  const propertiesEnd=propertiesClose+'</Properties>'.length;
  let lightingProperties=xml.slice(propertiesStart,propertiesEnd);
  lightingProperties=upsertRobloxXmlProperty(lightingProperties,{tag:'token',name:'Technology',value:profile.technologyToken});
  lightingProperties=upsertRobloxXmlProperty(lightingProperties,{tag:'token',name:'LightingStyle',value:profile.lightingStyleToken});
  lightingProperties=upsertRobloxXmlProperty(lightingProperties,{tag:'bool',name:'PrioritizeLightingQuality',value:profile.prioritizeLightingQuality?'true':'false'});
  xml=xml.slice(0,propertiesStart)+lightingProperties+xml.slice(propertiesEnd);

  if(profile.expectsRetro){
    const toneName=/<string\s+name="Name">\s*CompatibilityToneMap\s*<\/string>/i;
    const match=toneName.exec(xml);
    if(!match)throw new Error('ROBLOX_LIGHTING_RETRO_TONEMAP_INSTANCE_REQUIRED');
    const toneNameAt=match.index;
    const tonePropertiesStart=xml.lastIndexOf('<Properties>',toneNameAt);
    const tonePropertiesClose=xml.indexOf('</Properties>',toneNameAt);
    if(tonePropertiesStart<lightingStart||tonePropertiesClose<0)throw new Error('ROBLOX_LIGHTING_RETRO_TONEMAP_PROPERTIES_REQUIRED');
    const tonePropertiesEnd=tonePropertiesClose+'</Properties>'.length;
    let toneProperties=xml.slice(tonePropertiesStart,tonePropertiesEnd);
    toneProperties=upsertRobloxXmlProperty(toneProperties,{tag:'token',name:'TonemapperPreset',value:1});
    xml=xml.slice(0,tonePropertiesStart)+toneProperties+xml.slice(tonePropertiesEnd);
  }

  fs.writeFileSync(artifact,xml,'utf8');
  return Object.freeze({pass:true,...profile});
}

export function validateRobloxArtifactLightingMigrationGuard({artifactPath='',projectPath=''}={}){
  const artifact=path.resolve(clean(artifactPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  const projectFile=clean(projectPath)?path.resolve(clean(projectPath)):'';
  const project=projectFile&&fs.existsSync(projectFile)?readJson(projectFile):null;
  const {technology,technologyToken,lightingStyle,lightingStyleToken,prioritizeLightingQuality,expectsRetro}=robloxLightingSerializationProfile(project||{});
  const xml=fs.readFileSync(artifact,'utf8');
  const checks={
    supportedTechnology:new RegExp(`<token\\s+name="Technology">\\s*${technologyToken}\\s*<\\/token>`,'i').test(xml),
    lightingStyle:new RegExp(`<token\\s+name="LightingStyle">\\s*${lightingStyleToken}\\s*<\\/token>`,'i').test(xml),
    prioritizeLightingQuality:new RegExp(`<bool\\s+name="PrioritizeLightingQuality">\\s*${prioritizeLightingQuality?'true':'false'}\\s*<\\/bool>`,'i').test(xml),
    compatibilityToneMap:!expectsRetro||/<Item\s+class="ColorGradingEffect"(?:\s|>)[\s\S]*?<string\s+name="Name">\s*CompatibilityToneMap\s*<\/string>[\s\S]*?<token\s+name="TonemapperPreset">\s*1\s*<\/token>/i.test(xml),
  };
  const missing=[];
  if(!checks.supportedTechnology)missing.push('ROBLOX_LIGHTING_SUPPORTED_TECHNOLOGY_REQUIRED');
  if(!checks.lightingStyle)missing.push('ROBLOX_LIGHTING_STYLE_SERIALIZATION_REQUIRED');
  if(!checks.prioritizeLightingQuality)missing.push('ROBLOX_LIGHTING_QUALITY_PRIORITY_SERIALIZATION_REQUIRED');
  if(!checks.compatibilityToneMap)missing.push('ROBLOX_LIGHTING_RETRO_TONEMAP_REQUIRED');
  if(missing.length)throw new Error('ROBLOX_LIGHTING_MIGRATION_GUARD_FAILED:'+missing.join(','));
  return Object.freeze({pass:true,technology,lightingStyle,prioritizeLightingQuality,expectsRetro,...checks});
}

export function validateRobloxArtifactInternalAssetBinding({artifactPath='',expectedPlan={}}={}){
  const artifact=path.resolve(clean(artifactPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  if(expectedPlan?.applied!==true)throw new Error('ROBLOX_INTERNAL_ASSET_LIBRARY_NOT_READY');
  const xml=fs.readFileSync(artifact,'utf8');
  const requiredFamilies=[...(expectedPlan?.universalAssetFirst?.allFamilies||Object.keys(expectedPlan?.families||{}))];
  const expectedAtoms=requiredFamilies.flatMap(family=>(expectedPlan?.families?.[family]||[]).map(atom=>({family,atom})));
  const missingFamilies=requiredFamilies.filter(family=>!new RegExp('\\b'+family+'\\s*=\\s*\\{').test(xml));
  const missingAtoms=expectedAtoms.filter(({atom})=>!xml.includes(atom)).map(({family,atom})=>family+':'+atom);
  const selectionFingerprint=clean(expectedPlan?.selectionFingerprint);
  const exactFingerprint=Boolean(selectionFingerprint)&&xml.includes(selectionFingerprint);
  const bindingVersion=Number(expectedPlan?.bindingVersion||0);
  const bindingVersionPresent=new RegExp('(?:BindingVersion|STUDIO_ASSET_BINDING_VERSION)\\s*=\\s*'+bindingVersion+'\\b').test(xml);
  const selectionRuntimeVisible=/StudioAssetAtoms/.test(xml)
    &&/(hasStudioAssetAtom|hasStudioAtom|studioAssetFamily)/.test(xml);
  const libraryAutoloadVisible=/CompanyAssets/.test(xml)
    &&/COMPANY_ASSET_LIBRARY_NAMES/.test(xml)
    &&/ROBLOX_INTERNAL_LIBRARY_LOAD_FAILED/.test(xml)
    &&/CompanyAssetLibrariesLoaded/.test(xml)
    &&/CompanyAssetLibraryNames/.test(xml);
  const visualPrimitivePresent=/Instance\.new\(&quot;(?:Frame|TextButton|TextLabel|ImageLabel|ImageButton|ViewportFrame|Part|MeshPart|WedgePart)&quot;\)|Instance\.new\(["'](?:Frame|TextButton|TextLabel|ImageLabel|ImageButton|ViewportFrame|Part|MeshPart|WedgePart)["']\)/.test(xml);
  const plainPrimitiveVisual=visualPrimitivePresent&&!selectionRuntimeVisible;
  const blockers=[];
  if(missingFamilies.length)blockers.push('ROBLOX_INTERNAL_ASSET_PACKAGE_ALL_FAMILIES_REQUIRED');
  if(missingAtoms.length)blockers.push('ROBLOX_INTERNAL_ASSET_PACKAGE_SELECTED_ATOMS_REQUIRED');
  if(!exactFingerprint)blockers.push('ROBLOX_INTERNAL_ASSET_PACKAGE_FINGERPRINT_REQUIRED');
  if(!bindingVersionPresent||!selectionRuntimeVisible)blockers.push('ROBLOX_INTERNAL_ASSET_PACKAGE_RUNTIME_BINDING_REQUIRED');
  if(!libraryAutoloadVisible)blockers.push('ROBLOX_INTERNAL_LIBRARY_PACKAGE_AUTOLOAD_REQUIRED');
  if(plainPrimitiveVisual)blockers.push('ROBLOX_PLAIN_PRIMITIVE_PACKAGE_FORBIDDEN');
  if(blockers.length)throw new Error('ROBLOX_INTERNAL_ASSET_PACKAGE_GUARD_FAILED:'+blockers.join(','));
  return Object.freeze({
    pass:true,
    contractVersion:ROBLOX_PACKAGE_TOOL.internalAssetContractVersion,
    libraryVersion:Number(expectedPlan?.libraryVersion||0),
    bindingVersion,
    selectionFingerprint,
    familyCount:requiredFamilies.length,
    selectedAtomCount:expectedAtoms.length,
    missingFamilies:Object.freeze([]),
    missingAtoms:Object.freeze([]),
    primitiveOnlyVisualsForbidden:true,
    allLibrariesAutoLoaded:libraryAutoloadVisible,
    runtimeVerificationStillRequired:true,
    authority:'roblox-package-internal-asset-binding-guard',
  });
}

export function createRobloxBuildEvidence({gameId='',sourcePath='',sourceRevision='',artifactPath='',artifactSha256='',sourceValidationPassed=false,saveRequired=false,internalAssetBinding=null,internalLibraryInventory=null}={}){
  const identity=clean(artifactSha256)?`sha256:${clean(artifactSha256)}`:null;
  const packagePassed=Boolean(identity)
    &&sourceValidationPassed===true
    &&internalAssetBinding?.pass===true
    &&internalAssetBinding?.allLibrariesAutoLoaded===true
    &&internalLibraryInventory?.pass===true;
  return Object.freeze({
    version:2,
    platform:'ROBLOX',
    gameId:clean(gameId),
    sourcePath:clean(sourcePath),
    sourceRevision:clean(sourceRevision),
    buildOrPackagePassed:packagePassed,
    artifactIdentity:identity,
    internalAssetContractVersion:Number(internalAssetBinding?.contractVersion||0),
    internalAssetPackageBindingPassed:internalAssetBinding?.pass===true,
    internalAssetLibraryVersion:Number(internalAssetBinding?.libraryVersion||0),
    internalAssetBindingVersion:Number(internalAssetBinding?.bindingVersion||0),
    internalAssetSelectionFingerprint:clean(internalAssetBinding?.selectionFingerprint)||null,
    internalAssetFamilyCount:Number(internalAssetBinding?.familyCount||0),
    internalAssetAtomCount:Number(internalAssetBinding?.selectedAtomCount||0),
    primitiveOnlyVisualsForbidden:internalAssetBinding?.primitiveOnlyVisualsForbidden===true,
    internalLibraryAutoLoadPassed:internalAssetBinding?.allLibrariesAutoLoaded===true,
    internalLibraryModulesPackaged:internalLibraryInventory?.pass===true,
    internalLibraryRequiredModuleCount:Number(internalLibraryInventory?.requiredCount||0),
    internalLibraryPackagedModuleCount:Number(internalLibraryInventory?.packagedCount||0),
    internalLibraryPackagedModules:Object.freeze([...(internalLibraryInventory?.packagedModules||[])]),
    artifactPath:clean(artifactPath)||null,
    luauOrSourceValidationPassed:sourceValidationPassed===true,
    saveRequired:saveRequired===true,
    rojoVersion:ROBLOX_PACKAGE_TOOL.rojoVersion,
    rojoAssetSha256:ROBLOX_PACKAGE_TOOL.linuxX64AssetSha256,
    buildPreflightPassed:false,
    runtimePassed:false,
    independentQaPassed:false,
    regressionPassed:false,
    finalReviewPassed:false,
    lastSuccessfulStage:packagePassed?'TARGET_PLATFORM_BUILD_OR_PACKAGE':'TARGET_PLATFORM_SOURCE_BIND',
    failureStage:'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT',
    failureSignature:'ROBLOX_BUILD_PREFLIGHT_PENDING',
    releaseClaim:false,
    authority:'roblox-build-package-evidence',
  });
}

export function resolvePackageSourceValidation({staticVerdict={},verifiedSourceTreeSha='',actualSourceTreeSha=''}={}){
  const blockers=Array.isArray(staticVerdict?.blockers)?[...staticVerdict.blockers]:[];
  const hardAssetBlockers=blockers.filter(value=>/^ROBLOX_(?:INTERNAL_ASSET|PLAIN_PRIMITIVE)/.test(clean(value)));
  const saveRequired=staticVerdict?.saveRequired===true;
  const expectedTree=clean(verifiedSourceTreeSha);
  if(!expectedTree){
    return Object.freeze({
      pass:staticVerdict?.pass===true,
      blockers:Object.freeze([...new Set(blockers)]),
      saveRequired,
      authority:'exact-source-static-validation',
    });
  }
  if(!SHA.test(expectedTree)){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze(['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_INVALID']),
      saveRequired,
      authority:'verified-vibe2-source-handoff',
    });
  }
  const actualTree=clean(actualSourceTreeSha);
  if(!SHA.test(actualTree)||actualTree!==expectedTree){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze(['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH']),
      saveRequired,
      authority:'verified-vibe2-source-handoff',
    });
  }
  if(hardAssetBlockers.length){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze([...new Set(hardAssetBlockers)]),
      saveRequired,
      authority:'verified-vibe2-source-handoff-plus-internal-asset-hard-gate',
    });
  }
  return Object.freeze({
    pass:true,
    blockers:Object.freeze([]),
    saveRequired,
    authority:'verified-vibe2-source-handoff',
  });
}

export function verifiedVibe2SourceTreeShaFromRuntime({repoRoot='.',runtimeRef='',gameId=''}={}){
  const ref=clean(runtimeRef);
  const id=clean(gameId);
  if(!ref||!id)return '';
  try{
    const text=execFileSync('git',['-C',path.resolve(repoRoot),'show',`${ref}:development-queue.json`],{encoding:'utf8',maxBuffer:16*1024*1024});
    const queue=JSON.parse(text.replace(/^\uFEFF/,''));
    const item=(queue.items||[]).find(row=>clean(row?.gameId)===id);
    if(!hasVerifiedVibe2SourceHandoff(item))return '';
    return clean(item.robloxVibe2VerifiedHandoff.sourceTreeSha);
  }catch{
    return '';
  }
}

export function packageRobloxSource({repoRoot='.',gameId='',sourcePath='',sourceRevision='',baseline={},assetLibrary={},rojoPath='',outputDir='',verifiedSourceTreeSha=''}={}){
  const id=clean(gameId);
  const relativeSource=clean(sourcePath).replaceAll('\\','/');
  const revision=clean(sourceRevision);
  const rojo=path.resolve(clean(rojoPath));
  const outDir=path.resolve(clean(outputDir));
  if(!id)throw new Error('gameId required');
  if(relativeSource!==`roblox-games/${id}`)throw new Error(`source path mismatch: ${relativeSource}`);
  if(!SHA.test(revision))throw new Error(`exact 40-char source revision required: ${revision}`);
  if(!fs.existsSync(rojo))throw new Error(`Rojo executable missing: ${rojo}`);
  fs.mkdirSync(outDir,{recursive:true});

  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-roblox-package-'));
  const worktree=path.join(tempRoot,'source');
  try{
    execFileSync('git',['-C',path.resolve(repoRoot),'worktree','add','--detach',worktree,revision],{stdio:'pipe',encoding:'utf8'});
    const root=path.join(worktree,relativeSource);
    for(const [moduleName,modulePath] of Object.entries(ROBLOX_COMMON_LIBRARY_PROJECT_MODULES)){
      const absoluteModulePath=path.resolve(root,modulePath);
      if(!fs.existsSync(absoluteModulePath)||!fs.statSync(absoluteModulePath).isFile()){
        throw new Error('ROBLOX_INTERNAL_LIBRARY_SOURCE_MODULE_MISSING:'+moduleName+':'+modulePath);
      }
    }
    const staticVerdict=validateExistingRobloxSourceTree({root,baseline,assetLibrary,gameId:id});
    const expectedAssetPlan=buildRobloxStudioAssetBootstrapPlan({
      gameId:id,
      profile:robloxBuildProfileFromBaseline(baseline),
      assetLibrary,
    });
    const actualSourceTreeSha=clean(execFileSync('git',['-C',path.resolve(repoRoot),'rev-parse',`${revision}:${relativeSource}`],{stdio:'pipe',encoding:'utf8'}));
    const validation=resolvePackageSourceValidation({staticVerdict,verifiedSourceTreeSha,actualSourceTreeSha});
    if(!validation.pass)throw new Error(`exact-source validation failed: ${validation.blockers.join(',')}`);
    const expectedScripts=collectRobloxSourceScriptInventory(root);
    if(expectedScripts.total<=0)throw new Error('Roblox source contains no executable Luau scripts');
    const artifact=path.join(outDir,`${safeName(id)}.rbxlx`);
    execFileSync(rojo,['build','default.project.json','--output',artifact],{cwd:root,stdio:'pipe',encoding:'utf8',maxBuffer:16*1024*1024});
    const lightingSerialization=normalizeRobloxArtifactLightingSerialization({artifactPath:artifact,projectPath:path.join(root,'default.project.json')});
    const stat=fs.statSync(artifact);
    if(!stat.isFile()||stat.size<=0)throw new Error('Rojo package artifact missing or empty');
    const actualScripts=validateRobloxArtifactScriptInventory({artifactPath:artifact,expected:expectedScripts});
    const internalLibraryInventory=validateRobloxArtifactInternalLibraryInventory({artifactPath:artifact});
    const lightingGuard=validateRobloxArtifactLightingMigrationGuard({artifactPath:artifact,projectPath:path.join(root,'default.project.json')});
    const internalAssetBinding=validateRobloxArtifactInternalAssetBinding({artifactPath:artifact,expectedPlan:expectedAssetPlan});
    const sha256=crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
    console.log(`ROBLOX_BUILD_SCRIPT_INVENTORY=PASS:${actualScripts.Script}/${actualScripts.LocalScript}/${actualScripts.ModuleScript}`);
    console.log(`ROBLOX_BUILD_INTERNAL_ASSET_BINDING=PASS:families=${internalAssetBinding.familyCount}:atoms=${internalAssetBinding.selectedAtomCount}:library=${internalAssetBinding.libraryVersion}`);
    console.log(`ROBLOX_BUILD_INTERNAL_LIBRARY_MODULES=PASS:${internalLibraryInventory.packagedCount}/${internalLibraryInventory.requiredCount}`);
    console.log('ROBLOX_BUILD_PLAIN_PRIMITIVE_VISUAL=FORBIDDEN');
    console.log(`ROBLOX_BUILD_LIGHTING_SERIALIZATION=NORMALIZED:technology=${lightingSerialization.technology}:lightingStyle=${lightingSerialization.lightingStyle}`);
    console.log(`ROBLOX_BUILD_LIGHTING_MIGRATION_GUARD=PASS:technology=${lightingGuard.technology}:lightingStyle=${lightingGuard.lightingStyle}:retroRequired=${lightingGuard.expectsRetro}:retroToneMap=${lightingGuard.compatibilityToneMap}`);
    return createRobloxBuildEvidence({
      gameId:id,
      sourcePath:relativeSource,
      sourceRevision:revision,
      artifactPath:artifact,
      artifactSha256:sha256,
      sourceValidationPassed:true,
      saveRequired:validation.saveRequired,
      internalAssetBinding,
      internalLibraryInventory,
    });
  }finally{
    try{execFileSync('git',['-C',path.resolve(repoRoot),'worktree','remove','--force',worktree],{stdio:'ignore'});}catch{}
    fs.rmSync(tempRoot,{recursive:true,force:true});
  }
}

function runCli(){
  const baselineFile=arg('baseline');
  const evidenceFile=arg('evidence');
  if(!baselineFile||!evidenceFile)throw new Error('required: --baseline and --evidence');
  const repoRoot=arg('repo-root','.');
  const gameId=arg('game-id');
  const runtimeBranch=clean(process.env.COMPANY_RUNTIME_BRANCH);
  const runtimeRef=arg('runtime-ref',runtimeBranch?`origin/${runtimeBranch}`:'');
  const verifiedSourceTreeSha=verifiedVibe2SourceTreeShaFromRuntime({repoRoot,runtimeRef,gameId});
  const assetLibraryFile=arg('asset-library','company-asset-library.json');
  const assetLibrary=readJson(path.resolve(repoRoot,assetLibraryFile));
  const evidence=packageRobloxSource({
    repoRoot,
    gameId,
    sourcePath:arg('source-path'),
    sourceRevision:arg('source-revision'),
    baseline:readJson(baselineFile),
    assetLibrary,
    rojoPath:arg('rojo'),
    outputDir:arg('output-dir'),
    verifiedSourceTreeSha,
  });
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PACKAGE=PASS:${evidence.gameId}`);
  console.log(`ROBLOX_BUILD_ARTIFACT_IDENTITY=${evidence.artifactIdentity}`);
  console.log(`ROBLOX_BUILD_SOURCE_REVISION=${evidence.sourceRevision}`);
  console.log(`ROBLOX_BUILD_SOURCE_VALIDATION=${verifiedSourceTreeSha?'VERIFIED_VIBE2_HANDOFF':'EXACT_SOURCE_STATIC'}`);
  console.log(`ROBLOX_BUILD_INTERNAL_ASSET_CONTRACT_VERSION=${evidence.internalAssetContractVersion}`);
  console.log(`ROBLOX_BUILD_INTERNAL_ASSET_FAMILIES=${evidence.internalAssetFamilyCount}`);
  console.log(`ROBLOX_BUILD_INTERNAL_ASSET_ATOMS=${evidence.internalAssetAtomCount}`);
  console.log(`ROBLOX_BUILD_INTERNAL_LIBRARY_MODULES=${evidence.internalLibraryPackagedModuleCount}/${evidence.internalLibraryRequiredModuleCount}`);
  console.log('ROBLOX_BUILD_PREFLIGHT_PASS=NO');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{runCli();}catch(error){console.error(String(error?.stack||error));process.exitCode=1;}
}
