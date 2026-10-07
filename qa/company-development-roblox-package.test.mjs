import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {collectRobloxSourceScriptInventory,createRobloxBuildEvidence,normalizeRobloxArtifactLightingSerialization,resolvePackageSourceValidation,ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,ROBLOX_PACKAGE_TOOL,validateRobloxArtifactLightingMigrationGuard,validateRobloxArtifactScriptInventory,validateRobloxPackageAssetThreshold} from '../tools/company-development-roblox-package.mjs';
import {hasCurrentRobloxPackageAssetRepair,robloxPackageAssetRepairContext} from '../tools/company-development-roblox-source-reconcile.mjs';
import {buildRobloxStudioAssetBootstrapPlan,detectRobloxStudioAssetSystems,ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES,robloxBuildProfileFromBaseline,robloxStudioAssetFamilyBoundInText,robloxStudioAssetFamilyStatusFromSource} from '../tools/company-development-roblox-bootstrap.mjs';

test('guarded native asset bindings count the condition and render sink as one binding scope',()=>{
  const environment='if #studioAssetFamily("ENVIRONMENT") > 0 and camp and camp:IsA("BasePart") then\n  camp.Material = Enum.Material.Slate\nend';
  const prop='if #studioAssetFamily("PROP") > 0 and workbench and workbench:IsA("BasePart") then\n  workbench.Material = Enum.Material.WoodPlanks\nend';
  const unbound='if #studioAssetFamily("ENVIRONMENT") > 0 then\n  local marker = true\nend';
  assert.equal(robloxStudioAssetFamilyBoundInText(environment,'ENVIRONMENT'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(prop,'PROP'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(unbound,'ENVIRONMENT'),false);
});

test('stale same-game source trees are coalesced as superseded work instead of failed workers',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const start=workflow.indexOf('if [ -n "$RECONCILIATION_SOURCE_TREE_SHA" ]; then');
  const end=workflow.indexOf('          branch="development/roblox-',start);
  assert.ok(start>=0&&end>start);
  const block=workflow.slice(start,end);
  assert.match(block,/ROBLOX_SOURCE_TREE_STALE_BEFORE_WORKER/);
  assert.match(block,/superseded=true/);
  assert.match(block,/supersede_reason=SOURCE_TREE_STALE/);
  assert.match(block,/exit 0/);
  assert.doesNotMatch(block,/exit 75/);
  assert.match(workflow,/source-tree-superseded/);
});

test('village-dungeons consumes the selected VFX family through a live ParticleEmitter',()=>{
  const source=fs.readFileSync('roblox-games/village-dungeons/client/Game.client.luau','utf8');
  assert.equal(robloxStudioAssetFamilyBoundInText(source,'VFX'),true);
  assert.match(source,/StudioVfxAtom/);
  assert.match(source,/ParticleEmitter/);
  assert.match(source,/emitter:Emit\(10\)/);
});

test('asset failure survives worker recording and exact-source persistence while stale results preserve siblings',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const nodeStep=name=>{
    const start=workflow.indexOf(`      - name: ${name}\n`);
    assert.ok(start>=0,name);
    const block=workflow.slice(start,workflow.indexOf('\n      - name:',start+1));
    const code=block.match(/node <<'NODE'\n([\s\S]*?)\n          NODE/);
    assert.ok(code,name);
    return code[1];
  };
  const gameId='horror-escape-room',revision='a'.repeat(40);
  const threshold={pass:false,blockers:['ROBLOX_PACKAGE_ASSET_FAMILY_STATUS_MISSING:AUDIO'],libraryVersion:112,familyResults:[{family:'AUDIO',status:null,systemPresent:true,actualBinding:false}]};
  const failure={gameId,sourceRevision:revision,assetBindingFailed:true,assetThreshold:threshold,buildOrPackagePassed:false,artifactIdentity:null,sourceTreeSha:'e'.repeat(40),assetRepairContext:robloxPackageAssetRepairContext({assetLibrary:{version:112},baseline:{}})};
  const record=(evidence,extra={})=>{
    const files=new Map([[`/tmp/roblox-technical/results/${gameId}.build.json`,JSON.stringify(evidence)]]);
    const mockFs={mkdirSync(){},existsSync:p=>files.has(p),readFileSync:p=>files.get(p),writeFileSync:(p,v)=>files.set(p,v)};
    runInNewContext(nodeStep('Record Roblox technical package result'),{
      require:name=>name==='fs'?mockFs:path,console:{log(){}},
      process:{env:{GAME_ID:gameId,SOURCE_REVISION:revision,PACKAGE_OUTCOME:'failure',PREFLIGHT_OUTCOME:'skipped',F0_OUTCOME:'skipped',...extra}}
    });
    return JSON.parse(files.get(`/tmp/roblox-technical/results/${gameId}.result.json`));
  };
  const result=record(failure);
  assert.equal(result.assetBindingFailed,true);
  assert.equal(result.pass,false);
  assert.equal(result.f0Pass,false);
  assert.equal(result.failure,'roblox-package-asset-binding-failed');
  assert.deepEqual(result.assetThreshold,threshold);
  assert.deepEqual(result.assetRepairContext,failure.assetRepairContext);
  assert.equal(result.sourceTreeSha,failure.sourceTreeSha);
  assert.equal(record({...failure,sourceRevision:'b'.repeat(40)}).assetBindingFailed,false);
  assert.equal(record(failure,{SUPERSEDED:'true'}).assetBindingFailed,false);

  const sibling={gameId:'unrelated',robloxSourceCommit:'c'.repeat(40),robloxRuntimePassed:true,otherWork:'preserve'};
  const persist=(currentRevision)=>{
    const queue={items:[{gameId,robloxSourceCommit:currentRevision},sibling]};
    const files=new Map([['development-queue.json',JSON.stringify(queue)],[`/tmp/roblox-technical-batch/results/${gameId}.result.json`,JSON.stringify(result)]]);
    const mockFs={existsSync:()=>true,readdirSync:()=>[`${gameId}.result.json`],readFileSync:p=>files.get(p),writeFileSync:(p,v)=>files.set(p,v)};
    runInNewContext(nodeStep('Persist exact Roblox build package evidence'),{
      require:name=>name==='fs'?mockFs:path,console:{log(){}},
      process:{env:{EXPECTED_TARGETS_JSON:JSON.stringify([{gameId}]),GITHUB_RUN_ID:'100'}}
    });
    return JSON.parse(files.get('development-queue.json'));
  };
  const persisted=persist(revision);
  const item=persisted.items[0];
  assert.equal(item.robloxQualityBuildUpRequired,true);
  assert.equal(item.robloxQualityBuildUpSourceRevision,revision);
  assert.equal(item.robloxQualityBuildUpEvidence.authority,'roblox-package-asset-binding-failure');
  assert.deepEqual(item.robloxQualityBuildUpEvidence.qualityFailureKinds,threshold.blockers);
  assert.deepEqual(item.robloxQualityBuildUpEvidence.assetThreshold,threshold);
  assert.deepEqual(item.robloxQualityBuildUpEvidence.assetRepairContext,failure.assetRepairContext);
  assert.equal(item.robloxQualityBuildUpEvidence.sourceTreeSha,failure.sourceTreeSha);
  assert.deepEqual(item.robloxQualityBuildUpEvidence.qualityFailureDetails[0].observed.familyResult,threshold.familyResults[0]);
  assert.equal(item.robloxQualityBuildUpEvidence.assetRepairPolicy.mode,'GAME_SOURCE_BINDINGS_ONLY');
  assert.equal(item.robloxQualityBuildUpEvidence.assetRepairPolicy.allowAssetLibraryWrites,false);
  assert.equal(item.robloxQualityBuildUpEvidence.assetRepairPolicy.preserveAssetFiles,true);
  assert.match(item.robloxQualityBuildUpEvidence.qualityFailureDetails[0].hint,/do not replace, modify or delete internal assets/);
  for(const key of ['robloxBuildOrPackagePassed','robloxFoundationF0Passed','robloxRuntimePassed','robloxFinalReviewPassed'])assert.equal(item[key],false,key);
  assert.deepEqual(persisted.items[1],sibling);
  assert.deepEqual(persist('d'.repeat(40)).items,[{gameId,robloxSourceCommit:'d'.repeat(40)},sibling]);
  assert.match(workflow,/\['roblox-f0-gameplay-product-readiness-failure','roblox-package-asset-binding-failure'\]\.includes/);
});

