#!/usr/bin/env node
// 파일명: tools/vibe-normal-bake.mjs
// 노멀맵 굽기: CC0 모델을 가볍게 줄이고 요철을 노멀맵으로 옮긴다(Blender/bpy). 외부 AI 없음. 새 도형 없음(부모 축소).
// 사용: node tools/vibe-normal-bake.mjs --parent <model> [--ratio 0.25] [--size 256] [--out build/bake]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runPython,findBlender} from './vibe-python.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
export const LIMITS={minReduction:0.3,minNormalDeviation:0.006,maxLowTriangles:5000};

// 합격 판정: 충분히 가벼워졌고(30% 이상 감소), 노멀맵에 실제 요철이 구워졌고(변화량), 저폴리 삼각형 수가 상한 이하인가
export function evaluateBake(rec,limits=LIMITS){
  const failures=[];
  if(!rec||!rec.ok)return {pass:false,failures:['BAKE_FAILED']};
  const reduction=1-rec.trianglesLow/Math.max(1,rec.trianglesHigh);
  if(reduction<limits.minReduction)failures.push(`NOT_LIGHTER:${(reduction*100).toFixed(0)}%`);
  if(rec.normalDeviation<limits.minNormalDeviation)failures.push(`NOTHING_BAKED:${rec.normalDeviation}`);
  if(rec.trianglesLow>limits.maxLowTriangles)failures.push(`TOO_HEAVY:${rec.trianglesLow}`);
  return {pass:failures.length===0,failures,reduction:+reduction.toFixed(3)};
}

export function runBake({parent,ratio=0.25,size=256,out='build/bake'}){
  const outDir=path.resolve(out);fs.mkdirSync(outDir,{recursive:true});
  fs.rmSync(path.join(outDir,'bake.json'),{force:true});
  const script=path.join(here,'vibe_normal_bake.py');
  const a=['--parent',path.resolve(parent),'--out',outDir,'--ratio',String(ratio),'--size',String(size)];
  const bl=findBlender();
  const r=bl?spawnSync(bl,['--background','--factory-startup','--python-exit-code','1','--python',script,'--',...a],{encoding:'utf8',maxBuffer:1<<27})
    :runPython(['-c',`import sys,runpy;sys.argv=['x','--',${a.map(x=>JSON.stringify(x)).join(',')}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<27});
  const file=path.join(outDir,'bake.json');
  if(!fs.existsSync(file))return {ok:false,error:String(r.stderr||r.stdout).split('\n').slice(-4).join(' | ')};
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};
  if(!opt('parent')){console.error('--parent 필요');process.exit(2)}
  const rec=runBake({parent:opt('parent'),ratio:+opt('ratio',0.25),size:+opt('size',256),out:opt('out','build/bake')});
  const ev=evaluateBake(rec);
  console.log(`VIBE_NORMAL_BAKE ${ev.pass?'PASS':'FAIL'} ${rec.trianglesHigh}->${rec.trianglesLow} dev=${rec.normalDeviation} ${ev.failures.join(',')}`);
  process.exit(ev.pass?0:1);
}
