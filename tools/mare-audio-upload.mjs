// 파일명: tools/mare-audio-upload.mjs
// 마리 에센시아의 검증된 CC0 파생 음악·효과음(roblox-games/mare-essentia/audio)을 로블록스 Audio 자산으로 등록하고
// Universe 사용 권한을 승인한 뒤 Shared/AudioIds.luau 에 실제 ID만 기록한다. 같은 해시는 다시 올리지 않는다.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {introspectRobloxApiKey} from './company-roblox-dedicated-experience.mjs';

const dir='roblox-games/mare-essentia/audio';
const meta=JSON.parse(fs.readFileSync(dir+'/manifest.json','utf8'));
const receiptPath=dir+'/uploaded.json';
const preservedReceipts=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):{};
const idsPath='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AudioIds.luau';
const universeId=process.env.MARE_UNIVERSE_ID||'10774821253';
if(meta.source!=='OWNER_REQUESTED_ORIGINAL_SYNTH_SCORE'||meta.license!=='OWNER_CREATED_AUDIO')throw Error('AUDIO_PROVENANCE_INVALID');

// 신규 자산은 기존 저장소에 보관된 CC0 원본의 해시·허락·다운로드 출처를 검증한 뒤
// 이 게임 전용 변형 OGG를 만든다. 기존 자체 합성 음원은 등록 기록만 보존한다.
const cc0Base='web-games/ocean-voyage/assets/cc0/';
const cc0Manifest=JSON.parse(fs.readFileSync(cc0Base+'manifest.json','utf8'));
const cc0PackDir='assets/external/simple-rpg/priority-v1/';
const cc0PackManifest=JSON.parse(fs.readFileSync(cc0PackDir+'manifest.json','utf8'));

