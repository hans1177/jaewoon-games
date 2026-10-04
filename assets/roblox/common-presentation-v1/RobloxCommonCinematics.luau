-- 회사 공용 컷신/인트로 쇼트 문법. 카메라를 직접 소유하지 않고 게임 코드에 시각 계획만 제공한다.
local M={}

local SHOTS=table.freeze({
  ESTABLISHING_WIDE={framing="WIDE",motion="SLOW_PAN",purpose="WORLD_CONTEXT"},
  MEDIUM_SINGLE={framing="MEDIUM",motion="STABLE",purpose="SPEAKER_FOCUS"},
  TWO_SHOT={framing="MEDIUM_WIDE",motion="STABLE",purpose="RELATIONSHIP"},
  OVER_SHOULDER={framing="MEDIUM_CLOSE",motion="STABLE",purpose="DIALOGUE_EXCHANGE"},
  REACTION_CLOSE={framing="CLOSE",motion="MICRO_PUSH",purpose="EMOTION_REACTION"},
  INSERT_DETAIL={framing="DETAIL",motion="STABLE",purpose="OBJECT_OR_CLUE"},
  HERO_LOW_ANGLE={framing="MEDIUM_WIDE",motion="SLOW_PUSH",purpose="POWER_REVEAL"},
  REVEAL_PAN={framing="WIDE",motion="PAN",purpose="REGION_OR_BOSS_REVEAL"},
  ORBIT={framing="MEDIUM_WIDE",motion="SLOW_ORBIT",purpose="SPATIAL_REVEAL"},
  TRACKING={framing="MEDIUM",motion="TRACK",purpose="CHARACTER_MOVEMENT"},
  STATIC_DRAMATIC={framing="COMPOSED",motion="NONE",purpose="HIGH_CLARITY"},
})

local PROFILES=table.freeze({
  SIMPLE_INTRO={
    "STATIC_DRAMATIC","REVEAL_PAN","MEDIUM_SINGLE"
  },
  NPC_DIALOGUE={
    "ESTABLISHING_WIDE","TWO_SHOT","OVER_SHOULDER","REACTION_CLOSE"
  },
  BOSS_REVEAL={
    "INSERT_DETAIL","REVEAL_PAN","HERO_LOW_ANGLE","REACTION_CLOSE"
  },
  REGION_REVEAL={
    "TRACKING","REVEAL_PAN","ESTABLISHING_WIDE"
  },
  QUEST_MOMENT={
    "TWO_SHOT","INSERT_DETAIL","REACTION_CLOSE"
  },
  VICTORY_STINGER={
    "MEDIUM_SINGLE","HERO_LOW_ANGLE","ESTABLISHING_WIDE"
  },
  DEFEAT_STINGER={
    "REACTION_CLOSE","STATIC_DRAMATIC"
  },
  STORY_CHOICE={
    "TWO_SHOT","OVER_SHOULDER","REACTION_CLOSE","STATIC_DRAMATIC"
  },
})

local function freezeList(x)return table.freeze(table.clone(x or {}))end

function M.CreatePlan(options)
  options=options or {}
  local kind=string.upper(tostring(options.kind or "SIMPLE_INTRO"))
  local names=PROFILES[kind] or PROFILES.SIMPLE_INTRO
  local shots={}
  for i,name in ipairs(names) do
    local spec=SHOTS[name]
    shots[i]=table.freeze({
      order=i,
      shot=name,
      framing=spec.framing,
      motion=spec.motion,
      purpose=spec.purpose,
      durationWeight=1,
      cameraAuthority=false,
      gameplayTimingAuthority=false,
    })
  end
  return table.freeze({
    version=1,
    kind=kind,
    shots=freezeList(shots),
    subtitleRequired=options.subtitleRequired~=false,
    speakerNameRecommended=true,
    offscreenSpeakerDirectionSupported=true,
    reducedMotionVariant=true,
    reducedMotionRules=table.freeze({
      cameraShakeScale=0,
      handheldSwayScale=0,
      orbitToStaticAllowed=true,
      panSpeedScale=0.55,
      motionBlurRecommended=false,
    }),
    stagingRules=freezeList({
      "KEEP_FACE_AND_EYES_READABLE",
      "AVOID_HORNS_WEAPONS_OR_PROPS_BLOCKING_FACES",
      "REACTING_CHARACTER_COVERAGE",
      "HEIGHT_AWARE_FRAMING",
      "AVOID_CLIPPING_AND_POSE_POPS",
      "MATCH_GAMEPLAY_MOMENTUM",
      "PRESERVE_WORLD_CONTINUITY",
    }),
    expressionRules=freezeList({
      "BASE_EMOTION","EYE_TARGET","BLINK","BROW","MOUTH","HEAD_RESPONSE","BREATH_OR_WEIGHT_SHIFT"
    }),
    transitionRules=freezeList({
      "NO_UNMOTIVATED_CUT","ACTION_MATCH_WHEN_POSSIBLE","REACTION_AFTER_EVENT","ESTABLISH_BEFORE_COMPLEX_ACTION"
    }),
    gameplayAuthority=false,
    cameraAuthority=false,
    inputAuthority=false,
  })
