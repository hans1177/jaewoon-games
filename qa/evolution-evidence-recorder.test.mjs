import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvolutionEvidence} from '../tools/evolution-evidence-recorder.mjs';

test('verified QA can create learning evidence',()=>{const row=buildEvolutionEvidence({id:'e1',type:'VIBE2',patternId:'safe-candidate',gameId:'P0001',outcome:'SUCCESS',delta:0,sourceRevision:'abc',independentQaPass:true,evidence:['candidate-review','vibe-regression']});assert.equal(row.verified,true);assert.equal(row.selfPromote,false);assert.equal(row.publicRelease,false);});
test('unreviewed evidence is rejected',()=>assert.throws(()=>buildEvolutionEvidence({id:'e1',type:'VIBE2',patternId:'x',gameId:'P0001',outcome:'SUCCESS',sourceRevision:'abc',independentQaPass:false,evidence:['x']}),/독립 QA/));
test('success with blockers is rejected',()=>assert.throws(()=>buildEvolutionEvidence({id:'e1',type:'QA',patternId:'x',gameId:'P0001',outcome:'SUCCESS',sourceRevision:'abc',independentQaPass:true,evidence:['x'],blockers:['CONTROL_REGRESSION']}),/blocker/));
