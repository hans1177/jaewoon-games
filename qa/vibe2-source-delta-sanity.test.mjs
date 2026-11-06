// Structural candidate tests only; these fixtures do not execute Roblox, Unity, or Web gameplay.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {verifyPerformanceSanity} from '../tools/vibe2-performance-sanity.mjs';

function repositoryFixture(t,{sourceRoot='roblox-games/demo',extension='.luau',count=1}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-build-up-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const write=(relative,text)=>{
    const file=path.join(root,sourceRoot,relative);
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;
  };
  const sources=Array.from({length:count},(_,i)=>`src/module${i}${extension}`);
  for(const file of sources)write(file,'return 1\n');
  write('bootstrap.json','{"status":"PENDING"}\n');
  git(['init','-q']);git(['config','user.name','Source evidence test']);git(['config','user.email','qa@example.invalid']);
  git(['add','.']);git(['commit','-qm','baseline']);const baseMainSha=git(['rev-parse','HEAD']);
  const manifest={sourceRoot,baseMainSha,changedFiles:[],exploration:{reuseKey:'fixture',sourceWrite:false}};
  return{root,git,write,sources,manifest,verify:()=>verifyPerformanceSanity({root,manifest})};
}
const check=(result,name)=>result.checks.find(row=>row.name===name);
for(const [sourceRoot,extension] of [['roblox-games/demo','.luau'],['unity-games/demo','.cs'],['web-games/demo','.js']]){
  test(`${sourceRoot}: bootstrap-only changes cannot pass as source development`,t=>{
    const f=repositoryFixture(t,{sourceRoot,extension});
    f.write('bootstrap.json','{"status":"APPLIED"}\n');f.manifest.changedFiles=['bootstrap.json'];
    const result=f.verify();assert.equal(result.pass,false);assert.equal(check(result,'actual-game-source-delta').pass,false);
  });
  test(`${sourceRoot}: unchanged declared source cannot disguise metadata-only work`,t=>{
    const f=repositoryFixture(t,{sourceRoot,extension});
    f.write('bootstrap.json','{"status":"APPLIED"}\n');f.manifest.changedFiles=['bootstrap.json',...f.sources];
    assert.equal(f.verify().pass,false);
  });
  test(`${sourceRoot}: real same-size source edit is a candidate, never a runtime PASS`,t=>{
    const f=repositoryFixture(t,{sourceRoot,extension});f.write(f.sources[0],'return 2\n');
    f.manifest.changedFiles=f.sources;const result=f.verify();
    assert.equal(result.pass,true);assert.equal(result.runtimeVerified,false);
    assert.deepEqual(result.actualSourceChangedFiles,f.sources);
    assert.equal(result.fileGrowth[0].baseBytes,result.fileGrowth[0].candidateBytes);
    assert.notEqual(result.fileGrowth[0].baseSha256,result.fileGrowth[0].candidateSha256);
  });
}
for(const count of [5,8,9])test(`${count}-file candidate matches the source worker eight-file budget`,t=>{
  const f=repositoryFixture(t,{count});for(const file of f.sources)f.write(file,'return 2\n');
  f.manifest.changedFiles=f.sources;assert.equal(f.verify().pass,count<=8);
});
test('empty declared source patch fails',t=>{
  const f=repositoryFixture(t);f.manifest.changedFiles=f.sources;
  assert.equal(f.verify().pass,false);
});
test('new real source file is compared against an absent Git blob, not rejected as unreadable',t=>{
  const f=repositoryFixture(t);f.write('src/new.luau','return 3\n');f.manifest.changedFiles=['src/new.luau'];
  const result=f.verify();assert.equal(result.pass,true);assert.equal(result.fileGrowth[0].baseBytes,0);
});
test('wrong-platform extension cannot count as native source work',t=>{
  const f=repositoryFixture(t);f.write('src/unrelated.js','return 2\n');f.manifest.changedFiles=['src/unrelated.js'];
  assert.equal(f.verify().pass,false);
});
test('missing exact baseline is not proof of source delta',t=>{
  const f=repositoryFixture(t);f.write(f.sources[0],'return 2\n');
  f.manifest.changedFiles=f.sources;f.manifest.baseMainSha='0'.repeat(40);
  const result=f.verify();assert.equal(result.pass,false);assert.equal(check(result,'baseline-revision-readable').pass,false);
});
test('existing per-file growth budget remains enforced',t=>{
  const f=repositoryFixture(t);f.write(f.sources[0],'x'.repeat(300100));f.manifest.changedFiles=f.sources;
  assert.equal(check(f.verify(),'single-file-growth-budget').pass,false);
});
test('binary writes remain forbidden even alongside real source work',t=>{
  const f=repositoryFixture(t);f.write(f.sources[0],'return 2\n');f.write('image.png','binary fixture');
  f.manifest.changedFiles=[...f.sources,'image.png'];assert.equal(check(f.verify(),'no-binary-source-write').pass,false);
});
test('traversal cannot borrow a different game source delta',t=>{
  const f=repositoryFixture(t);f.write('../other/Main.luau','return 2\n');f.manifest.changedFiles=['../other/Main.luau'];
  assert.equal(check(f.verify(),'changed-paths-contained').pass,false);
});
test('directory symlink escape cannot manufacture source evidence',t=>{
  const f=repositoryFixture(t);fs.mkdirSync(path.join(f.root,'outside'));
  fs.writeFileSync(path.join(f.root,'outside','Fake.luau'),'return 2\n');
  fs.symlinkSync(path.join(f.root,'outside'),path.join(f.root,f.manifest.sourceRoot,'link'),'dir');
  f.manifest.changedFiles=['link/Fake.luau'];assert.equal(f.verify().pass,false);
});
test('auxiliary asset metadata keeps its existing non-game scope',t=>{
  const f=repositoryFixture(t,{sourceRoot:'assets',extension:'.js'});
  f.write('bootstrap.json','{"status":"UPDATED"}\n');f.manifest.changedFiles=['bootstrap.json'];
  const result=f.verify();assert.equal(result.pass,true);assert.equal(check(result,'actual-game-source-delta'),undefined);
});