end

function M.CreateImpactPresentation(options)
  options=options or {}
  local importance=string.upper(tostring(options.importance or "STANDARD"))
  return table.freeze({
    version=1,
    importance=importance,
    layers=freezeList({
      "ANTICIPATION_POSE",
      "CONTACT_POSE",
      "CONTACT_VFX",
      "DIRECTIONAL_RECOIL",
      "CAMERA_IMPULSE_VISUAL_REQUEST",
      "MATERIAL_OR_SURFACE_RESPONSE",
      "PARTICLE_RESIDUE",
      "DAMAGE_NUMBER_OR_UI_FEEDBACK_WHEN_GAME_USES_IT",
      "AUDIO_ROLE",
      "RECOVERY_POSE",
    }),
    emphasis=table.freeze({
      silhouette=true,
      contactFrame=true,
      directionReadable=true,
      targetReaction=true,
      attackerFollowThrough=true,
      clutterCap=true,
      mobileDensityVariant=true,
    }),
    gameplayDamageAuthority=false,
    hitboxAuthority=false,
    hitTimingAuthority=false,
    cameraAuthority=false,
  })
end

function M.CreateSkillPresentation(options)
  options=options or {}
  return table.freeze({
    version=1,
    skillRole=string.upper(tostring(options.skillRole or "GENERIC")),
    layers=freezeList({
      "ICON_IDENTITY",
      "CAST_ANTICIPATION",
      "CAST_POSE",
      "TELEGRAPH",
      "PROJECTILE_OR_AREA_SHAPE",
      "TRAIL",
      "CONTACT_OR_DETONATION",
      "TARGET_REACTION",
      "STATUS_PRESENTATION",
      "RESIDUAL_WORLD_EFFECT",
      "AUDIO_ROLE",
      "MOBILE_DENSITY_VARIANT",
    }),
    readability=table.freeze({
      friendlyEnemyDistinction=true,
      areaBoundaryReadable=true,
      intensityMatchesImportance=true,
      colorOnlyGameplayMeaningForbidden=true,
      effectMayNotHideCriticalTargets=true,
    }),
    gameplayAuthority=false,
    damageAuthority=false,
    cooldownAuthority=false,
  })
end

function M.CreateMotionPresentation(options)
  options=options or {}
  return table.freeze({
    version=1,
    role=string.upper(tostring(options.role or "GENERIC")),
    phases=freezeList({
      "INTENT","ANTICIPATION","WEIGHT_TRANSFER","ACTION","CONTACT","FOLLOW_THROUGH","RECOVERY","NEXT_STATE"
    }),
    detailChannels=freezeList({
      "ROOT_WEIGHT","FEET_CONTACT","HAND_CONTACT","HEAD_EYES","TORSO_TWIST","SECONDARY_MOTION","EXPRESSION"
    }),
    qualityRules=freezeList({
      "NO_ROOT_ONLY_FINAL_CHARACTER_MOTION",
      "NO_SPEED_ONLY_SPECIES_VARIATION",
      "CONTACT_MUST_READ",
      "INTERRUPT_AND_BLEND_MUST_NOT_POP",
      "START_STOP_TURN_REQUIRE_WEIGHT",
      "MOTION_MUST_MATCH_BODY_PLAN_AND_EQUIPMENT",
    }),
    gameplaySpeedAuthority=false,
    hitTimingAuthority=false,
    rootMovementAuthority=false,
  })
end

function M.Audit()
  return table.freeze({
    version=1,
    shotTypeCount=11,
    profileCount=8,
    studioRequiredForInternalUse=false,
    cameraAuthority=false,
    gameplayAuthority=false,
  })
end

return table.freeze(M)
