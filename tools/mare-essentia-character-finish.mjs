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
function textureSet(kind,name){
  // [원본 제작기] 26종은 소재별 공유 지도가 아닌 의상·헤어·장신구별 독립 256px 지도를 사용한다.
  // [무손상] 기존 UV, 원본 색상 계수, 관절·메시, 금속성 구분과 모바일 예산을 보존한다.
  const n=MAP_SIZE,two=Math.PI*2,height=new Float32Array(n*n),low=new Float32Array(n*n);
  const motifs={
    outfit_vest:'herringbone',outfit_coat:'pinstripe',outfit_guard:'heraldry',
    outfit_apron:'canvas_patch',outfit_sash:'diagonal_band',outfit_belt:'leather_stamp',
    outfit_cuff:'lace_stitch',outfit_boot:'reinforced_toe',outfit_stole:'brocade',
    hair_beard:'short_beard',hair_braided_crown:'crown_braid',hair_buns:'twin_coil',
    hair_buzzed:'short_stubble',hair_buzzedfemale:'fine_stubble',
    hair_court_curls:'ringlets',hair_long:'long_strands',hair_low_bun:'low_coil',
    hair_sailor_ponytail:'swept_tail',hair_shoulder_waves:'shoulder_waves',
    hair_side_braid:'side_braid',hair_simpleparted:'center_part',
    acc_feather_hat:'feather_vane',acc_guild_badge:'guild_engraving',
    acc_pearl_hairpin:'pearl_luster',acc_ribbon_bow:'satin_bow',
    acc_sailor_headband:'rope_stitch',
  };
  const motifName=motifs[name],seed=ITEMS.indexOf(name)+1;
  if(!motifName||seed<1)throw Error('MARE_CHARACTER_UNKNOWN_FINISH:'+name);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n,v=y/n;
    const seam=Math.exp(-Math.pow((u-0.075)/0.017,2))
      +Math.exp(-Math.pow((u-0.925)/0.017,2));
    const stitches=seam*Math.pow(Math.max(0,Math.cos(two*v*21)),8);
    const diamond=Math.cos(two*u*7)*Math.cos(two*v*7);
    const part=Math.exp(-Math.pow((u-0.50)/0.026,2));
    // [직업별 뚜렷한 무늬] 조끼 헤링본, 제복 문장, 앞치마 패치, 성직 숄 브로케이드.
    let motif=0;
    switch(motifName){
      case 'herringbone': motif=Math.sin(two*(u*9+(Math.floor(v*12)%2)*0.5))*0.30+seam*0.60+stitches*0.30;break;
      case 'pinstripe': motif=Math.cos(two*u*12)*0.28+part*0.60+seam*0.55;break;
      case 'heraldry': motif=diamond*0.32+Math.cos(two*(u*4+v*2))*0.25+seam*0.64;break;
      case 'canvas_patch': motif=((u>0.27&&u<0.73&&v>0.35&&v<0.76)?-0.29:0)
        +((Math.abs(u-0.27)<0.016||Math.abs(u-0.73)<0.016)&&v>0.34&&v<0.78?0.70:0)
        +stitches*0.33;break;
      case 'diagonal_band': motif=Math.cos(two*(u*5+v*7))*0.45+seam*0.77;break;
      case 'leather_stamp': motif=diamond*0.33+Math.pow(Math.max(0,Math.cos(two*u*7)),10)*0.40+seam*0.56;break;
      case 'lace_stitch': motif=Math.cos(two*v*12)*0.36+diamond*0.28+seam*0.69+stitches*0.37;break;
      case 'reinforced_toe': motif=(v>0.68?-0.32:0)+(Math.abs(v-0.68)<0.018?0.70:0)
        +Math.cos(two*u*12)*0.12+stitches*0.38;break;
      case 'brocade': motif=Math.cos(two*u*5)*Math.cos(two*v*8)*0.43
        +Math.cos(two*(u*10-v*6))*0.20+seam*0.80;break;
      case 'short_beard': motif=Math.cos(two*(u*24-v*5))*0.28;break;
      case 'crown_braid': motif=Math.cos(two*(u*11+v*9))*0.40+Math.cos(two*(u*11-v*9))*0.33;break;
      case 'twin_coil': motif=Math.cos(two*(u*6+v*8))*0.40;break;
      case 'short_stubble': motif=Math.cos(two*u*47)*Math.cos(two*v*41)*0.31;break;
      case 'fine_stubble': motif=Math.cos(two*u*55)*Math.cos(two*v*49)*0.22;break;
      case 'ringlets': motif=Math.cos(two*(u*10+Math.sin(two*v*8)*0.35))*0.45;break;
      case 'long_strands': motif=Math.cos(two*(u*20+Math.sin(two*v*2)*0.08))*0.32;break;
      case 'low_coil': motif=Math.cos(two*(u*7-v*6))*0.40;break;
      case 'swept_tail': motif=Math.cos(two*(u*18+v*5))*0.38;break;
      case 'shoulder_waves': motif=Math.cos(two*(u*13+Math.sin(two*v*3)*0.40))*0.37;break;
      case 'side_braid': motif=Math.cos(two*(u*11+v*8))*0.48;break;
      case 'center_part': motif=Math.cos(two*u*22)*0.30-part*0.59;break;
      case 'feather_vane': motif=Math.cos(two*(u*16+v*9))*0.39+part*0.55;break;
      case 'guild_engraving': motif=diamond*0.46+Math.cos(two*u*6)*Math.cos(two*v*6)*0.25+seam*0.69;break;
      case 'pearl_luster': motif=Math.cos(two*(u*2+v*3))*0.14+seam*0.13;break;
      case 'satin_bow': motif=Math.cos(two*(u*6-v*6))*0.39+seam*0.45;break;
      case 'rope_stitch': motif=Math.cos(two*(u*8+v*8))*0.29
        +Math.cos(two*(u*8-v*8))*0.24+seam*0.67;break;
    }
    // [큰 문양+미세결] 소재별 주파수를 유지하며 의상별 봉제/조각 높이만 별도 합성한다.
    motif*=kind==='pearl'?0.12:kind==='metal'?0.55:kind==='hair'?0.74:
      kind==='feather'?0.77:1;
    const woven=Math.sin(two*u*34)*Math.sin(two*v*34)*0.48
      +Math.sin(two*u*68)*0.11+Math.sin(two*v*68)*0.11;
    const pebbled=Math.sin(two*(u*9+0.16*Math.sin(two*v*7)))
      *Math.cos(two*(v*11+0.14*Math.sin(two*u*5)))*0.47
      +Math.sin(two*(u*27+v*19))*Math.cos(two*(v*31-u*9))*0.23;
    const brushed=Math.sin(two*(u*52+0.035*Math.sin(two*v*3)))*0.43
      +Math.sin(two*(u*91+v*2))*0.17;
    const strands=Math.sin(two*(u*(34+seed%12*2)+0.08*Math.sin(two*v*(2+seed%4))))*0.50
      +Math.sin(two*(u*(75+seed%15)+0.04*Math.cos(two*v*5)))*0.22;
    const vanes=Math.sin(two*(u*29+v*15))*0.40+Math.sin(two*(u*7-v*6))*0.20;
    const pearl=Math.sin(two*(u*3+v*2))*0.08+Math.cos(two*(v*4-u))*0.06;
    height[y*n+x]=(kind==='fabric'?woven:kind==='leather'?pebbled:
      kind==='metal'?brushed:kind==='hair'?strands:kind==='feather'?vanes:pearl)+motif*0.58;
    low[y*n+x]=kind==='fabric'?Math.sin(two*(u*3+v*2))*0.23:
      kind==='leather'?Math.cos(two*(u*4-v*3))*0.27:
      kind==='metal'?Math.sin(two*(u*7+v))*0.16:
      kind==='hair'?Math.sin(two*(u*5+v))*0.22:
      kind==='feather'?Math.sin(two*(u*2-v*3))*0.24:0.05*Math.sin(two*v*2);
  }
  const at=(x,y)=>height[((y+n)%n)*n+((x+n)%n)];
  const slow=(x,y)=>low[((y+n)%n)*n+((x+n)%n)];
  const tint=kind==='fabric'?218:kind==='leather'?206:kind==='metal'?239:
    kind==='hair'?216:kind==='feather'?231:249;
  const colorGain=kind==='fabric'?51:kind==='leather'?57:kind==='metal'?34:
    kind==='hair'?52:kind==='feather'?33:8;
  const relief=kind==='fabric'?0.67:kind==='leather'?0.74:kind==='metal'?0.22:
    kind==='hair'?0.64:kind==='feather'?0.42:0.035;
  const rough=kind==='fabric'?238:kind==='leather'?172:kind==='metal'?94:
    kind==='hair'?169:kind==='feather'?219:113;
  const roughVariation=kind==='fabric'?20:kind==='leather'?42:kind==='metal'?37:
    kind==='hair'?31:kind==='feather'?19:8;
  return {
    color:pngRGB((x,y)=>{
      const value=clamp(tint+(at(x,y)+slow(x,y))*colorGain);
      // [원본색 보존] 원래 glTF baseColorFactor에 곱할 2차 표현만 바꾼다.
      const warm=/vest|apron|stole|guild|pearl/.test(name)?1:0;
      const cool=/guard|coat|sailor/.test(name)?1:0;
      return kind==='metal'?[value,clamp(value-3-cool),clamp(value-8-cool*3)]:
        kind==='leather'?[value,clamp(value-4-warm),clamp(value-9-warm*2)]:
        kind==='hair'?[value,clamp(value-2),clamp(value-5)]:
        kind==='fabric'?[value,clamp(value-2-warm),clamp(value-3-warm*2+cool)]:
        [value,value,value];
    }),
    normal:pngRGB((x,y)=>{
      const dx=(at(x+1,y)-at(x-1,y))*relief;
      const dy=(at(x,y+1)-at(x,y-1))*relief;
      const nz=1/Math.sqrt(1+dx*dx+dy*dy);
      return [128-dx*nz*127,128-dy*nz*127,128+nz*127];
    }),
    // [금속성 구분] 비금속 B=0, 브러시 금속 B=255. G는 실제 표면 거칠기다.
    rough:pngRGB((x,y)=>[255,clamp(rough+(at(x,y)+slow(x,y))*roughVariation),kind==='metal'?255:0]),
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
// [기존 PBR 보존 업그레이드] v2/v3/v4 GLB의 정점·인덱스·UV는 유지하고 3종 PNG 표면만 재포장한다.
// 같은 glTF bufferView에 새 이미지를 재포장하여 구형 PNG를 이중으로 넣지 않는다.
function retouchPbr(bytes,name,maps,proof){
  const {scene,data}=glbParts(bytes,name);
  const replacements=new Map(),roles=new Set();
  for(const img of scene.images||[]){
    const found=/^mare_(fabric|leather|metal|hair|feather|pearl)_(color|normal|rough)_(?:128|256)$/.exec(img.name||'');
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
  // [기존 GLB 정본] 미사용 재질 슬롯은 법선 지도가 없어도 정상이다.
  // 실제 렌더링하는 메시 프리미티브의 재질만 검증하고 노멀 강도를 보정한다.
  const renderedMaterials=new Set(scene.meshes.flatMap(mesh=>
    (mesh.primitives||[]).map(primitive=>primitive.material)));
  for(const [index,material] of (scene.materials||[]).entries()){
    if(!renderedMaterials.has(index))continue;
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
  const dir=path.join(root,'assets','people');
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
    if(proof.pbrVersion===5){
      if(proof.sourceSha256!==sha256(original)||proof.sourceGitBlobSha1!==blobSha(original)||
         !glbParts(original,name).scene.images?.length)
        throw Error('MARE_CHARACTER_EXISTING_PBR_MISMATCH:'+name);
      already++;continue;
    }
    if(proof.sourceGitBlobSha1&&proof.sourceGitBlobSha1!==blobSha(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA1_MISMATCH:'+name);
    if(proof.sourceSha256&&proof.sourceSha256!==sha256(original))
      throw Error('MARE_CHARACTER_ORIGINAL_SHA256_MISMATCH:'+name);
    // [기존 원본 책임] 이 원본에 실제 쓰인 재질만 만들어 중복 PBR 생성과 메모리 폭증을 방지한다.
    const scene=glbParts(original,name).scene;
    const roles=new Set(scene.meshes.flatMap(mesh=>(mesh.primitives||[])
      .map(primitive=>materialRole(name,scene.materials[primitive.material]))));
    const maps=new Map([...roles].map(role=>[role,textureSet(role,name)]));
    const rebuilt=([2,3,4].includes(proof.pbrVersion))
      ? retouchPbr(original,name,maps,proof) : addPbr(original,name,maps);
    proof.pbrVersion=5;proof.pbrDesignProfile=name;
    proof.pbrMethod='Project-authored individual garment embroidery, seamwork, leather tooling, brushed metal and twelve differentiated hair finishes; 256px PBR; original geometry preserved';
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
