import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inferLegacyMultiplayerMode,repairDesignRequiredFields,repairPersistedDesignForPromotion} from '../tools/company-design-prepromotion-repair.mjs';

const write=(root,file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const seed={
  seedId:'S-REPAIR',gameId:'repair-game',gameName:'Repair Game',status:'ACTIVE',
  GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX',
  DISTINCT_IDENTITY:'서로 다른 세 구역의 규칙을 읽고 안전한 경로를 조립하는 퍼즐 생존 게임',
  CORE_FUN_TO_LEARN:'관찰한 규칙을 다음 선택에 적용해 위험을 줄이는 재미',
  CORE_LOOP:['주변 규칙 관찰','안전 경로 선택','결과 확인과 다음 구역 진입'],
  TARGET_SESSION_DIRECTION:'초반 규칙 학습에서 중반 조합 문제와 후반 복합 문제로 난도를 확장한다',
  TARGET_AUDIENCE:'짧은 세션에서 규칙 발견과 선택을 선호하는 플레이어',
  MARKET_EVIDENCE_SUMMARY:'퍼즐 선택과 짧은 반복 세션을 핵심 타겟 방향으로 삼는다',
  MULTIPLAYER_DESIGN_MODE:'SINGLE',
  CROSS_PLATFORM_EXPANSION_VALUE:'현재 싱글 코어 검증 뒤 플랫폼 확장을 검토한다'
};

const legacyCompetitive={
  identity:'seed-roblox-obby-party-minigam-tower-of-hell',
  playerFantasy:'Skyline Sprint',
  coreFun:'obstacle, round, checkpoint, timing',
  coreLoop:[
    'Start a short timed round with a clear obstacle or party objective.',
    'Jump, dodge, race through hazards while checkpoints, score, position, or remaining-time feedback shows immediate progress.',
    'Finish or fail the round, receive score, then retry quickly.'
  ],
  signatureSystems:[],progressionDirection:'ascending',visualDirection:'ascending',mobileUx:'mobile',marketTargetDirection:'ascending',
  steamExpansionDecision:'not_recommended',multiplayerExpansionDecision:'not_recommended',technicalAssumptions:['ROBLOX'],validationQuestions:[],openQuestions:[]
};

test('missing required design fields are repaired only from grounded seed/fact evidence',()=>{
  const original={identity:'기존 작성자의 정체성은 유지',coreFun:'기존 코어 재미',coreLoop:['a','b','c']};
  const result=repairDesignRequiredFields(original,{seed,factPack:{visualDirection:'단순한 기하형 실루엣과 높은 대비'},phase:'DRAFT'});
  assert.equal(result.value.identity,'기존 작성자의 정체성은 유지');
  assert.equal(result.value.coreFun,'기존 코어 재미');
  assert.equal(result.value.progressionDirection,seed.TARGET_SESSION_DIRECTION);
  assert.equal(result.value.multiplayerMode,'SINGLE');
  assert.equal(result.value.visualDirection,'단순한 기하형 실루엣과 높은 대비');
  assert.deepEqual(result.unresolved,[]);
  assert.ok(result.repairs.some(row=>row.field==='progressionDirection'&&row.source==='GAME_SEED.TARGET_SESSION_DIRECTION'));
});

test('missing core decision stays unresolved when seed does not provide it',()=>{
  const noMode={...seed,MULTIPLAYER_DESIGN_MODE:'',INITIAL_PLAY_MODE:''};
  const result=repairDesignRequiredFields({identity:'x',coreFun:'y',coreLoop:['a','b','c']},{seed:noMode});
  assert.equal(result.value.multiplayerMode,undefined);
  assert.ok(result.unresolved.includes('multiplayerMode'));
});

test('pre-contract party race design normalizes to COMPETITIVE only from strong legacy signals',()=>{
  const inferred=inferLegacyMultiplayerMode(legacyCompetitive,{date:'2026-09-12'});
  assert.equal(inferred.mode,'COMPETITIVE');
  assert.equal(inferred.source,'LEGACY_DESIGN.COMPETITIVE_LOOP_SIGNALS');
  assert.ok(inferred.signals.includes('race'));
  assert.ok(inferred.signals.includes('position'));
});

test('legacy inference remains fail-closed for ambiguous or post-contract designs',()=>{
  const ambiguous={...legacyCompetitive,identity:'legacy-party-game',coreLoop:['Start a party round','Clear obstacles','Retry']};
  assert.equal(inferLegacyMultiplayerMode(ambiguous,{date:'2026-09-12'}).mode,'');
  assert.equal(inferLegacyMultiplayerMode(legacyCompetitive,{date:'2026-09-15'}).mode,'');
  assert.equal(inferLegacyMultiplayerMode(legacyCompetitive,{date:'2026-09-16'}).mode,'');
});

test('explicit canonical multiplayer mode is never overwritten by legacy inference',()=>{
  const explicit={...legacyCompetitive,multiplayerMode:'COOP'};
  const inferred=inferLegacyMultiplayerMode(explicit,{date:'2026-09-12'});
  assert.equal(inferred.mode,'COOP');
  const result=repairDesignRequiredFields(explicit,{designDate:'2026-09-12',allowLegacyMultiplayerInference:true});
  assert.equal(result.value.multiplayerMode,'COOP');
  assert.equal(result.repairs.some(row=>row.field==='multiplayerMode'),false);
});

test('persisted repair never mutates strict score or verdict and creates no artbook',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-prepromotion-repair-'));
  write(root,'game-seed-state.json',{version:2,seeds:[seed]});
  write(root,'design/repair-game/2026-09-15/design-revised.json',{gameId:'repair-game',content:{identity:'기존 설계',coreFun:'기존 재미',coreLoop:['a','b','c']}});
  write(root,'design/repair-game/2026-09-15/strict-design-review.json',{gameId:'repair-game',verdict:'REVISE',totalScore:91,hardFailures:[]});
  const before=read(root,'design/repair-game/2026-09-15/strict-design-review.json');
  const result=repairPersistedDesignForPromotion({root,gameId:'repair-game',date:'2026-09-15',phase:'PRE_REVIEW'});
  const after=read(root,'design/repair-game/2026-09-15/strict-design-review.json');
  assert.equal(result.changed,true);
  assert.deepEqual(after,before);
  assert.equal(fs.existsSync(path.join(root,'artbook-submissions/repair-game/current.json')),false);
  const revised=read(root,'design/repair-game/2026-09-15/design-revised.json');
  assert.equal(revised.prePromotionRepair.strictScoreOrVerdictModified,false);
});

