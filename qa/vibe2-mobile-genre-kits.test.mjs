import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planAssetApplication } from '../assets/asset-selector.js';

const presetCatalog=JSON.parse(fs.readFileSync(new URL('../assets/prototype-asset-presets.json',import.meta.url),'utf8'));
const manifest={assets:[]};

test('생존 장르는 무거운 3D 모바일 본개발을 Unity Android로 추천한다',()=>{
  const plan=planAssetApplication({prompt:'3D 생존 채집 제작 게임',manifest,presetCatalog});
  assert.equal(plan.prototypePreset.genre,'survival');
  assert.equal(plan.production.recommendedTarget,'unity-android');
  assert.equal(plan.production.heavy3dUnityAndroidPreferred,true);
  assert.equal(plan.production.mobileFirst,true);
  assert.equal(plan.production.webQualityAllowed,true);
  assert.ok(plan.production.unityAndroid.modules.includes('crafting'));
});

test('디펜스는 모바일 Web에서도 고품질 기본 타깃을 유지한다',()=>{
  const plan=planAssetApplication({prompt:'모바일 웹 타워디펜스 웨이브 게임',manifest,presetCatalog});
  assert.equal(plan.prototypePreset.genre,'defense-strategy');
  assert.equal(plan.production.recommendedTarget,'mobile-web');
  assert.equal(plan.production.mobileWeb.qualityTarget,'high-mobile-web');
  assert.ok(plan.production.mobileWeb.input.includes('tap-place'));
});

test('명시적 Web 또는 Unity 요청은 장르 기본값보다 우선한다',()=>{
  const web=planAssetApplication({prompt:'웹 생존 게임',manifest,presetCatalog});
  const unity=planAssetApplication({prompt:'Unity 2D RPG Android 게임',manifest,presetCatalog});
  assert.equal(web.production.recommendedTarget,'mobile-web');
  assert.equal(unity.prototypePreset.genre,'2d-rpg');
  assert.equal(unity.production.recommendedTarget,'unity-android');
});

test('Unity WebGL은 제작 타깃으로 허용하지 않고 Web은 네이티브 모바일 Web 경로로 유지한다',()=>{
  assert.deepEqual(presetCatalog.rules.supportedTargets,['mobile-web','unity-android']);
  assert.equal(presetCatalog.rules.supportedTargets.includes('unity-webgl'),false);
  const plan=planAssetApplication({prompt:'Unity WebGL 생존 게임',manifest,presetCatalog});
  assert.equal(plan.production.recommendedTarget,'mobile-web');
  assert.notEqual(plan.production.recommendedTarget,'unity-webgl');
});

test('무료 외부 제작툴은 후보만 제공하고 자동 설치하지 않는다',()=>{
  const plan=planAssetApplication({prompt:'모바일 액션 RPG',manifest,presetCatalog});
  assert.equal(plan.production.externalToolAutoInstall,false);
  assert.equal(plan.production.externalToolApprovalRequired,true);
  assert.equal(plan.production.publicUseRequiresLicenseLedger,true);
  assert.ok(plan.production.toolCandidates.length>0);
  assert.equal(plan.policy.externalToolAutoInstall,false);
});

test('2분류 Web은 최종 제품이 아니라 Unity Android 본개발 전 테스트베드로 고정된다',()=>{
  const agents=fs.readFileSync(new URL('../AGENTS.md',import.meta.url),'utf8');
  const development=fs.readFileSync(new URL('../.github/agents/development.agent.md',import.meta.url),'utf8');
  const graphics=fs.readFileSync(new URL('../.github/agents/graphics.agent.md',import.meta.url),'utf8');
  const cycle=fs.readFileSync(new URL('../tools/autonomous-department-cycle.mjs',import.meta.url),'utf8');
  assert.match(agents,/Unity Android 본개발 전 사전검증용 Web 테스트베드\/밑그림/);
  assert.match(agents,/최종 제품은 Web이 아니며/);
  assert.match(agents,/2분류 Web은 \*\*최종 게임 제작 대상이 아니라 Unity 전 테스트 수단\*\*/);
  assert.match(development,/최종 Web 게임을 만들지 않는다/);
  assert.match(development,/KEEP \/ CHANGE \/ DROP \/ UNITY_IMPLEMENTATION_NOTE/);
  assert.match(graphics,/최종 Web 게임을 만들지 않는다/);
  assert.match(graphics,/KEEP \/ CHANGE \/ DROP \/ UNITY_ART_NOTE/);
  assert.match(graphics,/Unity WebGL을 만들거나 제안하지 않는다/);
  assert.match(graphics,/최종 Web 제품 품질을 목표로 하지 않는다/);
  assert.doesNotMatch(development,/하루 총 1개 통합 아트북/);
  assert.doesNotMatch(graphics,/하루 총 1개 통합 아트북/);
  assert.match(cycle,/\.github\/agents\/\$\{ROLE_AGENT\[role\]\}\.agent\.md/);
});
