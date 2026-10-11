// 파일명: qa/company-unity-web-gameplay-validation.test.mjs
// 역할: 기존 실제 브라우저 QA의 승인된 Unity 환경 메시·증거 해시 검증 회귀.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=fs.readFileSync(new URL('../tools/company-unity-web-gameplay-validation.mjs',import.meta.url),'utf8');

const daechungUnitySource=fs.readFileSync(new URL('../unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs',import.meta.url),'utf8');

test('browser Unity 3D QA pins the central policy to the validator module even from the WebGL staging directory',()=>{
  assert.match(source,/readFileSync\(new URL\('\.\.\/company-learning\/platform-release-roadmap\.json',import\.meta\.url\),'utf8'\)/);
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/cd \/tmp\/unity-web/);
  assert.match(workflow,/node "\$GITHUB_WORKSPACE\/tools\/company-unity-web-gameplay-validation\.mjs"/);
});

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
  const frame=source.indexOf('framePacing=await Promise.race');
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
  assert.match(source,/await canvas\.focus\(\);\s*const combatMarkerStart=markers\.length;\s*for\(let i=0;i<20/s);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('KeyR'\)/s);
});

test('Unity Web precision QA proves runtime input-to-state transitions and collects per-system proof only after real input',()=>{
  assert.match(source,/const scenarioId=String\(args\.scenario/);
  assert.match(source,/REAL_BROWSER_TOUCH_FIRST/);
  assert.match(source,/UNITY_WEB_QA_INDEPENDENT_TOUCH_FIRST_START_FAILED/);
  assert.match(source,/const combatMarkerStart=markers\.length/);
  assert.match(source,/const liveSystemMarkers=markers\.slice\(combatMarkerStart\)/);
  assert.match(source,/const postRewardStateLine=markers\.slice\(rewardFirstIndex\+1\)/);
  assert.match(source,/changedPostRewardKeys\.length/);
  assert.match(source,/UNITY_WEB_QA_REAL_GAMEPLAY_STATE_TRANSITION_MISSING/);
  assert.match(source,/UNITY_WEB_QA_REGRESSION_REENTRY_AFTER_SAVE_FAILED/);
  assert.match(source,/UNITY_WEB_QA_REGRESSION_REAL_SECOND_CYCLE_MISSING/);
  assert.match(source,/systemTraceCaptureWindow:'POST_REAL_USER_INPUT_PRE_RELOAD'/);
  assert.match(source,/liveSystemMarkers,/);
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

test('Unity Web scene screenshots retain boot and gameplay canvas pixels independently of the HTML viewport',()=>{
  const boot=source.indexOf("const bootSceneCapture=await canvas.screenshot({scale:'css'})");
  const gameplay=source.indexOf("const sceneCapture=await canvas.screenshot({scale:'css'})");
  const coreFun=source.indexOf('UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING');
  const screenshots=source.indexOf("const liveCapture=await page.screenshot({fullPage:false})");
  assert.ok(boot>0&&boot<coreFun&&gameplay>coreFun&&gameplay>screenshots);
  assert.match(source,/fs\.writeFileSync\(bootScenePath,bootSceneCapture\)/);
  assert.match(source,/UNITY_WEB_QA_SCREENSHOT_PNG_REQUIRED/);
  assert.match(source,/fs\.writeFileSync\(sceneScreenshot,sceneCapture\)/);
  assert.match(source,/createImageBitmap\(new Blob\(\[bytes\],\{type:'image\/png'\}\)\)/);
  assert.match(source,/sceneCapture\.toString\('base64'\)/);
  assert.match(source,/source:'REAL_UNITY_CANVAS_SCREENSHOT'/);
  assert.match(source,/source:'REAL_UNITY_CANVAS_SCREENSHOT_AND_OPTIONAL_NATIVE_LIT_MESH_INSPECTION'/);
  assert.match(source,/bootCaptureSha256:bootSceneCaptureSha256/);
  assert.match(source,/sceneCaptureSha256,sceneCapturePersisted:Boolean\(screenshot&&sceneCapture\)/);
  assert.match(source,/comparedWithLastApprovedGoldenScene:false/,'do not claim an unperformed visual golden comparison');
  assert.match(source,/realDeviceVerified:false/,'mobile emulation is not a real Android phone');
  assert.match(source,/visualBlocked[\s\S]*renderSurfaceVerified\|\|!sceneScreenVerified/);
});

test('canonical Unity Web build refuses approval without three real canvas screenshots and their hashes',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/const renderScreenPass=checks\.every\(e=>e\.visualQa\?\.renderedScene\?\.required===true/);
  assert.match(workflow,/renderedScene\.sceneCapturePersisted===true/);
  assert.match(workflow,/renderedScene\.pixels\?\.source==='REAL_UNITY_CANVAS_SCREENSHOT'/);
  assert.match(workflow,/renderedScene\.nativeRenderProof\?\.litMaterials===e\.visualQa\.renderedScene\.nativeRenderProof\?\.materials/);
  assert.match(workflow,/UNITY_WEB_RENDERED_SCENE_SCREEN_EVIDENCE_REQUIRED/);
  assert.match(workflow,/gameplay-mobile-scene\.png/);
  assert.match(workflow,/independent-qa-mobile-scene\.png/);
  assert.match(workflow,/regression-mobile-scene\.png/);
  assert.match(workflow,/if: \$\{\{ always\(\) && steps\.output\.outcome == 'success' \}\}/);
  assert.match(workflow,/if-no-files-found: error/,'missing WebGL artifact cannot be marked as PASS');

  assert.match(workflow,/const graphicsPass=!bootstrapGraphicsBlocked/);
  assert.match(workflow,/&&native3dVerified;/);
  assert.doesNotMatch(workflow,/pass=\(renderScreenPass\|\|true\)/);
});

test('Unity Web approved world screenshot gate rejects unlit, incomplete normals, flat canvas and magenta frames',()=>{
  const start=source.indexOf('  const worldRenderMarker=');
  const end=source.indexOf('  const shaderLikelyMissing=',start);
  assert.ok(start>=0&&end>start);
  const evaluate=new Function('markers','gameId','approvedEnvironment','scenePixels',
    source.slice(start,end)+'\nreturn {surface:renderSurfaceVerified,screen:sceneScreenVerified};');
  const gameId='sample-game';
  const env={required:true};
  const marker='UNITY_WEB_WORLD=RENDER_SURFACE game=sample-game source=UNITY_RUNTIME_LIT_MESH '+
    'meshes=9 normals=9 triangles=240 materials=12 litMaterials=12 status=PASS';
  const image={pixelCount:3500,magentaRatio:0.01,dominantColorRatio:0.45,distinctColorBuckets:120};
  assert.deepEqual(evaluate([marker],gameId,env,image),{surface:true,screen:true});
  for(const [label,lines] of [
    ['missing native renderer',[]],
    ['wrong game marker',[marker.replace('game=sample-game','game=other-game')]],
    ['fake pass without triangles',[marker.replace('triangles=240','triangles=none')]],
    ['unlit material',[marker.replace('litMaterials=12','litMaterials=11')]],
    ['missing mesh normals',[marker.replace('normals=9','normals=8')]],
    ['missing actual status',[marker.replace('status=PASS','status=REPAIR_REQUIRED')]],
  ])assert.equal(evaluate(lines,gameId,env,image).surface,false,label);
  for(const [label,pixels] of [
    ['no browser scene pixels',null],
    ['shader error magenta',{...image,magentaRatio:0.5}],
    ['blank canvas',{...image,dominantColorRatio:0.99}],
    ['low color diversity',{...image,distinctColorBuckets:2}],
    ['insufficient pixels',{...image,pixelCount:2}],
  ])assert.equal(evaluate([marker],gameId,env,pixels).screen,false,label);
  assert.deepEqual(evaluate([],'sample-game',{required:false},null),{surface:true,screen:false},
    'unapproved worlds still require actual gameplay screenshot pixels');
  assert.deepEqual(evaluate([],'sample-game',{required:false},image),{surface:true,screen:true},
    'unapproved worlds require screen pixels but not the approved-world PBR marker');
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
  assert.match(visual,/validMeshes == inspected && triangles > 0/);
  assert.match(visual,/volumetricMeshes > 0/);
  assert.match(visual,/bounds\.x > 0\.02f && bounds\.y > 0\.02f && bounds\.z > 0\.02f/);
  assert.match(source,/const nativeMeshMarker=markers\.slice\(\)\.reverse\(\)\.find/);
  assert.match(source,/const nativeMeshVerified=Boolean\(nativeMeshMarker\)/);
  assert.match(source,/nativeMeshMissing=!nativeMeshVerified/);
  assert.match(source,/nativeMeshProof\.volumetricMeshes>0/);
  assert.match(source,/nativeMeshMissing\s*\n\s*\|\|!renderSurfaceVerified\|\|!sceneScreenVerified;/);
  assert.match(source,/const visualBlocked=shaderLikelyMissing\|\|blankOrFrozenFrame/);
  assert.match(source,/sceneScreenVerified=Boolean\(scenePixels/);
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
  assert.match(source,/planarOnlyMeshesCannotPass:true/);
  assert.match(source,/observedVolumetricMeshes:nativeMeshVerified\?nativeMeshProof\.volumetricMeshes:0/);
  assert.match(source,/observedTriangles:nativeMeshVerified\?nativeMeshProof\.triangles:0/);
  assert.match(source,/nativeUiOffscreen\|\|nativeUiOverlap\|\|nativeUiMissing\|\|nativeMeshMissing/);
});

test('Unity Web 3D gameplay rejects pseudo-depth even when triangles exist',()=>{
  assert.match(source,/const nativeDepthMarker=markers\.slice\(\)\.reverse\(\)\.find/);
  assert.match(source,/source=UNITY_WORLD_MESH_DEPTH/);
  assert.match(source,/nativeDepthProof\.cameraPerspective===1/);
  assert.match(source,/nativeDepthProof\.worldMeshes3d>=2/);
  assert.match(source,/nativeDepthProof\.worldDepthCm>=50/);
  assert.match(source,/nativeDepthProof\.gameplayActors3d>=1/);
  assert.match(source,/nativeDepthProof\.spriteGameplayActors===0/);
  assert.match(source,/&&nativeDepthVerified/);
  assert.match(source,/depthPass:nativeDepthVerified/);
  const build=fs.readFileSync(new URL('../tools/company-unity-web-floor-bootstrap.mjs',import.meta.url),'utf8');
  const worker=fs.readFileSync(new URL('../tools/company-development-unity-web-worker.mjs',import.meta.url),'utf8');
  assert.match(build,/VerifyNativeSpatialDepth\(\)/);
  assert.match(build,/FindObjectsByType<MeshFilter>/);
  assert.match(build,/FindObjectsByType<SpriteRenderer>/);
  assert.match(worker,/qa\?\.spatialGameplay\?\.depthPass===true/);
  assert.match(worker,/qa\?\.spatialGameplay\?\.spriteGameplayActors===0/);
});


test('실제 Unity 메시·원근·3축 깊이 검증식이 2D/2.5D와 평면 메시를 승인하지 않는다',()=>{
  const start=source.indexOf('  const nativeMeshMarker=');
  const end=source.indexOf('  const worldRenderMarker=',start);
  assert.ok(start>=0&&end>start,'evaluate the actual browser QA 3D proof expressions');
  const evaluate=new Function('markers','gameId',source.slice(start,end)+
    '\nreturn {mesh:nativeMeshVerified,depth:nativeDepthVerified,missing:nativeMeshMissing};');
  const gameId='sample-game';
  const mesh='JAEWOON_UNITY_WEB_QA MESH_INTEGRITY game=sample-game source=UNITY_MESH_FILTER '+
    'inspected=3 validMeshes=3 triangles=90 volumetricMeshes=3 materialPass=1 texturePass=1 status=PASS';
  const depth='JAEWOON_UNITY_WEB_QA SPATIAL_DEPTH game=sample-game source=UNITY_WORLD_MESH_DEPTH '+
    'cameraPerspective=1 worldMeshes3d=3 worldDepthCm=160 gameplayActors3d=2 spriteGameplayActors=0 status=PASS';
  assert.deepEqual(evaluate([mesh,depth],gameId),{mesh:true,depth:true,missing:false});
  const reject=[
    ['missing native depth',[mesh]],
    ['orthographic 2D camera',[mesh,depth.replace('cameraPerspective=1','cameraPerspective=0')]],
    ['2.5D flat world',[mesh,depth.replace('worldDepthCm=160','worldDepthCm=0')]],
    ['2.5D depth below minimum',[mesh,depth.replace('worldDepthCm=160','worldDepthCm=49')]],
    ['no 3D gameplay actor',[mesh,depth.replace('gameplayActors3d=2','gameplayActors3d=0')]],
    ['sprite gameplay actor',[mesh,depth.replace('spriteGameplayActors=0','spriteGameplayActors=1')]],
    ['all planar meshes',[mesh.replace('volumetricMeshes=3','volumetricMeshes=0'),depth]],
    ['no real triangles',[mesh.replace('triangles=90','triangles=0'),depth]],
    ['forged PASS without numeric triangles',[mesh.replace('triangles=90','triangles=unknown'),depth]],
    ['foreign game proof',[mesh.replace('game=sample-game','game=other-game'),depth]],
  ];
  for(const [reason,markers] of reject){
    const result=evaluate(markers,gameId);
    assert.equal(result.mesh,false,reason);
    assert.equal(result.missing,true,reason);
  }
  assert.match(source,/const visualBlocked=shaderLikelyMissing\|\|blankOrFrozenFrame/);
  assert.match(source,/nativeUiOffscreen\|\|nativeUiOverlap\|\|nativeUiMissing\|\|nativeMeshMissing/);
  assert.match(source,/pass:!performanceBlocked&&!visualBlocked&&!renderBudgetExceeded/);
  assert.match(source,/libraryAssetPromotionGranted:false/);
});


test('monster adventure uses the existing original 3D library as native Unity meshes, not gameplay primitives',()=>{
  const editor=fs.readFileSync(new URL('../unity-games/monster-adventure/Assets/Editor/UnityWebFloorBuild.cs',import.meta.url),'utf8');
  const runtime=fs.readFileSync(new URL('../unity-games/monster-adventure/Assets/Scripts/UnityWebFloorGame.cs',import.meta.url),'utf8');
  const artRoot=new URL('../unity-games/monster-adventure/Assets/Art/',import.meta.url);
  const monsterModels=['flamefox','leafturtle','waterotter','boar','bat','bird','hornbull','rockgator','stormeagle'];
  const environmentModels=['road_dirt','foundation_rect','chest','rock_medium','tree_trunk_thick','tree_crown_round','lamp'];
  assert.match(editor,/BindLibraryAssets\(scene\);/);
  assert.match(editor,/mesh\.SetTriangles\(partFaces\[i\],i\)/);
  assert.match(editor,/mesh\.RecalculateNormals\(\)/);
  assert.match(editor,/renderer\.sharedMaterials=assetMaterials/);
  assert.match(editor,/UNITY_LIBRARY_MESH_NOT_VOLUMETRIC/);
  assert.match(runtime,/UNITY_NATIVE_LIBRARY_MESH_UNBOUND/);
  assert.match(runtime,/UNITY_NATIVE_LIBRARY_MATERIAL_MISSING/);
  assert.match(runtime,/source=CANONICAL_IMPORTED_UNITY_MESH/);
  assert.match(runtime,/source=CANONICAL_IMPORTED_UNITY_MESH models=/);
  assert.match(runtime,/private const string SavePrefix = "monster_adventure_webfloor_"/);
  assert.match(runtime,/BOOTSTRAP_ONLY_GAMEPLAY_NOT_IMPLEMENTED/);
  assert.doesNotMatch(runtime,/GameObject\.CreatePrimitive\(/,'primitive world actors are not native library assets');
  assert.doesNotMatch(runtime,/domain=(?:character|enemy|environment|equipment) status=PASS/,'studio asset quality needs browser proof');
  for(const [paletteName,models] of [['monster-adventure',monsterModels],['survival-core-world',environmentModels]]){
    const palette=fs.readFileSync(new URL(paletteName+'.mtl',artRoot),'utf8');
    const materials=new Set([...palette.matchAll(/^newmtl\s+([A-Za-z0-9_]+)\s*$/gm)].map(x=>x[1]));
    assert.ok(materials.size>=7,'native material palette must have meaningful source colors');
    for(const model of models){
      const src=fs.readFileSync(new URL(model+'.obj',artRoot),'utf8');
      assert.match(src,/^mtllib\s+/m,'mesh must retain original library material lineage');
      const vertexRows=[...src.matchAll(/^v\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/gm)];
      const used=[...src.matchAll(/^usemtl\s+(\S+)/gm)].map(x=>x[1]);
      const faces=[...src.matchAll(/^f\s+.+$/gm)];
      assert.ok(vertexRows.length>=16&&faces.length>=16,'real mesh density required: '+model);
      assert.ok(used.length>0&&used.every(name=>materials.has(name)),'the imported model has a real per-part palette: '+model);
      for(let axis=0;axis<3;axis++){
        const extrema=vertexRows.map(x=>Number(x[axis+1]));
        const size=Math.max(...extrema)-Math.min(...extrema);
        assert.ok(Number.isFinite(size)&&size>0.05,'nonplanar native asset required: '+model+' axis='+axis);
      }
      assert.ok(editor.includes('"'+model+'"'),'asset source must be used by the existing canonical scene generator: '+model);
    }
  }
});


test('failed Unity Web browser runs persist observed negative evidence without bypassing QA',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(source,/observedRuntimeFailure:true/);
  assert.match(source,/playableBrowserTest:false/);
  assert.match(source,/UNITY_WEB_QA_CAUSAL_FAILURE/);
  assert.match(source,/throw error;/);
  assert.match(workflow,/UNITY_WEB_QA_EVIDENCE_MISSING:/);
  assert.match(workflow,/UNITY_WEB_QA_REPAIR_REQUIRED:/);
  assert.match(workflow,/if\(!playable\)throw new Error\('UNITY_WEB_REAL_BROWSER_PLAYABILITY_REQUIRED'\)/);
});

test('monster adventure Unity raycasts compile with the native physics module',()=>{
  const game=fs.readFileSync(new URL('../unity-games/monster-adventure/Assets/Scripts/UnityWebFloorGame.cs',import.meta.url),'utf8');
  const manifest=JSON.parse(fs.readFileSync(new URL('../unity-games/monster-adventure/Packages/manifest.json',import.meta.url),'utf8'));
  assert.match(game,/Physics\.Raycast\(/);
  assert.equal(manifest.dependencies['com.unity.modules.physics'],'1.0.0');
});


test('stalled browser frame sampling fails with a bounded causal signature and closes Chromium on errors',()=>{
  assert.match(source,/UNITY_WEB_QA_FRAME_SAMPLE_HOST_TIMEOUT/);
  assert.match(source,/frameSampleHostTimeout=setTimeout/);
  assert.match(source,/clearTimeout\(frameSampleHostTimeout\)/);
  assert.match(source,/if\(browser\?\.isConnected\(\)\)await browser\.close\(\)/);
  assert.match(source,/observedRuntimeFailure:true/);
  assert.match(source,/playableBrowserTest:false/);
  assert.match(source,/throw error;/);
});


test('Unity Web real browser QA bounds hung WebGL operations and emits fail-closed stage evidence',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  const start=source.indexOf('const qaDeadline=setTimeout(');
  const end=source.indexOf('qaDeadline.unref()',start);
  assert.ok(start>0&&end>start,'the real browser QA must own its hard deadline');
  const deadline=source.slice(start,end);
  const minutes=Number(source.match(/const qaDeadlineMs=(\d+)\*60\*1000/)?.[1]);
  assert.equal(minutes,8);
  assert.match(workflow,/Run Unity Web actual browser play\n\s*timeout-minutes: 10/);
  assert.match(deadline,/UNITY_WEB_QA_DEADLINE_EXCEEDED/);
  assert.match(deadline,/observedRuntimeFailure:true/);
  assert.match(deadline,/pass:false,playableBrowserTest:false/);
  assert.match(deadline,/failureStage:'UNITY_WEB_ACTUAL_BROWSER_'/);
  assert.match(deadline,/fs\.writeFileSync\(output,JSON\.stringify\(failureEvidence,null,2\)\+'\\n'\)/);
  assert.match(deadline,/process\.exit\(124\)/);
  assert.match(source,/qaStage='WEBGL_BOOT'/);
  assert.match(source,/qaStage='GAMEPLAY_TOUCH_AND_ACTION'/);
  assert.match(source,/qaStage='LIVE_CANVAS_VISUAL_QA'/);
  assert.match(source,/qaStage='SAVE_RESTORE_AND_REENTRY'/);
  assert.match(source,/qaStage='BROWSER_CLOSE'/);
  assert.match(source,/qaStage='HTTP_SERVER_CLOSE'/);
  assert.match(source,/server\.closeAllConnections\(\)/);
  assert.match(source,/clearTimeout\(qaDeadline\)/);
  assert.match(source,/throw new Error\('UNITY_WEB_QA_FRAME_PACING_FAILED:'/);
  assert.match(source,/UNITY_WEB_QA_VISUAL_RUNTIME_REPAIR_REQUIRED/);
});


test('Unity Web QA deadline writes causal failure evidence even after a stuck browser has staged evidence',()=>{
  const start=source.indexOf('const qaDeadline=setTimeout(');
  const end=source.indexOf('qaDeadline.unref()',start);
  assert.ok(start>=0&&end>start);
  let scheduled=null,duration=null,received=null;
  const scenarioId='actual-play',qaStage='SAVE_RESTORE_AND_REENTRY',gameId='qa-test-game';
  const stageBeforeTimeout={version:2,pass:true,gameId};
  received=stageBeforeTimeout;
  const scope={
    qaDeadlineMs:8*60*1000,scenarioId,qaStage,gameId,output:'/tmp/unity-web-test.json',
    markers:['JAEWOON_UNITY_WEB_QA BOOT game=qa-test-game status=PASS'],
    consoleErrors:[],pageErrors:[],failedRequests:[],
    setTimeout:(fn,ms)=>{scheduled=fn;duration=ms;return{unref(){}};},
    fs:{
      mkdirSync(){},
      writeFileSync(file,body){
        assert.equal(file,'/tmp/unity-web-test.json');
        received=JSON.parse(body);
      }
    },
    path:{dirname:()=>'/tmp'},
    process:{exit(code){throw new Error('QA_DEADLINE_EXIT:'+code);}},
    console:{error(){}}
  };
  runInNewContext(source.slice(start,end+'qaDeadline.unref()'.length),scope);
  assert.equal(duration,480000);
  assert.equal(typeof scheduled,'function');
  assert.throws(()=>scheduled(),/QA_DEADLINE_EXIT:124/);
  assert.equal(received.pass,false);
  assert.equal(received.playableBrowserTest,false);
  assert.equal(received.observedRuntimeFailure,true);
  assert.equal(received.gameId,gameId);
  assert.equal(received.failureStage,'UNITY_WEB_ACTUAL_BROWSER_ACTUAL_PLAY');
  assert.equal(received.failureSignature,'UNITY_WEB_QA_DEADLINE_EXCEEDED:actual-play:SAVE_RESTORE_AND_REENTRY:480000');
  assert.equal(received.markers.length,1);
});


test('hosted Unity Web replay accepts only the canonical HTTPS game surface',()=>{
  const start=source.indexOf("let hostedUrl='';");
  const end=source.indexOf("if(!fs.existsSync(source))",start);
  assert.ok(start>0&&end>start,'hosted URL validation is in the existing browser validator');
  const validate=input=>runInNewContext('const gameId="daechung-rpg";const hostedUrlInput='+JSON.stringify(input)+';\n'+source.slice(start,end)+'\nhostedUrl',{URL});
  assert.equal(validate('https://jaewoon-games.pages.dev/web-games/daechung-rpg/unity/'),'https://jaewoon-games.pages.dev/web-games/daechung-rpg/unity/');
  for(const value of [
    'https://evil.example/web-games/daechung-rpg/unity/',
    'http://jaewoon-games.pages.dev/web-games/daechung-rpg/unity/',
    'https://jaewoon-games.pages.dev/web-games/other/unity/',
    'https://jaewoon-games.pages.dev/web-games/daechung-rpg/unity/?insecure=1'
  ])assert.throws(()=>validate(value),/UNITY_WEB_HOSTED_CANONICAL_URL_REQUIRED/);
});

test('public mobile replay checks actual compressed assets then repeats gameplay before PASS',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  const section=workflow.slice(workflow.indexOf('      - name: Create verified Unity Web readiness PR'),workflow.indexOf('      - name: Mark Unity Web floor repair requirement'));
  assert.ok(section.includes('id: publish'));
  assert.ok(section.indexOf('UNITY_WEB_CLOUDFLARE_MAIN=')<section.indexOf('UNITY_WEB_PUBLIC_MOBILE_PLAY=PASS:'));
  assert.ok(section.indexOf('UNITY_WEB_PUBLIC_MOBILE_PLAY=PASS:')<section.indexOf('VIBE2_UNITY_WEB_TASK_FINAL_PASS='));
  assert.ok(section.includes('--scenario=independent-qa'));
  assert.ok(section.includes('--deployed-url="https://jaewoon-games.pages.dev/$runtime_dir/"'));
  assert.ok(section.includes('--output="/tmp/unity-web/web-games/$GAME_ID/unity-web-hosted-mobile-qa.json"'));
  assert.match(source,/qaStage='HOSTED_WEBGL_ASSET_HEADERS'/);
  assert.match(source,/UNITY_WEB_HOSTED_ASSET_RESPONSE_INVALID/);
  for(const group of ["['loader','javascript']","['framework','javascript']","['wasm','application/wasm']","['data','application/octet-stream']"])
    assert.ok(source.includes(group));
  assert.match(source,/hostedMobilePlay:hostedUrl/);
  assert.match(source,/if\(hostedUrl&&output&&fs\.existsSync\(output\)\)/);
  assert.match(source,/recorded\.observedRuntimeFailure=true/);
  assert.match(source,/realDeviceVerified:false/);
  const repair=workflow.slice(workflow.indexOf('      - name: Mark Unity Web floor repair requirement'));
  assert.ok(repair.includes("steps.publish.outcome == 'failure'"));
  assert.ok(repair.includes('unity-web-hosted-mobile-qa.json'));
  assert.ok(repair.includes('POST_MERGE_HOSTED_MOBILE_PLAY_FAILED'));
  assert.ok(repair.includes('repair-vibe2:'));
});
