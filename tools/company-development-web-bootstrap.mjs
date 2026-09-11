import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=value=>String(value??'').trim();
const arg=(name,fallback='')=>process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clip=(value,max=18000)=>{const text=typeof value==='string'?value:JSON.stringify(value);return text.length>max?text.slice(0,max):text;};
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);

export function validateBootstrapHtml(html){
  const text=String(html??'');
  const blockers=[];
  if(Buffer.byteLength(text,'utf8')<1800)blockers.push('HTML_TOO_SMALL');
  if(Buffer.byteLength(text,'utf8')>220000)blockers.push('HTML_TOO_LARGE');
  if(!/<(?:!doctype\s+html|html)[\s>]/i.test(text))blockers.push('HTML_DOCUMENT_REQUIRED');
  if(!/<script[\s>]/i.test(text))blockers.push('SCRIPT_REQUIRED');
  if(!/(<button\b|<canvas\b|role=["']button["'])/i.test(text))blockers.push('INTERACTIVE_SURFACE_REQUIRED');
  if(!/(addEventListener\s*\(|onclick\s*=)/i.test(text))blockers.push('INPUT_HANDLER_REQUIRED');
  if(!/(score|health|hp|turn|wave|resource|progress|energy|state|status|combo|level)/i.test(text))blockers.push('VISIBLE_GAME_STATE_REQUIRED');
  if(/\b(?:localStorage|sessionStorage)\b/.test(text))blockers.push('PERSISTENT_STORAGE_FORBIDDEN_ON_BOOTSTRAP');
  if(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(text))blockers.push('NETWORK_API_FORBIDDEN');
  if(/<(?:iframe|object|embed)\b/i.test(text))blockers.push('EMBED_FORBIDDEN');
  if(/(?:src|href)\s*=\s*["']https?:\/\//i.test(text))blockers.push('EXTERNAL_ASSET_FORBIDDEN');
  return {pass:blockers.length===0,blockers,bytes:Buffer.byteLength(text,'utf8')};
}

const OUTPUT_SCHEMA={
  type:'object',
  required:['html','validationQuestion','implementationNotes'],
  additionalProperties:false,
  properties:{
    html:{type:'string'},
    validationQuestion:{type:'string'},
    implementationNotes:{type:'array',items:{type:'string'},maxItems:8}
  }
};

async function callModel({model,prompt,repair=''}){
  const response=await fetch('http://127.0.0.1:11434/api/chat',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      model,stream:false,think:false,format:OUTPUT_SCHEMA,
      messages:[
        {role:'system',content:'너는 재운컴퍼니 2분류 개발 AI다. 잠긴 DESIGN_BASELINE을 재기획하지 않고 Unity 이전 실제 플레이 검증용 Web vertical slice를 만든다. 외부 네트워크/외부 에셋/저장소를 사용하지 않는다.'},
        {role:'user',content:`${prompt}${repair?`\n이전 출력 검증 실패를 반드시 수정하라: ${repair}`:''}`}
      ],
      options:{temperature:repair?0:0.15,num_ctx:16384,num_predict:7000}
    })
  });
  if(!response.ok)throw new Error(`OLLAMA_${response.status}: ${await response.text()}`);
  const body=await response.json();
  const raw=clean(body?.message?.content);
  if(!raw)throw new Error('EMPTY_MODEL_RESPONSE');
  return JSON.parse(raw);
}

export async function buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model}){
  const prompt=`게임 ID: ${gameId}\n게임명: ${gameName}\n\nDESIGN_BASELINE:\n${clip(baseline)}\n\nARTBOOK:\n${clip(artbook,12000)}\n\n요구사항:\n- 단일 index.html 하나로 완전히 동작하는 모바일 Web 테스트베드를 만든다. CSS/JS를 파일 안에 포함한다.\n- 최종 Web 제품이 아니라 Unity 전 핵심 루프 검증용 작은 vertical slice다.\n- DESIGN_BASELINE의 핵심 판타지/루프/시그니처 시스템 중 실제 상호작용으로 검증 가능한 최소 1개를 플레이 가능하게 만든다.\n- 첫 화면에 명확한 시작 또는 핵심행동 버튼이 보여야 하며 버튼/터치 입력 뒤 점수·체력·자원·턴·진행도 등 보이는 게임 상태가 실제로 변해야 한다.\n- 390x844 모바일 화면에서 가로 넘침 없이 동작한다.\n- 외부 URL, CDN, fetch, iframe, localStorage/sessionStorage 사용 금지.\n- 텍스트 설명만 있는 목업 금지. 실제 상태·규칙·성공/실패 또는 진행 변화가 있어야 한다.\n- 자동 검증이 최소 3회 버튼 클릭을 해도 예외 없이 상태가 계속 바뀌게 한다.\n- 기존 설계에 없는 대규모 시스템이나 새로운 세계관을 추가하지 않는다.\n- HTML 전체를 html 필드에 반환한다.`;
  let result=null,last=[];
  for(let attempt=1;attempt<=2;attempt++){
    result=await callModel({model,prompt,repair:last.join('|')});
    const review=validateBootstrapHtml(result.html);
    if(review.pass){
      fs.mkdirSync(candidatePath,{recursive:true});
      fs.writeFileSync(path.join(candidatePath,'index.html'),result.html.endsWith('\n')?result.html:`${result.html}\n`,'utf8');
      return {result,review};
    }
    last=review.blockers;
  }
  throw new Error(`BOOTSTRAP_CONTRACT_FAILED: ${last.join('|')}`);
}

async function main(){
  const gameId=clean(arg('game-id'));
  const gameName=clean(arg('game-name',gameId));
  const baselineFile=arg('baseline');
  const artbookFile=arg('artbook');
  const sourcePath=clean(arg('source-path'));
  const candidateId=safeId(arg('candidate-id'));
  const candidatePath=clean(arg('candidate-path'));
  const sourceCommit=clean(arg('source-commit'));
  const model=clean(arg('model',process.env.AUTONOMOUS_LOCAL_MODEL||'llama3.2:1b'));
  const evidenceFile=clean(arg('evidence'));
  if(!gameId||!baselineFile||!artbookFile||!sourcePath||!candidateId||!candidatePath||!sourceCommit||!evidenceFile)throw new Error('required bootstrap argument missing');
  if(!sourcePath.startsWith('web-games/')||!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('invalid source/candidate path');
  const baseline=readJson(baselineFile),artbook=readJson(artbookFile);
  const {result,review}=await buildFirstPlayable({gameId,gameName,baseline,artbook,sourcePath,candidatePath,candidateId,sourceCommit,model});
  const evidence={
    version:1,candidateId,gameId,sourcePath,candidatePath,sourceCommit,
    candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,
    newProject:true,changedFiles:['index.html'],
    summary:`DEVELOPMENT_CONFIRMED first playable: ${result.validationQuestion}`,
    expectedEffect:'DESIGN_BASELINE 핵심 루프를 모바일 실제 상호작용으로 검증할 수 있는 첫 Web vertical slice 생성',
    tests:['company-development-web-bootstrap-contract','company-development-web-gameplay-validation','independent-candidate-browser-qa'],
    validationQuestion:result.validationQuestion,implementationNotes:result.implementationNotes,
    model,bootstrapContract:review,createdAt:new Date().toISOString()
  };
  writeJson(evidenceFile,evidence);
  console.log(`DEVELOPMENT_WEB_BOOTSTRAP=PASS`);
  console.log(`GAME_ID=${gameId}`);
  console.log(`CANDIDATE_ID=${candidateId}`);
  console.log(`BOOTSTRAP_MODEL=${model}`);
  console.log('PAID_API=NO');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
