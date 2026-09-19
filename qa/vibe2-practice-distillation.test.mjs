// 파일명: qa/vibe2-practice-distillation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePracticeResultForDistillation,
  distillPracticeResult,
  mergePracticeDistillationStore
} from '../tools/vibe2-practice-distillation.mjs';

const result={
  taskId:'LEARNING-PRACTICE-gap-save-l1',
  practiceOnly:true,
  productionPass:false,
  sourceWrite:false,
  knowledgeState:'UNTRUSTED_PRACTICE_OUTPUT',
  rawModelOutputSha256:'a'.repeat(64),
  rawModelOutputStored:false,
  candidateLessonsVerified:false,
  retrievalEligible:false,
  masteryCreditEligible:false,
  canonicalTrainingEligible:false,
  independentVerificationRequired:true,
  distillationRequiredBeforeReuse:true,
  evaluation:'PASS',
  diagnosis:'Save restore path needs one authoritative owner.',
  strategy:'Verify save restore transitions through one bounded persistence owner.',
  tests:['save reload restores state','double restore is idempotent','restart then load works'],
  reusablePatterns:['single save persistence owner'],
  avoidPatterns:['duplicate save restore mutation']
};
const order={originalGoal:'[VIBE_LEARNING_PRACTICE]\nkind=MINI_GAME_SYSTEM_DRILL\ndomains=SAVE'};
const patterns={patterns:[
  {id:'p1',system:'SAVE_PERSISTENCE',verified:true,rawCodeStored:false,independentQa:'PASS',sourceRevision:'1'.repeat(40)},
  {id:'p2',system:'SAVE_PERSISTENCE',verified:true,rawCodeStored:false,independentQa:'PASS',sourceRevision:'2'.repeat(40)}
]};

test('raw practice output cannot bypass the quarantine boundary',()=>{
  const check=validatePracticeResultForDistillation({...result,retrievalEligible:true});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes('RAW_RETRIEVAL_FORBIDDEN'));
});

test('practice distillation stores only verified domain signal and provenance',()=>{
  const distilled=distillPracticeResult({result,order,codePatternsInput:patterns});
  assert.equal(distilled.accepted.length,1);
  const row=distilled.accepted[0];
  assert.equal(row.domain,'SAVE');
  assert.equal(row.authority,'VERIFIED_DISTILLED_PRACTICE_KNOWLEDGE');
  assert.equal(row.verified,true);
  assert.equal(row.independentlyVerified,true);
  assert.equal(row.retrievalEligible,true);
  assert.equal(row.rawModelOutputStored,false);
  assert.equal(row.candidateTextStored,false);
  assert.equal(row.directMasteryCredit,false);
  assert.equal(row.directTrainingSample,false);
  assert.equal(row.verificationEvidence.length,2);
  const serialized=JSON.stringify(distilled);
  assert.doesNotMatch(serialized,/single save persistence owner/);
  assert.doesNotMatch(serialized,/duplicate save restore mutation/);
  assert.doesNotMatch(serialized,/authoritative owner/);
});

test('one verified evidence item is insufficient for practice promotion',()=>{
  const distilled=distillPracticeResult({result,order,codePatternsInput:{patterns:[patterns.patterns[0]]}});
  assert.equal(distilled.accepted.length,0);
  assert.equal(distilled.rejected[0].reason,'INSUFFICIENT_VERIFIED_CORROBORATION');
});

test('practice store dedupes by domain and only strengthens verified advisory signal',()=>{
  const a=distillPracticeResult({result,order,codePatternsInput:patterns});
  const first=mergePracticeDistillationStore({},[a]);
  const second=mergePracticeDistillationStore(first.store,[a]);
  assert.equal(second.store.entries.length,1);
  assert.equal(second.store.entries[0].confirmations,2);
  assert.equal(second.store.entries[0].candidateTextStored,false);
  assert.equal(second.store.entries[0].directProductionPass,false);
  assert.equal(second.store.entries[0].directTrainingSample,false);
});


