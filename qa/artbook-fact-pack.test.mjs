import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const tool=path.join(process.cwd(),'tools','artbook-fact-pack.mjs');
test('fact pack extracts production evidence without changing game source',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artbook-fact-pack-'));
  try{
    fs.writeFileSync(path.join(root,'artbook-submission-queue.json'),JSON.stringify({currentDailyTarget:'fixture'}));
    const game=path.join(root,'web-games','fixture');fs.mkdirSync(game,{recursive:true});
    const source='const hp=10, damage=2, gold=0; function attack(){gold+=1} function save(){localStorage.setItem("save",gold)} addEventListener("touchstart",attack);';
    fs.writeFileSync(path.join(game,'index.js'),source);
    const before=fs.readFileSync(path.join(game,'index.js'),'utf8');
    const run=spawnSync(process.execPath,[tool],{cwd:root,env:{...process.env,ARTBOOK_GAME_ID:'fixture',ARTBOOK_DATE:'2026-09-10'},encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const pack=JSON.parse(fs.readFileSync(path.join(root,'artbook-submissions','fixture','2026-09-10','fact-pack.json'),'utf8'));
    assert.equal(pack.paidApi,false);
    assert.equal(pack.sourceMode,'WEB_ARCHIVE_READ_ONLY');
    assert.ok(pack.topics.combat.length>0);
    assert.ok(pack.topics.persistence.length>0);
    assert.ok(pack.topics.input.length>0);
    assert.equal(pack.contracts.proposalsForbidden,true);
    assert.equal(fs.readFileSync(path.join(game,'index.js'),'utf8'),before);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
