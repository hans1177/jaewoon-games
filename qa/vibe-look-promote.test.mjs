import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GATE,distance,evaluateCandidate,buildPreset,promote,appendPresetText} from '../tools/vibe-look-promote.mjs';
import {validate,emitBlock,currentBlock} from '../tools/vibe-look-kit.mjs';

const table=JSON.parse(fs.readFileSync('assets/roblox/common-look-v1/look-presets.json','utf8'));
// 기존 프리셋들과 충분히 다른 조명(한밤 푸른 빛, 아주 약한 햇빛)
const novel={ClockTime:3,Brightness:0.9,ShadowSoftness:0.95,Ambient:[20,30,90],OutdoorAmbient:[25,35,100],ColorShift_Top:[90,120,255]};
const cand=(over={})=>({score:80,params:{elevation:20,azimuth:60},roblox:novel,...over});
const goodConfirm={scores:[75,72,70]};

test('관문 기준은 엄격하다(점수 72, 확인 평균 68·최저 60, 3개 모델, 3회 연습, 상한 12)', () => {
  assert.deepEqual([GATE.minScore,GATE.minMean,GATE.minFloor,GATE.minParents,GATE.minRuns,GATE.maxAuto,GATE.perRun],[72,68,60,3,3,12,1]);
});

test('모든 조건을 채운 후보만 통과한다', () => {
  const ok=evaluateCandidate({cand:cand(),runs:5,confirm:goodConfirm,table});
  assert.equal(ok.pass,true,JSON.stringify(ok));
});

test('점수·연습 횟수·재확인·중복·상한 각각이 따로 막는다', () => {
  const f=(args)=>evaluateCandidate({cand:cand(),runs:5,confirm:goodConfirm,table,...args}).failures.join();
  assert.match(f({cand:cand({score:71.9})}),/SCORE_BELOW_GATE/);
  assert.match(f({runs:2}),/TOO_FEW_RUNS/);
  assert.match(f({confirm:null}),/NOT_CONFIRMED/);
  assert.match(f({confirm:{scores:[90,90]}}),/NOT_CONFIRMED/);
  assert.match(f({confirm:{scores:[90,90,59]}}),/CONFIRM_FLOOR_LOW/);   // 한 모델에서 망하면 탈락
  assert.match(f({confirm:{scores:[70,66,66]}}),/CONFIRM_MEAN_LOW/);
  const dup=cand({roblox:{...table.presets[0].lighting}});
  assert.match(f({cand:dup}),/TOO_SIMILAR_TO_EXISTING/);
  const full={...table,presets:[...table.presets,...Array.from({length:12},(_,i)=>({...table.presets[0],id:'auto-x'+i,auto:true}))]};
  assert.match(f({table:full}),/AUTO_PRESET_CAP/);
});

test('후보 프리셋은 룩 키트 검증을 통과하고, 조명만 배운 값이며 나머지는 가까운 프리셋에서 물려받는다', () => {
  const p=buildPreset(cand(),table);
  assert.match(p.id,/^auto-[0-9a-f]{6}$/);
  assert.equal(p.auto,true);
  assert.equal(p.lighting.ClockTime,3);
  assert.deepEqual(p.bloom,table.presets.find(x=>x.id===p.source.inheritsFrom).bloom);
  const next={...table,presets:[...table.presets,p]};
  assert.deepEqual(validate(next),[]);
  assert.ok(emitBlock(next).includes(`["${p.id}"]`));
  assert.ok(distance(p.lighting,table.presets[0].lighting)>0);
});

test('승급 실행: 값싼 검사에서 떨어지면 비싼 재확인을 하지 않고, 통과하면 1개만 추가한다', () => {
  let calls=0;
  const confirm=()=>{calls++;return goodConfirm};
  const weak={x:{runs:9,top:[{score:60,params:{a:1},roblox:novel}]}};
  assert.equal(promote({learned:weak,table,confirm}).promoted,false);assert.equal(calls,0);
  const strong={x:{runs:9,top:[{score:85,params:{a:1},roblox:novel},{score:84,params:{a:2},roblox:{...novel,ClockTime:21}}]}};
  const r=promote({learned:strong,table,confirm});
  assert.equal(r.promoted,true);assert.equal(r.table.presets.length,table.presets.length+1);assert.equal(calls,1);
  // 재확인이 실패하면 승급하지 않고, 재확인은 최대 2번만 시도한다
  calls=0;
  const bad=promote({learned:strong,table,confirm:()=>{calls++;return {scores:[80,80,10]}}});
  assert.equal(bad.promoted,false);assert.ok(calls<=GATE.maxConfirmTries);
});

test('표 파일 끝에 한 줄만 붙이고 기존 내용은 한 글자도 바뀌지 않으며 JSON 이 유효하다', () => {
  const text=fs.readFileSync('assets/roblox/common-look-v1/look-presets.json','utf8');
  const p=buildPreset(cand(),table);
  const out=appendPresetText(text,p);
  const idx=text.lastIndexOf('\n  ]\n}');
  assert.ok(out.startsWith(text.slice(0,idx)));
  assert.equal(JSON.parse(out).presets.at(-1).id,p.id);
  assert.equal(JSON.parse(out).presets.length,table.presets.length+1);
});

test('승급 워크플로: 자체 검증 뒤 스스로 병합하되, 바뀐 파일이 표·생성 구간뿐일 때만, 끄는 변수가 있다', () => {
  const y=fs.readFileSync('.github/workflows/vibe-look-promotion.yml','utf8');
  assert.match(y,/Auto-merge after safety check/);
  assert.match(y,/VIBE_LOOK_AUTOMERGE != 'off'/);
  assert.match(y,/Common\/RobloxCommonLookKit/);   // 룩 정책 게임의 키트 사본도 허용 대상
  assert.match(y,/need" != "2"/);                  // 표와 키트 원본은 반드시 포함
  assert.match(y,/pull-requests: write/);
  // 병합 전에 키트 검증과 테스트가 먼저 나온다
  assert.ok(y.indexOf('Verify the kit and tests')<y.indexOf('Open the promotion PR'));
  assert.ok(y.indexOf('Open the promotion PR')<y.indexOf('Auto-merge after safety check'));
});
