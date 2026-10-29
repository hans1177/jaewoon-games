// 파일명: tools/vibe2-complex-work-planner.mjs
// [임포트] 원본 함수와 오너 지시에 연결된 변경 DAG 및 소스 후보를 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import {compileVibe2ComplexIntent,compileComplexOwnerIntent,expressionReferences,parseIntentExpression} from './vibe2-complex-intent.mjs';
import {indexVibe2GameSource,buildGameSourceIndex,safeSourceFile,sourceDigest,resolveGameSourceScope,sourceScopeAt} from './vibe2-game-source-index.mjs';
import {applyExactEdits,normalizeExactEdits} from './autonomous-safe-edit.mjs';
import {synthesizeGameChangeAtom} from './vibe2-offline-game-operators.mjs';
import {runCodegenCounterexampleRepair} from './vibe2-codegen-counterexample-repair.mjs';

const protectedBehavior=/\b(?:save|persist|load|reset|reward|grant|purchase|buy|spend|delete|remove)\b/i;
// [유틸] 런타임/엔진에서 실제 존재하는 인자만 전달한다. 추측된 타입/표현식은 거부한다.
function explicitParameterNames(formals){
  if(!formals.trim())return [];
  const tokens=formals.split(',');
  if(tokens.length>6)throw Error('VIBE2_COMPLEX_PARAMETER_CONTRACT');
  const names=tokens.map(token=>{
    const match=/^([A-Za-z_$][\w$]*)(?:\s*:\s*[A-Za-z_][\w.]*\??)?$/.exec(token.trim());
    if(!match)throw Error('VIBE2_COMPLEX_PARAMETER_CONTRACT');
    return match[1];
  });
  if(new Set(names).size!==names.length)throw Error('VIBE2_COMPLEX_PARAMETER_CONTRACT');
  return names;
}

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
    const formalArgs=explicitParameterNames(trigger.params);
    const effectArgs=effects.map(row=>explicitParameterNames(row.params));
    if(effectArgs.some(names=>names.some(name=>!formalArgs.includes(name)))||
      formalArgs.some(name=>(trigger.locals||[]).includes(name)||
        new RegExp('\\b(?:for|catch)\\s*\\(?\\s*'+name+'\\b').test(trigger.bodyCode)))
      throw Error('VIBE2_COMPLEX_PARAMETER_BINDING_UNPROVEN');
    // Only existing calls in a single lexical file; cross-file imports/RemoteEvents are never invented.
    if(effects.some(row=>row.path!==trigger.path||JSON.stringify(row.lexicalScope)!==JSON.stringify(trigger.lexicalScope))||trigger.dynamicScope||
      trigger.unsafeControl||trigger.protectedState||
      (target==='web'&&/\b(?:if|switch|while|for|try|catch|finally)\b/.test(trigger.bodyCode))||
      effects.some(row=>row.protectedState||row.dynamicScope||
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
    const sourceSha256=sourceDigest(content);
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
    const lines=effects.map((row,i)=>row.name+'('+effectArgs[i].join(', ')+')'+(target==='web'?';':''));
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
        forwardedArguments:effectArgs[i],parameterEvidence:'EXACT_ORIGINAL_FORMAL_NAME_SUBSET',
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
    if(sourceDigest(fs.readFileSync(path.join(index.sourceRoot,relative),'utf8'))!==hashes[relative])
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
    ruleDigest:sourceDigest(JSON.stringify([intent.requestId,sourceSha256ByPath,edits])),
    sourceSha256,sourceSha256ByPath,modelUsed:false,sourceWrite:false,runtimeVerified:false
  });
}

