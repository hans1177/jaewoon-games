import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const bool=v=>String(v??'').toLowerCase()==='true';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stableSha256=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function assertCurrentStudioWorkflowHead({
  workflowSha=clean(process.env.GITHUB_SHA),
  checkoutDir=path.resolve('main')
}={}){
  const expected=clean(workflowSha);
  if(!expected)return{pass:true,workflowSha:'',checkoutSha:''};
  const probe=spawnSync('git',['-C',checkoutDir,'rev-parse','HEAD'],{encoding:'utf8'});
  const checkoutSha=clean(probe.stdout);
  if(probe.status!==0||!checkoutSha)throw new Error('ROBLOX_STUDIO_CURRENT_MAIN_HEAD_UNAVAILABLE');
  if(checkoutSha!==expected){
    throw new Error('ROBLOX_STUDIO_STALE_WORKFLOW_RUN_ABORT:workflow='+expected+':checkout='+checkoutSha);
  }
  return{pass:true,workflowSha:expected,checkoutSha};
}

export function validateLocalStudioPolicy(roadmap={}){
  const studio=roadmap?.roblox?.studioExecution||{};
  const usage=roadmap?.developmentLifecycleMachine?.robloxStudioUsage||{};
  const forbidden=Array.isArray(usage.forbidden)?usage.forbidden:[];
  const pass=
    studio.enabled===true
    &&studio.requiredForActualVibeInternalPlay===true
    &&studio.officialStudioMcpOnly===true
    &&studio.localPlaceFileRequired===true
    &&studio.onlinePublishedPlaceDirectOpenForbidden===true
    &&studio.robloxPlayerAutomationForbidden===true
    &&studio.externalGuiAutomationForbidden===true
    &&studio.undocumentedStudioCliAutomationForbidden===true
    &&clean(studio.studioMcpTransport)==='STDIO'
    &&usage.learningUseForbidden===false
    &&forbidden.includes('ROBLOX_PLAYER_AUTOMATION')
    &&forbidden.includes('PUBLIC_SERVER_BOT_PLAY')
    &&forbidden.includes('PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION')
    &&forbidden.includes('UNDOCUMENTED_STUDIO_CLI_AUTOMATION')
    &&forbidden.includes('EXTERNAL_GUI_MACRO_OR_INJECTION');
  if(!pass)throw new Error('ROBLOX_STUDIO_MCP_POLICY_MISMATCH');
  return true;
}

function collectAssistantSettingJsonFiles(root){
  const files=[];
  const visit=dir=>{
    let entries=[];
    try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const entry of entries){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){visit(full);continue;}
      if(entry.isFile()&&/\.json$/i.test(entry.name))files.push(full);
    }
  };
  if(root&&fs.existsSync(root))visit(root);
  return files.sort();
}

function normalizeSettingPath(parts=[]){
  return parts.map(part=>clean(part).toLowerCase().replace(/[^a-z0-9]/g,'')).filter(Boolean);
}

function isStudioMcpEnableBooleanPath(parts=[]){
  const normalized=normalizeSettingPath(parts);
  if(!normalized.length)return false;
  const joined=normalized.join('.');
  const hasMcp=joined.includes('mcp');
  const hasServerOrStudio=joined.includes('server')||joined.includes('studio');
  if(!hasMcp||!hasServerOrStudio)return false;
  const hasEnableSemantic=joined.includes('enable')||joined.includes('enabled')||joined.includes('active');
  if(hasEnableSemantic)return true;
  const leaf=normalized.at(-1)||'';
  const parent=normalized.at(-2)||'';
  return leaf==='value'&&(parent.includes('mcpserver')||parent.includes('studiomcp')||parent==='mcpserver');
}

function collectMcpServerEnabledSignals(value,pathParts=[],out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){
    value.forEach((row,index)=>collectMcpServerEnabledSignals(row,[...pathParts,String(index)],out));
    return out;
  }
  if(typeof value!=='object'){
    if(typeof value==='boolean'&&isStudioMcpEnableBooleanPath(pathParts)){
      out.push({enabled:value,path:pathParts.join('.')});
    }
    return out;
  }
  for(const [key,child] of Object.entries(value)){
    collectMcpServerEnabledSignals(child,[...pathParts,key],out);
  }
  return out;
}

export function detectStudioMcpAssistantSetting({settingsRoot=''}={}){
  const root=clean(settingsRoot);
  const files=collectAssistantSettingJsonFiles(root);
  let enabledCount=0,disabledCount=0,parseErrorCount=0;
  const candidatePaths=new Set();
  for(const file of files){
    try{
      const parsed=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
      for(const signal of collectMcpServerEnabledSignals(parsed,[],[])){
        candidatePaths.add(clean(signal.path));
        if(signal.enabled===true)enabledCount++;
        else if(signal.enabled===false)disabledCount++;
      }
    }catch{
      parseErrorCount++;
    }
  }
  const state=enabledCount>0?'YES'
    :files.length===0?'MISSING'
    :disabledCount>0?'NO'
    :'UNKNOWN';
  return{
    version:2,
    state,
    fileCount:files.length,
    enabledCount,
    disabledCount,
    parseErrorCount,
    candidatePathCount:candidatePaths.size,
    candidatePaths:[...candidatePaths].filter(Boolean).sort().slice(0,32),
    mutationPerformed:false
  };
}

function artifactRunIdFor(item={},candidate={}){
  return Number(candidate?.artifactRunId||item?.robloxFoundationF0Evidence?.artifactRunId||item?.robloxHeadlessFastMvpEvidence?.artifactRunId||0);
}

function runtimeFoundationObserved(item={},candidate={}){
  const runtime=item?.robloxRuntimeFoundationEvidence||{};
  const sourceRevision=clean(item?.robloxSourceCommit);
  const artifactIdentity=clean(item?.robloxBuildArtifactIdentity);
  return Boolean(
    item?.robloxRuntimeFoundationPassed===true
    &&runtime?.runtimeFoundationPassed===true
    &&clean(runtime?.sourceRevision)===sourceRevision
    &&clean(runtime?.artifactIdentity)===artifactIdentity
    &&String(runtime?.placeId||'')===String(candidate?.placeId||'')
    &&Number(runtime?.candidateVersionNumber||0)===Number(candidate?.versionNumber||0)
  );
}

function internalReleaseObserved(item={},candidate={}){
  const internal=item?.robloxInternalReleaseEvidence||{};
  const sourceRevision=clean(item?.robloxSourceCommit);
  const artifactIdentity=clean(item?.robloxBuildArtifactIdentity);
  return Boolean(
    item?.robloxInternalReleasePublished===true
    ||(
      internal?.published===true
      &&clean(internal?.sourceRevision||candidate?.sourceRevision)===sourceRevision
      &&clean(internal?.artifactIdentity||candidate?.artifactIdentity)===artifactIdentity
      &&Number(internal?.versionNumber||candidate?.versionNumber||0)>0
    )
  );
}

function launchStringList(value){
  return Array.isArray(value)?value.map(clean).filter(Boolean):[];
}

function adaptiveCoverageSignals(launch={}){
  const launchCore=launchStringList(launch?.launchCore);
  const releaseGates=launchStringList(launch?.releaseGates);
  const text=[...launchCore,...releaseGates].join(' ').toLowerCase();
  return Object.freeze({
    ui:/ui|hud|mobile|button|menu|inventory|shop|equip|craft|control|dock|screen|lobby|loading|모바일|버튼|메뉴|인벤|상점|장비|제작|조작|화면|로비|로딩/.test(text),
    onboarding:/tutorial|guide|onboarding|ftue|start screen|loading|lobby|objective|hint|튜토리얼|가이드|초보|시작 화면|로딩|로비|목표|안내/.test(text),
    map:/map|zone|portal|dungeon|room|island|arena|world|base|village|ground|route|school|hospital|park|forest|cave|field|맵|지역|포탈|던전|방|섬|아레나|마을|사냥터|학교|병원|공원|숲|동굴/.test(text),
    interactions:/quest|shop|inventory|equip|craft|prompt|interact|hire|recruit|build|upgrade|attack|skill|ability|button|door|portal|collect|gather|heal|trade|퀘스트|상점|인벤|장비|제작|상호작용|고용|모집|건설|강화|공격|스킬|문|포탈|채집|회복|거래/.test(text),
    progression:/level|xp|gold|quest|wave|round|stage|boss|base|zone|portal|unlock|progress|mastery|advancement|tier|reward|레벨|경험치|골드|퀘스트|웨이브|라운드|스테이지|보스|해금|진행|숙련|전직|티어|보상/.test(text),
    multiplayer:/multiplayer|multi-player|party|team|co-op|coop|cooperative|sync|late.?join|rejoin|2\+ players|멀티|파티|팀|협동|동기화|재접속/.test(text),
    serverBoundary:/remote|server|authority|authoritative|spam|abuse|validation|datastore|save|rejoin/.test(text),
    combat:/combat|attack|skill|ability|damage|boss|enemy|monster|mob|zombie|wolf|spider|raider|defense|battle|전투|공격|스킬|데미지|보스|적|몬스터|좀비|늑대|거미|방어/.test(text),
    motion:/dash|dodge|parry|block|movement|move|chase|charge|jump|attack|skill|ability/.test(text),
    audio:/audio|bgm|music|sound|sfx|footstep/.test(text),
    npc:/npc|merchant|chief|healer|resident|worker|villager|quest giver|trainer|master|shopkeeper|상인|이장|치유사|주민|일꾼|마을사람|교관|전직|상점주인/.test(text),
    companion:/companion|follower|pet|summon|party member|ai party|boss companion|worker automation|동료|펫|소환|파티원|동료 ai|자동 일꾼/.test(text),
    items:/item|loot|drop|weapon|armor|relic|inventory|resource|material|chest|food|potion/.test(text),
    environment:/environment|decoration|asset|visual|art|biome|terrain|lighting|forest|village|house|building|theme/.test(text),
    effects:/vfx|effect|feedback|telegraph|trail|flash|particle|beam|highlight|sound|sfx/.test(text),
    quests:/quest|mission|objective|task|contract|hunt|delivery|trial|퀘스트|임무|목표|과제|의뢰|사냥|배달|시험/.test(text),
    rewards:/reward|gold|coin|xp|loot|drop|chest|prize|currency|income|보상|골드|코인|경험치|전리품|드롭|상자|재화|수입/.test(text),
    economy:/gold|coin|currency|shop|merchant|price|cost|upgrade|purchase|sell/.test(text),
    save:/save|load|rejoin|datastore|persist|progression persists|unlock persists/.test(text),
    retry:/retry|restart|respawn|round restart|new run|reroll|reset|rejoin/.test(text),
    camera:/camera|chase screen|field of view|fov|spectat/.test(text),
    performance:/performance|optimization|streaming|large map|expanded map|population|many|roster/.test(text)
  });
}

export function deriveStudioActualPlayContract(launch={}){
  const explicit=launch?.studioActualPlayContract&&typeof launch.studioActualPlayContract==='object'
    ?launch.studioActualPlayContract:{};
  const launchCore=launchStringList(launch?.launchCore);
  const releaseGates=launchStringList(launch?.releaseGates);
  const evidencePolicy=launch?.evidencePolicy&&typeof launch.evidencePolicy==='object'?launch.evidencePolicy:{};
  const signals=adaptiveCoverageSignals(launch);
  const adaptiveScenarios=[
    'character-camera-ready','adaptive-start-playability','visual-capture-sane','adaptive-runtime-surface','adaptive-ftue-clarity',
    'adaptive-ui-commercial-quality','adaptive-ui-blocking-overlay','adaptive-world-safety','adaptive-map-route-coverage','adaptive-spawn-safety','adaptive-interaction-surface','adaptive-semantic-interaction-effect','adaptive-system-transaction-effect','adaptive-travel-effect',
    'adaptive-gameplay-loop-cadence','adaptive-quest-state-transition','adaptive-reward-effect','adaptive-progression-surface','adaptive-remote-surface','adaptive-combat-surface','adaptive-mob-animation-ai',
    'adaptive-motion-surface','adaptive-audio-surface','adaptive-npc-surface',
    'adaptive-companion-ai-surface','adaptive-item-surface','adaptive-environment-surface',
    'adaptive-effects-surface','adaptive-quest-loop-surface','adaptive-reward-loop-surface',
    'adaptive-economy-surface','adaptive-save-surface','adaptive-save-rejoin-persistence','adaptive-retry-loop-surface','adaptive-retry-action-effect','adaptive-death-respawn-recovery',
    'adaptive-multiplayer-sync-surface','adaptive-camera-quality','adaptive-performance-budget'
  ];
  const explicitScenarios=launchStringList(explicit?.requiredScenarios);
  return Object.freeze({
    ...explicit,
    version:Number(explicit?.version||3),
    required:true,
    source:clean(explicit?.source)||'COMMERCIAL_ADAPTIVE_STUDIO_AUDIT',
    observedActionPatternVersion:1,
    requiredScenarios:[...new Set([...explicitScenarios,...adaptiveScenarios])],
    expectations:{...(explicit?.expectations||{})},
    adaptiveCoverage:Object.freeze({
      version:1,
      launchCore,
      releaseGates,
      evidencePolicy,
      signals,
      featureCount:launchCore.length+releaseGates.length,
      contractHash:'sha256:'+stableSha256({launchCore,releaseGates,evidencePolicy,signals})
    })
  });
}

function localStudioActualPlayContractMetadata(repoRoot='',gameId=''){
  const root=clean(repoRoot);
  const id=clean(gameId);
  if(!root||!id)return{required:false,version:0,fingerprint:null};
  const file=path.join(root,'roblox-games',id,'launch-mvp.json');
  if(!fs.existsSync(file))return{required:false,version:0,fingerprint:null};
  let launch={};
  try{launch=readJson(file);}catch{return{required:false,version:0,fingerprint:null};}
  const contract=deriveStudioActualPlayContract(launch);
  return{
    required:true,
    version:Number(contract.version||0),
    fingerprint:'sha256:'+stableSha256(contract),
    adaptiveCoverage:true,
    multiplayerRequired:contract?.adaptiveCoverage?.signals?.multiplayer===true,
    featureCount:Number(contract?.adaptiveCoverage?.featureCount||0)
  };
}

export function planLocalStudioCandidates({queue={},roadmap={},requestedGameId='',repoRoot=''}={}){

  validateLocalStudioPolicy(roadmap);
  const requested=clean(requestedGameId);
  const studioPolicy=roadmap?.roblox?.studioExecution||{};
  const recovery=studioPolicy?.mcpUnavailableRecovery||{};
  const historicalPrerequisiteReplayAllowed=
    studioPolicy?.historicalExactPublishedArtifactAllowedForLocalActualPlay===true
    &&recovery?.automaticResumeAfterPrerequisite===true;
  const include=[];
  for(const item of queue?.items||[]){
    if(requested&&clean(item?.gameId)!==requested)continue;
    if(clean(item?.status)==='DISABLED'||clean(item?.lifecycleState)==='DISABLED')continue;

    const persistedCandidate=item?.robloxRuntimeCandidateEvidence||{};
    const internal=item?.robloxInternalReleaseEvidence||{};
    const prior=item?.robloxInternalVibePlayEvidence||{};
    const scenarioContract=localStudioActualPlayContractMetadata(repoRoot,clean(item?.gameId));
    const currentSourceRevision=clean(item?.robloxSourceCommit);
    const currentArtifactIdentity=clean(item?.robloxBuildArtifactIdentity);
    const f0=item?.robloxFoundationF0Evidence||{};
    const localArtifactRunId=Number(f0?.artifactRunId||item?.robloxHeadlessFastMvpEvidence?.artifactRunId||0);
    const localF0Exact=Boolean(
      persistedCandidate?.published!==true
      &&item?.robloxFoundationF0Passed===true
      &&item?.robloxBuildPreflightPassed===true
      &&item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===currentSourceRevision
      &&clean(f0?.sourceRevision)===currentSourceRevision
      &&clean(f0?.artifactIdentity)===currentArtifactIdentity
      &&localArtifactRunId>0
    );
    const candidate=localF0Exact?{
      published:false,
      authority:'roblox-local-f0-pre-f9-artifact',
      sourceRevision:currentSourceRevision,
      artifactIdentity:currentArtifactIdentity,
      artifactRunId:localArtifactRunId,
      universeId:'',
      placeId:'',
      versionNumber:localArtifactRunId,
    }:persistedCandidate;
    const candidateSourceRevision=clean(candidate?.sourceRevision);
    const candidateArtifactIdentity=clean(candidate?.artifactIdentity);
    const candidateArtifactRunId=Number(candidate?.artifactRunId||0);
    const activeQualityBuildUp=Boolean(
      item?.robloxQualityBuildUpRequired===true
      &&clean(item?.robloxQualityBuildUpSourceRevision)===currentSourceRevision
    );
    if(activeQualityBuildUp){
      console.log('ROBLOX_STUDIO_MCP_QUALITY_BUILDUP_SUPPRESSED='+clean(item?.gameId)+':source='+currentSourceRevision);
      continue;
    }

    const publishedCandidateExact=Boolean(
      candidate?.published===true
      &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
      &&/^[0-9a-f]{40}$/i.test(candidateSourceRevision)
      &&/^sha256:[0-9a-f]{64}$/i.test(candidateArtifactIdentity)
      &&candidateArtifactRunId>0
      &&/^[1-9][0-9]*$/.test(String(candidate?.universeId||''))
      &&/^[1-9][0-9]*$/.test(String(candidate?.placeId||''))
      &&Number(candidate?.versionNumber||0)>0
    );
    const localF0CandidateExact=Boolean(
      localF0Exact
      &&clean(candidate?.authority)==='roblox-local-f0-pre-f9-artifact'
      &&candidateSourceRevision===currentSourceRevision
      &&candidateArtifactIdentity===currentArtifactIdentity
      &&candidateArtifactRunId===localArtifactRunId
      &&Number(candidate?.versionNumber||0)===localArtifactRunId
    );
    const candidateExact=publishedCandidateExact||localF0CandidateExact;

    const runtimeFoundationExact=Boolean(
      candidateExact
      &&item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===currentSourceRevision
      &&currentSourceRevision===candidateSourceRevision
      &&currentArtifactIdentity===candidateArtifactIdentity
      &&runtimeFoundationObserved(item,candidate)
    );
    const exactEngineAwaitingRealServerBoot=Boolean(
      candidateExact
      &&item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===currentSourceRevision
      &&currentSourceRevision===candidateSourceRevision
      &&currentArtifactIdentity===candidateArtifactIdentity
      &&item?.robloxRuntimeFoundationPassed!==true
      &&clean(item?.robloxRuntimeFoundationEvidence?.authority)==='exact-engine-version-awaiting-real-server-boot'
      &&clean(item?.robloxRuntimeFoundationEvidence?.sourceRevision)===currentSourceRevision
      &&clean(item?.robloxRuntimeFoundationEvidence?.artifactIdentity)===currentArtifactIdentity
      &&String(item?.robloxRuntimeFoundationEvidence?.placeId||'')===String(candidate?.placeId||'')
      &&Number(item?.robloxRuntimeFoundationEvidence?.candidateVersionNumber||0)===Number(candidate?.versionNumber||0)
      &&item?.robloxRuntimeFoundationEvidence?.engineExecuted===true
      &&item?.robloxRuntimeFoundationEvidence?.exactEngineVersion===true
      &&item?.robloxRuntimeFoundationEvidence?.serverBootObserved!==true
    );
    const currentExact=Boolean(
      candidateExact
      &&item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===currentSourceRevision
      &&currentSourceRevision===candidateSourceRevision
      &&currentArtifactIdentity===candidateArtifactIdentity
    );

    const historicalInternalReleaseExact=Boolean(
      internal?.published===true
      &&clean(internal?.sourceRevision)===candidateSourceRevision
      &&clean(internal?.artifactIdentity)===candidateArtifactIdentity
      &&Number(internal?.artifactRunId||0)===candidateArtifactRunId
      &&String(internal?.universeId||'')===String(candidate?.universeId||'')
      &&String(internal?.placeId||'')===String(candidate?.placeId||'')
      &&Number(internal?.versionNumber||0)===Number(candidate?.versionNumber||0)
    );

    const priorEnablementPrerequisiteExact=Boolean(
      prior?.infrastructureFailure===true
      &&clean(prior?.failureClass)==='STUDIO_MCP_INFRASTRUCTURE_PENDING'
      &&prior?.studioMcpServerEnablementRequired===true
      &&clean(prior?.operatorPrerequisite)==='ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT'
      &&clean(prior?.sourceRevision)===candidateSourceRevision
      &&clean(prior?.artifactIdentity)===candidateArtifactIdentity
      &&Number(prior?.artifactRunId||0)===candidateArtifactRunId
      &&String(prior?.universeId||'')===String(candidate?.universeId||'')
      &&String(prior?.placeId||'')===String(candidate?.placeId||'')
      &&Number(prior?.versionNumber||0)===Number(candidate?.versionNumber||0)
    );

    const infrastructurePrerequisiteReplay=Boolean(
      !currentExact
      &&historicalPrerequisiteReplayAllowed
      &&candidateExact
      &&historicalInternalReleaseExact
      &&priorEnablementPrerequisiteExact
    );

    if(!currentExact&&!infrastructurePrerequisiteReplay)continue;

    const sourceRevision=currentExact?currentSourceRevision:candidateSourceRevision;
    const artifactIdentity=currentExact?currentArtifactIdentity:candidateArtifactIdentity;
    const artifactRunId=candidateArtifactRunId;

    const requiredAuditProfile=(
      item?.robloxF9ReleaseRegressionPassed===true
      ||/FINAL_REVIEW|RELEASE|F9/i.test(clean(item?.currentStep))
    )?'F9_SOAK':'FAST_DEEP';
    const priorAuditProfile=clean(prior?.runtimeSummary?.commercialAudit?.auditProfile||prior?.auditProfile||'FAST_DEEP').toUpperCase();
    const priorMultiplayer=prior?.runtimeSummary?.commercialAudit?.multiplayer;
    const multiplayerEvidenceExact=requiredAuditProfile!=='F9_SOAK'||scenarioContract.multiplayerRequired!==true||(
      priorMultiplayer?.version===2&&priorMultiplayer?.pass===true&&priorMultiplayer?.bothClientsStatePass===true
      &&priorMultiplayer?.survivorStatePass===true&&priorMultiplayer?.replacementJoinPass===true
    );
    const auditProfileEvidenceExact=priorAuditProfile===requiredAuditProfile&&multiplayerEvidenceExact;
    const scenarioEvidenceExact=Boolean(
      scenarioContract.required!==true
      ||(
        prior?.scenarioContractRequired===true
        &&Number(prior?.scenarioContractVersion||0)===Number(scenarioContract.version||0)
        &&clean(prior?.scenarioContractFingerprint)===clean(scenarioContract.fingerprint)
      )
    );
    const alreadyObservedExactCandidate=Boolean(
      prior?.pass===true
      &&prior?.actualPlay===true
      &&prior?.officialStudioMcp===true
      &&prior?.localPlaceFile===true
      &&prior?.onlinePlaceDirectOpen===false
      &&prior?.robloxPlayerAutomation===false
      &&clean(prior?.sourceRevision)===sourceRevision
      &&clean(prior?.artifactIdentity)===artifactIdentity
      &&Number(prior?.artifactRunId||0)===artifactRunId
      &&String(prior?.universeId||'')===String(candidate?.universeId||'')
      &&String(prior?.placeId||'')===String(candidate?.placeId||'')
      &&Number(prior?.versionNumber||0)===Number(candidate?.versionNumber||0)
      &&Boolean(clean(prior?.testedAt))
      &&scenarioEvidenceExact
      &&auditProfileEvidenceExact
    );
    const alreadyObservedExactLocalArtifact=Boolean(
      localF0CandidateExact
      &&prior?.pass===true
      &&prior?.actualPlay===true
      &&prior?.runtimeVerified===true
      &&prior?.officialStudioMcp===true
      &&prior?.localPlaceFile===true
      &&prior?.onlinePlaceDirectOpen===false
      &&prior?.robloxPlayerAutomation===false
      &&clean(prior?.artifactIdentity)===artifactIdentity
      &&Number(prior?.runtimeSummary?.consoleErrorCount||0)===0
      &&Boolean(clean(prior?.testedAt))
      &&scenarioEvidenceExact
      &&auditProfileEvidenceExact
    );
    if(alreadyObservedExactCandidate||alreadyObservedExactLocalArtifact)continue;

    include.push({
      gameId:clean(item.gameId),
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId:String(candidate.universeId),
      placeId:String(candidate.placeId),
      versionNumber:Number(candidate.versionNumber),
      sharedTargetCurrent:item?.robloxSharedTargetCurrent===true,
      historicalExactPublishedArtifact:infrastructurePrerequisiteReplay||item?.robloxSharedTargetCurrent!==true,
      infrastructurePrerequisiteReplay,
      actualPlayEligibility:localF0CandidateExact?'LOCAL_F0_ARTIFACT_EXACT':runtimeFoundationExact?'RUNTIME_FOUNDATION_PASS':exactEngineAwaitingRealServerBoot?'EXACT_ENGINE_VERSION_AWAITING_REAL_SERVER_BOOT':internalReleaseObserved(item,candidate)?'INTERNAL_RELEASE_EXACT':'PRIVATE_INTERNAL_CANDIDATE_EXACT',
      scenarioContractRequired:scenarioContract.required===true,
      scenarioContractVersion:Number(scenarioContract.version||0),
      scenarioContractFingerprint:scenarioContract.fingerprint,
      auditProfile:requiredAuditProfile
    });
  }

  if(!requested&&include.length>1){
    const itemByGameId=new Map((queue?.items||[]).map(row=>[clean(row?.gameId),row]));
    const infrastructurePending=include.filter(row=>{
      const item=itemByGameId.get(row.gameId)||{};
      const prior=item?.robloxInternalVibePlayEvidence||{};
      return prior?.infrastructureFailure===true
        &&prior?.failureClass==='STUDIO_MCP_INFRASTRUCTURE_PENDING'
        &&clean(prior?.sourceRevision)===row.sourceRevision
        &&clean(prior?.artifactIdentity)===row.artifactIdentity
        &&Number(prior?.artifactRunId||0)===Number(row.artifactRunId||0)
        &&String(prior?.universeId||'')===String(row.universeId||'')
        &&String(prior?.placeId||'')===String(row.placeId||'')
        &&Number(prior?.versionNumber||0)===Number(row.versionNumber||0);
    });
    if(infrastructurePending.length>1){
      const infraIds=new Set(infrastructurePending.map(row=>row.gameId));
      const nonInfra=include.filter(row=>!infraIds.has(row.gameId));
      const canary=[...infrastructurePending].sort((a,b)=>{
        const ai=clean(itemByGameId.get(a.gameId)?.robloxInternalVibePlayEvidence?.testedAt);
        const bi=clean(itemByGameId.get(b.gameId)?.robloxInternalVibePlayEvidence?.testedAt);
        return ai.localeCompare(bi)||a.gameId.localeCompare(b.gameId);
      })[0];
      const deferred=infrastructurePending.filter(row=>row.gameId!==canary.gameId).map(row=>row.gameId).sort();
      console.log('ROBLOX_STUDIO_MCP_SHARED_INFRA_CANARY='+canary.gameId);
      console.log('ROBLOX_STUDIO_MCP_SHARED_INFRA_DEFERRED='+(deferred.join(',')||'NONE'));
      return{
        include:[...nonInfra,canary],
        sharedInfrastructureCanary:true,
        deferredInfrastructureGameIds:deferred
      };
    }
  }
  return{include,sharedInfrastructureCanary:false,deferredInfrastructureGameIds:[]};
}
function flattenText(value,out=[]){
  if(value==null)return out;
  if(typeof value==='string'){out.push(value);return out;}
  if(Array.isArray(value)){for(const v of value)flattenText(v,out);return out;}
  if(typeof value==='object'){
    if(typeof value.text==='string')out.push(value.text);
    for(const [k,v] of Object.entries(value)){
      if(k==='text')continue;
      flattenText(v,out);
    }
  }
  return out;
}

function collectImages(value,out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(const v of value)collectImages(v,out);return out;}
  if(typeof value==='object'){
    if(clean(value.type).toLowerCase()==='image'&&typeof value.data==='string'){
      out.push({mimeType:clean(value.mimeType||value.mime_type||'image/png'),data:value.data});
    }
    for(const v of Object.values(value))collectImages(v,out);
  }
  return out;
}

export function collectStudios(value,out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(const v of value)collectStudios(v,out);return out;}
  if(typeof value==='string'){
    const text=clean(value);
    if(text&&(text.startsWith('{')||text.startsWith('['))){
      try{collectStudios(JSON.parse(text),out);}catch{}
    }
    return out;
  }
  if(typeof value==='object'){
    const plainIdIsStudioShape=
      Object.prototype.hasOwnProperty.call(value,'id')
      &&(
        Object.prototype.hasOwnProperty.call(value,'name')
        ||Object.prototype.hasOwnProperty.call(value,'place_id')
        ||Object.prototype.hasOwnProperty.call(value,'placeId')
      );
    const studioId=clean(
      value.studio_id
      ||value.studioId
      ||value.studioID
      ||value.studio_instance_id
      ||value.studioInstanceId
      ||(plainIdIsStudioShape?value.id:'')
    );
    if(studioId){
      out.push({
        studioId,
        name:clean(value.name||value.display_name||value.displayName||value.place_name||value.placeName),
        placeId:clean(value.place_id||value.placeId)
      });
    }
    for(const v of Object.values(value))collectStudios(v,out);
  }
  return out;
}

