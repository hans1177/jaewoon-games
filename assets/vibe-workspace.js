// 파일명: assets/vibe-workspace.js
// 역할: 브라우저에서 웹/Godot 프로젝트를 열어 읽기·쓰기·백업·변경 비교를 수행하는 바이브 작업 공간
// 규칙: 원본 직접 수정, 쓰기 전 물리 체크포인트, 텍스트 파일 중심, 기존 세이브/게임 데이터 자동 변경 금지

const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.gd', '.tscn', '.tres', '.cfg', '.txt', '.md', '.toml']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function clean(value) { return String(value ?? '').trim(); }
function ext(path) { const name = clean(path).toLowerCase(); const index = name.lastIndexOf('.'); return index >= 0 ? name.slice(index) : ''; }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function isTextPath(path) { return TEXT_EXTENSIONS.has(ext(path)); }
function isSafeRelativePath(path) { const value = clean(path).replace(/\\/g, '/'); return Boolean(value) && !value.startsWith('/') && !value.split('/').includes('..'); }

async function getDirectory(handle, parts, create = false) {
  let current = handle;
  for (const part of parts) current = await current.getDirectoryHandle(part, { create });
  return current;
}

async function getFileHandle(handle, path, create = false) {
  const parts = clean(path).replace(/\\/g, '/').split('/').filter(Boolean);
  if (!parts.length || !isSafeRelativePath(path)) throw new Error(`invalid workspace path: ${path}`);
  const fileName = parts.pop();
  const directory = await getDirectory(handle, parts, create);
  return directory.getFileHandle(fileName, { create });
}

export class JaewoonVibeWorkspace {
  constructor({ rootHandle = null } = {}) {
    this.rootHandle = rootHandle;
    this.openedAt = null;
    this.files = new Map();
    this.snapshots = new Map();
  }

  async open(rootHandle) {
    if (!rootHandle) throw new Error('workspace directory handle required');
    this.rootHandle = rootHandle;
    this.openedAt = new Date().toISOString();
    await this.scan();
    return this.summary();
  }

  async scan() {
    if (!this.rootHandle) throw new Error('workspace not open');
    this.files.clear();
    const visit = async (directory, prefix = '') => {
      for await (const [name, entry] of directory.entries()) {
        const path = prefix ? `${prefix}/${name}` : name;
        if (name === '.git' || name === '.godot' || name === 'node_modules' || name === '.vibe-backups') continue;
        if (entry.kind === 'directory') await visit(entry, path);
        else {
          try {
            const file = await entry.getFile();
            this.files.set(path, { path, kind: 'file', size: file.size, text: isTextPath(path) && file.size <= MAX_FILE_BYTES });
          } catch {
            this.files.set(path, { path, kind: 'file', size: 0, text: false });
          }
        }
      }
    };
    await visit(this.rootHandle);
    return this.summary();
  }

  async read(path) {
    if (!this.rootHandle) throw new Error('workspace not open');
    if (!isTextPath(path)) throw new Error(`binary file read is not supported by text workspace: ${path}`);
    const handle = await getFileHandle(this.rootHandle, path, false);
    const file = await handle.getFile();
    if (file.size > MAX_FILE_BYTES) throw new Error(`file too large for workspace: ${path}`);
    const text = await file.text();
    this.snapshots.set(path, text);
    return text;
  }

  async write(path, content, { backup = true, expectedPrevious = null } = {}) {
    if (!this.rootHandle) throw new Error('workspace not open');
    if (!isTextPath(path)) throw new Error(`binary file write is not supported by text workspace: ${path}`);
    if (!isSafeRelativePath(path)) throw new Error(`invalid workspace path: ${path}`);
    const next = String(content ?? '');
    if (new Blob([next]).size > MAX_FILE_BYTES) throw new Error(`file too large for workspace: ${path}`);
    const handle = await getFileHandle(this.rootHandle, path, true);
    let previous = null;
    try { previous = await (await handle.getFile()).text(); } catch { previous = null; }
    if (expectedPrevious !== null && previous !== expectedPrevious) throw new Error(`workspace file changed before write: ${path}`);
    if (backup && previous !== null && previous !== next) await this.writeBackup(path, previous);
    const writable = await handle.createWritable();
    try { await writable.write(next); } finally { await writable.close(); }
    this.snapshots.set(path, previous ?? '');
    await this.scan();
    return Object.freeze({ path, changed: previous !== next, previousBytes: previous == null ? 0 : new Blob([previous]).size, nextBytes: new Blob([next]).size });
  }

