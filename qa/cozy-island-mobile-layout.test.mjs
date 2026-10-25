// 포근섬 모바일 UI: 가로·세로 시스템 메뉴와 저장 인터페이스 복구 방지 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync('web-games/cozy-island/'+name,'utf8');
test('포근섬 시스템 버튼과 5개 메뉴 탭은 항상 DOM에 남는다',()=>{
 const html=read('index.html'),handler=read('kingdom-system.js');
 assert.match(html,/<button id="systemCommand"[^>]*aria-controls="systemDialog"[^>]*>⚙️ 시스템<\/button>/);
 assert.match(html,/<dialog id="systemDialog"/);
 for(const tab of ['game','map','diplomacy','multiplayer','sound'])assert.match(html,new RegExp('data-tab="'+tab+'"'));
 assert.match(handler,/#systemCommand/);
 assert.match(handler,/dialog\.showModal\(\)/);
 assert.match(handler,/data-action/);
});
test('모바일 상단은 시스템 버튼을 잘라내지 않고 별도 줄로 배치한다',()=>{
 const css=read('style.css');
 assert.doesNotMatch(css,/\.hud-main\.right\s*\{[^}]*max-width:\s*30vw/);
 assert.match(css,/#systemCommand\s*\{[^}]*display:inline-flex/);
 assert.match(css,/\.hud\{[^}]*flex-direction:column/);
 assert.match(css,/\.hud-main\.right\{[^}]*max-width:100%/);
});
test('세로모드는 하단 3×2 명령과 스크롤 시스템 창을 제공한다',()=>{
 const css=read('style.css'),renderer=read('render-v3.js');
 assert.match(css,/@media \(orientation:portrait\) and \(max-width:600px\)/);
 assert.match(css,/\.strategy-bar\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.system-dialog\[open\]\{display:flex\}/);
 assert.match(css,/\.system-tabs\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(renderer,/this\.height>this\.width\?\.5:\.6/);
});
test('가로모드는 6개 한 줄 명령과 가로 5개 메뉴 탭을 제공한다',()=>{
 const css=read('style.css');
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:600px\)/);
 assert.match(css,/\.strategy-bar\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/\.system-tabs\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\.system-body\{[^}]*overflow:auto/);
 assert.match(css,/\.hud-main\.right\{[^}]*min-width:max-content/);
});
test('수동 저장 구조는 기존 슬롯과 키를 유지한다',()=>{
 const js=read('kingdom-system.js');
 assert.match(js,/jaewoon-cozy:manual:/);
 assert.match(js,/jaewoon-games:cozy-island/);
 assert.match(js,/saveSlot/);
 assert.match(js,/loadSlot/);
});
