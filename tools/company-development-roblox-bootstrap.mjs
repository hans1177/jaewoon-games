// DEVELOPMENT_CONFIRMED Roblox source bootstrap.
// Generates an isolated, game-specific Luau source tree from the locked design baseline.
// This is source creation only: it never claims Roblox runtime, QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const clip=(value,max=24000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;

const OUTPUT_SCHEMA={
  type:'object',
  additionalProperties:false,
  required:['sharedConfig','serverCode','clientCode','implementationNotes'],
  properties:{
    sharedConfig:{type:'string'},
    serverCode:{type:'string'},
    clientCode:{type:'string'},
    implementationNotes:{type:'array',items:{type:'string'},maxItems:12},
  },
};

function baselineText(baseline={}){
  return JSON.stringify(baseline?.content&&typeof baseline.content==='object'?baseline.content:baseline).toLowerCase();
}

export function requiresPersistentSave(baseline={}){
  const text=baselineText(baseline);
  return /(persistent|persistence|save|long-term progression|long term progression|영구|저장)/i.test(text);
}

export function projectJsonForGame(gameId=''){
  return {
    name:clean(gameId)||'jaewoon-roblox-game',
    tree:{
      $className:'DataModel',
      ReplicatedStorage:{
        Shared:{$path:'shared'},
      },
      ServerScriptService:{
        GameServer:{$path:'server'},
      },
      StarterPlayer:{
        StarterPlayerScripts:{
          GameClient:{$path:'client'},
        },
      },
    },
  };
}