function prepareVerifiedCC0(track){
  if(track.license!=='CC0-1.0'||track.source!=='VERIFIED_CC0_ORIGINAL_DERIVATIVE'
    ||!/^out\/[a-z0-9_]+\.ogg$/.test(track.file)
    ||!/^[a-z0-9=,._-]+$/.test(String(track.editFilter||'')))throw Error('CC0_AUDIO_METADATA_INVALID');

  // 기존 승인된 오디오는 재인코딩/재등록하지 않는다. 원본 해시 장부와 자산 바이트가 맞아야 재사용한다.
  // 예전 PR에서 12개가 Git LFS 포인터로 저장됐다면 실제 LFS OGG를 복원해 일반 Git 바이너리로 승격한다.
  const locked=preservedReceipts[track.name];
  if(locked?.granted){
    const validId=/^[1-9]\\d*$/.test(String(locked.assetId||''));
    const validHash=/^[a-f0-9]{64}$/.test(String(locked.sha256||''));
    let validOrigin=false;
    if(track.sourceArchiveSha256){
      const pack=cc0PackManifest.packs?.find(p=>p.file==='kenney-rpg-sfx-50.zip');
      validOrigin=track.sourceFile===cc0PackDir+'kenney-rpg-sfx-50.zip'
        && pack?.licenseDeclared==='CC0-1.0'
        && pack?.sha256===track.sourceArchiveSha256
        && pack?.sourceUrl===track.sourceDownloadUrl
        && pack?.licenseSourceUrl===track.sourceUrl
        && locked.sourceArchiveSha256===track.sourceArchiveSha256
        && locked.sourceEntry===track.sourceEntry
        && /^[a-f0-9]{64}$/.test(String(locked.sourceSha256||''));
    }else if(track.sourceDownloadUrl&&!track.sourceFile){
      validOrigin=/^https:\\/\\/opengameart\\.org\\/content\\/[a-z0-9-]+$/.test(String(track.sourceUrl||''))
        && track.sourceLicenseCheckedOn==='2026-11-12'
        && locked.sourceSha256===track.sourceSha256
        && locked.sourceDownloadUrl===track.sourceDownloadUrl
        && /^[a-f0-9]{64}$/.test(String(track.sourceSha256||''));
    }else{
      const approved=cc0Manifest.assets?.find(x=>x.path===String(track.sourceFile||'').slice(cc0Base.length));
      validOrigin=track.sourceFile?.startsWith(cc0Base)
        && approved?.license==='CC0-1.0'
        && approved?.sourceUrl===track.sourceUrl
        && approved?.gitBlobSha1===track.sourceGitBlobSha1
        && locked.sourceGitBlobSha1===track.sourceGitBlobSha1;
    }
    if(!validId||!validHash||locked.license!=='CC0-1.0'
      ||locked.sourceUrl!==track.sourceUrl||!validOrigin)
      throw Error('AUDIO_PRESERVED_PROVENANCE_INVALID:'+track.name);
    const output=dir+'/'+track.file;
    if(!fs.existsSync(output))throw Error('AUDIO_PRESERVED_BINARY_MISSING:'+track.name);
    let bytes=fs.readFileSync(output);
    if(bytes.toString('utf8',0,48).startsWith('version https://git-lfs.github.com/spec/v1')){
      bytes=execFileSync('git',['lfs','smudge'],{input:bytes,maxBuffer:24*1024*1024,timeout:120000});
      fs.writeFileSync(output,bytes);
      console.log('AUDIO_LFS_BINARY_RESTORED '+track.name);
    }
    if(bytes.length<1500||bytes.subarray(0,4).toString()!=='OggS'
      ||crypto.createHash('sha256').update(bytes).digest('hex')!==locked.sha256)
      throw Error('AUDIO_PRESERVED_BINARY_HASH_MISMATCH:'+track.name);
    console.log('AUDIO_CC0_PRESERVED '+track.name+' asset='+locked.assetId);
    return {sourceSha256:locked.sourceSha256,
      ...(locked.sourceArchiveSha256?{sourceArchiveSha256:locked.sourceArchiveSha256,sourceEntry:locked.sourceEntry}:{}),
      ...(locked.sourceDownloadUrl?{sourceDownloadUrl:locked.sourceDownloadUrl,
        sourceLicenseCheckedOn:track.sourceLicenseCheckedOn}:{}),
      ...(locked.sourceGitBlobSha1?{sourceGitBlobSha1:locked.sourceGitBlobSha1}:{}),
      license:'CC0-1.0',sourceUrl:track.sourceUrl};
  }

  let original,sourceEvidence;
  if(track.sourceArchiveSha256){
    // CC0 Kenney RPG 음원 묶음은 이미 저장소에 다운로드 원본/원본 SHA-256 장부가 있다.
    if(track.sourceFile!==cc0PackDir+'kenney-rpg-sfx-50.zip'
      ||!/^[a-f0-9]{64}$/.test(track.sourceArchiveSha256)
      ||!/^OGG\/[A-Za-z0-9_]+\.ogg$/.test(track.sourceEntry||''))throw Error('CC0_AUDIO_ARCHIVE_METADATA_INVALID');
    const source=cc0PackManifest.packs?.find(x=>x.file==='kenney-rpg-sfx-50.zip');
    if(!source||source.licenseDeclared!=='CC0-1.0'
      ||source.licenseSourceUrl!==track.sourceUrl||source.sourceUrl!==track.sourceDownloadUrl
      ||source.sha256!==track.sourceArchiveSha256)throw Error('CC0_AUDIO_ARCHIVE_RIGHTS_INVALID');
    const bytes=fs.readFileSync(track.sourceFile);
    if(bytes.length!==source.bytes
      ||crypto.createHash('sha256').update(bytes).digest('hex')!==source.sha256)
      throw Error('CC0_AUDIO_ARCHIVE_HASH_MISMATCH');
    const list=execFileSync('unzip',['-Z','-1',track.sourceFile],{encoding:'utf8',maxBuffer:1024*1024}).split(/\r?\n/);
    const matches=list.filter(x=>x===track.sourceEntry||x.endsWith('/'+track.sourceEntry));
    if(matches.length!==1)throw Error('CC0_AUDIO_ARCHIVE_ENTRY_MISSING_OR_AMBIGUOUS');
    original=execFileSync('unzip',['-p',track.sourceFile,matches[0]],{maxBuffer:16*1024*1024,timeout:30000});
    if(original.length<512||original.length>12*1024*1024)
      throw Error('CC0_AUDIO_ARCHIVE_ENTRY_SIZE_INVALID');
    sourceEvidence={sourceArchiveSha256:source.sha256,sourceEntry:matches[0]};
  }else if(track.sourceDownloadUrl && !track.sourceFile){
    // 외부 CC0 원본을 실제 내려받아 원본 SHA-256을 고정하고 게임 전용 OGG로 변환한다.
    // 원본은 OpenGameArt 개별 곡 페이지의 CC0 확인 후 등록한 URL만 허용한다.
    if(!/^https:\/\/opengameart\.org\/content\/[a-z0-9-]+$/.test(String(track.sourceUrl||''))
      ||!/^https:\/\/opengameart\.org\/sites\/default\/files\/[A-Za-z0-9%_.()+-]+$/.test(String(track.sourceDownloadUrl||''))
      ||!track.creator||track.sourceLicenseCheckedOn!=='2026-11-12')
      throw Error('CC0_AUDIO_EXTERNAL_SOURCE_NOT_APPROVED');
    original=execFileSync('curl',['--fail','--location','--silent','--show-error',
      '--retry','3','--connect-timeout','15','--max-time','120',
      '--max-filesize','36000000','--',track.sourceDownloadUrl],
      {timeout:140000,maxBuffer:40*1024*1024});
    if(original.length<1500||original.length>36000000)
      throw Error('CC0_AUDIO_EXTERNAL_SOURCE_SIZE_INVALID');
    const originalHash=crypto.createHash('sha256').update(original).digest('hex');
    if(track.sourceSha256&&track.sourceSha256!==originalHash)
      throw Error('CC0_AUDIO_EXTERNAL_SOURCE_HASH_MISMATCH');
    if(!track.sourceSha256){
      if(process.env.AUDIO_CC0_PREFLIGHT!=='1')
        throw Error('CC0_AUDIO_EXTERNAL_SOURCE_HASH_NOT_LOCKED');
      track.sourceSha256=originalHash;
    }
    sourceEvidence={sourceDownloadUrl:track.sourceDownloadUrl,sourceSha256:originalHash,
      sourceLicenseCheckedOn:track.sourceLicenseCheckedOn};
  }else{
    if(!track.sourceFile?.startsWith(cc0Base)||!/^[a-f0-9]{40}$/.test(String(track.sourceGitBlobSha1||'')))
      throw Error('CC0_AUDIO_ORIGINAL_METADATA_INVALID');
    const relative=track.sourceFile.slice(cc0Base.length);
    const approved=cc0Manifest.assets.find(x=>x.path===relative);
    if(!approved||approved.license!=='CC0-1.0'||approved.sourceUrl!==track.sourceUrl
      ||approved.gitBlobSha1!==track.sourceGitBlobSha1)throw Error('CC0_AUDIO_LICENSE_EVIDENCE_INVALID');
    original=fs.readFileSync(track.sourceFile);
    const gitBlob=crypto.createHash('sha1').update(Buffer.from('blob '+original.length+'\0')).update(original).digest('hex');
    if(gitBlob!==track.sourceGitBlobSha1)throw Error('CC0_AUDIO_SOURCE_HASH_MISMATCH');
    sourceEvidence={sourceGitBlobSha1:gitBlob};
  }

  const originalSha256=crypto.createHash('sha256').update(original).digest('hex');
  const output=dir+'/'+track.file;
  fs.mkdirSync(dir+'/out',{recursive:true});
  // 길이가 긴 MP3/WAV 원본을 pipe:0으로 잘라 읽으면 ffmpeg 조기 종료 시 EPIPE가 난다.
  // 단일 책임 함수에서 임시 원본 파일 입력으로 변환한 다음 즉시 정리한다.
  if(track.legacyConversion===true && !track.maxSeconds){
    // 이미 운영 중인 21개 CC0 원본은 기존 인코딩을 유지해 ID와 바이너리를 바꾸지 않는다.
    execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-i','pipe:0',
      '-vn','-ac','1','-ar','32000','-af',track.editFilter,'-c:a','libvorbis','-q:a','3',output],
      {input:original,timeout:120000,maxBuffer:8*1024*1024});
  }else{
    // 신규 긴 음악만 임시 파일로 읽어 -t 범위 내 변환하며 원본은 작업 직후 삭제한다.
    const tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),'mare-audio-'));
    const tmpSource=path.join(tmpDir,'original.audio');
    try{
      fs.writeFileSync(tmpSource,original);
      execFileSync('ffmpeg',['-nostdin','-y','-loglevel','error','-i',tmpSource,
        '-vn','-t',String(track.maxSeconds||180),'-ac','1','-ar','32000','-af',track.editFilter,
        '-c:a','libvorbis','-q:a','3',output],
        {timeout:120000,maxBuffer:8*1024*1024});
    }finally{
      fs.rmSync(tmpDir,{recursive:true,force:true});
    }
  }
  if(!fs.existsSync(output)||fs.statSync(output).size<1500)
    throw Error('CC0_AUDIO_DERIVATIVE_TOO_SMALL');
  // 파생물과 부모 원본을 업로드 영수증에 함께 기록한다.
  console.log('AUDIO_CC0_SOURCE_VERIFIED '+track.name+' source_sha256='+originalSha256);
  return {sourceSha256:originalSha256,...sourceEvidence,license:'CC0-1.0',sourceUrl:track.sourceUrl};
}

