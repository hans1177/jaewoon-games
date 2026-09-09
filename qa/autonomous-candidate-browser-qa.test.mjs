// 파일명: qa/autonomous-candidate-browser-qa.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBrowserSignals } from '../tools/autonomous-candidate-browser-qa.mjs';

test('clean load and reload passes browser signal gate',()=>{
  const result=summarizeBrowserSignals({metrics:{bodyVisible:true,width:390},reloadMetrics:{bodyVisible:true,width:390}});
  assert.equal(result.pass,true);
  assert.deepEqual(result.errors,[]);
});

test('console, request or invisible body failures block candidate',()=>{
  const result=summarizeBrowserSignals({consoleErrors:['boom'],failedRequests:['GET missing.png'],metrics:{bodyVisible:false,width:0},reloadMetrics:{bodyVisible:true,width:390}});
  assert.equal(result.pass,false);
  assert.ok(result.errors.some(x=>x.startsWith('console:')));
  assert.ok(result.errors.some(x=>x.startsWith('request:')));
  assert.ok(result.errors.includes('layout:body-not-visible'));
});