test('failed asset packaging preserves exact repair evidence without publishing a success artifact',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-package-failure-evidence-'));
  try{
    const gameId='asset-evidence-fixture',sourcePath=`roblox-games/${gameId}`;
    const root=path.join(tmp,sourcePath);
    for(const dir of ['shared','server','client'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    fs.writeFileSync(path.join(root,'default.project.json'),JSON.stringify({tree:{ReplicatedStorage:{Shared:{$path:'shared'}},ServerScriptService:{GameServer:{$path:'server'}},StarterPlayer:{StarterPlayerScripts:{GameClient:{$path:'client'}}}}}));
    fs.writeFileSync(path.join(root,'shared/GameConfig.luau'),'return {}\n');
    fs.writeFileSync(path.join(root,'server/Game.server.luau'),'local server = true\n');
    fs.writeFileSync(path.join(root,'client/Game.client.luau'),'local client = true\n');
    fs.writeFileSync(path.join(tmp,'company-asset-library.json'),JSON.stringify({version:1,baseMaterialLibrary:{families:Object.fromEntries(ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>[family,[`${family}_ATOM`]]))}}));
    const baseline={content:{robloxBuildProfile:{version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',genre:'Adventure',subgenre:null,playMode:'SINGLE',multiplayerRequired:false,networkingRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'Adventure'}}};
    fs.writeFileSync(path.join(tmp,'baseline.json'),JSON.stringify(baseline));
    const git=(...args)=>execFileSync('git',args,{cwd:tmp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git('init');git('config','user.name','fixture');git('config','user.email','fixture@example.test');
    git('add','.');git('commit','-m','fixture source');
    const first=git('rev-parse','HEAD'),tree=git('rev-parse',`HEAD:${sourcePath}`);
    // An existing verified source handoff must never bypass the package asset threshold.
    fs.writeFileSync(path.join(tmp,'development-queue.json'),JSON.stringify({items:[{gameId,robloxVibe2VerifiedHandoff:{verified:true,gameId,sourceRevision:first,candidateSha:first,sourceTreeSha:tree,qaRunId:1}}]}));
    git('add','development-queue.json');git('commit','-m','fixture handoff');
    const revision=git('rev-parse','HEAD'),evidenceFile=path.join(tmp,'failure.json');
    const run=spawnSync(process.execPath,[new URL('../tools/company-development-roblox-package.mjs',import.meta.url).pathname,
      `--repo-root=${tmp}`,`--game-id=${gameId}`,`--source-path=${sourcePath}`,`--source-revision=${revision}`,`--runtime-ref=${revision}`,
      `--baseline=${path.join(tmp,'baseline.json')}`,`--evidence=${evidenceFile}`,`--rojo=${process.execPath}`,`--output-dir=${path.join(tmp,'packages')}`],{encoding:'utf8'});
    assert.equal(run.status,1,run.stdout+run.stderr);
    assert.match(run.stderr,/ROBLOX_PACKAGE_ASSET_THRESHOLD_FAILED/);
    const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
    assert.equal(evidence.gameId,gameId);
    assert.equal(evidence.sourceRevision,revision);
    assert.equal(evidence.assetBindingFailed,true);
    assert.equal(evidence.sourceTreeSha,tree);
    assert.match(evidence.assetRepairContext.validatorFingerprint,/^[a-f0-9]{64}$/);
    assert.equal(evidence.assetThreshold.pass,false);
    assert.ok(evidence.blockers.includes('ROBLOX_PACKAGE_ASSET_FAMILY_STATUS_MISSING:CHARACTER'));
    assert.equal(evidence.artifactIdentity,null);
    for(const key of ['buildOrPackagePassed','runtimePassed','independentQaPassed','regressionPassed','finalReviewPassed','releaseClaim'])assert.equal(evidence[key],false,key);
    assert.deepEqual(fs.readdirSync(path.join(tmp,'packages')),[]);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('Roblox package evidence proves build only and never invents later validation',()=>{
  const evidence=createRobloxBuildEvidence({
    gameId:'seed-roblox-test',
    sourcePath:'roblox-games/seed-roblox-test',
    sourceRevision:'a'.repeat(40),
    artifactPath:'/tmp/seed-roblox-test.rbxlx',
    artifactSha256:'b'.repeat(64),
    sourceValidationPassed:true,
    saveRequired:true,
  });
  assert.equal(evidence.buildOrPackagePassed,true);
  assert.equal(evidence.artifactIdentity,`sha256:${'b'.repeat(64)}`);
  assert.equal(evidence.luauOrSourceValidationPassed,true);
  assert.equal(evidence.assetThreshold,null);
  assert.equal(evidence.buildPreflightPassed,false);
  assert.equal(evidence.runtimePassed,false);
  assert.equal(evidence.independentQaPassed,false);
  assert.equal(evidence.regressionPassed,false);
  assert.equal(evidence.finalReviewPassed,false);
  assert.equal(evidence.lastSuccessfulStage,'TARGET_PLATFORM_BUILD_OR_PACKAGE');
  assert.equal(evidence.failureStage,'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT');
  assert.equal(evidence.failureSignature,'ROBLOX_BUILD_PREFLIGHT_PENDING');
  assert.equal(evidence.releaseClaim,false);
});

test('Roblox package source validation keeps ordinary static blockers authoritative',()=>{
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:false,blockers:['CLIENT_SERVER_ACTION_REQUIRED'],saveRequired:false},
  });
  assert.equal(validation.pass,false);
  assert.deepEqual(validation.blockers,['CLIENT_SERVER_ACTION_REQUIRED']);
  assert.equal(validation.authority,'exact-source-static-validation');
});

test('Roblox package source validation accepts an exact verified Vibe2 source tree without weakening ordinary validation',()=>{
  const tree='c'.repeat(40);
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:false,blockers:['CLIENT_SERVER_ACTION_REQUIRED'],saveRequired:false},
    verifiedSourceTreeSha:tree,
    actualSourceTreeSha:tree,
  });
  assert.equal(validation.pass,true);
  assert.deepEqual(validation.blockers,[]);
  assert.equal(validation.authority,'verified-vibe2-source-handoff');
});

test('Roblox package source validation rejects a verified Vibe2 handoff when the exact source tree differs',()=>{
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:true,blockers:[],saveRequired:false},
    verifiedSourceTreeSha:'c'.repeat(40),
    actualSourceTreeSha:'d'.repeat(40),
  });
  assert.equal(validation.pass,false);
  assert.deepEqual(validation.blockers,['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH']);
  assert.equal(validation.authority,'verified-vibe2-source-handoff');
});

