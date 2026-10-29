// 파일명: tools/vibe2-complex-work-planner.mjs
// [임포트] 원본 함수와 오너 지시에 연결된 변경 DAG 및 소스 후보를 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {compileVibe2ComplexIntent} from './vibe2-complex-intent.mjs';
import {indexVibe2GameSource} from './vibe2-game-source-index.mjs';
import {applyExactEdits} from './autonomous-safe-edit.mjs';

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
  const groups=new Map();
  for(const req of intent.requirements){
    if(!groups.has(req.group))groups.set(req.group,[]);
    groups.get(req.group).push(req);
  }
  const expected=order.selectedTask?.sourceSha256ByPath||order.sourceSha256ByPath||{};
  if(expected==null||typeof expected!=='object'||Array.isArray(expected))
    throw Error('VIBE2_COMPLEX_SHA_CONTRACT_INVALID');
  const globalExpected=order.selectedTask?.sourceSha256||order.sourceSha256;
  if(groups.size>1&&globalExpected)throw Error('VIBE2_COMPLEX_MULTI_SOURCE_SHA_MAP_REQUIRED');
  const edits=[],steps=[],hashes={},ranges=new Map();
  const originalDocuments=new Map();
  for(const reqs of groups.values()){
    const trigger=uniqueFunction(index,reqs[0].trigger);
    const effects=reqs.map(req=>uniqueFunction(index,req.effect));
    // Only existing calls in a single lexical file; cross-file imports/RemoteEvents are never invented.
    if(effects.some(row=>row.path!==trigger.path)||trigger.dynamicScope||
      trigger.unsafeControl||trigger.protectedState||
      /\b(?:if|switch|while|for|try|catch|finally)\b/.test(trigger.bodyCode)||
      effects.some(row=>row.params!==''||row.protectedState||row.dynamicScope||
        row.path!==trigger.path||target==='roblox'&&row.start>trigger.start)||
      [trigger,...effects].some(row=>protectedBehavior.test(row.name)||
        /\b(?:OnServerEvent|OnClientEvent|FireServer|FireClient|FireAllClients|DataStoreService)\b/.test(row.bodyCode))||
      (target==='roblox'&&!/(?:^|\/)server\/|(?:^|\/)server\.luau$|\.server\.lua[u]?$/i.test(trigger.path)))
      throw Error('VIBE2_COMPLEX_UNSUPPORTED_FUNCTION_CONTRACT');
    if(effects.some(row=>new RegExp('\\b'+row.name+'\\s*\\(').test(trigger.bodyCode)))
      throw Error('VIBE2_COMPLEX_ALREADY_CONNECTED');
    const originalPath=path.resolve(index.sourceRoot,trigger.path);
    const content=originalDocuments.has(trigger.path)?
      originalDocuments.get(trigger.path):fs.readFileSync(originalPath,'utf8');
    const sourceSha256=sha(content);
    if(sourceSha256!==trigger.sourceSha256||
      [trigger,...effects].some(row=>row.sourceSha256!==sourceSha256))
      throw Error('VIBE2_COMPLEX_STALE_SOURCE');
    if((globalExpected&&globalExpected!==sourceSha256)||
      (expected[trigger.path]&&expected[trigger.path]!==sourceSha256))
      throw Error('VIBE2_COMPLEX_STALE_SOURCE');
    originalDocuments.set(trigger.path,content);
    hashes[trigger.path]=sourceSha256;
    // Use one short, original, unique anchor for each original responsible function.
    const start=Math.max(trigger.start,trigger.insertOffset-160);
    const end=trigger.insertOffset+(target==='web'?1:3);
    const find=content.slice(start,end);
    if(!find||find.length>1024||content.indexOf(find)!==content.lastIndexOf(find)||
      (target==='web'?!find.endsWith('}'):!find.endsWith('end')))
      throw Error('VIBE2_COMPLEX_ANCHOR_NOT_UNIQUE');
    if((ranges.get(trigger.path)||[]).some(row=>start<row.end&&end>row.start))
      throw Error('VIBE2_COMPLEX_OVERLAPPING_EDIT');
    ranges.set(trigger.path,[...(ranges.get(trigger.path)||[]),{start,end}]);
    const lineStart=content.lastIndexOf('\n',trigger.insertOffset-1)+1;
    const indent=(content.slice(lineStart,trigger.insertOffset).match(/^\s*/)||[''])[0];
    const lines=effects.map(row=>row.name+'()'+(target==='web'?';':''));
    const insertion='\n'+lines.map(row=>indent+'  '+row).join('\n')+'\n'+indent;
    const replace=target==='web'?find.slice(0,-1)+insertion+'}':
      find.slice(0,-3)+insertion+'end';
    if(replace===find)throw Error('VIBE2_COMPLEX_NO_SOURCE_DELTA');
    edits.push({path:trigger.path,find,replace});
    for(let i=0;i<reqs.length;i++){
      const req=reqs[i];
      steps.push({
        id:req.id,dependsOn:req.dependsOn,ownerText:req.ownerText,
        source:{path:trigger.path,sourceSha256,definition:trigger.name,
          start:trigger.start,end:trigger.end,parserConfidence:trigger.parserConfidence},
        effect:{path:effects[i].path,sourceSha256,definition:effects[i].name,
          start:effects[i].start,end:effects[i].end,parserConfidence:effects[i].parserConfidence},
        before:'handler-completion-without-'+effects[i].name,
        after:'one-call-per-handler-completion-'+effects[i].name,
        acceptanceScenarios:req.acceptanceScenarios,
        sourceWrite:false,runtimeVerified:false
      });
    }
  }
  const sorted=topo(steps);
  // Validate all edits atomically in the canonical in-memory edit implementation.
  // Never write partial results or replace existing save/asset ownership.
  const replay=new Map(originalDocuments);
  applyExactEdits(index.sourceRoot,edits,{documents:replay});
  for(const [relative,original] of originalDocuments){
    if(replay.get(relative)===original)throw Error('VIBE2_COMPLEX_NO_SOURCE_DELTA');
    if(sha(fs.readFileSync(path.join(index.sourceRoot,relative),'utf8'))!==hashes[relative])
      throw Error('VIBE2_COMPLEX_STALE_SOURCE');
  }
  return Object.freeze({intent,index,steps:sorted,edits,
    edit:edits.length===1?edits[0]:null,
    sourceSha256:edits.length===1?hashes[edits[0].path]:null,
    sourceSha256ByPath:hashes,sourceWrite:false,runtimeVerified:false,
    status:'SOURCE_BOUND_CANDIDATE_NOT_RUNTIME_VERIFIED'});
}

