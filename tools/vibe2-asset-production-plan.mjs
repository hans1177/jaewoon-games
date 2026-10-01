// 파일명: tools/vibe2-asset-production-plan.mjs
// 역할: Vibe 게임 구현 작업이 필요한 에셋을 직접 제작/검증 자산 재사용/별도 authoring 요청 중에서 선택할 수 있도록 기계 계획을 만든다.
// 원칙: Vibe2/Vibe3가 게임 구현 주체다. 고정 라이선스/성능/QA 규칙은 학습이나 자동화가 우회하지 못한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { planAssetApplication } from '../assets/asset-selector.js';
import {createCreatureMotionSetProfile,buildAutomaticMotionGapFillPlan,applySemanticGapPreparation,createMotionDirectorPlan,createDuelCombatAuthoringRecipe,createSurvivalPlayerMotionProfile,createSurvivalWildlifeMotionProfile,deriveMotionStyleVariant,auditMotionContinuityTrace} from '../assets/vibe-motion-director.js';
import {createStudioAssetUniversePlan,DEFAULT_COVERAGE_BASELINES,createSurvivalWildlifeAssetProfile,synchronizeAssetCustomization,createAssetDetailReviewPlan} from '../assets/vibe-studio-asset-universe.js';
import {createVibeReferenceImageStudyRequest,bindVibeReferenceImageObservation,createVibeMapDetailReconstruction} from '../assets/vibe-environment-director.js';
import {auditVibeRuntimeVisualEvidence,auditVibeRuntimeBeforeAfterComparison} from '../assets/vibe-visual-quality-gate.js';

const clean=value=>String(value??'').trim();
const freeze=value=>Object.freeze(value);
const freezeList=value=>freeze([...(value||[])]);
const unique=value=>[...new Set((value||[]).map(clean).filter(Boolean))];

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
const companyAssetLibraryRegistry=repoRoot=>readJson(path.join(repoRoot,'company-asset-library.json'),{version:0,assets:[],externalSources:[]});
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

