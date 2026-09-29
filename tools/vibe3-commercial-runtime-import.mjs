import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(!arg.startsWith('--'))continue;
    const [key,inline]=arg.slice(2).split('=',2);
    out[key]=inline??argv[++i];
  }
  return out;
}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function safeId(value){return clean(value).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}

export function validateCommercialRuntimeSample(record={}){
  const p=record.provenance||{},qa=record.qa||{};
  const project=clean(record.project);
  if(record.sourceKind!=='commercial-runtime-reference')throw new Error('COMMERCIAL_RUNTIME_SOURCE_KIND_INVALID');
  if(record.authority!=='PRACTICE_ONLY'||record.practiceOnly!==true||record.runtimePromotionAllowed!==false)throw new Error('COMMERCIAL_RUNTIME_AUTHORITY_INVALID');
  if(!project.startsWith('external-commercial-'))throw new Error('COMMERCIAL_RUNTIME_PROJECT_INVALID');
  if(upper(p.observationKind)!=='BLACK_BOX_RUNTIME_ONLY')throw new Error('COMMERCIAL_RUNTIME_OBSERVATION_KIND_INVALID');
  if(p.codeExtracted!==false||p.binaryRedistributed!==false)throw new Error('COMMERCIAL_RUNTIME_EXTRACTION_BOUNDARY_INVALID');
  if(upper(qa.runtime)!=='PASS'||upper(qa.teacherReview)!=='PASS')throw new Error('COMMERCIAL_RUNTIME_RUNTIME_GATE_FAILED');
  if(upper(qa.independentQa)!=='NOT_APPLICABLE'||upper(qa.browserQa)!=='NOT_APPLICABLE')throw new Error('COMMERCIAL_RUNTIME_QA_BOUNDARY_INVALID');
  if(!clean(record.sourceRevision))throw new Error('COMMERCIAL_RUNTIME_REVISION_MISSING');
  if(!clean(record.instruction)||!clean(record.output)||!clean(record.topic))throw new Error('COMMERCIAL_RUNTIME_CONTENT_INCOMPLETE');
  if(!Array.isArray(record.tags)||record.tags.length<1)throw new Error('COMMERCIAL_RUNTIME_TAGS_MISSING');
  return record;
}

export function importCommercialRuntimeSamples({inputDir,outputDir}={}){
  if(!inputDir||!outputDir)throw new Error('inputDir and outputDir required');
  fs.mkdirSync(outputDir,{recursive:true});
  const result={examined:0,written:[],replaced:[],skipped:[]};
  if(!fs.existsSync(inputDir))return result;
  const files=fs.readdirSync(inputDir).filter(name=>/^commercial-runtime-.*\.json$/i.test(name)).sort();
  for(const name of files){
    result.examined+=1;
    const source=path.join(inputDir,name);
    try{
      const record=validateCommercialRuntimeSample(readJson(source));
      const gameId=safeId(clean(record.project).replace(/^external-commercial-/,''));
      const target=path.join(outputDir,'commercial-runtime-'+gameId+'.json');
      const existed=fs.existsSync(target);
      writeJson(target,record);
      (existed?result.replaced:result.written).push({gameId,target,sourceRevision:record.sourceRevision});
    }catch(error){
      result.skipped.push({file:name,reason:String(error?.message||error)});
    }
  }
  return result;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  if(!args.in||!args.out)throw new Error('usage: --in <artifact-dir> --out <training-sample-dir>');
  const result=importCommercialRuntimeSamples({inputDir:args.in,outputDir:args.out});
  console.log(JSON.stringify({version:1,state:'PASS',...result}));
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
