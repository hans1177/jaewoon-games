#!/usr/bin/env node
// 파일명: tools/mare-essentia-upload-assets.mjs
// Mare Essentia: CC0 3D 모델과 CC BY 3.0 메뉴 이미지를 기존 Open Cloud 통로로 등록한다.
// 필요: ROBLOX_OPEN_CLOUD_API_KEY (+ ROBLOX_ROBLOSECURITY 선택). 결과는 JSON과 Luau(AssetIds)로 저장한다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const UNIVERSE_ID = process.env.MARE_UNIVERSE_ID || '10775310508';
const ROOT = 'roblox-games/mare-essentia';
const JSON_OUT = ROOT + '/assets-registered.json';
const LUAU_OUT = ROOT + '/src/ReplicatedStorage/Shared/AssetIds.luau';
// [이미지 정책] 경고 원본·파생본은 경로/해시/등록번호가 바뀌어도 다시 사용하지 않는다.
const contentSafety = JSON.parse(await fs.readFile('company-learning/platform-release-roadmap.json', 'utf8'))
  .livingMotionVisualQualityContract.assetAdaptation.contentSafety;
if (contentSafety?.enabled !== true) throw new Error('IMAGE_CONTENT_SAFETY_POLICY_REQUIRED');
const blockedPaths = new Set(contentSafety.blockedAssets.flatMap(row => row.sourcePaths || []));
const blockedHashes = new Set(contentSafety.blockedAssets.flatMap(row => row.sha256 || []));
const blockedIds = new Set(contentSafety.blockedAssets.flatMap(row => row.assetIds || []).map(String));
const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
// [스튜디오 실측 복구] 검증된 실패 ID만 기존 승인 API로 재확인한다. 재업로드는 금지한다.
const studioRegrantArg = process.argv.find(arg => arg.startsWith('--studio-regrant='));
const studioRegrantPath = studioRegrantArg ? studioRegrantArg.slice('--studio-regrant='.length) : '';
if (studioRegrantArg && !studioRegrantPath) throw new Error('STUDIO_REGRANT_REPORT_PATH_REQUIRED');
if (!key) throw new Error('MISSING_ROBLOX_OPEN_CLOUD_API_KEY');
// [무료 실물 원본] 기존 무기 및 항구 어망 CC0 GLB만 출처·형상·해시를 확인해 기존 등록기로 가져온다.
async function prepareLicensedOriginals() {
  const sources = [
    {name:'mace', author:'Grab3D', source:'https://grab3d.com/dl/mace/mace.glb',
      page:'https://grab3d.com/models/weapons/mace/', minBytes:20000, minTriangles:3000},
    {name:'crossbow', author:'Grab3D', source:'https://grab3d.com/dl/crossbow/crossbow.glb',
      page:'https://grab3d.com/models/weapons/crossbow/', minBytes:20000, minTriangles:3000},
    {name:'flintlock-pistol', author:'Pixor',
      source:'https://pixor.art/library/files/pistol-flintlock/pixor-library-pistol-flintlock.glb',
      page:'https://pixor.art/library/weapons/pistol-flintlock/', minBytes:6000, minTriangles:200},
    {name:'flintlock-musket', author:'Pixor',
      source:'https://pixor.art/library/files/musket/pixor-library-musket.glb',
      page:'https://pixor.art/library/weapons/musket/', minBytes:6000, minTriangles:200},
    // [어항 생활 소품] 실제 GLB/Blender 원본을 공개한 Pixor CC0 어망 2종. 현대 장비는 제외.
    {name:'fishing-net', assetPath:'assets/naval/fishing-net.glb', author:'Pixor',
      source:'https://pixor.art/library/files/fishing-net/pixor-library-fishing-net.glb',
      page:'https://pixor.art/library/tools/fishing-net/', minBytes:6000, minTriangles:400},
    {name:'net-floats', assetPath:'assets/naval/net-floats.glb', author:'Pixor',
      source:'https://pixor.art/library/files/net-floats/pixor-library-net-floats.glb',
      page:'https://pixor.art/library/pirate/net-floats/', minBytes:6000, minTriangles:500},
    // [실존 항해선 실물 등록] 2017년 작가 제작 갈레온(무료 CC BY 4.0). 공개 모델을 특정 버전에 고정한다.
    // 무관한 역사 함종이나 35종 전체로 자동 확대·재명명하지 않는다.
    {name:'galleon-heritage', assetPath:'assets/naval/galleon-heritage.glb',
      author:'R-LAB (rakshaan)', license:'CC-BY-4.0',
      source:'https://raw.githubusercontent.com/urcraft/ship-in-a-bottle/main/public/models/galleon.glb',
      page:'https://sketchfab.com/3d-models/nautical-galleon-870b8df2456241269cbc030a101edc50',
      attribution:'Nautical Galleon by R-LAB (@rakshaan), CC BY 4.0; exhibition podium removed.',
      pinnedBlobSha:'25ef612109072f491c06ef88aa34ebc85d983451',
      minBytes:1000000, maxBytes:20000000, minTriangles:50000, maxTriangles:180000,
      removePodium:true},
    // [포르투갈 나우] 유사한 높은 선미성/선수 갑판을 가진 별도 외부 CC0 선체 원본.
    // Kenney 공용 선체에서 배 이름만 바꾸지 않는다. 실제 원본 다운·개조·해시 확인 뒤에만 업로드한다.
    {name:'nau-custom', assetPath:'assets/naval/nau-custom.glb', author:'Grab3D',
      source:'https://grab3d.com/dl/galleon/galleon-light.glb',
      page:'https://grab3d.com/models/vehicles/galleon/',
      minBytes:1000000, maxBytes:2500000, minTriangles:19000, maxTriangles:50000,
      rebuildNau:true},
    // [인도양 전통 선박] CC0 클링커 판재 원본 선체를 보존하고 함종별 판재·범장·삭구를 개조한다.
    // 전시용 복제/단순 함명 변경 금지: 각 함종은 독립 메시·형상·선수/선미를 갖는다.
    ...['jahazi','kotia','mtepe'].map(ship=>({
      name:ship+'-custom', assetPath:'assets/naval/'+ship+'-custom.glb', author:'Grab3D',
      source:'https://grab3d.com/dl/rowboat/rowboat.glb',
      page:'https://grab3d.com/models/vehicles/rowboat/',
      minBytes:500000, maxBytes:3000000, minTriangles:18000, maxTriangles:45000,
      rebuildCoastalShip:ship,
    })),
  ];
  for (const item of sources) {
    const name = item.name, source = item.source, sourcePage = item.page;
    const license = item.license || 'CC0-1.0';
    const target = path.join(ROOT, item.assetPath || ('assets/relics/weapon-' + name + '.glb'));
    const proof = target + '.license.json';
    let bytes, evidence;
    try { bytes = await fs.readFile(target); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    try { evidence = JSON.parse(await fs.readFile(proof, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (evidence && (!bytes || evidence.license !== license || evidence.author !== item.author
      || evidence.source !== source || evidence.sourcePage !== sourcePage
      || (item.pinnedBlobSha && evidence.pinnedBlobSha !== item.pinnedBlobSha)
      || evidence.sourceSha256 !== crypto.createHash('sha256').update(bytes).digest('hex')))
      throw new Error((license === 'CC0-1.0' ? 'MARE_CC0_ORIGINAL_EVIDENCE_MISMATCH:' : 'MARE_LICENSED_ORIGINAL_EVIDENCE_MISMATCH:') + name);
    if (bytes && !evidence) throw new Error('MARE_SHIP_SOURCE_PROVENANCE_MISSING:' + name);
    if (item.rebuildNau && evidence) {
      const original = await fs.readFile(path.join(ROOT,'assets/naval/nau-source.glb'));
      const sourceHash = crypto.createHash('sha256').update(original).digest('hex');
      if (evidence.originalSha256 !== sourceHash || evidence.sourceAsset !== ROOT+'/assets/naval/nau-source.glb'
        || original.length !== 1196260 || evidence.authenticOriginalBinaryVerified !== true
        || evidence.originalMeshesPreserved !== true)
        throw new Error('MARE_NAU_EXTERNAL_CC0_ORIGINAL_CHANGED');
    }
    if (item.rebuildCoastalShip && evidence) {
      const sourcePath=path.join(ROOT,'assets/naval/rowboat-source.glb');
      const original=await fs.readFile(sourcePath);
      const origHash=crypto.createHash('sha256').update(original).digest('hex');
      if(evidence.originalSha256!==origHash || evidence.sourceAsset!==ROOT+'/assets/naval/rowboat-source.glb'
        || evidence.authenticOriginalBinaryVerified!==true
        || evidence.originalMeshesPreserved!==true
        || evidence.structuralGlbVerified!==true
        || original.length!==1160296
        || original.toString('ascii',0,4)!=='glTF')
        throw new Error('MARE_COASTAL_SHIP_EXTERNAL_CC0_SOURCE_CHANGED:'+item.rebuildCoastalShip);
    }
    let originalSha256 = evidence?.originalSha256 || null;
    if (!bytes) {
      const response = await fetch(source, {signal: AbortSignal.timeout(item.removePodium ? 150000 : 60000)});
      if (!response.ok) throw new Error('MARE_LICENSED_SOURCE_HTTP_' + response.status + ':' + name);
      if (Number(response.headers.get('content-length') || 0) > (item.maxBytes || 5000000))
        throw new Error('MARE_LICENSED_SOURCE_TOO_LARGE:' + name);
      bytes = Buffer.from(await response.arrayBuffer());
      if (item.pinnedBlobSha) {
        const blobSha = crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
        if (blobSha !== item.pinnedBlobSha) throw new Error('MARE_LICENSED_SOURCE_BLOB_MISMATCH:' + name);
      }
      originalSha256 = crypto.createHash('sha256').update(bytes).digest('hex');

      if (item.rebuildNau) {
        // [외부 선체 확보] 2026-10-25 Grab3D CC0 galleon-light의 실제 바이너리 크기를 원본 공개 manifest와 대조한다.
        // 선체·선미성 원본의 모든 메시와 바이너리를 보존하고 포르투갈식 미즌 대각돛과 삭구를 직접 추가한다.
        if (bytes.length !== 1196260 || bytes.toString('ascii',0,4)!=='glTF' ||
          bytes.readUInt32LE(4)!==2 || bytes.readUInt32LE(8)!==bytes.length ||
          bytes.readUInt32LE(16)!==0x4e4f534a)
          throw new Error('MARE_NAU_ORIGINAL_SOURCE_NOT_GRAB3D_LIGHT_GLB');
        const sourceBytes=bytes;
        const jlen=sourceBytes.readUInt32LE(12), start=20+jlen;
        if (start+8>sourceBytes.length || sourceBytes.readUInt32LE(start+4)!==0x004e4942 ||
          start+8+sourceBytes.readUInt32LE(start)!==sourceBytes.length)
          throw new Error('MARE_NAU_ORIGINAL_BINARY_CHUNKS_INVALID');
        const model=JSON.parse(sourceBytes.subarray(20,start).toString('utf8'));
        if (!Array.isArray(model.meshes) || model.meshes.length<2 ||
          !Array.isArray(model.scenes) || !Array.isArray(model.nodes) ||
          !Array.isArray(model.buffers) || model.buffers.length!==1 ||
          !Array.isArray(model.bufferViews) || !Array.isArray(model.accessors))
          throw new Error('MARE_NAU_ORIGINAL_GLTF_INCOMPATIBLE');
        const originalMeshCount=model.meshes.length, originalBin=sourceBytes.subarray(start+8);
        const scene=model.scenes[model.scene??0];
        if (!scene || !Array.isArray(scene.nodes)) throw new Error('MARE_NAU_SCENE_MISSING');
        const extBuffers=[];
        let extraLen=0, extraTriangles=0;
        const addBuffer=(data,target)=>{
          const pad=(4-extraLen%4)%4;
          if(pad){extBuffers.push(Buffer.alloc(pad));extraLen+=pad;}
          const index=model.bufferViews.length;
          model.bufferViews.push({buffer:0,byteOffset:originalBin.length+extraLen,byteLength:data.length,target});
          extBuffers.push(data);extraLen+=data.length;
          return index;
        };
        const addMat=(name,color)=>{
          if(!model.materials)model.materials=[];
          return model.materials.push({name,pbrMetallicRoughness:{
            baseColorFactor:[...color,1],metallicFactor:0,roughnessFactor:0.92},
            doubleSided:true})-1;
        };
        const linenMat=addMat('Portuguese nau lateen linen',[0.94,0.86,0.68]);
        const woodMat=addMat('Portuguese nau oak spars',[0.48,0.28,0.12]);
        const ropeMat=addMat('Portuguese nau tarred rigging',[0.15,0.11,0.07]);
        const addGeometry=(label,positions,indices,material)=>{
          const vb=Buffer.alloc(positions.length*4);
          for(let i=0;i<positions.length;i++)vb.writeFloatLE(positions[i],i*4);
          const ib=Buffer.alloc(indices.length*2);
          for(let i=0;i<indices.length;i++)ib.writeUInt16LE(indices[i],i*2);
          const pv=addBuffer(vb,34962), iv=addBuffer(ib,34963);
          const pCount=positions.length/3;
          const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
          for(let i=0;i<positions.length;i+=3)for(let a=0;a<3;a++){
            lo[a]=Math.min(lo[a],positions[i+a]);hi[a]=Math.max(hi[a],positions[i+a]);}
          const pa=model.accessors.push({bufferView:pv,componentType:5126,count:pCount,type:'VEC3',min:lo,max:hi})-1;
          const ia=model.accessors.push({bufferView:iv,componentType:5123,count:indices.length,type:'SCALAR'})-1;
          const mi=model.meshes.push({name:label,primitives:[{attributes:{POSITION:pa},indices:ia,material}]})-1;
          const ni=model.nodes.push({name:label,mesh:mi})-1;
          scene.nodes.push(ni);
          extraTriangles+=indices.length/3;
        };
        // Grab3D 공개 좌표: 선수 -Y, 선미 +Y, 위 +Z. 위쪽 배치는 원본이 아닌 도형 선체 대체가 아니다.
        const cloth=[],faces=[],grid=[],N=24;
        const A=[0.0,3.5,20],B=[0.0,13,14.5],C=[0.0,9,5.5];
        for(let i=0;i<=N;i++){
          grid[i]=[];
          for(let j=0;j<=N-i;j++){
            const u=i/N,v=j/N,w=1-u-v;
            grid[i][j]=cloth.length/3;
            cloth.push(A[0]*w+B[0]*u+C[0]*v+1.15*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),
              A[1]*w+B[1]*u+C[1]*v,A[2]*w+B[2]*u+C[2]*v);
          }
        }
        for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){
          faces.push(grid[i][j],grid[i+1][j],grid[i][j+1]);
          if(j<N-i-1)faces.push(grid[i+1][j],grid[i+1][j+1],grid[i][j+1]);
        }
        addGeometry('nau mizzen lateen cloth',cloth,faces,linenMat);
        const cylinder=(a,b,r,segments=10)=>{
          const p=[],ind=[],axis=b.map((v,i)=>v-a[i]);
          const al=Math.hypot(...axis),d=axis.map(v=>v/al);
          if(!Number.isFinite(al)||al<0.1)throw Error('MARE_NAU_RIGGING_AXIS_INVALID');
          const ref=Math.abs(d[2])<0.9?[0,0,1]:[1,0,0];
          const ux=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]];
          const ul=Math.hypot(...ux),u=ux.map(x=>x/ul);
          const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
          for(const pt of [a,b])for(let k=0;k<segments;k++){
            const ang=2*Math.PI*k/segments;
            for(let c=0;c<3;c++)p.push(pt[c]+r*(u[c]*Math.cos(ang)+v[c]*Math.sin(ang)));
          }
          for(let k=0;k<segments;k++){
            const t=(k+1)%segments;
            ind.push(k,t,segments+k,t,segments+t,segments+k);
          }
          return {p,ind};
        };
        const addRods=(name,rods,material)=>{
          const p=[],ids=[];
          for(const [a,b,r] of rods){const m=cylinder(a,b,r);const off=p.length/3;
            p.push(...m.p);ids.push(...m.ind.map(i=>i+off));}
          addGeometry(name,p,ids,material);
        };
        addRods('nau mizzen oak mast and lateen yard',[
          [[0,9,2],[0,9,21],0.19],
          [A,B,0.13],
          [[-3.8,12.1,3.3],[3.8,12.1,3.3],0.12],
        ],woodMat);
        addRods('nau mizzen ropes and rigging',[
          [[0,9,21],[-4.0,12.7,3.1],0.045],
          [[0,9,21],[4.0,12.7,3.1],0.045],
          [A,C,0.045],[B,C,0.045],
          [[0,9,20],[-4.0,4.7,3.1],0.035],
          [[0,9,20],[4.0,4.7,3.1],0.035],
        ],ropeMat);
        const extendedBin=Buffer.concat([originalBin,...extBuffers,Buffer.alloc((4-extraLen%4)%4)]);
        model.buffers[0].byteLength=originalBin.length+extraLen;
        const jsonBody=Buffer.from(JSON.stringify(model),'utf8'),padding=(4-jsonBody.length%4)%4;
        const newJson=Buffer.concat([jsonBody,Buffer.alloc(padding,0x20)]);
        const rebuilt=Buffer.alloc(12+8+newJson.length+8+extendedBin.length);
        rebuilt.write('glTF',0);rebuilt.writeUInt32LE(2,4);rebuilt.writeUInt32LE(rebuilt.length,8);
        rebuilt.writeUInt32LE(newJson.length,12);rebuilt.writeUInt32LE(0x4e4f534a,16);
        newJson.copy(rebuilt,20);
        const binAt=20+newJson.length;
        rebuilt.writeUInt32LE(extendedBin.length,binAt);rebuilt.writeUInt32LE(0x004e4942,binAt+4);
        extendedBin.copy(rebuilt,binAt+8);
        if(extraTriangles<550 || !extendedBin.subarray(0,originalBin.length).equals(originalBin)
          || model.meshes.length!==originalMeshCount+3 || rebuilt.readUInt32LE(8)!==rebuilt.length)
          throw new Error('MARE_NAU_SOURCE_HULL_OR_REBUILT_GEOMETRY_INVALID');
        bytes=rebuilt;
        await fs.writeFile(path.join(ROOT,'assets/naval/nau-source.glb'),sourceBytes);
        item.originalModel='Grab3D CC0 galleon-light source with preserved historical hull';
        item.modification='Portuguese nau: external CC0 galleon hull, original stern castle and binary preserved; added 576-triangle mizzen lateen sail, raked yard, oak mast, dark ropes and rigging';
        item.sourceAsset=ROOT+'/assets/naval/nau-source.glb';
        item.originalMeshCount=originalMeshCount;
        item.derivedTriangleCount=extraTriangles;
        console.log('MARE_NAU_EXTERNAL_CC0_HULL_DERIVED',originalSha256,extraTriangles);
      }

      if (item.rebuildCoastalShip) {
        // [원본 선체 실물] 정식 공개 CC0 원본 GLB를 별도 저장하고 변경 전 메시/바이너리를 보존한다.
        const ship=item.rebuildCoastalShip, sourceBytes=bytes;
        const file=path.join(ROOT,'assets/naval/rowboat-source.glb');
        // [CC0 원본 잠금] Grab3D 공개 manifest의 정확한 GLB 바이트 수를 검증한다.
        if (sourceBytes.length!==1160296
          || sourceBytes.toString('ascii',0,4)!=='glTF'
          || sourceBytes.readUInt32LE(4)!==2 || sourceBytes.readUInt32LE(8)!==sourceBytes.length
          || sourceBytes.readUInt32LE(16)!==0x4e4f534a)
          throw new Error('MARE_COASTAL_ROWBOAT_SOURCE_INVALID:'+ship);
        const size=sourceBytes.readUInt32LE(12), binOffset=20+size;
        if(sourceBytes.readUInt32LE(binOffset+4)!==0x004e4942
          || binOffset+8+sourceBytes.readUInt32LE(binOffset)!==sourceBytes.length)
          throw new Error('MARE_COASTAL_ROWBOAT_BINARY_INVALID:'+ship);
        const model=JSON.parse(sourceBytes.subarray(20,binOffset).toString('utf8'));
        if(!Array.isArray(model.meshes)||model.meshes.length<2
          || !Array.isArray(model.nodes)||!Array.isArray(model.scenes)
          || !Array.isArray(model.buffers)||model.buffers.length!==1
          || !Array.isArray(model.bufferViews)||!Array.isArray(model.accessors))
          throw new Error('MARE_COASTAL_ROWBOAT_MESH_UNSUPPORTED:'+ship);
        const originalMeshCount=model.meshes.length, originalBin=sourceBytes.subarray(binOffset+8);
        const scene=model.scenes[model.scene??0];
        if(!scene||!Array.isArray(scene.nodes))throw new Error('MARE_COASTAL_ROWBOAT_SCENE_INVALID:'+ship);
        let savedSource;
        try{savedSource=await fs.readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
        if(savedSource&&!savedSource.equals(sourceBytes))
          throw new Error('MARE_COASTAL_ROWBOAT_SOURCE_DRIFT:'+ship);

        // [기존 유효 선체 재사용] 기존 메시 자체는 수정하지 않고 원본 장면을 커진 상선 선체로 변환한다.
        // 돛·갑판·선미·외판·삭구는 각 함종마다 새 메시로 직접 모델링한다.
        const hullRoot=model.nodes.push({name:ship+' original CC0 clinker hull enlarged',
          scale:[1.16,1.78,1.26],children:scene.nodes.slice()})-1;
        scene.nodes=[hullRoot];
        const extensions=[];
        let addedLength=0, extraTriangles=0;
        const addBuffer=(buf,target)=>{
          const pad=(4-addedLength%4)%4;
          if(pad){extensions.push(Buffer.alloc(pad));addedLength+=pad;}
          const index=model.bufferViews.length;
          model.bufferViews.push({buffer:0,byteOffset:originalBin.length+addedLength,byteLength:buf.length,target});
          extensions.push(buf);addedLength+=buf.length;
          return index;
        };
        const mat=(label,rgba)=>{
          if(!model.materials)model.materials=[];
          return model.materials.push({name:ship+' '+label,pbrMetallicRoughness:{
            baseColorFactor:[...rgba,1],metallicFactor:0,roughnessFactor:0.96},doubleSided:true})-1;
        };
        const wood=mat('teak joined plank',[0.49,0.31,0.14]);
        const edge=mat('gunwale oak',[0.33,0.19,0.08]);
        const linen=mat('woven linen',[0.92,0.83,0.63]);
        const rope=mat('coir cord',[0.20,0.14,0.08]);
        const bright=mat('carved trim',[0.64,0.49,0.22]);
        const addMesh=(label,p,idx,material)=>{
          if(p.length<9||idx.length<3||idx.length%3||p.length/3>65535)
            throw Error('MARE_COASTAL_GEOMETRY_INVALID:'+ship+':'+label);
          const vb=Buffer.alloc(p.length*4),ib=Buffer.alloc(idx.length*2);
          const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
          for(let i=0;i<p.length;i++){if(!Number.isFinite(p[i]))throw Error('MARE_COASTAL_NAN');
            vb.writeFloatLE(p[i],i*4);
            const ax=i%3;low[ax]=Math.min(low[ax],p[i]);high[ax]=Math.max(high[ax],p[i]);}
          for(let i=0;i<idx.length;i++){if(idx[i]>=p.length/3)throw Error('MARE_COASTAL_INDEX');
            ib.writeUInt16LE(idx[i],i*2);}
          const pa=model.accessors.push({bufferView:addBuffer(vb,34962),componentType:5126,
            count:p.length/3,type:'VEC3',min:low,max:high})-1;
          const ia=model.accessors.push({bufferView:addBuffer(ib,34963),componentType:5123,
            count:idx.length,type:'SCALAR'})-1;
          const mi=model.meshes.push({name:ship+' '+label,primitives:[
            {attributes:{POSITION:pa},indices:ia,material}]})-1;
          scene.nodes.push(model.nodes.push({name:ship+' '+label,mesh:mi})-1);
          extraTriangles+=idx.length/3;
        };
        const rod=(a,b,r,seg=9)=>{
          const dir=b.map((v,i)=>v-a[i]),ll=Math.hypot(...dir);
          if(ll<0.02||!Number.isFinite(ll))throw Error('MARE_COASTAL_ROD_AXIS');
          const d=dir.map(v=>v/ll),ref=Math.abs(d[2])<0.8?[0,0,1]:[1,0,0];
          const v0=[d[1]*ref[2]-d[2]*ref[1],d[2]*ref[0]-d[0]*ref[2],d[0]*ref[1]-d[1]*ref[0]];
          const vl=Math.hypot(...v0),u=v0.map(v=>v/vl);
          const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
          const p=[],idx=[];
          for(const point of [a,b])for(let k=0;k<seg;k++){
            const theta=2*Math.PI*k/seg;
            for(let ax=0;ax<3;ax++)p.push(point[ax]+r*(u[ax]*Math.cos(theta)+v[ax]*Math.sin(theta)));
          }
          for(let k=0;k<seg;k++){
            const next=(k+1)%seg;idx.push(k,next,k+seg,next,next+seg,k+seg);
          }
          return {p,idx};
        };
        const addRods=(label,sticks,material)=>{
          const p=[],idx=[];
          for(const [a,b,r] of sticks){
            const g=rod(a,b,r),off=p.length/3;
            p.push(...g.p);idx.push(...g.idx.map(i=>i+off));
          }
          addMesh(label,p,idx,material);
        };
        // [형상 교체] 원본 열린 목조 선체와 연결되는 구부러진 외판/판재 측면.
        // 양끝 곡률과 선미 상향, 폭 및 갑판 높이는 함종마다 다르다.
        const beam=ship==='mtepe'?1.04:ship==='kotia'?1.38:1.22;
        const rise=ship==='mtepe'?1.04:ship==='kotia'?0.43:0.68;
        const shell=[],faces=[],segments=26,bands=6;
        const side=(sign,t,v)=>{
          const y=-3.9+7.45*t,arc=Math.pow(Math.sin(Math.PI*t),0.58);
          const x=sign*(0.16+beam*arc*(0.46+0.54*v));
          const z=-0.56+v*1.48+rise*Math.pow(Math.abs(2*t-1),3);
          return [x,y,z];
        };
        for(const sign of [-1,1]){
          const base=shell.length/3;
          for(let i=0;i<=segments;i++)for(let j=0;j<=bands;j++)
            shell.push(...side(sign,i/segments,j/bands));
          for(let i=0;i<segments;i++)for(let j=0;j<bands;j++){
            const a=base+i*(bands+1)+j,b=a+bands+1;
            faces.push(a,b,a+1,b,b+1,a+1);
          }
        }
        addMesh('joined curved outer hull planks',shell,faces,wood);
        const decking=[],grips=[],lines=[],stitches=[];
        for(const sign of [-1,1]){
          let previous;
          for(let i=0;i<=28;i++){
            const t=i/28;const now=side(sign,t,1);
            if(previous)decking.push([previous,now,0.085]);
            previous=now;
          }
          // [외판 이음] 목재 판재의 가로 리브, 튼튼한 이중 뱃전.
          for(let i=3;i<=25;i+=2){
            const t=i/28;
            decking.push([side(sign,t,0.22),side(sign,t,1.06),0.052]);
          }
          for(let band=1;band<bands;band++){
            let prev;
            for(let i=0;i<=28;i++){
              const t=i/28,next=side(sign,t,band/bands);
              if(prev)lines.push([prev,next,0.018]);
              prev=next;
            }
          }
          if(ship==='mtepe'){
            // [스와힐리 봉합선] 못이 아닌 코코넛 끈으로 판재를 잇는 대각 반복 봉합.
            for(let i=2;i<=26;i++)for(let j=1;j<bands;j++){
              const t=i/28,z=j/bands,dx=0.022;
              stitches.push([side(sign,Math.max(0,t-dx),z-0.06),
                side(sign,Math.min(1,t+dx),z+0.06),0.018]);
            }
          }
        }
        addRods('timber gunwale and ribs',decking,edge);
        addRods('visible hull plank joints',lines,bright);
        if(stitches.length)addRods('stitched Swahili sewn plank seams',stitches,rope);

        // [돛 천] 2면 소재, 곡면 부풀음, 각 함종의 독립 범장.
        const sailEdge=[],masts=[],ropes=[],decoration=[];
        const addLateen=(label,a,b,c,n)=>{
          const p=[],idx=[],rows=[];
          for(let i=0;i<=n;i++){
            rows[i]=[];
            for(let j=0;j<=n-i;j++){
              const u=i/n,v=j/n,w=1-u-v;
              rows[i][j]=p.length/3;
              p.push(a[0]*w+b[0]*u+c[0]*v+0.46*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),
                a[1]*w+b[1]*u+c[1]*v,a[2]*w+b[2]*u+c[2]*v);
            }
          }
          for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
            idx.push(rows[i][j],rows[i+1][j],rows[i][j+1]);
            if(j<n-i-1)idx.push(rows[i+1][j],rows[i+1][j+1],rows[i][j+1]);
          }
          addMesh(label,p,idx,linen);
          sailEdge.push([a,b,0.045],[a,c,0.025],[b,c,0.036]);
          return [a,b,c];
        };
        if(ship==='jahazi'){
          masts.push([[0,-1.25,0.60],[0,-1.25,8.75],0.14],
            [[0,1.75,0.58],[0,1.75,5.60],0.105]);
          const A=[0,-3.65,7.75],B=[0,2.55,8.28],C=[0,1.16,1.30];
          addLateen('foremast billowed Indian Ocean lateen cloth',A,B,C,27);
          const a=[0,0.30,5.25],b=[0,3.26,4.45],c=[0,2.26,1.25];
          addLateen('mizzen trade sail cloth',a,b,c,20);
          masts.push([A,B,0.078],[a,b,0.062]);
          decoration.push([[0,-3.92,0.75],[0,-4.45,1.44],0.09],
            [[0,3.45,0.83],[0,3.88,1.37],0.11]);
        }else if(ship==='kotia'){
          masts.push([[0,0.18,0.62],[0,0.18,9.15],0.17]);
          const A=[0,-3.55,8.30],B=[0,3.15,8.72],C=[0,1.65,1.13];
          addLateen('Malabar pepper dhow giant lateen cloth',A,B,C,29);
          masts.push([A,B,0.11]);
          const a=[0,-3.98,4.0],b=[0,-1.25,5.65],c=[0,-2.28,1.15];
          addLateen('Malabar small forward staysail cloth',a,b,c,19);
          decoration.push([[0,3.60,0.89],[0,4.25,1.67],0.13],
            [[0,-3.84,0.94],[0,-4.14,1.17],0.09]);
        }else{
          // [므테페] 낚싯배/유럽식 다우가 아니라 상단이 넓고 양 끝이 올라가는
          // 스와힐리 방형 직조 돛과 봉합 외판, 매듭을 재현한다.
          masts.push([[0,-0.18,0.55],[0,-0.18,8.60],0.14]);
          const a=[0,-2.70,1.52],b=[0,-2.15,7.95],c=[0,2.10,8.25],d=[0,2.63,1.56];
          const p=[],idx=[],cols=26,rows=23,at=(u,v)=>{
            const w0=(1-u)*(1-v),w1=(1-u)*v,w2=u*v,w3=u*(1-v);
            return [a[0]*w0+b[0]*w1+c[0]*w2+d[0]*w3
              +0.36*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),
              a[1]*w0+b[1]*w1+c[1]*w2+d[1]*w3,
              a[2]*w0+b[2]*w1+c[2]*w2+d[2]*w3];
          };
          for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++)
            p.push(...at(i/cols,j/rows));
          for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
            const k=i*(rows+1)+j,h=k+rows+1;
            idx.push(k,h,k+1,h,h+1,k+1);
          }
          addMesh('woven rectangular Swahili mtepe mat sail',p,idx,linen);
          sailEdge.push([a,b,0.048],[b,c,0.067],[c,d,0.048],[d,a,0.046]);
          masts.push([b,c,0.095]);
          for(let i=1;i<rows;i++)decoration.push([at(0,i/rows),at(1,i/rows),0.018]);
          for(let i=1;i<cols;i+=2)decoration.push([at(i/cols,0),at(i/cols,1),0.013]);
          decoration.push([[0,-3.68,0.75],[0,-4.22,2.05],0.12],
            [[0,3.42,0.70],[0,4.10,2.10],0.13]);
        }
        const mastTops=ship==='jahazi'?[[0,-1.25,8.75],[0,1.75,5.60]]:ship==='kotia'?
          [[0,0.18,9.15]]:[[0,-0.18,8.60]];
        for(const top of mastTops){
          for(const sign of [-1,1]){
            ropes.push([top,[sign*beam*0.87,-2.44,0.88],0.022],
              [top,[sign*beam*0.87,2.55,0.88],0.022]);
          }
        }
        addRods('teak masts sloped yards',masts,edge);
        addRods('billowed sail hems and standing rigging',sailEdge.concat(ropes),rope);
        if(decoration.length)addRods('woven details and high prow carvings',decoration,bright);
        // [갑판 복원] 각 함종 화물/선미 구조를 독립된 목조 모양으로 조립.
        const deckP=[],deckI=[];
        const addCrate=(cx,cy,cz,w,l,h)=>{
          const at=deckP.length/3;
          const arr=[[cx-w/2,cy-l/2,cz],[cx+w/2,cy-l/2,cz],
            [cx+w/2,cy+l/2,cz],[cx-w/2,cy+l/2,cz],
            [cx-w/2,cy-l/2,cz+h],[cx+w/2,cy-l/2,cz+h],
            [cx+w/2,cy+l/2,cz+h],[cx-w/2,cy+l/2,cz+h]];
          for(const v of arr)deckP.push(...v);
          for(const [a,b,c,d] of [[0,1,2,3],[4,7,6,5],[0,4,5,1],
            [1,5,6,2],[2,6,7,3],[3,7,4,0]])
            deckI.push(at+a,at+b,at+c,at+a,at+c,at+d);
        };
        const cargoCount=ship==='kotia'?9:ship==='jahazi'?6:4;
        for(let i=0;i<cargoCount;i++){
          const row=Math.floor(i/3),col=i%3;
          addCrate((col-1)*0.48,-0.54+row*0.75,0.81,0.40,0.49,
            ship==='kotia'?0.70:0.47);
        }
        addMesh('handworked open cargo deck and timber boxes',deckP,deckI,wood);
        // [glTF 좌표 정렬] 원본의 Z 위/-Y 선수 좌표계를 프로젝트 +Y 위/+X 선수로 일괄 변환.
        const assembled=model.nodes.push({name:ship+' oriented +X bow +Y up',
          matrix:[0,0,-1,0,-1,0,0,0,0,1,0,0,0,0,0,1],
          children:scene.nodes.slice()})-1;
        scene.nodes=[assembled];
        const tail=Buffer.concat([originalBin,...extensions,Buffer.alloc((4-addedLength%4)%4)]);
        model.buffers[0].byteLength=originalBin.length+addedLength;
        const encoded=Buffer.from(JSON.stringify(model),'utf8');
        const jsonPadded=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,0x20)]);
        const rebuilt=Buffer.alloc(12+8+jsonPadded.length+8+tail.length);
        rebuilt.write('glTF',0);rebuilt.writeUInt32LE(2,4);rebuilt.writeUInt32LE(rebuilt.length,8);
        rebuilt.writeUInt32LE(jsonPadded.length,12);rebuilt.writeUInt32LE(0x4e4f534a,16);
        jsonPadded.copy(rebuilt,20);
        const at=20+jsonPadded.length;
        rebuilt.writeUInt32LE(tail.length,at);rebuilt.writeUInt32LE(0x004e4942,at+4);
        tail.copy(rebuilt,at+8);
        if(extraTriangles<1400 || rebuilt.readUInt32LE(8)!==rebuilt.length
          || !tail.subarray(0,originalBin.length).equals(originalBin)
          || model.meshes.length<=originalMeshCount+6)
          throw new Error('MARE_COASTAL_HULL_DERIVATION_INVALID:'+ship);
        bytes=rebuilt;
        await fs.writeFile(file,sourceBytes);
        item.sourceAsset=ROOT+'/assets/naval/rowboat-source.glb';
        item.originalModel='Grab3D CC0 high-detail clinker-built timber rowboat hull';
        item.modification=ship==='mtepe'?
          'Swahili sewn-plank mtepe: raised bow/stern, curved planks, coir stitches, woven square mat sail, bamboo spars, cargo':
          ship==='jahazi'?
          'Swahili jahazi trader: curved cargo hull, dual raked lateen masts, sewn plank ribs, coir ropes, cargo deck':
          'Malabar kotia spice trader: wide deep plank hull, tall main lateen and small staysail, high aft rudder, pepper cargo';
        item.originalMeshCount=originalMeshCount;
        item.derivedTriangleCount=extraTriangles;
        console.log('MARE_COASTAL_EXTERNAL_CC0_HULL_DERIVED',ship,originalSha256,extraTriangles);
      }

      if (item.removePodium) {
        // [원본 모델 디테일] 작가의 선체·돛·삭구 메시와 재질은 그대로 보존한다.
        // 전시용 원형 받침대를 glTF 장면 노드에서만 제거한다. 도형/절차형 새 모델은 만들지 않는다.
        if (bytes.toString('ascii',0,4) !== 'glTF' || bytes.readUInt32LE(4) !== 2)
          throw new Error('MARE_LICENSED_SHIP_NOT_GLB');
        const jsonSize = bytes.readUInt32LE(12);
        const binAt = 20 + jsonSize;
        if (bytes.readUInt32LE(16) !== 0x4e4f534a || binAt + 8 > bytes.length
          || bytes.readUInt32LE(binAt + 4) !== 0x004e4942)
          throw new Error('MARE_LICENSED_SHIP_GLB_CHUNKS_INVALID');
        const binSize = bytes.readUInt32LE(binAt);
        if (binAt + 8 + binSize !== bytes.length)
          throw new Error('MARE_LICENSED_SHIP_GLB_LENGTH_INVALID');
        const gltf = JSON.parse(bytes.subarray(20, binAt).toString('utf8'));
        const podiumIds = new Set((gltf.nodes || []).flatMap((node, i) =>
          /podium/i.test(node.name || '') ? [i] : []));
        if (podiumIds.size < 1 || podiumIds.size > 12)
          throw new Error('MARE_LICENSED_SHIP_PODIUM_MISSING_OR_AMBIGUOUS:' + podiumIds.size);
        for (const node of gltf.nodes || []) {
          if (node.children) node.children = node.children.filter(index => !podiumIds.has(index));
        }
        for (const scene of gltf.scenes || []) {
          if (scene.nodes) scene.nodes = scene.nodes.filter(index => !podiumIds.has(index));
        }
        const jsonBody = Buffer.from(JSON.stringify(gltf),'utf8');
        const jsonPadding = (4 - jsonBody.length % 4) % 4;
        const paddedJson = Buffer.concat([jsonBody, Buffer.alloc(jsonPadding, 0x20)]);
        const modified = Buffer.alloc(12 + 8 + paddedJson.length + 8 + binSize);
        modified.write('glTF',0); modified.writeUInt32LE(2,4);
        modified.writeUInt32LE(modified.length,8);
        modified.writeUInt32LE(paddedJson.length,12);
        modified.writeUInt32LE(0x4e4f534a,16);
        paddedJson.copy(modified,20);
        modified.writeUInt32LE(binSize,20+paddedJson.length);
        modified.writeUInt32LE(0x004e4942,24+paddedJson.length);
        bytes.copy(modified,28+paddedJson.length,binAt+8,binAt+8+binSize);
        bytes=modified;
        console.log('MARE_LICENSED_SHIP_EXHIBITION_PODIUM_REMOVED', name, podiumIds.size);
      }
    }
    if (bytes.length < item.minBytes || bytes.length > (item.maxBytes || 5000000)
      || bytes.toString('ascii', 0, 4) !== 'glTF'
      || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length
      || bytes.readUInt32LE(16) !== 0x4e4f534a)
      throw new Error('MARE_LICENSED_GLB_INVALID:' + name);
    const jsonBytes = bytes.readUInt32LE(12);
    if (jsonBytes < 100 || 20 + jsonBytes > bytes.length) throw new Error('MARE_LICENSED_GLB_JSON_INVALID:' + name);
    const model = JSON.parse(bytes.subarray(20, 20 + jsonBytes).toString('utf8'));
    const tris = (model.meshes || []).flatMap(row => row.primitives || []).reduce((sum, p) => {
      if (p.mode != null && p.mode !== 4) throw new Error('MARE_LICENSED_NON_TRIANGLE_MESH:' + name);
      const a = model.accessors?.[p.indices ?? p.attributes?.POSITION];
      if (!a || !Number.isInteger(a.count)) throw new Error('MARE_LICENSED_INVALID_ACCESSOR:' + name);
      return sum + Math.floor(a.count / 3);
    }, 0);
    if (tris < item.minTriangles || tris > (item.maxTriangles || 30000))
      throw new Error((license === 'CC0-1.0' ? 'MARE_CC0_WRONG_MODEL_GEOMETRY:' : 'MARE_LICENSED_WRONG_MODEL_GEOMETRY:') + name + ':' + tris);
    if (!evidence) {
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      await fs.writeFile(target, bytes);
      await fs.writeFile(proof, JSON.stringify({license, author:item.author, source,
        sourcePage, sourceSha256:hash, originalSha256, pinnedBlobSha:item.pinnedBlobSha || null,
        attribution:item.attribution || null,
        sourceAsset:item.sourceAsset||null, originalMeshCount:item.originalMeshCount||null,
        derivedTriangleCount:item.derivedTriangleCount||null,
        authenticOriginalBinaryVerified:(item.rebuildNau||item.rebuildCoastalShip)?true:undefined,
        originalMeshesPreserved:(item.rebuildNau||item.rebuildCoastalShip)?true:undefined,
        structuralGlbVerified:(item.rebuildNau||item.rebuildCoastalShip)?true:undefined,
        modelGeometryGroups:item.rebuildNau?['wood','linen','rope']:
          item.rebuildCoastalShip?['wood','edge','linen','rope','carved']:undefined,
        modification:item.modification || (item.removePodium ? 'Exhibition podium scene nodes removed; artist ship geometry unchanged.' : 'Unmodified source'),
        triangles:tris, originalModel:item.originalModel || name,
        actualRobloxRuntimeVerified:false, visualQualityApproved:false,robloxPublishedVerified:false}, null, 2) + '\n');
      console.log('MARE_LICENSED_MODEL_PREPARED', name, hash, tris);
    } else console.log('MARE_LICENSED_MODEL_SOURCE_VERIFIED', name, tris);
  }
}
if (!studioRegrantPath) await prepareLicensedOriginals();