// 메인: 원문 승인·실제 심벌·소스 해시·의존관계를 하나의 변경 계약에 결합한다.
export function planComplexGameWork({order={},intent,sourceIndex,sourceRoot,responsibleFiles,target='web',baseRevisionSha=''}={}){
 const compiled=compileComplexOwnerIntent({order,target,baseRevisionSha});
 const blocked=code=>({status:'BLOCKED',unresolved:[{code}],sourceWrite:false,runtimeVerified:false,modelUsed:false});
 if(intent&&JSON.stringify(intent)!==JSON.stringify(compiled))return blocked('OWNER_INTENT_TAMPERED');
 intent=compiled;
 if(intent.unresolved.length)return {status:'BLOCKED',intent,unresolved:intent.unresolved,sourceWrite:false,runtimeVerified:false,modelUsed:false};
 if(!/^[a-f0-9]{40}$/i.test(baseRevisionSha))return blocked('MISSING_BASE_REVISION');
 let index;
 try{
  index=buildGameSourceIndex({sourceRoot,responsibleFiles,target,baseRevisionSha});
  if(sourceIndex&&(sourceIndex.digest!==index.digest||JSON.stringify(sourceIndex.symbols)!==JSON.stringify(index.symbols)))return blocked('STALE_SOURCE');
 }catch(error){return blocked(String(error.message))}
 const nodes=[],unresolved=[];
 const lowered=[];
 for(const requirement of intent.requirements){
  // [원본 탐색] 함수명 없이도 상태 쓰기, 화면 읽기, 기존 정적 저장키를 함께 증명한다.
  if(requirement.operation==='semantic-existing-chain'){
   if(target!=='web'){unresolved.push({id:requirement.id,code:'SEMANTIC_WEB_CHAIN_ONLY'});continue}
   const matches=[];
   for(const file of index.files){
    const owners=index.symbols.filter(row=>row.kind==='function'&&!row.ambiguous&&row.path===file.path&&!row.unsupported.length);
    const body=row=>file.code.slice(row.bodyStart,row.bodyEnd);
    const mutations=owners.filter(row=>/\bstate\.[A-Za-z_$][\w$]*\s*(?:\+\+|--|[+\-*/%]?=(?!=))/.test(body(row))&&
     !/\b(?:localStorage|sessionStorage)\b/.test(body(row)));
    const views=owners.filter(row=>/\.(?:textContent|innerText|innerHTML)\s*=(?!=)/.test(body(row))&&/\bstate\.[A-Za-z_$]/.test(body(row)));
    const saves=owners.filter(row=>/\b(?:localStorage|sessionStorage)\.setItem\s*\(/.test(body(row))&&
     /\bJSON\.stringify\s*\(\s*state\s*\)/.test(body(row))&&
     file.storage.some(record=>record.key&&record.start>=row.bodyStart&&record.end<=row.bodyEnd));
    if(views.length!==1||saves.length!==1||mutations.length!==1)continue;
    const [mutation]=mutations,[view]=views,[save]=saves;
    const fields=file.states.filter(write=>write.start>=mutation.bodyStart&&write.end<=mutation.bodyEnd&&/^state\.[A-Za-z_$][\w$]*$/.test(write.name));
    if(!fields.length||!fields.some(write=>body(view).includes(write.name))||
      new Set([mutation.id,view.id,save.id]).size!==3)continue;
    const triggers=owners.filter(row=>row.id!==mutation.id&&row.id!==view.id&&row.id!==save.id&&
     index.edges.filter(edge=>edge.from===row.id&&edge.to===mutation.id).length===1&&
     !index.edges.some(edge=>edge.from===row.id&&[view.id,save.id].includes(edge.to)));
    for(const trigger of triggers)matches.push({file,trigger,mutation,view,save});
   }
   if(matches.length!==1){unresolved.push({id:requirement.id,code:'SEMANTIC_STATE_UI_SAVE_OWNER_UNPROVEN',matches:matches.length});continue}
   const {file,trigger,mutation,view,save}=matches[0];
   lowered.push({...requirement,operation:'existing-call',functionName:trigger.name,after:mutation.name,
    callee:view.name,callees:[view.name,save.name],sourcePath:file.path,
    derivation:'ORIGINAL_STATE_WRITE_UI_READ_STATIC_SAVE_CALL'});
   continue;
  }
  // [Roblox 다중 파일] 여러 서버 소스에서 사망 상태와 HP 감소를 확인하고 함께 수정한다.
  if(requirement.operation==='semantic-multi-guard'){
   if(target!=='roblox'){unresolved.push({id:requirement.id,code:'SEMANTIC_ROBLOX_SERVER_ONLY'});continue}
   const matches=[];
   for(const symbol of index.symbols.filter(row=>row.kind==='function'&&!row.ambiguous&&!row.unsupported.length&&
     /(?:^|\/)server\/|(?:^|\/)ServerScriptService\/|\.server\.lua[u]?$/i.test(row.path))){
    const file=index.files.find(row=>row.path===symbol.path),body=file.code.slice(symbol.bodyStart,symbol.bodyEnd);
    const targets=symbol.parameters.filter(name=>new RegExp('\\b'+name+'\\.hp\\s*-=').test(body));
    if(targets.length!==1)continue;
    const victim=targets[0];
    if(!/\bdead\s*(?:=|:)\s*(?:true|false)\b/.test(file.code)){
     unresolved.push({id:requirement.id,code:'SEMANTIC_DEATH_FIELD_UNPROVEN',path:file.path});continue;
    }
    if(new RegExp('\\bif\\s+'+victim+'\\.dead\\s+then').test(body))continue;
    matches.push({symbol,victim});
   }
   if(unresolved.some(row=>row.id===requirement.id))continue;
   if(matches.length<2||matches.length>12||new Set(matches.map(row=>row.symbol.path)).size<2){
    unresolved.push({id:requirement.id,code:'SEMANTIC_MULTIFILE_OWNER_UNPROVEN',matches:matches.length});continue;
   }
   for(const [i,row] of matches.entries())lowered.push({...requirement,id:requirement.id+'-'+i,
    operation:'guard-return',functionName:row.symbol.name,sourcePath:row.symbol.path,
    condition:{kind:'ref',name:row.victim+'.dead'},derivation:'ORIGINAL_SERVER_HP_WRITE_MULTI_FILE'});
   continue;
  }
  if(requirement.operation!=='semantic-guard'){lowered.push(requirement);continue}
  // 의미 연결은 실제 HP 쓰기·공격자 상태·호출 인자·반복 소유자를 모두 확인해야 한다.
  const matches=[];
  for(const symbol of index.symbols.filter(s=>s.kind==='function'&&!s.ambiguous)){
   const file=index.files.find(f=>f.path===symbol.path),body=file.code.slice(symbol.bodyStart,symbol.bodyEnd);
   const targets=symbol.parameters.filter(p=>new RegExp('\\b'+p+'\\.hp\\s*-=').test(body));
   const attackers=symbol.parameters.filter(p=>new RegExp('\\b'+p+'\\.cd\\s*=').test(body)&&new RegExp('\\b'+p+'\\.(?:atk|rate)\\b').test(body));
   if(targets.length===1&&attackers.length===1&&targets[0]!==attackers[0])matches.push({symbol,target:targets[0],attacker:attackers[0]});
  }
  if(matches.length!==1){unresolved.push({id:requirement.id,code:'SEMANTIC_DAMAGE_OWNER_UNPROVEN'});continue}
  const match=matches[0],name=requirement.semantic==='dead-target'?match.target:match.attacker;
  lowered.push({...requirement,id:requirement.id+'-hit',operation:'guard-return',functionName:match.symbol.name,
   condition:{kind:'ref',name:name+'.dead'},derivation:'EXISTING_HP_WRITE_AND_ATTACKER_STATE'});
  if(requirement.semantic==='dead-attacker'){
   const parameterIndex=match.symbol.parameters.indexOf(match.attacker),callbacks=[];
   for(const edge of index.edges.filter(e=>e.to===match.symbol.id&&e.arguments)){
    const argument=edge.arguments[parameterIndex];
    for(const cb of index.symbols.filter(s=>s.kind==='callback'&&s.path===edge.path&&s.start<edge.start&&s.end>edge.end&&s.parameters.includes(argument)))callbacks.push({cb,argument});
   }
   if(callbacks.length!==1){unresolved.push({id:requirement.id,code:'SEMANTIC_ACTOR_CALLER_UNPROVEN'});continue}
   const {cb,argument}=callbacks[0],parts=cb.name.split('::');
   lowered.push({...requirement,id:requirement.id+'-caller',operation:'guard-return',functionName:parts[0],callback:parts[1],
    condition:{kind:'ref',name:argument+'.dead'},derivation:'CALL_ARGUMENT_TO_EXISTING_ITERATION_PARAMETER'});
  }
 }
 for(const r of lowered){
  const wanted=r.functionName+(r.callback?'::'+r.callback:'');
  const choices=index.symbols.filter(s=>s.name===wanted&&(!r.sourcePath||s.path===r.sourcePath));
  if(choices.length!==1||choices[0].ambiguous){unresolved.push({id:r.id,code:'AMBIGUOUS_OR_MISSING_SYMBOL',symbol:wanted});continue}
  const owner={...choices[0]},file=index.files.find(f=>f.path===owner.path);
  if(owner.unsupported.length){unresolved.push({id:r.id,code:'UNSUPPORTED_OWNER_SYNTAX'});continue}
  const refs=[...new Set([...(r.condition?expressionReferences(r.condition):[]),...(r.output?[r.output]:[])])];
  let invalid=false;
  for(const ref of refs){
   try{parseIntentExpression(ref)}catch{invalid=true;break}
   const [root,...fields]=ref.split('.');
   const params=owner.parameters.filter(p=>p===root),locals=owner.locals.filter(p=>p===root);
   const definitions=[...file.code.matchAll(new RegExp('\\b(?:let|const|var|local)\\s+'+root+'\\b','g'))];
   const scope=sourceScopeAt(file.code,owner.start,target);
   const visible=at=>{const parent=sourceScopeAt(file.code,at,target);return parent.every((x,i)=>scope[i]===x)};
   const globalDefinitions=definitions.filter(d=>visible(d.index)&&!index.symbols.some(s=>s.path===file.path&&s.start<d.index&&d.index<s.end));
   let localBound=false;
   if(!params.length&&locals.length===1&&r.operation==='guard-return'){
    // 기존 초기화와 nil/TDZ 검증 뒤에만 새 조건을 넣는다. 기존 부작용 순서는 보존한다.
    const body=file.code.slice(owner.bodyStart,owner.bodyEnd),escaped=root.replaceAll('$','\\$');
    const declaration=target==='roblox'
     ?new RegExp('^\\s*local\\s+'+escaped+'\\s*=([^\\n]+)\\n')
     :new RegExp('^\\s*(?:let|const|var)\\s+'+escaped+'\\s*=([^;\\n]+);[ \\t]*\\r?\\n');
    const match=declaration.exec(body);
    if(match){
     const tail=body.slice(match[0].length);
     const nilGuard=target==='roblox'
      ?new RegExp('^\\s*if\\s+not\\s+'+escaped+'(?:\\s+or[^\\n]+?)?\\s+then\\s+return(?:\\s+false)?\\s+end[^\\n]*\\n').exec(tail)
      :new RegExp('^\\s*if\\s*\\(\\s*!'+escaped+'\\s*\\)\\s*return;[^\\n]*\\n').exec(tail);
     if(nilGuard){owner.insertionOffset=owner.bodyStart+match[0].length+nilGuard[0].length;localBound=true}
    }
   }
   if(params.length+locals.length>1||(!params.length&&globalDefinitions.length!==1&&!localBound)||fields.some(f=>!file.fields.includes(f))){invalid=true;break}
  }
  if(invalid){unresolved.push({id:r.id,code:'MISSING_GROUNDING_OR_SHADOWED_STATE'});continue}
  // Lua의 0/빈 문자열은 JS와 참값 의미가 다르므로 직접 조건은 기존 boolean만 허용한다.
  const booleanPredicate=node=>{
   if(!node)return true;if(node.kind==='boolean'||node.kind==='compare')return true;
   if(node.kind==='not')return booleanPredicate(node.value);
   if(node.kind==='and'||node.kind==='or')return node.items.every(booleanPredicate);
   if(node.kind==='ref'){
    const field=node.name.split('.').at(-1);
    return new RegExp('\\b'+field+'\\s*(?:=|:)\\s*(?:true|false)\\b').test(file.code);
   }
   return false;
  };
  if(r.condition&&!booleanPredicate(r.condition)){unresolved.push({id:r.id,code:'BOOLEAN_TYPE_UNPROVEN'});continue}
  if(r.output){
   const body=file.code.slice(owner.bodyStart,owner.bodyEnd),escaped=r.output.replaceAll('.','\\.');
   if(!new RegExp('(?<![\\w$.])'+escaped+'\\s*[+*/%-]?=(?!=)').test(body)){
    unresolved.push({id:r.id,code:'UNDECLARED_STATE_WRITE'});continue;
   }
  }
  if(r.operation==='existing-call'){
   // [메인] 기존 상태 변경 호출 뒤 실제 원본의 UI·저장 책임 함수를 순서대로 연결한다.
   const orderedNames=r.callees||[r.callee];
   const candidates=orderedNames.map(name=>index.symbols.filter(s=>s.kind==='function'&&s.name===name&&s.path===file.path&&!s.ambiguous));
   const call=index.edges.filter(e=>e.from===owner.id&&e.toName===r.after&&e.to);
   const ancestors=new Set([owner.id]);let parent=owner.parent;
   while(parent){ancestors.add(parent);parent=index.symbols.find(s=>s.id===parent)?.parent}
   const scope=sourceScopeAt(file.code,owner.start,target);
   const callees=candidates.map(rows=>rows[0]);
   if(candidates.some(rows=>rows.length!==1)||call.length!==1||
     new Set(orderedNames).size!==orderedNames.length||orderedNames.includes(r.functionName)||
     (r.callees&&orderedNames.includes(r.after))||
     callees.some(callee=>{
       const calleeScope=sourceScopeAt(file.code,callee.start,target);
       return !calleeScope.every((x,i)=>scope[i]===x)||
         (callee.parent&&!ancestors.has(callee.parent));
     })){
    unresolved.push({id:r.id,code:'CALL_OWNERSHIP_UNPROVEN'});continue;
   }
   if(!Array.isArray(call[0].arguments)||call[0].arguments.length>6){
    unresolved.push({id:r.id,code:'CALL_ANCHOR_ARGUMENTS_UNPROVEN'});continue;
   }
   try{
    const formals=symbol=>explicitParameterNames(/\(([^()]*)\)/.exec(file.code.slice(symbol.start,symbol.bodyStart))?.[1]??'...');
    const available=formals(owner);
    const orderedCalls=callees.map((callee,i)=>{
     const forwardedArguments=formals(callee);
     if(forwardedArguments.some(name=>!available.includes(name)||owner.locals.includes(name))||
       [...available,...owner.locals].includes(orderedNames[i])||callee.unsupported.length||
       (target==='roblox'&&callee.start>=owner.start))throw Error('UNPROVEN_CALL');
     return {callee:orderedNames[i],forwardedArguments};
    });
    // 저장 함수가 이미 이벤트 경로에서 호출되면 재호출해 중복 저장하지 않는다.
    if(r.callees&&index.edges.some(e=>e.from===owner.id&&orderedNames.includes(e.toName)))
     throw Error('DUPLICATE_CHAIN_CALL');
    r.forwardedArguments=orderedCalls[0].forwardedArguments;
    r.orderedCalls=orderedCalls;
    r.boundCalleeSymbols=callees.map(callee=>({id:callee.id,path:callee.path,
     start:callee.start,end:callee.end,sourceSha256:callee.sourceSha256,parserConfidence:callee.parserConfidence}));
   }catch{
    unresolved.push({id:r.id,code:'CALL_PARAMETER_BINDING_UNPROVEN'});continue;
   }
   r.afterCallArguments=[...call[0].arguments];
   r.afterCallStart=call[0].start;
  }
  nodes.push({...r,owner,file,boundSymbols:[{id:owner.id,path:owner.path,start:owner.start,end:owner.end,
   sourceSha256:owner.sourceSha256,parserConfidence:owner.parserConfidence},...(r.boundCalleeSymbols||[])],ownerScope:intent.ownerDirectiveReference,dependsOn:[]});
 }
 if(unresolved.length)return {status:'BLOCKED',intent,unresolved,sourceWrite:false,modelUsed:false,runtimeVerified:false};
 // 같은 기존 진입점의 중단 조건만 OR로 합성한다. 원시 편집 영역의 중복은 계속 거부한다.
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(node.operation!=='guard-return')continue;
  node.requirementIds=[node.id];
  for(let j=nodes.length-1;j>i;j--){
   const other=nodes[j];
   if(other.operation==='guard-return'&&other.owner.id===node.owner.id){
    node.condition={kind:'or',items:[node.condition,other.condition]};node.requirementIds.push(other.id);
    node.ownerTexts=[...(node.ownerTexts||[node.ownerText]),other.ownerText];nodes.splice(j,1);
   }
  }
 }
 const explicit=order.selectedTask?.vibe59ComplexDependencies??order.vibe59ComplexDependencies??{};
 for(const node of nodes){
  for(const other of nodes){
   if(node===other)continue;
   if(index.edges.some(e=>(e.from===node.owner.id||e.from===node.owner.parent)&&e.to===other.owner.id))node.dependsOn.push(other.id);
  }
  const selector=node.functionName+(node.callback?'::'+node.callback:'');
  if(explicit[selector]!==undefined){
   if(!Array.isArray(explicit[selector]))return blocked('INVALID_DEPENDENCY');
   for(const key of explicit[selector]){
    const matches=nodes.filter(n=>n.id===key||n.functionName+(n.callback?'::'+n.callback:'')===key);
    if(matches.length!==1)return blocked('MISSING_DEPENDENCY');
    node.dependsOn.push(matches[0].id);
   }
  }
  node.dependsOn=[...new Set(node.dependsOn)];
 }
 const sorted=[],active=new Set(),done=new Set();
 const visit=node=>{
  if(active.has(node.id))throw Error('DEPENDENCY_CYCLE');if(done.has(node.id))return;
  active.add(node.id);for(const id of node.dependsOn)visit(nodes.find(n=>n.id===id));
  active.delete(node.id);done.add(node.id);sorted.push(node);
 };
 try{nodes.forEach(visit)}catch{return blocked('DEPENDENCY_CYCLE')}
 const waves=[];
 for(let i=0;i<sorted.length;i+=12)waves.push({index:waves.length,requirements:sorted.slice(i,i+12).map(n=>n.id),
  dependsOnPreviousWave:i>0,requiredPriorVerifiedRevision:i>0?'EXACT_NEXT_SOURCE_REVISION':null});
 return {status:'BOUND',intent,index,nodes:sorted,waves,baseRevisionSha,
  digest:sourceDigest(JSON.stringify([intent.requestId,index.digest,sorted.map(n=>[n.id,n.dependsOn])])),
  unresolved:[],sourceWrite:false,modelUsed:false,runtimeVerified:false};
}

