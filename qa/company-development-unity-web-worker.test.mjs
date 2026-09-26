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
const writeBundle=(web,gameId)=>{
  const build=path.join(web,'Build');fs.mkdirSync(build,{recursive:true});
  fs.writeFileSync(path.join(build,`${gameId}.loader.js`),'loader');
  fs.writeFileSync(path.join(build,`${gameId}.data`),'data');
  fs.writeFileSync(path.join(build,`${gameId}.framework.js`),'framework');
  fs.writeFileSync(path.join(build,`${gameId}.wasm`),'wasm');
};

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

test('complete Unity Web child evidence produces lane-local compatibility evidence without owning native admission',()=>{
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
    writeBundle(web,gameId);
    writeJson(path.join(web,'unity-web-build.json'),{version:1,engine:'UNITY_WEB',gameId,bootSmoke:'PASS',sourceCommit:'abc'});
    writeJson(path.join(web,'unity-web-gameplay-validation.json'),{
      version:1,engine:'UNITY_WEB',gameId,pass:true,
      boot:{pass:true},
      input:{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT_AND_REAL_BROWSER_TOUCH',mobileInputObserved:true},
      gameplay:{pass:true,gameplayStartObserved:true,coreActionObserved:true,progressObserved:true,safeReturnOrResetObserved:true},
      coreFun:{pass:true,markerCount:1,markers:[`JAEWOON_UNITY_WEB_QA CORE_FUN game=${gameId} status=PASS`]},
      saveRestore:{pass:true,persistentChangedKeys:['progress'],restoredKeys:['progress']},
      mobile:{pass:true,actualBrowserTouchDispatched:true,realGameTouchHandlerObserved:true,target:{role:'action',x:0.5,y:0.7}},
      performance:{pass:true},
      noCriticalRuntimeError:true,
      markers:[
        `JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=${gameId} role=action x=0.5000 y=0.7000`,
        `JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=${gameId} role=action status=PASS`,
        `JAEWOON_UNITY_WEB_QA CORE_FUN game=${gameId} status=PASS`
      ]
    });
    run([
      'result',`--game-id=${gameId}`,`--source-root=unity-games/${gameId}`,
      `--baseline=${baseline}`,'--baseline-source=design/worker-pass-game/2026-09-21/design-revised.json',
      '--source-tree=tree123','--build-run-id=123',`--child-root=${child}`,`--output-root=${output}`
    ]);
    const result=JSON.parse(fs.readFileSync(path.join(output,'results',gameId+'.json'),'utf8'));
    assert.equal(result.pass,true);
    assert.equal(result.update.unityWebValidationSurfacePassed,true);
    assert.equal(result.update.unityWebTestAvailable,true);
    assert.equal(result.update.unityWebTestUrl,`/web-games/${gameId}/`);
    assert.equal(result.update.webValidationRequired,false);
    const evidence=JSON.parse(fs.readFileSync(path.join(output,'persist','design',gameId,'2026-09-21','unity-web-validation-surface.json'),'utf8'));
    assert.equal(evidence.validationSurfaceOnly,false);
    assert.equal(evidence.compatibilityEvidenceOnly,true);
    assert.equal(evidence.nativeGateAuthority,false);
    assert.equal(evidence.developmentAdmissionAuthority,false);
    assert.equal(evidence.upperPlatformReadinessRequired,false);
    assert.equal(evidence.nativeDevelopmentAlreadyIndependent,true);
    assert.equal(evidence.releaseAuthority,false);
    assert.equal(result.update.currentStep,undefined);
    assert.equal(result.update.canonicalState,undefined);
    assert.equal(result.update.routingBlockers,undefined);
    assert.ok(fs.existsSync(path.join(output,'public','web-games',gameId,'index.html')));
    assert.ok(fs.existsSync(path.join(output,'persist','design',gameId,'2026-09-21','unity-web-validation-surface.json')));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('index-only Unity Web child output is rejected as undeployable',()=>{
  const dir=temp();
  try{
    const gameId='worker-index-only-game';
    const baseline=path.join(dir,'design-revised.json');
    const web=path.join(dir,'child','artifact','web-games',gameId);
    const output=path.join(dir,'out');
    fs.mkdirSync(web,{recursive:true});
    fs.writeFileSync(baseline,'{"version":1}\n');
    fs.writeFileSync(path.join(web,'index.html'),'<!doctype html><canvas></canvas>\n');
    writeJson(path.join(web,'unity-web-build.json'),{version:1,engine:'UNITY_WEB',gameId,bootSmoke:'PASS'});
    writeJson(path.join(web,'unity-web-gameplay-validation.json'),{version:1,engine:'UNITY_WEB',gameId,pass:true});
    run(['result',`--game-id=${gameId}`,`--source-root=unity-games/${gameId}`,`--baseline=${baseline}`,'--source-tree=tree','--build-run-id=1',`--child-root=${path.join(dir,'child')}`,`--output-root=${output}`]);
    const result=JSON.parse(fs.readFileSync(path.join(output,'results',gameId+'.json'),'utf8'));
    assert.equal(result.pass,false);
    assert.match(result.update.unityWebValidationSurfaceFailureReason,/DEPLOY_BUNDLE_INCOMPLETE/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('boolean-only Unity Web evidence cannot satisfy the final gate',()=>{
  const dir=temp();
  try{
    const gameId='worker-boolean-only-game';
    const baseline=path.join(dir,'design-revised.json');
    const child=path.join(dir,'child');
    const web=path.join(child,'artifact','web-games',gameId);
    const output=path.join(dir,'out');
    fs.mkdirSync(web,{recursive:true});
    fs.writeFileSync(baseline,'{"version":1}\n');
    fs.writeFileSync(path.join(web,'index.html'),'<!doctype html><canvas></canvas>\n');
    writeBundle(web,gameId);
    writeJson(path.join(web,'unity-web-build.json'),{version:1,engine:'UNITY_WEB',gameId,bootSmoke:'PASS'});
    writeJson(path.join(web,'unity-web-gameplay-validation.json'),{
      version:1,engine:'UNITY_WEB',gameId,pass:true,
      boot:{pass:true},input:{pass:true},gameplay:{pass:true},coreFun:{pass:true},
      saveRestore:{pass:true},mobile:{pass:true},performance:{pass:true},noCriticalRuntimeError:true
    });
    run([
      'result',`--game-id=${gameId}`,`--source-root=unity-games/${gameId}`,
      `--baseline=${baseline}`,'--baseline-source=design/worker-boolean-only-game/2026-09-21/design-revised.json',
      '--source-tree=tree555','--build-run-id=555',`--child-root=${child}`,`--output-root=${output}`
    ]);
    const result=JSON.parse(fs.readFileSync(path.join(output,'results',gameId+'.json'),'utf8'));
    assert.equal(result.pass,false);
    assert.match(result.update.unityWebValidationSurfaceFailureReason,/input|coreFun|mobile|gameplay/);
    assert.equal(result.update.currentStep,undefined);
    assert.equal(result.update.routingBlockers,undefined);
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
    writeBundle(web,gameId);
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
    assert.equal(result.update.unityWebValidationSurfacePassed,false);
    assert.equal(result.update.unityWebTestAvailable,false);
    assert.match(result.update.unityWebValidationSurfaceFailureReason,/coreFun/);
    assert.equal(result.update.currentStep,undefined);
    assert.equal(result.update.canonicalState,undefined);
    assert.equal(result.update.routingBlockers,undefined);
    assert.equal(fs.existsSync(path.join(output,'public','web-games',gameId)),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
