import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planVibe2AutonomousTask, planVibe2AutonomousTasks } from '../tools/vibe2-auto-planner.mjs';

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

test('owner directive prevents autonomous invention even when slots are free',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'owner',gameId:'demo',sourceRoot:'unity-games/demo',status:'running',goal:'owner',target:'unity',ownerDirective:true}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'OWNER_DIRECTIVE_ACTIVE');
});

test('planner fills several independent source-root shards in one pass',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.ok(result.count>=3);
  assert.equal(new Set(result.tasks.map(t=>t.sourceRoot)).size,result.tasks.length);
});

test('release-confirmed work still leads the planned batch',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'release-web');
  assert.equal(result.task.releaseState,'release-confirmed');
});

test('same release tier prefers existing Unity over existing web',()=>{
  const root=tempRepo();
  const sameTier={games:[
    {id:'demo',homepageCategory:'development-confirmed'},
    {id:'release-web',webPath:'/web-games/release-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
  ]};
  const result=planVibe2AutonomousTask({status,catalog:sameTier,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:1});
  assert.equal(result.planned,true);
  assert.equal(result.task.id,'demo-region-controls-4-7');
  assert.equal(result.task.target,'unity');
});

test('planner never selects Unity project without owner PASS',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status:{projects:[{gameId:'demo',ownerDecision:'WAIT',target:'unity-android',projectPath:'unity-games/demo'}]},
    catalog:{games:[{id:'demo',homepageCategory:'development-confirmed'}]},queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('active source root is skipped while another project can be planned',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'demo-active',gameId:'demo',sourceRoot:'unity-games/demo',target:'unity',goal:'active',status:'running'}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.tasks.some(t=>t.gameId==='demo'),false);
  assert.equal(result.tasks.some(t=>t.target==='web'),true);
});

test('completed task is not recreated and planner moves to next Unity maintenance need',()=>{
  const root=tempRepo();
  const unityOnlyCatalog={games:[{id:'demo',homepageCategory:'development-confirmed'}]};
  const result=planVibe2AutonomousTask({
    status,catalog:unityOnlyCatalog,
    queue:{tasks:[{id:'demo-region-controls-4-7',gameId:'demo',target:'unity',sourceRoot:'unity-games/demo',goal:'done',priority:'high',releaseState:'development-confirmed',status:'done',retries:0,maxRetries:2}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.id,'demo-save-null-guards');
});
