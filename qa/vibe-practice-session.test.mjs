import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {blenderAvailable,pickParents,mulberry32} from '../tools/vibe-variation-gym.mjs';
import {runPracticeSession,pickPracticeParents} from '../tools/vibe-practice-session.mjs';
import {loop} from '../tools/vibe-practice-loop.mjs';
import {exerciseVibeUiLayouts} from '../assets/vibe-presentation-director.js';

const imaging=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'ps-'));

test('UI 자동 연습은 18종 화면·3종 모바일 비율을 실측 채점하며 게임 적용을 주장하지 않는다', () => {
  const practice=exerciseVibeUiLayouts();
  assert.equal(practice.surfaces.length,18);
  assert.deepEqual(practice.viewports,['SMALL_PORTRAIT','MOBILE_PORTRAIT','MOBILE_LANDSCAPE']);
  assert.equal(practice.trials,18*3*2);
  assert.equal(practice.staticPasses+practice.staticFailures,practice.trials);
  assert.ok(practice.meanScore>=0&&practice.meanScore<=100);
  assert.ok(practice.rows.some(row=>row.surface==='INVENTORY'));
  assert.ok(practice.rows.some(row=>row.surface==='COMBAT'));
  assert.ok(practice.rows.some(row=>row.surface==='BOSS'));
  assert.ok(practice.rows.some(row=>row.surface==='NOTIFICATION'));
  assert.equal(practice.surfaces.length,new Set(practice.surfaces).size);
  assert.ok(practice.rows.every(row=>row.gameApplied===false&&row.runtimeVerified===false));
  assert.equal(practice.measurement,'SYNTHETIC_UI_DESIGN_AND_BINDING_CONTRACT');
  assert.equal(practice.screenshotsCaptured,false);
  assert.deepEqual(exerciseVibeUiLayouts().rows,practice.rows);
});

test('연습 부모 선택은 시드가 같으면 같고 승인된 CC0만 고른다', () => {
  const a=pickPracticeParents(process.cwd(),5),b=pickPracticeParents(process.cwd(),5);
  assert.deepEqual(a,b);
  const reg=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  for(const p of a){const row=reg.assets.find(x=>x.id===p.id);assert.ok(row);assert.match(String(row.license),/^CC0/);assert.ok(!row.securityBlocked&&!row.quarantined);assert.ok(fs.existsSync(p.file))}
});

test('승인된 CC0 아이콘은 64px 실측·실패 차단을 연습하고 게임 적용으로 간주하지 않는다',
  {skip:!imaging&&'Pillow/numpy 없음'},()=>{
  const root=tmp(),file=path.join(root,'assets','icon.png');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const py=spawnSync('python3',['-c',
    'from PIL import Image\nimport sys\nim=Image.new("RGBA",(128,128),(0,0,0,0))\nfor y in range(16,112):\n for x in range(16,112):\n  im.putpixel((x,y),(40,80,235,255) if y<64 else (255,220,90,255))\nim.save(sys.argv[1])',file],
    {encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);
  const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const reg={assets:[
    {id:'aaa-ui-bar',family:'UI',license:'CC0',
      sourceFiles:['assets/icon.png'],sourceSha256:sha,catalogActive:true},
    {id:'approved-icon',family:'ICON',license:'CC0',
      sourceFiles:['assets/icon.png'],sourceSha256:sha,catalogActive:true}
  ]};
  fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify(reg));
  const {session}=runPracticeSession({repoRoot:root,seed:1,parents:1,variants:1,
    out:'build/icon-good',light:false,bake:false});
  assert.equal(session.iconStudy.parent,'approved-icon');
  assert.equal(session.iconStudy.eligibleIcons,1);
  assert.equal(session.iconStudy.sourceSha256,sha);
  assert.equal(session.iconStudy.measured,true);
  assert.equal(session.iconStudy.legible,true);
  assert.ok(session.iconStudy.pixels64>=220);
  assert.ok(session.iconStudy.contrast64>=0.09);
  assert.equal(session.practiceDomains.ICON.trials,1);
  assert.equal(session.practiceDomains.ICON.staticMeasured,1);
  assert.equal(session.iconStudy.gameApplied,false);
  reg.assets.find(a=>a.id==='approved-icon').sourceSha256='0'.repeat(64);
  fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify(reg));
  const blocked=runPracticeSession({repoRoot:root,seed:2,parents:1,variants:1,
    out:'build/icon-blocked',light:false,bake:false}).session;
  assert.equal(blocked.iconStudy,undefined);
  assert.equal(blocked.practiceDomains.ICON.trials,0);
});

