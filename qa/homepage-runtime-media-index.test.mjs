import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildHomepageRuntimeMediaIndex} from '../tools/homepage-runtime-media-index.mjs';

const root=process.cwd();
const rm=p=>fs.rmSync(p,{recursive:true,force:true});

test('homepage runtime media index exposes only verified actual runtime media',()=>{
  const date='2099-01-02',game='qa-runtime-media-index',artifact='build-001';
  const mediaRel=`assets/runtime-evidence/unity/${game}/${date}/${artifact}/capture-main.png`;
  const mediaAbs=path.join(root,mediaRel);
  const recordRel=`company-records/runtime-media/2099/${date}/${game}/unity-runtime-media--qa-home-media-001.json`;
  const recordAbs=path.join(root,recordRel);
  try{
    fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
    fs.writeFileSync(mediaAbs,Buffer.from('actual-runtime-frame'));
    const hash=crypto.createHash('sha256').update(fs.readFileSync(mediaAbs)).digest('hex');
    fs.mkdirSync(path.dirname(recordAbs),{recursive:true});
    fs.writeFileSync(recordAbs,JSON.stringify({
      schemaVersion:1,
      recordId:'qa-home-media-001',
      recordType:'unity-runtime-media',
      domain:'runtime-media',
      scope:{type:'GAME',id:game,gameId:game,platform:'UNITY'},
      timestamps:{createdAt:'2099-01-02T02:00:00.000Z',observedAt:'2099-01-02T01:59:00.000Z'},
      provenance:{producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_RUNTIME',sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'artifact-001',sourceRefs:[]},
      status:'VERIFIED',
      retentionClass:'RUNTIME_MEDIA',
      data:{gameId:game,platform:'UNITY',captureAt:'2099-01-02T01:59:00.000Z',sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'artifact-001',sha256:hash,runtimeVerification:'PASS',mediaPath:mediaRel,homepageRepresentative:true,captureKind:'GAMEPLAY'},
      evidenceRefs:[],relatedFiles:[mediaRel],supersedes:[],tags:['runtime','gameplay','homepage']
    },null,2)+'\n');
    const index=buildHomepageRuntimeMediaIndex();
    const row=index.entries.find(x=>x.recordId==='qa-home-media-001');
    assert.ok(row);
    assert.equal(row.mediaPath,mediaRel);
    assert.equal(row.platform,'UNITY');
    assert.equal(row.runtimeVerification,'PASS');
    assert.equal(row.homepageRepresentative,true);
  }finally{
    rm(path.join(root,'company-records/runtime-media/2099'));
    rm(path.join(root,'assets/runtime-evidence/unity',game));
  }
});
