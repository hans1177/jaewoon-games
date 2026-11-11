import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {checkLicense,scanLibrary,approvePack,approvedLibraryParents,ingestInbox,readApprovals} from '../tools/vibe-cc0-library.mjs';
import {countByFamily,shortages,candidateSources,methodFor,plan,acquire} from '../tools/vibe-cc0-fetch.mjs';
import {guardBranch,pull,publish,summarize} from '../tools/vibe-gym-publish.mjs';
import {pythonCmd,runPython,findBlender} from '../tools/vibe-python.mjs';

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'cc0lib-'));
const mk=(dir,files)=>{for(const [n,c] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dir,n)),{recursive:true});fs.writeFileSync(path.join(dir,n),c)}};
const OBJ='o cube\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';

test('라이선스 증거: CC0 텍스트·provenance는 통과, 증거 없음·다른 조건 섞임·CC0 아닌 provenance는 거절', () => {
  const lib=tmp();
  mk(lib,{'good/LICENSE.txt':'Creative Commons Zero (CC0 1.0)','good/a.obj':OBJ,
    'mixed/License.txt':'CC0 ... but also CC-BY Attribution required','mixed/a.obj':OBJ,
    'none/a.obj':OBJ,
    'prov/provenance.json':JSON.stringify({license:'CC0',licenseEvidenceUrl:'https://example.com/lic',family:'BUILDING'}),'prov/a.obj':OBJ,
    'badprov/provenance.json':JSON.stringify({license:'CC-BY-4.0',licenseEvidenceUrl:'https://example.com'}),'badprov/a.obj':OBJ});
  const ok=n=>checkLicense(path.join(lib,n)).ok;
  assert.deepEqual(['good','mixed','none','prov','badprov'].map(ok),[true,false,false,true,false]);
});

test('실제 CC0 안내 문구는 오탐하지 않는다(No attribution required, 크레딧은 선택)', () => {
  const lib=tmp();
  mk(lib,{'kenneystyle/License.txt':'License (Creative Commons Zero, CC0)\nYou may use these assets in personal and commercial projects.\nCredit (Kenney or www.kenney.nl) would be nice but is not mandatory.','kenneystyle/a.obj':OBJ,
    'noattr/LICENSE':'CC0 1.0 Universal. No attribution required.','noattr/a.obj':OBJ,
    'strict/LICENSE':'CC0 for code. Models: attribution required, must give credit.','strict/a.obj':OBJ});
  const ok=n=>checkLicense(path.join(lib,n)).ok;
  assert.deepEqual([ok('kenneystyle'),ok('noattr'),ok('strict')],[true,true,false]);
});

test('스캔은 후보만 만들고 절대 승인하지 않으며, 증거 없는 팩의 파일은 색인하지 않는다', () => {
  const lib=tmp();
  mk(lib,{'good/LICENSE':'CC0','good/a.obj':OBJ,'good/b.glb':'x','good/t.png':'p','none/a.obj':OBJ});
  const idx=scanLibrary(lib);
  const good=idx.packs.find(p=>p.name==='good'),none=idx.packs.find(p=>p.name==='none');
  assert.equal(good.models,2);assert.equal(good.images,1);assert.equal(none.models,0);
  assert.deepEqual(readApprovals(lib).packs,{});
  assert.deepEqual(approvedLibraryParents(lib),[]);
});

test('승인은 사람이 이름을 남길 때만, CC0 증거 없는 팩은 승인 불가, 승인 뒤 바뀐 파일은 부모에서 빠진다', () => {
  const lib=tmp();
  mk(lib,{'good/LICENSE':'CC0 1.0','good/a.obj':OBJ,'good/b.obj':OBJ+'v 5 5 5\n','none/a.obj':OBJ});
  assert.throws(()=>approvePack(lib,'good',''),/APPROVER_REQUIRED/);
  assert.throws(()=>approvePack(lib,'none','tester'),/PACK_LICENSE_NOT_VERIFIED/);
  approvePack(lib,'good','tester');
  assert.equal(approvedLibraryParents(lib).length,2);
  assert.equal(approvedLibraryParents(lib)[0].license,'CC0');
  fs.appendFileSync(path.join(lib,'good','b.obj'),'v 9 9 9\n'); // 승인 뒤 변조
  assert.deepEqual(approvedLibraryParents(lib).map(p=>path.basename(p.file)),['a.obj']);
});

