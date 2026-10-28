// 파일명: qa/company-development-roblox-runtime-continuation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {inspectRobloxBuildPreflight,evaluateRobloxBuildPreflight,parseRobloxBuildPreflightReview} from '../tools/company-development-roblox-build-preflight.mjs';

const preflight=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
const headless=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-headless-fast-mvp.yml',import.meta.url),'utf8');
const headlessEvaluator=fs.readFileSync(new URL('../tools/company-development-roblox-headless-fast-mvp.mjs',import.meta.url),'utf8');
const parent=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
const postRuntime=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-post-runtime-qa.yml',import.meta.url),'utf8');
const f9=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-final-review-revalidation.yml',import.meta.url),'utf8');
const directive=JSON.parse(fs.readFileSync(new URL('../company-directive.json',import.meta.url),'utf8'));

test('Roblox native path is package -> shared preflight -> F0 -> private validation -> runtime QA -> F9 final publish',()=>{
  assert.ok(preflight.includes('workflow_dispatch:'));
  assert.ok(!preflight.includes('company-development-roblox-package.mjs'));
  assert.ok(preflight.includes('company-development-roblox-build-preflight.mjs'));
  assert.ok(!preflight.includes("model: 'llama3.2:1b'"));
  assert.ok(preflight.includes('Check per-game exact package and source evidence'));
  assert.ok(preflight.includes('company-development-roblox-headless-fast-mvp.yml'));
  assert.ok(headless.includes('Roblox F0 Source Preflight'));
  assert.ok(headless.includes('company-development-roblox-headless-fast-mvp.mjs'));
  assert.ok(headless.includes('company-development-roblox-release-promotion.yml'));
  assert.ok(headless.includes('publish_stage=validation'));
  assert.ok(headless.includes('ROBLOX_STUDIO_REQUIRED_FOR_F0_CONTINUATION=NO'));
  assert.ok(runtime.includes('Route F0-passed artifacts to private runtime validation without Studio'));
  assert.ok(runtime.includes('publish_stage=validation'));
  assert.ok(runtime.includes('ROBLOX_PRE_F9_VALIDATION_TARGET=PRIVATE_DEDICATED'));
  assert.ok(postRuntime.includes('Dispatch exact F9 review'));
  assert.ok(f9.includes('publish_stage=final'));
});

test('F0 candidates automatically enter the existing official Studio MCP QA flow without promotion shortcuts',()=>{
  const marker=runtime.indexOf('# Official Studio MCP actual play is the independent, required F9 gate.');
  const end=runtime.indexOf('  # Repair a stale provenance flag',marker);
  assert.ok(marker>0&&end>marker,'automatic Studio dispatch must remain in the canonical continuation stage');
  const auto=runtime.slice(marker,end);
  assert.match(auto,/planLocalStudioCandidates/);
  assert.match(auto,/roblox-continuation-dispatch-queue\.json/);
  assert.match(auto,/company-learning\/platform-release-roadmap\.json/);
  assert.match(auto,/requestedGameId:String\(process\.env\.REQUESTED_GAME_ID/);
  assert.match(auto,/ROBLOX_STUDIO_MCP_AUTO_PLAN_COUNT=/);
  assert.match(auto,/ROBLOX_STUDIO_MCP_F9_GATE_REMAINS_REQUIRED=YES/);
  assert.match(auto,/cat \/tmp\/roblox-runtime-qa-ready-ids \/tmp\/roblox-studio-mcp-auto-ready-ids \| sed '\/\^\$\/d' \| sort -u/);
  assert.match(auto,/if \[ "\$runtime_qa_ready" -gt 0 \] \|\| \[ "\$studio_qa_ready" -gt 0 \]; then/);
  assert.match(auto,/DEDUPED_ACTIVE:/);
  assert.match(auto,/gh workflow run company-development-roblox-post-runtime-qa\.yml/);
  assert.match(auto,/done < \/tmp\/roblox-native-qa-ready-ids/);
  assert.doesNotMatch(auto,/robloxInternalVibePlayEvidence\s*=|ROBLOX_STUDIO_MCP_RUNTIME=PASS|publish_stage=final/);
});

test('shared preflight requires exact immutable build and preserves configured shared model',()=>{
  const item={
    gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxSourceBootstrapPassedAt:'2026-09-22T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  const configured='gemini-3.8-flash';
  assert.equal(result.distinctLeadCount,configured?1:0);
  assert.equal(result.sharedModel,configured);
  assert.equal(inspectRobloxBuildPreflight({item:{...item,productionClass:'RELEASE_CONFIRMED'},directive}).pass,true);
  assert.equal(inspectRobloxBuildPreflight({item:{...item,productionClass:'DESIGN_ONLY'},directive}).pass,false);
});

test('exact game build evidence checks configured shared reviewer and still blocks invalid packages',async()=>{
  const item={
    gameId:'test-roblox',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxBuildOrPackagePassed:true,robloxSourceCommit:'a'.repeat(40),
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64)
  };
  let calls=0;
  const fetchImpl=async (_url,options)=>{
    calls++;
    const request=JSON.parse(options.body);
    assert.match(_url,/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.(?:8-flash|5-flash-lite):generateContent$/);
    assert.match(request.contents[0].parts[0].text,/BUILD_EVIDENCE=/);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({decision:'PASS',blockers:[],note:'Exact immutable build is consistent.'})}]}}]})};
  };
  const priorKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='mock-key-only';
  let result;
  try{result=await evaluateRobloxBuildPreflight({item,directive,fetchImpl});}
  finally{if(priorKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=priorKey;}
  assert.equal(result.pass,true);
  const configured=inspectRobloxBuildPreflight({item,directive}).sharedModel;
  assert.equal(calls,configured?1:0);
  assert.equal(result.reviewMode,configured?'EXTERNAL_GEMINI_FREE_PAIR_REVIEW':'DETERMINISTIC_GAME_BUILD_EVIDENCE_ONLY');
  assert.equal(result.leadReviews.length,configured?1:0);
  const failed=await evaluateRobloxBuildPreflight({item:{...item,robloxBuildOrPackagePassed:false},directive,
    fetchImpl:()=>{throw new Error('Invalid package must be rejected before a model request')}});
  assert.equal(failed.pass,false);
  assert.ok(failed.blockers.includes('build-package-not-passed'));
});

