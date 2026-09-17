import fs from 'node:fs';

function replaceOnce(file,from,to){
  const text=fs.readFileSync(file,'utf8');
  if(!text.includes(from))throw new Error(`${file}: patch target missing`);
  fs.writeFileSync(file,text.replace(from,to));
}

replaceOnce('COMPANY_FLOW.md',
`    staleCatalogMissingProjectMustBecomeLifecycleInactive: true\n`,
`    staleCatalogMissingProjectMustBecomeLifecycleInactive: true\n    existingDevelopmentConfirmedReconciliation:\n      activeOrRebuildCatalogGameMustHaveDevelopmentQueueEntry: true\n      existingPlayableWebGameMissingValidationMustStillEnterDevelopment: true\n      missingValidationCannotBecomeNoSafeAutonomousTask: true\n      preserveExistingSourceBeforeAnyRegeneration: true\n      firstContinuationGoal: REAL_GAMEPLAY_IMPLEMENTATION_AND_VALIDATION_READINESS\n      catalogLifecycleRemainsCanonicalAuthority: true\n`);

replaceOnce('tools/design-only-promotion-sync.mjs',
`  const promoted=[];\n  const skipped=[];\n  const stamp=nowIso();\n`,
`  const promoted=[];\n  const skipped=[];\n  const reconciledExisting=[];\n  const stamp=nowIso();\n`);

replaceOnce('tools/design-only-promotion-sync.mjs',
`  state.updatedAt=stamp;queue.updatedAt=stamp;queue.webValidationPolicy='REQUIRED_WEB_STRICT_REVIEW_BEFORE_POST_WEB_ARTBOOK_AND_TARGET_PLATFORM';\n`,
`  // 이미 존재하는 실제 Web 게임이 owner 지시로 DEVELOPMENT_CONFIRMED가 된 경우도\n  // seed 승격 이력이 없다는 이유로 개발 큐에서 빠지면 안 된다.\n  for(const game of catalog.games||[]){\n    const gameId=String(game?.id||'').trim();\n    const productionClass=String(game?.productionClass||'').toUpperCase();\n    const lifecycleState=String(game?.lifecycleState||'ACTIVE').toUpperCase();\n    if(!gameId||productionClass!=='DEVELOPMENT_CONFIRMED'||!['ACTIVE','REBUILD'].includes(lifecycleState))continue;\n    const webSourcePath=webSourcePathOf(gameId);\n    if(!fs.existsSync(p(webSourcePath))||!fs.existsSync(p(webSourcePath,'index.html')))continue;\n    if(queue.items.some(row=>row?.gameId===gameId))continue;\n    const design=latestReadyDesign(root,gameId);\n    const selectedPlatform=resolveSelectedPlatform('',game)||'';\n    const targetSourcePath=selectedPlatform?targetSourcePathOf(gameId,selectedPlatform):'';\n    const item={\n      gameId,\n      seedId:null,\n      gameName:game.name||gameId,\n      productionClass:'DEVELOPMENT_CONFIRMED',\n      lifecycleState,\n      status:'ACTIVE',\n      sourcePath:webSourcePath,\n      webSourcePath,\n      selectedPlatform:selectedPlatform||null,\n      targetPlatform:selectedPlatform||null,\n      targetSourcePath:targetSourcePath||null,\n      designBaselineSource:design?.designSource||null,\n      designDate:design?.date||null,\n      existingGameContinuation:true,\n      preservationPolicy:'PRESERVE_EXISTING_REAL_GAME_BEFORE_REGENERATION',\n      currentStep:design?'WEB_PLAYABLE_BOOTSTRAP':'EXISTING_WEB_GAME_CONTINUATION',\n      canonicalState:'WAITING_WEB_GAMEPLAY_VALIDATION',\n      webValidationRequired:true,\n      musicValidationRequired:true,\n      homepageTestCandidate:false,\n      homepageTestScore:null,\n      homepageTestVerdict:'WAITING_WEB_STRICT_REVIEW',\n      webValidationQueuedAt:stamp,\n      artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',\n      postPromotionArtbookRequired:false,\n      postWebArtbookRequired:true,\n      enqueuedAt:stamp\n    };\n    queue.items.push(item);\n    reconciledExisting.push(gameId);\n  }\n\n  state.updatedAt=stamp;queue.updatedAt=stamp;queue.webValidationPolicy='REQUIRED_WEB_STRICT_REVIEW_BEFORE_POST_WEB_ARTBOOK_AND_TARGET_PLATFORM';\n`);

replaceOnce('tools/design-only-promotion-sync.mjs',
`  return {promoted,skipped,queueCount:queue.items.length,ownerResetSeedsMaterialized:resetResult.changed};\n`,
`  return {promoted,skipped,reconciledExisting,queueCount:queue.items.length,ownerResetSeedsMaterialized:resetResult.changed};\n`);

replaceOnce('tools/design-only-promotion-sync.mjs',
`  console.log(\`DEVELOPMENT_QUEUE_COUNT=\${result.queueCount}\`);\n`,
`  console.log(\`DEVELOPMENT_QUEUE_COUNT=\${result.queueCount}\`);\n  console.log(\`DEVELOPMENT_EXISTING_RECONCILED=\${result.reconciledExisting.join(',')||'NONE'}\`);\n`);

