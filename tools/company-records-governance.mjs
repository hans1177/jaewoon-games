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


const CENTRAL_POLICY_REL='company-learning/platform-release-roadmap.json';
const CENTRAL_ARCHITECTURE_REL='company-learning/company-architecture-map.json';
const CENTRAL_LOG_MAP_REL='company-learning/company-log-map.json';
const CENTRAL_SECURITY_REL='company-learning/security-immune-system.json';
const COMPANY_ASSET_LIBRARY_REL='company-asset-library.json';
const COMPANY_ASSET_LIBRARY_BUDGET=Object.freeze({
  hardMaxUtf8Bytes:32*1024*1024,
  maxGrowthUtf8Bytes:8*1024*1024
});
const CENTRAL_SCAN_ROOTS=Object.freeze(['qa','tools','.github','assets']);
const CENTRAL_COMPANION_DOCUMENTS=Object.freeze({
  architecture:Object.freeze({
    sourcePath:CENTRAL_ARCHITECTURE_REL,
    aliases:Object.freeze(['architecture','architectureMap']),
    pinnedCorePaths:Object.freeze(['version','authority','sourceOfTruth','centralPolicy','logMap','securityPolicy','purpose','requiredForAllWorkers','branches','authorityOrder','sharedContextLoadOrder','workerSynchronization','centralArchitectureProjection'])
  }),
  logMap:Object.freeze({
    sourcePath:CENTRAL_LOG_MAP_REL,
    aliases:Object.freeze(['logMap']),
    pinnedCorePaths:Object.freeze(['version','authority','sourceOfTruth','centralPolicy','architectureMap','securityPolicy','purpose','requiredForAllWorkers','canonicalCorrelationKeys','logChannels','requiredMarkers','workerContextLogContract','orchestrationLogContract'])
  })
});
const CENTRAL_TEXT_EXTENSIONS=new Set(['.js','.mjs','.cjs','.json','.yml','.yaml','.md']);
const CENTRAL_DOCUMENT_BUDGETS=Object.freeze({
  policy:Object.freeze({sourcePath:CENTRAL_POLICY_REL,hardMaxUtf8Bytes:null,maxGrowthUtf8Bytes:12000}),
  architecture:Object.freeze({sourcePath:CENTRAL_ARCHITECTURE_REL,hardMaxUtf8Bytes:320000,maxGrowthUtf8Bytes:8000}),
  logMap:Object.freeze({sourcePath:CENTRAL_LOG_MAP_REL,hardMaxUtf8Bytes:140000,maxGrowthUtf8Bytes:4000}),
  security:Object.freeze({sourcePath:CENTRAL_SECURITY_REL,hardMaxUtf8Bytes:70000,maxGrowthUtf8Bytes:4000})
});
const cloneJson=value=>JSON.parse(JSON.stringify(value));
const utf8Bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n','utf8');
const readTextRel=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJsonRel=rel=>JSON.parse(readTextRel(rel));
const readCentralRoadmap=()=>readJsonRel(CENTRAL_POLICY_REL);
const escapeRegExp=value=>String(value??'').replace(/[|\\{}()[\]^$+*?.-]/g,'\\$&');

function pathValue(root,dotted=''){
  let current=root;
  for(const key of clean(dotted).split('.').filter(Boolean)){
    if(!current||typeof current!=='object'||!Object.prototype.hasOwnProperty.call(current,key))return undefined;
    current=current[key];
  }
  return current;
}
function deletePathValue(root,dotted=''){
  const parts=clean(dotted).split('.').filter(Boolean),last=parts.pop();
  if(!last)return false;
  let current=root;
  for(const key of parts){
    if(!current||typeof current!=='object'||!Object.prototype.hasOwnProperty.call(current,key))return false;
    current=current[key];
  }
  if(!current||typeof current!=='object'||!Object.prototype.hasOwnProperty.call(current,last))return false;
  delete current[last];
  return true;
}
export function extractChangeRecordReferences(text=''){
  const refs=new Set(),source=String(text||'');
  for(const match of source.matchAll(/changeRecord(?:\?\.|\.)([A-Za-z0-9_]+)/g))refs.add(match[1]);
  for(const match of source.matchAll(/changeRecord\[['"]([^'"]+)['"]\]/g))refs.add(match[1]);
  return [...refs].sort();
}

