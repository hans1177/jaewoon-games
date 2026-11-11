import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mulberry32,pickParents,chooseDiverseParents,chooseArms,armKey,judge,updateStats,OPERATORS,STRENGTHS,kitbashModes,blenderAvailable,runGymSession,rigGate,motionCoverage,classifyPracticeAsset,buildPracticeAssetCoverage,ASSET_PRACTICE_DOMAINS} from '../tools/vibe-variation-gym.mjs';
import {summarize} from '../tools/vibe-gym-publish.mjs';

const repo=process.cwd();
const imaging=spawnSync('python3',['-c','import PIL,numpy'],{encoding:'utf8'}).status===0;
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'gym-'));

test('부모 후보는 오너 승인 CC0·실제 파일·비파생·막힘 없는 것만 고른다', () => {
  const root=tmp();fs.mkdirSync(path.join(root,'a'));
  for(const f of ['ok.obj','blocked.obj','derived.obj','pay.obj'])fs.writeFileSync(path.join(root,'a',f),'o valid\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
  const reg={assets:[
    {id:'ok',license:'CC0',family:'PROP',sourceFiles:['a/ok.obj']},
    {id:'blocked',license:'CC0',family:'PROP',sourceFiles:['a/blocked.obj'],securityBlocked:true},
    {id:'derived',license:'CC0',family:'PROP',sourceFiles:['a/derived.obj'],derivedFromAssetId:'ok'},
    {id:'pay',license:'CC-BY-4.0',family:'PROP',sourceFiles:['a/pay.obj']},
    {id:'nofile',license:'CC0',family:'PROP',sourceFiles:['a/missing.obj']},
    {id:'texture',license:'CC0',family:'PROP',sourceFiles:['a/ok.png']},
    {id:'inactive',license:'CC0',family:'PROP',catalogActive:false,sourceFiles:['a/ok.obj']},
    {id:'corrupt',license:'CC0',family:'PROP',corruptSource:true,sourceFiles:['a/ok.obj']},
    {id:'wrong-hash',license:'CC0',family:'PROP',sourceSha256:'0'.repeat(64),sourceFiles:['a/ok.obj']},
    {id:'escape',license:'CC0',family:'PROP',sourceFiles:['../outside.obj']},
  ]};
  reg.assets[0].sourceSha256=crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root,'a','ok.obj'))).digest('hex');
  assert.deepEqual(pickParents(reg,root,10,mulberry32(1)).map(p=>p.id),['ok']);
  assert.equal(pickParents(reg,root,10,mulberry32(1))[0].approvedSourceSha256,reg.assets[0].sourceSha256);
});

test('합격한 변형은 출처·조리법·아이콘 가독성 기록만 보관하고 게임 적용으로 오인하지 않는다', () => {
  const rows=[{id:'test-a',parentId:'cc0-a',parentSha256:'a'.repeat(64),license:'CC0',family:'PROP',op:'outline',arm:'outline:soft',params:{thickness:0.01},score:81,gain:2,novelty:0.15,verdict:'IMPROVED',keep:true,glbSha256:'b'.repeat(64),icon:{legible:true,pixels64:410,contrast64:0.34}}];
  const out=JSON.parse(summarize(rows).trim());
  assert.deepEqual(out.params,{thickness:0.01});
  assert.deepEqual(out.icon,{legible:true,pixels64:410,contrast64:0.34});
  assert.equal(out.keep,true);assert.equal(out.license,'CC0');
  assert.equal(out.registered,false);assert.equal(out.gameApplied,false);
});

test('리깅과 모션 연습은 독립 판정: 실제 액션 클립 부족 시 모션 완료를 주장하지 않는다',()=>{
  const coverage=motionCoverage(['Idle_Breathe','Walk_Forward','Slash_Attack','Hurt']);
  assert.deepEqual(coverage.present,['IDLE','MOVE','ATTACK','HIT']);
  assert.deepEqual(coverage.missing,['DEATH']);assert.equal(coverage.coverage,0.8);
  assert.equal(coverage.nativeRuntimeVerified,false);
  const row=rigGate({family:'CREATURE',keep:true,verdict:'IMPROVED',glb:'creature.glb'},()=>({
    pass:true,failures:[],productionEligible:false,productionBlockers:['PRIMITIVE_BUILT_MESH'],
    actionNames:['Idle','Walk']
  }));
  assert.equal(row.keep,true);assert.equal(row.audit.productionEligible,false);
  assert.deepEqual(row.motion.missing,['ATTACK','HIT','DEATH']);
  assert.equal(row.motion.gameApplied,false);
  assert.deepEqual(motionCoverage([]).missing,['IDLE','MOVE','ATTACK','HIT','DEATH']);
});

