import fs from 'node:fs';
import path from 'node:path';

const queuePath = process.env.ROBLOX_FINAL_REVIEW_QUEUE || 'development-queue.json';
const designRoot = process.env.ROBLOX_FINAL_REVIEW_DESIGN_ROOT || 'design';
const allowedModes = new Set(['SINGLE', 'COOP', 'COMPETITIVE', 'HYBRID']);

function findLatestDesign(gameId) {
  const root = path.join(designRoot, gameId);
  if (!fs.existsSync(root)) return null;
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const candidate = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(candidate);
      else if (entry.isFile() && entry.name === 'design-revised.json') files.push(candidate);
    }
  };
  walk(root);
  files.sort().reverse();
  if (!files.length) return null;
  try {
    return JSON.parse(fs.readFileSync(files[0], 'utf8'));
  } catch {
    return null;
  }
}

function hasCurrentPublishedRelease(item) {
  const evidence = item.robloxReleaseEvidence;
  return item.robloxReleaseClaim === true
    && evidence?.published === true
    && Number.isInteger(Number(evidence?.versionNumber))
    && Number(evidence.versionNumber) > 0
    && String(evidence?.sourceRevision || '') === String(item.robloxSourceCommit || '')
    && String(evidence?.artifactIdentity || '') === String(item.robloxBuildArtifactIdentity || '');
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const stamp = new Date().toISOString();
let ready = 0;
let blocked = 0;
const multiplayerPendingIds = [];
const releasePendingIds = [];

for (const item of queue.items || []) {
  if (String(item.productionClass || '').toUpperCase() !== 'DEVELOPMENT_CONFIRMED') continue;
  if (String(item.selectedPlatform || item.targetPlatform || '').toUpperCase() !== 'ROBLOX') continue;
  if (item.robloxRuntimePassed !== true || item.robloxIndependentQaPassed !== true || item.robloxRegressionPassed !== true) continue;

  const design = findLatestDesign(item.gameId);
  const rawMode = design?.content?.multiplayerMode ?? design?.content?.multiplayer?.mode ?? design?.multiplayerMode ?? '';
  const mode = String(rawMode || '').trim().toUpperCase();
  const saveRequired = item.robloxRuntimeEvidence?.saveExists === true;
  const saveGate = !saveRequired || item.robloxDatastoreRejoinPassed === true;
  const modeDefined = allowedModes.has(mode);
  const multiplayerApplicable = modeDefined && mode !== 'SINGLE';
  const multiplayerGate = modeDefined && (mode === 'SINGLE' || item.robloxMultiplayerQaPassed === true);
  const exact = item.robloxExactRevisionPassed === true;
  const core = item.robloxRuntimePassed === true
    && item.robloxServerClientBoundaryPassed === true
    && item.robloxMobileControlUiPassed === true
    && item.robloxIndependentQaPassed === true
    && item.robloxRegressionPassed === true
    && exact
    && saveGate;
  const finalPass = core && multiplayerGate;
  const publishedRelease = finalPass && hasCurrentPublishedRelease(item);

  item.robloxMultiplayerMode = modeDefined ? mode : null;
  item.robloxMultiplayerApplicable = multiplayerApplicable;
  item.robloxFinalReviewPassed = finalPass;
  item.robloxFinalReviewCheckedAt = stamp;

  if (publishedRelease) {
    item.robloxLastSuccessfulStage = 'RELEASE_PROMOTION';
    item.robloxFailureStage = null;
    item.robloxFailureSignature = null;
    item.routingBlockers = (item.routingBlockers || []).filter(value => value !== 'roblox-release-promotion-pending');
    ready++;
  } else if (finalPass) {
    item.robloxReleaseClaim = false;
    item.robloxLastSuccessfulStage = 'FINAL_REVIEW';
    item.robloxFailureStage = 'RELEASE_PROMOTION';
    item.robloxFailureSignature = 'ROBLOX_RELEASE_PROMOTION_PENDING';
    item.routingBlockers = ['roblox-release-promotion-pending'];
    releasePendingIds.push(item.gameId);
    ready++;
  } else if (!saveGate) {
    item.robloxReleaseClaim = false;
    item.robloxFailureStage = 'FINAL_REVIEW';
    item.robloxFailureSignature = 'ROBLOX_DATASTORE_REJOIN_REQUIRED';
    item.routingBlockers = ['roblox-datastore-rejoin-required'];
    blocked++;
  } else if (!modeDefined) {
    item.robloxReleaseClaim = false;
    item.robloxFailureStage = 'FINAL_REVIEW';
    item.robloxFailureSignature = 'ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING';
    item.routingBlockers = ['roblox-multiplayer-design-decision-missing'];
    blocked++;
  } else if (multiplayerApplicable && item.robloxMultiplayerQaPassed !== true) {
    item.robloxReleaseClaim = false;
    item.robloxFailureStage = 'FINAL_REVIEW';
    item.robloxFailureSignature = 'ROBLOX_MULTIPLAYER_QA_REQUIRED';
    item.routingBlockers = ['roblox-multiplayer-qa-required'];
    multiplayerPendingIds.push(item.gameId);
    blocked++;
  } else {
    item.robloxReleaseClaim = false;
    item.robloxFailureStage = 'FINAL_REVIEW';
    item.robloxFailureSignature = 'ROBLOX_FINAL_REVIEW_BLOCKED';
    item.routingBlockers = ['roblox-final-review-blocked'];
    blocked++;
  }

  if (item.executionEvidence) {
    item.executionEvidence.lastSuccessfulStage = publishedRelease ? 'RELEASE_PROMOTION' : finalPass ? 'FINAL_REVIEW' : 'REGRESSION';
    item.executionEvidence.failureStage = publishedRelease ? null : finalPass ? 'RELEASE_PROMOTION' : 'FINAL_REVIEW';
    item.executionEvidence.failureSignature = publishedRelease ? null : item.robloxFailureSignature;
  }
  item.updatedAt = stamp;
}

queue.updatedAt = stamp;
fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);

console.log(`ROBLOX_FINAL_REVIEW_READY_COUNT=${ready}`);
console.log(`ROBLOX_FINAL_REVIEW_BLOCKED_COUNT=${blocked}`);
console.log(`ROBLOX_MULTIPLAYER_QA_PENDING_COUNT=${multiplayerPendingIds.length}`);
console.log(`ROBLOX_MULTIPLAYER_QA_PENDING_IDS=${multiplayerPendingIds.join(',') || 'NONE'}`);
console.log(`ROBLOX_RELEASE_PROMOTION_PENDING_COUNT=${releasePendingIds.length}`);
console.log(`ROBLOX_RELEASE_PROMOTION_PENDING_IDS=${releasePendingIds.join(',') || 'NONE'}`);
console.log('ROBLOX_FINAL_REVIEW_RELEASE_STATE_FORCING=NO');

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `ready_count=${ready}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `blocked_count=${blocked}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `multiplayer_pending_count=${multiplayerPendingIds.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `multiplayer_pending_ids_json=${JSON.stringify(multiplayerPendingIds)}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_pending_count=${releasePendingIds.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_pending_ids_json=${JSON.stringify(releasePendingIds)}\n`);
}
