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
    'local compact=not portrait and v.Y<420'
  ])assert.ok(client.includes(source),'missing verified input or real quest marker: '+source);
  assert.doesNotMatch(client,/if index==1 and meadowTutorialAdvance then meadowTutorialAdvance\(5\) end/);
  assert.match(client,/if meadowInteractionAttemptAt>0 and os.clock\(\)-meadowInteractionAttemptAt<2/);
  assert.doesNotMatch(client,/player:SetAttribute\("MeadowTutorial/);
});

test('touch dock retains authoritative original actions and server request path',()=>{
  assert.match(client,/button\.Activated:Connect\(function\(\)\s*if gui:GetAttribute\("GameMenuOpen"\)==true then return end\s*local submitted=activateMeadowAction\(skillActionId\)/);
  assert.match(client,/remote:FireServer\(actionId\)/);
  assert.match(client,/meadowRadar\.Name="MeadowExplorerRadar"/);
  for(const action of ['meadow-unarmed-rush','skill-meadow-dodge-left',
    'skill-meadow-guard','skill-meadow-heal','skill-meadow-sprint']){
    assert.ok(client.includes('"'+action+'"'),action);
  }
});


test('compact landscape keeps minimap directly above the dodge button and touch targets on screen',()=>{
  // Same calculations as the existing mobile HUD. This does not assert real device play.
  for(const pattern of [
    'math.clamp((v.Y-20)/370,.76,1.12)',
    'local dockLift=math.floor(40*scale)',
    'compactLandscape and (v.Y<350 and 80 or 88)',
    'mapBottom+8-dodgeTop',
    'local availableShift=math.max(0,v.Y-8-utilityBottom)',
    'math.max(44,math.floor(45*scale))',
    'meadowSkillDock.Position=UDim2.new(1,-math.floor(2*scale),1,-bottomInset-dockLift+math.floor(shift))'
  ])assert.ok(client.includes(pattern),'responsive HUD source missing: '+pattern);
  for(const [w,h] of [[1536,709],[852,393],[667,375],[800,300],[720,320],[640,360],[390,844],[360,640]]){
    const landscape=w>h;
    const scale=landscape?Math.max(.76,Math.min(1.12,(h-20)/370))
      :Math.max(.76,Math.min(1,w/390));
    const dockHeight=Math.floor(260*scale);
    const bottomInset=Math.floor((landscape?(h<350?12:14):116)*scale);
    const compact=landscape&&h<450;
    const mapDiameter=compact?(h<350?80:88)
      :w<480?96:Math.floor(Math.max(98,Math.min(124,h*.17)));
    const dodgeTop=h-bottomInset-dockHeight+Math.floor((260*.3-31)*scale);
    const mapBottom=8+mapDiameter+40;
    const utilitySize=Math.max(44,Math.floor(45*scale));
    const utilityBottom=h-bottomInset-dockHeight+Math.floor(194*scale)+utilitySize;
    const availableShift=Math.max(0,h-8-utilityBottom);
    const shift=compact?Math.min(availableShift,Math.max(0,mapBottom+8-dodgeTop)):0;
    assert.ok(dodgeTop+shift>=mapBottom+8,'radar/dodge overlap '+w+'x'+h);
    assert.ok(utilityBottom+shift<=h-8,'utility buttons clipped '+w+'x'+h);
    assert.ok(utilitySize>=44,'utility too small '+w+'x'+h);
    assert.ok(Math.floor(62*scale)>=44,'combat too small '+w+'x'+h);
    const dodgeCenter=w-Math.floor(2*scale)-Math.floor(235*scale)+235*.5*scale;
    const radarWidth=mapDiameter+14;
    const radarRight=Math.max(radarWidth+12,Math.min(w-12,Math.floor(dodgeCenter+radarWidth*.5+.5)));
    const radarCenter=radarRight-radarWidth*.5;
    assert.ok(Math.abs(dodgeCenter-radarCenter)<1,'radar no longer aligned '+w+'x'+h);
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
  assert.match(client,/local first=math\.sin/);
  assert.match(client,/local second=math\.sin/);
  assert.match(client,/local third=math\.sin/);
  assert.match(client,/local fourth=math\.sin/);
  assert.match(client,/local flip=math\.clamp/);
  assert.match(client,/ipairs\(\{\.05,\.23,\.44,\.65,\.96\}\)/);
  assert.match(client,/\[중세 검술 하이 가드\]/);
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.72\*brace-\.16\*lift\+\.23\*hit/);
  assert.match(client,/skillMotionTargets\.FlipRoot=CFrame\.new\(0,\.20\*second/);
  assert.match(client,/MeadowGuardContactFlash/);
  assert.doesNotMatch(client,/ipairs\(\{\.11,\.30,\.66\}\)/);
  assert.match(client,/MeadowDodgeCinemaTrail/);
  assert.match(client,/endDiameter=reducedEffects and 3\.4 or \(index==5 and 10\.8 or 6\.2\)/);
  assert.match(client,/\[사슴 직립\]/);
  assert.match(client,/\[늑대 영화식 포식 액션\]/);
  // Preserved actual server dodge: 7-stud side move, 0.48s invulnerability, 4s cooldown.
  assert.match(server,/\["skill-meadow-dodge-left"\]=4,\["skill-meadow-dodge-right"\]=4/);
  assert.match(server,/local wall=workspace:Raycast\(start,side\*7,ray\)/);
  assert.match(server,/defense\.dodgeUntil=now\+\.48/);
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
    'row.state.Text=remaining>.05 and ("대기 "..math.ceil(remaining).."초") or "사용 가능"',
    'remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)',
    'remote:FireServer("meadow:rpg:talent:learn:"..branch.Id)']){
    assert.ok(client.includes(marker),marker);
  }
});