test('루프: 실패한 회차가 있어도 계속 돌고, 최대 회차에서 멈추며, STOP 파일이면 멈춘다', async () => {
  const root=tmp();fs.mkdirSync(path.join(root,'build'));
  let calls=0;
  const fake=()=>{calls++;if(calls===2)throw new Error('boom');return {session:{gym:{tally:{IMPROVED:1}},light:{best:60},bake:{pass:true}}}};
  const logs=[];
  const r=await loop({interval:0,max:4,doPublish:false,repoRoot:root,session:fake,log:m=>logs.push(m)});
  assert.equal(r.rounds,4);assert.equal(r.fails,1);
  assert.ok(logs.some(l=>/실패\(계속함\)/.test(l)));
  // STOP 파일이 미리 있으면 시작할 때 지우므로, 도는 도중 만들어지게 한다
  let n=0;
  const stopper=()=>{n++;if(n===2)fs.writeFileSync(path.join(root,'build','STOP'),'');return {session:{gym:{tally:{}},light:null,bake:null}}};
  const r2=await loop({interval:0,max:0,doPublish:false,repoRoot:root,session:stopper,log:()=>{}});
  assert.equal(r2.rounds,2);
});

test('실제 Blender: 한 회차가 변형·조명 탐색·굽기를 모두 하고 session.json 을 남긴다', {skip:(!blenderAvailable()||!imaging)&&'Blender 또는 Pillow/numpy 없음'}, () => {
  const root=process.cwd(),out=path.join(tmp(),'out');
  const stats=path.join(tmp(),'stats.json'),lights=path.join(tmp(),'lights.json');
  // [실제 재학습 순서] 지난 회차에 많이 검사한 승인 캐릭터보다 미검사 모델을 우선한다.
  const reg=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const actors=pickParents(reg,root,1e9,mulberry32(3+43))
    .filter(p=>/CHARACTER|CREATURE|NPC|HERO|MONSTER/i.test(p.family)&&
      /\.(?:glb|gltf)$/i.test(p.file));
  assert.ok(actors.length>1);
  const chosen=actors.at(-1),historyPath=path.join(tmp(),'prior-practice.json');
  const history=Object.fromEntries(actors.map(p=>[p.id,{
    sourceSha256:p.approvedSourceSha256,attempts:p.id===chosen.id?0:6
  }]));
  fs.writeFileSync(historyPath,JSON.stringify({rig:{history}}));
  const {session}=runPracticeSession({repoRoot:root,seed:3,parents:1,variants:3,out,
    statsPath:stats,lightsPath:lights,lightCandidates:3,lightRounds:1,
    bakeHistoryPath:historyPath});
  assert.ok(session.gym.children>=1);
  assert.equal(session.ui.trials,108);
  assert.equal(session.ui.gameApplied,false);
  assert.equal(session.assetCoverage.registryAssets,JSON.parse(fs.readFileSync('company-asset-library.json','utf8')).assets.length);
  assert.ok(session.assetCoverage.cataloguedAssets>=session.assetCoverage.registryAssets);
  assert.ok(session.assetCoverage.scannedCatalogs.some(x=>x.endsWith('asset-manifest.json')));
  assert.equal(session.assetCoverage.nativeRuntimeVerified,false);
  assert.equal(session.practiceDomains.BUTTON.trials,108);
  assert.ok(session.rigStudy&&typeof session.rigStudy.measured==='boolean');
  assert.equal(session.rigStudy.parent,chosen.id);
  assert.equal(session.rigStudy.priorAttempts,0);
  assert.equal(session.rigStudy.eligibleActors,actors.length);
  assert.equal(session.rigStudy.sourceSha256,chosen.approvedSourceSha256);
  assert.equal(typeof session.rigStudy.motionCurvesMeasured,'boolean');
  assert.equal(session.rigStudy.gameplayMotionVerified===true,false);
  if(session.rigStudy.measured){
    assert.ok(Number.isSafeInteger(session.rigStudy.curveInspectedClips));
    assert.ok(Number.isSafeInteger(session.rigStudy.validMovingClips));
    assert.ok(session.rigStudy.validMovingClips<=session.rigStudy.curveInspectedClips);
    assert.ok(Number.isSafeInteger(session.rigStudy.movingBoneCurves));
    assert.ok(Array.isArray(session.rigStudy.dynamicClipPresent));
    const motionPassed=session.practiceDomains.MOTION.staticMeasured>=1;
    const attackPassed=session.practiceDomains.ACTION.staticMeasured>=1;
    assert.equal(motionPassed,session.rigStudy.motionCurvesMeasured&&
      session.rigStudy.dynamicClipPresent.some(x=>x==='IDLE'||x==='MOVE'));
    assert.equal(attackPassed,session.rigStudy.motionCurvesMeasured&&
      session.rigStudy.dynamicClipPresent.includes('ATTACK'));
  }
  assert.equal(session.rigStudy.nativeRuntimeVerified,false);
  assert.equal(session.rigStudy.gameApplied,false);
  assert.ok(session.practiceDomains.RIG.trials>=1);
  assert.ok(session.practiceDomains.JOINT.trials>=1);
  assert.ok(session.practiceDomains.MOTION.trials>=1);
  assert.ok(session.practiceDomains.ACTION.trials>=1);
  if(session.rigStudy.measured){
    assert.ok(Number.isSafeInteger(session.rigStudy.bones));
    assert.ok(Array.isArray(session.rigStudy.clipNameMissing));
    assert.equal(session.practiceDomains.RIG.staticMeasured<=1,true);
  }
  assert.equal(session.practiceDomains.ICON.nativeRuntimeVerified,false);
  if(session.iconStudy){
    assert.equal(session.iconStudy.nativeRuntimeVerified,false);
    assert.equal(session.iconStudy.gameApplied,false);
    assert.equal(session.practiceDomains.ICON.trials>=1,true);
  }
  assert.equal(session.productionPromotionAllowed,false);
  // 모든 분야에서 시도 횟수는 통과·실패 합과 같아야 한다. 노멀맵 실패 누락 방지.
  for(const [domain,record] of Object.entries(session.practiceDomains))
    assert.equal(record.trials,record.staticMeasured+record.unverifiedOrFailed,domain);
  assert.equal(session.practiceDomains.MATERIAL.unverifiedOrFailed>=
    (session.bake?.attempts||[]).filter(attempt=>attempt.pass!==true).length,true);
  const learnedUi=JSON.parse(fs.readFileSync(stats,'utf8')).UI;
  assert.ok(learnedUi['hud_layout:soft'].n>=3);
  assert.ok(learnedUi['inventory_layout:strong'].n>=3);
  assert.ok(learnedUi['inventory_layout:strong'].designScoreSum>=300);
  assert.equal(learnedUi['inventory_layout:strong'].designSamples,3);
  assert.equal(learnedUi['inventory_layout:strong'].bindingIssues,0);
  assert.ok(session.light&&Number.isFinite(session.light.best),JSON.stringify(session.light));
  assert.ok(session.bake&&typeof session.bake.pass==='boolean',JSON.stringify(session.bake));
  assert.ok(fs.existsSync(path.join(out,'session.json')));
  const learned=JSON.parse(fs.readFileSync(lights,'utf8'));
  assert.ok(Object.values(learned)[0].top.length>=1);
});

