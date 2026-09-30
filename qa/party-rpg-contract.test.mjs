// 파일명: qa/party-rpg-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../web-games/party-rpg/index.html", import.meta.url), "utf8");

function block(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start + " 블록이 필요함");
  return html.slice(a, b);
}

test("파티 RPG 핵심 계약", () => {
  const ai = block("var AI_NAMES=[", "];\nvar defaultState");
  assert.equal((ai.match(/"/g) || []).length / 2, 10);

  const weapons = block("var WEAPONS=[", "];\nvar ARMORS");
  const armors = block("var ARMORS=[", "];\nvar DROPS");
  const dungeons = block("var DUNGEONS=[", "];\nvar AI_NAMES");

  assert.equal((weapons.match(/id:"/g) || []).length, 5);
  assert.equal((armors.match(/id:"/g) || []).length, 4);
  assert.equal((dungeons.match(/baseGold:/g) || []).length, 3);

  assert.ok(html.includes('rooms:[3,3,4]'));
  assert.ok(html.includes('rooms:[2,3,2,3]'));
  assert.ok(html.includes('rooms:[2,2,2,2,2]'));
  assert.ok(html.includes("else spawnEnemy(d.boss"));
  assert.ok(html.includes("dungeon.door=true"));
  assert.ok(html.includes("dungeon.contrib"));
  assert.ok(html.includes("rollDungeonDrop"));
  assert.ok(html.includes("던전 전용 전리품"));
  assert.ok(html.includes("partyCount()<1"));
  assert.ok(html.includes("Math.random()<0.16"));
  assert.ok(html.includes("gameStarted&&!modalOpen"));
  assert.ok(html.includes('addEventListener("beforeunload",save)'));
});
