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

test('mobile interaction highlight uses actual server prompt activation range',()=>{
  assert.match(client,/local function updateMeadowPromptHighlight\(\)[\s\S]*?Magnitude<=prompt\.MaxActivationDistance/);
  assert.match(client,/promptService\.PromptShown:Connect\(function\(prompt\)/);
  assert.match(client,/promptService\.PromptHidden:Connect\(function\(prompt\)/);
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


test('reference landscape HUD keeps original combat authority and screenshot composition',()=>{
  for(const marker of [
    'local meadowPaintedHudAtlas=', 'MeadowReferenceTopMenu','MeadowReferenceHotbar',
    'ReferencePrimarySword','ReferenceJump','ReferenceCharacterPortrait',
    'ReferenceCharacterName','ReferenceHotbar','ReferenceMenu',
    'local referenceMenuItems=', 'local referenceHotbarSlots={}',
    'local hotbarActions={','local function layoutMeadowReferenceHud()',
    'local step=landscape and math.floor(math.clamp(v.X/21,30,36))',
    'meadowReferenceHotbar.Position=UDim2.new(.5,landscape and -40 or 0',
    'meadowSkillButtons.primarySword.Position=UDim2.fromOffset(math.floor(127*scale)',
    'meadowHealthTrack.Position=UDim2.fromOffset(66,top+17)',
    'meadowEnergy.Position=UDim2.fromOffset(66,top+36)',
    'questTracker.Position=UDim2.fromOffset(v.X-width-12,top)',
    'local visualX=row[1]+(saved[1]-default[1])*212',
    'local visualY=row[2]+(saved[2]-default[2])*216',
    'meadowRadar:GetAttribute("ReferenceRadarVisible")==true and gui:GetAttribute("GameMenuOpen")~=true',
    'mapToggle.Activated:Connect(function()'
  ])assert.ok(client.includes(marker),'missing reference HUD: '+marker);
  for(const page of ['{"캐릭",1,10}','{"제작",2,11}','{"건설",0,12}',
    '{"도감",3,13}','{"연구일지",3,14}','{"설정",4,15}']){
    assert.ok(client.includes(page),'top menu icon/page missing: '+page);
  }
  assert.match(client,/for index=1,10 do[\s\S]*?referenceHotbarSlots\[index\]=slot/);
  assert.match(client,/meadowPrimarySword\.Activated:Connect\(function\(\)[\s\S]*?activateMeadowAction\(primaryCombatAction\.Id\)/);
  assert.match(client,/meadowReferenceJump\.Activated:Connect\(function\(\)[\s\S]*?human\.Jump=true/);
  assert.match(client,/heading=heading\.Unit[\s\S]*?offset=-heading/);
  assert.match(client,/title\.Text = "" -- \[시안\]/);
  // The 16 original icons are 640x40, not the old 8-cell 512x64 fallback.
  assert.match(client,/ImageRectSize=Vector2\.new\(meadowPaintedHudAtlas~="" and 40 or 64/);
  for(const [w,h] of [[1536,709],[852,393],[720,400],[640,360],[390,844],[360,640]]){
    const landscape=w>h;
    const step=landscape?Math.floor(Math.max(30,Math.min(36,w/21)))
      :Math.floor(Math.max(33,Math.min(40,w/9.8)));
    const width=step*6;
    assert.ok(w-width-9>0,'top menu clipped '+w+'x'+h);
    const slot=landscape?Math.floor(Math.max(30,Math.min(40,w/21)))
      :Math.floor(Math.max(26,Math.min(34,w/11.5)));
    assert.ok((slot+2)*10-2<=w,'hotbar clipped '+w+'x'+h);
    const scale=landscape?Math.max(.76,Math.min(1.12,(h-20)/370))
      :Math.max(.76,Math.min(1,w/390));
    const rightWidth=Math.floor(212*scale);
    const rightBottom=Math.floor((landscape?12:104)*scale);
    assert.ok(rightWidth<w,'combat dock too wide '+w+'x'+h);
    assert.ok(rightBottom+Math.floor(216*scale)<h,
      'combat touch dock clipped '+w+'x'+h);
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

test('intro renders only one of original painted backdrop and separated 3D actor',()=>{
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  const art=config.match(/CinematicIntroSceneIds\s*=\s*\{([^}]+)\}/);
  const front=config.match(/CinematicIntroForegroundIds\s*=\s*\{([^}]+)\}/);
  assert.ok(art&&front,'approved originals must be preserved for existing game data');
  const backgrounds=[...art[1].matchAll(/rbxassetid:\/\/(\d+)/g)].map(x=>x[1]);
  const foregrounds=[...front[1].matchAll(/\[(\d+)\]="rbxassetid:\/\/(\d+)"/g)];
  assert.equal(backgrounds.length,12);
  assert.equal(foregrounds.length,11);
  assert.equal(new Set([...backgrounds,...foregrounds.map(x=>x[2])]).size,23);
  const intro=client.slice(client.indexOf('  local function startIntro(isFresh)'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/local artworkId=\(Config\.CinematicIntroSceneIds or \{\}\)\[index\]/);
  assert.match(intro,/local foregroundId=\(Config\.CinematicIntroForegroundIds or \{\}\)\[index\]/);
  assert.match(intro,/local actorShot=scene\.cinema=="charge" or scene\.cinema=="reach"/);
  assert.match(intro,/local useWorldActor=actorShot and foregroundAvailable/);
  assert.match(intro,/local usePaintedBackdrop=artworkAvailable and not useWorldActor/);
  assert.match(intro,/setIntroPlayerHidden\(useWorldActor and scene\.actor=="PLAYER"\)/);
  assert.match(client,/local function setIntroPlayerHidden\(hidden\)/);
  assert.match(client,/if part\.Parent then part\.LocalTransparencyModifier=transparency end/);
  assert.match(client,/setIntroPlayerHidden\(false\)/);
  assert.match(intro,/storyArtwork\.Visible=usePaintedBackdrop/);
  assert.match(intro,/storyForeground\.Visible=useWorldActor/);
  assert.match(intro,/storyArtwork\.Image=usePaintedBackdrop and artworkId or ""/);
  assert.match(intro,/storyForeground\.Image=useWorldActor and foregroundId or ""/);
  assert.match(intro,/backdrop\.BackgroundTransparency=usePaintedBackdrop and \.06 or 1/);
  assert.match(client,/local storyPaintStage=Instance\.new\("Frame"\)/);
  assert.match(client,/storyPaintStage\.Name="IntroPainted25DStage"/);
  assert.match(client,/storyPaintStage\.ClipsDescendants=true/);
  assert.match(client,/storyArtwork\.Parent=storyPaintStage/);
  assert.match(intro,/storyPaintStage\.Visible=usePaintedBackdrop/);
  assert.match(client,/storySky\.Name="PrologueDistantSky"/);
  assert.match(client,/storyGround\.Name="PrologueNearGround"/);
  assert.match(intro,/storySky\.ImageRectOffset=Vector2\.new\(0,0\)/);
  assert.match(intro,/storyArtwork\.ImageRectOffset=Vector2\.new\(0,skyHeight\)/);
  assert.match(intro,/storyGround\.ImageRectOffset=Vector2\.new\(0,skyHeight\+middleHeight\)/);
  assert.match(intro,/storySky\.ImageRectSize=Vector2\.new\(imageWidth,skyHeight\)/);
  assert.match(intro,/storyArtwork\.ImageRectSize=Vector2\.new\(imageWidth,middleHeight\)/);
  assert.match(intro,/storyGround\.ImageRectSize=Vector2\.new\(imageWidth,groundHeight\)/);
  assert.match(intro,/local planes=\{/);
  assert.match(intro,/for _,plane in ipairs\(planes\) do/);
  assert.match(intro,/activePaintTweens\[#activePaintTweens\+1\]=motion/);
  assert.match(intro,/local actual=storyArtwork\.ContentImageSize/);
  assert.match(client,/for _,motion in ipairs\(activePaintTweens\) do motion:Cancel\(\) end/);
  assert.match(intro,/activeActorGestureTween=TweenService:Create\(storyForeground,/);
  assert.match(intro,/ContentProvider"\):PreloadAsync\(ids\)/);
  assert.match(client,/local cinematicLight=Instance\.new\("Frame"\)/);
  assert.match(client,/spark\.Image="rbxasset:\/\/textures\/particles\/sparkles_main\.dds"/);
  assert.match(intro,/activeLightTween=TweenService:Create\(cinematicLight,/);
  assert.match(intro,/if cinematicLight\.Visible then activeLightTween:Play\(\) end/);
  assert.match(client,/storyFarHaze\.ZIndex=7/);
  assert.match(intro,/activeFarHazeTween=TweenService:Create\(storyFarHaze,/);
  assert.match(client,/if activeFarHazeTween then activeFarHazeTween:Cancel\(\);activeFarHazeTween=nil end/);
  assert.match(intro,/cinematicShadow\.Visible=activeVisual and not reducedEffects and isDramatic/);
  assert.match(intro,/storyVision\.Visible=false/);
  assert.doesNotMatch(intro,/storyArtwork\.Visible=true.*storyForeground\.Visible=true/s);
  assert.match(intro,/spark\.ImageTransparency=\.52/);
  assert.doesNotMatch(intro,/spark\.BackgroundTransparency=\.44/);
  assert.match(client,/if activeLightTween then activeLightTween:Cancel\(\);activeLightTween=nil end/);
  assert.match(client,/storyArtwork\.ScaleType=Enum\.ScaleType\.Stretch/);
  assert.match(client,/storyForeground\.ScaleType=Enum\.ScaleType\.Fit/);
  assert.match(client,/storyPaintStage\.Size=UDim2\.fromOffset\(math\.floor\(fitWidth\),math\.floor\(fitWidth\/ratio\)\)/);
  assert.doesNotMatch(intro,/openingScale/);
});

test('native world prologue preserves all twelve scripted beats and camera coverage',()=>{
  const intro=client.slice(client.indexOf('  local function startIntro(isFresh)'),client.indexOf('  local function loadRegion('));
  const sceneTable=intro.match(/local scenes=\{([\s\S]*?)\n    \}\n    local total=0/);
  assert.ok(sceneTable);
  assert.deepEqual([...sceneTable[1].matchAll(/cinema="([^"]+)"/g)].map(x=>x[1]),[
    'siege','charge','crown','freeze','omen','betrayal','reach','erasure','rift','dawn','relic','journey'
  ]);
  assert.deepEqual([...sceneTable[1].matchAll(/seconds=(\d+),title=/g)].map(x=>Number(x[1])),
    [5,5,5,4,5,6,5,4,5,6,5,5]);
  for(const key of ['RUIN_1','RUIN_2','RUIN_3','PLAYER']){
    assert.ok(sceneTable[1].includes('actor="'+key+'"'),key+' real source missing');
  }
  for(const cue of [
    'world:FindFirstChild("Meadow_"..(scene.actor=="RUIN_1"',
    'root.Position+Vector3.new(0,scene.actor=="PLAYER" and 1.6 or 3,0)',
    'cameraMotionConnection=RunService.RenderStepped:Connect(function()',
    'liveCamera.CFrame=CFrame.lookAt(at+offset,target)*CFrame.Angles(0,0,roll)',
    'activeTween=TweenService:Create(cameraMotionValue,',
    'Value=ending',
    'camera.CameraType=Enum.CameraType.Scriptable',
    'storyArtwork.Visible=usePaintedBackdrop','storySky.Visible=usePaintedBackdrop',
    'storyGround.Visible=usePaintedBackdrop','storyForeground.Visible=useWorldActor',
    'backdrop.BackgroundTransparency=usePaintedBackdrop and .06 or 1',
    'introPanel.BackgroundTransparency=usePaintedBackdrop and .1 or 1',
    'skipButton.Activated:Once(finish)',
    'closeArrival(true)',
  ]) assert.ok(intro.includes(cue),'world film marker missing: '+cue);
  assert.doesNotMatch(intro,/Instance\.new\("Part"\)|CreateHumanoidModelFromDescription|Humanoid:MoveTo|character:PivotTo|player.Character:PivotTo/);
  assert.match(client,/remote:FireServer\("meadow:enter-world"\)/);
});

test('2.5D gameplay camera follows the actual Roblox mesh with mobile-safe transition',()=>{
  assert.match(client,/BindToRenderStep\("MeadowPainted25DCamera"/);
  assert.match(client,/Enum\.RenderPriority\.Camera\.Value\+1/);
  assert.match(client,/if player:GetAttribute\("MeadowEnteredWorld"\)~=true or meadowCameraMode~=3 then/);
  assert.match(client,/local meadowCameraModes=\{"자유 3D","근접 3D","2.5D 경사"\}/);
  assert.match(client,/local focus=root\.Position\+Vector3\.new\(0,2\.5,0\)\+heading\*/);
  assert.match(client,/camera\.CFrame=paintedCameraFrame/);
  assert.match(client,/camera\.FieldOfView=portrait and 48 or 51/);
  const intro=client.slice(client.indexOf('  local function closeArrival(showVillageReveal)'),client.indexOf('  local function loadRegion('));
  assert.equal([...intro.matchAll(/player:SetAttribute\("MeadowEnteredWorld",true\)/g)].length,1);
  assert.match(intro,/local function finishArrival\(\)/);
  assert.doesNotMatch(intro,/Instance\.new\("Part"\)|Instance\.new\("WedgePart"\)/);
});

test('native world cinematic protects the mobile screen and restores controls and camera',()=>{
  const intro=client.slice(client.indexOf('-- [2.5D 오프닝 / 메인]'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/local portrait=size\.Y>size\.X\*1\.1/);
  assert.match(intro,/introDialogue\.Position=UDim2\.fromScale\(\.5,portrait and \.860 or \.856\)/);
  assert.match(intro,/storyCurtain\.BackgroundColor3=Color3\.fromRGB\(5,8,11\)/);
  assert.match(intro,/activeCurtainTween=TweenService:Create\(storyCurtain,/);
  assert.match(intro,/storyCurtain\.BackgroundTransparency=0/);
  assert.match(intro,/if cameraMotionConnection then cameraMotionConnection:Disconnect\(\);cameraMotionConnection=nil end/);
  assert.match(intro,/if cameraMotionValue then cameraMotionValue:Destroy\(\);cameraMotionValue=nil end/);
  assert.match(intro,/openingCamera\.CameraType=Enum\.CameraType\.Custom/);
  assert.match(intro,/arrivalControls\(true\)/);
  assert.match(intro,/meadowVitalsGui\.Enabled=true/);
  assert.match(intro,/introBeatSound:Destroy\(\)/);
  assert.match(intro,/local function closeArrival\(showVillageReveal\)/);
  assert.match(intro,/local revealSeconds=reducedEffects and 2\.4 or 3\.4/);
  assert.match(intro,/TweenService:Create\(reveal,TweenInfo\.new\(1\.25,Enum\.EasingStyle\.Sine\)/);
  assert.equal([...intro.matchAll(/label\(introPanel,/g)].length,2,'title and subtitles only');
});

test('twelve real-world beats use existing sound, movement and narration instead of images',()=>{
  const intro=client.slice(client.indexOf('  local function startIntro(isFresh)'),client.indexOf('  local function loadRegion('));
  assert.match(intro,/introBeatSound\.PlaybackSpeed=scene\.cinema=="betrayal"/);
  assert.match(intro,/introBeatSound:Play\(\)/);
  assert.match(intro,/local isSilent=scene\.cinema=="freeze" or scene\.cinema=="erasure"/);
  assert.match(intro,/local beatAt=\(scene\.cinema=="siege" or scene\.cinema=="charge"\)/);
  assert.match(intro,/regionIntro\.Text=scene\.title/);
  assert.match(intro,/introDialogue\.Text=scene\.subtitle/);
  assert.match(intro,/introDialogue\.MaxVisibleGraphemes=i/);
  assert.match(intro,/regionIntro\.MaxVisibleGraphemes=count/);
  assert.match(intro,/task\.delay\(scene\.seconds-\.55,function\(\)/);
  assert.match(intro,/TweenService:Create\(cinematicBars\[1\]/);
  assert.match(intro,/TweenService:Create\(cinematicBars\[2\]/);
  assert.doesNotMatch(intro,/storyImage|showFront|showArtwork|portraitShots|CinematicLightSweep/);
});

test('twelve cinematic beats use licensed particle VFX and weather grading without fake actors',()=>{
  const intro=client.slice(client.indexOf('  local function startIntro(isFresh)'),client.indexOf('  local function loadRegion('));
  for(const source of [
    'local approvedFXModule=Shared:FindFirstChild("RobloxCommonVFX")',
    'pcall(approvedFX.Create,asset,{',
    'hideFlash=true,hideRing=true,particlesOnly=true',
    'DESTRUCTION_BURST','WEATHER_GUST_PULSE','BOSS_WARNING_PULSE',
    'STATUS_PULSE','DEBUFF_PULSE','CRITICAL_BURST','DISMANTLE_SHARDS',
    'ENVIRONMENT_MOTE_PULSE','QUEST_UPDATE_PULSE',
    'local introGrade=Instance.new("ColorCorrectionEffect")',
    'local introBloom=Instance.new("BloomEffect")',
    'local introBlur=Instance.new("BlurEffect")',
    'local introDepth=Instance.new("DepthOfFieldEffect")',
    'activeSubjectHighlight=Instance.new("Highlight")',
    'TweenService:Create(introGrade,',
    'TweenService:Create(introBloom,',
    'TweenService:Create(introBlur,',
    'if introDepth.Enabled then introDepth.FocusDistance=(target-at).Magnitude end',
    'activeFovTween=TweenService:Create(camera,',
    'playSceneFX(scene,activeScene)',
    'introGrade:Destroy()','introBloom:Destroy()',
    'introBlur:Destroy()','introDepth:Destroy()',
  ]) assert.ok(intro.includes(source),'cinematic effect missing: '+source);
  assert.ok(intro.indexOf('local introGrade=Instance.new')<intro.indexOf('local function finish()'),
    'skip cleanup must capture live effect locals');
  assert.doesNotMatch(intro,/actor="Guard"|actor="Elder"|actor="Tracker"/);
  assert.doesNotMatch(intro,/Instance\.new\("Part"\)|CreateHumanoidModelFromDescription/);
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