test('strict preflight accepts a fully fenced JSON review but rejects narrative or unverified claims',()=>{
  const nl=String.fromCharCode(10);
  const pass={decision:'PASS',blockers:[],note:'Exact immutable package is consistent.'};
  const body=JSON.stringify(pass);
  assert.deepEqual(parseRobloxBuildPreflightReview(body),pass);
  assert.deepEqual(parseRobloxBuildPreflightReview('```json'+nl+body+nl+'```'),pass);
  const block={decision:'BLOCK',blockers:['source mismatch'],note:'Source differs from package.'};
  assert.deepEqual(parseRobloxBuildPreflightReview('```JSON'+nl+JSON.stringify(block)+nl+'```'),block);
  for(const invalid of [
    'Here is JSON:'+nl+body,
    '```json'+nl+body+nl+'```'+nl+'extra',
    '```json'+nl+body+nl,
    JSON.stringify({...pass,extra:'unverified'}),
    JSON.stringify({...pass,blockers:['mismatch']}),
    JSON.stringify({...block,blockers:[]}),
    JSON.stringify({...pass,note:'x'.repeat(241)}),
    JSON.stringify({decision:'PASS',note:'no blockers field'})
  ])assert.throws(()=>parseRobloxBuildPreflightReview(invalid),/ROBLOX_PREFLIGHT_EXTERNAL_AI_INVALID_REVIEW/);
});
test('shared preflight admits canonical Roblox Unity concurrent lane without changing selected platform',()=>{
  const item={
    gameId:'dual',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'UNITY',targetPlatform:'UNITY',
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    robloxSourceBootstrapPassedAt:'2026-09-22T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.robloxLaneEligible,true);
  assert.equal(result.directRoblox,false);
  assert.equal(result.concurrentRoblox,true);
  assert.ok(!result.blockers.includes('roblox-platform-required'));
  assert.equal(item.selectedPlatform,'UNITY');
  assert.equal(item.targetPlatform,'UNITY');
});

test('Unity-Web-first dual platform runtime preflight repairs the observed platform-only blocker without weakening F0 evidence',()=>{
  const item={
    gameId:'legacy-dual',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'UNITY',targetPlatform:'UNITY',
    platformExecutionMode:'UNITY_WEB_FLOOR_THEN_ROBLOX_UNITY_CONCURRENT',
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    robloxSourceBootstrapPassedAt:'2026-10-08T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),
    robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64)
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.concurrentRoblox,true);
  assert.equal(result.directRoblox,false);
  assert.deepEqual(result.blockers,[]);
  const missingUnity=inspectRobloxBuildPreflight({item:{...item,concurrentTargetPlatforms:['ROBLOX']},directive});
  assert.equal(missingUnity.pass,false);
  assert.ok(missingUnity.blockers.includes('roblox-platform-required'));
  const missingRoblox=inspectRobloxBuildPreflight({item:{...item,concurrentTargetPlatforms:['UNITY']},directive});
  assert.equal(missingRoblox.pass,false);
  const unknownMode=inspectRobloxBuildPreflight({item:{...item,platformExecutionMode:'UNVERIFIED_PENDING'},directive});
  assert.equal(unknownMode.pass,false);
  const staleBuild=inspectRobloxBuildPreflight({item:{...item,robloxBuildSourceRevision:'c'.repeat(40)},directive});
  assert.equal(staleBuild.pass,false);
  assert.ok(staleBuild.blockers.includes('source-revision-mismatch'));
  const nonConfirmed=inspectRobloxBuildPreflight({item:{...item,productionClass:'DESIGN_ONLY'},directive});
  assert.equal(nonConfirmed.pass,false);
  assert.ok(nonConfirmed.blockers.includes('confirmed-production-class-required'));
});

