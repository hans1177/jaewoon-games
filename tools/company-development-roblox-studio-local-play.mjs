import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const bool=v=>String(v??'').toLowerCase()==='true';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function validateLocalStudioPolicy(roadmap={}){
  const studio=roadmap?.roblox?.studioExecution||{};
  const usage=roadmap?.developmentLifecycleMachine?.robloxStudioUsage||{};
  const forbidden=Array.isArray(usage.forbidden)?usage.forbidden:[];
  const pass=
    studio.enabled===true
    &&studio.requiredForActualVibeInternalPlay===true
    &&studio.officialStudioMcpOnly===true
    &&studio.localPlaceFileRequired===true
    &&studio.onlinePublishedPlaceDirectOpenForbidden===true
    &&studio.robloxPlayerAutomationForbidden===true
    &&studio.externalGuiAutomationForbidden===true
    &&studio.undocumentedStudioCliAutomationForbidden===true
    &&clean(studio.studioMcpTransport)==='STDIO'
    &&usage.learningUseForbidden===false
    &&forbidden.includes('ROBLOX_PLAYER_AUTOMATION')
    &&forbidden.includes('PUBLIC_SERVER_BOT_PLAY')
    &&forbidden.includes('PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION')
    &&forbidden.includes('UNDOCUMENTED_STUDIO_CLI_AUTOMATION')
    &&forbidden.includes('EXTERNAL_GUI_MACRO_OR_INJECTION');
  if(!pass)throw new Error('ROBLOX_STUDIO_MCP_POLICY_MISMATCH');
  return true;
}

function artifactRunIdFor(item={},candidate={}){
  return Number(candidate?.artifactRunId||item?.robloxFoundationF0Evidence?.artifactRunId||item?.robloxHeadlessFastMvpEvidence?.artifactRunId||0);
}

function internalReleaseObserved(item={},candidate={}){
  const internal=item?.robloxInternalReleaseEvidence||{};
  const sourceRevision=clean(item?.robloxSourceCommit);
  const artifactIdentity=clean(item?.robloxBuildArtifactIdentity);
  return Boolean(
    item?.robloxInternalReleasePublished===true
    ||(
      internal?.published===true
      &&clean(internal?.sourceRevision||candidate?.sourceRevision)===sourceRevision
      &&clean(internal?.artifactIdentity||candidate?.artifactIdentity)===artifactIdentity
      &&Number(internal?.versionNumber||candidate?.versionNumber||0)>0
    )
  );
}

export function planLocalStudioCandidates({queue={},roadmap={},requestedGameId=''}={}){
  validateLocalStudioPolicy(roadmap);
  const requested=clean(requestedGameId);
  const include=[];
  for(const item of queue?.items||[]){
    if(requested&&clean(item?.gameId)!==requested)continue;
    if(clean(item?.currentStep)!=='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG')continue;
    const candidate=item?.robloxRuntimeCandidateEvidence||{};
    const sourceRevision=clean(item?.robloxSourceCommit);
    const artifactIdentity=clean(item?.robloxBuildArtifactIdentity);
    const artifactRunId=artifactRunIdFor(item,candidate);
    const exact=Boolean(
      item?.robloxBuildOrPackagePassed===true
      &&clean(item?.robloxBuildSourceRevision)===sourceRevision
      &&/^sha256:[0-9a-f]{64}$/i.test(artifactIdentity)
      &&candidate?.published===true
      &&clean(candidate?.sourceRevision)===sourceRevision
      &&clean(candidate?.artifactIdentity)===artifactIdentity
      &&Number(candidate?.artifactRunId||0)===artifactRunId
      &&artifactRunId>0
      &&/^[1-9][0-9]*$/.test(String(candidate?.universeId||''))
      &&/^[1-9][0-9]*$/.test(String(candidate?.placeId||''))
      &&Number(candidate?.versionNumber||0)>0
      &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
      &&internalReleaseObserved(item,candidate)
    );
    if(!exact)continue;
    const prior=item?.robloxInternalVibePlayEvidence||{};
    const alreadyObserved=Boolean(
      prior?.pass===true
      &&prior?.actualPlay===true
      &&prior?.officialStudioMcp===true
      &&prior?.localPlaceFile===true
      &&prior?.onlinePlaceDirectOpen===false
      &&prior?.robloxPlayerAutomation===false
      &&clean(prior?.sourceRevision)===sourceRevision
      &&clean(prior?.artifactIdentity)===artifactIdentity
      &&Number(prior?.artifactRunId||0)===artifactRunId
      &&String(prior?.universeId||'')===String(candidate?.universeId||'')
      &&String(prior?.placeId||'')===String(candidate?.placeId||'')
      &&Number(prior?.versionNumber||0)===Number(candidate?.versionNumber||0)
      &&Boolean(clean(prior?.testedAt))
    );
    if(alreadyObserved)continue;
    include.push({
      gameId:clean(item.gameId),
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId:String(candidate.universeId),
      placeId:String(candidate.placeId),
      versionNumber:Number(candidate.versionNumber),
      sharedTargetCurrent:item?.robloxSharedTargetCurrent===true,
      historicalExactPublishedArtifact:item?.robloxSharedTargetCurrent!==true
    });
  }
  return{include};
}

