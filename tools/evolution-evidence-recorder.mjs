import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES=new Set(['MOTION','GRAPHICS','VIBE2','BUDGET','QA','GAMEPLAY']);
const OUTCOMES=new Set(['SUCCESS','FAILURE']);
const clean=v=>String(v??'').trim();
const unique=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

export function buildEvolutionEvidence(input={}){
  const type=clean(input.type).toUpperCase(),outcome=clean(input.outcome).toUpperCase();
  if(!TYPES.has(type))throw new Error(`evidence type 오류: ${type}`);
  if(!OUTCOMES.has(outcome))throw new Error(`evidence outcome 오류: ${outcome}`);
  if(!clean(input.id)||!clean(input.patternId)||!clean(input.gameId)||!clean(input.sourceRevision))throw new Error('id/patternId/gameId/sourceRevision 필요');
  if(input.independentQaPass!==true)throw new Error('독립 QA 통과 증거 필요');
  const evidence=unique(input.evidence);if(!evidence.length)throw new Error('근거 파일/검사 필요');
  const blockers=unique(input.blockers);
  if(outcome==='SUCCESS'&&blockers.length)throw new Error('SUCCESS에는 blocker가 없어야 함');
  return{
    id:clean(input.id),type,patternId:clean(input.patternId),title:clean(input.title)||clean(input.patternId),
    gameId:clean(input.gameId),genre:clean(input.genre)||'UNKNOWN',conditionKey:clean(input.conditionKey)||'UNKNOWN',
    outcome,delta:finite(input.delta),blockers,verified:true,sourceRevision:clean(input.sourceRevision),evidence,
    verifiedAt:input.verifiedAt||new Date().toISOString(),independentQa:'PASS',publicRelease:false,selfPromote:false,
  };
}

export function writeEvolutionEvidence(file,input){
  const row=buildEvolutionEvidence(input);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(row,null,2)+'\n');return row;
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
