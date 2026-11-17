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

// [탐험 상용 버튼 회귀] 공격·회피 2개만 표시하고 5타 자동 강타는 실제 명중에서만 발생한다.
test('탐험 공격·회피 두 메달은 실제 터치와 무기별 5타 자동 강타에 연결된다',()=>{
  assert.match(field,/local iconOnly = button\.Name == "FieldAttack" or button\.Name == "FieldDodge"/);
  assert.match(field,/medallion\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/img\.Position = UDim2\.fromScale\(0\.5, if iconOnly then 0\.5 else 0\.385\)/);
  assert.match(field,/attackBtn\.Name = "FieldAttack"/);
  assert.match(field,/b\.Name = "FieldDodge"/);
  // [실제 터치 사각형] 모서리까지 입력을 받으므로 원형 그림의 빈 여백도 겹치면 안 된다.
  assert.ok(field.includes('math.min(112, math.max(72, workspace.CurrentCamera.ViewportSize.X - 232))'));
  assert.ok(field.includes('if compactTouch then 90 else 98'));
  assert.ok(field.includes('if compactTouch then math.min(116, workspace.CurrentCamera.ViewportSize.X - 230)'));
  assert.ok(field.includes('if compactTouch then -math.min(85, workspace.CurrentCamera.ViewportSize.X - 247)'));
  assert.ok(field.includes('if compactTouch then UDim2.new(0, math.max(226, workspace.CurrentCamera.ViewportSize.X - 120), 1, -211)'));
  const overlaps=(a,b)=>a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  for(const [width,height] of [[320,640],[360,780],[384,832],[428,926]]){
    const rect=(left,top,w,h)=>({left,top,right:left+w,bottom:top+h});
    const pad=rect(28,height-178,150,150);
    const dodgeX=Math.max(226,width-120);
    const dodge=rect(dodgeX-48,height-259,96,96);
    const attackX=width-Math.min(85,width-247);
    const attackHit=rect(attackX-69,height-154,138,138);
    const hero=rect(12,74,202,82);
    const weapon=rect(width-12-Math.min(116,width-230),112,Math.min(116,width-230),44);
    const complete=rect(width-102,64,90,38);
    const title=rect(109,12,Math.min(112,Math.max(72,width-232)),40);
    const camera=rect(width-120,12,108,44);
    for(const [left,right] of [[pad,dodge],[pad,attackHit],[dodge,attackHit],
      [hero,weapon],[hero,complete],[title,camera]]){
      assert.equal(overlaps(left,right),false,'모바일 '+width+'×'+height+' 탐험 조작 겹침');
    }
  }
  assert.match(field,/attackCaption\.Name = "FieldAttackCaption"/);
  assert.match(field,/dodgeCaption\.Name = "FieldDodgeCaption"/);
  assert.match(field,/addIcon\(attackBtn, "Menu\/cc0_sword"\)/);
  assert.match(field,/addIcon\(b, "Menu\/chart_compass"\)/);
  assert.match(field,/bindPress\(attackBtn, useAttack\)/);
  assert.match(field,/bindHold\(attackBtn\)/);
  assert.match(field,/hit\.Size = attackBtn\.Size \+ UDim2\.fromOffset\(20, 20\)/);
  assert.match(field,/combatBtns\.dodge = \{ btn = b, label = "회피" \}/);
  assert.equal((field.match(/bindPress\(b, function\(\) useMove\("dodge"\) end\)/g)||[]).length,1,'회피 입력 중복 금지');
  assert.doesNotMatch(field,/FieldSkillCaption|Name = "FieldSkill_|local function mkSkill\(/);
  assert.match(field,/timer\.Visible = false -- \[아이콘 전용\]/);
  assert.match(field,/equipped\.heavy, equipped\.sweep = true, false/);
  assert.match(field,/pl\.autoNormalHits % 5 == 0/);
  // [빠른 연타] 0.14초 지연된 이전 평타도 명중 당시 새 입력 여부와 관계없이 충전해야 한다.
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/local autoHeavyReady = basicAttack == true/);
  assert.match(field,/local basicHit = basicAttack == true/);
  assert.match(field,/hitActionSeq, nil, moveId == "rush", basicBeat\)/);
  assert.match(field,/basicAttack: boolean\?, impactBeat: number\?\)/);
  assert.doesNotMatch(field,/pl\.basicAttackSeq/);
  assert.match(field,/FieldAutoSkillPending/);
  assert.match(field,/if useMove\("heavy"\) then[\s\S]*?comboCinema\(streakN, record, true\)/);
  assert.match(field,/sb\.btn:GetAttribute\("IconArtKey"\) ~= iconKey/);
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
  // [완벽 회피 매트릭스] 적 모션만 둔화하고 주인공/스킬 쿨타임은 정상 시간으로 유지한다.
  assert.match(field,/local enemyDt = dtc \* \(if now < \(pl\.matrixSlowUntil or 0\) then 0\.24 else 1\)/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt,/);
  assert.match(field,/FM\.actor\(e\.fm, st, ph, enemyDt, e\.boss/);
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


// [원거리 원본 자세·투사체·명중 공정성] 무료 기본 Trail과 등록 무기를 유지, 피해·숙련 정산은 적중 때만.
test('원거리 화살 석궁은 실제 긴 축을 바로 세우고 3D 탄도·거리별 빗나감을 쓴다',()=>{
  const scene=read('ReplicatedStorage/Shared/FieldScene.luau');
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const projectile=scene.slice(scene.indexOf('local function arrowTrail('),scene.indexOf('-- 바닥 범위 예고:'));
  assert.ok(projectile.length>2000,'투사체 실제 탄도 생성 구간 누락');
  assert.doesNotMatch(projectile,/Instance\.new\("Beam"\)/,'넓은 네모 Beam이 복구되지 않아야 한다');
  for(const snippet of [
    'shaft.Shape = if gun then Enum.PartType.Ball else Enum.PartType.Cylinder',
    'shaft.Name = "FieldProjectile"', 'tip.Name = "FieldArrowTip"',
    'local trail = Instance.new("Trail")', 'trail.WidthScale = NumberSequence.new',
    'CFrame.lookAt(p, p + aim)', 'trail.Enabled = false',
    'if finished or not shaft.Parent then'
  ]) assert.ok(projectile.includes(snippet),'실물형 화살/볼트·잔광 회귀: '+snippet);
  for(const snippet of [
    'hand = if weapon.family == "bow" then leftHand else rightHand',
    'local bowHold = weapon.family == "bow"',
    'local crossbowHold = weapon.motion == "CROSSBOW"',
    'local targetAxis = if bowHold then Vector3.yAxis else forward',
    'CFrame.fromRotationBetweenVectors(sourceAxis, targetAxis)',
    '[활 진짜 조준]', '[석궁 수평 견착]',
    'local shotLanded = true', 'local baseAccuracy = if wpn.motion == "CROSSBOW"',
    '- (if shooterMoving then 0.10 else 0)',
    '- (if targetMoving then 0.085 else 0)',
    '(e.dodgeUntil or 0) > os.clock()',
    'if shotLanded then strikeEnemy(', 'else false',
    'if landed then hits += 1 end', 'shots += 1',
    'if not shotLanded then', 'if rangedShot and shots == 0 then'
  ]) assert.ok(scene.includes(snippet),'활·석궁/확률 판정 회귀: '+snippet);
  assert.ok(motion.includes('[궁수 실제 활대]'));
  assert.ok(motion.includes('[석궁 사수 수평 지지]'));
  const chance=(range,moving,target,dodging,base=0.92)=>Math.max(.35,Math.min(.98,
    base-.27*range-(moving?.10:0)-(target?.085:0)-(dodging?.20:0)));
  assert.ok(chance(0,false,false,false)>chance(1,false,false,false),'거리가 멀수록 명중률 감소');
  assert.ok(chance(1,true,true,true)<chance(1,false,false,false),'이동·회피 시 명중률 추가 감소');
  assert.ok(chance(1,true,true,true)>=.35,'빗나감 하한 유효');
});

// [유적 탐험] 모바일 HUD와 충돌하지 않도록 조사 알림만 펼치고 등록 원더 이미지가 원본을 표시한다.
test('유적 상호작용과 발견 화면의 모바일 잘림·조사 키 충돌을 방지한다',()=>{
  assert.ok(field.includes('note.Name = "FieldInteractionNote"'));
  assert.ok(field.includes('local expanded = duration ~= nil and duration > 2.2'));
  assert.ok(field.includes('note.Size = if expanded then UDim2.fromOffset(if compactTouch then 206 elseif visualMobile then 244 else 256, 64)'));
  assert.ok(field.includes('elseif narrowLandscape then UDim2.fromOffset(184, screen.Y - 108)'));
  assert.ok(field.includes('elseif visualMobile then UDim2.fromOffset(184, 202)'));
  assert.ok(field.includes('if questHud then questHud.Visible = not expanded end'));
  assert.ok(field.includes('if weatherHud then weatherHud.Visible = not expanded end'));
  assert.ok(field.includes('if questHud and questHud.Parent then questHud.Visible = true end'));
  assert.ok(field.includes('if weatherHud and weatherHud.Parent then weatherHud.Visible = true end'));
  // [모바일 가로] 유적 설명 3줄이 실제 공격/회피 터치 영역과 겹치지 않는지 확인한다.
  for(const [width,height] of [[600,340],[720,384],[832,384],[960,540]]){
    const narrow = width < 740;
    const x = 184, y = narrow ? height - 108 : 202, w = 244, h = 64;
    const rect=(left,top,rw,rh)=>({left,top,right:left+rw,bottom:top+rh});
    const note=rect(x,y,w,h);
    const dodge=rect(width-98-146-53,height-98-66-53,106,106);
    const attack=rect(width-98-74,height-98-74,148,148);
    const pad=rect(28,height-178,150,150);
    const overlap=(a,b)=>a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom;
    for(const other of [dodge,attack,pad]){
      assert.equal(overlap(note,other),false,'유적 안내가 전투 터치 영역과 겹침: '+width+'x'+height);
    }
    assert.ok(!narrow || y >= dodge.bottom+2,'좁은 가로에서 회피 버튼이 보이도록 아래쪽에 배치');
  }
  assert.ok(field.includes('note.TextWrapped = expanded'));
  assert.ok(field.includes('say(clueText[theme] or clueText.plains, 4.5)'));
  assert.ok(field.includes('prompt.KeyboardKeyCode = Enum.KeyCode.T'));
  assert.ok(field.includes('math.min(extent.X * 0.55 + 4, 16)'));
  assert.ok(field.includes('math.min(extent.Z * 0.55 + 4, 16)'));
  assert.ok(client.includes('local image = "rbxassetid://" .. tostring(assetId)'));
  assert.doesNotMatch(client,/local image = "rbxthumb:\/\//);
  // [모바일 원더 화면] 제목·자막·16:9 액자 사이의 실제 화면 높이 여백을 확보한다.
  assert.ok(client.includes('local function fitWonderArt()'));
  assert.ok(client.includes('screen.X * 0.94 * 9 / 16, screen.Y - 180'));
  assert.ok(client.includes('root:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitWonderArt)'));
  assert.ok(client.includes('artResize:Disconnect()'));
  assert.ok(client.includes('ttl.TextScaled = true'));
  assert.ok(client.includes('ttl.Position = UDim2.new(0.5, 0, 0, 32)'));
  assert.ok(client.includes('cap.Position = UDim2.new(0.5, 0, 1, -8)'));
  for(const [w,h] of [[320,240],[832,384],[384,832],[1280,720]]){
    const height=Math.max(1,Math.min(w*0.94*9/16,h-180));
    const artWidth=Math.floor(height*16/9);
    const artHeight=Math.floor(height);
    const top=(h-artHeight)/2,bottom=(h+artHeight)/2;
    assert.ok(artWidth<=w*0.94+1,'원더 원화 가로 넘침 '+w+'x'+h);
    assert.ok(top>=72,'원더 제목 겹침 '+w+'x'+h);
    assert.ok(bottom<=h-82,'원더 자막 겹침 '+w+'x'+h);
  }
  const scenes=read('ReplicatedStorage/Shared/WonderScenes.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for(const match of scenes.matchAll(/art = "(event_[a-z_]+)"/g)){
    assert.ok(assets.includes('["CardArt/'+match[1]+'"]'),'미등록 유적 원더 그림 '+match[1]);
  }
});

// [스튜디오 실제 실패 복구] 초급 20마리에서 체형 2종으로 수렴했던 R15 실루엣을 검사한다.
test('1단 검병·궁수 편성은 유지하면서 승인된 R15 체형 3종 이상을 실제 배정한다',()=>{
  assert.ok(field.includes('local kinds = if danger0 <= 1 then { "grunt", "grunt", "archer", "grunt" }'));
  assert.ok(field.includes('local enemyCount = math.clamp(20 + (danger0 - 1) * 6, 20, 100 - bossCount)'));
  const grunt=field.match(/\t\tgrunt = \{([\s\S]*?)\n\t\t\},/);
  assert.ok(grunt,'실제 검병 복식 정의 누락');
  const profiles=[...grunt[1].matchAll(/\{ ".*?", "(.*?)", Color3/g)].map(x=>x[1]);
  assert.ok(profiles.length>=5,'기존 검병 5종 복식 보존');
  const expect=[
    ['Barbarian','heavy'],
    ['Knight','athletic'],
    ['Rogue_Hooded','slim']
  ];
  for(const [style,physique] of expect){
    assert.ok(field.includes('elseif ac.kind == "grunt" and style[2] == "'+style+'" then "'+physique+'"'),
      '검병 실물 복식과 체형 매칭 누락: '+style);
  }
  const kinds=['grunt','grunt','archer','grunt'],physiques=new Set();
  for(let i=1;i<=20;i++){
    const role=kinds[(i-1)%kinds.length];
    const style=profiles[Math.floor((i-1)/4)%profiles.length];
    const physique=role==='archer'?'slim':style==='Barbarian'?'heavy':
      style==='Knight'?'athletic':style==='Rogue_Hooded'?'slim':'average';
    physiques.add(physique);
  }
  assert.ok(physiques.size>=3,'실제 1단 적 20마리 체형 3종 확보 실패: '+[...physiques]);
  assert.ok(field.includes('{ bodyType = bodyType, motionStyle = motionStyle, trousers = trousers, persona = styleN'),
    '기존 R15 몸체 생성 연결 보존');
});

// [스튜디오 실증 회귀] 실제 탐험 2메달 HUD와 자동검사 스크립트가 같은 버튼을 검사해야 한다.
test('스튜디오 탐험 실증은 현재 공격·회피 메달과 집안별 두 무기를 검사한다',()=>{
  const path='roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json';
  const script=JSON.parse(fs.readFileSync(path,'utf8'));
  assert.equal(script.length,241,'기존 전체 스튜디오 검사 순서 유지');
  const entry=script[234].code;
  const motion=script[236].code;
  const live=script[239].code;
  assert.ok(entry.includes('FIELD_QA_ENTRY_FAIL:'),'실제 UI로 탐험 입장 검증 필수');
  assert.ok(entry.includes('FieldCombatReady'),'실제 전투 준비 검증 필수');
  assert.ok(entry.includes('FIELD_DODGE_ICON_UNAPPROVED'),'회피 원화 실증 검증 필수');
  assert.ok(entry.includes('FIELD_WEAPON_CHOICES_NOT_TWO'),'두 무기 교체 검증 필수');
  assert.ok(motion.includes('FIELD_ATTACK_WEAPON_ICON_UNAPPROVED'),'선택 무기별 원화 실증 검증 필수');
  assert.ok(motion.includes('FIELD_MOTION_ACTOR_SAMPLE_TOO_SMALL'),'적·동료의 실제 모션 검증 유지');
  // [난이도별 실증] 초급 필드의 미출현 3~4단 병종을 요구하지 않되 현재 출현 직군 전체를 검사한다.
  assert.ok(live.includes('field:GetAttribute("FieldDifficultyGrade")'),'실제 난이도 참조 필수');
  assert.ok(live.includes('grade<=1 then {"grunt","archer"}'),'1단 편성 검증 필수');
  assert.ok(live.includes('grade==2 then {"grunt","archer","shield"}'),'2단 편성 검증 필수');
  assert.ok(live.includes('{"grunt","archer","shield","charger"}'),'3단 이상 편성 검증 필수');
  assert.ok(live.includes('for _,role in expectedRoles do'),'실존 병종 R15 모션 모두 검사');
  assert.ok(live.includes('{"thrower","boss"}'),'투척병·두목 별도 모션 역할도 실제 생성 시 검사');
  assert.ok(live.includes('if grade>=3 then assert(roles.boss'),'상위 난이도 두목 실증 필수');
  assert.ok(field.includes('elseif throwAsset then "thrower" else ac.kind'),
    '기존 투척 무기 전용 모션 역할과 검사 일치 필수');
  assert.ok(live.includes('distinct>=math.min(3,#expectedRoles)'),'난이도에 맞는 다른 전신 자세 검증');
  assert.ok(live.includes('FIELD_SURVEY_PROMPTS_MISSING'),'현장 조사 지점 실제 생성 검사');
  assert.ok(live.includes('FIELD_SURVEY_KEY_CONFLICT'),'전투 E와 조사 T 분리 검증');
  assert.ok(live.includes('FIELD_SURVEY_REACH_BLOCKED'),'유적 조사 가시거리·접근성 검증');
  assert.doesNotMatch(entry+motion,/FieldSkill_parry|FieldSkill_dodge/,'사라진 구 스킬 버튼을 요구하면 안 된다');
  assert.ok(field.includes('b.Name = "FieldDodge"'));
  assert.ok(field.includes('wbtn.Name = "FieldWeapon"'));
  assert.ok(field.includes('wbtn:SetAttribute("WeaponChoiceCount", 2)'));
});

// [재생기/날씨 음향 회귀] 최초 지연 로드와 권한 실패가 모든 음악·효과음을 영구 음소거하지 않도록 한다.
test('음악 효과음 환경음은 기본 믹서 크기·지연 로딩·자동 재시도 경로를 유지한다',()=>{
  const audio=read('ReplicatedStorage/Shared/Sfx.luau');
  const fieldScene=read('ReplicatedStorage/Shared/FieldScene.luau');
  const ids=read('ReplicatedStorage/Shared/AudioIds.luau');
  for(const name of ['music_harbor','music_battle','sfx_wind','sfx_waves','sfx_rope_release','sfx_card_fire']){
    assert.ok(ids.includes(name+'="rbxassetid://'),'필수 등록 음원 누락: '+name);
  }
  for(const snippet of [
    'group.Volume = 1',
    'local broken: { [string]: number } = {}',
    'broken[name] = os.clock() + 20',
    'task.delay(math.max(34, s.TimeLength + 1)',
    's.Ended:Once(',
    'if currentName == name and currentMusic and currentMusic.Parent',
    'currentName = nil', 'Sfx.music(name)',
    'if ambientKey == key and #ambient > 0 then',
    'Sfx.ambient(names, gain)',
    'local priority = { "music_harbor"',
    's.Loaded:Once(function()',
    'group:SetAttribute("AudioLastFailed", name)',
    'group:SetAttribute("AudioLastLoaded", name)',
    'if s.Parent and sfxOn and not s.Playing then s:Play() end',
    'if s.Parent and ambientKey == key and not s.Playing then s:Play() end',
  ]) assert.ok(audio.includes(snippet),'음향 복원 경로 누락: '+snippet);
  // [첫 모바일 터치] 지연 효과음을 12초에 잘라버리지 않고, 로딩 중인 복제본만 제한한다.
  assert.match(audio,/local loadingEffects = \{\}/,'미로딩 효과음 관리 누락');
  assert.ok(audio.includes('if waiting and waiting.Parent and not waiting.IsLoaded then return end'),'미로딩 효과음 중복 생성 방지 누락');
  assert.ok(audio.includes('if loadingEffects[name] == s then loadingEffects[name] = nil end'),'효과음 종료·로딩 후 상태 해제 누락');
  assert.doesNotMatch(audio,/task\.delay\(math\.max\(12, s\.TimeLength \+ 1\)/,'모바일 첫 효과음 12초 조기 삭제 금지');
  // 12초 로딩 실패 → 20초 유예 중 22초 재요청이 버려져 영구 무음이 되던 문제 방지.
  assert.match(audio,/local retryAfter = math\.max\(0, \(broken\[name\] or 0\) - os\.clock\(\)\) \+ 0\.2/,'배경음 재요청은 로딩 실패 유예 종료 뒤에만 실행');
  assert.match(audio,/task\.delay\(retryAfter, function\(\)[\s\S]*?if currentMusic == s and currentName == name and s\.Parent and not s\.IsLoaded then[\s\S]*?Sfx\.music\(name\)/,'화면 전환·늦은 로딩 이후의 중복 재생 금지');
  assert.doesNotMatch(audio,/broken\[name\] = true/,'오디오 로딩 실패 영구 봉인 금지');
  assert.doesNotMatch(audio,/local first = probe\(all\)/,'모바일 전체 음원 100개 동시 프리로드 금지');
  assert.ok(fieldScene.includes('Sfx.ambient({ "sfx_wind" }, 0.60)'));
  assert.ok(fieldScene.includes('if weather == "소나기" then 0.88 else 0.68'));
  assert.ok(fieldScene.includes('elseif phase == "밤" then 0.43 else 0.58'));
  // [무음 근본 원인] 100개 영수증의 granted=true만 믿고 다른 Universe를 건너뛰면 실게임에서 소리가 나지 않는다.
  const upload=fs.readFileSync('tools/mare-audio-upload.mjs','utf8');
  const receipts=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/audio/uploaded.json','utf8'));
  const audioIds=read('ReplicatedStorage/Shared/AudioIds.luau');
  assert.ok(upload.includes("process.env.MARE_UNIVERSE_ID||'10775310508'"));
  assert.ok(upload.includes("if(universeId!=='10775310508')"));
  assert.ok(upload.includes('if(rec.grantedUniverseId!==universeId)'));
  assert.ok(upload.includes("grant.errors[0].code==='AlreadyHasAccess'"));
  assert.ok(upload.includes('rec.grantedUniverseId=universeId'));
  assert.ok(upload.includes('if(provenance&&!(rec.sha256===sha'));
  assert.ok(upload.includes('receipts[t.name]?.grantedUniverseId===universeId'));
  assert.ok(Object.keys(receipts).length >= 100,'기존 오디오 100종 영수증 보존');
  for(const [name, receipt] of Object.entries(receipts)) {
    assert.equal(audioIds.includes(name+'="rbxassetid://'+receipt.assetId+'"'),true,'등록 음원 ID 원본 보존: '+name);
  }
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
  // [화살 볼트 3D] 과거 사각 Beam이 아닌 가는 실제 투사체와 짧은 Trail을 검사한다.
  assert.match(field,/shaft\.Name = "FieldProjectile"/);
  assert.match(field,/tip\.Name = "FieldArrowTip"/);
  assert.match(field,/local trail = Instance\.new\("Trail"\)/);
  assert.match(field,/shaft\.CFrame = CFrame\.lookAt\(p, p \+ aim\)/);
  assert.doesNotMatch(field.slice(field.indexOf('local function arrowTrail('),field.indexOf('-- 바닥 범위 예고:')),/Instance\.new\("Beam"\)/);
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
  const weapons=read('ReplicatedStorage/Shared/Weapons.luau');
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
  assert.match(field,/local swingBridge = \{ last = \{\}, lastAt = -100, from = nil, rootLast = nil, rootFrom = nil, at = 0, duration = 0, basicBeat = 0, basicAt = -100, impactSeq = -1 \}/);
  assert.match(field,/swingBridge\.impactSeq = actionSeq/);
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
  // [10타 피날레 검증] 시각 연출만 확장하고 평타·5타 강타 권한은 원본에 남겨둔다.
  for(const marker of [
    '[창술 실루엣]', '[무게 중심 반작용]', '[무기 개성]', '[격투술]',
    '[10타 연속 사격 착지]', '[시각적 여운]', '[10타 무기별 2박 피날레]',
    '[7직업 회피 궤적]', '[직업별 접지]'
  ]){
    assert.ok(field.includes(marker),'신규 모션 연출 누락: '+marker);
  }
  const finaleStart=field.indexOf('-- [10타 무기별 2박 피날레]');
  const finaleEnd=field.indexOf('if not visualMobile and basicBeat >= 7 then afterimage',finaleStart);
  assert.ok(finaleStart>0 && finaleEnd>finaleStart,'10타 시각 전용 피날레 영역 누락');
  const finale=field.slice(finaleStart,finaleEnd);
  for(const action of ['strikeEnemy(', 'AC.damageEnemy(', 'AC.tryMove(', 'pl.autoNormalHits +=']){
    assert.ok(!finale.includes(action),'피날레에서 전투 권한 변경 금지: '+action);
  }
  assert.match(finale,/swingBridge\.basicAt ~= finishAt/);
  assert.match(finale,/wpn\.id ~= finishWeapon/);
  assert.match(field,/task\.delay\(0\.22, function\(\)/);
  assert.match(field,/task\.delay\(0\.27, function\(\)/);
  assert.match(field,/if visualMobile then 2 else 6/);
  assert.match(field,/if not mobile and \(dodgeStyle == "warrior" or dodgeStyle == "gunner" or dodgeStyle == "navigator"\)/);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if pl\.autoNormalHits % 5 == 0 then/);
  // [5타 강타 시네마] 기존 10박자/숙련 추가 동작이 강타와 겹치지 않는다.
  assert.match(field,/local function comboCinema\(n: number, isRecord: boolean, autoHeavy: boolean\?\)/);
  assert.match(field,/if moveId == "heavy" then[\s\S]{0,250}chainMotionSerial \+= 1/);
  assert.match(field,/chainMotionSerial ~= visualSerial/);
  assert.match(field,/local reach = math\.max\(7, wpn\.range \* 2\)/);
  assert.match(field,/if useMove\("heavy"\) then[\s\S]*?comboCinema\(streakN, record, true\)/);
  assert.match(field,/AC\.tryMove\(pl, moveId, now\)/);
});



// [6종 곡예 회피와 고속 연타 검무] 시각 관절만 변경하며 전투 판정은 기존 그대로다.
test('탐험 0.4초 회피 6종 및 무기별 10타 공중 검무 유지',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const marker of [
    '[0.4초 댄스 회피 6종]', '[6종 회피 전신 관절]', '[전투 무용 4~9박]', '[4~9박 전신 곡예 관절]',
    '[옆구르기]', '[백덤블링]', '[높은 점프]', '[슬라이딩]', '[한손 짚고 돌기]', '[측면 공중회전]'
  ]) assert.ok(field.includes(marker),'곡예 모션 누락: '+marker);
  assert.match(field,/FieldDodgeTrick", \(ch0:GetAttribute\("FieldDodgeTrick"\) or 0\) % 6 \+ 1/);
  assert.match(field,/startSwing\("dash", 0\.4\)/);
  assert.match(field,/if kind == "dash" then\s+dur = 0\.4/);
  assert.match(field,/elseif kind == "slash" and beat >= 2 then\s+dur = math\.clamp\(dur, 0\.33, 0\.44\)/);
  assert.match(field,/local spin = t \* t \* \(3 - 2 \* t\) \* math\.pi \* 2/);
  assert.match(field,/elseif trick == 5 then[\s\S]*?canon\.HandL/);
  assert.match(field,/local spin = spinPhase \* spinPhase \* \(3 - 2 \* spinPhase\) \* math\.pi \* 2/);
  assert.ok(field.includes('[활·권총 공중 연사]'),'원거리 연속사격 곡예 누락');
  assert.ok(field.includes('[원거리 공중연사 발놀림]'),'원거리 공중 자세 누락');
  assert.match(field,/local agile = not crossbow and not longGun/);
  for(const i of [4,5,6,7,8,9]) assert.ok(field.includes('slashIdx == '+i),'10연타 곡예 단계 누락: '+i);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if pl\.autoNormalHits % 5 == 0 then/);
  assert.match(field,/hrp\.CFrame = hrp\.CFrame \+ look\.Unit \* 14/);
  assert.match(field,/pl\.matrixDodgeUntil = now \+ \(mv\.invuln or 0\.35\)/);
});

// [무기별 1~10타 섬광·잔상 안전 회귀] 효과는 실제 공격 시간에 맞추되 전투 권한과 분리한다.
test('탐험 무기별 검광·창끝·중량 충격파·활석궁총 타격 시각 연출',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const marker of [
    '[원거리 무기별 10단 발사 섬광]', '[원거리 손목별 잔광]',
    '[근접 무기별 2~10타 도장 잔광]', '[무기별 2~9타 접촉 섬광]',
    '[3·6·9타 무기별 2박]', '[1타 무기별 첫칼]', '[10타 무기별 2박 피날레]'
  ]) assert.ok(field.includes(marker),'무기별 연타 효과 누락: '+marker);
  assert.match(field,/local rangedTrail = if wpn\.family == "bow" then/);
  assert.match(field,/elseif wpn\.motion == "CROSSBOW" then \{ "LeftHand", "RightHand", "RightLowerArm" \}/);
  assert.match(field,/elseif wpn\.motion == "RIFLE" then \{ "LeftHand", "LeftLowerArm", "RightHand" \}/);
  for(const family of ['dagger','spear','axe','blunt','fist']){
    assert.ok(field.includes('wpn.family == "'+family+'"'),'무기별 궤적 구분 누락: '+family);
  }
  const ranged=field.slice(field.indexOf('-- [원거리 무기별 10단 발사 섬광]'),field.indexOf('-- [영화식 연속 사격]',field.indexOf('-- [원거리 무기별 10단 발사 섬광]')));
  const melee=field.slice(field.indexOf('-- [무기별 2~9타 접촉 섬광]'),field.indexOf('if basicBeat == 10 then',field.indexOf('-- [무기별 2~9타 접촉 섬광]')));
  for(const region of [ranged,melee]){
    assert.ok(region.length>200,'무기별 효과 범위 누락');
    assert.match(region,/task\.delay\(0\.14, function\(\)/);
    assert.match(region,/swingBridge\.basicAt ~= fxAt or wpn\.id ~= fxWeapon/);
    assert.match(region,/if visualMobile and fxBeat/);
    for(const forbidden of ['AC.damageEnemy(', 'AC.tryMove(', 'strikeEnemy(', 'pl.autoNormalHits =']){
      assert.ok(!region.includes(forbidden),'연출이 전투 판정을 건드림: '+forbidden);
    }
  }
  assert.match(field,/if pl\.autoNormalHits % 5 == 0 then/);
  assert.match(field,/task\.delay\(if kind == "slash" then 0\.14/);
  assert.match(field,/startSwing\("dash", 0\.4\)/);
});

// [실제 적중 1회만 정밀 검광] 공격 전 연출과 피해 판정은 기존 소유권을 유지한다.
test('탐험 무기별 실물 메시 축·피격 부위 절삭 관통 둔격 이펙트·모바일 절제',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const common=read('ReplicatedStorage/Shared/CommonVFX.luau');
  for(const marker of [
    '[실제 칼날 축]', '[실물 무기날 선택]', '[실제 적중 1회당 1번]',
    '[3·6·9타 잔흔]', '[맞는 재질감]', '[원거리 무기별 10단 발사 섬광]'
  ]) assert.ok(field.includes(marker),'무기별 정밀 타격 효과 누락: '+marker);
  for(const atom of ['IMPACT_FLASH','SHAPE_BURST','CRITICAL_BURST']){
    assert.ok(common.includes('"'+atom+'"'),'승인된 공용 효과 누락: '+atom);
  }
  assert.match(field,/axis = if size\.X >= size\.Y and size\.X >= size\.Z/);
  assert.match(field,/elseif size\.Z >= size\.Y then Vector3\.new\(0, 0, 1\)/);
  assert.match(field,/for _, part in sword:GetDescendants\(\) do/);
  assert.match(field,/if trail.Parent then trail.Enabled = false end/);
  assert.match(field,/task.delay\(trail.Lifetime \+ 0\.04, function\(\) pcall\(ctl.Destroy\) end\)/);
  assert.match(field,/local detailedContact = basicAttack == true and ownerAttack ~= false and not quiet/);
  assert.match(field,/and not shieldBlocked and not weaponParry and actionSeq ~= nil and actionSeq > 0/);
  assert.match(field,/and impactBeat ~= nil and swingBridge\.impactSeq ~= actionSeq/);
  assert.match(field,/swingBridge\.impactSeq = actionSeq/);
  assert.match(field,/nil, nil, hitActionSeq, nil, moveId == "rush", basicBeat\)/);
  assert.match(field,/local beat = math\.clamp\(math\.floor\(impactBeat\), 1, 10\)/);
  assert.match(field,/if not rangedImpact and not detailedContact then/);
  assert.match(field,/if rangedImpact and not shieldBlocked and not detailedContact then/);
  assert.match(field,/if not visualMobile and sharp and beat % 3 == 0 then/);
  assert.match(field,/task\.delay\(0\.055, function\(\)/);
  assert.match(field,/or swingBridge\.impactSeq ~= hitSeq then return end/);
  const start=field.indexOf('-- [실제 적중 1회당 1번]');
  const stop=field.indexOf('-- [맞는 재질감]',start);
  assert.ok(start>0&&stop>start,'정밀 적중 효과 범위 누락');
  const effect=field.slice(start,stop);
  for(const item of ['axe','blunt','dagger','spear','fist','bow','RIFLE','CROSSBOW','KATANA']){
    assert.ok(effect.includes('"'+item+'"'),'무기별 충돌 효과 누락: '+item);
  }
  for(const forbidden of ['AC.damageEnemy(', 'AC.tryMove(', 'strikeEnemy(', 'pl.autoNormalHits =','Instance.new(']){
    assert.ok(!effect.includes(forbidden),'효과에서 전투 판정 또는 임의 파츠 생성: '+forbidden);
  }
  assert.match(effect,/count = if visualMobile then 2 elseif heavy then 6 else 3/);
  assert.match(field,/if pl\.autoNormalHits % 5 == 0 then/);
});

// [쓰시마식 검술 1~10타 단계별 전신 연계] 실제 피해 판정·회피·저장 권한과 분리한다.
test('탐험 단계별 검술 발놀림과 골반 회전의 부드러운 전환 보호',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const sword=field.slice(field.indexOf('local function rootFor('),field.indexOf('elseif kind == "heavy" then',field.indexOf('local function rootFor(')));
  for(const marker of [
    '[쓰시마 1·2·3단]', '[쓰시마식 1~3타]', '[4타]', '[5타]', '[6타]', '[8타]', '[9타]',
    '[5단 축발 선회]', '[6단 중량 차별화]', '[9단 반대축]', '[전신 연속 보간]'
  ]) assert.ok(field.includes(marker),'단계별 검술 관절/회전 연결 누락: '+marker);
  for(let beat=1;beat<=10;beat++){
    assert.ok(sword.includes('slashIdx == '+beat),'검술 '+beat+'타 루트 동작 누락');
  }
  assert.match(field,/rootFrom = swingBridge\.rootLast/);
  assert.match(field,/rootRot = swingBridge\.rootFrom:Lerp\(rootRot or CFrame\.identity, blend\)/);
  assert.match(field,/if swingKind == "slash" and slashIdx <= 3 and not wpn\.ranged then/);
  for(const beat of [4,5,6,7,8,9]) assert.ok(field.includes('not wpn.ranged and slashIdx == '+beat),'근접 검무가 원거리 견착과 충돌: '+beat);
  assert.match(field,/if kind == "dash" then\s+dur = 0\.4/);
  assert.match(field,/elseif kind == "slash" and beat >= 2 then\s+dur = math\.clamp\(dur, 0\.33, 0\.44\)/);
  assert.match(field,/task\.delay\(if kind == "slash" then 0\.14/);
  assert.match(field,/if basicAttack == true then[\s\S]*?pl\.autoNormalHits = \(pl\.autoNormalHits or 0\) \+ 1/);
  assert.match(field,/if pl\.autoNormalHits % 5 == 0 then/);
  assert.match(field,/pl\.matrixDodgeUntil = now \+ \(mv\.invuln or 0\.35\)/);
  assert.match(field,/local featureList = landforms/);
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
  for(const [,kind,name] of scenery.matchAll(/\{"(Terrain|Town|Castle|Naval)","([^"]+)",/g)){
    assert.ok(assets.includes('["'+kind+'/'+name+'"]'),'승인되지 않은 지형 에셋: '+kind+'/'+name);
  }
  assert.match(field,/FieldQuestTerrainTheme/);
  assert.match(field,/FieldTerrainFeatureCount/);
  // [배경 디테일] 모바일 지형 수 제한, 승인 에셋 통합 배치, 지연 복제 및 철수 정리.
  assert.match(field,/if not visualMobile or index <= 9 then/);
  assert.match(field,/local function placeFeature\(entry\)/);
  assert.match(field,/local function stageFeature\(entry\)/);
  assert.ok(field.includes('if not AssetIds[entry[1] .. "/" .. entry[2]] then return nil end'));
  assert.match(field,/if not placed then table\.insert\(pending, entry\) end/);
  assert.match(field,/\{ "Terrain", "Town", "Castle", "Naval", "Cargo" \}/);
  assert.match(field,/entry\.position = c \+ Vector3\.new\(e\[4\], 0, e\[5\]\)/);
  assert.match(field,/FieldTerrainSurvey/);
  assert.match(field,/anchorPart:FindFirstChild\("FieldTerrainSurveyPoint"\)/);
  assert.match(field,/surveyPoint\.WorldPosition = Vector3\.new/);
  assert.match(field,/prompt\.Parent = surveyPoint/);
  assert.match(field,/local function retryPending\(groupName, modelName\)/);
  assert.match(field,/group\.ChildAdded:Connect\(function\(child\)/);
  assert.match(field,/if not needed then return end/);
  assert.match(field,/folder\.Destroying:Connect\(function\(\)/);
  assert.match(field,/folder\.ChildAdded:Connect\(function\(landmark\)/);
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
  assert.doesNotMatch(field.slice(field.indexOf('[자연 관찰]'),field.indexOf('-- 미니맵:',field.indexOf('[자연 관찰]'))),/AC\.damageEnemy|rewardGold|saveState/);
});


// [지역 기후·사계절 배경] 계절은 시각적 요소로 한정하고 승인된 환경 모델을 재사용한다.
test('탐험 지역 기후·사계절 배경과 바람 입자 디테일',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for (const marker of [
    'month = os.date("!*t").month', 'FieldSeason', 'FieldSeasonLabel', 'FieldClimateZone',
    'FieldSeasonMonth', 'local winterScene =', 'local monsoon =', 'foliageTint',
    'local detailAssets =', 'FieldSeasonalDrift', 'local driftType =', 'local weatherOptions = if snowy'
  ]) assert.ok(field.includes(marker),'계절/기후 묘사 연결 누락: '+marker);
  assert.match(field,/local detailCount = if visualMobile then 10 else 24/);
  assert.match(field,/local arid = not tropical and/);
  assert.match(field,/local climateZone = if northern then "북방"/);
  assert.match(field,/local weatherOptions = if snowy then/);
  assert.match(field,/drift\.Rate = \(if visualMobile then 3 else 8\)/);
  assert.match(field,/timeLabel\.Text = string\.format\("%s %s %02d:%02d/);
  assert.match(field,/placeModel\(folder, entry\[1\], entry\[2\], pos, entry\[3\], entry\[6\], entry\.tint\)/);
  for (const name of [
    'coast-grass-patch','Grass_Small','river-stone-bank','debris','Rock_2','log-stack',
    'forest-bush-detailed','forest-flower-purple','north-pine-fall','crops-wheatstageb',
    'forest-flower-yellow','arid-cactus-short','east-bamboo-grove'
  ]) assert.ok(assets.includes('["Terrain/'+name+'"]'),'미등록 계절 배경 모델: '+name);
  const start=field.indexOf('-- [지역 원근·계절 디테일]');
  const end=field.indexOf('-- 생산지·탐험 지역',start);
  assert.ok(start>0 && end>start,'계절 환경 배치 블록 누락');
  assert.doesNotMatch(field.slice(start,end),/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
  // 전투/적 자동 재출현은 장면의 계절 연출과 무관하다.
  assert.doesNotMatch(field,/FieldEnemyRespawn|spawnReinforcement/);
});


// [탐험 연타 사물과 병종 전술·방어·기상] 기존 플레이 규칙과 승인된 R15 모델로만 구현한다.
test('디아블로식 사물 연타·병종 협동 AI·피격 기상 및 사망 모션',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const motion=read('ReplicatedStorage/Shared/FieldMotion.luau');
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const combat=read('ReplicatedStorage/Shared/ActionCombat.luau');
  const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
  for(const marker of [
    'local fieldObjects = {}', 'FieldCombatObject', 'FieldObjectHits',
    'for _, obj in fieldObjects do', 'FieldObjectMaxHp', 'FieldObjectHp',
    'local sceneryHit = false', 'local visualObjectHits = 0',
    'local function breakCrate(c, strikePower: number?)',
    'local function explodeBarrel(b, hrp: BasePart, hitActionSeq: number?, strikePower: number?)',
    'if isBoss then 2.75 elseif ac.kind == "shield" or ac.kind == "charger" then 2.55 else 2.35',
    'e.knockUntil, e.riseUntil', 'e.ac.stagger = math.max(e.ac.stagger, 1.57)',
    'local knocked = now < (e.riseUntil or 0)', 'st, ph = "KNOCKDOWN"',
    'st, ph = "GETUP"', 'st, ph = "BLOCK"', 'st, ph = "PARRY"',
    'FieldEnemyReaction', 'FieldHitVariant', 'FieldTacticalIntent',
    'intent, goal = "frontline"', 'intent, goal = "flank"',
    'intent, goal = "ambush"', '"retreat" else "strafe"',
    'e.waiting = e.ac.state == "chase" and (others >= AC.MELEE_TOKENS',
    'pl.nextEnemyTurnAt = now + math.max(0.80',
    'e.nextDuelAt = now + math.max(2.2',
    'local ring = math.clamp(e.ac.def.range * STUD + 5',
    'RunService.PreSimulation:Connect(function(dt)',
    'not e.waiting)',
    'e.tacticAt = now + 0.65',
    'Pose.dieR15(dying, p, deathVariant)'
  ]) assert.ok(field.includes(marker),'탐험 전술/전투 연결 누락: '+marker);
  for(const marker of [
    'state == "KNOCKDOWN"', 'state == "GETUP"', 'state == "BLOCK"',
    'state == "PARRY"', 'local fallSide =',
    'bend("UpperArmL", -1.36', 'bend("UpperArmR", -1.44',
    'local hitStyle = h.model:GetAttribute("FieldHitVariant")'
  ]) assert.ok(motion.includes(marker),'R15 적 모션 누락: '+marker);
  // [적 인형 움직임 회귀] 전투 AI와 피해 수치를 바꾸지 않고, 기존 R15 관절로 발놀림·무게중심을 완성한다.
  for(const marker of [
    '[적 경계 동작]', '[적 보행 접지]', '[적 검무 발놀림]',
    '[쓰러짐 관성]', '[기상 3단]', '[피격 충격 전달]'
  ]) assert.ok(motion.includes(marker),'적 R15 전신 연계 누락: '+marker);
  for(const marker of ['state == "ANTICIPATION"', 'state == "ATTACK"', 'state == "RECOVERY"',
                       'state == "BLOCK" or state == "PARRY"', 'bend("FootL"', 'bend("FootR"',
                       'bend("ShinL"', 'bend("ShinR"', 'bend("Spine"', 'bend("Head"']) {
    assert.ok(motion.includes(marker),'적 검무 관절 동작 누락: '+marker);
  }
  const enemyFootwork=motion.slice(motion.indexOf('-- [적 검무 발놀림]'),motion.indexOf('-- [실제 타격 발동작]'));
  assert.ok(enemyFootwork.length > 1000,'적 전신 발놀림 블록 누락');
  for(const disallowed of ['AC.damageEnemy(', 'AC.stepEnemy(', 'Instance.new(', ':PivotTo(']) {
    assert.ok(!enemyFootwork.includes(disallowed),'R15 모션 전용 구간에서 실제 전투·위치 조작 금지: '+disallowed);
  }
  // [개떼 공격·관절 렌더 회귀] 모든 병종이 같은 2개 공격권을 쓰며 대기 중 겹치지 않는다.
  assert.match(combat,/A\.MELEE_TOKENS = 2/);
  assert.match(field,/e\.waiting = e\.ac\.state == "chase" and \(others >= AC\.MELEE_TOKENS[\s\S]*?e\.nextDuelAt/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, not e\.waiting\)/);
  assert.doesNotMatch(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, if e\.ac\.def\.keepAway or e\.ac\.def\.boss then true/);
  assert.match(field,/local band = math\.clamp\(\(flat\.Magnitude - ring\) \/ 6/);
  assert.match(field,/desired = \(tangent \* 0\.44 \+ flat\.Unit \* band\)/);
  assert.match(field,/pl\.nextEnemyTurnAt = now \+ math\.max\(0\.80/);
  assert.match(field,/RunService\.PreSimulation:Connect\(function\(dt\)/);
  assert.match(motion,/model:SetAttribute\("FieldJointChannels", nj\)/);
  assert.match(motion,/model:SetAttribute\("FieldJointReady", if r6 then nj >= 6 else nj >= 12\)/);
  assert.match(pose,/function Pose\.dieR15\(model, alpha, variant\)/);
  assert.match(pose,/local fade = math\.clamp\(\(a - 0\.78\) \/ 0\.22/);
  assert.match(field,/local duration = if visualMobile then 1\.35 else 1\.70/);
  assert.match(field,/if hits == 0 and not sceneryHit and hitActionSeq >= streakCountedSeq then endStreak/);
  assert.match(field,/if result == "exploded" then hits \+= 1 end/);
  assert.match(field,/if breakCrate\(c, if moveId == "heavy" then 2 else 1\) then sceneryHit = true end/);
  assert.match(field,/if rangedShot and shots >= 1 then break end/);
  assert.match(field,/local frozen = knocked or now < \(e\.holdUntil or 0\)[\s\S]{0,120}or now < \(e\.guardUntil or 0\)/);
  assert.match(field,/if not visualMobile or index <= 9 then/);
  assert.match(field,/local function placeFeature\(entry\)/);
  assert.match(field,/if not AssetIds\[entry\[1\] \.\. "\/" \.\. entry\[2\]\] then return nil end/);
  assert.match(combat,/A\.MELEE_TOKENS = 2/);
  // 새 피격 시스템은 기존 등록 모델을 재사용한다. 신규 사물 도형이나 새 몬스터 자산 없음.
  assert.ok(assets.includes('["Cargo/bucket"]'));
  assert.ok(assets.includes('["Naval/barrel"]'));
  const section=field.slice(field.indexOf('-- [디아블로식 사물 군집]'),field.indexOf('local function breakCrate('));
  assert.doesNotMatch(section,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
  assert.doesNotMatch(field,/FieldEnemyRespawn|spawnReinforcement/);
});


test('탐험 1~10타·회피 전환은 실제 배율이 적용된 R15 자세를 끊김 없이 연결한다', () => {
  const scale = field.indexOf('FM.scale(canon, if swingKind == "dash" then');
  const blend = field.indexOf('if swingKind and swingBridge.from then');
  const root = field.indexOf('rootRot = rootFor(swingKind');
  const cache = field.indexOf('if swingKind and (swingCombo or swingKind == "dash") then');
  const step = field.indexOf('FM.step(pfm, dt, rootRot');
  assert.ok(scale >= 0 && scale < blend && blend < root && root < cache && cache < step,
    '배율 적용 → 관절·루트 연결 → 최종 자세 캐시 → 관절 전송 순서가 유지되어야 한다');
  assert.match(field, /weight = weight \* weight \* \(3 - 2 \* weight\)/);
  assert.match(field, /blend = blend \* blend \* \(3 - 2 \* blend\)/);
  assert.match(field, /swingBridge\.from, swingBridge\.rootFrom, swingBridge\.rootLast = nil, nil, nil/);
  assert.match(field, /local settle = math\.sin\(math\.clamp\(\(p - 0\.57\) \/ 0\.43, 0, 1\) \* math\.pi\)/);
  assert.match(field, /-- 공격 종료 직후 오래된 자세로 다음 공격을 시작하지 않도록 즉시 캐시 폐기한다\./);
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const eased = t * t * (3 - 2 * t);
    assert.ok(eased >= 0 && eased <= 1);
  }
  assert.match(field, /pl\.autoNormalHits % 5 == 0/);
  assert.match(field, /if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
});