function flattenText(value,out=[]){
  if(value==null)return out;
  if(typeof value==='string'){out.push(value);return out;}
  if(Array.isArray(value)){for(const v of value)flattenText(v,out);return out;}
  if(typeof value==='object'){
    if(typeof value.text==='string')out.push(value.text);
    for(const [k,v] of Object.entries(value)){
      if(k==='text')continue;
      flattenText(v,out);
    }
  }
  return out;
}

function collectImages(value,out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(const v of value)collectImages(v,out);return out;}
  if(typeof value==='object'){
    if(clean(value.type).toLowerCase()==='image'&&typeof value.data==='string'){
      out.push({mimeType:clean(value.mimeType||value.mime_type||'image/png'),data:value.data});
    }
    for(const v of Object.values(value))collectImages(v,out);
  }
  return out;
}

function collectStudios(value,out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(const v of value)collectStudios(v,out);return out;}
  if(typeof value==='string'){
    const text=clean(value);
    if(text&&(text.startsWith('{')||text.startsWith('['))){
      try{collectStudios(JSON.parse(text),out);}catch{}
    }
    return out;
  }
  if(typeof value==='object'){
    const studioId=clean(value.studio_id||value.studioId||value.studioID);
    if(studioId){
      out.push({
        studioId,
        name:clean(value.name||value.display_name||value.displayName||value.place_name||value.placeName),
        placeId:clean(value.place_id||value.placeId)
      });
    }
    for(const v of Object.values(value))collectStudios(v,out);
  }
  return out;
}

function hash(value){
  return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
}