function hash(value){
  return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
}
function normalizeConsoleMessageType(value){
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const text=clean(value).toLowerCase();
  if(!text)return null;
  if(text==='3'||text==='messageerror'||text==='error'||text.endsWith('.messageerror'))return 3;
  if(text==='2'||text==='messagewarning'||text==='warning'||text==='warn'||text.endsWith('.messagewarning'))return 2;
  if(text==='1'||text==='messageinfo'||text==='info'||text.endsWith('.messageinfo'))return 1;
  if(text==='0'||text==='messageoutput'||text==='output'||text.endsWith('.messageoutput'))return 0;
  return null;
}

export function collectStudioConsoleEntries(value,out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(const item of value)collectStudioConsoleEntries(item,out);return out;}
  if(typeof value==='string'){
    const text=clean(value);
    if(!text)return out;
    const candidates=text.split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
    for(const candidate of candidates){
      if(!(candidate.startsWith('{')||candidate.startsWith('[')))continue;
      try{collectStudioConsoleEntries(JSON.parse(candidate),out);}catch{}
    }
    return out;
  }
  if(typeof value==='object'){
    if(typeof value.message==='string'){
      out.push({
        message:clean(value.message),
        messageType:normalizeConsoleMessageType(value.messageType??value.message_type??value.level??value.type),
        timestamp:Number(value.timestamp??value.ts??0)||0
      });
    }
    for(const [key,child] of Object.entries(value)){
      if(key==='message'||key==='messageType'||key==='message_type'||key==='timestamp'||key==='ts')continue;
      collectStudioConsoleEntries(child,out);
    }
  }
  return out;
}

