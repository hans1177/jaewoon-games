import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadExternalDesignLibrary,
  selectExternalDesignPrinciples,
  buildExternalDesignScope,
} from '../tools/artbook-external-design-distillation.mjs';

test('외부 설계 라이브러리는 원문 저장과 직접 weight 학습을 금지한다', () => {
  const library = loadExternalDesignLibrary();
  assert.equal(library.meaning, 'ARTBOOK_EQUALS_GAME_DESIGN');
  assert.equal(library.sourcePolicy.storeSourceExcerpts, false);
  assert.equal(library.sourcePolicy.paraphrasePrinciplesOnly, true);
  assert.equal(library.sourcePolicy.directWeightTrainingAllowed, false);
});

test('역할과 장르에 맞는 설계 원리만 선택한다', () => {
  const library = loadExternalDesignLibrary();
  const rows = selectExternalDesignPrinciples({ library, role: 'development', genre: 'survival', limit: 4 });
  assert.ok(rows.length > 0);
  assert.ok(rows.some((row) => row.id === 'meaningful-choice-tradeoff'));
  assert.ok(rows.every((row) => row.sourceIds.length > 0));
});

test('아트북은 게임 설계 원본이며 외부 원리는 proposal로만 주입된다', () => {
  const library = loadExternalDesignLibrary();
  const result = buildExternalDesignScope({ library, role: 'planning', genre: 'action-rpg', limit: 3 });
  assert.match(result.scope, /artbookMeaning=GAME_DESIGN_SOURCE_OF_TRUTH/);
  assert.match(result.scope, /proposal-only/);
  assert.match(result.scope, /do-not-direct-weight-train/);
  assert.ok(result.selected.length > 0);
});
