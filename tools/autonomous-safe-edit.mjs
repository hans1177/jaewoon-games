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
    const first=before.indexOf(edit.find);
    if(first<0)throw new Error(`edit find 불일치: ${edit.path}`);
    if(before.indexOf(edit.find,first+edit.find.length)>=0)throw new Error(`edit find 다중일치: ${edit.path}`);
    const after=before.slice(0,first)+edit.replace+before.slice(first+edit.find.length);
    fs.writeFileSync(target,after,'utf8');
    changed.add(edit.path);
  }
  return [...changed];
}
