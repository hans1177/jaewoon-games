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
  const armors = block("var ARMORS=[", "];\nvar MATERIALS");
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

test("판매상점과 AI 5분 행동 순환 계약", () => {
  assert.ok(html.includes('name:"판매상점",kind:"sell"'));
  assert.ok(html.includes('function sellMaterials(unit)'));
  assert.ok(html.includes('function sellMenu()'));
  assert.ok(html.includes('materials:{}'));

  const routine = block("function setAIRoutine(a,routine){", "function buyAIUpgrade");
  assert.ok(routine.includes('routineTime=120'));
  assert.ok(routine.includes('routineTime=60'));

  const cycle = block("function updateAIRoutines(dt){", "function moveAITo");
  assert.ok(cycle.includes('a.routine==="hunt"'));
  assert.ok(cycle.includes('setAIRoutine(a,"town")'));
  assert.ok(cycle.includes('a.routine==="town"'));
  assert.ok(cycle.includes('setAIRoutine(a,"shop")'));
  assert.ok(cycle.includes('a.routine==="shop"'));
  assert.ok(cycle.includes('setAIRoutine(a,"hunt")'));

  const upgrade = block("function nextAIUpgrade(a){", "function setAIRoutine");
  assert.ok(upgrade.includes("it.power>aiWeaponPower(a)"));
  assert.ok(upgrade.includes("it.def>aiArmorDef(a)"));

  const buy = block("function buyAIUpgrade(a,choice){", "function attackPlayer");
  assert.ok(buy.includes('if(a.gold<it.price){setAIRoutine(a,"hunt");return false;}'));

  const kill = block("function killEnemy(e,killer){", "function nextAIUpgrade");
  assert.ok(!kill.includes("aiShop("));
  assert.ok(kill.includes("addMaterial(receiver,state.zone)"));
});
