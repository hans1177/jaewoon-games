// 파일명: tools/vibe2-incremental-qa.mjs
// 역할: 후보 변경 파일만 먼저 빠르게 검증하고 content hash 기반 PASS 결과를 재사용한다.
// 원칙: impact-first 검사는 full regression을 대체하지 않는다. fan-in/승격 전 기존 전체 QA는 그대로 유지한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\','/').replace(/^\.\//,'');
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function readJson(file, fallback = {}) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8'); }
function list(value) { return clean(value).split(',').map(posix).filter(Boolean); }
function sha256(parts) { const h=crypto.createHash('sha256'); for(const part of parts)h.update(part); return h.digest('hex'); }
function assertInside(root, file) {
  const resolved = path.resolve(root, file);
  const base = path.resolve(root) + path.sep;
  if (!(resolved + path.sep).startsWith(base) && resolved !== path.resolve(root)) throw new Error(`QA path escaped root: ${file}`);
  return resolved;
}
function collectFiles({root, files, manifest}) {
  if (files.length) return files;
  if (manifest) {
    const data = readJson(manifest, {});
    if (Array.isArray(data.changedFiles)) return data.changedFiles.map(posix).filter(Boolean);
  }
  throw new Error('incremental QA changed files required');
}
function checkConflictMarkers(text, file) {
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) throw new Error(`merge conflict marker: ${file}`);
  if (text.includes('\u0000')) throw new Error(`NUL byte in text file: ${file}`);
}
function checkBalanced(text, open, close, file, label) {
  let depth = 0, quote = null, escape = false;
  for (let i=0;i<text.length;i+=1) {
    const ch=text[i];
    if (quote) {
      if (escape) escape=false;
      else if (ch==='\\') escape=true;
      else if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; continue; }
    if (ch===open) depth+=1;
    if (ch===close) depth-=1;
    if (depth<0) throw new Error(`${label} close before open: ${file}`);
  }
  if (depth!==0) throw new Error(`${label} unbalanced: ${file}`);
}
function deterministicCheck(root, relative) {
  const file = assertInside(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`changed file missing: ${relative}`);
  const bytes = fs.readFileSync(file);
  if (!bytes.length) throw new Error(`changed file empty: ${relative}`);
  const ext = path.extname(relative).toLowerCase();
  const text = bytes.toString('utf8');
  checkConflictMarkers(text, relative);
  const checks = ['exists','non-empty','conflict-marker-scan'];
  if (['.js','.mjs','.cjs'].includes(ext)) {
    execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
    checks.push('node-syntax');
  } else if (ext === '.json') {
    JSON.parse(text);
    checks.push('json-parse');
  } else if (['.cs','.cpp','.cc','.cxx','.h','.hpp','.gd'].includes(ext)) {
    checkBalanced(text,'{','}',relative,'brace');
    checks.push('brace-balance');
  } else if (['.html','.htm','.uxml'].includes(ext)) {
    if (!/[<>]/.test(text)) throw new Error(`markup looks invalid: ${relative}`);
    checks.push('markup-sanity');
  } else if (['.unity','.prefab','.asset'].includes(ext)) {
    if (!/^%YAML|^--- !u!/m.test(text)) throw new Error(`Unity YAML header missing: ${relative}`);
    checks.push('unity-yaml-sanity');
  }
  return { file:relative, checks };
}

export function runIncrementalQa({ root=process.cwd(), files=[], manifest='', cacheFile='', namespace='default', force=false }={}) {
  const started = Date.now();
  const changed = collectFiles({root, files, manifest});
  const payload = ['vibe2-incremental-qa-v2', namespace];
  for (const relative of [...changed].sort()) {
    const file = assertInside(root, relative);
    if (!fs.existsSync(file)) throw new Error(`changed file missing: ${relative}`);
    payload.push(relative, fs.readFileSync(file));
  }
  const contentHash = sha256(payload);
  const cachePath = clean(cacheFile);
  const cache = cachePath ? readJson(cachePath,{version:2,entries:{}}) : {version:2,entries:{}};
  const cached = cache.entries?.[contentHash];
  if (!force && cached?.outcome === 'PASS') {
    return { outcome:'PASS', cached:true, contentHash, changedFiles:changed, checks:cached.checks || [], durationMs:Date.now()-started, fullRegressionStillRequired:true };
  }

  execFileSync('git',['diff','--check'],{cwd:root,stdio:'pipe'});
  const checks = changed.map((relative)=>deterministicCheck(root,relative));
  const result = { outcome:'PASS', cached:false, contentHash, changedFiles:changed, checks, durationMs:Date.now()-started, fullRegressionStillRequired:true };
  if (cachePath) {
    cache.version=2; cache.entries=cache.entries||{};
    cache.entries[contentHash]={ outcome:'PASS', namespace, checks, savedAt:new Date().toISOString() };
    const entries=Object.entries(cache.entries).slice(-200);
    cache.entries=Object.fromEntries(entries);
    writeJson(cachePath,cache);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=parseArgs();
  const result=runIncrementalQa({
    root:clean(args.root)||process.cwd(), files:list(args.files), manifest:clean(args.manifest), cacheFile:clean(args.cache), namespace:clean(args.namespace)||'default', force:String(args.force||'').toLowerCase()==='true'
  });
  if (clean(args.output)) writeJson(clean(args.output),result);
  console.log('VIBE2_INCREMENTAL_QA=PASS');
  console.log(`VIBE2_INCREMENTAL_QA_CACHE=${result.cached?'HIT':'MISS'}`);
  console.log(`VIBE2_INCREMENTAL_QA_HASH=${result.contentHash}`);
  console.log(`VIBE2_INCREMENTAL_QA_FILES=${result.changedFiles.join(',')}`);
  console.log('VIBE2_FULL_REGRESSION_REQUIRED=YES');
}
