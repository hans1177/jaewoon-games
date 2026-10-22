import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createGenreCareerMotionPalette,
  COMMON_CAREER_MOTION_HIERARCHY,
  COMMON_GENRE_CAREER_PRESENTATIONS
} from '../assets/vibe-motion-director.js';
import {buildGenreCareerAuthoringGuidance} from '../tools/vibe2-source-worker.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/roblox/actors/manifest.json'),'utf8'));
const exists=file=>fs.existsSync(path.join(ROOT,file));
const parseContract=block=>{
  const match=/\[GENRE CAREER CC0 AUTHORING BEGIN\]\n([^\n]+)\n/.exec(block);
  assert.ok(match,'existing worker must include the genre/career authoring contract');
  return JSON.parse(match[1]);
};

test('all four genres reuse actual known career motion hierarchy, without changing gameplay authority',()=>{
  for(const [genre,profile] of Object.entries(COMMON_GENRE_CAREER_PRESENTATIONS)){
    for(const platform of ['WEB','ROBLOX']){
      const palette=createGenreCareerMotionPalette({genre,platform});
      assert.equal(palette.profile,genre);
      assert.ok(palette.careerCount>=6,genre);
      assert.equal(palette.gameplayAuthority,false);
      assert.equal(palette.runtimeVerified,false);
      assert.equal(palette.productionVerified,false);
      for(const role of palette.careers){
        assert.ok(Object.hasOwn(COMMON_CAREER_MOTION_HIERARCHY,role.careerId));
        assert.ok(role.actualCc0MasterPath.startsWith('assets/roblox/actors/native/'));
        assert.ok(Array.isArray(role.inheritedCareers)&&role.inheritedCareers.length>=2);
        assert.ok(Object.values(role.roles).some(group=>group.length>0));
      }
    }
  }
});

test('cozy creation uses verified registered CC0 models and existing actual FBX files',()=>{
  const block=buildGenreCareerAuthoringGuidance({
    target:'web',goal:'코지 생활 게임 캐릭터 모션, 요리사 농부 대장장이 다양한 애니메이션',
    assetProduction:{styleBible:{styleFamily:'CARTOON'}}
  },{actorManifest:manifest,sourceExists:exists});
  const plan=parseContract(block);
  assert.equal(plan.genre,'COZY');
  assert.equal(plan.artLockPreserved,true);
  assert.ok(plan.careers.some(row=>row.id==='CHEF'));
  assert.ok(plan.careers.some(row=>row.id==='FARMER'));
  assert.ok(plan.cc0SourceExamples.some(row=>row.path.endsWith('Chef_Male.fbx')));
  assert.ok(plan.cc0SourceExamples.every(row=>row.nativeRigConversionRequired===true&&/^[a-f0-9]{64}$/.test(row.sha256)));
  assert.equal(plan.studioExecutionRequested,false);
  assert.equal(plan.verifiedByThisGuidance,false);
});

test('dark ARPG and horror use different actions and grounded source actors',()=>{
  const dark=parseContract(buildGenreCareerAuthoringGuidance({
    target:'web',goal:'디아블로식 다크 ARPG 직업과 강한 타격 모션'
  },{actorManifest:manifest,sourceExists:exists}));
  const horror=parseContract(buildGenreCareerAuthoringGuidance({
    target:'roblox',goal:'공포 게임 좀비 귀신 스켈레톤 액션과 모션'
  },{actorManifest:manifest,sourceExists:exists}));
  assert.equal(dark.genre,'DARK_ARPG');
  assert.equal(horror.genre,'HORROR');
  assert.ok(dark.careers.some(row=>row.id==='BERSERKER'));
  assert.ok(horror.careers.some(row=>row.id==='NECROMANCER'));
  assert.ok(horror.cc0SourceExamples.some(row=>/Zombie_|Ghost\.fbx|Skeleton\.fbx/.test(row.path)));
  assert.ok(dark.nativeMasters.some(row=>row.present===true&&row.registeredClipCount>0));
  assert.ok(horror.nativeMasters.some(row=>row.present===true));
  assert.equal(horror.studioGateNotWaived,true);
  assert.equal(horror.cloudflareRequested,false);
});

test('explicit career and style are respected, not silently replaced',()=>{
  const out=parseContract(buildGenreCareerAuthoringGuidance({
    target:'web',goal:'판타지 캐릭터 모션',selectedTask:{careerId:'ARCHER'},
    assetProduction:{styleBible:{styleFamily:'HIGH_FANTASY'}}
  },{actorManifest:manifest,sourceExists:exists}));
  assert.equal(out.careers.length,1);
  assert.equal(out.careers[0].id,'ARCHER');
  assert.equal(out.styleFamily,'HIGH_FANTASY');
});

test('unrelated tasks and unsupported platforms receive no additional work instructions',()=>{
  assert.equal(buildGenreCareerAuthoringGuidance({target:'web',goal:'Fix a save key'}),'');
  assert.equal(buildGenreCareerAuthoringGuidance({target:'system',goal:'motion engine architecture'}),'');
  assert.equal(buildGenreCareerAuthoringGuidance({target:'roblox',goal:'motion lesson',source:{internalAssetMotion:true}}),'');
});
