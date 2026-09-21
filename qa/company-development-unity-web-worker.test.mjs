// 파일명: qa/company-development-unity-web-worker.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const worker=path.join(root,'tools','company-development-unity-web-worker.mjs');
const run=(args,cwd=root)=>execFileSync(process.execPath,[worker,...args],{cwd,encoding:'utf8'});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'unity-web-worker-'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

test('missing canonical Unity source requests Vibe bootstrap instead of legacy HTML fallback',()=>{
  const dir=temp();
  try{
    const baseline=path.join(dir,'design-revised.json');
    const output=path.join(dir,'prepare.json');
    fs.writeFileSync(baseline,'{"version":1}\n');
    run(['prepare','--game-id=missing-unity-web','--source-root=unity-games/missing-unity-web',`--baseline=${baseline}`,`--output=${output}`]);
    const report=JSON.parse(fs.readFileSync(output,'utf8'));
    assert.equal(report.ready,false);
    assert.equal(report.reason,'UNITY_WEB_CANONICAL_SOURCE_MISSING');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('complete Unity Web child evidence produces public build and first-stage pass',()=>{
  const dir=temp();
  try{
    const gameId='worker-pass-game';
    const baseline=path.join(dir,'design-revised.json');
    const child=path.join(dir,'child');
    const artifact=path.join(child,'artifact');
    const web=path.join(artifact,'web-games',gameId);
    const output=path.join(dir,'out');
    fs.mkdirSync(web,{recursive:true});
    fs.writeFileSync(baseline,'{"version":1,"game":"worker-pass-game"}\n');
    fs.writeFileSync(path.join(web,'index.html'),'<!doctype html><canvas></canvas>\n');
    writeJson(path.join(web,'unity-web-build.json'),{version:1,engine:'UNITY_WEB',gameId,bootSmoke:'PASS',sourceCommit:'abc'});
    writeJson(path.join(web,'unity-web-gameplay-validation.json'),{
      version:1,engine:'UNITY_WEB',gameId,pass:true,
      boot:{pass:true},input:{pass:true},gameplay:{pass:true},coreFun:{pass:true},
      mobile:{pass:true},performance:{pass:true},noCriticalRuntimeError:true
    });
    run([
      'result',`--game-id=${gameId}`,`--source-root=unity-games/${gameId}`,
      `--baseline=${baseline}`,'--baseline-source=design/worker-pass-game/2026-09-21/design-revised.json',
      '--source-tree=tree123','--build-run-id=123',`--child-root=${child}`,`--output-root=${output}`
    ]);
    const result=JSON.parse(fs.readFileSync(path.join(output,'results',gameId+'.json'),'utf8'));
    assert.equal(result.pass,true);
    assert.equal(result.update.unityWebFirstStagePassed,true);
    assert.equal(result.update.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.ok(fs.existsSync(path.join(output,'public','web-games',gameId,'index.html')));
    assert.ok(fs.existsSync(path.join(output,'persist','design',gameId,'2026-09-21','unity-web-first-stage-validation.json')));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('incomplete Unity Web gate fails closed and does not publish build',()=>{
  const dir=temp();
  try{
    const gameId='worker-fail-game';
    const baseline=path.join(dir,'design-revised.json');
    const child=path.join(dir,'child');
    const artifact=path.join(child,'artifact');
    const web=path.join(artifact,'web-games',gameId);
    const output=path.join(dir,'out');
    fs.mkdirSync(web,{recursive:true});
    fs.writeFileSync(baseline,'{"version":1}\n');
    fs.writeFileSync(path.join(web,'index.html'),'<!doctype html><canvas></canvas>\n');
    writeJson(path.join(web,'unity-web-build.json'),{version:1,engine:'UNITY_WEB',gameId,bootSmoke:'PASS'});
    writeJson(path.join(web,'unity-web-gameplay-validation.json'),{
      version:1,engine:'UNITY_WEB',gameId,pass:false,
      boot:{pass:true},input:{pass:true},gameplay:{pass:true},coreFun:{pass:false},
      mobile:{pass:true},performance:{pass:true},noCriticalRuntimeError:true
    });
    run([
      'result',`--game-id=${gameId}`,`--source-root=unity-games/${gameId}`,
      `--baseline=${baseline}`,'--baseline-source=design/worker-fail-game/2026-09-21/design-revised.json',
      '--source-tree=tree999','--build-run-id=999',`--child-root=${child}`,`--output-root=${output}`
    ]);
    const result=JSON.parse(fs.readFileSync(path.join(output,'results',gameId+'.json'),'utf8'));
    assert.equal(result.pass,false);
    assert.equal(result.update.canonicalState,'WEB_VIBE_REPAIR_REQUIRED');
    assert.match(result.update.vibeWebImplementationReason,/coreFun/);
    assert.equal(fs.existsSync(path.join(output,'public','web-games',gameId)),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
