(function(){
  'use strict';

  var bookEl=document.getElementById('book');
  var modal=document.getElementById('reviewModal');
  var modalContent=document.getElementById('reviewContent');
  var closeBtn=document.getElementById('reviewClose');
  var footer=document.querySelector('.footer');
  var roleNames={vibe2:'Vibe2 1차 초안',planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스',director:'총괄'};

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function pathOf(v){v=String(v||'').trim();if(!v)return '/assets/mock.webp';return v.charAt(0)==='/'?v:'/'+v;}
  function getParam(name){var m=new RegExp('[?&]'+name+'=([^&#]*)').exec(location.search);return m?decodeURIComponent(m[1].replace(/\+/g,' ')):'';}
  function loadJson(url,done){
    var xhr=new XMLHttpRequest();
    xhr.open('GET',url+(url.indexOf('?')>=0?'&':'?')+'ts='+Date.now(),true);
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4)return;
      if(xhr.status>=200&&xhr.status<300){try{done(null,JSON.parse(xhr.responseText));}catch(e){done(e);}}
      else done(new Error('HTTP '+xhr.status+' '+url));
    };
    xhr.onerror=function(){done(new Error('network '+url));};
    xhr.send();
  }
  function validCount(n){return n===10||(n>=12&&n<=30);}
  function showError(message){
    bookEl.innerHTML='<div class="head"><small>GAME ARTBOOK</small><h1>아트북 준비중</h1><p>확정된 최신 아트북이 아직 공개되지 않았어.</p></div><div class="status"><b>설계 기준선 통과 후 자동 공개돼.</b>'+esc(message||'공개 아트북 없음')+'</div>';
    if(footer)footer.textContent='DESIGN_BASELINE 통과 후 최신 아트북 자동 공개';
  }
  function latestBook(registry,gameId){
    var books=(registry&&registry.artbooks)||[];
    var list=[];
    for(var i=0;i<books.length;i++){
      var b=books[i],count=(b&&b.cuts&&b.cuts.length)||Number(b&&b.cutCount)||0;
      var core=!!(b&&b.format==='core-strategy'&&b.content);
      if(b&&b.gameId===gameId&&(b.status==='completed-artbook'||b.status==='COMPLETED')&&(core||validCount(count)))list.push(b);
    }
    list.sort(function(a,b){var byDate=String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||''));return byDate||((Number(b.edition)||0)-(Number(a.edition)||0));});
    return list[0]||null;
  }
  function stars(v){var n=Math.round(Number(v)||0),s='';for(var i=0;i<5;i++)s+=i<n?'★':'☆';return s+' '+(Number(v)||0).toFixed(1)+'/5';}
  function reviewHtml(item){
    var opinions=item.departmentOpinions||{};
    var summary=item.ratingSummary||{};
    var html='';
    if(isFinite(Number(summary.overallAverageStars)))html+='<div class="avg">전체 부서 평균 '+Number(summary.overallAverageStars).toFixed(2)+'/5</div>';
    var roles=['planning','graphics','development','qa','balance'];
    for(var i=0;i<roles.length;i++){
      var r=roles[i],o=opinions[r]||{};
      html+='<article class="review"><h3><span>'+esc(roleNames[r])+'</span><span>'+esc(isFinite(Number(o.averageStars))?stars(o.averageStars):'평가 대기')+'</span></h3><div><b>보완점</b> · '+esc(o.priorityImprovement||'평가 대기')+'</div></article>';
    }
    return html||'<div class="avg">평가 정보 없음</div>';
  }
  function bindReview(item){var btn=document.getElementById('reviewOpen');if(btn)btn.onclick=function(){modalContent.innerHTML=reviewHtml(item);modal.hidden=false;};}
  function ensureMobilePaging(){
    if(document.getElementById('artbookVariablePagingStyle'))return;
    var style=document.createElement('style');
    style.id='artbookVariablePagingStyle';
    style.textContent='@media(max-width:760px){.pages{display:flex!important;overflow-x:auto!important;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;gap:12px!important;padding-bottom:12px;-webkit-overflow-scrolling:touch}.pages>.page{flex:0 0 92%;min-width:92%;scroll-snap-align:center;scroll-snap-stop:always}.pages::-webkit-scrollbar{height:5px}.page .visual img{width:100%;height:auto}}';
    document.head.appendChild(style);
  }
  function coreText(value){return Array.isArray(value)?value.join(' → '):String(value||'');}
  function renderCore(item){
    var c=item.content||item.artbook||{};
    var signatures=Array.isArray(c.signatureSystems)?c.signatureSystems:[c.signatureSystem].filter(Boolean);
    var sections=[['게임 정체성',c.identity],['플레이어 판타지',c.playerFantasy],['핵심 루프',coreText(c.coreLoop)],['시그니처 시스템',signatures.join(' · ')],['성장 방향',c.progressionDirection],['비주얼 방향',c.visualDirection]].filter(function(x){return String(x[1]||'').trim();});
    var gate=(item.publication&&item.publication.baselineGateState)||item.lifecycleState||'BASELINE';
    var title=item.title||item.gameName||'게임 아트북';
    var hook=c.oneLineHook||c.identity||'확정 설계 핵심 전략';
    var html='<div class="head"><small>확정 아트북 · CORE STRATEGY</small><h1>'+esc(title)+'</h1><p>'+esc(hook)+'</p><div class="meta"><span>'+esc(item.gameName||item.gameId||'게임')+'</span><span>'+esc(item.createdAt||item.date||'')+'</span><span>'+esc(gate)+'</span><span>공개본</span></div></div>';
    html+='<div class="notice">설계 기준선을 통과한 상세 설계에서 핵심 전략만 압축한 현재 공개 아트북이야.</div><div class="pages">';
    for(var i=0;i<sections.length;i++)html+='<article class="page"><div class="info"><div class="pageTop"><span class="pageNo">'+(i+1)+' / '+sections.length+'</span><span class="role">ARTBOOK EDITOR</span></div><h2>'+esc(sections[i][0])+'</h2><p>'+esc(sections[i][1])+'</p></div></article>';
    html+='</div>';
    bookEl.innerHTML=html;
    if(footer)footer.textContent='확정 설계 핵심 전략 아트북 · 최신 공개본';
  }
  function render(item){
    if(item&&item.format==='core-strategy'&&item.content){renderCore(item);return;}
    var cuts=(item.cuts||[]).slice(0,30),count=cuts.length;
    if(!validCount(count)){showError('완료 아트북은 기존 10장 또는 신규 12~30장이어야 해.');return;}
    ensureMobilePaging();
    var html='<div class="head"><small>완료 아트북 · '+count+'/'+count+'장</small><h1>'+esc(item.title||item.gameName||'게임 아트북')+'</h1><p>'+esc(item.subtitle||item.styleProfile||'게임 제작 아트북')+'</p><div class="meta"><span>'+esc(item.gameName||'게임')+'</span><span>'+esc(item.createdAt||item.date||'')+'</span><span>'+count+'장</span><span>완료</span></div></div>';
    var hasVibe=false;for(var v=0;v<cuts.length;v++)if((cuts[v].sourceDepartment||cuts[v].kind)==='vibe2'){hasVibe=true;break;}
    html+='<div class="notice">'+(hasVibe?'Vibe2 1차 스토리 초안(PROPOSAL)과 5개 부서의 그래픽·시스템·테스트·밸런스를 함께 보는 아트북. 초안은 기획부 검토 전 확정 설정이 아님.':'이미지 중심으로 컨셉 · 스토리 · 그래픽 · 시스템 · 테스트 · 밸런스를 확인하는 아트북.')+'</div><div class="pages">';
    for(var i=0;i<cuts.length;i++){
      var c=cuts[i]||{},role=c.sourceDepartment||c.kind||'director';
      html+='<article class="page" data-page="'+(i+1)+'"><div class="visual"><img src="'+esc(pathOf(c.image))+'" alt="'+esc(c.title||'아트북 페이지')+'" loading="lazy"></div><div class="info"><div class="pageTop"><span class="pageNo">'+(i+1)+' / '+count+'</span><span class="role">'+esc(roleNames[role]||role)+'</span></div><h2>'+esc(c.title||'')+'</h2><p>'+esc(c.body||'')+'</p></div></article>';
    }
    html+='</div><div class="reviewArea"><button class="reviewBtn" id="reviewOpen" type="button">부서 평가 보기</button></div>';
    bookEl.innerHTML=html;
    if(footer)footer.textContent='아트북 '+count+'장 · 부서 평가 별도 확인';
    bindReview(item);
  }
  function loadLegacy(gameId){
    loadJson('/game-artbooks.json',function(err,registry){
      if(err||!registry){showError(err&&err.message);return;}
      var item=latestBook(registry,gameId);
      if(item){render(item);return;}
      showError('이 게임의 공개 아트북이 아직 없어.');
    });
  }
  function start(){
    var gameId=getParam('game')||'daechung-rpg';
    loadJson('/artbook-submissions/'+encodeURIComponent(gameId)+'/current.json',function(err,current){
      if(!err&&current&&current.published===true&&current.homepageVisible===true){render(current);return;}
      loadLegacy(gameId);
    });
  }

  if(closeBtn)closeBtn.onclick=function(){modal.hidden=true;};
  if(modal)modal.onclick=function(e){if(e.target===modal)modal.hidden=true;};
  start();
})();
