import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeRuntimeMediaIndex} from './company-runtime-media-homepage-index.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=v=>String(v??'').trim();
const shaText=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const shaFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const argMap=args=>Object.fromEntries(args.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const i=x.indexOf('=');return[x.slice(2,i),x.slice(i+1)];}));
const platformPath=p=>({ROBLOX:'roblox',UNITY:'unity',FORTNITE_UEFN:'fortnite-uefn',WEB:'web'}[clean(p).toUpperCase()]||'');
const iso=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString();};
const safeId=v=>clean(v).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96);

export function publishRuntimeMedia({
  root=ROOT,gameId,platform,captureFile,sourceRevision,artifactIdentity,runtimeVerification='PASS',
  captureAt=new Date().toISOString(),producer='runtime-media-publisher',authority='verified-runtime-capture',
  recordId='',homepageRepresentative=true,sourceRefs=[],evidenceRefs=[]
}={}){
  const id=clean(gameId),p=clean(platform).toUpperCase(),pp=platformPath(p),when=iso(captureAt);
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id))throw new Error('RUNTIME_MEDIA_GAME_ID_INVALID');
  if(!pp)throw new Error('RUNTIME_MEDIA_PLATFORM_INVALID');
  if(!when)throw new Error('RUNTIME_MEDIA_CAPTURE_AT_INVALID');
  if(!clean(sourceRevision))throw new Error('RUNTIME_MEDIA_SOURCE_REVISION_REQUIRED');
  if(!clean(artifactIdentity))throw new Error('RUNTIME_MEDIA_ARTIFACT_IDENTITY_REQUIRED');
  const source=path.resolve(root,captureFile);
  if(!source.startsWith(path.resolve(root)+path.sep)&&source!==path.resolve(root,captureFile))throw new Error('RUNTIME_MEDIA_CAPTURE_PATH_INVALID');
  if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error('RUNTIME_MEDIA_CAPTURE_FILE_MISSING');
  const ext=path.extname(source).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp'].includes(ext))throw new Error('RUNTIME_MEDIA_CAPTURE_EXTENSION_INVALID');

  const date=when.slice(0,10),year=date.slice(0,4),artifactId=shaText(artifactIdentity).slice(0,16);
  const captureId=safeId(recordId)||`capture-${when.replace(/[-:.TZ]/g,'').slice(0,14)}-${shaText(sourceRevision+artifactIdentity).slice(0,8)}`;
  const mediaRel=`assets/runtime-evidence/${pp}/${id}/${date}/${artifactId}/${captureId}${ext}`;
  const mediaAbs=path.join(root,mediaRel);
  fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
  fs.copyFileSync(source,mediaAbs);
  const mediaSha=shaFile(mediaAbs);
  const rid=safeId(recordId)||`${id}-${pp}-${captureId}`;
  const recordType=`${pp}-runtime-media`;
  const recordRel=`company-records/runtime-media/${year}/${date}/${id}/${recordType}--${rid}.json`;
  const recordAbs=path.join(root,recordRel);
  fs.mkdirSync(path.dirname(recordAbs),{recursive:true});
  const tags=['actual-runtime-capture',homepageRepresentative?'homepage-representative':'runtime-evidence'].filter(Boolean);
  const record={
    schemaVersion:1,
    recordId:rid,
    recordType,
    domain:'runtime-media',
    scope:{type:'GAME',id,gameId:id,platform:p},
    timestamps:{createdAt:when,observedAt:when},
    provenance:{
      producer:clean(producer)||'runtime-media-publisher',
      authority:clean(authority)||'verified-runtime-capture',
      sourceRevision:clean(sourceRevision),
      artifactIdentity:clean(artifactIdentity),
      sourceRefs:[...new Set((sourceRefs||[]).map(clean).filter(Boolean))]
    },
    status:'VERIFIED',
    retentionClass:'RUNTIME_MEDIA',
    data:{
      gameId:id,
      platform:p,
      captureAt:when,
      sourceRevision:clean(sourceRevision),
      artifactIdentity:clean(artifactIdentity),
      sha256:mediaSha,
      runtimeVerification:clean(runtimeVerification)||'PASS',
      mediaPath:mediaRel,
      homepageRepresentative:homepageRepresentative===true,
      actualRuntime:true
    },
    evidenceRefs:[...new Set((evidenceRefs||[]).map(clean).filter(Boolean))],
    relatedFiles:[mediaRel],
    supersedes:[],
    tags:[...new Set(tags)]
  };
  fs.writeFileSync(recordAbs,JSON.stringify(record,null,2)+'\n','utf8');
  writeRuntimeMediaIndex({root,check:false});
  return Object.freeze({mediaPath:mediaRel,recordPath:recordRel,indexPath:'runtime-media-index.json',sha256:mediaSha,recordId:rid});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=argMap(process.argv.slice(2));
  const result=publishRuntimeMedia({
    gameId:args['game-id'],
    platform:args.platform,
    captureFile:args['capture-file'],
    sourceRevision:args['source-revision'],
    artifactIdentity:args['artifact-identity'],
    runtimeVerification:args['runtime-verification']||'PASS',
    captureAt:args['capture-at']||new Date().toISOString(),
    producer:args.producer||'runtime-media-publisher',
    authority:args.authority||'verified-runtime-capture',
    recordId:args['record-id']||'',
    homepageRepresentative:args['homepage-representative']!=='false',
    sourceRefs:args['source-ref']?[args['source-ref']]:[],
    evidenceRefs:args['evidence-ref']?[args['evidence-ref']]:[]
  });
  console.log('RUNTIME_MEDIA_PUBLISH=PASS');
  console.log('RUNTIME_MEDIA_PATH='+result.mediaPath);
  console.log('RUNTIME_MEDIA_RECORD='+result.recordPath);
  console.log('RUNTIME_MEDIA_INDEX='+result.indexPath);
}
