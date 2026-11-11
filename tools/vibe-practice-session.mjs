#!/usr/bin/env node
// 파일명: tools/vibe-practice-session.mjs
// 연습 한 회차: ① CC0 변형 연습(확장 연산·실패 도감·리그 게이트) ② 조명 자동 탐색 ③ 노멀맵 굽기. 외부 AI 없음. 자식·결과는 자동 등록하지 않는다.
// 사용: node tools/vibe-practice-session.mjs [--seed N] [--parents 3] [--variants 4] [--out build/practice] [--stats build/gym-stats.json] [--lights build/learned-lights.json]
//      [--light-candidates 8] [--light-rounds 2] [--no-light] [--no-bake]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runGymSession,pickParents,chooseDiverseParents,mulberry32,blenderAvailable,ASSET_PRACTICE_DOMAINS,buildPracticeAssetCoverage} from './vibe-variation-gym.mjs';
import {runLightSearch,mergeLearned} from './vibe-light-search.mjs';
import {runBake,evaluateBake,selectBakeParents} from './vibe-normal-bake.mjs';
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
  // [전체 자산 분류] 중앙 자산 레지스트리는 읽기 전용, 출처 없는 항목은 부족 자산으로 분리한다.
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  session.assetCoverage=buildPracticeAssetCoverage(registry,repoRoot);
  let gym;
  try{gym=runGymSession({repoRoot,parents,variants,seed,out:path.join(out,'gym'),statsPath});}
  catch(error){
    if(!String(error.message||error).includes('NO_ELIGIBLE_CC0_PARENT'))throw error;
    // 빈 자산은 임의 생성/우회하지 않고 UI 연습만 계속한다.
    const gymDir=path.join(outDir,'gym');fs.mkdirSync(gymDir,{recursive:true});
    fs.writeFileSync(path.join(gymDir,'ledger.json'),JSON.stringify({seed,generated:0,ledger:[]})+'\n');
    gym={ledger:[],stats:{},outDir:gymDir};
    session.assetShortage='NO_ELIGIBLE_CC0_PARENT';
  }
  const tally={};for(const r of gym.ledger)tally[r.verdict]=(tally[r.verdict]||0)+1;
  session.gym={children:gym.ledger.length,tally,
    families:[...new Set(gym.ledger.map(r=>r.family))],
    iconCandidates:gym.ledger.filter(r=>r.icon?.legible).length,
    iconRejected:gym.ledger.filter(r=>r.icon&&!r.icon.legible).length,
    rigAudited:gym.ledger.filter(r=>r.audit).length,
    motionComplete:gym.ledger.filter(r=>r.motion?.missing.length===0).length,
    motionGaps:gym.ledger.filter(r=>r.motion?.missing.length>0).length,
    gameApplied:0};
  // [UI 연습→채점→보관] 기존 화면 배치 엔진으로 18개 화면/3개 모바일 크기/2개 간격 변형을 연습한다.
  // 수치 평가만 기존 op-stats.json에 저장해 게임 코드·입력·저장 상태를 변경하지 않는다.
  const ui=exerciseVibeUiLayouts();
  // [버튼·아이콘] 기존 UI 책임 채점기의 터치 크기·동작 바인딩·레이블 대비만 연습한다.
  session.ui={surfaces:ui.surfaces,viewports:ui.viewports,trials:ui.trials,
    staticPasses:ui.staticPasses,staticFailures:ui.staticFailures,
    meanScore:ui.meanScore,measurement:ui.measurement,designVerified:false,
    bindingsRuntimeVerified:false,runtimeVerified:false,gameApplied:false,
    buttonStaticChecks:ui.rows.length,iconRuntimeVerified:false,buttonsClicked:false};
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
  // [노멀맵] 전체 승인 CC0 원본에서 실측 면 수/리그 여부로 후보를 고른다.
  // 충분한 고폴리 표면이 없으면 품질 한계를 낮추거나 임의 요철을 만들어 통과시키지 않는다.
  if(bake){
    const libraryDir=process.env.VIBE_CC0_LIBRARY_DIR||null;
    const sourcePool=[...pickParents(registry,repoRoot,1e9,mulberry32(seed+17)),
      ...(libraryDir?approvedLibraryParents(libraryDir):[])];
    const selected=selectBakeParents(sourcePool.map(p=>({...p,file:path.isAbsolute(p.file)?p.file:path.join(repoRoot,p.file)})),3);
    const attempts=[];
    for(const bp of selected){
      try{
        const ratio=Math.min(0.3,Math.max(0.02,4800/bp.sourceProfile.triangles));
        const rec=runBake({parent:path.isAbsolute(bp.file)?bp.file:path.join(repoRoot,bp.file),
          ratio,size:128,out:path.join(out,'bake')});
        const verdict=evaluateBake(rec);
        attempts.push({parent:bp.id,sourceTriangles:bp.sourceProfile.triangles,
          sourceType:bp.sourceProfile.sourceType,ratio,...verdict,
          trianglesHigh:rec.trianglesHigh,trianglesLow:rec.trianglesLow,
          normalDeviation:rec.normalDeviation});
        if(verdict.pass)break;
      }catch(e){
        attempts.push({parent:bp.id,pass:false,
          error:String(e.message||e).slice(0,200)});
      }
    }
    session.bake=attempts.length?{...attempts.at(-1),attempts,
      pass:attempts.some(x=>x.pass===true),
      bestPassed:attempts.find(x=>x.pass===true)?.parent||null,
      sourceCandidates:selected.length}:
      {pass:false,reason:'NO_APPROVED_STATIC_HIGH_DETAIL_SOURCE',sourceCandidates:0,attempts:[]};
    if(!session.bake.pass)session.assetCoverage.bakeShortage=session.bake.reason||
      'SOURCE_DETAIL_NOT_TRANSFERRED_TO_NORMAL_MAP';
  }
  // [분야별 연습 결과] 정적 실측·미검증·부족 분야를 분리한다. 게임/네이티브 성공으로 승격하지 않는다.
  const domains=Object.fromEntries(ASSET_PRACTICE_DOMAINS.map(name=>[name,{
    catalogued:session.assetCoverage.domains[name].catalogued,
    eligible3d:session.assetCoverage.domains[name].eligible3d,
    trials:0,staticMeasured:0,unverifiedOrFailed:0,
    nativeRuntimeVerified:false,gameApplied:false
  }]));
  for(const row of gym.ledger){
    for(const name of row.practiceTargets||[]){
      const record=domains[name];record.trials++;
      const measured=name==='RIG'||name==='JOINT'
        ?row.audit?.pass===true
        :name==='MOTION'||name==='ACTION'
          ?Array.isArray(row.motion?.present)&&row.motion.present.length>0
          :row.ok===true&&Number.isFinite(row.score)&&Number.isFinite(row.parentScore);
      if(measured)record.staticMeasured++;
      else record.unverifiedOrFailed++;
    }
  }
  // [UI] 화면·버튼 배치 계약과 실제 아이콘 픽셀 가독성은 서로 다른 실측이다.
  for(const name of ['UI','BUTTON']){
    domains[name].trials+=ui.trials;
    domains[name].staticMeasured+=ui.staticPasses;
    domains[name].unverifiedOrFailed+=ui.staticFailures;
  }
  const iconRows=gym.ledger.filter(row=>row.icon&&typeof row.icon.legible==='boolean');
  domains.ICON.trials+=iconRows.length;
  domains.ICON.staticMeasured+=iconRows.filter(row=>row.icon.legible===true).length;
  domains.ICON.unverifiedOrFailed+=iconRows.filter(row=>row.icon.legible!==true).length;
  if(session.light?.best!==undefined){
    domains.LIGHTING.trials++;domains.LIGHTING.staticMeasured++;
  }
  if(session.bake){
    const attempts=session.bake.attempts||[];
    domains.MATERIAL.trials+=attempts.length;
    domains.MATERIAL.staticMeasured+=attempts.filter(x=>x.pass===true).length;
    domains.MATERIAL.unverifiedOrFailed+=attempts.filter(x=>x.pass!==true).length;
  }
  for(const record of Object.values(domains)){
    record.state=record.trials?(record.staticMeasured?'STATIC_PRACTICE_MEASURED':'UNVERIFIED_OR_FAILED'):'NOT_PRACTICED';
  }
  session.practiceDomains=domains;
  session.productionPromotionAllowed=false;
  fs.writeFileSync(path.join(outDir,'session.json'),JSON.stringify(session,null,1));
  return {session,gym};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf('--'+n);return i>=0?args[i+1]:d};const flag=n=>args.includes('--'+n);
  if(!blenderAvailable()){console.error('Blender/bpy 없음 (VIBE2_BLENDER_BINARY 또는 pip install bpy)');process.exit(2)}
  const {session}=runPracticeSession({seed:+opt('seed',Math.floor(Date.now()/1000)),parents:+opt('parents',3),variants:+opt('variants',4),out:opt('out','build/practice'),statsPath:opt('stats',null),lightsPath:opt('lights',null),light:!flag('no-light'),bake:!flag('no-bake'),lightCandidates:+opt('light-candidates',8),lightRounds:+opt('light-rounds',2)});
  console.log(`VIBE_PRACTICE_SESSION gym=${JSON.stringify(session.gym.tally)} ui=${session.ui.staticPasses}/${session.ui.trials} static layouts light=${session.light?.best??session.light?.error??'-'} bake=${session.bake?(session.bake.pass?'PASS':'FAIL '+(session.bake.failures||session.bake.reason||session.bake.error)):'-'}`);
}
