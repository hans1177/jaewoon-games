import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';
import {evaluateGameplayEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const playable=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Test</h1><p id="status">score 0</p><button id="act">Act</button><script>let score=0;document.querySelector('#act').addEventListener('click',()=>{score++;document.querySelector('#status').textContent='score '+score;});</script>${'x'.repeat(1600)}</body></html>`;

test('bootstrap contract accepts self-contained interactive stateful html',()=>{
  const result=validateBootstrapHtml(playable);
  assert.equal(result.pass,true,result.blockers.join(','));
});

test('bootstrap contract rejects external network and persistent storage',()=>{
  const bad=playable.replace('</script>',";localStorage.setItem('x','1');fetch('https://example.com/x');</script>");
  const result=validateBootstrapHtml(bad);
  assert.equal(result.pass,false);
  assert.ok(result.blockers.includes('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP'));
  assert.ok(result.blockers.includes('NETWORK_API_FORBIDDEN'));
});

test('gameplay evidence requires real interaction and observable state change',()=>{
  const before={text:'score 0',visibleButtons:1,canvases:[],dataState:[],scrollWidth:390,viewportWidth:390};
  const after={...before,text:'score 3'};
  const pass=evaluateGameplayEvidence({before,after,interactionCount:3,reloadVisible:true});
  assert.equal(pass.pass,true,pass.blockers.join(','));
  const fail=evaluateGameplayEvidence({before,after:before,interactionCount:0,reloadVisible:true});
  assert.equal(fail.pass,false);
  assert.ok(fail.blockers.includes('NO_GAMEPLAY_INTERACTION_DELIVERED'));
  assert.ok(fail.blockers.includes('NO_OBSERVABLE_GAME_STATE_CHANGE'));
});
