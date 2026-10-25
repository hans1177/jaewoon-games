// 파일명: qa/party-rpg-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {runInNewContext} from "node:vm";
import * as THREE from "../assets/roblox/world-ghosts/native/mesh/three/three.module.js";

const html = fs.readFileSync(new URL("../web-games/party-rpg/index.html", import.meta.url), "utf8");

test("밤·안개·던전에서 날씨 갱신이 캐릭터를 안개로 지우지 않음",()=>{
 const source=fs.readFileSync(new URL('../web-games/party-rpg/view.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf(' applyEnvironment(live,dt,now){')+' applyEnvironment(live,dt,now){'.length,source.indexOf('\n render(live){'));
 const distance=Number(source.match(/const CAMERA_DISTANCE=(\d+);/)[1]);
 const update=runInNewContext('(function(live,dt,now){'+body.trim().slice(0,-1)+'})',{THREE,CAMERA_DISTANCE:distance,SCALE:1/36});
 for(const inside of [false,true])for(const weather of ['clear','fog','rain','snow','dust','ash'])for(const minutes of [0,510,720,1200]){
  const terrain={color:new THREE.Color(0xffffff)};
  const view={worldMood:{sky:0x3c4548,fog:0x4e5653,far:inside?55:52,light:0xffdaa3,intensity:1.75},
   scene:{background:new THREE.Color(),fog:new THREE.Fog(0x49514f,12,58)},
   sun:{color:new THREE.Color(),intensity:1,position:new THREE.Vector3()},skyLight:{color:new THREE.Color(),intensity:1},
   gl:{toneMappingExposure:.83},groundMaterial:()=>terrain,torchLights:[],torchFlames:[],banners:[],qualityPreset:'auto'};
  const live={state:{zone:0},dungeon:inside?{}:null,environment:{minutes,weather,quality:'auto'}};
  for(let frame=0;frame<300;frame++)update.call(view,live,1/30,frame*1000/30);
  assert.ok(view.scene.fog.near>distance,'카메라 중심의 캐릭터는 안개 밖에 있어야 함');
  assert.ok(view.scene.fog.far>=view.scene.fog.near+24,'날씨 전환 후에도 안개 깊이가 뒤집히지 않아야 함');
 }
 assert.match(source,/PlaneGeometry\(w\+80,h\+80\)/);
});

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
  const armors = block("var ARMORS=[", "];\n// 장신구");
  const dungeons = block("var DUNGEONS=[", "];\nvar AI_NAMES");

  assert.equal((weapons.match(/id:"/g) || []).length, 20);
  assert.equal((armors.match(/id:"/g) || []).length, 14);
  assert.equal((dungeons.match(/baseGold:/g) || []).length, 3);

  assert.ok(html.includes('rooms:[3,3,4]'));
  assert.ok(html.includes('rooms:[2,3,2,3]'));
  assert.ok(html.includes('rooms:[2,2,2,2,2]'));
  assert.ok(html.includes("else{spawnEnemy(d.boss"));
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
  assert.ok(html.includes("name:'판매상점',kind:'sell'"));
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

test("각성 계열 및 스킬북 보존", () => {
 const advances=block("var ADVANCEMENTS={", "};\nvar SKILL_BOOKS");
 const books=block("var SKILL_BOOKS=[", "];\nvar GEAR_FAMILIES");
 assert.equal((advances.match(/branches:\[/g)||[]).length,5);
 assert.equal((advances.match(/second:"/g)||[]).length,10);
 assert.equal((books.match(/id:"/g)||[]).length,45);
 assert.equal((books.match(/advance:"/g)||[]).length,20);
 assert.ok(html.includes("function awakeningMenu("));
 assert.ok(html.includes("recordAwakeningTrial();"));
 assert.ok(html.includes("u.awakenings={}"));
 assert.ok(html.includes("미구현 단계"));
 assert.ok(html.includes('SAVE_KEY="party-rpg-v1"'));
});

test("스토리 인과관계·대사·선택지 연속성 계약", () => {
 const evidence=block("var STORY_NOTES=", "var COMPANION_SECRETS=");
 const incidents=block("var INCIDENTS=", "function storyInit");
 const act2=block("const ACT2_SITES=", "// 3막");
 const imperial=block("const IMPERIAL_CASES=", "function imperialUnlocked");
 assert.equal((evidence.match(/초원|숲|동굴|사막|설원|마계/g)||[]).length>=6,true);
 assert.equal((incidents.match(/\"person\":/g)||[]).length,6);
 assert.equal((act2.match(/lead:/g)||[]).length,6);
 assert.equal((imperial.match(/\"id\":/g)||[]).length,8);
 assert.ok(html.includes("서막 · 봉인된 명령"));
 assert.ok(html.includes("마을에서 지워진 사람들의 이름"));
 assert.ok(html.includes("경계의 수호를 교대로 맡는다"));
 assert.ok(html.includes("function eventSceneData(key)"));
 assert.ok(html.includes("kind==='act2clear'||kind==='battleclear'"));
 assert.ok(html.includes("s.choices.fort"));
 assert.ok(html.includes("s.choices.temple"));
 assert.ok(html.includes("s.choices.ending"));
 assert.ok(html.includes("state.story.choices[raw]"));
});

test("열 명의 동료가 고유한 말투와 반응을 유지한다", () => {
 const raw=block("const COMPANION_PERSONALITIES=", ";\n// 캐릭터별 어휘");
 const profiles=JSON.parse(raw.slice("const COMPANION_PERSONALITIES=".length));
 const names=["루카","미나","제이드","토르","리안","세라","보린","유나","카일","네오"];
 assert.equal(profiles.length,10);
 assert.equal(profiles.map(p=>p.name).join(","),names.join(","));
 for(const key of ["manner","value","flaw","truth","guard","danger","discovery","past"]){
  assert.equal(new Set(profiles.map(p=>p[key])).size,10,key+" 중복 대사");
  assert.ok(profiles.every(p=>typeof p[key]==="string"&&p[key].trim().length>4),key+" 빈 대사");
 }
 assert.ok(html.includes("function companionResponse(a,topic)"));
 assert.ok(html.includes("data-personality-topic"));
 assert.ok(html.includes("b.dataset.personalityTopic"));
 assert.ok(html.includes("동료의 반응 · "));
 assert.ok(html.includes("companionResponse(a,quest.path)"));
 assert.ok(html.includes("const participants=partyMembers()"));
});

// 화면 정리는 기존 조작·저장·각 기능의 책임 이벤트를 보존한다.
test('모바일 여정 메뉴가 기존 기능 버튼을 중복 없이 보존한다',()=>{
 const body=html.slice(html.indexOf('<body>'),html.indexOf('<script type="importmap">'));
 const ids=[...body.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 const menu=body.slice(body.indexOf('<details id="fieldMenu">'),body.indexOf('</details>')+10);
 for(const id of ['rosterBtn','journalBtn','heroSheetBtn','bagBtn','mapBtn','systemBtn','audioBtn','partyInspect','zoomIn','zoomOut','rotateView','centerView'])assert(menu.includes('id="'+id+'"'),id);
 for(const id of ['attackBtn','skillBtn','interactBtn','pauseBtn','tacticsBtn','joystick','nextQuest','timeWeather','autoBtn','partyCards'])assert(ids.includes(id),id);
 assert.match(html,/menu\.contains\(document\.activeElement\)\?menu\.querySelector\('summary'\)/);
 assert.match(html,/fieldMenu\.addEventListener\('click'/);assert.match(html,/document\.body\.dataset\.heroClass=state\.player\.classId/);
});
