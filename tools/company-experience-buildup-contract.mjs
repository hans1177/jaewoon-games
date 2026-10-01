// 파일명: tools/company-experience-buildup-contract.mjs
// 역할: Web/Roblox/Unity 공통 체감 품질 빌드업 계약을 점수화하고 가장 약한 축부터 수리 대상으로 만든다.
// 원칙: 기능 존재/마커만으로 PASS하지 않으며 실제 런타임 증거와 전후 변화가 우선이다.

import fs from 'node:fs';

export const EXPERIENCE_BUILDUP_CONTRACT_PATH='company-learning/cross-platform-experience-buildup.json';
export const EXPERIENCE_AXIS_IDS=Object.freeze([
  'MOTION',
  'COMBAT_FEEL',
  'UI_HUD',
  'INVENTORY_EQUIPMENT',
  'AUDIO_MUSIC',
  'VFX',
  'CAMERA',
  'WORLD_ART_LIGHTING',
  'ONBOARDING_READABILITY',
  'MOBILE_INPUT',
  'PERFORMANCE_STABILITY',
]);

const clamp=value=>Math.max(0,Math.min(100,Number.isFinite(Number(value))?Number(value):0));
const boolScore=value=>value===true?100:value===false?0:null;
const clean=value=>String(value??'').trim();

export function loadExperienceBuildupContract({filesystem=fs,path=EXPERIENCE_BUILDUP_CONTRACT_PATH}={}){
  const contract=JSON.parse(filesystem.readFileSync(path,'utf8'));
  if(contract?.authority!=='MACHINE_EXECUTION_CONTRACT'||contract?.id!=='CROSS_PLATFORM_EXPERIENCE_BUILDUP_V1')throw new Error('EXPERIENCE_BUILDUP_CONTRACT_INVALID');
  if(contract?.rules?.presenceOnlyPassForbidden!==true||contract?.rules?.markerOnlyPassForbidden!==true)throw new Error('EXPERIENCE_BUILDUP_PRESENCE_ONLY_FORBIDDEN_REQUIRED');
  for(const id of EXPERIENCE_AXIS_IDS)if(!contract?.axes?.[id])throw new Error('EXPERIENCE_BUILDUP_AXIS_MISSING:'+id);
  return contract;
}

function componentScores(evidence={}){
  const rows=[];
  for(const [key,value] of Object.entries(evidence?.components||{})){
    if(value===null||value===undefined)continue;
    if(typeof value==='boolean'){rows.push({key,score:boolScore(value)});continue;}
    const n=Number(value);
    if(Number.isFinite(n))rows.push({key,score:clamp(n)});
  }
  return rows.filter(row=>row.score!==null);
}

function scoreAxis(evidence={}){
  if(evidence?.applicable===false)return null;
  if(Number.isFinite(Number(evidence?.score)))return clamp(evidence.score);
  const rows=componentScores(evidence);
  if(!rows.length)return 0;
  return rows.reduce((sum,row)=>sum+row.score,0)/rows.length;
}

export function evaluateExperienceBuildup({platform='WEB',axesEvidence={},contract=null}={}){
  const policy=contract||loadExperienceBuildupContract();
  const platformId=clean(platform).toUpperCase();
  const profile=policy?.platformProfiles?.[platformId];
  if(!profile)throw new Error('EXPERIENCE_BUILDUP_PLATFORM_UNSUPPORTED:'+platformId);
  const rows=[];
  let weighted=0,weightTotal=0;
  for(const id of EXPERIENCE_AXIS_IDS){
    const axis=policy.axes[id];
    const evidence=axesEvidence?.[id]||{};
    const score=scoreAxis(evidence);
    const applicable=score!==null;
    const required=applicable&&evidence.required!==false;
    const target=Number(evidence.targetScore??profile.minimumRequiredAxisScore);
    const pass=!required||score>=target;
    const weight=Number(axis.weight||1);
    if(applicable){weighted+=score*weight;weightTotal+=weight;}
    rows.push(Object.freeze({
      id,
      applicable,
      required,
      score:score===null?null:Math.round(score*10)/10,
      target,
      pass,
      weight,
      evidence:Object.freeze({...evidence,components:Object.freeze({...evidence.components})})
    }));
  }
  const overall=weightTotal>0?weighted/weightTotal:0;
  const requiredRows=rows.filter(row=>row.required);
  const failed=requiredRows.filter(row=>!row.pass);
  const runtimeObserved=axesEvidence?.__runtimeObserved===true;
  const beforeAfterObserved=axesEvidence?.__beforeAfterObserved===true;
  const runtimePass=profile.actualRuntimeRequired!==true||runtimeObserved;
  const beforeAfterPass=policy.rules.beforeAfterRuntimeEvidenceRequiredForPromotion!==true||beforeAfterObserved;
  const pass=overall>=Number(profile.minimumOverallScore||0)&&failed.length===0&&runtimePass&&beforeAfterPass;
  const repairPlan=rows.filter(row=>row.required&&!row.pass)
    .sort((a,b)=>(a.score??0)-(b.score??0)||b.weight-a.weight)
    .map(row=>Object.freeze({
      axis:row.id,
      score:row.score,
      target:row.target,
      gap:Math.max(0,row.target-(row.score??0)),
      priority:row.score<40?'CRITICAL':row.score<60?'HIGH':'MEDIUM',
      action:'BUILD_UP_'+row.id
    }));
  return Object.freeze({
    version:policy.version,
    contractId:policy.id,
    platform:platformId,
    pass,
    overallScore:Math.round(overall*10)/10,
    minimumOverallScore:Number(profile.minimumOverallScore||0),
    minimumRequiredAxisScore:Number(profile.minimumRequiredAxisScore||0),
    runtimeObserved,
    beforeAfterObserved,
    runtimePass,
    beforeAfterPass,
    failedAxes:Object.freeze(failed.map(row=>row.id)),
    axes:Object.freeze(rows),
    repairPlan:Object.freeze(repairPlan),
    weakestAxis:repairPlan[0]?.axis||null,
    presenceOnlyPassForbidden:true,
    markerOnlyPassForbidden:true,
  });
}

export function experienceAxisEvidence(components={},options={}){
  return Object.freeze({
    applicable:options.applicable!==false,
    required:options.required!==false,
    score:Number.isFinite(Number(options.score))?Number(options.score):undefined,
    targetScore:Number.isFinite(Number(options.targetScore))?Number(options.targetScore):undefined,
    components:Object.freeze({...components}),
    notes:Array.isArray(options.notes)?Object.freeze([...options.notes]):Object.freeze([])
  });
}
