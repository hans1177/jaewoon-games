import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const noArtbook=fs.readFileSync('qa/design-pipeline-no-artbook-regression.test.mjs','utf8');
const write=(root,file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');};

test('grounded repair runs before strict review with one bounded feedback pass',()=>{
  const pre=workflow.indexOf('Repair missing pre-promotion design requirements');
  const strict=workflow.indexOf('Apply strict 30-minute design review');
  const feedback=workflow.indexOf('Apply one bounded review-feedback repair and re-review');
  const verify=workflow.indexOf('Verify baseline and strict review contract');
  assert.ok(pre>=0&&strict>pre&&feedback>strict&&verify>feedback);
  assert.match(workflow,/company-design-prepromotion-repair\.mjs --game-id="\$GAME_ID" --date="\$ARTBOOK_DATE" --phase=PRE_REVIEW/);
  assert.match(workflow,/--phase=REVIEW_FEEDBACK/);
  assert.match(workflow,/REVIEW_FEEDBACK_REPAIR_MAX=1/);
  assert.match(workflow,/node tools\/company-baseline-gate\.mjs/);
  assert.match(workflow,/STRICT_DESIGN_SCORE_SYNTHESIZED=NO/);
  assert.match(workflow,/STRICT_DESIGN_VERDICT_SYNTHESIZED=NO/);
  assert.match(workflow,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.match(noArtbook,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
});

test('91 point REVISE with zero hard failures still cannot promote',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-revise-91-'));
  write(root,'game-seed-state.json',{version:2,seeds:[{seedId:'S91',gameId:'g91',gameName:'G91',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[]});
  write(root,'design/g91/2026-09-15/design-revised.json',{gameId:'g91',content:{identity:'distinct',coreLoop:['a','b','c']}});
  write(root,'design/g91/2026-09-15/cycle-status.json',{gameId:'g91',productionClass:'DESIGN_ONLY',status:'COMPLETE',baselineGate:{state:'DESIGN_BASELINE_READY',ready:true}});
  write(root,'design/g91/2026-09-15/strict-design-review.json',{gameId:'g91',reviewStage:'DESIGN_STRICT_REVIEW',verdict:'REVISE',totalScore:91,hardFailures:[]});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  const state=JSON.parse(fs.readFileSync(path.join(root,'game-seed-state.json'),'utf8'));
  assert.equal(state.seeds[0].productionClass,undefined);
  assert.equal(state.seeds[0].lifecycleState,'DESIGN_REVISION_REQUIRED');
});
