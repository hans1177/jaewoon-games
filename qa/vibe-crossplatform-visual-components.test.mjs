// Native visual-craft regression: synthetic layouts/DOM are not runtime screenshot proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VIBE_PRESENTATION_EFFECT_PATTERNS,
  createVibeVisualMaterialRecipe,
  optimizeVibeScreenLayout,placeVibeTooltip,
  buildVibePresentationCraft,planVibePresentationAutopilot,resolveVibeContextualHud,deriveVibeSourceVisualSystems,selectVibeSourceVisualPatterns,rankVibeVisualAssetBindings
} from '../assets/vibe-presentation-director.js';
import '../assets/jaewoon-graphics-engine.js';

function fakeDom(){
  const doc={createElement(name){
    const node={
      nodeName:name,style:{setProperty(name,value){this[name]=value;}},textContent:'',
      children:[],attrs:{},parentNode:null,
      setAttribute(key,value){this.attrs[key]=String(value);},
      appendChild(child){child.parentNode=this;this.children.push(child);return child;},
      removeChild(child){const i=this.children.indexOf(child);if(i>=0)this.children.splice(i,1);child.parentNode=null;},
      animate(frames,options){return {frames,options,cancel(){this.cancelled=true;},onfinish:null};}
    };
    return node;
  }};
  const host=doc.createElement('main');
  host.clientWidth=393;host.clientHeight=852;
  return {doc,host};
}
const getWeb=()=>globalThis.JaewoonGraphicsEngine.createWebPresentationController;

