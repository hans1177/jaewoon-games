import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');

test('DESIGN_ONLY pipeline is GAME_SEED-backed design -> baseline -> artbook',()=>{
  const fact=source.indexOf("await run('tools/artbook-fact-pack.mjs')");
  const design=source.search(/await run(?:WithRetry)?\('tools\/company-design-cycle\.mjs'/);
  const gate=source.indexOf("await run('tools/company-baseline-gate.mjs')",design);
  const artbook=source.indexOf("await run('tools/company-design-artbook.mjs')",gate);
  assert.ok(fact>=0,'FACT PACK stage missing');
  assert.ok(design>fact,'design cycle must run after FACT PACK');
  assert.ok(gate>design,'DESIGN_BASELINE gate must run after design revision');
  assert.ok(artbook>gate,'artbook must run only after baseline gate');
  assert.match(source,/activeSeedForGame/);
  assert.match(source,/DESIGN_BASELINE_READY/);
  assert.match(source,/DESIGN_ONLY_VIBE2_USED=NO/);
  assert.match(source,/PAID_API=NO/);
});

test('DEVELOPMENT_CONFIRMED keeps gated validation and disposition before artbook revision',()=>{
  const dev=source.indexOf("await run('tools/company-development-validation-cycle.mjs')");
  const gate=source.indexOf("await run('tools/company-baseline-gate.mjs')",dev);
  const disposition=source.indexOf("await run('tools/company-development-disposition-gate.mjs')",gate);
  assert.ok(dev>=0&&gate>dev&&disposition>gate);
  assert.match(source,/DEVELOPMENT_DISPOSITION_GATE=ENABLED/);
});
