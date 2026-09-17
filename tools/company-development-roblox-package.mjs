import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hasVerifiedVibe2SourceHandoff,validateExistingRobloxSourceTree} from './company-development-roblox-source-reconcile.mjs';

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

function walkFiles(root){
  const files=[];
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const full=path.join(root,entry.name);
    if(entry.isDirectory())files.push(...walkFiles(full));
    else if(entry.isFile())files.push(full);
  }
  return files;
}

export function collectRobloxSourceScriptInventory(root){
  const inventory={Script:0,LocalScript:0,ModuleScript:0,total:0};
  for(const file of walkFiles(path.resolve(root))){
    const name=path.basename(file).toLowerCase();
    if(/\.server\.(?:lua|luau)$/.test(name))inventory.Script++;
    else if(/\.client\.(?:lua|luau)$/.test(name))inventory.LocalScript++;
    else if(/\.(?:lua|luau)$/.test(name))inventory.ModuleScript++;
  }
  inventory.total=inventory.Script+inventory.LocalScript+inventory.ModuleScript;
  return Object.freeze(inventory);
}

export function validateRobloxArtifactScriptInventory({artifactPath='',expected={}}={}){
  const artifact=path.resolve(clean(artifactPath));
  if(!fs.existsSync(artifact))throw new Error(`Roblox artifact missing: ${artifact}`);
  const xml=fs.readFileSync(artifact,'utf8');
  const actual={
    Script:(xml.match(/<Item\s+class="Script"(?:\s|>)/g)||[]).length,
    LocalScript:(xml.match(/<Item\s+class="LocalScript"(?:\s|>)/g)||[]).length,
    ModuleScript:(xml.match(/<Item\s+class="ModuleScript"(?:\s|>)/g)||[]).length,
  };
  actual.total=actual.Script+actual.LocalScript+actual.ModuleScript;
  const missing=[];
  for(const type of ['Script','LocalScript','ModuleScript']){
    const required=Number(expected?.[type]||0);
    if(actual[type]<required)missing.push(`${type}:${actual[type]}/${required}`);
  }
  if(missing.length)throw new Error(`Rojo artifact script inventory incomplete: ${missing.join(',')}`);
  return Object.freeze(actual);
}

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

export function resolvePackageSourceValidation({staticVerdict={},verifiedSourceTreeSha='',actualSourceTreeSha=''}={}){
  const blockers=Array.isArray(staticVerdict?.blockers)?[...staticVerdict.blockers]:[];
  const saveRequired=staticVerdict?.saveRequired===true;
  const expectedTree=clean(verifiedSourceTreeSha);
  if(!expectedTree){
    return Object.freeze({
      pass:staticVerdict?.pass===true,
      blockers:Object.freeze([...new Set(blockers)]),
      saveRequired,
      authority:'exact-source-static-validation',
    });
  }
  if(!SHA.test(expectedTree)){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze(['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_INVALID']),
      saveRequired,
      authority:'verified-vibe2-source-handoff',
    });
  }
  const actualTree=clean(actualSourceTreeSha);
  if(!SHA.test(actualTree)||actualTree!==expectedTree){
    return Object.freeze({
      pass:false,
      blockers:Object.freeze(['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH']),
      saveRequired,
      authority:'verified-vibe2-source-handoff',
    });
  }
  return Object.freeze({
    pass:true,
    blockers:Object.freeze([]),
    saveRequired,
    authority:'verified-vibe2-source-handoff',
  });
}

export function verifiedVibe2SourceTreeShaFromRuntime({repoRoot='.',runtimeRef='',gameId=''}={}){
  const ref=clean(runtimeRef);
  const id=clean(gameId);
  if(!ref||!id)return '';
  try{
    const text=execFileSync('git',['-C',path.resolve(repoRoot),'show',`${ref}:development-queue.json`],{encoding:'utf8',maxBuffer:16*1024*1024});
    const queue=JSON.parse(text.replace(/^\uFEFF/,''));
    const item=(queue.items||[]).find(row=>clean(row?.gameId)===id);
    if(!hasVerifiedVibe2SourceHandoff(item))return '';
    return clean(item.robloxVibe2VerifiedHandoff.sourceTreeSha);
  }catch{
    return '';
  }
}

