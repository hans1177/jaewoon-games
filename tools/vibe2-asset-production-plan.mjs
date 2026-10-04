// 파일명: tools/vibe2-asset-production-plan.mjs
// 역할: Vibe 게임 구현 작업이 필요한 에셋을 직접 제작/검증 자산 재사용/별도 authoring 요청 중에서 선택할 수 있도록 기계 계획을 만든다.
// 원칙: Vibe2/Vibe3가 게임 구현 주체다. 고정 라이선스/성능/QA 규칙은 학습이나 자동화가 우회하지 못한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { planAssetApplication } from '../assets/asset-selector.js';
import {createCreatureMotionSetProfile,buildAutomaticMotionGapFillPlan,applySemanticGapPreparation,createMotionDirectorPlan,createDuelCombatAuthoringRecipe,createSurvivalPlayerMotionProfile,createSurvivalWildlifeMotionProfile,deriveMotionStyleVariant,auditMotionContinuityTrace} from '../assets/vibe-motion-director.js';
import {createStudioAssetUniversePlan,DEFAULT_COVERAGE_BASELINES,createSurvivalWildlifeAssetProfile,synchronizeAssetCustomization,createAssetDetailReviewPlan,createAssetRuntimeVisualReviewPlan,auditCommonLibrarySystemDepth,createCompanySeedAssetIdeationPlan,buildInternalAssetLibraryAutomationPlan,INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT,INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES,INTERNAL_PROGRESSION_COMPLEXITY_PROFILES,resolveInternalAssetStyleExpressionProfile,INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS} from '../assets/vibe-studio-asset-universe.js';
import {createVibeReferenceImageStudyRequest,bindVibeReferenceImageObservation,createVibeMapDetailReconstruction} from '../assets/vibe-environment-director.js';
import {auditVibeRuntimeVisualEvidence,auditVibeRuntimeBeforeAfterComparison} from '../assets/vibe-visual-quality-gate.js';
import {VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT,createVibeNpcCustomizationPopulation} from '../assets/vibe-character-identity-director.js';

const clean=value=>String(value??'').trim();
const freeze=value=>Object.freeze(value);
const freezeList=value=>freeze([...(value||[])]);
const unique=value=>[...new Set((value||[]).map(clean).filter(Boolean))];


function runtimeVisualTargetPlatform(target=''){
  const value=clean(target).toUpperCase();
  return value==='ROBLOX'?'ROBLOX':value==='UNITY'?'UNITY':value==='WEB'?'WEB':'';
}
function runtimeVisualManifestFiles(root,max=32){
  const out=[],stack=[root];
  while(stack.length&&out.length<max){
    const current=stack.pop();
    let entries=[];
    try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){
        if(stack.length<128)stack.push(full);
      }else if(entry.isFile()&&entry.name==='asset-runtime-visual-evidence.json')out.push(full);
      if(out.length>=max)break;
    }
  }
  return out;
}
export function discoverRuntimeVisualEvidence({task={},target='',evidenceRoot=process.env.VIBE2_RUNTIME_VISUAL_EVIDENCE_ROOT||''}={}){
  const requestedRoot=clean(evidenceRoot);
  if(!requestedRoot)return null;
  let root;
  try{root=fs.realpathSync(requestedRoot);}catch{return null;}
  if(!fs.statSync(root).isDirectory())return null;
  const gameId=clean(task.gameId),sourceRoot=clean(task.sourceRoot).replaceAll('\\','/').replace(/^\.\//,'');
  const platform=runtimeVisualTargetPlatform(target||task.target);
  const currentSourceRevision=clean(task.sourceRevision||process.env.VIBE2_BASE_MAIN_SHA||process.env.GITHUB_SHA);
  if(!gameId||!platform||!/^[0-9a-f]{40}$/i.test(currentSourceRevision))return null;
  const captures=[],expectedSubjects=[],visualGoals=[],editableTargets=['SCENE'],evidenceProvenance=[];
  const seenCaptureIds=new Set(),seenSubjectIds=new Set();
  for(const file of runtimeVisualManifestFiles(root)){
    let manifest;
    try{manifest=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{continue;}
    const manifestSourceRoot=clean(manifest.sourceRoot).replaceAll('\\','/').replace(/^\.\//,'');
    if(Number(manifest.version)!==1||clean(manifest.gameId)!==gameId||clean(manifest.platform).toUpperCase()!==platform)continue;
    if(manifest.currentSourceCompatible!==true||clean(manifest.currentSourceRevision)!==currentSourceRevision)continue;
    if(sourceRoot&&manifestSourceRoot!==sourceRoot)continue;
    const manifestDir=path.dirname(file),surface=clean(manifest.surface).toUpperCase(),sceneId=clean(manifest.sceneId)||'runtime';
    if(!surface)continue;
    const producer=manifest.producer&&typeof manifest.producer==='object'?manifest.producer:{};
    let accepted=0;
    for(const [index,row] of (Array.isArray(manifest.captures)?manifest.captures:[]).entries()){
      const ref=clean(row?.imageRef),view=clean(row?.view||'GAME_CAMERA').toUpperCase();
      if(!ref||path.isAbsolute(ref)||ref.split(/[\\/]/).includes('..')||!view)continue;
      let image;
      try{image=fs.realpathSync(path.resolve(manifestDir,ref));}catch{continue;}
      if(image!==root&&!image.startsWith(root+path.sep))continue;
      let stat;try{stat=fs.statSync(image);}catch{continue;}
      if(!stat.isFile()||stat.size<=0||stat.size>20*1024*1024)continue;
      const viewport=row.viewport||{};
      if(!Number.isSafeInteger(viewport.width)||viewport.width<=0||!Number.isSafeInteger(viewport.height)||viewport.height<=0)continue;
      const baseId=clean(row.id)||[surface.toLowerCase(),view.toLowerCase(),index+1].join('-');
      const id=[clean(producer.workflowRunId||producer.runId||path.basename(path.dirname(file))),baseId].filter(Boolean).join(':');
      if(seenCaptureIds.has(id))continue;
      seenCaptureIds.add(id);accepted++;
      captures.push({
        id,platform,surface,view,sceneId:clean(row.sceneId)||sceneId,
        imageRef:path.relative(root,image).replaceAll('\\','/'),
        artifactHash:clean(row.artifactHash||row.sha256),
        sourceRevision:currentSourceRevision,
        captureSourceRevision:clean(manifest.sourceRevision),
        sourceCompatibility:'EXACT_SOURCE_ROOT_NO_DIFF',
        viewport:{width:Number(viewport.width),height:Number(viewport.height)},
        producer:{...producer,manifest:path.relative(root,file).replaceAll('\\','/')}
      });
    }
    if(!accepted)continue;
    for(const subject of Array.isArray(manifest.expectedSubjects)?manifest.expectedSubjects:[]){
      const id=clean(subject?.id||subject?.assetId||subject?.name);
      if(id&&!seenSubjectIds.has(id)){seenSubjectIds.add(id);expectedSubjects.push({...subject,id});}
    }
    visualGoals.push(...(Array.isArray(manifest.visualGoals)?manifest.visualGoals:[]));
    editableTargets.push(...(Array.isArray(manifest.editableTargets)?manifest.editableTargets:[]));
    evidenceProvenance.push({
      platform,surface,sourceRevision:clean(manifest.sourceRevision),currentSourceRevision,
      sourceCompatibility:'EXACT_SOURCE_ROOT_NO_DIFF',producer:{...producer},
      manifest:path.relative(root,file).replaceAll('\\','/')
    });
  }
  if(!captures.length)return null;
  return freeze({
    sourceRevision:currentSourceRevision,
    platforms:freezeList([platform]),
    requiredSurfaces:freezeList(unique(captures.map(row=>row.surface))),
    requiredViews:freezeList(unique(captures.map(row=>row.view))),
    captures:freezeList(captures),
    expectedSubjects:freezeList(expectedSubjects),
    visualGoals:freezeList(unique(visualGoals)),
    editableTargets:freezeList(unique(editableTargets)),
    evidenceRoot:root,
    evidenceProvenance:freezeList(evidenceProvenance),
    automaticallyBoundExistingRuntimeEvidence:true
  });
}

// 사용자 기본 GLB의 실제 JSON 청크를 검사한다. 파일 존재나 이름만으로 커마·리깅 가능을 가정하지 않는다.
export function inspectVibeSourceGlb({repoRoot=process.cwd(),source={}}={}){
  const relative=clean(source.path),issues=[];
  if(!relative||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..')||/^[a-z]+:/i.test(relative))return freeze({status:'SOURCE_GLB_REQUIRED',issues:['REPOSITORY_LOCAL_GLB_PATH_REQUIRED'],sourceMutationPerformed:false});
  let bytes,document,sourceHash;
  try{
    const root=fs.realpathSync(repoRoot),file=fs.realpathSync(path.resolve(root,relative));
    if(!file.startsWith(root+path.sep))throw new Error('SOURCE_OUTSIDE_REPOSITORY');
    if(!fs.statSync(file).isFile()||fs.statSync(file).size>256*1024*1024)throw new Error('GLB_SIZE_INVALID');
    bytes=fs.readFileSync(file);sourceHash=crypto.createHash('sha256').update(bytes).digest('hex');
    if(bytes.length<20||bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('GLB_HEADER_INVALID');
    let offset=12,jsonCount=0;
    while(offset<bytes.length){
      if(offset+8>bytes.length)throw new Error('GLB_CHUNK_TRUNCATED');
      const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8;
      if(length%4!==0||offset+length>bytes.length)throw new Error('GLB_CHUNK_LENGTH_INVALID');
      if(type===0x4e4f534a){jsonCount++;document=JSON.parse(bytes.subarray(offset,offset+length).toString('utf8'));}
      else if(!jsonCount)throw new Error('GLB_JSON_MUST_BE_FIRST');
      offset+=length;
    }
    if(jsonCount!==1||document?.asset?.version!=='2.0')throw new Error('GLB_JSON_INVALID');
    for(const key of ['meshes','materials','skins','animations','buffers','images','extensionsRequired'])if(document[key]!==undefined&&!Array.isArray(document[key]))throw new Error('GLB_COLLECTION_INVALID:'+key);
    if((document.meshes||[]).some(mesh=>!mesh||!Array.isArray(mesh.primitives)||mesh.primitives.some(primitive=>!primitive||typeof primitive.attributes!=='object'||primitive.attributes===null)))throw new Error('GLB_PRIMITIVE_INVALID');
    for(const key of ['materials','skins','animations','buffers','images'])if((document[key]||[]).some(row=>!row||typeof row!=='object'))throw new Error('GLB_ENTRY_INVALID:'+key);
    if(source.sourceHash&&source.sourceHash!==sourceHash)throw new Error('GLB_SOURCE_HASH_MISMATCH');
  }catch(error){return freeze({status:'SOURCE_GLB_REQUIRED',path:relative,issues:[error.code==='ENOENT'?'GLB_MATERIALIZATION_REQUIRED':error.message],sourceMutationPerformed:false});}
  const primitives=(document.meshes||[]).flatMap((mesh,meshIndex)=>(mesh.primitives||[]).map((primitive,primitiveIndex)=>({
    meshIndex,primitiveIndex,name:clean(mesh.name)||`mesh-${meshIndex}`,materialIndex:primitive.material??null,
    hasNormals:Number.isInteger(primitive.attributes?.NORMAL),hasUv:Number.isInteger(primitive.attributes?.TEXCOORD_0),
    hasJointWeights:Number.isInteger(primitive.attributes?.JOINTS_0)&&Number.isInteger(primitive.attributes?.WEIGHTS_0),
    morphTargetCount:Array.isArray(primitive.targets)?primitive.targets.length:0,
    declaredMorphNames:Array.isArray(mesh.extras?.targetNames)?mesh.extras.targetNames:[]
  })));
  if(!primitives.length)issues.push('MESH_AUTHORING_REQUIRED');
  if([...document.buffers||[],...document.images||[]].some(row=>row.uri&&!String(row.uri).startsWith('data:')))issues.push('EXTERNAL_RESOURCE_MATERIALIZATION_REQUIRED');
  const inventory={meshCount:(document.meshes||[]).length,primitives,materials:(document.materials||[]).map((material,index)=>({index,name:material.name||`material-${index}`,hasBaseColorTexture:Boolean(material.pbrMetallicRoughness?.baseColorTexture),hasNormalTexture:Boolean(material.normalTexture)})),skins:(document.skins||[]).map((skin,index)=>({index,name:skin.name||`skin-${index}`,jointCount:(skin.joints||[]).length})),animations:(document.animations||[]).map((animation,index)=>({index,name:animation.name||`animation-${index}`,channelCount:(animation.channels||[]).length})),requiredExtensions:document.extensionsRequired||[]};
  const requiredAuthoring=[];
  if(primitives.some(row=>!row.hasUv))requiredAuthoring.push('UV_UNWRAP_AND_TEXTURE_AUTHORING');
  if(primitives.some(row=>!row.hasNormals))requiredAuthoring.push('NORMALS_AND_SMOOTHING_REVIEW');
  if(!primitives.some(row=>row.morphTargetCount))requiredAuthoring.push('AUTHOR_MORPHS_WHEN_SHAPE_CUSTOMIZATION_NEEDED');
  if(!inventory.skins.length)requiredAuthoring.push('RIG_WHEN_ARTICULATION_NEEDED');
  if(!inventory.animations.length)requiredAuthoring.push('AUTHOR_ACTIONS_WHEN_MOTION_NEEDED');
  return freeze({status:issues.length?'AUTHORING_REQUIRED':'INSPECTED_RECONSTRUCTION_INPUT',path:relative,sourceHash,bytes:bytes.length,issues,inventory,requiredAuthoring,
    workflow:['PRESERVE_HASHED_ORIGINAL','INSPECT_SILHOUETTE_TOPOLOGY_AND_MATERIAL_BOUNDARIES','REUSE_BASE_AND_REBUILD_WEAK_FORMS','SCULPT_SECONDARY_ANATOMY_OR_CONSTRUCTION','CONFORM_PARTS_CLOTHING_AND_JOINTS','UV_BAKE_MATERIAL_SEPARATION_AND_CAUSAL_WEAR','RIG_MORPHS_EXPRESSIONS_AND_ACTION_POLISH','LOD_PLATFORM_VARIANTS_AND_REFERENCE_COMPARISON'],
    topologyAndDeformationStillNeedRenderedInspection:true,customizationBindingsMustUseActualNames:true,sourceMutationPerformed:false,generatedAsset:false,runtimeVerified:false});
}

const ROBLOX_EXISTING_ASSET_TYPE_RULES=Object.freeze([
  {types:['audio'],re:/(?:audio|sound|bgm|music|battle|boss|hit|skill|levelup|victory)/i},
  {types:['animation'],re:/(?:animation|anim|motion|idle|walk|run|attack|death)/i},
  {types:['character'],re:/(?:character|player|hero|npc|armor|outfit|avatar)/i},
  {types:['enemy'],re:/(?:enemy|monster|boss|creature|wolf|goblin|beast)/i},
  {types:['effect'],re:/(?:vfx|effect|particle|trail|beam|aura)/i},
  {types:['ui'],re:/(?:ui|hud|icon|button|panel)/i},
  {types:['item'],re:/(?:weapon|sword|spear|axe|hammer|bow|gun|staff|shield|item|tool)/i},
  {types:['prop','background'],re:/(?:nature|city|dungeon|portal|house|building|tree|rock|forest|village|environment|terrain|prop|decor)/i}
]);
function inferRobloxExistingAssetTypes(label=''){
  const value=clean(label);
  for(const rule of ROBLOX_EXISTING_ASSET_TYPE_RULES)if(rule.re.test(value))return rule.types;
  return[];
}
function walkRobloxSourceFiles(root){
  if(!fs.existsSync(root))return[];
  const out=[];
  const visit=dir=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())visit(full);
      else if(entry.isFile()&&/\.(?:lua|luau|json)$/i.test(entry.name))out.push(full);
    }
  };
  visit(root);
  return out;
}
export function discoverExistingRobloxGameAssets({repoRoot=process.cwd(),gameId=''}={}){
  const id=clean(gameId);
  if(!id)return freezeList([]);
  const root=path.join(repoRoot,'roblox-games',id);
  if(!fs.existsSync(root))return freezeList([]);
  const discovered=new Map();
  const add=(assetId,label,file)=>{
    const numeric=clean(assetId);
    const types=inferRobloxExistingAssetTypes(label);
    if(!/^\d{6,}$/.test(numeric)||!types.length)return;
    const relative=path.relative(repoRoot,file).replaceAll('\\','/');
    const key=`${numeric}|${types.join(',')}`;
    if(discovered.has(key))return;
    discovered.set(key,freeze({
      id:`same-game-roblox-${id}-${clean(label).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'asset'}-${numeric}`,
      name:clean(label)||`Roblox asset ${numeric}`,
      path:relative,
      types:freezeList(types),
      tags:freezeList(unique([clean(label),...types,'roblox','same-game-existing'])),
      license:'SAME_GAME_EXISTING_REFERENCE',
      source:relative,
      downloaded:true,
      platforms:freezeList(['roblox']),
      robloxAssetId:numeric,
      sameGameExistingRoblox:true,
      runtimeVerificationState:'SOURCE_BOUND_UNVERIFIED',
      verifiedCompanyReusable:false
    }));
  };
  for(const file of walkRobloxSourceFiles(root)){
    const text=fs.readFileSync(file,'utf8');
    for(const line of text.split(/\r?\n/)){
      for(const match of line.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*=\s*["']rbxassetid:\/\/(\d{6,})["']/g))add(match[2],match[1],file);
      for(const match of line.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*=\s*(\d{6,})\b/g))add(match[2],match[1],file);
    }
  }
  return freezeList([...discovered.values()]);
}
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
function normalizeAssetProductionTarget(value=''){
  const target=clean(value).toLowerCase();
  if(!target)return'';
  if(['roblox','로블록스'].includes(target))return'roblox';
  if(['unity','unity-android','android','유니티','안드로이드','apk'].includes(target))return'unity';
  if(['web','mobile-web','browser','웹','브라우저','unity-web','unity-web-validation'].includes(target))return'web';
  if(['uefn','fortnite','fortnite-uefn','포트나이트'].includes(target))return'fortnite-uefn';
  return target;
}
function resolveAssetProductionTarget({target='',task={},repoRoot=process.cwd()}={}){
  const explicit=normalizeAssetProductionTarget(target||task.target||task.targetPlatform||task.initialTargetPlatform);
  if(explicit)return freeze({target:explicit,source:'TASK_OR_CALLER',explicit:true});
  const roadmap=readJson(path.join(repoRoot,'company-learning','platform-release-roadmap.json'),{});
  const directive=readJson(path.join(repoRoot,'company-directive.json'),{});
  const configured=normalizeAssetProductionTarget(roadmap?.gameSeed?.initialTargetPlatform||directive?.gameSeed?.initialTargetPlatform||'ROBLOX');
  const resolved=['roblox','unity'].includes(configured)?configured:'roblox';
  return freeze({target:resolved,source:'CENTRAL_POLICY_INITIAL_NATIVE_TARGET',explicit:false});
}
const highEndVisualContract=repoRoot=>readJson(path.join(repoRoot,'company-learning','platform-release-roadmap.json'),{})?.assetProductionParallelContract?.highEndVisualProductionContract||{};
const companyGraphicsLibraryContract=repoRoot=>readJson(path.join(repoRoot,'company-learning','platform-release-roadmap.json'),{})?.assetProductionParallelContract?.companyGraphicsLibrary24h||{};

const COMMON_PACK_DOMAIN_BY_ID=freeze({
  'roblox-common-ui-v1':'UI',
  'roblox-common-items-v1':'ITEM',
  'roblox-common-tools-v1':'WEAPON',
  'roblox-common-character-gear-v1':'CHARACTER_GEAR',
  'roblox-common-skill-v1':'SKILL',
  'roblox-common-vfx-v1':'VFX',
  'roblox-common-motion-v1':'MOTION',
  'roblox-common-materials-v1':'MATERIAL',
  'roblox-common-environment-v1':'ENVIRONMENT',
  'roblox-common-building-v1':'BUILDING',
  'roblox-common-world-props-v1':'WORLD_PROP',
  'roblox-common-creature-parts-v1':'CREATURE',
  'roblox-common-foliage-v1':'FOLIAGE',
  'roblox-common-presentation-v1':'PRESENTATION'
});

function commonCatalogFiles(repoRoot){
  const root=path.join(repoRoot,'assets','roblox');
  let dirs=[];
  try{dirs=fs.readdirSync(root,{withFileTypes:true});}catch{return[];}
  return dirs
    .filter(entry=>entry.isDirectory()&&entry.name.startsWith('common-'))
    .map(entry=>path.join(root,entry.name,'catalog.json'))
    .filter(file=>fs.existsSync(file))
    .sort();
}

function companySeedRows(repoRoot){
  const root=path.join(repoRoot,'artbook-submissions');
  let dirs=[];
  try{dirs=fs.readdirSync(root,{withFileTypes:true});}catch{return[];}
  return dirs
    .filter(entry=>entry.isDirectory()&&entry.name.startsWith('seed-'))
    .map(entry=>({name:entry.name,file:path.join(root,entry.name,'current.json')}))
    .filter(row=>fs.existsSync(row.file))
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(row=>{
      const value=readJson(row.file,{});
      return{
        gameId:value.gameId||row.name,
        gameName:value.gameName||value.designCore?.identity||value.content?.identity,
        identity:value.designCore?.identity||value.content?.identity,
        genre:value.genre||value.designCore?.genre||value.content?.genre,
        coreFun:value.designCore?.coreFun,
        coreLoop:value.designCore?.coreLoop||value.content?.coreLoop||[],
        signatureSystems:value.designCore?.signatureSystems||value.content?.signatureSystems||[],
        progressionDirection:value.designCore?.progressionDirection||value.content?.progressionDirection,
        visualDirection:value.designCore?.visualDirection||value.content?.visualDirection,
        mobileUx:value.designCore?.mobileUx
      };
    });
}

const commonCatalogRows=catalog=>Array.isArray(catalog?.atoms)?{key:'atoms',rows:catalog.atoms}:
  Array.isArray(catalog?.items)?{key:'items',rows:catalog.items}:{key:'',rows:[]};
const catalogIdentity=row=>clean(row?.atomId||row?.assetId);
const catalogSlug=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

function inferRegistryIdPrefix(packId,registryRows=[]){
  const counts=new Map();
  for(const row of registryRows){
    const identity=clean(row?.atomId||row?.assetId);
    const slug=catalogSlug(identity);
    if(!slug||!clean(row?.id).endsWith(slug))continue;
    const prefix=clean(row.id).slice(0,-slug.length);
    counts.set(prefix,(counts.get(prefix)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||
    clean(packId).replace(/-v\d+$/,'')+'-';
}

function registryRowTags(row={},catalogRow={}){
  return unique([
    ...(Array.isArray(row.tags)?row.tags:[]),
    catalogRow.atomId,catalogRow.assetId,catalogRow.subfamily,catalogRow.role,catalogRow.systemRole,
    catalogRow.itemRole,catalogRow.toolRole,catalogRow.gearRole,catalogRow.creatureRole,
    catalogRow.environmentRole,catalogRow.buildingRole,catalogRow.worldRole,catalogRow.familyRootId,
    ...(Array.isArray(catalogRow.systemRoles)?catalogRow.systemRoles:[]),
    ...(Array.isArray(catalogRow.presentationRoles)?catalogRow.presentationRoles:[])
  ]);
}

function synchronizeCatalogRows({registry,catalog}){
  const packId=clean(catalog.packId);
  const pack=registry.assets.find(row=>row.id===packId);
  if(!pack)return{packId,changed:false,count:0,rowIds:[]};
  const {key,rows}=commonCatalogRows(catalog);
  const currentRows=registry.assets.filter(row=>row.packId===packId&&row.id!==packId);
  const prefix=inferRegistryIdPrefix(packId,currentRows);
  const template=currentRows.find(row=>catalogIdentity(row))||currentRows[0]||pack;
  const activeIds=new Set();
  const rowIds=[];

  for(const catalogRow of rows){
    const identity=catalogIdentity(catalogRow);
    if(!identity)continue;
    const slug=catalogSlug(identity);
    const id=prefix+slug;
    activeIds.add(id);rowIds.push(id);
    let row=registry.assets.find(asset=>asset.id===id);
    if(!row){
      row=JSON.parse(JSON.stringify(template));
      row.id=id;
      registry.assets.push(row);
    }
    row.packId=packId;
    row.catalogActive=true;
    row.catalogState='ACTIVE';
    row.catalogVersion=catalog.version;
    row.title=clean(catalogRow.name)||('Roblox 공용 '+identity);
    row.category=row.category||catalog.family;
    row.family=row.family||catalog.family;
    row.platform=row.platform||catalog.platform||'ROBLOX';
    row.productionVerified=row.productionVerified===true;
    row.verifiedCompanyReusable=row.verifiedCompanyReusable===true;
    row.runtimeVerificationState=row.productionVerified===true?row.runtimeVerificationState||'VERIFIED':row.runtimeVerificationState||'PENDING_STUDIO';

    for(const [field,value] of Object.entries(catalogRow)){
      if(field==='source')continue;
      row[field]=Array.isArray(value)?[...value]:value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
    }
    row.tags=registryRowTags(row,catalogRow);
    const hint={...(row.bindingHint||{})};
    hint.gameScope=hint.gameScope||'ALL_ROBLOX_GAMES';
    hint.family=row.family;
    for(const field of ['atomId','assetId','subfamily','factory','role','systemRole','itemRole','toolRole','gearRole','creatureRole','environmentRole','buildingRole','worldRole','familyRootId']){
      if(row[field]!=null)hint[field]=row[field];
    }
    if(Array.isArray(row.systemRoles))hint.systemRoles=[...row.systemRoles];
    row.bindingHint=hint;
  }

  for(const row of currentRows){
    if(catalogIdentity(row)&&!activeIds.has(row.id)){
      row.catalogActive=false;
      row.catalogState='STALE_CATALOG_ROW_REVIEW';
      row.automaticDeletionForbidden=true;
    }
  }

  const count=rows.length;
  if(catalog.title)pack.title=catalog.title;
  pack.catalogVersion=catalog.version;
  pack.catalogRowKey=key||null;
  pack.catalogRowCount=count;
  if(key==='items'){
    pack.itemCount=count;
    if('assetCount' in pack)pack.assetCount=count;
  }else if(key==='atoms'){
    if('motionCount' in pack)pack.motionCount=count;
    if('componentCount' in pack)pack.componentCount=count;
    if('assetCount' in pack||!('motionCount' in pack)&&!('componentCount' in pack))pack.assetCount=count;
    if('registryAtomCount' in pack)pack.registryAtomCount=count;
  }
  if(Number.isFinite(Number(catalog.recipeCount)))pack.recipeCount=Number(catalog.recipeCount);
  if(Array.isArray(catalog.terrainCompositions))pack.terrainCompositionCount=catalog.terrainCompositions.length;
  if(Array.isArray(catalog.biomes))pack.biomeCount=catalog.biomes.length;
  if(Array.isArray(catalog.environmentStateContract?.states))pack.environmentStateCount=catalog.environmentStateContract.states.length;
  if(Array.isArray(catalog.backgroundCompositionContract?.layers))pack.backgroundDepthLayerCount=catalog.backgroundCompositionContract.layers.length;
  if(Number.isFinite(Number(catalog.vectorIconCount)))pack.vectorIconCount=Number(catalog.vectorIconCount);
  for(const [field,value] of Object.entries(catalog.deepSystemContract||{})){
    if(field!=='componentCount'&&/ComponentCount$/.test(field)&&Number.isFinite(Number(value)))pack[field]=Number(value);
  }
  if(!key){
    const declared=unique([
      ...(catalog.systemDepthContract?.currentDeclaredComponents||[]),
      ...(catalog.loadingElements||[]),
      ...(catalog.introModes||[])
    ]);
    if(declared.length)pack.presentationComponentCount=declared.length;
  }
  return{packId,count,rowIds,key};
}

function catalogFingerprint(catalogs=[]){
  return crypto.createHash('sha256').update(JSON.stringify(catalogs.map(row=>({
    path:row.path,packId:row.catalog.packId,version:row.catalog.version,title:row.catalog.title,
    rows:commonCatalogRows(row.catalog).rows,
    systemDepthContract:row.catalog.systemDepthContract,
    recipeCount:row.catalog.recipeCount,
    terrainCompositions:row.catalog.terrainCompositions,
    environmentStateContract:row.catalog.environmentStateContract
  })))).digest('hex');
}

function collectCommonCatalogAudioRoles(catalogRows=[]){
  const roles=new Set();
  const add=value=>{
    if(Array.isArray(value)){for(const item of value)add(item);return;}
    if(typeof value==='string'&&clean(value))roles.add(clean(value).toUpperCase());
  };
  const walk=value=>{
    if(Array.isArray(value)){for(const item of value)walk(item);return;}
    if(!value||typeof value!=='object')return;
    for(const [key,child] of Object.entries(value)){
      if(/(?:audio|sound).*role|role.*(?:audio|sound)/i.test(key))add(child);
      if(child&&typeof child==='object')walk(child);
    }
  };
  for(const row of catalogRows||[]){
    const catalog=row?.catalog||row||{};
    for(const group of Object.values(catalog?.ambientSoundscapeContract?.sourceGroups||{}))add(group);
    for(const group of Object.values(catalog?.ambientSoundscapeContract?.biomeSoundscapes||{}))add(group);
    walk(catalog);
  }
  return [...roles].sort();
}

export function synchronizeCompanyCommonAssetRegistry({repoRoot=process.cwd(),registry=null,persist=true}={}){
  const registryPath=path.join(repoRoot,'company-asset-library.json');
  const original=registry||readJson(registryPath,{version:0,assets:[],externalSources:[]});
  const next=JSON.parse(JSON.stringify(original));
  next.assets=Array.isArray(next.assets)?next.assets:[];
  const catalogs=commonCatalogFiles(repoRoot).map(file=>({path:path.relative(repoRoot,file).replaceAll('\\','/'),catalog:readJson(file,{})})).filter(row=>row.catalog?.packId);
  const fingerprint=catalogFingerprint(catalogs);
  const syncRows=catalogs.map(row=>synchronizeCatalogRows({registry:next,catalog:row.catalog}));
  const licenseBlockedForSync=asset=>{
    const value=clean(asset?.license||asset?.policy),lower=value.toLowerCase();
    return !value||/(?:^|[^a-z0-9])nc(?:[^a-z0-9]|$)/i.test(value)||lower.includes('unknown')||lower.includes('출처 불명')||lower.includes('재배포 제한');
  };
  const normalizeRepoPath=value=>clean(value).replaceAll('\\','/').split('/').filter(Boolean).join('/');
  const missingRepositoryAssetIds=[];
  const sourcePathGroups=new Map();
  const repositoryPathExistsCache=new Map();
  const repositoryPathExists=relative=>{
    if(!relative)return false;
    if(!repositoryPathExistsCache.has(relative))repositoryPathExistsCache.set(relative,fs.existsSync(path.join(repoRoot,relative)));
    return repositoryPathExistsCache.get(relative)===true;
  };
  let repositoryPathPresentCount=0;
  let automaticSearchEligibleCount=0;
  for(const asset of next.assets){
    const relative=normalizeRepoPath(asset?.path);
    if(relative){
      if(!sourcePathGroups.has(relative))sourcePathGroups.set(relative,[]);
      sourcePathGroups.get(relative).push(clean(asset?.id));
    }
    const exists=repositoryPathExists(relative);
    if(!exists){
      if(clean(asset?.id))missingRepositoryAssetIds.push(clean(asset.id));
      continue;
    }
    repositoryPathPresentCount++;
    const searchEligible=asset?.catalogActive!==false&&asset?.referenceOnly!==true&&!licenseBlockedForSync(asset);
    if(searchEligible)automaticSearchEligibleCount++;
  }

  const consumptionByAssetId=new Map();
  const libraryModuleConsumptionByPath=new Map();
  const addConsumption=(assetId,gameId,kind,sourcePath)=>{
    const id=clean(assetId),game=clean(gameId);
    if(!id||!game)return;
    if(!consumptionByAssetId.has(id))consumptionByAssetId.set(id,new Map());
    const byGame=consumptionByAssetId.get(id);
    if(!byGame.has(game))byGame.set(game,new Set());
    byGame.get(game).add([kind,sourcePath].filter(Boolean).join(':'));
  };
  const addLibraryModuleConsumption=(assetPath,gameId,kind,sourcePath)=>{
    const p=clean(assetPath),game=clean(gameId);
    if(!p||!game)return;
    if(!libraryModuleConsumptionByPath.has(p))libraryModuleConsumptionByPath.set(p,new Map());
    const byGame=libraryModuleConsumptionByPath.get(p);
    if(!byGame.has(game))byGame.set(game,new Set());
    byGame.get(game).add([kind,sourcePath].filter(Boolean).join(':'));
  };
  const gameRoots=['roblox-games','unity-games','web-games','godot-games'];
  const sourceExt=/\.(?:lua|luau|js|mjs|cjs|ts|tsx|jsx|html|css|gd|tscn|cs|uxml|uss|shader)$/i;
  const assetIds=unique(next.assets.map(asset=>clean(asset?.id)).filter(id=>id.length>=4)).sort((a,b)=>b.length-a.length||a.localeCompare(b));
  const regexSpecialChars='\\^$.*+?()[]{}|';
  const escapeRegex=value=>String(value).split('').map(ch=>regexSpecialChars.includes(ch)?'\\'+ch:ch).join('');
  const exactTokenMatcher=tokens=>{
    const values=unique(tokens).filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b));
    return values.length?new RegExp('(?:^|[^A-Za-z0-9_.:-])('+values.map(escapeRegex).join('|')+')(?=$|[^A-Za-z0-9_.:-])','g'):null;
  };
  const exactTokenMatches=(content,matcher)=>{
    const out=new Set();
    if(!matcher)return out;
    matcher.lastIndex=0;
    for(const match of content.matchAll(matcher))if(match[1])out.add(match[1]);
    return out;
  };
  const assetIdMatcher=exactTokenMatcher(assetIds);
  const assetPathRows=next.assets.map(asset=>({id:clean(asset?.id),path:normalizeRepoPath(asset?.path)})).filter(row=>row.id&&row.path);
  const moduleSourceExtensions=new Set(['.lua','.luau','.js','.mjs','.cjs','.ts','.tsx','.jsx','.gd','.cs']);
  const moduleTokenPaths=new Map();
  let skippedNonModulePathCount=0;
  for(const assetPath of sourcePathGroups.keys()){
    const extension=path.extname(assetPath).toLowerCase();
    if(!moduleSourceExtensions.has(extension)){skippedNonModulePathCount++;continue;}
    const moduleToken=path.basename(assetPath,extension);
    if(moduleToken.length<4){skippedNonModulePathCount++;continue;}
    if(!moduleTokenPaths.has(moduleToken))moduleTokenPaths.set(moduleToken,[]);
    moduleTokenPaths.get(moduleToken).push(assetPath);
  }
  const moduleTokens=[...moduleTokenPaths.keys()].sort((a,b)=>b.length-a.length||a.localeCompare(b));
  const moduleTokenMatcher=exactTokenMatcher(moduleTokens);
  let sourceFilesScanned=0,sourceBytesScanned=0;
  for(const gameRootName of gameRoots){
    const gameRoot=path.join(repoRoot,gameRootName);
    let gameDirs=[];
    try{gameDirs=fs.readdirSync(gameRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory());}catch{continue;}
    for(const gameDirEntry of gameDirs){
      const gameId=gameDirEntry.name;
      const gameDir=path.join(gameRoot,gameId);
      const projectFile=path.join(gameDir,'default.project.json');
      if(fs.existsSync(projectFile)){
        try{
          const project=JSON.parse(fs.readFileSync(projectFile,'utf8'));
          const mapped=[];
          const walkProject=value=>{
            if(Array.isArray(value)){for(const item of value)walkProject(item);return;}
            if(!value||typeof value!=='object')return;
            for(const [key,child] of Object.entries(value)){
              if(key==='$path'&&typeof child==='string'){
                const absolute=path.resolve(path.dirname(projectFile),child);
                const relative=path.relative(repoRoot,absolute).replaceAll('\\','/');
                if(relative&&!relative.startsWith('..'))mapped.push(relative);
              }else if(child&&typeof child==='object')walkProject(child);
            }
          };
          walkProject(project);
          for(const row of assetPathRows){
            if(mapped.some(mappedPath=>row.path===mappedPath||row.path.startsWith(mappedPath+'/')))addConsumption(row.id,gameId,'PROJECT_PATH_BINDING','default.project.json');
          }
        }catch{}
      }
      const stack=[gameDir];
      while(stack.length){
        const current=stack.pop();
        let entries=[];
        try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}
        for(const entry of entries){
          const full=path.join(current,entry.name);
          if(entry.isDirectory()){stack.push(full);continue;}
          if(!entry.isFile()||!sourceExt.test(entry.name))continue;
          let stat=null;
          try{stat=fs.statSync(full);}catch{continue;}
          if(!stat||stat.size>2_000_000)continue;
          let content='';
          try{content=fs.readFileSync(full,'utf8');}catch{continue;}
          if(!content)continue;
          sourceFilesScanned++;
          sourceBytesScanned+=Buffer.byteLength(content,'utf8');
          const relativeSource=path.relative(repoRoot,full).replaceAll('\\','/');
          for(const assetId of exactTokenMatches(content,assetIdMatcher))addConsumption(assetId,gameId,'SOURCE_ID_MARKER',relativeSource);
          for(const moduleToken of exactTokenMatches(content,moduleTokenMatcher)){
            for(const assetPath of moduleTokenPaths.get(moduleToken)||[])addLibraryModuleConsumption(assetPath,gameId,'SOURCE_MODULE_MARKER',relativeSource);
          }
        }
      }
    }
  }
  const detectedConsumerGameIds=new Set();
  let sourceConsumerBindingCount=0;
  const exactAssetConsumption=[...consumptionByAssetId.entries()].map(([assetId,byGame])=>{
    const gameIds=[...byGame.keys()].sort();
    for(const gameId of gameIds)detectedConsumerGameIds.add(gameId);
    sourceConsumerBindingCount+=gameIds.length;
    return Object.freeze({
      assetId,
      gameIds:Object.freeze(gameIds),
      evidence:Object.freeze(gameIds.map(gameId=>Object.freeze({gameId,evidence:Object.freeze([...byGame.get(gameId)].sort())})))
    });
  }).sort((a,b)=>b.gameIds.length-a.gameIds.length||a.assetId.localeCompare(b.assetId));
  const sourceConsumerAssetCount=exactAssetConsumption.length;
  const libraryModuleConsumerGameIds=new Set();
  let libraryModuleConsumerPathCount=0,libraryModuleConsumerBindingCount=0;
  const libraryModuleConsumption=[...libraryModuleConsumptionByPath.entries()].map(([assetPath,byGame])=>{
    libraryModuleConsumerPathCount++;
    const gameIds=[...byGame.keys()].sort();
    for(const gameId of gameIds)libraryModuleConsumerGameIds.add(gameId);
    libraryModuleConsumerBindingCount+=gameIds.length;
    return Object.freeze({assetPath,assetRowCount:(sourcePathGroups.get(assetPath)||[]).length,gameIds:Object.freeze(gameIds),evidence:Object.freeze(gameIds.map(gameId=>Object.freeze({gameId,evidence:Object.freeze([...byGame.get(gameId)].sort())})))});
  }).sort((a,b)=>b.gameIds.length-a.gameIds.length||a.assetPath.localeCompare(b.assetPath));
  const repositoryAssetSync={
    version:2,
    totalAssetRows:next.assets.length,
    repositoryPathPresentCount,
    missingRepositoryPathCount:missingRepositoryAssetIds.length,
    missingRepositoryAssetIds:Object.freeze([...missingRepositoryAssetIds].sort()),
    automaticSearchEligibleCount,
    uniqueRepositoryPathCount:repositoryPathExistsCache.size,
    repositoryPathExistenceCheckCount:repositoryPathExistsCache.size,
    sharedSourcePathGroupCount:[...sourcePathGroups.values()].filter(ids=>ids.length>1).length,
    sharedSourcePathRowsAreNotAutomaticDuplicates:true,
    assetIdMatcherMode:'COMPILED_BOUNDARY_EXACT_TOKEN_REGEX',
    assetIdMatcherTokenCount:assetIds.length,
    moduleMatcherMode:'COMPILED_BOUNDARY_EXACT_MODULE_TOKEN_REGEX',
    moduleMatcherTokenCount:moduleTokens.length,
    moduleCandidatePathCount:[...moduleTokenPaths.values()].reduce((sum,paths)=>sum+paths.length,0),
    skippedNonModulePathCount,
    sourceFilesScanned,
    sourceBytesScanned,
    sourceConsumerAssetCount,
    sourceConsumerBindingCount,
    sourceConsumerGameIds:Object.freeze([...detectedConsumerGameIds].sort()),
    exactAssetConsumption:Object.freeze(exactAssetConsumption.slice(0,192)),
    exactAssetConsumptionIsRuntimeVerification:false,
    libraryModuleConsumerPathCount,
    libraryModuleConsumerBindingCount,
    libraryModuleConsumerGameIds:Object.freeze([...libraryModuleConsumerGameIds].sort()),
    libraryModuleConsumption:Object.freeze(libraryModuleConsumption.slice(0,96)),
    sourceConsumptionEvidenceMode:'EXACT_ASSET_ID_SOURCE_MARKER_OR_EXACT_PROJECT_PATH_BINDING_PLUS_LIBRARY_MODULE_MARKER',
    exactAssetConsumptionSeparatedFromModuleConsumption:true,
    sourceConsumptionDoesNotPromoteProductionVerification:true
  };
  const synchronizedCount=(packId,fallback=0)=>{
    const row=syncRows.find(item=>item.packId===packId);
    return row?Number(row.count||0):Number(fallback||0);
  };
  const seeds=companySeedRows(repoRoot);
  const seedPlan=createCompanySeedAssetIdeationPlan({seeds,assets:next.assets});
  const uiCatalog=catalogs.find(row=>row.catalog.packId==='roblox-common-ui-v1')?.catalog||{};
  const audioRoleIds=collectCommonCatalogAudioRoles(catalogs);
  const previousMaintenance=original?.internalAssetLibraryAutomation?.maintenance||null;
  const libraryPlan=buildInternalAssetLibraryAutomationPlan({
    assets:next.assets,
    seedPlan,
    uiAtomIds:(uiCatalog.atoms||[]).map(row=>row.atomId),
    audioRoleIds,
    externalSources:next.externalSources||[],
    previousMaintenance
  });
  const transientMaintenanceReasons=new Set(['INVENTORY_CHANGED','TYPE_OR_ROLE_CHANGED','QUALITY_METADATA_CHANGED']);
  const maintenanceChanged=Boolean(previousMaintenance?.inventoryFingerprint)
    &&(
      previousMaintenance.inventoryFingerprint!==libraryPlan.maintenance.inventoryFingerprint
      ||previousMaintenance.typeRoleFingerprint!==libraryPlan.maintenance.typeRoleFingerprint
      ||previousMaintenance.qualityFingerprint!==libraryPlan.maintenance.qualityFingerprint
    );
  const maintenanceBaseline=!previousMaintenance?.inventoryFingerprint;
  const currentTransientReasons=(libraryPlan.maintenance.refreshReasons||[]).filter(reason=>transientMaintenanceReasons.has(reason));
  const currentPersistentReasons=(libraryPlan.maintenance.refreshReasons||[]).filter(reason=>!transientMaintenanceReasons.has(reason)&&reason!=='MAINTENANCE_BASELINE_INITIALIZED');
  const lastChangeReasons=maintenanceChanged
    ?currentTransientReasons
    :(Array.isArray(previousMaintenance?.lastChangeReasons)?previousMaintenance.lastChangeReasons:(maintenanceBaseline?['MAINTENANCE_BASELINE_INITIALIZED']:[]));
  const lastNewTypeRoleTokens=maintenanceChanged
    ?[...(libraryPlan.maintenance.newTypeRoleTokens||[])]
    :[...(previousMaintenance?.lastNewTypeRoleTokens||[])];
  const lastRemovedTypeRoleTokens=maintenanceChanged
    ?[...(libraryPlan.maintenance.removedTypeRoleTokens||[])]
    :[...(previousMaintenance?.lastRemovedTypeRoleTokens||[])];
  const maintenanceState={
    ...libraryPlan.maintenance,
    newTypeRoleTokens:[],
    removedTypeRoleTokens:[],
    refreshRequired:currentPersistentReasons.length>0,
    refreshReasons:currentPersistentReasons,
    lastChangeReasons,
    lastNewTypeRoleTokens,
    lastRemovedTypeRoleTokens,
    lastChangeFingerprint:maintenanceChanged||maintenanceBaseline
      ?libraryPlan.maintenance.inventoryFingerprint
      :clean(previousMaintenance?.lastChangeFingerprint)||libraryPlan.maintenance.inventoryFingerprint,
    catalogFingerprint:fingerprint,
    catalogChanged:Boolean(previousMaintenance?.catalogFingerprint)&&previousMaintenance.catalogFingerprint!==fingerprint,
    synchronizedRegistryVersion:Number(original?.version||0)
  };
  const depth=auditCommonLibrarySystemDepth({assets:next.assets});
  const volumeByDomain=new Map(libraryPlan.domains.map(row=>[row.domain,row]));
  const environmentCatalog=catalogs.find(row=>row.catalog.packId==='roblox-common-environment-v1')?.catalog||{};

  if(next.internalAssetCompositionContract){
    const prior=next.internalAssetCompositionContract;
    next.internalAssetCompositionContract={
      ...prior,
      uiComponentCount:synchronizedCount('roblox-common-ui-v1',prior.uiComponentCount),
      uiRegistryAtomCount:synchronizedCount('roblox-common-ui-v1',prior.uiRegistryAtomCount),
      motionAtomCount:synchronizedCount('roblox-common-motion-v1',prior.motionAtomCount),
      worldPropCount:synchronizedCount('roblox-common-world-props-v1',prior.worldPropCount),
      itemCount:synchronizedCount('roblox-common-items-v1',prior.itemCount),
      toolCount:synchronizedCount('roblox-common-tools-v1',prior.toolCount),
      creaturePartCount:synchronizedCount('roblox-common-creature-parts-v1',prior.creaturePartCount),
      vfxAtomCount:synchronizedCount('roblox-common-vfx-v1',prior.vfxAtomCount),
      materialAtomCount:synchronizedCount('roblox-common-materials-v1',prior.materialAtomCount),
      environmentTerrainCompositionCount:Array.isArray(environmentCatalog.terrainCompositions)?environmentCatalog.terrainCompositions.length:Number(prior.environmentTerrainCompositionCount||0),
      environmentBackgroundDepthLayers:Array.isArray(environmentCatalog.backgroundCompositionContract?.layers)?environmentCatalog.backgroundCompositionContract.layers.length:Number(prior.environmentBackgroundDepthLayers||0),
      environmentStateCount:Array.isArray(environmentCatalog.environmentStateContract?.states)?environmentCatalog.environmentStateContract.states.length:Number(prior.environmentStateCount||0)
    };
  }

  next.companyCommonSeedAssetIdeation={
    ...(next.companyCommonSeedAssetIdeation||{}),
    version:Math.max(1,Number(next.companyCommonSeedAssetIdeation?.version)||1),
    status:'ACTIVE_MACHINE_READABLE_INTERNAL_ASSET_IDEATION',
    scope:'ALL_COMPANY_COMMON_SEEDS',
    sourcePattern:'artbook-submissions/seed-*/current.json',
    currentSeedCount:seedPlan.seedCount,
    currentSeedIds:seedPlan.seeds.map(row=>row.gameId),
    planBuilder:'assets/vibe-studio-asset-universe.js#createCompanySeedAssetIdeationPlan'
  };

  const priorRows=new Map((next.commonLibrarySystemDepthAudit?.rows||[]).map(row=>[row.domain,row]));
  next.commonLibrarySystemDepthAudit={
    ...(next.commonLibrarySystemDepthAudit||{}),
    status:'EXPANDED',
    scoreIsUsageGate:false,
    existingAssetsRemainUsable:true,
    rows:depth.rows.map(row=>{
      const prior=priorRows.get(row.domain)||{};
      const volume=volumeByDomain.get(row.domain)||{};
      return{
        ...prior,
        domain:row.domain,
        currentCount:Number(volume.currentCount||row.candidateCount||0),
        requiredComponentCount:row.requiredCount,
        priorityGaps:row.domain==='AUDIO'?[...(volume.missingDepthRoles||[])]:[...row.missing],
        state:(row.domain==='AUDIO'?(volume.missingDepthRoles||[]):row.missing).length?'GAP_FILL_REQUIRED':'BASE_COVERAGE_COMPLETE'
      };
    })
  };

  const managementBottlenecks=[];
  if(repositoryAssetSync.missingRepositoryPathCount>0)managementBottlenecks.push({
    id:'MISSING_REPOSITORY_PATHS',
    severity:'HIGH',
    count:repositoryAssetSync.missingRepositoryPathCount,
    action:'REPAIR_ASSET_PATH_METADATA_OR_MATERIALIZE_SOURCE'
  });
  if(repositoryAssetSync.automaticSearchEligibleCount===0&&repositoryAssetSync.totalAssetRows>0)managementBottlenecks.push({
    id:'NO_AUTOMATIC_SEARCH_ELIGIBLE_ASSETS',
    severity:'CRITICAL',
    count:repositoryAssetSync.totalAssetRows,
    action:'REPAIR_SEARCH_ELIGIBILITY_METADATA'
  });
  if(repositoryAssetSync.sourceConsumerAssetCount===0&&repositoryAssetSync.libraryModuleConsumerPathCount===0&&repositoryAssetSync.automaticSearchEligibleCount>0)managementBottlenecks.push({
    id:'NO_DETECTED_SOURCE_OR_MODULE_CONSUMPTION',
    severity:'HIGH',
    count:repositoryAssetSync.automaticSearchEligibleCount,
    action:'BIND_SEARCHABLE_LIBRARY_ASSETS_IN_EXISTING_GAME_RESPONSIBILITIES'
  });
  else if(repositoryAssetSync.sourceConsumerAssetCount===0&&repositoryAssetSync.libraryModuleConsumerPathCount>0)managementBottlenecks.push({
    id:'MODULE_CONSUMPTION_WITHOUT_EXACT_ASSET_MARKERS',
    severity:'MEDIUM',
    count:repositoryAssetSync.libraryModuleConsumerPathCount,
    action:'IMPROVE_EXACT_ASSET_ID_BINDING_EVIDENCE_WHERE_PRACTICAL'
  });
  if((libraryPlan.volumeHealth?.totalDeficit||0)>0)managementBottlenecks.push({
    id:'VOLUME_DEFICIT',
    severity:'MEDIUM',
    count:Number(libraryPlan.volumeHealth.totalDeficit||0),
    action:'CONSUME_PRIORITY_VOLUME_WORKLIST'
  });
  if((libraryPlan.qualityHealth?.unscoredAssetCount||0)>0)managementBottlenecks.push({
    id:'QUALITY_EVIDENCE_GAP',
    severity:'MEDIUM',
    count:Number(libraryPlan.qualityHealth.unscoredAssetCount||0),
    action:'AUDIT_EXISTING_ASSETS_WITH_CURRENT_INTERNAL_1000_CONTRACT'
  });
  if((libraryPlan.qualityHealth?.below880Count||0)>0)managementBottlenecks.push({
    id:'QUALITY_BELOW_INTERNAL_PASS',
    severity:'MEDIUM',
    count:Number(libraryPlan.qualityHealth.below880Count||0),
    action:'IMPROVE_WEAKEST_INTERNAL_AUDIT_AXIS'
  });
  const assetManagementHealth={
    version:1,
    status:managementBottlenecks.some(row=>row.severity==='CRITICAL')?'CRITICAL_REPAIR_REQUIRED':
      managementBottlenecks.some(row=>row.severity==='HIGH')?'BOTTLENECK_REPAIR_REQUIRED':
      libraryPlan.volumeReady?'QUALITY_MANAGEMENT':'VOLUME_MANAGEMENT',
    volume:libraryPlan.volumeHealth,
    quality:libraryPlan.qualityHealth,
    searchAndConsumption:{
      totalAssetRows:repositoryAssetSync.totalAssetRows,
      repositoryPathPresentCount:repositoryAssetSync.repositoryPathPresentCount,
      missingRepositoryPathCount:repositoryAssetSync.missingRepositoryPathCount,
      automaticSearchEligibleCount:repositoryAssetSync.automaticSearchEligibleCount,
      automaticSearchEligiblePercent:repositoryAssetSync.totalAssetRows>0
        ?Math.round((repositoryAssetSync.automaticSearchEligibleCount/repositoryAssetSync.totalAssetRows)*1000)/10:0,
      sourceConsumerAssetCount:repositoryAssetSync.sourceConsumerAssetCount,
      sourceConsumerBindingCount:repositoryAssetSync.sourceConsumerBindingCount,
      sourceConsumerGameCount:(repositoryAssetSync.sourceConsumerGameIds||[]).length,
      sourceConsumerGameIds:repositoryAssetSync.sourceConsumerGameIds,
      libraryModuleConsumerPathCount:repositoryAssetSync.libraryModuleConsumerPathCount,
      libraryModuleConsumerBindingCount:repositoryAssetSync.libraryModuleConsumerBindingCount,
      libraryModuleConsumerGameCount:(repositoryAssetSync.libraryModuleConsumerGameIds||[]).length,
      libraryModuleConsumerGameIds:repositoryAssetSync.libraryModuleConsumerGameIds,
      uniqueRepositoryPathCount:repositoryAssetSync.uniqueRepositoryPathCount,
      sourceFilesScanned:repositoryAssetSync.sourceFilesScanned,
      sourceBytesScanned:repositoryAssetSync.sourceBytesScanned,
      assetIdMatcherMode:repositoryAssetSync.assetIdMatcherMode,
      moduleMatcherMode:repositoryAssetSync.moduleMatcherMode,
      moduleMatcherTokenCount:repositoryAssetSync.moduleMatcherTokenCount,
      moduleCandidatePathCount:repositoryAssetSync.moduleCandidatePathCount,
      skippedNonModulePathCount:repositoryAssetSync.skippedNonModulePathCount,
      sourceConsumptionEvidenceMode:repositoryAssetSync.sourceConsumptionEvidenceMode,
      sourceConsumptionDoesNotPromoteProductionVerification:true
    },
    bottlenecks:managementBottlenecks,
    highestPriorityBottleneck:managementBottlenecks[0]||null,
    nextAction:libraryPlan.autonomousNextAction,
    continueWithoutHuman:true,
    continueWithoutChatgpt:true,
    existingAssetDevelopmentLaneOnly:true,
    newWorkflowSchedulerQueuePipelineForbidden:true
  };

  next.internalAssetLibraryAutomation={
    ...(next.internalAssetLibraryAutomation||{}),
    version:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.version,
    contract:'assets/vibe-studio-asset-universe.js#INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT',
    catalogDiscovery:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.catalogDiscovery,
    countPolicy:libraryPlan.countPolicy,
    hardMaximum:null,
    overSoftLimitAction:libraryPlan.overSoftLimitAction,
    overSoftLimitBlocksUse:false,
    focusPhase:libraryPlan.focusPhase,
    qualityTarget:libraryPlan.qualityTarget,
    volumeReady:libraryPlan.volumeReady,
    volumeBlockingDomains:libraryPlan.volumeBlockingDomains,
    uiBlockingSubsystems:libraryPlan.uiBlockingSubsystems,
    volumeHealth:libraryPlan.volumeHealth,
    qualityHealth:libraryPlan.qualityHealth,
    assetManagementHealth,
    nextVolumeActions:libraryPlan.nextVolumeActions,
    persistentWorklistField:libraryPlan.persistentWorklistField,
    volumeActionConsumption:libraryPlan.volumeActionConsumption,
    reuseResolutionOrder:libraryPlan.reuseResolutionOrder,
    freeOriginalVolumePolicy:libraryPlan.freeOriginalVolumePolicy,
    referenceImageIdeaOverlay:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay,
    eligibleFreeSourceCount:libraryPlan.eligibleFreeSourceCount,
    freeSourceCandidateLimitPerAction:libraryPlan.freeSourceCandidateLimitPerAction,
    freeSourceCatalogSufficiencyCount:libraryPlan.freeSourceCatalogSufficiencyCount,
    freeSourceCatalogReady:libraryPlan.freeSourceCatalogReady,
    freeSourceCatalogExpansionMode:libraryPlan.freeSourceCatalogExpansionMode,
    primaryAttention:libraryPlan.primaryAttention,
    styleExpressionRequiredForAllDomains:libraryPlan.styleExpressionRequiredForAllDomains===true,
    styleExpressionContractRef:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.styleExpressionContractRef,
    styleExpressionDomainBindingRef:INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.styleExpressionDomainBindingRef,
    styleExpressionAxes:libraryPlan.styleExpressionAxes,
    styleExpressionDomainBindings:libraryPlan.styleExpressionDomainBindings,
    ideaDeduplication:libraryPlan.ideaDeduplication,
    qualityUpPolicy:libraryPlan.qualityUpPolicy,
    autonomousOperatingContract:libraryPlan.autonomousOperatingContract,
    autonomousMaintenanceContract:libraryPlan.autonomousMaintenanceContract,
    maintenance:maintenanceState,
    studioVariationAxes:libraryPlan.studioVariationAxes,
    autonomousNextAction:libraryPlan.autonomousNextAction,
    autonomousContinuationRequired:true,
    ownerPresenceRequired:false,
    humanPresenceRequired:false,
    chatgptPresenceRequired:false,
    referenceBreadthProfiles:Object.keys(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES),
    progressionComplexityProfiles:Object.keys(INTERNAL_PROGRESSION_COMPLEXITY_PROFILES),
    audioStudioBreadth:libraryPlan.audioStudioBreadth,
    audioRoleContractCount:libraryPlan.audioRoleContractCount,
    actualVerifiedAudioAssetCount:libraryPlan.actualVerifiedAudioAssetCount,
    audioRoleVolumeSeparateFromVerifiedFileCount:true,
    volumeBeforeQuality:true,
    qualityUpStartsOnlyAfterRecommendedVolume:true,
    productionRuntimeVerificationSeparateFromInternalQuality:true,
    autoRegistrySync:true,
    autoDelete:false,
    productionPromotionAutomatic:false,
    runtimeVerificationRequired:true,
    repositoryAssetSync,
    blankAssetForbidden:true,
    closestCompatibleLibraryAssetRequired:true,
    qualityScoreBlocksInitialLibraryUse:false,
    internalAuditScoreBlocksInitialLibraryUse:false,
    domainPlan:libraryPlan.domains.map(row=>({
      domain:row.domain,currentCount:row.currentCount,minimum:row.minimum,targetMin:row.targetMin,targetMax:row.targetMax,
      baseTargetMin:row.baseTargetMin,referenceTargetMin:row.referenceTargetMin,referenceProfileIds:row.referenceProfileIds,
      measurement:row.measurement,actualVerifiedAudioAssetCount:row.actualVerifiedAudioAssetCount,roleContractCount:row.roleContractCount,
      softReviewAt:row.softReviewAt,hardMaximum:null,state:row.state,overSoftLimitBlocksUse:false
    })),
    uiSubsystemPlan:libraryPlan.uiSubsystems.map(row=>({
      subsystem:row.subsystem,currentCount:row.currentCount,targetMin:row.targetMin,targetMax:row.targetMax,
      softReviewAt:row.softReviewAt,hardMaximum:null,state:row.state,overSoftLimitBlocksUse:false
    })),
    staleRowsAreReviewOnly:true,
    workflowCreated:false,
    schedulerCreated:false,
    queueCreated:false,
    pipelineCreated:false,
    wrapperCreated:false,
    shadowSystemCreated:false
  };

  next.characterNpcCustomization={
    ...(next.characterNpcCustomization||{}),
    version:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.version,
    status:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.status,
    contract:'assets/vibe-character-identity-director.js#VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT',
    target:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.target,
    referenceUse:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.referenceUse,
    protectedExpressionCopyForbidden:true,
    exactThirdPartyFaceHairTattooOutfitUiCopyForbidden:true,
    sharedAssetPoolForPlayerAndNpc:true,
    npcUsesSameMorphPartMaterialAndMotionGrammar:true,
    generatedCombinationSpaceIsNotAuthoredAssetCount:true,
    targetMinimums:{...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.targetMinimums},
    bodyAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.bodyAxes],
    faceAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.faceAxes],
    surfaceAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.surfaceAxes],
    eyeHairAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.eyeHairAxes],
    speciesAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.speciesAxes],
    outfitAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.outfitAxes],
    npcContextAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.npcContextAxes],
    presentationAxes:[...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.presentationAxes],
    npcPopulationRules:{...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.npcPopulationRules},
    production:{...VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.production},
    referenceImageIdeaIntegration:{
      enabled:true,
      sourceBoundObservationRequired:true,
      taskLocalWorklistOnly:true,
      persistentRawImageLearningForbidden:true,
      visibleFeaturesMaySeedCustomizationIdeas:true,
      unseenGeometryAndMotionRemainCreativeProposals:true,
      directReferenceCopyForbidden:true
    },
    productionVerified:false,
    runtimeVerificationRequired:true,
    gameplayAuthority:false,
    balanceAuthority:false,
    saveAuthority:false,
    networkAuthority:false
  };


  const comparableKeys=unique([...Object.keys(original),...Object.keys(next)]).filter(key=>key!=='version'&&key!=='updatedAt').sort();
  const changedSections=comparableKeys.filter(key=>JSON.stringify(original[key])!==JSON.stringify(next[key]));
  const beforeComparable=JSON.stringify({...original,version:0,updatedAt:null});
  const afterComparable=JSON.stringify({...next,version:0,updatedAt:null});
  const changed=beforeComparable!==afterComparable;
  if(changed){
    next.version=Math.max(0,Number(original.version)||0)+1;
    if(next.internalAssetLibraryAutomation){
      next.internalAssetLibraryAutomation.lastCatalogSynchronizedVersion=next.version;
      if(next.internalAssetLibraryAutomation.maintenance){
        next.internalAssetLibraryAutomation.maintenance.synchronizedRegistryVersion=next.version;
      }
    }
  }
  let persisted=false,persistError=null;
  if(persist&&changed){
    try{
      fs.writeFileSync(registryPath,JSON.stringify(next,null,2)+'\n','utf8');
      persisted=true;
    }catch(error){
      persistError=clean(error?.message||error);
    }
  }
  return freeze({
    registry:next,
    changed,
    changedSections:freezeList(changedSections),
    persisted,
    persistError,
    catalogFingerprint:fingerprint,
    maintenance:next.internalAssetLibraryAutomation?.maintenance||null,
    discoveredCatalogCount:catalogs.length,
    synchronizedPackIds:freezeList(syncRows.map(row=>row.packId)),
    seedCount:seedPlan.seedCount,
    automationPlan:libraryPlan
  });
}