export function extractCentralPolicyReferences(text=''){
  const refs=new Set(),source=String(text||'');
  const add=value=>{
    const path=clean(value).replace(/^\.+|\.+$/g,'');
    if(path&&/^[A-Za-z0-9_.-]+$/.test(path))refs.add(path);
  };
  for(const match of source.matchAll(/(?:roadmap|policy|central)(?:\?\.|\.)([A-Za-z0-9_]+(?:(?:\?\.|\.)[A-Za-z0-9_]+)*)/g)){
    add(match[1].replaceAll('?.','.'));
  }
  for(const match of source.matchAll(/platform-release-roadmap\.json#([A-Za-z0-9_.-]+)/g))add(match[1]);
  for(const key of extractChangeRecordReferences(source))add('changeRecord.'+key);
  return [...refs].sort();
}

export function extractCentralDocumentReferences(text='',{aliases=[],filename=''}={}){
  const refs=new Set(),source=String(text||'');
  const add=value=>{
    const refPath=clean(value).replace(/^\.+|\.+$/g,'');
    if(refPath&&/^[A-Za-z0-9_.-]+$/.test(refPath))refs.add(refPath);
  };
  for(const alias of aliases.map(clean).filter(Boolean)){
    const escaped=escapeRegExp(alias);
    for(const match of source.matchAll(new RegExp('\\b'+escaped+'(?:\\?\\.|\\.)([A-Za-z0-9_]+(?:(?:\\?\\.|\\.)[A-Za-z0-9_]+)*)','g'))){
      add(match[1].replaceAll('?.','.'));
    }
    for(const match of source.matchAll(new RegExp('\\b'+escaped+'(?:\\?\\.)?\\[\\s*[\\\'"]([^\\\'"]+)[\\\'"]\\s*\\]','g')))add(match[1]);
    for(const match of source.matchAll(new RegExp('\\{([^{}]+)\\}\\s*=\\s*'+escaped+'\\b','g'))){
      for(const token of match[1].split(',')){
        const key=clean(token).split(':')[0].split('=')[0].trim();
        if(/^[A-Za-z0-9_-]+$/.test(key))add(key);
      }
    }
    const dynamic=new RegExp('\\b'+escaped+'(?:\\?\\.)?\\[\\s*(?![\\\'"])','g');
    if(dynamic.test(source))refs.add('*');
  }
  if(clean(filename)){
    const escapedFile=escapeRegExp(clean(filename));
    for(const match of source.matchAll(new RegExp(escapedFile+'#([A-Za-z0-9_.-]+)','g')))add(match[1]);
  }
  return [...refs].sort();
}
function walkCentralReferenceFiles(rootDir,out=[]){
  if(!fs.existsSync(rootDir))return out;
  for(const entry of fs.readdirSync(rootDir,{withFileTypes:true})){
    const file=path.join(rootDir,entry.name);
    if(entry.isDirectory())walkCentralReferenceFiles(file,out);
    else if(entry.isFile()&&CENTRAL_TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))out.push(file);
  }
  return out;
}
export function findProtectedCentralChangeRecordKeys({roots=CENTRAL_SCAN_ROOTS}={}){
  const refs=new Map();
  for(const root of roots){
    const abs=path.join(ROOT,root);
    for(const file of walkCentralReferenceFiles(abs)){
      let source='';
      try{source=fs.readFileSync(file,'utf8');}catch{continue;}
      for(const key of extractChangeRecordReferences(source)){
        if(!refs.has(key))refs.set(key,[]);
        refs.get(key).push(repoRel(file));
      }
    }
  }
  return Object.freeze(Object.fromEntries(
    [...refs.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,files])=>[key,Object.freeze(uniq(files).sort())])
  ));
}

export function findCurrentCentralPolicyReferences({roots=CENTRAL_SCAN_ROOTS}={}){
  const refs=new Map();
  const centralFiles=new Set([
    'company-learning/platform-release-roadmap.json',
    'company-learning/company-log-map.json',
    'company-learning/company-architecture-map.json',
    CENTRAL_SECURITY_REL
  ]);
  for(const root of roots){
    const abs=path.join(ROOT,root);
    for(const file of walkCentralReferenceFiles(abs)){
      const rel=repoRel(file);
      if(centralFiles.has(rel))continue;
      let source='';
      try{source=fs.readFileSync(file,'utf8');}catch{continue;}
      for(const ref of extractCentralPolicyReferences(source)){
        if(!refs.has(ref))refs.set(ref,[]);
        refs.get(ref).push(rel);
      }
    }
  }
  return Object.freeze(Object.fromEntries(
    [...refs.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,files])=>[key,Object.freeze(uniq(files).sort())])
  ));
}

export function findCurrentCompanionDocumentReferences({roots=CENTRAL_SCAN_ROOTS}={}){
  const refsByDocument=new Map(Object.keys(CENTRAL_COMPANION_DOCUMENTS).map(key=>[key,new Map()]));
  const centralFiles=new Set([
    CENTRAL_POLICY_REL,
    CENTRAL_ARCHITECTURE_REL,
    CENTRAL_LOG_MAP_REL,
    CENTRAL_SECURITY_REL
  ]);
  for(const root of roots){
    const abs=path.join(ROOT,root);
    for(const file of walkCentralReferenceFiles(abs)){
      const rel=repoRel(file);
      if(centralFiles.has(rel))continue;
      let source='';
      try{source=fs.readFileSync(file,'utf8');}catch{continue;}
      for(const [documentKey,config] of Object.entries(CENTRAL_COMPANION_DOCUMENTS)){
        for(const ref of extractCentralDocumentReferences(source,{aliases:config.aliases,filename:path.basename(config.sourcePath)})){
          const refs=refsByDocument.get(documentKey);
          if(!refs.has(ref))refs.set(ref,[]);
          refs.get(ref).push(rel);
        }
      }
    }
  }
  return Object.freeze(Object.fromEntries(
    [...refsByDocument.entries()].map(([documentKey,refs])=>[
      documentKey,
      Object.freeze(Object.fromEntries(
        [...refs.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,files])=>[key,Object.freeze(uniq(files).sort())])
      ))
    ])
  ));
}
function centralPathIsReferenced(pathKey='',referenceMap={}){
  const target=clean(pathKey);
  if(!target)return false;
  const refs=Object.keys(referenceMap||{});
  if(refs.includes('*'))return true;
  return refs.some(ref=>
    ref===target||ref.startsWith(target+'.')||target.startsWith(ref+'.')
  );
}
function centralPathPinned(pathKey='',retention={}){
  const configured=Array.isArray(retention.pinnedCorePaths)?retention.pinnedCorePaths.filter(Boolean):[];
  const pins=configured.length?configured:[
    'centralDocumentRetention',
    'ownerCanonicalRules',
    'minimumNecessaryProcedurePolicy'
  ];
  return pins.some(prefix=>pathKey===prefix||pathKey.startsWith(prefix+'.'));
}