const rawCookie = String(process.env.ROBLOX_ROBLOSECURITY || process.env.ROBLOX_SECURITY_COOKIE || '').trim();
const cookie = rawCookie.includes('.ROBLOSECURITY=') ? rawCookie : (rawCookie ? '.ROBLOSECURITY=' + rawCookie + ';' : '');
let csrf = '';
// 요청 제한은 실패로 확정하기 전에 기존 엔드포인트에서 지수 백오프로 재시도한다.
async function request(url, options = {}) {
  const authenticated = Boolean(cookie) && url.startsWith('https://apis.roblox.com/');
  if (authenticated && url.startsWith('https://apis.roblox.com/assets/v1/')) url = url.replace('/assets/v1/', '/assets/user-auth/v1/');
  for (let attempt = 0; attempt < 4; attempt++) {
    const headers = {...(options.headers ?? {})};
    if (authenticated) { headers.cookie = cookie; if (csrf) headers['x-csrf-token'] = csrf; }
    else headers['x-api-key'] = key;
    let result = await fetch(url, {...options, headers, signal: AbortSignal.timeout(90000)});
    if (authenticated && result.status === 403 && result.headers.get('x-csrf-token')) {
      csrf = result.headers.get('x-csrf-token');
      result = await fetch(url, {...options, headers: {...headers, 'x-csrf-token': csrf}, signal: AbortSignal.timeout(90000)});
    }
    if (result.status === 429 && attempt < 3) {
      const retryAfter = Number(result.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(60000, retryAfter * 1000) : 6000 * 2 ** attempt;
      console.log('ROBLOX_RATE_LIMIT_BACKOFF', attempt + 1, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    const data = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error('ROBLOX_ASSET_API_' + result.status + ': ' + JSON.stringify(data).slice(0, 300));
    return data;
  }
  throw new Error('ROBLOX_RATE_LIMIT_EXHAUSTED');
}

let creatorId = process.env.ROBLOX_CREATOR_USER_ID;
if (!creatorId && cookie) {
  try {
    const r = await fetch('https://develop.roblox.com/v1/universes/' + UNIVERSE_ID, {headers: {cookie}, signal: AbortSignal.timeout(15000)});
    const o = await r.json().catch(() => ({}));
    if (r.ok && o.creatorType === 'User' && /^[1-9][0-9]*$/.test(String(o.creatorTargetId))) creatorId = String(o.creatorTargetId);
  } catch {}
}
if (!creatorId) {
  const permission = await introspectRobloxApiKey({apiKey: key});
  const creators = new Set();
  for (const scope of permission.scopes) {
    if (!/asset/i.test(scope.name || '')) continue;
    if (!scope.operations.some(op => /write|create/i.test(op))) continue;
    for (const id of scope.userIds) if (/^[1-9][0-9]*$/.test(id)) creators.add(id);
  }
  if (creators.size !== 1) throw new Error('ASSET_CREATOR_AMBIGUOUS: provide ROBLOX_CREATOR_USER_ID');
  creatorId = [...creators][0];
}

// kind(MareAssets 하위 폴더) / 모델 이름 / 원본 파일. OBJ는 Open Cloud가 받지 않아 제외한다.
const plan = [];
// [모델 원화 제작 분리·자동 인입] 생성 모델의 단일 완성 PNG만 바이브의 실제 시각 검수 뒤 기존 승인 통로로 승격한다.
// SVG·파츠·시트·미리보기로 등록하지 않으며 검수 증빙/원본 해시가 다르면 업로드 전에 중단한다.
const cardApprovalDocument = JSON.parse(await fs.readFile(ROOT + '/assets/APPROVED_IMAGES.json', 'utf8'));
const modelOriginals = cardApprovalDocument.modelOriginals || {};
if (typeof modelOriginals !== 'object' || Array.isArray(modelOriginals)) throw new Error('MODEL_ORIGINAL_REVIEW_MAP_INVALID');
if (!studioRegrantPath) for (const [id, review] of Object.entries(modelOriginals)) {
  const match = /^CardArt\/((?:eu|ea|me|nw|af)_(?:0[1-9]|[12][0-9]|30))$/.exec(id);
  if (!match) throw new Error('MODEL_ORIGINAL_CARD_ID_INVALID:' + id);
  const name = match[1];
  const relativeSource = 'assets/cardart/src/' + name + '-original.png';
  const sourcePath = path.join(ROOT, relativeSource);
  const targetPath = path.join(ROOT, 'assets/cardart', name + '.png');
  const reviewChecks = ['subjectMatch','historicalContext','houseStyle','singleFinishedScene',
    'noPartsOrSprites','robloxSafety','commercialRights'];
  if (review?.sourceType !== 'IMAGE_GENERATION_MODEL' || review.sourceFile !== relativeSource
    || review.reviewer !== 'VIBE_AGENT_VISUAL_REVIEW' || review.license !== 'PROJECT_ORIGINAL_ART'
    || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt || '')
    || !reviewChecks.every(key => review[key] === true))
    throw new Error('MODEL_ORIGINAL_QA_REQUIRED:' + id);
  const bytes = await fs.readFile(sourcePath);
  if (bytes.length < 50000 || bytes.length > 20 * 1024 * 1024
    || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    || bytes.toString('ascii', 12, 16) !== 'IHDR'
    || bytes.readUInt32BE(16) < 768 || bytes.readUInt32BE(20) < 768
    || bytes.readUInt32BE(16) > 4096 || bytes.readUInt32BE(20) > 4096)
    throw new Error('MODEL_ORIGINAL_FULL_RESOLUTION_PNG_REQUIRED:' + id);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (review.sourceSha256 !== hash || cardApprovalDocument.approved?.[id] !== hash
    || blockedHashes.has(hash) || blockedPaths.has(sourcePath) || blockedPaths.has(targetPath))
    throw new Error('MODEL_ORIGINAL_APPROVAL_OR_SAFETY_MISMATCH:' + id);
  let current = null;
  try { current = await fs.readFile(targetPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (current && crypto.createHash('sha256').update(current).digest('hex') !== hash)
    throw new Error('MODEL_ORIGINAL_EXISTING_CARD_PRESERVED:' + id);
  if (!current) {
    await fs.copyFile(sourcePath, targetPath);
    console.log('MODEL_ORIGINAL_PROMOTED', id, hash);
  } else console.log('MODEL_ORIGINAL_VERIFIED', id);
}

// 2026-11-11 오너 승인으로 바이브가 직접 그린 평면 벡터 교역품(소스: assets/goods/src/)
const VIBE_DRAWN_GOODS = ['feathers','cloves','nutmeg','cinnamon','lacquer','camphor','ginseng','vanilla','cochineal','sealskin','guano','nitrate','ambergris','gum_arabic','beer_grain','sake_rice','brazilwood','cocoa','copper','ebony','gems','gold','jade','kauri','logwood','mahogany','maize','palm_oil','pearl_shell','sandalwood','sandalwood_hi','silver'].map(n => n + '.png');
// [지식카드 51장] 이름 규칙 밖(ast_*, zoo_* 등)이라도 APPROVED_IMAGES에 해시 승인된 카드 jpg는 등록 대상에 포함한다.
const approvedCardNames = new Set();
for (const k of Object.keys(cardApprovalDocument.approved || {})) if (k.startsWith('CardArt/')) approvedCardNames.add(k.slice(8) + '.jpg');
if (!studioRegrantPath) for (const [dir, kind] of [['naval', 'Naval'], ['town', 'Town'], ['people', 'People'], ['animals', 'Animals'], ['monsters', 'Monsters'], ['castle', 'Castle'], ['interior', 'Interior'], ['relics', 'Relics'], ['terrain', 'Terrain'], ['cargo', 'Cargo'], ['icons', 'Menu'], ['goods', 'Goods'], ['portraits', 'Portraits'], ['cardart', 'CardArt']]) {
  for (const f of await fs.readdir(path.join(ROOT, 'assets', dir))) {
    // [원본 리그] 메시 없는 관절계층 GLB는 제작용 원본이다. 단독 Roblox 3D 모델로 등록하지 않는다.
    // 기존 리그 파일과 실제 NPC·장비 모델은 보존한다.
    if (kind === 'People' && (f === 'rig_f.glb' || f === 'rig_m.glb')) continue;
    // [CC0 원본 보존] nau-source는 선체 개조 출처 검증용 바이너리로 Roblox 등록 대상이 아니다.
    if (kind === 'Naval' && f === 'nau-source.glb') continue;
    if (kind === 'Naval' && f === 'rowboat-source.glb') continue;
    if (blockedPaths.has(path.join(ROOT, 'assets', dir, f))) continue;
    // 새 발견물 원화만 기존 이미지 승인 해시 검사를 거쳐 등록한다.
    // [5대륙 카드] 기존 CardArt 승인 경로에서만 150장 PNG를 등록한다. SVG 원본은 Roblox 이미지로 직접 올리지 않는다.
    if (kind === 'CardArt' && !approvedCardNames.has(f) && !/^(?:world_(?:0[1-9]|[1-9][0-9]{1,2})|event_[a-z_]+|battle_board)\.jpg$/.test(f)
        && !['event_title_ship.png', 'event_title_parchment.png'].includes(f)
        && !/^(?:eu|ea|me|nw|af)_(?:0[1-9]|[12][0-9]|30)\.png$/.test(f)) continue;
    const compressedGlb = f.toLowerCase().endsWith('.glb.gz');
    const ext = compressedGlb ? '.glb' : path.extname(f).toLowerCase();
    const name = compressedGlb ? path.basename(f, '.glb.gz') : path.basename(f, ext);
    const sourceFileName = compressedGlb ? f.slice(0, -3) : f;
    const image = kind === 'Menu' || kind === 'Goods' || kind === 'Portraits' || kind === 'CardArt';
    if (image ? !['.png', '.jpg', '.jpeg'].includes(ext) : ext !== '.glb' && ext !== '.fbx') continue;
    // [원본 증빙] Cargo와 Naval 모델은 파일별 라이선스·해시 증빙을 등록 파이프라인에서 확인한다.
    let sourceLicense = null;
    if (kind === 'Cargo' || kind === 'Naval' || kind === 'Relics') {
      try { sourceLicense = JSON.parse(await fs.readFile(path.join(ROOT, 'assets', dir, sourceFileName + '.license.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (sourceLicense && (!['PROJECT_ORIGINAL_ART', 'CC0-1.0', 'CC-BY-4.0'].includes(sourceLicense.license)
        || !sourceLicense.author || !sourceLicense.sourceSha256 || !sourceLicense.source))
        throw new Error('ORIGINAL_MODEL_SOURCE_METADATA_INVALID:' + f);
    }
    plan.push({kind, name, file: path.join(ROOT, 'assets', dir, f), ext, compressed: compressedGlb, sourceLicense,
      // [실제 Studio 검증] Goods/Menu/Portraits 모두 ImageLabel에서 사용한다. Decal 번호는 Client에서 로딩되지 않았다.
      // 실패 원본을 재업로드하지 않고 승인된 기존 PNG/JPG로 Image 자산을 발급한다.
      assetType: image ? 'Image' : 'Model',
      license: (kind === 'Cargo' || kind === 'Naval' || kind === 'Relics') && sourceLicense ? sourceLicense.license : kind === 'CardArt' ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Menu' && ['parchment_grain.png', 'leather_grain.png'].includes(f) ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Menu' && f.startsWith('vfx_') ? 'CC0-1.0'
        : kind === 'Portraits' && f.startsWith('scholar_') ? 'PUBLIC-DOMAIN'
        : kind === 'Portraits' && f === 'heroes.jpg' ? 'PUBLIC_DOMAIN_AND_ORIGINAL'
        : kind === 'Portraits' || kind === 'Goods' && ['dates.png', 'raisins.png', ...VIBE_DRAWN_GOODS].includes(f) ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Goods' && ['saffron.png', 'rice.png', 'indigo.png'].includes(f) ? 'CC0-1.0' : image ? 'CC-BY-3.0' : 'CC0-1.0'});
  }
}

let registry = {schema: 1, universeId: UNIVERSE_ID, license: 'CC0-1.0', assets: {}};
try { registry = JSON.parse(await fs.readFile(JSON_OUT, 'utf8')); } catch {}
for (const [name, row] of Object.entries(registry.assets)) {
  if (blockedPaths.has(row.source) || blockedIds.has(String(row.assetId))) delete registry.assets[name];
}
let approvedImages = {...(cardApprovalDocument.approved || {})};
try { for (const sid of Object.keys(JSON.parse(await fs.readFile(ROOT + '/assets/cardart/SEALED.json', 'utf8')).sealed || {})) delete approvedImages['CardArt/' + sid]; } catch {} // 봉인 카드: 승인돼 있어도 업로드 금지
// [원본 보호] 종류 변경 중 신규 업로드나 Universe 사용 권한 확인이 실패하면 기존 등록 ID를 보존한다.
const previousTypeAssets = new Map();
for (const item of plan) {
  const row = registry.assets[item.kind + '/' + item.name];
  if (row && row.assetType && row.assetType !== item.assetType) {
    console.log('REUPLOAD_TYPE_CHANGED', item.kind + '/' + item.name, row.assetType, '->', item.assetType);
    previousTypeAssets.set(item.kind + '/' + item.name, {...row});
    delete registry.assets[item.kind + '/' + item.name];
  }
}
const failures = [];
const pendingPermissions = [];
let accountBlocked = false;
if (studioRegrantPath) {
  // [실측 계약] 다른 게임/기록이거나 등록 번호가 바뀌면 권한 쓰기를 시작하지 않는다.
  const report = JSON.parse(await fs.readFile(studioRegrantPath, 'utf8'));
  const media = report.assetAudit?.registered;
  const failuresInStudio = media?.failedMedia;
  if (!Number.isSafeInteger(report.summary?.plannedSteps) || report.summary.plannedSteps < 180
    || report.summary?.completedSteps !== report.summary.plannedSteps
    || report.summary?.abortedEarly !== false
    || !Number.isSafeInteger(report.summary?.plannedFrames) || report.summary.plannedFrames < 31
    || report.summary?.capturedFrames !== report.summary.plannedFrames
    || !Array.isArray(report.errors) || !report.errors.includes('STUDIO_ASSET_AUDIT_FAILED')
    || report.assetRegistryAudit?.status !== 'PASS'
    || report.assetRegistryAudit?.registered !== Object.keys(registry.assets).length
    || !Array.isArray(report.assetRegistryAudit?.mismatched)
    || report.assetRegistryAudit.mismatched.length !== 0
    || !Array.isArray(report.assetRegistryAudit?.missing)
    || report.assetRegistryAudit.missing.length !== 0
    || !Array.isArray(report.assetRegistryAudit?.unverifiedPermissions)
    || report.assetRegistryAudit.unverifiedPermissions.length !== 0
    || media?.status !== 'FAIL' || !Array.isArray(failuresInStudio)
    || failuresInStudio.length === 0 || failuresInStudio.length > 128
    || media.failed !== failuresInStudio.length)
    throw new Error('MARE_STUDIO_REGRANT_EVIDENCE_NOT_VERIFIED');
  const seen = new Set();
  for (const row of failuresInStudio) {
    const id = String(row.key || '').replace(/^AssetIds\./, '');
    const registered = registry.assets[id];
    if (!/^AssetIds\.(?:Goods|Menu|Portraits)\/[A-Za-z0-9._-]+$/.test(String(row.key || ''))
      || row.status !== 'TIMEOUT_16S' || seen.has(id) || !registered
      || !['Image', 'Decal'].includes(registered.assetType)
      || !/^[1-9][0-9]*$/.test(String(registered.assetId))
      || row.id !== 'rbxassetid://' + registered.assetId)
      throw new Error('MARE_STUDIO_REGRANT_ID_OR_TYPE_MISMATCH:' + id);
    seen.add(id);
    pendingPermissions.push({id, assetId: registered.assetId});
  }
  console.log('MARE_STUDIO_REGRANT_VALIDATED_TARGET_COUNT=' + pendingPermissions.length);
}
for (const item of plan) {
  const id = item.kind + '/' + item.name;
  const storedBytes = await fs.readFile(item.file);
  const originalBytes = item.compressed ? gunzipSync(storedBytes) : storedBytes;
  const sourceSha256 = crypto.createHash('sha256').update(originalBytes).digest('hex');
  if (item.sourceLicense && item.sourceLicense.sourceSha256 !== sourceSha256) {
    failures.push(id + ': ORIGINAL_MODEL_SHA256_MISMATCH');
    console.error('ORIGINAL_MODEL_SHA256_MISMATCH', id);
    continue;
  }
  if (blockedHashes.has(sourceSha256)) {
    delete registry.assets[id];
    previousTypeAssets.delete(id); // 차단 원본은 이전 등록 ID로 되돌리지 않는다.
    console.log('REMOVED_IMAGE_SOURCE_EXCLUDED', id);
    continue;
  }
  // [교역품 자동 연습→수정] 승인 SHA가 달라졌을 때만 기존 Image 업로드를 갱신한다.
  // 미승인 변경은 현재 ID를 유지하되 업로드·게임 갱신을 차단한다.
  if (item.kind === 'Goods' && item.assetType === 'Image') {
    if (approvedImages[id] !== sourceSha256) {
      console.log('GOODS_IMAGE_CHANGE_NOT_APPROVED', id);
      if (registry.assets[id]?.assetId) failures.push(id + ': GOODS_APPROVAL_HASH_MISMATCH');
      continue;
    }
    const old = registry.assets[id];
    if (old?.assetId && old.sourceSha256 && old.sourceSha256 !== sourceSha256) {
      previousTypeAssets.set(id, {...old});
      delete registry.assets[id];
      console.log('GOODS_APPROVED_SOURCE_CHANGED_REUPLOAD', id);
    }
  }
  // [카드 원화 해시] 카드 ID는 그대로 유지하며, 승인받은 지역 원화만 교체한다. 미승인 이미지는 기존 등록 ID를 보존한다.
  const regionalCardArt = item.kind === 'CardArt' && /^(?:eu|ea|me|nw|af)_(?:0[1-9]|[12][0-9]|30)$/.test(item.name);
  if (regionalCardArt) {
    // [새 원화와 교체 원화] 생성 모델 원본 + 바이브 시각 품질·권리 검수 증빙이 없으면 등록을 거부한다.
    // 이미 등록된 20장과 기존 저장 키는 바꾸지 않는다.
    const previous = registry.assets[id];
    if ((!previous?.assetId || !previous.sourceSha256 || previous.sourceSha256 !== sourceSha256)
      && modelOriginals[id]?.sourceSha256 !== sourceSha256) {
      failures.push(id + ': MODEL_ORIGINAL_REVIEW_REQUIRED');
      console.log('MODEL_ORIGINAL_REVIEW_REQUIRED', id);
      continue;
    }
    if (approvedImages[id] !== sourceSha256) {
      console.log('REGIONAL_CARD_ART_NOT_APPROVED', id);
      if (registry.assets[id]?.assetId) failures.push(id + ': REGIONAL_CARD_ART_APPROVAL_HASH_MISMATCH');
      continue;
    }
    const old = registry.assets[id];
    if (old?.assetId && old.sourceSha256 && old.sourceSha256 !== sourceSha256) {
      previousTypeAssets.set(id, {...old});
      delete registry.assets[id];
      console.log('REGIONAL_CARD_ART_APPROVED_SOURCE_CHANGED_REUPLOAD', id);
    }
  }
  // [선박 원본 교체] 증빙된 모델의 바이너리가 바뀌면 기존 등록번호를 새 모델에 재사용하지 않는다.
  // 새 모델 등록과 Universe 사용 권한이 함께 확인되지 않으면 기존 번호로 복구한다.
  if (item.assetType === 'Model' && item.sourceLicense) {
    const old = registry.assets[id];
    if (old?.assetId && old.sourceSha256 && old.sourceSha256 !== sourceSha256) {
      previousTypeAssets.set(id, {...old});
      delete registry.assets[id];
      console.log('ORIGINAL_MODEL_SOURCE_CHANGED_REUPLOAD', id);
    }
  }
  // [바이브 자체 검수 관문] 새 이미지는 바이브가 직접 보고 확인해 APPROVED_IMAGES.json에 (이름+해시)로 올린 것만 업로드한다. 오너 승인 대기 없음(contentSafety.autonomousVibeReview).
  if (item.assetType !== 'Model' && !registry.assets[id]?.assetId) {
    const hash = crypto.createHash('sha256').update(originalBytes).digest('hex');
    if (approvedImages[id] !== hash) {
      if (previousTypeAssets.has(id)) failures.push(id + ': IMAGE_REPLACEMENT_APPROVAL_MISSING');
      console.log('SKIP_IMAGE_NOT_HUMAN_APPROVED', id);
      continue;
    }
  }
  if (registry.assets[id]?.assetId) {
    // 이미 발급된 ID는 다시 업로드하지 않고 실제 파일 형식/경로만 갱신한다.
    registry.assets[id].source = item.file;
    // 구형 등록표는 로컬 승인 원본 해시를 기준으로 다음 이미지 변경을 탐지한다.
    // 이 값만으로 Roblox 원격 바이너리 동일성/Studio 표시를 주장하지 않는다.
    if ((item.kind === 'Goods' && item.assetType === 'Image') || regionalCardArt)
      registry.assets[id].sourceSha256 = sourceSha256;
    if (registry.assets[id].usePermissionGranted !== true) pendingPermissions.push({id, assetId: registry.assets[id].assetId});
    console.log('SKIP_ALREADY_REGISTERED', id);
    continue;
  }
  try {
    let binary = originalBytes;
    if (binary.length > 20 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
    let uploadExt = item.ext;
    // UniGLTF 1.27 모델은 Roblox GLB 해석기에서 실패한다. 원본 메시/재질/좌표는 보존한 채
    // 표준 glTF 2.0 인라인 데이터로 전송하고 호환되지 않는 인덱스 표현만 정규화한다.
    if (item.ext === '.glb' && binary.subarray(0, 4).toString('ascii') === 'glTF') {
      const jsonSize = binary.readUInt32LE(12);
      const binHeaderOffset = 20 + jsonSize;
      if (binary.readUInt32LE(16) !== 0x4e4f534a || binHeaderOffset + 8 > binary.length) throw new Error('INVALID_GLB_JSON_CHUNK');
      const gltf = JSON.parse(binary.subarray(20, binHeaderOffset).toString('utf8'));
      if (String(gltf.asset?.generator || '').startsWith('UniGLTF-')) {
        const binLength = binary.readUInt32LE(binHeaderOffset);
        if (binary.readUInt32LE(binHeaderOffset + 4) !== 0x004e4942 || binHeaderOffset + 8 + binLength > binary.length)
          throw new Error('INVALID_GLB_BINARY_CHUNK');
        let data = Buffer.from(binary.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength));
        if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1) throw new Error('INVALID_GLB_BUFFER_COUNT');
        gltf.extensionsUsed = (gltf.extensionsUsed || []).filter(name => name !== 'KHR_materials_unlit');
        if (gltf.extensionsRequired) gltf.extensionsRequired = gltf.extensionsRequired.filter(name => name !== 'KHR_materials_unlit');
        if (!gltf.extensionsUsed.length) delete gltf.extensionsUsed;
        if (gltf.extensionsRequired && !gltf.extensionsRequired.length) delete gltf.extensionsRequired;
        // scene.nodes는 부모가 없는 루트여야 한다. 원본의 화면 밖 tmpParent 연결만 분리한다.
        // 장면에서 보이는 노드·좌표·메시·재질·스킨 인덱스는 바꾸지 않는다.
        const sceneRoots = new Set((gltf.scenes || []).flatMap(scene => scene.nodes || []));
        const visible = new Set();
        const visit = [...sceneRoots];
        while (visit.length) {
          const index = visit.pop();
          if (visible.has(index)) continue;
          if (!Number.isInteger(index) || !gltf.nodes?.[index]) throw new Error('INVALID_SCENE_NODE');
          visible.add(index);
          for (const child of gltf.nodes[index].children || []) visit.push(child);
        }
        for (let index = 0; index < (gltf.nodes || []).length; index++) {
          const parent = gltf.nodes[index];
          if (!(parent.children || []).some(child => sceneRoots.has(child))) continue;
          if (visible.has(index)) throw new Error('SCENE_ROOT_HAS_VISIBLE_PARENT');
          parent.children = parent.children.filter(child => !sceneRoots.has(child));
          if (!parent.children.length) delete parent.children;
        }
        for (const material of gltf.materials || []) {
          if (material.extensions?.KHR_materials_unlit) delete material.extensions.KHR_materials_unlit;
          if (material.extensions && !Object.keys(material.extensions).length) delete material.extensions;
          if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.metallicFactor = 0;
            material.pbrMetallicRoughness.roughnessFactor = 1;
          }
        }
        const indices = new Set();
        for (const mesh of gltf.meshes || []) for (const primitive of mesh.primitives || []) {
          if (Number.isInteger(primitive.indices)) indices.add(primitive.indices);
        }
        for (const index of indices) {
          const accessor = gltf.accessors[index];
          if (!accessor || accessor.componentType !== 5125 || accessor.type !== 'SCALAR') continue;
          const view = gltf.bufferViews[accessor.bufferView];
          if (!view || view.buffer !== 0 || view.byteStride) throw new Error('UNSUPPORTED_INDEX_LAYOUT');
          const from = (view.byteOffset || 0) + (accessor.byteOffset || 0);
          if (from + accessor.count * 4 > data.length) throw new Error('INVALID_INDEX_RANGE');
          let max = 0;
          for (let i = 0; i < accessor.count; i++) max = Math.max(max, data.readUInt32LE(from + i * 4));
          if (max > 65535) continue;
          const shortIndices = Buffer.alloc(accessor.count * 2);
          for (let i = 0; i < accessor.count; i++) shortIndices.writeUInt16LE(data.readUInt32LE(from + i * 4), i * 2);
          const alignedSize = Math.ceil(data.length / 4) * 4;
          if (alignedSize !== data.length) data = Buffer.concat([data, Buffer.alloc(alignedSize - data.length)]);
          const targetView = gltf.bufferViews.length;
          gltf.bufferViews.push({buffer: 0, byteOffset: data.length, byteLength: shortIndices.length, target: 34963});
          data = Buffer.concat([data, shortIndices]);
          accessor.bufferView = targetView;
          accessor.byteOffset = 0;
          accessor.componentType = 5123;
        }
        gltf.buffers[0].byteLength = data.length;
        gltf.buffers[0].uri = 'data:application/octet-stream;base64,' + data.toString('base64');
        binary = Buffer.from(JSON.stringify(gltf), 'utf8');
        uploadExt = '.gltf';
        console.log('NORMALIZED_STANDARD_GLTF', id, binary.length);
      }
    }
    const form = new FormData();
    form.set('request', JSON.stringify({
      assetType: item.assetType, displayName: ('MareEssentia ' + id).slice(0, 48),
      description: item.assetType !== 'Model'
        ? item.kind === 'Portraits' && item.name === 'heroes' ? 'Nine historical/fictional protagonist portraits: original game art plus public-domain archival images; sources in assets/SOURCES.md'
          : item.kind === 'CardArt' ? 'Original illustrated discovery art for Mare Essentia; subject sources and atlas coordinates in assets/SOURCES.md and assets/cardart/world-catalog.json'
          : item.kind === 'Portraits' && item.name.startsWith('scholar_') ? 'Public-domain historical portrait from Wikimedia Commons (license verified by fetch_commons.py); see assets/portraits/portraits-report.json'
          : item.kind === 'Portraits' ? 'Original NPC dialogue portrait for Mare Essentia at owner request; see assets/SOURCES.md'
          : item.kind === 'Menu' && item.license === 'PROJECT_ORIGINAL_ART' ? 'Original aged parchment and embossed leather texture rendered for Mare Essentia book UI; approved hash in assets/APPROVED_IMAGES.json'
          : item.license === 'PROJECT_ORIGINAL_ART' ? 'Original vector commodity art made for Mare Essentia at owner request; see assets/SOURCES.md'
          : item.kind === 'Goods' && ['rice', 'indigo'].includes(item.name) ? 'OpenFarm Open Crop Icons CC0 source illustrations; see assets/SOURCES.md'
          : item.kind === 'Menu' && item.name.startsWith('vfx_') ? 'CC0 particle sprite (OpenGameArt Particle Pack, 80 sprites); same source as company common VFX; see assets/SOURCES.md'
          : item.license === 'CC0-1.0' ? 'Tiny Speck Glitch / CC0, vector conversion by Bart; see assets/SOURCES.md'
          : 'Icons by Lorc, Delapouite, Lord Berandas, Skoll / game-icons.net / CC BY 3.0. Color edit and PNG export for Mare Essentia; see assets/SOURCES.md'
        : item.assetType === 'Model' && item.license === 'PROJECT_ORIGINAL_ART'
        ? 'Original 3D model for Mare Essentia; source, license, and SHA-256 in assets/' + item.kind.toLowerCase() + '/' + item.name + item.ext + '.license.json'
        : 'CC0 model for Mare Essentia (' + item.kind + '); see assets/SOURCES.md',
      creationContext: {creator: {userId: Number(creatorId)}},
    }));
    form.set('fileContent', new Blob([binary], {type: uploadExt === '.png' ? 'image/png' : ['.jpg', '.jpeg'].includes(uploadExt) ? 'image/jpeg' : uploadExt === '.gltf' ? 'model/gltf+json' : uploadExt === '.glb' ? 'model/gltf-binary' : 'model/fbx'}), item.name + uploadExt);
    const initial = await request('https://apis.roblox.com/assets/v1/assets', {method: 'POST', body: form});
    if (!/^operations\/[A-Za-z0-9_\-/]+$/.test(String(initial.path))) throw new Error('NO_UPLOAD_OPERATION');
    let assetId = null;
    for (let n = 0; n < 40 && !assetId; n++) {
      await new Promise(r => setTimeout(r, 2000));
      const op = await request('https://apis.roblox.com/assets/v1/' + initial.path);
      if (op.error) throw new Error('UPLOAD_FAILED: ' + JSON.stringify(op.error).slice(0, 200));
      if (op.done) assetId = String(op.response?.assetId || op.response?.asset?.assetId || '');
    }
    if (!/^[1-9][0-9]*$/.test(assetId || '')) throw new Error('NO_ASSET_ID');
    // 신규 자산도 기존 목록과 함께 일괄 권한 부여한다. 자산별 개별 PATCH 300회 호출 금지.
    registry.assets[id] = {assetId, source: item.file, license: item.license, assetType: item.assetType, usePermissionGranted: false,
      ...((item.kind === 'Goods' && item.assetType === 'Image') || regionalCardArt || item.sourceLicense ? {sourceSha256} : {})};
    pendingPermissions.push({id, assetId});

    console.log('UPLOADED', id, assetId);
  } catch (e) {
    failures.push(id + ': ' + String(e.message).slice(0, 200));
    console.log('FAILED', id, String(e.message).slice(0, 200));
    if (/User is moderated/i.test(String(e.message))) {
      accountBlocked = true;
      console.error('REGISTRATION_BLOCKED_ACCOUNT_MODERATED: remaining uploads and permission writes stopped');
      break;
    }
  }
}
// 사용 권한: 공식 BatchGrantPermissionsRequest/Response로 25개씩 부여하고 실제 성공 목록만 기록한다.
// HTTP 200이라도 일부 assetId가 오류면 그 항목은 승인되지 않은 것으로 유지한다.
for (let offset = 0; !accountBlocked && offset < pendingPermissions.length; offset += 25) {
  const batch = pendingPermissions.slice(offset, offset + 25);
  try {
    const response = await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions', {
      method: 'PATCH', headers: {'content-type': 'application/json'},
      body: JSON.stringify({subjectType: 'Universe', subjectId: UNIVERSE_ID, action: 'Use',
        requests: batch.map(item => ({assetId: Number(item.assetId), grantToDependencies: true}))}),
    });
    const granted = new Set((response.successAssetIds || []).map(String));
    const rejected = new Map((response.errors || []).map(row => [String(row.assetId), String(row.code)]));
    for (const item of batch) {
      if (granted.has(String(item.assetId))) {
        registry.assets[item.id].usePermissionGranted = true;
        console.log('GRANTED_ASSET', item.id);
      } else {
        failures.push(item.id + ': USE_PERMISSION_UNVERIFIED_' + (rejected.get(String(item.assetId)) || 'NOT_CONFIRMED'));
        console.log('GRANT_WARNING', item.id, rejected.get(String(item.assetId)) || 'NOT_CONFIRMED');
      }
    }
  } catch (error) {
    for (const item of batch) failures.push(item.id + ': USE_PERMISSION_UNVERIFIED');
    console.log('GRANT_BATCH_FAILED', offset, batch.length, String(error.message).slice(0, 180));
  }
}
// [등록 원자성] Image/Model 교체는 새 자산 ID·형식·Universe 권한·원본 해시 확인 전까지 기존 ID를 보존한다.
// 다른 등록 실패가 발생해도 이전 정상 번호를 복구하며 신규 원본이 배포됐다고 표시하지 않는다.
const replacementUnverified = [...previousTypeAssets].filter(([id, previous]) => {
  const expectedType = plan.find(item => item.kind + '/' + item.name === id)?.assetType || 'Image';
  const current = registry.assets[id];
  return current?.assetType !== expectedType || current?.usePermissionGranted !== true
    || (expectedType === 'Model' && current.sourceSha256 === previous.sourceSha256);
});
if (replacementUnverified.length) failures.push('MARE_ASSET_REPLACEMENTS_NOT_VERIFIED:' + replacementUnverified.length);
if (failures.length && previousTypeAssets.size) {
  for (const [id, previous] of previousTypeAssets) registry.assets[id] = previous;
  console.log('MARE_ASSET_REPLACEMENT_ROLLBACK=OLD_IDS_PRESERVED:' + previousTypeAssets.size);
}
if (failures.length === 0) registry.updatedAt = new Date().toISOString();
registry.license = Object.values(registry.assets).every(a => a.license === 'CC0-1.0') ? 'CC0-1.0' : 'SEE_INDIVIDUAL_ASSET_LICENSES';
await fs.writeFile(JSON_OUT, JSON.stringify(registry, null, 2) + '\n');
const lines = Object.entries(registry.assets).sort().map(([k, v]) => `\t["${k}"] = ${v.assetId},`);
await fs.writeFile(LUAU_OUT, '-- 자동 생성: tools/mare-essentia-upload-assets.mjs (직접 고치지 말 것)\nreturn {\n' + lines.join('\n') + (lines.length ? '\n' : '') + '}\n');
console.log('REGISTERED_COUNT=' + Object.keys(registry.assets).length + ' FAILED_COUNT=' + failures.length);
if (!Object.keys(registry.assets).length || failures.length) {
  console.error('REGISTRATION_INCOMPLETE', failures.length, failures.slice(0, 12).join(' | '));
  process.exitCode = 1;
}


