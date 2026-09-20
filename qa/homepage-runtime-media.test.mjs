import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectLatestVerifiedGameplayMedia} from '../tools/homepage-runtime-media-sync.mjs';

const base=(overrides={})=>({
  schemaVersion:1,
  recordId:'runtime-media-1',
  recordType:'unity-runtime-media',
  domain:'runtime-media',
  scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'UNITY'},
  timestamps:{createdAt:'2026-09-21T01:00:00.000Z',observedAt:'2026-09-21T01:00:00.000Z'},
  provenance:{producer:'UNITY_RUNTIME_QA',authority:'ACTUAL_RUNTIME',sourceRevision:'a'.repeat(40),artifactIdentity:'artifact-a',sourceRefs:[]},
  status:'VERIFIED',
  retentionClass:'RUNTIME_MEDIA',
  data:{
    gameId:'fantasy-survival',
    platform:'UNITY',
    captureAt:'2026-09-21T01:00:00.000Z',
    sourceRevision:'a'.repeat(40),
    artifactIdentity:'artifact-a',
    sha256:'1'.repeat(64),
    runtimeVerification:'PASS',
    mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-a/capture-main.png'
  },
  evidenceRefs:[],relatedFiles:[],supersedes:[],tags:['gameplay','runtime'],
  ...overrides
});

test('homepage runtime media keeps newest verified native gameplay capture per game and platform',()=>{
  const older=base();
  const newer=base({
    recordId:'runtime-media-2',
    timestamps:{createdAt:'2026-09-21T02:00:00.000Z',observedAt:'2026-09-21T02:00:00.000Z'},
    data:{...base().data,captureAt:'2026-09-21T02:00:00.000Z',artifactIdentity:'artifact-b',sha256:'2'.repeat(64),mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/capture-main.webp'}
  });
  const index=selectLatestVerifiedGameplayMedia([older,newer]);
  assert.equal(index.items.length,1);
  assert.equal(index.items[0].artifactIdentity,'artifact-b');
  assert.equal(index.items[0].mediaPath,'/assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/capture-main.webp');
});

test('web runtime screenshots are intentionally excluded from homepage gameplay media',()=>{
  const web=base({
    recordId:'web-runtime-media-1',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'WEB'},
    data:{...base().data,platform:'WEB',mediaPath:'assets/runtime-evidence/web/fantasy-survival/2026-09-21/web/capture.png'}
  });
  assert.equal(selectLatestVerifiedGameplayMedia([web]).items.length,0);
});

test('unverified or non-gameplay media cannot replace homepage cover',()=>{
  const unverified=base({status:'DRAFT'});
  const nonGameplay=base({recordId:'runtime-media-3',tags:['runtime']});
  const failed=base({recordId:'runtime-media-4',data:{...base().data,runtimeVerification:'FAIL'}});
  assert.equal(selectLatestVerifiedGameplayMedia([unverified,nonGameplay,failed]).items.length,0);
});

test('Roblox actual runtime gameplay photos are eligible once verified evidence exists',()=>{
  const roblox=base({
    recordId:'roblox-runtime-media-1',
    recordType:'roblox-runtime-media',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'ROBLOX'},
    provenance:{producer:'ROBLOX_RUNTIME_QA',authority:'APPROVED_ACTUAL_RUNTIME_SESSION',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sourceRefs:[]},
    data:{...base().data,platform:'ROBLOX',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sha256:'3'.repeat(64),mediaPath:'assets/runtime-evidence/roblox/fantasy-survival/2026-09-21/roblox-place-version-1/capture-main.png'}
  });
  const index=selectLatestVerifiedGameplayMedia([roblox]);
  assert.equal(index.items.length,1);
  assert.equal(index.items[0].platform,'ROBLOX');
});

test('homepage renderer consumes native runtime media index and not a web capture index',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(renderer,/homepage-runtime-media\.json/);
  assert.match(renderer,/runtimeGameplayMediaFor/);
  assert.match(renderer,/verified-native/);
  assert.match(renderer,/\['UNITY','ROBLOX','FORTNITE_UEFN'\]/);
});