test('owner-active Roblox preflight admits exact packages while preserving evidence and target guards',()=>{
  const item={
    gameId:'gem-survivor',productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'UNITY',targetPlatform:'UNITY',
    platformExecutionMode:'OWNER_ACTIVE_PLATFORMS_SAME_GAME',concurrentTargetPlatforms:['ROBLOX','UNITY'],
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const inspect=patch=>inspectRobloxBuildPreflight({item:{...item,...patch},directive});
  assert.equal(inspect({}).pass,true);
  assert.equal(inspect({concurrentTargetPlatforms:['ROBLOX']}).pass,true);
  for(const patch of [
    {concurrentTargetPlatforms:['UNITY']},{concurrentTargetPlatforms:[]},
    {platformExecutionMode:'UNKNOWN'},{robloxBuildOrPackagePassed:false},
    {robloxBuildSourceRevision:'c'.repeat(40)},{robloxBuildArtifactIdentity:'unbound'},
    {productionClass:'DESIGN_ONLY'},
  ])assert.equal(inspect(patch).pass,false,JSON.stringify(patch));
  assert.equal(item.selectedPlatform,'UNITY');
  assert.equal(item.robloxBuildPreflightPassed,undefined);
});

test('continuation retries owner-active platform-only failures without reviving other failed reviews',()=>{
  const header="          import fs from 'node:fs';";
  const start=preflight.indexOf(header);
  const end=preflight.indexOf('\n          NODE',start);
  const script=preflight.slice(start,end).replace(/^\s*import .*;$/gm,'');
  const base={
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',selectedPlatform:'UNITY',
    platformExecutionMode:'OWNER_ACTIVE_PLATFORMS_SAME_GAME',concurrentTargetPlatforms:['ROBLOX','UNITY'],
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
    robloxBuildPassedAt:'2026-10-11T12:00:00Z',robloxBuildPreflightFailedAt:'2026-10-11T13:00:00Z',
    robloxBuildPreflightEvidence:{blockers:['roblox-platform-required']},
  };
  const expected=['gem-survivor','zombie-survival','tower-choice-rpg','fantasy-survival'];
  const items=expected.map(gameId=>({...base,gameId}));
  items.push(
    {...base,gameId:'mixed-blockers',robloxBuildPreflightEvidence:{blockers:['roblox-platform-required','source-revision-mismatch']}},
    {...base,gameId:'model-blocked',robloxBuildPreflightEvidence:{blockers:['model-review-blocked']}},
    {...base,gameId:'held-only',concurrentTargetPlatforms:['UNITY']},
    {...base,gameId:'stale-package',robloxBuildSourceRevision:'c'.repeat(40)},
    {...base,gameId:'inactive',status:'DISABLED'},
  );
  const written=[];
  runInNewContext(script,{
    fs:{readFileSync:file=>JSON.stringify(file.endsWith('development-queue.json')?{items}:{roblox:{validationMode:'HEADLESS_FAST_MVP'}}),appendFileSync:(_,value)=>written.push(value)},
    ownerFocusedSecondaryPlatformEligible:()=>false,
    process:{env:{GITHUB_OUTPUT:'output'}},console:{log:()=>{}},
  });
  const matrix=JSON.parse(written.find(line=>line.startsWith('matrix=')).slice('matrix='.length));
  assert.deepEqual(matrix.include.map(row=>row.gameId),expected);
  assert.ok(matrix.include.every(row=>row.secondaryOwnerFocus===false));
  assert.ok(items.every(item=>item.robloxBuildPreflightPassed===undefined));
});

test('Roblox preflight continuation revisits only explicit verified dual platform admission after legacy failure',()=>{
  assert.ok(preflight.includes("toUpperCase()==='UNITY_WEB_FLOOR_THEN_ROBLOX_UNITY_CONCURRENT'"));
  assert.ok(preflight.includes("toUpperCase()==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'"));
  assert.ok(preflight.includes("toUpperCase()==='UNITY'"));
  assert.ok(preflight.includes("priorBlockers.every(blocker=>blocker==='roblox-platform-required')"));
  assert.ok(preflight.includes('ROBLOX_PREFLIGHT_SUPERSEDED_PLATFORM_BLOCKER_RETRY='));
  assert.ok(preflight.includes("if(!exactBuild||preflightPassed)continue;"));
  assert.ok(preflight.includes("if(preflightFailedValue&&!stalePreflightFailure)continue;"));
});

test('continuation planner recognizes canonical concurrent Roblox lane before owner-focus fallback',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/platformExecutionMode\|\|''\)\.toUpperCase\(\)==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'/);
  assert.match(workflow,/item\.concurrentTargetPlatforms\.some\(value=>String\(value\|\|''\)\.toUpperCase\(\)==='ROBLOX'\)/);
  assert.match(workflow,/const secondaryOwnerFocus=platform!=='ROBLOX'&&!concurrentRoblox&&ownerFocusedSecondaryPlatformEligible/);
  assert.match(workflow,/if\(platform!=='ROBLOX'&&!concurrentRoblox&&!secondaryOwnerFocus\)continue/);
});

test('continuation retries the superseded Roblox-only platform blocker for canonical concurrent games',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/const priorPreflightEvidence=secondaryOwnerFocus\?item\.ownerFocusRobloxBuildPreflightEvidence:item\.robloxBuildPreflightEvidence/);
  assert.match(workflow,/priorBlockers\.every\(blocker=>blocker==='roblox-platform-required'\)/);
  assert.match(workflow,/&&concurrentRoblox/);
  assert.match(workflow,/ROBLOX_PREFLIGHT_SUPERSEDED_PLATFORM_BLOCKER_RETRY=/);
  assert.match(workflow,/\|\|supersededConcurrentPlatformBlocker/);
});