export function classifyStudioConsoleOutput(consoleResult){
  const structuredRaw=collectStudioConsoleEntries(consoleResult,[]);
  const structured=[];
  const seen=new Set();
  for(const entry of structuredRaw){
    const key=String(entry.messageType)+'|'+entry.message;
    if(!entry.message||seen.has(key))continue;
    seen.add(key);
    structured.push(entry);
  }

  const errors=[];
  let warningCount=0;
  const addError=message=>{
    const signature=clean(message).replace(/\s+/g,' ').slice(0,500);
    if(signature&&!errors.some(row=>row.signature===signature)){
      errors.push({type:assetLoadPattern.test(signature)?'studio-asset-load-error':'studio-console-error',actionId:null,signature});
    }
  };
  const assetLoadPattern=/(?:failed to load|unable to load|not authorized to access|asset is not available).{0,160}(?:asset|mesh|texture|image|animation|rbxasset)/i;
  const gameActionYieldPattern=/Infinite yield possible.*WaitForChild\(["']GameAction["']\)/i;
  const localUnpublishedDataStorePattern=/You must publish this place to the web to access DataStore/i;
  const criticalConsolePatterns=[
    gameActionYieldPattern,
    /DataStoreService.*(?:Studio access to APIs is not allowed|API Services are disabled)/i,
    localUnpublishedDataStorePattern,
    assetLoadPattern
  ];
  const fallbackText=flattenText(consoleResult,[]).join('\n');
  const localUnpublishedDataStoreObserved=
    structured.some(entry=>localUnpublishedDataStorePattern.test(entry.message))
    ||localUnpublishedDataStorePattern.test(fallbackText);
  let localUnpublishedDataStoreSuppressed=false;
  const suppressLocalUnpublishedCascade=message=>{
    if(!localUnpublishedDataStoreObserved)return false;
    const suppress=localUnpublishedDataStorePattern.test(message)||gameActionYieldPattern.test(message);
    if(suppress)localUnpublishedDataStoreSuppressed=true;
    return suppress;
  };

  for(const entry of structured){
    if(entry.messageType===3){
      if(!suppressLocalUnpublishedCascade(entry.message))addError(entry.message);
    }else if(entry.messageType===2){
      warningCount++;
      if(criticalConsolePatterns.some(re=>re.test(entry.message))&&!suppressLocalUnpublishedCascade(entry.message))addError(entry.message);
    }
  }

  const strongFallbackPatterns=[
    ...criticalConsolePatterns,
    /Script Runtime Error/i,
    /attempt to index nil/i,
    /unhandled exception/i
  ];
  if(structured.length===0||structured.some(entry=>entry.messageType==null)){
    const unknownMessages=structured.length
      ?structured.filter(entry=>entry.messageType==null).map(entry=>entry.message)
      :[fallbackText];
    for(const message of unknownMessages){
      if(strongFallbackPatterns.some(re=>re.test(message))&&!suppressLocalUnpublishedCascade(message))addError(message);
    }
  }

  return{
    errors,
    warningCount,
    structuredEntryCount:structured.length,
    localUnpublishedDataStoreSuppressed,
    consoleText:fallbackText
  };
}

export function collectCharacterMotionRuntimeEvidence(consoleResult){
  const text=flattenText(consoleResult,[]).join('\n');
  const lines=text.split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
  const rows=[];
  for(const line of lines){
    const markerIndex=line.indexOf('ROBLOX_CHARACTER_MOTION_RUNTIME=');
    if(markerIndex<0)continue;
    const payload=clean(line.slice(markerIndex+'ROBLOX_CHARACTER_MOTION_RUNTIME='.length));
    if(!payload)continue;
    const firstSpace=payload.indexOf(' ');
    const state=clean(firstSpace<0?payload:payload.slice(0,firstSpace)).toUpperCase();
    const rest=firstSpace<0?'':payload.slice(firstSpace+1);
    const fields={};
    for(const token of rest.split(/\s+/).map(clean).filter(Boolean)){
      const split=token.indexOf('=');
      if(split<=0)continue;
      const key=clean(token.slice(0,split));
      const value=clean(token.slice(split+1));
      if(key)fields[key]=value;
    }
    rows.push({state,fields,line:payload.slice(0,700)});
  }
  const started=rows.some(row=>row.state==='START');
  const passed=rows.some(row=>row.state==='PASS');
  const failed=rows.filter(row=>row.state==='FAIL');
  const required=started||passed||failed.length>0;
  return Object.freeze({
    required,
    observed:rows.length>0,
    started,
    pass:required&&passed&&failed.length===0,
    failed:failed.length>0,
    rows:Object.freeze(rows.map(row=>Object.freeze({state:row.state,fields:Object.freeze({...row.fields}),line:row.line}))),
    failureReasons:Object.freeze(failed.map(row=>clean(row.fields.reason)||'CHARACTER_MOTION_MANNEQUIN')),
    marker:'ROBLOX_CHARACTER_MOTION_RUNTIME',
    hardFailure:'ROBLOX_CHARACTER_MOTION_MANNEQUIN'
  });
}


function schemaProps(schema={}){return schema?.properties&&typeof schema.properties==='object'?schema.properties:{};}
function schemaRequired(schema={}){return Array.isArray(schema?.required)?schema.required:[];}
function setStudioId(args,schema,studioId){
  const props=schemaProps(schema);
  const key=Object.keys(props).find(k=>/studio.*id/i.test(k))||'studio_id';
  args[key]=studioId;
}
function enumValue(def={},patterns=[]){
  const values=Array.isArray(def.enum)?def.enum:[];
  for(const p of patterns){
    const hit=values.find(v=>clean(v).toLowerCase()===p);
    if(hit!==undefined)return hit;
  }
  for(const p of patterns){
    const hit=values.find(v=>clean(v).toLowerCase().includes(p));
    if(hit!==undefined)return hit;
  }
  return values[0];
}
function fillRequired(args,schema={}){
  const props=schemaProps(schema);
  for(const key of schemaRequired(schema)){
    if(args[key]!==undefined)continue;
    const def=props[key]||{};
    if(Array.isArray(def.enum)&&def.enum.length){args[key]=def.enum[0];continue;}
    if(def.type==='boolean'){args[key]=false;continue;}
    if(def.type==='integer'||def.type==='number'){args[key]=0;continue;}
    if(def.type==='array'){args[key]=[];continue;}
    if(def.type==='object'){args[key]={};continue;}
    args[key]='';
  }
  return args;
}
function startStopArgs(schema,studioId,start){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  for(const [key,def] of Object.entries(props)){
    if(/studio.*id/i.test(key))continue;
    if(Array.isArray(def.enum)){
      const selected=enumValue(def,start?['start','play','on']:['stop','end','off']);
      if(selected!==undefined){args[key]=selected;break;}
    }
    if(/action|mode|state|operation/i.test(key)&&def.type==='string'){args[key]=start?'start':'stop';break;}
    if(/start|play/i.test(key)&&def.type==='boolean'){args[key]=start;break;}
    if(/stop|end/i.test(key)&&def.type==='boolean'){args[key]=!start;break;}
  }
  return fillRequired(args,schema);
}
function keyboardItem(schema,key,durationMs=120){
  const props=schemaProps(schema),item={};
  for(const [name,def] of Object.entries(props)){
    if(/key.?code|^key$|keyboard.?key/i.test(name)){item[name]=key;continue;}
    if(/action|type|event|operation/i.test(name)){
      if(Array.isArray(def.enum)){
        item[name]=enumValue(def,['key_press','keypress','press','tap','key_down']);
      }else if(def.type==='string')item[name]='press';
      continue;
    }
    if(/duration.*ms|milliseconds|delay.*ms|wait.*ms/i.test(name))item[name]=Math.max(50,Number(durationMs)||120);
    else if(/duration|delay|wait/i.test(name)&&['number','integer'].includes(def.type))item[name]=Math.max(0.05,(Number(durationMs)||120)/1000);
  }
  return fillRequired(item,schema);
}
function keyboardArgs(schema,studioId,key,durationMs=120){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const actionsKey=Object.keys(props).find(k=>/actions|events|inputs/i.test(k)&&props[k]?.type==='array');
  if(actionsKey){
    const itemSchema=props[actionsKey]?.items||{};
    args[actionsKey]=[keyboardItem(itemSchema,key,durationMs)];
  }else{
    const built=keyboardItem(schema,key,durationMs);
    for(const [k,v] of Object.entries(built))if(!/studio.*id/i.test(k))args[k]=v;
  }
  return fillRequired(args,schema);
}
function characterNavigationArgs(schema,studioId,target={}){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const x=Number(target?.x||0),y=Number(target?.y||0),z=Number(target?.z||0);
  for(const [key,def] of Object.entries(props)){
    if(/studio.*id/i.test(key))continue;
    if(/^(x|world.?x|target.?x|destination.?x)$/i.test(key)){args[key]=x;continue;}
    if(/^(y|world.?y|target.?y|destination.?y)$/i.test(key)){args[key]=y;continue;}
    if(/^(z|world.?z|target.?z|destination.?z)$/i.test(key)){args[key]=z;continue;}
    if(/position|destination|target|goal|point/i.test(key)&&def.type==='object'){
      args[key]={x,y,z};continue;
    }
    if(/action|mode|operation/i.test(key)){
      if(Array.isArray(def.enum))args[key]=enumValue(def,['navigate','move_to','moveto','walk','goto','go_to']);
      else if(def.type==='string')args[key]='navigate';
      continue;
    }
    if(/speed/i.test(key)&&['number','integer'].includes(def.type))args[key]=16;
    if(/timeout/i.test(key)&&['number','integer'].includes(def.type))args[key]=8;
  }
  return fillRequired(args,schema);
}
function promptKeyboardKey(value=''){
  const raw=clean(value).split('.').at(-1)||'E';
  return /^[A-Za-z0-9]+$/.test(raw)?raw:'E';
}


function datamodelEnumValue(def={},desired='Client'){
  const wanted=clean(desired).toLowerCase();
  const values=Array.isArray(def.enum)?def.enum:[];
  const exact=values.find(v=>clean(v).toLowerCase()===wanted);
  if(exact!==undefined)return exact;
  const partial=values.find(v=>clean(v).toLowerCase().includes(wanted));
  return partial!==undefined?partial:desired;
}
function executeLuauArgs(schema,studioId,code,datamodelType='Client'){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const codeKey=Object.keys(props).find(k=>/^(code|source|script|luau)$/i.test(k))||Object.keys(props).find(k=>/code|source|script|luau/i.test(k))||'code';
  args[codeKey]=code;
  const contextKey=Object.keys(props).find(k=>/data.?model|datamodel|execution.?context|run.?context/i.test(k));
  if(contextKey){
    const def=props[contextKey]||{};
    args[contextKey]=Array.isArray(def.enum)?datamodelEnumValue(def,datamodelType):datamodelType;
  }
  return fillRequired(args,schema);
}
function mouseClickItem(schema,x,y){
  const props=schemaProps(schema),item={};
  for(const [name,def] of Object.entries(props)){
    if(/^(x|screen.?x|position.?x)$/i.test(name)){item[name]=Math.round(Number(x)||0);continue;}
    if(/^(y|screen.?y|position.?y)$/i.test(name)){item[name]=Math.round(Number(y)||0);continue;}
    if(/position|coordinates|screen.?point/i.test(name)&&def.type==='object'){item[name]={x:Math.round(Number(x)||0),y:Math.round(Number(y)||0)};continue;}
    if(/action|type|event|operation/i.test(name)){if(Array.isArray(def.enum))item[name]=enumValue(def,['click','mouse_click','press','tap']);else if(def.type==='string')item[name]='click';continue;}
    if(/button/i.test(name)){if(Array.isArray(def.enum))item[name]=enumValue(def,['left','primary','mousebutton1']);else if(def.type==='string')item[name]='left';continue;}
  }
  return fillRequired(item,schema);
}
function mouseClickArgs(schema,studioId,x,y){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const actionsKey=Object.keys(props).find(k=>/actions|events|inputs/i.test(k)&&props[k]?.type==='array');
  if(actionsKey)args[actionsKey]=[mouseClickItem(props[actionsKey]?.items||{},x,y)];
  else{const built=mouseClickItem(schema,x,y);for(const [k,v] of Object.entries(built))if(!/studio.*id/i.test(k))args[k]=v;}
  return fillRequired(args,schema);
}
function pngDimensions(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<24)return null;
  if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return null;
  return{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
}
function captureSanity(images=[],minimumWidth=320,minimumHeight=180,minimumBytes=2048){
  const rows=(images||[]).map(image=>{
    const bytes=Buffer.from(String(image?.data||''),'base64');
    const dims=pngDimensions(bytes);
    const width=Number(dims?.width||0),height=Number(dims?.height||0);
    return{bytes:bytes.length,width,height,pass:bytes.length>=minimumBytes&&(!dims||(width>=minimumWidth&&height>=minimumHeight))};
  });
  return{pass:rows.length>0&&rows.every(row=>row.pass),frames:rows};
}
function studioActualPlayCoreProbeSource(contract={},context='Client'){
  const exp=contract?.expectations||{};
  const guiNames=[...new Set([clean(exp.screenGuiName),...(Array.isArray(exp.requiredGuiObjects)?exp.requiredGuiObjects.map(clean):[])].filter(Boolean))];
  const buttonTexts=[...new Set([clean(contract?.selectionButtonText),clean(contract?.primaryActionButtonText)].filter(Boolean))];
  const luaStrings=values=>'{'+values.map(v=>JSON.stringify(v)).join(',')+'}';
  const lines=[
    'local HttpService=game:GetService("HttpService")',
    'local Players=game:GetService("Players")',
    'local Lighting=game:GetService("Lighting")',
    'local Workspace=game:GetService("Workspace")',
    'local requiredGuiNames='+luaStrings(guiNames),
    'local requiredButtonTexts='+luaStrings(buttonTexts),
    'local playerList=Players:GetPlayers()',
    'local p=Players.LocalPlayer or playerList[1]',
    'local camera=Workspace.CurrentCamera',
    'local viewport=camera and camera.ViewportSize or Vector2.new(0,0)',
    'local function attr(inst,name)',
    ' if not inst then return nil end',
    ' local ok,value=pcall(function() return inst:GetAttribute(name) end)',
    ' if ok then return value end',
    ' return nil',
    'end',
    'local function visible(inst)',
    ' if not inst then return false end',
    ' local cur=inst',
    ' while cur do',
    '  if cur:IsA("GuiObject") and cur.Visible==false then return false end',
    '  if cur:IsA("LayerCollector") and cur.Enabled==false then return false end',
    '  cur=cur.Parent',
    ' end',
    ' return true',
    'end',
    'local function guiInfo(inst)',
    ' if not inst or not inst:IsA("GuiObject") then return {present=inst~=nil,visible=false,offscreen=false} end',
    ' local pos=inst.AbsolutePosition',
    ' local size=inst.AbsoluteSize',
    ' local off=false',
    ' if viewport.X>0 and viewport.Y>0 then off=(pos.X+size.X<0 or pos.Y+size.Y<0 or pos.X>viewport.X or pos.Y>viewport.Y) end',
    ' return {present=true,visible=visible(inst),offscreen=off,x=pos.X,y=pos.Y,width=size.X,height=size.Y}',
    'end',
    'local gui={screenGuiPresent=false,visibleButtons=0,visibleObjects=0,visibleTextCount=0,visibleTexts={},required={},buttons={},interactive={},offscreenButtons=0,undersizedTouchButtons=0,suboptimalTouchButtons=0,textOverflowButtons=0,overlapPairs=0,largeOverlayCount=0,largeBlockingOverlayCount=0,largestOverlayCoverage=0}',
    'local pg=p and p:FindFirstChildOfClass("PlayerGui")',
    'if pg then',
    ' for _,d in ipairs(pg:GetDescendants()) do',
    '  if d:IsA("GuiObject") and visible(d) then',
    '   gui.visibleObjects=gui.visibleObjects+1',
    '   if viewport.X>0 and viewport.Y>0 then',
    '    local pos=d.AbsolutePosition;local size=d.AbsoluteSize',
    '    local x1=math.max(0,pos.X);local y1=math.max(0,pos.Y);local x2=math.min(viewport.X,pos.X+size.X);local y2=math.min(viewport.Y,pos.Y+size.Y)',
    '    local coverage=math.max(0,x2-x1)*math.max(0,y2-y1)/math.max(1,viewport.X*viewport.Y)',
    '    local opaque=d.BackgroundTransparency<0.85',
    '    if d:IsA("ImageLabel") or d:IsA("ImageButton") then opaque=opaque or d.ImageTransparency<0.85 end',
    '    if coverage>=0.55 and opaque then',
    '     gui.largeOverlayCount=gui.largeOverlayCount+1;gui.largestOverlayCoverage=math.max(gui.largestOverlayCoverage,coverage)',
    '     local actionable=d:IsA("GuiButton") and d.Active~=false',
    '     if not actionable then for _,child in ipairs(d:GetDescendants()) do if child:IsA("GuiButton") and child.Active~=false and visible(child) then actionable=true;break end end end',
    '     if not actionable then gui.largeBlockingOverlayCount=gui.largeBlockingOverlayCount+1 end',
    '    end',
    '   end',
    '  end',
    '  if (d:IsA("TextLabel") or d:IsA("TextButton")) and visible(d) and tostring(d.Text)~="" then',
    '   gui.visibleTextCount=gui.visibleTextCount+1',
    '   if #gui.visibleTexts<80 then table.insert(gui.visibleTexts,{name=d.Name,text=tostring(d.Text)}) end',
    '  end',
    '  if (d:IsA("TextButton") or d:IsA("ImageButton")) and visible(d) then',
    '   gui.visibleButtons=gui.visibleButtons+1',
    '   local row=guiInfo(d)',
    '   row.name=d.Name',
    '   row.path=string.sub(d:GetFullName(),#pg:GetFullName()+2)',
    '   row.className=d.ClassName',
    '   row.centerX=row.x+row.width/2',
    '   row.centerY=row.y+row.height/2',
    '   row.text=d:IsA("TextButton") and tostring(d.Text) or ""',
    '   row.active=d.Active~=false',
    '   if row.offscreen then gui.offscreenButtons=gui.offscreenButtons+1 end',
    '   local shortSide=math.min(row.width,row.height)',
    '   if shortSide<36 then gui.undersizedTouchButtons=gui.undersizedTouchButtons+1 elseif shortSide<44 then gui.suboptimalTouchButtons=gui.suboptimalTouchButtons+1 end',
    '   if d:IsA("TextButton") and not d.TextScaled and d.TextBounds.X>row.width+3 then gui.textOverflowButtons=gui.textOverflowButtons+1 end',
    '   if #gui.interactive<80 then table.insert(gui.interactive,row) end',
    '   for _,target in ipairs(requiredButtonTexts) do if d:IsA("TextButton") and tostring(d.Text)==target then gui.buttons[target]=row end end',
    '  end',
    ' end',
    ' for i=1,#gui.interactive do',
    '  local a=gui.interactive[i]',
    '  for j=i+1,#gui.interactive do',
    '   local b=gui.interactive[j]',
    '   local ox=math.max(0,math.min(a.x+a.width,b.x+b.width)-math.max(a.x,b.x))',
    '   local oy=math.max(0,math.min(a.y+a.height,b.y+b.height)-math.max(a.y,b.y))',
    '   if ox*oy>math.min(a.width*a.height,b.width*b.height)*0.35 then gui.overlapPairs=gui.overlapPairs+1 end',
    '  end',
    ' end',
    ' for _,name in ipairs(requiredGuiNames) do',
    '  local found=pg:FindFirstChild(name,true)',
    '  if found and found:IsA("ScreenGui") then gui.required[name]={present=true,visible=found.Enabled==true,offscreen=false} else gui.required[name]=guiInfo(found) end',
    ' end',
    'end',
    'local screenGuiName='+JSON.stringify(clean(exp.screenGuiName)),
    'if pg and screenGuiName~="" then local sg=pg:FindFirstChild(screenGuiName,true);gui.screenGuiPresent=sg~=nil and (not sg:IsA("ScreenGui") or sg.Enabled==true) end',
    'local root=nil',
    'local hum=nil',
    'local animator=nil',
    'local animationTrackCount=0',
    'local motorCount=0',
    'if p and p.Character then',
    ' root=p.Character:FindFirstChild("HumanoidRootPart")',
    ' hum=p.Character:FindFirstChildOfClass("Humanoid")',
    ' if hum then animator=hum:FindFirstChildOfClass("Animator") end',
    ' if animator then local ok,tracks=pcall(function() return animator:GetPlayingAnimationTracks() end);if ok then animationTrackCount=#tracks end end',
    ' for _,d in ipairs(p.Character:GetDescendants()) do if d:IsA("Motor6D") then motorCount=motorCount+1 end end',
    'end',
    'local floorBelow=false',
    'local cameraOccluded=false',
    'local cameraDistance=0',
    'if root then',
    ' local params=RaycastParams.new()',
    ' params.FilterType=Enum.RaycastFilterType.Exclude',
    ' params.FilterDescendantsInstances=p and p.Character and {p.Character} or {}',
    ' local hit=Workspace:Raycast(root.Position+Vector3.new(0,4,0),Vector3.new(0,-128,0),params)',
    ' floorBelow=hit~=nil',
    ' if camera then',
    '  cameraDistance=(camera.CFrame.Position-root.Position).Magnitude',
    '  local direction=root.Position-camera.CFrame.Position',
    '  local camHit=Workspace:Raycast(camera.CFrame.Position,direction,params)',
    '  cameraOccluded=camHit~=nil and camHit.Instance~=nil and not camHit.Instance:IsDescendantOf(p.Character)',
    ' end',
    'end',
    'local payload={',
    ' context='+JSON.stringify(context)+',',
    ' player={present=p~=nil,characterPresent=p~=nil and p.Character~=nil,humanoidPresent=hum~=nil,rootPresent=root~=nil,rootX=root and root.Position.X or nil,rootY=root and root.Position.Y or nil,rootZ=root and root.Position.Z or nil,velocityX=root and root.AssemblyLinearVelocity.X or nil,velocityY=root and root.AssemblyLinearVelocity.Y or nil,velocityZ=root and root.AssemblyLinearVelocity.Z or nil,health=hum and hum.Health or nil,maxHealth=hum and hum.MaxHealth or nil,floorMaterial=hum and tostring(hum.FloorMaterial) or nil,humanoidState=hum and tostring(hum:GetState()) or nil,animatorPresent=animator~=nil,animationTrackCount=animationTrackCount,motorCount=motorCount,roundState=attr(p,"RoundState"),role=attr(p,"Role"),monsterPreference=attr(p,"MonsterPreference"),soloRole=attr(p,"SoloRole"),feedbackEvent=attr(p,"FeedbackEvent"),currentMap=attr(p,"CurrentMap"),currentMapEvent=attr(p,"CurrentMapEvent"),humanCount=attr(p,"HumanCount"),monsterCount=attr(p,"MonsterCount"),objectivesDone=attr(p,"ObjectivesDone"),objectivesTotal=attr(p,"ObjectivesTotal")},',
    ' camera={present=camera~=nil,viewportX=viewport.X,viewportY=viewport.Y,fieldOfView=camera and camera.FieldOfView or nil,subjectPresent=camera and camera.CameraSubject~=nil or false,distance=cameraDistance,occluded=cameraOccluded},',
    ' ui=gui,',
    ' workspace={MapReady=attr(Workspace,"MapReady"),ActivePopulation=attr(Workspace,"ActivePopulation"),AIBotCount=attr(Workspace,"AIBotCount"),HumanCount=attr(Workspace,"HumanCount"),MonsterCount=attr(Workspace,"MonsterCount"),CurrentMapId=attr(Workspace,"CurrentMapId"),CurrentMapName=attr(Workspace,"CurrentMapName"),CurrentMapEvent=attr(Workspace,"CurrentMapEvent"),WorldArtPass=attr(Workspace,"WorldArtPass"),CharacterArtDirection=attr(Workspace,"CharacterArtDirection"),DesignCodeSync=attr(Workspace,"DesignCodeSync")},',
    ' lighting={brightness=Lighting.Brightness,clockTime=Lighting.ClockTime,ambientR=Lighting.Ambient.R,ambientG=Lighting.Ambient.G,ambientB=Lighting.Ambient.B}',
    '}',
    'return "ROBLOX_STUDIO_ACTUAL_PLAY_CORE="..HttpService:JSONEncode(payload)'
  ];
  return lines.join('\n');
}
function studioActualPlayWorldProbeSource(){
  return [
    'local HttpService=game:GetService("HttpService")',
    'local Players=game:GetService("Players")',
    'local Workspace=game:GetService("Workspace")',
    'local PathfindingService=game:GetService("PathfindingService")',
    'local p=Players.LocalPlayer or Players:GetPlayers()[1]',
    'local root=p and p.Character and p.Character:FindFirstChild("HumanoidRootPart")',
    'local prompts=0',
    'local clickDetectors=0',
    'local collidableParts=0',
    'local spawnLocations=0',
    'local spawnRows={}',
    'local promptRows={}',
    'local mobRows={}',
    'local npcRows={}',
    'local companionRows={}',
    'local itemRows={}',
    'local effectCount=0',
    'local environmentModels=0',
    'local arena=Workspace:FindFirstChild("MidnightArena")',
    'local parts=0',
    'if arena then for _,d in ipairs(arena:GetDescendants()) do if d:IsA("BasePart") then parts=parts+1 end end end',
    'local minX,minY,minZ=math.huge,math.huge,math.huge',
    'local maxX,maxY,maxZ=-math.huge,-math.huge,-math.huge',
    'for _,d in ipairs(Workspace:GetDescendants()) do',
    ' if d:IsA("BasePart") then',
    '  if d.CanCollide then',
    '   collidableParts=collidableParts+1',
    '   local p0=d.Position',
    '   local h=d.Size*0.5',
    '   minX=math.min(minX,p0.X-h.X);minY=math.min(minY,p0.Y-h.Y);minZ=math.min(minZ,p0.Z-h.Z)',
    '   maxX=math.max(maxX,p0.X+h.X);maxY=math.max(maxY,p0.Y+h.Y);maxZ=math.max(maxZ,p0.Z+h.Z)',
    '  end',
    '  if d:IsA("SpawnLocation") then spawnLocations=spawnLocations+1;if #spawnRows<24 then table.insert(spawnRows,{name=d.Name,x=d.Position.X,y=d.Position.Y,z=d.Position.Z}) end end',
    '  local hp=d:GetAttribute("HP")',
    '  local maxHp=d:GetAttribute("MaxHP")',
    '  local lname=string.lower(d.Name)',
    '  if #mobRows<80 and ((typeof(hp)=="number" and typeof(maxHp)=="number") or string.find(lname,"enemy") or string.find(lname,"monster") or string.find(lname,"mob") or string.find(lname,"zombie") or string.find(lname,"boss") or string.find(lname,"raider")) then',
    '   table.insert(mobRows,{name=d.Name,x=d.Position.X,y=d.Position.Y,z=d.Position.Z,hp=hp,maxHp=maxHp,target=tostring(d:GetAttribute("Target") or ""),state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or ""),dormant=d:GetAttribute("Dormant")})',
    '  end',
    ' elseif d:IsA("ProximityPrompt") then',
    '  prompts=prompts+1',
    '  local parent=d.Parent',
    '  local pos=parent and parent:IsA("BasePart") and parent.Position or Vector3.new()',
    '  if #promptRows<60 then table.insert(promptRows,{name=d.Name,path=d:GetFullName(),actionText=tostring(d.ActionText),objectText=tostring(d.ObjectText),x=pos.X,y=pos.Y,z=pos.Z,maxDistance=d.MaxActivationDistance,key=tostring(d.KeyboardKeyCode),holdDuration=d.HoldDuration,enabled=d.Enabled}) end',
    ' elseif d:IsA("ClickDetector") then',
    '  clickDetectors=clickDetectors+1',
    ' elseif d:IsA("ParticleEmitter") or d:IsA("Trail") or d:IsA("Beam") or d:IsA("Highlight") then',
    '  effectCount=effectCount+1',
    ' elseif d:IsA("Model") then',
    '  local lname=string.lower(d.Name)',
    '  local dh=d:FindFirstChildOfClass("Humanoid")',
    '  local isPlayer=Players:GetPlayerFromCharacter(d)~=nil',
    '  local companion=dh and not isPlayer and (string.find(lname,"companion") or string.find(lname,"follower") or string.find(lname,"pet") or string.find(lname,"summon") or d:GetAttribute("Companion")==true or d:GetAttribute("IsCompanion")==true)',
    '  local npc=dh and not isPlayer and not companion and (string.find(lname,"npc") or string.find(lname,"merchant") or string.find(lname,"chief") or string.find(lname,"healer") or string.find(lname,"resident") or string.find(lname,"worker") or string.find(lname,"villager") or string.find(lname,"master") or string.find(lname,"trainer") or d:GetAttribute("NPC")==true or d:GetAttribute("IsNPC")==true)',
    '  local mob=dh and not isPlayer and not companion and not npc and (string.find(lname,"enemy") or string.find(lname,"monster") or string.find(lname,"mob") or string.find(lname,"zombie") or string.find(lname,"boss") or string.find(lname,"raider") or d:GetAttribute("Enemy")==true or d:GetAttribute("IsEnemy")==true or d:GetAttribute("EnemyType")~=nil or d:GetAttribute("MobType")~=nil)',
    '  local okPivot,pivot=pcall(function() return d:GetPivot() end)',
    '  local pos=okPivot and pivot.Position or Vector3.new()',
    '  local animator=dh and dh:FindFirstChildOfClass("Animator")',
    '  local trackCount=0',
    '  if animator then local ok,tracks=pcall(function() return animator:GetPlayingAnimationTracks() end);if ok then trackCount=#tracks end end',
    '  local motors=0',
    '  for _,joint in ipairs(d:GetDescendants()) do if joint:IsA("Motor6D") then motors=motors+1 end end',
    '  if mob and #mobRows<80 then table.insert(mobRows,{name=d.Name,kind="HumanoidModel",x=pos.X,y=pos.Y,z=pos.Z,hp=dh.Health,maxHp=dh.MaxHealth,target=tostring(d:GetAttribute("Target") or d:GetAttribute("TargetUserId") or ""),state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or ""),aggro=tostring(d:GetAttribute("Aggro") or d:GetAttribute("AggroState") or ""),animatorPresent=animator~=nil,animationTrackCount=trackCount,motorCount=motors,dormant=d:GetAttribute("Dormant")}) end',
    '  if companion and #companionRows<50 then table.insert(companionRows,{name=d.Name,x=pos.X,y=pos.Y,z=pos.Z,health=dh.Health,maxHealth=dh.MaxHealth,state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or ""),target=tostring(d:GetAttribute("Target") or ""),owner=tostring(d:GetAttribute("OwnerUserId") or ""),animatorPresent=animator~=nil,animationTrackCount=trackCount,motorCount=motors}) end',
    '  if npc and #npcRows<60 then table.insert(npcRows,{name=d.Name,x=pos.X,y=pos.Y,z=pos.Z,health=dh.Health,maxHealth=dh.MaxHealth,hasPrompt=d:FindFirstChildWhichIsA("ProximityPrompt",true)~=nil,animatorPresent=animator~=nil,animationTrackCount=trackCount,motorCount=motors,state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or "")}) end',
    '  if string.find(lname,"environment") or string.find(lname,"decor") or string.find(lname,"building") or string.find(lname,"house") or string.find(lname,"terrain") or string.find(lname,"village") then environmentModels=environmentModels+1 end',
    ' elseif d:IsA("Tool") or d:IsA("Accessory") then',
    '  if #itemRows<60 then table.insert(itemRows,{name=d.Name,className=d.ClassName,parent=d.Parent and d.Parent.Name or ""}) end',
    ' end',
    'end',
    'local boundsFinite=minX<math.huge and maxX>-math.huge and minY<math.huge and maxY>-math.huge and minZ<math.huge and maxZ>-math.huge',
    'local minSpawnThreatDistance=math.huge',
    'for _,spawnRow in ipairs(spawnRows) do for _,mobRow in ipairs(mobRows) do local dist=math.sqrt((spawnRow.x-mobRow.x)^2+(spawnRow.y-mobRow.y)^2+(spawnRow.z-mobRow.z)^2);minSpawnThreatDistance=math.min(minSpawnThreatDistance,dist) end end',
    'if minSpawnThreatDistance==math.huge then minSpawnThreatDistance=-1 end',
    'local floorSampleCount=0',
    'local floorHitCount=0',
    'if boundsFinite then',
    ' local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances=p and p.Character and {p.Character} or {}',
    ' local cx=(minX+maxX)/2;local cz=(minZ+maxZ)/2;local sx=math.max(8,(maxX-minX)*0.35);local sz=math.max(8,(maxZ-minZ)*0.35);local topY=maxY+32',
    ' local offsets={Vector2.new(0,0),Vector2.new(-sx,0),Vector2.new(sx,0),Vector2.new(0,-sz),Vector2.new(0,sz),Vector2.new(-sx,-sz),Vector2.new(sx,-sz),Vector2.new(-sx,sz),Vector2.new(sx,sz)}',
    ' for _,o in ipairs(offsets) do floorSampleCount=floorSampleCount+1;local hit=Workspace:Raycast(Vector3.new(cx+o.X,topY,cz+o.Y),Vector3.new(0,-math.max(256,(maxY-minY)+96),0),params);if hit then floorHitCount=floorHitCount+1 end end',
    'end',
    'local routeSampleCount=0',
    'local routeSuccessCount=0',
    'local routeRows={}',
    'if root then',
    ' local anchors={}',
    ' local function addAnchor(kind,name,x,y,z) if #anchors<16 and tonumber(x) and tonumber(y) and tonumber(z) then table.insert(anchors,{kind=kind,name=tostring(name or kind),x=tonumber(x),y=tonumber(y),z=tonumber(z)}) end end',
    ' for _,row in ipairs(spawnRows) do addAnchor("spawn",row.name,row.x,row.y,row.z) end',
    ' for _,row in ipairs(promptRows) do addAnchor("prompt",row.objectText~="" and row.objectText or row.name,row.x,row.y,row.z) end',
    ' for _,row in ipairs(npcRows) do addAnchor("npc",row.name,row.x,row.y,row.z) end',
    ' for _,row in ipairs(mobRows) do addAnchor("mob",row.name,row.x,row.y,row.z) end',
    ' for _,row in ipairs(anchors) do',
    '  routeSampleCount=routeSampleCount+1',
    '  local ok,pathObj=pcall(function() local path=PathfindingService:CreatePath({AgentRadius=2,AgentHeight=5,AgentCanJump=true});path:ComputeAsync(root.Position,Vector3.new(row.x,row.y,row.z));return path end)',
    '  local pass=ok and pathObj and pathObj.Status==Enum.PathStatus.Success',
    '  if pass then routeSuccessCount=routeSuccessCount+1 end',
    '  if #routeRows<16 then local points={};local total=0;if pass then local waypoints=pathObj:GetWaypoints();total=#waypoints;for i=2,math.min(#waypoints,17) do local v=waypoints[i].Position;table.insert(points,{x=v.X,y=v.Y,z=v.Z}) end end;table.insert(routeRows,{kind=row.kind,name=row.name,pass=pass,x=row.x,y=row.y,z=row.z,waypointCount=math.max(0,total-1),waypoints=points}) end',
    ' end',
    'end',
    'local floorBelow=false',
    'if root then local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances=p and p.Character and {p.Character} or {};floorBelow=Workspace:Raycast(root.Position+Vector3.new(0,4,0),Vector3.new(0,-128,0),params)~=nil end',
    'local payload={world={arenaPresent=arena~=nil,arenaPartCount=parts,proximityPromptCount=prompts,clickDetectorCount=clickDetectors,collidablePartCount=collidableParts,spawnLocationCount=spawnLocations,spawns=spawnRows,minSpawnThreatDistance=minSpawnThreatDistance,boundsFinite=boundsFinite,minX=boundsFinite and minX or nil,minY=boundsFinite and minY or nil,minZ=boundsFinite and minZ or nil,maxX=boundsFinite and maxX or nil,maxY=boundsFinite and maxY or nil,maxZ=boundsFinite and maxZ or nil,floorBelowPlayer=floorBelow,floorSampleCount=floorSampleCount,floorHitCount=floorHitCount,routeSampleCount=routeSampleCount,routeSuccessCount=routeSuccessCount,routes=routeRows,prompts=promptRows,mobs=mobRows,npcs=npcRows,companions=companionRows,items=itemRows,environmentModels=environmentModels,effectCount=effectCount}}',
    'return "ROBLOX_STUDIO_ACTUAL_PLAY_WORLD="..HttpService:JSONEncode(payload)'
  ].join('\n');
}
function studioActualPlayRuntimeProbeSource(){
  return [
    'local HttpService=game:GetService("HttpService")',
    'local Players=game:GetService("Players")',
    'local Workspace=game:GetService("Workspace")',
    'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
    'local SoundService=game:GetService("SoundService")',
    'local Stats=game:GetService("Stats")',
    'local playerList=Players:GetPlayers()',
    'local p=Players.LocalPlayer or playerList[1]',
    'local pg=p and p:FindFirstChildOfClass("PlayerGui")',
    'local playerRows={}',
    'for _,plr in ipairs(playerList) do if #playerRows<12 then table.insert(playerRows,{userId=plr.UserId,name=plr.Name,roundState=tostring(plr:GetAttribute("RoundState") or ""),role=tostring(plr:GetAttribute("Role") or ""),team=plr.Team and plr.Team.Name or "",currentMap=tostring(plr:GetAttribute("CurrentMap") or ""),humanCount=plr:GetAttribute("HumanCount"),monsterCount=plr:GetAttribute("MonsterCount")}) end end',
    'local progressionRows={}',
    'local function collectProgress(inst,scope)',
    ' if not inst then return end',
    ' for name,value in pairs(inst:GetAttributes()) do',
    '  local lower=string.lower(name)',
    '  if string.find(lower,"level") or string.find(lower,"xp") or string.find(lower,"gold") or string.find(lower,"quest") or string.find(lower,"wave") or string.find(lower,"round") or string.find(lower,"stage") or string.find(lower,"zone") or string.find(lower,"portal") or string.find(lower,"base") or string.find(lower,"unlock") or string.find(lower,"progress") or string.find(lower,"mastery") or string.find(lower,"tier") or string.find(lower,"kill") or string.find(lower,"reward") then',
    '   if #progressionRows<80 then table.insert(progressionRows,{scope=scope,name=name,valueType=typeof(value),value=tostring(value)}) end',
    '  end',
    ' end',
    'end',
    'collectProgress(p,"player")',
    'collectProgress(Workspace,"workspace")',
    'local inventoryRows={}',
    'local inventoryCount=0',
    'if p then',
    ' local backpack=p:FindFirstChildOfClass("Backpack")',
    ' if backpack then for _,d in ipairs(backpack:GetChildren()) do if d:IsA("Tool") then inventoryCount=inventoryCount+1;if #inventoryRows<60 then table.insert(inventoryRows,{name=d.Name,className=d.ClassName,scope="Backpack"}) end end end end',
    ' if p.Character then for _,d in ipairs(p.Character:GetChildren()) do if d:IsA("Tool") then inventoryCount=inventoryCount+1;if #inventoryRows<60 then table.insert(inventoryRows,{name=d.Name,className=d.ClassName,scope="Character"}) end end end end',
    ' local leaderstats=p:FindFirstChild("leaderstats")',
    ' if leaderstats then for _,d in ipairs(leaderstats:GetChildren()) do if d:IsA("IntValue") or d:IsA("NumberValue") or d:IsA("StringValue") then if #progressionRows<80 then table.insert(progressionRows,{scope="leaderstats",name=d.Name,valueType=d.ClassName,value=tostring(d.Value)}) end end end end',
    'end',
    'local remoteRows={}',
    'local remoteCount=0',
    'for _,d in ipairs(ReplicatedStorage:GetDescendants()) do if d:IsA("RemoteEvent") or d:IsA("RemoteFunction") then remoteCount=remoteCount+1;if #remoteRows<80 then table.insert(remoteRows,{name=d.Name,className=d.ClassName}) end end end',
    'local soundCount=0',
    'local playingSoundCount=0',
    'for _,rootInst in ipairs({Workspace,SoundService}) do for _,d in ipairs(rootInst:GetDescendants()) do if d:IsA("Sound") then soundCount=soundCount+1;if d.IsPlaying then playingSoundCount=playingSoundCount+1 end end end end',
    'local category={quest=0,reward=0,economy=0,inventory=0,combat=0,progression=0,save=0,retry=0,npc=0,companion=0,item=0,environment=0,effects=0}',
    'local systemSignals=0',
    'for _,rootInst in ipairs({ReplicatedStorage,Workspace,pg}) do',
    ' if rootInst then',
    '  for _,d in ipairs(rootInst:GetDescendants()) do',
    '   local n=string.lower(d.Name)',
    '   local matched=false',
    '   if string.find(n,"quest") or string.find(n,"mission") or string.find(n,"objective") or string.find(n,"trial") then category.quest=category.quest+1;matched=true end',
    '   if string.find(n,"reward") or string.find(n,"gold") or string.find(n,"coin") or string.find(n,"xp") or string.find(n,"loot") or string.find(n,"drop") or string.find(n,"chest") then category.reward=category.reward+1;matched=true end',
    '   if string.find(n,"shop") or string.find(n,"merchant") or string.find(n,"price") or string.find(n,"cost") or string.find(n,"upgrade") or string.find(n,"purchase") or string.find(n,"sell") then category.economy=category.economy+1;matched=true end',
    '   if string.find(n,"inventory") or string.find(n,"equip") or string.find(n,"weapon") or string.find(n,"armor") or string.find(n,"relic") or string.find(n,"item") then category.inventory=category.inventory+1;matched=true end',
    '   if string.find(n,"attack") or string.find(n,"skill") or string.find(n,"combat") or string.find(n,"damage") or string.find(n,"enemy") or string.find(n,"monster") or string.find(n,"boss") or string.find(n,"mob") then category.combat=category.combat+1;matched=true end',
    '   if string.find(n,"level") or string.find(n,"wave") or string.find(n,"round") or string.find(n,"portal") or string.find(n,"progress") or string.find(n,"unlock") or string.find(n,"mastery") or string.find(n,"stage") then category.progression=category.progression+1;matched=true end',
    '   if string.find(n,"save") or string.find(n,"load") or string.find(n,"datastore") or string.find(n,"persist") then category.save=category.save+1;matched=true end',
    '   if string.find(n,"retry") or string.find(n,"restart") or string.find(n,"respawn") or string.find(n,"reset") or string.find(n,"newrun") then category.retry=category.retry+1;matched=true end',
    '   if string.find(n,"npc") or string.find(n,"merchant") or string.find(n,"chief") or string.find(n,"healer") or string.find(n,"resident") or string.find(n,"worker") or string.find(n,"villager") or string.find(n,"trainer") or string.find(n,"master") then category.npc=category.npc+1;matched=true end',
    '   if string.find(n,"companion") or string.find(n,"follower") or string.find(n,"pet") or string.find(n,"summon") then category.companion=category.companion+1;matched=true end',
    '   if string.find(n,"item") or string.find(n,"loot") or string.find(n,"drop") or string.find(n,"weapon") or string.find(n,"armor") or string.find(n,"relic") or string.find(n,"resource") or string.find(n,"material") then category.item=category.item+1;matched=true end',
    '   if string.find(n,"environment") or string.find(n,"decor") or string.find(n,"building") or string.find(n,"house") or string.find(n,"terrain") or string.find(n,"biome") then category.environment=category.environment+1;matched=true end',
    '   if d:IsA("ParticleEmitter") or d:IsA("Trail") or d:IsA("Beam") or d:IsA("Highlight") then category.effects=category.effects+1;matched=true end',
    '   if matched then systemSignals=systemSignals+1 end',
    '  end',
    ' end',
    'end',
    'local descendantCount=#Workspace:GetDescendants()',
    'local memoryMb=0',
    'pcall(function() memoryMb=Stats:GetTotalMemoryUsageMb() end)',
    'local payload={runtime={actualPlayerCount=#playerList,players=playerRows,remoteCount=remoteCount,remotes=remoteRows,progression=progressionRows,inventory=inventoryRows,inventoryCount=inventoryCount,systemSignals=systemSignals,categories=category,descendantCount=descendantCount,memoryMb=memoryMb,soundCount=soundCount,playingSoundCount=playingSoundCount}}',
    'return "ROBLOX_STUDIO_ACTUAL_PLAY_RUNTIME="..HttpService:JSONEncode(payload)'
  ].join('\n');
}
function parseStudioActualPlayProbe(result,marker='ROBLOX_STUDIO_ACTUAL_PLAY_PROBE='){
  for(const text of flattenText(result,[])){
    for(const line of String(text||'').split(/\r?\n/)){
      const at=line.indexOf(marker);if(at<0)continue;
      let candidate=clean(line.slice(at+marker.length));
      const first=candidate.indexOf('{'),last=candidate.lastIndexOf('}');
      if(first>=0&&last>=first)candidate=candidate.slice(first,last+1);
      try{return JSON.parse(candidate);}catch{}
    }
  }
  return null;
}
async function collectStudioActualPlayProbe(client,studioId,contract,context){
  const tool=client.tool('execute_luau');
  const segments=[
    {marker:'ROBLOX_STUDIO_ACTUAL_PLAY_CORE=',code:studioActualPlayCoreProbeSource(contract,context)},
    {marker:'ROBLOX_STUDIO_ACTUAL_PLAY_WORLD=',code:studioActualPlayWorldProbeSource()},
    {marker:'ROBLOX_STUDIO_ACTUAL_PLAY_RUNTIME=',code:studioActualPlayRuntimeProbeSource()}
  ];
  const merged={};
  for(const segment of segments){
    const result=await client.call('execute_luau',executeLuauArgs(tool.inputSchema||{},studioId,segment.code,context));
    const parsed=parseStudioActualPlayProbe(result,segment.marker);
    if(!parsed)throw new Error('ROBLOX_STUDIO_ACTUAL_PLAY_PROBE_PARSE_EMPTY:'+segment.marker);
    Object.assign(merged,parsed);
  }
  return merged;
}
function pointDistance(a={},b={}){
  const values=[a?.rootX,a?.rootY,a?.rootZ,b?.rootX,b?.rootY,b?.rootZ].map(Number);
  if(!values.every(Number.isFinite))return 0;
  return Math.hypot(values[3]-values[0],values[4]-values[1],values[5]-values[2]);
}
function entityRows(value){
  return Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
}
function entityMotionSummary(beforeRows=[],afterRows=[]){
  const before=entityRows(beforeRows),after=entityRows(afterRows);
  const byName=new Map();
  for(const row of before){
    const key=clean(row?.name);
    if(!key)continue;
    if(!byName.has(key))byName.set(key,[]);
    byName.get(key).push(row);
  }
  let matched=0,moved=0,stateChanged=0,healthChanged=0,targetChanged=0;
  for(const row of after){
    const key=clean(row?.name);
    const candidates=byName.get(key)||[];
    if(!key||!candidates.length)continue;
    const prior=candidates.shift();matched++;
    const values=[prior?.x,prior?.y,prior?.z,row?.x,row?.y,row?.z].map(Number);
    if(values.every(Number.isFinite)&&Math.hypot(values[3]-values[0],values[4]-values[1],values[5]-values[2])>=0.2)moved++;
    if(clean(prior?.state)!==clean(row?.state))stateChanged++;
    if(Number.isFinite(Number(prior?.hp))&&Number.isFinite(Number(row?.hp))&&Number(prior.hp)!==Number(row.hp))healthChanged++;
    if(clean(prior?.target)!==clean(row?.target))targetChanged++;
  }
  return{matched,moved,stateChanged,healthChanged,targetChanged,dynamic:moved+stateChanged+healthChanged+targetChanged>0};
}
function progressionChanged(beforeRows=[],afterRows=[]){
  const before=new Map(entityRows(beforeRows).map(row=>[clean(row?.scope)+'|'+clean(row?.name),clean(row?.value)]));
  for(const row of entityRows(afterRows)){
    const key=clean(row?.scope)+'|'+clean(row?.name);
    if(before.has(key)&&before.get(key)!==clean(row?.value))return true;
  }
  return false;
}
function inventoryChanged(beforeRows=[],afterRows=[]){
  const key=rows=>entityRows(rows).map(row=>clean(row?.scope)+'|'+clean(row?.name)+'|'+clean(row?.className)).sort().join('\n');
  return key(beforeRows)!==key(afterRows);
}
function probeEffectSummary(before={},after={}){
  const moved=pointDistance(before?.player||{},after?.player||{});
  const progress=progressionChanged(before?.runtime?.progression,after?.runtime?.progression);
  const inventory=inventoryChanged(before?.runtime?.inventory,after?.runtime?.inventory);
  const feedback=clean(before?.player?.feedbackEvent)!==clean(after?.player?.feedbackEvent);
  const healthBefore=Number(before?.player?.health),healthAfter=Number(after?.player?.health);
  const health=Number.isFinite(healthBefore)&&Number.isFinite(healthAfter)&&healthBefore!==healthAfter;
  const uiBefore=Number(before?.ui?.visibleObjects||0),uiAfter=Number(after?.ui?.visibleObjects||0);
  const ui=uiBefore!==uiAfter;
  const round=clean(before?.player?.roundState)!==clean(after?.player?.roundState);
  const map=clean(before?.player?.currentMap)!==clean(after?.player?.currentMap)
    ||clean(before?.workspace?.CurrentMapId)!==clean(after?.workspace?.CurrentMapId)
    ||clean(before?.workspace?.CurrentMapName)!==clean(after?.workspace?.CurrentMapName);
  return{moved,progress,inventory,feedback,health,ui,round,map,effectObserved:moved>=0.5||progress||inventory||feedback||health||ui||round||map};
}
function semanticEffectPass(semantic='',effect={}){
  const kind=clean(semantic).toUpperCase();
  if(kind==='QUEST')return effect.progress||effect.ui||effect.feedback||effect.round;
  if(kind==='REWARD'||kind==='COLLECT')return effect.inventory||effect.progress||effect.feedback||effect.ui;
  if(kind==='SHOP'||kind==='CRAFT'||kind==='EQUIP'||kind==='UPGRADE')return effect.inventory||effect.progress||effect.ui||effect.feedback;
  if(kind==='TRAVEL')return Number(effect.moved||0)>=3||effect.map||effect.round||effect.feedback;
  if(kind==='HEAL')return effect.health||effect.feedback||effect.ui;
  if(kind==='RETRY')return effect.round||effect.ui||effect.feedback||Number(effect.moved||0)>=1||effect.health;
  return effect.effectObserved===true;
}
function persistentStateSummary(probe={}){
  const stablePattern=/level|xp|gold|coin|currency|unlock|mastery|tier|rank|레벨|경험치|골드|코인|재화|해금|숙련|티어|랭크/i;
  const progression=entityRows(probe?.runtime?.progression)
    .filter(row=>stablePattern.test(clean(row?.name)))
    .map(row=>({scope:clean(row?.scope),name:clean(row?.name),value:clean(row?.value)}))
    .sort((a,b)=>(a.scope+'|'+a.name).localeCompare(b.scope+'|'+b.name));
  const inventory=entityRows(probe?.runtime?.inventory)
    .map(row=>({scope:clean(row?.scope),name:clean(row?.name),className:clean(row?.className)}))
    .sort((a,b)=>(a.scope+'|'+a.name+'|'+a.className).localeCompare(b.scope+'|'+b.name+'|'+b.className));
  return{
    progression,
    inventory,
    progressionFingerprint:stableSha256(progression),
    inventoryFingerprint:stableSha256(inventory),
    persistentSignalCount:progression.length
  };
}
export function evaluateStudioActualPlayContract({contract={},initialClientProbe=null,preActionClientProbe=null,postActionClientProbe=null,clientProbe=null,serverProbe=null,actions=[],beforeImages=[],afterImages=[],timelineProbes=[],auditProfile='FAST_DEEP',visualCaptureDeferred=false}={}){
  if(contract?.required!==true)return{required:false,scenarios:[],qualityFailureKinds:[],authoritativeStateChangeObserved:false,capture:{before:{pass:true,frames:[]},after:{pass:true,frames:[]}},metrics:{}};
  const exp=contract?.expectations||{};
  const requiredIds=new Set(Array.isArray(contract?.requiredScenarios)?contract.requiredScenarios.map(clean).filter(Boolean):[]);
  const client=clientProbe||{},server=serverProbe||{},player=client?.player||{},ui=client?.ui||{};
  const ws={...(client?.workspace||{}),...(server?.workspace||{})};
  const world={...(client?.world||{}),...(server?.world||{})};
  const before=captureSanity(beforeImages,Number(exp.minimumCaptureWidth||320),Number(exp.minimumCaptureHeight||180),Number(exp.minimumCaptureBytes||2048));
  const after=captureSanity(afterImages,Number(exp.minimumCaptureWidth||320),Number(exp.minimumCaptureHeight||180),Number(exp.minimumCaptureBytes||2048));
  const acceptedRoundStates=Array.isArray(exp.acceptedRoundStates)?exp.acceptedRoundStates.map(clean):[];
  const acceptedRoles=Array.isArray(exp.acceptedRoles)?exp.acceptedRoles.map(clean):[];
  const logicalPopulation=Number(exp.logicalPopulation||0);
  const humanCount=Number(ws.HumanCount??player.humanCount??0);
  const monsterCount=Number(ws.MonsterCount??player.monsterCount??0);
  const requiredGui=Array.isArray(exp.requiredGuiObjects)?exp.requiredGuiObjects.map(clean).filter(Boolean):[];
  const guiRows=requiredGui.map(name=>ui?.required?.[name]||{});
  const equals=exp.workspaceAttributeEquals&&typeof exp.workspaceAttributeEquals==='object'?exp.workspaceAttributeEquals:{};
  const prefixes=exp.workspaceAttributePrefixes&&typeof exp.workspaceAttributePrefixes==='object'?exp.workspaceAttributePrefixes:{};
  const designEquals=Object.entries(equals).every(([key,value])=>ws[key]===value);
  const designPrefixes=Object.entries(prefixes).every(([key,value])=>clean(ws[key]).startsWith(clean(value)));
  const actionOk=id=>(actions||[]).some(row=>row?.id===id&&row?.dispatched===true&&row?.ok===true);
  const selectionPlayer=preActionClientProbe?.player||player;
  const selectionIntent=clean(selectionPlayer?.monsterPreference||selectionPlayer?.soloRole);
  const actionPlayer=postActionClientProbe?.player||player;
  const displacement=pointDistance(preActionClientProbe?.player||{},actionPlayer);
  const velocity=Math.hypot(Number(actionPlayer.velocityX||0),Number(actionPlayer.velocityY||0),Number(actionPlayer.velocityZ||0));
  const preActionFeedback=clean(preActionClientProbe?.player?.feedbackEvent);
  const postActionFeedback=clean(actionPlayer?.feedbackEvent);
  const primaryActionFeedbackChanged=Boolean(actionOk('ui-primary-action')&&postActionFeedback&&postActionFeedback!==preActionFeedback);
  const lightingBrightness=Number(client?.lighting?.brightness??server?.lighting?.brightness??0);
  const adaptive=contract?.adaptiveCoverage&&typeof contract.adaptiveCoverage==='object'?contract.adaptiveCoverage:{};
  const declaredSignals=adaptive?.signals&&typeof adaptive.signals==='object'?adaptive.signals:{};
  const runtime={...(client?.runtime||{}),...(server?.runtime||{})};
  const categories=runtime?.categories&&typeof runtime.categories==='object'?runtime.categories:{};
  const observedWorld=client?.world||server?.world||{};
  const signals={
    ...declaredSignals,
    ui:declaredSignals.ui===true||Number(client?.ui?.visibleObjects||0)>0,
    onboarding:declaredSignals.onboarding===true,
    map:declaredSignals.map===true||Number(observedWorld?.collidablePartCount||0)>0,
    interactions:declaredSignals.interactions===true||Number(observedWorld?.proximityPromptCount||0)>0||Number(observedWorld?.clickDetectorCount||0)>0,
    progression:declaredSignals.progression===true||Number(categories.progression||0)>0||entityRows(runtime.progression).length>0,
    serverBoundary:declaredSignals.serverBoundary===true||Number(runtime.remoteCount||0)>0,
    combat:declaredSignals.combat===true||Number(categories.combat||0)>0||entityRows(observedWorld?.mobs).length>0,
    motion:declaredSignals.motion===true||Number(client?.player?.motorCount||0)>0,
    audio:declaredSignals.audio===true||Number(runtime.soundCount||0)>0,
    npc:declaredSignals.npc===true||Number(categories.npc||0)>0||entityRows(observedWorld?.npcs).length>0,
    companion:declaredSignals.companion===true||Number(categories.companion||0)>0||entityRows(observedWorld?.companions).length>0,
    items:declaredSignals.items===true||Number(categories.item||0)>0||Number(categories.inventory||0)>0||entityRows(observedWorld?.items).length>0||Number(runtime.inventoryCount||0)>0,
    environment:declaredSignals.environment===true||Number(observedWorld?.environmentModels||0)>0,
    effects:declaredSignals.effects===true||Number(observedWorld?.effectCount||0)>0,
    quests:declaredSignals.quests===true||Number(categories.quest||0)>0,
    rewards:declaredSignals.rewards===true||Number(categories.reward||0)>0,
    economy:declaredSignals.economy===true||Number(categories.economy||0)>0,
    save:declaredSignals.save===true||Number(categories.save||0)>0,
    retry:declaredSignals.retry===true||Number(categories.retry||0)>0,
    multiplayer:declaredSignals.multiplayer===true,
    camera:declaredSignals.camera===true||client?.camera?.present===true,
    performance:true
  };
  const initialWorld=initialClientProbe?.world||{};
  const mobMotion=entityMotionSummary(initialWorld?.mobs,world?.mobs);
  const companionMotion=entityMotionSummary(initialWorld?.companions,world?.companions);
  const npcMotion=entityMotionSummary(initialWorld?.npcs,world?.npcs);
  const progressChanged=progressionChanged(initialClientProbe?.runtime?.progression,runtime?.progression);
  const inventoryDelta=inventoryChanged(initialClientProbe?.runtime?.inventory,runtime?.inventory);
  const timeline=Array.isArray(timelineProbes)?timelineProbes.filter(Boolean):[];
  let timelineMobDynamic=false,timelineCompanionDynamic=false,timelineProgressChanged=false;
  let activeTimelineTransitions=0,idleTimelineTransitions=0;
  let deathObserved=false,respawnObserved=false,sawDead=false;
  let memoryMin=Number(initialClientProbe?.runtime?.memoryMb),memoryMax=memoryMin;
  let descendantsMin=Number(initialClientProbe?.runtime?.descendantCount),descendantsMax=descendantsMin;
  let previous=initialClientProbe;
  for(const probe of timeline){
    if(!previous){previous=probe;continue;}
    const mobDelta=entityMotionSummary(previous?.world?.mobs,probe?.world?.mobs).dynamic;
    const companionDelta=entityMotionSummary(previous?.world?.companions,probe?.world?.companions).dynamic;
    const progressDelta=progressionChanged(previous?.runtime?.progression,probe?.runtime?.progression);
    const genericDelta=probeEffectSummary(previous,probe).effectObserved;
    timelineMobDynamic=timelineMobDynamic||mobDelta;
    timelineCompanionDynamic=timelineCompanionDynamic||companionDelta;
    timelineProgressChanged=timelineProgressChanged||progressDelta;
    if(mobDelta||companionDelta||progressDelta||genericDelta)activeTimelineTransitions++;else idleTimelineTransitions++;
    const prevHealth=Number(previous?.player?.health),nextHealth=Number(probe?.player?.health);
    const nowDead=probe?.player?.characterPresent===false||(Number.isFinite(nextHealth)&&nextHealth<=0);
    if((Number.isFinite(prevHealth)&&prevHealth>0&&nowDead)||(!previous?.player?.characterPresent&&nowDead)){deathObserved=true;sawDead=true}
    if(sawDead&&probe?.player?.characterPresent===true&&Number.isFinite(nextHealth)&&nextHealth>0)respawnObserved=true;
    const mem=Number(probe?.runtime?.memoryMb);if(Number.isFinite(mem)){if(!Number.isFinite(memoryMin))memoryMin=mem;if(!Number.isFinite(memoryMax))memoryMax=mem;memoryMin=Math.min(memoryMin,mem);memoryMax=Math.max(memoryMax,mem)}
    const desc=Number(probe?.runtime?.descendantCount);if(Number.isFinite(desc)){if(!Number.isFinite(descendantsMin))descendantsMin=desc;if(!Number.isFinite(descendantsMax))descendantsMax=desc;descendantsMin=Math.min(descendantsMin,desc);descendantsMax=Math.max(descendantsMax,desc)}
    previous=probe;
  }
  const memoryGrowthMb=Number.isFinite(memoryMin)&&Number.isFinite(memoryMax)?Math.max(0,memoryMax-memoryMin):0;
  const descendantGrowth=Number.isFinite(descendantsMin)&&Number.isFinite(descendantsMax)?Math.max(0,descendantsMax-descendantsMin):0;
  const soak=clean(auditProfile).toUpperCase()==='F9_SOAK';
  const routeActions=(actions||[]).filter(row=>row?.type==='mcp-map-route-audit'&&row?.dispatched===true);
  const routePassCount=routeActions.filter(row=>row?.ok===true).length;
  const routeRequired=soak?Math.min(2,routeActions.length):Math.min(1,routeActions.length);
  const modelMobs=entityRows(world.mobs).filter(row=>clean(row?.kind)==='HumanoidModel');
  const animatedMobCount=modelMobs.filter(row=>row?.animatorPresent===true&&Number(row?.motorCount||0)>0).length;
  const spawnThreatDistance=Number(world.minSpawnThreatDistance??-1);
  const semanticActions=(actions||[]).filter(row=>['mcp-world-interaction','mcp-ui-exploration'].includes(row?.type)&&row?.dispatched===true&&row?.ok===true);
  const semanticEffects=semanticActions.filter(row=>row?.effectObserved===true).length;
  const questActions=semanticActions.filter(row=>row?.semantic==='QUEST');
  const rewardActions=semanticActions.filter(row=>['REWARD','COLLECT'].includes(row?.semantic));
  const systemActions=semanticActions.filter(row=>['SHOP','CRAFT','EQUIP','UPGRADE'].includes(row?.semantic));
  const travelActions=semanticActions.filter(row=>row?.semantic==='TRAVEL');
  const questEffects=questActions.filter(row=>row?.effectObserved===true).length;
  const rewardEffects=rewardActions.filter(row=>row?.effectObserved===true).length;
  const systemEffects=systemActions.filter(row=>row?.effectObserved===true).length;
  const travelEffects=travelActions.filter(row=>row?.effectObserved===true).length;
  const combatActions=(actions||[]).filter(row=>(row?.type==='mcp-combat-action'||row?.semantic==='COMBAT')&&row?.dispatched===true&&row?.ok===true);
  const combatEffects=combatActions.filter(row=>row?.effectObserved===true).length;
  const retryActions=semanticActions.filter(row=>row?.semantic==='RETRY');
  const retryEffects=retryActions.filter(row=>row?.effectObserved===true).length;
  const multiplayerSignals=Number(player.humanCount||0)+Number(player.monsterCount||0)+Number(ws.HumanCount||0)+Number(ws.MonsterCount||0);
  const currentActualPlayerCount=Number(runtime.actualPlayerCount||0);
  const timelinePlayerCounts=[Number(initialClientProbe?.runtime?.actualPlayerCount||0),...timeline.map(probe=>Number(probe?.runtime?.actualPlayerCount||0)),currentActualPlayerCount].filter(Number.isFinite);
  const maxActualPlayerCount=Math.max(0,...timelinePlayerCounts);
  let multiplayerStateTransition=false;
  let priorMultiplayer=initialClientProbe;
  for(const probe of timeline){
    if(priorMultiplayer){
      const beforePlayers=entityRows(priorMultiplayer?.runtime?.players);
      const afterPlayers=entityRows(probe?.runtime?.players);
      const beforeKey=beforePlayers.map(row=>[row.userId,row.roundState,row.role,row.team,row.currentMap,row.humanCount,row.monsterCount].join('|')).sort().join('\n');
      const afterKey=afterPlayers.map(row=>[row.userId,row.roundState,row.role,row.team,row.currentMap,row.humanCount,row.monsterCount].join('|')).sort().join('\n');
      if(beforeKey!==afterKey)multiplayerStateTransition=true;
    }
    priorMultiplayer=probe;
  }
  const multiplayerRuntimeSurface=Number(runtime.remoteCount||0)>0&&(multiplayerSignals>0||entityRows(runtime.progression).some(row=>/party|team|human|playercount|sync|join|멀티|파티|팀|동기화/i.test(clean(row?.name))));
  const multiplayerActualSessionPass=maxActualPlayerCount>=2&&multiplayerRuntimeSurface&&(multiplayerStateTransition||timelineProgressChanged||clean(initialClientProbe?.player?.roundState)!==clean(player.roundState));
  const activeLoopExpected=signals.combat||signals.quests||signals.rewards||signals.progression||signals.interactions;
  const activeLoopObserved=semanticEffects>0||timelineProgressChanged||timelineMobDynamic||timelineCompanionDynamic||primaryActionFeedbackChanged||progressChanged||inventoryDelta;
  const performanceTrendPass=!soak||(memoryGrowthMb<=300&&descendantGrowth<=6000);
  const visibleButtons=Number(ui.visibleButtons||0);
  const visibleTexts=entityRows(ui.visibleTexts).map(row=>clean(row?.text)).filter(Boolean);
  const initialHealth=Number(initialClientProbe?.player?.health);
  const finalHealth=Number(player.health);
  const initialDead=initialClientProbe?.player?.characterPresent===true&&((Number.isFinite(initialHealth)&&initialHealth<=0)||/Dead/i.test(clean(initialClientProbe?.player?.humanoidState)));
  const finalDead=player.characterPresent===true&&((Number.isFinite(finalHealth)&&finalHealth<=0)||/Dead/i.test(clean(player.humanoidState)));
  const startGateAction=(actions||[]).find(row=>row?.id==='ui-start-gate')||null;
  const initialStartLikeButton=startGateAction
    ?{text:clean(startGateAction.text)}
    :(entityRows(initialClientProbe?.ui?.interactive).find(row=>row?.visible!==false&&row?.active!==false&&/^(?:start|play|begin|continue|ready|시작|플레이|계속|준비)(?:\s|$)/i.test(clean(row?.text)))||null);
  const onboardingText=visibleTexts.join(' ').toLowerCase();
  const onboardingClarityPass=!signals.onboarding||(
    visibleButtons>0
    &&visibleTexts.length>0
    &&/start|play|begin|objective|goal|quest|guide|tutorial|loading|ready|시작|플레이|목표|퀘스트|가이드|튜토리얼|준비|로딩/.test(onboardingText)
  );
  const uiCommercialPass=
    Number(ui.offscreenButtons||0)===0
    &&Number(ui.undersizedTouchButtons||0)===0
    &&Number(ui.textOverflowButtons||0)===0
    &&Number(ui.overlapPairs||0)<=1
    &&visibleButtons>=0;
  const startGateEffectObserved=!initialStartLikeButton
    ||(
      startGateAction?.ok===true
      &&(
        activeLoopObserved
        ||displacement>=0.1
        ||clean(initialClientProbe?.player?.roundState)!==clean(player.roundState)
        ||initialClientProbe?.player?.characterPresent!==player.characterPresent
        ||Number(initialClientProbe?.ui?.largeOverlayCount||0)>Number(ui.largeOverlayCount||0)
      )
    );
  const startPlayabilityPass=!initialDead
    &&!finalDead
    &&player.characterPresent===true
    &&player.humanoidPresent===true
    &&player.rootPresent===true
    &&(!Number.isFinite(finalHealth)||finalHealth>0)
    &&startGateEffectObserved;
  const blockingOverlayPass=
    Number(ui.largeBlockingOverlayCount||0)===0
    &&Number(ui.largeOverlayCount||0)===0
    &&Number(ui.largestOverlayCoverage||0)<0.55;
  const floorSamples=Number(world.floorSampleCount||0),floorHits=Number(world.floorHitCount||0);
  const routeSamples=Number(world.routeSampleCount||0),routeSuccess=Number(world.routeSuccessCount||0);
  const floorCoveragePass=floorSamples===0||floorHits>=Math.max(1,Math.ceil(floorSamples*0.44));
  const routeCoveragePass=routeSamples===0||routeSuccess>=Math.max(1,Math.ceil(routeSamples*0.5));
  const spawnOverlapSafe=spawnThreatDistance<0||spawnThreatDistance>=2.5;
  const worldSafetyPass=
    world.boundsFinite===true
    &&Number(world.collidablePartCount||0)>0
    &&world.floorBelowPlayer===true
    &&floorCoveragePass
    &&routeCoveragePass
    &&spawnOverlapSafe;
  const interactionSurfaceCount=Number(world.proximityPromptCount||0)+Number(world.clickDetectorCount||0)+visibleButtons;
  const progressionSurfaceCount=entityRows(runtime.progression).length+Number(categories.progression||0);
  const mobRows=entityRows(world.mobs);
  const humanoidMobRows=mobRows.filter(row=>clean(row?.kind)==='HumanoidModel');
  const mobRigAnimationPass=humanoidMobRows.length===0||humanoidMobRows.every(row=>row?.animatorPresent===true&&Number(row?.motorCount||0)>0);
  const combatSurfaceCount=mobRows.length+Number(categories.combat||0);
  const npcSurfaceCount=entityRows(world.npcs).length+Number(categories.npc||0);
  const companionSurfaceCount=entityRows(world.companions).length+Number(categories.companion||0);
  const itemSurfaceCount=entityRows(world.items).length+Number(categories.item||0)+Number(categories.inventory||0);
  const rows=[
    {id:'character-camera-ready',pass:player.characterPresent===true&&player.humanoidPresent===true&&player.rootPresent===true&&client?.camera?.present===true},
    {id:'adaptive-start-playability',pass:startPlayabilityPass},
    {id:'role-selection-interaction',pass:!clean(contract.selectionButtonText)||(actionOk('ui-role-selection')&&(selectionIntent==='SURVIVOR'||acceptedRoles.includes(clean(selectionPlayer.role))))},
    {id:'round-running',pass:acceptedRoundStates.length===0||acceptedRoundStates.includes(clean(selectionPlayer.roundState||player.roundState))},
    {id:'logical-population-eight',pass:logicalPopulation<=0||(humanCount+monsterCount===logicalPopulation&&humanCount>=Number(exp.minimumHumans||0)&&monsterCount>=Number(exp.minimumMonsters||0))},
    {id:'hud-visible',pass:!clean(exp.screenGuiName)||ui.screenGuiPresent===true},
    {id:'action-ui-visible',pass:Number(ui.visibleButtons||0)>=Number(exp.minimumVisibleButtons||0)&&guiRows.every(row=>row.present===true&&row.visible===true&&!row.offscreen)},
    {id:'map-ready',pass:ws.MapReady===true},
    {id:'design-runtime-binding',pass:designEquals&&designPrefixes},
    {id:'interaction-surface-present',pass:Number(world.proximityPromptCount||0)>=Number(exp.minimumPromptCount||0)},
    {id:'world-geometry-present',pass:world.arenaPresent===true&&Number(world.arenaPartCount||0)>=Number(exp.minimumArenaParts||0)},
    {id:'primary-action-input',pass:!clean(contract.primaryActionButtonText)||actionOk('ui-primary-action')},
    {id:'primary-action-effect',pass:!clean(contract.primaryActionButtonText)||primaryActionFeedbackChanged||displacement>=Number(exp.minimumPrimaryActionDisplacement||0.25)||velocity>=1},
    {id:'visual-capture-sane',pass:visualCaptureDeferred===true||(before.pass&&after.pass&&lightingBrightness>=Number(exp.minimumLightingBrightness||0))},
    {id:'adaptive-runtime-surface',pass:Number(runtime.descendantCount||0)>0&&(Number(runtime.systemSignals||0)>0||Number(runtime.remoteCount||0)>0||interactionSurfaceCount>0||progressionSurfaceCount>0||combatSurfaceCount>0||npcSurfaceCount>0||itemSurfaceCount>0)},
    {id:'adaptive-ftue-clarity',pass:onboardingClarityPass},
    {id:'adaptive-ui-commercial-quality',pass:!signals.ui||uiCommercialPass},
    {id:'adaptive-ui-blocking-overlay',pass:blockingOverlayPass},
    {id:'adaptive-world-safety',pass:!signals.map||worldSafetyPass},
    {id:'adaptive-map-route-coverage',pass:!signals.map||routeActions.length===0||routePassCount>=routeRequired},
    {id:'adaptive-spawn-safety',pass:!signals.combat||spawnThreatDistance<0||spawnThreatDistance>=10},
    {id:'adaptive-interaction-surface',pass:!signals.interactions||interactionSurfaceCount>0},
    {id:'adaptive-semantic-interaction-effect',pass:!signals.interactions||semanticActions.length===0||semanticEffects>0},
    {id:'adaptive-system-transaction-effect',pass:systemActions.length===0||systemEffects===systemActions.length},
    {id:'adaptive-travel-effect',pass:travelActions.length===0||travelEffects===travelActions.length},
    {id:'adaptive-gameplay-loop-cadence',pass:!activeLoopExpected||activeLoopObserved},
    {id:'adaptive-quest-state-transition',pass:!signals.quests||questActions.length===0||questEffects>0||timelineProgressChanged},
    {id:'adaptive-reward-effect',pass:!signals.rewards||rewardActions.length===0||rewardEffects>0||progressChanged||inventoryDelta},
    {id:'adaptive-progression-surface',pass:!signals.progression||progressionSurfaceCount>0},
    {id:'adaptive-remote-surface',pass:!signals.serverBoundary||Number(runtime.remoteCount||0)>0},
    {id:'adaptive-combat-surface',pass:!signals.combat||(combatSurfaceCount>0&&mobRigAnimationPass&&(!soak||(mobRows.length>0&&(timelineMobDynamic||mobMotion.dynamic||primaryActionFeedbackChanged||combatEffects>0))))},
    {id:'adaptive-combat-action-effect',pass:!signals.combat||combatActions.length===0||combatEffects>0},
    {id:'adaptive-mob-animation-ai',pass:!signals.combat||modelMobs.length===0||(animatedMobCount===modelMobs.length&&(!soak||timelineMobDynamic||mobMotion.dynamic||primaryActionFeedbackChanged))},
    {id:'adaptive-motion-surface',pass:!signals.motion||(player.animatorPresent===true&&Number(player.motorCount||0)>0&&displacement>=0.1)},
    {id:'adaptive-audio-surface',pass:!signals.audio||Number(runtime.soundCount||0)>0},
    {id:'adaptive-npc-surface',pass:!signals.npc||npcSurfaceCount>0},
    {id:'adaptive-companion-ai-surface',pass:!signals.companion||(companionSurfaceCount>0&&(!soak||timelineCompanionDynamic||companionMotion.dynamic))},
    {id:'adaptive-item-surface',pass:!signals.items||itemSurfaceCount>0},
    {id:'adaptive-environment-surface',pass:!signals.environment||(Number(world.environmentModels||0)>0||Number(world.collidablePartCount||0)>=20)},
    {id:'adaptive-effects-surface',pass:!signals.effects||(Number(world.effectCount||0)>0||primaryActionFeedbackChanged)},
    {id:'adaptive-quest-loop-surface',pass:!signals.quests||(Number(categories.quest||0)>0||entityRows(runtime.progression).some(row=>/quest|mission|objective|trial/i.test(clean(row?.name))))},
    {id:'adaptive-reward-loop-surface',pass:!signals.rewards||(Number(categories.reward||0)>0||entityRows(runtime.progression).some(row=>/gold|coin|xp|reward|loot|drop/i.test(clean(row?.name))))},
    {id:'adaptive-economy-surface',pass:!signals.economy||Number(categories.economy||0)>0},
    {id:'adaptive-save-surface',pass:!signals.save||Number(categories.save||0)>0},
    {id:'adaptive-save-rejoin-persistence',pass:true},
    {id:'adaptive-retry-loop-surface',pass:!signals.retry||Number(categories.retry||0)>0},
    {id:'adaptive-retry-action-effect',pass:!signals.retry||retryActions.length===0||retryEffects>0},
    {id:'adaptive-death-respawn-recovery',pass:!deathObserved||respawnObserved},
    {id:'adaptive-multiplayer-sync-surface',pass:!signals.multiplayer||(soak?multiplayerActualSessionPass:multiplayerRuntimeSurface)},
    {id:'adaptive-camera-quality',pass:!signals.camera||(client?.camera?.present===true&&client?.camera?.subjectPresent===true&&Number(client?.camera?.fieldOfView||0)>0&&client?.camera?.occluded!==true)},
    {id:'adaptive-performance-budget',pass:Number(runtime.memoryMb||0)>=0&&Number(runtime.descendantCount||0)<120000&&performanceTrendPass}
  ];
  // 실제 발견한 버튼·상호작용·이동 경로별 검증 패턴을 기존 판정 흐름에 추가한다.
  const discoveredPatterns=new Map();
  let discoveredPatternOverflow=false;
  for(const action of actions){
    if(!['mcp-ui-exploration','mcp-world-interaction','mcp-combat-action','mcp-map-route-audit'].includes(clean(action?.type)))continue;
    const actionId=clean(action?.id);
    if(!actionId)continue;
    // 의미를 모르는 공용 UI를 게임 기능 회귀 검사로 오인하지 않는다.
    if(action.type==='mcp-ui-exploration'&&action.semantic==='GENERAL')continue;
    const targetIdentity=clean(action?.targetIdentity)||actionId;
    const id='observed-action-'+stableSha256({type:action.type,targetIdentity}).slice(0,20);
    if(!discoveredPatterns.has(id)&&discoveredPatterns.size>=64){discoveredPatternOverflow=true;continue;}
    const effectRequired=action.type!=='mcp-map-route-audit';
    const pass=action.dispatched===true&&action.ok===true&&(!effectRequired||action.effectObserved===true);
    const previous=discoveredPatterns.get(id);
    discoveredPatterns.set(id,{id,pass:pass&&previous?.pass!==false,required:true,generatedFrom:'OFFICIAL_STUDIO_OBSERVED_ACTION',actionId:actionId.slice(0,160),targetIdentity:targetIdentity.slice(0,240),actionType:action.type,effectRequired,attempts:Number(previous?.attempts||0)+1});
  }
  const scenarios=rows.filter(row=>requiredIds.size===0||requiredIds.has(row.id)).map(row=>({...row,required:true}));
  scenarios.push(...discoveredPatterns.values());
  if(discoveredPatternOverflow)scenarios.push({id:'observed-action-capacity-exceeded',pass:false,required:true,reason:'UNVERIFIED_ACTIONS_REMAIN'});
  // 실행기가 모르는 필수 패턴도 누락 성공으로 처리하지 않는다.
  const evaluatedIds=new Set(scenarios.map(row=>row.id));
  for(const id of requiredIds){
    if(!evaluatedIds.has(id))scenarios.push({id,pass:false,required:true,reason:'REQUIRED_SCENARIO_NOT_EXECUTED'});
  }
  const qualityFailureKinds=scenarios.filter(row=>row.pass!==true).map(row=>row.id);
  const initialState=clean(initialClientProbe?.player?.roundState);
  const finalState=clean(player.roundState);
  const initialPop=Number(initialClientProbe?.workspace?.ActivePopulation||0);
  const finalPop=Number(ws.ActivePopulation||humanCount+monsterCount||0);
  const metrics={
    primaryActionDisplacement:displacement,
    primaryActionVelocity:velocity,
    primaryActionFeedbackChanged,
    progressChanged,
    inventoryChanged:inventoryDelta,
    timelineProgressChanged,
    timelineMobDynamic,
    timelineCompanionDynamic,
    auditProfile:soak?'F9_SOAK':'FAST_DEEP',
    timelineProbeCount:timeline.length,
    systemActionCount:systemActions.length,
    systemEffectCount:systemEffects,
    travelActionCount:travelActions.length,
    travelEffectCount:travelEffects,
    mobMotion,
    companionMotion,
    npcMotion,
    ftue:{declared:signals.onboarding===true,pass:onboardingClarityPass,visibleTextCount:visibleTexts.length,visibleButtonCount:visibleButtons},
    uiCommercial:{offscreenButtons:Number(ui.offscreenButtons||0),undersizedTouchButtons:Number(ui.undersizedTouchButtons||0),suboptimalTouchButtons:Number(ui.suboptimalTouchButtons||0),textOverflowButtons:Number(ui.textOverflowButtons||0),overlapPairs:Number(ui.overlapPairs||0),largeOverlayCount:Number(ui.largeOverlayCount||0),largeBlockingOverlayCount:Number(ui.largeBlockingOverlayCount||0),largestOverlayCoverage:Number(ui.largestOverlayCoverage||0)},
    startPlayability:{initialDead,finalDead,initialHealth:Number.isFinite(initialHealth)?initialHealth:null,finalHealth:Number.isFinite(finalHealth)?finalHealth:null,startGateVisible:Boolean(initialStartLikeButton),startGateActionOk:startGateAction?.ok===true,startGateEffectObserved},
    surfaces:{interactionSurfaceCount,progressionSurfaceCount,combatSurfaceCount,npcSurfaceCount,companionSurfaceCount,itemSurfaceCount,remoteCount:Number(runtime.remoteCount||0),soundCount:Number(runtime.soundCount||0),effectCount:Number(world.effectCount||0),promptCount:Number(world.proximityPromptCount||0),inventoryCount:Number(runtime.inventoryCount||0),currentActualPlayerCount,maxActualPlayerCount,multiplayerStateTransition,multiplayerActualSessionPass},
    performance:{memoryMb:Number(runtime.memoryMb||0),descendantCount:Number(runtime.descendantCount||0)},
    worldAudit:{floorSamples,floorHits,floorCoveragePass,routeSamples,routeSuccess,routeCoveragePass,spawnThreatDistance,spawnOverlapSafe},
    characterAndAi:{mobRigAnimationPass,humanoidMobCount:humanoidMobRows.length,cameraOccluded:client?.camera?.occluded===true,cameraDistance:Number(client?.camera?.distance||0)}
  };
  const repairMap={
    'adaptive-start-playability':['GAME_START','CRITICAL','Repair initial character health/state and start/continue flow so Studio reaches a healthy controllable character and gameplay state.'],
    'adaptive-ftue-clarity':['FTUE_ONBOARDING','HIGH','Restore a clear start/loading/tutorial/objective presentation with an actionable control and readable guidance before normal play.'],
    'adaptive-ui-commercial-quality':['MOBILE_UI','HIGH','Fix clipping, touch target size, text fit, and overlapping HUD controls across mobile viewports.'],
    'adaptive-ui-blocking-overlay':['MOBILE_UI','CRITICAL','Remove or dismiss persistent full-screen modal/guide overlays that block gameplay input or obscure the playable viewport.'],
    'adaptive-world-safety':['WORLD_GEOMETRY','CRITICAL','Repair walkable floor coverage, collision gaps, void falls, stuck geometry, and unsafe map boundaries.'],
    'adaptive-map-route-coverage':['MAP_ROUTEABILITY','CRITICAL','Repair unreachable/stuck/dead-zone routes discovered during Studio corner-direction traversal.'],
    'adaptive-spawn-safety':['SPAWN_FAIRNESS','HIGH','Move hostile spawns away from player spawn or add safe startup protection/telegraphing.'],
    'adaptive-mob-animation-ai':['MONSTER_MOTION_AI','CRITICAL','Repair monster Humanoid rig, Animator/Motor6D motion, target/aggro transitions, attack movement, and runtime liveness.'],
    'adaptive-interaction-surface':['INTERACTION_CHAIN','HIGH','Restore usable prompts/buttons/click surfaces and verify input leads to a visible or authoritative result.'],
    'adaptive-semantic-interaction-effect':['INTERACTION_CHAIN','CRITICAL','A discovered quest/shop/craft/equip/travel/heal/upgrade/collect/UI interaction accepted input but produced no observable gameplay/UI/progression/inventory result.'],
    'adaptive-system-transaction-effect':['SYSTEM_TRANSACTION','CRITICAL','One or more discovered shop/craft/equip/upgrade actions accepted input without changing inventory, currency/progression, feedback, or relevant UI state. Repair each transaction chain independently.'],
    'adaptive-travel-effect':['WORLD_TRAVEL','CRITICAL','A discovered portal/door/travel action accepted input but did not move the player, change map/round state, or provide authoritative feedback.'],
    'adaptive-gameplay-loop-cadence':['CORE_GAMEPLAY_LOOP','CRITICAL','Actual-play samples show no meaningful action-feedback-progression/AI change across an active gameplay loop. Reduce dead time or restore the broken loop transition.'],
    'adaptive-quest-state-transition':['QUEST_LOOP','CRITICAL','Quest interaction did not advance quest/UI/progression state. Repair accept-progress-complete transitions and softlock handling.'],
    'adaptive-reward-effect':['REWARD_LOOP','CRITICAL','Reward/collect interaction did not change reward, inventory, progression, or visible state. Repair delivery and duplicate-safe claim handling.'],
    'adaptive-progression-surface':['PROGRESSION','CRITICAL','Restore observable progression state for levels, quests, waves, zones, unlocks, or rewards.'],
    'adaptive-remote-surface':['SERVER_CLIENT_BOUNDARY','CRITICAL','Restore server-authoritative RemoteEvent/RemoteFunction surface and validation path.'],
    'adaptive-combat-surface':['COMBAT_AI','CRITICAL','Repair combat targets, damage/state transitions, enemy liveness, attack feedback, and F9 AI movement.'],
    'adaptive-combat-action-effect':['ACTION_IMPLEMENTATION','CRITICAL','Studio reached a live combat target and dispatched attack input, but no damage/AI/target/player/UI feedback change was observed. Repair hit detection, attack binding, server authority, and feedback timing.'],
    'adaptive-motion-surface':['CHARACTER_MOTION','HIGH','Repair Animator/Motor6D rig behavior and verify movement/action animation response.'],
    'adaptive-audio-surface':['AUDIO','MEDIUM','Restore required gameplay/BGM/SFX surface and ensure runtime audio feedback exists.'],
    'adaptive-npc-surface':['NPC','HIGH','Restore required NPC actors, interaction affordances, dialogue/shop/quest links, and runtime state.'],
    'adaptive-companion-ai-surface':['COMPANION_AI','CRITICAL','Repair companion spawn/follow/target/attack/recovery behavior and F9 liveness.'],
    'adaptive-item-surface':['ITEM_INVENTORY','HIGH','Restore item/tool/inventory/equipment surface and verify acquisition/equip state.'],
    'adaptive-environment-surface':['ENVIRONMENT_ART','MEDIUM','Restore environment/world dressing while preserving collision and gameplay readability.'],
    'adaptive-effects-surface':['VFX_FEEDBACK','MEDIUM','Restore readable telegraphs, hit feedback, particles/trails/highlights without blocking play.'],
    'adaptive-quest-loop-surface':['QUEST_LOOP','CRITICAL','Repair quest accept-progress-complete-reward state chain and prevent stuck quest states.'],
    'adaptive-reward-loop-surface':['REWARD_LOOP','HIGH','Repair reward delivery and progression feedback; prevent missing or duplicated rewards.'],
    'adaptive-economy-surface':['ECONOMY','HIGH','Repair shop/cost/currency/upgrade transaction surface and progression affordability flow.'],
    'adaptive-save-surface':['SAVE_REJOIN','CRITICAL','Repair save/load/rejoin persistence and idempotency without duplicating rewards.'],
    'adaptive-save-rejoin-persistence':['SAVE_REJOIN','CRITICAL','Repair save timing/load ordering/schema migration so stable progression survives an actual F9 Studio stop/start cycle without reset or duplication.'],
    'adaptive-retry-loop-surface':['FAILURE_RECOVERY','HIGH','Repair death/failure/restart/respawn flow and remove softlocks after retry.'],
    'adaptive-retry-action-effect':['FAILURE_RECOVERY','CRITICAL','Retry/restart input was accepted but did not restore or transition gameplay/UI/round state.'],
    'adaptive-death-respawn-recovery':['CHARACTER_RESPAWN','CRITICAL','A real death was observed during Studio play but the character did not return to a healthy playable state.'],
    'adaptive-multiplayer-sync-surface':['MULTIPLAYER_SYNC','CRITICAL','The game declares multiplayer/co-op behavior but Studio found no credible replicated player/team state plus server Remote surface. Restore actual 2+ player synchronization evidence before release.'],
    'adaptive-camera-quality':['CAMERA','HIGH','Repair camera subject/FOV/occlusion behavior and keep gameplay readable during movement/combat.'],
    'adaptive-performance-budget':['PERFORMANCE','HIGH','Reduce runaway instance count/memory pressure and keep long-session runtime stable.'],
    'primary-action-effect':['ACTION_IMPLEMENTATION','CRITICAL','Ensure primary action produces authoritative gameplay feedback, movement, damage, or state transition.'],
    'visual-capture-sane':['VISUAL_RUNTIME','HIGH','Repair blank/invalid/too-small viewport or unreadable lighting during actual play.'],
    'character-camera-ready':['CHARACTER_BOOT','CRITICAL','Repair character spawn, Humanoid/root, and camera binding before gameplay starts.']
  };
  const observedFor=id=>{
    if(id==='adaptive-start-playability')return metrics.startPlayability;
    if(id==='adaptive-ftue-clarity')return{declared:signals.onboarding===true,visibleButtonCount:visibleButtons,visibleTextCount:visibleTexts.length,visibleTexts:visibleTexts.slice(0,12),pass:onboardingClarityPass};
    if(id==='adaptive-ui-commercial-quality'||id==='adaptive-ui-blocking-overlay')return metrics.uiCommercial;
    if(id==='adaptive-world-safety')return{boundsFinite:world.boundsFinite===true,collidablePartCount:Number(world.collidablePartCount||0),floorBelowPlayer:world.floorBelowPlayer===true,floorSamples,floorHits,floorCoveragePass,routeSamples,routeSuccess,routeCoveragePass,spawnThreatDistance,spawnOverlapSafe};
    if(id==='adaptive-map-route-coverage')return{routeAttemptCount:routeActions.length,routePassCount,routeRequired,routes:routeActions.slice(0,8).map(row=>({id:row.id,ok:row.ok===true,moved:Number(row.moved||0),fall:Number(row.fall||0),floorBelow:row.floorBelow===true}))};
    if(id==='adaptive-spawn-safety')return{spawnLocationCount:Number(world.spawnLocationCount||0),minSpawnThreatDistance:spawnThreatDistance};
    if(id==='adaptive-mob-animation-ai')return{modelMobCount:modelMobs.length,animatedMobCount,mobMotion:metrics.mobMotion,timelineMobDynamic};
    if(id==='adaptive-combat-surface')return{combatSurfaceCount,mobCount:mobRows.length,humanoidMobCount:humanoidMobRows.length,mobRigAnimationPass,mobMotion:metrics.mobMotion,timelineMobDynamic,combatActionCount:combatActions.length,combatEffectCount:combatEffects};
    if(id==='adaptive-combat-action-effect')return{combatActionCount:combatActions.length,combatEffectCount:combatEffects,actions:combatActions.slice(0,8).map(row=>({id:row.id,type:row.type,effectObserved:row.effectObserved===true,effect:row.effect||null}))};
    if(id==='adaptive-companion-ai-surface')return{companionSurfaceCount,companionCount:entityRows(world.companions).length,companionMotion:metrics.companionMotion,timelineCompanionDynamic};
    if(id==='adaptive-progression-surface'||id==='adaptive-quest-loop-surface'||id==='adaptive-reward-loop-surface')return{progressionSurfaceCount,progressChanged,timelineProgressChanged};
    if(id==='adaptive-item-surface')return{itemSurfaceCount,inventoryCount:Number(runtime.inventoryCount||0),inventoryChanged:inventoryDelta};
    if(id==='adaptive-performance-budget')return metrics.performance;
    if(id==='adaptive-interaction-surface')return{interactionSurfaceCount,promptCount:Number(world.proximityPromptCount||0),clickDetectorCount:Number(world.clickDetectorCount||0),visibleButtons};
    if(id==='adaptive-semantic-interaction-effect')return{semanticActionCount:semanticActions.length,semanticEffectCount:semanticEffects,actions:semanticActions.slice(0,10).map(row=>({id:row.id,type:row.type,semantic:row.semantic||null,effectObserved:row.effectObserved===true,effect:row.effect||null}))};
    if(id==='adaptive-system-transaction-effect')return{systemActionCount:systemActions.length,systemEffectCount:systemEffects,actions:systemActions.slice(0,12).map(row=>({id:row.id,semantic:row.semantic,effectObserved:row.effectObserved===true,effect:row.effect||null}))};
    if(id==='adaptive-travel-effect')return{travelActionCount:travelActions.length,travelEffectCount:travelEffects,actions:travelActions.slice(0,8).map(row=>({id:row.id,effectObserved:row.effectObserved===true,effect:row.effect||null}))};
    if(id==='adaptive-gameplay-loop-cadence')return{activeLoopExpected,activeLoopObserved,activeTimelineTransitions,idleTimelineTransitions,semanticEffectCount:semanticEffects,timelineProgressChanged,timelineMobDynamic,timelineCompanionDynamic};
    if(id==='adaptive-quest-state-transition')return{questActionCount:questActions.length,questEffectCount:questEffects,timelineProgressChanged};
    if(id==='adaptive-reward-effect')return{rewardActionCount:rewardActions.length,rewardEffectCount:rewardEffects,progressChanged,inventoryChanged:inventoryDelta};
    if(id==='adaptive-retry-action-effect')return{retryActionCount:retryActions.length,retryEffectCount:retryEffects};
    if(id==='adaptive-death-respawn-recovery')return{deathObserved,respawnObserved};
    if(id==='adaptive-multiplayer-sync-surface')return{declaredMultiplayer:signals.multiplayer===true,auditProfile:soak?'F9_SOAK':'FAST_DEEP',multiplayerRuntimeSurface,multiplayerActualSessionPass,multiplayerSignals,currentActualPlayerCount,maxActualPlayerCount,multiplayerStateTransition,remoteCount:Number(runtime.remoteCount||0)};
    return metrics.surfaces;
  };
  const qualityFailureDetails=qualityFailureKinds.map(id=>{
    const pattern=discoveredPatterns.get(id);
    if(pattern)return{id,repairSurface:'ROBLOX_OBSERVED_INTERACTION',priority:'HIGH',hint:'Replay the exact observed action and verify its real state change after repair.',observed:pattern};
    const [repairSurface,priority,hint]=repairMap[id]||['ROBLOX_PRODUCT_QUALITY','HIGH','Repair the failing Studio actual-play scenario and re-run the exact artifact.'];
    return{id,repairSurface,priority,hint,observed:observedFor(id)};
  });
  return{
    required:true,
    scenarios,
    qualityFailureKinds,
    qualityFailureDetails,
    authoritativeStateChangeObserved:Boolean(primaryActionFeedbackChanged||progressChanged||mobMotion.healthChanged>0||mobMotion.stateChanged>0||(initialState&&finalState&&initialState!==finalState)||finalPop>initialPop),
    capture:{before,after},
    metrics
  };
}

class McpStdioClient{
  constructor({command,args=[],env=process.env,timeoutMs=30000}={}){
    this.command=command;this.args=args;this.env=env;this.timeoutMs=timeoutMs;
    this.child=null;this.nextId=1;this.pending=new Map();this.tools=new Map();this.protocolVersion='';this.serverInfo={};this.stderrTail='';
  }
  async connect(){
    this.child=spawn(this.command,this.args,{stdio:['pipe','pipe','pipe'],windowsHide:true,env:this.env,shell:false});
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data',chunk=>{
      const value=String(chunk||'');
      this.stderrTail=(this.stderrTail+value).slice(-6000);
      if(process.env.ACTIONS_STEP_DEBUG==='true')process.stderr.write(value);
    });
    const rl=readline.createInterface({input:this.child.stdout,crlfDelay:Infinity});
    rl.on('line',line=>this.onLine(line));
    this.child.on('exit',(code,signal)=>{
      const detail=clean(this.stderrTail).replace(/\s+/g,' ').slice(-2000);
      const suffix=detail?` stderr=${detail}`:'';
      for(const {reject,timer} of this.pending.values()){clearTimeout(timer);reject(new Error(`MCP process exited code=${code} signal=${signal}${suffix}`));}
      this.pending.clear();
    });
    const result=await this.request('initialize',{
      protocolVersion:'2024-11-05',
      capabilities:{},
      clientInfo:{name:'jaewoon-games-roblox-studio-mcp',version:'1.0.0'}
    });
    this.protocolVersion=clean(result?.protocolVersion||'2024-11-05');
    this.serverInfo=result?.serverInfo||{};
    this.notify('notifications/initialized',{});
    return await this.refreshTools();
  }
  async refreshTools(){
    const listed=await this.request('tools/list',{});
    this.tools.clear();
    for(const tool of listed?.tools||[])this.tools.set(clean(tool?.name),tool);
    return listed?.tools||[];
  }
  async waitForTools(requiredNames=[],{attempts=24,delayMs=1500}={}){
    const required=[...new Set((requiredNames||[]).map(clean).filter(Boolean))];
    let names=[];
    for(let attempt=1;attempt<=Math.max(1,Number(attempts)||1);attempt++){
      const listed=attempt===1&&this.tools.size?[...this.tools.values()]:await this.refreshTools();
      names=(listed||[]).map(tool=>clean(tool?.name)).filter(Boolean);
      const missing=required.filter(name=>!this.tools.has(name));
      if(!missing.length){
        console.log('ROBLOX_STUDIO_MCP_TOOLS_READY='+names.sort().join(','));
        return names;
      }
      console.log('ROBLOX_STUDIO_MCP_TOOLS_WAIT='+attempt+':missing='+missing.join(',')+':available='+names.sort().join(','));
      if(attempt<Math.max(1,Number(attempts)||1))await wait(Math.max(100,Number(delayMs)||1500));
    }
    const missing=required.filter(name=>!this.tools.has(name));
    const stderrRaw=clean(this.stderrTail).replace(/\s+/g,' ');
    const stderrRedacted=stderrRaw
      .replace(/[A-Za-z]:\\\\Users\\\\[^\\\\]+/gi,'%USERPROFILE%')
      .replace(/[A-Za-z]:\/Users\/[^/]+/gi,'%USERPROFILE%')
      .slice(-1200);
    const stderrLower=stderrRedacted.toLowerCase();
    const stderrHint=!stderrRedacted?'EMPTY'
      :/timed out waiting for tools to become available/i.test(stderrRedacted)?'STUDIO_TOOL_PROVIDER_TIMEOUT'
      :/no studio|unable to find an active studio|studio[^.]{0,80}(?:not available|unavailable|not connected)/i.test(stderrRedacted)?'NO_ACTIVE_STUDIO'
      :/enable studio as mcp|mcp[^.]{0,80}(?:disabled|not enabled)/i.test(stderrRedacted)?'MCP_SERVER_NOT_ENABLED'
      :/websocket|connection refused|failed to connect|connection closed/i.test(stderrLower)?'STUDIO_PROXY_CONNECTION'
      :'NONEMPTY';
    console.log('ROBLOX_STUDIO_MCP_STDERR_HINT='+stderrHint);
    if(stderrRedacted)console.log('ROBLOX_STUDIO_MCP_STDERR_REDACTED='+stderrRedacted);
    throw new Error(
      'ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing='+missing.join(',')
      +':available='+names.sort().join(',')
      +':protocol='+clean(this.protocolVersion)
      +':server='+clean(this.serverInfo?.name)
      +':stderrHint='+stderrHint
    );
  }
  onLine(line){
    let msg;try{msg=JSON.parse(line);}catch{return;}
    if(msg?.method==='ping'&&msg?.id!==undefined){
      this.send({jsonrpc:'2.0',id:msg.id,result:{}});
      return;
    }
    if(msg?.id!==undefined&&this.pending.has(msg.id)){
      const p=this.pending.get(msg.id);this.pending.delete(msg.id);clearTimeout(p.timer);
      if(msg.error)p.reject(new Error(`MCP ${p.method} error: ${JSON.stringify(msg.error)}`));
      else p.resolve(msg.result);
    }
  }
  send(msg){
    if(!this.child||this.child.killed)throw new Error('MCP process not running');
    this.child.stdin.write(JSON.stringify(msg)+'\n');
  }
  request(method,params={}){
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`MCP timeout: ${method}`));},this.timeoutMs);
      this.pending.set(id,{resolve,reject,timer,method});
      this.send({jsonrpc:'2.0',id,method,params});
    });
  }
  notify(method,params={}){this.send({jsonrpc:'2.0',method,params});}
  tool(name){
    const t=this.tools.get(name);
    if(!t){
      const available=[...this.tools.keys()].sort();
      throw new Error('ROBLOX_STUDIO_MCP_TOOL_MISSING:'+name+':available='+available.join(','));
    }
    return t;
  }
  async call(name,args={}){
    const result=await this.request('tools/call',{name,arguments:args});
    if(result?.isError===true)throw new Error(`ROBLOX_STUDIO_MCP_TOOL_ERROR:${name}:${flattenText(result).join(' | ').slice(0,1000)}`);
    return result;
  }
  close(){
    try{this.child?.stdin?.end();}catch{}
    try{this.child?.kill();}catch{}
  }
}

