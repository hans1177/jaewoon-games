// Reconcile Roblox DEVELOPMENT source that already exists on an exact main revision.
// This validates source only. It never claims Roblox runtime, independent QA, regression, or release success.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildRobloxStudioAssetBootstrapPlan,validateRobloxBootstrap,robloxBuildProfileFromBaseline,robloxStudioAssetDetectionSourceFromRoot,robloxStudioAssetFamilyStatusFromSource,ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION,ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES} from './company-development-roblox-bootstrap.mjs';
import {platformDevelopmentEligible} from './company-selected-platform-router.mjs';
import {robloxLearningProfileFromSource} from './company-development-roblox-gameplay-product-readiness.mjs';
import {createRobloxVibe3LearningContext,existingRobloxGameLearningProfile,verifiedExternalBlackBoxPlaybookContract,ROBLOX_SEMANTIC_MAPPING_VERSION} from './vibe3-roblox-learning-context.mjs';

const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const sha40=value=>/^[0-9a-f]{40}$/i.test(clean(value));

export function robloxPackageAssetRepairContext({assetLibrary={},baseline={}}={}){
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  const validators=['company-development-roblox-source-reconcile.mjs','company-development-roblox-package.mjs','company-development-roblox-bootstrap.mjs','vibe3-roblox-learning-context.mjs','vibe3-transformative-recombination.mjs','company-approved-scope-contract.mjs'];
  return {
    libraryFingerprint:hash(JSON.stringify(assetLibrary)),
    baselineFingerprint:hash(JSON.stringify(baseline)),
    validatorFingerprint:hash(validators.map(file=>file+':'+hash(fs.readFileSync(new URL(file,import.meta.url)))).join('\n')),
  };
}

export function hasCurrentRobloxPackageAssetRepair({item={},assetLibrary={},baseline={},sourceTreeSha=''}={}){
  const evidence=item.robloxQualityBuildUpEvidence;
  const revision=clean(item.robloxSourceCommit);
  const failure=evidence?.authority==='roblox-source-static-contract-failure'?evidence.staticContract:evidence?.assetThreshold;
  if(item.robloxQualityBuildUpRequired!==true||!sha40(revision)
    ||clean(item.robloxQualityBuildUpSourceRevision)!==revision
    ||!['roblox-package-asset-binding-failure','roblox-source-static-contract-failure'].includes(evidence?.authority)
    ||clean(evidence.gameId)!==clean(item.gameId)||clean(evidence.sourceRevision)!==revision
    ||clean(evidence.artifactIdentity)||failure?.pass!==false
    ||!Array.isArray(failure?.blockers)||!failure.blockers.some(clean)
    ||!sha40(evidence.sourceTreeSha)
    ||(sourceTreeSha&&clean(evidence.sourceTreeSha)!==clean(sourceTreeSha)))return false;
  const current=robloxPackageAssetRepairContext({assetLibrary,baseline});
  return Object.entries(current).every(([key,value])=>evidence.assetRepairContext?.[key]===value);
}