test('preflight persistence promotes only exact source and artifact',()=>{
  assert.ok(preflight.includes('result?.sourceRevision===sourceRevision'));
  assert.ok(preflight.includes('result?.artifactIdentity===artifactIdentity'));
  assert.ok(preflight.includes('robloxBuildPreflightPassed:true'));
  assert.ok(preflight.includes("robloxFailureStage:'F0_SOURCE_INTEGRITY'"));
  assert.ok(preflight.includes("robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING'"));
});

test('F0 source preflight validates source integrity and explicitly cannot claim actual runtime',()=>{
  for(const token of ['duplicateDeclarationGuard','foundationSentinelContract','sourceStartupMarkers','f0SourceIntegrityPassed','actualRuntimeEvidence:false','runtimeFoundationPassed:false']){
    assert.ok(headlessEvaluator.includes(token),token);
  }
  assert.ok(headless.includes('rebuilt'));
  assert.ok(headless.includes('EXPECTED_ARTIFACT'));
  assert.ok(headless.includes('robloxFoundationF0Passed=exact'));
  assert.ok(headless.includes("item.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'"));
});

test('canonical native parent calls Roblox runtime while Roblox runtime watches both fast-path workflow contracts',()=>{
  assert.ok(parent.includes('name: Dispatch independent Roblox game development'));
  assert.ok(parent.includes('gh workflow run company-development-roblox-runtime.yml --repo'));
  assert.ok(parent.includes('ROBLOX_PARENT_WAITS_FOR_GAME_COMPLETION=NO'));
  assert.ok(runtime.includes("- '.github/workflows/company-development-roblox-runtime-continuation.yml'"));
  assert.ok(runtime.includes("- '.github/workflows/company-development-roblox-headless-fast-mvp.yml'"));
});

test('already preflight-ready games wake F0 without requiring a new preflight pass in the same run',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.match(workflow,/f0_ready_count:/);
  assert.match(workflow,/ROBLOX_EXISTING_F0_READY_COUNT=/);
  assert.match(workflow,/needs: \[preflight-plan, preflight-persist\]/);
  assert.match(workflow,/needs\.preflight-plan\.outputs\.f0_ready_count != '0'/);
  assert.match(workflow,/needs\.preflight-persist\.outputs\.pass_count != '0'/);
});

test('already verified F0 work skips empty persistence without bypassing exact package gates',()=>{
  const slice=(from,to)=>{
    const begin=preflight.indexOf('\n  '+from+':\n');
    const end=preflight.indexOf('\n  '+to+':\n',begin);
    assert.ok(begin>=0&&end>begin,from);
    return preflight.slice(begin,end);
  };
  const persist=slice('preflight-persist','dispatch-headless');
  const dispatch=preflight.slice(preflight.indexOf('\n  dispatch-headless:\n'));
  const persistExpr=persist.match(/^\s+if: (.+)$/m)?.[1];
  const dispatchExpr=dispatch.match(/^\s+if: (.+)$/m)?.[1];
  assert.ok(persistExpr&&dispatchExpr);
  assert.match(persist,/needs: \[preflight-plan, preflight-worker\]/);
  assert.match(dispatch,/needs: \[preflight-plan, preflight-persist\]/);
  assert.match(persistExpr,/needs\.preflight-plan\.outputs\.count != '0'/);
  assert.match(dispatchExpr,/needs\.preflight-plan\.result == 'success'/);
  assert.match(dispatchExpr,/needs\.preflight-persist\.result == 'skipped'/);
  assert.match(dispatchExpr,/needs\.preflight-persist\.outputs\.pass_count != '0'/);
  const check=(expression,{plan='success',count='0',ready='0',persistState='skipped',passed=''}={})=>{
    // GitHub job names include hyphens; normalize identifiers for evaluating
    // exactly the existing workflow condition rather than a copy of its logic.
    const normalized=expression
      .replaceAll('needs.preflight-plan','needs.plan')
      .replaceAll('needs.preflight-persist','needs.persist');
    return runInNewContext(normalized,{
      always:()=>true,
      needs:{
        plan:{result:plan,outputs:{count,f0_ready_count:ready}},
        persist:{result:persistState,outputs:{pass_count:passed}},
      },
    });
  };
  // An already-verified package has nothing to write and can go directly to F0.
  assert.equal(check(persistExpr,{count:'0'}),false);
  assert.equal(check(dispatchExpr,{ready:'1'}),true);
  // Neither a missing preflight pass nor a failed writer can open F0.
  assert.equal(check(dispatchExpr,{ready:'0'}),false);
  assert.equal(check(dispatchExpr,{ready:'1',persistState:'failure'}),false);
  assert.equal(check(dispatchExpr,{ready:'1',plan:'failure'}),false);
  // A fresh exact PASS still requires real successful persistence.
  assert.equal(check(persistExpr,{count:'1'}),true);
  assert.equal(check(dispatchExpr,{count:'1',persistState:'success',passed:'1'}),true);
  assert.equal(check(dispatchExpr,{count:'1',persistState:'success',passed:'0'}),false);
  assert.equal(check(dispatchExpr,{count:'1',persistState:'failure',passed:'1'}),false);
});

