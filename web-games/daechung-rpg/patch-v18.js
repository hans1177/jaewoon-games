(()=>{
if(window.__RPG_V18_REAPER_PATCHED)return;window.__RPG_V18_REAPER_PATCHED=true;
const kill18=kill;
kill=function(m){
  const wasAlive=!!m&&!m.dead;
  const isReaper=wasAlive&&m.type==='reaper';
  kill18(m);
  if(!isReaper||!m.dead)return;
  // Historical grave12 behavior: Reaper gives no normal drop and is removed after his exit line.
  setTimeout(()=>{
    if(Array.isArray(mons))mons=mons.filter(x=>x!==m);
  },1650);
};
})();
