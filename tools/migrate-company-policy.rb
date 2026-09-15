# frozen_string_literal: true

require 'json'
require 'yaml'
require 'date'
require 'fileutils'

ROOT = File.expand_path('..', __dir__)
FLOW = File.join(ROOT, 'COMPANY_FLOW.md')
POLICY = File.join(ROOT, 'company-policy.json')
DIRECTIVE = File.join(ROOT, 'company-directive.json')

abort('COMPANY_FLOW.md missing') unless File.file?(FLOW)
raw = File.read(FLOW, encoding: 'UTF-8')
match = raw.match(/```yaml\s*\n(.*?)\n```\s*\z/m)
abort('COMPANY_FLOW.md must contain one terminal yaml policy block') unless match
policy = YAML.safe_load(match[1], permitted_classes: [Date], aliases: true)
abort('policy root must be a mapping') unless policy.is_a?(Hash)

# Current owner contract is authoritative over stale duplicate scheduling values.
policy['policy'] ||= {}
policy['policy']['sourceOfTruth'] = 'company-policy.json'
policy['policy']['format'] = 'MACHINE_JSON_POLICY_SPEC'
policy['policy']['humanReadableNarrativeRequired'] = false
policy['policy']['separatePolicyDocumentsForbidden'] = true
policy['policy']['latestOwnerDirectiveRecordedAt'] = '2026-09-15'

priority = Array(policy['priority']).map { |v| v == 'COMPANY_FLOW' ? 'COMPANY_POLICY' : v }
policy['priority'] = priority

owner = policy.dig('ownerCurrentProductionContract') || {}
owner['recordedAt'] = '2026-09-15'
owner['authority'] = 'OWNER_LATEST_DIRECT_INSTRUCTION'
owner['supersedesConflictingLegacySchedulingAndSeedRulesBelow'] = true

# Normalize known stale mirrors to the current 20-game owner contract.
if policy['productionThroughput'].is_a?(Hash)
  policy['productionThroughput']['concurrentGameWipMax'] = 20
  policy['productionThroughput']['webValidationParallelismTarget'] = 20
  policy['productionThroughput']['webValidationParallelismMax'] = 20
end
impl = policy.dig('portfolioGovernance', 'platformScopedRepresentativeSets', 'implementationWip')
if impl.is_a?(Hash)
  impl['target'] = 20
  impl['max'] = 20
  impl['scope'] = 'GLOBAL_SELECTED_PLATFORM_DEVELOPMENT'
  impl['parallelExecutionDefault'] = true
  impl['webValidationParallelismTarget'] = 20
  impl['webValidationParallelismMax'] = 20
end

# Historical copied prose must not act as a second policy source.
if policy['artbookDocumentConsolidation'].is_a?(Hash)
  policy['artbookDocumentConsolidation'] = {
    'status' => 'HISTORICAL_NON_AUTHORITY',
    'policySource' => 'company-policy.json',
    'legacyCopiedProseRemoved' => true
  }
end

# Deterministic rule IDs for every effective policy field.
def rule_id_for(path)
  'POLICY.' + path.map { |p| p.to_s.gsub(/[^A-Za-z0-9]+/, '_').upcase }.join('.')
end

def collect_rule_index(value, path = [], out = [])
  case value
  when Hash
    value.keys.sort.each { |k| collect_rule_index(value[k], path + [k], out) }
  when Array
    out << { 'id' => rule_id_for(path), 'path' => '/' + path.map { |p| p.to_s.gsub('~', '~0').gsub('/', '~1') }.join('/') }
  else
    out << { 'id' => rule_id_for(path), 'path' => '/' + path.map { |p| p.to_s.gsub('~', '~0').gsub('/', '~1') }.join('/') }
  end
  out
end

meta = {
  'schemaVersion' => 1,
  'policyVersion' => '2026-09-15.r40',
  'sourceOfTruth' => true,
  'generatedFromLegacyPolicySnapshot' => 'COMPANY_FLOW.md@migration',
  'legacySnapshotIsAuthority' => false,
  'ruleIdStrategy' => 'DETERMINISTIC_JSON_PATH',
  'authorityOrder' => policy['priority']
}
rule_index = collect_rule_index(policy)
ids = rule_index.map { |r| r['id'] }
abort('duplicate generated rule ids') unless ids.uniq.length == ids.length

canonical = {
  '_meta' => meta,
  '_ruleIndex' => rule_index,
  'policy' => policy
}
File.write(POLICY, JSON.pretty_generate(canonical) + "\n")

# Directive remains an executable mirror, never an authority source.
directive = JSON.parse(File.read(DIRECTIVE, encoding: 'UTF-8'))
directive['revision'] = [directive.fetch('revision', 0).to_i + 1, 40].max
directive['updatedAt'] = '2026-09-15'
directive['policyDocument'] = 'company-policy.json'
directive['policyVersion'] = meta['policyVersion']
directive['instruction'] = 'Use company-policy.json as the only machine production policy source of truth. This file mirrors executable values and invariant flags only and cannot create policy.'
directive['documentationSynchronization'] ||= {}
directive['documentationSynchronization']['centralPolicyFirst'] = true
directive['documentationSynchronization']['workDocumentsCannotOverrideCentralPolicy'] = true

