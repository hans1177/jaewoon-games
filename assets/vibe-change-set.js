// 파일명: assets/vibe-change-set.js
// 역할: 바이브코딩 변경 작업을 안전한 변경 세트로 표현
// 규칙: 직접 수정 대상/보존 대상/QA를 함께 기록하고, 기존 게임 자동 적용을 허용하지 않음

function clean(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

const protectedKeys = Object.freeze(['hp', 'maxHp', 'damage', 'attack', 'waves', 'rewards', 'dropRate', 'saveKey', 'progress']);

export function createVibeChangeSet({ request = '', target = 'web', gameId = null, files = [], edits = [], tests = [], notes = [] } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('change request required');
  const normalizedTarget = target === 'godot' ? 'godot' : 'web';
  const normalizedFiles = unique(files.map(clean));
  const normalizedEdits = edits.map((edit) => ({
    file: clean(edit?.file), area: clean(edit?.area), reason: clean(edit?.reason),
    before: edit?.before == null ? null : clean(edit.before),
    after: edit?.after == null ? null : clean(edit.after),
    protected: Array.isArray(edit?.protected) ? unique(edit.protected.map(clean)) : [],
  })).filter((edit) => edit.file && edit.area);
  const protectedChanges = normalizedEdits.flatMap((edit) => edit.protected).filter((key) => protectedKeys.includes(key));
  return Object.freeze({
    version: 1,
    id: `change-${Date.now().toString(36)}`,
    request: prompt,
    target: normalizedTarget,
    gameId: gameId ? clean(gameId) : null,
    files: Object.freeze(normalizedFiles),
    edits: Object.freeze(normalizedEdits.map(clone)),
    tests: Object.freeze(unique(tests.map(clean))),
    notes: Object.freeze(unique(notes.map(clean))),
    protectedChanges: Object.freeze(unique(protectedChanges)),
    policy: Object.freeze({ existingGameAutoApply: false, directSourceEdit: true, migrationRequiredOnSaveBreak: true, protectedChangeNeedsExplicitReview: protectedChanges.length > 0 }),
  });
}

export function canApplyVibeChangeSet(changeSet, { allowProtectedChange = false } = {}) {
  if (!changeSet || changeSet.version !== 1) return { ok: false, reason: 'invalid-change-set' };
  if (!Array.isArray(changeSet.files) || !changeSet.files.length) return { ok: false, reason: 'no-target-files' };
  if (!Array.isArray(changeSet.edits) || !changeSet.edits.length) return { ok: false, reason: 'no-edits' };
  if (changeSet.protectedChanges?.length && !allowProtectedChange) return { ok: false, reason: 'protected-change-review-required' };
  return { ok: true, reason: 'ready-for-review' };
}

export function snapshotVibeChangeSet(changeSet) { return clone(changeSet); }
if (typeof window !== 'undefined') { window.createJaewoonVibeChangeSet = createVibeChangeSet; window.canApplyJaewoonVibeChangeSet = canApplyVibeChangeSet; }
