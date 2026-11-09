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
import {approvedLibraryParents} from './vibe-cc0-library.mjs';
import {runPython,findBlender} from './vibe-python.mjs';
import {measure as measureRig,evaluateAudit} from './vibe-mesh-audit.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pick=(rng,arr)=>arr[Math.floor(rng()*arr.length)];

const rnd=(rng,lo,hi,d=2)=>+(lo+rng()*(hi-lo)).toFixed(d);
// 연산마다 세기(soft/strong) 두 구간을 가진다. 성적표는 연산:세기 단위로 쌓여서 "세게 주면 해롭다" 같은 것도 배운다.
export const STRENGTHS=['soft','strong'];
export const OPERATORS={
  hue_shift:{sample:(rng,st)=>({degrees:(rng()<0.5?-1:1)*(st==='soft'?rnd(rng,30,60,0):rnd(rng,90,180,0))}),note:'색조만 바꾼 변형(다양성)'},
  saturate_contrast:{sample:(rng,st)=>st==='soft'?{saturation:rnd(rng,1.05,1.25),value:rnd(rng,0.97,1.08),contrast:rnd(rng,0.05,0.15)}:{saturation:rnd(rng,1.3,1.7),value:rnd(rng,0.95,1.15),contrast:rnd(rng,0.2,0.4)},note:'채도·대비 강화'},
  proportion:{sample:(rng,st)=>st==='soft'?{x:rnd(rng,0.9,1.15),y:rnd(rng,0.9,1.15),z:rnd(rng,0.9,1.15)}:{x:rnd(rng,0.7,1.4),y:rnd(rng,0.7,1.4),z:rnd(rng,0.7,1.4)},note:'비율 바꾸기'},
  bevel:{sample:(rng,st)=>({width:st==='soft'?rnd(rng,0.006,0.012,3):rnd(rng,0.014,0.03,3),segments:2}),note:'모서리 다듬기'},
  outline:{sample:(rng,st)=>({thickness:st==='soft'?rnd(rng,0.006,0.01,3):rnd(rng,0.012,0.02,3)}),note:'만화풍 외곽선'},
  moss:{sample:(rng,st)=>({seed:Math.floor(rng()*1e6),threshold:st==='soft'?0.8:0.6,coverage:st==='soft'?rnd(rng,0.3,0.5):rnd(rng,0.7,0.95)}),note:'위쪽 면 이끼(오래된 느낌)'},
  wear:{sample:(rng,st)=>({height:st==='soft'?rnd(rng,0.1,0.18):rnd(rng,0.25,0.4)}),note:'바닥 흙때(닳은 느낌)'},
  noise_displace:{sample:(rng,st)=>({scale:rnd(rng,0.15,0.4),strength:st==='soft'?rnd(rng,0.01,0.02,3):rnd(rng,0.03,0.06,3)}),note:'표면 울퉁불퉁(돌·나무 결)'},
  inset_panel:{sample:(rng,st)=>({thickness:st==='soft'?rnd(rng,0.02,0.04,3):rnd(rng,0.05,0.09,3),depth:st==='soft'?rnd(rng,0.01,0.02,3):rnd(rng,0.03,0.06,3)}),note:'위쪽 패널 홈(입체감)'},
  kitbash:{sample:(rng,st)=>({scale:st==='soft'?rnd(rng,0.2,0.3):rnd(rng,0.35,0.5),mode:rng()<0.6?'top':'side'}),needsPart:true,note:'CC0 부품 조립(두 부모)'},
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

// 팔(arm) = 연산:세기. 성적표가 있으면 평균 이득이 큰 팔을 더 자주(1-epsilon), 없으면 무작위 탐험(epsilon).
export const armKey=(op,strength)=>`${op}:${strength}`;
export function chooseArms(stats,family,count,rng,epsilon=0.3){
  const fam=stats?.[family]||{};
  // 실패 도감: 5번 이상 해 봤는데 유지율이 20% 미만인 팔은 탐험에서도 뺀다(전부 빠지면 전체로 되돌린다).
  const everyArm=Object.keys(OPERATORS).flatMap(op=>STRENGTHS.map(strength=>({op,strength})));
  const failing=a=>{const f=fam[armKey(a.op,a.strength)];return !!f&&f.n>=5&&f.keep/f.n<0.2};
  const all=everyArm.filter(a=>!failing(a)).length?everyArm.filter(a=>!failing(a)):everyArm;
  const mean=a=>{const f=fam[armKey(a.op,a.strength)];return f&&f.n>=2?f.gainSum/f.n:null};
  // 이득이 플러스인 팔만 활용 대상. 이득에 비례한 가중으로 뽑아서, 나쁜 팔(마이너스)은 탐험 때만 나온다.
  const good=all.map(a=>({a,m:mean(a)})).filter(x=>x.m!==null&&x.m>0).sort((x,y)=>y.m-x.m).slice(0,4);
  const total=good.reduce((t,x)=>t+x.m,0);
  const out=[];
  for(let i=0;i<count;i++){
    if(!good.length||rng()<epsilon){out.push(pick(rng,all));continue}
    let r=rng()*total;
    out.push((good.find(x=>(r-=x.m)<=0)||good[0]).a);
  }
  return out;
}

const rulesPath=path.join(here,'vibe-kitbash-rules.json');
// 부품이 부모에 어울리는지: 규칙표에 맞는 방식(top/side) 목록. 없으면 [] (시도하지 않음).
export function kitbashModes(hostName,partName,rules=JSON.parse(fs.readFileSync(rulesPath,'utf8')).rules){
  const modes=new Set();
  for(const r of rules)if(new RegExp(r.part,'i').test(partName)&&new RegExp(r.host,'i').test(hostName))r.modes.forEach(m=>modes.add(m));
  return [...modes];
}
const nameOf=p=>`${p.id} ${path.basename(p.file)}`;

export const LIMITS={minNovelty:0.012,improveGain:1,varietyFloor:-1.5,maxDarkening:0.2,maxDetailDrop:0.35,maxAttachGap:0.03};
// 판정: 고장 / 너무 비슷함(색만 살짝) / 개선 / 다양성(나빠지지 않은 다른 모습) / 후퇴
export function judge(row,limits=LIMITS){
  if(!row.ok||row.empty)return {verdict:'BROKEN',keep:false};
  if(row.novelty<limits.minNovelty)return {verdict:'TOO_SIMILAR',keep:false};
  // 부품이 부모에 닿지 않고 떠 있으면 점수와 상관없이 후퇴
  if(row.attach&&(!row.attach.touched&&row.attach.gap>limits.maxAttachGap))return {verdict:'REGRESSED',keep:false,reason:'FLOATING_PART'};
  // 점수가 올랐어도 안쪽이 크게 어두워졌거나 세부가 뭉개졌으면 후퇴(점수 속이기 방지)
  if(row.darkening>limits.maxDarkening||row.detailDrop>limits.maxDetailDrop)return {verdict:'REGRESSED',keep:false,reason:row.darkening>limits.maxDarkening?'DARKENED':'DETAIL_LOST'};
  if(row.gain>=limits.improveGain)return {verdict:'IMPROVED',keep:true};
  if(row.gain>=limits.varietyFloor)return {verdict:'VARIETY',keep:true};
  return {verdict:'REGRESSED',keep:false};
}

// 리그 점검 게이트: 캐릭터·생물 계열 자식은 메쉬·리그 검사기를 통과해야 유지한다(애니메이션 연습으로 넘기려면 필수).
export const RIGGED_FAMILY=/CHARACTER|CREATURE|HERO|NPC|ANIMAL/i;
export function rigGate(row,audit){
  if(!RIGGED_FAMILY.test(row.family||'')||!row.keep||!row.glb)return row;
  try{
    const ev=audit(row.glb);
    row.audit={pass:ev.pass,failures:ev.failures.slice(0,3)};
    if(!ev.pass){row.keep=false;row.verdict='REGRESSED';row.reason='RIG:'+ev.failures[0]}
  }catch(e){row.audit={pass:false,failures:['AUDIT_ERROR']};row.keep=false;row.verdict='BROKEN';row.reason='RIG_AUDIT_ERROR'}
  return row;
}

export function updateStats(stats,family,rows){
  stats[family]??={};
  for(const r of rows){
    const s=stats[family][r.arm||r.op]??={n:0,gainSum:0,keep:0,improved:0,broken:0};
    if(r.keep===false){const why=r.reason||r.verdict;s.fail??={};s.fail[why]=(s.fail[why]||0)+1} // 실패 도감: 왜 실패했는지 쌓는다
    s.n++;s.gainSum=+(s.gainSum+(r.gain||0)).toFixed(3);
    if(r.keep)s.keep++;
    if(r.verdict==='IMPROVED')s.improved++;
    if(r.verdict==='BROKEN')s.broken++;
  }
  return stats;
}

export function blenderAvailable(){
  return !!findBlender()||runPython(['-c','import bpy']).status===0;
}
function runGym(jobsFile,outDir){
  const script=path.join(here,'vibe_variation_gym.py');
  const bl=findBlender();
  const r=bl?spawnSync(bl,['--background','--factory-startup','--python-exit-code','1','--python',script,'--','--jobs',jobsFile,'--out',outDir],{encoding:'utf8',maxBuffer:1<<27})
    :runPython(['-c',`import sys,runpy;sys.argv=['x','--','--jobs',${JSON.stringify(jobsFile)},'--out',${JSON.stringify(outDir)}];runpy.run_path(${JSON.stringify(script)},run_name='__main__')`],{encoding:'utf8',maxBuffer:1<<27});
  const res=path.join(outDir,'results.json');
  if(!fs.existsSync(res))throw new Error('VARIATION_GYM_FAILED: '+String(r.stderr||r.stdout).split('\n').slice(-5).join('\n'));
  return JSON.parse(fs.readFileSync(res,'utf8'));
}
function scoreChild(png,parentPng){
  const r=runPython([path.join(here,'vibe_object_score.py'),'--png',png,'--parent',parentPng],{encoding:'utf8',maxBuffer:1<<26});
  const j=JSON.parse(r.stdout.trim().split('\n').pop());
  if(!j.available)throw new Error('OBJECT_SCORER_UNAVAILABLE(Pillow/numpy)');
  return j.results[0];
}

const slugOf=id=>id.replace(/[^a-z0-9]+/gi,'-').slice(0,40);
const absOf=(repoRoot,p)=>path.isAbsolute(p.file)?p.file:path.join(repoRoot,p.file);
const relOrAbs=(repoRoot,p)=>path.isAbsolute(p.file)?p.file:p.file;

export function runGymSession({repoRoot=process.cwd(),parents=3,variants=4,seed=1,out='build/variation-gym',statsPath=null,only=null,libraryDir=process.env.VIBE_CC0_LIBRARY_DIR||null,rigAudit=f=>evaluateAudit(measureRig(f))}={}){
  const rng=mulberry32(seed);
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  const stats=statsPath&&fs.existsSync(statsPath)?JSON.parse(fs.readFileSync(statsPath,'utf8')):{};
  // 부모·부품 풀: 레지스트리의 승인된 CC0 + (있으면) 오너가 승인한 로컬 라이브러리 팩
  const lib=libraryDir?approvedLibraryParents(libraryDir).filter(x=>!only||only.includes(x.id)):[];
  const pool=[...pickParents(registry,repoRoot,1e9,mulberry32(seed+1),only),...lib];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const chosen=pool.slice(0,parents);
  if(!chosen.length)throw new Error('NO_ELIGIBLE_CC0_PARENT');
  // 부품 풀: 작은 소품(PROP)류. 부모와 다른 에셋만.
  const partPool=[...pickParents(registry,repoRoot,1e9,mulberry32(seed+2)),...approvedLibraryParents(libraryDir||'')].filter(x=>/PROP|ITEM|DECOR/i.test(x.family));
  const outDir=path.resolve(repoRoot,out);fs.mkdirSync(outDir,{recursive:true});
  const jobs=[],meta={};
  for(const p of chosen){
    const slug=slugOf(p.id),abs=absOf(repoRoot,p);
    jobs.push({id:`${slug}__parent`,parent:abs,op:'identity',params:{}});
    chooseArms(stats,p.family,variants,rng).forEach((arm,i)=>{
      const params=OPERATORS[arm.op].sample(rng,arm.strength),id=`${slug}__${arm.op}-${arm.strength}__${i}`;
      let part=null;
      if(OPERATORS[arm.op].needsPart){
        const cands=partPool.filter(x=>x.id!==p.id&&kitbashModes(nameOf(p),nameOf(x)).length);
        if(!cands.length)return; // 규칙표에 어울리는 부품이 없으면 이 시도는 건너뛴다
        part=pick(rng,cands);params.part=absOf(repoRoot,part);
        params.mode=pick(rng,kitbashModes(nameOf(p),nameOf(part)));
      }
      jobs.push({id,parent:abs,op:arm.op,params});meta[id]={arm:armKey(arm.op,arm.strength),part};
    });
  }
  const jobsFile=path.join(outDir,'jobs.json');fs.writeFileSync(jobsFile,JSON.stringify(jobs));
  const results=runGym(jobsFile,outDir);
  const byId=Object.fromEntries(results.map(r=>[r.id,r]));
  const ledger=[];
  for(const p of chosen){
    const slug=slugOf(p.id),parentRes=byId[`${slug}__parent`],parentSha=sha256(absOf(repoRoot,p));
    if(!parentRes?.ok)continue;
    const parentScore=scoreChild(parentRes.png,parentRes.png);
    const rows=[];
    for(const j of jobs.filter(j=>j.id.startsWith(slug+'__')&&j.op!=='identity')){
      const res=byId[j.id],m=meta[j.id];
      const params={...j.params};
      const row={id:j.id,parentId:p.id,parentFile:relOrAbs(repoRoot,p),parentSha256:parentSha,license:p.license,family:p.family,source:p.source||'REGISTRY',op:j.op,arm:m.arm,params,ok:!!res?.ok,registered:false};
      if(m.part){ // 두 부모 모두 출처·해시를 남긴다
        delete params.part;
        row.partParent={id:m.part.id,file:relOrAbs(repoRoot,m.part),sha256:sha256(absOf(repoRoot,m.part)),license:m.part.license};
      }
      if(res?.ok){
        const sc=scoreChild(res.png,parentRes.png);
        Object.assign(row,{attach:res.attach||null,score:sc.score,parentScore:parentScore.score,gain:sc.gain,novelty:sc.novelty,darkening:sc.darkening,detailDrop:sc.detailDrop,sub:sc.sub,empty:!!sc.empty,triangles:res.triangles,glb:path.relative(repoRoot,res.glb),glbSha256:sha256(res.glb)});
      }else row.error=res?.error||'NO_RESULT';
      Object.assign(row,judge(row));
      if(row.glb){const g=rigGate({...row,glb:path.join(repoRoot,row.glb)},rigAudit);if(g.audit)Object.assign(row,{keep:g.keep,verdict:g.verdict,reason:g.reason,audit:g.audit})}
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