// [마력숲 UI 계획] 외부 게임의 정보 위계만 참고하고 기존 서버 동작·저장을 보존한다.
test('forest RPG menu keeps the original eight pages with mobile navigation and distinct selection',()=>{
  const common=fs.readFileSync('roblox-games/fantasy-survival/shared/RobloxCommonUI.luau','utf8');
  const plan=fs.readFileSync('roblox-games/fantasy-survival/UI_PLAN.md','utf8');
  assert.match(client,/meadowPageNames=\{"캐릭터","인벤토리","저널","옵션","도우미","동료","스킬"\}/);
  assert.match(client,/tabOrder=\{0,1,2,7,3,4,5,6\}/);
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
  assert.match(client,/local narrow=width<540/);
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
    'local split=width>=620',
    'inventoryScroll.ScrollingEnabled=split',
    'inventoryWorkspace:SetAttribute("SplitLayout",split)',
    'detail.Position=split and UDim2.fromOffset(leftWidth+12,0)',
    'inventoryShownCount=visibleCount',
    'local categories={"전체","보유","무기","갑옷","장신구","소모품","재료","기록","재화"}',
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
  assert.ok(client.includes('tabOrder={0,1,2,7,3,4,5,6}'));
  assert.ok(client.includes('subtitle.Text=captions[index] or "마력숲 탐험"'));
});

test('registered 12-scene prologue keeps 23 unique approved layers and cleans up animations',()=>{
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const background=config.match(/CinematicIntroSceneIds\s*=\s*\{([^}]+)\}/);
  const foreground=config.match(/CinematicIntroForegroundIds\s*=\s*\{([^}]+)\}/);
  assert.ok(background&&foreground,'registered originals must be available to the existing intro');
  const backgrounds=[...background[1].matchAll(/rbxassetid:\/\/(\d+)/g)].map(x=>x[1]);
  const foregrounds=[...foreground[1].matchAll(/\[(\d+)\]="rbxassetid:\/\/(\d+)"/g)];
  assert.equal(backgrounds.length,12);
  assert.equal(foregrounds.length,11);
  assert.equal(new Set([...backgrounds,...foregrounds.map(x=>x[2])]).size,23);
  assert.deepEqual(foregrounds.map(x=>Number(x[1])),[1,2,3,4,5,6,7,9,10,11,12]);
  assert.match(client,/registeredStoryArt\[index\]/);
  assert.match(client,/registeredStoryDepth\[index\]/);
  assert.doesNotMatch(client,/departingArtwork|departingForeground/);
  assert.match(client,/storyArtwork.Visible=showArtwork/);
  assert.match(client,/storyForeground.Visible=showFront/);
  assert.match(client,/introDialogue\.MaxVisibleGraphemes=visible/);
  assert.match(client,/currentStoryScene~=index then return/);
  assert.match(client,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)/);
  assert.match(client,/remote:FireServer\("meadow:enter-world"\)/);
});