const companyAssetLibraryRegistry=repoRoot=>synchronizeCompanyCommonAssetRegistry({repoRoot,persist:!process.env.NODE_TEST_CONTEXT}).registry;
const inferUniverseFamily=row=>{
  const explicit=clean(row?.family||row?.category).toUpperCase();
  if(explicit)return explicit;
  const hay=[...(row?.types||[]),...(row?.tags||[]),row?.type,row?.id,row?.path].map(clean).join(' ').toUpperCase();
  if(/CHARACTER|PLAYER|HERO/.test(hay))return'CHARACTER';
  if(/CREATURE|MONSTER|ENEMY|BEAST|INSECT/.test(hay))return'CREATURE';
  if(/BUILDING|HOUSE|TEMPLE|CASTLE|DUNGEON|INTERIOR/.test(hay))return'BUILDING';
  if(/ENVIRONMENT|BACKGROUND|TERRAIN|FOREST|BIOME|TREE|ROCK/.test(hay))return'ENVIRONMENT';
  if(/WEAPON|SWORD|AXE|HAMMER|BOW|GUN|SPEAR/.test(hay))return'WEAPON';
  if(/SKILL|SPELL|ABILITY/.test(hay))return'SKILL';
  if(/MATERIAL|TEXTURE|SURFACE/.test(hay))return'MATERIAL';
  if(/AUDIO|SFX|BGM|SOUND/.test(hay))return'AUDIO';
  if(/VFX|EFFECT|PARTICLE/.test(hay))return'VFX';
  if(/UI|HUD|ICON|BUTTON/.test(hay))return'UI';
  if(/MOTION|ANIMATION/.test(hay))return'MOTION';
  if(/PROP|FURNITURE|CONTAINER|DECOR/.test(hay))return'PROP';
  return'';
};

function inferRequestedConcept(task={},request=''){
  const explicit=Array.isArray(task?.concept?.styles)?task.concept.styles:Array.isArray(task?.conceptStyles)?task.conceptStyles:[];
  const rows=explicit.map((row,index)=>typeof row==='string'?{family:clean(row),weight:1}:{family:clean(row?.family||row?.styleFamily||row?.id),weight:Number(row?.weight??row?.ratio??1)||1}).filter(row=>row.family);
  if(rows.length)return{
    styles:rows,
    artTone:task?.concept?.artTone||task?.artTone||[],
    worldEra:task?.concept?.worldEra||task?.worldEra||[],
    combatFeel:task?.concept?.combatFeel||task?.combatFeel||[],
    presentation:task?.concept?.presentation||task?.presentationStyle||[],
    customTags:task?.concept?.customTags||[]
  };
  const text=clean(request).toUpperCase(),found=[];
  const rules=[
    ['SEMI_CARTOON',/SEMI.?CARTOON|세미.?카툰/],['CARTOON',/CARTOON|카툰|만화풍?/],['ANIME_OR_CEL_SHADED',/ANIME|CEL.?SHADE|애니풍?|셀.?셰이/],
    ['STYLIZED_REALISM',/STYLIZED.?REAL|스타일라이즈드.?실사|세미.?실사/],['STYLIZED_FANTASY',/STYLIZED.?FANTASY|스타일라이즈드.?판타지/],
    ['DARK_FANTASY',/DARK.?FANTASY|다크.?판타지|\bDARK\b|다크풍?/],['HIGH_FANTASY',/HIGH.?FANTASY|하이.?판타지/],['LOW_FANTASY',/LOW.?FANTASY|로우.?판타지/],
    ['WUXIA',/WUXIA|무협/],['XIANXIA',/XIANXIA|선협/],['EAST_ASIAN_FANTASY',/EAST.?ASIAN.?FANTASY|동양.?판타지|오리엔탈.?판타지/],
    ['MYTHIC_NORDIC',/MYTHIC.?NORDIC|NORDIC|NORSE|노르드|북유럽.?신화/],['MYTHIC',/MYTHIC|신화풍?|신화적/],['FAIRYTALE',/FAIRY.?TALE|동화풍?|동화적/],
    ['DREAMCORE',/DREAMCORE|드림코어/],['DREAMLIKE',/DREAMLIKE|몽환풍?|몽환적/],['GOTHIC',/GOTHIC|고딕/],
    ['COSMIC_HORROR',/COSMIC.?HORROR|코스믹.?호러|우주적.?공포/],['HORROR',/HORROR|공포|호러/],['CUTE_CASUAL',/CUTE|CASUAL|귀여|캐주얼/],['CHIBI',/CHIBI|치비|SD.?캐릭터/],
    ['LOW_POLY',/LOW.?POLY|로우.?폴리/],['REALISTIC',/REALISTIC|실사풍?|리얼리스틱/],['MILITARY_SCI_FI',/MILITARY.?SCI.?FI|밀리터리.?SF|군사.?SF/],['SCI_FI',/SCI.?FI|\bSF\b|공상과학/],
    ['CYBERPUNK',/CYBERPUNK|사이버펑크/],['SOLARPUNK',/SOLARPUNK|솔라펑크/],['BIOPUNK',/BIOPUNK|바이오펑크/],['STEAMPUNK',/STEAMPUNK|스팀펑크/],['DIESELPUNK',/DIESELPUNK|디젤펑크/],
    ['RETRO_FUTURISM',/RETRO.?FUTUR|레트로.?퓨처|복고.?미래/],['POST_APOCALYPSE',/POST.?APOC|아포칼립스|포스트.?아포칼립스|폐허.?세계/],['PRIMITIVE',/PRIMITIVE|원시/],
    ['ANCIENT_CIVILIZATION',/ANCIENT.?CIVIL|고대.?문명/],['HISTORICAL_EAST_ASIAN',/HISTORICAL.?EAST.?ASIAN|동아시아.?역사|동양.?사극|사극/],
    ['MODERN_URBAN',/MODERN.?URBAN|현대.?도시/],['INDUSTRIAL',/INDUSTRIAL|산업풍?|공업풍?/],['OCEANIC',/OCEANIC|OCEAN|해양/],['SKY_WORLD',/SKY.?WORLD|천공.?세계|공중.?도시/],
    ['DESERT_CIVILIZATION',/DESERT.?CIVIL|사막.?문명/],['DESERT_FANTASY',/DESERT.?FANTASY|사막.?판타지/],['SNOW_KINGDOM',/SNOW.?KINGDOM|설원.?왕국/],['JUNGLE_RUINS',/JUNGLE.?RUIN|밀림.?유적/],
    ['UNDERWATER_FANTASY',/UNDERWATER.?FANTASY|수중.?판타지|해저.?판타지/],['UNDERGROUND',/UNDERGROUND|지하.?세계/],['UNDEAD',/UNDEAD|언데드/],['MECHANICAL_CIVILIZATION',/MECHANICAL.?CIVIL|기계.?문명/],
    ['INK_WASH',/INK.?WASH|SUMI|수묵|먹화|먹선/],['WATERCOLOR',/WATERCOLOR|수채화?|수채풍?/],['TOON_NOIR',/TOON.?NOIR|카툰.?누아르/],['NOIR',/NOIR|누아르/],
    ['COZY',/COZY|코지|아늑/],['PAPER_CRAFT',/PAPER.?CRAFT|PAPER.?CUT|페이퍼.?크래프트|종이.?공예|종이.?컷/],['VOXEL',/VOXEL|복셀/],
    ['SPACE_OPERA',/SPACE.?OPERA|스페이스.?오페라/]
  ];
  for(const [family,re] of rules)if(re.test(text)&&!found.some(row=>row.family===family))found.push({family,weight:1});
  if(!found.length)found.push({family:clean(task.styleFamily||task.style)||'STYLIZED_FANTASY',weight:1});
  const artTone=[
    /CUTE|귀여/.test(text)?'CUTE':'',/BRIGHT|밝|경쾌/.test(text)?'BRIGHT':'',/MYSTER|신비/.test(text)?'MYSTERIOUS':'',
    /DARK|다크|음산/.test(text)?'DARK':'',/GRIT|거칠|황량/.test(text)?'GRITTY':'',/ELEGANT|우아/.test(text)?'ELEGANT':'',
    /EPIC|웅장|영웅/.test(text)?'EPIC':'',/SURREAL|몽환|초현실/.test(text)?'SURREAL':'',/HORROR|공포|호러/.test(text)?'HORROR':'',
    /COMED|코믹|유쾌/.test(text)?'COMEDIC':''
  ].filter(Boolean);
  const worldEra=[
    /PRIMITIVE|원시/.test(text)?'PRIMITIVE':'',/ANCIENT|고대/.test(text)?'ANCIENT':'',/MEDIEVAL|중세/.test(text)?'MEDIEVAL':'',
    /WUXIA|무협|선협/.test(text)?'WUXIA':'',/INDUSTRIAL|산업|스팀펑크|디젤펑크/.test(text)?'INDUSTRIAL':'',
    /MODERN|현대/.test(text)?'MODERN':'',/NEAR.?FUTURE|근미래/.test(text)?'NEAR_FUTURE':'',
    /FUTURE|미래|SCI.?FI|\bSF\b|스페이스.?오페라/.test(text)?'FUTURE':'',/POST.?APOC|아포칼립스/.test(text)?'POST_APOCALYPSE':'',
    /FANTASY|판타지|신화|동화/.test(text)?'TIMELESS_FANTASY':''
  ].filter(Boolean);
  const combatFeel=[
    /FAST.?COMBO|연타|콤보/.test(text)?'FAST_COMBO':'',/WEIGHT|묵직/.test(text)?'WEIGHTY':'',/DODGE|회피/.test(text)?'DODGE':'',
    /PARRY|패링/.test(text)?'PARRY':'',/WUXIA|무협|경공|검기/.test(text)?'WUXIA_FLOW':'',/PROJECTILE|원거리|투사체/.test(text)?'PROJECTILE':'',
    /SKILL.?BURST|스킬.?폭발/.test(text)?'SKILL_BURST':'',/SURVIVAL|생존/.test(text)?'SURVIVAL':'',/CROWD.?CONTROL|군중.?제어/.test(text)?'CROWD_CONTROL':'',
    /BOSS.?DUEL|보스.?전|결투/.test(text)?'BOSS_DUEL':''
  ].filter(Boolean);
  const presentation=[
    /MINIMAL|미니멀/.test(text)?'MINIMAL':'',/ARCADE|아케이드|읽기.?쉬/.test(text)?'READABLE_ARCADE':'',
    /CINEMATIC|시네마틱|영화/.test(text)?'CINEMATIC':'',/ATMOSPHERIC|분위기|몰입/.test(text)?'ATMOSPHERIC':'',
    /HAND.?PAINT|수채|수묵|손그림/.test(text)?'HAND_PAINTED':'',/CEL.?SHADE|셀.?셰이|애니풍?/.test(text)?'CEL_SHADED':'',
    /MATERIAL.?RICH|재질.?풍부|고재질/.test(text)?'MATERIAL_RICH':''
  ].filter(Boolean);
  return{styles:found,artTone:[...new Set(artTone)],worldEra:[...new Set(worldEra)],combatFeel:[...new Set(combatFeel)],presentation:[...new Set(presentation)],customTags:[]};
}

const WEB_DIRECT_AUTHORING=freeze([
  'svg-final-art',
  'css-presentation',
  'canvas-art-and-effects',
  'procedural-javascript-visuals',
  'web-audio-sfx',
  'motion-engine-animation'
]);

const BINARY_AUTHORING_KINDS=freeze([
  'raster-image-or-sprite-sheet',
  'audio-file-or-bgm',
  '3d-model-or-rig',
  'engine-native-binary-asset'
]);

const UNITY_DIRECT_AUTHORING=freeze([
  'csharp-procedural-mesh-and-low-poly-model',
  'csharp-runtime-material-and-lighting',
  'csharp-particle-vfx-and-trails',
  'csharp-runtime-animation-and-secondary-motion',
  'ugui-runtime-presentation'
]);

const ROBLOX_DIRECT_AUTHORING=freeze([
  'luau-composed-low-poly-model',
  'luau-material-color-and-lighting',
  'luau-particle-beam-trail-vfx',
  'luau-runtime-animation-and-secondary-motion',
  'luau-ui-presentation'
]);

const NATIVE_DCC_AUTHORING=freeze([
  'blender-python-original-mesh-rig-and-glb',
  'blender-uv-material-texture-and-detail-pass',
  'blender-review-render-and-evidence'
]);

