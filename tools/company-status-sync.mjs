// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 결과를 회사 공개 상태에 안전하게 동기화한다.
// 원칙: 프로젝트/승인/빌드 이력은 보존하고 감독·홈페이지 운영 상태만 최신 증거로 갱신한다.
import fs from 'node:fs';

const companyPath='company-status.json';
const supervisionPath='director-supervision-status.json';
const company=JSON.parse(fs.readFileSync(companyPath,'utf8'));
const supervision=JSON.parse(fs.readFileSync(supervisionPath,'utf8'));

const statusMap={
  WORKING:'working',
  DONE:'done',
  IDLE_NO_TASK:'idle',
  BLOCKED:'blocked',
  FAILED:'failed',
  STALE:'stale'
};

company.updatedAt=supervision.dateKst||company.updatedAt;
company.supervision={
  source:supervisionPath,
  dateKst:supervision.dateKst||null,
  runningLabelAloneCountsAsWork:supervision?.checks?.runningLabelAloneCountsAsWork===true,
  counts:{...(supervision.counts||{})},
  primaryFindings:[...(supervision.primaryFindings||[])]
};

company.operations ||= {};
company.operations.homepage ||= {};
const homepage=supervision?.staff?.homepage;
if(homepage){
  company.operations.homepage.status=statusMap[homepage.status]||String(homepage.status||'').toLowerCase()||'unknown';
  company.operations.homepage.lastReviewedAt=supervision.dateKst||company.operations.homepage.lastReviewedAt||null;
  company.operations.homepage.lastCheckResult=homepage.status||null;
  company.operations.homepage.evidenceSource=supervisionPath;
  company.operations.homepage.runtimeDataSync=company?.policy?.homepageOperations?.runtimeDataSync===true?'active':'inactive';
  company.operations.homepage.task=homepage.task||company.operations.homepage.task;
}

const departmentTasks=company?.redevelopmentReview?.departmentTasks;
if(departmentTasks&&typeof departmentTasks==='object'){
  for(const role of ['planning','development','qa','graphics','balance','director']){
    const current=departmentTasks[role];
    const live=supervision?.staff?.[role];
    if(!current||!live)continue;
    current.status=statusMap[live.status]||String(live.status||'').toLowerCase()||current.status;
    current.task=live.task||current.task;
    current.evidenceSource=supervisionPath;
  }
}

fs.writeFileSync(companyPath,JSON.stringify(company,null,2)+'\n');
console.log('COMPANY_STATUS_SYNC=PASS');
console.log(`COMPANY_SUPERVISION_DATE=${company.supervision.dateKst||'unknown'}`);
console.log(`COMPANY_SUPERVISION_BLOCKED=${company.supervision.counts.BLOCKED||0}`);
console.log(`COMPANY_SUPERVISION_STALE=${company.supervision.counts.STALE||0}`);
console.log(`COMPANY_HOMEPAGE_STATUS=${company.operations?.homepage?.status||'unknown'}`);