// API 키 없이 원본 권리/해시/파생 음원의 디코더까지 검사하는 수동 검증 모드.
if(process.env.AUDIO_CC0_PREFLIGHT==='1'){
  const tracks=meta.tracks.filter(t=>t.license==='CC0-1.0');
  let passed=0,unavailable=0;
  for(const t of tracks){
    try{
      const evidence=prepareVerifiedCC0(t);
      const file=dir+'/'+t.file;
      const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries',
        'format=duration,size','-of','json',file],{encoding:'utf8',timeout:15000}));
      const duration=Number(info.format?.duration);
      if(!Number.isFinite(duration)||duration<0.05||duration>180)
        throw Error('CC0_AUDIO_INVALID_DURATION:'+t.name);
      console.log('AUDIO_CC0_PREFLIGHT_PASS '+t.name+' duration='+duration.toFixed(2)
        +' original='+evidence.sourceSha256+' derived='
        +crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
      passed++;
    }catch(e){
      // 신규 외부 다운로드 실패는 그 곡만 격리한다. 기존 검증곡/고정 해시 불일치는 즉시 중단.
      if(t.sourceDownloadUrl&&!t.sourceFile&&!t.sourceSha256){
        unavailable++;
        console.log('AUDIO_CC0_PREFLIGHT_UNAVAILABLE '+t.name+' '+String(e.message||e).slice(0,140));
        continue;
      }
      throw e;
    }
  }
  if(!passed)throw Error('AUDIO_CC0_PREFLIGHT_NO_VERIFIED_TRACKS');
  // 새 다운로드 원본 해시를 동일 manifest에 고정해 PR에 같이 보관한다.
  if(meta.tracks.some(t=>t.sourceDownloadUrl&&!t.sourceFile&&t.sourceSha256)){
    fs.writeFileSync(dir+'/manifest.json',JSON.stringify(meta,null,1)+'\n');
  }
  if(unavailable)console.log('AUDIO_CC0_PREFLIGHT_PARTIAL verified='+passed+' unavailable='+unavailable);
  else console.log('AUDIO_CC0_PREFLIGHT_OK '+passed);
  process.exit(0);
}
const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
const rawCookie=String(process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'').trim();
if(!key)throw Error('ROBLOX_OPEN_CLOUD_API_KEY_MISSING');
const cookie=rawCookie.includes('.ROBLOSECURITY=')?rawCookie:(rawCookie?'.ROBLOSECURITY='+rawCookie+';':'');
let csrf='';
async function request(url,options={}){
  const authenticated=!!cookie&&url.startsWith('https://apis.roblox.com/');
  if(authenticated&&url.startsWith('https://apis.roblox.com/assets/v1/'))url=url.replace('/assets/v1/','/assets/user-auth/v1/');
  const headers={...(options.headers||{})};
  if(authenticated){delete headers['x-api-key'];headers.cookie=cookie;if(csrf)headers['x-csrf-token']=csrf;}
  let r=await fetch(url,{...options,headers,signal:AbortSignal.timeout(90000)});
  if(authenticated&&r.status===403&&r.headers.get('x-csrf-token')){
    csrf=r.headers.get('x-csrf-token');
    r=await fetch(url,{...options,headers:{...headers,'x-csrf-token':csrf},signal:AbortSignal.timeout(90000)});
  }
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error('ROBLOX_HTTP_'+r.status+':'+new URL(url).pathname+':'+String(d.code||d.message||'').slice(0,120));
  return d;
}