test('Roblox package requires all internal library families and rejects primitive or color-only visual binding',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-package-assets-'));
  try{
    fs.mkdirSync(path.join(root,'shared'),{recursive:true});
    fs.mkdirSync(path.join(root,'client'),{recursive:true});
    const baseline={content:{robloxBuildProfile:{
      version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',genre:'Adventure',subgenre:null,playMode:'SINGLE',
      multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
      networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'Adventure'
    }}};
    const assetLibrary={version:109,baseMaterialLibrary:{
      status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
      families:Object.fromEntries(ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>[family,[family+'_ATOM']]))
    }};
    const profile=robloxBuildProfileFromBaseline(baseline);
    const plan=buildRobloxStudioAssetBootstrapPlan({gameId:'demo',profile,assetLibrary});
    const familyRows=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>`      ${family} = { "${family}_ATOM" },`).join('\n');
    const config=`return {
  StudioAssets = {
    Applied = true,
    BindingVersion = 2,
    LibraryVersion = ${plan.libraryVersion},
    SelectionFingerprint = "${plan.selectionFingerprint}",
    SourceUsageFingerprint = "${plan.buildUpAssetSourceUsageFingerprint}",
    SourceUsageLibraryVersion = ${plan.buildUpAssetSourceUsageLibraryVersion},
    Families = {
${familyRows}
    },
  },
}
`;
    const statusRows=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES
      .map(family=>`  ${family} = "${family==='UI'?'APPLIED':'NOT_APPLICABLE'}",`)
      .join('\n');
    const client=[
      'local C = require(game.ReplicatedStorage.Shared.GameConfig)',
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local studioAssetConfig = C.StudioAssets or {}',
      'local studioAssetFamilies = studioAssetConfig.Families or {}',
      'local function studioAssetFamily(family) local atoms=studioAssetFamilies[family]; return type(atoms)=="table" and atoms or {} end',
      'local function hasStudioAssetAtom(family,atom) return table.find(studioAssetFamily(family),atom) ~= nil end',
      'local STUDIO_ASSET_SELECTION = { UI = studioAssetFamily("UI") }',
      'local STUDIO_ASSET_FAMILY_STATUS = {',
      statusRows,
      '}',
      'local root = Instance.new("Frame")',
      'local stroke = Instance.new("UIStroke")',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION.UI, ","))',
      'if hasStudioAssetAtom("UI","UI_ATOM") then stroke.Thickness = 2 end',
    ].join('\n');
    fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),config);
    fs.writeFileSync(path.join(root,'client','Game.client.luau'),client);
    const pass=validateRobloxPackageAssetThreshold({root,gameId:'demo',baseline,assetLibrary});
    assert.equal(pass.pass,true);
    assert.equal(pass.familyCoverageCount,12);
    assert.equal(pass.requiredFamilyCount,12);
    assert.equal(pass.allFamiliesAutoSelected,true);
    assert.equal(pass.visibleAssetBindingPass,true);
    assert.match(pass.buildUpAssetSourceUsageFingerprint,/^[0-9a-f]{64}$/i);
    assert.equal(pass.buildUpAssetSourceUsageFingerprint,plan.buildUpAssetSourceUsageFingerprint);
    assert.equal(pass.buildUpAssetSourceUsageLibraryVersion,plan.buildUpAssetSourceUsageLibraryVersion);
    assert.deepEqual(pass.selectedSourceContentHashes,plan.selectedSourceContentHashes);
    assert.equal(pass.familyBindingPassCount,1);
    assert.equal(pass.appliedFamilyCount,1);
    assert.equal(pass.notApplicableFamilyCount,11);
    assert.equal(pass.resolvedFamilyCount,12);
    assert.equal(pass.allFamiliesResolved,true);
    assert.equal(pass.productionVerified,false);
    assert.equal(pass.runtimeVerified,false);

    fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),config.replace('      PROP = { "PROP_ATOM" },\n',''));
    const missing=validateRobloxPackageAssetThreshold({root,gameId:'demo',baseline,assetLibrary});
    assert.equal(missing.pass,false);
    assert.ok(missing.blockers.includes('ROBLOX_PACKAGE_INTERNAL_ASSET_FAMILY_SELECTION_MISMATCH:PROP'));

    fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),config);
    fs.writeFileSync(path.join(root,'client','Game.client.luau'),client+'\nlocal enemy = Instance.new("Model")\nenemy.Name = "EnemyBoss"\n');
    const falseNotApplicable=validateRobloxPackageAssetThreshold({root,gameId:'demo',baseline,assetLibrary});
    assert.equal(falseNotApplicable.pass,false);
    assert.ok(falseNotApplicable.blockers.includes('ROBLOX_PACKAGE_ASSET_NOT_APPLICABLE_WITH_EXISTING_SYSTEM:CREATURE'));

    fs.writeFileSync(path.join(root,'client','Game.client.luau'),client.replace('local STUDIO_ASSET_SELECTION = { UI = studioAssetFamily("UI") }','local STUDIO_ASSET_SELECTION = { UI = {"UI_ATOM"} }').replace('if hasStudioAssetAtom("UI","UI_ATOM") then stroke.Thickness = 2 end','stroke.Thickness = 2'));
    const markerOnly=validateRobloxPackageAssetThreshold({root,gameId:'demo',baseline,assetLibrary});
    assert.equal(markerOnly.pass,false);
    assert.ok(markerOnly.blockers.includes('ROBLOX_PACKAGE_ASSET_FAMILY_NOT_ACTUALLY_BOUND:UI'));

    fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),config);
    fs.writeFileSync(path.join(root,'client','Game.client.luau'),'local root=Instance.new("Frame")\nroot.BackgroundColor3=Color3.fromRGB(20,20,20)\n');
    const primitive=validateRobloxPackageAssetThreshold({root,gameId:'demo',baseline,assetLibrary});
    assert.equal(primitive.pass,false);
    assert.ok(primitive.blockers.includes('ROBLOX_PACKAGE_PRIMITIVE_ONLY_OR_COLOR_ONLY_FORBIDDEN'));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Roblox dynamic asset family detection follows actual native systems and ignores generic scaffold words',()=>{
  const generic=detectRobloxStudioAssetSystems({sourceText:[
    'local camera = workspace.CurrentCamera',
    'local itemCount = 3',
    'local function run() return itemCount end',
    'return run()',
  ].join('\n')});
  assert.equal(generic.ENVIRONMENT,false);
  assert.equal(generic.PROP,false);
  assert.equal(generic.MOTION,false);
  assert.equal(generic.WEAPON,false);

  const native=detectRobloxStudioAssetSystems({sourceText:[
    'local enemy = Instance.new("Model")',
    'enemy.Name = "EnemyBoss"',
    'local blade = Instance.new("Tool")',
    'blade.Name = "Sword"',
    'local sound = Instance.new("Sound")',
    'sound.SoundId = "rbxassetid://1"',
    'local fx = Instance.new("ParticleEmitter")',
    'local frame = Instance.new("Frame")',
    'local animation = Instance.new("Animation")',
    'local part = Instance.new("Part")',
    'part.Material = Enum.Material.Metal',
  ].join('\n')});
  for(const family of ['CREATURE','WEAPON','AUDIO','VFX','UI','MOTION','MATERIAL'])assert.equal(native[family],true,family);
  assert.deepEqual(Object.keys(native),[...ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES]);
  const status=robloxStudioAssetFamilyStatusFromSource({sourceText:'local enemy = Instance.new("Model")\nenemy.Name = "EnemyBoss"'});
  assert.equal(status.CREATURE,'APPLIED');
  assert.equal(status.AUDIO,'NOT_APPLICABLE');
});

