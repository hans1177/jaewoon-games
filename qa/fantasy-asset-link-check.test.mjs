// 파일명: qa/fantasy-asset-link-check.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkFantasyAssets } from '../tools/fantasy-asset-link-check.mjs';
test('마력숲 자산 연결 점검: 모델 키·아이콘 셀·에셋 ID가 모두 등록돼 있다', () => {
  const r = checkFantasyAssets();
  assert.ok(r.registered > 100 && r.modelKeys > 10);
  assert.deepEqual(r.problems, []);
});

test('원본 CC0 아이템·방패는 승인 등록표의 동일 ID를 재사용하고 중복 등록하지 않는다',()=>{
  const registry=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8'));
  const actual=fs.readFileSync('roblox-games/fantasy-survival/shared/VisualAssetIds.luau','utf8');
  const registered=new Map([...actual.matchAll(/([A-Za-z_][\\w]*)\\s*=\\s*(\\d{6,})/g)].map(m=>[m[1],m[2]]));
  assert.equal(registry.itemPackV1.license,'CC0-1.0');
  assert.equal(registry.itemPackV1.licenseEvidence,'https://quaternius.com/packs/ultimaterpg.html');
  for(const [name,id] of Object.entries(registry.itemPackV1.assetIds)){
    assert.equal(registered.get(name),String(id),'licensed item pack registry: '+name);
  }
  for(const name of ['vxToolAxe','vxShieldA','vxShieldB','vxShieldC','vxShieldD']){
    const row=registry.villageExtraV2.models[name];
    assert.equal(row.universeUseGrantVerified,true);
    assert.equal(registered.get(name),String(row.assetId),'licensed weapon model: '+name);
  }
  const uploader=fs.readFileSync('tools/baeksu-war-upload-meshes.mjs','utf8');
  assert.match(uploader,/FOREST_ITEM_PACK_SOURCE_PROVENANCE_REQUIRED/);
  assert.match(uploader,/FOREST_APPROVED_VILLAGE_GEAR_INVALID/);
  assert.match(uploader,/Object\.entries\(registeredGearIds\)\.sort/);
  const config=fs.readFileSync('roblox-games/fantasy-survival/shared/GameConfig.luau','utf8');
  assert.doesNotMatch(config,/item_armor_metal2/,'unregistered mesh must not be referenced');
  assert.match(config,/forest_steel_cuirass.*ModelKey="item_armor_metal"/);
});

test('ghost uses the approved original skeleton fallback, not an invented ghost model ID',()=>{
  const ids=fs.readFileSync('roblox-games/fantasy-survival/shared/VisualAssetIds.luau','utf8');
  const server=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(server,/partId=="ghost" and NativeCreatureAssets\.skeleton/);
  assert.doesNotMatch(ids,/\bghost=\d+/);
  assert.equal(checkFantasyAssets().problems.length,0);
  const bypass=server.replace('partId=="ghost" and NativeCreatureAssets.skeleton','NativeCreatureAssets.wolf');
  assert.notEqual(bypass,server);
  assert.equal(checkFantasyAssets({serverSource:bypass}).problems.filter(x=>x.includes('ghost')).length,2);
  const withoutSkeleton=ids.replace(/\s+skeleton=\d+,/,'');
  assert.notEqual(withoutSkeleton,ids);
  assert.equal(checkFantasyAssets({idsSource:withoutSkeleton}).problems.filter(x=>x.includes('ghost')).length,2);
});