test('메쉬·리그·관절·모션·액션부터 UI 버튼 아이콘까지 실제 카탈로그를 연습 분야로 분류한다',()=>{
  const actor=classifyPracticeAsset({id:'wolf',family:'CREATURE'});
  for(const key of ['MESH','RIG','JOINT','MOTION','ACTION','MATERIAL'])assert.ok(actor.targets.includes(key),key);
  const design=classifyPracticeAsset({id:'hud',family:'UI'});
  assert.ok(['UI','BUTTON','ICON'].every(key=>design.targets.includes(key)));
  assert.ok(classifyPracticeAsset({family:'MOTION'}).targets.includes('MOTION'));
  assert.ok(classifyPracticeAsset({family:'AUDIO'}).targets.includes('AUDIO'));
  assert.ok(classifyPracticeAsset({family:'ENVIRONMENT'}).targets.includes('ENVIRONMENT'));
  assert.ok(classifyPracticeAsset({id:'real-mesh',family:'PROP',file:'assets/real-mesh.obj'}).targets.includes('MESH'));
  assert.ok(!classifyPracticeAsset({id:'metadata-only',family:'PROP'}).targets.includes('MESH'));
  assert.equal(actor.nativeRuntimeVerified,false);
  assert.ok(ASSET_PRACTICE_DOMAINS.length>=16);
});

test('분류는 출처/실물 없는 등록 자산을 연습 가능 또는 검증 통과로 오인하지 않는다',()=>{
  const root=tmp();fs.mkdirSync(path.join(root,'source'));
  fs.writeFileSync(path.join(root,'source','hero.obj'),'o hero\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
  fs.writeFileSync(path.join(root,'source','invalid.glb'),'practice fixture');
  const coverage=buildPracticeAssetCoverage({assets:[
    {id:'safe',family:'CHARACTER',license:'CC0',sourceFiles:['source/hero.obj']},
    {id:'invalid',family:'CHARACTER',license:'CC0',sourceFiles:['source/invalid.glb']},
    {id:'missing',family:'CHARACTER',license:'CC0',sourceFiles:['source/missing.glb']},
    {id:'blocked',family:'PROP',license:'CC0',securityBlocked:true,sourceFiles:['source/hero.obj']},
    {id:'ui',family:'UI',license:'unknown',sourceFiles:[]}
  ]},root);
  assert.equal(coverage.cataloguedAssets,5);
  assert.equal(coverage.eligible3dAssets,1);
  assert.equal(coverage.domains.RIG.catalogued,3);
  assert.equal(coverage.domains.RIG.eligible3d,1);
  assert.equal(coverage.domains.BUTTON.catalogued,1);
  assert.equal(coverage.nativeRuntimeVerified,false);
  assert.equal(coverage.gameApplied,false);
  assert.ok(coverage.shortages.some(x=>x.id==='missing'));
  assert.ok(coverage.shortages.some(x=>x.id==='invalid'));
  assert.equal(pickParents({assets:[{id:'fake',license:'CC0',family:'PROP',sourceFiles:['source/invalid.glb']}]},root,1,mulberry32(5)).length,0);
});

test('게임 자산 전수 분류는 미등록 실파일을 포함하지만 임의 승인/런타임 성공으로 처리하지 않는다',()=>{
  const root=tmp();
  for(const [name,bytes] of [
    ['assets/common-ui/buttons/start.svg','<svg/>'],
    ['assets/common-ui/icons/map.svg','<svg/>'],
    ['web-games/demo/assets/background.webp','webp'],
    ['roblox-games/demo/assets/footstep.wav','wave'],
    ['unity-games/demo/Assets/wood.mat','material']
  ]){
    const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,bytes);
  }
  const report=buildPracticeAssetCoverage({assets:[]},root);
  assert.equal(report.registryAssets,0);
  assert.equal(report.observedRepositoryMediaFiles,5);
  assert.equal(report.cataloguedAssets,5);
  assert.equal(report.eligible3dAssets,0);
  assert.ok(report.domains.BUTTON.catalogued>=1);
  assert.ok(report.domains.ICON.catalogued>=1);
  assert.ok(report.domains.ENVIRONMENT.catalogued>=1);
  assert.ok(report.domains.AUDIO.catalogued>=1);
  assert.ok(report.domains.MATERIAL.catalogued>=1);
  assert.equal(report.domains.BUTTON.catalogued,1);
  assert.equal(report.domains.ICON.catalogued,1);
  assert.equal(report.domains.UI.catalogued,2);
  assert.equal(report.gameApplied,false);
});

