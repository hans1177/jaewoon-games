// 파일명: tools/horror-combat-native-check.mjs
// Roblox가 변환한 authored 전투 모델을 받아 게시 place 안에 직접 패키징할 native RBXM을 검증한다.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

const evidence=JSON.parse(fs.readFileSync('assets/roblox/world-ghosts/native/combat-roblox-assets.json','utf8'));
const assetId=Number(evidence.humanoidModelId||0);
assert.ok(assetId>0,'COMBAT_NATIVE_MODEL_ID_MISSING');
const cookieRaw=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
assert.ok(cookieRaw,'COMBAT_NATIVE_COOKIE_MISSING');
const cookie=cookieRaw.includes('.ROBLOSECURITY=')?cookieRaw:`.ROBLOSECURITY=${cookieRaw};`;

const response=await fetch(`https://assetdelivery.roblox.com/v1/asset/?id=${assetId}`,{
  headers:{cookie},
  signal:AbortSignal.timeout(60000),
});
assert.ok(response.ok,`COMBAT_NATIVE_DOWNLOAD_HTTP_${response.status}`);
const file=Buffer.from(await response.arrayBuffer());
assert.ok(file.length>10000,'COMBAT_NATIVE_MODEL_EMPTY');

function lz4(input,size){
  const out=Buffer.alloc(size);let i=0,o=0;
  while(i<input.length){
    const token=input[i++];let literals=token>>4;
    if(literals===15){let x;do{x=input[i++];literals+=x;}while(x===255);}
    assert.ok(i+literals<=input.length&&o+literals<=size,'COMBAT_NATIVE_LZ4_LITERAL');
    input.copy(out,o,i,i+literals);i+=literals;o+=literals;
    if(i===input.length)break;
    const distance=input.readUInt16LE(i);i+=2;let count=(token&15)+4;
    if((token&15)===15){let x;do{x=input[i++];count+=x;}while(x===255);}
    assert.ok(distance>0&&distance<=o&&o+count<=size,'COMBAT_NATIVE_LZ4_MATCH');
    for(let n=0;n<count;n++){out[o]=out[o-distance];o++;}
  }
  assert.equal(o,size,'COMBAT_NATIVE_LZ4_SIZE');
  return out;
}

const classes=new Map();
if(file.toString('utf8',0,8)==='<roblox!'){
  assert.equal(file.readUInt16LE(14),0,'COMBAT_NATIVE_UNKNOWN_BINARY_VERSION');
  const chunks=[];
  for(let offset=32;offset+16<=file.length;){
    const kind=file.toString('ascii',offset,offset+4);
    const compressed=file.readUInt32LE(offset+4);
    const size=file.readUInt32LE(offset+8);
    offset+=16;
    const data=file.subarray(offset,offset+(compressed||size));
    offset+=compressed||size;
    let value=data;
    if(compressed)value=data.readUInt32LE(0)===0xfd2fb528?zlib.zstdDecompressSync(data):lz4(data,size);
    chunks.push({kind,value});
    if(kind.startsWith('END'))break;
  }
  for(const {kind,value:b} of chunks){
    if(kind!=='INST')continue;
    const id=b.readUInt32LE(0);
    const len=b.readUInt32LE(4);
    const name=b.toString('utf8',8,8+len);
    const count=b.readUInt32LE(9+len);
    classes.set(id,{name,count});
  }
}else{
  const xml=file.toString('utf8');
  assert.match(xml,/<roblox/,'COMBAT_NATIVE_UNKNOWN_ENCODING');
  let id=0;
  for(const m of xml.matchAll(/<Item class="([^"]+)"/g)){
    const key=m[1];
    const existing=[...classes.values()].find(x=>x.name===key);
    if(existing)existing.count++;
    else classes.set(++id,{name:key,count:1});
  }
}

const values=[...classes.values()];
const count=name=>values.filter(x=>x.name===name).reduce((n,x)=>n+x.count,0);
const meshes=count('MeshPart');
const bones=count('Bone');
assert.ok(meshes>=8,`COMBAT_NATIVE_MESH_COUNT_LOW:${meshes}`);
assert.ok(bones>=20,`COMBAT_NATIVE_BONE_COUNT_LOW:${bones}`);
for(const forbidden of ['Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','Tool']){
  assert.equal(count(forbidden),0,`COMBAT_NATIVE_EXECUTABLE_FORBIDDEN:${forbidden}`);
}

const modelPath=String(process.env.COMBAT_NATIVE_MODEL||'').trim();
assert.ok(modelPath,'COMBAT_NATIVE_MODEL_OUTPUT_MISSING');
fs.mkdirSync(path.dirname(modelPath),{recursive:true});
fs.writeFileSync(modelPath,file);
const evidenceOut=String(process.env.COMBAT_NATIVE_EVIDENCE||path.join(path.dirname(modelPath),'native-import-check.json'));
fs.writeFileSync(evidenceOut,JSON.stringify({
  assetId,
  sourceSha256:evidence.sha256,
  byteCount:file.length,
  meshCount:meshes,
  boneCount:bones,
  packaged:true,
  checkedAt:new Date().toISOString(),
},null,2)+'\n');
console.log(`COMBAT_NATIVE_IMPORT_CHECK=PASS:asset=${assetId}:meshes=${meshes}:bones=${bones}:bytes=${file.length}`);