test('Roblox family binding proof requires selected values to reach a native presentation consumer',()=>{
  const real=[
    'local studioAssetFamilies={UI={"FRAME_PANEL"}}',
    'local function studioAssetFamily(family) return studioAssetFamilies[family] or {} end',
    'local function hasStudioAssetAtom(familyOrAtom, atom)',
    '  local family = atom == nil and "UI" or familyOrAtom',
    '  local assetAtom = atom == nil and familyOrAtom or atom',
    '  return table.find(studioAssetFamily(family), assetAtom) ~= nil',
    'end',
    'local root=Instance.new("Frame")',
    'if hasStudioAssetAtom("FRAME_PANEL") then',
    '  local stroke=Instance.new("UIStroke")',
    '  stroke.Thickness=2',
    '  stroke.Parent=root',
    'end'
  ].join('\n');
  assert.equal(robloxStudioAssetFamilyBoundInText(real,'UI'),true);

  const markerOnly=[
    'local studioAssetFamilies={UI={"FRAME_PANEL"}}',
    'local function studioAssetFamily(family) return studioAssetFamilies[family] or {} end',
    'local atoms=studioAssetFamily("UI")',
    'local root=Instance.new("Frame")',
    'root:SetAttribute("StudioAssetAtoms", table.concat(atoms, ","))'
  ].join('\n');
  assert.equal(robloxStudioAssetFamilyBoundInText(markerOnly,'UI'),false);
});

