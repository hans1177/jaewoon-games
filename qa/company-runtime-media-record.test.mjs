import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {publishRuntimeMedia} from '../tools/company-runtime-media-record.mjs';

test('publisher copies actual capture into canonical runtime evidence and updates homepage index',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-media-record-'));
  try{
    const capture='tmp/capture.png';
    fs.mkdirSync(path.join(root,'tmp'),{recursive:true});
    fs.writeFileSync(path.join(root,capture),Buffer.from('png-fixture'));
    const result=publishRuntimeMedia({
      root,
      gameId:'demo-game',
      platform:'UNITY',
      captureFile:capture,
      sourceRevision:'a'.repeat(40),
      artifactIdentity:'sha256:'+'b'.repeat(64),
      captureAt:'2026-09-21T01:02:03.000Z',
      producer:'unity-runtime-smoke',
      authority:'runtime-pass',
      recordId:'demo-unity-runtime-1',
      homepageRepresentative:true
    });
    assert.match(result.mediaPath,/^assets\/runtime-evidence\/unity\/demo-game\/2026-09-21\//);
    assert.equal(fs.existsSync(path.join(root,result.mediaPath)),true);
    assert.equal(fs.existsSync(path.join(root,result.recordPath)),true);
    const record=JSON.parse(fs.readFileSync(path.join(root,result.recordPath),'utf8'));
    assert.equal(record.status,'VERIFIED');
    assert.equal(record.data.actualRuntime,true);
    assert.equal(record.data.homepageRepresentative,true);
    const index=JSON.parse(fs.readFileSync(path.join(root,'runtime-media-index.json'),'utf8'));
    assert.equal(index.items.length,1);
    assert.equal(index.items[0].gameId,'demo-game');
    assert.equal(index.items[0].mediaPath,'/'+result.mediaPath);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('publisher rejects unsupported media and missing artifact binding',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-media-record-invalid-'));
  try{
    fs.writeFileSync(path.join(root,'capture.txt'),'x');
    assert.throws(()=>publishRuntimeMedia({
      root,gameId:'demo-game',platform:'UNITY',captureFile:'capture.txt',
      sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64)
    }),/RUNTIME_MEDIA_CAPTURE_EXTENSION_INVALID/);
    fs.writeFileSync(path.join(root,'capture.png'),'x');
    assert.throws(()=>publishRuntimeMedia({
      root,gameId:'demo-game',platform:'UNITY',captureFile:'capture.png',
      sourceRevision:'a'.repeat(40),artifactIdentity:''
    }),/RUNTIME_MEDIA_ARTIFACT_IDENTITY_REQUIRED/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