function schemaProps(schema={}){return schema?.properties&&typeof schema.properties==='object'?schema.properties:{};}
function schemaRequired(schema={}){return Array.isArray(schema?.required)?schema.required:[];}
function setStudioId(args,schema,studioId){
  const props=schemaProps(schema);
  const key=Object.keys(props).find(k=>/studio.*id/i.test(k))||'studio_id';
  args[key]=studioId;
}
function enumValue(def={},patterns=[]){
  const values=Array.isArray(def.enum)?def.enum:[];
  for(const p of patterns){
    const hit=values.find(v=>clean(v).toLowerCase()===p);
    if(hit!==undefined)return hit;
  }
  for(const p of patterns){
    const hit=values.find(v=>clean(v).toLowerCase().includes(p));
    if(hit!==undefined)return hit;
  }
  return values[0];
}
function fillRequired(args,schema={}){
  const props=schemaProps(schema);
  for(const key of schemaRequired(schema)){
    if(args[key]!==undefined)continue;
    const def=props[key]||{};
    if(Array.isArray(def.enum)&&def.enum.length){args[key]=def.enum[0];continue;}
    if(def.type==='boolean'){args[key]=false;continue;}
    if(def.type==='integer'||def.type==='number'){args[key]=0;continue;}
    if(def.type==='array'){args[key]=[];continue;}
    if(def.type==='object'){args[key]={};continue;}
    args[key]='';
  }
  return args;
}
function startStopArgs(schema,studioId,start){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  for(const [key,def] of Object.entries(props)){
    if(/studio.*id/i.test(key))continue;
    if(Array.isArray(def.enum)){
      const selected=enumValue(def,start?['start','play','on']:['stop','end','off']);
      if(selected!==undefined){args[key]=selected;break;}
    }
    if(/action|mode|state|operation/i.test(key)&&def.type==='string'){args[key]=start?'start':'stop';break;}
    if(/start|play/i.test(key)&&def.type==='boolean'){args[key]=start;break;}
    if(/stop|end/i.test(key)&&def.type==='boolean'){args[key]=!start;break;}
  }
  return fillRequired(args,schema);
}
function keyboardItem(schema,key){
  const props=schemaProps(schema),item={};
  for(const [name,def] of Object.entries(props)){
    if(/key.?code|^key$|keyboard.?key/i.test(name)){item[name]=key;continue;}
    if(/action|type|event|operation/i.test(name)){
      if(Array.isArray(def.enum)){
        item[name]=enumValue(def,['key_press','keypress','press','tap','key_down']);
      }else if(def.type==='string')item[name]='press';
      continue;
    }
    if(/duration.*ms|milliseconds|delay.*ms|wait.*ms/i.test(name))item[name]=120;
    else if(/duration|delay|wait/i.test(name)&&['number','integer'].includes(def.type))item[name]=0.12;
  }
  return fillRequired(item,schema);
}
function keyboardArgs(schema,studioId,key){
  const args={};setStudioId(args,schema,studioId);
  const props=schemaProps(schema);
  const actionsKey=Object.keys(props).find(k=>/actions|events|inputs/i.test(k)&&props[k]?.type==='array');
  if(actionsKey){
    const itemSchema=props[actionsKey]?.items||{};
    args[actionsKey]=[keyboardItem(itemSchema,key)];
  }else{
    const built=keyboardItem(schema,key);
    for(const [k,v] of Object.entries(built))if(!/studio.*id/i.test(k))args[k]=v;
  }
  return fillRequired(args,schema);
}

