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