# Bring executable seed/concurrency mirrors in line with the latest owner contract.
directive['gameSeed'] ||= {}
directive['gameSeed']['selectionMode'] = 'MATERIAL_COMPOSITION'
directive['gameSeed']['referenceGameIsOptionalMaterialType'] = true
directive['gameSeed']['combinePerGameSeed'] = { 'min' => 2, 'max' => 4 }
directive['gameSeed']['finalConceptMaterialDuplicateForbidden'] = true
directive['gameSeed']['actualGameCountCap'] = nil
directive['gameSeed']['fixedSixCategoryProductionQuotaForbidden'] = true

directive['developmentConcurrency'] = {
  'scope' => 'DEVELOPMENT_CONFIRMED_SELECTED_PLATFORM_GAME_IMPLEMENTATION',
  'concurrentGameWipTarget' => 20,
  'concurrentGameWipMax' => 20,
  'webValidationParallelismTarget' => 20,
  'webValidationParallelismMax' => 20,
  'parallelExecutionDefault' => true,
  'adaptiveBackpressureSteps' => [20, 16, 12, 8, 4],
  'sameResponsibleFileParallelForbidden' => true,
  'sharedSaveSchemaWritesExclusive' => true,
  'centralPolicyWritesExclusive' => true
}
File.write(DIRECTIVE, JSON.pretty_generate(directive) + "\n")

# AGENTS.md stays because agent runtimes auto-load it; it becomes a bootstrap only.
agents = <<~MD
  # JAEWOON AGENT BOOTSTRAP

  This file is a loader, not a policy source.

  1. Read `company-policy.json` before planning, editing, reviewing, validating, or releasing.
  2. Read `company-directive.json` only as the executable mirror of that policy.
  3. Resolve authority strictly as declared in `company-policy.json::_meta.authorityOrder`.
  4. Use `_ruleIndex` rule IDs / JSON paths when recording applied policy in status, audit, QA, or learning evidence.
  5. Evidence, status, workflow, implementation contracts, and secondary documents cannot create or override policy.

  Bootstrap hard stops: no paid AI/runner, no unvalidated direct public/main game write, no save-meaning change without owner authority, no wrapper/override-chain patching, and no invented QA/runtime/release evidence. Full definitions are authoritative only in `company-policy.json`.
MD
File.write(File.join(ROOT, 'AGENTS.md'), agents)

handoff = {
  'schemaVersion' => 1,
  'kind' => 'IMPLEMENTATION_HANDOFF_CONTRACT',
  'policyDocument' => 'company-policy.json',
  'policyAuthority' => false,
  'policyRefs' => [
    'POLICY.DEVELOPMENTSAFETY',
    'POLICY.ASSETPOLICY',
    'POLICY.DEPARTMENTSTANDARDS',
    'POLICY.FLOWS.DEVELOPMENT_CONFIRMED'
  ],
  'implementationGuidance' => {
    'inspectExistingSourceFirst' => true,
    'preferResponsibleSystemDirectEdit' => true,
    'preserveExistingBehaviorAndSaveMeaning' => true,
    'mobileFirst' => true,
    'separatePresentationFromGameStateWherePractical' => true,
    'incrementalChangeAndRegression' => true,
    'saveSchemaChangeRequiresMigration' => true,
    'movementAndCombatUseLocalRuntimeLogic' => true,
    'externalGenerativeModelPerFrameGameplayForbidden' => true,
    'reuseRepositoryAssetsFirst' => true,
    'licenseVerificationRequired' => true
  },
  'qaFocus' => [
    'LOAD_AND_START', 'SOFTLOCK', 'BUTTONS', 'TOUCH', 'JOYSTICK', 'SCROLL_AND_CLIPPING',
    'SAVE_AND_RELOAD', 'PAUSE_AND_RESTART', 'RUNTIME_ERRORS', 'PERFORMANCE', 'MOBILE_LAYOUT'
  ],
  'sharedRuntimeAssetsRoot' => 'assets/'
}
File.write(File.join(ROOT, 'project-handoff.json'), JSON.pretty_generate(handoff) + "\n")

