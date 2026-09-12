// 비-Vibe 부서 감사 상태를 실제 Actions 증거로 동기화한다.
import fs from 'node:fs';
import {
  COMPANY_DEPARTMENT_ROLES,
  COMPANY_BLOCKING_DEPARTMENT_ROLES,
  COMPANY_ADVISORY_DEPARTMENT_ROLES,
  getDepartmentStandard
} from '../assets/company-department-standards.js';

const auditPath='company-department-audit.json';
const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const actions=process.argv[2]&&fs.existsSync(process.argv[2])?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{workflow_runs:[]};
const supervision=fs.existsSync('director-supervision-status.json')?JSON.parse(fs.readFileSync('director-supervision-status.json','utf8')):null;
const company=fs.existsSync('company-status.json')?JSON.parse(fs.readFileSync('company-status.json','utf8')):null;
const runs=Array.isArray(actions.workflow_runs)?actions.workflow_runs:[];
const list=name=>runs.filter(r=>r.name===name).sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
const latest=name=>list(name)[0]||null;
const success=name=>list(name).find(r=>r.status==='completed'&&r.conclusion==='success')||null;
const brief=r=>r?{runId:Number(r.id),status:r.status||null,conclusion:r.conclusion||null,headSha:r.head_sha||null,updatedAt:r.updated_at||r.created_at||null}:null;

const roles=[...COMPANY_DEPARTMENT_ROLES];
const blockingRoles=[...COMPANY_BLOCKING_DEPARTMENT_ROLES];
const advisoryRoles=[...COMPANY_ADVISORY_DEPARTMENT_ROLES];
audit.policy||={};
audit.policy.canonicalDepartmentCount=roles.length;
audit.policy.canonicalDepartments=roles;
audit.policy.blockingDepartments=blockingRoles;
audit.policy.advisoryDepartments=advisoryRoles;
audit.policy.missingDepartmentEvidenceCountsAsPass=false;
audit.policy.advisoryDepartmentFailureBlocksProgression=false;
audit.departments||={};
for(const role of roles){
  if(audit.departments[role])continue;
  const standard=getDepartmentStandard(role);
  audit.departments[role]={
    status:standard.runtimeRequired?'PENDING_RUNTIME_EVIDENCE':'PENDING_DEPARTMENT_EVIDENCE',
    blockingForProgression:blockingRoles.includes(role),
    passGate:`${standard.minSpecificEvidence}+ ${role}-domain evidence item${standard.minSpecificEvidence===1?'':'s'}${standard.buildRequired?' plus successful build':''}${standard.runtimeRequired?' plus runtime/play evidence':''}`,
    checks:[...standard.requiredChecks],
    previousWeakness:'Department was added after the previous audit snapshot and has no verified audit evidence yet.',
    currentProtection:standard.runtimeRequired?'RUNTIME_DOMAIN_EVIDENCE_REQUIRED + DOMAIN_SPECIFIC_EVIDENCE_REQUIRED':'DOMAIN_SPECIFIC_EVIDENCE_REQUIRED'
  };
}
for(const role of roles)audit.departments[role].blockingForProgression=blockingRoles.includes(role);

audit.departments.director||={};
audit.departments.director.passGate=`All ${roles.length} reviews tracked; all ${blockingRoles.length} blocking departments must pass. Music and intro are advisory.`;
audit.departments.director.aggregation='DROP/REVISE/evidence failure from planning, graphics, development, qa, balance controls progression; music and intro are advisory.';
audit.departments.director.currentProtection='Director cannot invent or replace missing department evidence.';
audit.departments.director.canonicalDepartmentCount=roles.length;
audit.departments.director.canonicalDepartments=roles;
audit.departments.director.blockingDepartments=blockingRoles;
audit.departments.director.advisoryDepartments=advisoryRoles;

const standards=latest('Company Department Standards QA'), standardsOk=success('Company Department Standards QA');
const build=latest('Unity Hybrid Android Build'), buildOk=success('Unity Hybrid Android Build');
const runtime=latest('Unity Android Runtime Smoke'), runtimeOk=success('Unity Android Runtime Smoke');
const web=latest('Public Game Health'), webOk=success('Public Game Health');
const qa=audit.departments?.qa;
if(!qa)throw new Error('qa department missing');
qa.unityRuntime||={};
const contractVerified=Boolean(standardsOk);
const runtimeVerified=Boolean(runtimeOk);
const latestRuntimeFailed=Boolean(runtime&&runtime.status==='completed'&&runtime.conclusion&&runtime.conclusion!=='success');
Object.assign(qa.unityRuntime,{
  contractVerificationRunId:standardsOk?Number(standardsOk.id):null,
  contractVerificationConclusion:standardsOk?'success':standards?.conclusion||null,
  successfulRuntimeEvidenceRunId:runtimeOk?Number(runtimeOk.id):null,
  latestRuntimeRunId:runtime?Number(runtime.id):null,
  latestRuntimeConclusion:runtime?.conclusion||null,
  buildAloneCountsAsQaPass:false
});
if(runtimeVerified&&!latestRuntimeFailed){
  qa.status='VERIFIED_UNITY_RUNTIME';
  qa.unityRuntime.status='VERIFIED_RUNTIME_EVIDENCE';
  audit.overall='STRENGTHENED';
  audit.reason='A successful Unity Android emulator runtime-smoke run provides real runtime QA evidence.';
}else if(runtimeVerified&&latestRuntimeFailed){
  qa.status='RUNTIME_REGRESSION';
  qa.unityRuntime.status='VERIFIED_PREVIOUSLY_LATEST_RUNTIME_FAILED';
  audit.overall='ATTENTION_REQUIRED';
  audit.reason='Unity runtime QA succeeded previously, but the latest runtime-smoke run failed.';
}else{
  qa.status='VERIFYING_UNITY_RUNTIME';
  qa.unityRuntime.status=contractVerified?'AUTOMATION_INSTALLED_CONTRACT_VERIFIED_RUNTIME_EVIDENCE_PENDING':'AUTOMATION_INSTALLED_RUNTIME_EVIDENCE_PENDING';
  audit.overall='VERIFYING_UNITY_RUNTIME';
  audit.reason='Unity runtime smoke automation is installed, but a successful real APK emulator run is still required.';
}