export function discoverCentralArchiveCandidates({roadmap=null,minBytes=512,limit=20}={}){
  const current=roadmap||readCentralRoadmap();
  const retention=current.centralDocumentRetention||{};
  const alreadyArchived=new Set(Array.isArray(retention.historicalArchiveSelectors)?retention.historicalArchiveSelectors:[]);
  const protectedPrefixes=[
    'centralDocumentRetention',
    'changeRecord',
    'narrativeStorytellingContract.runtimeActorIntelligence'
  ];
  const pattern=/(?:history|historical|incident|verification|implementationEvidence|observation|diagnostic|telemetry|audit|latest(?:Run|Qa|Evidence|Observation|Diagnostic))/i;
  const rows=[];
  const walk=(value,parts=[])=>{
    if(!value||typeof value!=='object')return;
    for(const [key,next] of Object.entries(value)){
      if(!next||typeof next!=='object')continue;
      const pathKey=[...parts,key].join('.');
      if(protectedPrefixes.some(prefix=>pathKey===prefix||pathKey.startsWith(prefix+'.')))continue;
      const size=utf8Bytes(JSON.stringify(next));
      if(size>=minBytes&&pattern.test(key)&&!alreadyArchived.has(pathKey)){
        rows.push(Object.freeze({path:pathKey,utf8Bytes:size,key,reason:'HISTORICAL_SHAPE_REVIEW_REQUIRED'}));
      }
      walk(next,[...parts,key]);
    }
  };
  walk(current,[]);
  rows.sort((a,b)=>b.utf8Bytes-a.utf8Bytes||a.path.localeCompare(b.path));
  return Object.freeze(rows.slice(0,Math.max(1,Number(limit)||20)));
}

export function evaluateCentralDocumentBudget({
  documentKey='',
  sourcePath='',
  currentBytes=0,
  baseBytes=null,
  hardMaxUtf8Bytes=0,
  maxGrowthUtf8Bytes=0
}={}){
  const key=clean(documentKey)||'unknown';
  const marker=key.replace(/[^A-Za-z0-9]+/g,'_').toUpperCase();
  const current=Math.max(0,Number(currentBytes)||0);
  const base=baseBytes===null||baseBytes===undefined?null:Math.max(0,Number(baseBytes)||0);
  const hardMax=Math.max(0,Number(hardMaxUtf8Bytes)||0);
  const maxGrowth=Math.max(0,Number(maxGrowthUtf8Bytes)||0);
  const growth=base===null?null:current-base;
  const errors=[];
  if(hardMax>0&&current>hardMax)errors.push('CENTRAL_DOCUMENT_'+marker+'_HARD_LIMIT_EXCEEDED:'+current+'>'+hardMax);
  if(growth!==null&&growth>maxGrowth)errors.push('CENTRAL_DOCUMENT_'+marker+'_GROWTH_LIMIT_EXCEEDED:'+growth+'>'+maxGrowth);
  return Object.freeze({
    documentKey:key,
    sourcePath:clean(sourcePath),
    utf8Bytes:current,
    baseUtf8Bytes:base,
    growthUtf8Bytes:growth,
    hardMaxUtf8Bytes:hardMax,
    maxGrowthUtf8Bytes:maxGrowth,
    headroomUtf8Bytes:hardMax>0?hardMax-current:null,
    errors:Object.freeze(errors)
  });
}