parallel = {
  'schemaVersion' => 1,
  'kind' => 'VIBE2_PARALLEL_IMPLEMENTATION_CONTRACT',
  'policyDocument' => 'company-policy.json',
  'policyAuthority' => false,
  'maxConcurrency' => 20,
  'adaptiveBackpressureSteps' => [20, 16, 12, 8, 4],
  'parallelFirst' => true,
  'architecture' => ['DAG', 'HIERARCHICAL_PARALLELISM', 'SHARDS', 'WORK_STEALING', 'SOURCE_FILE_LOCKS', 'INCREMENTAL_QA', 'FAN_IN'],
  'defaultShards' => { 'unity' => 3, 'web' => 7, 'verification' => 5, 'support' => 5 },
  'sameSourceRootParallelRequiresExplicitDisjointResponsibleFiles' => true,
  'sameResponsibleFileParallelForbidden' => true,
  'sharedSaveSchemaWritesExclusive' => true,
  'centralPolicyWritesExclusive' => true,
  'candidateIsolationRequired' => true,
  'eventDrivenRefill' => true,
  'incrementalQa' => true,
  'contentHashCacheAllowed' => true,
  'fanInFullRegressionRequired' => true,
  'sharedQueueWritesByFanOutWorkersForbidden' => true,
  'sharedStateAggregationSingleWriter' => true,
  'paidApiAllowed' => false,
  'paidRunnerAllowed' => false,
  'fixedProductionClassCountsForbidden' => true,
  'deprecatedFixedCountsRemoved' => true
}
File.write(File.join(ROOT, 'vibe2-parallel-architecture.json'), JSON.pretty_generate(parallel) + "\n")

# Remove policy prose duplicates after machine replacements exist.
%w[PROJECT_HANDOFF.md VIBE2_PARALLEL_ARCHITECTURE.md COMPANY_FLOW.md].each do |name|
  path = File.join(ROOT, name)
  File.delete(path) if File.file?(path)
end

validator = <<~'JS'
  import fs from 'node:fs';
  import path from 'node:path';

  const root = path.resolve(import.meta.dirname, '..');
  const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const policy = readJson('company-policy.json');
  const directive = readJson('company-directive.json');
  const handoff = readJson('project-handoff.json');
  const parallel = readJson('vibe2-parallel-architecture.json');
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  expect(policy?._meta?.sourceOfTruth === true, 'company-policy.json must be sourceOfTruth');
  expect(policy?._meta?.policyVersion === directive?.policyVersion, 'directive policyVersion mismatch');
  expect(policy?.policy?.policy?.sourceOfTruth === 'company-policy.json', 'embedded policy sourceOfTruth mismatch');
  expect(directive?.policyDocument === 'company-policy.json', 'directive policyDocument mismatch');
  expect(handoff?.policyDocument === 'company-policy.json' && handoff?.policyAuthority === false, 'handoff authority mismatch');
  expect(parallel?.policyDocument === 'company-policy.json' && parallel?.policyAuthority === false, 'parallel contract authority mismatch');

  const ids = (policy._ruleIndex || []).map((r) => r.id);
  expect(ids.length > 0, 'rule index missing');
  expect(new Set(ids).size === ids.length, 'duplicate rule ids');

  const ownerConcurrency = policy?.policy?.ownerCurrentProductionContract?.developmentConcurrency;
  expect(ownerConcurrency?.concurrentGameWipTarget === 20, 'owner concurrentGameWipTarget must be 20');
  expect(ownerConcurrency?.concurrentGameWipMax === 20, 'owner concurrentGameWipMax must be 20');
  expect(ownerConcurrency?.webValidationParallelismTarget === 20, 'owner webValidationParallelismTarget must be 20');
  expect(ownerConcurrency?.webValidationParallelismMax === 20, 'owner webValidationParallelismMax must be 20');
  expect(policy?.policy?.production?.fixedClassCounts === false, 'fixed production class counts must stay false');
  expect(policy?.policy?.ownerCurrentProductionContract?.categoryAndPlatform?.fixedSixCategoryProductionQuotaForbidden === true, 'fixed six-category quota must stay forbidden');
  expect(parallel?.fixedProductionClassCountsForbidden === true, 'parallel contract must reject fixed class counts');
  expect(directive?.developmentConcurrency?.concurrentGameWipMax === 20, 'directive concurrency mirror must be 20');

  const forbiddenRefs = ['COMPANY_FLOW.md', 'VIBE2_PARALLEL_ARCHITECTURE.md', 'PROJECT_HANDOFF.md'];
  const scanRoots = ['AGENTS.md', 'company-directive.json', 'project-handoff.json', 'vibe2-parallel-architecture.json'];
  for (const file of scanRoots) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const ref of forbiddenRefs) expect(!text.includes(ref), `${file} still references ${ref}`);
  }
  for (const removed of forbiddenRefs) expect(!fs.existsSync(path.join(root, removed)), `${removed} should be removed`);

  if (errors.length) {
    console.error('COMPANY_POLICY_VALIDATION=FAIL');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`COMPANY_POLICY_VALIDATION=PASS rules=${ids.length} version=${policy._meta.policyVersion}`);
JS
File.write(File.join(ROOT, 'tools', 'validate-company-policy.mjs'), validator)

puts "MIGRATION=PASS policy=#{POLICY} rules=#{rule_index.length}"