function chooseStudio(listResult,expectedName=''){
  const studios=collectStudios(listResult,[]);
  const unique=[...new Map(studios.map(x=>[x.studioId,x])).values()];
  if(!unique.length)throw new Error('ROBLOX_STUDIO_MCP_NO_STUDIO');
  const expected=clean(expectedName).toLowerCase().replace(/\.(rbxlx?|RBXLX?)$/,'');
  const named=expected?unique.find(x=>clean(x.name).toLowerCase().includes(expected)):null;
  const local=unique.filter(x=>!clean(x.placeId));
  return named||(local.length===1?local[0]:(unique.length===1?unique[0]:null))||(()=>{throw new Error('ROBLOX_STUDIO_MCP_AMBIGUOUS_STUDIO:'+JSON.stringify(unique));})();
}

function mcpCommandArgs(command=''){
  const resolved=clean(command);
  if(!resolved)throw new Error('ROBLOX_STUDIO_MCP_COMMAND_MISSING');
  if(process.platform==='win32'&&/\.exe$/i.test(resolved))return{command:resolved,args:[]};
  if(process.platform==='win32')return{command:'cmd.exe',args:['/c',resolved]};
  return{command:resolved,args:[]};
}


export async function runStudioMultiplayerAudit(client,studioId,contract={}){
  const tool=client.tool('execute_luau');
  const contractHash=clean(contract?.adaptiveCoverage?.contractHash).replace(/[^a-zA-Z0-9_-]/g,'').slice(-24);
  const token='VIBE2_F9_MULTIPLAYER_'+(contractHash||'AUDIT')+'_'+crypto.randomUUID();
  let auditPhase='initial';
  const probeName='__VibeMultiplayerAudit';
  const callJson=async(context,marker,code)=>{
    const result=await client.call('execute_luau',executeLuauArgs(tool.inputSchema||{},studioId,code,context));
    const parsed=parseStudioActualPlayProbe(result,marker);
    if(!parsed)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_PROBE_PARSE_EMPTY:'+marker+':'+context);
    return parsed;
  };
  // Read existing replicated state; the temporary probe never changes game attributes.
  const snapshotSource=[
    'local rows={}',
    'for _,p in ipairs(Players:GetPlayers()) do',
    ' local state={}',
    ' for _,key in ipairs({"RoundState","Role","CurrentMap","SharedObjective","RoundScore","Score","Coins","Level","Progress","Health","Wave","Objective"}) do',
    '  local value=p:GetAttribute(key); if type(value)=="string" or type(value)=="number" or type(value)=="boolean" then state[key]=value end',
    ' end',
    ' if p.Team then state.Team=p.Team.Name end',
    ' table.insert(rows,{name=p.Name,userId=p.UserId,state=state})',
    'end',
    'table.sort(rows,function(a,b) return a.userId<b.userId end)'
  ].join('\n');
  const clientSource=[
    'local Players=game:GetService("Players")',
    'local remote=game:GetService("ReplicatedStorage"):WaitForChild('+JSON.stringify(probeName)+',15)',
    'if not remote then return end',
    'while remote.Parent do',
    snapshotSource,
    ' remote:FireServer(remote:GetAttribute("Challenge"),rows)',
    ' task.wait(0.25)',
    'end'
  ].join('\n');
  const receiptSource=[
    'local HttpService=game:GetService("HttpService")',
    'local remote=game:GetService("ReplicatedStorage"):WaitForChild('+JSON.stringify(probeName)+',15)',
    'if not remote then return end',
    'remote.OnServerEvent:Connect(function(player,challenge,rows)',
    ' if type(challenge)~="string" or challenge~=remote:GetAttribute("Challenge") or type(rows)~="table" or #rows>8 then return end',
    ' local ok,text=pcall(function() return HttpService:JSONEncode({observerUserId=player.UserId,challenge=challenge,players=rows}) end)',
    ' if ok and #text<32768 then remote:SetAttribute(tostring(player.UserId),text) end',
    'end)'
  ].join('\n');
  const serverProbeSource=()=>{
    const marker='ROBLOX_STUDIO_MULTIPLAYER_SERVER=';
    return{
      marker,
      code:[
        'local HttpService=game:GetService("HttpService")',
        'local Players=game:GetService("Players")',
        'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
        'local StudioTestService=game:GetService("StudioTestService")',
        snapshotSource,
        'local remoteCount=0',
        'for _,d in ipairs(ReplicatedStorage:GetDescendants()) do if d.Name~='+JSON.stringify(probeName)+' and (d:IsA("RemoteEvent") or d:IsA("RemoteFunction")) then remoteCount=remoteCount+1 end end',
        'local argsOk,args=pcall(function() return StudioTestService:GetTestArgs() end)',
        'local challenge='+JSON.stringify(token+':'+auditPhase),
        'local probe=ReplicatedStorage:FindFirstChild('+JSON.stringify(probeName)+')',
        'local receipts={}',
        'if probe then',
        ' probe:SetAttribute("Challenge",challenge)',
        ' for _,p in ipairs(Players:GetPlayers()) do',
        '  local raw=probe:GetAttribute(tostring(p.UserId))',
        '  if type(raw)=="string" then local ok,row=pcall(function() return HttpService:JSONDecode(raw) end); if ok and row.challenge==challenge and row.observerUserId==p.UserId then table.insert(receipts,row) end end',
        ' end',
        'end',
        'local payload={count=#rows,players=rows,receipts=receipts,remoteCount=remoteCount,testArgs=argsOk and tostring(args) or "",testArgsReadable=argsOk}',
        'return "'+marker+'"..HttpService:JSONEncode(payload)'
      ].join('\n')
    };
  };
  const clientProbeSource=()=>{
    const marker='ROBLOX_STUDIO_MULTIPLAYER_CLIENT=';
    return{
      marker,
      code:[
        'local HttpService=game:GetService("HttpService")',
        'local Players=game:GetService("Players")',
        'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
        snapshotSource,
        'local remoteCount=0',
        'for _,d in ipairs(ReplicatedStorage:GetDescendants()) do if d.Name~='+JSON.stringify(probeName)+' and (d:IsA("RemoteEvent") or d:IsA("RemoteFunction")) then remoteCount=remoteCount+1 end end',
        'return "'+marker+'"..HttpService:JSONEncode({count=#rows,players=rows,remoteCount=remoteCount})'
      ].join('\n')
    };
  };
  const synchronized=(row,expectedCount)=>{
    const players=entityRows(row?.players),receipts=entityRows(row?.receipts);
    if(row?.testArgs!==token||row?.testArgsReadable!==true||row?.count!==expectedCount||players.length!==expectedCount||Number(row?.remoteCount||0)<1)return false;
    const ids=new Set(players.map(p=>p.userId));
    if(ids.size!==expectedCount||players.some(p=>!Number.isInteger(p.userId)||!clean(p.name)))return false;
    if(!players.some(p=>Object.keys(p.state||{}).length>0))return false;
    const observers=new Set();
    for(const receipt of receipts){
      if(!ids.has(receipt.observerUserId)||observers.has(receipt.observerUserId)||receipt.challenge!==token+':'+auditPhase)return false;
      const peers=entityRows(receipt.players);
      if(peers.length!==expectedCount||new Set(peers.map(p=>p.userId)).size!==expectedCount)return false;
      for(const server of players){
        const peer=peers.find(p=>p.userId===server.userId);
        if(!peer||peer.name!==server.name)return false;
        const state=server.state||{},observed=peer.state||{};
        if(Object.keys(state).length!==Object.keys(observed).length||Object.keys(state).some(key=>state[key]!==observed[key]))return false;
      }
      observers.add(receipt.observerUserId);
    }
    return observers.size===expectedCount;
  };
  const poll=async(context,sourceFactory,predicate,attempts=18)=>{
    let last=null,lastError=null;
    for(let attempt=1;attempt<=attempts;attempt++){
      try{
        const source=sourceFactory();
        last=await callJson(context,source.marker,source.code);
        if(predicate(last))return last;
      }catch(error){lastError=error;}
      if(attempt<attempts)await wait(500);
    }
    if(last)return last;
    if(lastError)throw lastError;
    return null;
  };
  const summary={
    version:2,sessionHash:hash(token),pass:false,infrastructureFailure:false,error:null,
    initialServerCount:0,lateServerCount:0,clientPlayerCount:0,leaveServerCount:0,
    lateJoinPass:false,clientRosterPass:false,remoteSurfacePass:false,leavePass:false,
    bothClientsStatePass:false,survivorStatePass:false,replacementJoinPass:false,
    verificationScope:'STUDIO_REPLICATED_STATE_AND_PLAYER_LIFECYCLE',sameUserRejoinVerified:false,
    serverPlayers:[],clientPlayers:[]
  };
  let launched=false,probeInstalled=false;
  try{
    const startMarker='ROBLOX_STUDIO_MULTIPLAYER_START=';
    const startCode=[
      'local HttpService=game:GetService("HttpService")',
      'local okService,StudioTestService=pcall(function() return game:GetService("StudioTestService") end)',
      'if not okService or not StudioTestService then return "'+startMarker+'"..HttpService:JSONEncode({started=false,error="STUDIO_TEST_SERVICE_UNAVAILABLE"}) end',
      'local editOk,editActive=pcall(function() return StudioTestService.EditModeActive end)',
      'if editOk and editActive~=true then return "'+startMarker+'"..HttpService:JSONEncode({started=false,error="EDIT_MODE_NOT_ACTIVE"}) end',
      'local containers={game:GetService("ReplicatedStorage"),game:GetService("ServerScriptService"),game:GetService("StarterPlayer").StarterPlayerScripts}',
      'for _,container in ipairs(containers) do if container:FindFirstChild('+JSON.stringify(probeName)+') then return "'+startMarker+'"..HttpService:JSONEncode({started=false,error="AUDIT_PROBE_NAME_COLLISION"}) end end',
      'local probe=Instance.new("RemoteEvent"); probe.Name='+JSON.stringify(probeName)+'; probe.Parent=containers[1]',
      'local receiver=Instance.new("Script"); receiver.Name='+JSON.stringify(probeName)+'; receiver.Source='+JSON.stringify(receiptSource)+'; receiver.Parent=containers[2]',
      'local observer=Instance.new("LocalScript"); observer.Name='+JSON.stringify(probeName)+'; observer.Source='+JSON.stringify(clientSource)+'; observer.Parent=containers[3]',
      'local token='+JSON.stringify(token),
      'task.spawn(function()',
      ' local ok,result=pcall(function() return StudioTestService:ExecuteMultiplayerTestAsync(1,token) end)',
      ' print("ROBLOX_STUDIO_MULTIPLAYER_ASYNC_RESULT="..HttpService:JSONEncode({ok=ok,result=tostring(result)}))',
      'end)',
      'return "'+startMarker+'"..HttpService:JSONEncode({started=true,token=token})'
    ].join('\n');
    const start=await callJson('Edit',startMarker,startCode);
    if(start?.started!==true)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_START_FAILED:'+clean(start?.error||'UNKNOWN'));
    launched=true;
    probeInstalled=true;

    const initial=await poll('Server',serverProbeSource,row=>row?.count===1&&row?.testArgs===token&&row?.testArgsReadable===true);
    summary.initialServerCount=Number(initial?.count||0);
    summary.serverPlayers=entityRows(initial?.players);
    if(summary.initialServerCount!==1||initial?.testArgs!==token||initial?.testArgsReadable!==true)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_INITIAL_SERVER_NOT_READY');

    const addMarker='ROBLOX_STUDIO_MULTIPLAYER_ADD=';
    const addCode=[
      'local HttpService=game:GetService("HttpService")',
      'local StudioTestService=game:GetService("StudioTestService")',
      'local ok,err=pcall(function() StudioTestService:AddPlayers(1) end)',
      'return "'+addMarker+'"..HttpService:JSONEncode({ok=ok,error=ok and "" or tostring(err)})'
    ].join('\n');
    const added=await callJson('Server',addMarker,addCode);
    if(added?.ok!==true)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_ADD_FAILED:'+clean(added?.error||'UNKNOWN'));

    auditPhase='late';
    const late=await poll('Server',serverProbeSource,row=>synchronized(row,2));
    summary.lateServerCount=Number(late?.count||0);
    summary.serverPlayers=entityRows(late?.players);
    summary.lateJoinPass=summary.lateServerCount===2&&entityRows(initial?.players).every(p=>summary.serverPlayers.some(peer=>peer.userId===p.userId));
    summary.bothClientsStatePass=synchronized(late,2);
    if(!summary.bothClientsStatePass)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_BOTH_CLIENT_STATE_MISMATCH');
    if(!summary.lateJoinPass)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_LATE_JOIN_NOT_OBSERVED');

    const replicated=await poll('Client',clientProbeSource,row=>Number(row?.count||0)>=2);
    summary.clientPlayerCount=Number(replicated?.count||0);
    summary.clientPlayers=entityRows(replicated?.players);
    const serverNames=new Set(summary.serverPlayers.map(row=>clean(row?.name)).filter(Boolean));
    const clientNames=new Set(summary.clientPlayers.map(row=>clean(row?.name)).filter(Boolean));
    summary.clientRosterPass=serverNames.size>=2&&[...serverNames].every(name=>clientNames.has(name));
    summary.remoteSurfacePass=Number(late?.remoteCount||0)>0&&Number(replicated?.remoteCount||0)>0;
    if(summary.clientPlayerCount<2||!summary.clientRosterPass){
      throw new Error('ROBLOX_STUDIO_MULTIPLAYER_CLIENT_REPLICATION_NOT_OBSERVED');
    }

    const canLeaveMarker='ROBLOX_STUDIO_MULTIPLAYER_CAN_LEAVE=';
    let canLeave=false;
    for(let attempt=1;attempt<=10;attempt++){
      const canLeaveCode=[
        'local HttpService=game:GetService("HttpService")',
        'local StudioTestService=game:GetService("StudioTestService")',
        'local ok,value=pcall(function() return StudioTestService:CanLeaveTest() end)',
        'return "'+canLeaveMarker+'"..HttpService:JSONEncode({ok=ok,canLeave=ok and value==true})'
      ].join('\n');
      try{
        const probe=await callJson('Client',canLeaveMarker,canLeaveCode);
        canLeave=probe?.ok===true&&probe?.canLeave===true;
      }catch{}
      if(canLeave)break;
      if(attempt<10)await wait(300);
    }
    if(!canLeave)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_CLIENT_LEAVE_NOT_READY');

    const leaveMarker='ROBLOX_STUDIO_MULTIPLAYER_LEAVE=';
    const leaveCode=[
      'local HttpService=game:GetService("HttpService")',
      'local StudioTestService=game:GetService("StudioTestService")',
      'task.delay(0.15,function() pcall(function() StudioTestService:LeaveTest() end) end)',
      'return "'+leaveMarker+'"..HttpService:JSONEncode({ok=true,userId=game:GetService("Players").LocalPlayer.UserId})'
    ].join('\n');
    const leave=await callJson('Client',leaveMarker,leaveCode);
    if(leave?.ok!==true)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_CLIENT_LEAVE_DISPATCH_FAILED');

    auditPhase='leave';
    const afterLeave=await poll('Server',serverProbeSource,row=>synchronized(row,1));
    summary.leaveServerCount=Number(afterLeave?.count||0);
    const survivor=entityRows(afterLeave?.players)[0];
    summary.leavePass=summary.leaveServerCount===1&&summary.serverPlayers.some(p=>p.userId===leave.userId)
      &&summary.serverPlayers.some(p=>p.userId===survivor?.userId)&&survivor?.userId!==leave.userId;
    summary.survivorStatePass=synchronized(afterLeave,1);
    if(!summary.leavePass||!summary.survivorStatePass)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_SURVIVOR_STATE_MISMATCH');

    const replacement=await callJson('Server',addMarker,addCode);
    if(replacement?.ok!==true)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_ADD_FAILED:REPLACEMENT');
    auditPhase='replacement';
    const recovered=await poll('Server',serverProbeSource,row=>synchronized(row,2));
    summary.replacementJoinPass=synchronized(recovered,2)&&entityRows(recovered?.players).some(p=>p.userId===survivor.userId);
    if(!summary.replacementJoinPass)throw new Error('ROBLOX_STUDIO_MULTIPLAYER_REPLACEMENT_STATE_MISMATCH');

    const endMarker='ROBLOX_STUDIO_MULTIPLAYER_END=';
    const endCode=[
      'local HttpService=game:GetService("HttpService")',
      'local StudioTestService=game:GetService("StudioTestService")',
      'task.delay(0.15,function() pcall(function() StudioTestService:EndTest("VIBE2_F9_MULTIPLAYER_COMPLETE") end) end)',
      'return "'+endMarker+'"..HttpService:JSONEncode({ok=true})'
    ].join('\n');
    await callJson('Server',endMarker,endCode);
    await wait(500);
    launched=false;

    summary.pass=summary.lateJoinPass&&summary.clientPlayerCount>=2&&summary.clientRosterPass&&summary.remoteSurfacePass&&summary.leavePass&&summary.bothClientsStatePass&&summary.survivorStatePass&&summary.replacementJoinPass;
    return summary;
  }catch(error){
    summary.pass=false;
    summary.error=clean(error?.message||error)||'UNKNOWN';
    summary.infrastructureFailure=!/STATE_MISMATCH|CLIENT_REPLICATION_NOT_OBSERVED/.test(summary.error);
    if(launched){
      let ended=false;
      try{
        const marker='ROBLOX_STUDIO_MULTIPLAYER_END=';
        const code=[
          'local HttpService=game:GetService("HttpService")',
          'local StudioTestService=game:GetService("StudioTestService")',
          'task.delay(0.1,function() pcall(function() StudioTestService:EndTest("VIBE2_F9_MULTIPLAYER_ABORT") end) end)',
          'return "'+marker+'"..HttpService:JSONEncode({ok=true})'
        ].join('\n');
        await callJson('Server',marker,code);
        ended=true;
      }catch{}
      if(!ended){
        try{
          const stopTool=client.tool('start_stop_play');
          await client.call('start_stop_play',startStopArgs(stopTool.inputSchema||{},studioId,false));
        }catch{}
      }
      await wait(300);
    }
    return summary;
  }finally{
    if(probeInstalled){
      try{
        await callJson('Edit','ROBLOX_STUDIO_MULTIPLAYER_CLEANUP=',[
          'local HttpService=game:GetService("HttpService")',
          'for _,container in ipairs({game:GetService("ReplicatedStorage"),game:GetService("ServerScriptService"),game:GetService("StarterPlayer").StarterPlayerScripts}) do local probe=container:FindFirstChild('+JSON.stringify(probeName)+'); if probe then probe:Destroy() end end',
          'return "ROBLOX_STUDIO_MULTIPLAYER_CLEANUP="..HttpService:JSONEncode({ok=true})'
        ].join('\n'));
      }catch{
        summary.pass=false;
        summary.infrastructureFailure=true;
        summary.error='ROBLOX_STUDIO_MULTIPLAYER_CLEANUP_FAILED';
      }
    }
    console.log('ROBLOX_STUDIO_MULTIPLAYER_AUDIT_RESULT='+JSON.stringify(summary));
  }
}