test('연습 대상은 소품·몬스터·캐릭터·배경을 우선 섞고 부족할 때 같은 가족을 채운다', () => {
  const pool=[{id:'prop-a',family:'PROP'},{id:'prop-b',family:'PROP'},{id:'enemy',family:'CREATURE'},{id:'hero',family:'CHARACTER'},{id:'world',family:'ENVIRONMENT'}];
  assert.deepEqual(chooseDiverseParents(pool,3).map(x=>x.id),['prop-a','enemy','hero']);
  assert.deepEqual(chooseDiverseParents(pool,5).map(x=>x.id),['prop-a','enemy','hero','world','prop-b']);
  assert.deepEqual(chooseDiverseParents(pool,0),[]);
});

test('시드가 같으면 부모·팔(연산:세기) 선택이 같다(재현 가능)', () => {
  const stats={PROP:{'outline:soft':{n:4,gainSum:40,keep:4,improved:4,broken:0},'bevel:soft':{n:4,gainSum:0,keep:0,improved:0,broken:0}}};
  assert.deepEqual(chooseArms(stats,'PROP',6,mulberry32(5)),chooseArms(stats,'PROP',6,mulberry32(5)));
});

test('성적표가 쌓이면 이득이 큰 팔을 더 자주 고르고, 같은 연산도 세기별로 따로 배운다', () => {
  const stats={PROP:{
    'outline:soft':{n:5,gainSum:50,keep:5,improved:5,broken:0},
    'outline:strong':{n:5,gainSum:-40,keep:0,improved:0,broken:0},   // 같은 연산이라도 세게 주면 해롭다
    'bevel:soft':{n:5,gainSum:-20,keep:0,improved:0,broken:0}}};
  const picks=chooseArms(stats,'PROP',600,mulberry32(9),0.1);
  const count=(op,st)=>picks.filter(x=>x.op===op&&x.strength===st).length;
  assert.ok(count('outline','soft')>count('outline','strong')*3,`${count('outline','soft')} vs ${count('outline','strong')}`);
  const cold=chooseArms({},'PROP',800,mulberry32(2));
  for(const op of Object.keys(OPERATORS))for(const st of STRENGTHS)assert.ok(cold.some(x=>x.op===op&&x.strength===st),armKey(op,st));
});

test('세기 구간이 실제로 다르다: strong 파라미터는 soft보다 크다', () => {
  const rng=mulberry32(3);
  const soft=Array.from({length:50},()=>OPERATORS.saturate_contrast.sample(rng,'soft').contrast);
  const strong=Array.from({length:50},()=>OPERATORS.saturate_contrast.sample(rng,'strong').contrast);
  assert.ok(Math.max(...soft)<Math.min(...strong));
  const b=OPERATORS.bevel;assert.ok(b.sample(rng,'soft').width<b.sample(rng,'strong').width);
});

test('부품 조립 규칙표: 어울리는 조합만 허용하고 엉뚱한 조합은 시도하지 않는다', () => {
  assert.deepEqual(kitbashModes('house.obj','lampRoundFloor.glb'),['top']);
  assert.deepEqual(kitbashModes('house.obj','bench_A.obj'),['side']);
  assert.deepEqual(kitbashModes('tree.obj','table.glb'),[]);       // 나무 위 탁자
  assert.deepEqual(kitbashModes('heart.obj','rugDoormat.glb'),[]); // 하트 위 러그
  assert.ok(kitbashModes('tree.obj','mushroom.glb').includes('top'));
});

