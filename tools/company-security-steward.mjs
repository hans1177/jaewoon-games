// 파일명: tools/company-security-steward.mjs
// 역할: 저장소/CI/외부-AI 경계의 공격·악성코드·비밀키·권한상승·무단쓰기 신호를 탐지한다.
// 원칙: 의심 변경만 격리하고, 비밀값/악성 payload 원문은 보고서에 저장하지 않는다.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const sha256=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const severityRank={LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4};
const BLOCK_AT='HIGH';
const CENTRAL_POLICY_FILES=new Set(['platform-release-roadmap','company-log-map','company-architecture-map'].map(name=>`company-learning/${name}.json`));
const SECURITY_CONTRACT_FILE=/^(?:\.github\/workflows\/company-security-immune\.yml|tools\/company-security-[^/]+\.mjs|qa\/company-security-[^/]+\.test\.mjs|tools\/company-shared-context\.mjs|tools\/company-constitution-enforcer\.mjs|company-learning\/security-immune-system\.json|company-directive\.json)$/;
const SECURITY_BOUNDARY_KEY=/security|secret|credential|permission|quarantine|bypass|sourceOfTruth|authority|writeAllowed|writeAuthority|centralPolicyWrite|selfAcceptance|execution|executable|trusted|accessControl|remoteInput|serverValidation/i;
const TRUSTED_INSTALL_DOMAINS=new Set(['ollama.com']);
const SUSPICIOUS_BIN=/\.(?:exe|msi|scr|com|bat|cmd|ps1|dll|so|dylib|jar|apk|ipa|deb|rpm|elf)$/i;
const SECRET_RULES=[
  ['GITHUB_TOKEN_LITERAL',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['OPENAI_KEY_LITERAL',/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['AWS_ACCESS_KEY_LITERAL',/\bAKIA[0-9A-Z]{16}\b/],
  ['SLACK_TOKEN_LITERAL',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['PRIVATE_KEY_LITERAL',/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/]
];
const SAFE_SECRET_REFERENCES=/\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}|process\.env\.[A-Za-z0-9_]+|\$[A-Z][A-Z0-9_]+/;
const PROMPT_INJECTION_PATTERNS=[
  /ignore (?:all|any|the)?\s*(?:previous|prior) instructions?/i,
  /reveal (?:the )?(?:system|developer) prompt/i,
  /send|upload|exfiltrat/i,
  /disable (?:security|guard|gate|verification)/i,
  /bypass (?:policy|qa|review|security)/i
];

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const body=raw.slice(2),at=body.indexOf('=');
    if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);
  }
  return out;
}
function redact(text=''){
  let out=String(text);
  for(const [,re] of SECRET_RULES)out=out.replace(re,'[REDACTED_SECRET]');
  if(out.length>220)out=out.slice(0,220)+'…';
  return out;
}
function finding({rule,severity,file,line=0,text='',category='security',disposition='QUARANTINE'}){
  return{
    rule,severity,file,line,category,disposition:clean(disposition).toUpperCase()||'QUARANTINE',
    evidenceSha256:sha256([file,line,text].join('|')),
    snippet:redact(text)
  };
}
function parseAddedLines(patch=''){
  const rows=[];let file=null,newLine=0;
  for(const raw of String(patch).split('\n')){
    if(raw.startsWith('+++ b/')){file=raw.slice(6);continue;}
    if(raw.startsWith('+++ /dev/null')){file=null;continue;}
    const h=raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if(h){newLine=Number(h[1]);continue;}
    if(raw.startsWith('+')&&!raw.startsWith('+++')){
      if(file)rows.push({file,line:newLine,text:raw.slice(1)});
      newLine++;continue;
    }
    if(raw.startsWith('-')&&!raw.startsWith('---'))continue;
    if(file&&raw&&!raw.startsWith('diff --git')&&!raw.startsWith('index ')&&!raw.startsWith('--- '))newLine++;
  }
  return rows;
}
function domainFromUrl(text=''){
  const m=String(text).match(/https?:\/\/([^\s/'"<>]+)/i);
  return m?m[1].toLowerCase():null;
}
function scanLine(row){
  const out=[];const {file,line,text}=row;const t=String(text);
  for(const [rule,re] of SECRET_RULES){
    if(re.test(t)&&!SAFE_SECRET_REFERENCES.test(t))out.push(finding({rule,severity:'CRITICAL',file,line,text:t,category:'secret'}));
  }
  if(/permissions\s*:\s*write-all/i.test(t))out.push(finding({rule:'WORKFLOW_WRITE_ALL',severity:'CRITICAL',file,line,text:t,category:'privilege'}));
  if(/pull_request_target\s*:/i.test(t))out.push(finding({rule:'PULL_REQUEST_TARGET_ADDED',severity:'HIGH',file,line,text:t,category:'workflow'}));
  if(/git\s+push\b.*\b(?:origin\s+)?(?:HEAD:)?main\b/i.test(t))out.push(finding({rule:'DIRECT_MAIN_PUSH_ADDED',severity:'HIGH',file,line,text:t,category:'write-boundary'}));
  if(/(?:curl|wget)\b[^\n]*\|\s*(?:sh|bash|zsh|powershell|pwsh)\b/i.test(t)){
    const domain=domainFromUrl(t);
    const trusted=domain&&TRUSTED_INSTALL_DOMAINS.has(domain);
    out.push(finding({rule:trusted?'TRUSTED_INSTALL_PIPE_REVIEW':'REMOTE_PIPE_TO_SHELL',severity:trusted?'MEDIUM':'CRITICAL',file,line,text:t,category:'supply-chain'}));
  }
  if(/\b(?:eval\s+\$|base64\s+(?:-d|--decode)[^|]*\|\s*(?:sh|bash)|nc\s+-e|socat\b.*EXEC:|\/dev\/tcp\/|chmod\s+[47][0-7]{3}\b)/i.test(t)){
    out.push(finding({rule:'SUSPICIOUS_COMMAND_EXECUTION',severity:'CRITICAL',file,line,text:t,category:'malware'}));
  }
  if(/(?:^|\s)(?:crontab|systemctl\s+enable|launchctl\s+load|schtasks\s+\/create)\b/i.test(t)){
    out.push(finding({rule:'PERSISTENCE_MECHANISM_ADDED',severity:'HIGH',file,line,text:t,category:'persistence'}));
  }
  if(/(?:curl|wget)\b.*(?:Authorization:|Bearer\s+\$|--data.*(?:token|secret|password))/i.test(t)){
    const domain=domainFromUrl(t);
    if(domain&&!['api.github.com','github.com'].includes(domain)){
      out.push(finding({rule:'POSSIBLE_CREDENTIAL_EXFILTRATION',severity:'CRITICAL',file,line,text:t,category:'exfiltration'}));
    }
  }
  if(/\.github\/workflows\//.test(file)&&/id-token\s*:\s*write/i.test(t)){
    out.push(finding({rule:'OIDC_WRITE_PERMISSION_ADDED',severity:'HIGH',file,line,text:t,category:'privilege'}));
  }
  if(/company-learning\/(?:platform-release-roadmap|company-log-map|company-architecture-map)\.json/.test(file)&&/(authority|sourceOfTruth|forbidden|gameSourceWriteAllowed|centralPolicyWrite|workerSelfAcceptance)/i.test(t)){
    out.push(finding({rule:'CENTRAL_AUTHORITY_MUTATION_REQUIRES_REVIEW',severity:'HIGH',file,line,text:t,category:'policy-integrity',disposition:'REVIEW'}));
  }
  return out;
}
export function scanExternalInstruction(text=''){
  const hits=[];
  for(const re of PROMPT_INJECTION_PATTERNS){
    if(re.test(String(text)))hits.push({rule:'EXTERNAL_PROMPT_INJECTION_SIGNAL',severity:'HIGH',evidenceSha256:sha256(text)});
  }
  return hits;
}
function jsonChanges(before,after,path=[]){
  if(JSON.stringify(before)===JSON.stringify(after))return[];
  const object=value=>value!==null&&typeof value==='object';
  if(object(before)||object(after)){
    if((before!==undefined&&!object(before))||(after!==undefined&&!object(after)))return[{path,before,after}];
    return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].flatMap(key=>jsonChanges(before?.[key],after?.[key],[...path,key]));
  }
  return[{path,before,after}];
}
function productionDesignChange({path,before,after}){
  if(path.length===1&&['version','updatedAt','updatedDate'].includes(path[0]))return true;
  if(path[0]!=='directNativeDualPlatformDevelopment'||path[1]!=='design')return false;
  const keys=path.slice(2);
  // 설계 소유자의 날짜 표시는 권한 부여가 아니다. 실행/쓰기/보안 권한 키는 계속 검토한다.
  if(keys.slice(0,-1).some(key=>SECURITY_BOUNDARY_KEY.test(key)))return false;
  if(keys.at(-1)==='authority'&&[before,after].every(value=>value===undefined||/^OWNER_DIRECTIVE_\d{4}-\d{2}-\d{2}$/.test(String(value))))return true;
  return !keys.some(key=>SECURITY_BOUNDARY_KEY.test(key));
}
function classifyCentralSnapshots(snapshots={}){
  const result=new Map();
  for(const [file,snapshot] of Object.entries(snapshots)){
    if(!CENTRAL_POLICY_FILES.has(file))continue;
    try{
      const before=typeof snapshot.before==='string'?JSON.parse(snapshot.before):snapshot.before;
      const after=typeof snapshot.after==='string'?JSON.parse(snapshot.after):snapshot.after;
      if(!before||!after||Array.isArray(before)||Array.isArray(after)||typeof before!=='object'||typeof after!=='object')continue;
      const changes=jsonChanges(before,after);
      result.set(file,{changes,designOnly:changes.length>0&&file==='company-learning/platform-release-roadmap.json'&&changes.every(productionDesignChange)});
    }catch{/* 원본 비교가 불가능하면 기존 검토 분류를 유지한다. */}
  }
  return result;
}
export function scanSecurityPatch({patch='',changedFiles=[],centralPolicySnapshots={}}={}){
  const rows=parseAddedLines(patch);const findings=[];
  const central=classifyCentralSnapshots(centralPolicySnapshots);
  for(const file of changedFiles){
    if(SUSPICIOUS_BIN.test(file))findings.push(finding({rule:'EXECUTABLE_OR_BINARY_ARTIFACT_ADDED',severity:'HIGH',file,line:0,text:file,category:'malware'}));
  }
  for(const row of rows)findings.push(...scanLine(row).filter(item=>item.rule!=='CENTRAL_AUTHORITY_MUTATION_REQUIRES_REVIEW'||central.get(row.file)?.designOnly!==true));
  // 권한 키 변경과 삭제로 제한을 없애는 변경도 추가 줄 검사와 같은 검토를 받는다.
  for(const [file,entry] of central)if(!entry.designOnly){
    for(const change of entry.changes){
      if(!change.path.some(key=>SECURITY_BOUNDARY_KEY.test(key)||(change.after===undefined&&/forbidden/i.test(key))))continue;
      findings.push(finding({rule:'CENTRAL_AUTHORITY_MUTATION_REQUIRES_REVIEW',severity:'HIGH',file,text:`${change.after===undefined?'removed':'changed'}:${change.path.join('.')}`,category:'policy-integrity',disposition:'REVIEW'}));
    }
  }
  const dedup=new Map();
  for(const x of findings)dedup.set([x.rule,x.file,x.line,x.evidenceSha256].join('|'),x);
  const list=[...dedup.values()].sort((a,b)=>severityRank[b.severity]-severityRank[a.severity]||a.file.localeCompare(b.file)||a.line-b.line);
  const max=list.reduce((m,x)=>Math.max(m,severityRank[x.severity]||0),0);
  const quarantine=list.some(x=>clean(x.disposition)!=='REVIEW'&&(severityRank[x.severity]||0)>=severityRank[BLOCK_AT]);
  const review=list.some(x=>clean(x.disposition)==='REVIEW');
  return{
    version:2,kind:'company-security-report',
    verdict:quarantine?'QUARANTINE':review?'REVIEW':'PASS',
    highestSeverity:Object.keys(severityRank).find(k=>severityRank[k]===max)||'NONE',
    findings:list,
    reviewFindings:list.filter(x=>clean(x.disposition)==='REVIEW').length,
    quarantineFindings:list.filter(x=>clean(x.disposition)!=='REVIEW'&&(severityRank[x.severity]||0)>=severityRank[BLOCK_AT]).length,
    securityContractChanged:changedFiles.some(file=>SECURITY_CONTRACT_FILE.test(file))||list.some(item=>item.category==='policy-integrity'),
    productionDesignDiagnostics:[...central].filter(([,entry])=>entry.designOnly).map(([file,entry])=>({file,changedFields:entry.changes.length,classification:'DESIGN_CONTENT_ONLY_NO_SECURITY_REVIEW'})),
    rawSecretStored:false,rawMalwareStored:false,
    checkedAt:new Date().toISOString()
  };
}
function gitUntrackedFiles(){
  try{
    return execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:20*1024*1024})
      .split('\0').map(clean).filter(Boolean);
  }catch{return[];}
}
function untrackedTextPatch(files=[]){
  let patch='';
  for(const file of files){
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    const body=fs.readFileSync(file);
    if(body.includes(0))continue;
    const lines=body.toString('utf8').split('\n');
    patch+=`diff --git a/${file} b/${file}\nnew file mode 100644\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(line=>`+${line}`).join('\n')}\n`;
  }
  return patch;
}
function gitPatch(base='',head=''){
  if(base&&head)return execFileSync('git',['diff','--unified=0','--no-color',base+'...'+head],{encoding:'utf8',maxBuffer:20*1024*1024});
  const tracked=execFileSync('git',['diff','--unified=0','--no-color'],{encoding:'utf8',maxBuffer:20*1024*1024});
  const untracked=gitUntrackedFiles();
  return tracked+untrackedTextPatch(untracked);
}
function gitChangedFiles(base='',head=''){
  const args=['diff','--name-only'];
  if(base&&head)args.push(base+'...'+head);
  const tracked=execFileSync('git',args,{encoding:'utf8'}).split('\n').map(clean).filter(Boolean);
  return base&&head?tracked:[...new Set([...tracked,...gitUntrackedFiles()])];
}
function centralSnapshots(files,base='',head=''){
  const snapshots={};let beforeRef=base||'HEAD';
  if(base&&head){try{beforeRef=execFileSync('git',['merge-base',base,head],{encoding:'utf8'}).trim();}catch{}}
  for(const file of files.filter(file=>CENTRAL_POLICY_FILES.has(file))){
    try{
      snapshots[file]={
        before:execFileSync('git',['show',`${beforeRef}:${file}`],{encoding:'utf8',maxBuffer:20*1024*1024}),
        after:head?execFileSync('git',['show',`${head}:${file}`],{encoding:'utf8',maxBuffer:20*1024*1024}):fs.readFileSync(file,'utf8')
      };
    }catch{/* 비교가 없으면 기존 전체 권한 검토를 적용한다. */}
  }
  return snapshots;
}
export function scanWorkingTreeSecurity(){
  const changedFiles=gitChangedFiles();
  return scanSecurityPatch({patch:gitPatch(),changedFiles,centralPolicySnapshots:centralSnapshots(changedFiles)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const patchFile=clean(args.patch),filesFile=clean(args.files);
  const patch=patchFile?fs.readFileSync(patchFile,'utf8'):gitPatch(clean(args.base),clean(args.head));
  const changedFiles=filesFile?fs.readFileSync(filesFile,'utf8').split('\n').map(clean).filter(Boolean):gitChangedFiles(clean(args.base),clean(args.head));
  const snapshots=!patchFile||(args.base&&args.head)?centralSnapshots(changedFiles,clean(args.base),clean(args.head)):{};
  const report=scanSecurityPatch({patch,changedFiles,centralPolicySnapshots:snapshots});
  if(clean(args.output))fs.writeFileSync(args.output,JSON.stringify(report,null,2)+'\n','utf8');
  console.log('VIBE_SECURITY_VERDICT='+report.verdict);
  console.log('VIBE_SECURITY_HIGHEST='+report.highestSeverity);
  console.log('VIBE_SECURITY_FINDINGS='+report.findings.length);
  if(report.verdict==='QUARANTINE')process.exitCode=2;
}
