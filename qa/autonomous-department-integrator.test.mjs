import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { integrateDepartmentCandidates } from '../tools/autonomous-department-integrator.mjs';

const roles=['development','graphics','qa','balance'];
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-dept-integrate-'));
  const previous=process.cwd();process.chdir(root);
  fs.mkdirSync('web-games/demo',{recursive:true});
  fs.writeFileSync('web-games/demo/app.js','const a = 1;\nconst b = 2;\n');
  fs.writeFileSync('web-games/demo/style.css','body { margin: 0; }\n');
  for(const role of roles){fs.mkdirSync(`department-implementations/${role}`,{recursive:true});writeJson(`department-implementations/${role}/status.json`,{role,status:'NO_SCOPE',scope:[]});}
  const order={run:true,gameId:'PTEST',gameSlug:'demo',sourcePath:'web-games/demo',goal:'small goal',repairMode:'MODEL'};
  const cycle={finalGoal:'integrated goal',results:[],allDepartmentsWorked:true,finalDecision:'PROCEED'};
  return {root,previous,order,cycle,cleanup(){process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}};
}
function addImplementation(role,sourceCommit,files){
  const root=`department-implementations/${role}`;fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(`${root}/game`,{recursive:true});fs.cpSync('web-games/demo',`${root}/game`,{recursive:true});
  for(const [rel,content] of Object.entries(files)){const file=`${root}/game/${rel}`;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
  const changedFiles=Object.keys(files);
  writeJson(`${root}/evidence.json`,{sourcePath:'web-games/demo',sourceCommit,candidateId:`${role}-candidate`,changedFiles,summary:role,expectedEffect:'test'});
  writeJson(`${root}/status.json`,{role,status:'PASS',scope:changedFiles,candidateId:`${role}-candidate`,changedFiles});
}

test('parallel department changes three-way merge when edits do not overlap',()=>{
  const t=setup();try{
    const sourceCommit='source-sha';
    addImplementation('development',sourceCommit,{'app.js':'const a = 10;\nconst b = 2;\n'});
    addImplementation('graphics',sourceCommit,{'style.css':'body { margin: 0; padding: 4px; }\n'});
    addImplementation('balance',sourceCommit,{'app.js':'const a = 1;\nconst b = 20;\n'});
    const report=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(report.status,'PASS');
    assert.equal(fs.readFileSync('web-games/.autonomous-candidates/PTEST/final/app.js','utf8'),'const a = 10;\nconst b = 20;\n');
    const evidence=JSON.parse(fs.readFileSync('.autonomous/evidence/final.json','utf8'));
    assert.equal(evidence.integration.mode,'COMMON_BASE_THREE_WAY');
    assert.equal(evidence.saveKeyValidation,'PASS');
  }finally{t.cleanup();}
});

test('true same-line conflict is blocked until a resolved candidate is supplied',()=>{
  const t=setup();try{
    const sourceCommit='source-sha';
    addImplementation('development',sourceCommit,{'app.js':'const a = 10;\nconst b = 2;\n'});
    addImplementation('balance',sourceCommit,{'app.js':'const a = 99;\nconst b = 2;\n'});
    const first=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(first.status,'CONFLICT');
    assert.equal(first.conflictCount,1);
    fs.mkdirSync('web-games/.autonomous-candidates/PTEST/resolved',{recursive:true});
    fs.cpSync('web-games/demo','web-games/.autonomous-candidates/PTEST/resolved',{recursive:true});
    fs.writeFileSync('web-games/.autonomous-candidates/PTEST/resolved/app.js','const a = 10;\nconst b = 2;\n');
    const second=integrateDepartmentCandidates({order:t.order,cycle:t.cycle,implementationsDir:'department-implementations',candidateId:'final',candidatePath:'web-games/.autonomous-candidates/PTEST/final',sourceCommit,resolutionCandidate:'web-games/.autonomous-candidates/PTEST/resolved',evidencePath:'.autonomous/evidence/final.json',reportPath:'department-integration.json'});
    assert.equal(second.status,'PASS');
    assert.ok(fs.existsSync('.autonomous/evidence/final.json'));
  }finally{t.cleanup();}
});
