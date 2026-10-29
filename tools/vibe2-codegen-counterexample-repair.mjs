// 파일명: tools/vibe2-codegen-counterexample-repair.mjs
// 임포트
import {sourceDigest} from './vibe2-game-source-index.mjs';

// 메인: 기존 생성기·독립 평가기를 호출하는 한정된 반례 탐색. 큐·배포 권한은 없다.
export function runCodegenCounterexampleRepair({generate,evaluate,sourceDigest:sourceSha,
 failures=[],maxAttempts=3,approvedBudget=3}={}){
 const budget=Math.min(5,Math.max(0,Math.floor(maxAttempts)),Math.max(0,Math.floor(approvedBudget)));
 if(typeof generate!=='function'||typeof evaluate!=='function'||!/^[a-f0-9]{64}$/.test(sourceSha)||!budget)
  throw Error('VIBE2_REPAIR_CONTRACT');
 const seen=new Set(),counterexamples=[],attempts=[];
 for(const failure of failures){
  if(failure.sourceDigest!==sourceSha||failure.reproduced!==true||!failure.failureSignature||
   !Array.isArray(failure.responsibleSymbols)||failure.responsibleSymbols.length<1||failure.responsibleSymbols.length>2)
   return {status:'BLOCKED',reason:'UNVERIFIED_COUNTEREXAMPLE',attempts,sourceWrite:false,runtimeVerified:false};
  if(failure.patchFingerprint)seen.add(failure.patchFingerprint);
  counterexamples.push(failure);
 }
 for(let attempt=0;attempt<budget;attempt++){
  const candidate=generate({attempt,counterexamples:[...counterexamples]});
  if(!candidate?.edits?.length)return {status:'BLOCKED',reason:'NO_SOURCE_DELTA',attempts,sourceWrite:false,runtimeVerified:false};
  const fingerprint=sourceDigest(JSON.stringify(candidate.edits));
  if(seen.has(fingerprint))return {status:'BLOCKED',reason:'REPEATED_PATCH_FINGERPRINT',attempts,sourceWrite:false,runtimeVerified:false};
  seen.add(fingerprint);
  const result=evaluate(candidate,{attempt,counterexamples:[...counterexamples]});
  if(result&&typeof result.then==='function')throw Error('VIBE2_REPAIR_SYNCHRONOUS_ORACLE_REQUIRED');
  attempts.push({attempt:attempt+1,fingerprint,pass:result?.pass===true});
  if(result?.pass===true)return {status:'CANDIDATE_VALIDATED',candidate,attempts,counterexamples,
   actualGamePlaytest:result.actualGamePlaytest===true,sourceWrite:false,runtimeVerified:false};
  if(result?.reproduced!==true||!result.failureSignature||!Array.isArray(result.responsibleSymbols)||
    result.responsibleSymbols.length<1||result.responsibleSymbols.length>2)
   return {status:'BLOCKED',reason:'UNREPRODUCED_OR_UNSCOPED_FAILURE',attempts,sourceWrite:false,runtimeVerified:false};
  counterexamples.push({...result,sourceDigest:sourceSha,patchFingerprint:fingerprint});
 }
 return {status:'BLOCKED',reason:'REPAIR_BUDGET_EXHAUSTED',attempts,counterexamples,sourceWrite:false,runtimeVerified:false};
}