class McpStdioClient{
  constructor({command,args=[],env=process.env,timeoutMs=30000}={}){
    this.command=command;this.args=args;this.env=env;this.timeoutMs=timeoutMs;
    this.child=null;this.nextId=1;this.pending=new Map();this.tools=new Map();this.protocolVersion='';this.serverInfo={};this.stderrTail='';
  }
  async connect(){
    this.child=spawn(this.command,this.args,{stdio:['pipe','pipe','pipe'],windowsHide:true,env:this.env,shell:false});
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data',chunk=>{
      const value=String(chunk||'');
      this.stderrTail=(this.stderrTail+value).slice(-6000);
      if(process.env.ACTIONS_STEP_DEBUG==='true')process.stderr.write(value);
    });
    const rl=readline.createInterface({input:this.child.stdout,crlfDelay:Infinity});
    rl.on('line',line=>this.onLine(line));
    this.child.on('exit',(code,signal)=>{
      const detail=clean(this.stderrTail).replace(/\s+/g,' ').slice(-2000);
      const suffix=detail?` stderr=${detail}`:'';
      for(const {reject,timer} of this.pending.values()){clearTimeout(timer);reject(new Error(`MCP process exited code=${code} signal=${signal}${suffix}`));}
      this.pending.clear();
    });
    const result=await this.request('initialize',{
      protocolVersion:'2025-11-25',
      capabilities:{},
      clientInfo:{name:'jaewoon-games-roblox-studio-mcp',version:'1.0.0'}
    });
    this.protocolVersion=clean(result?.protocolVersion||'2025-11-25');
    this.serverInfo=result?.serverInfo||{};
    this.notify('notifications/initialized',{});
    const listed=await this.request('tools/list',{});
    for(const tool of listed?.tools||[])this.tools.set(clean(tool?.name),tool);
    return listed?.tools||[];
  }
  onLine(line){
    let msg;try{msg=JSON.parse(line);}catch{return;}
    if(msg?.method==='ping'&&msg?.id!==undefined){
      this.send({jsonrpc:'2.0',id:msg.id,result:{}});
      return;
    }
    if(msg?.id!==undefined&&this.pending.has(msg.id)){
      const p=this.pending.get(msg.id);this.pending.delete(msg.id);clearTimeout(p.timer);
      if(msg.error)p.reject(new Error(`MCP ${p.method} error: ${JSON.stringify(msg.error)}`));
      else p.resolve(msg.result);
    }
  }
  send(msg){
    if(!this.child||this.child.killed)throw new Error('MCP process not running');
    this.child.stdin.write(JSON.stringify(msg)+'\n');
  }
  request(method,params={}){
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`MCP timeout: ${method}`));},this.timeoutMs);
      this.pending.set(id,{resolve,reject,timer,method});
      this.send({jsonrpc:'2.0',id,method,params});
    });
  }
  notify(method,params={}){this.send({jsonrpc:'2.0',method,params});}
  tool(name){const t=this.tools.get(name);if(!t)throw new Error('ROBLOX_STUDIO_MCP_TOOL_MISSING:'+name);return t;}
  async call(name,args={}){
    const result=await this.request('tools/call',{name,arguments:args});
    if(result?.isError===true)throw new Error(`ROBLOX_STUDIO_MCP_TOOL_ERROR:${name}:${flattenText(result).join(' | ').slice(0,1000)}`);
    return result;
  }
  close(){
    try{this.child?.stdin?.end();}catch{}
    try{this.child?.kill();}catch{}
  }
}

function chooseStudio(listResult,expectedName=''){
  const studios=collectStudios(listResult,[]);
  const unique=[...new Map(studios.map(x=>[x.studioId,x])).values()];
  if(!unique.length)throw new Error('ROBLOX_STUDIO_MCP_NO_STUDIO');
  const expected=clean(expectedName).toLowerCase().replace(/\.(rbxlx?|RBXLX?)$/,'');
  const named=expected?unique.find(x=>clean(x.name).toLowerCase().includes(expected)):null;
  const local=unique.filter(x=>!clean(x.placeId));
  return named||(local.length===1?local[0]:(unique.length===1?unique[0]:null))||(()=>{throw new Error('ROBLOX_STUDIO_MCP_AMBIGUOUS_STUDIO:'+JSON.stringify(unique));})();
}

function mcpCommandArgs(command=''){
  const resolved=clean(command);
  if(!resolved)throw new Error('ROBLOX_STUDIO_MCP_COMMAND_MISSING');
  if(process.platform==='win32')return{command:'cmd.exe',args:['/c',resolved]};
  return{command:resolved,args:[]};
}

