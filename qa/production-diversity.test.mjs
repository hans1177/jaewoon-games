// 파일명: qa/production-diversity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gameplayFamily, selectDiverseTopRows, syncProductionClasses } from '../tools/company-status-sync.mjs';

const fsStub={existsSync:()=>true};
const project=(id,slug,total,productionClass)=>({id,slug,name:slug,sourcePath:`web-games/${slug}`,productionClass,profileStatus:productionClass,mode:productionClass==='DESIGN_ONLY'?'REDESIGN':'IMPROVE',developmentFocus:{total}});
const game=(id,genre,productionClass)=>({id,name:id,genre,productionClass,homepageWebPlayable:true,hasWebArchive:true,webPath:`/web-games/${id}/`});

function fixture(){
  const assignments=[
    ['P1','survival-a',9,'RELEASE_CONFIRMED',['생존','제작']],
    ['P2','rpg-a',8,'RELEASE_CONFIRMED',['RPG','탐험']],
    ['P3','survival-b',8,'RELEASE_CONFIRMED',['생존','탐험']],
    ['P4','defense-a',7,'DEVELOPMENT_CONFIRMED',['웨이브','전략']],
    ['P5','defense-b',6,'DESIGN_ONLY',['디펜스','전략']],
    ['P6','monster-a',5,'DESIGN_ONLY',['몬스터','턴제','모험']],
    ['P7','collection-a',4,'DESIGN_ONLY',['수집','성장']],
  ];
  return {
    portfolio:{
      productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
      developmentFocusPolicy:{maxFocusedGames:1},
      projects:assignments.map(([id,slug,total,productionClass])=>project(id,slug,total,productionClass)),
    },
    catalog:{games:assignments.map(([,slug,,productionClass,genre])=>game(slug,genre,productionClass))},
    artbooks:{artbooks:[]},
  };
}

test('gameplay family normalizes gameplay genres without game ID rules',()=>{
  assert.equal(gameplayFamily({genre:['웨이브','곤충']}),'DEFENSE');
  assert.equal(gameplayFamily({genre:['몬스터','턴제','모험']}),'TURN_BASED');
  assert.equal(gameplayFamily({genre:['생존','제작']}),'SURVIVAL');
  assert.equal(gameplayFamily({genre:['수집','성장']}),'COLLECTION');
});

test('status sync preserves semantic memberships without numeric tier state or fixed quotas',()=>{
  const {portfolio,catalog,artbooks}=fixture();
  const result=syncProductionClasses({portfolio,catalog,artbooks,filesystem:fsStub});
  assert.deepEqual(result.state.releaseConfirmedGameIds,['P1','P2','P3']);
  assert.deepEqual(result.state.developmentConfirmedGameIds,['P4']);
  assert.deepEqual(result.state.designOnlyGameIds,['P5','P6','P7']);
  assert.deepEqual(result.state.counts,{releaseConfirmed:3,developmentConfirmed:1,designOnly:3});
  assert.equal(result.state.fixedCounts,false);
  assert.equal(result.state.countsDerivedFromMembership,true);
  assert.equal(result.state.diversity.membershipInfluence,false);
  assert.equal(result.state.diversity.adjusted,false);
  assert.equal(portfolio.projects.find(row=>row.id==='P3').productionClass,'RELEASE_CONFIRMED');
  assert.equal(Object.hasOwn(portfolio.projects.find(row=>row.id==='P3'),'productionTier'),false);
  assert.equal(portfolio.projects.find(row=>row.id==='P6').productionClass,'DESIGN_ONLY');
  assert.equal(catalog.games.find(row=>row.id==='monster-a').homepageCategory,'design-only');
  assert.equal(Object.hasOwn(catalog.games.find(row=>row.id==='monster-a'),'productionTier'),false);
});