test('dark-fantasy cinematic uses twelve distinct approved-image shots with safe mobile and skip behavior',()=>{
  const scenes=client.match(/local scenes=\{([\s\S]*?)\n    \}\n    local total=0/);
  assert.ok(scenes,'original twelve-story scene table must remain intact');
  assert.deepEqual([...scenes[1].matchAll(/cinema="([^"]+)"/g)].map(x=>x[1]),[
    'siege','charge','crown','freeze','omen','betrayal',
    'reach','erasure','rift','dawn','relic','journey',
  ]);
  for(const marker of [
    'DarkFantasyVignette',
    'cinematicBars[top and 1 or 2]=bar',
    'local silence=scene.cinema=="freeze" or scene.cinema=="erasure"',
    'introGradient.Color=(scene.cinema=="dawn" or scene.cinema=="relic" or scene.cinema=="journey")',
    'or (scene.cinema=="dawn" or scene.cinema=="journey") and .085 or .105',
    'cameraMotionIntensity*=reducedEffects and .48 or 1',
    'for _,motion in pairs({camera=activeTween,fov=activeFovTween,art=activeStoryFocusTween}) do',
    'if motion.PlaybackState==Enum.PlaybackState.Paused then motion:Play() end',
    'regionIntro.MaxVisibleGraphemes=count',
    'introTint.BackgroundTransparency=.26',
    'introAmbienceBefore=meadowAmbienceGroup.Volume',
    'introEffectsBefore=meadowEffectsGroup.Volume',
    'if introAmbienceBefore~=nil then meadowAmbienceGroup.Volume=introAmbienceBefore;introAmbienceBefore=nil end',
    'if introEffectsBefore~=nil then meadowEffectsGroup.Volume=introEffectsBefore;introEffectsBefore=nil end',
    'if not entranceOpen or token~=runToken or currentStoryScene~=index then return end',
    'remote:FireServer("meadow:enter-world")',
  ])assert.ok(client.includes(marker),'cinematic contract missing: '+marker);
  assert.match(client,/local registeredStoryArt=Config.CinematicIntroSceneIds or \{\}/);
  assert.match(client,/local registeredStoryDepth=Config.CinematicIntroForegroundIds or \{\}/);
  assert.ok(client.includes('storyArtwork.Image=imageId'));
  assert.ok(client.includes('storyForeground.Image=frontId'));
  assert.doesNotMatch(scenes[1],/blood|gore|severed|corpse/i);
});

test('prologue has only two visible story texts and keeps key characters in the approved foreground',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.equal([...intro.matchAll(/label\(introPanel,/g)].length,2,'only title and dialogue labels should exist');
  assert.doesNotMatch(intro,/StoryChapter|SceneCharacterIdentity|OpeningText|DialogueSpeaker/);
  assert.match(intro,/regionIntro\.Text=scene\.title/);
  assert.match(intro,/introDialogue\.Text=scene\.subtitle/);
  assert.match(intro,/scene\.cinema=="erasure" and registeredStoryDepth\[3\]/);
  assert.match(intro,/local closeUp=scene\.cinema=="crown" or scene\.cinema=="omen"/);
  assert.match(intro,/cameraMotionIntensity=0/);
  assert.match(intro,/storyForeground\.ZIndex=8/);
  assert.match(intro,/storyAtmosphere\.ZIndex=9/);
});

