// 파일명: assets/jaewoon-graphics-engine.js
// 역할: Graphics DNA, 시각 성능예산, A/B/C 후보검증, 다중게임 승격을 위한 공통 그래픽 진화 코어
// 원칙: 렌더/표현 계층만 다루며 authoritative gameplay state를 변경하지 않는다.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.JaewoonGraphicsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const STRATEGIES = Object.freeze(['KEEP','ENHANCE','COMBINE','REPLACE']);
  const TIERS = Object.freeze(['LOW','MID','HIGH']);
  const DNA_LEVELS = Object.freeze(['ASSET','CHARACTER','ARCHETYPE','ENVIRONMENT','GAME','COMPANY']);
  const SCORE_WEIGHTS = Object.freeze({
    readability:15,
    identity:15,
    actors:10,
    environment:10,
    uiHud:10,
    combatVfx:10,
    signatureScene:10,
    motionStyleMatch:5,
    mobilePerformance:10,
    licenseRegressionSafety:5,
  });
  const PROTECTED_KEYS = new Set([
    'hp','health','damage','attack','attackPower','cooldown','spawn','spawnRate','spawnCount','reward','rewards',
    'dropRate','dropRates','save','saveData','saveMeaning','progression','collision','hitbox','hitboxes','questReward',
    'economy','price','prices','combatResult','gameplayFlow'
  ].map((key) => key.toLowerCase()));
  const BLOCKED_LICENSE = ['NC','NON_COMMERCIAL','UNKNOWN','UNVERIFIED','ND','NO_DERIVATIVES','LOST_PROVENANCE'];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function findProtectedKeys(value, found = new Set(), seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return found;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (PROTECTED_KEYS.has(String(key).toLowerCase())) found.add(key);
      findProtectedKeys(child, found, seen);
    }
    return found;
  }

  function validateVisualCandidate(candidate = {}) {
    const touched = [...findProtectedKeys(candidate)].sort();
    const stableTarget = candidate.target === 'stable' || candidate.target === 'public' || candidate.target === 'main';
    const selfPromote = candidate.selfPromote === true || candidate.promote === true;
    const blockers = [];
    if (touched.length) blockers.push('GAMEPLAY_AUTHORITY_MUTATION');
    if (stableTarget) blockers.push('STABLE_OR_MAIN_DIRECT_MUTATION');
    if (selfPromote) blockers.push('UNVERIFIED_SELF_PROMOTE');
    return Object.freeze({ pass:blockers.length === 0, blockers:Object.freeze(blockers), protectedKeys:Object.freeze(touched), authority:'CANDIDATE_ONLY' });
  }

  function validateAssetLicense(entry = {}) {
    const license = String(entry.license ?? '').trim().toUpperCase();
    const source = String(entry.source ?? '').trim();
    const author = String(entry.author ?? entry.creator ?? '').trim();
    const checkedAt = String(entry.checkedAt ?? entry.verifiedAt ?? '').trim();
    const gameId = String(entry.gameId ?? entry.targetGame ?? '').trim();
    const use = String(entry.use ?? entry.purpose ?? '').trim();
    const blocked = BLOCKED_LICENSE.some((token) => license.includes(token));
    const commercial = entry.commercialUse !== false;
    const derivativeNeeded = entry.modified === true || Boolean(entry.derivativeFile);
    const modificationAllowed = entry.modificationUse !== false && !license.includes('ND');
    const pass = Boolean(source && author && license && checkedAt && gameId && use && !blocked && commercial && (!derivativeNeeded || modificationAllowed));
    return Object.freeze({ pass, blocked, license, commercial, modificationAllowed });
  }

  function classifyAsset({ currentQuality=1, readability=1, identityFit=1, licensePass=true, needsParts=false, externalReplacementReady=false } = {}) {
    if (!licensePass) return 'REPLACE';
    if (currentQuality >= 0.8 && readability >= 0.8 && identityFit >= 0.8 && !needsParts) return 'KEEP';
    if (needsParts && identityFit >= 0.55) return 'COMBINE';
    if (currentQuality >= 0.45 && readability >= 0.4 && identityFit >= 0.5) return 'ENHANCE';
    return externalReplacementReady ? 'REPLACE' : 'ENHANCE';
  }

  function createGraphicsProfile(options = {}) {
    const tier = String(options.deviceTier ?? 'MID').toUpperCase();
    if (!TIERS.includes(tier)) throw new Error(`unknown device tier: ${tier}`);
    return Object.freeze({
      engineVersion:VERSION,
      profileVersion:Number(options.profileVersion ?? 1),
      styleDnaVersion:Number(options.styleDnaVersion ?? 1),
      gameId:options.gameId ?? null,
      deviceTier:tier,
      strategy:STRATEGIES.includes(options.strategy) ? options.strategy : 'ENHANCE',
      dna:Object.freeze({
        asset:options.dna?.asset ?? null,
        character:options.dna?.character ?? null,
        archetype:options.dna?.archetype ?? null,
        environment:options.dna?.environment ?? null,
        game:options.dna?.game ?? null,
        company:options.dna?.company ?? null,
      }),
      target:'candidate',
      selfPromote:false,
    });
  }

  function deviceVisualBudget(tier='MID') {
    const key = String(tier).toUpperCase();
    const profiles = {
      LOW:{ decorativeParticles:0.30, postFx:0.20, distantEffects:0.35, environmentMotion:0.45, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
      MID:{ decorativeParticles:0.65, postFx:0.55, distantEffects:0.70, environmentMotion:0.75, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
      HIGH:{ decorativeParticles:1, postFx:1, distantEffects:1, environmentMotion:1, coreSilhouette:1, attackReadability:1, uiHud:1, playerFeedback:1 },
    };
    if (!profiles[key]) throw new Error(`unknown device tier: ${tier}`);
    return Object.freeze({ tier:key, ...profiles[key] });
  }

  function graphicsScore(evidence = {}) {
    const parts = {};
    let total = 0;
    for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
      const normalized = clamp(evidence[key], 0, 1);
      const points = normalized * weight;
      parts[key] = points;
      total += points;
    }
    return Object.freeze({ total:Math.round(total * 100) / 100, parts:Object.freeze(parts), max:100 });
  }

  function detectVisualAnomalies(observation = {}) {
    const checks = {
      SPRITE_CLIPPED: observation.spriteClipped,
      ALPHA_BACKGROUND_ERROR: observation.alphaBackgroundError,
      ABNORMAL_SCALE: observation.abnormalScale,
      BLUR_OR_PIXEL_BREAK: observation.blurOrPixelBreak,
      UI_OUTSIDE_SAFE_AREA: observation.uiOutsideSafeArea,
      LOW_CONTRAST: observation.lowContrast,
      COLOR_ONLY_ENEMY_DUPLICATE: observation.colorOnlyEnemyDuplicate,
      VFX_HIDES_TELEGRAPH: observation.vfxHidesTelegraph,
      PARTICLE_EXPLOSION: observation.particleExplosion,
      SUBJECT_LOST_IN_BACKGROUND: observation.subjectLostInBackground,
      MOBILE_ENEMY_UNREADABLE: observation.mobileEnemyUnreadable,
      FONT_ICON_BLUR: observation.fontIconBlur,
      ASSET_LOAD_FAILURE: observation.assetLoadFailure,
      LICENSE_LEDGER_MISSING: observation.licenseLedgerMissing,
      STYLE_DNA_MISMATCH: observation.styleDnaMismatch,
    };
    return Object.freeze(Object.entries(checks).filter(([, active]) => active === true).map(([name]) => name));
  }

  function sameConditions(conditions = {}) {
    return ['sameDevice','sameScene','sameCharacter','sameInput','samePerformanceLimit'].every((key) => conditions[key] === true);
  }

  function evaluateGraphicsExperiment({ baseline, candidates=[], conditions={} } = {}) {
    if (!sameConditions(conditions)) return Object.freeze({ pass:false, reason:'CONDITIONS_MISMATCH', winner:null, comparisons:[] });
    const baseScore = graphicsScore(baseline?.evidence ?? {}).total;
    const comparisons = candidates.map((candidate) => {
      const validation = validateVisualCandidate(candidate);
      const anomalies = detectVisualAnomalies(candidate.observation ?? {});
      const score = graphicsScore(candidate.evidence ?? {}).total;
      const performancePass = candidate.performancePass !== false;
      const inputPass = candidate.inputPass !== false;
      const licenses = (candidate.externalAssets ?? []).map(validateAssetLicense);
      const licensePass = licenses.every((item) => item.pass);
      const pass = validation.pass && anomalies.length === 0 && performancePass && inputPass && licensePass && score > baseScore;
      return Object.freeze({ id:candidate.id ?? null, variant:candidate.variant ?? null, score, delta:Math.round((score-baseScore)*100)/100, pass, validation, anomalies, performancePass, inputPass, licensePass });
    }).sort((a,b) => Number(b.pass)-Number(a.pass) || b.score-a.score);
    const winner = comparisons.find(({ pass }) => pass) ?? null;
    return Object.freeze({ pass:Boolean(winner), reason:winner ? 'CANDIDATE_IMPROVED' : 'NO_VERIFIED_IMPROVEMENT', baselineScore:baseScore, winner, comparisons:Object.freeze(comparisons) });
  }

  function graphicsDnaPromotion(records = []) {
    const successful = records.filter((record) => record?.verified === true && record?.regressionPass === true && record?.performancePass === true);
    const games = new Set(successful.map(({ gameId }) => gameId).filter(Boolean));
    const contexts = new Set(successful.map((record) => record.context ?? record.genre ?? record.archetype ?? null).filter(Boolean));
    const eligible = games.size >= 3 && contexts.size >= 2;
    return Object.freeze({
      stage:eligible ? 'MULTI_GAME_VERIFIED' : games.size > 0 ? 'GAME_VERIFIED' : 'PROPOSED',
      companyStandardEligible:eligible,
      uniqueGames:games.size,
      uniqueContexts:contexts.size,
      selfPromoteAllowed:false,
      requiresJayVerdict:true,
    });
  }

  function createStyleDna({ graphics=null, motion=null, palette=null, silhouette=null, vfx=null, ui=null, camera=null, soundTiming=null, signatureScene=null } = {}) {
    return Object.freeze({ graphics, motion, palette, silhouette, vfx, ui, camera, soundTiming, signatureScene });
  }

  return Object.freeze({
    version:VERSION,
    STRATEGIES,
    TIERS,
    DNA_LEVELS,
    SCORE_WEIGHTS,
    createGraphicsProfile,
    classifyAsset,
    validateAssetLicense,
    validateVisualCandidate,
    deviceVisualBudget,
    graphicsScore,
    detectVisualAnomalies,
    evaluateGraphicsExperiment,
    graphicsDnaPromotion,
    createStyleDna,
  });
});