export async function runOfficialStudioMcpPlay({
  mcpCommand='',output='',expectedStudioName='',timeoutMs=45000
}={}){
  const launch=mcpCommandArgs(mcpCommand);
  const client=new McpStdioClient({...launch,timeoutMs});
  const actions=[],checkpoints=[],errors=[];
  const checkpoint=(id,pass)=>checkpoints.push({id,name:id,required:true,pass:pass===true});
  let studioId='',beforeImages=[],afterImages=[],consoleResult=null,started=false;
  try{
    const tools=await client.connect();
    const requiredTools=['list_roblox_studios','get_studio_state','start_stop_play','get_console_output','screen_capture','user_keyboard_input'];
    for(const name of requiredTools)client.tool(name);
    checkpoint('official-studio-mcp-connected',true);

    const list=await client.call('list_roblox_studios',{});
    const studio=chooseStudio(list,expectedStudioName);
    studioId=studio.studioId;
    checkpoint('local-studio-selected',Boolean(studioId));

    const stateTool=client.tool('get_studio_state');
    await client.call('get_studio_state',fillRequired((()=>{const a={};setStudioId(a,stateTool.inputSchema||{},studioId);return a;})(),stateTool.inputSchema||{}));
    checkpoint('studio-state-readable',true);

    const playTool=client.tool('start_stop_play');
    await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,true));
    started=true;
    checkpoint('play-mode-started',true);
    await wait(2500);

    const captureTool=client.tool('screen_capture');
    const captureArgs=fillRequired((()=>{const a={};setStudioId(a,captureTool.inputSchema||{},studioId);return a;})(),captureTool.inputSchema||{});
    const before=await client.call('screen_capture',captureArgs);
    beforeImages=collectImages(before,[]);
    checkpoint('viewport-before-captured',beforeImages.length>0);

    const keyboardTool=client.tool('user_keyboard_input');
    for(const key of ['W','A','D','Space']){
      const result=await client.call('user_keyboard_input',keyboardArgs(keyboardTool.inputSchema||{},studioId,key));
      actions.push({id:'keyboard-'+key.toLowerCase(),type:'mcp-keyboard-input',dispatched:true,ok:result?.isError!==true});
      await wait(key==='Space'?500:900);
    }
    checkpoint('mcp-input-dispatched',actions.length===4&&actions.every(x=>x.ok));

    const after=await client.call('screen_capture',captureArgs);
    afterImages=collectImages(after,[]);
    const beforeHashes=beforeImages.map(x=>hash(Buffer.from(x.data,'base64')));
    const afterHashes=afterImages.map(x=>hash(Buffer.from(x.data,'base64')));
    const changed=beforeHashes.length>0&&afterHashes.length>0&&beforeHashes.join(',')!==afterHashes.join(',');
    checkpoint('viewport-changed-after-input',changed);

    const consoleTool=client.tool('get_console_output');
    const consoleArgs=fillRequired((()=>{const a={};setStudioId(a,consoleTool.inputSchema||{},studioId);return a;})(),consoleTool.inputSchema||{});
    consoleResult=await client.call('get_console_output',consoleArgs);
    checkpoint('console-output-captured',true);

    const consoleText=flattenText(consoleResult,[]).join('\n');
    const errorPatterns=[
      /Script Runtime Error/i,
      /Stack Begin/i,
      /attempt to index nil/i,
      /infinite yield possible/i,
      /unhandled exception/i
    ];
    const matched=errorPatterns.filter(re=>re.test(consoleText)).map(re=>re.source);
    for(const pattern of matched)errors.push({type:'studio-console-error',actionId:null,signature:pattern});
    checkpoint('no-release-blocking-runtime-errors',errors.length===0);

    await client.call('start_stop_play',startStopArgs(playTool.inputSchema||{},studioId,false));
    started=false;
    checkpoint('play-mode-stopped',true);

    const required=checkpoints.filter(x=>x.required!==false);
    const runtimeVerified=required.length>0&&required.every(x=>x.pass===true)&&errors.length===0;
    const result={
      version:1,
      authority:'roblox-official-studio-mcp-runtime',
      runtimeVerified,
      capabilities:{
        officialStudioMcp:true,
        playMode:true,
        mcpInput:true,
        screenCapture:beforeImages.length>0&&afterImages.length>0,
        consoleCapture:consoleResult!=null
      },
      mcp:{
        protocolVersion:client.protocolVersion,
        serverName:clean(client.serverInfo?.name),
        toolNames:[...client.tools.keys()].sort(),
        studioIdHash:hash(studioId).slice(0,16)
      },
      actions,
      checkpoints,
      errors:errors.map(({type,actionId,signature})=>({type,actionId,signature})),
      metrics:{
        beforeFrameCount:beforeImages.length,
        afterFrameCount:afterImages.length,
        distinctFrameChange:checkpoints.find(x=>x.id==='viewport-changed-after-input')?.pass===true,
        consoleErrorCount:errors.length
      },
      rawSourceIncluded:false,
      rawGameplayValuesIncluded:false,
      rawViewportIncluded:false
    };
    if(output)writeJson(output,result);
    return result;
  }catch(error){
    errors.push({type:'studio-mcp-infrastructure-or-runtime-error',actionId:null,signature:clean(error?.message||error).slice(0,500)});
    if(started&&studioId&&client.tools.has('start_stop_play')){
      try{const tool=client.tool('start_stop_play');await client.call('start_stop_play',startStopArgs(tool.inputSchema||{},studioId,false));}catch{}
    }
    const result={
      version:1,
      authority:'roblox-official-studio-mcp-runtime',
      runtimeVerified:false,
      capabilities:{officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false},
      actions,checkpoints,errors,
      metrics:{beforeFrameCount:beforeImages.length,afterFrameCount:afterImages.length,distinctFrameChange:false,consoleErrorCount:errors.length},
      rawSourceIncluded:false,rawGameplayValuesIncluded:false,rawViewportIncluded:false
    };
    if(output)writeJson(output,result);
    throw error;
  }finally{
    client.close();
  }
}

