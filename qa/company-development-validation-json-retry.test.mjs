import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/company-development-validation-cycle.mjs',import.meta.url),'utf8');

test('DEVELOPMENT_CONFIRMED department meeting bounds structured review output',()=>{
  assert.match(source,/const MEMBER_REVIEW=reviewSchema\(1,120\)/);
  assert.match(source,/const REVIEW=reviewSchema\(2,160\)/);
  assert.match(source,/maxItems:8/);
  assert.match(source,/REVIEWS,\{predict:1500,compact:true\}/);
  assert.match(source,/REVIEW,\{predict:700,compact:true\}/);
  assert.match(source,/REBUTTAL,\{predict:500,compact:true\}/);
  assert.match(source,/MEETING,\{predict:1000,compact:true\}/);
});

test('invalid or truncated model JSON gets one corrective regeneration instead of synthetic repair',()=>{
  assert.match(source,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(source,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(source,/판단 내용을 새로 발명하지 말고 같은 근거를 유지한 채 더 짧은 완전한 JSON/);
  assert.match(source,/const parsed=JSON\.parse\(text\)/);
  assert.match(source,/MODEL_JSON_RETRY_RECOVERED=/);
  assert.doesNotMatch(source,/JSON\.parse\([^)]*\+\s*['"`]\}/);
  assert.doesNotMatch(source,/auto.?close|synthetic.?repair|repairTruncated/i);
});

test('retry may increase output budget but remains capped and schema-bound',()=>{
  assert.match(source,/Math\.min\(1800,predict\+400\)/);
  assert.match(source,/format:schema/);
  assert.match(source,/maxItems\/maxLength를 반드시 지켜라/);
  assert.match(source,/think:false/);
});
