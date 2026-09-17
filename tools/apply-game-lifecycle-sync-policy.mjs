import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,v)=>fs.writeFileSync(p,v,'utf8');
const patch=(text,from,to,label)=>{if(!text.includes(from))throw new Error(`PATCH_TARGET_NOT_FOUND:${label}`);return text.replace(from,to);};

// 1. Central source of truth first.
{
  const p='COMPANY_FLOW.md';
  let t=read(p);
  const anchor=`  gameSeedMeaning:\n    seedMaterialIsNotGameProject: true\n    gameSeedBeginsOnlyAfterMaterialComposition: true\n    gameProjectBeginsAfterDesignGate: true\n    actualGameCountCap: null\n`;
  const block=`  gameSeedMeaning:\n    seedMaterialIsNotGameProject: true\n    gameSeedBeginsOnlyAfterMaterialComposition: true\n    gameProjectBeginsAfterDesignGate: true\n    actualGameCountCap: null\n  gameLifecycleAndDevelopmentPipeline:\n    canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID\n    lifecycleStates: [ACTIVE, PAUSED, REBUILD, RETIRED, REMOVED]\n    missingLifecycleStateDefaultsTo: ACTIVE\n    catalogAbsenceMeansNotDiscoverableForAutonomousDevelopment: true\n    staleCompanyStatusCannotResurrectMissingCatalogGame: true\n    staleQueueCannotResurrectInactiveGame: true\n    sourceFilesMayRemainArchivedAfterRetireOrRemove: true\n    sourceFileExistenceDoesNotImplyActiveLifecycle: true\n    stateRules:\n      ACTIVE:\n        developmentDiscoveryAllowed: true\n        newTaskCreationAllowed: true\n        countsTowardDevelopmentPipeline: true\n      PAUSED:\n        developmentDiscoveryAllowed: false\n        newTaskCreationAllowed: false\n        queuedTasksMustCancel: true\n        runningTaskMustStopAtNextSafeBoundary: true\n        countsTowardDevelopmentPipeline: false\n        sourcePreserved: true\n      REBUILD:\n        developmentDiscoveryAllowed: true\n        newTaskCreationAllowed: true\n        countsTowardDevelopmentPipeline: true\n        rebuildFromApprovedDesignRequired: true\n      RETIRED:\n        developmentDiscoveryAllowed: false\n        newTaskCreationAllowed: false\n        queuedTasksMustCancel: true\n        runningTaskMustStopAtNextSafeBoundary: true\n        countsTowardDevelopmentPipeline: false\n        autonomousRediscoveryForbidden: true\n        sourcePreservedByDefault: true\n      REMOVED:\n        developmentDiscoveryAllowed: false\n        newTaskCreationAllowed: false\n        queuedTasksMustCancel: true\n        runningTaskMustStopAtNextSafeBoundary: true\n        countsTowardDevelopmentPipeline: false\n        autonomousRediscoveryForbidden: true\n    developmentPipelineTarget: 60\n    activeDevelopmentWipMax: 20\n    readyBacklogPreferredRange: [25, 30]\n    reworkRebuildPreferredRange: [10, 15]\n    releasedLiveUsesSeparateSlots: true\n    automaticDropOnScoreFailureForbidden: true\n    repeatedFailureEscalation:\n      first: FIX_FAILED_AXIS_AND_REVALIDATE\n      second: REIMPLEMENT_FAILED_SUBSYSTEM\n      third: REVIEW_CORE_LOOP_AND_SYSTEM_CONNECTIONS\n      fourth: REBUILD_FROM_APPROVED_DESIGN\n      fifthOrLater: RETIRE_REVIEW_REQUIRES_STRUCTURAL_FAILURE_EVIDENCE\n    structuralFailureRequiredForRetire: true\n    emptyPipelineSlotsMustBeRefilledFromNewDesignPassedSeeds: true\n`;
  if(!t.includes('gameLifecycleAndDevelopmentPipeline:'))t=patch(t,anchor,block,'central-lifecycle');
  write(p,t);
}

