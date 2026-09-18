// 파일명: qa/vibe2-auto-planner.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { latestDevelopmentBaselineEvidence, planVibe2AutonomousTask, planVibe2AutonomousTasks } from '../tools/vibe2-auto-planner.mjs';

function writeDevelopmentBaseline(root, gameId='demo', overrides={}) {
  const dir=path.join(root,'design',gameId,'2026-09-11');
  fs.mkdirSync(dir,{recursive:true});
  const gate={
    policyDocument:'COMPANY_FLOW.md',
    tier:2,
    state:'DEVELOPMENT_BASELINE_READY',
    ready:true,
    blockers:[],
    evidence:{
      webGameplay:{required:true,pass:true,source:`design/${gameId}/2026-09-11/web-gameplay-validation.json`},
      unityProject:{required:true,present:true,path:`unity-games/${gameId}`},
      unityTechnical:{required:true,pass:true,source:`design/${gameId}/2026-09-11/unity-technical-validation.json`}
    },
    ...overrides
  };
  fs.writeFileSync(path.join(dir,'cycle-status.json'),JSON.stringify({status:'COMPLETE',baselineGate:gate},null,2),'utf8');
}

function tempRepo() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-auto-plan-'));
  const scripts=path.join(root,'unity-games/demo/Assets/Scripts');
  fs.mkdirSync(scripts,{recursive:true});
  fs.writeFileSync(path.join(scripts,'GameCore.cs'),'var regions = new Dictionary<string, object> { ["field-4"] = new object() };\npublic List<string> ownedWeapons;\n','utf8');
  fs.writeFileSync(path.join(scripts,'RuntimeBootstrap.cs'),'if (GUILayout.Button("FIELD 1")) MoveTo("field-1");\n','utf8');
  fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'public void PlayTravelToBattle() { StartCoroutine(TravelRoutine()); }\n','utf8');
  for (const game of ['release-web','dev-web','third-web']) {
    fs.mkdirSync(path.join(root,`web-games/${game}`),{recursive:true});
    fs.writeFileSync(path.join(root,`web-games/${game}/index.js`),'// TODO: remove duplicate click handler\nfunction start() {}\n','utf8');
  }
  writeDevelopmentBaseline(root);
  return root;
}
const status={projects:[{gameId:'demo',ownerDecision:'PASS',target:'unity-android',projectPath:'unity-games/demo',progress:80}]};
const catalog={games:[
  {id:'demo',homepageCategory:'development-confirmed'},
  {id:'release-web',name:'Release Web',webPath:'/web-games/release-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'release-confirmed'},
  {id:'dev-web',name:'Dev Web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'},
  {id:'third-web',name:'Third Web',webPath:'/web-games/third-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
]};

test('active independent work no longer blocks autonomous planning when slots remain',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'existing',gameId:'existing',sourceRoot:'web-games/existing',status:'running',goal:'existing task',target:'web'}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.ok(result.count>=1);
  assert.equal(result.queue.tasks.filter(t=>['queued','running'].includes(t.status)).length<=4,true);
});

test('owner directive keeps priority while independent free slots continue refilling',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'owner',gameId:'demo',sourceRoot:'unity-games/demo',status:'running',goal:'owner',target:'unity',ownerDirective:true}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.reason,'WORK_PACKAGES_PLANNED_AROUND_OWNER_DIRECTIVES');
  assert.equal(result.ownerDirectiveActiveCount,1);
  assert.equal(result.tasks.every(task=>task.sourceRoot!=='unity-games/demo'),true);
});

test('DEVELOPMENT_CONFIRMED Web enters Vibe planning before homepage publication and may bootstrap a missing root',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status:{projects:[]},
    catalog:{games:[{id:'new-web',name:'New Web',webPath:'/web-games/new-web/',hasWebArchive:true,homepageWebPlayable:false,productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'new-web');
  assert.equal(result.task.target,'web');
  assert.equal(result.task.ownerDirective,true);
  assert.match(result.task.goal,/WEB_BASE_IMPLEMENTATION/);
  assert.match(result.task.goal,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.ok(result.task.evidence.includes('central-policy:company-learning/platform-release-roadmap.json'));
  assert.ok(result.task.evidence.includes('web-stage:WEB_BASE_IMPLEMENTATION'));
});

test('planner fills independent development web source roots in one pass',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.ok(result.count>=2);
  assert.equal(result.tasks.every(t=>t.releaseState==='development-confirmed'&&t.target==='web'),true);
  assert.equal(result.tasks.every(t=>Boolean(t.packageId)&&t.packageWorkUnits>=3),true);
  assert.ok(result.workloadTelemetry.plannedPackageCount>=1);
  assert.equal(result.cycleTarget.quantityTargetMet,true);
});

test('release-confirmed web archive is never an autonomous feature target',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.equal(result.tasks.some(t=>t.gameId==='release-web'),false);
});

