// 파일명: tools/vibe2-structural-repair-distillation.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_QA = Object.freeze({ independentQa: 'PASS', browserQa: 'PASS' });
const ALLOWED_SOURCE_TASKS = new Set(['bugfix', 'coding', 'unity']);
const REQUIRED_TEACHER_FIELDS = Object.freeze(['structuralRepair','rootCause','responsibilityBoundary','patchScope','whyNotSmallerPatch','regressionRisks','evidence']);
const FORBIDDEN_TEACHER_KEYS = new Set(['patch','code','replacement','finalCode','sourceCode']);

const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function collectJsonFiles(entry, output = []) { if (!entry || !fs.existsSync(entry)) return output; const stat = fs.statSync(entry); if (stat.isDirectory()) for (const name of fs.readdirSync(entry).sort()) collectJsonFiles(path.join(entry, name), output); else if (/\.json$/i.test(entry)) output.push(entry); return output; }
const sampleBody = (record) => record?.trainingSample && typeof record.trainingSample === 'object' ? record.trainingSample : record;
function normalizedQa(record) { const qa = record?.qa && typeof record.qa === 'object' ? record.qa : {}; return { independentQa: upper(qa.independentQa ?? qa.independent ?? record?.independentQa), browserQa: upper(qa.browserQa ?? qa.browser ?? record?.browserQa) }; }

export function isVerifiedStructuralSource(record) {
  if (!record || typeof record !== 'object') return false;
  const sample = sampleBody(record); const qa = normalizedQa(record);
  if (qa.independentQa !== REQUIRED_QA.independentQa || qa.browserQa !== REQUIRED_QA.browserQa) return false;
  if (!clean(sample?.instruction) || !clean(sample?.output)) return false;
  const sourceRevision = clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit); if (!sourceRevision) return false;
  const taskType = clean(sample?.taskType ?? record?.taskType).toLowerCase(); if (!ALLOWED_SOURCE_TASKS.has(taskType)) return false;
  const trace = record?.verification?.trace ?? record?.provenance?.verificationTrace ?? null;
  if (!trace || upper(trace.state) !== 'PASS' || upper(trace.ci) !== 'PASS' || upper(trace.independentQa) !== 'PASS' || upper(trace.runtime) !== 'PASS') return false;
  const traceRevision = clean(trace.sourceRevision ?? trace.sha); if (!traceRevision || traceRevision !== sourceRevision || trace.stale === true || trace.flaky === true) return false;
  const quality = record?.quality; if (!quality || typeof quality !== 'object') return false;
  if (![quality.codeQuality, quality.playImprovement, quality.ruleCompliance].every((value) => Number.isFinite(Number(value)))) return false;
  if (quality.noRegression !== true) return false;
  return true;
}

export function discoverStructuralCandidates(sampleDir, { maxCandidates = 24 } = {}) {
  const candidates = [];
  for (const file of collectJsonFiles(sampleDir)) {
    let record; try { record = readJson(file); } catch { continue; }
    if (!isVerifiedStructuralSource(record)) continue;
    const sample = sampleBody(record); const text = `${sample.instruction}\n${sample.input ?? ''}\n${sample.output}`;
    const structuralHints = (text.match(/중복|구조|책임|refactor|duplicate|wrapper|override|chain|회귀|regression|handler|listener|state|save|inventory|combat|system/gi) ?? []).length;
    candidates.push({ sourceFile: file.replaceAll('\\', '/'), candidateId: clean(record.candidateId ?? record?.provenance?.candidateId) || path.basename(file, '.json'), project: clean(record.project ?? record.gameId ?? record?.provenance?.gameId) || 'shared', taskType: clean(sample.taskType ?? record.taskType).toLowerCase(), sourceRevision: clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit), structuralHints, outputBytes: Buffer.byteLength(clean(sample.output), 'utf8') });
  }
  return candidates.sort((a,b) => b.structuralHints - a.structuralHints || b.outputBytes - a.outputBytes || a.candidateId.localeCompare(b.candidateId)).slice(0, Math.max(1, Number(maxCandidates) || 24));
}

export function buildTeacherPrompt(record) {
  if (!isVerifiedStructuralSource(record)) throw new Error('teacher 분석 입력은 완결 PASS 검증 샘플이어야 함');
  const sample = sampleBody(record);
  return ['너는 무료 로컬 코드 구조 분석 teacher다.','정답 코드를 생성하지 말고 이미 검증된 수정 사례에서 구조적 수리 판단만 추출하라.','절대 코드, diff, patch, replacement source를 출력하지 마라.','JSON 객체 하나만 출력하라.','필드: structuralRepair(boolean), rootCause(string), responsibilityBoundary(string), patchScope(string[]), whyNotSmallerPatch(string), regressionRisks(string[]), evidence(string[]).',`TASK_TYPE: ${clean(sample.taskType ?? record.taskType)}`,`PROJECT: ${clean(record.project ?? record.gameId ?? record?.provenance?.gameId) || 'shared'}`,`INSTRUCTION:\n${clean(sample.instruction)}`,`INPUT:\n${clean(sample.input)}`,`VERIFIED_RESULT_SUMMARY_AND_DIFF:\n${clean(sample.output)}`].join('\n\n');
}

