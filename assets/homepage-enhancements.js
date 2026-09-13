import './homepage-enhancements-core.js?v=20260913-webgame-publish-1';

function bindNativeApkInstall(){
  const bind=()=>{
    const button=document.getElementById('appInstallBtn');
    const state=document.getElementById('appInstallState');
    if(!button)return;
    button.disabled=false;
    button.textContent='재운컴퍼니 APK 설치';
    if(state)state.textContent='안드로이드 앱 설치 파일을 직접 내려받아.';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href='/downloads/jaewoon-company.apk';
    },true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
}

async function publishWebGames(){
  const mount=async()=>{
    if(document.getElementById('publishedWebGames'))return;
    let catalog=null;
    try{
      const response=await fetch('/game-catalog.json?ts='+Date.now(),{cache:'no-store'});
      if(response.ok)catalog=await response.json();
    }catch{}
    const games=(catalog?.games||[]).filter(game=>game.homepageWebPlayable===true&&game.webPath);
    if(!games.length)return;
    const section=document.createElement('section');
    section.id='publishedWebGames';
    section.setAttribute('aria-label','웹게임 바로 플레이');
    section.innerHTML=`<style>
#publishedWebGames{width:96%;margin:0 auto 12px;padding:12px;border:1px solid rgba(211,233,245,.98);border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 10px 26px rgba(28,93,138,.16)}
#publishedWebGames h2{margin:0 0 9px;color:#155e9f;font-size:18px;font-weight:900}
#publishedWebGames .webGameLinks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#publishedWebGames a{display:flex;min-height:42px;align-items:center;justify-content:center;padding:7px 9px;border-radius:11px;background:#2488df;color:#fff;text-decoration:none;text-align:center;font-size:11px;font-weight:900}
@media(max-width:520px){#publishedWebGames .webGameLinks{grid-template-columns:1fr}}
</style><h2>웹게임 바로 플레이</h2><div class="webGameLinks">${games.map(game=>`<a href="${String(game.webPath).replace(/"/g,'&quot;')}">${String(game.name||game.id).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}</a>`).join('')}</div>`;
    const installBar=document.querySelector('.appInstallBar');
    const hero=document.getElementById('hero');
    if(installBar)installBar.insertAdjacentElement('afterend',section);
    else if(hero)hero.insertAdjacentElement('beforebegin',section);
    else document.querySelector('.shell')?.prepend(section);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else await mount();
}

bindNativeApkInstall();
publishWebGames();