test('prologue uses exactly one source image per shot and keeps Big Brother and Mirror uncropped',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/storyArtwork\.ScaleType=Enum\.ScaleType\.Fit/);
  assert.match(intro,/storyForeground\.ScaleType=Enum\.ScaleType\.Fit/);
  assert.match(intro,/introPanel:GetPropertyChangedSignal\("AbsoluteSize"\):Connect\(layoutIntroCaptions\)/);
  assert.match(intro,/local portrait=size\.Y>size\.X\*1\.1/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)\s+local showArtwork=validImage and not showFront/);
  assert.match(intro,/storyArtwork\.Visible=showArtwork\s+storyForeground\.Visible=showFront/);
  assert.match(intro,/scene\.cinema=="betrayal" or scene\.cinema=="erasure"/);
  assert.match(intro,/scene\.cinema=="erasure" and registeredStoryDepth\[3\]/);
  assert.match(intro,/storyForeground\.Position=UDim2\.fromScale\(\.025,\.11\)/);
  assert.match(intro,/storyForeground\.Size=UDim2\.fromScale\(\.95,\.69\)/);
  assert.match(intro,/storyArtwork\.Position=UDim2\.fromScale\(\.015,\.095\)/);
  assert.match(intro,/storyArtwork\.Size=UDim2\.fromScale\(\.97,\.76\)/);
  assert.match(intro,/local firstId=registeredStoryArt\[1\] or registeredStoryDepth\[1\]/);
  assert.match(intro,/for index,scene in ipairs\(scenes\) do\s+if index>1 then/);
  assert.match(intro,/local selected=portraitId or \(typeof\(imageId\)=="string" and imageId or frontId\)/);
  assert.doesNotMatch(intro,/for index,id in ipairs\(registeredStoryArt\) do/);
  assert.doesNotMatch(intro,/for index,id in pairs\(registeredStoryDepth\) do/);
  assert.match(intro,/local firstShotDeadline=os\.clock\(\)\+2\.4/);
  assert.match(intro,/if not entranceOpen or token~=runToken then return end\s+TweenService:Create\(storyProgress/);
  assert.match(intro,/local sway=math\.sin\(t\*1\.15\)\*cameraMotionIntensity\*\.12/);
  assert.doesNotMatch(intro,/departingArtwork|departingForeground|activeArtTween|activeFrontTween/);
  assert.doesNotMatch(intro,/frontScale|frontZoom|frontX|frontY/);
  assert.match(intro,/storyCurtain\.BackgroundTransparency=1/);
  assert.match(intro,/remote:FireServer\("meadow:enter-world"\)/);
});

test('12 authored prologue beats retain single-image framing and mobile-safe choreography',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/local storyImage=showFront and storyForeground or showArtwork and storyArtwork or nil/);
  assert.match(intro,/activeStoryFocusTween:Cancel\(\)/);
  assert.match(intro,/local maxX=math\.max\(0,1-storyImage\.Size\.X\.Scale\)/);
  assert.match(intro,/local maxY=math\.max\(0,1-storyImage\.Size\.Y\.Scale\)/);
  assert.match(intro,/math\.clamp\(position\.X\.Scale\+slowX,0,maxX\)/);
  assert.match(intro,/math\.clamp\(position\.Y\.Scale\+slowY,0,maxY\)/);
  assert.match(intro,/local quietPortrait=closeUp or scene\.cinema=="relic" or scene\.cinema=="dawn"/);
  assert.match(intro,/spark\.Visible=scene\.cinema~="freeze" and \(not quietPortrait or n<=10\)/);
  assert.match(intro,/local speechWait=/);
  assert.match(intro,/local speechStep=/);
  assert.match(intro,/task\.wait\(speechWait\)/);
  assert.match(intro,/task\.wait\(speechStep\)/);
  assert.match(intro,/local impactAt=nil/);
  for(const cue of ['siege','charge','crown','omen','betrayal','reach','erasure','rift','dawn','relic','journey']){
    assert.match(intro,new RegExp('scene\\.cinema=="'+cue+'" then\\s+impactAt='),'cinematic cue '+cue);
  }
  assert.match(intro,/if impactAt then/);
  assert.match(intro,/currentStoryScene~=index then return end/);
  assert.match(intro,/storyArtwork\.Visible=showArtwork\s+storyForeground\.Visible=showFront/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)\s+local showArtwork=validImage and not showFront/);
  assert.match(intro,/remote:FireServer\("meadow:enter-world"\)/);
  assert.doesNotMatch(intro,/departingArtwork|departingForeground|frontScale|frontZoom/);
});


