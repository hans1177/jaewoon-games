import test from 'node:test';
import assert from 'node:assert/strict';
import {AXES,auditFiveAxes} from '../tools/vibe-five-axis-evidence-audit.mjs';
const revision='test-sha';
function fixture(){const axes={};for(const [axis,fields] of Object.entries(AXES)){axes[axis]={};for(const field of fields){axes[axis][field]={sourceRevision:revision,artifact:'ci://fixture',scenario:'deterministic fixture',observed:true,passed:true,...(['frameTimeP95Ms','frameTimeP99Ms','peakMemoryMb','streamingStallP95Ms'].includes(field)?{value:1,maxAllowed:2}:field==='deviceProfile'?{value:'fixture-device'}:{})};}}return {sourceRevision:revision,axes};}
test('unknown without observed revision-bound evidence',()=>{const r=auditFiveAxes({sourceRevision:revision});assert.equal(r.overall,'UNKNOWN');assert.equal(r.releaseAuthority,false);});
test('all five axes pass with complete evidence',()=>{const r=auditFiveAxes(fixture());assert.equal(r.overall,'PASS');assert.equal(Object.keys(r.axes).length,5);assert.equal(r.releaseAuthority,false);});
test('a real performance threshold breach fails',()=>{const f=fixture();f.axes.worldPerformance.frameTimeP99Ms.value=3;const r=auditFiveAxes(f);assert.equal(r.overall,'FAIL');assert.deepEqual(r.axes.worldPerformance.failures,['frameTimeP99Ms']);});
test('stale or missing evidence never becomes a pass',()=>{const f=fixture();f.axes.combatAi.pathfinding.sourceRevision='old';assert.equal(auditFiveAxes(f).axes.combatAi.status,'UNKNOWN');delete f.axes.integration.regression;assert.equal(auditFiveAxes(f).axes.integration.status,'UNKNOWN');});
test('unobserved assertion is not evidence',()=>{const f=fixture();f.axes.animation.hitReaction.observed=false;assert.equal(auditFiveAxes(f).axes.animation.status,'UNKNOWN');});
