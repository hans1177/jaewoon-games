// 파일명: tools/vibe2-game-source-index.mjs
// [임포트] 기존 소스 분석기를 재사용하고 수정 가능한 함수 선언만 보수적으로 인덱싱한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {inspectSourceFunctions} from './company-vibe2-expert-development.mjs';

const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const ident=/^[A-Za-z_$][A-Za-z0-9_$]*$/;
const protectedPattern=/\b(?:localStorage|sessionStorage|DataStoreService|GetDataStore|SetAsync|UpdateAsync|RemoveAsync|require\s*\(|eval\s*\()/i;

// [유틸] 주석과 문자열을 길이 보존 공백으로 가린다. 복잡한 구문은 편집하지 않는다.
function masked(source,target){
  let result='',quote='',line=false,block=false;
  for(let i=0;i<source.length;i++){
    const c=source[i],next=source[i+1]||'';
    if(line){if(c==='\n'){line=false;result+='\n'}else result+=' ';continue}
    if(block){if(c==='*'&&next==='/'){result+='  ';i++;block=false}else result+=c==='\n'?'\n':' ';continue}
    if(quote){
      if(c==='\\'){result+=' ';if(i+1<source.length){result+=source[++i]==='\n'?'\n':' '}continue}
      if(c===quote)quote='';
      result+=c==='\n'?'\n':' ';continue;
    }
    if(target==='web'&&c==='/'&&next==='/'){result+='  ';i++;line=true;continue}
    if(target==='web'&&c==='/'&&next==='*'){result+='  ';i++;block=true;continue}
    if(target==='roblox'&&c==='-'&&next==='-'){result+='  ';i++;line=true;continue}
    if(c==='"'||c==="'"||(target==='web'&&c.charCodeAt(0)===96)){quote=c;result+=' ';continue}
    result+=c;
  }
  return {code:result,complete:!quote&&!block};
}
function webScript(source,relative){
  if(!/\.html?$/i.test(relative))return {source,offset:0};
  const blocks=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if(blocks.length!==1||blocks[0][1].trim())
    return null; // External scripts or multiple code scopes require explicit binding.
  return {source:blocks[0][2],offset:blocks[0].index+blocks[0][0].indexOf('>')+1};
}
function webFunctions(code,script,offset,relative,sourceSha){
  const rows=[],re=/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*\{/g;
  for(const m of code.matchAll(re)){
    const open=m.index+m[0].length-1;
    let depth=0,close=-1;
    for(let i=open;i<code.length;i++){
      if(code[i]==='{')depth++;
      else if(code[i]==='}'&&--depth===0){close=i;break}
    }
    if(close<0||rows.some(row=>m.index+offset<row.end))continue;
    const bodyCode=code.slice(open+1,close),params=m[2].trim();
    rows.push({name:m[1],path:relative,sourceSha256:sourceSha,
      start:m.index+offset,end:close+1+offset,bodyStart:open+1+offset,
      insertOffset:close+offset,params,bodyCode,
      calls:[],parserConfidence:'BOUNDED_DECLARATION_JS',target:'web',
      protectedState:protectedPattern.test(script.slice(open+1,close)),
      unsafeControl:/\b(?:return|throw|yield|await|break|continue)\b/.test(bodyCode),
      dynamicScope:/\b(?:eval|with)\s*\(/.test(bodyCode)});
  }
  return rows;
}
function luauFunctions(code,script,relative,sourceSha){
  const rows=[],re=/\b(?:local\s+)?function\s+([A-Za-z_][\w]*)\s*\(([^()]*)\)/g;
  for(const m of code.matchAll(re)){
    if(rows.some(row=>m.index<row.end))continue;
    const bodyStart=m.index+m[0].length,remaining=code.slice(bodyStart);
    // Conservative first sprint: nested Luau blocks are not guessed.
    const token=/\b(end|if|for|while|repeat|until|function|do)\b/g;
    const first=token.exec(remaining);
    if(!first||first[1]!=='end')continue;
    const end=bodyStart+first.index,bodyCode=code.slice(bodyStart,end);
    rows.push({name:m[1],path:relative,sourceSha256:sourceSha,
      start:m.index,end:end+3,bodyStart,insertOffset:end,params:m[2].trim(),
      bodyCode,calls:[],parserConfidence:'BOUNDED_LINEAR_LUAU',target:'roblox',
      protectedState:protectedPattern.test(script.slice(bodyStart,end)),
      unsafeControl:/\b(?:return|break|continue)\b/.test(bodyCode),
      dynamicScope:false});
  }
  return rows;
}

// [메인] 디스크와 해시가 검증된 원본만 읽는다. 암묵적 import는 결합하지 않는다.
export function indexVibe2GameSource({sourceRoot='',gameId='',target='',responsibleFiles=[]}={}){
  if(!['web','roblox'].includes(target)||!Array.isArray(responsibleFiles)||
    !responsibleFiles.length||responsibleFiles.length>12)throw Error('VIBE2_SOURCE_INDEX_SCOPE');
  const root=fs.realpathSync(path.resolve(sourceRoot));
  if(path.basename(root)!==gameId)throw Error('VIBE2_SOURCE_INDEX_GAME_ID');
  const functions=[],files=[],unsupported=[];
  for(const relative of new Set(responsibleFiles)){
    if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||
      relative.split('/').some(x=>!x||x==='.'||x==='..')||
      !(target==='web'?/\.(?:js|mjs|cjs|html?)$/i:/\.lua[u]?$/i).test(relative))
      throw Error('VIBE2_SOURCE_INDEX_PATH');
    const full=path.resolve(root,relative),stat=fs.lstatSync(full),real=fs.realpathSync(full);
    if(!full.startsWith(root+path.sep)||!real.startsWith(root+path.sep)||
      !stat.isFile()||stat.isSymbolicLink()||stat.size>260000)
      throw Error('VIBE2_SOURCE_INDEX_ESCAPE');
    const original=fs.readFileSync(full,'utf8'),digest=sha(original);
    files.push({path:relative,sourceSha256:digest,bytes:stat.size});
    const block=target==='web'?webScript(original,relative):{source:original,offset:0};
    if(!block){unsupported.push({path:relative,reason:'HTML_SCRIPT_SCOPE'});continue}
    const lex=masked(block.source,target);
    if(!lex.complete){unsupported.push({path:relative,reason:'LEXICAL_SCOPE'});continue}
    const found=target==='web'
      ?webFunctions(lex.code,block.source,block.offset,relative,digest)
      :luauFunctions(lex.code,block.source,relative,digest);
    // 기존 분석기의 함수 인벤토리와 일치하는 선언만 채택한다.
    const corroborated=new Set(inspectSourceFunctions(block.source,{
      language:target==='web'?'javascript':'luau',maxFunctions:4096}).map(row=>row.name));
    for(const row of found){
      if(!ident.test(row.name)||!corroborated.has(row.name))continue;
      row.calls=[...new Set([...row.bodyCode.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)]
        .map(m=>m[1]))].filter(name=>name!==row.name);
      functions.push(row);
    }
  }
  const counts=new Map();for(const row of functions)counts.set(row.name,(counts.get(row.name)||0)+1);
  return {gameId,target,sourceRoot:root,files,
    functions,duplicateNames:[...counts].filter(([,n])=>n>1).map(([name])=>name),
    edges:functions.flatMap(row=>row.calls.filter(name=>counts.get(name)===1)
      .map(name=>({from:row.name,to:name,path:row.path,evidence:'DIRECT_LEXICAL_CALL'}))),
    unsupported,sourceWrite:false,runtimeVerified:false};
}
