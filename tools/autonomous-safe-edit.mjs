// 파일명: tools/autonomous-safe-edit.mjs
// 역할: 자율/Vibe2 소스 편집의 정확 일치와 안전한 들여쓰기·줄바꿈 차이만 처리한다.

import fs from 'node:fs';
import path from 'node:path';

// Edit count is unbounded; aggregate bytes and exact-anchor safety still apply.
export const MAX_EDIT_OPS=null;
export const MAX_TOTAL_EDIT_BYTES=600000;
export const MAX_FIND_BYTES=16000;
export const MAX_REPLACE_BYTES=32000;
export const LARGE_CONTEXT_CHUNK_BYTES=60000;

const bytes=v=>Buffer.byteLength(String(v??''));
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');

export function boundedLargeExcerpt(text,chunkBytes=LARGE_CONTEXT_CHUNK_BYTES){
  const value=String(text??'');
  if(bytes(value)<=chunkBytes*3)return {content:value,truncated:false};
  const chars=Math.max(1000,Math.floor(chunkBytes*0.9));
  const middle=Math.max(0,Math.floor(value.length/2-chars/2));
  return {
    content:[
      '[BEGIN_EXCERPT]',value.slice(0,chars),
      '\n[MIDDLE_EXCERPT]',value.slice(middle,middle+chars),
      '\n[END_EXCERPT]',value.slice(-chars),
    ].join('\n'),
    truncated:true,
  };
}

export function normalizeExactEdits(raw=[],assertPath=v=>posix(v)){
  if(!Array.isArray(raw))throw new Error('edits는 배열이어야 함');
  let totalBytes=0;
  return raw.map((item,index)=>{
    const relative=assertPath(item?.path);
    const find=String(item?.find??'');
    const replace=String(item?.replace??'');
    if(!find)throw new Error(`edit ${index+1}: find 비어 있음`);
    if(find===replace)throw new Error(`edit ${index+1}: 변경 없음`);
    if(bytes(find)>MAX_FIND_BYTES)throw new Error(`edit ${index+1}: find 너무 큼`);
    if(bytes(replace)>MAX_REPLACE_BYTES)throw new Error(`edit ${index+1}: replace 너무 큼`);
    totalBytes+=bytes(find)+bytes(replace);
    if(totalBytes>MAX_TOTAL_EDIT_BYTES)throw new Error('edits 총 바이트 제한 초과');
    return {path:relative,find,replace};
  });
}

export function applyExactEdits(root,edits=[],{dryRun=false,documents=null}={}){
  const changed=new Set();
  const simulated=new Map();
  const markers=[];
  for(const edit of edits){
    const target=path.join(root,edit.path);
    if(documents instanceof Map?!documents.has(edit.path):!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`edit 대상 없음: ${edit.path}`);
    const before=simulated.has(edit.path)?simulated.get(edit.path):documents instanceof Map?documents.get(edit.path):fs.readFileSync(target,'utf8');
    let first=before.indexOf(edit.find);
    let end=first<0?-1:first+edit.find.length;
    if(first>=0&&before.indexOf(edit.find,end)>=0)throw new Error(`edit find 다중일치: ${edit.path}`);

    if(first<0){
      const wanted=edit.find.replaceAll('\r\n','\n').split('\n').map(line=>line.trim());
      while(wanted.length&&wanted[0]==='')wanted.shift();
      while(wanted.length&&wanted[wanted.length-1]==='')wanted.pop();
      const sourceLines=before.split('\n');
      const offsets=[];
      let offset=0;
      for(const line of sourceLines){offsets.push(offset);offset+=line.length+1;}
      const matches=[];
      for(let i=0;i+wanted.length<=sourceLines.length;i+=1){
        let same=wanted.length>0;
        for(let j=0;j<wanted.length&&same;j+=1){
          same=sourceLines[i+j].replace(/\r$/,'').trim()===wanted[j];
        }
        if(!same)continue;
        const firstLine=sourceLines[i].replace(/\r$/,'');
        const lastIndex=i+wanted.length-1;
        const lastLine=sourceLines[lastIndex].replace(/\r$/,'');
        const localStart=firstLine.indexOf(wanted[0]);
        const localEnd=lastLine.lastIndexOf(wanted[wanted.length-1])+wanted[wanted.length-1].length;
        if(localStart<0||localEnd<0)continue;
        matches.push({first:offsets[i]+localStart,end:offsets[lastIndex]+localEnd});
      }
      if(matches.length>1)throw new Error(`edit find 다중일치: ${edit.path}`);
      if(matches.length===0)throw new Error(`edit find 불일치: ${edit.path}`);
      ({first,end}=matches[0]);
      markers.push(`VIBE2_EDIT_MATCH=TRIMMED_LINES:${edit.path}`);
    }

    let after=before.slice(0,first)+edit.replace+before.slice(end);
    const beforeTail=before.match(/(?:\r?\n)+$/)?.[0]||'';
    const afterTail=after.match(/(?:\r?\n)+$/)?.[0]||'';
    const beforeBreaks=(beforeTail.match(/\n/g)||[]).length;
    const afterBreaks=(afterTail.match(/\n/g)||[]).length;
    if(beforeBreaks<=1&&afterBreaks>beforeBreaks){
      const preservedEol=before.endsWith('\r\n')?'\r\n':before.endsWith('\n')?'\n':'';
      after=after.slice(0,after.length-afterTail.length)+preservedEol;
      markers.push(`VIBE2_EDIT_EOF_BLANK_LINES_NORMALIZED:${edit.path}`);
    }
    simulated.set(edit.path,after);
    changed.add(edit.path);
  }
  // 모든 앵커의 순차 적용을 먼저 검증한다. 뒤쪽 불일치로 앞쪽 파일만 바뀌는 것을 막는다.
  // 자산 검사도 같은 변환 함수를 사용해 줄바꿈·들여쓰기·달러 문자열 처리 차이를 없앤다.
  if(!dryRun){
    for(const [relative,after] of simulated){
      if(documents instanceof Map)documents.set(relative,after);
      else fs.writeFileSync(path.join(root,relative),after,'utf8');
    }
    if(!(documents instanceof Map))for(const marker of markers)console.log(marker);
  }
  return [...changed];
}
