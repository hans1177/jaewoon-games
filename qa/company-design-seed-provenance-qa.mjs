import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {designArtifactsMatchSeed,stampDesignSeedProvenance} from '../tools/company-design-seed-provenance.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-seed-provenance-'));
const gameId='qa-full-rebuild';
const date='2026-09-16';
const base=path.join(root,'design',gameId,date);
fs.mkdirSync(base,{recursive:true});
const seed={gameId,seedId:'OWNER-FULL-REBUILD-QA-20260916',ownerResetRevision:'OWNER-FULL-REBUILD-20260916-1'};
const write=(name,value)=>fs.writeFileSync(path.join(base,name),JSON.stringify(value,null,2)+'\n');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));

try{
  write('cycle-status.json',{gameId,gameSeed:{seedId:'OLD-SEED'},baselineGate:{state:'DESIGN_BASELINE_READY',ready:true}});
  write('design-revised.json',{gameId,gameSeedId:'OLD-SEED',content:{identity:'stale'}});
  let check=designArtifactsMatchSeed({root,gameId,date,seed});
  assert.equal(check.match,false);
  assert.equal(check.reason,'DESIGN_SEED_ID_MISMATCH');

  write('cycle-status.json',{gameId,gameSeed:{seedId:seed.seedId},baselineGate:{state:'DESIGN_BASELINE_READY',ready:true}});
  write('design-revised.json',{gameId,gameSeedId:seed.seedId,content:{identity:'current-id-old-revision'}});
  check=designArtifactsMatchSeed({root,gameId,date,seed});
  assert.equal(check.match,false);
  assert.equal(check.reason,'DESIGN_SEED_REVISION_MISMATCH');

  write('design-draft.json',{gameId,gameSeedId:seed.seedId,content:{identity:'draft'}});
  check=stampDesignSeedProvenance({root,gameId,date,seed});
  assert.equal(check.match,true);
  assert.equal(read('cycle-status.json').gameSeed.ownerResetRevision,seed.ownerResetRevision);
  assert.equal(read('design-revised.json').gameSeedRevision,seed.ownerResetRevision);
  assert.equal(read('design-draft.json').gameSeedRevision,seed.ownerResetRevision);

  write('cycle-status.json',{gameId,gameSeed:{seedId:'WRONG-SEED'}});
  write('design-revised.json',{gameId,gameSeedId:'WRONG-SEED',content:{}});
  assert.throws(()=>stampDesignSeedProvenance({root,gameId,date,seed}),/DESIGN_SEED_PROVENANCE_GENERATION_MISMATCH/);

  console.log('PASS design seed provenance reset cases');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
