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
  const boundary=client.indexOf('\nend\n\n-- [첫 화면]');
  assert.ok(boundary>0);
  const after=client.slice(boundary);
  assert.ok(after.includes('editLayoutButton.Parent=meadowPages[4]'));
  assert.ok(after.includes('if info[1]=="MEADOW_INVENTORY" then meadowMenu.open(2)'));
  assert.ok(after.includes('energyFill.Size=UDim2.fromScale'));
  assert.ok(after.includes('energyLabel.Text=ready and string.format'));
});

test('touch dock retains authoritative original actions and server request path',()=>{
  assert.match(client,/button\.Activated:Connect\(function\(\)\s*if gui:GetAttribute\("GameMenuOpen"\)==true then return end\s*activateMeadowAction\(skillActionId\)/);
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
  assert.match(server,/closest<11 and "RUN" or "WALK"/);
  assert.match(visual,/deer=107866382568249/);
  assert.doesNotMatch(client,/Instance\.new\("Part"\).*Deer/);
});
