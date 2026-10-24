// Department experience must only credit exact Vibe QA-verified Git commits.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const worker=path.resolve('tools/award-department-experience.mjs');
const workflow=fs.readFileSync('.github/workflows/department-experience.yml','utf8');
function git(dir,...args){
  const p=spawnSync('git',args,{cwd:dir,encoding:'utf8'});
  assert.equal(p.status,0,`git ${args.join(' ')} failed: ${p.stderr}`);
  return p.stdout.trim();
}
function write(dir,name,value){
  const target=path.join(dir,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,value);
}
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-department-xp-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  git(dir,'init','-q','-b','main');
  git(dir,'config','user.email','qa@local.test');
  git(dir,'config','user.name','Vibe Department QA');
  write(dir,'department-experience.json',JSON.stringify({version:1,departments:{},history:[]}));
  write(dir,'assets/department-experience-state.js','export const DEFAULT_DEPARTMENT_EXPERIENCE_STATE={};\n');
  write(dir,'README.md','base\n');
  git(dir,'add','.');git(dir,'commit','-qm','base');
  return dir;
}
function award(dir,sha,run='123'){
  return spawnSync(process.execPath,[worker,sha,run],{cwd:dir,encoding:'utf8'});
}
test('workflow fetches verified SHA and parent rather than trusting shallow latest main',()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(workflow,/git fetch --no-tags --filter=blob:none --depth=2 origin "\$SOURCE_SHA"/);
  assert.match(workflow,/git cat-file -e "\$\{SOURCE_SHA\}\^1\^\{commit\}"/);
  assert.match(workflow,/fetch-depth: 1/);
  assert.match(workflow,/sparse-checkout:/);
  assert.match(workflow,/--base main/);
  assert.match(workflow,/gh pr create/);
  assert.match(workflow,/--head "\$branch"/);
});
test('Vibe QA merge commit credits actual first-parent web game change once',t=>{
  const dir=fixture(t);
  git(dir,'checkout','-qb','game');
  write(dir,'web-games/fantasy-survival/world3d.mjs','export const floor=1;\n');
  git(dir,'add','.');git(dir,'commit','-qm','implement web game');
  git(dir,'checkout','main');
  write(dir,'unrelated.txt','main moved\n');
  git(dir,'add','.');git(dir,'commit','-qm','other main work');
  git(dir,'merge','--no-ff','--no-edit','-q','game');
  const sha=git(dir,'rev-parse','HEAD');
  const result=award(dir,sha,'4021');
  assert.equal(result.status,0,result.stderr);
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'department-experience.json'),'utf8'));
  assert.equal(ledger.departments.development.verifiedCompletions,1);
  assert.equal(ledger.departments.graphics.verifiedCompletions,1);
  assert.equal(ledger.history.at(-1).sourceCommit,sha);
  assert.equal(ledger.history.at(-1).changedFilesCount,1);
  const twice=award(dir,sha,'4021');
  assert.equal(twice.status,0,twice.stderr);
  const again=JSON.parse(fs.readFileSync(path.join(dir,'department-experience.json'),'utf8'));
  assert.equal(again.history.length,1,'same source must not double-award');
});
test('Roblox and cross-department verified changes map to their actual organizations',t=>{
  const dir=fixture(t);
  write(dir,'roblox-games/fantasy-survival/shared/GameConfig.luau','return {version=1}\n');
  write(dir,'design/forest.md','design change\n');
  write(dir,'.github/workflows/magic-forest-pages.yml','name: pages\n');
  git(dir,'add','.');git(dir,'commit','-qm','Vibe verified multi-organization change');
  const sha=git(dir,'rev-parse','HEAD');
  const result=award(dir,sha,'4022');
  assert.equal(result.status,0,result.stderr);
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'department-experience.json'),'utf8'));
  for(const department of ['development','planning','release'])
    assert.equal(ledger.departments[department]?.verifiedCompletions,1,department);
  assert.equal(ledger.history.at(-1).changedFilesCount,3);
});
test('missing parent and invalid commit fail closed without manufactured XP',t=>{
  const dir=fixture(t);
  const invalid=award(dir,'not-a-sha','43');
  assert.notEqual(invalid.status,0);
  const absent=award(dir,'a'.repeat(40),'44');
  assert.notEqual(absent.status,0);
  const ledger=JSON.parse(fs.readFileSync(path.join(dir,'department-experience.json'),'utf8'));
  assert.equal(ledger.history.length,0);
});