test('inbox zip 정리: 증거 있는 zip은 팩이 되고, 증거 없는 zip은 거절·삭제, 경로 탈출 zip은 거절', () => {
  const lib=tmp(),inbox=path.join(lib,'_inbox');fs.mkdirSync(inbox);
  const py=`import zipfile\nz=zipfile.ZipFile(${JSON.stringify(path.join(inbox,'ok-pack.zip'))},'w');z.writestr('LICENSE.txt','CC0 public domain');z.writestr('m.obj','${OBJ.replace(/\n/g,'\\n')}');z.close()\nz=zipfile.ZipFile(${JSON.stringify(path.join(inbox,'no-evidence.zip'))},'w');z.writestr('m.obj','x');z.close()\nz=zipfile.ZipFile(${JSON.stringify(path.join(inbox,'evil.zip'))},'w');z.writestr('../escape.txt','x');z.close()`;
  assert.equal(spawnSync('python3',['-c',py]).status,0);
  const r=Object.fromEntries(ingestInbox(lib).map(x=>[x.zip,x.status]));
  assert.equal(r['ok-pack.zip'],'INGESTED');
  assert.equal(r['no-evidence.zip'],'REJECTED_NO_CC0_EVIDENCE');
  assert.equal(r['evil.zip'],'EXTRACT_FAILED');
  assert.ok(fs.existsSync(path.join(lib,'ok-pack','m.obj')));
  assert.ok(!fs.existsSync(path.join(lib,'no-evidence')));
  assert.ok(!fs.existsSync(path.join(lib,'..','escape.txt')));
});

const src=(o={})=>({id:'s1',category:'PROP',license:'CC0',licenseEvidenceUrl:'https://x.example/lic',sourceUrl:'https://github.com/o/r',automaticAcquisitionWhenSelected:true,prefetchAllowed:false,speculativeDownloadAllowed:false,...o});

test('부족 계산과 후보 선택: 부족한 분야만, CC0·자동허용·미리받기금지 규칙을 지키는 출처만', () => {
  const repo=tmp();mk(repo,{'a/1.obj':OBJ});
  const reg={assets:[{id:'x',license:'CC0',family:'PROP',sourceFiles:['a/1.obj']},{id:'y',license:'CC0',family:'PROP',sourceFiles:['missing.obj']},{id:'z',license:'CC-BY',family:'PROP',sourceFiles:['a/1.obj']}],
    externalSources:[src(),src({id:'paid',license:'CC-BY-4.0'}),src({id:'prefetch',prefetchAllowed:true}),src({id:'noauto',automaticAcquisitionWhenSelected:false}),src({id:'noevidence',licenseEvidenceUrl:''}),src({id:'other',category:'UI'}),src({id:'acquired-old'})]};
  const counts=countByFamily(reg,repo,null);
  assert.equal(counts.PROP,1);
  assert.deepEqual(shortages(counts,{PROP:3,UI:0}).map(s=>[s.family,s.missing]),[['PROP',2]]);
  assert.deepEqual(candidateSources(reg,'PROP').map(s=>s.id),['s1']);
  assert.deepEqual(candidateSources(reg,'PROP',new Set(['s1'])).map(s=>s.id),[]); // 이미 받은 출처는 다시 안 받는다
  const p=plan({registry:reg,repoRoot:repo,libDir:path.join(repo,'lib'),minPerFamily:{PROP:3}});
  assert.deepEqual(p.picks.map(x=>x.src.id),['s1']);
  assert.equal(plan({registry:reg,repoRoot:repo,libDir:path.join(repo,'lib'),minPerFamily:{PROP:1}}).picks.length,0); // 충분하면 계획 없음
});

test('받는 방법 분류: GitHub만 git, downloadUrl만 zip, 나머지는 수동 inbox', () => {
  assert.equal(methodFor(src()),'git');
  assert.equal(methodFor(src({sourceUrl:'https://kenney.nl/assets/x'})),'manual');
  assert.equal(methodFor(src({sourceUrl:'https://kenney.nl/assets/x',downloadUrl:'https://cdn.example/x.zip'})),'zip');
  assert.equal(methodFor(src({sourceUrl:'https://kenney.nl/assets/x',downloadUrl:'http://insecure.example/x.zip'})),'manual');
});

