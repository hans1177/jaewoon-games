#!/usr/bin/env node
// 파일명: tools/vibe-light-search.mjs
// 조명 자동 탐색: CC0 모델을 무작위 조명 조합으로 렌더(Blender) → 미적 점수(+레퍼런스가 있으면 닮은 정도)로 채점 → 좋은 조합을 배운다.
// 외부 AI 없음. 결과는 Roblox Lighting 속성(ClockTime·Brightness·Ambient·ColorShift_Top)으로 번역해 둔다(룩 프리셋 후보).
// 사용: node tools/vibe-light-search.mjs --parent assets/x/model.obj [--candidates 16] [--rounds 2] [--seed 1] [--reference dir] [--learned docs/devloop/light-search/learned.json] [--out build/light-search]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runPython,findBlender} from './vibe-python.mjs';
import {mulberry32} from './vibe-variation-gym.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const r2=(v,d=2)=>+v.toFixed(d);

// 색온도(켈빈) → 대략의 RGB(0~1). 따뜻한 해(3000K)부터 차가운 하늘빛(9000K)까지.
export function kelvinToRgb(k){
  const t=clamp(k,1500,12000)/100;
  const r=t<=66?255:clamp(329.698727446*Math.pow(t-60,-0.1332047592),0,255);
  const g=t<=66?clamp(99.4708025861*Math.log(t)-161.1195681661,0,255):clamp(288.1221695283*Math.pow(t-60,-0.0755148492),0,255);
  const b=t>=66?255:t<=19?0:clamp(138.5177312231*Math.log(t-10)-305.0447927307,0,255);
  return [r2(r/255,3),r2(g/255,3),r2(b/255,3)];
}

// 탐색 공간: 해 높이·방향·색온도·세기·그림자 부드러움·주변광(색온도+세기)
export const SPACE={elevation:[8,80],azimuth:[0,360],kelvin:[2800,9000],sun_strength:[0.8,5],softness:[1,12],ambient_kelvin:[4500,12000],ambient_strength:[0.15,1.1]};
export function sample(rng){
  const o={};for(const [k,[lo,hi]] of Object.entries(SPACE))o[k]=r2(lo+rng()*(hi-lo),k==='azimuth'||k==='elevation'?0:2);
  return o;
}
// 좋은 조합 주변을 조금씩 흔든다(언덕 오르기)
export function perturb(p,rng,amount=0.12){
  const o={};
  for(const [k,[lo,hi]] of Object.entries(SPACE)){
    const span=hi-lo,v=k==='azimuth'?((p[k]+(rng()-.5)*span*amount*2)%360+360)%360:clamp(p[k]+(rng()-.5)*span*amount*2,lo,hi);
    o[k]=r2(v,k==='azimuth'||k==='elevation'?0:2);
  }
  return o;
}
export function toJob(id,p){
  return {id,elevation:p.elevation,azimuth:p.azimuth,sun_color:kelvinToRgb(p.kelvin),sun_strength:p.sun_strength,softness:p.softness,ambient:kelvinToRgb(p.ambient_kelvin),ambient_strength:p.ambient_strength};
}
// Blender 조명 값 → Roblox Lighting 속성(근사). 해 높이가 낮을수록 아침/저녁 시각, 방향이 동쪽 반이면 오전.
export function toRoblox(p){
  const east=p.azimuth<180?-1:1;
  const clock=clamp(12+east*(1-p.elevation/90)*6,0,24);
  const to255=rgb=>rgb.map(c=>Math.round(clamp(c,0,1)*255));
  const amb=kelvinToRgb(p.ambient_kelvin).map(c=>c*clamp(p.ambient_strength,0,1));
  return {
    ClockTime:r2(clock,1),
    Brightness:r2(clamp(p.sun_strength*0.8,0,6)),
    ColorShift_Top:to255(kelvinToRgb(p.kelvin)),
    Ambient:to255(amb),
    OutdoorAmbient:to255(amb.map(c=>Math.min(1,c*1.15))),
    ShadowSoftness:r2(clamp(p.softness/12,0,1)),
  };
}

