#!/usr/bin/env node
// 파일명: tools/vibe-practice-session.mjs
// 연습 한 회차: ① CC0 변형 연습(확장 연산·실패 도감·리그 게이트) ② 조명 자동 탐색 ③ 노멀맵 굽기. 외부 AI 없음. 자식·결과는 자동 등록하지 않는다.
// 사용: node tools/vibe-practice-session.mjs [--seed N] [--parents 3] [--variants 4] [--out build/practice] [--stats build/gym-stats.json] [--lights build/learned-lights.json]
//      [--light-candidates 8] [--light-rounds 2] [--no-light] [--no-bake]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runGymSession,pickParents,chooseDiverseParents,mulberry32,blenderAvailable} from './vibe-variation-gym.mjs';
import {runLightSearch,mergeLearned} from './vibe-light-search.mjs';
import {runBake,evaluateBake} from './vibe-normal-bake.mjs';
import {approvedLibraryParents} from './vibe-cc0-library.mjs';
import {exerciseVibeUiLayouts} from '../assets/vibe-presentation-director.js';

// 이번 회차에 쓸 부모 두 개(조명용·굽기용)를 시드로 고른다. 레지스트리의 승인된 CC0 + 오너가 승인한 로컬 라이브러리.
export function pickPracticeParents(repoRoot,seed,libraryDir=process.env.VIBE_CC0_LIBRARY_DIR||null,count=2){
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  const pool=[...pickParents(registry,repoRoot,1e9,mulberry32(seed+11)),...(libraryDir?approvedLibraryParents(libraryDir):[])];
  const abs=p=>path.isAbsolute(p.file)?p.file:path.join(repoRoot,p.file);
  const rng=mulberry32(seed+12);
  const shuffled=[...pool].sort(()=>rng()-.5);
  return chooseDiverseParents(shuffled,count).map(p=>({id:p.id,family:p.family,file:abs(p)}));
}

