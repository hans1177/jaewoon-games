// 기존 GitHub Pages 배포 단계의 캐시 원본/복원 검증 계약을 실제 파일로 검증한다.
// 별도 빌드 파이프라인을 만들지 않고 공식 workflow 내부 스테이징 코드를 실행한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
const begin=workflow.indexOf('          const selectedAssets=[...refs].sort();');
const end=workflow.indexOf('          // Build only the game-authored HTML.',begin);
assert.ok(begin>0&&end>begin,'canonical Pages staging step must exist');
const source=workflow.slice(begin,end);
const stage=new Function('fs','path','crypto','cp','assetBlobs','refs','site','Buffer','console',
  source+'\nreturn {selectedAssets,missingAssets,checkedAssets,verifiedBytes};');
const gitHash=bytes=>crypto.createHash('sha1')
  .update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');

function fixture({originals,cache={},oversized=null,lfs=[]}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-pages-assets-'));
 const base=process.cwd(),calls=[];
 try{
  fs.mkdirSync(path.join(directory,'assets'));
  for(const [name,bytes] of Object.entries(cache))fs.writeFileSync(path.join(directory,'assets',name),bytes);
  if(oversized){
   const file=path.join(directory,'assets',oversized);
   fs.writeFileSync(file,'');fs.truncateSync(file,101*1024*1024);
  }
  const refs=new Set(Object.keys(originals).map(name=>'assets/'+name));
  const blobContents=new Map();
  const blobs=new Map(Object.entries(originals).map(([name,bytes])=>{
   const gitData=lfs.includes(name)
    ?Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:'
      +crypto.createHash('sha256').update(bytes).digest('hex')+'\nsize '+bytes.length+'\n')
    :bytes;
   const id=gitHash(gitData);
   blobContents.set(id,gitData);
   return ['assets/'+name,id];
  }));
  const cp={execFileSync(command,args){
   assert.equal(command,'git');
   if(args[0]==='cat-file'){
    const bytes=blobContents.get(args[2]);assert.ok(bytes,'Git pointer blob must exist');
    if(args[1]==='-s')return String(bytes.length)+'\n';
    if(args[1]==='blob')return bytes.toString('utf8');
    throw Error('UNEXPECTED_CAT_FILE:'+args[1]);
   }
   assert.equal(args[0],'restore');
   assert.ok(args.includes('--ignore-skip-worktree-bits'));
   calls.push(args.slice(args.indexOf('--')+1));
   for(const file of calls.at(-1)){
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.rmSync(file,{force:true}); // Git checkout replaces untrusted cached file
    fs.writeFileSync(file,originals[file.slice('assets/'.length)]);
   }
  }};
  process.chdir(directory);
  const result=stage(fs,path,crypto,cp,blobs,refs,'_site',Buffer,{log(){}});
  const published=Object.fromEntries([...refs].map(file=>[file,fs.readFileSync(path.join('_site',file))]));
  const cached=Object.fromEntries([...refs].map(file=>[file,fs.readFileSync(file)]));
  return {result,published,cached,calls};
 }finally{process.chdir(base);fs.rmSync(directory,{recursive:true,force:true})}
}

