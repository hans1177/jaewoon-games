// 역할: 독립 QA를 통과한 자율개발 5개 부서 결과만 department-experience.json의 구조화 학습 메모리에 누적하고 다음 플로어에서 역할별로 재사용한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CORE_DEPARTMENT_ROLES=Object.freeze(['planning','development','graphics','qa','balance']);
const DECISIONS=new Set(['PROCEED','ADJUST','BLOCK']);
const OUTCOMES=new Set(['SUCCESS','FAILURE']);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const unique=(values=[])=>[...new Set((Array.isArray(values)?values:[]).map(clean).filter(Boolean))];
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const compactList=(values,max=4)=>unique(values).slice(0,max);

export function normalizeVerifiedDepartmentLearning(evidence={}){
  if(evidence?.verified!==true||clean(evidence?.independentQa).toUpperCase()!=='PASS')return [];
  if(clean(evidence?.type).toUpperCase()!=='VIBE2')return [];
  const outcome=clean(evidence?.outcome).toUpperCase();
  if(!OUTCOMES.has(outcome))return [];
  const learning=evidence?.departmentLearning;
  if(!learning||clean(learning.gate).toUpperCase()!=='PASS'||!Array.isArray(learning.results))return [];
  const sourceEvidenceId=clean(evidence.id);
  const sourceRevision=clean(evidence.sourceRevision);
  if(!sourceEvidenceId||!sourceRevision)return [];
  const gameId=clean(learning.gameId||evidence.gameId);
  const gameSlug=clean(learning.gameSlug);
  const sourcePath=clean(learning.sourcePath);
  const candidateId=clean(learning.candidateId);
  const workLane=clean(learning.workLane).toUpperCase()||'FULL';
  const finalDecision=clean(learning.finalDecision).toUpperCase();
  const recordedAt=clean(evidence.verifiedAt)||new Date().toISOString();
  const byRole=new Map(learning.results.map(row=>[clean(row?.role),row]));
  const rows=[];
  for(const role of CORE_DEPARTMENT_ROLES){
    const result=byRole.get(role);
    if(!result||result.skippedFast===true)continue;
    const decision=clean(result.decision).toUpperCase();
    if(clean(result.workState).toUpperCase()!=='DONE'||!DECISIONS.has(decision))continue;
    const summary=clean(result.summary),nextAction=clean(result.nextAction);
    if(!summary&&!nextAction)continue;
    rows.push({
      id:`${sourceEvidenceId}:${role}`,
      sourceEvidenceId,
      role,
      gameId,
      gameSlug:gameSlug||null,
      sourcePath:sourcePath||null,
      candidateId:candidateId||null,
      sourceRevision,
      outcome,
      decision,
      finalDecision:finalDecision||null,
      workLane,
      summary:summary||null,
      nextAction:nextAction||null,
      checks:compactList(result.checks),
      risks:compactList(result.risks),
      verified:true,
      independentQa:'PASS',
      verifiedAt:recordedAt,
      recordedAt
    });
  }
  return rows;
}

export function ingestVerifiedDepartmentEvidence(ledger,evidence,{maxEntries=500}={}){
  if(!ledger||typeof ledger!=='object')throw new Error('department experience ledger required');
  ledger.verifiedLearning=Array.isArray(ledger.verifiedLearning)?ledger.verifiedLearning:[];
  const rows=normalizeVerifiedDepartmentLearning(evidence);
  const ids=new Set(ledger.verifiedLearning.map(row=>clean(row?.id)).filter(Boolean));
  let added=0;
  for(const row of rows){
    if(ids.has(row.id))continue;
    ledger.verifiedLearning.push(row);ids.add(row.id);added++;
  }
  if(ledger.verifiedLearning.length>maxEntries)ledger.verifiedLearning=ledger.verifiedLearning.slice(-maxEntries);
  if(added>0)ledger.updatedAt=new Date().toISOString().slice(0,10);
  return {added,candidates:rows.length,total:ledger.verifiedLearning.length};
}

export function ingestVerifiedDepartmentEvidenceDirectory(ledger,dir='company-learning/evidence'){
  if(!fs.existsSync(dir))return {files:0,added:0,rejected:[]};
  const files=fs.readdirSync(dir).filter(file=>file.endsWith('.json')).sort();
  let added=0;const rejected=[];
  for(const file of files){
    try{
      const raw=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
      const rows=Array.isArray(raw)?raw:raw?.items??[raw];
      for(const evidence of rows)added+=ingestVerifiedDepartmentEvidence(ledger,evidence).added;
    }catch(error){rejected.push({file,error:clean(error?.message||error)});}
  }
  return {files:files.length,added,rejected};
}

export function selectVerifiedDepartmentLearning(ledger={},context={},max=4){
  const role=clean(context.role);
  if(!CORE_DEPARTMENT_ROLES.includes(role))return [];
  const gameId=clean(context.gameId),gameSlug=clean(context.gameSlug),sourcePath=clean(context.sourcePath),workLane=clean(context.workLane).toUpperCase();
  const rows=(Array.isArray(ledger?.verifiedLearning)?ledger.verifiedLearning:[])
    .filter(row=>row?.verified===true&&clean(row?.independentQa).toUpperCase()==='PASS'&&clean(row?.role)===role)
    .map(row=>{
      let relevance=0;
      if(sourcePath&&clean(row.sourcePath)===sourcePath)relevance+=8;
      if(gameId&&clean(row.gameId)===gameId)relevance+=5;
      if(gameSlug&&clean(row.gameSlug)===gameSlug)relevance+=5;
      if(workLane&&clean(row.workLane).toUpperCase()===workLane)relevance+=2;
      if(clean(row.outcome).toUpperCase()==='FAILURE')relevance+=1;
      return {row,relevance};
    })
    .sort((a,b)=>b.relevance-a.relevance||String(b.row.verifiedAt||b.row.recordedAt||'').localeCompare(String(a.row.verifiedAt||a.row.recordedAt||'')))
    .slice(0,Math.max(0,finite(max,4)))
    .map(({row,relevance})=>({
      role,
      gameId:row.gameId||null,
      gameSlug:row.gameSlug||null,
      sourcePath:row.sourcePath||null,
      outcome:row.outcome,
      decision:row.decision,
      workLane:row.workLane,
      summary:row.summary||null,
      nextAction:row.nextAction||null,
      checks:compactList(row.checks),
      risks:compactList(row.risks),
      sourceRevision:row.sourceRevision,
      sourceEvidenceId:row.sourceEvidenceId,
      verifiedAt:row.verifiedAt||row.recordedAt||null,
      relevance
    }));
  return rows;
}

function arg(name,fallback=''){
  const prefix=`--${name}=`;
  return process.argv.slice(2).find(value=>value.startsWith(prefix))?.slice(prefix.length)??fallback;
}

function main(){
  const ledgerPath=arg('ledger','department-experience.json');
  const evidenceDir=arg('evidence-dir','company-learning/evidence');
  const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
  const beforeDepartments=JSON.stringify(ledger.departments??{});
  const beforeHistory=JSON.stringify(ledger.history??[]);
  const result=ingestVerifiedDepartmentEvidenceDirectory(ledger,evidenceDir);
  if(JSON.stringify(ledger.departments??{})!==beforeDepartments||JSON.stringify(ledger.history??[])!==beforeHistory)throw new Error('structured learning must not mutate XP/history authority');
  fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
  console.log(JSON.stringify({...result,ledger:ledgerPath,verifiedLearning:ledger.verifiedLearning?.length??0,xpMutation:false},null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error?.stack||error);process.exitCode=1;}
}