export function inspectCentralDocumentBudgets({baseRevision=''}={}){
  const base=clean(baseRevision);
  const documents={};
  const errors=[];
  for(const [documentKey,budget] of Object.entries(CENTRAL_DOCUMENT_BUDGETS)){
    const currentText=readTextRel(budget.sourcePath);
    const currentJson=JSON.parse(currentText);
    const hardMax=documentKey==='policy'
      ?Number(currentJson?.centralDocumentRetention?.maxUtf8Bytes||1120000)
      :Number(budget.hardMaxUtf8Bytes||0);
    let baseBytes=null;
    if(base&& !/^0+$/.test(base)){
      if(base==='HEAD'){
        baseBytes=utf8Bytes(currentText);
      }else{
        try{
          const prior=execFileSync('git',['show',base+':'+budget.sourcePath],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
          baseBytes=utf8Bytes(prior);
        }catch{
          errors.push('CENTRAL_DOCUMENT_BASE_READ_FAILED:'+documentKey+':'+base);
        }
      }
    }
    const row=evaluateCentralDocumentBudget({
      documentKey,
      sourcePath:budget.sourcePath,
      currentBytes:utf8Bytes(currentText),
      baseBytes,
      hardMaxUtf8Bytes:hardMax,
      maxGrowthUtf8Bytes:budget.maxGrowthUtf8Bytes
    });
    documents[documentKey]=row;
    errors.push(...row.errors);
  }
  return Object.freeze({
    baseRevision:base||null,
    documents:Object.freeze(documents),
    errors:Object.freeze(uniq(errors))
  });
}

export function inspectCompanyAssetLibraryBudget({baseRevision=''}={}){
  const base=clean(baseRevision);
  const currentText=readTextRel(COMPANY_ASSET_LIBRARY_REL);
  JSON.parse(currentText);
  const currentBytes=utf8Bytes(currentText);
  let baseBytes=null;
  const errors=[];
  if(base&&!/^0+$/.test(base)){
    if(base==='HEAD'){
      baseBytes=currentBytes;
    }else{
      try{
        const prior=execFileSync('git',['show',base+':'+COMPANY_ASSET_LIBRARY_REL],{
          cwd:ROOT,encoding:'utf8',maxBuffer:40*1024*1024
        });
        baseBytes=utf8Bytes(prior);
      }catch{
        errors.push('COMPANY_ASSET_LIBRARY_BASE_READ_FAILED:'+base);
      }
    }
  }
  const growth=baseBytes===null?null:currentBytes-baseBytes;
  if(currentBytes>COMPANY_ASSET_LIBRARY_BUDGET.hardMaxUtf8Bytes){
    errors.push('COMPANY_ASSET_LIBRARY_HARD_LIMIT_EXCEEDED:'+currentBytes+'>'+COMPANY_ASSET_LIBRARY_BUDGET.hardMaxUtf8Bytes);
  }
  if(growth!==null&&growth>COMPANY_ASSET_LIBRARY_BUDGET.maxGrowthUtf8Bytes){
    errors.push('COMPANY_ASSET_LIBRARY_GROWTH_LIMIT_EXCEEDED:'+growth+'>'+COMPANY_ASSET_LIBRARY_BUDGET.maxGrowthUtf8Bytes);
  }
  return Object.freeze({
    sourcePath:COMPANY_ASSET_LIBRARY_REL,
    utf8Bytes:currentBytes,
    baseUtf8Bytes:baseBytes,
    growthUtf8Bytes:growth,
    hardMaxUtf8Bytes:COMPANY_ASSET_LIBRARY_BUDGET.hardMaxUtf8Bytes,
    maxGrowthUtf8Bytes:COMPANY_ASSET_LIBRARY_BUDGET.maxGrowthUtf8Bytes,
    headroomUtf8Bytes:COMPANY_ASSET_LIBRARY_BUDGET.hardMaxUtf8Bytes-currentBytes,
    errors:Object.freeze(errors)
  });
}

export function inspectCentralDocument({roadmap=null,protectedReferences=null}={}){
  const current=roadmap||readCentralRoadmap();
  const retention=current.centralDocumentRetention||{};
  const maxUtf8Bytes=Number(retention.maxUtf8Bytes||1100000);
  const softTargetUtf8Bytes=Number(retention.softTargetUtf8Bytes||Math.min(maxUtf8Bytes,1080000));
  const protectedMap=protectedReferences||findProtectedCentralChangeRecordKeys();
  const changeRecord=isObject(current.changeRecord)?current.changeRecord:{};
  const missingProtectedChangeRecords=Object.keys(protectedMap).filter(key=>!Object.prototype.hasOwnProperty.call(changeRecord,key));
  const content=JSON.stringify(current,null,2)+'\n';
  const size=utf8Bytes(content);
  const latestArchive=clean(retention.latestArchiveRecord);
  const errors=[];
  if(size>maxUtf8Bytes)errors.push('CENTRAL_POLICY_HARD_LIMIT_EXCEEDED:'+size+'>'+maxUtf8Bytes);
  if(retention.softTargetEnforced===true&&size>softTargetUtf8Bytes)errors.push('CENTRAL_POLICY_SOFT_TARGET_EXCEEDED:'+size+'>'+softTargetUtf8Bytes);
  if(Number(retention.minimumHeadroomBytes||0)>0&&(maxUtf8Bytes-size)<Number(retention.minimumHeadroomBytes))errors.push('CENTRAL_POLICY_MINIMUM_HEADROOM_VIOLATION:'+(maxUtf8Bytes-size)+'<'+Number(retention.minimumHeadroomBytes));
  if(missingProtectedChangeRecords.length)errors.push('CENTRAL_POLICY_REFERENCED_CHANGE_RECORD_MISSING:'+missingProtectedChangeRecords.join(','));
  if(latestArchive&&!existsRel(latestArchive))errors.push('CENTRAL_POLICY_ARCHIVE_RECORD_MISSING:'+latestArchive);
  return Object.freeze({
    path:CENTRAL_POLICY_REL,
    utf8Bytes:size,
    maxUtf8Bytes,
    softTargetUtf8Bytes,
    headroomBytes:maxUtf8Bytes-size,
    aboveSoftTarget:size>softTargetUtf8Bytes,
    changeRecordEntries:Object.keys(changeRecord).length,
    protectedChangeRecordKeys:Object.freeze(Object.keys(protectedMap)),
    protectedReferences:protectedMap,
    missingProtectedChangeRecords:Object.freeze(missingProtectedChangeRecords),
    latestArchiveRecord:latestArchive||null,
    errors:Object.freeze(errors)
  });
}
export function classifyCentralChangeRecordRetention(key='',value=null){
  const recordKey=clean(key);
  if(!recordKey)return Object.freeze({key:recordKey,archiveEligible:false,reason:'EMPTY_KEY_RETAIN'});
  if(!isObject(value))return Object.freeze({key:recordKey,archiveEligible:false,reason:'NON_OBJECT_POLICY_METADATA_RETAIN'});
  const status=clean(value.status).toUpperCase();
  const authority=clean(value.authority);
  const explicitHistorical=value.historical===true||value.archiveEligible===true||value.current===false;
  const retiredStatus=/(?:ARCHIVED|HISTORICAL|SUPERSEDED|RETIRED|OBSOLETE|REPLACED|DEPRECATED_RECORD_ONLY)/.test(status);
  const activeStatus=/(?:^|_)(?:ACTIVE|CURRENT|PENDING|CODE_UPDATED|LIVE|REPAIR|ENFORCED|REQUIRED|COMPATIBILITY_RECORD)(?:_|$)/.test(status);
  const explicitCurrent=Boolean(
    value.enabled===true
    ||value.required===true
    ||value.enforced===true
    ||value.policy===true
    ||value.current===true
    ||activeStatus
  );
  const authorityCarriesPolicyMeaning=/^OWNER_DIRECTIVE_/i.test(authority)||/platform-release-roadmap\.json#/i.test(authority);
  const policyMeaning=Boolean(explicitCurrent||(!explicitHistorical&&!retiredStatus&&authorityCarriesPolicyMeaning));
  const archiveEligible=Boolean((explicitHistorical||retiredStatus)&&!explicitCurrent);
  return Object.freeze({
    key:recordKey,
    archiveEligible,
    reason:archiveEligible?'EXPLICIT_HISTORICAL_OR_RETIRED_RECORD':'CURRENT_OR_UNCLASSIFIED_POLICY_RETAIN',
    status:status||null,
    authority:authority||null,
    policyMeaning
  });
}

export function planCentralDocumentArchive({roadmap,protectedChangeRecordKeys=[],targetBytes=null}={}){
  if(!isObject(roadmap))throw new Error('roadmap object required');
  const work=cloneJson(roadmap);
  const retention=work.centralDocumentRetention||{};
  const maxUtf8Bytes=Number(retention.maxUtf8Bytes||1100000);
  const softTargetUtf8Bytes=Number(targetBytes||retention.softTargetUtf8Bytes||Math.min(maxUtf8Bytes,1080000));
  const protectedSet=new Set(protectedChangeRecordKeys);
  const pinnedSet=new Set(Array.isArray(retention.pinnedChangeRecordKeys)?retention.pinnedChangeRecordKeys:[]);
  const archivedPayload={};
  const archivedPaths=[];
  const candidates=[];
  for(const selector of Array.isArray(retention.historicalArchiveSelectors)?retention.historicalArchiveSelectors:[]){
    const value=pathValue(work,selector);
    if(value!==undefined)candidates.push({kind:'path',path:selector,bytes:utf8Bytes(JSON.stringify(value))});
  }
  if(retention.archiveUnreferencedChangeRecords===true&&isObject(work.changeRecord)){
    for(const [key,value] of Object.entries(work.changeRecord)){
      if(protectedSet.has(key)||pinnedSet.has(key))continue;
      const disposition=classifyCentralChangeRecordRetention(key,value);
      if(disposition.archiveEligible!==true)continue;
      candidates.push({kind:'change-record',path:'changeRecord.'+key,key,bytes:utf8Bytes(JSON.stringify(value)),disposition});
    }
  }
  candidates.sort((a,b)=>{
    if(a.kind!==b.kind)return a.kind==='path'?-1:1;
    return b.bytes-a.bytes||a.path.localeCompare(b.path);
  });
  let currentBytes=utf8Bytes(JSON.stringify(work,null,2)+'\n');
  for(const candidate of candidates){
    if(currentBytes<=softTargetUtf8Bytes)break;
    const value=pathValue(work,candidate.path);
    if(value===undefined)continue;
    archivedPayload[candidate.path]=value;
    if(!deletePathValue(work,candidate.path))continue;
    archivedPaths.push(candidate.path);
    currentBytes=utf8Bytes(JSON.stringify(work,null,2)+'\n');
  }
  return Object.freeze({
    beforeBytes:utf8Bytes(JSON.stringify(roadmap,null,2)+'\n'),
    afterBytes:currentBytes,
    maxUtf8Bytes,
    softTargetUtf8Bytes,
    hardLimitSatisfied:currentBytes<=maxUtf8Bytes,
    softTargetSatisfied:currentBytes<=softTargetUtf8Bytes,
    protectedChangeRecordKeys:Object.freeze([...protectedSet].sort()),
    archivedPaths:Object.freeze(archivedPaths),
    archivedPayload:Object.freeze(archivedPayload),
    roadmap:work
  });
}
export function planCentralCurrentUsePrune({roadmap,currentReferences=null}={}){
  if(!isObject(roadmap))throw new Error('roadmap object required');
  const work=cloneJson(roadmap);
  const retention=work.centralDocumentRetention||{};
  const refs=currentReferences||findCurrentCentralPolicyReferences({
    roots:Array.isArray(retention.currentUseReferenceScanRoots)&&retention.currentUseReferenceScanRoots.length
      ?retention.currentUseReferenceScanRoots:CENTRAL_SCAN_ROOTS
  });
  const protectedChangeKeys=new Set(Object.keys(refs).filter(x=>x.startsWith('changeRecord.')).map(x=>x.slice('changeRecord.'.length).split('.')[0]));
  const pinnedChangeKeys=new Set(Array.isArray(retention.pinnedChangeRecordKeys)?retention.pinnedChangeRecordKeys:[]);
  const archivedPayload={},archivedPaths=[];

  // changeRecord is history by definition: only live references and explicit pins remain central.
  if(retention.autoArchiveUnreferencedChangeRecords!==false&&isObject(work.changeRecord)){
    for(const [key,value] of Object.entries({...work.changeRecord})){
      if(protectedChangeKeys.has(key)||pinnedChangeKeys.has(key))continue;
      const p='changeRecord.'+key;
      archivedPayload[p]=value;
      delete work.changeRecord[key];
      archivedPaths.push(p);
    }
  }

  // Historical/diagnostic nested state is kept only while executable sources reference it.
  if(retention.autoArchiveHistoricalShapedNestedState!==false){
    const pattern=/(?:history|historical|incident|verification|implementationEvidence|observation|diagnostic|telemetry|audit|latest(?:Run|Qa|Evidence|Observation|Diagnostic)|recoveryEvidence)$/i;
    const candidates=[];
    const walk=(value,parts=[])=>{
      if(!value||typeof value!=='object')return;
      for(const [key,next] of Object.entries(value)){
        if(!next||typeof next!=='object')continue;
        const p=[...parts,key].join('.');
        if(!centralPathPinned(p,retention)&&pattern.test(key)&&!centralPathIsReferenced(p,refs)){
          candidates.push({path:p,bytes:utf8Bytes(JSON.stringify(next))});
          continue;
        }
        walk(next,[...parts,key]);
      }
    };
    walk(work,[]);
    candidates.sort((a,b)=>b.path.split('.').length-a.path.split('.').length||b.bytes-a.bytes);
    for(const row of candidates){
      const value=pathValue(work,row.path);
      if(value===undefined)continue;
      archivedPayload[row.path]=value;
      if(deletePathValue(work,row.path))archivedPaths.push(row.path);
    }
  }

  const beforeBytes=utf8Bytes(JSON.stringify(roadmap,null,2)+'\n');
  const afterBytes=utf8Bytes(JSON.stringify(work,null,2)+'\n');
  return Object.freeze({
    beforeBytes,afterBytes,
    reducedBytes:beforeBytes-afterBytes,
    archivedPaths:Object.freeze(uniq(archivedPaths).sort()),
    archivedPayload:Object.freeze(archivedPayload),
    currentReferencePaths:Object.freeze(Object.keys(refs).sort()),
    protectedChangeRecordKeys:Object.freeze([...protectedChangeKeys].sort()),
    roadmap:work
  });
}

export function archiveCentralCurrentUse({createdAt=new Date().toISOString(),sourceRevision=currentGitRevision()}={}){
  const current=readCentralRoadmap();
  const plan=planCentralCurrentUsePrune({roadmap:current});
  if(!plan.archivedPaths.length)return Object.freeze({changed:false,plan,archiveRecord:null,archivePath:null});
  const date=createdAt.slice(0,10),compact=date.replaceAll('-','');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(plan.archivedPaths)).digest('hex').slice(0,12);
  const recordId='central-policy-current-use-'+compact+'-'+fingerprint;
  const archiveRel='company-records/operations/'+date.slice(0,4)+'/'+date+'/company/central-policy-archive--'+recordId+'.json';
  if(existsRel(archiveRel))return Object.freeze({changed:false,plan,archiveRecord:null,archivePath:archiveRel});
  const archive=centralArchiveRecord({plan:{
    ...plan,
    softTargetUtf8Bytes:Number(current.centralDocumentRetention?.softTargetUtf8Bytes||0),
    maxUtf8Bytes:Number(current.centralDocumentRetention?.maxUtf8Bytes||0)
  },sourceRevision,createdAt,recordId});
  archive.data.mode='AUTO_CURRENT_USE_ONLY';
  archive.data.currentReferencePaths=[...plan.currentReferencePaths];
  archive.tags.push('current-use');
  const next=cloneJson(plan.roadmap);
  next.centralDocumentRetention={
    ...(next.centralDocumentRetention||{}),
    latestArchiveRecord:archiveRel,
    latestArchiveRecordId:recordId,
    latestArchiveSourceRevision:sourceRevision||null,
    latestArchiveAt:createdAt,
    latestArchivePathCount:plan.archivedPaths.length,
    lastAutoPruneMode:'AUTO_CURRENT_USE_ONLY'
  };
  const archiveAbs=path.join(ROOT,archiveRel);
  fs.mkdirSync(path.dirname(archiveAbs),{recursive:true});
  fs.writeFileSync(archiveAbs,JSON.stringify(archive,null,2)+'\n');
  const validation=validateCompanyRecord(archiveRel);
  if(validation.errors.length){
    fs.rmSync(archiveAbs,{force:true});
    throw new Error('current-use archive record validation failed: '+validation.errors.join(','));
  }
  fs.writeFileSync(path.join(ROOT,CENTRAL_POLICY_REL),JSON.stringify(next,null,2)+'\n');
  return Object.freeze({changed:true,plan,archiveRecord:archive,archivePath:archiveRel});
}


