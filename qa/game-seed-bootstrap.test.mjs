import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SEED_CATEGORIES,createInitialSeedBatch,materializeSeed,normalizeSeedRegistry,recordVacancy,replenishSeed,validateMarketEvidence,validateSeed,
} from '../tools/game-seed-bootstrap.mjs';

const seed=(category,index=1)=>({
  gameId:`seed-${category.toLowerCase().replaceAll('_','-')}-${index}`,
  name:`${category} ${index}`,
  gameCategory:category,
  transformationMode:'REINTERPRETATION',
  referenceGames:[{name:'Successful Reference',source:'https://example.com/reference'}],
  coreFunToLearn:'짧은 세션에서 선택이 즉시 전투 결과를 바꾸는 재미',
  coreLoop:['진입','선택','전투','보상'],
  distinctIdentity:`${category}를 독립 세계관과 시스템 조합으로 재해석`,
  marketEvidence:[{metric:'REVENUE_RANK_OR_REVENUE_SIGNAL',status:'UNKNOWN'}],
  targetAudience:'모바일 싱글 플레이 이용자',
  targetSessionDirection:'짧은 반복 세션',
  initialTargetPlatform:'ANDROID_MOBILE',
  initialPlayMode:'SINGLE_PLAYER',
  steamExpansionPossible:'POSSIBLE',
  multiplayerExpansionPossible:'NOT_RECOMMENDED',
  multiplayerExpansionValue:'LOW',
  futureMultiplayerMode:'NONE',
});

test('initial bootstrap requires exactly one seed for each of six categories',()=>{
  const batch=SEED_CATEGORIES.map((c,i)=>seed(c,i+1));
  const result=createInitialSeedBatch({},batch,'2026-09-11T00:00:00Z');
  assert.equal(result.seeds.length,6);
  assert.equal(result.state.bootstrapComplete,true);
  assert.throws(()=>createInitialSeedBatch(result.state,batch),/ALREADY_COMPLETE/);
  assert.throws(()=>createInitialSeedBatch({},batch.slice(0,5)),/REQUIRES_6/);
});

test('normal promotion is not a replenishment trigger',()=>{
  const state=normalizeSeedRegistry({bootstrapComplete:true,seeds:[],vacancies:[]});
  assert.throws(()=>replenishSeed(state,seed(SEED_CATEGORIES[0]),{trigger:'PROMOTED'}),/TRIGGER_NOT_ALLOWED/);
});

test('discard vacancy replenishes one-for-one in the same category',()=>{
  const original=seed(SEED_CATEGORIES[0],1);
  const state=normalizeSeedRegistry({bootstrapComplete:true,seeds:[{...original,status:'ACTIVE'}],vacancies:[]});
  const vacancyResult=recordVacancy(state,{gameId:original.gameId,reason:'DISCARDED'});
  const replacement=seed(SEED_CATEGORIES[0],2);
  const filled=replenishSeed(vacancyResult.state,replacement,{trigger:'DISCARDED',vacancyId:vacancyResult.vacancy.id});
  assert.equal(filled.vacancy.status,'FILLED');
  assert.equal(filled.vacancy.replacementGameId,replacement.gameId);
  assert.throws(()=>replenishSeed(vacancyResult.state,seed(SEED_CATEGORIES[1],3),{trigger:'DISCARDED',vacancyId:vacancyResult.vacancy.id}),/OPEN_VACANCY_REQUIRED|CATEGORY_MUST_MATCH/);
});

test('market evidence is reference-only but numeric claims need source and observedAt',()=>{
  assert.equal(validateMarketEvidence([{metric:'AVERAGE_PLAYTIME',status:'UNKNOWN'}]).pass,true);
  assert.equal(validateMarketEvidence([{metric:'AVERAGE_PLAYTIME',value:12.5}]).pass,false);
  assert.equal(validateMarketEvidence([{metric:'AVERAGE_PLAYTIME',value:12.5,source:'https://example.com',observedAt:'2026-09-11'}]).pass,true);
  assert.equal(validateSeed(seed(SEED_CATEGORIES[2])).pass,true);
});

test('materialization registers DESIGN_ONLY metadata without making a playable homepage game',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'seed-bootstrap-'));
  fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[]},null,2));
  const result=materializeSeed(seed(SEED_CATEGORIES[3]),{root,date:'2026-09-11'});
  assert.equal(result.game.productionClass,'DESIGN_ONLY');
  assert.equal(result.game.homepageVisible,false);
  assert.equal(result.game.playable,false);
  assert.ok(fs.existsSync(path.join(root,result.seedPath)));
  assert.ok(fs.existsSync(path.join(root,result.factPath)));
});
