import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const homepage=fs.readFileSync('assets/homepage-enhancements.js','utf8');
const homepageShell=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const touch=fs.readFileSync('web-games/_shared/touch-controls.js','utf8');
test('homepage uses touch/click direct launch without keyboard launch wiring',()=>{assert.match(homepage,/dataset\.touchLaunch='true'/);assert.match(homepage,/window\.location\.href=target/);assert.doesNotMatch(homepage,/addEventListener\('keydown'/);assert.doesNotMatch(homepage,/tabindex="0"/);});
test('all Web HTML routes receive touch controls',()=>{assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/'\)/);assert.match(worker,/\/web-games\/_shared\/touch-controls\.js/);assert.match(worker,/injectUniversalTouchControls/);});
test('homepage mobile layout keeps the current touch carousel and large primary target',()=>{
  assert.match(homepageShell,/@media\(max-width:700px\)/);
  assert.match(homepageShell,/\.gameShelfGrid\{display:flex;gap:10px;overflow-x:auto/);
  assert.match(homepageShell,/\.foldGameCard\{flex:0 0 78vw;max-width:320px/);
  assert.match(homepageShell,/\.homeFocusBtn\{width:100%;min-height:46px/);
  assert.match(homepageShell,/\.foldGameActions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('touch layer provides joystick only while skipping native sticks',()=>{assert.match(touch,/#joy/);assert.match(touch,/#joystick/);assert.match(touch,/jaewoon:joystick/);assert.doesNotMatch(touch,/jg-action-a/);assert.doesNotMatch(touch,/jg-action-b/);assert.doesNotMatch(touch,/>A<|>B</);assert.match(touch,/pointerdown/);assert.match(touch,/pointermove/);});


const daechungRpg=fs.readFileSync('web-games/daechung-rpg/rpg.html','utf8');
const lineDefense=fs.readFileSync('web-games/line-defense/index.html','utf8');
const inlineScript=html=>{const m=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(m,'inline script missing');return m[1]};

test('daechung RPG native joystick uses pointer capture for mobile movement',()=>{
  assert.match(daechungRpg,/joyEl\.addEventListener\('pointerdown'/);
  assert.match(daechungRpg,/setPointerCapture\(e\.pointerId\)/);
  assert.match(daechungRpg,/joyEl\.addEventListener\('pointermove'/);
  assert.match(daechungRpg,/j\.x=dx\/m;j\.y=dy\/m/);
  assert.doesNotMatch(daechungRpg,/pointerType==='touch'.*return/);
});

test('line defense start script parses and unit table is declared once',()=>{
  assert.equal((lineDefense.match(/const U=/g)||[]).length,1);
  assert.doesNotThrow(()=>new Function(inlineScript(lineDefense)));
  assert.match(lineDefense,/q\('start'\)\.addEventListener\('click',start\)/);
});
