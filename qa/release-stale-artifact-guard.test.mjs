import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function cleanup(root){fs.rmSync(root,{recursive:true,force:true});}

const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-release-stale-'));
const releaseGame={id:'qa-release-fixture'};
fs.mkdirSync(path.join(sandbox,'tools'),{recursive:true});
for(const file of ['company-release-stale-artifact-guard.mjs','production-classification.mjs']){
  fs.copyFileSync(path.join('tools',file),path.join(sandbox,'tools',file));
}
writeJson(path.join(sandbox,'company-directive.json'),{
  production:{numericLabels:{RELEASE_CONFIRMED:1,DEVELOPMENT_CONFIRMED:2,DESIGN_ONLY:3}}
});
writeJson(path.join(sandbox,'game-catalog.json'),{
  games:[{
    id:releaseGame.id,
    name:'QA Release Fixture',
    productionClass:'RELEASE_CONFIRMED',
    homepageCategory:'release-confirmed',
    releasePublished:true
  }]
});
test.after(()=>cleanup(sandbox));

function runGuard(date){
  const result=spawnSync(process.execPath,['tools/company-release-stale-artifact-guard.mjs'],{
    cwd:sandbox,
    env:{...process.env,ARTBOOK_GAME_ID:releaseGame.id,ARTBOOK_DATE:date},
    encoding:'utf8'
  });
  assert.equal(result.status,0,`guard failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return result.stdout;
}

const fixtureRoot=date=>path.join(sandbox,'design',releaseGame.id,date);

test('non-ready release state archives stale final release artifacts instead of leaving them active',()=>{
  const date='2099-12-30';
  const root=fixtureRoot(date);
  cleanup(root);
  try{
    writeJson(path.join(root,'release-production-status.json'),{
      gameId:releaseGame.id,
      productionClass:'RELEASE_CONFIRMED',
      status:'WAITING',
      state:'WAITING_BUILD',
      currentSourceTreeSha:'new-source-tree'
    });
    writeJson(path.join(root,'release-baseline.json'),{
      gameId:releaseGame.id,
      status:'RELEASE_READY',
      baseline:'RELEASE_BASELINE',
      currentSourceTreeSha:'old-source-tree',
      currentBuild:{identity:'old-build'}
    });
    writeJson(path.join(root,'core-artbook.json'),{
      gameId:releaseGame.id,
      releaseBaseline:true,
      sourceTreeSha:'old-source-tree'
    });

    const stdout=runGuard(date);
    assert.match(stdout,/RELEASE_STALE_ARTIFACT_GUARD=ARCHIVED_2/);
    assert.equal(fs.existsSync(path.join(root,'release-baseline.json')),false);
    assert.equal(fs.existsSync(path.join(root,'core-artbook.json')),false);

    const historyRoot=path.join(root,'release-history');
    const entries=fs.readdirSync(historyRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory());
    assert.equal(entries.length,1);
    const archive=path.join(historyRoot,entries[0].name);
    assert.equal(fs.existsSync(path.join(archive,'release-baseline.json')),true);
    assert.equal(fs.existsSync(path.join(archive,'core-artbook.json')),true);
    const invalidation=JSON.parse(fs.readFileSync(path.join(archive,'invalidation.json'),'utf8'));
    assert.equal(invalidation.preservedAsHistory,true);
    assert.equal(invalidation.currentState,'WAITING_BUILD');
  }finally{
    cleanup(root);
  }
});

test('release ready state keeps only source-bound active release baseline and final artbook',()=>{
  const date='2099-12-31';
  const root=fixtureRoot(date);
  cleanup(root);
  try{
    writeJson(path.join(root,'release-production-status.json'),{
      gameId:releaseGame.id,
      productionClass:'RELEASE_CONFIRMED',
      status:'COMPLETE',
      state:'RELEASE_READY',
      currentSourceTreeSha:'current-source-tree'
    });
    writeJson(path.join(root,'release-baseline.json'),{
      gameId:releaseGame.id,
      status:'RELEASE_READY',
      baseline:'RELEASE_BASELINE',
      currentSourceTreeSha:'current-source-tree',
      currentBuild:{identity:'current-build'}
    });
    writeJson(path.join(root,'core-artbook.json'),{
      gameId:releaseGame.id,
      releaseBaseline:true,
      sourceTreeSha:'current-source-tree'
    });

    const stdout=runGuard(date);
    assert.match(stdout,/RELEASE_STALE_ARTIFACT_GUARD=READY_ACTIVE_ARTIFACTS_VALID/);
    assert.equal(fs.existsSync(path.join(root,'release-baseline.json')),true);
    assert.equal(fs.existsSync(path.join(root,'core-artbook.json')),true);
    assert.equal(fs.existsSync(path.join(root,'release-history')),false);
  }finally{
    cleanup(root);
  }
});
