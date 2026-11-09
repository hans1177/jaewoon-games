#!/usr/bin/env node
// 파일명: tools/vibe-practice-session.mjs
// 연습 한 회차: ① CC0 변형 연습(확장 연산·실패 도감·리그 게이트) ② 조명 자동 탐색 ③ 노멀맵 굽기. 외부 AI 없음. 자식·결과는 자동 등록하지 않는다.
// 사용: node tools/vibe-practice-session.mjs [--seed N] [--parents 3] [--variants 4] [--out build/practice] [--stats build/gym-stats.json] [--lights build/learned-lights.json]
//      [--light-candidates 8] [--light-rounds 2] [--no-light] [--no-bake]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runGymSession,pickParents,mulberry32,blenderAvailable} from './vibe-variation-gym.mjs';
import {runLightSearch,mergeLearned} from './vibe-light-search.mjs';
import {runBake,evaluateBake} from './vibe-normal-bake.mjs';
import {approvedLibraryParents} from './vibe-cc0-library.mjs';

// 이번 회차에 쓸 부모 두 개(조명용·굽기용)를 시드로 고른다. 레지스트리의 승인된 CC0 + 오너가 승인한 로컬 라이브러리.
export function pickPracticeParents(repoRoot,seed,libraryDir=process.env.VIBE_CC0_LIBRARY_DIR||null){
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  const pool=[...pickParents(registry,repoRoot,1e9,mulberry32(seed+11)),...(libraryDir?approvedLibraryParents(libraryDir):[])];
  const abs=p=>path.isAbsolute(p.file)?p.file:path.join(repoRoot,p.file);
  const rng=mulberry32(seed+12);
  const shuffled=[...pool].sort(()=>rng()-.5);
  return shuffled.slice(0,2).map(p=>({id:p.id,family:p.family,file:abs(p)}));
}

export function runPracticeSession({repoRoot=process.cwd(),seed=1,parents=3,variants=4,out='build/practice',statsPath=null,lightsPath=null,light=true,bake=true,lightCandidates=8,lightRounds=2}={}){
  const outDir=path.resolve(repoRoot,out);fs.mkdirSync(outDir,{recursive:true});
  const session={seed,at:new Date().toISOString()};
  const gym=runGymSession({repoRoot,parents,variants,seed,out:path.join(out,'gym'),statsPath});
  const tally={};for(const r of gym.ledger)tally[r.verdict]=(tally[r.verdict]||0)+1;
  session.gym={children:gym.ledger.length,tally};
  const [lp,bp]=pickPracticeParents(repoRoot,seed);
  if(light&&lp){
    try{
      const res=runLightSearch({parent:lp.file,candidates:lightCandidates,rounds:lightRounds,seed,out:path.join(out,'light')});
      session.light={parent:lp.id,family:lp.family,best:res.best[0].score,mean:res.mean,roblox:res.best[0].roblox};
      if(lightsPath){
        const cur=fs.existsSync(lightsPath)?JSON.parse(fs.readFileSync(lightsPath,'utf8')):{};
        mergeLearned(cur,lp.family,res);
        fs.mkdirSync(path.dirname(path.resolve(lightsPath)),{recursive:true});fs.writeFileSync(lightsPath,JSON.stringify(cur,null,1)+'\n');
      }
    }catch(e){session.light={error:String(e.message||e).slice(0,200)}}
  }
  if(bake&&bp){
    try{
      const rec=runBake({parent:bp.file,ratio:0.3,size:128,out:path.join(out,'bake')});
      session.bake={parent:bp.id,...evaluateBake(rec),trianglesHigh:rec.trianglesHigh,trianglesLow:rec.trianglesLow};
    }catch(e){session.bake={error:String(e.message||e).slice(0,200)}}
  }
  fs.writeFileSync(path.join(outDir,'session.json'),JSON.stringify(session,null,1));
  return {session,gym};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};const flag=n=>args.includes('--'+n);
  if(!blenderAvailable()){console.error('Blender/bpy 없음 (VIBE2_BLENDER_BINARY 또는 pip install bpy)');process.exit(2)}
  const {session}=runPracticeSession({seed:+opt('seed',Math.floor(Date.now()/1000)),parents:+opt('parents',3),variants:+opt('variants',4),out:opt('out','build/practice'),statsPath:opt('stats',null),lightsPath:opt('lights',null),light:!flag('no-light'),bake:!flag('no-bake'),lightCandidates:+opt('light-candidates',8),lightRounds:+opt('light-rounds',2)});
  console.log(`VIBE_PRACTICE_SESSION gym=${JSON.stringify(session.gym.tally)} light=${session.light?.best??session.light?.error??'-'} bake=${session.bake?(session.bake.pass?'PASS':'FAIL '+(session.bake.failures||session.bake.error)):'-'}`);
}
