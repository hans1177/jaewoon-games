// 파일명: tools/development-baseline-evidence.mjs
// 역할: 중앙 company-baseline-gate가 기록한 Development Baseline 결과를 읽기 전용으로 검증한다.
import fs from 'node:fs';
import path from 'node:path';

const clean=value=>String(value??'').trim();
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};

export function latestDevelopmentBaselineEvidence(gameId,{repoRoot=process.cwd()}={}){
  const id=clean(gameId);
  const root=path.join(repoRoot,'design',id);
  const missing={ready:false,reason:'DEVELOPMENT_BASELINE_REQUIRED',source:null,gate:null};
  if(!id||!fs.existsSync(root))return missing;
  let dates=[];
  try{
    dates=fs.readdirSync(root,{withFileTypes:true})
      .filter(entry=>entry.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .map(entry=>entry.name).sort().reverse();
  }catch{return missing;}
  for(const date of dates){
    const file=path.join(root,date,'cycle-status.json');
    const status=readJson(file);
    const gate=status?.baselineGate;
    if(!gate||gate.policyDocument!=='COMPANY_FLOW.md'||gate.state!=='DEVELOPMENT_BASELINE_READY'||gate.ready!==true)continue;
    const evidence=gate.evidence||{};
    if(evidence.webGameplay?.pass!==true||evidence.unityProject?.present!==true||evidence.unityTechnical?.pass!==true)continue;
    return {ready:true,reason:'DEVELOPMENT_BASELINE_READY',source:path.relative(repoRoot,file).replaceAll('\\','/'),gate};
  }
  return missing;
}
