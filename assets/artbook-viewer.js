(function(){
  'use strict';

  var bookEl=document.getElementById('book');
  var modal=document.getElementById('reviewModal');
  var modalContent=document.getElementById('reviewContent');
  var closeBtn=document.getElementById('reviewClose');
  var footer=document.querySelector('.footer');
  var roleNames={vibe2:'Vibe2 1차 초안',planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스',director:'총괄'};
  var statusLabels={MEETING:'회의중',WRITING:'작성중',WAITING:'대기중',COMPLETE:'완료'};

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
  function normalizeUiStatus(status){var v=String(status&&status.uiStatus||'').toUpperCase();return statusLabels[v]?v:'';}
  function progressMessage(uiStatus){
    if(uiStatus==='MEETING')return '부서 검토와 회의가 끝나기 전이라 확정 아트북을 만들지 않아.';
    if(uiStatus==='WRITING')return '설계 기준선이 확정돼서 Artbook Editor AI가 최신 아트북을 작성하고 있어.';
    if(uiStatus==='WAITING')return '회의에서 아직 확정되지 않은 안건이 남아 있어. 해결 전에는 새 확정 아트북을 공개하지 않아.';
    return '최신 확정 아트북 공개가 완료됐어.';
  }
  function showProgress(status){
    var uiStatus=normalizeUiStatus(status)||'WAITING';
    var label=statusLabels[uiStatus];
    bookEl.innerHTML='<div class="head"><small>GAME ARTBOOK · '+esc(label)+'</small><h1>'+esc(label)+'</h1><p>'+esc(progressMessage(uiStatus))+'</p></div><div class="status"><b>'+esc(status&&status.gameName||status&&status.gameId||'아트북')+'</b>'+esc(status&&status.date||'')+'</div>';
    if(footer)footer.textContent='새 아트북 상태 · '+label;
  }
  function showError(message){
    bookEl.innerHTML='<div class="head"><small>GAME ARTBOOK</small><h1>아트북 준비중</h1><p>확정된 최신 아트북이 아직 공개되지 않았어.</p></div><div class="status"><b>설계 기준선 통과 후 자동 공개돼.</b>'+esc(message||'공개 아트북 없음')+'</div>';
    if(footer)footer.textContent='DESIGN_BASELINE 통과 후 최신 아트북 자동 공개';
  }
  function latestBook(registry,gameId){
    var books=(registry&&registry.artbooks)||[];
    var list=[];
    for(var i=0;i<books.length;i++){
      var b=books[i],count=(b&&b.cuts&&b.cuts.length)||Number(b&&b.cutCount)||0;
      var core=!!(b&&b.format==='core-strategy'&&(b.content||b.sourceFile));
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
    style.textContent='.pages{display:flex!important;overflow-x:auto!important;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;gap:12px!important;padding:0 12px 14px!important;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.pages>.page{flex:0 0 min(86%,720px);min-width:min(86%,720px);scroll-snap-align:center;scroll-snap-stop:always}.designVisual{aspect-ratio:16/9;min-height:230px;padding:18px;background:linear-gradient(135deg,#0b2d42,#17607e 56%,#2a86a7);color:#fff;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}.designVisual:before{content:"";position:absolute;width:240px;height:240px;border:1px solid #ffffff35;border-radius:50%;right:-70px;top:-90px}.designVisual:after{content:"";position:absolute;width:150px;height:150px;border:1px solid #ffffff20;border-radius:50%;left:-55px;bottom:-70px}.visualKicker{position:relative;z-index:1;font-size:10px;font-weight:1000;color:#9fe7ff;letter-spacing:.08em}.visualHero{position:relative;z-index:1;margin-top:6px;font-size:26px;font-weight:1000;line-height:1.12;max-width:90%;text-shadow:0 3px 12px #00182788}.visualSub{position:relative;z-index:1;margin-top:8px;font-size:11px;font-weight:800;line-height:1.45;color:#d9eef8;max-width:90%}.visualFlow,.visualGrid{position:relative;z-index:1;display:grid;gap:7px;margin-top:12px}.visualFlow{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}.visualNode,.visualCard{min-width:0;padding:9px;border:1px solid #ffffff42;border-radius:12px;background:#ffffff13;backdrop-filter:blur(2px);font-size:10px;line-height:1.35;font-weight:900}.visualNode b,.visualCard b{display:block;color:#9fe7ff;font-size:9px;margin-bottom:3px}.visualGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.pageNav{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;padding:0 12px 14px}.pageNav button{min-height:40px;border:1px solid #abd2e6;border-radius:11px;background:#eef8fd;color:#17679b;font-weight:1000}.pageNav button:last-child{background:#17679b;color:#fff;border-color:#17679b}.pageNav span{text-align:center;color:#527489;font-size:10px;font-weight:1000;min-width:54px}@media(max-width:760px){.pages>.page{flex-basis:92%;min-width:92%}.designVisual{min-height:210px;padding:15px}.visualHero{font-size:22px}.visualFlow{grid-template-columns:1fr}.visualGrid{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(style);
  }
  function coreText(value){
    if(Array.isArray(value))return value.map(function(v){return typeof v==='object'?(v.name?String(v.name):JSON.stringify(v)):String(v||'');}).filter(Boolean).join(' → ');
    if(value&&typeof value==='object')return JSON.stringify(value);
    return String(value||'');
  }
  function short(v,n){v=String(v||'').trim();return v.length>n?v.slice(0,n-1)+'…':v;}
  function signatureText(list){
    if(!Array.isArray(list))return coreText(list);
    return list.map(function(s){
      if(typeof s==='string')return s;
      var bits=[s&&s.name,s&&s.purpose?'목적: '+s.purpose:'',s&&s.playerChoice?'선택: '+s.playerChoice:''].filter(Boolean);
      return bits.join(' · ');
    }).join(' / ');
  }
  function designVisual(key,label,value){
    var arr=Array.isArray(value)?value:[];
    var text=key==='signatureSystems'?signatureText(value):coreText(value);
    if(key==='coreLoop'){
      return '<div class="visual designVisual"><div class="visualKicker">CORE LOOP FLOW</div><div class="visualHero">플레이 흐름</div><div class="visualFlow">'+arr.slice(0,3).map(function(v,i){return '<div class="visualNode"><b>STEP '+(i+1)+'</b>'+esc(short(v,76))+'</div>';}).join('')+'</div></div>';
    }
    if(key==='signatureSystems'){
      return '<div class="visual designVisual"><div class="visualKicker">SIGNATURE SYSTEMS</div><div class="visualHero">핵심 시스템</div><div class="visualGrid">'+arr.slice(0,4).map(function(v){var name=typeof v==='object'?v.name:v;var desc=typeof v==='object'?(v.playerChoice||v.purpose):'';return '<div class="visualCard"><b>'+esc(short(name,34))+'</b>'+esc(short(desc,72))+'</div>';}).join('')+'</div></div>';
    }
    if(key==='technicalAssumptions'){
      return '<div class="visual designVisual"><div class="visualKicker">TECHNICAL ASSUMPTIONS</div><div class="visualHero">구현 전제</div><div class="visualGrid">'+arr.slice(0,4).map(function(v,i){return '<div class="visualCard"><b>CHECK '+(i+1)+'</b>'+esc(short(v,78))+'</div>';}).join('')+'</div></div>';
    }
    if(key==='expansionDecision'){
      return '<div class="visual designVisual"><div class="visualKicker">EXPANSION DECISION</div><div class="visualHero">확장 판단</div><div class="visualGrid"><div class="visualCard"><b>STEAM</b>'+esc(short(value.steam,90))+'</div><div class="visualCard"><b>MULTIPLAYER</b>'+esc(short(value.multi,90))+'</div></div></div>';
    }
    var kicker={identity:'GAME IDENTITY',coreFun:'CORE FUN',playerFantasy:'PLAYER FANTASY',progressionDirection:'PROGRESSION',visualDirection:'VISUAL DIRECTION',mobileUx:'MOBILE UX',marketTargetDirection:'MARKET TARGET'}[key]||'DESIGN CORE';
    return '<div class="visual designVisual"><div class="visualKicker">'+esc(kicker)+'</div><div class="visualHero">'+esc(label)+'</div><div class="visualSub">'+esc(short(text,210))+'</div></div>';
  }
  function bindPager(count){
    var pages=bookEl.querySelector('.pages');
    var prev=document.getElementById('artPrev');
    var next=document.getElementById('artNext');
    var indicator=document.getElementById('artPageIndicator');
    if(!pages||!prev||!next||!indicator)return;
    var index=0;
    function update(){indicator.textContent=(index+1)+' / '+count;prev.disabled=index<=0;next.disabled=index>=count-1;}
    function go(n){index=Math.max(0,Math.min(count-1,n));var page=pages.children[index];if(page)pages.scrollTo({left:page.offsetLeft-pages.offsetLeft,behavior:'smooth'});update();}
    prev.onclick=function(){go(index-1);};
    next.onclick=function(){go(index+1);};
    var timer=null;
    pages.addEventListener('scroll',function(){clearTimeout(timer);timer=setTimeout(function(){var best=0,dist=Infinity;for(var i=0;i<pages.children.length;i++){var d=Math.abs(pages.children[i].offsetLeft-pages.offsetLeft-pages.scrollLeft);if(d<dist){dist=d;best=i;}}index=best;update();},90);});
    update();
  }
  function renderCore(item){
    var c=item.designCore||item.content||item.artbook||{};
    var expansion={steam:c.steamExpansionDecision||'',multi:c.multiplayerExpansionDecision||''};
    var sections=[
      {key:'identity',label:'게임 정체성',value:c.identity},
      {key:'coreFun',label:'핵심 재미',value:c.coreFun},
      {key:'playerFantasy',label:'플레이어 판타지',value:c.playerFantasy},
      {key:'coreLoop',label:'핵심 루프',value:c.coreLoop},
      {key:'signatureSystems',label:'시그니처 시스템',value:c.signatureSystems},
      {key:'progressionDirection',label:'성장 방향',value:c.progressionDirection},
      {key:'visualDirection',label:'비주얼 방향',value:c.visualDirection},
      {key:'mobileUx',label:'모바일 UX',value:c.mobileUx},
      {key:'marketTargetDirection',label:'시장 방향',value:c.marketTargetDirection},
      {key:'expansionDecision',label:'확장 판단',value:expansion},
      {key:'technicalAssumptions',label:'기술 전제',value:c.technicalAssumptions}
    ].filter(function(x){
      if(x.key==='expansionDecision')return String(x.value.steam||x.value.multi).trim();
      if(Array.isArray(x.value))return x.value.length>0;
      return String(x.value||'').trim();
    });
    var gate=(item.publication&&item.publication.baselineGateState)||item.lifecycleState||'BASELINE';
    var title=item.title||item.gameName||c.identity||'게임 아트북';
    var hook=c.coreFun||c.playerFantasy||c.identity||'확정 설계 핵심';
    ensureMobilePaging();
    var html='<div class="head"><small>확정 아트북 · 설계 본파일 핵심</small><h1>'+esc(title)+'</h1><p>'+esc(short(hook,180))+'</p><div class="meta"><span>3분류 DESIGN_ONLY</span><span>'+esc(item.createdAt||item.date||'')+'</span><span>'+esc(gate)+'</span><span>설계 본파일 기반</span></div></div>';
    html+='<div class="notice">설계 본파일의 핵심 내용을 장별로 시각화한 확정 아트북이야. 화면을 좌우로 넘기거나 아래 이전/다음 버튼으로 볼 수 있어.</div><div class="pages">';
    for(var i=0;i<sections.length;i++){
      var s=sections[i];
      var body=s.key==='signatureSystems'?signatureText(s.value):(s.key==='expansionDecision'?'Steam: '+s.value.steam+' / 멀티플레이: '+s.value.multi:coreText(s.value));
      html+='<article class="page" data-page="'+(i+1)+'">'+designVisual(s.key,s.label,s.value)+'<div class="info"><div class="pageTop"><span class="pageNo">'+(i+1)+' / '+sections.length+'</span><span class="role">설계 본파일 핵심</span></div><h2>'+esc(s.label)+'</h2><p>'+esc(body)+'</p></div></article>';
    }
    html+='</div><div class="pageNav"><button id="artPrev" type="button">‹ 이전</button><span id="artPageIndicator">1 / '+sections.length+'</span><button id="artNext" type="button">다음 ›</button></div>';
    bookEl.innerHTML=html;
    bindPager(sections.length);
    if(footer)footer.textContent='설계 본파일 핵심 시각 아트북 · 좌우 넘김 · 완료';
  }
  function render(item){
    if(item&&item.format==='core-strategy'&&(item.designCore||item.content)){renderCore(item);return;}
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
    html+='</div><div class="pageNav"><button id="artPrev" type="button">‹ 이전</button><span id="artPageIndicator">1 / '+count+'</span><button id="artNext" type="button">다음 ›</button></div><div class="reviewArea"><button class="reviewBtn" id="reviewOpen" type="button">부서 평가 보기</button></div>';
    bookEl.innerHTML=html;
    bindPager(count);
    if(footer)footer.textContent='아트북 '+count+'장 · 좌우 넘김 · 부서 평가 별도 확인';
    bindReview(item);
  }
  function addProgressNotice(status){
    var uiStatus=normalizeUiStatus(status);
    if(!uiStatus||uiStatus==='COMPLETE')return;
    var label=statusLabels[uiStatus];
    var head=bookEl.querySelector('.head');
    if(head)head.insertAdjacentHTML('afterend','<div class="notice"><b>새 아트북 '+esc(label)+'</b><br>'+esc(progressMessage(uiStatus))+' 지금 보이는 내용은 이전에 완료된 확정본이야.</div>');
    if(footer)footer.textContent='새 아트북 '+label+' · 현재 화면은 이전 완료본';
  }
  function loadLegacy(gameId,publicStatus){
    loadJson('/game-artbooks.json',function(err,registry){
      if(err||!registry){if(normalizeUiStatus(publicStatus))showProgress(publicStatus);else showError(err&&err.message);return;}
      var item=latestBook(registry,gameId);
      if(item&&item.sourceFile&&!(item.cuts&&item.cuts.length)&&!(item.format==='core-strategy'&&(item.content||item.designCore))){
        loadJson(pathOf(item.sourceFile),function(sourceErr,sourceItem){
          if(!sourceErr&&sourceItem){render(sourceItem);addProgressNotice(publicStatus);return;}
          if(normalizeUiStatus(publicStatus))showProgress(publicStatus);else showError(sourceErr&&sourceErr.message||'아트북 원본을 불러오지 못했어.');
        });
        return;
      }
      if(item&&item.sourceFile&&item.format==='core-strategy'&&!item.content&&!item.designCore){
        loadJson(pathOf(item.sourceFile),function(sourceErr,sourceItem){
          if(!sourceErr&&sourceItem){render(sourceItem);addProgressNotice(publicStatus);return;}
          showError(sourceErr&&sourceErr.message||'아트북 원본을 불러오지 못했어.');
        });
        return;
      }
      if(item){render(item);addProgressNotice(publicStatus);return;}
      if(normalizeUiStatus(publicStatus))showProgress(publicStatus);else showError('이 게임의 공개 아트북이 아직 없어.');
    });
  }
  function start(){
    var gameId=getParam('game')||'daechung-rpg';
    loadJson('/artbook-submissions/'+encodeURIComponent(gameId)+'/status.json',function(statusErr,publicStatus){
      if(statusErr)publicStatus=null;
      loadJson('/artbook-submissions/'+encodeURIComponent(gameId)+'/current.json',function(err,current){
        if(!err&&current&&current.published===true&&current.homepageVisible===true){render(current);addProgressNotice(publicStatus);return;}
        loadLegacy(gameId,publicStatus);
      });
    });
  }

  if(closeBtn)closeBtn.onclick=function(){modal.hidden=true;};
  if(modal)modal.onclick=function(e){if(e.target===modal)modal.hidden=true;};
  start();
})();
