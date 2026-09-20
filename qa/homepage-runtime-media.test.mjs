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
    mediaKind:'STILL',
    mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-a/capture-main.png'
  },
  evidenceRefs:[],relatedFiles:[],supersedes:[],tags:['gameplay','runtime'],
  ...overrides
});

test('homepage runtime media groups newest verified native still and core-motion capture per game and platform',()=>{
  const older=base();
  const newer=base({
    recordId:'runtime-media-2',
    timestamps:{createdAt:'2026-09-21T02:00:00.000Z',observedAt:'2026-09-21T02:00:00.000Z'},
    data:{...base().data,captureAt:'2026-09-21T02:00:00.000Z',artifactIdentity:'artifact-b',sha256:'2'.repeat(64),mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/capture-main.webp'}
  });
  const motion=base({
    recordId:'runtime-media-motion-1',
    timestamps:{createdAt:'2026-09-21T02:01:00.000Z',observedAt:'2026-09-21T02:01:00.000Z'},
    data:{...base().data,captureAt:'2026-09-21T02:01:00.000Z',artifactIdentity:'artifact-b',sha256:'3'.repeat(64),mediaKind:'MOTION',motionFocus:'ATTACK_HIT_IMPACT',mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/attack-impact.mp4'}
  });
  const index=selectLatestVerifiedGameplayMedia([older,newer,motion]);
  assert.equal(index.version,2);
  assert.equal(index.items.length,1);
  assert.equal(index.items[0].still.artifactIdentity,'artifact-b');
  assert.equal(index.items[0].still.mediaPath,'/assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/capture-main.webp');
  assert.equal(index.items[0].motion.motionFocus,'ATTACK_HIT_IMPACT');
  assert.equal(index.items[0].motion.mediaPath,'/assets/runtime-evidence/unity/fantasy-survival/2026-09-21/artifact-b/attack-impact.mp4');
});

test('web runtime screenshots and motion clips are intentionally excluded from homepage gameplay media',()=>{
  const web=base({
    recordId:'web-runtime-media-1',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'WEB'},
    data:{...base().data,platform:'WEB',mediaPath:'assets/runtime-evidence/web/fantasy-survival/2026-09-21/web/capture.png'}
  });
  const webMotion=base({
    recordId:'web-runtime-motion-1',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'WEB'},
    data:{...base().data,platform:'WEB',mediaKind:'MOTION',motionFocus:'ATTACK_HIT_IMPACT',mediaPath:'assets/runtime-evidence/web/fantasy-survival/2026-09-21/web/attack.mp4'}
  });
  assert.equal(selectLatestVerifiedGameplayMedia([web,webMotion]).items.length,0);
});

test('unverified, non-gameplay, and unfocused motion media cannot replace homepage media',()=>{
  const unverified=base({status:'DRAFT'});
  const nonGameplay=base({recordId:'runtime-media-3',tags:['runtime']});
  const failed=base({recordId:'runtime-media-4',data:{...base().data,runtimeVerification:'FAIL'}});
  const noFocus=base({recordId:'runtime-media-5',data:{...base().data,mediaKind:'MOTION',mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/a/random.mp4'}});
  const menuOnly=base({recordId:'runtime-media-6',data:{...base().data,mediaKind:'MOTION',motionFocus:'MENU_OPEN_CLOSE_ONLY',mediaPath:'assets/runtime-evidence/unity/fantasy-survival/2026-09-21/a/menu.mp4'}});
  assert.equal(selectLatestVerifiedGameplayMedia([unverified,nonGameplay,failed,noFocus,menuOnly]).items.length,0);
});

test('Roblox actual runtime gameplay still and core-motion clips are eligible once verified evidence exists',()=>{
  const roblox=base({
    recordId:'roblox-runtime-media-1',
    recordType:'roblox-runtime-media',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'ROBLOX'},
    provenance:{producer:'ROBLOX_RUNTIME_QA',authority:'APPROVED_ACTUAL_RUNTIME_SESSION',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sourceRefs:[]},
    data:{...base().data,platform:'ROBLOX',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sha256:'4'.repeat(64),mediaPath:'assets/runtime-evidence/roblox/fantasy-survival/2026-09-21/roblox-place-version-1/capture-main.png'}
  });
  const robloxMotion=base({
    recordId:'roblox-runtime-motion-1',
    recordType:'roblox-runtime-media',
    scope:{type:'GAME',id:'fantasy-survival',gameId:'fantasy-survival',platform:'ROBLOX'},
    provenance:{producer:'ROBLOX_RUNTIME_QA',authority:'APPROVED_ACTUAL_RUNTIME_SESSION',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sourceRefs:[]},
    data:{...base().data,platform:'ROBLOX',sourceRevision:'b'.repeat(40),artifactIdentity:'roblox-place-version-1',sha256:'5'.repeat(64),mediaKind:'MOTION',motionFocus:'ENEMY_ATTACK_OR_BEHAVIOR',mediaPath:'assets/runtime-evidence/roblox/fantasy-survival/2026-09-21/roblox-place-version-1/enemy-attack.webm'}
  });
  const index=selectLatestVerifiedGameplayMedia([roblox,robloxMotion]);
  assert.equal(index.items.length,1);
  assert.equal(index.items[0].platform,'ROBLOX');
  assert.ok(index.items[0].still);
  assert.equal(index.items[0].motion.motionFocus,'ENEMY_ATTACK_OR_BEHAVIOR');
});

test('homepage renderer consumes native motion media and pauses offscreen video loops',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  assert.match(renderer,/homepage-runtime-media\.json/);
  assert.match(renderer,/runtimeGameplayMediaFor/);
  assert.match(renderer,/foldGameMotion/);
  assert.match(renderer,/autoplay muted loop playsinline/);
  assert.match(renderer,/IntersectionObserver/);
  assert.match(renderer,/verified-motion/);
  assert.match(renderer,/\['UNITY','ROBLOX','FORTNITE_UEFN'\]/);
});