test('visual craft returns real pixel placements and source-safe material slots',()=>{
  const game={name:'forest-expedition',genre:'survival'},world={materials:['wood','leather','metal']};
  const craft=buildVibePresentationCraft({
    game,world,surface:'HUD',viewport:{width:393,height:852},
    components:[{id:'health',zone:'TOP',width:150,height:52,priority:3},
      {id:'actions',zone:'BOTTOM',width:160,height:58,priority:2}],
    focalRegion:{x:100,y:160,width:200,height:440}
  });
  assert.equal(craft.layout.pass,true);
  assert.equal(craft.grammar,'EDGE_BANDS');
  assert.equal(craft.materialRecipe.materialCues.length,3);
  assert.equal(craft.materialRecipe.assetIdsNotInvented,true);
  assert.equal(craft.materialRecipe.textureAssetIds.length,0);
  assert.notDeepEqual(craft.layout.placements[0],craft.layout.placements[1]);
  assert.ok(VIBE_PRESENTATION_EFFECT_PATTERNS.includes('DAMAGE_POPUP_POOL'));
  assert.ok(VIBE_PRESENTATION_EFFECT_PATTERNS.includes('ICON_STATE_MOTION'));
  const plan=planVibePresentationAutopilot({
    game,world,uiSurfaces:[{surface:'CRAFT',components:[{id:'recipe',width:170,height:210}]}]
  });
  assert.equal(plan.craftPlans[0].grammar,'RECIPE_GRAPH');
  assert.equal(plan.craftPlans[0].materialRecipe.materialCues[0].construction,'CARVED_JOINERY');
});
test('layout optimizer can pack 12 distinct badges without HUD overlaps',()=>{
  const components=Array.from({length:12},(_,i)=>({
    id:'visible-badge-'+i,width:98,height:42,priority:1,zone:'EDGE'
  }));
  const result=optimizeVibeScreenLayout({viewport:{width:480,height:320},components});
  assert.equal(result.pass,true);
  assert.equal(result.placements.length,12);
  for(let i=0;i<result.placements.length;i++){
    for(let j=i+1;j<result.placements.length;j++){
      const a=result.placements[i],b=result.placements[j];
      const intersectionWidth=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
      const intersectionHeight=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
      assert.equal(intersectionWidth*intersectionHeight,0,'visual layers must not collide');
    }
  }
});
test('visual optimizer fails closed on overlap, focal obstruction and invalid viewport',()=>{
  assert.equal(optimizeVibeScreenLayout({viewport:{width:0,height:50}}).pass,false);
  const r=optimizeVibeScreenLayout({viewport:{width:80,height:80},
    components:[{id:'a',width:80,height:80},{id:'b',width:80,height:80}]});
  assert.equal(r.pass,false);
  assert.ok(r.unresolved.length);
  const all=placeVibeTooltip({anchorRect:{x:346,y:740,width:40,height:46},
    tooltipSize:{width:180,height:90},viewport:{width:393,height:852}});
  assert.ok(all.x>=0&&all.x+all.width<=393);
  assert.ok(all.y>=0&&all.y+all.height<=852);
  assert.notEqual(all.placement,'BELOW');
});
test('web presentation makes real DOM nodes only for confirmed deduplicated damage events',()=>{
  const {host,doc}=fakeDom(),ctrl=getWeb()({host,documentRef:doc,maxDamagePopups:1,reducedMotion:true});
  assert.equal(ctrl.ready,true);
  assert.equal(ctrl.showDamage({eventId:'one',confirmed:false,amount:15,x:90,y:100}),false);
  assert.equal(ctrl.showDamage({eventId:'one',confirmed:true,amount:15,x:90,y:100}),true);
  assert.equal(ctrl.showDamage({eventId:'one',confirmed:true,amount:15,x:90,y:100}),false);
  assert.equal(ctrl.showDamage({eventId:'two',confirmed:true,amount:19,x:95,y:101}),false);
  assert.equal(ctrl.stats().activeDamage,1);
  assert.equal(ctrl.showTooltip({text:'<b>plain text</b>',anchorRect:{x:365,y:800,width:10,height:10}}),true);
  assert.equal(ctrl.stats().tooltipVisible,true);
  const overlay=host.children[0];
  assert.ok(overlay.children.some(node=>node.textContent==='<b>plain text</b>'));
  assert.equal(ctrl.notify({id:'quest-1',text:'목표 완료'}),true);
  assert.equal(ctrl.notify({id:'quest-1',text:'중복'}),false);
  const icon=doc.createElement('img');
  assert.equal(ctrl.animateIcon(icon,'ACTIVATE'),true);
  assert.equal(ctrl.animateIcon(icon,'READY'),true);
  assert.equal(ctrl.updateStatusIcon(icon,{remaining:4,total:8,stacks:3}),true);
  assert.equal(icon.attrs['data-vibe-stacks'],'3');
  assert.equal(icon.style['--vibe-status-ratio'],'0.5');
  const firstPopup=overlay.children.find(node=>node.nodeName==='span');
  assert.ok(firstPopup,'a confirmed hit must render a damage number');
  assert.ok(firstPopup.style.transform.includes('translate('));
  ctrl.destroy();assert.equal(host.children.length,0);
  assert.equal(ctrl.stats().destroyed,true);
});
test('contextual HUD emphasizes real action while keeping touch controls persistent',()=>{
  const focus=resolveVibeContextualHud({phase:'BOSS',viewport:{width:393,height:852},
    components:[{id:'health',role:'HEALTH',priority:1},{id:'boss',role:'BOSS',priority:1},
      {id:'quest',role:'QUEST',priority:1},{id:'action',role:'ACTION',touchControl:true}]});
  assert.deepEqual(focus.selected.map(row=>row.id),['action','boss','health','quest']);
  assert.equal(focus.existingTouchPositionsImmutable,true);
  assert.equal(focus.selected[1].emphasized,true);
});

