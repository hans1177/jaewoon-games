// 파일명: assets/company-quality-bar.js
// 역할: 부서 경험치가 올라갈수록 새 초안/테스트의 최소 품질 기준도 단계적으로 강화한다.
// 원칙: 경험치는 권한을 늘리지 않고 품질 게이트만 강화한다.

const CORE = Object.freeze(['planning','development','qa','graphics','balance']);
const clamp = (value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export const COMPANY_QUALITY_BARS = Object.freeze([
  Object.freeze({tier:1,minAverageLevel:1,name:'FOUNDATION',requirements:Object.freeze({prototypeEnemyKinds:1,requiredEvidence:1,requiredRegression:'baseline',mobileCheck:false,saveCheck:false,crossDepartmentReview:false,deviceEvidence:false})}),
  Object.freeze({tier:2,minAverageLevel:2,name:'BASIC',requirements:Object.freeze({prototypeEnemyKinds:1,requiredEvidence:2,requiredRegression:'targeted',mobileCheck:true,saveCheck:false,crossDepartmentReview:false,deviceEvidence:false})}),
  Object.freeze({tier:3,minAverageLevel:3,name:'REUSABLE',requirements:Object.freeze({prototypeEnemyKinds:2,requiredEvidence:2,requiredRegression:'targeted',mobileCheck:true,saveCheck:true,crossDepartmentReview:false,deviceEvidence:false})}),
  Object.freeze({tier:4,minAverageLevel:4,name:'COMPARE',requirements:Object.freeze({prototypeEnemyKinds:2,requiredEvidence:3,requiredRegression:'expanded',mobileCheck:true,saveCheck:true,crossDepartmentReview:true,deviceEvidence:false})}),
  Object.freeze({tier:5,minAverageLevel:5,name:'PROVEN',requirements:Object.freeze({prototypeEnemyKinds:3,requiredEvidence:4,requiredRegression:'expanded',mobileCheck:true,saveCheck:true,crossDepartmentReview:true,deviceEvidence:true})}),
  Object.freeze({tier:6,minAverageLevel:6,name:'EXPERT',requirements:Object.freeze({prototypeEnemyKinds:3,requiredEvidence:5,requiredRegression:'adversarial',mobileCheck:true,saveCheck:true,crossDepartmentReview:true,deviceEvidence:true})})
]);

export function createCompanyQualityBar(state={}){
  const departments=state?.departments||{};
  const levels=CORE.map(id=>clamp(departments?.[id]?.level||1,1,10));
  const averageLevel=levels.reduce((a,b)=>a+b,0)/levels.length;
  let selected=COMPANY_QUALITY_BARS[0];
  for(const bar of COMPANY_QUALITY_BARS){
    if(averageLevel>=bar.minAverageLevel)selected=bar;
  }
  return Object.freeze({
    version:1,
    averageLevel:Number(averageLevel.toFixed(2)),
    tier:selected.tier,
    name:selected.name,
    requirements:selected.requirements,
    rule:'quality-bar-rises-with-verified-department-experience-without-expanding-authority'
  });
}

if(typeof window!=='undefined')window.JaewoonCompanyQualityBar=Object.freeze({createCompanyQualityBar,COMPANY_QUALITY_BARS});
