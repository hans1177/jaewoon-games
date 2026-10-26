// 파일명: qa/cozy-cc0-library-audit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditCozyCC0,grantCozyCC0} from '../tools/cozy-cc0-library-audit.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const source=read('roblox-games/cozy-island/server/Game.server.luau');
const workflow=read('.github/workflows/owner-cozy-island-direct-publish.yml');
const modelLib=read('roblox-games/cozy-island/shared/CozyCC0Library.luau');

test('Vibe2 coerces CC0 originals through entire source+license+model+PBR library audit',()=>{
  const result=auditCozyCC0();
  assert.equal(result.pass,true);
  assert.equal(result.licensedPbrAvailable,true);
  assert.ok(result.licensedPbrVariantCount>=15);
  assert.equal(Object.keys(result.libraryFamilies).length,14);
  assert.ok(result.allRobloxLibraryDirectories.length>=18,'must inspect special Roblox asset libraries too');
  assert.ok(result.originalSourceInventory['assets/roblox'].files>0);
  assert.ok(result.originalSourceInventory['assets/shared'].files>0);
  assert.ok(result.licenseLedgerEntries>=7);
  assert.ok(result.externalRecords>=15);
  assert.ok(result.sourceDigestsVerified>=7);
  assert.ok(result.blockedAssets.length>0,'unsigned legacy imported world and UI packs must stay blocked');
  assert.ok(Object.values(result.originalSourceInventory).reduce((n,v)=>n+v.nativeModels,0)>0);
  assert.equal(result.acceptedCC0Models.every(row=>row.license==='CC0-1.0'&&row.permissionMustBeGrantedTo==='10767445741'),true);
});

