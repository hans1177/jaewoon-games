import { clean, REQUIRED_STAGES } from './vibe2-artbook-story-core.mjs';

export const FIXED_STAGE_FIELDS=[
  ['opening','OPENING'],
  ['early','EARLY'],
  ['mid','MID'],
  ['late','LATE'],
  ['finalBoss','FINAL_BOSS'],
  ['ending','ENDING']
];

const normalizeInfo=value=>clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g,'');

export function fixedStagePlanToSeed(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('fixed stage seed must be an object');
  const plan=input.stagePlan;
  if(!plan||typeof plan!=='object'||Array.isArray(plan))throw new Error('stagePlan object required');
  const phases=FIXED_STAGE_FIELDS.map(([field,stage])=>{
    const row=plan[field];
    if(!row||typeof row!=='object'||Array.isArray(row))throw new Error(`stagePlan.${field} object required`);
    return {
      stage,
      region:clean(row.region),
      quest:clean(row.quest),
      cause:clean(row.cause),
      playerAction:clean(row.playerAction),
      result:clean(row.result)
    };
  });
  const {stagePlan,...rest}=input;
  return {...rest,phases};
}

export function fixedStageSeedProblems(seed){
  const problems=[];
  const phases=Array.isArray(seed?.phases)?seed.phases:[];
  if(phases.length!==REQUIRED_STAGES.length)problems.push('phase-count');
  if(phases.map(x=>x?.stage).join('|')!==REQUIRED_STAGES.join('|'))problems.push('phase-order');
  const values=[];
  for(const phase of phases){
    for(const key of ['region','quest','cause','playerAction','result']){
      const value=clean(phase?.[key]);
      values.push(value);
      if(value.length<8)problems.push(`${phase?.stage||'UNKNOWN'}.${key}-too-short`);
    }
  }
  const normalized=values.map(normalizeInfo).filter(Boolean),unique=new Set(normalized),frequency=new Map();
  for(const value of normalized)frequency.set(value,(frequency.get(value)||0)+1);
  const maxRepeat=Math.max(0,...frequency.values());
  if(normalized.length&&unique.size<Math.ceil(normalized.length*0.6))problems.push('phase-content-too-repetitive');
  if(normalized.length&&maxRepeat/normalized.length>=0.25)problems.push('single-phrase-dominates');
  for(const key of ['playerMotivation','centralConflict','twist','ending','postgame'])if(clean(seed?.[key]).length<10)problems.push(`${key}-too-short`);
  return [...new Set(problems)];
}
