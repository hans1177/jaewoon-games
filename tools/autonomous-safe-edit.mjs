// 파일명: tools/autonomous-safe-edit.mjs
// 역할: 자율/Vibe2 소스 편집의 정확 일치와 안전한 들여쓰기·줄바꿈 차이만 처리한다.

import fs from 'node:fs';
import path from 'node:path';

export const MAX_EDIT_OPS=6;
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
  if(raw.length>MAX_EDIT_OPS)throw new Error(`edits는 최대 ${MAX_EDIT_OPS}개`);
  return raw.map((item,index)=>{
    const relative=assertPath(item?.path);
    const find=String(item?.find??'');
    const replace=String(item?.replace??'');
    if(!find)throw new Error(`edit ${index+1}: find 비어 있음`);
    if(find===replace)throw new Error(`edit ${index+1}: 변경 없음`);
    if(bytes(find)>MAX_FIND_BYTES)throw new Error(`edit ${index+1}: find 너무 큼`);
    if(bytes(replace)>MAX_REPLACE_BYTES)throw new Error(`edit ${index+1}: replace 너무 큼`);
    return {path:relative,find,replace};
  });
}

export function applyExactEdits(root,edits=[]){
  const changed=new Set();
  for(const edit of edits){
    const target=path.join(root,edit.path);
    if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`edit 대상 없음: ${edit.path}`);
    const before=fs.readFileSync(target,'utf8');
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
      console.log(`VIBE2_EDIT_MATCH=TRIMMED_LINES:${edit.path}`);
    }

    const after=before.slice(0,first)+edit.replace+before.slice(end);
    fs.writeFileSync(target,after,'utf8');
    changed.add(edit.path);
  }
  return [...changed];
}
