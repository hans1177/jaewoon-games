const ARTBOOK_SOURCE='/game-artbooks.json';
const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function loadPublishedArtbooks(){
  const response=await fetch(`${ARTBOOK_SOURCE}?ts=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`artbook source ${response.status}`);
  const data=await response.json();
  const artbooks=Array.isArray(data.artbooks)?data.artbooks:[];
  return artbooks.filter(item=>item&&item.published===true&&item.status==='completed-artbook'&&Array.isArray(item.cuts)&&item.cuts.length===10&&item.postprocess?.complete===true).map(item=>({
    ...item,
    cuts:item.cuts.slice(0,10)
  }));
}

export async function loadIssueComments(issueNumber,{limit=12}={}){
  const number=Number(issueNumber);
  if(!Number.isInteger(number)||number<=0)return[];
  const url=`https://api.github.com/repos/hans1177/jaewoon-games/issues/${number}/comments?per_page=${Math.min(30,Math.max(1,limit))}`;
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)return[];
  const comments=await response.json();
  if(!Array.isArray(comments))return[];
  return comments.slice(-limit).map(comment=>({
    author:clean(comment?.user?.login)||'guest',
    avatar:clean(comment?.user?.avatar_url),
    body:clean(comment?.body),
    createdAt:clean(comment?.created_at),
    url:clean(comment?.html_url)
  }));
}

export function createArtbookCardHtml(artbook){
  const cover=artbook.cuts?.[0]?.image||'assets/mock.webp';
  return `<article class="artbookCard" data-artbook="${esc(artbook.id)}"><img src="${esc(cover)}" alt="" loading="lazy"><div><small>완료 · 10/10장 · EDITION ${esc(artbook.edition)}</small><h3>${esc(artbook.title)}</h3><p>${esc(artbook.subtitle||artbook.intent||'')}</p><a href="/artbook.html?id=${encodeURIComponent(artbook.id)}">10장 아트북 보기</a></div></article>`;
}
