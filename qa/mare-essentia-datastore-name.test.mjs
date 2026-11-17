import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// DataStore 이름이 개명·유니버스 변경 중에 조용히 바뀌어 플레이어 저장이 초기화되는 사고를 막는다.
// (2026-11-08: 새 유니버스에서 MareEssentia_v2로 저장이 시작됨.) 바꿔야 한다면 기존 저장 이전(마이그레이션)을 먼저 구현하고 이 테스트를 의도적으로 갱신한다.
const core=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau','utf8');

test('Mare Essentia 저장소 이름은 MareEssentia_v2로 고정된다', () => {
  const m=core.match(/^local STORE_NAME = "([^"]+)"/m);
  assert.ok(m,'STORE_NAME 선언을 찾지 못함');
  assert.equal(m[1],'MareEssentia_v2');
});

test('플레이어 저장 키는 UserId 기반 P_ 접두를 유지한다', () => {
  assert.match(core,/return "P_" \.\. player\.UserId/);
});


// [탐험 숙련 회귀] 기존 DataStore 확장·서버 정산·2~3타 무기별 순수 시각 연출을 점검한다.
const read=(p)=>fs.readFileSync('roblox-games/mare-essentia/src/'+p,'utf8');
const state=read('ServerScriptService/Services/State.luau');
const discovery=read('ServerScriptService/Services/Discovery.luau');
const view=read('ServerScriptService/Services/View.luau');
const field=read('ReplicatedStorage/Shared/FieldScene.luau');
const client=read('StarterPlayer/Game.client.luau');

test('무기별 숙련은 기존 저장소에 호환 추가되고 구버전 저장을 읽는다',()=>{
  assert.match(state,/weaponPractice = \{\}/);
  assert.match(state,/type\(saved\.weaponPractice\) == "table"/);
  assert.match(state,/D\.Weapons\.get\(id\)\.id == id/);
  assert.match(state,/weaponPractice = state\.weaponPractice/);
  assert.match(view,/view\.weaponPractice = table\.clone/);
});

