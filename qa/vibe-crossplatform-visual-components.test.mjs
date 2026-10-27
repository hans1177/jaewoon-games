// Native visual-craft regression: synthetic layouts/DOM are not runtime screenshot proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VIBE_PRESENTATION_EFFECT_PATTERNS,
  createVibeVisualMaterialRecipe,
  optimizeVibeScreenLayout,placeVibeTooltip,
  buildVibePresentationCraft,planVibePresentationAutopilot,resolveVibeContextualHud
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
  assert.ok(src.includes('surface.ScaleType = (typeof(options.sliceCenter) == "Rect" or (options.surfaceTexture == nil and theme.PanelTexture ~= "")) and Enum.ScaleType.Slice or Enum.ScaleType.Stretch'), 'explicit crop or registered theme skin enables Slice; other textures remain Stretch');
  assert.ok(src.includes('surface.SliceCenter = typeof(options.sliceCenter) == "Rect" and options.sliceCenter or Rect.new(128,128,1126,1126)'), 'preserve current theme-slice fallback and explicit crop');
  const js=fs.readFileSync('assets/jaewoon-graphics-engine.js','utf8');
  assert.match(js,/createWebPresentationController/);
  assert.match(js,/confirmed!==true/);
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(worker,/CreateVisualFeedbackController/);
  assert.match(worker,/createWebPresentationController/);
  assert.match(worker,/visualCraftWorkerGuidance\(order,context\)/);
  assert.match(worker,/planVibePresentationAutopilot\(/);
});
