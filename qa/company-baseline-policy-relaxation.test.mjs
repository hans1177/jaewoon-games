import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');

test('DESIGN_ONLY minority redesign/discard recommendations do not auto-veto baseline',()=>{
  assert.match(gate,/minorityLeadRedesignOrDiscardIsAdvisoryOnly:true/);
  assert.match(gate,/unanimousFatalDiscardRequiredToDiscard:true/);
  assert.match(gate,/advisoryDisposition==='DISCARDED'&&unanimousFatalDiscard/);
  assert.doesNotMatch(gate,/else if\(disposition!=='ACTIVE'\)/);
  assert.doesNotMatch(gate,/design-disposition:\$\{disposition/);
  assert.match(gate,/meetingConflicts>0/);
  assert.match(gate,/meetingHolds>0/);
});