  // 실제 소스 변경 전에 원본 전체를 하나의 물리 디렉터리에 고정한다.
  async createCheckpoint(changes) {
    if (!Array.isArray(changes) || !changes.length) throw new Error('checkpoint changes required');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const id = `workspace:${stamp}`;
    const root = `.vibe-backups/${stamp}`;
    const files = [];
    for (const change of changes) {
      const path = clean(change?.path);
      if (!isSafeRelativePath(path) || !isTextPath(path)) throw new Error(`invalid checkpoint path: ${path}`);
      const current = await this.read(path);
      const expected = String(change?.current ?? '');
      if (current !== expected) throw new Error(`workspace file changed before checkpoint: ${path}`);
      const backupPath = `${root}/${path}`;
      const handle = await getFileHandle(this.rootHandle, backupPath, true);
      const writable = await handle.createWritable();
      try { await writable.write(current); } finally { await writable.close(); }
      files.push(Object.freeze({ path, backupPath, bytes: new Blob([current]).size }));
    }
    return Object.freeze({ id, root, createdAt: new Date().toISOString(), files: Object.freeze(files), physical: true });
  }

  async writeManyAtomic(changes, { checkpoint = null } = {}) {
    if (!Array.isArray(changes) || !changes.length) throw new Error('atomic changes required');
    const prepared = [];
    for (const change of changes) {
      const path = clean(change?.path);
      const current = await this.read(path);
      const expected = String(change?.current ?? '');
      if (current !== expected) throw new Error(`workspace file changed before transaction: ${path}`);
      prepared.push({ path, current, next: String(change?.next ?? '') });
    }
    const activeCheckpoint = checkpoint?.physical === true ? checkpoint : await this.createCheckpoint(changes);
    const checkpointPaths = new Set((activeCheckpoint.files || []).map(file => file.path));
    for (const item of prepared) if (!checkpointPaths.has(item.path)) throw new Error(`checkpoint missing responsible file: ${item.path}`);
    const applied = [];
    try {
      for (const item of prepared) {
        if (item.current === item.next) continue;
        await this.write(item.path, item.next, { backup: false, expectedPrevious: item.current });
        applied.push(item);
      }
    } catch (error) {
      const rollbackErrors = [];
      for (const item of [...applied].reverse()) {
        try { await this.write(item.path, item.current, { backup: false, expectedPrevious: item.next }); }
        catch (rollbackError) { rollbackErrors.push(`${item.path}: ${rollbackError.message}`); }
      }
      if (rollbackErrors.length) throw new Error(`${error.message} · rollback 실패: ${rollbackErrors.join(' | ')}`);
      throw new Error(`${error.message} · 적용 파일 자동 rollback 완료`);
    }
    await this.scan();
    return Object.freeze({ changed: applied.length, paths: Object.freeze(applied.map(item => item.path)), checkpoint: activeCheckpoint });
  }

  async writeBackup(path, content) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `.vibe-backups/${stamp}/${path}`;
    const handle = await getFileHandle(this.rootHandle, backupPath, true);
    const writable = await handle.createWritable();
    try { await writable.write(String(content ?? '')); } finally { await writable.close(); }
    return backupPath;
  }

  async compare(path, nextContent = null) {
    const current = await this.read(path);
    const next = nextContent === null ? current : String(nextContent);
    const before = this.snapshots.get(path) ?? current;
    const beforeLines = before.split(/\r?\n/);
    const afterLines = next.split(/\r?\n/);
    const max = Math.max(beforeLines.length, afterLines.length);
    const changes = [];
    for (let i = 0; i < max; i += 1) if (beforeLines[i] !== afterLines[i]) changes.push({ line: i + 1, before: beforeLines[i] ?? null, after: afterLines[i] ?? null });
    return Object.freeze({ path, changed: changes.length > 0, changeCount: changes.length, changes });
  }

  summary() {
    const files = [...this.files.values()];
    return Object.freeze({ openedAt: this.openedAt, fileCount: files.length, textFiles: files.filter(file => file.text).length, totalBytes: files.reduce((sum, file) => sum + file.size, 0), webProject: files.some(file => /(^|\/)index\.html$/i.test(file.path)), godotProject: files.some(file => file.path === 'project.godot'), files: Object.freeze(clone(files)) });
  }
}

export async function createVibeWorkspace(rootHandle = null) { const workspace = new JaewoonVibeWorkspace({ rootHandle }); if (rootHandle) await workspace.open(rootHandle); return workspace; }
export async function pickVibeWorkspace() { if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') throw new Error('directory picker is not supported by this browser'); const handle = await window.showDirectoryPicker({ mode: 'readwrite' }); return createVibeWorkspace(handle); }
export const isVibeWorkspaceTextFile = isTextPath;
export const isSafeVibeWorkspacePath = isSafeRelativePath;
if (typeof window !== 'undefined') { window.JaewoonVibeWorkspace = JaewoonVibeWorkspace; window.createJaewoonVibeWorkspace = createVibeWorkspace; window.pickJaewoonVibeWorkspace = pickVibeWorkspace; }
