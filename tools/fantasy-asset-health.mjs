#!/usr/bin/env node
// 마력숲 화면 자산 점검 결과 읽기: 게임이 남긴 "마력숲 자산점검 ... 실패 n/m: id,id" 경고를 모아
// 어느 등록 키(모델/아이콘 시트)의 ID 인지 찾고, 어떤 조치가 필요한지 목록으로 만든다.
import fs from 'fs';
import path from 'path';

const GAME = 'roblox-games/fantasy-survival';

export function parseHealthLog(text) {
  const failed = new Set(), failedNames = new Set(), sourceErrors = new Set();
  let okScans = 0, badScans = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    const bad = line.match(/마력숲 자산점검\s+\S+\s+실패\s+\d+\/\d+:\s*([^\s]+)/);
    if (bad) {
      badScans++;
      // [에셋 ID] 잘린 로그의 1360 같은 조각은 유효한 등록 ID로 취급하지 않는다.
      for (const m of bad[1].matchAll(/rbxassetid:\/\/(\d{6,})|(\d{6,})/g)) failed.add(m[1] || m[2]);
    } else if (/마력숲 자산점검\s+\S+\s+이상 없음/.test(line)) okScans++;

    // [서버 런타임] 화면 PreloadAsync 로그와 별도로 서버 모델 오류도 수집한다.
    const asset = line.match(/(?:야영지 소품 로딩 실패|마력숲 CC0 초원 자산 로딩\/권한 실패|마력숲 아이템 모델 불러오기 실패|마력숲 등록된 CC0 초원 자산 없음|ARMORVIS source 3D missing):\s*([a-zA-Z_][\w-]*)/);
    if (asset) failedNames.add(asset[1]);
    if (/Invalid terrain material/.test(line)) sourceErrors.add('INVALID_TERRAIN_MATERIAL');
  }
  return { failedIds: [...failed], failedNames: [...failedNames], sourceErrors: [...sourceErrors], okScans, badScans };
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
  for (const key of parsed.failedNames) {
    items.push({ id: null, key, action: 'SERVER_ASSET_ACCESS_FAILED',
      note: '서버에서 에셋 로딩·권한·원본 누락 오류 발생. 승인된 원본과 실제 체험 사용 권한을 확인해야 한다.' });
  }
  for (const error of parsed.sourceErrors) {
    items.push({ id: null, key: error, action: 'GAME_RUNTIME_SOURCE_ERROR',
      note: '게임 서버 런타임 오류. 해당 원인 코드 수정과 재배포 후 확인 필요.' });
  }
  return { ...parsed, items, ok: parsed.badScans === 0 && parsed.failedNames.length === 0 && parsed.sourceErrors.length === 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2).filter(f => !f.startsWith('--'));
  if (!files.length) { console.error('사용법: node tools/fantasy-asset-health.mjs <로그파일...> [--write]'); process.exit(2); }
  const r = buildReport(files.map(f => fs.readFileSync(f, 'utf8')));
  console.log(`점검 이상없음 ${r.okScans}회 · 화면 실패 ${r.badScans}회 · 실패 ID ${r.failedIds.length}개 · 서버 자산 실패 ${r.failedNames.length}종 · 런타임 오류 ${r.sourceErrors.length}종`);
  for (const i of r.items) console.log(` - ${i.id} ${i.key || '(미등록)'} → ${i.action}`);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(GAME, 'broken-assets.json'), JSON.stringify({ at: new Date().toISOString(), items: r.items }, null, 2) + '\n');
  }
  process.exit(r.ok ? 0 : 1);
}
