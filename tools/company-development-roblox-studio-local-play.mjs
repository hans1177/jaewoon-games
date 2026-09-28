import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const bool=v=>String(v??'').toLowerCase()==='true';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stableSha256=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

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
    map:/map|zone|portal|dungeon|room|island|arena|world|base|village|ground|route|school|hospital|park|forest|cave|field|맵|지역|포탈|던전|방|섬|아레나|마을|사냥터|학교|병원|공원|숲|동굴/.test(text),
    interactions:/quest|shop|inventory|equip|craft|prompt|interact|hire|recruit|build|upgrade|attack|skill|ability|button|door|portal|collect|gather|heal|trade|퀘스트|상점|인벤|장비|제작|상호작용|고용|모집|건설|강화|공격|스킬|문|포탈|채집|회복|거래/.test(text),
    progression:/level|xp|gold|quest|wave|round|stage|boss|base|zone|portal|unlock|progress|mastery|advancement|tier|reward|레벨|경험치|골드|퀘스트|웨이브|라운드|스테이지|보스|해금|진행|숙련|전직|티어|보상/.test(text),
    multiplayer:/multiplayer|player|party|team|co-op|coop|sync|join|rejoin|human|monster/.test(text),
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
    'character-camera-ready','visual-capture-sane','adaptive-runtime-surface',
    'adaptive-ui-commercial-quality','adaptive-world-safety','adaptive-interaction-surface',
    'adaptive-progression-surface','adaptive-remote-surface','adaptive-combat-surface',
    'adaptive-motion-surface','adaptive-audio-surface','adaptive-npc-surface',
    'adaptive-companion-ai-surface','adaptive-item-surface','adaptive-environment-surface',
    'adaptive-effects-surface','adaptive-quest-loop-surface','adaptive-reward-loop-surface',
    'adaptive-economy-surface','adaptive-save-surface','adaptive-retry-loop-surface',
    'adaptive-camera-quality','adaptive-performance-budget'
  ];
  const explicitScenarios=launchStringList(explicit?.requiredScenarios);
  return Object.freeze({
    ...explicit,
    version:Math.max(3,Number(explicit?.version||0)),
    required:true,
    source:clean(explicit?.source)||'COMMERCIAL_ADAPTIVE_STUDIO_AUDIT',
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
      auditProfile:(
        item?.robloxF9ReleaseRegressionPassed===true
        ||/FINAL_REVIEW|RELEASE|F9/i.test(clean(item?.currentStep))
      )?'F9_SOAK':'FAST_DEEP'
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
      errors.push({type:'studio-console-error',actionId:null,signature});
    }
  };
  const gameActionYieldPattern=/Infinite yield possible.*WaitForChild\(["']GameAction["']\)/i;
  const localUnpublishedDataStorePattern=/You must publish this place to the web to access DataStore/i;
  const criticalConsolePatterns=[
    gameActionYieldPattern,
    /DataStoreService.*(?:Studio access to APIs is not allowed|API Services are disabled)/i,
    localUnpublishedDataStorePattern
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
function keyboardItem(schema,key){
  const props=schemaProps(schema),item={};
  for(const [name,def] of Object.entries(props)){
    if(/key.?code|^key$|keyboard.?key/i.test(name)){item[name]=key;continue;}
    if(/action|type|event|operation/i.test(name)){
      if(Array.isArray(def.enum)){
        item[name]=enumValue(def,['key_press','keypress','press','tap','key_down']);
      }else if(def.type==='string')item[name]='press';
      continue;
    }
    if(/duration.*ms|milliseconds|delay.*ms|wait.*ms/i.test(name))item[name]=120;
    else if(/duration|delay|wait/i.test(name)&&['number','integer'].includes(def.type))item[name]=0.12;
  }
  return fillRequired(item,schema);
}
function keyboardArgs(schema,studioId,key){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const actionsKey=Object.keys(props).find(k=>/actions|events|inputs/i.test(k)&&props[k]?.type==='array');
  if(actionsKey){
    const itemSchema=props[actionsKey]?.items||{};
    args[actionsKey]=[keyboardItem(itemSchema,key)];
  }else{
    const built=keyboardItem(schema,key);
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
function studioActualPlayProbeSource(contract={},context='Client'){
  const exp=contract?.expectations||{};
  const guiNames=[...new Set([clean(exp.screenGuiName),...(Array.isArray(exp.requiredGuiObjects)?exp.requiredGuiObjects.map(clean):[])].filter(Boolean))];
  const buttonTexts=[...new Set([clean(contract?.selectionButtonText),clean(contract?.primaryActionButtonText)].filter(Boolean))];
  const luaStrings=values=>'{'+values.map(v=>JSON.stringify(v)).join(',')+'}';
  const lines=[
    'local HttpService=game:GetService("HttpService")',
    'local Players=game:GetService("Players")',
    'local Lighting=game:GetService("Lighting")',
    'local Workspace=game:GetService("Workspace")',
    'local ReplicatedStorage=game:GetService("ReplicatedStorage")',
    'local SoundService=game:GetService("SoundService")',
    'local Stats=game:GetService("Stats")',
    'local requiredGuiNames='+luaStrings(guiNames),
    'local requiredButtonTexts='+luaStrings(buttonTexts),
    'local p=Players.LocalPlayer or Players:GetPlayers()[1]',
    'local camera=Workspace.CurrentCamera',
    'local viewport=camera and camera.ViewportSize or Vector2.new(0,0)',
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
    ' local off=viewport.X>0 and viewport.Y>0 and (pos.X+size.X<0 or pos.Y+size.Y<0 or pos.X>viewport.X or pos.Y>viewport.Y) or false',
    ' return {present=true,visible=visible(inst),offscreen=off,x=pos.X,y=pos.Y,width=size.X,height=size.Y}',
    'end',
    'local gui={screenGuiPresent=false,visibleButtons=0,visibleObjects=0,required={},buttons={},interactive={},offscreenButtons=0,undersizedTouchButtons=0,suboptimalTouchButtons=0,textOverflowButtons=0,overlapPairs=0}',
    'local pg=p and p:FindFirstChildOfClass("PlayerGui")',
    'if pg then',
    ' for _,d in ipairs(pg:GetDescendants()) do',
    '  if d:IsA("GuiObject") and visible(d) then gui.visibleObjects+=1 end',
    '  if (d:IsA("TextButton") or d:IsA("ImageButton")) and visible(d) then',
    '   gui.visibleButtons+=1',
    '   local row=guiInfo(d);row.name=d.Name;row.className=d.ClassName;row.centerX=row.x+row.width/2;row.centerY=row.y+row.height/2',
    '   if d:IsA("TextButton") then row.text=tostring(d.Text) else row.text="" end',
    '   if row.offscreen then gui.offscreenButtons+=1 end',
    '   if math.min(row.width,row.height)<36 then gui.undersizedTouchButtons+=1 elseif math.min(row.width,row.height)<44 then gui.suboptimalTouchButtons+=1 end',
    '   if d:IsA("TextButton") and not d.TextScaled and d.TextBounds.X>row.width+3 then gui.textOverflowButtons+=1 end',
    '   if #gui.interactive<80 then table.insert(gui.interactive,row) end',
    '   for _,target in ipairs(requiredButtonTexts) do if d:IsA("TextButton") and tostring(d.Text)==target then gui.buttons[target]=row end end',
    '  end',
    ' end',
    ' for i=1,#gui.interactive do local a=gui.interactive[i];for j=i+1,#gui.interactive do local b=gui.interactive[j];local x=math.max(0,math.min(a.x+a.width,b.x+b.width)-math.max(a.x,b.x));local y=math.max(0,math.min(a.y+a.height,b.y+b.height)-math.max(a.y,b.y));if x*y>math.min(a.width*a.height,b.width*b.height)*0.35 then gui.overlapPairs+=1 end end end',
    ' for _,name in ipairs(requiredGuiNames) do',
    '  local found=pg:FindFirstChild(name,true)',
    '  if found and found:IsA("ScreenGui") then gui.required[name]={present=true,visible=found.Enabled==true,offscreen=false} else gui.required[name]=guiInfo(found) end',
    ' end',
    'end',
    'local screenGuiName='+JSON.stringify(clean(exp.screenGuiName)),
    'if pg and screenGuiName~="" then local sg=pg:FindFirstChild(screenGuiName,true);gui.screenGuiPresent=sg~=nil and (not sg:IsA("ScreenGui") or sg.Enabled==true) end',
    'local prompts=0',
    'local clickDetectors=0',
    'local parts=0',
    'local collidableParts=0',
    'local spawnLocations=0',
    'local arena=Workspace:FindFirstChild("MidnightArena")',
    'if arena then for _,d in ipairs(arena:GetDescendants()) do if d:IsA("BasePart") then parts+=1 end end end',
    'local minX,minY,minZ=math.huge,math.huge,math.huge',
    'local maxX,maxY,maxZ=-math.huge,-math.huge,-math.huge',
    'local promptRows={}',
    'local mobRows={}',
    'local npcRows={}',
    'local companionRows={}',
    'local itemRows={}',
    'local effectCount=0',
    'local environmentModels=0',
    'local soundCount=0;local playingSoundCount=0',
    'for _,d in ipairs(Workspace:GetDescendants()) do',
    ' if d:IsA("BasePart") then',
    '  if d.CanCollide then collidableParts+=1;local p0=d.Position;local h=d.Size*0.5;minX=math.min(minX,p0.X-h.X);minY=math.min(minY,p0.Y-h.Y);minZ=math.min(minZ,p0.Z-h.Z);maxX=math.max(maxX,p0.X+h.X);maxY=math.max(maxY,p0.Y+h.Y);maxZ=math.max(maxZ,p0.Z+h.Z) end',
    '  if d:IsA("SpawnLocation") then spawnLocations+=1 end',
    '  local hp=attr and attr(d,"HP") or d:GetAttribute("HP");local maxHp=attr and attr(d,"MaxHP") or d:GetAttribute("MaxHP")',
    '  local lname=string.lower(d.Name)',
    '  if (#mobRows<80) and ((typeof(hp)=="number" and typeof(maxHp)=="number") or string.find(lname,"enemy") or string.find(lname,"monster") or string.find(lname,"mob") or string.find(lname,"zombie") or string.find(lname,"boss") or string.find(lname,"raider")) then table.insert(mobRows,{name=d.Name,x=d.Position.X,y=d.Position.Y,z=d.Position.Z,hp=hp,maxHp=maxHp,target=tostring(d:GetAttribute("Target") or ""),state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or ""),dormant=d:GetAttribute("Dormant")}) end',
    ' elseif d:IsA("ProximityPrompt") then',
    '  prompts+=1;local parent=d.Parent;local pos=parent and parent:IsA("BasePart") and parent.Position or Vector3.new();if #promptRows<60 then table.insert(promptRows,{name=d.Name,actionText=tostring(d.ActionText),objectText=tostring(d.ObjectText),x=pos.X,y=pos.Y,z=pos.Z,maxDistance=d.MaxActivationDistance}) end',
    ' elseif d:IsA("ClickDetector") then clickDetectors+=1',
    ' elseif d:IsA("Sound") then soundCount+=1;if d.IsPlaying then playingSoundCount+=1',
    ' elseif d:IsA("ParticleEmitter") or d:IsA("Trail") or d:IsA("Beam") or d:IsA("Highlight") then effectCount+=1',
    ' elseif d:IsA("Model") then',
    '  local lname=string.lower(d.Name);local pivot=d:GetPivot();local dh=d:FindFirstChildOfClass("Humanoid");local companion=string.find(lname,"companion") or string.find(lname,"follower") or string.find(lname,"pet") or string.find(lname,"summon")',
    '  local npc=dh and not Players:GetPlayerFromCharacter(d) and (string.find(lname,"npc") or string.find(lname,"merchant") or string.find(lname,"chief") or string.find(lname,"healer") or string.find(lname,"resident") or string.find(lname,"worker") or string.find(lname,"villager") or string.find(lname,"master") or string.find(lname,"trainer"))',
    '  if companion and #companionRows<50 then table.insert(companionRows,{name=d.Name,x=pivot.Position.X,y=pivot.Position.Y,z=pivot.Position.Z,health=dh and dh.Health or nil,state=tostring(d:GetAttribute("State") or d:GetAttribute("AIState") or ""),target=tostring(d:GetAttribute("Target") or ""),owner=tostring(d:GetAttribute("OwnerUserId") or "")}) end',
    '  if npc and #npcRows<60 then table.insert(npcRows,{name=d.Name,x=pivot.Position.X,y=pivot.Position.Y,z=pivot.Position.Z,health=dh and dh.Health or nil,hasPrompt=d:FindFirstChildWhichIsA("ProximityPrompt",true)~=nil}) end',
    '  if string.find(lname,"environment") or string.find(lname,"decor") or string.find(lname,"building") or string.find(lname,"house") or string.find(lname,"terrain") or string.find(lname,"village") then environmentModels+=1 end',
    ' elseif d:IsA("Tool") or d:IsA("Accessory") then',
    '  if #itemRows<60 then table.insert(itemRows,{name=d.Name,className=d.ClassName,parent=d.Parent and d.Parent.Name or ""}) end',
    ' end',
    'end',
    'for _,d in ipairs(SoundService:GetDescendants()) do if d:IsA("Sound") then soundCount+=1;if d.IsPlaying then playingSoundCount+=1 end end end',
    'local remoteRows={};local remoteCount=0',
    'for _,d in ipairs(ReplicatedStorage:GetDescendants()) do if d:IsA("RemoteEvent") or d:IsA("RemoteFunction") then remoteCount+=1;if #remoteRows<80 then table.insert(remoteRows,{name=d.Name,className=d.ClassName}) end end end',
    'local root=nil',
    'local hum=nil',
    'local animator=nil',
    'local animationTrackCount=0',
    'local motorCount=0',
    'if p and p.Character then root=p.Character:FindFirstChild("HumanoidRootPart");hum=p.Character:FindFirstChildOfClass("Humanoid");if hum then animator=hum:FindFirstChildOfClass("Animator");if animator then local ok,tracks=pcall(function() return animator:GetPlayingAnimationTracks() end);if ok then animationTrackCount=#tracks end end end;for _,d in ipairs(p.Character:GetDescendants()) do if d:IsA("Motor6D") then motorCount+=1 end end end',
    'local function attr(inst,name) if not inst then return nil end;local ok,value=pcall(function() return inst:GetAttribute(name) end);if ok then return value end;return nil end',
    'local progressionRows={}',
    'local function collectProgress(inst,scope)',
    ' if not inst then return end',
    ' for name,value in pairs(inst:GetAttributes()) do local lower=string.lower(name);if string.find(lower,"level") or string.find(lower,"xp") or string.find(lower,"gold") or string.find(lower,"quest") or string.find(lower,"wave") or string.find(lower,"round") or string.find(lower,"stage") or string.find(lower,"zone") or string.find(lower,"portal") or string.find(lower,"base") or string.find(lower,"unlock") or string.find(lower,"progress") or string.find(lower,"mastery") or string.find(lower,"tier") or string.find(lower,"kill") or string.find(lower,"reward") then if #progressionRows<80 then table.insert(progressionRows,{scope=scope,name=name,valueType=typeof(value),value=tostring(value)}) end end end',
    'end',
    'collectProgress(p,"player");collectProgress(Workspace,"workspace")',
    'local inventoryRows={};local inventoryCount=0',
    'if p then local backpack=p:FindFirstChildOfClass("Backpack");if backpack then for _,d in ipairs(backpack:GetChildren()) do if d:IsA("Tool") then inventoryCount+=1;if #inventoryRows<60 then table.insert(inventoryRows,{name=d.Name,className=d.ClassName,scope="Backpack"}) end end end end;for _,d in ipairs((p.Character and p.Character:GetChildren()) or {}) do if d:IsA("Tool") then inventoryCount+=1;if #inventoryRows<60 then table.insert(inventoryRows,{name=d.Name,className=d.ClassName,scope="Character"}) end end end end',
    'local leaderstats=p and p:FindFirstChild("leaderstats")',
    'if leaderstats then for _,d in ipairs(leaderstats:GetChildren()) do if d:IsA("IntValue") or d:IsA("NumberValue") or d:IsA("StringValue") then if #progressionRows<80 then table.insert(progressionRows,{scope="leaderstats",name=d.Name,valueType=d.ClassName,value=tostring(d.Value)}) end end end end',
    'local systemSignals=0',
    'local category={quest=0,reward=0,economy=0,inventory=0,combat=0,progression=0,save=0,retry=0,npc=0,companion=0,item=0,environment=0,effects=effectCount}',
    'for _,rootInst in ipairs({ReplicatedStorage,Workspace,pg}) do if rootInst then for _,d in ipairs(rootInst:GetDescendants()) do local n=string.lower(d.Name);local matched=false',
    ' if string.find(n,"quest") or string.find(n,"mission") or string.find(n,"objective") or string.find(n,"trial") then category.quest+=1;matched=true end',
    ' if string.find(n,"reward") or string.find(n,"gold") or string.find(n,"coin") or string.find(n,"xp") or string.find(n,"loot") or string.find(n,"drop") or string.find(n,"chest") then category.reward+=1;matched=true end',
    ' if string.find(n,"shop") or string.find(n,"merchant") or string.find(n,"price") or string.find(n,"cost") or string.find(n,"upgrade") or string.find(n,"purchase") or string.find(n,"sell") then category.economy+=1;matched=true end',
    ' if string.find(n,"inventory") or string.find(n,"equip") or string.find(n,"weapon") or string.find(n,"armor") or string.find(n,"relic") or string.find(n,"item") then category.inventory+=1;matched=true end',
    ' if string.find(n,"attack") or string.find(n,"skill") or string.find(n,"combat") or string.find(n,"damage") or string.find(n,"enemy") or string.find(n,"monster") or string.find(n,"boss") or string.find(n,"mob") then category.combat+=1;matched=true end',
    ' if string.find(n,"level") or string.find(n,"wave") or string.find(n,"round") or string.find(n,"portal") or string.find(n,"progress") or string.find(n,"unlock") or string.find(n,"mastery") or string.find(n,"stage") then category.progression+=1;matched=true end',
    ' if string.find(n,"save") or string.find(n,"load") or string.find(n,"datastore") or string.find(n,"persist") then category.save+=1;matched=true end',
    ' if string.find(n,"retry") or string.find(n,"restart") or string.find(n,"respawn") or string.find(n,"reset") or string.find(n,"newrun") then category.retry+=1;matched=true end',
    ' if string.find(n,"npc") or string.find(n,"merchant") or string.find(n,"chief") or string.find(n,"healer") or string.find(n,"resident") or string.find(n,"worker") or string.find(n,"villager") or string.find(n,"trainer") or string.find(n,"master") then category.npc+=1;matched=true end',
    ' if string.find(n,"companion") or string.find(n,"follower") or string.find(n,"pet") or string.find(n,"summon") then category.companion+=1;matched=true end',
    ' if string.find(n,"item") or string.find(n,"loot") or string.find(n,"drop") or string.find(n,"weapon") or string.find(n,"armor") or string.find(n,"relic") or string.find(n,"resource") or string.find(n,"material") then category.item+=1;matched=true end',
    ' if string.find(n,"environment") or string.find(n,"decor") or string.find(n,"building") or string.find(n,"house") or string.find(n,"terrain") or string.find(n,"biome") then category.environment+=1;matched=true end',
    ' if matched then systemSignals+=1 end',
    'end end end',
    'local floorBelow=false',
    'if root then local params=RaycastParams.new();params.FilterType=Enum.RaycastFilterType.Exclude;params.FilterDescendantsInstances=p and p.Character and {p.Character} or {};local hit=Workspace:Raycast(root.Position+Vector3.new(0,4,0),Vector3.new(0,-128,0),params);floorBelow=hit~=nil end',
    'local boundsFinite=minX<math.huge and maxX>-math.huge and minY<math.huge and maxY>-math.huge and minZ<math.huge and maxZ>-math.huge',
    'local descendantCount=#Workspace:GetDescendants()',
    'local memoryMb=0;pcall(function() memoryMb=Stats:GetTotalMemoryUsageMb() end)',
    'local payload={',
    ' context='+JSON.stringify(context)+',',
    ' player={present=p~=nil,characterPresent=p~=nil and p.Character~=nil,humanoidPresent=hum~=nil,rootPresent=root~=nil,rootX=root and root.Position.X or nil,rootY=root and root.Position.Y or nil,rootZ=root and root.Position.Z or nil,velocityX=root and root.AssemblyLinearVelocity.X or nil,velocityY=root and root.AssemblyLinearVelocity.Y or nil,velocityZ=root and root.AssemblyLinearVelocity.Z or nil,health=hum and hum.Health or nil,maxHealth=hum and hum.MaxHealth or nil,floorMaterial=hum and tostring(hum.FloorMaterial) or nil,humanoidState=hum and tostring(hum:GetState()) or nil,animatorPresent=animator~=nil,animationTrackCount=animationTrackCount,motorCount=motorCount,roundState=attr(p,"RoundState"),role=attr(p,"Role"),monsterPreference=attr(p,"MonsterPreference"),soloRole=attr(p,"SoloRole"),feedbackEvent=attr(p,"FeedbackEvent"),currentMap=attr(p,"CurrentMap"),currentMapEvent=attr(p,"CurrentMapEvent"),humanCount=attr(p,"HumanCount"),monsterCount=attr(p,"MonsterCount"),objectivesDone=attr(p,"ObjectivesDone"),objectivesTotal=attr(p,"ObjectivesTotal")},',
    ' camera={present=camera~=nil,viewportX=viewport.X,viewportY=viewport.Y,fieldOfView=camera and camera.FieldOfView or nil,subjectPresent=camera and camera.CameraSubject~=nil or false},',
    ' ui=gui,',
    ' world={arenaPresent=arena~=nil,arenaPartCount=parts,proximityPromptCount=prompts,clickDetectorCount=clickDetectors,collidablePartCount=collidableParts,spawnLocationCount=spawnLocations,boundsFinite=boundsFinite,minX=boundsFinite and minX or nil,minY=boundsFinite and minY or nil,minZ=boundsFinite and minZ or nil,maxX=boundsFinite and maxX or nil,maxY=boundsFinite and maxY or nil,maxZ=boundsFinite and maxZ or nil,floorBelowPlayer=floorBelow,prompts=promptRows,mobs=mobRows,npcs=npcRows,companions=companionRows,items=itemRows,environmentModels=environmentModels,effectCount=effectCount},',
    ' runtime={remoteCount=remoteCount,remotes=remoteRows,progression=progressionRows,inventory=inventoryRows,inventoryCount=inventoryCount,systemSignals=systemSignals,categories=category,descendantCount=descendantCount,memoryMb=memoryMb,soundCount=soundCount,playingSoundCount=playingSoundCount},',
    ' workspace={MapReady=attr(Workspace,"MapReady"),ActivePopulation=attr(Workspace,"ActivePopulation"),AIBotCount=attr(Workspace,"AIBotCount"),HumanCount=attr(Workspace,"HumanCount"),MonsterCount=attr(Workspace,"MonsterCount"),CurrentMapId=attr(Workspace,"CurrentMapId"),CurrentMapName=attr(Workspace,"CurrentMapName"),CurrentMapEvent=attr(Workspace,"CurrentMapEvent"),WorldArtPass=attr(Workspace,"WorldArtPass"),CharacterArtDirection=attr(Workspace,"CharacterArtDirection"),DesignCodeSync=attr(Workspace,"DesignCodeSync")},',
    ' lighting={brightness=Lighting.Brightness,clockTime=Lighting.ClockTime,ambientR=Lighting.Ambient.R,ambientG=Lighting.Ambient.G,ambientB=Lighting.Ambient.B}',
    '}',
    'return "ROBLOX_STUDIO_ACTUAL_PLAY_PROBE="..HttpService:JSONEncode(payload)'
  ];
  return lines.join('\n');
}
function parseStudioActualPlayProbe(result){
  const marker='ROBLOX_STUDIO_ACTUAL_PLAY_PROBE=';
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
  const result=await client.call('execute_luau',executeLuauArgs(tool.inputSchema||{},studioId,studioActualPlayProbeSource(contract,context),context));
  return parseStudioActualPlayProbe(result);
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
export function evaluateStudioActualPlayContract({contract={},initialClientProbe=null,preActionClientProbe=null,postActionClientProbe=null,clientProbe=null,serverProbe=null,actions=[],beforeImages=[],afterImages=[],timelineProbes=[],auditProfile='FAST_DEEP'}={}){
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
  let previous=initialClientProbe;
  for(const probe of timeline){
    if(!previous){previous=probe;continue;}
    timelineMobDynamic=timelineMobDynamic||entityMotionSummary(previous?.world?.mobs,probe?.world?.mobs).dynamic;
    timelineCompanionDynamic=timelineCompanionDynamic||entityMotionSummary(previous?.world?.companions,probe?.world?.companions).dynamic;
    timelineProgressChanged=timelineProgressChanged||progressionChanged(previous?.runtime?.progression,probe?.runtime?.progression);
    previous=probe;
  }
  const soak=clean(auditProfile).toUpperCase()==='F9_SOAK';
  const visibleButtons=Number(ui.visibleButtons||0);
  const uiCommercialPass=
    Number(ui.offscreenButtons||0)===0
    &&Number(ui.undersizedTouchButtons||0)===0
    &&Number(ui.textOverflowButtons||0)===0
    &&Number(ui.overlapPairs||0)<=1
    &&visibleButtons>=0;
  const worldSafetyPass=
    world.boundsFinite===true
    &&Number(world.collidablePartCount||0)>0
    &&world.floorBelowPlayer===true;
  const interactionSurfaceCount=Number(world.proximityPromptCount||0)+Number(world.clickDetectorCount||0)+visibleButtons;
  const progressionSurfaceCount=entityRows(runtime.progression).length+Number(categories.progression||0);
  const combatSurfaceCount=entityRows(world.mobs).length+Number(categories.combat||0);
  const npcSurfaceCount=entityRows(world.npcs).length+Number(categories.npc||0);
  const companionSurfaceCount=entityRows(world.companions).length+Number(categories.companion||0);
  const itemSurfaceCount=entityRows(world.items).length+Number(categories.item||0)+Number(categories.inventory||0);
  const rows=[
    {id:'character-camera-ready',pass:player.characterPresent===true&&player.humanoidPresent===true&&player.rootPresent===true&&client?.camera?.present===true},
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
    {id:'visual-capture-sane',pass:before.pass&&after.pass&&lightingBrightness>=Number(exp.minimumLightingBrightness||0)},
    {id:'adaptive-runtime-surface',pass:Number(runtime.descendantCount||0)>0&&Number(runtime.systemSignals||0)>0},
    {id:'adaptive-ui-commercial-quality',pass:!signals.ui||uiCommercialPass},
    {id:'adaptive-world-safety',pass:!signals.map||worldSafetyPass},
    {id:'adaptive-interaction-surface',pass:!signals.interactions||interactionSurfaceCount>0},
    {id:'adaptive-progression-surface',pass:!signals.progression||progressionSurfaceCount>0},
    {id:'adaptive-remote-surface',pass:!signals.serverBoundary||Number(runtime.remoteCount||0)>0},
    {id:'adaptive-combat-surface',pass:!signals.combat||(combatSurfaceCount>0&&(!soak||entityRows(world.mobs).length===0||timelineMobDynamic||mobMotion.dynamic||primaryActionFeedbackChanged))},
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
    {id:'adaptive-retry-loop-surface',pass:!signals.retry||Number(categories.retry||0)>0},
    {id:'adaptive-camera-quality',pass:!signals.camera||(client?.camera?.present===true&&client?.camera?.subjectPresent===true&&Number(client?.camera?.fieldOfView||0)>0)},
    {id:'adaptive-performance-budget',pass:Number(runtime.memoryMb||0)>=0&&Number(runtime.descendantCount||0)<120000}
  ];
  const scenarios=rows.filter(row=>requiredIds.size===0||requiredIds.has(row.id)).map(row=>({...row,required:true}));
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
    mobMotion,
    companionMotion,
    npcMotion,
    uiCommercial:{offscreenButtons:Number(ui.offscreenButtons||0),undersizedTouchButtons:Number(ui.undersizedTouchButtons||0),suboptimalTouchButtons:Number(ui.suboptimalTouchButtons||0),textOverflowButtons:Number(ui.textOverflowButtons||0),overlapPairs:Number(ui.overlapPairs||0)},
    surfaces:{interactionSurfaceCount,progressionSurfaceCount,combatSurfaceCount,npcSurfaceCount,companionSurfaceCount,itemSurfaceCount,remoteCount:Number(runtime.remoteCount||0),soundCount:Number(runtime.soundCount||0),effectCount:Number(world.effectCount||0),promptCount:Number(world.proximityPromptCount||0),inventoryCount:Number(runtime.inventoryCount||0)},
    performance:{memoryMb:Number(runtime.memoryMb||0),descendantCount:Number(runtime.descendantCount||0)}
  };
  const repairMap={
    'adaptive-ui-commercial-quality':['MOBILE_UI','HIGH','Fix clipping, touch target size, text fit, and overlapping HUD controls across mobile viewports.'],
    'adaptive-world-safety':['WORLD_GEOMETRY','CRITICAL','Repair walkable floor coverage, collision gaps, void falls, stuck geometry, and unsafe map boundaries.'],
    'adaptive-interaction-surface':['INTERACTION_CHAIN','HIGH','Restore usable prompts/buttons/click surfaces and verify input leads to a visible or authoritative result.'],
    'adaptive-progression-surface':['PROGRESSION','CRITICAL','Restore observable progression state for levels, quests, waves, zones, unlocks, or rewards.'],
    'adaptive-remote-surface':['SERVER_CLIENT_BOUNDARY','CRITICAL','Restore server-authoritative RemoteEvent/RemoteFunction surface and validation path.'],
    'adaptive-combat-surface':['COMBAT_AI','CRITICAL','Repair combat targets, damage/state transitions, enemy liveness, attack feedback, and F9 AI movement.'],
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
    'adaptive-retry-loop-surface':['FAILURE_RECOVERY','HIGH','Repair death/failure/restart/respawn flow and remove softlocks after retry.'],
    'adaptive-camera-quality':['CAMERA','HIGH','Repair camera subject/FOV/occlusion behavior and keep gameplay readable during movement/combat.'],
    'adaptive-performance-budget':['PERFORMANCE','HIGH','Reduce runaway instance count/memory pressure and keep long-session runtime stable.'],
    'primary-action-effect':['ACTION_IMPLEMENTATION','CRITICAL','Ensure primary action produces authoritative gameplay feedback, movement, damage, or state transition.'],
    'visual-capture-sane':['VISUAL_RUNTIME','HIGH','Repair blank/invalid/too-small viewport or unreadable lighting during actual play.'],
    'character-camera-ready':['CHARACTER_BOOT','CRITICAL','Repair character spawn, Humanoid/root, and camera binding before gameplay starts.']
  };
  const observedFor=id=>{
    if(id==='adaptive-ui-commercial-quality')return metrics.uiCommercial;
    if(id==='adaptive-world-safety')return{boundsFinite:world.boundsFinite===true,collidablePartCount:Number(world.collidablePartCount||0),floorBelowPlayer:world.floorBelowPlayer===true};
    if(id==='adaptive-combat-surface')return{combatSurfaceCount,mobCount:entityRows(world.mobs).length,mobMotion:metrics.mobMotion,timelineMobDynamic};
    if(id==='adaptive-companion-ai-surface')return{companionSurfaceCount,companionCount:entityRows(world.companions).length,companionMotion:metrics.companionMotion,timelineCompanionDynamic};
    if(id==='adaptive-progression-surface'||id==='adaptive-quest-loop-surface'||id==='adaptive-reward-loop-surface')return{progressionSurfaceCount,progressChanged,timelineProgressChanged};
    if(id==='adaptive-item-surface')return{itemSurfaceCount,inventoryCount:Number(runtime.inventoryCount||0),inventoryChanged:inventoryDelta};
    if(id==='adaptive-performance-budget')return metrics.performance;
    if(id==='adaptive-interaction-surface')return{interactionSurfaceCount,promptCount:Number(world.proximityPromptCount||0),clickDetectorCount:Number(world.clickDetectorCount||0),visibleButtons};
    return metrics.surfaces;
  };
  const qualityFailureDetails=qualityFailureKinds.map(id=>{
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
  let initialClientProbe=null,preActionClientProbe=null,postActionClientProbe=null,finalClientProbe=null,finalServerProbe=null,scenarioCoverage=[];
  let authoritativeStateChangeObserved=false,qualityFailureKinds=[],qualityFailureDetails=[],captureQuality=null,scenarioMetrics={};
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

    const captureTool=client.tool('screen_capture');
    const captureArgs=fillRequired((()=>{const a={};setStudioId(a,captureTool.inputSchema||{},studioId);return a;})(),captureTool.inputSchema||{});
    const before=await client.call('screen_capture',captureArgs);
    beforeImages=collectImages(before,[]);
    checkpoint('viewport-before-captured',beforeImages.length>0);

    if(actualPlayContract?.required===true){
      initialClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
      checkpoint('actual-play-initial-client-probe',initialClientProbe!=null);
      if(clean(actualPlayContract.selectionButtonText)){
        const target=initialClientProbe?.ui?.buttons?.[clean(actualPlayContract.selectionButtonText)]||null;
        let ok=false;
        if(target?.visible===true&&Number.isFinite(Number(target.centerX))&&Number.isFinite(Number(target.centerY))){
          try{const mouseTool=client.tool('user_mouse_input');const result=await client.call('user_mouse_input',mouseClickArgs(mouseTool.inputSchema||{},studioId,target.centerX,target.centerY));ok=result?.isError!==true;}catch{}
        }
        actions.push({id:'ui-role-selection',type:'mcp-mouse-input',dispatched:target!=null,ok});
        checkpoint('role-selection-input-dispatched',ok);
        await wait(Math.max(250,Number(actualPlayContract.afterSelectionWaitMs||1800)));
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
        await wait(Math.max(200,Number(actualPlayContract.postActionWaitMs||350)));
        postActionClientProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
        checkpoint('actual-play-post-action-client-probe',postActionClientProbe!=null);
      }
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
      const semanticWeight=row=>{
        const text=(clean(row?.actionText)+' '+clean(row?.objectText)+' '+clean(row?.name)).toLowerCase();
        const priorities=[
          /quest|퀘스트|mission|임무/,/reward|보상|claim|수령/,/shop|상점|merchant|구매|판매/,
          /craft|제작|forge|대장간/,/equip|장비|weapon|무기|armor|방어구/,/portal|포탈|입장|enter|door|문/,
          /heal|회복|healer|치유/,/upgrade|강화|전직|advance|train/,/collect|채집|줍기|pickup|loot|전리품/
        ];
        const hit=priorities.findIndex(re=>re.test(text));
        return hit<0?100:hit;
      };
      promptRows.sort((a,b)=>{
        const aw=semanticWeight(a),bw=semanticWeight(b);
        if(aw!==bw)return aw-bw;
        const da=Math.hypot(Number(a?.x||0)-Number(rootPos?.rootX||0),Number(a?.y||0)-Number(rootPos?.rootY||0),Number(a?.z||0)-Number(rootPos?.rootZ||0));
        const db=Math.hypot(Number(b?.x||0)-Number(rootPos?.rootX||0),Number(b?.y||0)-Number(rootPos?.rootY||0),Number(b?.z||0)-Number(rootPos?.rootZ||0));
        return da-db;
      });
      const exploreLimit=auditMode==='F9_SOAK'?3:1;
      const navigationTool=client.tool('character_navigation');
      for(const prompt of promptRows.slice(0,exploreLimit)){
        let navOk=false,inputOk=false;
        try{
          const target={x:Number(prompt?.x||0),y:Number(prompt?.y||0),z:Number(prompt?.z||0)};
          const navResult=await client.call('character_navigation',characterNavigationArgs(navigationTool.inputSchema||{},studioId,target));
          navOk=navResult?.isError!==true;
          await wait(450);
          const key=promptKeyboardKey(prompt?.key);
          const inputResult=await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,key));
          inputOk=inputResult?.isError!==true;
          await wait(Math.max(350,Math.min(1800,Number(prompt?.holdDuration||0)*1000+350)));
          const interactionProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
          if(interactionProbe)timelineProbes.push(interactionProbe);
          actions.push({id:'prompt-'+clean(prompt?.name||prompt?.objectText||'interaction'),type:'mcp-world-interaction',dispatched:true,ok:navOk&&inputOk});
        }catch{
          actions.push({id:'prompt-'+clean(prompt?.name||prompt?.objectText||'interaction'),type:'mcp-world-interaction',dispatched:true,ok:false});
        }
      }
      if(promptRows.length>0)checkpoint('commercial-prompt-exploration',actions.some(row=>row.type==='mcp-world-interaction'&&row.ok===true));

      const sampleCount=auditMode==='F9_SOAK'?6:3;
      const sampleDelay=auditMode==='F9_SOAK'?900:450;
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

    const after=await client.call('screen_capture',captureArgs);
    afterImages=collectImages(after,[]);
    const beforeHashes=beforeImages.map(x=>hash(Buffer.from(x.data,'base64')));
    const afterHashes=afterImages.map(x=>hash(Buffer.from(x.data,'base64')));
    const changed=beforeHashes.length>0&&afterHashes.length>0&&beforeHashes.join(',')!==afterHashes.join(',');
    checkpoint('viewport-changed-after-input',changed);

    if(actualPlayContract?.required===true){
      finalClientProbe=timelineProbes.at(-1)||await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Client');
      finalServerProbe=await collectStudioActualPlayProbe(client,studioId,actualPlayContract,'Server');
      checkpoint('actual-play-final-client-probe',finalClientProbe!=null);
      checkpoint('actual-play-final-server-probe',finalServerProbe!=null);
      const evaluated=evaluateStudioActualPlayContract({contract:actualPlayContract,initialClientProbe,preActionClientProbe,postActionClientProbe,clientProbe:finalClientProbe,serverProbe:finalServerProbe,actions,beforeImages,afterImages,timelineProbes,auditProfile:auditMode});
      scenarioCoverage=evaluated.scenarios;
      authoritativeStateChangeObserved=evaluated.authoritativeStateChangeObserved===true;
      qualityFailureKinds=evaluated.qualityFailureKinds;
      qualityFailureDetails=Array.isArray(evaluated.qualityFailureDetails)?evaluated.qualityFailureDetails:[];
      captureQuality=evaluated.capture;
      scenarioMetrics=evaluated.metrics||{};
      for(const row of scenarioCoverage)checkpoint('scenario-'+row.id,row.pass===true);
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
    checkpoint('no-release-blocking-runtime-errors',consoleClassification.errors.length===0);

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
      runtimeProbes:actualPlayContract?.required===true?{initialClient:initialClientProbe,preActionClient:preActionClientProbe,postActionClient:postActionClientProbe,finalClient:finalClientProbe,finalServer:finalServerProbe}:null,
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
        distinctFrameChange:checkpoints.find(x=>x.id==='viewport-changed-after-input')?.pass===true,
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
    errors.push({type:'studio-mcp-infrastructure-or-runtime-error',actionId:null,signature});
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
  const infrastructureFailure=errors.some(row=>/infrastructure|mcp.*missing|no_studio/i.test(row.type+' '+(row.signature||'')));
  const studioMcpServerEnablementRequired=errors.some(row=>{
    const signature=clean(row.signature||'');
    return /ROBLOX_STUDIO_MCP_SETTING_ENABLE/i.test(signature)
      ||(/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/i.test(signature)&&/stderrHint=MCP_SERVER_NOT_ENABLED/i.test(signature))
      ||(/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/i.test(signature)&&/settingHint=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY/i.test(signature));
  });
  const failureClass=pass?null
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
        primaryActionFeedbackChanged:runtime?.metrics?.primaryActionFeedbackChanged===true
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

export function applyLocalStudioPlayResult({queue={},gameId='',runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt}={}){
  const item=(queue?.items||[]).find(row=>clean(row?.gameId)===clean(gameId));
  if(!item)throw new Error('ROBLOX_STUDIO_MCP_QUEUE_ITEM_MISSING:'+clean(gameId));
  const result=createLocalStudioPlayEvidence({item,runtime,expected,workflowRunId,studioStepSucceeded,testedAt});
  const currentSourceArtifactBinding=result.evidence.currentSourceArtifactBinding===true;

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
