import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const lower = (value) => clean(value).toLowerCase();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    args[key] = inline ?? argv[++i];
  }
  return args;
}

export function loadInvalidationPolicy(filePath = 'company-learning/invalidated-learning-sources.json') {
  if (!fs.existsSync(filePath)) return { version: 1, entries: [] };
  const policy = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(policy.entries)) throw new Error('learning invalidation policy entries must be an array');
  return policy;
}

export function recordIdentity(record = {}) {
  const sample = record?.trainingSample && typeof record.trainingSample === 'object' ? record.trainingSample : {};
  const provenance = record?.provenance && typeof record.provenance === 'object' ? record.provenance : {};
  return {
    gameId: clean(record.gameId || record.project || provenance.gameId || sample.gameId || sample.project),
    sourceRevision: clean(
      provenance.sourceRevision || record.sourceRevision || record.sourceCommit || record.candidateCommit ||
      sample.sourceRevision || sample.sourceCommit || sample.candidateCommit
    ),
    timestamp: clean(
      record.verifiedAt || record.recordedAt || record.createdAt || record.updatedAt || record.generatedAt ||
      provenance.verifiedAt || provenance.recordedAt || sample.verifiedAt || sample.recordedAt || sample.createdAt
    ),
  };
}

function timestampAtOrBefore(value, boundary) {
  const actual = Date.parse(value);
  const limit = Date.parse(boundary);
  return Number.isFinite(actual) && Number.isFinite(limit) && actual <= limit;
}

export function invalidationMatch(record, policy) {
  const identity = recordIdentity(record);
  if (!identity.gameId) return null;
  const entry = (policy?.entries || []).find((row) => lower(row?.gameId) === lower(identity.gameId));
  if (!entry) return null;
  const revisions = new Set((entry.sourceRevisions || []).map(clean).filter(Boolean));
  if (identity.sourceRevision && revisions.has(identity.sourceRevision)) {
    return { gameId: identity.gameId, reason: entry.reason || 'invalidated-source-revision', match: 'SOURCE_REVISION', sourceRevision: identity.sourceRevision };
  }
  const invalidBefore = clean(entry.invalidBefore || policy.defaultInvalidBefore);
  if (identity.timestamp && invalidBefore && timestampAtOrBefore(identity.timestamp, invalidBefore)) {
    return { gameId: identity.gameId, reason: entry.reason || 'invalidated-legacy-timestamp', match: 'LEGACY_TIMESTAMP', sourceRevision: identity.sourceRevision || null };
  }
  if (!identity.timestamp && entry.invalidateIfTimestampMissing === true) {
    return { gameId: identity.gameId, reason: entry.reason || 'invalidated-missing-timestamp', match: 'MISSING_TIMESTAMP', sourceRevision: identity.sourceRevision || null };
  }
  return null;
}

function filterRows(rows, policy, stats) {
  const kept = [];
  for (const row of rows) {
    const match = invalidationMatch(row, policy);
    if (match) {
      stats.invalidated += 1;
      stats.byGame[match.gameId] = (stats.byGame[match.gameId] || 0) + 1;
      stats.matches[match.match] = (stats.matches[match.match] || 0) + 1;
      continue;
    }
    kept.push(row);
  }
  return kept;
}

function sanitizeJsonValue(value, policy, stats) {
  if (Array.isArray(value)) return filterRows(value, policy, stats);
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value.samples)) return { ...value, samples: filterRows(value.samples, policy, stats) };
  if (Array.isArray(value.items)) return { ...value, items: filterRows(value.items, policy, stats) };
  const match = invalidationMatch(value, policy);
  if (match) {
    stats.invalidated += 1;
    stats.byGame[match.gameId] = (stats.byGame[match.gameId] || 0) + 1;
    stats.matches[match.match] = (stats.matches[match.match] || 0) + 1;
    return [];
  }
  return value;
}

export function sanitizeDirectory(dir, policy, stats) {
  if (!dir || !fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).sort()) {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      sanitizeDirectory(filePath, policy, stats);
      continue;
    }
    if (!/\.jsonl?$/.test(name)) continue;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) continue;
    if (name.endsWith('.jsonl')) {
      const rows = raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      const kept = filterRows(rows, policy, stats);
      fs.writeFileSync(filePath, kept.map((row) => JSON.stringify(row)).join('\n') + (kept.length ? '\n' : ''));
      stats.files += 1;
      continue;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeJsonValue(parsed, policy, stats);
    fs.writeFileSync(filePath, `${JSON.stringify(sanitized, null, 2)}\n`);
    stats.files += 1;
  }
}

export function sanitizeDnaStore(filePath, policy, stats) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const store = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let removed = 0;
  for (const item of store.items || []) {
    const before = Array.isArray(item.evidence) ? item.evidence.length : 0;
    item.evidence = filterRows(Array.isArray(item.evidence) ? item.evidence : [], policy, stats);
    const delta = before - item.evidence.length;
    if (delta > 0) {
      removed += delta;
      if (item.jayApproved === true) {
        item.jayApproved = false;
        item.approvalInvalidatedAt = new Date().toISOString();
        item.approvalInvalidatedReason = 'learning evidence invalidated after pipeline reset';
      }
    }
  }
  store.evidenceIds = [...new Set((store.items || []).flatMap((item) => (item.evidence || []).map((row) => clean(row.id)).filter(Boolean)))];
  if (removed > 0) store.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`);
  stats.dnaEvidenceRemoved += removed;
}

export function sanitizeDepartmentLedger(filePath, policy, stats) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const ledger = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const before = Array.isArray(ledger.verifiedLearning) ? ledger.verifiedLearning.length : 0;
  ledger.verifiedLearning = filterRows(Array.isArray(ledger.verifiedLearning) ? ledger.verifiedLearning : [], policy, stats);
  const removed = before - ledger.verifiedLearning.length;
  if (removed > 0) ledger.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(filePath, `${JSON.stringify(ledger, null, 2)}\n`);
  stats.departmentRowsRemoved += removed;
}

export function sanitizeLearningWorkspace(options = {}) {
  const policyPath = options.policy || 'company-learning/invalidated-learning-sources.json';
  const policy = loadInvalidationPolicy(policyPath);
  const stats = {
    policy: policyPath,
    entries: policy.entries.length,
    files: 0,
    invalidated: 0,
    dnaEvidenceRemoved: 0,
    departmentRowsRemoved: 0,
    byGame: {},
    matches: {},
    originalsPreservedInGit: true,
    futureRevisionsAllowed: policy.allowFutureRevisions !== false,
  };
  sanitizeDirectory(options.evidenceDir || 'company-learning/evidence', policy, stats);
  sanitizeDirectory(options.sampleDir || 'company-learning/training-samples', policy, stats);
  sanitizeDnaStore(options.dna || 'company-learning/company-dna.json', policy, stats);
  sanitizeDepartmentLedger(options.ledger || 'department-experience.json', policy, stats);
  return stats;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stats = sanitizeLearningWorkspace({
    policy: args.policy,
    evidenceDir: args['evidence-dir'],
    sampleDir: args['sample-dir'],
    dna: args.dna,
    ledger: args.ledger,
  });
  console.log(JSON.stringify(stats));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
