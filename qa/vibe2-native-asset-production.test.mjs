import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {findPresentationQualityTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';

function tempRoot(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-native-assets-'));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    version:207,
    authority:'OWNER_DIRECT_LOCKED',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    assetProductionParallelContract:{enabled:true,firstAdoption:{gameId:'fantasy-survival'}}
  },null,2));
  return root;
}

test('asset production planner exposes native source authoring for Unity and Roblox',()=>{
  const base={
    task:{gameId:'fantasy-survival',goal:'플레이어 캐릭터 적 몬스터 숲 나무 바위 UI 이펙트 애니메이션 그래픽 개선'},
    manifest:{version:1,assets:[]},
    presetCatalog:{version:1,presets:[]}
  };
  const unity=buildVibeAssetProductionPlan({...base,target:'unity'});
  const roblox=buildVibeAssetProductionPlan({...base,target:'roblox'});
  assert.equal(unity.capabilities.canChooseDirectAuthoring,true);
  assert.equal(roblox.capabilities.canChooseDirectAuthoring,true);
  assert.ok(unity.decisions.some(row=>row.directAuthoring.includes('csharp-procedural-mesh-and-low-poly-model')));
  assert.ok(roblox.decisions.some(row=>row.directAuthoring.includes('luau-composed-low-poly-model')));
  assert.equal(unity.policy.nativeProceduralAuthoringMustBeFinalQualityNotPrimitivePlaceholder,true);
  assert.equal(roblox.policy.composedLowPolyRequiresMultipleMeaningfulPartsAndStyleLock,true);
});

test('native presentation tasks target real Unity and Roblox presentation source',()=>{
  const root=tempRoot();
  try{
    const unityRoot=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(unityRoot,{recursive:true});
    fs.writeFileSync(path.join(unityRoot,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals : MonoBehaviour { void Update(){} }\n');
    const robloxRoot=path.join(root,'roblox-games','fantasy-survival','client');
    fs.mkdirSync(robloxRoot,{recursive:true});
    fs.writeFileSync(path.join(robloxRoot,'Game.client.luau'),'local RunService = game:GetService("RunService")\nRunService.RenderStepped:Connect(function() end)\n');

    const unity=findPresentationQualityTask({
      gameId:'fantasy-survival',name:'마력숲 생존기',engine:'unity',
      releaseState:'development-confirmed',projectPath:'unity-games/fantasy-survival'
    },root,{tasks:[]});
    const roblox=findPresentationQualityTask({
      gameId:'fantasy-survival',name:'마력숲 생존기',engine:'roblox',
      releaseState:'development-confirmed',projectPath:'roblox-games/fantasy-survival'
    },root,{tasks:[]});

    assert.equal(unity.id,'fantasy-survival-unity-presentation-asset-adaptation-v1');
    assert.deepEqual(unity.responsibleFiles,['unity-games/fantasy-survival/Assets/Scripts/PrototypeAnimatedVisuals.cs']);
    assert.ok(unity.evidence.includes('asset-production-parallel:v1'));
    assert.equal(unity.assetProductionLane,true);

    assert.equal(roblox.id,'fantasy-survival-roblox-presentation-asset-adaptation-v1');
    assert.deepEqual(roblox.responsibleFiles,['roblox-games/fantasy-survival/client/Game.client.luau']);
    assert.ok(roblox.evidence.includes('graphics-pass-real-asset-binding-runtime-required'));
    assert.equal(roblox.assetProductionLane,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('development-confirmed Unity source is now eligible for autonomous Wave asset work',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals : MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[]},
      catalog:{games:[{
        id:'fantasy-survival',name:'마력숲 생존기',productionClass:'DEVELOPMENT_CONFIRMED',
        lifecycleState:'ACTIVE',canonical:{sources:{unity:{projectPath:'unity-games/fantasy-survival'}}}
      }]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,
      maxConcurrentTasks:4
    });
    assert.equal(result.planned,true);
    const task=result.tasks.find(row=>row.id==='fantasy-survival-unity-presentation-asset-adaptation-v1');
    assert.ok(task);
    assert.equal(task.target,'unity');
    assert.equal(task.priority,'owner-immediate');
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