export function createComplexGameCandidate({plan,sourceRoot,target='web'}={}){
 if(plan?.status!=='BOUND')return null;
 const selected=plan.nodes.slice(0,12),atoms=[],ranges=new Map(),originals=new Map();
 for(const file of plan.index.files){
  const actual=fs.readFileSync(safeSourceFile(sourceRoot,file.path),'utf8');
  if(sourceDigest(actual)!==file.sourceSha256)throw Error('VIBE2_COMPLEX_STALE_SOURCE');
  originals.set(file.path,actual);
 }
 for(const node of selected){
  const atom=synthesizeGameChangeAtom({requirement:node,owner:node.owner,file:node.file,target});
  const old=ranges.get(atom.file)||[],span=atom.sourceSpan;
  if(old.some(p=>span.start<p.end&&span.end>p.start))throw Error('VIBE2_COMPLEX_OVERLAPPING_EDIT');
  old.push(span);ranges.set(atom.file,old);atoms.push(atom);
 }
 const edits=normalizeExactEdits(atoms.map(a=>a.sourcePatch));
 if(!edits.length)throw Error('VIBE2_COMPLEX_NO_SOURCE_DELTA');
 const documents=new Map(originals);applyExactEdits(sourceRoot,edits,{documents});
 const cases=atoms.flatMap(a=>a.scenarioProofs.cases.map(c=>({...c,name:a.id+':'+(c.name||'boundary')})));
 return {summary:'소스에 연결된 오너 복합 요구 수정',expectedEffect:'기존 책임 함수 '+atoms.length+'개 변경의 원자적 후보',
  edits,newFiles:[],replaceFiles:[],tests:[],vibe59CodeKind:'COMPLEX_OWNER_INTENT',
  vibe59TestPlan:{pass:atoms.every(a=>a.scenarioProofs.pass),cases,independentGameQa:false},
  vibe59DesignSteps:atoms.map(a=>({id:a.id,dependsOn:a.dependencies,operation:a.operation,ruleDigest:sourceDigest(JSON.stringify(a.typedAst))})),
  complexPlan:{digest:plan.digest,baseRevisionSha:plan.baseRevisionSha,sourceDigest:plan.index.digest,
   requirementCount:plan.intent.requirements.length,boundSymbolCount:new Set(plan.nodes.map(n=>n.owner.id)).size,atomCount:atoms.length,
   completedWave:0,deferredWaves:plan.waves.slice(1),atoms},
  ruleDigest:sourceDigest(JSON.stringify(edits)),sourceWrite:false,modelUsed:false,runtimeVerified:false};
}