test('valid cached files are verified and copied without rehydrating from Git',()=>{
 const b=Buffer.concat([Buffer.from('PNG binary\n'),Buffer.alloc(2*1024*1024,73)]);
 const f=fixture({originals:{'big-model.glb':b},cache:{'big-model.glb':b}});
 assert.equal(f.result.missingAssets.length,0);
 assert.equal(f.result.verifiedBytes,b.length);
 assert.equal(f.calls.length,0);
 assert.deepEqual(f.published['assets/big-model.glb'],b);
 assert.deepEqual(f.cached['assets/big-model.glb'],b);
});
test('corrupt and missing cached files are rehydrated and verified against exact Git SHA',()=>{
 const good=Buffer.from('authoritative CC0 asset'),damaged=Buffer.from('corrupted cache content');
 const f=fixture({originals:{'corrupt.obj':good,'missing.fbx':good},cache:{'corrupt.obj':damaged}});
 assert.deepEqual(f.calls,[['assets/corrupt.obj','assets/missing.fbx']]);
 assert.deepEqual(f.result.missingAssets,['assets/corrupt.obj','assets/missing.fbx']);
 assert.equal(f.result.checkedAssets.size,2);
 assert.deepEqual(f.published['assets/corrupt.obj'],good);
 assert.deepEqual(f.published['assets/missing.fbx'],good);
});
test('real Git LFS binary is verified using pointer SHA-256 and size without needless re-download',()=>{
 const b=Buffer.concat([Buffer.from('BLENDER original 3D source'),Buffer.alloc(1024*1024,23)]);
 const f=fixture({originals:{'bee-rigged.blend':b},cache:{'bee-rigged.blend':b},lfs:['bee-rigged.blend']});
 assert.deepEqual(f.result.missingAssets,[]);
 assert.equal(f.calls.length,0);
 assert.deepEqual(f.published['assets/bee-rigged.blend'],b);
});
test('cached Git LFS pointer or corrupted binary gets restored to real bytes before publication',()=>{
 const real=Buffer.from('downloaded verified actual audio');
 const ptr=Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:'
    +crypto.createHash('sha256').update(real).digest('hex')+'\nsize '+real.length+'\n');
 const f=fixture({originals:{'impact.ogg':real},cache:{'impact.ogg':ptr},lfs:['impact.ogg']});
 assert.deepEqual(f.result.missingAssets,['assets/impact.ogg']);
 assert.deepEqual(f.published['assets/impact.ogg'],real);
});
test('Git LFS pointers and oversized files still fail closed',()=>{
 const pointer=Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:deadbeef\n');
 assert.throws(()=>fixture({originals:{'not-real.glb':pointer},cache:{'not-real.glb':pointer}}),
  /GITHUB_PAGES_LFS_POINTER_NOT_PLAYABLE/);
 assert.throws(()=>fixture({originals:{'big.fbx':Buffer.from('expected')} ,oversized:'big.fbx'}),
  /GITHUB_PAGES_ASSET_TOO_LARGE/);
});
test('duplicate full-memory reads and duplicate SHA passes cannot return',()=>{
 assert.match(source,/Buffer\.allocUnsafe\(1024\*1024\)/);
 assert.match(source,/fs\.readSync\(fd,ioBuffer/);
 assert.match(source,/getLfsEvidence/);
 assert.match(source,/createHash\('sha256'\)/);
 assert.match(source,/GITHUB_PAGES_LFS_POINTER_NOT_PLAYABLE/);
 assert.match(source,/fs\.copyFileSync\(asset,target,fs\.constants\.COPYFILE_FICLONE\)/);
 assert.doesNotMatch(source,/fs\.readFileSync\(asset\)/);
 assert.doesNotMatch(source,/fs\.writeFileSync\(target,source\)/);
 assert.match(workflow,/node --test qa\/github-pages-asset-staging\.test\.mjs/);
});

// 실제 기존 게시 승인 코드가 게임 변경을 막고 비게시 변경만 허용하는지 실행한다.
test('ready Pages artifact survives worker-only main changes without admitting stale game inputs',()=>{
 const begin=workflow.indexOf("          import fs from 'node:fs';",workflow.indexOf('pages-main-diff.json'));
 const end=workflow.indexOf('\n          NODE',begin);assert.ok(begin>0&&end>begin);
 const admission=workflow.slice(begin,end).split('\n').map(line=>line.slice(10)).join('\n');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pages-admit-')),file=path.join(dir,'compare.json');
 try{
  const check=(diff,expected)=>{
   fs.writeFileSync(file,JSON.stringify(diff));
   const result=spawnSync(process.execPath,['--input-type=module','-',file],{input:admission,encoding:'utf8'});
   assert.equal(result.status,expected,result.stderr||JSON.stringify(diff));
  };
  check({status:'ahead',total_commits:2,files:[{filename:'tools/web-vibe-worker.mjs'},{filename:'qa/web-vibe-worker.test.mjs'}]},0);
  check({status:'ahead',total_commits:1,files:[]},0);
  for(const filename of ['web-games/gem-survivor/index.html','assets/x.png','index.html','company-status.json','game-catalog.json','.github/workflows/magic-forest-pages.yml','company-learning/platform-release-roadmap.json']){
   check({status:'ahead',total_commits:1,files:[{filename}]},1);
  }
  check({status:'ahead',total_commits:1,files:[{filename:'qa/moved.js',previous_filename:'assets/live.js'}]},1);
  check({status:'behind',total_commits:1,files:[]},1);
  check({status:'diverged',total_commits:1,files:[]},1);
  check({status:'ahead',total_commits:251,files:[]},1);
  check({status:'ahead',total_commits:1,files:Array.from({length:300},()=>({filename:'qa/test.mjs'}))},1);
  check({status:'ahead',files:[]},1);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test('queued Pages pruning cancels only superseded same-owner PR runs',()=>{
 const start=workflow.indexOf("          import {execFileSync} from 'node:child_process';");
 const stop=workflow.indexOf('          NODE',start);
 const code=workflow.slice(start,stop).replace(/          /g,'').replace(/import .*?;\n/,'');
 const repo='hans1177/jaewoon-games',old='a'.repeat(40),current='b'.repeat(40);
 const base={event:'pull_request',status:'queued',head_repository:{full_name:repo},actor:{login:'hans1177'},head_branch:'patch',head_sha:old};
 const runs=[{...base,id:1},{...base,id:2,event:'push'},{...base,id:3,status:'in_progress'},
  {...base,id:4,head_repository:{full_name:'other/fork'}},{...base,id:5,head_sha:current},
  {...base,id:6,head_branch:'ambiguous'},{...base,id:7,head_branch:'started'}];
 const cancelled=[];
 const exec=(command,args)=>{
  assert.equal(command,'gh');const method=args[2],route=args[3];
  if(method==='POST'){cancelled.push(route);return '';}
  if(route.includes('/workflows/'))return JSON.stringify({workflow_runs:runs});
  if(route.includes('pulls?'))return JSON.stringify(route.includes('ambiguous')?[]:[{head:{repo:{full_name:repo},ref:route.includes('started')?'started':'patch',sha:current}}]);
  const id=Number(route.split('/').at(-1));return JSON.stringify({...runs.find(x=>x.id===id),...(id===7?{status:'in_progress'}:{})});
 };
 new Function('execFileSync','process','console',code)(exec,{env:{GITHUB_REPOSITORY:repo,GITHUB_RUN_ID:'99'}},{log(){}});
 assert.deepEqual(cancelled,['repos/'+repo+'/actions/runs/1/cancel']);
});

test('repeated main pushes never abort active package, and coalesce only superseded idle jobs',()=>{
 const header=workflow.split('  deploy:')[1].split('    steps:')[0];
 assert.match(header,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
 const start=workflow.indexOf("          import {execFileSync} from 'node:child_process';");
 const end=workflow.indexOf('          NODE',start);
 const code=workflow.slice(start,end).replace(/          /g,'').replace(/import .*?;\n/,'');
 const repo='hans1177/jaewoon-games',old='a'.repeat(40),newest='b'.repeat(40);
 const mk=(id,status,sha=old)=>({id,event:'push',status,head_branch:'main',head_sha:sha,head_repository:{full_name:repo}});
 const runs=[
  mk(101,'in_progress'),  // active build has started staging: must survive.
  mk(102,'queued'),       // superseded idle job: may be discarded.
  mk(103,'pending'),      // completed staging, waiting for release: must survive.
  mk(104,'queued',newest),// latest build never discarded.
  {...mk(105,'queued'),head_repository:{full_name:'foreign/fork'}},
  mk(106,'queued','c'.repeat(40)) // diverged ancestry must not be cancelled.
 ];
 const removed=[];
 const exec=(command,args)=>{
  assert.equal(command,'gh');
  const method=args[2],route=args[3];
  if(method==='POST'){removed.push(route);return '';}
  if(route.endsWith('/commits/main'))return JSON.stringify({sha:newest});
  if(route.includes('event=pull_request'))return JSON.stringify({workflow_runs:[]});
  if(route.includes('event=push'))return JSON.stringify({workflow_runs:runs});
  if(route.includes('/compare/'))return JSON.stringify({status:route.includes('c'.repeat(40))?'diverged':'ahead',total_commits:1});
  if(route.endsWith('/jobs?per_page=100')){
   const id=Number(route.split('/').at(-2));
   return JSON.stringify({jobs:id===101?[{name:'deploy',status:'in_progress'}]:id===103?[{name:'deploy',status:'completed'}]:[]});
  }
  const id=Number(route.split('/').at(-1));
  return JSON.stringify(runs.find(x=>x.id===id));
 };
 // Model a frequent change while a main build and a publish job are active.
 new Function('execFileSync','process','console',code)(
  exec,{env:{GITHUB_REPOSITORY:repo,GITHUB_RUN_ID:'999',GITHUB_SHA:newest}},{log(){}});
 assert.deepEqual(removed,['repos/'+repo+'/actions/runs/102/cancel']);
});

test('publication lock ends after official deploy while existing route and browser QA run afterwards',()=>{
 const publish=workflow.slice(workflow.indexOf('  publish-pages:'),workflow.indexOf('  post-publication-3d-smoke:'));
 const post=workflow.slice(workflow.indexOf('  post-publication-3d-smoke:'));
 assert.match(publish,/uses: actions\/deploy-pages@v4/);
 assert.doesNotMatch(publish,/director_live_qa|xargs|curl/);
 assert.match(post,/id: director_live_qa/);assert.match(post,/id: forest_native_3d_live_qa/);
 assert.match(post,/POST_PUBLISH_SMOKE_EXACT_SHA=PASS/);
 assert.match(post,/needs\.publish-pages\.outputs\.page_url/);
});
