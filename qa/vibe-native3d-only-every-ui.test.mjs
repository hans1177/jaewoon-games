// Canonical no-2D game UI regression. Applies to ALL existing and new game sources.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  auditNative3dOnlyUiSource,runNative3dOnlyUiQa
} from '../tools/vibe2-incremental-qa.mjs';
import {
  VIBE_NATIVE_3D_UI_CONTRACT,buildVibePresentationCraft
} from '../assets/vibe-presentation-director.js';

const canonical=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const policy=canonical.livingMotionVisualQualityContract.minimumSpatialPresentation;
test('owner native 3D-only policy has no old-game, menu, HUD or 2D-UI exception',()=>{
  assert.equal(policy.uiOverlayMayRemain2D,false);
  assert.equal(policy.allVisibleGameSurfacesRequireNative3D,true);
  assert.equal(policy.allUiAndHudNative3dRequired,true);
  assert.equal(policy.existingGameSource2dForbidden,true);
  assert.equal(policy.allExistingGameIdsIncluded,true);
  assert.equal(policy.noGrandfatheringOfLegacy2dUi,true);
  assert.equal(policy.legacy2dGameUiAccepted,false);
  assert.equal(policy.perGameFinalPassRequiresZeroFlat2dUiNodes,true);
  assert.equal(policy.native3dGlyphGeometryRequiredForVisibleUiText,true);
  assert.equal(policy.native3dSpatialPointerRaycastRequired,true);
  assert.equal(policy.runtimeVerified3dUiRequiredBeforeReleasePass,true);
  assert.equal(VIBE_NATIVE_3D_UI_CONTRACT.flat2dUiAllowed,false);
});
test('Roblox ScreenGui, SurfaceGui and text labels fail even in preexisting game files',()=>{
  for(const source of [
    'local gui = Instance.new("ScreenGui")\ngui.Parent = player.PlayerGui',
    'local a = Instance.new("SurfaceGui")\na.Adornee = part',
    'local a=Instance.new("TextLabel")\na.Text="1,000"',
    'local a = Instance.new("ViewportFrame")'
  ]){
    const audit=auditNative3dOnlyUiSource({target:'roblox',
      sources:[{path:'roblox-games/old-game/client/Game.client.luau',content:source}]});
    assert.equal(audit.pass,false,source);
    assert.ok(audit.issues.some(row=>row.reason==='ROBLOX_VISIBLE_2D_GUI'));
  }
  const valid=auditNative3dOnlyUiSource({target:'roblox',sources:[{
    path:'roblox-games/converted/client/Game.client.luau',
    content:'local worldText = Instance.new("MeshPart")\nworldText.Parent = workspace\n-- 3D glyph model + raycast binding must be checked at runtime'
  }]});
  assert.equal(valid.pass,true);
  assert.equal(valid.runtimeVerified,false);
});
test('Web DOM HUD, HTML controls, CSS fake 3D, sprites and canvas 2D fail',()=>{
  for(const source of [
    '<div id="hud">HP</div>',
    '<button>Attack</button>',
    'const ctx=canvas.getContext("2d"); ctx.fillText("HP",1,1);',
    'import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";',
    'const label = document.createElement("span");',
    'const billboard = new SpriteText("HP");'
  ]){
    const audit=auditNative3dOnlyUiSource({target:'web',
      sources:[{path:'web-games/legacy/index.html',content:source}]});
    assert.equal(audit.pass,false,source);
    assert.ok(audit.issues.length,source);
  }
  const valid=auditNative3dOnlyUiSource({target:'web',sources:[{
    path:'web-games/native/index.js',
    content:"const mesh=new THREE.Mesh(geometry, material); scene.add(mesh); const raycaster = new THREE.Raycaster();"
  }]});
  assert.equal(valid.pass,true);
  assert.equal(valid.runtimeVerified,false);
});
test('3D screen craft is geometry/render contract, never 2D pixel-layout as final UI',()=>{
  const craft=buildVibePresentationCraft({game:{name:'world-adventure'},surface:'INVENTORY',
    components:[{id:'item-detail',width:160,height:220}]});
  assert.equal(craft.native3dUi.visibleRenderMode,'ENGINE_NATIVE_3D_MESH_WITH_DEPTH_TEST');
  assert.equal(craft.layoutIsPlanningMathNotRendered2d,true);
  assert.equal(craft.actual3dGeometryImplementationRequired,true);
  assert.ok(craft.native3dUi.forbiddenVisibleUi.includes('SCREEN_GUI'));
});
test('entire existing game directory is audited even when editing only an unrelated 3D file',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-native3d-'));
  try{
    const base=path.join(root,'web-games','old-game');
    fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
    fs.mkdirSync(base,{recursive:true});
    fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),
      JSON.stringify({livingMotionVisualQualityContract:{minimumSpatialPresentation:policy}}));
    fs.writeFileSync(path.join(base,'native-mesh.js'),
      'const mesh=new THREE.Mesh(geometry, material); scene.add(mesh);');
    fs.writeFileSync(path.join(base,'legacy-hud.js'),
      'const c=document.createElement("span"); document.body.appendChild(c);');
    const changed=['web-games/old-game/native-mesh.js'];
    const denied=runNative3dOnlyUiQa({root,changed});
    assert.equal(denied.pass,false);
    assert.equal(denied.existingGameSourcesIncluded,true);
    assert.ok(denied.blockers.some(row=>row.includes('legacy-hud.js')));
    fs.unlinkSync(path.join(base,'legacy-hud.js'));
    const after=runNative3dOnlyUiQa({root,changed});
    assert.equal(after.pass,true);
    assert.equal(after.runtimeVerified,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('worker explicitly prohibits every preexisting 2D UI and preserves gameplay/save authority',()=>{
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(worker,/native3dOnlyGameWorkerGuidance\(order\)/);
  assert.match(worker,/No grandfathering for previously playable 2D games/);
  assert.match(worker,/old.*2D.*NONCOMPLIANT|it is NONCOMPLIANT/i);
  assert.match(worker,/preserve existing gameplay\/authority and data compatibility/i);
});
