// 파일명: tools/asset-health-check.mjs
// 에셋 로컬 존재, 라이선스 정책, 배우 애니메이션 근거, 외부 출처 도달 여부를 검증한다.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

// 로컬 전체 조사: 기존 검사기의 비파괴 모드. 외부 소스 접속·파일 이동·삭제·배포는 수행하지 않는다.
function inventory(){
 const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
 const catalog=JSON.parse(fs.readFileSync('assets/asset-manifest.json','utf8'));
 const ledger=JSON.parse(fs.readFileSync('assets/asset-license-ledger.json','utf8'));
 const cc0=license=>/^(?:CC0(?:-1\.0)?|CC0 1\.0 Universal)$/i.test(String(license||'').trim());
 const sha=value=>/^[a-f0-9]{64}$/i.test(String(value||''));
 const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&Boolean(u.hostname)&&!/(^localhost$|\.local$|\.internal$)/i.test(u.hostname);}catch{return false;}};
 const sources=[];
 const roots=['web-games','roblox-games','unity-games','assets'];
 const extensions=new Set(['.js','.mjs','.ts','.tsx','.html','.css','.lua','.luau','.cs','.json']);
 function scan(folder){
  if(!fs.existsSync(folder))return;
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
   const file=path.join(folder,entry.name);
   if(entry.isDirectory()){if(!['node_modules','.git','dist','build','Library','Temp'].includes(entry.name))scan(file);continue;}
   if(!entry.isFile()||!extensions.has(path.extname(entry.name).toLowerCase()))continue;
   if(file==='assets/asset-manifest.json'||file==='assets/asset-license-ledger.json')continue;
   const bytes=fs.statSync(file).size;
   if(bytes>1000000)continue; // 큰 소스·동적 참조는 미확인으로 남기고 삭제 증거로 삼지 않는다.
   sources.push({file:file.split(path.sep).join('/'),content:fs.readFileSync(file,'utf8')});
  }
 }
 for(const root of roots)scan(root);
 const assets=(library.assets||[]).map(asset=>{
  const file=String(asset.path||'').replace(/^\/+/,''),exists=Boolean(file)&&fs.existsSync(file)&&fs.statSync(file).isFile();
  const relative=file.startsWith('assets/')?file.slice(7):file;
  const consumers=relative?sources.filter(source=>source.content.includes(relative)).map(source=>source.file):[];
  const licenseOk=cc0(asset.license),recordedRights=https(asset.sourceUrl)&&https(asset.licenseEvidenceUrl);
  const recordedHash=sha(asset.sourceHash),downloaded=asset.downloaded===true;
  // 공용 immutable 원본만 내용 바이트를 원본 SHA-256과 직접 비교한다.
  // 파생/압축본 sourceHash는 파일 해시와 동일하다고 가정하지 않는다.
  let immutableHash='NOT_IMMUTABLE';
  if(asset.originalSourceImmutable===true){
   immutableHash=!exists?'MISSING':!recordedHash?'MISSING_HASH':
    createHash('sha256').update(fs.readFileSync(file)).digest('hex').toLowerCase()===asset.sourceHash.toLowerCase()?'PASS':'MISMATCH';
  }
  const pinned=asset.originalSourceImmutable!==true||
    (/\/blob\/[a-f0-9]{40}\//i.test(String(asset.licenseEvidenceUrl||''))&&
     /^[a-f0-9]{40}$/i.test(String(asset.sourceRevision||'')));
  const verifiedLocal=licenseOk&&downloaded&&exists&&recordedRights&&recordedHash&&pinned&&
    (immutableHash==='NOT_IMMUTABLE'||immutableHash==='PASS')&&
    asset.quarantined!==true&&asset.securityBlocked!==true&&asset.practiceOnly!==true;
  const action=!licenseOk||asset.quarantined===true||asset.securityBlocked===true||immutableHash==='MISMATCH'
    ?'QUARANTINE_NEW_USE_KEEP_EXISTING'
    :!verifiedLocal?'RESEARCH_OR_REVERIFY_KEEP_EXISTING':'KEEP_AND_REUSE_CC0';
  return {id:asset.id,path:file,license:asset.license,downloaded,exists,recordedRights,
    recordedHash,immutableHash,pinned,verifiedLocal,action,consumers,
    referenceScope:'STATIC_SOURCE_HINT_ONLY_NOT_PROOF_OF_ABSENCE'};
 });
 const externalSources=(library.externalSources||[]).map(row=>({id:row.id,license:row.license,
  action:cc0(row.license)?'CC0_SOURCE_CANDIDATE_REVIEW_BEFORE_DOWNLOAD':'EXCLUDE_NON_CC0_KEEP_METADATA',
  excludedFromGameUse:!cc0(row.license)}));
 const legacy=(catalog.assets||[]).map(row=>({id:row.id,license:row.license,downloaded:row.downloaded===true,
  action:!cc0(row.license)?'QUARANTINE_NEW_USE_KEEP_CATALOG':row.downloaded===true?'REVERIFY_LOCAL_PROOF':'RESEARCH_ONLY_NOT_ACQUIRED'}));
 // 소스 전용 보관 묶음도 원본 보존을 전제로 점검한다. 압축 내부 라이선스·해시 검증 PASS로 오인하지 않는다.
 const archiveManifests=[
  'assets/external/simple-rpg/manifest.json',
  'assets/external/simple-rpg/priority-v1/manifest.json',
  'assets/external/simple-rpg/wildlife/manifest.json',
  'assets/external/simple-rpg/icons-vfx-npc/manifest.json'
 ];
 const archives=archiveManifests.flatMap(manifestPath=>{
  const meta=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const folder=path.dirname(manifestPath);
  return (meta.packs||[]).map(pack=>{
   const filename=pack.file||pack.filename;
   const file=path.join(folder,filename).split(path.sep).join('/');
   const exists=fs.existsSync(file)&&fs.statSync(file).isFile();
   const bytes=exists?fs.statSync(file).size:null;
   const expectedBytes=pack.bytes||pack.archiveBytes||null;
   const sameSize=expectedBytes===null?null:bytes===expectedBytes;
   const isCc0=cc0(pack.licenseDeclared||pack.license||meta.license);
   const suspiciousPointer=exists&&/\.blend$/i.test(file)&&bytes<200;
   const action=!isCc0?'EXCLUDE_NON_CC0_KEEP_SOURCE':
    !exists||sameSize===false||suspiciousPointer?'QUARANTINE_NEW_USE_REACQUIRE_OR_VERIFY':
    'KEEP_SOURCE_ONLY_REQUIRE_GAME_RUNTIME_QA';
   return {file,license:pack.licenseDeclared||pack.license||meta.license,
    sourceOnly:true,exists,bytes,expectedBytes,sameSize,suspiciousPointer,
    declaredSha256:pack.sha256||null,hashReverified:false,action};
  });
 });
 const evidence=(ledger.entries||[]).length;
 const counts=action=>assets.filter(row=>row.action===action).length;
 const output={version:1,mode:'NON_DESTRUCTIVE_CC0_INVENTORY',
  limitations:['STATIC_REFERENCES_ARE_INCOMPLETE','DYNAMIC_LOADERS_AND_BINARY_CONSUMERS_NOT_EXHAUSTIVELY_INSPECTED',
   'RIGHTS_URLS_ARE_RECORDED_NOT_LIVE_REVERIFIED','NO_RUNTIME_OR_MOBILE_PASS_ATTESTED','ARCHIVE_HASHES_NOT_REVERIFIED'],
  deletionAuthorized:false,quarantineMeansBlockNewUseNotMoveOrErase:true,
  summary:{registryAssets:assets.length,registeredCc0:assets.filter(row=>cc0(row.license)).length,
   downloaded:assets.filter(row=>row.downloaded).length,immutableHashPass:assets.filter(row=>row.immutableHash==='PASS').length,
   immutableHashMismatch:assets.filter(row=>row.immutableHash==='MISMATCH').length,
   locallyReusable:counts('KEEP_AND_REUSE_CC0'),needsReview:counts('RESEARCH_OR_REVERIFY_KEEP_EXISTING'),
   quarantinedNewUse:counts('QUARANTINE_NEW_USE_KEEP_EXISTING'),
   legacyCandidates:legacy.length,legacyNonCc0:legacy.filter(row=>!cc0(row.license)).length,
   externalSources:externalSources.length,externalNonCc0:externalSources.filter(row=>row.excludedFromGameUse).length,
   licenseLedgerEntries:evidence,sourceOnlyArchives:archives.length,
   suspiciousSourcePointers:archives.filter(row=>row.suspiciousPointer).length,
   archiveBytesMismatch:archives.filter(row=>row.sameSize===false).length},assets,externalSources,legacy,archives};
 console.log(JSON.stringify(output));
}
if(process.argv.includes('--inventory')){inventory();process.exit(0);}

