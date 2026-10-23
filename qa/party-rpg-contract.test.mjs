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

test("파티 RPG 실존 CC0 3D 원본을 로드하고 미검증 적은 원본 2D를 유지함",()=>{
 const paths=[...html.matchAll(/['"]((?:\.\.\/)+assets\/[^'"]+\.glb)['"]/g)].map(m=>m[1]);
 const expected=["Barbarian.glb","Knight.glb","Mage.glb","Rogue.glb","Rogue_Hooded.glb"];
 assert.equal(paths.length,expected.length,"invalid or imaginary 3D model requests");
 assert.deepEqual(paths.map(x=>x.split("/").at(-1)).sort(),expected.sort());
 for(const relative of paths){
  assert.match(relative,/^\.\.\/\.\.\/assets\/roblox\/actors\/sources\/kaykit-adventurers\/[^/]+\.glb$/);
  const file=new URL("../web-games/party-rpg/"+relative,import.meta.url);
  assert.equal(fs.existsSync(file),true,"GLB not found "+relative);
  assert.ok(fs.statSync(file).size>100_000,"GLB source truncated "+relative);
 }
 const license=fs.readFileSync(new URL("../assets/roblox/actors/sources/kaykit-adventurers/LICENSE.txt",import.meta.url),"utf8");
 assert.match(license,/Creative Commons Zero, CC0/);
 assert.match(html,/name\.charCodeAt\(i\)/,"AI identity must not change as X moves");
 assert.match(html,/return null;\s*}\s*window\.vibe3dCanRender/s,"no wrong-species 3D substitution");
 assert.match(html,/if\(window\.vibe3dCanRender&&window\.vibe3dCanRender\('enemy',e\)\)return/,"preserve original enemy canvas rendering");
});