test('bear CC0 evidence cannot be inferred from a procedural wildlife generator or global library label',()=>{
 const result=auditCozyCC0();
 assert.equal(result.bearOriginalVerified,false,'no registered bear original with exact source digest exists');
 assert.equal(result.bearSpawnBlocked,true);
 assert.match(source,/CozyBearCC0Status","BLOCKED_UNVERIFIED_SOURCE"/);
 assert.doesNotMatch(source,/Wildlife\.Spawn\("BEAR"/);
 const auditSource=read('tools/cozy-cc0-library-audit.mjs');
 assert.match(auditSource,/COZY_UNVERIFIED_PROCEDURAL_BEAR_SPAWN/);
 assert.match(auditSource,/COZY_UNLICENSED_BEAR_MUST_BE_BLOCKED/);
});

test('Only verified CC0 actors replace Cozy village/raider visuals, originals and save flow are preserved',()=>{
  assert.match(source,/require\(Shared:WaitForChild\("CozyCC0Library"\)\)/);
  assert.match(source,/require\(Shared:WaitForChild\("RobloxCommonMaterials"\)\)/);
  assert.match(source,/local licenseAsset=CC0\.Npc\[name\]/);
  assert.match(source,/local selected=isRaider and \{id=CC0\.Raider\[/);
  assert.match(source,/task\.spawn\(applyCC0Appearance,r,licenseAsset/);
  assert.match(source,/task\.spawn\(applyCC0Appearance,r,selected\.id/);
  assert.match(source,/Materials\.ApplyAuthoredSurface\(x,Style\.MaterialStyle or "COZY"\)/);
  assert.match(source,/if child:IsA\("BasePart"\)then child:Destroy\(\)end/);
  assert.match(source,/joint\.Name="CozyVisualJoint"\.\.roots/);
  assert.match(source,/while loadingAssets\[id\] do/);
  assert.match(source,/piece\.CanCollide=false;piece\.CanTouch=false;piece\.CanQuery=false/);
  assert.match(source,/piece\.Massless=true;piece\.CastShadow=false/);
  assert.match(source,/GetDataStore\("cozy-island-conquest-v3"\)/);
  assert.match(source,/CC0LicensedAssetId/);
  assert.match(source,/COZY_CC0_KAYKIT_NATIVE_V10/);
  assert.doesNotMatch(source,/ASSETS\.Nature|ASSETS\.City|ASSETS\.Forest/);
  assert.doesNotMatch(source,/SHARED_MONSTER_ASSETS\s*=/);
  assert.equal(modelLib.includes('CC0-1.0'),true);
});

test('GitHub publishing refuses ungranted/outdated CC0 originals and reuses exact Cozy private Place',()=>{
  assert.match(workflow,/assets\/roblox\/\*\*/);
  assert.match(workflow,/assets\/shared\/\*\*/);
  assert.match(workflow,/node --test qa\/cozy-rpg-release-hardening\.test\.mjs qa\/cozy-cc0-library-audit\.test\.mjs/);
  assert.match(workflow,/node tools\/cozy-cc0-library-audit\.mjs --grant/);
  assert.match(workflow,/test "\$REUSE_UNIVERSE_ID" = "10767445741"/);
  assert.match(workflow,/test "\$REUSE_PLACE_ID" = "116850096561713"/);
  assert.ok(workflow.indexOf('node tools/cozy-cc0-library-audit.mjs --grant')<workflow.indexOf('rojo build'));
  assert.ok(workflow.indexOf('node tools/cozy-cc0-library-audit.mjs --grant')<workflow.indexOf('node tools/company-roblox-dedicated-experience.mjs'));
  assert.doesNotMatch(workflow,/(tinyfish|browserless|browserbase)/i);
});

test('owner-first Roblox publisher verifies the real published Place/version and never claims gameplay QA from headless probe',()=>{
  const publish=workflow.indexOf('      - name: Publish Cozy Island to owner dedicated Roblox Experience');
  const verify=workflow.indexOf('      - name: Verify Cozy Island publication',publish);
  const post=workflow.indexOf('      - name: Verify exact published Cozy Island Place version after deployment',verify);
  const artifact=workflow.indexOf('      - uses: actions/upload-artifact@v4',post);
  assert.ok(publish>=0&&verify>publish&&post>verify&&artifact>post,'deploy before exact post-deploy verification and evidence retention');
  const postStep=workflow.slice(post,artifact);
  assert.match(postStep,/probeRobloxOpenCloudEngine/);
  assert.match(postStep,/publication\.sourceRevision===revision/);
  assert.match(postStep,/universeId==='10767445741'&&placeId==='116850096561713'/);
  assert.match(postStep,/proof\.engineExecuted===true&&proof\.exactPlace===true/);
  assert.match(postStep,/proof\.exactVersion===true&&proof\.serverContextExecuted===true/);
  assert.match(postStep,/publication\.private===true/);
  assert.match(postStep,/if\(!pass\)throw new Error\('COZY_POST_PUBLISH_QA_UNVERIFIED_NO_NEXT_F0'\)/);
  assert.match(postStep,/realPlayerGameplayVerified:false,mobileInputVerified:false/);
  assert.match(postStep,/multiplayerVerified:false,saveRejoinVerified:false/);
  assert.match(workflow.slice(artifact),/if: always\(\)/);
  assert.match(workflow.slice(artifact),/cozy-island\.post-publish-qa\.json/);
});

test('Cozy owner publish is publish-first regression-after, then existing F0 and Vibe2 build-up only after exact Place QA',()=>{
  const licensed=workflow.indexOf('      - name: Verify Cozy Island licensed assets before private publish');
  const publish=workflow.indexOf('      - name: Publish Cozy Island to owner dedicated Roblox Experience');
  const regression=workflow.indexOf('      - name: Run Cozy Island regression after private Roblox publish');
  const post=workflow.indexOf('      - name: Verify exact published Cozy Island Place version after deployment');
  const next=workflow.indexOf('      - name: Resume exact Cozy Island F0 and existing continuous build-up after published QA');
  const artifact=workflow.indexOf('      - uses: actions/upload-artifact@v4',next);
  assert.ok(licensed>=0&&publish>licensed&&regression>publish&&post>regression&&next>post&&artifact>next);
  assert.match(workflow.slice(licensed,publish),/node tools\/cozy-cc0-library-audit\.mjs --grant/);
  assert.doesNotMatch(workflow.slice(licensed,publish),/node --test qa\/cozy-rpg-release-hardening/);
  assert.match(workflow.slice(regression,post),/node --test qa\/cozy-rpg-release-hardening\.test\.mjs/);
  assert.match(workflow.slice(post,next),/if\(!pass\)throw new Error\('COZY_POST_PUBLISH_QA_UNVERIFIED_NO_NEXT_F0'\)/);
  assert.match(workflow.slice(next,artifact),/gh workflow run company-roblox-source-drift-sync\.yml.*restart_from_f0=true/);
  assert.match(workflow.slice(next,artifact),/COZY_POST_PUBLISH_NEXT_BUILD_UP=PLANNER_AFTER_F0_RUNTIME_SYNC/);
  assert.doesNotMatch(workflow.slice(next,artifact),/gh workflow run vibe2-24h-runner\.yml/);
  const sync=read('.github/workflows/company-roblox-source-drift-sync.yml');
  assert.match(sync,/name: Refill existing Web-style BUILD_UP planner after proven Roblox F0 restart/);
  assert.match(sync,/gh workflow run vibe2-24h-runner\.yml.*--ref main/);
  assert.doesNotMatch(workflow.slice(next,artifact),/gh workflow run vibe2-continuous-core\.yml/);
  assert.match(workflow.slice(next,artifact),/SUPERSEDED_BY_NEWER_GAME_SOURCE/);
  assert.match(workflow,/permissions:\s+contents: read\s+actions: write/);
});
test('grant validates exact prechecked universe and treats server permission errors as fatal',async()=>{
  const report={pass:true,universeId:'10767445741',acceptedCC0Models:[{assetId:70786111181272}]};
  let received;
  const fetchImpl=async (url,opts)=>{
    received={url,method:opts.method,headers:opts.headers,body:JSON.parse(opts.body)};
    return {ok:true,status:200,json:async()=>({})};
  };
  const result=await grantCozyCC0({report,apiKey:'mock-test-key',cookie:'',fetchImpl});
  assert.equal(result.granted,true);
  assert.equal(received.method,'PATCH');
  assert.equal(received.body.subjectId,'10767445741');
  assert.deepEqual(received.body.requests,[{assetId:70786111181272,grantToDependencies:true}]);
  await assert.rejects(()=>grantCozyCC0({report:{...report,universeId:'wrong'},apiKey:'mock-test-key',cookie:'',fetchImpl}),/CC0_AUDIT_REQUIRED/);
  await assert.rejects(()=>grantCozyCC0({report,apiKey:'mock-test-key',cookie:'',fetchImpl:async()=>({ok:false,status:403,json:async()=>({})})}),/GRANT_FAILED/);
});

test('기존 자산에도 브릭 재질을 강제 적용하고 물리·CC0 원본을 보존한다',()=>{
  const common=read('assets/roblox/common-materials-v1/RobloxCommonMaterials.luau');
  const cozy=read('roblox-games/cozy-island/shared/RobloxCommonMaterials.luau');
  const catalog=JSON.parse(read('assets/roblox/common-materials-v1/catalog.json'));
  const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
  const client=read('roblox-games/cozy-island/client/MaterialPresentation.client.luau');
  const bootstrap=read('tools/company-development-roblox-bootstrap.mjs');
  const vibePlan=read('tools/vibe2-asset-production-plan.mjs');
  assert.match(vibePlan,/TOY_BRICK.*레고/,'기존 바이브 스타일 추론에서 게임별 브릭 스타일 선택 지원');
  assert.equal(common,cozy,'게임별 재질 복사본은 공용 원본과 일치해야 한다');
  assert.equal(catalog.atoms.length,26);
  assert.equal(catalog.systemDepthContract.currentAssetCount,26);
  assert.deepEqual(catalog.atoms.find(row=>row.atomId==='TOY_PLASTIC').variants,['SATIN','GLOSSY','MATTE','DARK']);
  assert.ok(catalog.atoms.find(row=>row.atomId==='STYLE_VARIANT').variants.includes('TOY_BRICK'));
  assert.equal(catalog.toyBrickStyle.productionVerified,false,'재질 카탈로그만으로 런타임 검증 불가');
  assert.equal(catalog.toyBrickStyle.runtimeVerified,false);
  assert.match(common,/TOY_PLASTIC = table\.freeze/);
  assert.match(common,/ToyBrickExistingAssetConversion/);
  assert.match(common,/ToyBrickPresentationMaterialId/);
  assert.doesNotMatch(common,/part:SetAttribute\\(\"MaterialSourceId\",\"NATIVE_TOY_PLASTIC\"\\)/);
  assert.match(common,/importedTexture=mesh and/);
  assert.match(common,/RobloxCommonMaterials\.Apply\(part,"TOY_PLASTIC"/);
  assert.match(common,/ROUND_PRIMITIVE_CC0_REPLACEMENT_REQUIRED/);
  assert.match(common,/if preservePhysics and physicalBefore then[\s\S]*?part\.CustomPhysicalProperties = physicalBefore/);
  assert.match(common,/IMPORTED_ATLAS_REQUIRES_VISUAL_DERIVATIVE_QA/);
  assert.doesNotMatch(common,/Instance\.new\(["'](?:Part|WedgePart|MeshPart)["']\)/,'신규 외형 파츠를 발명하지 않는다');
  assert.match(style,/MaterialStyle="TOY_BRICK"/);
  assert.match(source,/Materials\.ApplyAuthoredSurface\(x,Style\.MaterialStyle or "COZY"\)/);
  assert.match(client,/local style=Style\.MaterialStyle or "COZY"/);
  assert.match(bootstrap,/common-materials-v1\/RobloxCommonMaterials\.luau/);
  assert.equal(catalog.toyBrickStyle.mandatoryForExistingRenderedParts,true);
  assert.equal(catalog.toyBrickStyle.optInByGame,false);
});

// [전체 Roblox 공용 재질] 기존 게임별 재질 복사본은 회사 원본과 일치해야 한다.
// 기본 스타일은 유지하며 선택형 TOY_BRICK 추가만 허용한다.
test('모든 기존 Roblox 게임의 공유 재질 46개는 브릭 전환된 단일 원본과 완전히 일치한다',()=>{
  const base=read('assets/roblox/common-materials-v1/RobloxCommonMaterials.luau');
  const dirs=fs.readdirSync('roblox-games',{withFileTypes:true}).filter(row=>row.isDirectory());
  const copies=dirs.map(row=>'roblox-games/'+row.name+'/shared/RobloxCommonMaterials.luau')
    .filter(path=>fs.existsSync(path));
  assert.equal(copies.length,46);
  for(const file of copies){
    assert.equal(read(file),base,file+' must match the exact current shared material module');
    const client=file.replace('/shared/RobloxCommonMaterials.luau','/client/MaterialPresentation.client.luau');
    assert.equal(fs.existsSync(client),true,client);
    assert.match(read(client),/Materials\.ApplyAuthoredSurface\(part,style\)/);
  }
  assert.match(base,/ToyBrickExistingAssetConversion/);
  assert.match(base,/ROUND_PRIMITIVE_CC0_REPLACEMENT_REQUIRED/);
  assert.match(base,/IMPORTED_ATLAS_REQUIRES_VISUAL_DERIVATIVE_QA/);
  assert.equal(JSON.parse(read('assets/roblox/common-materials-v1/catalog.json')).toyBrickStyle.runtimeVerified,false);
});
