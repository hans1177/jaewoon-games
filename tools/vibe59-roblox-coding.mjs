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
export function inspectVibe59RobloxCoding({files=[],responsiblePaths=[]}={}){
  if(!Array.isArray(files)||files.length>48)throw Error('VIBE59_ROBLOX_SCAN_LIMIT');
  const owners=new Set(responsiblePaths),result=[],warnings=[];
  for(const file of files.slice(0,24)){
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
    result.push({path,side,responsible:owners.has(path),events,calls,stateEffects,warnings:found.slice(0,16)});
    warnings.push(...found.slice(0,16).map(x=>({path,...x})));
  }
  return Object.freeze({authority:'roblox-luau-static-analysis',runtimeVerified:false,
    sourceWrite:false,completeRepositoryGraph:false,files:result,warnings:warnings.slice(0,32)});
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
