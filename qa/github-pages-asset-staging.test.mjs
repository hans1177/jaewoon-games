// 기존 GitHub Pages 배포 단계의 캐시 원본/복원 검증 계약을 실제 파일로 검증한다.
// 별도 빌드 파이프라인을 만들지 않고 공식 workflow 내부 스테이징 코드를 실행한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

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