test('prologue reveals each single illustration with safe lighting and mobile reduced effects',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  for(const marker of [
    'local activeStoryRevealTween=nil',
    'local activeVignetteTween=nil',
    'if activeStoryRevealTween then activeStoryRevealTween:Cancel();activeStoryRevealTween=nil end',
    'if activeVignetteTween then activeVignetteTween:Cancel();activeVignetteTween=nil end',
    'local revealStart=reducedEffects and .38 or closeUp and .31',
    'local revealSeconds=reducedEffects and .62 or closeUp and .94',
    'activeStoryRevealTween=TweenService:Create(storyImage,',
    'activeStoryRevealTween:Play()',
    'local vignetteBase=cinematicVignette.BackgroundTransparency',
    'local vignettePulse=math.max((scene.cinema=="betrayal" or scene.cinema=="erasure") and .36 or .49,vignetteBase-.18)',
    'activeVignetteTween=TweenService:Create(cinematicVignette,',
    'task.delay(impactFade*.65,function()',
    'BackgroundTransparency=vignetteBase',
    'introDialogue.TextColor3=',
  ])assert.ok(intro.includes(marker),'missing intro direction: '+marker);
  assert.match(intro,/if impactAt then/);
  assert.match(intro,/if not entranceOpen or token~=runToken or currentStoryScene~=index then return end/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)\s+local showArtwork=validImage and not showFront/);
  assert.match(intro,/storyArtwork\.Visible=showArtwork\s+storyForeground\.Visible=showFront/);
  assert.match(intro,/storyForeground\.ScaleType=Enum\.ScaleType\.Fit/);
  assert.match(intro,/storyArtwork\.ScaleType=Enum\.ScaleType\.Fit/);
  assert.doesNotMatch(intro,/departingArtwork|departingForeground|frontScale|frontZoom/);
});

test('cinematic v4 locks portrait frames, times silent title reveals and makes single-image hard cuts',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  for(const marker of [
    'local lockedPortrait=closeUp or scene.cinema=="freeze"',
    'local lockedCamera=cinema=="crown" or cinema=="omen" or cinema=="betrayal"',
    'or cinema=="erasure" or cinema=="freeze"',
    'if lockedCamera then',
    'cameraMotionValue.Value=openingCamera.CFrame',
    'if storyImage.Visible then',
    'and (not reducedEffects or n<=14)',
    'local transitionCut=scene.cinema=="erasure" or scene.cinema=="rift"',
    'storyCurtain.BackgroundTransparency=.06',
    'local titlePause=scene.cinema=="crown" and .46',
    'local plateSeconds=scene.cinema=="dawn" and .78',
    'if activeCurtainTween then activeCurtainTween:Cancel();activeCurtainTween=nil end',
    'activeCurtainTween=TweenService:Create(storyCurtain,',
    'storyCurtain.BackgroundTransparency=1',
    'activeCurtainTween:Play()',
    'scene.cinema=="betrayal" or scene.cinema=="rift" or scene.cinema=="dawn"',
    'local finalHeight=scene.cinema=="betrayal" and .15',
    'or scene.cinema=="rift" and .14 or .065',
  ])assert.ok(intro.includes(marker),'cinematic direction missing: '+marker);
  assert.match(intro,/task\.delay\(titlePause,function\(\)\s+if not entranceOpen or token~=runToken or currentStoryScene~=index then return end/);
  assert.match(intro,/storyArtwork\.Visible=showArtwork\s+storyForeground\.Visible=showFront/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)\s+local showArtwork=validImage and not showFront/);
  assert.match(intro,/storyForeground\.Size=UDim2\.fromScale\(\.95,\.69\)/);
  assert.match(intro,/math\.clamp\(position\.X\.Scale\+slowX,0,maxX\)/);
  assert.match(intro,/math\.clamp\(position\.Y\.Scale\+slowY,0,maxY\)/);
  assert.match(intro,/skipButton\.Activated:Once\(finish\)/);
  assert.match(intro,/remote:FireServer\("meadow:enter-world"\)/);
  assert.equal([...intro.matchAll(/label\(introPanel,/g)].length,2);
  assert.doesNotMatch(intro,/departingArtwork|departingForeground|frontScale|frontZoom/);
});

