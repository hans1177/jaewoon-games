// 파일명: tools/vibe2-complex-intent.mjs
// [임포트] 외부 AI 없이 오너 원문에서 제한된 인과 요청을 추출한다.
import crypto from 'node:crypto';
import {sourceDigest} from './vibe2-game-source-index.mjs';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const identifier='([A-Za-z_$][A-Za-z0-9_$]{0,63})';
const english=new RegExp('^when\\s+(?:function\\s+)?'+identifier+'\\s*(?:\\(\\))?\\s+(?:runs|finishes|completes)\\s*,?\\s*call\\s+(.+?)\\.?$','i');
const korean=new RegExp('^함수\\s+'+identifier+'\\s+실행\\s*후\\s+(.+?)\\s+호출(?:해|해줘|해주세요)?\\.?$');
const effectIdentifier=new RegExp('^'+identifier+'(?:\\(\\))?$');
// 기존 함수 호출만 2~4개, 원문 순서 그대로. 미지의 문장·인자는 추측하지 않는다.
function extractExistingChain(text){
  const en=english.exec(text),ko=en?null:korean.exec(text);
  if(!en&&!ko)return null;
  const match=en||ko;
  // 호출 순서만 추출한다. 연결어 사이에 명시된 기존 함수 이름 외에는 새 인자를 추정하지 않는다.
  const parts=match[2].replace(/\.$/,'').split(en?
    /\s*,\s*(?:(?:then|and)\s+)?|\s+(?:then|and)\s+/i:
    /\s*호출(?:한)?\s*(?:하고|후|뒤|다음)\s*|\s+(?:다음|그리고)\s+/);
  if(parts.length<2||parts.length>4)return null;
  const names=parts.map(part=>effectIdentifier.exec(part.trim())?.[1]);
  if(names.some(name=>!name))return null;
  return {ownerText:text,trigger:match[1],effects:names};
}
const protectedNames=new Set(['constructor','prototype','__proto__','eval','Function','require','import']);