const ASSET_MODEL_ROUTING=freeze({
  version:2,
  baselineModel:'qwen3:1.7b',
  heroModel:'qwen3:4b-instruct',
  route:'LOCAL_OLLAMA_ONLY',
  heroModelUse:'HERO_ASSET_SOURCE_IMPLEMENTATION_ONLY',
  fallbackToBaseline:true,
  maxAttemptsUnchanged:true,
  generationBudgetUnchanged:true,
  paidApiAllowed:false,
  cacheFamily:'vibe2-ollama-v6'
});
const HERO_SIGNAL_RULES=freeze([
  freeze({id:'PLAYER_OR_HERO',re:/(?:\bhero\b|player[ _-]character|primary[ _-]character|주인공|플레이어[ _-]?캐릭터)/i,profiles:freeze(['HERO_CHARACTER'])}),
  freeze({id:'PRIMARY_BOSS_OR_ENEMY',re:/(?:primary[ _-](?:boss|enemy)|main[ _-]boss|\bboss\b|주[요 ]*보스|보스|대표[ _-]?적)/i,profiles:freeze(['HERO_BOSS','FOREGROUND_CREATURE'])}),
  freeze({id:'SIGNATURE_WEAPON_OR_TOOL',re:/(?:signature[ _-](?:weapon|tool)|시그니처[ _-]?(?:무기|도구)|대표[ _-]?무기)/i,profiles:freeze(['INTERACTIVE_EQUIPMENT'])}),
  freeze({id:'KEY_LANDMARK_OR_STARTING_HUB',re:/(?:key[ _-]landmark|starting[ _-](?:hub|region)|핵심[ _-]?랜드마크|시작[ _-]?(?:허브|지역|마을))/i,profiles:freeze(['REGION_WORLD'])})
]);
function buildAssetModelRouting({task={},request='',decisions=[],highEndActive=false}={}){
  const explicitHero=clean(task?.assetModelTier||task?.assetPriority||task?.qualityTier).toUpperCase()==='HERO';
  const matchedRules=HERO_SIGNAL_RULES.filter(rule=>rule.re.test(clean(request))&&decisions.some(row=>rule.profiles.includes(clean(row?.qualityDNA?.profile).toUpperCase())));
  const heroRequested=Boolean(highEndActive&&(explicitHero||matchedRules.length));
  const selectedModel=heroRequested?ASSET_MODEL_ROUTING.heroModel:ASSET_MODEL_ROUTING.baselineModel;
  const cacheKey=clean(selectedModel).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'local-model';
  return freeze({
    ...ASSET_MODEL_ROUTING,
    heroRequested,
    selectedModel,
    cacheKey,
    tier:heroRequested?'HERO_STUDIO':'BASELINE',
    reasons:freezeList(explicitHero?['EXPLICIT_HERO_TIER']:matchedRules.map(row=>row.id)),
    sourceBudgetPolicy:'CENTRAL_BOUNDED_FOCUSED_EXACT_ANCHOR_UNCHANGED'
  });
}
function nativeDccFamilyForTypes(types=[]){
  const joined=(types||[]).map(value=>clean(value).toLowerCase()).join(' ');
  if(/character|player|npc/.test(joined))return'CHARACTER';
  if(/boss|enemy|creature|monster/.test(joined))return'CREATURE';
  if(/background|environment/.test(joined))return'ENVIRONMENT';
  if(/item|weapon|equipment/.test(joined))return'WEAPON';
  if(/animation|motion/.test(joined))return'MOTION';
  if(/effect|vfx|particle/.test(joined))return'VFX';
  if(/ui|hud|icon/.test(joined))return'UI';
  if(/audio|sound|music|bgm|sfx/.test(joined))return'AUDIO';
  if(/prop|furniture/.test(joined))return'PROP';
  return null;
}
function normalizeNativeDccAuthoringRecipe(recipe={},asset={},target='',requiredTypes=[]){
  const executor=clean(recipe?.executor||recipe?.engine).toUpperCase();
  const script=clean(recipe?.script||recipe?.recipe||recipe?.path).replaceAll('\\','/').replace(/^\.\//,'');
  const id=clean(recipe?.id)||[clean(asset?.id)||'asset',path.basename(script||'recipe')].join(':');
  const types=unique([...(Array.isArray(recipe?.types)?recipe.types:[]),clean(recipe?.type)].map(value=>clean(value).toLowerCase()).filter(Boolean));
  const targets=unique([...(Array.isArray(recipe?.targetPlatforms)?recipe.targetPlatforms:[]),clean(recipe?.targetPlatform)].map(value=>clean(value).toLowerCase()).filter(Boolean));
  const args=freezeList((Array.isArray(recipe?.args)?recipe.args:[]).map(value=>String(value??'')).filter(value=>value.length<=1000));
  const outputs=freezeList(unique((Array.isArray(recipe?.outputs)?recipe.outputs:[]).map(value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'')).filter(Boolean)));
  const evidenceJson=clean(recipe?.evidenceJson).replaceAll('\\','/').replace(/^\.\//,'')||null;
  const preview=clean(recipe?.preview).replaceAll('\\','/').replace(/^\.\//,'')||null;
  const editableSource=clean(recipe?.editableSource||script).replaceAll('\\','/').replace(/^\.\//,'')||null;
  const targetName=clean(target).toLowerCase();
  const typeMatch=!types.length||types.some(type=>requiredTypes.includes(type));
  const targetMatch=!targets.length||targets.includes(targetName)||targets.includes(targetName.toUpperCase().toLowerCase());
  const safePath=value=>Boolean(value&&!path.isAbsolute(value)&&!value.split('/').includes('..'));
  const safe=executor==='BLENDER_PYTHON'&&/\.py$/i.test(script)&&safePath(script)&&outputs.length>0&&outputs.every(safePath)&&(!evidenceJson||safePath(evidenceJson))&&(!preview||safePath(preview));
  const family=clean(recipe?.family||asset?.family||asset?.category).toUpperCase()||nativeDccFamilyForTypes(types);
  const license=clean(recipe?.license||asset?.license)||null;
  return freeze({
    id,assetId:clean(asset?.id)||clean(recipe?.assetId)||null,family:family||null,license,executor,script,types:freezeList(types),targetPlatforms:freezeList(targets),args,outputs,evidenceJson,preview,editableSource,
    typeMatch,targetMatch,safe,runMode:clean(recipe?.runMode||'VERIFY_ONLY').toUpperCase(),
    runtimeVerificationRequired:true,companyPromotionAllowed:false
  });
}
const GENERIC_NATIVE_DCC_TYPES=freezeList(['background','environment','item','weapon','prop']);
function genericNativeDccRecipeForType({target='',task={},type=''}={}){
  const targetName=clean(target).toLowerCase();
  const typeName=clean(type).toLowerCase();
  if(!['roblox','unity'].includes(targetName)||!GENERIC_NATIVE_DCC_TYPES.includes(typeName))return null;
  const gameSlug=(clean(task?.gameId)||'game').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'game';
  const typeSlug=typeName.replace(/[^a-z0-9._-]+/g,'-')||'asset';
  const outputRoot=`assets/generated/${targetName}/${gameSlug}/${typeSlug}`;
  const family=nativeDccFamilyForTypes([typeName]);
  return {
    id:`generated-${gameSlug}-${targetName}-${typeSlug}-blender-v1`,
    assetId:`${gameSlug}-${targetName}-${typeSlug}-generated-v1`,
    family,
    license:'project-original',
    executor:'BLENDER_PYTHON',
    script:'assets/native-authoring/build-game-visual.py',
    editableSource:'assets/native-authoring/build-game-visual.py',
    types:[typeName],
    targetPlatforms:[targetName],
    args:['--output',outputRoot,'--asset-id',`${gameSlug}-${typeSlug}`,'--profile',typeName,'--target',targetName],
    outputs:[`${outputRoot}/asset.glb`,`${outputRoot}/preview.png`,`${outputRoot}/evidence.json`],
    evidenceJson:`${outputRoot}/evidence.json`,
    preview:`${outputRoot}/preview.png`,
    runMode:'VERIFY_ONLY'
  };
}

function buildNativeAuthoringExecution({target='',task={},decisions=[],manifest={},explicitRequestedTypes=[]}={}){
  const targetName=clean(target).toLowerCase();
  const engineNativeTarget=['roblox','unity'].includes(targetName);
  const webNativeTarget=targetName==='web';
  const supportedAuthoringTarget=engineNativeTarget||webNativeTarget;
  const needsAuthoring=row=>row?.required!==false&&row?.applyFirst?.enabled!==true;
  const explicitRecipeRows=Array.isArray(task?.assetAuthoring?.recipes)?task.assetAuthoring.recipes:Array.isArray(task?.authoringRecipes)?task.authoringRecipes:[];
  const explicitRecipeTypes=unique(explicitRecipeRows.flatMap(recipe=>[
    ...(Array.isArray(recipe?.types)?recipe.types:[]),
    clean(recipe?.type)
  ]).map(value=>clean(value).toLowerCase()).filter(Boolean));
  const explicitRecipeHasUntyped=explicitRecipeRows.some(recipe=>!(Array.isArray(recipe?.types)&&recipe.types.length)&&!clean(recipe?.type));
  const explicitAuthoringTypes=new Set(unique([...(explicitRequestedTypes||[]),...explicitRecipeTypes].map(value=>clean(value).toLowerCase()).filter(Boolean)));
  const dccCapableTypes=unique(decisions
    .filter(row=>row?.required!==false&&(needsAuthoring(row)||explicitAuthoringTypes.has(clean(row.type).toLowerCase()))&&(row.directAuthoring||[]).some(kind=>NATIVE_DCC_AUTHORING.includes(kind)))
    .map(row=>clean(row.type).toLowerCase()));
  const requestedDccScope=explicitRecipeHasUntyped
    ?dccCapableTypes
    :unique([...(explicitRequestedTypes||[]),...explicitRecipeTypes].map(value=>clean(value).toLowerCase()).filter(Boolean));
  const automaticDccTypes=engineNativeTarget
    ?dccCapableTypes.filter(type=>requestedDccScope.includes(type))
    :[];
  const declaredDccTypes=engineNativeTarget?explicitRecipeTypes:[];
  const nativeTextKinds=targetName==='roblox'?ROBLOX_DIRECT_AUTHORING:targetName==='unity'?UNITY_DIRECT_AUTHORING:webNativeTarget?WEB_DIRECT_AUTHORING:[];
  const nativeTextTypes=decisions.filter(row=>needsAuthoring(row)&&(row.directAuthoring||[]).some(kind=>nativeTextKinds.includes(kind))).map(row=>row.type);
  const uniqueDccTypes=unique([...automaticDccTypes,...declaredDccTypes]);
  const uniqueNativeTextTypes=unique(nativeTextTypes);
  const selectedCandidateIds=new Set(decisions.flatMap(row=>[
    ...(row?.reuseCandidates||[]),
    ...(row?.externalCandidates||[])
  ]).filter(asset=>asset?.adaptationBaseOnly!==true).map(asset=>clean(asset?.id)).filter(Boolean));
  const manifestAssets=Array.isArray(manifest?.assets)?manifest.assets:[];
  const requestText=clean(task?.goal||task?.request||task?.gameId).toLowerCase();
  const genericRecipeTokens=new Set(['asset','model','3d','creature','character','enemy','boss','motion','animation','prop','environment','building','ui','vfx','audio','material']);
  const recipeAssetRelevant=asset=>{
    if(selectedCandidateIds.has(clean(asset?.id)))return true;
    if((Array.isArray(asset?.intendedConsumerGameIds)?asset.intendedConsumerGameIds:[]).map(clean).includes(clean(task?.gameId)))return true;
    const rawTokens=unique([
      clean(asset?.id),clean(asset?.title),clean(asset?.name),clean(asset?.family),clean(asset?.category),clean(asset?.subfamily),
      ...(Array.isArray(asset?.tags)?asset.tags:[])
    ].flatMap(value=>clean(value).toLowerCase().split(/[^a-z0-9가-힣]+/)).filter(value=>value.length>=2&&!genericRecipeTokens.has(value)));
    return rawTokens.some(token=>requestText.includes(token));
  };
  const registryRecipeRows=manifestAssets
    .filter(asset=>recipeAssetRelevant(asset))
    .flatMap(asset=>(Array.isArray(asset?.authoringRecipes)?asset.authoringRecipes:[]).map(recipe=>({recipe,asset})));
  const normalizedExplicit=explicitRecipeRows.map(recipe=>normalizeNativeDccAuthoringRecipe(recipe,{
    id:clean(recipe?.assetId)||'task-explicit',
    family:clean(recipe?.family)||null,
    license:clean(recipe?.license)||null
  },target,uniqueDccTypes));
  const normalizedRegistry=registryRecipeRows.map(({recipe,asset})=>normalizeNativeDccAuthoringRecipe(recipe,asset,target,uniqueDccTypes));
  const concreteRecipes=[...normalizedExplicit,...normalizedRegistry]
    .filter(row=>row.safe&&row.typeMatch&&row.targetMatch)
    .filter((row,index,rows)=>rows.findIndex(other=>other.id===row.id)===index);
  const concreteCovers=type=>concreteRecipes.some(row=>!row.types.length||row.types.includes(type));
  const normalizedGeneric=uniqueDccTypes
    .filter(type=>!explicitRecipeTypes.includes(type)&&!concreteCovers(type))
    .map(type=>genericNativeDccRecipeForType({target:targetName,task,type}))
    .filter(Boolean)
    .map(recipe=>normalizeNativeDccAuthoringRecipe(recipe,{},target,uniqueDccTypes))
    .filter(row=>row.safe&&row.typeMatch&&row.targetMatch);
  const executionRecipeRows=[...concreteRecipes,...normalizedGeneric]
    .filter((row,index,rows)=>rows.findIndex(other=>other.id===row.id)===index);
  const executionRecipes=freezeList(executionRecipeRows);
  const recipeCovers=type=>executionRecipeRows.some(row=>!row.types.length||row.types.includes(type));
  const coveredDccTypes=uniqueDccTypes.filter(recipeCovers);
  const uncoveredDccTypes=uniqueDccTypes.filter(type=>!recipeCovers(type));
  const explicitRecipes=freezeList(explicitRecipeRows);
  const availableExistingRecipes=unique(decisions.flatMap(row=>
    [...(row?.reuseCandidates||[]),...(row?.externalCandidates||[])]
      .flatMap(asset=>asset?.sourceFiles||[])
      .filter(file=>/\.py$/i.test(clean(file)))
  ));
  return freeze({
    version:3,
    enabled:supportedAuthoringTarget&&(uniqueDccTypes.length>0||uniqueNativeTextTypes.length>0),
    target:targetName,
    authoringSurface:webNativeTarget?'WEB_NATIVE_SOURCE':'ENGINE_NATIVE_SOURCE',
    platformReauthoringRequired:true,
    webAssetDirectReuseIntoRobloxOrUnityForbidden:true,
    stages:freezeList(['INSPECT','REUSE_OR_DERIVE','AUTHOR_EDITABLE_SOURCE','EXPORT_NATIVE_DERIVATIVE','APPLY_TO_EXISTING_RESPONSIBILITY','CAPTURE','VERIFY_NATIVE_RUNTIME','PROMOTE_IF_VERIFIED']),
    dcc:freeze({
      requiredTypes:freezeList(uniqueDccTypes),
      universalAuditTypes:freezeList(dccCapableTypes),
      explicitRequestedTypes:freezeList(unique((explicitRequestedTypes||[]).map(value=>clean(value).toLowerCase()))),
      authoringScopeMode:'EXPLICIT_TASK_REQUEST_PLUS_DECLARED_RECIPES',
      preferredExecutor:'BLENDER_PYTHON',
      executionRequired:uniqueDccTypes.length>0,
      executionStatus:uniqueDccTypes.length===0?'NOT_REQUIRED':uncoveredDccTypes.length===0&&executionRecipes.length>0?'READY_FOR_EXISTING_AUTHORING_EXECUTOR':executionRecipes.length>0?'PARTIAL_AUTHORING_RECIPE_COVERAGE':availableExistingRecipes.length>0?'EXISTING_AUTHORING_RECIPE_AVAILABLE':'AUTHORING_RECIPE_REQUIRED',
      requiredCapabilities:NATIVE_DCC_AUTHORING,
      explicitRecipes,
      executionRecipes,
      coveredTypes:freezeList(coveredDccTypes),
      uncoveredTypes:freezeList(uncoveredDccTypes),
      genericRecipeCount:normalizedGeneric.length,
      genericRecipeTypes:freezeList(normalizedGeneric.flatMap(row=>row.types)),
      genericRecipeScript:'assets/native-authoring/build-game-visual.py',
      availableExistingRecipes:freezeList(availableExistingRecipes),
      executionRequestCount:executionRecipes.length,
      availableExistingRecipeCount:availableExistingRecipes.length,
      executorInstallationRequired:executionRecipes.length>0,
      executionPolicy:'DECLARED_REPOSITORY_RECIPE_ONLY_NO_SHELL_EVAL',
      sourceRecipeRequired:true,
      editableSourceArtifactRequired:true,
      exportedNativeArtifactRequired:true,
      previewRenderRequired:true,
      artifactHashesRequired:true,
      requiredEvidenceFields:freezeList(['recipe','editableSource','nativeArtifact','artifactHash','preview','runtimeVerificationState']),
      nativeSourceMayNotMaskDccRequirement:true,
      textWorkerMayClaimDccCompletion:false
    }),
    nativeText:freeze({
      requiredTypes:freezeList(uniqueNativeTextTypes),
      capabilities:freezeList(nativeTextKinds),
      authoringMode:webNativeTarget?'SVG_CSS_CANVAS_JS_WEBAUDIO_NATIVE':'ENGINE_NATIVE_TEXT',
      directResponsibleSourceOnly:true,
      runtimeBindingRequired:true,
      gameplaySemanticsImmutable:true,
      platformNativeReauthoringRequired:true,
      webArtifactCopyIntoRobloxOrUnityForbidden:true
    }),
    completion:freeze({
      authoringRequestIsNotCompletion:true,
      generatedFileExistenceIsNotRuntimePass:true,
      actualArtifactOrNativeSourceDeltaRequired:true,
      nativeBindingRequired:true,
      runtimeCaptureRequired:true,
      mobileQaRequired:true,
      provenanceRequired:true,
      promotionRequiresRuntimeVerifiedConsumer:true
    })
  });
}

const GENERATED_ASSET_OUTPUT_CONTRACT=freeze({
  originalOrLicenseVerifiedDerivativeOnly:true,
  deterministicSourceRecipeRequired:true,
  sourceArtifactRequired:true,
  nativeArtifactRequired:true,
  previewRenderRequired:true,
  evidenceJsonRequired:true,
  companyAssetLibraryRegistrationRequired:true,
  nativeRuntimeVerificationRequiredBeforeVerifiedPromotion:true,
  exactRuntimeConsumerAssetIdentityRequired:true,
  promotionMustBindSourceOrDerivedHash:true,
  generatedArtifactAloneDoesNotProveRuntimePass:true,
  requiredEvidenceFields:freezeList(['sourceHash','generator','artifactHash','preview','license','targetPlatforms','runtimeVerificationState'])
});

const COMPANY_CATEGORY_TYPES=freeze({
  CHARACTER:freeze(['character']),
  CREATURE:freeze(['enemy','boss']),
  MOTION:freeze(['animation']),
  ENVIRONMENT:freeze(['background','prop']),
  VFX:freeze(['effect']),
  UI:freeze(['ui']),
  WEAPON:freeze(['item'])
});

function companyManifestAssets(registry={},repoRoot=process.cwd()){
  const licenseBlocked=asset=>{
    const value=clean(asset?.license||asset?.policy),lower=value.toLowerCase();
    return !value||/(?:^|[^a-z0-9])nc(?:[^a-z0-9]|$)/i.test(value)||lower.includes('unknown')||lower.includes('출처 불명')||lower.includes('재배포 제한');
  };
  return (Array.isArray(registry?.assets)?registry.assets:[])
    .filter(asset=>asset?.catalogActive!==false&&asset?.referenceOnly!==true&&!licenseBlocked(asset))
    .map(asset=>{
      const relative=clean(asset.path).replace(/^\//,'');
      const fileExists=Boolean(relative&&fs.existsSync(path.join(repoRoot,relative)));
      const companyVerified=asset?.verifiedCompanyReusable===true||/^VERIFIED_COMPANY_/.test(clean(asset?.status).toUpperCase());
      const platformVariantPath=Object.values(asset?.platformVariants||{}).some(variant=>clean(variant?.path));
      const nativeReferenceAvailable=Boolean(fileExists||clean(asset?.robloxAssetId)||platformVariantPath);
      const companyInternalSearchable=companyVerified||nativeReferenceAvailable;
      return{
        ...asset,
        id:clean(asset.id),
        path:relative,
        types:Array.isArray(asset.types)&&asset.types.length?asset.types:(COMPANY_CATEGORY_TYPES[clean(asset.category||asset.family).toUpperCase()]||[]),
        tags:Array.isArray(asset.tags)?asset.tags:[clean(asset.title),clean(asset.category),clean(asset.family),clean(asset.subfamily)].filter(Boolean),
        platforms:Array.isArray(asset.platforms)?asset.platforms:(clean(asset.platform)&&!/^SHARED|WEB_/i.test(clean(asset.platform))?[clean(asset.platform).toLowerCase()]:[]),
        downloaded:companyVerified?asset.downloaded!==false:nativeReferenceAvailable,
        companyVerified,
        companyInternalSearchable,
        productionVerified:asset.productionVerified===true,
        verifiedCompanyReusable:asset.verifiedCompanyReusable===true,
        source:clean(asset.source)||'COMPANY_ASSET_LIBRARY'
      };
    })
    .filter(asset=>asset.id&&asset.companyInternalSearchable===true);
}

function mergeManifestWithCompanyLibrary(manifest={},registry={},repoRoot=process.cwd()){
  const rows=[...(Array.isArray(manifest?.assets)?manifest.assets:[])];
  const byId=new Map(rows.map(asset=>[clean(asset?.id),asset]));
  for(const asset of companyManifestAssets(registry,repoRoot))byId.set(asset.id,{...(byId.get(asset.id)||{}),...asset});
  return {...manifest,assets:[...byId.values()]};
}

function sourceTierFor(asset={}){
  if(asset?.sameGameExistingRoblox===true)return 'SAME_GAME_EXISTING_ROBLOX_ASSET';
  if(asset?.companyVerified===true)return 'VERIFIED_COMPANY_ASSET';
  const assetPath=clean(asset.path);
  const sourceUrl=clean(asset.sourceUrl);
  if(asset?.downloaded!==false&&!sourceUrl)return 'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET';
  if(assetPath&&asset?.downloaded!==false)return 'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET';
  return 'LICENSE_VERIFIED_EXTERNAL_ASSET';
}

function assetTargetCompatible(asset={},target=''){
  const resolvedTarget=clean(target).toLowerCase();
  const assetPath=clean(asset.path).replaceAll('\\\\','/');
  const platforms=(Array.isArray(asset.platforms)?asset.platforms:[]).map(value=>clean(value).toLowerCase()).filter(Boolean);
  const researchTargets=(Array.isArray(asset.platformResearchTargets)?asset.platformResearchTargets:[]).map(value=>clean(value).toLowerCase()).filter(Boolean);
  if(resolvedTarget==='web'){
    if(assetPath.startsWith('unity-games/')||assetPath.startsWith('roblox-games/'))return false;
    return !platforms.length||platforms.includes('web');
  }
  if(resolvedTarget==='unity'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('roblox-games/'))return false;
    if(platforms.length&&platforms.includes('unity'))return true;
    if(!assetPath&&researchTargets.includes('unity'))return true;
    if(platforms.length)return false;
    return !assetPath||assetPath.startsWith('unity-games/');
  }
  if(resolvedTarget==='roblox'){
    if(assetPath.startsWith('web-games/')||assetPath.startsWith('unity-games/'))return false;
    if(platforms.length&&platforms.includes('roblox'))return true;
    if(!assetPath&&researchTargets.includes('roblox'))return true;
    if(platforms.length)return false;
    return !assetPath||assetPath.startsWith('roblox-games/');
  }
  return false;
}

function matchedForType(selector={},type='',manifest={},target=''){
  const assets=Array.isArray(manifest?.assets)?manifest.assets:[];
  const byId=new Map(assets.map(asset=>[clean(asset?.id),asset]));
  const selectedRows=(selector.matched||[]).filter(row=>clean(row.type)===clean(type));
  const selectedIds=new Set(selectedRows.map(row=>clean(row.id)).filter(Boolean));
  const licenseBlocked=asset=>{
    const value=clean(asset?.license||asset?.policy),lower=value.toLowerCase();
    return !value||/(?:^|[^a-z0-9])nc(?:[^a-z0-9]|$)/i.test(value)||lower.includes('unknown')||lower.includes('출처 불명')||lower.includes('재배포 제한');
  };
  const declaredFor=asset=>{
    const explicit=Array.isArray(asset?.types)?asset.types.map(value=>clean(value).toLowerCase()).filter(Boolean):[];
    const categoryTypes=COMPANY_CATEGORY_TYPES[clean(asset?.category||asset?.family).toUpperCase()]||[];
    return unique([...explicit,...categoryTypes.map(value=>clean(value).toLowerCase()),clean(asset?.type).toLowerCase()].filter(Boolean));
  };
  const normalize=(row,adaptationBaseOnly=false,approximateLibraryFallback=false)=>{
    const asset=byId.get(clean(row.id))||row;
    return freeze({
      id:clean(row.id||asset.id),
      path:clean(row.path||asset.path)||null,
      license:clean(row.license||asset.license)||null,
      source:clean(row.source||asset.source)||null,
      sourceUrl:clean(asset.sourceUrl)||null,
      downloaded:asset.downloaded!==false,
      acquiredExternal:Boolean(asset.companyVerified!==true&&asset.sameGameExistingRoblox!==true&&clean(asset.sourceUrl||asset.externalSourceUrl||asset.acquiredFrom)),
      acquisitionOrigin:asset.companyVerified===true?'COMPANY_INTERNAL':asset.sameGameExistingRoblox===true?'SAME_GAME':clean(asset.sourceUrl||asset.externalSourceUrl||asset.acquiredFrom)?'EXTERNAL_ACQUIRED':'REPOSITORY_INTERNAL',
      animated:adaptationBaseOnly?false:row.animated===true,
      motionMode:adaptationBaseOnly?null:clean(row.motionMode)||null,
      motionStates:freezeList(unique([...(Array.isArray(asset.states)?asset.states:[]),...(Array.isArray(asset.animations)?asset.animations:[])].filter(value=>typeof value==='string').map(value=>clean(value).toLowerCase()))),
      rigType:clean(asset.rigType)||null,
      sourceTier:sourceTierFor(asset),
      companyVerified:asset.companyVerified===true,
      sameGameExistingRoblox:asset.sameGameExistingRoblox===true,
      robloxAssetId:clean(asset.robloxAssetId)||null,
      sourceHash:clean(asset.sourceHash||asset.sourceSha256||asset.contentHash||asset.sha256)||null,
      artifactHash:clean(asset.artifactHash||asset.derivedSha256||asset.contentHash||asset.sha256)||null,
      sourceFiles:freezeList(unique(Array.isArray(asset.sourceFiles)?asset.sourceFiles:[])),
      nativeArtifacts:freezeList(unique(Array.isArray(asset.nativeArtifacts)?asset.nativeArtifacts:[])),
      tags:freezeList(unique([...(Array.isArray(asset.tags)?asset.tags:[]),clean(asset.family),clean(asset.category),clean(asset.subfamily)].map(clean).filter(Boolean))),
      family:clean(asset.family||asset.category)||null,
      subfamily:clean(asset.subfamily)||null,
      platformVariants:freeze(asset.platformVariants&&typeof asset.platformVariants==='object'?asset.platformVariants:{}),
      productionVerified:asset.productionVerified===true||asset.verifiedCompanyReusable===true,
      retargetable:asset.retargetable===true,
      studioMotionCandidate:asset.studioMotionCandidate===true,
      creatureFamily:clean(asset.creatureFamily)||null,
      compatibleMotionSourceIds:freezeList(asset.compatibleMotionSourceIds||[]),
      companyInternalSearchable:asset.companyInternalSearchable===true,
      adaptationBaseOnly,
      approximateLibraryFallback,
      finalUseStillRequiresOriginalSelectorContract:adaptationBaseOnly&&!approximateLibraryFallback,
      targetCompatible:true
    });
  };

  const finalCandidates=selectedRows
    .filter(row=>assetTargetCompatible(byId.get(clean(row.id))||row,target))
    .filter(row=>{
      const asset=byId.get(clean(row.id))||row;
      return asset.referenceOnly!==true&&!/_REFERENCE(?:_ONLY)?$/.test(clean(asset.platform).toUpperCase());
    })
    .map(row=>normalize(row,false));

  const authoringBases=assets
    .filter(asset=>!selectedIds.has(clean(asset.id)))
    .filter(asset=>declaredFor(asset).includes(clean(type).toLowerCase()))
    .filter(asset=>!licenseBlocked(asset))
    .filter(asset=>assetTargetCompatible(asset,target))
    .filter(asset=>asset.referenceOnly!==true&&!/_REFERENCE(?:_ONLY)?$/.test(clean(asset.platform).toUpperCase()))
    .map(asset=>normalize(asset,true));

  const exactCandidates=[...finalCandidates,...authoringBases];
  const approximateFamilies=new Set((BASE_MATERIAL_FAMILIES_BY_ASSET_TYPE[clean(type).toLowerCase()]||[]).map(clean));
  const approximateBases=exactCandidates.length?[]:assets
    .filter(asset=>asset?.companyInternalSearchable===true)
    .filter(asset=>approximateFamilies.has(clean(asset?.family||asset?.category).toUpperCase()))
    .filter(asset=>!licenseBlocked(asset))
    .filter(asset=>assetTargetCompatible(asset,target))
    .filter(asset=>asset.referenceOnly!==true&&!/_REFERENCE(?:_ONLY)?$/.test(clean(asset.platform).toUpperCase()))
    .map(asset=>normalize(asset,true,true));
  const deduped=new Map();
  for(const row of [...exactCandidates,...approximateBases])if(row.id&&!deduped.has(row.id))deduped.set(row.id,row);
  return freezeList([...deduped.values()]);
}
const BASE_MATERIAL_FAMILIES_BY_ASSET_TYPE=Object.freeze({
  character:['CHARACTER'],
  enemy:['CREATURE'],
  boss:['CREATURE'],
  background:['ENVIRONMENT','BUILDING'],
  item:['WEAPON','PROP'],
  prop:['PROP','ENVIRONMENT','BUILDING'],
  effect:['VFX','SKILL'],
  ui:['UI'],
  audio:['AUDIO'],
  animation:['MOTION']
});
const UNIVERSAL_ASSET_FAMILIES=Object.freeze([
  'CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL',
  'MATERIAL','AUDIO','VFX','UI','MOTION','PROP'
]);
function stableMaterialSeed(value=''){
  let hash=2166136261;
  for(const ch of clean(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function stableMaterialAtoms(values=[],key='',count=3){
  const rows=unique(values);
  if(!rows.length)return freezeList([]);
  const start=stableMaterialSeed(key)%rows.length,out=[];
  for(let i=0;i<Math.min(Math.max(1,count),rows.length);i++)out.push(rows[(start+i)%rows.length]);
  return freezeList(out);
}
function baseMaterialRecipeForRequest(request='',templates=[]){
  const text=clean(request);
  const id=/BOSS|보스/i.test(text)?'BOSS_VARIANT'
    :/ELITE|정예/i.test(text)?'ELITE_VARIANT'
    :/FACTION|세력/i.test(text)?'FACTION_VARIANT'
    :/REGION|지역|BIOME|바이옴/i.test(text)?'REGION_VARIANT'
    :/DAMAGE|파손|부서|손상/i.test(text)?'DAMAGED_VARIANT'
    :/FIRE|ICE|ELECTRIC|POISON|ELEMENT|화염|불|얼음|번개|독|속성/i.test(text)?'ELEMENTAL_VARIANT'
    :/ANCIENT|고대|유적/i.test(text)?'ANCIENT_VARIANT'
    :'NORMAL_VARIANT';
  return freeze((templates||[]).find(row=>clean(row?.id)===id)||{id,mutationStrength:'LIGHT',minimumDistinctAxes:2});
}
function buildComposableBaseMaterialLoadout({companyRegistry={},studioUniversePlan=null,decisions=[],gameId='',target='',request=''}={}){
  const configured=companyRegistry?.baseMaterialLibrary?.families||{};
  const productionActive=studioUniversePlan?.baseMaterialRotation?.productionActive||configured;
  const nativeTarget=['roblox','unity','web'].includes(clean(target).toLowerCase());
  const familySet=new Set(nativeTarget?UNIVERSAL_ASSET_FAMILIES:[]);
  for(const row of decisions||[])for(const family of BASE_MATERIAL_FAMILIES_BY_ASSET_TYPE[clean(row?.type).toLowerCase()]||[])familySet.add(family);
  const families={};
  for(const family of familySet){
    const values=Array.isArray(productionActive?.[family])&&productionActive[family].length?productionActive[family]:configured?.[family]||[];
    families[family]=stableMaterialAtoms(values,`${gameId}|${['unity','web'].includes(clean(target).toLowerCase())?'UNITY_WEB_SHARED':target}|${family}`,3);
  }
  const recipe=baseMaterialRecipeForRequest(request,companyRegistry?.variantRecipeTemplates||[]);
  const visualScope=/(?:PRESENTATION_PASS|GRAPHICS_PRODUCTION|ASSET_ADAPTATION|graphics?|visual|presentation|asset|model|environment|background|terrain|material|lighting|animation|motion|vfx|effect|particle|ui|hud|그래픽|비주얼|연출|에셋|모델|환경|배경|지형|재질|조명|애니|모션|이펙트|효과|파티클|외형|실루엣|스타일)/i.test(clean(request));
  const selectedAtomCount=Object.values(families).reduce((n,rows)=>n+rows.length,0);
  const missingFamilies=UNIVERSAL_ASSET_FAMILIES.filter(family=>nativeTarget&&!(families[family]||[]).length);
  return freeze({
    status:selectedAtomCount&&missingFamilies.length===0?'READY':selectedAtomCount?'PARTIAL_FAMILY_COVERAGE':'NO_COMPATIBLE_ATOMS',
    source:'company-asset-library.json#baseMaterialLibrary',
    atomState:clean(companyRegistry?.baseMaterialLibrary?.status)||null,
    selectedAtomCount,
    families:freeze(Object.fromEntries(Object.entries(families).map(([family,rows])=>[family,freezeList(rows)]))),
    universalAssetFirst:freeze({
      required:nativeTarget,
      families:UNIVERSAL_ASSET_FAMILIES,
      evaluatedFamilies:freezeList([...familySet]),
      missingFamilies:freezeList(missingFamilies),
      allFamiliesEvaluated:!nativeTarget||UNIVERSAL_ASSET_FAMILIES.every(family=>familySet.has(family)),
      allFamiliesSelectable:missingFamilies.length===0,
      applicableFamilyActualBindingRequired:nativeTarget,
      familyResultRequired:'APPLIED_OR_EXPLICIT_NOT_APPLICABLE',
      notApplicableRequiresSystemAbsenceEvidence:true,
      primitiveOnlyUpgradeForbidden:true,
      markerOnlyApplicationForbidden:true
    }),
    recipe,
    gameSpecificStableSelection:true,
    colorOnlyVariantForbidden:companyRegistry?.baseMaterialLibrary?.combinationRules?.colorOnlyVariantDoesNotCount===true,
    runtimeVerificationRequired:companyRegistry?.baseMaterialLibrary?.combinationRules?.actualRuntimeQaRequiredBeforeVerifiedPromotion===true,
    robloxSelectionHandoff:freeze({
      selectionRequired:clean(target).toLowerCase()==='roblox',
      handoffRequired:clean(target).toLowerCase()==='roblox'&&selectedAtomCount>0,
      plannerSourceMutationForbidden:true,
      downstreamApplicationOwner:'VIBE2_VIBE3_GAME_SOURCE_IMPLEMENTATION',
      downstreamApplicationRequired:clean(target).toLowerCase()==='roblox'&&selectedAtomCount>0,
      bindingVersion:2,
      requiredSourceMarker:'STUDIO_ASSET_BINDING_VERSION',
      postApplicationVerificationRequired:true,
      actualNativeBindingRequired:true,
      allTwelveFamiliesEvaluated:true,
      familyResultRequired:'APPLIED_OR_EXPLICIT_NOT_APPLICABLE',
      markerOnlyApplicationForbidden:true,
      preserveGameplayAuthority:true,
      visualScopeDetected:visualScope
    })
  });
}
function directAuthoringFor(target='',type=''){
  const resolvedTarget=clean(target).toLowerCase();
  const actor=/character|player|enemy|boss|npc|animation/i.test(clean(type));
  const dcc=/character|player|enemy|boss|npc|animation|background|environment|item|weapon|prop/i.test(clean(type));
  const audio=/audio|sound|music|bgm|sfx/i.test(clean(type));
  if(resolvedTarget==='web'){
    if(audio) return freezeList(['web-audio-sfx']);
    if(actor) return freezeList(['svg-final-art','canvas-art-and-effects','motion-engine-animation']);
    return WEB_DIRECT_AUTHORING;
  }
  if(resolvedTarget==='unity'){
    if(audio) return freezeList([]);
    return freezeList([...(dcc?NATIVE_DCC_AUTHORING:[]),...UNITY_DIRECT_AUTHORING]);
  }
  if(resolvedTarget==='roblox'){
    if(audio) return freezeList([]);
    return freezeList([...(dcc?NATIVE_DCC_AUTHORING:[]),...ROBLOX_DIRECT_AUTHORING]);
  }
  return freezeList([]);
}

function qualityDnaForType(type=''){
  const kind=clean(type).toLowerCase();
  const profile=/character|player|npc/.test(kind)?'HERO_CHARACTER'
    :/boss/.test(kind)?'HERO_BOSS'
    :/enemy|creature/.test(kind)?'FOREGROUND_CREATURE'
    :/background|environment/.test(kind)?'REGION_WORLD'
    :/item|weapon/.test(kind)?'INTERACTIVE_EQUIPMENT'
    :/prop/.test(kind)?'FUNCTIONAL_PROP'
    :/ui/.test(kind)?'INTERFACE'
    :/animation|motion/.test(kind)?'MOTION'
    :'GENERAL_VISUAL';
  const axes=/character|player|npc/.test(kind)
    ?['SILHOUETTE','PROPORTION','ANATOMY','FACE_HANDS_FEET','CLOTHING_EQUIPMENT_FIT','MATERIAL','RIG','SOCKET','MOTION','SECONDARY_MOTION','LOD']
    :/boss|enemy|creature/.test(kind)
      ?['SPECIES_SILHOUETTE','BODY_PLAN','HEAD_MOUTH_EYES','LIMB_APPENDAGE_STRUCTURE','SURFACE_MATERIAL','RIG','ATTACK_CONTACT','LOCOMOTION','HIT_DEATH_MOTION','LOD']
      :/background|environment/.test(kind)
        ?['MACRO_FORM','LANDMARK','ROUTE_READABILITY','STRUCTURAL_DENSITY','VEGETATION','FUNCTIONAL_PROPS','MATERIAL_HISTORY','AMBIENT_MOTION','STREAMING_LOD']
        :/item|weapon|prop/.test(kind)
          ?['PROFILE','PROPORTION','PART_CONSTRUCTION','GRIP_PIVOT','MATERIAL','FASTENERS','CONTACT','WEAR','LOD']
          :/ui/.test(kind)
            ?['INFORMATION_HIERARCHY','SHAPE_LANGUAGE','ICON_SILHOUETTE','TYPOGRAPHY_SPACING','MATERIAL_DEPTH','STATE_VARIANTS','TOUCH_FEEDBACK','SMALL_SIZE_READABILITY']
            :/animation|motion/.test(kind)
              ?['POSE_IDENTITY','WEIGHT_TRANSFER','CONTACT','ROOT_MOTION','TRANSITION','INTERRUPT','SECONDARY_MOTION','REACTION','LOD']
              :['SILHOUETTE','PROPORTION','STRUCTURE','MATERIAL','CONTACT','PLATFORM_PRESENTATION'];
  const hero=['HERO_CHARACTER','HERO_BOSS','INTERACTIVE_EQUIPMENT','INTERFACE'].includes(profile);
  const floors=Object.freeze(Object.fromEntries(axes.map(axis=>[axis,hero?'HERO_GRADE':'GAMEPLAY_READABLE_GRADE'])));
  return freeze({
    version:1,
    profile,
    axes:freezeList(axes),
    minimumFloors:floors,
    detailLod:Object.freeze({
      GAME_CAMERA:'PRIMARY_IDENTITY_AND_FUNCTION_MUST_READ',
      MID_RANGE:'SECONDARY_STRUCTURE_AND_PART_BREAKDOWN_REQUIRED',
      CLOSEUP:'CONSTRUCTION_MATERIAL_AND_IDENTITY_DETAIL_REQUIRED',
      CONTACT:'FUNCTIONAL_CONTACT_JOINT_GRIP_FASTENER_OR_INTERACTION_DETAIL_REQUIRED'
    }),
    donorPolicy:Object.freeze({
      donorMayReplaceOnlyFailedAxes:true,
      donorMustPreserveStyleIdentity:true,
      donorMustPreserveSourceProvenance:true,
      donorCannotOverrideLockedIdentityAnchors:true,
      mixedDonorAssemblyRequiresCompatibility:true
    }),
    evidence:Object.freeze({
      actualRuntimeCaptureRequiredForVisualClosure:true,
      sourceHashRequiredForDerivedRepair:true,
      verificationStatusIsNotVisualQuality:true,
      polygonTextureCountIsNotQuality:true,
      declarationOnlyPassForbidden:true
    }),
    rescue:Object.freeze({
      preservePassingAxes:true,
      repairFailedAxesOnly:true,
      fullReauthorOnlyAfterTargetedRepairFails:true,
      randomDetailInflationForbidden:true
    })
  });
}

function assetApplyFirstCandidate(asset={},target='',binding={}){
  const platform=clean(target).toLowerCase();
  const requestedType=clean(binding?.type).toLowerCase();
  const actorType=['character','enemy','boss'].includes(requestedType);
  const variant=asset?.platformVariants?.[platform.toUpperCase()]||asset?.platformVariants?.[platform]||null;
  const sameGame=asset.sameGameExistingRoblox===true&&platform==='roblox';
  const hasNativeReference=Boolean(sameGame&&(asset.path||asset.robloxAssetId)||variant?.path||asset.path||asset.robloxAssetId);
  const actorMotionAdaptationRequired=actorType&&asset.adaptationBaseOnly===true&&asset.productionVerified!==true;
  const approximateAdaptationRequired=asset.approximateLibraryFallback===true;
  const internalRepositoryReady=asset.companyInternalSearchable===true&&asset.downloaded!==false&&hasNativeReference&&!actorMotionAdaptationRequired&&!approximateAdaptationRequired;
  const nativeReady=Boolean(asset.productionVerified===true||(!actorMotionAdaptationRequired&&!approximateAdaptationRequired&&(sameGame||variant?.path||internalRepositoryReady)));
  const adaptable=Boolean(!nativeReady&&hasNativeReference&&(actorMotionAdaptationRequired||approximateAdaptationRequired||asset.retargetable===true||asset.rigType||asset.sourceHash));
  const lane=nativeReady?(sameGame?'A_SAME_GAME_BOUND':'B_NATIVE_READY'):adaptable?'C_MINIMAL_ADAPT':'D_AUTHORING_REQUIRED';
  const bindingCost=lane==='A_SAME_GAME_BOUND'?0:lane==='B_NATIVE_READY'?1:lane==='C_MINIMAL_ADAPT'?2:3;
  const roleTokens=unique([requestedType,...(binding?.targetStates||[]).map(clean)]).map(value=>value.toLowerCase()).filter(Boolean);
  const tags=(asset.tags||[]).map(value=>clean(value).toLowerCase());
  const roleMatches=roleTokens.filter(token=>tags.some(tag=>tag.includes(token)||token.includes(tag))).length;
  const compatibilityScore=
    (lane==='A_SAME_GAME_BOUND'?50:lane==='B_NATIVE_READY'?40:lane==='C_MINIMAL_ADAPT'?25:0)
    +(asset.sameGameExistingRoblox===true?15:0)
    +(asset.productionVerified===true?8:0)
    +(asset.companyVerified===true?4:0)
    +Math.min(20,roleMatches*6)
    +(asset.approximateLibraryFallback===true?-12:0)
    +(asset.sourceHash?5:0)
    +(asset.retargetable===true?5:0);
  const qualityDNA=qualityDnaForType(requestedType);
  const qualityAxes=qualityDNA.axes;
  const donorCapabilities=freezeList(unique([
    asset.sourceHash?'GEOMETRY_OR_SOURCE_DONOR':'',
    asset.rigType?'RIG_DONOR':'',
    asset.retargetable===true?'MOTION_RETARGET_DONOR':'',
    Object.keys(asset.platformVariants||{}).length?'NATIVE_VARIANT_DONOR':'',
    /ui/i.test(requestedType)?'ICON_OR_STATE_STYLE_DONOR':'',
    /background|environment|prop/i.test(requestedType)?'MATERIAL_OR_STRUCTURE_DONOR':''
  ]));
  return freeze({
    id:asset.id,
    sourceTier:asset.sourceTier,
    lane,
    mode:lane==='A_SAME_GAME_BOUND'?'PATCH_EXISTING_GAME_BINDING':lane==='B_NATIVE_READY'?'IMPORT_NATIVE_READY_ASSET':lane==='C_MINIMAL_ADAPT'?'ADAPT_THEN_APPLY':'AUTHORING_REQUIRED',
    bindingCost,
    compatibilityScore,
    roleMatches,
    path:asset.path||variant?.path||null,
    robloxAssetId:asset.robloxAssetId||null,
    sourceHash:asset.sourceHash||null,
    acquiredExternal:asset.acquiredExternal===true,
    acquisitionOrigin:asset.acquisitionOrigin||null,
    productionVerified:asset.productionVerified===true,
    approximateLibraryFallback:asset.approximateLibraryFallback===true,
    actorMotionAdaptationRequired,
    blankAssetForbidden:true,
    libraryBindingRequiredBeforeAuthoring:true,
    ready:Boolean(hasNativeReference&&asset.downloaded!==false&&lane!=='D_AUTHORING_REQUIRED'),
    adaptationAllowed:true,
    adaptationAxes:freezeList(lane==='C_MINIMAL_ADAPT'?unique([
      actorMotionAdaptationRequired?'MOTION_SOURCE_BINDING':'',
      actorMotionAdaptationRequired?'RIG_RETARGET':'',
      approximateAdaptationRequired?'ROLE_STYLE_ADAPTATION':'',
      'MATERIAL_REMAP','SOCKET_REBIND','SCALE_AXIS_PIVOT_NORMALIZE','LOD_GENERATION'
    ]):[]),
    qualityPassRequiredBeforeKeep:false,
    qualityScoreBlocksInitialUse:false,
    internalAuditScoreBlocksInitialUse:false,
    visualDebtRemainsOpenUntilImproved:true,
    runtimeCheckRequiredAfterApply:true,
    qualityDNA,
    qualityAxes:freezeList(qualityAxes),
    donorCapabilities,
    detailFloor:Object.freeze({
      GAME_CAMERA:'ROLE_SILHOUETTE_AND_FUNCTION',
      MID_RANGE:'STRUCTURE_PARTS_AND_SECONDARY_FORMS',
      CLOSEUP:'CONSTRUCTION_MATERIAL_AND_IDENTITY',
      CONTACT:'JOINT_GRIP_FASTENER_FOOTING_AND_INTERACTION'
    }),
    rescueLadder:freezeList([
      'KEEP_STRONG_BASE_IDENTITY',
      'FIX_ONLY_FAILED_QUALITY_AXES',
      'RECOMPOSE_COMPATIBLE_PART_DONORS',
      'REAUTHOR_MATERIAL_AND_SURFACE_RESPONSE',
      'REBUILD_RIG_SOCKET_OR_CONTACT_IF_NEEDED',
      'REAUTHOR_MOTION_OR_SECONDARY_MOTION_IF_NEEDED',
      'BUILD_PLATFORM_NATIVE_LOD_AND_PRESENTATION_VARIANT',
      'FULL_REAUTHOR_ONLY_WHEN_CORE_FORM_OR_STRUCTURE_CANNOT_BE_SAVED'
    ]),
    derivedRepairAxes:freezeList(qualityAxes),
    fullReauthorTrigger:'CORE_IDENTITY_OR_STRUCTURAL_QUALITY_STILL_BLOCKED_AFTER_TARGETED_DERIVATION',
    randomDetailInflationForbidden:true,
    sourceAssetMayRemainAsPartialDonorAfterReplacement:true,
    visualQualityNotImpliedByVerification:true,
    detailInvestmentPolicy:Object.freeze({
      prioritySignals:Object.freeze(['SCREEN_SPACE_OCCUPANCY','PLAYER_DWELL_TIME','INTERACTION_FREQUENCY','HERO_BOSS_SIGNATURE_ROLE','CAMERA_PROXIMITY','GAMEPLAY_READABILITY','REPEATED_VISIBILITY']),
      highPriority:Object.freeze(['PLAYER_OR_HERO','PRIMARY_ENEMY_OR_BOSS','SIGNATURE_WEAPON_OR_TOOL','KEY_LANDMARK_OR_HUB','FREQUENT_INTERACTION_UI']),
      lowPriorityMayUseSimplifiedDetail:true,
      distantOrRareAssetMayUseLODAndMaterialSimplification:true,
      importantAssetMayNotBeKeptLowDetailBecauseItIsAlreadyVerified:true,
      polygonOrTextureCountAloneIsNotQuality:true
    })
  });
}


function createConceptFitContract({task={},requestedConcept={},binding={}}={}){
  const weightedStyles=Array.isArray(requestedConcept?.styles)?requestedConcept.styles.map(row=>freeze({
    family:clean(row?.family||row?.styleFamily||row?.id),
    weight:Number(row?.weight??row?.ratio??1)||1
  })).filter(row=>row.family):[];
  const primaryStyle=clean(task.styleFamily||task.style)||weightedStyles.sort((a,b)=>b.weight-a.weight)[0]?.family||null;
  const visualLanguages=task.visualLanguages&&typeof task.visualLanguages==='object'?task.visualLanguages:{};
  const worldDna=task.worldDna&&typeof task.worldDna==='object'?task.worldDna:task.mapDna&&typeof task.mapDna==='object'?task.mapDna:{};
  const role=clean(binding?.type).toUpperCase()||'ASSET';
  return freeze({
    version:1,
    role,
    primaryStyle,
    weightedStyles:freezeList(weightedStyles),
    artTone:freezeList(Array.isArray(requestedConcept?.artTone)?requestedConcept.artTone:[]),
    worldEra:freezeList(Array.isArray(requestedConcept?.worldEra)?requestedConcept.worldEra:[]),
    combatFeel:freezeList(Array.isArray(requestedConcept?.combatFeel)?requestedConcept.combatFeel:[]),
    presentation:freezeList(Array.isArray(requestedConcept?.presentation)?requestedConcept.presentation:[]),
    customTags:freezeList(Array.isArray(requestedConcept?.customTags)?requestedConcept.customTags:[]),
    visualLanguages:freeze({...visualLanguages}),
    worldDna:freeze({...worldDna}),
    requiredChecks:freezeList([
      'STYLE_FAMILY_AND_RENDER_LANGUAGE',
      'WORLD_ERA_AND_TECHNOLOGY_LANGUAGE',
      'SILHOUETTE_VOCABULARY',
      'MATERIAL_LANGUAGE',
      'PALETTE_VALUE_AND_CONTRAST_HIERARCHY',
      'GAMEPLAY_ROLE_READABILITY',
      'NEIGHBOR_ASSET_COHERENCE',
      ...(role==='UI'?['UI_SHAPE_ICON_TYPOGRAPHY_LANGUAGE']:[]),
      ...(role==='ANIMATION'?['MOTION_PERSONALITY_WEIGHT_AND_RHYTHM']:[]),
      ...(['BACKGROUND','PROP','ENVIRONMENT'].includes(role)?['BIOME_ARCHITECTURE_AND_PROP_DENSITY_LANGUAGE']:[])
    ]),
    referenceMode:'ADVISORY_TRANSFORM_TARGET',
    conceptMismatchIsAutomaticReject:false,
    mismatchSignals:freezeList([
      'REALISM_LEVEL_DIFFERS_FROM_GAME_STYLE',
      'ERA_OR_TECHNOLOGY_DIFFERS_FROM_WORLD_LANGUAGE',
      'SILHOUETTE_OR_PROPORTION_DIFFERS_FROM_FACTION_SPECIES_OR_ROLE_LANGUAGE',
      'MATERIAL_OR_PALETTE_DIFFERS_FROM_WORLD_VISUAL_DNA',
      'MOTION_PERSONALITY_DIFFERS_FROM_CHARACTER_WEIGHT_OR_COMBAT_FEEL',
      'UI_GRAMMAR_DIFFERS_FROM_EXISTING_INTERFACE_LANGUAGE'
    ]),
    adaptationClasses:freezeList(['DIRECT_FIT','TRANSFORMABLE_FIT','DONOR_ONLY','REAUTHOR_MORE_EFFICIENT']),
    mismatchHandling:freeze({
      applyInCandidateContextBeforeFinalDecision:true,
      transformableMismatchMayBecomeFinalAsset:true,
      compatiblePartDonorAllowed:true,
      donorAxesUseConceptAsReferenceNotHardGate:true,
      currentGameContextCapturePreferred:true,
      compareBeforeAndAfterTransformation:true,
      stopTransformingWhenNewAuthoringIsLowerCostOrHigherQuality:true
    }),
    transformationLadder:freezeList([
      'PALETTE_VALUE_CONTRAST_GRADE',
      'MATERIAL_SHADER_SURFACE_REMAP',
      'ORNAMENT_DECAL_TRIM_ADD_REMOVE',
      'SILHOUETTE_AND_PROPORTION_STYLIZATION',
      'ERA_TECHNOLOGY_DETAIL_REDESIGN',
      'RIG_SOCKET_CONTACT_ADAPTATION',
      'MOTION_POSE_WEIGHT_RHYTHM_ADAPTATION',
      'UI_SHAPE_ICON_TYPOGRAPHY_ADAPTATION',
      'PLATFORM_NATIVE_LOD_AND_READABILITY'
    ]),
    transformationRules:freeze({
      smallestEffectiveChangeFirst:true,
      preserveUsefulHighQualityStructure:true,
      preserveGameplayFunctionAndHitSemantics:true,
      recolorMayBeEnoughForPaletteOnlyMismatch:true,
      structuralMismatchRequiresStructuralEditNotOnlyRecolor:true,
      eraMismatchMayBeReworkedByRemovingReplacingTechnologySpecificDetails:true,
      silhouetteMismatchMayBeReworkedByProportionPartAndAccessoryChanges:true,
      motionMismatchMayBeReworkedWithoutChangingGameplayTimingAuthority:true,
      uiMismatchMayBeReworkedWithoutChangingGameplayRules:true
    }),
    comparisonContext:freeze({
      sameCameraLightingDistanceAction:true,
      compareNextToExistingNeighborAssets:true,
      gameCameraFirst:true,
      closeupSecondary:true,
      mobileReadabilityRequired:true
    }),
    evidenceRule:'CURRENT_GAME_STYLE_BIBLE_VISUAL_DNA_AND_ACTUAL_RUNTIME_CONTEXT_BEAT_GENERIC_ASSET_QUALITY',
    runtimeVerified:false,
    selectedAssetId:null
  });
}

function createPostDownloadInternalComparison({matched=[],target='',binding={},conceptFit=null}={}){
  const internal=matched.filter(asset=>asset.acquiredExternal!==true&&[
    'VERIFIED_COMPANY_ASSET','SAME_GAME_EXISTING_ROBLOX_ASSET','LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET'
  ].includes(asset.sourceTier));
  const acquired=matched.filter(asset=>asset.acquiredExternal===true);
  const externalRows=acquired.map(asset=>assetApplyFirstCandidate(asset,target,binding))
    .sort((a,b)=>b.compatibilityScore-a.compatibilityScore||a.bindingCost-b.bindingCost||a.id.localeCompare(b.id));
  const internalRows=internal.map(asset=>assetApplyFirstCandidate(asset,target,binding))
    .sort((a,b)=>b.compatibilityScore-a.compatibilityScore||a.bindingCost-b.bindingCost||a.id.localeCompare(b.id));
  const downloadedAssetIds=new Set(acquired.filter(asset=>asset.downloaded!==false&&Boolean(asset.path||asset.robloxAssetId||Object.keys(asset.platformVariants||{}).length)).map(asset=>asset.id));
  const downloaded=externalRows.filter(row=>downloadedAssetIds.has(row.id));
  const comparisonReady=downloaded.filter(row=>row.ready&&row.sourceHash);
  const pending=externalRows.filter(row=>!downloadedAssetIds.has(row.id));
  const unhashed=downloaded.filter(row=>!row.sourceHash);
  const required=externalRows.length>0&&internalRows.length>0;
  const status=!required?'NOT_REQUIRED'
    :pending.length?'DOWNLOAD_REQUIRED_BEFORE_INTERNAL_COMPARISON'
    :unhashed.length?'DOWNLOADED_EXTERNAL_SOURCE_HASH_REQUIRED'
    :'READY_FOR_SAME_CONDITION_COMPARISON';
  return freeze({
    required,status,
    externalCandidateIds:freezeList(externalRows.map(row=>row.id)),
    downloadedExternalCandidateIds:freezeList(downloaded.map(row=>row.id)),
    comparisonReadyExternalCandidateIds:freezeList(comparisonReady.map(row=>row.id)),
    pendingDownloadCandidateIds:freezeList(pending.map(row=>row.id)),
    unhashedDownloadedCandidateIds:freezeList(unhashed.map(row=>row.id)),
    internalBaselineCandidateIds:freezeList(internalRows.slice(0,6).map(row=>row.id)),
    comparisonViews:freezeList(['GAME_CAMERA','MID_RANGE','CLOSEUP','CONTACT']),
    hardGates:freezeList(['LICENSE_AND_PROVENANCE','SOURCE_HASH','TARGET_PLATFORM_IMPORT','NO_RUNTIME_ERROR','MOBILE_PERFORMANCE_BUDGET']),
    qualityAxes:freezeList(['GAME_STYLE_FIT','CONCEPT_AND_WORLD_COHERENCE','SILHOUETTE_AND_READABILITY','MATERIAL_AND_SURFACE_DETAIL','PROPORTION_AND_SCALE','RIG_CONTACT_OR_INTERACTION','MOTION_AND_SECONDARY_MOTION','DETAIL_BY_DISTANCE']),
    conceptFit,
    conceptFitReferenceOnly:true,
    conceptMismatchBlocksFullReplacement:false,
    conceptTransformationPreferredWhenFeasible:true,
    conceptCompatibleDonorUseAllowed:true,
    testApplyBeforeConceptDecision:true,
    sameConditionsRequired:true,
    sameCameraLightingDistanceActionRequired:true,
    actualRuntimePixelsRequiredForVisualWinner:true,
    noPreDownloadWinner:true,
    externalFullReplacementRule:'AFTER_OPTIONAL_CONCEPT_TRANSFORMATION_MUST_IMPROVE_AT_LEAST_ONE_CORE_QUALITY_AXIS_WITHOUT_REGRESSING_ANY_PROTECTED_CORE_AXIS',
    transformableMismatchRule:'TEST_APPLY_THEN_TRANSFORM_TOWARD_GAME_CONCEPT_AND_RECOMPARE_BEFORE_REJECTING',
    mixedResultRule:'KEEP_BEST_BASE_AND_RECOMPOSE_PROVEN_PART_RIG_MATERIAL_MOTION_OR_DETAIL_DONORS',
    comparableQualityRule:'KEEP_INTERNAL_ASSET',
    bothFailRule:'DERIVE_TARGETED_REPAIR_THEN_NEW_AUTHORING_LAST',
    internalTieBreakWhenQualityComparable:true,
    licenseOrRuntimeFailureDisqualifiesExternal:true,
    sourcePreferenceAppliedOnlyAfterQualityComparison:true,
    selectedAssetId:null,
    runtimeVerified:false,
    gameplayAuthority:false
  });
}

function decisionFor(selector={},target='',binding={},manifest={},conceptContext={}){
  const type=clean(binding.type);
  const qualityDNA=qualityDnaForType(type);
  const matched=matchedForType(selector,type,manifest,target);
  const sameGameCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='SAME_GAME_EXISTING_ROBLOX_ASSET'));
  const companyCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='VERIFIED_COMPANY_ASSET'));
  const repositoryCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET'));
  const externalCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXTERNAL_ASSET'));
  const reuseCandidates=freezeList([...companyCandidates,...sameGameCandidates,...repositoryCandidates]);
  const directAuthoring=directAuthoringFor(target,type);
  const candidateRows=freezeList([...reuseCandidates,...externalCandidates].map(asset=>assetApplyFirstCandidate(asset,target,binding)));
  const applyFirstCandidates=freezeList(candidateRows.filter(row=>row.ready).sort((a,b)=>b.compatibilityScore-a.compatibilityScore||a.bindingCost-b.bindingCost||a.id.localeCompare(b.id)));
  const donorCandidates=freezeList(candidateRows.filter(row=>row.sourceHash&&row.donorCapabilities.length).sort((a,b)=>b.compatibilityScore-a.compatibilityScore||a.bindingCost-b.bindingCost||a.id.localeCompare(b.id)));
  const conceptFit=createConceptFitContract({task:conceptContext.task||{},requestedConcept:conceptContext.requestedConcept||{},binding});
  const postDownloadComparison=createPostDownloadInternalComparison({matched,target,binding,conceptFit});
  const preferredCandidateId=postDownloadComparison.required?null:(applyFirstCandidates[0]?.id||null);
  const approximateLibraryCandidates=freezeList(reuseCandidates.filter(asset=>asset.approximateLibraryFallback===true));
  const decisionOrder=unique([
    'COMPARE_TARGET_GAME_QUALITY',
    companyCandidates.length?'REUSE_VERIFIED_COMPANY_ASSET':'',
    sameGameCandidates.length?'REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET':'',
    repositoryCandidates.length?'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET':'',
    approximateLibraryCandidates.length?'REUSE_CLOSEST_COMPATIBLE_LIBRARY_ASSET_WITH_STYLE_ADAPTATION':'',
    externalCandidates.length?'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET':'',
    postDownloadComparison.required?'POST_DOWNLOAD_COMPARE_EXTERNAL_TO_INTERNAL':'',
    'OPEN_VISUAL_DEBT_AFTER_INITIAL_BINDING',
    directAuthoring.length?'VIBE_DIRECT_AUTHOR':'',
    'AUTHORING_GENERATOR_REQUEST'
  ]);
  const motionReusePlan=type==='animation'?freeze({
    studioProduction:['roblox','unity'].includes(target)?createMotionDirectorPlan({platform:target.toUpperCase()}).studioProduction:null,
    // Declared clip coverage is a selection aid, never runtime proof.
    stateBindings:freezeList((binding.targetStates||[]).map(state=>{
      const matches=[...reuseCandidates,...externalCandidates].filter(asset=>asset.motionStates.includes(clean(state).toLowerCase()));
      return freeze({state,candidateIds:freezeList(matches.map(asset=>asset.id)),runtimeVerified:false});
    })),
    unresolvedStates:freezeList((binding.targetStates||[]).filter(state=>![...reuseCandidates,...externalCandidates].some(asset=>asset.motionStates.includes(clean(state).toLowerCase())))),
    coverageUnknownCandidateIds:freezeList([...reuseCandidates,...externalCandidates].filter(asset=>!asset.motionStates.length).map(asset=>asset.id)),
    inspectUnknownCoverageBeforeNewAuthoring:true,
    preserveExistingGameplayTiming:true,
    requiredChecks:freezeList(['TARGET_GAME_ASSET_PERMISSION','RIG_AND_JOINT_COMPATIBILITY','ACTUAL_CLIP_PLAYBACK','TRANSITION_AND_INTERRUPT','MULTIPLAYER_SYNC']),
    runtimeVerified:false
  }):null;
  return freeze({
    type,
    qualityDNA,
    required:binding.required!==false,
    targetStates:freezeList(binding.targetStates||[]),
    sameGameCandidates,
    companyCandidates,
    repositoryCandidates,
    externalCandidates,
    reuseCandidates,
    approximateLibraryCandidates,
    blankAssetForbidden:true,
    geometricOrPrimitiveFallbackForbidden:true,
    libraryBindingRequired:true,
    qualityScoreBlocksLibraryBinding:false,
    internalAuditScoreBlocksLibraryBinding:false,
    applyFirst:freeze({
      enabled:applyFirstCandidates.length>0,
      candidates:applyFirstCandidates,
      preferredCandidateId,
      candidateLadder:freezeList(applyFirstCandidates.map((row,index)=>freeze({order:index+1,id:row.id,lane:row.lane,mode:row.mode,compatibilityScore:row.compatibilityScore,productionVerified:row.productionVerified}))),
      donorCandidates:freezeList(donorCandidates.map(row=>freeze({id:row.id,lane:row.lane,sourceTier:row.sourceTier,qualityAxes:row.qualityAxes,donorCapabilities:row.donorCapabilities,sourceHash:row.sourceHash}))),
      lanes:freezeList(['A_SAME_GAME_BOUND','B_NATIVE_READY','C_MINIMAL_ADAPT','D_AUTHORING_REQUIRED']),
      sequence:freezeList([
        'SELECT_CLOSEST_READY_LIBRARY_ASSET_EVEN_WHEN_QUALITY_IS_LOW',
        'APPLY_CANDIDATE_TO_EXISTING_GAME_RESPONSIBILITY',
        'FORBID_BLANK_GEOMETRIC_OR_NO_ASSET_STATE',
        'INSPECT_QUALITY_BY_AXIS_AND_DETAIL_DISTANCE',
        'KEEP_STRONG_AXES',
        'DERIVE_ONLY_FAILED_AXES',
        'USE_COMPATIBLE_ASSET_AS_PART_RIG_MATERIAL_OR_MOTION_DONOR_WHEN_BETTER',
        'REAPPLY_DERIVED_VARIANT',
        'ADVANCE_READY_CANDIDATE_IF_CORE_QUALITY_STILL_BLOCKED',
        'FULL_NEW_AUTHORING_ONLY_AFTER_RESCUE_AND_READY_CANDIDATES_FAIL'
      ]),
      qualityRescue:Object.freeze({
        axisBased:true,
        donorRecompositionAllowed:true,
        fullAssetReplacementNotDefault:true,
        preserveStrongAxes:true,
        preserveSourceProvenance:true,
        detailFloorRequired:true,
        randomDetailInflationForbidden:true,
        fullReauthorTrigger:'CORE_IDENTITY_OR_STRUCTURAL_QUALITY_STILL_BLOCKED_AFTER_TARGETED_DERIVATION'
      }),
      keepCondition:'RUNTIME_BINDING_PASS_WITH_VISUAL_DEBT_ALLOWED',
      deriveBeforeReplace:true,
      candidateFailureAdvancesLadder:true,
      failedCandidateCanRemainAsReusablePartDonor:true,
      fullReauthorOnlyAfterReusableCandidatesExhausted:true,
      sameGameBindingCostPreferredWhenQualityComparable:true,
      gameplayAuthority:false
    }),
    directAuthoring,
    decisionOrder:freezeList(decisionOrder),
    qualitySelection:freeze({
      requiredBeforeSourcePreference:true,
      companyOwnershipIsNotQualityEvidence:true,
      compareCandidateIds:freezeList([...reuseCandidates,...externalCandidates].map(asset=>asset.id)),
      requiredChecks:freezeList(type==='animation'
        ?['GAME_STYLE_FIT','RIG_AND_JOINT_COMPATIBILITY','FOOT_SLIDING_AND_CONTACT','TRANSITION_AND_INTERRUPT','ACTUAL_CLIP_PLAYBACK','MULTIPLAYER_SYNC']
        :['GAME_STYLE_FIT','SILHOUETTE_AND_READABILITY','MATERIAL_AND_SCALE_COHERENCE','TARGET_RUNTIME_AND_MOBILE_PERFORMANCE']),
      selectionState:postDownloadComparison.required?postDownloadComparison.status:'TARGET_GAME_REVIEW_REQUIRED',
      selectedAssetId:null,
      sourcePreferenceOnlyAfterQualityPass:true,
      initialLibraryBindingMustNotWaitForQualityScore:true,
      postDownloadInternalComparisonRequired:postDownloadComparison.required,
      conceptFitReferenceOnly:true,
      conceptTransformationAllowed:true
    }),
    conceptFit,
    postDownloadComparison,
    motionReusePlan,
    generatorFallback:freeze({
      route:'AUTHORING_GENERATOR_REQUEST',
      requestedKinds:BINARY_AUTHORING_KINDS,
      onlyWhenCompanyRepositoryExternalAndDirectAuthoringCannotMeetQuality:true,
      directBinaryTextEditForbidden:true,
      paidToolAutoInstallForbidden:true,
      outputContract:GENERATED_ASSET_OUTPUT_CONTRACT
    })
  });
}

function normalizeFlowAssetRequirements(requirements=[]){
  return freezeList((Array.isArray(requirements)?requirements:[]).map(row=>freeze({
    ...(row&&typeof row==='object'?row:{}),
    family:clean(row?.family).toUpperCase(),
    subfamily:clean(row?.subfamily).toUpperCase(),
    required:row?.required!==false,
    resolution:clean(row?.resolution)||'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',
    libraryEligibility:'CROSS_GENRE_COMPATIBLE_ASSETS',
    genreRestriction:false,
    crossGenreReuseAllowed:true,
    genreUse:'PREFERENCE_ONLY_NOT_ELIGIBILITY_GATE',
    assetIdPinned:false,
    gameplayAuthority:false,
    balanceAuthority:false,
    progressionAuthority:false,
    saveAuthority:false,
    networkingAuthority:false
  })).filter(row=>row.family));
}


function inferStyleExpressionOverridesFromText(value=''){
  const source=clean(value).toUpperCase();
  const out={};
  if(/ROUGH|GRITTY|WEATHERED|거칠|거친|황량|투박/.test(source))out.SURFACE_FEEL='ROUGH';
  else if(/SOFT|SMOOTH|GENTLE|부드|매끈|말랑/.test(source))out.SURFACE_FEEL='SOFT';
  if(/SHARP|ANGULAR|날카|각진|뾰족/.test(source))out.SHAPE_TEMPER='SHARP';
  else if(/ROUND|ROUNDED|둥글|원만/.test(source))out.SHAPE_TEMPER='ROUND';
  else if(/FLOWING|FLUID|유려|흐르는|곡선/.test(source))out.SHAPE_TEMPER='FLOWING';
  if(/EXTREME|EXAGGERATED|극단|과장/.test(source))out.EXPRESSION_INTENSITY='EXTREME';
  else if(/EXPRESSIVE|DRAMATIC|강렬|표현력.?강|표현이.?강/.test(source))out.EXPRESSION_INTENSITY='EXPRESSIVE';
  else if(/RESTRAINED|SUBTLE|절제|은은/.test(source))out.EXPRESSION_INTENSITY='RESTRAINED';
  if(/GLOSSY|유광|광택/.test(source))out.MATERIAL_FINISH='GLOSSY';
  else if(/MATTE|무광/.test(source))out.MATERIAL_FINISH='MATTE';
  else if(/WEATHERED|WORN|낡|마모|풍화/.test(source))out.MATERIAL_FINISH='WEATHERED';
  else if(/CLEAN|깔끔|깨끗/.test(source))out.MATERIAL_FINISH='CLEAN';
  if(/MUTED|LOW.?SATURATION|저채도|탁한|차분한 색/.test(source))out.COLOR_ENERGY='MUTED';
  else if(/HIGH.?CONTRAST|고대비/.test(source))out.COLOR_ENERGY='HIGH_CONTRAST';
  else if(/VIBRANT|SATURATED|선명|쨍한|화사/.test(source))out.COLOR_ENERGY='VIBRANT';
  if(/SELECTIVE.?DENSE|선택적.?디테일/.test(source))out.DETAIL_DENSITY='SELECTIVE_DENSE';
  else if(/DENSE|HIGH.?DETAIL|디테일.?많|촘촘|복잡/.test(source))out.DETAIL_DENSITY='DENSE';
  else if(/MINIMAL|단순|간결|미니멀/.test(source))out.DETAIL_DENSITY='MINIMAL';
  if(/HEAVY.?WORN|심한.?마모|낡고.?망가/.test(source))out.DAMAGE_WEAR='HEAVY_WORN';
  else if(/CLEAN|새것|깨끗/.test(source))out.DAMAGE_WEAR='CLEAN';
  if(/EXAGGERATED|과장.?모션|과장.?동작/.test(source))out.MOTION_ENERGY='EXAGGERATED';
  else if(/WEIGHTY|HEAVY|묵직/.test(source))out.MOTION_ENERGY='GROUNDED';
  else if(/DYNAMIC|역동|활기/.test(source))out.MOTION_ENERGY='EXPRESSIVE';
  if(/SPECTACULAR|FLASHY|화려|장관/.test(source))out.VFX_ENERGY='SPECTACULAR';
  else if(/PUNCHY|IMPACTFUL|타격감|강한.?피드백/.test(source))out.VFX_ENERGY='PUNCHY';
  if(/ORNATE|장식적|화려한.?UI/.test(source))out.UI_EXPRESSION='ORNATE';
  else if(/MINIMAL|미니멀/.test(source))out.UI_EXPRESSION='MINIMAL';
  else if(/BOLD|굵직|대담/.test(source))out.UI_EXPRESSION='BOLD';
  if(/CINEMATIC|EPIC|웅장|시네마틱/.test(source))out.AUDIO_ENERGY='CINEMATIC';
  else if(/PUNCHY|타격감/.test(source))out.AUDIO_ENERGY='PUNCHY';
  if(/OPPRESSIVE|CLAUSTROPHOBIC|압박|음산|숨막/.test(source))out.ATMOSPHERE_WEIGHT='OPPRESSIVE';
  else if(/AIRY|OPEN|맑고.?가벼|개방적/.test(source))out.ATMOSPHERE_WEIGHT='AIRY';
  return out;
}

function buildReferenceDrivenAssetIdeaWorklist({studies=[],request='',characterCustomizationRequested=false}={}){
  const requestText=clean(request).toUpperCase();
  const normalizeDomain=value=>{
    const token=clean(value).toUpperCase();
    if(['PROP','WORLD_PROP','WORLDPROP'].includes(token))return'WORLD_PROP';
    if(['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','UI','ITEM','MATERIAL','VFX','MOTION','PRESENTATION','CHARACTER_GEAR'].includes(token))return token;
    return'';
  };
  const inferredDomain=characterCustomizationRequested?'CHARACTER'
    :/BUILDING|HOUSE|CASTLE|건물|집|성|하우징/.test(requestText)?'BUILDING'
    :/CREATURE|MONSTER|ANIMAL|몬스터|동물|몹|생물/.test(requestText)?'CREATURE'
    :/WEAPON|SWORD|GUN|무기|검|총|창|활/.test(requestText)?'WEAPON'
    :/\bUI\b|HUD|MENU|인벤토리|메뉴|버튼/.test(requestText)?'UI'
    :/PROP|FURNITURE|소품|가구|상자/.test(requestText)?'WORLD_PROP'
    :'ENVIRONMENT';
  const axisMaps=Object.freeze({
    CHARACTER:Object.freeze({
      SILHOUETTE:Object.freeze(['BODY_ARCHETYPE','HEAD_BASE']),
      PROPORTIONS:Object.freeze(['BODY_PROPORTION','FACE_MORPH']),
      MATERIAL_REGIONS:Object.freeze(['SKIN_TONE','SKIN_DETAIL','CLOTHING']),
      PALETTE:Object.freeze(['SKIN_TONE','EYE_COLOR','HAIR_COLOR']),
      CONSTRUCTION_DETAILS:Object.freeze(['HAIR_STYLE','PIERCING_ACCESSORY','CLOTHING_LAYER']),
      STYLE_LANGUAGE:Object.freeze(['EXPRESSION','GAIT_IDENTITY']),
      IDENTITY_ANCHORS:Object.freeze(['SCAR_TATTOO_MAKEUP','SPECIES_PART'])
    }),
    BUILDING:Object.freeze({
      SILHOUETTE:Object.freeze(['MASSING_FAMILY','ROOF_PROFILE','FACADE_PROFILE']),
      PROPORTIONS:Object.freeze(['FLOOR_HEIGHT_RATIO','BAY_SPACING','ENTRY_SCALE']),
      MATERIAL_REGIONS:Object.freeze(['WALL_ROOF_TRIM_SPLIT','FOUNDATION_MATERIAL_ZONE']),
      PALETTE:Object.freeze(['ARCHITECTURE_PALETTE_VARIANT','ACCENT_CONTRAST']),
      CONSTRUCTION_DETAILS:Object.freeze(['FOUNDATION_WALL_ROOF_JOINERY','WINDOW_DOOR_TRIM','DAMAGE_REPAIR_DETAIL']),
      STYLE_LANGUAGE:Object.freeze(['BUILDING_THEME_GRAMMAR','REGIONAL_ARCHITECTURE_VARIANT']),
      IDENTITY_ANCHORS:Object.freeze(['LANDMARK_ACCENT','SIGNAGE_PROP_SOCKET'])
    }),
    CREATURE:Object.freeze({
      SILHOUETTE:Object.freeze(['BODY_PLAN_VARIANT','HEAD_APPENDAGE_PROFILE','TAIL_WING_HORN_PROFILE']),
      PROPORTIONS:Object.freeze(['TORSO_LIMB_RATIO','HEAD_BODY_RATIO','SIZE_AGE_VARIANT']),
      MATERIAL_REGIONS:Object.freeze(['SKIN_FUR_SCALE_SHELL_ZONES','ARMOR_SOFT_TISSUE_SPLIT']),
      PALETTE:Object.freeze(['BIOME_SURFACE_VARIANT','ELITE_BOSS_PALETTE_ACCENT']),
      CONSTRUCTION_DETAILS:Object.freeze(['JOINT_ARTICULATION','MOUTH_EYE_CLAW_DETAIL','RIG_CONTACT_DETAIL']),
      STYLE_LANGUAGE:Object.freeze(['SPECIES_STYLE_LANGUAGE','LOCOMOTION_WEIGHT_LANGUAGE']),
      IDENTITY_ANCHORS:Object.freeze(['SPECIES_SIGNATURE_PART','ELITE_BOSS_ORNAMENT'])
    }),
    WEAPON:Object.freeze({
      SILHOUETTE:Object.freeze(['WEAPON_PROFILE_FAMILY','BLADE_HEAD_SHAFT_PROFILE']),
      PROPORTIONS:Object.freeze(['GRIP_REACH_RATIO','HEAD_BLADE_WEIGHT_RATIO']),
      MATERIAL_REGIONS:Object.freeze(['GRIP_GUARD_BLADE_MATERIAL_SPLIT','EDGE_CORE_TRIM_SPLIT']),
      PALETTE:Object.freeze(['MATERIAL_TIER_PALETTE','FACTION_ACCENT']),
      CONSTRUCTION_DETAILS:Object.freeze(['FASTENER_JOINERY','GRIP_SOCKET','DAMAGE_WEAR_DETAIL']),
      STYLE_LANGUAGE:Object.freeze(['WEAPON_THEME_LANGUAGE','ERA_TECH_DETAIL']),
      IDENTITY_ANCHORS:Object.freeze(['SIGNATURE_ORNAMENT','IMPACT_TRAIL_SOCKET'])
    }),
    UI:Object.freeze({
      SILHOUETTE:Object.freeze(['PANEL_CARD_SHAPE_LANGUAGE','ICON_SILHOUETTE_FAMILY']),
      PROPORTIONS:Object.freeze(['INFORMATION_HIERARCHY_RATIO','CONTROL_DENSITY_SPACING']),
      MATERIAL_REGIONS:Object.freeze(['SURFACE_DEPTH_LAYER','BORDER_FILL_ICON_REGION']),
      PALETTE:Object.freeze(['VALUE_CONTRAST_SYSTEM','STATE_COLOR_LANGUAGE']),
      CONSTRUCTION_DETAILS:Object.freeze(['PRESSED_SELECTED_DISABLED_STATES','TOUCH_TARGET_FEEDBACK','SMALL_SIZE_DETAIL']),
      STYLE_LANGUAGE:Object.freeze(['UI_GRAMMAR_VARIANT','TYPOGRAPHY_SPACING_LANGUAGE']),
      IDENTITY_ANCHORS:Object.freeze(['SIGNATURE_FRAME_MOTIF','ICON_MOTIF_FAMILY'])
    }),
    ENVIRONMENT:Object.freeze({
      SILHOUETTE:Object.freeze(['HORIZON_PROFILE','LANDMARK_MASSING','FOREGROUND_MIDGROUND_BACKGROUND_DEPTH']),
      PROPORTIONS:Object.freeze(['OPEN_CLOSED_SPACE_RATIO','VERTICALITY_RATIO','LANDMARK_SCALE']),
      MATERIAL_REGIONS:Object.freeze(['GROUND_ROCK_WATER_VEGETATION_ZONES','BUILT_NATURAL_SPLIT']),
      PALETTE:Object.freeze(['ATMOSPHERE_LIGHTING_PALETTE','WEATHER_TIME_VARIANT']),
      CONSTRUCTION_DETAILS:Object.freeze(['TERRAIN_TRANSITION','SET_DRESSING_CLUSTER','SETTLEMENT_EDGE_DETAIL']),
      STYLE_LANGUAGE:Object.freeze(['BIOME_STYLE_LANGUAGE','WORLD_DENSITY_LANGUAGE']),
      IDENTITY_ANCHORS:Object.freeze(['LANDMARK_TYPE_FAMILY','DISCOVERY_ROUTE_CUE'])
    }),
    WORLD_PROP:Object.freeze({
      SILHOUETTE:Object.freeze(['PROP_PROFILE_FAMILY','FUNCTION_READABLE_SHAPE']),
      PROPORTIONS:Object.freeze(['HANDLE_BODY_BASE_RATIO','INTERACTION_SCALE']),
      MATERIAL_REGIONS:Object.freeze(['STRUCTURE_SURFACE_TRIM_SPLIT','CONTACT_WEAR_ZONE']),
      PALETTE:Object.freeze(['PROP_THEME_PALETTE','STATE_ACCENT']),
      CONSTRUCTION_DETAILS:Object.freeze(['HINGE_FASTENER_HANDLE_DETAIL','INTERACTION_STATE_VARIANT','DAMAGE_REPAIR_VARIANT']),
      STYLE_LANGUAGE:Object.freeze(['PROP_THEME_LANGUAGE','SET_DRESSING_VARIANT']),
      IDENTITY_ANCHORS:Object.freeze(['INTERACTION_AFFORDANCE','SIGNATURE_FUNCTION_PART'])
    })
  });
  const fallbackMap=Object.freeze({
    SILHOUETTE:Object.freeze(['PRIMARY_FORM_VARIATION']),
    PROPORTIONS:Object.freeze(['PROPORTION_VARIATION']),
    MATERIAL_REGIONS:Object.freeze(['MATERIAL_REGION_VARIATION']),
    PALETTE:Object.freeze(['PALETTE_VARIATION']),
    CONSTRUCTION_DETAILS:Object.freeze(['CONSTRUCTION_DETAIL_VARIATION']),
    STYLE_LANGUAGE:Object.freeze(['STYLE_LANGUAGE_VARIATION']),
    IDENTITY_ANCHORS:Object.freeze(['IDENTITY_ANCHOR_VARIATION'])
  });
  const rows=[];
  for(const study of studies||[]){
    if(!study?.observation?.valid||!study?.request?.sourceId)continue;
    const explicitDomains=unique([
      study?.domainHint,
      ...(Array.isArray(study?.domainHints)?study.domainHints:[])
    ]).map(normalizeDomain).filter(Boolean);
    const domains=characterCustomizationRequested?['CHARACTER']:(explicitDomains.length?explicitDomains:[inferredDomain]);
    for(const domain of domains){
      const map=axisMaps[domain]||fallbackMap;
      for(const [featureKey,axes] of Object.entries(map)){
        if(!clean(study.observation?.features?.[featureKey]))continue;
        for(const axis of axes){
          const sourceToken=clean(study.request.sourceId).toUpperCase().replace(/[^A-Z0-9]+/g,'_');
          rows.push(freeze({
            kind:'REFERENCE_IMAGE_IDEA',
            domain,
            ideaId:['REFERENCE',sourceToken,domain,axis].join('_'),
            referenceSourceId:clean(study.request.sourceId),
            referenceSourceHash:clean(study.request.sourceHash)||null,
            referenceImageRef:clean(study.request.imageRef)||null,
            referenceFeature:featureKey,
            referenceFeatureSummary:clean(study.observation.features[featureKey]),
            customizationAxis:axis,
            priority:285,
            sourceBound:true,
            verifiedAgainstSource:study.observation.verifiedAgainstSource===true,
            ideaOnly:true,
            directCopyForbidden:true,
            sourceImagePersistentLearningForbidden:true,
            unseenGeometryAndMotionRemainCreativeProposals:true,
            productionVerified:false
          }));
        }
      }
    }
  }
  return freezeList(rows.filter((row,index,list)=>list.findIndex(other=>other.ideaId===row.ideaId)===index).slice(0,96));
}

export function buildVibeAssetProductionPlan({
  task={},
  target='',
  repoRoot=process.cwd(),
  manifest=null,
  presetCatalog=null,
  verifiedLearning=null,
  executionLane=''
}={}){
  const targetResolution=resolveAssetProductionTarget({target,task,repoRoot});
  const resolvedTarget=targetResolution.target;
  const flowAssetRequirements=normalizeFlowAssetRequirements(task.assetRequirements);
  const manifestBase=manifest||readJson(path.join(repoRoot,'assets','asset-manifest.json'),{version:0,assets:[]});
  const companyRegistry=companyAssetLibraryRegistry(repoRoot);
  const libraryAutomation=companyRegistry?.internalAssetLibraryAutomation||{};
  const executionCatalogs=commonCatalogFiles(repoRoot).map(file=>({path:path.relative(repoRoot,file).replaceAll('\\','/'),catalog:readJson(file,{})})).filter(row=>row.catalog?.packId);
  const executionUiCatalog=executionCatalogs.find(row=>row.catalog.packId==='roblox-common-ui-v1')?.catalog||{};
  const executionSeedPlan=createCompanySeedAssetIdeationPlan({seeds:companySeedRows(repoRoot),assets:companyRegistry?.assets||[]});
  const executionLibraryPlan=buildInternalAssetLibraryAutomationPlan({
    assets:companyRegistry?.assets||[],
    seedPlan:executionSeedPlan,
    uiAtomIds:(executionUiCatalog.atoms||[]).map(row=>row.atomId),
    audioRoleIds:collectCommonCatalogAudioRoles(executionCatalogs),
    externalSources:companyRegistry?.externalSources||[]
  });
  const persistedWorklistFresh=
    Number(libraryAutomation.lastCatalogSynchronizedVersion)===Number(companyRegistry?.version)
    &&Array.isArray(libraryAutomation.nextVolumeActions);
  const activeNextVolumeActions=
    executionLibraryPlan.focusPhase==='VOLUME_UP'
      ?(persistedWorklistFresh&&libraryAutomation.nextVolumeActions.length
        ?libraryAutomation.nextVolumeActions
        :(executionLibraryPlan.nextVolumeActions||[]))
      :[];
  const internalLibraryEvolution=freeze({
    phase:clean(executionLibraryPlan.focusPhase||libraryAutomation.focusPhase)||'VOLUME_UP',
    volumeReady:executionLibraryPlan.volumeReady===true,
    qualityTarget:Number(executionLibraryPlan.qualityTarget||libraryAutomation.qualityTarget||1000),
    volumeBlockingDomains:freezeList((executionLibraryPlan.volumeBlockingDomains||[]).map(row=>row?.domain).filter(Boolean)),
    uiBlockingSubsystems:freezeList((executionLibraryPlan.uiBlockingSubsystems||[]).map(row=>row?.subsystem).filter(Boolean)),
    volumeHealth:freeze({...libraryAutomation.volumeHealth,...executionLibraryPlan.volumeHealth}),
    qualityHealth:freeze({...libraryAutomation.qualityHealth,...executionLibraryPlan.qualityHealth}),
    assetManagementHealth:freeze({...libraryAutomation.assetManagementHealth}),
    referenceBreadthProfiles:freezeList(Object.keys(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES)),
    progressionComplexityProfiles:freezeList(Object.keys(INTERNAL_PROGRESSION_COMPLEXITY_PROFILES)),
    nextVolumeActions:freezeList(activeNextVolumeActions),
    activeNextVolumeAction:activeNextVolumeActions[0]||null,
    worklistSource:persistedWorklistFresh&&libraryAutomation.nextVolumeActions.length?'COMPANY_ASSET_LIBRARY_PERSISTED':'CURRENT_EXECUTION_RECOMPUTED',
    consumePersistedNextVolumeActionsFirst:true,
    persistentWorklistField:clean(executionLibraryPlan.persistentWorklistField||libraryAutomation.persistentWorklistField)||'internalAssetLibraryAutomation.nextVolumeActions',
    reuseResolutionOrder:freezeList(executionLibraryPlan.reuseResolutionOrder||libraryAutomation.reuseResolutionOrder||['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING']),
    freeOriginalVolumePolicy:freeze({...libraryAutomation.freeOriginalVolumePolicy,...executionLibraryPlan.freeOriginalVolumePolicy}),
    eligibleFreeSourceCount:Number(executionLibraryPlan.eligibleFreeSourceCount||0),
    freeSourceCandidateLimitPerAction:Number(executionLibraryPlan.freeSourceCandidateLimitPerAction||libraryAutomation.freeSourceCandidateLimitPerAction||8),
    freeSourceCatalogSufficiencyCount:Number(executionLibraryPlan.freeSourceCatalogSufficiencyCount||libraryAutomation.freeSourceCatalogSufficiencyCount||12),
    freeSourceCatalogReady:executionLibraryPlan.freeSourceCatalogReady===true,
    freeSourceCatalogExpansionMode:clean(executionLibraryPlan.freeSourceCatalogExpansionMode||libraryAutomation.freeSourceCatalogExpansionMode)||'TARGETED_GAP_ONLY',
    primaryAttention:clean(executionLibraryPlan.primaryAttention||libraryAutomation.primaryAttention)||'TARGETED_SOURCE_GAP_AND_QUALITY',
    qualityUpPolicy:freeze({
      ...(libraryAutomation.qualityUpPolicy||{}),
      ...(executionLibraryPlan.qualityUpPolicy||{}),
      selection:clean(executionLibraryPlan.qualityUpPolicy?.selection||libraryAutomation.qualityUpPolicy?.selection)||'WEAKEST_INTERNAL_AUDIT_AXIS_FIRST',
      workingBandMin:Number(executionLibraryPlan.qualityUpPolicy?.workingBandMin||libraryAutomation.qualityUpPolicy?.workingBandMin||980),
      target:Number(executionLibraryPlan.qualityUpPolicy?.target||libraryAutomation.qualityUpPolicy?.target||1000),
      productionRuntimeVerificationSeparate:true
    }),
    autonomousOperatingContract:freeze({...libraryAutomation.autonomousOperatingContract,...executionLibraryPlan.autonomousOperatingContract}),
    autonomousMaintenanceContract:freeze({...libraryAutomation.autonomousMaintenanceContract,...executionLibraryPlan.autonomousMaintenanceContract}),
    maintenance:freeze({...libraryAutomation.maintenance,...executionLibraryPlan.maintenance}),
    studioVariationAxes:freeze({...libraryAutomation.studioVariationAxes,...executionLibraryPlan.studioVariationAxes}),
    autonomousNextAction:freeze({...libraryAutomation.autonomousNextAction,...executionLibraryPlan.autonomousNextAction}),
    autonomousContinuationRequired:true,
    ownerPresenceRequired:false,
    humanPresenceRequired:false,
    chatgptPresenceRequired:false,
    audioStudioBreadth:freeze({...libraryAutomation.audioStudioBreadth,...executionLibraryPlan.audioStudioBreadth}),
    audioRoleContractCount:Number(executionLibraryPlan.audioRoleContractCount||0),
    actualVerifiedAudioAssetCount:Number(executionLibraryPlan.actualVerifiedAudioAssetCount||0),
    audioRoleVolumeSeparateFromVerifiedFileCount:true,
    productionRuntimeVerificationSeparateFromInternalQuality:true,
    existingAssetDevelopmentLaneOnly:true,
    newWorkflow:false,
    newScheduler:false,
    newQueue:false,
    newPipeline:false,
    newWrapper:false,
    newShadowSystem:false
  });
  const currentCustomizationDocument=(companyRegistry?.baseMaterialLibrary?.customization?.documents||[]).find(row=>row.gameId===clean(task.gameId))||null;
  const sharedCustomizationDocument=task.assetCustomization?.sharedDocument||(!task.assetCustomization?.recipes?.length?currentCustomizationDocument:null);
  if(sharedCustomizationDocument)task={...task,styleFamily:sharedCustomizationDocument.styleBible?.profileKey,styleBible:sharedCustomizationDocument.styleBible,concept:{...task.concept,styles:[{family:sharedCustomizationDocument.styleBible?.profileKey,weight:1}]},motionStyleModifiers:sharedCustomizationDocument.motionStyle?.modifiers};
  const sameGameRobloxAssets=resolvedTarget==='roblox'?discoverExistingRobloxGameAssets({repoRoot,gameId:task.gameId}):[];
  const manifestWithSameGameAssets={...manifestBase,assets:[...(Array.isArray(manifestBase?.assets)?manifestBase.assets:[]),...sameGameRobloxAssets]};
  const manifestInput=mergeManifestWithCompanyLibrary(manifestWithSameGameAssets,companyRegistry,repoRoot);
  const presetInput=presetCatalog||readJson(path.join(repoRoot,'assets','prototype-asset-presets.json'),{version:0,presets:[]});
  const request=clean(task.goal||task.request||task.gameId||'game asset production');
  const characterCustomizationRequested=Boolean(task.characterCustomization||task.npcCustomization)||/(?:CHARACTER|NPC|AVATAR|CUSTOMI[ZS]|캐릭터|케릭터|커마|커스터마이징|NPC|주민|시민|동료)/i.test(request);
  const duelCombatRequested=/(?:duel|dueling|결투|대전|격투|맨손|무기.?전투|combat|fight|fighter|카타나|katana|검술|쌍검|대검|창술|boxing|복싱|kickboxing|킥복싱|muay|무에타이|karate|가라테|taekwondo|태권도|mma|레슬링|wrestling|judo|유도|jiu.?jitsu|주짓수)/i.test(request);
  const survivalWildlifeRequested=/(?:gravewood|그레이브우드|생존|survival|야생동물|동물|wildlife|animal|곰|bear|멧돼지|boar|사슴|deer|elk|엘크|moose|무스|bison|들소|wolf|늑대|fox|여우|rabbit|토끼|raccoon|너구리|squirrel|다람쥐|beaver|비버|badger|오소리|goat|염소|turkey|칠면조|crow|까마귀)/i.test(request);
  const requestedWildlifeSpecies=/멧돼지|boar/i.test(request)?'BOAR'
    :/사슴|deer/i.test(request)?'DEER'
    :/엘크|elk/i.test(request)?'ELK'
    :/무스|moose/i.test(request)?'MOOSE'
    :/들소|bison/i.test(request)?'BISON'
    :/늑대|wolf/i.test(request)?'WOLF'
    :/코요테|coyote/i.test(request)?'COYOTE'
    :/여우|fox/i.test(request)?'FOX'
    :/토끼|rabbit/i.test(request)?'RABBIT'
    :/너구리|raccoon/i.test(request)?'RACCOON'
    :/다람쥐|squirrel/i.test(request)?'SQUIRREL'
    :/비버|beaver/i.test(request)?'BEAVER'
    :/오소리|badger/i.test(request)?'BADGER'
    :/산양|mountain.?goat|염소|goat/i.test(request)?'MOUNTAIN_GOAT'
    :/칠면조|turkey/i.test(request)?'TURKEY'
    :/까마귀|crow/i.test(request)?'CROW'
    :/곰|bear/i.test(request)?'BEAR'
    :null;
  const requestedSurvivalTool=/도끼|axe/i.test(request)?'AXE'
    :/곡괭이|pickaxe/i.test(request)?'PICKAXE'
    :/망치|hammer/i.test(request)?'HAMMER'
    :/창|spear/i.test(request)?'SPEAR'
    :'NONE';
  const requestedWeaponFamily=/카타나|katana/i.test(request)?'KATANA'
    :/쌍검|dual.?blade/i.test(request)?'DUAL_BLADE'
    :/대검|great.?sword|two.?hand/i.test(request)?'TWO_HAND_SWORD'
    :/단검|dagger/i.test(request)?'DAGGER'
    :/창|spear/i.test(request)?'SPEAR'
    :/도끼|axe/i.test(request)?'AXE'
    :/망치|hammer/i.test(request)?'HAMMER'
    :/활|bow/i.test(request)?'BOW'
    :/총|firearm|gun/i.test(request)?'FIREARM'
    :/방패|shield/i.test(request)?'SHIELD_SWORD'
    :/지팡이|staff|wand/i.test(request)?'STAFF_OR_WAND'
    :/맨손|격투|boxing|복싱|kickboxing|킥복싱|muay|무에타이|karate|가라테|taekwondo|태권도|mma|레슬링|wrestling|judo|유도|jiu.?jitsu|주짓수/i.test(request)?'UNARMED'
    :/검|sword/i.test(request)?'ONE_HAND_SWORD'
    :null;
  const requestedMartialStyle=/복싱|boxing/i.test(request)?'BOXING'
    :/킥복싱|kickboxing/i.test(request)?'KICKBOXING'
    :/무에타이|muay/i.test(request)?'MUAY_THAI'
    :/가라테|karate/i.test(request)?'KARATE'
    :/태권도|taekwondo/i.test(request)?'TAEKWONDO'
    :/산타|sanda/i.test(request)?'SANDA'
    :/쿵푸|우슈|wushu|kung.?fu/i.test(request)?'WUSHU_KUNG_FU'
    :/레슬링|wrestling/i.test(request)?'WRESTLING'
    :/유도|judo/i.test(request)?'JUDO_THROWING'
    :/주짓수|jiu.?jitsu/i.test(request)?'JIU_JITSU_GRAPPLING'
    :/mma/i.test(request)?'MMA_HYBRID'
    :requestedWeaponFamily==='UNARMED'?'MMA_HYBRID':null;
  const requestedCombatRole=/피니셔|finisher/i.test(request)?'FINISHER'
    :/패링|parry|카운터|counter/i.test(request)?'PARRY_OR_COUNTER'
    :/회피|dodge|구르기|roll/i.test(request)?'DODGE'
    :/공중|aerial|jump.?attack/i.test(request)?'AERIAL_ATTACK'
    :/대시|돌진|gap.?closer|dash.?attack/i.test(request)?'GAP_CLOSER'
    :/강공|heavy.?attack/i.test(request)?'HEAVY_ATTACK'
    :/가드|guard|block/i.test(request)?'GUARD'
    :'LIGHT_COMBO';
  const requestedConcept=inferRequestedConcept(task,request);
  const explicitStyleExpressionOverrides={
    ...inferStyleExpressionOverridesFromText(request),
    ...(task.styleExpressionOverrides||task.styleExpression?.axes||{})
  };
  const assetLearningRequired=clean(executionLane).toLowerCase()==='asset-development'||['roblox','unity','web'].includes(resolvedTarget);
  const verifiedCommercialReuse=freezeList((verifiedLearning?.playbookReuse||[])
    .filter(row=>row?.verified===true&&clean(row?.authority)==='verified-task-playbook'&&clean(row?.id).startsWith('external-black-box-'))
    .map(row=>freeze({
      id:clean(row.id),
      project:clean(row.project)||null,
      sourceRevision:clean(row.sourceRevision)||null,
      score:Number(row.score||0),
      sourcePlaybooks:freezeList(row.sourcePlaybooks||[]),
      distilledApplicationPrinciples:freezeList((row.distilledApplicationPrinciples||[]).map(clean).filter(Boolean)),
      distilledAvoidancePrinciples:freezeList((row.distilledAvoidancePrinciples||[]).map(clean).filter(Boolean)),
      distilledLearningUseAllowed:freezeList((row.distilledLearningUseAllowed||[]).map(clean).filter(Boolean))
    }))
    .filter(row=>row.id));
  const exactKnowledgeIds=freezeList((verifiedLearning?.exactKnowledgeIds||[]).map(clean).filter(Boolean));
  const retrievedVerifiedExternalIds=freezeList([...new Set(exactKnowledgeIds
    .filter(id=>id.startsWith('PLAYBOOK_REUSE:external-black-box-'))
    .map(id=>id.slice('PLAYBOOK_REUSE:'.length))
    .filter(Boolean))]);
  const identityBoundVerifiedExternalIds=freezeList([...new Set(verifiedCommercialReuse.map(row=>row.id).filter(Boolean))]);
  const appliedVerifiedExternalIds=freezeList([...new Set(verifiedCommercialReuse
    .filter(row=>row.distilledApplicationPrinciples.length>0)
    .map(row=>row.id)
    .filter(Boolean))]);
  const matchedVerifiedExternalCount=retrievedVerifiedExternalIds.filter(id=>appliedVerifiedExternalIds.includes(id)).length;
  const fullRetrievedSetBound=!assetLearningRequired||(
    retrievedVerifiedExternalIds.length>0
    &&retrievedVerifiedExternalIds.length===appliedVerifiedExternalIds.length
    &&matchedVerifiedExternalCount===retrievedVerifiedExternalIds.length
  );
  const actualApplicationCoveragePct=!assetLearningRequired
    ?100
    :(retrievedVerifiedExternalIds.length>0?Math.floor((matchedVerifiedExternalCount/retrievedVerifiedExternalIds.length)*100):0);
  const commercialDistillation=freeze({
    required:assetLearningRequired,
    ready:!assetLearningRequired||(verifiedCommercialReuse.length>0&&fullRetrievedSetBound),
    verifiedExternalBlackBoxRequired:assetLearningRequired,
    allRetrievedVerifiedExternalApplied:fullRetrievedSetBound,
    retrievedVerifiedExternalTruncationForbidden:true,
    applicationOrder:'VERIFIED_EXTERNAL_LEARNING_FIRST_THEN_TRANSFORMATIVE_INTERNAL_ASSET_EVOLUTION',
    source:'vibe2-learning-runtime:company-learning/vibe3-task-playbooks.json',
    verifiedReuseCount:verifiedCommercialReuse.length,
    verifiedReuse:verifiedCommercialReuse,
    exactKnowledgeIds,
    retrievedVerifiedExternalIds,
    identityBoundVerifiedExternalIds,
    appliedVerifiedExternalIds,
    retrievedCount:retrievedVerifiedExternalIds.length,
    appliedCount:appliedVerifiedExternalIds.length,
    matchedCount:matchedVerifiedExternalCount,
    exactRetrievedSetBinding:fullRetrievedSetBound,
    applicationCoveragePct:actualApplicationCoveragePct,
    applicationMode:'TRANSFORMATIVE_INTERNAL_ASSET_EVOLUTION',
    mandatoryApplicationCoveragePct:100,
    internalAssetEvolutionRequired:true,
    applyAxes:freezeList([
      'MENU_FLOW_AND_INFORMATION_ARCHITECTURE',
      'UI_UX_LAYOUT_FEEDBACK_AND_TOUCH_READABILITY',
      'GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION',
      'MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION',
      'ENVIRONMENT_WORLD_DENSITY_LANDMARK_AND_READABILITY',
      'VFX_CAMERA_AUDIO_VISUAL_FEEDBACK_LANGUAGE',
      'GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'
    ]),
    evolutionLoop:freezeList([
      'OBSERVE_VERIFIED_BLACK_BOX_BEHAVIOR',
      'DISTILL_REUSABLE_PRINCIPLES',
      'REAUTHOR_OR_RECOMPOSE_INTERNAL_ASSET',
      'BIND_TO_TARGET_GAME_AND_STYLE_LOCK',
      'RUNTIME_AND_MOBILE_QA',
      'PROMOTE_VERIFIED_COMPANY_REUSE_OR_REPAIR',
      'RETURN_VERIFIED_OUTCOME_TO_LEARNING'
    ]),
    rawCommercialAssetCopyForbidden:true,
    rawCommercialCodeCopyForbidden:true,
    distinctiveMenuSceneOrAnimationCloneForbidden:true,
    platformNativeReauthoringRequired:['roblox','unity'].includes(resolvedTarget),
    authorityExpanded:false
  });
  const referenceImages=Array.isArray(task.referenceImages)?task.referenceImages:Array.isArray(task.references?.images)?task.references.images:[];
  const referenceImageStudies=freezeList(referenceImages.map((row,index)=>{
    const request=createVibeReferenceImageStudyRequest({
      sourceId:row?.sourceId||row?.id||`reference-${index+1}`,
      sourceType:row?.sourceType||((task.imageToAsset||task.mapReconstruction)?'USER_PROVIDED_OR_OWNED_IMAGE':'ABSTRACTED_MULTI_REFERENCE_ANALYSIS'),
      imageRef:row?.imageRef||row?.path||row?.url||'',
      sourceHash:row?.sourceHash||'',
      rights:row?.rights||{},
      purpose:row?.purpose||(task.mapReconstruction?'MAP_RECONSTRUCTION':task.imageToAsset?'ASSET_CREATION':'MAP_STRUCTURE')
    });
    const observation=row?.observation?bindVibeReferenceImageObservation({
      request,observation:row.observation,verifiedAgainstSource:row.verifiedAgainstSource===true
    }):null;
    return freeze({
      request,
      observation,
      domainHint:row?.domain||row?.assetFamily||row?.family||row?.category||null,
      domainHints:freezeList(Array.isArray(row?.domains)?row.domains:Array.isArray(row?.categories)?row.categories:[])
    });
  }));
  const referenceStyleSuggestion=inferStyleExpressionOverridesFromText(
    referenceImageStudies.map(row=>[
      row?.observation?.features?.STYLE_LANGUAGE,
      row?.observation?.features?.MATERIAL_REGIONS,
      row?.observation?.features?.PALETTE,
      row?.observation?.features?.CONSTRUCTION_DETAILS
    ].filter(Boolean).join(' ')).join(' ')
  );
  const taskStyleExpression=resolveInternalAssetStyleExpressionProfile({
    styleFamily:requestedConcept.styles?.[0]?.family||task.styleFamily||task.style||'STYLIZED_FANTASY',
    styles:requestedConcept.styles||[],
    artTone:requestedConcept.artTone||[],
    overrides:{...referenceStyleSuggestion,...explicitStyleExpressionOverrides}
  });
  const referenceDrivenAssetIdeas=buildReferenceDrivenAssetIdeaWorklist({
    studies:referenceImageStudies,
    request,
    characterCustomizationRequested
  });
  const taskLocalReferenceVolumeActions=freezeList(referenceDrivenAssetIdeas.map((idea,index)=>{
    const domain=idea.domain==='PROP'?'WORLD_PROP':idea.domain;
    const freeSourceCandidateIds=unique(
      activeNextVolumeActions
        .filter(row=>clean(row?.domain).toUpperCase()===clean(domain).toUpperCase())
        .flatMap(row=>row?.freeSourceCandidateIds||[])
    ).slice(0,Number(executionLibraryPlan.freeSourceCandidateLimitPerAction||libraryAutomation.freeSourceCandidateLimitPerAction||8));
    return freeze({
      kind:'REFERENCE_IMAGE_VOLUME',
      domain,
      ideaId:idea.ideaId,
      source:'REFERENCE_IMAGE_OBSERVATION',
      role:idea.customizationAxis||idea.referenceFeature||null,
      referenceSourceId:idea.referenceSourceId,
      referenceSourceHash:idea.referenceSourceHash,
      referenceImageRef:idea.referenceImageRef,
      referenceFeature:idea.referenceFeature,
      referenceFeatureSummary:idea.referenceFeatureSummary,
      customizationAxis:idea.customizationAxis,
      priority:Number(idea.priority||285),
      sourceBound:idea.sourceBound===true,
      verifiedAgainstSource:idea.verifiedAgainstSource===true,
      taskLocalOnly:true,
      persistToCentralWorklist:false,
      directCopyForbidden:true,
      sourceImagePersistentLearningForbidden:true,
      unseenGeometryAndMotionRemainCreativeProposals:true,
      productionVerified:false,
      freeSourceCandidateIds:freezeList(freeSourceCandidateIds),
      freeSourceAvailable:freeSourceCandidateIds.length>0,
      resolutionOrder:freezeList(executionLibraryPlan.reuseResolutionOrder||libraryAutomation.reuseResolutionOrder||['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING']),
      styleExpressionAdaptationRequired:true,
      styleExpressionAxisIds:freezeList(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS[domain]||[]),
      styleExpression:taskStyleExpression,
      referenceStyleSuggestion:freeze({...referenceStyleSuggestion}),
      conceptStyleLockWins:true,
      referenceWorklistOrder:index+1
    });
  }));
  const effectiveNextVolumeActions=freezeList(
    executionLibraryPlan.focusPhase==='VOLUME_UP'
      ?[
        ...taskLocalReferenceVolumeActions,
        ...activeNextVolumeActions.filter(row=>!referenceDrivenAssetIdeas.some(idea=>idea.ideaId===row?.ideaId))
      ].slice(0,96).map((row,index)=>{
        const domain=clean(row?.domain).toUpperCase();
        return freeze({
          ...row,
          styleExpressionAdaptationRequired:true,
          styleExpressionAxisIds:freezeList(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS[domain]||row?.styleExpressionAxisIds||[]),
          styleExpression:taskStyleExpression,
          conceptStyleLockWins:true,
          worklistOrder:index+1
        });
      })
      :[]
  );
  const effectiveAutonomousNextAction=executionLibraryPlan.focusPhase==='QUALITY_UP_1000'
    ?freeze({
      kind:'QUALITY_UP_1000',
      phase:'QUALITY_UP_1000',
      selection:internalLibraryEvolution.qualityUpPolicy.selection,
      workingBandMin:internalLibraryEvolution.qualityUpPolicy.workingBandMin,
      target:internalLibraryEvolution.qualityUpPolicy.target,
      continueWithoutHuman:true
    })
    :effectiveNextVolumeActions.length
      ?freeze({
        kind:'CONSUME_PRIORITY_WORKLIST_ACTION',
        phase:'VOLUME_UP',
        action:effectiveNextVolumeActions[0],
        continueAfterCompletion:true,
        continueWithoutHuman:true
      })
      :freeze({
        kind:'REBUILD_VOLUME_WORKLIST',
        phase:'VOLUME_UP',
        continueWithoutHuman:true
      });
  const effectiveInternalLibraryEvolution=freeze({
    ...internalLibraryEvolution,
    nextVolumeActions:effectiveNextVolumeActions,
    activeNextVolumeAction:effectiveNextVolumeActions[0]||null,
    autonomousNextAction:effectiveAutonomousNextAction,
    worklistSource:taskLocalReferenceVolumeActions.length
      ?'TASK_REFERENCE_IMAGE_OVERLAY_ON_'+internalLibraryEvolution.worklistSource
      :internalLibraryEvolution.worklistSource,
    taskLocalReferenceActionCount:taskLocalReferenceVolumeActions.length,
    referenceImageObservationOverlay:taskLocalReferenceVolumeActions.length>0,
    referenceImageIdeasPersisted:false,
    rawReferenceImagePersisted:false,
    styleExpressionRequiredForAllDomains:true,
    styleExpression:taskStyleExpression,
    styleExpressionDomainBindings:freeze(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS),
    photoReferenceMaySuggestButNotOverrideConceptLock:true
  });
  const npcCustomizationPopulation=characterCustomizationRequested?createVibeNpcCustomizationPopulation({
    count:Number(task.npcCustomization?.previewCount||task.characterCustomization?.npcPreviewCount||48),
    seed:clean(task.gameId||task.characterCustomization?.seed||'npc-population'),
    roles:Array.isArray(task.npcCustomization?.roles)?task.npcCustomization.roles:Array.isArray(task.npcRoles)?task.npcRoles:[],
    regions:Array.isArray(task.npcCustomization?.regions)?task.npcCustomization.regions:Array.isArray(task.regions)?task.regions:[],
    species:Array.isArray(task.npcCustomization?.species)?task.npcCustomization.species:Array.isArray(task.species)?task.species:[]
  }):null;
  const selector=planAssetApplication({
    prompt:request,
    manifest:manifestInput,
    presetCatalog:presetInput,
    rebuild:/FULL_WEB_GAME_REBUILD/i.test(request)
  });
  const decisions=freezeList((selector.binding||[]).map(binding=>decisionFor(selector,resolvedTarget,binding,manifestInput,{task,requestedConcept})));
  const effectiveMissingTypes=freezeList(decisions.filter(row=>row.required!==false&&row.applyFirst?.enabled!==true).map(row=>row.type));
  const persistedSearchConsumption=companyRegistry?.internalAssetLibraryAutomation?.repositoryAssetSync||{};
  const libraryConsumptionHealth=freeze({
    version:1,
    requestedTypeCount:decisions.length,
    readyBindingTypeCount:decisions.filter(row=>row.applyFirst?.enabled===true).length,
    unresolvedBindingTypeCount:effectiveMissingTypes.length,
    readyBindingPercent:decisions.length?Math.round((decisions.filter(row=>row.applyFirst?.enabled===true).length/decisions.length)*1000)/10:100,
    reuseCandidateCount:decisions.reduce((sum,row)=>sum+(row.reuseCandidates?.length||0),0),
    companyCandidateCount:decisions.reduce((sum,row)=>sum+(row.companyCandidates?.length||0),0),
    repositoryCandidateCount:decisions.reduce((sum,row)=>sum+(row.repositoryCandidates?.length||0),0),
    sameGameCandidateCount:decisions.reduce((sum,row)=>sum+(row.sameGameCandidates?.length||0),0),
    closestCompatibleFallbackCount:decisions.reduce((sum,row)=>sum+(row.approximateLibraryCandidates?.length||0),0),
    preferredCandidateIds:freezeList(decisions.map(row=>row.applyFirst?.preferredCandidateId).filter(Boolean)),
    detectedSourceConsumerAssetCount:Number(persistedSearchConsumption.sourceConsumerAssetCount||0),
    detectedSourceConsumerBindingCount:Number(persistedSearchConsumption.sourceConsumerBindingCount||0),
    detectedSourceConsumerGameCount:(persistedSearchConsumption.sourceConsumerGameIds||[]).length,
    detectedSourceConsumerGameIds:freezeList(persistedSearchConsumption.sourceConsumerGameIds||[]),
    libraryModuleConsumerPathCount:Number(persistedSearchConsumption.libraryModuleConsumerPathCount||0),
    libraryModuleConsumerBindingCount:Number(persistedSearchConsumption.libraryModuleConsumerBindingCount||0),
    libraryModuleConsumerGameCount:(persistedSearchConsumption.libraryModuleConsumerGameIds||[]).length,
    libraryModuleConsumerGameIds:freezeList(persistedSearchConsumption.libraryModuleConsumerGameIds||[]),
    sourceConsumptionIsRuntimeVerification:false,
    actualRuntimeVerificationStillRequired:true,
    blankAssetForbidden:true,
    qualityScoreBlocksInitialLibraryUse:false
  });
  const highEnd=highEndVisualContract(repoRoot);
  const highEndActive=highEnd?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const modelRouting=buildAssetModelRouting({task,request,decisions,highEndActive});
  const nativeAuthoringExecution=buildNativeAuthoringExecution({
    target:resolvedTarget,
    task,
    decisions,
    manifest:manifestInput,
    explicitRequestedTypes:selector.explicitRequestedTypes||[]
  });
  const companyLibrary=companyGraphicsLibraryContract(repoRoot);
  const companyLibraryActive=companyLibrary?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const directCount=decisions.filter(row=>row.directAuthoring.length>0).length;
  const reuseCount=decisions.filter(row=>row.reuseCandidates.length>0).length;
  const sameGameCount=decisions.filter(row=>row.sameGameCandidates.length>0).length;
  const companyCount=decisions.filter(row=>row.companyCandidates.length>0).length;
  const repositoryCount=decisions.filter(row=>row.repositoryCandidates.length>0).length;
  const externalCount=decisions.filter(row=>row.externalCandidates.length>0).length;
  const bootstrapSets=(companyRegistry?.motionBootstrap?.sets||[]).map(row=>createCreatureMotionSetProfile({...row,verificationState:companyRegistry?.motionBootstrap?.productionVerified===true?'VERIFIED_RUNTIME':'PREPARED_SEMANTIC'}));
  const motionAutoGapActive=companyLibrary?.autoMotionCoverageGapFill?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const requestUpper=request.toUpperCase();
  const universeContract=companyLibrary?.studioAssetUniverse||{};
  const universeActive=universeContract?.status==='ACTIVE_EXECUTABLE_CONTRACT';
  const familyRegex={
    CHARACTER:/CHARACTER|캐릭터|의상|복장|옷|갑옷|ARMOR|CLOTHING|HAIR|머리/i,
    CREATURE:/CREATURE|MONSTER|몬스터|몹|적|BOSS|보스|곤충|늑대|곰|거미|뱀|드래곤/i,
    BUILDING:/BUILDING|건물|집|마을|성|탑|신전|던전|실내|INTERIOR|ROOM/i,
    ENVIRONMENT:/ENVIRONMENT|배경|환경|숲|정글|사막|설원|눈|화산|늪|바이옴|BIOME/i,
    WEAPON:/WEAPON|무기|검|창|도끼|망치|활|총|지팡이/i,
    SKILL:/SKILL|스킬|마법|주문|CAST|PROJECTILE|BEAM|AOE/i,
    MATERIAL:/MATERIAL|재질|표면|금속|나무|돌|천|가죽/i,
    AUDIO:/AUDIO|SOUND|BGM|음악|소리|효과음/i,
    VFX:/VFX|이펙트|파티클|폭발|피격효과/i,
    UI:/UI|HUD|인벤토리|아이콘|버튼|맵/i,
    MOTION:/MOTION|ANIMATION|모션|동작|애니메이션/i,
    PROP:/PROP|소품|가구|상자|배럴|장식|작업대/i
  };
  const activeDemand=Object.fromEntries(Object.entries(DEFAULT_COVERAGE_BASELINES).map(([family,subs])=>[
    family,Object.fromEntries(Object.keys(subs).map(sub=>[sub,familyRegex[family]?.test(request)?1:0]))
  ]));
  const universeRepositoryAssets=[
    ...(companyRegistry?.assets||[]).filter(row=>clean(row.status).toUpperCase()==='REPO_ASSET'),
    ...(manifestBase?.assets||[]).map(row=>({...row,family:inferUniverseFamily(row),subfamily:clean(row.subfamily||row.type||(row.types||[])[0]).toUpperCase(),status:'REPO_ASSET'}))
  ].filter(row=>clean(row.family||row.category));
  const universeSignals={};
  for(const [family,subs] of Object.entries(DEFAULT_COVERAGE_BASELINES)){
    for(const subfamily of Object.keys(subs)){
      const key=family+':'+subfamily;
      const externalReady=(companyRegistry?.externalSources||[]).some(row=>{
        const categories=unique([row?.category,...(Array.isArray(row?.categories)?row.categories:[])]).map(value=>clean(value).toUpperCase());
        const categoryMatch=categories.includes(family)
          ||(family==='BUILDING'&&categories.some(category=>['ENVIRONMENT','PROP'].includes(category)))
          ||(family==='MATERIAL'&&categories.some(category=>['VFX','ENVIRONMENT'].includes(category)));
        return /LICENSE_VERIFIED/.test(clean(row?.status).toUpperCase())&&categoryMatch;
      });
      const verifiedReuse=(companyRegistry?.assets||[]).some(row=>row.verifiedCompanyReusable===true&&clean(row.category||row.family).toUpperCase()===family);
      universeSignals[key]={
        activeGameDemand:activeDemand[family]?.[subfamily]>0,
        gameConsumerCount:activeDemand[family]?.[subfamily]>0?1:0,
        playerVisibleFrequencyHigh:['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','VFX','UI'].includes(family)&&activeDemand[family]?.[subfamily]>0,
        heroBossLandmark:/보스|BOSS|주인공|HERO|랜드마크|LANDMARK/i.test(request)&&['CHARACTER','CREATURE','BUILDING','ENVIRONMENT'].includes(family),
        externalSourceReady:externalReady,
        verifiedReuseAvailable:verifiedReuse
      };
    }
  }
  const studioUniversePlan=universeActive?createStudioAssetUniversePlan({
    assets:companyRegistry?.assets||[],
    repositoryAssets:universeRepositoryAssets,
    externalSources:companyRegistry?.externalSources||[],
    activeDemand,
    signalsByKey:universeSignals,
    platform:resolvedTarget.toUpperCase(),
    styleFamily:clean(task.styleFamily||task.style)||requestedConcept.styles?.[0]?.family||'STYLIZED_FANTASY',
    concept:requestedConcept,
    gameId:clean(task.gameId),
    worldDna:task.worldDna||task.mapDna||{},
    languages:task.visualLanguages||{},
    requirements:flowAssetRequirements,
    usageByAsset:task.assetUsageById||{},
    futureGameDemands:Array.isArray(task.futureGameDemands)?task.futureGameDemands:[],
    usageEvents:Array.isArray(task.assetUsageEvents)?task.assetUsageEvents:[],
    baseMaterialFamilies:companyRegistry?.baseMaterialLibrary?.families||{},
    baseMaterialUsageByAtom:task.baseMaterialUsageByAtom||{},
    styleBible:task.styleBible||{},
    customizationRecipes:Array.isArray(task.assetCustomization?.recipes)?task.assetCustomization.recipes:[],
    customizationContract:companyLibrary?.composableBaseMaterialLibrary?.customization||null,
    qualityEvidenceByAsset:task.assetQualityEvidenceById||{},
    heroAssetIds:Array.isArray(task.heroAssetIds)?task.heroAssetIds:[],
    familyOutputsByAsset:task.assetFamilyOutputsById||{}
  }):null;
  const baseMaterialLoadout=buildComposableBaseMaterialLoadout({
    companyRegistry,studioUniversePlan,decisions,gameId:clean(task.gameId),target:resolvedTarget,request
  });
  const motionStyle=deriveMotionStyleVariant({
    style:studioUniversePlan?.styleBible?.profileKey||requestedConcept.styles?.[0]?.family||'STYLIZED_FANTASY',
    styles:requestedConcept.styles,modifiers:task.motionStyleModifiers||{}
  });
  const assetSynchronization=['unity','web'].includes(resolvedTarget)&&studioUniversePlan?.customization?synchronizeAssetCustomization({
    document:sharedCustomizationDocument,
    currentDocument:currentCustomizationDocument,
    baseRevision:task.assetCustomization?.baseRevision??0,
    gameId:clean(task.gameId),platform:resolvedTarget,
    assets:[...universeRepositoryAssets,...(companyRegistry?.assets||[])],
    customization:studioUniversePlan.customization,styleBible:studioUniversePlan.styleBible,motionStyle,
    motionBindings:task.assetCustomization?.motionBindings||[]
  }):null;
  const motionAutoFillPlans=motionAutoGapActive?bootstrapSets.map(profile=>{
    const usage={
      activeGameConsumer:Boolean(profile.archetype&&requestUpper.includes(profile.archetype)),
      heroOrBoss:/BOSS/.test(profile.bodyPlan)||requestUpper.includes('BOSS')||requestUpper.includes('보스'),
      gameConsumerCount:Boolean(profile.archetype&&requestUpper.includes(profile.archetype))?1:0,
      playerVisibleFrequencyHigh:Boolean(profile.archetype&&requestUpper.includes(profile.archetype)),
      combatCritical:true,
      externalSourceReady:(companyRegistry?.externalSources||[]).some(row=>clean(row.category).toUpperCase()==='MOTION'&&/LICENSE_VERIFIED/.test(clean(row.status).toUpperCase()))
    };
    const gapPlan=buildAutomaticMotionGapFillPlan({
      profile,
      librarySets:bootstrapSets,
      externalSources:companyRegistry?.externalSources||[],
      usage,
      requirements:companyLibrary?.autoMotionCoverageGapFill?.baselineMinimums||{}
    });
    const prepared=applySemanticGapPreparation({profile,gapPlan});
    return freeze({
      id:profile.id,
      archetype:profile.archetype,
      complete:gapPlan.audit.complete,
      verifiedComplete:gapPlan.audit.verifiedComplete,
      gapCount:gapPlan.audit.gaps.length+gapPlan.audit.requiredRoleGaps.length,
      missingSlots:gapPlan.audit.gaps.reduce((n,row)=>n+row.missing,0)+gapPlan.audit.requiredRoleGaps.length,
      topPriority:gapPlan.actions[0]?.priority||0,
      actionRoutes:freezeList(unique(gapPlan.actions.map(row=>row.route))),
      semanticSeeds:freezeList(gapPlan.actions.flatMap(row=>row.semanticSeeds||[])),
      preparedMotionCount:prepared.profile.motionIds.length,
      productionVerified:prepared.productionVerified===true
    });
  }):[];
  const prioritizedMotionAutoFillPlans=[...motionAutoFillPlans].sort((a,b)=>b.topPriority-a.topPriority||b.missingSlots-a.missingSlots||a.id.localeCompare(b.id));
  const autoRuntimeVisualReview=task.assetRuntimeVisualReview?null:discoverRuntimeVisualEvidence({task,target:resolvedTarget});
  const runtimeVisualReviewInput=task.assetRuntimeVisualReview||autoRuntimeVisualReview;
  const traceAsset=task.motionContinuityTrace?[...universeRepositoryAssets,...(companyRegistry?.assets||[])].find(asset=>asset.id===task.motionContinuityTrace.assetId):null;
  const motionContinuityAudit=task.motionContinuityTrace?{
    ...auditMotionContinuityTrace({...task.motionContinuityTrace,
      expectedSourceHash:clean(traceAsset?.sourceHash||traceAsset?.contentHash||traceAsset?.sha256),
      requiredDetailChannels:traceAsset?.motionQA?.requiredDetailChannels??task.motionContinuityTrace.requiredDetailChannels,
      limits:{...task.motionContinuityTrace.limits,...traceAsset?.motionQA?.limits}
    }),assetId:clean(task.motionContinuityTrace.assetId)
  }:null;
  const runtimeVisualEvidence=task.runtimeVisualEvidence&&typeof task.runtimeVisualEvidence==='object'?task.runtimeVisualEvidence:null;
  const runtimeVisualAudit=runtimeVisualEvidence?auditVibeRuntimeVisualEvidence(runtimeVisualEvidence):null;
  const runtimeBeforeAfterAudit=runtimeVisualEvidence?.visualRegression?auditVibeRuntimeBeforeAfterComparison(runtimeVisualEvidence.visualRegression):null;
  const runtimeVisualRepair=runtimeVisualAudit&&!runtimeVisualAudit.pass?freeze({
    status:'RUNTIME_VISUAL_REPAIR_REQUIRED',
    sourceRevision:clean(task.sourceRevision||runtimeVisualEvidence?.sourceRevision||runtimeVisualEvidence?.candidateRevision)||null,
    candidateRevision:clean(runtimeVisualEvidence?.candidateRevision)||null,
    defects:freezeList(runtimeVisualAudit.repairTargets||[]),
    reasons:freezeList(runtimeVisualAudit.reasons||[]),
    interfaceMissing:freezeList(runtimeVisualAudit.interfaceCoverage?.missing||[]),
    sceneObjectsMissing:freezeList(runtimeVisualAudit.sceneObjectCoverage?.missing||[]),
    beforeAfter:runtimeBeforeAfterAudit,
    preserve:freezeList(['GAMEPLAY_VALUES','SAVE_MEANING','MULTIPLAYER_AUTHORITY','HIT_TIMING','QUEST_AND_PROGRESS_RULES','UNRELATED_VISUAL_SYSTEMS']),
    repairMode:'AFFECTED_VISUAL_RESPONSIBILITY_ONLY',
    sameCaptureConditionsRequired:true,
    recaptureAfterMutation:true,
    runtimeReobservationRequiredToClose:true,
    declarationOnlyClosureForbidden:true
  }):null;
  const engineMeasurementCapture=freeze({
    required:Boolean(motionContinuityAudit||runtimeVisualRepair),
    status:task.engineMeasurementCapture&&typeof task.engineMeasurementCapture==='object'?'BOUND':'CAPTURE_REQUIRED_WHEN_RELEVANT',
    evidence:task.engineMeasurementCapture&&typeof task.engineMeasurementCapture==='object'?freeze({...task.engineMeasurementCapture}):null,
    automaticCaptureClaimed:task.engineMeasurementCapture?.automatic===true,
    missingCaptureRemainsUnverified:true,
    sourceAndCaptureHashBindingRequired:true
  });
  const assetCustomization=assetSynchronization?.customization
    ?freeze({...studioUniversePlan.customization,items:assetSynchronization.customization.items,unresolvedCount:assetSynchronization.customization.unresolvedCount})
    :studioUniversePlan?.customization||null;
  const runtimeVisualReview=runtimeVisualReviewInput?createAssetRuntimeVisualReviewPlan({
    ...runtimeVisualReviewInput,
    sourceRevision:runtimeVisualReviewInput.sourceRevision||task.sourceRevision||'',
    platforms:runtimeVisualReviewInput.platforms||[resolvedTarget.toUpperCase()]
  }):null;
  const mapDetailReconstruction=task.mapReconstruction?createVibeMapDetailReconstruction({
    sketch:task.mapReconstruction.sketch||{},assets:[...universeRepositoryAssets,...(companyRegistry?.assets||[])],
    styleFamily:assetSynchronization?.document?.styleBible?.profileKey||studioUniversePlan?.styleBible?.profileKey,
    seed:task.mapReconstruction.seed||clean(task.gameId)
  }):null;
  const qualityDNA=freeze({
    version:1,
    gameId:clean(task.gameId)||null,
    styleProfile:clean(task.styleFamily||task.style)||studioUniversePlan?.styleBible?.profileKey||null,
    contracts:freezeList(decisions.map(row=>freeze({type:row.type,qualityDNA:row.qualityDNA}))),
    commonRules:Object.freeze({
      strongAxesLockedDuringRepair:true,
      failedAxesOnlyEditableByDefault:true,
      donorAssemblyBeforeFullReauthor:true,
      detailLodRequired:true,
      actualRuntimeEvidenceRequired:true,
      verificationStatusIsNotVisualQuality:true,
      qualityScaleMaximum:120,
      qualityScoreIsNotDevelopmentBindingGate:true,
      lowScoreAssetMayBindWhenNoBetterSafeCompatibleAlternative:true,
      lowScoreBindingMustKeepVisualDebtOpen:true,
      productionVerifiedStillRequiresExactRuntimeEvidence:true,
      heroAssetsDefineQualityBaseline:true,
      worstPartFirstEvolution:true,
      verifiedOutcomeOnlyMayTeachPositiveLearning:true
    })
  });
  const precisionProduction=freeze({
    version:1,
    mode:'INSPECT_REPAIR_AUTHOR_APPLY_REINSPECT',
    automaticAdvance:true,
    inspectionIsInputNotTerminal:true,
    repairPlanIsInputNotTerminal:true,
    authoringIsRequiredWhenRepairNeedsNewOrRebuiltAsset:true,
    applicationRequiredAfterSuccessfulAuthoring:true,
    applicationReturnsToRuntimeInspection:true,
    sequence:freezeList(['INSPECT_CURRENT_ASSET_AND_RUNTIME','DEFINE_EXACT_REPAIR_SCOPE','AUTHOR_EDITABLE_SOURCE_AND_NATIVE_DERIVATIVE','APPLY_TO_EXISTING_GAME_RESPONSIBILITY','REINSPECT_SAME_RUNTIME_VIEW']),
    assetChain:assetCustomization?.automaticProductionChain||null,
    assetItems:freezeList((assetCustomization?.items||[]).map(row=>freeze({
      id:row.id,family:row.family,status:row.status,sourceHash:row.sourceHash,
      precisionProduction:row.precisionProduction||null,
      productionChain:row.productionChain||null
    }))),
    mapChain:mapDetailReconstruction?.productionChain||null,
    mapRegions:freezeList((mapDetailReconstruction?.regions||[]).map(region=>freeze({
      id:region.id,function:region.function,productionSequence:region.productionSequence,
      detailByDistance:region.detailByDistance,layers:region.layers
    }))),
    detailResolutionLadder:assetCustomization?.detailResolutionLadder||mapDetailReconstruction?.detailByDistance||null,
    causalDetailRules:freezeList(assetCustomization?.causalDetailRules||[]),
    authoringOutputsRequired:freezeList(['EDITABLE_SOURCE','NATIVE_DERIVATIVE','APPLICATION_BINDING','SOURCE_AND_ARTIFACT_HASHES']),
    application:Object.freeze({
      directExistingResponsibilityBinding:true,
      shadowAssetBindingForbidden:true,
      gameplaySaveBalanceNetworkSemanticsProtected:true,
      platform:resolvedTarget.toUpperCase(),
      nativeRuntimeReinspectionRequired:true
    }),
    continuation:Object.freeze({
      stopAfterInspection:false,
      stopAfterRepairPlan:false,
      stopAfterAuthoring:false,
      continueToApplyWhenArtifactsExist:true,
      failedRegionOrAssetResumesExactStage:true,
      unaffectedScopeMustNotBeRebuilt:true,
      missingAuthoringToolLeavesExactAuthoringStagePending:true
    })
  });
  return freeze({
    version:1,
    kind:'vibe2-asset-production-plan',
    graphicsProductionRoot:'GRAPHICS_PRODUCTION',
    externalTopLevelGraphicsWorkUnit:false,
    plannerRole:'GRAPHICS_PRODUCTION_INPUT_ONLY',
    gameId:clean(task.gameId)||null,
    target:resolvedTarget,
    targetResolution,
    activeNativeTargets:freezeList(['ROBLOX','UNITY']),
    pausedNativeTargets:freezeList(['FORTNITE_UEFN']),
    implementationOwner:'VIBE2_VIBE3',
    selectorVersion:Number(selector.version||0),
    presetId:clean(selector.prototypePreset?.id)||null,
    productionProfile:selector.production||null,
    commercialDistillation,
    internalLibraryEvolution:effectiveInternalLibraryEvolution,
    flowAssetRequirements,
    flowAssetLoadout:freeze({
      selectionContractVersion:Number(studioUniversePlan?.loadout?.selectionContractVersion||0),
      complete:studioUniversePlan?.loadout?.complete===true,
      unresolved:freezeList(studioUniversePlan?.loadout?.unresolved||[]),
      selections:freezeList(studioUniversePlan?.loadout?.selections||[]),
      resolutionMode:'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',
      genreRestrictionApplied:false,
      crossGenreReuseAllowed:true,
      genreUsedForEligibility:false,
      assetIdPinnedByFlow:false,
      gameplayAuthority:false
    }),
    requestedTypes:freezeList(selector.requestedTypes||[]),
    explicitRequestedTypes:freezeList(selector.explicitRequestedTypes||[]),
    selectorMissingTypes:freezeList(selector.missingTypes||[]),
    missingTypes:effectiveMissingTypes,
    decisions,
    libraryConsumptionHealth,
    applyFirstSummary:freeze({
      enabled:decisions.some(row=>row.applyFirst?.enabled),
      candidateCount:decisions.reduce((sum,row)=>sum+(row.applyFirst?.candidates?.length||0),0),
      sequence:freezeList(['APPLY_USABLE_EXISTING_FIRST','OBSERVE_IN_GAME','DERIVE_WEAK_PARTS_ONLY','REAPPLY','NEW_AUTHORING_LAST']),
      existingAssetApplicationBeforeNewAuthoring:true,
      qualityGateStillRequired:false,
      qualityImprovementRunsAfterInitialLibraryBinding:true,
      blankAssetForbidden:true,
      closestCompatibleLibraryFallbackRequired:true,
      qualityScoreBlocksInitialLibraryUse:false,
      internalAuditScoreBlocksInitialLibraryUse:false,
      newAuthoringOnlyAfterReusableCandidateFailure:true,
      newAuthoringOnlyWhenNoCompatibleLibraryCandidateExists:true,
      visualVerificationAndVisualQualitySeparated:true,
      detailInvestmentPriority:freezeList(['SCREEN_SPACE_OCCUPANCY','PLAYER_DWELL_TIME','INTERACTION_FREQUENCY','HERO_BOSS_SIGNATURE_ROLE','CAMERA_PROXIMITY','GAMEPLAY_READABILITY'])
    }),
    generatedAssetOutputContract:GENERATED_ASSET_OUTPUT_CONTRACT,
    modelRouting,
    nativeAuthoringExecution,
    baseMaterialLoadout,
    assetCustomization,
    qualityDNA,
    studioQuality120:freeze(studioUniversePlan?.quality120||{}),
    precisionProduction:freeze({...precisionProduction,qualityDNA,studioQuality120:studioUniversePlan?.quality120||null}),
    assetSynchronization,
    detailReview:studioUniversePlan?.customization?createAssetDetailReviewPlan({
      ...task.assetDetailReview,
      customization:assetSynchronization?.customization||studioUniversePlan.customization,
      platforms:task.assetDetailReview?.platforms||(['unity','web'].includes(resolvedTarget)?['UNITY','WEB']:[resolvedTarget.toUpperCase()])
    }):null,
    runtimeVisualReview,
    motionContinuityAudit,
    runtimeVisualAudit,
    runtimeVisualRepair,
    engineMeasurementCapture,
    sourceGlbReconstruction:freezeList((Array.isArray(task.sourceGlbs)?task.sourceGlbs:[]).map(source=>inspectVibeSourceGlb({repoRoot,source}))),
    mapDetailReconstruction,
    imageAssetCreation:freeze({
      enabled:referenceImageStudies.some(row=>['ASSET_CREATION','MAP_RECONSTRUCTION'].includes(row.request.purpose)),
      studies:freezeList(referenceImageStudies.filter(row=>['ASSET_CREATION','MAP_RECONSTRUCTION'].includes(row.request.purpose))),
      workflow:freezeList(['READ_ACTUAL_IMAGE_PIXELS','EXTRACT_VISIBLE_FORM_MATERIAL_AND_IDENTITY','DESIGN_UNSEEN_VIEWS_AND_ARTICULATION','SELECT_COMPATIBLE_BASE_OR_AUTHOR','CUSTOMIZE_AND_SCULPT_DETAILS','RIG_RETARGET_AND_ACT','COMPARE_REFERENCE_AND_RENDER','TARGET_NATIVE_VARIANTS_AND_RUNTIME_QA']),
      minimumQuality:studioUniversePlan?.customization?.minimumQuality||null,
      singleImageAccepted:true,missingTextBriefAllowed:true,
      unseenGeometryIsCreativeProposal:true,stillImageDoesNotProveMotion:true,
      pixelObservationRequired:true,
      ideaWorklist:referenceDrivenAssetIdeas,
      volumeWorklistOverlay:taskLocalReferenceVolumeActions,
      volumeWorklistOverlayCount:taskLocalReferenceVolumeActions.length,
      volumeWorklistOverlayConsumesBeforePersistentActions:true,
      ideaWorklistIsTaskLocal:true,
      ideaWorklistPersistenceForbidden:true,
      styleExpression:taskStyleExpression,
      referenceStyleSuggestion:freeze({...referenceStyleSuggestion}),
      conceptStyleLockWins:true,
      generatedAsset:false,runtimeVerified:false
    }),
    styleBible:assetSynchronization?.document?.styleBible||studioUniversePlan?.styleBible||null,
    motionStyle:assetSynchronization?.document?deriveMotionStyleVariant({style:assetSynchronization.document.motionStyle.profileKey,modifiers:assetSynchronization.document.motionStyle.modifiers}):motionStyle,
    qualityProfile:highEndActive?'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION':'STANDARD_PRESENTATION',
    companyGraphicsLibrary:freeze({
      enabled:companyLibraryActive,
      graphicsProductionRoot:clean(companyLibrary?.graphicsProductionRoot)||'GRAPHICS_PRODUCTION',
      scheduler:clean(companyLibrary?.scheduler)||null,
      executionLane:clean(companyLibrary?.executionLane)||null,
      reusableProductionTarget:freeze(companyLibrary?.reusableProductionTarget||companyRegistry?.universalCoverage?.reusableProductionTargets||{}),
      platformProfile:resolvedTarget.toUpperCase(),
      characterNpcCustomization:freeze({
        enabled:true,
        requested:characterCustomizationRequested,
        contract:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT,
        npcPopulationPreview:npcCustomizationPopulation,
        referenceDrivenIdeaCount:referenceDrivenAssetIdeas.filter(row=>row.domain==='CHARACTER').length,
        playerAndNpcShareAssetPool:true,
        productionVerified:false,
        gameplayAuthority:false
      }),
      baseArchetypes:freezeList(companyLibrary?.characterPreparation?.baseArchetypes||[]),
      modularParts:freezeList(companyLibrary?.characterPreparation?.modularParts||[]),
      weaponPacks:freezeList(unique([...(companyLibrary?.actionMotionLibrary?.weaponPacks||[]),...(companyRegistry?.duelCombatMotion?.weaponFamilies||[])])),
      survivalWildlife:freeze({
        enabled:companyRegistry?.survivalWildlifePack?.status==='PREPARED_SEMANTIC_LIBRARY',
        requested:survivalWildlifeRequested,
        requestedSpecies:requestedWildlifeSpecies,
        species:freezeList(companyRegistry?.survivalWildlifePack?.species||[]),
        playerSkins:freezeList(companyRegistry?.survivalWildlifePack?.playerSkins||[]),
        visualQuality:freeze(companyRegistry?.survivalWildlifePack?.visualQuality||{}),
        motionQuality:freezeList(companyRegistry?.survivalWildlifePack?.motionQuality||[]),
        reference:freeze(companyRegistry?.survivalWildlifePack?.reference||{}),
        playerMotionPreview:survivalWildlifeRequested?freeze(createSurvivalPlayerMotionProfile({
          platform:resolvedTarget==='roblox'?'ROBLOX':'UNITY',
          tool:requestedSurvivalTool
        })):null,
        wildlifeVisualPreview:survivalWildlifeRequested?freeze(createSurvivalWildlifeAssetProfile({
          species:requestedWildlifeSpecies||'BEAR',
          platform:resolvedTarget==='roblox'?'ROBLOX':'UNITY'
        })):null,
        wildlifeMotionPreview:survivalWildlifeRequested?freeze(createSurvivalWildlifeMotionProfile({
          species:requestedWildlifeSpecies||'BEAR',
          platform:resolvedTarget==='roblox'?'ROBLOX':'UNITY'
        })):null,
        runtimeVerificationRequired:companyRegistry?.survivalWildlifePack?.productionVerified!==true
      }),
      duelCombatMotion:freeze({
        enabled:companyRegistry?.duelCombatMotion?.status==='PREPARED_SEMANTIC_LIBRARY',
        requested:duelCombatRequested,
        requestedWeaponFamily,
        requestedMartialStyle,
        requestedCombatRole,
        authoringPreview:duelCombatRequested?freeze(createDuelCombatAuthoringRecipe({
          weaponFamily:requestedWeaponFamily||'UNARMED',
          martialStyle:requestedMartialStyle||'MMA_HYBRID',
          role:requestedCombatRole,
          platform:resolvedTarget==='roblox'?'ROBLOX':'UNITY'
        })):null,
        target:clean(companyRegistry?.duelCombatMotion?.target)||null,
        implementation:clean(companyRegistry?.duelCombatMotion?.implementation)||null,
        productionVerified:companyRegistry?.duelCombatMotion?.productionVerified===true,
        weaponFamilies:freezeList(companyRegistry?.duelCombatMotion?.weaponFamilies||[]),
        unarmedStyles:freezeList(companyRegistry?.duelCombatMotion?.unarmedStyles||[]),
        requiredRoles:freezeList(companyRegistry?.duelCombatMotion?.requiredRoles||[]),
        commonCombatCoverage:freezeList(companyRegistry?.duelCombatMotion?.commonCombatCoverage||[]),
        qualityRequirements:freezeList(companyRegistry?.duelCombatMotion?.qualityRequirements||[]),
        runtimeVerificationRequired:companyRegistry?.duelCombatMotion?.productionVerified!==true,
        exactThirdPartyClipCopyForbidden:companyRegistry?.rules?.referenceGameClipCopyForbidden===true
      }),
      motionMinimums:freeze(companyLibrary?.actionMotionLibrary?.minimumCoverage||{}),
      qualityRequirements:freezeList(companyLibrary?.actionMotionLibrary?.qualityRequirements||[]),
      reusableLibraries:freezeList(companyLibrary?.reusableLibraries||[]),
      preparedArtifactMayNotClaimProductionPass:companyLibrary?.promotionRules?.preparedArtifactMayNotClaimProductionPass===true,
      runtimeVerifiedConsumerRequiredBeforePromotion:companyLibrary?.promotionRules?.runtimeVerifiedConsumerRequiredBeforeCompanyAssetPromotion===true,
      platformSpecificReauthoringRequired:companyLibrary?.promotionRules?.platformSpecificReauthoringRequired===true,
      mandatoryConsumer:companyLibrary?.consumption?.requiredForEveryNativeGameDevelopment===true&&['unity','roblox','web'].includes(resolvedTarget),
      lookupBeforeAssetChoice:companyLibrary?.consumption?.lookupBeforeAssetChoice===true,
      externalGapFillBeforeNewAuthoring:companyLibrary?.gapFill?.enabled===true,
      gapFillOrder:freezeList(companyLibrary?.gapFill?.order||[]),
      studioMotionTarget:clean(companyLibrary?.studioMotionProgram?.target)||null,
      studioMotionPriority:freezeList(companyLibrary?.studioMotionProgram?.priorityBootstrap||[]),
      humanoidFoundation:freeze(companyLibrary?.studioMotionProgram?.humanoidFoundation||{}),
      creatureFamilies:freezeList(companyLibrary?.studioMotionProgram?.creatureFamilies||[]),
      bipedCreature:freeze({
        enabled:companyLibrary?.bipedCreatureMotionStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.bipedCreatureMotionStudio?.target)||null,
        taxonomy:freeze(companyLibrary?.bipedCreatureMotionStudio?.taxonomy||{}),
        sharedRigDoesNotImplySharedMotionIdentity:companyLibrary?.bipedCreatureMotionStudio?.sharedRigDoesNotImplySharedMotionIdentity===true,
        speedScaleOnlyVariationForbidden:companyLibrary?.bipedCreatureMotionStudio?.speedScaleOnlyVariationForbidden===true,
        specialBodyPartBindings:freezeList(companyLibrary?.bipedCreatureMotionStudio?.specialBodyPartBindings||[]),
        minotaurProfile:freeze(companyLibrary?.bipedCreatureMotionStudio?.minotaurProfile||{}),
        goblinProfile:freeze(companyLibrary?.bipedCreatureMotionStudio?.goblinProfile||{}),
        runtimeQa:freezeList(companyLibrary?.bipedCreatureMotionStudio?.runtimeQa||[])
      }),
      styleVariants:freeze({
        enabled:companyLibrary?.styleVariantTransformation?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.styleVariantTransformation?.target)||null,
        supportedStyles:freezeList(companyLibrary?.styleVariantTransformation?.supportedStyleFamilies||[]),
        transformAxes:freezeList(companyLibrary?.styleVariantTransformation?.transformAxes||[]),
        cartoonProfile:freeze(companyLibrary?.styleVariantTransformation?.cartoonProfile||{}),
        interLibraryBindings:freezeList(companyLibrary?.styleVariantTransformation?.interLibraryBindings||[]),
        graphRule:clean(companyLibrary?.styleVariantTransformation?.graphRule)||null,
        styleLockAlwaysWins:companyLibrary?.styleVariantTransformation?.styleLockAlwaysWins===true,
        gameplayAuthorityImmutable:companyLibrary?.styleVariantTransformation?.preservationRules?.gameplayBalanceSaveProgressionEconomyHitCooldownMultiplayerIntentImmutable===true,
        rootMotionEnvelopeRequired:companyLibrary?.styleVariantTransformation?.preservationRules?.rootMotionMustRespectAuthoritativeMovementEnvelope===true,
        contactMarkersSynchronized:companyLibrary?.styleVariantTransformation?.preservationRules?.contactMarkersMustRemainSynchronized===true,
        sameSourceMayHaveMultipleStyleVariants:companyLibrary?.styleVariantTransformation?.preservationRules?.sameSourceCanProduceMultipleStyleVariants===true,
        runtimeVerificationRequired:companyLibrary?.styleVariantTransformation?.preservationRules?.styleVariantPromotionRequiresTargetGameRuntimeVerification===true
      }),
      motionDirector:freeze({
        enabled:companyLibrary?.motionDirectorSystem?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.motionDirectorSystem?.target)||null,
        implementation:clean(companyLibrary?.motionDirectorSystem?.implementation)||null,
        internalModuleOnly:companyLibrary?.motionDirectorSystem?.internalModuleOnly===true,
        continuousExpansion:companyLibrary?.motionDirectorSystem?.continuousExpansion?.enabled===true,
        noArtificialMotionCategoryCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialMotionCategoryCap===true,
        noArtificialCombinationCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialCombinationCap===true,
        compositionChannels:freezeList(companyLibrary?.motionDirectorSystem?.compositionChannels||[]),
        motionDNAFields:freezeList(companyLibrary?.motionDirectorSystem?.motionDNAFields||[]),
        motionFamilies:freeze(companyLibrary?.motionDirectorSystem?.motionFamilies||{}),
        grammars:freeze(companyLibrary?.motionDirectorSystem?.motionGrammar||{}),
        compatibilityDimensions:freezeList(companyLibrary?.motionDirectorSystem?.compatibilityGraph?.dimensions||[]),
        contextInputs:freezeList(companyLibrary?.motionDirectorSystem?.contextSelector?.inputs||[]),
        reactionInputs:freezeList(companyLibrary?.motionDirectorSystem?.reactionMatcher?.inputs||[]),
        pairFamilies:freezeList(companyLibrary?.motionDirectorSystem?.pairMotion?.families||[]),
        speciesSignatureSlots:freezeList(companyLibrary?.motionDirectorSystem?.speciesSignature?.slots||[]),
        mutationAllowed:freezeList(companyLibrary?.motionDirectorSystem?.motionMutation?.allowed||[]),
        variationMemory:freeze(companyLibrary?.motionDirectorSystem?.variationMemory||{}),
        libraryGraphNodes:freezeList(companyLibrary?.motionDirectorSystem?.libraryInterlink?.nodes||[]),
        platformAdapters:freeze(companyLibrary?.motionDirectorSystem?.platformAdapters||{}),
        runtimeQa:freezeList(companyLibrary?.motionDirectorSystem?.runtimeQa||[]),
        transitionDirector:freeze(companyLibrary?.motionDirectorSystem?.transitionDirector||{}),
        automaticContactQa:freeze(companyLibrary?.motionDirectorSystem?.automaticContactQa||{}),
        gameplayEventMotionBinding:freeze(companyLibrary?.motionDirectorSystem?.gameplayEventMotionBinding||{}),
        proceduralMotionLayer:freeze(companyLibrary?.motionDirectorSystem?.proceduralMotionLayer||{}),
        groupMotionDirector:freeze(companyLibrary?.motionDirectorSystem?.groupMotionDirector||{}),
        multiActorMotion:freeze(companyLibrary?.motionDirectorSystem?.multiActorMotion||{}),
        emotionIntentLayer:freeze(companyLibrary?.motionDirectorSystem?.emotionIntentLayer||{}),
        motionLod:freeze(companyLibrary?.motionDirectorSystem?.motionLod||{}),
        motionLineage:freeze(companyLibrary?.motionDirectorSystem?.motionLineage||{}),
        runtimeMotionLearning:freeze(companyLibrary?.motionDirectorSystem?.runtimeMotionLearning||{}),
        gameplayAuthority:companyLibrary?.motionDirectorSystem?.authorityGuard?.motionDirectorOwnsPresentationSelectionAndCompositionOnly===true?false:null
      }),
      motionBootstrap:freeze({
        status:clean(companyRegistry?.motionBootstrap?.status)||null,
        productionVerified:companyRegistry?.motionBootstrap?.productionVerified===true,
        setCount:Array.isArray(companyRegistry?.motionBootstrap?.sets)?companyRegistry.motionBootstrap.sets.length:0,
        setIds:freezeList((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.id)).filter(Boolean)),
        archetypes:freezeList((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.archetype)).filter(Boolean)),
        bodyPlans:freezeList([...new Set((companyRegistry?.motionBootstrap?.sets||[]).map(row=>clean(row.bodyPlan)).filter(Boolean))]),
        platformTargets:freezeList(companyRegistry?.motionBootstrap?.platformTargets||[]),
        verificationRule:clean(companyRegistry?.motionBootstrap?.verificationRule)||null
      }),
      motionAutoGapFill:freeze({
        enabled:motionAutoGapActive,
        target:'AUTOMATIC_MOTION_COVERAGE_GAP_FILL',
        scanTriggers:freezeList(companyLibrary?.autoMotionCoverageGapFill?.scanTriggers||[]),
        requiredCoverageGroups:freezeList(companyLibrary?.autoMotionCoverageGapFill?.requiredCoverageGroups||[]),
        fillOrder:freezeList(companyLibrary?.autoMotionCoverageGapFill?.fillOrder||[]),
        baselineMinimums:freeze(companyLibrary?.autoMotionCoverageGapFill?.baselineMinimums||{}),
        bodyPlanAdjustments:freeze(companyLibrary?.autoMotionCoverageGapFill?.bodyPlanAdjustments||{}),
        preparedSemanticNeverVerified:companyLibrary?.autoMotionCoverageGapFill?.promotionGate?.preparedSemanticNeverEqualsRuntimeVerified===true,
        usagePriorityEnabled:companyLibrary?.autoMotionCoverageGapFill?.usagePriority?.enabled===true,
        duplicateControlEnabled:companyLibrary?.autoMotionCoverageGapFill?.duplicateControl?.enabled===true,
        auditedSetCount:motionAutoFillPlans.length,
        incompleteSetCount:motionAutoFillPlans.filter(row=>!row.complete).length,
        verifiedCompleteSetCount:motionAutoFillPlans.filter(row=>row.verifiedComplete).length,
        plannedSemanticSeedCount:motionAutoFillPlans.reduce((n,row)=>n+row.semanticSeeds.length,0),
        plans:freezeList(prioritizedMotionAutoFillPlans)
      }),
      studioAssetUniverse:freeze({
        enabled:universeActive,
        target:clean(universeContract?.target)||null,
        implementation:clean(universeContract?.implementation)||null,
        internalModuleOnly:universeContract?.internalModuleOnly===true,
        phases:freeze(universeContract?.phases||{}),
        families:freeze(Object.keys(universeContract?.families||{})),
        creatureBodyPlanTargetMinimum:Number(universeContract?.creatureUniverse?.bodyPlanTargetMinimum||0),
        creatureSpeciesTargetMinimum:Number(universeContract?.creatureUniverse?.speciesTargetMinimum||0),
        creatureBodyPlans:freezeList(universeContract?.creatureUniverse?.bodyPlans||[]),
        creatureSpecies:freezeList(universeContract?.creatureUniverse?.species||[]),
        clothingLayerSlots:freezeList(universeContract?.clothingAndArmor?.layerSlots||[]),
        clothingThemes:freezeList(universeContract?.clothingAndArmor?.themes||[]),
        buildingThemes:freezeList(universeContract?.buildingGrammar?.themes||[]),
        buildingRoomKits:freezeList(universeContract?.buildingGrammar?.roomKits||[]),
        biomes:freezeList(universeContract?.biomeDna?.biomes||[]),
        materialSurfaces:freezeList(universeContract?.materialLibrary?.surfaces||[]),
        audioFamilies:freezeList(universeContract?.audioVariation?companyRegistry?.studioAssetUniverse?.audioCatalog?.families||[]:[]),
        baseMaterialLibrary:freeze({
          status:clean(companyRegistry?.baseMaterialLibrary?.status)||null,
          productionVerified:companyRegistry?.baseMaterialLibrary?.productionVerified===true,
          atomCount:Number(companyRegistry?.baseMaterialLibrary?.atomCount||0),
          families:freeze(companyRegistry?.baseMaterialLibrary?.families||{}),
          mutationAxes:freezeList(companyRegistry?.baseMaterialLibrary?.mutationAxes||[]),
          combinationRules:freeze(companyRegistry?.baseMaterialLibrary?.combinationRules||{})
        }),
        variantRecipeTemplates:freezeList(companyRegistry?.variantRecipeTemplates||[]),
        identityBudgets:freeze(companyRegistry?.identityBudgets||{}),
        baseMaterialRotation:freeze({
          policy:freeze(companyRegistry?.baseMaterialRotation||{}),
          current:freeze(studioUniversePlan?.baseMaterialRotation||{})
        }),
        gameVisualDna:freeze(studioUniversePlan?.gameVisualDna||{}),
        loadout:freeze(studioUniversePlan?.loadout||{}),
        futureDemand:freeze(studioUniversePlan?.futureDemand||{}),
        usageFeedback:freeze(studioUniversePlan?.usageFeedback||{}),
        testbed:freeze(studioUniversePlan?.testbed||{}),
        quality120:freeze(studioUniversePlan?.quality120||{}),
        coverage:freeze(studioUniversePlan?.coverage||{}),
        heatmap:freezeList(studioUniversePlan?.heatmap?.rows||[]),
        highestPriorityGap:freeze(studioUniversePlan?.heatmap?.highestPriorityGap||null),
        gapFill:freeze(studioUniversePlan?.gapFill||{}),
        plannedSemanticSeedCount:Number(studioUniversePlan?.gapFill?.actions?.reduce((n,row)=>n+(row.semanticSeeds?.length||0),0)||0),
        autonomous24h:universeContract?.autonomousGapFill24h?.enabled===true,
        preparedSemanticMayNotClaimVerified:universeContract?.autonomousGapFill24h?.preparedSemanticMayNotClaimVerified===true,
        actualRuntimeConsumerRequiredBeforePromotion:universeContract?.autonomousGapFill24h?.actualRuntimeConsumerRequiredBeforePromotion===true,
        existingCanonicalLearningChainOnly:universeContract?.runtimeLearning?.existingCanonicalLearningChainOnly===true,
        conceptDirector:freeze({
          enabled:universeContract?.conceptDirector?.enabled===true,
          presetFamilies:freezeList(universeContract?.conceptDirector?.presetFamilies||[]),
          requested:freeze(studioUniversePlan?.concept||{}),
          axes:freeze(universeContract?.conceptDirector?.axes||{}),
          weightedBlendAllowed:universeContract?.conceptDirector?.weightedBlendAllowed===true,
          styleLockWins:universeContract?.conceptDirector?.gameStyleLockWinsOverGenericPreset===true,
          conceptConflictQaRequired:universeContract?.conceptDirector?.conceptConflictQaRequired===true,
          propagation:freezeList(universeContract?.conceptDirector?.conceptMustPropagateTo||[])
        }),
        worldGenerationStudio:freeze({
          enabled:universeContract?.worldGenerationStudio?.enabled===true,
          implementation:clean(universeContract?.worldGenerationStudio?.implementation)||null,
          referenceInputs:freezeList(universeContract?.worldGenerationStudio?.referenceAbstraction?.allowedInputs||[]),
          extractOnly:freezeList(universeContract?.worldGenerationStudio?.referenceAbstraction?.extractOnly||[]),
          directLayoutCopyForbidden:universeContract?.worldGenerationStudio?.referenceAbstraction?.directMapLayoutLandmarkOrDistinctiveSceneCopyForbidden===true,
          mapDnaFields:freezeList(universeContract?.worldGenerationStudio?.mapDnaFields||[]),
          generationPipeline:freezeList(universeContract?.worldGenerationStudio?.generationPipeline||[]),
          routeGrammar:freeze(universeContract?.worldGenerationStudio?.routeGrammar||{}),
          streaming:freeze(universeContract?.worldGenerationStudio?.runtimeStreaming||{}),
          learning:freeze(universeContract?.worldGenerationStudio?.learning||{}),
          visionObservationContract:freeze(universeContract?.worldGenerationStudio?.referenceAbstraction?.visionObservationContract||{}),
          referenceImageStudies,
          readyObservationCount:referenceImageStudies.filter(row=>row.request?.ready&&row.observation?.valid).length,
          verifiedObservationCount:referenceImageStudies.filter(row=>row.observation?.verifiedAgainstSource===true).length
        })
      }),
      retargetCleanupRequirements:freezeList(companyLibrary?.studioMotionProgram?.retargetCleanupRequirements||[]),
      unarmedCombat:freeze({
        enabled:companyLibrary?.unarmedCombatStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
        target:clean(companyLibrary?.unarmedCombatStudio?.target)||null,
        noArtificialStyleOrMotionCap:companyLibrary?.unarmedCombatStudio?.noArtificialStyleOrMotionCap===true,
        styleFamilies:freezeList(companyLibrary?.unarmedCombatStudio?.supportedStyleFamilies||[]),
        motionFamilies:freeze(companyLibrary?.unarmedCombatStudio?.motionFamilies||{}),
        comboRoles:freezeList(companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.roles||[]),
        motionMetadata:freezeList(companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.motionMetadata||[]),
        qualityRequirements:freezeList(companyLibrary?.unarmedCombatStudio?.qualityRequirements||[]),
        timingMarkersCannotOwnGameplayRules:companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.animationMayExposeTimingMarkersButAuthoritativeHitboxDamageCooldownAndComboRulesRemainGameplayOwned===true,
        externalLicensedMotionGapFill:companyLibrary?.unarmedCombatStudio?.externalMotionUse?.searchExternalLicensedMotionBeforeAuthoringMissingCoverage===true,
        platformNativeRuntimeVerificationRequired:companyLibrary?.unarmedCombatStudio?.externalMotionUse?.retargetCleanupAndPlatformNativeRuntimeValidationRequired===true
      }),
      searchableCompanyAssetCount:companyManifestAssets(companyRegistry,repoRoot).length,
      verifiedCompanyAssetCount:companyManifestAssets(companyRegistry,repoRoot).filter(asset=>asset.companyVerified===true).length,
      externalSourceCount:Array.isArray(companyRegistry?.externalSources)?companyRegistry.externalSources.length:0,
      externalSourceIds:freezeList((companyRegistry?.externalSources||[]).map(row=>clean(row.id)).filter(Boolean))
    }),
    highEndVisual:freeze({
      enabled:highEndActive,
      target:clean(highEnd?.target)||null,
      visualTargetFrames:freezeList(highEnd?.visualTargetFrames?.roles||[]),
      defaultAssetCategories:freezeList(highEnd?.defaultAssetApplication?.categories||[]),
      mutationCapabilities:freezeList(highEnd?.assetMutationAndExpansion?.allowedCapabilities||[]),
      heroQualityTargets:freezeList(highEnd?.qualityHierarchy?.HERO||[]),
      worldIdentityTargets:freezeList(highEnd?.qualityHierarchy?.WORLD_IDENTITY||[]),
      backgroundAndEnvironmentFirstClass:highEnd?.defaultAssetApplication?.backgroundAndEnvironmentFirstClass===true,
      antiKitbashGateRequired:highEnd?.cohesion?.antiKitbashGateRequired===true,
      internalPlatformReleasePresentationGateRequired:highEnd?.internalPlatformReleasePresentationGateRequired===true,
      publicReleasePresentationGateRequired:highEnd?.publicReleasePresentationGateRequired===true,
      presentationCompletionIsTerminal:highEnd?.presentationCompletionIsTerminal===true,
      continuousEvolution:highEnd?.continuousEvolution?.enabled===true,
      cinematicDirectionRequired:highEnd?.cinematicDirection?.enabled===true,
      ownerChangeRequestStabilityRequired:highEnd?.ownerChangeRequestStability?.enabled===true
    }),
    capabilities:freeze({
      webDirectAuthoring:WEB_DIRECT_AUTHORING,
      unityDirectAuthoring:UNITY_DIRECT_AUTHORING,
      robloxDirectAuthoring:ROBLOX_DIRECT_AUTHORING,
      binaryAuthoringKinds:BINARY_AUTHORING_KINDS,
      canChooseReuse:true,
      canChooseDirectAuthoring:['web','unity','roblox'].includes(resolvedTarget),
      canRequestGenerator:true
    }),
    summary:freeze({
      decisionCount:decisions.length,
      reuseCandidateTypes:reuseCount,
      sameGameRobloxCandidateTypes:sameGameCount,
      discoveredSameGameRobloxAssets:sameGameRobloxAssets.length,
      baseMaterialSelectedAtoms:baseMaterialLoadout.selectedAtomCount,
      robloxSelectionHandoffRequired:baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,
      companyCandidateTypes:companyCount,
      repositoryCandidateTypes:repositoryCount,
      externalCandidateTypes:externalCount,
      directAuthorableTypes:directCount,
      missingSelectorTypes:(selector.missingTypes||[]).length,
      heroModelRequested:modelRouting.heroRequested,
      selectedAssetModel:modelRouting.selectedModel,
      dccAuthoringRequiredTypes:nativeAuthoringExecution.dcc.requiredTypes.length,
      nativeTextAuthoringRequiredTypes:nativeAuthoringExecution.nativeText.requiredTypes.length
    }),
    policy:freeze({
      qualityAndGameIdentityFirst:true,
      artDirectionStyleLockRequiredBeforeAssetChoice:true,
      backgroundMustMatchWorldRegionAndNarrativeContext:true,
      monsterVisualMustMatchWorldEcologyAndCombatRole:true,
      actionActorStateSetRequired:freezeList(['IDLE','MOVE','ATTACK','HIT','DEATH']),
      webPresentationMustPassBeforeNativeHandoff:false,
      unityWebValidationSurfaceOnly:true,
      nativeDevelopmentAdmissionUsesMinimumDesign:true,
      defaultPurposefulAssetsRequired:highEnd?.defaultAssetApplication?.enabled===true,
      assetMutationAndExpansionRequired:highEnd?.assetMutationAndExpansion?.enabled===true,
      environmentAndBackgroundFirstClass:highEnd?.defaultAssetApplication?.backgroundAndEnvironmentFirstClass===true,
      visualTargetFramesRequired:highEnd?.visualTargetFrames?.required===true,
      antiKitbashGateRequired:highEnd?.cohesion?.antiKitbashGateRequired===true,
      beforeAfterVisualRegressionRequired:highEnd?.runtimeQa?.beforeAfterVisualRegressionRequired===true,
      existingAssetIsCandidateNotMandatory:true,
      crossPlatformWebAssetDirectReuseForbidden:true,
      nativeReuseRequiresTargetCompatibility:true,
      licenseAndCommercialUseGateRequired:true,
      animationEvidenceRequiredForActors:true,
      mobilePerformanceRequired:true,
      noEmojiPlaceholder:true,
      noGeometricPlaceholder:true,
      noPlaceholderMonsterOrCharacter:true,
      noContextMismatchBackground:true,
      directAuthoredSvgCanvasMustBeFinalQualityNotPlaceholder:true,
      nativeProceduralAuthoringMustBeFinalQualityNotPrimitivePlaceholder:true,
      composedLowPolyRequiresMultipleMeaningfulPartsAndStyleLock:true,
      binaryAssetsDirectTextEditForbidden:true,
      gameplaySaveProgressionEconomyMutationForbiddenForAssetReasons:true,
      sourceAndTransformProvenanceRequiredForReuse:true,
      authoringGeneratorRequestDoesNotCountAsAssetCompleted:true,
      assetUseRequiresRuntimeVisualQa:true,
      siblingTopLevelGraphicsTasksForbidden:true,
      internalModuleMayNotSelfAcceptGraphicsPass:true,
      allAssetDecisionsFanInToGraphicsProductionRoot:true,
      continuousPresentationEvolution:highEnd?.continuousEvolution?.enabled===true,
      graphicsPassIsCheckpointNotTerminal:highEnd?.graphicsPassMeaning==='VERIFIED_PRESENTATION_CHECKPOINT_NOT_TERMINAL_COMPLETION',
      highEndPresentationCompletionIsReleaseGate:false,
      ownerChangeRequestStabilityRequired:highEnd?.ownerChangeRequestStability?.enabled===true,
      companyGraphicsLibrary24h:companyLibraryActive,
      companyLibraryLookupRequiredBeforeNativeAssetChoice:companyLibrary?.consumption?.lookupBeforeAssetChoice===true,
      sameGameRobloxAssetDiscoveryEnabled:resolvedTarget==='roblox',
      sameGameRobloxAssetIsCandidateOnlyUntilRuntimeVerified:true,
      unverifiedSameGameRobloxAssetDoesNotOutrankVerifiedCompanyAsset:true,
      existingRepositoryInventoryBeforeExternal:companyLibrary?.gapFill?.order?.[0]==='INVENTORY_EXISTING_REPOSITORY_ASSETS',
      externalGapFillBeforeNewAuthoring:companyLibrary?.gapFill?.enabled===true,
      unityRobloxLibraryVariantsSeparated:companyLibrary?.promotionRules?.platformSpecificReauthoringRequired===true,
      actionReadyMotionVarietyRequired:companyLibraryActive,
      studioGradeMotionRequired:companyLibrary?.studioMotionProgram?.target==='STUDIO_GRADE_GAME_MOTION',
      unarmedVersusActionMotionRequired:companyLibrary?.unarmedCombatStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      unarmedStyleResearchNoArtificialCap:companyLibrary?.unarmedCombatStudio?.noArtificialStyleOrMotionCap===true,
      wuxiaUnarmedMotionResearch:companyLibrary?.unarmedCombatStudio?.supportedStyleFamilies?.includes('WUXIA_UNARMED_FANTASY')===true,
      unarmedAnimationMarkersCannotOwnGameplayRules:companyLibrary?.unarmedCombatStudio?.comboMotionGrammar?.animationMayExposeTimingMarkersButAuthoritativeHitboxDamageCooldownAndComboRulesRemainGameplayOwned===true,
      pairedThrowPlatformRuntimeVerificationRequired:companyLibrary?.unarmedCombatStudio?.platformAdaptation?.pairedTwoActorThrowAlignmentMustBeReauthoredAndRuntimeVerifiedPerPlatform===true,
      retargetAndCleanupRequiredForExternalMotion:companyLibrary?.studioMotionProgram?.externalMotionUse?.retargetAndCleanupRequired===true,
      speciesMotionStudyRequired:companyLibrary?.studioMotionProgram?.creatureRules?.speciesReferenceStudyRequired===true,
      bipedCreatureBodyPlanMotionRequired:companyLibrary?.bipedCreatureMotionStudio?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      sharedRigDoesNotImplySharedMotionIdentity:companyLibrary?.bipedCreatureMotionStudio?.sharedRigDoesNotImplySharedMotionIdentity===true,
      bipedSpeedScaleOnlyVariationForbidden:companyLibrary?.bipedCreatureMotionStudio?.speedScaleOnlyVariationForbidden===true,
      styleVariantDerivationAllowed:companyLibrary?.styleVariantTransformation?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      cartoonStyleVariantAllowed:companyLibrary?.styleVariantTransformation?.supportedStyleFamilies?.includes('CARTOON')===true,
      styleVariantPreservesGameplayAuthority:companyLibrary?.styleVariantTransformation?.preservationRules?.gameplayBalanceSaveProgressionEconomyHitCooldownMultiplayerIntentImmutable===true,
      creatureLibraryGraphInterlinkRequired:Array.isArray(companyLibrary?.styleVariantTransformation?.interLibraryBindings)&&companyLibrary.styleVariantTransformation.interLibraryBindings.includes('CREATURE_RIG_LIBRARY')&&companyLibrary.styleVariantTransformation.interLibraryBindings.includes('ACTION_MOTION_LIBRARY'),
      composableMotionDirectorRequired:companyLibrary?.motionDirectorSystem?.status==='ACTIVE_EXECUTABLE_CONTRACT',
      motionDirectorContinuousExpansion:companyLibrary?.motionDirectorSystem?.continuousExpansion?.enabled===true,
      motionDirectorNoArtificialCombinationCap:companyLibrary?.motionDirectorSystem?.continuousExpansion?.noArtificialCombinationCap===true,
      motionDNARequired:Array.isArray(companyLibrary?.motionDirectorSystem?.motionDNAFields)&&companyLibrary.motionDirectorSystem.motionDNAFields.includes('BODY_PLAN')&&companyLibrary.motionDirectorSystem.motionDNAFields.includes('COMBAT_ROLE'),
      motionCompatibilityGraphRequired:companyLibrary?.motionDirectorSystem?.compatibilityGraph?.required===true,
      contextMotionSelectorRequired:companyLibrary?.motionDirectorSystem?.contextSelector?.enabled===true,
      reactionMatcherRequired:companyLibrary?.motionDirectorSystem?.reactionMatcher?.enabled===true,
      pairMotionRequired:companyLibrary?.motionDirectorSystem?.pairMotion?.enabled===true,
      variationMemoryRequired:companyLibrary?.motionDirectorSystem?.variationMemory?.enabled===true,
      transitionDirectorRequired:companyLibrary?.motionDirectorSystem?.transitionDirector?.enabled===true,
      automaticContactQaRequired:companyLibrary?.motionDirectorSystem?.automaticContactQa?.enabled===true,
      gameplayEventMotionBindingRequired:companyLibrary?.motionDirectorSystem?.gameplayEventMotionBinding?.enabled===true,
      proceduralMotionLayerRequired:companyLibrary?.motionDirectorSystem?.proceduralMotionLayer?.enabled===true,
      groupMotionDirectorRequired:companyLibrary?.motionDirectorSystem?.groupMotionDirector?.enabled===true,
      multiActorMotionRequired:companyLibrary?.motionDirectorSystem?.multiActorMotion?.enabled===true,
      emotionIntentLayerRequired:companyLibrary?.motionDirectorSystem?.emotionIntentLayer?.enabled===true,
      motionLodRequired:companyLibrary?.motionDirectorSystem?.motionLod?.enabled===true,
      motionLineageRequired:companyLibrary?.motionDirectorSystem?.motionLineage?.enabled===true,
      verifiedRuntimeMotionLearningRequired:companyLibrary?.motionDirectorSystem?.runtimeMotionLearning?.enabled===true,
      preparedSemanticCannotTeachPositiveMastery:companyLibrary?.motionDirectorSystem?.runtimeMotionLearning?.preparedSemanticMayNotIncreaseMastery===true,
      rawRuntimeTelemetryDirectTrainingForbidden:companyLibrary?.motionDirectorSystem?.runtimeMotionLearning?.rawTelemetryMayNotCreateTrainingSample===true,
      preparedSemanticMotionSetsDoNotCountAsVerified:companyRegistry?.motionBootstrap?.status==='PREPARED_SEMANTIC_LIBRARY'&&companyRegistry?.motionBootstrap?.productionVerified!==true,
      automaticMotionCoverageGapFill:motionAutoGapActive,
      automaticMotionGapSemanticPreparationAllowed:companyLibrary?.autoMotionCoverageGapFill?.semanticGapPreparation?.enabled===true,
      automaticMotionGapMayNotSelfPromote:companyLibrary?.autoMotionCoverageGapFill?.semanticGapPreparation?.mayNotPromoteCompanyAsset===true,
      motionGapUsagePriorityRequired:companyLibrary?.autoMotionCoverageGapFill?.usagePriority?.enabled===true,
      motionGapDuplicateSuppressionRequired:companyLibrary?.autoMotionCoverageGapFill?.duplicateControl?.enabled===true,
      motionBootstrapAvailable:Array.isArray(companyRegistry?.motionBootstrap?.sets)&&companyRegistry.motionBootstrap.sets.length>0,
      studioAssetUniverseRequired:universeActive,
      universalAssetCoverageScannerRequired:universeContract?.universalCoverageScanner?.enabled===true,
      crossAssetCompatibilityRequired:universeContract?.crossAssetCompatibilityGraph?.enabled===true,
      assetIdentityQaRequired:universeContract?.assetIdentityQa?.enabled===true,
      styleBibleGeneratorRequired:universeContract?.styleBibleGenerator?.enabled===true,
      clothingLayerCompatibilityRequired:universeContract?.clothingAndArmor?.layerCompatibilityRequired===true,
      buildingGrammarRequired:Array.isArray(universeContract?.buildingGrammar?.hardRules)&&universeContract.buildingGrammar.hardRules.length>0,
      biomeDnaRequired:Array.isArray(universeContract?.biomeDna?.biomes)&&universeContract.biomeDna.biomes.length>0,
      libraryHeatmapRequired:universeContract?.libraryHeatmap?.enabled===true,
      autonomousLibraryPopulation24h:universeContract?.autonomousGapFill24h?.enabled===true,
      semanticAssetSeedCannotSelfPromote:universeContract?.autonomousGapFill24h?.preparedSemanticMayNotClaimVerified===true,
      universalAssetLearningUsesExistingCanonicalChain:universeContract?.runtimeLearning?.existingCanonicalLearningChainOnly===true,
      conceptDirectorRequired:universeContract?.conceptDirector?.enabled===true,
      weightedConceptBlendAllowed:universeContract?.conceptDirector?.weightedBlendAllowed===true,
      conceptConflictQaRequired:universeContract?.conceptDirector?.conceptConflictQaRequired===true,
      adaptiveWorldGenerationRequired:universeContract?.worldGenerationStudio?.enabled===true,
      referenceStructureAbstractionRequired:Array.isArray(universeContract?.worldGenerationStudio?.referenceAbstraction?.extractOnly)&&universeContract.worldGenerationStudio.referenceAbstraction.extractOnly.length>0,
      directReferenceMapCopyForbidden:universeContract?.worldGenerationStudio?.referenceAbstraction?.directMapLayoutLandmarkOrDistinctiveSceneCopyForbidden===true,
      mapDnaRequired:Array.isArray(universeContract?.worldGenerationStudio?.mapDnaFields)&&universeContract.worldGenerationStudio.mapDnaFields.length>0,
      seamlessStreamingPlanRequired:universeContract?.worldGenerationStudio?.runtimeStreaming?.perceivedSeamlessStreamingTarget===true,
      referenceImageObservationSupported:universeContract?.worldGenerationStudio?.referenceAbstraction?.visionObservationContract?.enabled===true,
      rawProtectedReferenceImagePersistentLearningForbidden:universeContract?.worldGenerationStudio?.referenceAbstraction?.visionObservationContract?.rawImagePersistentLearningForbidden===true,
      referenceObservationMustBeSourceBound:universeContract?.worldGenerationStudio?.referenceAbstraction?.visionObservationContract?.observationMustBeBoundToSourceId===true,
      gameVisualDnaRequired:universeContract?.gameVisualDna?.enabled===true,
      assetLoadoutSelectorRequired:universeContract?.assetLoadoutSelector?.enabled===true,
      internalLibraryGenreRestrictionForbidden:true,
      crossGenreInternalAssetReuseAllowed:true,
      genreMayInfluencePreferenceOnly:true,
      futureDemandForecastEnabled:universeContract?.futureDemandForecast?.enabled===true,
      studioTestbedEnabled:universeContract?.studioTestbed?.enabled===true,
      verifiedUsageFeedbackEnabled:universeContract?.verifiedUsageFeedback?.enabled===true,
      platformVariantOptimizerEnabled:universeContract?.platformVariantOptimizer?.enabled===true,
      latestExplicitOwnerIntentWinsWithinSameScope:highEnd?.ownerChangeRequestStability?.latestExplicitOwnerIntentWinsWithinSameScope===true,
      wrapperOrShadowPresentationAccumulationForbidden:highEnd?.ownerChangeRequestStability?.wrapperOverrideV2FinalTemporaryPatchAccumulationForbidden===true
    }),
    authority:'graphics-production-input-plan-only'
  });
}