test('both native platform adapters expose concrete event-safe visual abilities',()=>{
  const src=fs.readFileSync('assets/roblox/common-ui-v1/RobloxCommonUI.luau','utf8');
  for(const name of ['CreateVisualFeedbackController','ShowDamage','PositionTooltip','AnimateIcon','UpdateStatusIcon','Notify','CreateItemModelPreview']){
    assert.ok(src.includes(name),name);
  }
  assert.match(src,/event\.confirmed ~= true/);
  assert.match(src,/descendant:IsA\("BaseScript"\)/);
  assert.match(src,/model:GetBoundingBox\(\)/);
  assert.match(src,/seen\[id\]/);
  assert.match(src,/surface\.ScaleType = typeof\(options\.sliceCenter\)/);
  const js=fs.readFileSync('assets/jaewoon-graphics-engine.js','utf8');
  assert.match(js,/createWebPresentationController/);
  assert.match(js,/confirmed!==true/);
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(worker,/CreateVisualFeedbackController/);
  assert.match(worker,/createWebPresentationController/);
  assert.match(worker,/visualCraftWorkerGuidance\(order,context\)/);
  assert.match(worker,/planVibePresentationAutopilot\(/);
  assert.match(worker,/sourceGroundedPatterns:craft\.adaptiveProfiles/,'source worker must consume per-game pattern selection');
});

test('source-derived visual patterns differ by real gameplay system, not genre name or commented hints',()=>{
  const crafting=[{path:'web-games/forest/index.html',source:
    'const craftRecipe = getRecipe(); const inventory = items; function harvest(){ return gather(); }'}];
  const combat=[{path:'roblox-games/arena/Client.luau',source:
    'local bossPhase = 2; local damage = 10; local statusEffect = {}; local incomingAttack = false;'}];
  const fake=[{path:'web-games/empty/index.html',source:
    '<!-- bossPhase damage craft recipe --><script>// bossPhase damage craft recipe\nconst scene = true;</script>'}];
  const roleOnly=selectVibeSourceVisualPatterns({game:{genre:'combat RPG'},files:fake,surface:'HUD'});
  assert.equal(roleOnly.selected.some(x=>x.pattern==='DAMAGE_POPUP_POOL'),false);
  assert.equal(roleOnly.selected.some(x=>x.pattern==='BOSS_PHASE_TRANSITION'),false);
  const crafter=selectVibeSourceVisualPatterns({game:{genre:'boss raid'},files:crafting,surface:'CRAFT'});
  assert.ok(crafter.source.systems.includes('CRAFT'));
  assert.ok(crafter.selected.some(x=>x.pattern==='CRAFT_PROGRESS'));
  assert.ok(!crafter.selected.some(x=>x.pattern==='DAMAGE_POPUP_POOL'));
  const raid=selectVibeSourceVisualPatterns({game:{genre:'farming'},files:combat,surface:'BOSS'});
  assert.ok(raid.selected.some(x=>x.pattern==='DAMAGE_POPUP_POOL'));
  assert.ok(raid.selected.some(x=>x.pattern==='BOSS_PHASE_TRANSITION'));
  assert.ok(raid.selected.some(x=>x.pattern==='STATUS_DURATION_TRACK'));
  assert.ok(!raid.selected.some(x=>x.pattern==='CRAFT_PROGRESS'));
  assert.equal(raid.runtimeVerified,false);
  assert.equal(raid.source.gameplayStateVerified,false);
  assert.ok(raid.selected.every(x=>x.runtimeVerified===false));
  assert.deepEqual(deriveVibeSourceVisualSystems([{path:'notes.md',source:'bossPhase damage'}]).systems,[]);
});
test('licensed source-bound texture/model evidence gates native preview, sliced frame and atlas motion',()=>{
  const files=[{path:'web-games/rpg/index.html',
    source:'const inventory = []; const equipment = {}; const image = document.createElement("img");'}];
  const unverified={id:'invented',path:'assets/armor.glb',verified:false,
    licenseVerified:true,platformCompatible:true,sourceBound:true};
  const noProof=selectVibeSourceVisualPatterns({files,surface:'EQUIPMENT',assets:[unverified]});
  assert.ok(noProof.deferredForAssetProof.some(x=>x.pattern==='3D_ITEM_PREVIEW'));
  assert.ok(noProof.deferredForAssetProof.some(x=>x.pattern==='NINE_SLICE_SURFACE'));
  assert.ok(!noProof.eligibleAssetIds.length);
  const approved=[
    {id:'model-1',path:'assets/models/sword.glb',family:'WEAPON',role:'sword',verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true},
    {id:'panel-1',path:'assets/ui/panel.png',family:'UI',role:'panel',verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true,nineSliceVerified:true},
    {id:'icons-1',path:'assets/ui/atlas.webp',family:'UI',role:'icon_atlas',verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true,atlasFramesVerified:true},
    {id:'unsafe',path:'../broken.png',verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true}
  ];
  const selected=selectVibeSourceVisualPatterns({files,surface:'EQUIPMENT',assets:approved});
  assert.ok(selected.selected.some(x=>x.pattern==='3D_ITEM_PREVIEW'));
  assert.ok(selected.selected.some(x=>x.pattern==='NINE_SLICE_SURFACE'));
  assert.ok(selected.selected.some(x=>x.pattern==='ICON_ATLAS_ANIMATION'));
  assert.deepEqual(selected.eligibleAssetIds,['icons-1','model-1','panel-1']);
  assert.deepEqual(selected.matchedAssetIds,['icons-1','model-1','panel-1']);
  assert.equal(selected.sourceBindingsVerified,false,'planning must never imply game-specific runtime binding');
});
test('adaptive visual craft honors reduced motion and device budget without suppressing critical warnings',()=>{
  const files=[{path:'web-games/survival/index.js',
    source:'const attack = {}; const dangerZone = true; const skillSlot = 1;'}];
  const low=selectVibeSourceVisualPatterns({files,performanceTier:'LOW',surface:'COMBAT',viewport:{width:375,height:812}});
  assert.equal(low.motion.mode,'ECONOMY');
  assert.equal(low.motion.maxConcurrentDecorativeEffects,4);
  const reduced=selectVibeSourceVisualPatterns({files,reducedMotion:true,surface:'COMBAT'});
  assert.equal(reduced.motion.mode,'REDUCED');
  assert.equal(reduced.motion.maxConcurrentDecorativeEffects,0);
  assert.equal(reduced.motion.preserveTelegraph,true);
  assert.equal(reduced.selected.some(x=>x.pattern==='TELEGRAPH_PRIORITY'),true);
  const plan=planVibePresentationAutopilot({
    files,game:{name:'green-forest'},performanceTier:'LOW',
    uiSurfaces:[{surface:'COMBAT',components:[]},{surface:'CRAFT',components:[]}]
  });
  assert.deepEqual(plan.adaptiveProfiles.map(x=>x.surface),['COMBAT','CRAFT']);
  assert.ok(plan.adaptiveProfiles[0].selected.some(x=>x.pattern==='DAMAGE_POPUP_POOL'));
  assert.ok(!plan.adaptiveProfiles[1].selected.some(x=>x.pattern==='CRAFT_PROGRESS'));
  assert.equal(plan.craftPlans.length,plan.adaptiveProfiles.length);
});

test('existing mobile touch controls remain pinned; impossible safe-area positions fail closed',()=>{
  const fixed={id:'attack-control',touchControl:true,zone:'BOTTOM',priority:100,
    width:72,height:72,preferredRect:{x:290,y:710,width:72,height:72}};
  const normal={id:'quest-chip',zone:'TOP',width:100,height:38,priority:10};
  const valid=optimizeVibeScreenLayout({
    viewport:{width:393,height:852},safeInsets:{bottom:22,left:8,right:8,top:20},
    components:[fixed,normal],focalRegion:{x:75,y:190,width:220,height:420}
  });
  assert.equal(valid.pass,true);
  assert.deepEqual(valid.placements.find(x=>x.id==='attack-control').x,290);
  assert.deepEqual(valid.placements.find(x=>x.id==='attack-control').y,710);
  const broken=optimizeVibeScreenLayout({
    viewport:{width:393,height:852},safeInsets:{bottom:80,right:12},
    components:[fixed,normal]
  });
  assert.equal(broken.pass,false,'unsafe bottom control cannot silently move under player finger');
  assert.ok(broken.unresolved.includes('attack-control'));
});

test('game-specific asset ranking uses roles before styles and never promotes a tree to item preview',()=>{
  const assets=[
    {id:'tree',path:'assets/tree.glb',family:'ENVIRONMENT',role:'tree',
      verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true},
    {id:'neutral',path:'assets/sword.glb',family:'WEAPON',role:'sword',
      verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true},
    {id:'forest',path:'assets/sword-forest.glb',family:'WEAPON',role:'sword',
      style:'forest moss',verified:true,licenseVerified:true,platformCompatible:true,sourceBound:true}
  ];
  const ranked=rankVibeVisualAssetBindings({assets,surface:'EQUIPMENT',game:{genre:'forest survival'},world:{materials:['moss']}});
  assert.deepEqual(ranked.selectedAssetIds,['forest','neutral']);
  assert.equal(ranked.candidates[0].identityMatches.includes('forest'),true);
  const noWeapon=selectVibeSourceVisualPatterns({
    files:[{path:'web-games/forest/index.js',source:'const equipment = [];'}],
    surface:'EQUIPMENT',assets:[assets[0]]
  });
  assert.equal(noWeapon.selected.some(x=>x.pattern==='3D_ITEM_PREVIEW'),false);
  assert.ok(noWeapon.deferredForAssetProof.some(x=>x.pattern==='3D_ITEM_PREVIEW'));
  assert.deepEqual(noWeapon.eligibleAssetIds,['tree'],'licensed tree remains eligible elsewhere');
  assert.deepEqual(noWeapon.matchedAssetIds,[],'but tree is not a suitable equipment model');
});