// [메인] 정식 Vibe5.9 후보 검증기를 유지하고 파일별 승인/해시/원자 편집을 증명한다.
export function createVibe2ComplexCandidate(options={}){
  const planned=planVibe2ComplexWork(options);
  if(!planned)return null;
  const {intent,index,steps,edits,sourceSha256,sourceSha256ByPath}=planned;
  return Object.freeze({
    summary:'Source-bound owner event to state and presentation call chains',
    expectedEffect:'Execute approved existing effects in independent dependency-ordered handlers',
    edits,newFiles:[],replaceFiles:[],tests:[],
    vibe59CodeKind:edits.length>1?'SOURCE_BOUND_MULTI_FILE_CHAIN':'SOURCE_BOUND_COMPLEX_CHAIN',
    vibe59TestPlan:{pass:true,staticEvidenceOnly:true,cases:[
      {name:'unique-original-trigger',pass:true},
      {name:'existing-function-edges',pass:true},
      {name:'source-hashes-and-acyclic-dag',pass:true},
      {name:'atomic-in-memory-edit-replay',pass:true}
    ]},
    vibe59DesignSteps:steps.map(row=>({id:row.id,dependsOn:row.dependsOn,
      source:row.source,effect:row.effect})),
    vibe59SourceIndex:{gameId:intent.gameId,files:index.files,
      boundSymbols:steps.length+edits.length,unsupported:index.unsupported},
    ruleDigest:sha(JSON.stringify([intent.requestId,sourceSha256ByPath,edits])),
    sourceSha256,sourceSha256ByPath,modelUsed:false,sourceWrite:false,runtimeVerified:false
  });
}