test('persisted pre-contract repair can recover only legacy multiplayer mode after active seed has retired',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-prepromotion-legacy-'));
  write(root,'game-seed-state.json',{version:2,seeds:[]});
  write(root,'design/legacy-skyline/2026-09-12/design-revised.json',{gameId:'legacy-skyline',content:legacyCompetitive});
  write(root,'design/legacy-skyline/2026-09-12/strict-design-review.json',{gameId:'legacy-skyline',verdict:'PASS',totalScore:100,hardFailures:[]});
  const before=read(root,'design/legacy-skyline/2026-09-12/strict-design-review.json');
  const result=repairPersistedDesignForPromotion({root,gameId:'legacy-skyline',date:'2026-09-12',phase:'FINAL_REVIEW_LEGACY_NORMALIZATION'});
  const after=read(root,'design/legacy-skyline/2026-09-12/strict-design-review.json');
  const revised=read(root,'design/legacy-skyline/2026-09-12/design-revised.json');
  assert.equal(result.changed,true);
  assert.equal(revised.content.multiplayerMode,'COMPETITIVE');
  assert.equal(revised.prePromotionRepair.legacyMultiplayerNormalization,true);
  assert.ok(revised.prePromotionRepair.repairs.some(row=>row.source==='LEGACY_DESIGN.COMPETITIVE_LOOP_SIGNALS'));
  assert.deepEqual(after,before);
});

test('review feedback repair is a no-op after a real strict PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-prepromotion-pass-'));
  write(root,'game-seed-state.json',{version:2,seeds:[seed]});
  write(root,'design/repair-game/2026-09-15/design-revised.json',{gameId:'repair-game',content:{identity:'기존 설계',coreFun:'기존 재미',coreLoop:['a','b','c']}});
  write(root,'design/repair-game/2026-09-15/strict-design-review.json',{gameId:'repair-game',verdict:'PASS',totalScore:88,hardFailures:[]});
  const result=repairPersistedDesignForPromotion({root,gameId:'repair-game',date:'2026-09-15',phase:'REVIEW_FEEDBACK'});
  assert.equal(result.changed,false);
  assert.equal(result.reason,'STRICT_ALREADY_PASS');
});

test('design generator uses grounded required-field repair only for designer draft and revision',()=>{
  const source=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
  assert.match(source,/repairDesignRequiredFields/);
  assert.match(source,/phase:'DRAFT'/);
  assert.match(source,/phase:'REVISION'/);
  const uses=source.match(/repairRequired:value=>repairDesignRequiredFields/g)||[];
  assert.equal(uses.length,2);
  assert.doesNotMatch(source,/repairRequired:value=>repairDesignRequiredFields\(value,\{seed,factPack,phase:'STRICT/);
});
