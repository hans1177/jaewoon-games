// 파일명: mare-essentia-character-finish.mjs
// [원본 자산] 주민 의상·헤어·장신구 26종의 UV 및 실제 PBR 맵을 기존 자산 등록 전에 직접 제작한다.
// [안전] 기존 지오메트리, 부품·스킨·애니메이션, 원색, 물리·저장 구조는 변경하지 않는다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {deflateSync} from 'node:zlib';

const ITEMS = [
  'outfit_vest','outfit_coat','outfit_guard','outfit_apron','outfit_sash','outfit_belt',
  'outfit_cuff','outfit_boot','outfit_stole',
  'hair_beard','hair_braided_crown','hair_buns','hair_buzzed','hair_buzzedfemale',
  'hair_court_curls','hair_long','hair_low_bun','hair_sailor_ponytail',
  'hair_shoulder_waves','hair_side_braid','hair_simpleparted',
  'acc_feather_hat','acc_guild_badge','acc_pearl_hairpin','acc_ribbon_bow',
  'acc_sailor_headband',
];
const MAP_SIZE = 128;
const ROLES = ['fabric','leather','metal','hair','feather','pearl'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blobSha = bytes => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const align = length => (length + 3) & ~3;
const clamp = value => Math.max(0,Math.min(255,Math.round(value)));
const clamp01 = value => Math.max(0,Math.min(1,value));
const crcTable = Array.from({length:256},(_,index) => {
  let value=index;
  for(let i=0;i<8;i++) value=(value&1)?0xedb88320^(value>>>1):value>>>1;
  return value>>>0;
});
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes) crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function pngChunk(type,data){
  const header=Buffer.alloc(8),name=Buffer.from(type,'ascii'),footer=Buffer.alloc(4);
  header.writeUInt32BE(data.length,0);
  name.copy(header,4);
  footer.writeUInt32BE(crc32(Buffer.concat([name,data])),0);
  return Buffer.concat([header,data,footer]);
}
function pngRGB(render){
  const n=MAP_SIZE,rows=Buffer.alloc(n*(n*3+1));
  for(let y=0;y<n;y++){
    let pos=y*(n*3+1)+1;
    for(let x=0;x<n;x++){
      const rgb=render(x,y);
      rows[pos++]=clamp(rgb[0]);rows[pos++]=clamp(rgb[1]);rows[pos++]=clamp(rgb[2]);
    }
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(n,0);header.writeUInt32BE(n,4);header[8]=8;header[9]=2;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR',header),pngChunk('IDAT',deflateSync(rows,{level:9})),
    pngChunk('IEND',Buffer.alloc(0)),
  ]);
}
function textureSet(kind){
  const n=MAP_SIZE,two=Math.PI*2,height=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n;
    const wave = kind==='fabric' ? Math.sin(two*u*36)*Math.cos(two*v*36)*0.5+Math.sin(two*v*36)*0.35
      : kind==='leather' ? Math.sin(two*u*7+1.3*Math.cos(two*v*13))*Math.sin(two*v*9)*0.35
        +Math.sin(two*u*31)*0.11+Math.cos(two*v*27)*0.09
      : kind==='metal' ? Math.sin(two*u*21)*0.17+Math.sin(two*u*55)*0.08
      : kind==='hair' ? Math.sin(two*u*47+1.2*Math.sin(two*v*4))*0.5+Math.sin(two*u*72)*0.18
      : kind==='feather' ? Math.sin(two*(u*30+v*15))*0.36+Math.cos(two*(u*6-v*3))*0.12
      : Math.sin(two*u*3)*Math.cos(two*v*3)*0.05;
    height[y*n+x]=wave;
  }
  const at=(x,y)=>height[((y+n)%n)*n+((x+n)%n)];
  return {
    color:pngRGB((x,y)=>{
      const value=clamp(250+at(x,y)*(kind==='leather'?6:kind==='metal'||kind==='pearl'?2:5));
      return [value,value,value]; // 기존 glTF baseColorFactor를 그대로 곱해 원래 색상을 유지한다.
    }),
    normal:pngRGB((x,y)=>{
      const amount=kind==='pearl'?0.03:kind==='metal'?0.06:kind==='hair'?0.09:0.105;
      const dx=(at(x+1,y)-at(x-1,y))*amount,dy=(at(x,y+1)-at(x,y-1))*amount;
      const nz=1/Math.sqrt(1+dx*dx+dy*dy);
      return [128-dx*nz*127,128-dy*nz*127,128+nz*127];
    }),
    rough:pngRGB((x,y)=>[255,(kind==='fabric'?235:kind==='hair'?230:kind==='feather'?241:
      kind==='leather'?222:kind==='metal'?219:230)+at(x,y)*8,255]),
  };
}
function materialRole(name,material){
  const pbr=material.pbrMetallicRoughness||{};
  const color=pbr.baseColorFactor||[1,1,1,1],metal=pbr.metallicFactor||0;
  if(name.startsWith('hair_'))return 'hair';
  if(name==='acc_pearl_hairpin')return metal>0.5?'metal':'pearl';
  if(name==='acc_feather_hat'){
    if(metal>0.5)return 'metal';
    if(color[0]>0.6&&color[1]>0.6)return 'feather';
    return color[0]<0.4?'leather':'fabric';
  }
  if(name==='acc_guild_badge')return metal>0.5?'metal':'leather';
  if(name==='acc_ribbon_bow')return metal>0.5?'metal':'fabric';
  if(name==='acc_sailor_headband')return metal>0.5?'metal':color[0]<0.25?'fabric':'leather';
  if(metal>0.5)return 'metal';
  if(metal>0.025||name==='outfit_belt'||name==='outfit_boot')return 'leather';
  return 'fabric';
}
function glbParts(bytes,name){
  if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||
     bytes.readUInt32LE(8)!==bytes.length||bytes.readUInt32LE(16)!==0x4e4f534a)
    throw Error('MARE_CHARACTER_INVALID_GLB:'+name);
  const jsonLen=bytes.readUInt32LE(12),binHeader=20+jsonLen,binLen=bytes.readUInt32LE(binHeader);
  if(bytes.readUInt32LE(binHeader+4)!==0x004e4942)throw Error('MARE_CHARACTER_BIN_MISSING:'+name);
  const scene=JSON.parse(bytes.toString('utf8',20,20+jsonLen));
  const data=bytes.subarray(binHeader+8,binHeader+8+binLen);
  if(!scene.buffers?.length||scene.buffers.length!==1||!scene.meshes?.length||
     !scene.materials?.length||!scene.accessors?.length)throw Error('MARE_CHARACTER_GEOMETRY_MISSING:'+name);
  return {scene,data};
}
function addPbr(bytes,name,maps){
  const {scene,data}=glbParts(bytes,name),buffers=[data],original=data.length;
  scene.bufferViews??=[];scene.accessors??=[];scene.samplers??=[];scene.textures??=[];scene.images??=[];
  let offset=original,uvAdded=0,primitives=0;
  const append=(block,target)=>{
    const pad=align(offset)-offset;
    if(pad){buffers.push(Buffer.alloc(pad));offset+=pad;}
    const index=scene.bufferViews.length;
    scene.bufferViews.push({buffer:0,byteOffset:offset,byteLength:block.length,...(target?{target}:{})});
    buffers.push(block);offset+=block.length;
    return index;
  };
  const sampler=scene.samplers.length;
  scene.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
  const used=new Map();
  const imagesFor=role=>{
    if(used.has(role))return used.get(role);
    const group=maps.get(role),ids=[];
    for(const field of ['color','normal','rough']){
      const image=scene.images.length;
      scene.images.push({name:'mare_'+role+'_'+field+'_128',mimeType:'image/png',bufferView:append(group[field])});
      const index=scene.textures.length;
      scene.textures.push({source:image,sampler});
      ids.push(index);
    }
    used.set(role,ids);
    return ids;
  };
  for(const mesh of scene.meshes)for(const primitive of mesh.primitives||[]){
    primitives++;
    if(!Number.isInteger(primitive.attributes?.TEXCOORD_0)){
      const source=scene.accessors[primitive.attributes?.POSITION],view=scene.bufferViews[source?.bufferView];
      if(!source||!view||source.type!=='VEC3'||source.componentType!==5126||view.buffer!==0)
        throw Error('MARE_CHARACTER_UV_POSITION_INVALID:'+name);
      const vertexData=new Float32Array(source.count*3),stride=view.byteStride||12;
      for(let i=0;i<source.count;i++){
        const pos=(view.byteOffset||0)+(source.byteOffset||0)+i*stride;
        if(pos<0||pos+12>data.length)throw Error('MARE_CHARACTER_VERTEX_OUT_OF_BOUNDS:'+name);
        for(let axis=0;axis<3;axis++)vertexData[i*3+axis]=data.readFloatLE(pos+axis*4);
      }
      const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<source.count;i++)for(let a=0;a<3;a++){
        const value=vertexData[i*3+a];mins[a]=Math.min(mins[a],value);maxs[a]=Math.max(maxs[a],value);
      }
      const axes=[0,1,2].sort((a,b)=>(maxs[b]-mins[b])-(maxs[a]-mins[a]));
      const uAxis=axes[0],vAxis=axes[1],uw=Math.max(0.00001,maxs[uAxis]-mins[uAxis]);
      const vw=Math.max(0.00001,maxs[vAxis]-mins[vAxis]),uv=Buffer.alloc(source.count*8);
      for(let i=0;i<source.count;i++){
        uv.writeFloatLE(clamp01((vertexData[i*3+uAxis]-mins[uAxis])/uw),i*8);
        uv.writeFloatLE(clamp01((vertexData[i*3+vAxis]-mins[vAxis])/vw),i*8+4);
      }
      const accessor=scene.accessors.length;
      scene.accessors.push({bufferView:append(uv,34962),componentType:5126,count:source.count,type:'VEC2',min:[0,0],max:[1,1]});
      primitive.attributes.TEXCOORD_0=accessor;uvAdded++;
    }
    const material=scene.materials[primitive.material];
    if(!material)throw Error('MARE_CHARACTER_MATERIAL_MISSING:'+name);
    const role=materialRole(name,material),indexes=imagesFor(role);
    const pbr=material.pbrMetallicRoughness??{};
    material.pbrMetallicRoughness=pbr;
    pbr.baseColorTexture={index:indexes[0]};
    pbr.metallicRoughnessTexture={index:indexes[2]};
    material.normalTexture={index:indexes[1],scale:role==='pearl'?0.08:role==='metal'?0.22:role==='hair'?0.33:0.4};
    // 금속성과 거칠기, 오리지널 색상, 투명도는 바꾸지 않는다.
  }
  if(!primitives||primitives>16||!scene.images.length||name.startsWith('outfit_')&&uvAdded)
    throw Error('MARE_CHARACTER_RIG_OR_ORIGINAL_UV_CHANGED:'+name);
  scene.buffers[0].byteLength=offset;
  const json=Buffer.from(JSON.stringify(scene),'utf8'),body=Buffer.concat(buffers);
  const jsonLength=align(json.length),binLength=align(body.length),full=Buffer.alloc(12+8+jsonLength+8+binLength);
  full.write('glTF',0,'ascii');full.writeUInt32LE(2,4);full.writeUInt32LE(full.length,8);
  full.writeUInt32LE(jsonLength,12);full.writeUInt32LE(0x4e4f534a,16);
  json.copy(full,20);full.fill(32,20+json.length,20+jsonLength);
  const at=20+jsonLength;
  full.writeUInt32LE(binLength,at);full.writeUInt32LE(0x004e4942,at+4);body.copy(full,at+8);
  if(!full.subarray(at+8,at+8+original).equals(data))
    throw Error('MARE_CHARACTER_ORIGINAL_MESH_CHANGED:'+name);
  return {full,primitives,uvAdded,maps:scene.images.length,roles:[...used.keys()]};
}
export async function prepareCharacterFinishes(root){
  const dir=path.join(root,'assets','people'),maps=new Map(ROLES.map(role=>[role,textureSet(role)]));
  let generated=0,already=0;
  for(const name of ITEMS){
    const file=path.join(dir,name+'.glb'),proofFile=file+'.license.json';
    const original=await fs.readFile(file);
    let proof;
    try{proof=JSON.parse(await fs.readFile(proofFile,'utf8'));}
    catch(e){
      if(e.code!=='ENOENT'||!name.startsWith('hair_'))throw e;
      proof={license:'CC0-1.0',author:'Quaternius',
        source:'https://quaternius.com/packs/universalbasecharacters.html',
        sourceType:'Quaternius original character hair with project-authored PBR finish',
        nativeRuntimeVerified:false};
    }
    if(proof.license!=='CC0-1.0'||!proof.author||!proof.source)
      throw Error('MARE_CHARACTER_CC0_PROVENANCE_REQUIRED:'+name);
    if(proof.pbrVersion===2){
      if(proof.sourceSha256!==sha256(original)||proof.sourceGitBlobSha1!==blobSha(original)||
         !glbParts(original,name).scene.images?.length)
        throw Error('MARE_CHARACTER_EXISTING_PBR_MISMATCH:'+name);
      already++;continue;
    }
    if(proof.sourceGitBlobSha1&&proof.sourceGitBlobSha1!==blobSha(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA1_MISMATCH:'+name);
    if(proof.sourceSha256&&proof.sourceSha256!==sha256(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA256_MISMATCH:'+name);
    const rebuilt=addPbr(original,name,maps);
    proof.pbrVersion=2;proof.pbrMethod='Project-authored PBR textile, leather, hair, pearl, feather and metal maps; source geometry and original colors preserved';
    proof.pbrSourceGitBlobSha1=blobSha(original);
    proof.pbrTextureSize=MAP_SIZE;proof.pbrRoles=rebuilt.roles;
    proof.pbrColorMap=true;proof.pbrNormalMap=true;proof.pbrRoughnessMetallicMap=true;
    proof.pbrUvAddedPrimitives=rebuilt.uvAdded;
    proof.sourceGitBlobSha1=blobSha(rebuilt.full);proof.sourceSha256=sha256(rebuilt.full);
    proof.sourceSizeBytes=rebuilt.full.length;
    proof.registrationStatus='PENDING_REUPLOAD';proof.nativeVisualQa='UNVERIFIED';
    await fs.writeFile(file,rebuilt.full);
    await fs.writeFile(proofFile,JSON.stringify(proof,null,2)+'\n');
    generated++;
    console.log('MARE_CHARACTER_PBR_SOURCE_READY',name,rebuilt.primitives,rebuilt.uvAdded,rebuilt.maps,proof.sourceSha256);
  }
  if(generated+already!==ITEMS.length)throw Error('MARE_CHARACTER_PBR_26_INCOMPLETE');
  console.log('MARE_CHARACTER_PBR_TOTAL=26 GENERATED='+generated+' VERIFIED='+already);
  return {generated,verified:already};
}