const GENERATED_ASSET_OUTPUT_CONTRACT=freeze({
  originalOrLicenseVerifiedDerivativeOnly:true,
  deterministicSourceRecipeRequired:true,
  sourceArtifactRequired:true,
  nativeArtifactRequired:true,
  previewRenderRequired:true,
  evidenceJsonRequired:true,
  companyAssetLibraryRegistrationRequired:true,
  nativeRuntimeVerificationRequiredBeforeVerifiedPromotion:true,
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

function verifiedCompanyManifestAssets(registry={}){
  return (Array.isArray(registry?.assets)?registry.assets:[])
    .filter(asset=>asset?.verifiedCompanyReusable===true||/^VERIFIED_COMPANY_/.test(clean(asset?.status).toUpperCase()))
    .map(asset=>({
      ...asset,
      id:clean(asset.id),
      path:clean(asset.path).replace(/^\//,''),
      types:Array.isArray(asset.types)&&asset.types.length?asset.types:(COMPANY_CATEGORY_TYPES[clean(asset.category).toUpperCase()]||[]),
      tags:Array.isArray(asset.tags)?asset.tags:[clean(asset.title),clean(asset.category)].filter(Boolean),
      platforms:Array.isArray(asset.platforms)?asset.platforms:(clean(asset.platform)&&!/^SHARED|WEB_/i.test(clean(asset.platform))?[clean(asset.platform).toLowerCase()]:[]),
      downloaded:true,
      companyVerified:true,
      source:clean(asset.source)||'COMPANY_ASSET_LIBRARY'
    }))
    .filter(asset=>asset.id);
}

function mergeManifestWithCompanyLibrary(manifest={},registry={}){
  const rows=[...(Array.isArray(manifest?.assets)?manifest.assets:[])];
  const byId=new Map(rows.map(asset=>[clean(asset?.id),asset]));
  for(const asset of verifiedCompanyManifestAssets(registry))byId.set(asset.id,{...(byId.get(asset.id)||{}),...asset});
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
  const byId=new Map((Array.isArray(manifest?.assets)?manifest.assets:[]).map(asset=>[clean(asset?.id),asset]));
  return freezeList((selector.matched||[])
    .filter(row=>clean(row.type)===clean(type))
    .filter(row=>assetTargetCompatible(byId.get(clean(row.id))||row,target))
    .filter(row=>{
      const asset=byId.get(clean(row.id))||row;
      return asset.referenceOnly!==true&&!/_REFERENCE(?:_ONLY)?$/.test(clean(asset.platform).toUpperCase());
    })
    .map(row=>{
      const asset=byId.get(clean(row.id))||row;
      return freeze({
        id:clean(row.id),
        path:clean(row.path)||null,
        license:clean(row.license)||null,
        source:clean(row.source)||null,
        sourceUrl:clean(asset.sourceUrl)||null,
        downloaded:asset.downloaded!==false,
        animated:row.animated===true,
        motionMode:clean(row.motionMode)||null,
        motionStates:freezeList(unique([...(Array.isArray(asset.states)?asset.states:[]),...(Array.isArray(asset.animations)?asset.animations:[])].filter(value=>typeof value==='string').map(value=>clean(value).toLowerCase()))),
        rigType:clean(asset.rigType)||null,
        sourceTier:sourceTierFor(asset),
        companyVerified:asset.companyVerified===true,
        sameGameExistingRoblox:asset.sameGameExistingRoblox===true,
        robloxAssetId:clean(asset.robloxAssetId)||null,
        retargetable:asset.retargetable===true,
        studioMotionCandidate:asset.studioMotionCandidate===true,
        creatureFamily:clean(asset.creatureFamily)||null,
        compatibleMotionSourceIds:freezeList(asset.compatibleMotionSourceIds||[]),
        targetCompatible:true
      });
    }));
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

function decisionFor(selector={},target='',binding={},manifest={}){
  const type=clean(binding.type);
  const matched=matchedForType(selector,type,manifest,target);
  const sameGameCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='SAME_GAME_EXISTING_ROBLOX_ASSET'));
  const companyCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='VERIFIED_COMPANY_ASSET'));
  const repositoryCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET'));
  const externalCandidates=freezeList(matched.filter(asset=>asset.sourceTier==='LICENSE_VERIFIED_EXTERNAL_ASSET'));
  const reuseCandidates=freezeList([...companyCandidates,...sameGameCandidates,...repositoryCandidates]);
  const directAuthoring=directAuthoringFor(target,type);
  const decisionOrder=unique([
    'COMPARE_TARGET_GAME_QUALITY',
    companyCandidates.length?'REUSE_VERIFIED_COMPANY_ASSET':'',
    sameGameCandidates.length?'REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET':'',
    repositoryCandidates.length?'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET':'',
    externalCandidates.length?'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET':'',
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
    required:binding.required!==false,
    targetStates:freezeList(binding.targetStates||[]),
    sameGameCandidates,
    companyCandidates,
    repositoryCandidates,
    externalCandidates,
    reuseCandidates,
    directAuthoring,
    decisionOrder:freezeList(decisionOrder),
    qualitySelection:freeze({
      requiredBeforeSourcePreference:true,
      companyOwnershipIsNotQualityEvidence:true,
      compareCandidateIds:freezeList([...reuseCandidates,...externalCandidates].map(asset=>asset.id)),
      requiredChecks:freezeList(type==='animation'
        ?['GAME_STYLE_FIT','RIG_AND_JOINT_COMPATIBILITY','FOOT_SLIDING_AND_CONTACT','TRANSITION_AND_INTERRUPT','ACTUAL_CLIP_PLAYBACK','MULTIPLAYER_SYNC']
        :['GAME_STYLE_FIT','SILHOUETTE_AND_READABILITY','MATERIAL_AND_SCALE_COHERENCE','TARGET_RUNTIME_AND_MOBILE_PERFORMANCE']),
      selectionState:'TARGET_GAME_REVIEW_REQUIRED',
      selectedAssetId:null,
      sourcePreferenceOnlyAfterQualityPass:true
    }),
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
  const manifestBase=manifest||readJson(path.join(repoRoot,'assets','asset-manifest.json'),{version:0,assets:[]});
  const companyRegistry=companyAssetLibraryRegistry(repoRoot);
  const currentCustomizationDocument=(companyRegistry?.baseMaterialLibrary?.customization?.documents||[]).find(row=>row.gameId===clean(task.gameId))||null;
  const sharedCustomizationDocument=task.assetCustomization?.sharedDocument||(!task.assetCustomization?.recipes?.length?currentCustomizationDocument:null);
  if(sharedCustomizationDocument)task={...task,styleFamily:sharedCustomizationDocument.styleBible?.profileKey,styleBible:sharedCustomizationDocument.styleBible,concept:{...task.concept,styles:[{family:sharedCustomizationDocument.styleBible?.profileKey,weight:1}]},motionStyleModifiers:sharedCustomizationDocument.motionStyle?.modifiers};
  const sameGameRobloxAssets=resolvedTarget==='roblox'?discoverExistingRobloxGameAssets({repoRoot,gameId:task.gameId}):[];
  const manifestWithSameGameAssets={...manifestBase,assets:[...(Array.isArray(manifestBase?.assets)?manifestBase.assets:[]),...sameGameRobloxAssets]};
  const manifestInput=mergeManifestWithCompanyLibrary(manifestWithSameGameAssets,companyRegistry);
  const presetInput=presetCatalog||readJson(path.join(repoRoot,'assets','prototype-asset-presets.json'),{version:0,presets:[]});
  const request=clean(task.goal||task.request||task.gameId||'game asset production');
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
    return freeze({request,observation});
  }));
  const selector=planAssetApplication({
    prompt:request,
    manifest:manifestInput,
    presetCatalog:presetInput,
    rebuild:/FULL_WEB_GAME_REBUILD/i.test(request)
  });
  const decisions=freezeList((selector.binding||[]).map(binding=>decisionFor(selector,resolvedTarget,binding,manifestInput)));
  const highEnd=highEndVisualContract(repoRoot);
  const highEndActive=highEnd?.status==='ACTIVE_EXECUTABLE_CONTRACT';
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
        const cat=clean(row.category).toUpperCase();
        return /LICENSE_VERIFIED/.test(clean(row.status).toUpperCase())&&(cat===family||(family==='BUILDING'&&['ENVIRONMENT','PROP'].includes(cat))||(family==='MATERIAL'&&['VFX','ENVIRONMENT'].includes(cat)));
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
    requirements:Array.isArray(task.assetRequirements)?task.assetRequirements:[],
    usageByAsset:task.assetUsageById||{},
    futureGameDemands:Array.isArray(task.futureGameDemands)?task.futureGameDemands:[],
    usageEvents:Array.isArray(task.assetUsageEvents)?task.assetUsageEvents:[],
    baseMaterialFamilies:companyRegistry?.baseMaterialLibrary?.families||{},
    baseMaterialUsageByAtom:task.baseMaterialUsageByAtom||{},
    styleBible:task.styleBible||{},
    customizationRecipes:Array.isArray(task.assetCustomization?.recipes)?task.assetCustomization.recipes:[],
    customizationContract:companyLibrary?.composableBaseMaterialLibrary?.customization||null
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
  const mapDetailReconstruction=task.mapReconstruction?createVibeMapDetailReconstruction({
    sketch:task.mapReconstruction.sketch||{},assets:[...universeRepositoryAssets,...(companyRegistry?.assets||[])],
    styleFamily:assetSynchronization?.document?.styleBible?.profileKey||studioUniversePlan?.styleBible?.profileKey,
    seed:task.mapReconstruction.seed||clean(task.gameId)
  }):null;
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
    requestedTypes:freezeList(selector.requestedTypes||[]),
    missingTypes:freezeList(selector.missingTypes||[]),
    decisions,
    generatedAssetOutputContract:GENERATED_ASSET_OUTPUT_CONTRACT,
    baseMaterialLoadout,
    assetCustomization,
    precisionProduction,
    assetSynchronization,
    detailReview:studioUniversePlan?.customization?createAssetDetailReviewPlan({
      ...task.assetDetailReview,
      customization:assetSynchronization?.customization||studioUniversePlan.customization,
      platforms:task.assetDetailReview?.platforms||(['unity','web'].includes(resolvedTarget)?['UNITY','WEB']:[resolvedTarget.toUpperCase()])
    }):null,
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
      pixelObservationRequired:true,generatedAsset:false,runtimeVerified:false
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
      verifiedCompanyAssetCount:verifiedCompanyManifestAssets(companyRegistry).length,
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
      missingSelectorTypes:(selector.missingTypes||[]).length
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
    plan.generatedAssetOutputContract?`[GENERATED NATIVE ASSET CONTRACT] ${JSON.stringify(plan.generatedAssetOutputContract)}. Roblox/Unity에서 기존 자산이 목표 품질을 못 채우면 Blender/Python 또는 엔진 네이티브 authoring으로 실제 원본 자산을 만든다. 생성 소스 레시피와 원본/파생 파일, 동일 조건 미리보기, evidence.json, 회사 자산 장부 등록을 남긴다. GLB/이미지 파일이 생겼다는 사실만으로 VERIFIED 처리하지 말고 대상 native 런타임에서 실제 바인딩·표현·성능 검증 뒤 승격한다.`:'',
    plan.detailReview?`[STYLE COMPARISON AND LOCAL REPAIR] ${JSON.stringify(plan.detailReview)}. 같은 원형·카메라·조명·동작·표본 시점으로 카툰/실사/다크를 비교한다. repairs의 현재 소스/캡처 근거가 있는 부위·프레임·editableParameters만 수정하고 previousParameters와 잠긴 특징은 유지한다. 수정 뒤 동일 조건 재촬영으로 재검토하며 캡처 등록이나 파라미터 변경만으로 문제를 닫지 않는다.`:'',
    plan.motionContinuityAudit?`[MEASURED CONTINUOUS MOTION] ${JSON.stringify(plan.motionContinuityAudit)}. 루트·접촉점·손/무기 목표점=월드 미터, 관절=루트 로컬 미터, 지지물 접촉=동일 supportId의 로컬 미터, 회전/시선 오차=라디안, 표정=0~1 가중치다. violations의 region/frameRange/normalizedTimeRange에서 발 고정·손/무기 접촉·의상 관통·시선 추적·표정 튐을 수정한다. attachments는 active와 effectorWorldPosition/targetWorldPosition, penetrations는 depthMeters, gaze는 tracking과 forwardWorld/targetDirectionWorld, expressions는 morph별 가중치를 모든 프레임에 계측한다. 레지스트리 motionQA.requiredDetailChannels/limits를 작업 입력이 약화할 수 없다. 현재 소스 해시와 클립 전체 표본 및 선언된 채널이 없으면 UNVERIFIED다. 판정 시점·클립 길이·게임 이동 권한을 바꾸지 말고 재측정한다. unmeasuredGroups는 미검수이며 수치 PASS는 전체 시각 품질이나 런타임 승격 PASS가 아니다.`:'',
    plan.runtimeVisualRepair?`[RUNTIME VISUAL REPAIR LOOP] ${JSON.stringify(plan.runtimeVisualRepair)}. defects만 실제 책임 파일에서 수정한다. INTERFACE는 요구된 HUD/MENU/MINIMAP/INTERACTION 표면만, SCENE_OBJECT는 선언된 필수 오브젝트 바인딩만 보완한다. ENVIRONMENT/COHESION/PRESENTATION은 같은 카메라·조명·상태를 유지한 before/after 캡처로 다시 확인한다. 게임 규칙·저장·멀티 권한·판정 타이밍은 수정하지 않는다. 같은 결함은 실제 런타임 재관찰 전에는 닫지 않는다.`:'',
    plan.precisionProduction?`[PRECISION PRODUCTION CHAIN] ${JSON.stringify(plan.precisionProduction)}. 검사 결과를 보고서로 끝내지 않는다. 현재 소스와 실제 화면에서 결함을 찾고 정확한 수정 범위를 만든 뒤, 같은 작업에서 editable source와 native derivative를 실제 제작하고 기존 게임 책임 위치에 적용한다. 디테일은 GAME_CAMERA→MID_RANGE→CLOSEUP→CONTACT 순으로 제작하며 실루엣/구조/재질/접촉을 각각 해결한다. 소품 수나 랜덤 노이즈로 디테일을 대신하지 말고 기능·접촉·날씨·손상 원인을 가진 디테일만 만든다. 제작 성공 후 바로 적용 단계로 넘어가며 검사나 수정 계획만 제출하고 멈추지 않는다. 제작 도구가 없을 때만 정확한 AUTHORING 단계와 필요한 원본을 남기고 완료를 주장하지 않는다.`:'',
    ...(plan.sourceGlbReconstruction||[]).map(source=>`[BASIC GLB TO DETAILED ASSET] ${JSON.stringify(source)}. 기본 GLB의 실제 원형·부품·재질·리그·애니메이션을 재사용하고 약한 형태를 재조형한다. 해부학/구조 접합/의복 겹침/눈꺼풀·입술·손발/문·창·지붕/목재·금속·돌·천의 마감과 사용 흔적을 자산 종류에 맞게 풍부하게 만든다. 단순 subdivide나 노이즈·색 변경으로 완성 처리하지 않는다. 원본은 보존하고 실제 DCC에서 파생본을 만든 뒤 morph/socket/리타겟 연결과 Unity/Web GLB·네이티브 변형을 등록한다. 메시·리깅·텍스처 제작 도구가 없으면 AUTHORING_REQUIRED를 유지한다.`),
    plan.mapDetailReconstruction?`[BASIC MAP TO DETAILED WORLD] ${JSON.stringify(plan.mapDetailReconstruction)}. 내비게이션 수준의 기본 지도에서 길·교차로·구역·랜드마크를 읽고 연결 관계를 먼저 보존한다. 지형/배수→대지/건물/골목→식생→기능성 소품→접합/표면/생활 흔적→주변 동작 순서로 재구성한다. 소품을 균일하게 뿌리거나 안개로 가리지 말고 상업/주거/산업/숲 같은 구역 기능과 사용 원인에 따라 디테일을 배치한다. 도로 폭·문 접근·상호작용 영역·필수 시야·모바일 이동을 지키고 원본 동선 겹침과 실제 경로 보행으로 검수한다.`:'',
    plan.imageAssetCreation?.enabled?`[IMAGE-TO-ASSET CREATION] ${JSON.stringify(plan.imageAssetCreation)}. 이미지 한 장만 있어도 먼저 실제 픽셀을 관찰한다. 보이는 실루엣·비율·재질 경계·색·시그니처·미세 마감을 추출하고, 뒷면·가려진 접합부·관절·동작은 창작 설계로 구분한다. 정면 복사판이나 이미지 평면으로 최종 모델을 대신하지 않는다. 공통 GLB 원형/부품 재사용→디테일 조형→의상 맞춤→리깅/표정/동작→Unity/Web 파생으로 이어간다. UI/아이콘/배경에도 적용하고 원본과 같은 카메라·중립 조명·실게임 화면에서 비교한다. 픽셀 접근이나 실제 제작 도구가 없으면 필요한 제작 단계로 남기며 완성 처리하지 않는다.`:'',
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
  const task={gameId:clean(args.game),goal:clean(args.goal),target:clean(args.target)||'web'};
  const result=buildVibeAssetProductionPlan({task,target:task.target,repoRoot:clean(args.root)||process.cwd()});
  console.log(JSON.stringify(result,null,2));
}
