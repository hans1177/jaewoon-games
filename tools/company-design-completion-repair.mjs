const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

export const DESIGN_COMPLETION_MAX_ATTEMPTS=2;
export const DESIGN_MULTIPLAYER_MODES=Object.freeze(['SINGLE','COOP','COMPETITIVE','HYBRID']);
export const DESIGN_REQUIRED_NONEMPTY_STRINGS=Object.freeze([
  'identity',
  'playerFantasy',
  'coreFun',
  'progressionDirection',
  'visualDirection',
  'mobileUx',
  'marketTargetDirection',
  'steamExpansionDecision',
  'multiplayerMode',
  'multiplayerExpansionDecision',
]);

export function collectDesignCompletionGaps(value,schema={}){
  const gaps=[];
  if(!value||Array.isArray(value)||typeof value!=='object')return Object.freeze(['root']);
  for(const key of schema.required||[]){
    if(!Object.prototype.hasOwnProperty.call(value,key))gaps.push(`root.${key}:missing`);
  }
  for(const key of DESIGN_REQUIRED_NONEMPTY_STRINGS){
    if(Object.prototype.hasOwnProperty.call(value,key)&&!clean(value[key]))gaps.push(`root.${key}:blank`);
  }
  if(!Array.isArray(value.coreLoop)||value.coreLoop.filter(item=>clean(item)).length<3)gaps.push('root.coreLoop:minItems<3');
  else value.coreLoop.forEach((item,index)=>{if(!clean(item))gaps.push(`root.coreLoop[${index}]:blank`);});
  if(Array.isArray(value.signatureSystems)){
    value.signatureSystems.forEach((system,index)=>{
      if(!system||typeof system!=='object'||Array.isArray(system)){
        gaps.push(`root.signatureSystems[${index}]:object-required`);
        return;
      }
      for(const key of ['name','purpose','playerChoice'])if(!clean(system[key]))gaps.push(`root.signatureSystems[${index}].${key}:blank`);
    });
  }
  if(Object.prototype.hasOwnProperty.call(value,'multiplayerMode')&&!DESIGN_MULTIPLAYER_MODES.includes(clean(value.multiplayerMode).toUpperCase()))gaps.push('root.multiplayerMode:invalid');
  return Object.freeze(uniq(gaps));
}

export function strictFeedbackForDesignRepair(review){
  const verdict=clean(review?.verdict).toUpperCase();
  if(!['REVISE','REBUILD'].includes(verdict))return null;
  return Object.freeze({
    verdict,
    totalScore:Number(review?.totalScore)||0,
    hardFailures:Object.freeze(uniq(Array.isArray(review?.hardFailures)?review.hardFailures:[])),
    improvementTargets:Object.freeze((Array.isArray(review?.improvementTargets)?review.improvementTargets:[]).slice(0,3).map(item=>Object.freeze({
      dimension:clean(item?.dimension),
      current:Number(item?.current)||0,
      maxScore:Number(item?.maxScore)||0,
      gap:Number(item?.gap)||0,
    })).filter(item=>item.dimension)),
  });
}

export function buildDesignCompletionPrompt({originalPrompt='',schema={},error='',gaps=[],priorStrictFeedback=null}={}){
  const gapList=uniq(gaps);
  const strict=priorStrictFeedback&&typeof priorStrictFeedback==='object'?priorStrictFeedback:null;
  return [
    clean(originalPrompt),
    'DESIGN_COMPLETION_REPAIR=YES',
    `MISSING_OR_INVALID_DESIGN_REQUIREMENTS=${JSON.stringify(gapList)}`,
    `PREVIOUS_DESIGN_ERROR=${JSON.stringify(clean(error))}`,
    `PRIOR_STRICT_REVIEW_FEEDBACK=${JSON.stringify(strict)}`,
    `FULL_REQUIRED_DESIGN_SCHEMA=${JSON.stringify(schema)}`,
    '이미 유효한 설계 의도와 GAME_SEED 정체성은 유지하고, 누락되거나 비어 있거나 잘못된 설계 항목만 근거에 맞게 보완한다.',
    'GAME_SEED의 카테고리·플랫폼·세션·멀티플레이 결정값을 임의 변경하지 않는다.',
    'REVISE/REBUILD 피드백은 설계로 고칠 수 있는 항목만 반영하고 점수·PASS·hard failure 결과를 직접 만들거나 조작하지 않는다.',
    '외부 시장 수치나 존재하지 않는 사실을 발명하지 않는다.',
    '최종 출력은 FULL_REQUIRED_DESIGN_SCHEMA를 만족하는 완전한 JSON 객체 하나만 반환한다.',
  ].filter(Boolean).join('\n');
}
