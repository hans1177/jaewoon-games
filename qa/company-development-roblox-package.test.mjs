import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {collectRobloxSourceScriptInventory,createRobloxBuildEvidence,normalizeRobloxArtifactLightingSerialization,resolvePackageSourceValidation,ROBLOX_PACKAGE_REQUIRED_ASSET_FAMILIES,ROBLOX_PACKAGE_TOOL,validateRobloxArtifactLightingMigrationGuard,validateRobloxArtifactScriptInventory,validateRobloxPackageAssetThreshold} from '../tools/company-development-roblox-package.mjs';
import {hasCurrentRobloxPackageAssetRepair,robloxPackageAssetRepairContext} from '../tools/company-development-roblox-source-reconcile.mjs';
import {bindExistingFantasyNativeCreatures,bindExistingServerStudioMaterial,buildRobloxStudioAssetBootstrapPlan,detectRobloxStudioAssetSystems,ROBLOX_STUDIO_ASSET_REQUIRED_FAMILIES,robloxBuildProfileFromBaseline,robloxStudioAssetFamilyBoundInText,robloxStudioAssetFamilyStatusFromSource} from '../tools/company-development-roblox-bootstrap.mjs';

test('common Roblox motion, skill and VFX respect official joint and visual lifecycle',()=>{
  const motion=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  const skill=fs.readFileSync('assets/roblox/common-skill-v1/RobloxCommonSkillPresentation.luau','utf8');
  const vfx=fs.readFileSync('assets/roblox/common-vfx-v1/RobloxCommonVFX.luau','utf8');
  assert.match(motion,/joint:IsA\("AnimationConstraint"\)/);
  assert.match(motion,/row\.joint\.Transform=row\.pose\*row\.base/);
  assert.match(motion,/row\.joint\.Transform==row\.lastApplied/);
  assert.match(skill,/function controller\.SetEnabled\(enabled\)/);
  assert.match(skill,/if not trail\.Enabled then trail:Clear\(\) end/);
  assert.match(skill,/Debris:AddItem\(trail,cleanupAfter\)/);
  assert.match(skill,/clamp\(options\.width or 0\.28, 0\.05, 1\)/);
  assert.match(skill,/Debris:AddItem\(orb,/);
  assert.match(skill,/Debris:AddItem\(shell,/);
  assert.match(vfx,/Trail\.WidthScale keypoints are restricted/);
  assert.match(vfx,/clamp\(options\.width or DEFAULT\.TrailWidth, 0\.05, 1\)/);
  assert.match(vfx,/ring\.Orientation=Enum\.ParticleOrientation\.FacingCamera/);
  assert.match(vfx,/if not trail\.Enabled then trail:Clear\(\) end/);
});

test('native NPC and mob animation states keep telegraphs, recovery, and gameplay authority separate',()=>{
  const common=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(common,/ANTICIPATION=\{duration=\.42,looped=false\}/);
  assert.match(common,/RECOVERY=\{duration=\.38,looped=false\}/);
  assert.match(common,/local npcGesture=actorRole=="NPC" and interact or 0/);
  assert.match(common,/forgeRot\(targets,joints,"Jaw",impact\*\.34\+hit\*\.07\+charge\*\.10/);
  assert.match(client,/ANTICIPATION="ANTICIPATION",ATTACK="ATTACK",RECOVERY="RECOVERY"/);
  assert.match(client,/local constraint=joint:IsA\("AnimationConstraint"\)/);
  assert.match(client,/meadowMobMotion\.SampleProceduralActorMotion\(mode,/);
  assert.match(server,/setEnemyAttackState\(enemy,"ANTICIPATION"\)/);
  assert.match(server,/setEnemyAttackState\(enemy,"RECOVERY"\)/);
  assert.doesNotMatch(common,/Humanoid:TakeDamage\(/);
  assert.match(server,/state=="ANTICIPATION" or state=="ATTACK" or state=="RECOVERY"/);
  assert.match(client,/local impactAt=tonumber\(model:GetAttribute\("NativeMobLastImpact"\)\) or 0/);
  assert.match(client,/if requested=="RECOVERY" and impactAt>=eventAt/);
  assert.match(client,/if os.clock\(\)<dodgePoseUntil then return false end/);
  assert.match(client,/mode="ATTACK"/);
  assert.match(client,/mode="RECOVERY"/);
  assert.match(client,/if forcedPhase then phase=forcedPhase end/);
  const npc=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
  assert.match(npc,/motor:IsA\("AnimationConstraint"\)/);
  assert.match(npc,/local actionState=\(marker=="ANTICIPATION"/);
  assert.match(npc,/ANTICIPATION=\.42,RECOVERY=\.38,INTERACT=\.9,GESTURE=1\.1/);
  assert.match(common,/joint:IsA\("Motor6D"\)or joint:IsA\("AnimationConstraint"\)/);
});

test('selected Fantasy Survival motion reaches a server-authorized R15 frame sink, not just an asset list',()=>{
  const source=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  assert.equal(robloxStudioAssetFamilyBoundInText(source,'MOTION'),true);
  assert.match(source,/playNativeCombatMotion\s*=\s*function\(approvedScope,approvedEvent,serverApproved\)/);
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('playNativeCombatMotion(scope,tonumber(serial),true)',
      'playNativeCombatMotion(scope,tonumber(serial),false)'),
    'MOTION'
  ),false,'server approval must not be forged by a client-only motion prediction');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('activeMartialApproved = serverApproved==true','activeMartialApproved = false'),
    'MOTION'
  ),false,'the approved finisher gate must consume the trusted callback argument');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('activeCombatController.Step(combatR15Targets, dt)','-- missing render frame'),
    'MOTION'
  ),false,'an unplayed rig pose must not count as an applied asset');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('if not hasStudioAssetAtom("MOTION", "ATTACK_LIGHT_1") then','if not true then'),
    'MOTION'
  ),false,'an unselected module cannot satisfy motion binding');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replaceAll('GetAttributeChangedSignal("ApprovedCombatMotion")','GetAttributeChangedSignal("UnverifiedMotion")'),
    'MOTION'
  ),false,'a motion without server-approved action is not applied');
  // A separately observed learning HUD event does not authorize an R15 attack.
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('verifiedLearningPlayer:GetAttributeChangedSignal("ApprovedCombatMotion")',
      'verifiedLearningPlayer:GetAttributeChangedSignal("UnverifiedMotion")'),
    'MOTION'
  ),true,'changing the HUD observer must not sever the real authorized R15 sink');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('player:GetAttributeChangedSignal("ApprovedCombatMotion")',
      'player:GetAttributeChangedSignal("UnverifiedMotion")'),
    'MOTION'
  ),false,'changing only the R15 event listener must remove authorization');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('if not authorizedCombatScopes[approvedScope] then return false end',
      'if false then return false end'),
    'MOTION'
  ),false,'an unvalidated action cannot authorize R15 pose consumption');
  assert.equal(robloxStudioAssetFamilyBoundInText(
    source.replace('local scope,serial=tostring(player:GetAttribute("ApprovedCombatMotion") or ""):match("^([^:]+):(%d+)$")',
      'local scope,serial="forged","1"'),
    'MOTION'
  ),false,'the actual R15 callback must read the server-supplied action sequence');
});