function sourceBlockers(text,{kind,saveRequired=false}={}){
  const value=String(text??'');
  const blockers=[];
  const minBytes=kind==='config'?300:kind==='server'?1200:1000;
  if(Buffer.byteLength(value,'utf8')<minBytes)blockers.push(`${kind.toUpperCase()}_SOURCE_TOO_SMALL`);
  if(/\b(TODO|FIXME|NotImplemented|PLACEHOLDER|placeholder)\b/.test(value))blockers.push(`${kind.toUpperCase()}_PLACEHOLDER_FORBIDDEN`);
  if(/loadstring\s*\(/.test(value))blockers.push(`${kind.toUpperCase()}_LOADSTRING_FORBIDDEN`);
  if(/require\s*\(\s*\d+\s*\)/.test(value))blockers.push(`${kind.toUpperCase()}_ASSET_REQUIRE_FORBIDDEN`);
  if(kind==='config'){
    if(!/PolicySource\s*=\s*["']COMPANY_FLOW\.md["']/.test(value))blockers.push('CONFIG_POLICY_SOURCE_REQUIRED');
    if(!/Platform\s*=\s*["']ROBLOX["']/.test(value))blockers.push('CONFIG_ROBLOX_PLATFORM_REQUIRED');
    if(!/MobileFirst\s*=\s*true/.test(value))blockers.push('CONFIG_MOBILE_FIRST_REQUIRED');
  }
  if(kind==='server'){
    if(!/game:GetService\(["']Players["']\)/.test(value))blockers.push('SERVER_PLAYERS_SERVICE_REQUIRED');
    if(!/game:GetService\(["']ReplicatedStorage["']\)/.test(value))blockers.push('SERVER_REPLICATED_STORAGE_REQUIRED');
    if(!/RemoteEvent/.test(value)||!/OnServerEvent/.test(value))blockers.push('SERVER_REMOTE_BOUNDARY_REQUIRED');
    if(!/(typeof\s*\(|type\s*\()/.test(value))blockers.push('SERVER_REMOTE_INPUT_VALIDATION_REQUIRED');
    if(!/(cooldown|rateLimit|rate_limit|lastAction|lastRequest)/i.test(value))blockers.push('SERVER_REMOTE_RATE_LIMIT_REQUIRED');
    if(!/SetAttribute\s*\(/.test(value))blockers.push('SERVER_OBSERVABLE_STATE_REQUIRED');
    if(saveRequired){
      if(!/DataStoreService/.test(value))blockers.push('SERVER_DATASTORE_REQUIRED');
      if(!/GetAsync\s*\(/.test(value))blockers.push('SERVER_DATASTORE_LOAD_REQUIRED');
      if(!/(UpdateAsync|SetAsync)\s*\(/.test(value))blockers.push('SERVER_DATASTORE_SAVE_REQUIRED');
    }
  }
  if(kind==='client'){
    if(!/game:GetService\(["']UserInputService["']\)/.test(value)&&!/game:GetService\(["']ContextActionService["']\)/.test(value))blockers.push('CLIENT_MOBILE_INPUT_SERVICE_REQUIRED');
    if(!/(TouchEnabled|ContextActionService|TouchTap|Activated)/.test(value))blockers.push('CLIENT_TOUCH_INPUT_REQUIRED');
    if(!/FireServer\s*\(/.test(value))blockers.push('CLIENT_SERVER_ACTION_REQUIRED');
    if(!/(ScreenGui|TextButton|ImageButton)/.test(value))blockers.push('CLIENT_MOBILE_UI_REQUIRED');
    if(!/GetAttributeChangedSignal|GetAttribute\s*\(/.test(value))blockers.push('CLIENT_OBSERVABLE_STATE_BIND_REQUIRED');
  }
  return blockers;
}

export function validateRobloxBootstrap({sharedConfig='',serverCode='',clientCode='',baseline={}}={}){
  const saveRequired=requiresPersistentSave(baseline);
  const blockers=[
    ...sourceBlockers(sharedConfig,{kind:'config',saveRequired}),
    ...sourceBlockers(serverCode,{kind:'server',saveRequired}),
    ...sourceBlockers(clientCode,{kind:'client',saveRequired}),
  ];
  return Object.freeze({pass:blockers.length===0,blockers:Object.freeze([...new Set(blockers)]),saveRequired});
}

async function callModel({model,prompt,repair=''}){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      model,
      stream:false,
      think:false,
      format:OUTPUT_SCHEMA,
      messages:[
        {role:'system',content:'너는 재운컴퍼니 Roblox DEVELOPMENT_CONFIRMED 개발 AI다. COMPANY_FLOW.md와 잠긴 DESIGN_BASELINE을 따른다. 원본 유명 게임의 코드·캐릭터·이름·맵·UI·트레이드드레스를 복제하지 않고 자체 Luau 코드로 구현한다. 서버 권한과 클라이언트 표시를 분리하고 모바일 입력을 우선한다. TODO나 가짜 통과 증거를 만들지 않는다.'},
        {role:'user',content:`${prompt}${repair?`\n이전 출력의 정적 검증 실패를 수정하라: ${repair}`:''}`},
      ],
      options:{temperature:repair?0.05:0.12,num_ctx:24576,num_predict:8192},
    }),
  });
  if(!response.ok)throw new Error(`OLLAMA_${response.status}: ${await response.text()}`);
  const body=await response.json();
  const raw=clean(body?.message?.content);
  if(!raw)throw new Error('EMPTY_MODEL_RESPONSE');
  return JSON.parse(raw);
}

export async function buildRobloxSource({gameId,gameName,baseline,artbook,model}){
  const saveRequired=requiresPersistentSave(baseline);
  const prompt=[
    `게임 ID: ${gameId}`,
    `게임명: ${gameName}`,
    `영구 저장 필요 여부: ${saveRequired?'YES':'NO'}`,
    `DESIGN_BASELINE:\n${clip(baseline)}`,
    `ARTBOOK:\n${clip(artbook,10000)}`,
    '요구사항:',
    '- 승인된 핵심 루프·진행·경제·전투/행동 범위를 Roblox에서 실제 작동 가능한 Luau 시스템으로 구현한다.',
    '- sharedConfig는 ModuleScript 소스이며 PolicySource="COMPANY_FLOW.md", Platform="ROBLOX", MobileFirst=true를 포함한다.',
    '- serverCode는 서버 권한형 상태와 핵심 액션을 구현하고 ReplicatedStorage RemoteEvent를 생성/재사용한다.',
    '- 모든 OnServerEvent 입력은 타입/값 검증과 플레이어별 간단한 rate limit을 거친다.',
    '- clientCode는 모바일 우선 ScreenGui/버튼 또는 ContextActionService 입력을 제공하고 RemoteEvent:FireServer로 서버에 요청한다.',
    '- 서버 상태 변화는 Player Attribute 등으로 노출하고 클라이언트가 Attribute 변화를 UI에 반영한다.',
    saveRequired?'- 진행 저장이 설계에 있으므로 DataStoreService 로드/저장을 서버에서 구현하고 실패 시 안전하게 기본값을 사용한다.':'- 설계에 영구 저장 요구가 없으므로 임의로 DataStore를 추가하지 않는다.',
    '- 외부 HTTP, 외부 코드 require(assetId), loadstring, TODO/FIXME/placeholder 금지.',
    '- 유명 참고작의 고유 명칭/캐릭터/맵/아트/UI 표현은 사용하지 않는다.',
    '- 파일 3개만 반환한다: sharedConfig, serverCode, clientCode. 설명문은 implementationNotes 배열에만 둔다.',
  ].join('\n');
  let last=[];
  const failures=[];
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const result=await callModel({model,prompt,repair:last.join('|')});
      const validation=validateRobloxBootstrap({...result,baseline});
      if(validation.pass)return {result,validation,attempts:attempt,failures};
      last=[...validation.blockers];
      failures.push({attempt,blockers:[...validation.blockers]});
    }catch(error){
      last=['MODEL_OUTPUT_ERROR'];
      failures.push({attempt,error:clean(error?.message||error).slice(0,600)});
    }
  }
  throw new Error(`ROBLOX_BOOTSTRAP_MODEL_CONTRACT_FAILED: ${last.join('|')}`);
}

function writeSourceTree(root,{sharedConfig,serverCode,clientCode},gameId){
  fs.mkdirSync(path.join(root,'shared'),{recursive:true});
  fs.mkdirSync(path.join(root,'server'),{recursive:true});
  fs.mkdirSync(path.join(root,'client'),{recursive:true});
  fs.writeFileSync(path.join(root,'shared','GameConfig.luau'),sharedConfig.endsWith('\n')?sharedConfig:`${sharedConfig}\n`,'utf8');
  fs.writeFileSync(path.join(root,'server','Game.server.luau'),serverCode.endsWith('\n')?serverCode:`${serverCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'client','Game.client.luau'),clientCode.endsWith('\n')?clientCode:`${clientCode}\n`,'utf8');
  fs.writeFileSync(path.join(root,'default.project.json'),`${JSON.stringify(projectJsonForGame(gameId),null,2)}\n`,'utf8');
}

async function main(){
  const gameId=clean(arg('game-id'));
  const gameName=clean(arg('game-name',gameId));
  const baselineFile=clean(arg('baseline'));
  const artbookFile=clean(arg('artbook'));
  const outputRoot=posix(arg('output-root'));
  const evidenceFile=clean(arg('evidence'));
  const model=clean(arg('model',process.env.ROBLOX_DEV_MODEL||'qwen3:1.7b'));
  if(!gameId||!baselineFile||!artbookFile||!outputRoot||!evidenceFile)throw new Error('required Roblox bootstrap argument missing');
  if(outputRoot!==`roblox-games/${gameId}`)throw new Error(`invalid Roblox output root: ${outputRoot}`);
  if(fs.existsSync(outputRoot)&&fs.readdirSync(outputRoot).length)throw new Error(`Roblox source root already exists: ${outputRoot}`);
  const baseline=readJson(baselineFile);
  const artbook=readJson(artbookFile);
  const built=await buildRobloxSource({gameId,gameName,baseline,artbook,model});
  writeSourceTree(outputRoot,built.result,gameId);
  const evidence={
    version:1,
    gameId,
    gameName,
    platform:'ROBLOX',
    policyDocument:'COMPANY_FLOW.md',
    stage:'TARGET_PLATFORM_SOURCE_BIND',
    sourcePath:outputRoot,
    sourceValidationPassed:true,
    runtimePassed:false,
    independentQaPassed:false,
    regressionPassed:false,
    releaseClaim:false,
    saveRequired:built.validation.saveRequired,
    generatedFiles:['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau','default.project.json'],
    model,
    modelAttempts:built.attempts,
    modelContractFailures:built.failures,
    implementationNotes:built.result.implementationNotes,
    nextRequiredStage:'TARGET_PLATFORM_RUNTIME',
    createdAt:new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
  fs.copyFileSync(evidenceFile,path.join(outputRoot,'roblox-source-bootstrap.json'));
  console.log('ROBLOX_SOURCE_BOOTSTRAP=PASS');
  console.log(`ROBLOX_GAME_ID=${gameId}`);
  console.log(`ROBLOX_SOURCE_ROOT=${outputRoot}`);
  console.log(`ROBLOX_SAVE_REQUIRED=${evidence.saveRequired?'YES':'NO'}`);
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}
