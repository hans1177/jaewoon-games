// 파일명: tools/vibe2-neural-expansion-readiness.mjs
// 역할: 제4규칙의 마지막 단계 신경망 자기확장 readiness를 실제 QA 결과로 계산한다.
// 원칙: readiness는 내부 신경망 구조 확장 자격일 뿐 실행 권한 확대가 아니다.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const parseArgs=(argv=process.argv.slice(2))=>Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...rest]=x.slice(2).split('=');return[k,rest.join('=')]}));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};

export const NEURAL_EXPANSION_READINESS_CHECKS=Object.freeze({
  rule1QaPass:['qa/vibe2-owner-rule1-continuity.test.mjs'],
  rule2QaPass:['qa/vibe2-owner-rule2-external-ai.test.mjs'],
  rule3QaPass:['qa/vibe2-owner-rule3-unbounded-learning.test.mjs'],
  atomicNeuronFanInQaPass:[
    'qa/vibe2-neural-event-router.test.mjs',
    'qa/vibe2-neural-event-telemetry.test.mjs',
    'qa/vibe2-neural-fanin-root-cause.test.mjs'
  ],
  sharedContextQaPass:['qa/company-shared-context.test.mjs','qa/company-central-policy-contract.test.mjs'],
  securityQaPass:['qa/company-security-steward.test.mjs','qa/company-security-recovery-e2e.test.mjs']
});

function runNodeTests(root,files){
  const missing=files.filter(file=>!fs.existsSync(path.join(root,file)));
  if(missing.length)return{pass:false,missing,error:'MISSING_TEST_FILES'};
  try{
    execFileSync(process.execPath,['--test',...files],{cwd:root,stdio:['ignore','pipe','pipe'],encoding:'utf8',env:process.env});
    return{pass:true,missing:[],error:null};
  }catch(error){
    return{
      pass:false,
      missing:[],
      error:clean(error?.stderr||error?.stdout||error?.message||error).replace(/\s+/g,' ').slice(0,500)
    };
  }
}

export function evaluateNeuralExpansionReadiness({root=process.cwd(),runner=runNodeTests}={}){
  const checks={},details={};
  for(const [key,files] of Object.entries(NEURAL_EXPANSION_READINESS_CHECKS)){
    const result=runner(root,files);
    checks[key]=result?.pass===true;
    details[key]={files:[...files],pass:checks[key],missing:[...(result?.missing||[])],error:result?.error||null};
  }
  const required=Object.keys(NEURAL_EXPANSION_READINESS_CHECKS);
  const missing=required.filter(key=>checks[key]!==true);
  return{
    version:1,
    kind:'vibe2-neural-expansion-readiness',
    source:'DIRECT_TARGETED_QA',
    pass:missing.length===0,
    ...checks,
    required,
    missing,
    details,
    internalNeuralStructureExpansionAllowedWhenPass:true,
    neuralExecutionAuthorityExpansionAllowed:false,
    queueMutationAuthorityExpanded:false,
    workerCreationAuthorityExpanded:false,
    gateWeakeningAllowed:false
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const root=path.resolve(clean(args.root)||process.cwd());
  const result=evaluateNeuralExpansionReadiness({root});
  if(clean(args.output))writeJson(path.resolve(clean(args.output)),result);
  console.log('VIBE2_NEURAL_EXPANSION_READINESS='+(result.pass?'PASS':'PENDING'));
  console.log('VIBE2_NEURAL_EXPANSION_MISSING='+(result.missing.join(',')||'NONE'));
  console.log('VIBE2_NEURAL_EXECUTION_AUTHORITY_EXPANSION=NO');
}
