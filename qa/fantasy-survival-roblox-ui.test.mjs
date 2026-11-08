// 파일명: qa/fantasy-survival-roblox-ui.test.mjs
// 마력숲 네이티브 UI 메뉴·오른쪽 버튼·자원바의 실제 Luau 변수 범위 회귀 검사.
// 이 검사는 정적 코드 검증이며 Studio/모바일 실행 증거를 대체하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');

test('mobile menu and stamina handles stay visible outside the original do block',()=>{
  assert.match(client,/local meadowVitalsGui, meadowPages, meadowMenu, energyFill, energyLabel\s*\n\s*do/);
  for(const assignment of [
    'meadowPages={}',
    'meadowMenu=CommonUI.AdaptActionMenu(',
    'energyFill=Instance.new("Frame")',
    'energyLabel=Instance.new("TextLabel")'
  ])assert.ok(client.includes(assignment),assignment);
  for(const shadow of [
    'local meadowPages={}',
    'local meadowMenu=CommonUI.AdaptActionMenu(',
    'local energyFill=Instance.new("Frame")',
    'local energyLabel=Instance.new("TextLabel")'
  ])assert.ok(!client.includes(shadow),'out-of-scope shadow: '+shadow);
  const boundary=client.indexOf('\nend\n\n-- [초반 실전 튜토리얼]');
  assert.ok(boundary>0);
  const after=client.slice(boundary);
  assert.ok(after.includes('editLayoutButton.Parent=meadowPages[4]'));
  assert.ok(after.includes('if info[1]=="MEADOW_INVENTORY" then meadowMenu.open(2)'));
  assert.ok(after.includes('energyFill.Size=UDim2.fromScale'));
  assert.ok(after.includes('energyLabel.Text=ready and string.format'));
});