export function createLocalStudioPlayEvidence({
  item={},runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt=new Date().toISOString()
}={}){
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const sourceRevision=clean(expected?.sourceRevision);
  const artifactIdentity=clean(expected?.artifactIdentity);
  const artifactRunId=Number(expected?.artifactRunId||0);
  const universeId=String(expected?.universeId||'');
  const placeId=String(expected?.placeId||'');
  const versionNumber=Number(expected?.versionNumber||0);
  const exactPublishedArtifact=Boolean(
    clean(item?.robloxSourceCommit)===sourceRevision
    &&clean(item?.robloxBuildArtifactIdentity)===artifactIdentity
    &&candidate?.published===true
    &&clean(candidate?.authority).startsWith('roblox-open-cloud-')
    &&clean(candidate?.sourceRevision)===sourceRevision
    &&clean(candidate?.artifactIdentity)===artifactIdentity
    &&Number(candidate?.artifactRunId||0)===artifactRunId
    &&String(candidate?.universeId||'')===universeId
    &&String(candidate?.placeId||'')===placeId
    &&Number(candidate?.versionNumber||0)===versionNumber
    &&internalReleaseObserved(item,candidate)
  );
  if(!exactPublishedArtifact)throw new Error('ROBLOX_STUDIO_MCP_CANDIDATE_STALE');
  if(clean(runtime?.authority)!=='roblox-official-studio-mcp-runtime')throw new Error('ROBLOX_STUDIO_MCP_RUNTIME_AUTHORITY_INVALID');

  const actions=(Array.isArray(runtime?.actions)?runtime.actions:[]).map(row=>({
    id:clean(row?.id),
    type:clean(row?.type),
    dispatched:row?.dispatched===true,
    ok:row?.ok===true
  })).filter(row=>row.id&&row.type);
  const checkpoints=(Array.isArray(runtime?.checkpoints)?runtime.checkpoints:[]).map(row=>({
    id:clean(row?.id),
    name:clean(row?.name||row?.id),
    required:row?.required!==false,
    pass:row?.pass===true
  })).filter(row=>row.id);
  const errors=(Array.isArray(runtime?.errors)?runtime.errors:[]).map(row=>({
    type:clean(row?.type||'runtime-error'),
    actionId:clean(row?.actionId)||null,
    signature:clean(row?.signature)||null
  })).filter(row=>row.type);
  const required=checkpoints.filter(row=>row.required!==false);
  const dispatched=actions.some(row=>row.dispatched===true&&row.ok===true);
  const officialMcp=runtime?.capabilities?.officialStudioMcp===true;
  const playMode=runtime?.capabilities?.playMode===true;
  const mcpInput=runtime?.capabilities?.mcpInput===true;
  const screenCapture=runtime?.capabilities?.screenCapture===true;
  const consoleCapture=runtime?.capabilities?.consoleCapture===true;
  const screenChanged=runtime?.metrics?.distinctFrameChange===true;
  const actualPlay=officialMcp&&playMode&&mcpInput&&screenCapture&&consoleCapture;
  const requiredPass=required.length>0&&required.every(row=>row.pass===true);
  const pass=Boolean(
    studioStepSucceeded===true
    &&actualPlay
    &&runtime?.runtimeVerified===true
    &&dispatched
    &&screenChanged
    &&requiredPass
    &&errors.length===0
  );
  const infrastructureFailure=errors.some(row=>/infrastructure|mcp.*missing|no_studio/i.test(row.type+' '+(row.signature||'')));
  const failureClass=pass?null
    :infrastructureFailure?'STUDIO_MCP_INFRASTRUCTURE_PENDING'
    :errors.length?'STUDIO_MCP_RUNTIME_ERROR'
    :required.some(row=>row.pass!==true)?'STUDIO_MCP_REQUIRED_CHECKPOINT_FAILURE'
    :!dispatched?'STUDIO_MCP_INPUT_NOT_OBSERVED'
    :!screenChanged?'STUDIO_MCP_VIEWPORT_NOT_CHANGED'
    :'STUDIO_MCP_LOCAL_PLAY_FAILED';
  const learningSignals=[
    'roblox official studio mcp local runtime',
    ...actions.filter(row=>row.ok===true).map(row=>clean(row.type||row.id||'input')),
    ...checkpoints.filter(row=>row.pass===true).map(row=>clean(row.name||row.id||'checkpoint')),
    ...(errors.length?['debugging','runtime error']:[])
  ].filter(Boolean).slice(0,40);

  return{
    pass,
    evidence:{
      version:2,
      gameId:clean(item?.gameId),
      authority:'roblox-official-studio-mcp-runtime',
      pass,
      actualPlay,
      runtimeVerified:runtime?.runtimeVerified===true,
      learningReusable:!infrastructureFailure&&(pass||errors.length>0||required.some(row=>row.pass!==true)),
      learningScope:'STRUCTURED_VERIFIED_QA_FACTS_ONLY',
      infrastructureFailure,
      failureClass,
      localPlaceFile:true,
      officialStudioMcp:true,
      onlinePlaceDirectOpen:false,
      robloxPlayerAutomation:false,
      externalGuiAutomation:false,
      undocumentedStudioCliAutomation:false,
      studioLaunchTarget:'LOCAL_EXACT_BUILD_ARTIFACT',
      sourceRevision,
      artifactIdentity,
      artifactRunId,
      universeId,
      placeId,
      versionNumber,
      historicalSharedTargetExactArtifact:item?.robloxSharedTargetCurrent!==true,
      currentPublishedRuntimeClaim:false,
      publishedCandidateCrossCheckPassed:true,
      publishedCandidateCrossCheckAuthority:'COMPANY_RUNTIME_PLUS_OPEN_CLOUD_PUBLICATION_EVIDENCE',
      capabilities:{officialStudioMcp:officialMcp,playMode,mcpInput,screenCapture,consoleCapture},
      actions,
      checkpoints,
      errors,
      runtimeSummary:{
        consoleErrorCount:Number(runtime?.metrics?.consoleErrorCount||0),
        distinctFrameChange:screenChanged
      },
      learningSignals,
      rawSourceIncluded:false,
      rawGameplayValuesIncluded:false,
      rawViewportIncluded:false,
      scenarioCoverage:[],
      scenarioCoveragePass:false,
      testedAt,
      workflowRunId:Number(workflowRunId||0),
      publicationAuthority:false,
      publicationTargetDiscovery:false
    }
  };
}

