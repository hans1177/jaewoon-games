// Vibe5.9: owner-scoped, source-grounded edits to real existing game art.
// Binary replacements reuse the existing CC0 provenance ledger; no invented visuals or release claims.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {applyExactEdits} from './autonomous-safe-edit.mjs';

const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const allowedLicense=/^CC0(?:-1\.0| 1\.0 Universal)?$/i;
const allowedBinary=/\.(?:png|webp|jpg|jpeg|glb|fbx|ogg|mp3|wav|gz)$/i;
const allowedText=/\.(?:svg|css)$/i;
const MAX_ASSETS=8,MAX_ASSET_BYTES=16*1024*1024;

function safePath(relative){
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes('\0')
    ||relative.startsWith('/')||relative.startsWith('./')||relative.includes('//')
    ||relative.split('/').some(segment=>!segment||segment==='.'||segment==='..')
    ||!/^[A-Za-z0-9_.\/-]+$/.test(relative))throw Error('VIBE59_ASSET_PATH_UNSAFE');
  return relative;
}
function gameScope({order,repositoryRoot,sourceRoot,target,approvedAssetWrite,readOnly=false}){
  if(!readOnly&&(approvedAssetWrite!==true||order?.ownerApproved!==true
    ||order?.selectedTask?.ownerDirective!==true))
    throw Error('VIBE59_GAME_ASSET_WRITE_NOT_APPROVED');
  if(!['web','roblox'].includes(target))throw Error('VIBE59_GAME_ASSET_TARGET_UNSUPPORTED');
  const gameId=String(order.selectedTask.gameId||'');
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(gameId))throw Error('VIBE59_GAME_ASSET_GAME_UNCLAIMED');
  const repo=path.resolve(repositoryRoot),root=path.resolve(sourceRoot);
  const expected=path.join(repo,target==='web'?'web-games':'roblox-games',gameId);
  if(root!==expected||!fs.existsSync(root)||!fs.statSync(root).isDirectory()
    ||fs.realpathSync(root)!==root||fs.realpathSync(repo)!==repo)
    throw Error('VIBE59_GAME_ASSET_ROOT_UNCLAIMED');
  const catalogPath=path.join(repo,'game-catalog.json');
  if(!fs.existsSync(catalogPath)||!fs.lstatSync(catalogPath).isFile())
    throw Error('VIBE59_GAME_ASSET_CATALOG_REQUIRED');
  const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
  const game=catalog.games?.find(row=>row.id===gameId);
  if(!game||catalog.ownerStoppedGameIds?.includes(gameId)
    ||game.ownerDevelopmentStopped===true||game.lifecycleState==='OWNER_STOPPED')
    throw Error('VIBE59_GAME_ASSET_CATALOG_GAME_NOT_ACTIVE');
  if(target==='web'&&game.webPath&&game.webPath!=='web-games/'+gameId)
    throw Error('VIBE59_GAME_ASSET_CATALOG_PATH_MISMATCH');
  return {repo,root,gameId};
}
function verifiedFile(base,relative){
  const abs=path.resolve(base,safePath(relative));
  if(!abs.startsWith(base+path.sep)||!fs.existsSync(abs)
    ||!fs.lstatSync(abs).isFile()||fs.realpathSync(abs)!==abs)
    throw Error('VIBE59_GAME_ASSET_FILE_NOT_REGULAR');
  if(fs.statSync(abs).size>MAX_ASSET_BYTES)throw Error('VIBE59_GAME_ASSET_TOO_LARGE');
  return abs;
}
function checkOriginal(original,expected){
  if(typeof expected!=='string'||!(/^[a-f0-9]{64}$/i.test(expected))
    ||sha(original)!==expected.toLowerCase())throw Error('VIBE59_GAME_ASSET_STALE_SOURCE');
}
function checkSafeVisualDocument(text,relative){
  if(/\.svg$/i.test(relative)){
    if(!/^\s*<svg(?:\s|>)/i.test(text)||!/<\/svg>\s*$/i.test(text)
      ||/<\s*(?:script|foreignObject|iframe|image)\b|(?:onload|onerror)\s*=|(?:javascript:|data:text\/html)/i.test(text)
      ||/\b(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/)/i.test(text))
      throw Error('VIBE59_GAME_ASSET_UNSAFE_SVG');
  }else if(/(?:@import|expression\s*\(|url\s*\(\s*['"]?(?:https?:|\/\/|javascript:|data:))/i.test(text)){
    throw Error('VIBE59_GAME_ASSET_UNSAFE_CSS');
  }
}
function findLedgerSource(ledger,gameId,entryId,sourcePath,sourceSha){
  const entry=ledger.entries?.find(x=>x.id===entryId);
  if(!entry||!allowedLicense.test(String(entry.license))
    ||entry.commercialUse!==true||entry.modificationUse!==true
    ||!entry.verifiedAt||!entry.source||!entry.sourceUrl
    ||!['SHARED_COMMON_3D_LIBRARY',gameId].includes(entry.targetGame))
    throw Error('VIBE59_GAME_ASSET_LICENSE_NOT_VERIFIED');
  const evidence=entry.evidence||{};
  const files=[
    ...(Array.isArray(evidence.files)?evidence.files:[]),
    ...(Array.isArray(evidence.installedPaths)?evidence.installedPaths.map(path=>({path})):[]),
    ...(evidence.nativeModelPath?[{path:evidence.nativeModelPath}]:[]),
    ...(evidence.registeredFile?[{path:evidence.registeredFile}]:[])
  ];
  const proof=files.find(item=>item.path===sourcePath);
  if(!proof||proof.sha256&&proof.sha256.toLowerCase()!==sourceSha)
    throw Error('VIBE59_GAME_ASSET_PROVENANCE_NOT_VERIFIED');
  if(!evidence.licenseUrl&&!evidence.officialPage&&!evidence.sourceArchive
    &&!evidence.sourceUrls&&!evidence.files?.some(item=>item.path===sourcePath&&item.licenseEvidence))
    throw Error('VIBE59_GAME_ASSET_LICENSE_EVIDENCE_MISSING');
  if(evidence.publicReleaseClaimed===false&&entry.purpose?.includes('preview'))
    throw Error('VIBE59_GAME_ASSET_PREVIEW_ONLY');
  return entry;
}

// Report source-verified existing assets before deciding what the owner-scoped Vibe should improve.
// An audit is not an approval to replace a model with an unrelated visual.
export function inspectVibe59ExistingGameAssets({order={},sourceRoot='',repositoryRoot=process.cwd(),target='web'}={}){
  const {root,gameId}=gameScope({order,sourceRoot,repositoryRoot,target,readOnly:true});
  const found=[];
  // [게임별 분석] 실제 파일 헤더에서만 픽셀 수를 읽고, 모르는 포맷은 추측하지 않는다.
  let scanTruncated=false;
  function walk(dir,depth){
    if(depth>5||found.length>=256){scanTruncated=true;return;}
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(found.length>=256){scanTruncated=true;break;}
      const abs=path.join(dir,entry.name);
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){walk(abs,depth+1);continue;}
      if(!entry.isFile()||!/\.(svg|css|png|webp|jpg|jpeg|glb|fbx|ogg|mp3|wav|gz)$/i.test(entry.name))continue;
      const relative=path.relative(root,abs).split(path.sep).join('/');
      const bytes=fs.readFileSync(abs),ext=path.extname(relative).toLowerCase();
      let width=0,height=0;
      if(ext==='.png'&&bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        &&bytes.toString('ascii',12,16)==='IHDR'){
        width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);
      }else if(ext==='.webp'&&bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'
        &&bytes.toString('ascii',8,12)==='WEBP'){
        const kind=bytes.toString('ascii',12,16);
        if(kind==='VP8X'){
          width=1+bytes.readUIntLE(24,3);height=1+bytes.readUIntLE(27,3);
        }else if(kind==='VP8 '&&bytes.length>=30&&bytes[23]===0x9d&&bytes[24]===0x01&&bytes[25]===0x2a){
          width=bytes.readUInt16LE(26)&0x3fff;height=bytes.readUInt16LE(28)&0x3fff;
        }
      }
      const dimensionKnown=width>0&&height>0&&width<=16384&&height<=16384;
      found.push({path:relative,bytes:bytes.length,sha256:sha(bytes),
        ...(dimensionKnown?{width,height,estimatedRgbaBytes:width*height*4}:{})});
    }
  }
  walk(root,0);
  const missingReferences=[],staticReferences=new Set();
  // Detect broken file-backed SVG/PNG/audio/model links without selecting a made-up replacement.
  // Only literal HTML/CSS paths are considered; runtime-computed URLs remain unverified.
  if(target==='web'){
    const documents=[];
    function collect(dir,depth){
      if(depth>4||documents.length>=32)return;
      for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
        if(documents.length>=32)break;
        if(entry.isSymbolicLink())continue;
        const abs=path.join(dir,entry.name);
        if(entry.isDirectory()){collect(abs,depth+1);continue;}
        if(entry.isFile()&&/\.(?:html|css)$/i.test(entry.name)&&entry.name.length<100
          &&fs.statSync(abs).size<=256000)documents.push(abs);
      }
    }
    collect(root,0);
    for(const file of documents){
      const body=fs.readFileSync(file,'utf8');
      const refs=[...body.matchAll(/\b(?:src|href)\s*=\s*["']([^"'<>]+)["']/gi),
        ...body.matchAll(/url\s*\(\s*["']?([^"'()]+)["']?\s*\)/gi)];
      for(const match of refs){
        const value=match[1].split(/[?#]/)[0];
        if(!/\.(?:svg|png|webp|jpg|jpeg|glb|fbx|ogg|mp3|wav|gz)$/i.test(value)
          ||value.startsWith('/')||value.includes('\\')||value.includes(':')
          ||value.split('/').includes('..'))continue;
        const resolved=path.resolve(path.dirname(file),value);
        if(!resolved.startsWith(root+path.sep))continue;
        if(fs.existsSync(resolved)){
          staticReferences.add(path.relative(root,resolved).split(path.sep).join('/'));
          continue;
        }
        missingReferences.push({referencedBy:path.relative(root,file).split(path.sep).join('/'),
          assetPath:path.relative(root,resolved).split(path.sep).join('/'),
          problem:'MISSING_REFERENCED_ASSET',repair:'REQUIRES_VERIFIED_ROLE_AND_PROVENANCE'});
      }
    }
  }
  // [게임별 최적화] 중복을 임의 삭제하지 않고, 원본 해시와 정적 참조에만 기반해 후보를 만든다.
  const groups=new Map();
  for(const file of found){
    if(!groups.has(file.sha256))groups.set(file.sha256,[]);
    groups.get(file.sha256).push(file);
  }
  const duplicateGroups=[...groups.values()].filter(rows=>rows.length>1)
    .map(rows=>({sha256:rows[0].sha256,paths:rows.map(row=>row.path).sort(),
      duplicateBytes:(rows.length-1)*rows[0].bytes,automaticRemovalAllowed:false}))
    .sort((a,b)=>b.duplicateBytes-a.duplicateBytes||a.paths[0].localeCompare(b.paths[0]))
    .slice(0,24);
  const textures=found.filter(file=>/\.(?:png|webp|jpe?g)$/i.test(file.path));
  const oversizedTextures=textures.filter(file=>file.width&&file.height&&
    (/(?:^|\/)(?:ui|icons?|hud)(?:\/|$)/i.test(file.path)
      ?file.width*file.height>512*512:file.width*file.height>1024*1024))
    .map(file=>({path:file.path,width:file.width,height:file.height,
      estimatedRgbaBytes:file.estimatedRgbaBytes,threshold:'MOBILE_REVIEW_ONLY'}))
    .sort((a,b)=>b.estimatedRgbaBytes-a.estimatedRgbaBytes||a.path.localeCompare(b.path))
    .slice(0,24);
  const largeFiles=found.filter(file=>file.bytes> (
    /\.(?:png|webp|jpe?g|svg)$/i.test(file.path)?2*1024*1024:
    /\.(?:ogg|mp3|wav)$/i.test(file.path)?4*1024*1024:8*1024*1024))
    .map(file=>({path:file.path,bytes:file.bytes,action:'PROFILE_AND_VERIFY_BEFORE_REPLACEMENT'}))
    .sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path)).slice(0,24);
  const initialStaticAssets=found.filter(file=>staticReferences.has(file.path))
    .map(file=>({path:file.path,bytes:file.bytes}))
    .sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path)).slice(0,24);
  const actions=[];
  if(duplicateGroups.length)actions.push('VERIFY_IDENTICAL_ASSETS_AND_REUSE_EXISTING_APPROVED_SOURCE_ID');
  if(oversizedTextures.length)actions.push('MEASURE_MOBILE_TEXTURE_MEMORY_AND_REVIEW_RESOLUTION');
  if(largeFiles.length)actions.push('PROFILE_LARGE_ASSET_LOAD_COST_BEFORE_OPTIMIZATION');
  if(initialStaticAssets.length)actions.push('PRIORITIZE_ONLY_CRITICAL_STARTUP_ASSETS');
  if(target==='roblox')actions.push('AUDIT_REMOTE_ASSET_IDS_AND_INSTANCE_STREAMING_IN_ACTUAL_PLACE');
  const optimization=Object.freeze({
    gameId,target,kind:'GAME_SCOPED_STATIC_ASSET_OPTIMIZATION',
    scannedAssetCount:found.length,scanComplete:!scanTruncated,
    totalFileBytes:found.reduce((sum,file)=>sum+file.bytes,0),
    textureFileBytes:textures.reduce((sum,file)=>sum+file.bytes,0),
    decodedTextureCount:textures.filter(file=>file.estimatedRgbaBytes).length,
    estimatedRgbaMemoryBytes:textures.reduce((sum,file)=>sum+(file.estimatedRgbaBytes||0),0),
    duplicateGroups,oversizedTextures,largeFiles,initialStaticAssets,actions,
    referenceCoverage:target==='web'?'LITERAL_HTML_CSS_ONLY':'LOCAL_FILES_ONLY_REMOTE_IDS_UNKNOWN',
    estimatedRgbaMemoryIsNotMeasuredGpuMemory:true,
    optimizationApplied:false,assetFilesModified:false,licenseProofRequiredForReplacement:true,
    gameplayAndSavePreserved:true,runtimeVerified:false
  });
  return Object.freeze({gameId,target,assets:found,missingReferences,optimization,
    sourceWrite:false,runtimeVerified:false,suggestionsRequireProvenance:true});
}

