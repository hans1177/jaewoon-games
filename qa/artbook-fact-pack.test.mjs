import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const tool=path.join(process.cwd(),'tools','artbook-fact-pack.mjs');
function runPack({gameId='fixture',files}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-fact-pack-'));
  fs.writeFileSync(path.join(root,'artbook-submission-queue.json'),JSON.stringify({currentDailyTarget:gameId}));
  const game=path.join(root,'web-games',gameId);fs.mkdirSync(game,{recursive:true});
  for(const [name,content] of Object.entries(files))fs.writeFileSync(path.join(game,name),content);
  const before=Object.fromEntries(Object.keys(files).map(name=>[name,fs.readFileSync(path.join(game,name),'utf8')]));
  const run=spawnSync(process.execPath,[tool],{cwd:root,env:{...process.env,ARTBOOK_GAME_ID:gameId,ARTBOOK_DATE:'2026-09-10'},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const pack=JSON.parse(fs.readFileSync(path.join(root,'artbook-submissions',gameId,'2026-09-10','fact-pack.json'),'utf8'));
  for(const [name,content] of Object.entries(before))assert.equal(fs.readFileSync(path.join(game,name),'utf8'),content);
  return {root,pack,stdout:run.stdout};
}

test('fact pack extracts production evidence without changing game source',()=>{
  const {root,pack}=runPack({files:{'index.js':'const hp=10, damage=2, gold=0; function attack(){gold+=1} function save(){localStorage.setItem("save",gold)} addEventListener("touchstart",attack);'}});
  try{
    assert.equal(pack.paidApi,false);
    assert.equal(pack.sourceMode,'WEB_ARCHIVE_READ_ONLY');
    assert.ok(pack.topics.combat.length>0);
    assert.ok(pack.topics.persistence.length>0);
    assert.ok(pack.topics.input.length>0);
    assert.equal(pack.contracts.proposalsForbidden,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fact pack safely decodes gzip/base64 web payloads as evidence without executing them',()=>{
  const inner=`const filler='${'x'.repeat(500)}'; const crystalHp=120; const enemyDamage=9; const waveSize=6; const rewardGold=15; function save(){localStorage.setItem("crystal-defense-save",JSON.stringify({waveSize,rewardGold}))}`;
  const packed=gzipSync(Buffer.from(inner)).toString('base64');
  const html=`<!doctype html><script>const payload=atob('${packed}'); throw new Error('wrapper must never execute');</script>`;
  const {root,pack,stdout}=runPack({gameId:'packed-fixture',files:{'index.html':html}});
  try{
    assert.equal(pack.version,2);
    assert.equal(pack.decodedSources.length,1);
    assert.equal(pack.decodedSources[0].encoding,'gzip-base64');
    assert.ok(pack.topics.combat.some(x=>x.source.endsWith('#embedded-gzip-1')&&x.text.includes('crystalHp=120')));
    assert.ok(pack.topics.progression.some(x=>x.text.includes('rewardGold=15')));
    assert.ok(pack.topics.persistence.some(x=>x.text.includes('localStorage')));
    assert.ok(pack.topics.persistence.some(x=>Number(x.column)>220));
    assert.equal(pack.contracts.packedSourceDecodeBounded,true);
    assert.equal(pack.contracts.packedSourceExecuted,false);
    assert.match(stdout,/ARTBOOK_FACT_DECODED_SOURCES=1/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