// [튜토리얼/퀘스트] 저장과 전투 권한을 수정하지 않고 실제 입력으로만 초반 안내를 진행한다.
test('main-first live quest tracker and first-play interactive controls',()=>{
  assert.doesNotMatch(client,/오픈월드 · 주변 몬스터/);
  assert.ok(client.includes('status.Visible=status.Text~=""'));
  const helper=client.slice(client.indexOf('  -- [의뢰 도우미]'),client.indexOf('  local companionLines='));
  const main=helper.indexOf('【메인 퀘스트】');
  const village=helper.indexOf('【서브 · 마을】');
  const companion=helper.indexOf('【서브 · 동료】');
  assert.ok(main>=0&&main<village&&village<companion);
  for(const text of [
    'Config.MainQuests','Config.VillageContracts','Config.CompanionRequests',
    'VillageContractEvidence','CompanionQuestProgress','QuestProgress',
    'QuestSideVillage','QuestSideCompanion',
    'questTracker.Size=UDim2.fromOffset(width,height)',
    'MeadowBeginnerTutorial','MeadowTutorialReplay',
    'meadowTutorialAdvance(1)','meadowTutorialAdvance(2)',
    'meadowTutorialAdvance(3)','meadowTutorialAdvance(4)','meadowTutorialAdvance(5)',
    'gui:GetPropertyChangedSignal("Enabled"):Connect(refreshTutorial)',
    'tutorialSkip.Activated:Connect(function()'
  ])assert.ok(client.includes(text),'missing quest/touch binding: '+text);
  assert.match(client,/Vector3\.new\(delta\.X,0,delta\.Z\)\.Magnitude>=8/);
  assert.match(client,/human\.MoveDirection\.Magnitude>\.12/);
  assert.match(client,/player:GetAttribute\("MeadowProfileHadSave"\)~=true/);
  assert.match(client,/if index==2 and submitted then meadowDodgeAttemptAt=os.clock\(\) end/);
  assert.match(client,/meadowInteractionAttemptAt=os.clock\(\)/);
  assert.ok(client.includes('if tutorialStep==6 then'),'completion follows real interaction input');
  for(const source of [
    'ApprovedCombatMotion','ApprovedActionMotion','MeadowSurvivalHintSerial',
    'MEADOW_VILLAGE_DIALOG','meadowAttackAttemptAt','meadowDodgeAttemptAt',
    'MeadowQuestWorldMarker','QuestNavigation',
    'questWorldMarker.Adornee=bestHost','guidePrompts[descendant]=true',
    'descendant.Name=="MeadowSurvivalInspect"','descendant.Name=="GatherPrompt"',
    'workspace.ChildAdded:Connect(bindMeadowQuestWorld)',
    'questTracker.Size=UDim2.fromOffset(width,height)',
    'local compact=landscape and v.Y<530'
  ])assert.ok(client.includes(source),'missing verified input or real quest marker: '+source);
  assert.doesNotMatch(client,/if index==1 and meadowTutorialAdvance then meadowTutorialAdvance\(5\) end/);
  assert.match(client,/if meadowInteractionAttemptAt>0 and os.clock\(\)-meadowInteractionAttemptAt<2/);
  assert.doesNotMatch(client,/player:SetAttribute\("MeadowTutorial/);
});

test('mobile interaction highlight uses actual server prompt activation range',()=>{
  assert.match(client,/local function updateMeadowPromptHighlight\(\)[\s\S]*?Magnitude<=prompt\.MaxActivationDistance/);
  assert.match(client,/promptService\.PromptShown:Connect\(function\(prompt\)/);
  assert.match(client,/promptService\.PromptHidden:Connect\(function\(prompt\)/);
});

test('touch dock retains authoritative original actions and server request path',()=>{
  assert.match(client,/button\.Activated:Connect\(function\(\)\s*if gui:GetAttribute\("GameMenuOpen"\)==true then return end\s*local submitted=activateMeadowAction\(index==1 and \(meadowActionButtons\.quickSkillId or skillActionId\) or skillActionId\)/);
  assert.match(client,/remote:FireServer\(actionId\)/);
  assert.match(client,/meadowRadar\.Name="MeadowExplorerRadar"/);
  for(const action of ['meadow-unarmed-rush','skill-meadow-dodge-left',
    'skill-meadow-guard','skill-meadow-heal','skill-meadow-sprint']){
    assert.ok(client.includes('"'+action+'"'),action);
  }
});


test('reference landscape HUD keeps original combat authority and screenshot composition',()=>{
  for(const marker of [
    'local meadowPaintedHudAtlas=', 'MeadowReferenceTopMenu','MeadowReferenceHotbar',
    'ReferencePrimarySword','ReferenceJump','ReferenceCharacterPortrait',
    'ReferenceCharacterName','ReferenceHotbar','ReferenceMenu',
    'local referenceMenuItems=', 'local referenceHotbarSlots={}',
    'local hotbarActions={','local function layoutMeadowReferenceHud()',
    'local step=landscape and math.floor(math.clamp(v.X/17,44,55))',
    'meadowReferenceHotbar.Position=UDim2.new(.5,0,1,-99)',
    'meadowSkillButtons.primarySword.Position=UDim2.fromOffset(math.floor(146*scale)',
    'meadowHealthTrack.Position=UDim2.fromOffset(x,top+16)',
    'meadowEnergy.Position=UDim2.fromOffset(x,top+30)',
    'questTracker.Position=UDim2.fromOffset(questLeft,questTop)',
    'local visualX=row[1]+(saved[1]-default[1])*212',
    'local visualY=row[2]+(saved[2]-default[2])*216',
    'meadowRadar:GetAttribute("ReferenceRadarVisible")==true and gui:GetAttribute("GameMenuOpen")~=true',
    'mapToggle.Activated:Connect(function()'
  ])assert.ok(client.includes(marker),'missing reference HUD: '+marker);
  for(const page of ['{"가방",2,6,nil,0,0}','{"제작",2,11,nil,200,0}',
    '{"도감",6,13,2,600,0}','{"기사단 연대기",6,14,5,800,0}','{"설정",4,15,nil,0,200}','{"스킬트리",7,0,nil,0,0}']){
    assert.ok(client.includes(page),'top menu icon/page missing: '+page);
  }
  assert.match(client,/for index=1,10 do[\s\S]*?referenceHotbarSlots\[index\]=slot/);
  assert.match(client,/meadowPrimarySword\.Activated:Connect\(function\(\)[\s\S]*?activateMeadowAction\(primaryCombatAction\.Id\)/);
  assert.match(client,/meadowReferenceJump\.Activated:Connect\(function\(\)[\s\S]*?human\.Jump=true/);
  assert.match(client,/heading=heading\.Unit[\s\S]*?offset=-heading/);
  assert.match(client,/title\.Text = "" -- \[시안\]/);
  // [시안 원화] 상단 6 / 하단 단축바 10 / 전투 5 = 21종을 같은 1000x1000(5x5, 200px 칸) 아틀라스에 연결.
  assert.match(client,/local meadowPaintedHudAtlas="rbxassetid:\/\/84007761993593"/);
  assert.match(client,/icon\.ImageRectSize=Vector2\.new\(200,200\)/);
  assert.match(client,/icon\.ImageRectOffset=Vector2\.new\(info\[5\] or 0,info\[6\] or 0\)/);
  assert.match(client,/local hudCell=index\+5/);
  assert.match(client,/icon\.ImageRectOffset=Vector2\.new\(\(hudCell%5\)\*200,math\.floor\(hudCell\/5\)\*200\)/);
  assert.match(client,/local paintedCell=\(\{sprint=Vector2\.new\(200,600\),fist=Vector2\.new\(400,600\),dodge=Vector2\.new\(600,600\),jump=Vector2\.new\(800,600\),guard=Vector2\.new\(200,800\)\}\)\[role\]/);
  assert.match(client,/icon\.ImageRectOffset=paintedCell/);
  assert.match(client,/swordIcon\.ImageRectOffset=Vector2\.new\(0,800\)/);
  assert.match(client,/swordIcon\.ImageRectSize=Vector2\.new\(200,200\)/);
  // [실패 복구] 원화 로드가 실패한 메뉴·단축바·전투 버튼만 이미 등록한 원본으로 교체.
  assert.match(client,/icon\.ImageRectOffset=Vector2\.new\(info\[3\]\*40,0\)/);
  assert.match(client,/icon\.ImageRectOffset=Vector2\.new\(\(index-1\)\*40,0\)/);
  assert.match(client,/icon\.Image=meadowRealActionIcons\[role\]/);
  assert.match(client,/swordIcon\.ImageRectSize=Vector2\.new\(40,40\)/);
  assert.match(client,/if role=="jump" then\s+icon\.Visible=false/);
  assert.match(client,/rbxassetid:\/\/71333073665947/);
  assert.match(client,/rbxassetid:\/\/81665484719308/);
  // [오너 시안 실좌표] 좌측 상태창은 제외하고 실제 오른쪽 UI와 하단 10칸만 대조한다.
  assert.match(client,/meadowReferenceMenu.Size=UDim2.fromOffset\(menuWidth,step\+17\)/);
  assert.match(client,/button.Size=UDim2.fromOffset\(step-3,step-3\)/);
  assert.match(client,/icon.Size=UDim2.fromScale\(1,1\)/);
  assert.match(client,/slot.BackgroundTransparency=1/);
  assert.match(client,/stroke.Transparency=1/);
  assert.match(client,/meadowReferenceHotbar.Position=UDim2.new\(0,math.floor\(math.clamp\(v.X\*\.46,minCenter,maxCenter\)\),1,-13\)/);
  assert.match(client,/meadowReferenceHotbar.Position=UDim2.new\(\.5,0,1,-99\)/);
  assert.match(client,/questTracker.BackgroundColor3=Color3.fromRGB\(19,19,18\)/);
  assert.match(client,/local height=compact and 156 or 186/);
  assert.match(client,/local width=math.floor\(math.clamp\(v.X\*\(landscape and \.32 or \.46\),landscape and 210 or 150,landscape and 300 or 270\)\)/);
  assert.match(client,/local positions=\{\s+\{66,165,44\}/);
  assert.match(client,/\{110,165,54\}/);
  assert.match(client,/button.Position=UDim2.fromOffset\(math.floor\(182\*scale-size\*\.5\),math.floor\(94\*scale-size\*\.5\)\)/);
  assert.match(client,/meadowSkillButtons.primarySword.Position=UDim2.fromOffset\(math.floor\(146\*scale\),math.floor\(132\*scale\)\)/);
  assert.match(client,/local swordSize=math.max\(60,math.floor\(66\*scale\)\)/);
  assert.match(client,/meadowSkillButtons.referenceJump.Position=UDim2.fromOffset\(math.floor\(30\*scale\),meadowSkillDock.Size.Y.Offset-jumpSize-math.floor\(6\*scale\)\)/);
  // 원화 자체에 포함된 링을 또 그리지 않는다.
  assert.match(client,/if rim then rim.Enabled=false end/);
  assert.match(client,/if inner then inner.Visible=false end/);
  // [모바일 터치] 엔진 품질검사(짧은 변 36 미만 불합격, 44 미만 아쉬움)를 모든 화면에서 만족한다.
  assert.match(client,/local step=landscape and math.floor\(math.clamp\(v.X\/17,44,55\)\)\s+or math.floor\(math.clamp\(\(v.X-18\)\/6,44,52\)\)/);
  assert.match(client,/local menuStep=landscape and math.floor\(math.clamp\(v.X\/15,47,55\)\)\s+or math.floor\(math.clamp\(\(v.X-18\)\/6,47,52\)\)/);
  assert.match(client,/local slotSize=landscape and math.floor\(math.clamp\(v.X\/17,44,52\)\)\s+or math.floor\(math.clamp\(\(v.X-24\)\/columns-2,44,48\)\)/);
  assert.match(client,/local columns=5 -- \[요청\] 단축바는 1~5번 5칸만 표시/);
  assert.match(client,/local size=math.max\(46,math.floor\(row\[3\]\*scale\)\)/);
  assert.match(client,/local jumpSize=math.max\(54,math.floor\(54\*scale\)\)/);
  assert.match(client,/local size=math.max\(42,math.floor\(36\*scale\)\)/);

  const sheet={width:1000,height:1000};
  const cropRows=[
    ...[0,1,2,3,4,5].map(i=>[(i%5)*200,Math.floor(i/5)*200,200,200]),
    ...[6,7,8,9,10,11,12,13,14,15].map(i=>[(i%5)*200,Math.floor(i/5)*200,200,200]),
    ...[16,17,18,19,20].map(i=>[(i%5)*200,Math.floor(i/5)*200,200,200])
  ];
  assert.equal(cropRows.length,21);
  for(const [x,y,width,height] of cropRows){
    assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=sheet.width&&y+height<=sheet.height,'invalid artwork crop');
  }
  const registry=JSON.parse(fs.readFileSync("roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json","utf8"));
  // [신규 21종 HUD] 등록·사용 승인된 정확한 원본 이미지가 런타임 연결에 쓰여야 한다.
  assert.equal(String(registry.illustratedHudIconsV2.assetId),"84007761993593");
  assert.equal(registry.illustratedHudIconsV2.width,1000);
  assert.equal(registry.illustratedHudIconsV2.height,1000);
  assert.ok(registry.illustratedHudIconsV2.width<=1024&&registry.illustratedHudIconsV2.height<=1024,"atlas must stay within Roblox 1024px limit");
  assert.equal(registry.illustratedHudIconsV2.importVerified,true);
  assert.equal(registry.illustratedHudIconsV2.universeUseGrantVerified,true);
  assert.ok(registry.illustratedHudIconsV2.authorizedUniverseIds.includes("10773436325"));
  assert.equal(String(registry.paintedHudIcons.assetId),"71333073665947");
  assert.equal(registry.paintedHudIcons.width,640);
  assert.equal(registry.paintedHudIcons.cellSize,40);
  assert.equal(String(registry.rightActionIcons.assetId),"81665484719308");
  assert.equal(registry.paintedHudIcons.importVerified,true);
  assert.equal(registry.rightActionIcons.importVerified,true);
  assert.match(client,/ImageRectSize=Vector2\.new\(40,40\)/);
  assert.match(client,/ImageRectOffset=Vector2\.new\(\(index-1\)\*40,0\)/);
  assert.match(client,/applyMeadowRightActionImage\(meadowReferenceJump,"jump"\)/);
  // [실제 시안] HP·기력·숙련 EXP, 검·기술·회피·질주·점프, 10개 단축바.
  for(const marker of [
    'meadowExperience.Name="MeadowExperience"',
    'meadowHealthTrack.Position=UDim2.fromOffset(x,top+16)',
    'meadowEnergy.Position=UDim2.fromOffset(x,top+30)',
    'meadowExperience.Position=UDim2.fromOffset(x,top+44)',
    'local function refreshReferenceHotbar()',
    'remote:FireServer("meadow:rpg:tonic:use:herbal_tonic")',
    'remote:FireServer("meadow:rpg:tonic:use:energy_tonic")',
    'trackerTitle.Text=quest and ("❖ [메인] "..quest.Name)',
    'button.Visible=index==2 or index==3',
    'meadowSkillButtons.referenceJump.Position=UDim2.fromOffset(math.floor(30*scale)',
  ])assert.ok(client.includes(marker),'painted reference HUD lost: '+marker);
  for(const [w,h] of [[1920,1080],[1536,709],[1280,720],[926,428],[852,393],[844,390],[720,400],[640,360],[430,932],[390,844],[360,640]]){
    const landscape=w>h;
    const step=landscape?Math.floor(Math.max(47,Math.min(55,w/15)))
      :Math.floor(Math.max(47,Math.min(52,(w-18)/6)));
    const width=step*6;
    assert.ok(step-3>=44,'top menu button below touch size '+w+'x'+h);
    assert.ok(w-width-9>0,'top menu clipped '+w+'x'+h);
    const columns=w<(landscape?760:560)?5:10;
    const slot=landscape?Math.floor(Math.max(44,Math.min(52,w/17)))
      :Math.floor(Math.max(44,Math.min(48,(w-24)/columns-2)));
    assert.ok(slot>=44,'hotbar slot below touch size '+w+'x'+h);
    assert.ok((slot+2)*columns-2<=w,'hotbar clipped '+w+'x'+h);
    if(landscape){
      const barWidth=(slot+2)*columns-2;
      const minCenter=150+barWidth/2,maxCenter=Math.max(minCenter,w-150-barWidth/2);
      const center=Math.floor(Math.max(minCenter,Math.min(maxCenter,w*.46)));
      assert.ok(center-barWidth/2>=150,'hotbar overlaps move joystick '+w+'x'+h);
    }
    const scale=landscape?Math.max(.76,Math.min(1.12,(h-20)/370))
      :Math.max(.76,Math.min(1,w/390));
    for(const base of [38,39,35,46])
      assert.ok(Math.max(46,Math.floor(base*scale))>=44,'combat button below touch size '+w+'x'+h);
    const rightWidth=Math.floor(212*scale);
    const rightBottom=Math.floor((landscape?12:104)*scale);
    assert.ok(rightWidth<w,'combat dock too wide '+w+'x'+h);
    assert.ok(rightBottom+Math.floor(216*scale)<h,
      'combat touch dock clipped '+w+'x'+h);
    // 오른쪽 의뢰판은 여섯 메뉴 아이콘 바로 아래에서 시작한다.
    const questTop=(landscape?4:70)+step+(landscape?24:14);
    assert.ok(questTop>=step+18,'quest panel overlaps top menu '+w+'x'+h);
  }
});

test('deer and wolf keep real source bones and documented Animator motion priorities',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const native=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/native-assets.json','utf8'));
  const visual=fs.readFileSync('roblox-games/fantasy-survival/shared/VisualAssetIds.luau','utf8');
  assert.equal(native.models.deer.sourcePath,'assets/shared/forest/deer-animated.glb');
  assert.equal(native.models.wolf.sourcePath,'assets/shared/forest/wolf.fbx');
  const deerBytes=fs.readFileSync(native.models.deer.sourcePath);
  assert.equal(deerBytes.toString('ascii',0,4),'glTF');
  assert.equal(deerBytes.readUInt32LE(8),deerBytes.length);
  const deerJson=JSON.parse(deerBytes.subarray(20,20+deerBytes.readUInt32LE(12)).toString('utf8'));
  assert.ok(deerJson.skins.some(skin=>skin.joints.length>=40),'deer must have a real skinned quadruped rig');
  for(const name of ['Idle','Walk','Gallop']){
    assert.ok(deerJson.animations.some(clip=>clip.name===name),'original deer clip: '+name);
  }
  const wolfBytes=fs.readFileSync(native.models.wolf.sourcePath);
  assert.match(wolfBytes.toString('latin1'),/WolfArmature\|Walk/);
  assert.match(wolfBytes.toString('latin1'),/WolfArmature\|Idle/);
  for(const joint of ['frontupperlegl','frontupperlegr','frontlowerlegl','frontlowerlegr',
      'backupperlegl','backupperlegr','backlowerlegl','backlowerlegr',
      'torso2','neck1','tail1']){
    assert.match(client,new RegExp('\\b'+joint+'="'));
  }
  for(const bone of ['bone014','bone017','bone008','bone011']){
    assert.ok(client.includes(bone+'="'),'wolf actual source leg missing: '+bone);
  }
  assert.match(client,/deerGallopOffsets=\{FL=/);
  assert.match(client,/wolfGallopOffsets=\{FL=/);
  assert.match(client,/Enum\.AnimationPriority\.Idle/);
  assert.match(client,/Enum\.AnimationPriority\.Movement/);
  assert.match(client,/Enum\.AnimationPriority\.Action/);
  assert.match(client,/local quadrupedAction=\(row\.species=="wolf" or row\.species=="deer"\)/);
  assert.match(client,/row\.groundSpeed<\.35 then mode="IDLE"/);
  assert.match(client,/row\.controller\.Step\(row\.poses,poseDt\)/);
  assert.match(server,/NativeMobFacingYaw/);
  assert.match(server,/NativeDeerOriginalRigUpright/);
  assert.match(server,/clone:SetAttribute\("NativeDeerFacingCorrection",deerAlignment\)/);
  assert.match(server,/local correction=animal\.model:GetAttribute\("NativeDeerFacingCorrection"\)/);
  assert.match(server,/deerAlignment=CFrame.fromMatrix/);
  assert.match(server,/id=="deer" and meadowPalette.deer/);
  assert.match(client,/if species=="wolf" or species=="bat" or species=="deer" then/);
  assert.match(client,/head="Head"/);
  assert.match(server,/local towardFront=pivot:VectorToObjectSpace/);
  assert.match(server,/MEADOW_DEER_FRONT_BACK_AXIS_INVALID/);
  assert.match(server,/surface\.TextureID~=""/);
  assert.match(server,/surface:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(server,/closest<11 and "RUN" or "WALK"/);
  assert.match(visual,/deer=107866382568249/);
  assert.doesNotMatch(client,/Instance\.new\("Part"\).*Deer/);
});

test('five-stage dodge stays inside existing server-authorized skill',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(client,/\[5단 회피 스킬\]/);
  assert.match(client,/local first,second,third,fourth=0,0,0,0/);
  assert.match(client,/ipairs\(pulses\)/);
  assert.match(client,/\[중세 검술 하이 가드\]/);
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.12\*brace-\.12\*lift\+\.22\*hit/);
  assert.match(client,/skillMotionTargets\.FlipRoot=CFrame\.new\(0,\.20\*second/);
  assert.match(client,/MeadowGuardContactFlash/);
  assert.doesNotMatch(client,/ipairs\(\{\.11,\.30,\.66\}\)/);
  assert.match(client,/MeadowDodgeCinemaTrail/);
  assert.match(client,/endDiameter=reducedEffects and 3\.4 or \(index==5 and 10\.8 or 6\.2\)/);
  assert.match(client,/\[사슴 직립\]/);
  assert.match(client,/\[늑대 영화식 포식 액션\]/);
  // Preserved actual server dodge: 7-stud side move, 0.48s invulnerability, 4s cooldown.
  assert.match(server,/\["skill-meadow-dodge-left"\]=4,\["skill-meadow-dodge-right"\]=4/);
  assert.match(server,/local wall=workspace:Raycast\(start,moveDir\*moveDist,ray\)/);
  assert.match(server,/defense\.dodgeUntil=now\+\(behind and \.7 or \.48\)/);
  assert.match(server,/if distance<2 then return false end/);
  assert.match(server,/floor\.Material==Enum\.Material\.Water/);
  assert.match(server,/defense\.guardUntil=now\+2\.8/);
  assert.match(server,/defense\.perfectGuardUntil=now\+\.28/);
});

test('rush button advances independent 5-stage authored motions on each tap without five server hits',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const actionConfig=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const rush=client.match(/\["meadow-unarmed-rush"\]=\{[\s\S]*?beats=\{([\s\S]*?)\n    \},\n  \},/);
  assert.ok(rush,'existing rush animation pack must remain intact');
  const steps=[...rush[1].matchAll(/\{id="(U:[A-Z_]+)"/g)].map(m=>m[1]);
  assert.deepEqual(steps,['U:JAB_LEFT','U:CROSS_RIGHT','U:HOOK_LEFT','U:HOOK_RIGHT','U:BACKFIST_LEFT']);
  assert.match(client,/local stagedRush=profile=="UNARMED" and approvedScope=="meadow-unarmed-rush"/);
  assert.match(client,/selectedRushStage=\(martialTrack\.character==character and now-\(martialTrack\.at or 0\)<=1\.4\)/);
  assert.match(client,/\(\(martialTrack\.stage or 0\)%5\+1\) or 1/);
  assert.match(client,/chosenMoves\[1\]=martialTrack\.beats\[selectedRushStage\]\.id/);
  assert.match(client,/if stagedRush and serverApproved~=true then\s*finishNativeCombatMotion\(\)/);
  assert.match(client,/if predictedAt and os\.clock\(\)-predictedAt<1 then/);
  assert.match(client,/NativeCombatRushStage",selectedRushStage/);
  assert.match(client,/meadowSkillNameplates\[1\]\.Text="연타 "\.\.selectedRushStage\.\."\/5"/);
  assert.match(client,/activeCombatRushStage==5/);
  assert.match(actionConfig,/Id = "meadow-unarmed-rush", Label = "연속권/);
  assert.match(server,/\["meadow-unarmed-rush"\]=attackEnemy/);
  assert.match(server,/attackCooldown\[player\]=now\+\.42/);
  assert.match(server,/if not target then\s*player:SetAttribute\("ApprovedActionTarget",rootPart.Position\)\s*return true,false/);
  assert.doesNotMatch(server,/NativeCombatRushStage/);
});

test('RPG panels retain the original server actions and responsive navigation',()=>{
  for(const name of ['WitcherEquipmentGrid','CombatMasteryTrack','MasteryProgressFill',
    'MeadowInventorySearch','MeadowInventoryEmpty','WitcherSkillDetails']){
    assert.ok(client.includes(name),name);
  }
  for(const marker of ['local columns=width>=630 and 3 or width>=340 and 2 or 1',
    'inventorySearch:GetPropertyChangedSignal("Text"):Connect(renderInventory)',
    'inventoryEmpty.Visible=visibleCount==0',
    'page.CanvasPosition=Vector2.new(0,math.max(0,detailTop-8))',
    '(remaining>.05 and ("대기 "..math.ceil(remaining).."초") or "사용 가능")',
    'remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)',
    'remote:FireServer("meadow:rpg:talent:learn:"..school.Id)']){
    assert.ok(client.includes(marker),marker);
  }
});

// [마력숲 UI 계획] 외부 게임의 정보 위계만 참고하고 기존 서버 동작·저장을 보존한다.
test('forest RPG menu keeps the original eight pages with mobile navigation and distinct selection',()=>{
  const common=fs.readFileSync('roblox-games/fantasy-survival/shared/RobloxCommonUI.luau','utf8');
  const plan=fs.readFileSync('roblox-games/fantasy-survival/UI_PLAN.md','utf8');
  assert.match(client,/meadowPageNames=\{"캐릭터","인벤토리","퀘스트","옵션","도우미","세계","스킬"\}/);
  assert.match(client,/tabOrder=\{1,2,7,3,6,4\}/);
  assert.match(common,/MeadowMenuSubtitle/);
  assert.match(common,/heading\.Font=primary and primary\.witcherStyle and Enum\.Font\.Antique/);
  assert.match(common,/local active=tabPage\(i-1\)==index/);
  assert.match(common,/local bodyTop=tabs and \(primary and primary\.witcherStyle and \(shortMenu and 109 or 132\)/);
  assert.match(common,/root\.Size=UDim2\.fromOffset\(math\.min\(900,v\.X-16\)/);
  assert.match(common,/shade\.Activated:Connect\(function\(\)setOpen\(false\)end\)/);
  assert.match(client,/if input\.KeyCode==Enum\.KeyCode\.C then meadowMenu\.open\(1\)/);
  assert.match(plan,/디아블로 4/);
  assert.match(plan,/모바일·접근성/);
});

test('inventory shows grid before real selected item detail and preserves actions',()=>{
  const order=[
    'inventoryGrid.Name="MeadowInventoryGrid";inventoryGrid.LayoutOrder=4',
    'inventoryEmpty.Name="MeadowInventoryEmpty";inventoryEmpty.LayoutOrder=5',
    'detail.Name="WitcherItemDetails";detail.LayoutOrder=6'
  ];
  for(const fragment of order)assert.ok(client.includes(fragment),fragment);
  assert.ok(client.indexOf('local inventoryGrid=Instance.new("Frame")')<
    client.indexOf('local detail=Instance.new("Frame")'));
  for(const fragment of [
    'detailPreview.Name="SelectedItemIcon"',
    'detailPreview.Image=meadowIconAtlas',
    'detailPreview.ImageRectOffset=Vector2.new(item.icon*64,0)',
    'card.border.Thickness=selected and 2.2 or 1',
    'equip.Size=secondary.Visible and UDim2.new(.5,-16,0,48) or UDim2.new(1,-24,0,48)',
    'inventorySearch:GetPropertyChangedSignal("Text"):Connect(renderInventory)',
    'remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)',
    'remote:FireServer("meadow:rpg:tonic:use:"..item.tonic.Id)',
    'remote:FireServer("meadow:rpg:tonic:craft:"..item.tonic.Id)',
    'human:EquipTool(tool)',
  ])assert.ok(client.includes(fragment),fragment);
  assert.match(client,/local columns=math\.clamp\(math\.floor\(\(width\+8\)\/103\),2,6\)/);
  assert.match(client,/local columns=width>=630 and 3 or width>=340 and 2 or 1/);
});

// [실제 캐릭터·가방 화면] 서버 상태는 읽기 전용이고 새 화면 구성만 검증한다.
test('character sheet shows actual avatar, live vital gauges and separate seven mastery cards',()=>{
  for(const key of [
    'characterViewport.Name="NativeAvatarPreview"',
    'local aspect=math.max(.55,characterViewport.AbsoluteSize.X/math.max(1,characterViewport.AbsoluteSize.Y))',
    'local distance=math.max(size.Y/(2*halfFov),size.X/(2*halfFov*aspect),size.Z*1.8,5)*1.35',
    'characterViewport:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()',
    'heroHealth.Name="CharacterHealthTrack"',
    'heroStamina.Name="CharacterStaminaTrack"',
    'heroHealthText.ZIndex=45',
    'heroStaminaText.ZIndex=45',
    'heroHealthFill.Size=UDim2.fromScale(math.clamp(health/math.max(1,maximum),0,1),1)',
    'heroStaminaFill.Size=UDim2.fromScale(math.clamp(stamina/100,0,1),1)',
    'proficiencyGrid.Name="MeadowProficiencyCards"',
    'value.Text=tostring(math.floor(player:GetAttribute(entry.Key) or 0))',
  ])assert.ok(client.includes(key),key);
  assert.match(client,/local columns=width>=650 and 3 or width>=280 and 2 or 1/);
  assert.match(client,/local slot=width<360 and 52 or 60/);
  assert.match(client,/equippedWeapon.Text=equippedName\("Weapon"\)/);
  assert.match(client,/equippedAccessory.Text=equippedName\("Accessory"\)/);
});

test('inventory uses split landscape and scrollable portrait details without changing server actions',()=>{
  for(const key of [
    'inventoryWorkspace.Name="MeadowInventoryWorkspace"',
    'inventoryWorkspace.Parent=meadowPages[2]',
    'inventoryScroll.Name="MeadowInventoryItemScroll"',
    'inventoryGrid.Parent=inventoryScroll',
    'detail.Parent=inventoryWorkspace',
    'descriptionScroll.Name="SelectedItemDescriptionScroll"',
    'description.AutomaticSize=Enum.AutomaticSize.Y',
    'local split=width>=420',
    'inventoryScroll.ScrollingEnabled=split',
    'inventoryWorkspace:SetAttribute("SplitLayout",split)',
    'detail.Position=split and UDim2.fromOffset(leftWidth+12,0)',
    'inventoryShownCount=visibleCount',
    'local categories={"전체","보유","무기","방패","갑옷","장신구","소모품","재료","기록","재화"}',
    '(category=="보유" and owned(item)>0)',
    'local underline=tab:FindFirstChild("SelectedUnderline")',
    'inventoryEmpty.Visible=visibleCount==0',
    'inventoryGrid.Visible=visibleCount>0',
    'item.gear.Slot',
    'remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)',
    'remote:FireServer("meadow:rpg:tonic:use:"..item.tonic.Id)',
    'remote:FireServer("meadow:rpg:tonic:craft:"..item.tonic.Id)',
    'human:EquipTool(tool)'
  ])assert.ok(client.includes(key),key);
  assert.match(client,/inventorySearch:GetPropertyChangedSignal\("Text"\):Connect\(renderInventory\)/);
  assert.doesNotMatch(client,/local DataStoreService=/);
});

test('menu retains 8 original pages and keeps selected tab reachable on a short screen',()=>{
  const common=fs.readFileSync('roblox-games/fantasy-survival/shared/RobloxCommonUI.luau','utf8');
  for(const key of [
    'local shortMenu=primary and primary.witcherStyle and v.Y<420',
    'shortMenu and 109 or 132',
    'shortMenu and 53 or 72',
    'if subtitle then subtitle.Visible=not shortMenu end',
    'tabs.CanvasPosition=Vector2.new(target,0)',
    'child.ZIndex=math.clamp(child.ZIndex,44,45)',
    'if value then',
    'if input.KeyCode==Enum.KeyCode.ButtonB',
    'menu.Activated:Connect(function()setOpen(true);selectPage(selectedPage)end)',
  ])assert.ok(common.includes(key),key);
  assert.ok(client.includes('tabOrder={1,2,7,3,6,4}'));
  assert.ok(client.includes('subtitle.Text=captions[index] or "마력숲 탐험"'));
});

test('fantasy entry starts real play without an opening or replay screen',()=>{
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const entry=client.slice(client.indexOf('  local function closeArrival()'),client.indexOf('  local function loadRegion()'));
  const loading=client.slice(client.indexOf('  local function loadRegion()'),client.indexOf('  continueButton.Activated:Connect'));
  assert.match(client,/local function closeArrival\(\)/);
  assert.match(entry,/remote:FireServer\("meadow:enter-world"\)/);
  assert.match(entry,/meadowVitalsGui.Enabled=true/);
  assert.match(entry,/arrivalControls\(true\)/);
  assert.match(entry,/player:SetAttribute\("MeadowEnteredWorld",true\)/);
  assert.match(entry,/openingCamera.CameraType=Enum.CameraType.Custom/);
  assert.match(loading,/player:GetAttribute\("ProfileReady"\)~=true/);
  assert.match(loading,/player:GetAttribute\("MeadowResumeReady"\)==false/);
  assert.match(loading,/ContentProvider:PreloadAsync\(\{asset\}\)/);
  assert.match(loading,/closeArrival\(\)/);
  assert.doesNotMatch(client,/FirstArrivalScene|startIntro\(|Opening24|ReplayPrologue|introPanel/);
  assert.doesNotMatch(config,/CinematicIntroAtlasId|CinematicIntroSceneIds|CinematicIntroForegroundIds/);
});

test('2.5D gameplay camera follows the actual Roblox mesh with mobile-safe transition',()=>{
  assert.match(client,/BindToRenderStep\("MeadowPainted25DCamera"/);
  assert.match(client,/Enum\.RenderPriority\.Camera\.Value\+1/);
  assert.match(client,/if player:GetAttribute\("MeadowEnteredWorld"\)~=true or meadowCameraMode~=3 then/);
  assert.match(client,/local meadowCameraModes=\{"자유 3D","근접 3D","2.5D 경사"\}/);
  assert.match(client,/local focus=root\.Position\+Vector3\.new\(0,2\.5,0\)\+heading\*/);
  assert.match(client,/camera\.CFrame=paintedCameraFrame/);
  assert.match(client,/camera\.FieldOfView=portrait and 48 or 51/);
  const entry=client.slice(client.indexOf('  local function closeArrival()'),client.indexOf('  local function loadRegion()'));
  assert.equal([...entry.matchAll(/player:SetAttribute\("MeadowEnteredWorld",true\)/g)].length,1);
  assert.match(entry,/arrivalControls\(true\)/);
  assert.doesNotMatch(entry,/Instance\.new\("Part"\)|Instance\.new\("WedgePart"\)/);
});

test('original village well matches human-scale medieval proportions and keeps collisions source-bound',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const asset=fs.readFileSync('assets/shared/party/village-well.glb');
  assert.equal(asset.toString('ascii',0,4),'glTF');
  assert.equal(asset.readUInt32LE(8),asset.length);
  const jsonSize=asset.readUInt32LE(12);
  const source=JSON.parse(asset.subarray(20,20+jsonSize).toString('utf8'));
  const bounds=name=>{
    const node=source.nodes.find(row=>row.name===name);
    assert.ok(node&&Number.isInteger(node.mesh),'real original mesh: '+name);
    const primitive=source.meshes[node.mesh].primitives[0];
    const positions=source.accessors[primitive.attributes.POSITION];
    return positions.max.map((max,i)=>max-positions.min[i]);
  };
  const roof=bounds('Well pitched roof 004');
  const ring=bounds('Open well stone ring 001');
  const fullHeight=source.meshes.flatMap(mesh=>mesh.primitives.map(primitive=>
    source.accessors[primitive.attributes.POSITION])).reduce((span,row)=>({
    min:Math.min(span.min,row.min[1]),max:Math.max(span.max,row.max[1]),
  }),{min:Infinity,max:-Infinity});
  const targetHeight=12.2;
  const scale=targetHeight/(fullHeight.max-fullHeight.min);
  assert.ok(Math.abs(ring[1]*scale-3.42)<.08,'stone ring should reach the R15 avatar waist');
  assert.ok(Math.abs(ring[0]*scale-6.16)<.08,'real original stone ring diameter');
  assert.ok(Math.abs(roof[0]*scale-8.99)<.08,'wide original pitched roof');
  assert.match(server,/local wellHeightStuds=12\.2/);
  assert.match(server,/worldAsset\("villageWell",Vector3\.new\(0,3,-146\),wellHeightStuds\)/);
  assert.match(server,/mesh\.CanCollide=ring or post/);
  assert.match(server,/mesh\.CanQuery=ring or post/);
  // GLB has 6 tiny 64px palette PNGs; in-game clone substitutes real native textures.
  assert.equal(source.images.length,6);
  const binaryOffset=20+jsonSize+8;
  for(const originalImage of source.images){
    const view=source.bufferViews[originalImage.bufferView];
    const offset=binaryOffset+view.byteOffset;
    assert.equal(asset.readUInt32BE(offset+16),64,'original palette width');
    assert.equal(asset.readUInt32BE(offset+20),64,'original palette height');
  }
  assert.match(server,/local palette=mesh:FindFirstChildOfClass\("SurfaceAppearance"\)/);
  assert.match(server,/if palette then palette:Destroy\(\) end/);
  assert.match(server,/if mesh\.TextureID~="" then mesh\.TextureID="" end/);
  assert.match(server,/mesh\.Material=Enum\.Material\.Slate/);
  assert.match(server,/mesh\.Material=Enum\.Material\.WoodPlanks/);
  assert.match(server,/mesh\.Material=Enum\.Material\.CorrodedMetal/);
  assert.match(server,/mesh\.Material=Enum\.Material\.Fabric/);
  assert.match(server,/mesh\.Color=Color3\.fromRGB\(120,119,110\)/);
  assert.match(server,/mesh\.Color=Color3\.fromRGB\(119,95,70\)/);
  assert.match(server,/mesh\.CanTouch=false/);
  assert.match(server,/mesh\.CastShadow=true/);
  assert.match(server,/well:SetAttribute\("MeadowVillageWellSurface","WEATHERED_STONE_OAK"\)/);
  assert.match(server,/well:FindFirstChild\("Well pitched roof 004",true\)/);
  assert.match(server,/sign\.MaxDistance=52/);
  assert.match(server,/well:SetAttribute\("MeadowVillageWellOriginal",true\)/);
  assert.doesNotMatch(server,/worldAsset\("villageFountain"/);
});


test('guard and perfect parry reuse R15 high guard with server-confirmed cinematic contact',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const common=fs.readFileSync('assets/roblox/common-vfx-v1/RobloxCommonVFX.luau','utf8');
  // [기존 밸런스] 자세 2.8초, 완벽 방어 .28초, 기본 경감 50%, 패링 .42초를 고정한다.
  for(const token of ['defense.guardUntil=now+2.8','defense.perfectGuardUntil=now+.28',
    'defense.parryUntil=now+.42','damage=math.ceil(damage*.5)']){
    assert.ok(server.includes(token),'defense authority changed: '+token);
  }
  assert.match(server,/now-\(defense\.lastBlockContactFXAt or -100\) >=\.12/);
  assert.match(server,/remote:FireClient\(player,"MEADOW_REACTION","BLOCK"\)/);
  assert.match(server,/remote:FireClient\(player,"MEADOW_REACTION","PARRY"\)/);
  // [모션] 독립 준비·유지·접촉 반동, 무릎을 굽힌 쭈그림과 임의 메시 방패 금지.
  assert.match(client,/-- \[중세 검술 하이 가드\]/);
  assert.match(client,/local meadowGuardContactAt=-100/);
  assert.match(client,/os\.clock\(\)-meadowGuardContactAt/);
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.12\*brace/);
  assert.match(client,/skillMotionTargets\.UpperArmL=CFrame\.Angles\(-1\.12\*brace/);
  assert.match(client,/skillMotionTargets\.ShinL=CFrame\.identity/);
  assert.match(client,/-- \[완벽 막기\] 세키로식 짧은 전방 쳐내기 동작/);
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.75\*brace/);
  // [입자] 실제 서버 적중만 대형 불꽃, 막기 진입은 팔 궤적과 약한 잔광.
  assert.match(client,/overrideVfx=="BLOCK_CONTACT"/);
  assert.match(client,/overrideVfx=="PARRY_CONFIRMED"/);
  assert.match(client,/textureKey="slash",hideRing=true/);
  assert.match(client,/count=reducedEffects and \(perfect and 9 or 6\)/);
  assert.match(client,/if sourcePlayer==player then/);
  assert.match(client,/MeadowGuardStanceAura/);
  assert.match(client,/MeadowGuardContactFlash/);
  assert.match(client,/MeadowParryContactFlash/);
  assert.doesNotMatch(client,/MeadowGuardBodyAura|MeadowGuardFistGlow|MeadowGuardCrossSlash/);
  assert.doesNotMatch(client,/for index,delaySec in ipairs\(\{\.11,\.30,\.66\}\)/);
  assert.match(common,/function RobloxCommonVFX\.CreateBlockImpact\(options\)/);
  assert.match(common,/function RobloxCommonVFX\.CreatePerfectParryFlash\(options\)/);
  assert.doesNotMatch(server,/defense\.guardUntil=now\+[3-9]/);
});

// [마력숲 입장 회귀] 저장된 진행도와 서버 준비가 어긋나도 모바일 첫 터치가 사라지지 않게 한다.
test('fantasy saved game start shows progress and retries only a failed server profile',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const intro=client.slice(client.indexOf('  local function updateTitleStatus()'),client.indexOf('  replayButton.Activated:Connect(function()'));
  const buttons=client.slice(client.indexOf('  replayButton.Activated:Connect(function()'),client.indexOf('end\n\n-- [마을 NPC 대화]'));
  assert.match(server,/player:SetAttribute\("MeadowProfileLoadState","LOADING"\)/);
  assert.match(server,/local restored,restoreReason=pcall\(function\(\)/);
  assert.match(server,/persistenceAllowed\[player\]=false\s+profileBindingStarted\[player\]=nil\s+player:SetAttribute\("SaveStatus","SAVE_FAILED"\)/);
  assert.match(server,/local activated,activateReason=pcall\(function\(\)/);
  assert.match(server,/player:SetAttribute\("MeadowProfileLoadState","READY"\)\s+player:SetAttribute\("ProfileReady", true\)/);
  assert.match(server,/if actionId=="meadow:profile:retry" then/);
  assert.match(server,/player:GetAttribute\("MeadowProfileLoadState"\)~="FAILED"/);
  assert.match(server,/if player:GetAttribute\("ProfileReady"\)~=true then return end/);
  assert.match(intro,/player:GetAttributeChangedSignal\("MeadowProfileLoadState"\):Connect\(updateTitleStatus\)/);
  assert.match(buttons,/continueButton\.Activated:Connect\(function\(\)[\s\S]*?loadRegion\(false\)/);
  assert.match(buttons,/newButton\.Activated:Connect\(function\(\)[\s\S]*?loadPanel\.Visible=true/);
  assert.match(intro,/local profileDeadline=os\.clock\(\)\+90/);
  assert.match(intro,/remote:FireServer\("meadow:profile:retry"\)/);
  assert.match(buttons,/if player:GetAttribute\("MeadowProfileHadSave"\)~=true then\s+loadRegion\(true\)\s+else\s+loadPanel\.Visible=false/);
  assert.match(server,/if not store then error\("SURVIVAL_DATASTORE_UNAVAILABLE"\) end/);
  assert.match(server,/return store:UpdateAsync\("player:"\.\.player\.UserId/);
});


// [스폰 회귀] 초기 지면 검사 실패나 서버 스크립트 지연이 아바타 생성을 영구 차단하지 않도록 검증한다.
// 정적 계약만 확인하며 실제 Roblox 접속·부활·착지 QA의 PASS를 대체하지 않는다.
test('fantasy spawn must never suppress engine avatar creation',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const project=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/default.project.json','utf8'));
  const spawn=project.tree.Workspace.NativeFoundationSpawn;
  assert.equal(spawn.$className,'SpawnLocation');
  assert.equal(spawn.$properties.Enabled,true);
  assert.equal(spawn.$properties.CanCollide,true);
  assert.deepEqual(spawn.$properties.Position,[0,3,-75]);
  assert.match(server,/Players\.CharacterAutoLoads\s*=\s*true/);
  assert.doesNotMatch(server,/Players\.CharacterAutoLoads\s*=\s*false/);
  assert.match(server,/nativeFoundationSpawn\.CanCollide\s*=\s*true/);
  assert.ok(server.indexOf('createStartingMeadow()')<server.indexOf('Players.PlayerAdded:Connect(bindNativeFoundationPlayer)'));
  assert.match(server,/for attempt=1,10 do[\s\S]*?spawnHit = workspace:Raycast/);
  assert.match(server,/height>clearance\+9 or height<clearance-5/);
  assert.match(server,/task\.delay\(8,function\(\)[\s\S]*?for attempt=1,3 do[\s\S]*?player:LoadCharacterAsync\(\)/);
  assert.match(server,/task\.delay\(Players\.RespawnTime\+5,[\s\S]*?player:LoadCharacterAsync\(\)/);
  assert.match(server,/character:GetAttribute\("MeadowResumeApplied"\)==true/);
  assert.match(server,/Players\.PlayerAdded:Connect\(onSurvivalPlayerAdded\)/);
});