// Bounded owner request: recolor an existing uniquely named SVG group only.
function inferExistingSvgRecolor({order,root,responsibleFiles}){
 const text=String(order.selectedTask?.goal||order.goal||'').trim();
 const ko=/^(?:기존\s+)?(assets\/[\w./-]+\.svg)의\s+([\w-]+)\s+색상\s+(#[\da-fA-F]+)을\s+(#[\da-fA-F]+)(?:으로)?\s*(?:바꿔|변경해|수정해)[.!]?$/.exec(text);
 const en=/^Recolor\s+([\w-]+)\s+in\s+(assets\/[\w./-]+\.svg)\s+from\s+(#[\da-fA-F]+)\s+to\s+(#[\da-fA-F]+)[.!]?$/i.exec(text);
 if(!ko&&!en)return null;
 const file=safePath(ko?ko[1]:en[2]),id=ko?ko[2]:en[1];
 const from=ko?ko[3]:en[3],to=ko?ko[4]:en[4];
 const valid=/^#(?:[\da-fA-F]{3}|[\da-fA-F]{6}|[\da-fA-F]{8})$/;
 if(!valid.test(from)||!valid.test(to)||from.toLowerCase()===to.toLowerCase())
   throw Error('VIBE59_GAME_ASSET_COLOR_INVALID');
 if(!responsibleFiles.includes(file))throw Error('VIBE59_GAME_ASSET_RESPONSIBLE_FILE_REQUIRED');
 const original=fs.readFileSync(verifiedFile(root,file)),source=original.toString('utf8');
 checkSafeVisualDocument(source,file);
 const names=[],stack=[],tags=/<\/?g\b[^>]*>/gi;let tag;
 while((tag=tags.exec(source))){
   if(tag[0].startsWith('</')){
     const start=stack.pop();if(!start)throw Error('VIBE59_GAME_ASSET_GROUP_UNBALANCED');
     if(start.id===id)names.push(source.slice(start.at,tags.lastIndex));
   }else if(!/\/>$/.test(tag[0])){
     const attr=/\bid\s*=\s*(["'])([^"']+)\1/.exec(tag[0]);
     stack.push({at:tag.index,id:attr?.[2]});
   }
 }
 if(stack.length)throw Error('VIBE59_GAME_ASSET_GROUP_UNBALANCED');
 if(names.length!==1)throw Error('VIBE59_GAME_ASSET_GROUP_NOT_UNIQUE:'+id);
 let changes=0;
 const replace=names[0].replace(/\b(fill|stroke|stop-color)\s*=\s*(["'])(#[\da-fA-F]{3,8})\2/g,
   (all,key,quote,value)=>{if(value.toLowerCase()!==from.toLowerCase())return all;
    changes++;return key+'='+quote+to+quote;});
 if(!changes)throw Error('VIBE59_GAME_ASSET_EXISTING_COLOR_NOT_FOUND:'+id);
 return [{path:file,expectedSha256:sha(original),find:names[0],replace}];
}

// Existing Vibe source-worker consumes this ordinary exact-edit candidate through its
// established normalization, independent QA, branch and release path. No direct writes.
export function createVibe59ExistingGameVisualCandidate({
  order={},sourceRoot='',repositoryRoot=process.cwd(),responsibleFiles=[],target='web'
}={}){
  const explicit=order.selectedTask?.vibe59VisualAssetEdits??order.vibe59VisualAssetEdits;
  const goal=String(order.selectedTask?.goal||order.goal||'').trim();
  if(explicit==null&&!/^(?:기존\s+)?assets\/|^Recolor\s+/i.test(goal))return null;
  if(order.ownerApproved!==true||order.selectedTask?.ownerDirective!==true)
    throw Error('VIBE59_GAME_ASSET_WRITE_NOT_APPROVED');
  const {root,gameId}=gameScope({order,sourceRoot,repositoryRoot,target,readOnly:true});
  const edits=explicit??inferExistingSvgRecolor({order,root,responsibleFiles});
  if(edits==null)return null;
  if(!Array.isArray(edits)||edits.length<1||edits.length>MAX_ASSETS
    ||!Array.isArray(responsibleFiles)||!responsibleFiles.length)
    throw Error('VIBE59_GAME_ASSET_CHANGES_OUT_OF_BOUNDS');
  const documents=new Map(),normalized=[];
  for(const edit of edits){
    const relative=safePath(edit?.path);
    if(!allowedText.test(relative)||!responsibleFiles.includes(relative)
      ||!(relative.startsWith('assets/')||relative.startsWith('icons/')
        ||/^(?:style|graphics-upgrade)\.css$/.test(relative))
      ||typeof edit.find!=='string'||!edit.find
      ||typeof edit.replace!=='string'||edit.replace===edit.find
      ||Buffer.byteLength(edit.find)+Buffer.byteLength(edit.replace)>64000)
      throw Error('VIBE59_GAME_ASSET_VISUAL_EDIT_INVALID');
    const original=fs.readFileSync(verifiedFile(root,relative));
    checkOriginal(original,edit.expectedSha256);
    checkSafeVisualDocument(original.toString('utf8'),relative);
    const doc=new Map([[relative,documents.get(relative)??original.toString('utf8')]]);
    applyExactEdits(root,[{path:relative,find:edit.find,replace:edit.replace}],{documents:doc});
    checkSafeVisualDocument(doc.get(relative),relative);
    documents.set(relative,doc.get(relative));
    normalized.push({path:relative,find:edit.find,replace:edit.replace});
  }
  return Object.freeze({
    summary:'Vibe5.9 owner-scoped existing game visual asset improvements',
    expectedEffect:'Edit '+normalized.length+' actual game-owned visual source assets without replacing gameplay',
    edits:normalized,newFiles:[],replaceFiles:[],tests:[],
    vibe59CodeKind:'SOURCE_BOUND_VISUAL_ASSET_EDIT',
    // Exact source matching is proven; rendered game runtime is NOT proven.
    vibe59TestPlan:{pass:true,cases:normalized.map((edit,index)=>({
      name:'source-exact-art-'+(index+1),path:edit.path,
      exactAnchorVerified:true,runtimeVerified:false
    }))},
    ruleDigest:sha(Buffer.from(JSON.stringify([gameId,target,normalized]))),
    sourceWrite:false,modelUsed:false,runtimeVerified:false,releaseVerified:false
  });
}

// Bounded modifications to an actual existing game's visuals. The original graphics asset
// stays at its existing path, so existing runtime references remain valid.
// Source and replacement digests must match current bytes; no new asset is invented.
export function applyVibe59ApprovedGameAssetChanges({
  order={},sourceRoot='',repositoryRoot=process.cwd(),target='web',
  approvedAssetWrite=false,visualEdits=[],binaryReplacements=[]
}={}){
  const {repo,root,gameId}=gameScope({order,sourceRoot,repositoryRoot,target,approvedAssetWrite});
  if(!Array.isArray(visualEdits)||!Array.isArray(binaryReplacements)
    ||!visualEdits.length&&!binaryReplacements.length
    ||visualEdits.length+binaryReplacements.length>MAX_ASSETS)
    throw Error('VIBE59_GAME_ASSET_CHANGES_OUT_OF_BOUNDS');
  const targets=new Map(),documents=new Map();
  const register=(relative,expectedSha)=>{
    safePath(relative);
    if(!(relative.startsWith('assets/')||relative.startsWith('icons/')
      ||relative.startsWith('audio/')||/^(?:style|graphics-upgrade)\.css$/.test(relative)))
      throw Error('VIBE59_GAME_ASSET_OUTSIDE_VISUAL_SCOPE');
    if(targets.has(relative))throw Error('VIBE59_GAME_ASSET_DUPLICATE_TARGET');
    const abs=verifiedFile(root,relative),original=fs.readFileSync(abs);
    checkOriginal(original,expectedSha);
    targets.set(relative,{abs,original,after:null});
    return original;
  };
  for(const edit of visualEdits){
    if(!allowedText.test(edit?.path||'')||typeof edit.find!=='string'
      ||typeof edit.replace!=='string'||!edit.find||edit.find===edit.replace
      ||Buffer.byteLength(edit.find)+Buffer.byteLength(edit.replace)>64000)
      throw Error('VIBE59_GAME_ASSET_VISUAL_EDIT_INVALID');
    const original=register(edit.path,edit.expectedSha256);
    const body=original.toString('utf8');
    checkSafeVisualDocument(body,edit.path);
    documents.set(edit.path,body);
    applyExactEdits(root,[{path:edit.path,find:edit.find,replace:edit.replace}],{documents});
    const next=documents.get(edit.path);
    checkSafeVisualDocument(next,edit.path);
    targets.get(edit.path).after=Buffer.from(next);
  }
  let ledger;
  if(binaryReplacements.length){
    const ledgerFile=verifiedFile(repo,'assets/asset-license-ledger.json');
    ledger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
  }
  for(const replace of binaryReplacements){
    if(!allowedBinary.test(replace?.path||'')
      ||!allowedBinary.test(replace?.sourcePath||'')
      ||path.extname(replace.path).toLowerCase()!==path.extname(replace.sourcePath).toLowerCase()
      ||!replace.ledgerId||!replace.assetRole||replace.mappingApproved!==true
      ||!order.selectedTask.approvedAssetMappings?.some(mapping=>mapping.ownerApproved===true
        &&mapping.path===replace.path&&mapping.sourcePath===replace.sourcePath
        &&mapping.ledgerId===replace.ledgerId&&mapping.assetRole===replace.assetRole))
      throw Error('VIBE59_GAME_ASSET_BINDING_NOT_APPROVED');
    if(!(replace.sourcePath.startsWith('assets/shared/')
      ||replace.sourcePath.startsWith('assets/roblox/')
      ||replace.sourcePath.startsWith('web-games/'+gameId+'/assets/')
      ||replace.sourcePath.startsWith('roblox-games/'+gameId+'/assets/')))
      throw Error('VIBE59_GAME_ASSET_SOURCE_LIBRARY_NOT_ALLOWED');
    const original=register(replace.path,replace.expectedSha256);
    const sourceAbs=verifiedFile(repo,replace.sourcePath);
    const replacement=fs.readFileSync(sourceAbs);
    checkOriginal(replacement,replace.sourceSha256);
    findLedgerSource(ledger,gameId,replace.ledgerId,replace.sourcePath,replace.sourceSha256);
    if(replacement.equals(original))throw Error('VIBE59_GAME_ASSET_ALREADY_IDENTICAL');
    targets.get(replace.path).after=replacement;
  }
  const changes=[...targets.entries()];
  for(const [,row] of changes)
    if(!row.after||row.after.equals(row.original))throw Error('VIBE59_GAME_ASSET_NO_CHANGE');
  for(const [,row] of changes)
    if(!fs.readFileSync(row.abs).equals(row.original))
      throw Error('VIBE59_GAME_ASSET_SOURCE_CHANGED_CONCURRENTLY');
  const written=[];
  try{
    for(const [,row] of changes){
      fs.writeFileSync(row.abs,row.after,{flag:'w'});
      written.push(row);
      if(!fs.readFileSync(row.abs).equals(row.after))
        throw Error('VIBE59_GAME_ASSET_WRITE_VERIFICATION_FAILED');
    }
  }catch(error){
    for(const row of written.reverse())fs.writeFileSync(row.abs,row.original,{flag:'w'});
    throw error;
  }
  return Object.freeze({gameId,target,changedAssets:changes.map(([name])=>name),
    assetWrite:true,modelUsed:false,runtimeVerified:false,releaseVerified:false});
}
