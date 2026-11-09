#!/usr/bin/env node
// 마력숲 화면 자산 점검 결과 읽기: 게임이 남긴 "마력숲 자산점검 ... 실패 n/m: id,id" 경고를 모아
// 어느 등록 키(모델/아이콘 시트)의 ID 인지 찾고, 어떤 조치가 필요한지 목록으로 만든다.
import fs from 'fs';
import path from 'path';

const GAME = 'roblox-games/fantasy-survival';

export function parseHealthLog(text) {
  const failed = new Set();
  let okScans = 0, badScans = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    const bad = line.match(/마력숲 자산점검\s+\S+\s+실패\s+\d+\/\d+:\s*([^\s]+)/);
    if (bad) {
      badScans++;
      for (const m of bad[1].matchAll(/rbxassetid:\/\/(\d+)|(\d{6,})/g)) failed.add(m[1] || m[2]);
    } else if (/마력숲 자산점검\s+\S+\s+이상 없음/.test(line)) okScans++;
  }
  return { failedIds: [...failed], okScans, badScans };
}

export function loadRegistry(root = GAME) {
  const idFile = f => {
    const p = path.join(root, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };
  const map = new Map();
  for (const f of ['shared/VisualAssetIds.luau', 'shared/SkillTreeIconIds.luau', 'shared/OpeningAssetIds24.luau'])
    for (const m of idFile(f).matchAll(/([A-Za-z_][\w]*)\s*=\s*"?(?:rbxassetid:\/\/)?(\d{6,})"?/g)) if (!map.has(m[2])) map.set(m[2], { key: m[1], file: f });
  const reup = path.join(root, 'reupload-map.json');
  const files = fs.existsSync(reup) ? JSON.parse(fs.readFileSync(reup, 'utf8')).files || {} : {};
  return { map, reuploadKeys: new Set(Object.keys(files)) };
}

// 조치 분류: 등록 키를 찾으면 어디서 고치는지, 못 찾으면 코드에 직접 박힌 ID(수동 확인).
export function classify(failedIds, registry) {
  return failedIds.map(id => {
    const hit = registry.map.get(id);
    if (!hit) return { id, key: null, action: 'UNREGISTERED_ID_CHECK_CODE', note: '등록표에 없는 ID. 코드에 직접 쓴 ID 이거나 이전 계정 자산이다.' };
    if (registry.reuploadKeys.has(hit.key)) return { id, key: hit.key, file: hit.file, action: 'REUPLOAD_MODEL', note: 'Owner Fantasy Re-register Assets 워크플로 다시 실행' };
    if (/icon/i.test(hit.key) || /SkillTreeIconIds/.test(hit.file)) return { id, key: hit.key, file: hit.file, action: 'REUPLOAD_ICON_SHEET', note: 'fantasy-skilltree-icons 워크플로로 아이콘 시트 다시 올리기' };
    return { id: id, key: hit.key, file: hit.file, action: 'REGISTERED_BUT_NOT_LOADING', note: '등록은 돼 있으나 불러오기 실패: 권한(체험 사용 허용)·심사 상태 확인' };
  });
}

export function buildReport(texts, root = GAME) {
  const parsed = parseHealthLog(texts.join('\n'));
  const items = classify(parsed.failedIds, loadRegistry(root));
  return { ...parsed, items, ok: parsed.badScans === 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2).filter(f => !f.startsWith('--'));
  if (!files.length) { console.error('사용법: node tools/fantasy-asset-health.mjs <로그파일...> [--write]'); process.exit(2); }
  const r = buildReport(files.map(f => fs.readFileSync(f, 'utf8')));
  console.log(`점검 이상없음 ${r.okScans}회 · 실패 ${r.badScans}회 · 실패 ID ${r.failedIds.length}개`);
  for (const i of r.items) console.log(` - ${i.id} ${i.key || '(미등록)'} → ${i.action}`);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(GAME, 'broken-assets.json'), JSON.stringify({ at: new Date().toISOString(), items: r.items }, null, 2) + '\n');
  }
  process.exit(r.ok ? 0 : 1);
}