test('판정: 고장·너무 비슷함·개선·다양성·후퇴를 가른다', () => {
  assert.equal(judge({ok:false}).verdict,'BROKEN');
  assert.equal(judge({ok:true,empty:true}).verdict,'BROKEN');
  assert.equal(judge({ok:true,novelty:0.003,gain:9}).verdict,'TOO_SIMILAR');
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:3}),{verdict:'IMPROVED',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-0.5}),{verdict:'VARIETY',keep:true});
  assert.deepEqual(judge({ok:true,novelty:0.1,gain:-6}),{verdict:'REGRESSED',keep:false});
});

test('판정: 점수가 올라도 안쪽이 어두워지거나 세부가 뭉개지거나 부품이 떠 있으면 후퇴', () => {
  const base={ok:true,novelty:0.2,gain:8};
  assert.deepEqual(judge({...base,darkening:0.3,detailDrop:0}),{verdict:'REGRESSED',keep:false,reason:'DARKENED'});
  assert.equal(judge({...base,darkening:0,detailDrop:0.6}).reason,'DETAIL_LOST');
  assert.equal(judge({...base,darkening:0,detailDrop:0,attach:{touched:false,gap:0.2}}).reason,'FLOATING_PART');
  assert.equal(judge({...base,darkening:0.05,detailDrop:0.1,attach:{touched:true,gap:0}}).verdict,'IMPROVED');
});

test('성적표 갱신: 횟수·이득 합·유지·개선·고장을 센다', () => {
  const s=updateStats({}, 'PROP',[{arm:'bevel:soft',op:'bevel',gain:2,keep:true,verdict:'IMPROVED'},{arm:'bevel:soft',op:'bevel',gain:-4,keep:false,verdict:'REGRESSED'},{arm:'outline:strong',op:'outline',gain:0,keep:false,verdict:'BROKEN'}]);
  assert.deepEqual(s.PROP['bevel:soft'],{n:2,gainSum:-2,keep:1,improved:1,broken:0,fail:{REGRESSED:1},qualityTrials:2,qualityGainSum:-2});
  assert.equal(s.PROP['outline:strong'].broken,1);
});

function png(dir,name,py){fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,name);
  assert.equal(spawnSync('python3',['-c',`from PIL import Image,ImageDraw\nim=Image.new('RGBA',(256,256),(0,0,0,0));d=ImageDraw.Draw(im)\n${py}\nim.save(${JSON.stringify(f)})`]).status,0);return f}
const scorer=(...a)=>JSON.parse(spawnSync('python3',[path.join(repo,'tools','vibe_object_score.py'),...a],{encoding:'utf8'}).stdout.trim().split('\n').pop());

test('2.5D 아이콘은 기존 투명 PNG에서 128/64px 후보를 만들고 작은 화면 가독성을 기록한다', {skip:!imaging&&'Pillow/numpy 없음'}, () => {
  const dir=tmp();
  const render=png(dir,'item.png',"d.rectangle([60,70,195,220],fill=(185,45,50,255));d.polygon([(65,70),(128,20),(195,70)],fill=(245,199,40,255))");
  const res=scorer('--png',render,'--icon-dir',path.join(dir,'icons'));
  const icon=res.results[0].icon;
  assert.equal(icon.files.length,2);
  assert.ok(icon.pixels64>=220);
  for(const file of icon.files)assert.ok(fs.statSync(file).size>100);
  assert.ok(typeof icon.legible==='boolean');
  const reg=fs.existsSync(path.join(dir,'company-asset-library.json'));
  assert.equal(reg,false); // 연습은 게임 에셋 등록이 아니다
});

test('오브젝트 점수기: 명암·색이 있는 물체가 밋밋한 회색 덩어리보다 높고, 같은 그림의 새로움은 0이며, 빈 그림은 0점', {skip:!imaging&&'Pillow/numpy 없음'}, () => {
  const d=tmp();
  const rich=png(d,'rich.png',"d.rectangle([60,100,200,210],fill=(200,80,60,255]);d.polygon([(50,100),(130,40),(210,100)],fill=(90,50,160,255));d.rectangle([90,140,120,210],fill=(250,200,60,255));d.ellipse([150,120,190,160],fill=(40,150,200,255))".replace('255]);d.polygon','255));d.polygon'));
  const gray=png(d,'gray.png',"d.ellipse([50,50,210,210],fill=(120,120,120,255))");
  const empty=png(d,'empty.png',"pass");
  const r=scorer('--png',rich,'--png',gray,'--png',empty,'--parent',rich).results;
  assert.ok(r[0].score>r[1].score+10,`${r[0].score} vs ${r[1].score}`);
  assert.equal(r[0].novelty,0);
  assert.ok(r[1].novelty>0.05);
  assert.equal(r[2].score,0);
  assert.equal(r[2].empty,true);
});

