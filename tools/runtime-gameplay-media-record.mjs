import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeHomepageRuntimeMediaIndex} from './homepage-runtime-media-sync.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=value=>String(value??'').trim();
const arg=name=>{const prefix='--'+name+'=';const hit=process.argv.slice(2).find(x=>x.startsWith(prefix));return hit?hit.slice(prefix.length):'';};
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const slug=value=>clean(value).toLowerCase().replace(/^sha256:/,'').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'artifact';
const MOTION_FOCUS=[
  'ATTACK_HIT_IMPACT','ENEMY_ATTACK_OR_BEHAVIOR','ENEMY_DEATH_OR_REACTION','BOSS_CORE_PATTERN',
  'GATHERING_ACTION','CRAFTING_ACTION','SKILL_OR_ULTIMATE','PLAYER_LOCOMOTION',
  'ENVIRONMENT_REACTION','COOP_OR_MULTIPLAYER_INTERACTION'
];

export function recordRuntimeGameplayMedia({
  gameId,platform,sourceRevision,artifactIdentity,input,mediaKind='STILL',motionFocus='',
  producer='RUNTIME_QA',authority='ACTUAL_RUNTIME',captureAt=new Date().toISOString(),updateHomepageIndex=true
}={}){
  gameId=clean(gameId);platform=clean(platform).toUpperCase();sourceRevision=clean(sourceRevision);artifactIdentity=clean(artifactIdentity);
  input=path.resolve(ROOT,clean(input));mediaKind=clean(mediaKind).toUpperCase();motionFocus=clean(motionFocus).toUpperCase();
  if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(gameId))throw new Error('MEDIA_GAME_ID_INVALID');
  if(!['UNITY','ROBLOX','FORTNITE_UEFN'].includes(platform))throw new Error('MEDIA_PLATFORM_INVALID');
  if(!/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i.test(sourceRevision))throw new Error('MEDIA_SOURCE_REVISION_INVALID');
  if(!artifactIdentity)throw new Error('MEDIA_ARTIFACT_IDENTITY_REQUIRED');
  if(!fs.existsSync(input)||!fs.statSync(input).isFile()||fs.statSync(input).size<=0)throw new Error('MEDIA_INPUT_MISSING');
  if(!['STILL','MOTION'].includes(mediaKind))throw new Error('MEDIA_KIND_INVALID');
  const ext=path.extname(input).toLowerCase();
  if(mediaKind==='STILL'&&!['.png','.jpg','.jpeg','.webp'].includes(ext))throw new Error('MEDIA_STILL_FORMAT_INVALID');
  if(mediaKind==='MOTION'&&!['.mp4','.webm','.gif','.webp'].includes(ext))throw new Error('MEDIA_MOTION_FORMAT_INVALID');
  if(mediaKind==='MOTION'&&!MOTION_FOCUS.includes(motionFocus))throw new Error('MEDIA_MOTION_FOCUS_REQUIRED');
  const captureDate=new Date(captureAt);
  if(Number.isNaN(captureDate.getTime()))throw new Error('MEDIA_CAPTURE_AT_INVALID');
  const createdAt=new Date().toISOString(),date=createdAt.slice(0,10),hash=sha256(input);
  const platformDir=platform==='FORTNITE_UEFN'?'fortnite-uefn':platform.toLowerCase();
  const artifactDir=slug(artifactIdentity),focus=mediaKind==='MOTION'?slug(motionFocus):'still';
  const captureId=`${mediaKind.toLowerCase()}-${focus}-${hash.slice(0,12)}`;
  const mediaRel=`assets/runtime-evidence/${platformDir}/${gameId}/${date}/${artifactDir}/${captureId}${ext}`;
  const mediaAbs=path.join(ROOT,mediaRel);
  fs.mkdirSync(path.dirname(mediaAbs),{recursive:true});
  fs.copyFileSync(input,mediaAbs);
  const recordId=`${platform.toLowerCase().replaceAll('_','-')}-${gameId}-${captureId}`;
  const recordType=`${platform.toLowerCase().replaceAll('_','-')}-runtime-media`;
  const recordRel=`company-records/runtime-media/${date.slice(0,4)}/${date}/${gameId}/${recordType}--${recordId}.json`;
  const record={
    schemaVersion:1,recordId,recordType,domain:'runtime-media',
    scope:{type:'GAME',id:gameId,gameId,platform},
    timestamps:{createdAt,observedAt:captureDate.toISOString()},
    provenance:{producer:clean(producer),authority:clean(authority),sourceRevision:sourceRevision.toLowerCase(),artifactIdentity,sourceRefs:[]},
    status:'VERIFIED',retentionClass:'RUNTIME_MEDIA',
    data:{
      gameId,platform,captureAt:captureDate.toISOString(),sourceRevision:sourceRevision.toLowerCase(),artifactIdentity,
      sha256:hash,runtimeVerification:'PASS',mediaKind,motionFocus:mediaKind==='MOTION'?motionFocus:null,
      mediaPath:mediaRel
    },
    evidenceRefs:[],relatedFiles:[mediaRel],supersedes:[],
    tags:['gameplay','runtime',mediaKind==='MOTION'?'core-motion':'still']
  };
  fs.mkdirSync(path.dirname(path.join(ROOT,recordRel)),{recursive:true});
  fs.writeFileSync(path.join(ROOT,recordRel),JSON.stringify(record,null,2)+'\n');
  if(updateHomepageIndex)writeHomepageRuntimeMediaIndex();
  return{recordPath:recordRel,mediaPath:mediaRel,record};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=recordRuntimeGameplayMedia({
    gameId:arg('game-id'),platform:arg('platform'),sourceRevision:arg('source-revision'),artifactIdentity:arg('artifact-identity'),
    input:arg('input'),mediaKind:arg('media-kind')||'STILL',motionFocus:arg('motion-focus'),
    producer:arg('producer')||'RUNTIME_QA',authority:arg('authority')||'ACTUAL_RUNTIME',captureAt:arg('capture-at')||new Date().toISOString()
  });
  console.log(`RUNTIME_GAMEPLAY_MEDIA=PASS RECORD=${result.recordPath} MEDIA=${result.mediaPath}`);
}