test('자동 확보(git): 받은 팩은 출처가 기록되고 .git이 지워지며 승인되지 않는다. 라이선스 불일치는 거절·삭제', async () => {
  const remote=tmp();
  mk(remote,{'LICENSE':'CC0 1.0','m.obj':OBJ});
  const g=a=>spawnSync('git',['-c','user.name=t','-c','user.email=t@t',...a],{cwd:remote});
  g(['init','-q']);g(['add','-A']);g(['commit','-q','-m','x']);
  const lib=tmp();
  const r=await acquire(src({id:'fx',localGitPath:remote}),lib,{allowLocal:true});
  assert.equal(r.status,'ACQUIRED_NEEDS_OWNER_APPROVAL');
  assert.ok(!fs.existsSync(path.join(lib,'fx','.git')));
  const prov=JSON.parse(fs.readFileSync(path.join(lib,'fx','provenance.json'),'utf8'));
  assert.equal(prov.license,'CC0');assert.equal(prov.approved,false);assert.equal(prov.sourceId,'fx');
  assert.deepEqual(readApprovals(lib).packs,{});
  // 라이선스 불일치
  const bad=tmp();mk(bad,{'LICENSE':'CC0 but CC-BY Attribution required','m.obj':OBJ});
  const g2=a=>spawnSync('git',['-c','user.name=t','-c','user.email=t@t',...a],{cwd:bad});
  g2(['init','-q']);g2(['add','-A']);g2(['commit','-q','-m','x']);
  const lib2=tmp();
  assert.equal((await acquire(src({id:'bad1',localGitPath:bad}),lib2,{allowLocal:true})).status,'REJECTED_LICENSE_MISMATCH');
  assert.ok(!fs.existsSync(path.join(lib2,'bad1')));
  // 수동 출처는 받지 않고 안내만
  const m=await acquire(src({id:'man',sourceUrl:'https://kenney.nl/assets/x'}),tmp());
  assert.equal(m.status,'MANUAL_DOWNLOAD_REQUIRED');assert.match(m.hint,/_inbox/);
});