test('shared Roblox preflight checkout fans out without an internal six-game cap',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.doesNotMatch(workflow,/rows\.length>=6/);
  assert.match(workflow,/rows\.length>=256/);
  assert.doesNotMatch(workflow,/max-parallel:\s*6/);
  assert.match(workflow,/ROBLOX_EXECUTION_WIP_MAX=EXTERNAL_PROVIDER_CAPACITY_ONLY/);
  assert.match(workflow,/ROBLOX_PREFLIGHT_CHECKOUT_MODE=PER_GAME_MATRIX_PARALLEL/);
  assert.doesNotMatch(workflow,/ROBLOX_AUTHENTICATED_RUNNER_WIP_MAX/);
});

test('F0 readiness follows canonical central Roblox validation mode instead of queue-local robloxValidationMode',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  assert.ok(workflow.includes("const canonicalRobloxValidationMode=String(roadmap.roblox?.validationMode||'').trim();"));
  assert.ok(workflow.includes("if(canonicalRobloxValidationMode!=='HEADLESS_FAST_MVP')throw new Error('ROBLOX_CANONICAL_VALIDATION_MODE_INVALID:'+canonicalRobloxValidationMode);"));
  assert.ok(workflow.includes('ROBLOX_CANONICAL_VALIDATION_MODE='));
  assert.doesNotMatch(workflow,/item\.robloxValidationMode/);
});

test('Roblox preflight persistence does not hold a global writer job lock and retries semantic writes on conflict',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const start=workflow.indexOf('\n  preflight-persist:\n');
  const end=workflow.indexOf('\n  dispatch-headless:\n',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(block,/group:\s*company-runtime-writer/);
  assert.match(block,/ROBLOX_PREFLIGHT_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(block,/ROBLOX_PREFLIGHT_PERSIST_CONFLICT_RETRY=/);
  assert.match(block,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(block,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});

test('Roblox continuation serializes only the same preflight identity and dispatches exact F0 work independently',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.match(header,/run-name: Roblox shared preflight · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(header,/concurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}-\$\{\{ github\.sha \}\}\n\s+cancel-in-progress: false/);
  assert.match(workflow,/actions\/workflows\/company-development-roblox-headless-fast-mvp\.yml\/runs\?per_page=100/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH=DEDUPED_CURRENT_MAIN:/);
  assert.match(workflow,/String\(run\.head_sha\|\|''\)!==currentSha/);
  assert.match(workflow,/gh workflow run company-development-roblox-headless-fast-mvp\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH_COUNT=/);
  assert.doesNotMatch(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCHED=YES:BATCH/);
});

test('shared preflight continuation locks only the exact game and revision identity',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.match(workflow,/run-name: Roblox shared preflight · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(workflow,/workflow_dispatch:[\s\S]*game_id:/);
  assert.match(header,/concurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}-\$\{\{ github\.sha \}\}\n\s+cancel-in-progress: false/);
  assert.match(workflow,/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/);
  assert.match(workflow,/if\(requested&&item\.gameId!==requested\)continue/);
  assert.match(workflow,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(workflow,/company-development-roblox-headless-fast-mvp\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCH=DEDUPED_CURRENT_MAIN:/);
});


test('continuation workflow and planner collapse duplicate same-game dispatches without cross-game locking',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}-\$\{\{ github\.sha \}\}\n\s+cancel-in-progress: false/);
  const preflightPlanAt=workflow.indexOf('\n  preflight-plan:\n');
  const preflightWorkerAt=workflow.indexOf('\n  preflight-worker:\n',preflightPlanAt);
  assert.ok(preflightPlanAt>0&&preflightWorkerAt>preflightPlanAt);
  const preflightPlan=workflow.slice(preflightPlanAt,preflightWorkerAt);
  assert.doesNotMatch(preflightPlan,/\n\s+concurrency:/);
  assert.match(workflow.slice(0,jobsAt),/group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}-\$\{\{ github\.sha \}\}/);
});

test('continuation control jobs use slim runners while model preflight stays on full game capacity',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const section=(name,next)=>{
    const start=workflow.indexOf('\n  '+name+':\n');
    assert.ok(start>=0,name);
    const end=next?workflow.indexOf('\n  '+next+':\n',start):workflow.length;
    return workflow.slice(start,end);
  };
  assert.match(section('preflight-plan','preflight-worker'),/runs-on:\s*ubuntu-slim/);
  assert.match(section('preflight-worker','preflight-persist'),/runs-on:\s*ubuntu-latest/);
  assert.match(section('preflight-persist','dispatch-headless'),/runs-on:\s*ubuntu-slim/);
  assert.match(section('dispatch-headless',null),/runs-on:\s*ubuntu-slim/);
});

