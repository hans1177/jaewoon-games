import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

function schedulerFromSource(){
  const start=design.indexOf('async function parallelObjectByLane');
  const end=design.indexOf('\nfunction parseJsonObject',start);
  assert.ok(start>=0&&end>start,'parallelObjectByLane scheduler missing');
  const source=design.slice(start,end);
  return new Function('clean','modelPhaseConcurrency',`${source}; return parallelObjectByLane;`)(value=>String(value??'').trim(),3);
}

test('DESIGN_ONLY preserves central 20-game WIP and 75-second model-call budget',()=>{
  assert.match(flow,/concurrentGameWipMax:\s*20/);
  assert.match(flow,/adaptiveBackpressureSteps:\s*\[20, 16, 12, 8, 4\]/);
  assert.match(workflow,/COMPANY_MODEL_CALL_TIMEOUT_MS:\s*'75000'/);
  assert.match(workflow,/max-parallel:\s*\$\{\{ fromJSON\(needs\.resolve-seed-targets\.outputs\.parallel_max\) \}\}/);
  assert.match(design,/const modelPhaseConcurrency=Math\.max\(1,Math\.min\(3,/);
  assert.match(design,/const modelCallTimeoutMs=Math\.min\(75000,/);
  assert.match(design,/AbortSignal\.timeout\(modelCallTimeoutMs\)/);
});

test('independent AI reviews serialize duplicate model lanes without removing three-way cross-model parallelism',async()=>{
  assert.match(design,/parallelObjectByLane\(Object\.keys\(independentReviewTasks\),key=>independentReviewTasks\[key\]\.model/);
  const schedule=schedulerFromSource();
  const keys=['a1','a2','a3','b1','b2','c1'];
  const laneForKey=key=>key[0];
  const activeByLane=new Map();
  let activeTotal=0;
  let maxActiveTotal=0;
  let duplicateLaneOverlap=false;
  const result=await schedule(keys,laneForKey,async key=>{
    const lane=laneForKey(key);
    const laneActive=(activeByLane.get(lane)||0)+1;
    activeByLane.set(lane,laneActive);
    if(laneActive>1)duplicateLaneOverlap=true;
    activeTotal++;
    maxActiveTotal=Math.max(maxActiveTotal,activeTotal);
    await new Promise(resolve=>setTimeout(resolve,15));
    activeTotal--;
    activeByLane.set(lane,(activeByLane.get(lane)||1)-1);
    return `done:${key}`;
  });
  assert.equal(duplicateLaneOverlap,false,'same model lane must never overlap itself');
  assert.equal(maxActiveTotal,3,'different model lanes must still reach configured three-way parallelism');
  assert.deepEqual(Object.keys(result),keys);
  for(const key of keys)assert.equal(result[key],`done:${key}`);
});

test('five-department AI verification and bounded retry contracts remain mandatory',()=>{
  assert.deepEqual(directive.ai.departments,['planning','graphics','development','qa','balance']);
  assert.equal(directive.ai.minDistinctModelsPerDepartment,3);
  assert.equal(directive.ai.departmentReviewModelCount,3);
  assert.equal(new Set(Object.values(directive.ai.departmentLeadModels)).size,5);
  assert.match(design,/const independentReviewTasks=/);
  assert.match(design,/department_representatives/);
  assert.match(design,/lead_rebuttals/);
  assert.match(design,/five_lead_fatal_review/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/repeatedFiveDepartmentReview:true/);
  assert.match(design,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.doesNotMatch(design,/AI_VALIDATION_SKIPPED|BYPASS_AI_VALIDATION/);
});
