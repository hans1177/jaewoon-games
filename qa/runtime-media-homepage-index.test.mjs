import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {collectHomepageRuntimeMedia,buildHomepageRuntimeMediaIndex} from '../tools/runtime-media-homepage-index.mjs';

function write(root,rel,content){const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return file;}
function record({gameId='g1',platform='UNITY',captureAt='2026-09-21T01:00:00.000Z',mediaPath,sha256,status='VERIFIED',runtimeVerification='PASS',tags=['gameplay','runtime']}){
  return{
    schemaVersion:1,recordId:'capture-'+gameId+'-'+platform.toLowerCase(),recordType:platform.toLowerCase()+'-runtime-media',domain:'runtime-media',
    scope:{type:'GAME',id:gameId,gameId,platform},
    timestamps:{createdAt:captureAt,observedAt:captureAt},
    provenance:{producer:'TEST',authority:'ACTUAL_RUNTIME',sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'artifact-'+gameId,sourceRefs:[]},
    status,retentionClass:'RUNTIME_MEDIA',
    data:{gameId,platform,captureAt,sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'artifact-'+gameId,sha256,runtimeVerification,mediaPath},
    evidenceRefs:[],relatedFiles:[mediaPath],supersedes:[],tags
  };
}

test('homepage runtime media index exposes latest verified gameplay capture only',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-media-homepage-'));
  try{
    const media1='assets/runtime-evidence/unity/g1/2026-09-21/a/c1.png';
    const media2='assets/runtime-evidence/unity/g1/2026-09-21/b/c2.png';
    write(root,media1,Buffer.from('one'));write(root,media2,Buffer.from('two'));
    const sha1=crypto.createHash('sha256').update(Buffer.from('one')).digest('hex');
    const sha2=crypto.createHash('sha256').update(Buffer.from('two')).digest('hex');
    write(root,'company-records/runtime-media/2026/2026-09-21/g1/unity-runtime-media--one.json',JSON.stringify(record({mediaPath:media1,sha256:sha1,captureAt:'2026-09-21T01:00:00.000Z'})));
    write(root,'company-records/runtime-media/2026/2026-09-21/g1/unity-runtime-media--two.json',JSON.stringify(record({mediaPath:media2,sha256:sha2,captureAt:'2026-09-21T02:00:00.000Z'})));
    write(root,'company-records/runtime-media/2026/2026-09-21/g2/unity-runtime-media--bad.json',JSON.stringify(record({gameId:'g2',mediaPath:media1,sha256:sha1,status:'DRAFT'})));
    write(root,'company-records/runtime-media/2026/2026-09-21/g3/unity-runtime-media--concept.json',JSON.stringify(record({gameId:'g3',mediaPath:media1,sha256:sha1,tags:['concept-art']})));
    const rows=collectHomepageRuntimeMedia({root});
    assert.equal(rows.length,1);
    assert.equal(rows[0].gameId,'g1');
    assert.equal(rows[0].mediaPath,'/'+media2);
    assert.equal(rows[0].authority,'VERIFIED_RUNTIME_MEDIA_MANIFEST');
    const index=buildHomepageRuntimeMediaIndex({root});
    assert.equal(index.syntheticOrConceptArtForbidden,true);
    assert.equal(index.items.length,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