// 최신 main으로 예약된 동일 게임의 pending 재검증을 구 버전 워커가 취소시키지 않도록 방지한다.
test('post-package Roblox preflight dispatch dedupes against fetched current main, not initiating run SHA',()=>{
  const step='      - name: Dispatch Roblox HEADLESS FAST_MVP continuation';
  const start=runtime.indexOf(step);
  assert.ok(start>=0);
  const end=runtime.indexOf('\n      - name: ',start+step.length);
  const block=runtime.slice(start,end<0?undefined:end);
  assert.ok(block.includes('current_main="$(git rev-parse origin/main)"'));
  assert.ok(block.includes('runs?per_page=100&head_sha=$current_main'));
  const header = "CURRENT_MAIN_SHA=\"$current_main\" node <<'NODE' > /tmp/roblox-continuation-active-ids";
  assert.ok(block.includes(header));
  assert.ok(block.includes("const currentSha=String(process.env.CURRENT_MAIN_SHA||'').trim()"));
  assert.ok(!block.includes("const currentSha=String(process.env.GITHUB_SHA||'').trim()"));
  assert.ok(block.includes('ROBLOX_POST_PACKAGE_CONTINUATION_DISPATCH=DEDUPED_CURRENT_MAIN:$id:$current_main'));
  assert.ok(block.includes('gh workflow run company-development-roblox-runtime-continuation.yml --repo'));
  const scriptStart=block.indexOf(header)+header.length+1;
  const scriptEnd=block.indexOf('\n          NODE',scriptStart);
  assert.ok(scriptEnd>scriptStart);
  const script=block.slice(scriptStart,scriptEnd);
  const fresh='b'.repeat(40),stale='a'.repeat(40);
  const runs=[
    {display_title:'Roblox shared preflight · daechung-rpg',head_sha:fresh,status:'pending'},
    {display_title:'Roblox shared preflight · daechung-rpg',head_sha:stale,status:'in_progress'},
    {display_title:'Roblox shared preflight · fantasy-survival',head_sha:fresh,status:'queued'},
    {display_title:'Roblox shared preflight · monster-adventure',head_sha:fresh,status:'completed'},
    {display_title:'Unrelated · seed-casual-realm-weaver',head_sha:fresh,status:'in_progress'}
  ];
  const printed=[];
  runInNewContext(script,{
    require:name=>{
      assert.equal(name,'fs');
      return {readFileSync:()=>JSON.stringify({workflow_runs:runs})};
    },
    process:{env:{CURRENT_MAIN_SHA:fresh,GITHUB_SHA:stale}},
    console:{log:gameId=>printed.push(gameId)}
  });
  assert.deepEqual(printed,['daechung-rpg','fantasy-survival']);
});

// OWNER_ACTIVE_PLATFORMS_SAME_GAME: Roblox 재시도와 Unity 보류를 함께 보존한다.
test('owner-active Roblox lane retries platform-only failures while Unity remains held',()=>{
  const item={
    gameId:'gem-survivor',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    selectedPlatform:'UNITY',targetPlatform:'UNITY',
    platformExecutionMode:'OWNER_ACTIVE_PLATFORMS_SAME_GAME',concurrentTargetPlatforms:['ROBLOX'],
    robloxSourceCommit:'a'.repeat(40),robloxBuildSourceRevision:'a'.repeat(40),
    robloxBuildOrPackagePassed:true,robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
    robloxBuildPassedAt:'2026-10-11T10:00:00Z',robloxBuildPreflightFailedAt:'2026-10-11T11:00:00Z',
    robloxBuildPreflightEvidence:{blockers:['roblox-platform-required']}
  };
  assert.equal(inspectRobloxBuildPreflight({item,directive}).pass,true);
  assert.equal(inspectRobloxBuildPreflight({item:{...item,concurrentTargetPlatforms:['UNITY']},directive}).pass,false);
  assert.equal(inspectRobloxBuildPreflight({item:{...item,robloxBuildSourceRevision:'c'.repeat(40)},directive}).pass,false);
  const block=preflight.slice(preflight.indexOf('const rows=[];'),preflight.indexOf('const f0Ready='));
  const plan=rows=>runInNewContext(block+'\nJSON.stringify(rows)',{
    q:{items:rows},requested:'',roadmap:{},console:{log(){}},ownerFocusedSecondaryPlatformEligible:()=>false
  });
  assert.equal(JSON.parse(plan([item])).length,1);
  assert.equal(JSON.parse(plan([{...item,concurrentTargetPlatforms:['ROBLOX','UNITY']}])).length,1);
  assert.equal(JSON.parse(plan([{...item,concurrentTargetPlatforms:['UNITY']}])).length,0);
  assert.equal(JSON.parse(plan([{...item,robloxBuildPreflightEvidence:{blockers:['artifact-identity-invalid']}}])).length,0);
  assert.equal(JSON.parse(plan([{...item,robloxBuildSourceRevision:'c'.repeat(40)}])).length,0);
  assert.equal(item.selectedPlatform,'UNITY');
});


