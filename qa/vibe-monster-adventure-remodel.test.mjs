import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMonsterBattleDirector,mountMonsterBattleEffects} from '../assets/vibe-monster-adventure-remodel.js';

test('director resets combat memory and guard at battle start',()=>{
 const ai=createMonsterBattleDirector({random:()=>1});
 ai.begin();
 ai.playerHit({damage:25,special:true,enemyHp:30,enemyMaxHp:100});
 ai.playerHit({damage:25,special:true,enemyHp:20,enemyMaxHp:100});
 const decision=ai.decide({enemyHp:20,enemyMaxHp:100,playerHp:70,playerMaxHp:100});
 assert.equal(decision.action,'GUARD');
 assert.equal(ai.consumeGuard(),true);
 assert.equal(ai.consumeGuard(),false);
 ai.begin();
 assert.deepEqual(ai.snapshot(),{turn:0,guard:false,events:0});
});
test('healthy enemy can attack and use a special move',()=>{
 const ai=createMonsterBattleDirector({random:()=>0});
 ai.begin();
 const decision=ai.decide({enemyHp:100,enemyMaxHp:100,playerHp:80,playerMaxHp:100});
 assert.equal(decision.action,'ATTACK');
 assert.equal(decision.special,true);
});
test('enemy guard triggers under low health and is consumed once',()=>{
 const ai=createMonsterBattleDirector({random:()=>1});
 ai.begin();
 assert.equal(ai.decide({enemyHp:10,enemyMaxHp:100,playerHp:100,playerMaxHp:100}).action,'GUARD');
 assert.equal(ai.consumeGuard(),true);
 assert.equal(ai.decide({enemyHp:100,enemyMaxHp:100,playerHp:100,playerMaxHp:100}).action,'ATTACK');
});
test('mount gracefully degrades without browser markup',()=>{
 const fx=mountMonsterBattleEffects({getElementById(){return null;}});
 assert.doesNotThrow(()=>{fx.startBattle();fx.hit('player',5);fx.status('ok');});
});
test('actual game is wired to the director and keeps original save key',()=>{
 const html=readFileSync(new URL('../web-games/monster-adventure/index.html',import.meta.url),'utf8');
 assert.match(html,/jaewoon-monster-adventure-v1/);
 assert.match(html,/vibe-monster-adventure-remodel\.js/);
 assert.match(html,/vibeMonsterRemodel\?\.begin\(\)/);
 assert.match(html,/vibeMonsterRemodel\?\.decide/);
 assert.match(html,/vibeMonsterRemodel\?\.hit/);
 assert.match(html,/prefers-reduced-motion/);
});

test('JRPG scenes and customization are connected without replacing existing save schema',()=>{
 const html=readFileSync(new URL('../web-games/monster-adventure/index.html',import.meta.url),'utf8');
 for(const marker of ['jrpgEditor','jrpgScene','jrpgSaveProfile','triggerStory(\'prologue\')','triggerStory(\'thirdWin\')','triggerStory(\'field\')','save.profile','save.storySeen'])assert.ok(html.includes(marker),marker);
 assert.match(html,/localStorage\.getItem\(key\)/);
 assert.match(html,/localStorage\.setItem\(key/);
});