export async function runOfficialStudioMcpPlay({
  mcpCommand='',output='',expectedStudioName='',timeoutMs=45000,toolAttempts=5,toolDelayMs=1000,
  settingState='',settingCandidatePathCount=-1,actualPlayContractPath='',auditProfile='FAST_DEEP'
}={}){
  const actualPlayLaunch=actualPlayContractPath&&fs.existsSync(actualPlayContractPath)?readJson(actualPlayContractPath):{};
  const actualPlayContract=deriveStudioActualPlayContract(actualPlayLaunch);
  const launch=mcpCommandArgs(mcpCommand);
  const client=new McpStdioClient({...launch,timeoutMs});
  const actions=[],checkpoints=[],errors=[];
  const checkpoint=(id,pass)=>checkpoints.push({id,name:id,required:true,pass:pass===true});
  let studioId='',beforeImages=[],afterImages=[],consoleResult=null,characterMotionRuntime=null,started=false;
  let initialClientProbe=null,preActionClientProbe=null,postActionClientProbe=null,finalClientProbe=null,finalServerProbe=null,rejoinClientProbe=null,scenarioCoverage=[];
  let authoritativeStateChangeObserved=false,qualityFailureKinds=[],qualityFailureDetails=[],captureQuality=null,scenarioMetrics={},saveRejoinSummary=null,multiplayerAuditSummary=null;
  const auditMode=clean(auditProfile).toUpperCase()==='F9_SOAK'?'F9_SOAK':'FAST_DEEP';
  const timelineProbes=[];
  try{
    await client.connect();
    const requiredTools=['list_roblox_studios','get_studio_state','start_stop_play','get_console_output','screen_capture','user_keyboard_input','user_mouse_input','character_navigation','execute_luau'];
    await client.waitForTools(requiredTools,{
      attempts:Math.max(1,Number(toolAttempts)||5),
      delayMs:Math.max(100,Number(toolDelayMs)||1000)
    });
    for(const name of requiredTools)client.tool(name);
    checkpoint('official-studio-mcp-connected',true);

    let studio=null;
    let studioListResult=null;
    const studioAttachAttempts=20;
    for(let attempt=1;attempt<=studioAttachAttempts;attempt++){
      studioListResult=await client.call('list_roblox_studios',{});
      const studios=collectStudios(studioListResult,[]);
      const unique=[...new Map(studios.map(x=>[x.studioId,x])).values()];
      console.log('ROBLOX_STUDIO_MCP_STUDIO_ATTACH_WAIT='+attempt+':connected='+unique.length);
      if(!unique.length){
        const listText=flattenText(studioListResult,[]).join(' | ').replace(/\s+/g,' ').slice(0,700);
        console.log('ROBLOX_STUDIO_MCP_STUDIO_LIST_RESPONSE='+attempt+':'+(listText||'EMPTY'));
      }
      if(unique.length){
        studio=chooseStudio(studioListResult,expectedStudioName);
        console.log(
          'ROBLOX_STUDIO_MCP_STUDIO_ATTACHED='
          +clean(studio?.name||'LOCAL_STUDIO')
          +':placeId='+(clean(studio?.placeId)||'LOCAL')
        );
        break;
      }
      if(attempt<studioAttachAttempts)await wait(1000);
    }
    if(!studio)throw new Error('ROBLOX_STUDIO_MCP_NO_STUDIO_AFTER_ATTACH_WAIT');
    studioId=studio.studioId;
    checkpoint('local-studio-selected',Boolean(studioId));

    const stateTool=client.tool('get_studio_state');
    await client.call('get_studio_state',fillRequired((()=>{const a={};setStudioId(a,stateTool.inputSchema||{},studioId);return a;})(),stateTool.inputSchema||{}));
    checkpoint('studio-state-readable',true);

    const playTool=client.tool('start_stop_play');
    await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,true));
    started=true;
    checkpoint('play-mode-started',true);
    await wait(2500);

    if(actualPlayContract?.required===true){
      initialClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
      checkpoint('actual-play-initial-client-probe',initialClientProbe!=null);
      const initialHealth=Number(initialClientProbe?.player?.health);
      const initialDeadCandidate=Boolean(
        initialClientProbe?.player?.characterPresent===true
        &&(
          (Number.isFinite(initialHealth)&&initialHealth<=0)
          ||/Dead/i.test(clean(initialClientProbe?.player?.humanoidState))
        )
      );
      if(initialDeadCandidate){
        await wait(450);
        const deadConfirm=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        const confirmHealth=Number(deadConfirm?.player?.health);
        const deadConfirmed=Boolean(
          deadConfirm?.player?.characterPresent===true
          &&(
            (Number.isFinite(confirmHealth)&&confirmHealth<=0)
            ||/Dead/i.test(clean(deadConfirm?.player?.humanoidState))
          )
        );
        if(deadConfirmed){
          checkpoint('initial-character-playable',false);
          actions.push({id:'initial-character-playable',type:'mcp-start-playability-abort',dispatched:true,ok:false});
          try{await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));started=false;}catch{}
          throw new Error('ROBLOX_STUDIO_DEAD_CHARACTER_ABORT:INITIAL_CHARACTER_NOT_PLAYABLE');
        }
      }
      checkpoint('initial-character-playable',true);
      const floatingSpawnCandidate=Boolean(
        initialClientProbe?.player?.rootPresent===true
        &&initialClientProbe?.world?.floorBelowPlayer!==true
        &&(initialClientProbe?.world?.boundsFinite!==true||Number(initialClientProbe?.world?.collidablePartCount||0)<1||(Number(initialClientProbe?.world?.floorSampleCount||0)>0&&Number(initialClientProbe?.world?.floorHitCount||0)===0))
      );
      if(floatingSpawnCandidate){
        await wait(450);
        const floatingConfirm=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        const floatingConfirmed=Boolean(
          floatingConfirm?.player?.rootPresent===true
          &&floatingConfirm?.world?.floorBelowPlayer!==true
          &&(floatingConfirm?.world?.boundsFinite!==true||Number(floatingConfirm?.world?.collidablePartCount||0)<1||(Number(floatingConfirm?.world?.floorSampleCount||0)>0&&Number(floatingConfirm?.world?.floorHitCount||0)===0))
        );
        if(floatingConfirmed){
          checkpoint('floating-character-map-readiness',false);
          actions.push({id:'floating-character-map-readiness',type:'mcp-world-safety-abort',dispatched:true,ok:false});
          try{await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));started=false;}catch{}
          throw new Error('ROBLOX_STUDIO_FLOATING_CHARACTER_ABORT:NO_WALKABLE_WORLD');
        }
      }
      checkpoint('floating-character-map-readiness',true);
      let startGateProbe=initialClientProbe;
      if(clean(actualPlayContract.selectionButtonText)){
        const target=initialClientProbe?.ui?.buttons?.[clean(actualPlayContract.selectionButtonText)]||null;
        let ok=false;
        if(target?.visible===true&&Number.isFinite(Number(target.centerX))&&Number.isFinite(Number(target.centerY))){
          try{const mouseTool=client.tool('user_mouse_input');const result=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,target.centerX,target.centerY));ok=result?.isError!==true;}catch{}
        }
        actions.push({id:'ui-role-selection',type:'mcp-mouse-input',dispatched:target!=null,ok});
        checkpoint('role-selection-input-dispatched',ok);
        await wait(Math.max(250,Number(actualPlayContract.afterSelectionWaitMs||1800)));
        startGateProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client')||initialClientProbe;
      }
      const primaryTextBeforeStart=clean(actualPlayContract.primaryActionButtonText);
      const startTarget=entityRows(startGateProbe?.ui?.interactive).find(row=>
        row?.visible!==false
        &&row?.active!==false
        &&clean(row?.text)!==primaryTextBeforeStart
        &&/^(?:start|play|begin|continue|ready|시작|플레이|계속|준비)(?:\s|$)/i.test(clean(row?.text))
      )||null;
      if(startTarget){
        let ok=false;
        if(Number.isFinite(Number(startTarget.centerX))&&Number.isFinite(Number(startTarget.centerY))){
          try{
            const mouseTool=client.tool('user_mouse_input');
            const result=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,startTarget.centerX,startTarget.centerY));
            ok=result?.isError!==true;
          }catch{}
        }
        actions.push({id:'ui-start-gate',type:'mcp-mouse-input',dispatched:true,ok,text:clean(startTarget.text)});
        checkpoint('adaptive-start-gate-input-dispatched',ok);
        await wait(1200);
      }
    }

    if(actualPlayContract?.required===true){
      const primaryText=clean(actualPlayContract.primaryActionButtonText);
      const probeAttempts=primaryText?10:1;
      for(let probeAttempt=1;probeAttempt<=probeAttempts;probeAttempt++){
        preActionClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        const readyTarget=preActionClientProbe?.ui?.buttons?.[primaryText]||null;
        if(!primaryText||readyTarget?.visible===true)break;
        if(probeAttempt<probeAttempts)await wait(300);
      }
      checkpoint('actual-play-pre-action-client-probe',preActionClientProbe!=null);
      if(primaryText){
        const target=preActionClientProbe?.ui?.buttons?.[primaryText]||null;
        let ok=false;
        if(target?.visible===true&&Number.isFinite(Number(target.centerX))&&Number.isFinite(Number(target.centerY))){
          try{
            const mouseTool=client.tool('user_mouse_input');
            console.log('ROBLOX_STUDIO_MCP_MOUSE_SCHEMA='+JSON.stringify(mouseTool.inputSchema||{}).slice(0,3000));
            const result=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,target.centerX,target.centerY));
            ok=result?.isError!==true;
          }catch{}
        }
        actions.push({id:'ui-primary-action',type:'mcp-mouse-input',dispatched:target!=null,ok});
        checkpoint('primary-action-input-dispatched',ok);
        if(target?.visible!==true){
          checkpoint('primary-action-available',false);
          try{await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));started=false;}catch{}
          throw new Error('ROBLOX_STUDIO_START_ACTION_ABORT:PRIMARY_ACTION_NOT_VISIBLE');
        }
        checkpoint('primary-action-available',true);
        await wait(Math.max(200,Number(actualPlayContract.postActionWaitMs||350)));
        postActionClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        checkpoint('actual-play-post-action-client-probe',postActionClientProbe!=null);
      }
    }

    if(actualPlayContract?.required===true){
      const spawnProbe=postActionClientProbe||initialClientProbe;
      const missingCharacter=spawnProbe?.player?.present===true
        &&spawnProbe?.player?.characterPresent===false
        &&spawnProbe?.player?.humanoidPresent===false
        &&spawnProbe?.player?.rootPresent===false;
      if(missingCharacter){
        await wait(1500);
        const spawnConfirm=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        if(spawnConfirm?.player?.present===true
          &&spawnConfirm?.player?.characterPresent===false
          &&spawnConfirm?.player?.humanoidPresent===false
          &&spawnConfirm?.player?.rootPresent===false){
          checkpoint('initial-character-spawned',false);
          actions.push({id:'initial-character-spawned',type:'mcp-start-playability-abort',dispatched:true,ok:false});
          postActionClientProbe=spawnConfirm;
          try{await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));started=false;}catch{}
          throw new Error('ROBLOX_STUDIO_MISSING_CHARACTER_ABORT:NO_PLAYABLE_CHARACTER');
        }
      }
      checkpoint('initial-character-spawned',true);
      const overlayProbe=postActionClientProbe||preActionClientProbe;
      const blockingOverlay=Number(overlayProbe?.ui?.largeBlockingOverlayCount||0)>0
        &&Number(overlayProbe?.ui?.largestOverlayCoverage||0)>=0.55;
      if(blockingOverlay){
        await wait(450);
        const overlayConfirm=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        if(Number(overlayConfirm?.ui?.largeBlockingOverlayCount||0)>0
          &&Number(overlayConfirm?.ui?.largestOverlayCoverage||0)>=0.55){
          checkpoint('initial-ui-playability',false);
          actions.push({id:'initial-ui-playability',type:'mcp-start-ui-abort',dispatched:true,ok:false});
          postActionClientProbe=overlayConfirm;
          try{await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));started=false;}catch{}
          throw new Error('ROBLOX_STUDIO_BLOCKING_OVERLAY_ABORT:START_INPUT_OBSCURED');
        }
      }
      checkpoint('initial-ui-playability',true);
    }

    const keyboardTool=client.tool('user_keyboard_input');
    for(const key of ['W','A','D','Space']){
      const result=await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,key));
      actions.push({id:'keyboard-'+key.toLowerCase(),type:'mcp-keyboard-input',dispatched:true,ok:result?.isError!==true});
      await wait(key==='Space'?500:900);
    }
    const keyboardActions=actions.filter(x=>x.type==='mcp-keyboard-input');
    checkpoint('mcp-input-dispatched',keyboardActions.length===4&&keyboardActions.every(x=>x.ok));

    if(actualPlayContract?.required===true){
      const promptRows=entityRows(initialClientProbe?.world?.prompts).filter(row=>row?.enabled!==false);
      const rootPos=initialClientProbe?.player||{};
      const initialWorld=initialClientProbe?.world||{};
      const navigationTool=client.tool('character_navigation');
      const contractSignals=actualPlayContract?.adaptiveCoverage?.signals||{};
      const initialMobs=entityRows(initialWorld?.mobs);
      if((contractSignals.combat===true||initialMobs.length>0)&&initialMobs.length>0){
        const rootX0=Number(rootPos?.rootX||0),rootY0=Number(rootPos?.rootY||0),rootZ0=Number(rootPos?.rootZ||0);
        const nearest=[...initialMobs].sort((a,b)=>Math.hypot(Number(a?.x||0)-rootX0,Number(a?.z||0)-rootZ0)-Math.hypot(Number(b?.x||0)-rootX0,Number(b?.z||0)-rootZ0))[0];
        const dx=Number(nearest?.x||0)-rootX0,dz=Number(nearest?.z||0)-rootZ0,dist=Math.hypot(dx,dz)||1;
        const target={x:Number(nearest?.x||0)-dx/dist*5,y:rootY0,z:Number(nearest?.z||0)-dz/dist*5};
        let navOk=false,attackOk=false,combatProbe=null;
        try{
          const navResult=await client.call('character_navigation',characterNavigationArgs(navigationTool.inputSchema||{},studioId,target));
          navOk=navResult?.isError!==true;
          await wait(500);
          if(Number(initialClientProbe?.runtime?.inventoryCount||0)>0){
            await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,'1'));
            await wait(180);
          }
          const mouseTool=client.tool('user_mouse_input');
          const vx=Number(initialClientProbe?.camera?.viewportX||0),vy=Number(initialClientProbe?.camera?.viewportY||0);
          const attackResult=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,Math.max(1,vx/2),Math.max(1,vy/2)));
          attackOk=attackResult?.isError!==true;
          await wait(700);
          combatProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
          if(combatProbe)timelineProbes.push(combatProbe);
        }catch{}
        const mobDelta=entityMotionSummary(initialClientProbe?.world?.mobs,combatProbe?.world?.mobs);
        const generic=probeEffectSummary(initialClientProbe||{},combatProbe||{});
        actions.push({id:'commercial-combat-action',type:'mcp-combat-action',dispatched:true,ok:navOk&&attackOk,effectObserved:generic.effectObserved||mobDelta.healthChanged>0||mobDelta.stateChanged>0||mobDelta.targetChanged>0,effect:{...generic,mobDelta}});
      }
      const routeLimit=auditMode==='F9_SOAK'?4:2;
      const visitedRoutes=new Set();
      let previousRouteProbe=initialClientProbe;
      for(let routeIndex=0;routeIndex<routeLimit;routeIndex++){
        const routeRows=entityRows(previousRouteProbe?.world?.routes);
        const root=previousRouteProbe?.player||{};
        const candidate=routeRows.find(row=>row?.pass===true
          &&!visitedRoutes.has(clean(row.kind)+':'+clean(row.name))
          &&Math.hypot(Number(row.x||0)-Number(root.rootX||0),Number(row.z||0)-Number(root.rootZ||0))>8);
        if(!candidate){
          if(routeRows.length>0&&routeIndex===0){
            actions.push({id:'map-route-unreachable',type:'mcp-map-route-audit',dispatched:true,ok:false,reason:'no-reachable-anchor'});
          }
          break;
        }
        const routeId=clean(candidate.kind)+':'+clean(candidate.name);
        visitedRoutes.add(routeId);
        let navOk=true,probe=previousRouteProbe,fall=0,reached=false,waypointCount=0;
        let routeCandidate=candidate;
        for(let segment=0;segment<4&&navOk&&!reached;segment++){
          const waypoints=entityRows(routeCandidate.waypoints);
          if(!waypoints.length||waypoints.length>16||Number(routeCandidate.waypointCount||0)<waypoints.length){
            navOk=false;
            break;
          }
          for(const waypoint of waypoints){
            try{
              const navResult=await client.call('character_navigation',characterNavigationArgs(navigationTool.inputSchema||{},studioId,waypoint));
              if(navResult?.isError===true){navOk=false;break;}
              await wait(300);
              const next=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
              const waypointDistance=Math.hypot(Number(next?.player?.rootX)-Number(waypoint.x),Number(next?.player?.rootZ)-Number(waypoint.z));
              fall=Math.max(fall,Number(probe?.player?.rootY||0)-Number(next?.player?.rootY||0));
              if(!next||next.world?.floorBelowPlayer!==true||!Number.isFinite(waypointDistance)||waypointDistance>6||fall>=35){
                navOk=false;
                if(next)probe=next;
                break;
              }
              probe=next;
              waypointCount++;
              timelineProbes.push(next);
            }catch{navOk=false;break;}
          }
          const remaining=Math.hypot(Number(probe?.player?.rootX)-Number(candidate.x),Number(probe?.player?.rootZ)-Number(candidate.z));
          reached=navOk&&Number.isFinite(remaining)&&remaining<=6;
          if(reached||!navOk)break;
          if(Number(routeCandidate.waypointCount||0)<=waypoints.length){navOk=false;break;}
          routeCandidate=entityRows(probe?.world?.routes).find(row=>row?.pass===true
            &&clean(row.kind)+':'+clean(row.name)===routeId);
          if(!routeCandidate)navOk=false;
        }
        const moved=pointDistance(previousRouteProbe?.player||{},probe?.player||{});
        const arrivalDistance=Math.hypot(Number(probe?.player?.rootX)-Number(candidate.x),Number(probe?.player?.rootZ)-Number(candidate.z));
        const safe=Boolean(navOk&&reached&&Number.isFinite(arrivalDistance)&&arrivalDistance<=6
          &&probe?.world?.floorBelowPlayer===true&&fall<35&&moved>=1);
        actions.push({id:'map-route-'+routeId,type:'mcp-map-route-audit',dispatched:true,ok:safe,moved,fall,arrivalDistance,
          waypointCount,reason:safe?'':'path-incomplete-or-blocked',
          floorBelow:probe?.world?.floorBelowPlayer===true});
        if(probe)previousRouteProbe=probe;
        if(!safe)break;
      }
      const semanticOf=row=>{
        const text=(clean(row?.actionText)+' '+clean(row?.objectText)+' '+clean(row?.name)).toLowerCase();
        return /quest|퀘스트|mission|임무/.test(text)?'QUEST'
          :/reward|보상|claim|수령/.test(text)?'REWARD'
          :/shop|상점|merchant|구매|판매/.test(text)?'SHOP'
          :/craft|제작|forge|대장간/.test(text)?'CRAFT'
          :/equip|장비|weapon|무기|armor|방어구/.test(text)?'EQUIP'
          :/portal|포탈|enter|입장|door|문/.test(text)?'TRAVEL'
          :/heal|회복|healer|치유/.test(text)?'HEAL'
          :/upgrade|강화|전직|advance|train/.test(text)?'UPGRADE'
          :/retry|재도전|restart|재시작|respawn|리스폰|revive|부활/.test(text)?'RETRY'
          :/collect|채집|줍기|pickup|loot|전리품/.test(text)?'COLLECT':'GENERAL';
      };
      const semanticRank={QUEST:0,REWARD:1,SHOP:2,CRAFT:3,EQUIP:4,TRAVEL:5,HEAL:6,UPGRADE:7,COLLECT:8,GENERAL:99};
      promptRows.sort((a,b)=>{
        const aw=semanticRank[semanticOf(a)]??99,bw=semanticRank[semanticOf(b)]??99;
        if(aw!==bw)return aw-bw;
        const da=Math.hypot(Number(a?.x||0)-Number(rootPos?.rootX||0),Number(a?.y||0)-Number(rootPos?.rootY||0),Number(a?.z||0)-Number(rootPos?.rootZ||0));
        const db=Math.hypot(Number(b?.x||0)-Number(rootPos?.rootX||0),Number(b?.y||0)-Number(rootPos?.rootY||0),Number(b?.z||0)-Number(rootPos?.rootZ||0));
        return da-db;
      });
      const exploreLimit=auditMode==='F9_SOAK'?8:3;
      const selectedPrompts=[],seenSemantic=new Set();
      for(const row of promptRows){
        const semantic=semanticOf(row);
        if(semantic!=='GENERAL'&&!seenSemantic.has(semantic)){selectedPrompts.push(row);seenSemantic.add(semantic)}
        if(selectedPrompts.length>=exploreLimit)break;
      }
      for(const row of promptRows){
        if(selectedPrompts.length>=exploreLimit)break;
        if(!selectedPrompts.includes(row))selectedPrompts.push(row);
      }
      for(const prompt of selectedPrompts){
        let navOk=false,inputOk=false;
        const beforeProbe=timelineProbes.at(-1)||initialClientProbe;
        const semantic=semanticOf(prompt);
        try{
          const target={x:Number(prompt?.x||0),y:Number(prompt?.y||0),z:Number(prompt?.z||0)};
          const navResult=await client.call('character_navigation',characterNavigationArgs(navigationTool.inputSchema||{},studioId,target));
          navOk=navResult?.isError!==true;
          await wait(450);
          const key=promptKeyboardKey(prompt?.key);
          const holdMs=Math.max(120,Math.min(2200,Number(prompt?.holdDuration||0)*1000+160));
          const inputResult=await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,key,holdMs));
          inputOk=inputResult?.isError!==true;
          await wait(Math.max(350,Math.min(2200,holdMs+250)));
          const interactionProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
          const effect=probeEffectSummary(beforeProbe||{},interactionProbe||{});
          const semanticPass=semanticEffectPass(semantic,effect);
          if(interactionProbe)timelineProbes.push(interactionProbe);
          actions.push({id:'prompt-'+clean(prompt?.name||prompt?.objectText||'interaction'),type:'mcp-world-interaction',targetIdentity:clean(prompt?.path)||clean(prompt?.objectText)||clean(prompt?.name),semantic,dispatched:true,ok:navOk&&inputOk,effectObserved:semanticPass,effect});
        }catch{
          actions.push({id:'prompt-'+clean(prompt?.name||prompt?.objectText||'interaction'),type:'mcp-world-interaction',targetIdentity:clean(prompt?.path)||clean(prompt?.objectText)||clean(prompt?.name),semantic,dispatched:true,ok:false,effectObserved:false});
        }
      }
      if(promptRows.length>0)checkpoint('commercial-prompt-exploration',actions.some(row=>row.type==='mcp-world-interaction'&&row.ok===true));

      const destructiveUi=/delete|삭제|wipe|초기화|reset data|데이터 초기화|robux|로벅스|purchase premium|quit|leave game|게임 종료/i;
      const usefulUi=/start|시작|attack|공격|skill|스킬|quest|퀘스트|shop|상점|craft|제작|equip|장비|heal|회복|upgrade|강화|retry|재도전|claim|보상|inventory|인벤/i;
      const uiCandidates=entityRows((timelineProbes.at(-1)||initialClientProbe)?.ui?.interactive)
        .filter(row=>!destructiveUi.test(clean(row?.text)+' '+clean(row?.name)))
        .sort((a,b)=>(usefulUi.test(clean(b?.text)+' '+clean(b?.name))?1:0)-(usefulUi.test(clean(a?.text)+' '+clean(a?.name))?1:0));
      const uiExploreLimit=auditMode==='F9_SOAK'?6:2;
      const selectedUi=[],uiBuckets=new Set();
      const uiSemantic=row=>{
        const t=(clean(row?.text)+' '+clean(row?.name)).toLowerCase();
        return /attack|공격|skill|스킬|ability|능력/.test(t)?'COMBAT'
          :/quest|퀘스트|mission|임무/.test(t)?'QUEST'
          :/reward|보상|claim|수령/.test(t)?'REWARD'
          :/shop|상점/.test(t)?'SHOP'
          :/craft|제작/.test(t)?'CRAFT'
          :/equip|장비|inventory|인벤/.test(t)?'EQUIP'
          :/retry|재도전|restart|재시작|respawn|부활/.test(t)?'RETRY':'GENERAL';
      };
      for(const row of uiCandidates){const bucket=uiSemantic(row);if(bucket!=='GENERAL'&&!uiBuckets.has(bucket)){selectedUi.push(row);uiBuckets.add(bucket)}if(selectedUi.length>=uiExploreLimit)break}
      for(const row of uiCandidates){if(selectedUi.length>=uiExploreLimit)break;if(!selectedUi.includes(row))selectedUi.push(row)}
      for(const target of selectedUi){
        if(!Number.isFinite(Number(target?.centerX))||!Number.isFinite(Number(target?.centerY)))continue;
        const beforeProbe=timelineProbes.at(-1)||initialClientProbe;
        let ok=false,afterProbe=null;
        try{
          const mouseTool=client.tool('user_mouse_input');
          const result=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,target.centerX,target.centerY));
          ok=result?.isError!==true;
          await wait(450);
          afterProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
          if(afterProbe)timelineProbes.push(afterProbe);
        }catch{}
        const effect=probeEffectSummary(beforeProbe||{},afterProbe||{});
        const semantic=uiSemantic(target);
        actions.push({id:'ui-discovered-'+clean(target?.name||target?.text||'button'),type:'mcp-ui-exploration',targetIdentity:clean(target?.path)||clean(target?.name),semantic,dispatched:true,ok,effectObserved:effect.effectObserved,effect});
      }

      const sampleCount=auditMode==='F9_SOAK'?12:4;
      const sampleDelay=auditMode==='F9_SOAK'?1200:500;
      for(let sample=0;sample<sampleCount;sample++){
        await wait(sampleDelay);
        const probe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        if(probe)timelineProbes.push(probe);
        if(sample<sampleCount-1){
          const key=sample%2===0?'W':'D';
          const result=await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,key));
          actions.push({id:'explore-'+sample+'-'+key.toLowerCase(),type:'mcp-keyboard-input',dispatched:true,ok:result?.isError!==true});
        }
      }
      checkpoint('commercial-audit-timeline-sampled',timelineProbes.length>=sampleCount-1);
    }

    if(actualPlayContract?.required===true){
      finalClientProbe=timelineProbes.at(-1)||await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
      finalServerProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Server');
      checkpoint('actual-play-final-client-probe',finalClientProbe!=null);
      checkpoint('actual-play-final-server-probe',finalServerProbe!=null);
      const evaluated=evaluateStudioActualPlayContract({contract:actualPlayContract,initialClientProbe,preActionClientProbe,postActionClientProbe,clientProbe:finalClientProbe,serverProbe:finalServerProbe,actions,beforeImages:[],afterImages:[],timelineProbes,auditProfile:auditMode,visualCaptureDeferred:true});
      scenarioCoverage=evaluated.scenarios;
      authoritativeStateChangeObserved=evaluated.authoritativeStateChangeObserved===true;
      qualityFailureKinds=evaluated.qualityFailureKinds;
      qualityFailureDetails=Array.isArray(evaluated.qualityFailureDetails)?evaluated.qualityFailureDetails:[];
      captureQuality=evaluated.capture;
      scenarioMetrics=evaluated.metrics||{};
      for(const row of scenarioCoverage)checkpoint('scenario-'+row.id,row.pass===true);

      const saveDeclared=actualPlayContract?.adaptiveCoverage?.signals?.save===true
        ||actualPlayContract?.adaptiveCoverage?.evidencePolicy?.saveRejoinPassRequired===true;
      if(auditMode==='F9_SOAK'&&saveDeclared){
        const beforePersist=persistentStateSummary(finalClientProbe||{});
        let restartOk=false;
        try{
          const restartTool=client.tool('start_stop_play');
          await client.call('start_stop_play',startStopArgs(restartTool.inputSchema||{},studioId,false));
          started=false;
          await wait(900);
          await client.call('start_stop_play',startStopArgs(restartTool.inputSchema||{},studioId,true));
          started=true;
          await wait(2800);
          rejoinClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
          restartOk=rejoinClientProbe!=null;
        }catch{}
        const afterPersist=persistentStateSummary(rejoinClientProbe||{});
        const progressionObserved=beforePersist.persistentSignalCount>0&&afterPersist.persistentSignalCount>0;
        const progressionPreserved=progressionObserved&&beforePersist.progressionFingerprint===afterPersist.progressionFingerprint;
        const inventoryComparable=beforePersist.inventory.length>0||afterPersist.inventory.length>0;
        const inventoryPreserved=!inventoryComparable||beforePersist.inventoryFingerprint===afterPersist.inventoryFingerprint;
        const pass=restartOk&&progressionPreserved&&inventoryPreserved;
        saveRejoinSummary={restartOk,progressionObserved,progressionPreserved,inventoryComparable,inventoryPreserved,before:beforePersist,after:afterPersist};
        const existingIndex=scenarioCoverage.findIndex(row=>row?.id==='adaptive-save-rejoin-persistence');
        const row={id:'adaptive-save-rejoin-persistence',pass,required:true};
        if(existingIndex>=0)scenarioCoverage[existingIndex]=row;else scenarioCoverage.push(row);
        checkpoint('scenario-adaptive-save-rejoin-persistence',pass);
        if(!pass){
          if(!qualityFailureKinds.includes('adaptive-save-rejoin-persistence'))qualityFailureKinds.push('adaptive-save-rejoin-persistence');
          qualityFailureDetails.push({
            id:'adaptive-save-rejoin-persistence',
            repairSurface:'SAVE_REJOIN',
            priority:'CRITICAL',
            hint:'F9 Studio restart did not preserve stable progression/inventory state. Repair save timing, load ordering, schema migration, or reset/duplication behavior.',
            observed:{restartOk,progressionObserved,progressionPreserved,inventoryComparable,inventoryPreserved}
          });
        }
      }
      const multiplayerDeclared=actualPlayContract?.adaptiveCoverage?.signals?.multiplayer===true;
      if(auditMode==='F9_SOAK'&&multiplayerDeclared){
        if(started){
          try{
            const stopTool=client.tool('start_stop_play');
            await client.call('start_stop_play',startStopArgs(stopTool.inputSchema||{},studioId,false));
            started=false;
            await wait(900);
          }catch{}
        }
        multiplayerAuditSummary=await runStudioMultiplayerAudit(client,studioId,actualPlayContract);
        const pass=multiplayerAuditSummary?.pass===true;
        const index=scenarioCoverage.findIndex(row=>row?.id==='adaptive-multiplayer-sync-surface');
        const row={id:'adaptive-multiplayer-sync-surface',pass,required:true};
        if(index>=0)scenarioCoverage[index]=row;else scenarioCoverage.push(row);
        checkpoint('scenario-adaptive-multiplayer-sync-surface-f9',pass);
        if(pass){
          qualityFailureKinds=qualityFailureKinds.filter(id=>id!=='adaptive-multiplayer-sync-surface');
          qualityFailureDetails=qualityFailureDetails.filter(row=>row?.id!=='adaptive-multiplayer-sync-surface');
        }else if(multiplayerAuditSummary?.infrastructureFailure===true){
          errors.push({
            type:'studio-multiplayer-harness-infrastructure',
            actionId:'studio-test-service-multiplayer',
            signature:'ROBLOX_STUDIO_MULTIPLAYER_HARNESS_PENDING:'+(multiplayerAuditSummary?.error||'UNKNOWN')
          });
        }else{
          if(!qualityFailureKinds.includes('adaptive-multiplayer-sync-surface'))qualityFailureKinds.push('adaptive-multiplayer-sync-surface');
          qualityFailureDetails=qualityFailureDetails.filter(row=>row?.id!=='adaptive-multiplayer-sync-surface');
          qualityFailureDetails.push({
            id:'adaptive-multiplayer-sync-surface',
            repairSurface:'MULTIPLAYER_SYNC',
            priority:'CRITICAL',
            hint:'F9 StudioTestService did not prove 2-client synchronization, late join, and leave recovery. Repair replicated state, player lifecycle, lobby/team sync, or server authority.',
            observed:multiplayerAuditSummary
          });
        }
      }
    }

    const consoleTool=client.tool('get_console_output');
    const consoleArgs=fillRequired((()=>{const a={};setStudioId(a,consoleTool.inputSchema||{},studioId);return a;})(),consoleTool.inputSchema||{});
    consoleResult=await client.call('get_console_output',consoleArgs);
    checkpoint('console-output-captured',true);

    characterMotionRuntime=collectCharacterMotionRuntimeEvidence(consoleResult);
    if(characterMotionRuntime.required===true){
      checkpoint('character-motion-runtime-started',characterMotionRuntime.started||characterMotionRuntime.rows.some(row=>row.state==='PASS'||row.state==='FAIL'));
      checkpoint('character-motion-runtime-pass',characterMotionRuntime.pass===true);
      if(characterMotionRuntime.pass!==true){
        errors.push({
          type:'character-motion-quality-error',
          actionId:'character-motion-runtime',
          signature:'ROBLOX_CHARACTER_MOTION_MANNEQUIN:'+(characterMotionRuntime.failureReasons.join(',')||'RUNTIME_PROBE_DID_NOT_PASS')
        });
      }
    }

    const consoleClassification=classifyStudioConsoleOutput(consoleResult);
    const consoleText=consoleClassification.consoleText;
    const diagnosticPatterns=[
      /Script Runtime Error/i,
      /Stack Begin/i,
      /attempt to index nil/i,
      /infinite yield possible/i,
      /unhandled exception/i
    ];
    const consoleLines=consoleText.split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
    const diagnosticIndexes=new Set();
    for(let index=0;index<consoleLines.length;index++){
      if(diagnosticPatterns.some(re=>re.test(consoleLines[index]))){
        for(let offset=-2;offset<=4;offset++){
          const target=index+offset;
          if(target>=0&&target<consoleLines.length)diagnosticIndexes.add(target);
        }
      }
    }
    const diagnosticLines=[...diagnosticIndexes]
      .sort((a,b)=>a-b)
      .map(index=>consoleLines[index])
      .slice(0,40);
    for(const line of diagnosticLines){
      const safe=line.replace(/\s+/g,' ').slice(0,700);
      console.log('ROBLOX_STUDIO_MCP_CONSOLE_DIAGNOSTIC='+safe);
    }
    console.log('ROBLOX_STUDIO_MCP_CONSOLE_STRUCTURED_ENTRY_COUNT='+consoleClassification.structuredEntryCount);
    console.log('ROBLOX_STUDIO_MCP_CONSOLE_WARNING_COUNT='+consoleClassification.warningCount);
    console.log('ROBLOX_STUDIO_MCP_LOCAL_UNPUBLISHED_DATASTORE_SUPPRESSED='+(consoleClassification.localUnpublishedDataStoreSuppressed===true?'YES':'NO'));
    for(const row of consoleClassification.errors)errors.push(row);
    const brokenAssets=consoleClassification.errors.filter(row=>row.type==='studio-asset-load-error');
    scenarioCoverage.push({id:'visual-asset-load-integrity',pass:brokenAssets.length===0,required:true});
    if(brokenAssets.length){
      qualityFailureKinds.push('visual-asset-load-integrity');
      qualityFailureDetails.push({
        id:'visual-asset-load-integrity',
        repairSurface:'VISUAL_ASSET_LOADING',
        priority:'HIGH',
        hint:'Repair unavailable or unauthorized Roblox mesh, texture, image, or animation assets observed during Studio play.',
        observed:{assetErrors:brokenAssets.map(row=>row.signature).slice(0,8)}
      });
    }
    checkpoint('no-release-blocking-runtime-errors',consoleClassification.errors.length===0);

    if(!started){
      try{
        await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,true));
        started=true;
        await wait(1600);
        checkpoint('final-capture-play-restored',true);
      }catch{
        checkpoint('final-capture-play-restored',false);
      }
    }

    const captureTool=client.tool('screen_capture');
    const captureArgs=fillRequired((()=>{const a={};setStudioId(a,captureTool.inputSchema||{},studioId);return a;})(),captureTool.inputSchema||{});
    const finalBefore=await client.call('screen_capture',captureArgs);
    beforeImages=collectImages(finalBefore,[]);
    await wait(250);
    const finalAfter=await client.call('screen_capture',captureArgs);
    afterImages=collectImages(finalAfter,[]);
    const captureExp=actualPlayContract?.expectations||{};
    const finalBeforeQuality=captureSanity(beforeImages,Number(captureExp.minimumCaptureWidth||320),Number(captureExp.minimumCaptureHeight||180),Number(captureExp.minimumCaptureBytes||2048));
    const finalAfterQuality=captureSanity(afterImages,Number(captureExp.minimumCaptureWidth||320),Number(captureExp.minimumCaptureHeight||180),Number(captureExp.minimumCaptureBytes||2048));
    const finalLightingBrightness=Number((rejoinClientProbe||finalClientProbe||initialClientProbe)?.lighting?.brightness||0);
    const finalVisualPass=finalBeforeQuality.pass&&finalAfterQuality.pass&&finalLightingBrightness>=Number(captureExp.minimumLightingBrightness||0);
    captureQuality={before:finalBeforeQuality,after:finalAfterQuality};
    const visualIndex=scenarioCoverage.findIndex(row=>row?.id==='visual-capture-sane');
    const visualRow={id:'visual-capture-sane',pass:finalVisualPass,required:true};
    if(visualIndex>=0)scenarioCoverage[visualIndex]=visualRow;else scenarioCoverage.push(visualRow);
    qualityFailureKinds=qualityFailureKinds.filter(id=>id!=='visual-capture-sane');
    qualityFailureDetails=qualityFailureDetails.filter(row=>row?.id!=='visual-capture-sane');
    if(!finalVisualPass){
      qualityFailureKinds.push('visual-capture-sane');
      qualityFailureDetails.push({
        id:'visual-capture-sane',
        repairSurface:'VISUAL_RUNTIME',
        priority:'HIGH',
        hint:'Final Studio capture is blank, invalid, too small, or too dark after all commercial QA completed.',
        observed:{before:finalBeforeQuality,after:finalAfterQuality,lightingBrightness:finalLightingBrightness}
      });
    }
    checkpoint('final-visual-capture-sane',finalVisualPass);
    console.log('ROBLOX_STUDIO_MCP_FINAL_CAPTURE=LAST_STUDIO_AUDIT_ACTION');

    await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));
    started=false;
    checkpoint('play-mode-stopped',true);

    const required=checkpoints.filter(x=>x.required!==false);
    const runtimeVerified=required.length>0&&required.every(x=>x.pass===true)&&errors.length===0;
    const result={
      version:1,
      authority:'roblox-official-studio-mcp-runtime',
      runtimeVerified,
      capabilities:{
        officialStudioMcp:true,
        playMode:true,
        mcpInput:true,
        screenCapture:beforeImages.length>0&&afterImages.length>0,
        consoleCapture:consoleResult!=null,
        characterMotionRuntime:characterMotionRuntime?.required===true,
        executeLuauRuntimeProbe:actualPlayContract?.required===true
      },
      auditProfile:auditMode,
      timelineProbeCount:timelineProbes.length,
      scenarioContractRequired:actualPlayContract?.required===true,
      scenarioContractVersion:Number(actualPlayContract?.version||0),
      scenarioContractFingerprint:actualPlayContract?.required===true?'sha256:'+stableSha256(actualPlayContract):null,
      scenarioCoverage,
      authoritativeStateChangeObserved,
      qualityFailureKinds,
      qualityFailureDetails,
      runtimeProbes:actualPlayContract?.required===true?{initialClient:initialClientProbe,preActionClient:preActionClientProbe,postActionClient:postActionClientProbe,finalClient:finalClientProbe,finalServer:finalServerProbe,rejoinClient:rejoinClientProbe}:null,
      saveRejoinSummary,
      multiplayerAuditSummary,
      mcp:{
        protocolVersion:client.protocolVersion,
        serverName:clean(client.serverInfo?.name),
        toolNames:[...client.tools.keys()].sort(),
        studioIdHash:hash(studioId).slice(0,16)
      },
      actions,
      checkpoints,
      errors:errors.map(({type,actionId,signature})=>({type,actionId,signature})),
      metrics:{
        beforeFrameCount:beforeImages.length,
        afterFrameCount:afterImages.length,
        distinctFrameChange:beforeImages.length>0&&afterImages.length>0&&beforeImages.map(x=>hash(Buffer.from(x.data,'base64'))).join(',')!==afterImages.map(x=>hash(Buffer.from(x.data,'base64'))).join(','),
        consoleErrorCount:consoleClassification.errors.length,
        consoleWarningCount:consoleClassification.warningCount,
        consoleStructuredEntryCount:consoleClassification.structuredEntryCount,
        characterMotionRuntimeRequired:characterMotionRuntime?.required===true,
        characterMotionRuntimePassed:characterMotionRuntime?.pass===true,
        scenarioContractRequired:actualPlayContract?.required===true,
        scenarioFailureCount:qualityFailureKinds.length,
        primaryActionDisplacement:Number(scenarioMetrics.primaryActionDisplacement||0),
        primaryActionVelocity:Number(scenarioMetrics.primaryActionVelocity||0),
        primaryActionFeedbackChanged:scenarioMetrics.primaryActionFeedbackChanged===true,
        saveRejoinRestartOk:saveRejoinSummary?.restartOk===true,
        saveRejoinProgressionPreserved:saveRejoinSummary?.progressionPreserved===true,
        saveRejoinInventoryPreserved:saveRejoinSummary?.inventoryPreserved===true,
        multiplayerAuditPass:multiplayerAuditSummary?.pass===true,
        multiplayerInitialServerCount:Number(multiplayerAuditSummary?.initialServerCount||0),
        multiplayerLateServerCount:Number(multiplayerAuditSummary?.lateServerCount||0),
        multiplayerLeavePass:multiplayerAuditSummary?.leavePass===true,
        captureQuality
      },
      characterMotionRuntime,
      rawSourceIncluded:false,
      rawGameplayValuesIncluded:false,
      rawViewportIncluded:false
    };
    if(output)writeJson(output,result);
    return result;
  }catch(error){
    let signature=clean(error?.message||error).slice(0,500);
    const settingUnknown=clean(settingState).toUpperCase()==='UNKNOWN';
    const noSettingCandidates=Number(settingCandidatePathCount)===0;
    if(
      /ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/i.test(signature)
      &&/stderrHint=STUDIO_TOOL_PROVIDER_TIMEOUT/i.test(signature)
      &&settingUnknown
      &&noSettingCandidates
    ){
      signature=(signature+':settingHint=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY').slice(0,500);
      console.log('ROBLOX_STUDIO_MCP_SETTING_HINT=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY');
    }
    const deadStart=signature.startsWith('ROBLOX_STUDIO_DEAD_CHARACTER_ABORT:');
    const missingCharacter=signature.startsWith('ROBLOX_STUDIO_MISSING_CHARACTER_ABORT:');
    const floatingWorld=signature.startsWith('ROBLOX_STUDIO_FLOATING_CHARACTER_ABORT:');
    const blockingOverlay=signature.startsWith('ROBLOX_STUDIO_BLOCKING_OVERLAY_ABORT:');
    const missingStartAction=signature.startsWith('ROBLOX_STUDIO_START_ACTION_ABORT:');
    if(missingCharacter){
      scenarioCoverage.push({id:'character-camera-ready',pass:false,required:true});
      qualityFailureKinds.push('character-camera-ready');
      qualityFailureDetails.push({
        id:'character-camera-ready',
        repairSurface:'CHARACTER_BOOT',
        priority:'CRITICAL',
        hint:'The local player remained without a character after the start flow and a second spawn probe. Repair CharacterAutoLoads, LoadCharacter timing, spawn location, and character creation before full Studio QA.',
        observed:{playerPresent:true,characterPresent:false,humanoidPresent:false,rootPresent:false}
      });
      errors.push({type:'studio-product-character-spawn-error',actionId:'initial-character-spawned',signature});
    }else if(deadStart){
      scenarioCoverage.push({id:'adaptive-start-playability',pass:false,required:true});
      qualityFailureKinds.push('adaptive-start-playability');
      qualityFailureDetails.push({
        id:'adaptive-start-playability',
        repairSurface:'GAME_START',
        priority:'CRITICAL',
        hint:'Studio started with a dead/unplayable character. Restore healthy spawn/respawn/start state before normal gameplay QA.',
        observed:{
          characterPresent:initialClientProbe?.player?.characterPresent===true,
          humanoidPresent:initialClientProbe?.player?.humanoidPresent===true,
          health:Number(initialClientProbe?.player?.health),
          maxHealth:Number(initialClientProbe?.player?.maxHealth),
          humanoidState:clean(initialClientProbe?.player?.humanoidState)
        }
      });
      errors.push({type:'studio-product-start-playability-error',actionId:'initial-character-playable',signature});
    }else if(missingStartAction){
      scenarioCoverage.push({id:'adaptive-start-playability',pass:false,required:true});
      qualityFailureKinds.push('adaptive-start-playability');
      qualityFailureDetails.push({
        id:'adaptive-start-playability',
        repairSurface:Number(preActionClientProbe?.ui?.largeBlockingOverlayCount||0)>0?'MOBILE_UI':'GAME_START',
        priority:'CRITICAL',
        hint:'The declared start action never became visible after the start-gate probe window. Restore an actionable start control before full Studio QA.',
        observed:{
          requiredButtonText:clean(actualPlayContract.primaryActionButtonText),
          visibleButtons:Number(preActionClientProbe?.ui?.visibleButtons||0),
          largeBlockingOverlayCount:Number(preActionClientProbe?.ui?.largeBlockingOverlayCount||0)
        }
      });
      errors.push({type:'studio-product-start-action-error',actionId:'ui-primary-action',signature});
    }else if(blockingOverlay){
      scenarioCoverage.push({id:'adaptive-ui-blocking-overlay',pass:false,required:true});
      qualityFailureKinds.push('adaptive-ui-blocking-overlay');
      qualityFailureDetails.push({
        id:'adaptive-ui-blocking-overlay',
        repairSurface:'MOBILE_UI',
        priority:'CRITICAL',
        hint:'A persistent large modal or guide obscures the start controls. Restore a visible actionable close/start control and playable viewport before further Studio QA.',
        observed:{
          largeBlockingOverlayCount:Number(postActionClientProbe?.ui?.largeBlockingOverlayCount||0),
          largestOverlayCoverage:Number(postActionClientProbe?.ui?.largestOverlayCoverage||0),
          primaryActionDispatched:actions.some(row=>row.id==='ui-primary-action'&&row.ok===true)
        }
      });
      errors.push({type:'studio-product-ui-blocking-error',actionId:'initial-ui-playability',signature});
    }else if(floatingWorld){
      scenarioCoverage.push({id:'adaptive-world-safety',pass:false,required:true});
      qualityFailureKinds.push('adaptive-world-safety');
      qualityFailureDetails.push({
        id:'adaptive-world-safety',
        repairSurface:'WORLD_GEOMETRY',
        priority:'CRITICAL',
        hint:'Spawned character has no walkable floor; restore the world floor and spawn collision before further Studio QA.',
        observed:{
          floorBelowPlayer:initialClientProbe?.world?.floorBelowPlayer===true,
          floorSampleCount:Number(initialClientProbe?.world?.floorSampleCount||0),
          floorHitCount:Number(initialClientProbe?.world?.floorHitCount||0),
          collidablePartCount:Number(initialClientProbe?.world?.collidablePartCount||0)
        }
      });
      errors.push({type:'studio-product-world-geometry-error',actionId:'floating-character-map-readiness',signature});
    }else{
      errors.push({type:'studio-mcp-infrastructure-or-runtime-error',actionId:null,signature});
    }
    if(started&&studioId&&client.tools.has('start_stop_play')){
      try{const tool=client.tool('start_stop_play');await client.call('start_stop_play',startStopArgs(tool.inputSchema||{},studioId,false));}catch{}
    }
    const result={
      version:1,
      authority:'roblox-official-studio-mcp-runtime',
      runtimeVerified:false,
      capabilities:{officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false,characterMotionRuntime:false,executeLuauRuntimeProbe:false},
      scenarioContractRequired:actualPlayContract?.required===true,
      scenarioContractVersion:Number(actualPlayContract?.version||0),
      scenarioContractFingerprint:actualPlayContract?.required===true?'sha256:'+stableSha256(actualPlayContract):null,
      scenarioCoverage,authoritativeStateChangeObserved,qualityFailureKinds,qualityFailureDetails,
      actions,checkpoints,errors,
      metrics:{beforeFrameCount:beforeImages.length,afterFrameCount:afterImages.length,distinctFrameChange:false,consoleErrorCount:errors.length},
      rawSourceIncluded:false,rawGameplayValuesIncluded:false,rawViewportIncluded:false
    };
    if(output)writeJson(output,result);
    throw error;
  }finally{
    client.close();
  }
}

