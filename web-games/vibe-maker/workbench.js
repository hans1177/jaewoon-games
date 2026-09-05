// 파일명: web-games/vibe-maker/workbench.js
// 역할: 브라우저 바이브 개발 작업실의 실제 프로젝트 분석/수정/백업/비교 실행기
// 규칙: 기존 파일을 먼저 읽고, 저장 전 스냅샷 생성, 텍스트 파일만 직접 수정, 모바일 우선

import { createVibeBuildPlan } from '../../assets/vibe-build-plan.js';
import { createVibeWorkspace } from '../../assets/vibe-workspace.js';

const STORAGE_KEY = 'jaewoon-vibe-workbench';

function clean(value) { return String(value ?? '').trim(); }
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function textList(values) { return Array.isArray(values) ? values.filter(Boolean).map(clean) : []; }

export class VibeWorkbenchController {
  constructor({ root = document } = {}) {
    this.root = root;
    this.workspace = null;
    this.plan = null;
    this.selectedPath = null;
    this.selectedText = '';
    this.state = loadState();
  }

  bind() {
    this.bindButton('openWorkspace', () => this.openWorkspace());
    this.bindButton('inspectProject', () => this.inspectProject());
    this.bindButton('planChange', () => this.planChange());
    this.bindButton('saveFile', () => this.saveSelectedFile());
    this.bindButton('restoreSnapshot', () => this.restoreSelectedFile());
    this.bindButton('refreshFiles', () => this.refreshFiles());
    this.bindButton('exportPlan', () => this.exportPlan());
    this.restoreUi();
    return this;
  }

  bindButton(id, handler) {
    const node = this.root.getElementById(id);
    if (node) node.addEventListener('click', async () => {
      try { await handler(); }
      catch (error) { this.setStatus(`오류: ${error.message}`); }
    });
  }

  async openWorkspace() {
    this.workspace = await window.pickJaewoonVibeWorkspace();
    const summary = this.workspace.summary();
    this.state.workspaceOpened = true;
    saveState(this.state);
    this.renderSummary(summary);
    this.renderFiles(summary.files);
    this.setStatus(`프로젝트 열림 · 파일 ${summary.fileCount}개`);
  }

  async refreshFiles() {
    if (!this.workspace) throw new Error('먼저 프로젝트 폴더를 열어줘');
    const summary = await this.workspace.scan();
    this.renderSummary(summary);
    this.renderFiles(summary.files);
    this.setStatus(`새로 읽음 · ${summary.fileCount}개 파일`);
  }

  async inspectProject() {
    if (!this.workspace) throw new Error('먼저 프로젝트 폴더를 열어줘');
    const summary = this.workspace.summary();
    const target = summary.godotProject ? 'godot' : 'web';
    const request = clean(this.root.getElementById('request')?.value) || '이 프로젝트 상태를 분석하고 품질 개선 방향을 알려줘';
    this.plan = createVibeBuildPlan({ request, target });
    this.renderPlan(this.plan);
    this.setStatus(`분석 완료 · ${target === 'godot' ? 'Godot' : '웹'} 프로젝트`);
  }

  async planChange() {
    if (!this.workspace) throw new Error('먼저 프로젝트 폴더를 열어줘');
    const request = clean(this.root.getElementById('request')?.value);
    if (!request) throw new Error('뭘 고칠지 적어줘');
    const summary = this.workspace.summary();
    const target = summary.godotProject ? 'godot' : 'web';
    this.plan = createVibeBuildPlan({ request, target, rebuild: /고퀄|리빌드|리메이크|업그레이드|제대로/i.test(request) });
    this.renderPlan(this.plan);
    this.state.lastRequest = request;
    saveState(this.state);
    this.setStatus('수정 작업 계획 완료 · 파일을 읽고 직접 고칠 준비가 됐어');
  }

