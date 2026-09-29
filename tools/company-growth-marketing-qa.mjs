import fs from 'node:fs';
const clean=v=>String(v??'').trim();
const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
const file=clean(args.file),gameId=clean(args['game-id']);
if(!file||!gameId)throw new Error('MARKETING_QA_ARGS_REQUIRED');
if(!fs.existsSync(file))throw new Error('MARKETING_ARTIFACT_REQUIRED:'+file);
const x=JSON.parse(fs.readFileSync(file,'utf8'));
if(clean(x.gameId)!==gameId)throw new Error('MARKETING_GAME_ID_MISMATCH');
const required=['facts','hypotheses','creative','organicDistribution','crossPromotion','metrics','stopConditions','decision'];
for(const key of required)if(x[key]===undefined||x[key]===null)throw new Error('MARKETING_FIELD_REQUIRED:'+key);
if(!Array.isArray(x.facts)||!x.facts.length)throw new Error('MARKETING_FACTS_REQUIRED');
if(!Array.isArray(x.hypotheses))throw new Error('MARKETING_HYPOTHESES_REQUIRED');
if(!Array.isArray(x.organicDistribution)||!Array.isArray(x.crossPromotion))throw new Error('MARKETING_DISTRIBUTION_ARRAYS_REQUIRED');
if(!Array.isArray(x.metrics)||!Array.isArray(x.stopConditions))throw new Error('MARKETING_MEASUREMENT_REQUIRED');
const text=JSON.stringify(x);
const ownerApprovalGate=x?.decision?.ownerApprovalGate;
const ownerApprovalProse=[
  ...(Array.isArray(x.hypotheses)?x.hypotheses:[]),
  ...(Array.isArray(x.organicDistribution)?x.organicDistribution:[]),
  ...(Array.isArray(x.crossPromotion)?x.crossPromotion:[]),
  ...(Array.isArray(x.stopConditions)?x.stopConditions:[])
].map(v=>JSON.stringify(v)).join('\n');
if(ownerApprovalGate===true||clean(ownerApprovalGate).toLowerCase()==='true'||/(?:requires?|awaits?|pending)\s+owner\s+approval|오너\s*승인\s*(?:필요|대기|요청)/i.test(ownerApprovalProse))throw new Error('MARKETING_OWNER_APPROVAL_GATE_FORBIDDEN');
const financialTrue=value=>{
  if(Array.isArray(value))return value.some(financialTrue);
  if(!value||typeof value!=='object')return false;
  for(const [key,val] of Object.entries(value)){
    if(/^(automaticPaidSpend|autoCharge|autoPurchase|financialTransaction)$/i.test(key)&&(val===true||clean(val).toLowerCase()==='true'))return true;
    if(financialTrue(val))return true;
  }
  return false;
};
const financialExecutionProse=[
  ...(Array.isArray(x.hypotheses)?x.hypotheses:[]),
  ...(Array.isArray(x.organicDistribution)?x.organicDistribution:[]),
  ...(Array.isArray(x.crossPromotion)?x.crossPromotion:[]),
  ...(Array.isArray(x.stopConditions)?x.stopConditions:[])
].map(v=>JSON.stringify(v)).join('\n');
if(financialTrue(x)||/(?:execute|enable|start|자동\s*실행)\s+(?:paid\s*spend|purchase|payment|유료\s*광고|결제)/i.test(financialExecutionProse))throw new Error('MARKETING_FINANCIAL_EXECUTION_FORBIDDEN');
if(!['PENDING','ACCEPT','REVIEW','REJECT','DEFER'].includes(clean(x.decision.primaryAi||'PENDING').toUpperCase()))throw new Error('MARKETING_PRIMARY_AI_DECISION_INVALID');
if(!['PENDING','ACCEPT','REVIEW','REJECT','DEFER'].includes(clean(x.decision.vibe||'PENDING').toUpperCase()))throw new Error('MARKETING_VIBE_DECISION_INVALID');
if(!['PENDING','AWAITING_PRIMARY_AI','REVIEW_REQUIRED','ACCEPT','REJECT','DEFER'].includes(clean(x.decision.joint||'PENDING').toUpperCase()))throw new Error('MARKETING_JOINT_DECISION_INVALID');
if(clean(x.decision.joint).toUpperCase()==='ACCEPT'&&(clean(x.decision.primaryAi).toUpperCase()!=='ACCEPT'||clean(x.decision.vibe).toUpperCase()!=='ACCEPT'))throw new Error('MARKETING_JOINT_ACCEPT_REQUIRES_BOTH');
console.log('MARKETING_QA=PASS');
