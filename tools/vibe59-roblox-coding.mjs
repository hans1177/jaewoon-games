// Vibe5.9 Roblox-native coding. Read-only Lua source analysis and bounded code synthesis.
// Native Luau compiler, Studio gameplay, authorization and release still need independent QA.
const ID=/^[A-Za-z_][A-Za-z0-9_]*$/;
const BLOCKED=new Set(['player','eventName','state','script','game','workspace',
'function','local','if','then','else','end','return','for','while','nil','true','false','not','and','or']);
function identifier(x,label){if(typeof x!=='string'||!ID.test(x)||BLOCKED.has(x))
throw Error('VIBE59_ROBLOX_BAD_IDENTIFIER:'+label);return x}
function numeric(x){if(typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e9)
throw Error('VIBE59_ROBLOX_BAD_NUMBER');return x}
export function classifyVibe59RobloxScript(path=''){
  const x=String(path).replaceAll('\\','/');
  if(/(?:^|\/)(?:ServerScriptService|ServerStorage|server)(?:\/|$)|\.server\.lua(?:u)?$/i.test(x))return 'SERVER';
  if(/(?:^|\/)(?:StarterPlayerScripts|StarterCharacterScripts|StarterGui|PlayerGui|client)(?:\/|$)|\.client\.lua(?:u)?$/i.test(x))return 'CLIENT';
  return 'UNKNOWN';
}
const RULE_TABLE=Object.freeze([["ai","AI_BUSY_LOOP","ANY","while\\s+true\\s+do(?:(?!task\\.wait\\s*\\(|\\bwait\\s*\\()[\\s\\S]){0,320}?\\bend\\b","반복 대기·종료 조건 확인"],["ai","AI_HEARTBEAT_REPATH","ANY","Heartbeat\\s*:\\s*Connect\\s*\\([\\s\\S]{0,500}?CreatePath\\s*\\(","경로 탐색 빈도 제한"],["ai","AI_HEARTBEAT_MOVETO","ANY","Heartbeat\\s*:\\s*Connect\\s*\\([\\s\\S]{0,450}?:MoveTo\\s*\\(","몬스터 이동 명령 빈도 제한"],["ai","AI_CLIENT_PATH_AUTHORITY","CLIENT","PathfindingService[\\s\\S]{0,140}?CreatePath\\s*\\(","서버 NPC 이동 권한 확인"],["ai","AI_UNCHECKED_ROOT_POSITION","ANY","FindFirstChild\\s*\\(\\s*[\"']HumanoidRootPart[\"']\\s*\\)\\s*\\.Position","루트 파트 없음 검사"],["ai","AI_UNBOUNDED_CLONE","SERVER","while\\s+true\\s+do[\\s\\S]{0,420}?:Clone\\s*\\(","몬스터 생성량 제한"],["ai","AI_FRAME_INSTANCE","ANY","Heartbeat\\s*:\\s*Connect\\s*\\([\\s\\S]{0,420}?Instance\\.new\\s*\\(","프레임별 객체 생성 제한"],["ai","AI_MOVE_RESULT_UNCHECKED","SERVER",":\\s*MoveTo\\s*\\([^\\n]*\\)","이동 실패와 장애물 처리 확인"],["combat","COMBAT_CLIENT_DAMAGE","CLIENT",":\\s*TakeDamage\\s*\\(","서버 피해 판정"],["combat","COMBAT_CLIENT_HEALTH_WRITE","CLIENT","\\.Health\\s*(?:=|\\+=|-=)","서버 체력 갱신"],["combat","COMBAT_CLIENT_KILL_REWARD","CLIENT","(?:Kills|KillCount|Gold|Coins)\\.Value\\s*\\+=","서버 보상 처리"],["combat","COMBAT_CLIENT_DAMAGE_REMOTE","CLIENT",":\\s*FireServer\\s*\\(\\s*(?:damage|attackDamage|hitDamage)\\b","클라이언트 피해 수치 검증"],["combat","COMBAT_TOUCH_DAMAGE","SERVER","Touched\\s*:\\s*Connect\\s*\\([\\s\\S]{0,500}?:TakeDamage\\s*\\(","연속 접촉 피해 중복 확인"],["combat","COMBAT_INFINITE_DAMAGE","ANY",":\\s*TakeDamage\\s*\\(\\s*math\\.huge","무한 데미지 차단"],["combat","COMBAT_NEGATIVE_DAMAGE","ANY",":\\s*TakeDamage\\s*\\(\\s*-\\s*\\d","음수 데미지 차단"],["combat","COMBAT_CLIENT_HEAL_WRITE","CLIENT","\\.Health\\s*\\+=","서버 치유 판정"],["combat","COMBAT_REMOTE_DIRECT_DAMAGE","SERVER","OnServerEvent\\s*:\\s*Connect\\s*\\([\\s\\S]{0,650}?:TakeDamage\\s*\\(","공격 거리·재사용시간 검증"],["building","BUILD_CLIENT_WORLD_PARENT","CLIENT","(?:build|blueprint|placement)\\w*\\s*\\.Parent\\s*=\\s*workspace\\b","미리보기와 실제 설치 분리"],["building","BUILD_CLIENT_PIVOT","CLIENT","(?:building|structure|placedModel)\\s*:\\s*PivotTo\\s*\\(","서버 설치 위치 확인"],["building","BUILD_CLIENT_CFRAME","CLIENT","(?:building|structure|placedModel)\\.CFrame\\s*=","건축 좌표 서버 재검증"],["building","BUILD_REMOTE_CFRAME","CLIENT",":\\s*FireServer\\s*\\(\\s*(?:[\"'](?:build|place)[\"']\\s*,\\s*)?CFrame\\.new\\s*\\(","요청 좌표 재검증"],["building","BUILD_INVISIBLE_FINAL","ANY","(?:building|structure|placedModel)\\.Transparency\\s*=\\s*1\\b","설치물 가시성 확인"],["building","BUILD_UNANCHORED_PART","SERVER","Instance\\.new\\s*\\(\\s*[\"']Part[\"']\\s*\\)[\\s\\S]{0,280}?\\.Parent\\s*=\\s*workspace","고정·물리 충돌 확인"],["building","BUILD_UNSCOPED_DESTROY","SERVER","(?:building|structure|placedModel)\\s*:\\s*Destroy\\s*\\(","철거 소유권 확인"],["building","BUILD_REMOTE_POSITION","SERVER","OnServerEvent\\s*:\\s*Connect\\s*\\([\\s\\S]{0,500}?:PivotTo\\s*\\(","설치 허용 지역·충돌 확인"],["inventory","INVENTORY_CLIENT_TOOL_GRANT","CLIENT","Instance\\.new\\s*\\(\\s*[\"']Tool[\"']\\s*\\)","서버 아이템 지급"],["inventory","INVENTORY_CLIENT_QUANTITY","CLIENT","(?:inventory|items)\\s*\\[[^\\n]{1,90}\\]\\s*(?:=|\\+=|-=)","서버 아이템 수량 확인"],["inventory","INVENTORY_CLIENT_COIN_ATTRIBUTE","CLIENT","SetAttribute\\s*\\(\\s*[\"'](?:Coins|Gold|Money|Currency)[\"']","서버 재화 권한"],["inventory","INVENTORY_CLIENT_INVENTORY_ATTRIBUTE","CLIENT","SetAttribute\\s*\\(\\s*[\"']Inventory[\"']","서버 인벤토리 권한"],["inventory","INVENTORY_NEGATIVE_QUANTITY","ANY","(?:quantity|amount|stack)\\s*=\\s*-\\s*\\d","수량 하한 검증"],["inventory","INVENTORY_UNGUARDED_REMOVE","ANY","table\\.remove\\s*\\(\\s*(?:inventory|items)\\s*,","삭제 인덱스 확인"],["inventory","INVENTORY_UNBOUNDED_STACK","SERVER","(?:stack|quantity|itemCount)\\s*\\+=\\s*(?:amount|count|quantity|\\d+)","스택 상한 확인"],["inventory","INVENTORY_REMOTE_GRANT","SERVER","OnServerEvent\\s*:\\s*Connect\\s*\\([\\s\\S]{0,550}?Backpack[\\s\\S]{0,120}?Parent\\s*=","지급 요청 검증"],["bestiary","BESTIARY_CLIENT_DISCOVERY","CLIENT","(?:bestiary|discovered|monsterDex)\\s*\\[[^\\n]{1,90}\\]\\s*=\\s*true","도감 등록 서버 확인"],["bestiary","BESTIARY_CLIENT_KILL_COUNT","CLIENT","(?:KillCount|killCount|monsterKills)\\s*\\+=","실제 처치 확인"],["bestiary","BESTIARY_CLICK_KILL","ANY","MouseClick\\s*:\\s*Connect\\s*\\([\\s\\S]{0,400}?(?:killCount|monsterKills)\\s*\\+=","클릭과 처치 분리"],["bestiary","BESTIARY_NAME_AS_KEY","SERVER","(?:bestiary|discovered)\\s*\\[\\s*(?:monster|target)\\.Name\\s*\\]","안정적인 몬스터 종류 ID"],["bestiary","BESTIARY_CLIENT_DIED","CLIENT","Humanoid\\.Died\\s*:\\s*Connect\\s*\\([\\s\\S]{0,450}?(?:bestiary|discovered)","사망 확인 서버 처리"],["bestiary","BESTIARY_RESET_ON_JOIN","SERVER","PlayerAdded\\s*:\\s*Connect\\s*\\([\\s\\S]{0,350}?(?:bestiary|discovered)\\s*=\\s*\\{\\s*\\}","도감 불러오기 보존"],["bestiary","BESTIARY_HIT_IS_KILL","ANY",":\\s*TakeDamage\\s*\\([\\s\\S]{0,260}?(?:killCount|monsterKills)\\s*\\+=","타격과 실제 사망 구분"],["bestiary","BESTIARY_HIDDEN_NAME","CLIENT","(?:nameLabel|monsterName|speciesLabel)\\.TextTransparency\\s*=\\s*1\\b","몬스터 이름 표시 확인"],["saving","SAVE_CLIENT_SERVICE","CLIENT","GetService\\s*\\(\\s*[\"']DataStoreService[\"']","저장은 서버 전용"],["saving","SAVE_CLIENT_READ","CLIENT",":\\s*GetAsync\\s*\\(","서버에서 저장 읽기"],["saving","SAVE_CLIENT_WRITE","CLIENT",":\\s*(?:SetAsync|UpdateAsync)\\s*\\(","서버에서 저장 쓰기"],["saving","SAVE_FRAME_WRITE","SERVER","Heartbeat\\s*:\\s*Connect\\s*\\([\\s\\S]{0,500}?:(?:SetAsync|UpdateAsync)\\s*\\(","매 프레임 저장 방지"],["saving","SAVE_NAME_KEY","SERVER",":\\s*(?:GetAsync|SetAsync|UpdateAsync)\\s*\\(\\s*(?:player|plr)\\.Name\\b","안정적 저장 키 확인"],["saving","SAVE_UNGUARDED_SET","SERVER",":\\s*SetAsync\\s*\\(","저장 오류 처리·원자성 검토"],["saving","SAVE_JOIN_BLANK_INIT","SERVER","PlayerAdded\\s*:\\s*Connect\\s*\\([\\s\\S]{0,400}?(?:savedData|playerData)\\s*=\\s*\\{\\s*\\}","불러온 데이터 보호"],["saving","SAVE_UNBOUNDED_RETRY","SERVER","while\\s+true\\s+do[\\s\\S]{0,360}?:(?:GetAsync|SetAsync|UpdateAsync)\\s*\\(","저장 재시도 제한"],["saving","SAVE_CLIENT_CLEAR","CLIENT","(?:bestiary|inventory|progress|playerData)\\s*=\\s*\\{\\s*\\}","진행도 덮어쓰기 차단"]]);