// 실제 Blender(bpy)가 있을 때만: 진짜 CC0 부모 1개를 변형·렌더·채점해 성적 기록까지 끝에서 끝으로 돌린다.
test('실제 Blender: CC0 부모 변형 → 렌더 → 채점 → 출처·해시가 남는 성적표', {skip:(!blenderAvailable()||!imaging)&&'Blender/bpy 또는 Pillow 없음',timeout:600000}, () => {
  const out=tmp(),statsPath=path.join(out,'stats.json');
  const before=crypto.createHash('sha256').update(fs.readFileSync('company-asset-library.json')).digest('hex');
  const {ledger}=runGymSession({repoRoot:repo,parents:1,variants:3,seed:11,out:path.relative(repo,out),statsPath,only:['external-tinytreats-bench-a-v1']});
  assert.ok(ledger.length>=1&&ledger.length<=3);
  for(const r of ledger){
    assert.match(r.arm,/^[a-z_]+:(soft|strong)$/);
    assert.ok(Number.isFinite(r.darkening)&&Number.isFinite(r.detailDrop));
    assert.equal(r.parentId,'external-tinytreats-bench-a-v1');
    assert.equal(r.license,'CC0');
    assert.equal(r.registered,false); // 자식은 오너 승인 전 자동 등록되지 않는다
    assert.equal(r.parentSha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,r.parentFile))).digest('hex'));
    assert.ok(r.ok&&fs.existsSync(path.join(repo,r.glb)),r.error);
    assert.ok(['IMPROVED','VARIETY','REGRESSED','TOO_SIMILAR'].includes(r.verdict),r.verdict);
  }
  assert.ok(fs.existsSync(statsPath));
  // 연습장은 실제 레지스트리를 건드리지 않는다
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync('company-asset-library.json')).digest('hex'),before);
});

test('확장 연산(이끼·흙때·울퉁불퉁·패널 홈)이 있고 세기에 따라 값이 다르다', async () => {
  const {OPERATORS:ops}=await import('../tools/vibe-variation-gym.mjs');
  for(const k of ['moss','wear','noise_displace','inset_panel'])assert.ok(ops[k],k);
  const rng=mulberry32(3);
  assert.ok(ops.noise_displace.sample(rng,'strong').strength>ops.noise_displace.sample(rng,'soft').strength);
  assert.ok(ops.moss.sample(rng,'strong').coverage>ops.moss.sample(rng,'soft').coverage);
});

test('실패 도감: 여러 번 해 보고 거의 다 실패한 팔은 탐험에서도 다시 뽑지 않는다', () => {
  const stats={PROP:{'moss:strong':{n:8,gainSum:-30,keep:0,improved:0,broken:0}}};
  const picks=chooseArms(stats,'PROP',800,mulberry32(2),1);
  assert.equal(picks.filter(x=>x.op==='moss'&&x.strength==='strong').length,0);
  // 전부 실패한 극단에서도 뽑을 팔이 남는다(전체로 되돌림)
  const every={PROP:Object.fromEntries(Object.keys(OPERATORS).flatMap(op=>STRENGTHS.map(st=>[armKey(op,st),{n:9,gainSum:-9,keep:0,improved:0,broken:0}])))};
  assert.equal(chooseArms(every,'PROP',5,mulberry32(2),1).length,5);
});

test('실패 이유가 성적표에 쌓인다(어디서 자주 망하는지)', () => {
  const st=updateStats({},'PROP',[{arm:'moss:soft',gain:-3,keep:false,verdict:'REGRESSED',reason:'DARKENED'},{arm:'moss:soft',gain:-2,keep:false,verdict:'REGRESSED',reason:'DARKENED'},{arm:'moss:soft',gain:2,keep:true,verdict:'IMPROVED'}]);
  assert.equal(st.PROP['moss:soft'].fail.DARKENED,2);
  assert.equal(st.PROP['moss:soft'].keep,1);
});

