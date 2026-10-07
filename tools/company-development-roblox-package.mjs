import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hasVerifiedVibe2SourceHandoff,validateExistingRobloxSourceTree,robloxPackageAssetRepairContext} from './company-development-roblox-source-reconcile.mjs';
import {buildRobloxStudioAssetBootstrapPlan,detectRobloxStudioAssetSystems,robloxBuildProfileFromBaseline,robloxStudioAssetDetectionSourceFromRoot,robloxStudioAssetFamilyBoundInText,ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES} from './company-development-roblox-bootstrap.mjs';

const SHA=/^[0-9a-f]{40}$/i;
const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const safeName=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);

export const ROBLOX_PACKAGE_TOOL=Object.freeze({
  rojoVersion:'7.7.0',
  linuxX64Asset:'rojo-7.7.0-linux-x86_64.zip',
  linuxX64AssetSha256:'22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073',
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

export const ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES;

function collectRobloxPackageSourceTexts(sourceRoot=''){
  const root=path.resolve(sourceRoot),rows=[],stack=[root];
  while(stack.length){
    const current=stack.pop();
    let entries=[];
    try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries){
      if(entry.isDirectory()){
        if(['.git','Packages','Binaries','Intermediate','Saved'].includes(entry.name))continue;
        stack.push(path.join(current,entry.name));
        continue;
      }
      if(!/\.(?:lua|luau)$/i.test(entry.name))continue;
      const absolute=path.join(current,entry.name);
      rows.push(Object.freeze({relative:path.relative(root,absolute).replaceAll('\\','/'),text:fs.readFileSync(absolute,'utf8')}));
    }
  }
  return Object.freeze(rows.sort((a,b)=>a.relative.localeCompare(b.relative)));
}
export function validateRobloxPackageAssetThreshold({root='',gameId='',baseline={},assetLibrary={}}={}){
  const sourceRoot=path.resolve(root);
  const blockers=[];
  let expected=null;
  try{
    const profile=robloxBuildProfileFromBaseline(baseline);
    expected=buildRobloxStudioAssetBootstrapPlan({gameId,profile,assetLibrary});
  }catch(error){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze(['ROBLOX_PACKAGE_ASSET_PLAN_UNAVAILABLE:'+clean(error?.message||error)]),
      requiredFamilies:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,
      familyCoverageCount:0,
      requiredFamilyCount:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.length,
      selectedAtomCount:0,
      primitiveOnlyOrColorOnlyForbidden:true,
      visibleAssetBindingPass:false,
      authority:'roblox-package-universal-asset-threshold',
    });
  }
  const configFile=path.join(sourceRoot,'shared','GameConfig.luau');
  if(!fs.existsSync(configFile))blockers.push('ROBLOX_PACKAGE_ASSET_CONFIG_MISSING');
  const sourceRows=collectRobloxPackageSourceTexts(sourceRoot);
  if(!sourceRows.length)blockers.push('ROBLOX_PACKAGE_ASSET_SOURCE_MISSING');
  if(blockers.length)return Object.freeze({
    pass:false,
    blockers:Object.freeze(blockers),
    requiredFamilies:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,
    familyCoverageCount:0,
    requiredFamilyCount:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.length,
    selectedAtomCount:Number(expected?.selectedAtomCount||0),
    primitiveOnlyOrColorOnlyForbidden:true,
    visibleAssetBindingPass:false,
    familyBindingPassCount:0,
    resolvedFamilyCount:0,
    authority:'roblox-package-universal-asset-threshold',
  });

  const config=fs.readFileSync(configFile,'utf8');
  const sourceText=sourceRows.map(row=>row.text).join('\n');
  const semanticSource=robloxStudioAssetDetectionSourceFromRoot(sourceRoot);
  const expectedFamilies=expected?.families||{};
  const missingPlanFamilies=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.filter(family=>!(expectedFamilies[family]||[]).length);
  if(expected?.applied!==true||missingPlanFamilies.length)blockers.push('ROBLOX_PACKAGE_ALL_INTERNAL_LIBRARY_FAMILIES_REQUIRED');

  if(!/StudioAssets\s*=\s*\{[\s\S]*?Applied\s*=\s*true/.test(config))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_BINDING_REQUIRED');
  if(!/BindingVersion\s*=\s*2/.test(config))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_BINDING_VERSION_REQUIRED');
  if(!config.includes(`LibraryVersion = ${Number(expected?.libraryVersion||0)}`))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_LIBRARY_VERSION_MISMATCH');
  if(!config.includes(`SelectionFingerprint = "${clean(expected?.selectionFingerprint)}"`))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_SELECTION_FINGERPRINT_MISMATCH');
  if(!config.includes(`SourceUsageFingerprint = "${clean(expected?.buildUpAssetSourceUsageFingerprint)}"`))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_SOURCE_USAGE_FINGERPRINT_MISMATCH');
  if(!config.includes(`SourceUsageLibraryVersion = ${Number(expected?.buildUpAssetSourceUsageLibraryVersion||expected?.libraryVersion||0)}`))blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_SOURCE_USAGE_LIBRARY_VERSION_MISMATCH');

  let familyCoverageCount=0;
  for(const family of ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES){
    const match=config.match(new RegExp('\\b'+family+'\\s*=\\s*\\{([^}]*)\\}','m'));
    const expectedAtoms=[...new Set((expectedFamilies[family]||[]).map(clean).filter(Boolean))].sort();
    const configuredAtoms=match?[...new Set([...match[1].matchAll(/["']([^"']+)["']/g)].map(row=>clean(row[1])).filter(Boolean))].sort():[];
    const complete=expectedAtoms.length>0
      &&expectedAtoms.length===configuredAtoms.length
      &&expectedAtoms.every((atom,index)=>atom===configuredAtoms[index]);
    if(complete)familyCoverageCount++;
    else blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_FAMILY_SELECTION_MISMATCH:'+family);
  }

  const sourceBindingTracePass=/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/.test(sourceText)
    &&/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(sourceText)
    &&/StudioAssetAtoms/.test(sourceText)
    &&/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{/.test(sourceText);
  if(!sourceBindingTracePass)blockers.push('ROBLOX_PACKAGE_INTERNAL_ASSET_SOURCE_BINDING_TRACE_REQUIRED');

  const statusBlock=sourceText.match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\}/)?.[1]||'';
  const detectedSystems=detectRobloxStudioAssetSystems({sourceText:semanticSource});
  const familyResults=[];
  let familyBindingPassCount=0,resolvedFamilyCount=0,appliedFamilyCount=0,notApplicableFamilyCount=0;
  for(const family of ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES){
    const status=clean(statusBlock.match(new RegExp('\\b'+family+'\\s*=\\s*["\\\'](APPLIED|NOT_APPLICABLE)["\\\']','i'))?.[1]).toUpperCase();
    const systemPresent=detectedSystems[family]===true;
    const boundFiles=sourceRows.filter(row=>robloxStudioAssetFamilyBoundInText(row.text,family)).map(row=>row.relative);
    const actualBinding=boundFiles.length>0;
    if(!status){
      blockers.push('ROBLOX_PACKAGE_ASSET_FAMILY_STATUS_MISSING:'+family);
    }else if(status==='NOT_APPLICABLE'){
      notApplicableFamilyCount+=1;
      if(systemPresent)blockers.push('ROBLOX_PACKAGE_ASSET_NOT_APPLICABLE_WITH_EXISTING_SYSTEM:'+family);
      else resolvedFamilyCount+=1;
    }else if(status==='APPLIED'){
      appliedFamilyCount+=1;
      if(!systemPresent)blockers.push('ROBLOX_PACKAGE_ASSET_APPLIED_WITHOUT_EXISTING_SYSTEM:'+family);
      else if(!actualBinding)blockers.push('ROBLOX_PACKAGE_ASSET_FAMILY_NOT_ACTUALLY_BOUND:'+family);
      else{
        familyBindingPassCount+=1;
        resolvedFamilyCount+=1;
      }
    }
    familyResults.push(Object.freeze({family,status:status||null,systemPresent,actualBinding,boundFiles:Object.freeze(boundFiles)}));
  }

  const assetDependentSource=familyBindingPassCount>0;
  const nonPlainVisualSource=/(?:UIStroke|UICorner|UIGradient|ImageLabel|ImageButton|MeshId|TextureID|MaterialVariant|SurfaceAppearance|ParticleEmitter|Beam|Trail|SoundId|AnimationId|Enum\.Material)/.test(semanticSource);
  const visibleAssetBindingPass=assetDependentSource&&nonPlainVisualSource;
  if(!visibleAssetBindingPass)blockers.push('ROBLOX_PACKAGE_PRIMITIVE_ONLY_OR_COLOR_ONLY_FORBIDDEN');

  return Object.freeze({
    pass:blockers.length===0,
    blockers:Object.freeze([...new Set(blockers)]),
    requiredFamilies:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,
    familyCoverageCount,
    requiredFamilyCount:ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.length,
    selectedAtomCount:Number(expected?.selectedAtomCount||0),
    libraryVersion:Number(expected?.libraryVersion||0),
    selectionFingerprint:clean(expected?.selectionFingerprint)||null,
    buildUpAssetSourceUsageFingerprint:clean(expected?.buildUpAssetSourceUsageFingerprint)||null,
    buildUpAssetSourceUsageLibraryVersion:Number(expected?.buildUpAssetSourceUsageLibraryVersion||expected?.libraryVersion||0)||null,
    selectedSourceContentHashes:Object.freeze([...(expected?.selectedSourceContentHashes||[])]),
    allFamiliesAutoSelected:familyCoverageCount===ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.length,
    primitiveOnlyOrColorOnlyForbidden:true,
    visibleAssetBindingPass,
    sourceBindingTracePass,
    familyBindingPassCount,
    appliedFamilyCount,
    notApplicableFamilyCount,
    resolvedFamilyCount,
    allFamiliesResolved:resolvedFamilyCount===ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.length,
    familyResults:Object.freeze(familyResults),
    selectedFamilies:Object.freeze(Object.fromEntries(ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>[
      family,Object.freeze([...(expectedFamilies[family]||[])])
    ]))),
    runtimeVerified:false,
    productionVerified:false,
    systemDetectionAuthority:'company-development-roblox-bootstrap-dynamic-source-sync',
    authority:'roblox-package-universal-asset-threshold',
  });
}