export function applyLocalStudioPlayResult({queue={},gameId='',runtime={},expected={},workflowRunId=0,studioStepSucceeded=true,testedAt}={}){
  const item=(queue?.items||[]).find(row=>clean(row?.gameId)===clean(gameId));
  if(!item)throw new Error('ROBLOX_STUDIO_MCP_QUEUE_ITEM_MISSING:'+clean(gameId));
  const result=createLocalStudioPlayEvidence({item,runtime,expected,workflowRunId,studioStepSucceeded,testedAt});
  item.robloxInternalVibePlayEvidence=result.evidence;
  item.robloxInternalPlaytestPassed=result.pass;
  item.robloxInternalPlaytestPassedAt=result.pass?result.evidence.testedAt:null;
  item.robloxStudioLocalPlayRepairRequired=!result.pass&&!result.evidence.infrastructureFailure;
  item.robloxStudioLocalPlayInfrastructurePending=result.evidence.infrastructureFailure===true;
  if(result.pass){
    item.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.canonicalState='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.robloxLastSuccessfulStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureStage=null;
    item.robloxFailureSignature=null;
    item.routingBlockers=[];
  }else if(result.evidence.infrastructureFailure){
    item.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.canonicalState='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
    item.robloxFailureStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureSignature='ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING';
    item.routingBlockers=['roblox-studio-mcp-infrastructure-pending'];
  }else{
    item.canonicalState='REPAIR_REQUIRED';
    item.robloxFailureStage='VIBE_INTERNAL_PLAY';
    item.robloxFailureSignature=result.evidence.errors.length?'ROBLOX_STUDIO_MCP_RUNTIME_ERROR':'ROBLOX_STUDIO_MCP_PLAY_CHECKPOINT_FAILED';
    item.routingBlockers=['roblox-studio-mcp-play-repair-required'];
  }
  item.robloxPublicReleaseReady=false;
  item.robloxPublicRelease=false;
  item.robloxReleaseClaim=false;
  item.updatedAt=result.evidence.testedAt;
  queue.updatedAt=result.evidence.testedAt;
  return{queue,item,result};
}

