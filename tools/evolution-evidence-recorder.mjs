import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CORE_DEPARTMENT_ROLES } from './department-learning-memory.mjs';

const TYPES=new Set(['MOTION','GRAPHICS','VIBE2','BUDGET','QA','GAMEPLAY']);
const OUTCOMES=new Set(['SUCCESS','FAILURE']);
const clean=v=>String(v??'').trim();
const unique=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const compactText=v=>String(v??'').replace(/\s+/g,' ').trim();
const compactList=(v,max=4)=>unique(Array.isArray(v)?v:[]).slice(0,max);

export function extractDepartmentLearningFromEvidenceRefs(evidenceRefs=[]){
  for(const ref of unique(evidenceRefs)){
    if(!fs.existsSync(ref))continue;
    try{
      const source=JSON.parse(fs.readFileSync(ref,'utf8'));
      const cycle=source?.departmentCycle;
      if(source?.departmentCycleGate!=='PASS'||!cycle||!Array.isArray(cycle.results))continue;
      const byRole=new Map(cycle.results.map(row=>[clean(row?.role),row]));
      if(!CORE_DEPARTMENT_ROLES.every(role=>byRole.get(role)?.workState==='DONE'))continue;
      return {
        version:1,
        gate:'PASS',
        candidateId:clean(source.candidateId||cycle.candidateId)||null,
        gameId:clean(source.gameId||cycle.gameId)||null,
        gameSlug:clean(source.gameSlug||cycle.gameSlug)||null,
        sourcePath:clean(source.sourcePath||cycle.sourcePath)||null,
        workLane:clean(cycle.workLane).toUpperCase()||'FULL',
        finalDecision:clean(cycle.finalDecision).toUpperCase()||null,
        results:CORE_DEPARTMENT_ROLES.map(role=>{
          const row=byRole.get(role);
          return {
            role,
            workState:'DONE',
            decision:clean(row.decision).toUpperCase(),
            summary:compactText(row.summary)||null,
            nextAction:compactText(row.nextAction)||null,
            checks:compactList(row.checks),
            risks:compactList(row.risks),
            skippedFast:row.skippedFast===true
          };
        })
      };
    }catch{
      // Evidence refs may also be labels rather than JSON files. Ignore unreadable refs.
    }
  }
  return null;
}

export function buildEvolutionEvidence(input={}){
  const type=clean(input.type).toUpperCase(),outcome=clean(input.outcome).toUpperCase();
  if(!TYPES.has(type))throw new Error(`evidence type 오류: ${type}`);
  if(!OUTCOMES.has(outcome))throw new Error(`evidence outcome 오류: ${outcome}`);
  if(!clean(input.id)||!clean(input.patternId)||!clean(input.gameId)||!clean(input.sourceRevision))throw new Error('id/patternId/gameId/sourceRevision 필요');
  if(input.independentQaPass!==true)throw new Error('독립 QA 통과 증거 필요');
  const evidence=unique(input.evidence);if(!evidence.length)throw new Error('근거 파일/검사 필요');
  const blockers=unique(input.blockers);
  if(outcome==='SUCCESS'&&blockers.length)throw new Error('SUCCESS에는 blocker가 없어야 함');
  const row={
    id:clean(input.id),type,patternId:clean(input.patternId),title:clean(input.title)||clean(input.patternId),
    gameId:clean(input.gameId),genre:clean(input.genre)||'UNKNOWN',conditionKey:clean(input.conditionKey)||'UNKNOWN',
    outcome,delta:finite(input.delta),blockers,verified:true,sourceRevision:clean(input.sourceRevision),evidence,
    verifiedAt:input.verifiedAt||new Date().toISOString(),independentQa:'PASS',publicRelease:false,selfPromote:false,
  };
  if(type==='VIBE2'&&input.departmentLearning?.gate==='PASS')row.departmentLearning=input.departmentLearning;
  return row;
}

export function writeEvolutionEvidence(file,input){
  const departmentLearning=input?.departmentLearning??extractDepartmentLearningFromEvidenceRefs(input?.evidence);
  const row=buildEvolutionEvidence({...input,departmentLearning});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(row,null,2)+'\n');return row;
}

function arg(name){const p=`--${name}=`;return process.argv.slice(2).find(v=>v.startsWith(p))?.slice(p.length)??null;}
function main(){
  const output=arg('output');if(!output)throw new Error('--output 필요');
  const row=writeEvolutionEvidence(output,{
    id:arg('id'),type:arg('type'),patternId:arg('pattern-id'),title:arg('title'),gameId:arg('game-id'),genre:arg('genre'),conditionKey:arg('condition'),
    outcome:arg('outcome'),delta:arg('delta'),sourceRevision:arg('source-revision'),independentQaPass:arg('independent-qa')==='PASS',
    blockers:(arg('blockers')||'').split(',').filter(Boolean),evidence:(arg('evidence')||'').split(',').filter(Boolean),
  });
  console.log(JSON.stringify(row,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
