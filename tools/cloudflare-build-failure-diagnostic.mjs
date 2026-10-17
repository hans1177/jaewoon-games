// Cloudflare failure diagnostics are advisory and can never promote a release.
// Run with --input=/path/to/check-runs.json [--output=/path/to/report.json] [--sha=...].
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const CHECKS={pages:'Cloudflare Pages',multiplayer:'Workers Builds: jaewoon-multiplayer'};
const QUOTA_HINTS=[
  /\b(?:quota|build minutes?|build limit|usage limit|billing|subscription|payment|credits?)\b.{0,120}\b(?:exceeded|exhausted|reached|depleted|insufficient|required|upgrade|blocked|limit)\b/i,
  /\b(?:exceeded|exhausted|reached|depleted|insufficient|upgrade|out of|requires?)\b.{0,120}\b(?:quota|build minutes?|build limit|usage limit|billing|subscription|payment|credits?)\b/i,
  /\b402\s+payment\s+required\b/i
];
const safe=value=>String(value??'').slice(0,12000);
export function classifyCloudflareCheck(check){
  if(!check)return {state:'CHECK_MISSING',quotaProven:false,evidence:'CHECK_NOT_FOUND'};
  if(check.status!=='completed')return {state:'BUILD_PENDING',quotaProven:false,evidence:'GITHUB_CHECK_STATUS_ONLY'};
  if(check.conclusion==='success')return {state:'BUILD_CHECK_PASSED',quotaProven:false,evidence:'GITHUB_CHECK_STATUS_ONLY'};
  if(['skipped','neutral'].includes(check.conclusion))return {state:'BUILD_NOT_RUN',quotaProven:false,evidence:'GITHUB_CHECK_STATUS_ONLY'};
  const message=[check.output?.title,check.output?.summary,check.output?.text].map(safe).join('\n');
  if(check.conclusion==='failure'&&QUOTA_HINTS.some(regex=>regex.test(message)))
    return {state:'EXTERNAL_BUILD_QUOTA_BLOCKED',quotaProven:true,evidence:'EXPLICIT_CHECK_ERROR_MESSAGE'};
  if(check.conclusion==='failure')return {state:'BUILD_FAILED_UNCLASSIFIED',quotaProven:false,evidence:'NO_QUOTA_PROOF'};
  return {state:'BUILD_UNVERIFIED',quotaProven:false,evidence:'GITHUB_CHECK_STATUS_ONLY'};
}
export function auditCloudflareChecks(source,sourceSha=''){
  const rows=Array.isArray(source)?source:source?.check_runs||[];
  if(!Array.isArray(rows))throw new Error('CHECK_RUNS_ARRAY_REQUIRED');
  const projects=Object.fromEntries(Object.entries(CHECKS).map(([id,name])=>{
    const matches=rows.filter(row=>row?.name===name);
    const record=matches.find(row=>row.status==='completed')||matches[0]||null;
    return [id,{check:name,...classifyCloudflareCheck(record),checkUrl:safe(record?.details_url)||null}];
  }));
  const statuses=Object.values(projects).map(row=>row.state);
  return {
    version:1,sha:safe(sourceSha)||null,source:'GITHUB_CHECK_RUN_OUTPUT',
    quotaConfirmed:statuses.includes('EXTERNAL_BUILD_QUOTA_BLOCKED'),
    result:statuses.some(x=>['BUILD_FAILED_UNCLASSIFIED','EXTERNAL_BUILD_QUOTA_BLOCKED'].includes(x))
      ?'EXTERNAL_BUILD_FAILED'
      :statuses.every(x=>x==='BUILD_CHECK_PASSED')
        ?'CHECKS_GREEN_RELEASE_QA_STILL_REQUIRED'
        :'CHECKS_MISSING_PENDING_OR_SKIPPED',
    gameDeploymentVerified:false,releaseQaBypassed:false,projects
  };
}
export function cli(argv=process.argv.slice(2)){
  const args=Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
    const index=x.indexOf('=');return [x.slice(2,index),x.slice(index+1)];
  }));
  if(!args.input)throw new Error('CHECK_RUNS_INPUT_REQUIRED');
  const report=auditCloudflareChecks(JSON.parse(fs.readFileSync(args.input,'utf8')),args.sha);
  if(args.output){fs.mkdirSync(path.dirname(args.output),{recursive:true});fs.writeFileSync(args.output,JSON.stringify(report,null,2)+'\n');}
  console.log('CLOUDFLARE_BUILD_DIAGNOSTIC='+report.result);
  console.log('CLOUDFLARE_QUOTA_CONFIRMED='+(report.quotaConfirmed?'YES':'NO'));
  console.log('GAME_DEPLOYMENT_VERIFIED=NO');
  for(const [id,project] of Object.entries(report.projects))console.log(id.toUpperCase()+'_BUILD='+project.state);
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)cli();