function args(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

async function main(){
  const a=args();
  const mode=clean(a.mode);
  if(mode==='plan'){
    const matrix=planLocalStudioCandidates({
      queue:readJson(a.queue),
      roadmap:readJson(a.roadmap),
      requestedGameId:clean(a['game-id'])
    });
    writeJson(a.output,matrix);
    console.log('ROBLOX_STUDIO_MCP_PLAN_COUNT='+matrix.include.length);
    return;
  }
  if(mode==='mcp-run'){
    const result=await runOfficialStudioMcpPlay({
      mcpCommand:clean(a['mcp-command']),
      output:clean(a.output),
      expectedStudioName:clean(a['studio-name']),
      timeoutMs:Number(a.timeout||45000)
    });
    console.log('ROBLOX_STUDIO_MCP_RUNTIME='+(result.runtimeVerified?'PASS':'FAIL'));
    return;
  }
  if(mode==='persist'){
    const queue=readJson(a.queue);
    const runtime=readJson(a.runtime);
    const expected={
      sourceRevision:clean(a['source-revision']),
      artifactIdentity:clean(a['artifact-identity']),
      artifactRunId:Number(a['artifact-run-id']||0),
      universeId:clean(a['universe-id']),
      placeId:clean(a['place-id']),
      versionNumber:Number(a['version-number']||0)
    };
    const applied=applyLocalStudioPlayResult({
      queue,
      gameId:clean(a['game-id']),
      runtime,
      expected,
      workflowRunId:Number(a['workflow-run-id']||0),
      studioStepSucceeded:bool(a['studio-step-succeeded']),
      testedAt:clean(a['tested-at'])||undefined
    });
    writeJson(a.queue,applied.queue);
    console.log('ROBLOX_STUDIO_MCP_PLAY_RESULT='+clean(a['game-id'])+':'+(applied.result.pass?'PASS':'FAIL'));
    console.log('ROBLOX_STUDIO_MCP_PLAY_LEARNING='+(applied.result.evidence.learningReusable?'STRUCTURED_VERIFIED':'NO'));
    return;
  }
  throw new Error('unsupported --mode; expected plan, mcp-run, or persist');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error?.stack||error);process.exit(1);});
}
