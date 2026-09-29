import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateCompanyRecord,scanCompanyRecords} from '../tools/company-records-governance.mjs';

const root=process.cwd();
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const rm=file=>fs.rmSync(file,{recursive:true,force:true});
const baseRecord=()=>({
  schemaVersion:1,
  recordId:'qa-test-001',
  recordType:'runtime-check',
  domain:'qa',
  scope:{type:'GAME',id:'test-game',gameId:'test-game',platform:'WEB'},
  timestamps:{createdAt:'2026-09-21T01:02:03.000Z',observedAt:'2026-09-21T01:01:00.000Z'},
  provenance:{producer:'DETERMINISTIC_QA',authority:'TEST',sourceRevision:null,artifactIdentity:null,sourceRefs:[]},
  status:'VERIFIED',
  retentionClass:'TRANSIENT_QA',
  data:{pass:true},
  evidenceRefs:[],
  relatedFiles:[],
  supersedes:[],
  tags:['test']
});

test('canonical record contract accepts a consistent governed record',()=>{
  const rel='company-records/qa/2026/2026-09-21/test-game/runtime-check--qa-test-001.json';
  const abs=path.join(root,rel);
  try{
    writeJson(abs,baseRecord());
    const result=validateCompanyRecord(rel);
    assert.deepEqual(result.errors,[]);
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});

test('record governance rejects path, metadata and raw secret drift',()=>{
  const rel='company-records/qa/2026/2026-09-21/test-game/runtime-check--qa-test-002.json';
  const abs=path.join(root,rel),row=baseRecord();
  row.recordId='qa-test-002';
  row.domain='release';
  row.provenance.secret='should-not-exist';
  try{
    writeJson(abs,row);
    const result=validateCompanyRecord(rel);
    assert.ok(result.errors.includes('record.domain:PATH_MISMATCH'));
    assert.ok(result.errors.some(x=>x.endsWith('RAW_SECRET_FORBIDDEN')));
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});

test('runtime gameplay media must be actual hash-bound runtime evidence',()=>{
  const mediaRel='assets/runtime-evidence/unity/test-game/2026-09-21/build-test/capture-main.png';
  const mediaAbs=path.join(root,mediaRel);
  const recordRel='company-records/runtime-media/2026/2026-09-21/test-game/unity-runtime-media--capture-test-001.json';
  const recordAbs=path.join(root,recordRel);
  try{
    fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
    fs.writeFileSync(mediaAbs,Buffer.from('runtime-capture-test-binary'));
    const hash=crypto.createHash('sha256').update(fs.readFileSync(mediaAbs)).digest('hex');
    const row={
      schemaVersion:1,
      recordId:'capture-test-001',
      recordType:'unity-runtime-media',
      domain:'runtime-media',
      scope:{type:'GAME',id:'test-game',gameId:'test-game',platform:'UNITY'},
      timestamps:{createdAt:'2026-09-21T02:00:00.000Z',observedAt:'2026-09-21T01:59:00.000Z'},
      provenance:{producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_RUNTIME',sourceRevision:'0123456789012345678901234567890123456789',artifactIdentity:'apk-sha256-test',sourceRefs:[]},
      status:'VERIFIED',
      retentionClass:'RUNTIME_MEDIA',
      data:{
        gameId:'test-game',
        platform:'UNITY',
        captureAt:'2026-09-21T01:59:00.000Z',
        sourceRevision:'0123456789012345678901234567890123456789',
        artifactIdentity:'apk-sha256-test',
        sha256:hash,
        runtimeVerification:'PASS',
        mediaPath:mediaRel
      },
      evidenceRefs:[],
      relatedFiles:[mediaRel],
      supersedes:[],
      tags:['gameplay','runtime']
    };
    writeJson(recordAbs,row);
    assert.deepEqual(validateCompanyRecord(recordRel).errors,[]);
    row.data.sha256='0'.repeat(64);
    writeJson(recordAbs,row);
    assert.ok(validateCompanyRecord(recordRel).errors.includes('data.sha256:MEDIA_HASH_MISMATCH'));
  }finally{
    rm(path.join(root,'company-records/runtime-media/2026'));
    rm(path.join(root,'assets/runtime-evidence/unity/test-game'));
  }
});

test('repository company-record scan keeps record ids unique',()=>{
  const a='company-records/qa/2026/2026-09-21/test-a/runtime-check--duplicate-test-001.json';
  const b='company-records/qa/2026/2026-09-21/test-b/runtime-check--duplicate-test-001.json';
  const ra=baseRecord(),rb=baseRecord();
  ra.recordId=rb.recordId='duplicate-test-001';
  ra.scope={type:'GAME',id:'test-a',gameId:'test-a',platform:'WEB'};
  rb.scope={type:'GAME',id:'test-b',gameId:'test-b',platform:'WEB'};
  try{
    writeJson(path.join(root,a),ra);writeJson(path.join(root,b),rb);
    const report=scanCompanyRecords();
    assert.ok(report.errors.some(x=>x.startsWith('DUPLICATE_RECORD_ID:duplicate-test-001:')));
  }finally{rm(path.join(root,'company-records/qa/2026'));}
});