test('Roblox package rejects artifacts missing mapped Luau script classes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-package-test-'));
  try{
    fs.mkdirSync(path.join(root,'server'));
    fs.mkdirSync(path.join(root,'client'));
    fs.mkdirSync(path.join(root,'shared'));
    fs.writeFileSync(path.join(root,'server','Game.server.luau'),'print("server")\n');
    fs.writeFileSync(path.join(root,'client','Game.client.luau'),'print("client")\n');
    fs.writeFileSync(path.join(root,'shared','Config.luau'),'return {}\n');
    const expected=collectRobloxSourceScriptInventory(root);
    assert.deepEqual(expected,{Script:1,LocalScript:1,ModuleScript:1,total:3});

    const incomplete=path.join(root,'incomplete.rbxlx');
    fs.writeFileSync(incomplete,'<roblox><Item class="LocalScript"></Item><Item class="ModuleScript"></Item></roblox>');
    assert.throws(()=>validateRobloxArtifactScriptInventory({artifactPath:incomplete,expected}),/Script:0\/1/);

    const complete=path.join(root,'complete.rbxlx');
    fs.writeFileSync(complete,'<roblox><Item class="Script"></Item><Item class="LocalScript"></Item><Item class="ModuleScript"></Item></roblox>');
    assert.deepEqual(validateRobloxArtifactScriptInventory({artifactPath:complete,expected}),{Script:1,LocalScript:1,ModuleScript:1,total:3});
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Roblox package normalizes Rojo 7.7.0 lighting serialization without changing authored brightness',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-lighting-normalize-'));
  try{
    const projectFile=path.join(root,'default.project.json');
    fs.writeFileSync(projectFile,JSON.stringify({tree:{Lighting:{$properties:{Technology:'Voxel',LightingStyle:'Soft',PrioritizeLightingQuality:false},CompatibilityToneMap:{$className:'ColorGradingEffect',$properties:{TonemapperPreset:'Retro'}}}}}));

    const artifact=path.join(root,'cozy-island.rbxlx');
    fs.writeFileSync(artifact,[
      '<roblox>',
      '  <Item class="Lighting" referent="1">',
      '    <Properties>',
      '      <string name="Name">Lighting</string>',
      '      <float name="Brightness">2.6</float>',
      '    </Properties>',
      '    <Item class="ColorGradingEffect" referent="2">',
      '      <Properties>',
      '        <string name="Name">CompatibilityToneMap</string>',
      '      </Properties>',
      '    </Item>',
      '  </Item>',
      '</roblox>',
    ].join('\n'));

    const normalized=normalizeRobloxArtifactLightingSerialization({artifactPath:artifact,projectPath:projectFile});
    assert.equal(normalized.pass,true);
    assert.equal(normalized.technology,'Voxel');
    const xml=fs.readFileSync(artifact,'utf8');
    assert.match(xml,/<token name="Technology">1<\/token>/);
    assert.match(xml,/<token name="LightingStyle">1<\/token>/);
    assert.match(xml,/<bool name="PrioritizeLightingQuality">false<\/bool>/);
    assert.match(xml,/<token name="TonemapperPreset">1<\/token>/);
    assert.match(xml,/<float name="Brightness">2\.6<\/float>/);
    assert.equal(validateRobloxArtifactLightingMigrationGuard({artifactPath:artifact,projectPath:projectFile}).pass,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Roblox package rejects artifacts that can reopen as deprecated Compatibility lighting without rewriting supported profiles',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-lighting-guard-'));
  try{
    const voxelProject=path.join(root,'voxel.project.json');
    fs.writeFileSync(voxelProject,JSON.stringify({tree:{Lighting:{$properties:{Technology:'Voxel',LightingStyle:'Soft',PrioritizeLightingQuality:false},CompatibilityToneMap:{$className:'ColorGradingEffect',$properties:{TonemapperPreset:'Retro'}}}}}));
    const voxelArtifact=path.join(root,'voxel.rbxlx');
    fs.writeFileSync(voxelArtifact,'<roblox><Item class="Lighting"><Properties><token name="Technology">1</token><token name="LightingStyle">1</token><bool name="PrioritizeLightingQuality">false</bool></Properties><Item class="ColorGradingEffect"><Properties><string name="Name">CompatibilityToneMap</string><token name="TonemapperPreset">1</token></Properties></Item></Item></roblox>');
    const voxel=validateRobloxArtifactLightingMigrationGuard({artifactPath:voxelArtifact,projectPath:voxelProject});
    assert.equal(voxel.pass,true);
    assert.equal(voxel.technology,'Voxel');
    assert.equal(voxel.expectsRetro,true);

    const futureProject=path.join(root,'future.project.json');
    fs.writeFileSync(futureProject,JSON.stringify({tree:{Lighting:{$properties:{Technology:'Future',LightingStyle:'Realistic',PrioritizeLightingQuality:true}}}}));
    const futureArtifact=path.join(root,'future.rbxlx');
    fs.writeFileSync(futureArtifact,'<roblox><Item class="Lighting"><Properties><token name="Technology">4</token><token name="LightingStyle">0</token><bool name="PrioritizeLightingQuality">true</bool></Properties></Item></roblox>');
    const future=validateRobloxArtifactLightingMigrationGuard({artifactPath:futureArtifact,projectPath:futureProject});
    assert.equal(future.pass,true);
    assert.equal(future.technology,'Future');
    assert.equal(future.expectsRetro,false);

    const bad=path.join(root,'bad.rbxlx');
    fs.writeFileSync(bad,'<roblox><Item class="Lighting"><Properties><token name="LightingStyle">1</token><bool name="PrioritizeLightingQuality">false</bool></Properties></Item></roblox>');
    assert.throws(()=>validateRobloxArtifactLightingMigrationGuard({artifactPath:bad,projectPath:voxelProject}),/ROBLOX_LIGHTING_SUPPORTED_TECHNOLOGY_REQUIRED/);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Vibe2 candidate release binds BUILD_UP source and selection fingerprints through package and F0',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-candidate-release.yml',import.meta.url),'utf8');
  assert.match(workflow,/asset_source_usage_fingerprint:/);
  assert.match(workflow,/asset_selection_fingerprint:/);
  assert.match(workflow,/BUILD_UP_ASSET_FINGERPRINT:/);
  assert.match(workflow,/BUILD_UP_SELECTION_FINGERPRINT:/);
  assert.match(workflow,/--build-up-asset-fingerprint="\$BUILD_UP_ASSET_FINGERPRINT"/);
  assert.match(workflow,/--expected-asset-selection-fingerprint="\$BUILD_UP_SELECTION_FINGERPRINT"/);
  assert.match(workflow,/candidate package BUILD_UP selection fingerprint mismatch/);
  assert.match(workflow,/--asset-selection-fingerprint="\$asset_selection_fingerprint"/);
  assert.match(workflow,/candidate F0 asset selection fingerprint mismatch/);
  assert.match(workflow,/Persist exact runtime asset binding and promotion plan/);
  assert.match(workflow,/robloxStudioAssetBinding=persistedBinding/);
  assert.match(workflow,/ROBLOX_ASSET_RUNTIME_BINDING=/);
  assert.match(workflow,/studioRuntimeRequired:false/);
  const persistStart=workflow.indexOf('      - name: Persist exact runtime asset binding and promotion plan');
  const handoffStart=workflow.indexOf('      - name: Hand exact promoted Roblox source',persistStart);
  const settleStart=workflow.indexOf('      - name: Settle Roblox result',handoffStart);
  assert.ok(persistStart>=0&&handoffStart>persistStart&&settleStart>handoffStart);
  assert.doesNotMatch(workflow.slice(persistStart,handoffStart),/continue-on-error: true/,'required binding persistence must fail the handoff closed');
  assert.match(workflow.slice(handoffStart,settleStart),/needs\.inspect\.outputs\.evidence_only == 'true' \|\| steps\.asset_binding\.outcome == 'success'/,'a source candidate cannot continue with missing binding identity');
});

