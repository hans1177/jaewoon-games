import {moveFor,resolveOrder,calculateMoveDamage,enemyMoveChoice,typeMultiplier} from './vibe-monster-turn-system.js';
// Monster Adventure Vibe studio integration. Existing save schema and battle rewards remain authoritative.
import {chooseTacticalAction,makeCombatMemory,makeStaggerMeter} from './vibe-studio-combat.js';
import {makeDamageFeedback,makeAccessibilitySettings} from './vibe-studio-gameplay.js';

export function createMonsterBattleDirector({random=Math.random}={}){
  let memory=makeCombatMemory(),stagger=makeStaggerMeter({threshold:90,recoveryPerSecond:0}),turn=0,guard=false;
  return {
    begin(){memory=makeCombatMemory();stagger=makeStaggerMeter({threshold:90,recoveryPerSecond:0});turn=0;guard=false;},
    playerHit({damage,special=false,enemyHp,enemyMaxHp}){
      turn++;
      memory.record({time:turn,type:special?'SKILL':'HIT',source:'player',target:'enemy'});
      const reaction=stagger.hit({amount:Math.min(65,Math.max(0,damage)),now:turn});
      return {staggered:reaction.staggered,healthRatio:Math.max(0,enemyHp)/Math.max(1,enemyMaxHp)};
    },
    decide({enemyHp,enemyMaxHp,playerHp,playerMaxHp}){
      const hp=Math.max(0,enemyHp)/Math.max(1,enemyMaxHp);
      const playerRatio=Math.max(0,playerHp)/Math.max(1,playerMaxHp);
      const recentSkills=memory.query({now:turn,type:'SKILL'}).length;
      const tactical=chooseTacticalAction({self:{x:0,y:0},target:{id:'player',x:1,y:0,alive:playerHp>0},range:2,stamina:hp<.28?.15:1,healthRatio:hp});
      const defend=tactical.action==='GUARD'||(recentSkills>=2&&hp<.55&&!guard);
      if(defend){guard=true;return {action:'GUARD',special:false,label:'방어 태세! 다음 공격 피해가 감소한다.'};}
      guard=false;
      const special=playerRatio<.4||random()<Math.min(.65,.2+recentSkills*.12);
      return {action:'ATTACK',special,label:special?'강력한 기술을 준비했다!':'반격을 준비했다!'};
    },
    consumeGuard(){const was=guard;guard=false;return was;},
    snapshot(){return {turn,guard,events:memory.snapshot().length};}
  };
}

export function mountMonsterBattleEffects(doc=document){
  const view=doc.getElementById('battleView');
  const field=view?.querySelector('.battleField');
  if(!view||!field)return {startBattle(){},hit(){},status(){}};
  const settings=makeAccessibilitySettings({motionReduction:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
  const feedback=makeDamageFeedback();
  const status=doc.createElement('div');
  status.className='vibeCombatStatus';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.textContent='VIBE 전투 시스템 연결됨';
  view.insertBefore(status,view.querySelector('.battleText'));
  const fx=doc.createElement('div');
  fx.className='vibeImpact';
  fx.setAttribute('aria-hidden','true');
  field.append(fx);
  let timer=0;
  function hit(side,damage,{special=false,guarded=false}={}){
    const target=side==='player'?'enemy':'player';
    const sprite=doc.getElementById(target==='enemy'?'enemyImg':'myImg');
    if(!sprite)return;
    sprite.classList.remove('vibeHit','vibeHitReduced');
    void sprite.offsetWidth;
    sprite.classList.add(settings.get().motionReduction?'vibeHitReduced':'vibeHit');
    fx.textContent=(guarded?'방어! ':'')+'−'+Math.max(0,Math.round(damage));
    fx.className='vibeImpact visible '+(target==='enemy'?'onEnemy':'onPlayer');
    feedback.hit({targetId:target,amount:damage,time:Date.now()});
    globalThis.clearTimeout(timer);
    timer=globalThis.setTimeout(()=>{fx.className='vibeImpact';sprite.classList.remove('vibeHit','vibeHitReduced');},650);
    status.textContent=(side==='player'?'아군':'야생 몬스터')+(special?' 기술':' 공격')+' · '+damage+' 피해'+(guarded?' (방어 적용)':'');
  }
  return {
    startBattle(){fx.className='vibeImpact';status.textContent='VIBE 전투 AI 활성화 · 전투 시작';},
    hit,
    status(text){status.textContent=String(text);}
  };
}

if(typeof document!=='undefined'){
  const director=createMonsterBattleDirector();
  const effects=mountMonsterBattleEffects(document);
  globalThis.vibeMonsterRemodel={
    begin(){director.begin();effects.startBattle();},
    playerHit(args){return director.playerHit(args);},
    decide(args){const action=director.decide(args);effects.status(action.label);return action;},
    consumeGuard(){return director.consumeGuard();},
    hit:effects.hit,
    status:effects.status,
    turnRules:{moveFor,resolveOrder,calculateMoveDamage,enemyMoveChoice,typeMultiplier},
    snapshot(){return director.snapshot();}
  };
}
