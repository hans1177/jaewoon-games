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
const MAP_SIZE = 256;
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
  // [기존 원본색 보존] RGB는 GLB 원래 baseColorFactor를 곱하는 2차 표면 무늬다.
  // [재질 차이 실물화] 256px 직조·가죽 결·브러시 금속·모발 결·깃털·진주를 서로 다른 주파수와 거칠기로 만든다.
  const n=MAP_SIZE,two=Math.PI*2,height=new Float32Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n;
    const wave = kind==='fabric'
      ? Math.sin(two*u*42)*Math.sin(two*v*42)*0.46+Math.sin(two*u*84)*0.10+Math.sin(two*v*84)*0.10
      : kind==='leather'
      ? Math.sin(two*u*9+1.4*Math.cos(two*v*13))*Math.sin(two*v*11)*0.43
        +Math.sin(two*(u*28+v*13))*0.15+Math.cos(two*(v*36-u*5))*0.11
      : kind==='metal'
      ? Math.sin(two*u*36)*0.29+Math.sin(two*u*83+two*v*2)*0.13
      : kind==='hair'
      ? Math.sin(two*u*73+0.75*Math.sin(two*v*3))*0.48+Math.sin(two*u*116)*0.20
      : kind==='feather'
      ? Math.sin(two*(u*35+v*17))*0.38+Math.cos(two*(u*9-v*8))*0.17
      : Math.sin(two*u*4)*Math.cos(two*v*4)*0.10;
    height[y*n+x]=wave;
  }
  const at=(x,y)=>height[((y+n)%n)*n+((x+n)%n)];
  const tint=kind==='fabric'?221:kind==='leather'?202:kind==='metal'?243:
    kind==='hair'?212:kind==='feather'?237:249;
  const colorGain=kind==='fabric'?30:kind==='leather'?39:kind==='hair'?35:kind==='feather'?21:7;
  const relief=kind==='fabric'?0.54:kind==='leather'?0.60:kind==='metal'?0.17:
    kind==='hair'?0.49:kind==='feather'?0.36:0.035;
  const rough=kind==='fabric'?238:kind==='leather'?172:kind==='metal'?94:
    kind==='hair'?169:kind==='feather'?219:113;
  const roughVariation=kind==='fabric'?13:kind==='leather'?28:kind==='metal'?24:
    kind==='hair'?21:kind==='feather'?15:8;
  return {
    color:pngRGB((x,y)=>{
      const value=clamp(tint+at(x,y)*colorGain);
      return [value,value,value];
    }),
    normal:pngRGB((x,y)=>{
      const dx=(at(x+1,y)-at(x-1,y))*relief,dy=(at(x,y+1)-at(x,y-1))*relief;
      const nz=1/Math.sqrt(1+dx*dx+dy*dy);
      return [128-dx*nz*127,128-dy*nz*127,128+nz*127];
    }),
    // [glTF 금속-거칠기 채널] G=roughness / B=metallic. 비금속 옷·머리가 금속이 되지 않게 B를 0으로 고정한다.
    rough:pngRGB((x,y)=>[255,clamp(rough+at(x,y)*roughVariation),kind==='metal'?255:0]),
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
      scene.images.push({name:'mare_'+role+'_'+field+'_256',mimeType:'image/png',bufferView:append(group[field])});
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
    material.normalTexture={index:indexes[1],scale:role==='metal'?0.46:role==='pearl'?0.13:role==='hair'?0.74:role==='fabric'?0.82:role==='leather'?0.90:0.60};
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
// [기존 PBR 보존 업그레이드] v2 GLB의 정점·인덱스·UV는 그대로 유지하고 3종 PNG 표면만 교체한다.
// 같은 glTF bufferView에 새 이미지를 재포장하여 구형 PNG를 이중으로 넣지 않는다.
function retouchPbr(bytes,name,maps,proof){
  const {scene,data}=glbParts(bytes,name);
  const replacements=new Map(),roles=new Set();
  for(const img of scene.images||[]){
    const found=/^mare_(fabric|leather|metal|hair|feather|pearl)_(color|normal|rough)_128$/.exec(img.name||'');
    if(!found||!Number.isInteger(img.bufferView)||replacements.has(img.bufferView))
      throw Error('MARE_CHARACTER_V2_TEXTURE_LAYOUT_MISMATCH:'+name);
    const [,role,field]=found,group=maps.get(role);
    if(!group||!group[field])throw Error('MARE_CHARACTER_V3_ROLE_MISSING:'+name);
    replacements.set(img.bufferView,group[field]);
    roles.add(role);
    img.name='mare_'+role+'_'+field+'_256';
  }
  if(replacements.size<3||replacements.size!==(scene.images||[]).length)
    throw Error('MARE_CHARACTER_V2_PBR_TEXTURES_MISSING:'+name);
  const ordered=scene.bufferViews.map((view,index)=>({view,index}))
    .sort((a,b)=>(a.view.byteOffset||0)-(b.view.byteOffset||0));
  const parts=[];let next=0,oldEnd=0;
  for(const entry of ordered){
    const {view,index}=entry,offset=view.byteOffset||0,length=view.byteLength;
    if(offset<oldEnd||offset<0||!Number.isInteger(length)||length<1||offset+length>data.length)
      throw Error('MARE_CHARACTER_V3_BUFFERVIEW_OVERLAP:'+name);
    const block=replacements.get(index)||data.subarray(offset,offset+length);
    const pad=align(next)-next;
    if(pad){parts.push(Buffer.alloc(pad));next+=pad;}
    view.byteOffset=next;
    view.byteLength=block.length;
    parts.push(block);next+=block.length;
    oldEnd=offset+length;
  }
  for(const material of scene.materials||[]){
    if(!material.normalTexture)throw Error('MARE_CHARACTER_V3_NORMAL_MISSING:'+name);
    const role=materialRole(name,material);
    material.normalTexture.scale=role==='metal'?0.46:role==='pearl'?0.13:
      role==='hair'?0.74:role==='fabric'?0.82:role==='leather'?0.90:0.60;
  }
  scene.buffers[0].byteLength=next;
  const json=Buffer.from(JSON.stringify(scene),'utf8'),body=Buffer.concat(parts);
  const jsonLength=align(json.length),binLength=align(body.length),full=Buffer.alloc(12+8+jsonLength+8+binLength);
  full.write('glTF',0,'ascii');full.writeUInt32LE(2,4);full.writeUInt32LE(full.length,8);
  full.writeUInt32LE(jsonLength,12);full.writeUInt32LE(0x4e4f534a,16);
  json.copy(full,20);full.fill(32,20+json.length,20+jsonLength);
  const at=20+jsonLength;
  full.writeUInt32LE(binLength,at);full.writeUInt32LE(0x004e4942,at+4);body.copy(full,at+8);
  const originalBytes=proof.originalGeometryByteLength||0;
  if(originalBytes>0&&!body.subarray(0,originalBytes).equals(data.subarray(0,originalBytes)))
    throw Error('MARE_CHARACTER_V3_GEOMETRY_CHANGED:'+name);
  return {full,primitives:scene.meshes.reduce((n,m)=>n+(m.primitives||[]).length,0),
    uvAdded:proof.pbrUvAddedPrimitives||0,maps:scene.images.length,roles:[...roles]};
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
    if(proof.pbrVersion===3){
      if(proof.sourceSha256!==sha256(original)||proof.sourceGitBlobSha1!==blobSha(original)||
         !glbParts(original,name).scene.images?.length)
        throw Error('MARE_CHARACTER_EXISTING_PBR_MISMATCH:'+name);
      already++;continue;
    }
    if(proof.sourceGitBlobSha1&&proof.sourceGitBlobSha1!==blobSha(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA1_MISMATCH:'+name);
    if(proof.sourceSha256&&proof.sourceSha256!==sha256(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA256_MISMATCH:'+name);
    const rebuilt=proof.pbrVersion===2
      ? retouchPbr(original,name,maps,proof) : addPbr(original,name,maps);
    proof.pbrVersion=3;proof.pbrMethod='Project-authored visibly distinct PBR woven fabric, pebbled leather, brushed metal, hair strands, feathers and pearl maps; original geometry preserved';
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
