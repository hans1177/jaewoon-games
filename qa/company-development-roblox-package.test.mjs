import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectRobloxSourceScriptInventory,createRobloxBuildEvidence,normalizeRobloxArtifactLightingSerialization,resolvePackageSourceValidation,ROBLOX_PACKAGE_TOOL,validateRobloxArtifactInternalAssetBinding,validateRobloxArtifactLightingMigrationGuard,validateRobloxArtifactScriptInventory} from '../tools/company-development-roblox-package.mjs';
import {inspectRobloxBuildPreflight} from '../tools/company-development-roblox-build-preflight.mjs';

test('Roblox package evidence proves build only and never invents later validation',()=>{
  const evidence=createRobloxBuildEvidence({
    gameId:'seed-roblox-test',
    sourcePath:'roblox-games/seed-roblox-test',
    sourceRevision:'a'.repeat(40),
    artifactPath:'/tmp/seed-roblox-test.rbxlx',
    artifactSha256:'b'.repeat(64),
    sourceValidationPassed:true,
    saveRequired:true,
    internalAssetBinding:{
      pass:true,
      contractVersion:ROBLOX_PACKAGE_TOOL.internalAssetContractVersion,
      libraryVersion:109,
      bindingVersion:2,
      selectionFingerprint:'asset-fingerprint',
      familyCount:12,
      selectedAtomCount:36,
      primitiveOnlyVisualsForbidden:true,
    },
  });
  assert.equal(evidence.buildOrPackagePassed,true);
  assert.equal(evidence.artifactIdentity,`sha256:${'b'.repeat(64)}`);
  assert.equal(evidence.luauOrSourceValidationPassed,true);
  assert.equal(evidence.internalAssetPackageBindingPassed,true);
  assert.equal(evidence.internalAssetContractVersion,ROBLOX_PACKAGE_TOOL.internalAssetContractVersion);
  assert.equal(evidence.internalAssetFamilyCount,12);
  assert.equal(evidence.primitiveOnlyVisualsForbidden,true);
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

test('Roblox build preflight requires all internal asset source families and package contract proof',()=>{
  const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
  const item={
    gameId:'seed-roblox-test',
    productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform:'ROBLOX',
    targetPlatform:'ROBLOX',
    status:'ACTIVE',
    robloxSourceBootstrapPassedAt:'2026-10-05T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),
    robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
    robloxStudioAssetBindingApplied:true,
    robloxStudioAssetBinding:{
      bindingVersion:2,
      libraryVersion:109,
      selectionFingerprint:'package-selection-fingerprint',
      families:Object.fromEntries(families.map(family=>[family,[family+'_ATOM']]))
    },
    robloxBuildInternalAssetContractVersion:ROBLOX_PACKAGE_TOOL.internalAssetContractVersion,
    robloxBuildInternalAssetBindingPassed:true,
  };
  const directive={ai:{robloxPreflightModel:'llama3.2:1b',modelPool:['llama3.2:1b'],minDistinctLeadModelsAcrossDepartments:1}};
  const pass=inspectRobloxBuildPreflight({item,directive});
  assert.equal(pass.pass,true);
  assert.equal(pass.build.internalAssetSourceBindingComplete,true);
  assert.equal(pass.build.internalAssetPackageBindingPassed,true);
  assert.equal(pass.build.internalAssetMissingFamilies.length,0);

  const stale=inspectRobloxBuildPreflight({
    item:{...item,robloxBuildInternalAssetContractVersion:0,robloxBuildInternalAssetBindingPassed:false},
    directive
  });
  assert.equal(stale.pass,false);
  assert.ok(stale.blockers.includes('internal-asset-package-contract-version-required'));
  assert.ok(stale.blockers.includes('internal-asset-package-binding-pass-required'));

  const missingFamily=structuredClone(item);
  delete missingFamily.robloxStudioAssetBinding.families.PROP;
  const familyBlocked=inspectRobloxBuildPreflight({item:missingFamily,directive});
  assert.equal(familyBlocked.pass,false);
  assert.ok(familyBlocked.blockers.includes('internal-asset-all-families-source-binding-required'));
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

test('verified Vibe2 handoff cannot bypass internal asset hard blockers',()=>{
  const tree='c'.repeat(40);
  const validation=resolvePackageSourceValidation({
    staticVerdict:{pass:false,blockers:['CLIENT_SERVER_ACTION_REQUIRED','ROBLOX_INTERNAL_ASSET_ALL_FAMILIES_REQUIRED'],saveRequired:false},
    verifiedSourceTreeSha:tree,
    actualSourceTreeSha:tree,
  });
  assert.equal(validation.pass,false);
  assert.deepEqual(validation.blockers,['ROBLOX_INTERNAL_ASSET_ALL_FAMILIES_REQUIRED']);
  assert.equal(validation.authority,'verified-vibe2-source-handoff-plus-internal-asset-hard-gate');
});

test('Roblox package artifact requires all internal asset families atoms fingerprint and runtime-visible binding',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-asset-package-'));
  try{
    const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
    const expectedPlan={
      applied:true,
      libraryVersion:109,
      bindingVersion:2,
      selectionFingerprint:'0123456789abcdef',
      universalAssetFirst:{allFamilies:families},
      families:Object.fromEntries(families.map(family=>[family,[family+'_ATOM']]))
    };
    const artifact=path.join(root,'bound.rbxlx');
    const familyRows=families.map(family=>family+' = { "'+family+'_ATOM'" }').join('\n');
    fs.writeFileSync(artifact,[
      '<roblox>',
      '<Item class="ModuleScript"><Properties><ProtectedString name="Source"><![CDATA[',
      'StudioAssets = { Applied = true, BindingVersion = 2, SelectionFingerprint = "0123456789abcdef", Families = {',
      familyRows,
      '} }',
      ']]></ProtectedString></Properties></Item>',
      '<Item class="LocalScript"><Properties><ProtectedString name="Source"><![CDATA[',
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local function studioAssetFamily() return {} end',
      'root:SetAttribute("StudioAssetAtoms", "UI_ATOM")',
      'local panel = Instance.new("Frame")',
      ']]></ProtectedString></Properties></Item>',
      '</roblox>'
    ].join('\n'));
    const ok=validateRobloxArtifactInternalAssetBinding({artifactPath:artifact,expectedPlan});
    assert.equal(ok.pass,true);
    assert.equal(ok.familyCount,12);
    assert.equal(ok.selectedAtomCount,12);
    assert.equal(ok.primitiveOnlyVisualsForbidden,true);

    const missing=path.join(root,'missing.rbxlx');
    fs.writeFileSync(missing,fs.readFileSync(artifact,'utf8').replace('PROP_ATOM','PROP_MISSING'));
    assert.throws(
      ()=>validateRobloxArtifactInternalAssetBinding({artifactPath:missing,expectedPlan}),
      /ROBLOX_INTERNAL_ASSET_PACKAGE_SELECTED_ATOMS_REQUIRED/
    );

    const primitive=path.join(root,'primitive.rbxlx');
    fs.writeFileSync(primitive,fs.readFileSync(artifact,'utf8')
      .replace('local function studioAssetFamily() return {} end\n','')
      .replace('root:SetAttribute("StudioAssetAtoms", "UI_ATOM")\n',''));
    assert.throws(
      ()=>validateRobloxArtifactInternalAssetBinding({artifactPath:primitive,expectedPlan}),
      /ROBLOX_INTERNAL_ASSET_PACKAGE_RUNTIME_BINDING_REQUIRED|ROBLOX_PLAIN_PRIMITIVE_PACKAGE_FORBIDDEN/
    );
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