test('Roblox package toolchain is pinned to the verified Rojo Linux artifact',()=>{
  assert.equal(ROBLOX_PACKAGE_TOOL.rojoVersion,'7.7.0');
  assert.equal(ROBLOX_PACKAGE_TOOL.linuxX64Asset,'rojo-7.7.0-linux-x86_64.zip');
  assert.equal(ROBLOX_PACKAGE_TOOL.linuxX64AssetSha256,'22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073');
});

test('Roblox technical result preserves superseded freshness instead of recording a package failure',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const start=workflow.indexOf('      - name: Record Roblox technical package result');
  const end=workflow.indexOf('      - name: Upload immutable Roblox package checkpoint',start);
  assert.ok(start>=0&&end>start);
  const block=workflow.slice(start,end);
  assert.match(block,/SUPERSEDED: \$\{\{ steps\.freshness\.outputs\.superseded \}\}/);
  assert.match(block,/SUPERSEDE_REASON: \$\{\{ steps\.freshness\.outputs\.reason \}\}/);
  assert.match(block,/const superseded=String\(process\.env\.SUPERSEDED\|\|''\)\.toLowerCase\(\)==='true'/);
  assert.match(block,/failure:superseded\?'roblox-technical-superseded'/);
});

test('canonical Roblox workflow contains build package checkpoint and keeps full review pending',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/technical-plan:/);
  assert.match(workflow,/technical-worker:/);
  assert.match(workflow,/technical-persist:/);
  assert.match(workflow,/company-development-roblox-package\.mjs/);
  assert.match(workflow,/rojo-7\.7\.0-linux-x86_64\.zip/);
  assert.match(workflow,/22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073/);
  assert.match(workflow,/ROBLOX_BUILD_PREFLIGHT_PASS=NO/);
  assert.match(workflow,/ROBLOX_RUNTIME_PASS=NO/);
  assert.match(workflow,/ROBLOX_FINAL_REVIEW_PASS=NO/);
});