// [루아우 진단] AI 불필요. 게임 수정 대신 원인·책임 파일·검토 위치를 산출한다.
export const VIBE59_ROBLOX_OFFLINE_RULES=Object.freeze(RULE_TABLE.map(
  ([system,id,side,pattern,repair])=>Object.freeze({id,system,side,pattern,repair})
));
function stripVibe59LuauComments(source){
  let result='',i=0,quoted=null;
  const blank=c=>c==='\n'||c==='\r'?c:' ';
  while(i<source.length){
    const c=source[i],next=source[i+1];
    if(quoted){
      result+=c;i++;
      if(c==='\\'&&i<source.length){result+=source[i++];continue}
      if(c===quoted)quoted=null;
      continue;
    }
    if(c==='"'||c==="'"){quoted=c;result+=c;i++;continue}
    if(c==='-'&&next==='-'){
      const opening=/^\[(=*)\[/.exec(source.slice(i+2,i+20));
      if(opening){
        const closing=']'+opening[1]+']',end=source.indexOf(closing,i+2+opening[0].length);
        const stop=end<0?source.length:end+closing.length;
        while(i<stop)result+=blank(source[i++]);
        continue;
      }
      while(i<source.length&&source[i]!=='\n')result+=blank(source[i++]);
      continue;
    }
    result+=c;i++;
  }
  return result;
}
function insideVibe59QuotedText(source,index){
  let quote=null;
  for(let i=0;i<index;i++){
    const c=source[i];
    if(quote){if(c==='\\'){i++;continue}if(c===quote)quote=null}
    else if(c==='"'||c==="'")quote=c;
  }
  return quote!==null;
}
export function diagnoseVibe59RobloxOffline({path='',source=''}={}){
  const side=classifyVibe59RobloxScript(path);
  if(typeof source!=='string'||source.length>260000||!/\.(?:lua|luau)$/i.test(String(path)))
    throw Error('VIBE59_ROBLOX_DIAGNOSTIC_SOURCE');
  const code=stripVibe59LuauComments(source),diagnostics=[];
  for(const rule of VIBE59_ROBLOX_OFFLINE_RULES){
    if(rule.side!=='ANY'&&rule.side!==side)continue;
    let matched=0;
    for(const hit of code.matchAll(new RegExp(rule.pattern,'g'))){
      if(insideVibe59QuotedText(code,hit.index))continue;
      diagnostics.push({path,side,line:code.slice(0,hit.index).split('\n').length,
        code:rule.id,system:rule.system,repair:rule.repair,status:'REVIEW_REQUIRED',
        runtimeVerified:false});
      if(++matched===2||diagnostics.length===120)break;
    }
    if(diagnostics.length===120)break;
  }
  return Object.freeze({path,side,diagnostics,
    checkedRules:VIBE59_ROBLOX_OFFLINE_RULES.filter(x=>x.side==='ANY'||x.side===side).length,
    modelUsed:false,sourceWrite:false,runtimeVerified:false,authority:'static-review-only'});
}
export function planVibe59RobloxOfflineRepairs({files=[],responsiblePaths=[]}={}){
  const inspection=inspectVibe59RobloxCoding({files,responsiblePaths});
  return Object.freeze({plans:inspection.diagnostics.filter(x=>x.responsible)
    .map(row=>({path:row.path,line:row.line,code:row.code,system:row.system,
      review:row.repair,ownerApprovalRequired:true,sourceChange:false}))
    .slice(0,120),modelUsed:false,sourceWrite:false,runtimeVerified:false,
    authority:'responsible-file-review-plan-only'});
}

export function inspectVibe59RobloxCoding({files=[],responsiblePaths=[]}={}){
  if(!Array.isArray(files)||files.length>48)throw Error('VIBE59_ROBLOX_SCAN_LIMIT');
  const owners=new Set(responsiblePaths),result=[],warnings=[],diagnostics=[];
  for(const file of files.slice(0,48)){
    const path=String(file?.path||''),source=String(file?.source||'');
    if(!/\.(?:luau|lua)$/i.test(path)||source.length>260000)continue;
    const side=classifyVibe59RobloxScript(path),events=[],calls=[],stateEffects=[],found=[];
    for(const [i,line] of source.split(/\r?\n/).slice(0,4000).entries()){
      if(/^\s*--/.test(line))continue;
      for(const match of line.matchAll(/\b([A-Za-z_]\w*)\.(OnServerEvent|OnClientEvent|OnServerInvoke|OnClientInvoke)\s*(?::Connect\s*\(|=)/g)){
        if(events.length>=24)break;
        events.push({remote:match[1],signal:match[2],line:i+1});
        if(side==='CLIENT'&&match[2].startsWith('OnServer'))found.push({code:'SERVER_HANDLER_IN_CLIENT',line:i+1});
        if(side==='SERVER'&&match[2].startsWith('OnClient'))found.push({code:'CLIENT_HANDLER_IN_SERVER',line:i+1});
      }
      for(const match of line.matchAll(/\b([A-Za-z_]\w*):\s*(FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient)\s*\(/g)){
        if(calls.length>=24)break;
        calls.push({remote:match[1],method:match[2],line:i+1});
        if(side==='CLIENT'&&/^(FireClient|FireAllClients|InvokeClient)$/.test(match[2]))
          found.push({code:'SERVER_REMOTE_CALL_IN_CLIENT',line:i+1});
        if(side==='SERVER'&&/^(FireServer|InvokeServer)$/.test(match[2]))
          found.push({code:'CLIENT_REMOTE_CALL_IN_SERVER',line:i+1});
      }
      for(const match of line.matchAll(/:\s*(GetDataStore|UpdateAsync|SetAsync|GetAsync|SetAttribute)\s*\(/g)){
        if(stateEffects.length<24)stateEffects.push({method:match[1],line:i+1});
        if(side==='CLIENT'&&match[1]==='GetDataStore')found.push({code:'CLIENT_DATASTORE_ACCESS',line:i+1});
      }
      if(side==='CLIENT'&&/GetService\s*\(\s*['"]DataStoreService['"]\s*\)/.test(line))
        found.push({code:'CLIENT_DATASTORE_SERVICE',line:i+1});
    }
    const offline=diagnoseVibe59RobloxOffline({path,source});
    diagnostics.push(...offline.diagnostics.map(x=>({...x,responsible:owners.has(path)})));
    result.push({path,side,responsible:owners.has(path),events,calls,stateEffects,warnings:found.slice(0,16)});
    warnings.push(...found.slice(0,16).map(x=>({path,...x})));
  }
  return Object.freeze({authority:'roblox-luau-static-analysis',runtimeVerified:false,
    sourceWrite:false,completeRepositoryGraph:false,files:result,warnings:warnings.slice(0,32),
    diagnostics:diagnostics.slice(0,200),offlineRuleCount:VIBE59_ROBLOX_OFFLINE_RULES.length,modelUsed:false});
}
function expression(node,depth=0){
  if(!node||typeof node!=='object'||depth>8)throw Error('VIBE59_ROBLOX_EXPRESSION');
  const rec=x=>expression(x,depth+1);
  if(node.kind==='ref')return 'state.'+identifier(node.name,'reference');
  if(node.kind==='number')return String(numeric(node.value));
  if(node.kind==='boolean'&&typeof node.value==='boolean')return String(node.value);
  if(node.kind==='compare'){
    const op={eq:'==',ne:'~=',gt:'>',gte:'>=',lt:'<',lte:'<='}[node.op];
    if(!op)throw Error('VIBE59_ROBLOX_COMPARE_OPERATOR');
    return '('+rec(node.left)+' '+op+' '+rec(node.right)+')';
  }
  if(node.kind==='and'||node.kind==='or'){
    if(!Array.isArray(node.items)||node.items.length<2||node.items.length>6)
      throw Error('VIBE59_ROBLOX_LOGIC_LIMIT');
    return '('+node.items.map(rec).join(node.kind==='and'?' and ':' or ')+')';
  }
  if(node.kind==='not')return '(not '+rec(node.value)+')';
  throw Error('VIBE59_ROBLOX_EXPRESSION_TYPE');
}
function action(item,stateField){
  if(!item||!['assign','add','subtract','multiply','clamp'].includes(item.action))
    throw Error('VIBE59_ROBLOX_ACTION');
  const name=identifier(item.output,'output');
  if(name===stateField)throw Error('VIBE59_ROBLOX_MACHINE_STATE_PROTECTED');
  const dest='state.'+name,src=expression(item.value);
  const op={add:' + ',subtract:' - ',multiply:' * '}[item.action];
  let rhs=op?'('+dest+op+src+')':src;
  if(item.action==='clamp'){
    const min=numeric(item.minimum),max=numeric(item.maximum);
    if(min>=max)throw Error('VIBE59_ROBLOX_CLAMP');
    rhs='math.clamp('+src+', '+min+', '+max+')';
  }
  return dest+' = '+rhs;
}
function declared(source,name,kind){
  const prefix='(?:^|\\n)\\s*';
  const re=kind==='function'
    ?new RegExp(prefix+'(?:(?:local\\s+)?function\\s+'+name+'\\s*\\(|local\\s+'+name+'\\s*=\\s*function\\s*\\()','m')
    :new RegExp(prefix+'(?:local\\s+)?'+name+'\\s*=','m');
  return re.test(source);
}
export function synthesizeVibe59RobloxServerAction({machine={},binding={},source='',replaceAnchor='',sourcePath=''}={}){
  if(classifyVibe59RobloxScript(sourcePath)!=='SERVER')throw Error('VIBE59_ROBLOX_SERVER_SOURCE_REQUIRED');
  const remote=identifier(binding.remoteVariable,'remote');
  const statesTable=identifier(binding.playerStateTable,'playerStates');
  const authorize=identifier(binding.authorizeFunction,'authorize');
  if(new Set([remote,statesTable,authorize]).size!==3)throw Error('VIBE59_ROBLOX_BINDING_COLLISION');
  const handler=identifier(machine.handlerName,'handler'),stateField=identifier(machine.stateVariable,'stateField');
  if([remote,statesTable,authorize,stateField].includes(handler)
    ||[remote,statesTable,authorize].includes(stateField))throw Error('VIBE59_ROBLOX_HANDLER_COLLISION');
  const unchanged=String(source).replace(String(replaceAnchor),'');
  if(!declared(unchanged,remote,'variable')||!declared(unchanged,statesTable,'variable')
    ||!declared(unchanged,authorize,'function'))
    throw Error('VIBE59_ROBLOX_EXISTING_BINDING_REQUIRED');
  if(new RegExp('\\b'+remote+'\\.OnServerEvent\\s*:\\s*Connect\\s*\\(').test(unchanged))
    throw Error('VIBE59_ROBLOX_DUPLICATE_REMOTE_HANDLER');
  const {states,events,transitions}=machine;
  if(!Array.isArray(states)||states.length<2||states.length>20
    ||!Array.isArray(events)||!events.length||events.length>24
    ||!Array.isArray(transitions)||!transitions.length||transitions.length>64)
    throw Error('VIBE59_ROBLOX_MACHINE_LIMIT');
  const validName=x=>typeof x==='string'&&/^[A-Za-z][\w-]{0,47}$/.test(x);
  if(!states.every(validName)||!events.every(validName)
    ||new Set(states).size!==states.length||new Set(events).size!==events.length)
    throw Error('VIBE59_ROBLOX_MACHINE_NAMES');
  const seen=new Set(),lines=['local function '+handler+'(player, eventName)',
    '  if type(eventName) ~= "string" then return false end',
    '  if not '+authorize+'(player, eventName) then return false end',
    '  local state = '+statesTable+'[player]',
    '  if type(state) ~= "table" then return false end'];
  for(const row of transitions){
    if(!row||!states.includes(row.from)||!states.includes(row.to)||!events.includes(row.event))
      throw Error('VIBE59_ROBLOX_UNDECLARED_TRANSITION');
    const key=row.from+'|'+row.event;
    if(seen.has(key))throw Error('VIBE59_ROBLOX_AMBIGUOUS_TRANSITION');
    seen.add(key);
    if(row.when&&!['compare','and','or','not','boolean'].includes(row.when.kind))
      throw Error('VIBE59_ROBLOX_GUARD');
    if(!Array.isArray(row.actions??[])||(row.actions||[]).length>8)
      throw Error('VIBE59_ROBLOX_ACTION_LIMIT');
    lines.push('  if state.'+stateField+' == '+JSON.stringify(row.from)
      +' and eventName == '+JSON.stringify(row.event)
      +(row.when?' and '+expression(row.when):'')+' then',
      '    state.'+stateField+' = '+JSON.stringify(row.to),
      ...(row.actions||[]).map(x=>'    '+action(x,stateField)),
      '    return true','  end');
  }
  lines.push('  return false','end',remote+'.OnServerEvent:Connect(function(player, eventName)',
    '  '+handler+'(player, eventName)','end)');
  return Object.freeze({source:lines.join('\n'),strategy:'SERVER_AUTHORIZED_PER_PLAYER',
    runtimeVerified:false,sourceWrite:false,
    safety:{existingRemote:true,existingStateTable:true,existingAuthorization:true,
      serverSource:true,perPlayerState:true,eventTypeChecked:true,newAssets:false,studioRuntimeVerified:false},
    authority:'roblox-source-grounded-luau-candidate'});
}
