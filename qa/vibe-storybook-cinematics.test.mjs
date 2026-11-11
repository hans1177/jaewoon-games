import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibePerformanceTiming,createVibeStorybookWorld,vibeStorybookPresets} from '../assets/vibe-storybook-cinematics.mjs';
test('storybook environments include four original moods',()=>{
 assert.deepEqual(Object.keys(vibeStorybookPresets),['enchantedForest','sunsetVillage','moonlitRuins','emberVolcano']);
});
test('anticipation, action and settle phases preserve continuity',()=>{
 const t=createVibePerformanceTiming();
 assert.equal(t.sample(0).phase,'anticipation');
 assert.equal(t.sample(.2).phase,'action');
 assert.equal(t.sample(.5).phase,'settle');
 assert.equal(t.sample(1).phase,'done');
 assert.equal(t.sample(1).weight,1);
});

// [월드 디자인 감독] 기존 월드의 재질·안개·배경만 전환하며 맵 오브젝트를 재생성하지 않는다.
test('world director transitions existing regional materials without rebuilding objects',()=>{
 class Vec3{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}clone(){return new Vec3(this.x,this.y,this.z)}}
 class Color{constructor(hex=0){this.hex=hex}setHex(hex){this.hex=hex;return this}getHex(){return this.hex}lerp(other,t){this.hex=Math.round(this.hex+(other.hex-this.hex)*t);return this}}
 class Group{
  constructor(){this.children=[];this.position=new Vec3();this.rotation={x:0,z:0};this.scale={setScalar(){}}}
  add(x){this.children.push(x)}
  remove(x){this.children.splice(this.children.indexOf(x),1)}
  traverse(fn){fn(this);for(const x of this.children)x.traverse(fn)}
 }
 class Geo{dispose(){this.disposed=true}}
 class Mat{constructor({color}){this.color=new Color(color)}dispose(){}}
 class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
 class FogExp2{constructor(color,density){this.color=new Color(color);this.density=density}}
 const THREE={Group,Color,Mesh,FogExp2,MeshStandardMaterial:Mat,PlaneGeometry:Geo,CylinderGeometry:Geo,IcosahedronGeometry:Geo,SphereGeometry:Geo};
 const scene=new Group(),originalBackground=new Color(0x123),originalFog={original:true};
 scene.background=originalBackground;scene.fog=originalFog;
 const world=createVibeStorybookWorld(THREE,scene);
 const originalProps=world.root.children.slice();
 assert.equal(world.region,'enchantedForest');
 assert.equal(world.direction.mood,'forest-discovery');
 world.transitionRegion('moonlitRuins',.3);
 for(let i=0;i<4;i++)world.update(.1);
 assert.equal(world.region,'moonlitRuins');
 assert.equal(scene.background.getHex(),vibeStorybookPresets.moonlitRuins.background);
 assert.equal(scene.fog.color.getHex(),vibeStorybookPresets.moonlitRuins.fog);
 assert.deepEqual(world.root.children,originalProps);
 world.setReducedMotion(true);
 world.transitionRegion('emberVolcano',2);
 assert.equal(scene.background.getHex(),vibeStorybookPresets.emberVolcano.background);
 assert.throws(()=>world.transitionRegion('invented-region'),/Unknown storybook preset/);
 world.dispose();
 assert.equal(scene.background,originalBackground);
 assert.equal(scene.fog,originalFog);
});