// 통합: 정식 catalog 경로와 기존 오너 주문이 없으면 후보를 생성하지 않는다.
export function compileSourceBoundComplexRequest({order={},sourceRoot,responsibleFiles,target,repositoryRoot=process.cwd()}={}){
 const goal=String(order.selectedTask?.goal||order.originalGoal||order.goal||'');
 if(!/(?:^|[;\n])\s*(?:함수\s+|In\s+(?:function\s+)?[A-Za-z_$]|죽은 (?:유닛|공격자|대상|적)|Prevent dead attackers|Do not damage dead targets|상태 (?:변경 후|가 바뀌면)|After changing state|Update the UI and save|서버의 모든 전투 함수|모든 서버 공격 함수|Prevent attacking dead targets)/i.test(goal))return {status:'NOT_APPLICABLE'};
 const baseRevisionSha=String(order.baseRevisionSha||order.baseCommit||order.sourceRevision||process.env.VIBE2_BASE_MAIN_SHA||'');
 try{
  const catalog=JSON.parse(fs.readFileSync(path.join(repositoryRoot,'game-catalog.json'),'utf8'));
  const gameId=String(order.selectedTask?.gameId||order.gameId||'');
  resolveGameSourceScope({repositoryRoot,sourceRoot,gameId,target,catalog});
  const plan=planComplexGameWork({order,sourceRoot,responsibleFiles,target,baseRevisionSha});
  if(plan.status!=='BOUND')return plan;
  const repair=runCodegenCounterexampleRepair({sourceDigest:plan.index.digest,
   failures:order.selectedTask?.vibe59ComplexCounterexamples??order.vibe59ComplexCounterexamples??[],
   generate:()=>createComplexGameCandidate({plan,sourceRoot,target}),
   evaluate:candidate=>({pass:candidate.vibe59TestPlan.pass,actualGamePlaytest:false}),
   maxAttempts:3,approvedBudget:3});
  if(repair.status!=='CANDIDATE_VALIDATED')return {status:'BLOCKED',unresolved:[{code:repair.reason}],repair};
  const candidate={...repair.candidate,complexRepair:{attempts:repair.attempts,actualGamePlaytest:false}};
  return {status:'CANDIDATE',plan,candidate};
 }catch(error){return {status:'BLOCKED',unresolved:[{code:String(error.message)}],sourceWrite:false,modelUsed:false,runtimeVerified:false}}
}
