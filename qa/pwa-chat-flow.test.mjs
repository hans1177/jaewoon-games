import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const command=fs.readFileSync('command.html','utf8');
const emergency=fs.readFileSync('emergency-ai.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function inlineScript(html){
  const matches=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return matches.at(-1)?.[1]||'';
}

test('PWA chat orders tasks and messages chronologically instead of reversing the list',()=>{
  assert.match(command,/function chronological\(rows\)/);
  assert.match(command,/const ordered=chronological\(tasks\)/);
  assert.match(command,/return chronological\(rows\)\.filter/);
  assert.doesNotMatch(command,/\[\.\.\.tasks\]\.reverse\(\)/);
});

test('PWA chat follows latest only while the reader is already at the bottom',()=>{
  assert.match(command,/let didInitialRender=false,followLatest=true/);
  assert.match(command,/function isNearBottom\(\)/);
  assert.match(command,/keepFollowing=!didInitialRender\|\|followLatest\|\|isNearBottom\(\)/);
  assert.match(command,/\$\('chat'\)\.addEventListener\('scroll'/);
  assert.match(command,/id="jumpBottom"/);
  assert.match(command,/\$\('jumpBottom'\)\.addEventListener\('click',scrollBottom\)/);
});

test('automatic emergency mode notices are not rendered as chat messages',()=>{
  assert.match(command,/function hiddenAutomaticNotice\(row\)/);
  assert.match(emergency,/function isAutomaticModeNotice\(row\)/);
  assert.doesNotMatch(emergency,/응\. 비상 AI로 연결돼 있어\./);
  assert.doesNotMatch(emergency,/\.chat\{display:flex!important;flex-direction:column!important\}/);
  assert.doesNotMatch(emergency,/scrollToBottomBtn.*createElement/);
});

test('emergency local history is transient and queued directives replay without a visible emergency prefix',()=>{
  assert.match(emergency,/if\(queue\(\)\.length\)flushQueue\(\);else clearLocalHistory\(\)/);
  assert.match(emergency,/if\(remoteState==='online'&&!queue\(\)\.length\)clearLocalHistory\(\)/);
  assert.match(emergency,/body\.value=item\.text/);
  assert.doesNotMatch(emergency,/\[비상 AI 대기 지시\]/);
});

test('inline command script parses and service worker cache is refreshed',()=>{
  assert.doesNotThrow(()=>new Function(inlineScript(command)));
  assert.match(sw,/jaewoon-pwa-v19/);
  assert.match(sw,/['"]\/emergency-ai\.js['"]/);
});