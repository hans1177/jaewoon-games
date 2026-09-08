(function(){
  'use strict';

  var bookEl=document.getElementById('book');
  var modal=document.getElementById('reviewModal');
  var modalContent=document.getElementById('reviewContent');
  var closeBtn=document.getElementById('reviewClose');
  var roleNames={planning:'기획',graphics:'그래픽',development:'개발',qa:'QA',balance:'밸런스',director:'총괄'};

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
  function showError(message){
    bookEl.innerHTML='<div class="head"><small>GAME ARTBOOK</small><h1>아트북 연결 확인 필요</h1><p>페이지는 열렸지만 데이터를 읽지 못했어.</p></div><div class="status"><b>다시 새로고침해줘.</b>'+esc(message||'데이터 연결 오류')+'</div>';
  }
  function latestBook(registry,gameId){
    var books=(registry&&registry.artbooks)||[];
    var list=[];
    for(var i=0;i<books.length;i++){
      var b=books[i];
      if(b&&b.gameId===gameId&&(b.status==='completed-artbook'||b.status==='COMPLETED')&&((b.cuts&&b.cuts.length)||Number(b.cutCount))>=10)list.push(b);
    }
    list.sort(function(a,b){return (Number(b.edition)||0)-(Number(a.edition)||0);});
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
  function bindReview(item){
    var btn=document.getElementById('reviewOpen');
    if(btn)btn.onclick=function(){modalContent.innerHTML=reviewHtml(item);modal.hidden=false;};
  }
  function render(item){
    var cuts=(item.cuts||[]).slice(0,10);
    if(cuts.length!==10){showError('완료 아트북 10장을 찾지 못했어.');return;}
    var html='<div class="head"><small>완료 아트북 · 10/10장</small><h1>'+esc(item.title||item.gameName||'대충 RPG 아트북')+'</h1><p>'+esc(item.subtitle||item.styleProfile||'판타지 세계 설정집 + 모험 연대기')+'</p><div class="meta"><span>'+esc(item.gameName||'대충 RPG')+'</span><span>'+esc(item.createdAt||item.date||'2026-09-08')+'</span><span>10장</span><span>완료</span></div></div>';
    html+='<div class="notice">이미지 중심으로 컨셉 · 스토리 · 그래픽 · 시스템 · 테스트 · 밸런스를 확인하는 아트북.</div><div class="pages">';
    for(var i=0;i<cuts.length;i++){
      var c=cuts[i]||{},role=c.sourceDepartment||c.kind||'director';
      html+='<article class="page"><div class="visual"><img src="'+esc(pathOf(c.image))+'" alt="'+esc(c.title||'아트북 페이지')+'" loading="lazy"></div><div class="info"><div class="pageTop"><span class="pageNo">'+(i+1)+' / 10</span><span class="role">'+esc(roleNames[role]||role)+'</span></div><h2>'+esc(c.title||'')+'</h2><p>'+esc(c.body||'')+'</p></div></article>';
    }
    html+='</div><div class="reviewArea"><button class="reviewBtn" id="reviewOpen" type="button">부서 평가 보기</button></div>';
    bookEl.innerHTML=html;
    bindReview(item);
  }
  function loadDirectFallback(){
    loadJson('/artbook-submissions/daechung-rpg/2026-09-08/artbook.json',function(err,data){
      if(err||!data){showError(err&&err.message);return;}
      render(data);
    });
  }
  function start(){
    var gameId=getParam('game')||'daechung-rpg';
    loadJson('/game-artbooks.json',function(err,registry){
      if(err||!registry){loadDirectFallback();return;}
      var item=latestBook(registry,gameId);
      if(item){render(item);return;}
      loadDirectFallback();
    });
  }

  if(closeBtn)closeBtn.onclick=function(){modal.hidden=true;};
  if(modal)modal.onclick=function(e){if(e.target===modal)modal.hidden=true;};
  start();
})();