test('Roblox bootstrap keeps local Studio DataStore initialization fail-safe without weakening published persistence',()=>{
  const bootstrap=fs.readFileSync(new URL('../tools/company-development-roblox-bootstrap.mjs',import.meta.url),'utf8');
  assert.match(bootstrap,/local store = nil/);
  assert.match(bootstrap,/local storeOk, storeResult = pcall/);
  assert.match(bootstrap,/DataStoreService:GetDataStore/);
  assert.match(bootstrap,/if storeOk then store = storeResult end/);
  assert.doesNotMatch(bootstrap,/local store = DataStoreService:GetDataStore/);
  assert.match(bootstrap,/store:GetAsync/);
  assert.match(bootstrap,/store:UpdateAsync/);
});


test('actual technical selectors stop unchanged proven asset-failure replay and resume when inputs change',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const library={version:112,assets:['unchanged']},baseline={content:{identity:'original'}};
  const source='a'.repeat(40),gameId='horror-escape-room';
  const evidence={gameId,sourceRevision:source,artifactIdentity:null,sourceTreeSha:'b'.repeat(40),
    authority:'roblox-package-asset-binding-failure',assetThreshold:{pass:false,blockers:['ACTUAL_BINDING_REQUIRED']},
    assetRepairContext:robloxPackageAssetRepairContext({assetLibrary:library,baseline})};
  const held={gameId,productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    robloxSourceCommit:source,robloxQualityBuildUpRequired:true,robloxQualityBuildUpSourceRevision:source,robloxQualityBuildUpEvidence:evidence,designBaselineSource:'design/current.json'};
  const other={...held,gameId:'independent-ready-game',robloxQualityBuildUpRequired:false,robloxQualityBuildUpEvidence:null};
  const execute=(step,item,assetLibrary=library,design=baseline)=>{
    const start=workflow.indexOf('      - name: '+step+'\n');assert.ok(start>=0);
    const next=workflow.indexOf('\n      - name:',start+1),block=workflow.slice(start,next<0?undefined:next);
    const match=block.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);assert.ok(match,step);
    const code=match[1].replace(/^\s*import .*;\n/gm,'');let output='',stdout='';
    const files=new Map([['company-asset-library.json',JSON.stringify(assetLibrary)],['company-learning/platform-release-roadmap.json','{}'],
      ['/tmp/development-queue.json',JSON.stringify({items:[item,other]})],['/tmp/roblox-next-technical-queue.json',JSON.stringify({items:[item,other]})]]);
    runInNewContext(code,{fs:{readFileSync:p=>{assert.ok(files.has(p),p);return files.get(p);},appendFileSync:(_,v)=>{output+=v;}},
      execFileSync:()=>JSON.stringify(design),hasCurrentRobloxPackageAssetRepair,DEVELOPMENT_GAME_WIP_MAX:20,
      selectTargetPlatformDevelopmentWindow:items=>items,ownerFocusedSecondaryPlatformEligible:()=>false,platformDevelopmentEligible:()=>true,
      console:{log(){},error(){}},process:{env:{GITHUB_OUTPUT:'out',COMPANY_RUNTIME_BRANCH:'company-runtime',CURRENT_TARGETS_JSON:'[]'},stdout:{write:v=>{stdout+=v;}}}});
    return output?Number(output.match(/count=(\d+)/)[1]):Number(stdout);
  };
  for(const step of ['Resolve next exact-source Roblox technical execution slice from unbounded native queue','Dispatch next Roblox technical execution slice when other exact-source work remains']){
    assert.equal(execute(step,held),1,'independent ready game must continue while unchanged failure goes to source repair');
    assert.equal(execute(step,{...held,robloxSourceCommit:'c'.repeat(40)}),2,'new source must be validated');
    assert.equal(execute(step,held,{...library,assets:['changed-with-same-version']}),2,'library content changes must be validated');
    assert.equal(execute(step,held,library,{content:{identity:'revised design'}}),2,'new design must be validated');
    assert.equal(execute(step,{...held,robloxQualityBuildUpEvidence:{...evidence,assetRepairContext:{...evidence.assetRepairContext,validatorFingerprint:'d'.repeat(64)}}}),2,'new validator must run');
    for(const patch of [{gameId:'another-game'},{sourceRevision:'e'.repeat(40)},{artifactIdentity:'sha256:'+'f'.repeat(64)},{assetRepairContext:null},{assetThreshold:{pass:true,blockers:[]}}]){
      assert.equal(execute(step,{...held,robloxQualityBuildUpEvidence:{...evidence,...patch}}),2,'unverified evidence must not suppress validation');
    }
  }
  assert.equal(hasCurrentRobloxPackageAssetRepair({item:held,assetLibrary:library,baseline,sourceTreeSha:'c'.repeat(40)}),false);
});


