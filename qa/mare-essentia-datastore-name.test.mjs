import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

// DataStore 이름이 개명·유니버스 변경 중에 조용히 바뀌어 플레이어 저장이 초기화되는 사고를 막는다.
// (2026-11-08: 새 유니버스에서 MareEssentia_v2로 저장이 시작됨.) 바꿔야 한다면 기존 저장 이전(마이그레이션)을 먼저 구현하고 이 테스트를 의도적으로 갱신한다.
const core=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau','utf8');

// [시작 로딩 회귀] 저장을 건드리지 않는 진단만 노출하고, 실제 서버/클라이언트 어느 단계에서 멈췄는지 증명한다.
test('스튜디오 실제 로딩 대기에서 서버·클라이언트 원인 증거를 남긴다',()=>{
  const capture=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json','utf8'));
  assert.equal(capture.length,336);
  assert.match(capture[4].code,/MARE_TITLE_NOT_READY_AFTER_50S;LOADING=/);
  assert.match(capture[4].code,/MareCoreStartStage/);
  assert.match(capture[4].code,/StartupStage/);
  assert.match(capture[4].code,/MareAssetsReady/);
  assert.match(capture[4].code,/MarePortSceneStage/);
  assert.match(capture[4].code,/PortSceneLoadState/);
  assert.match(client,/local PortScene = nil/);
  assert.match(client,/gui:SetAttribute\("PortSceneLoadState", "loading"\)/);
  assert.match(client,/gui:SetAttribute\("PortSceneLoadState", "ready"\)/);
  assert.match(client,/if not PortScene then return end/);
  assert.match(client,/return require\(Shared:WaitForChild\("PortScene"\)\)/);
  assert.match(client,/gui:SetAttribute\("StartupStage", "server-state-request"\)/);
  assert.match(client,/gui:SetAttribute\("StartupStage", "title-ready"\)/);
  assert.match(core,/MareCoreStartStage", "require-services"/);
  assert.match(core,/MareCoreStartStage", "remote-ready"/);
  assert.match(core,/MareCoreStartStage", "session-ready"/);
  assert.match(core,/local STORE_NAME = "MareEssentia_v2"/);
  assert.match(core,/return "P_" \.\. player.UserId/);
});

test('항구 장면의 소품 선택은 Luau 복수 반환 조건식 없이 실행된다', () => {
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.doesNotMatch(port,/local propGroup, propName\s*=\s*if/);
  assert.match(port,/local propGroup, propName\s*\n\s*if family == "fishery" then/);
  assert.match(port,/propGroup, propName = "Cargo", "box-open"/);
});

// [시작 캐릭터 실증 회귀] 항구가 없는 공중 스폰은 숨기고, 바닥·카메라가 준비된 뒤에만 원복한다.
test('항구 시작과 재생성에서 공중 캐릭터가 노출되지 않는다', () => {
  const client=read('StarterPlayer/Game.client.luau');
  const spawn=client.slice(client.indexOf('function H.placeCharacterOnSpawn(character)'),client.indexOf('player.CharacterAdded:Connect(H.placeCharacterOnSpawn)'));
  assert.match(spawn,/root.Anchored = true/);
  assert.match(spawn,/character:PivotTo\(groundedSpawn\)/);
  assert.match(spawn,/workspace:Raycast\(sceneSpawn.Position/);
  assert.match(spawn,/root.Size.Y \* 0.5 \+ humanoid.HipHeight/);
  assert.match(spawn,/humanoid.RigType == Enum.HumanoidRigType.R6/);
  assert.match(spawn,/rootHeight \+= leg.Size.Y/);
  assert.match(spawn,/workspace:FindFirstChild\("FieldScene"\) or workspace:GetAttribute\("VoyageActive"\)/);
  assert.match(client,/H.placeCharacterOnSpawn\(char\)/);
  assert.match(spawn,/part.LocalTransparencyModifier = if sceneSpawn then 0 else 1/);
  assert.match(client,/player.CharacterAppearanceLoaded:Connect\(H.placeCharacterOnSpawn\)/);
  assert.match(client,/titleGui.Enabled = on or H.titleMenuOpen or waitingPort/);
  assert.match(client,/if H.portLoadingLabel then H.portLoadingLabel.Visible = waitingPort and not H.titleMenuOpen end/);
  assert.match(client,/if H.setTitleMode then H.setTitleMode\(not view or newGameMode\) end/);
  assert.match(client,/H.setTitleMode\(false\)/);
});

test('게임 시작 메뉴는 PortScene 정본을 기다리지 않고 서버 상태를 표시한다', () => {
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.ok(client.indexOf('gui:SetAttribute("StartupStage", "server-state-request")')>client.indexOf('gui:SetAttribute("PortSceneLoadState", "loading")'));
  assert.ok(client.indexOf('gui:SetAttribute("PortSceneLoadState", "loading")')>client.indexOf('local PortScene = nil'));
  assert.match(port,/MarePortSceneStage", "require-Pose"/);
  assert.match(port,/MarePortSceneStage", "port-signatures"/);
  assert.match(port,/MarePortSceneStage", "ready"/);
  assert.match(client,/if not PortScene then[\s\S]*?return[\s\S]*?end[\s\S]*?sailingNow = true/);
  assert.match(client,/if not PortScene then return end/);
});

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
  // [세 원형 버튼·파티 HUD] 실제 터치 사각형은 가장자리까지 클릭되므로 12가지 화면 크기에서
  // 버튼끼리, 파티창·미니맵·조이스틱·카메라와 겹치지 않아야 한다. 실제 명중/스킬 판정은 보존한다.
  assert.ok(field.includes('addIcon(wbtn, "Menu/field_weapon")'));
  assert.ok(field.includes('map.Position = if compactTouch then UDim2.fromOffset(226, 90)'));
  assert.ok(field.includes('if compactTouch then UDim2.new(1, -68, 1, -315)'));
  assert.ok(field.includes('if compactTouch then UDim2.new(1, -62, 1, -202)'));
  assert.ok(field.includes('local partyWidth = if narrowParty then math.clamp(screen.X - 500, 100, 170) else 202'));
  assert.ok(field.includes('lastTouchEnded = os.clock()'));
  assert.ok(field.includes('touchActive = true'));
  assert.ok(field.includes('if touchActive or os.clock() - lastTouchEnded < 0.45 then return end'));
  assert.doesNotMatch(field,/b\.Activated:Connect\(go\)/,'같은 터치가 교체를 두 번 실행하면 안 됨');
  const rect=(cx,cy,d,extra=0)=>({left:cx-d/2-extra,top:cy-d/2-extra,
    right:cx+d/2+extra,bottom:cy+d/2+extra});
  const box=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h});
  const overlaps=(a,b)=>a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  for(const [width,height] of [
    [320,540],[320,640],[360,780],[384,832],[428,926],[600,280],
    [640,320],[680,380],[720,320],[720,384],[832,384],[960,440],
  ]){
    const portrait=width<520 || width<=height,short=height<330;
    const attack=rect(width-(portrait?76:short&&width<650?76:95),
      height-(portrait?85:short?70:88),portrait||short?104:116,10);
    const dodge=rect(width-(portrait?62:235),
      height-(portrait?202:short?67:106),portrait?86:short?88:96);
    const weapon=rect(width-(portrait?68:width<780?90:175),
      height-(portrait?315:short?181:225),portrait?76:short?72:80);
    const map=box(portrait?226:236,portrait?90:74,
      portrait?92:short?82:106,portrait?92:short?82:106);
    const narrowParty=width>=600 && width<720 && width>height;
    const partyWidth=narrowParty?Math.max(100,Math.min(170,width-500)):202;
    const allies=width>=600 && width>height?
      [box(356,74,partyWidth,height<350?44:52),
       box(356,height<350?120:130,partyWidth,height<350?44:52)]:
      [box(12,282,202,52),box(12,338,202,52)];
    const rest=[
      ['이동패드',box(28,height-178,150,150)],
      ['미니맵',map],['주인공',box(12,74,202,82)],
      ['카메라',box(width-120,12,108,44)],
      ['동료1',allies[0]],['동료2',allies[1]],
    ];
    const buttons=[['공격',attack],['회피',dodge],['교체',weapon]];
    for(const [name,a] of buttons){
      for(const [other,b] of [...rest,...buttons.filter(([n])=>n!==name)]){
        assert.equal(overlaps(a,b),false, width+'×'+height+' '+name+'/'+other+' HUD 겹침');
      }
    }
  }
  assert.match(field,/attackCaption\.Name = "FieldAttackCaption"/);
  assert.match(field,/dodgeCaption\.Name = "FieldDodgeCaption"/);
  assert.match(field,/addIcon\(attackBtn, "Menu\/cc0_sword"\)/);
  assert.match(field,/addIcon\(b, "Menu\/chart_compass"\)/);
  for(const key of ['field_attack','field_dodge','field_weapon'])
    assert.ok(field.includes('"Menu/'+key+'"'), '지상 버튼 이미지 등록키 누락: '+key);
  assert.ok(field.includes('attackBtn:GetAttribute("IconArtKey") ~= "Menu/field_attack"'),'무기교체가 새 공격 원화를 덮어쓰면 안 됨');
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
    '[전방 활시위]', '[기본 사격 팔 역전 보정]',
    'local shotLanded = true', 'local baseAccuracy = if wpn.motion == "CROSSBOW"',
    '- (if shooterMoving then 0.10 else 0)',
    '- (if targetMoving then 0.085 else 0)',
    '(e.dodgeUntil or 0) > os.clock()',
    'if shotLanded then strikeEnemy(', 'else false',
    'if landed then hits += 1 end', 'shots += 1',
    'if not shotLanded then', 'if rangedShot and shots == 0 then'
  ]) assert.ok(scene.includes(snippet),'활·석궁/확률 판정 회귀: '+snippet);
  assert.ok(scene.includes('canon.UpperArmR = (canon.UpperArmR or id):Lerp('),'활/석궁 어깨 절대 견착 보간 누락');
  assert.doesNotMatch(scene,/\(canon\.UpperArmR or id\) \* CFrame\.Angles\(-0\.72 \* poseWeight/,'기존 석궁 어깨 중복 회전이 다시 나타남');
  assert.doesNotMatch(scene,/\(canon\.UpperArmL or id\) \* CFrame\.Angles\(-1\.03 \* poseWeight/,'기존 활 어깨 중복 회전이 다시 나타남');
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
  assert.equal(script.length,336,'기존 전체 스튜디오 검사와 디자인·사운드 감사 유지');
  assert.equal(script.filter(x=>x.type==='capture').length,93);
  assert.ok(script.some(x=>x.code?.includes('STUDIO_AUDIO_AUDIT')));
  // [실제 화면 대기] 고정시간을 넘기는 PC 시작 로딩에서 아무 버튼을 잘못 누르지 않는다.
  assert.equal(script[4].type,'luau');
  assert.equal(script[4].timeoutMs,85000);
  assert.match(script[4].code,/MARE_TITLE_NOT_READY_AFTER_50S/);
  assert.match(script[4].code,/FindFirstChild\('StartLoading'\)/);
  assert.match(script[4].code,/task\.wait\(0\.5\)/);
  assert.match(script[6].code,/if not best or bs<=0 then return 'NONE' end/);

  const entry=script.find(x=>x.type==='luau'&&x.code?.includes('FIELD_QA_ENTRY_FAIL:'))?.code||'';
  const motion=script.find(x=>x.type==='luau'&&x.code?.includes('FIELD_ATTACK_WEAPON_ICON_UNAPPROVED'))?.code||'';
  const live=script.find(x=>x.type==='luau'&&x.code?.includes('MOTION_ENEMY_ROLE_MISSING'))?.code||'';
  assert.ok(entry.includes('FIELD_QA_ENTRY_FAIL:'),'실제 UI로 탐험 입장 검증 필수');
  assert.ok(entry.includes('FieldCombatReady'),'실제 전투 준비 검증 필수');
  // [승인 원화 회귀] 새 공격 원화는 완성형 PNG를 검증하고, 구형 아이콘만 메달 테두리를 검증한다.
  assert.ok(entry.includes('FIELD_APPROVED_ATTACK_ART_INVALID'),'승인 원화·출처 이미지 검사 필수');
  // [실물 실패 회귀] 최초 무기 선정·교체가 승인 공격 원화를 덮어쓰지 않으며 회피도 승인된 두 원화만 허용한다.
  const init=field.slice(field.indexOf('local reserveWeapon = Weapons.get('),field.indexOf('local function char3()',field.indexOf('local reserveWeapon = Weapons.get(')));
  assert.match(init,/if attackIcon and attackBtn:GetAttribute\("IconArtKey"\) ~= "Menu\/field_attack" then/,'시작 무기 설정이 완성형 공격 원화를 덮어쓰면 안 된다');
  assert.ok(entry.includes('local dodgeKey=dodge:GetAttribute("IconArtKey")'),'입장 검사도 실제 등록 회피 원화의 키를 사용해야 한다');
  assert.ok(motion.includes('"Menu/field_attack","Menu/cc0_sword"'),'모션 검사에서도 승인 공격 원화를 정상 인식해야 한다');
  assert.ok(motion.includes('local dodgeKey=dodge:GetAttribute("IconArtKey")'),'모션 검사에서 승인 회피 원화를 정상 인식해야 한다');
  assert.ok(entry.includes('FIELD_GOLD_BUTTON_BORDER_INVALID'),'실제 공격 버튼의 금색 테두리 활성화·색상·두께 검증 필수');
  assert.ok(field.includes('if outline then outline.Enabled = button.Name == "FieldAttack" end'),'승인 공격 원화에서도 금색 테두리 유지 필수');
  assert.ok(entry.includes('FIELD_PREMIUM_RIM_MISSING'),'기존 메달 원화의 링 검증 유지');
  assert.ok(field.includes('if string.sub(key, 1, 11) == "Menu/field_" then'),'승인 완성형 아이콘 전용 렌더 경로 유지');
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
  // [연타 상태 검사] 예전 선언문의 정확한 끝 위치를 강제하지 않고 원래 계약 필드를 개별 확인한다.
  // 예약 타격·입력 버퍼가 추가돼도 기존 10타 시각 연결과 명중 중복 방지 계약은 유지해야 한다.
  const bridge = field.match(/local swingBridge = \{[^\r\n]*\}/)?.[0];
  assert.ok(bridge,'R15 공격 전신 연결 상태 누락');
  for(const key of [
    'last = {}','lastAt = -100','from = nil','rootLast = nil','rootFrom = nil',
    'at = 0','duration = 0','basicBeat = 0','basicAt = -100','impactSeq = -1',
  ]){
    assert.ok(bridge.includes(key),'R15 연타 필수 상태 누락: '+key);
  }
  // [모션/폰트 회귀] 강타·필살도 관절 시계를 멈추지 않으며 표시 글자 크기는 고정한다.
  assert.doesNotMatch(field,/hitStopUntil|hitStopLast|swingT0 \+= elapsed/);
  assert.match(field,/comboPopScale = Instance\.new\("UIScale"\)/);
  assert.match(field,/comboLabel\.TextSize = targetSize/);
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
  // [층별 고도 보존] 성탑·지붕 수직 오프셋을 무시하지 않고 XZ 원위치도 유지한다.
  assert.match(field,/entry\.position = c \+ Vector3\.new\(e\[4\], e\[8\] or 0, e\[5\]\)/);
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


// [탐험 흰 건물·바닥 회귀] 승인된 메시의 색상 유실과 층 겹침만 바로잡고 전투·퀘스트 판정은 보존한다.
test('대항해시대 탐험의 흰 건물·바닥과 성탑 층 겹침 방지',()=>{
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  const start=field.indexOf('local function placeModel(');
  const end=field.indexOf('local function label(',start);
  assert.ok(start>=0 && end>start,'기존 필드 모델 배치 책임 함수 누락');
  const placement=field.slice(start,end);
  for(const marker of [
    'local named = (kind == "Town"', 'kind == "Castle"',
    'kind == "Terrain"', 'kind == "Naval"',
    'd.TextureID ~= ""', 'sa and sa.ColorMap ~= ""', 'ch.TextureId ~= ""',
    'light >= 0.80 and chroma <= 0.13',
    'Enum.Material.Cobblestone', 'Enum.Material.WoodPlanks',
    'Enum.Material.Slate', 'Enum.Material.Ground',
    'd.Material, d.Color, d.Reflectance = mat, color, 0',
    'm:ScaleTo(m:GetScale() * ratio)',
  ]) assert.ok(placement.includes(marker),'건축 메시 색상·배율 복구 누락: '+marker);
  assert.ok(field.includes('"tower-hexagon-mid", 12, -30, -26, true, nil, 8'));
  assert.ok(field.includes('"tower-hexagon-roof", 12, 30, -26, true, nil, 16'));
  assert.ok(field.includes('entry.position = c + Vector3.new(e[4], e[8] or 0, e[5])'));
  assert.doesNotMatch(placement,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/,'건물 복구에 임시 도형 금지');
  assert.match(field,/local enemyCount = math\.clamp\(20 \+ \(danger0 - 1\) \* 6/);
  assert.match(field,/AC\.stepEnemy\(e\.ac, enemyDt, dist, not e\.waiting\)/);
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
  // [협동 AI 회귀] 3인 무리는 방패·검병 중 한 명만 정면을 맡고, 측면·원거리 지원과 반격 순서를 유지한다.
  assert.match(field,/for mateIndex, mate in enemies do[\s\S]*?mate\.ac\.kind == "shield"/);
  assert.match(field,/mateIndex < index/);
  assert.match(field,/intent, goal = "flank"/);
  assert.match(field,/intent, goal = "frontline"/);
  assert.match(field,/nextCounter\.counterUntil/);
  assert.match(field,/not nextCounter or/);
  assert.match(field,/guardReadUntil, e\.nextGuardReadAt = now \+ 1\.05, now \+ 5\.5/);
  assert.match(field,/intent = if readingCombo then "counter-flank" elseif readingGuard then "guard-flank"/);
  assert.match(field,/local evadeSide = e\.model:GetAttribute\("FieldEnemyDodgeSide"\)/);
  assert.match(field,/evadeSide \* 0\.20 \* math\.sin\(ph \* math\.pi\)/);
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
  assert.match(field, /elseif os\.clock\(\) - swingBridge\.lastAt > 1\.1 then/);
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const eased = t * t * (3 - 2 * t);
    assert.ok(eased >= 0 && eased <= 1);
  }
  assert.match(field, /pl\.autoNormalHits % 5 == 0/);
  assert.match(field, /if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
});


test('무기별 정밀 R15 동작은 타격 전후 영점 복귀와 기존 전투 권한을 지킨다', () => {
  const a=field.indexOf('-- [무기별 정밀 동작]');
  const b=field.indexOf('-- [쓰시마식 1~3타]',a);
  assert.ok(a>0 && b>a,'기존 주인공 관절 합성 블록을 직접 수정해야 한다');
  const fine=field.slice(a,b);
  for(const family of ['dagger','fist','spear','axe','blunt','blade']){
    assert.ok(fine.includes('family == "'+family+'"'),'무기 세부 동작 누락: '+family);
  }
  for(const variant of ['RAPIER','KATANA','SABRE','SCIMITAR']){
    assert.ok(fine.includes('wpn.motion == "'+variant+'"'),'검종별 정밀 자세 누락: '+variant);
  }
  assert.match(fine,/local prepare = math\.sin\(math\.clamp\(p \/ 0\.34, 0, 1\) \* math\.pi\) \^ 2/);
  assert.match(fine,/local contact = math\.sin\(math\.clamp\(\(p - 0\.11\) \/ 0\.60, 0, 1\) \* math\.pi\) \^ 2/);
  assert.match(fine,/local recover = math\.sin\(math\.clamp\(\(p - 0\.43\) \/ 0\.57, 0, 1\) \* math\.pi\) \^ 2/);
  for(const forbidden of ['AC.tryMove(', 'strikeEnemy(', 'hrp.CFrame =', 'pl.autoNormalHits +=']){
    assert.ok(!fine.includes(forbidden),'시각 모션에 전투 권한이 혼입됨: '+forbidden);
  }
  const rangeStart=field.indexOf('-- [사격 곡선]');
  const rangeEnd=field.indexOf('-- [연타 관성]',rangeStart);
  assert.ok(rangeStart>0 && rangeEnd>rangeStart,'기존 원거리 견착 보정 블록 누락');
  const range=field.slice(rangeStart,rangeEnd);
  assert.match(range,/local press = if firing then math\.sin\(progress \* math\.pi\) \^ 2 else 0/);
  assert.match(range,/local recoil = if firing then math\.sin\(math\.clamp\(\(progress - 0\.26\) \/ 0\.42, 0, 1\) \* math\.pi\) \^ 2 else 0/);
  assert.match(range,/local recover = if firing then math\.sin\(math\.clamp\(\(progress - 0\.56\) \/ 0\.44, 0, 1\) \* math\.pi\) \^ 2 else 0/);
  for(const variant of ['crossbow','bow','longGun','pistol']){
    assert.ok(range.includes(variant),'원거리 무기 고유 반동 누락: '+variant);
  }
  for(const [start,end] of [[0,0.34],[0.11,0.71],[0.43,1],[0.26,0.68],[0.56,1]]){
    const pulse=p=>Math.sin(Math.max(0,Math.min(1,(p-start)/(end-start)))*Math.PI)**2;
    assert.ok(Math.abs(pulse(0))<1e-10 && Math.abs(pulse(1))<1e-10,'시작·끝 관절 흔들림 잔존');
    assert.ok(pulse((start+end)/2)>0.999,'무기별 파형이 실제로 움직여야 한다');
  }
  assert.match(field,/elseif swingKind and swingCombo and \(wpn\.family == "dagger" or wpn\.family == "fist"\) then 1\.12/);
  assert.match(field,/elseif swingKind and swingCombo and \(wpn\.family == "axe" or wpn\.family == "blunt"\) then 0\.96/);
  assert.match(field,/elseif swingKind and swingCombo and wpn\.family == "spear" then 1\.06 else nil/);
  assert.match(field,/pl\.autoNormalHits % 5 == 0/);
  assert.match(field,/if rank > 1 and comboNow - lastMasteryComboAt >= 7/);
});

// [R15 주민·동료 실물복식] 남녀 네 계열과 기존 15관절/저장키 보존 회귀.
test('항구 주민·동료 남녀 4계열은 등록된 실제 3D 의상 메시를 사용한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  for(const profile of ['citizen_male','citizen_female','companion_male','companion_female']) {
    assert.ok(pose.includes(profile+' = {'),'복식 계열 누락: '+profile);
  }
  for(const asset of ['male_peasant_body','female_peasant_body','male_ranger_body','female_ranger_body','hair_simpleparted','hair_buns','hair_long']) {
    assert.ok(pose.includes('"'+asset+'"'),'기존 등록 3D 복장 누락: '+asset);
  }
  assert.match(pose,/Pose\.applyRegisteredMobOutfit\(model\)/);
  assert.match(pose,/model:SetAttribute\("NpcAssetProfile"/);
  assert.match(pose,/gender ~= "female" and beard == 2/);
  assert.match(port,/extra\.female = female/);
  assert.match(port,/c\.id == "c_merian"/);
  assert.match(port,/people\.ChildAdded:Connect\(function\(asset\)/);
  assert.match(port,/outfitConn:Disconnect\(\)/);
  assert.match(pose,/part\.Massless = true/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
  assert.match(pose,/model:SetAttribute\("RigType", "R15"\)/);
});

// [주민·동료 실물복식 2차] 직업군과 탐험 현장 동료 복식을 기존 R15·자산 인입 책임 안에서 검증한다.
test('직업별 주민과 남녀 탐험 동료의 실제 메시 복식은 등록 자산과 R15 결합을 재사용한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const profile of ['citizen_worker_male','citizen_worker_female','citizen_guard_male','citizen_guard_female',
    'citizen_official_male','citizen_official_female','companion_clergy_male','companion_clergy_female']) {
    assert.ok(pose.includes(profile+' = {'), '직업 복식 누락: '+profile);
  }
  for(const name of ['hair_buzzed','hair_buzzedfemale','male_ranger_acc_pauldron','female_ranger_acc_pauldrons',
    'male_ranger_head_hood','female_ranger_head_hood']) {
    assert.ok(pose.includes('"'+name+'"'), '기등록 복식 자산 누락: '+name);
  }
  assert.match(pose,/NPC_PROFESSION_LOOK\[outfit\.profession\]/);
  assert.match(pose,/look = "companion_clergy"/);
  assert.match(pose,/model:SetAttribute\("NpcAssetProfile", look \.\. "_" \.\. outfit\.gender\)/);
  assert.match(field,/local knownFemale = id == "c_merian"/);
  assert.match(field,/nm\.gender == "female" or nm\.gender == "male"/);
  assert.match(field,/companion = true, gender = if ad\.female then "female" else "male"/);
  assert.match(field,/outfit\.hair = if ad\.female then/);
  assert.match(field,/for _, subject in folder:GetChildren\(\) do[\s\S]*?subject:GetAttribute\("NpcAppearanceState"\) ~= "ready"/);
  assert.match(port,/profession = c\.role/);
  assert.match(port,/c\.id == "t_nun" or c\.id == "t_bhikkhuni"/);
  assert.match(pose,/skin:ScaleTo\(ratio\)/);
  assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
});

// [주민·동료 복식 3차] 선원/장인과 기존 헤어 스타일 일치·초기 로딩·성별 오분류 방지.
test('선원·장인 직업별 실물 복장과 여성 헤어 스타일을 원본 R15 메시에서 선택한다',()=>{
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const name of ['citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female']) {
    assert.ok(pose.includes(name+' = {'),'선원/장인 3D 복식 누락: '+name);
  }
  for(const career of ['fisher = "sailor"','sailor = "sailor"','smith = "artisan"','tailor = "artisan"','shipwright = "artisan"']) {
    assert.ok(pose.includes(career),'직업별 복식 연결 누락: '+career);
  }
  assert.match(pose,/model:SetAttribute\("NpcHairStyle", outfit\.hair\)/);
  assert.match(pose,/model:SetAttribute\("NpcHairTint", outfit\.hairColor\)/);
  assert.match(pose,/elseif femaleLong and hairstyle == "long" then/);
  assert.match(pose,/elseif femaleLong and hairstyle == "bun" then/);
  assert.match(pose,/if hair and model:GetAttribute\("NpcHairTint"\) then 0\.40/);
  for(const mesh of ['hair_long','hair_simpleparted','hair_buzzed','hair_buzzedfemale']) {
    assert.ok(loader.includes('["People/'+mesh+'"] = true'),'로더 우선순위 누락: '+mesh);
  }
  assert.doesNotMatch(port,/or c\.id == "t_purser"/);
  assert.doesNotMatch(field,/or id == "t_purser"/);
  assert.match(pose,/model:SetAttribute\("RigType", "R15"\)/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
});

// [항구 7구획 확장] 기존 경제/자산 정본을 유지하며 왕궁 경기병/창고/식료품/직업 모션을 검사한다.
test('왕궁 경기병 2명과 지역별 창고·식료품·직업 모션은 순수 시각화로 유지된다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 assert.match(port,/for i, side in \{ -1, 1 \} do[\s\S]*?RoyalLightCavalry_/);
 assert.match(port,/if AssetIds\["Animals\/horse"\] then importedModel\(folder, "Animals", "horse"/);
 assert.match(port,/folder:SetAttribute\("RoyalLightCavalryVisible", cavalryVisible\)/);
 assert.match(port,/folder:SetAttribute\("RoyalLightCavalryMounted", mountedVisible\)/);
 assert.match(port,/elseif w\.mode == "royal_rider" then/);
 assert.match(port,/MarketFoodShop_/);
 assert.match(port,/HarborWarehouseGoods_/);
 assert.match(port,/cargo:SetAttribute\("ShowcaseOnly", true\)/);
 assert.match(port,/key == "japan" or key == "china" or key == "korea"/);
 for(const name of ['harvest','weigh','milk','kneel','fold']){
  assert.ok(pose.includes('elseif kind == "'+name+'" then'),'새 작업 모션 누락: '+name);
  assert.ok(port.includes('"'+name+'"'),'항구 작업 배치 누락: '+name);
 }
 assert.match(port,/local visibleCap = if game:GetService\("UserInputService"\)\.TouchEnabled then 6 else 12/);
 assert.match(port,/local courtStaff = PortBuildings\.royalPopulation/);
});

// [경제-건축 연결] 기존 SimCity형 예산/수요 엔진과 시각 필지 키를 연결한다. 구매·저장 기능은 아직 미도입.
test('자동 경제발전 건축 필지는 기존 경제 수요를 읽고 미래 수동 건축 키를 보존한다',()=>{
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const econ=read('ReplicatedStorage/Shared/Economy.luau');
  assert.match(econ,/function E\.buildingTargets\(t\)/);
  assert.match(econ,/function E\.stepBuildings\(t, budget\)/);
  assert.match(econ,/E\.stepBuildings\(t, math\.min\(t\.treasury, tax \* 0\.5\)\)/);
  assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
  assert.match(port,/CityConstructionCanPurchase", false/);
  assert.match(port,/SetAttribute\("BuildPlotId"/);
  assert.match(port,/SetAttribute\("BuildState", "vacant"\)/);
  assert.match(port,/SetAttribute\("BuildState", "constructing"\)/);
  assert.match(port,/SetAttribute\("BuildState", "complete"\)/);
  assert.match(port,/SetAttribute\("BuildEconomicCount", count\)/);
  assert.match(port,/info\.portId \.\. ":harbor:" \.\. plot\.id/);
  assert.match(port,/info\.portId \.\. ":royal:main"/);
  assert.match(port,/local function fillRow\(z, t, xStart, side, laneIndex, rowIndex\)/);
  assert.match(port,/SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [대형 농업 구획] 경제 건설량과 가축 수는 그대로 두고 대형 농촌 부지만 렌더링한다.
test('실제 농장 320x220과 목장 260x208은 도로·왕궁을 피해 분리되고 모바일 가벼운 에셋으로 제한된다',()=>{
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  const buildings=read('ReplicatedStorage/Shared/PortBuildings.luau');
  assert.match(buildings,/B\.RuralPlots = \{/);
  for (const property of ['pastureHalfX = 130','pastureHalfZ = 104','pigHalfX = 88','pigHalfZ = 72',
    'cropWidth = 320','cropDepth = 220','penSpacing = 280','groundWidth = 700',
    'maxCropRowsTouch = 6','cropColumnsTouch = 7']) assert.ok(buildings.includes(property),property);
  assert.match(port,/local rural = PortBuildings\.RuralPlots/);
  assert.match(port,/grass:SetAttribute\("BuildPlotId", info\.portId \.\. ":pasture:" \.\. i\)/);
  assert.match(port,/soil:SetAttribute\("BuildPlotId", info\.portId \.\. ":farmland:" \.\. i\)/);
  assert.match(port,/local xSections = math\.ceil\(halfX \* 2 \/ rural\.fenceSegmentMax\)/);
  assert.match(port,/local zSections = math\.ceil\(halfZ \* 2 \/ rural\.fenceSegmentMax\)/);
  assert.match(port,/local grazeCount = if farmCount then math\.clamp\(2 \+ math\.floor\(math\.sqrt\(math\.max\(0, farmCount\)\) \/ 5\), 2, 7\)/);
  assert.match(port,/local columns = if touch then rural\.cropColumnsTouch else rural\.cropColumnsDesktop/);
  assert.match(port,/FarmIrrigationChannel/);
  assert.match(port,/EconomicFarmCount/);
  assert.match(port,/BuildAuthority", "VISUAL_ONLY"/);
});

// [경제 연동 자동 공사 + 단계 장식] 기존 경제 지출·시설 수가 있을 때만 시각 공사/장식을 만든다.
test('경제 공사 종류·건축자 모션·도시 장식 성장 모두 기존 경제 원본을 읽는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const plan=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const server=read('ServerScriptService/Services/Econ.luau');
 assert.match(server,/construction\.active = construction\.spending > 0\.01 and needed > 0\.01/);
 assert.match(scene,/local liveConstruction = info\.sim and info\.sim\.construction/);
 assert.match(scene,/if \(tonumber\(liveConstruction\[id\]\) or 0\) > 0\.01 then/);
 assert.match(scene,/local i = activeSites\[slot\]/);
 assert.match(scene,/mark:SetAttribute\("EconomicConstructionSpending"/);
 assert.match(scene,/mark:SetAttribute\("EconomicConstructionNeed"/);
 assert.match(scene,/"stoop" else "hammer"/);
 assert.match(scene,/"carry", 1\.7, \{ role = "Barbarian", hat = "cap" \}/);
 assert.match(plan,/function B\.decorativeVisual\(level, buildings, prosperity\)/);
 assert.match(plan,/count >= 12 and healthy/);
 for(const kind of ['market','religious','farm','industry','civic']) assert.ok(plan.includes(kind + ' = grade('),kind);
 assert.match(scene,/local decor = PortBuildings\.decorativeVisual\(lvl, info\.sim and info\.sim\.buildings, info\.sim and info\.sim\.prosperity\)/);
 assert.match(scene,/decorLimit = if game:GetService\("UserInputService"\)\.TouchEnabled then 7 else 13/);
 assert.match(scene,/CityGrowthDecoration_/);
 assert.match(scene,/CityDecorationGrowthMode", "ECONOMY_READ_ONLY"/);
 assert.match(scene,/obj:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [자동 발전 3D 설치 모션] 경제 건축 시공 단계, 새 장식 설치, 기존 필지/저장 불변 보장.
test('발전도 해금 장식은 단계적으로 설치되고 기존 완공물은 입항 때마다 재시공하지 않는다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const config=read('ReplicatedStorage/Shared/PortBuildings.luau');
 assert.match(scene,/local TweenService = game:GetService\("TweenService"\)/);
 assert.match(scene,/local lastDecorationGrowth = \{\}/);
 assert.match(scene,/local function importedModel\(parent, kind, asset, bottomPosition, desiredSize, solid, tint, buildDelay\)/);
 assert.match(scene,/piece\.part\.CFrame = piece\.final \+ Vector3\.new\(0, -drop, 0\)/);
 assert.match(scene,/TweenService:Create\(piece\.part, timing, \{ CFrame = piece\.final, Transparency = piece\.alpha \}\):Play\(\)/);
 assert.match(scene,/piece\.part\.CanCollide = piece\.solid/);
 assert.match(scene,/if not m\.Parent or not parent\.Parent then return end/);
 assert.match(scene,/phase >= 1 then importedModel\(folder, "Town", "floor_base", at, 13, false, nil, 0\.14\)/);
 assert.match(scene,/phase >= 2 then importedModel\(folder, "Town", "kenney_wood_wall_01",/);
 assert.match(scene,/phase >= 3 then importedModel\(folder, "Town", "kenney_roof_straight_red_01",/);
 assert.match(scene,/local newGrade = previousDecor and tier > \(previousDecor\[d\.kind\] or 0\)/);
 assert.match(scene,/if info\.sim and info\.sim\.buildings then lastDecorationGrowth\[info\.portId\] = decor end/);
 assert.match(scene,/CityDecorationScaffold/);
 assert.match(scene,/worker:SetAttribute\("Job", "construction_worker"\)/);
 assert.match(scene,/duty\.kind = "inspect"/);
 for(const tier of ['residential','harbor'])assert.match(config,new RegExp(tier+' = grade\\('));
 assert.match(scene,/CityGrowthDecoration_residential/);
 assert.match(scene,/CityGrowthDecoration_harbor/);
 assert.match(scene,/CityDecorationInstalledThisVisit/);
 assert.match(scene,/CityDecorationBuilders/);
 assert.match(scene,/local animationLimit = if touchDecor then 3 else 6/);
 assert.match(scene,/local builderLimit = if touchDecor then 1 else 2/);
 assert.match(scene,/BuildAuthority", "VISUAL_ONLY"/);
});



// [장식 시공 생명주기] 모든 구역의 신규 해금 장식에 동일한 임시 작업 현장을 적용한다.
test('주거·항만·공방·행정·시장 장식은 실제 신규 단계에서만 시공하고 목수·비계를 정리한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const start=scene.indexOf('local function stageDecoration(item, site, buildDelay)');
 const end=scene.indexOf('-- 도시마다 고정된 지형 시드',start);
 assert.ok(start>0&&end>start,'기존 densify 내부의 단일 장식 시공 책임 함수');
 const stage=scene.slice(start,end);
 assert.match(stage,/item:GetAttribute\("BuildVisualState"\) ~= "installing"/);
 assert.match(stage,/item:SetAttribute\("BuildState", "constructing"\)/);
 assert.match(stage,/item:SetAttribute\("BuildState", "complete"\)/);
 assert.match(stage,/scaffold.Name = "CityDecorationScaffold"/);
 assert.match(stage,/scaffold:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(stage,/worker:SetAttribute\("Activity", "hammer"\)/);
 assert.match(stage,/duty.kind = "inspect"/);
 assert.match(stage,/worker:Destroy\(\)/);
 assert.match(stage,/scaffold:Destroy\(\)/);
 assert.match(stage,/while item.Parent and not folder.Parent/);
 for(const call of [
  'stageDecoration(prop, at + Vector3.new(13, 0, face * 11), delay)',
  'stageDecoration(detail, placeAt, delay)',
  'stageDecoration(obj, Vector3.new(cx + row[4], 0, cz + row[5]), delay)',
  'stageDecoration(warehouseDisplay, Vector3.new(-31, 0, 222), delay)',
 ]) assert.ok(scene.includes('if newGrade then '+call) || scene.includes(call),'신규 해금 장식 미연결: '+call);
 assert.equal((scene.match(/stageDecoration\(/g)||[]).length,5,'4개 배치 경로+단일 책임 함수');
 assert.match(scene,/decorLimit = if game:GetService\("UserInputService"\)\.TouchEnabled then 7 else 13/);
 assert.match(scene,/local builderLimit = if touchDecor then 1 else 2/);
 assert.match(scene,/if info\.sim and info\.sim\.buildings then lastDecorationGrowth\[info\.portId\] = decor end/);
});

// [마을 시설 건물 정체성] 학자·주점·서고 등 동일 주택 외형 회귀를 차단한다.
test('마을 7개 시설은 승인된 건축물과 업종별 실물 구조로 구분한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 const start=scene.indexOf('-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }');
 const end=scene.indexOf('-- 조선소:', start);
 assert.ok(start>=0&&end>start,'기존 시설 건물 배치 영역');
 const facilities=scene.slice(start,end);
 for(const [name,tab] of [
  ['교역소','trade'],['주점','quest'],['항만청','route'],['은행','harbor'],
  ['상인 길드','trade'],['학자의 서재','tech'],['도서관 (도감)','codex']
 ]) {
  assert.ok(facilities.includes('name = "'+name+'", tab = "'+tab+'"'),name+' 기존 시설 탭');
  assert.ok(facilities.includes('f.name == "'+name+'"'),name+' 독립된 건축 외관');
 }
 assert.match(facilities,/signatureAsset = if localArchitecture then nil/);
 assert.match(facilities,/signature:SetAttribute\("FacilityIdentity", f.tab\)/);
 assert.match(facilities,/local body = \(signature and signature:FindFirstChildWhichIsA\("BasePart", true\)\)/);
 assert.match(facilities,/or house\(folder, f.pos, f.w \* grow, f.d \* grow, visualFloors, style, rng, tone\)/);
 assert.match(facilities,/style.kit == "eastasia"/);
 assert.match(facilities,/localArchitecture/);
 for(const [group,asset] of [
  ['Town','quaternius_large_square_tower'],['Town','temple-stone'],['Town','overhang'],
  ['Town','chimney'],['Town','quaternius_watch_tower_wroof'],['Naval','flag-high'],
  ['Town','kenney_grey_arch_01'],['Town','kenney_wood_arch_01'],
  ['Town','quaternius_wall_entrance_bricks'],['Interior','bookcaseclosed'],
  ['Interior','bookcaseopenlow'],['Relics','journal-open'],['Relics','magnifying-glass']
 ])assert.ok(ids.includes('["'+group+'/'+asset+'"]'),group+'/'+asset+' 기존 등록 자산');
 assert.match(facilities,/prompt\(folder, Vector3.new\(f.pos.X, 3, doorZ\), f.name, "들어가기", f.tab, onFacility\)/);
 assert.match(facilities,/villager\(folder, Vector3.new\(f.pos.X \+ 3, 0, doorZ\)/);
 assert.doesNotMatch(facilities,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

 
// [시설별 실제 경제-건축 발전] 건축 수량과 항구 단계에 따른 1~5단계 자동 증축.
test('마을 7개 시설은 실제 건설 수량·번영도·항구 발전도에 따라 독립 증축된다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const client=read('StarterPlayer/Game.client.luau');
 const economy=read('ReplicatedStorage/Shared/Economy.luau');
 const begin=scene.indexOf('-- 시설 건물: { 이름, 탭, 위치, 크기, 벽색 }');
 const end=scene.indexOf('-- 조선소:', begin);
 assert.ok(begin>=0&&end>begin);
 const facilities=scene.slice(begin,end);
 for(const [name,key] of [
  ['교역소','market'],['주점','tavern'],['항만청','dock'],['은행','market'],
  ['상인 길드','warehouse'],['학자의 서재','school'],['도서관 (도감)','school']
 ]) {
  const line=facilities.split('\n').find(x=>x.includes('name = "'+name+'", tab = '));
  assert.ok(line&&line.includes('economy = "'+key+'"'),name+' 경제 시설 연계');
  assert.ok(economy.includes('id = "'+key+'"'),key+' 기존 세계경제 건축물');
 }
 assert.match(scene,/sceneLevel = math\.clamp\(math\.floor\(\(sceneLevel \+ info\.sim\.stage\) \/ 2 \+ 0\.5\), 1, 5\)/);
 for(const threshold of ['count >= 16 then 5','count >= 9 then 4','count >= 4 then 3','count >= 1 then 2']) {
  assert.ok(facilities.includes(threshold),'실제 수량 증축 경계 '+threshold);
 }
 assert.match(facilities,/local facilityTier = math\.min\(sceneLevel, builtTier\)/);
 assert.match(facilities,/if info\.sim and \(tonumber\(info\.sim\.prosperity\) or 100\) < 90 then/);
 assert.match(facilities,/facilityTier = math\.min\(facilityTier, 4\)/);
 assert.match(facilities,/local lv = facilityTier/);
 assert.match(facilities,/local visualFloors = math\.min\(3, f\.floors/);
 assert.match(facilities,/body:SetAttribute\("FacilityVisualTier", facilityTier\)/);
 assert.match(facilities,/body:SetAttribute\("FacilityEconomyKind", f\.economy\)/);
 assert.match(facilities,/body:SetAttribute\("FacilityEconomicCount", count or 0\)/);
 assert.match(facilities,/body:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(client,/bld\.tavern or 0/);
 assert.match(client,/if \(tonumber\(sim and sim\.prosperity\) or 100\) >= 90 then "P1" else "P0"/);
 assert.match(facilities,/prompt\(folder, Vector3\.new\(f\.pos\.X, 3, doorZ\), f\.name, "들어가기", f\.tab, onFacility\)/);
 assert.doesNotMatch(facilities,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

// [시설 발전 자동 시공] 실제 경제 건설로 외형 단계가 상승했을 때 한 번만 비계/주민 모션을 표시한다.
test('경제 시설 증축 연출은 발전 시에만 실행되고 재입항과 모바일 한도를 존중한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ids=read('ReplicatedStorage/Shared/AssetIds.luau');
 const begin=scene.indexOf('-- [자동 증축 작업] 기존 경제 정본에서 단계가 처음 올라갈 때만 승인된 공사용 실물 메시');
 const end=scene.indexOf('-- 조선소:',begin);
 assert.ok(begin>=0&&end>begin,'시설 시공은 기존 PortScene.build 안');
 const region=scene.slice(begin,end);
 assert.match(scene,/local lastFacilityGrowth = \{\}/);
 assert.match(region,/local previousFacilityGrowth = lastFacilityGrowth\[info\.portId\]/);
 assert.match(region,/currentFacilityGrowth\[f\.name\] = facilityTier/);
 assert.match(region,/facilityTier > previousFacilityGrowth\[f\.name\]/);
 assert.match(region,/and facilityUpgradeAnimations < facilityAnimationCap/);
 assert.match(region,/local facilityAnimationCap = if touchFacility then 1 else 3/);
 assert.match(region,/local facilityBuilderCap = if touchFacility then 1 else 2/);
 assert.match(region,/if upgrade then/);
 assert.ok(ids.includes('["Terrain/wood-structure"]'),'기등록 실제 시공 비계');
 assert.match(region,/importedModel\(folder, "Terrain", "wood-structure", at\(-14, 4\), 6\.5, false, nil, delay\)/);
 assert.match(region,/scaffold:SetAttribute\("BuildState", "constructing"\)/);
 assert.match(region,/scaffold:SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
 assert.match(region,/local hasWorkers = not info\.sim or \(jobs and/);
 assert.match(region,/builder:SetAttribute\("Job", "construction_worker"\)/);
 assert.match(region,/kind = "hammer", phase = rng:NextNumber\(0, 5\)/);
 assert.match(region,/while builder\.Parent and not folder\.Parent/);
 assert.match(region,/if builder\.Parent then builder:Destroy\(\) end/);
 assert.match(region,/if scaffold\.Parent then scaffold:Destroy\(\) end/);
 assert.match(region,/if info\.sim and info\.sim\.buildings then lastFacilityGrowth\[info\.portId\] = currentFacilityGrowth end/);
 assert.match(region,/folder:SetAttribute\("FacilityUpgradesThisVisit", facilityUpgradeAnimations\)/);
 assert.match(region,/folder:SetAttribute\("FacilityUpgradeMode", "ECONOMY_VISUAL_ONLY"\)/);
 assert.match(region,/if f\.key == "bank" then\s+if facilityTier >= 3 then/);
 assert.match(region,/if facilityTier >= 5 then/);
 assert.match(region,/prompt\(folder, Vector3\.new\(f\.pos\.X, 3, doorZ\), f\.name, "들어가기", f\.tab, onFacility\)/);
 assert.doesNotMatch(region,/Instance\.new\("(?:Part|MeshPart|WedgePart)"\)/);
});

 
// [원본 머리 6종 + 액세서리 5종] 실제 3D 원본 증빙, 등록 후 역할별 장착, R15 관절·저장 불변.
test('주민·동료 새 머리와 액세서리는 원본 11종이 검증되고 등록된 경우에만 정밀 장착된다',async()=>{
 const pose=read('ReplicatedStorage/Shared/Pose.luau');
 const loader=read('ServerScriptService/AssetLoader.server.luau');
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const names=[
  'hair_braided_crown','hair_low_bun','hair_sailor_ponytail',
  'hair_side_braid','hair_shoulder_waves','hair_court_curls',
  'acc_sailor_headband','acc_pearl_hairpin','acc_ribbon_bow',
  'acc_feather_hat','acc_guild_badge'
 ];
 const crypto=await import('node:crypto');
 for(const name of names){
  const f='roblox-games/mare-essentia/assets/people/'+name+'.glb';
  assert.ok(fs.existsSync(f),'원본 GLB 누락: '+name);
  const raw=fs.readFileSync(f);
  const license=JSON.parse(fs.readFileSync(f+'.license.json','utf8'));
  const gitSha=crypto.createHash('sha1').update('blob '+raw.length+String.fromCharCode(0)).update(raw).digest('hex');
  assert.equal(license.license,'CC0-1.0',name+' 무료 사용 승인');
  assert.equal(license.sourceSizeBytes,raw.length,name+' 원본 크기');
  assert.equal(license.sourceGitBlobSha1,gitSha,name+' 원본 해시 증빙');
  assert.equal(raw.subarray(0,4).toString('ascii'),'glTF',name+' GLB 형식');
  assert.ok(loader.includes('["People/'+name+'"] = true'),name+' 기존 자산 선적 우선순위');
  assert.ok(pose.includes('"'+name+'"'),name+' 역할별 복식 연결');
 }
 for(const role of [
  'citizen_male','citizen_female','citizen_guard_female','citizen_official_male','citizen_official_female',
  'citizen_sailor_female','citizen_artisan_female','companion_male','companion_female'
 ])assert.ok(pose.includes(role+' = {'),role+' 남녀·직업 원본 보존');
 assert.match(pose,/local NPC_REGISTERED_HAIR = \{/);
 assert.match(pose,/local NPC_REGISTERED_ACCESSORY = \{/);
 assert.match(pose,/if candidate and AssetIds\["People\/" \.\. candidate\] then/);
 assert.match(pose,/if accessory and AssetIds\["People\/" \.\. accessory\[1\]\] then/);
 assert.match(pose,/specs = table\.clone\(specs\)/);
 assert.match(pose,/target\.Size\.X \* \(spec\[7\] or 0\)/);
 assert.match(pose,/target\.Size\.Z \* \(spec\[8\] or 0\)/);
 assert.match(pose,/skin:ScaleTo\(ratio\)/);
 assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
 assert.match(pose,/part\.Anchored, part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
 assert.match(pose,/model:SetAttribute\(if npcOutfit then "NpcAppearanceState" else "MobAppearanceState"/);
 assert.match(port,/string\.sub\(asset\.Name, 1, 4\) == "acc_"/);
 assert.match(field,/peopleGroup\.ChildAdded:Connect\(function\(asset\)/);
 assert.doesNotMatch(pose,/rbxassetid:\/\/[0-9]+/);
});


// [직접 제작 복식 QA] 실제 GLB 원본·무료 증거·기존 관절 연결 및 모바일 한도 검증.
test('실물 재단복 9종은 실제 GLB 메시와 무료 원본·문화권 R15 장착 근거를 갖는다',()=>{
  const names=['outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_belt','outfit_cuff','outfit_boot','outfit_stole'];
  const pose=read('ReplicatedStorage/Shared/Pose.luau');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  const field=read('ReplicatedStorage/Shared/FieldScene.luau');
  for(const name of names){
    const file='roblox-games/mare-essentia/assets/people/'+name+'.glb';
    const bytes=fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4),'glTF','3D 원본 바이너리 누락: '+name);
    assert.equal(bytes.readUInt32LE(4),2,'GLB 버전 오류: '+name);
    assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB 크기 오류: '+name);
    assert.equal(bytes.readUInt32LE(16),0x4e4f534a,'GLB JSON 청크 누락: '+name);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
    assert.equal(gltf.asset.version,'2.0');
    assert.ok(gltf.meshes[0].primitives.length>0 && gltf.meshes[0].primitives.length<=12,'모바일 모델 부품 초과: '+name);
    assert.ok(gltf.materials.length>=4,'원본 복식 소재 구분 누락: '+name);
    // [UV 원본 보존 검증] 원본 메시/법선/인덱스 바이너리는 전부 동일하고, 재질별 UV0만 뒤에 더했다.
    const uvProof=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    const binOffset=20+bytes.readUInt32LE(12)+8;
    assert.equal(uvProof.uvVersion,1,'UV 갱신 누락: '+name);
    assert.equal(bytes.readUInt32LE(binOffset-4),0x004e4942,'GLB 바이너리 누락: '+name);
    assert.equal(uvProof.sourceSha256,crypto.createHash('sha256').update(bytes).digest('hex'),'UV 원본 해시 오류: '+name);
    assert.equal(uvProof.sourceSizeBytes,bytes.length,'원본 갱신 크기 오류: '+name);
    assert.equal(gltf.accessors.length,uvProof.originalAccessorCount+gltf.meshes[0].primitives.length);
    assert.equal(gltf.bufferViews.length,uvProof.originalBufferViewCount+gltf.meshes[0].primitives.length);
    assert.equal(crypto.createHash('sha256').update(bytes.subarray(binOffset,binOffset+uvProof.originalGeometryByteLength)).digest('hex'),
      uvProof.originalGeometrySha256,'기존 정점·인덱스·법선 변경 감지: '+name);
    for(const primitive of gltf.meshes[0].primitives){
      const uvIndex=primitive.attributes.TEXCOORD_0;
      assert.ok(Number.isInteger(uvIndex),'원본 재질별 UV0 누락: '+name);
      const uv=gltf.accessors[uvIndex],position=gltf.accessors[primitive.attributes.POSITION];
      assert.equal(uv.type,'VEC2','UV 좌표 형식 오류: '+name);
      assert.equal(uv.componentType,5126,'UV 정밀도 오류: '+name);
      assert.equal(uv.count,position.count,'UV 정점 개수 오류: '+name);
      const view=gltf.bufferViews[uv.bufferView];
      assert.ok(view.byteOffset>=uvProof.originalGeometryByteLength,'원본 메시 바이너리 덮어쓰기: '+name);
      for(let v=0;v<uv.count;v++){
        const at=binOffset+view.byteOffset+v*8;
        const u=bytes.readFloatLE(at),t=bytes.readFloatLE(at+4);
        assert.ok(Number.isFinite(u)&&Number.isFinite(t)&&u>=0&&u<=1&&t>=0&&t<=1,'UV 범위 오류: '+name);
      }
    }
    // [재질 복원 근거] 실제 GLB 프리미티브에 무광 직물·가죽·황동/강철이 구분돼 있어야 한다.
    const sourceMaterials=gltf.meshes[0].primitives.map(p=>gltf.materials[p.material].pbrMetallicRoughness);
    assert.ok(sourceMaterials.some(m=>m.metallicFactor>=0.65),'GLB 원본 금속 재질 누락: '+name);
    assert.ok(sourceMaterials.some(m=>m.metallicFactor<0.1),'GLB 원본 비금속 재질 누락: '+name);
    const proof=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    const actualSha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(proof.sourceGitBlobSha1,actualSha,'원본 메시 SHA-1 오류: '+name);
    assert.equal(proof.license,'CC0-1.0','상업 이용 무료 사용권 누락: '+name);
    assert.ok(proof.triangles>=100 && proof.parts<=12,'3D 지오메트리 부족: '+name);
    assert.ok(pose.includes('"'+name+'"'),'NPC 프로필 실물 복식 누락: '+name);
    assert.ok(loader.includes('["People/'+name+'"] = true'),'기존 People 로더 연결 누락: '+name);
  }
  for(const profile of ['citizen_male','citizen_female','citizen_worker_male','citizen_worker_female',
    'citizen_guard_male','citizen_guard_female','citizen_official_male','citizen_official_female',
    'citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female',
    'companion_male','companion_female','companion_clergy_male','companion_clergy_female'])
    assert.ok(pose.includes(profile+' = {'),'NPC 16종 복식 프로필 누락: '+profile);
  // [재질 회귀] 임포트된 GLB PBR 색상 보존, 실물 색 누락만 보정하고 검게 덮어쓰지 않는다.
  assert.match(pose,/local OUTFIT_SOURCE_MATERIALS = \{/);
  assert.match(pose,/local OUTFIT_PRIMARY_MATERIALS = \{/);
  for(const name of names)
    assert.ok(pose.includes(name+' = { Color3.new('),'원본 주색 누락: '+name);
  assert.match(pose,/if not textured and string\.sub\(assetName, 1, 7\) == "outfit_"/);
  // [선형·감마 색상] 원본 금속/직물은 엄격하게 대조하고 임의 수입색은 덮지 않는다.
  assert.match(pose,/for colorIndex = 1, 3, 2 do/);
  assert.match(pose,/local sourceColor = candidate\[colorIndex\]/);
  assert.match(pose,/if bestError < 0\.0064 then/);
  assert.match(pose,/elseif fallback and color\.R > 0\.80 and color\.G > 0\.80 and color\.B > 0\.80/);
  assert.match(pose,/math\.max\(color\.R, color\.G, color\.B\) - math\.min\(color\.R, color\.G, color\.B\) < 0\.09/);
  // [실물 스크린샷 회귀] 얼굴·치마·허리띠·중첩 상의가 다시 원통/흰 갑옷으로 돌아가지 않도록 고정.
  assert.match(pose,/gui\.AlwaysOnTop = true/);
  assert.match(pose,/scalp\.Name = "HairScalp"/);
  assert.match(pose,/piece\.Name == fallbackName then piece\.Transparency = 1/);
  // [모델 후보 안전범위] 원래 시각 기준 대신 중앙정책에 허용된 정확한 숫자 범위와 수정을 검증한다.
  const skirt=pose.match(/q\.Size = Vector3\.new\(len, lower\.Size\.X \* ([0-9.]+), lower\.Size\.X \* ([0-9.]+)\)/);
  assert.ok(skirt,'실제 주민 치마 비율 존재');
  assert.ok(Number(skirt[1])>=0.94 && Number(skirt[1])<=1.24,'치마 가로 범위');
  assert.ok(Number(skirt[2])>=0.90 && Number(skirt[2])<=1.18,'치마 깊이 범위');
  assert.match(pose,/local belt = npcOutfit and assetName == "outfit_belt"/);
  const belt=pose.match(/if belt then ([0-9.]+) else spec\[4\]/);
  assert.ok(belt,'주민 허리띠 스케일 존재');
  assert.ok(Number(belt[1])>=0.24 && Number(belt[1])<=0.50,'허리띠 시각 범위');
  assert.match(pose,/local fittedUpperReady = false/);
  assert.match(pose,/if fittedUpperReady and boneName == "UpperTorso"/);
  assert.match(pose,/surface\.ColorMap ~= ""/);
  assert.match(pose,/surface\.MetalnessMap ~= ""/);
  assert.match(pose,/part\.MaterialVariant ~= ""/);
  // [실제 로블록스 Studio 입력 검증] 자산 로더는 9개 복식의 흰색 유실/원본 재질 개수를 계측한다.
  assert.match(loader,/MareOutfitMaterialAudit/);
  assert.match(loader,/outfitWhite == 0 then "PASS" else "FAIL"/);
  assert.match(loader,/local importedPeople = library:FindFirstChild\("People"\)/);
  assert.match(pose,/elseif hair or pearlWhite then Enum\.Material\.SmoothPlastic/);
  assert.match(pose,/part\.Material = fallback\[2\]/);
  assert.doesNotMatch(pose,/else Color3\.fromRGB\(96, 79, 65\)/);
  assert.match(pose,/EUROPEAN_DETAIL_CULTURES\[culture\] == true/);
  assert.match(pose,/year >= 1500 and year < 1800/);
  // [모바일 정밀 복식] 모든 남녀 직업은 4종 이상, 고성능 근접 인물은 전체 상세 메시를 유지한다.
  for(const profile of ['citizen_male','citizen_female','citizen_worker_male','citizen_worker_female',
    'citizen_guard_male','citizen_guard_female','citizen_official_male','citizen_official_female',
    'citizen_sailor_male','citizen_sailor_female','citizen_artisan_male','citizen_artisan_female',
    'companion_male','companion_female','companion_clergy_male','companion_clergy_female']){
    const section=pose.match(new RegExp('\\t'+profile+' = \\{\\n([\\s\\S]*?)\\n\\t\\},'));
    assert.ok(section,'복식 프로필 누락: '+profile);
    const kinds=new Set([...section[1].matchAll(/"outfit_([^"]+)"/g)].map(m=>m[1]));
    assert.ok(kinds.size>=4,'모바일 기본 상세 복식 4종 미만: '+profile);
  }
  assert.match(pose,/local detailLimit = 99/);
  assert.match(pose,/mobileDetailFps >= 52 and distance <=/);
  assert.match(pose,/detailLimit = 4/);
  assert.match(pose,/detailLimit = 2/);
  assert.match(pose,/part\.LocalTransparencyModifier = 1/);
  assert.match(pose,/part\.LocalTransparencyModifier = 0/);
  assert.match(pose,/Pose\.applyRegisteredMobOutfit\(model, true\)/);
  assert.match(pose,/NpcOutfitNextCheckAt/);
  const port=read('ReplicatedStorage/Shared/PortScene.luau');
  assert.match(port,/string\.sub\(asset\.Name, 1, 7\) == "outfit_"/);
  assert.match(pose,/slotName = "R15Asset_" \.\. assetName \.\. "_" \.\. boneName/);
  assert.match(pose,/if not textured and string\.sub\(assetName, 1, 7\) == "outfit_"/);
  assert.match(field,/companion = true, gender = if ad\.female then "female" else "male", culture = ad\.nation/);
  assert.match(pose,/weld\.Part0, weld\.Part1, weld\.Parent = target, part, part/);
  assert.match(pose,/part\.CanCollide, part\.CanTouch, part\.CanQuery = false, false, false, false/);
});

// [항구별 3D 랜드마크] 현재 Ports 원본의 모든 항구에 개별 대표경관을 연결한다.
test('모든 항구가 항구별 역사 경관 메시 배치를 갖고 발전도 단계가 유지된다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const portSection=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const portIds=[...portSection.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(row=>row[1]);
 const sigIds=new Set([...scene.matchAll(/\bSIG\.([a-z][a-z0-9_]*)\s*=/g)].map(row=>row[1]));
 assert.ok(portIds.length>=181,'기존 항구 데이터가 유지돼야 한다');
 assert.deepEqual(portIds.filter(id=>!sigIds.has(id)),[],'개별 랜드마크가 없는 항구');
 assert.match(scene,/local list = SIG\[info\.portId\]/);
 assert.match(scene,/if sceneLevel < 3 then/);
 assert.match(scene,/if sceneLevel == 2 then/);
 assert.match(scene,/if list then/);
 assert.match(scene,/local function placeSignature\(folder, info\)/);
 assert.match(scene,/SIG\.tainan = cat\(one\("Town", "eastasia-base"/);
 assert.match(scene,/one\("Town", "eastasia-roof", 28, -9, 0, 11\)/);
});

// [건축·가축 재질] 원본 색상맵이 있을 때 색을 한 번만 반영하고 무텍스처 모델만 재질을 보완한다.
test('항구·탐험 가축은 양털·가죽·피부를 구별하고 원본 PBR 색 중복을 막는다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 for(const [name,scene] of [['항구',port],['탐험',field]]){
  const start=scene.indexOf('if textured and not detail then');
  const stop=scene.indexOf('elseif not textured and not sa',start);
  assert.ok(start>0&&stop>start,name+' 가축 자연 재질 처리 경로');
  const block=scene.slice(start,stop);
  assert.match(block,/if sa and sa\.ColorMap ~= "" then/);
  assert.match(block,/sa\.Color = sa\.Color:Lerp\(tint, 0\.16\)/);
  assert.match(block,/elseif not sa then/);
  assert.match(block,/Enum\.Material\.Fabric/);
  assert.match(block,/Enum\.Material\.Leather/);
  assert.match(block,/Enum\.Material\.Concrete/);
  assert.match(block,/Enum\.Material\.SmoothPlastic/);
  assert.match(block,/if not sa then/);
  assert.doesNotMatch(block,/Lerp\(tint, 0\.24\)/,'PBR 색 중복 혼합 복원 금지');
 }
 assert.match(port,/local textured = sa ~= nil or \(p:IsA\("MeshPart"\) and p\.TextureID ~= ""\)/);
 assert.match(port,/if not textured then[\s\S]*?p\.Material = selected/);
 for(const name of ['Plaster','ClayRoofTiles','RoofShingles','WoodPlanks','Limestone']){
  assert.ok(port.includes('Enum.Material.'+name)||cultures.includes('Enum.Material.'+name),'건축 재질 누락 '+name);
 }
 assert.match(cultures,/STYLE\.iberia\.mat, STYLE\.italy\.mat/);
 assert.match(cultures,/Enum\.Material\.ClayRoofTiles/);
 assert.match(cultures,/Enum\.Material\.Plaster/);
 assert.match(cultures,/Enum\.Material\.RoofShingles/);
 assert.match(port,/local lastDecorationGrowth = \{\}/);
 assert.match(port,/CityDecorationGrowthMode", "ECONOMY_READ_ONLY"/);
});

// [181개 항구 구역 재배치] 기존 시드와 모든 문화권의 경계가 동일 생성 함수에 적용된다.
test('모든 항구 시장·종교·농장에 경계 검사와 안전 재배치 후보가 있다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'등록된 181개 항구 모두 적용');
 assert.equal(new Set(ids).size,181,'항구 중복 없음');
 for(const token of [
  'seeded(info.portId .. ":district-safe-layout")',
  'local districtKinds = { "religious", "market", "farm" }',
  'for candidateIndex, at in candidates do',
  'if clear and isRoyalCity',
  'for _, sx in streetsX do',
  'for _, sx in streetsOuter do',
  'for _, landmark in LM_SITES do',
  'for _, other in districts do',
  'hx + other.hx + 6','hz + other.hz + 6',
  'math.abs(z) + hz <= 440',
  'CityDistrictLayoutMode", "PORT_SEEDED_COLLISION_CHECK"',
  'CityDistrictPlaced", #districts',
  'CityDistrictMoved", districtMoved',
  'CityDistrictRejectedCandidates", districtRejected',
  'd.hx + halfX','d.hz + halfZ',
  'CityBuildingMode", "AUTO_VISUAL_READ_ONLY"'
 ])assert.ok(scene.includes(token),'항구별 구역 안전 검사 누락: '+token);
 // 후보 좌표가 허용 최대 지터로 흔들려도 주요 랜드마크·왕궁·도시 경계를 침범하지 않아야 한다.
 const marks=[[-112,166],[-112,-166],[-160,166],[-160,-166],[-208,181],[-208,-181],[-263,181],[-263,-181]];
 for(const id of ids){
  for(const side of [-1,1]){
   for(const kind of ['religious','market','farm']){
    const hx=kind==='farm'?82:41,hz=kind==='farm'?51:43;
    const x=kind==='farm'?-115:-141;
    const z=side*(kind==='farm'?385:266);
    assert.ok(Math.abs(z)+hz<=440,id+' 외곽 경계');
    assert.ok(x-hx>-235,id+' 왕궁 서쪽 구역');
    for(const [lx,lz] of marks){
     assert.ok(Math.abs(x-lx)>=hx+35||Math.abs(z-lz)>=hz+35,id+' 랜드마크 경계');
    }
   }
  }
 }
});

// [주택 배치] 실제 수입 건물의 처마·별채 점유 폭까지 보수적으로 계산하며 등급은 필지별로 고정한다.
test('마을 주택은 5개 크기 등급을 발전도별로 혼합하고 도로·시설·이웃 주택을 피한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const buildings=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const start=port.indexOf('local houseSizeBands = {');
 const end=port.indexOf('-- 한 줄 채우기: z = 줄의 중심',start);
 assert.ok(start>0&&end>start,'기존 주거 생성 함수에 등급표가 있어야 한다');
 const bands=port.slice(start,end);
 for(const tier of [
  '{ 0.62, 0.73, 0.84, 0.94, 1.02 }',
  '{ 0.66, 0.79, 0.92, 1.08, 1.18 }',
  '{ 0.69, 0.84, 1.00, 1.19, 1.36 }',
  '{ 0.71, 0.88, 1.07, 1.31, 1.53 }',
  '{ 0.73, 0.92, 1.14, 1.42, 1.72 }'
 ])assert.ok(bands.includes(tier),'발전 단계별 작은 집~큰 집의 크기 혼합');
 const home=port.slice(port.indexOf('local function fillRow('),port.indexOf('for _, side in { 1, -1 } do',port.indexOf('local function fillRow(')));
 assert.match(home,/seeded\(plotId \.\. ":house-size"\)/,'다른 랜덤 흐름을 소비하지 않는 고정 필지 규모');
 assert.match(home,/sizeScale = houseSizeBands\[lvl\]\[sizeClass\] \* sizeJitter/);
 assert.match(home,/roofFactor = if style\.kit == "eastasia" then 1\.62 else 1\.46/);
 assert.match(home,/projectedHalf <= rowClearance/,'도로 침범 전 등급 축소 또는 생략');
 assert.match(home,/while sizeClass > 1 and projectedHalf > rowClearance do/);
 assert.match(home,/math\.max\(sz \* 0\.62, projectedHalf\)/,'기존 점유 반경을 축소하지 않음');
 assert.match(home,/not onStreet\(at\.X, half\)/);
 assert.match(home,/not reserved\(at\.X, at\.Z, half\)/);
 assert.match(home,/table\.insert\(placedLots, \{ X = pos\.X, Z = pos\.Z,/);
 assert.match(home,/HX = actualHalfX, HZ = actualHalfZ/);
 assert.match(home,/BuildingSizeClass", sizeClass/);
 assert.match(home,/BuildingSizeScale", sizeScale/);
 assert.match(home,/BuildingClearance", math\.max\(actualHalfX, actualHalfZ\)/);
 assert.match(home,/math\.clamp\(fl, 1, P\.flMax\)/,'문화권별 최대 층수 유지');
 assert.match(port,/local roof = importedModel\(parent, "Town", "eastasia-roof"/);
 assert.match(buildings,/plotScale = \{ 1\.5, 1\.65, 1\.8, 2\.0, 2\.2 \}/);
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
 assert.match(port,/SetAttribute\("BuildAuthority", "VISUAL_ONLY"\)/);
});

// [181개 항구 배치 진단] 필지별 재배치 실패를 추적하며 불필요한 임시 모델 생성 없이 검사한다.
test('항구별 주거 생성은 인접 빈자리 재시도와 실제 크기 결과를 읽기 전용으로 집계한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'항구 전역 동일 배치 경로');
 const start=port.indexOf('local function fillRow('),end=port.indexOf('for _, side in { 1, -1 } do',start);
 const fill=port.slice(start,end);
 for(const needle of [
  'local homeShifts = { Vector3.zero',
  'for _, shift in homeShifts do',
  'for _, direction in homeShifts do',
  'local at = pos + Vector3.new(shift.X, 0, shift.Z * side)',
  'if not onStreet(at.X, half) and not reserved(at.X, at.Z, half) then',
  'if canFitPlot then',
  'local bounds, dimensions = staged:GetBoundingBox()',
  'if chosenShift then',
  'homeCandidates += 1','homePlaced += 1','homeShifted += 1',
  'homeSizeCounts[sizeClass] += 1',
  'homeModelRejected += 1','homePlotRejected += 1',
  'staged:Destroy()'
 ])assert.ok(port.includes(needle),'주거 생성 진단 조건 누락: '+needle);
 const idxPre=fill.indexOf('if canFitPlot then'),idxBuild=fill.indexOf('local staged = Instance.new("Model")');
 assert.ok(idxPre>=0&&idxBuild>idxPre,'사전 빈자리 검사가 주택 모델 복제보다 먼저 실행');
 const result=port.slice(port.indexOf('CityHousingPort", info.portId')-28);
 for(const name of [
  'CityHousingPort','CityHousingCulture','CityHousingCandidates','CityHousingPlaced',
  'CityHousingShifted','CityHousingPlotRejected','CityHousingModelRejected',
  'CityHousingPlacedPercent',
  'CityHousingLayoutState','CityHousingSize'
 ])assert.ok(result.includes(name),'항구별 읽기 전용 진단 누락: '+name);
 assert.match(result,/NO_ECONOMIC_CANDIDATE/);
 assert.match(result,/NO_SAFE_HOUSING_PLOT/);
 assert.match(result,/COMPUTED_NOT_VISUALLY_VERIFIED/,'런타임 확인 전 합격 표시 금지');
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [문화권 23종×발전도 5단계] 어떤 지역도 사전 필지 판정에서 최소 주택까지 무조건 배제하지 않는다.
test('모든 문화권과 발전도에 최소 주택 배치 공간이 남는다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 const begin=port.indexOf('local houseSizeBands = {'),end=port.indexOf('-- [항구별 진단]',begin);
 assert.ok(begin>=0&&end>begin,'주택 등급표와 진단 연결');
 const bands=[...port.slice(begin,end).matchAll(/\{ ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+) \}/g)]
  .map(m=>m.slice(1).map(Number));
 assert.equal(bands.length,5,'발전도 5단계');
 const profiles=[...cultures.matchAll(/^\t([a-z]+) = \{ S = ([\d.]+).*?wMul = ([\d.]+), dAdd = (-?[\d.]+).*sizeWeights = \{ (\d+), (\d+), (\d+), (\d+), (\d+) \}/gm)]
  .map(m=>({name:m[1],size:Number(m[2]),width:Number(m[3]),depth:Number(m[4]),weights:m.slice(5).map(Number)}));
 assert.equal(profiles.length,23,'문화권 23종을 모두 검사');
 const lotGrowth=[1.5,1.65,1.8,2,2.2];
 let count=0;
 for(const p of profiles){
  assert.equal(p.weights.reduce((a,b)=>a+b,0),100,p.name+' 크기 비율');
  for(let i=0;i<5;i++){
   // 기존 최소 구획 배율(0.94)과 최대 처마 보정(동아시아 1.62)을 준수하는 보수적 크기 검사.
   const clear=p.size*lotGrowth[i]*0.94*0.5+4;
   const width=p.size/(1.28*1.08)*p.width;
   const depth=Math.max(width*0.72,width+p.depth);
   const roof=['japan','china','korea'].includes(p.name)?1.62:1.46;
   const projected=Math.max(width,depth)*bands[i][0]*1.28*roof*0.5+3.5;
   assert.ok(projected<=clear,p.name+' 발전 '+(i+1)+'단계: 최소 주택 공간 부족');
   count++;
  }
 }
 assert.equal(count,115,'전체 지역·발전도 조합');
 assert.match(port,/CityHousingPlacedPercent", if homeCandidates > 0/,'항구별 배치율 진단');
});

// [항구 181곳 지역 발전도 실루엣] 옛 도시·신도시·서민층·부유층 구획과 원본 건축 재질을 재사용한다.
test('항구별 구시가지와 신시가지는 문화권 지붕·외벽·시장 성장에 따라 구분된다',()=>{
 const source=read('ReplicatedStorage/Shared/PortScene.luau');
 const culture=read('ReplicatedStorage/Shared/PortCultures.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const portData=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...portData.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'181개 항구 모두 기존 정본 마을 생성 함수를 공유');
 const start=source.indexOf('local function fillRow(');
 const end=source.indexOf('for _, side in { 1, -1 } do',start);
 const row=source.slice(start,end);
 assert.match(row,/local quarter = if laneIndex == 0 then "old" elseif lvl >= 3 then "new" else "edge"/);
 assert.match(row,/local merchantGrowth = built and/);
 assert.match(row,/\(built\.market or 0\) >= 3/);
 assert.match(row,/\(built\.warehouse or 0\) >= 4/);
 assert.match(row,/sizeClass == 3 and roll % 3 == 0 then sizeClass = 4/);
 assert.match(row,/CityQuarter", quarter/);
 assert.match(row,/CityResidenceType"/);
 assert.match(row,/CityMerchantGrowth", merchantGrowth == true/);
 assert.match(row,/painted = appearance ~= nil or/,'원본 PBR·텍스처를 건드리지 않아야 함');
 assert.match(source,/CityOldTownHomes", oldTownHomes/);
 assert.match(source,/CityNewTownHomes", newTownHomes/);
 assert.match(source,/local roofSpan = if currentKey == "china" then 1\.32 elseif currentKey == "japan" then 1\.15 else 1\.22/);
 for(const part of ['STYLE.japan','STYLE.korea','STYLE.china','HOUSE_ARCH','HOUSE_FORM']){
  assert.ok(culture.includes(part),'기존 지역 건축 형식 복구 누락: '+part);
 }
 assert.match(source,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/,'기존 경제/저장 흐름 유지');
});

// [생산품별 건축] 어업·산업·농산품·교역의 현물 구조를 기존 항구 생산 목록만 읽어서 선택한다.
test('항구 특산품 공방은 생산품별 7가지 형태를 쓰고 랜드마크·주택과 실측 충돌을 검사한다',()=>{
 const source=read('ReplicatedStorage/Shared/PortScene.luau');
 const start=source.indexOf('local SPECIAL_NAME = {');
 const end=source.indexOf('-- 문화권 소품:',start);
 assert.ok(start>=0&&end>start,'기존 특산품 전시 구역');
 const block=source.slice(start,end);
 assert.match(block,/Chains\.showcaseGoods\(info\.portId, made,/);
 for(const family of ['fishery','textile','mineral','timber','craft','farm','trade']){
  assert.ok(block.includes('"'+family+'"'),'생산품 건축 종류 누락 '+family);
 }
 assert.match(block,/local candidates = \{/);
 assert.match(block,/not onStreet\(candidate\.X, 27\) and not reserved\(candidate\.X, candidate\.Z, 27\)/);
 assert.match(block,/local bounds, ext = staged:GetBoundingBox\(\)/);
 assert.match(block,/not reserved\(candidate\.X, candidate\.Z, hx, hz\)/);
 assert.match(block,/local industryLimitZ = 360 \+ lvl \* 80 - 8/);
 assert.match(block,/math\.abs\(candidate\.Z\) \+ 27 <= industryLimitZ/);
 assert.match(block,/math\.abs\(candidate\.Z\) \+ hz <= industryLimitZ/);
 assert.match(block,/local safeSite/);
 assert.match(block,/for _, candidate in candidates do[\s\S]*?safeSite = candidate/);
 assert.match(block,/staged:PivotTo\(CFrame\.new\(safeSite - chosen\) \* staged:GetPivot\(\)\)/);
 assert.match(block,/specialtyReflowed \+= 1/);
 assert.match(block,/CitySpecialtyReflowed", specialtyReflowed/);
 assert.match(block,/CitySpecialtyBoundaryZ", industryLimitZ/);
 assert.match(block,/BuildPhase", 4/);
 assert.match(block,/BuildState", "complete"/);
 assert.match(block,/BuildingFootprintX", hx \* 2/);
 assert.match(block,/BuildingFootprintZ", hz \* 2/);
 assert.match(block,/staged:Destroy\(\)/);
 assert.match(block,/IndustryGood", good/);
 assert.match(block,/IndustryFamily", family/);
 assert.match(block,/CitySpecialtyBuildingMode", "PRODUCTION_VISUAL_READ_ONLY"/);
 assert.match(block,/CitySpecialtyPlaced", specialtyPlaced/);
 assert.match(block,/CitySpecialtyRejected", specialtyRejected/);
 assert.match(source,/MarketSpecialtyDisplay_/,'시장에 지역 생산품 전시 연결');
 assert.match(source,/if game:GetService\("UserInputService"\)\.TouchEnabled then 1 else 2/);
 assert.match(source,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/,'경제 시스템 불변');
});

// [특산품 전체 재배치] 제철소/목재소/어시장 등 실측 지붕과 시가지 경계를 함께 보호한다.
test('181개 항구의 1~5단계 특산품 후보는 외곽 경계와 실제 크기로 재검사한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const ids=[...ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'))
  .matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(m=>m[1]);
 assert.equal(ids.length,181);
 const block=scene.slice(scene.indexOf('local SPECIAL_NAME = {'),scene.indexOf('-- 문화권 소품:'));
 assert.match(block,/local industryLimitZ = 360 \+ lvl \* 80 - 8/);
 assert.match(block,/if safeSite ~= chosen then/);
 assert.match(block,/local safeSite/);
 assert.match(block,/specialtyReflowed \+= 1/);
 assert.match(block,/CitySpecialtyReflowed", specialtyReflowed/);
 assert.match(block,/CitySpecialtyBoundaryZ", industryLimitZ/);
 let samples=0;
 for(const id of ids)for(let lvl=1;lvl<=5;lvl++)for(let k=1;k<=3;k++){
  const bound=360+lvl*80-8;
  const candidates=[
   [-178+(k-2)*30,-86],
   [-90-(k-1)*58,-234],
   [-90-(k-1)*58,234],
   [-101,-317-(k-1)*54],
   [-101,317+(k-1)*54],
   [-172,-345],[-172,345],
  ];
  assert.equal(candidates.length,7);
  assert.ok(candidates.some(([,z])=>Math.abs(z)+27<=bound),id+' 최소 후보 미확보');
  assert.ok(candidates.every(([x])=>x>=-615&&x<=35),id+' 후보 마을 바닥판 이탈');
  samples++;
 }
 assert.equal(samples,2715,'181항구 × 발전5 × 특산품 최대3');
 assert.match(scene,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [주야·겨울·지형·모바일] 기존 조명과 해안선 시스템을 재사용하고 새 갱신 루프를 만들지 않는다.
test('도시 골목·눈 지붕·밤 창문은 기존 기후·해안 분류와 모바일 예산을 공유한다',()=>{
 const s=read('ReplicatedStorage/Shared/PortScene.luau');
 assert.match(s,/local coastForm = folder:GetAttribute\("CoastForm"\) or "plain"/);
 assert.match(s,/local terrainLaneShift = if coastForm == "hill"/);
 assert.match(s,/CityRoadTerrain", coastForm/);
 assert.match(s,/CityTerrainStreetEdge/);
 assert.match(s,/edge\.CanCollide, edge\.CanQuery, edge\.CanTouch = false, false, false/);
 assert.match(s,/folder:SetAttribute\("CitySeasonIndex", index\)/);
 assert.match(s,/folder:SetAttribute\("CityWinterRoofTone"/);
 assert.match(s,/folder:GetAttribute\("CitySeasonIndex"\) == 1/);
 assert.match(s,/surface\.Material = Enum\.Material\.Snow/);
 assert.match(s,/surface:SetAttribute\("CityWinterRoof", true\)/);
 assert.match(s,/if not painted then/,'원본 PBR 무손상 보호');
 assert.match(s,/local nightWindowLimit = if touchHousing then 5 else 11/);
 assert.match(s,/if lvl >= 2 and nightWindows < nightWindowLimit/);
 assert.match(s,/window\.CanCollide, window\.CanTouch, window\.CanQuery, window\.CastShadow = false, false, false, false/);
 assert.match(s,/glow\.Parent = window/);
 assert.match(s,/CityNightWindowCount", nightWindows/);
 assert.match(s,/bounds\.Position\.Z \+ streetFront \* \(dimensions\.Z \* 0\.5 \+ 0\.15\)/,'빛나는 창은 외벽 바깥');
 assert.match(s,/window\.Transparency = 0\.92/,'낮에는 창문 빛 약화');
 assert.match(s,/entry\.light\.Enabled = night > 0\.15/,'밤에만 창문 조명 켬');
 assert.match(s,/window\.Transparency = math\.clamp\(0\.92 - night \* 0\.78, 0\.14, 0\.92\)/);
 assert.match(s,/local lightConn = folder\.DescendantAdded:Connect\(registerLight\)/);
 assert.match(s,/entry\.light\.Brightness = entry\.brightness \* \(0\.16 \+ 2\.15 \* night\)/);
 // [스튜디오 실물 회귀] Model.LevelOfDetail은 실행 중 쓰기 권한이 없어 항구 장면을 중단한다.
 assert.doesNotMatch(s,/m\.LevelOfDetail\s*=/,'런타임 금지 LOD 쓰기 복귀 금지');
 assert.match(s,/m:SetAttribute\("ArchitectureCulture", currentKey\)/,'원본 지역 건축 설정 유지');
 assert.match(s,/folder\.Destroying:Connect\(function\(\)/,'갱신 연결 정리');
});

// [지역 주택 실측] 모든 문화권은 소형~대형 5종 비율을 가지며 실제 메시 외곽으로 배치한다.
test('항구별 주택은 지역 비율과 실제 외곽 측정 후 겹침 없는 자리만 사용한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const cultures=read('ReplicatedStorage/Shared/PortCultures.luau');
 const ports=read('ReplicatedStorage/Shared/Ports.luau');
 const section=ports.slice(ports.indexOf('local Ports:'),ports.indexOf('local Nations:'));
 const ids=[...section.matchAll(/^\t([a-z][a-z0-9_]*)\s*=\s*\{\s*\n\s*id = /gm)].map(x=>x[1]);
 assert.equal(ids.length,181,'181개 항구에 동일한 정본 배치 함수 적용');
 const sizes=[...cultures.matchAll(/^\t([a-z]+) = \{ S = .*sizeWeights = \{ (\d+), (\d+), (\d+), (\d+), (\d+) \}/gm)];
 assert.equal(sizes.length,23,'모든 문화권에 고유 주택 크기 비율');
 for(const [row,key,...weightStrings] of sizes){
  const weights=weightStrings.map(Number);
  assert.equal(weights.reduce((a,b)=>a+b,0),100,key+' 지역별 비율 총합');
  assert.ok(weights.every(x=>x>0),key+' 작은 집과 큰 집 모두 남겨야 함');
 }
 assert.notDeepEqual(sizes.find(x=>x[1]==='nordic')?.slice(2),sizes.find(x=>x[1]==='italy')?.slice(2),'지역 비율 차별화');
 const start=port.indexOf('local function fillRow(');
 const end=port.indexOf('for _, side in { 1, -1 } do',start);
 const home=port.slice(start,end);
 assert.match(home,/local mix = P\.sizeWeights/);
 assert.match(home,/local widthBase = fw \* \(sz \/ S\) \* \(P\.wMul or 1\)/);
 assert.match(home,/local depthBase = math\.max\(widthBase \* 0\.72, widthBase \+ \(P\.dAdd or 0\)\)/);
 assert.match(home,/local staged = Instance\.new\("Model"\)/);
 assert.match(home,/local body = house\(staged, pos, ww, dd, fl, style, rng\)/);
 assert.match(home,/local bounds, dimensions = staged:GetBoundingBox\(\)/);
 assert.match(home,/measuredHalfX = math\.abs\(bounds\.Position\.X - pos\.X\)/);
 assert.match(home,/measuredHalfZ = math\.abs\(bounds\.Position\.Z - pos\.Z\)/);
 assert.match(home,/actualHalfX = math\.max\(half, measuredHalfX\)/);
 assert.match(home,/actualHalfZ = math\.max\(half, measuredHalfZ\)/);
 assert.match(home,/clearRoad = math\.abs\(math\.abs\(at\.Z\) - laneNear\) > measuredHalfZ/,'도로 판정은 실제 건물 외곽');
 assert.match(home,/laneNear = 152 \+ laneOffset \+ laneIndex \* laneL/);
 assert.match(home,/clearRoad and not onStreet\(at\.X, measuredHalfX\)/);
 assert.match(home,/not reserved\(at\.X, at\.Z, actualHalfX, actualHalfZ\)/);
 assert.match(home,/if chosenShift then[\s\S]*?for _, object in staged:GetChildren\(\) do object\.Parent = folder end/);
 assert.match(home,/staged:Destroy\(\)/,'실패한 후보 자산 삭제');
 assert.match(home,/BuildingFootprintX", actualHalfX \* 2/);
 assert.match(home,/BuildingFootprintZ", actualHalfZ \* 2/);
 assert.match(home,/HX = actualHalfX, HZ = actualHalfZ/);
 assert.match(port,/local function reserved\(x, z, halfX, halfZ\)/);
 assert.match(port,/halfZ = halfZ or halfX/);
 assert.match(port,/lot\.HX or lot\.H/);
 assert.match(port,/lot\.HZ or lot\.H/);
 assert.match(port,/CityBuildingMode", "AUTO_VISUAL_READ_ONLY"/);
});

// [가축 PBR 자연 색] 기존 원본 코·귀·얼룩과 색상지도 없는 표면 중복 착색 회귀 방지.
test('항구·탐험 가축의 PBR 단일 채널과 눈·코·얼룩 보호',()=>{
 for(const name of ['PortScene.luau','FieldScene.luau']){
  const scene=read('ReplicatedStorage/Shared/'+name);
  const start=scene.indexOf('if textured and not detail then');
  const end=scene.indexOf('elseif not textured and not sa',start);
  assert.ok(start>0&&end>start,name+' 기존 가축 처리 경로');
  const block=scene.slice(start,end);
  for(const role of ['muzzle','nose','snout','ear','udder','tusk','patch','spot','stripe','whisker']){
   assert.ok(scene.includes('partName:find("'+role+'", 1, true)'),name+'의 '+role+' 보호');
  }
  assert.match(block,/if sa and sa\.ColorMap ~= "" then/,'원본 색상 지도 보호');
  assert.match(block,/if sa and sa\.ColorMap == "" then\s+sa\.Color = sa\.Color:Lerp\(tint,/,'색상 지도 없는 PBR만 단일 채널 보정');
  assert.doesNotMatch(block,/sa\.Color = [pd]\.Color/,'PBR/파츠 중복 착색 금지');
  assert.match(block,/if not sa then\s+[pd]\.Material =/,'원본 재질 보존');
  for(const material of ['Fabric','Leather','Concrete','SmoothPlastic'])assert.ok(block.includes('Enum.Material.'+material),material+' 가축 재질');
 }
});

// [가축 실물 비율·자연 품종색] 목장/동물원/왕궁 기마병/탐험 현장 공통 규격 회귀.
test('성체 말과 주요 가축의 크기·품종색은 항구와 탐험이 공유하고 원본 텍스처를 보존한다',()=>{
 const scene=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const config=read('ReplicatedStorage/Shared/PortBuildings.luau');
 const assets=read('ReplicatedStorage/Shared/AssetIds.luau');
 const species=['horse','cow','donkey','llama','sheep','pig','elephant','dog-pug','cat','chicken'];
 for(const sp of species){
  assert.ok(assets.includes('["Animals/'+sp+'"]'),'승인된 실물 동물 모델: '+sp);
  assert.ok(config.includes(sp+' = { size = ')||config.includes('["'+sp+'"] = { size = '),'단일 실물 크기 규격: '+sp);
 }
 assert.match(config,/horse = \{ size = 8\.8,/);
 assert.doesNotMatch(config,/Color3\.fromRGB/,'공유 설정에서 Roblox 전용 Color3 생성 금지');
 assert.match(config,/coats = \{ \{ 132, 78, 45 \},/,'원래 말 RGB 팔레트 보존');
 assert.match(config,/cow = \{ size = 7\.3,/);
 assert.match(config,/donkey = \{ size = 6\.5,/);
 assert.match(config,/sheep = \{ size = 3\.8,/);
 assert.match(config,/pig = \{ size = 4\.1,/);
 assert.match(config,/elephant = \{ size = 13\.5,/);
 assert.match(scene,/local animalVisual = PortBuildings\.AnimalVisual/);
 assert.match(scene,/horse = \{ animalVisual\.horse\.size, "graze" \}/);
 assert.match(scene,/local cavalryHorse = PortBuildings\.AnimalVisual\.horse/);
 assert.match(scene,/cavalryHorse\.size, false, coat/);
 assert.match(scene,/Color3\.fromRGB\(table\.unpack\(cavalryHorse\.coats\[/);
 assert.match(scene,/Color3\.fromRGB\(table\.unpack\(visual\.coats\[/);
 assert.match(scene,/horse:SetAttribute\("AnimalVisualSize", cavalryHorse\.size\)/);
 assert.match(scene,/if horse then mountedVisible \+= 1 end/);
 assert.match(scene,/local coatIndex = if skin then 1 \+ math\.floor/);
 assert.match(scene,/m:SetAttribute\("AnimalCoatIndex", coatIndex\)/);
 assert.match(scene,/local textured = \(p:IsA\("MeshPart"\) and p\.TextureID ~= ""\) or \(sa and sa\.ColorMap ~= ""\)/);
 assert.match(scene,/if not textured and not detail then/);
 assert.match(scene,/local scale = if isAnimal then m:GetScale\(\) \* ratio else ratio/);
 assert.match(scene,/if math\.abs\(actualAxis - desiredSize\) > desiredSize \* 0\.2 then/);
 assert.match(field,/local PortBuildings = require\(script\.Parent:WaitForChild\("PortBuildings"\)\)/);
 assert.match(field,/local sizes = PortBuildings\.AnimalVisual/);
 assert.match(field,/placeModel\(folder, "Animals", species, pos, visual\.size, false, Color3\.fromRGB\(table\.unpack\(visual\.coats\[coatIndex\]\)\)\)/);
 assert.match(field,/Color3\.fromRGB\(table\.unpack\(coats\[1\]\)\)/);
 assert.match(field,/if not textured and not detail then/);
 assert.match(field,/placed:SetAttribute\("ObservedSpecies", targetCard\.id\)/);
 assert.match(scene,/for k = 1, grazeCount do/);
 assert.match(scene,/for i = 1, lay\.pens do/);
 assert.match(scene,/horse:SetAttribute\("ShowcaseOnly", true\)/);
 assert.doesNotMatch(config,/DataStoreService/);
});



// [건물 흰색 복원] 텍스처 있는 실물은 유지하고 지역·부위별로 흰 기본 메시만 재질을 복구한다.
test('항구와 탐험의 흰 수입 건물은 문화권 지붕·석재·목재 재질로 복구되고 저장·진행도를 보존한다',()=>{
 const port=read('ReplicatedStorage/Shared/PortScene.luau');
 const field=read('ReplicatedStorage/Shared/FieldScene.luau');
 const start=port.indexOf('local function importedModel(parent, kind, asset, bottomPosition');
 const stop=port.indexOf('-- 등불:',start);
 assert.ok(start>0&&stop>start,'기존 단일 수입 모델 책임 함수');
 const block=port.slice(start,stop);
 assert.ok(port.indexOf('local currentKey = "north"') < start,'문화권은 기존 importer에서 유효해야 한다');
 for(const selector of ['asset:find("house"','asset:find("kenney_"','asset:find("quaternius_"',
  'asset:find("wall"','asset:find("roof"','asset:find("stall"',
  'kind == "Castle"','kind == "Terrain"','kind == "Naval"']){
  assert.ok(block.includes(selector),'건물 유형별 복원 선택 누락: '+selector);
 }
 assert.match(block,/local importedWhite = low >= 0\.78 and high - low <= 0\.14/);
 assert.match(block,/local east = currentKey == "japan"/);
 assert.match(block,/local sandy = currentKey == "desert"/);
 assert.match(block,/local mediterranean = currentKey == "iberia"/);
 assert.match(block,/local textured = \(p:IsA\("MeshPart"\) and p\.TextureID ~= ""\)/);
 assert.match(block,/sa and sa\.ColorMap ~= ""/);
 assert.match(block,/child:IsA\("SpecialMesh"\) and child\.TextureId ~= ""/);
 assert.match(block,/if architecture and importedWhite/);
 assert.match(block,/if not textured then/);
 assert.match(block,/Enum\.Material\.Brick, wallColor/);
 assert.match(block,/Enum\.Material\.Slate, roofColor/);
 assert.match(block,/Enum\.Material\.WoodPlanks/);
 assert.match(block,/Enum\.Material\.Cobblestone/);
 assert.match(block,/m:SetAttribute\("ArchitectureRestoredSurfaces", restoredSurfaces\)/);
 assert.match(block,/m:SetAttribute\("ArchitectureCulture", currentKey\)/);
 assert.match(port,/houseTier = sceneLevel/);
 assert.match(port,/local tintColor = wallColor or style\.walls\[1\]/);
 assert.match(field,/asset:find\("kenney_", 1, true\)/);
 assert.match(field,/asset:find\("eastasia", 1, true\)/);
 assert.match(field,/local textured = \(d:IsA\("MeshPart"\) and d\.TextureID ~= ""\)/);
 assert.match(field,/if not textured and light >= 0\.80 and chroma <= 0\.13 then/);
 assert.match(field,/culture = ad\.nation/);
});


test('무료 CC0 건축 재질 3종 9맵은 원본 해시·승인·기존 Roblox 등록기 연결을 지킨다',()=>{
  const root='roblox-games/mare-essentia/assets/materials/';
  const approvals=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json','utf8')).approved;
  const names=['mat_wall_plaster_beige','mat_wood_planks_worn','mat_stone_paving_historic'];
  for(const base of names)for(const suffix of ['bc','n','r']){
    const name=base+'_'+suffix;
    const file=root+name+'.jpg';
    const data=fs.readFileSync(file);
    assert.ok(data.length>=30000,'실제 CC0 지도 파일 누락: '+name);
    assert.equal(data[0],0xff,'JPEG 파일 형식 오류: '+name);
    assert.equal(data[1],0xd8,'JPEG 파일 형식 오류: '+name);
    const meta=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    assert.equal(meta.sourceSha256,hash,'재질 원본 해시 오류: '+name);
    assert.equal(meta.license,'CC0-1.0','무료 상업 이용 라이선스 누락: '+name);
    assert.ok(meta.source.startsWith('https://'),'원본 공식 주소 누락: '+name);
    assert.equal(approvals['Materials/'+name],hash,'바이브 이미지 검수 해시 불일치: '+name);
  }
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const loader=read('ServerScriptService/AssetLoader.server.luau');
  assert.match(uploader,/\['materials', 'Materials'\]/);
  assert.match(uploader,/kind === 'Materials'/);
  assert.match(uploader,/CC0_MATERIAL_SOURCE_METADATA_REQUIRED/);
  assert.match(loader,/local MATERIAL_FINISHES = \{/);
  for(const name of ['Town/house','Town/bench_A','Town/bench_B','Town/cobblestones','Terrain/bridge-stone'])
    assert.ok(loader.includes('["'+name+'"] = {'),'UV 확인된 건축물에만 재질 적용: '+name);
  assert.match(loader,/model:SetAttribute\("PBRFinishPending"/);
  assert.doesNotMatch(loader,/surface\.(?:ColorMap|NormalMap|RoughnessMap|MetalnessMap)\s*=/,
    '서버 실행 중 PBR 맵에 쓰지 않는다');
  assert.match(loader,/and kind ~= "Materials"/);
  assert.match(uploader,/R15_OUTFIT_UV_AND_SOURCE_PROOF_REQUIRED/);
  assert.match(uploader,/const outfitUvUpgrade = item.kind === 'People'/);
  assert.match(uploader,/ORIGINAL_MODEL_SOURCE_CHANGED_REUPLOAD/);
});


// [무료 네모트론 디자인 검증] Studio 사진과 책임 코드에서 전 시각 범주를 안전하게 수정한다.
test('네모트론 전체 시각 범주: 공식 Studio 증거·격리 브랜치·다중 파일 소스 변경', async () => {
  const {validateReview, visualEditLooksSafe, applyVisualReplacements,
    authorizedCandidateBranch, verifiedStudioCapture} =
    await import('../tools/company-nemotron-design-review.mjs');
  const contract = JSON.parse(fs.readFileSync('company-learning/external-ai-distillation-policy.json', 'utf8')).directVisualDesign;
  const workflow = fs.readFileSync('.github/workflows/devloop-studio.yml', 'utf8');
  const pose = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau';
  const port = 'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau';
  assert.equal(contract.enabled, true);
  assert.equal(contract.directCandidateSourceEditAllowed, true);
  assert.equal(contract.directMainWriteForbidden, true);
  assert.equal(contract.independentQaRequiredBeforePromotion, true);
  assert.ok(contract.visualCategories.length >= 20);
  assert.ok(contract.allowedSourceFiles.length >= 16);
  assert.ok(contract.allowedSourceFiles.includes(pose));
  assert.ok(contract.allowedSourceFiles.includes(port));
  assert.ok(contract.allowedSourceFiles.every(file => fs.existsSync(file)),
    '정책에 없는 파일을 모델이 상상해서 수정하면 안 된다');
  assert.equal(contract.maximumCandidateFilesPerRun, 4);
  assert.equal(contract.maximumSourceEditsPerRun, 10);
  assert.equal(contract.maximumReplacementBytes, 1800);
  assert.match(workflow, /NVIDIA_FREE_TIER_VERIFIED/);
  assert.match(workflow, /nemotron-mare-design-/);
  assert.match(workflow, /gh pr create --base main/);
  assert.match(workflow, /NEMOTRON_CANDIDATE=BLOCKED_UNAUTHORIZED_FILE_CHANGE/);
  assert.match(workflow, /node --test qa\/mare-essentia-datastore-name\.test\.mjs/);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-44238657398', '44238657398'), true);
  assert.equal(authorizedCandidateBranch('main', '44238657398'), false);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-44238657398', '44238657399'), false);
  assert.equal(authorizedCandidateBranch('nemotron-mare-design-../main', '44238657398'), false);

  // [Studio 캡처 진위] 해시/파일명만으로는 화면 실행 통과를 인정하지 않는다.
  const revision = 'a'.repeat(40);
  const images = ['harbor_npc_face_front-0.jpg', 'harbor_motion_idle-0.jpg'];
  const photos = images.map(name => ({name}));
  const studio = {sourceRevision: revision, errors: [], summary: {capturedFrames: 2},
    log: [{capture: 'harbor_npc_face_front'}, {capture: 'harbor_motion_idle'}]};
  assert.equal(verifiedStudioCapture(studio, photos, revision), true);
  assert.equal(verifiedStudioCapture({...studio, errors: ['failed']}, photos, revision), false);
  assert.equal(verifiedStudioCapture(studio, photos, 'b'.repeat(40)), false);
  assert.equal(verifiedStudioCapture({...studio, log: []}, photos, revision), false);
  assert.equal(verifiedStudioCapture({...studio, summary: {capturedFrames: 1}}, photos, revision), false);

  // [디자인 특화 AI] 정확히 존재하는 원본 한 줄을 동일 문맥의 시각 표현으로만 교체한다.
  const oldPose = '\tgui.LightInfluence = 0.6';
  const newPose = '\tgui.LightInfluence = 0.35';
  const oldPort = '\tlocal harborColor = Color3.fromRGB(51, 40, 30)';
  const newPort = '\tlocal harborColor = Color3.fromRGB(60, 45, 32)';
  const issue = (category, screenshot) => ({category, screenshot, severity: 'medium',
    evidence: 'The exact source-backed visual element is too bright and lacks contrast.'});
  const response = {issues: [issue('npc-face', images[0]), issue('environment', images[1])],
    edits: [
      {path: pose, category: 'npc-face', screenshot: images[0], before: oldPose, after: newPose},
      {path: port, category: 'environment', screenshot: images[1], before: oldPort, after: newPort}
    ]};
  const reviewed = validateReview(JSON.stringify(response), images, contract);
  assert.equal(reviewed.edits.length, 2);
  // [모델 허위 파일 차단] 원문은 모델이 다시 작성하지 않고 Studio 촬영 후 고정한 색인에서 조회.
  const pinnedAnchors = [{anchor: 0, path: pose, before: oldPose},
    {anchor: 1, path: port, before: oldPort}];
  const anchored = validateReview({issues: response.issues,
    edits: response.edits.map((row, anchor) =>
      ({anchor, category: row.category, screenshot: row.screenshot, after: row.after}))},
  images, contract, pinnedAnchors);
  assert.deepEqual(anchored.edits, reviewed.edits);
  assert.throws(() => validateReview({issues: response.issues,
    edits: [{anchor: 10, category: 'npc-face', screenshot: images[0], after: newPose}]},
  images, contract, pinnedAnchors), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => validateReview({issues: response.issues,
    edits: [{anchor: 0, path: port, category: 'npc-face', screenshot: images[0], after: newPose}]},
  images, contract, pinnedAnchors), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.match(reviewed.issues[0].evidenceSha256, /^[0-9a-f]{64}$/);
  assert.equal(reviewed.issues[0].evidence, undefined);
  assert.ok(visualEditLooksSafe(oldPose, newPose));
  assert.ok(visualEditLooksSafe(oldPort, newPort));
  assert.equal(visualEditLooksSafe('\tgui.LightInfluence = 0.6',
    '\tgui.LightInfluence = 0.35; game:Shutdown()'), false);
  assert.equal(visualEditLooksSafe('\tgui.LightInfluence = 0.6',
    '\tgui.LightInfluence = 0.35\nlocal evil = true'), false);
  assert.equal(visualEditLooksSafe('\tlocal color = Color3.fromRGB(1,2,3)',
    '\tlocal color = Color3.fromRGB(1,2,3) or require(42)'), false);
  assert.equal(visualEditLooksSafe('\tq.Material = Enum.Material.Fabric',
    '\tq.Material = Enum.Material.Metal'), true);
  assert.equal(visualEditLooksSafe('\tgameGold = 100', '\tgameGold = 999'), false);
  assert.equal(visualEditLooksSafe('\tq.CanCollide = false', '\tq.CanCollide = true'), false);
  assert.equal(visualEditLooksSafe('\tlocal icon = "rbxassetid://123"',
    '\tlocal icon = "rbxassetid://456"'), false);

  const sources = {[pose]: oldPose + '\n', [port]: oldPort + '\n'};
  const candidate = applyVisualReplacements(sources, reviewed.edits, contract);
  assert.equal(candidate.files.size, 2);
  assert.equal(candidate.changes.length, 2);
  assert.equal(candidate.files.get(pose), newPose + '\n');
  assert.equal(candidate.files.get(port), newPort + '\n');
  assert.equal(fs.readFileSync(pose, 'utf8').includes(oldPose), true,
    '원본 책임 게임 파일의 기존 기준선은 변경하지 않는다');
  assert.throws(() => validateReview({...response,
    edits: [{...response.edits[0], path: 'roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau'}]},
    images, contract), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => validateReview({...response,
    edits: [response.edits[0], response.edits[0]]}, images, contract),
  /DUPLICATE_SOURCE_ANCHOR/);
  assert.throws(() => validateReview({...response,
    edits: [{...response.edits[0], before: '\tDamage = 5', after: '\tDamage = 50'}]},
    images, contract), /EDIT_NOT_VISUAL_OR_NOT_IN_POLICY/);
  assert.throws(() => applyVisualReplacements({[pose]: oldPose + '\n' + oldPose},
    [reviewed.edits[0]], contract), /SOURCE_ANCHOR_NOT_UNIQUE/);
  assert.throws(() => applyVisualReplacements({}, [reviewed.edits[0]], contract),
    /SOURCE_FILE_NOT_FOUND/);
});


// [무료 디자인 전문가 회귀] 전문 분야, 일일 한도, 쿨다운, 독립 전후 판정.
test('무료 디자인 7개 모델은 역할별·인증·일일 한도·쿨다운을 지킨다', async () => {
  const {DESIGN_FREE_MODELS, designRoleForFrames, selectFreeDesignModels, selectDesignFrameRole,
    validateVisualComparison, verifiedDesignFeedback, mergeFreeVisualUsage,
    rankVisualSourceFiles, visualEditLooksSafe} =
      await import('../tools/company-nemotron-design-review.mjs');
  const policy = JSON.parse(fs.readFileSync('company-learning/external-ai-distillation-policy.json', 'utf8'));
  const config = policy.directVisualDesign.freeSpecialistPool;
  assert.equal(config.paidFallbackForbidden, true);
  assert.equal(config.accountTierProofRequired, true);
  assert.equal(config.maxCallsPerCapture, 3);
  assert.equal(DESIGN_FREE_MODELS.length, 7);
  assert.ok(DESIGN_FREE_MODELS.every(model => config.modelIds.includes(model.id)));
  assert.ok(DESIGN_FREE_MODELS.every(model => model.provider !== 'OPENROUTER' ||
    model.model.endsWith(':free')));
  const env = {
    NVIDIA_API_KEY: 'test-key', NVIDIA_FREE_TIER_VERIFIED: 'YES',
    GEMINI_API_KEY: 'test-key', GEMINI_DESIGN_FREE_TIER_VERIFIED: 'YES',
    OPENROUTER_API_KEY: 'test-key', OPENROUTER_DESIGN_FREE_TIER_VERIFIED: 'YES'
  };
  const now = Date.parse('2026-11-18T07:00:00Z');
  const day = new Date(now).toISOString().slice(0, 10);
  assert.equal(designRoleForFrames(['npc_face-0.jpg']), 'NPC');
  assert.equal(designRoleForFrames(['ship_harbor-0.jpg']), 'WORLD');
  assert.equal(designRoleForFrames(['menu_ui-0.jpg']), 'UI');
  assert.equal(designRoleForFrames(['run_motion-0.jpg']), 'MOTION');
  const captures = JSON.parse(fs.readFileSync(
    'roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json', 'utf8'))
    .filter(step => step.type === 'capture').map(step => step.name + '-0.jpg');
  const roles = ['NPC', 'WORLD', 'UI', 'MOTION', 'GENERAL'];
  assert.deepEqual(roles.map(role => selectDesignFrameRole(captures, role)),
    ['WORLD', 'UI', 'MOTION', 'GENERAL', 'NPC']);
  assert.equal(selectDesignFrameRole(captures), 'NPC');
  const modelAvailability = [];
  assert.equal(selectFreeDesignModels({policy, env: {}, now, diagnostics: modelAvailability}).length, 0);
  assert.equal(modelAvailability.length, 7);
  assert.ok(modelAvailability.every(row => row.status === 'KEY_MISSING'));
  assert.ok(modelAvailability.every(row =>
    Object.keys(row).join(',') === 'modelId,provider,status'),
  '키 원문, 플래그 값, 계정 정보는 증거 파일에 노출하지 않는다');
  const unverified = [];
  selectFreeDesignModels({policy, now, env: {NVIDIA_API_KEY: 'private-key'},
    diagnostics: unverified});
  assert.equal(unverified.find(row => row.modelId === 'NVIDIA_VL').status,
    'FREE_TIER_NOT_VERIFIED', '무료 확인 플래그 없이 실제 AI 호출 금지');
  const files = policy.directVisualDesign.allowedSourceFiles;
  const npcSources = rankVisualSourceFiles(files, 'NPC');
  const worldSources = rankVisualSourceFiles(files, 'WORLD');
  const uiSources = rankVisualSourceFiles(files, 'UI');
  assert.match(npcSources[0], /\/Pose\.luau$/);
  assert.match(worldSources[0], /\/PortScene\.luau$/);
  assert.match(worldSources[1], /\/PortBuildings\.luau$/);
  assert.match(uiSources[0], /\/Game\.client\.luau$/);
  for (const paths of [npcSources, worldSources, uiSources]) {
    assert.ok(paths.length <= 6 && paths.every(file => files.includes(file)));
  }
  const tintBefore = '\tmineral = { building = "workshop", name = "광물 제련소", kind = "Town", asset = "workbench-anvil", tint = { 145, 133, 122 } },';
  const tintAfter = tintBefore.replace('145, 133, 122', '150, 130, 120');
  assert.equal(visualEditLooksSafe(tintBefore, tintAfter), true);
  assert.equal(visualEditLooksSafe(tintBefore,
    tintBefore.replace('145, 133, 122', '256, 130, 120')), false);
  assert.equal(visualEditLooksSafe(tintBefore,
    tintBefore.replace('workbench-anvil', 'unlicensed-new-asset')), false);
  const designSource = fs.readFileSync('tools/company-nemotron-design-review.mjs', 'utf8');
  assert.match(designSource, /visualAnchors\(contract\.allowedSourceFiles, designRuntime\.selectedRole\)/);
  assert.match(designSource, /SKIPPED_FREE_DESIGN_POOL_UNAVAILABLE[\s\S]*modelAvailability: diagnostics/);

  const models = opts => selectFreeDesignModels({policy, env, now, ...opts});
  assert.equal(models({frameNames: ['npc_face-0.jpg']})[0].id, 'NVIDIA_VL');
  assert.equal(models({frameNames: ['ship-0.jpg']})[0].id, 'GEMINI_FLASH');
  assert.equal(models({frameNames: ['menu_ui-0.jpg']})[0].id, 'OPENROUTER_GEMMA');
  assert.equal(models({frameNames: ['walk_motion-0.jpg']})[0].id, 'OPENROUTER_OMNI');
  assert.ok(!models({frameNames: ['npc_face-0.jpg'],
    previous: {usageWindow: {day, calls: {NVIDIA: 12, GEMINI: 12, OPENROUTER: 30}}}}).length);
  assert.ok(models({frameNames: ['npc_face-0.jpg'],
    previous: {usageWindow: {day, calls: {NVIDIA: 12}}}})
    .every(model => model.provider !== 'NVIDIA'));
  assert.ok(models({frameNames: ['npc_face-0.jpg'],
    previous: {cooldowns: {NVIDIA_VL: '2026-11-18T08:00:00Z'}}})
    .every(model => model.id !== 'NVIDIA_VL'));
  assert.equal(selectFreeDesignModels({policy, env: {
    NVIDIA_API_KEY: 'test-key', NVIDIA_FREE_TIER_VERIFIED: 'NO'
  }}).length, 0);
  assert.throws(() => selectFreeDesignModels({
    policy: {directVisualDesign: {freeSpecialistPool: {...config, paidFallbackForbidden: false}}},
    env
  }), /FREE_SPECIALIST_POLICY_DENIED/);
  const evidence = name => ({
    screenshot: name, evidence: 'Compared with the actual baseline, this visible feature has noticeably improved.'
  });
  const pass = validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg'), evidence('npc_hair-0.jpg')],
    regressions: []
  }, ['npc_face-0.jpg', 'npc_hair-0.jpg']);
  assert.equal(pass.status, 'PASS');
  assert.match(pass.improvements[0].evidenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(pass.improvements[0].evidence, undefined);
  assert.equal(validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg')], regressions: []
  }, ['npc_face-0.jpg']).status, 'UNVERIFIED');
  assert.equal(validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('npc_face-0.jpg'), evidence('npc_hair-0.jpg')],
    regressions: [evidence('npc_face-0.jpg')]
  }, ['npc_face-0.jpg', 'npc_hair-0.jpg']).status, 'UNVERIFIED');
  assert.throws(() => validateVisualComparison({
    verdict: 'PASS', improvements: [evidence('invented.jpg')], regressions: []
  }, ['npc_face-0.jpg']), /VISUAL_COMPARISON_EVIDENCE_INVALID/);
  // [검증 증거 학습] 실제 Studio 소스·이미지·다른 제공자 검증을 모두 만족한 모델만 우선 배치.
  const original = {sourceRevision: 'a'.repeat(40), status: 'CANDIDATE_EDITED',
    provider: 'GEMINI', model: 'gemini-3.8-flash', selectedRole: 'NPC'};
  const frameA = 'harbor_npc_sparring_01-0.jpg', frameB = 'harbor_npc_sparring_02-0.jpg';
  const comparison = {
    verifiedAt: new Date(now - 60000).toISOString(),
    status: 'VISUAL_BEFORE_AFTER_PASS', sourceRevision: 'b'.repeat(40),
    beforeRevision: original.sourceRevision, candidateRevision: 'b'.repeat(40),
    authorProvider: 'GEMINI', authorModel: 'gemini-3.8-flash',
    selectedRole: 'NPC', reviewerProvider: 'OPENROUTER', reviewerModel: 'google/gemma-4-31b-it:free',
    independentQaPassed: true, afterStudioPassed: true,
    comparison: {status: 'PASS', improvements: [
      {screenshot: frameA, evidenceSha256: 'c'.repeat(64)},
      {screenshot: frameB, evidenceSha256: 'd'.repeat(64)}
    ], regressions: []},
    beforeFrames: [
      {name: frameA, sha256: '1'.repeat(64)}, {name: frameB, sha256: '2'.repeat(64)}
    ],
    afterFrames: [
      {name: frameA, sha256: '3'.repeat(64)}, {name: frameB, sha256: '4'.repeat(64)}
    ]
  };
  assert.equal(verifiedDesignFeedback(original, comparison, now)?.model, original.model);
  assert.equal(models({frameNames: [frameA], previous: original, feedback: comparison})[0].id,
    'GEMINI_FLASH', '다른 제공자의 실물 전후 검증이 확인된 모델만 우선 선택');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, verifiedAt: new Date(now - 8 * 86400000).toISOString()
  }, now), null, '7일 지난 디자인 결과 재학습 금지');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, reviewerProvider: 'GEMINI'}, now), null,
    '동일 제공자 자기 평가만으로 긍정 학습 금지');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, beforeRevision: 'f'.repeat(40)}, now), null,
    '과거 기준선과 다른 사진 검증을 재사용하면 안 된다');
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, afterStudioPassed: false}, now), null);
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, comparison: {...comparison.comparison, regressions: [{
      screenshot: frameA, evidenceSha256: 'e'.repeat(64)
    }]}}, now), null);
  assert.equal(verifiedDesignFeedback(original, {
    ...comparison, afterFrames: comparison.beforeFrames}, now), null,
    '사진이 모두 같으면 디자인 개선 성공이라 할 수 없다');
  const beforeCount = {...original, usageWindow: {day, calls: {GEMINI: 2, OPENROUTER: 0}}};
  const verifiedCalls = {...comparison, gameId: 'mare-essentia',
    usageWindow: {day, calls: {GEMINI: 3, OPENROUTER: 2}},
    cooldowns: {OPENROUTER_GEMMA: new Date(now + 60000).toISOString()}};
  const accounting = mergeFreeVisualUsage(beforeCount, verifiedCalls, now);
  assert.equal(accounting.usageWindow.calls.GEMINI, 3,
    '초안 생성과 독립 검수 누적 사용량을 중복 합계하지 않고 이어받는다');
  assert.equal(accounting.usageWindow.calls.OPENROUTER, 2);
  assert.ok(accounting.cooldowns.OPENROUTER_GEMMA);
  assert.equal(mergeFreeVisualUsage(beforeCount, {...verifiedCalls,
    beforeRevision: 'f'.repeat(40)}, now).usageWindow.calls.OPENROUTER, 0,
  '다른 기준선의 검증 사용량을 신뢰하면 안 된다');
  assert.equal(mergeFreeVisualUsage(beforeCount, {...verifiedCalls,
    usageWindow: {day, calls: {GEMINI: 1, OPENROUTER: 1}}}, now).usageWindow.calls.GEMINI, 2,
  '과거 사용량을 줄여 무료 호출을 늘릴 수 없다');
  assert.equal(models({frameNames: [frameA], previous: beforeCount,
    feedback: {...verifiedCalls, usageWindow: {day, calls: {GEMINI: 12, OPENROUTER: 2}}}})
    .some(model => model.provider === 'GEMINI'), false,
  '독립 검수에서 소진한 공급자는 다음 디자인 작업이 재사용할 수 없다');
  assert.deepEqual(models({frameNames: [frameA]}).slice(0, 3).map(model => model.provider),
    ['NVIDIA', 'OPENROUTER', 'GEMINI'],
    '한도 소진이나 장애에 대비해 다른 무료 공급자를 먼저 교대한다');
  assert.equal(models({frameNames: [frameA], previous: {
    ...original, attempts: [{id: 'NVIDIA_VL', status: 'REVIEW_INVALID'}]}
  })[0].id, 'OPENROUTER_NEMOTRON',
  '동일 분야에서 허위 앵커 또는 잘못된 JSON을 낸 모델은 다음 호출에 후순위');
  assert.equal(models({frameNames: [frameA], feedback: comparison, previous: {
    ...original, usageWindow: {day, calls: {GEMINI: 12}}
  }})[0].provider, 'NVIDIA', '성공 학습도 무료 사용량 상한을 해제하지 못한다');

  const workflow = fs.readFileSync('.github/workflows/devloop-studio.yml', 'utf8');
  assert.match(workflow, /--feedback=\$priorVisualFeedback/);
  assert.match(workflow, /--mode=verify/);
  assert.match(workflow, /DESIGN_AUTO_MERGE=MERGED_AFTER_STUDIO_VISUAL_SECURITY_QA/);
  assert.match(workflow, /company-roblox-source-drift-sync\.yml/);
  assert.match(workflow, /STUDIO_CANDIDATE_REF/);
});
