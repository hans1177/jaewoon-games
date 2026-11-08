#!/usr/bin/env node
// 파일명: tools/vibe-variation-gym.mjs
// CC0 변형 연습장: 오너가 승인한 CC0 3D 부모 모델을 변형 연산자로 바꾸고(Blender/bpy), 렌더해서 채점하고, 연산 성적표를 쌓는다.
// 외부 AI 없음. 새 도형을 만들지 않는다. 자식은 자동 등록하지 않는다(오너 승인 전 build 폴더에만 존재).
// 사용: node tools/vibe-variation-gym.mjs --parents 3 --variants 4 --seed 7 [--out build/variation-gym] [--stats docs/devloop/variation-gym/op-stats.json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pick=(rng,arr)=>arr[Math.floor(rng()*arr.length)];

export const OPERATORS={
  hue_shift:{sample:rng=>({degrees:pick(rng,[-120,-60,-30,30,60,120,180])}),note:'색조만 바꾼 변형(다양성)'},
  saturate_contrast:{sample:rng=>({saturation:+(1.1+rng()*0.5).toFixed(2),value:+(0.95+rng()*0.2).toFixed(2),contrast:+(0.1+rng()*0.25).toFixed(2)}),note:'채도·대비 강화'},
  proportion:{sample:rng=>({x:+(0.8+rng()*0.5).toFixed(2),y:+(0.8+rng()*0.5).toFixed(2),z:+(0.75+rng()*0.6).toFixed(2)}),note:'비율 바꾸기'},
  bevel:{sample:rng=>({width:+(0.008+rng()*0.014).toFixed(3),segments:2}),note:'모서리 다듬기'},
  outline:{sample:rng=>({thickness:+(0.008+rng()*0.01).toFixed(3)}),note:'만화풍 외곽선'},
};

export function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// 부모 후보: CC0 + 소스 파일(obj/glb)이 실제로 있고 + 막힘/격리/게임사용금지/파생이 아닌 등록 에셋
export function pickParents(registry,repoRoot,n,rng,only=null){
  const ok=[];
  for(const a of registry.assets||[]){
    if(!/^CC0(?:-1\.0)?$/i.test(String(a.license||'')))continue;
    if(a.securityBlocked||a.quarantined||a.gameUseForbidden||a.parentSourceId||a.derivedFromAssetId)continue;
    const file=(a.sourceFiles||[]).find(f=>/\.(obj|glb|gltf)$/i.test(f));
    if(!file||!fs.existsSync(path.join(repoRoot,file)))continue;
    if(only&&!only.includes(a.id))continue;
    ok.push({id:a.id,family:String(a.family||a.category||'?'),file,license:'CC0'});
  }
  for(let i=ok.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[ok[i],ok[j]]=[ok[j],ok[i]]}
  return ok.slice(0,n);
}

// 연산 선택: 성적표가 있으면 평균 이득이 큰 연산을 더 자주(1-epsilon), 아니면 무작위 탐험(epsilon)
export function chooseOps(stats,family,count,rng,epsilon=0.3){
  const names=Object.keys(OPERATORS),fam=stats?.[family]||{};
  const ranked=names.filter(o=>fam[o]?.n>=2).sort((a,b)=>fam[b].gainSum/fam[b].n-fam[a].gainSum/fam[a].n);
  const out=[];
  for(let i=0;i<count;i++){
    const explore=!ranked.length||rng()<epsilon;
    out.push(explore?pick(rng,names):ranked[Math.min(ranked.length-1,Math.floor(rng()*Math.min(2,ranked.length)))]);
  }
  return out;
}

export const LIMITS={minNovelty:0.012,improveGain:1,varietyFloor:-1.5};
// 판정: 고장 / 너무 비슷함(색만 살짝) / 개선 / 다양성(나빠지지 않은 다른 모습) / 후퇴
export function judge(row,limits=LIMITS){
  if(!row.ok||row.empty)return {verdict:'BROKEN',keep:false};
  if(row.novelty<limits.minNovelty)return {verdict:'TOO_SIMILAR',keep:false};
  if(row.gain>=limits.improveGain)return {verdict:'IMPROVED',keep:true};
  if(row.gain>=limits.varietyFloor)return {verdict:'VARIETY',keep:true};
  return {verdict:'REGRESSED',keep:false};
}

export function updateStats(stats,family,rows){
  stats[family]??={};
  for(const r of rows){
    const s=stats[family][r.op]??={n:0,gainSum:0,keep:0,improved:0,broken:0};
    s.n++;s.gainSum=+(s.gainSum+(r.gain||0)).toFixed(3);
    if(r.keep)s.keep++;
    if(r.verdict==='IMPROVED')s.improved++;
    if(r.verdict==='BROKEN')s.broken++;
  }
  return stats;
}

