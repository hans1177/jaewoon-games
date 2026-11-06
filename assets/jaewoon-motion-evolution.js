// Jaewoon Motion Evolution: bounded profile learning/evaluation only. No gameplay authority.
(function (root, factory) {
  const api = factory(root && root.JaewoonMotionEngine);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.JaewoonMotionEvolution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (runtime) {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(Number(v)) ? Number(v) : a));
  const DEFAULT_PROFILE = runtime?.DEFAULT_PROFILE || Object.freeze({
    idleBreathAmplitude:1,idleBreathFrequency:1,moveBobAmplitude:1,moveTiltAmplitude:1,moveFrequency:1,
    attackAnticipation:1,attackStrike:1,attackRotation:1,attackStretch:1,hitRecoil:1,hitRotation:1,
    landingSquash:1,landingYOffset:1,flashIntensity:1,afterimageIntensity:1,secondaryMotion:1,
  });
  const PROFILE_KEYS = Object.freeze(Object.keys(DEFAULT_PROFILE));
  const FORBIDDEN_GAMEPLAY_KEYS = Object.freeze([
    'hp','health','damage','attackpower','defense','cooldown','spawn','reward','gold','xp','save','savekey',
    'hitbox','collision','attacktiming','fireinterval','projectilespeed','enemyspeed','playerspeed','dropchance',
  ]);
  const SCORE_WEIGHTS = Object.freeze({
    smoothness:15, controlAlignment:15, impact:15, readability:10, characterIdentity:10,
    weightInertia:10, bossSignature:10, mobilePerformance:10, regressionSafety:5,
  });
  const PROMOTION_STATES = Object.freeze(['PROPOSED','EXPERIMENTING','GAME_VERIFIED','MULTI_GAME_VERIFIED','COMPANY_STANDARD','RETIRED']);

  function normalizeProfile(profile = {}) {
    const out = {};
    for (const key of PROFILE_KEYS) out[key] = clamp(profile[key] ?? DEFAULT_PROFILE[key], 0, 2);
    return Object.freeze(out);
  }

  function forbiddenGameplayPaths(value, path = '') {
    const found = [];
    if (!value || typeof value !== 'object') return found;
    for (const [key, child] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      const compact = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (FORBIDDEN_GAMEPLAY_KEYS.some((token) => compact === token || compact.includes(token))) found.push(next);
      if (child && typeof child === 'object') found.push(...forbiddenGameplayPaths(child, next));
    }
    return found;
  }

  function validateMotionProfile(profile = {}) {
    const unknown = Object.keys(profile).filter((key) => !PROFILE_KEYS.includes(key));
    const forbidden = forbiddenGameplayPaths(profile);
    return { pass: unknown.length === 0 && forbidden.length === 0, unknown, forbidden, normalized: normalizeProfile(profile) };
  }

  function scoreMotion(metrics = {}) {
    const breakdown = {};
    let total = 0;
    for (const [key, max] of Object.entries(SCORE_WEIGHTS)) {
      const value = clamp(metrics[key] ?? 0, 0, max);
      breakdown[key] = value;
      total += value;
    }
    return { total, breakdown, max:100 };
  }

  function tune(profile, key, delta) {
    const next = { ...profile };
    next[key] = clamp((next[key] ?? 1) + delta, 0, 2);
    return next;
  }

  function createCandidateProfiles(baseline = {}, observation = {}) {
    const A = normalizeProfile(baseline);
    let B = { ...A };
    let C = { ...A };
    const m = observation.metrics || {};

    if ((m.impact ?? 15) < 11) {
      B = tune(B, 'attackStrike', 0.10); B = tune(B, 'hitRecoil', 0.08); B = tune(B, 'flashIntensity', 0.06);
      C = tune(C, 'attackStrike', 0.18); C = tune(C, 'hitRecoil', 0.14); C = tune(C, 'attackStretch', 0.10);
    }
    if ((m.readability ?? 10) < 7) {
      B = tune(B, 'afterimageIntensity', -0.15); B = tune(B, 'moveBobAmplitude', -0.08);
      C = tune(C, 'afterimageIntensity', -0.30); C = tune(C, 'moveTiltAmplitude', -0.15);
    }
    if ((m.controlAlignment ?? 15) < 11) {
      B = tune(B, 'attackAnticipation', -0.08); B = tune(B, 'secondaryMotion', -0.08);
      C = tune(C, 'attackAnticipation', -0.15); C = tune(C, 'secondaryMotion', -0.15);
    }
    if ((m.weightInertia ?? 10) < 7) {
      B = tune(B, 'landingSquash', 0.10); B = tune(B, 'landingYOffset', 0.08);
      C = tune(C, 'landingSquash', 0.18); C = tune(C, 'attackAnticipation', 0.08);
    }
    if ((m.mobilePerformance ?? 10) < 8) {
      B = tune(B, 'afterimageIntensity', -0.25); B = tune(B, 'secondaryMotion', -0.12);
      C = tune(C, 'afterimageIntensity', -0.45); C = tune(C, 'moveBobAmplitude', -0.15); C = tune(C, 'secondaryMotion', -0.20);
    }

    const preferred = observation.preferredDeltas || {};
    for (const [key, delta] of Object.entries(preferred)) {
      if (!PROFILE_KEYS.includes(key)) continue;
      B = tune(B, key, clamp(delta, -0.2, 0.2));
      C = tune(C, key, clamp(delta * 1.5, -0.3, 0.3));
    }
    return { A, B: normalizeProfile(B), C: normalizeProfile(C) };
  }

  function sameExperimentConditions(conditions = {}) {
    const required = ['sameDevice','sameScene','sameActor','sameInput','sameFrameLimit'];
    const missing = required.filter((key) => conditions[key] !== true);
    return { pass: missing.length === 0, missing };
  }

  function evaluateMotionExperiment({ baselineMetrics = {}, candidateMetrics = {}, conditions = {}, regressions = [], gameplayAuthorityTouched = false } = {}) {
    const comparable = sameExperimentConditions(conditions);
    const baseline = scoreMotion(baselineMetrics);
    const candidate = scoreMotion(candidateMetrics);
    const delta = candidate.total - baseline.total;
    const blockers = [];
    if (!comparable.pass) blockers.push('CONDITIONS_MISMATCH');
    if (gameplayAuthorityTouched) blockers.push('GAMEPLAY_AUTHORITY_TOUCHED');
    if ((regressions ?? []).length) blockers.push('REGRESSION');
    if ((candidateMetrics.mobilePerformance ?? 0) < (baselineMetrics.mobilePerformance ?? 0) - 1) blockers.push('MOBILE_PERFORMANCE_REGRESSION');
    if ((candidateMetrics.controlAlignment ?? 0) < (baselineMetrics.controlAlignment ?? 0)) blockers.push('CONTROL_ALIGNMENT_REGRESSION');
    if ((candidateMetrics.readability ?? 0) < (baselineMetrics.readability ?? 0)) blockers.push('READABILITY_REGRESSION');
    return { pass: blockers.length === 0 && delta >= 3, delta, baseline, candidate, blockers, comparable };
  }

  function gameVerificationRecord(input = {}) {
    const experiment = evaluateMotionExperiment(input.experiment || {});
    return {
      gameId: input.gameId,
      genre: input.genre || 'UNKNOWN',
      deviceClass: input.deviceClass || 'UNKNOWN',
      engineVersion: input.engineVersion || 2,
      profileVersion: input.profileVersion || 1,
      status: experiment.pass ? 'GAME_VERIFIED' : 'EXPERIMENTING',
      delta: experiment.delta,
      experiment,
      evidence: [...(input.evidence || [])],
    };
  }

  function evaluateCompanyPromotion(records = []) {
    const verified = records.filter((record) => record?.status === 'GAME_VERIFIED' && record?.experiment?.pass === true);
    const games = new Set(verified.map(({ gameId }) => gameId).filter(Boolean));
    const genres = new Set(verified.map(({ genre }) => genre).filter((value) => value && value !== 'UNKNOWN'));
    const deviceClasses = new Set(verified.map(({ deviceClass }) => deviceClass).filter((value) => value && value !== 'UNKNOWN'));
    const averageDelta = verified.length ? verified.reduce((sum, { delta }) => sum + Number(delta || 0), 0) / verified.length : 0;
    const eligible = games.size >= 3 && genres.size >= 2 && deviceClasses.size >= 2 && averageDelta >= 3;
    return {
      eligible,
      state: eligible ? 'MULTI_GAME_VERIFIED' : verified.length ? 'GAME_VERIFIED' : 'EXPERIMENTING',
      distinctGames: games.size,
      distinctGenres: genres.size,
      distinctDeviceClasses: deviceClasses.size,
      averageDelta,
      jayDecisionRequiredForCompanyStandard: true,
      selfPromote: false,
    };
  }

  function deviceAdaptiveProfile(profile = {}, deviceClass = 'MID') {
    const base = { ...normalizeProfile(profile) };
    if (deviceClass === 'LOW') {
      base.afterimageIntensity *= 0.35;
      base.secondaryMotion *= 0.65;
      base.moveBobAmplitude *= 0.85;
      base.flashIntensity *= 0.85;
    } else if (deviceClass === 'HIGH') {
      base.afterimageIntensity *= 1.1;
      base.secondaryMotion *= 1.05;
    }
    return normalizeProfile(base);
  }

  function detectMotionAnomalies(samples = []) {
    const anomalies = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1] || {}, b = samples[i] || {};
      if (Math.abs((b.x ?? 0) - (a.x ?? 0)) > 180 || Math.abs((b.y ?? 0) - (a.y ?? 0)) > 180) anomalies.push({ index:i, type:'TELEPORT_LIKE_DELTA' });
      if (Math.abs(b.rotation ?? 0) > 1.5) anomalies.push({ index:i, type:'EXCESSIVE_ROTATION' });
      if ((b.scaleX ?? 1) < 0.05 || (b.scaleY ?? 1) < 0.05) anomalies.push({ index:i, type:'INVALID_SCALE' });
    }
    return anomalies;
  }

  return {
    version:1,
    PROFILE_KEYS,
    SCORE_WEIGHTS,
    PROMOTION_STATES,
    FORBIDDEN_GAMEPLAY_KEYS,
    normalizeProfile,
    validateMotionProfile,
    forbiddenGameplayPaths,
    scoreMotion,
    createCandidateProfiles,
    sameExperimentConditions,
    evaluateMotionExperiment,
    gameVerificationRecord,
    evaluateCompanyPromotion,
    deviceAdaptiveProfile,
    detectMotionAnomalies,
  };
});
