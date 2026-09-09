import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry='web-games/bug-defense/index.html';
const game='web-games/bug-defense/game.html';

test('bug defense public entry stays inside its nested web-game path',()=>{
  assert.equal(fs.existsSync(entry),true);
  assert.equal(fs.existsSync(game),true);
  const html=fs.readFileSync(entry,'utf8');
  assert.match(html,/src=["']game\.html["']/);
  assert.doesNotMatch(html,/\b(?:src|href)=["']\/assets\//);
  assert.doesNotMatch(html,/\b(?:src|href)=["']\/game\.html["']/);
  assert.doesNotMatch(html,/__VINEXT|index-YHuVA7cb|rolldown-runtime-S-ySWqyJ/);
});