test('자동 확보(zip): 해시가 맞으면 받고, 틀리면 거절·삭제, 크기 상한 초과는 거절', async () => {
  const dir=tmp();
  assert.equal(spawnSync('python3',['-c',`import zipfile\nz=zipfile.ZipFile(${JSON.stringify(path.join(dir,'p.zip'))},'w');z.writestr('LICENSE','CC0');z.writestr('m.obj','${OBJ.replace(/\n/g,'\\n')}');z.close()`]).status,0);
  const bytes=fs.readFileSync(path.join(dir,'p.zip'));
  const sha=(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
  const server=http.createServer((q,s)=>{s.writeHead(200);s.end(bytes)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${server.address().port}/p.zip`;
  try{
    const lib=tmp();
    const ok=await acquire(src({id:'z1',sourceUrl:'https://kenney.nl/x',downloadUrl:url,downloadSha256:sha}),lib,{allowLocal:true});
    assert.equal(ok.status,'ACQUIRED_NEEDS_OWNER_APPROVAL');assert.ok(fs.existsSync(path.join(lib,'z1','m.obj')));
    const lib2=tmp();
    assert.equal((await acquire(src({id:'z2',sourceUrl:'https://kenney.nl/x',downloadUrl:url,downloadSha256:'0'.repeat(64)}),lib2,{allowLocal:true})).status,'HASH_MISMATCH');
    assert.ok(!fs.existsSync(path.join(lib2,'z2')));
    assert.equal((await acquire(src({id:'z3',sourceUrl:'https://kenney.nl/x',downloadUrl:url}),tmp(),{allowLocal:true,maxBytes:10})).status,'DOWNLOAD_TOO_LARGE');
  }finally{server.close()}
});

test('학습 상태 저장소: main 등 허용되지 않은 브랜치는 거부하고, 전용 브랜치에는 요약만 쌓고 불러온다', () => {
  for(const b of ['main','master','claude/x','vibe-gym','release'])assert.throws(()=>guardBranch(b),/BRANCH_NOT_ALLOWED/,b);
  assert.equal(guardBranch('vibe-gym-data'),'vibe-gym-data');
  const bare=tmp();spawnSync('git',['init','-q','--bare',bare]);
  const work=tmp();
  const g=(...a)=>spawnSync('git',['-c','user.name=t','-c','user.email=t@t',...a],{cwd:work,encoding:'utf8'});
  g('init','-q');fs.writeFileSync(path.join(work,'README'),'x');g('add','-A');g('commit','-q','-m','init');g('remote','add','origin',bare);
  fs.writeFileSync(path.join(work,'stats.json'),JSON.stringify({PROP:{'outline:soft':{n:2,gainSum:3,keep:1,improved:1,broken:0}}}));
  fs.writeFileSync(path.join(work,'ledger.json'),JSON.stringify({ledger:[{id:'a',parentId:'p',parentSha256:'h',op:'bevel',arm:'bevel:soft',gain:1.5,novelty:0.1,verdict:'IMPROVED',glb:'big/file.glb',glbSha256:'g'}]}));
  assert.equal(pull({stats:'pulled.json',cwd:work}).found,false);               // 아직 브랜치 없음
  const r=publish({stats:'stats.json',ledger:'ledger.json',cwd:work});
  assert.equal(r.published,true);
  const heads=spawnSync('git',['--git-dir',bare,'branch','--list'],{encoding:'utf8'}).stdout;
  assert.match(heads,/vibe-gym-data/);assert.doesNotMatch(heads,/main|master/);       // main에는 아무것도 안 올라갔다
  assert.equal(pull({stats:'pulled.json',cwd:work}).found,true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(work,'pulled.json'),'utf8')).PROP['outline:soft'].n,2);
  const files=spawnSync('git',['--git-dir',bare,'ls-tree','-r','--name-only','vibe-gym-data'],{encoding:'utf8'}).stdout.trim().split('\n');
  assert.deepEqual(files.sort(),['ledger-summary.jsonl','op-stats.json']);          // GLB·미리보기는 올리지 않는다
  assert.equal(JSON.parse(summarize([{id:'a',gain:1}]).trim()).registered,false);
  assert.equal(publish({stats:'stats.json',ledger:'ledger.json',cwd:work}).published,true); // 장부는 계속 누적
  // 같은 출판기가 실제 연습 세션을 받으면 분야별 숫자만 데이터 브랜치에 보관한다.
  const practice=path.join(work,'build','practice'),gym=path.join(practice,'gym');
  fs.mkdirSync(gym,{recursive:true});
  fs.copyFileSync(path.join(work,'ledger.json'),path.join(gym,'ledger.json'));
  fs.writeFileSync(path.join(practice,'session.json'),JSON.stringify({
    at:'2026-11-11T00:00:00Z',
    assetCoverage:{registryAssets:160,cataloguedAssets:180,eligible3dAssets:70},
    practiceDomains:{
      RIG:{catalogued:22,eligible3d:10,trials:3,staticMeasured:1,
        unverifiedOrFailed:2,state:'STATIC_PRACTICE_MEASURED'},
      ICON:{catalogued:8,eligible3d:0,trials:0,staticMeasured:0,
        unverifiedOrFailed:0,state:'NOT_PRACTICED'}
    },
    bake:{pass:false,reason:'SOURCE_DETAIL_NOT_TRANSFERRED_TO_NORMAL_MAP',
      attempts:[{parent:'bench-a',pass:false,trianglesHigh:2000,trianglesLow:500,
        normalDeviation:0.0039,failures:['NOTHING_BAKED:0.0039']}]}
  }));
  assert.equal(publish({stats:'stats.json',ledger:'build/practice/gym/ledger.json',cwd:work}).published,true);
  // 원격 갱신 확인은 git worktree가 아닌 bare의 새 브랜치를 직접 검사한다.
  const proof=spawnSync('git',['--git-dir',bare,'show','vibe-gym-data:practice-domains.json'],{encoding:'utf8'});
  assert.equal(proof.status,0,proof.stderr);
  const record=JSON.parse(proof.stdout);
  assert.equal(record.domains.RIG.trials,3);
  assert.equal(record.domains.ICON.state,'NOT_PRACTICED');
  assert.equal(record.bake.pass,false);
  assert.equal(record.bake.history['bench-a'].attempts,1);
  assert.equal(record.bake.history['bench-a'].failures,1);
  assert.equal(record.bake.attempts[0].normalDeviation,0.0039);
  assert.equal(record.nativeRuntimeVerified,false);
  assert.equal(record.productionPromotionAllowed,false);
  assert.equal(JSON.stringify(record).includes('big/file.glb'),false);
  assert.equal(record.sessions,1);
  assert.equal(publish({stats:'stats.json',ledger:'build/practice/gym/ledger.json',cwd:work}).published,true);
  const next=JSON.parse(spawnSync('git',['--git-dir',bare,'show','vibe-gym-data:practice-domains.json'],{encoding:'utf8'}).stdout);
  assert.equal(next.sessions,2);
  assert.equal(next.cumulative.RIG.trials,6);
  assert.equal(next.bake.history['bench-a'].attempts,2);
  assert.equal(next.bake.history['bench-a'].failures,2);
});

test('파이썬·Blender 찾기: 실행 가능한 파이썬을 찾고, 잘못된 Blender 경로는 없는 것으로 본다', () => {
  assert.equal(runPython(['-c','print(7)'],{encoding:'utf8'}).stdout.trim(),'7');
  assert.ok(pythonCmd().cmd);
  const old=process.env.VIBE2_BLENDER_BINARY;
  process.env.VIBE2_BLENDER_BINARY=path.join(os.tmpdir(),'no-such-blender-binary');
  try{assert.equal(findBlender(),null)}finally{if(old===undefined)delete process.env.VIBE2_BLENDER_BINARY;else process.env.VIBE2_BLENDER_BINARY=old}
});