let creator=process.env.ROBLOX_CREATOR_USER_ID&&/^[1-9]\d*$/.test(process.env.ROBLOX_CREATOR_USER_ID)?{userId:process.env.ROBLOX_CREATOR_USER_ID}:null;
if(!creator&&cookie){
  const r=await fetch('https://develop.roblox.com/v1/universes/'+universeId,{headers:{cookie},signal:AbortSignal.timeout(30000)});
  const d=await r.json().catch(()=>({}));
  if(r.ok&&String(d.id)===universeId&&Number(d.creatorTargetId)>0&&['User','Group'].includes(d.creatorType))
    creator={[d.creatorType==='Group'?'groupId':'userId']:String(d.creatorTargetId)};
  console.log('AUDIO_OWNER_LOOKUP='+r.status+':'+(creator?'RESOLVED':'UNRESOLVED'));
}
if(!creator){
  const scope=await introspectRobloxApiKey({apiKey:key});
  const candidates=[];
  for(const row of scope.scopes){
    if(!/asset/i.test(row.name)||!(/write|create/i.test(row.name)||row.operations.some(x=>/write|create/i.test(x))))continue;
    for(const id of row.userIds)if(/^[1-9]\d*$/.test(id))candidates.push({userId:id});
    for(const id of row.groupIds)if(/^[1-9]\d*$/.test(id))candidates.push({groupId:id});
  }
  const unique=[...new Map(candidates.map(x=>[JSON.stringify(x),x])).values()];
  if(unique.length!==1)throw Error('AUDIO_CREATOR_NOT_RESOLVED');
  creator=unique[0];
}

