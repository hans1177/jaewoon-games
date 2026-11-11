#!/usr/bin/env node
// 파일명: tools/vibe-practice-session.mjs
// 연습 한 회차: ① CC0 변형 연습(확장 연산·실패 도감·리그 게이트) ② 조명 자동 탐색 ③ 노멀맵 굽기. 외부 AI 없음. 자식·결과는 자동 등록하지 않는다.
// 사용: node tools/vibe-practice-session.mjs [--seed N] [--parents 3] [--variants 4] [--out build/practice] [--stats build/gym-stats.json] [--lights build/learned-lights.json]
//      [--light-candidates 8] [--light-rounds 2] [--no-light] [--no-bake]
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runGymSession,pickParents,chooseDiverseParents,mulberry32,blenderAvailable,motionCoverage,scoreChild,ASSET_PRACTICE_DOMAINS,buildPracticeAssetCoverage} from './vibe-variation-gym.mjs';
import {measure as measureRig,evaluateAudit,evaluateMotionCurves} from './vibe-mesh-audit.mjs';
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

export function runPracticeSession({repoRoot=process.cwd(),seed=1,parents=3,variants=4,out='build/practice',statsPath=null,lightsPath=null,light=true,bake=true,lightCandidates=8,lightRounds=2,bakeHistoryPath='build/bake-history.json'}={}){
  const outDir=path.resolve(repoRoot,out);fs.mkdirSync(outDir,{recursive:true});
  const session={seed,at:new Date().toISOString()};
  // [전체 자산 분류] 중앙 자산 레지스트리는 읽기 전용, 출처 없는 항목은 부족 자산으로 분리한다.
  const registry=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-asset-library.json'),'utf8'));
  // [연습 이력 선로드] 노멀맵·리그 모두 기존 숫자형 학습 브랜치의 같은 스냅샷을 사용한다.
  let previousPractice={};
  try{
    const historyFile=path.resolve(repoRoot,bakeHistoryPath);
    if(historyFile.startsWith(path.resolve(repoRoot)+path.sep))
      previousPractice=JSON.parse(fs.readFileSync(historyFile,'utf8'));
  }catch{}
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
      const cur=lightsPath&&fs.existsSync(lightsPath)?JSON.parse(fs.readFileSync(lightsPath,'utf8')):{};
      const res=runLightSearch({parent:lp.file,candidates:lightCandidates,rounds:lightRounds,seed,
        out:path.join(out,'light'),learned:cur[lp.family]?.top});
      session.light={parent:lp.id,family:lp.family,best:res.best[0].score,mean:res.mean,
        roblox:res.best[0].roblox,replayed:res.replayed,baseline:res.baseline,gain:res.gain};
      if(lightsPath){
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
    // [학습 이력] 기존 vibe-gym-data 브랜치에서 불러온 후보별 실측 결과만 사용한다.
    // 파일이 없어도 승인된 원본 연습은 계속하며, 이전 실패를 성공으로 승격하지 않는다.
    const bakeHistory=previousPractice?.bake?.history||{};
    const sourceCandidates=sourcePool.map(p=>({...p,
      file:path.isAbsolute(p.file)?p.file:path.join(repoRoot,p.file)}));
    const selected=selectBakeParents(sourceCandidates,3,bakeHistory);
    const attempts=[];
    for(const bp of selected){
      try{
        const ratio=Math.min(0.3,Math.max(0.02,4800/bp.sourceProfile.triangles));
        const rec=runBake({parent:path.isAbsolute(bp.file)?bp.file:path.join(repoRoot,bp.file),
          ratio,size:128,out:path.join(out,'bake')});
        const verdict=evaluateBake(rec);
        attempts.push({parent:bp.id,sourceSha256:bp.sourceSha256,
          sourceTriangles:bp.sourceProfile.triangles,
          sourceType:bp.sourceProfile.sourceType,ratio,...verdict,
          trianglesHigh:rec.trianglesHigh,trianglesLow:rec.trianglesLow,
          normalDeviation:rec.normalDeviation});
        if(verdict.pass)break;
      }catch(e){
        attempts.push({parent:bp.id,sourceSha256:bp.sourceSha256,pass:false,
          error:String(e.message||e).slice(0,200)});
      }
    }
    session.bake=attempts.length?{...attempts.at(-1),attempts,
      pass:attempts.some(x=>x.pass===true),
      bestPassed:attempts.find(x=>x.pass===true)?.parent||null,
      sourceCandidates:selected.length}:
      {pass:false,reason:selectBakeParents(sourceCandidates,1).length?
        'NO_UNTRIED_HIGH_DETAIL_SOURCE':'NO_APPROVED_STATIC_HIGH_DETAIL_SOURCE',
        sourceCandidates:0,attempts:[]};
    if(!session.bake.pass)session.assetCoverage.bakeShortage=session.bake.reason||
      'SOURCE_DETAIL_NOT_TRANSFERRED_TO_NORMAL_MAP';
  }
  // [리그·관절·모션 실제 원본 검사] 기존 Blender 메쉬 검사기를 CC0 캐릭터 원본에 적용한다.
  // 회차당 하나만 검사하며, 클립 이름만으로 실제 모션 재생·관절곡선 품질을 통과시키지 않는다.
  const actorHistory=previousPractice?.rig?.history||{};
  const actorSources=pickParents(registry,repoRoot,1e9,mulberry32(seed+43))
    .filter(p=>/CHARACTER|CREATURE|NPC|HERO|MONSTER/i.test(p.family)&&
      /\.(?:glb|gltf)$/i.test(p.file))
    // [배움의 균형] 기존 실패·성공을 숨기지 않되, 아직 검사하지 않은 원본부터 하나씩 본다.
    // SHA가 달라진 원본은 이전 성적을 물려받지 않는다.
    .map(p=>{
      const history=actorHistory[p.id]||{};
      const same=!history.sourceSha256||history.sourceSha256===p.approvedSourceSha256;
      const attempts=same&&Number.isSafeInteger(history.attempts)&&history.attempts>=0?
        history.attempts:0;
      return {...p,priorRigAttempts:attempts};
    })
    .sort((a,b)=>a.priorRigAttempts-b.priorRigAttempts||
      String(a.id).localeCompare(String(b.id)));
  if(actorSources.length){
    const actor=actorSources[0];
    const auditFile=path.join(outDir,'rig-source-audit.json');
    const repairFile=path.join(outDir,'rig-repair-candidate.glb');
    const repairAuditFile=path.join(outDir,'rig-candidate-audit.json');
    try{
      // [원본 보존] 후보는 임시 build 경로에서만 만들고 리그/모션을 다시 정적 검증한다.
      const raw=measureRig(path.isAbsolute(actor.file)?actor.file:path.join(repoRoot,actor.file),
        {out:auditFile,candidateOutput:repairFile});
      const verdict=evaluateAudit(raw);
      const clips=motionCoverage((raw.actions||[]).map(x=>x.name));
      const curves=evaluateMotionCurves(raw.actions||[]);
      const dynamicClips=motionCoverage(curves.validClipNames);
      const trial=raw.candidate||{attempted:false,created:false,reason:'NO_CANDIDATE_ATTEMPT'};
      const repairStudy={attempted:trial.attempted===true,created:trial.created===true,
        reason:String(trial.reason||'').slice(0,95),
        removedMesh:String(trial.removedMesh||'').slice(0,90)||null,
        originShiftZ:Number.isFinite(trial.originShiftZ)?trial.originShiftZ:null,
        staticImprovement:false,rigPass:false,motionCurvesPreserved:false,
        nativeRuntimeVerified:false,gameApplied:false,productionPromotionAllowed:false};
      if(repairStudy.created&&fs.existsSync(repairFile)){
        try{
          const candidateRaw=measureRig(repairFile,{out:repairAuditFile});
          const candidateVerdict=evaluateAudit(candidateRaw);
          const candidateCurves=evaluateMotionCurves(candidateRaw.actions||[]);
          repairStudy.rigPass=candidateVerdict.pass;
          repairStudy.candidateFailures=candidateVerdict.failures.slice(0,8);
          repairStudy.movingClips=candidateCurves.validMovingClips;
          repairStudy.motionCurvesPreserved=curves.validMovingClips>0&&
            candidateCurves.validMovingClips>=curves.validMovingClips&&
            candidateCurves.movingBoneCurves>=curves.movingBoneCurves&&
            candidateVerdict.stats.bones===verdict.stats.bones;
          repairStudy.staticImprovement=candidateVerdict.failures.length<verdict.failures.length&&
            repairStudy.motionCurvesPreserved&&candidateVerdict.pass;
        }catch(error){repairStudy.reason='CANDIDATE_AUDIT_FAILED:'+String(error.code||error.name||'ERROR').slice(0,60);}
      }
      session.rigStudy={
        parent:actor.id,family:actor.family,sourceSha256:actor.approvedSourceSha256,
        priorAttempts:actor.priorRigAttempts,eligibleActors:actorSources.length,
        measured:true,rigPass:verdict.pass,bones:verdict.stats.bones,meshParts:verdict.stats.meshes,
        rigFailures:verdict.failures.slice(0,12),
        // [수리 근거] 원본의 분리 메쉬·바닥 최저점만 기록한다. 임의 원점 이동/자동 본 연결 금지.
        rigDiagnosis:verdict.diagnostics,repairStudy,
        // [원본 대조 증거] Blender가 추가한 비원본 뼈 모양은 재사용 원본 품질을 훼손하지 않는다.
        importHelperEvidence:raw.importHelperEvidence||{verified:false,excludedImportOnlyMeshes:[]},
        productionBlockers:verdict.productionBlockers.slice(0,12),
        clipsObserved:(raw.actions||[]).length,clipNameCoverage:clips.coverage,
        clipNamePresent:clips.present,clipNameMissing:clips.missing,
        curveInspectedClips:curves.inspectedClips,validMovingClips:curves.validMovingClips,
        movingBoneCurves:curves.movingBoneCurves,
        invalidOrUnmeasuredClips:curves.invalidOrUnmeasuredClips,
        dynamicClipCoverage:dynamicClips.coverage,
        dynamicClipPresent:dynamicClips.present,dynamicClipMissing:dynamicClips.missing,
        motionCurvesMeasured:curves.curveMeasurementAvailable,
        gameplayMotionVerified:false,nativeRuntimeVerified:false,gameApplied:false
      };
    }catch(error){
      session.rigStudy={parent:actor.id,family:actor.family,
        sourceSha256:actor.approvedSourceSha256,priorAttempts:actor.priorRigAttempts,
        eligibleActors:actorSources.length,measured:false,rigPass:false,
        error:String(error.message||error).slice(0,200),
        motionCurvesMeasured:false,nativeRuntimeVerified:false,gameApplied:false};
    }finally{
      // 파생 GLB는 기존 학습 정책에 따라 수치 증거 추출 후 즉시 파기한다.
      fs.rmSync(auditFile,{force:true});
      fs.rmSync(repairAuditFile,{force:true});
      fs.rmSync(repairFile,{force:true});
    }
  }
  // [아이콘 원본 연습] 실제 승인된 CC0 UI PNG의 64px 가독성을 기존 채점기로 측정한다.
  // 이미지만 분석하며 새 버튼 기능·게임 화면·저장 키를 자동 교체하지 않는다.
  const iconRoot=fs.realpathSync(repoRoot),iconHistory=previousPractice?.icon?.history||{};
  const iconSources=[];
  for(const asset of registry.assets||[]){
    const family=String(asset.family||'').toUpperCase();
    // UI 막대·배경을 아이콘으로 오인하지 않도록 등록부의 명시적 용도명만 인정한다.
    const iconRole=/(?:icon|cursor|arrow|glyph|symbol|badge)/i.test(
      [asset.id,asset.title].filter(x=>typeof x==='string').join(' '));
    if(!/^CC0(?:-1\.0)?$/i.test(String(asset.license||''))||
      !(/ICON|CURSOR/.test(family)||/UI/.test(family)&&iconRole)||
      asset.catalogOnly||asset.securityBlocked||asset.quarantined||
      asset.gameUseForbidden||asset.corruptSource||asset.catalogActive===false||
      asset.parentSourceId||asset.derivedFromAssetId)continue;
    const expected=String(asset.sourceSha256||asset.sourceHash||'').toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(expected))continue;
    for(const file of asset.sourceFiles||[]){
      if(typeof file!=='string'||path.isAbsolute(file)||!/\.png$/i.test(file)||
        file.split(/[\\/]/).some(segment=>segment==='..'||segment==='.'))continue;
      try{
        const full=fs.realpathSync(path.resolve(iconRoot,file));
        if(!full.startsWith(iconRoot+path.sep)||!fs.statSync(full).isFile()||
          fs.statSync(full).size>8*1024*1024)continue;
        if(crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')!==expected)continue;
        const history=iconHistory[String(asset.id)]||{};
        const same=!history.sourceSha256||history.sourceSha256===expected;
        iconSources.push({id:String(asset.id),file:full,sourceSha256:expected,
          priorAttempts:same&&Number.isSafeInteger(history.attempts)&&history.attempts>=0?
            history.attempts:0});
        break;
      }catch{}
    }
  }
  iconSources.sort((a,b)=>a.priorAttempts-b.priorAttempts||a.id.localeCompare(b.id));
  if(iconSources.length){
    const icon=iconSources[0];
    const record={parent:icon.id,sourceSha256:icon.sourceSha256,
      eligibleIcons:iconSources.length,priorAttempts:icon.priorAttempts,
      measured:false,legible:false,pixels64:0,contrast64:0,
      nativeRuntimeVerified:false,gameApplied:false};
    try{
      const result=scoreChild(icon.file,icon.file,path.join(outDir,'icons','approved')).icon;
      if(result&&typeof result.legible==='boolean'){
        record.measured=true;
        record.legible=result.legible===true;
        record.pixels64=Number.isSafeInteger(result.pixels64)?result.pixels64:0;
        record.contrast64=Number.isFinite(result.contrast64)?result.contrast64:0;
        record.reason=String(result.reason||'').slice(0,80);
      }else record.reason='NO_64PX_ICON_MEASUREMENT';
    }catch(error){record.reason='ICON_MEASURE_FAILED:'+String(error.code||error.name||'ERROR').slice(0,40);}
    session.iconStudy=record;
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
  if(session.rigStudy){
    const study=session.rigStudy;
    // 리그와 관절의 가중치·본 검사는 실제 Blender 측정으로만 통과 처리한다.
    for(const name of ['RIG','JOINT']){
      domains[name].trials++;
      if(study.measured&&study.rigPass&&study.bones>0)domains[name].staticMeasured++;
      else domains[name].unverifiedOrFailed++;
    }
    // 클립 이름이 아니라 실제 움직이는 본의 키프레임 곡선이 있는 경우만 정적 측정으로 인정한다.
    // 엔진 내 재생·충돌·공격 판정은 여전히 별도 미검증이다.
    const present=study.dynamicClipPresent||[];
    for(const name of ['MOTION','ACTION']){
      domains[name].trials++;
      const measured=study.motionCurvesMeasured===true&&study.validMovingClips>0&&
        (name==='MOTION'?(present.includes('IDLE')||present.includes('MOVE')):
          present.includes('ATTACK'));
      if(measured)domains[name].staticMeasured++;
      else domains[name].unverifiedOrFailed++;
    }
  }
  for(const name of ['UI','BUTTON']){
    domains[name].trials+=ui.trials;
    domains[name].staticMeasured+=ui.staticPasses;
    domains[name].unverifiedOrFailed+=ui.staticFailures;
  }
  const iconRows=gym.ledger.filter(row=>row.icon&&typeof row.icon.legible==='boolean');
  domains.ICON.trials+=iconRows.length;
  domains.ICON.staticMeasured+=iconRows.filter(row=>row.icon.legible===true).length;
  domains.ICON.unverifiedOrFailed+=iconRows.filter(row=>row.icon.legible!==true).length;
  if(session.iconStudy){
    domains.ICON.trials++;
    if(session.iconStudy.measured&&session.iconStudy.legible)domains.ICON.staticMeasured++;
    else domains.ICON.unverifiedOrFailed++;
  }
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
