import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {buildRuntimeMediaIndex,writeRuntimeMediaIndex} from '../tools/company-runtime-media-homepage-index.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-media-homepage-'));
  const game='demo-game',date='2026-09-21',artifact='apk-demo',capture='capture-1';
  const mediaRel=`assets/runtime-evidence/unity/${game}/${date}/${artifact}/${capture}.png`;
  const mediaAbs=path.join(root,mediaRel);
  fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
  const bytes=Buffer.from('real-runtime-capture-fixture');
  fs.writeFileSync(mediaAbs,bytes);
  const recordRel=`company-records/runtime-media/2026/${date}/${game}/unity-runtime-media--demo-runtime-1.json`;
  const recordAbs=path.join(root,recordRel);
  fs.mkdirSync(path.dirname(recordAbs),{recursive:true});
  fs.writeFileSync(recordAbs,JSON.stringify({
    schemaVersion:1,
    recordId:'demo-runtime-1',
    recordType:'unity-runtime-media',
    domain:'runtime-media',
    scope:{type:'GAME',id:game,gameId:game,platform:'UNITY'},
    timestamps:{createdAt:'2026-09-21T00:00:00.000Z',observedAt:'2026-09-21T00:00:00.000Z'},
    provenance:{producer:'test',authority:'runtime',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),sourceRefs:[]},
    status:'VERIFIED',
    retentionClass:'RUNTIME_MEDIA',
    data:{
      gameId:game,platform:'UNITY',captureAt:'2026-09-21T00:00:00.000Z',
      sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),
      sha256:sha(bytes),runtimeVerification:'PASS',mediaPath:mediaRel,homepageRepresentative:true
    },
    evidenceRefs:[],relatedFiles:[],supersedes:[],tags:['homepage-representative']
  },null,2));
  return{root,mediaRel};
}

test('runtime media homepage index accepts only verified hashed representative captures',()=>{
  const {root,mediaRel}=fixture();
  try{
    const index=buildRuntimeMediaIndex({root});
    assert.equal(index.items.length,1);
    assert.equal(index.items[0].gameId,'demo-game');
    assert.equal(index.items[0].platform,'UNITY');
    assert.equal(index.items[0].mediaPath,'/'+mediaRel);
    assert.equal(index.items[0].runtimeVerification,'PASS');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('runtime media homepage index fails stale check until generated index matches records',()=>{
  const {root}=fixture();
  try{
    assert.throws(()=>writeRuntimeMediaIndex({root,check:true}),/RUNTIME_MEDIA_HOMEPAGE_INDEX_STALE/);
    writeRuntimeMediaIndex({root,check:false});
    assert.doesNotThrow(()=>writeRuntimeMediaIndex({root,check:true}));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('homepage loads runtime media index and keeps actual platform launch action',()=>{
  const source=fs.readFileSync(new URL('../assets/homepage-enhancements.js',import.meta.url),'utf8');
  assert.match(source,/getJson\('\/runtime-media-index\.json'\)/);
  assert.match(source,/runtimeMediaOf/);
  assert.match(source,/actual|실제 플레이 화면/);
  assert.match(source,/platformHref\(game\)/);
  assert.match(source,/platformAction/);
  assert.match(source,/data-runtime-media/);
});
