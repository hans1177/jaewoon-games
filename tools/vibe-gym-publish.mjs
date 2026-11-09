#!/usr/bin/env node
// 파일명: tools/vibe-gym-publish.mjs
// 변형 연습장의 학습 상태(op-stats.json)와 장부 요약(ledger-summary.jsonl)을 전용 브랜치(vibe-gym-data)에 쌓고 불러온다.
// 안전: main 등 다른 브랜치에는 절대 쓰지 않는다(브랜치 이름이 vibe-gym-data* 가 아니면 거부). GLB 같은 큰 파일은 올리지 않는다(요약만).
// 사용: node tools/vibe-gym-publish.mjs pull    --stats <파일> [--branch vibe-gym-data] [--remote origin]
//      node tools/vibe-gym-publish.mjs publish --stats <파일> --ledger <ledger.json> [--branch ..] [--remote ..]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const git=(args,cwd)=>spawnSync('git',['-c','user.name=vibe-gym','-c','user.email=vibe-gym@users.noreply.github.com',...args],{cwd,encoding:'utf8'});
const must=(r,what)=>{if(r.status!==0)throw new Error(`${what} 실패: ${String(r.stderr||r.stdout).trim().slice(0,300)}`);return r};
export const guardBranch=b=>{if(!/^vibe-gym-data(?:[-/][\w./-]*)?$/.test(String(b||'')))throw new Error('BRANCH_NOT_ALLOWED: '+b);return b};

const remoteHas=(remote,branch,cwd)=>git(['fetch','--quiet',remote,`+refs/heads/${branch}:refs/remotes/${remote}/${branch}`],cwd).status===0;

export function pull({stats,file='op-stats.json',branch='vibe-gym-data',remote='origin',cwd=process.cwd()}){
  guardBranch(branch);
  if(!remoteHas(remote,branch,cwd))return {found:false};
  const r=git(['show',`${remote}/${branch}:${file}`],cwd);
  if(r.status!==0)return {found:false};
  fs.mkdirSync(path.dirname(path.resolve(cwd,stats)),{recursive:true});
  fs.writeFileSync(path.resolve(cwd,stats),r.stdout);
  return {found:true};
}

export function summarize(ledger){
  return ledger.map(r=>JSON.stringify({id:r.id,parentId:r.parentId,parentSha256:r.parentSha256,partParent:r.partParent?{id:r.partParent.id,sha256:r.partParent.sha256}:undefined,
    source:r.source,family:r.family,op:r.op,arm:r.arm,gain:r.gain,novelty:r.novelty,verdict:r.verdict,reason:r.reason,glbSha256:r.glbSha256,registered:false,at:new Date().toISOString()})).join('\n')+'\n';
}

export function publish({stats,ledger,lights=null,branch='vibe-gym-data',remote='origin',cwd=process.cwd(),push=true}){
  guardBranch(branch);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gym-publish-'));
  const wt=path.join(tmp,'wt');
  try{
    if(remoteHas(remote,branch,cwd))must(git(['worktree','add','--quiet','-B',branch,wt,`${remote}/${branch}`],cwd),'worktree');
    else{
      must(git(['worktree','add','--quiet','--detach',wt],cwd),'worktree');
      must(git(['checkout','--quiet','--orphan',branch],wt),'orphan');
      git(['rm','-rf','--quiet','.'],wt);
    }
    fs.copyFileSync(path.resolve(cwd,stats),path.join(wt,'op-stats.json'));
    const led=JSON.parse(fs.readFileSync(path.resolve(cwd,ledger),'utf8')).ledger||[];
    fs.appendFileSync(path.join(wt,'ledger-summary.jsonl'),summarize(led));
    const add=['op-stats.json','ledger-summary.jsonl'];
    if(lights&&fs.existsSync(path.resolve(cwd,lights))){fs.copyFileSync(path.resolve(cwd,lights),path.join(wt,'learned-lights.json'));add.push('learned-lights.json')}
    must(git(['add',...add],wt),'add');
    const st=git(['status','--porcelain'],wt).stdout.trim();
    if(!st)return {published:false,reason:'NO_CHANGE'};
    must(git(['commit','--quiet','-m',`vibe-gym: ${led.length} variations`],wt),'commit');
    if(push)must(git(['push','--quiet',remote,`HEAD:refs/heads/${branch}`],wt),'push');
    return {published:true,entries:led.length};
  }finally{
    git(['worktree','remove','--force',wt],cwd);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const [cmd,...rest]=process.argv.slice(2),opt=n=>{const i=rest.indexOf('--'+n);return i>=0?rest[i+1]:null};
  try{
    const common={stats:opt('stats'),branch:opt('branch')||'vibe-gym-data',remote:opt('remote')||'origin'};
    if(cmd==='pull')console.log(JSON.stringify(pull({...common,file:opt('file')||'op-stats.json'})));
    else if(cmd==='publish')console.log(JSON.stringify(publish({...common,ledger:opt('ledger'),lights:opt('lights')})));
    else{console.error('usage: pull|publish');process.exit(2)}
  }catch(e){console.error(String(e.message||e));process.exit(1)}
}