const missingCanonicalEvidence=roles.filter(role=>{
  const status=String(audit.departments?.[role]?.status||'').toUpperCase();
  return !status||status.startsWith('PENDING_')||status.startsWith('VERIFYING_');
});
const missingBlockingEvidence=missingCanonicalEvidence.filter(role=>blockingRoles.includes(role));
const missingAdvisoryEvidence=missingCanonicalEvidence.filter(role=>advisoryRoles.includes(role));
if(missingBlockingEvidence.length){
  audit.overall='ATTENTION_REQUIRED';
  audit.reason=`Blocking department audit evidence is incomplete: ${missingBlockingEvidence.join(', ')}.`;
}else if(missingAdvisoryEvidence.length&&audit.overall==='STRENGTHENED'){
  audit.reason=`Blocking department evidence is complete; advisory evidence remains pending: ${missingAdvisoryEvidence.join(', ')}.`;
}

const testBuild=Array.isArray(company?.testBuilds)?[...company.testBuilds].sort((a,b)=>new Date(b.builtAt||0)-new Date(a.builtAt||0))[0]||null:null;
audit.verification={
  departmentStandardsWorkflow:{latestRun:brief(standards),latestSuccessfulRun:brief(standardsOk),unitySmokeContractVerified:contractVerified},
  latestUnityBuild:{latestRun:brief(build),latestSuccessfulRun:brief(buildOk),publishedTestBuild:testBuild?{requestId:testBuild.requestId||null,builtAt:testBuild.builtAt||null,sourceCommit:testBuild.sourceCommit||null,sha256:testBuild.sha256||null,bytes:Number(testBuild.bytes)||0}:null},
  unityRuntimeSmoke:{workflow:'.github/workflows/unity-android-runtime-smoke.yml',contractVerified,latestRun:brief(runtime),latestSuccessfulRun:brief(runtimeOk),successfulRuntimeEvidenceObserved:runtimeVerified},
  webRuntimeHealth:{latestRun:brief(web),latestSuccessfulRun:brief(webOk),formalBridge:'tools/company-qa-public-web-evidence.mjs'},
  directorSupervision:supervision?{dateKst:supervision.dateKst||null,attentionRequired:Boolean(supervision.attentionRequired),counts:{...(supervision.counts||{})},primaryFindings:[...(supervision.primaryFindings||[])]}:null,
  canonicalDepartments:{roles,count:roles.length,blockingRoles,advisoryRoles,missingEvidence:missingCanonicalEvidence,missingBlockingEvidence,missingAdvisoryEvidence,blockingComplete:missingBlockingEvidence.length===0,advisoryComplete:missingAdvisoryEvidence.length===0}
};
audit.updatedAt=company?.updatedAt||supervision?.dateKst||new Date().toISOString().slice(0,10);
audit.nextPriority=missingBlockingEvidence.length?`Collect real blocking department evidence for: ${missingBlockingEvidence.join(', ')}.`:missingAdvisoryEvidence.length?`Progression is not blocked; collect advisory evidence when practical for: ${missingAdvisoryEvidence.join(', ')}.`:runtimeVerified&&!latestRuntimeFailed?'Keep Unity runtime smoke mandatory and treat later failures as regressions.':'Require a successful Unity Android emulator runtime-smoke run before marking Unity QA VERIFIED.';
fs.writeFileSync(auditPath,JSON.stringify(audit,null,2)+'\n');
console.log('COMPANY_DEPARTMENT_AUDIT_SYNC=PASS');
console.log(`CANONICAL_DEPARTMENT_AUDIT=${roles.length-missingCanonicalEvidence.length}/${roles.length}`);
console.log(`BLOCKING_DEPARTMENT_EVIDENCE_MISSING=${missingBlockingEvidence.join(',')||'none'}`);
console.log(`ADVISORY_DEPARTMENT_EVIDENCE_MISSING=${missingAdvisoryEvidence.join(',')||'none'}`);
console.log(`UNITY_RUNTIME_SUCCESS_EVIDENCE=${runtimeVerified?'YES':'NO'}`);
console.log(`DEPARTMENT_AUDIT_OVERALL=${audit.overall}`);
