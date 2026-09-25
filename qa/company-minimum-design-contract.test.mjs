import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMinimumDesignContract} from '../tools/company-minimum-design-contract.mjs';

const base=()=>({
  content:{
    identity:'A distinct survival RPG with a persistent village and dangerous expeditions.',
    coreFun:'Choose routes, fight enemies, extract resources, and improve the next expedition.',
    coreLoop:['prepare loadout','enter dangerous region','fight and collect','return and upgrade'],
    signatureSystems:[
      {name:'Risk Route',purpose:'Choose danger for better rewards',playerChoice:'safe or dangerous path'},
      {name:'Loadout Growth',purpose:'Trade resources for stronger future runs',playerChoice:'weapon or survival upgrade'}
    ],
    progressionDirection:'Persistent character and village growth unlock harder regions and more build choices.',
    failureRetryRisk:{failureStates:['player defeat','failed extraction'],retryFlow:'return and rebuild',riskPressure:'deeper regions increase enemy pressure',recoveryRules:'saved upgrades remain'},
    multiplayerMode:'COOP',
    technicalAssumptions:['authoritative gameplay state is separated from presentation','save schema meaning stays stable across platform implementations'],
    platformProfiles:{
      ROBLOX:{
        platform:'ROBLOX',inputModel:'keyboard gamepad and Roblox mobile controls',sessionModel:'social drop-in sessions with fast joins',multiplayerRuntime:'server authoritative Roblox replication',performanceBudget:'mobile Roblox performance budget with bounded effects',uiUx:'Roblox HUD with touch safe areas and social prompts',saveAndNetwork:'DataStore backed save and server validated remotes',platformContentAdaptation:'Roblox social sessions and avatar scale adaptation',internalReleaseTarget:'Private or restricted Roblox experience for owner playtest',validationEvidence:'published private place plus runtime QA and independent regression evidence'
      },
      UNITY:{
        platform:'UNITY',inputModel:'Unity Input System touch gamepad and keyboard',sessionModel:'mobile app sessions with suspend and resume handling',multiplayerRuntime:'app network transport only when multiplayer is enabled',performanceBudget:'Android memory GPU thermal and battery budget',uiUx:'safe-area responsive Unity UI and touch-first controls',saveAndNetwork:'versioned local save plus validated backend sync when needed',platformContentAdaptation:'scene prefab and mobile app lifecycle adaptation',internalReleaseTarget:'internal or closed Android test build',validationEvidence:'install launch runtime QA independent QA and regression evidence'
      }
    }
  }
});

test('minimum design requires common core and both distinct platform profiles',()=>{
  const gate=evaluateMinimumDesignContract(base());
  assert.equal(gate.pass,true);
  assert.equal(gate.platformProfiles.ROBLOX,true);
  assert.equal(gate.platformProfiles.UNITY,true);
  assert.equal(gate.platformProfiles.distinct,true);
});

test('single copied or missing platform design cannot start native development',()=>{
  const missing=base();delete missing.content.platformProfiles.UNITY;
  assert.equal(evaluateMinimumDesignContract(missing).pass,false);
  const copied=base();copied.content.platformProfiles.UNITY={...copied.content.platformProfiles.ROBLOX};
  copied.content.platformProfiles.UNITY.platform='UNITY';
  assert.equal(evaluateMinimumDesignContract(copied).pass,true);
  copied.content.platformProfiles.UNITY={...copied.content.platformProfiles.ROBLOX};
  assert.equal(evaluateMinimumDesignContract(copied).pass,false);
});


test('detailed multiplayer label may use canonical Roblox play mode without weakening the minimum gate',()=>{
  const detailed=base();
  detailed.content.multiplayerMode='COOP_WITH_BOSS_COMPANIONS';
  detailed.content.robloxBuildProfile={playMode:'COOP'};
  assert.equal(evaluateMinimumDesignContract(detailed).pass,true);

  const competitive=base();
  competitive.content.multiplayerMode='FOUR_VS_FOUR_INFECTION_WITH_AI_FILL';
  competitive.content.robloxBuildProfile={playMode:'COMPETITIVE'};
  assert.equal(evaluateMinimumDesignContract(competitive).pass,true);

  const invalid=base();
  invalid.content.multiplayerMode='CUSTOM_UNCLASSIFIED_MODE';
  invalid.content.robloxBuildProfile={playMode:'CUSTOM'};
  assert.equal(evaluateMinimumDesignContract(invalid).pass,false);
});