// 로블록스 외부 모델은 조언만 할 수 있고, 실제 패키지의 정확한 원본 검증을 통과로 위조할 수 없다.
test('Roblox external review remains advisory for immutable exact-package preflight',async()=>{
  const item={
    gameId:'roblox-review-scope',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxSourceCommit:'a'.repeat(40),robloxBuildSourceRevision:'a'.repeat(40),
    robloxBuildOrPackagePassed:true,robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
    webValidationPassedAt:null,musicValidationPassed:false
  };
  const priorKey=process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY='mock-key-only';
  let calls=0;
  const externalReview=async(_url,options)=>{
    calls++;
    const body=JSON.parse(options.body);
    const prompt=body.contents[0].parts[0].text;
    const evidence=JSON.parse(prompt.split('BUILD_EVIDENCE=')[1].split('\n')[0]);
    assert.equal(evidence.buildOrPackagePassed,true);
    assert.equal(evidence.sourceRevision,item.robloxSourceCommit);
    assert.equal(evidence.artifactIdentity,item.robloxBuildArtifactIdentity);
    assert.equal(Object.hasOwn(evidence,'webValidationPassed'),false);
    assert.equal(Object.hasOwn(evidence,'musicValidationPassed'),false);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
      decision:'BLOCK',blockers:['webValidationPassed is false'],note:'Misread optional web validation'
    })}]}}]})};
  };
  try{
    const result=await evaluateRobloxBuildPreflight({item,directive,fetchImpl:externalReview});
    assert.equal(calls,1);
    assert.equal(result.pass,true);
    assert.equal(result.state,'PASS');
    assert.deepEqual(result.blockers,[]);
    assert.equal(result.leadReviews[0].decision,'BLOCK');
    assert.equal(result.facts.build.webValidationPassed,false);
    assert.equal(result.facts.build.musicValidationPassed,false);
    const unavailable=await evaluateRobloxBuildPreflight({item,directive,
      fetchImpl:async()=>{throw new Error('isolated model unavailable');}});
    assert.equal(unavailable.pass,true);
    assert.equal(unavailable.leadReviews[0].decision,'UNAVAILABLE');
    const stale=await evaluateRobloxBuildPreflight({item:{...item,robloxBuildSourceRevision:'c'.repeat(40)},directive,
      fetchImpl:async()=>{throw new Error('Invalid package must not request a reviewer');}});
    assert.equal(stale.pass,false);
    assert.ok(stale.blockers.includes('source-revision-mismatch'));
    assert.equal(stale.leadReviews.length,0);
  }finally{
    if(priorKey===undefined)delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=priorKey;
  }
});

test('Roblox continuation retries only exact legacy AI or missing-review failures, never invalid source',()=>{
  const header="          import fs from 'node:fs';";
  const start=preflight.indexOf(header);
  const end=preflight.indexOf('\n          NODE',start);
  assert.ok(start>=0&&end>start);
  const script=preflight.slice(start,end).replace(/^\s*import .*;$/gm,'');
  const revision='a'.repeat(40),identity='sha256:'+'b'.repeat(64);
  const base={
    status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxSourceCommit:revision,robloxBuildSourceRevision:revision,
    robloxBuildOrPackagePassed:true,robloxBuildArtifactIdentity:identity,
    robloxBuildPassedAt:'2026-10-21T04:51:24.727Z',
    robloxBuildPreflightFailedAt:'2026-10-21T04:51:24.727Z',
    robloxFailureStage:'VIBE_SHARED_MODEL_BUILD_PREFLIGHT',
    robloxFailureSignature:'ROBLOX_BUILD_PREFLIGHT_BLOCKED',
  };
  const staleAi={
    authority:'roblox-exact-package-build-preflight',facts:{pass:true,blockers:[]},
    sourceRevision:revision,artifactIdentity:identity,
    blockers:['lead-block:shared-review:webValidationPassed is false'],
  };
  const items=[
    {...base,gameId:'missing-once',robloxBuildPreflightEvidence:null},
    {...base,gameId:'review-misread',robloxBuildPreflightEvidence:staleAi,
      robloxBuildPreflightFailedAt:'2026-10-21T05:07:57.889Z'},
    {...base,gameId:'already-retried',robloxBuildPreflightEvidence:null,
      robloxBuildPreflightFailedAt:'2026-10-21T05:07:57.889Z'},
    {...base,gameId:'stale-source',robloxBuildSourceRevision:'c'.repeat(40),
      robloxBuildPreflightEvidence:null},
    {...base,gameId:'wrong-identity',robloxBuildPreflightEvidence:{...staleAi,artifactIdentity:'sha256:'+'c'.repeat(64)},
      robloxBuildPreflightFailedAt:'2026-10-21T05:07:57.889Z'},
    {...base,gameId:'true-gate-failure',robloxBuildPreflightEvidence:{...staleAi,blockers:['source-revision-mismatch']},
      robloxBuildPreflightFailedAt:'2026-10-21T05:07:57.889Z'},
  ];
  const written=[];
  runInNewContext(script,{
    fs:{readFileSync:file=>JSON.stringify(file.endsWith('development-queue.json')?{items}:{roblox:{validationMode:'HEADLESS_FAST_MVP'}}),
      appendFileSync:(_file,value)=>written.push(value)},
    ownerFocusedSecondaryPlatformEligible:()=>false,
    process:{env:{GITHUB_OUTPUT:'output'}},
    console:{log:()=>{}},
  });
  const matrix=JSON.parse(written.find(x=>x.startsWith('matrix=')).slice('matrix='.length));
  assert.deepEqual(matrix.include.map(x=>x.gameId),['missing-once','review-misread']);
  assert.ok(matrix.include.every(x=>x.sourceRevision===revision&&x.artifactIdentity===identity));
});


