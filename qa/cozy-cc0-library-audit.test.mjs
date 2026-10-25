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

test('Only verified CC0 actors replace Cozy village/raider visuals, originals and save flow are preserved',()=>{
  assert.match(source,/require\(Shared:WaitForChild\("CozyCC0Library"\)\)/);
  assert.match(source,/require\(Shared:WaitForChild\("RobloxCommonMaterials"\)\)/);
  assert.match(source,/local licenseAsset=CC0\.Npc\[name\]/);
  assert.match(source,/local selected=isRaider and \{id=CC0\.Raider\[/);
  assert.match(source,/task\.spawn\(applyCC0Appearance,r,licenseAsset/);
  assert.match(source,/task\.spawn\(applyCC0Appearance,r,selected\.id/);
  assert.match(source,/Materials\.ApplyAuthoredSurface\(x,"COZY"\)/);
  assert.match(source,/if child~=group and child:IsA\("BasePart"\)then child\.Transparency=1 end/);
  assert.match(source,/piece\.CanCollide=false;piece\.CanTouch=false;piece\.CanQuery=false;piece\.Massless=true/);
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
  assert.match(workflow.slice(next,artifact),/gh workflow run vibe2-24h-runner\.yml.*--ref main/);
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
