import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameFactPack, draftSemanticProblems } from '../tools/vibe2-game-fact-pack.mjs';

const files=[{path:'web-games/crystal-defense/game.js',text:`
const CRYSTAL_ENERGY='수정 에너지';
const TOWER_UPGRADE='수정탑 강화';
const BOSS_NAME='균열 군주';
function spawnWave(){ wave++; enemies.push('수정 포식자'); }
function attackEnemy(){ crystalHp -= enemy.damage; }
if(wave===10){ spawnBoss(BOSS_NAME); }
function upgradeTower(){ gold-=50; tower.level++; }
localStorage.setItem('crystalDefenseSave', JSON.stringify({wave,gold,crystalHp,towerLevel:tower.level}));
const objective='중앙 수정을 지켜라';
`}];
const pack=buildGameFactPack({gameId:'crystal-defense',gameName:'수정 디펜스',genreText:'디펜스',files});

test('game fact pack extracts categorized gameplay evidence before drafting',()=>{
  assert.ok(pack.stats.totalEvidence>=4);
  assert.ok(pack.categories.BOSSES.length>=1);
  assert.ok(pack.categories.SAVE_RULES.length>=1);
  assert.ok(pack.gameSpecificTerms.length>=4);
  assert.equal(pack.evidencePolicy.unsupportedLoreBecomesProposal,true);
});

const repeated={phasePlans:['OPENING','EARLY','MID','LATE','FINAL_BOSS','ENDING'].map(stage=>({stage,region:'전략 지역',quest:'전략적 계획을 세운다',cause:'전략적 이해가 부족하다',playerAction:'전략적 계획을 실행한다',result:'전략적 이해를 성취한다',nextHook:'다음 전략 지역'}))};
test('repetitive generic Vibe2 draft is rejected by semantic quality gate',()=>{
  const problems=draftSemanticProblems(repeated,{factPack:pack,generationMode:'COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION'});
  assert.ok(problems.includes('phase-content-too-repetitive')||problems.includes('phase-semantic-similarity-too-high'));
  assert.ok(problems.includes('generic-planning-language-dominates'));
});

const rich={phasePlans:[
  {stage:'OPENING',region:'중앙 수정실',quest:'중앙 수정을 지켜라',cause:'수정 포식자 첫 웨이브가 접근한다',playerAction:'수정탑 강화로 입구를 막는다',result:'수정 에너지를 확보한다',nextHook:'외곽 균열 조사'},
  {stage:'EARLY',region:'외곽 균열',quest:'수정 포식자 경로를 끊는다',cause:'두 공격로가 동시에 열린다',playerAction:'수정탑을 분산 배치한다',result:'골드 수급이 안정된다',nextHook:'10웨이브 추적'},
  {stage:'MID',region:'분열 전선',quest:'10웨이브를 돌파한다',cause:'강화 적이 수정탑을 우회한다',playerAction:'수정 에너지와 골드로 타워 레벨을 올린다',result:'균열 군주의 흔적을 확인한다',nextHook:'보스 전선 개방'},
  {stage:'LATE',region:'보스 전선',quest:'중앙 수정 방어선을 재편한다',cause:'균열 군주가 포식자를 증폭한다',playerAction:'저장된 타워 레벨을 이용해 핵심 길목을 강화한다',result:'최종 웨이브를 연다',nextHook:'균열 군주 등장'},
  {stage:'FINAL_BOSS',region:'중앙 균열',quest:'균열 군주를 격파한다',cause:'10웨이브 보스가 중앙 수정에 직접 접근한다',playerAction:'수정탑 강화와 자원 운용을 결합한다',result:'중앙 수정이 보존된다',nextHook:'방어망 복구'},
  {stage:'ENDING',region:'복구 구역',quest:'방어망을 재건한다',cause:'균열은 닫혔지만 잔존 포식자가 남는다',playerAction:'골드와 수정 에너지로 방어선을 정비한다',result:'고난도 웨이브가 열린다',nextHook:'엔드리스 방어'}
]};
test('distinct game-grounded draft passes semantic quality gate',()=>{
  const problems=draftSemanticProblems(rich,{factPack:pack,generationMode:'COMPACT_MODEL_PLUS_DETERMINISTIC_EXPANSION'});
  assert.deepEqual(problems,[]);
});

test('deterministic fallback can never be development-ready by itself',()=>{
  const problems=draftSemanticProblems(rich,{factPack:pack,generationMode:'DETERMINISTIC_FALLBACK'});
  assert.ok(problems.includes('deterministic-fallback-needs-validation'));
});