let receipts={...preservedReceipts};
// 전체 재업로드는 아직 CC0로 교체되지 않은 기존 합성 음원까지 재생성하므로 차단한다.
if(process.env.AUDIO_FRESH==='1')console.log('AUDIO_FRESH_IGNORED_CC0_MIGRATION_SAFE_MODE');
const save=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipts,null,1)+'\n');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let failures=0;

for(const t of meta.tracks){
  try{
    const provenance=t.license==='CC0-1.0'?prepareVerifiedCC0(t):null;
    const bytes=fs.readFileSync(dir+'/'+t.file);
    const sha=crypto.createHash('sha256').update(bytes).digest('hex');
    let rec=receipts[t.name]||{};
    // 자체 합성 원본은 중앙 CC0 정책상 새로운 업로드 금지. 기존 유효한 연결은 보존.
    if(!provenance){
      if(rec.sha256!==sha||!rec.granted||!/^[1-9]\d*$/.test(String(rec.assetId)))
        throw Error('AUDIO_LEGACY_CC0_REPLACEMENT_REQUIRED');
      console.log('AUDIO_LEGACY_PRESERVED '+t.name);
      continue;
    }
    if(!(rec.sha256===sha&&/^[1-9]\d*$/.test(String(rec.assetId)))){
      const form=new FormData();
      form.append('request',JSON.stringify({
        assetType:'Audio',displayName:('Mare '+t.label).slice(0,50),
        description:('CC0 original derivative for Mare Essentia. '+t.sourceUrl+' sha256 '+sha).slice(0,950),
        creationContext:{creator},
      }));
      form.append('fileContent',new Blob([bytes],{type:'audio/ogg'}),t.name+'.ogg');
      let op=await request('https://apis.roblox.com/assets/v1/assets',{method:'POST',headers:{'x-api-key':key},body:form});
      if(!/^operations\/[a-zA-Z0-9-]+$/.test(String(op.path||'')))throw Error('AUDIO_OPERATION_INVALID');
      const operationPath=op.path,deadline=Date.now()+300000;
      while(!op.done&&Date.now()<deadline){
        await sleep(3000);
        op=await request('https://apis.roblox.com/assets/v1/'+operationPath,{headers:{'x-api-key':key}});
      }
      const assetId=String(op.response?.assetId||'');
      if(!op.done||op.error||!/^[1-9]\d*$/.test(assetId))throw Error('AUDIO_UPLOAD_FAILED:'+String(op.error?.message||'').slice(0,120));
      rec={sha256:sha,assetId,granted:false,...provenance};
      receipts[t.name]=rec;save();
      console.log('AUDIO_UPLOADED '+t.name+'='+assetId);
      await sleep(2500);
    }
    if(!rec.granted){
      const grant=await request('https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',{
        method:'PATCH',headers:{'x-api-key':key,'content-type':'application/json'},
        body:JSON.stringify({subjectType:'Universe',subjectId:universeId,action:'Use',
          requests:[{assetId:Number(rec.assetId),grantToDependencies:true}]}),
      });
      if(grant.errors?.length)throw Error('AUDIO_UNIVERSE_PERMISSION_REJECTED');
      rec.granted=true;receipts[t.name]=rec;save();
      console.log('AUDIO_GRANTED '+t.name);
    }
    Object.assign(rec,provenance);
    receipts[t.name]=rec;save();
  }catch(e){
    failures++;
    console.log('AUDIO_FAILED '+t.name+' '+String(e.message||e).slice(0,200));
  }
}
const lines=meta.tracks.filter(t=>receipts[t.name]?.granted).map(t=>' '+t.name+'="rbxassetid://'+receipts[t.name].assetId+'",');
fs.writeFileSync(idsPath,
  '-- 업로드 워크플로(mare-audio-upload)가 기록한 음악·효과음 ID. 등록과 권한 승인이 끝난 것만 들어간다. 없으면 소리 없이 지나간다.\nreturn {\n'+lines.join('\n')+'\n}\n');
console.log('AUDIO_IDS_WRITTEN count='+lines.length+' failures='+failures);
// 일부 음원/권한 실패를 성공으로 숨기지 않는다. 이미 승인된 ID와 영수증은 복구용으로 보존.
if(failures>0)process.exitCode=1;