export function runPracticeSession({repoRoot=process.cwd(),seed=1,parents=3,variants=4,out='build/practice',statsPath=null,lightsPath=null,light=true,bake=true,lightCandidates=8,lightRounds=2}={}){
  const outDir=path.resolve(repoRoot,out);fs.mkdirSync(outDir,{recursive:true});
  const session={seed,at:new Date().toISOString()};
  const gym=runGymSession({repoRoot,parents,variants,seed,out:path.join(out,'gym'),statsPath});
  const tally={};for(const r of gym.ledger)tally[r.verdict]=(tally[r.verdict]||0)+1;
  session.gym={children:gym.ledger.length,tally,
    families:[...new Set(gym.ledger.map(r=>r.family))],
    iconCandidates:gym.ledger.filter(r=>r.icon?.legible).length,
    iconRejected:gym.ledger.filter(r=>r.icon&&!r.icon.legible).length,
    rigAudited:gym.ledger.filter(r=>r.audit).length,
    motionComplete:gym.ledger.filter(r=>r.motion?.missing.length===0).length,
    motionGaps:gym.ledger.filter(r=>r.motion?.missing.length>0).length,
    gameApplied:0};
  // [UI 연습→채점→보관] 기존 화면 배치 엔진으로 8개 화면/3개 모바일 크기/2개 간격 변형을 연습한다.
  // 수치 평가만 기존 op-stats.json에 저장해 게임 코드·입력·저장 상태를 변경하지 않는다.
  const ui=exerciseVibeUiLayouts();
  session.ui={surfaces:ui.surfaces,viewports:ui.viewports,trials:ui.trials,
    staticPasses:ui.staticPasses,staticFailures:ui.staticFailures,
    meanScore:ui.meanScore,measurement:ui.measurement,designVerified:false,
    bindingsRuntimeVerified:false,runtimeVerified:false,gameApplied:false};
  if(statsPath){
    const statsFile=path.resolve(repoRoot,statsPath);
    const scores=fs.existsSync(statsFile)?JSON.parse(fs.readFileSync(statsFile,'utf8')):{};
    scores.UI??={};
    for(const row of ui.rows){
      const key=row.surface.toLowerCase()+'_layout:'+row.variant;
      const entry=scores.UI[key]??={n:0,keep:0,gainSum:0,improved:0,broken:0};
      // 기존 n은 배치 검사 누계다. 디자인 실측이 시작된 회차만 별도 분모로 보관한다.
      if(!Number.isSafeInteger(entry.designSamples)||entry.designSamples<0){
        const prior=Number(entry.designScoreSum||0);
        if(Number.isSafeInteger(prior)&&prior>=0&&prior<=entry.n*100&&prior%100===0){
          // 이전 디자인 점수는 전부 100점인 확정 정적 회차다.
          entry.designSamples=prior/100;
        }else{
          entry.designLegacyScoreSum=prior;
          entry.designScoreSum=0;
          entry.designSamples=0;
        }
      }
      entry.n++;entry.gainSum+=row.gain;
      entry.designSamples++;
      entry.designScoreSum=(entry.designScoreSum||0)+row.designScore;
      entry.fontIssues=(entry.fontIssues||0)+row.fontIssues;
      entry.bindingIssues=(entry.bindingIssues||0)+row.bindingIssues;
      entry.touchSpacingIssues=(entry.touchSpacingIssues||0)+row.touchSpacingIssues;
      if(row.staticPass){entry.keep++;if(row.gain>0)entry.improved++;}
      else{entry.broken++;entry.fail??={};const reason=row.issues[0]||'STATIC_LAYOUT_FAIL';entry.fail[reason]=(entry.fail[reason]||0)+1;}
    }
    fs.writeFileSync(statsFile,JSON.stringify(scores,null,1)+'\n');
  }
  const [lp,...bakeParents]=pickPracticeParents(repoRoot,seed,process.env.VIBE_CC0_LIBRARY_DIR||null,4);
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
  // [노멀맵] 평평한 모델은 진짜 굽기 품질을 증명하지 못한다. 기준을 낮추지 않고 다른 CC0 부모로 재시도한다.
  if(bake&&bakeParents.length){
    const attempts=[];
    for(const bp of bakeParents.slice(0,3)){
      try{
        const rec=runBake({parent:bp.file,ratio:0.3,size:128,out:path.join(out,'bake')});
        const verdict=evaluateBake(rec);
        attempts.push({parent:bp.id,...verdict,trianglesHigh:rec.trianglesHigh,trianglesLow:rec.trianglesLow});
        if(verdict.pass)break;
      }catch(e){attempts.push({parent:bp.id,pass:false,error:String(e.message||e).slice(0,200)})}
    }
    session.bake={...attempts[attempts.length-1],attempts};
  }
  fs.writeFileSync(path.join(outDir,'session.json'),JSON.stringify(session,null,1));
  return {session,gym};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};const flag=n=>args.includes('--'+n);
  if(!blenderAvailable()){console.error('Blender/bpy 없음 (VIBE2_BLENDER_BINARY 또는 pip install bpy)');process.exit(2)}
  const {session}=runPracticeSession({seed:+opt('seed',Math.floor(Date.now()/1000)),parents:+opt('parents',3),variants:+opt('variants',4),out:opt('out','build/practice'),statsPath:opt('stats',null),lightsPath:opt('lights',null),light:!flag('no-light'),bake:!flag('no-bake'),lightCandidates:+opt('light-candidates',8),lightRounds:+opt('light-rounds',2)});
  console.log(`VIBE_PRACTICE_SESSION gym=${JSON.stringify(session.gym.tally)} ui=${session.ui.staticPasses}/${session.ui.trials} static layouts light=${session.light?.best??session.light?.error??'-'} bake=${session.bake?(session.bake.pass?'PASS':'FAIL '+(session.bake.failures||session.bake.error)):'-'}`);
}
