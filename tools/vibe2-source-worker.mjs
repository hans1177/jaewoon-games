// 파일명: tools/vibe2-source-worker.mjs
// 역할: Vibe2 작업주문의 텍스트 소스 변경 후보를 무료 로컬 모델로 생성하고 격리 검증한다.
// 원칙: web-games와 엔진 바이너리 에셋은 수정하지 않으며 main 직접 쓰기는 금지한다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, normalizeExactEdits, boundedLargeExcerpt } from './autonomous-safe-edit.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
const safeId = (value) => clean(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'task';
const MAX_CONTEXT_FILES = 12;
const MAX_CONTEXT_BYTES = 360000;
const MAX_CHANGED_FILES = 4;
const MAX_NEW_FILES = 2;
const MAX_FILE_BYTES = 220000;
const MODEL_TIMEOUT_MS = Math.max(10000, Math.min(300000, Number(process.env.VIBE2_MODEL_TIMEOUT_MS || 240000)));
const MODEL_MAX_PREDICT = Math.max(256, Math.min(2048, Number(process.env.VIBE2_MODEL_MAX_PREDICT || 1536)));
const DEFAULT_MODEL = process.env.VIBE2_LOCAL_MODEL || 'qwen3:0.6b';

const TARGET_EXTENSIONS = Object.freeze({
  unity: new Set(['.cs', '.asmdef', '.json', '.uxml', '.uss', '.unity', '.prefab', '.asset']),
  unreal: new Set(['.h', '.hpp', '.cpp', '.cc', '.cxx', '.cs', '.ini', '.uproject', '.uplugin', '.json']),
  godot: new Set(['.gd', '.tscn', '.tres', '.godot', '.cfg', '.json'])
});
const BINARY_EXTENSIONS = new Set(['.uasset', '.umap', '.controller', '.anim', '.avatar', '.fbx', '.blend', '.png', '.jpg', '.jpeg', '.webp', '.wav', '.mp3', '.ogg']);

function readJson(file, fallback = null) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function targetExtensions(target) {
  const extensions = TARGET_EXTENSIONS[clean(target).toLowerCase()];
  if (!extensions) throw new Error(`지원하지 않는 Vibe2 source target: ${target}`);
  return extensions;
}
function assertSourceRoot(root, target) {
  const normalized = posix(root);
  const prefix = target === 'unity' ? 'unity-games/' : target === 'unreal' ? 'unreal-games/' : target === 'godot' ? 'godot-games/' : '';
  if (!prefix || !normalized.startsWith(prefix) || normalized.includes('..') || normalized.startsWith('web-games/')) throw new Error(`허용되지 않은 source root: ${root}`);
  return normalized;
}
function assertRelativeSourcePath(relative, target) {
  const normalized = posix(relative);
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) throw new Error(`잘못된 상대 경로: ${relative}`);
  const ext = path.extname(normalized).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) throw new Error(`엔진 에디터 필요 바이너리 파일: ${relative}`);
  if (!targetExtensions(target).has(ext)) throw new Error(`텍스트 worker 허용 확장자 아님: ${relative}`);
  return normalized;
}
function listContextFiles(root, target, ignored = []) {
  const ignore = ignored.map(posix).filter(Boolean);
  const rows = [];
  const walk = (current) => {
    if (rows.length >= MAX_CONTEXT_FILES) return;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (rows.length >= MAX_CONTEXT_FILES) return;
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(current, entry.name);
      const relative = posix(path.relative(root, full));
      if (ignore.some((value) => value && (relative === value || relative.startsWith(`${value}/`)))) continue;
      if (entry.isDirectory()) walk(full);
      else {
        const ext = path.extname(entry.name).toLowerCase();
        if (targetExtensions(target).has(ext) && !BINARY_EXTENSIONS.has(ext)) rows.push({ full, relative, bytes: fs.statSync(full).size });
      }
    }
  };
  walk(root);
  return rows;
}
function readContext(root, target, responsibleFiles = [], ignored = []) {
  const requested = responsibleFiles.map((value) => posix(value)).filter(Boolean);
  const rows = requested.length
    ? requested.map((relative) => ({ full: path.join(root, relative), relative, bytes: fs.existsSync(path.join(root, relative)) ? fs.statSync(path.join(root, relative)).size : 0 }))
    : listContextFiles(root, target, ignored);
  const files = [];
  let total = 0;
  for (const row of rows.slice(0, MAX_CONTEXT_FILES)) {
    const relative = assertRelativeSourcePath(row.relative, target);
    if (!fs.existsSync(row.full) || !fs.statSync(row.full).isFile()) throw new Error(`책임 파일 없음: ${relative}`);
    const raw = fs.readFileSync(row.full, 'utf8');
    const excerpt = boundedLargeExcerpt(raw);
    const remaining = MAX_CONTEXT_BYTES - total;
    if (remaining <= 0) break;
    let content = excerpt.content;
    while (Buffer.byteLength(content, 'utf8') > remaining && content.length > 100) content = content.slice(0, Math.floor(content.length * 0.8));
    const bytes = Buffer.byteLength(content, 'utf8');
    if (!bytes) continue;
    files.push({ path: relative, content, truncated: excerpt.truncated || content.length < excerpt.content.length });
    total += bytes;
  }
  return { files, bytes: total };
}
function extractJson(raw) {
  const text = clean(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(text); } catch {}
  const start = Math.min(...['{', '['].map((char) => text.indexOf(char)).filter((index) => index >= 0));
  if (!Number.isFinite(start)) throw new Error('모델 JSON 시작을 찾지 못함');
  const opening = text[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0, quoted = false, escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === opening) depth += 1;
    else if (ch === closing) {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('모델 JSON 파싱 실패');
}
function normalizeCandidate(raw, target) {
  const parsed = typeof raw === 'string' ? extractJson(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('모델 후보는 JSON 객체여야 함');
  const edits = normalizeExactEdits(Array.isArray(parsed.edits) ? parsed.edits : [], (value) => assertRelativeSourcePath(value, target));
  const newFiles = (Array.isArray(parsed.newFiles) ? parsed.newFiles : []).map((item) => {
    const relative = assertRelativeSourcePath(item?.path, target);
    const content = String(item?.content ?? '');
    if (!content || Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) throw new Error(`새 파일 크기 오류: ${relative}`);
    return { path: relative, content };
  });
  if (newFiles.length > MAX_NEW_FILES) throw new Error(`새 파일은 최대 ${MAX_NEW_FILES}개`);
  const touched = new Set([...edits.map((item) => item.path), ...newFiles.map((item) => item.path)]);
  if (!touched.size || touched.size > MAX_CHANGED_FILES) throw new Error(`변경 파일 수는 1~${MAX_CHANGED_FILES}개여야 함`);
  return {
    summary: clean(parsed.summary) || 'Vibe2 source candidate',
    expectedEffect: clean(parsed.expectedEffect),
    edits,
    newFiles,
    tests: (Array.isArray(parsed.tests) ? parsed.tests : []).map(clean).filter(Boolean).slice(0, 8)
  };
}
function buildPrompt(order, context) {
  const sourceText = context.files.map((file) => `\n=== FILE ${file.path}${file.truncated ? ' [TRUNCATED]' : ''} ===\n${file.content}`).join('\n');
  return [
    'You are the Vibe2 game source worker. Return JSON only.',
    `Engine: ${order.target}`,
    `Goal: ${order.goal}`,
    `Department: ${order.department || 'development'}`,
    'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly asks for a protected change.',
    'Do not output binary assets. Do not edit web-games. Do not use wrapper/monkey patches.',
    'Prefer direct edits to responsible existing source files. Keep changes small enough to verify.',
    'JSON schema: {"summary":"...","expectedEffect":"...","edits":[{"path":"relative/to/source/root","find":"exact unique old text","replace":"new text"}],"newFiles":[{"path":"relative/to/source/root","content":"full text"}],"tests":["..."]}',
    'Use edits for existing files. newFiles only when a new responsibility genuinely requires one.',
    `Required QA: ${(order.qa || []).join(', ')}`,
    sourceText
  ].join('\n');
}
async function requestLocalModel(prompt, { model = DEFAULT_MODEL, responseFile = '' } = {}) {
  const fake = clean(responseFile || process.env.VIBE2_MODEL_RESPONSE_FILE);
  if (fake) return fs.readFileSync(fake, 'utf8');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_predict: MODEL_MAX_PREDICT, temperature: 0.1 }
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const payload = await response.json();
    if (!clean(payload?.response)) throw new Error('Ollama 응답 비어 있음');
    return payload.response;
  } finally {
    clearTimeout(timer);
  }
}
function currentBranch(cwd) {
  try { return clean(execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' })); } catch { return ''; }
}
function assertCandidateBranch(cwd) {
  const branch = currentBranch(cwd);
  if (!branch || branch === 'main' || branch === 'master' || !branch.startsWith('vibe2/candidate/')) throw new Error(`source 적용은 vibe2/candidate/* 브랜치에서만 허용: ${branch || 'unknown'}`);
  return branch;
}
function applyNewFiles(root, newFiles) {
  const changed = [];
  for (const file of newFiles) {
    const target = path.join(root, file.path);
    if (fs.existsSync(target)) throw new Error(`newFiles 대상이 이미 존재함: ${file.path}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
    changed.push(file.path);
  }
  return changed;
}
function createCandidateSnapshot(sourceRoot, candidateRoot, candidate) {
  const changed = [];
  for (const edit of candidate.edits) {
    const source = path.join(sourceRoot, edit.path);
    const target = path.join(candidateRoot, 'files', edit.path);
    const before = fs.readFileSync(source, 'utf8');
    const first = before.indexOf(edit.find);
    if (first < 0 || before.indexOf(edit.find, first + edit.find.length) >= 0) throw new Error(`edit find 고유 일치 실패: ${edit.path}`);
    const after = before.slice(0, first) + edit.replace + before.slice(first + edit.find.length);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, after, 'utf8');
    changed.push(edit.path);
  }
  for (const file of candidate.newFiles) {
    const target = path.join(candidateRoot, 'files', file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
    changed.push(file.path);
  }
  return [...new Set(changed)];
}

export async function runVibe2SourceWorker({
  cwd = process.cwd(),
  workOrderFile = '.vibe2/work-order.json',
  outputRoot = '.vibe2/candidates',
  model = DEFAULT_MODEL,
  responseFile = '',
  applySource = false
} = {}) {
  const orderPath = path.resolve(cwd, workOrderFile);
  const order = readJson(orderPath);
  if (!order?.run || order?.workMode !== 'source-change-candidate') throw new Error('실행 가능한 source-change work order 필요');
  if (order?.workerPolicy?.directMainWrite !== false) throw new Error('directMainWrite 정책 위반');
  const target = clean(order.target).toLowerCase();
  const sourceRootRelative = assertSourceRoot(order?.source?.root, target);
  const sourceRoot = path.resolve(cwd, sourceRootRelative);
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) throw new Error(`source root 없음: ${sourceRootRelative}`);
  const responsible = (order?.source?.responsibleFiles || []).map((value) => {
    const normalized = posix(value);
    return normalized.startsWith(`${sourceRootRelative}/`) ? normalized.slice(sourceRootRelative.length + 1) : normalized;
  }).filter(Boolean);
  for (const relative of responsible) assertRelativeSourcePath(relative, target);
  const context = readContext(sourceRoot, target, responsible, []);
  if (!context.files.length) throw new Error('worker context 파일 없음');
  const prompt = buildPrompt(order, context);
  const raw = await requestLocalModel(prompt, { model, responseFile });
  const candidate = normalizeCandidate(raw, target);
  const taskId = safeId(order.taskId);
  const candidateRoot = path.resolve(cwd, outputRoot, taskId);
  fs.rmSync(candidateRoot, { recursive: true, force: true });
  fs.mkdirSync(candidateRoot, { recursive: true });
  let changedFiles;
  let branch = null;
  if (applySource) {
    branch = assertCandidateBranch(cwd);
    changedFiles = [...applyExactEdits(sourceRoot, candidate.edits), ...applyNewFiles(sourceRoot, candidate.newFiles)];
  } else {
    changedFiles = createCandidateSnapshot(sourceRoot, candidateRoot, candidate);
  }
  const manifest = {
    version: 1,
    taskId: order.taskId,
    gameId: order.gameId || null,
    target,
    goal: order.goal,
    generatedAt: new Date().toISOString(),
    mode: applySource ? 'isolated-candidate-branch-source-write' : 'candidate-snapshot-only',
    branch,
    model,
    changedFiles,
    summary: candidate.summary,
    expectedEffect: candidate.expectedEffect,
    tests: candidate.tests,
    protectedGameplayMutationAutomatic: false,
    binaryAssetsDirectTextEditForbidden: true,
    directMainWrite: false
  };
  writeJson(path.join(candidateRoot, 'manifest.json'), manifest);
  writeJson(path.join(candidateRoot, 'candidate.json'), candidate);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = await runVibe2SourceWorker({
    workOrderFile: clean(args.order) || '.vibe2/work-order.json',
    outputRoot: clean(args.output) || '.vibe2/candidates',
    model: clean(args.model) || DEFAULT_MODEL,
    responseFile: clean(args.response),
    applySource: String(args['apply-source'] || '').toLowerCase() === 'true'
  });
  console.log('VIBE2_SOURCE_WORKER=PASS');
  console.log(`VIBE2_TASK_ID=${result.taskId}`);
  console.log(`VIBE2_TARGET=${result.target}`);
  console.log(`VIBE2_CHANGED_FILES=${result.changedFiles.join(',')}`);
}
