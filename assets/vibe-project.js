// 파일명: assets/vibe-project.js
// 역할: 자연어로 만든 웹/Godot 게임 프로젝트의 수정·복구 가능한 작업 상태 관리
// 규칙: 현재 결과 보존, 변경 요청만 누적, 기존 세이브/규칙 보호, 되돌리기 정보 유지

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function createProjectId(gameId = 'game') {
  const base = text(gameId).toLowerCase().replace(/[^a-z0-9가-힣-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'game';
  return `${base}-${Date.now().toString(36)}`;
}

export function createVibeProject({ gameId = 'game', title = null, target = 'web', packageData = null, source = null } = {}) {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    projectId: createProjectId(gameId),
    gameId: text(gameId) || 'game',
    title: text(title) || text(gameId) || '재운게임즈 게임',
    target: target === 'godot' ? 'godot' : 'web',
    createdAt: now,
    updatedAt: now,
    revision: 0,
    packageData: clone(packageData),
    source: source == null ? null : text(source),
    requests: [],
    repairHistory: [],
    protectedSnapshot: clone(packageData?.content || null),
  };
}

export function recordVibeProjectChange(project, { request = '', plan = null, source = null, packageData = undefined } = {}) {
  if (!project || typeof project !== 'object') throw new Error('vibe project required');
  const next = clone(project);
  const cleanRequest = text(request);
  if (!cleanRequest) throw new Error('change request required');
  next.revision = Number(next.revision || 0) + 1;
  next.updatedAt = new Date().toISOString();
  next.requests = Array.isArray(next.requests) ? next.requests : [];
  next.requests.push({ revision: next.revision, request: cleanRequest, plan: clone(plan), at: next.updatedAt });
  if (source !== null) next.source = text(source);
  if (packageData !== undefined) next.packageData = clone(packageData);
  return next;
}

export function recordVibeRepair(project, { request = '', error = '', fix = '', files = [] } = {}) {
  if (!project || typeof project !== 'object') throw new Error('vibe project required');
  const next = clone(project);
  next.updatedAt = new Date().toISOString();
  next.repairHistory = Array.isArray(next.repairHistory) ? next.repairHistory : [];
  next.repairHistory.push({
    revision: Number(next.revision || 0),
    request: text(request),
    error: text(error),
    fix: text(fix),
    files: unique(Array.isArray(files) ? files.map(text) : []),
    at: next.updatedAt,
  });
  return next;
}

export function exportVibeProject(project) {
  if (!project || typeof project !== 'object') throw new Error('vibe project required');
  return JSON.stringify(clone(project), null, 2);
}

export function importVibeProject(serialized) {
  const project = typeof serialized === 'string' ? JSON.parse(serialized) : clone(serialized);
  if (!project || typeof project !== 'object') throw new Error('invalid vibe project');
  if (Number(project.formatVersion) !== 1) throw new Error('unsupported vibe project version');
  if (!text(project.gameId)) throw new Error('vibe project gameId required');
  project.requests = Array.isArray(project.requests) ? project.requests : [];
  project.repairHistory = Array.isArray(project.repairHistory) ? project.repairHistory : [];
  return project;
}

export function cloneVibeProject(project) {
  return importVibeProject(exportVibeProject(project));
}

if (typeof window !== 'undefined') {
  window.createJaewoonVibeProject = createVibeProject;
  window.recordJaewoonVibeProjectChange = recordVibeProjectChange;
  window.recordJaewoonVibeProjectRepair = recordVibeRepair;
  window.exportJaewoonVibeProject = exportVibeProject;
  window.importJaewoonVibeProject = importVibeProject;
}