export function createLocalStudioPlayEvidence({
  item={},runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt=new Date().toISOString()
}={}){
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const internalRelease=item?.robloxInternalReleaseEvidence||{};
  const sourceRevision=clean(expected?.sourceRevision);
  const artifactIdentity=clean(expected?.artifactIdentity);
  const artifactRunId=Number(expected?.artifactRunId||0);
  const universeId=String(expected?.universeId||'');
  const placeId=String(expected?.placeId||'');
  const versionNumber=Number(expected?.versionNumber||0);
  const localF0=item?.robloxFoundationF0Evidence||{};
  const localF0MatchesExpected=Boolean(
    candidate?.published!==true
    &&item?.robloxFoundationF0Passed===true
    &&item?.robloxBuildPreflightPassed===true
    &&item?.robloxBuildOrPackagePassed===true
    &&clean(item?.robloxBuildSourceRevision)===sourceRevision
    &&clean(localF0?.sourceRevision)===sourceRevision
    &&clean(localF0?.artifactIdentity)===artifactIdentity
    &&Number(localF0?.artifactRunId||0)===artifactRunId
    &&artifactRunId>0
    &&universeId===''
    &&placeId===''
    &&versionNumber===artifactRunId
  );
  const candidateMatchesExpected=Boolean(
    (
      candidate?.published===true
      &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
      &&clean(candidate?.sourceRevision)===sourceRevision
      &&clean(candidate?.artifactIdentity)===artifactIdentity
      &&Number(candidate?.artifactRunId||0)===artifactRunId
      &&String(candidate?.universeId||'')===universeId
      &&String(candidate?.placeId||'')===placeId
      &&Number(candidate?.versionNumber||0)===versionNumber
    )
    ||localF0MatchesExpected
  );
  const currentSourceArtifactBinding=Boolean(
    clean(item?.robloxSourceCommit)===sourceRevision
    &&clean(item?.robloxBuildArtifactIdentity)===artifactIdentity
  );
  const runtimeFoundationExact=Boolean(
    currentSourceArtifactBinding
    &&candidateMatchesExpected
    &&runtimeFoundationObserved(item,candidate)
  );
  const runtimeFoundationEvidence=item?.robloxRuntimeFoundationEvidence||{};
  const exactEngineVersionAwaitingRealServerBoot=Boolean(
    currentSourceArtifactBinding
    &&candidateMatchesExpected
    &&item?.robloxRuntimeFoundationPassed!==true
    &&clean(runtimeFoundationEvidence?.authority)==='exact-engine-version-awaiting-real-server-boot'
    &&clean(runtimeFoundationEvidence?.sourceRevision)===sourceRevision
    &&clean(runtimeFoundationEvidence?.artifactIdentity)===artifactIdentity
    &&String(runtimeFoundationEvidence?.placeId||'')===placeId
    &&Number(runtimeFoundationEvidence?.candidateVersionNumber||0)===versionNumber
    &&runtimeFoundationEvidence?.engineExecuted===true
    &&runtimeFoundationEvidence?.exactEngineVersion===true
    &&runtimeFoundationEvidence?.serverBootObserved!==true
  );
  const currentInternalReleaseExact=internalReleaseObserved(item,candidate);
  const currentExactPrivateCandidate=Boolean(
    currentSourceArtifactBinding
    &&candidateMatchesExpected
  );
  const currentExactPublishedArtifact=currentExactPrivateCandidate;
  const historicalExactPublishedArtifact=Boolean(
    !currentSourceArtifactBinding
    &&candidateMatchesExpected
    &&internalRelease?.published===true
    &&clean(internalRelease?.sourceRevision)===sourceRevision
    &&clean(internalRelease?.artifactIdentity)===artifactIdentity
    &&Number(internalRelease?.artifactRunId||0)===artifactRunId
    &&String(internalRelease?.universeId||'')===universeId
    &&String(internalRelease?.placeId||'')===placeId
    &&Number(internalRelease?.versionNumber||0)===versionNumber
  );
  if(!currentExactPublishedArtifact&&!historicalExactPublishedArtifact)throw new Error('ROBLOX_STUDIO_MCP_CANDIDATE_STALE');
  if(clean(runtime?.authority)!=='roblox-official-studio-mcp-runtime')throw new Error('ROBLOX_STUDIO_MCP_RUNTIME_AUTHORITY_INVALID');

  const actions=(Array.isArray(runtime?.actions)?runtime.actions:[]).map(row=>({
    id:clean(row?.id),
    type:clean(row?.type),
    dispatched:row?.dispatched===true,
    ok:row?.ok===true
  })).filter(row=>row.id&&row.type);
  const checkpoints=(Array.isArray(runtime?.checkpoints)?runtime.checkpoints:[]).map(row=>({
    id:clean(row?.id),
    name:clean(row?.name||row?.id),
    required:row?.required!==false,
    pass:row?.pass===true
  })).filter(row=>row.id);
  const errors=(Array.isArray(runtime?.errors)?runtime.errors:[]).map(row=>({
    type:clean(row?.type||'runtime-error'),
    actionId:clean(row?.actionId)||null,
    signature:clean(row?.signature)||null
  })).filter(row=>row.type);
  const required=checkpoints.filter(row=>row.required!==false);
  const dispatched=actions.some(row=>row.dispatched===true&&row.ok===true);
  const officialMcp=runtime?.capabilities?.officialStudioMcp===true;
  const playMode=runtime?.capabilities?.playMode===true;
  const mcpInput=runtime?.capabilities?.mcpInput===true;
  const screenCapture=runtime?.capabilities?.screenCapture===true;
  const consoleCapture=runtime?.capabilities?.consoleCapture===true;
  const screenChanged=runtime?.metrics?.distinctFrameChange===true;
  const characterMotionRuntime=runtime?.characterMotionRuntime&&typeof runtime.characterMotionRuntime==='object'?runtime.characterMotionRuntime:null;
  const characterMotionRequired=characterMotionRuntime?.required===true;
  const characterMotionPass=!characterMotionRequired||characterMotionRuntime?.pass===true;
  const actualPlay=officialMcp&&playMode&&mcpInput&&screenCapture&&consoleCapture;
  const requiredPass=required.length>0&&required.every(row=>row.pass===true);
  const basePass=Boolean(
    studioStepSucceeded===true
    &&actualPlay
    &&runtime?.runtimeVerified===true
    &&dispatched
    &&screenChanged
    &&requiredPass
    &&characterMotionPass
    &&errors.length===0
  );
  const scenarioCoverage=(Array.isArray(runtime?.scenarioCoverage)?runtime.scenarioCoverage:[]).map(row=>({id:clean(row?.id||row?.name),pass:row?.pass===true})).filter(row=>row.id);
  const scenarioContractRequired=runtime?.scenarioContractRequired===true;
  const scenarioCoveragePass=scenarioCoverage.length>0&&scenarioCoverage.every(row=>row.pass===true);
  const scenarioContractPass=!scenarioContractRequired||scenarioCoveragePass;
  const scenarioContractVersion=Number(runtime?.scenarioContractVersion||0);
  const scenarioContractFingerprint=clean(runtime?.scenarioContractFingerprint)||null;
  const qualityFailureKinds=(Array.isArray(runtime?.qualityFailureKinds)?runtime.qualityFailureKinds:[]).map(clean).filter(Boolean).slice(0,48);
  const qualityFailureDetails=(Array.isArray(runtime?.qualityFailureDetails)?runtime.qualityFailureDetails:[]).map(row=>({
    id:clean(row?.id),
    repairSurface:clean(row?.repairSurface)||'ROBLOX_PRODUCT_QUALITY',
    priority:clean(row?.priority)||'HIGH',
    hint:clean(row?.hint).slice(0,320),
    observed:row?.observed&&typeof row.observed==='object'?row.observed:{}
  })).filter(row=>row.id).slice(0,48);
  const pass=basePass&&scenarioContractPass;
  const productFailureObserved=Boolean(
    qualityFailureKinds.length>0
    ||qualityFailureDetails.length>0
    ||errors.some(row=>/^studio-product-/i.test(clean(row?.type)))
  );
  const infrastructureSignal=errors.some(row=>/infrastructure|mcp.*missing|no_studio/i.test(row.type+' '+(row.signature||'')));
  const infrastructureFailure=!productFailureObserved&&infrastructureSignal;
  const studioMcpServerEnablementRequired=errors.some(row=>{
    const signature=clean(row.signature||'');
    return /ROBLOX_STUDIO_MCP_SETTING_ENABLE/i.test(signature)
      ||(/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/i.test(signature)&&/stderrHint=MCP_SERVER_NOT_ENABLED/i.test(signature))
      ||(/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/i.test(signature)&&/settingHint=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY/i.test(signature));
  });
  const failureClass=pass?null
    :productFailureObserved?'STUDIO_PRODUCT_QUALITY_FAILURE'
    :infrastructureFailure?'STUDIO_MCP_INFRASTRUCTURE_PENDING'
    :errors.length?'STUDIO_MCP_RUNTIME_ERROR'
    :required.some(row=>row.pass!==true)?'STUDIO_MCP_REQUIRED_CHECKPOINT_FAILURE'
    :!dispatched?'STUDIO_MCP_INPUT_NOT_OBSERVED'
    :!screenChanged?'STUDIO_MCP_VIEWPORT_NOT_CHANGED'
    :'STUDIO_MCP_LOCAL_PLAY_FAILED';
  const nativeFailureText=[
    ...errors.map(row=>[row.type,row.actionId,row.signature].filter(Boolean).join(' ')),
    ...checkpoints.filter(row=>row.pass!==true).map(row=>row.name||row.id),
    ...actions.filter(row=>row.ok!==true).map(row=>row.type||row.id)
  ].join(' ');
  const robloxFailureClass=pass?null
    :/DataStore|GetDataStore|SetAsync|UpdateAsync|save|load/i.test(nativeFailureText)?'ROBLOX_DATASTORE_SAVE_LOAD'
    :/RemoteEvent|RemoteFunction|OnServer|FireServer|InvokeServer|remote/i.test(nativeFailureText)?'ROBLOX_REMOTE_EVENT_OR_FUNCTION'
    :/touch|input|keyboard|mouse|button/i.test(nativeFailureText)?'ROBLOX_TOUCH_INPUT'
    :/ROBLOX_CHARACTER_MOTION_MANNEQUIN|character-motion-quality|joint|animator|animation/i.test(nativeFailureText)?'ROBLOX_CHARACTER_MOTION_MANNEQUIN'
    :/character|humanoid|respawn|spawn/i.test(nativeFailureText)?'ROBLOX_CHARACTER_RESPAWN_STATE'
    :/gui|ui|screen|viewport/i.test(nativeFailureText)?'ROBLOX_UI_STATE'
    :/replic|sync|multiplayer|join|rejoin|late.?join/i.test(nativeFailureText)?'ROBLOX_MULTIPLAYER_SYNC'
    :/server|client|authority/i.test(nativeFailureText)?'ROBLOX_SERVER_CLIENT_BOUNDARY'
    :'ROBLOX_STUDIO_RUNTIME';
  const functionalChainEvidence={
    inputDispatched:dispatched,
    runtimeVerified:runtime?.runtimeVerified===true,
    screenChanged,
    authoritativeStateChangeObserved:runtime?.authoritativeStateChangeObserved===true,
    exactScenarioObserved:scenarioCoverage.length>0
  };
  const learningSignals=[
    'roblox official studio mcp local runtime',
    ...actions.filter(row=>row.ok===true).map(row=>clean(row.type||row.id||'input')),
    ...checkpoints.filter(row=>row.pass===true).map(row=>clean(row.name||row.id||'checkpoint')),
    ...(errors.length?['debugging','runtime error']:[])
  ].filter(Boolean).slice(0,40);

  return{
    pass,
    evidence:{
      version:2,
      gameId:clean(item?.gameId),
      authority:'roblox-official-studio-mcp-runtime',
      pass,
      actualPlay,
      runtimeVerified:runtime?.runtimeVerified===true,
      learningReusable:!infrastructureFailure&&(pass||errors.length>0||required.some(row=>row.pass!==true)),
      learningScope:'STRUCTURED_VERIFIED_QA_FACTS_ONLY',
      infrastructureFailure,
      failureClass,
      robloxFailureClass,
      actualPlayEligibility:runtimeFoundationExact?'RUNTIME_FOUNDATION_PASS':exactEngineVersionAwaitingRealServerBoot?'EXACT_ENGINE_VERSION_AWAITING_REAL_SERVER_BOOT':(currentInternalReleaseExact||historicalExactPublishedArtifact)?'INTERNAL_RELEASE_OR_HISTORICAL_REPLAY':'PRIVATE_INTERNAL_CANDIDATE_EXACT',
      studioMcpServerEnablementRequired,
      operatorPrerequisite:studioMcpServerEnablementRequired?'ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT':null,
      localPlaceFile:true,
      officialStudioMcp:true,
      onlinePlaceDirectOpen:false,
      robloxPlayerAutomation:false,
      externalGuiAutomation:false,
      undocumentedStudioCliAutomation:false,
      studioLaunchTarget:'LOCAL_EXACT_BUILD_ARTIFACT',
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId,
      placeId,
      versionNumber,
      historicalSharedTargetExactArtifact:item?.robloxSharedTargetCurrent!==true,
      historicalExactBuildReplay:historicalExactPublishedArtifact,
      currentSourceArtifactBinding,
      currentPublishedRuntimeClaim:false,
      publishedCandidateCrossCheckPassed:true,
      publishedCandidateCrossCheckAuthority:'COMPANY_RUNTIME_PLUS_OPEN_CLOUD_PUBLICATION_EVIDENCE',
      capabilities:{officialStudioMcp:officialMcp,playMode,mcpInput,screenCapture,consoleCapture},
      actions,
      checkpoints,
      errors,
      runtimeSummary:{
        consoleErrorCount:Number(runtime?.metrics?.consoleErrorCount||0),
        consoleWarningCount:Number(runtime?.metrics?.consoleWarningCount||0),
        distinctFrameChange:screenChanged,
        characterMotionRuntimeRequired:characterMotionRequired,
        characterMotionRuntimePassed:characterMotionPass,
        scenarioContractRequired,
        scenarioFailureCount:qualityFailureKinds.length,
        primaryActionDisplacement:Number(runtime?.metrics?.primaryActionDisplacement||0),
        primaryActionVelocity:Number(runtime?.metrics?.primaryActionVelocity||0),
        primaryActionFeedbackChanged:runtime?.metrics?.primaryActionFeedbackChanged===true,
        commercialAudit:{
          auditProfile:clean(runtime?.metrics?.auditProfile||runtime?.auditProfile||'FAST_DEEP'),
          timelineProbeCount:Number(runtime?.metrics?.timelineProbeCount||runtime?.timelineProbeCount||0),
          progressChanged:runtime?.metrics?.progressChanged===true,
          inventoryChanged:runtime?.metrics?.inventoryChanged===true,
          timelineProgressChanged:runtime?.metrics?.timelineProgressChanged===true,
          timelineMobDynamic:runtime?.metrics?.timelineMobDynamic===true,
          timelineCompanionDynamic:runtime?.metrics?.timelineCompanionDynamic===true,
          uiCommercial:runtime?.metrics?.uiCommercial&&typeof runtime.metrics.uiCommercial==='object'?runtime.metrics.uiCommercial:{},
          surfaces:runtime?.metrics?.surfaces&&typeof runtime.metrics.surfaces==='object'?runtime.metrics.surfaces:{},
          performance:runtime?.metrics?.performance&&typeof runtime.metrics.performance==='object'?runtime.metrics.performance:{},
          multiplayer:runtime?.multiplayerAuditSummary?{
            version:Number(runtime.multiplayerAuditSummary.version||0),
            sessionHash:clean(runtime.multiplayerAuditSummary.sessionHash),
            pass:runtime.multiplayerAuditSummary.pass===true,
            bothClientsStatePass:runtime.multiplayerAuditSummary.bothClientsStatePass===true,
            survivorStatePass:runtime.multiplayerAuditSummary.survivorStatePass===true,
            replacementJoinPass:runtime.multiplayerAuditSummary.replacementJoinPass===true,
            verificationScope:clean(runtime.multiplayerAuditSummary.verificationScope),
            sameUserRejoinVerified:false
          }:null,
          saveRejoin:runtime?.saveRejoinSummary&&typeof runtime.saveRejoinSummary==='object'?{
            restartOk:runtime.saveRejoinSummary.restartOk===true,
            progressionObserved:runtime.saveRejoinSummary.progressionObserved===true,
            progressionPreserved:runtime.saveRejoinSummary.progressionPreserved===true,
            inventoryComparable:runtime.saveRejoinSummary.inventoryComparable===true,
            inventoryPreserved:runtime.saveRejoinSummary.inventoryPreserved===true
          }:null
        }
      },
      characterMotionRuntime:characterMotionRuntime?{
        required:characterMotionRequired,
        observed:characterMotionRuntime.observed===true,
        started:characterMotionRuntime.started===true,
        pass:characterMotionRuntime.pass===true,
        failed:characterMotionRuntime.failed===true,
        failureReasons:Array.isArray(characterMotionRuntime.failureReasons)?characterMotionRuntime.failureReasons.slice(0,8):[],
        hardFailure:clean(characterMotionRuntime.hardFailure)||null
      }:null,
      learningSignals:[...new Set([...learningSignals,robloxFailureClass].map(clean).filter(Boolean))],
      rawSourceIncluded:false,
      rawGameplayValuesIncluded:false,
      rawViewportIncluded:false,
      scenarioContractRequired,
      scenarioContractVersion,
      scenarioContractFingerprint,
      scenarioCoverage,
      scenarioCoveragePass,
      qualityFailureKinds,
      qualityFailureDetails,
      functionalChainEvidence,
      testedAt,
      workflowRunId:Number(workflowRunId||0),
      publicationAuthority:false,
      publicationTargetDiscovery:false
    }
  };
}

