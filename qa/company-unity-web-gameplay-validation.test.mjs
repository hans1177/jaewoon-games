// 파일명: qa/company-unity-web-gameplay-validation.test.mjs
// 역할: 기존 실제 브라우저 QA의 승인된 Unity 환경 메시·증거 해시 검증 회귀.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/company-unity-web-gameplay-validation.mjs',import.meta.url),'utf8');

const daechungUnitySource=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');

test('Daechung Unity Web exposes a genuine initial hunt control before browser QA touches it',()=>{
  const start=daechungUnitySource.indexOf('private void DrawPrimaryCombatActionButton()');
  const end=daechungUnitySource.indexOf('private void DrawTownControls()',start);
  assert.ok(start>=0&&end>start);
  const action=daechungUnitySource.slice(start,end);
  assert.match(action,/canEnterHunt = _enemy == null && _core != null && _core\.Player\.currentRegionId == "town"/);
  assert.match(action,/if \(_enemy == null && !canEnterHunt\) return;/);
  assert.match(action,/MOBILE_TARGET game=daechung-rpg role=action/);
  assert.match(action,/GUI\.Button\(actionRect, canEnterHunt \? "HUNT" : "ATTACK"\)/);
  assert.match(action,/if \(canEnterHunt\) MoveTo\("field-1"\);\s*else AttackEnemy\(\);/);
  assert.match(action,/MOBILE_INPUT game=daechung-rpg role=action status=PASS/);
  assert.ok(action.indexOf('MOBILE_TARGET')<action.indexOf('GUI.Button(actionRect'));
  assert.doesNotMatch(action,/if \(_enemy == null\) return;/);
});

test('Daechung WebGL request always builds the exact current main source and claims no synthetic QA PASS',()=>{
  const file=new URL('../.build-requests/unity-web/daechung-rpg.json',import.meta.url);
  const request=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(request.kind,'UNITY_WEB_DEVELOPMENT_FLOOR_BUILD');
  assert.equal(request.gameId,'daechung-rpg');
  assert.equal(request.projectPath,'unity-games/daechung-rpg');
  assert.equal(request.buildMethod,'JaewoonGames.DaechungRpg.Editor.AndroidTestBuild.BuildWeb');
  assert.equal(request.sourceCommit,'');
  assert.equal(request.outputRoot,'web-games/daechung-rpg');
  assert.equal(request.fullGameplayPassAuthority,undefined);
  assert.equal(request.postGatePlatformPipelineChanged,undefined);
});

