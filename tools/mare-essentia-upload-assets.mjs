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
        // glTF 원본은 Y-up/Z-longitudinal. 원본 행렬만 회전/확대해 Z-up 작업 좌표로 가져온다.
        // 항해선에 부적절한 현대식 노·노걸이만 장면에서 제외한다(메시와 바이너리는 남긴다).
        const unusedOars=new Set(model.nodes.flatMap((node,i)=>
          /(?:^|[_ .-])(?:oars?|rowlocks?|oarlocks?|paddles?)(?:$|[_ .-])/i.test(node.name||'')?[i]:[]));
        for(const node of model.nodes){
          if(node.children)node.children=node.children.filter(i=>!unusedOars.has(i));
        }
        const hullOriginalNodes=scene.nodes.filter(i=>!unusedOars.has(i));
        if(hullOriginalNodes.length===0)throw Error('MARE_COASTAL_CC0_HULL_SCENE_EMPTY:'+ship);
        const hullRoot=model.nodes.push({name:ship+' original CC0 clinker hull enlarged',
          matrix:[1.24,0,0,0,0,0,1.18,0,0,1.78,0,0,0,0,-0.25,1],
          children:hullOriginalNodes})-1;
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
          // 므테페는 길게 솟은 선수(앞 -Y)와 잘린 선미 판벽, 자하지는 높고 곧은 선수,
          // 코티아는 활처럼 굽는 뱃전·폭 넓은 화물창. 기본 선체 복제처럼 보이지 않게 곡률을 달리한다.
          const y=-3.9+7.45*t;
          const sinArc=Math.pow(Math.max(0,Math.sin(Math.PI*t)),0.58);
          const sternSquare=ship==='mtepe'&&t>0.72?
            0.72+0.28*Math.max(0,Math.min(1,(1-t)/0.045)):0;
          const arc=Math.max(sinArc,sternSquare);
          const forwardLift=ship==='mtepe'?0.90*Math.pow(1-t,5):
            ship==='jahazi'?0.52*Math.pow(1-t,4):0.60*Math.pow(1-t,4);
          const aftLift=ship==='kotia'?0.68*Math.pow(t,4):
            ship==='jahazi'?0.34*Math.pow(t,4):0.18*Math.pow(t,4);
          const x=sign*(0.16+beam*arc*(0.46+0.54*v));
          const z=-0.56+v*(ship==='kotia'?1.66:ship==='mtepe'?1.36:1.48)
            +rise*Math.pow(Math.abs(2*t-1),3)+forwardLift+aftLift;
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
          // 스와힐리 장거리 교역선: 높은 선수, 단일 장대각돛, 화물 차양.
          masts.push([[0,-0.58,0.60],[0,-0.12,9.35],0.17]);
          const A=[0,-3.55,8.20],B=[0,3.17,9.00],C=[0,1.62,1.34];
          addLateen('large Swahili jahazi billowed lateen sail cloth',A,B,C,31);
          masts.push([A,B,0.12]);
          decoration.push([[0,-3.92,1.15],[0,-4.56,2.05],0.12],
            [[0,3.45,1.12],[0,3.82,1.58],0.10]);
        }else if(ship==='kotia'){
          // 쿠치/말라바르 코티아: 장거리 후추 교역용 앞/뒤 두 대각범과 높은 선미.
          masts.push([[0,-1.04,0.68],[0,-0.66,9.60],0.18],
            [[0,2.22,0.75],[0,2.37,6.35],0.115]);
          const A=[0,-3.65,8.95],B=[0,2.16,9.35],C=[0,0.88,1.65];
          addLateen('Malabar kotia high main lateen cloth',A,B,C,31);
          masts.push([A,B,0.12]);
          const a=[0,0.18,6.00],b=[0,3.48,6.38],c=[0,2.62,1.57];
          addLateen('Malabar kotia aft trade lateen cloth',a,b,c,23);
          masts.push([a,b,0.08]);
          decoration.push([[0,3.55,1.15],[0,4.12,2.02],0.14],
            [[0,-3.85,1.12],[0,-4.33,1.72],0.15]);
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
        const mastTops=ship==='jahazi'?[[0,-0.12,9.35]]:ship==='kotia'?
          [[0,-0.66,9.60],[0,2.37,6.35]]:[[0,-0.18,8.60]];
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

        // [세부 제작] 카메라 근접 시 판재·상갑판·화물·조타장치·선수 장식이 실제 메시로 보이게 만든다.
        const detailWood=[],detailRope=[],carvedDetails=[],eyeRims=[];
        const crossBeams=[];
        // 배에 각기 다른 줄무늬 외판과 하부 버팀목(원본 메시·바이너리 그대로).
        for(const sign of [-1,1]){
          for(let i=1;i<=4;i++){
            const v=(i+0.25)/6;
            for(let j=0;j<32;j++){
              const t1=(j+0.5)/34,t2=(j+1.5)/34;
              detailWood.push([side(sign,t1,v),side(sign,t2,v),0.029]);
            }
          }
          for(let j=4;j<=28;j+=4){
            const t=j/34;
            const outer=side(sign,t,1.00);
            crossBeams.push([[0,outer[1],outer[2]-0.03],
              [outer[0]*0.91,outer[1],outer[2]-0.03],0.075]);
          }
        }
        addRods('individual teak strakes and outer wooden wales',detailWood,edge);
        addRods('transverse deck thwarts and reinforcing knees',crossBeams,wood);

        // [로프 결속] 삼각돛선은 고리-매듭으로 뱃전에 고정하고 화물함은 가로 세로 묶는다.
        for(const sign of [-1,1]){
          for(let j=3;j<=27;j+=3){
            const t=j/30;
            const x=side(sign,t,1.02);
            detailRope.push([x,[x[0]-sign*0.13,x[1],x[2]-0.18],0.025]);
          }
        }
        for(let i=0;i<cargoCount;i++){
          const row=Math.floor(i/3),col=i%3;
          const cx=(col-1)*0.48,cy=-0.54+row*0.75;
          const h=ship==='kotia'?0.70:0.47,z=0.81+h+0.018;
          detailRope.push([[cx-0.22,cy,z],[cx+0.22,cy,z],0.027],
            [[cx,cy-0.28,z],[cx,cy+0.28,z],0.027]);
        }
        addRods('coir cargo lashings and gunwale knots',detailRope,rope);

        // 조타 장치: 마스트처럼 서 있는 쓸모없는 원통이 아니라 방향타와 가로손잡이.
        const rudderA=[0,3.38,-0.22],rudderB=[0,3.95,0.95];
        addRods('aft steer oar and horizontal tiller',[
          [rudderA,rudderB,0.13],
          [[0,3.77,0.84],[-0.57,3.43,0.91],0.075],
          [[0,3.77,0.84],[0.57,3.43,0.91],0.075],
        ],wood);

        if(ship==='jahazi'){
          // [자하지] 마쿠티 야자 잎 지붕과 화물 보호 난간: 전통 스와힐리 장거리선 특유 실루엣.
          const canopyP=[],canopyI=[],rowCount=24,colCount=10;
          for(let i=0;i<=rowCount;i++)for(let j=0;j<=colCount;j++){
            const u=i/rowCount,v=j/colCount;
            const x=(v-0.5)*2.00,y=1.30+u*2.05;
            const z=1.64+0.48*Math.sin(Math.PI*v)+0.08*Math.sin(Math.PI*u*3);
            canopyP.push(x,y,z);
          }
          for(let i=0;i<rowCount;i++)for(let j=0;j<colCount;j++){
            const k=i*(colCount+1)+j,n=k+colCount+1;
            canopyI.push(k,n,k+1,n,n+1,k+1);
          }
          const palm=mat('jahazi woven makuti palm thatch',[0.71,0.62,0.35]);
          addMesh('Swahili jahazi makuti palm leaf roof',canopyP,canopyI,palm);
          const supports=[],hanging=[];
          for(const sign of [-1,1]){
            for(const y of [1.32,2.32,3.32])
              supports.push([[sign*0.98,y,0.98],[sign*0.98,y,1.76],0.047]);
            for(let i=0;i<17;i++){
              const y=1.34+i*0.126;
              hanging.push([[sign*1.04,y,1.39],[sign*1.04,y,0.92],0.021]);
            }
          }
          addRods('jahazi palm roof stakes and high trade rail',supports,edge);
          addRods('jahazi woven cargo curtain ties',hanging,rope);
        }
        if(ship==='kotia'){
          // [코티아] 위로 휘어진 선미 난간, 후추창 2개, 새머리 선수상.
          const transom=[],rails=[];
          for(const sign of [-1,1]){
            const pts=[[sign*0.92,2.65,1.28],[sign*1.02,3.08,1.65],
              [sign*1.04,3.52,2.05],[sign*0.64,3.84,2.23]];
            for(let i=0;i<pts.length-1;i++)rails.push([pts[i],pts[i+1],0.077]);
            rails.push([[sign*1.03,3.44,1.09],[sign*1.03,3.44,2.04],0.078]);
          }
          rails.push([[0,-4.23,1.70],[0,-4.48,2.02],0.075],
            [[0,-4.48,2.02],[0,-4.72,1.86],0.09],
            [[0,-4.48,2.02],[-0.24,-4.63,1.96],0.044],
            [[0,-4.48,2.02],[0.24,-4.63,1.96],0.044]);
          addRods('kotia arched stern and carved parrot head stem',rails,bright);
          for(const y of [-1.56,0.62]){
            const hatchP=[],hatchI=[];
            const a=hatchP.length/3;
            for(const [x,yy,z] of [[-0.46,y-0.48,1.26],[0.46,y-0.48,1.26],
              [0.46,y+0.48,1.26],[-0.46,y+0.48,1.26]])
              hatchP.push(x,yy,z);
            hatchI.push(a,a+1,a+2,a,a+2,a+3);
            addMesh('kotia rectangular pepper hold hatch '+y,hatchP,hatchI,edge);
            for(const x of [-0.47,0,0.47])
              carvedDetails.push([[x,y-0.49,1.30],[x,y+0.49,1.30],0.034]);
          }
        }
        if(ship==='mtepe'){
          // [므테페] 학술 모형 기준: 후방 직각 선미판, 솟은 가느다란 선수,
          // 선수 양측 눈 무늬와 대형 돛대에 달린 3개 작은 깃발.
          const backP=[],backI=[];
          const aft=side(1,1,1),aftB=side(-1,1,1);
          backP.push(aft[0],aft[1],-0.38, aftB[0],aftB[1],-0.38,
            aftB[0],aftB[1],aftB[2], aft[0],aft[1],aft[2]);
          backI.push(0,1,2,0,2,3);
          addMesh('mtepe flat broad square wooden stern transom',backP,backI,wood);
          carvedDetails.push(
            [[0,-3.68,1.13],[0,-4.28,2.31],0.17],
            [[0,-4.28,2.31],[0,-4.70,2.66],0.13],
            [[0,-4.70,2.66],[0,-5.00,2.62],0.072],
            [[0,3.56,0.89],[0,3.62,1.67],0.095]);
          // 양쪽 선수 눈: 플랫 이미지 대신 실제 금빛 둥근 고리.
          for(const sign of [-1,1]){
            const center=[sign*0.45,-3.10,1.17];
            for(let j=0;j<24;j++){
              const ang=2*Math.PI*j/24,bng=2*Math.PI*(j+1)/24;
              const a=[center[0]+sign*0.013,center[1]+0.23*Math.cos(ang),
                center[2]+0.14*Math.sin(ang)];
              const b=[center[0]+sign*0.013,center[1]+0.23*Math.cos(bng),
                center[2]+0.14*Math.sin(bng)];
              eyeRims.push([a,b,0.035]);
            }
          }
          addRods('mtepe carved paired prow eyes',eyeRims,bright);
          // 고전 므테페는 선수에 작은 깃발봉 세 개를 단다.
          const flagP=[],flagI=[],flagM=mat('Swahili crimson pennants',[0.66,0.19,0.13]);
          const pennants=[],flagPositions=[-0.22,0,0.22];
          for(let k=0;k<3;k++){
            const x=flagPositions[k],y=-4.13-0.25*k,z=2.15+0.16*k;
            pennants.push([[x,y,z],[x,y,z+0.85],0.025]);
            const base=flagP.length/3;
            flagP.push(x,y,z+0.85,x,y+0.54,z+0.72,x,y,z+0.48);
            flagI.push(base,base+1,base+2);
          }
          addRods('mtepe three fore pennant spars',pennants,edge);
          addMesh('mtepe three handwoven red pennants',flagP,flagI,flagM);
          const lashes=[];
          for(let j=0;j<16;j++){
            const t=0.07+j*0.051;
            for(const sign of [-1,1]){
              const a=side(sign,t,0.76),b=side(sign,t+0.023,0.76);
              lashes.push([a,b,0.022]);
            }
          }
          addRods('mtepe strong sewn sheer strake bindings',lashes,rope);
        }
        if(carvedDetails.length)addRods('regional engraved rail details',carvedDetails,bright);
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
          'Swahili sewn-plank mtepe: long overhanging carved bow, square transom stern, paired eyes, coir-sewn planks, woven mat square sail, three pennants':
          ship==='jahazi'?
          'Swahili jahazi: long cargo hull, single monumental lateen sail, makuti palm canopy, textile cargo curtains, carvel ribs and coir lashings':
          'Indian Kotia spice trader: wider teak hull, two working lateen masts, arched stern rail, parrot-head stem, dual cargo hatches, pepper hold';
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

// [7대륙 36척] 독립 선박 3D 실물 원본: 기존 등록기 안에서만 신규 결손 GLB를 직접 제작한다.
// 기본 모델 이름 교체나 타 함종 메시 복제가 아니다. 등록·권한·게임 표시는 기존 검증 흐름에 맡긴다.
async function prepareOriginalBlueprintShips() {
  const designs = [
    {id:'atlantic_brigantine', length:46, beam:7.5, depth:4.6, tall:36, west:true,
      description:'Individually built Atlantic brigantine: raked bow, double masts, square forecourses, aft gaff, guns and rope stays'},
    {id:'zanzibar_jahazi', length:55, beam:9.4, depth:6.2, tall:44, west:false,
      description:'Individually built Swahili jahazi: deep sewn-plank trading hull, monumental lateen yards, spice hold, palm canopy and carved eyes'},
  ];
  const colors=[
    ['oak',[0.43,0.26,0.12,1]],['strake',[0.58,0.36,0.19,1]],['dark',[0.22,0.13,0.07,1]],
    ['deck',[0.69,0.48,0.26,1]],['linen',[0.94,0.86,0.69,1]],['sailAccent',[0.71,0.36,0.19,1]],
    ['rope',[0.30,0.21,0.11,1]],['bronze',[0.75,0.57,0.29,1]],['iron',[0.19,0.22,0.22,1]],
    ['glass',[0.26,0.48,0.48,1]],['cargo',[0.51,0.38,0.21,1]],['flag',[0.14,0.39,0.48,1]],
    ['palm',[0.68,0.51,0.24,1]]
  ];
  const palette=Object.fromEntries(colors.map(([n],i)=>[n,i]));
  const plus=(a,b)=>a.map((v,i)=>v+b[i]),minus=(a,b)=>a.map((v,i)=>v-b[i]),times=(a,k)=>a.map(v=>v*k);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>times(a,1/(Math.hypot(...a)||1));
  for(const design of designs){
    const target=path.join(ROOT,'assets/naval',design.id+'-custom.glb'),licensePath=target+'.license.json';
    let existing=null;
    try{existing=await fs.readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(existing){
      const record=JSON.parse(await fs.readFile(licensePath,'utf8'));
      const hash=crypto.createHash('sha256').update(existing).digest('hex');
      if(record.sourceSha256!==hash||record.license!=='PROJECT_ORIGINAL_ART'
        ||record.shipBlueprintId!==design.id||existing.toString('ascii',0,4)!=='glTF'
        ||existing.readUInt32LE(8)!==existing.length)
        throw Error('MARE_AUTHORED_BLUEPRINT_SOURCE_DRIFT:'+design.id);
      console.log('MARE_AUTHORED_BLUEPRINT_VERIFIED',design.id,hash);
      continue;
    }
    const L=design.length,B=design.beam,D=design.depth,west=design.west,groups=colors.map(()=>({p:[],n:[],i:[],count:0}));
    let low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    const emit=(mat,a,b,c)=>{
      const face=cross(minus(b,a),minus(c,a));
      if(Math.hypot(...face)<0.0000001)return;
      const g=groups[palette[mat]],normal=unit(face),index=g.p.length/3;
      for(const v of [a,b,c]){
        g.p.push(...v);g.n.push(...normal);
        for(let k=0;k<3;k++){low[k]=Math.min(low[k],v[k]);high[k]=Math.max(high[k],v[k]);}
      }
      g.i.push(index,index+1,index+2);g.count++;
    };
    const quad=(mat,a,b,c,d)=>{emit(mat,a,b,c);emit(mat,a,c,d);};
    const rod=(mat,a,b,r=0.06,segments=8)=>{
      const length=Math.hypot(...minus(b,a));if(length<0.001)return;
      const dir=unit(minus(b,a)),n=unit(cross(dir,Math.abs(dir[1])>.92?[0,0,1]:[0,1,0])),m=unit(cross(dir,n));
      for(let j=0;j<segments;j++){
        const ang=j*2*Math.PI/segments,next=(j+1)*2*Math.PI/segments;
        const off=plus(times(n,r*Math.cos(ang)),times(m,r*Math.sin(ang)));
        const off2=plus(times(n,r*Math.cos(next)),times(m,r*Math.sin(next)));
        quad(mat,plus(a,off),plus(a,off2),plus(b,off2),plus(b,off));
      }
    };
    const box=(mat,x,y,z,dx,dy,dz)=>{
      const a=[x-dx/2,y-dy/2,z-dz/2],b=[x+dx/2,y-dy/2,z-dz/2],c=[x+dx/2,y+dy/2,z-dz/2],d=[x-dx/2,y+dy/2,z-dz/2],
        e=[x-dx/2,y-dy/2,z+dz/2],f=[x+dx/2,y-dy/2,z+dz/2],g=[x+dx/2,y+dy/2,z+dz/2],h=[x-dx/2,y+dy/2,z+dz/2];
      for(const face of [[a,b,c,d],[f,e,h,g],[e,a,d,h],[b,f,g,c],[d,c,g,h],[e,f,b,a]])quad(mat,...face);
    };
    const beam=t=>B*Math.sqrt(Math.max(0.015,1-t*t))*(west?1-0.13*t:1+0.07*t);
    const hull=(t,angle)=>[t*L/2,1.5-D*Math.sin(angle)*(0.84+0.16*(1-Math.abs(t)))+t*(west?0.15:0.28),Math.cos(angle)*beam(t)];
    // [선체] 연속 곡면 판재(대략 5000 삼각형), 다른 선수 기울기·폭·흘수와 우현/좌현 진짜 메시.
    for(let i=0;i<100;i++){
      const t=-.995+1.99*i/100,t2=-.995+1.99*(i+1)/100;
      for(let j=0;j<28;j++){
        const v=j*Math.PI/28,v2=(j+1)*Math.PI/28;
        quad(j%7===0?'strake':j%7===6?'dark':'oak',hull(t,v),hull(t2,v),hull(t2,v2),hull(t,v2));
      }
    }
    // [갑판] 별도 3D 목재 갑판, 횡거더, 이음부·목재 못과 양현 난간.
    for(let i=0;i<80;i++){
      const t=-.985+1.97*i/80,t2=-.985+1.97*(i+1)/80;
      for(let j=0;j<18;j++){
        const z=-1+2*j/18,z2=-1+2*(j+1)/18;
        quad((j+i)%9===0?'strake':'deck',[t*L/2,1.56,z*beam(t)*.94],[t2*L/2,1.56,z*beam(t2)*.94],
          [t2*L/2,1.56,z2*beam(t2)*.94],[t*L/2,1.56,z2*beam(t)*.94]);
      }
    }
    for(const side of [-1,1]){
      for(let j=0;j<6;j++){
        const angle=side===-1?Math.PI-(0.18+j*.16):0.18+j*.16;
        for(let i=0;i<34;i++){
          const t=-.975+1.95*i/34,t2=-.975+1.95*(i+1)/34;
          rod(j===0?'bronze':j===5?'dark':'strake',hull(t,angle),hull(t2,angle),j===0?.08:.045,6);
        }
      }
      for(let i=0;i<42;i++){
        const t=-.96+1.92*i/42,t2=-.96+1.92*(i+1)/42;
        rod('bronze',[t*L/2,1.97,side*beam(t)*.98],[t2*L/2,1.97,side*beam(t2)*.98],.10,7);
      }
      for(let i=0;i<22;i++){
        const t=-.94+1.88*i/22;rod('oak',[t*L/2,1.54,side*beam(t)*.98],[t*L/2,2.02,side*beam(t)*.98],.07,6);
      }
    }
    rod('dark',[L*.47,.65,0],[L*.55,west?3.65:5.9,0],.28,12);
    rod('bronze',[L*.55,west?3.65:5.9,0],[L*.61,west?2.9:4.8,0],.15,9);
    rod('oak',[-L*.47,.5,0],[-L*.49,west?4.2:6.1,0],.33,10);
    // [선미] 별도 객실 외벽, 창, 모서리 장식, 노출된 밧줄과 두 개의 독립 화물창.
    box('oak',-L*.32,2.6,0,west?9:13,2.1,B*.76);
    for(const side of [-1,1]){
      box('strake',-L*.32,3.70,side*B*.29,west?7.9:11.4,.20,.18);
      for(let j=0;j<(west?3:5);j++){
        const x=-L*.40+j*(west?2.55:2.2);
        box('bronze',x,2.85,side*B*.42,1.02,.91,.15);
        box('glass',x,2.85,side*B*.44,.74,.65,.08);
        rod('dark',[x,2.43,side*B*.47],[x,3.28,side*B*.47],.04,6);
      }
    }
    for(let k=0;k<2;k++){
      const x=L*(k===0?-.045:.20);
      box('dark',x,1.74,0,west?4.4:6.1,.20,west?2.65:3.7);
      for(let j=0;j<6;j++)rod('bronze',[x-1.9+j*.7,1.89,-1],[x-1.9+j*.7,1.89,1],.022,6);
    }
    if(west)for(const side of [-1,1])for(let j=0;j<7;j++){
      const x=-L*.24+j*(L*.51/6),z=side*beam(x/(L/2))*.98;
      box('iron',x,.48,z,1.37,.77,.24);
      rod('bronze',[x,.48,z],[x,.48,z+side*.6],.15,9);
    }
    else for(const side of [-1,1])for(let j=0;j<18;j++){
      const x=-L*.34+j*(L*.70/17),z=side*beam(x/(L/2))*.97;
      rod('rope',[x,.73,z],[x,1.9,z],.04,7);
    }
    // [교역품 실물] 묶은 향신료/보급 목재 상자와 화물 결박.
    for(let i=0;i<(west?9:18);i++){
      const x=-L*.12+Math.floor(i/3)*(west?2.15:2.05),z=(i%3-1)*(west?1.60:1.9);
      box('cargo',x,2.13,z,west?1.55:1.73,1.14,west?1.25:1.53);
      rod('rope',[x-.8,2.75,z],[x+.8,2.75,z],.04,7);
      rod('rope',[x,2.75,z-.70],[x,2.75,z+.70],.04,7);
    }
    const mast=(x,top,r=.33)=>{
      rod('oak',[x,1.56,0],[x+.30,top,0],r,12);
      rod('bronze',[x+.30,top-.72,0],[x+.30,top-.35,0],r+.075,12);
      rod('dark',[x+.30,top-.5,0],[x+.30,top+1.55,0],.12,9);
      for(let i=1;i<=3;i++)for(const sign of [-1,1])
        rod('rope',[x+.3,top-i*(top-1.5)*.16,0],[x+(i-2)*.7,1.65,sign*(B-1.25)],.042,7);
    };
    const squareSail=(x,lo,hi,w,color)=>{
      const nu=40,nv=26,P=(u,v)=>[x+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*1.14,lo+(hi-lo)*v,(u-.5)*w];
      for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)
        quad((j%13===0||i%17===0)?'strake':color,P(i/nu,j/nv),P((i+1)/nu,j/nv),P((i+1)/nu,(j+1)/nv),P(i/nu,(j+1)/nv));
      rod('oak',[x,hi,-w*.54],[x,hi,w*.54],.15,8);
      rod('oak',[x,lo,-w*.54],[x,lo,w*.54],.11,8);
      for(const side of [-1,1]){
        rod('rope',[x,hi,side*w*.5],[x,1.55,side*(B-.7)],.05,7);
        rod('rope',[x,lo,side*w*.5],[x,1.55,side*(B-.7)],.035,7);
      }
      for(let j=0;j<5;j++)for(let i=0;i<nu;i++)
        rod('rope',P(i/nu,j/4),P((i+1)/nu,j/4),.019,5);
    };
    const lateen=(a,b,c,color,billow)=>{
      const n=66,P=(u,v)=>{const p=plus(a,plus(times(minus(b,a),u),times(minus(c,a),v)));
        p[2]+=billow*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);return p;};
      for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
        emit(color,P(i/n,j/n),P((i+1)/n,j/n),P(i/n,(j+1)/n));
        if(i+j<n-1)emit(color,P((i+1)/n,j/n),P((i+1)/n,(j+1)/n),P(i/n,(j+1)/n));
      }
      for(const [p,q] of [[a,b],[b,c],[c,a]])rod('rope',p,q,.06,7);
      for(let k=1;k<6;k++){
        const p=plus(a,times(minus(b,a),k/6)),q=plus(p,times(minus(c,a),.6*(1-k/6)));
        rod('rope',p,q,.025,6);
      }
    };
    if(west){
      mast(11,35);mast(-11,33);
      squareSail(11,13,24,18.5,'linen');squareSail(11,25,33,14.5,'linen');
      squareSail(-11,16,26,14.5,'linen');
      lateen([-11,2.7,0],[-22,7,0],[-11,32,0],'sailAccent',.85);
      lateen([10,23,0],[L*.61,3.2,0],[11,31,0],'linen',.5);
      rod('oak',[L*.38,2.5,0],[L*.64,3.6,0],.2,10);
      for(let i=0;i<5;i++){const x=-20+i*9;rod('rope',[x,1.7,5],[x+6,5.8,-5],.04,6);}
      box('bronze',-19,3.85,0,1.25,.32,1.25);
      for(let i=0;i<3;i++){const y=32+i*1.18;quad('flag',[11,y,0],[11,y+1.1,0],[13.5+i*.3,y+.75,0],[13,y,0]);}
    }else{
      mast(-3,42,.44);mast(-18,29,.28);
      lateen([-7,4.5,0],[21,11.5,0],[-.2,41,0],'linen',1.8);
      lateen([-19,5,0],[-4,9.4,0],[-18,30,0],'strake',1.1);
      lateen([10,6,0],[L*.55,4,0],[1,28,0],'linen',.75);
      rod('dark',[-18,29,0],[22,11.1,0],.20,12);
      rod('dark',[-24,8.4,0],[-1,42,0],.21,12);
      // [스와힐리 선형] 15분할 아치형 야자 차양, 청동 눈 문양, 후미 조타 난간.
      for(let j=0;j<15;j++){
        const x=-L*.4+j*.86,crest=6.8+Math.sin(j*Math.PI/14)*.72;
        for(let k=0;k<11;k++){
          const z=-B*.42+k*(B*.84/10),z2=z+B*.84/10;
          quad(j%3===0?'strake':'palm',[x,crest,z],[x+.77,crest,z],[x+.77,crest,z2],[x,crest,z2]);
        }
        for(const side of [-1,1])
          rod('dark',[x,3.5,side*B*.46],[x,crest,side*B*.46],.082,7);
      }
      for(const side of [-1,1])for(let i=0;i<3;i++){
        const x=L*.29+i*1.1,z=side*beam(x/(L/2))*.99;
        rod('bronze',[x,1.2,z],[x+.15,1.9,z],.08,9);
        rod('glass',[x+.1,1.54,z+side*.06],[x+.1,1.6,z+side*.06],.18,10);
      }
      for(let i=0;i<18;i++){
        const a=i*Math.PI/9,b=(i+1)*Math.PI/9;
        rod('bronze',[L*.51+Math.cos(a)*.75,4.5+Math.sin(a)*.78,0],
            [L*.51+Math.cos(b)*.75,4.5+Math.sin(b)*.78,0],.07,7);
      }
    }
    for(const side of [-1,1])for(let j=0;j<20;j++){
      const t=-.9+j*.095,z=side*beam(t),x=t*L/2;
      rod(j%5===0?'bronze':'dark',[x,1.45,z],[x,.89,z*.89],j%5===0?.075:.032,6);
    }
    // [glTF 2.0] 색상별 하위 메시, 정면/뒷면, 실제 삼각형 인덱스와 노멀을 갖는 완성 GLB.
    const triangles=groups.reduce((v,g)=>v+g.count,0);
    if(triangles<13000||triangles>85000||high[0]-low[0]<40||high[1]-low[1]<28||high[2]-low[2]<12)
      throw Error('MARE_AUTHORED_SHIP_GEOMETRY_INCOMPLETE:'+design.id+':'+triangles);
    const parts=[],views=[],accessors=[],primitives=[];let binLength=0;
    const bufferView=(data,targetKind)=>{
      const pad=(4-binLength%4)%4;
      if(pad){parts.push(Buffer.alloc(pad));binLength+=pad;}
      const b=Buffer.from(data.buffer,data.byteOffset,data.byteLength),index=views.length;
      views.push({buffer:0,byteOffset:binLength,byteLength:b.length,target:targetKind});
      parts.push(b);binLength+=b.length;return index;
    };
    const accessor=(view,count,componentType,type)=>{
      return accessors.push({bufferView:view,count,componentType,type})-1;
    };
    for(let m=0;m<groups.length;m++){
      const g=groups[m];if(!g.count)continue;
      const count=g.p.length/3,p=bufferView(new Float32Array(g.p),34962),
        n=bufferView(new Float32Array(g.n),34962),indices=bufferView(new Uint32Array(g.i),34963);
      primitives.push({attributes:{POSITION:accessor(p,count,5126,'VEC3'),NORMAL:accessor(n,count,5126,'VEC3')},
        indices:accessor(indices,g.i.length,5125,'SCALAR'),material:m,mode:4});
    }
    const scene={asset:{version:'2.0',generator:'Mare Essentia original seven-continent ship sculptor'},scene:0,
      scenes:[{nodes:[0]}],nodes:[{name:design.id,mesh:0}],
      meshes:[{name:design.id,primitives}],
      materials:colors.map(([name,rgba])=>({name,pbrMetallicRoughness:{
        baseColorFactor:rgba,metallicFactor:name==='iron'?.4:0,roughnessFactor:.85},doubleSided:true})),
      buffers:[{byteLength:binLength}],bufferViews:views,accessors};
    const sceneBytes=Buffer.from(JSON.stringify(scene),'utf8');
    const scenePad=(4-sceneBytes.length%4)%4,binPad=(4-binLength%4)%4;
    const binary=Buffer.concat(parts),json=Buffer.concat([sceneBytes,Buffer.alloc(scenePad,0x20)]);
    const total=12+8+json.length+8+binLength+binPad;
    const glb=Buffer.alloc(total);glb.write('glTF',0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(total,8);
    glb.writeUInt32LE(json.length,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);
    const binStart=20+json.length;
    glb.writeUInt32LE(binLength+binPad,binStart);glb.writeUInt32LE(0x004e4942,binStart+4);
    binary.copy(glb,binStart+8);
    if(glb.readUInt32LE(8)!==glb.length||glb.readUInt32LE(12)%4||scene.meshes[0].primitives.length<10)
      throw Error('MARE_AUTHORED_SHIP_GLB_INVALID:'+design.id);
    const hash=crypto.createHash('sha256').update(glb).digest('hex');
    const proof={license:'PROJECT_ORIGINAL_ART',author:'GPT-6 / Mare Essentia original modelling',
      source:'ai-generated',sourceSha256:hash,shipBlueprintId:design.id,
      originalSource:'Original authored triangular hull and complete rigging, no copied ship meshes',
      structuralGlbVerified:true,modelGeometryGroups:colors.map(row=>row[0]),
      triangles,modelTargetSizeStuds:{length:L,beam:B*2,mastHeight:high[1]},
      derivedBytes:glb.length,modifications:design.description,
      actualRobloxRuntimeVerified:false,visualQualityApproved:false,robloxPublishedVerified:false,
      assetProductionStatus:'SOURCE_BINARY_COMPLETE_AWAITING_IMPORT_AND_RUNTIME_QA'};
    await fs.writeFile(target,glb);
    await fs.writeFile(licensePath,JSON.stringify(proof,null,2)+'\n');
    console.log('MARE_AUTHORED_SHIP_BINARY_CREATED',design.id,hash,glb.length,triangles);
  }
}
if (!studioRegrantPath) await prepareOriginalBlueprintShips();



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
const VIBE_DRAWN_GOODS = ['pepper','silk','porcelain','coffee','timber','feathers','cloves','nutmeg','cinnamon','lacquer','camphor','ginseng','vanilla','cochineal','sealskin','guano','nitrate','ambergris','gum_arabic','beer_grain','sake_rice','brazilwood','cocoa','copper','ebony','gems','gold','jade','kauri','logwood','mahogany','maize','palm_oil','pearl_shell','sandalwood','sandalwood_hi','silver'].map(n => n + '.png');
// [ChatGPT 2.5D 교역품 원화] 승인 해시를 가진 게임 전용 투명 이미지에만 적용. 기존 Image 업로드·권한 등록기를 그대로 사용한다.
const CHATGPT_ORIGINAL_GOODS = ['amber','cloth','coal','cocoa','coffee','coral','dates','fish','fur','glass','gold','iron','ivory','olive','olive_oil','pearls','pepper','porcelain','saffron','salt','silk','spice','sugar','tea','timber','wool'].map(n => n + '.png');
// [지식카드 51장] 이름 규칙 밖(ast_*, zoo_* 등)이라도 APPROVED_IMAGES에 해시 승인된 카드 jpg는 등록 대상에 포함한다.
const approvedCardNames = new Set();
for (const k of Object.keys(cardApprovalDocument.approved || {})) if (k.startsWith('CardArt/')) approvedCardNames.add(k.slice(8) + '.jpg');
if (!studioRegrantPath) for (const [dir, kind] of [['naval', 'Naval'], ['town', 'Town'], ['people', 'People'], ['animals', 'Animals'], ['monsters', 'Monsters'], ['castle', 'Castle'], ['interior', 'Interior'], ['relics', 'Relics'], ['terrain', 'Terrain'], ['cargo', 'Cargo'], ['icons', 'Menu'], ['goods', 'Goods'], ['portraits', 'Portraits'], ['cardart', 'CardArt'], ['materials', 'Materials']]) {
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
    const image = kind === 'Menu' || kind === 'Goods' || kind === 'Portraits' || kind === 'CardArt' || kind === 'Materials';
    if (image ? !['.png', '.jpg', '.jpeg'].includes(ext) : ext !== '.glb' && ext !== '.fbx') continue;
    // [원본 증빙] Cargo와 Naval 모델은 파일별 라이선스·해시 증빙을 등록 파이프라인에서 확인한다.
    let sourceLicense = null;
    // [원본 UV 개선] 복식 9종은 반드시 실제 원본 해시·형상 보존 증빙을 보유한다.
    const originalOutfit = kind === 'People' && /^outfit_(?:vest|coat|guard|apron|sash|belt|cuff|boot|stole)\.glb$/.test(sourceFileName);
    if (kind === 'Cargo' || kind === 'Naval' || kind === 'Relics' || kind === 'Materials' || originalOutfit) {
      try { sourceLicense = JSON.parse(await fs.readFile(path.join(ROOT, 'assets', dir, sourceFileName + '.license.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (kind === 'Materials' && (!sourceLicense || sourceLicense.license !== 'CC0-1.0'
        || !sourceLicense.author || !sourceLicense.sourceSha256 || !sourceLicense.source))
        throw new Error('CC0_MATERIAL_SOURCE_METADATA_REQUIRED:' + f);
      if (originalOutfit && (!sourceLicense || sourceLicense.license !== 'CC0-1.0'
        || sourceLicense.uvVersion !== 1 || !sourceLicense.originalGeometrySha256
        || !sourceLicense.sourceGitBlobSha1 || !sourceLicense.sourceSha256))
        throw new Error('R15_OUTFIT_UV_AND_SOURCE_PROOF_REQUIRED:' + f);
      if (sourceLicense && (!['PROJECT_ORIGINAL_ART', 'CC0-1.0', 'CC-BY-4.0'].includes(sourceLicense.license)
        || !sourceLicense.author || !sourceLicense.sourceSha256 || !sourceLicense.source))
        throw new Error('ORIGINAL_MODEL_SOURCE_METADATA_INVALID:' + f);
    }
    plan.push({kind, name, file: path.join(ROOT, 'assets', dir, f), ext, compressed: compressedGlb, sourceLicense,
      // [실제 Studio 검증] Goods/Menu/Portraits 모두 ImageLabel에서 사용한다. Decal 번호는 Client에서 로딩되지 않았다.
      // 실패 원본을 재업로드하지 않고 승인된 기존 PNG/JPG로 Image 자산을 발급한다.
      assetType: image ? 'Image' : 'Model',
      license: (kind === 'Cargo' || kind === 'Naval' || kind === 'Relics' || kind === 'Materials' || originalOutfit) && sourceLicense ? sourceLicense.license : kind === 'CardArt' ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Menu' && ['parchment_grain.png', 'leather_grain.png', 'naval_skill.png', 'naval_fire.png', 'naval_speed.png', 'field_attack.png', 'field_dodge.png', 'field_weapon.png'].includes(f) ? 'PROJECT_ORIGINAL_ART'
        : kind === 'Menu' && f.startsWith('vfx_') ? 'CC0-1.0'
        : kind === 'Portraits' && f.startsWith('scholar_') ? 'PUBLIC-DOMAIN'
        : kind === 'Portraits' && f === 'heroes.jpg' ? 'PUBLIC_DOMAIN_AND_ORIGINAL'
        : kind === 'Portraits' || kind === 'Goods' && ['dates.png', 'raisins.png', ...VIBE_DRAWN_GOODS, ...CHATGPT_ORIGINAL_GOODS].includes(f) ? 'PROJECT_ORIGINAL_ART'
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
    const outfitUvUpgrade = item.kind === 'People' && /^outfit_(?:vest|coat|guard|apron|sash|belt|cuff|boot|stole)$/.test(item.name);
    // 옛 복식 ID는 해시가 없으므로 새 UV 원본에 재사용하지 않는다.
    // 신규 ID/Universe 권한 실패 시 기존 등록번호로 원자적 롤백한다.
    if (old?.assetId && old.sourceSha256 !== sourceSha256
      && (outfitUvUpgrade || Boolean(old.sourceSha256))) {
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
    if ((item.kind === 'Goods' && item.assetType === 'Image') || item.kind === 'Materials' || regionalCardArt)
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
          : item.kind === 'Materials' ? 'Original CC0 PBR material map from Poly Haven or ambientCG; exact creator, source page and SHA-256 in assets/materials/*.license.json'
          : item.kind === 'CardArt' ? 'Original illustrated discovery art for Mare Essentia; subject sources and atlas coordinates in assets/SOURCES.md and assets/cardart/world-catalog.json'
          : item.kind === 'Portraits' && item.name.startsWith('scholar_') ? 'Public-domain historical portrait from Wikimedia Commons (license verified by fetch_commons.py); see assets/portraits/portraits-report.json'
          : item.kind === 'Portraits' ? 'Original NPC dialogue portrait for Mare Essentia at owner request; see assets/SOURCES.md'
          : item.kind === 'Menu' && ['naval_skill', 'naval_fire', 'naval_speed'].includes(item.name) ? 'Original transparent nautical combat control art for Mare Essentia; generated in ChatGPT, source and SHA-256 in assets/SOURCES.md'
          : item.kind === 'Menu' && ['field_attack', 'field_dodge', 'field_weapon'].includes(item.name) ? 'Original transparent ground combat circular control art for Mare Essentia; approved SHA-256 and source in assets/SOURCES.md' 
          : item.kind === 'Menu' && item.license === 'PROJECT_ORIGINAL_ART' ? 'Original aged parchment and embossed leather texture rendered for Mare Essentia book UI; approved hash in assets/APPROVED_IMAGES.json'
          : item.kind === 'Goods' && CHATGPT_ORIGINAL_GOODS.includes(item.name + '.png') ? 'Original ChatGPT 2.5D transparent commodity illustration for Mare Essentia; approved source hash in assets/APPROVED_IMAGES.json and provenance in assets/SOURCES.md'
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