test('moving Git refs are not exact baseline revisions',t=>{
  const f=repositoryFixture(t);f.write(f.sources[0],'return 2\n');
  f.manifest.changedFiles=f.sources;f.manifest.baseMainSha='HEAD';
  assert.equal(f.verify().pass,false);
});
test('source-root spelling cannot disguise a game as an auxiliary metadata task',t=>{
  const f=repositoryFixture(t);f.write('bootstrap.json','{"status":"APPLIED"}\n');
  f.manifest.changedFiles=['bootstrap.json'];f.manifest.sourceRoot='tools/../roblox-games/demo';
  assert.equal(f.verify().pass,false);
});

for(const actualSourceChange of [false,true])test(`canonical CLI exits ${actualSourceChange?'success':'failure'} for ${actualSourceChange?'source':'metadata-only'} candidate`,t=>{
  const f=repositoryFixture(t);
  if(actualSourceChange){f.write(f.sources[0],'return 2\n');f.manifest.changedFiles=f.sources;}
  else {f.write('bootstrap.json','{"status":"APPLIED"}\n');f.manifest.changedFiles=['bootstrap.json'];}
  const manifestFile=path.join(f.root,'manifest.json'),outputFile=path.join(f.root,'sanity.json');
  fs.writeFileSync(manifestFile,JSON.stringify(f.manifest));
  const cli=fileURLToPath(new URL('../tools/vibe2-performance-sanity.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[cli,`--root=${f.root}`,`--manifest=${manifestFile}`,`--output=${outputFile}`],{encoding:'utf8'});
  assert.equal(result.status,actualSourceChange?0:1,result.stderr);
  assert.match(result.stdout,new RegExp(`VIBE2_PERFORMANCE_SANITY=${actualSourceChange?'PASS':'FAIL'}`));
  const report=JSON.parse(fs.readFileSync(outputFile,'utf8'));
  assert.equal(report.pass,actualSourceChange);assert.equal(report.runtimeVerified,false);
});
