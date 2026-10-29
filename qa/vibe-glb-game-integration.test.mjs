// 파일명: qa/vibe-glb-game-integration.test.mjs
// 임포트: 기존 Vibe 게임 생성기와 에셋 런타임의 CC0 GLB 연결 회귀 검사
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {buildGeneratedGame, normalizeGeneratedGameAssets} from '../assets/game-generator.js';
import {JaewoonVibeRuntime} from '../assets/vibe-runtime.js';

const cc0 = Object.freeze({
  path:'/assets/roblox/actors/native/quaternius-skeleton/master.glb',
  type:'binary', license:'CC0',
  sha256:'497a736cf80fdaabd2c8804d3f44d08e25d3cb207820eee3155293b682b55e86',
  sourceUrl:'https://opengameart.org/content/lowpoly-animated-monsters',
  licenseEvidenceUrl:'https://creativecommons.org/publicdomain/zero/1.0/'
});

test('generated game accepts pinned internal CC0 GLB actors and wires animated canvas rendering', () => {
  const [actor] = normalizeGeneratedGameAssets({assets:{enemyModel:cc0}});
  assert.equal(actor.format, 'glb');
  assert.equal(actor.license, 'CC0');
  assert.equal(actor.sha256, cc0.sha256);
  const html = buildGeneratedGame({packageData:{gameId:'glb-actor', assets:{enemyModel:cc0}}}).html;
  const generatedModule = html.split('<script type="module">')[1]?.split('</script>')[0];
  assert.ok(generatedModule, 'generated game module not found');
  // Generated HTML embeds a module template. Parse it after stripping static import declarations.
  assert.doesNotThrow(() => new Function(generatedModule.replace(/^import .*?;$/gm, '')));
  assert.match(html, /type="importmap"/);
  assert.match(html, /createVibeModelSprites/);
  assert.match(html, /공통 에셋 미검증/);
  assert.match(html, /licenseEvidenceUrl/);
  assert.match(html, /modelSprites\?\.draw\(ctx/);
  assert.match(html, /modelSprites\?\.advance\(dt\)/);
  assert.match(html, /modelSprites\?\.dispose\(\)/);
  assert.match(html, /quaternius-skeleton\/master\.glb/);
  assert.match(html, /497a736cf80fdaabd2c8804d3f44d08e25d3cb207820eee3155293b682b55e86/);
});

test('unlicensed, remote, unpinned and role-mismatched models remain blocked', () => {
  for (const patch of [
    {license:'CC-BY-NC-4.0'}, {sha256:''}, {sourceUrl:''}, {licenseEvidenceUrl:''},
    {path:'https://remote.example/model.glb'},
    {path:'../enemy.glb'}, {path:'/assets/shared/forest/monster.exe'}
  ]) {
    assert.throws(() => normalizeGeneratedGameAssets({assets:{enemyModel:{...cc0,...patch}}}),
      /GLB requires internal CC0 source|invalid game asset path/);
  }
  assert.throws(() => normalizeGeneratedGameAssets({assets:{enemy:cc0.path}}), /unsupported game image/);
  assert.throws(() => normalizeGeneratedGameAssets({assets:{bgm:cc0.path}}), /unsupported game audio/);
});

test('existing image and audio game manifest stays unchanged', () => {
  assert.deepEqual(normalizeGeneratedGameAssets({assets:{player:'images/hero.png',bgm:'music/theme.ogg'}}),[
    {id:'player',path:'images/hero.png',type:'image'},
    {id:'bgm',path:'music/theme.ogg',type:'audio'}
  ]);
});

test('existing runtime verifies real GLB header and byte hash before scene caching', async () => {
  const glb = new ArrayBuffer(20);
  const header = new DataView(glb);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, 20, true);
  header.setUint32(12, 12, true);
  header.setUint32(16, 0x4e4f534a, true);
  const hash = createHash('sha256').update(new Uint8Array(glb)).digest('hex');
  const originalFetch = globalThis.fetch;
  const originalCrypto = globalThis.crypto;
  try {
    globalThis.crypto=webcrypto;
    globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>glb});
    const runtime=new JaewoonVibeRuntime({gameId:'glb-hash-test',assetBaseUrl:'https://example.test/'});
    const bytes=await runtime.readAsset({url:'https://example.test/actor.glb',type:'binary',format:'glb',sha256:hash});
    assert.equal(bytes.value.byteLength, 20);
    await assert.rejects(runtime.readAsset({url:'https://example.test/actor.glb',type:'binary',format:'glb',sha256:'0'.repeat(64)}),/sha256 mismatch/);
    header.setUint32(0, 0, true);
    await assert.rejects(runtime.readAsset({url:'https://example.test/actor.glb',type:'binary',format:'glb',sha256:hash}),/invalid GLB header/);
    runtime.destroy();
  } finally {
    globalThis.fetch=originalFetch;
    globalThis.crypto=originalCrypto;
  }
});