export function planCompanionCurrentUsePrune({document,currentReferences={},pinnedCorePaths=[]}={}){
  if(!isObject(document))throw new Error('companion document object required');
  const work=cloneJson(document);
  const pinned=new Set((Array.isArray(pinnedCorePaths)?pinnedCorePaths:[]).map(clean).filter(Boolean));
  const archivedPayload={},archivedPaths=[];
  for(const [key,value] of Object.entries({...work})){
    if(pinned.has(key)||centralPathIsReferenced(key,currentReferences))continue;
    archivedPayload[key]=value;
    delete work[key];
    archivedPaths.push(key);
  }
  const beforeBytes=utf8Bytes(JSON.stringify(document,null,2)+'\n');
  const afterBytes=utf8Bytes(JSON.stringify(work,null,2)+'\n');
  return Object.freeze({
    beforeBytes,
    afterBytes,
    reducedBytes:beforeBytes-afterBytes,
    archivedPaths:Object.freeze(archivedPaths.sort()),
    archivedPayload:Object.freeze(archivedPayload),
    currentReferencePaths:Object.freeze(Object.keys(currentReferences||{}).sort()),
    document:work
  });
}

function companionArchiveRecord({plans,sourceRevision,createdAt,recordId}){
  const documents={};
  const sourceRefs=[];
  const relatedFiles=[];
  for(const [documentKey,row] of Object.entries(plans)){
    sourceRefs.push(row.sourcePath);
    relatedFiles.push(row.sourcePath);
    documents[documentKey]={
      sourcePath:row.sourcePath,
      beforeUtf8Bytes:row.plan.beforeBytes,
      afterUtf8Bytes:row.plan.afterBytes,
      archivedPaths:[...row.plan.archivedPaths],
      archivedPayload:row.plan.archivedPayload,
      currentReferencePaths:[...row.plan.currentReferencePaths]
    };
  }
  return{
    schemaVersion:1,
    recordId,
    recordType:'central-document-archive',
    domain:'operations',
    scope:{type:'COMPANY',id:'company',gameId:'',platform:'NONE'},
    timestamps:{createdAt,observedAt:null},
    provenance:{
      producer:'COMPANY_RECORDS_GOVERNANCE',
      authority:'MACHINE_EXECUTION_CONTRACT',
      sourceRevision:sourceRevision||null,
      artifactIdentity:null,
      sourceRefs
    },
    status:'ARCHIVED',
    retentionClass:'CANONICAL',
    data:{mode:'AUTO_CURRENT_USE_COMPANION',documents},
    evidenceRefs:[],
    relatedFiles,
    supersedes:[],
    tags:['central-document','archive','retention','current-use']
  };
}

