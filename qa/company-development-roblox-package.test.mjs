import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectRobloxSourceScriptInventory,createRobloxBuildEvidence,normalizeRobloxArtifactLightingSerialization,resolvePackageSourceValidation,ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,ROBLOX_PACKAGE_TOOL,validateRobloxArtifactLightingMigrationGuard,validateRobloxArtifactScriptInventory,validateRobloxPackageAssetThreshold} from '../tools/company-development-roblox-package.mjs';
import {buildRobloxStudioAssetBootstrapPlan,robloxBuildProfileFromBaseline} from '../tools/company-development-roblox-bootstrap.mjs';

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