test('Fantasy Survival Roblox R15 unarmed skills select authentic authored actions and server-only contacts',()=>{
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const native=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  const sharedIds=['JAB_LEFT','CROSS_RIGHT','HOOK_LEFT','HOOK_RIGHT','UPPERCUT_RIGHT',
    'UPPERCUT_LEFT','ELBOW_RIGHT','ELBOW_LEFT','KNEE_LEFT','KNEE_RIGHT',
    'ROUND_KICK_R','SIDE_KICK_L','FRONT_KICK_R','LOW_KICK_R','BACKFIST_LEFT'];
  for(const id of sharedIds){
    assert.match(native,new RegExp('id="'+id+'"'),id+' must be an authored native action');
    assert.ok(client.includes('"U:'+id+'"'),id+' must be directly selected from the shared module');
  }
  for(const id of ['meadow-unarmed-rush','meadow-unarmed-uppercut',
    'meadow-unarmed-kick','meadow-unarmed-elbow']){
    assert.ok(config.includes('Id = "'+id+'"'),id+' is an approved gameplay action');
    const expectedCost=id==='meadow-unarmed-uppercut'?20:id==='meadow-unarmed-kick'?14:null;
    const handler='["'+id+'"]='+(expectedCost===null?'unarmedSkillAttack':'function(player) return unarmedSkillAttack(player,'+expectedCost+') end');
    assert.ok(server.includes(handler),id+' preserves original attack authority and stamina cost');
    assert.ok(client.includes('["'+id+'"]='),id+' has a dedicated R15 motion route');
  }
  assert.match(server,/if not character or character:FindFirstChildOfClass\("Tool"\) then return false end/);
  assert.match(server,/local accepted,hit=attackEnemy\(player\)/,'skill uses the original authoritative combat function');
  assert.match(server,/if accepted and cost>0 then player:SetAttribute\("MeadowStamina",math.max\(0,stamina-cost\)\) end/,'stamina is deducted only after accepted attacks');
  assert.match(server,/return accepted,hit/,'accepted attack and hit status are preserved');
  assert.match(server,/remote:FireClient\(player, "MEADOW_IMPACT", \{/);
  assert.ok(server.indexOf('remote:FireClient(player, "MEADOW_IMPACT"') >
    server.indexOf('target.HP=math.max(0,target.HP-damage)'),'impact occurs after confirmed damage');
  assert.match(client,/kind~="MEADOW_IMPACT"/);
  assert.match(client,/combatVFX.CreateImpactFlash\(/);
  assert.match(client,/combatVFX.AttachShortTrail/);
  assert.match(client,/LeftHip=true,RightHip=true,LeftKnee=true,RightKnee=true/);
  assert.match(client,/pcall\(combatMotionSource.CreateCombatCombo,/);
  assert.doesNotMatch(client,/combo\.steps\s*=/,'immutable authored combos must never be mutated');
  assert.match(client,/activeCombatController\.Step\(combatR15Targets, dt\)/);
  assert.match(client,/GetAttributeChangedSignal\("ApprovedCombatMotion"\)/);
  assert.doesNotMatch(server,/Instance\.new\("Part"\)/,'do not introduce fake Roblox characters');
});

test('guarded native bindings distinguish selected atoms from list counts',()=>{
  const environment='if #studioAssetFamily("ENVIRONMENT") > 0 and camp and camp:IsA("BasePart") then\n  camp.Material = Enum.Material.Slate\nend';
  const prop='if #studioAssetFamily("PROP") > 0 and workbench and workbench:IsA("BasePart") then\n  workbench.Material = Enum.Material.WoodPlanks\nend';
  const unbound='if #studioAssetFamily("ENVIRONMENT") > 0 then\n  local marker = true\nend';
  assert.equal(robloxStudioAssetFamilyBoundInText(environment,'ENVIRONMENT'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(environment.replace('#studioAssetFamily("ENVIRONMENT") > 0','hasStudioAssetAtom("ENVIRONMENT", "ROCK_SLATE")'),'ENVIRONMENT'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(prop,'PROP'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(prop.replace('#studioAssetFamily("PROP") > 0','hasStudioAssetAtom("PROP", "WORKBENCH_WOOD")'),'PROP'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(unbound,'ENVIRONMENT'),false);
});

test('selected real-model scale and pivot sinks require a native consumer and selected data',()=>{
  const model='local model=workspace:FindFirstChild("Animal")\nif not model:IsA("Model") then return end\n';
  const scale=model+'local anatomy=studioAssetFamily("CREATURE")[1]\nlocal scale=anatomy.Scale\nmodel:ScaleTo(scale)';
  assert.equal(robloxStudioAssetFamilyBoundInText(scale,'CREATURE'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(scale.replace('model:ScaleTo(scale)','model:SetAttribute("SelectedScale",scale)'),'CREATURE'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(scale.replace('model:ScaleTo(scale)','model:ScaleTo(1)'),'CREATURE'),false);
  const pose=model+'local clip=studioAssetFamily("MOTION")[1]\nlocal pose=clip.Pose\nmodel:PivotTo(pose)';
  assert.equal(robloxStudioAssetFamilyBoundInText(pose,'MOTION'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(pose.replace('model:PivotTo(pose)','model:PivotTo(CFrame.identity)'),'MOTION'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(pose.replace(model,''),'MOTION'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(pose.replace('not model:IsA','not unrelated:IsA'),'MOTION'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(pose.replace('model:PivotTo(pose)','model={}\nmodel:PivotTo(pose)'),'MOTION'),false);
  assert.equal(robloxStudioAssetFamilyBoundInText(pose.replace('local clip=','local function unrelated(model)\nlocal clip=')+'\nend','MOTION'),false);
});

test('Cozy NPC anatomy and Baeksu original model consumers use selected library families',()=>{
  const cozy=fs.readFileSync('roblox-games/cozy-island/client/Game.client.luau','utf8');
  assert.equal(robloxStudioAssetFamilyBoundInText(cozy,'CHARACTER'),true);
  assert.equal(robloxStudioAssetFamilyBoundInText(cozy.replace('table.find(npcBodyAtoms,"BODY_STANDARD")~=nil','true'),'CHARACTER'),false);
  const kit=fs.readFileSync('roblox-games/baeksu-war/shared/VisualKit.luau','utf8');
  for(const family of ['CREATURE','ENVIRONMENT','PROP','MOTION']){
    assert.equal(robloxStudioAssetFamilyBoundInText(kit,family),true,family);
    assert.equal(robloxStudioAssetFamilyBoundInText(kit.replace('studioAssetFamily("'+family+'")','{}'),family),false,family+' must lose binding when its actual selection is removed');
  }
  assert.doesNotMatch(kit,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
  assert.ok(kit.includes('actor:PivotTo('));
  assert.ok(kit.includes('root:ScaleTo(factor)'));
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

test('survival consumes selected VFX atoms in the persistent native creature presentation',()=>{
  const source=fs.readFileSync('roblox-games/survival/client/Game.client.luau','utf8');
  assert.equal(robloxStudioAssetFamilyBoundInText(source,'VFX'),true);
  const start=source.indexOf('local function applySurvivalCreaturePresentation(enemy)');
  const end=source.indexOf('\ntask.defer(function()',start);
  assert.ok(start>0&&end>start);
  const consumer=source.slice(start,end);
  assert.ok(consumer.includes('hasStudioAssetAtom("VFX", "ELEMENT_DUST")'));
  assert.ok(consumer.includes('local emitter = Instance.new("ParticleEmitter")'));
  assert.ok(consumer.includes('emitter:Emit(hasStudioAssetAtom("VFX", "SHAPE_BURST") and 10 or 6)'));
  assert.ok(consumer.includes('if emitter.Parent then emitter:Destroy() end'));
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
  const persist=(currentRevision,currentFields={})=>{
    const queue={items:[{gameId,robloxSourceCommit:currentRevision,...currentFields},sibling]};
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
  const sourceRepair={currentStep:'TARGET_PLATFORM_SOURCE_BIND',robloxFailureStage:'TARGET_PLATFORM_SOURCE_BIND',robloxFailureSignature:'existing-source-static-revalidation-failed',robloxSourceBootstrapFailedAt:'2026-10-11T13:10:28Z',routingBlockers:['SOURCE_SERVER_MISSING']};
  assert.deepEqual(persist(revision,sourceRepair).items,[{gameId,robloxSourceCommit:revision,...sourceRepair},sibling],'late package failure must not replace current source repair');
  const successfulResult={...result,pass:true,f0Pass:true,preflightPass:true,artifactIdentity:'sha256:'+'f'.repeat(64)};
  const preserved={gameId,robloxSourceCommit:revision,...sourceRepair};
  const files=new Map([['development-queue.json',JSON.stringify({items:[preserved,sibling]})],['result.json',JSON.stringify(successfulResult)]]);
  const stop=new Error('source repair preserved');
  let wrote=false;
  assert.throws(()=>runInNewContext(nodeStep('Persist successful F0 checkpoint immediately per game'),{
    require:()=>({readFileSync:p=>files.get(p),writeFileSync(){wrote=true;}}),console:{log(){}},
    process:{env:{GAME_ID:gameId,RESULT_FILE:'result.json'},exit(){throw stop;}}
  }),error=>error===stop);
  assert.equal(wrote,false,'late successful F0 must not bypass newer source repair either');

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
    for(const row of pass.familyResults){
      assert.ok(Array.isArray(row.responsibleFiles));
      assert.ok(row.responsibleFiles.every(file=>!file.startsWith('/')&&!file.includes('..')));
    }
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
  const materials=fs.readFileSync('assets/roblox/common-materials-v1/RobloxCommonMaterials.luau','utf8');
  assert.equal(detectRobloxStudioAssetSystems({sourceText:materials}).MOTION,false,'재질 BONE은 모션 시스템이 아니다');
  assert.equal(detectRobloxStudioAssetSystems({sourceText:materials}).ENVIRONMENT,false,'재질 Water·Rock 목록은 환경 객체가 아니다');
  assert.equal(detectRobloxStudioAssetSystems({sourceText:materials}).PROP,false,'재질 Rock 목록은 소품 객체가 아니다');
  assert.equal(detectRobloxStudioAssetSystems({sourceText:'local part = Instance.new("Part")\npart.Name = "Rock"'}).PROP,true);
  for(const sourceText of [
    'local presets = { BONE = {}, Animation = "idle", Animator = "actor" }',
    'local message = "Bone AnimationTrack TweenService RenderStepped Heartbeat"',
  ])assert.equal(detectRobloxStudioAssetSystems({sourceText}).MOTION,false);
  for(const sourceText of [
    'local bone = Instance.new("Bone")',
    'local animator = humanoid:FindFirstChildOfClass("Animator")',
    'local track = animator:LoadAnimation(animation)',
    'track:AdjustSpeed(1)',
    'local tween = game:GetService("TweenService")',
    'runService.Heartbeat:Connect(function() end)',
  ])assert.equal(detectRobloxStudioAssetSystems({sourceText}).MOTION,true,sourceText);
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

test('Roblox binding rejects nonempty lists and comments while accepting actual selected values',()=>{
  const cases=[
    'local root=Instance.new("Frame")\nif #studioAssetFamily("UI") > 0 then root.BackgroundColor3=Color3.new(1,1,1) end',
    'local root=Instance.new("Frame")\nlocal atoms=studioAssetFamily("UI")\nroot.BackgroundTransparency=#atoms > 0 and 0.2 or 0.4',
    'if #studioAssetFamily("PROP") > 0 then\n local tree=Instance.new("MeshPart")\n tree.Material=Enum.Material.Wood\nend',
    'local root=Instance.new("Frame")\n-- root.BackgroundColor3=studioAssetFamily("UI").Color',
    'local root=Instance.new("Frame")\n--[[ root.BackgroundColor3=studioAssetFamily("UI").Color ]]'
  ];
  for(const source of cases)assert.equal(robloxStudioAssetFamilyBoundInText(source,source.includes('"PROP"')?'PROP':'UI'),false,source);
  assert.equal(robloxStudioAssetFamilyBoundInText('local root=Instance.new("Frame")\nlocal theme=studioAssetFamily("UI")[1]\nroot.BackgroundColor3=theme.Color','UI'),true);
});

test('Roblox binding follows multiline selected-atom branches and same-object type guards',()=>{
  const source=fs.readFileSync(new URL('../roblox-games/daechung-rpg/client/Game.client.luau',import.meta.url),'utf8');
  for(const family of ['WEAPON','CREATURE','PROP'])assert.equal(robloxStudioAssetFamilyBoundInText(source,family),true,family);
  const cozy=fs.readFileSync(new URL('../roblox-games/cozy-island/client/Game.client.luau',import.meta.url),'utf8');
  assert.equal(robloxStudioAssetFamilyBoundInText(cozy,'CREATURE'),true,'selected atom early return must preserve the existing consumer');

  const guard='if not instance:IsA("MeshPart") then return end\nlocal name = instance.Name:lower()\n';
  const selection='if name == "lamp"\n  and table.find(studioAssetFamily("PROP"), "LAMP") then\n';
  const render='  instance.Material = Enum.Material.Metal\n';
  assert.equal(robloxStudioAssetFamilyBoundInText(guard+selection+render+'end','PROP'),true);
  const rejected=[
    guard+selection+'  print("selected")\nelse\n'+render+'end',
    guard+selection+'  print("selected")\nend\n'+render,
    guard.replace('instance:IsA','other:IsA')+selection+render+'end',
    guard.replace('then return','and ready then return')+selection+render+'end',
    guard+'instance = {}\n'+selection+render+'end',
    guard+'end\nlocal function unrelated(instance)\n'+selection+render+'end',
    'if instance:IsA("MeshPart") and #\n  studioAssetFamily("PROP") > 0 then\n'+render+'end',
    guard+selection+'  instance:SetAttribute("AssetFamily", "PROP")\nend',
    'if table.find(studioAssetFamily("PROP"), "LAMP") then return end\nif instance:IsA("MeshPart") then\n'+render+'end',
    'if not table.find(studioAssetFamily("PROP"), "LAMP") then return end\nend\nlocal function unrelated(instance)\nif instance:IsA("MeshPart") then\n'+render+'end',
  ];
  for(const text of rejected)assert.equal(robloxStudioAssetFamilyBoundInText(text,'PROP'),false,text);
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

test('fantasy survival keeps selected MATERIAL atoms while using genuine Roblox Terrain instead of a visual Part',()=>{
  const source=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.ok(source.includes('studioAssetFamily("MATERIAL")'));
  assert.match(source,/meadowTerrain:FillBlock\(/);
  assert.match(source,/meadowTerrain:FillBall\(/);
  assert.ok(source.includes('studioAssetFamily("MATERIAL")'));
  assert.doesNotMatch(source,/Instance\.new\("Part"\)/,'visual cubes are prohibited');
  assert.ok(source.includes('nativeFoundationSpawn.CanCollide = false'));
});

test('Vibe MATERIAL repair binds selected asset atom to an existing visible native object without changing gameplay systems',()=>{
  const selectedAtoms=['METAL','WOOD','STONE','CLOTH'];
  for(const gameId of ['island-village','monster-adventure','seed-puzzle-chromatic-cascade']){
    const original=fs.readFileSync(`roblox-games/${gameId}/server/Game.server.luau`,'utf8');
    const repaired=bindExistingServerStudioMaterial({source:original,familyStatus:{MATERIAL:'APPLIED'},selectedAtoms});
    assert.ok(repaired.startsWith(original.trimEnd()),gameId+' must preserve original gameplay source');
    assert.match(repaired,/STUDIO_ASSET_NATIVE_MATERIAL_REPAIR_BEGIN/);
    assert.match(repaired,/table\.find\(studioAssetFamily\("MATERIAL"\), "METAL"\)/);
    assert.match(repaired,/\.Material = Enum\.Material\.Metal/);
    assert.equal(robloxStudioAssetFamilyBoundInText(repaired,'MATERIAL'),true,gameId);
    assert.equal(bindExistingServerStudioMaterial({source:repaired,familyStatus:{MATERIAL:'APPLIED'},selectedAtoms}),repaired,'repair is idempotent');
    assert.equal(bindExistingServerStudioMaterial({source:original,familyStatus:{MATERIAL:'NOT_APPLICABLE'},selectedAtoms}),original,'inapplicable family must not alter sources');
    assert.doesNotMatch(repaired.slice(original.trimEnd().length),/CanCollide\s*=|DataStore|RemoteEvent|Coins\s*=|Health\s*=/,'source repair must not alter physics, save, balance, or network');
  }
  assert.throws(()=>bindExistingServerStudioMaterial({
    source:'local Config = require(Shared:WaitForChild("GameConfig"))\\nlocal part=Instance.new("Part")',
    familyStatus:{MATERIAL:'APPLIED'},selectedAtoms
  }),/EXISTING_STUDIO_MATERIAL_VISIBLE_NATIVE_TARGET_REQUIRED/);
  // This negative fixture must remain unbound even after Vibe merges the real game's repair.
  // Reading a live game here incorrectly turns an expected failure into an idempotent no-op.
  const unboundNativeSource=[
    'local Config = require(Shared:WaitForChild("GameConfig"))',
    'local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")',
    'local foundationMarker = Instance.new("SpawnLocation")',
  ].join('\n');
  assert.equal(robloxStudioAssetFamilyBoundInText(unboundNativeSource,'MATERIAL'),false);
  assert.throws(()=>bindExistingServerStudioMaterial({source:unboundNativeSource,familyStatus:{MATERIAL:'APPLIED'},selectedAtoms:['UNVERIFIED']}),/EXISTING_STUDIO_MATERIAL_SELECTED_NATIVE_ATOM_REQUIRED/);
});

test('Roblox source-plan routes only an exact current MATERIAL package failure back into Vibe source worker',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/const materialRepairPending=reconciliationRow\?\.sourceRepairPending===true/);
  assert.match(workflow,/reconciliationRow\.blockers\.length===1/);
  assert.match(workflow,/ROBLOX_PACKAGE_ASSET_FAMILY_NOT_ACTUALLY_BOUND:MATERIAL/);
  assert.match(workflow,/studioMaterialRepair:materialRepairPending/);
  assert.match(workflow,/STUDIO_MATERIAL_REPAIR: \$\{\{ matrix\.studioMaterialRepair \|\| false \}\}/);
  assert.match(workflow,/--studio-material-repair="\$STUDIO_MATERIAL_REPAIR"/);
  assert.match(workflow,/--foundation-repair="\$FOUNDATION_REPAIR"/);
});

test('new Roblox source bootstraps client directory before copying pinned MATERIAL presentation',()=>{
  const source=fs.readFileSync('tools/company-development-roblox-bootstrap.mjs','utf8');
  const start=source.indexOf('function writeSourceTree(');
  const end=source.indexOf('\nasync function main()',start);
  assert.ok(start>=0&&end>start,'canonical source writer must remain present');
  const writer=source.slice(start,end);
  const clientDir=writer.indexOf("fs.mkdirSync(path.join(root,'client'),{recursive:true})");
  const serverDir=writer.indexOf("fs.mkdirSync(path.join(root,'server'),{recursive:true})");
  const materialCopy=writer.indexOf("fs.copyFileSync(new URL('../assets/roblox/common-materials-v1/MaterialPresentation.client.luau'");
  assert.ok(clientDir>=0&&serverDir>=0&&materialCopy>clientDir&&materialCopy>serverDir,
    'both output directories must exist before copying pinned material asset');
  assert.ok(fs.existsSync('assets/roblox/common-materials-v1/MaterialPresentation.client.luau'));
  assert.match(writer,/fs\.writeFileSync\(path\.join\(root,'client','Game\.client\.luau'\)/);
});


test('approved fantasy originals replace only the existing visual consumer after actual registration',()=>{
  const manifest=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/native-assets.json','utf8'));
  const source=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const registry={gameId:manifest.gameId,registrationVerified:true,nativeRegistrationVersion:1,grantRequiredAtPublish:true,
    models:Object.fromEntries(Object.entries(manifest.models).map(([role,row],index)=>[role,{assetId:123450+index,
      sourceSha256:row.sourceSha256,sha256:row.sourceSha256,license:'CC0-1.0',licenseEvidence:row.licenseEvidence}]))};
  const bound=bindExistingFantasyNativeCreatures({source,manifest,registry});
  assert.equal(robloxStudioAssetFamilyBoundInText(bound,'CREATURE'),true);
  assert.equal(bound.slice(bound.indexOf('  local hitPoints =')),source.slice(source.indexOf('  local hitPoints =')),
    'health, AI, rewards, waves and persistence remain exact');
  assert.doesNotMatch(bound,/CreatureParts\.Create\(/);
  assert.match(bound,/AssetService:LoadAssetAsync\(modelId\)/);
  assert.match(bound,/nativeCreatureTemplates\[modelId\]/);
  assert.match(bound,/FindFirstChildWhichIsA\("MeshPart",true\)/);
  assert.match(bound,/item:IsA\("LuaSourceContainer"\)/);
  assert.equal(bindExistingFantasyNativeCreatures({source:bound,manifest,registry}),bound);
  for(const field of ['assetId','sourceSha256','licenseEvidence']){
    const broken=structuredClone(registry);broken.models.golem[field]=field==='assetId'?0:'invalid';
    assert.throws(()=>bindExistingFantasyNativeCreatures({source,manifest,registry:broken}),/PROVENANCE_MISMATCH:golem/);
  }
  assert.throws(()=>bindExistingFantasyNativeCreatures({source,manifest:{...manifest,ownerApproved:false},registry}),/VERIFIED_REGISTRATION_REQUIRED/);
});

test('native registration stays behind current contract identity and exact publish Universe grants',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/nativeCreatureRepairPending=item.gameId==='fantasy-survival'/);
  assert.match(workflow,/reconciliationSourceTreeSha:String\(reconciliationRow\?\.sourceTreeSha\|\|\(nativeCreatureRepairPending/);
  assert.match(workflow,/execFileSync\('git',\['rev-parse','HEAD:'\+target\]/);
  assert.match(workflow,/group: roblox-source-\$\{\{ matrix.nativeCreatureRepair && 'native-registration' \|\| github.run_id \}\}-\$\{\{ matrix.gameId \}\}/);
  const native=workflow.indexOf('python3 tools/baeksu-war-author-meshes.py');
  assert.ok(native>workflow.indexOf('ROBLOX_SOURCE_PLAN_CONTRACT_CURRENT='));
  assert.ok(native>workflow.indexOf('ROBLOX_SOURCE_TREE_IDENTITY_CURRENT='));
  assert.ok(native<workflow.indexOf('timeout 2m node tools/company-development-roblox-bootstrap.mjs'));
  assert.match(workflow,/--native-creature-repair="\$NATIVE_CREATURE_REPAIR"/);
  const release=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const start=release.indexOf("          if(sourceRoot==='roblox-games/fantasy-survival'&&gameCode.includes");
  const end=release.indexOf('          const assetIds=[...new Set(selected)];',start);
  assert.ok(start>0&&end>start);
  const block=release.slice(start,end);
  const manifestBytes=fs.readFileSync('roblox-games/fantasy-survival/native-assets.json');
  const manifest=JSON.parse(manifestBytes);
  const registry={gameId:manifest.gameId,registrationVerified:true,nativeRegistrationVersion:1,grantRequiredAtPublish:true,
    sourceManifestSha256:crypto.createHash('sha256').update(manifestBytes).digest('hex'),
    models:Object.fromEntries(Object.entries(manifest.models).map(([role,row],index)=>[role,{assetId:123450+index,
      sourceSha256:row.sourceSha256,sha256:row.sourceSha256,license:'CC0-1.0',licenseEvidence:row.licenseEvidence}]))};
  const execute=(nativeRegistry=registry)=>{
    const selected=[];
    runInNewContext(block,{sourceRoot:'roblox-games/fantasy-survival',revision:'a'.repeat(40),
      gameCode:'local FANTASY_NATIVE_CREATURES_VERSION = 1;'+Array.from({length:Object.keys(manifest.models).length},(_,i)=>123450+i).join(';'),selected,crypto,
      execFileSync:(_cmd,args)=>args[1].endsWith('/native-assets.json')?manifestBytes:fs.readFileSync(args[1].slice(41)),
      git:()=>JSON.stringify(nativeRegistry)});
    return selected;
  };
  assert.deepEqual(execute(),Object.keys(manifest.models).map((_,i)=>123450+i));
  const stale=structuredClone(registry);stale.sourceManifestSha256='0'.repeat(64);
  assert.throws(()=>execute(stale),/PUBLISH_PROVENANCE_INVALID/);
  const broken=structuredClone(registry);broken.models.golem.sha256='0'.repeat(64);
  assert.throws(()=>execute(broken),/PUBLISH_MODEL_MISMATCH:golem/);
});

test('native uploader verifies all originals before registration and emits real returned IDs without guessing grants',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fantasy-native-upload-'));
  try{
    const game=path.join(root,'roblox-games/fantasy-survival');fs.mkdirSync(path.join(game,'shared'),{recursive:true});
    const manifestBytes=fs.readFileSync('roblox-games/fantasy-survival/native-assets.json');
    const manifest=JSON.parse(manifestBytes);
    // Deterministic FBX/GLB fixtures keep the test independent of live uploads.
    const roles={};let index=0;
    for(const [role,row] of Object.entries(manifest.models)){
      const extension=path.extname(row.sourcePath||row.archiveEntry||'').slice(1);
      const bytes=Buffer.concat([Buffer.from(extension==='glb'?'glTF':'Kaydara FBX Binary'),Buffer.alloc(1200,++index)]);
      row.sourceSha256=crypto.createHash('sha256').update(bytes).digest('hex');
      fs.writeFileSync(path.join(root,role+'.'+extension),bytes);
      roles[role]={sha256:row.sourceSha256,sourceSha256:row.sourceSha256,license:'CC0-1.0',licenseEvidence:row.licenseEvidence};
    }
    const input=Buffer.from(JSON.stringify(manifest));fs.writeFileSync(path.join(game,'native-assets.json'),input);
    const provenance={version:5,gameId:'fantasy-survival',sourceManifestSha256:crypto.createHash('sha256').update(input).digest('hex'),roles};
    fs.writeFileSync(path.join(root,'provenance.json'),JSON.stringify(provenance));
    const preload=path.join(root,'api.mjs');
    fs.writeFileSync(preload,`import fs from 'node:fs';
let serial=0;globalThis.setTimeout=(callback)=>{callback();return 0};
globalThis.fetch=async(url,options={})=>{
 if(options.method==='POST'){
  const request=JSON.parse(options.body.get('request'));const file=options.body.get('fileContent');
  if(request.assetType!=='Model'||!((file.type==='model/fbx'&&file.name.endsWith('.fbx'))||(file.type==='model/gltf-binary'&&file.name.endsWith('.glb'))))throw Error('WRONG_UPLOAD');
  fs.appendFileSync('requests.txt',request.displayName+'\\n');
  return {ok:true,json:async()=>({path:'operations/'+(++serial)})};
 }
 if(options.method==='PATCH')throw Error('PREMATURE_UNIVERSE_GRANT');
 return {ok:true,json:async()=>({done:true,response:{assetId:900000+Number(url.split('/').at(-1))}})};
};`);
    const args=['--import',preload,path.resolve('tools/baeksu-war-upload-meshes.mjs'),root,path.join(root,'receipt.json'),'--game-id=fantasy-survival'];
    const env={...process.env,ROBLOX_OPEN_CLOUD_API_KEY:'mock-test-key',ROBLOX_CREATOR_USER_ID:'123',ROBLOX_ROBLOSECURITY:'',ROBLOX_SECURITY_COOKIE:''};
    const broken=structuredClone(provenance);broken.roles.golem.sha256='0'.repeat(64);
    fs.writeFileSync(path.join(root,'provenance.json'),JSON.stringify(broken));
    const rejected=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8'});
    assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/CC0_SOURCE_LICENSE_OR_HASH_UNVERIFIED:golem/);
    assert.equal(fs.existsSync(path.join(root,'requests.txt')),false,'all native hashes precede any external write');
    fs.writeFileSync(path.join(root,'provenance.json'),JSON.stringify(provenance));
    const accepted=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8'});
    assert.equal(accepted.status,0,accepted.stderr);
    const registry=JSON.parse(fs.readFileSync(path.join(game,'CC0-ASSET-REGISTRY.json')));
    assert.deepEqual(Object.values(registry.models).map(row=>row.assetId),Object.keys(manifest.models).map((_,i)=>900001+i));
    assert.equal(registry.runtimeVerified,false);assert.equal(registry.grantRequiredAtPublish,true);
    assert.ok(Object.values(registry.models).every(row=>row.universeId===null));
    const ids=fs.readFileSync(path.join(game,'shared/VisualAssetIds.luau'),'utf8');
    assert.match(ids,/golem=900003/);
    assert.match(ids,/deer=900004/);
    assert.match(ids,/tree=900007/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('Fantasy Survival melee, 11 skills and 3 original CC0 mob motion/skill families are actually bound',()=>{
  const cfg=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const sourceMotion=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  const sourceSkill=fs.readFileSync('assets/roblox/common-skill-v1/RobloxCommonSkillPresentation.luau','utf8');
  const sourceVFX=fs.readFileSync('assets/roblox/common-vfx-v1/RobloxCommonVFX.luau','utf8');
  const actions=[...cfg.matchAll(/\{ Id = "([^"]+)", Label = "([^"]+)", Kind = "([^"]+)", Order = (\d+)/g)];
  assert.equal(actions.length,21,'10 existing actions + 11 meadow skills');
  assert.equal(new Set(actions.map(row=>row[1])).size,21,'all actions have unique real server routes');
  for(const [,,label,kind] of actions){
    assert.ok(label.length>0 && ['COMBAT','SURVIVAL','GATHER','PROGRESSION','SKILL'].includes(kind));
  }
  const skillRows=cfg.split('\n').filter(row=>row.includes('Id = "skill-meadow-'));
  assert.equal(skillRows.length,11);
  for(const row of skillRows){
    const id=row.match(/Id = "([^"]+)"/)?.[1];
    const motion=row.match(/MotionAtom = "([^"]+)"/)?.[1];
    const skill=row.match(/SkillAtom = "([^"]+)"/)?.[1];
    const vfx=row.match(/VfxAtom = "([^"]+)"/)?.[1];
    assert.ok(server.includes('["'+id+'"]'),'server handler is wired: '+id);
    assert.ok(sourceMotion.includes(motion+' = table.freeze('),'real shared R15 motion: '+motion);
    if(skill)assert.ok(sourceSkill.includes('id == "'+skill+'"'),'real shared skill: '+skill);
    if(vfx)assert.ok(sourceVFX.includes('id == "'+vfx+'"'),'real shared VFX: '+vfx);
  }
  for(const id of ['meadow-unarmed-rush','meadow-unarmed-uppercut','meadow-unarmed-kick',
    'meadow-unarmed-elbow'])assert.ok(cfg.includes('Id = "'+id+'"'),'existing weaponless martial action is retained');
  for(const move of ['U:JAB_LEFT','U:CROSS_RIGHT','U:HOOK_LEFT','U:UPPERCUT_RIGHT','U:ROUND_KICK_R']){
    assert.ok(client.includes('"'+move+'"'),'source-authored weaponless R15 pose retained: '+move);
    assert.ok(sourceMotion.includes('id="'+move.slice(2)+'"'));
  }
  for(const mob of ['wolf','bee','golem'])assert.ok(server.includes('"'+mob+'"'));
  for(const pattern of ['WOLF_BITE','WOLF_LUNGE','BEE_SWEEP','BEE_STING',
    'GOLEM_SLAM','GOLEM_SHOCKWAVE'])assert.ok(server.includes('"'+pattern+'"'));
  assert.match(server,/local function animateMeadowOriginalMob\(/);
  assert.match(server,/local function chooseMeadowMobSkill\(/);
  assert.match(server,/model:SetAttribute\("NativeMobMotion"/,"server must author original mob state");
  assert.match(client,/model:GetAttribute\("NativeMobMotion"\)/,"client must consume that authoritative state");
  assert.match(server,/remote:FireAllClients\("MEADOW_MOB_ATTACK"/);
  assert.match(server,/remote:FireAllClients\("MEADOW_MOB_DEATH"/);
  assert.match(server,/meadowDefense\[player\]/);
  assert.match(server,/meadowSkillCooldown\[player\]/);
  assert.match(server,/player:SetAttribute\("ApprovedActionMotion"/);
  assert.match(server,/player:SetAttribute\("ApprovedActionFX"/);
  assert.match(client,/NativeActionGrid/);
  assert.match(client,/GetAttributeChangedSignal\("ApprovedActionMotion"\)/);
  assert.match(client,/GetAttributeChangedSignal\("ApprovedActionFX"\)/);
  assert.match(client,/SampleProceduralActorMotion\(/);
  assert.match(client,/MapCombatPoseToR15\(/);
  assert.match(client,/RobloxCommonSkillPresentation/);
  assert.match(client,/RobloxCommonVFX/);
  assert.match(client,/GetAttributeChangedSignal\("Species"\):Once/);
  assert.doesNotMatch(server,/Instance\.new\("Part"\)/,'no fake creature models or world geometry');
  assert.doesNotMatch(client,/Instance\.new\("Part"\)/,'original CC0 mobs and R15 only');
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1,
    'original save writer is unchanged');
});

test('fantasy meadow is five times larger while preserving fast central spawn and streamed mobile play',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const project=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/default.project.json','utf8'));
  const workspace=project.tree.Workspace?.$properties||{};
  assert.equal(workspace.StreamingEnabled,true,'large meadow must use engine instance streaming');
  assert.equal(workspace.StreamingMinRadius,64);
  assert.equal(workspace.StreamingTargetRadius,256);
  assert.match(server,/local meadowWorldSize=696/);
  assert.match(server,/meadowTerrain:FillBlock\(CFrame.new\(0, -4, 0\), Vector3.new\(312, 12, 312\), Enum.Material.Grass\)/);
  for(const coord of ['x=-252,z=0,width=192,depth=696','x=252,z=0,width=192,depth=696',
    'x=0,z=-252,width=312,depth=192','x=0,z=252,width=312,depth=192']){
    assert.ok(server.includes(coord),'missing non-overlapping outer meadow strip: '+coord);
  }
  assert.equal((696*696)/(312*312)>4.9,true,'meadow area must be nearly 5x');
  assert.match(server,/task.defer\(function\(\)[\s\S]*?MeadowOuterRegionReady",true/);
  assert.match(server,/task.delay\(4,function\(\)/,'decorative wildlife must not delay first player entry');
  assert.match(server,/clone.ModelStreamingMode=Enum.ModelStreamingMode.Atomic/);
  assert.match(server,/model.ModelStreamingMode=Enum.ModelStreamingMode.Atomic/);
  assert.match(client,/meadowMobWorld.ChildRemoved:Connect\(function\(model\)/);
  assert.match(client,/row.controller.Destroy\(false\)/);
  assert.match(server,/local location = Vector3.new\(math.cos\(theta\)\*radius, 3, math.sin\(theta\)\*radius\)/);
  assert.match(server,/local number=math.min\(3\+CurrentWave\*2, MAX_ENEMIES\)/);
  assert.match(server,/store:UpdateAsync\("player:"/);
  assert.doesNotMatch(server,/Instance.new\("Part"\)/);
});

test('fantasy meadow forest edges reuse verified trees and wildlife with quiet delayed birdsong',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const visual=fs.readFileSync('roblox-games/fantasy-survival/shared/VisualAssetIds.luau','utf8');
  const registry=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8'));
  for(const species of ['tree','deer','boar','rabbit']){
    assert.ok(registry.models[species]?.license==='CC0-1.0','use verified original CC0 only: '+species);
    assert.match(visual,new RegExp('\\b'+species+'\\s*=\\s*'+registry.models[species].assetId+'\\b'));
  }
  assert.match(server,/task.defer\(function\(\)/);
  assert.match(server,/tree=worldAsset\("tree",Vector3.new\(spec\[1\],3,spec\[2\]\),spec\[3\]\)/);
  assert.match(server,/tree:SetAttribute\("MeadowScenery",true\)/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowWoodlandSceneryCount",sceneryCount\)/);
  assert.match(server,/local animal=worldAsset\(spec\[1\],Vector3.new\(spec\[2\],3,spec\[3\]\),spec\[4\]\)/);
  assert.match(server,/table.insert\(meadowWildlife,\{/);
  assert.match(server,/meadowTerrain:FillBall\(Vector3.new\(patch\[1\],-2,patch\[2\]\),patch\[3\],patch\[4\]\)/);
  assert.doesNotMatch(server,/Instance.new\("Part"\)/);
  assert.match(client,/task.delay\(5,function\(\)/);
  assert.match(client,/forestBed.SoundId="rbxassetid:\/\/9116971475"/);
  assert.match(client,/birdChirp.SoundId="rbxassetid:\/\/140708444684424"/);
  assert.match(client,/birdChirp.Looped=false/);
  assert.match(client,/local forestAudioEnabled=hasStudioAssetAtom\("AUDIO","ENV_FOREST"\)/);
  assert.match(client,/forestBed.Volume=forestAudioEnabled and \(\(\.035\+\.085\*forestPresence\)\*\(quiet and \.28 or 1\)\) or 0/);
  assert.match(client,/local quiet=phase=="NIGHT" or sky=="RAIN" or sky=="SNOW" or sky=="STORM"/);
  assert.match(client,/birdChirp.Volume=forestAudioEnabled and \(\(\.085\+\.17\*forestPresence\)\*\(quiet and \.18 or 1\)\) or 0/);
  assert.match(client,/nextChirp=os.clock\(\)\+math.random\(17,29\)/);
  // Survival inspection is meaningful but cannot change existing balance, rewards or save data.
  assert.match(server,/local function inspectMeadowSurvival\(player,model,subject\)/);
  assert.match(server,/local function bindMeadowInspection\(model,subject\)/);
  assert.match(server,/prompt=Instance.new\("ProximityPrompt"\)/);
  assert.match(server,/prompt.Triggered:Connect\(function\(player\)/);
  assert.match(server,/meadowInspectReady\[player\]=now\+2\.5/);
  assert.match(server,/model:IsDescendantOf\(gameWorld\)/);
  assert.match(server,/rootPart.Position-model:GetPivot\(\).Position\).Magnitude>15/);
  // 네 입구에만 조사 프롬프트를 표시해 사분면 기록을 유지하고 중복 HUD를 막는다.
  assert.match(server,/if index==6 or index==12 or index==18 or index==24 then/);
  assert.match(server,/bindMeadowInspection\(tree,"WOODLAND"\)/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowNativeTrails",#tracks\+#trailSpurs\)/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowWoodlandScene","FOUR_GROVES_FOUR_REAL_TRAIL_SPURS"\)/);
  assert.match(server,/Vector3.new\(site.X,-7\.2,site.Z\)/);
  assert.match(server,/Vector3.new\(9,0,-8\),Vector3.new\(-9,0,-8\)/);
  assert.match(server,/bindMeadowInspection\(animal,spec\[1\]\)/);
  assert.match(server,/bindMeadowInspection\(model,spec.kind\)/);
  assert.match(server,/animal.escape=\(animal.escape or Vector3.zero\):Lerp\(escape,math.min\(1,dt\*3\)\)/);
  assert.match(server,/player:SetAttribute\("MeadowSurvivalHint",clue\)/);
  assert.match(server,/meadowInspectReady\[player\]=nil/);
  assert.match(client,/player:GetAttributeChangedSignal\("MeadowSurvivalHintSerial"\):Connect/);
  assert.match(client,/task.delay\(6,function\(\)/);
  assert.match(client,/meadowSurvivalHint.Active=false/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  assert.match(server,/local number=math.min\(3\+CurrentWave\*2, MAX_ENEMIES\)/);
});

// [숲 밀도·유적·흙길] 사용자 시안에 맞는 자연환경. 자산 등록·전투 판정·저장키는 그대로.
test('fantasy grove composition reuses licensed meshes and terrain without introducing procedural parts',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const assets=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8'));
  for(const id of ['tree','ruin']){
    assert.equal(assets.models[id].license,'CC0-1.0');
    assert.equal(assets.models[id].source,'VERIFIED_CC0_ORIGINAL');
  }
  assert.match(server,/local forestGroves=\{/);
  assert.match(server,/woodland\[#woodland\+1\]=\{x,z,11\+\(\(index\*7\+groveIndex\*3\)%9\)\}/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowForestCanopyCount",canopyCount\)/);
  assert.match(server,/local leafTones=\{/);
  // 낮/밤/비/안개와 동기화한 네이티브 숲 대기 효과만 사용한다.
  assert.match(server,/meadowAtmosphere=Lighting:FindFirstChildOfClass\("Atmosphere"\)/);
  assert.match(server,/meadowAtmosphere=Instance.new\("Atmosphere"\)/);
  assert.match(server,/forestAirDensity=weather=="FOG" and \.39/);
  assert.match(server,/meadowAtmosphere.Density\+=\(forestAirDensity-meadowAtmosphere.Density\)\*\.12/);
  assert.match(server,/meadowAtmosphere.Color=meadowAtmosphere.Color:Lerp\(/);
  assert.match(server,/surface.Color=surface.Color:Lerp\(leafTone,\.33\)/);
  assert.match(server,/surface.Material==Enum.Material.Fabric/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowForestFloorCount",forestFloorCount\)/);
  assert.match(server,/index%6==0 and Enum.Material.Ground or Enum.Material.LeafyGrass/);
  assert.match(server,/if distance>84 and math.abs\(x\)<330/);
  assert.match(server,/if index==6 or index==12 or index==18 or index==24 then/);
  assert.match(server,/for step=1,34 do/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowNativeTrails",#tracks\+#trailSpurs\)/);
  assert.match(server,/for step=-44,44 do/);
  assert.match(server,/local z=step\*3\.5/);
  assert.match(server,/local x=266\+8\*math.sin\(z\*\.029\)\+2\*math.cos\(z\*\.073\)/);
  assert.match(server,/meadowTerrain:FillBall\(bank,6,Enum.Material.Air\)/);
  assert.match(server,/meadowTerrain:FillBall\(Vector3.new\(x,-2\.8,z\),4\.5,Enum.Material.Water\)/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowForestStreamSections",streamLength\)/);
  // 개울의 지형을 조성한 뒤 원본 CC0 나무를 지면에 정렬한다. 3그루 단위로 시각 갱신.
  assert.ok(server.indexOf('local streamLength=0')<server.indexOf('local sceneryCount=0'));
  assert.ok(server.indexOf('meadowTerrain:FillBall(bank,6,Enum.Material.Air)')<server.indexOf('local sceneryCount=0'));
  assert.match(server,/if index%3==0 then task.wait\(\.06\) end/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowForestRockCount",forestRockCount\)/);
  assert.match(server,/local fragment=worldAsset\("ruin",site,4\.7\)/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowForestStoneFragmentCount",forestFragmentCount\)/);
  assert.match(server,/local trailSpurs=\{/);
  assert.match(server,/Meadow_Ruin_Outer_/);
  assert.match(server,/MeadowForestSoftToyMaterial/);
  assert.match(server,/while gameWorld:GetAttribute\("MeadowOuterRegionReady"\)~=true do task.wait\(\.1\) end/);
  assert.match(server,/gameWorld:SetAttribute\("MeadowRuinCount",ruinCount\)/);
  assert.match(server,/local number=math.min\(3\+CurrentWave\*2, MAX_ENEMIES\)/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1,'save semantics unchanged');
  assert.doesNotMatch(server,/Instance.new\("Part"\)|Instance.new\("Ball"\)|Instance.new\("Cylinder"\)/);
});

test('마력숲 타격은 부드러운 내장 둔탁음으로 교체하고 연속 재생량을 제한한다',()=>{
  const source=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  assert.match(source,/impact.SoundId="rbxasset:\/\/sounds\/action_jump_land\.mp3"/);
  assert.doesNotMatch(source,/impact.SoundId="rbxasset:\/\/sounds\/swordlunge\.wav"/);
  assert.match(source,/soundNow-lastSoftHitAt>=\.11/);
  assert.match(source,/impact.Volume=payload.finisher and \.26 or \(payload.boss and \.21 or \.16\)/);
  assert.match(source,/impact.RollOffMaxDistance=22/);
  const impact=source.slice(source.indexOf('local lastSoftHitAt=0'),source.indexOf('local hitFlash=Instance.new'));
  assert.doesNotMatch(impact,/if not combatVFX then return end/);
});

test('fantasy meadow binds six original CC0 creature rigs and prevents repeating death or hit motion',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const manifest=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/native-assets.json','utf8'));
  for(const species of ['wolf','bee','golem','deer','boar','rabbit']){
    assert.ok(manifest.models[species]?.sourceSha256,'verified CC0 original: '+species);
    assert.ok(client.includes('species~="'+species+'"'),'source-only species routing: '+species);
  }
  assert.match(client,/model:GetAttribute\("Species"\) or model:GetAttribute\("MeadowWildlife"\)/);
  assert.match(client,/GetAttributeChangedSignal\("MeadowWildlife"\):Once/);
  assert.match(client,/local motor=joint:IsA\("Motor6D"\) and joint.Part0 and joint.Part1/);
  assert.match(client,/local constraint=joint:IsA\("AnimationConstraint"\) and joint.Attachment0 and joint.Attachment1/);
  assert.match(client,/constraint and joint.Attachment1.WorldPosition/);
  assert.doesNotMatch(client,/\(joint:IsA\("Motor6D"\) or joint:IsA\("AnimationConstraint"\)\)\s*and joint.Part0/);
  assert.match(client,/joint:IsA\("Bone"\)/);
  assert.match(client,/if sourceChannels\[name\] and \(not joints\[name\] or constraint\) then/);
  assert.match(client,/FLKnee=true,FRKnee=true,BLKnee=true,BRKnee=true/);
  assert.match(client,/local actualRig=count>=2 and movingJoints==true/);
  assert.match(client,/UNRIGGED_SOURCE_MESH_NEEDS_ANIMATED_ASSET/);
  assert.match(client,/NativeCreatureRigMode/);
  assert.match(client,/NativeMobMotion/);
  assert.match(client,/meadowMobMotion.SampleProceduralActorMotion\(mode/);
  assert.match(client,/mode=="DEATH" and 1\.32 or mode=="ATTACK" and \.75/);
  assert.match(client,/repeating and \(row.phase%duration\)\/duration/);
  assert.match(client,/math.clamp\(\(os.clock\(\)-row.motionStartedAt\)\/duration,0,1\)/);
  assert.doesNotMatch(client,/Instance\.new\("Part"\)|Instance\.new\("Ball"\)|Instance\.new\("Cylinder"\)/);
});

test('fantasy original monsters keep server combat authority while true bones drive synced locomotion',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(client,/local bounds,size=model:GetBoundingBox\(\)/);
  assert.match(client,/raw:match\("\[\._%-\]l%d\*\$"\)/);
  assert.match(client,/NativeMobMotionStartedAt/);
  assert.match(client,/workspace:GetServerTimeNow\(\)-epoch/);
  assert.match(client,/profile=\{limbArc=footTravel and 1\.08 or 1\.3,footContact=1\.28,attackStrike=1\.22\}/);
  assert.match(server,/model:SetAttribute\("NativeMobMotionStartedAt",workspace:GetServerTimeNow\(\)\)/);
  assert.match(server,/enemy.model:SetAttribute\("NativeMobMotionStartedAt",workspace:GetServerTimeNow\(\)\)/);
  assert.match(server,/enemy\.visualPosition=previous:Lerp\(enemy\.position,alpha\)/);
  assert.match(server,/if enemyVisualElapsed>=1\/30 then/);
  assert.match(server,/if enemyUpdateElapsed>=\.12 then/);
  assert.match(server,/damage=\(isBoss and 20 or 6\)\+math\.floor\(CurrentWave\/2\)/);
  assert.match(server,/speed=isBoss and 4\.8 or 7\.5/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  for(const source of [client,server]){
    assert.doesNotMatch(source,/Instance\.new\("Part"\)/);
  }
});

// [마력숲 4족 보행/토이 재질] 원본 다리 관절·서버 판정·저장 보존.
test('fantasy quadrupeds synchronize diagonal foot contacts with travel and forest palette',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const motion=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  assert.match(client,/lastPosition=model:GetPivot\(\)\.Position,travel=0,groundSpeed=0/);
  assert.match(client,/row\.groundSpeed\+=\(rawSpeed-row\.groundSpeed\)/);
  assert.match(client,/if row\.groundSpeed<\.35 then mode="IDLE" end/);
  assert.match(client,/phase=\(row\.travel%stride\)\/stride/);
  assert.match(motion,/local legPhase=\(t\+offset\)%1/);
  assert.match(motion,/local airborne=locomotion and math\.sin/);
  assert.match(motion,/local planted=locomotion and math\.sin/);
  assert.match(server,/animal\.position=desired/);
  assert.match(server,/animal\.visualPosition=\(animal\.visualPosition or animal\.origin\):Lerp\(animal\.position,alpha\)/);
  assert.match(server,/enemy\.visualFacing=moved\.Unit/);
  assert.match(server,/NativeMobFacingYaw/);
  for(const color of ['grass','leafyGrass','ground','rock','bark','leaves','wolf','boar','deer','rabbit']){
    assert.ok(server.includes(color+'=Color3.fromRGB('),'missing matte forest color: '+color);
  }
  assert.match(server,/surface\.Material=bark and Enum\.Material\.Wood or Enum\.Material\.SmoothPlastic/);
  // 모션은 원본 스킨 관절의 4족 접지와 전방 물기만 조절한다.
  assert.match(client,/local quadrupedFootPhases=/);
  assert.match(client,/local wolfFourLegRig=species~="wolf"/);
  assert.match(client,/if row\.available\[key\.\."Knee"\] then row\.poses\[key\.\."Knee"\]/);
  assert.match(client,/row\.species=="wolf" and \(mode=="ANTICIPATION"/);
  assert.match(client,/if row\.available\.Head then row\.poses\.Head=/);
  // 원본 메시와 관절은 보존하고 스폰 복제본 본체의 구형 텍스처만 제거한다.
  assert.match(server,/surface\.Color=surface\.Color:Lerp\(bodyTint,\.78\)/);
  assert.match(server,/surface:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(server,/local smoothDetail=wing or partName:find\("eye",1,true\)/);
  assert.match(server,/surface\.Color=Color3\.fromRGB\(190,228,235\)/);
  // 미승인 PBR 생성 금지, 구형 Pebble·체크 본체 텍스처 제거 및 승인 전 Plastic 적용.
  assert.doesNotMatch(server,/Instance\.new\("MaterialVariant"\)|Instance\.new\("SurfaceAppearance"\)/);
  assert.match(server,/if wing then[\s\S]*?surface\.Material=Enum\.Material\.Glass/);
  assert.match(server,/elseif smoothDetail then[\s\S]*?surface\.Material=Enum\.Material\.SmoothPlastic/);
  assert.match(server,/surface\.Material=Enum\.Material\.Plastic/);
  assert.match(server,/if appearance then appearance:Destroy\(\) end/);
  assert.match(server,/if surface\.TextureID~="" then surface\.TextureID="" end/);
  assert.match(server,/surface\.MaterialVariant=""/);
  assert.match(server,/model:SetAttribute\("MeadowToyMaterial","PLASTIC_UNTIL_APPROVED_STUD_NORMAL_MAP"\)/);
  assert.doesNotMatch(server,/surface\.Material=Enum\.Material\.Pebble/);
  assert.match(server,/surface\.Color=animalTint/);
  assert.match(server,/surface\.Reflectance=0/);
  assert.doesNotMatch(server,/surface\.Material=wing and Enum\.Material\.Glass or bodyMaterial/);
  assert.match(server,/speed=isBoss and 4\.8 or 7\.5/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  for(const source of [client,server,motion]){
    assert.doesNotMatch(source,/Instance\.new\("Part"\)|Instance\.new\("Ball"\)|Instance\.new\("Cylinder"\)/);
  }
});

// [마력숲 공통 AI/시각 연출] 변경된 표현이 서버 권한과 전투 밸런스를 침범하지 않는다.
test('fantasy monster shared actions have restrained impacts stable targets and mobile pose LOD',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(server,/focusUserId=nil/);
  assert.match(server,/if focusPlayer and focusDistance<=range\+3 then/);
  assert.match(server,/enemy\.focusUserId=targetPlayer and targetPlayer\.UserId or nil/);
  assert.match(server,/local range=140/);
  assert.match(server,/local leashDistance=\(enemy\.position-enemy\.spawnPosition\)\.Magnitude/);
  assert.match(server,/radius=enemy\.kind=="wolf" and 5 or 3\.5/);
  assert.match(server,/local weight=enemy\.kind=="wolf" and \.55 or \.32/);
  assert.match(server,/enemy\.visualFacing=offset\.Unit/);
  assert.match(server,/facing=enemy\.visualFacing/);
  assert.match(client,/local function mobVfx\(pattern,where,stage,facing\)/);
  assert.match(client,/stage=="IMPACT" and \(charge and "SHAPE_BURST" or "IMPACT_FLASH"\)/);
  assert.match(client,/textureKey=\(wolf or skeleton\) and stage=="IMPACT" and "slash" or nil/);
  assert.match(client,/startDiameter=boss and \(pattern=="GOLEM_SHOCKWAVE" and 16\.8 or 10\.4\) or nil/);
  assert.match(client,/hideRing=pattern=="GOLEM_SLAM" or stage=="IMPACT" and not charge/);
  assert.match(client,/mobVfx\(payload\.pattern,payload\.position,"IMPACT",payload\.facing\)/);
  assert.match(client,/if mode=="IDLE" then/);
  assert.match(client,/elseif mode=="HIT" or mode=="DEATH" then/);
  assert.match(client,/row\.species~="wolf" and \(mode=="ANTICIPATION"/);
  assert.match(client,/row\.renderAccumulator\+=dt/);
  assert.match(client,/row\.controller\.Step\(row\.poses,poseDt\)/);
  assert.match(server,/local hitDamage=math\.floor\(enemy\.damage\/hitCount\)/);
  assert.match(server,/enemy\.windupUntil=now\+\(enemy\.isBoss and \.68 or/);
  assert.match(server,/speed=isBoss and 4\.8 or 7\.5/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  assert.doesNotMatch(client,/Instance\.new\("Part"\)|Instance\.new\("Ball"\)/);
});

// [마력숲 캐릭터 부활] 엔진 기본 타이머 이후의 실패만 복구하고 기존 프로필·전투 수치는 그대로 유지한다.
test('fantasy player death recovers only if original humanoid never auto-respawned',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(server,/local function bindSurvivalHealth\(player\)/);
  const lifecycle=server.slice(server.indexOf('local function bindSurvivalHealth('),server.indexOf('-- 데이터 읽기가 실패한 세션에서는'));
  assert.match(lifecycle,/humanoid\.Died:Connect\(function\(\)/);
  assert.match(lifecycle,/task\.delay\(Players\.RespawnTime\+1,function\(\)/);
  assert.match(lifecycle,/player\.Parent~=Players or player\.Character~=character or humanoid\.Health>0/);
  assert.match(lifecycle,/player:LoadCharacterAsync\(\)/);
  assert.match(lifecycle,/if not recovered then/);
  assert.match(lifecycle,/player\.CharacterAdded:Connect\(bindCharacter\)/);
  assert.match(server,/player\.RespawnLocation = nativeFoundationSpawn/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
  assert.doesNotMatch(lifecycle,/humanoid\.MaxHealth\s*=|humanoid\.Health\s*=/);
});

// Existing server/input authority must boot before slow CC0 asset imports.
test('fantasy native controls do not wait on asset import and source rigs can move',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(client,/local nativeFoundationRemote = ReplicatedStorage:FindFirstChild\("RuntimeFoundationReport"\)/);
  assert.match(client,/local endpoint=nativeFoundationRemote or ReplicatedStorage:WaitForChild\("RuntimeFoundationReport",12\)/);
  assert.match(client,/task.defer\(reportNativeFoundationReady\)/);
  assert.match(client,/meadowSkillDock.AnchorPoint=Vector2.new\(1,1\)/);
  // 모바일 전투: 실제 발차기·어퍼컷·막기가 기본 공격 주변의 반원에 배치된다.
  assert.match(client,/local meleeSkills=\{[\s\S]*?\{"meadow-unarmed-kick","발차기"[\s\S]*?\{"meadow-unarmed-uppercut","어퍼컷"[\s\S]*?\{"skill-meadow-guard","막기"/);
  assert.ok(client.includes('{"meadow-unarmed-kick","발차기"'));
  assert.ok(client.includes('{"meadow-unarmed-uppercut","어퍼컷"'));
  assert.ok(client.includes('local function layoutMeadowCombatUi()'));
  assert.match(client,/meadowSkillDock.Position=UDim2.new\(1,-\(landscape and \d+ or \d+\),1,-\(landscape and \d+ or \d+\)\)/);
  assert.ok(client.includes('SetCoreGuiEnabled(Enum.CoreGuiType.Health,false)'));
  assert.ok(client.includes('trackerTitle.Visible=false;trackerDetail.Visible=false'));
  assert.ok(client.includes('questTracker.Size=UDim2.fromOffset(48,48)'));
  assert.ok(client.includes('meadowHealthTrack.Size=UDim2.fromOffset(width,21)'));
  assert.ok(client.includes('meadowEnergy.Size=UDim2.fromOffset(width,21)'));
  assert.ok(client.includes('meadowEnergy.Position=UDim2.new(.5,0,0,top+25)'));
  assert.ok(client.includes('local radarTrailEndpoints={'));
  assert.ok(client.includes('{-51,-48,-177,-176},{58,-49,183,-177}'));
  assert.ok(client.includes('{-177,-176,-228,-219},{183,-177,231,-228}'));
  assert.ok(client.includes('for route=1,8 do'));
  assert.ok(client.includes('world:GetAttribute("MeadowNativeTrails") or 0)>=8'));
  assert.ok(client.includes('radarFieldCorner.CornerRadius=UDim.new(1,0)'));
  assert.match(client,/local mapDiameter=compactLandscape and \d+ or small and \d+ or \d+/);
  assert.ok(client.includes('world:GetAttribute("MeadowNativeTrails")'));
  assert.ok(client.includes('world:FindFirstChild("Meadow_Ruin_"..index)'));
  assert.ok(client.includes('meadowRadar.Position=UDim2.new(1,-8,0,8)'));
  assert.ok(!client.includes('meadowAttackIcon.ImageRectOffset='),'removed primary attack icon must stay removed');
  assert.ok(client.includes('local meadowEnergy=Instance.new("Frame")'));
  assert.ok(client.includes('local meadowEnergy=Instance.new("Frame")'));
  assert.ok(client.includes('meadowSkillCooldowns[index]=cooldown'));
  assert.ok(!client.includes('meadowPrimaryAttack.Activated:Connect(function()'),'default attack is on world tap, not another button');
  assert.ok(client.includes('activateMeadowAction(primaryCombatAction.Id)'));
  assert.ok(client.includes('local meadowRadar=Instance.new("Frame")'));
  assert.ok(client.includes('local meadowSkillCooldowns={}'));
  // Registered CC0 icons must match actual action roles; unknown spell artwork is never invented.
  const icons=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8')).interfaceIcons;
  assert.equal(icons.assetId,'102668066491590');
  assert.equal(icons.license,'CC0-1.0');
  assert.equal(icons.importVerified,true);
  assert.ok(client.includes('local meadowIconAtlas="rbxassetid://'+icons.assetId+'"'));
  assert.ok(client.includes('icon.ImageRectOffset=Vector2.new(skill[4]*64,0)'));
  assert.match(client,/if meadowIconAtlas~="" and skill\[4\](?:~=nil)? then/);
  assert.ok(client.includes('glyph.Name="SkillSymbol"'));
  // Item cards read existing server-authoritative values, without adding a saved schema.
  assert.ok(client.includes('inventoryGrid.Name="MeadowInventoryGrid"'));
  assert.ok(!client.includes('inventoryQuick.Name="MeadowInventoryQuick"'), 'left pocket shortcut must be removed');
  assert.ok(client.includes('meadowMenu.open(3)end'), 'journal shortcut remains');
  assert.ok(client.includes('pages=meadowPages'), 'inventory page remains inside original menu');
  for(const attr of ['Wood','Stone','ResearchRecords','Coins','WeaponTier']){
    assert.ok(client.includes('{"'+(attr==='Wood'?'나무':attr==='Stone'?'돌':attr==='ResearchRecords'?'연구 일지':attr==='Coins'?'재화':'강화 단계')+'","'+attr+'"'));
  }
  assert.ok(client.includes('inventoryCards[index].Text='));
  assert.ok(client.includes('character:FindFirstChildOfClass("Tool")'));
  // Minimap renders only real peer coordinates and already discovered server grove sectors.
  assert.ok(client.includes('radarField.Name="NearbyPlayers"'));
  assert.ok(client.includes('local discovered=player:GetAttribute("ExplorationGroves") or 0'));
  assert.ok(client.includes('bit32.band(discovered,point[3])~=0'));
  assert.ok(client.includes('local delta=peerRoot.Position-mainRoot.Position'));
  assert.ok(client.includes('radarCenter.Rotation=math.deg(math.atan2(facing.X,-facing.Z))'));
  assert.ok(client.includes('compact=true,hideButton=true,menuLeft=true'));
  assert.ok(client.includes('local scale=landscape and math.clamp(v.Y/460,.67,.88) or math.clamp(v.X/420,.75,.96)'));
  assert.ok(client.includes('for index,button in ipairs(meadowSkillButtons)do'));
  assert.match(client,/button.Position=UDim2.fromOffset\(math.floor\(/);
  assert.match(client,/button.Position=UDim2.fromOffset\(math.floor\(\(\d+\+\(index-1\)\*60\)\*scale\),math.floor\(\d+\*scale\)\)/);
  assert.ok(!client.includes('button.Text=locked and "맨손 전용"'),
    'retired combat cooldown redraw must not race the current semicircle button state');
  const dodge=server.slice(server.indexOf('local function applyMeadowMobHit('),server.indexOf('humanoid:TakeDamage(damage)'));
  assert.match(dodge,/params.RespectCanCollide=true/);
  assert.match(dodge,/ground.Normal.Y>=\.65/);
  assert.match(dodge,/ground.Material~=Enum.Material.Water/);
  assert.ok(dodge.indexOf('if safe then')<dodge.indexOf('character:PivotTo('));
  assert.ok(client.includes('button.Size=UDim2.fromOffset(size,size)'));
  assert.ok(client.includes('gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi)'));
  for(const id of ['meadow-unarmed-kick','meadow-unarmed-uppercut','skill-meadow-guard']){
    assert.ok(client.includes('{"'+id+'",'), 'real combat dock skill missing: '+id);
  }
  // 나머지 기존 스킬을 지우지 않고 원본 Config에서 메뉴로 접근 가능해야 한다.
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  for(const id of ['skill-meadow-heavy','skill-meadow-sweep','skill-meadow-focus']){
    assert.ok(config.includes('Id = "'+id+'"'), 'existing skill must remain in config: '+id);
    assert.ok(!client.includes('or action.Id=="'+id+'"'), 'unplaced skill must remain reachable in menu: '+id);
  }
  assert.ok(client.includes('{"skill-meadow-guard","막기"'));
  assert.ok(!client.includes('{"skill-meadow-dodge-left","좌회피"'),'dodge UI was intentionally removed');
  assert.ok(!client.includes('{"skill-meadow-dodge-right","우회피"'),'dodge UI was intentionally removed');
  assert.ok(client.includes('{"scope-coreloop-1-6ebe58f496","채집"'));
  assert.ok(client.includes('{"FL",0,0},{"FR",.5,.5},{"BL",.5,.5},{"BR",0,0}'));
  assert.match(client,/UserInputService.TouchTapInWorld:Connect\(function\(_,processedByUI\)/);
  assert.match(client,/if processedByUI or gui:GetAttribute\("GameMenuOpen"\)==true then return end/);
  assert.match(client,/CommonUI.AdaptActionMenu\(gui,root,list,title,status,(?:nil|meadowHealthTrack),multiplayerStatus,/);
  assert.match(client,/pages=meadowPages/);
  assert.ok(client.includes('hideButton=true'),
    'the default menu attack remains hidden; world-tap and main attack share the existing server action');
  const ui=fs.readFileSync('roblox-games/fantasy-survival/shared/RobloxCommonUI.luau','utf8');
  assert.match(ui,/if compact then/);
  assert.ok(ui.includes('if primary and primary.hideButton~=true then'));
  assert.ok(ui.includes('menu.Size=UDim2.fromOffset(56,46)'));
  assert.ok(ui.includes('local menuLeft=primary and primary.menuLeft==true'));
  assert.ok(ui.includes('menu.Position=UDim2.fromOffset(9,8)'));
  assert.ok(ui.includes('hud.Position=menuLeft and UDim2.fromOffset(74,8) or UDim2.fromOffset(9,8)'));
  assert.ok(ui.includes('menu.Position=UDim2.new(1,-12,0,12)'),
    'other compact games must retain their existing menu position');
  assert.match(client,/Instance.new\("Beam"\)/);
  assert.match(client,/beam.CurveSize0=style.name=="RISING_DRAGON"/);
  assert.doesNotMatch(client,/Instance.new\("Part"\)/);
  assert.match(server,/if wing then[\s\S]*?surface\.Material=Enum\.Material\.Glass/);
  assert.match(server,/elseif smoothDetail then[\s\S]*?surface\.Material=Enum\.Material\.SmoothPlastic/);
  assert.match(server,/model:PivotTo\(CFrame.lookAt\(pivot,pivot\+facing\)/);
  assert.match(client,/button.Activated:Connect\(function\(\)[\s\S]*?activateMeadowAction\(skill\[1\]\)/);
  assert.match(client,/local meadowMobMotion=combatMotionSource/);
  assert.match(server,/task.defer\(createResourceNodes\)/);
  assert.match(server,/task.delay\(4,function\(\)\s*for index,spec in ipairs\(\{/);
  assert.equal((server.match(/joint.Part1.Anchored=false/g)||[]).length,2);
  assert.equal((server.match(/joint.Part1.Massless=true/g)||[]).length,2);
  assert.match(server,/remote.OnServerEvent:Connect\(function\(player, actionId\)/);
  assert.match(client,/GetAttributeChangedSignal\("ApprovedCombatMotion"\):Connect/);
  assert.match(client,/GetAttributeChangedSignal\("ApprovedActionMotion"\):Connect/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
});

// Roblox Avatar Joint Upgrade (2026): verified engine uses AnimationConstraint for R15.
test('fantasy unarmed and meadow skills support AnimationConstraint and legacy Motor6D',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  const motion=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(client,/Shared:WaitForChild\("RobloxCommonMotion",12\)/);
  assert.match(motion,/joint:IsA\("Bone"\)or joint:IsA\("Motor6D"\)or joint:IsA\("AnimationConstraint"\)/);
  assert.match(client,/local nativeJoint=descendant:IsA\("AnimationConstraint"\) or descendant:IsA\("Motor6D"\)/);
  assert.match(client,/local nativeJoint=joint:IsA\("AnimationConstraint"\) or joint:IsA\("Motor6D"\)/);
  assert.match(client,/not joints\[descendant.Name\] or descendant:IsA\("AnimationConstraint"\)/);
  assert.match(client,/not skillMotionJoints\[joint.Name\] or joint:IsA\("AnimationConstraint"\)/);
  assert.match(client,/activeCombatController.Step\(combatR15Targets, dt\)/);
  assert.match(client,/skillMotionR15.Step\(skillMotionR15Targets,dt\)/);
  assert.match(server,/player:SetAttribute\("ApprovedCombatMotion",approved\)/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1,'save key and schema unchanged');
});

// 파일 구분: 마력숲 회피 모션 우선권·완벽 막기 연타 중단 회귀 검증.
test('마력숲 회피는 공격에 끊기지 않고 두 아바타의 실제 관절에 연결된다',()=>{
  const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  assert.match(client,/if os.clock\(\)<dodgePoseUntil then return false end/);
  assert.match(client,/if os.clock\(\)>=dodgePoseUntil then finishMeadowSkillPose\(\) end/);
  assert.match(client,/if isDodge then dodgePoseUntil=skillMotionDeadline end/);
  assert.ok(client.includes('skillMotionR15Targets.RootJoint=skillMotionTargets.Spine'));
  assert.ok(client.includes('skillMotionR15Targets["Left Hip"]=skillMotionTargets.ThighL'));
  assert.ok(client.includes('skillMotionR15Targets["Right Hip"]=skillMotionTargets.ThighR'));
  assert.match(client,/dodgePoseUntil=0\s*finishMeadowSkillPose\(\)/);
});

test('마력숲 완벽 막기는 공격자만 기절시키고 연타 총 피해와 저장 구조를 보존한다',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const hit=server.slice(server.indexOf('local function applyMeadowMobHit('),server.indexOf('local function updateEnemyAI('));
  assert.match(server,/defense.perfectGuardUntil=now\+\.28/);
  assert.match(hit,/defense.perfectGuardUntil=0/);
  assert.match(hit,/cancelEnemyWindup\(attacker\)/);
  assert.match(hit,/attacker.stunUntil=now\+\(attacker.isBoss and \.6 or 1\.2\)/);
  assert.match(hit,/setEnemyAttackState\(attacker,"STUNNED"\)/);
  assert.match(server,/enemy.comboHit=nil\s*setEnemyAttackState/);
  assert.match(server,/if now<\(enemy.stunUntil or 0\) then[\s\S]*?continue/);
  assert.match(server,/if \(enemy.stunUntil or 0\)>now then continue end/);
  assert.match(server,/applyMeadowMobHit\(targetPlayer,targetHuman,hitDamage,enemy\)/);
  assert.match(server,/applyMeadowMobHit\(victim,human,hitDamage,enemy\)/);
  assert.match(server,/hitDamage=enemy.damage-hitDamage\*\(hitCount-1\)/);
  assert.match(server,/enemy.windupUntil=now\+\.22/);
  assert.match(server,/meadowDefense\[player\]=nil/);
  assert.match(server,/GetDataStore\("fantasy-survival-development-v1"\)/);
  assert.equal((server.match(/store:UpdateAsync\("player:"/g)||[]).length,1);
});

// 마력숲 메뉴는 실제 상태와 기존 서버 액션만 사용하며 외부 아이콘 원본을 보존한다.
test('마력숲 모험 수첩은 캐릭터 인벤토리 저널 옵션 도우미를 실제 상태에 연결한다',()=>{
 const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
 const ui=fs.readFileSync('roblox-games/fantasy-survival/shared/RobloxCommonUI.luau','utf8');
 for(const name of ['캐릭터','인벤토리','저널','옵션','도우미'])assert.ok(client.includes('"'+name+'"'));
 assert.match(client,/meadowEffectsGroup.Volume/);
 assert.match(client,/impact.SoundGroup=meadowEffectsGroup/);
 assert.match(client,/forestBed.SoundGroup=meadowAmbienceGroup/);
 assert.match(client,/if #meadowJournal>24 then table.remove\(meadowJournal\) end/);
 assert.match(client,/activateMeadowAction\(row\[2\]\)/);
 assert.match(ui,/list.Visible=index==0/);
 assert.match(ui,/page.Visible=i==index/);
 assert.match(ui,/CreateFilterBar\(\{name="MeadowMenuTabs"/);
 assert.match(ui,/tabs.Size=UDim2.new\(1,-24,0,50\)/);
 assert.doesNotMatch(client,/DataStoreService|HttpService:GetAsync/);
});

test('마력숲 외부 아이콘 원본·파생 이미지 해시와 단일 게임 등록 경로를 검증한다',async()=>{
 const {createHash}=await import('node:crypto');
 const art=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8')).interfaceIcons;
 assert.equal(art.license,'CC0-1.0');assert.equal(art.sources.length,8);
 for(const row of [...art.sourceArchives,{path:art.path,sha256:art.sha256}])assert.equal(createHash('sha256').update(fs.readFileSync(row.path)).digest('hex'),row.sha256);
 const bytes=fs.readFileSync(art.path);assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),64);
 const importer=fs.readFileSync('tools/horror-combat-assets.mjs','utf8');
 assert.match(importer,/process.argv.includes\('--magic-ui-only'\)/);
 assert.match(importer,/MAGIC_UI_PERMISSION_FAILED/);
 assert.match(importer,/art.authorizedUniverseIds=\[art.universeId\]/);
 assert.equal(art.runtimeVerified,false);
});

test('마력숲 동료 의뢰와 인트로는 기존 메인·저장을 보존한다',()=>{
 const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
 const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
 const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
 assert.match(config,/CompanionQuestStage = 1, CompanionQuestProgress = 0/);
 assert.match(server,/stage>=request.UnlockMainStage and eventName==request.Event/);
 assert.match(server,/recordMeadowQuest\(player,"PARRY"\)/);
 const recorder=server.slice(server.indexOf('local function recordMeadowQuest('),server.indexOf('local function gatherResource('));
 assert.ok(recorder.indexOf('CompanionQuestStage')<recorder.indexOf('if not quest then return end'));
 assert.doesNotMatch(recorder,/awardProgress|Coins|XP/);
 assert.match(client,/info.Story or ""/);
 assert.match(client,/questTracker.Activated:Connect\(function\(\)meadowMenu.open\(3\)end\)/);
 assert.doesNotMatch(client,/local journalShade=/);
 assert.match(client,/task.delay\(bossScene and 1\.5 or 2\.5/);
 assert.match(client,/skip.Activated:Connect\(closeIntro\)/);
 assert.match(client,/PromptShown:Connect/);assert.match(client,/PromptHidden:Connect/);
 assert.match(client,/plate.AlwaysOnTop=false;plate.MaxDistance=55/);
 assert.match(server,/model:SetAttribute\("EnemyMaxHealth",hitPoints\)/);
});

test('마력숲 초원 수문장은 기존 골렘·5웨이브·보상을 보존하고 메인 퀘스트에 연결된다',()=>{
 const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
 const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
 assert.match(config,/Id="meadow-gatekeeper"/);
 assert.match(server,/recordMeadowQuest\(player,"BOSS_KILL"\)/);
 assert.match(server,/if eventName~="BOSS_KILL" then return end/);
 assert.match(server,/CurrentWave%5==0 and spawnEnemy\(true,number\+1\)/);
 assert.match(server,/enemy.HP<=enemy.maxHP\*\.5/);
 assert.match(server,/target.model:SetAttribute\("BossPhase",2\)/);
 assert.match(server,/id="golem",atom="HEAD_GOLEM",height=8\.4/);
 assert.match(server,/NativeMobMotionDuration/);
 assert.match(server,/awardProgress\(player,target.isBoss and 75 or 12,target.isBoss and 45 or 5\)/);
});

test('마력숲 숲 교체는 텍스처 내장 CC0 원본과 실제 늑대 스킨 관절을 사용한다',()=>{
 const manifest=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/native-assets.json','utf8'));
 for(const role of ['tree','ruin']){
  const source=manifest.models[role];const bytes=fs.readFileSync(source.sourcePath);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sourceSha256);
  const n=bytes.readUInt32LE(12);const glb=JSON.parse(bytes.subarray(20,20+n).toString());
  assert.ok(glb.meshes.length>0);assert.ok(glb.images.some(x=>Number.isInteger(x.bufferView)));
  assert.ok((glb.buffers||[]).every(x=>!x.uri));
 }
 const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
 assert.match(client,/bone014="FRHip",bone015="FRKnee",bone016="FRAnkle"/);
 assert.match(client,/bone017="FLHip",bone018="FLKnee",bone019="FLAnkle"/);
 assert.match(client,/wolfSourceChannels\[key\]/);
 assert.match(client,/lights<6/);
 assert.match(client,/ForestGroundMist/);
 const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
 assert.match(server,/setEnemyAttackState\(enemy,"PATROL"\)/);
 assert.match(server,/neighbor.kind==enemy.kind and neighbor.HP>0/);
 assert.match(server,/bit32.bor\(mask,bit32.lshift\(1,sector\)\)/);
 assert.match(server,/recordMeadowQuest\(player,"DAWN_TRACE"\)/);
 assert.match(server,/bindMeadowInspection\(ruin,"RUIN"\)/);
 assert.doesNotMatch(server,/Instance.new\("Part"\)/);
});

test('마력숲 원본 교체 등록은 기존 아이콘·입자 권한 원장을 보존한다',()=>{
 const uploader=fs.readFileSync('tools/baeksu-war-upload-meshes.mjs','utf8');
 assert.match(uploader,/JSON.stringify\(\{\.\.\.oldRegistry,version:2,gameId:'fantasy-survival'/);
});
