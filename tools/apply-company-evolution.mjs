import fs from 'node:fs';

const patch=(file,fn)=>{const before=fs.readFileSync(file,'utf8');const after=fn(before);if(after!==before)fs.writeFileSync(file,after);};
const appendOnce=(file,heading,body)=>patch(file,text=>text.includes(heading)?text:`${text.trim()}\n\n${heading}\n\n${body.trim()}\n`);

patch('index.html',text=>{
  text=text.replace(/\n?<div class="tagline">작은 상상이 큰 재미가 되는 곳<\/div>\n?/g,'\n');
  if(!text.includes('/assets/homepage-enhancements.js'))text=text.replace('</body>','<script type="module" src="/assets/homepage-enhancements.js"></script>\n</body>');
  return text;
});

patch('assets/vibe-company-orchestration-bridge.js',text=>{
  if(!text.includes("./company-quality-bar.js"))text=text.replace("import { DEFAULT_DEPARTMENT_EXPERIENCE_STATE } from './department-experience-state.js';", "import { DEFAULT_DEPARTMENT_EXPERIENCE_STATE } from './department-experience-state.js';\nimport { createCompanyQualityBar } from './company-quality-bar.js';");
  text=text.replace("export const VIBE2_COMPANY_SYNC=Object.freeze({\n  version:3,","export const VIBE2_COMPANY_SYNC=Object.freeze({\n  version:4,");
  if(!text.includes("qualityLearning:'company-quality-bar-rises-with-verified-experience'"))text=text.replace("  departmentLearning:'verified-experience-strengthens-quality-not-authority',","  departmentLearning:'verified-experience-strengthens-quality-not-authority',\n  qualityLearning:'company-quality-bar-rises-with-verified-experience',");
  text=text.replace("'assets/department-experience-state.js','assets/vibe-workbench.js'","'assets/department-experience-state.js','assets/company-quality-bar.js','assets/vibe-workbench.js'");
  const marker="  const experienceState=resolveExperienceState(departmentExperienceState);\n  const resolvedTarget=inferTarget(prompt,target);";
  if(text.includes(marker)&&!text.includes('const companyQualityBar=createCompanyQualityBar(experienceState);'))text=text.replace(marker,"  const experienceState=resolveExperienceState(departmentExperienceState);\n  const companyQualityBar=createCompanyQualityBar(experienceState);\n  const resolvedTarget=inferTarget(prompt,target);");
  const qmarker="    const experienceQa=assignment.tasks.flatMap(task=>{";
  if(text.includes(qmarker)&&!text.includes('const qualityBarChecks='))text=text.replace(qmarker,"    const qualityBarChecks=[`회사 품질바 T${companyQualityBar.tier} ${companyQualityBar.name}: ${JSON.stringify(companyQualityBar.requirements)}`];\n    const experienceQa=assignment.tasks.flatMap(task=>{");
  text=text.replace("...(executionBase.qa||[]),...experienceQa,'Unity 컴파일'","...(executionBase.qa||[]),...qualityBarChecks,...experienceQa,'Unity 컴파일'");
  text=text.replace("...(executionBase.qa||[]),...experienceQa])","...(executionBase.qa||[]),...qualityBarChecks,...experienceQa])");
  if(!text.includes('qualityBar:companyQualityBar,'))text=text.replace('    departmentExperience:experienceState,','    departmentExperience:experienceState,\n    qualityBar:companyQualityBar,');
  return text;
});