export function archiveCentralCompanionCurrentUse({createdAt=new Date().toISOString(),sourceRevision=currentGitRevision()}={}){
  const refs=findCurrentCompanionDocumentReferences();
  const plans={};
  for(const [documentKey,config] of Object.entries(CENTRAL_COMPANION_DOCUMENTS)){
    const current=readJsonRel(config.sourcePath);
    const plan=planCompanionCurrentUsePrune({
      document:current,
      currentReferences:refs[documentKey]||{},
      pinnedCorePaths:config.pinnedCorePaths
    });
    if(plan.archivedPaths.length)plans[documentKey]={sourcePath:config.sourcePath,plan};
  }
  if(!Object.keys(plans).length)return Object.freeze({changed:false,plans,archiveRecord:null,archivePath:null});
  const date=createdAt.slice(0,10),compact=date.replaceAll('-','');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(
    Object.entries(plans).map(([key,row])=>[key,row.plan.archivedPaths])
  ))).digest('hex').slice(0,12);
  const revision=(sourceRevision||'no-revision').slice(0,8).toLowerCase().replace(/[^a-z0-9]/g,'');
  const recordId='central-companion-current-use-'+compact+'-'+revision+'-'+fingerprint;
  const archiveRel='company-records/operations/'+date.slice(0,4)+'/'+date+'/company/central-document-archive--'+recordId+'.json';
  if(existsRel(archiveRel))throw new Error('companion current-use archive record already exists: '+archiveRel);
  const archive=companionArchiveRecord({plans,sourceRevision,createdAt,recordId});
  const archiveAbs=path.join(ROOT,archiveRel);
  fs.mkdirSync(path.dirname(archiveAbs),{recursive:true});
  fs.writeFileSync(archiveAbs,JSON.stringify(archive,null,2)+'\n');
  const validation=validateCompanyRecord(archiveRel);
  if(validation.errors.length){
    fs.rmSync(archiveAbs,{force:true});
    throw new Error('companion current-use archive record validation failed: '+validation.errors.join(','));
  }
  for(const row of Object.values(plans))fs.writeFileSync(path.join(ROOT,row.sourcePath),JSON.stringify(row.plan.document,null,2)+'\n');
  return Object.freeze({changed:true,plans,archiveRecord:archive,archivePath:archiveRel});
}