export function createRobloxBuildEvidence({gameId='',sourcePath='',sourceRevision='',artifactPath='',artifactSha256='',sourceValidationPassed=false,saveRequired=false,assetThreshold=null,buildUpAssetSourceUsageFingerprint='',buildUpAssetSourceUsageLibraryVersion=0}={}){
  const identity=clean(artifactSha256)?`sha256:${clean(artifactSha256)}`:null;
  const buildUpFingerprint=clean(buildUpAssetSourceUsageFingerprint);
  const buildUpLibraryVersion=Math.max(0,Math.floor(Number(buildUpAssetSourceUsageLibraryVersion)||0));
  return Object.freeze({
    version:1,
    platform:'ROBLOX',
    gameId:clean(gameId),
    sourcePath:clean(sourcePath),
    sourceRevision:clean(sourceRevision),
    buildOrPackagePassed:Boolean(identity)&&sourceValidationPassed===true,
    artifactIdentity:identity,
    artifactPath:clean(artifactPath)||null,
    luauOrSourceValidationPassed:sourceValidationPassed===true,
    saveRequired:saveRequired===true,
    rojoVersion:ROBLOX_PACKAGE_TOOL.rojoVersion,
    rojoAssetSha256:ROBLOX_PACKAGE_TOOL.linuxX64AssetSha256,
    assetThreshold:assetThreshold&&typeof assetThreshold==='object'?assetThreshold:null,
    buildUpAssetSourceUsageFingerprint:/^[0-9a-f]{64}$/i.test(buildUpFingerprint)?buildUpFingerprint:null,
    buildUpAssetSourceUsageLibraryVersion:buildUpLibraryVersion||null,
    assetSelectionFingerprint:clean(assetThreshold?.selectionFingerprint)||null,
    assetLibraryVersion:Number(assetThreshold?.libraryVersion||0)||null,
    buildPreflightPassed:false,
    runtimePassed:false,
    independentQaPassed:false,
    regressionPassed:false,
    finalReviewPassed:false,
    lastSuccessfulStage:Boolean(identity)&&sourceValidationPassed===true?'TARGET_PLATFORM_BUILD_OR_PACKAGE':'TARGET_PLATFORM_SOURCE_BIND',
    failureStage:'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT',
    failureSignature:'ROBLOX_BUILD_PREFLIGHT_PENDING',
    releaseClaim:false,
    authority:'roblox-build-package-evidence',
  });
}

