export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    if (!['/','/index.html'].includes(url.pathname)) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;
    let html = await response.text();
    const patch = String.raw`<script>
(function(){
  const fallbackNotes=[
    ['재운게임즈','개발자 카드 3페이지 슬라이드와 모바일 표시 개선'],
    ['몬스터 어드벤처','몬스터 포획·동료 전투 흐름 개선'],
    ['무인도 마을','마을 성장·채집 화면 구성 정리'],
    ['대충 RPG','RPG 진행 화면과 게임 연결 안정화'],
    ['수정 디펜스','디펜스 게임 연결과 모바일 플레이 정리']
  ];
  const list=document.getElementById('devNoteList');
  const status=document.getElementById('devNoteStatus');
  function drawNotes(rows){
    if(!list)return;
    list.innerHTML=rows.map((r,i)=>'<div class="devNote"><time>'+(i===0?'최근':'업데이트')+'</time><span><b class="devGame">'+r[0]+'</b> · '+r[1]+'</span></div>').join('');
    if(status)status.textContent='게임명 · 핵심 업데이트 한줄 요약';
  }
  drawNotes(fallbackNotes);
  function inferGame(files,msg){
    const text=((files||[]).map(f=>f.filename||'').join(' ')+' '+(msg||'')).toLowerCase();
    if(text.includes('monster-adventure')||text.includes('몬스터'))return '몬스터 어드벤처';
    if(text.includes('island')||text.includes('무인도'))return '무인도 마을';
    if(text.includes('egg-heist')||text.includes('알 도둑'))return '알 도둑 대작전';
    if(text.includes('rpg-play')||text.includes('rpg'))return '대충 RPG';
    if(text.includes('human')||text.includes('휴먼'))return '휴먼 GO';
    if(text.includes('crystal')||text.includes('수정'))return '수정 디펜스';
    if(text.includes('survival')||text.includes('곤충'))return '곤충 생존기';
    return '재운게임즈';
  }
  function shortMsg(msg){return String(msg||'업데이트').split('\n')[0].replace(/^(feat|fix|chore|style|refactor|update)[:：]?\s*/i,'').replace(/\s+/g,' ').trim().slice(0,34)}
  fetch('https://api.github.com/repos/hans1177/jaewoon-games/commits?per_page=5')
    .then(r=>r.ok?r.json():Promise.reject())
    .then(async commits=>{
      const rows=[];
      for(const c of commits){
        try{
          const d=await fetch(c.url).then(r=>r.json());
          rows.push([inferGame(d.files,c.commit&&c.commit.message),shortMsg(c.commit&&c.commit.message)]);
        }catch(e){}
      }
      if(rows.length)drawNotes(rows);
    }).catch(()=>{});

  const panel=document.querySelector('.musicPanel');
  if(panel){
    const box=panel.querySelector('.musicBox');
    if(box)box.innerHTML='<iframe id="musicFrame2" title="음악 플레이어" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:105px;border:0;border-radius:12px;background:#000"></iframe>';
    const tracks=[
      ['지브리 · 어느 여름날','TK1Ij_-mank'],
      ['지브리 · 바람이 지나가는 길','yGYeE-UTtaE'],
      ['지브리 · 인생의 회전목마','_mIJ3AqUNdo'],
      ['지브리 · 바다가 보이는 마을','pR4iCWB-VVQ'],
      ['지브리 · 아시타카와 산','faf98cNY8A8'],
      ['지브리 · 모노노케 히메','E8-8TzBKnJQ'],
      ['지브리 · 너를 태우고','Ld02uYVAW18'],
      ['지브리 · 나우시카 레퀴엠','Y3xShaeor4E'],
      ['지브리 · 이웃집 토토로','eEb9UfUOZYo'],
      ['지브리 · 포뇨','9bO8ErxppZU'],
      ['Grounded · Main Theme','ohiNe1wbIa4'],
      ['Core Keeper · Main Theme','dDCZZR-i5z4'],
      ['Minecraft · Sweden','9h5j5vNgidE'],
      ['Skyrim · Dragonborn','4LGoHUFOoLY'],
      ['Undertale · Main Theme','uTBIhbeR7yw'],
      ['Halo · Main Theme','0jXTBAGv9ZQ'],
      ['젤다 · Main Theme','cGufy1PAeTU']
    ];
    let last=-1;
    function playRandom(){
      let i=Math.floor(Math.random()*tracks.length);if(i===last)i=(i+1)%tracks.length;last=i;
      const t=tracks[i];
      const now=document.getElementById('musicNow');if(now)now.textContent=t[0];
      const frame=document.getElementById('musicFrame2');if(frame)frame.src='https://www.youtube-nocookie.com/embed/'+t[1]+'?autoplay=1&playsinline=1&rel=0';
    }
    const btn=document.getElementById('randomMusic');if(btn){btn.textContent='랜덤 재생';btn.onclick=playRandom;}
    playRandom();
  }
})();
</script>`;
    html = html.replace('</body>', patch + '</body>');
    const headers = new Headers(response.headers);
    headers.set('cache-control','no-store, max-age=0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};