export function compileVibe2ComplexIntent({order={},target='',sourceRoot='',responsibleFiles=[],baseCommit=''}={}){
  const task=order.selectedTask||{};
  const goal=String(task.goal||order.originalGoal||order.goal||'').trim();
  if(!['web','roblox'].includes(target)||!goal||goal.length>640||
    /[\r\n\x00-\x1f\`{}]/.test(goal))return null;
  // [메인] 세미콜론으로 구분된 최대 4개 명시 지시만 해석한다. 임의 문장을 보완하지 않는다.
  const clauses=goal.split(';').map(text=>text.trim());
  if(clauses.length>4||clauses.some(text=>!text||text.length>320))return null;
  const steps=clauses.map(extractExistingChain);
  if(steps.some(step=>!step))return null; // 알 수 없는 자연어는 추정하지 않고 거절.
  const names=steps.flatMap(step=>[step.trigger,...step.effects]);
  if(task.ownerDirective!==true&&order.ownerApproved!==true)
    throw Error('VIBE2_COMPLEX_OWNER_DIRECTIVE_REQUIRED');
  if(new Set(names).size!==names.length||
    names.some(name=>protectedNames.has(name)))
    throw Error('VIBE2_COMPLEX_FUNCTIONS_INVALID');
  const gameId=String(task.gameId||order.gameId||'').trim();
  if(!gameId||!/^[a-z0-9][a-z0-9-]{0,70}$/.test(gameId)||
    !sourceRoot||!Array.isArray(responsibleFiles)||!responsibleFiles.length)
    throw Error('VIBE2_COMPLEX_GAME_SCOPE_REQUIRED');
  const requestId=hash([gameId,target,goal,baseCommit].join('|'));
  return Object.freeze({
    schemaVersion:'vibe2-complex-intent-v1',requestId,gameId,target,
    ownerDirectiveReference:{originalText:goal,verifiedFromOwnerOrder:true},
    allowedGameRoot:sourceRoot,authorizedFiles:[...responsibleFiles],
    baseCommit:String(baseCommit),sourceWrite:false,runtimeVerified:false,
    requirements:steps.flatMap((step,group)=>step.effects.map((effect,index)=>({
      id:hash(requestId+'|'+group+'|'+index+'|'+effect),ownerText:step.ownerText,
      system:'existing-function-chain',event:'function-completion',
      group,trigger:step.trigger,effect,
      dependsOn:index?[hash(requestId+'|'+group+'|'+(index-1)+'|'+step.effects[index-1])]:[],
      actors:[step.trigger,effect],preconditions:['existing-original-function','unique-owner-scope'],
      invariants:['no-save-schema-change','no-new-assets','no-unrelated-game-change'],
      acceptanceScenarios:['original-handler-preserved','once-per-completion','call-order'],
      stateOwnership:target==='roblox'?'ORIGINAL_LUAU_SCOPE':'ORIGINAL_WEB_SCOPE',
      boundSymbols:[],status:'UNBOUND'
    }))),
    unknowns:[],ambiguous:[],missingGrounding:[]
  });
}


const name='[A-Za-z_$][\\w$]*';
const bad=new Set(['__proto__','prototype','constructor','eval','Function','globalThis','process','require']);

// 유틸: 소스나 사용자 문자열을 실행하지 않는 제한된 타입 식 파서.
export function parseIntentExpression(text){
 const input=String(text).replace(/\s+또는\s+|\s+or\s+/g,' || ').replace(/\s+그리고\s+|\s+and\s+/g,' && ').replace(/\bnot\s+/g,'!');
 const tokens=input.match(/\s+|(?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*|-?\d+(?:\.\d+)?|===|!==|==|!=|>=|<=|&&|\|\||[!><()]/g)||[];
 if(tokens.join('')!==input||tokens.length>100)throw Error('VIBE2_INTENT_UNSUPPORTED_EXPRESSION');
 const ts=tokens.filter(t=>t.trim());let at=0;
 function atom(){
  const token=ts[at++];
  if(token==='!')return {kind:'not',value:atom()};
  if(token==='('){const node=or();if(ts[at++]!==')')throw Error('VIBE2_INTENT_EXPRESSION_PAREN');return node}
  if(token==='true'||token==='false')return {kind:'boolean',value:token==='true'};
  if(token&&/^-?\d/.test(token)){const value=Number(token);if(!Number.isFinite(value)||Math.abs(value)>1e6)throw Error('VIBE2_INTENT_NUMBER');return {kind:'number',value}}
  if(!token||!new RegExp('^'+name+'(?:\\.'+name+')*$').test(token)||token.split('.').some(x=>bad.has(x)))throw Error('VIBE2_INTENT_REFERENCE');
  return {kind:'ref',name:token};
 }
 function compare(){let left=atom();if(['==','===','!=','!==','>','>=','<','<='].includes(ts[at])){const op=ts[at++];left={kind:'compare',op,left,right:atom()}}return left}
 function and(){let value=compare();while(ts[at]==='&&'){at++;value={kind:'and',items:[value,compare()]}}return value}
 function or(){let value=and();while(ts[at]==='||'){at++;value={kind:'or',items:[value,and()]}}return value}
 const ast=or();if(at!==ts.length)throw Error('VIBE2_INTENT_EXPRESSION_TRAILING');return ast;
}
export function expressionReferences(ast){
 if(ast.kind==='ref')return [ast.name];
 return [...new Set([...(ast.items||[]),ast.value,ast.left,ast.right].filter(x=>x&&typeof x==='object').flatMap(expressionReferences))];
}

// 메인: 승인 사실은 기존 오너 주문에서 복사한다. 해석 결과로 승인을 만들지 않는다.
export function compileComplexOwnerIntent({order={},target='web',baseRevisionSha=''}={}){
 const task=order.selectedTask||{},text=String(task.goal||order.originalGoal||order.goal||'').trim();
 const gameId=String(task.gameId||order.gameId||'');
 const approval=task.ownerDirective===true||order.ownerApproved===true;
 const reference=String(task.ownerDirectiveId||order.ownerDirectiveId||order.taskId||sourceDigest(text));
 const result={schemaVersion:'vibe2-complex-intent-v1',requestId:sourceDigest(JSON.stringify([gameId,target,text,reference])),
  gameId,target,baseRevisionSha,ownerDirectiveReference:{originalText:String(order.originalGoal||text),
   interpretedText:text,derivedFromOwnerRequest:Boolean(order.originalGoal&&order.originalGoal!==text),
   verifiedFromOwnerOrder:approval,reference},
  requirements:[],unresolved:[],sourceWrite:false,modelUsed:false,runtimeVerified:false};
 if(!approval)result.unresolved.push({code:'NO_OWNER_SPEC'});
 if(!text||text.length>16000||!['web','roblox'].includes(target))result.unresolved.push({code:'INVALID_REQUEST'});
 const clauses=text.split(/[;\n]+/).map(x=>x.trim().replace(/[.!。]$/,'')).filter(Boolean);
 if(clauses.length>48){result.unresolved.push({code:'REQUIREMENT_BUDGET'});return result}
 for(const ownerText of clauses){
  let m,operation,functionName,callback,condition,output,value,minimum,maximum,after,callee,callees,semantic;
  try{
   if(/^(?:죽은 (?:유닛|공격자)(?:은|는) 공격하지 않게 해|Prevent dead attackers from attacking)$/i.test(ownerText)){
    operation='semantic-guard';semantic='dead-attacker';
   }else if(/^(?:죽은 (?:대상|적)(?:은|는) 다시 공격하지 않게 해|Do not damage dead targets)$/i.test(ownerText)){
    operation='semantic-guard';semantic='dead-target';
   }else if((m=new RegExp('^함수 ('+name+')(?:의 ('+name+') 반복)?에서 (.+?)(?:이면|일 때) 중단(?:해|해줘|하라|해주세요)?$').exec(ownerText))){
    [,functionName,callback]=m;operation='guard-return';condition=parseIntentExpression(m[3]);
   }else if((m=new RegExp('^In (?:function )?('+name+')(?: callback ('+name+'))?,? return when (.+)$','i').exec(ownerText))){
    [,functionName,callback]=m;operation='guard-return';condition=parseIntentExpression(m[3]);
   }else if((m=new RegExp('^함수 ('+name+')에서 ('+name+') 호출 뒤 ('+name+') 호출하고 ('+name+')(?:을|를)? 호출(?:해|해줘|하라|해주세요)?$').exec(ownerText))||
     (m=new RegExp('^In (?:function )?('+name+'),? after ('+name+') call ('+name+') then ('+name+')$','i').exec(ownerText))){
    [,functionName,after,callee]=m;callees=[m[3],m[4]];operation='existing-call';
   }else if((m=new RegExp('^함수 ('+name+')에서 ('+name+') 호출 뒤 ('+name+')(?:을|를) 호출(?:해|해줘|하라|해주세요)?$').exec(ownerText))||
     (m=new RegExp('^In (?:function )?('+name+'),? after ('+name+') call ('+name+')$','i').exec(ownerText))){
    [,functionName,after,callee]=m;operation='existing-call';
   }else if((m=new RegExp('^함수 ('+name+')에서 ('+name+'(?:\\.'+name+')*)(?:을|를) (-?\\d+(?:\\.\\d+)?)에서 (-?\\d+(?:\\.\\d+)?)(?:까지)? 제한(?:해|해줘|하라|해주세요)?$').exec(ownerText))||
     (m=new RegExp('^In (?:function )?('+name+'),? clamp ('+name+'(?:\\.'+name+')*) between (-?\\d+(?:\\.\\d+)?) and (-?\\d+(?:\\.\\d+)?)$','i').exec(ownerText))){
    [,functionName,output]=m;minimum=Number(m[3]);maximum=Number(m[4]);operation='clamp-assignment';
    if(!Number.isFinite(minimum)||!Number.isFinite(maximum)||minimum>=maximum||minimum< -1e6||maximum>1e6)throw Error('range');
   }else if((m=new RegExp('^함수 ('+name+')에서 (.+?)이면 ('+name+'(?:\\.'+name+')*)(?:을|를) (true|false|-?\\d+(?:\\.\\d+)?)로 설정(?:해|해줘|하라|해주세요)?$').exec(ownerText))){
    functionName=m[1];condition=parseIntentExpression(m[2]);output=m[3];value=parseIntentExpression(m[4]);operation='conditional-assignment';
   }else{result.unresolved.push({code:'UNSUPPORTED_OPERATOR',ownerText});continue}
   const id='req-'+sourceDigest(ownerText).slice(0,16);
   if(result.requirements.some(r=>r.id===id)){result.unresolved.push({code:'DUPLICATE_REQUIREMENT',ownerText});continue}
   result.requirements.push({id,ownerText,functionName,callback,operation,semantic,condition,output,value,minimum,maximum,after,callee,callees,
    dependsOn:[],boundSymbols:[],acceptanceScenarios:[],invariants:['PRESERVE_SAVE_KEYS','NO_UNDECLARED_STATE_WRITE','NO_ASSET_CREATION'],
    stateOwnership:target==='roblox'?'EXISTING_SERVER_OWNER':'EXISTING_WEB_OWNER',status:'UNBOUND'});
  }catch{result.unresolved.push({code:'AMBIGUOUS_EXPRESSION',ownerText})}
 }
 if(!result.requirements.length&&!result.unresolved.length)result.unresolved.push({code:'NO_OWNER_SPEC'});
 return result;
}