function commercialBaselineRegressions(priorEvidence={},nextEvidence={}){
  if(priorEvidence?.pass!==true)return[];
  const prior=priorEvidence?.runtimeSummary?.commercialAudit||{};
  const next=nextEvidence?.runtimeSummary?.commercialAudit||{};
  const before=prior?.surfaces&&typeof prior.surfaces==='object'?prior.surfaces:{};
  const after=next?.surfaces&&typeof next.surfaces==='object'?next.surfaces:{};
  const protectedSurfaces=[
    ['interactionSurfaceCount','INTERACTION_CHAIN'],
    ['progressionSurfaceCount','PROGRESSION'],
    ['combatSurfaceCount','COMBAT_AI'],
    ['npcSurfaceCount','NPC'],
    ['companionSurfaceCount','COMPANION_AI'],
    ['itemSurfaceCount','ITEM_INVENTORY'],
    ['remoteCount','SERVER_CLIENT_BOUNDARY'],
    ['soundCount','AUDIO'],
    ['effectCount','VFX_FEEDBACK'],
    ['promptCount','INTERACTION_CHAIN']
  ];
  const regressions=[];
  for(const [key,repairSurface] of protectedSurfaces){
    const oldValue=Number(before?.[key]||0),newValue=Number(after?.[key]||0);
    if(oldValue>0&&newValue===0){
      regressions.push({
        id:'commercial-regression-'+key,
        repairSurface,
        priority:'CRITICAL',
        hint:'Previously verified Studio capability disappeared from the new source. Restore it or update the explicit product contract if removal was intentional.',
        observed:{previous:oldValue,current:newValue}
      });
    }
  }
  const priorUi=prior?.uiCommercial||{},nextUi=next?.uiCommercial||{};
  for(const key of ['offscreenButtons','undersizedTouchButtons','textOverflowButtons']){
    const oldValue=Number(priorUi?.[key]||0),newValue=Number(nextUi?.[key]||0);
    if(newValue>oldValue&&newValue>0){
      regressions.push({
        id:'commercial-regression-ui-'+key,
        repairSurface:'MOBILE_UI',
        priority:'HIGH',
        hint:'Mobile UI regression increased compared with the last verified Studio baseline.',
        observed:{previous:oldValue,current:newValue}
      });
    }
  }
  return regressions.slice(0,24);
}