function studioAssetRefreshState({root='',assetLibrary={}}={}){
  const expected=buildRobloxStudioAssetBootstrapPlan({gameId:'library-refresh-probe',profile:{genre:''},assetLibrary});
  if(expected.applied!==true)return {required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0)};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CONFIG_MISSING'};
  if(!fs.existsSync(clientFile))return {required:true,refreshRequired:true,libraryVersion:Number(expected.libraryVersion||0),reason:'CLIENT_MISSING'};
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const libraryVersion=Number(config.match(/\bLibraryVersion\s*=\s*(\d+)/)?.[1]||0);
  const sourceUsageFingerprint=clean(config.match(/SourceUsageFingerprint\s*=\s*["']([0-9a-f]{64})["']/i)?.[1]);
  const sourceUsageLibraryVersion=Number(config.match(/SourceUsageLibraryVersion\s*=\s*(\d+)/)?.[1]||0);
  const bindingVersion=Number(config.match(/\bBindingVersion\s*=\s*(\d+)/)?.[1]||0);
  const clientBindingVersion=Number(client.match(/STUDIO_ASSET_BINDING_VERSION\s*=\s*(\d+)/)?.[1]||0);
  const expectedBindingVersion=Number(expected.bindingVersion||0);
  const expectedSourceUsageFingerprint=clean(expected.buildUpAssetSourceUsageFingerprint);
  const expectedSourceUsageLibraryVersion=Number(expected.buildUpAssetSourceUsageLibraryVersion||expected.libraryVersion||0);
  const applied=/StudioAssets\s*=\s*\{[\s\S]*?Applied\s*=\s*true/.test(config);
  const clientConfigBound=/[A-Za-z_][A-Za-z0-9_]*\.StudioAssets/.test(client);
  const clientVisibleBound=/StudioAssetFramePanel/.test(client)
    ||(/StudioAssetBindingVersion/.test(client)&&/StudioAssetAtoms/.test(client)&&/FRAME_PANEL/.test(client)&&/(hasStudioAssetAtom|hasStudioAtom)/.test(client));
  const selectionBlock=client.match(/\bSTUDIO_ASSET_SELECTION\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
  const statusBlock=client.match(/\bSTUDIO_ASSET_FAMILY_STATUS\s*=\s*\{([\s\S]*?)\n\}/)?.[1]||'';
  const familySelectionTraceComplete=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.every(family=>new RegExp('\\b'+family+'\\s*=').test(selectionBlock));
  const familyStatusTraceComplete=ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.every(family=>new RegExp('\\b'+family+'\\s*=\\s*["\\\'](?:APPLIED|NOT_APPLICABLE)["\\\']','i').test(statusBlock));
  const currentFamilyStatus=Object.fromEntries(ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.map(family=>[
    family,
    clean(statusBlock.match(new RegExp('\\b'+family+'\\s*=\\s*["\\\'](APPLIED|NOT_APPLICABLE)["\\\']','i'))?.[1]).toUpperCase()
  ]));
  const expectedFamilyStatus=robloxStudioAssetFamilyStatusFromSource({sourceText:robloxStudioAssetDetectionSourceFromRoot(root)});
  const familyStatusMismatches=familyStatusTraceComplete
    ?ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES.filter(family=>currentFamilyStatus[family]!==expectedFamilyStatus[family])
    :[];
  const refreshRequired=!applied
    ||bindingVersion!==expectedBindingVersion
    ||libraryVersion!==Number(expected.libraryVersion||0)
    ||sourceUsageFingerprint!==expectedSourceUsageFingerprint
    ||sourceUsageLibraryVersion!==expectedSourceUsageLibraryVersion
    ||clientBindingVersion!==expectedBindingVersion
    ||!clientConfigBound
    ||!clientVisibleBound
    ||!familySelectionTraceComplete
    ||!familyStatusTraceComplete
    ||familyStatusMismatches.length>0;
  const sourceUsageMismatch=sourceUsageFingerprint!==expectedSourceUsageFingerprint||sourceUsageLibraryVersion!==expectedSourceUsageLibraryVersion;
  const reason=familyStatusMismatches.length
    ?'FAMILY_STATUS_SOURCE_MISMATCH'
    :sourceUsageMismatch?'SOURCE_USAGE_LINEAGE_MISMATCH'
    :(refreshRequired?'STALE_OR_MISSING_STUDIO_ASSET_BINDING':null);
  return {
    required:true,refreshRequired,libraryVersion:Number(expected.libraryVersion||0),currentLibraryVersion:libraryVersion,
    sourceUsageFingerprint,expectedSourceUsageFingerprint,sourceUsageLibraryVersion,expectedSourceUsageLibraryVersion,
    bindingVersion,clientBindingVersion,expectedBindingVersion,applied,clientConfigBound,clientVisibleBound,
    familySelectionTraceComplete,familyStatusTraceComplete,currentFamilyStatus,expectedFamilyStatus,
    familyStatusMismatches,reason
  };
}

function verifiedExternalLearningRefreshState({root='',playbooks={},gameId='',profile=null}={}){
  const expectedContract=verifiedExternalBlackBoxPlaybookContract(playbooks);
  const expectedProfile=profile||existingRobloxGameLearningProfile(gameId);
  const expectedLearning=createRobloxVibe3LearningContext({gameId,profile:expectedProfile,playbooks});
  if(!expectedContract.ids.length)return {required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
  const configFile=path.join(root,'shared','GameConfig.luau');
  const clientFile=path.join(root,'client','Game.client.luau');
  if(!fs.existsSync(configFile)||!fs.existsSync(clientFile)){
    return {required:true,refreshRequired:true,expectedIds:[...expectedContract.ids],fingerprint:expectedContract.fingerprint,semanticMappingVersion:ROBLOX_SEMANTIC_MAPPING_VERSION,semanticMappingFingerprint:expectedLearning.semanticMappingFingerprint,reason:'CONFIG_OR_CLIENT_MISSING'};
  }
  const config=fs.readFileSync(configFile,'utf8');
  const client=fs.readFileSync(clientFile,'utf8');
  const sourceProfile=robloxLearningProfileFromSource({
    gameId,
    config,
    fallback:existingRobloxGameLearningProfile(gameId)
  });
  const expectedGenre=clean(expectedProfile?.genre);
  const expectedPlayMode=clean(expectedProfile?.playMode).toUpperCase();
  const expectedSubgenre=clean(expectedProfile?.subgenre);
  const sourceGenre=clean(sourceProfile?.genre);
  const sourcePlayMode=clean(sourceProfile?.playMode).toUpperCase();
  const sourceSubgenre=clean(sourceProfile?.subgenre);
  const sourceSubgenreRefinementAllowed=
    expectedGenre===sourceGenre
    &&expectedPlayMode===sourcePlayMode
    &&!expectedSubgenre
    &&Boolean(sourceSubgenre);
  const sourceLearning=sourceSubgenreRefinementAllowed
    ?createRobloxVibe3LearningContext({gameId,profile:{...expectedProfile,...sourceProfile},playbooks})
    :null;
  const acceptedSemanticMappingFingerprints=[...new Set([
    clean(expectedLearning.semanticMappingFingerprint),
    sourceLearning?clean(sourceLearning.semanticMappingFingerprint):''
  ].filter(Boolean))];
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
  const semanticMappingFingerprintAccepted=acceptedSemanticMappingFingerprints.includes(semanticMappingFingerprint);
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
    // The sweep preserves newer game-owned clients. Version is a minimum
    // capability requirement; exact learning/schema/content checks still apply.
    ||nativeBindingVersion<ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
    ||clientNativeBindingVersion<nativeBindingVersion
    ||semanticMappingVersion!==ROBLOX_SEMANTIC_MAPPING_VERSION
    ||!semanticMappingFingerprintAccepted
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
    acceptedSemanticMappingFingerprints:Object.freeze([...acceptedSemanticMappingFingerprints]),
    currentSemanticMappingFingerprint:semanticMappingFingerprint,
    sourceSubgenreRefinementAllowed,
    sourceProfile,
    semanticVariant,
    expectedSemanticVariant:clean(expectedLearning.semanticVariant),
    nativeVariantRepairRequired:clientNativeBindingVersion>ROBLOX_VERIFIED_EXTERNAL_NATIVE_BINDING_VERSION
      &&Boolean(semanticVariant)&&semanticVariant!==clean(expectedLearning.semanticVariant),
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

export function validateExistingRobloxSourceTree({root='',baseline={},assetLibrary={}}={}){
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

  const verdict=validateRobloxBootstrap({
    sharedConfig:fs.readFileSync(required.config,'utf8'),
    serverCode:fs.readFileSync(required.server,'utf8'),
    clientCode:fs.readFileSync(required.client,'utf8'),
    baseline,
  });
  blockers.push(...verdict.blockers);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],saveRequired:verdict.saveRequired};
}

export function currentSourceTreeSha({repoRoot='.',sourcePath=''}){
  try{
    return clean(execFileSync('git',['rev-parse',`HEAD:${sourcePath}`],{cwd:repoRoot,encoding:'utf8'}));
  }catch{
    return '';
  }
}

export function evaluateExistingRobloxSources({queue={},repoRoot='.',sourceRevision='',loadBaseline,assetLibrary={},playbooks={},requestedGameId=''}={}){
  if(typeof loadBaseline!=='function')throw new Error('loadBaseline callback required');
  const requested=clean(requestedGameId);
  if(requested&&!/^[a-z0-9][a-z0-9-]{1,48}$/.test(requested))throw new Error('ROBLOX_REQUESTED_GAME_ID_INVALID:'+requested);
  const results=[];
  for(const item of queue.items||[]){
    // 메인: 단일 게임의 재검수는 다른 게임 소스·설계·학습 상태를 읽거나 변경하지 않는다.
    if(requested&&clean(item.gameId)!==requested)continue;
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
    const studioState=fs.existsSync(root)?studioAssetRefreshState({root,assetLibrary}):{required:false,refreshRequired:false,libraryVersion:Number(assetLibrary?.version||0)};
    const learningState=fs.existsSync(root)?verifiedExternalLearningRefreshState({root,playbooks,gameId:item.gameId,profile:learningProfile}):{required:false,refreshRequired:false,expectedIds:[],fingerprint:null};
    const studioRefreshResult=studioState.refreshRequired===true?{
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
      studioAssetBindingRefreshReason:studioState.reason||null,
      studioAssetFamilyStatusMismatches:studioState.familyStatusMismatches||[],
    }:null;
    if(studioRefreshResult&&studioState.reason==='FAMILY_STATUS_SOURCE_MISMATCH'){
      results.push(studioRefreshResult);
      continue;
    }
    if(baseline&&sourceTreeSha&&hasCurrentRobloxPackageAssetRepair({item,assetLibrary,baseline,sourceTreeSha})){
      results.push({gameId:item.gameId,pass:false,sourcePath,sourceRevision:clean(item.robloxSourceCommit),sourceTreeSha,
        sourceRepairPending:true,blockers:[...(item.robloxQualityBuildUpEvidence.staticContract||item.robloxQualityBuildUpEvidence.assetThreshold).blockers],
        failure:'existing-source-package-asset-repair-required',authority:item.robloxQualityBuildUpEvidence.authority});
      continue;
    }
    if(learningState.nativeVariantRepairRequired===true){
      // 최신 게임 소스와 설계의 유형 충돌은 구형 학습 재바인딩 반복으로 해결하지 않는다.
      // 기존 소스 책임 작업에 정확한 실패를 넘기고 실제 네이티브 구현을 보존한다.
      const blockers=['ROBLOX_VERIFIED_LEARNING_NATIVE_VARIANT_MISMATCH'];
      const repairable=sha40(currentRevision)&&sha40(sourceTreeSha);
      results.push({
        gameId:item.gameId,pass:false,sourcePath,sourceRevision:currentRevision,sourceTreeSha,
        sourceDrift:!sourceBind,saveRequired:false,blockers,
        failure:'existing-source-static-revalidation-failed',sourceContractRepairRequired:repairable,
        sourceContractRepairEvidence:repairable?{
          version:1,gameId:item.gameId,sourceRevision:currentRevision,sourceTreeSha,artifactIdentity:null,
          authority:'roblox-source-static-contract-failure',staticContract:{pass:false,blockers},
          assetRepairContext:robloxPackageAssetRepairContext({assetLibrary,baseline}),
          qualityFailureKinds:blockers,repairSurfaces:['SOURCE_CONTRACT'],
          qualityFailureDetails:[{id:blockers[0],repairSurface:'SOURCE_CONTRACT',priority:'P0',
            observed:{currentVariant:learningState.semanticVariant,expectedVariant:learningState.expectedSemanticVariant,
              currentNativeVersion:learningState.clientNativeBindingVersion,generatorNativeVersion:learningState.expectedNativeBindingVersion},
            hint:'Inspect the exact approved design and current native client. Resolve the semantic mismatch in existing responsible source or existing design flow. Preserve newer native behavior, gameplay rules, balance, rewards, saves and server authority. Do not downgrade the native block or relabel a variant to manufacture PASS.'}]
        }:null
      });
      continue;
    }
    if(learningState.refreshRequired===true){
      results.push({
        gameId:item.gameId,pass:false,sourcePath,sourceRevision:currentRevision,sourceTreeSha,sourceDrift:!sourceBind,saveRequired:false,
        blockers:['ROBLOX_VERIFIED_EXTERNAL_LEARNING_REFRESH_REQUIRED'],failure:'existing-source-verified-external-learning-required',
        verifiedExternalLearningRefreshRequired:true,
        verifiedExternalLearningExpectedIds:learningState.expectedIds,
        verifiedExternalLearningCurrentIds:learningState.currentIds||[],
        verifiedExternalLearningFingerprint:learningState.fingerprint,
        verifiedExternalLearningCurrentFingerprint:learningState.currentFingerprint||null,
        verifiedExternalLearningExpectedSemanticMappingFingerprints:learningState.acceptedSemanticMappingFingerprints||[],
        verifiedExternalLearningCurrentSemanticMappingFingerprint:learningState.currentSemanticMappingFingerprint||null,
        verifiedExternalLearningSourceSubgenreRefinementAllowed:learningState.sourceSubgenreRefinementAllowed===true,
        verifiedExternalLearningSourceProfile:learningState.sourceProfile||null,
        verifiedExternalLearningDiagnostics:{
          coverage:learningState.coverage,
          retrieved:learningState.retrieved,
          applied:learningState.applied,
          currentSemanticMappingVersion:learningState.currentSemanticMappingVersion,
          mappingCount:learningState.mappingCount,
          gameSpecificMappingsPresent:learningState.gameSpecificMappingsPresent===true,
          learningDispositionsPresent:learningState.learningDispositionsPresent===true,
          expectedNativeBindingVersion:learningState.expectedNativeBindingVersion,
          nativeBindingVersion:learningState.nativeBindingVersion,
          clientNativeBindingVersion:learningState.clientNativeBindingVersion,
          fullNativeClient:learningState.fullNativeClient===true,
        }
      });
      continue;
    }
    if(studioRefreshResult){
      results.push(studioRefreshResult);
      continue;
    }
    // A prior failed contract/package is unresolved even when the game bytes did not change.
    const sourceContractRecheck=!sourceBind&&item.robloxBuildOrPackagePassed!==true
      &&/existing-source-static-revalidation-failed|existing-source-studio-asset-binding-required|roblox-build-package-failed/i.test(clean(item.robloxFailureSignature));
    const boundRevision=clean(item.robloxSourceCommit);
    if(sha40(boundRevision)&&sha40(currentRevision)){
      if(boundRevision===currentRevision){
        if(!sourceBind&&!sourceContractRecheck)continue;
      }else{
        try{
          execFileSync('git',['diff','--quiet',boundRevision,currentRevision,'--',`${sourcePath}/default.project.json`,`${sourcePath}/shared`,`${sourcePath}/server`,`${sourcePath}/client`],{cwd:repoRoot,stdio:'ignore'});
          if(!sourceBind&&!sourceContractRecheck)continue;
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
        sourceContractRepairRequired:!verdict.pass&&sha40(currentRevision)&&sha40(sourceTreeSha),
        sourceContractRepairEvidence:!verdict.pass&&sha40(currentRevision)&&sha40(sourceTreeSha)?{
          version:1,gameId:item.gameId,sourceRevision:currentRevision,sourceTreeSha,artifactIdentity:null,
          authority:'roblox-source-static-contract-failure',
          staticContract:{pass:false,blockers:[...verdict.blockers]},
          assetRepairContext:robloxPackageAssetRepairContext({assetLibrary,baseline}),
          qualityFailureKinds:[...verdict.blockers],
          repairSurfaces:['SOURCE_CONTRACT'],
          qualityFailureDetails:verdict.blockers.map(id=>({id,repairSurface:'SOURCE_CONTRACT',priority:'P0',hint:'Inspect the exact current approved design and existing source. Repair actual server/client functionality; do not add PASS markers or relabel an unrelated genre to satisfy the check. Preserve balance, rewards, save schema, permissions and asset originals. Resolve design/source conflicts through the existing design flow when gameplay changes are not authorized.'})),
        }:null,
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
  const requestedGameId=arg('game-id');
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
    requestedGameId,
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