test('touch-screen prologue keeps cinematic light, fog, zoom and impacts visible',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.match(client,/local reducedEffects=game:GetService\("UserInputService"\)\.TouchEnabled/);
  assert.match(intro,/cinematicShadow\.Visible=scene\.cinema~="dawn"/);
  assert.match(intro,/cinematicMist\.Visible=not silence/);
  assert.match(intro,/if storyImage.Visible then/);
  assert.match(intro,/if impactAt then/);
  assert.match(intro,/and \(not reducedEffects or n<=14\)/);
  assert.match(intro,/activeStoryColorTween=TweenService:Create\(storyImage,/);
  assert.match(intro,/ImageColor3=Color3\.fromRGB\(255,255,255\)/);
  assert.match(intro,/if activeStoryColorTween then activeStoryColorTween:Cancel\(\);activeStoryColorTween=nil end/);
  assert.doesNotMatch(intro,/cinematicShadow\.Visible=not reducedEffects/);
  assert.doesNotMatch(intro,/if impactAt and not reducedEffects then/);
  assert.match(intro,/skipButton\.Activated:Once\(finish\)/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)/);
});

test('prologue uses shadow, ink and fog instead of a bright scene flash',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/cinematicShadow\.Name="MemoryPassingShadow"/);
  assert.match(intro,/storyCurtain\.Name="MemoryInkCurtain"/);
  assert.match(intro,/activeShadowTween=TweenService:Create\(cinematicShadow,/);
  assert.match(intro,/cinematicMist\.Visible=not silence/);
  assert.match(intro,/local openingScale=showFront and \(scene\.cinema=="rift"/);
  assert.match(intro,/storyCurtain\.BackgroundColor3=Color3\.fromRGB\(6,9,13\)/);
  assert.doesNotMatch(intro,/CinematicLightSweep|impactColor=|impactOpacity=|introFlash|activeSceneFlashTween/);
  assert.match(intro,/if activeShadowTween then activeShadowTween:Cancel\(\);activeShadowTween=nil end/);
  assert.match(intro,/skipButton\.Activated:Once\(finish\)/);
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)/);
});

test('left and right dodge share 4-second server cooldown without changing guard balance',()=>{
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  const skill=server.slice(server.indexOf('local function meadowSkill(player,id,execute)'),server.indexOf('local function meadowHeavy(player)'));
  assert.match(skill,/nextReady=math\.max\(nextReady,cooldowns\[dodgeLeft\] or 0,cooldowns\[dodgeRight\] or 0\)/);
  assert.match(skill,/cooldowns\[dodgeLeft\]=nextCooldown\s+cooldowns\[dodgeRight\]=nextCooldown/);
  assert.match(skill,/player:SetAttribute\("MeadowReady_"\.\.dodgeRight,readyAt\)/);
  assert.match(server,/defense\.guardUntil=now\+2\.8/);
  assert.match(server,/defense\.perfectGuardUntil=now\+\.28/);
  assert.match(server,/damage=math\.ceil\(damage\*\.5\)/);
  assert.match(server,/defense\.dodgeUntil=now\+\.48/);
  assert.match(server,/\["skill-meadow-dodge-left"\]=4,\["skill-meadow-dodge-right"\]=4/);
});