// 2. Status/catalog synchronization.
{
  const p='tools/company-status-sync.mjs';
  let t=read(p);
  if(!t.includes("'canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID'")){
    t=patch(t,"  'target: PROJECT_SELECTED_PLATFORM',\n];","  'target: PROJECT_SELECTED_PLATFORM',\n  'canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID',\n  'developmentPipelineTarget: 60',\n  'staleCompanyStatusCannotResurrectMissingCatalogGame: true',\n];",'status-policy-tokens');
  }
  const genre="const normalizeGenre=value=>clean(value).toLowerCase().replace(/\\s+/g,' ');\n";
  if(!t.includes('export function gameLifecycleState')){
    t=patch(t,genre,genre+"const GAME_LIFECYCLE_STATES=new Set(['ACTIVE','PAUSED','REBUILD','RETIRED','REMOVED']);\nexport function gameLifecycleState(game={}){const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();return GAME_LIFECYCLE_STATES.has(raw)?raw:'ACTIVE';}\nexport function lifecycleAllowsDevelopment(game={}){return ['ACTIVE','REBUILD'].includes(gameLifecycleState(game));}\n",'status-lifecycle-helpers');
  }
  t=patch(t,"    const game=bySlug.get(project.slug)||{};\n    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));\n    const hold=isHold(project)||!sourceReady;\n","    const game=bySlug.get(project.slug)||{};\n    const lifecycleState=gameLifecycleState(game);\n    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));\n    const hold=isHold(project)||!sourceReady||!bySlug.has(project.slug)||!lifecycleAllowsDevelopment(game);\n",'status-row-lifecycle');
  t=patch(t,"    return {project,game,score,baseline,targetPlatform,targetPlatformReady:platformReady,sourceReady,hold,evidenceScore,gameplayFamily:family,productionClass};","    return {project,game,score,baseline,targetPlatform,targetPlatformReady:platformReady,sourceReady,hold,lifecycleState,evidenceScore,gameplayFamily:family,productionClass};",'status-row-return');
  t=patch(t,"  for(const row of rows){\n    const {project,game,productionClass,targetPlatform}=row;\n","  for(const row of rows){\n    const {project,game,productionClass,targetPlatform,lifecycleState}=row;\n    project.lifecycleState=lifecycleState;\n    if(!lifecycleAllowsDevelopment(game)){project.profileStatus=lifecycleState;project.mode=lifecycleState;project.targetEngine='lifecycle-inactive';continue;}\n",'status-project-lifecycle');
  t=patch(t,"  for(const game of catalog.games){\n    const project=portfolio.projects.find(row=>row.slug===game.id);\n    if(!project)continue;\n","  for(const game of catalog.games){\n    game.lifecycleState=gameLifecycleState(game);\n    const project=portfolio.projects.find(row=>row.slug===game.id);\n    if(!project)continue;\n    if(!lifecycleAllowsDevelopment(game)){game.productionTarget='lifecycle-inactive';game.homepageStage=game.lifecycleState;continue;}\n",'status-catalog-lifecycle');
  t=patch(t,"  const releaseIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED).map(row=>row.project.id).sort();\n  const developmentIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED).map(row=>row.project.id).sort();\n  const designIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DESIGN_ONLY).map(row=>row.project.id).sort();\n  const counts=productionClassCounts(rows);\n","  const liveRows=rows.filter(row=>['ACTIVE','REBUILD'].includes(row.lifecycleState));\n  const releaseIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED).map(row=>row.project.id).sort();\n  const developmentIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED).map(row=>row.project.id).sort();\n  const designIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DESIGN_ONLY).map(row=>row.project.id).sort();\n  const counts=productionClassCounts(liveRows);\n",'status-active-counts');
  t=patch(t,"    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,productionClass:row.productionClass,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,targetPlatform:row.targetPlatform||null,targetPlatformReady:row.targetPlatformReady,sourceReady:row.sourceReady})),","    lifecycle:{active:rows.filter(row=>row.lifecycleState==='ACTIVE').map(row=>row.project.id),paused:rows.filter(row=>row.lifecycleState==='PAUSED').map(row=>row.project.id),rebuild:rows.filter(row=>row.lifecycleState==='REBUILD').map(row=>row.project.id),retired:rows.filter(row=>row.lifecycleState==='RETIRED').map(row=>row.project.id),removed:rows.filter(row=>row.lifecycleState==='REMOVED').map(row=>row.project.id)},\n    pipeline:{target:60,count:liveRows.length,activeDevelopmentWipMax:20,deficit:Math.max(0,60-liveRows.length)},\n    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,lifecycleState:row.lifecycleState,productionClass:row.productionClass,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,targetPlatform:row.targetPlatform||null,targetPlatformReady:row.targetPlatformReady,sourceReady:row.sourceReady})),",'status-lifecycle-telemetry');
  write(p,t);
}