export function resolvePackageSourceValidation({staticVerdict={},verifiedSourceTreeSha='',actualSourceTreeSha=''}={}){
  const blockers=Array.isArray(staticVerdict?.blockers)?[...staticVerdict.blockers]:[];
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

export function packageRobloxSource({repoRoot='.',gameId='',sourcePath='',sourceRevision='',baseline={},rojoPath='',outputDir='',verifiedSourceTreeSha='',buildUpAssetSourceUsageFingerprint='',buildUpAssetSourceUsageLibraryVersion=0,expectedAssetSelectionFingerprint='',expectedAssetLibraryVersion=0}={}){
  const id=clean(gameId);
  const relativeSource=clean(sourcePath).replaceAll('\\','/');
  const revision=clean(sourceRevision);
  const rojo=path.resolve(clean(rojoPath));
  const outDir=path.resolve(clean(outputDir));
  if(!id)throw new Error('gameId required');
  if(relativeSource!==`roblox-games/${id}`)throw new Error(`source path mismatch: ${relativeSource}`);
  if(!SHA.test(revision))throw new Error(`exact 40-char source revision required: ${revision}`);
  const buildUpFingerprint=clean(buildUpAssetSourceUsageFingerprint);
  const buildUpLibraryVersion=Math.max(0,Math.floor(Number(buildUpAssetSourceUsageLibraryVersion)||0));
  const expectedSelectionFingerprint=clean(expectedAssetSelectionFingerprint);
  const expectedLibraryVersion=Math.max(0,Math.floor(Number(expectedAssetLibraryVersion)||0));
  if(buildUpFingerprint&&!/^[0-9a-f]{64}$/i.test(buildUpFingerprint))throw new Error('ROBLOX_BUILD_UP_ASSET_FINGERPRINT_INVALID');
  if(buildUpFingerprint&&buildUpLibraryVersion<=0)throw new Error('ROBLOX_BUILD_UP_ASSET_LIBRARY_VERSION_REQUIRED');
  if(expectedSelectionFingerprint&&!/^[0-9a-f]{64}$/i.test(expectedSelectionFingerprint))throw new Error('ROBLOX_BUILD_UP_SELECTION_FINGERPRINT_INVALID');
  if(expectedSelectionFingerprint&&expectedLibraryVersion<=0)throw new Error('ROBLOX_BUILD_UP_SELECTION_LIBRARY_VERSION_REQUIRED');
  if(!fs.existsSync(rojo))throw new Error(`Rojo executable missing: ${rojo}`);
  fs.mkdirSync(outDir,{recursive:true});

  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-roblox-package-'));
  const worktree=path.join(tempRoot,'source');
  try{
    execFileSync('git',['-C',path.resolve(repoRoot),'worktree','add','--detach',worktree,revision],{stdio:'pipe',encoding:'utf8'});
    const root=path.join(worktree,relativeSource);
    const staticVerdict=validateExistingRobloxSourceTree({root,baseline});
    const actualSourceTreeSha=clean(execFileSync('git',['-C',path.resolve(repoRoot),'rev-parse',`${revision}:${relativeSource}`],{stdio:'pipe',encoding:'utf8'}));
    const validation=resolvePackageSourceValidation({staticVerdict,verifiedSourceTreeSha,actualSourceTreeSha});
    if(!validation.pass)throw new Error(`exact-source validation failed: ${validation.blockers.join(',')}`);
    const assetLibrary=readJson(path.join(worktree,'company-asset-library.json'));
    const assetThreshold=validateRobloxPackageAssetThreshold({root,gameId:id,baseline,assetLibrary});
    if(!assetThreshold.pass){
      const error=new Error('ROBLOX_PACKAGE_ASSET_THRESHOLD_FAILED:'+assetThreshold.blockers.join(','));
      error.evidence={
        ...createRobloxBuildEvidence({gameId:id,sourcePath:relativeSource,sourceRevision:revision,assetThreshold}),
        failureStage:'TARGET_PLATFORM_ASSET_BINDING',failureSignature:'ROBLOX_PACKAGE_ASSET_THRESHOLD_FAILED',
        assetBindingFailed:true,blockers:[...assetThreshold.blockers],
        sourceTreeSha:actualSourceTreeSha,assetRepairContext:robloxPackageAssetRepairContext({assetLibrary,baseline}),
      };
      throw error;
    }
    if(expectedSelectionFingerprint&&clean(assetThreshold.selectionFingerprint)!==expectedSelectionFingerprint){
      throw new Error('ROBLOX_PACKAGE_BUILD_UP_SELECTION_FINGERPRINT_MISMATCH');
    }
    if(expectedLibraryVersion>0&&Number(assetThreshold.libraryVersion||0)!==expectedLibraryVersion){
      throw new Error('ROBLOX_PACKAGE_BUILD_UP_SELECTION_LIBRARY_VERSION_MISMATCH');
    }
    const effectiveBuildUpFingerprint=buildUpFingerprint||clean(assetThreshold.buildUpAssetSourceUsageFingerprint);
    const effectiveBuildUpLibraryVersion=buildUpLibraryVersion||Math.max(0,Math.floor(Number(assetThreshold.buildUpAssetSourceUsageLibraryVersion)||0));
    if(!/^[0-9a-f]{64}$/i.test(effectiveBuildUpFingerprint)||effectiveBuildUpLibraryVersion<=0)throw new Error('ROBLOX_PACKAGE_BUILD_UP_ASSET_SOURCE_USAGE_IDENTITY_REQUIRED');
    const expectedScripts=collectRobloxSourceScriptInventory(root);
    if(expectedScripts.total<=0)throw new Error('Roblox source contains no executable Luau scripts');
    const artifact=path.join(outDir,`${safeName(id)}.rbxlx`);
    execFileSync(rojo,['build','default.project.json','--output',artifact],{cwd:root,stdio:'pipe',encoding:'utf8',maxBuffer:16*1024*1024});
    const lightingSerialization=normalizeRobloxArtifactLightingSerialization({artifactPath:artifact,projectPath:path.join(root,'default.project.json')});
    const stat=fs.statSync(artifact);
    if(!stat.isFile()||stat.size<=0)throw new Error('Rojo package artifact missing or empty');
    const actualScripts=validateRobloxArtifactScriptInventory({artifactPath:artifact,expected:expectedScripts});
    const lightingGuard=validateRobloxArtifactLightingMigrationGuard({artifactPath:artifact,projectPath:path.join(root,'default.project.json')});
    const sha256=crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
    console.log(`ROBLOX_BUILD_ASSET_THRESHOLD=PASS:families=${assetThreshold.familyCoverageCount}/${assetThreshold.requiredFamilyCount}:atoms=${assetThreshold.selectedAtomCount}:primitiveOnly=FORBIDDEN`);
    console.log(`ROBLOX_BUILD_SCRIPT_INVENTORY=PASS:${actualScripts.Script}/${actualScripts.LocalScript}/${actualScripts.ModuleScript}`);
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
      assetThreshold,
      buildUpAssetSourceUsageFingerprint:effectiveBuildUpFingerprint,
      buildUpAssetSourceUsageLibraryVersion:effectiveBuildUpLibraryVersion,
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
  let evidence;
  try{
    evidence=packageRobloxSource({
    repoRoot,
    gameId,
    sourcePath:arg('source-path'),
    sourceRevision:arg('source-revision'),
    baseline:readJson(baselineFile),
    rojoPath:arg('rojo'),
    outputDir:arg('output-dir'),
    verifiedSourceTreeSha,
    buildUpAssetSourceUsageFingerprint:arg('build-up-asset-fingerprint'),
    buildUpAssetSourceUsageLibraryVersion:Number(arg('build-up-asset-library-version','0')),
    expectedAssetSelectionFingerprint:arg('expected-asset-selection-fingerprint'),
    expectedAssetLibraryVersion:Number(arg('expected-asset-library-version','0')),
    });
  }catch(error){
    if(error.evidence?.assetBindingFailed===true){
      fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
      fs.writeFileSync(evidenceFile,`${JSON.stringify(error.evidence,null,2)}\n`);
    }
    throw error;
  }
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PACKAGE=PASS:${evidence.gameId}`);
  console.log(`ROBLOX_BUILD_ARTIFACT_IDENTITY=${evidence.artifactIdentity}`);
  console.log(`ROBLOX_BUILD_SOURCE_REVISION=${evidence.sourceRevision}`);
  console.log(`ROBLOX_BUILD_UP_ASSET_FINGERPRINT=${evidence.buildUpAssetSourceUsageFingerprint||'NONE'}`);
  console.log(`ROBLOX_BUILD_ASSET_SELECTION_FINGERPRINT=${evidence.assetSelectionFingerprint||'NONE'}`);
  console.log(`ROBLOX_BUILD_SOURCE_VALIDATION=${verifiedSourceTreeSha?'VERIFIED_VIBE2_HANDOFF':'EXACT_SOURCE_STATIC'}`);
  console.log('ROBLOX_BUILD_PREFLIGHT_PASS=NO');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{runCli();}catch(error){console.error(String(error?.stack||error));process.exitCode=1;}
}
