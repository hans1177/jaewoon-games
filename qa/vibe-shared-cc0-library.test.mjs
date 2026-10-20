// Regression: reuse existing game libraries but fail closed for unverified visible art.
import test from 'node:test';
import assert from 'node:assert/strict';
import {planAssetApplication} from '../assets/asset-selector.js';
import {buildVibePatchPlan} from '../tools/company-vibe2-gameplay-intelligence.mjs';
import {validatePreservedSourceHtml} from '../tools/company-development-web-bootstrap.mjs';

test('all-game asset selector permits downloaded CC0 originals, rejects CC-BY and missing provenance',()=>{
  const assets=[
    {id:'original-cc0-tree',types:['background','prop'],path:'assets/shared/tree.obj',
      license:'CC0-1.0',downloaded:true,modified:false,sourceHash:'1'.repeat(64),sourceUrl:'https://example.org/cc0-tree'},
    {id:'recolored-original',types:['background','prop'],path:'assets/shared/recolored-tree.obj',
      license:'CC0',downloaded:true,modified:true,sourceHash:'9'.repeat(64),sourceUrl:'https://example.org/recolored'},
    {id:'no-hash-tree',types:['background','prop'],path:'assets/shared/nohash-tree.obj',
      license:'CC0',downloaded:true,modified:false,sourceUrl:'https://example.org/no-hash'},
    {id:'cc-by-tree',types:['background','prop'],path:'assets/shared/by-tree.obj',
      license:'CC-BY-4.0',downloaded:true,sourceUrl:'https://example.org/by-tree'},
    {id:'self-claimed-no-source',types:['background','prop'],path:'assets/shared/no-source.obj',
      license:'CC0',downloaded:true},
    {id:'missing-original-file',types:['background','prop'],path:'assets/shared/missing.obj',
      license:'CC0',downloaded:false,sourceUrl:'https://example.org/missing'}
  ];
  const plan=planAssetApplication({prompt:'숲 나무 지형',manifest:{assets}});
  assert.ok(plan.matched.some(row=>row.id==='original-cc0-tree'));
  assert.ok(!plan.matched.some(row=>row.id==='cc-by-tree'));
  assert.ok(!plan.matched.some(row=>row.id==='recolored-original'));
  assert.ok(!plan.matched.some(row=>row.id==='no-hash-tree'));
  assert.ok(!plan.matched.some(row=>row.id==='self-claimed-no-source'));
  assert.ok(!plan.matched.some(row=>row.id==='missing-original-file'));
  assert.equal(plan.policy.downloadedCc0GameArtOnly,true);
  assert.equal(plan.policy.newGameAssetAndLibraryCreationForbidden,true);
  assert.equal(plan.policy.sourceHashAndOriginalUnmodifiedProofMandatory,true);
  assert.equal(plan.policy.inspectAllExistingCompatibleGameLibrariesFirst,true);
  assert.equal(plan.policy.licenseLedgerAndSourceHashProofRequiredBeforePublicPresentation,true);
  assert.equal(plan.ready,false,'incomplete visual coverage must not become ready');
  assert.equal(plan.appliedToGame,false);
  assert.equal(plan.nativeRuntimeVerified,false);
});

test('Vibe game creation always plans library reuse and original CC0 verification',()=>{
  const plan=buildVibePatchPlan({
    gameplaySketch:{},
    sourceAnalysis:{present:true,storageKeys:['game-save-v1'],capabilities:{}},
    blockers:[]
  });
  const byId=new Map(plan.tasks.map(row=>[row.id,row]));
  for(const id of ['DISCOVER_AND_REUSE_ALL_COMPATIBLE_GAME_LIBRARIES',
    'RESOLVE_ALL_GAME_VISIBLE_ART_FROM_DOWNLOADED_CC0',
    'VERIFY_CC0_PROVENANCE_BINDING_AND_GAMEPLAY'])assert.ok(byId.has(id),id);
  assert.ok(byId.get('VERIFY_CC0_PROVENANCE_BINDING_AND_GAMEPLAY').dependsOn
    .includes('RESOLVE_ALL_GAME_VISIBLE_ART_FROM_DOWNLOADED_CC0'));
  assert.ok(byId.has('PRESERVE_SAVE_CONTRACT'));
  assert.match(byId.get('RESOLVE_ALL_GAME_VISIBLE_ART_FROM_DOWNLOADED_CC0').reason,/No new library or art creation/);
});

test('existing importmaps remain valid declarative data; invalid executable scripts still fail',()=>{
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head>
<body data-audio-state="locked"><canvas></canvas>
<button data-audio-control="mute">Mute</button>
<input data-audio-control="volume">
<script type="importmap">{"imports":{"three":"/assets/three.module.js"}}</script>
<script type="application/json">{"name":"game"}</script>
<script>const gameReady=true;</script></body></html>`;
  const good=validatePreservedSourceHtml(html);
  assert.ok(!good.blockers.includes('INLINE_SCRIPT_SYNTAX_INVALID'),good.blockers.join(','));
  const bad=validatePreservedSourceHtml(html.replace('const gameReady=true;','const =;'));
  assert.ok(bad.blockers.includes('INLINE_SCRIPT_SYNTAX_INVALID'));
});