export function assetProductionGuidance(plan={}){
  if(plan?.kind!=='vibe2-asset-production-plan') return '';
  const lines=[
    '[GRAPHICS_PRODUCTION / ASSET INPUT]',
    plan.internalLibraryEvolution?.phase?`[INTERNAL LIBRARY EVOLUTION] ${JSON.stringify(plan.internalLibraryEvolution)}. VOLUME_UP에서는 company-asset-library.json#internalAssetLibraryAutomation.nextVolumeActions의 우선순위를 먼저 소비하고 각 항목을 REUSE_EXISTING→DERIVE_VARIANT→RECOMBINE_EXISTING→LICENSE_VERIFIED_FREE_SOURCE_ADAPT→NEW_AUTHORING 순서로 해결한다. 외부 무료 원본은 CC0 또는 상업 이용·수정 허용이 명확하고 출처/계보를 남길 수 있는 경우만 사용한다. 후보 카탈로그가 충분하면 미리 다운로드하지 말고 메타데이터만 유지하며, 실제 선택된 worklist 항목에서 기존 내부자산 재사용·변형·재조합이 부족할 때만 원본을 자동 취득해 회사 스타일·플랫폼에 맞게 수정한다. 소스 카탈로그가 충분한 동안 작업 집중도는 퀄리티와 자동화 디테일에 둔다. 모든 권장 범위와 필수 role이 충족된 뒤에만 QUALITY_UP_1000으로 전환하며, 이 단계에서는 내부감사 최약 축을 980→1000 구간 중심으로 개선한다. 내부 1000점은 production/runtime 검증과 별개이며 실제 런타임 증거 없이 productionVerified를 올리지 않는다. progressionComplexityProfiles는 VERY_SIMPLE/SURVIVAL_SIMPLE/DEEP_RPG 중 게임 설계에 맞는 표현 깊이를 선택하는 자산 표현 프로필이며 게임 규칙 권한이 아니다. Audio roleContractCount와 actualVerifiedAudioAssetCount를 분리하고 실제 검증 음원이 없으면 음원 파일 보유를 주장하지 않는다. BGM·적응형 음악, 환경 BED/NEAR/MID/DISTANT/SCATTER, 동물 울음·하울링, 전투·스킬·상호작용 SFX, 실내외·오클루전·리버브·거리 밴드, 반복 변형 세트를 서로 다른 역할군으로 관리하고 단일 루프 반복으로 볼륨을 가장하지 않는다. 기존 오디오도 매 유지관리 회차마다 변형 폭·공간감·믹스 우선순위·음악 전환·모바일 예산의 최약 축부터 계속 품질업한다. 정상적인 안전 자산 작업은 owner나 ChatGPT 존재를 기다리지 않고 기존 ASSET_DEVELOPMENT 루프에서 autonomousNextAction을 계속 소비한다. 특정 자산이 라이선스·권리·보안 이유로 막히면 그 자산만 격리하고 다음 안전 작업을 계속하며, 권장 볼륨과 필수 role이 충족되는 즉시 QUALITY_UP_1000 최약 내부감사 축 개선으로 자동 전환한다.`:'',
    plan.flowAssetRequirements?.length?`[FLOW-DRIVEN ASSET REQUIREMENTS] ${JSON.stringify(plan.flowAssetRequirements)}. 게임 플로우가 요구한 시각 역할이다. 특정 회사 자산 ID를 고정하지 않고 현재 실행의 최신 company-asset-library.json에서 다시 해석한다. 내부자산 업데이트 후 다음 실행은 자동으로 더 적합한 후보를 재선택할 수 있다. 라이브러리 사용 자격을 장르로 제한하지 않는다. 자산의 원래 장르와 현재 게임 장르가 달라도 후보에서 제외하지 않고 플랫폼·권리·family/role·기술 호환을 먼저 본 뒤 스타일 적응/재조합한다. 장르는 추천 힌트일 뿐 eligibility gate가 아니다. 자산 계층은 gameplay/balance/progression/save/network 권한을 갖지 않는다.`:'',
    plan.flowAssetLoadout?.selections?.length?`[FLOW-DRIVEN ASSET LOADOUT] ${JSON.stringify(plan.flowAssetLoadout)}. selections의 assetId/applicationMode/replacementAction/sourceFiles를 실제 기존 책임 소스 바인딩에 사용한다. unresolved는 없는 자산을 가짜로 만들거나 임의 ID로 채우지 말고 기존 authoring/gap-fill 규칙으로 넘긴다. USE_AS_IS, LIGHT_THEME_ADAPT, STYLE_ADAPT, RECOMBINE_PARTS, NATIVE_REAUTHOR_BASE 중 선택 결과를 따르고 게임 의미는 보존한다.`:'',
    plan.qualityDNA?`[QUALITY DNA] ${JSON.stringify(plan.qualityDNA)}. 이 값은 현재 자산의 임의 점수가 아니라 게임별 최소 제작 하한이다. 각 type의 minimumFloors와 detailLod를 만족시키도록 강한 축은 잠그고 실패한 축만 수정한다. donor는 실패 축만 교체하고 스타일 정체성·출처·잠긴 특징을 보존한다. 검증 상태나 폴리곤/텍스처 수만으로 고퀄 판정하지 않는다.`:'',
    plan.studioQuality120?.maxScore?`[STUDIO ASSET QUALITY 120] ${JSON.stringify(plan.studioQuality120)}. 120점은 최고 품질 목표이지 게임 연결 허가선이 아니다. 안전·권리·플랫폼 호환을 만족하는 대안이 없으면 100점 미만, 85점 미만 자산도 현재 게임에 실제 연결해 사용하고 Visual Debt를 열어 둔 채 같은 자산을 최약점부터 개선한다. 점수만 낮다는 이유로 빈 primitive나 무자산 상태를 유지하지 않는다. Hero 자산은 전체 게임 품질 기준점으로 먼저 끌어올리고, UI/HUD/인벤토리/아이콘·아이템 월드모델/드랍/장착/제작 아이콘·캐릭터·몬스터·환경·건물·무기·재질·모션·VFX·오디오를 같은 Asset DNA 계보로 묶는다. 매 사이클 weakestAxis/weakestCritic을 우선 수정하고 강한 축은 보존한다. 120점이어도 새로운 검증된 결함이나 더 좋은 제작법이 생기면 계속 진화한다. production-verified는 점수와 별개이며 실제 대상 게임 런타임·바인딩·모바일 성능·회귀·권리 증거가 모두 있어야 한다. positive learning은 검증된 실제 결과만 기존 학습 모터에 넣는다.`:'',
    plan.applyFirstSummary?.enabled?`[APPLY USABLE ASSETS FIRST] ${JSON.stringify(plan.applyFirstSummary)}. 먼저 현재 게임/회사/저장소에서 target-compatible하고 실제 경로 또는 native binding이 있는 자산을 게임에 적용한다. 정확한 역할 자산이 없더라도 같은 역할군의 가장 가까운 호환 라이브러리 자산을 우선 장착·적용하고 민짜·무자산·도형 placeholder 상태를 허용하지 않는다. 품질점수와 내부감사점수는 최초 라이브러리 적용을 막지 않으며 적용 후 visual debt 우선순위에만 사용한다. 적용 후 실제 게임 카메라에서 품질을 확인하고 부족한 부위만 derived variant로 조형·재질·리그·LOD를 보강해 재적용한다. 사용 가능한 자산이 목표 품질에 도달할 수 있는데 새 자산부터 만들지 않는다. 품질이 부족하면 SILHOUETTE/PROPORTION/STRUCTURE/FACE_HANDS_FEET/MATERIAL/RIG/SOCKET/MOTION/LOD/UI_STATE 같은 축으로 분해하고 강한 축은 유지한다. 다른 호환 자산은 전체 대체뿐 아니라 파츠·리그·재질·모션 기증자로 사용해 derived variant를 재조립한다. GAME_CAMERA→MID_RANGE→CLOSEUP→CONTACT 디테일 바닥을 채우고, 랜덤 소품/노이즈/텍스처 과밀로 디테일을 가장하지 않는다. 핵심 형태나 구조 품질이 부분 보강으로 회복 불가능할 때만 전체 신규 제작으로 넘어간다.`:'' ,
    plan.generatedAssetOutputContract?`[GENERATED NATIVE ASSET CONTRACT] ${JSON.stringify(plan.generatedAssetOutputContract)}. Roblox/Unity에서 기존 자산이 목표 품질을 못 채우면 Blender/Python 또는 엔진 네이티브 authoring으로 실제 원본 자산을 만든다. 생성 소스 레시피와 원본/파생 파일, 동일 조건 미리보기, evidence.json, 회사 자산 장부 등록을 남긴다. GLB/이미지 파일이 생겼다는 사실만으로 VERIFIED 처리하지 말고 대상 native 런타임에서 실제 바인딩·표현·성능 검증 뒤 승격한다.`:'',
    plan.modelRouting?`[ASSET MODEL ROUTING] ${JSON.stringify(plan.modelRouting)}. Hero 자산일 때만 선택된 강한 로컬 모델을 사용하고 일반 자산은 baseline을 유지한다. 모델 상향은 중앙 생성 횟수·timeout·context 예산을 늘리는 권한이 아니며, 준비 실패 시 baseline으로 복귀한다.`:'',
    plan.nativeAuthoringExecution?`[NATIVE AUTHORING EXECUTION LOOP] ${JSON.stringify(plan.nativeAuthoringExecution)}. AUTHORING_GENERATOR_REQUEST나 텍스트 계획은 제작 완료가 아니다. Roblox/Unity DCC 대상은 candidate 브랜치 안에 실제 editable source/export/hash/preview/evidence 산출물을 남기고 기존 책임 소스가 생성 native artifact의 정확한 repository path와 artifact SHA256을 엔진 네이티브 표현과 함께 실제 소비하도록 바인딩한다. Web은 SVG/CSS/Canvas/JS/WebAudio/motion-engine 같은 기존 웹 네이티브 authoring을 실제 게임 책임 소스에서 강화한다. Web 산출물을 Roblox/Unity에 그대로 복사하지 말고 같은 게임 정체성과 요구를 플랫폼별 네이티브 형태로 다시 제작한다. 게임 규칙·밸런스·저장·진행·멀티 권한은 바꾸지 않는다. 실제 런타임 캡처와 mobile QA 전에는 VERIFIED나 회사 공용 승격을 주장하지 않는다.`:'',
    plan.detailReview?`[STYLE COMPARISON AND LOCAL REPAIR] ${JSON.stringify(plan.detailReview)}. 같은 원형·카메라·조명·동작·표본 시점으로 카툰/실사/다크를 비교한다. repairs의 현재 소스/캡처 근거가 있는 부위·프레임·editableParameters만 수정하고 previousParameters와 잠긴 특징은 유지한다. 수정 뒤 동일 조건 재촬영으로 재검토하며 캡처 등록이나 파라미터 변경만으로 문제를 닫지 않는다.`:'',
    plan.runtimeVisualReview?`[RUNTIME VISUAL PIXEL REVIEW] ${JSON.stringify(plan.runtimeVisualReview)}. Roblox Studio·Unity Editor/Android APK·Web Browser의 실제 캡처를 현재 sourceRevision에 묶어 픽셀로 검수한다. expectedSubjects 중 해당 view에서 required인 대상만 누락 판정 대상으로 삼고, 가림·화면 밖·판독 불확실은 누락으로 확정하지 않는다. 실제 픽셀에서 확인된 누락 오브젝트·약한 디테일·겹침·잘림·가독성 문제를 APPLY_FIRST 후보와 precisionProduction의 약한 축 입력으로 사용한다. 먼저 사용 가능 자산을 적용하고 부족 축만 파생 제작·재적용하며 게임 규칙·밸런스·저장·네트워크 권한은 바꾸지 않는다. 수정 후 같은 surface/view에서 재캡처해야 하며 캡처 메타데이터만으로 품질 PASS를 주장하지 않는다.`:'',
    plan.motionContinuityAudit?`[MEASURED CONTINUOUS MOTION] ${JSON.stringify(plan.motionContinuityAudit)}. 루트·접촉점·손/무기 목표점=월드 미터, 관절=루트 로컬 미터, 지지물 접촉=동일 supportId의 로컬 미터, 회전/시선 오차=라디안, 표정=0~1 가중치다. violations의 region/frameRange/normalizedTimeRange에서 발 고정·손/무기 접촉·의상 관통·시선 추적·표정 튐을 수정한다. attachments는 active와 effectorWorldPosition/targetWorldPosition, penetrations는 depthMeters, gaze는 tracking과 forwardWorld/targetDirectionWorld, expressions는 morph별 가중치를 모든 프레임에 계측한다. 레지스트리 motionQA.requiredDetailChannels/limits를 작업 입력이 약화할 수 없다. 현재 소스 해시와 클립 전체 표본 및 선언된 채널이 없으면 UNVERIFIED다. 판정 시점·클립 길이·게임 이동 권한을 바꾸지 말고 재측정한다. unmeasuredGroups는 미검수이며 수치 PASS는 전체 시각 품질이나 런타임 승격 PASS가 아니다.`:'',
    plan.runtimeVisualRepair?`[RUNTIME VISUAL REPAIR LOOP] ${JSON.stringify(plan.runtimeVisualRepair)}. defects만 실제 책임 파일에서 수정한다. INTERFACE는 요구된 HUD/MENU/MINIMAP/INTERACTION 표면만, SCENE_OBJECT는 선언된 필수 오브젝트 바인딩만 보완한다. ENVIRONMENT/COHESION/PRESENTATION은 같은 카메라·조명·상태를 유지한 before/after 캡처로 다시 확인한다. 게임 규칙·저장·멀티 권한·판정 타이밍은 수정하지 않는다. 같은 결함은 실제 런타임 재관찰 전에는 닫지 않는다.`:'',
    plan.precisionProduction?`[PRECISION PRODUCTION CHAIN] ${JSON.stringify(plan.precisionProduction)}. 검사 결과를 보고서로 끝내지 않는다. 현재 소스와 실제 화면에서 결함을 찾고 정확한 수정 범위를 만든 뒤, 같은 작업에서 editable source와 native derivative를 실제 제작하고 기존 게임 책임 위치에 적용한다. 디테일은 GAME_CAMERA→MID_RANGE→CLOSEUP→CONTACT 순으로 제작하며 실루엣/구조/재질/접촉을 각각 해결한다. 소품 수나 랜덤 노이즈로 디테일을 대신하지 말고 기능·접촉·날씨·손상 원인을 가진 디테일만 만든다. 제작 성공 후 바로 적용 단계로 넘어가며 검사나 수정 계획만 제출하고 멈추지 않는다. 제작 도구가 없을 때만 정확한 AUTHORING 단계와 필요한 원본을 남기고 완료를 주장하지 않는다.`:'',
    ...(plan.sourceGlbReconstruction||[]).map(source=>`[BASIC GLB TO DETAILED ASSET] ${JSON.stringify(source)}. 기본 GLB의 실제 원형·부품·재질·리그·애니메이션을 재사용하고 약한 형태를 재조형한다. 해부학/구조 접합/의복 겹침/눈꺼풀·입술·손발/문·창·지붕/목재·금속·돌·천의 마감과 사용 흔적을 자산 종류에 맞게 풍부하게 만든다. 단순 subdivide나 노이즈·색 변경으로 완성 처리하지 않는다. 원본은 보존하고 실제 DCC에서 파생본을 만든 뒤 morph/socket/리타겟 연결과 Unity/Web GLB·네이티브 변형을 등록한다. 메시·리깅·텍스처 제작 도구가 없으면 AUTHORING_REQUIRED를 유지한다.`),
    plan.mapDetailReconstruction?`[BASIC MAP TO DETAILED WORLD] ${JSON.stringify(plan.mapDetailReconstruction)}. 내비게이션 수준의 기본 지도에서 길·교차로·구역·랜드마크를 읽고 연결 관계를 먼저 보존한다. 지형/배수→대지/건물/골목→식생→기능성 소품→접합/표면/생활 흔적→주변 동작 순서로 재구성한다. 소품을 균일하게 뿌리거나 안개로 가리지 말고 상업/주거/산업/숲 같은 구역 기능과 사용 원인에 따라 디테일을 배치한다. 도로 폭·문 접근·상호작용 영역·필수 시야·모바일 이동을 지키고 원본 동선 겹침과 실제 경로 보행으로 검수한다.`:'',
    plan.imageAssetCreation?.enabled?`[IMAGE-TO-ASSET CREATION] ${JSON.stringify(plan.imageAssetCreation)}. 이미지 한 장만 있어도 먼저 실제 픽셀을 관찰하고 검증된 관찰에서 나온 task-local 아이디어를 현재 VOLUME_UP worklist 앞에 우선 배치한다. 중앙 registry에는 원본 사진·관찰·임시 아이디어를 영속 저장하지 않는다. 보이는 실루엣·비율·재질 경계·색·시그니처·미세 마감을 추출하고, 뒷면·가려진 접합부·관절·동작은 창작 설계로 구분한다. 정면 복사판이나 이미지 평면으로 최종 모델을 대신하지 않는다. 공통 GLB 원형/부품 재사용→디테일 조형→의상 맞춤→리깅/표정/동작→Unity/Web 파생으로 이어간다. UI/아이콘/배경에도 적용하고 원본과 같은 카메라·중립 조명·실게임 화면에서 비교한다. 픽셀 접근이나 실제 제작 도구가 없으면 필요한 제작 단계로 남기며 완성 처리하지 않는다.`:'',
    plan.companyGraphicsLibrary?.characterNpcCustomization?.requested?`[CHARACTER NPC CUSTOMIZATION] ${JSON.stringify(plan.companyGraphicsLibrary.characterNpcCustomization)}. 플레이어와 NPC는 같은 체형·머리·얼굴·피부·눈·헤어·수염·흉터·문신·화장·피어싱·종족 파츠·의상·액세서리·표정·보행 자산 풀을 공유한다. NPC는 지역/직업/계층/연령/기후/개인 이력으로 조합 편향만 주고 색상만 다른 복제 NPC를 만들지 않는다. 사진 레퍼런스는 보이는 형태와 재질 아이디어만 source-bound로 사용하고 고유 얼굴·의상·UI를 직접 복제하지 않는다.`:'',
    plan.assetSynchronization?`[UNITY / WEB SHARED VISUAL DOCUMENT] status=${plan.assetSynchronization.status}; issues=${plan.assetSynchronization.issues.join('|')||'NONE'}; document=${JSON.stringify(plan.assetSynchronization.document)}; applications=${JSON.stringify(plan.assetSynchronization.applications)}; motions=${JSON.stringify(plan.assetSynchronization.motions)}. 같은 gameId/revision/sourceHash의 커마·스타일·UI·아이콘·동작 설정을 기존 자산 저장소와 작업주문으로 공유한다. SYNC_CONFLICT면 재조회하며 부분 적용하지 않는다. 플랫폼 변형이나 연결점이 없으면 AUTHORING_REQUIRED로 제작하고 문서만으로 동기화 완료를 주장하지 않는다.`:'',
    plan.assetSynchronization?'Unity는 기존 Renderer/SkinnedMeshRenderer/Animator/UI에, 일반 Web은 기존 glTF/렌더러/AnimationMixer 또는 Canvas/DOM/UI 책임 함수에 연결한다. Unity WebGL은 Unity와 같은 C# 프로젝트·프리팹·Animator를 사용한다. 엔진별 morph 축척·재질·리그·LOD는 선언된 platformVariants로 변환한다. 공격 이벤트·클립 길이·저장·권한은 보존하고 같은 정면/측면/후면/동작 프레임·아이콘 크기에서 두 플랫폼을 비교한다.':'',
    plan.assetCustomization?`[CUSTOMIZABLE ASSET AUTHORING] 제작 순서=${plan.assetCustomization.workflow.join('→')}; 초기 조립 ${plan.assetCustomization.effort.quickAssemblyPercent}%, 디테일·모션 마감 ${plan.assetCustomization.effort.detailAndMotionPercent}%, 화면 비교·런타임 검수 ${plan.assetCustomization.effort.comparisonAndRuntimeQaPercent}%. 작업시간은 계획 비율이며 경과시간이나 부품 수만으로 품질을 통과시키지 않는다.`:'',
    plan.assetCustomization?`커마 범위=${Object.entries(plan.assetCustomization.axes).map(([family,axes])=>family+':'+axes.join(',')).join('|')}. 실제 모델의 morph/shape key, 관절, material, socket 이름과 허용 범위를 검사한 뒤 연결한다. 원형·골격·부품을 재사용하고 부족한 부분만 조형한다. 잠긴 얼굴·실루엣·고유 특징은 보존한다.`:'',
    plan.assetCustomization?'외부 GLB는 원본·출처·해시·허용 조건을 보존하고 단위/축/피벗/골격/재질을 정리한 파생본으로 사용한다. 게임 사용·수정 허용과 별도 자산 판매·재배포 허용을 구분한다. Blender로 실제 변형·의상 맞춤·접합부·재질을 제작할 수 없는 worker는 기존 authoring 요청에 필요한 원본과 작업을 남기며 모델을 만들었다고 표시하지 않는다.':'',
    plan.assetCustomization?`최소 품질=${plan.assetCustomization.minimumQuality?.label||'상급 조형 자산'}; 기준=${plan.assetCustomization.minimumQuality?.referencePath||'게임별 승인 기준 화면'}; 세부 마감=${plan.assetCustomization.detailPasses.join('→')}. 도깨비 기준의 얼굴 골격·눈꺼풀·입술·치아·뿔 뿌리·손발·의복 겹침·봉제·재질 분리 수준을 각 자산에 맞게 적용한다. 배경에는 구조 접합부·모서리·누수·마모·생활 흔적을 적용하며 안개나 어두운 색으로 형태 부족을 가리지 않는다.`:'',
    plan.styleBible?`실제 스타일 조형 지침=${JSON.stringify(plan.styleBible)}; 실제 모션 변형 지침=${JSON.stringify(plan.motionStyle)}. 이름만 바꾸지 말고 기존 메시·관절 곡선·재질에 적용한다. 준비→중심 이동→접촉→반동→회복→다음 동작 연결을 다듬고 고정된 판정 시점·클립 길이 안에서 표현만 재배분한다.`:'',
    plan.assetCustomization?'같은 조명·카메라에서 근접/전신 회전/실게임/대표 동작을 비교하고 실패한 부위와 프레임을 지정해 수정한다. 발 미끄러짐·의상 관통·손-무기 접촉·표정·멈춤·회전·중단·사망 전환을 실측한다. 빠진 측정은 UNVERIFIED이며 공통 원형과 모든 파생본에 같은 품질 기준을 적용한다.':'',
    plan.assetCustomization?`UI·아이콘도 같은 품질 기준과 커마 대상이다. 범위=${plan.assetCustomization.uiAndIconReview.scope.join('|')}; 상태=${plan.assetCustomization.uiAndIconReview.states.join('|')}; 아이콘은 ${plan.assetCustomization.uiAndIconReview.iconPreviewPixels.join('/')}px와 실제 표시 크기에서 밝은/어두운 배경을 비교한다. 테두리·모서리·재질·마모·그림자·눌림/선택/비활성 모션을 스타일에 맞추되 클릭 영역·화면 이동·텍스트 가독성·접근성·게임 기능을 보존한다. 이모지나 기본 아이콘의 색만 바꾸는 것은 최종 제작이 아니다.`:'',
    plan.commercialDistillation?.required?('검증된 상업용 블랙박스 증류 적용=필수; retrieved='+plan.commercialDistillation.retrievedCount+'; applied='+plan.commercialDistillation.appliedCount+'; mode='+plan.commercialDistillation.applicationMode+'; coverage='+plan.commercialDistillation.applicationCoveragePct+'%/required '+plan.commercialDistillation.mandatoryApplicationCoveragePct+'%. 메뉴/UI·그래픽·모션·환경·VFX/카메라/피드백 원리를 내부 자산으로 재저작·재구성하고 실제 런타임 검증 결과로 계속 발전시킨다.'): '',
    plan.commercialDistillation?.required?'상업용 원본 에셋·코드·고유 메뉴/장면/애니메이션의 직접 복제는 금지한다. 관찰·증류한 원리를 게임별 Style Lock과 플랫폼 네이티브 규칙에 맞춰 새로운 내부 자산으로 구현한다.':'',
    '이 계획은 독립 그래픽 작업이 아니다. 모든 에셋 결정은 단일 GRAPHICS_PRODUCTION 루트에 입력되고 같은 루트에서 캐릭터·환경·애니메이션·VFX·조명·UI와 함께 fan-in 된다.',
    'Vibe2/Vibe3가 게임 소스 구현 주체이며 현재 게임 정체성과 실제 화면 품질을 기준으로 필요한 에셋 방식을 선택한다.',
    '에셋 선택 전에 승인 설계·최신 아트북에서 게임별 Art Bible, Style Lock, Material/Environment/Animation/VFX/Lighting/UI 언어와 Visual Target Frame을 먼저 확정한다.',
    '기본값은 플레이어·적·NPC·무기·아이템·건축물·지형·배경·식생·소품·UI·VFX·오디오까지 목적 있는 에셋을 적용하는 것이다. primitive/샘플 모형은 prototype fallback만 허용하고 Visual Debt로 남긴다.',
    'Hero 품질 대상(플레이어, 주 보스/적, 시그니처 무기, 핵심 랜드마크/시작지역)은 전체 게임의 스타일 기준점으로 먼저 완성한다.',
    '배경과 환경은 후순위 장식이 아니다. 전경/중경/배경, 지역 랜드마크, set dressing, 환경 스토리텔링, 이동/전투 가독성을 실제 플레이 화면에서 확보한다.',
    '권리가 검증된 기존 에셋은 원본을 덮어쓰지 않고 파츠 재조합·실루엣/비율·재질·지역/정예/보스 파생·LOD 최적화 등 derived 변형으로 게임 고유 에셋화할 수 있다.',
    '서로 다른 에셋 팩을 원형 그대로 섞은 kitbash/sample-project 느낌은 완료가 아니다. Art Bible/재질/실루엣/조명/UI/VFX 언어를 통일한다.',
    '배경은 세계관·지역·서사 맥락에 맞고 몬스터는 생태·전투 역할이 읽히는 실루엣과 표현을 가져야 한다.',
    '액션·전투 캐릭터는 Web부터 IDLE/MOVE/ATTACK/HIT/DEATH 상태를 실제 게임 상태와 연결하고 표현 런타임을 통과한 뒤 native 플랫폼으로 이어간다.',
    plan.companyGraphicsLibrary?.enabled?'회사 공용 그래픽 라이브러리는 24시간 idle 준비를 계속하지만 연습 산출물은 바로 production asset이 아니다. 실제 게임의 Unity/Roblox 네이티브 적용과 runtime 시각·모션·모바일 QA를 통과한 것만 검증 공용 자산으로 승격한다.':'',
    plan.companyGraphicsLibrary?.enabled?`캐릭터 플랫폼 프로필=${plan.companyGraphicsLibrary.platformProfile}; Unity/Roblox 바이너리·리그는 직접 공유하지 않고 공통 실루엣/체형/장비 의미만 공유한 뒤 네이티브 재authoring한다.`:'',
    plan.companyGraphicsLibrary?.enabled?`액션 모션 최소 커버리지=${JSON.stringify(plan.companyGraphicsLibrary.motionMinimums)}; weaponPacks=${plan.companyGraphicsLibrary.weaponPacks.join('|')}`:'',
    plan.companyGraphicsLibrary?.survivalWildlife?.enabled?`생존 야생동물 자산팩: species=${plan.companyGraphicsLibrary.survivalWildlife.species.join('|')}; skins=${plan.companyGraphicsLibrary.survivalWildlife.playerSkins.join('|')}; 목표=${plan.companyGraphicsLibrary.survivalWildlife.visualQuality.style||'POLISHED_STYLIZED_LOW_POLY'}`:'',
    plan.companyGraphicsLibrary?.survivalWildlife?.requested?`이번 작업은 생존형 캐릭터/야생동물 그래픽·스킨·모션 자산을 실제 게임에 적용한다. 대상 동물=${plan.companyGraphicsLibrary.survivalWildlife.requestedSpecies||'ALL_FOREST_WILDLIFE'}. 플레이어는 가속/제동/회전/점프착지/도구그립까지 관절 모션을 사용하고, 동물은 종별 보행·달리기·먹이행동·경계·공격·피격·사망을 별도 리그 모션으로 만든다. 최종 동물은 primitive-only 금지, 종 실루엣/해부학/스킨 재질 차이를 확보하고 Roblox에서는 Animator/AnimationController+Motor6D/Bone, 가능하면 IKControl로 발 접촉을 보정한다. 레퍼런스의 품질·가독성은 맞추되 제3자 원본 메시/텍스처/스킨/애니메이션을 추출하거나 복제하지 않는다.`:'',
    plan.companyGraphicsLibrary?.duelCombatMotion?.enabled?`결투형 전투 모션=${plan.companyGraphicsLibrary.duelCombatMotion.target}; 무기=${plan.companyGraphicsLibrary.duelCombatMotion.weaponFamilies.join('|')}; 맨손 격투=${plan.companyGraphicsLibrary.duelCombatMotion.unarmedStyles.join('|')}; 역할=${plan.companyGraphicsLibrary.duelCombatMotion.requiredRoles.join('|')}`:'',
    plan.companyGraphicsLibrary?.duelCombatMotion?.requested?`이번 작업은 결투형 전투 모션을 실제 게임에 적용한다. 우선 무기=${plan.companyGraphicsLibrary.duelCombatMotion.requestedWeaponFamily||'AUTO'}; 맨손 스타일=${plan.companyGraphicsLibrary.duelCombatMotion.requestedMartialStyle||'AUTO'}; 역할=${plan.companyGraphicsLibrary.duelCombatMotion.requestedCombatRole||'LIGHT_COMBO'}. 기존 전투 책임 함수와 리그/Animator를 직접 사용하고, 대기→보법→약공 콤보→강공→대시/공중 공격→가드/패링/카운터→피격/넉다운/기상→피니셔 흐름을 연결한다. authoringPreview의 normalized phases·weaponMechanics·martialMechanics를 실제 관절 키포즈/블렌드/접촉 정렬에 사용한다. 원본 제3자 클립을 추출·재배포하지 말고 동일 역할의 독자 키포즈/타이밍으로 네이티브 구현하며 실제 런타임 검증 전 VERIFIED로 표시하지 않는다.`:'',
    plan.companyGraphicsLibrary?.reusableProductionTarget?.motion?.verifiedReusableClipTarget?`공용 모션 runtime-verified 목표=${plan.companyGraphicsLibrary.reusableProductionTarget.motion.verifiedReusableClipTarget}; base author/acquire=${plan.companyGraphicsLibrary.reusableProductionTarget.motion.baseAuthoringOrAcquisitionTarget}; safe derived=${plan.companyGraphicsLibrary.reusableProductionTarget.motion.safeDerivedVariationTarget}; reuse=${(plan.companyGraphicsLibrary.reusableProductionTarget.motion.crossGenreReuse||[]).join('|')}. PREPARED_SEMANTIC은 목표 달성으로 세지 않는다.`:'',
    plan.companyGraphicsLibrary?.reusableProductionTarget?.fullPresentationFamilies?.length?`공용 자산 전체 범위=${plan.companyGraphicsLibrary.reusableProductionTarget.fullPresentationFamilies.join('|')}; 새 시스템을 만들지 않고 기존 Studio Asset Universe gap-fill/GRAPHICS_PRODUCTION에서 채운다.`:'',

    plan.companyGraphicsLibrary?.enabled?`스튜디오 모션=${plan.companyGraphicsLibrary.studioMotionTarget}; 우선 구축=${plan.companyGraphicsLibrary.studioMotionPriority.join('→')}; 리타겟 클린업=${plan.companyGraphicsLibrary.retargetCleanupRequirements.join('|')}`:'',
    plan.companyGraphicsLibrary?.unarmedCombat?.enabled?`맨손 대전 액션=${plan.companyGraphicsLibrary.unarmedCombat.target}; 스타일=${plan.companyGraphicsLibrary.unarmedCombat.styleFamilies.join('|')}; comboRoles=${plan.companyGraphicsLibrary.unarmedCombat.comboRoles.join('|')}; 모션 메타데이터=${plan.companyGraphicsLibrary.unarmedCombat.motionMetadata.join('|')}`:'',
    plan.companyGraphicsLibrary?.unarmedCombat?.enabled?'맨손 모션은 가드/보법/주먹/팔꿈치/무릎/킥/방어·카운터/잡기·던지기/낙법·기상/무협 판타지/대전 리액션을 계속 확장한다. 애니메이션 타이밍 마커는 표현·동기화 정보이며 데미지·히트박스·쿨다운·콤보 판정 권한을 갖지 않는다.':'',
    plan.companyGraphicsLibrary?.bipedCreature?.enabled?`두발 몬스터=${plan.companyGraphicsLibrary.bipedCreature.target}; 체형=${Object.keys(plan.companyGraphicsLibrary.bipedCreature.taxonomy||{}).join('|')}; 고블린=${plan.companyGraphicsLibrary.bipedCreature.goblinProfile.family||'n/a'}; 미노타우로스=${plan.companyGraphicsLibrary.bipedCreature.minotaurProfile.family||'n/a'}`:'',
    plan.companyGraphicsLibrary?.bipedCreature?.enabled?'두발 몹은 인간형 리그를 재사용할 수 있어도 체형/체중/보폭/회전/공격/피격/사망 모션 정체성을 따로 검증한다. 속도 배율만 바꾼 인간 걷기로 종 차이를 대체하지 않는다.':'',
    plan.companyGraphicsLibrary?.styleVariants?.enabled?`Style Variant=${plan.companyGraphicsLibrary.styleVariants.supportedStyles.join('|')}; cartoon transforms=${(plan.companyGraphicsLibrary.styleVariants.cartoonProfile.allowed||[]).join('|')}; graph=${plan.companyGraphicsLibrary.styleVariants.interLibraryBindings.join('→')}`:'',
    plan.companyGraphicsLibrary?.styleVariants?.enabled?'카툰 등 컨셉 변형은 비율·실루엣·키포즈·anticipation·squash/stretch·반동·표정·재질·VFX를 변형하되 이동속도/히트박스/데미지/쿨다운/authoritative root movement와 contact marker 의미를 보존한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?`Motion Director=${plan.companyGraphicsLibrary.motionDirector.target}; channels=${plan.companyGraphicsLibrary.motionDirector.compositionChannels.join('|')}; libraries=${plan.companyGraphicsLibrary.motionDirector.libraryGraphNodes.join('→')}`:'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'Motion DNA와 호환성 그래프를 기준으로 상체/하체/사지/머리/꼬리/날개/VFX/오디오/카메라를 조합하고, 거리·방향·속도·지형·벽·이전 모션을 Context Selector에 넣어 가장 맞는 표현을 선택한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'스킬은 PREPARE→CHARGE/CHANNEL→AIM→RELEASE→IMPACT_RESPONSE→RECOVERY 문법을 사용하고, 피격은 방향/높이/강도/현재자세/벽/공중상태로 Reaction Matcher가 표현을 고른다. Pair Motion은 잡기·던지기·피니셔 등 2인 정렬을 플랫폼별로 검증한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.enabled?'Motion Mutation과 Variation Memory로 Mirror/stance/pose/anticipation/style 파생과 반복 억제를 수행하되 데미지·히트박스·쿨다운·콤보/캔슬·이동 권한은 게임플레이가 유지한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.transitionDirector?.enabled?'Transition Director가 locomotion/combat/skill/reaction/traversal 전환의 pose/root velocity/angular/contact/event sync를 점수화하고 hard pop·접촉 snap·event desync를 FAIL 처리한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.automaticContactQa?.enabled?'Automatic Contact QA가 발 미끄러짐/발고정/손-무기/입·뿔·발톱·꼬리 접촉/2인 정렬/메시 관통/impact event offset을 측정하며 실패 시 검증 승격을 막는다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.gameplayEventMotionBinding?.enabled?'Gameplay event가 추가되면 필요한 motion grammar를 자동 매핑하고 없는 role은 PREPARED_SEMANTIC gap으로 생성하되 실제 판정 권한은 게임플레이가 유지한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.proceduralMotionLayer?.enabled?'Procedural Motion Layer가 foot IK/경사/계단/골반/척추/시선/손그립/꼬리·날개 균형을 플랫폼 예산 안에서 보정한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.groupMotionDirector?.enabled?'Group/Multi-Actor Motion은 pack surround/formation/swarm/보스+소환수/잡기·협동 피니셔 등을 actor spacing·phase offset·contact alignment로 조정하며 AI 의사결정을 침범하지 않는다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.emotionIntentLayer?.enabled?'Emotion/Intent Layer는 calm/alert/aggressive/afraid/confident/enraged/injured/exhausted 등을 자세·호흡·시선·척추·손/발톱 긴장·idle/recovery에 additive 표현한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.motionLod?.enabled?'Motion LOD는 NEAR/MID/FAR에서 layering/IK/시선/secondary/facial/VFX 수준만 줄이고 hit/collision/gameplay 의미는 바꾸지 않는다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.motionLineage?.enabled?'Motion Lineage는 source→cleanup→semantic parent→archetype→style→platform→target-game verification 계보와 hash/provenance를 보존하고 부모 개선 시 파생본을 재검증 대상으로 표시한다.':'',
    plan.companyGraphicsLibrary?.motionDirector?.runtimeMotionLearning?.enabled?'Runtime Motion Learning은 실제 검증 PASS/FAIL만 기존 LIVING_MOTION·ANIMATION_FEEL 학습 모터에 공급한다. PREPARED_SEMANTIC과 raw telemetry는 positive mastery/직접 training 근거가 아니다.':'',
    plan.companyGraphicsLibrary?.motionBootstrap?.setCount?`모션 시드 세트=${plan.companyGraphicsLibrary.motionBootstrap.setCount}개; archetypes=${plan.companyGraphicsLibrary.motionBootstrap.archetypes.join('|')}; 상태=${plan.companyGraphicsLibrary.motionBootstrap.status}. PREPARED_SEMANTIC은 실제 네이티브 클립 PASS가 아니며 실게임 런타임 검증 후에만 승격한다.`:'',
    plan.companyGraphicsLibrary?.motionAutoGapFill?.enabled?`자동 모션 Gap Fill: auditSets=${plan.companyGraphicsLibrary.motionAutoGapFill.auditedSetCount}; incomplete=${plan.companyGraphicsLibrary.motionAutoGapFill.incompleteSetCount}; semanticSeeds=${plan.companyGraphicsLibrary.motionAutoGapFill.plannedSemanticSeedCount}; fillOrder=${plan.companyGraphicsLibrary.motionAutoGapFill.fillOrder.join('→')}`:'',
    plan.companyGraphicsLibrary?.motionAutoGapFill?.enabled?'빈칸은 호환 검증 모션 재사용→안전한 파생→저장소/외부 검증 후보→PREPARED_SEMANTIC 시드→네이티브 신규 제작 순으로 자동 계획한다. 의미 시드는 자동 생성해도 VERIFIED로 승격하지 않는다.':'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.enabled?`Studio Asset Universe=${plan.companyGraphicsLibrary.studioAssetUniverse.target}; families=${plan.companyGraphicsLibrary.studioAssetUniverse.families.join('|')}; creatureBodyPlans=${plan.companyGraphicsLibrary.studioAssetUniverse.creatureBodyPlans.length}; species=${plan.companyGraphicsLibrary.studioAssetUniverse.creatureSpecies.length}; biomes=${plan.companyGraphicsLibrary.studioAssetUniverse.biomes.length}`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.baseMaterialLibrary?.atomCount?`Composable Base Materials=${plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialLibrary.atomCount}; families=${Object.keys(plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialLibrary.families||{}).join('|')}; mutationAxes=${plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialLibrary.mutationAxes.join('|')}`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.variantRecipeTemplates?.length?`Variant Recipes=${plan.companyGraphicsLibrary.studioAssetUniverse.variantRecipeTemplates.map(row=>row.id+':'+row.mutationStrength).join('|')}; 일반/지역/세력/정예/보스/히어로 변형은 색상 변경만으로 구분하지 말고 identity budget을 충족한다.`:'',
    plan.baseMaterialLoadout?.selectedAtomCount?`Game Base Material Loadout recipe=${plan.baseMaterialLoadout.recipe?.id||'NORMAL_VARIANT'}; atoms=${Object.entries(plan.baseMaterialLoadout.families||{}).map(([family,atoms])=>family+':'+atoms.join(',')).join('|')}`:'',
    plan.target==='roblox'&&plan.baseMaterialLoadout?.robloxSelectionHandoff?.handoffRequired?'[ROBLOX STUDIO ASSET SELECTION HANDOFF] 플래너는 소스를 수정하지 않는다. CHARACTER/CREATURE/BUILDING/ENVIRONMENT/WEAPON/SKILL/MATERIAL/AUDIO/VFX/UI/MOTION/PROP 12개 계열을 모두 평가하고 선택 결과를 Vibe2/Vibe3에 전달한다. Vibe2/Vibe3는 현재 게임에 존재하는 각 시스템을 APPLIED 또는 근거가 있는 NOT_APPLICABLE로 판정하고 APPLIED 계열을 기존 책임 소스의 실제 네이티브 표현에 바인딩한다. Roblox 적용 증거는 local STUDIO_ASSET_BINDING_VERSION = 2, local STUDIO_ASSET_SELECTION = {...}, local STUDIO_ASSET_FAMILY_STATUS = { CHARACTER = "APPLIED" 또는 "NOT_APPLICABLE", ... } 형태로 12개 계열을 전부 기록한다. 이 증거 테이블은 실제 Instance/Model/MeshPart/Material/Sound/Particle/Trail/UI/Animator 바인딩을 대신할 수 없다. 배경·지형·마을·집·학교·상점·건물·랜드마크·나무·바위·가구·표지판 등 맵 구성도 ENVIRONMENT/BUILDING/PROP 자산을 실제 사용한다. 마커/선택 목록만 추가하는 no-op, 단순 Part 반복, 색상 변경만으로 업그레이드 완료 처리하는 것은 금지한다. 게임에 없는 시스템은 에셋 조건 때문에 새로 만들지 말고 NOT_APPLICABLE 근거를 기록한다. 게임 규칙·데미지·쿨다운·저장·진행·네트워크 권한은 바꾸지 않는다.':'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.baseMaterialRotation?.policy?.status==='ACTIVE_AUTOMATIC_ROTATION'?`Base Material Rotation=AUTO; retire=${plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialRotation.current.retireCount||0}; graduate=${plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialRotation.current.graduateCount||0}; refill=${plan.companyGraphicsLibrary.studioAssetUniverse.baseMaterialRotation.current.refillCount||0}; 중복/검증실패/반복 호환실패/장기 미사용 재료는 제작 활성 풀에서 제외하고, 마스터 재료는 제작 재사용은 유지한 채 학습·확장 풀에서 졸업시켜 기존 24H Gap Fill이 새 다양성 슬롯을 같은 사이클에 채운다.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.enabled?`Universal Coverage=${plan.companyGraphicsLibrary.studioAssetUniverse.coverage.overallCoveragePercent||0}%; missingSlots=${plan.companyGraphicsLibrary.studioAssetUniverse.coverage.missingSlotCount||0}; preparedSeeds=${plan.companyGraphicsLibrary.studioAssetUniverse.plannedSemanticSeedCount}; highestGap=${plan.companyGraphicsLibrary.studioAssetUniverse.highestPriorityGap?.family||'none'}:${plan.companyGraphicsLibrary.studioAssetUniverse.highestPriorityGap?.subfamily||'none'}`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.conceptDirector?.enabled?`Concept Director=${(plan.companyGraphicsLibrary.studioAssetUniverse.conceptDirector.requested?.weightedStyles||[]).map(x=>x.family+':'+Math.round(x.weight*100)).join('|')||'adaptive'}; 자유 혼합 컨셉은 캐릭터·몬스터·무기·모션·VFX·오디오·건축·바이옴·조명·UI·서사 표현에 함께 전파하고 게임별 Style Lock이 최종 우선한다.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.gameVisualDna?.fingerprint?`Game Visual DNA=${plan.companyGraphicsLibrary.studioAssetUniverse.gameVisualDna.fingerprint}; 이후 업데이트는 이 게임 고유 스타일/월드 언어를 먼저 읽고 유지한다.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.loadout?`Asset Loadout unresolved=${plan.companyGraphicsLibrary.studioAssetUniverse.loadout.unresolved?.length||0}; 검증 회사 자산과 호환/사용 이력 우선으로 자동 선택하고 잠금 선택은 보존한다.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.loadout?`Low-quality fallback=${plan.companyGraphicsLibrary.studioAssetUniverse.loadout.lowQualityFallbackCount||0}; 품질 점수는 바인딩 차단선이 아니다. 더 좋은 안전·호환 대안이 없으면 현재 선택 자산을 실제 연결하고 quality debt를 유지하며 worst-part-first로 개선한다.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.worldGenerationStudio?.enabled?`World Generation Studio는 허용된 이미지/내부 게임/다중 레퍼런스에서 지형·길·밀도·시야·랜드마크 위계 같은 추상 구조만 학습한다. 특정 보호 작품의 맵/랜드마크/장면을 그대로 복제하지 않는다. Map DNA→macro terrain→route graph→zone→micro props→initial prewarm→chunk/LOD streaming→reachability/mobile QA 순으로 연결한다. referenceImages=${plan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.referenceImageStudies?.length||0}, verifiedObservations=${plan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.verifiedObservationCount||0}.`:'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.enabled?'의복은 layer/clipping/theme grammar, 건물은 modular/interior/navigation grammar, 환경은 Biome DNA/Prop Density, 몬스터는 body-plan/species/mutation/signature identity, 무기-모션과 스킬 표현은 cross-asset compatibility로 자동 검사한다.':'',
    plan.companyGraphicsLibrary?.studioAssetUniverse?.enabled?'24H Gap Fill은 검증 회사 자산→저장소→안전 파생→라이선스 검증 외부→PREPARED_SEMANTIC→신규 네이티브 제작 순으로 우선순위를 채운다. Semantic seed는 실제 Unity/Roblox 런타임 PASS 전 VERIFIED가 아니다.':'',
    plan.target==='roblox'&&Number(plan.summary?.discoveredSameGameRobloxAssets||0)>0?`현재 Roblox 게임 소스에서 기존 Asset ID ${plan.summary.discoveredSameGameRobloxAssets}개를 발견했다. REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET는 현재 게임 바인딩을 보존하는 후보지만 SOURCE_BOUND_UNVERIFIED 상태에서는 호환되는 VERIFIED_COMPANY_ASSET보다 우선하지 않고 회사 공용 VERIFIED로도 승격하지 않는다.`:'',
    '선택 순서: 현재 게임 품질·분위기·호환성 비교가 먼저다. 회사 소유 또는 다른 게임 검증 이력만으로 선택하지 않는다. 우리 자산과 무료 제공 조건·사용 권한이 확인된 외부 후보를 함께 비교하고, 품질 기준을 통과한 동급 후보끼리만 회사/기존 게임 → 저장소 → 외부 순으로 재사용한다. 우리 자산이 기준 미달이면 적합한 외부 후보를 우선하고, 둘 다 부족할 때만 리타겟/클린업 또는 새 제작한다. 참조용 이미지를 완성된 네이티브 자산으로 취급하지 않는다. 외부 후보는 실제 다운로드·플랫폼 변환·런타임 검증 전 회사 검증 자산이 아니다.',
    'Web에서 SVG/CSS/Canvas/절차적 JavaScript/WebAudio/Motion Engine으로 최종 품질을 만들 수 있으면 Vibe가 직접 제작한다.',
    '이모지/단순 도형/검증용 임시 그래픽/임시 모형 몹/무맥락 배경을 최종 에셋으로 사용하지 않는다.',
    'PNG/WebP 스프라이트시트, 고품질 음원, 3D 모델처럼 binary authoring이 필요한데 현재 worker가 만들 수 없으면 가짜 파일을 쓰지 말고 authoring generator 요청으로 분리한다.',
    '에셋 이유로 게임 규칙, 세이브 의미, 진행, 경제 수치를 바꾸지 않는다.',
    `preset=${clean(plan.presetId)||'none'}; reuseCandidateTypes=${plan.summary?.reuseCandidateTypes||0}; directAuthorableTypes=${plan.summary?.directAuthorableTypes||0}; missingTypes=${(plan.missingTypes||[]).join(',')||'none'}`
  ];
  for(const item of plan.assetCustomization?.items||[]){
    lines.push(`커마 제작 대상=${item.id}; family=${item.family}; base=${item.baseAssetId||'미선정'}; state=${item.status}; locked=${item.lockedParameters.join(',')||'없음'}; parameters=${JSON.stringify(item.parameters)}; operations=${JSON.stringify(item.operations)}; remaining=${item.issues.join(',')||'실제 적용·런타임 검증'}. 선언된 연결은 실제 제작 완료나 품질 PASS가 아니다.`);
  }
  for(const row of (plan.decisions||[]).slice(0,12)){
    const reuse=(row.reuseCandidates||[]).slice(0,4).map(x=>x.robloxAssetId?`${x.id}@roblox-asset-id:${x.robloxAssetId}`:x.path?`${x.id}@${x.path}`:x.id).join('|')||'none';
    const external=(row.externalCandidates||[]).slice(0,4).map(x=>x.id).join('|')||'none';
    const direct=(row.directAuthoring||[]).join('|')||'none';
    lines.push(`- type=${row.type}; reuse=${reuse}; external=${external}; direct=${direct}; order=${(row.decisionOrder||[]).join('>')}`);
    if(row.postDownloadComparison?.required){
      const cmp=row.postDownloadComparison;
      lines.push(`다운로드 후 내부자산 비교=${cmp.status}; external=${cmp.externalCandidateIds.join('|')||'none'}; internal=${cmp.internalBaselineCandidateIds.join('|')||'none'}. 외부 다운로드본은 sourceHash·라이선스·타깃 플랫폼 import를 통과한 뒤 내부 기준 자산과 같은 카메라·조명·거리·행동으로 A/B 비교한다. 컨셉은 강제 탈락 게이트가 아니라 변형 목표다. 외부 다운로드본이 현재 Style Bible/Game Visual DNA와 달라도 후보 브랜치/테스트 장면에 먼저 적용해 보고, 차이가 변형 가능한지 판단한다. 가능하면 팔레트·명도→재질/셰이더→장식→실루엣/비율→시대·기술 디테일→리그/접촉→모션 성격→UI 문법→LOD 순으로 필요한 축만 수정한 뒤 같은 조건으로 재비교한다. 변형 후 핵심 품질축 하나 이상을 개선하면서 보호 품질축을 후퇴시키지 않으면 전체 자산으로 채택할 수 있다. 전체가 안 맞아도 좋은 파츠/리그/재질/모션/디테일은 도너로 재조합할 수 있다. 동급이면 내부자산을 유지하고, 둘 다 부족하면 부분 파생 수정 후 신규 제작을 마지막에 사용한다.`);
    }
    if(row.type==='animation')lines.push(`모션 품질 비교 필수=${(row.qualitySelection?.requiredChecks||[]).join(',')}; 품질 미달 후보를 적용하지 말고 비교 결과와 선택 이유를 남긴다.`);
    if(row.motionReusePlan){
      const studio=row.motionReusePlan.studioProduction;
      if(studio)lines.push(`스튜디오 제작 단계=${studio.stages.join('>')}. 성격·의도·무게·몸 구조·무기·실루엣 기준을 정하고 주요 자세부터 검수한다. 시선→머리→중심 이동→행동→관성→정착 순서를 몸 구조에 맞게 적용한다. 호흡·귀·꼬리·날개는 존재하는 부위만 연기한다. 10초 대표 장면(관찰→이동→발견→행동→반응→회복)을 같은 게임 카메라·속도로 기준 영상과 비교하고 실패 프레임을 지정해 수정한다. 소스·클립 버전이 일치하는 영상, 모바일 성능, 실제 2인 이상 실행 증거가 없으면 검증 등록 금지. 비전투 캐릭터에 공격을 새로 추가하지 않는다.`);
      lines.push(`동작별 재사용 후보(실행 통과 아님): ${row.motionReusePlan.stateBindings.map(item=>`${item.state}=${item.candidateIds.slice(0,4).join('|')||'unresolved'}`).join('; ')}`);
      lines.push(`동작 확인 필요=${row.motionReusePlan.unresolvedStates.join(',')||'none'}; 동작 목록 미확인 후보=${row.motionReusePlan.coverageUnknownCandidateIds.slice(0,4).join('|')||'none'}. 먼저 기존 클립 목록을 확인하고 부족한 동작만 권한·라이선스·무료 제공 조건이 확인된 외부 자산으로 보충한다. 무료 여부를 라이선스만으로 추정하거나 Asset ID를 지어내지 않는다. 적합한 후보가 없을 때만 새 제작한다.`);
      lines.push(`모션 적용 검수=${row.motionReusePlan.requiredChecks.join(',')}. R6/R15/커스텀 골격과 관절을 확인하고 기존 공격 판정·쿨다운·이동 속도·저장 규칙을 모션 길이에 맞춰 바꾸지 않는다. 중단·사망·재생성 후 전환과 실제 멀티 동기화를 검사하기 전에는 검증 자산으로 승격하지 않는다.`);
    }
  }
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const repoRoot=clean(args.root)||process.cwd();
  const sync=synchronizeCompanyCommonAssetRegistry({repoRoot,persist:true});
  const task={gameId:clean(args.game),goal:clean(args.goal),target:clean(args.target)||'web'};
  const result=buildVibeAssetProductionPlan({task,target:task.target,repoRoot});
  console.log(JSON.stringify({registrySync:{changed:sync.changed,persisted:sync.persisted,persistError:sync.persistError,discoveredCatalogCount:sync.discoveredCatalogCount,seedCount:sync.seedCount},plan:result},null,2));
}
