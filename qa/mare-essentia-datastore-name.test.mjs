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
  assert.match(field,/elseif wpn\.ranged then[\s\S]*?pulseAt\("SHAPE_BURST", hrp\.CFrame/);
  assert.match(field,/elseif family == "bow" then[\s\S]*?Color3\.fromRGB\(165, 231, 165\)/);
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
  assert.match(field,/chain = if rank == 2 then 2[\s\S]{0,210}then 3 else 2/);
});

test('필드 전투 스킬 버튼은 글자 없이 등록 아이콘을 중앙에 표시한다',()=>{
  assert.match(field,/local iconOnly = button\.Name == "FieldAttack" or string\.sub\(button\.Name, 1, 11\) == "FieldSkill_"/);
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
  for(const name of ['prepare','strike','returnGrip','hold','HandR','ForearmR','UpperArmL','ThighL','FootR']){
    assert.ok(fieldMotion.includes(name),'R15 관절 단계 누락: '+name);
  }
  assert.match(field,/bp:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(field,/Enum\.Material\.Metal/);
  assert.match(field,/Enum\.Material\.Wood/);
  // [실물 재질] 원본 PBR/텍스처는 건드리지 않으며 미등록 표면의 소재별 반사율만 적용한다.
  assert.match(field,/local preservedPbr = bp:FindFirstChildOfClass\("SurfaceAppearance"\) ~= nil/);
  assert.match(field,/local preservedTexture = bp:IsA\("MeshPart"\) and bp.TextureID ~= ""/);
  assert.match(field,/if not preservedPbr and not preservedTexture then/);
  assert.match(field,/material, tint, reflectance = Enum\.Material\.Metal, Color3\.fromRGB\(172, 182, 187\), 0\.055/);
  assert.match(field,/bp\.Material, bp\.Reflectance = material, reflectance/);
  assert.match(field,/FM\.actor\(e\.fm, st, ph, dt, e\.boss/);
  assert.match(field,/FM\.actor\(a\.fm, "RECOVERY",[^\n]+a\.weapon\.motion\)/);
  assert.match(field,/FM\.actor\(a\.fm, "ANTICIPATION",[^\n]+a\.weapon\.motion\)/);
  assert.match(field,/if not quiet then/);
  assert.match(field,/local thrust = family == "spear" or family == "dagger"/);
  assert.match(field,/local heavy = family == "axe" or family == "blunt"/);
  assert.match(field,/local range = family == "bow" or family == "firearm"/);
  assert.match(field,/canon\.HandR = \(canon\.HandR or id\)/);
  assert.match(field,/canon\.FootL = \(canon\.FootL or id\)/);
});

 
// [원거리 사격 회귀] 근접 판정에 묶이던 원거리 스킬과 석궁 견착을 기존 R15/전투 경로에서 검사한다.
test('원거리 공격은 무기 사거리로 조준·발사하며 석궁 R15 양손 견착을 사용한다',()=>{
  const fieldMotion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const weapons=read('ReplicatedStorage/Shared/Weapons.luau');
  assert.match(weapons,/id = "crossbow"[^\n]+ranged = true, range = 26/);
  assert.match(weapons,/id = "bow"[^\n]+ranged = true, range = 26/);
  assert.match(weapons,/id = "gun"[^\n]+ranged = true, range = 22/);
  assert.match(field,/local STUD = 2/);
  assert.match(field,/local near, nd = nil, if wpn\.ranged then wpn\.range \* STUD \+ 3 else 40/);
  assert.match(field,/local rangeR = if wpn\.ranged or moveId == "rush" then wpn\.range else mv\.range/);
  assert.match(field,/local rangedShot = wpn\.ranged/);
  assert.match(field,/if rangedShot and shots >= 1 then break end/);
  assert.match(field,/if wpn\.ranged then return CFrame\.new\(0, -0\.12 \* bell\(p\), 0\)/);
  assert.match(field,/local crossbow = wpn\.motion == "CROSSBOW"/);
  assert.match(field,/canon\.ForearmL = \(canon\.ForearmL or id\)/);
  assert.match(fieldMotion,/elseif crossbow then[\s\S]*?bend\("UpperArmL",[\s\S]*?bend\("ForearmL"/);
  assert.match(field,/arrowTrail\(a0, b0, nil, nil, wpn\.motion, moveId ~= "rush"\)/);
  assert.match(field,/if not wpn\.ranged and nd > reach - 2 then/);
  // 원거리 공격은 눌렀을 때 이미 발사됐으므로 길게 누른 뒤 떼어도 근접 돌진을 발동하지 않는다.
  assert.match(field,/if held >= 0\.5 and not wpn\.ranged then/);
  assert.match(field,/say\(if wpn\.ranged then "원거리 조준 중"/);
});


// [몹 상태이상 회귀] 정예 둔화/두목 독은 방어·회피한 공격에서 발동하지 않고 전투·저장 흐름에 섞이지 않는다.
test('정예 감속과 두목 맹독은 명중에만 발동하고 중첩·이동속도 누출을 막는다',()=>{
  assert.match(field,/local eliteSlowUntil, bossPoisonUntil, bossPoisonNextAt = 0, 0, math\.huge/);
  assert.match(field,/local slowedHumanoid, originalFieldWalkSpeed = nil, nil/);
  assert.match(field,/debuffLabel\.Name = "FieldHeroDebuff"/);
  assert.match(field,/if hit and pl\.ward then[\s\S]*?elseif hit then[\s\S]*?if parried then[\s\S]*?elseif dealt > 0 then/);
  // 일반 막기로 감소한 피해만 받았을 때도 둔화는 붙지 않는다.
  assert.match(field,/if not pl\.guarding and e\.elite and not e\.boss and now >= \(e\.nextSlowAt or 0\) then/);
  assert.match(field,/e\.nextSlowAt = now \+ 8/);
  assert.match(field,/eliteSlowUntil = math\.max\(eliteSlowUntil, now \+ 3\)/);
  assert.match(field,/if os\.clock\(\) < eliteSlowUntil then/);
  assert.match(field,/local targetSpeed = math\.max\(7, \(originalFieldWalkSpeed or 18\) \* 0\.65\)/);
  assert.match(field,/if slowedHumanoid == h2 and originalFieldWalkSpeed then[\s\S]*?h2\.WalkSpeed = originalFieldWalkSpeed/);
  assert.match(field,/elseif not pl\.guarding and e\.boss and now >= \(e\.nextPoisonAt or 0\) and now >= bossPoisonUntil then/);
  assert.match(field,/e\.nextPoisonAt = now \+ 10/);
  assert.match(field,/bossPoisonUntil, bossPoisonNextAt = now \+ 4, now \+ 1/);
  assert.match(field,/if pl\.hp > 0 and bossPoisonNextAt <= bossPoisonUntil and now >= bossPoisonNextAt then/);
  assert.match(field,/bossPoisonNextAt \+= 1/);
  // 특수공격은 미리 알아볼 수 있게 기존 예고 색/글자만 사용한다.
  assert.match(field,/e\.telegraphStatus = if e\.boss and now >= \(e\.nextPoisonAt or 0\)/);
  assert.match(field,/elseif e\.elite and not e\.boss and now >= \(e\.nextSlowAt or 0\) then "slow"/);
  assert.match(field,/wl\.Text = if e\.telegraphStatus == "poison" then "독"/);
  assert.match(field,/elseif e\.telegraphStatus == "slow" then "둔" else "!"/);
  assert.match(field,/local debuff = if poisoned and slowed then "독" \..*math\.ceil\(bossPoisonUntil - now\)/);
  assert.match(field,/shards\(poisonedRoot\.Position \+ Vector3\.new\(0, 1\.5, 0\), if visualMobile then 2 else 5/);
  assert.match(field,/pl\.hp = math\.max\(0, pl\.hp - 2\)/);
  // 정상·비정상 철수에서 모두 속도를 원복해야 저장/항구 제어가 깨지지 않는다.
  assert.equal((field.match(/slowedHumanoid\.WalkSpeed = originalFieldWalkSpeed/g)||[]).length, 3);
  assert.match(field,/task\.defer\(function\(\) finish\("defeat"\) end\)/);
});


// [전투 소리 회귀] 이미 승인된 음원만 쓰면서 무기별 발사/장전/명중을 분리한다.
test('무기별 실제 발사음과 원거리 스킬 이펙트가 등록된 음원으로 구분된다',()=>{
  const audio=read('ReplicatedStorage/Shared/AudioIds.luau');
  for(const sound of [
    'sfx_rope_pull','sfx_rope_release','sfx_equipment_wear','sfx_cannon_reload',
    'sfx_card_chain','sfx_card_volley','sfx_card_fire','sfx_cannon',
    'sfx_boarding_draw','sfx_boarding_slash','sfx_card_blade','sfx_card_swing',
    'sfx_metal_clash','sfx_card_ring',
  ]){
    assert.ok(audio.includes(sound+'="rbxassetid://'),'승인 음원 누락: '+sound);
  }
  // 기본 무기는 각기 다른 타격 종류, 지역 무기는 기존 모션 그룹별 소리를 그대로 사용한다.
  for(const motion of ['CROSSBOW','RIFLE','PISTOL','LONGBOW','RAPIER','SABRE','SCIMITAR','KATANA']){
    assert.ok(field.includes('wpn.motion == "'+motion+'"'),'무기 동작음 누락: '+motion);
  }
  for(const family of ['dagger','spear','axe','blunt','fist','bow']){
    assert.ok(field.includes('family == "'+family+'"'),'무기군별 분기 누락: '+family);
  }
  assert.match(field,/local impactWeapon = attackerWeapon or wpn/);
  assert.match(field,/local family = impactWeapon\.family/);
  assert.match(field,/aw\.family == "axe", true, false, nil, aw/);
  assert.match(field,/local rangedImpact = impactWeapon\.ranged and \(family == "bow" or family == "firearm"\)/);
  assert.match(field,/local rangedShot = wpn\.ranged[\s\S]*?sfx\("sfx_rope_release", 0\.49/);
  assert.doesNotMatch(field,/sfx\(if wpn\.family == "firearm" and wpn\.id ~= "crossbow"/);
  assert.match(field,/shotMotion: string\?, charged: boolean\?/);
  assert.match(field,/local a1, at1 = anchorAt\(from \+ flightDir \* streakLength\)/);
  assert.match(field,/\{ Position = to - flightDir \* streakLength \}/);
  assert.match(field,/\{ Position = to \}\):Play\(\)/);
  // 집중 사격/견제 사격과 카드 저격/일제사격은 무기별 색과 적중 이펙트를 갖는다.
  assert.match(field,/if kind ~= "slash" then[\s\S]*?pulseAt\(if kind == "heavy" then "CRITICAL_BURST"/);
  assert.match(field,/local equippedId = ch and ch:GetAttribute\("EquippedWeaponId"\)/);
  assert.match(field,/arrowTrail\(pos, hitPos, nil, nil, motion, sk == "snipe"\)/);
  assert.match(field,/arrowTrail\(a0, b0, nil, nil, aw\.motion\)/);
  assert.match(field,/nil, nil, if e\.weapon then e\.weapon\.motion else "BOW"/);
});


// [연타 무기별 10단 시각 동작] 공용 R15 원자와 기존 명중·숙련·저장 계약을 유지한다.
test('근접·원거리 10단 전신 모션과 마무리 이펙트는 기존 피해 판정을 유지한다',()=>{
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const common=read('ReplicatedStorage/Shared/CommonMotion.luau');
  const chains={
    CROSSBOW:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    PISTOL:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    RIFLE:['FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_RECOIL','FIREARM_BURST','FIREARM_BURST','FIREARM_RECOIL'],
    BOW:['BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE'],
    LONGBOW:['BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE','BOW_RELEASE'],
    RAPIER:['BLADE_THRUST','BLADE_RIPOSTE','BLADE_SLASH_L'],
  };
  const family={CROSSBOW:'FIREARM',PISTOL:'FIREARM',RIFLE:'FIREARM',
    BOW:'BOW',LONGBOW:'BOW',RAPIER:'BLADE'};
  for(const [weapon,atoms] of Object.entries(chains)){
    assert.ok(motion.includes(weapon+' = { '+atoms.map(x=>'"W:'+x+'"').join(', ')+' }'),weapon+' 등록 연계 누락');
    for(const atom of atoms){
      assert.ok(common.includes('{id="'+atom+'",family="'+family[weapon]+'"'),weapon+' 승인 원자 누락: '+atom);
    }
  }
  for(const weapon of ['DAGGER','SWORD','KATANA','SABRE','SCIMITAR','WAR_AXE','SPEAR','MACE']){
    assert.ok(common.includes(weapon+'={id="'+weapon+'"'),weapon+' 기본 모션 프로필 누락');
  }
  assert.match(motion,/local actorBeat = if rangedActor then 1 else \(h\.weaponBeat or 1\)/);
  assert.match(field,/local swingBridge = \{ last = \{\}, lastAt = -100, from = nil, at = 0, duration = 0, basicBeat = 0, basicAt = -100 \}/);
  assert.match(field,/swingBridge\.from = table\.clone\(swingBridge\.last\)/);
  assert.match(field,/canon\[joint\] = old:Lerp\(canon\[joint\] or CFrame\.identity, weight\)/);
  assert.match(field,/weight = weight \* weight \* \(3 - 2 \* weight\)/);
  assert.match(field,/table\.clear\(swingBridge\.last\)/);
  assert.match(field,/if swingKind and swingCombo and slashIdx >= 2 then/);
  assert.match(field,/local stageDelay = if stage == 2 then 0\.20/);
  assert.match(field,/elseif wpn\.family == "axe" or wpn\.family == "blunt" then 0\.53/);
  assert.match(field,/elseif wpn\.ranged then 0\.41 else 0\.49/);
  assert.match(field,/local firing = actionPose/);
  // 시각 2~3단은 공격·피해·보상·쿨타임을 중복 발생시키지 않는다.
  const start=field.indexOf('if chain > 1 then');
  const stop=field.indexOf('elseif hits == 0 and moveId == "rush" then',start);
  assert.ok(start>0 && stop>start,'순수 시각 연타 블록 범위 누락');
  const visualOnly=field.slice(start,stop);
  assert.match(visualOnly,/startSwing\(finishKind,/);
  assert.doesNotMatch(visualOnly,/strikeEnemy\(|AC\.damageEnemy\(|AC\.takeHit\(/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
  // [무기별 10연타] 연속 입력 1~10은 원래 공격당 피해 1회씩이며 추가 연출은 비타격이다.
  assert.match(field,/if moveId == "rush" then\s*-- \[연속 공격 10박자\]/);
  assert.match(field,/basicBeat = if pressedAt - swingBridge\.basicAt <= 1\.1 then swingBridge\.basicBeat % 10 \+ 1 else 1/);
  assert.match(field,/local nextStage = math\.clamp\(math\.floor\(stage or 1\), 1, 10\)/);
  assert.match(motion,/local stage = math\.clamp\(math\.floor\(idx\), 1, 10\)/);
  assert.match(motion,/local action = if stances and stances\[stage\] then stances\[stage\]/);
  assert.match(field,/startSwing\(kind, if kind == "spin" then 0\.6 elseif kind == "heavy" then 0\.7 else 0\.4, basicBeat\)/);
  assert.match(field,/local rapidPose = moveId == "rush" and basicBeat >= 2/);
  assert.match(field,/if basicBeat == 3 then[\s\S]*?auraOn\(ch0, aimColor/);
  assert.match(field,/if not visualMobile then afterimage\(ch0, aimColor, 2, 0\.06\) end/);
  assert.match(field,/return CFrame\.new\(-sidestep \* kick, -\(if longGun then 0\.24 else 0\.34\) \* kick, -0\.12 \* release\)/);
  assert.match(field,/return CFrame\.new\(slide \* kick, -crouch \* kick, -0\.18 \* release\)/);
  assert.match(field,/canon\.ThighL = \(canon\.ThighL or id\) \* CFrame\.Angles\(-0\.61 \* drop \* plant/);
  assert.match(field,/canon\.ShinR = \(canon\.ShinR or id\) \* CFrame\.Angles\(-0\.31 \* drop \* plant/);
  assert.match(field,/local shotVolume = 0\.31/);
  // [시네마틱 전신] 동일한 팔 흔들기가 아니라 1타 무기별 실루엣, 2타 스텝, 3타 낮은 격발이다.
  assert.match(field,/local sidestep = if bow then 0\.76 elseif crossbow then 0\.52 elseif longGun then 0\.43 else 0\.92/);
  assert.match(field,/local crouch = if bow then 0\.66 elseif crossbow then 0\.44 elseif longGun then 0\.58 else 0\.82/);
  assert.match(field,/local plant = math\.sin\(math\.clamp\(p \/ 0\.58, 0, 1\) \* math\.pi\)/);
  assert.match(field,/local shoulder = math\.sin\(math\.clamp\(\(p - 0\.08\) \/ 0\.72, 0, 1\) \* math\.pi\)/);
  assert.match(field,/local trigger = math\.sin\(math\.clamp\(\(p - 0\.26\) \/ 0\.55, 0, 1\) \* math\.pi\)/);
  assert.match(field,/canon\.Head = \(canon\.Head or id\) \* CFrame\.Angles\(0\.12 \* trigger/);
  assert.match(field,/canon\.UpperArmR = \(canon\.UpperArmR or id\) \* CFrame\.Angles\(-0\.38 \* shoulder \+ 0\.30 \* trigger/);
  assert.match(field,/canon\.HandR = \(canon\.HandR or id\) \* CFrame\.Angles\(0\.45 \* trigger/);
  assert.match(field,/arrowTrail\(shootFrom, shootTo, nil, nil, wpn\.motion, stage == 3\)/);
  assert.match(field,/if visualMobile then 2 else 7\)/);
  assert.doesNotMatch(motion,/CROSSBOW = \{ "W:FIREARM_RECOIL", "W:FIREARM_CYCLE"/);
  assert.doesNotMatch(motion,/BOW = \{ "W:BOW_RELEASE", "W:BOW_RENOCK"/);
  // 10타 마무리의 자연스러운 전신 관절 연결, 무기별 시각 차별화와 모바일 축약.
  assert.match(field,/local flourish = if slashIdx == 10 then 1\.90/);
  assert.match(field,/if basicBeat == 10 then[\s\S]*?auraOn\(ch0, trailColor/);
  assert.match(field,/if not visualMobile and basicBeat >= 7 then afterimage/);
  assert.match(field,/if slashIdx >= 4 then[\s\S]*?local turn = if slashIdx % 2 == 0/);
  assert.match(field,/swingBridge\.lastAt = os\.clock\(\)/);
  assert.match(field,/elseif os\.clock\(\) - swingBridge\.lastAt > 1\.1 then/);
  assert.doesNotMatch(field,/sfx\("sfx_cannon_reload", 0\.23, 1\.62\)/);
  assert.match(weapons,/cadence = "스냅사격·측면스텝·낮은선회/);
});



// [탐험 지도 다양성] 승인된 외부 메시와 기존 퀘스트/전투 계약만 사용한다.
test('탐험 현장별 10종 3차원 지형, 주야·기상·실물 동물 및 단서 조사 연결',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  const start=field.indexOf('local landforms = {');
  const end=field.indexOf('local featureList = landforms',start);
  assert.ok(start>0 && end>start,'현장 지형 모델 선택 구간 누락');
  const scenery=field.slice(start,end);
  for(const theme of ['coast','forest','highland','mine','ruins','fort','desert','farm','lake','plains']){
    assert.match(scenery,new RegExp('\\b'+theme+' = \\{'),'퀘스트 지형 모델 목록 누락: '+theme);
  }
  for(const [,kind,name] of scenery.matchAll(/\\{"(Terrain|Town|Castle|Naval)","([^"]+)",/g)){
    assert.ok(assets.includes('["'+kind+'/'+name+'"]'),'승인되지 않은 지형 에셋: '+kind+'/'+name);
  }
  assert.match(field,/FieldQuestTerrainTheme/);
  assert.match(field,/FieldTerrainFeatureCount/);
  assert.match(field,/if not visualMobile or index <= 9 then/);
  assert.match(field,/FieldTerrainLandmark/);
  assert.match(field,/FieldTerrainClue/);
  assert.match(field,/FieldTerrainClues/);
  assert.match(field,/FieldTimePhase/);
  assert.match(field,/FieldWeatherClock/);
  assert.match(field,/FieldPrecipitation/);
  assert.match(field,/FieldAmbientAnimal/);
  assert.match(field,/FieldAmbientObservations/);
  assert.match(field,/local function spawnWildlife/);
  assert.match(field,/weatherNext = now \+ climateRng:NextNumber/);
  assert.match(field,/local clock = \(biome\.clock \+ \(now - clockStart\)/);
  assert.doesNotMatch(field.slice(field.indexOf('[자연 관찰]'),field.indexOf('-- 미니맵:',field.indexOf('[자연 관찰]'))),/AC\\.damageEnemy|rewardGold|saveState/);
});
