import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_STAGES } from '../tools/vibe2-artbook-story-core.mjs';
import { normalizeCompactSeedStages } from '../tools/vibe2-compact-seed-normalizer.mjs';

test('normalizes duplicate weak-model stage labels without changing Vibe2 content',()=>{
  const phases=REQUIRED_STAGES.map((_,index)=>({stage:index<3?'OPENING':'ENDING',region:`지역${index}`,quest:`퀘스트${index}`,cause:`원인${index}`,playerAction:`행동${index}`,result:`결과${index}`}));
  const normalized=normalizeCompactSeedStages({phases,playerMotivation:'동기'});
  assert.equal(normalized.valid,true);
  assert.equal(normalized.normalized,true);
  assert.deepEqual(normalized.seed.phases.map(x=>x.stage),REQUIRED_STAGES);
  assert.deepEqual(normalized.seed.phases.map(x=>x.quest),phases.map(x=>x.quest));
  assert.equal(normalized.seed.playerMotivation,'동기');
});

test('rejects a compact seed with the wrong number of phases',()=>{
  const normalized=normalizeCompactSeedStages({phases:[{stage:'OPENING'}]});
  assert.equal(normalized.valid,false);
  assert.equal(normalized.reason,'phase-count-1');
});
