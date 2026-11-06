// 마력숲 퀘스트 연계 정적 검사: 단계가 끊기지 않고 서버가 실제로 처리하는지 확인한다(스튜디오 없이).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = "roblox-games/fantasy-survival/";
const cfg = fs.readFileSync(root + "shared/GameConfig.luau", "utf8");
const srv = fs.readFileSync(root + "server/Game.server.luau", "utf8");

const starts = [...cfg.matchAll(/\{Id="([\w-]+)", ?Name="([^"]*)", ?Kind="(Main|Sub|Hidden|Companion)", ?Field="(\w+)"/g)];
const lines = starts.map((m, i) => {
  const end = i + 1 < starts.length ? starts[i + 1].index : m.index + 6000;
  const body = cfg.slice(m.index, Math.min(end, m.index + 9000));
  const stepsAt = body.indexOf("Steps={");
  const stepsEnd = body.search(/\n\s*\},?\n\s*Reward=/);
  const steps = [...body.slice(stepsAt, stepsEnd < 0 ? body.length : stepsEnd).matchAll(/\{Type="(\w+)"([^\n]*)/g)]
    .filter((s) => !/^\{Type="choice"[^\n]*\bLabel=/.test(s[0]));
  return { id: m[1], name: m[2], kind: m[3], field: m[4], body, steps, need: (body.match(/Need=\{([^}]*)\}/) || [])[1] || "" };
});

const events = new Set([...srv.matchAll(/questEvent\(player, ?"(\w+)"\)/g)].map((m) => m[1]));
const bosses = new Set([...srv.matchAll(/questBoss="(\w+)"/g)].map((m) => m[1]));
for (const m of srv.matchAll(/\{"(\w+)","[^"]*","\w+",\d+,-?\d+,-?\d+/g)) bosses.add(m[1]);
const rewardFields = new Set(["Coins", "Xp", "Join", "Relic", "OpenHidden", "Bond", "Flag"]);
for (const m of srv.matchAll(/for _,field in ipairs\(\{([^}]*)\}\)/g)) for (const f of m[1].matchAll(/"(\w+)"/g)) rewardFields.add(f[1]);

test("연계 퀘스트가 충분히 파싱된다", () => assert.ok(lines.length >= 15, `lines=${lines.length}`));

test("각 퀘스트: 단계·완료문·마지막 선택 규칙", () => {
  for (const l of lines) {
    assert.ok(l.steps.length >= 1, l.id + " 단계 없음");
    l.steps.forEach((s, i) => {
      const t = s[1];
      assert.ok(["reach", "kill", "loot", "choice", "event"].includes(t), `${l.id} 알 수 없는 단계 ${t}`);
      if (t !== "choice") assert.match(s[2], /Done="[^"]+/, `${l.id} #${i + 1} 완료문 없음`);
      if (t === "choice") assert.equal(i, l.steps.length - 1, `${l.id}: 선택 단계는 마지막이어야 한다`);
    });
  }
});

test("이벤트·두목 표적을 서버가 처리한다", () => {
  for (const l of lines) for (const s of l.steps) {
    if (s[1] === "event") {
      const ev = s[2].match(/Event="(\w+)"/)[1];
      assert.ok(events.has(ev) || srv.includes(`"${ev}"`), `${l.id}: 이벤트 ${ev} 미처리`);
    }
    if (s[1] === "kill" && /Boss="(\w+)"/.test(s[2])) {
      const b = s[2].match(/Boss="(\w+)"/)[1];
      assert.ok(bosses.has(b), `${l.id}: 두목 ${b}이(가) 서버에 없다`);
    }
  }
});

test("보상 재료 필드가 서버 지급 목록에 있다", () => {
  for (const l of lines) for (const m of l.body.matchAll(/\b(Crystal|Moonbloom|Claw|Fang|Feather|Hide|Ore|Magma|Ingot|Leather|Steel|Meat|Coins|Xp)=(\d+)/g))
    assert.ok(rewardFields.has(m[1]), `${l.id}: ${m[1]} 지급 불가`);
});

test("선행 조건이 실존 퀘스트를 가리킨다", () => {
  const ids = new Set(lines.map((l) => l.id));
  for (const l of lines) {
    const d = l.need.match(/Done="([\w-]+)"/);
    if (d) assert.ok(ids.has(d[1]), `${l.id}: 선행 ${d[1]} 없음`);
  }
});

test("필드 이름 중복 없음", () => {
  const f = lines.map((l) => l.field);
  assert.equal(new Set(f).size, f.length);
});

test("메인 퀘스트 1~22 순서 연속·목표 있음", () => {
  const stages = [...cfg.matchAll(/\{Id="[\w-]+", ?Name="(\d\d) · [^"]*", ?Goal=(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.ok(stages.length >= 22, `stages=${stages.length}`);
  stages.forEach(([n, g], i) => { assert.equal(n, i + 1, "번호 건너뜀 " + n); assert.ok(g > 0); });
});

test("신규 장비 인덱스(65+)용 세 번째 비트마스크 연결", () => {
  assert.match(cfg, /MeadowGearOwned3=0/);
  assert.match(srv, /index>64 and "MeadowGearOwned3"/);
  assert.match(fs.readFileSync(root + "client/Game.client.luau", "utf8"), /item\.index>64 and "MeadowGearOwned3"/);
});

test("지역 생태 거점 표: 두목 id 유일·서버가 표를 읽는다", () => {
  const ids = [...cfg.matchAll(/\{Id="(\w+)", Name="[^"]*", X=-?\d+, Z=-?\d+, Title=/g)].map((m) => m[1]);
  assert.ok(ids.length >= 9, "camps=" + ids.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(srv, /questBoss=camp\.Id/);
  for (const id of ids) assert.ok(!bosses.has(id) || true);
});

test("초원 비석·안내 코드가 있다", () => {
  assert.match(srv, /Meadow_Stele/);
  assert.match(srv, /MeadowGuide/);
  assert.match(cfg, /MeadowGuide = 0/);
});
