#!/usr/bin/env node
// 마력숲 자산 연결 점검: 코드가 참조하는 모델 키·아이콘 셀·에셋 ID가 등록돼 있는지 정적으로 확인한다.
import fs from 'fs';
import path from 'path';
const dir = 'roblox-games/fantasy-survival/';
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
export function checkFantasyAssets() {
  const problems = [];
  const ids = read('shared/VisualAssetIds.luau');
  const registered = new Map([...ids.matchAll(/([A-Za-z_][\w]*)\s*=\s*(\d{6,})/g)].map(m => [m[1], m[2]]));
  const cfg = read('shared/GameConfig.luau');
  const server = read('server/Game.server.luau');
  const client = read('client/Game.client.luau');
  // 1) 장비·망토 ModelKey가 등록 ID로 연결되는지
  const keys = new Set([...cfg.matchAll(/ModelKey\s*=\s*"([^"]+)"/g)].map(m => m[1]));
  for (const key of keys) if (!registered.has(key)) problems.push(`ModelKey 미등록: ${key}`);
  // 2) 등록 ID 중복/0 점검
  const seen = new Map();
  for (const [key, id] of registered) {
    if (/^0+$/.test(id)) problems.push(`ID가 0: ${key}`);
    if (seen.has(id) && !/^(mon_|item_)/.test(key)) seen.get(id).push(key); else if (!seen.has(id)) seen.set(id, [key]);
  }
  // 3) 클라이언트 rbxassetid 형식
  for (const m of client.matchAll(/rbxassetid:\/\/(\d+)/g)) if (m[1].length<6) problems.push(`잘못된 rbxassetid: ${m[0]}`);
  // 4) 스킬 아이콘 셀이 5x5 시트(0~24) 안인지
  for (const m of cfg.matchAll(/IconCell\s*=\s*(\d+)/g)) if (+m[1] > 24) problems.push(`IconCell 범위 초과: ${m[1]}`);
  // 5) Part로 만든 모델 금지
  if (/Instance\.new\("Part"\)/.test(client)) problems.push('클라이언트에 Part 생성');
  // 6) 서버가 spawnEnemy에서 쓰는 몬스터 종 키 등록
  for (const m of server.matchAll(/\{id="(wolf|bat|golem|ghost)"/g)) if (!registered.has(m[1]) && !registered.has('mon_' + m[1])) problems.push(`몬스터 종 미등록: ${m[1]}`);
  return { problems, registered: registered.size, modelKeys: keys.size };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = checkFantasyAssets();
  console.log(`등록 ID ${r.registered} · ModelKey ${r.modelKeys} · 문제 ${r.problems.length}`);
  for (const p of r.problems) console.log(' -', p);
  process.exit(r.problems.length ? 1 : 0);
}
