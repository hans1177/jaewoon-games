import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/artbook-director-presentation.mjs','utf8');

test('artbook editorial roles keep detailed design, core summary and learning separate',()=>{
  assert.match(source,/DETAILED_GAME_DESIGN_AUTHOR=AI_EMPLOYEES/);
  assert.match(source,/ARTBOOK_EDITOR=DIRECTOR_AI/);
  assert.match(source,/ARTBOOK_DETAIL=CORE_ONLY/);
  assert.match(source,/VIBE2_ROLE=VALIDATION_AND_LEARNING/);
  assert.match(source,/detailedDesignOwner:'AI_EMPLOYEES'/);
  assert.match(source,/artbookEditor:'DIRECTOR_AI'/);
  assert.match(source,/artbookDetail:'CORE_ONLY'/);
  assert.match(source,/learningAndValidation:'VIBE2'/);
  assert.match(source,/세부 수치, 전체 규칙표, 긴 구현 설명, QA 케이스 목록은 아트북에 옮기지 않는다/);
});
