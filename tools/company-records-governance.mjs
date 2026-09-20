import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CONTRACT_PATH=path.join(ROOT,'company-records/record-contract.json');
const CONTRACT=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
const uniq=a=>[...new Set(a)];
const clean=v=>String(v??'').trim();
const isObject=v=>v&&typeof v==='object'&&!Array.isArray(v);
const isoDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(clean(s))&&!Number.isNaN(Date.parse(clean(s)+'T00:00:00Z'));
const isoDateTime=s=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(clean(s))&&!Number.isNaN(Date.parse(clean(s)));
const kebab=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean(s));
const recordId=s=>/^[a-z0-9][a-z0-9._-]{2,127}$/.test(clean(s));
const repoRel=p=>path.relative(ROOT,path.resolve(ROOT,p)).replaceAll('\\','/');
const existsRel=p=>fs.existsSync(path.join(ROOT,p));
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function isGovernedRecordPath(file=''){
  const rel=repoRel(file);
  return rel.startsWith('company-records/')&&rel.endsWith('.json')&&rel!=='company-records/record-contract.json';
}

function requiredKeys(obj,keys,prefix,errors){
  if(!isObject(obj)){errors.push(`${prefix}:OBJECT_REQUIRED`);return;}
  for(const key of keys)if(!Object.prototype.hasOwnProperty.call(obj,key))errors.push(`${prefix}.${key}:REQUIRED`);
}
function uniqueStringArray(value,name,errors){
  if(!Array.isArray(value)){errors.push(`${name}:ARRAY_REQUIRED`);return;}
  if(value.some(x=>typeof x!=='string'||!x.trim()))errors.push(`${name}:NONEMPTY_STRING_ITEMS_REQUIRED`);
  if(uniq(value).length!==value.length)errors.push(`${name}:DUPLICATES_FORBIDDEN`);
}
function forbiddenSecretKeys(value,trail=[],errors=[]){
  if(Array.isArray(value)){value.forEach((v,i)=>forbiddenSecretKeys(v,[...trail,String(i)],errors));return errors;}
  if(!isObject(value))return errors;
  for(const [key,v] of Object.entries(value)){
    if(/^(?:password|passwd|secret|accessToken|refreshToken|privateKey|cookie|authorization)$/i.test(key)&&clean(v))errors.push(`${[...trail,key].join('.')}:RAW_SECRET_FORBIDDEN`);
    if(/^(?:rawExploitPayload|rawHostilePayload)$/i.test(key)&&clean(v))errors.push(`${[...trail,key].join('.')}:RAW_HOSTILE_PAYLOAD_FORBIDDEN`);
    forbiddenSecretKeys(v,[...trail,key],errors);
  }
  return errors;
}
function looksRepoReference(ref=''){
  const v=clean(ref);
  if(!v||/^https?:\/\//i.test(v)||/^[A-Z0-9_:-]+$/.test(v))return false;
  return v.includes('/')&&!v.includes(' ');
}
function recordPathInfo(rel){
  const m=rel.match(/^company-records\/([^/]+)\/(\d{4})\/(\d{4}-\d{2}-\d{2})\/([^/]+)\/([^/]+)--([^/]+)\.json$/);
  return m?{domain:m[1],year:m[2],date:m[3],scopeId:m[4],recordType:m[5],recordId:m[6]}:null;
}

export function validateCompanyRecord(file,{checkReferences=true,checkMediaHash=true}={}){
  const abs=path.resolve(ROOT,file),rel=repoRel(file),errors=[];
  if(!isGovernedRecordPath(rel))return{file:rel,managed:false,errors};
  const info=recordPathInfo(rel);
  if(!info){errors.push('PATH:CANONICAL_PATTERN_REQUIRED');return{file:rel,managed:true,errors};}
  if(!CONTRACT.enums.domains.includes(info.domain))errors.push('PATH:DOMAIN_INVALID');
  if(info.year!==info.date.slice(0,4)||!isoDate(info.date))errors.push('PATH:DATE_INVALID');
  if(!kebab(info.scopeId))errors.push('PATH:SCOPE_ID_KEBAB_CASE_REQUIRED');
  if(!kebab(info.recordType))errors.push('PATH:RECORD_TYPE_KEBAB_CASE_REQUIRED');
  if(!recordId(info.recordId))errors.push('PATH:RECORD_ID_INVALID');
  let row;
  try{row=JSON.parse(fs.readFileSync(abs,'utf8'));}catch{errors.push('JSON:INVALID');return{file:rel,managed:true,errors};}
  requiredKeys(row,CONTRACT.requiredTopLevel,'record',errors);
  requiredKeys(row.scope,CONTRACT.requiredNested.scope,'scope',errors);
  requiredKeys(row.timestamps,CONTRACT.requiredNested.timestamps,'timestamps',errors);
  requiredKeys(row.provenance,CONTRACT.requiredNested.provenance,'provenance',errors);
  if(row.schemaVersion!==CONTRACT.schemaVersion)errors.push('record.schemaVersion:MISMATCH');
  if(clean(row.recordId)!==info.recordId)errors.push('record.recordId:FILENAME_MISMATCH');
  if(clean(row.recordType)!==info.recordType)errors.push('record.recordType:FILENAME_MISMATCH');
  if(clean(row.domain)!==info.domain)errors.push('record.domain:PATH_MISMATCH');
  if(clean(row.scope?.id)!==info.scopeId)errors.push('scope.id:PATH_MISMATCH');
  if(!CONTRACT.enums.scopeTypes.includes(clean(row.scope?.type).toUpperCase()))errors.push('scope.type:INVALID');
  if(!CONTRACT.enums.platforms.includes(clean(row.scope?.platform).toUpperCase()))errors.push('scope.platform:INVALID');
  if(clean(row.scope?.type).toUpperCase()==='GAME'&&clean(row.scope?.gameId)!==info.scopeId)errors.push('scope.gameId:GAME_SCOPE_MISMATCH');
  if(!CONTRACT.enums.statuses.includes(clean(row.status).toUpperCase()))errors.push('record.status:INVALID');
  if(!CONTRACT.enums.retentionClasses.includes(clean(row.retentionClass).toUpperCase()))errors.push('record.retentionClass:INVALID');
  if(!isObject(row.data))errors.push('record.data:OBJECT_REQUIRED');
  if(!isoDateTime(row.timestamps?.createdAt))errors.push('timestamps.createdAt:ISO_UTC_REQUIRED');
  if(clean(row.timestamps?.createdAt).slice(0,10)!==info.date)errors.push('timestamps.createdAt:PATH_DATE_MISMATCH');
  if(row.timestamps?.observedAt!==null&&row.timestamps?.observedAt!==''&&!isoDateTime(row.timestamps?.observedAt))errors.push('timestamps.observedAt:ISO_UTC_OR_NULL_REQUIRED');
  if(clean(row.status).toUpperCase()==='VERIFIED'&&!isoDateTime(row.timestamps?.observedAt))errors.push('timestamps.observedAt:VERIFIED_REQUIRED');
  if(!clean(row.provenance?.producer))errors.push('provenance.producer:REQUIRED');
  if(!clean(row.provenance?.authority))errors.push('provenance.authority:REQUIRED');
  if(!Array.isArray(row.provenance?.sourceRefs))errors.push('provenance.sourceRefs:ARRAY_REQUIRED');
  for(const key of ['evidenceRefs','relatedFiles','supersedes','tags'])uniqueStringArray(row[key],`record.${key}`,errors);
  forbiddenSecretKeys(row,[],errors);
  const artifactBound=info.domain==='release'||info.domain==='runtime-media'||row.data?.artifactBound===true||row.data?.published===true;
  if(artifactBound&&!clean(row.provenance?.sourceRevision))errors.push('provenance.sourceRevision:ARTIFACT_BOUND_REQUIRED');
  if(artifactBound&&!clean(row.provenance?.artifactIdentity))errors.push('provenance.artifactIdentity:ARTIFACT_BOUND_REQUIRED');
  if(info.domain==='runtime-media'){
    for(const key of CONTRACT.runtimeMediaManifestDataRequired)if(!clean(row.data?.[key]))errors.push(`data.${key}:RUNTIME_MEDIA_REQUIRED`);
    if(clean(row.data?.gameId)!==clean(row.scope?.gameId))errors.push('data.gameId:SCOPE_MISMATCH');
    if(clean(row.data?.platform).toUpperCase()!==clean(row.scope?.platform).toUpperCase())errors.push('data.platform:SCOPE_MISMATCH');
    if(!/^[0-9a-f]{64}$/.test(clean(row.data?.sha256)))errors.push('data.sha256:INVALID');
    const media=clean(row.data?.mediaPath);
    const mediaKind=clean(row.data?.mediaKind).toUpperCase();
    const motionFocus=clean(row.data?.motionFocus).toUpperCase();
    const allowedMotionFocus=['ATTACK_HIT_IMPACT','ENEMY_ATTACK_OR_BEHAVIOR','ENEMY_DEATH_OR_REACTION','BOSS_CORE_PATTERN','GATHERING_ACTION','CRAFTING_ACTION','SKILL_OR_ULTIMATE','PLAYER_LOCOMOTION','ENVIRONMENT_REACTION','COOP_OR_MULTIPLAYER_INTERACTION'];
    if(mediaKind&&!['STILL','MOTION'].includes(mediaKind))errors.push('data.mediaKind:INVALID');
    if(mediaKind==='STILL'&&!/\.(?:png|jpe?g|webp)$/i.test(media))errors.push('data.mediaPath:STILL_FORMAT_INVALID');
    if(mediaKind==='MOTION'){
      if(!/\.(?:mp4|webm|gif|webp)$/i.test(media))errors.push('data.mediaPath:MOTION_FORMAT_INVALID');
      if(!allowedMotionFocus.includes(motionFocus))errors.push('data.motionFocus:CORE_MOTION_REQUIRED');
    }
    if(media&&!/^assets\/runtime-evidence\/(?:roblox|unity|fortnite-uefn|web)\//.test(media))errors.push('data.mediaPath:CANONICAL_RUNTIME_MEDIA_ROOT_REQUIRED');
    if(media&&checkMediaHash){
      if(!existsRel(media))errors.push('data.mediaPath:MISSING');
      else if(sha256(path.join(ROOT,media))!==clean(row.data?.sha256))errors.push('data.sha256:MEDIA_HASH_MISMATCH');
    }
  }
  if(checkReferences){
    for(const [field,refs] of [['evidenceRefs',row.evidenceRefs||[]],['relatedFiles',row.relatedFiles||[]],['supersedes',row.supersedes||[]],['sourceRefs',row.provenance?.sourceRefs||[]]]){
      for(const ref of refs)if(looksRepoReference(ref)&&!existsRel(ref))errors.push(`${field}:BROKEN_REF:${ref}`);
    }
  }
  return{file:rel,managed:true,recordId:row.recordId,errors};
}

export function scanCompanyRecords(){
  const root=path.join(ROOT,'company-records'),files=[];
  const walk=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&p.endsWith('.json')&&repoRel(p)!=='company-records/record-contract.json')files.push(p);}};
  walk(root);
  const results=files.map(file=>validateCompanyRecord(file)),ids=new Map(),errors=[],warnings=[],mediaRefs=new Set();
  const statusCounts={},retentionCounts={};
  for(const result of results){
    if(result.recordId){if(ids.has(result.recordId))errors.push(`DUPLICATE_RECORD_ID:${result.recordId}:${ids.get(result.recordId)}:${result.file}`);else ids.set(result.recordId,result.file);}
    for(const err of result.errors)errors.push(`${result.file}:${err}`);
    try{
      const row=JSON.parse(fs.readFileSync(path.join(ROOT,result.file),'utf8'));
      const status=clean(row.status).toUpperCase(),retention=clean(row.retentionClass).toUpperCase();
      statusCounts[status]=(statusCounts[status]||0)+1;
      retentionCounts[retention]=(retentionCounts[retention]||0)+1;
      if(clean(row.domain)==='runtime-media'&&clean(row.data?.mediaPath))mediaRefs.add(clean(row.data.mediaPath));
      if(status==='DRAFT'&&isoDateTime(row.timestamps?.createdAt)){
        const ageDays=(Date.now()-Date.parse(row.timestamps.createdAt))/86400000;
        if(ageDays>14)warnings.push(`STALE_DRAFT:${result.file}:AGE_DAYS=${Math.floor(ageDays)}`);
      }
    }catch{}
  }
  const mediaRoot=path.join(ROOT,'assets/runtime-evidence'),mediaFiles=[];
  const walkMedia=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walkMedia(p);else if(entry.isFile()&&!entry.name.startsWith('.'))mediaFiles.push(repoRel(p));}};
  walkMedia(mediaRoot);
  for(const media of mediaFiles)if(!mediaRefs.has(media))errors.push(`ORPHAN_RUNTIME_MEDIA:${media}`);
  for(const ref of mediaRefs)if(!existsRel(ref))errors.push(`RUNTIME_MEDIA_MANIFEST_MISSING_FILE:${ref}`);
  return{files:results.length,mediaFiles:mediaFiles.length,errors,warnings,statusCounts,retentionCounts,results};
}

