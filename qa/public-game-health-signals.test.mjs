import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPlayableDocument,summarizeFrameSignals} from '../tools/public-game-health-signals.mjs';

test('raw JavaScript rendered as body text is not a playable game',()=>{
  const signals=summarizeFrameSignals([{text:577,canvas:0,interactive:0,visual:0}]);
  assert.deepEqual(assessPlayableDocument({hasDoctype:false,htmlElement:true,...signals}),{
    documentShapeOk:false,
    playableSurfaceSignal:false,
    contentSignal:false,
  });
});

test('same-origin iframe controls count as a playable surface',()=>{
  const signals=summarizeFrameSignals([
    {text:31,canvas:0,interactive:0,visual:1},
    {text:120,canvas:1,interactive:6,visual:0},
  ]);
  assert.equal(signals.canvas,1);
  assert.equal(signals.interactive,6);
  assert.equal(assessPlayableDocument({hasDoctype:true,htmlElement:true,...signals}).contentSignal,true);
});

test('doctype plus static text alone cannot pass gameplay health',()=>{
  const signals=summarizeFrameSignals([{text:900,canvas:0,interactive:0,visual:0}]);
  const result=assessPlayableDocument({hasDoctype:true,htmlElement:true,...signals});
  assert.equal(result.documentShapeOk,true);
  assert.equal(result.playableSurfaceSignal,false);
  assert.equal(result.contentSignal,false);
});