export function applyLocalStudioPlayResult({queue={},gameId='',runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt}={}){
  const item=(queue?.items||[]).find(row=>clean(row?.gameId)===clean(gameId));
  if(!item)throw new Error('ROBLOX_STUDIO_MCP_QUEUE_ITEM_MISSING:'+clean(gameId));
  const priorStudioEvidence=item?.robloxInternalVibePlayEvidence&&typeof item.robloxInternalVibePlayEvidence==='object'
    ?structuredClone(item.robloxInternalVibePlayEvidence):{};
  const result=createLocalStudioPlayEvidence({item,runtime,expected,workflowRunId,studioStepSucceeded,testedAt});
  const currentSourceArtifactBinding=result.evidence.currentSourceArtifactBinding===true;
  const commercialRegressions=currentSourceArtifactBinding?commercialBaselineRegressions(priorStudioEvidence,result.evidence):[];
  if(commercialRegressions.length&&!result.evidence.infrastructureFailure){
    result.pass=false;
    result.evidence.pass=false;
    result.evidence.failureClass='STUDIO_COMMERCIAL_REGRESSION';
    result.evidence.robloxFailureClass='ROBLOX_COMMERCIAL_REGRESSION';
    result.evidence.scenarioCoveragePass=false;
    result.evidence.qualityFailureKinds=[
      ...new Set([...(result.evidence.qualityFailureKinds||[]),...commercialRegressions.map(row=>row.id)])
    ].slice(0,48);
    result.evidence.qualityFailureDetails=[
      ...(result.evidence.qualityFailureDetails||[]),
      ...commercialRegressions
    ].slice(0,48);
    result.evidence.commercialRegressionDetected=true;
    result.evidence.commercialRegressionDetails=commercialRegressions;
  }else{
    result.evidence.commercialRegressionDetected=false;
    result.evidence.commercialRegressionDetails=[];
  }

  item.robloxInternalVibePlayEvidence=result.evidence;

  if(!currentSourceArtifactBinding){
    item.robloxInternalPlaytestPassed=false;
    item.robloxInternalPlaytestPassedAt=null;
    item.robloxStudioLocalPlayInfrastructurePending=result.evidence.infrastructureFailure===true;
    item.updatedAt=result.evidence.testedAt;
    queue.updatedAt=result.evidence.testedAt;
    return{queue,item,result};
  }

  item.robloxInternalPlaytestPassed=result.pass;
  item.robloxInternalPlaytestPassedAt=result.pass?result.evidence.testedAt:null;
  item.robloxStudioLocalPlayRepairRequired=!result.pass&&!result.evidence.infrastructureFailure;
  item.robloxStudioLocalPlayInfrastructurePending=result.evidence.infrastructureFailure===true;
  if(result.pass){
    item.robloxQualityBuildUpRequired=false;
    item.robloxQualityFailureClass=null;
    item.robloxQualityBuildUpSourceRevision=null;
    item.robloxQualityBuildUpEvidence=null;
    item.robloxQualityBuildUpLastPassedAt=result.evidence.testedAt;
    item.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.canonicalState='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.robloxLastSuccessfulStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureStage=null;
    item.robloxFailureSignature=null;
    item.robloxNativeFailureClass=null;
    item.routingBlockers=[];
  }else if(result.evidence.infrastructureFailure){
    if(item.robloxQualityBuildUpRequired!==true)item.robloxQualityFailureClass='INFRASTRUCTURE_OR_EVIDENCE_ONLY';
    item.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.canonicalState='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.robloxFailureStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureSignature='ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING';
    item.routingBlockers=['roblox-studio-mcp-infrastructure-pending'];
  }else{
    const qualityFailureSignature=result.evidence.qualityFailureKinds?.length?'ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT_FAILED':result.evidence.errors.length?'ROBLOX_STUDIO_MCP_RUNTIME_ERROR':'ROBLOX_STUDIO_MCP_PLAY_CHECKPOINT_FAILED';
    item.robloxQualityBuildUpRequired=true;
    item.robloxQualityFailureClass='PRODUCT';
    item.robloxQualityBuildUpSourceRevision=clean(item.robloxSourceCommit)||clean(result.evidence.sourceRevision);
    item.robloxQualityBuildUpEvidence={
      version:1,
      sourceRevision:item.robloxQualityBuildUpSourceRevision,
      artifactIdentity:clean(result.evidence.artifactIdentity),
      versionNumber:Number(result.evidence.versionNumber||0),
      failureStage:'VIBE_INTERNAL_PLAY',
      failureSignature:qualityFailureSignature,
      qualityFailureKinds:Array.isArray(result.evidence.qualityFailureKinds)?result.evidence.qualityFailureKinds.slice(0,48):[],
      qualityFailureDetails:Array.isArray(result.evidence.qualityFailureDetails)?result.evidence.qualityFailureDetails.slice(0,48):[],
      repairSurfaces:[...new Set((result.evidence.qualityFailureDetails||[]).map(row=>clean(row?.repairSurface)).filter(Boolean))].slice(0,24),
      robloxFailureClass:result.evidence.robloxFailureClass||null,
      testedAt:result.evidence.testedAt,
      workflowRunId:Number(result.evidence.workflowRunId||0),
      authority:'roblox-official-studio-mcp-product-quality-failure'
    };
    item.currentStep='REPAIR_REQUIRED';
    item.canonicalState='REPAIR_REQUIRED';
    item.robloxFailureStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureSignature=qualityFailureSignature;
    item.robloxNativeFailureClass=result.evidence.robloxFailureClass||null;
    item.routingBlockers=['roblox-studio-mcp-play-repair-required'];
  }
  item.robloxPublicReleaseReady=false;
  item.robloxPublicRelease=false;
  item.robloxReleaseClaim=false;
  item.updatedAt=result.evidence.testedAt;
  queue.updatedAt=result.evidence.testedAt;
  return{queue,item,result};
}
function args(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

async function main(){
  const a=args();
  const mode=clean(a.mode);
  if(mode==='diagnose-setting'){
    const result=detectStudioMcpAssistantSetting({settingsRoot:clean(a['settings-root'])});
    if(clean(a.output))writeJson(a.output,result);
    console.log('ROBLOX_STUDIO_MCP_SETTING_ENABLED='+result.state);
    console.log('ROBLOX_STUDIO_MCP_SETTING_FILE_COUNT='+result.fileCount);
    console.log('ROBLOX_STUDIO_MCP_SETTING_ENABLED_COUNT='+result.enabledCount);
    console.log('ROBLOX_STUDIO_MCP_SETTING_DISABLED_COUNT='+result.disabledCount);
    console.log('ROBLOX_STUDIO_MCP_SETTING_PARSE_ERROR_COUNT='+result.parseErrorCount);
    console.log('ROBLOX_STUDIO_MCP_SETTING_MUTATION=NO');
    return;
  }
  if(mode==='plan'){
    const matrix=planLocalStudioCandidates({
      queue:readJson(a.queue),
      roadmap:readJson(a.roadmap),
      requestedGameId:clean(a['game-id']),
      repoRoot:clean(a['repo-root'])
    });
    writeJson(a.output,matrix);
    console.log('ROBLOX_STUDIO_MCP_PLAN_COUNT='+matrix.include.length);
    return;
  }
  if(mode==='mcp-run'){
    const headGuard=assertCurrentStudioWorkflowHead();
    console.log('ROBLOX_STUDIO_WORKFLOW_HEAD_FRESH=YES:'+headGuard.checkoutSha);
    const result=await runOfficialStudioMcpPlay({
      mcpCommand:clean(a['mcp-command']),
      output:clean(a.output),
      expectedStudioName:clean(a['studio-name']),
      timeoutMs:Number(a.timeout||45000),
      toolAttempts:Number(a['tool-attempts']||5),
      toolDelayMs:Number(a['tool-delay-ms']||1000),
      settingState:clean(a['setting-state']),
      settingCandidatePathCount:Number(a['setting-candidate-path-count']??-1),
      actualPlayContractPath:clean(a['actual-play-contract']),
      auditProfile:clean(a['audit-profile']||'FAST_DEEP')
    });
    const checkpointSummary=(Array.isArray(result?.checkpoints)?result.checkpoints:[])
      .map(row=>clean(row?.id)+':'+(row?.pass===true?'PASS':'FAIL'))
      .filter(Boolean)
      .join(',');
    const failedCheckpoints=(Array.isArray(result?.checkpoints)?result.checkpoints:[])
      .filter(row=>row?.required!==false&&row?.pass!==true)
      .map(row=>clean(row?.id))
      .filter(Boolean);
    const actionSummary=(Array.isArray(result?.actions)?result.actions:[])
      .map(row=>clean(row?.id)+':'+(row?.ok===true?'PASS':'FAIL'))
      .filter(Boolean)
      .join(',');
    console.log('ROBLOX_STUDIO_MCP_CHECKPOINTS='+(checkpointSummary||'NONE'));
    console.log('ROBLOX_STUDIO_MCP_ACTIONS='+(actionSummary||'NONE'));
    console.log('ROBLOX_STUDIO_MCP_VIEWPORT_BEFORE_FRAMES='+Number(result?.metrics?.beforeFrameCount||0));
    console.log('ROBLOX_STUDIO_MCP_VIEWPORT_AFTER_FRAMES='+Number(result?.metrics?.afterFrameCount||0));
    console.log('ROBLOX_STUDIO_MCP_VIEWPORT_CHANGED='+(result?.metrics?.distinctFrameChange===true?'YES':'NO'));
    console.log('ROBLOX_STUDIO_MCP_CONSOLE_ERROR_COUNT='+Number(result?.metrics?.consoleErrorCount||0));
    console.log('ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT='+(result?.scenarioContractRequired===true?'REQUIRED':'NOT_DECLARED'));
    console.log('ROBLOX_STUDIO_MCP_SCENARIOS='+(Array.isArray(result?.scenarioCoverage)?result.scenarioCoverage.map(row=>clean(row?.id)+':'+(row?.pass===true?'PASS':'FAIL')).join(','):'NONE'));
    console.log('ROBLOX_STUDIO_MCP_QUALITY_FAILURES='+(Array.isArray(result?.qualityFailureKinds)&&result.qualityFailureKinds.length?result.qualityFailureKinds.join(','):'NONE'));
    console.log('ROBLOX_CHARACTER_MOTION_RUNTIME_REQUIRED='+(result?.characterMotionRuntime?.required===true?'YES':'NO'));
    console.log('ROBLOX_CHARACTER_MOTION_RUNTIME_RESULT='+(result?.characterMotionRuntime?.required===true?(result?.characterMotionRuntime?.pass===true?'PASS':'FAIL'):'NOT_APPLICABLE'));
    const runtimeErrorCount=Number(Array.isArray(result?.errors)?result.errors.length:0);
    console.log('ROBLOX_STUDIO_MCP_RUNTIME='+(result.runtimeVerified?'PASS':'FAIL'));
    console.log('ROBLOX_STUDIO_MCP_SESSION_COMPLETED=YES');
    if(!result.runtimeVerified){
      console.log('ROBLOX_STUDIO_MCP_RUNTIME_FAILURE_PERSIST_REQUIRED=YES');
      console.log(
        'ROBLOX_STUDIO_MCP_RUNTIME_FAILURE_SUMMARY:failed='
        +(failedCheckpoints.join(',')||'NONE')
        +':errors='+runtimeErrorCount
      );
    }
    return;
  }
  if(mode==='persist'){
    const queue=readJson(a.queue);
    const runtime=readJson(a.runtime);
    const expected={
      sourceRevision:clean(a['source-revision']),
      artifactIdentity:clean(a['artifact-identity']),
      artifactRunId:Number(a['artifact-run-id']||0),
      universeId:clean(a['universe-id']),
      placeId:clean(a['place-id']),
      versionNumber:Number(a['version-number']||0)
    };
    const applied=applyLocalStudioPlayResult({
      queue,
      gameId:clean(a['game-id']),
      runtime,
      expected,
      workflowRunId:Number(a['workflow-run-id']||0),
      studioStepSucceeded:bool(a['studio-step-succeeded']),
      testedAt:clean(a['tested-at'])||undefined
    });
    writeJson(a.queue,applied.queue);
    console.log('ROBLOX_STUDIO_MCP_PLAY_RESULT='+clean(a['game-id'])+':'+(applied.result.pass?'PASS':'FAIL'));
    console.log('ROBLOX_NATIVE_ACTUAL_PLAY_FEEDBACK='+(applied.result.pass?'PASS':applied.result.evidence.infrastructureFailure?'UNKNOWN_INFRA':'FAIL'));
    console.log('ROBLOX_NATIVE_FAILURE_CLASS='+(applied.result.evidence.robloxFailureClass||'NONE'));
    console.log('ROBLOX_NATIVE_FUNCTIONAL_CHAIN='+(applied.result.evidence.scenarioCoveragePass?'PASS':applied.result.evidence.functionalChainEvidence?.inputDispatched?'PARTIAL':'FAIL'));
    console.log('ROBLOX_STUDIO_MCP_PLAY_LEARNING='+(applied.result.evidence.learningReusable?'STRUCTURED_VERIFIED':'NO'));
    console.log('QUALITY_FIRST_BUILDUP_SHORT_CIRCUIT=ACTIVE');
    console.log('QUALITY_FAILURE_CLASS='+(applied.item.robloxQualityBuildUpRequired===true?'PRODUCT':applied.result.evidence.infrastructureFailure===true?'INFRASTRUCTURE_OR_EVIDENCE_ONLY':'NONE'));
    console.log('QUALITY_BUILDUP_AUTO_REQUEUE='+(applied.item.robloxQualityBuildUpRequired===true?'YES':'NO'));
    console.log('EXTERNAL_RELEASE_PROBE_SUPPRESSED='+(applied.item.robloxQualityBuildUpRequired===true?'YES':'NO'));
    console.log('RESUME_STAGE='+(applied.item.robloxQualityBuildUpRequired===true?'REPAIR_REQUIRED':'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'));
    return;
  }
  throw new Error('unsupported --mode; expected diagnose-setting, plan, mcp-run, or persist');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error?.stack||error);process.exit(1);});
}