function walkKeys(value, callback) { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) { for (const item of value) walkKeys(item, callback); return; } for (const [key, child] of Object.entries(value)) { callback(key, child); walkKeys(child, callback); } }
export function validateTeacherAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('teacher 응답은 JSON object여야 함');
  for (const field of REQUIRED_TEACHER_FIELDS) if (!(field in value)) throw new Error(`teacher 필드 누락: ${field}`);
  let forbidden = ''; walkKeys(value, (key) => { if (FORBIDDEN_TEACHER_KEYS.has(key)) forbidden = key; }); if (forbidden) throw new Error(`teacher가 금지된 코드 필드를 출력함: ${forbidden}`);
  if (value.structuralRepair !== true && value.structuralRepair !== false) throw new Error('structuralRepair는 boolean이어야 함');
  for (const field of ['rootCause','responsibilityBoundary','whyNotSmallerPatch']) if (!clean(value[field])) throw new Error(`teacher 텍스트 필드 비어 있음: ${field}`);
  for (const field of ['patchScope','regressionRisks','evidence']) if (!Array.isArray(value[field]) || value[field].length < 1 || value[field].some((item) => !clean(item))) throw new Error(`teacher 배열 필드 부적합: ${field}`);
  const serialized = JSON.stringify(value); if (/```|@@\s|^diff --git|\bfunction\s+\w+\s*\(|=>\s*\{|\bclass\s+\w+/m.test(serialized)) throw new Error('teacher 응답에 코드/patch 표현이 감지됨'); return value;
}

export function buildDistilledStructuralSample(record, teacherAnalysis, { teacherModel = 'local-free-teacher' } = {}) {
  if (!isVerifiedStructuralSource(record)) throw new Error('완결 PASS source sample 필요');
  const analysis = validateTeacherAnalysis(teacherAnalysis); if (analysis.structuralRepair !== true) return null;
  const sample = sampleBody(record); const sourceRevision = clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit);
  const teacherContext = { rootCause: analysis.rootCause, responsibilityBoundary: analysis.responsibilityBoundary, patchScope: analysis.patchScope, whyNotSmallerPatch: analysis.whyNotSmallerPatch, regressionRisks: analysis.regressionRisks, evidence: analysis.evidence };
  return { ...record, instruction: clean(sample.instruction), input: `${clean(sample.input)}\n\nSTRUCTURAL_REPAIR_TEACHER_ANALYSIS:\n${JSON.stringify(teacherContext, null, 2)}`.trim(), output: clean(sample.output), taskType: 'bugfix', specialization: 'structural-repair', difficulty: 'regression', lifecycle: 'active', sourceKind: 'vibe2', sourceRevision, sourceCommit: sourceRevision, teacherSupport: { role: 'ANALYSIS_ONLY', model: clean(teacherModel) || 'local-free-teacher', paidApi: false, codeAuthority: false, answerTarget: 'VERIFIED_FINAL_DIFF_ONLY', analysis: teacherContext }, provenance: { ...(record.provenance ?? {}), sourceKind: 'vibe2', sourceRevision, specialization: 'structural-repair', teacherRole: 'ANALYSIS_ONLY', teacherModel: clean(teacherModel) || 'local-free-teacher', paidApi: false } };
}

function parseArgs(argv) { const [command,...rest]=argv; const args={command}; for(let i=0;i<rest.length;i+=1){const arg=rest[i]; if(!arg.startsWith('--')) continue; const [key,inline]=arg.slice(2).split('=',2); args[key]=inline ?? rest[++i];} return args; }
function main() {
  const args=parseArgs(process.argv.slice(2));
  if(args.command==='discover'){const candidates=discoverStructuralCandidates(args['sample-dir']||'company-learning/training-samples',{maxCandidates:Number(args.max??24)}); const result={version:1,state:candidates.length?'CANDIDATES_AVAILABLE':'NO_CANDIDATES',candidates}; if(args.out)writeJson(args.out,result); console.log(JSON.stringify(result)); return;}
  if(args.command==='prompt'){if(!args.sample)throw new Error('--sample 필요'); const prompt=buildTeacherPrompt(readJson(args.sample)); if(args.out){fs.mkdirSync(path.dirname(args.out),{recursive:true});fs.writeFileSync(args.out,prompt);}else process.stdout.write(prompt); return;}
  if(args.command==='enrich'){if(!args.sample||!args.teacher||!args.out)throw new Error('--sample --teacher --out 필요'); const source=readJson(args.sample); const rawTeacher=readJson(args.teacher); const teacher=typeof rawTeacher.response==='string'?JSON.parse(rawTeacher.response):rawTeacher; const enriched=buildDistilledStructuralSample(source,teacher,{teacherModel:args['teacher-model']}); if(!enriched){console.log(JSON.stringify({state:'NOT_STRUCTURAL_REPAIR',output:null}));return;} writeJson(args.out,enriched); console.log(JSON.stringify({state:'STRUCTURAL_SAMPLE_WRITTEN',output:args.out,specialization:enriched.specialization,answerTarget:enriched.teacherSupport.answerTarget})); return;}
  throw new Error('command는 discover|prompt|enrich 중 하나여야 함');
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { try { main(); } catch (error) { console.error(error.message); process.exitCode=1; } }
