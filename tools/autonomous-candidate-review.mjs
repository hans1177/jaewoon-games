// 파일명: tools/autonomous-candidate-review.mjs
// 역할: 생성 Worker와 분리된 독립 결정론/브라우저 검증. public main 승격 권한은 없다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { extractStorageKeys } from './autonomous-development-worker.mjs';
import { runAutonomousBrowserSmoke } from './autonomous-browser-smoke.mjs';

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const sha=text=>crypto.createHash('sha256').update(String(text??'')).digest('hex');
const exists=file=>{try{return fs.statSync(file),true;}catch{return false;}};
function safeRelative(value){const v=posix(value);return Boolean(v&&!v.startsWith('/')&&!v.split('/').includes('..'));}

export function reviewAutonomousCandidate({evidence,expectedSourceCommit=null}={}){
  const blockers=[];
  if(!evidence||typeof evidence!=='object')return {pass:false,blockers:['EVIDENCE_REQUIRED']};
  if(evidence.candidateOnly!==true)blockers.push('NOT_CANDIDATE_ONLY');
  if(evidence.selfPromote!==false)blockers.push('SELF_PROMOTE_FLAG');
  if(evidence.publicStableModified!==false)blockers.push('PUBLIC_STABLE_MUTATION_FLAG');
  if(evidence.paidApi!==false)blockers.push('PAID_API_FLAG');
  const sourcePath=posix(evidence.sourcePath);
  const candidatePath=posix(evidence.candidatePath);
  if(!sourcePath.startsWith('web-games/')||sourcePath.includes('/.autonomous-candidates/'))blockers.push('SOURCE_PATH_INVALID');
  if(!candidatePath.startsWith('web-games/.autonomous-candidates/'))blockers.push('CANDIDATE_PATH_INVALID');
  if(expectedSourceCommit&&evidence.sourceCommit!==expectedSourceCommit)blockers.push('SOURCE_REVISION_MISMATCH');
  const files=Array.isArray(evidence.changedFiles)?evidence.changedFiles:[];
  if(files.length<1||files.length>4)blockers.push('CHANGED_FILE_COUNT');
  const fileReviews=[];
  for(const relativeRaw of files){
    const relative=posix(relativeRaw);
    if(!safeRelative(relative)){blockers.push(`PATH_INVALID:${relativeRaw}`);continue;}
    const sourceFile=path.join(sourcePath,relative);
    const candidateFile=path.join(candidatePath,relative);
    if(!exists(candidateFile)||!fs.statSync(candidateFile).isFile()){blockers.push(`CANDIDATE_FILE_MISSING:${relative}`);continue;}
    if(fs.lstatSync(candidateFile).isSymbolicLink()){blockers.push(`SYMLINK_FORBIDDEN:${relative}`);continue;}
    const after=fs.readFileSync(candidateFile,'utf8');
    const before=exists(sourceFile)&&fs.statSync(sourceFile).isFile()?fs.readFileSync(sourceFile,'utf8'):'';
    const beforeKeys=extractStorageKeys(before),afterKeys=extractStorageKeys(after);
    if(JSON.stringify(beforeKeys)!==JSON.stringify(afterKeys))blockers.push(`SAVE_KEY_CHANGE:${relative}`);
    const changed=sha(before)!==sha(after);
    if(!changed)blockers.push(`NO_MEANINGFUL_FILE_CHANGE:${relative}`);
    fileReviews.push({path:relative,changed,beforeHash:sha(before),afterHash:sha(after),saveKeysPreserved:JSON.stringify(beforeKeys)===JSON.stringify(afterKeys)});
  }
  return {
    pass:blockers.length===0,
    blockers,
    sourcePath,
    candidatePath,
    candidateId:evidence.candidateId??null,
    sourceCommit:evidence.sourceCommit??null,
    fileReviews,
    promotionScope:'AUTONOMOUS_DEV_ONLY',
    publicReleaseAllowed:false,
    requiresIndependentQa:true,
    requiresBrowserSmoke:true,
  };
}

export async function reviewAutonomousCandidateWithRuntime({evidence,expectedSourceCommit=null,browserOptions={}}={}){
  const staticReview=reviewAutonomousCandidate({evidence,expectedSourceCommit});
  if(!staticReview.pass)return {...staticReview,browserSmoke:null};
  const browserSmoke=await runAutonomousBrowserSmoke(staticReview.candidatePath,{candidateId:staticReview.candidateId||'candidate',required:true,...browserOptions});
  const blockers=[...staticReview.blockers,...(browserSmoke.pass?[]:browserSmoke.blockers.map(x=>`BROWSER:${x}`))];
  return {...staticReview,pass:blockers.length===0,blockers,browserSmoke};
}

async function main(){
  const evidenceArg=process.argv.find(x=>x.startsWith('--evidence='))?.slice('--evidence='.length);
  const expected=process.argv.find(x=>x.startsWith('--expected-source-commit='))?.slice('--expected-source-commit='.length)||null;
  const runtime=process.argv.includes('--runtime')||process.argv.includes('--runtime=true');
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||null;
  if(!evidenceArg)throw new Error('--evidence 필요');
  const evidence=JSON.parse(fs.readFileSync(evidenceArg,'utf8'));
  const review=runtime?await reviewAutonomousCandidateWithRuntime({evidence,expectedSourceCommit:expected}):reviewAutonomousCandidate({evidence,expectedSourceCommit:expected});
  const rendered=JSON.stringify(review,null,2);
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${rendered}\n`,'utf8');}
  console.log(rendered);
  if(!review.pass)process.exitCode=1;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.message);process.exitCode=1;});}