function currentGitRevision(){
  try{return clean(execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}));}catch{return'';}
}
function centralArchiveRecord({plan,sourceRevision,createdAt,recordId}){
  return {
    schemaVersion:1,
    recordId,
    recordType:'central-policy-archive',
    domain:'operations',
    scope:{type:'COMPANY',id:'company',gameId:'',platform:'NONE'},
    timestamps:{createdAt,observedAt:null},
    provenance:{
      producer:'COMPANY_RECORDS_GOVERNANCE',
      authority:'MACHINE_EXECUTION_CONTRACT',
      sourceRevision:sourceRevision||null,
      artifactIdentity:null,
      sourceRefs:[CENTRAL_POLICY_REL]
    },
    status:'ARCHIVED',
    retentionClass:'CANONICAL',
    data:{
      sourcePath:CENTRAL_POLICY_REL,
      beforeUtf8Bytes:plan.beforeBytes,
      afterUtf8Bytes:plan.afterBytes,
      softTargetUtf8Bytes:plan.softTargetUtf8Bytes,
      hardMaxUtf8Bytes:plan.maxUtf8Bytes,
      archivedPaths:[...plan.archivedPaths],
      archivedPayload:plan.archivedPayload
    },
    evidenceRefs:[],
    relatedFiles:[CENTRAL_POLICY_REL],
    supersedes:[],
    tags:['central-policy','archive','retention']
  };
}
export function archiveCentralDocument({createdAt=new Date().toISOString(),sourceRevision=currentGitRevision()}={}){
  const current=readCentralRoadmap();
  const protectedMap=findProtectedCentralChangeRecordKeys();
  const missing=Object.keys(protectedMap).filter(key=>!Object.prototype.hasOwnProperty.call(current.changeRecord||{},key));
  if(missing.length)throw new Error('referenced changeRecord keys missing before archive: '+missing.join(','));
  const plan=planCentralDocumentArchive({roadmap:current,protectedChangeRecordKeys:Object.keys(protectedMap)});
  if(!plan.hardLimitSatisfied)throw new Error('central policy remains above hard limit after archive plan: '+plan.afterBytes);
  if(!plan.archivedPaths.length)return Object.freeze({changed:false,plan,archiveRecord:null,archivePath:null});
  const date=createdAt.slice(0,10),compact=date.replaceAll('-','');
  const suffix=(sourceRevision||crypto.createHash('sha256').update(JSON.stringify(plan.archivedPaths)).digest('hex')).slice(0,12);
  const recordId='central-policy-archive-'+compact+'-'+suffix;
  const archiveRel='company-records/operations/'+date.slice(0,4)+'/'+date+'/company/central-policy-archive--'+recordId+'.json';
  if(existsRel(archiveRel))throw new Error('central archive record already exists: '+archiveRel);
  const archive=centralArchiveRecord({plan,sourceRevision,createdAt,recordId});
  const next=cloneJson(plan.roadmap);
  next.centralDocumentRetention={
    ...(next.centralDocumentRetention||{}),
    latestArchiveRecord:archiveRel,
    latestArchiveRecordId:recordId,
    latestArchiveSourceRevision:sourceRevision||null,
    latestArchiveAt:createdAt,
    latestArchivePathCount:plan.archivedPaths.length
  };
  const nextText=JSON.stringify(next,null,2)+'\n';
  if(utf8Bytes(nextText)>plan.maxUtf8Bytes)throw new Error('archive metadata pushed central policy above hard limit');
  const archiveAbs=path.join(ROOT,archiveRel);
  fs.mkdirSync(path.dirname(archiveAbs),{recursive:true});
  fs.writeFileSync(archiveAbs,JSON.stringify(archive,null,2)+'\n');
  const validation=validateCompanyRecord(archiveRel);
  if(validation.errors.length){
    fs.rmSync(archiveAbs,{force:true});
    throw new Error('archive record validation failed: '+validation.errors.join(','));
  }
  fs.writeFileSync(path.join(ROOT,CENTRAL_POLICY_REL),nextText);
  return Object.freeze({changed:true,plan,archiveRecord:archive,archivePath:archiveRel});
}

