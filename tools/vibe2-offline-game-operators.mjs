// 파일명: tools/vibe2-offline-game-operators.mjs
// 임포트
import vm from 'node:vm';
import {expressionReferences} from './vibe2-complex-intent.mjs';
import {VIBE59_LUAU_CODING_SKILLS_109} from './vibe59-luau-skills109.mjs';

// 메인: 새 외형·저장 키·경제 값을 만들지 않는 기존 소스 연산 카탈로그.
export const OFFLINE_GAME_SYSTEMS=Object.freeze([
 'input','combat','ai','bestiary','building','inventory','crafting','world','ui','saving','quest','loop',
].map(system=>Object.freeze({system,operations:['guard-return','existing-call','clamp-assignment','conditional-assignment'],
 existingRobloxRecipes:VIBE59_LUAU_CODING_SKILLS_109.filter(s=>s.system===(system==='quest'?'quests':system)).map(s=>s.id),
 newStateOrAssetCreation:false,runtimeVerified:false})));
const forbidden=new Set(['constructor','prototype','__proto__','process','require','globalThis','eval','Function']);
export function renderIntentExpression(node,target='web',depth=0){
 if(!node||depth>12)throw Error('VIBE2_OPERATOR_AST_DEPTH');
 const emit=n=>renderIntentExpression(n,target,depth+1);
 if(node.kind==='ref'){
  if(!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(node.name)||node.name.split('.').some(x=>forbidden.has(x)))throw Error('VIBE2_OPERATOR_REFERENCE');
  return node.name;
 }
 if(node.kind==='number'){if(!Number.isFinite(node.value)||Math.abs(node.value)>1e6)throw Error('VIBE2_OPERATOR_NUMBER');return String(node.value)}
 if(node.kind==='boolean'){if(typeof node.value!=='boolean')throw Error('VIBE2_OPERATOR_BOOLEAN');return String(node.value)}
 if(node.kind==='not')return (target==='web'?'!':'not ')+'('+emit(node.value)+')';
 if(node.kind==='and'||node.kind==='or'){
  if(!Array.isArray(node.items)||node.items.length!==2)throw Error('VIBE2_OPERATOR_BOOLEAN');
  return '('+node.items.map(emit).join(node.kind==='and'?(target==='web'?' && ':' and '):(target==='web'?' || ':' or '))+')';
 }
 if(node.kind==='compare'){
  const map=target==='web'?{'==':'===','===':'===','!=':'!==','!==':'!==','>':'>','>=':'>=','<':'<','<=':'<='}:
   {'==':'==','===':'==','!=':'~=','!==':'~=','>':'>','>=':'>=','<':'<','<=':'<='};
  if(!map[node.op])throw Error('VIBE2_OPERATOR_COMPARISON');
  return '('+emit(node.left)+' '+map[node.op]+' '+emit(node.right)+')';
 }
 throw Error('VIBE2_OPERATOR_AST_KIND');
}
function valueOf(node,state){
 if(node.kind==='ref')return node.name.split('.').reduce((x,k)=>x?.[k],state);
 if(node.kind==='number'||node.kind==='boolean')return node.value;
 if(node.kind==='not')return !valueOf(node.value,state);
 if(node.kind==='and')return valueOf(node.items[0],state)&&valueOf(node.items[1],state);
 if(node.kind==='or')return valueOf(node.items[0],state)||valueOf(node.items[1],state);
 const a=valueOf(node.left,state),b=valueOf(node.right,state);
 return ({'==':()=>a===b,'===':()=>a===b,'!=':()=>a!==b,'!==':()=>a!==b,'>':()=>a>b,'>=':()=>a>=b,'<':()=>a<b,'<=':()=>a<=b}[node.op])();
}