test('리그 점검 게이트: 캐릭터 계열은 검사 실패 시 유지하지 않고, 소품은 검사하지 않는다', async () => {
  const {rigGate}=await import('../tools/vibe-variation-gym.mjs');
  let calls=0;
  const bad=f=>{calls++;return {pass:false,failures:['UNWEIGHTED_VERTICES:body:12']}};
  const good=()=>({pass:true,failures:[]});
  const prop=rigGate({family:'PROP',keep:true,verdict:'IMPROVED',glb:'x.glb'},bad);
  assert.equal(prop.keep,true);assert.equal(calls,0);
  const hero=rigGate({family:'CHARACTER',keep:true,verdict:'IMPROVED',glb:'x.glb'},bad);
  assert.equal(hero.keep,false);assert.match(hero.reason,/^RIG:UNWEIGHTED/);
  assert.equal(rigGate({family:'CHARACTER',keep:true,verdict:'IMPROVED',glb:'x.glb'},good).keep,true);
  const err=rigGate({family:'CREATURE',keep:true,verdict:'IMPROVED',glb:'x.glb'},()=>{throw new Error('boom')});
  assert.equal(err.verdict,'BROKEN');
});

// 실패 도감에서 스스로 배운 고침: wear/moss 가 DARKENED 로 많이 탈락 → 변형 재질을 부모 밝기에 맞춘다.
test('색 밝기 맞춤: 어두운 흙·이끼색도 부모 밝기의 일정 비율 아래로 내려가지 않고, 이미 밝으면 그대로', () => {
  const py=`import sys,json\nsys.path.insert(0,'tools')\nfrom vibe_color_match import *\nparent=(0.6,0.55,0.5)\na=tinted((0.17,0.12,0.09),parent,0.45,0.72)\nb=tinted((0.9,0.9,0.9),parent,0.0,0.72)\nc=match_luminance((0.0,0.0,0.0),parent,0.8)\nd=tinted((0.18,0.36,0.12),(0.05,0.05,0.05),0.35,0.8)\nprint(json.dumps({'a':luminance(a)/luminance(parent),'b':b,'c':c,'d':luminance(d)/luminance((0.05,0.05,0.05)),'inrange':all(0<=x<=1 for x in a+b+c+d)}))`;
  const r=spawnSync('python3',['-I','-c',py],{encoding:'utf8',cwd:repo});
  assert.equal(r.status,0,r.stderr);
  const o=JSON.parse(r.stdout);
  assert.ok(o.a>=0.7199,'wear ratio '+o.a);
  assert.deepEqual(o.b,[0.9,0.9,0.9]);          // 이미 밝으면 안 건드림
  assert.deepEqual(o.c,[0,0,0]);                // 순흑은 색조가 없어 비율 확대 불가(0 나눗셈 안전)
  assert.ok(o.d>=0.79,'moss ratio '+o.d);
  assert.equal(o.inrange,true);
  const gym=fs.readFileSync(path.join(repo,'tools','vibe_variation_gym.py'),'utf8');
  assert.match(gym,/_new_mat\('GymDirt', tinted\(/);
  assert.match(gym,/_new_mat\('GymMoss', tinted\(/);
});

test('다음 연습은 읽히는 아이콘과 리그를 보존한 변형을 더 자주 선택한다',()=>{
  const stats=updateStats({},'PROP',[
    {arm:'outline:strong',gain:25,keep:false,verdict:'REGRESSED'},
    {arm:'outline:strong',gain:25,keep:true,verdict:'IMPROVED',icon:{legible:false}},
    {arm:'outline:soft',gain:3,keep:true,verdict:'IMPROVED',icon:{legible:true}},
    {arm:'outline:soft',gain:3,keep:true,verdict:'IMPROVED',icon:{legible:true}},
  ]);
  assert.equal(stats.PROP['outline:strong'].qualityGainSum,0);
  assert.ok(chooseArms(stats,'PROP',10,mulberry32(7),0).every(a=>a.strength==='soft'&&a.op==='outline'));
  const row=rigGate({family:'CHARACTER',keep:true,glb:'candidate.glb'},
    ()=>({pass:true,failures:[],actionNames:['idle']}),motionCoverage(['idle','walk']));
  assert.equal(row.keep,false);
  assert.equal(row.reason,'MOTION_STATE_LOST');
});
