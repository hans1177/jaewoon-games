// 파일명: tools/game-agent/agent.mjs

// ==================== 임포트 ====================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// ==================== 설정 ====================
const ROOT = path.resolve(import.meta.dirname, '../..');
const RULE_FILES = ['PROJECT_HANDOFF.md', 'GAME_RULES.md', 'ASSET_RULES.md', 'LICENSES.md', 'AGENT_RULES.md'];
const MAX_FILES = 5;
const MAX_PROMPT_CHARS = 48000;

const PROVIDERS = [
  {
    name: 'groq',
    key: 'AGENT_GROQ_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.AGENT_GROQ_MODEL || 'openai/gpt-oss-120b'
  },
  {
    name: 'openrouter-free',
    key: 'AGENT_OPENROUTER_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free'
  },
  {
    name: 'mistral-free',
    key: 'AGENT_MISTRAL_KEY',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: process.env.AGENT_MISTRAL_MODEL || 'mistral-small-latest'
  }
];

// ==================== 로그 ====================
function log(message) {
  console.log(`[game-agent] ${message}`);
}

function fail(message, code = 1) {
  console.error(`[game-agent] 중단: ${message}`);
  process.exit(code);
}

// ==================== Git ====================
function git(args, allowFail = false) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFail) return '';
    throw error;
  }
}

function ensureRepoSafe() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) fail('Git 저장소에서 실행해야 함');
  const branch = git(['branch', '--show-current']);
  if (!branch || branch === 'main') fail('main 직접 작업 금지. 복구 브랜치에서 실행해야 함');
  const status = git(['status', '--porcelain']);
  if (status) fail('작업 트리가 깨끗하지 않음. 기존 작업과 섞지 않음');
  return branch;
}

function captureMainState() {
  git(['fetch', 'origin', 'main']);
  return git(['rev-parse', 'origin/main']);
}

function assertMainUnchanged(startSha) {
  git(['fetch', 'origin', 'main']);
  const current = git(['rev-parse', 'origin/main']);
  if (current !== startSha) fail(`작업 중 main 변경 감지: ${startSha.slice(0, 8)} → ${current.slice(0, 8)}`);
}

// ==================== 규칙 ====================
function readRules() {
  return RULE_FILES.map((file) => {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) fail(`필수 규칙 파일 누락: ${file}`);
    return `\n===== ${file} =====\n${fs.readFileSync(full, 'utf8')}`;
  }).join('\n');
}

// ==================== 장애 검사 ====================
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.godot'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function detectDamage() {
  const issues = [];
  const files = walk(ROOT);
  const textFiles = files.filter((file) => /\.(?:html?|css|js|mjs|json|md|yml|yaml|gd|toml)$/i.test(file));
  const conflictPattern = /^(<<<<<<< |=======|>>>>>>> )/m;

  for (const file of textFiles) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      issues.push({ severity: 'P0', type: 'file-read', file: path.relative(ROOT, file), message: '파일 읽기 실패' });
      continue;
    }
    if (conflictPattern.test(text)) {
      issues.push({ severity: 'P0', type: 'merge-conflict', file: path.relative(ROOT, file), message: 'merge conflict 흔적 발견' });
    }
    if (/\.json$/i.test(file)) {
      try { JSON.parse(text); }
      catch (error) { issues.push({ severity: 'P1', type: 'json', file: path.relative(ROOT, file), message: error.message }); }
    }
  }
  return issues;
}

function checkJavaScript() {
  const issues = [];
  const files = walk(ROOT).filter((file) => /\.(?:js|mjs)$/i.test(file) && !file.endsWith('_worker.js'));
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'pipe' });
    } catch (error) {
      issues.push({
        severity: 'P0',
        type: 'js-syntax',
        file: path.relative(ROOT, file),
        message: String(error.stderr || error.message).slice(0, 1200)
      });
    }
  }
  return issues;
}

function runDiagnostics() {
  return [...detectDamage(), ...checkJavaScript()];
}

// ==================== AI ====================
async function callProvider(provider, prompt) {
  const apiKey = process.env[provider.key];
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: '너는 재운게임즈 장애복구 전용 에이전트다. 규칙을 위반하지 말고 최소 수정만 제안한다.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP_${response.status}: ${body.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text;
}

async function askFreeAi(prompt) {
  for (const provider of PROVIDERS) {
    try {
      log(`AI 시도: ${provider.name}`);
      const result = await callProvider(provider, prompt);
      log(`AI 성공: ${provider.name}`);
      return { provider: provider.name, result };
    } catch (error) {
      log(`AI 건너뜀/실패: ${provider.name} (${String(error.message).slice(0, 160)})`);
    }
  }
  fail('무료 AI 3개 모두 사용 불가. 유료 fallback 없이 종료');
}

function buildPrompt(rules, issues) {
  const issueFiles = [...new Set(issues.map((item) => item.file))].slice(0, MAX_FILES);
  const evidence = issueFiles.map((file) => {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return `\n===== ${file} =====\n[파일 없음]`;
    return `\n===== ${file} =====\n${fs.readFileSync(full, 'utf8').slice(0, 16000)}`;
  }).join('\n');

  return `${rules}\n\n===== 장애 증거 =====\n${JSON.stringify(issues, null, 2)}\n${evidence}\n\n` +
    '원인을 분석하고 최소 수정 방향을 제안해. 신규 기능, 밸런스, 저장 구조 변경은 금지다. 아직 파일을 직접 수정하지 말고 수정 대상/원인/검증방법을 간결하게 답해.';
}

// ==================== 메인 ====================
async function main() {
  const command = process.argv[2] || 'check';
  const branch = ensureRepoSafe();
  const startSha = captureMainState();
  const rules = readRules();

  log(`브랜치: ${branch}`);
  log(`시작 main: ${startSha}`);

  const issues = runDiagnostics();
  if (!issues.length) {
    log('정적 장애 검사 통과');
    assertMainUnchanged(startSha);
    return;
  }

  console.log(JSON.stringify(issues, null, 2));
  if (command === 'check') fail(`장애 ${issues.length}건 발견`, 2);
  if (command !== 'diagnose') fail('지원 명령: check, diagnose');

  const prompt = buildPrompt(rules, issues).slice(0, MAX_PROMPT_CHARS);
  const answer = await askFreeAi(prompt);
  console.log(`\n===== ${answer.provider} 진단 =====\n${answer.result}`);
  assertMainUnchanged(startSha);
  log('진단 완료. 1차 코어에서는 AI가 파일을 자동 덮어쓰지 않음');
}

main().catch((error) => fail(error.stack || error.message));
