// 파일명: assets/vibe-change-set.js
// 역할: 바이브코딩 변경 작업을 안전한 변경 세트로 표현
// 규칙: 직접 수정 대상/보존 대상/QA를 함께 기록하고, 기존 게임 자동 적용을 허용하지 않음

function clean(value) { return String(value ?? '').trim(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function stableHash(value = '') { let h = 2166136261; for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const allowedTargets = Object.freeze(['web', 'godot', 'roblox', 'unity']);
function normalizeTarget(value = 'web') { const target = clean(value).toLowerCase(); return allowedTargets.includes(target) ? target : 'web'; }
function normalizeAcceptance(input = []) { const rows = Array.isArray(input) ? input : Array.isArray(input?.observable) ? input.observable : []; return Object.freeze({ observable: Object.freeze(unique(rows.map(clean))), runtimeEvidenceRequired: input?.runtimeEvidenceRequired === true, visualRuntimeEvidenceRequired: input?.visualRuntimeEvidenceRequired === true, multiplayerEvidenceRequired: input?.multiplayerEvidenceRequired === true, markerOnlyPassForbidden: input?.markerOnlyPassForbidden !== false }); }

const protectedKeys = Object.freeze(['hp', 'maxHp', 'damage', 'attack', 'waves', 'rewards', 'dropRate', 'saveKey', 'progress']);

export function createVibeChangeSet({ id = '', request = '', target = 'web', gameId = null, baseSourceRevision = '', ownerOrSystemIntent = '', responsibleSystems = [], affectedDepartments = [], files = [], edits = [], tests = [], notes = [], preservedSemantics = [], acceptanceContract = [], failureEvidence = [], status = 'ACTIVE' } = {}) {
  const prompt = clean(request);
  if (!prompt) throw new Error('change request required');
  const normalizedTarget = normalizeTarget(target);
  const normalizedFiles = unique(files.map(clean));
  const normalizedEdits = edits.map((edit) => ({
    file: clean(edit?.file), area: clean(edit?.area), reason: clean(edit?.reason),
    before: edit?.before == null ? null : clean(edit.before),
    after: edit?.after == null ? null : clean(edit.after),
    protected: Array.isArray(edit?.protected) ? unique(edit.protected.map(clean)) : [],
  })).filter((edit) => edit.file && edit.area);
  const protectedChanges = normalizedEdits.flatMap((edit) => edit.protected).filter((key) => protectedKeys.includes(key));
  return Object.freeze({
    version: 2,
    id: clean(id) || `change-${stableHash(JSON.stringify({ request: prompt, target: normalizedTarget, gameId: clean(gameId), baseSourceRevision: clean(baseSourceRevision), files: normalizedFiles, edits: normalizedEdits.map((edit) => [edit.file, edit.area, edit.reason]) }))}`,
    request: prompt,
    ownerOrSystemIntent: clean(ownerOrSystemIntent) || prompt,
    baseSourceRevision: clean(baseSourceRevision) || null,
    responsibleSystems: Object.freeze(unique(responsibleSystems.map(clean))),
    affectedDepartments: Object.freeze(unique(affectedDepartments.map(clean))),
    target: normalizedTarget,
    gameId: gameId ? clean(gameId) : null,
    files: Object.freeze(normalizedFiles),
    edits: Object.freeze(normalizedEdits.map(clone)),
    tests: Object.freeze(unique(tests.map(clean))),
    notes: Object.freeze(unique(notes.map(clean))),
    preservedSemantics: Object.freeze(unique(preservedSemantics.map(clean))),
    acceptanceContract: normalizeAcceptance(acceptanceContract),
    failureEvidence: Object.freeze(unique(failureEvidence.map(clean))),
    status: clean(status).toUpperCase() || 'ACTIVE',
    protectedChanges: Object.freeze(unique(protectedChanges)),
    policy: Object.freeze({ existingGameAutoApply: false, directSourceEdit: true, workLockRequired: normalizedFiles.length > 0, migrationRequiredOnSaveBreak: true, protectedChangeNeedsExplicitReview: protectedChanges.length > 0 }),
  });
}

export function canApplyVibeChangeSet(changeSet, { allowProtectedChange = false } = {}) {
  if (!changeSet || ![1, 2].includes(changeSet.version)) return { ok: false, reason: 'invalid-change-set' };
  if (!Array.isArray(changeSet.files) || !changeSet.files.length) return { ok: false, reason: 'no-target-files' };
  if (!Array.isArray(changeSet.edits) || !changeSet.edits.length) return { ok: false, reason: 'no-edits' };
  if (changeSet.version >= 2 && !clean(changeSet.baseSourceRevision)) return { ok: false, reason: 'base-source-revision-required' };
  if (changeSet.version >= 2 && !changeSet.acceptanceContract?.observable?.length) return { ok: false, reason: 'acceptance-contract-required' };
  if (changeSet.protectedChanges?.length && !allowProtectedChange) return { ok: false, reason: 'protected-change-review-required' };
  return { ok: true, reason: 'ready-for-review' };
}

export function classifyVibeOwnerInterrupt({ activeChangeSet = null, request = '' } = {}) {
  const next = clean(request);
  if (!next) throw new Error('owner interrupt request required');
  const current = clean(activeChangeSet?.request || activeChangeSet?.ownerOrSystemIntent);
  const major = new RegExp('장르|핵심\\s*루프|완전히|아예|세계관|전투\\s*방식|게임\\s*방향', 'i').test(next);
  const repair = new RegExp('버그|오류|안\\s*돼|고장|깨져|복구|수정', 'i').test(next);
  const sameConcept = !major && Boolean(current);
  return Object.freeze({ event: 'OWNER_INPUT_RECEIVED', classification: major ? 'MAJOR_DIRECTION_CHANGE' : repair ? 'QUALITY_REPAIR' : sameConcept ? 'SAME_CONCEPT_EXTENSION' : 'LOCAL_FEATURE_CHANGE', action: major ? 'REPRIORITIZE_AND_RECOMPUTE_IMPACT' : 'MERGE_OR_QUEUE_WITHOUT_RESTART', preserveUnaffectedWork: true, latestOwnerDirectivePriority: true });
}

export function snapshotVibeChangeSet(changeSet) { return clone(changeSet); }
if (typeof window !== 'undefined') { window.createJaewoonVibeChangeSet = createVibeChangeSet; window.canApplyJaewoonVibeChangeSet = canApplyVibeChangeSet; window.classifyJaewoonVibeOwnerInterrupt = classifyVibeOwnerInterrupt; }