test('Unity Web performance QA samples live gameplay frames instead of treating boot time as FPS proof',()=>{
  const gameplay=source.indexOf('UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING');
  const frame=source.indexOf('const framePacing=await page.evaluate');
  const returnInput=source.indexOf("await page.keyboard.press('KeyR')");
  assert.ok(gameplay>=0&&frame>gameplay&&returnInput>frame,'sample while gameplay is active');
  assert.match(source,/requestAnimationFrame\(onFrame\)/);
  assert.match(source,/framePacing\.frameCount<25/);
  assert.match(source,/framePacing\.medianFrameMs>38/);
  assert.match(source,/framePacing\.p95FrameMs>100/);
  assert.match(source,/throw new Error\('UNITY_WEB_QA_FRAME_PACING_FAILED:'/);
  assert.match(source,/measurementSurface:'PLAYWRIGHT_MOBILE_BROWSER_EMULATION'/);
  assert.match(source,/realDeviceVerified:false/);
  assert.match(source,/performance:\{pass:bootMilliseconds<=90000&&fatal.length===0&&framePacing\.medianFrameMs<=38/);
});

test('실제 플레이 가능한 개발 WebGL만 공개하되 저성능 QA 실패는 PASS로 조작하지 않는다',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  const frameAt=source.indexOf('const framePacingFailed=');
  const saveAt=source.indexOf("fs.writeFileSync(output,JSON.stringify(evidence");
  const failAt=source.indexOf("throw new Error('UNITY_WEB_QA_FRAME_PACING_FAILED:");
  assert.ok(frameAt>=0&&saveAt>frameAt&&failAt>saveAt,'store honest failure evidence before rejecting FPS QA');
  assert.match(source,/pass:!performanceBlocked/);
  assert.match(source,/const performanceBlocked=framePacingFailed\|\|bootMilliseconds>90000/);
  assert.match(source,/playableBrowserTest:true/);
  assert.match(source,/reason:framePacingFailed\?'UNITY_WEB_QA_FRAME_PACING_FAILED':/);
  assert.match(source,/bootMilliseconds>90000\?'UNITY_WEB_QA_BOOT_SLOW_FAILED':null/);
  assert.equal((workflow.match(/continue-on-error: \$\{\{ steps\.request\.outputs\.game_id == 'daechung-rpg' \}\}/g)||[]).length,3);
  assert.match(workflow,/const playable=checks\.every\(e=>e\.playableBrowserTest===true/);
  assert.match(workflow,/if\(!playable\)throw new Error\('UNITY_WEB_REAL_BROWSER_PLAYABILITY_REQUIRED'\)/);
  assert.match(workflow,/const gatePass=checks\.every\(e=>e\.pass===true&&e\.performance\?\.pass===true\)/);
  assert.match(workflow,/actualBrowserPlay:gatePass\?'PASS':'PLAYABLE_TEST_ONLY'/);
  assert.match(workflow,/validationSurfaceOnly:!gatePass/);
  assert.match(workflow,/if: steps\.readiness\.outputs\.pass != 'true'/);
  assert.match(workflow,/UNITY_WEB_FLOOR_STATE=REPAIR_REQUIRED/);
  assert.match(workflow,/UNITY_WEB_SOURCE_SUPERSEDED_BY_NEW_MAIN_REBUILD_REQUIRED/);
  assert.match(workflow,/UNITY_WEB_SOURCE_SUPERSEDED_DURING_PREVIEW_REBUILD_REQUIRED/);
});

test('Unity Web gameplay validation focuses the real canvas before keyboard input',()=>{
  assert.match(source,/const canvas=page\.locator\('canvas'\)\.first\(\)/);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('Digit1'\)/s);
  assert.match(source,/canvasFocusedBeforeKeyboard:true/);
});

test('Unity Web gameplay validation falls back to real browser touch before rejecting gameplay start',()=>{
  const keyAt=source.indexOf("await page.keyboard.press('Digit1')");
  const fallbackAt=source.indexOf("gameplayStartInput='REAL_BROWSER_TOUCH_FALLBACK'");
  const touchAt=source.indexOf('await page.touchscreen.tap(touchX,touchY)',fallbackAt);
  const failureAt=source.indexOf("throw new Error('UNITY_WEB_QA_GAMEPLAY_START_MISSING')");
  assert.ok(keyAt>=0);
  assert.ok(fallbackAt>keyAt);
  assert.ok(touchAt>fallbackAt);
  assert.ok(failureAt>touchAt);
  assert.match(source,/gameplayStartInput='KEYBOARD_DIGIT1'/);
  assert.match(source,/input:\{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT_AND_REAL_BROWSER_TOUCH',mobileInputObserved,canvasFocusedBeforeKeyboard:true,gameplayStartInput\}/);
});

test('Unity Web gameplay validation refocuses canvas before follow-up keyboard regression actions',()=>{
  assert.match(source,/await canvas\.focus\(\);\s*for\(let i=0;i<20/s);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('KeyR'\)/s);
});

test('approved native world must be observed in the real mobile WebGL browser before gameplay QA accepts it',()=>{
  assert.match(source,/const approvedEnvironment=deployManifest\.approvedEnvironment\|\|\{required:false\}/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_DEPLOY_BINDING_INVALID/);
  assert.match(source,/text\.includes\('UNITY_WEB_WORLD='\)/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_NATIVE_AUTHORING_FAILED/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_MESH_NOT_OBSERVED/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_GEOMETRY_COUNT_MISMATCH/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_VISUAL_RUNTIME_NOT_READY/);
  assert.match(source,/runtimeObserved:approvedEnvironment\.required===true\?Boolean\(worldMeshMarker\):false/);
  assert.match(source,/collisionPhysicsVerified:false/);
  const boot=source.indexOf("UNITY_WEB_QA_BOOT_MARKER_MISSING");
  const check=source.indexOf("UNITY_WEB_APPROVED_ENVIRONMENT_MESH_NOT_OBSERVED");
  const gameplay=source.indexOf("UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING");
  assert.ok(boot>=0&&check>boot&&gameplay>check);
});

test('approved environment deployment identity comes from the existing checked-out Unity project, not synthetic worker PASS',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/approved=pathlib\.Path\('unity-games'\)\/game\/'Assets\/Resources\/vibe-world-layout\.json'/);
  assert.match(workflow,/'layoutSha256':hashlib\.sha256\(blob\)\.hexdigest\(\)/);
  assert.match(workflow,/'required':True/);
  assert.match(workflow,/'required':False/);
  assert.match(workflow,/if layout\.get\('layoutStatus'\)!='STATIC_LAYOUT_PROPOSED'/);
  assert.match(workflow,/\(root\/'unity-web-deploy-manifest\.json'\)\.write_text/);
});

test('Unity Web mobile QA selects the Android Chrome mobile branch and rejects offscreen actions',()=>{
  // 모바일 기기 크기만 지정하면 기본 데스크톱 UA 때문에 Unity가 960px 템플릿으로 진입한다.
  assert.match(source,/const \{chromium,devices\}=await import\('playwright'\)/);
  assert.match(source,/const androidChrome=devices\['Pixel 5'\]/);
  assert.match(source,/androidChrome\?\.userAgent\?\.includes\('Android'\)/);
  assert.match(source,/browser\.newPage\(\{\.\.\.androidChrome,viewport:mobileViewport\}\)/);
  assert.match(source,/UNITY_WEB_QA_ANDROID_VIEWPORT_MISMATCH/);
  assert.match(source,/mobileLayout\.documentWidth>mobileViewport\.width\+2/);
  assert.match(source,/UNITY_WEB_QA_REAL_MOBILE_ACTION_OFFSCREEN/);
  assert.match(source,/touchX>=mobileViewport\.width/);
  assert.match(source,/touchY>=mobileViewport\.height/);
  assert.match(source,/layout:mobileLayout/);
  assert.match(source,/fs\.writeFileSync\(screenshot,liveCapture\)/);
  assert.doesNotMatch(source,/fullPage:true/);
  const browserStart=source.indexOf('const androidChrome=devices');
  const boot=source.indexOf('UNITY_WEB_QA_BOOT_MARKER_MISSING');
  const realMobileBounds=source.indexOf('UNITY_WEB_QA_REAL_MOBILE_ACTION_OFFSCREEN');
  const tap=source.indexOf('await page.touchscreen.tap(touchX,touchY)');
  assert.ok(browserStart>=0&&boot>browserStart&&realMobileBounds>boot&&tap>realMobileBounds);
});

test('Unity Web visual QA reads actual gameplay pixels and detects missing shaders and clipped mobile controls',()=>{
  const gameplay=source.indexOf('UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING');
  const capture=source.indexOf('const liveCapture=await page.screenshot');
  const returnInput=source.indexOf("await page.keyboard.press('KeyR')");
  assert.ok(gameplay>=0&&capture>gameplay&&returnInput>capture,'pixel sample belongs to active gameplay');
  assert.match(source,/createImageBitmap\(new Blob\(/);
  assert.match(source,/context\.getImageData\(0,0,sampleWidth,sampleHeight\)/);
  assert.match(source,/visualPixels\.magentaRatio>=\.25/);
  assert.match(source,/visualPixels\.dominantColorRatio>=\.997/);
  assert.match(source,/mobileUiBounds\.clipped\.length>0/);
  assert.match(source,/pass:!performanceBlocked&&!visualBlocked&&!renderBudgetExceeded/);
  assert.match(source,/UNITY_WEB_QA_VISUAL_RUNTIME_REPAIR_REQUIRED/);
  assert.match(source,/source:'REAL_GAMEPLAY_SCREENSHOT_PIXEL_READBACK'/);
  assert.match(source,/captureSha256:liveCaptureSha256/);
  assert.match(source,/crypto.createHash\('sha256'\).update\(liveCapture\).digest\('hex'\)/);
  assert.match(source,/realDeviceVerified:false/);
});

test('Unity Web renderer cost evidence is measured only from real Unity markers, never made-up counters',()=>{
  assert.match(source,/RENDER_STATS/);
  assert.match(source,/source=UNITY_NATIVE_RENDERER/);
  assert.match(source,/drawCallsMax:500,trianglesMax:250000/);
  assert.match(source,/measurementState:nativeRenderCountersMeasured\?'MEASURED_NATIVE_COUNTERS':'UNKNOWN_NOT_RECORDED'/);
  assert.match(source,/pass:nativeRenderCountersMeasured\?!renderBudgetExceeded:null/);
  assert.match(source,/automaticLodOrTextureMutationPerformed:false/);
  assert.match(source,/UNITY_WEB_QA_NATIVE_RENDER_BUDGET_EXCEEDED/);
});

test('Daechung real Unity renderer exposes only measured draw calls and polygons in WebGL QA',()=>{
  const runtime=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');
  assert.match(runtime,/using Unity\.Profiling;/);
  assert.match(runtime,/ProfilerRecorder\.StartNew\(ProfilerCategory\.Render, "Draw Calls Count"\)/);
  assert.match(runtime,/ProfilerRecorder\.StartNew\(ProfilerCategory\.Render, "Triangles Count"\)/);
  assert.match(runtime,/_drawCallsRecorder\.LastValue > 0 && _trianglesRecorder\.LastValue > 0/);
  assert.match(runtime,/RENDER_STATS game=daechung-rpg source=UNITY_NATIVE_RENDERER/);
  assert.match(runtime,/_drawCallsRecorder\.Dispose\(\)/);
  assert.match(runtime,/_trianglesRecorder\.Dispose\(\)/);
});

test('native Unity canvas UI stays inside mobile bounds with real runtime measurements',()=>{
  const runtime=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');
  assert.match(runtime,/UI_BOUNDS game=daechung-rpg surface=UNITY_ONGUI/);
  assert.match(runtime,/controlsHeight = Mathf\.Max\(1f, _actionButtonRect\.yMin - 10f - menuY\)/);
  assert.match(runtime,/buttonWidth = Mathf\.Min\(Mathf\.Max\(1f, safe\.width - margin \* 2f\)/);
  assert.match(source,/const nativeUiMarker=markers\.slice\(\)\.reverse\(\)\.find/);
  assert.match(source,/const nativeUiOffscreen=nativeUiMeasured/);
  assert.match(source,/withinNativeViewport\(nativeUiRect\.controlsLeft,nativeUiRect\.controlsY,nativeUiRect\.controlsWidth,nativeUiRect\.controlsHeight\)/);
  assert.match(source,/nativeUiMissing=gameId==='daechung-rpg'&&!nativeUiMeasured/);
  assert.match(source,/nativeUnityUi:\{measurementState:nativeUiMeasured\?'UNITY_ONGUI_RUNTIME':'NOT_MEASURED'/);
  assert.match(source,/nativeUiOffscreen\|\|nativeUiOverlap\|\|nativeUiMissing/);
});

test('actual Daechung Unity scene mesh and texture proof is native, fails closed, and never promotes library assets',()=>{
  const visual=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/PrototypeAnimatedVisuals.cs',import.meta.url),'utf8');
  assert.match(visual,/MESH_INTEGRITY game=daechung-rpg source=UNITY_MESH_FILTER/);
  assert.match(visual,/var filter = renderer\.GetComponent<MeshFilter>\(\)/);
  assert.match(visual,/mesh\.vertexCount < 3/);
  assert.match(visual,/mesh\.GetTopology\(subMesh\) == MeshTopology\.Triangles/);
  assert.match(visual,/mesh\.GetIndexCount\(subMesh\) \/ 3/);
  assert.match(visual,/renderer\.sharedMaterial\.shader\.isSupported/);
  assert.match(visual,/backdropTexture\.width > 0 && backdropTexture\.height > 0/);
  assert.match(visual,/validMeshes == 2 && triangles > 0/);
  assert.match(source,/const nativeMeshMarker=markers\.slice\(\)\.reverse\(\)\.find/);
  assert.match(source,/const nativeMeshVerified=Boolean\(nativeMeshMarker\)/);
  assert.match(source,/nativeMeshMissing=!nativeMeshVerified/);
  assert.match(source,/nativeMeshMissing;/);
  assert.match(source,/libraryAssetPromotionGranted:false/);
});

test('Daechung mobile menu uses responsive safe-area tabs, one visible panel, scroll restoration and a fixed dock',()=>{
  const runtime=daechungUnitySource;
  assert.match(runtime,/Screen\.safeArea/);
  assert.match(runtime,/private static readonly string\[\] MenuTabs = \{ "월드", "전투", "파티", "캐릭터", "가방", "상점" \}/);
  assert.match(runtime,/GUI\.Toolbar\(tabsRect, _menuPage, MenuTabs\)/);
  assert.match(runtime,/_menuScrollPositions\[_menuPage\] = _scroll/);
  assert.match(runtime,/_scroll = _menuScrollPositions\[_menuPage\]/);
  assert.match(runtime,/if \(_menuPage == 0\)[\s\S]*DrawRegionControls\(\);[\s\S]*DrawTownControls\(\);/);
  assert.match(runtime,/else if \(_menuPage == 1\)[\s\S]*DrawCombatControls\(\);/);
  assert.match(runtime,/_multiplayer\?\.DrawControls\(scale\)/);
  assert.match(runtime,/DrawPrimaryCombatActionButton\(\);/);
  assert.match(runtime,/var actionRect = _actionButtonRect/);
  assert.match(runtime,/Mathf\.Max\(48f, 38f \* scale\)/);
  assert.match(runtime,/MENU_TARGET game=daechung-rpg role=tab index=2/);
  assert.match(runtime,/MENU_INPUT game=daechung-rpg role=tab/);
  assert.match(runtime,/_menuPage = regionId == "town" \? 0 : 1/);
  assert.doesNotMatch(runtime,/PlayerPrefs\.Set/);
});

test('Unity Web mobile QA touches the real menu, checks all menu rectangles and rejects docking overlap',()=>{
  const start=source.indexOf("if(gameId==='daechung-rpg'){");
  const input=source.indexOf("await page.touchscreen.tap(menuTarget.x,menuTarget.y)",start);
  const returnTap=source.indexOf("await page.touchscreen.tap(firstTapX,menuTarget.y)",input);
  const screenshot=source.indexOf("const liveCapture=await page.screenshot");
  assert.ok(start>0&&input>start&&returnTap>input&&screenshot>returnTap);
  assert.match(source,/UNITY_WEB_QA_MOBILE_MENU_SOCIAL_NOT_INTERACTIVE/);
  assert.match(source,/UNITY_WEB_QA_MOBILE_MENU_WORLD_RETURN_FAILED/);
  assert.match(source,/menuInteraction:mobileMenuInteraction/);
  assert.match(source,/'tabsLeft','tabsY','tabsWidth','tabsHeight','actionLeft','actionY','actionWidth','actionHeight'/);
  assert.match(source,/const nativeUiOverlap=nativeUiMeasured/);
  assert.match(source,/nativeUiRect\.controlsY\+nativeUiRect\.controlsHeight>nativeUiRect\.actionY-6/);
  assert.match(source,/pass:nativeUiMeasured\?!nativeUiOffscreen&&!nativeUiOverlap:null/);
});

test('compact landscape keeps the original combat action and real scrollable menu accessible',()=>{
  assert.match(daechungUnitySource,/compactLandscape = safe\.width > safe\.height && safe\.height < 540f/);
  assert.match(daechungUnitySource,/compactLandscape \? Mathf\.Min\(88f, safe\.height \* 0\.24f\)/);
  assert.match(daechungUnitySource,/compactLandscape \? topY \+ topHeight \+ 8f/);
  assert.match(daechungUnitySource,/compactLandscape \? 48f : Mathf\.Max\(48f, 38f \* scale\)/);
  assert.match(daechungUnitySource,/if \(compactLandscape\)[\s\S]*GUILayout\.Label\("DAECHUNG RPG"\)/);
  assert.match(daechungUnitySource,/else[\s\S]*DrawPlayerStatus\(\)/);
  for(const [width,height,dpi] of [[568,320,260],[844,390,260],[390,844,280]]){
    const compact=width>height&&height<540,scale=Math.max(1,Math.min(1.6,dpi/180));
    const topY=12;
    const topHeight=compact?Math.min(88,height*.24):Math.min(194*scale,height*.29);
    const controlsY=compact?topY+topHeight+8:Math.max(topY+topHeight+12,height*.5);
    const tabHeight=compact?48:Math.max(48,38*scale),margin=Math.max(12,width*.04);
    const actionHeight=Math.min(Math.max(1,height-margin*2),Math.max(56,Math.min(84,height*.08)));
    const actionY=height-actionHeight-margin;
    const scrollY=controlsY+tabHeight+6,scrollHeight=actionY-10-scrollY;
    assert.ok(scrollHeight>=65,`menu must remain touch-scrollable at ${width}x${height}, got ${scrollHeight}`);
    assert.ok(scrollY+scrollHeight<=actionY-8,'scroll must end above action dock');
  }
});

test('real character, owned inventory and shop windows bind to existing Unity GameCore and preserve v1 save',()=>{
  const runtime=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');
  const core=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/GameCore.cs',import.meta.url),'utf8');
  assert.match(runtime,/MenuTabs = \{ "월드", "전투", "파티", "캐릭터", "가방", "상점" \}/);
  assert.match(runtime,/new Vector2\[MenuTabs\.Length\]/);
  for(const method of ['DrawCharacterWindow','DrawEquipmentInventory','DrawShopWindow']){
    assert.match(runtime,new RegExp('private void '+method+'\\('));
  }
  assert.match(runtime,/DrawCharacterWindow\(\)/);
  assert.match(runtime,/DrawEquipmentInventory\(\)/);
  assert.match(runtime,/DrawShopWindow\(\)/);
  assert.match(runtime,/GameCatalog\.Weapons\.TryGetValue/);
  assert.match(runtime,/GameCatalog\.Armors\.TryGetValue/);
  assert.match(runtime,/foreach \(var id in visibleWeapons\)/);
  assert.match(runtime,/foreach \(var id in visibleArmors\)/);
  assert.match(runtime,/_inventorySearch = GUILayout\.TextField\(_inventorySearch, GUILayout\.MinHeight\(48f\)\)/);
  assert.match(runtime,/_inventorySortByName = !_inventorySortByName/);
  assert.match(runtime,/new List<string>\(player\.ownedWeapons\)/);
  assert.match(runtime,/new List<string>\(player\.ownedArmors\)/);
  assert.match(runtime,/visibleWeapons\.Sort\(/);
  assert.match(runtime,/visibleArmors\.Sort\(/);
  assert.doesNotMatch(runtime,/player\.owned(?:Weapons|Armors)\.(?:Sort|Clear|Add|Remove)\(/);
  for(const method of ['TryEquipWeapon','TryEquipArmor','TryBuyWeapon','TryBuyArmor','TrySellWeapon','TrySellArmor']){
    assert.match(runtime,new RegExp('\\_core\\.'+method+'\\('),'actual menu needs existing owner function: '+method);
    assert.match(core,new RegExp('public bool '+method+'\\('));
  }
  assert.match(runtime,/player\.currentRegionId != "town"/);
  assert.match(runtime,/SHOP_ACTION game=daechung-rpg/);
  assert.match(core,/private const string SaveKey = "daechung-rpg-save-v1"/);
  assert.match(core,/public int version = 1;/);
  assert.match(core,/PlayerPrefs\.SetString\(SaveKey, JsonUtility\.ToJson\(data\)\)/);
  assert.doesNotMatch(core,/SaveKey.*v2|class InventoryV2|new GameSaveData\s*\{\s*version\s*=\s*2/);
});
test('equip and sell reject unowned items, preserve existing prices and do not mutate combat stat authority',()=>{
  const core=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/GameCore.cs',import.meta.url),'utf8');
  const buy=core.slice(core.indexOf('public bool TryBuyWeapon('),core.indexOf('public bool TryEquipWeapon('));
  assert.equal((buy.match(/Player\.currentRegionId != "town"/g)||[]).length,2,'both purchases must enforce the existing village-only shop rule');
  const equip=core.slice(core.indexOf('public bool TryEquipWeapon('),core.indexOf('public bool TryChangeJob('));
  assert.match(equip,/Player\.ownedWeapons\.Contains\(weaponId\)/);
  assert.match(equip,/Player\.ownedArmors\.Contains\(armorId\)/);
  assert.match(equip,/Player\.equippedWeaponId = "bare-hands"/);
  assert.match(equip,/Player\.equippedArmorId = "none"/);
  assert.match(equip,/Player\.currentHp = Mathf\.Min\(Player\.currentHp, GetMaxHp\(\)\)/);
  assert.match(equip,/Player\.currentRegionId != "town"/);
  assert.match(equip,/weapon\.hidden/);
  assert.match(equip,/Player\.gold \+= weapon\.price/);
  assert.match(equip,/Player\.gold \+= armor\.price/);
  assert.match(equip,/Player\.gold > int\.MaxValue - weapon\.price/);
  assert.match(equip,/Player\.gold > int\.MaxValue - armor\.price/);
  assert.doesNotMatch(equip,/Player\.baseAttack\s*=/);
  assert.doesNotMatch(equip,/Player\.baseMaxHp\s*=/);
  assert.doesNotMatch(equip,/Player\.experience\s*=/);
});

test('actual Unity browser touch visits character, inventory and shop with synchronized gold evidence',()=>{
  assert.match(daechungUnitySource,/tabsCount=\{MenuTabs\.Length\}/);
  assert.match(source,/tabCount=getBound\('tabsCount'\)/);
  assert.match(source,/for\(const \[index,name\] of \[\[3,'CHARACTER'\],\[4,'INVENTORY'\],\[5,'SHOP'\]\]\)/);
  assert.match(source,/await page\.touchscreen\.tap\(tapX,menuTarget\.y\)/);
  assert.match(source,/UNITY_WEB_QA_MOBILE_MENU_PAGE_NOT_INTERACTIVE:/);
  assert.match(source,/UNITY_WEB_QA_MOBILE_MENU_PLAYER_STATE_MISSING:/);
  assert.match(source,/source=GAMECORE_V1_STATE/);
  assert.match(source,/screenGold!==stateGold/);
  assert.match(source,/UNITY_WEB_QA_MOBILE_MENU_GAMECORE_STATE_MISMATCH:/);
  assert.match(source,/nativePlayerStateObserved:true/);
  assert.match(source,/visitedPages\.push\('WORLD'\)/);
  assert.doesNotMatch(source,/mobileMenuInteraction=\{pass:true,actualBrowserTouch:true,visitedPages:\['SOCIAL','WORLD'\]/);
});


test('모든 Unity Web 게임에서 실측 3D 메시 없는 QA PASS를 차단한다',()=>{
  assert.match(source,/UNITY_WEB_3D_ONLY_POLICY_REQUIRED/);
  assert.match(source,/nativeMeshMissing=!nativeMeshVerified/);
  assert.match(source,/requiredForAllUnityWebGames:true/);
  assert.match(source,/observedTriangles:nativeMeshVerified\?nativeMeshProof\.triangles:0/);
  assert.match(source,/nativeUiOffscreen\|\|nativeUiOverlap\|\|nativeUiMissing\|\|nativeMeshMissing/);
});
