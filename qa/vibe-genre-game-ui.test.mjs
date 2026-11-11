import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVibeGameUi,vibeGenrePanels,validateVibeUiSettings} from '../assets/vibe-genre-game-ui.mjs';
import {mountVibeGenreUi} from '../assets/vibe-genre-game-ui-browser.mjs';
test('all genres provide five distinct functional menu slots',()=>{
 assert.equal(Object.keys(vibeGenrePanels).length,10);
 for(const panels of Object.values(vibeGenrePanels))assert.equal(panels.length,5);
});
test('switching genre replaces available panels',()=>{
 const ui=createVibeGameUi({genre:'wuxia'});assert.ok(ui.panels().some(x=>x.id==='martialArts'));
 ui.selectGenre('voxel');assert.ok(ui.panels().some(x=>x.id==='crafting'));
 assert.throws(()=>ui.open('martialArts'));
});
test('settings clamp volume and persist safe values',()=>{
 const ui=createVibeGameUi();ui.setSettings({masterVolume:8,textScale:.2,reducedMotion:true});
 assert.equal(ui.settings.masterVolume,1);assert.equal(ui.settings.textScale,.8);
 const restored=createVibeGameUi();assert.ok(restored.restore(ui.serialize()));assert.equal(restored.settings.reducedMotion,true);
 assert.equal(restored.restore('invalid-json'),false);
});

// [메인: 모바일 UI] 브라우저 모의 DOM에서 실제 메뉴 아이콘·접근성·옵션을 검증한다.
test('browser menu draws consistent equipment vector icons and respects accessibility settings',()=>{
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.hidden=false;this.listeners={};
   const classes=new Set();
   this.classList={toggle:(name,enabled)=>{if(enabled)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)};
  }
  setAttribute(name,value){this.attributes[name]=String(value)}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  addEventListener(name,callback){this.listeners[name]=callback}
  remove(){this.removed=true}
 }
 const documentRef={
  head:new Element('head'),body:new Element('body'),defaultView:null,
  createElement:tag=>new Element(tag),
  createElementNS:(_,tag)=>new Element(tag),
  createTextNode:text=>({tagName:'#text',textContent:text})
 };
 const view=mountVibeGenreUi({documentRef,genre:'fantasy'});
 const root=documentRef.body.children[0],panel=root.children[1],grid=panel.children[1];
 const iconButtons=grid.children.filter(el=>el.children.some(child=>child.tagName==='svg'));
 assert.ok(iconButtons.length>=2);
 for(const btn of iconButtons){
  const icon=btn.children.find(child=>child.tagName==='svg');
  assert.equal(icon.attributes['aria-hidden'],'true');
  assert.equal(icon.attributes.viewBox,'0 0 24 24');
  assert.ok(icon.children[0].attributes.d);
 }
 const inventory=iconButtons.find(btn=>btn.children.some(n=>n.textContent==='가방'));
 assert.ok(inventory);inventory.listeners.click();
 assert.equal(view.ui.openPanel,'inventory');
 view.ui.setSettings({highContrast:true,textScale:1.3});
 view.render();
 assert.equal(root.classList.contains('vibe-contrast'),true);
 assert.equal(root.style.fontSize,'18.2px');
 view.setGenre('wuxia');
 assert.ok(panel.children[1].children.some(el=>el.children.some(n=>n.tagName==='svg')));
 view.dispose();
 assert.ok(root.removed);
});
