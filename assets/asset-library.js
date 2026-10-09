const $=id=>document.getElementById(id);
const MANIFEST='/assets/roblox/world-ghosts/native/asset-gallery.json';
const SYNC_INTERVAL_MS=30000;
const forms={SHROUD:'망령형',TALL:'장신형',SLENDER:'인간형',GIANT:'거인형',STOCKY:'강건형',BEAST:'짐승형',SERPENT:'뱀형',ARACHNID:'거미형',CENTAUR:'반인반수형',FLOATING_HEAD:'부유 머리형',OBJECT_SWARM:'군집형',RIBBON:'띠형',LANTERN:'등불형',WHEEL:'바퀴형',WALL:'벽형',BOUND:'속박형',CRAWLER:'기어가는 형',HALF_BODY:'반신형',HEADLESS:'머리 없는 형',HUNCHED:'굽은 등형',LONG_ARM:'긴 팔형',LONG_NECK:'긴 목형',SKELETON:'해골형',SMALL:'소형',THIN_NECK:'가는 목형',UMBRELLA:'우산형',WINGED:'날개형',OTHER:'기타'};
const categoryLabels={CHARACTER:'캐릭터',CREATURE:'크리처',BUILDING:'건물',ENVIRONMENT:'환경',WEAPON:'무기',SKILL:'스킬',MATERIAL:'재질',AUDIO:'오디오',VFX:'VFX',UI:'UI',MOTION:'모션',PROP:'소품',OTHER:'기타'};
// Owner-retired homepage previews. Keep the reusable source assets intact.
const retiredPreviews=new Set(['roblox-insect-spider-hd-v1','roblox-insect-spider-hd','roblox-world-ghost-gwisin-bride']);
const publicAssets=assets=>assets.filter(row=>!retiredPreviews.has(row.id));
const registrySignature=value=>JSON.stringify(value?.assets?.map(({id,title,category,family,subfamily,platform,status,path,sourcePath,previewPath,productionVerified,verifiedCompanyReusable,runtimeVerificationState,consumerGameIds,intendedConsumerGameIds,internalAuditScore,internalAuditGrade,sourceRevision,version,sha256})=>({id,title,category,family,subfamily,platform,status,path,sourcePath,previewPath,productionVerified,verifiedCompanyReusable,runtimeVerificationState,consumerGameIds,intendedConsumerGameIds,internalAuditScore,internalAuditGrade,sourceRevision,version,sha256})));
const biomes={forest:'숲',snow:'설원',desert:'사막',swamp:'늪',cave:'동굴',coast:'해안',village:'마을',city:'도시',ruins:'폐허',dungeon:'던전'};
const clipNames={idle:'대기',walk:'걷기',chase:'추격',attack:'공격',hit:'피격',death:'쓰러짐'};
const motionLabels={IDLE_RELAXED:'대기',WALK:'걷기',JOG:'조깅',RUN:'달리기',START:'출발',STOP:'정지',TURN_90:'90도 회전',JUMP_START:'점프',LAND:'착지',HIT_FRONT:'정면 피격',DEATH_FRONT:'쓰러짐',BLOCK_RAISE:'방어 올리기',BLOCK_HOLD:'방어 유지',PARRY_PERFECT:'정밀 받아치기',GUARD_BREAK:'가드 브레이크',COUNTER_READY:'카운터 준비',SPRINT:'전력질주',CROUCH_IDLE:'웅크리기',DODGE_LEFT:'왼쪽 회피',DODGE_RIGHT:'오른쪽 회피',ROLL_FORWARD:'앞구르기',CLIMB_LOOP:'오르기',SWIM_FORWARD:'수영',INTERACT_USE:'상호작용',GATHER_SWING:'채집 휘두르기',CRAFT_LOOP:'제작',CARRY_IDLE:'들고 대기',EQUIP_DRAW:'장비 꺼내기',UNEQUIP_STOW:'장비 넣기',USE_CONSUMABLE:'소모품 사용',DOWNED_IDLE:'다운',REVIVE_HELP:'부활 도움',EMOTE_WAVE:'손 흔들기',LIGHT_ATTACK_1:'약공격',HEAVY_ATTACK_1:'강공격',RANGED_DRAW_SHOT:'원거리 발사',CAST_BURST:'마법 발동',CHANNEL_LOOP:'집중 시전',HIT_BACK:'후방 피격',BLEND_NEUTRAL:'중립 블렌드',SIT_DOWN:'앉기',STAND_UP:'일어나기',LEAN_WALL_IDLE:'벽 기대기',OPEN_DOOR:'문 열기',OPEN_CONTAINER:'상자 열기',PICKUP_GROUND:'줍기',PLACE_GROUND:'놓기',PUSH_OBJECT:'밀기',PULL_OBJECT:'당기기',TALK_GESTURE:'대화 제스처',NPC_WORK_LOOP:'NPC 작업',COOK_LOOP:'요리',FARM_TEND:'농사',FISH_CAST:'낚시',BED_LIE_DOWN:'눕기',LADDER_ENTER:'사다리 진입',LADDER_EXIT:'사다리 이탈',SLOPE_ASCEND:'오르막',SLOPE_DESCEND:'내리막',FATIGUED_IDLE:'지친 대기',INJURED_WALK:'부상 걷기'};
const featuredTargets=[['featuredWalk','roblox-world-ghost-ghoul','walk'],['featuredAttack','roblox-world-ghost-ifrit','attack']];
let manifest=null,registry=null,registryEtag=null,registryViewSignature='',rows=[],kind='monster',selectedId='',selectionToken=0,currentKey='',currentRow=null;
let viewer=null,viewerPromise=null,refreshing=false,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,selectedClip='idle';
const cache=new Map();
const localImage=value=>typeof value==='string'&&/^\/(assets|web-games)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg|avif)$/i.test(value)&&!value.split('/').includes('..')?value:'';
const validSamplePath=value=>typeof value==='string'&&/^\/assets\/roblox\/world-ghosts\/native\/gallery\/(monster|environment)-[a-z0-9-]+\.json$/.test(value);
async function request(url,options={}){
 const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000),...options});
 if(!response.ok)throw Error('자산 서버에 연결하지 못했어.');return response;
}
async function readRegistry(){
 const headers=registry&&registryEtag?{'If-None-Match':registryEtag}:undefined;
 const response=await fetch('/company-asset-library.json',{cache:'no-cache',signal:AbortSignal.timeout(20000),...(headers?{headers}:{})});
 if(response.status===304&&registry)return registry;
 if(!response.ok)throw Error('자산 서버에 연결하지 못했어.');
 const next=await response.json();if(!Array.isArray(next.assets))throw Error('자산 목록을 확인하고 있어.');
 registryEtag=response.headers.get('etag');return next;
}
function allRows(){
 const monsters=new Map(manifest.monsters.map(row=>['roblox-world-ghost-'+row.id,row]));
 const environments=new Map(manifest.environments.map(row=>['roblox-common-environment-'+row.id,row]));
 const common=new Map((manifest.commonMotions||[]).map(row=>['roblox-common-motion-'+row.id,row]));
 if(kind==='all')return registry.assets.map(asset=>{
  const category=asset.category||asset.family||'OTHER',retiredPreview=retiredPreviews.has(asset.id);
  const sample=retiredPreview?null:category==='CREATURE'?monsters.get(asset.id):category==='ENVIRONMENT'?environments.get(asset.id):null;
  const atom=retiredPreview?null:category==='MOTION'?common.get(asset.id):null,key=atom?.atomId||asset.id;
  return {id:asset.id,title:atom?(motionLabels[key]||key):sample?(category==='ENVIRONMENT'?biomes[sample.id]||sample.title:sample.title):asset.title||asset.id,
   category,form:category,role:[asset.platform,asset.status].filter(Boolean).join(' · '),sample,atom,asset,retiredPreview,
   image:retiredPreview?'':localImage(asset.previewPath)||localImage(asset.path),sharedImage:Boolean(asset.previewPath&&asset.previewPath!==asset.path)};
 }).sort((a,b)=>{const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];const rank=row=>{const i=families.indexOf(row.category);return i<0?families.length:i;};return rank(a)-rank(b)||String(a.asset?.subfamily||'').localeCompare(String(b.asset?.subfamily||''),'ko')||a.title.localeCompare(b.title,'ko')||a.id.localeCompare(b.id,'en');});
 if(kind==='common')return publicAssets(registry.assets).filter(row=>row.category==='MOTION').map(asset=>{
  const atom=common.get(asset.id),key=atom?.atomId||asset.id;
  return {id:asset.id,title:atom?(motionLabels[key]||key):asset.title||asset.id,category:'MOTION',asset,
   form:atom?.priority||'MOTION',role:atom?[[(atom.looped?'반복':'단발'),atom.duration+'초'],atom.motionRole].filter(Boolean).join(' · '):'공용 R15 모션팩',
   atom,sharedImage:false};
 }).sort((a,b)=>Number(Boolean(b.atom))-Number(Boolean(a.atom))||a.title.localeCompare(b.title,'ko'));
 return publicAssets(registry.assets).filter(row=>row.category===(kind==='monster'?'CREATURE':'ENVIRONMENT')).map(asset=>{
  const sample=(kind==='monster'?monsters:environments).get(asset.id),category=kind==='monster'?'CREATURE':'ENVIRONMENT';
  return {id:asset.id,title:sample?(kind==='environment'?biomes[sample.id]||sample.title:sample.title):asset.title||asset.id,
   category,asset,form:sample?.form||'OTHER',role:sample?.role||'',sample,image:localImage(asset.previewPath)||localImage(asset.path),
   sharedImage:Boolean(asset.previewPath&&asset.previewPath!==asset.path)};
 }).sort((a,b)=>Number(Boolean(b.sample))-Number(Boolean(a.sample)));
}
// --- 검색: 등록 자산의 실제 경로·플랫폼·검증 근거만 사용 ---
function updateFilters(){
 const old=$('formFilter').value;
 $('formFilter').replaceChildren(new Option('모든 종류',''));
 for(const form of [...new Set(rows.map(row=>row.form))].sort())$('formFilter').add(new Option(kind==='all'?(categoryLabels[form]||form):(forms[form]||form),form));
 $('formFilter').value=[...$('formFilter').options].some(option=>option.value===old)?old:'';
 const folderFilter=$('folderFilter'),oldFolder=folderFilter.value;
 folderFilter.replaceChildren(new Option('모든 폴더',''));
 const folderPaths=new Set();
 for(const row of rows){
  const raw=String(row.asset?.sourcePath||row.asset?.path||'').trim();
  if(!raw)continue;
  if(/^https?:\/\//i.test(raw)){folderPaths.add('외부 경로');continue;}
  const parts=raw.replace(/^\//,'').split('/').filter(Boolean);
  folderPaths.add(parts.length>3?parts.slice(0,3).join('/'):parts.length>1?parts.slice(0,-1).join('/'):'최상위');
 }
 for(const folder of [...folderPaths].sort((a,b)=>a.localeCompare(b,'ko')))folderFilter.add(new Option(folder,folder));
 folderFilter.value=[...folderFilter.options].some(option=>option.value===oldFolder)?oldFolder:'';
 const platformFilter=$('platformFilter'),oldPlatform=platformFilter.value;
 platformFilter.replaceChildren(new Option('모든 플랫폼',''));
 for(const platform of [...new Set(rows.map(row=>String(row.asset?.platform||'').trim()).filter(Boolean))].sort())platformFilter.add(new Option(platform,platform));
 platformFilter.value=[...platformFilter.options].some(option=>option.value===oldPlatform)?oldPlatform:'';
}
function showList(){
 const query=$('assetSearch').value.trim().toLocaleLowerCase(),form=(kind==='monster'||kind==='all')?$('formFilter').value:'';
 const selectedFolder=$('folderFilter').value,selectedPlatform=$('platformFilter').value;
 const verification=$('verificationFilter').value,sourceFilter=$('sourceFilter').value;
 const sourceCounts=new Map();
 for(const asset of registry?.assets||[]){
  const source=String(asset?.sourcePath||asset?.path||'').trim();
  if(source)sourceCounts.set(source,(sourceCounts.get(source)||0)+1);
 }
 const filtered=rows.filter(row=>{
  const asset=row.asset||{},source=String(asset.sourcePath||asset.path||'').trim();
  const parts=source.replace(/^\//,'').split('/').filter(Boolean);
  const folder=!source?'':/^https?:\/\//i.test(source)?'외부 경로':parts.length>3?parts.slice(0,3).join('/'):parts.length>1?parts.slice(0,-1).join('/'):'최상위';
  const platform=String(asset.platform||'').trim(),sameSource=sourceCounts.get(source)||0;
  const verified=asset.productionVerified===true?'verified':asset.productionVerified===false?'unverified':'unknown';
  const text=[row.title,row.id,categoryLabels[row.category]||row.category,forms[row.form]||row.form,row.role,
   source,asset.previewPath,folder,platform,asset.status,asset.runtimeVerificationState,asset.internalAuditGrade,
   asset.consumerGameIds?.join(' '),asset.intendedConsumerGameIds?.join(' '),asset.sourceRevision,asset.version,asset.sha256,
   verified==='verified'?'production verified':verified==='unverified'?'production unverified':''].filter(Boolean).join(' ').toLocaleLowerCase();
  return(!form||row.form===form)&&(!selectedFolder||selectedFolder===folder)
   &&(!selectedPlatform||selectedPlatform===platform)&&(!verification||verification===verified)
   &&(!sourceFilter||(sourceFilter==='shared'?sameSource>1:sourceFilter==='unique'?Boolean(source)&&sameSource===1:true))
   &&(!query||text.includes(query));
 });
 const list=$('assetList'),scrollTop=list.scrollTop,scrollLeft=list.scrollLeft,focused=document.activeElement?.dataset?.id;list.replaceChildren();
 $('resultCount').textContent=filtered.length+'개 / 전체 '+rows.length+'개';
 for(const row of filtered){
  const button=document.createElement('button');button.type='button';button.dataset.id=row.id;button.setAttribute('aria-pressed',String(row.id===selectedId));
  const title=document.createElement('strong');title.textContent=row.title;
  const detail=document.createElement('small');
  const preview=row.retiredPreview?'홈 미리보기 제외':row.atom?'3D 모션':row.sample?(row.category==='ENVIRONMENT'?'3차원 배경':'3차원 동작'):row.image?'등록 이미지':'미리보기 준비 중';
  const quality=row.asset?.internalAuditScore!==undefined?['품질 '+row.asset.internalAuditScore,row.asset?.internalAuditGrade].filter(Boolean).join(' / '):row.asset?.internalAuditGrade?'품질 '+row.asset.internalAuditGrade:'';
  const source=String(row.asset?.sourcePath||row.asset?.path||'').trim(),shared=sourceCounts.get(source)||0;
  detail.textContent=kind==='all'?[categoryLabels[row.category]||row.category,row.id,row.asset?.platform,row.asset?.status,shared>1?'같은 경로 '+shared+'개':'',quality,preview].filter(Boolean).join(' · '):kind==='monster'?(forms[row.form]||row.form)+(row.sample?' · 6가지 동작':row.image?' · 이미지':' · 준비 중'):kind==='common'?(row.atom?(row.role||'공용 R15 동작')+' · 3D 모션':'미리보기 준비 중'):(row.sample?'3차원 배경':row.image?'등록 이미지':'미리보기 준비 중');
  button.append(title,detail);button.addEventListener('click',()=>choose(row));list.append(button);
 }
 if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='찾는 자산이 없어. 이름이나 종류를 바꿔 봐.';list.append(empty);}
 list.scrollTop=scrollTop;list.scrollLeft=scrollLeft;
 if(focused)[...list.querySelectorAll('button')].find(button=>button.dataset.id===focused)?.focus({preventScroll:true});
}
function pauseLabel(){$('pauseMotion').textContent=paused?'재생':'멈춤';$('pauseMotion').setAttribute('aria-pressed',String(paused));}
function applyClip(id){
 selectedClip=id;viewer?.selectClip(id);
 for(const button of document.querySelectorAll('[data-clip]'))button.setAttribute('aria-pressed',String(button.dataset.clip===id));
 $('previewStatus').textContent=(clipNames[id]||id)+(paused?' · 멈춤':' · 재생')+(['attack','hit','death'].includes(id)?' · 다시 보려면 처음부터를 눌러 줘.':'');
}
function showClips(sample){
 for(const [target,ids]of [['basicClips',['idle','walk','chase']],['actionClips',['attack','hit','death']]]){
  $(target).replaceChildren();
  for(const id of ids.filter(id=>sample.clips.includes(id))){const button=document.createElement('button');button.type='button';button.dataset.clip=id;button.textContent=clipNames[id];button.addEventListener('click',()=>applyClip(id));$(target).append(button);}
 }
 if(!sample.clips.includes(selectedClip))selectedClip=sample.clips[0];applyClip(selectedClip);
}
function syncFeaturedButtons(){
 const available=new Set(publicAssets(registry.assets).map(row=>row.id));
 const monsters=new Map(manifest.monsters.map(row=>['roblox-world-ghost-'+row.id,row]));
 for(const [buttonId,assetId,clipId]of featuredTargets){const sample=monsters.get(assetId);$(buttonId).disabled=!(available.has(assetId)&&sample?.clips?.includes(clipId));}
}
async function openFeatured(assetId,clipId){
 if(!manifest||!registry)return;
 if(kind!=='monster')switchKind('monster');
 const row=rows.find(item=>item.id===assetId&&item.sample?.clips?.includes(clipId));if(!row)return;
 await choose(row,true);applyClip(clipId);
}
async function getViewer(){
 if(!viewerPromise)viewerPromise=import('./asset-library-viewer.js').then(module=>{viewer=module.createViewer($('assetCanvas'));viewer.setPaused(paused);return viewer;}).catch(error=>{viewerPromise=null;throw error;});
 return viewerPromise;
}
async function choose(row,force=false){
 const key=kind+':'+row.id+':'+(row.sample?.sha256||row.atom?.atomId||row.image);
 if(!force&&key===currentKey)return;
 const token=++selectionToken;currentKey='';selectedId=row.id;currentRow=row;
 for(const button of $('assetList').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.id===row.id));
 const category=row.category||row.asset?.category||row.asset?.family||'OTHER';
 const quality=row.asset?.internalAuditScore!==undefined?['내부 품질 '+row.asset.internalAuditScore,row.asset?.internalAuditGrade].filter(Boolean).join(' / '):row.asset?.internalAuditGrade?'내부 품질 '+row.asset.internalAuditGrade:'';
 const production=row.asset?.productionVerified===true?'productionVerified: 검증됨':row.asset?.productionVerified===false?'productionVerified: 미검증':'productionVerified: 미기재';
 const runtime=row.asset?.runtimeVerificationState?'runtimeVerificationState: '+row.asset.runtimeVerificationState:'runtimeVerificationState: 미기재';
 const consumers=Array.isArray(row.asset?.consumerGameIds)&&row.asset.consumerGameIds.length?'사용 게임: '+row.asset.consumerGameIds.join(', '):'';
 const sourcePath=String(row.asset?.sourcePath||row.asset?.path||'').trim();
 const sharedSource=sourcePath?(registry?.assets||[]).filter(asset=>String(asset?.sourcePath||asset?.path||'').trim()===sourcePath).length:0;
 const sourceInfo=sourcePath?'원본 경로: '+sourcePath:'원본 경로: 미기재';
 const sharedInfo=sharedSource>1?'동일 경로 등록 '+sharedSource+'개 · 실제 중복 여부는 별도 확인 필요':'';
 const sourceVersion=row.asset?.sourceRevision||row.asset?.version?'자산 버전: '+(row.asset.sourceRevision||row.asset.version):'';
 const registryVersion=registry?.version?'등록부 버전: '+registry.version:'';
 $('selectedTitle').textContent=row.title;$('selectedInfo').textContent=kind==='all'?['ID '+row.id,'카테고리 '+(categoryLabels[category]||category),'플랫폼 '+(row.asset?.platform||'미기재'),'상태 '+(row.asset?.status||'미기재'),quality,production,runtime,consumers,sourceInfo,sharedInfo,sourceVersion,registryVersion].filter(Boolean).join(' · '):kind==='monster'?[(forms[row.form]||row.form),row.role].filter(Boolean).join(' · '):kind==='common'?[row.atom?.atomId||'공용 R15',row.role].filter(Boolean).join(' · '):'게임을 채우는 환경 자산';
 $('assetType').textContent=kind==='all'?(categoryLabels[category]||category).toUpperCase():kind==='monster'?'MONSTER STUDIO':kind==='common'?'COMMON CHARACTER MOTION':'WORLD LIBRARY';
 $('assetCanvas').hidden=true;$('assetImage').hidden=true;$('motionControls').hidden=true;$('playbackControls').hidden=true;
 $('previewStatus').textContent='미리보기를 불러오는 중…';$('previewBadge').textContent='불러오는 중';
 try{
  if(row.retiredPreview){
   $('previewBadge').textContent='목록 공개';$('previewStatus').textContent='등록 정보는 공개 중이지만 기존 요청에 따라 이 자산의 홈 미리보기는 제외돼 있어.';
   $('verificationNote').textContent='원본/재사용 기록은 라이브러리에 유지돼.';
  }else if(row.atom){
   const activeViewer=await getViewer();if(token!==selectionToken)return;
   $('assetCanvas').hidden=false;activeViewer.setCommonMotion(row.atom);
   $('playbackControls').hidden=false;$('motionControls').hidden=true;
   $('pauseMotion').hidden=false;$('replayMotion').hidden=false;$('playbackSpeed').parentElement.hidden=false;
   $('previewBadge').textContent='모션 재생';$('previewStatus').textContent='회사 공용 R15 '+row.title+' · '+(row.atom.duration||0)+'초 · '+(row.atom.looped?'반복':'단발');
   $('verificationNote').textContent='웹 3D R15 동작 시각화 · Roblox Studio Animator 실제 재생 검수 전이야.';
  }else if(row.sample){
   if(!validSamplePath(row.sample.path))throw Error('미리보기 경로를 확인하고 있어.');
   const fingerprint=manifest.sourceFingerprint;
   let data=cache.get(row.sample.sha256);
   if(!data){
    const response=await request(row.sample.path),bytes=await response.arrayBuffer();
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!==row.sample.sha256)throw Error('새 자산이 배포 중이야. 잠시 후 자동으로 다시 연결할게.');
    data=JSON.parse(new TextDecoder().decode(bytes));
    if(data.sourceFingerprint!==fingerprint||data.sampledBy!=='OFFICIAL_LUAU'||data.id!==row.sample.id)throw Error('자산 버전을 다시 확인하고 있어.');
    cache.set(row.sample.sha256,data);while(cache.size>5)cache.delete(cache.keys().next().value);
   }
   const activeViewer=await getViewer();if(token!==selectionToken)return;
   const environmentPreview=category==='ENVIRONMENT';
   $('assetCanvas').hidden=false;activeViewer.setModel(data,environmentPreview);
   $('playbackControls').hidden=false;
   for(const id of ['pauseMotion','replayMotion'])$(id).hidden=environmentPreview;
   $('playbackSpeed').parentElement.hidden=environmentPreview;
   $('motionControls').hidden=category!=='CREATURE';
   if(category==='CREATURE')showClips(row.sample);else $('previewStatus').textContent='실제 배경 소스로 만든 3차원 미리보기 · 각도를 바꿔서 살펴봐.';
   $('previewBadge').textContent='3차원 미리보기';
   $('verificationNote').textContent='소스 동작 재생 · 로블록스 안에서의 품질 검수 전이야.';
  }else if(row.image){
   const image=$('assetImage');image.alt=row.title;image.hidden=false;
   image.onerror=()=>{if(token===selectionToken){image.hidden=true;currentKey='';$('previewStatus').textContent='이미지를 불러오지 못했어. 새로고침으로 다시 확인해 줘.';}};
   image.src=row.image;
   $('previewBadge').textContent='등록 이미지';$('previewStatus').textContent=row.sharedImage?'이 자산이 포함된 팩의 대표 이미지야.':'등록된 자산 이미지야.';
   $('verificationNote').textContent='동작 재생은 3차원 미리보기가 연결된 자산에서 볼 수 있어.';
  }else{
   $('previewBadge').textContent='준비 중';$('previewStatus').textContent='등록된 자산이야. 재생 가능한 미리보기를 준비하고 있어.';
   $('verificationNote').textContent='미리보기가 배포되면 자동으로 여기에 연결돼.';
  }
  if(token===selectionToken)currentKey=key;
 }catch(error){if(token!==selectionToken)return;$('previewBadge').textContent='연결 확인 중';$('previewStatus').textContent=error.message||'미리보기를 연결하지 못했어. 새로고침으로 다시 시도해 줘.';}
}
async function refresh(force=false){
 if(refreshing)return;refreshing=true;$('refreshAssets').disabled=true;
 try{
  const [nextManifest,nextRegistry]=await Promise.all([request(MANIFEST).then(response=>response.json()),readRegistry()]);
  if(nextManifest.schemaVersion!==1||nextManifest.sampledBy!=='OFFICIAL_LUAU'||!Array.isArray(nextManifest.monsters)||!Array.isArray(nextManifest.environments)||!Array.isArray(nextManifest.commonMotions))throw Error('미리보기 목록을 확인하고 있어.');
  const nextRegistrySignature=nextRegistry===registry?registryViewSignature:registrySignature(nextRegistry);
  const changed=!manifest||manifest.sourceFingerprint!==nextManifest.sourceFingerprint||registryViewSignature!==nextRegistrySignature;
  manifest=nextManifest;registry=nextRegistry;registryViewSignature=nextRegistrySignature;syncFeaturedButtons();
  $('assetCount').textContent=registry.assets.length.toLocaleString('ko-KR');
  // 등록 경로 수는 파일 존재 또는 실제 제작 검증 수와 같지 않다.
  $('sourcePathCount').textContent=new Set(registry.assets.map(asset=>String(asset?.sourcePath||asset?.path||'').trim()).filter(Boolean)).size.toLocaleString('ko-KR');
  $('productionMarkCount').textContent=registry.assets.filter(asset=>asset?.productionVerified===true).length.toLocaleString('ko-KR');
  $('allCount').textContent=registry.assets.length;
  $('monsterCount').textContent=publicAssets(registry.assets).filter(row=>row.category==='CREATURE').length;
  $('environmentCount').textContent=publicAssets(registry.assets).filter(row=>row.category==='ENVIRONMENT').length;
  $('commonCount').textContent=publicAssets(registry.assets).filter(row=>row.category==='MOTION').length;
  if(changed||force||!currentKey){rows=allRows();updateFilters();showList();const selected=rows.find(row=>row.id===selectedId)||rows.find(row=>row.sample?.id==='ghoul')||rows[0];if(selected)await choose(selected,force);}
  $('syncStatus').textContent='자동 동기화 연결됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+' 확인';
 }catch(error){$('syncStatus').textContent=(registry?'이전 목록을 표시 중이야. ':'')+(error.message||'자산 정보를 불러오지 못했어.')+' 새로고침으로 다시 시도할 수 있어.';}
 finally{refreshing=false;$('refreshAssets').disabled=false;}
}
function switchKind(next){
 if(kind===next)return;kind=next;selectedId='';currentKey='';selectionToken++;
 $('allTab').setAttribute('aria-pressed',String(kind==='all'));$('monsterTab').setAttribute('aria-pressed',String(kind==='monster'));$('commonTab').setAttribute('aria-pressed',String(kind==='common'));$('environmentTab').setAttribute('aria-pressed',String(kind==='environment'));
 $('formFilter').hidden=!(kind==='monster'||kind==='all');$('formLabel').hidden=!(kind==='monster'||kind==='all');$('assetSearch').value='';
 $('formLabel').textContent=kind==='all'?'자산군':'몬스터 종류';
 $('assetSearch').placeholder=kind==='all'?'이름·원본 경로·사용 게임 검색':kind==='monster'?'몬스터·원본 경로 검색':kind==='common'?'동작·원본 경로 검색':'배경·원본 경로 검색';
 if(!manifest||!registry)return;rows=allRows();updateFilters();showList();const initial=rows.find(row=>row.sample||row.atom||row.image)||rows[0];if(initial)choose(initial);
}
for(const [buttonId,assetId,clipId]of featuredTargets)$(buttonId).addEventListener('click',()=>openFeatured(assetId,clipId));
$('allTab').addEventListener('click',()=>switchKind('all'));$('monsterTab').addEventListener('click',()=>switchKind('monster'));$('commonTab').addEventListener('click',()=>switchKind('common'));$('environmentTab').addEventListener('click',()=>switchKind('environment'));
$('assetSearch').addEventListener('input',showList);$('formFilter').addEventListener('change',showList);for(const id of ['folderFilter','platformFilter','verificationFilter','sourceFilter'])$(id).addEventListener('change',showList);
$('refreshAssets').addEventListener('click',()=>refresh(true));
$('pauseMotion').addEventListener('click',()=>{paused=!paused;viewer?.setPaused(paused);pauseLabel();$('previewStatus').textContent=(kind==='common'?(currentRow?.title||'공용 R15 동작'):(clipNames[selectedClip]||selectedClip))+(paused?' · 멈춤':' · 재생');});
$('replayMotion').addEventListener('click',()=>{paused=false;viewer?.setPaused(false);viewer?.replay();pauseLabel();$('previewStatus').textContent=(kind==='common'?(currentRow?.title||'공용 R15 동작'):(clipNames[selectedClip]||selectedClip))+' · 재생';});
$('playbackSpeed').addEventListener('change',()=>viewer?.setSpeed(Number($('playbackSpeed').value)));
$('viewAngle').addEventListener('input',()=>viewer?.setAngle(Number($('viewAngle').value)));
$('assetCanvas').addEventListener('previewlost',()=>{$('previewStatus').textContent='화면 연결이 끊겼어. 페이지를 새로 열어 줘.';});
setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
pauseLabel();refresh();
