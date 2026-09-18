import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { addVibeExperience, createVibeExperienceMemory } from '../assets/vibe-experience-memory.js';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const clean=value=>String(value??'').trim();

export function validateAuthorizedSummary(summary){
  if(!summary||summary.gameId!=='block-blast')throw new Error('AUTHORIZED_SUMMARY_GAME_MISMATCH');
  if(summary.packageId!=='com.block.juggle')throw new Error('AUTHORIZED_SUMMARY_PACKAGE_MISMATCH');
  if(summary.authority!=='OWNER_ASSERTED_REUSE_REINTERPRETATION')throw new Error('AUTHORIZED_SUMMARY_AUTHORITY_MISSING');
  if(!/^[a-f0-9]{64}$/i.test(clean(summary.packageFingerprint)))throw new Error('AUTHORIZED_SUMMARY_FINGERPRINT_INVALID');
  if(!Array.isArray(summary.reusablePatterns)||summary.reusablePatterns.length===0)throw new Error('AUTHORIZED_SUMMARY_PATTERNS_MISSING');
  if(!Array.isArray(summary.learningDomains)||summary.learningDomains.length===0)throw new Error('AUTHORIZED_SUMMARY_DOMAINS_MISSING');
  if(Number(summary?.sourceCorpus?.documents||0)<=0)throw new Error('AUTHORIZED_SUMMARY_SOURCE_CORPUS_MISSING');
  return summary;
}

export function mergeAuthorizedSummary(memory,summary,{summaryPath='company-learning/authorized-source/block-blast/authorized-learning-summary.json'}={}){
  const valid=validateAuthorizedSummary(summary);
  const sourceText=JSON.stringify(valid);
  const evidence=[
    'AUTHORIZED_STATIC_EXTRACTION_PASS',
    `PACKAGE_FINGERPRINT:${valid.packageFingerprint}`,
    `SUMMARY_SHA256:${sha256(sourceText)}`,
    `SOURCE_PATH:${summaryPath}`
  ];
  const record={
    gameId:'block-blast',
    engine:'android',
    departments:['development','qa','design'],
    taskType:'coding',
    problem:'Reuse verified implementation knowledge from an authorized Block Blast source-derived learning pack.',
    goal:'Apply authorized source, asset, native-library and algorithm structure lessons as retrieval context without treating static analysis as runtime evidence.',
    change:`package=${valid.packageFingerprint}; domains=${valid.learningDomains.join(',')}`,
    outcome:'PASS',
    qa:['AUTHORIZED_SOURCE_PROVENANCE_PASS','STATIC_ANALYSIS_ONLY'],
    build:'AUTHORIZED_SOURCE_MEMORY',
    evidence,
    reusablePatterns:valid.reusablePatterns,
    avoidPatterns:[
      'do-not-treat-static-analysis-as-runtime-pass',
      'do-not-bypass-current-project-qa',
      'do-not-expand-authority-beyond-owner-authorized-scope'
    ],
    verified:true,
    createdAt:clean(valid.generatedAt)||null
  };
  return addVibeExperience(createVibeExperienceMemory(memory),record);
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(!arg.startsWith('--'))continue;
    const [k,v]=arg.slice(2).split('=',2);
    out[k]=v??argv[++i];
  }
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const summaryFile=args.summary||'company-learning/authorized-source/block-blast/authorized-learning-summary.json';
  const experienceFile=args.experience||'.vibe2/experience.json';
  if(!fs.existsSync(summaryFile)){
    console.log('VIBE2_AUTHORIZED_SOURCE_MEMORY=NO_SOURCE');
    return;
  }
  const summary=readJson(summaryFile);
  const memory=fs.existsSync(experienceFile)?readJson(experienceFile):{version:2,records:[]};
  const result=mergeAuthorizedSummary(memory,summary,{summaryPath:summaryFile});
  writeJson(experienceFile,result.memory);
  console.log('VIBE2_AUTHORIZED_SOURCE_MEMORY=PASS');
  console.log(`VIBE2_AUTHORIZED_SOURCE_MEMORY_ADDED=${result.added?'YES':'NO'}`);
  console.log(`VIBE2_AUTHORIZED_SOURCE_MEMORY_REASON=${result.reason||'ADDED'}`);
  console.log(`VIBE2_AUTHORIZED_SOURCE_MEMORY_RECORDS=${result.memory.records.length}`);
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)main();
