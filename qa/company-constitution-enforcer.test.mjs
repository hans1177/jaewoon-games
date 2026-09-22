// 파일명: qa/company-constitution-enforcer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enforceConstitution} from '../tools/company-constitution-enforcer.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const policy=JSON.parse(fs.readFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),'utf8'));
const clone=value=>structuredClone(value);
const run=p=>enforceConstitution({policy:p,root,phase:'test'});
const ruleEntries=p=>Object.entries(p.ownerCanonicalRules||{})
  .filter(([key,value])=>/^rule\d+$/i.test(key)&&value?.enabled===true)
  .sort((a,b)=>Number(a[0].match(/\d+/)?.[0]||0)-Number(b[0].match(/\d+/)?.[0]||0));

function setAt(source,pathText,value){
  const parts=String(pathText||'').split('.').filter(Boolean);
  let node=source;
  for(const part of parts.slice(0,-1))node=node[part];
  node[parts.at(-1)]=value;
}

test('every enabled canonical rule is discovered and declaratively enforced',()=>{
  const result=run(policy);
  const entries=ruleEntries(policy);
  assert.equal(result.pass,true,result.errors.join('\n'));
  assert.equal(result.enforcedRuleCount,entries.length);
  assert.deepEqual(result.orderedRuleIds,entries.map(([,rule])=>rule.id));
  assert.ok(entries.every(([,rule])=>Array.isArray(rule.machineEnforcement?.assertions)&&rule.machineEnforcement.assertions.length>0));
});

test('enforcer source has no numbered constitutional rule branches',()=>{
  const source=fs.readFileSync(path.join(root,'tools/company-constitution-enforcer.mjs'),'utf8');
  assert.doesNotMatch(source,/owner\.rule\d+/);
  assert.doesNotMatch(source,/const\s+r\d+\s*=/);
  assert.match(source,/for\(const row of constitution\.rules\)/);
});

test('a declared assertion failure is enforced without rule-specific code',()=>{
  const p=clone(policy);
  const [key,rule]=ruleEntries(p).find(([,r])=>r.machineEnforcement.assertions.some(a=>a.operator==='EQ'&&typeof a.expected==='boolean'));
  const assertion=rule.machineEnforcement.assertions.find(a=>a.operator==='EQ'&&typeof a.expected==='boolean');
  setAt(p.ownerCanonicalRules[key],assertion.path,!assertion.expected);
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.includes(rule.id+':'+assertion.code));
});

test('future enabled rule auto-binds and enforces with no worker or enforcer code change',()=>{
  const p=clone(policy);
  const numbers=ruleEntries(p).map(([key])=>Number(key.match(/\d+/)?.[0]||0));
  const next=Math.max(0,...numbers)+1;
  const key='rule'+next;
  const id='RULE_'+next+'_FUTURE_DYNAMIC_CONSTITUTION';
  p.ownerCanonicalRules[key]={
    id,label:'미래규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'DYNAMIC_TEST',
    sentinel:true,
    machineEnforcement:{schemaVersion:p.ownerCanonicalRules.constitutionalBinding.ruleEnforcementSchemaVersion,assertions:[
      {code:'SENTINEL_TRUE',operator:'EQ',path:'sentinel',expected:true}
    ]}
  };
  const pass=run(p);
  assert.equal(pass.pass,true,pass.errors.join('\n'));
  assert.equal(pass.orderedRuleIds.at(-1),id);

  p.ownerCanonicalRules[key].sentinel=false;
  const fail=run(p);
  assert.equal(fail.pass,false);
  assert.ok(fail.errors.includes(id+':SENTINEL_TRUE'));
});

test('future enabled rule without declarative enforcement fails closed',()=>{
  const p=clone(policy);
  const numbers=ruleEntries(p).map(([key])=>Number(key.match(/\d+/)?.[0]||0));
  const next=Math.max(0,...numbers)+1;
  p.ownerCanonicalRules['rule'+next]={
    id:'RULE_'+next+'_MISSING_MACHINE_ENFORCEMENT',
    label:'미래규칙',enabled:true,authority:'OWNER_DIRECTIVE_TEST',objective:'MUST_FAIL_CLOSED'
  };
  const result=run(p);
  assert.equal(result.pass,false);
  assert.ok(result.errors.some(error=>error.includes('CONSTITUTION_MACHINE_ENFORCEMENT_MISSING')||error.includes('MACHINE_ENFORCEMENT_MISSING')));
});