test('stale asynchronous writers cannot demote newer exact Roblox preflight PASS',()=>{
  const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const priorEvidence={pass:true,state:'PASS',facts:{pass:true,blockers:[]},
    sourceRevision:revision,artifactIdentity:artifact,authority:'roblox-exact-package-build-preflight'};
  const prior={gameId:'verified-game',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
    robloxSourceCommit:revision,robloxBuildSourceRevision:revision,robloxBuildArtifactIdentity:artifact,
    robloxBuildOrPackagePassed:true,robloxBuildPreflightPassed:true,
    robloxBuildPreflightPassedAt:'2026-10-21T05:48:10Z',robloxBuildPreflightEvidence:priorEvidence,
    robloxFailureStage:'F0_SOURCE_INTEGRITY',robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING',
    routingBlockers:['roblox-f0-source-preflight-pending']};
  const oldReview={gameId:'verified-game',pass:false,state:'BLOCKED',facts:{pass:true,blockers:[]},
    sourceRevision:revision,artifactIdentity:artifact,blockers:['lead-block:shared-review:musicValidationPassed is false']};

  const techHeader="          const fs=require('fs');\n          const path=require('path');\n          const queue=JSON.parse(fs.readFileSync('development-queue.json','utf8'));";
  const techStart=runtime.indexOf(techHeader,runtime.indexOf('      - name: Persist exact Roblox build package evidence'));
  const techEnd=runtime.indexOf('\n          NODE',techStart);
  assert.ok(techStart>=0&&techEnd>techStart);
  const techScript=runtime.slice(techStart,techEnd);
  const packagePersist=(item,result)=>{
    let persisted;
    const queue={items:[{...item}]};
    const fsMock={
      readFileSync:p=>p==='development-queue.json'?JSON.stringify(queue):JSON.stringify(result),
      existsSync:()=>true,
      readdirSync:()=>['verified-game.result.json'],
      writeFileSync:(p,value)=>{if(p==='development-queue.json')persisted=JSON.parse(value);},
    };
    runInNewContext(techScript,{
      require:name=>name==='fs'?fsMock:{join:(...parts)=>parts.join('/')},
      process:{env:{EXPECTED_TARGETS_JSON:JSON.stringify([{gameId:'verified-game'}]),GITHUB_RUN_ID:'1'}},
      console:{log:()=>{}},
    });
    return persisted.items[0];
  };
  const oldPackage={gameId:'verified-game',pass:true,sourceRevision:revision,artifactIdentity:artifact,
    preflightPass:false,preflightEvidence:oldReview,f0Pass:false};
  const kept=packagePersist(prior,oldPackage);
  assert.equal(kept.robloxBuildPreflightPassed,true);
  assert.equal(kept.robloxBuildPreflightEvidence.pass,true);
  assert.equal(kept.robloxFailureSignature,'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING');
  const invalidated=packagePersist(prior,{...oldPackage,artifactIdentity:'sha256:'+'c'.repeat(64)});
  assert.equal(invalidated.robloxBuildPreflightPassed,false);
  const deterministicFailure=packagePersist(prior,{...oldPackage,preflightEvidence:{...oldReview,facts:{pass:false}}});
  assert.equal(deterministicFailure.robloxBuildPreflightPassed,false);

  const preflightHeader="          const fs=require('fs'),path=require('path');";
  const preflightStart=preflight.indexOf(preflightHeader,preflight.indexOf('      - name: Persist per-game preflight state'));
  const preflightEnd=preflight.indexOf('\n          NODE',preflightStart);
  assert.ok(preflightStart>=0&&preflightEnd>preflightStart);
  const preflightScript=preflight.slice(preflightStart,preflightEnd);
  const checkpointPersist=(item,result)=>{
    let persisted;
    const fsMock={
      readFileSync:p=>p==='development-queue.json'?JSON.stringify({items:[{...item}]}):JSON.stringify(result),
      existsSync:()=>result!=null,
      readdirSync:()=>['verified-game.preflight.json'],
      writeFileSync:(p,value)=>{if(p==='development-queue.json')persisted=JSON.parse(value);},
    };
    runInNewContext(preflightScript,{
      require:name=>name==='fs'?fsMock:{join:(...parts)=>parts.join('/')},
      process:{env:{EXPECTED_TARGETS_JSON:JSON.stringify([{gameId:'verified-game',sourceRevision:revision,
        artifactIdentity:artifact,secondaryOwnerFocus:false}])}},
      console:{log:()=>{}},
    });
    return persisted.items[0];
  };
  for(const stale of [null,oldReview]){
    const held=checkpointPersist(prior,stale);
    assert.equal(held.robloxBuildPreflightPassed,true);
    assert.equal(held.robloxBuildPreflightEvidence.pass,true);
    assert.equal(held.robloxFailureSignature,'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING');
  }
  const trulyInvalid=checkpointPersist(prior,{...oldReview,facts:{pass:false}});
  assert.equal(trulyInvalid.robloxBuildPreflightPassed,false);
  const changedSource=checkpointPersist({...prior,robloxSourceCommit:'c'.repeat(40),
    robloxBuildSourceRevision:'c'.repeat(40),
    robloxBuildPreflightEvidence:{...priorEvidence,sourceRevision:'c'.repeat(40)}},oldReview);
  assert.equal(changedSource.robloxBuildPreflightPassed,true);
});
