// 파일명: qa/vibe-cc0-chain.test.mjs
// 임포트: 기존 CC0 제작·원장 동기화 실행 경로의 권리·해시·단계별 복구 회귀 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
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


test('mare story/event audio uses verified CC0 parents and decodable game-specific derivatives',()=>{
  const root=new URL('../',import.meta.url).pathname;
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'roblox-games/mare-essentia/audio/manifest.json'),'utf8'));
  const pack=JSON.parse(fs.readFileSync(path.join(root,'assets/external/simple-rpg/priority-v1/manifest.json'),'utf8'));
  const verifiedPack=pack.packs.find(x=>x.file==='kenney-rpg-sfx-50.zip');
  const archiveEntries=manifest.tracks.filter(x=>x.sourceArchiveSha256);
  assert.ok(archiveEntries.length>=20);
  const cc0Count=manifest.tracks.filter(x=>x.license==='CC0-1.0').length;
  assert.ok(cc0Count>=archiveEntries.length);
  assert.equal(new Set(manifest.tracks.map(x=>x.name)).size,manifest.tracks.length);
  assert.ok(new Set(archiveEntries.map(x=>x.sourceEntry)).size>=20);
  assert.ok(archiveEntries.every(x=>x.sourceArchiveSha256===verifiedPack.sha256));
  assert.equal(crypto.createHash('sha256').update(
    fs.readFileSync(path.join(root,'assets/external/simple-rpg/priority-v1/kenney-rpg-sfx-50.zip'))
  ).digest('hex'),verifiedPack.sha256);
  // FFmpeg 없는 범용 QA 러너에서도 원본 권리·바이트 검증은 생략하지 않는다.
  const pirate=manifest.tracks.find(x=>x.name==='music_pirate');
  const pirateSource=fs.readFileSync(path.join(root,pirate.sourceFile));
  const pirateBlob=crypto.createHash('sha1')
    .update(Buffer.from('blob '+pirateSource.length+'\0')).update(pirateSource).digest('hex');
  assert.equal(pirateBlob,pirate.sourceGitBlobSha1);
  assert.equal(pirateSource.subarray(0,4).toString(),'OggS');
  const archive=path.join(root,'assets/external/simple-rpg/priority-v1/kenney-rpg-sfx-50.zip');
  const listing=spawnSync('unzip',['-Z','-1',archive],{encoding:'utf8',timeout:30000});
  assert.equal(listing.status,0,String(listing.stderr||''));
  const entries=listing.stdout.split(/\r?\n/);
  const missing=archiveEntries.filter(track=>entries.filter(e=>e===track.sourceEntry||e.endsWith('/'+track.sourceEntry)).length!==1);
  assert.deepEqual(missing.map(x=>x.sourceEntry),[],
    'Kenney source entry mismatches. Actual OGG entries: '+entries.filter(e=>e.endsWith('.ogg')).join(','));
  for(const track of archiveEntries){
    const original=spawnSync('unzip',['-p',archive,track.sourceEntry],{maxBuffer:16*1024*1024,timeout:30000});
    assert.equal(original.status,0,'cannot unpack CC0 '+track.sourceEntry);
    assert.equal(original.stdout.subarray(0,4).toString(),'OggS');
  }
  console.log('MARE_CC0_AUDIO_SOURCE_BYTES_VALID 21');
  const encoder=spawnSync('ffmpeg',['-version'],{encoding:'utf8'});
  const inspector=spawnSync('ffprobe',['-version'],{encoding:'utf8'});
  assert.notEqual(encoder.error?.code,'ENOENT','FFmpeg must be installed before claiming audio quality PASS');
  assert.notEqual(inspector.error?.code,'ENOENT','FFprobe must be installed before claiming audio quality PASS');
  assert.equal(encoder.status,0);
  assert.equal(inspector.status,0);
  const run=spawnSync(process.execPath,['tools/mare-audio-upload.mjs'],{
    cwd:root,
    env:{...process.env,AUDIO_CC0_PREFLIGHT:'1'},
    encoding:'utf8',timeout:180000,maxBuffer:1024*1024
  });
  assert.equal(run.status,0,('AUDIO_CC0_PREFLIGHT_FAILED\n'+String(run.stdout||'')+'\n'+String(run.stderr||'')).slice(-6000));
  assert.match(run.stdout,new RegExp('AUDIO_CC0_PREFLIGHT_OK '+cc0Count));
});
