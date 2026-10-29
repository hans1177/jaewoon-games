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
  function walk(dir,depth){
    if(depth>5||found.length>=256)return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(found.length>=256)break;
      const abs=path.join(dir,entry.name);
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){walk(abs,depth+1);continue;}
      if(!entry.isFile()||!/\.(svg|css|png|webp|jpg|jpeg|glb|fbx|ogg|mp3|wav|gz)$/i.test(entry.name))continue;
      const relative=path.relative(root,abs).split(path.sep).join('/');
      found.push({path:relative,bytes:fs.statSync(abs).size,sha256:sha(fs.readFileSync(abs))});
    }
  }
  walk(root,0);
  const missingReferences=[];
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
        if(!resolved.startsWith(root+path.sep)||fs.existsSync(resolved))continue;
        missingReferences.push({referencedBy:path.relative(root,file).split(path.sep).join('/'),
          assetPath:path.relative(root,resolved).split(path.sep).join('/'),
          problem:'MISSING_REFERENCED_ASSET',repair:'REQUIRES_VERIFIED_ROLE_AND_PROVENANCE'});
      }
    }
  }
  return Object.freeze({gameId,target,assets:found,missingReferences,
    sourceWrite:false,runtimeVerified:false,suggestionsRequireProvenance:true});
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
