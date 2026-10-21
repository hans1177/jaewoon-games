import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Runs the shipped game's own inline script with a minimal event/DOM harness.
// No invented gameplay PASS: this proves only control-state logic, not a browser release.
const html=fs.readFileSync('web-games/seed-action-survival-rogu-echoes-of-the-lost-star/index.html','utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]?.replace(/^\s*import\s*\{createStar3d\}\s*from\s*'\.\/star3d\.mjs';\s*/,'');
test('Star Echo mobile joystick is single-pointer and releases on pause/blur/lost capture',()=>{
  assert.ok(script,'real game script present');
  assert.match(html,/\.joystick\{[^}]*touch-action:none/);
  const nodes=new Map(), globalEvents=new Map(), documentEvents=new Map();
  const node=id=>{
    if(!nodes.has(id)){
      const listeners=new Map(),classes=new Set();
      const item={
        style:{},className:'',textContent:'',innerHTML:'',width:0,height:0,
        classList:{
          add:name=>classes.add(name),remove:name=>classes.delete(name),
          toggle:(name,enabled)=>{if(enabled)classes.add(name);else classes.delete(name)},
          contains:name=>classes.has(name)
        },
        addEventListener:(type,fn)=>listeners.set(type,fn),
        dispatch:(type,e={})=>listeners.get(type)?.(e),
        setPointerCapture:()=>{},
        getBoundingClientRect:()=>({left:0,top:0,width:116,height:116}),
        appendChild:()=>{},getContext:()=>({setTransform:()=>{}})
      };
      nodes.set(id,item);
    }
    return nodes.get(id);
  };
  const document={
    hidden:false,getElementById:node,createElement:tag=>node('created-'+tag),
    addEventListener:(type,fn)=>documentEvents.set(type,fn)
  };
  const sandbox={
    document,window:{},innerWidth:390,innerHeight:750,devicePixelRatio:1,
    performance:{now:()=>1},requestAnimationFrame:()=>{},
    addEventListener:(type,fn)=>globalEvents.set(type,fn),
    createStar3d:()=>({render(){},resize(){}})
  };
  vm.runInNewContext(script,sandbox,{timeout:1000});
  node('startBtn').onclick();
  const joystick=node('joystick'),stick=node('stick'),neutral='translate(0,0)';
  const pointer=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
  joystick.dispatch('pointerdown',pointer(1,95,58));
  const first=stick.style.transform;
  assert.notEqual(first,neutral,'first finger drives the game stick');
  joystick.dispatch('pointerdown',pointer(2,6,58));
  joystick.dispatch('pointermove',pointer(2,6,10));
  assert.equal(stick.style.transform,first,'second finger may not steal first finger');
  joystick.dispatch('pointerup',pointer(2,6,10));
  assert.equal(stick.style.transform,first,'unrelated pointer up does not stop the first finger');
  joystick.dispatch('pointercancel',pointer(1,95,58));
  assert.equal(stick.style.transform,neutral,'cancel resets visible movement input');
  joystick.dispatch('pointerdown',pointer(3,95,58));
  node('pauseBtn').onclick();
  assert.equal(stick.style.transform,neutral,'pause must neutralize held motion');
  assert.ok(node('pauseOverlay').classList.contains('show'));
  node('resumeBtn').onclick();
  joystick.dispatch('pointerdown',pointer(4,95,58));
  joystick.dispatch('lostpointercapture',pointer(4,95,58));
  assert.equal(stick.style.transform,neutral,'lost pointer capture resets input');
  joystick.dispatch('pointerdown',pointer(5,95,58));
  globalEvents.get('blur')?.();
  assert.equal(stick.style.transform,neutral,'window focus loss resets input');
  joystick.dispatch('pointerdown',pointer(6,95,58));
  document.hidden=true;
  documentEvents.get('visibilitychange')?.();
  assert.equal(stick.style.transform,neutral,'hidden tab cannot keep ghost input');
  node('restartBtn').onclick();
  assert.equal(stick.style.transform,neutral,'restart has no stale joystick state');
});