export function renderCandidates(parent,jobs,outDir,res,samples){
  fs.mkdirSync(outDir,{recursive:true});
  const jobsFile=path.join(outDir,'lights.json');fs.writeFileSync(jobsFile,JSON.stringify(jobs));
  const script=path.join(here,'vibe_light_search.py');
  const bl=findBlender();
  const a=['--parent',parent,'--jobs',jobsFile,'--out',outDir,'--res',String(res),'--samples',String(samples)];
  const r=bl?spawnSync(bl,['--background','--factory-startup','--python-exit-code','1','--python',script,'--',...a],{encoding:'utf8',maxBuffer:1<<27})
    :runPython(['-c',`import sys,runpy;sys.argv=['x','--',${a.map(x=>JSON.stringify(x)).join(',')}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<27});
  const done=jobs.filter(j=>fs.existsSync(path.join(outDir,j.id+'.png'))).length;
  if(done!==jobs.length)throw new Error(`LIGHT_RENDER_FAILED ${done}/${jobs.length}: `+String(r.stderr||r.stdout).split('\n').slice(-4).join(' | '));
}
export function scoreDir(dir,reference){
  const args=[path.join(here,'vibe_aesthetic_score.py'),'--dir',dir,'--max',String(1e4)];
  const r=runPython(args,{encoding:'utf8',maxBuffer:1<<26});
  const j=JSON.parse(r.stdout.trim().split('\n').pop());
  if(!j.available)throw new Error('AESTHETIC_SCORER_UNAVAILABLE(Pillow/numpy)');
  const scores=Object.fromEntries(j.frames.map(f=>[f.file.replace(/\.png$/,''),f.score]));
  if(!reference)return scores;
  // 레퍼런스가 있으면 후보마다 닮은 정도를 따로 재서 섞는다(취향 70% · 기술 30%)
  const out={};
  for(const f of j.frames){
    const one=path.join(dir,'_one');fs.rmSync(one,{recursive:true,force:true});fs.mkdirSync(one);
    fs.copyFileSync(path.join(dir,f.file),path.join(one,f.file));
    const rr=runPython([path.join(here,'vibe_aesthetic_score.py'),'--dir',one,'--reference',reference],{encoding:'utf8'});
    const jj=JSON.parse(rr.stdout.trim().split('\n').pop());
    out[f.file.replace(/\.png$/,'')]=jj.reference?+(jj.reference.score*0.7+f.score*0.3).toFixed(1):f.score;
  }
  fs.rmSync(path.join(dir,'_one'),{recursive:true,force:true});
  return out;
}

export function runLightSearch({parent,candidates=16,rounds=2,seed=1,reference=null,out='build/light-search',res=192,samples=8}={}){
  const rng=mulberry32(seed);
  let pool=Array.from({length:candidates},()=>sample(rng));
  const all=[];
  for(let round=0;round<rounds;round++){
    const dir=path.resolve(out,`round${round}`);fs.rmSync(dir,{recursive:true,force:true});
    const jobs=pool.map((p,i)=>toJob(`r${round}c${String(i).padStart(2,'0')}`,p));
    renderCandidates(parent,jobs,dir,res,samples);
    const sc=scoreDir(dir,reference);
    pool.forEach((p,i)=>all.push({id:jobs[i].id,params:p,score:sc[jobs[i].id]??0,round}));
    const top=all.filter(x=>x.round===round).sort((a,b)=>b.score-a.score).slice(0,Math.max(2,Math.floor(candidates/4)));
    // 다음 라운드: 상위 조합 주변을 흔든 것 + 새 무작위 몇 개(갇히지 않게)
    pool=Array.from({length:candidates},(_,i)=>i<candidates*0.7?perturb(top[i%top.length].params,rng):sample(rng));
  }
  all.sort((a,b)=>b.score-a.score);
  return {best:all.slice(0,5).map(x=>({...x,roblox:toRoblox(x.params)})),tested:all.length,mean:r2(all.reduce((t,x)=>t+x.score,0)/all.length,1)};
}

// 배운 조합 표: 모델 종류(family)마다 상위 5개만 유지. 점수가 같거나 낮으면 바꾸지 않는다.
export function mergeLearned(learned,family,result,keep=5){
  learned[family]??={runs:0,top:[]};
  const f=learned[family];f.runs++;
  const merged=[...f.top,...result.best.map(b=>({score:b.score,params:b.params,roblox:b.roblox}))]
    .sort((a,b)=>b.score-a.score);
  const seen=new Set(),top=[];
  for(const m of merged){const key=JSON.stringify(m.params);if(seen.has(key))continue;seen.add(key);top.push(m);if(top.length>=keep)break}
  f.top=top;f.meanLastRun=result.mean;
  return learned;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};
  if(!opt('parent')){console.error('--parent 필요');process.exit(2)}
  const res=runLightSearch({parent:path.resolve(opt('parent')),candidates:+opt('candidates',16),rounds:+opt('rounds',2),seed:+opt('seed',1),reference:opt('reference',null),out:opt('out','build/light-search')});
  const learnedPath=opt('learned',null);
  if(learnedPath){
    const cur=fs.existsSync(learnedPath)?JSON.parse(fs.readFileSync(learnedPath,'utf8')):{};
    mergeLearned(cur,opt('family','default'),res);
    fs.mkdirSync(path.dirname(learnedPath),{recursive:true});fs.writeFileSync(learnedPath,JSON.stringify(cur,null,1)+'\n');
  }
  console.log(`VIBE_LIGHT_SEARCH tested=${res.tested} mean=${res.mean} best=${res.best[0].score} ClockTime=${res.best[0].roblox.ClockTime} Brightness=${res.best[0].roblox.Brightness}`);
}
