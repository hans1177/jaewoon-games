import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');

if(!workflow.includes('reuse_design=')) throw new Error('workflow must detect reusable completed design evidence');
if(!workflow.includes('COMPANY_REUSE_COMPLETED_DESIGN')) throw new Error('workflow must pass completed-design reuse mode');
if(!workflow.includes('ARTBOOK_EDITOR_ONLY=YES')) throw new Error('reuse path must prepare only the artbook editor model');
if(!pipeline.includes('DESIGN_CYCLE_REUSED=YES')) throw new Error('pipeline must skip the design cycle when completed evidence is reusable');
if(!pipeline.includes("COMPANY_REUSE_COMPLETED_DESIGN==='true'")) throw new Error('pipeline reuse must be explicit');
if(artbook.includes("DISPOSITION_NOT_ACTIVE")) throw new Error('advisory REDESIGN must not veto a baseline-ready artbook');
if(!artbook.includes('DESIGN_ARTBOOK_DISCARDED')) throw new Error('true discarded designs must still be rejected');

console.log('COMPANY_DESIGN_EVIDENCE_REUSE_QA=PASS');
