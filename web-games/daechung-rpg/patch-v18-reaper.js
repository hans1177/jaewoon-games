(()=>{
if(window.__RPG_V18_REAPER_PATCHED)return;window.__RPG_V18_REAPER_PATCHED=true;
if(typeof kill!=='function')return;
const baseKill=kill;
kill=function(m){
  if(m&&m.type==='reaper'&&!m.dead){
    m.dead=true;
    m.hp=0;
    m.a=0;
    m.spd=0;
    m.specialCd=999;
    m.shootCd=999;
    if(typeof reaperDefeated!=='undefined')reaperDefeated=true;
    if(typeof reaperRef!=='undefined')reaperRef=null;
    if(typeof unlockAfterReaper==='function')unlockAfterReaper();
    if(typeof sfx==='function')sfx('bossDown');
    setTimeout(()=>{if(typeof zone!=='undefined'&&zone==='f9'&&typeof say==='function')say('사신','꽤 실력이 좋군. 다음에는 봐주는 건 없다.')},380);
    setTimeout(()=>{
      if(typeof mons!=='undefined'){
        const i=mons.indexOf(m);if(i>=0)mons.splice(i,1);
      }
      if(typeof toastMsg==='function')toastMsg('사신이 어둠 속으로 사라졌다');
    },1650);
    return;
  }
  return baseKill(m);
};
})();
