import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {loadTable,validate,emitBlock,currentBlock} from '../tools/vibe-look-kit.mjs';

const luauPath='assets/roblox/common-look-v1/RobloxCommonLookKit.luau';
const clone=o=>JSON.parse(JSON.stringify(o));

test('프리셋 표가 검증을 통과하고 Luau 생성 구간과 같다', () => {
  const t=loadTable();
  assert.deepEqual(validate(t),[]);
  assert.ok(t.presets.length>=6);
  assert.equal(currentBlock(fs.readFileSync(luauPath,'utf8')),emitBlock(t));
  const r=spawnSync('node',['tools/vibe-look-kit.mjs','--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
});

test('범위 밖 숫자·잘못된 색·모르는 속성·중복 id·빠진 구간을 모두 잡는다', () => {
  const t=clone(loadTable());
  t.presets[0].lighting.Brightness=99;
  t.presets[0].lighting.Ambient=[300,0,0];
  t.presets[0].bloom.Sparkle=1;
  t.presets[1].id=t.presets[2].id;
  delete t.presets[3].atmosphere;
  const e=validate(t).join(' ');
  for(const k of ['OUT_OF_RANGE:storybook:lighting.Brightness','BAD_COLOR:storybook:lighting.Ambient','UNKNOWN_PROPERTY:storybook:bloom.Sparkle','DUPLICATE_ID','MISSING_SECTION'])assert.ok(e.includes(k),k);
});

test('프리셋이 서로 눈에 띄게 다르다(전부 같은 룩이면 의미가 없다)', () => {
  const t=loadTable();
  const sig=p=>`${p.lighting.ClockTime}|${p.colorCorrection.Saturation}|${p.atmosphere.Density}`;
  assert.equal(new Set(t.presets.map(sig)).size,t.presets.length);
  const sat=t.presets.map(p=>p.colorCorrection.Saturation);
  assert.ok(Math.max(...sat)-Math.min(...sat)>=0.4,'채도 폭이 너무 좁다');
  const bright=t.presets.map(p=>p.lighting.Brightness);
  assert.ok(Math.max(...bright)-Math.min(...bright)>=1.5,'밝기 폭이 너무 좁다');
});

test('Luau 모듈은 새 파츠를 만들지 않고, 게임이 만든 효과를 덮어쓰지 않는다', () => {
  const src=fs.readFileSync(luauPath,'utf8');
  assert.doesNotMatch(src,/Instance\.new\("(Part|MeshPart|WedgePart|SpawnLocation)"\)/);
  assert.match(src,/function Kit\.Apply\(id, opts\)/);
  assert.match(src,/gameOwns\(className\)/);
  assert.match(src,/respectGameEffects ~= false/);
  assert.match(src,/function Kit\.Clear\(\)/);
  for(const p of loadTable().presets)assert.ok(src.includes(`["${p.id}"] = {`),p.id);
});

// Luau 컴파일러가 있을 때만(CI): 룩 키트와 리그 키트 모두 문법 오류 없이 컴파일돼야 한다.
const compiler=process.env.VIBE2_TEST_LUAU_COMPILER;
test('Luau 컴파일러로 룩 키트와 리그 키트가 컴파일된다', {skip:!compiler&&'VIBE2_TEST_LUAU_COMPILER 없음'}, () => {
  for(const f of [luauPath,'assets/roblox/common-rig-kit-v1/RobloxCommonRigKit.luau']){
    const r=spawnSync(compiler,['--text',f],{encoding:'utf8',maxBuffer:1<<26});
    assert.equal(r.status,0,`${f}\n${String(r.stderr||r.stdout).slice(0,500)}`);
  }
});