function main(){
  const args=process.argv.slice(2);
  if(args.includes('--central-auto-prune')){
    const result=archiveCentralCurrentUse();
    const companion=archiveCentralCompanionCurrentUse();
    console.log('CENTRAL_POLICY_AUTO_PRUNE_CHANGED='+(result.changed?'YES':'NO'));
    console.log('CENTRAL_POLICY_AUTO_PRUNE_PATHS='+result.plan.archivedPaths.length);
    console.log('CENTRAL_POLICY_AUTO_PRUNE_REDUCED_BYTES='+result.plan.reducedBytes);
    if(result.archivePath)console.log('CENTRAL_POLICY_AUTO_PRUNE_ARCHIVE='+result.archivePath);
    console.log('CENTRAL_COMPANION_AUTO_PRUNE_CHANGED='+(companion.changed?'YES':'NO'));
    for(const [documentKey,row] of Object.entries(companion.plans||{})){
      console.log('CENTRAL_COMPANION_AUTO_PRUNE_'+documentKey.toUpperCase()+'_PATHS='+row.plan.archivedPaths.length);
      console.log('CENTRAL_COMPANION_AUTO_PRUNE_'+documentKey.toUpperCase()+'_REDUCED_BYTES='+row.plan.reducedBytes);
    }
    if(companion.archivePath)console.log('CENTRAL_COMPANION_AUTO_PRUNE_ARCHIVE='+companion.archivePath);
    return;
  }
  if(args.includes('--central-report')){
    const baseArg=args.find(x=>x.startsWith('--central-base='));
    const baseRevision=baseArg?clean(baseArg.slice('--central-base='.length)):'';
    const report=inspectCentralDocument();
    const budgets=inspectCentralDocumentBudgets({baseRevision});
    const assetLibraryBudget=inspectCompanyAssetLibraryBudget({baseRevision});
    console.log('CENTRAL_POLICY_UTF8_BYTES='+report.utf8Bytes);
    console.log('CENTRAL_POLICY_SOFT_TARGET_BYTES='+report.softTargetUtf8Bytes);
    console.log('CENTRAL_POLICY_HARD_MAX_BYTES='+report.maxUtf8Bytes);
    console.log('CENTRAL_POLICY_HEADROOM_BYTES='+report.headroomBytes);
    console.log('CENTRAL_POLICY_PROTECTED_CHANGE_RECORD_KEYS='+report.protectedChangeRecordKeys.length);
    for(const [documentKey,row] of Object.entries(budgets.documents)){
      const marker=documentKey.replace(/[^A-Za-z0-9]+/g,'_').toUpperCase();
      console.log('CENTRAL_DOCUMENT_'+marker+'_UTF8_BYTES='+row.utf8Bytes);
      console.log('CENTRAL_DOCUMENT_'+marker+'_HARD_MAX_BYTES='+row.hardMaxUtf8Bytes);
      console.log('CENTRAL_DOCUMENT_'+marker+'_HEADROOM_BYTES='+row.headroomUtf8Bytes);
      console.log('CENTRAL_DOCUMENT_'+marker+'_MAX_GROWTH_BYTES='+row.maxGrowthUtf8Bytes);
      if(row.baseUtf8Bytes!==null){
        console.log('CENTRAL_DOCUMENT_'+marker+'_BASE_BYTES='+row.baseUtf8Bytes);
        console.log('CENTRAL_DOCUMENT_'+marker+'_GROWTH_BYTES='+row.growthUtf8Bytes);
      }
    }
    console.log('COMPANY_ASSET_LIBRARY_UTF8_BYTES='+assetLibraryBudget.utf8Bytes);
    console.log('COMPANY_ASSET_LIBRARY_HARD_MAX_BYTES='+assetLibraryBudget.hardMaxUtf8Bytes);
    console.log('COMPANY_ASSET_LIBRARY_HEADROOM_BYTES='+assetLibraryBudget.headroomUtf8Bytes);
    console.log('COMPANY_ASSET_LIBRARY_MAX_GROWTH_BYTES='+assetLibraryBudget.maxGrowthUtf8Bytes);
    if(assetLibraryBudget.baseUtf8Bytes!==null){
      console.log('COMPANY_ASSET_LIBRARY_BASE_BYTES='+assetLibraryBudget.baseUtf8Bytes);
      console.log('COMPANY_ASSET_LIBRARY_GROWTH_BYTES='+assetLibraryBudget.growthUtf8Bytes);
    }
    if(report.aboveSoftTarget){
      console.warn('CENTRAL_POLICY_SOFT_TARGET_EXCEEDED=YES');
      for(const row of discoverCentralArchiveCandidates({limit:10}))console.warn('CENTRAL_POLICY_ARCHIVE_CANDIDATE='+row.path+':'+row.utf8Bytes);
    }
    const errors=uniq([...report.errors,...budgets.errors,...assetLibraryBudget.errors]);
    if(errors.length){errors.forEach(x=>console.error(x));process.exit(1);}
    console.log('COMPANY_ASSET_LIBRARY_BUDGET=PASS');
    console.log('CENTRAL_DOCUMENT_BUDGETS=PASS');
    console.log('CENTRAL_POLICY_RETENTION=PASS');
    return;
  }
  if(args.includes('--central-candidates')){
    const rows=discoverCentralArchiveCandidates({limit:50});
    console.log(JSON.stringify(rows,null,2));
    return;
  }
  if(args.includes('--central-plan')){
    const current=readCentralRoadmap();
    const refs=findProtectedCentralChangeRecordKeys();
    const plan=planCentralDocumentArchive({roadmap:current,protectedChangeRecordKeys:Object.keys(refs)});
    console.log(JSON.stringify({
      beforeBytes:plan.beforeBytes,
      afterBytes:plan.afterBytes,
      softTargetUtf8Bytes:plan.softTargetUtf8Bytes,
      maxUtf8Bytes:plan.maxUtf8Bytes,
      protectedChangeRecordKeys:plan.protectedChangeRecordKeys,
      archivedPaths:plan.archivedPaths
    },null,2));
    if(!plan.hardLimitSatisfied)process.exit(1);
    return;
  }
  if(args.includes('--central-archive')){
    const result=archiveCentralDocument();
    console.log('CENTRAL_POLICY_ARCHIVE_CHANGED='+(result.changed?'YES':'NO'));
    if(result.archivePath)console.log('CENTRAL_POLICY_ARCHIVE_RECORD='+result.archivePath);
    console.log('CENTRAL_POLICY_ARCHIVE_AFTER_BYTES='+result.plan.afterBytes);
    return;
  }
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
