// 파일명: tools/vibe2-complex-work-planner.mjs
// [임포트] 원본 함수와 오너 지시에 연결된 변경 DAG 및 소스 후보를 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {compileVibe2ComplexIntent} from './vibe2-complex-intent.mjs';
import {indexVibe2GameSource} from './vibe2-game-source-index.mjs';

const sha=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const protectedBehavior=/\b(?:save|persist|load|reset|reward|grant|purchase|buy|spend|delete|remove)\b/i;
function uniqueFunction(index,name){
  const matches=index.functions.filter(row=>row.name===name);
  if(matches.length!==1||index.duplicateNames.includes(name))
    throw Error('VIBE2_COMPLEX_SOURCE_BINDING_NOT_UNIQUE:'+name);
  return matches[0];
}
function topo(steps){
  const byId=new Map(steps.map(step=>[step.id,step])),result=[],active=new Set(),seen=new Set();
  if(byId.size!==steps.length)throw Error('VIBE2_COMPLEX_DUPLICATE_STEP');
  function visit(id){
    if(active.has(id))throw Error('VIBE2_COMPLEX_DEPENDENCY_CYCLE');
    if(seen.has(id))return;
    const step=byId.get(id);
    if(!step)throw Error('VIBE2_COMPLEX_DEPENDENCY_MISSING');
    active.add(id);
    for(const dep of step.dependsOn)visit(dep);
    active.delete(id);seen.add(id);result.push(step);
  }
  for(const step of steps)visit(step.id);
  return result;
}

// [메인] 생성된 계획에 오너 승인을 새로 부여하지 않는다. 실제 함수/해시/인과 근거가 없으면 차단한다.
export function planVibe2ComplexWork({order={},sourceRoot='',responsibleFiles=[],target='',baseCommit=''}={}){
  const intent=compileVibe2ComplexIntent({order,sourceRoot,responsibleFiles,target,baseCommit});
  if(!intent)return null;
  const index=indexVibe2GameSource({sourceRoot,gameId:intent.gameId,target,responsibleFiles});
  const trigger=uniqueFunction(index,intent.requirements[0].trigger);
  const effects=intent.requirements.map(req=>uniqueFunction(index,req.effect));
  if(effects.some(row=>row.path!==trigger.path)||trigger.dynamicScope||
    trigger.unsafeControl||trigger.protectedState||
    /\b(?:if|switch|while|for|try|catch|finally)\b/.test(trigger.bodyCode)||
    effects.some(row=>row.params!==''||row.protectedState||row.dynamicScope||
      row.path!==trigger.path||target==='roblox'&&row.start>trigger.start)||
    [trigger,...effects].some(row=>protectedBehavior.test(row.name)))
    throw Error('VIBE2_COMPLEX_UNSUPPORTED_FUNCTION_CONTRACT');
  if(effects.some(row=>new RegExp('\\b'+row.name+'\\s*\\(').test(trigger.bodyCode)))
    throw Error('VIBE2_COMPLEX_ALREADY_CONNECTED');
  const sourcePath=path.resolve(index.sourceRoot,trigger.path);
  const content=fs.readFileSync(sourcePath,'utf8'),sourceSha256=sha(content);
  if(sourceSha256!==trigger.sourceSha256||
    [trigger,...effects].some(row=>row.sourceSha256!==sourceSha256))
    throw Error('VIBE2_COMPLEX_STALE_SOURCE');
  const expectedSha=order.selectedTask?.sourceSha256||order.sourceSha256;
  if(expectedSha&&expectedSha!==sourceSha256)
    throw Error('VIBE2_COMPLEX_STALE_SOURCE');
  // The exact existing handler is changed; no generated wrapper, module, save key or asset.
  const start=Math.max(trigger.start,trigger.insertOffset-160);
  const end=trigger.insertOffset+(target==='web'?1:3);
  const find=content.slice(start,end);
  if(!find||find.length>1024||content.indexOf(find)!==content.lastIndexOf(find)||
    (target==='web'?!find.endsWith('}'):!find.endsWith('end')))
    throw Error('VIBE2_COMPLEX_ANCHOR_NOT_UNIQUE');
  const lineStart=content.lastIndexOf('\n',trigger.insertOffset-1)+1;
  const indent=(content.slice(lineStart,trigger.insertOffset).match(/^\s*/)||[''])[0];
  const lines=effects.map(row=>row.name+'()'+(target==='web'?';':''));
  const insertion='\n'+lines.map(row=>indent+'  '+row).join('\n')+'\n'+indent;
  const replace=target==='web'?find.slice(0,-1)+insertion+'}':
    find.slice(0,-3)+insertion+'end';
  if(replace===find)throw Error('VIBE2_COMPLEX_NO_SOURCE_DELTA');
  const steps=topo(intent.requirements.map((req,i)=>({
    id:req.id,dependsOn:req.dependsOn,ownerText:req.ownerText,
    source:{path:trigger.path,sourceSha256,definition:trigger.name,
      start:trigger.start,end:trigger.end,parserConfidence:trigger.parserConfidence},
    effect:{path:effects[i].path,sourceSha256,definition:effects[i].name,
      start:effects[i].start,end:effects[i].end,parserConfidence:effects[i].parserConfidence},
    before:'handler-completion-without-'+effects[i].name,
    after:'one-call-per-handler-completion-'+effects[i].name,
    acceptanceScenarios:req.acceptanceScenarios,
    sourceWrite:false,runtimeVerified:false
  })));
  return Object.freeze({intent,index,steps,
    edit:{path:trigger.path,find,replace},sourceSha256,
    sourceWrite:false,runtimeVerified:false,
    status:'SOURCE_BOUND_CANDIDATE_NOT_RUNTIME_VERIFIED'});
}

// [메인] 기존 Vibe5.9 후보/정밀 편집/검증 파이프라인에 주입하는 한 가지 엄격한 합성 연산.
export function createVibe2ComplexCandidate(options={}){
  const planned=planVibe2ComplexWork(options);
  if(!planned)return null;
  const {intent,index,steps,edit,sourceSha256}=planned;
  return Object.freeze({
    summary:'Source-bound owner event to state and presentation call chain',
    expectedEffect:'Execute two existing owner-specified functions in dependency order after a verified handler',
    edits:[edit],newFiles:[],replaceFiles:[],tests:[],
    vibe59CodeKind:'SOURCE_BOUND_COMPLEX_CHAIN',
    vibe59TestPlan:{pass:true,staticEvidenceOnly:true,cases:[
      {name:'unique-original-trigger',pass:true},
      {name:'two-unique-existing-effects',pass:true},
      {name:'source-hash-and-ordered-dag',pass:true}
    ]},
    vibe59DesignSteps:steps.map(row=>({id:row.id,dependsOn:row.dependsOn,
      source:row.source,effect:row.effect})),
    vibe59SourceIndex:{gameId:intent.gameId,files:index.files,
      boundSymbols:3,unsupported:index.unsupported},
    ruleDigest:sha(JSON.stringify([intent.requestId,sourceSha256,edit.find,edit.replace])),
    sourceSha256,modelUsed:false,sourceWrite:false,runtimeVerified:false
  });
}
