// 파일명: tools/vibe2-complex-intent.mjs
// [임포트] 외부 AI 없이 오너 원문에서 제한된 인과 요청을 추출한다.
import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const identifier='([A-Za-z_$][A-Za-z0-9_$]{0,63})';
const english=new RegExp('^when\\s+(?:function\\s+)?'+identifier+'\\s*(?:\\(\\))?\\s+(?:runs|finishes|completes)\\s*,?\\s*call\\s+'+identifier+'\\s*(?:\\(\\))?\\s+(?:then|and)\\s+'+identifier+'\\s*(?:\\(\\))?\\.?$','i');
const korean=new RegExp('^함수\\s+'+identifier+'\\s+실행\\s*후\\s+'+identifier+'\\s+(?:다음|그리고)\\s+'+identifier+'\\s+호출(?:해|해줘|해주세요)?\\.?$');
const protectedNames=new Set(['constructor','prototype','__proto__','eval','Function','require','import']);

export function compileVibe2ComplexIntent({order={},target='',sourceRoot='',responsibleFiles=[],baseCommit=''}={}){
  const task=order.selectedTask||{};
  const goal=String(task.goal||order.originalGoal||order.goal||'').trim();
  if(!['web','roblox'].includes(target)||!goal||goal.length>640||
    /[\r\n\x00-\x1f\`{}]/.test(goal))return null;
  // [메인] 세미콜론으로 구분된 최대 4개 명시 지시만 해석한다. 임의 문장을 보완하지 않는다.
  const clauses=goal.split(';').map(text=>text.trim());
  if(clauses.length>4||clauses.some(text=>!text||text.length>320))return null;
  const steps=clauses.map(text=>{
    const match=english.exec(text)||korean.exec(text);
    return match?{ownerText:text,trigger:match[1],effects:match.slice(2)}:null;
  });
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
      dependsOn:index?[hash(requestId+'|'+group+'|0|'+step.effects[0])]:[],
      actors:[step.trigger,effect],preconditions:['existing-original-function','unique-owner-scope'],
      invariants:['no-save-schema-change','no-new-assets','no-unrelated-game-change'],
      acceptanceScenarios:['original-handler-preserved','once-per-completion','call-order'],
      stateOwnership:target==='roblox'?'ORIGINAL_LUAU_SCOPE':'ORIGINAL_WEB_SCOPE',
      boundSymbols:[],status:'UNBOUND'
    }))),
    unknowns:[],ambiguous:[],missingGrounding:[]
  });
}