// 3. Planner and queue synchronization.
{
  const p='tools/vibe2-auto-planner.mjs';
  let t=read(p);
  const catalog="function catalogById(catalog={}){return new Map((Array.isArray(catalog.games)?catalog.games:[]).map(game=>[clean(game.id),game]));}\n";
  if(!t.includes('function synchronizeQueueLifecycle')){
    t=patch(t,catalog,catalog+"const GAME_LIFECYCLE_STATES=new Set(['ACTIVE','PAUSED','REBUILD','RETIRED','REMOVED']);\nexport function gameLifecycleState(game={}){const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();return GAME_LIFECYCLE_STATES.has(raw)?raw:'ACTIVE';}\nfunction lifecycleAllowsDevelopment(game={}){return ['ACTIVE','REBUILD'].includes(gameLifecycleState(game));}\nfunction synchronizeQueueLifecycle(queueInput={},catalog={}){const byId=catalogById(catalog),tasks=(Array.isArray(queueInput?.tasks)?queueInput.tasks:[]).map(item=>{const game=byId.get(clean(item.gameId));if(!game||!lifecycleAllowsDevelopment(game)){const state=game?gameLifecycleState(game):'MISSING_FROM_CATALOG';if(item.status==='queued')return{...item,status:'cancelled',blocker:`lifecycle-inactive:${state}`,evidence:[...(item.evidence||[]),`lifecycle-sync:${state}`]};if(item.status==='running')return{...item,blocker:`lifecycle-stop-requested:${state}`,evidence:[...(item.evidence||[]),`lifecycle-stop-requested:${state}`]};}return item;});return{...(queueInput||{}),tasks};}\n",'planner-lifecycle-helpers');
  }
  t=patch(t,"function collectProjects(status={},catalog={},repoRoot=process.cwd()){const byId=catalogById(catalog),rows=[];for(const project of Array.isArray(status.projects)?status.projects:[]){const id=clean(project.gameId),engine=engineFromProject(project),root=posix(project.robloxProjectPath||project.projectPath||project.source);if(!id||!engine||!root||clean(project.ownerDecision).toUpperCase()!=='PASS')continue;const game=byId.get(id)||{},state=stateFromCatalog(game),developmentBaseline=state==='release-confirmed'&&engine==='unity'?latestDevelopmentBaselineEvidence(id,repoRoot):null;rows.push({...project,gameId:id,engine,projectPath:root,releaseState:state,existing:true,source:'company-status',developmentBaseline});}\nfor(const game of Array.isArray(catalog.games)?catalog.games:[]){","function collectProjects(status={},catalog={},repoRoot=process.cwd()){const byId=catalogById(catalog),rows=[];for(const project of Array.isArray(status.projects)?status.projects:[]){const id=clean(project.gameId),engine=engineFromProject(project),root=posix(project.robloxProjectPath||project.projectPath||project.source);if(!id||!engine||!root||clean(project.ownerDecision).toUpperCase()!=='PASS')continue;const game=byId.get(id);if(!game||!lifecycleAllowsDevelopment(game))continue;const state=stateFromCatalog(game),developmentBaseline=state==='release-confirmed'&&engine==='unity'?latestDevelopmentBaselineEvidence(id,repoRoot):null;rows.push({...project,gameId:id,engine,projectPath:root,lifecycleState:gameLifecycleState(game),releaseState:state,existing:true,source:'company-status',developmentBaseline});}\nfor(const game of Array.isArray(catalog.games)?catalog.games:[]){if(!lifecycleAllowsDevelopment(game))continue;",'planner-collect-projects');
  t=patch(t,"  let queue=createVibeContinuousQueue({...(queueInput||{}),maxConcurrentTasks:parallelLimit(maxConcurrentTasks)});\n","  let queue=createVibeContinuousQueue({...synchronizeQueueLifecycle(queueInput||{},catalog),maxConcurrentTasks:parallelLimit(maxConcurrentTasks)});\n",'planner-queue-sync');
  t=t.replace("projectPriorityPolicy:'OWNER_WEBGAME_FIRST_THEN_CONFIRMED_WEB_THEN_ROBLOX_THEN_RELEASE_UNITY'","projectPriorityPolicy:'LIFECYCLE_ACTIVE_REBUILD_ONLY_THEN_OWNER_WEBGAME_FIRST_THEN_CONFIRMED_WEB_THEN_ROBLOX_THEN_RELEASE_UNITY'");
  write(p,t);
}

// 4. Regression contract.
write('qa/game-lifecycle-sync-policy.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central lifecycle authority and pipeline target are documented',()=>{
  const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
  for(const token of ['canonicalLifecycleAuthority: GAME_CATALOG_LIFECYCLE_STATE_BY_GAME_ID','developmentPipelineTarget: 60','staleCompanyStatusCannotResurrectMissingCatalogGame: true','queuedTasksMustCancel: true','runningTaskMustStopAtNextSafeBoundary: true']) assert.equal(flow.includes(token),true,token);
});

test('planner blocks stale resurrection and stale queued work',()=>{
  const src=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.equal(src.includes("if(!game||!lifecycleAllowsDevelopment(game))continue"),true);
  assert.equal(src.includes("status:'cancelled',blocker:\`lifecycle-inactive:"),true);
  assert.equal(src.includes('lifecycle-stop-requested'),true);
});

test('company status exports lifecycle and 60-pipeline telemetry',()=>{
  const src=fs.readFileSync('tools/company-status-sync.mjs','utf8');
  assert.equal(src.includes('export function gameLifecycleState'),true);
  assert.equal(src.includes('pipeline:{target:60'),true);
  assert.equal(src.includes("targetEngine='lifecycle-inactive'"),true);
});
`);

console.log('GAME_LIFECYCLE_SYNC_POLICY=APPLIED');
