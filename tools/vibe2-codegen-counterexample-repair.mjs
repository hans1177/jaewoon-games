// 파일명: tools/vibe2-codegen-counterexample-repair.mjs
// 임포트
import {sourceDigest} from './vibe2-game-source-index.mjs';

// 메인: 기존 생성기·독립 평가기를 호출하는 한정된 반례 탐색. 큐·배포 권한은 없다.
export function runCodegenCounterexampleRepair({generate,evaluate,sourceDigest:sourceSha,
 failures=[],allowedPaths=[],maxAttempts=3,approvedBudget=3}={}){
 const budget=Number.isSafeInteger(maxAttempts)&&Number.isSafeInteger(approvedBudget)&&
  maxAttempts>0&&approvedBudget>0?Math.min(5,maxAttempts,approvedBudget):0;
 if(typeof generate!=='function'||typeof evaluate!=='function'||!/^[a-f0-9]{64}$/.test(sourceSha)||!budget||
  !Array.isArray(allowedPaths)||allowedPaths.some(path=>typeof path!=='string'||!path))
  throw Error('VIBE2_REPAIR_CONTRACT');
 const owners=new Set(allowedPaths);
 const seen=new Set(),counterexamples=[],attempts=[];
 let skippedDuplicate=false;
 for(const failure of failures){
  if(failure.sourceDigest!==sourceSha||failure.reproduced!==true||!failure.failureSignature||
   !Array.isArray(failure.responsibleSymbols)||failure.responsibleSymbols.length<1||failure.responsibleSymbols.length>2)
   return {status:'BLOCKED',reason:'UNVERIFIED_COUNTEREXAMPLE',attempts,sourceWrite:false,runtimeVerified:false};
  if(failure.patchFingerprint)seen.add(failure.patchFingerprint);
  counterexamples.push(failure);
 }
 for(let attempt=0;attempt<budget;attempt++){
  const candidate=generate({attempt,counterexamples:[...counterexamples]});
  if(!Array.isArray(candidate?.edits)||!candidate.edits.length)return {status:'BLOCKED',reason:'NO_SOURCE_DELTA',attempts,sourceWrite:false,runtimeVerified:false};
  // [보호] 반례 수정기는 기존 책임 파일만 편집한다. 숨겨진 새 파일·전체 파일 교체는 허용하지 않는다.
  if((candidate.newFiles!==undefined&&(!Array.isArray(candidate.newFiles)||candidate.newFiles.length))||
    (candidate.replaceFiles!==undefined&&(!Array.isArray(candidate.replaceFiles)||candidate.replaceFiles.length)))
   return {status:'BLOCKED',reason:'UNAPPROVED_REPAIR_FILE_CHANGE',attempts,sourceWrite:false,runtimeVerified:false};
  // [메인] 독립 편집은 필드·배열 순서가 달라도 같은 실패로 묶는다.
  // 앞 편집이 뒤 앵커를 만드는 의존 편집은 적용 순서를 보존한다.
  const edits=candidate.edits.map(edit=>[edit?.path,edit?.find,edit?.replace]);
  if(edits.some(row=>row.some(value=>typeof value!=='string')||!row[0]||!row[1]||row[1]===row[2]))
   return {status:'BLOCKED',reason:'INVALID_SOURCE_DELTA',attempts,sourceWrite:false,runtimeVerified:false};
  // [책임 경계] 복구용 코드 생성기가 읽기 전용 영향 파일이나 저장소 밖 경로를 쓰지 못하게 한다.
  // allowedPaths가 비어 있으면 과거의 독립 오라클 호출 계약을 유지하되 경로 안전성은 확인한다.
  if(edits.some(([file])=>file.startsWith('/')||file.includes('\\')||file.includes('\u0000')||
    /^[A-Za-z]:/.test(file)||file.split('/').some(part=>!part||part==='.'||part==='..')||
    (owners.size>0&&!owners.has(file))))
   return {status:'BLOCKED',reason:'OUT_OF_SCOPE_REPAIR_EDIT',attempts,sourceWrite:false,runtimeVerified:false};
  const dependent=edits.some((a,i)=>edits.some((b,j)=>i!==j&&a[0]===b[0]&&
   (a[1].includes(b[1])||a[2].includes(b[1]))));
  if(!dependent)edits.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const legacyFingerprint=sourceDigest(JSON.stringify(candidate.edits));
  const fingerprint=sourceDigest(JSON.stringify(edits));
  // [헬퍼] 중복은 평가하지 않지만 남은 승인 예산에서 다른 후보의 합성은 허용한다.
  if(seen.has(fingerprint)||seen.has(legacyFingerprint)){skippedDuplicate=true;continue;}
  seen.add(fingerprint);seen.add(legacyFingerprint);
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
 return {status:'BLOCKED',reason:skippedDuplicate?'REPEATED_PATCH_FINGERPRINT':'REPAIR_BUDGET_EXHAUSTED',
  attempts,counterexamples,sourceWrite:false,runtimeVerified:false};
}