test('cinematic foreground actors use approved PNG cuts with scene-specific acting and safe depth',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  const shots=intro.match(/local portraitShots=\{([\s\S]*?)\n    \}/);
  assert.ok(shots);
  for(const scene of ['crown','omen','betrayal','reach','erasure','rift','dawn','relic']){
    assert.match(shots[1],new RegExp('\\b'+scene+'=true\\b'),'missing approved actor scene '+scene);
  }
  assert.match(intro,/local showFront=validFront and \(portraitShots\[scene\.cinema\]==true or not validImage\)/);
  assert.match(intro,/local showArtwork=validImage and not showFront/);
  assert.match(intro,/storyArtwork\.Visible=showArtwork\s+storyForeground\.Visible=showFront/);
  assert.match(intro,/local portraitId=portraitShots\[scene\.cinema\]/);
  assert.match(intro,/local actorBeat=scene\.cinema=="crown"/);
  assert.match(intro,/activeActorGestureTween=TweenService:Create\(storyImage,/);
  assert.match(intro,/activeActorEraseTween=TweenService:Create\(storyImage,/);
  assert.match(intro,/activeDepthTween=TweenService:Create\(storyVisionGradient,/);
  assert.match(intro,/activeFogDepthTween=TweenService:Create\(mistFalloff,/);
  assert.match(intro,/if activeActorGestureTween then activeActorGestureTween:Cancel\(\);activeActorGestureTween=nil end/);
  assert.match(intro,/if activeDepthTween then activeDepthTween:Cancel\(\);activeDepthTween=nil end/);
  assert.match(intro,/if activeFogDepthTween then activeFogDepthTween:Cancel\(\);activeFogDepthTween=nil end/);
  assert.match(intro,/skipButton\.Activated:Once\(finish\)/);
  assert.doesNotMatch(intro,/Instance\.new\("Part"\)|CinematicLightSweep/);
});

test('prologue makes audio, silhouette and scene changes on authored story beats',()=>{
  const intro=client.slice(client.indexOf('-- [메인 스토리 오프닝]'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/introBeatSound\.Name="MeadowPrologueBeat"/);
  assert.match(intro,/introBeatSound\.SoundId="rbxasset:\/\/sounds\/action_jump_land\.mp3"/);
  assert.match(intro,/introBeatSound\.SoundGroup=meadowEffectsGroup/);
  assert.match(intro,/introBeatSound:Stop\(\)\s+introBeatSound:Destroy\(\)/);
  assert.match(intro,/introBeatSound\.PlaybackSpeed=scene\.cinema=="betrayal"/);
  assert.match(intro,/introBeatSound:Play\(\)/);
  assert.match(intro,/for step=1,2 do\s+task\.delay\(step\*\.34,function\(\)/);
  assert.match(intro,/local audioLevel=silence and 0 or scene\.cinema=="siege"/);
  assert.match(intro,/art=activeStoryFocusTween/);
  assert.match(intro,/task\.delay\(math\.max\(\.4,scene\.seconds-\.52\),function\(\)/);
  assert.match(intro,/local revealSeconds=reducedEffects and 2\.4 or 3\.4/);
  assert.match(intro,/TweenService:Create\(reveal,TweenInfo\.new\(1\.25,Enum\.EasingStyle\.Sine\)/);
  assert.match(intro,/local portraitShots=\{/);
  assert.match(intro,/remote:FireServer\("meadow:enter-world"\)/);
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
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.72\*brace/);
  assert.match(client,/skillMotionTargets\.UpperArmL=CFrame\.Angles\(-\.96\*brace/);
  assert.match(client,/skillMotionTargets\.ShinL=CFrame\.identity/);
  assert.match(client,/-- \[완벽 막기\] 세키로식 짧은 전방 쳐내기 동작/);
  assert.match(client,/skillMotionTargets\.UpperArmR=CFrame\.Angles\(-1\.75\*brace/);
  // [입자] 실제 서버 적중만 대형 불꽃, 막기 진입은 팔 궤적과 약한 잔광.
  assert.match(client,/overrideVfx=="BLOCK_CONTACT"/);
  assert.match(client,/overrideVfx=="PARRY_CONFIRMED"/);
  assert.match(client,/textureKey="slash",hideRing=true/);
  assert.match(client,/count=reducedEffects and \(perfect and 7 or 4\)/);
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