test('selected platform remains final runtime target after mandatory full approved-scope Web companion validation',()=>{
  const portfolio={
    productionClassPolicy:{fixedCounts:false,countsDerivedFromMembership:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
    developmentFocusPolicy:{maxFocusedGames:1},
    projects:[
      {id:'R',slug:'r',sourcePath:'web-games/r',productionSourcePath:'roblox-games/r',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX',developmentFocus:{total:8}},
      {id:'U',slug:'u',sourcePath:'web-games/u',productionSourcePath:'unity-games/u',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',unityProjectReady:true,developmentFocus:{total:9}},
      {id:'F',slug:'f',sourcePath:'web-games/f',productionSourcePath:'uefn-games/f',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN',developmentFocus:{total:7}},
      {id:'D',slug:'d',sourcePath:'web-games/d',productionClass:'DEVELOPMENT_CONFIRMED',developmentFocus:{total:6}},
    ],
  };
  const catalog={games:[
    {id:'r',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'ROBLOX',homepageWebPlayable:true},
    {id:'u',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'UNITY',homepageWebPlayable:true},
    {id:'f',productionClass:'RELEASE_CONFIRMED',selectedPlatform:'FORTNITE_UEFN',homepageWebPlayable:true},
    {id:'d',productionClass:'DEVELOPMENT_CONFIRMED',homepageWebPlayable:true},
  ]};
  const result=syncProductionClasses({portfolio,catalog,artbooks:{artbooks:[]},filesystem:fsStub});
  assert.equal(portfolio.projects.find(row=>row.id==='R').targetEngine,'roblox');
  assert.equal(portfolio.projects.find(row=>row.id==='U').targetEngine,'unity-android');
  assert.equal(portfolio.projects.find(row=>row.id==='F').targetEngine,'fortnite-uefn');
  const dev=portfolio.projects.find(row=>row.id==='D');
  assert.equal(dev.targetEngine,'platform-selection-required');
  assert.equal(dev.mode,'FULL_WEB_COMPANION_TARGET_PLATFORM_SELECTION_REQUIRED');
  assert.equal(dev.webPurpose,'FULL_APPROVED_SCOPE_PLAYABLE_AND_LEARNING_EVIDENCE');
  assert.equal(dev.webCompanionRequired,true);
  assert.equal(dev.approvedDesignScopeMustBeFullyImplemented,true);
  assert.equal(dev.webEvidenceMayReplaceNativePlatformEvidence,false);
  assert.equal(dev.webGameplayValidationRequired,true);
  assert.equal(dev.musicValidationRequired,true);
  assert.equal(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED.engine,'PROJECT_SELECTED_PLATFORM');
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.engine,'PROJECT_SELECTED_PLATFORM');
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.webBeforeTargetPlatformByDefault,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.targetPlatformMayRunImmediately,false);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.webCompanionRequired,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.approvedDesignScopeMustBeFullyImplemented,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.webEvidenceMayReplaceNativePlatformEvidence,false);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.webGameplayValidationRequired,true);
  assert.equal(portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED.musicValidationRequired,true);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'developmentConfirmedWebPrototypeAllowedAlongsideReleaseFocus'),false);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'optionalWebGameplayTestbedAllowedAlongsideReleaseFocus'),false);
  assert.equal(Object.hasOwn(portfolio.developmentFocusPolicy,'requiredWebGameplayAndMusicValidationBeforeTargetPlatform'),false);
  assert.equal(portfolio.developmentFocusPolicy.requiredFullApprovedWebCompanionBeforeTargetPlatform,true);
  assert.equal(portfolio.developmentFocusPolicy.nativePlatformEvidenceStillRequired,true);
  assert.equal((result.state.ranking||[]).some(row=>Object.hasOwn(row,'unityReady')),false);
});

test('diversity selector remains diagnostic-only and does not control membership',()=>{
  const rows=[
    {project:{id:'A'},gameplayFamily:'SURVIVAL',score:9,evidenceScore:900},
    {project:{id:'B'},gameplayFamily:'RPG',score:8,evidenceScore:800},
    {project:{id:'C'},gameplayFamily:'SURVIVAL',score:8,evidenceScore:790},
    {project:{id:'D'},gameplayFamily:'DEFENSE',score:7,evidenceScore:700},
    {project:{id:'E'},gameplayFamily:'DEFENSE',score:6,evidenceScore:600},
    {project:{id:'F'},gameplayFamily:'COLLECTION',score:4,evidenceScore:400},
  ];
  const selected=selectDiverseTopRows(rows,5,{enabled:true,maxFocusScoreGap:1});
  assert.deepEqual(selected.map(row=>row.project.id),['A','B','D','C','E']);
});
