// 파일명: qa/vibe-cc0-chain.test.mjs
// 임포트: 기존 CC0 제작·원장 동기화 실행 경로의 권리·해시·단계별 복구 회귀 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {produceRegisteredCc0Asset} from '../tools/vibe2-asset-production-plan.mjs';

const binary=Buffer.alloc(20);
binary.write('glTF',0,'ascii');
binary.writeUInt32LE(2,4);
binary.writeUInt32LE(binary.length,8);
binary.writeUInt32LE(12,12);
binary.writeUInt32LE(0x4e4f534a,16);
const hash=crypto.createHash('sha256').update(binary).digest('hex');
const rawPath='assets/roblox/actors/native/fixture.glb';
function fixture(changes={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-cc0-chain-'));
  fs.mkdirSync(path.join(root,'assets','roblox','actors','native'),{recursive:true});
  const asset={id:'fixture-cc0-actor',title:'Approved source actor',family:'CHARACTER',
    license:'CC0-1.0',sourceUrl:'https://kenney.nl/assets/mini-characters',
    licenseEvidenceUrl:'https://kenney.nl/knowledge-base/faq',
    path:rawPath,sourceHash:hash,...changes};
  fs.writeFileSync(path.join(root,'company-asset-library.json'),
    JSON.stringify({version:1,assets:[asset],externalSources:[]}));
  return {root,source:path.join(root,rawPath),cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const request=({repoRoot, fetchImpl}={})=>produceRegisteredCc0Asset({
  repoRoot,assetId:'fixture-cc0-actor',gameId:'demo',target:'web',
  role:'character',blender:'__missing_blender_for_test__',fetchImpl
});

test('no unpinned rights, path or source hash can pass automatic CC0 acquisition',async()=>{
  const invalid=[
    {license:'CC-BY-NC-4.0'}, {licenseEvidenceUrl:''},
    {sourceHash:''},{path:'../../private.glb'},
    {sourceUrl:'http://insecure.example/model.glb'}
  ];
  for(const change of invalid){
    const f=fixture(change);
    try{await assert.rejects(request({repoRoot:f.root}),/CC0_PRODUCTION_VERIFIED_PARENT_REQUIRED|CC0_PRODUCTION_SOURCE_PIN_REQUIRED/);}
    finally{f.cleanup();}
  }
});

test('missing pinned download URL must not synthesize a model or claim game application',async()=>{
  const f=fixture();
  try{
    await assert.rejects(request({repoRoot:f.root}),/CC0_PINNED_DOWNLOAD_URL_REQUIRED/);
    assert.equal(fs.existsSync(f.source),false);
    assert.equal(fs.existsSync(path.join(f.root,'assets/generated')),false);
  }finally{f.cleanup();}
});

test('tampered existing original remains untouched instead of auto-overwrite',async()=>{
  const f=fixture({downloadUrl:'https://opengameart.org/sites/default/files/model.glb'});
  try{
    fs.writeFileSync(f.source,Buffer.from('malicious-input'));
    await assert.rejects(request({repoRoot:f.root}),/CC0_ORIGINAL_HASH_MISMATCH_KEEP_SOURCE/);
    assert.equal(fs.readFileSync(f.source,'utf8'),'malicious-input');
  }finally{f.cleanup();}
});

test('untrusted direct acquisition host is blocked before fetch',async()=>{
  const f=fixture({downloadUrl:'https://internal.example/file.glb'});
  let called=false;
  try{
    await assert.rejects(request({repoRoot:f.root,fetchImpl:async()=>{called=true;}}),/CC0_DOWNLOAD_HOST_OR_FORMAT_BLOCKED/);
    assert.equal(called,false);
  }finally{f.cleanup();}
});

test('exact pinned CC0 bytes acquire once, then reuse source when Blender stage fails',async()=>{
  const f=fixture({downloadUrl:'https://opengameart.org/sites/default/files/fixture.glb'});
  let requests=0;
  const fetchImpl=async()=>{requests++;return {ok:true,headers:{get:()=>String(binary.length)},body:[binary]};};
  try{
    await assert.rejects(request({repoRoot:f.root,fetchImpl}),/ENOENT|missing_blender_for_test/);
    assert.equal(fs.readFileSync(f.source).equals(binary),true);
    assert.equal(requests,1);
    await assert.rejects(request({repoRoot:f.root,fetchImpl}),/ENOENT|missing_blender_for_test/);
    assert.equal(requests,1);
    assert.equal(fs.existsSync(path.join(f.root,'assets/generated/web/demo/character')),false);
  }finally{f.cleanup();}
});

test('wrong downloaded hash is rejected without leaving a source or stage',async()=>{
  const f=fixture({downloadUrl:'https://opengameart.org/sites/default/files/fixture.glb'});
  try{
    await assert.rejects(request({repoRoot:f.root,fetchImpl:async()=>({
      ok:true,headers:{get:()=>String(binary.length)},body:[Buffer.alloc(binary.length)]
    })}),/CC0_DOWNLOAD_HASH_MISMATCH/);
    assert.equal(fs.existsSync(f.source),false);
  }finally{f.cleanup();}
});

test('Blender CC0 actor/building profiles remain source-bound and registry preserves derivatives as unverified',()=>{
  const builder=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  const sync=fs.readFileSync(new URL('../tools/vibe2-asset-production-plan.mjs',import.meta.url),'utf8');
  assert.match(builder,/NATIVE_CC0_PROFILE_REQUIRES_VERIFIED_LIBRARY_SOURCE/);
  assert.match(builder,/CC0_ACTOR_RIG_AND_SKIN_REQUIRED/);
  assert.match(builder,/CC0_ACTOR_SOURCE_MOTION_REQUIRED/);
  assert.match(sync,/verifiedDerivativeFingerprints/);
  assert.match(sync,/sourceDependencyIds:/);
  assert.match(sync,/productionVerified:false,verifiedCompanyReusable:false/);
});