test('탐험 숙련은 서버 유효 무기·시간 상한·중복 재전송 검사 후 정산한다',()=>{
  assert.match(discovery,/handlers\.FieldPracticeBegin/);
  assert.match(discovery,/handlers\.FieldPracticeCommit/);
  assert.match(discovery,/fieldRuns\[state\] = nil/);
  assert.match(discovery,/math\.min\(120,/);
  assert.match(client,/call\("FieldPracticeBegin"/);
  assert.match(client,/call\("FieldPracticeCommit"/);
  // 탐험 종료의 기존 3개 반환값을 유지하고, 검증 대상인 연타 기록만 마지막 인자로 추가 전달한다.
  assert.match(field,/pcall\(opts\.onFinish, result, observedCardId, earnedPractice, fieldStreakResult\)/);
  assert.match(client,/onFinish = function\(result, observedCardId, gainedPractice, streakRecord\)/);
  assert.match(client,/record = streakRecord and streakRecord\.hits or 0/);
  assert.match(discovery,/local recordLimit = math\.min\(500,/);
  assert.match(field,/local rank = practiceRank\(practice\.xp\)/);
});

test('2·3연타 막타는 무기별 시각 연출만 재생하고 실제 타격은 추가하지 않는다',()=>{
  assert.match(field,/stage < 2 or stage > 3/);
  assert.match(field,/if stage == chain then\s*masteryCinema\(hrp, stage, defeatedAt\)/);
  assert.match(field,/if visualMobile then 0\.14 else 0\.19/);
  assert.doesNotMatch(field,/slowMotionUntil/);
  assert.match(field,/local finishName = if family == "fist" then "훅"/);
  for (const feature of ['"급습"','"분쇄"','"관통"','"충격"','"속사"','"관통 사격"','"반동 사격"','"교차 베기"']) {
    assert.ok(field.includes(feature), '무기별 마무리 누락: '+feature);
  }
  assert.match(field,/elseif wpn\.id == "crossbow" then\s*if strong then arrowTrail/);
  assert.match(field,/elseif family == "bow" then\s*if strong then arrowTrail/);
  assert.match(field,/-- 추가 공격은 R15 무기 자세와 이펙트뿐이다/);
  assert.match(client,/call\("Explore", \{ siteId = s\.id, observedCardId = observedCardId \}\)/);
  assert.doesNotMatch(discovery,/state\.coins\s*\+=\s*earned/);
});


test('연타 1단 봉인·무기별 낮은 확률·공용 7초 제한·최대 3타를 유지한다',()=>{
  assert.match(field,/local comboRng = Random\.new\(\)/);
  assert.match(field,/local lastMasteryComboAt = -100/);
  assert.match(field,/local baseChance = if rank == 2 then 0\.07 elseif rank == 3 then 0\.10/);
  assert.match(field,/rank == 4 then 0\.13 elseif rank == 5 then 0\.16 else 0/);
  assert.match(field,/local weaponChance = if wpn\.family == "dagger" then 0\.02/);
  assert.match(field,/elseif wpn\.id == "crossbow" then -0\.025/);
  assert.match(field,/local battleBonus = math\.min\(0\.02,/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
  assert.match(field,/local threeHitBase = if rank == 2 then 0 elseif rank == 3 then 0\.16/);
  assert.match(field,/chain = if rank == 2 then 2[\s\S]*?then 3 else 2/);
  assert.match(field,/for stage = 2, chain do/);
  assert.doesNotMatch(field,/chain = if rank == 2 then 2[\s\S]*?else 5\)/);
});

test('필드 전투 스킬 버튼은 글자 없이 등록 아이콘을 중앙에 표시한다',()=>{
  assert.match(field,/local iconOnly = string\.sub\(button\.Name, 1, 11\) == "FieldSkill_"/);
  assert.match(field,/medallion\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/img\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/local function mkSkill\(key, label, color, pos, size\)[\s\S]*?btn\(gui, "", color/);
  assert.match(field,/b:SetAttribute\("SkillFullName", label\)/);
  assert.match(field,/lb\.Text = ""[\s\S]*?addIcon\(lb, "Menu\/cc0_no"\)/);
  assert.match(field,/b:SetAttribute\("SkillShortName", shortName\)/);
  assert.match(field,/local paintedKey = if type\(card\.id\) == "string" and AssetIds\["CardArt\/"/);
  assert.doesNotMatch(field,/FieldSkillCaption/);
  assert.match(field,/timer\.Visible = false -- \[아이콘 전용\]/);
  assert.match(field,/sb\.btn:GetAttribute\("IconArtKey"\) ~= iconKey/);
  assert.match(field,/if key == "parry" then useGuard\(\) else useMove\(key\) end/);
  assert.match(field,/useCard\(key, card\)/);
  assert.match(field,/pl\.cd\[key\] = now \+ 8/);
});

test('동료 명세 계산은 별도 책임 범위에서 실행되어 필드 컴파일 지역변수 한도를 넘기지 않는다',()=>{
  assert.match(field,/local function prepareAllyDefs\(\)/);
  assert.match(field,/local allyDefs = prepareAllyDefs\(\)/);
  assert.match(field,/local function hashName\(str: string\): number/);
  assert.match(field,/weapon = Weapons\.allyWeapon\(category,/);
  assert.match(field,/local allies: \{ any \} = \{\}/);
  assert.match(field,/무기 숙련 시 2~3연타 확률 발동/);
  assert.doesNotMatch(field,/무기 숙련 시 2~5단 확률 발동/);
});

// [실물 무기 회귀] 승인된 해적 키트 원본만 사용하고 저장·전투 수치를 변경하지 않는다.
test('실물 해적 선상도·쌍날도끼·권총은 CC0 원본과 병종에 연결된다',()=>{
  const weaponDefs=read('ReplicatedStorage/Shared/Weapons.luau');
  const required=[
    {id:'cutlass',name:'weapon-cutlass',role:'선상도 검병'},
    {id:'doubleaxe',name:'weapon-doubleaxe',role:'쌍날도끼 돌격병'},
    {id:'ship_pistol',name:'weapon-pirate-pistol',role:'해적 권총병'},
  ];
  for(const item of required){
    const file='roblox-games/mare-essentia/assets/relics/'+item.name+'.glb';
    assert.ok(fs.existsSync(file),'원본 메시 누락: '+item.name);
    const proof=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    assert.equal(proof.license,'CC0-1.0',item.name+' 사용 허가');
    assert.equal(proof.author,'Quaternius',item.name+' 원저작자');
    assert.match(proof.source,/^https:\/\/quaternius\.com\/packs\/piratekit\.html$/);
    assert.ok(proof.sourceSha256 && /^[a-f0-9]{64}$/.test(proof.sourceSha256),'해시 누락: '+item.name);
    assert.ok(weaponDefs.includes('"'+item.id+'"') && weaponDefs.includes('"'+item.name+'"'),'장비 명세 누락: '+item.id);
    assert.ok(field.includes('"'+item.role+'"'),'적 병종 누락: '+item.role);
    assert.ok(field.includes('AssetIds["Relics/'+item.name+'"]'),'미등록 무기 차단 누락: '+item.name);
  }
  assert.match(field,/style\[4\] == "ship_pistol"\) then/);
  assert.match(field,/equipFieldWeapon\(enemy\.model, enemy\.weapon, enemy\.shieldModel, enemy\.throwAsset\)/);
  assert.match(field,/local shieldBlocked = not quiet and e\.shieldModel and e\.ac\.def\.frontGuard/);
  assert.match(field,/e\.root\.CFrame\.LookVector:Dot\(approach\.Unit\) > 0\.35/);
  assert.match(field,/e\.model:FindFirstChild\("FieldShield"\) ~= nil/);
  assert.match(field,/e\.bombAim = hrp\.Position/);
  assert.match(field,/hit = diff\.Magnitude <= 6/);
});

// [무기 사실성 회귀] R15 관절·재질 표현만 보강하고 전투 수치·저장 구조는 변경하지 않는다.
test('적과 동료는 무기별 준비·타격·회수 동작과 원본 PBR 맵을 유지한다',()=>{
  const fieldMotion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  for(const weapon of ['PISTOL','RIFLE','BOW','LONGBOW','CROSSBOW','SPEAR','DAGGER','WAR_AXE','MACE','RAPIER','SABRE','SCIMITAR','KATANA']){
    assert.ok(fieldMotion.includes('grip == "'+weapon+'"'),'무기 동작 구분 누락: '+weapon);
  }
  for(const name of ['prepare','strike','returnGrip','hold','RightWrist','ForearmR','UpperArmL','ThighL','FootR']){
    assert.ok(fieldMotion.includes(name),'R15 관절 단계 누락: '+name);
  }
  assert.match(field,/bp:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(field,/Enum\.Material\.Metal/);
  assert.match(field,/Enum\.Material\.Wood/);
  assert.match(field,/bp\.Reflectance = if material == Enum\.Material\.Metal then 0\.055 else 0/);
  assert.match(field,/FM\.actor\(e\.fm, st, ph, dt, e\.boss/);
  assert.match(field,/FM\.actor\(a\.fm, "RECOVERY",[^\n]+a\.weapon\.motion\)/);
  assert.match(field,/FM\.actor\(a\.fm, "ANTICIPATION",[^\n]+a\.weapon\.motion\)/);
  assert.match(field,/if not quiet then/);
});