replaceOnce('tools/vibe2-auto-planner.mjs',
`function bottleneckRank(project={}){const v=project.developmentValidation||{},score=Number(v.score),state=clean(v.state).toUpperCase(),blockers=Array.isArray(v.blockers)?v.blockers:[];if(project.engine==='web'&&score>=80&&score<=88)return 0;if(blockers.length===1)return 1;if(/REVALIDATION|RETURN_TO_WEB_DEVELOPMENT/.test(state))return 2;if(clean(project.lifecycleState).toUpperCase()==='REBUILD')return 3;return 4;}\n`,
`function bottleneckRank(project={}){const v=project.developmentValidation||{},score=Number(v.score),state=clean(v.state).toUpperCase(),blockers=Array.isArray(v.blockers)?v.blockers:[];if(project.engine==='web'&&score>=80&&score<=88)return 0;if(blockers.length===1)return 1;if(project.engine==='web'&&project.releaseState==='development-confirmed'&&state==='MISSING')return 2;if(/REVALIDATION|RETURN_TO_WEB_DEVELOPMENT/.test(state))return 3;if(clean(project.lifecycleState).toUpperCase()==='REBUILD')return 4;return 5;}\n`);

replaceOnce('tools/vibe2-auto-planner.mjs',
`function findSafeTasks(project,repoRoot,queue){\n`,
`function findExistingWebDevelopmentContinuationTask(project,repoRoot,queue){\n  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;\n  const validation=project.developmentValidation||{};\n  const score=Number(validation.score);\n  if(clean(validation.state).toUpperCase()!=='MISSING'||Number.isFinite(score))return null;\n  const relative=\`\${posix(project.projectPath)}/index.html\`,file=sourceFile(repoRoot,relative);\n  if(!fs.existsSync(file))return null;\n  const id=\`\${project.gameId}-existing-web-development-continuation-v1\`;\n  if(hasTask(queue,id))return null;\n  const goal=\`[EXISTING_WEB_DEVELOPMENT_CONTINUATION] \${project.name||project.gameId}는 ACTIVE DEVELOPMENT_CONFIRMED 기존 실제 Web 게임이지만 최신 development validation이 아직 없다. 기존 게임/세이브/핵심 루프를 재생성하거나 초기화하지 말고 현재 소스를 기준으로 개발을 계속한다. 실제 플레이에서 체감되는 하나의 일관된 기능 패키지를 구현하거나 현재 끊긴 시스템 연결을 완성하고, 모바일 입력·상태 일치·저장 호환·실패/재시도·회귀 안정성을 함께 확인한다. 검증용 숫자/라벨/버튼만 추가하는 작업은 금지한다. 변경 후 다음 Web 실제 플레이 검증이 가능한 상태로 만든다. 회사/홈페이지 정책 파일은 수정하지 않는다.\`;\n  return task(id,project,goal,[relative],'high','medium',['existing-web-continuation','development-validation:missing','preserve-existing-game']);\n}\nfunction findSafeTasks(project,repoRoot,queue){\n`);

replaceOnce('tools/vibe2-auto-planner.mjs',
`    return uniqueTaskCandidates([findWebStrictImprovementTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);\n`,
`    return uniqueTaskCandidates([findWebStrictImprovementTask(project,repoRoot,queue),findExistingWebDevelopmentContinuationTask(project,repoRoot,queue),findWebDiagnosticTask(project,repoRoot,queue),scanExplicitMarkerTask(project,repoRoot,queue)]);\n`);

const test=`import fs from 'node:fs';\nimport assert from 'node:assert/strict';\n\nconst flow=fs.readFileSync('COMPANY_FLOW.md','utf8');\nconst promotion=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');\nconst planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');\nconst catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));\nconst cozy=(catalog.games||[]).find(g=>g.id==='cozy-island');\nassert.equal(cozy?.productionClass,'DEVELOPMENT_CONFIRMED');\nassert.equal(cozy?.lifecycleState,'ACTIVE');\nassert.ok(fs.existsSync('web-games/cozy-island/index.html'));\nassert.match(flow,/activeOrRebuildCatalogGameMustHaveDevelopmentQueueEntry: true/);\nassert.match(flow,/missingValidationCannotBecomeNoSafeAutonomousTask: true/);\nassert.match(promotion,/DEVELOPMENT_EXISTING_RECONCILED/);\nassert.match(promotion,/existingGameContinuation:true/);\nassert.match(planner,/findExistingWebDevelopmentContinuationTask/);\nassert.match(planner,/EXISTING_WEB_DEVELOPMENT_CONTINUATION/);\nconsole.log('EXISTING_DEVELOPMENT_ONBOARDING_QA=PASS');\n`;
fs.writeFileSync('qa/company-existing-development-onboarding.test.mjs',test);

console.log('EXISTING_DEVELOPMENT_ONBOARDING_PATCH=APPLIED');