test('Roblox package applicability ignores managed learning and foundation scaffolds',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-package-scaffold-applicability-'));
  try{
    fs.mkdirSync(path.join(root,'shared'),{recursive:true});
    fs.mkdirSync(path.join(root,'client'),{recursive:true});
    fs.mkdirSync(path.join(root,'server'),{recursive:true});
    const baseline={content:{robloxBuildProfile:{
      version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',genre:'Adventure',subgenre:null,playMode:'SINGLE',
      multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
      networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'Adventure'
    }}};
    const assetLibrary={version:209,baseMaterialLibrary:{
      status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
      families:Object.fromEntries(ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>[family,[family+'_ATOM']]))
    }};
    const profile=robloxBuildProfileFromBaseline(baseline);
    const plan=buildRobloxStudioAssetBootstrapPlan({gameId:'scaffold-demo',profile,assetLibrary});
    const familyRows=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>`      ${family} = { "${family}_ATOM" },`).join('\n');
    fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),`return {
  StudioAssets = {
    Applied = true,
    BindingVersion = 2,
    LibraryVersion = ${plan.libraryVersion},
    SelectionFingerprint = "${plan.selectionFingerprint}",
    SourceUsageFingerprint = "${plan.buildUpAssetSourceUsageFingerprint}",
    SourceUsageLibraryVersion = ${plan.buildUpAssetSourceUsageLibraryVersion},
    Families = {
${familyRows}
    },
  },
}
`);
    const selectionRows=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>`  ${family} = studioAssetFamily("${family}"),`).join('\n');
    const statusRows=ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES.map(family=>`  ${family} = "${family==='UI'?'APPLIED':'NOT_APPLICABLE'}",`).join('\n');
    fs.writeFileSync(path.join(root,'client','Game.client.luau'),[
      'local C = require(game.ReplicatedStorage.Shared.GameConfig)',
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local studioAssetFamilies = C.StudioAssets.Families',
      'local function studioAssetFamily(family) return studioAssetFamilies[family] or {} end',
      'local STUDIO_ASSET_SELECTION = {',
      selectionRows,
      '}',
      'local STUDIO_ASSET_FAMILY_STATUS = {',
      statusRows,
      '}',
      'local root = Instance.new("Frame")',
      'local function hasStudioAssetAtom(family, atom) return table.find(studioAssetFamily(family), atom) ~= nil end',
      'if hasStudioAssetAtom("UI","UI_ATOM") then',
      '  local stroke = Instance.new("UIStroke")',
      '  stroke.Thickness = 2',
      '  stroke.Parent = root',
      'end',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION.UI, ","))',
      '-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN',
      'local humanoid = character:FindFirstChildOfClass("Humanoid")',
      'local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")',
      'local particles = Instance.new("ParticleEmitter")',
      '-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END',
    ].join('\n'));
    fs.writeFileSync(path.join(root,'server','Game.server.luau'),[
      '-- native-foundation-sentinel-v1',
      'local humanoid = character:WaitForChild("Humanoid")',
      'local ground = workspace:Raycast(Vector3.zero, Vector3.new(0,-10,0))',
    ].join('\n'));
    const result=validateRobloxPackageAssetThreshold({root,gameId:'scaffold-demo',baseline,assetLibrary});
    assert.equal(result.pass,true,result.blockers.join(','));
    for(const family of ['CHARACTER','MOTION','VFX']){
      const row=result.familyResults.find(item=>item.family===family);
      assert.equal(row.systemPresent,false,family);
      assert.equal(row.status,'NOT_APPLICABLE',family);
    }
    assert.equal(result.familyResults.find(item=>item.family==='UI')?.actualBinding,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
