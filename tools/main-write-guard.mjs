// 파일명: tools/main-write-guard.mjs
// 역할: 자동화/워크플로우 변경에서 main 직접 쓰기를 결정론적으로 차단한다.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DIRECT_MAIN_PATTERNS=[
  /git\s+push\b[^\n]*\borigin\b[^\n]*(?:HEAD:main|\bmain\b)/i,
  /gh\s+api\b[^\n]*\/git\/refs\/heads\/main\b/i,
  /refs\/heads\/main\b[^\n]*(?:PATCH|POST|PUT)/i,
];
const WORKFLOW_EXT=/\.ya?ml$/i;

export function isWorkflowPath(file=''){
  return String(file).startsWith('.github/workflows/')&&WORKFLOW_EXT.test(file);
}

export function scanTextForDirectMainWrite(text=''){
  const lines=String(text).split(/\r?\n/);
  const violations=[];
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(DIRECT_MAIN_PATTERNS.some(pattern=>pattern.test(line))){
      violations.push({line:index+1,text:line.trim()});
    }
  }
  return violations;
}

export function scanChangedWorkflowFiles(files=[]){
  const violations=[];
  for(const file of files.filter(isWorkflowPath)){
    if(!fs.existsSync(file))continue;
    for(const hit of scanTextForDirectMainWrite(fs.readFileSync(file,'utf8'))){
      violations.push({file,...hit});
    }
  }
  return violations;
}

function changedFiles(baseRef,headRef){
  const out=execFileSync('git',['diff','--name-only',`${baseRef}...${headRef}`],{encoding:'utf8'});
  return out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}

function arg(name,fallback=''){
  const value=process.argv.find(item=>item.startsWith(`--${name}=`));
  return value?value.slice(name.length+3):fallback;
}

function main(){
  const base=arg('base','origin/main');
  const head=arg('head','HEAD');
  const files=changedFiles(base,head);
  const violations=scanChangedWorkflowFiles(files);
  const result={
    status:violations.length?'FAIL':'PASS',
    developmentProgress:violations.length?'BLOCKED':'INCOMPLETE_PROGRESS',
    changedWorkflowFiles:files.filter(isWorkflowPath),
    violations,
    adminProtection:'ADMIN_PROTECTION_BLOCKER',
    rule:'feature branch -> PR -> CI -> merge; workflow direct-write to main forbidden',
  };
  console.log(JSON.stringify(result,null,2));
  if(violations.length)process.exitCode=1;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