export function packageRobloxSource({repoRoot='.',gameId='',sourcePath='',sourceRevision='',baseline={},rojoPath='',outputDir='',verifiedSourceTreeSha=''}={}){
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
    const staticVerdict=validateExistingRobloxSourceTree({root,baseline});
    const actualSourceTreeSha=clean(execFileSync('git',['-C',path.resolve(repoRoot),'rev-parse',`${revision}:${relativeSource}`],{stdio:'pipe',encoding:'utf8'}));
    const validation=resolvePackageSourceValidation({staticVerdict,verifiedSourceTreeSha,actualSourceTreeSha});
    if(!validation.pass)throw new Error(`exact-source validation failed: ${validation.blockers.join(',')}`);
    const expectedScripts=collectRobloxSourceScriptInventory(root);
    if(expectedScripts.total<=0)throw new Error('Roblox source contains no executable Luau scripts');
    const artifact=path.join(outDir,`${safeName(id)}.rbxlx`);
    execFileSync(rojo,['build','default.project.json','--output',artifact],{cwd:root,stdio:'pipe',encoding:'utf8',maxBuffer:16*1024*1024});
    const stat=fs.statSync(artifact);
    if(!stat.isFile()||stat.size<=0)throw new Error('Rojo package artifact missing or empty');
    const actualScripts=validateRobloxArtifactScriptInventory({artifactPath:artifact,expected:expectedScripts});
    const sha256=crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
    console.log(`ROBLOX_BUILD_SCRIPT_INVENTORY=PASS:${actualScripts.Script}/${actualScripts.LocalScript}/${actualScripts.ModuleScript}`);
    return createRobloxBuildEvidence({
      gameId:id,
      sourcePath:relativeSource,
      sourceRevision:revision,
      artifactPath:artifact,
      artifactSha256:sha256,
      sourceValidationPassed:true,
      saveRequired:validation.saveRequired,
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
  const repoRoot=arg('repo-root','.');
  const gameId=arg('game-id');
  const runtimeBranch=clean(process.env.COMPANY_RUNTIME_BRANCH);
  const runtimeRef=arg('runtime-ref',runtimeBranch?`origin/${runtimeBranch}`:'');
  const verifiedSourceTreeSha=verifiedVibe2SourceTreeShaFromRuntime({repoRoot,runtimeRef,gameId});
  const evidence=packageRobloxSource({
    repoRoot,
    gameId,
    sourcePath:arg('source-path'),
    sourceRevision:arg('source-revision'),
    baseline:readJson(baselineFile),
    rojoPath:arg('rojo'),
    outputDir:arg('output-dir'),
    verifiedSourceTreeSha,
  });
  fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
  fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`);
  console.log(`ROBLOX_BUILD_PACKAGE=PASS:${evidence.gameId}`);
  console.log(`ROBLOX_BUILD_ARTIFACT_IDENTITY=${evidence.artifactIdentity}`);
  console.log(`ROBLOX_BUILD_SOURCE_REVISION=${evidence.sourceRevision}`);
  console.log(`ROBLOX_BUILD_SOURCE_VALIDATION=${verifiedSourceTreeSha?'VERIFIED_VIBE2_HANDOFF':'EXACT_SOURCE_STATIC'}`);
  console.log('ROBLOX_BUILD_PREFLIGHT_PASS=NO');
  console.log('ROBLOX_RUNTIME_PASS=NO');
  console.log('ROBLOX_RELEASE_CLAIM=NO');
}

const isMain=process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url;
if(isMain){
  try{runCli();}catch(error){console.error(String(error?.stack||error));process.exitCode=1;}
}
