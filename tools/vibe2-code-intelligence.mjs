// 파일명: tools/vibe2-code-intelligence.mjs
// 역할: Vibe2 source worker의 스마트 컨텍스트, 변경 영향, 심볼 범위 패치, 실패 라우팅, 사전 검증을 담당한다.
// 원칙: 책임 파일 밖은 읽기 전용이며, 자동 수리는 기존 승인 범위와 게임 규칙을 넓히지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const MAX_SCAN_FILES = 240;
const MAX_CONTEXT_FILES = 12;
const MAX_READ_BYTES = 360000;
const IGNORED_DIRS = new Set(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.cache','dist','build']);
const TARGET_EXTENSIONS = Object.freeze({
  roblox:new Set(['.luau','.lua','.json']),
  web:new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']),
  unity:new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']),
  unreal:new Set(['.h','.hpp','.cpp','.cc','.cxx','.cs','.ini','.uproject','.uplugin','.json']),
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json'])
});
const CODE_EXTENSIONS = new Set(['.js','.mjs','.cjs','.cs','.h','.hpp','.cpp','.cc','.cxx','.lua','.luau','.gd']);

function safeRead(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > MAX_READ_BYTES) return '';
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function listSourceFiles(root, target, ignored = []) {
  const allowed = TARGET_EXTENSIONS[clean(target).toLowerCase()];
  if (!allowed) return [];
  const ignore = ignored.map(posix).filter(Boolean);
  const rows = [];
  const walk = (current) => {
    if (rows.length >= MAX_SCAN_FILES) return;
    for (const entry of fs.readdirSync(current, { withFileTypes:true }).sort((a,b)=>a.name.localeCompare(b.name))) {
      if (rows.length >= MAX_SCAN_FILES) return;
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      const relative = posix(path.relative(root, full));
      if (ignore.some((value) => relative === value || relative.startsWith(`${value}/`))) continue;
      if (entry.isDirectory()) walk(full);
      else if (allowed.has(path.extname(entry.name).toLowerCase())) rows.push({ full, relative });
    }
  };
  walk(root);
  return rows;
}

function goalTokens(goal = '') {
  const stop = new Set(['기존','수정','구현','게임','파일','보강','한다','에서','으로','the','and','with','from','this','that']);
  return unique(clean(goal).toLowerCase().split(/[^a-z0-9가-힣_]+/).filter((token) => token.length >= 3 && !stop.has(token))).slice(0, 24);
}

function basenameStem(file = '') {
  return path.basename(file, path.extname(file)).toLowerCase();
}

function referencedTokens(text = '') {
  const out = [];
  const patterns = [
    /(?:import|export)\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
    /(?:require|load|preload)\s*\(\s*["']([^"']+)["']\s*\)/g,
    /#include\s+["<]([^">]+)[">]/g,
    /require\s*\(\s*script(?:\.[A-Za-z_]\w*)*\.([A-Za-z_]\w*)\s*\)/g
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text))) out.push(clean(match[1]).toLowerCase());
  }
  return unique(out);
}

function declaredSymbols(text = '') {
  const names = [];
  const patterns = [
    /\b(?:class|struct|interface|enum)\s+([A-Za-z_]\w*)/g,
    /\bfunction\s+([A-Za-z_]\w*)\s*\(/g,
    /\bfunc\s+([A-Za-z_]\w*)\s*\(/g,
    /\b(?:public|private|protected|internal|static|virtual|override|async|inline|constexpr|const|final|sealed|partial|extern|unsafe|new|\s)*[A-Za-z_][\w<>,\[\].:*&?\s]*\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?\{/g,
    /\b(?:local\s+)?function\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text))) names.push(match[1]);
  }
  return unique(names).slice(0, 80);
}