export function changedGovernedFiles(base='HEAD^',head='HEAD'){
  let out='';
  try{out=execFileSync('git',['diff','--name-only',base,head,'--','company-records','assets/runtime-evidence'],{cwd:ROOT,encoding:'utf8'});}catch{return[];}
  return out.split(/\r?\n/).map(clean).filter(Boolean).filter(p=>isGovernedRecordPath(p));
}

function main(){
  const args=process.argv.slice(2);
  const changedArg=args.find(x=>x.startsWith('--changed-from='));
  let files=[];
  if(args.includes('--scan')||args.includes('--summary')){
    const report=scanCompanyRecords();
    console.log(`COMPANY_RECORDS_FILES=${report.files}`);
    console.log(`COMPANY_RECORDS_RUNTIME_MEDIA_FILES=${report.mediaFiles}`);
    console.log(`COMPANY_RECORDS_STATUS_COUNTS=${JSON.stringify(report.statusCounts)}`);
    console.log(`COMPANY_RECORDS_RETENTION_COUNTS=${JSON.stringify(report.retentionCounts)}`);
    report.warnings.forEach(x=>console.warn(x));
    if(report.errors.length){report.errors.forEach(x=>console.error(x));process.exit(1);}
    console.log(args.includes('--summary')?'COMPANY_RECORDS_HYGIENE_SUMMARY=PASS':'COMPANY_RECORDS_GOVERNANCE=PASS');
    return;
  }
  if(changedArg){
    const base=changedArg.slice('--changed-from='.length);
    files=changedGovernedFiles(base,'HEAD');
  }else{
    files=args.filter(x=>!x.startsWith('--')).filter(isGovernedRecordPath);
  }
  const results=files.map(file=>validateCompanyRecord(file));
  const errors=results.flatMap(r=>r.errors.map(e=>`${r.file}:${e}`));
  console.log(`COMPANY_RECORDS_CHANGED_FILES=${files.length}`);
  if(errors.length){errors.forEach(x=>console.error(x));process.exit(1);}
  console.log('COMPANY_RECORDS_CHANGED_GOVERNANCE=PASS');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