export function blenderAvailable(){
  if(process.env.VIBE2_BLENDER_BINARY)return spawnSync(process.env.VIBE2_BLENDER_BINARY,['--version']).status===0;
  return spawnSync('python3',['-c','import bpy']).status===0;
}
function runGym(jobsFile,outDir){
  const script=path.join(here,'vibe_variation_gym.py');
  const bl=process.env.VIBE2_BLENDER_BINARY;
  const r=bl?spawnSync(bl,['--background','--factory-startup','--python-exit-code','1','--python',script,'--','--jobs',jobsFile,'--out',outDir],{encoding:'utf8',maxBuffer:1<<27})
    :spawnSync('python3',['-c',`import sys,runpy;sys.argv=['x','--','--jobs',${JSON.stringify(jobsFile)},'--out',${JSON.stringify(outDir)}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<27});
  const res=path.join(outDir,'results.json');
  if(!fs.existsSync(res))throw new Error('VARIATION_GYM_FAILED: '+String(r.stderr||r.stdout).split('\n').slice(-5).join('\n'));
  return JSON.parse(fs.readFileSync(res,'utf8'));
}
function scoreChild(png,parentPng){
  const r=spawnSync('python3',[path.join(here,'vibe_object_score.py'),'--png',png,'--parent',parentPng],{encoding:'utf8',maxBuffer:1<<26});
  const j=JSON.parse(r.stdout.trim().split('\n').pop());
  if(!j.available)throw new Error('OBJECT_SCORER_UNAVAILABLE(Pillow/numpy)');
  return j.results[0];
}

export function runGymSession({repoRoot=process.cwd(),parents=3,variants=4,seed=1,out='build/variation-gym',statsPath=null,only=null}={}){
  const rng=mulberry32(seed);
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  const stats=statsPath&&fs.existsSync(statsPath)?JSON.parse(fs.readFileSync(statsPath,'utf8')):{};
  const chosen=pickParents(registry,repoRoot,parents,rng,only);
  if(!chosen.length)throw new Error('NO_ELIGIBLE_CC0_PARENT');
  const outDir=path.resolve(repoRoot,out);fs.mkdirSync(outDir,{recursive:true});
  const jobs=[],meta={};
  for(const p of chosen){
    const slug=p.id.replace(/[^a-z0-9]+/gi,'-').slice(0,40);
    const abs=path.join(repoRoot,p.file);
    jobs.push({id:`${slug}__parent`,parent:abs,op:'identity',params:{}});
    meta[`${slug}__parent`]={parent:p,isParent:true};
    chooseOps(stats,p.family,variants,rng).forEach((op,i)=>{
      const params=OPERATORS[op].sample(rng),id=`${slug}__${op}__${i}`;
      jobs.push({id,parent:abs,op,params});meta[id]={parent:p,slug};
    });
  }
  const jobsFile=path.join(outDir,'jobs.json');fs.writeFileSync(jobsFile,JSON.stringify(jobs));
  const results=runGym(jobsFile,outDir);
  const byId=Object.fromEntries(results.map(r=>[r.id,r]));
  const ledger=[];
  for(const p of chosen){
    const slug=p.id.replace(/[^a-z0-9]+/gi,'-').slice(0,40);
    const parentRes=byId[`${slug}__parent`];
    const parentSha=sha256(path.join(repoRoot,p.file));
    if(!parentRes?.ok)continue;
    const parentScore=scoreChild(parentRes.png,parentRes.png);
    const rows=[];
    for(const j of jobs.filter(j=>j.id.startsWith(slug+'__')&&j.op!=='identity')){
      const res=byId[j.id];
      let row={id:j.id,parentId:p.id,parentFile:p.file,parentSha256:parentSha,license:p.license,family:p.family,op:j.op,params:j.params,ok:!!res?.ok,registered:false};
      if(res?.ok){
        const sc=scoreChild(res.png,parentRes.png);
        Object.assign(row,{score:sc.score,parentScore:parentScore.score,gain:sc.gain,novelty:sc.novelty,sub:sc.sub,empty:!!sc.empty,triangles:res.triangles,glb:path.relative(repoRoot,res.glb),glbSha256:sha256(res.glb)});
      }else row.error=res?.error||'NO_RESULT';
      Object.assign(row,judge(row));
      rows.push(row);ledger.push(row);
    }
    updateStats(stats,p.family,rows);
  }
  fs.writeFileSync(path.join(outDir,'ledger.json'),JSON.stringify({seed,generated:ledger.length,ledger},null,1));
  if(statsPath){fs.mkdirSync(path.dirname(statsPath),{recursive:true});fs.writeFileSync(statsPath,JSON.stringify(stats,null,1)+'\n')}
  return {ledger,stats,outDir};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};
  if(!blenderAvailable()){console.error('Blender/bpy 없음 (VIBE2_BLENDER_BINARY 또는 pip install bpy)');process.exit(2)}
  const {ledger,stats,outDir}=runGymSession({parents:+opt('parents',3),variants:+opt('variants',4),seed:+opt('seed',1),out:opt('out','build/variation-gym'),statsPath:opt('stats',null)});
  const tally={};for(const r of ledger)tally[r.verdict]=(tally[r.verdict]||0)+1;
  console.log(`VIBE_VARIATION_GYM children=${ledger.length} ${JSON.stringify(tally)} out=${outDir}`);
  for(const [fam,ops] of Object.entries(stats)){
    const rank=Object.entries(ops).map(([o,s])=>`${o} 평균이득 ${(s.gainSum/s.n).toFixed(1)} (n=${s.n}, 유지 ${s.keep})`).sort();
    console.log(`  ${fam}: ${rank.join(' | ')}`);
  }
}