function scoreContextRow(row, state) {
  const relativeLower = row.relative.toLowerCase();
  const stem = basenameStem(row.relative);
  const dir = posix(path.dirname(row.relative));
  const text = safeRead(row.full);
  const reasons = [];
  let score = 0;
  if (state.responsible.has(row.relative)) return { ...row, text, score:10000, reasons:['responsible-file'] };
  if (state.existing.has(row.relative)) { score += 650; reasons.push('existing-exploration-context'); }
  if (state.responsibleDirs.has(dir)) { score += 70; reasons.push('same-directory'); }
  for (const token of state.goalTokens) {
    if (relativeLower.includes(token)) { score += 12; reasons.push(`goal-path:${token}`); }
  }
  for (const ref of state.references) {
    const refStem = basenameStem(ref);
    if ((ref && relativeLower.includes(ref)) || (refStem && stem === refStem)) {
      score += 140; reasons.push(`direct-reference:${ref}`); break;
    }
  }
  for (const responsibleStem of state.responsibleStems) {
    if (responsibleStem && text.toLowerCase().includes(responsibleStem)) {
      score += 55; reasons.push(`references-responsible:${responsibleStem}`); break;
    }
  }
  for (const symbol of state.seedSymbols) {
    if (symbol.length >= 4 && new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(text)) {
      score += 35; reasons.push(`shared-symbol:${symbol}`); break;
    }
  }
  if (/(?:test|spec|qa|playmode|editmode)/i.test(row.relative)) {
    const related = state.responsibleStems.some((value) => value && relativeLower.includes(value));
    score += related ? 130 : 18;
    reasons.push(related ? 'matching-test' : 'test-candidate');
  }
  return { ...row, text, score, reasons:unique(reasons) };
}

