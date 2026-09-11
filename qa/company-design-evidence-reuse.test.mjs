import fs from 'node:fs';

const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');

if(!pipeline.includes('DESIGN_CYCLE_REUSED=YES')) throw new Error('pipeline must report completed design reuse');
if(!pipeline.includes('canReuseCompletedDesign')) throw new Error('pipeline must detect reusable completed design evidence');
if(!pipeline.includes("startsWith('design-disposition:')")) throw new Error('reuse must be limited to the old disposition-only baseline veto');
if(!pipeline.includes("conflictCount||0)!==0") || !pipeline.includes("holdCount||0)!==0")) throw new Error('meeting conflict/hold must still prevent evidence reuse');
if(artbook.includes('DESIGN_ARTBOOK_DISPOSITION_NOT_ACTIVE')) throw new Error('advisory REDESIGN must not veto a baseline-ready artbook');
if(!artbook.includes('DESIGN_ARTBOOK_DISCARDED')) throw new Error('true discarded designs must still be rejected');

console.log('COMPANY_DESIGN_EVIDENCE_REUSE_QA=PASS');
