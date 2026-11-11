// 파일명: tools/vibe2-codegen-counterexample-repair.mjs
// 임포트
import {sourceDigest} from './vibe2-game-source-index.mjs';

// 메인: 기존 생성기·독립 평가기를 호출하는 한정된 반례 탐색. 큐·배포 권한은 없다.
export function runCodegenCounterexampleRepair({generate,evaluate,sourceDigest:sourceSha,
 failures=[],allowedPaths=[],sourceIndex=null,allowedSymbolIds=[],semanticDiffBudget=null,
 replay=null,compareValidated=false,maxAttempts=3,approvedBudget=3}={}){
 const budget=Number.isSafeInteger(maxAttempts)&&Number.isSafeInteger(approvedBudget)&&
  maxAttempts>0&&approvedBudget>0?Math.min(5,maxAttempts,approvedBudget):0;
 if(typeof generate!=='function'||typeof evaluate!=='function'||!/^[a-f0-9]{64}$/.test(sourceSha)||!budget||
  !Array.isArray(allowedPaths)||allowedPaths.some(path=>typeof path!=='string'||!path)||
  !Array.isArray(failures)||(replay!==null&&typeof replay!=='function')||
  typeof compareValidated!=='boolean'||(replay!==null&&!failures.length)||
  (sourceIndex!==null&&(!Array.isArray(sourceIndex?.files)||!Array.isArray(sourceIndex?.symbols)||
   sourceIndex.digest!==sourceSha||!Array.isArray(allowedSymbolIds)||!allowedSymbolIds.length||
   !Number.isSafeInteger(semanticDiffBudget)||semanticDiffBudget<1||semanticDiffBudget>131072))||
  (sourceIndex===null&&(allowedSymbolIds.length!==0||semanticDiffBudget!==null)))
  throw Error('VIBE2_REPAIR_CONTRACT');
 const owners=new Set(allowedPaths);
 // [근거 인덱스] 원본 바이트·해시·함수 범위를 기존 소스 인덱스에 고정한다.
 const originals=new Map(),writableSymbols=new Map();
 if(sourceIndex!==null){
  if(sourceIndex.files.length>32||sourceIndex.symbols.length>4096||
   sourceDigest(JSON.stringify(sourceIndex.files.map(file=>[file.path,file.sourceSha256])))!==sourceSha)
   throw Error('VIBE2_REPAIR_SOURCE_INDEX_STALE');
  for(const file of sourceIndex.files){
   if(typeof file.path!=='string'||typeof file.source!=='string'||
    originals.has(file.path)||sourceDigest(file.source)!==file.sourceSha256)
    throw Error('VIBE2_REPAIR_SOURCE_INDEX_STALE');
   originals.set(file.path,file.source);
  }
  for(const id of new Set(allowedSymbolIds)){
   const matches=sourceIndex.symbols.filter(symbol=>symbol.id===id);
   if(matches.length!==1||matches[0].ambiguous||matches[0].unsupported?.length||
    !originals.has(matches[0].path)||!Number.isSafeInteger(matches[0].start)||
    !Number.isSafeInteger(matches[0].end)||matches[0].start<0||
    matches[0].end>originals.get(matches[0].path).length||
    matches[0].start>=matches[0].end||
    matches[0].sourceSha256!==sourceIndex.files.find(f=>f.path===matches[0].path)?.sourceSha256)
    throw Error('VIBE2_REPAIR_SYMBOL_CONTRACT');
   writableSymbols.set(id,matches[0]);
  }
 }
 const seen=new Set(),counterexamples=[],attempts=[];
 let skippedDuplicate=false,replayUnresolved=false,best=null,validated=0;
 for(const failure of failures){
  if(failure.sourceDigest!==sourceSha||failure.reproduced!==true||!failure.failureSignature||
   !Array.isArray(failure.responsibleSymbols)||failure.responsibleSymbols.length<1||failure.responsibleSymbols.length>2)
   return {status:'BLOCKED',reason:'UNVERIFIED_COUNTEREXAMPLE',attempts,sourceWrite:false,runtimeVerified:false};
  if(failure.patchFingerprint)seen.add(failure.patchFingerprint);
  counterexamples.push(failure);
  // [오류 재현] 별도 실행 오라클이 기존 소스·동일 실패 서명을 재현하지 못하면 자동 수정 금지.
  if(replay!==null){
   const before=replay({phase:'BEFORE',sourceDigest:sourceSha,failure,candidate:null,fingerprint:null});
   if(before&&typeof before.then==='function')throw Error('VIBE2_REPAIR_SYNCHRONOUS_REPLAY_REQUIRED');
   if(before?.sourceDigest!==sourceSha||before?.failureSignature!==failure.failureSignature||
     before?.reproduced!==true)
    return {status:'BLOCKED',reason:'COUNTEREXAMPLE_BASELINE_NOT_REPRODUCED',attempts,
     counterexamples,sourceWrite:false,runtimeVerified:false};
  }
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
  // [생성 후 검증] 문자열 앵커 전체가 아닌 실제 달라진 바이트 범위가 승인 함수 안에 있어야 한다.
  // 읽기 전용 의존 함수, 오래된 앵커, 중복 앵커, 과도한 수정은 평가 전에 차단한다.
  if(sourceIndex!==null){
   let changed=0;
   for(const [file,find,replace] of edits){
    const original=originals.get(file);
    if(original===undefined||!original.includes(find)||original.indexOf(find)!==original.lastIndexOf(find))
     return {status:'BLOCKED',reason:'STALE_OR_AMBIGUOUS_REPAIR_ANCHOR',attempts,sourceWrite:false,runtimeVerified:false};
    const at=original.indexOf(find);
    let prefix=0,suffix=0;
    while(prefix<find.length&&prefix<replace.length&&find[prefix]===replace[prefix])prefix++;
    while(suffix<find.length-prefix&&suffix<replace.length-prefix&&
     find[find.length-1-suffix]===replace[replace.length-1-suffix])suffix++;
    const start=at+prefix,end=at+find.length-suffix;
    if(![...writableSymbols.values()].some(symbol=>symbol.path===file&&
      symbol.start<=start&&end<=symbol.end))
     return {status:'BLOCKED',reason:'UNOWNED_REPAIR_SYMBOL_DELTA',attempts,sourceWrite:false,runtimeVerified:false};
    changed+=find.length-prefix-suffix+replace.length-prefix-suffix;
    if(changed>semanticDiffBudget)
     return {status:'BLOCKED',reason:'REPAIR_SEMANTIC_DIFF_BUDGET_EXCEEDED',attempts,sourceWrite:false,runtimeVerified:false};
   }
  }
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
  // [수정 후 재실행] 테스트 통과만으로 과거 오류가 해결됐다고 추정하지 않는다.
  // 동일 원본 해시와 정확한 후보 지문에 연결된 재실행 증거를 모두 요구한다.
  let unresolved=null;
  if(result?.pass===true&&replay!==null){
   for(const failure of failures){
    const after=replay({phase:'AFTER',sourceDigest:sourceSha,failure,candidate,fingerprint});
    if(after&&typeof after.then==='function')throw Error('VIBE2_REPAIR_SYNCHRONOUS_REPLAY_REQUIRED');
    if(after?.sourceDigest!==sourceSha||after?.failureSignature!==failure.failureSignature||
      after?.patchFingerprint!==fingerprint||after?.reproduced!==false){
     unresolved=failure;break;
    }
   }
  }
  const passed=result?.pass===true&&unresolved===null;
  attempts.push({attempt:attempt+1,fingerprint,pass:passed,
   ...(replay!==null?{causalReplayVerified:passed}: {})});
  if(passed){
   validated++;
   // [후보 비교] 서로 독립적으로 통과한 후보 중 수정 파일 수, 변경 면적이 작은 안을 선택한다.
   const size=edits.reduce((sum,row)=>sum+row[1].length+row[2].length,0);
   const fileCount=new Set(edits.map(row=>row[0])).size;
   if(best===null||fileCount<best.fileCount||fileCount===best.fileCount&&
      (size<best.size||size===best.size&&fingerprint<best.fingerprint))
    best={candidate,fingerprint,size,fileCount,actualGamePlaytest:result.actualGamePlaytest===true};
   if(!compareValidated)break;
   continue;
  }
  if(unresolved!==null){
   replayUnresolved=true;
   counterexamples.push({...unresolved,sourceDigest:sourceSha,patchFingerprint:fingerprint});
   continue;
  }
  if(result?.reproduced!==true||!result.failureSignature||!Array.isArray(result.responsibleSymbols)||
    result.responsibleSymbols.length<1||result.responsibleSymbols.length>2)
   return {status:'BLOCKED',reason:'UNREPRODUCED_OR_UNSCOPED_FAILURE',attempts,sourceWrite:false,runtimeVerified:false};
  counterexamples.push({...result,sourceDigest:sourceSha,patchFingerprint:fingerprint});
 }
 if(best!==null)return {status:'CANDIDATE_VALIDATED',candidate:best.candidate,attempts,counterexamples,
  actualGamePlaytest:best.actualGamePlaytest,sourceWrite:false,runtimeVerified:false,
  ...(replay!==null?{causalReplayVerified:true}:{}),
  ...(compareValidated?{selection:{evaluated:attempts.length,validated,modifiedFiles:best.fileCount,
   footprint:best.size,fingerprint:best.fingerprint}}:{})};
 return {status:'BLOCKED',reason:replayUnresolved?'COUNTEREXAMPLE_REPLAY_NOT_RESOLVED':
  skippedDuplicate?'REPEATED_PATCH_FINGERPRINT':'REPAIR_BUDGET_EXHAUSTED',
  attempts,counterexamples,sourceWrite:false,runtimeVerified:false};
}