  async selectFile(path) {
    if (!this.workspace) throw new Error('프로젝트를 먼저 열어줘');
    if (!path) return;
    const text = await this.workspace.read(path);
    this.selectedPath = path;
    this.selectedText = text;
    const editor = this.root.getElementById('editor');
    if (editor) editor.value = text;
    const name = this.root.getElementById('selectedFile');
    if (name) name.textContent = path;
    this.setStatus(`읽음 · ${path}`);
  }

  async saveSelectedFile() {
    if (!this.workspace || !this.selectedPath) throw new Error('수정할 파일을 먼저 골라줘');
    const editor = this.root.getElementById('editor');
    const next = editor?.value ?? '';
    const result = await this.workspace.write(this.selectedPath, next, { backup: true, expectedPrevious: this.selectedText });
    this.selectedText = next;
    this.setStatus(result.changed ? `저장 완료 · 자동 백업 생성 · ${this.selectedPath}` : '변경 없음');
    await this.refreshFiles();
  }

  async restoreSelectedFile() {
    if (!this.workspace || !this.selectedPath) throw new Error('파일을 먼저 골라줘');
    const snapshot = this.workspace.snapshots.get(this.selectedPath);
    if (snapshot == null) throw new Error('이 세션에서 읽은 원본 스냅샷이 없어');
    const editor = this.root.getElementById('editor');
    if (editor) editor.value = snapshot;
    this.setStatus(`원본 스냅샷 복원 준비 · 저장을 누르면 적용돼`);
  }

  exportPlan() {
    if (!this.plan) throw new Error('먼저 작업 분석을 해줘');
    const blob = new Blob([JSON.stringify(this.plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vibe-plan.json';
    anchor.click();
    URL.revokeObjectURL(url);
    this.setStatus('작업 계획 저장 완료');
  }

  restoreUi() {
    const request = this.root.getElementById('request');
    if (request && this.state.lastRequest) request.value = this.state.lastRequest;
  }

  renderSummary(summary) {
    const node = this.root.getElementById('summary');
    if (!node) return;
    node.textContent = [
      `파일 ${summary.fileCount}개`,
      `텍스트 ${summary.textFiles}개`,
      `용량 ${Math.round(summary.totalBytes / 1024)}KB`,
      summary.webProject ? '웹 프로젝트' : '',
      summary.godotProject ? 'Godot 프로젝트' : '',
    ].filter(Boolean).join(' · ');
  }

  renderFiles(files) {
    const list = this.root.getElementById('files');
    if (!list) return;
    list.replaceChildren();
    for (const file of files.filter((item) => item.text).slice(0, 500)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fileItem';
      button.textContent = `${file.path} · ${Math.round(file.size / 1024)}KB`;
      button.addEventListener('click', () => this.selectFile(file.path).catch((error) => this.setStatus(`오류: ${error.message}`)));
      list.appendChild(button);
    }
  }

  renderPlan(plan) {
    const fields = {
      intent: plan.intent?.join(', ') || '분석',
      target: plan.target,
      affected: textList(plan.affectedSystems).join(', ') || '일반',
      protected: textList(plan.protectedTargets).join(', ') || '없음',
      style: plan.visualStyle?.style || '기존 스타일 유지',
      animation: plan.animation?.states?.join(', ') || '기본 모션',
      mobile: plan.mobile?.virtualJoystick ? '터치 + 조이스틱' : '확인 필요',
    };
    for (const [key, value] of Object.entries(fields)) {
      const node = this.root.getElementById(`plan-${key}`);
      if (node) node.textContent = value;
    }
    const steps = this.root.getElementById('steps');
    if (steps) steps.textContent = (plan.phases || []).join('\n');
  }

  setStatus(message) {
    const node = this.root.getElementById('status');
    if (node) node.textContent = clean(message);
  }
}

export function createVibeWorkbenchController(options = {}) {
  return new VibeWorkbenchController(options).bind();
}

if (typeof window !== 'undefined') window.createJaewoonVibeWorkbenchController = createVibeWorkbenchController;
