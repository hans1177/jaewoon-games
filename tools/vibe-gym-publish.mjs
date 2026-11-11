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

// [연습 → 보관] 조리법과 작은 아이콘 실측값을 기존 전용 브랜치 장부에 남긴다.
// 원본 CC0 해시만으로 재현 가능한 후보이며, 실제 게임 적용/마스터리 통과는 증명하지 않는다.
export function summarize(ledger){
  return ledger.map(r=>JSON.stringify({
    id:r.id,parentId:r.parentId,parentSha256:r.parentSha256,
    partParent:r.partParent?{id:r.partParent.id,sha256:r.partParent.sha256,license:r.partParent.license}:undefined,
    source:r.source,license:r.license,family:r.family,
    op:r.op,arm:r.arm,params:r.params,
    score:r.score,gain:r.gain,novelty:r.novelty,verdict:r.verdict,reason:r.reason,
    keep:r.keep===true,
    audit:r.audit?{pass:r.audit.pass,productionEligible:r.audit.productionEligible,failures:r.audit.failures,blockers:r.audit.blockers}:undefined,
    motion:r.motion?{present:r.motion.present,missing:r.motion.missing,coverage:r.motion.coverage,nativeRuntimeVerified:false}:undefined,
    icon:r.icon?{legible:r.icon.legible,pixels64:r.icon.pixels64,contrast64:r.icon.contrast64}:undefined,
    glbSha256:r.glbSha256,
    previewArtifact:process.env.GITHUB_RUN_ID?`variation-gym-${process.env.GITHUB_RUN_ID}`:undefined,
    registered:false,gameApplied:false,at:new Date().toISOString()
  })).join('\n')+'\n';
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
    // [분류 연습 보관] 기존 전용 데이터 브랜치에 숫자형 분야 성적만 스냅샷으로 남긴다.
    // 연습 세션이 없는 외부 호출은 기존 동작 그대로 유지한다. 파일/GLB·미검증 자산은 저장하지 않는다.
    const root=path.resolve(cwd),ledgerDir=path.dirname(path.resolve(root,ledger));
    const sessionFile=path.resolve(ledgerDir,'..','session.json');
    if(sessionFile.startsWith(root+path.sep)&&fs.existsSync(sessionFile)){
      const session=JSON.parse(fs.readFileSync(sessionFile,'utf8'));
      const cleanCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
      const domains=Object.fromEntries(Object.entries(session.practiceDomains||{})
        .filter(([name,record])=>/^[A-Z_]{2,24}$/.test(name)&&record&&typeof record==='object')
        .slice(0,32).map(([name,record])=>[name,{
          catalogued:cleanCount(record.catalogued),eligible3d:cleanCount(record.eligible3d),
          trials:cleanCount(record.trials),staticMeasured:cleanCount(record.staticMeasured),
          unverifiedOrFailed:cleanCount(record.unverifiedOrFailed),
          state:String(record.state||'UNVERIFIED').slice(0,50),
          runtimeVerified:false,gameApplied:false
        }]));
      if(Object.keys(domains).length){
        const previousPath=path.join(wt,'practice-domains.json');
        let previous={};try{previous=JSON.parse(fs.readFileSync(previousPath,'utf8'))}catch{}
        const cumulative={};
        for(const [name,record] of Object.entries(domains)){
          const prior=previous.cumulative?.[name]||{};
          cumulative[name]={
            trials:cleanCount(prior.trials)+record.trials,
            staticMeasured:cleanCount(prior.staticMeasured)+record.staticMeasured,
            unverifiedOrFailed:cleanCount(prior.unverifiedOrFailed)+record.unverifiedOrFailed
          };
        }
        // [노멀맵 재연습 장부] 승인된 부모 ID별 통과·실패 실측만 제한해서 누적한다.
        // 미시도 원본을 우선하게 만드는 동일 데이터 브랜치 기록이며 게임 자산이 아니다.
        const history=Object.fromEntries(Object.entries(previous.bake?.history||{})
          .filter(([id,r])=>/^[\w:./-]{1,140}$/.test(id)&&r&&typeof r==='object')
          .slice(-128).map(([id,r])=>[id,{
            sourceSha256:/^[a-f0-9]{64}$/.test(r.sourceSha256||'')?r.sourceSha256:null,
            attempts:cleanCount(r.attempts),failures:cleanCount(r.failures),
            passes:cleanCount(r.passes),
            bestNormalDeviation:Number.isFinite(r.bestNormalDeviation)?
              Math.max(0,Math.min(2,r.bestNormalDeviation)):0,
            lastSession:String(r.lastSession||'').slice(0,40)
          }]));
        // [기존 기록 이행] 과거 SHA 없는 실패 이력은 중앙 원본 해시로 식별한다.
        // 다음에 승인된 원본 SHA가 바뀌면 이전 실패를 새 원본에 전가하지 않는다.
        try{
          const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
          for(const asset of registry.assets||[]){
            const id=String(asset.id||''),r=history[id];
            const sha=String(asset.sourceSha256||asset.sourceHash||'').toLowerCase();
            if(r&&!r.sourceSha256&&/^[a-f0-9]{64}$/.test(sha)&&
              /^CC0(?:-1\.0)?$/i.test(String(asset.license||'')))r.sourceSha256=sha;
          }
        }catch{}
        const bakeAttempts=[];
        for(const row of (session.bake?.attempts||[]).slice(0,3)){
          const id=String(row?.parent||'');
          if(!/^[\w:./-]{1,140}$/.test(id))continue;
          const sourceSha256=/^[a-f0-9]{64}$/.test(row.sourceSha256||'')?row.sourceSha256:null;
          const stored=history[id];
          const prior=stored?.sourceSha256&&sourceSha256&&stored.sourceSha256!==sourceSha256?
            {attempts:0,failures:0,passes:0,bestNormalDeviation:0}:stored||
            {attempts:0,failures:0,passes:0,bestNormalDeviation:0};
          const dev=Number.isFinite(row.normalDeviation)&&row.normalDeviation>=0?
            Math.min(2,row.normalDeviation):null;
          history[id]={
            sourceSha256:sourceSha256||prior.sourceSha256||null,
            attempts:cleanCount(prior.attempts)+1,
            failures:cleanCount(prior.failures)+(row.pass===true?0:1),
            passes:cleanCount(prior.passes)+(row.pass===true?1:0),
            bestNormalDeviation:Math.max(Number(prior.bestNormalDeviation)||0,dev||0),
            lastSession:String(session.at||'').slice(0,40)
          };
          bakeAttempts.push({id,sourceSha256,pass:row.pass===true,
            trianglesHigh:cleanCount(row.trianglesHigh),
            trianglesLow:cleanCount(row.trianglesLow),
            normalDeviation:dev,
            failure:String((row.failures||[]).join(',')||row.error||'').slice(0,100)});
        }
        const retainedHistory=Object.fromEntries(Object.entries(history)
          .sort((a,b)=>b[1].lastSession.localeCompare(a[1].lastSession)||
            b[1].attempts-a[1].attempts||a[0].localeCompare(b[0])).slice(0,128));
        // [리그 실패 도감] 블렌더로 실제 검사한 CC0 원본만 기록한다.
        // 검증되지 않은 모션·런타임은 승격하지 않는다. 기록은 최대 64개, 소수 필드만 보관한다.
        const rigHistory=Object.fromEntries(Object.entries(previous.rig?.history||{})
          .filter(([id,row])=>/^[\w:./-]{1,140}$/.test(id)&&row&&typeof row==='object')
          .slice(-64).map(([id,row])=>[id,{
            sourceSha256:/^[a-f0-9]{64}$/.test(row.sourceSha256||'')?row.sourceSha256:null,
            attempts:cleanCount(row.attempts),passed:cleanCount(row.passed),
            failed:cleanCount(row.failed),measured:cleanCount(row.measured),
            bones:cleanCount(row.bones),meshParts:cleanCount(row.meshParts),
            clipNamesObserved:cleanCount(row.clipNamesObserved),
            curveInspectedClips:cleanCount(row.curveInspectedClips),
            validMovingClips:cleanCount(row.validMovingClips),
            movingBoneCurves:cleanCount(row.movingBoneCurves),
            lastLowestMesh:String(row.lastLowestMesh||'').slice(0,90),
            lastBoundGroundOffsetRatio:Number.isFinite(row.lastBoundGroundOffsetRatio)?row.lastBoundGroundOffsetRatio:null,
            lastFailures:Array.isArray(row.lastFailures)?
              row.lastFailures.slice(0,8).map(x=>String(x).slice(0,100)):[],
            lastSession:String(row.lastSession||'').slice(0,40)
          }]));
        let latestRig={measured:false,rigPass:false,reason:'NO_SOURCE_STUDY'};
        const study=session.rigStudy;
        if(study&&/^[\w:./-]{1,140}$/.test(String(study.parent||''))){
          const id=String(study.parent);
          const sha=/^[a-f0-9]{64}$/.test(study.sourceSha256||'')?study.sourceSha256:null;
          const stored=rigHistory[id]||{};
          const same=!stored.sourceSha256||stored.sourceSha256===sha;
          const old=same?stored:{};
          const failureNames=Array.isArray(study.rigFailures)?study.rigFailures:[];
          const faults=failureNames.slice(0,8).map(x=>String(x).slice(0,100));
          if(study.error)faults.push(String(study.error).slice(0,100));
          const measured=study.measured===true;
          const passed=measured&&study.rigPass===true&&cleanCount(study.bones)>0;
          latestRig={
            id,sourceSha256:sha,measured,rigPass:passed,
            bones:cleanCount(study.bones),meshParts:cleanCount(study.meshParts),
            clipNamesObserved:cleanCount(study.clipsObserved),
            clipNameCoverage:Number.isFinite(study.clipNameCoverage)?
              Math.max(0,Math.min(1,study.clipNameCoverage)):0,
            curveInspectedClips:cleanCount(study.curveInspectedClips),
            validMovingClips:cleanCount(study.validMovingClips),
            movingBoneCurves:cleanCount(study.movingBoneCurves),
            dynamicClipCoverage:Number.isFinite(study.dynamicClipCoverage)?
              Math.max(0,Math.min(1,study.dynamicClipCoverage)):0,
            dynamicClipPresent:(Array.isArray(study.dynamicClipPresent)?
              study.dynamicClipPresent:[]).filter(x=>
                ['IDLE','MOVE','ATTACK','HIT','DEATH'].includes(x)).slice(0,5),
            failures:faults.slice(0,8),
            // [최신 리그 원인] 최저점과 본 연결 최저점의 차이만 보존. 불합격 자산 승격 없음.
            groundEvidence:{
              lowestMesh:String(study.rigDiagnosis?.lowestMesh||'').slice(0,90)||null,
              lowestMeshMinZ:Number.isFinite(study.rigDiagnosis?.lowestMeshMinZ)?study.rigDiagnosis.lowestMeshMinZ:null,
              lowestBoundMesh:String(study.rigDiagnosis?.lowestBoundMesh||'').slice(0,90)||null,
              boundGroundOffsetRatio:Number.isFinite(study.rigDiagnosis?.boundGroundOffsetRatio)?study.rigDiagnosis.boundGroundOffsetRatio:null,
              orphansBelowBound:Array.isArray(study.rigDiagnosis?.orphanMeshesBelowBoundGround)?study.rigDiagnosis.orphanMeshesBelowBoundGround.slice(0,8).map(x=>String(x).slice(0,90)):[]
            },
            motionCurvesMeasured:study.motionCurvesMeasured===true&&
              cleanCount(study.curveInspectedClips)>0,
            nativeRuntimeVerified:false,gameApplied:false
          };
          rigHistory[id]={
            sourceSha256:sha,attempts:cleanCount(old.attempts)+1,
            passed:cleanCount(old.passed)+(passed?1:0),
            failed:cleanCount(old.failed)+(passed?0:1),
            measured:cleanCount(old.measured)+(measured?1:0),
            bones:latestRig.bones,meshParts:latestRig.meshParts,
            clipNamesObserved:latestRig.clipNamesObserved,
            curveInspectedClips:latestRig.curveInspectedClips,
            validMovingClips:latestRig.validMovingClips,
            movingBoneCurves:latestRig.movingBoneCurves,
            lastLowestMesh:latestRig.groundEvidence.lowestMesh||'',
            lastBoundGroundOffsetRatio:latestRig.groundEvidence.boundGroundOffsetRatio,
            lastFailures:latestRig.failures,lastSession:String(session.at||'').slice(0,40)
          };
        }
        const retainedRigHistory=Object.fromEntries(Object.entries(rigHistory)
          .sort((a,b)=>b[1].lastSession.localeCompare(a[1].lastSession)||
            b[1].attempts-a[1].attempts||a[0].localeCompare(b[0])).slice(0,64));
        // [2.5D 아이콘 실측 도감] CC0 원본 PNG를 64px로 본 결과만 학습 브랜치에 누적한다.
        // 픽셀/대비 수치 및 원본 해시만 남기며 PNG·게임 적용을 보관하지 않는다.
        const iconHistory=Object.fromEntries(Object.entries(previous.icon?.history||{})
          .filter(([id,r])=>/^[\w:./-]{1,140}$/.test(id)&&r&&typeof r==='object')
          .slice(-64).map(([id,r])=>[id,{
            sourceSha256:/^[a-f0-9]{64}$/.test(r.sourceSha256||'')?r.sourceSha256:null,
            attempts:cleanCount(r.attempts),measured:cleanCount(r.measured),
            passed:cleanCount(r.passed),rejected:cleanCount(r.rejected),
            pixels64:cleanCount(r.pixels64),
            contrast64:Number.isFinite(r.contrast64)?Math.max(0,Math.min(1,r.contrast64)):0,
            lastSession:String(r.lastSession||'').slice(0,40)
          }]));
        let latestIcon={measured:false,legible:false,reason:'NO_APPROVED_ICON_STUDY'};
        const iconStudy=session.iconStudy;
        if(iconStudy&&/^[\w:./-]{1,140}$/.test(String(iconStudy.parent||''))){
          const id=String(iconStudy.parent);
          const sha=/^[a-f0-9]{64}$/.test(iconStudy.sourceSha256||'')?
            iconStudy.sourceSha256:null;
          const old=iconHistory[id]||{};
          const prior=old.sourceSha256&&sha&&old.sourceSha256!==sha?{}:old;
          const pixels64=cleanCount(iconStudy.pixels64);
          const contrast64=Number.isFinite(iconStudy.contrast64)?
            Math.max(0,Math.min(1,iconStudy.contrast64)):0;
          const measured=iconStudy.measured===true;
          const legible=measured&&iconStudy.legible===true&&pixels64>=220&&contrast64>=0.09;
          latestIcon={id,sourceSha256:sha,measured,legible,pixels64,contrast64,
            reason:String(iconStudy.reason||'').slice(0,80),
            nativeRuntimeVerified:false,gameApplied:false};
          iconHistory[id]={sourceSha256:sha,
            attempts:cleanCount(prior.attempts)+1,
            measured:cleanCount(prior.measured)+(measured?1:0),
            passed:cleanCount(prior.passed)+(legible?1:0),
            rejected:cleanCount(prior.rejected)+(legible?0:1),
            pixels64,contrast64,lastSession:String(session.at||'').slice(0,40)};
        }
        const retainedIconHistory=Object.fromEntries(Object.entries(iconHistory)
          .sort((a,b)=>b[1].lastSession.localeCompare(a[1].lastSession)||
            b[1].attempts-a[1].attempts||a[0].localeCompare(b[0])).slice(0,64));
        const coverage={version:1,
          sessions:cleanCount(previous.sessions)+1,
          lastSessionAt:String(session.at||'').slice(0,40),
          registryAssets:cleanCount(session.assetCoverage?.registryAssets),
          cataloguedAssets:cleanCount(session.assetCoverage?.cataloguedAssets),
          eligible3dAssets:cleanCount(session.assetCoverage?.eligible3dAssets),
          domains,cumulative,
          bake:{pass:session.bake?.pass===true,reason:String(session.bake?.reason||
            (session.bake?.pass?'':'SOURCE_DETAIL_NOT_TRANSFERRED_TO_NORMAL_MAP')).slice(0,90),
            attempts:bakeAttempts,history:retainedHistory},
          rig:{latest:latestRig,history:retainedRigHistory},
          icon:{latest:latestIcon,history:retainedIconHistory},
          trainingAndDesignOnly:true,nativeRuntimeVerified:false,gameApplied:false,
          productionPromotionAllowed:false};
        fs.writeFileSync(previousPath,JSON.stringify(coverage,null,1)+'\n');
        add.push('practice-domains.json');
      }
    }
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
