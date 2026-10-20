// Non-invasive runtime asset browser for published games. Does not alter gameplay controls.
(()=>{'use strict';
const script=document.currentScript;
const base=script?.src?new URL(script.src):new URL('/assets/vibe-runtime-panel.js',location.href);
const root=new URL('../',base);
const manifestUrl=new URL('web-games/vibe-asset-profiles.json',root);
const gameId=location.pathname.match(/\/web-games\/([a-z0-9-]+)\//)?.[1];
// Developer asset inspection is explicit opt-in ONLY. A copied legacy script
// in a public game's HTML must never spawn the floating "에셋" button.
// Keep the inspector usable on developer-owned previews via a deliberate
// <script data-vibe-owner-inspector="enabled" ...> inclusion.
if(script?.dataset?.vibeOwnerInspector!=='enabled'||!gameId||document.getElementById('vibe-assets-launcher'))return;
const css=document.createElement('style');
css.textContent=`#vibe-assets-launcher{position:fixed;right:12px;bottom:12px;z-index:2147483000;padding:10px 14px;background:#152339;color:white;border:1px solid #85baff;border-radius:12px;font:600 14px system-ui;cursor:pointer}#vibe-assets-panel{position:fixed;inset:auto 12px 62px auto;width:min(420px,calc(100vw - 24px));max-height:min(65vh,600px);overflow:auto;z-index:2147483000;background:#101b2e;color:#fff;border:1px solid #85baff;border-radius:14px;padding:16px;font:14px/1.5 system-ui;box-shadow:0 12px 38px #0009}#vibe-assets-panel[hidden]{display:none}#vibe-assets-panel a{color:#9cdbff}#vibe-assets-panel button{cursor:pointer}#vibe-assets-panel img{max-width:100%;max-height:160px;object-fit:contain}#vibe-assets-panel ul{padding-left:20px}#vibe-assets-panel li{margin:8px 0;overflow-wrap:anywhere}`;
document.head.append(css);
// Optional visual polish affects only the asset panel, not game HUD or gameplay.
const polish=document.createElement('style');
polish.textContent=`#vibe-assets-panel{background:linear-gradient(145deg,#172d48 0%,#0b1324 72%);border:1px solid #659cd2;backdrop-filter:blur(12px);box-shadow:0 18px 55px #000b,0 0 0 1px #ffffff12 inset}#vibe-assets-panel strong{font-size:17px;letter-spacing:.02em}#vibe-assets-panel li{padding:9px 8px;border-radius:9px;background:#ffffff0a;border:1px solid #ffffff14;transition:background .16s ease}#vibe-assets-panel li:hover{background:#ffffff17}#vibe-assets-panel button:focus-visible,#vibe-assets-panel input:focus-visible,#vibe-assets-panel select:focus-visible,#vibe-assets-launcher:focus-visible{outline:3px solid #ffdb74;outline-offset:2px}#vibe-assets-launcher{background:linear-gradient(120deg,#29578c,#19314f);box-shadow:0 6px 20px #0008}#vibe-assets-panel img{border-radius:8px;border:1px solid #ffffff1a;margin-top:8px}@media(prefers-reduced-motion:reduce){#vibe-assets-panel li{transition:none}}@media(max-width:520px){#vibe-assets-panel{left:8px;right:8px;bottom:60px;width:auto;max-height:65dvh;padding:12px}#vibe-assets-launcher{bottom:max(10px,env(safe-area-inset-bottom));right:10px}}`;
document.head.append(polish);
const button=document.createElement('button');button.id='vibe-assets-launcher';button.type='button';button.textContent='에셋';button.setAttribute('aria-controls','vibe-assets-panel');button.setAttribute('aria-expanded','false');
const panel=document.createElement('section');panel.id='vibe-assets-panel';panel.hidden=true;panel.setAttribute('aria-label','게임 에셋 라이브러리');
const title=document.createElement('strong');title.textContent='게임 에셋 라이브러리';
const close=document.createElement('button');close.type='button';close.textContent='닫기';close.style.cssText='float:right';
const status=document.createElement('p');status.textContent='에셋 후보 불러오는 중';
const search=document.createElement('input');search.type='search';search.placeholder='에셋 이름·유형 검색';search.setAttribute('aria-label','에셋 검색');search.style.cssText='box-sizing:border-box;width:100%;margin:10px 0;padding:9px;border-radius:8px;border:1px solid #85baff;background:#0c1627;color:#fff';
const kind=document.createElement('select');kind.setAttribute('aria-label','에셋 유형');kind.style.cssText='width:100%;padding:8px;border-radius:8px;background:#0c1627;color:#fff';
for(const [value,label] of [['','전체'],['model','3D 모델'],['texture','이미지·텍스처'],['font','폰트'],['audio','오디오'],['ui','UI'],['data','데이터']]){const option=document.createElement('option');option.value=value;option.textContent=label;kind.append(option)}
const favorites=new Set();try{for(const key of JSON.parse(localStorage.getItem('vibe-asset-favorites:'+gameId)||'[]'))if(typeof key==='string')favorites.add(key)}catch{}
const favoriteOnly=document.createElement('label');favoriteOnly.style.cssText='display:block;margin-top:8px';const favoriteCheck=document.createElement('input');favoriteCheck.type='checkbox';favoriteOnly.append(favoriteCheck,document.createTextNode(' 즐겨찾기만 표시'));
const genre=document.createElement('select');genre.setAttribute('aria-label','장르 비주얼 테마');genre.style.cssText='width:100%;padding:8px;margin-top:8px;border-radius:8px;background:#0c1627;color:#fff';for(const [value,label] of [['realistic','실사'],['fantasy','판타지'],['scifi','SF'],['horror','호러'],['cartoon','카툰']]){const option=document.createElement('option');option.value=value;option.textContent=label;genre.append(option)}
const themeInfo=document.createElement('p');themeInfo.setAttribute('aria-live','polite');themeInfo.style.cssText='font-size:12px;opacity:.8';
fetch(new URL('assets/vibe-visual-design-system.json',root)).then(response=>response.ok?response.json():Promise.reject(Error('design system unavailable'))).then(design=>{const update=()=>{const preset=design.genres?.[genre.value];if(!preset)return;panel.style.borderColor=preset.palette.primary;panel.style.background='linear-gradient(145deg,'+preset.palette.surface+',#0b1324)';button.style.borderColor=preset.palette.accent;themeInfo.textContent='캐릭터: '+preset.character.material+' · 하우징: '+preset.housing.wall+' · 메뉴: '+preset.menu.style};genre.addEventListener('change',update);update()}).catch(()=>{themeInfo.textContent='장르 디자인 설정을 불러올 수 없습니다.'});
const list=document.createElement('ul');
panel.append(title,close,status,search,kind,genre,themeInfo,favoriteOnly,list);document.body.append(button,panel);
function toggle(show){panel.hidden=!show;button.setAttribute('aria-expanded',String(show));if(show)close.focus();else button.focus()}
button.addEventListener('click',()=>toggle(panel.hidden));close.addEventListener('click',()=>toggle(false));panel.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
fetch(manifestUrl).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
 const profile=data?.profiles?.[gameId];if(!profile)throw Error('게임 프로필 없음');
 const candidates=Array.isArray(profile.assetCandidates)?profile.assetCandidates:[];
 status.textContent=`사용 가능한 라이브러리 파일 ${profile.availableAssetCount||0}개 · 관련 후보 ${candidates.length}개 (미리보기, 자동 장착 아님)`;
 const render=()=>{list.replaceChildren();let count=0;const query=search.value.trim().toLowerCase();
 for(const item of candidates){if(count>=80)break;if(kind.value&&item.role!==kind.value)continue;if(favoriteCheck.checked&&!favorites.has(item.path))continue;if(query&&!item.path.toLowerCase().includes(query)&&!String(item.role).includes(query))continue;count++;
  if(typeof item.path!=='string'||!/^assets\/[a-zA-Z0-9._/-]+$/.test(item.path)||item.path.includes('..'))continue;
  const li=document.createElement('li');const a=document.createElement('a');a.href=new URL(item.path,root).href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.path.split('/').pop()+' ['+item.role+']';li.append(a);const star=document.createElement('button');star.type='button';star.textContent=favorites.has(item.path)?'★':'☆';star.setAttribute('aria-label',favorites.has(item.path)?'즐겨찾기 해제':'즐겨찾기 추가');star.style.cssText='margin-left:8px;padding:3px 8px';star.addEventListener('click',()=>{if(favorites.has(item.path))favorites.delete(item.path);else favorites.add(item.path);try{localStorage.setItem('vibe-asset-favorites:'+gameId,JSON.stringify([...favorites].slice(0,500)))}catch{}render()});li.append(star);
  if(item.role==='texture'){const img=document.createElement('img');img.loading='lazy';img.alt='';img.src=a.href;li.append(document.createElement('br'),img)}
  if(item.role==='model'&&/\\.(?:glb|gltf)$/i.test(item.path)){
   const preview=document.createElement('button');preview.type='button';preview.textContent='3D 미리보기';preview.style.cssText='margin-left:8px;padding:4px 8px;border-radius:6px';
   preview.addEventListener('click',async()=>{
    let frame=li.querySelector('iframe');if(frame){frame.remove();return}
    frame=document.createElement('iframe');frame.title='3D 모델 미리보기';frame.loading='lazy';frame.style.cssText='display:block;width:100%;height:240px;border:0;background:#182238;margin-top:8px';
    const viewer=new URL('assets/vibe-model-preview.html',root);viewer.searchParams.set('asset',item.path);frame.src=viewer.href;li.append(frame);
   });li.append(preview);
  }
  list.append(li);
 }
 if(!list.children.length){const li=document.createElement('li');li.textContent='검색 조건에 맞는 에셋이 없습니다.';list.append(li)}
 };search.addEventListener('input',render);kind.addEventListener('change',render);favoriteCheck.addEventListener('change',render);render();
}).catch(err=>{status.textContent='에셋 목록을 불러오지 못했습니다: '+err.message});
})();
