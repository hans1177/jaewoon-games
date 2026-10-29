// 파일명: qa/vibe2-complex-intent.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileVibe2ComplexIntent,compileComplexOwnerIntent,parseIntentExpression} from '../tools/vibe2-complex-intent.mjs';
const compile=goal=>compileComplexOwnerIntent({order:{gameId:'line-defense',ownerApproved:true,goal},baseRevisionSha:'a'.repeat(40)});
test('Korean and English owner clauses produce stable bounded requirements without inventing facts',()=>{
 for(const text of [
  '함수 hit에서 a.dead 또는 t.dead이면 중단해',
  'In function hit return when a.dead or t.dead',
  '함수 team의 f 반복에서 f.dead이면 중단해',
  '함수 collect에서 give 호출 뒤 render를 호출해',
  '함수 update에서 state.hp를 0에서 100까지 제한해',
  '함수 update에서 state.ready이면 state.active를 true로 설정해',
 ]){
  const first=compile(text),second=compile(text);
  assert.equal(first.unresolved.length,0,text);assert.equal(first.requirements.length,1);
  assert.equal(first.requestId,second.requestId);assert.equal(first.requirements[0].ownerText,text);
  assert.equal(first.sourceWrite,false);assert.equal(first.runtimeVerified,false);
 }
 const batch=compile('함수 hit에서 a.dead이면 중단해; 함수 award에서 t.dead이면 중단해');
 assert.equal(batch.requirements.length,2);
});
test('no owner scope, unknown goals, duplicate clauses and executable expressions cannot become approved plans',()=>{
 const no=compileComplexOwnerIntent({order:{goal:'함수 hit에서 a.dead이면 중단해'}});
 assert.equal(no.ownerDirectiveReference.verifiedFromOwnerOrder,false);
 assert.ok(no.unresolved.some(r=>r.code==='NO_OWNER_SPEC'));
 for(const text of ['몬스터 추가하고 알아서 좋은 그래픽으로 바꿔','함수 hit에서 process.exit()이면 중단해',
  '함수 hit에서 a.constructor이면 중단해','함수 hit에서 a.dead이면 중단해; 함수 hit에서 a.dead이면 중단해'])assert.ok(compile(text).unresolved.length,text);
 assert.throws(()=>parseIntentExpression('a.dead; process.exit()'));
 assert.throws(()=>parseIntentExpression('a["dead"]'));
 assert.throws(()=>parseIntentExpression('0/0'));
});

test('ordered natural-language call connectors retain exact owner text and grounded function sequence',()=>{
 const base={target:'web',sourceRoot:'web-games/line-defense',responsibleFiles:['index.html'],
  order:{selectedTask:{gameId:'line-defense',ownerDirective:true,goal:''}}};
 for(const goal of [
  '함수 event 실행 후 commitState 호출하고 render 호출해',
  '함수 event 실행 후 commitState 호출한 다음 render 호출해',
  '함수 event 실행 후 commitState 호출 후 render 호출해',
  'When function event runs, call commitState, then render',
  'When function event runs, call commitState, render'
 ]){
  const parsed=compileVibe2ComplexIntent({...base,order:{selectedTask:{...base.order.selectedTask,goal}}});
  assert.equal(parsed.ownerDirectiveReference.originalText,goal);
  assert.deepEqual(parsed.requirements.map(r=>r.effect),['commitState','render']);
  assert.equal(parsed.requirements[1].dependsOn[0],parsed.requirements[0].id);
  assert.equal(parsed.ownerDirectiveReference.verifiedFromOwnerOrder,true);
 }
 for(const goal of [
  '함수 event 실행 후 commitState 호출하고 process.exit 호출해',
  '함수 event 실행 후 commitState 호출하고 render를 추측해서 호출해',
  'When function event runs, call commitState, render, unknown, extra, fifth'
 ]){
  assert.equal(compileVibe2ComplexIntent({...base,order:{selectedTask:{...base.order.selectedTask,goal}}}),null);
 }
});


test('owner can request the existing state -> UI -> save function chain in Korean and English',()=>{
 for(const goal of [
  '함수 collect에서 mutate 호출 뒤 render 호출하고 save를 호출해',
  'In function collect, after mutate call render then save'
 ]){
  const intent=compile(goal);
  assert.equal(intent.unresolved.length,0,goal);
  assert.equal(intent.requirements.length,1);
  assert.equal(intent.requirements[0].operation,'existing-call');
  assert.equal(intent.requirements[0].after,'mutate');
  assert.deepEqual(intent.requirements[0].callees,['render','save']);
  assert.equal(intent.sourceWrite,false);
 }
 for(const goal of [
  '함수 collect에서 mutate 호출 뒤 render 호출하고 알수없는 저장을 호출해',
  'In function collect, after mutate call render then save then another',
  '함수 collect에서 mutate 호출 뒤 render 호출하고 process.exit 호출해'
 ])assert.ok(compile(goal).unresolved.length,goal);
 const unapproved=compileComplexOwnerIntent({order:{goal:'함수 collect에서 mutate 호출 뒤 render 호출하고 save를 호출해'}});
 assert.ok(unapproved.unresolved.some(row=>row.code==='NO_OWNER_SPEC'));
});
