const $=id=>document.getElementById(id);
const MANIFEST='/assets/roblox/world-ghosts/native/asset-gallery.json';
const SYNC_INTERVAL_MS=30000;
const forms={SHROUD:'망령형',TALL:'장신형',SLENDER:'인간형',GIANT:'거인형',STOCKY:'강건형',BEAST:'짐승형',SERPENT:'뱀형',ARACHNID:'거미형',CENTAUR:'반인반수형',FLOATING_HEAD:'부유 머리형',OBJECT_SWARM:'군집형',RIBBON:'띠형',LANTERN:'등불형',WHEEL:'바퀴형',WALL:'벽형',BOUND:'속박형',OTHER:'기타'};
const biomes={forest:'숲',snow:'설원',desert:'사막',swamp:'늪',cave:'동굴',coast:'해안',village:'마을',city:'도시',ruins:'폐허',dungeon:'던전'};
const clipNames={idle:'대기',walk:'걷기',chase:'추격',attack:'공격',hit:'피격',death:'쓰러짐'};
let manifest=null,registry=null,registryEtag=null,rows=[],kind='monster',selectedId='',selectionToken=0,currentKey='',currentRow=null;
let viewer=null,viewerPromise=null,refreshing=false,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,selectedClip='idle';
const cache=new Map();
const localImage=value=>typeof value==='string'&&/^\/(assets|web-games)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg|avif)$/i.test(value)&&!value.split('/').includes('..')?value:'';
const validSamplePath=value=>typeof value==='string'&&/^\/assets\/roblox\/world-ghosts\/native\/gallery\/(monster|environment)-[a-z0-9-]+\.json$/.test(value);
async function request(url,options={}){
 const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000),...options});
 if(!response.ok)throw Error('자산 서버에 연결하지 못했어.');return response;
}
async function readRegistry(){
 if(registry&&registryEtag){const head=await request('/company-asset-library.json',{method:'HEAD'});if(head.headers.get('etag')===registryEtag)return registry;}
 const response=await request('/company-asset-library.json');
 const next=await response.json();if(!Array.isArray(next.assets))throw Error('자산 목록을 확인하고 있어.');
 registryEtag=response.headers.get('etag');return next;
}
function allRows(){
 const monsters=new Map(manifest.monsters.map(row=>['roblox-world-ghost-'+row.id,row]));
 const environments=new Map(manifest.environments.map(row=>['roblox-common-environment-'+row.id,row]));
 return registry.assets.filter(row=>row.category===(kind==='monster'?'CREATURE':'ENVIRONMENT')).map(asset=>{
  const sample=(kind==='monster'?monsters:environments).get(asset.id);
  return {id:asset.id,title:sample?(kind==='environment'?biomes[sample.id]||sample.title:sample.title):asset.title||asset.id,
   form:sample?.form||'OTHER',role:sample?.role||'',sample,image:localImage(asset.previewPath)||localImage(asset.path),
   sharedImage:Boolean(asset.previewPath&&asset.previewPath!==asset.path)};
 });
}
function updateFilters(){
 const old=$('formFilter').value;
 $('formFilter').replaceChildren(new Option('모든 종류',''));
 for(const form of [...new Set(rows.map(row=>row.form))].sort())$('formFilter').add(new Option(forms[form]||form,form));
 if([...$('formFilter').options].some(option=>option.value===old))$('formFilter').value=old;
}
function showList(){
 const query=$('assetSearch').value.trim().toLocaleLowerCase(),form=kind==='monster'?$('formFilter').value:'';
 const filtered=rows.filter(row=>(!form||row.form===form)&&(!query||(row.title+' '+row.id+' '+(forms[row.form]||row.form)).toLocaleLowerCase().includes(query)));
 const list=$('assetList');list.replaceChildren();
 $('resultCount').textContent=filtered.length+'개 / 전체 '+rows.length+'개';
 for(const row of filtered){
  const button=document.createElement('button');button.type='button';button.dataset.id=row.id;button.setAttribute('aria-pressed',String(row.id===selectedId));
  const title=document.createElement('strong');title.textContent=row.title;
  const detail=document.createElement('small');detail.textContent=kind==='monster'?(forms[row.form]||row.form)+(row.sample?' · 6가지 동작':row.image?' · 이미지':' · 준비 중'):(row.sample?'3차원 배경':row.image?'등록 이미지':'미리보기 준비 중');
  button.append(title,detail);button.addEventListener('click',()=>choose(row));list.append(button);
 }
 if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='찾는 자산이 없어. 이름이나 종류를 바꿔 봐.';list.append(empty);}
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
async function getViewer(){
 if(!viewerPromise)viewerPromise=import('./asset-library-viewer.js').then(module=>{viewer=module.createViewer($('assetCanvas'));viewer.setPaused(paused);return viewer;}).catch(error=>{viewerPromise=null;throw error;});
 return viewerPromise;
}
async function choose(row,force=false){
 const key=kind+':'+row.id+':'+(row.sample?.sha256||row.image);
 if(!force&&key===currentKey)return;
 const token=++selectionToken;currentKey='';selectedId=row.id;currentRow=row;
 for(const button of $('assetList').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.id===row.id));
 $('selectedTitle').textContent=row.title;$('selectedInfo').textContent=kind==='monster'?[(forms[row.form]||row.form),row.role].filter(Boolean).join(' · '):'게임을 채우는 환경 자산';
 $('assetType').textContent=kind==='monster'?'MONSTER STUDIO':'WORLD LIBRARY';
 $('assetCanvas').hidden=true;$('assetImage').hidden=true;$('motionControls').hidden=true;$('playbackControls').hidden=true;
 $('previewStatus').textContent='미리보기를 불러오는 중…';$('previewBadge').textContent='불러오는 중';
 try{
  if(row.sample){
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
   $('assetCanvas').hidden=false;activeViewer.setModel(data,kind==='environment');
   $('playbackControls').hidden=false;
   for(const id of ['pauseMotion','replayMotion'])$(id).hidden=kind!=='monster';
   $('playbackSpeed').parentElement.hidden=kind!=='monster';
   $('motionControls').hidden=kind!=='monster';
   if(kind==='monster')showClips(row.sample);else $('previewStatus').textContent='실제 배경 소스로 만든 3차원 미리보기 · 각도를 바꿔서 살펴봐.';
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
  if(nextManifest.schemaVersion!==1||nextManifest.sampledBy!=='OFFICIAL_LUAU'||!Array.isArray(nextManifest.monsters)||!Array.isArray(nextManifest.environments))throw Error('미리보기 목록을 확인하고 있어.');
  const changed=!manifest||manifest.sourceFingerprint!==nextManifest.sourceFingerprint||registry!==nextRegistry;
  manifest=nextManifest;registry=nextRegistry;
  $('assetCount').textContent=registry.assets.length.toLocaleString('ko-KR');
  $('monsterCount').textContent=registry.assets.filter(row=>row.category==='CREATURE').length;
  $('environmentCount').textContent=registry.assets.filter(row=>row.category==='ENVIRONMENT').length;
  if(changed||force||!currentKey){rows=allRows();updateFilters();showList();const selected=rows.find(row=>row.id===selectedId)||rows.find(row=>row.sample?.id==='ghoul')||rows[0];if(selected)await choose(selected,force);}
  $('syncStatus').textContent='자동 동기화 연결됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+' 확인';
 }catch(error){$('syncStatus').textContent=(registry?'이전 목록을 표시 중이야. ':'')+(error.message||'자산 정보를 불러오지 못했어.')+' 새로고침으로 다시 시도할 수 있어.';}
 finally{refreshing=false;$('refreshAssets').disabled=false;}
}
function switchKind(next){
 if(kind===next)return;kind=next;selectedId='';currentKey='';selectionToken++;
 $('monsterTab').setAttribute('aria-pressed',String(kind==='monster'));$('environmentTab').setAttribute('aria-pressed',String(kind==='environment'));
 $('formFilter').hidden=kind!=='monster';$('formLabel').hidden=kind!=='monster';$('assetSearch').value='';$('assetSearch').placeholder=kind==='monster'?'몬스터 이름 검색':'배경 이름 검색';
 if(!manifest||!registry)return;rows=allRows();updateFilters();showList();const initial=rows.find(row=>row.sample)||rows[0];if(initial)choose(initial);
}
$('monsterTab').addEventListener('click',()=>switchKind('monster'));$('environmentTab').addEventListener('click',()=>switchKind('environment'));
$('assetSearch').addEventListener('input',showList);$('formFilter').addEventListener('change',showList);
$('refreshAssets').addEventListener('click',()=>refresh(true));
$('pauseMotion').addEventListener('click',()=>{paused=!paused;viewer?.setPaused(paused);pauseLabel();$('previewStatus').textContent=(clipNames[selectedClip]||selectedClip)+(paused?' · 멈춤':' · 재생');});
$('replayMotion').addEventListener('click',()=>{paused=false;viewer?.setPaused(false);viewer?.replay();pauseLabel();$('previewStatus').textContent=(clipNames[selectedClip]||selectedClip)+' · 재생';});
$('playbackSpeed').addEventListener('change',()=>viewer?.setSpeed(Number($('playbackSpeed').value)));
$('viewAngle').addEventListener('input',()=>viewer?.setAngle(Number($('viewAngle').value)));
$('assetCanvas').addEventListener('previewlost',()=>{$('previewStatus').textContent='화면 연결이 끊겼어. 페이지를 새로 열어 줘.';});
setInterval(()=>{if(!document.hidden)refresh();},SYNC_INTERVAL_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
pauseLabel();refresh();