test('release-confirmed Unity is selected only with explicit Development Baseline evidence',()=>{
  const root=tempRepo();
  const releaseCatalog={games:[
    {id:'demo',homepageCategory:'release-confirmed'},
    {id:'release-web',webPath:'/web-games/release-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'release-confirmed'}
  ]};
  const evidence=latestDevelopmentBaselineEvidence('demo',root);
  assert.equal(evidence.ready,true);
  const result=planVibe2AutonomousTask({status,catalog:releaseCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.equal(result.task.id,'demo-region-controls-4-7');
  assert.equal(result.task.target,'unity');
  assert.equal(result.task.releaseState,'release-confirmed');
  assert.equal(result.task.evidence.some(x=>x.startsWith('development-baseline:design/demo/')),true);
});

test('release-confirmed Unity cannot enter Tier1 without Development Baseline PASS',()=>{
  const root=tempRepo();
  fs.rmSync(path.join(root,'design','demo'),{recursive:true,force:true});
  const releaseCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const result=planVibe2AutonomousTask({status,catalog:releaseCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BASELINE_REQUIRED');
  assert.deepEqual(result.blockedTier1GameIds,['demo']);
});

test('partial or forged-looking Development Baseline evidence cannot unlock Tier1',()=>{
  const root=tempRepo();
  writeDevelopmentBaseline(root,'demo',{
    evidence:{
      webGameplay:{required:true,pass:true},
      unityProject:{required:true,present:true,path:'unity-games/demo'},
      unityTechnical:{required:true,pass:false}
    }
  });
  assert.equal(latestDevelopmentBaselineEvidence('demo',root).ready,false);
  const result=planVibe2AutonomousTask({status,catalog:{games:[{id:'demo',homepageCategory:'release-confirmed'}]},queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BASELINE_REQUIRED');
});

test('development-confirmed Unity is not autonomous source development before promotion',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status,
    catalog:{games:[{id:'demo',homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('planner never selects Unity project without owner PASS',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status:{projects:[{gameId:'demo',ownerDecision:'WAIT',target:'unity-android',projectPath:'unity-games/demo'}]},
    catalog:{games:[{id:'demo',homepageCategory:'release-confirmed'}]},queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('active source root is skipped while another project can be planned',()=>{
  const root=tempRepo();
  const mixedCatalog={games:[
    {id:'demo',homepageCategory:'release-confirmed'},
    {id:'dev-web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
  ]};
  const result=planVibe2AutonomousTasks({
    status,catalog:mixedCatalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'demo-active',gameId:'demo',sourceRoot:'unity-games/demo',target:'unity',goal:'active',releaseState:'release-confirmed',status:'running'}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.tasks.some(t=>t.gameId==='demo'),false);
  assert.equal(result.tasks.some(t=>t.gameId==='dev-web'),true);
});

test('development web without TODO uses deterministic diagnostics as task feeder',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/diag-web');
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Diag</title></head><body><button>Play</button></body></html>\n','utf8');
  const result=planVibe2AutonomousTask({
    status:{projects:[]},
    catalog:{games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'diag-web');
  assert.match(result.task.id,/diagnostic-bundle/);
  assert.deepEqual([...result.task.responsibleFiles],['web-games/diag-web/index.html']);
  assert.equal(result.task.evidence.includes('diagnostic:MISSING_VIEWPORT'),true);
  assert.equal(result.task.packageWorkUnits>=3,true);
  assert.equal(result.task.completionCriteria.includes('full-core-regression-once-at-fan-in'),true);
  assert.equal(result.task.evidence.includes('repair-mode:RULE_PATCH'),true);
});

test('planner groups real disjoint related candidates into one work package',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/dev-web');
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Dev</title></head><body><button>Play</button></body></html>\n','utf8');
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:'dev-web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.packages.length,1);
  assert.equal(result.packages[0].tasks.length,2);
  assert.equal(new Set(result.packages[0].tasks.map(task=>task.packageId)).size,1);
  const responsible=result.packages[0].tasks.map(task=>[...task.responsibleFiles]);
  assert.equal(responsible[0].some(file=>responsible[1].includes(file)),false);
});

test('completed diagnostic package is never recreated after completion',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/diag-web');
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Diag</title></head><body><button>Play</button></body></html>','utf8');
  const diagCatalog={games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]};
  const first=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  const firstKeys=first.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
  assert.equal(firstKeys.length>0,true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
    const secondKeys=second.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
    assert.equal(secondKeys.some(x=>firstKeys.includes(x)),false);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
  }
});

test('completed Unity package is never recreated after completion and tiny seed uses explicit expansion scopes',()=>{
  const root=tempRepo();
  const unityOnlyCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  assert.equal(first.task.evidence.filter(value=>value.startsWith('work-package-scope:')).length>=3,true);
  assert.equal(first.task.packageWorkUnits>first.task.taskWorkUnits,true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
  }
});
