import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='tools/artbook-production-pipeline.mjs';
const source=fs.readFileSync(file,'utf8');

test('artbook production pipeline scans facts before department generation and gate',()=>{
  const fact=source.indexOf("await run('tools/artbook-fact-pack.mjs')");
  const departments=source.indexOf('await pool(ROLES');
  const gate=source.indexOf("await run('tools/artbook-gate.mjs')");
  assert.ok(fact>=0,'FACT PACK stage missing');
  assert.ok(departments>fact,'departments must run after FACT PACK');
  assert.ok(gate>departments,'gate must run after departments');
  assert.match(source,/ARTBOOK_DEPARTMENT_PARALLEL/);
  assert.match(source,/Math\.min\(5,/);
  assert.match(source,/PAID_API=NO/);
});
