import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const repoRoot=process.cwd();
const tool=path.join(repoRoot,'tools','artbook-fact-pack.mjs');
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
    assert.ok(pack.topics.combat.length>=3);
    assert.ok(new Set(pack.topics.combat.map(x=>x.column)).size>=3);
    assert.ok(pack.topics.persistence.length>0);
    assert.ok(pack.topics.input.length>0);
    assert.equal(pack.contracts.proposalsForbidden,true);
    assert.equal(pack.contracts.multipleMatchesPerLine,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fact pack safely decodes gzip/base64 web payloads as evidence without executing them',()=>{
  const inner=`const filler='${'x'.repeat(500)}'; const crystalHp=120; const enemyDamage=9; const waveSize=6; const rewardGold=15; function save(){localStorage.setItem("crystal-defense-save",JSON.stringify({waveSize,rewardGold}))}`;
  const packed=gzipSync(Buffer.from(inner)).toString('base64');
  const html=`<!doctype html><script>const payload=atob('${packed}'); throw new Error('wrapper must never execute');</script>`;
  const {root,pack,stdout}=runPack({gameId:'packed-fixture',files:{'index.html':html}});
  try{
    assert.equal(pack.version,3);
    assert.equal(pack.decodedSources.length,1);
    assert.equal(pack.decodedSources[0].encoding,'gzip-base64');
    assert.ok(pack.topics.combat.some(x=>x.source.endsWith('#embedded-gzip-1')&&x.text.includes('crystalHp=120')));
    assert.ok(pack.topics.combat.filter(x=>x.source.endsWith('#embedded-gzip-1')).length>=3);
    assert.ok(pack.topics.progression.some(x=>x.text.includes('rewardGold=15')));
    assert.ok(pack.topics.persistence.some(x=>x.text.includes('localStorage')));
    assert.ok(pack.topics.persistence.some(x=>Number(x.column)>220));
    assert.equal(pack.contracts.packedSourceDecodeBounded,true);
    assert.equal(pack.contracts.packedSourceExecuted,false);
    assert.equal(pack.contracts.packedLiteralMasked,true);
    assert.equal(pack.contracts.persistenceRequiresStorageEvidence,true);
    assert.equal(pack.contracts.multipleMatchesPerLine,true);
    assert.match(stdout,/ARTBOOK_FACT_DECODED_SOURCES=1/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('canvas save/restore alone is not persistence evidence',()=>{
  const inner='function draw(ctx){ctx.save();ctx.translate(2,3);ctx.restore()}';
  const packed=gzipSync(Buffer.from(inner)).toString('base64');
  const {root,pack}=runPack({gameId:'canvas-only',files:{'index.html':`<script>atob('${packed}')</script>`}});
  try{
    assert.equal(pack.topics.persistence.length,0);
    assert.ok(pack.missingEvidence.includes('persistence'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fact pack decodes the real crystal-defense archive into usable evidence',()=>{
  const sourcePath=path.join(repoRoot,'web-games','crystal-defense','index.html');
  assert.ok(fs.existsSync(sourcePath),'crystal-defense archive missing');
  const {root,pack}=runPack({gameId:'crystal-defense',files:{'index.html':fs.readFileSync(sourcePath,'utf8')}});
  try{
    assert.ok(pack.decodedSources.length>0,'real crystal-defense packed payload was not decoded');
    assert.ok(pack.topics.combat.some(x=>x.source.includes('#embedded-gzip-')),'real combat evidence missing from decoded source');
    assert.ok(pack.topics.progression.some(x=>x.source.includes('#embedded-gzip-')),'real progression evidence missing from decoded source');
    for(const topic of ['combat','progression'])assert.ok(pack.topics[topic].every(x=>x.source.includes('#embedded-gzip-')),`${topic} must not come from masked packed text`);
    const summary={decodedSources:pack.decodedSources.length,missingEvidence:pack.missingEvidence,combat:pack.topics.combat.slice(0,12),progression:pack.topics.progression.slice(0,12),persistence:pack.topics.persistence.slice(0,6)};
    console.log(`CRYSTAL_DEFENSE_FACT_EVIDENCE=${JSON.stringify(summary)}`);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
