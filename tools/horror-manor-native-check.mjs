// 파일명: tools/horror-manor-native-check.mjs
// Roblox가 변환한 실제 모델을 다운로드해 클래스/메시/필수 노드/스크립트 부재를 검사한다.
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const root='assets/roblox/midnight-manor/generated';
const evidence=JSON.parse(fs.readFileSync(`${root}/roblox-asset.json`,'utf8'));
const cookie=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
assert.ok(cookie,'Existing account session required');
const headers={cookie:cookie.includes('.ROBLOSECURITY=')?cookie:`.ROBLOSECURITY=${cookie};`};
const response=await fetch(`https://assetdelivery.roblox.com/v1/asset/?id=${evidence.assetId}`,{headers,signal:AbortSignal.timeout(60000)});
assert.ok(response.ok,`MANOR_NATIVE_DOWNLOAD_HTTP_${response.status}`);
const file=Buffer.from(await response.arrayBuffer());
assert.ok(file.length>1000,'Model is empty');
function lz4(input,size){
 const out=Buffer.alloc(size);let i=0,o=0;
 while(i<input.length){
  const token=input[i++];let literals=token>>4;
  if(literals===15){let x;do{x=input[i++];literals+=x;}while(x===255);}
  assert.ok(i+literals<=input.length&&o+literals<=size,'Invalid LZ4 literal');
  input.copy(out,o,i,i+literals);i+=literals;o+=literals;if(i===input.length)break;
  const distance=input.readUInt16LE(i);i+=2;let count=(token&15)+4;
  if((token&15)===15){let x;do{x=input[i++];count+=x;}while(x===255);}
  assert.ok(distance>0&&distance<=o&&o+count<=size,'Invalid LZ4 match');
  for(let n=0;n<count;n++){out[o]=out[o-distance];o++;}
 }
 assert.equal(o,size,'LZ4 output mismatch');return out;
}
const classes=new Map(),names=[];
if(file.toString('utf8',0,8)==='<roblox!'){
 assert.equal(file.readUInt16LE(14),0,'Unknown RBXM version');
 const chunks=[];
 for(let offset=32;offset+16<=file.length;){
  const kind=file.toString('ascii',offset,offset+4),compressed=file.readUInt32LE(offset+4),size=file.readUInt32LE(offset+8);offset+=16;
  const data=file.subarray(offset,offset+(compressed||size));offset+=compressed||size;
  let value=data;
  if(compressed)value=data.readUInt32LE(0)===0xfd2fb528?zlib.zstdDecompressSync(data):lz4(data,size);
  chunks.push({kind,value});if(kind.startsWith('END'))break;
 }
 for(const {kind,value:b}of chunks){
  if(kind!=='INST')continue;
  const id=b.readUInt32LE(0),len=b.readUInt32LE(4),name=b.toString('utf8',8,8+len),count=b.readUInt32LE(9+len);
  classes.set(id,{name,count});
 }
 for(const {kind,value:b}of chunks){
  if(kind!=='PROP')continue;
  const id=b.readUInt32LE(0),len=b.readUInt32LE(4),name=b.toString('utf8',8,8+len);
  if(name!=='Name'||b[8+len]!==1)continue;
  let offset=9+len;
  for(let i=0;i<(classes.get(id)?.count||0);i++){const n=b.readUInt32LE(offset);offset+=4;names.push(b.toString('utf8',offset,offset+n));offset+=n;}
 }
}else{
 const xml=file.toString('utf8');assert.match(xml,/<roblox/,'Unknown native model encoding');
 for(const m of xml.matchAll(/<Item class="([^"]+)"/g)){const entry=classes.get(m[1])||{name:m[1],count:0};entry.count++;classes.set(m[1],entry);}
 for(const m of xml.matchAll(/<string name="Name">([^<]*)<\/string>/g))names.push(m[1]);
}
const values=[...classes.values()];const meshes=values.filter(x=>x.name==='MeshPart').reduce((n,x)=>n+x.count,0);
assert.ok(meshes>=200,`Native import contains only ${meshes} meshes`);
assert.ok(!values.some(x=>['Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','Tool'].includes(x.name)),'Unexpected executable asset content');
for(const name of ['ButlerHead','ArchivistHead','CoffinLid'])assert.ok(names.includes(name),`Missing native node ${name}`);
assert.ok(names.some(x=>x.startsWith('Butler_')),'Missing imported butler GLB');
const result={assetId:evidence.assetId,meshCount:meshes,byteCount:file.length,classes:values,pass:true,actualPlayTest:false,checkedAt:new Date().toISOString()};
fs.writeFileSync(`${root}/native-import-check.json`,JSON.stringify(result,null,2)+'\n');
console.log(`MANOR_NATIVE_IMPORT_CHECK=PASS:${meshes}`);