const manifest=JSON.parse(fs.readFileSync('assets/asset-manifest.json','utf8'));
const now=new Date().toISOString();
const blocked=new Set(manifest?.policy?.blocked||[]);
const actorTypes=new Set(['character','enemy','boss']);
const results=[];

async function sourceReachable(url){
  if(!url)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);

  try{
    let response=await fetch(url,{
      method:'HEAD',
      redirect:'follow',
      signal:controller.signal,
      headers:{'User-Agent':'jaewoon-games-asset-health'}
    });

    if(response.status===405||response.status===403){
      response=await fetch(url,{
        method:'GET',
        redirect:'follow',
        signal:controller.signal,
        headers:{
          'User-Agent':'jaewoon-games-asset-health',
          'Range':'bytes=0-0'
        }
      });
    }

    return {ok:response.ok||response.status===206,status:response.status,finalUrl:response.url};
  }catch(error){
    return {ok:false,status:0,error:String(error?.message||error)};
  }finally{
    clearTimeout(timer);
  }
}

for(const asset of manifest.assets||[]){
  const types=Array.isArray(asset.types)?asset.types:[];
  const actor=types.some(type=>actorTypes.has(type));
  const localPath=String(asset.path||'').trim();
  const localExists=localPath?fs.existsSync(localPath):null;
  const license=String(asset.license||'unknown');
  const licenseOk=!blocked.has(license)&&license!=='unknown';
  const animationOk=!actor||(
    asset.verifiedAnimation===true&&
    Array.isArray(asset.animationEvidence)&&asset.animationEvidence.length>0&&
    Array.isArray(asset.animations)&&asset.animations.some(x=>['walk','run','move','jump'].includes(String(x).toLowerCase()))
  );
  const source=await sourceReachable(asset.sourceUrl);
  const healthy=licenseOk&&animationOk&&(localExists!==false)&&(source?.ok!==false);

  results.push({
    id:asset.id,
    name:asset.name||asset.id,
    actor,
    license,
    licenseOk,
    verifiedAnimation:asset.verifiedAnimation===true,
    animationOk,
    localPath:localPath||null,
    localExists,
    sourceUrl:asset.sourceUrl||null,
    source,
    healthy
  });
}

const output={
  version:1,
  updatedAt:now,
  policy:{
    blockedLicenses:[...blocked],
    actorsRequireVerifiedMovementAnimation:true,
    externalSourceCheck:true
  },
  summary:{
    total:results.length,
    healthy:results.filter(x=>x.healthy).length,
    unhealthy:results.filter(x=>!x.healthy).length
  },
  assets:results
};

fs.writeFileSync('asset-health.json',JSON.stringify(output,null,2)+'\n');
console.log(`ASSET_HEALTH_TOTAL=${results.length}`);
console.log(`ASSET_HEALTH_UNHEALTHY=${output.summary.unhealthy}`);
if(output.summary.unhealthy)process.exitCode=2;