function impactCategories(text = '') {
  const checks = [
    ['persistence', /save|load|serialize|json|playerprefs|localstorage|datastore|savegame|세이브|저장|로드/i],
    ['combat', /combat|damage|attack|weapon|enemy|health|\bhp\b|boss|전투|데미지|공격|무기|적|보스/i],
    ['economy', /gold|coin|currency|price|cost|shop|reward|loot|골드|코인|가격|상점|보상|전리품/i],
    ['progression', /level|\bxp\b|quest|unlock|progress|stage|레벨|경험치|퀘스트|해금|진행/i],
    ['ui-input', /input|button|touch|joystick|canvas|eventsystem|pointer|keyboard|mouse|버튼|터치|조이스틱|입력|ui/i],
    ['network', /fetch\s*\(|axios|websocket|http|remoteevent|remotefunction|rpc|network/i],
    ['performance', /update\s*\(|tick\s*\(|fixedupdate|lateupdate|instantiate|spawn|findobject|requestanimationframe|while\s*\(true\)/i]
  ];
  return checks.filter(([, re]) => re.test(text)).map(([name]) => name);
}

export function analyzeChangeImpact({ root='', responsibleFiles=[], contextFiles=[], goal='' } = {}) {
  const files = unique([...responsibleFiles, ...contextFiles]);
  const evidence = [];
  const categories = new Set(impactCategories(goal));
  for (const relative of files) {
    const text = safeRead(path.join(root, relative));
    for (const category of impactCategories(text)) {
      categories.add(category);
      evidence.push({ category, file:relative });
    }
  }
  const list = [...categories];
  const risk = list.some((value) => ['persistence','combat','economy'].includes(value)) && files.length >= 4
    ? 'high'
    : list.length >= 2 ? 'medium' : 'low';
  return Object.freeze({
    categories:Object.freeze(list),
    impactedFiles:Object.freeze(files.slice(0, 12)),
    evidence:Object.freeze(evidence.slice(0, 24)),
    risk,
    invented:false
  });
}

export function buildSmartCodeContext({ root='', target='', responsibleFiles=[], existingContextFiles=[], goal='', ignored=[] } = {}) {
  const responsible = unique(responsibleFiles.map(posix));
  const existing = unique(existingContextFiles.map(posix));
  const responsibleSet = new Set(responsible);
  const responsibleDirs = new Set(responsible.map((file)=>posix(path.dirname(file))).filter(Boolean));
  const responsibleStems = responsible.map(basenameStem).filter(Boolean);
  const seedText = responsible.map((file)=>safeRead(path.join(root,file))).join('\n');
  const state = {
    responsible:responsibleSet,
    existing:new Set(existing),
    responsibleDirs,
    responsibleStems,
    goalTokens:goalTokens(goal),
    references:referencedTokens(seedText),
    seedSymbols:declaredSymbols(seedText)
  };
  const scored = listSourceFiles(root,target,ignored)
    .map((row)=>scoreContextRow(row,state))
    .filter((row)=>row.score > 0 || responsibleSet.has(row.relative))
    .sort((a,b)=>b.score-a.score || a.relative.localeCompare(b.relative));
  const chosen = [];
  for (const file of responsible) if (!chosen.includes(file) && fs.existsSync(path.join(root,file))) chosen.push(file);
  for (const row of scored) {
    if (chosen.length >= MAX_CONTEXT_FILES) break;
    if (!chosen.includes(row.relative)) chosen.push(row.relative);
  }
  for (const file of existing) {
    if (chosen.length >= MAX_CONTEXT_FILES) break;
    if (!chosen.includes(file) && fs.existsSync(path.join(root,file))) chosen.push(file);
  }
  const reasons = Object.fromEntries(chosen.map((file)=>{
    const row = scored.find((item)=>item.relative===file);
    return [file, row?.reasons || (responsibleSet.has(file)?['responsible-file']:['exploration-fallback'])];
  }));
  const changeImpact = analyzeChangeImpact({root,responsibleFiles:responsible,contextFiles:chosen,goal});
  return Object.freeze({
    version:1,
    strategy:'dependency-symbol-test-ranked',
    files:Object.freeze(chosen),
    reasons:Object.freeze(reasons),
    references:Object.freeze(state.references),
    seedSymbols:Object.freeze(state.seedSymbols),
    changeImpact,
    readOnlyOutsideResponsible:true
  });
}

function lineStarts(text) {
  const starts = [0];
  for (let index=0; index<text.length; index+=1) if (text[index] === '\n') starts.push(index+1);
  return starts;
}

function lineIndexForOffset(starts, offset) {
  let low=0, high=starts.length-1;
  while (low<=high) {
    const mid=(low+high)>>1;
    if (starts[mid] <= offset) low=mid+1; else high=mid-1;
  }
  return Math.max(0, high);
}

function declarationAtLine(line = '') {
  const patterns = [
    /\bfunction\s+([A-Za-z_]\w*)\s*\(/,
    /\bfunc\s+([A-Za-z_]\w*)\s*\(/,
    /\b(?:local\s+)?function\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\(/,
    /\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /\b(?:public|private|protected|internal|static|virtual|override|async|inline|constexpr|const|final|sealed|partial|extern|unsafe|new|\s)*[A-Za-z_][\w<>,\[\].:*&?\s]*\s+([A-Za-z_]\w*(?:::\w+)?)\s*\([^;{}]*\)\s*(?:const\s*)?\{/
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function braceScope(text, declarationOffset) {
  const open = text.indexOf('{', declarationOffset);
  if (open < 0) return null;
  let depth=0, quote=null, escape=false;
  for (let i=open;i<text.length;i+=1) {
    const ch=text[i];
    if (quote) {
      if (escape) escape=false;
      else if (ch==='\\') escape=true;
      else if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; continue; }
    if (ch==='{') depth+=1;
    else if (ch==='}' && --depth===0) return { start:declarationOffset, end:i+1 };
  }
  return null;
}

function indentationScope(text, starts, declarationLine) {
  const lines = text.split(/\r?\n/);
  const line = lines[declarationLine] || '';
  const indent = (line.match(/^\s*/) || [''])[0].length;
  let endLine = lines.length;
  for (let i=declarationLine+1;i<lines.length;i+=1) {
    if (!lines[i].trim()) continue;
    const currentIndent=(lines[i].match(/^\s*/)||[''])[0].length;
    if (currentIndent <= indent && /\b(?:func|function)\b/.test(lines[i])) { endLine=i; break; }
    if (currentIndent < indent) { endLine=i; break; }
  }
  return { start:starts[declarationLine], end:endLine<starts.length?starts[endLine]:text.length };
}

export function inferEditSymbol({ text='', find='', symbol='' } = {}) {
  const first = text.indexOf(find);
  if (first < 0 || text.indexOf(find, first + Math.max(1, find.length)) >= 0) return null;
  const starts = lineStarts(text);
  const findLine = lineIndexForOffset(starts, first);
  const lines = text.split(/\r?\n/);
  const wanted = clean(symbol);
  for (let lineIndex=findLine; lineIndex>=0; lineIndex-=1) {
    const name = declarationAtLine(lines[lineIndex]);
    if (!name) continue;
    if (wanted && name !== wanted && !name.endsWith(`::${wanted}`)) continue;
    const declarationOffset = starts[lineIndex];
    const brace = braceScope(text, declarationOffset);
    const scope = brace || indentationScope(text, starts, lineIndex);
    if (scope && first >= scope.start && first + find.length <= scope.end) {
      return Object.freeze({ name, start:scope.start, end:scope.end, line:lineIndex+1 });
    }
  }
  return null;
}

export function assertSymbolScopedEdit({ text='', edit={}, file='' } = {}) {
  const ext = path.extname(file || edit.path || '').toLowerCase();
  const requested = clean(edit.symbol);
  if (!CODE_EXTENSIONS.has(ext)) return Object.freeze({ symbol:null, enforced:false, reason:'non-code-file' });
  const inferred = inferEditSymbol({text,find:String(edit.find??''),symbol:requested});
  if (requested && !inferred) throw new Error(`SYMBOL_SCOPE_MISMATCH:${file || edit.path}:${requested}`);
  if (!inferred) return Object.freeze({ symbol:null, enforced:false, reason:'top-level-or-unresolved' });
  return Object.freeze({ symbol:inferred.name, enforced:true, line:inferred.line });
}

function syntaxFailure(prefix, file, error) {
  const detail = clean(error?.stderr || error?.message || error);
  throw new Error(`${prefix}:${file}${detail?`:${detail.slice(0,600)}`:''}`);
}

function runNodeSyntax(text, inputType) {
  execFileSync(process.execPath,[`--input-type=${inputType}`,'--check'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']});
}

function checkBalanced(text, open, close, file) {
  let depth=0, quote=null, escape=false;
  for (const ch of text) {
    if (quote) {
      if (escape) escape=false;
      else if (ch==='\\') escape=true;
      else if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; continue; }
    if (ch===open) depth+=1;
    else if (ch===close) depth-=1;
    if (depth<0) throw new Error(`STRUCTURE_INVALID:${file}:${close}-before-${open}`);
  }
  if (depth!==0) throw new Error(`STRUCTURE_INVALID:${file}:unbalanced-${open}${close}`);
}

function validateText(file, text) {
  if (!text.trim()) throw new Error(`OUTPUT_EMPTY:${file}`);
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(text)) throw new Error(`CONFLICT_MARKER:${file}`);
  const ext=path.extname(file).toLowerCase();
  if (['.js','.mjs','.cjs'].includes(ext)) {
    if (ext === '.mjs') {
      try { runNodeSyntax(text,'module'); } catch (error) { syntaxFailure('SYNTAX_INVALID',file,error); }
    } else if (ext === '.cjs') {
      try { runNodeSyntax(text,'commonjs'); } catch (error) { syntaxFailure('SYNTAX_INVALID',file,error); }
    } else {
      try { runNodeSyntax(text,'module'); }
      catch (moduleError) {
        try { runNodeSyntax(text,'commonjs'); }
        catch { syntaxFailure('SYNTAX_INVALID',file,moduleError); }
      }
    }
  } else if (ext === '.json') {
    try { JSON.parse(text); } catch (error) { syntaxFailure('DATA_SCHEMA_INVALID',file,error); }
  } else if (['.cs','.h','.hpp','.cpp','.cc','.cxx'].includes(ext)) {
    checkBalanced(text,'{','}',file);
  } else if (['.html','.htm','.uxml'].includes(ext) && !/[<>]/.test(text)) {
    throw new Error(`MARKUP_INVALID:${file}`);
  }
}

export function validateCandidatePreview({ sourceRoot='', candidate={} } = {}) {
  const checks=[];
  const symbols=[];
  const touched=new Set();
  for (const edit of candidate.edits || []) {
    if (touched.has(edit.path)) throw new Error(`DUPLICATE_EDIT_PATH:${edit.path}`);
    touched.add(edit.path);
    const file=path.join(sourceRoot,edit.path);
    if (!fs.existsSync(file)) throw new Error(`EDIT_SOURCE_MISSING:${edit.path}`);
    const before=fs.readFileSync(file,'utf8');
    const first=before.indexOf(edit.find);
    if (first<0 || before.indexOf(edit.find,first+Math.max(1,edit.find.length))>=0) throw new Error(`EDIT_FIND_NOT_UNIQUE:${edit.path}`);
    const symbol=assertSymbolScopedEdit({text:before,edit,file:edit.path});
    symbols.push({path:edit.path,symbol:symbol.symbol,enforced:symbol.enforced,line:symbol.line||null});
    const after=before.slice(0,first)+edit.replace+before.slice(first+edit.find.length);
    validateText(edit.path,after);
    checks.push({path:edit.path,checks:['unique-find','preview-syntax',symbol.enforced?'symbol-scope':'top-level-scope']});
  }
  for (const file of candidate.newFiles || []) {
    if (touched.has(file.path)) throw new Error(`DUPLICATE_EDIT_PATH:${file.path}`);
    touched.add(file.path);
    if (fs.existsSync(path.join(sourceRoot,file.path))) throw new Error(`NEW_FILE_ALREADY_EXISTS:${file.path}`);
    validateText(file.path,file.content);
    checks.push({path:file.path,checks:['new-file','preview-syntax']});
  }
  for (const file of candidate.replaceFiles || []) {
    if (touched.has(file.path)) throw new Error(`DUPLICATE_EDIT_PATH:${file.path}`);
    touched.add(file.path);
    if (!fs.existsSync(path.join(sourceRoot,file.path))) throw new Error(`REPLACE_SOURCE_MISSING:${file.path}`);
    validateText(file.path,file.content);
    checks.push({path:file.path,checks:['full-replace','preview-syntax']});
  }
  return Object.freeze({ valid:true, checks:Object.freeze(checks), symbols:Object.freeze(symbols) });
}

export function classifyVibe2Failure({ error='', goal='', target='' } = {}) {
  const message = clean(error?.message || error).toLowerCase();
  const scope = `${message}\n${clean(goal).toLowerCase()}\n${clean(target).toLowerCase()}`;
  let route='GENERAL_LOGIC_REPAIR';
  if (/syntax_invalid|syntaxerror|파싱|parse error|unexpected token/.test(message)) route='SYNTAX_REPAIR';
  else if (/symbol_scope|symbol.*mismatch|심볼/.test(message)) route='SYMBOL_SCOPE_REPAIR';
  else if (/범위 밖|scope|path escaped|책임 파일|허용되지 않은|binary|바이너리/.test(message)) route='PATH_SCOPE_REPAIR';
  else if (/json 시작|json 파싱|전체 파일 응답|output|envelope|종료 마커|response/.test(message)) route='OUTPUT_FORMAT_REPAIR';
  else if (/save|load|playerprefs|localstorage|datastore|savegame|세이브|저장|로드/.test(scope)) route='PERSISTENCE_REPAIR';
  else if (/combat|damage|attack|weapon|enemy|boss|전투|데미지|공격|무기|보스/.test(scope)) route='COMBAT_REPAIR';
  else if (/input|touch|joystick|button|canvas|ui|입력|터치|조이스틱|버튼/.test(scope)) route='UI_INPUT_REPAIR';
  else if (/build|compile|compiler|linker|unity|unreal|roblox|godot|빌드|컴파일/.test(scope)) route='ENGINE_BUILD_REPAIR';
  else if (/schema|json|data|데이터/.test(scope)) route='DATA_SCHEMA_REPAIR';
  const strategies = {
    SYNTAX_REPAIR:'문법 오류가 난 최소 코드 블록만 수정하고 기존 동작/수치는 건드리지 않는다.',
    SYMBOL_SCOPE_REPAIR:'지정된 함수/메서드/클래스 심볼 내부에서만 수정하고 다른 심볼로 변경 범위를 넓히지 않는다.',
    PATH_SCOPE_REPAIR:'Allowed edit paths 밖 수정 제안을 제거하고 책임 파일 안에서만 해결한다.',
    OUTPUT_FORMAT_REPAIR:'요청된 JSON/envelope 형식을 정확히 지키고 설명문이나 markdown을 섞지 않는다.',
    PERSISTENCE_REPAIR:'SaveKey, 스키마 의미, 기존 소유/진행 의미를 보존하면서 null/호환성 문제만 최소 수정한다.',
    COMBAT_REPAIR:'전투 수치와 보상 규칙을 임의 조정하지 말고 코드 결함만 최소 수정한다.',
    UI_INPUT_REPAIR:'기존 게임 상태 로직을 바꾸지 말고 입력 전달/레이아웃/이벤트 연결만 최소 수정한다.',
    ENGINE_BUILD_REPAIR:'엔진 API/타입/컴파일 경계를 우선 확인하고 게임 규칙 변경으로 빌드 오류를 우회하지 않는다.',
    DATA_SCHEMA_REPAIR:'기존 데이터 필드 의미와 호환성을 보존하고 파싱/스키마 결함만 수정한다.',
    GENERAL_LOGIC_REPAIR:'실패 원인과 직접 관련된 최소 변경만 수행하고 책임 범위를 확대하지 않는다.'
  };
  return Object.freeze({route,strategy:strategies[route],message:clean(error?.message || error).slice(0,1200)});
}

export function repairGuidance(failure={}, attempt=1, maxAttempts=3) {
  return [
    `[VIBE2 REPAIR LOOP ${attempt}/${maxAttempts}]`,
    `Failure route: ${failure.route || 'GENERAL_LOGIC_REPAIR'}`,
    `Validation error: ${failure.message || 'unknown'}`,
    `Repair strategy: ${failure.strategy || '최소 수정'}`,
    '이전 실패를 고치기 위한 최소 수정만 반환한다. 책임 파일, 보호 규칙, 저장 의미, 게임 수치 권한을 확대하지 않는다.'
  ].join('\n');
}
