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

// [노멀 연습 원본 분석] 실제 면 수를 보지 않고 평면 소품을 반복 굽는 낭비를 줄인다.
// 메쉬 복제·보간·재질 생성 없이 승인된 원본의 정적 구조만 분석한다.
export function inspectBakeSource(file){
  const fail=reason=>({eligible:false,reason,triangles:0,skinned:false,animated:false});
  let raw,ext,geometry;
  try{
    const stat=fs.statSync(file);
    if(!stat.isFile()||stat.size<20||stat.size>64*1024*1024)return fail('SOURCE_SIZE_INVALID');
    ext=path.extname(file).toLowerCase();
    if(ext==='.obj'){
      raw=fs.readFileSync(file,'utf8');
      let triangles=0,vertices=0;
      for(const row of raw.split(/\r?\n/)){
        if(row.startsWith('v '))vertices++;
        else if(row.startsWith('f '))triangles+=Math.max(0,row.trim().split(/\s+/).length-3);
      }
      geometry={triangles,vertices,skinned:false,animated:false};
    }else if(ext==='.glb'){
      const fd=fs.openSync(file,'r');
      try{
        const head=Buffer.alloc(20);
        if(fs.readSync(fd,head,0,20,0)!==20||head.toString('ascii',0,4)!=='glTF'||
          head.readUInt32LE(4)!==2||head.toString('ascii',16,20)!=='JSON')
          return fail('GLB_HEADER_INVALID');
        const length=head.readUInt32LE(12);
        if(length<2||length>8*1024*1024||length+20>stat.size)return fail('GLB_JSON_INVALID');
        const buf=Buffer.alloc(length);
        if(fs.readSync(fd,buf,0,length,20)!==length)return fail('GLB_JSON_TRUNCATED');
        raw=buf.toString('utf8');
      }finally{fs.closeSync(fd);}
      geometry=null;
    }else if(ext==='.gltf'){
      if(stat.size>8*1024*1024)return fail('GLTF_JSON_TOO_LARGE');
      raw=fs.readFileSync(file,'utf8');geometry=null;
    }else return fail('SOURCE_FORMAT_UNSUPPORTED');
    if(!geometry){
      const model=JSON.parse(raw);
      const accessors=Array.isArray(model.accessors)?model.accessors:[];
      let triangles=0;
      for(const mesh of Array.isArray(model.meshes)?model.meshes:[])
        for(const primitive of Array.isArray(mesh.primitives)?mesh.primitives:[]){
          const mode=primitive.mode??4;
          const idx=Number.isSafeInteger(primitive.indices)?primitive.indices:primitive.attributes?.POSITION;
          const count=Number.isSafeInteger(idx)?Number(accessors[idx]?.count)||0:0;
          if(mode===4)triangles+=Math.floor(count/3);
          else if(mode===5||mode===6)triangles+=Math.max(0,count-2);
        }
      geometry={triangles,vertices:0,skinned:(model.skins||[]).length>0,animated:(model.animations||[]).length>0};
    }
    const reason=geometry.skinned||geometry.animated?'ANIMATED_ACTOR_REQUIRES_RIG_PRESERVING_AUTHORING':
      geometry.triangles<1500?'SOURCE_HAS_INSUFFICIENT_GEOMETRY':'';
    return {...geometry,eligible:!reason,reason:reason||null,
      sourceType:ext,staticSourceInspected:true,nativeRuntimeVerified:false};
  }catch(error){return fail('SOURCE_INSPECTION_FAILED:'+String(error.code||error.name||'UNKNOWN').slice(0,24))}
}

// [정적 선택] 베이크에 충분한 실제 면이 있고 관절·클립이 없는 CC0 원본을 우선한다.
// 시드 순서는 동률에서만 사용한다. 세부가 없으면 원본을 변형해 결과를 조작하지 않는다.
export function selectBakeParents(parents=[],max=3){
  return parents.map(parent=>({...parent,sourceProfile:inspectBakeSource(parent.file)}))
    .filter(parent=>parent.sourceProfile.eligible)
    .sort((a,b)=>b.sourceProfile.triangles-a.sourceProfile.triangles||
      String(a.id).localeCompare(String(b.id)))
    .slice(0,Math.max(0,max));
}

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
