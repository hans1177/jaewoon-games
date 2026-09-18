import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importCommercialRuntimeSamples, validateCommercialRuntimeSample } from '../tools/vibe3-commercial-runtime-import.mjs';

const sample=()=>({
  version:1,
  taskType:'unity',
  practiceOnly:true,
  runtimePromotionAllowed:false,
  authority:'PRACTICE_ONLY',
  sourceKind:'commercial-runtime-reference',
  synthetic:false,
  project:'external-commercial-brawl-stars',
  gameId:'brawl-stars',
  difficulty:'production-reference',
  instruction:'runtime observation only',
  input:'official store install and observed runtime',
  output:'independent implementation lesson',
  sourceRevision:'external-playtest-123-brawl-stars',
  provenance:{
    sourceKind:'commercial-runtime-reference',
    observationKind:'BLACK_BOX_RUNTIME_ONLY',
    sourceSeed:'game-seed-market-evidence.json',
    gameTitle:'Brawl Stars',
    packageId:'com.supercell.brawlstars',
    storeUrl:'https://play.google.com/store/apps/details?id=com.supercell.brawlstars',
    playtestRunId:'123',
    beforeScreenshotSha256:'a',
    afterScreenshotSha256:'b',
    codeExtracted:false,
    binaryRedistributed:false,
    evidenceRetention:'EPHEMERAL_ARTIFACT_ONLY'
  },
  qa:{
    teacherReview:'PASS',
    licenseCheck:'NOT_APPLICABLE',
    runtime:'PASS',
    independentQa:'NOT_APPLICABLE',
    browserQa:'NOT_APPLICABLE'
  },
  topic:'commercial-action-pvp-runtime-architecture',
  tags:['short-match','arena-positioning','ability-cooldown']
});

assert.equal(validateCommercialRuntimeSample(sample()).sourceKind,'commercial-runtime-reference');
assert.throws(()=>validateCommercialRuntimeSample({...sample(),runtimePromotionAllowed:true}),/AUTHORITY_INVALID/);
assert.throws(()=>validateCommercialRuntimeSample({...sample(),provenance:{...sample().provenance,codeExtracted:true}}),/EXTRACTION_BOUNDARY_INVALID/);

const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe3-commercial-import-'));
const input=path.join(root,'input'),output=path.join(root,'output');
fs.mkdirSync(input,{recursive:true});
fs.writeFileSync(path.join(input,'commercial-runtime-brawl-stars.json'),JSON.stringify(sample(),null,2));
const first=importCommercialRuntimeSamples({inputDir:input,outputDir:output});
assert.equal(first.examined,1);
assert.equal(first.written.length,1);
assert.equal(first.replaced.length,0);
const target=path.join(output,'commercial-runtime-brawl-stars.json');
assert.equal(fs.existsSync(target),true);
const persisted=JSON.parse(fs.readFileSync(target,'utf8'));
assert.equal(persisted.practiceOnly,true);
assert.equal(persisted.runtimePromotionAllowed,false);
assert.equal(persisted.provenance.observationKind,'BLACK_BOX_RUNTIME_ONLY');

const newer={...sample(),sourceRevision:'external-playtest-124-brawl-stars'};
fs.writeFileSync(path.join(input,'commercial-runtime-brawl-stars.json'),JSON.stringify(newer,null,2));
const second=importCommercialRuntimeSamples({inputDir:input,outputDir:output});
assert.equal(second.replaced.length,1);
assert.equal(JSON.parse(fs.readFileSync(target,'utf8')).sourceRevision,'external-playtest-124-brawl-stars');

const ingestWorkflow=fs.readFileSync('.github/workflows/vibe2-distillation-ingest.yml','utf8');
const playtestWorkflow=fs.readFileSync('.github/workflows/external-mobile-free-game-playtest.yml','utf8');
assert.equal((ingestWorkflow.match(/Vibe2 External Mobile Free Game Playtest/g)||[]).length,0,'commercial playtest must not keep a duplicate workflow_run ingest trigger');
assert.match(ingestWorkflow,/external_playtest_run_id:/);
assert.match(ingestWorkflow,/run-id: \${\{ inputs\.external_playtest_run_id \}\}/);
assert.equal((playtestWorkflow.match(/vibe2-distillation-ingest\.yml\/dispatches/g)||[]).length,1,'playtest must dispatch exactly one canonical ingest route');
assert.match(playtestWorkflow,/external_playtest_run_id:\$run_id/);

console.log('PASS commercial runtime artifact importer preserves practice-only canonical boundary and single ingest route');
