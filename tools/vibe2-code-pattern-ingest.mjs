// 파일명: tools/vibe2-code-pattern-ingest.mjs
// 역할: 검증된 training sample에서 raw 코드 없이 재사용 가능한 내부 구현 패턴만 추출한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const uniq=v=>[...new Set((v||[]).map(clean).filter(Boolean))];
const readJson=(file,fallback={})=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};

const CLASSIFIERS=[
  ['SAVE_PERSISTENCE',/save|load|restore|localStorage|sessionStorage|datastore|persist|migration/i],
  ['INPUT_EVENT_BINDING',/addEventListener|onclick|pointer|touch|keydown|keyup|input/i],
  ['STATE_MACHINE',/state|phase|win|fail|retry|restart|objective|progress/i],
  ['AI_INTENT',/enemy|npc|opponent|pathfind|\bai\b|intent/i],
  ['COMBAT_RESOLUTION',/combat|attack|damage|hit|weapon|skill|boss/i],
  ['ECONOMY_TRANSACTION',/econom|currency|gold|coin|cost|price|shop|resource|reward/i],
  ['FRAME_LOOP_PERFORMANCE',/requestAnimationFrame|setInterval|performance|pool|fps|frame/i],
  ['MOBILE_UI_FLOW',/mobile|touch|responsive|hud|menu|ui|button/i],
  ['REGRESSION_REPAIR',/regression|bug|repair|failure|fix|causal/i]
];

function engineOf(sample={}){
  const source=clean(sample?.input||'')+' '+clean(sample?.instruction||'');
  if(/roblox-games\//i.test(source)||/roblox|luau|studio/i.test(source))return'roblox';
  if(/unity-games\//i.test(source)||/unity|c#/i.test(source))return'unity';
  return'web';
}

function sampleVerified(sample={}){
  if(!['coding','bugfix','unity'].includes(clean(sample.taskType)))return false;
  if(upper(sample.independentQa)!=='PASS')return false;
  const browser=upper(sample.browserQa);
  if(browser&& !['PASS','NOT_APPLICABLE'].includes(browser))return false;
  if(sample.verification?.fullRegression&&upper(sample.verification.fullRegression)!=='PASS')return false;
  return Boolean(clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision));
}

export function deriveVerifiedCodePatterns(sample={},sourcePath=''){
  if(!sampleVerified(sample))return[];
  const text=[
    sample.instruction,sample.input,
    ...(sample.verification?.proposedTests||[]),
    clean(sample.output).split('검증된 패치:')[0]
  ].filter(Boolean).join(' ');
  const systems=CLASSIFIERS.filter(([,re])=>re.test(text)).map(([name])=>name);
  const sourceRevision=clean(sample.sourceRevision||sample.sourceCommit||sample.provenance?.sourceRevision);
  const gameId=clean(sample.gameId||sample.project)||null;
  const engine=engineOf(sample);
  const taskType=clean(sample.taskType);
  return systems.map(system=>({
    id:`pat_${hash([gameId,engine,taskType,system,sourceRevision].join('|'))}`,
    gameId,engine,taskType,system,
    problem:clean(sample.instruction).slice(0,220),
    pattern:`VERIFIED_${system}_SMALLEST_RESPONSIBLE_CHANGE_WITH_REGRESSION`,
    tags:uniq([system,taskType,engine,'verified','smallest-responsible-change','regression-bound']),
    verified:true,
    sourceRevision,
    evidencePath:sourcePath,
    rawCodeStored:false,
    independentQa:'PASS',
    browserQa:upper(sample.browserQa)||'NOT_APPLICABLE',
    authority:'verified-internal-code-pattern'
  }));
}

export function ingestVerifiedCodePatterns({samplesDir='company-learning/training-samples',libraryInput={}}={}){
  const byId=new Map((libraryInput?.patterns||[]).filter(x=>x?.verified===true).map(x=>[clean(x.id),x]));
  let examined=0,added=0;
  if(fs.existsSync(samplesDir)){
    for(const entry of fs.readdirSync(samplesDir,{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.json')).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(samplesDir,entry.name);let sample;try{sample=readJson(file,null);}catch{continue;} examined++;
      for(const pattern of deriveVerifiedCodePatterns(sample,file)){
        if(!byId.has(pattern.id))added++;
        byId.set(pattern.id,pattern);
      }
    }
  }
  return {
    version:1,kind:'vibe2-verified-code-pattern-library',
    patterns:[...byId.values()].sort((a,b)=>String(a.system).localeCompare(String(b.system))||String(a.id).localeCompare(String(b.id))),
    policy:{verifiedEvidenceRequired:true,rawCodeStored:false,wholeGameCopyForbidden:true,unauthorizedExternalCodeForbidden:true},
    stats:{examined,added,total:byId.size},
    updatedAt:new Date().toISOString()
  };
}

function args(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const i=raw.indexOf('=');if(i<0)out[raw.slice(2)]=true;else out[raw.slice(2,i)]=raw.slice(i+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=args();const samples=clean(a.samples)||'company-learning/training-samples';const output=clean(a.output)||'.vibe2/code-pattern-library.json';
  const result=ingestVerifiedCodePatterns({samplesDir:samples,libraryInput:readJson(output,{patterns:[]})});
  writeJson(output,result);
  console.log('VIBE2_CODE_PATTERN_INGEST=PASS');
  console.log(`VIBE2_CODE_PATTERN_ADDED=${result.stats.added}`);
  console.log(`VIBE2_CODE_PATTERN_TOTAL=${result.stats.total}`);
  console.log('VIBE2_RAW_CODE_STORED=NO');
}