// 검증: IR 해석과 별도로 생성한 JS 식을 격리 실행해 국소 의미만 비교한다.
export function verifyIntentCondition(condition){
 const refs=expressionReferences(condition);if(refs.length>6)throw Error('VIBE2_OPERATOR_REFERENCE_BUDGET');
 const constants=[];
 const walk=n=>{if(n?.kind==='number')constants.push(n.value);for(const v of [n?.value,n?.left,n?.right,...(n?.items||[])])if(v&&typeof v==='object')walk(v)};walk(condition);
 const values=[false,true,-1,0,1,...constants.flatMap(n=>[n-1,n,n+1])];
 const cases=[];
 // Single-variable boundaries plus paired boolean combinations, bounded at 64.
 const inputs=Array.from({length:Math.min(64,Math.max(4,2**refs.length,values.length*refs.length))},(_,i)=>{
  const state=Object.create(null);
  refs.forEach((ref,j)=>{const keys=ref.split('.');let at=state;
   keys.slice(0,-1).forEach(k=>{at[k]??=Object.create(null);at=at[k]});
   at[keys.at(-1)]=i<2**refs.length?Boolean(i&(1<<j)):values[(i+j)%values.length];
  });return state;
 });
 const code=new vm.Script('Boolean('+renderIntentExpression(condition)+')');
 for(const [i,state] of inputs.entries()){
  const expected=Boolean(valueOf(condition,state));
  const actual=code.runInNewContext(state,{timeout:50,contextCodeGeneration:{strings:false,wasm:false}});
  if(actual!==expected)throw Error('VIBE2_OPERATOR_ORACLE_MISMATCH');
  cases.push({name:'condition-'+i,input:JSON.parse(JSON.stringify(state)),expected});
 }
 return {pass:true,cases,authority:'LOCAL_INTENT_EXPRESSION_ORACLE',independentGameQa:false,actualGamePlaytest:false};
}