test('3D 연습용 CC0 원본이 없어도 임의 생성하지 않고 UI 분류·부족 기록만 남긴다',()=>{
  const root=tmp();fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
    assets:[{id:'missing',family:'CHARACTER',license:'CC0',sourceFiles:['missing.glb']}]
  }));
  const {session}=runPracticeSession({repoRoot:root,seed:2,parents:1,variants:1,
    out:'build/practice',light:false,bake:false});
  assert.equal(session.assetShortage,'NO_ELIGIBLE_CC0_PARENT');
  assert.equal(session.gym.children,0);
  assert.equal(session.assetCoverage.eligible3dAssets,0);
  assert.equal(session.practiceDomains.RIG.nativeRuntimeVerified,false);
  assert.equal(session.practiceDomains.UI.trials,108);
  assert.equal(session.productionPromotionAllowed,false);
  assert.ok(fs.existsSync(path.join(root,'build/practice/gym/ledger.json')));
});

test('클라우드 연습은 cron 에만 기대지 않고 회차가 끝날 때 스스로 다음 회차를 예약한다(체인), 끄는 변수와 안전망이 있다', () => {
  const y=fs.readFileSync('.github/workflows/vibe-variation-practice.yml','utf8');
  assert.match(y,/actions: write/);
  assert.match(y,/Chain the next run/);
  assert.match(y,/always\(\) && vars\.VIBE_GYM_CLOUD != 'off' && vars\.VIBE_GYM_CHAIN != 'off'/);
  assert.match(y,/workflows\/vibe-variation-practice\.yml\/dispatches/);
  assert.match(y,/cron: '\*\/5 \* \* \* \*'/);                    // 안전망
  // [메인 큐 보존] PR 읽기 전용 검사는 별도 큐를 쓰더라도 main 연습 동시 실행 방지는 유지한다.
  const group=(y.match(/^  group: ([^\n]+)$/m)||[])[1]||'';
  const mainQueuePreserved=group==='vibe-variation-practice'||
    (group.includes("github.event_name == 'pull_request'")&&
      group.includes('github.event.pull_request.number')&&
      group.includes("|| 'vibe-variation-practice'"));
  assert.equal(mainQueuePreserved,true,'main 연습 동시 실행 큐가 유지되어야 한다');
  assert.match(y,/cancel-in-progress: false/);
  assert.match(y,/practice-cloud:\n    if: .*github.event_name != 'pull_request'/);
  assert.match(y,/practice-local:\n    if: .*github.event_name != 'pull_request'/);
  assert.ok(y.indexOf('Publish stats to vibe-gym-data')<y.indexOf('Chain the next run'));  // 학습 저장 뒤에 예약
});
