import test from 'node:test';
import assert from 'node:assert/strict';
import { gameplayFamily, rebalanceProductionTiers, selectDiverseTopRows } from '../tools/company-status-sync.mjs';

const fsStub={existsSync:()=>true};
const project=(id,slug,total)=>({id,slug,name:slug,sourcePath:`web-games/${slug}`,profileStatus:'DESIGN_ONLY',mode:'REDESIGN',developmentFocus:{total}});
const game=(id,genre)=>({id,name:id,genre,homepageWebPlayable:true,hasWebArchive:true,webPath:`/web-games/${id}/`});

function fixture(){
  return {
    portfolio:{
      productionTierPolicy:{releaseConfirmedCount:2,developmentConfirmedCount:3,fixedGameIds:false,autoPromotionDemotion:true,portfolioDiversity:{enabled:true,maxFocusScoreGap:1}},
      projects:[
        project('P1','survival-a',9),
        project('P2','rpg-a',8),
        project('P3','survival-b',8),
        project('P4','defense-a',7),
        project('P5','defense-b',6),
        project('P6','monster-a',5),
        project('P7','collection-a',4),
      ],
    },
    catalog:{games:[
      game('survival-a',['생존','제작']),
      game('rpg-a',['RPG','탐험']),
      game('survival-b',['생존','탐험']),
      game('defense-a',['웨이브','전략']),
      game('defense-b',['디펜스','전략']),
      game('monster-a',['몬스터','턴제','모험']),
      game('collection-a',['수집','성장']),
    ]},
    artbooks:{artbooks:[]},
  };
}

test('gameplay family normalizes gameplay genres without game ID rules',()=>{
  assert.equal(gameplayFamily({genre:['웨이브','곤충']}),'DEFENSE');
  assert.equal(gameplayFamily({genre:['몬스터','턴제','모험']}),'TURN_BASED');
  assert.equal(gameplayFamily({genre:['생존','제작']}),'SURVIVAL');
  assert.equal(gameplayFamily({genre:['수집','성장']}),'COLLECTION');
});

test('top five prefers a new gameplay family when quality is within one focus point',()=>{
  const {portfolio,catalog,artbooks}=fixture();
  const result=rebalanceProductionTiers({portfolio,catalog,artbooks,filesystem:fsStub});
  assert.deepEqual(result.state.releaseConfirmedGameIds,['P1','P2']);
  assert.deepEqual(result.state.developmentConfirmedGameIds,['P3','P4','P6']);
  assert.equal(result.state.diversity.adjusted,true);
  assert.deepEqual(result.state.diversity.distinctFamilies.sort(),['DEFENSE','RPG','SURVIVAL','TURN_BASED'].sort());
  assert.equal(portfolio.projects.find(row=>row.id==='P5').productionTier,3);
  assert.equal(portfolio.projects.find(row=>row.id==='P6').productionTier,2);
  assert.equal(catalog.games.find(row=>row.id==='monster-a').homepageCategory,'development-confirmed');
  assert.equal(catalog.games.find(row=>row.id==='defense-b').homepageCategory,'design-only');
});

test('diversity does not force a much weaker unique game into the top five',()=>{
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
