// 파일명: tools/vibe2-code-pattern-ingest.mjs
// 역할: 검증된 training sample에서 raw 코드 없이 재사용 가능한 내부 구현 패턴만 추출한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

const CLASSIFIERS=[
  ['SAVE_PERSISTENCE',/save|load|restore|localStorage|sessionStorage|datastore|persist|migration/i],
  ['INPUT_EVENT_BINDING',/addEventListener|onclick|pointer|touch|keydown|keyup|input/i],
  ['STATE_MACHINE',/state|phase|win|fail|retry|restart|objective|progress/i],
  ['AI_INTENT',/enemy|npc|opponent|pathfind|\bai\b|intent/i],
  ['COMBAT_RESOLUTION',/combat|attack|damage|hit|weapon|skill|boss/i],
  ['ECONOMY_TRANSACTION',/econom|currency|gold|coin|cost|price|shop|resource|reward/i],
  ['FRAME_LOOP_PERFORMANCE',/requestAnimationFrame|setInterval|performance|pool|fps|frame/i],
  ['MOBILE_UI_FLOW',/mobile|touch|responsive|hud|menu|ui|button/i],
  ['REGRESSION_REPAIR',/regression|bug|repair|failure|fix|causal/i]
];

function engineOf(sample={}){
  const source=clean(sample?.input||'')+' '+clean(sample?.instruction||'');
  if(/roblox-games\//i.test(source)||/roblox|luau|studio/i.test(source))return'roblox';
  if(/unity-games\//i.test(source)||/unity|c#/i.test(source))return'unity';
  return'web';
}

// Read only the added side of an independently verified patch. Never retain raw source.
const REPAIR_OPERATIONS=Object.freeze([
  ['GUARD_EVENT_BINDING',/\baddEventListener\s*\(/i,/\bif\s*\(|\?\./i,'Check the element or event target before registering its handler.','Run missing-element and duplicate-binding regression cases.'],
  ['CLEANUP_LIFECYCLE',/\b(?:clearInterval|clearTimeout|cancelAnimationFrame|removeEventListener|Disconnect|disconnect)\s*\(/i,null,'Release timers, listeners or subscriptions from the owning lifecycle.','Repeat start, stop and restart to detect duplicate work.'],
  ['ATOMIC_SAVE_COMMIT',/\b(?:setItem|UpdateAsync|SetAsync|SetAttribute|writeFileSync)\s*\(/i,/\b(?:if|return|pcall|try|catch)\b/i,'Validate the save preconditions before committing the new state once.','Test failed saves, reload and unchanged state on rejection.'],
  ['SAVE_STATE_OWNER',/\b(?:localStorage|DataStore|UpdateAsync|SetAsync|setItem)\b/i,null,'Preserve the existing persistence owner and save-key meaning.','Verify save, reload, migration and error handling.'],
  ['HANDLE_FAILURE_RESULT',/\b(?:pcall|try|catch|Promise\.catch)\b/i,null,'Handle the operation result or exception before mutating shared state.','Test a rejected callback and a successful retry.'],
  ['BOUND_NUMERIC_INPUT',/\b(?:Math\.min|Math\.max|math\.clamp|Mathf\.Clamp)\s*\(/i,null,'Bound incoming numeric values before applying gameplay state changes.','Test lower, upper and invalid input boundaries.'],
  ['MOBILE_INPUT_BINDING',/\b(?:touch-action|pointerdown|pointermove|touchstart|touchmove)\b/i,null,'Bind touch or pointer input to the existing gameplay owner without duplicate dispatch.','Verify tap, drag, pointer cancel and mobile viewport changes.'],
  ['SERVER_INPUT_VALIDATION',/\b(?:OnServerEvent|OnServerInvoke)\b/i,/\b(?:if|return|assert)\b/i,'Validate client-originated input on the server before authoritative mutation.','Test malformed, repeated and unauthorized remote requests.'],
  ['EXISTING_INPUT_HANDLER_BINDING',/\.on(?:click|pointerdown|touchstart|touchend|keydown|keyup)\s*=\s*(?:\(?\s*[A-Za-z_$]|function\b|async\b)/i,null,'Bind player input to the existing action handler without duplicating its owner.','Exercise the actual input action and verify it fires exactly once.']
]);

// Old PASS-marked traces can contain malformed added JavaScript. Do not learn from them.
export function hasObviousMalformedAddedCode(output=''){
  const source=String(output??''),at=source.indexOf('검증된 패치:');
  const patch=at>=0?source.slice(at+'검증된 패치:'.length):source;
  const added=patch.split(/\r?\n/).filter(line=>/^\+(?!\+)/.test(line)).map(line=>line.slice(1)).join('\n');
  if(!added)return false;
  return /\)\s*forEach\s*\(/.test(added)
    || /;\s*\.(?:forEach|map|filter|addEventListener)\s*\(/.test(added);
}

export function deriveObservedRepairRecipe(output=''){
  const source=String(output??'');
  const marker=source.indexOf('검증된 패치:');
  const patch=marker>=0?source.slice(marker+'검증된 패치:'.length):source;
  if(Buffer.byteLength(patch,'utf8')>120000)return null;
  if(hasObviousMalformedAddedCode(output))return null;
  const added=patch.split(/\r?\n/).filter(line=>/^\+(?!\+)/.test(line)).map(line=>line.slice(1)).join('\n');
  let candidate=added;
  if(!candidate){
    try{
      const parsed=JSON.parse(patch.trim());
      const edits=Array.isArray(parsed?.edits)?parsed.edits:[];
      candidate=edits.slice(0,32).flatMap(edit=>[edit?.replace,edit?.replacement,edit?.with,edit?.insert,edit?.content].filter(value=>typeof value==='string')).join('\n');
    }catch{/* Non-diff or non-JSON outputs cannot establish an observed repair recipe. */}
  }
  if(!candidate)return null;
  const operations=REPAIR_OPERATIONS.filter(([,positive,guard])=>positive.test(candidate)&&(!guard||guard.test(candidate)));
  if(!operations.length)return null;
  return Object.freeze({
    version:1,origin:'VERIFIED_PATCH_ADDED_CODE',rawCodeStored:false,
    operationIds:operations.map(([id])=>id),
    steps:operations.map(([, , ,step])=>step),
    focusedChecks:operations.map(([, , , ,check])=>check)
  });
}

function sampleVerified(sample={}){
  if(hasObviousMalformedAddedCode(sample.output))return false;
  if(!['coding','bugfix','unity'].includes(clean(sample.taskType)))return false;
  if(upper(sample.independentQa)!=='PASS')return false;
  const browser=upper(sample.browserQa);
  if(browser&& !['PASS','NOT_APPLICABLE'].includes(browser))return false;
  if(sample.verification?.fullRegression&&upper(sample.verification.fullRegression)!=='PASS')return false;
  if(sample.verification?.runtime&&upper(sample.verification.runtime)!=='PASS')return false;
  if(sample.verification?.exactRevision&&upper(sample.verification.exactRevision)!=='PASS')return false;
  if(sample.verification?.protectedState&&upper(sample.verification.protectedState)!=='PASS')return false;
  return Boolean(clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision));
}

export function deriveVerifiedCodePatterns(sample={},sourcePath=''){
  if(!sampleVerified(sample))return[];
  const text=[
    sample.instruction,sample.input,
    ...(sample.verification?.proposedTests||[]),
    clean(sample.output).split('검증된 패치:')[0]
  ].filter(Boolean).join(' ');
  const systems=CLASSIFIERS.filter(([,re])=>re.test(text)).map(([name])=>name);
  const repairRecipe=deriveObservedRepairRecipe(sample.output);
  const sourceRevision=clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision);
  const gameId=clean(sample.gameId||sample.project)||null;
  const engine=engineOf(sample);
  const taskType=clean(sample.taskType);
  return systems.map(system=>({
    id:`pat_${hash([gameId,engine,taskType,system,sourceRevision].join('|'))}`,
    gameId,engine,taskType,system,
    problem:clean(sample.instruction).slice(0,220),
    pattern:repairRecipe
      ?`VERIFIED_${system}_REPAIR_${repairRecipe.operationIds.join('_THEN_')}`
      :`VERIFIED_${system}_SMALLEST_RESPONSIBLE_CHANGE_WITH_REGRESSION`,
    ...(repairRecipe?{repairRecipe}:{}),
    tags:uniq([system,taskType,engine,'verified','smallest-responsible-change','regression-bound']),
    verified:true,
    sourceRevision,
    evidencePath:sourcePath,
    rawCodeStored:false,
    independentQa:'PASS',
    browserQa:upper(sample.browserQa)||'NOT_APPLICABLE',
    authority:'verified-internal-code-pattern'
  }));
}

export function ingestVerifiedCodePatterns({samplesDir='company-learning/training-samples',libraryInput={}}={}){
  // Rebuild patterns for files observed in this run instead of preserving revoked legacy PASS records.
  const scannedSourcePaths=new Set(fs.existsSync(samplesDir)
    ?fs.readdirSync(samplesDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).map(x=>path.join(samplesDir,x.name))
    :[]);
  const byId=new Map((libraryInput?.patterns||[])
    .filter(x=>x?.verified===true&&!scannedSourcePaths.has(clean(x.evidencePath)))
    .map(x=>[clean(x.id),x]));
  let examined=0,added=0;
  if(fs.existsSync(samplesDir)){
    for(const entry of fs.readdirSync(samplesDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(samplesDir,entry.name);let sample;try{sample=readJson(file,null);}catch{continue;} examined++;
      for(const pattern of deriveVerifiedCodePatterns(sample,file)){
        if(!byId.has(pattern.id))added++;
        byId.set(pattern.id,pattern);
      }
    }
  }
  return {
    version:1,kind:'vibe2-verified-code-pattern-library',
    patterns:[...byId.values()].sort((a,b)=>String(a.system).localeCompare(String(b.system))||String(a.id).localeCompare(String(b.id))).slice(-1000),
    policy:{verifiedEvidenceRequired:true,rawCodeStored:false,wholeGameCopyForbidden:true,unauthorizedExternalCodeForbidden:true},
    stats:{examined,added,total:byId.size},
    updatedAt:new Date().toISOString()
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();const samples=clean(a.samples)||'company-learning/training-samples';const output=clean(a.output)||'.vibe2/code-pattern-library.json';
  const result=ingestVerifiedCodePatterns({samplesDir:samples,libraryInput:readJson(output,{patterns:[]})});
  writeJson(output,result);
  console.log('VIBE2_CODE_PATTERN_INGEST=PASS');
  console.log(`VIBE2_CODE_PATTERN_ADDED=${result.stats.added}`);
  console.log(`VIBE2_CODE_PATTERN_TOTAL=${result.stats.total}`);
  console.log('VIBE2_RAW_CODE_STORED=NO');
}