export function synthesizeGameChangeAtom({requirement,owner,file,target}){
 const r=requirement,source=file.source,body=file.code.slice(owner.bodyStart,owner.bodyEnd);
 if(owner.ambiguous||owner.unsupported.length)throw Error('VIBE2_OPERATOR_UNSUPPORTED_OWNER');
 // Roblox 클라이언트 코드는 서버 원본의 RemoteEvent 송신까지 증명된 UI-only 연결일 때만 허용한다.
 if(target==='roblox'&&!/(?:^|\/)(?:server|ServerScriptService)\/|\.server\.lua[u]?$/i.test(file.path)&&
  !(r.operation==='existing-call'&&r.derivation==='EXISTING_REMOTE_SERVER_TO_CLIENT_UI'&&
    /(?:^|\/)client\/|\.client\.lua[u]?$/i.test(file.path)&&
    r.boundSymbols?.some(symbol=>/(?:^|\/)(?:server|ServerScriptService)\/|\.server\.lua[u]?$/i.test(symbol.path))))
  throw Error('VIBE2_OPERATOR_SERVER_ONLY');
 const prefix=source.slice(owner.start,owner.insertionOffset??owner.bodyStart),indent='  ';
 let edit,proof,effects=[];
 if(r.operation==='guard-return'){
  const condition=renderIntentExpression(r.condition,target);
  const statement=target==='web'?'if ('+condition+') return;':'if '+condition+' then return end';
  if(body.includes(statement))throw Error('VIBE2_OPERATOR_NO_SOURCE_DELTA');
  edit={path:file.path,find:prefix,replace:prefix+'\n'+indent+statement};
  proof=verifyIntentCondition(r.condition);effects=['CONTROL_FLOW_EARLY_RETURN'];
 }else if(r.operation==='existing-call'){
  // 실제 소스 인덱스가 증명한 호출 위치와 단순 인자만 사용한다. 표현식이나 문자열 인자는 추측하지 않는다.
  const at=r.afterCallStart,anchorArgs=r.afterCallArguments;
  if(!Number.isSafeInteger(at)||at<owner.bodyStart||at>=owner.bodyEnd||!Array.isArray(anchorArgs))
   throw Error('VIBE2_OPERATOR_CALL_ANCHOR');
  const literal=value=>value.replace(/[.$]/g,part=>'\\'+part);
  const re=new RegExp('^'+literal(r.after)+'\\s*\\(\\s*'+anchorArgs.map(literal).join('\\s*,\\s*')+
   '\\s*\\)'+(target==='web'?'\\s*;':''));
  const match=re.exec(source.slice(at,owner.bodyEnd));
  if(!match)throw Error('VIBE2_OPERATOR_CALL_ANCHOR');
  // [메인] 기존 호출 뒤 같은 책임 범위의 여러 실제 함수를 하나의 원자적 수정안으로 연결한다.
  const find=source.slice(owner.start,at+match[0].length);
  const orderedCalls=r.orderedCalls||[{callee:r.callee,forwardedArguments:r.forwardedArguments||[]}];
  if(!orderedCalls.length||orderedCalls.some(call=>!Array.isArray(call.forwardedArguments)))
   throw Error('VIBE2_OPERATOR_CALL_BINDING');
  const lines=orderedCalls.map(call=>indent+call.callee+'('+call.forwardedArguments.join(', ')+')'+(target==='web'?';':''));
  edit={path:file.path,find,replace:find+'\n'+lines.join('\n')};
  proof={pass:true,cases:[
   ...orderedCalls.map((call,i)=>({name:i?'ordered-existing-call-'+(i+1):'ordered-existing-call',
    after:i?orderedCalls[i-1].callee:r.after,callee:call.callee,forwardedArguments:call.forwardedArguments})),
   {name:'unchanged-owner',symbol:owner.id}
  ],authority:'SOURCE_CALL_ORDER_ONLY',independentGameQa:false,actualGamePlaytest:false};
  effects=orderedCalls.map(call=>'CALL_EXISTING_FUNCTION:'+call.callee);
 }else if(r.operation==='clamp-assignment'){
  const escaped=r.output.replaceAll('.','\\.'),re=new RegExp('(?<![\\w$.])'+escaped+'[ \\t]*=[ \\t]*([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*|-?\\d+(?:\\.\\d+)?)[ \\t]*'+(target==='web'?';':'(?=\\r?\\n|$)'),'g');
  const matches=[...body.matchAll(re)];if(matches.length!==1)throw Error('VIBE2_OPERATOR_ASSIGNMENT_ANCHOR');
  const match=matches[0],at=owner.bodyStart+match.index,find=source.slice(at,at+match[0].length);
  if(/\b(?:Math|math)\b(?!\s*\.)/.test(file.code))throw Error('VIBE2_OPERATOR_SHADOWED_BUILTIN');
  const rhs=target==='web'?'Math.min('+r.maximum+', Math.max('+r.minimum+', '+match[1]+'))':'math.clamp('+match[1]+', '+r.minimum+', '+r.maximum+')';
  edit={path:file.path,find,replace:r.output+' = '+rhs+(target==='web'?';':'')};
  proof={pass:true,cases:[r.minimum-1,r.minimum,(r.minimum+r.maximum)/2,r.maximum,r.maximum+1].map(input=>({input,expected:Math.min(r.maximum,Math.max(r.minimum,input))})),authority:'LOCAL_BOUNDARY_ORACLE',independentGameQa:false,actualGamePlaytest:false};effects=['WRITE_EXISTING_FIELD:'+r.output];
 }else if(r.operation==='conditional-assignment'){
  const statement=r.output+' = '+renderIntentExpression(r.value,target)+(target==='web'?';':'');
  const condition=renderIntentExpression(r.condition,target);
  edit={path:file.path,find:prefix,replace:prefix+'\n'+indent+(target==='web'?'if ('+condition+') { '+statement+' }':'if '+condition+' then '+statement+' end')};
  proof=verifyIntentCondition(r.condition);effects=['WRITE_EXISTING_FIELD:'+r.output];
 }else throw Error('VIBE2_OPERATOR_CAPABILITY_GAP');
 if(source.split(edit.find).length!==2)throw Error('VIBE2_OPERATOR_NONUNIQUE_ANCHOR');
 return {id:r.id,operation:r.operation,file:file.path,beforeSha256:file.sourceSha256,
  ownerSymbol:owner.id,sourceSpan:{start:source.indexOf(edit.find),end:source.indexOf(edit.find)+edit.find.length},
  requirementIds:r.requirementIds||[r.id],ownerTexts:r.ownerTexts||[r.ownerText],derivation:r.derivation||'EXPLICIT_SOURCE_SYMBOL',
  inputSymbols:r.boundSymbols,outputSymbols:r.output?[r.output]:[],dependencies:r.dependsOn,
  effects,invariants:r.invariants,scenarioProofs:proof,sourcePatch:edit,
  authoritativeOwnerScope:r.ownerScope,typedAst:{condition:r.condition,output:r.output,value:r.value},runtimeVerified:false};
}
