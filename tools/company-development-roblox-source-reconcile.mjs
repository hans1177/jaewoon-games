// Reconcile Roblox DEVELOPMENT source that already exists on an exact main revision.
// This validates source only. It never claims Roblox runtime, independent QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildRobloxStudioAssetBootstrapPlan,validateRobloxBootstrap,robloxBuildProfileFromBaseline,ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION} from './company-development-roblox-bootstrap.mjs';
import {platformDevelopmentEligible} from './company-selected-platform-router.mjs';
import {createRobloxVibe3LearningContext,existingRobloxGameLearningProfile,verifiedExternalBlackBoxPlaybookContract,ROBLOX_SEMANTIC_MAPPING_VERSION} from './vibe3-roblox-learning-context.mjs';

const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const sha40=value=>/^[0-9a-f]{40}$/i.test(clean(value));

function studioAssetRefreshState({root='',assetLibrary={},gameId='',profile=null}={}){
  const libraryFamilies=assetLibrary?.baseMaterialLibrary?.families||{};
  const libraryRequired=Number(assetLibrary?.version||0)>0||Object.keys(libraryFamilies).length>0;
  if(!libraryRequired)return {required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0),allFamiliesBound:false,primitiveOnly:false};
  const id=clean(gameId)||path.basename(path.resolve(root));
  const expected=buildRobloxStudioAssetBootstrapPlan({gameId:id,profile:profile||{genre:''},assetLibrary});
  const requiredFamilies=Array.isArray(expected?.universalAssetFirst?.allFamilies)?expected.universalAssetFirst.allFamilies:[];
  const missingLibraryFamilies=requiredFamilies.filter(family=>!(expected?.families?.[family]||[]).length);
  if(expected.applied!==true||missingLibraryFamilies.length)return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),expectedSelectionFingerprint:clean(expected.selectionFingerprint),allFamiliesBound:false,primitiveOnly:false,missingLibraryFamilies,reason:'INTERNAL_ASSET_LIBRARY_ALL_FAMILIES_NOT_READY'};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  const serverFile=path.join(root,'server','Game.server.luau');
  if(!fs.existsSync(configFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CONFIG_MISSING'};
  if(!fs.existsSync(clientFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CLIENT_MISSING'};
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const server=fs.existsSync(serverFile)?fs.readFileSync(serverFile,'utf8'):'';
  const libraryVersion=Number(config.match(/LibraryVersion\s*=\s*(\d+)/)?.[1]||0);
  const bindingVersion=Number(config.match(/BindingVersion\s*=\s*(\d+)/)?.[1]||0);
  const selectionFingerprint=clean(config.match(/SelectionFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const clientBindingVersion=Number(client.match(/STUDIO_ASSET_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  const expectedBindingVersion=Number(expected.bindingVersion||0);
  const expectedSelectionFingerprint=clean(expected.selectionFingerprint);
  const applied=/StudioAssets\s*=\s*\{[\s\S]*?Applied\s*=\s*true/.test(config);
  const canonicalSource=/Source\s*=\s*["']company-asset-library\.json#baseMaterialLibrary["']/.test(config);
  const familyCoverage=Object.fromEntries(requiredFamilies.map(family=>{
    const atoms=(expected?.families?.[family]||[]).map(clean).filter(Boolean);
    const match=config.match(new RegExp('\\b'+family+'\\s*=\\s*\\{([^}]*)\\}','m'));
    const body=match?.[1]||'';
    const atomsBound=atoms.length>0&&atoms.every(atom=>body.includes('"'+atom+'"')||body.includes("'"+atom+"'"));
    return [family,{atomCount:atoms.length,bound:Boolean(body)&&atomsBound}];
  }));
  const allFamiliesBound=requiredFamilies.length>0&&requiredFamilies.every(family=>familyCoverage[family]?.bound===true);
  const clientConfigBound=/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(client);
  const clientResolverBound=/(?:hasStudioAssetAtom|hasStudioAtom|studioAssetFamily)\s*\(/.test(client);
  const clientRuntimeTrace=/StudioAssetSelectionFingerprint/.test(client)&&/StudioAssetAtoms/.test(client);
  const nativeText=server+'\n'+client;
  const nativeSignals=[/(?:MeshPart|SpecialMesh|SurfaceAppearance|MeshId|TextureID|Enum\.Material)/,/(?:ParticleEmitter|Trail|Beam|PointLight|SpotLight|SurfaceLight)/,/(?:Sound|SoundService)/,/(?:Animator|AnimationTrack|Motor6D|TweenService)/,/(?:UIStroke|UIGradient|UICorner|ImageLabel|ImageButton|ViewportFrame)/];
  const nativeFamilyCount=nativeSignals.filter(pattern=>pattern.test(nativeText)).length;
  const rawPrimitiveCount=(nativeText.match(/Instance\.new\s*\(\s*["']Part["']\s*\)/g)||[]).length;
  const primitiveOnly=rawPrimitiveCount>0&&nativeFamilyCount<2;
  const refreshRequired=!applied
    ||!canonicalSource
    ||bindingVersion!==expectedBindingVersion
    ||libraryVersion!==Number(expected.libraryVersion||0)
    ||selectionFingerprint!==expectedSelectionFingerprint
    ||clientBindingVersion!==expectedBindingVersion
    ||!clientConfigBound
    ||!clientResolverBound
    ||!clientRuntimeTrace
    ||!allFamiliesBound
    ||primitiveOnly;
  const reason=!refreshRequired?null
    :primitiveOnly?'PRIMITIVE_ONLY_PRESENTATION'
    :!allFamiliesBound?'ALL_INTERNAL_ASSET_FAMILIES_NOT_BOUND'
    :selectionFingerprint!==expectedSelectionFingerprint?'STALE_INTERNAL_ASSET_SELECTION_FINGERPRINT'
    :'STALE_OR_MISSING_INTERNAL_ASSET_BINDING';
  return {required:true,refreshRequired,libraryVersion:Number(expected.libraryVersion||0),currentLibraryVersion:libraryVersion,bindingVersion,clientBindingVersion,expectedBindingVersion,selectionFingerprint,expectedSelectionFingerprint,applied,canonicalSource,clientConfigBound,clientResolverBound,clientRuntimeTrace,allFamiliesBound,familyCoverage,primitiveOnly,rawPrimitiveCount,nativeFamilyCount,reason};
}

function verifiedExternalLearningRefreshState({root='',playbooks={},gameId='',profile=null}={}){
  const expectedContract=verifiedExternalBlackBoxPlaybookContract(playbooks);
  const expectedLearning=createRobloxVibe3LearningContext({gameId,profile:profile||existingRobloxGameLearningProfile(gameId),playbooks});
  if(!expectedContract.ids.length)return {required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile)||!fs.existsSync(clientFile)){
    return {required:true,refreshRequired:true,expectedIds:[...expectedContract.ids],fingerprint:expectedContract.fingerprint,semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,semanticMappingFingerprint:expectedLearning.semanticMappingFingerprint,reason:'CONFIG_OR_CLIENT_MISSING'};
  }
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const managed=config.match(/-- VERIFIED_EXTERNAL_LEARNING_BINDING_BEGIN\n([\s\S]*?)-- VERIFIED_EXTERNAL_LEARNING_BINDING_END/);
  const full=config.match(/LearningContext\s*=\s*\{([\s\S]*?)\n\s*\},\n\s*InitialState\s*=/);
  const block=managed?.[1]||full?.[1]||'';
  const ids=[...new Set([...block.matchAll(/["'](external-black-box-[^"']+)["']/g)].map(match=>match[1]))].sort();
  const expectedIds=[...expectedContract.ids].sort();
  const coverage=Number(block.match(/CoveragePct\s*=\s*(\d+)/)?.[1]||0);
  const retrieved=Number(block.match(/RetrievedCount\s*=\s*(\d+)/)?.[1]||0);
  const applied=Number(block.match(/AppliedCount\s*=\s*(\d+)/)?.[1]||0);
  const nativeBindingVersion=Number(block.match(/NativeBindingVersion\s*=\s*(\d+)/)?.[1]||0);
  const clientNativeBindingVersion=Number(client.match(/VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  const semanticMappingVersion=Number(block.match(/SemanticMappingVersion\s*=\s*(\d+)/)?.[1]||0);
  const semanticMappingFingerprint=clean(block.match(/SemanticMappingFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const semanticVariant=clean(block.match(/SemanticVariant\s*=\s*["']([^"']+)["']/)?.[1]);
  const mappingCount=Number(block.match(/AppliedGameDevelopmentPrincipleCount\s*=\s*(\d+)/)?.[1]||0);
  const gameSpecificMappingsPresent=/GameSpecificSemanticMappings\s*=\s*\{/.test(block);
  const learningDispositionsPresent=/LearningDispositions\s*=\s*\{/.test(block);
  const truncation=/TruncationForbidden\s*=\s*true/.test(block);
  const fingerprint=clean(block.match(/MemoryFingerprint\s*=\s*["']([^"']+)["']/)?.[1]);
  const exactIds=ids.length===expectedIds.length&&expectedIds.every(id=>ids.includes(id));
  const fullNativeClient=
    /VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN/.test(client)
    &&/VerifiedExternalLearningSemanticMappingVersion/.test(client)
    &&/VerifiedExternalLearningSemanticMappingFingerprint/.test(client)
    &&/VerifiedLearningSemanticVariant/.test(client)
    &&/VerifiedLearningSemanticMappingFingerprint/.test(client)
    &&/VerifiedLearningTouchTarget/.test(client)
    &&/VerifiedExternalLearningGameplayState/.test(client);
  const refreshRequired=
    !block
    ||coverage!==100
    ||retrieved!==expectedIds.length
    ||applied!==expectedIds.length
    ||!truncation
    ||!exactIds
    ||fingerprint!==clean(expectedContract.fingerprint)
    ||nativeBindingVersion!==ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
    ||clientNativeBindingVersion!==ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
    ||semanticMappingVersion!==ROBLOX_SEMANTIC_MAPPING_VERSION
    ||semanticMappingFingerprint!==clean(expectedLearning.semanticMappingFingerprint)
    ||!semanticVariant
    ||mappingCount<=0
    ||!gameSpecificMappingsPresent
    ||!learningDispositionsPresent
    ||!fullNativeClient;
  return {
    required:true,
    refreshRequired,
    expectedIds,
    currentIds:ids,
    fingerprint:expectedContract.fingerprint,
    currentFingerprint:fingerprint,
    semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,
    currentSemanticMappingVersion:semanticMappingVersion,
    semanticMappingFingerprint:expectedLearning.semanticMappingFingerprint,
    currentSemanticMappingFingerprint:semanticMappingFingerprint,
    semanticVariant,
    mappingCount,
    gameSpecificMappingsPresent,
    learningDispositionsPresent,
    coverage,
    retrieved,
    applied,
    expectedNativeBindingVersion:ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION,
    nativeBindingVersion,
    clientNativeBindingVersion,
    fullNativeClient,
    reason:refreshRequired?'STALE_OR_MISSING_VERIFIED_EXTERNAL_LEARNING':'NOT_REQUIRED'
  };
}

export function hasVerifiedVibe2SourceHandoff(item={}){
  const handoff=item.robloxVibe2VerifiedHandoff;
  return Boolean(
    handoff?.verified===true
    &&clean(handoff.gameId)===clean(item.gameId)
    &&sha40(handoff.sourceRevision)
    &&sha40(handoff.candidateSha)
    &&sha40(handoff.sourceTreeSha)
    &&Number.isInteger(Number(handoff.qaRunId))
    &&Number(handoff.qaRunId)>0
  );
}

export function eligibleForRobloxSourceReconciliation(item={}){
  if(!clean(item.gameId))return false;
  const step=clean(item.currentStep).toUpperCase();
  if(step==='TARGET_PLATFORM_SOURCE_BIND')return platformDevelopmentEligible(item,'ROBLOX');
  if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')return false;
  if(!['ACTIVE','PENDING'].includes(clean(item.status).toUpperCase()))return false;
  if(clean(item.canonicalState).toUpperCase()==='DEVELOPMENT_BLOCKED')return false;
  if(!sha40(item.robloxSourceCommit))return false;
  const explicitTargets=(Array.isArray(item.concurrentTargetPlatforms)?item.concurrentTargetPlatforms:[]).map(x=>clean(x).toUpperCase());
  if(explicitTargets.length&&!explicitTargets.includes('ROBLOX'))return false;
  return true;
}

export function validateExistingRobloxSourceTree({root='',baseline={},assetLibrary={},gameId=''}={}){
  const blockers=[];
  const required={
    project:path.join(root,'default.project.json'),
    config:path.join(root,'shared','GameConfig.luau'),
    server:path.join(root,'server','Game.server.luau'),
    client:path.join(root,'client','Game.client.luau'),
  };
  for(const [kind,file] of Object.entries(required)){
    if(!fs.existsSync(file))blockers.push(`SOURCE_${kind.toUpperCase()}_MISSING`);
  }
  if(blockers.length)return {pass:false,blockers,saveRequired:false};

  let project={};
  try{project=readJson(required.project);}catch{blockers.push('SOURCE_PROJECT_JSON_INVALID');}
  if(project?.tree?.ReplicatedStorage?.Shared?.$path!=='shared')blockers.push('SOURCE_PROJECT_SHARED_MAPPING_REQUIRED');
  if(project?.tree?.ServerScriptService?.GameServer?.$path!=='server')blockers.push('SOURCE_PROJECT_SERVER_MAPPING_REQUIRED');
  if(project?.tree?.StarterPlayer?.StarterPlayerScripts?.GameClient?.$path!=='client')blockers.push('SOURCE_PROJECT_CLIENT_MAPPING_REQUIRED');

  const resolvedGameId=clean(gameId)||path.basename(path.resolve(root));
  const buildProfile=robloxBuildProfileFromBaseline(baseline);
  const hasAssetLibrary=Number(assetLibrary?.version||0)>0||Object.keys(assetLibrary?.baseMaterialLibrary?.families||{}).length>0;
  const studioAssets=hasAssetLibrary?buildRobloxStudioAssetBootstrapPlan({gameId:resolvedGameId,profile:buildProfile,assetLibrary}):{};
  const internalAssetBinding=studioAssetRefreshState({root,assetLibrary,gameId:resolvedGameId,profile:buildProfile});
  const verdict=validateRobloxBootstrap({
    sharedConfig:fs.readFileSync(required.config,'utf8'),
    serverCode:fs.readFileSync(required.server,'utf8'),
    clientCode:fs.readFileSync(required.client,'utf8'),
    baseline,
    profile:buildProfile,
    studioAssets,
  });
  blockers.push(...verdict.blockers);
  if(internalAssetBinding.required===true&&internalAssetBinding.refreshRequired===true)blockers.push('ROBLOX_INTERNAL_ASSET_BINDING_REFRESH_REQUIRED:'+internalAssetBinding.reason);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],saveRequired:verdict.saveRequired,internalAssetBinding};
}

function currentSourceTreeSha({repoRoot='.',sourcePath=''}){
  try{
    return clean(execFileSync('git',['rev-parse',`HEAD:${sourcePath}`],{cwd:repoRoot,encoding:'utf8'}));
  }catch{
    return '';
  }
}

export function evaluateExistingRobloxSources({queue={},repoRoot='.',sourceRevision='',loadBaseline,assetLibrary={},playbooks={}}={}){
  if(typeof loadBaseline!=='function')throw new Error('loadBaseline callback required');
  const results=[];
  for(const item of queue.items||[]){
    if(!eligibleForRobloxSourceReconciliation(item))continue;
    const sourcePath=`roblox-games/${item.gameId}`;
    const root=path.join(repoRoot,sourcePath);
    const sourceBind=clean(item.currentStep).toUpperCase()==='TARGET_PLATFORM_SOURCE_BIND';
    const currentRevision=clean(sourceRevision);
    const sourceTreeSha=fs.existsSync(root)?currentSourceTreeSha({repoRoot,sourcePath}):'';
    let baseline=null;
    let baselineLoadError=null;
    try{baseline=loadBaseline(item);}catch(error){baselineLoadError=error;}
    const learningProfile=baseline?robloxBuildProfileFromBaseline(baseline):null;
    const studioState=fs.existsSync(root)?studioAssetRefreshState({root,assetLibrary,gameId:item.gameId,profile:learningProfile}):{required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0)};
    const learningState=fs.existsSync(root)?verifiedExternalLearningRefreshState({root,playbooks,gameId:item.gameId,profile:learningProfile}):{required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
    if(learningState.refreshRequired===true){
      results.push({gameId:item.gameId,pass:false,sourcePath,sourceRevision:currentRevision,sourceTreeSha,sourceDrift:!sourceBind,saveRequired:false,blockers:['ROBLOX_VERIFIED_EXTERNAL_LEARNING_REFRESH_REQUIRED'],failure:'existing-source-verified-external-learning-required',verifiedExternalLearningRefreshRequired:true,verifiedExternalLearningExpectedIds:learningState.expectedIds,verifiedExternalLearningCurrentIds:learningState.currentIds||[],verifiedExternalLearningFingerprint:learningState.fingerprint,verifiedExternalLearningCurrentFingerprint:learningState.currentFingerprint||null});
      continue;
    }
    if(studioState.refreshRequired===true){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:currentRevision,
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['ROBLOX_STUDIO_ASSET_BINDING_REFRESH_REQUIRED'],
        failure:'existing-source-studio-asset-binding-required',
        studioAssetBindingRequired:true,
        studioAssetBindingRefreshRequired:true,
        studioAssetLibraryVersion:studioState.libraryVersion,
      });
      continue;
    }
    const boundRevision=clean(item.robloxSourceCommit);
    if(sha40(boundRevision)&&sha40(currentRevision)){
      if(boundRevision===currentRevision){
        if(!sourceBind)continue;
      }else{
        try{
          execFileSync('git',['diff','--quiet',boundRevision,currentRevision,'--',`${sourcePath}/default.project.json`,`${sourcePath}/shared`,`${sourcePath}/server`,`${sourcePath}/client`],{cwd:repoRoot,stdio:'ignore'});
          if(!sourceBind)continue;
          const exactBuildReusable=item.robloxBuildOrPackagePassed===true
            &&item.robloxBuildSourceRevision===boundRevision
            &&/^sha256:[0-9a-f]{64}$/i.test(clean(item.robloxBuildArtifactIdentity));
          if(exactBuildReusable){
            results.push({
              gameId:item.gameId,
              pass:true,
              sourcePath,
              sourceRevision:boundRevision,
              sourceTreeSha,
              sourceDrift:false,
              preserveDownstreamEvidence:true,
              sourceBindDebtResolved:true,
              saveRequired:false,
              blockers:[],
              failure:null,
              authority:'unchanged-game-source-revalidation',
            });
            continue;
          }
        }catch(error){
          if(Number(error?.status)!==1){
            results.push({
              gameId:item.gameId,
              pass:false,
              sourcePath,
              sourceRevision:currentRevision,
              sourceTreeSha,
              sourceDrift:true,
              saveRequired:false,
              blockers:['SOURCE_DRIFT_DETECTION_UNAVAILABLE'],
              failure:'source-drift-detection-unavailable',
            });
            continue;
          }
        }
      }
    }
    if(!fs.existsSync(root)){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:currentRevision,
        sourceTreeSha:'',
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['SOURCE_TREE_MISSING'],
        failure:'existing-source-tree-missing',
      });
      continue;
    }
    const handoffVerified=hasVerifiedVibe2SourceHandoff(item);
    if(handoffVerified){
      const expectedTree=clean(item.robloxVibe2VerifiedHandoff.sourceTreeSha);
      const actualTree=currentSourceTreeSha({repoRoot,sourcePath});
      if(!actualTree||actualTree!==expectedTree){
        results.push({
          gameId:item.gameId,
          pass:false,
          sourcePath,
          sourceRevision:clean(sourceRevision),
          sourceTreeSha:actualTree,
          sourceDrift:!sourceBind,
          saveRequired:false,
          blockers:['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH'],
          failure:'verified-vibe2-source-handoff-mismatch',
        });
        continue;
      }
      results.push({
        gameId:item.gameId,
        pass:true,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha:actualTree,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:[],
        failure:null,
        authority:'verified-vibe2-source-handoff',
      });
      continue;
    }
    try{
      if(baselineLoadError)throw baselineLoadError;
      if(!baseline)throw new Error(`design baseline unavailable: ${item.gameId}`);
      const verdict=validateExistingRobloxSourceTree({root,baseline,assetLibrary});
      results.push({
        gameId:item.gameId,
        pass:verdict.pass,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:verdict.saveRequired,
        blockers:verdict.blockers,
        failure:verdict.pass?null:'existing-source-static-revalidation-failed',
      });
    }catch(error){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        sourceTreeSha,
        sourceDrift:!sourceBind,
        saveRequired:false,
        blockers:['SOURCE_BASELINE_OR_VALIDATION_UNAVAILABLE'],
        failure:'existing-source-static-revalidation-unavailable',
        detail:String(error?.message||error),
      });
    }
  }
  return results;
}

function runCli(){
  const queueFile=arg('queue');
  const runtimeRef=arg('runtime-ref');
  const repoRoot=arg('repo-root','.');
  const sourceRevision=arg('source-revision');
  const resultsFile=arg('results','/tmp/roblox-source-reconciliation.json');
  const playbooksFile=arg('playbooks');
  if(!queueFile||!runtimeRef||!sourceRevision)throw new Error('required: --queue, --runtime-ref, --source-revision');
  const queue=readJson(queueFile);
  const assetLibrary=readJson(path.join(repoRoot,'company-asset-library.json'));
  const playbooks=playbooksFile&&fs.existsSync(playbooksFile)?readJson(playbooksFile):{};
  const results=evaluateExistingRobloxSources({
    queue,
    repoRoot,
    sourceRevision,
    assetLibrary,
    playbooks,
    loadBaseline:item=>{
      const baselinePath=clean(item.designBaselineSource);
      if(!baselinePath)throw new Error(`designBaselineSource missing: ${item.gameId}`);
      const text=execFileSync('git',['show',`${runtimeRef}:${baselinePath}`],{encoding:'utf8',maxBuffer:8*1024*1024});
      return JSON.parse(text.replace(/^\uFEFF/,''));
    },
  });
  fs.writeFileSync(resultsFile,JSON.stringify(results,null,2)+'\n');
  const passCount=results.filter(x=>x.pass===true).length;
  const failCount=results.length-passCount;
  console.log(`ROBLOX_SOURCE_RECONCILIATION_COUNT=${results.length}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_PASS=${passCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_FAIL=${failCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_REVISION=${sourceRevision}`);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`count=${results.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`results_json=${JSON.stringify(results)}\n`);
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
