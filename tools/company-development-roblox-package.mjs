import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateExistingRobloxSourceTree} from './company-development-roblox-source-reconcile.mjs';

const SHA=/^[0-9a-f]{40}$/i;
const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const safeName=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);

export const ROBLOX_PACKAGE_TOOL=Object.freeze({
  rojoVersion:'7.7.0',
  linuxX64Asset:'rojo-7.7.0-linux-x86_64.zip',
  linuxX64AssetSha256:'22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073',
});

export function createRobloxBuildEvidence({gameId='',sourcePath='',sourceRevision='',artifactPath='',artifactSha256='',sourceValidationPassed=false,saveRequired=false}={}){
  const identity=clean(artifactSha256)?`sha256:${clean(artifactSha256)}`:null;
  return Object.freeze({
    version:1,
    platform:'ROBLOX',
    gameId:clean(gameId),
    sourcePath:clean(sourcePath),
    sourceRevision:clean(sourceRevision),
    buildOrPackagePassed:Boolean(identity)&&sourceValidationPassed===true,
    artifactIdentity:identity,
    artifactPath:clean(artifactPath)||null,
    luauOrSourceValidationPassed:sourceValidationPassed===true,
    saveRequired:saveRequired===true,
    rojoVersion:ROBLOX_PACKAGE_TOOL.rojoVersion,
    rojoAssetSha256:ROBLOX_PACKAGE_TOOL.linuxX64AssetSha256,
    buildPreflightPassed:false,
    runtimePassed:false,
    independentQaPassed:false,
    regressionPassed:false,
    finalReviewPassed:false,
    lastSuccessfulStage:Boolean(identity)&&sourceValidationPassed===true?'TARGET_PLATFORM_BUILD_OR_PACKAGE':'TARGET_PLATFORM_SOURCE_BIND',
    failureStage:'FIVE_DISTINCT_LEAD_BUILD_PREFLIGHT',
    failureSignature:'ROBLOX_BUILD_PREFLIGHT_PENDING',
    releaseClaim:false,
    authority:'roblox-build-package-evidence',
  });
}

export function packageRobloxSource({repoRoot='.',gameId='',sourcePath='',sourceRevision='',baseline={},rojoPath='',outputDir=''}={}){
  const id=clean(gameId);
  const relativeSource=clean(sourcePath).replaceAll('\\','/');
  const revision=clean(sourceRevision);
  const rojo=path.resolve(clean(rojoPath));
  const outDir=path.resolve(clean(outputDir));
  if(!id)throw new Error('gameId required');
  if(relativeSource!==`roblox-games/${id}`)throw new Error(`source path mismatch: ${relativeSource}`);
  if(!SHA.test(revision))throw new Error(`exact 40-char source revision required: ${revision}`);
  if(!fs.existsSync(rojo))throw new Error(`Rojo executable missing: ${rojo}`);
  fs.mkdirSync(outDir,{recursive:true});

  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-roblox-package-'));
  const worktree=path.join(tempRoot,'source');
  try{
    execFileSync('git',['-C',path.resolve(repoRoot),'worktree','add','--detach',worktree,revision],{stdio:'pipe',encoding:'utf8'});
    const root=path.join(worktree,relativeSource);
    const verdict=validateExistingRobloxSourceTree({root,baseline});
    if(!verdict.pass)throw new Error(`exact-source static validation failed: ${verdict.blockers.join(',')}`);
    const artifact=path.join(outDir,`${safeName(id)}.rbxlx`);
    execFileSync(rojo,['build','default.project.json','--output',artifact],{cwd:root,stdio:'pipe',encoding:'utf8',maxBuffer:16*1024*1024});
    const stat=fs.statSync(artifact);
    if(!stat.isFile()||stat.size<=0)throw new Error('Rojo package artifact missing or empty');
    const sha256=crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
    return createRobloxBuildEvidence({
      gameId:id,
      sourcePath:relativeSource,
      sourceRevision:revision,
      artifactPath:artifact,
      artifactSha256:sha256,
      sourceValidationPassed:true,
      saveRequired:verdict.saveRequired,
    });
  }finally{
    try{execFileSync('git',['-C',path.resolve(repoRoot),'worktree','remove','--force',worktree],{stdio:'ignore'});}catch{}
    fs.rmSync(tempRoot,{recursive:true,force:true});
  }
}

function runCli(){
  const baselineFile=arg('baseline');
  const evidenceFile=arg('evidence');
  if(!baselineFile||!evidenceFile)throw new Error('required: --baseline and --evidence');
  const evidence=packageRobloxSource({
    repoRoot:arg('repo-root','.'),
    gameId:arg('game-id'),
    sourcePath:arg('source-path'),
    sourceRevision:arg('source-revision'),
    baseline:readJson(baselineFile),
    rojoPath:arg('rojo'),
    outputDir:arg('output-dir'),
  });
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PACKAGE=PASS:${evidence.gameId}`);
  console.log(`ROBLOX_BUILD_ARTIFACT_IDENTITY=${evidence.artifactIdentity}`);
  console.log(`ROBLOX_BUILD_SOURCE_REVISION=${evidence.sourceRevision}`);
  console.log('ROBLOX_BUILD_PREFLIGHT_PASS=NO');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{runCli();}catch(error){console.error(String(error?.stack||error));process.exitCode=1;}
}