{
  const file='company-learning/platform-release-roadmap.json';
  const roadmap=JSON.parse(read(file));
  roadmap.companyEvolutionQualityLoop={
    version:1,
    authority:'CENTRAL_MACHINE_POLICY',
    sourceOfTruth:'company-learning/platform-release-roadmap.json#companyEvolutionQualityLoop',
    artbook:{
      preservedProductionAsset:true,
      maxFramesPerEdition:10,
      records:['CONCEPT_ART','STORY','PLAN_INTENT','TEST_RESULT','FAILURE_AND_REPAIR_REASON'],
      discussionUsesGitHubIssueEvidence:true,
      unsupportedRoleplayOrDuplicateCommentsForbidden:true
    },
    publicGameHealth:{
      periodicMobileBrowserSmoke:true,
      viewportWidthPx:360,
      checks:['JS_ERROR','FAILED_REQUEST','RELOAD','PLAYABLE_ENTRY'],
      webArchiveFailureDoesNotAutoMutateNativeGameSource:true,
      verifiedFailureMayCreateBugMemoryAndRedevelopmentEvidence:true
    },
    bugLearning:{
      path:'company-learning/bug-memory.json',
      requiredChain:['SYMPTOM','CAUSE','REPAIR','RECURRENCE_PREVENTION'],
      repeatedFailureDoesNotEarnExperience:true,
      verifiedNovelPostmortemMayEarnExperience:true
    },
    qualityBar:{
      implementation:'assets/company-quality-bar.js',
      verifiedDepartmentExperienceMayRaiseQualityRequirements:true,
      executionAuthorityExpansion:false
    },
    assetHealth:{
      statePath:'asset-health.json',
      checks:['ASSET_EXISTS','SOURCE','LICENSE','ANIMATION_EVIDENCE']
    },
    rollback:{
      baselinePath:'public-release-baselines.json',
      allowedOnlyForVerifiedPreviouslyHealthyPublicBuild:true,
      cannotCreateNewPublicReleaseApproval:true
    },
    research:{
      notesPath:'company-learning/research-notes.json',
      verifiedPatternsMayBeReusedAcrossProjects:true
    }
  };
  fs.writeFileSync(file,JSON.stringify(roadmap,null,2)+'\n');
}

appendOnce('HOMEPAGE_OPERATIONS.md','## 게임 아트북과 공개 건강 상태',`
- 공개 승인된 제작 기록은 게임 아트북 형태로 홈페이지에서 최대 10컷까지 바로 볼 수 있다.
- 로고 아래 중복 슬로건은 별도 문구로 반복하지 않는다.
- 아트북에는 컨셉, 스토리, 제작 의도, 시스템, UI, 인트로/로고, 테스트와 다음 확인점을 담고 필요하면 라이선스가 명확한 음악/음악 참고를 연결한다.
- 아트북 댓글은 GitHub Issue 스레드와 연결하고, 실제 근거가 있는 부서 AI 의견과 사용자 댓글을 다음 검토 입력으로 사용한다.
- 게임 카드에는 공개 건강 점수를 보조 정보로 표시할 수 있다. 심각한 이상이 확인된 최신 공개 빌드는 검증된 이전 건강판이 있을 때만 안정판 링크로 대체 표시한다.
`);

appendOnce('.github/agents/director.agent.md','## 실제 부서 의견·아트북·학습 추가 규칙',`
- 아트북 의견은 미리 작성된 칭찬 문구나 역할극으로 채우지 않는다. 각 부서가 현재 코드, 아트북, QA, 빌드, 에셋 증거를 독립적으로 확인한 뒤 의견을 낸다.
- 다른 부서 의견을 읽기 전 1차 판정을 만들고, 이후 AGREE/COUNTER/TEST/RESULT/DECISION 토론으로 수정할 수 있다.
- 새 정보가 없으면 댓글을 남기지 않는다. 자기 예상이 실제 테스트에서 틀리면 수정 의견을 기록한다.
- 공개 게임 건강점수, 버그 기억, 연구노트, 에셋 건강, 롤백 기준을 다음 작업 우선순위에 사용한다.
- 실패는 그 자체로 XP가 아니다. 원인/수정/재발방지가 검증된 새로운 학습일 때만 사후학습 XP를 준다.
- 부서 경험치가 오르면 회사 품질바에 따라 다음 산출물의 검증 기준을 높인다. 핵심 결정 권한은 그대로 한재운에게 남는다.
`);

appendOnce('ASSET_RULES.md','## 에셋 건강과 재사용 자산',`
- 무료 에셋 프리셋은 proto / test / ship 용도를 구분한다.
- actor 후보는 라이선스, 실제 파일/원본, verifiedAnimation, 이동 모션, 공격/피격/사망 증거를 유지한다.
- \`tools/asset-health-check.mjs\`가 외부 출처 도달 여부, 로컬 파일 존재, 차단 라이선스, 배우 애니메이션 증거를 주기적으로 점검한다.
- 출처가 사라지거나 라이선스가 불명확해지면 새 사용을 중지하고 검증된 대체 후보를 선택한다. 이미 사용 중인 에셋은 즉시 삭제하기보다 영향 범위와 교체 계획을 기록한다.
`);

console.log('COMPANY_EVOLUTION_PATCH=PASS');