test('narrative practice distills technique domains without storing candidate prose',()=>{
  const narrativeResult={
    ...result,
    taskId:'LEARNING-PRACTICE-story-quest-l1',
    diagnosis:'Narrative structure needs clear foreshadowing payoff and quest causality.',
    strategy:'Track character motivation, quest prerequisite, reveal order, dialogue subtext and payoff.',
    tests:['quest prerequisite causes next state','foreshadowing has payoff','dialogue respects character knowledge'],
    reusablePatterns:['cause and effect narrative structure','character arc motivation consistency'],
    avoidPatterns:['knowledge leak','fake choice without consequence']
  };
  const narrativeOrder={originalGoal:'[VIBE_LEARNING_PRACTICE]\nkind=NARRATIVE_STRUCTURE_DRILL\ndomains=STORYTELLING,NARRATIVE_STRUCTURE,QUEST_DESIGN,CHARACTER_ARC,DIALOGUE'};
  const narrativeExperience={records:[
    {id:'n1',gameId:'story-game-a',taskType:'storytelling',verified:true,reusable:true,problem:'story pacing',goal:'quest causality and foreshadowing',change:'character arc and dialogue consistency',reusablePatterns:['narrative structure quest dialogue character arc foreshadow payoff']},
    {id:'n2',gameId:'story-game-b',taskType:'storytelling',verified:true,reusable:true,problem:'narrative payoff',goal:'story quest consequence',change:'character motivation and dialogue subtext',reusablePatterns:['storytelling narrative structure quest design character arc dialogue']}
  ]};
  const distilled=distillPracticeResult({result:narrativeResult,order:narrativeOrder,experienceInput:narrativeExperience});
  const domains=distilled.accepted.map(row=>row.domain);
  assert.ok(domains.includes('STORYTELLING'));
  assert.ok(domains.includes('NARRATIVE_STRUCTURE'));
  assert.ok(domains.includes('QUEST_DESIGN'));
  assert.ok(domains.includes('CHARACTER_ARC'));
  assert.ok(domains.includes('DIALOGUE'));
  assert.equal(distilled.accepted.every(row=>row.rawModelOutputStored===false&&row.candidateTextStored===false),true);
  const serialized=JSON.stringify(distilled);
  assert.doesNotMatch(serialized,/cause and effect narrative structure/);
  assert.doesNotMatch(serialized,/fake choice without consequence/);
});


test('presentation practice distills only verified quality domains without storing candidate prose',()=>{
  const presentationResult={
    ...result,
    taskId:'LEARNING-PRACTICE-presentation-l1',
    diagnosis:'Living motion needs locomotion blend, animation feel hit stop, bounded VFX, audio feel crossfade and camera language.',
    strategy:'Use asset adaptation style lock, secondary motion, recoil recovery, particle lifetime, first gesture audio unlock and controlled camera shake.',
    tests:['motion continuity','vfx readability','audio transition','camera mobile readability'],
    reusablePatterns:['asset adaptation living motion animation feel vfx audio feel camera language'],
    avoidPatterns:['unbounded particles','duplicate audio owner','camera obscures touch input']
  };
  const presentationOrder={originalGoal:'[VIBE_LEARNING_PRACTICE]\nkind=MOTION_CONTINUITY_DRILL\ndomains=ASSET_ADAPTATION,LIVING_MOTION,ANIMATION_FEEL,VFX,AUDIO_FEEL,CAMERA_LANGUAGE'};
  const experienceInput={records:[
    {id:'p1',gameId:'present-a',taskType:'presentation',verified:true,reusable:true,problem:'living motion vfx audio feel',goal:'asset adaptation camera language',change:'animation feel locomotion blend particle crossfade camera shake',reusablePatterns:['asset adaptation living motion animation feel vfx audio feel camera language']},
    {id:'p2',gameId:'present-b',taskType:'presentation',verified:true,reusable:true,problem:'style lock motion continuity',goal:'vfx audio feel camera language',change:'asset adaptation hit stop recoil trail audio context camera zoom',reusablePatterns:['living motion animation feel vfx audio feel camera language']}
  ]};
  const distilled=distillPracticeResult({result:presentationResult,order:presentationOrder,experienceInput});
  const domains=distilled.accepted.map(row=>row.domain);
  for(const domain of ['ASSET_ADAPTATION','LIVING_MOTION','ANIMATION_FEEL','VFX','AUDIO_FEEL','CAMERA_LANGUAGE']){
    assert.ok(domains.includes(domain),domain);
  }
  assert.equal(distilled.accepted.every(row=>row.rawModelOutputStored===false&&row.candidateTextStored===false),true);
  const serialized=JSON.stringify(distilled);
  assert.doesNotMatch(serialized,/secondary motion/);
  assert.doesNotMatch(serialized,/duplicate audio owner/);
});
