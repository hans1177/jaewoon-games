// Non-invasive runtime asset browser for published games. Does not alter gameplay controls.
(()=>{'use strict';
const script=document.currentScript;
const base=script?.src?new URL(script.src):new URL('/assets/vibe-runtime-panel.js',location.href);
const root=new URL('../',base);
const manifestUrl=new URL('web-games/vibe-asset-profiles.json',root);
const gameId=location.pathname.match(/\/web-games\/([a-z0-9-]+)\//)?.[1];
if(!gameId||document.getElementById('vibe-assets-launcher'))return;
const css=document.createElement('style');
css.textContent=`#vibe-assets-launcher{position:fixed;right:12px;bottom:12px;z-index:2147483000;padding:10px 14px;background:#152339;color:white;border:1px solid #85baff;border-radius:12px;font:600 14px system-ui;cursor:pointer}#vibe-assets-panel{position:fixed;inset:auto 12px 62px auto;width:min(420px,calc(100vw - 24px));max-height:min(65vh,600px);overflow:auto;z-index:2147483000;background:#101b2e;color:#fff;border:1px solid #85baff;border-radius:14px;padding:16px;font:14px/1.5 system-ui;box-shadow:0 12px 38px #0009}#vibe-assets-panel[hidden]{display:none}#vibe-assets-panel a{color:#9cdbff}#vibe-assets-panel button{cursor:pointer}#vibe-assets-panel img{max-width:100%;max-height:160px;object-fit:contain}#vibe-assets-panel ul{padding-left:20px}#vibe-assets-panel li{margin:8px 0;overflow-wrap:anywhere}`;
document.head.append(css);
const button=document.createElement('button');button.id='vibe-assets-launcher';button.type='button';button.textContent='에셋';button.setAttribute('aria-controls','vibe-assets-panel');button.setAttribute('aria-expanded','false');
const panel=document.createElement('section');panel.id='vibe-assets-panel';panel.hidden=true;panel.setAttribute('aria-label','게임 에셋 라이브러리');
const title=document.createElement('strong');title.textContent='게임 에셋 라이브러리';
const close=document.createElement('button');close.type='button';close.textContent='닫기';close.style.cssText='float:right';
const status=document.createElement('p');status.textContent='에셋 후보 불러오는 중';
const list=document.createElement('ul');
panel.append(title,close,status,list);document.body.append(button,panel);
function toggle(show){panel.hidden=!show;button.setAttribute('aria-expanded',String(show));if(show)close.focus();else button.focus()}
button.addEventListener('click',()=>toggle(panel.hidden));close.addEventListener('click',()=>toggle(false));panel.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
fetch(manifestUrl).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
 const profile=data?.profiles?.[gameId];if(!profile)throw Error('게임 프로필 없음');
 const candidates=Array.isArray(profile.assetCandidates)?profile.assetCandidates:[];
 status.textContent=`사용 가능한 라이브러리 파일 ${profile.availableAssetCount||0}개 · 관련 후보 ${candidates.length}개 (미리보기, 자동 장착 아님)`;
 for(const item of candidates.slice(0,80)){
  if(typeof item.path!=='string'||!/^assets\/[a-zA-Z0-9._/-]+$/.test(item.path)||item.path.includes('..'))continue;
  const li=document.createElement('li');const a=document.createElement('a');a.href=new URL(item.path,root).href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.path.split('/').pop()+' ['+item.role+']';li.append(a);
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
 if(!list.children.length){const li=document.createElement('li');li.textContent='게임 콘셉트에 일치하는 후보가 없습니다.';list.append(li)}
}).catch(err=>{status.textContent='에셋 목록을 불러오지 못했습니다: '+err.message});
})();
