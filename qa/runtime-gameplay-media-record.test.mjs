import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {recordRuntimeGameplayMedia} from '../tools/runtime-gameplay-media-record.mjs';
import {validateCompanyRecord} from '../tools/company-records-governance.mjs';

const root=process.cwd();
const tmpRoot=path.join(root,'.tmp-runtime-media-test');
const cleanup=()=>{
  fs.rmSync(tmpRoot,{recursive:true,force:true});
  fs.rmSync(path.join(root,'assets/runtime-evidence/unity/runtime-media-test'),{recursive:true,force:true});
  fs.rmSync(path.join(root,'company-records/runtime-media/2026/2026-09-21/runtime-media-test'),{recursive:true,force:true});
};
test('canonical recorder writes verified still and core-motion records',()=>{
  cleanup();fs.mkdirSync(tmpRoot,{recursive:true});
  const still=path.join(tmpRoot,'still.png'),motion=path.join(tmpRoot,'motion.mp4');
  fs.writeFileSync(still,Buffer.from('png-test'));
  fs.writeFileSync(motion,Buffer.from('mp4-test'));
  try{
    const a=recordRuntimeGameplayMedia({
      gameId:'runtime-media-test',platform:'UNITY',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+ '1'.repeat(64),
      input:path.relative(root,still),mediaKind:'STILL',producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_ANDROID_RUNTIME',
      captureAt:'2026-09-21T03:00:00.000Z',updateHomepageIndex:false
    });
    const b=recordRuntimeGameplayMedia({
      gameId:'runtime-media-test',platform:'UNITY',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+ '1'.repeat(64),
      input:path.relative(root,motion),mediaKind:'MOTION',motionFocus:'ATTACK_HIT_IMPACT',producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_ANDROID_RUNTIME',
      captureAt:'2026-09-21T03:00:01.000Z',updateHomepageIndex:false
    });
    assert.deepEqual(validateCompanyRecord(a.recordPath).errors,[]);
    assert.deepEqual(validateCompanyRecord(b.recordPath).errors,[]);
    assert.equal(b.record.data.mediaKind,'MOTION');
    assert.equal(b.record.data.motionFocus,'ATTACK_HIT_IMPACT');
  }finally{cleanup();}
});

test('motion recorder rejects menu-only or unfocused clips',()=>{
  cleanup();fs.mkdirSync(tmpRoot,{recursive:true});
  const motion=path.join(tmpRoot,'motion.mp4');fs.writeFileSync(motion,Buffer.from('mp4-test'));
  try{
    assert.throws(()=>recordRuntimeGameplayMedia({
      gameId:'runtime-media-test',platform:'UNITY',sourceRevision:'b'.repeat(40),artifactIdentity:'build-1',
      input:path.relative(root,motion),mediaKind:'MOTION',motionFocus:'MENU_OPEN_CLOSE_ONLY',updateHomepageIndex:false
    }),/MEDIA_MOTION_FOCUS_REQUIRED/);
  }finally{cleanup();}
});

test('recorder rejects Web media because homepage gameplay media is native only',()=>{
  cleanup();fs.mkdirSync(tmpRoot,{recursive:true});
  const still=path.join(tmpRoot,'still.png');fs.writeFileSync(still,Buffer.from('png-test'));
  try{
    assert.throws(()=>recordRuntimeGameplayMedia({
      gameId:'runtime-media-test',platform:'WEB',sourceRevision:'c'.repeat(40),artifactIdentity:'web-build',
      input:path.relative(root,still),mediaKind:'STILL',updateHomepageIndex:false
    }),/MEDIA_PLATFORM_INVALID/);
  }finally{cleanup();}
});
