// 파일명: tools/company-constitution-enforcer.mjs
// 역할: 중앙 헌법(ownerCanonicalRules)의 모든 enabled rule<N>을 선언형 assertion으로 자동 강제한다.
// 원칙: 규칙 번호/개수/내용을 코드에 하드코딩하지 않는다. 새 헌법은 중앙정책 선언만으로 자동 바인딩된다.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileOwnerCanonicalConstitution} from './company-shared-context.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=v=>String(v??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(path.resolve(ROOT,file),'utf8'));
const readText=(root,file)=>fs.readFileSync(path.resolve(root,file),'utf8');
const exists=(root,file)=>Boolean(clean(file))&&fs.existsSync(path.resolve(root,clean(file)));
const fail=(errors,phase)=>{throw new Error('CONSTITUTION_ENFORCEMENT_FAILED:'+phase+':'+errors.join('|'));};
const must=(errors,ok,code)=>{if(!ok)errors.push(code);};

function valueAt(source,pathText=''){
  const parts=clean(pathText).split('.').filter(Boolean);
  let value=source;
  for(const part of parts){
    if(value===null||value===undefined||typeof value!=='object')return undefined;
    value=value[part];
  }
  return value;
}

function assertionPass(assertion={},source={},root=ROOT){
  const operator=clean(assertion.operator).toUpperCase();
  const actual=valueAt(source,assertion.path);
  const expected=assertion.expected;
  if(operator==='EQ')return Object.is(actual,expected);
  if(operator==='NEQ')return !Object.is(actual,expected);
  if(operator==='CONTAINS')return String(actual??'').includes(String(expected??''));
  if(operator==='ARRAY_INCLUDES')return Array.isArray(actual)&&actual.includes(expected);
  if(operator==='FILE_EXISTS')return exists(root,expected);
  if(operator==='FILE_EXISTS_FROM_PATH')return exists(root,actual);
  if(operator==='FILE_CONTAINS'){
    if(!exists(root,assertion.file))return false;
    return readText(root,assertion.file).includes(String(expected??''));
  }
  if(operator==='FILE_REGEX'){
    if(!exists(root,assertion.file))return false;
    return new RegExp(String(expected??''),String(assertion.flags??'')).test(readText(root,assertion.file));
  }
  return false;
}

function enforceAssertions({assertions=[],source={},root=ROOT,prefix='',errors=[]}={}){
  if(!Array.isArray(assertions)||assertions.length===0){
    errors.push(prefix+'DECLARATIVE_ASSERTIONS_MISSING');
    return;
  }
  for(const assertion of assertions){
    const code=clean(assertion?.code)||'ASSERTION_WITHOUT_CODE';
    const operator=clean(assertion?.operator);
    if(!operator){
      errors.push(prefix+code+':OPERATOR_MISSING');
      continue;
    }
    if(!assertionPass(assertion,source,root))errors.push(prefix+code);
  }
}

export function enforceConstitution({policy,root=ROOT,phase='runtime'}={}){
  const errors=[];
  const p=policy||JSON.parse(fs.readFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),'utf8'));
  const constitution=compileOwnerCanonicalConstitution(p);
  must(errors,constitution.valid===true,'CANONICAL_CONSTITUTION_INVALID:'+(constitution.errors||[]).join(','));
  must(errors,constitution.rules.length>0,'CANONICAL_RULE_SET_EMPTY');
  must(errors,new Set(constitution.orderedRuleIds).size===constitution.orderedRuleIds.length,'CANONICAL_RULE_ORDER_DUPLICATE');
  must(errors,constitution.rules.every(r=>r.id&&r.fingerprint&&r.contract?.enabled===true),'CANONICAL_RULE_FINGERPRINT_OR_ENABLEMENT');

  const owner=p.ownerCanonicalRules||{};
  const binding=owner.constitutionalBinding||{};
  must(errors,binding.executableEnforcer==='tools/company-constitution-enforcer.mjs','CONSTITUTION_ENFORCER_BINDING');
  must(errors,binding.declarativeRuleEnforcementRequired===true,'CONSTITUTION_DECLARATIVE_ENFORCEMENT_REQUIRED');
  must(errors,binding.hardcodedRuleNumberBranchesForbidden===true,'CONSTITUTION_HARDCODED_RULE_BRANCHES_FORBIDDEN');
  must(errors,binding.genericRuleIterationRequired===true,'CONSTITUTION_GENERIC_RULE_ITERATION_REQUIRED');
  must(errors,binding.futureCanonicalRulesAutoBindWithoutWorkerCodeChange===true,'CONSTITUTION_FUTURE_AUTO_BIND_REQUIRED');
  must(errors,binding.enforcerRequiredAtPolicyQa===true,'CONSTITUTION_POLICY_QA_BINDING');
  must(errors,binding.enforcerRequiredAt24hPlanner===true,'CONSTITUTION_24H_PLANNER_BINDING');
  must(errors,binding.enforcerRequiredBeforeWorkerSourceWrite===true,'CONSTITUTION_WORKER_PREWRITE_BINDING');
  must(errors,binding.enforcerRequiredAfterWorkerExecution===true,'CONSTITUTION_WORKER_POST_BINDING');
  must(errors,binding.global24hStopOnConstitutionFailureForbidden===true,'CONSTITUTION_NO_GLOBAL_STOP_ON_VIOLATION');

  const schemaVersion=Number(binding.ruleEnforcementSchemaVersion)||0;
  must(errors,schemaVersion>0,'CONSTITUTION_RULE_ENFORCEMENT_SCHEMA_MISSING');

  for(const row of constitution.rules){
    const enforcement=row.contract?.machineEnforcement;
    const prefix=row.id+':';
    if(!enforcement||typeof enforcement!=='object'){
      errors.push(prefix+'MACHINE_ENFORCEMENT_MISSING');
      continue;
    }
    if(Number(enforcement.schemaVersion)!==schemaVersion){
      errors.push(prefix+'MACHINE_ENFORCEMENT_SCHEMA_MISMATCH');
      continue;
    }
    enforceAssertions({assertions:enforcement.assertions,source:row.contract,root,prefix,errors});
  }

  enforceAssertions({
    assertions:binding.repositoryAssertions,
    source:{},
    root,
    prefix:'REPOSITORY:',
    errors
  });

  return{
    pass:errors.length===0,
    phase,
    errors,
    constitutionFingerprint:constitution.fingerprint,
    orderedRuleIds:constitution.orderedRuleIds,
    enforcedRuleCount:constitution.rules.length,
    enforcementSchemaVersion:schemaVersion
  };
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=Object.fromEntries(process.argv.slice(2).filter(v=>v.startsWith('--')).map(raw=>{const [k,...rest]=raw.slice(2).split('=');return[k,rest.join('=')||true];}));
  const policy=args.policy?readJson(args.policy):null;
  const result=enforceConstitution({policy,phase:clean(args.phase)||'runtime'});
  if(!result.pass)fail(result.errors,result.phase);
  console.log('CONSTITUTION_ENFORCEMENT=PASS');
  console.log('CONSTITUTION_PHASE='+result.phase);
  console.log('CONSTITUTION_FINGERPRINT='+result.constitutionFingerprint);
  console.log('CONSTITUTION_RULE_COUNT='+result.enforcedRuleCount);
  console.log('CONSTITUTION_RULES='+result.orderedRuleIds.join('>'));
}
