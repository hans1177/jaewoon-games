// 파일명: assets/vibe-motion-director.js
// 역할: GRAPHICS_PRODUCTION 내부에서 모션 부품을 조합·선택·변형·검증한다.
// 주의: 데미지/히트박스/쿨다운/콤보 판정/이동 권한은 게임플레이 시스템 소유다.

// 임포트: 자산과 모션이 같은 스타일 원본을 사용한다.
import {ASSET_STYLE_PROFILES,createStyleBible} from './vibe-studio-asset-universe.js';

const freezeList = value => Object.freeze([...(Array.isArray(value) ? value : [])]);
const text = value => String(value ?? '').trim();
const upper = value => text(value).toUpperCase();
const unique = values => [...new Set((values || []).map(text).filter(Boolean))];
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));

export const MOTION_DIRECTOR_TARGET='HIGH_END_COMPOSABLE_MOTION_DIRECTOR';
// 작성자가 제공한 연습용 교재다. 런타임에서 검증된 학습 기록이나 모델 가중치가 아니다.
export function createRobloxWalkTeachingRecipe(unit={}){
  if(!unit||typeof unit!=='object')return null;
  const objectId=text(unit.objectId),slug=objectId.replace(/^roblox-world-ghost-/,'');
  if(unit.scope!=='INTERNAL_ASSET_LIBRARY'||!objectId.startsWith('roblox-world-ghost-')||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||unit.clipId!=='walk'||unit.sourcePath!=='init.luau')return null;
  return Object.freeze({
    id:'ROBLOX_WALK_TEACHER_V1',provenance:'TEACHER_AUTHORED',status:'PRACTICE_ONLY',
    runtimeVerified:false,productionVerified:false,gameplayAuthority:false,
    objectId,clipId:'walk',
    use:'Adapt only applicable lessons inside the bound Motion.walk sourceWindow. Keep lockedSource, preservedAxes, existing rate/duration, rig names and non-target form branches. Diagnose from source first; visual improvement still needs native observation.',
    lessons:freezeList([
      Object.freeze({axis:'POSE_AND_STAGING',cause:'Equal motion on every joint hides the support leg and silhouette.',repair:'Keep the existing form and pose helper. Stage torso lean over the support side; use a smaller opposing shoulder rotation. Keep the head readable. Preserve floating, wheel, bound, serpent and multi-leg behavior; never paste a biped gait over them.'}),
      Object.freeze({axis:'WEIGHT_AND_BALANCE',cause:'Independent bob frequencies drift away from the stepping rhythm.',repair:'Derive gait-related sway and bob from the existing phase. A two-step bob uses cos(2*phase); torso sway uses sin(phase). These are visual cues, not a center-of-mass or ground-contact solution. Keep separate breathing only if the existing blend/loop contract allows it.'}),
      Object.freeze({axis:'JOINT_ARCS_AND_SPACING',cause:'A clipped sine lift has a velocity corner at contact.',repair:'For a compatible swing envelope use max(0,sin(phase)) squared: height and first derivative meet zero at either contact boundary. Opposite legs use phase+pi. Fit amplitude and local axis to the existing rig; do not add unknown knee bones.'}),
      Object.freeze({axis:'CONTACT_AND_CONSTRAINTS',cause:'A local foot offset cannot lock a foot in world space.',repair:'Use the zero-lift half-cycle as an intended stance interval only. Measure world-space foot drift and floor penetration on the actual moving rig. Let the existing root/IK owner resolve contact; never change root movement or claim planting from this envelope alone.'}),
      Object.freeze({axis:'OVERLAP_AND_SETTLE',cause:'All joints reversing together looks rigid.',repair:'Use a small bounded phase delay for an existing tail, sleeve or head channel; reduce distal amplitude as needed. Delay means phase-lag in radians, not an accumulating offset. Keep sampling a pure function of time so frame order cannot change the result.'}),
      Object.freeze({axis:'LOOP_AND_TRANSITION',cause:'Position matching alone can still leave a velocity snap.',repair:'For periodic gait channels compare poses and finite-difference velocities at 0 and T=2*pi/rate, including nearby samples. Do not modulo Euler angles into a discontinuity. Inspect the existing idle/walk transition and blends in-engine; source continuity alone is not native QA.'})
    ]),
    example:Object.freeze({
      contract:'Luau scalar example; phase is the EXISTING time*rate in radians. Insert selected expressions in the existing function, then feed only compatible existing pose channels. Coefficients are starting points, not verified rig values. No shared helper, new file, root edit or replacement of the entire motion is required.',
      source:[
        'local leftSwing = math.max(0, math.sin(phase))',
        'local rightSwing = math.max(0, math.sin(phase + math.pi))',
        'local leftLift = 0.06 * leftSwing * leftSwing',
        'local rightLift = 0.06 * rightSwing * rightSwing',
        'local torsoSway = 0.025 * math.sin(phase)',
        'local torsoBob = 0.015 * (1 - math.cos(2 * phase))',
        'local shoulderCounter = -0.6 * torsoSway',
        'local followThrough = 0.035 * math.sin(phase - 0.25)'
      ].join('\n')
    }),
    exercise:'Choose the weakest applicable axis; make a real executable before/after edit in its responsible pose channel. Use the existing six-axis motionRepairReport; preserve only predeclared sound axes. Renaming constants, adding unused helpers, or returning this lesson text is not a source refinement.',
    checks:freezeList(['Sample the full existing cycle and contact boundaries; all original bones retain finite bounded x/y/z/rx/ry/rz and Root stays unchanged.','Sample times in reverse order too: identical inputs must yield identical poses.','On native same-camera/speed before-after captures inspect silhouette, support, foot drift, penetration, overlap and the loop/transition. Record uncertainty; do not self-promote to VERIFIED.'])
  });
}

export const ROBLOX_CHARACTER_MOTION_FAILURE='CHARACTER_MOTION_MANNEQUIN';
export const ROBLOX_ACTOR_CLASSES=Object.freeze(['PLAYER','HUMANOID_NPC','CREATURE']);
export const ROBLOX_MOTION_SOURCE_PRIORITY=Object.freeze([
  'VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION',
  'VERIFIED_COMPATIBLE_COMPANY_MOTION_LIBRARY',
  'LICENSE_VERIFIED_REPOSITORY_MOTION',
  'LICENSE_VERIFIED_EXTERNAL_MOTION_WITH_PROVENANCE',
  'SAFE_RETARGET_AND_CLEANUP',
  'NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP'
]);

export const DUEL_COMBAT_MOTION_TARGET='RESPONSIVE_DUEL_ARENA_COMBAT';

export const DUEL_COMBAT_REQUIRED_ROLES=Object.freeze([
  'READY_STANCE','COMBAT_LOCOMOTION','LIGHT_COMBO','HEAVY_ATTACK','GAP_CLOSER','AERIAL_ATTACK',
  'GUARD','PARRY_OR_COUNTER','DODGE','HIT_REACTION','KNOCKDOWN','GET_UP','FINISHER'
]);

const freezeCombatPack=pack=>Object.freeze(Object.fromEntries(
  Object.entries(pack).map(([key,value])=>[key,Array.isArray(value)?freezeList(value):value])
));

const DUEL_REACTION_MOTIONS=freezeList([
  'HIT_FRONT_LIGHT','HIT_LEFT_LIGHT','HIT_RIGHT_LIGHT','HIT_BACK_LIGHT',
  'HIT_FRONT_HEAVY','COUNTER_HIT','GUARD_BREAK','LAUNCH_REACTION',
  'WALL_HIT','KNOCKDOWN'
]);

const DUEL_RECOVERY_MOTIONS=freezeList([
  'COMBAT_GET_UP','TECH_ROLL_LEFT','TECH_ROLL_RIGHT','WALL_RECOVERY'
]);

export const WEAPON_COMBAT_MOTION_PACKS=Object.freeze({
  UNARMED:freezeCombatPack({
    stance:['FIGHT_IDLE','ORTHODOX_GUARD','SOUTHPAW_GUARD'],
    footwork:['COMBAT_STEP_FORWARD','COMBAT_STEP_BACK','CIRCLE_LEFT','CIRCLE_RIGHT','DASH_FORWARD','DASH_BACK'],
    lightCombo:['JAB','CROSS','HOOK'],
    heavy:['UPPERCUT','OVERHAND','SPINNING_BACK_KICK'],
    gapCloser:['BURST_STEP_PUNCH','FLYING_KNEE'],
    aerial:['JUMP_FRONT_KICK','AERIAL_PUNCH'],
    defense:['HIGH_GUARD','LOW_GUARD','SLIP_LEFT','SLIP_RIGHT','PARRY_COUNTER'],
    finisher:['UNARMED_COMBO_ENDER','UNARMED_FINISHER']
  }),
  KATANA:freezeCombatPack({
    stance:['KATANA_CHUDAN_READY','KATANA_HIGH_READY','KATANA_DRAW_READY'],
    footwork:['KATANA_STEP_FORWARD','KATANA_STEP_BACK','KATANA_CIRCLE_LEFT','KATANA_CIRCLE_RIGHT'],
    lightCombo:['KATANA_DIAGONAL_CUT_R','KATANA_DIAGONAL_CUT_L','KATANA_HORIZONTAL_CUT'],
    heavy:['KATANA_OVERHEAD_CUT','KATANA_DRAW_CUT'],
    gapCloser:['KATANA_DASH_CUT','KATANA_LUNGE_THRUST'],
    aerial:['KATANA_AERIAL_CUT','KATANA_FALLING_CUT'],
    defense:['KATANA_GUARD','KATANA_DEFLECT','KATANA_PARRY_COUNTER'],
    finisher:['KATANA_COMBO_ENDER','KATANA_FINISHER']
  }),
  ONE_HAND_SWORD:freezeCombatPack({
    stance:['SWORD_READY','SWORD_HIGH_GUARD'],
    footwork:['SWORD_STEP_FORWARD','SWORD_STEP_BACK','SWORD_STRAFE_LEFT','SWORD_STRAFE_RIGHT'],
    lightCombo:['SWORD_SLASH_R','SWORD_SLASH_L','SWORD_THRUST'],
    heavy:['SWORD_HEAVY_SLASH','SWORD_OVERHEAD_CHOP'],
    gapCloser:['SWORD_DASH_SLASH','SWORD_LUNGE'],
    aerial:['SWORD_AERIAL_SLASH','SWORD_FALLING_THRUST'],
    defense:['SWORD_GUARD','SWORD_PARRY','SWORD_RIPOSTE'],
    finisher:['SWORD_COMBO_ENDER','SWORD_FINISHER']
  }),
  DUAL_BLADE:freezeCombatPack({
    stance:['DUAL_BLADE_READY','DUAL_BLADE_CROSS_GUARD'],
    footwork:['DUAL_BLADE_RUSH','DUAL_BLADE_BACKSTEP','DUAL_BLADE_CIRCLE'],
    lightCombo:['DUAL_BLADE_SLASH_R','DUAL_BLADE_SLASH_L','DUAL_BLADE_CROSS_CUT'],
    heavy:['DUAL_BLADE_SPIN_CUT','DUAL_BLADE_HEAVY_CROSS'],
    gapCloser:['DUAL_BLADE_DASH_CROSS','DUAL_BLADE_RUSH_STAB'],
    aerial:['DUAL_BLADE_AERIAL_CROSS','DUAL_BLADE_DIVE_CUT'],
    defense:['DUAL_BLADE_CROSS_BLOCK','DUAL_BLADE_DEFLECT','DUAL_BLADE_COUNTER'],
    finisher:['DUAL_BLADE_COMBO_ENDER','DUAL_BLADE_FINISHER']
  }),
  TWO_HAND_SWORD:freezeCombatPack({
    stance:['GREATSWORD_READY','GREATSWORD_SHOULDER_READY'],
    footwork:['GREATSWORD_STEP_FORWARD','GREATSWORD_STEP_BACK','GREATSWORD_PIVOT'],
    lightCombo:['GREATSWORD_SWEEP_R','GREATSWORD_SWEEP_L','GREATSWORD_RISING_CUT'],
    heavy:['GREATSWORD_OVERHEAD_SMASH','GREATSWORD_CHARGED_CLEAVE'],
    gapCloser:['GREATSWORD_RUNNING_CLEAVE','GREATSWORD_LUNGE'],
    aerial:['GREATSWORD_JUMP_SMASH','GREATSWORD_FALLING_CLEAVE'],
    defense:['GREATSWORD_BLOCK','GREATSWORD_BRACE','GREATSWORD_COUNTER_CLEAVE'],
    finisher:['GREATSWORD_COMBO_ENDER','GREATSWORD_FINISHER']
  }),
  DAGGER:freezeCombatPack({
    stance:['DAGGER_READY','DAGGER_REVERSE_GRIP_READY'],
    footwork:['DAGGER_QUICK_STEP','DAGGER_BACKSTEP','DAGGER_SIDE_STEP'],
    lightCombo:['DAGGER_STAB_R','DAGGER_SLASH_L','DAGGER_DOUBLE_STAB'],
    heavy:['DAGGER_HEAVY_STAB','DAGGER_SPIN_SLASH'],
    gapCloser:['DAGGER_DASH_STAB','DAGGER_LUNGE'],
    aerial:['DAGGER_AERIAL_STAB','DAGGER_DIVE_STAB'],
    defense:['DAGGER_DEFLECT','DAGGER_EVADE','DAGGER_COUNTER_STAB'],
    finisher:['DAGGER_COMBO_ENDER','DAGGER_FINISHER']
  }),
  SPEAR:freezeCombatPack({
    stance:['SPEAR_READY','SPEAR_LOW_READY'],
    footwork:['SPEAR_STEP_FORWARD','SPEAR_STEP_BACK','SPEAR_CIRCLE'],
    lightCombo:['SPEAR_THRUST','SPEAR_SWEEP','SPEAR_REVERSE_SWEEP'],
    heavy:['SPEAR_HEAVY_THRUST','SPEAR_OVERHEAD_SLAM'],
    gapCloser:['SPEAR_DASH_THRUST','SPEAR_VAULT_STRIKE'],
    aerial:['SPEAR_AERIAL_THRUST','SPEAR_FALLING_STAB'],
    defense:['SPEAR_GUARD','SPEAR_DEFLECT','SPEAR_COUNTER_THRUST'],
    finisher:['SPEAR_COMBO_ENDER','SPEAR_FINISHER']
  }),
  AXE:freezeCombatPack({
    stance:['AXE_READY','AXE_HIGH_READY'],
    footwork:['AXE_STEP_FORWARD','AXE_STEP_BACK','AXE_PIVOT'],
    lightCombo:['AXE_CHOP_R','AXE_CHOP_L','AXE_HOOK_CUT'],
    heavy:['AXE_OVERHEAD_CHOP','AXE_HEAVY_CLEAVE'],
    gapCloser:['AXE_RUNNING_CHOP','AXE_LUNGE_CLEAVE'],
    aerial:['AXE_JUMP_CHOP','AXE_FALLING_CLEAVE'],
    defense:['AXE_BLOCK','AXE_HOOK_PARRY','AXE_COUNTER_CHOP'],
    finisher:['AXE_COMBO_ENDER','AXE_FINISHER']
  }),
  HAMMER:freezeCombatPack({
    stance:['HAMMER_READY','HAMMER_SHOULDER_READY'],
    footwork:['HAMMER_STEP_FORWARD','HAMMER_STEP_BACK','HAMMER_HEAVY_PIVOT'],
    lightCombo:['HAMMER_SWING_R','HAMMER_SWING_L','HAMMER_BODY_SMASH'],
    heavy:['HAMMER_OVERHEAD_SMASH','HAMMER_GROUND_SMASH'],
    gapCloser:['HAMMER_RUSH_SMASH','HAMMER_LEAP_SMASH'],
    aerial:['HAMMER_AERIAL_SMASH','HAMMER_FALLING_CRUSH'],
    defense:['HAMMER_BRACE','HAMMER_BLOCK','HAMMER_COUNTER_SMASH'],
    finisher:['HAMMER_COMBO_ENDER','HAMMER_FINISHER']
  }),
  STAFF_OR_WAND:freezeCombatPack({
    stance:['STAFF_READY','STAFF_CAST_READY'],
    footwork:['STAFF_STEP_FORWARD','STAFF_STEP_BACK','STAFF_CIRCLE'],
    lightCombo:['STAFF_STRIKE_R','STAFF_STRIKE_L','STAFF_THRUST'],
    heavy:['STAFF_HEAVY_SWEEP','STAFF_GROUND_SLAM'],
    gapCloser:['STAFF_DASH_THRUST','STAFF_SPIN_ENTRY'],
    aerial:['STAFF_AERIAL_SWEEP','STAFF_FALLING_STRIKE'],
    defense:['STAFF_GUARD','STAFF_DEFLECT','STAFF_COUNTER'],
    finisher:['STAFF_COMBO_ENDER','STAFF_FINISHER']
  }),
  SHIELD_SWORD:freezeCombatPack({
    stance:['SHIELD_SWORD_READY','SHIELD_HIGH_GUARD'],
    footwork:['SHIELD_ADVANCE','SHIELD_RETREAT','SHIELD_CIRCLE'],
    lightCombo:['SWORD_SHORT_SLASH','SHIELD_BASH','SWORD_SHORT_THRUST'],
    heavy:['SHIELD_HEAVY_BASH','SWORD_SHIELD_HEAVY_CUT'],
    gapCloser:['SHIELD_CHARGE','SWORD_SHIELD_LUNGE'],
    aerial:['SWORD_SHIELD_AERIAL_CUT'],
    defense:['SHIELD_BLOCK','SHIELD_PARRY','SHIELD_COUNTER_BASH'],
    finisher:['SHIELD_SWORD_COMBO_ENDER','SHIELD_SWORD_FINISHER']
  }),
  BOW:freezeCombatPack({
    stance:['BOW_READY','BOW_AIM_IDLE'],
    footwork:['BOW_STRAFE_LEFT','BOW_STRAFE_RIGHT','BOW_BACKSTEP'],
    lightCombo:['BOW_QUICK_DRAW','BOW_QUICK_SHOT'],
    heavy:['BOW_POWER_DRAW','BOW_CHARGED_SHOT'],
    gapCloser:['BOW_SLIDE_SHOT','BOW_DASH_SHOT'],
    aerial:['BOW_JUMP_SHOT','BOW_FALLING_SHOT'],
    defense:['BOW_EVADE_LEFT','BOW_EVADE_RIGHT','BOW_COUNTER_SHOT'],
    finisher:['BOW_FINISHER_SHOT']
  }),
  FIREARM:freezeCombatPack({
    stance:['FIREARM_READY','FIREARM_AIM_IDLE'],
    footwork:['FIREARM_STRAFE_LEFT','FIREARM_STRAFE_RIGHT','FIREARM_BACKSTEP'],
    lightCombo:['FIREARM_QUICK_SHOT','FIREARM_DOUBLE_TAP'],
    heavy:['FIREARM_AIMED_SHOT','FIREARM_POWER_SHOT'],
    gapCloser:['FIREARM_SLIDE_SHOT','FIREARM_DASH_SHOT'],
    aerial:['FIREARM_JUMP_SHOT','FIREARM_FALLING_SHOT'],
    defense:['FIREARM_EVADE_LEFT','FIREARM_EVADE_RIGHT','FIREARM_COUNTER_SHOT'],
    finisher:['FIREARM_FINISHER_SHOT']
  })
});

export const UNARMED_MARTIAL_ARTS_STYLES=Object.freeze({
  BOXING:freezeCombatPack({
    stance:['BOXING_ORTHODOX','BOXING_SOUTHPAW'],
    footwork:['BOXING_SHUFFLE_FORWARD','BOXING_SHUFFLE_BACK','BOXING_PIVOT_LEFT','BOXING_PIVOT_RIGHT'],
    lightCombo:['BOXING_JAB','BOXING_CROSS','BOXING_LEAD_HOOK'],
    heavy:['BOXING_REAR_HOOK','BOXING_UPPERCUT','BOXING_OVERHAND'],
    defense:['BOXING_HIGH_GUARD','BOXING_SLIP_LEFT','BOXING_SLIP_RIGHT','BOXING_WEAVE'],
    grapple:[]
  }),
  KICKBOXING:freezeCombatPack({
    stance:['KICKBOXING_GUARD'],
    footwork:['KICKBOXING_STEP','KICKBOXING_PIVOT'],
    lightCombo:['KICKBOXING_JAB','KICKBOXING_CROSS','KICKBOXING_LOW_KICK'],
    heavy:['KICKBOXING_HIGH_ROUND_KICK','KICKBOXING_SPINNING_BACK_KICK'],
    defense:['KICKBOXING_CHECK','KICKBOXING_SWAY','KICKBOXING_COUNTER_CROSS'],
    grapple:['KICKBOXING_CLINCH_BREAK']
  }),
  MUAY_THAI:freezeCombatPack({
    stance:['MUAY_THAI_HIGH_GUARD'],
    footwork:['MUAY_THAI_STEP','MUAY_THAI_CIRCLE'],
    lightCombo:['MUAY_THAI_JAB','MUAY_THAI_CROSS','MUAY_THAI_ELBOW'],
    heavy:['MUAY_THAI_KNEE','MUAY_THAI_ROUND_KICK','MUAY_THAI_SPINNING_ELBOW'],
    defense:['MUAY_THAI_LEG_CHECK','MUAY_THAI_LONG_GUARD','MUAY_THAI_COUNTER_ELBOW'],
    grapple:['MUAY_THAI_CLINCH_ENTRY','MUAY_THAI_CLINCH_KNEE']
  }),
  KARATE:freezeCombatPack({
    stance:['KARATE_KAMAE'],
    footwork:['KARATE_SLIDE_STEP','KARATE_PIVOT'],
    lightCombo:['KARATE_STRAIGHT_PUNCH','KARATE_REVERSE_PUNCH','KARATE_FRONT_KICK'],
    heavy:['KARATE_SIDE_KICK','KARATE_ROUND_KICK','KARATE_SPIN_BACK_KICK'],
    defense:['KARATE_HIGH_BLOCK','KARATE_LOW_BLOCK','KARATE_COUNTER_PUNCH'],
    grapple:['KARATE_SWEEP']
  }),
  TAEKWONDO:freezeCombatPack({
    stance:['TAEKWONDO_GUARD'],
    footwork:['TAEKWONDO_BOUNCE_STEP','TAEKWONDO_SWITCH_STEP'],
    lightCombo:['TAEKWONDO_FRONT_KICK','TAEKWONDO_SIDE_KICK','TAEKWONDO_ROUND_KICK'],
    heavy:['TAEKWONDO_AXE_KICK','TAEKWONDO_SPINNING_HOOK_KICK','TAEKWONDO_JUMP_ROUND_KICK'],
    defense:['TAEKWONDO_BACKSTEP','TAEKWONDO_SIDE_EVADE','TAEKWONDO_COUNTER_KICK'],
    grapple:[]
  }),
  SANDA:freezeCombatPack({
    stance:['SANDA_GUARD'],
    footwork:['SANDA_STEP','SANDA_ANGLE_STEP'],
    lightCombo:['SANDA_JAB','SANDA_CROSS','SANDA_SIDE_KICK'],
    heavy:['SANDA_SPIN_KICK','SANDA_PUSH_KICK'],
    defense:['SANDA_CATCH_KICK','SANDA_PARRY','SANDA_COUNTER'],
    grapple:['SANDA_BODY_LOCK','SANDA_TRIP','SANDA_SIDE_THROW']
  }),
  WUSHU_KUNG_FU:freezeCombatPack({
    stance:['WUSHU_OPEN_HAND_GUARD'],
    footwork:['WUSHU_CIRCLE_STEP','WUSHU_BURST_STEP'],
    lightCombo:['WUSHU_PALM','WUSHU_BACKFIST','WUSHU_LOW_SWEEP'],
    heavy:['WUSHU_SPINNING_KICK','WUSHU_DOUBLE_PALM'],
    defense:['WUSHU_DEFLECT','WUSHU_SPIN_EVADE','WUSHU_COUNTER_PALM'],
    grapple:['WUSHU_ARM_REDIRECT','WUSHU_TRIP']
  }),
  WRESTLING:freezeCombatPack({
    stance:['WRESTLING_LOW_STANCE'],
    footwork:['WRESTLING_LEVEL_CHANGE','WRESTLING_SHUFFLE'],
    lightCombo:['WRESTLING_HAND_FIGHT','WRESTLING_SHOULDER_CHECK'],
    heavy:['WRESTLING_DOUBLE_LEG','WRESTLING_BODY_SLAM'],
    defense:['WRESTLING_SPRAWL','WRESTLING_FRAME_ESCAPE'],
    grapple:['WRESTLING_SINGLE_LEG','WRESTLING_DOUBLE_LEG','WRESTLING_BODY_LOCK','WRESTLING_GAME_SUPLEX']
  }),
  JUDO_THROWING:freezeCombatPack({
    stance:['JUDO_READY'],
    footwork:['JUDO_CIRCLE_STEP','JUDO_ENTRY_STEP'],
    lightCombo:['JUDO_GRIP_ENTRY','JUDO_FOOT_SWEEP'],
    heavy:['JUDO_HIP_THROW','JUDO_SHOULDER_THROW'],
    defense:['JUDO_GRIP_BREAK','JUDO_COUNTER_THROW'],
    grapple:['JUDO_REAP_THROW','JUDO_HIP_THROW','JUDO_SHOULDER_THROW','JUDO_BREAKFALL']
  }),
  JIU_JITSU_GRAPPLING:freezeCombatPack({
    stance:['JIU_JITSU_READY'],
    footwork:['JIU_JITSU_ENTRY_STEP','JIU_JITSU_LEVEL_CHANGE'],
    lightCombo:['JIU_JITSU_GRIP_ENTRY','JIU_JITSU_TRIP'],
    heavy:['JIU_JITSU_TAKEDOWN','JIU_JITSU_SWEEP'],
    defense:['JIU_JITSU_FRAME_ESCAPE','JIU_JITSU_TECH_ROLL'],
    grapple:['JIU_JITSU_BODY_LOCK','JIU_JITSU_TAKEDOWN','JIU_JITSU_REVERSAL','JIU_JITSU_GRAB_ESCAPE']
  }),
  MMA_HYBRID:freezeCombatPack({
    stance:['MMA_GUARD'],
    footwork:['MMA_STEP','MMA_ANGLE_STEP','MMA_LEVEL_CHANGE'],
    lightCombo:['MMA_JAB','MMA_CROSS','MMA_LOW_KICK'],
    heavy:['MMA_HIGH_KICK','MMA_FLYING_KNEE','MMA_TAKEDOWN'],
    defense:['MMA_HIGH_GUARD','MMA_SLIP','MMA_SPRAWL','MMA_COUNTER_CROSS'],
    grapple:['MMA_CLINCH','MMA_DOUBLE_LEG','MMA_BODY_LOCK','MMA_TRIP']
  }),
  STREET_BRAWLER:freezeCombatPack({
    stance:['BRAWLER_READY'],
    footwork:['BRAWLER_STEP','BRAWLER_RUSH'],
    lightCombo:['BRAWLER_JAB','BRAWLER_HOOK','BRAWLER_BODY_SHOT'],
    heavy:['BRAWLER_OVERHAND','BRAWLER_HEADBUTT','BRAWLER_SHOULDER_CHECK'],
    defense:['BRAWLER_COVER','BRAWLER_SWAY','BRAWLER_COUNTER_HOOK'],
    grapple:['BRAWLER_GRAB','BRAWLER_PUSH_THROW']
  }),
  WUXIA_UNARMED_FANTASY:freezeCombatPack({
    stance:['WUXIA_OPEN_HAND_READY'],
    footwork:['WUXIA_GLIDE_STEP','WUXIA_AFTERIMAGE_STEP','WUXIA_SPIN_EVADE'],
    lightCombo:['WUXIA_PALM_CHAIN','WUXIA_FINGER_CHAIN','WUXIA_CLAW_CHAIN'],
    heavy:['WUXIA_DOUBLE_PALM','WUXIA_LAUNCH_STRIKE','WUXIA_AERIAL_KICK'],
    defense:['WUXIA_DEFLECT','WUXIA_COUNTER_PALM','WUXIA_SPIN_EVADE'],
    grapple:['WUXIA_REDIRECT_THROW','WUXIA_SWEEP_THROW']
  })
});

export const DUEL_COMBAT_AUTHORING_PHASES=Object.freeze({
  READY_STANCE:Object.freeze([
    Object.freeze({t:0,phase:'BASE_GUARD'}),
    Object.freeze({t:.5,phase:'BREATH_WEIGHT_SHIFT'}),
    Object.freeze({t:1,phase:'BASE_GUARD'})
  ]),
  COMBAT_LOCOMOTION:Object.freeze([
    Object.freeze({t:0,phase:'PLANT'}),
    Object.freeze({t:.25,phase:'PUSH'}),
    Object.freeze({t:.5,phase:'PASS'}),
    Object.freeze({t:.75,phase:'CATCH'}),
    Object.freeze({t:1,phase:'PLANT'})
  ]),
  LIGHT_COMBO:Object.freeze([
    Object.freeze({t:0,phase:'NEUTRAL'}),
    Object.freeze({t:.10,phase:'ANTICIPATION'}),
    Object.freeze({t:.30,phase:'STARTUP'}),
    Object.freeze({t:.48,phase:'ACTIVE_CONTACT'}),
    Object.freeze({t:.64,phase:'FOLLOW_THROUGH'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  HEAVY_ATTACK:Object.freeze([
    Object.freeze({t:0,phase:'NEUTRAL'}),
    Object.freeze({t:.18,phase:'ANTICIPATION'}),
    Object.freeze({t:.42,phase:'STARTUP'}),
    Object.freeze({t:.62,phase:'ACTIVE_CONTACT'}),
    Object.freeze({t:.80,phase:'RECOIL'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  GAP_CLOSER:Object.freeze([
    Object.freeze({t:0,phase:'LOAD'}),
    Object.freeze({t:.18,phase:'LAUNCH'}),
    Object.freeze({t:.46,phase:'TRAVEL'}),
    Object.freeze({t:.62,phase:'ACTIVE_CONTACT'}),
    Object.freeze({t:.78,phase:'BRAKE'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  AERIAL_ATTACK:Object.freeze([
    Object.freeze({t:0,phase:'TAKEOFF_OR_ENTRY'}),
    Object.freeze({t:.28,phase:'AIR_PREPARE'}),
    Object.freeze({t:.52,phase:'ACTIVE_CONTACT'}),
    Object.freeze({t:.72,phase:'FALL_OR_SETTLE'}),
    Object.freeze({t:1,phase:'LAND_RECOVERY'})
  ]),
  GUARD:Object.freeze([
    Object.freeze({t:0,phase:'NEUTRAL'}),
    Object.freeze({t:.18,phase:'GUARD_RAISE'}),
    Object.freeze({t:.5,phase:'GUARD_HOLD'}),
    Object.freeze({t:1,phase:'GUARD_RETURN'})
  ]),
  PARRY_OR_COUNTER:Object.freeze([
    Object.freeze({t:0,phase:'READ'}),
    Object.freeze({t:.20,phase:'DEFLECT_PREPARE'}),
    Object.freeze({t:.38,phase:'CONTACT'}),
    Object.freeze({t:.58,phase:'COUNTER_OPTION'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  DODGE:Object.freeze([
    Object.freeze({t:0,phase:'LOAD'}),
    Object.freeze({t:.20,phase:'EVADE_ENTRY'}),
    Object.freeze({t:.48,phase:'CLEAR'}),
    Object.freeze({t:.72,phase:'REPLANT'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  HIT_REACTION:Object.freeze([
    Object.freeze({t:0,phase:'IMPACT'}),
    Object.freeze({t:.22,phase:'RECOIL'}),
    Object.freeze({t:.62,phase:'STAGGER'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ]),
  KNOCKDOWN:Object.freeze([
    Object.freeze({t:0,phase:'IMPACT'}),
    Object.freeze({t:.25,phase:'BALANCE_BREAK'}),
    Object.freeze({t:.62,phase:'GROUND_CONTACT'}),
    Object.freeze({t:1,phase:'DOWN'})
  ]),
  GET_UP:Object.freeze([
    Object.freeze({t:0,phase:'DOWN'}),
    Object.freeze({t:.28,phase:'POST_HAND_OR_KNEE'}),
    Object.freeze({t:.58,phase:'RISE'}),
    Object.freeze({t:.82,phase:'REPLANT'}),
    Object.freeze({t:1,phase:'READY'})
  ]),
  FINISHER:Object.freeze([
    Object.freeze({t:0,phase:'NEUTRAL'}),
    Object.freeze({t:.16,phase:'SIGNATURE_ANTICIPATION'}),
    Object.freeze({t:.44,phase:'COMMIT'}),
    Object.freeze({t:.62,phase:'ACTIVE_CONTACT'}),
    Object.freeze({t:.82,phase:'SIGNATURE_FOLLOW_THROUGH'}),
    Object.freeze({t:1,phase:'RECOVERY'})
  ])
});

export const DUEL_COMBAT_WEAPON_MECHANICS=Object.freeze({
  UNARMED:Object.freeze({stance:'MOBILE_GUARD',grip:'OPEN_OR_CLOSED_HAND',pelvisYaw:12,torsoCounterYaw:8,leadFootPlant:true,contact:'FIST_ELBOW_KNEE_FOOT',arc:'BODY_DRIVEN_STRIKE'}),
  KATANA:Object.freeze({stance:'SIDE_ON_TWO_HAND',grip:'TWO_HAND_OFFSET',pelvisYaw:18,torsoCounterYaw:12,leadFootPlant:true,contact:'BLADE_EDGE_OR_TIP',arc:'DIAGONAL_OR_HORIZONTAL_THROUGH_TARGET'}),
  ONE_HAND_SWORD:Object.freeze({stance:'BALANCED_ONE_HAND',grip:'ONE_HAND_WITH_FREE_GUARD',pelvisYaw:16,torsoCounterYaw:10,leadFootPlant:true,contact:'BLADE_EDGE_OR_TIP',arc:'SLASH_THRUST_MIX'}),
  DUAL_BLADE:Object.freeze({stance:'OPEN_DUAL_GUARD',grip:'BOTH_HANDS_SEPARATE',pelvisYaw:20,torsoCounterYaw:14,leadFootPlant:true,contact:'ALTERNATING_BLADES',arc:'ALTERNATING_CROSS_ARCS'}),
  TWO_HAND_SWORD:Object.freeze({stance:'HEAVY_TWO_HAND',grip:'WIDE_TWO_HAND',pelvisYaw:24,torsoCounterYaw:16,leadFootPlant:true,contact:'BLADE_MASS_THROUGH_TARGET',arc:'LARGE_COMMITTED_CLEAVE'}),
  DAGGER:Object.freeze({stance:'CLOSE_FAST_GUARD',grip:'FORWARD_OR_REVERSE',pelvisYaw:14,torsoCounterYaw:10,leadFootPlant:true,contact:'TIP_OR_SHORT_EDGE',arc:'SHORT_STAB_AND_CUT'}),
  SPEAR:Object.freeze({stance:'LONG_LINE_GUARD',grip:'TWO_HAND_SLIDE',pelvisYaw:14,torsoCounterYaw:8,leadFootPlant:true,contact:'SPEAR_TIP_OR_SHAFT',arc:'LINEAR_THRUST_AND_SWEEP'}),
  AXE:Object.freeze({stance:'HEAVY_HEAD_READY',grip:'ONE_OR_TWO_HAND',pelvisYaw:22,torsoCounterYaw:14,leadFootPlant:true,contact:'AXE_HEAD',arc:'COMMITTED_CHOP_AND_HOOK'}),
  HAMMER:Object.freeze({stance:'HEAVY_SHOULDER_READY',grip:'TWO_HAND_POWER',pelvisYaw:24,torsoCounterYaw:16,leadFootPlant:true,contact:'HAMMER_HEAD',arc:'CRUSHING_SWING_OR_VERTICAL_SMASH'}),
  STAFF_OR_WAND:Object.freeze({stance:'CENTERLINE_CAST_OR_STAFF',grip:'STAFF_TWO_HAND_OR_WAND_ONE_HAND',pelvisYaw:12,torsoCounterYaw:8,leadFootPlant:true,contact:'STAFF_END_OR_CAST_HAND',arc:'THRUST_SWEEP_CAST'}),
  SHIELD_SWORD:Object.freeze({stance:'SHIELD_LEAD',grip:'SHIELD_PLUS_ONE_HAND_SWORD',pelvisYaw:12,torsoCounterYaw:6,leadFootPlant:true,contact:'SHIELD_FACE_OR_BLADE',arc:'COVERED_SHORT_ARC'}),
  BOW:Object.freeze({stance:'SIDE_ON_RANGED',grip:'BOW_AND_DRAW_HAND',pelvisYaw:8,torsoCounterYaw:4,leadFootPlant:true,contact:'STRING_RELEASE',arc:'DRAW_RELEASE_RECOIL'}),
  FIREARM:Object.freeze({stance:'SQUARE_OR_BLaded_AIM',grip:'TWO_HAND_AIM',pelvisYaw:6,torsoCounterYaw:4,leadFootPlant:true,contact:'TRIGGER_RECOIL',arc:'AIM_RECOIL_RECOVER'})
});

export const UNARMED_MARTIAL_MECHANICS=Object.freeze({
  BOXING:Object.freeze({guard:'HIGH_COMPACT',footwork:'SHUFFLE_PIVOT',hipRotation:24,shoulderChain:28,kickBias:0,clinchBias:4}),
  KICKBOXING:Object.freeze({guard:'HIGH_BALANCED',footwork:'STEP_PIVOT',hipRotation:28,shoulderChain:24,kickBias:24,clinchBias:8}),
  MUAY_THAI:Object.freeze({guard:'HIGH_LONG',footwork:'PLANTED_STEP',hipRotation:30,shoulderChain:22,kickBias:28,clinchBias:24}),
  KARATE:Object.freeze({guard:'BLaded_KAMAE',footwork:'SLIDE_ENTRY',hipRotation:26,shoulderChain:24,kickBias:20,clinchBias:6}),
  TAEKWONDO:Object.freeze({guard:'MOBILE_KICK_GUARD',footwork:'BOUNCE_SWITCH',hipRotation:28,shoulderChain:14,kickBias:34,clinchBias:2}),
  SANDA:Object.freeze({guard:'BALANCED_STRIKE_THROW',footwork:'ANGLE_STEP',hipRotation:28,shoulderChain:22,kickBias:24,clinchBias:22}),
  WUSHU_KUNG_FU:Object.freeze({guard:'OPEN_HAND_FLOW',footwork:'CIRCLE_BURST',hipRotation:30,shoulderChain:26,kickBias:22,clinchBias:14}),
  WRESTLING:Object.freeze({guard:'LOW_HAND_FIGHT',footwork:'LEVEL_CHANGE_SHUFFLE',hipRotation:18,shoulderChain:18,kickBias:0,clinchBias:34}),
  JUDO_THROWING:Object.freeze({guard:'UPRIGHT_GRIP_READY',footwork:'CIRCLE_ENTRY',hipRotation:22,shoulderChain:20,kickBias:0,clinchBias:34}),
  JIU_JITSU_GRAPPLING:Object.freeze({guard:'LOW_GRAPPLE_READY',footwork:'LEVEL_CHANGE_ENTRY',hipRotation:18,shoulderChain:18,kickBias:0,clinchBias:34}),
  MMA_HYBRID:Object.freeze({guard:'HIGH_MIXED',footwork:'ANGLE_LEVEL_CHANGE',hipRotation:28,shoulderChain:24,kickBias:22,clinchBias:24}),
  STREET_BRAWLER:Object.freeze({guard:'LOOSE_POWER_GUARD',footwork:'PRESSURE_STEP',hipRotation:30,shoulderChain:30,kickBias:10,clinchBias:18}),
  WUXIA_UNARMED_FANTASY:Object.freeze({guard:'OPEN_HAND_FLOW',footwork:'GLIDE_SPIN',hipRotation:34,shoulderChain:30,kickBias:28,clinchBias:14})
});

export function createDuelCombatAuthoringRecipe({
  weaponFamily='UNARMED',
  martialStyle='MMA_HYBRID',
  role='LIGHT_COMBO',
  motionId='',
  platform='ROBLOX'
}={}){
  const loadout=createDuelCombatMotionLoadout({weaponFamily,martialStyle,platform});
  const normalizedRole=upper(role)||'LIGHT_COMBO';
  const groupByRole=Object.freeze({
    READY_STANCE:'stance',
    COMBAT_LOCOMOTION:'footwork',
    LIGHT_COMBO:'lightCombo',
    HEAVY_ATTACK:'heavy',
    GAP_CLOSER:'gapCloser',
    AERIAL_ATTACK:'aerial',
    GUARD:'defense',
    PARRY_OR_COUNTER:'defense',
    DODGE:'defense',
    HIT_REACTION:'reactions',
    KNOCKDOWN:'reactions',
    GET_UP:'recovery',
    FINISHER:'finisher',
    GRAPPLE:'grapple'
  });
  const group=groupByRole[normalizedRole]||'lightCombo';
  const candidates=loadout.groups[group]||[];
  const selectedMotion=text(motionId)||candidates[0]||null;
  const weaponMechanics=DUEL_COMBAT_WEAPON_MECHANICS[loadout.weaponFamily]||DUEL_COMBAT_WEAPON_MECHANICS.UNARMED;
  const martialMechanics=loadout.weaponFamily==='UNARMED'
    ?(UNARMED_MARTIAL_MECHANICS[loadout.martialStyle]||UNARMED_MARTIAL_MECHANICS.MMA_HYBRID)
    :null;
  const phases=DUEL_COMBAT_AUTHORING_PHASES[normalizedRole]||DUEL_COMBAT_AUTHORING_PHASES.LIGHT_COMBO;
  return Object.freeze({
    target:DUEL_COMBAT_MOTION_TARGET,
    platform:upper(platform),
    role:normalizedRole,
    motionId:selectedMotion,
    candidates:freezeList(candidates),
    phases,
    weaponMechanics,
    martialMechanics,
    jointPriority:Object.freeze(['FEET','HIPS','SPINE','SHOULDERS','ARMS_OR_WEAPON','HEAD_GAZE']),
    authoredMotionRequirements:Object.freeze({
      fullBodyWeightTransfer:true,
      plantedFootDuringCommittedContact:true,
      pelvisStartsMotionBeforeOrWithShoulder:true,
      torsoCounterRotation:true,
      handWeaponOrStrikeContactAligned:true,
      guardReturnsAfterRecovery:true,
      transitionCrossFadeRequired:true,
      directionMatchedHitReactionRequired:true,
      rootTranslationOwnedByGameplay:true
    }),
    nativePath:upper(platform)==='ROBLOX'
      ?Object.freeze({primary:'ANIMATOR_ANIMATIONTRACK',cleanup:'MOTOR6D_OR_BONE_TRANSFORM',contact:'IKCONTROL_WHEN_AVAILABLE',rootOnlyForbidden:true})
      :Object.freeze({primary:'ANIMATOR_CLIP',cleanup:'HUMANOID_RETARGET_AVATAR_MASK',contact:'ANIMATION_RIGGING_OR_IK',rootOnlyForbidden:true}),
    timingPolicy:'NORMALIZED_PHASES_MUST_FIT_EXISTING_GAMEPLAY_ATTACK_WINDOWS',
    exactThirdPartyClipCopy:false,
    nativeRuntimeVerificationRequired:true,
    gameplayAuthority:false
  });
}


export const HERO_STANDARD_RIG_TARGET='HIGH_END_SHARED_HERO_STANDARD_RIG';

export const HERO_STANDARD_RIG_MOTION_PACK=Object.freeze({
  locomotion:freezeList([
    'HERO_IDLE_RELAXED','HERO_IDLE_ALERT','HERO_WALK_FORWARD','HERO_RUN','HERO_SPRINT',
    'HERO_START','HERO_STOP','HERO_TURN_90','HERO_TURN_180','HERO_BACKWARD'
  ]),
  movementAction:freezeList([
    'HERO_JUMP_START','HERO_JUMP_AIR','HERO_LAND','HERO_DODGE_LEFT',
    'HERO_DODGE_RIGHT','HERO_DODGE_BACK','HERO_DASH','HERO_CROUCH'
  ]),
  combatCore:freezeList([
    'HERO_ATTACK_1','HERO_ATTACK_2','HERO_ATTACK_3','HERO_ATTACK_4',
    'HERO_HEAVY_ATTACK_1','HERO_HEAVY_ATTACK_2','HERO_DASH_ATTACK','HERO_AERIAL_ATTACK',
    'HERO_GUARD','HERO_PARRY','HERO_FINISHER','HERO_SKILL_CAST'
  ]),
  reaction:freezeList([
    'HERO_HIT_FRONT','HERO_HIT_BACK','HERO_HIT_LEFT','HERO_HIT_RIGHT','HERO_STUN','HERO_KNOCKDOWN'
  ]),
  recovery:freezeList([
    'HERO_DEATH_FRONT','HERO_DEATH_BACK','HERO_GET_UP','HERO_SPAWN'
  ])
});

export const HERO_SURVIVAL_WEAPON_FAMILIES=freezeList([
  'ONE_HAND_SWORD','SPEAR','AXE','HAMMER','DAGGER','BOW'
]);

export const SURVIVAL_PLAYER_MOTION_PACK=Object.freeze({
  locomotion:freezeList([
    'SURVIVAL_IDLE_RELAXED','SURVIVAL_IDLE_WEIGHT_SHIFT','SURVIVAL_WALK_FORWARD','SURVIVAL_WALK_BACK',
    'SURVIVAL_STRAFE_LEFT','SURVIVAL_STRAFE_RIGHT','SURVIVAL_JOG','SURVIVAL_RUN','SURVIVAL_SPRINT',
    'SURVIVAL_START','SURVIVAL_STOP','SURVIVAL_TURN_45','SURVIVAL_TURN_90','SURVIVAL_TURN_180',
    'SURVIVAL_JUMP_START','SURVIVAL_JUMP_AIR','SURVIVAL_LAND','SURVIVAL_CROUCH_IDLE','SURVIVAL_CROUCH_WALK'
  ]),
  tool:freezeList([
    'SURVIVAL_TOOL_EQUIP','SURVIVAL_TOOL_UNEQUIP','SURVIVAL_AXE_CHOP_R','SURVIVAL_AXE_CHOP_L',
    'SURVIVAL_PICKAXE_SWING','SURVIVAL_HAMMER_SWING','SURVIVAL_SPEAR_THRUST','SURVIVAL_TOOL_READY'
  ]),
  interaction:freezeList([
    'SURVIVAL_PICKUP_GROUND','SURVIVAL_GATHER_LOW','SURVIVAL_INTERACT_FORWARD','SURVIVAL_OPEN_CONTAINER',
    'SURVIVAL_CARRY_LIGHT','SURVIVAL_PLACE_OBJECT','SURVIVAL_CRAFT','SURVIVAL_EAT','SURVIVAL_DRINK',
    'SURVIVAL_BANDAGE','SURVIVAL_CARRY_HEAVY','SURVIVAL_PUSH','SURVIVAL_PULL','SURVIVAL_LADDER_CLIMB',
    'SURVIVAL_SWIM','SURVIVAL_EXHAUSTED_IDLE'
  ]),
  reaction:freezeList([
    'SURVIVAL_HIT_FRONT','SURVIVAL_HIT_BACK','SURVIVAL_HIT_LEFT','SURVIVAL_HIT_RIGHT',
    'SURVIVAL_STAGGER','SURVIVAL_KNOCKDOWN','SURVIVAL_GET_UP'
  ]),
  death:freezeList(['SURVIVAL_DEATH_FRONT','SURVIVAL_DEATH_BACK','SURVIVAL_DEATH_SIDE'])
});


export const MOUNT_RIDER_MOTION_PACKS=Object.freeze({
  HORSE:Object.freeze({
    pair:freezeList([
      'HORSE_MOUNT','HORSE_DISMOUNT','HORSE_RIDER_IDLE','HORSE_WALK','HORSE_RUN','HORSE_SPRINT',
      'HORSE_TURN_LEFT','HORSE_TURN_RIGHT','HORSE_HARD_STOP','HORSE_JUMP','HORSE_LAND','HORSE_HIT'
    ]),
    signature:freezeList(['HORSE_REAR','HORSE_STARTLE'])
  }),
  WOLF:Object.freeze({
    pair:freezeList([
      'WOLF_MOUNT','WOLF_DISMOUNT','WOLF_RIDER_IDLE','WOLF_WALK','WOLF_RUN','WOLF_SPRINT',
      'WOLF_TURN_LEFT','WOLF_TURN_RIGHT','WOLF_HARD_STOP','WOLF_JUMP','WOLF_LAND','WOLF_HIT'
    ]),
    signature:freezeList(['WOLF_GROWL','WOLF_POUNCE','WOLF_BITE'])
  }),
  mountedCombat:freezeList([
    'MOUNTED_SWORD_ATTACK','MOUNTED_SPEAR_THRUST','MOUNTED_BOW_SHOT'
  ])
});

const wildlifePack=pack=>Object.freeze(Object.fromEntries(
  Object.entries(pack).map(([key,value])=>[key,Array.isArray(value)?freezeList(value):value])
));

export const SURVIVAL_WILDLIFE_MOTION_PACKS=Object.freeze({
  HEAVY_QUADRUPED:wildlifePack({
    idle:['WILDLIFE_HEAVY_IDLE','WILDLIFE_HEAVY_BREATH','WILDLIFE_HEAVY_LOOK'],
    locomotion:['WILDLIFE_HEAVY_WALK','WILDLIFE_HEAVY_TROT','WILDLIFE_HEAVY_RUN','WILDLIFE_HEAVY_CHARGE','WILDLIFE_HEAVY_TURN_L','WILDLIFE_HEAVY_TURN_R','WILDLIFE_HEAVY_STOP'],
    acting:['WILDLIFE_HEAVY_SNIFF','WILDLIFE_HEAVY_GRAZE_OR_FORAGE','WILDLIFE_HEAVY_ALERT','WILDLIFE_HEAVY_THREAT'],
    attack:['WILDLIFE_HEAVY_BITE','WILDLIFE_HEAVY_SWIPE','WILDLIFE_HEAVY_RAM'],
    reaction:['WILDLIFE_HEAVY_HIT_FRONT','WILDLIFE_HEAVY_HIT_SIDE','WILDLIFE_HEAVY_STAGGER','WILDLIFE_HEAVY_KNOCKDOWN'],
    death:['WILDLIFE_HEAVY_DEATH_FRONT','WILDLIFE_HEAVY_DEATH_SIDE']
  }),
  LOW_HEAVY_QUADRUPED:wildlifePack({
    idle:['BOAR_IDLE','BOAR_SNIFF_IDLE'],
    locomotion:['BOAR_WALK','BOAR_TROT','BOAR_RUN','BOAR_CHARGE','BOAR_TURN_L','BOAR_TURN_R','BOAR_STOP'],
    acting:['BOAR_ROOT_GROUND','BOAR_SNIFF','BOAR_ALERT','BOAR_THREAT'],
    attack:['BOAR_TUSK_UPPERCUT','BOAR_SIDE_GORE','BOAR_CHARGE_RAM'],
    reaction:['BOAR_HIT_FRONT','BOAR_HIT_SIDE','BOAR_STAGGER','BOAR_KNOCKDOWN'],
    death:['BOAR_DEATH_SIDE','BOAR_DEATH_FORWARD']
  }),
  HOOFED_LIGHT:wildlifePack({
    idle:['HOOFED_IDLE','HOOFED_EAR_FLICK','HOOFED_LOOK'],
    locomotion:['HOOFED_WALK','HOOFED_TROT','HOOFED_RUN','HOOFED_SPRINT','HOOFED_TURN_L','HOOFED_TURN_R','HOOFED_BRAKE'],
    acting:['HOOFED_GRAZE','HOOFED_HEAD_RAISE','HOOFED_ALERT','HOOFED_STARTLE'],
    attack:['HOOFED_FRONT_KICK','HOOFED_REAR_KICK','HOOFED_SHOVE'],
    reaction:['HOOFED_HIT_FRONT','HOOFED_HIT_SIDE','HOOFED_STUMBLE'],
    death:['HOOFED_DEATH_SIDE','HOOFED_DEATH_FORWARD']
  }),
  HOOFED_HEAVY:wildlifePack({
    idle:['HOOFED_HEAVY_IDLE','HOOFED_HEAVY_BREATH','HOOFED_HEAVY_LOOK'],
    locomotion:['HOOFED_HEAVY_WALK','HOOFED_HEAVY_TROT','HOOFED_HEAVY_RUN','HOOFED_HEAVY_CHARGE','HOOFED_HEAVY_TURN_L','HOOFED_HEAVY_TURN_R','HOOFED_HEAVY_STOP'],
    acting:['HOOFED_HEAVY_GRAZE','HOOFED_HEAVY_ALERT','HOOFED_HEAVY_THREAT'],
    attack:['HOOFED_HEAVY_ANTLER_SHOVE','HOOFED_HEAVY_FRONT_KICK','HOOFED_HEAVY_CHARGE'],
    reaction:['HOOFED_HEAVY_HIT_FRONT','HOOFED_HEAVY_HIT_SIDE','HOOFED_HEAVY_STAGGER'],
    death:['HOOFED_HEAVY_DEATH_SIDE','HOOFED_HEAVY_DEATH_FORWARD']
  }),
  CANINE:wildlifePack({
    idle:['CANINE_IDLE','CANINE_BREATH','CANINE_LOOK'],
    locomotion:['CANINE_WALK','CANINE_TROT','CANINE_RUN','CANINE_SPRINT','CANINE_TURN_L','CANINE_TURN_R','CANINE_STOP','CANINE_STALK'],
    acting:['CANINE_SNIFF','CANINE_ALERT','CANINE_GROWL','CANINE_HOWL_OR_BARK'],
    attack:['CANINE_BITE','CANINE_LUNGE_BITE','CANINE_SIDE_BITE'],
    reaction:['CANINE_HIT_FRONT','CANINE_HIT_SIDE','CANINE_STAGGER','CANINE_KNOCKDOWN','CANINE_GET_UP'],
    death:['CANINE_DEATH_SIDE','CANINE_DEATH_FORWARD']
  }),
  CANINE_LIGHT:wildlifePack({
    idle:['CANINE_LIGHT_IDLE','CANINE_LIGHT_EAR_TWITCH','CANINE_LIGHT_LOOK'],
    locomotion:['CANINE_LIGHT_WALK','CANINE_LIGHT_TROT','CANINE_LIGHT_RUN','CANINE_LIGHT_SPRINT','CANINE_LIGHT_TURN_L','CANINE_LIGHT_TURN_R','CANINE_LIGHT_STOP'],
    acting:['CANINE_LIGHT_SNIFF','CANINE_LIGHT_ALERT','CANINE_LIGHT_FLEE_LOOK'],
    attack:['CANINE_LIGHT_BITE','CANINE_LIGHT_LUNGE'],
    reaction:['CANINE_LIGHT_HIT','CANINE_LIGHT_STUMBLE'],
    death:['CANINE_LIGHT_DEATH_SIDE','CANINE_LIGHT_DEATH_FORWARD']
  }),
  SMALL_MAMMAL:wildlifePack({
    idle:['SMALL_MAMMAL_IDLE','SMALL_MAMMAL_LOOK','SMALL_MAMMAL_GROOM'],
    locomotion:['SMALL_MAMMAL_WALK','SMALL_MAMMAL_SCURRY','SMALL_MAMMAL_RUN','SMALL_MAMMAL_TURN','SMALL_MAMMAL_STOP'],
    acting:['SMALL_MAMMAL_FORAGE','SMALL_MAMMAL_SNIFF','SMALL_MAMMAL_ALERT','SMALL_MAMMAL_FLEE'],
    attack:['SMALL_MAMMAL_BITE_OR_SCRATCH'],
    reaction:['SMALL_MAMMAL_HIT','SMALL_MAMMAL_STUN'],
    death:['SMALL_MAMMAL_DEATH']
  }),
  HOPPER:wildlifePack({
    idle:['RABBIT_IDLE','RABBIT_EAR_TWITCH','RABBIT_LOOK'],
    locomotion:['RABBIT_HOP_SLOW','RABBIT_HOP_FAST','RABBIT_SPRINT_HOP','RABBIT_TURN','RABBIT_STOP'],
    acting:['RABBIT_GRAZE','RABBIT_ALERT','RABBIT_FREEZE','RABBIT_FLEE'],
    attack:[],
    reaction:['RABBIT_HIT','RABBIT_STUMBLE'],
    death:['RABBIT_DEATH']
  }),
  HOOFED_CLIMBER:wildlifePack({
    idle:['GOAT_IDLE','GOAT_LOOK','GOAT_HOOF_SHIFT'],
    locomotion:['GOAT_WALK','GOAT_TROT','GOAT_RUN','GOAT_CLIMB_STEP','GOAT_TURN','GOAT_STOP'],
    acting:['GOAT_GRAZE','GOAT_ALERT','GOAT_BALANCE'],
    attack:['GOAT_HEADBUTT','GOAT_REAR_KICK'],
    reaction:['GOAT_HIT','GOAT_STAGGER'],
    death:['GOAT_DEATH_SIDE']
  }),
  GROUND_BIRD:wildlifePack({
    idle:['GROUND_BIRD_IDLE','GROUND_BIRD_HEAD_BOB','GROUND_BIRD_LOOK'],
    locomotion:['GROUND_BIRD_WALK','GROUND_BIRD_RUN','GROUND_BIRD_TURN','GROUND_BIRD_FLAP_HOP','GROUND_BIRD_STOP'],
    acting:['GROUND_BIRD_PECK','GROUND_BIRD_ALERT','GROUND_BIRD_DISPLAY','GROUND_BIRD_FLEE'],
    attack:['GROUND_BIRD_PECK_ATTACK'],
    reaction:['GROUND_BIRD_HIT'],
    death:['GROUND_BIRD_DEATH']
  }),
  BIRD:wildlifePack({
    idle:['BIRD_PERCH_IDLE','BIRD_HEAD_LOOK','BIRD_WING_ADJUST'],
    locomotion:['BIRD_TAKEOFF','BIRD_FLAP_FLY','BIRD_GLIDE','BIRD_BANK_L','BIRD_BANK_R','BIRD_LAND','BIRD_HOP'],
    acting:['BIRD_PECK','BIRD_ALERT','BIRD_CALL','BIRD_FLEE_TAKEOFF'],
    attack:[],
    reaction:['BIRD_AIR_HIT','BIRD_GROUND_HIT'],
    death:['BIRD_FALL_DEATH']
  })
});

const SURVIVAL_WILDLIFE_SPECIES_MOTION=Object.freeze({
  BEAR:'HEAVY_QUADRUPED',
  BOAR:'LOW_HEAVY_QUADRUPED',
  DEER:'HOOFED_LIGHT',
  ELK:'HOOFED_HEAVY',
  MOOSE:'HOOFED_HEAVY',
  BISON:'HEAVY_QUADRUPED',
  WOLF:'CANINE',
  COYOTE:'CANINE_LIGHT',
  FOX:'CANINE_LIGHT',
  RABBIT:'HOPPER',
  RACCOON:'SMALL_MAMMAL',
  SQUIRREL:'SMALL_MAMMAL',
  BEAVER:'SMALL_MAMMAL',
  BADGER:'SMALL_MAMMAL',
  MOUNTAIN_GOAT:'HOOFED_CLIMBER',
  TURKEY:'GROUND_BIRD',
  CROW:'BIRD'
});


export function createMountRiderMotionProfile({mountType='HORSE',platform='ROBLOX'}={}){
  const requested=upper(mountType)||'HORSE';
  const resolved=MOUNT_RIDER_MOTION_PACKS[requested]?requested:'HORSE';
  const pack=MOUNT_RIDER_MOTION_PACKS[resolved];
  return Object.freeze({
    target:'HIGH_END_SHARED_MOUNT_RIDER_PAIR_MOTION',
    platform:upper(platform),
    mountType:resolved,
    groups:Object.freeze({
      pair:pack.pair,
      signature:pack.signature,
      mountedCombat:MOUNT_RIDER_MOTION_PACKS.mountedCombat
    }),
    riderContact:Object.freeze({
      pelvisFollowsMountMass:true,
      handsMaintainReinOrWeaponContact:true,
      feetMaintainStirrupOrBodyContact:true,
      spineCounterMotion:true,
      headGazeIndependentWithinLimits:true,
      jumpAndLandingCompressionShared:true,
      turnLeanAndRecoveryShared:true
    }),
    mountMotion:Object.freeze({
      articulatedGaitRequired:true,
      plantedFootContactRequired:true,
      bodyArcTurnRequired:true,
      accelerationDecelerationRequired:true,
      hardRootSnapForbidden:true,
      riderMayNotRemainRigidWhileMountMoves:true
    }),
    pairAlignment:Object.freeze({
      rootOffsetRequired:true,
      facingRequired:true,
      contactPointsRequired:true,
      heightOffsetRequired:true,
      timingMarkersRequired:true,
      safeSeparationExitRequired:true
    }),
    nativePath:upper(platform)==='ROBLOX'
      ?Object.freeze({rider:'R15_OR_CUSTOM_RIG_ANIMATOR',mount:'CUSTOM_RIG_ANIMATOR',joints:'MOTOR6D_OR_BONES',contact:'IKCONTROL_WHEN_SUPPORTED'})
      :Object.freeze({rider:'HUMANOID_OR_GENERIC_ANIMATOR',mount:'GENERIC_ANIMATOR',joints:'RIG_BONES',contact:'ANIMATION_RIGGING_OR_IK'}),
    gameplayMovementAuthority:false,
    nativeRuntimeVerificationRequired:true,
    productionVerified:false
  });
}

export function createHeroStandardMotionProfile({
  platform='ROBLOX',
  weaponFamily='ONE_HAND_SWORD',
  includeSurvival=true,
  mountType=''
}={}){
  const weapon=upper(weaponFamily)||'ONE_HAND_SWORD';
  const resolvedWeapon=HERO_SURVIVAL_WEAPON_FAMILIES.includes(weapon)?weapon:'ONE_HAND_SWORD';
  const baseMotionIds=freezeList(unique(Object.values(HERO_STANDARD_RIG_MOTION_PACK).flat()));
  const survivalMotionIds=includeSurvival
    ?freezeList(unique([
      ...SURVIVAL_PLAYER_MOTION_PACK.tool,
      ...SURVIVAL_PLAYER_MOTION_PACK.interaction
    ]))
    :freezeList([]);
  const weaponProfile=createDuelCombatMotionLoadout({weaponFamily:resolvedWeapon,platform});
  const mountProfile=mountType?createMountRiderMotionProfile({mountType,platform}):null;
  return Object.freeze({
    target:HERO_STANDARD_RIG_TARGET,
    platform:upper(platform),
    rigProfile:upper(platform)==='ROBLOX'?'R15_OR_COMPATIBLE_CUSTOM_RIG':'HUMANOID_OR_GENERIC',
    basePack:HERO_STANDARD_RIG_MOTION_PACK,
    baseMotionIds,
    baseMotionCount:baseMotionIds.length,
    survivalMotionIds,
    weaponFamily:resolvedWeapon,
    weaponProfile,
    mountProfile,
    quality:Object.freeze({
      fullBodyWeightTransfer:true,
      plantedFootContact:true,
      accelerationDeceleration:true,
      turnFootPlantAndBodyFollow:true,
      speedSynchronizedLocomotion:true,
      transitionCrossFade:true,
      secondaryMotion:true,
      directionalHitReaction:true,
      nonMechanicalIdleVariation:true,
      attackImpactEventSync:true,
      rootOnlyVisibleMotionForbidden:true
    }),
    sharedSourcePolicy:'ONE_SHARED_MOTION_INTENT_AND_REFERENCE_WITH_PLATFORM_NATIVE_RETARGET_VARIANTS',
    directCrossPlatformBinaryReuseForbidden:true,
    nativeRuntimeVerificationRequired:true,
    gameplayAuthority:false,
    productionVerified:false
  });
}

export function createSurvivalPlayerMotionProfile({platform='ROBLOX',tool='AXE'}={}){
  const toolKey=upper(tool)||'AXE';
  const toolMotion={
    AXE:'SURVIVAL_AXE_CHOP_R',
    PICKAXE:'SURVIVAL_PICKAXE_SWING',
    HAMMER:'SURVIVAL_HAMMER_SWING',
    SPEAR:'SURVIVAL_SPEAR_THRUST',
    NONE:'SURVIVAL_TOOL_READY'
  }[toolKey]||'SURVIVAL_TOOL_READY';
  return Object.freeze({
    target:'POLISHED_STYLIZED_SURVIVAL_CHARACTER_MOTION',
    platform:upper(platform),
    tool:toolKey,
    primaryToolMotion:toolMotion,
    groups:SURVIVAL_PLAYER_MOTION_PACK,
    mechanics:Object.freeze({
      accelerationBodyLean:true,
      startStopWeightShift:true,
      turnFootPlant:true,
      sprintArmDrive:true,
      crouchCenterOfMassLowered:true,
      jumpLandCompression:true,
      toolGripAlignment:true,
      toolStrikeUsesHipsSpineShoulders:true,
      interactionHandsReachTarget:true
    }),
    nativePath:upper(platform)==='ROBLOX'
      ?Object.freeze({primary:'ANIMATOR_ANIMATIONTRACK',cleanup:'MOTOR6D_OR_BONE_TRANSFORM',contact:'IKCONTROL_WHEN_AVAILABLE',rootOnlyForbidden:true})
      :Object.freeze({primary:'ANIMATOR_CLIP',cleanup:'HUMANOID_RETARGET_AVATAR_MASK',contact:'ANIMATION_RIGGING_OR_IK',rootOnlyForbidden:true}),
    rootTranslationOwnedByGameplay:true,
    nativeRuntimeVerificationRequired:true,
    productionVerified:false
  });
}

export function createSurvivalWildlifeMotionProfile({species='BEAR',platform='ROBLOX'}={}){
  const key=upper(species)||'BEAR';
  const family=SURVIVAL_WILDLIFE_SPECIES_MOTION[key]||'HEAVY_QUADRUPED';
  const groups=SURVIVAL_WILDLIFE_MOTION_PACKS[family];
  return Object.freeze({
    target:'POLISHED_STYLIZED_SURVIVAL_WILDLIFE_MOTION',
    platform:upper(platform),
    species:SURVIVAL_WILDLIFE_SPECIES_MOTION[key]?key:'BEAR',
    family,
    groups,
    motionIds:freezeList(unique(Object.values(groups).flat())),
    mechanics:Object.freeze({
      fourLimbOrSpeciesSpecificGait:true,
      spineCompressionAndExtension:true,
      headCounterBalance:true,
      plantedFootContact:true,
      accelerationAndBrakingVisible:true,
      turnUsesBodyArcNotRootSnap:true,
      attackStartsFromBodyWeightShift:true,
      hitReactionMatchesImpactDirection:true,
      deathUsesMassAndGroundContact:true,
      tailEarWingSecondaryMotionWhenApplicable:true
    }),
    nativePath:upper(platform)==='ROBLOX'
      ?Object.freeze({primary:'ANIMATIONCONTROLLER_OR_HUMANOID_ANIMATOR',joints:'MOTOR6D_OR_BONES',contact:'IKCONTROL_WHEN_SUPPORTED',rootOnlyForbidden:true})
      :Object.freeze({primary:'GENERIC_OR_HUMANOID_ANIMATOR',joints:'RIG_BONES',contact:'ANIMATION_RIGGING_OR_IK',rootOnlyForbidden:true}),
    runtimeQuality:Object.freeze({
      noFootSlide:true,
      noRigidBodyGlide:true,
      noInstantRootTurn:true,
      gaitSpeedSynced:true,
      mobileSilhouetteReadable:true
    }),
    nativeRuntimeVerificationRequired:true,
    productionVerified:false
  });
}

export const MOTION_COMPOSITION_CHANNELS=Object.freeze([
  'ROOT','LOCOMOTION','LOWER_BODY','PELVIS_SPINE','UPPER_BODY','LEFT_ARM','RIGHT_ARM','HEAD_GAZE',
  'TAIL','WINGS','EXTRA_LIMBS','BODY_WAVE','TENTACLES','SWARM_FORMATION','SECONDARY_MOTION','PROCEDURAL_CORRECTION',
  'VFX_PRESENTATION','AUDIO_PRESENTATION','CAMERA_PRESENTATION'
]);

export const MOTION_DNA_FIELDS=Object.freeze([
  'MOTION_ID','BODY_PLAN','RIG_PROFILE','SPECIES_OR_ARCHETYPE','STANCE','STYLE_FAMILY','WEAPON_FAMILY',
  'LEAD_SIDE','HAND_USAGE','DIRECTION','SPEED_CLASS','WEIGHT_CLASS','AIRBORNE_STATE','HEIGHT_CLASS',
  'COMBAT_ROLE','SKILL_ROLE','DEFENSE_ROLE','REACTION_ROLE','INTERACTION_ROLE','TRAVERSAL_ROLE',
  'CONTACT_LIMB','CONTACT_PHASE','STARTUP_CLASS','RECOVERY_CLASS','TRAVEL_VECTOR','ROOT_MOTION_MODE',
  'MIRROR_SAFE','LOOPABLE','PAIR_ROLE','ENVIRONMENT_TAGS','COMPATIBILITY_TAGS','EXCLUSION_TAGS',
  'PLATFORM_VARIANT','SOURCE_PROVENANCE','STYLE_VARIANT_PARENT','RUNTIME_VERIFICATION_STATE'
]);

export const MOTION_GRAMMARS=Object.freeze({
  attack:Object.freeze(['NEUTRAL','ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  defense:Object.freeze(['NEUTRAL','READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','COUNTER_OPTION','RECOVERY']),
  skill:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','AIM_OR_TARGET','RELEASE','IMPACT_RESPONSE','RECOVERY']),
  traversal:Object.freeze(['PREPARE','TAKEOFF_OR_ENTRY','TRAVEL','CONTACT_OR_EXIT','RECOVERY']),
  pair:Object.freeze(['ALIGN','LOCK','EXECUTE','IMPACT','SEPARATE','RECOVERY'])
});

export const MOTION_LIBRARY_GRAPH_NODES=Object.freeze([
  'CHARACTER_ARCHETYPE_LIBRARY','CREATURE_RIG_LIBRARY','ACTION_MOTION_LIBRARY','WEAPON_MOTION_LIBRARY',
  'SKILL_MOTION_LIBRARY','REACTION_MOTION_LIBRARY','PAIR_MOTION_LIBRARY','VFX_LIBRARY',
  'ENVIRONMENT_KIT_LIBRARY','UI_PRESENTATION_LIBRARY'
]);

export const MOTION_MUTATIONS=Object.freeze([
  'MIRROR','STANCE_SWAP','LEAD_SIDE_SWAP','POSE_EXAGGERATION','ANTICIPATION_SCALE','RECOVERY_CURVE',
  'OVERSHOOT_SETTLE','STRIDE_PRESENTATION','ATTACK_ARC_PRESENTATION','WEIGHT_PRESENTATION','STYLE_MODIFIER'
]);

export const MOTION_MUTATION_FORBIDDEN=Object.freeze([
  'DAMAGE_CHANGE','HITBOX_CHANGE','COOLDOWN_CHANGE','UNAPPROVED_MOVEMENT_SPEED_CHANGE',
  'CONTACT_MARKER_DESYNC','RIG_BREAKAGE'
]);

export function createDuelCombatMotionLoadout({
  weaponFamily='UNARMED',
  martialStyle='MMA_HYBRID',
  platform='ROBLOX'
}={}){
  const aliases=Object.freeze({
    SWORD:'ONE_HAND_SWORD',
    GREAT_SWORD:'TWO_HAND_SWORD',
    GREATSWORD:'TWO_HAND_SWORD',
    DUAL_SWORD:'DUAL_BLADE',
    DUAL_BLADES:'DUAL_BLADE',
    KATANA_SWORD:'KATANA',
    STAFF:'STAFF_OR_WAND',
    WAND:'STAFF_OR_WAND',
    SHIELD:'SHIELD_SWORD'
  });
  const requested=upper(weaponFamily)||'UNARMED';
  const resolvedWeapon=aliases[requested]||requested;
  const weaponPack=WEAPON_COMBAT_MOTION_PACKS[resolvedWeapon]||WEAPON_COMBAT_MOTION_PACKS.UNARMED;
  const styleKey=resolvedWeapon==='UNARMED'
    ?(UNARMED_MARTIAL_ARTS_STYLES[upper(martialStyle)]?upper(martialStyle):'MMA_HYBRID')
    :null;
  const martialPack=styleKey?UNARMED_MARTIAL_ARTS_STYLES[styleKey]:null;
  const merge=(...groups)=>freezeList(unique(groups.flatMap(value=>Array.isArray(value)?value:[])));
  const groups=Object.freeze({
    stance:merge(weaponPack.stance,martialPack?.stance),
    footwork:merge(weaponPack.footwork,martialPack?.footwork),
    lightCombo:merge(weaponPack.lightCombo,martialPack?.lightCombo),
    heavy:merge(weaponPack.heavy,martialPack?.heavy),
    gapCloser:merge(weaponPack.gapCloser,martialPack?.gapCloser),
    aerial:merge(weaponPack.aerial,martialPack?.aerial),
    defense:merge(weaponPack.defense,martialPack?.defense),
    grapple:merge(weaponPack.grapple,martialPack?.grapple),
    finisher:merge(weaponPack.finisher,martialPack?.finisher),
    reactions:DUEL_REACTION_MOTIONS,
    recovery:DUEL_RECOVERY_MOTIONS
  });
  const motionIds=freezeList(unique(Object.values(groups).flat()));
  return Object.freeze({
    target:DUEL_COMBAT_MOTION_TARGET,
    platform:upper(platform),
    weaponFamily:WEAPON_COMBAT_MOTION_PACKS[resolvedWeapon]?resolvedWeapon:'UNARMED',
    martialStyle:styleKey,
    groups,
    motionIds,
    requiredRoles:DUEL_COMBAT_REQUIRED_ROLES,
    comboGrammar:Object.freeze(['NEUTRAL','STARTUP','ACTIVE_CONTACT','RECOVERY','LINK_OR_END']),
    referencePolicy:'MATCH_RESPONSIVE_DUEL_FEEL_WITH_ORIGINAL_OR_LICENSE_VERIFIED_MOTION',
    exactThirdPartyClipCopy:false,
    nativeRuntimeVerificationRequired:true,
    productionVerified:false,
    gameplayAuthority:false
  });
}

export function createMotionDNA(input={}) {
  const dna={
    MOTION_ID:text(input.MOTION_ID||input.motionId||input.id),
    BODY_PLAN:upper(input.BODY_PLAN||input.bodyPlan||'HUMANOID'),
    RIG_PROFILE:upper(input.RIG_PROFILE||input.rigProfile||'HUMANOID'),
    SPECIES_OR_ARCHETYPE:upper(input.SPECIES_OR_ARCHETYPE||input.speciesOrArchetype),
    STANCE:upper(input.STANCE||input.stance),
    STYLE_FAMILY:upper(input.STYLE_FAMILY||input.styleFamily),
    WEAPON_FAMILY:upper(input.WEAPON_FAMILY||input.weaponFamily),
    LEAD_SIDE:upper(input.LEAD_SIDE||input.leadSide),
    HAND_USAGE:upper(input.HAND_USAGE||input.handUsage),
    DIRECTION:upper(input.DIRECTION||input.direction),
    SPEED_CLASS:upper(input.SPEED_CLASS||input.speedClass),
    WEIGHT_CLASS:upper(input.WEIGHT_CLASS||input.weightClass),
    AIRBORNE_STATE:upper(input.AIRBORNE_STATE||input.airborneState),
    HEIGHT_CLASS:upper(input.HEIGHT_CLASS||input.heightClass),
    COMBAT_ROLE:upper(input.COMBAT_ROLE||input.combatRole),
    SKILL_ROLE:upper(input.SKILL_ROLE||input.skillRole),
    DEFENSE_ROLE:upper(input.DEFENSE_ROLE||input.defenseRole),
    REACTION_ROLE:upper(input.REACTION_ROLE||input.reactionRole),
    INTERACTION_ROLE:upper(input.INTERACTION_ROLE||input.interactionRole),
    TRAVERSAL_ROLE:upper(input.TRAVERSAL_ROLE||input.traversalRole),
    CONTACT_LIMB:upper(input.CONTACT_LIMB||input.contactLimb),
    CONTACT_PHASE:upper(input.CONTACT_PHASE||input.contactPhase),
    STARTUP_CLASS:upper(input.STARTUP_CLASS||input.startupClass),
    RECOVERY_CLASS:upper(input.RECOVERY_CLASS||input.recoveryClass),
    TRAVEL_VECTOR:upper(input.TRAVEL_VECTOR||input.travelVector),
    ROOT_MOTION_MODE:upper(input.ROOT_MOTION_MODE||input.rootMotionMode||'IN_PLACE_OR_GAME_OWNED'),
    MIRROR_SAFE:input.MIRROR_SAFE===true||input.mirrorSafe===true,
    LOOPABLE:input.LOOPABLE===true||input.loopable===true,
    PAIR_ROLE:upper(input.PAIR_ROLE||input.pairRole),
    ENVIRONMENT_TAGS:freezeList(unique(input.ENVIRONMENT_TAGS||input.environmentTags)),
    COMPATIBILITY_TAGS:freezeList(unique(input.COMPATIBILITY_TAGS||input.compatibilityTags)),
    EXCLUSION_TAGS:freezeList(unique(input.EXCLUSION_TAGS||input.exclusionTags)),
    PLATFORM_VARIANT:upper(input.PLATFORM_VARIANT||input.platformVariant),
    SOURCE_PROVENANCE:text(input.SOURCE_PROVENANCE||input.sourceProvenance),
    STYLE_VARIANT_PARENT:text(input.STYLE_VARIANT_PARENT||input.styleVariantParent),
    RUNTIME_VERIFICATION_STATE:upper(input.RUNTIME_VERIFICATION_STATE||input.runtimeVerificationState||'PREPARED_ONLY')
  };
  return Object.freeze(dna);
}

function overlapScore(a=[],b=[],weight=1){
  if(!a.length||!b.length)return 0;
  const set=new Set(a.map(upper));
  return b.map(upper).filter(x=>set.has(x)).length*weight;
}

function hardMismatch(candidate={},context={}){
  const dna=candidate.dna||candidate;
  const requiredBody=upper(context.bodyPlan);
  const requiredRig=upper(context.rigProfile);
  const requiredPlatform=upper(context.platform);
  const weapon=upper(context.weaponFamily);
  if(requiredBody&&dna.BODY_PLAN&&dna.BODY_PLAN!==requiredBody&&!dna.COMPATIBILITY_TAGS?.includes(requiredBody))return 'BODY_PLAN';
  if(requiredRig&&dna.RIG_PROFILE&&dna.RIG_PROFILE!==requiredRig&&!dna.COMPATIBILITY_TAGS?.includes(requiredRig))return 'RIG_PROFILE';
  if(requiredPlatform&&dna.PLATFORM_VARIANT&&dna.PLATFORM_VARIANT!==requiredPlatform)return 'PLATFORM';
  if(weapon&&dna.WEAPON_FAMILY&&dna.WEAPON_FAMILY!=='UNARMED'&&dna.WEAPON_FAMILY!==weapon)return 'WEAPON_FAMILY';
  const exclusions=(dna.EXCLUSION_TAGS||[]).map(upper);
  const contextTags=[
    requiredBody,requiredRig,requiredPlatform,weapon,upper(context.stance),upper(context.airborneState),
    ...(context.environmentTags||[]).map(upper)
  ].filter(Boolean);
  if(contextTags.some(tag=>exclusions.includes(tag)))return 'EXCLUSION_TAG';
  return null;
}

export function scoreMotionCandidate(candidate={},context={},recentMotionIds=[]){
  const dna=candidate.dna||candidate;
  const mismatch=hardMismatch(candidate,context);
  if(mismatch)return Object.freeze({id:text(dna.MOTION_ID||candidate.id),valid:false,score:-Infinity,rejectedBy:mismatch});
  let score=0;
  const exact=[
    ['BODY_PLAN','bodyPlan',18],['RIG_PROFILE','rigProfile',16],['STANCE','stance',8],['STYLE_FAMILY','styleFamily',8],
    ['WEAPON_FAMILY','weaponFamily',12],['DIRECTION','direction',7],['SPEED_CLASS','speedClass',6],
    ['WEIGHT_CLASS','weightClass',6],['AIRBORNE_STATE','airborneState',10],['COMBAT_ROLE','combatRole',12],
    ['SKILL_ROLE','skillRole',12],['DEFENSE_ROLE','defenseRole',10],['REACTION_ROLE','reactionRole',10],
    ['TRAVERSAL_ROLE','traversalRole',10]
  ];
  for(const [dnaKey,contextKey,weight] of exact){
    const want=upper(context[contextKey]);
    if(want&&upper(dna[dnaKey])===want)score+=weight;
  }
  score+=overlapScore(dna.ENVIRONMENT_TAGS||[],context.environmentTags||[],3);
  score+=overlapScore(dna.COMPATIBILITY_TAGS||[],context.compatibilityTags||[],2);
  const id=text(dna.MOTION_ID||candidate.id);
  const recent=recentMotionIds.map(text);
  if(recent[recent.length-1]===id)score-=100;
  else if(recent.includes(id))score-=25;
  if(candidate.family&&context.previousFamily&&upper(candidate.family)===upper(context.previousFamily))score-=20;
  if(dna.RUNTIME_VERIFICATION_STATE==='VERIFIED_RUNTIME')score+=10;
  if(candidate.companyVerified===true)score+=8;
  return Object.freeze({id,valid:true,score,rejectedBy:null});
}

export function selectContextMotion({candidates=[],context={},recentMotionIds=[]}={}){
  const scored=(candidates||[]).map(candidate=>({candidate,result:scoreMotionCandidate(candidate,context,recentMotionIds)}))
    .filter(row=>row.result.valid)
    .sort((a,b)=>b.result.score-a.result.score||a.result.id.localeCompare(b.result.id));
  return Object.freeze({
    selected:scored[0]?.candidate||null,
    selectedId:scored[0]?.result.id||null,
    score:scored[0]?.result.score??null,
    ranked:Object.freeze(scored.map(row=>Object.freeze({id:row.result.id,score:row.result.score}))),
    deterministic:true,
    gameplayAuthority:false
  });
}

export function composeMotionStack({layers={},dna={},styleVariant=null,presentation={}}={}){
  const normalized={};
  for(const channel of MOTION_COMPOSITION_CHANNELS){
    const value=layers[channel]??layers[channel.toLowerCase()];
    if(value!==undefined&&value!==null&&value!=='')normalized[channel]=value;
  }
  const conflicts=[];
  const lower=normalized.LOWER_BODY||normalized.LOCOMOTION;
  const root=normalized.ROOT;
  if(root&&lower&&typeof root==='object'&&typeof lower==='object'&&root.ownsTranslation===true&&lower.ownsTranslation===true){
    conflicts.push('ROOT_TRANSLATION_DOUBLE_AUTHORITY');
  }
  if(normalized.LEFT_ARM&&normalized.UPPER_BODY&&normalized.LEFT_ARM.exclusive===true&&normalized.UPPER_BODY.exclusiveLeftArm===true){
    conflicts.push('LEFT_ARM_MASK_CONFLICT');
  }
  if(normalized.RIGHT_ARM&&normalized.UPPER_BODY&&normalized.RIGHT_ARM.exclusive===true&&normalized.UPPER_BODY.exclusiveRightArm===true){
    conflicts.push('RIGHT_ARM_MASK_CONFLICT');
  }
  return Object.freeze({
    target:MOTION_DIRECTOR_TARGET,
    dna:createMotionDNA(dna),
    layers:Object.freeze(normalized),
    styleVariant:styleVariant?Object.freeze({...styleVariant}):null,
    presentation:Object.freeze({...presentation}),
    conflicts:Object.freeze(conflicts),
    valid:conflicts.length===0,
    gameplayAuthority:false
  });
}

export function createMotionCompatibilityGraph({nodes=[],edges=[]}={}){
  const safeNodes=(nodes||[]).map(node=>Object.freeze({id:text(node.id),kind:upper(node.kind),tags:freezeList(unique(node.tags))})).filter(n=>n.id);
  const ids=new Set(safeNodes.map(n=>n.id));
  const safeEdges=(edges||[]).map(edge=>Object.freeze({
    from:text(edge.from),to:text(edge.to),type:upper(edge.type),verified:edge.verified===true
  })).filter(e=>ids.has(e.from)&&ids.has(e.to));
  const unresolved=(edges||[]).filter(edge=>!ids.has(text(edge.from))||!ids.has(text(edge.to))).map(edge=>Object.freeze({...edge}));
  return Object.freeze({
    nodes:Object.freeze(safeNodes),
    edges:Object.freeze(safeEdges),
    unresolved:Object.freeze(unresolved),
    valid:unresolved.length===0,
    requiredLibraryNodes:MOTION_LIBRARY_GRAPH_NODES
  });
}

export function buildSkillMotionSequence({
  prepare='PREPARE',charge='CHARGE',aim='AIM',release='RELEASE',impact='IMPACT_RESPONSE',recovery='RECOVERY',
  hold=null,cancel=null,combatTraditions=[],weaponFamily='UNARMED',terrainMaterial='UNSPECIFIED',
  effectMaterial='PHYSICAL',artisticIntent=''
}={}){
  const phases=[prepare,charge,hold,aim,release,impact,recovery,cancel].filter(Boolean).map(upper);
  // 메인: 유파는 연출만 바꾼다. 기존 공격·이동·스킬의 판정과 시점은 변경하지 않는다.
  const aliases={BUSHIDO:'SAMURAI',IAIDO:'SAMURAI',MURIM:'WUXIA',MARTIAL_HERO:'WUXIA',MAGIC:'FANTASY',SPELLBLADE:'FANTASY',SHINOBI:'NINJA',PALADIN:'KNIGHT'};
  const traditions=unique((Array.isArray(combatTraditions)?combatTraditions:[combatTraditions]).map(value=>aliases[upper(value)]||upper(value))).filter(Boolean);
  if(!traditions.length)traditions.push('GAME_SPECIFIC');
  const styles=Object.freeze({
    SAMURAI:Object.freeze({prepare:'STILLNESS_AND_SHEATH_THUMB',body:'PLANTED_FOOT_PELVIS_TURN_SHOULDER_FOLLOWS',release:'DRAW_CUT_FROM_REAL_BLADE',impact:'THIN_CONFIRMED_BLADE_CONTACT_FLASH',settle:'CLOTH_LAG_AND_CONTROLLED_RESHEATH'}),
    WUXIA:Object.freeze({prepare:'BREATH_AND_QI_GATHER_FROM_STANCE',body:'HEEL_HIP_SPINE_FLOW',release:'SLEEVE_TRAIL_AND_FOOT_CONTACT_DUST',impact:'QI_RIPPLE_ON_CONFIRMED_HIT',settle:'SLEEVE_INERTIA_AND_ROOT_LOCKED_LANDING'}),
    FANTASY:Object.freeze({prepare:'CASTER_GESTURE_AND_RUNE_PREPARE',body:'BODY_WEIGHT_SHIFT_AND_GAZE',release:'HAND_OR_WEAPON_SOCKET_DRIVES_ELEMENTAL_ARC',impact:'ELEMENTAL_CONTACT_BURST_AND_SURFACE_RESPONSE',settle:'RUNE_FADE_EQUIPMENT_LAG_AND_BREATH'}),
    NINJA:Object.freeze({prepare:'LOW_SILHOUETTE_AND_TARGET_READ',body:'QUIET_FOOT_TRANSFER_AND_TORSO_COIL',release:'SHORT_REAL_WEAPON_SOCKET_ARC',impact:'NARROW_CONTACT_FLASH_AND_SHADOW_STREAK',settle:'CLOAK_OVERLAP_AND_SOFT_LANDING'}),
    KNIGHT:Object.freeze({prepare:'GUARD_SET_AND_BODY_MASS_COMMIT',body:'BOOT_PLANT_SHIELD_COUNTERBALANCE',release:'WEIGHTED_ARC_WITH_UNBROKEN_GRIP',impact:'METAL_OR_STONE_CONTACT_ONLY',settle:'ARMOR_INERTIA_AND_SHOULDER_RECOVERY'})
  });
  const styleLayers=freezeList(traditions.map((tradition,index)=>Object.freeze({
    tradition,index,direction:styles[tradition]||Object.freeze({
      prepare:'GAME_CHARACTER_SPECIFIC_TELL',body:'RIG_SPECIFIC_WEIGHT_TRANSFER',
      release:'SOURCE_MOTION_DRIVEN_ACTION_ARC',impact:'CONFIRMED_CONTACT_ONLY_VFX',settle:'DAMPED_SECONDARY_OVERLAP'
    }),
    nativeClipRequired:true,runtimeVerified:false
  })));
  const smoothness=Object.freeze({
    interpolation:'POSE_AND_VELOCITY_MATCHED_HERMITE_OR_ENGINE_EQUIVALENT_WITHIN_LOCKED_CLIP',
    transition:'MATCH_CURRENT_POSE_VELOCITY_FOOT_PHASE_AND_CONTACT',
    timing:'READ_EXISTING_NATIVE_CLIP_AND_SERVER_EVENT_MARKERS',
    beats:freezeList(['INTENT_GAZE','FOOT_PRESSURE','PELVIS_SPINE_TRANSFER','HAND_WEAPON_RELEASE','CONFIRMED_CONTACT_RESPONSE','SECONDARY_LAG_SETTLE']),
    avoid:freezeList(['ROOT_ONLY_MANNEQUIN','JOINT_LINEAR_POP','FOOT_SLIDE','GRIP_OFFSET','CONTACT_EVENT_DESYNC','FAKE_SMOOTHNESS_PASS']),
    measuredQa:freezeList(['POSE_DISCONTINUITY','ROOT_VELOCITY_DELTA','FOOT_PLANT_DRIFT','JOINT_ANGULAR_VELOCITY','WEAPON_SOCKET_DRIFT','IMPACT_EVENT_OFFSET','INTERRUPTION_AND_LOOP_SEAMS','MOBILE_P95_FRAME_MS']),
    authoredCurvesAndNativeRuntimeEvidenceRequired:true,sourceMetadataCannotProveMotionQuality:true,betterThanReferenceQualityNotYetVerified:true
  });
  return Object.freeze({
    grammar:'SKILL',
    phases:Object.freeze(phases),
    requiredCore:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
    valid:['PREPARE','RELEASE','RECOVERY'].every(required=>phases.includes(required)),
    creativeChoreography:Object.freeze({
      traditions:freezeList(traditions),weaponFamily:upper(weaponFamily),
      terrainMaterial:upper(terrainMaterial),effectMaterial:upper(effectMaterial),artisticIntent:text(artisticIntent),
      styleLayers,
      fusion:'COMPOSE_STAGING_AND_ARTICULATION_FROM_STYLE_LAYERS_WITHOUT_ADDING_GAMEPLAY_ACTIONS',
      visualChannels:freezeList(['BLADE_HAND_TRAIL','CONTACT_FLASH','SURFACE_DEBRIS','LOCAL_LIGHT_RESPONSE','CLOTH_ARMOR_LAG']),
      vfxTriggers:Object.freeze({weaponTrail:'EXISTING_RELEASE_MOTION',contact:'CONFIRMED_GAMEPLAY_HIT_ONLY',miss:'NO_CONTACT_BURST',environment:'VISUAL_ONLY_WITH_AUTHORIZED_SURFACE'}),
      smoothness,nativeArtifactsRequired:true,productionVerified:false,runtimeVerified:false,
      preserve:freezeList(['DAMAGE','HITBOX','ATTACK_SPEED','COOLDOWN','COMBO_WINDOW','CONTACT_EVENT','ROOT_MOVEMENT','SAVE','MULTIPLAYER_SERVER_AUTHORITY'])
    }),
    gameplayTimingAuthority:false
  });
}

export function createReactionMatch({impactDirection='FRONT',impactHeight='MID',impactStrength='LIGHT',attackType='GENERIC',contactLimb='',bodyRegion='TORSO',stance='NEUTRAL',weightClass='STANDARD',airborneState='GROUNDED',wallProximity='CLEAR',groundState='STABLE',partialPhysics=true}={}){
  const strength=upper(impactStrength);
  const airborne=upper(airborneState);
  const wall=upper(wallProximity);
  let output='LOCAL_RECOIL';
  if(airborne!=='GROUNDED')output='AIR_HIT';
  else if(wall!=='CLEAR'&&['HEAVY','LAUNCH'].includes(strength))output='WALL_HIT';
  else if(strength==='LAUNCH')output='LAUNCH';
  else if(strength==='HEAVY')output='FULL_BODY_HIT';
  else if(strength==='KNOCKDOWN')output='KNOCKDOWN';
  const partialRagdollEnabled=partialPhysics!==false&&['HEAVY','LAUNCH','KNOCKDOWN'].includes(strength);
  return Object.freeze({
    output,
    tags:Object.freeze({
      direction:upper(impactDirection),height:upper(impactHeight),strength,
      attackType:upper(attackType),contactLimb:upper(contactLimb),bodyRegion:upper(bodyRegion),stance:upper(stance),
      weightClass:upper(weightClass),airborneState:airborne,wallProximity:wall,groundState:upper(groundState)
    }),
    directionalReactionRequired:true,
    bodyRegionReactionRequired:true,
    partialRagdoll:Object.freeze({
      enabled:partialRagdollEnabled,
      mode:partialRagdollEnabled?'IMPACT_CHAIN_ONLY':'NONE',
      maxBlendSeconds:partialRagdollEnabled?.22:0,
      recoverToAuthoredPose:true,
      authoritativeRootAndColliderImmutable:true,
      visualPhysicsOnly:true
    }),
    gameplayHitResultAuthoritative:true
  });
}

export function createPairMotionContract({id='',family='GRAB',attackerMotion='',receiverMotion='',rootOffset=[0,0,0],facing='FACE_TARGET',contactPoints=[],heightOffset=0,timingMarkers=[],escapeExit=null}={}){
  return Object.freeze({
    id:text(id),
    family:upper(family),
    roles:Object.freeze({
      ATTACKER:text(attackerMotion),
      RECEIVER:text(receiverMotion)
    }),
    alignment:Object.freeze({
      rootOffset:Object.freeze((rootOffset||[0,0,0]).map(Number)),
      facing:upper(facing),
      contactPoints:freezeList(unique(contactPoints)),
      heightOffset:Number(heightOffset)||0,
      timingMarkers:freezeList(unique(timingMarkers)),
      escapeExit:text(escapeExit)||null
    }),
    gameplayApprovedEnvelopeRequired:true,
    perPlatformReauthoringAndRuntimeVerificationRequired:true,
    gameplayAuthority:false
  });
}

export function deriveMotionStyleVariant({parentId='',style='CARTOON',styles=[],modifiers={},preserve={}}={}){
  const normalizedStyle=upper(style);
  const profileKey=createStyleBible({styleFamily:normalizedStyle,styles}).profileKey;
  const defaults=ASSET_STYLE_PROFILES[profileKey]?.motion||{};
  const safeModifiers={
    poseExaggeration:clamp(modifiers.poseExaggeration??defaults.poseExaggeration??1,0.5,2),
    anticipationScale:clamp(modifiers.anticipationScale??defaults.anticipationScale??1,0.5,2),
    overshootScale:clamp(modifiers.overshootScale??defaults.overshootScale??1,0,2),
    squashStretch:clamp(modifiers.squashStretch??defaults.squashStretch??0,0,1),
    secondaryMotion:clamp(modifiers.secondaryMotion??defaults.secondaryMotion??1,0,2),
    recoveryPresentation:clamp(modifiers.recoveryPresentation??defaults.recoveryPresentation??1,0.5,2)
  };
  return Object.freeze({
    parentId:text(parentId),
    style:normalizedStyle,
    profileKey,
    modifiers:Object.freeze(safeModifiers),
    preserve:Object.freeze({
      ...preserve,
      gameplaySpeed:true,
      hitboxSemantics:true,
      damage:true,
      cooldown:true,
      authoritativeRootMovement:true,
      contactMarkerSync:true
    }),
    application:Object.freeze({
      actualJointCurvesRequired:true,rigSpecificRetargetRequired:true,
      anatomyAndJointLimitsRequired:true,adjacentClothingAndPropContactRequired:true,
      gazeHeadWeightActionFollowThroughOrder:true,
      preserveAuthoredImpactAndClipDuration:true,
      phaseScalingMeansPoseAndCurveRedistributionWithinLockedEvents:true,
      unsupportedSquashUsesPoseOnly:true,
      generatedClip:false
    }),
    originalImmutable:true,
    runtimeVerificationRequired:true
  });
}

export function mutateMotionVariant({parentId='',mutation='',value=null,provenance=''}={}){
  const kind=upper(mutation);
  if(MOTION_MUTATION_FORBIDDEN.includes(kind)){
    return Object.freeze({allowed:false,parentId:text(parentId),mutation:kind,reason:'GAMEPLAY_OR_INTEGRITY_MUTATION_FORBIDDEN'});
  }
  const allowed=MOTION_MUTATIONS.includes(kind);
  return Object.freeze({
    allowed,
    parentId:text(parentId),
    mutation:kind,
    value,
    provenance:text(provenance),
    requiresCompatibilityQa:allowed,
    requiresRuntimeQa:allowed,
    gameplayAuthority:false
  });
}

export function createVariationMemory({history=[],maxSize=8}={}){
  const size=Math.max(1,Math.floor(Number(maxSize)||8));
  let rows=(history||[]).map(text).filter(Boolean).slice(-size);
  return Object.freeze({
    get history(){return Object.freeze([...rows]);},
    push(id){
      const value=text(id);
      if(value)rows=[...rows,value].slice(-size);
      return Object.freeze([...rows]);
    },
    penalty(id,family='',recentFamilies=[]){
      const value=text(id);
      if(rows[rows.length-1]===value)return 100;
      if(rows.includes(value))return 25;
      if(family&&(recentFamilies||[]).map(upper).includes(upper(family)))return 20;
      return 0;
    },
    maxSize:size
  });
}


export const MONSTER_BODY_PLAN_MOTION_DETAILS=Object.freeze({
  HUMANOID_UNDEAD:Object.freeze({
    aliases:Object.freeze(['HUMANOID','SMALL_HUMANOID_BIPED','UNDEAD_HUMANOID']),
    coverage:Object.freeze({locomotion:7,attacks:5,defense:3,reactions:6,acting:4,deaths:3,skill:3,signature:3}),
    requiredRoles:Object.freeze(['START','STOP','TURN','KNOCKDOWN','GET_UP']),
    presentationVariation:Object.freeze({weightScale:1,strideScale:1,torsoLean:1,anticipationPoseScale:1,recoilPoseScale:1,recoveryPoseScale:1,limbPhase:'BIPED_OPPOSED',visualLimbCount:4,tailFollow:0,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['IDLE_BREATH','LIMP_IDLE','WALK','RUN','START','STOP','TURN_L','TURN_R']),
      attacks:Object.freeze(['LIGHT_ATTACK_A','LIGHT_ATTACK_B','LIGHT_ATTACK_C','HEAVY_ATTACK','SHOVE']),
      defense:Object.freeze(['GUARD','DODGE_L','DODGE_R']),
      reactions:Object.freeze(['HIT_FRONT','HIT_BACK','HIT_LEFT','HIT_RIGHT','STAGGER','KNOCKDOWN','GET_UP']),
      acting:Object.freeze(['BREATH_IDLE','ALERT','THREAT_DISPLAY','SEARCH']),
      deaths:Object.freeze(['DEATH_FRONT','DEATH_BACK','DEATH_SIDE']),
      skill:Object.freeze(['SKILL_PREPARE','SKILL_RELEASE','SKILL_RECOVERY']),
      signature:Object.freeze(['IDLE_SIGNATURE','ATTACK_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  HEAVY_BIPED:Object.freeze({
    aliases:Object.freeze([]),
    coverage:Object.freeze({locomotion:7,attacks:5,defense:3,reactions:5,acting:3,deaths:3,skill:3,signature:4}),
    requiredRoles:Object.freeze(['HEAVY_START','HEAVY_STOP','HEAVY_TURN','HEAVY_RECOVERY']),
    presentationVariation:Object.freeze({weightScale:1.45,strideScale:.9,torsoLean:.8,anticipationPoseScale:1.25,recoilPoseScale:1.3,recoveryPoseScale:1.35,limbPhase:'HEAVY_BIPED_OPPOSED',visualLimbCount:4,tailFollow:0,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['HEAVY_IDLE','HEAVY_WALK','HEAVY_RUN','HEAVY_START','HEAVY_STOP','HEAVY_TURN_L','HEAVY_TURN_R','HEAVY_RECOVERY']),
      attacks:Object.freeze(['OVERHEAD_SLAM','SWEEP_ATTACK','DOUBLE_HAND_SMASH','CHARGE_ATTACK','BODY_SHOVE']),
      defense:Object.freeze(['HEAVY_GUARD','BRACE','SIDESTEP']),
      reactions:Object.freeze(['HEAVY_HIT','HIT_SIDE','STAGGER','KNOCKDOWN','GET_UP']),
      acting:Object.freeze(['HEAVY_BREATH','THREAT_DISPLAY','ROAR']),
      deaths:Object.freeze(['HEAVY_DEATH_FRONT','HEAVY_DEATH_SIDE','HEAVY_COLLAPSE']),
      skill:Object.freeze(['SKILL_PREPARE','GROUND_SLAM_RELEASE','SKILL_RECOVERY']),
      signature:Object.freeze(['IDLE_SIGNATURE','LOCOMOTION_SIGNATURE','ATTACK_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  BOSS_BIPED:Object.freeze({
    aliases:Object.freeze([]),
    coverage:Object.freeze({locomotion:7,attacks:6,defense:3,reactions:5,acting:5,deaths:2,skill:4,signature:6}),
    requiredRoles:Object.freeze(['INTRO','PHASE_CHANGE','ENRAGE','FAILED_ATTACK_RECOVERY','BOSS_DEATH_SEQUENCE']),
    presentationVariation:Object.freeze({weightScale:1.5,strideScale:1,torsoLean:1.05,anticipationPoseScale:1.4,recoilPoseScale:1.35,recoveryPoseScale:1.45,limbPhase:'BOSS_BIPED_WEIGHTED',visualLimbCount:4,tailFollow:.25,wingFollow:.25,tentacleFollow:.25}),
    roles:Object.freeze({
      locomotion:Object.freeze(['BOSS_IDLE','BOSS_WALK','BOSS_RUN','BOSS_START','BOSS_STOP','BOSS_TURN_L','BOSS_TURN_R']),
      attacks:Object.freeze(['LIGHT_ATTACK_A','LIGHT_ATTACK_B','HEAVY_ATTACK_A','GAP_CLOSER','AOE_ATTACK','SIGNATURE_ATTACK']),
      defense:Object.freeze(['BOSS_GUARD','BOSS_DODGE','BOSS_REVERSAL']),
      reactions:Object.freeze(['BOSS_HIT_LIGHT','BOSS_HIT_HEAVY','BOSS_STAGGER','BOSS_KNOCKDOWN','BOSS_GET_UP']),
      acting:Object.freeze(['INTRO','TAUNT','PHASE_CHANGE','ENRAGE','FAILED_ATTACK_RECOVERY']),
      deaths:Object.freeze(['BOSS_DEATH_SEQUENCE','BOSS_DEATH_ALTERNATE']),
      skill:Object.freeze(['SKILL_PREPARE','SKILL_RELEASE','ULTIMATE','SKILL_RECOVERY']),
      signature:Object.freeze(['INTRO_SIGNATURE','PHASE_SIGNATURE','ENRAGE_SIGNATURE','ATTACK_SIGNATURE','HIT_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  HEAVY_GOLEM_OR_BOSS:Object.freeze({
    aliases:Object.freeze(['GOLEM','HEAVY_GOLEM']),
    coverage:Object.freeze({locomotion:7,attacks:5,defense:3,reactions:5,acting:3,deaths:3,skill:3,signature:4}),
    requiredRoles:Object.freeze(['HEAVY_START','HEAVY_STOP','HEAVY_TURN','HEAVY_RECOVERY']),
    presentationVariation:Object.freeze({weightScale:1.75,strideScale:.75,torsoLean:.55,anticipationPoseScale:1.3,recoilPoseScale:1.5,recoveryPoseScale:1.55,limbPhase:'RIGID_MASS_DELAYED',visualLimbCount:4,tailFollow:0,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['GOLEM_IDLE','GOLEM_WALK','GOLEM_RUN','HEAVY_START','HEAVY_STOP','HEAVY_TURN_L','HEAVY_TURN_R','HEAVY_RECOVERY']),
      attacks:Object.freeze(['GOLEM_OVERHEAD_SLAM','GOLEM_SWEEP','GOLEM_DOUBLE_SMASH','GOLEM_CHARGE','GOLEM_STOMP']),
      defense:Object.freeze(['GOLEM_BRACE','GOLEM_GUARD','GOLEM_DEFLECT']),
      reactions:Object.freeze(['GOLEM_HIT','GOLEM_CRACK_RECOIL','GOLEM_STAGGER','GOLEM_KNEEL','GOLEM_RECOVER']),
      acting:Object.freeze(['GOLEM_POWER_IDLE','GOLEM_THREAT','GOLEM_CORE_PULSE']),
      deaths:Object.freeze(['GOLEM_COLLAPSE','GOLEM_SHATTER','GOLEM_KNEEL_DEATH']),
      skill:Object.freeze(['GOLEM_SKILL_PREPARE','GOLEM_AOE_RELEASE','GOLEM_SKILL_RECOVERY']),
      signature:Object.freeze(['IDLE_SIGNATURE','STOMP_SIGNATURE','CORE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  QUADRUPED_CANINE:Object.freeze({
    aliases:Object.freeze(['CANINE','WOLF_QUADRUPED']),
    coverage:Object.freeze({locomotion:8,attacks:4,defense:2,reactions:5,acting:4,deaths:2,skill:2,signature:4}),
    requiredRoles:Object.freeze(['STALK','SPRINT','LUNGE_BITE','GET_UP']),
    presentationVariation:Object.freeze({weightScale:.9,strideScale:1.2,torsoLean:1.15,anticipationPoseScale:1.1,recoilPoseScale:.9,recoveryPoseScale:.9,limbPhase:'QUADRUPED_TROT_GALLOP',visualLimbCount:4,tailFollow:1,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['CANINE_IDLE','CANINE_WALK','CANINE_TROT','CANINE_RUN','CANINE_SPRINT','CANINE_STALK','CANINE_TURN_L','CANINE_TURN_R','CANINE_STOP']),
      attacks:Object.freeze(['CANINE_BITE','CANINE_LUNGE_BITE','CANINE_SIDE_BITE','CANINE_POUNCE']),
      defense:Object.freeze(['CANINE_DODGE_SIDE','CANINE_BACKSTEP']),
      reactions:Object.freeze(['CANINE_HIT_FRONT','CANINE_HIT_SIDE','CANINE_STAGGER','CANINE_KNOCKDOWN','CANINE_GET_UP']),
      acting:Object.freeze(['CANINE_SNIFF','CANINE_ALERT','CANINE_GROWL','CANINE_HOWL_OR_BARK']),
      deaths:Object.freeze(['CANINE_DEATH_SIDE','CANINE_DEATH_FORWARD']),
      skill:Object.freeze(['CANINE_SKILL_PREPARE','CANINE_SKILL_RELEASE']),
      signature:Object.freeze(['STALK_SIGNATURE','POUNCE_SIGNATURE','HOWL_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  QUADRUPED_HEAVY:Object.freeze({
    aliases:Object.freeze(['HEAVY_QUADRUPED','BEAR_QUADRUPED']),
    coverage:Object.freeze({locomotion:7,attacks:5,defense:2,reactions:5,acting:4,deaths:3,skill:2,signature:4}),
    requiredRoles:Object.freeze(['CHARGE','HEAVY_TURN','KNOCKDOWN','GET_UP']),
    presentationVariation:Object.freeze({weightScale:1.4,strideScale:.9,torsoLean:.8,anticipationPoseScale:1.25,recoilPoseScale:1.25,recoveryPoseScale:1.3,limbPhase:'QUADRUPED_HEAVY_WALK_GALLOP',visualLimbCount:4,tailFollow:.65,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['HEAVY_QUAD_IDLE','HEAVY_QUAD_WALK','HEAVY_QUAD_TROT','HEAVY_QUAD_RUN','HEAVY_QUAD_CHARGE','HEAVY_TURN_L','HEAVY_TURN_R','HEAVY_QUAD_STOP']),
      attacks:Object.freeze(['HEAVY_QUAD_BITE','HEAVY_QUAD_SWIPE','HEAVY_QUAD_RAM','HEAVY_QUAD_BODY_SLAM','HEAVY_QUAD_CHARGE_ATTACK']),
      defense:Object.freeze(['HEAVY_QUAD_BRACE','HEAVY_QUAD_EVADE']),
      reactions:Object.freeze(['HEAVY_QUAD_HIT_FRONT','HEAVY_QUAD_HIT_SIDE','HEAVY_QUAD_STAGGER','HEAVY_QUAD_KNOCKDOWN','HEAVY_QUAD_GET_UP']),
      acting:Object.freeze(['HEAVY_QUAD_SNIFF','HEAVY_QUAD_ALERT','HEAVY_QUAD_THREAT','HEAVY_QUAD_ROAR']),
      deaths:Object.freeze(['HEAVY_QUAD_DEATH_FRONT','HEAVY_QUAD_DEATH_SIDE','HEAVY_QUAD_COLLAPSE']),
      skill:Object.freeze(['HEAVY_QUAD_SKILL_PREPARE','HEAVY_QUAD_SKILL_RELEASE']),
      signature:Object.freeze(['LOCOMOTION_SIGNATURE','ROAR_SIGNATURE','ATTACK_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  ARACHNID:Object.freeze({
    aliases:Object.freeze(['SPIDER_ARACHNID']),
    coverage:Object.freeze({locomotion:8,attacks:4,defense:3,reactions:4,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['CRAWL','STRAFE','WALL_CRAWL_OR_EQUIVALENT','CEILING_CRAWL']),
    presentationVariation:Object.freeze({weightScale:.75,strideScale:1.15,torsoLean:.25,anticipationPoseScale:1.05,recoilPoseScale:.85,recoveryPoseScale:.8,limbPhase:'EIGHT_LEG_ALTERNATING_WAVE',visualLimbCount:8,tailFollow:0,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['IDLE_LEG_SHIFT','CRAWL','RUN','STRAFE_L','STRAFE_R','WALL_CRAWL','CEILING_CRAWL','TURN']),
      attacks:Object.freeze(['FANG_BITE','FRONT_LEG_STAB','POUNCE_ATTACK','WEB_OR_BODY_ATTACK']),
      defense:Object.freeze(['LEG_BRACE','SIDE_SCUTTLE','BACKSTEP']),
      reactions:Object.freeze(['HIT_FRONT','HIT_SIDE','LEG_STAGGER','KNOCKDOWN']),
      acting:Object.freeze(['PEDIPALP_TWITCH','THREAT_RAISE','SEARCH_LEG_TAP']),
      deaths:Object.freeze(['LEGS_CURL_DEATH','FLIP_COLLAPSE_DEATH']),
      skill:Object.freeze(['BURROW_PREPARE','BURROW_EMERGE','WEB_CAST']),
      signature:Object.freeze(['LEG_SHIFT_SIGNATURE','WALL_CRAWL_SIGNATURE','POUNCE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  ARACHNID_SCORPION:Object.freeze({
    aliases:Object.freeze(['SCORPION']),
    coverage:Object.freeze({locomotion:8,attacks:5,defense:3,reactions:4,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['CRAWL','STRAFE','TAIL_STING','BURROW']),
    presentationVariation:Object.freeze({weightScale:.9,strideScale:1,torsoLean:.2,anticipationPoseScale:1.15,recoilPoseScale:1,recoveryPoseScale:.95,limbPhase:'EIGHT_LEG_SCORPION_ALTERNATING',visualLimbCount:8,tailFollow:1.4,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['SCORPION_IDLE','SCORPION_CRAWL','SCORPION_RUN','SCORPION_STRAFE_L','SCORPION_STRAFE_R','SCORPION_TURN_L','SCORPION_TURN_R','SCORPION_BURROW_MOVE']),
      attacks:Object.freeze(['CLAW_PINCH','DOUBLE_CLAW','TAIL_STING','TAIL_SWEEP','POUNCE_STING']),
      defense:Object.freeze(['CLAW_GUARD','SIDE_SCUTTLE','TAIL_GUARD']),
      reactions:Object.freeze(['HIT_FRONT','HIT_SIDE','TAIL_RECOIL','STAGGER']),
      acting:Object.freeze(['TAIL_AIM_IDLE','CLAW_THREAT','SAND_PROBE']),
      deaths:Object.freeze(['SCORPION_LEGS_CURL_DEATH','SCORPION_TAIL_COLLAPSE_DEATH']),
      skill:Object.freeze(['BURROW','BURROW_EMERGE','VENOM_STING_SKILL']),
      signature:Object.freeze(['TAIL_SIGNATURE','BURROW_SIGNATURE','STING_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  HEXAPOD_INSECT:Object.freeze({
    aliases:Object.freeze(['INSECT','SIX_LEG_INSECT']),
    coverage:Object.freeze({locomotion:8,attacks:4,defense:3,reactions:4,acting:4,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['SIX_LEG_WALK','ANTENNA_SCAN','FLIP_RECOVER']),
    presentationVariation:Object.freeze({weightScale:.6,strideScale:1.1,torsoLean:.2,anticipationPoseScale:1,recoilPoseScale:.75,recoveryPoseScale:.8,limbPhase:'SIX_LEG_TRIPOD_GAIT',visualLimbCount:6,tailFollow:.2,wingFollow:.8,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['INSECT_IDLE','SIX_LEG_WALK','SIX_LEG_RUN','INSECT_TURN_L','INSECT_TURN_R','INSECT_SCUTTLE','WING_TAKEOFF','WING_LAND']),
      attacks:Object.freeze(['MANDIBLE_BITE','HORN_RAM','FORELEG_STRIKE','FLYING_DIVE']),
      defense:Object.freeze(['SHELL_BRACE','SIDE_SCUTTLE','WING_EVADE']),
      reactions:Object.freeze(['INSECT_HIT','SHELL_RECOIL','FLIP_OVER','FLIP_RECOVER']),
      acting:Object.freeze(['ANTENNA_SCAN','WING_FLUTTER','MANDIBLE_CLICK','THREAT_DISPLAY']),
      deaths:Object.freeze(['INSECT_COLLAPSE','INSECT_FLIP_DEATH']),
      skill:Object.freeze(['WING_CHARGE','BURST_RELEASE','SKILL_RECOVERY']),
      signature:Object.freeze(['ANTENNA_SIGNATURE','WING_SIGNATURE','HORN_OR_MANDIBLE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  REPTILE_OR_SERPENT:Object.freeze({
    aliases:Object.freeze(['SERPENT','SNAKE']),
    coverage:Object.freeze({locomotion:6,attacks:4,defense:2,reactions:4,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['SLITHER_OR_BODY_PLAN_EQUIVALENT','TURN_COIL','RAISE_HEAD']),
    presentationVariation:Object.freeze({weightScale:.8,strideScale:1,torsoLean:0,anticipationPoseScale:1.1,recoilPoseScale:.9,recoveryPoseScale:.9,limbPhase:'BODY_WAVE_TRAVEL',visualLimbCount:0,tailFollow:1.5,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['IDLE_COIL','SLITHER_SLOW','SLITHER_FAST','TURN_COIL','RAISE_HEAD','LOWER_HEAD']),
      attacks:Object.freeze(['BITE','COIL_GRAB','TAIL_WHIP','VENOM_SPIT']),
      defense:Object.freeze(['COIL_GUARD','SLITHER_EVADE']),
      reactions:Object.freeze(['HEAD_RECOIL','BODY_WAVE_HIT','KNOCKBACK_COIL','RECOVER_COIL']),
      acting:Object.freeze(['TONGUE_FLICK','HEAD_TRACK','THREAT_COIL']),
      deaths:Object.freeze(['SERPENT_TWIST_DEATH','SERPENT_UNCOIL_DEATH']),
      skill:Object.freeze(['VENOM_PREPARE','VENOM_RELEASE','VENOM_RECOVERY']),
      signature:Object.freeze(['COIL_SIGNATURE','SLITHER_SIGNATURE','BITE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  FLYING:Object.freeze({
    aliases:Object.freeze(['BIRD','FLYING_CREATURE','WINGED']),
    coverage:Object.freeze({locomotion:8,attacks:4,defense:3,reactions:4,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['TAKEOFF','FLY','BANK','HOVER','LAND_FROM_FLIGHT']),
    presentationVariation:Object.freeze({weightScale:.7,strideScale:1.25,torsoLean:1.1,anticipationPoseScale:1,recoilPoseScale:.8,recoveryPoseScale:.85,limbPhase:'WING_BEAT_WITH_BODY_LAG',visualLimbCount:2,tailFollow:.7,wingFollow:1.5,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['PERCH_IDLE','TAKEOFF','FLY','FAST_FLY','BANK_L','BANK_R','HOVER','LAND_FROM_FLIGHT']),
      attacks:Object.freeze(['DIVE_ATTACK','CLAW_STRIKE','BEAK_OR_BITE_ATTACK','AIR_PROJECTILE_ATTACK']),
      defense:Object.freeze(['AIR_DODGE_L','AIR_DODGE_R','WING_GUARD']),
      reactions:Object.freeze(['AIR_HIT','WING_STAGGER','SPIN_RECOVER','GROUND_HIT']),
      acting:Object.freeze(['WING_ADJUST','AIR_ALERT','CALL_DISPLAY']),
      deaths:Object.freeze(['FALL_DEATH','WING_COLLAPSE_DEATH']),
      skill:Object.freeze(['SKILL_HOVER_PREPARE','SKILL_DIVE_RELEASE','SKILL_AIR_RECOVERY']),
      signature:Object.freeze(['TAKEOFF_SIGNATURE','HOVER_SIGNATURE','DIVE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  AQUATIC:Object.freeze({
    aliases:Object.freeze(['FISH','EEL','AQUATIC_CREATURE']),
    coverage:Object.freeze({locomotion:8,attacks:4,defense:3,reactions:4,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['CRUISE','ASCEND','DIVE','TURN_SWIM']),
    presentationVariation:Object.freeze({weightScale:.8,strideScale:1.2,torsoLean:.9,anticipationPoseScale:1,recoilPoseScale:.8,recoveryPoseScale:.75,limbPhase:'AQUATIC_BODY_WAVE',visualLimbCount:0,tailFollow:1.6,wingFollow:.5,tentacleFollow:.4}),
    roles:Object.freeze({
      locomotion:Object.freeze(['AQUATIC_IDLE','CRUISE','FAST_SWIM','TURN_SWIM','ASCEND','DIVE','BRAKE_SWIM','SURFACE_OR_BOTTOM_TRANSITION']),
      attacks:Object.freeze(['AQUATIC_BITE','AQUATIC_CHARGE','TAIL_STRIKE','AQUATIC_LUNGE']),
      defense:Object.freeze(['DIVE_EVADE','ROLL_EVADE','FIN_GUARD']),
      reactions:Object.freeze(['AQUATIC_HIT','BODY_RECOIL','SPIN_STAGGER','RECOVER_SWIM']),
      acting:Object.freeze(['FIN_IDLE','SCAN_SWIM','THREAT_DISPLAY']),
      deaths:Object.freeze(['SINK_DEATH','FLOAT_DEATH']),
      skill:Object.freeze(['AQUATIC_SKILL_PREPARE','AQUATIC_SKILL_RELEASE','AQUATIC_SKILL_RECOVERY']),
      signature:Object.freeze(['SWIM_SIGNATURE','TAIL_SIGNATURE','ATTACK_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  AMORPHOUS:Object.freeze({
    aliases:Object.freeze(['SLIME','OOZE','AMORPHOUS_CREATURE']),
    coverage:Object.freeze({locomotion:6,attacks:4,defense:3,reactions:4,acting:3,deaths:2,skill:4,signature:4}),
    requiredRoles:Object.freeze(['SQUASH','STRETCH','RECOMBINE']),
    presentationVariation:Object.freeze({weightScale:.65,strideScale:.8,torsoLean:0,anticipationPoseScale:1.2,recoilPoseScale:1.4,recoveryPoseScale:1.2,limbPhase:'VOLUME_DEFORMATION',visualLimbCount:0,tailFollow:0,wingFollow:0,tentacleFollow:.5}),
    roles:Object.freeze({
      locomotion:Object.freeze(['AMORPHOUS_IDLE','STRETCH_MOVE','HOP_MOVE','SQUASH_STOP','TURN_FLOW','SLIDE_MOVE']),
      attacks:Object.freeze(['BODY_SLAM','STRETCH_STRIKE','ENGULF_ATTACK','SPLASH_ATTACK']),
      defense:Object.freeze(['SQUASH_DODGE','SPLIT_EVADE','HARDEN_GUARD']),
      reactions:Object.freeze(['SQUASH_HIT','STRETCH_RECOIL','SPLIT_REACTION','RECOMBINE']),
      acting:Object.freeze(['BUBBLE_IDLE','PULSE_ALERT','WOBBLE_THREAT']),
      deaths:Object.freeze(['MELT_DEATH','BURST_DEATH']),
      skill:Object.freeze(['SPLIT_PREPARE','SPLIT_RELEASE','ABSORB','RECOMBINE']),
      signature:Object.freeze(['WOBBLE_SIGNATURE','SPLIT_SIGNATURE','ENGULF_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  FLOATING_GHOST:Object.freeze({
    aliases:Object.freeze(['GHOST','SPIRIT','FLOATING']),
    coverage:Object.freeze({locomotion:7,attacks:4,defense:3,reactions:4,acting:4,deaths:2,skill:4,signature:4}),
    requiredRoles:Object.freeze(['FLOAT','TELEPORT_TELEGRAPH','TELEPORT_RETURN']),
    presentationVariation:Object.freeze({weightScale:.35,strideScale:1.15,torsoLean:.5,anticipationPoseScale:1.1,recoilPoseScale:.9,recoveryPoseScale:.7,limbPhase:'FLOATING_TRAIL_LAG',visualLimbCount:2,tailFollow:.8,wingFollow:0,tentacleFollow:.7}),
    roles:Object.freeze({
      locomotion:Object.freeze(['FLOAT_IDLE','FLOAT_MOVE','FLOAT_FAST','FLOAT_TURN','FLOAT_ASCEND','FLOAT_DESCEND','FLOAT_STOP']),
      attacks:Object.freeze(['REACH_ATTACK','DASH_ATTACK','SCREAM_ATTACK','ETHEREAL_SWIPE']),
      defense:Object.freeze(['PHASE_EVADE','FLOAT_DODGE','DISPERSE_GUARD']),
      reactions:Object.freeze(['DISTORT_HIT','PHASE_RECOIL','DISPERSE_HIT','REFORM']),
      acting:Object.freeze(['HOVER_SWAY','STARE','WHISPER','THREAT_FLOAT']),
      deaths:Object.freeze(['DISSOLVE_DEATH','DISPERSE_DEATH']),
      skill:Object.freeze(['TELEPORT_TELEGRAPH','TELEPORT_OUT','TELEPORT_RETURN','CURSE_CAST']),
      signature:Object.freeze(['FLOAT_SIGNATURE','TELEPORT_SIGNATURE','SCREAM_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  CENTAUR:Object.freeze({
    aliases:Object.freeze(['CENTAUROID','RIDERLESS_CENTAUR']),
    coverage:Object.freeze({locomotion:8,attacks:5,defense:3,reactions:5,acting:3,deaths:2,skill:3,signature:4}),
    requiredRoles:Object.freeze(['GALLOP','RUN_ATTACK','UPPER_LOWER_BODY_LAYERING']),
    presentationVariation:Object.freeze({weightScale:1.2,strideScale:1.2,torsoLean:1,anticipationPoseScale:1.15,recoilPoseScale:1.05,recoveryPoseScale:1.1,limbPhase:'QUADRUPED_LOWER_HUMANOID_UPPER',visualLimbCount:6,tailFollow:1,wingFollow:0,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['CENTAUR_IDLE','CENTAUR_WALK','CENTAUR_TROT','CENTAUR_GALLOP','CENTAUR_START','CENTAUR_STOP','CENTAUR_TURN_L','CENTAUR_TURN_R']),
      attacks:Object.freeze(['UPPER_BODY_SLASH','UPPER_BODY_THRUST','RUN_ATTACK','REAR_KICK','TURN_SWEEP_ATTACK']),
      defense:Object.freeze(['UPPER_BODY_GUARD','SIDESTEP','REAR_BACKSTEP']),
      reactions:Object.freeze(['UPPER_HIT','LOWER_HIT','STAGGER','KNOCKDOWN','GET_UP']),
      acting:Object.freeze(['HORSE_SHIFT','UPPER_ALERT','THREAT_DISPLAY']),
      deaths:Object.freeze(['CENTAUR_COLLAPSE','CENTAUR_SIDE_DEATH']),
      skill:Object.freeze(['CHARGE_PREPARE','CHARGE_RELEASE','CHARGE_RECOVERY']),
      signature:Object.freeze(['GALLOP_SIGNATURE','RUN_ATTACK_SIGNATURE','TURN_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  TENTACLED:Object.freeze({
    aliases:Object.freeze(['TENTACLE_CREATURE','MULTI_APPENDAGE']),
    coverage:Object.freeze({locomotion:6,attacks:6,defense:3,reactions:5,acting:4,deaths:2,skill:4,signature:5}),
    requiredRoles:Object.freeze(['TENTACLE_SEARCH','MULTI_STRIKE','GRAB']),
    presentationVariation:Object.freeze({weightScale:1.1,strideScale:.7,torsoLean:.45,anticipationPoseScale:1.25,recoilPoseScale:1.1,recoveryPoseScale:1.2,limbPhase:'TENTACLE_CASCADE',visualLimbCount:8,tailFollow:.5,wingFollow:0,tentacleFollow:1.7}),
    roles:Object.freeze({
      locomotion:Object.freeze(['TENTACLE_IDLE','BODY_CRAWL','BODY_GLIDE','TURN_BODY','ANCHOR_SHIFT','TENTACLE_DRAG_MOVE']),
      attacks:Object.freeze(['TENTACLE_SWIPE','TENTACLE_STAB','MULTI_STRIKE','GRAB','SLAM_GRAB','RANGED_TENTACLE_STRIKE']),
      defense:Object.freeze(['TENTACLE_SHIELD','RETRACT_EVADE','ANCHOR_BRACE']),
      reactions:Object.freeze(['BODY_HIT','TENTACLE_HIT','TENTACLE_RECOIL','STAGGER','RECOVER']),
      acting:Object.freeze(['TENTACLE_SEARCH','TENTACLE_TASTE_AIR','THREAT_SPREAD','FOCUS_TARGET']),
      deaths:Object.freeze(['TENTACLE_COLLAPSE_DEATH','TENTACLE_WITHER_DEATH']),
      skill:Object.freeze(['MULTI_ATTACK_PREPARE','MULTI_ATTACK_RELEASE','GRAB_SKILL','SKILL_RECOVERY']),
      signature:Object.freeze(['TENTACLE_SEARCH_SIGNATURE','MULTI_STRIKE_SIGNATURE','GRAB_SIGNATURE','BODY_WAVE_SIGNATURE','DEATH_SIGNATURE'])
    })
  }),
  SWARM:Object.freeze({
    aliases:Object.freeze(['OBJECT_SWARM','INSECT_SWARM','MICRO_CREATURE_SWARM']),
    coverage:Object.freeze({locomotion:7,attacks:4,defense:3,reactions:4,acting:3,deaths:2,skill:4,signature:4}),
    requiredRoles:Object.freeze(['EXPAND','CONTRACT','SURROUND','REGROUP']),
    presentationVariation:Object.freeze({weightScale:.25,strideScale:1.4,torsoLean:0,anticipationPoseScale:1,recoilPoseScale:1.25,recoveryPoseScale:.8,limbPhase:'SWARM_PHASE_OFFSET',visualLimbCount:0,tailFollow:0,wingFollow:1,tentacleFollow:0}),
    roles:Object.freeze({
      locomotion:Object.freeze(['SWARM_IDLE','SWARM_DRIFT','SWARM_FAST_MOVE','SWARM_TURN','EXPAND','CONTRACT','REGROUP']),
      attacks:Object.freeze(['SWARM_DIVE','SWARM_SURROUND','SWARM_BURST_ATTACK','SWARM_FOCUS_ATTACK']),
      defense:Object.freeze(['SWARM_SCATTER','SWARM_SPLIT','SWARM_EVADE']),
      reactions:Object.freeze(['SWARM_HIT_SCATTER','SWARM_HOLE_REACTION','SWARM_DISPERSE','REGROUP']),
      acting:Object.freeze(['SWARM_ORBIT','SWARM_ALERT','SWARM_THREAT']),
      deaths:Object.freeze(['SWARM_DISPERSE_DEATH','SWARM_COLLAPSE_DEATH']),
      skill:Object.freeze(['SURROUND','SWARM_CHARGE','SWARM_RELEASE','REGROUP']),
      signature:Object.freeze(['FORMATION_SIGNATURE','SURROUND_SIGNATURE','BURST_SIGNATURE','DEATH_SIGNATURE'])
    })
  })
});

const MONSTER_BODY_PLAN_ALIAS=Object.freeze(Object.fromEntries(
  Object.entries(MONSTER_BODY_PLAN_MOTION_DETAILS).flatMap(([bodyPlan,detail])=>
    [bodyPlan,...detail.aliases].map(alias=>[upper(alias),bodyPlan])
  )
));

export function resolveMonsterBodyPlanMotionDetail(bodyPlan=''){
  const requested=upper(bodyPlan);
  const resolved=MONSTER_BODY_PLAN_ALIAS[requested]||requested;
  return MONSTER_BODY_PLAN_MOTION_DETAILS[resolved]||null;
}

export const COMMON_R15_MONSTER_RETARGET_SOURCES=Object.freeze({
  locomotion:freezeList(['IDLE_RELAXED','WALK','RUN','START','STOP','TURN_90']),
  attacks:freezeList(['LIGHT_ATTACK_1','HEAVY_ATTACK_1','GATHER_SWING']),
  defense:freezeList(['BLOCK_HOLD','DODGE_LEFT','DODGE_RIGHT','PARRY_PERFECT']),
  reactions:freezeList(['HIT_FRONT','HIT_BACK','DOWNED_IDLE','REVIVE_HELP']),
  acting:freezeList(['IDLE_RELAXED','EMOTE_WAVE','TALK_GESTURE']),
  deaths:freezeList(['DEATH_FRONT']),
  skill:freezeList(['CAST_BURST','CHANNEL_LOOP','RANGED_DRAW_SHOT']),
  signature:freezeList([])
});

export function createMonsterCommonActionRetargetPlan({bodyPlan='',archetype='',group='',count=1}={}){
  const requestedBodyPlan=upper(bodyPlan);
  const detail=resolveMonsterBodyPlanMotionDetail(requestedBodyPlan);
  const family=text(group);
  const sources=COMMON_R15_MONSTER_RETARGET_SOURCES[family]||Object.freeze([]);
  if(!detail||!sources.length||family==='signature')return null;
  const canonicalBodyPlan=MONSTER_BODY_PLAN_ALIAS[requestedBodyPlan]||requestedBodyPlan;
  const amount=Math.max(1,Math.floor(Number(count)||1));
  return Object.freeze({
    sourcePack:'roblox-common-motion-v1',
    sourceAtomIds:freezeList(sources),
    sourceProductionVerified:false,
    bodyPlan:canonicalBodyPlan,
    archetype:upper(archetype),
    group:family,
    targetRoleIds:freezeList((detail.roles?.[family]||[]).slice(0,amount)),
    mode:canonicalBodyPlan==='HUMANOID_UNDEAD'?'R15_DIRECT_WHEN_COMPATIBLE_ELSE_RETARGET':'BODY_PLAN_SEMANTIC_RETARGET',
    adaptation:detail.presentationVariation,
    preserve:Object.freeze({
      gameplayMovementAuthority:true,
      damage:true,
      hitbox:true,
      cooldown:true,
      saveProgressionEconomy:true,
      networkAuthority:true,
      authoredContactTiming:true
    }),
    directCrossBodyPlanBinaryReuseForbidden:canonicalBodyPlan!=='HUMANOID_UNDEAD',
    runtimeVerificationRequired:true,
    promotionBlockedUntilRuntimeQa:true,
    productionVerified:false,
    gameplayAuthority:false
  });
}

export function createCreatureMotionSetProfile({
  id='',archetype='',bodyPlan='HUMANOID',rigProfile='HUMANOID',weightClass='STANDARD',
  locomotion=[],attacks=[],defense=[],reactions=[],acting=[],deaths=[],skill=[],signature=[],compatibleStyles=[],
  verificationState='PREPARED_SEMANTIC'
}={}){
  const resolvedBodyPlan=upper(bodyPlan);
  const motionDetailProfile=resolveMonsterBodyPlanMotionDetail(resolvedBodyPlan);
  const groups={
    locomotion:unique(locomotion),attacks:unique(attacks),defense:unique(defense),reactions:unique(reactions),
    acting:unique(acting),deaths:unique(deaths),skill:unique(skill),signature:unique(signature)
  };
  const all=unique(Object.values(groups).flat());
  return Object.freeze({
    id:text(id),
    archetype:upper(archetype),
    bodyPlan:resolvedBodyPlan,
    rigProfile:upper(rigProfile),
    weightClass:upper(weightClass),
    groups:Object.freeze(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,Object.freeze(v)]))),
    motionIds:Object.freeze(all),
    compatibleStyles:Object.freeze(unique(compatibleStyles).map(upper)),
    motionDetailProfile,
    presentationVariation:motionDetailProfile?.presentationVariation||null,
    commonSemanticRoles:motionDetailProfile?.roles||null,
    verificationState:upper(verificationState),
    productionVerified:upper(verificationState)==='VERIFIED_RUNTIME',
    gameplayAuthority:false
  });
}

export function motionSetToCandidates(profile={},platform='UNITY',styleFamily='STYLIZED_FANTASY'){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const rows=[];
  const roleMap={
    locomotion:['TRAVERSAL_ROLE','LOCOMOTION'],
    attacks:['COMBAT_ROLE','ATTACK'],
    defense:['DEFENSE_ROLE','DEFENSE'],
    reactions:['REACTION_ROLE','REACTION'],
    acting:['INTERACTION_ROLE','ACTING'],
    deaths:['REACTION_ROLE','DEATH'],
    skill:['SKILL_ROLE','SKILL'],
    signature:['COMBAT_ROLE','SIGNATURE']
  };
  for(const [group,ids] of Object.entries(p.groups||{})){
    const [field,value]=roleMap[group]||['COMBAT_ROLE',upper(group)];
    for(const id of ids){
      const dnaInput={
        motionId:id,
        bodyPlan:p.bodyPlan,
        rigProfile:p.rigProfile,
        speciesOrArchetype:p.archetype,
        styleFamily,
        weightClass:p.weightClass,
        platformVariant:platform,
        runtimeVerificationState:p.verificationState
      };
      dnaInput[field]=value;
      rows.push(Object.freeze({
        id,
        family:group,
        signature:(p.groups.signature||[]).includes(id),
        dna:createMotionDNA(dnaInput),
        preparedSemanticOnly:p.productionVerified!==true
      }));
    }
  }
  const dedup=new Map(rows.map(row=>[row.id,row]));
  return Object.freeze([...dedup.values()]);
}

export function estimateMotionCombinationSpace({layers={},styleVariants=[],skillPhases=[],reactionVariants=[],pairVariants=[]}={}){
  const counts=[];
  for(const value of Object.values(layers||{})){
    const count=Array.isArray(value)?value.length:(value?1:0);
    if(count>0)counts.push(count);
  }
  if((styleVariants||[]).length)counts.push(styleVariants.length);
  if((skillPhases||[]).length)counts.push(skillPhases.length);
  if((reactionVariants||[]).length)counts.push(reactionVariants.length);
  if((pairVariants||[]).length)counts.push(pairVariants.length);
  const theoretical=counts.length?counts.reduce((a,b)=>a*b,1):0;
  return Object.freeze({
    theoreticalCombinationCount:theoretical,
    dimensionCounts:Object.freeze(counts),
    artificialCapApplied:false,
    note:'THEORETICAL_SPACE_ONLY_REAL_RUNTIME_SELECTION_STILL_REQUIRES_COMPATIBILITY_CONTEXT_AND_QA'
  });
}


export const DEFAULT_MOTION_COVERAGE_MINIMUMS=Object.freeze({
  locomotion:5,
  attacks:3,
  defense:2,
  reactions:4,
  acting:2,
  deaths:2,
  skill:2,
  signature:3
});

export const BODY_PLAN_MOTION_COVERAGE=Object.freeze(Object.fromEntries(
  Object.entries(MONSTER_BODY_PLAN_MOTION_DETAILS).map(([bodyPlan,detail])=>[
    bodyPlan,
    Object.freeze({...detail.coverage,requiredRoles:detail.requiredRoles})
  ])
));

const SEMANTIC_GAP_ROLE_TEMPLATES=Object.freeze({
  locomotion:Object.freeze(['IDLE','WALK','RUN','START','STOP','TURN_L','TURN_R','STRAFE_L','STRAFE_R','BACKSTEP','DASH']),
  attacks:Object.freeze(['LIGHT_ATTACK_A','LIGHT_ATTACK_B','HEAVY_ATTACK_A','GAP_CLOSER','AOE_ATTACK','AIR_ATTACK','SIGNATURE_ATTACK']),
  defense:Object.freeze(['GUARD','DODGE_L','DODGE_R','PARRY_OR_DEFLECT','COUNTER','REVERSAL']),
  reactions:Object.freeze(['LIGHT_HIT','HEAVY_HIT','HIT_LEFT','HIT_RIGHT','KNOCKBACK','KNOCKDOWN','GET_UP','WALL_HIT']),
  acting:Object.freeze(['BREATH_IDLE','ALERT','THREAT_DISPLAY','TAUNT','SEARCH','ENRAGE']),
  deaths:Object.freeze(['DEATH_FRONT','DEATH_BACK','DEATH_SIDE','HEAVY_DEATH','SIGNATURE_DEATH']),
  skill:Object.freeze(['SKILL_PREPARE','SKILL_RELEASE','SKILL_RECOVERY','BUFF_OR_ENRAGE','PROJECTILE_OR_AOE','ULTIMATE']),
  signature:Object.freeze(['IDLE_SIGNATURE','LOCOMOTION_SIGNATURE','ATTACK_SIGNATURE','HIT_SIGNATURE','DEATH_SIGNATURE','SPECIAL_BODY_PART_SIGNATURE'])
});

function bodyPlanSemanticRoles(bodyPlan='',group=''){
  const key=text(group);
  const detail=resolveMonsterBodyPlanMotionDetail(bodyPlan);
  return detail?.roles?.[key]||SEMANTIC_GAP_ROLE_TEMPLATES[key]||Object.freeze([]);
}

export function resolveMotionCoverageRequirements(profile={},overrides={}){
  const bodyPlan=upper(profile.bodyPlan||profile.BODY_PLAN);
  const detail=resolveMonsterBodyPlanMotionDetail(bodyPlan);
  const canonicalBodyPlan=detail?(MONSTER_BODY_PLAN_ALIAS[bodyPlan]||bodyPlan):bodyPlan;
  const specific=BODY_PLAN_MOTION_COVERAGE[canonicalBodyPlan]||{};
  const merged={...DEFAULT_MOTION_COVERAGE_MINIMUMS,...specific,...overrides};
  const requiredRoles=unique([...(specific.requiredRoles||[]),...(overrides.requiredRoles||[])]);
  delete merged.requiredRoles;
  return Object.freeze({
    bodyPlan,
    minimums:Object.freeze(merged),
    requiredRoles:Object.freeze(requiredRoles)
  });
}

export function auditMotionCoverage(profile={},requirements={}){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const resolved=resolveMotionCoverageRequirements(p,requirements);
  const groups={};
  const gaps=[];
  for(const [group,minimum] of Object.entries(resolved.minimums)){
    if(typeof minimum!=='number')continue;
    const current=(p.groups?.[group]||[]).length;
    const missing=Math.max(0,minimum-current);
    groups[group]=Object.freeze({current,minimum,missing,complete:missing===0});
    if(missing>0)gaps.push(Object.freeze({group,current,minimum,missing}));
  }
  const normalizedMotions=(p.motionIds||[]).map(upper);
  const roleGaps=resolved.requiredRoles.filter(role=>{
    const tokens=upper(role).split('_OR_').filter(Boolean);
    return !normalizedMotions.some(id=>tokens.some(token=>id.includes(token.replace('_EQUIVALENT',''))));
  });
  return Object.freeze({
    profileId:p.id,
    archetype:p.archetype,
    bodyPlan:p.bodyPlan,
    groups:Object.freeze(groups),
    gaps:Object.freeze(gaps),
    requiredRoleGaps:Object.freeze(roleGaps),
    complete:gaps.length===0&&roleGaps.length===0,
    verifiedComplete:gaps.length===0&&roleGaps.length===0&&p.productionVerified===true,
    productionVerified:p.productionVerified===true
  });
}

export function motionSemanticFingerprint(input={}){
  const dna=input.dna||input;
  const fields=[
    upper(dna.BODY_PLAN||dna.bodyPlan),
    upper(dna.RIG_PROFILE||dna.rigProfile),
    upper(dna.COMBAT_ROLE||dna.combatRole||dna.SKILL_ROLE||dna.skillRole||dna.REACTION_ROLE||dna.reactionRole||dna.role),
    upper(dna.WEAPON_FAMILY||dna.weaponFamily),
    upper(dna.STANCE||dna.stance),
    upper(dna.STYLE_FAMILY||dna.styleFamily),
    upper(dna.CONTACT_LIMB||dna.contactLimb),
    upper(dna.TRAVEL_VECTOR||dna.travelVector)
  ];
  return fields.join('|');
}

export function findNearDuplicateMotionCandidates({candidate={},library=[]}={}){
  const fingerprint=motionSemanticFingerprint(candidate);
  return Object.freeze((library||[])
    .map(row=>Object.freeze({id:text(row.id||row.dna?.MOTION_ID),fingerprint:motionSemanticFingerprint(row),verified:(row.dna?.RUNTIME_VERIFICATION_STATE||row.RUNTIME_VERIFICATION_STATE)==='VERIFIED_RUNTIME'}))
    .filter(row=>row.id&&row.fingerprint===fingerprint)
    .sort((a,b)=>Number(b.verified)-Number(a.verified)||a.id.localeCompare(b.id)));
}

function donorCompatibilityScore(target={},donor={},group=''){
  const t=target.groups?target:createCreatureMotionSetProfile(target);
  const d=donor.groups?donor:createCreatureMotionSetProfile(donor);
  if(text(group)==='signature'&&t.archetype!==d.archetype)return -Infinity;
  if(t.bodyPlan!==d.bodyPlan)return -Infinity;
  let score=40;
  if(t.rigProfile===d.rigProfile)score+=25;
  if(t.archetype===d.archetype)score+=30;
  if(t.weightClass===d.weightClass)score+=10;
  if((t.compatibleStyles||[]).some(style=>(d.compatibleStyles||[]).includes(style)))score+=10;
  if(d.productionVerified===true)score+=50;
  return score;
}

export function findCompatibleMotionDonors({targetProfile={},librarySets=[],group='locomotion'}={}){
  const target=targetProfile.groups?targetProfile:createCreatureMotionSetProfile(targetProfile);
  return Object.freeze((librarySets||[])
    .map(row=>row.groups?row:createCreatureMotionSetProfile(row))
    .filter(row=>row.id&&row.id!==target.id&&(row.groups?.[group]||[]).length>0)
    .map(row=>Object.freeze({
      id:row.id,
      archetype:row.archetype,
      bodyPlan:row.bodyPlan,
      rigProfile:row.rigProfile,
      group:text(group),
      motionIds:Object.freeze([...(row.groups?.[group]||[])]),
      productionVerified:row.productionVerified===true,
      score:donorCompatibilityScore(target,row,group)
    }))
    .filter(row=>Number.isFinite(row.score))
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)));
}

export function scoreMotionGapPriority({gap={},usage={}}={}){
  let score=0;
  if(usage.brokenOrMissingRuntimeMotion===true)score+=50;
  if(usage.activeGameConsumer===true)score+=40;
  if(usage.heroOrBoss===true)score+=30;
  score+=Math.min(25,Math.max(0,Number(usage.gameConsumerCount)||0)*5);
  if(usage.playerVisibleFrequencyHigh===true)score+=20;
  if(usage.combatCritical===true||['attacks','defense','reactions','signature'].includes(text(gap.group)))score+=20;
  if(usage.mobileReadabilityDefect===true)score+=15;
  if(usage.externalSourceReady===true)score+=10;
  score+=Math.min(20,Math.max(0,Number(gap.missing)||0)*4);
  return score;
}

function semanticSeedIds(profile={},group='',count=0){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const roles=bodyPlanSemanticRoles(p.bodyPlan,group);
  const existing=new Set((p.groups?.[group]||[]).map(upper));
  const prefix=upper(p.archetype||p.id||'CREATURE').replace(/[^A-Z0-9]+/g,'_');
  const result=[];
  for(const role of roles){
    if(result.length>=count)break;
    if(![...existing].some(id=>id.includes(upper(role))))result.push(prefix+'_'+upper(role));
  }
  let n=1;
  while(result.length<count){
    const id=prefix+'_'+upper(group)+'_AUTO_'+String(n).padStart(2,'0');
    if(!existing.has(id))result.push(id);
    n+=1;
  }
  return Object.freeze(result.slice(0,count));
}

export function buildAutomaticMotionGapFillPlan({
  profile={},
  librarySets=[],
  externalSources=[],
  usage={},
  requirements={}
}={}){
  const target=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const audit=auditMotionCoverage(target,requirements);
  const externalMotionSources=(externalSources||[]).filter(row=>upper(row.category)==='MOTION'&&/LICENSE_VERIFIED/.test(upper(row.status||'')));
  const actions=[];
  for(const gap of audit.gaps){
    const donors=findCompatibleMotionDonors({targetProfile:target,librarySets,group:gap.group});
    const verifiedDonor=donors.find(row=>row.productionVerified===true);
    const preparedDonor=donors.find(row=>row.productionVerified!==true);
    const commonRetarget=createMonsterCommonActionRetargetPlan({
      bodyPlan:target.bodyPlan,archetype:target.archetype,group:gap.group,count:gap.missing
    });
    const priority=scoreMotionGapPriority({gap,usage});
    let route='PREPARE_SEMANTIC_MOTION_SEED';
    let sourceId=null;
    if(verifiedDonor){
      route=verifiedDonor.archetype===target.archetype?'REUSE_VERIFIED_SAME_ARCHETYPE_MOTION':'REUSE_VERIFIED_COMPATIBLE_BODY_PLAN_MOTION';
      sourceId=verifiedDonor.id;
    }else if(externalMotionSources.length){
      route='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_MOTION';
      sourceId=text(externalMotionSources[0].id);
    }else if(preparedDonor){
      route='REFERENCE_COMPATIBLE_PREPARED_SEMANTIC_DONOR';
      sourceId=preparedDonor.id;
    }else if(commonRetarget){
      route='RETARGET_COMPANY_COMMON_R15_MOTION';
      sourceId=commonRetarget.sourcePack;
    }
    actions.push(Object.freeze({
      group:gap.group,
      missing:gap.missing,
      priority,
      route,
      sourceId,
      commonRetarget,
      semanticSeeds:semanticSeedIds(target,gap.group,gap.missing),
      verifiedFill:route.startsWith('REUSE_VERIFIED_'),
      promotionBlockedUntilRuntimeQa:!route.startsWith('REUSE_VERIFIED_')
    }));
  }
  for(const role of audit.requiredRoleGaps){
    actions.push(Object.freeze({
      group:'requiredRole',
      requiredRole:role,
      missing:1,
      priority:scoreMotionGapPriority({gap:{group:'signature',missing:1},usage})+10,
      route:externalMotionSources.length?'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_MOTION':'PREPARE_SEMANTIC_MOTION_SEED',
      sourceId:externalMotionSources.length?text(externalMotionSources[0].id):null,
      semanticSeeds:Object.freeze([upper(target.archetype||target.id||'CREATURE')+'_'+upper(role).replace(/_OR_EQUIVALENT/g,'')]),
      verifiedFill:false,
      promotionBlockedUntilRuntimeQa:true
    }));
  }
  actions.sort((a,b)=>b.priority-a.priority||a.group.localeCompare(b.group));
  return Object.freeze({
    targetId:target.id,
    archetype:target.archetype,
    audit,
    actions:Object.freeze(actions),
    externalMotionSourceIds:Object.freeze(externalMotionSources.map(row=>text(row.id)).filter(Boolean)),
    semanticPreparationCanClosePlanningGap:true,
    semanticPreparationCannotCreateVerifiedCoverage:true,
    runtimeVerificationRequired:true,
    gameplayAuthority:false
  });
}

export function applySemanticGapPreparation({profile={},gapPlan={}}={}){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const groups=Object.fromEntries(Object.entries(p.groups||{}).map(([k,v])=>[k,[...v]]));
  const added=[];
  for(const action of gapPlan.actions||[]){
    if(!action.semanticSeeds?.length||action.group==='requiredRole')continue;
    if(!groups[action.group])groups[action.group]=[];
    for(const id of action.semanticSeeds){
      if(!groups[action.group].includes(id)){
        groups[action.group].push(id);
        added.push(id);
      }
    }
  }
  return Object.freeze({
    profile:createCreatureMotionSetProfile({
      id:p.id,archetype:p.archetype,bodyPlan:p.bodyPlan,rigProfile:p.rigProfile,weightClass:p.weightClass,
      ...groups,compatibleStyles:p.compatibleStyles,verificationState:'PREPARED_SEMANTIC'
    }),
    added:Object.freeze(added),
    productionVerified:false,
    state:'PREPARED_SEMANTIC',
    runtimeVerificationRequired:true
  });
}


// 실제 시간/좌표 표본에서 연속성 문제를 계산한다. 미적 품질·게임 판정 검증은 별도다.
export function auditMotionContinuityTrace({sourceHash='',expectedSourceHash='',clipId='',durationSeconds,characterHeightMeters,frames=[],limits={},requiredDetailChannels={},loop=false}={}){
  const thresholds={maxSampleGapSeconds:1/15,maxRootAcceleration:80,maxJointSpeed:12,maxJointAcceleration:80,maxLoopJointPosition:.005,maxLoopJointVelocity:.15,maxYawSpeed:20,maxPlantedDrift:.015,
    maxAttachmentOffset:.02,maxPenetrationDepth:.005,maxGazeErrorRadians:.26,maxGazeAngularSpeed:20,maxExpressionRate:12,...limits};
  const issues=[],violations=[],metrics={maxRootAcceleration:0,maxJointSpeed:0,maxJointAcceleration:0,maxYawSpeed:0,maxPlantedDrift:0,...(loop===true?{maxLoopJointPosition:0,maxLoopJointVelocity:0}:{})};
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const vec=value=>Array.isArray(value)&&value.length===3&&value.every(finite);
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const direction=value=>vec(value)&&Number.isFinite(Math.hypot(...value))&&Math.hypot(...value)>0;
  const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
  const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((sum,value,index)=>sum+value/Math.hypot(...a)*(b[index]/Math.hypot(...b)),0))));
  if(!text(sourceHash)||sourceHash!==expectedSourceHash)issues.push('CURRENT_SOURCE_HASH_REQUIRED');
  if(!text(clipId))issues.push('CLIP_ID_REQUIRED');
  if(typeof loop!=='boolean')issues.push('LOOP_CONTRACT_BOOLEAN_REQUIRED');
  if(!finite(durationSeconds)||durationSeconds<=0||!finite(characterHeightMeters)||characterHeightMeters<=0)issues.push('DURATION_AND_BODY_SCALE_REQUIRED');
  if(Object.values(thresholds).some(value=>!finite(value)||value<=0))issues.push('POSITIVE_FINITE_LIMITS_REQUIRED');
  if(!Array.isArray(frames)||frames.length<3)issues.push('CONTINUOUS_FRAME_SAMPLES_REQUIRED');
  const samples=Array.isArray(frames)?frames:[];
  const jointKeys=Object.keys(samples[0]?.jointPositions||{}),contactKeys=Object.keys(samples[0]?.contacts||{});
  const groups=['attachments','penetrations','gaze','expressions','supportedContacts'];
  const declared=record(requiredDetailChannels)?requiredDetailChannels:{};
  if(!record(requiredDetailChannels)||Object.entries(declared).some(([group,keys])=>!groups.includes(group)||!Array.isArray(keys)||keys.some(key=>typeof key!=='string'||!key.trim())||new Set(keys).size!==keys.length))issues.push('INVALID_DETAIL_CHANNEL_REQUIREMENTS');
  const channels=Object.fromEntries(groups.map(group=>[group,[...new Set([
    ...(Array.isArray(declared[group])?declared[group]:[]),
    ...(group==='supportedContacts'?contactKeys.filter(key=>samples[0].contacts[key]?.supportId!==undefined||samples[0].contacts[key]?.supportLocalPosition!==undefined):Object.keys(samples[0]?.[group]||{}))
  ])]]));
  if(channels.attachments.length)metrics.maxAttachmentOffset=0;
  if(channels.penetrations.length)metrics.maxPenetrationDepth=0;
  if(channels.gaze.length){metrics.maxGazeErrorRadians=0;metrics.maxGazeAngularSpeed=0;}
  if(channels.expressions.length)metrics.maxExpressionRate=0;
  if(!jointKeys.length||!contactKeys.length)issues.push('TRACKED_JOINTS_AND_CONTACTS_REQUIRED');
  for(let index=0;index<samples.length;index++){
    const frame=samples[index];
    if(!frame||!finite(frame.timeSeconds)||!vec(frame.rootPosition)||!finite(frame.rootYawRadians)||!record(frame.jointPositions)||!record(frame.contacts)
      ||jointKeys.some(key=>!vec(frame.jointPositions?.[key]))||Object.keys(frame.jointPositions||{}).length!==jointKeys.length
      ||contactKeys.some(key=>typeof frame.contacts?.[key]?.planted!=='boolean'||!vec(frame.contacts?.[key]?.worldPosition))||Object.keys(frame.contacts||{}).length!==contactKeys.length){issues.push('INVALID_FRAME:'+index);continue;}
    if(frame.timeSeconds<0||frame.timeSeconds>durationSeconds)issues.push('FRAME_OUTSIDE_CLIP:'+index);
    if(index&&(frame.timeSeconds<=samples[index-1]?.timeSeconds||frame.timeSeconds-samples[index-1]?.timeSeconds>thresholds.maxSampleGapSeconds+1e-9))issues.push('FRAME_GAP_OR_ORDER:'+index);
    for(const group of groups.filter(group=>group!=='supportedContacts')){
      const values=frame[group]??{};
      if(!record(values)||Object.keys(values).length!==channels[group].length||channels[group].some(key=>!Object.hasOwn(values,key)))issues.push('DETAIL_CHANNEL_SET_MISMATCH:'+group+':'+index);
      for(const key of channels[group]){
        const value=values[key];
        const valid=group==='attachments'?typeof value?.active==='boolean'&&vec(value.effectorWorldPosition)&&vec(value.targetWorldPosition)
          :group==='penetrations'?finite(value?.depthMeters)&&value.depthMeters>=0
          :group==='gaze'?typeof value?.tracking==='boolean'&&direction(value.forwardWorld)&&direction(value.targetDirectionWorld)
          :finite(value)&&value>=0&&value<=1;
        if(!valid)issues.push('INVALID_DETAIL_SAMPLE:'+group+':'+key+':'+index);
      }
    }
    for(const key of contactKeys){
      const contact=frame.contacts[key],supported=channels.supportedContacts.includes(key);
      if(supported?typeof contact.supportId!=='string'||!contact.supportId.trim()||!vec(contact.supportLocalPosition):contact.supportId!==undefined||contact.supportLocalPosition!==undefined)issues.push('INVALID_SUPPORT_SAMPLE:'+key+':'+index);
      const previous=samples[index-1]?.contacts?.[key];
      if(supported&&contact.planted&&previous?.planted&&contact.supportId!==previous.supportId)issues.push('PLANTED_SUPPORT_CHANGED:'+key+':'+index);
    }
  }
  if(channels.supportedContacts.some(key=>!contactKeys.includes(key)))issues.push('REQUIRED_SUPPORT_CONTACT_MISSING');
  if(samples[0]?.timeSeconds!==0||!finite(samples.at(-1)?.timeSeconds)||Math.abs(samples.at(-1).timeSeconds-durationSeconds)>1e-6)issues.push('FULL_CLIP_BOUNDARIES_REQUIRED');
  if(issues.length)return Object.freeze({verdict:'UNVERIFIED',sourceHash:text(sourceHash),clipId:text(clipId),issues:freezeList(issues),violations:freezeList([]),metrics:null,blocksVerifiedPromotion:true,runtimeVerified:false});
  const anchors=new Map(),openViolations=new Map(),jointVelocities=new Map();let previousVelocity=null,previousDt=null;
  const report=(kind,index,value,limit,region,startIndex=Math.max(0,index-1))=>{
    metrics[kind]=Math.max(metrics[kind],value);
    const key=kind+':'+region,open=openViolations.get(key);
    if(value<=limit){openViolations.delete(key);return;}
    if(open&&open.frameRange[1]===index-1){
      open.frameRange[1]=index;open.normalizedTimeRange[1]=samples[index].timeSeconds/durationSeconds;
      if(value>open.value){open.value=value;open.peakFrame=index;}
    }else{
      const finding={kind,region,value,limit,peakFrame:index,frameRange:[startIndex,index],normalizedTimeRange:[samples[startIndex].timeSeconds/durationSeconds,samples[index].timeSeconds/durationSeconds]};
      violations.push(finding);openViolations.set(key,finding);
    }
  };
  // 발판 이동·회전을 제거한 동일 지지물의 로컬 좌표를 계측 측에서 미터로 기록한다.
  const contactPosition=(frame,key)=>channels.supportedContacts.includes(key)?frame.contacts[key].supportLocalPosition:frame.contacts[key].worldPosition;
  for(const key of contactKeys)if(samples[0].contacts[key].planted)anchors.set(key,contactPosition(samples[0],key));
  for(let index=0;index<samples.length;index++){
    const frame=samples[index],previous=samples[index-1];
    for(const key of channels.attachments){
      const value=frame.attachments[key];
      report('maxAttachmentOffset',index,value.active?distance(value.effectorWorldPosition,value.targetWorldPosition)/characterHeightMeters:0,thresholds.maxAttachmentOffset,key,index);
    }
    for(const key of channels.penetrations)report('maxPenetrationDepth',index,frame.penetrations[key].depthMeters/characterHeightMeters,thresholds.maxPenetrationDepth,key,index);
    for(const key of channels.gaze){
      const value=frame.gaze[key],before=previous?.gaze[key];
      report('maxGazeErrorRadians',index,value.tracking?angle(value.forwardWorld,value.targetDirectionWorld):0,thresholds.maxGazeErrorRadians,key,index);
      if(previous)report('maxGazeAngularSpeed',index,value.tracking&&before.tracking?angle(value.forwardWorld,before.forwardWorld)/(frame.timeSeconds-previous.timeSeconds):0,thresholds.maxGazeAngularSpeed,key);
    }
    if(previous)for(const key of channels.expressions)report('maxExpressionRate',index,Math.abs(frame.expressions[key]-previous.expressions[key])/(frame.timeSeconds-previous.timeSeconds),thresholds.maxExpressionRate,key);
  }
  for(let index=1;index<samples.length;index++){
    const before=samples[index-1],after=samples[index],dt=after.timeSeconds-before.timeSeconds;
    const velocity=after.rootPosition.map((value,axis)=>(value-before.rootPosition[axis])/dt/characterHeightMeters);
    if(previousVelocity)report('maxRootAcceleration',index,distance(velocity,previousVelocity)/((dt+previousDt)/2),thresholds.maxRootAcceleration,'ROOT');
    previousVelocity=velocity;
    const yawDelta=after.rootYawRadians-before.rootYawRadians;
    report('maxYawSpeed',index,Math.abs(Math.atan2(Math.sin(yawDelta),Math.cos(yawDelta)))/dt,thresholds.maxYawSpeed,'ROOT_YAW');
    for(const key of jointKeys){
      const jointVelocity=after.jointPositions[key].map((value,axis)=>(value-before.jointPositions[key][axis])/dt/characterHeightMeters);
      report('maxJointSpeed',index,Math.hypot(...jointVelocity),thresholds.maxJointSpeed,key);
      if(jointVelocities.has(key))report('maxJointAcceleration',index,distance(jointVelocity,jointVelocities.get(key))/((dt+previousDt)/2),thresholds.maxJointAcceleration,key,Math.max(0,index-2));
      jointVelocities.set(key,jointVelocity);
    }
    previousDt=dt;
    for(const key of contactKeys){
      const contact=after.contacts[key];
      if(!contact.planted){anchors.delete(key);openViolations.delete('maxPlantedDrift:'+key);continue;}
      if(!anchors.has(key))anchors.set(key,contactPosition(after,key));
      report('maxPlantedDrift',index,distance(contactPosition(after,key),anchors.get(key))/characterHeightMeters,thresholds.maxPlantedDrift,key);
    }
  }
  if(loop){
    const last=samples.length-1,first=samples[0],end=samples[last];
    // 루트의 전진 거리는 보존하고, 루트 로컬 관절의 닫힘과 속도만 비교한다.
    const boundaryVelocity=(key,endIndex,neighbor,other)=>{
      const t1=samples[neighbor].timeSeconds-samples[endIndex].timeSeconds,t2=samples[other].timeSeconds-samples[endIndex].timeSeconds;
      return samples[endIndex].jointPositions[key].map((value,axis)=>(-(t1+t2)/(t1*t2)*value+t2/(t1*(t2-t1))*samples[neighbor].jointPositions[key][axis]-t1/(t2*(t2-t1))*samples[other].jointPositions[key][axis])/characterHeightMeters);
    };
    for(const key of jointKeys){
      report('maxLoopJointPosition',last,distance(first.jointPositions[key],end.jointPositions[key])/characterHeightMeters,thresholds.maxLoopJointPosition,key,0);
      report('maxLoopJointVelocity',last,distance(boundaryVelocity(key,0,1,2),boundaryVelocity(key,last,last-1,last-2)),thresholds.maxLoopJointVelocity,key,0);
    }
    for(const key of contactKeys)if(first.contacts[key].planted!==end.contacts[key].planted)violations.push({kind:'LOOP_CONTACT_STATE_MISMATCH',region:key,frameRange:[0,last],normalizedTimeRange:[0,1],peakFrame:last});
  }
  return Object.freeze({verdict:violations.length?'FAIL':'PASS',sourceHash,clipId,issues:freezeList([]),metrics:Object.freeze(metrics),violations:freezeList(violations),thresholds:Object.freeze(thresholds),
    frameCount:samples.length,coordinateContract:'ROOT_AND_CONTACT_WORLD_METERS_JOINTS_ROOT_LOCAL_METERS_YAW_RADIANS',
    detailCoordinateContract:'ATTACHMENTS_WORLD_METERS_PENETRATION_METERS_GAZE_WORLD_DIRECTIONS_EXPRESSION_WEIGHTS_0_TO_1_SUPPORT_LOCAL_METERS',
    measurementCoverage:Object.freeze({channels,requiredDetailChannels:declared,unmeasuredGroups:groups.filter(group=>!channels[group].length),jointAccelerationMeasured:true,loopBoundaryMeasured:loop}),
    blocksVerifiedPromotion:violations.length>0,traceChecksOnly:true,runtimeVerified:false});
}

export function evaluateMotionTransition({
  from={},
  to={},
  metrics={},
  continuityTrace=null,
  blendDurationSeconds=null,
  proposeSmoothing=true
}={}){
  const required=['poseDiscontinuity','rootVelocityDelta','angularVelocityDelta','footContactBreak','handContactBreak','contactMarkerOffset','blendDurationPenalty','silhouettePop'];
  const missing=required.filter(key=>typeof metrics[key]!=='number'||!Number.isFinite(metrics[key])||metrics[key]<0||metrics[key]>100);
  const pose=Math.max(0,100-Number(metrics.poseDiscontinuity||0));
  const root=Math.max(0,100-Number(metrics.rootVelocityDelta||0));
  const angular=Math.max(0,100-Number(metrics.angularVelocityDelta||0));
  const foot=Math.max(0,100-Number(metrics.footContactBreak||0));
  const hand=Math.max(0,100-Number(metrics.handContactBreak||0));
  const marker=Math.max(0,100-Number(metrics.contactMarkerOffset||0));
  const blend=Math.max(0,100-Number(metrics.blendDurationPenalty||0));
  const silhouette=Math.max(0,100-Number(metrics.silhouettePop||0));
  const hardFailures=[];
  if(metrics.teleportPop===true)hardFailures.push('TELEPORT_POP');
  if(metrics.doubleRootAuthority===true)hardFailures.push('DOUBLE_ROOT_AUTHORITY');
  if(Number(metrics.footContactBreak||0)>=80)hardFailures.push('FOOT_CONTACT_SNAP');
  if(metrics.pairAlignmentBreak===true)hardFailures.push('PAIR_ALIGNMENT_BREAK');
  if(metrics.gameplayEventDesync===true)hardFailures.push('GAMEPLAY_EVENT_DESYNC');
  // 동일 모션 디렉터의 연속 프레임 실측 검사에 전환 구간을 연결한다.
  const continuity=continuityTrace===null?null:auditMotionContinuityTrace(continuityTrace);
  const blendSpecified=blendDurationSeconds!==null;
  const blendMeasured=blendSpecified&&typeof blendDurationSeconds==='number'&&Number.isFinite(blendDurationSeconds)&&blendDurationSeconds>0;
  const minBlendSeconds=.08;
  if(continuity?.verdict==='FAIL')hardFailures.push('MEASURED_TRANSITION_DISCONTINUITY');
  if(blendMeasured&&blendDurationSeconds<minBlendSeconds&&continuity?.verdict==='FAIL')hardFailures.push('SHORT_BLEND_WITH_MEASURED_POP');
  const shortBlendReview=blendMeasured&&blendDurationSeconds<minBlendSeconds;
  // 원본 타이밍·이벤트·루트 이동은 건드리지 않는다. 시각 관절 키만 제한적으로 재배치한 후보를 반환한다.
  const corrections=[];
  let correctionTrace=null;
  if(continuity?.verdict==='FAIL'&&proposeSmoothing===true&&Array.isArray(continuityTrace?.frames)){
    const original=continuityTrace.frames;
    const candidate=original.map(frame=>({...frame,jointPositions:{...frame.jointPositions}}));
    const bodyScale=Number(continuityTrace.characterHeightMeters);
    const maxCorrection=bodyScale*.025;
    const touched=new Set();
    for(const finding of continuity.violations.filter(row=>['maxJointSpeed','maxJointAcceleration'].includes(row.kind))){
      const joint=finding.region;
      for(let index=Math.max(1,finding.frameRange[0]);index<=Math.min(original.length-2,finding.frameRange[1]);index++){
        const before=original[index-1]?.jointPositions?.[joint],center=original[index]?.jointPositions?.[joint],after=original[index+1]?.jointPositions?.[joint];
        if(!Array.isArray(before)||!Array.isArray(center)||!Array.isArray(after)||original[index]?.contacts?.[joint]?.planted===true)continue;
        const desired=center.map((value,axis)=>(before[axis]+after[axis])/2-value);
        const distance=Math.hypot(...desired);
        if(!Number.isFinite(distance)||distance<=0)continue;
        const weight=Math.min(.5,maxCorrection/distance);
        const corrected=center.map((value,axis)=>value+desired[axis]*weight);
        candidate[index].jointPositions[joint]=corrected;
        const key=index+':'+joint;
        if(!touched.has(key)){
          corrections.push(Object.freeze({frame:index,joint,original:Object.freeze([...center]),proposed:Object.freeze(corrected),
            displacementMeters:Math.hypot(...corrected.map((value,axis)=>value-center[axis]))}));
          touched.add(key);
        }
      }
    }
    if(corrections.length)correctionTrace=auditMotionContinuityTrace({...continuityTrace,frames:candidate});
  }
  const score=missing.length?null:Math.round((pose+root+angular+foot+hand+marker+blend+silhouette)/8);
  let verdict=hardFailures.length?'FAIL':missing.length?'UNVERIFIED':score>=85?'PASS':score>=70?'WARN':'FAIL';
  if(continuity?.verdict==='UNVERIFIED'||(continuity&&blendSpecified&&!blendMeasured))verdict=hardFailures.length?'FAIL':'UNVERIFIED';
  if(verdict==='PASS'&&shortBlendReview)verdict='WARN';
  return Object.freeze({
    fromId:text(from.id||from.MOTION_ID),
    toId:text(to.id||to.MOTION_ID),
    score,
    verdict,
    missingMeasurements:freezeList(missing),
    blocksVerifiedPromotion:verdict!=='PASS',
    hardFailures:Object.freeze(hardFailures),
    metrics:Object.freeze({pose,root,angular,foot,hand,marker,blend,silhouette}),
    measuredContinuity:continuity,
    blendDuration:Object.freeze({measured:blendMeasured,seconds:blendMeasured?blendDurationSeconds:null,
      reviewBelowSeconds:minBlendSeconds,shortBlendReview}),
    smoothingProposal:Object.freeze({generated:corrections.length>0,corrections:freezeList(corrections),
      correctedTraceVerdict:correctionTrace?.verdict||null,nativeReplayRequired:true,
      authoredOriginalUntouched:true,gameplayTimingUnchanged:true,
      automaticAssetPromotionAllowed:false}),
    runtimeVerified:false,
    gameplayWindowAuthority:false
  });
}

export function auditMotionContact(input={}){
  const {footSlideNormalized,footPlantDriftNormalized,handWeaponOffsetNormalized,
    attackContactOffsetNormalized,pairContactOffsetNormalized,impactEventNormalizedTimeOffset,
    groundPenetration,meshIntersection,thresholds={},notApplicable={}}=input;
  const limits={
    footSlideNormalizedMax:Number(thresholds.footSlideNormalizedMax??0.035),
    handWeaponNormalizedMax:Number(thresholds.handWeaponNormalizedMax??0.04),
    attackContactNormalizedMax:Number(thresholds.attackContactNormalizedMax??0.06),
    pairContactNormalizedMax:Number(thresholds.pairContactNormalizedMax??0.05),
    impactEventNormalizedTimeMax:Number(thresholds.impactEventNormalizedTimeMax??0.04)
  };
  const failures=[];
  const numeric=['footSlideNormalized','footPlantDriftNormalized','handWeaponOffsetNormalized','attackContactOffsetNormalized','pairContactOffsetNormalized','impactEventNormalizedTimeOffset'];
  const required=[...numeric,'groundPenetration','meshIntersection'];
  // 해당 없음은 몸 구조·동작에 따른 이유가 있어야 하며, 제공된 실패 측정을 숨길 수 없다.
  const exempt=required.filter(key=>input[key]===undefined&&typeof notApplicable[key]==='string'&&text(notApplicable[key]));
  const missing=required.filter(key=>!exempt.includes(key)&&(numeric.includes(key)
    ?typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<0
    :typeof input[key]!=='boolean'));
  const invalidLimits=Object.entries(limits).filter(([,value])=>!Number.isFinite(value)||value<0).map(([key])=>key);
  failures.push(...invalidLimits.map(key=>'INVALID_THRESHOLD:'+key));
  if(Number(footSlideNormalized)>limits.footSlideNormalizedMax)failures.push('FOOT_SLIDE_DISTANCE');
  if(Number(footPlantDriftNormalized)>limits.footSlideNormalizedMax)failures.push('FOOT_PLANT_DRIFT');
  if(Number(handWeaponOffsetNormalized)>limits.handWeaponNormalizedMax)failures.push('HAND_WEAPON_OFFSET');
  if(Number(attackContactOffsetNormalized)>limits.attackContactNormalizedMax)failures.push('ATTACK_CONTACT_OFFSET');
  if(Number(pairContactOffsetNormalized)>limits.pairContactNormalizedMax)failures.push('PAIR_CONTACT_POINT_DRIFT');
  if(Number(impactEventNormalizedTimeOffset)>limits.impactEventNormalizedTimeMax)failures.push('IMPACT_EVENT_OFFSET');
  if(groundPenetration===true)failures.push('GROUND_PENETRATION');
  if(meshIntersection===true)failures.push('MESH_INTERSECTION');
  const observedCount=required.length-missing.length-exempt.length;
  if(!observedCount)missing.push('ACTUAL_CONTACT_OBSERVATION_REQUIRED');
  const score=missing.length?null:Math.max(0,100-failures.length*18);
  const pass=failures.length===0&&missing.length===0;
  return Object.freeze({
    pass,
    verdict:failures.length?'FAIL':missing.length?'UNVERIFIED':'PASS',
    score,
    missingMeasurements:freezeList(missing),
    notApplicable:Object.freeze(Object.fromEntries(exempt.map(key=>[key,text(notApplicable[key])]))),
    failures:Object.freeze(failures),
    limits:Object.freeze(limits),
    blocksVerifiedPromotion:!pass
  });
}

const GAMEPLAY_EVENT_MOTION_MAP=Object.freeze({
  MOVE:Object.freeze(['LOCOMOTION']),
  JUMP:Object.freeze(['PREPARE','TAKEOFF_OR_ENTRY','TRAVEL','CONTACT_OR_EXIT','RECOVERY']),
  LAND:Object.freeze(['CONTACT_OR_EXIT','RECOVERY']),
  DODGE:Object.freeze(['READ','BLOCK_OR_EVADE','RECOVERY']),
  BLOCK:Object.freeze(['READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','RECOVERY']),
  PARRY:Object.freeze(['READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','COUNTER_OPTION','RECOVERY']),
  COUNTER:Object.freeze(['READ','COUNTER_OPTION','RECOVERY']),
  MELEE_ATTACK:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  RANGED_ATTACK:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  BITE:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  CLAW:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  HORN_CHARGE:Object.freeze(['PREPARE','TRAVEL','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  GRAB:Object.freeze(['ALIGN','LOCK','EXECUTE','SEPARATE','RECOVERY']),
  THROW:Object.freeze(['ALIGN','LOCK','EXECUTE','IMPACT','SEPARATE','RECOVERY']),
  KNOCKDOWN:Object.freeze(['HIT_REACTION','KNOCKDOWN','RECOVERY']),
  GET_UP:Object.freeze(['PREPARE','RECOVERY']),
  CAST:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  CHANNEL:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','HOLD','RELEASE','RECOVERY']),
  PROJECTILE:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  BEAM:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','AIM_OR_TARGET','RELEASE','RECOVERY']),
  AOE:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  BUFF:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  DEBUFF:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  HEAL:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  TELEPORT:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  TRANSFORM:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  SUMMON:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  PHASE_CHANGE:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  ENRAGE:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  DEATH:Object.freeze(['ACTIVE_CONTACT','RECOVERY'])
});

export function bindGameplayEventToMotion({event='',availableRoles=[]}={}){
  const normalized=upper(event);
  const required=[...(GAMEPLAY_EVENT_MOTION_MAP[normalized]||[])];
  const available=(availableRoles||[]).map(upper);
  const missing=required.filter(role=>!available.includes(role));
  return Object.freeze({
    event:normalized,
    requiredRoles:Object.freeze(required),
    missingRoles:Object.freeze(missing),
    complete:missing.length===0,
    preparedSemanticSeeds:Object.freeze(missing.map(role=>normalized+'_'+role)),
    state:missing.length?'PREPARED_SEMANTIC':'BOUND',
    gameplayEventAuthority:true,
    motionAuthority:false
  });
}

export function createProceduralMotionProfile({
  footIk=true,
  footLock=true,
  multiLimbContact=true,
  groundNormal=true,
  pelvisHeight=true,
  spineLean=true,
  headGaze=true,
  lookAtTarget=true,
  handGrip=true,
  handContact=true,
  weaponGripLock=true,
  contactCorrection=true,
  aimOffset=true,
  tailBalance=false,
  wingBalance=false,
  slopeAdaptation=true,
  stairContact=true,
  ledgeContact=true,
  wallProximityPose=true,
  limbCount=2,
  platformBudget='MOBILE'
}={}){
  const limbs=Math.max(2,Math.floor(Number(limbCount)||2));
  return Object.freeze({
    corrections:Object.freeze({
      FOOT_IK:footIk===true,
      FOOT_PLANT_LOCK:footLock===true,
      MULTI_LIMB_CONTACT:multiLimbContact===true&&limbs>2,
      GROUND_NORMAL_ALIGNMENT:groundNormal===true,
      PELVIS_HEIGHT:pelvisHeight===true,
      SPINE_LEAN:spineLean===true,
      HEAD_GAZE:headGaze===true,
      LOOK_AT_TARGET:lookAtTarget===true,
      HAND_GRIP:handGrip===true,
      HAND_WORLD_CONTACT:handContact===true,
      WEAPON_GRIP_LOCK:weaponGripLock===true,
      CONTACT_CORRECTION:contactCorrection===true,
      AIM_OFFSET:aimOffset===true,
      TAIL_BALANCE:tailBalance===true,
      WING_BALANCE:wingBalance===true,
      SLOPE_BODY_ADAPTATION:slopeAdaptation===true,
      STAIR_CONTACT:stairContact===true,
      LEDGE_CONTACT:ledgeContact===true,
      WALL_PROXIMITY_POSE:wallProximityPose===true
    }),
    limbCount:limbs,
    contactPolicy:Object.freeze({
      plantedLimbWorldLock:true,
      predictiveGroundProbe:true,
      perLimbSurfaceNormal:true,
      handAndWeaponTargetConstraint:true,
      bodyPlanSpecificSolverRequired:limbs>2
    }),
    platformBudget:upper(platformBudget),
    visualOnly:true,
    gameplayColliderAndMovementAuthorityImmutable:true
  });
}

export function createGroupMotionPlan({
  pattern='PACK_SURROUND',
  actors=[],
  targetPosition=null,
  recentGroupActions=[],
  spacing=1
}={}){
  const normalizedActors=(actors||[]).map((actor,index)=>Object.freeze({
    id:text(actor.id||('actor-'+index)),
    role:upper(actor.role||'MEMBER'),
    slot:index
  }));
  const recent=(recentGroupActions||[]).map(upper);
  const patternName=upper(pattern);
  const staggered=normalizedActors.map((actor,index)=>Object.freeze({
    actorId:actor.id,
    phaseOffset:index%Math.max(1,Math.min(4,normalizedActors.length)),
    attackSuppressed:recent[recent.length-1]===upper(actor.id)
  }));
  return Object.freeze({
    pattern:patternName,
    actors:Object.freeze(normalizedActors),
    targetPosition,
    spacing:Number(spacing)||1,
    staggered:Object.freeze(staggered),
    exactSynchronizedAttackSpamForbidden:true,
    gameplayAiDecisionAuthorityImmutable:true
  });
}

export function createMultiActorMotionContract({
  id='',
  pattern='PAIR_GRAB',
  actors=[],
  platformProfile='MOBILE',
  alignment={}
}={}){
  const maxActors=upper(platformProfile)==='DESKTOP'?8:4;
  const rows=(actors||[]).map((actor,index)=>Object.freeze({
    id:text(actor.id||('actor-'+index)),
    role:upper(actor.role||('ROLE_'+index)),
    motionId:text(actor.motionId)
  }));
  return Object.freeze({
    id:text(id),
    pattern:upper(pattern),
    actors:Object.freeze(rows),
    actorCount:rows.length,
    maxActors,
    requiresExplicitPerformanceEvidence:rows.length>maxActors,
    alignment:Object.freeze({
      roots:alignment.roots!==false,
      facing:alignment.facing!==false,
      contactPoints:freezeList(unique(alignment.contactPoints)),
      phaseMarkers:freezeList(unique(alignment.phaseMarkers)),
      safeSeparationExit:text(alignment.safeSeparationExit)||null
    }),
    gameplayAuthority:false
  });
}

export function createEmotionIntentLayer({
  intent='CALM',
  intensity=1,
  channels={}
}={}){
  const normalized=upper(intent);
  return Object.freeze({
    intent:normalized,
    intensity:clamp(intensity,0,2),
    channels:Object.freeze({
      STANCE:channels.stance!==false,
      BREATHING:channels.breathing!==false,
      HEAD_GAZE:channels.headGaze!==false,
      SHOULDER_SPINE:channels.shoulderSpine!==false,
      HAND_OR_CLAW_TENSION:channels.handOrClawTension!==false,
      IDLE_VARIATION:channels.idleVariation!==false,
      RECOVERY_STYLE:channels.recoveryStyle!==false
    }),
    additiveWhenCompatible:true,
    emotionMayNotChangeGameplayStats:true
  });
}

export function selectMotionLod({
  cameraDistance=0,
  screenSize=0,
  deviceClass='MOBILE',
  actorImportance='STANDARD',
  combatRelevant=true,
  visible=true
}={}){
  const importance=upper(actorImportance);
  const device=upper(deviceClass);
  let tier='FAR';
  if(visible===false)tier='OFFSCREEN';
  else if(importance==='HERO'||importance==='BOSS'||Number(cameraDistance)<12||Number(screenSize)>0.2)tier='NEAR';
  else if(Number(cameraDistance)<35||combatRelevant===true)tier='MID';
  if(device==='LOW_END_MOBILE'&&tier==='NEAR'&&importance!=='HERO'&&importance!=='BOSS')tier='MID';
  const features=tier==='NEAR'
    ?['FULL_BODY_LAYERING','POSE_MATCHING','IK_CONTACT','FULL_IK_CONTACT','HEAD_GAZE','SECONDARY_MOTION','FACIAL_WHEN_AVAILABLE','FULL_VFX_SYNC']
    :tier==='MID'
      ?['CORE_LAYERING','POSE_MATCHING','SIMPLIFIED_IK','HEAD_GAZE','LIMITED_SECONDARY']
      :tier==='FAR'
        ?['BASE_LOCOMOTION','PRIMARY_ACTION','CRITICAL_REACTION_ONLY']
        :['CRITICAL_STATE_ONLY'];
  const budget=tier==='NEAR'
    ?{animationHz:60,ikHz:60,secondaryHz:30,facialHz:30}
    :tier==='MID'
      ?{animationHz:30,ikHz:20,secondaryHz:15,facialHz:10}
      :tier==='FAR'
        ?{animationHz:15,ikHz:0,secondaryHz:0,facialHz:0}
        :{animationHz:5,ikHz:0,secondaryHz:0,facialHz:0};
  return Object.freeze({
    tier,
    features:Object.freeze(features),
    budget:Object.freeze(budget),
    offscreenMayReducePoseEvaluation:tier==='OFFSCREEN',
    heroAndBossNeverLoseCriticalReaction:true,
    gameplayHitAndCollisionUnaffected:true,
    mobileBudgetFirst:true
  });
}

export function createMotionLineage({
  assetId='',
  parentId='',
  sourceId='',
  sourceHash='',
  derivedHash='',
  transformHistory=[],
  licenseEvidence='',
  rigProfile='',
  styleFamily='',
  platform='',
  gameId='',
  verificationSha='',
  runtimeEvidenceId=''
}={}){
  return Object.freeze({
    assetId:text(assetId),
    parentId:text(parentId)||null,
    sourceId:text(sourceId)||null,
    sourceHash:text(sourceHash)||null,
    derivedHash:text(derivedHash)||null,
    transformHistory:freezeList(unique(transformHistory)),
    licenseEvidence:text(licenseEvidence)||null,
    rigProfile:upper(rigProfile),
    styleFamily:upper(styleFamily),
    platform:upper(platform),
    gameId:text(gameId)||null,
    verificationSha:text(verificationSha)||null,
    runtimeEvidenceId:text(runtimeEvidenceId)||null,
    originalImmutable:true,
    revalidateDerivedWhenParentImproves:true,
    complete:Boolean(assetId&&sourceId&&derivedHash&&platform)
  });
}

export function aggregateRuntimeMotionSignals(samples=[]){
  const rows=(samples||[]).filter(Boolean);
  const n=Math.max(1,rows.length);
  const avg=key=>rows.reduce((sum,row)=>sum+Number(row[key]||0),0)/n;
  const count=key=>rows.filter(row=>row[key]===true).length;
  const usage=new Map();
  for(const row of rows){
    const id=text(row.motionId);
    if(id)usage.set(id,(usage.get(id)||0)+1);
  }
  const immediateRepeatRate=rows.length?count('immediateRepeat')/rows.length:0;
  const sameFamilyRepeatRate=rows.length?count('sameFamilyRepeat')/rows.length:0;
  const verifiedPassCount=rows.filter(row=>row.runtimeVerified===true&&row.pass===true).length;
  const verifiedFailureCount=rows.filter(row=>row.runtimeVerified===true&&row.pass===false&&text(row.failureReason)).length;
  return Object.freeze({
    sampleCount:rows.length,
    usageByMotion:Object.freeze(Object.fromEntries([...usage.entries()])),
    transitionQualityScore:avg('transitionQualityScore'),
    contactQaScore:avg('contactQaScore'),
    pairAlignmentScore:avg('pairAlignmentScore'),
    motionLodFrameCost:avg('motionLodFrameCost'),
    frameStabilityScore:avg('frameStabilityScore'),
    mobileReadabilityScore:avg('mobileReadabilityScore'),
    immediateRepeatRate,
    sameFamilyRepeatRate,
    verifiedPassCount,
    verifiedFailureCount,
    rawTelemetryAuthority:false
  });
}

export function buildRuntimeMotionLearningCandidate({
  gameId='',
  platform='',
  signals={},
  samples=[]
}={}){
  const summary=signals.sampleCount!==undefined?signals:aggregateRuntimeMotionSignals(samples);
  const verifiedSamples=(samples||[]).filter(row=>row.runtimeVerified===true);
  const positive=verifiedSamples.some(row=>row.pass===true);
  const negative=verifiedSamples.some(row=>row.pass===false&&text(row.failureReason));
  const lessons=unique(verifiedSamples.filter(row=>row.pass===false&&text(row.failureReason)).map(row=>upper(row.failureReason)));
  return Object.freeze({
    gameId:text(gameId),
    platform:upper(platform),
    domains:Object.freeze(['LIVING_MOTION','ANIMATION_FEEL','ASSET_ADAPTATION','VFX','CAMERA_LANGUAGE']),
    summary,
    positiveMasteryEligible:positive,
    negativeAvoidPatternEligible:negative,
    verifiedFailureLessons:Object.freeze(lessons),
    preparedSemanticEligible:false,
    rawTelemetryDirectTraining:false,
    feedsExistingCanonicalLearningChain:positive||negative,
    requiresExistingDistillationThresholdHoldoutAndCanary:true,
    platformEvidenceIndependent:true
  });
}


export function selectRobloxCharacterMotionSource({
  candidates=[],
  context={},
  gameId='',
  archetype='',
  recentMotionIds=[]
}={}){
  const targetGame=text(gameId||context.gameId);
  const targetArchetype=upper(archetype||context.speciesOrArchetype||context.archetype);
  const rows=(candidates||[]).map(candidate=>{
    const dna=candidate.dna||candidate;
    const base=scoreMotionCandidate(candidate,{...context,platform:'ROBLOX'},recentMotionIds);
    if(!base.valid||candidate.qualityReview?.verdict==='FAIL')return Object.freeze({candidate,id:base.id,valid:false,score:-Infinity,sourceClass:'INCOMPATIBLE',rejectedBy:base.rejectedBy||'QUALITY_REVIEW_FAILED'});
    const verified=upper(dna.RUNTIME_VERIFICATION_STATE||candidate.runtimeVerificationState)==='VERIFIED_RUNTIME'||candidate.companyVerified===true;
    const sameGame=targetGame&&text(candidate.gameId||candidate.GAME_ID)===targetGame;
    const sameArchetype=targetArchetype&&upper(dna.SPECIES_OR_ARCHETYPE||candidate.archetype)===targetArchetype;
    const provenance=upper(dna.SOURCE_PROVENANCE||candidate.sourceProvenance||candidate.sourceType);
    const licensed=candidate.licenseVerified===true||/LICENSE_VERIFIED|CC0|PROJECT_ORIGINAL|ROBLOX_PLATFORM/.test(provenance);
    let sourceClass='NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP',bonus=0;
    if(verified&&sameGame&&sameArchetype){sourceClass='VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION';bonus=500;}
    else if(verified&&candidate.companyVerified===true){sourceClass='VERIFIED_COMPATIBLE_COMPANY_MOTION_LIBRARY';bonus=400;}
    else if(licensed&&/REPOSITORY|PROJECT_ORIGINAL|CC0/.test(provenance)){sourceClass='LICENSE_VERIFIED_REPOSITORY_MOTION';bonus=300;}
    else if(licensed&&/EXTERNAL|ROBLOX_PLATFORM/.test(provenance)){sourceClass='LICENSE_VERIFIED_EXTERNAL_MOTION_WITH_PROVENANCE';bonus=200;}
    else if(candidate.retargeted===true||/RETARGET/.test(provenance)){sourceClass='SAFE_RETARGET_AND_CLEANUP';bonus=100;}
    return Object.freeze({candidate,id:base.id,valid:true,score:base.score,sourcePreference:bonus,sourceClass,rejectedBy:null});
  }).filter(row=>row.valid).sort((a,b)=>b.score-a.score||b.sourcePreference-a.sourcePreference||a.id.localeCompare(b.id));
  return Object.freeze({
    selected:rows[0]?.candidate||null,
    selectedId:rows[0]?.id||null,
    sourceClass:rows[0]?.sourceClass||'NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP',
    ranked:Object.freeze(rows.map(row=>Object.freeze({id:row.id,score:row.score,sourceClass:row.sourceClass}))),
    priority:ROBLOX_MOTION_SOURCE_PRIORITY,
    libraryFirst:true,
    sourcePreferenceOnlyBreaksCompatibilityScoreTies:true,
    selectionRequiresTargetGameVisualReview:true,
    newKeyframeAuthoringLast:true,
    gameplayAuthority:false
  });
}

export function createRobloxMotionBlendProfile({
  crossFadeSeconds=.16,
  walkSpeed=8,
  jogSpeed=12,
  runSpeed=16,
  sprintSpeed=22,
  turnBlendSeconds=.14,
  attackRecoveryBlendSeconds=.12,
  poseMatchWindowFrames=12,
  speedSync=true,
  upperLowerBodyLayering=true,
  inertialization=true,
  additiveLayers=true
}={}){
  return Object.freeze({
    crossFadeSeconds:clamp(crossFadeSeconds,.08,.35),
    speedThresholds:Object.freeze({
      WALK:Math.max(0,Number(walkSpeed)||8),
      JOG:Math.max(0,Number(jogSpeed)||12),
      RUN:Math.max(0,Number(runSpeed)||16),
      SPRINT:Math.max(0,Number(sprintSpeed)||22)
    }),
    turnBlendSeconds:clamp(turnBlendSeconds,.08,.35),
    attackRecoveryBlendSeconds:clamp(attackRecoveryBlendSeconds,.08,.35),
    poseMatching:Object.freeze({
      required:true,
      candidateWindowFrames:Math.max(4,Math.min(30,Math.floor(Number(poseMatchWindowFrames)||12))),
      compare:Object.freeze(['POSE','ROOT_VELOCITY','ANGULAR_VELOCITY','FOOT_PHASE','CONTACT_STATE'])
    }),
    inertializationRequired:inertialization!==false,
    footPhaseAwareBlendRequired:true,
    animationTrackCrossFadeRequired:true,
    adjustWeightPreferred:true,
    playbackSpeedSyncRequired:speedSync!==false,
    accelerationDecelerationContinuityRequired:true,
    upperLowerBodyLayeringPreferred:upperLowerBodyLayering!==false,
    additiveLayersRequired:additiveLayers!==false,
    layerMasks:Object.freeze({
      LOWER_BODY:'LOCOMOTION_AND_FOOT_CONTACT',
      UPPER_BODY:'AIM_ATTACK_RELOAD_INTERACTION',
      ADDITIVE:'BREATH_RECOIL_HIT_EMOTION_SECONDARY'
    }),
    hardStatePopForbidden:true,
    gameplayTimingAuthority:false
  });
}

const STUDIO_MOTION_TEACHER_LESSONS=Object.freeze({
  READY_STANCE:"Readable rest silhouette, controlled breathing and gaze, stable contact and subtle asymmetry. Preserve species/body-plan identity and the authored idle loop; a combat guard is not appropriate for every creature.",
  COMBAT_LOCOMOTION:"Stage load, push, swing and catch using the existing speed and support pattern. Match pose and contact phase at start/stop/turn boundaries; preserve multi-leg, floating and rolling locomotion instead of imposing biped footwork.",
  LIGHT_COMBO:"Block clear anticipation, fast committed strike, confirmed contact and recovery poses. Drive the chain from support/pelvis through torso to the actual striking limb. Fit these visual phases to existing hit/cancel/combo markers, never the example percentages.",
  HEAVY_ATTACK:"Show mass through preparation, a supported committed arc and controlled follow-through. Keep the hand/weapon grip and contact silhouette readable. Heavy presentation does not grant longer startup, extra damage, new hit-stop or slower gameplay.",
  GAP_CLOSER:"Pose load, launch, controlled travel and braking against the existing root trajectory; match arrival contact without changing distance, speed, invulnerability or the active window.",
  AERIAL_ATTACK:"Maintain clear airborne preparation, attack contact and recovery silhouettes along the authoritative jump/fall trajectory. Inspect weapon/body intersections and the actual landing transition; do not invent flight or suspension time.",
  GUARD:"Move through readable guard raise/hold/return using compatible upper-body ownership; retain support and gaze. Preserve block state, shield collision and movement timing.",
  PARRY_OR_COUNTER:"Align deflection and optional counter visuals to existing confirmed parry/counter events. Keep the contact limb/weapon readable and recovery connected; poses never create a successful parry.",
  DODGE:"Show load, evade, replant and recovery over the existing displacement. Preserve dodge direction, distance, invulnerability and cancel windows; visible foot sliding needs native measurement.",
  HIT_REACTION:"Use the confirmed impact direction, body region and existing strength tier. Recoil through a plausible joint chain while preserving hit-stun duration; blend back with compatible pose/velocity. Add no ragdoll authority.",
  KNOCKDOWN:"Stage impact, balance loss, supported ground contact and the authored down pose. Check penetration and settling against native contact; preserve knockback, collision and down-state timing.",
  GET_UP:"Support the body with its actual hands/knees/limbs before rising and replanting. Connect the down pose to the existing ready pose, preserving recovery timing and interruption rules.",
  FINISHER:"Use a distinctive anticipation, commit/contact and signature follow-through within the existing single clip. Preserve target pairing, contact events and recovery; dramatic camera/audio remain within existing presentation ownership.",
  AIRBORNE_LOCOMOTION:"Separate takeoff compression, airborne balance and landing absorption using existing events and root physics. Inspect clearance, grounded transitions and foot/body contact. A land clip cannot change jump height, airtime or movement authority."
});

export function createStudioMotionActionProfile({
  platform='UNITY',
  actorClass='HUMANOID_NPC',
  bodyPlan='HUMANOID',
  archetype='',
  weaponFamily='UNARMED',
  weightClass='STANDARD',
  combat=true,
  mobile=true,
  limbCount=2,
  teachingClip=''
}={}){
  const weight=upper(weightClass)||'STANDARD';
  const limbs=Math.max(2,Math.floor(Number(limbCount)||2));
  const weightTuning=weight==='HEAVY'
    ?{anticipation:1.3,followThrough:1.35,hitStopMs:70,cameraImpulse:1.25}
    :weight==='LIGHT'
      ?{anticipation:.82,followThrough:.8,hitStopMs:28,cameraImpulse:.7}
      :{anticipation:1,followThrough:1,hitStopMs:45,cameraImpulse:1};
  const profile=Object.freeze({
    version:1,
    systems:freezeList([
      'POSE_MATCHING','UPPER_LOWER_BODY_LAYERING','ADDITIVE_MOTION','MOTION_WARPING','COMBAT_CONTACT_SOLVER',
      'WEIGHTED_ATTACK_PRESENTATION','INERTIALIZATION','PROCEDURAL_FOOT_HAND_IK','DIRECTIONAL_BODY_REGION_HIT_REACTION',
      'PARTIAL_RAGDOLL','ATTACK_TELEGRAPH','SPECIES_MOTION_DNA','GAZE_HEAD_TRACKING','EMOTION_COMBAT_STATE',
      'COMBO_RHYTHM','CONTEXTUAL_HIT_STOP','CAMERA_IMPULSE','MOTION_AUDIO_SYNC','ANIMATION_LOD','MOBILE_FRAME_BUDGET','AUTOMATED_MOTION_QA'
    ]),
    poseMatching:Object.freeze({
      enabled:true,candidateWindowFrames:12,
      compare:Object.freeze(['POSE','ROOT_VELOCITY','ANGULAR_VELOCITY','FOOT_PHASE','CONTACT_STATE']),
      preserveCurrentVelocity:true,hardPopForbidden:true
    }),
    layering:Object.freeze({
      lowerBody:'LOCOMOTION_AND_FOOT_CONTACT',upperBody:'AIM_ATTACK_RELOAD_INTERACTION',
      additive:Object.freeze(['BREATHING','RECOIL','HIT_REACTION','EMOTION','SECONDARY_MOTION']),
      compatibleMasksRequired:true
    }),
    motionWarping:Object.freeze({
      enabled:combat===true,translationClampNormalized:.12,yawClampDegrees:18,
      targets:Object.freeze(['HAND','WEAPON_TIP','FOOT_OR_CLAW','PAIR_CONTACT']),
      activeContactWindowImmutable:true,authoritativeRootMovementImmutable:true
    }),
    contactSolver:Object.freeze({
      continuousSweep:true,sampleHz:mobile?60:120,
      resolveOnlyInsideAuthoritativeActiveWindow:true,
      contactPointDrives:Object.freeze(['HIT_REACTION_DIRECTION','CONTACT_VFX','CONTACT_AUDIO','CAMERA_IMPULSE']),
      damageAndHitboxAuthority:false
    }),
    weightedAttack:Object.freeze({...weightTuning,weightClass:weight,weaponFamily:upper(weaponFamily),gameplayAttackWindowImmutable:true}),
    inertialization:Object.freeze({
      enabled:true,channels:Object.freeze(['ROOT_VELOCITY_VISUAL','PELVIS','SPINE','HEAD','LIMBS','EQUIPMENT']),
      startStopTurnAndInterrupt:true,authoritativeVelocityImmutable:true
    }),
    proceduralIk:Object.freeze({
      footPlantLock:true,handAndWeaponContact:true,multiLimbContact:limbs>2,limbCount:limbs,
      slopeAndStairAdaptation:true,predictiveGroundProbe:true,bodyPlanSpecific:true
    }),
    hitReaction:Object.freeze({
      directional:true,bodyRegion:true,strengthTiered:true,
      partialRagdoll:Object.freeze({enabled:true,mode:'IMPACT_CHAIN_ONLY',maxBlendSeconds:.22,recoverToAuthoredPose:true,visualPhysicsOnly:true})
    }),
    telegraph:Object.freeze({
      order:Object.freeze(['GAZE','HEAD','TORSO_WEIGHT_SHIFT','WEAPON_OR_LIMB_PREPARE','COMMIT']),
      strongAttackReadabilityRequired:true,redOverlayAloneInsufficient:true
    }),
    identity:Object.freeze({
      actorClass:upper(actorClass),bodyPlan:upper(bodyPlan),archetype:upper(archetype),
      speciesMotionDnaRequired:true,genericMotionCopyAcrossDistinctBodyPlansForbidden:true
    }),
    stateLayers:Object.freeze({
      gazeHeadTracking:true,emotionCombatState:true,
      states:Object.freeze(['CALM','ALERT','AGGRESSIVE','INJURED','FEAR_OR_RETREAT_WHEN_APPLICABLE'])
    }),
    comboRhythm:Object.freeze({
      defaultCadence:Object.freeze(['QUICK','QUICK','HEAVY']),
      inputBufferPresentationAware:true,authoritativeComboWindowImmutable:true,recoveryPoseMatchRequired:true
    }),
    impact:Object.freeze({
      hitStopMs:weightTuning.hitStopMs,cameraImpulse:weightTuning.cameraImpulse,
      contactFrameSyncRequired:true,criticalMayScaleWithinExistingPresentationEnvelope:true
    }),
    motionAudio:Object.freeze({
      footstepsFromActualFootContact:true,weaponWhooshFromEffectorVelocity:true,
      impactAudioFromConfirmedContact:true,surfaceMaterialMaySelectPresentationOnly:true
    }),
    animationLod:Object.freeze({
      NEAR:Object.freeze({animationHz:60,ikHz:60,secondaryHz:30}),
      MID:Object.freeze({animationHz:30,ikHz:20,secondaryHz:15}),
      FAR:Object.freeze({animationHz:15,ikHz:0,secondaryHz:0}),
      OFFSCREEN:Object.freeze({animationHz:5,ikHz:0,secondaryHz:0}),
      gameplayCollisionUnaffected:true
    }),
    mobilePerformance:Object.freeze({
      targetFps:60,hardFloorFps:30,p95FrameTargetMs:16.7,p95FrameHardCeilingMs:33.4,
      degradePresentationBeforeGameplay:true,heroBossCriticalMotionPreserved:true
    }),
    automatedQa:Object.freeze({
      requiredMetrics:Object.freeze([
        'POSE_DISCONTINUITY','ROOT_VELOCITY_DELTA','FOOT_SLIDE','FOOT_PLANT_DRIFT','HAND_WEAPON_OFFSET',
        'ATTACK_CONTACT_OFFSET','IMPACT_EVENT_OFFSET','IK_CONTACT_ERROR','DIRECTIONAL_HIT_MATCH','PARTIAL_RAGDOLL_RECOVERY',
        'AUDIO_CONTACT_OFFSET','MOBILE_P95_FRAME_MS'
      ]),
      nativeRuntimeEvidenceRequired:true,staticMarkersAloneInsufficient:true
    }),
    platform:upper(platform),
    gameplayAuthority:false
  });
  if(!teachingClip)return profile;
  const clip=upper(teachingClip).replace(/-/g,'_');
  const aliases={IDLE:'READY_STANCE',WALK:'COMBAT_LOCOMOTION',JOG:'COMBAT_LOCOMOTION',RUN:'COMBAT_LOCOMOTION',SPRINT:'COMBAT_LOCOMOTION',START:'COMBAT_LOCOMOTION',STOP:'COMBAT_LOCOMOTION',TURN:'COMBAT_LOCOMOTION',TURN_90:'COMBAT_LOCOMOTION',ATTACK:'LIGHT_COMBO',LIGHT_ATTACK_1:'LIGHT_COMBO',LIGHT_ATTACK_2:'LIGHT_COMBO',LIGHT_ATTACK_3:'LIGHT_COMBO',HEAVY_ATTACK_1:'HEAVY_ATTACK',HIT:'HIT_REACTION',HIT_FRONT:'HIT_REACTION',EVADE:'DODGE',JUMP:'AIRBORNE_LOCOMOTION',JUMP_START:'AIRBORNE_LOCOMOTION',JUMP_AIR:'AIRBORNE_LOCOMOTION',FALL:'AIRBORNE_LOCOMOTION',LAND:'AIRBORNE_LOCOMOTION',LANDING:'AIRBORNE_LOCOMOTION'};
  const role=aliases[clip]||clip;
  const roles=clip==='ALL'?Object.keys(STUDIO_MOTION_TEACHER_LESSONS):STUDIO_MOTION_TEACHER_LESSONS[role]?[role]:[];
  return Object.freeze({...profile,teaching:Object.freeze({
    id:'STUDIO_MOTION_ACTION_TEACHER_V1',provenance:'TEACHER_AUTHORED',status:'PRACTICE_ONLY',runtimeVerified:false,productionVerified:false,gameplayAuthority:false,
    version:2,
    clipId:text(teachingClip),needsSpecificClipBrief:roles.length===0,
    performanceStudy:Object.freeze({
      actorClass:upper(actorClass),bodyPlan:upper(bodyPlan),archetype:upper(archetype),weaponFamily:upper(weaponFamily),weightClass:weight,
      preparation:"Read real joints, body mass, supports and event markers. Unknown anatomy stays unknown; never invent humanoid bones.",
      timing:"Within locked phases mark key/breakdown poses, speed peaks and support changes. Hold, accelerate, contact, follow through, recover; do not synchronize all joints.",
      forcePath:"Use the actual load path: support to body mass to torso/effector. Name leading, following and stable joints; counterbalance compatible masses.",
      contact:"At locked contact inspect sole/palm/weapon orientation, grip and penetration. Preserve root, impact and cancel authority.",
      secondary:"Delay existing head/tail/cloth/equipment channels behind primary motion; decay amplitude into a readable rest.",
      review:"Inspect normal/quarter speed and exact joint intervals at contact, reversal and loop seams. Measure position, velocity and acceleration plus endpoint contact state. Smoothness is not weight or appeal."
    }),
    lessons:freezeList(roles.map(id=>Object.freeze({role:id,phases:freezeList((DUEL_COMBAT_AUTHORING_PHASES[id]||[]).map(row=>row.phase)),lesson:STUDIO_MOTION_TEACHER_LESSONS[id]}))),
    craft:'Inspect the exact rig/clip and weak axis first. Block silhouette and intent at the game camera, refine arcs and spacing, then contacts/grips, secondary overlap and transitions. Use compatible authored source and preserve strong axes. Hermite segments can match endpoint pose and velocity; C1 continuity alone does not prove contact or appeal.',
    timing:'Phase names are staging references only. Read existing seconds/event markers, active/cancel/recovery windows and locks from the target source. Never substitute generic normalized timestamps, default speed, hit-stop, camera or LOD numbers. No new combo, gameplay event or root trajectory is authorized.',
    nativeReview:Object.freeze({conditions:'Same rig, camera, root speed, clip, event timestamps and lighting before/after; inspect normal speed and slow/frame stepping, including interruption, loop and mobile conditions.',metrics:profile.automatedQa.requiredMetrics,acceptance:'Use existing target-native thresholds and captures. Declare inapplicable or unmeasured axes explicitly; source math, flags and teacher text cannot certify studio quality.'})
  })});
}

const STUDIO_MOTION_PRODUCTION=Object.freeze({
      status:'PLANNED_NOT_VERIFIED',
      baseWorkSession:Object.freeze({
        defaultMinutes:60,
        budgetMeaning:'ESTIMATED_ACTIVE_MODIFICATION_EFFORT_NOT_WALL_CLOCK',
        scope:'ONE_EXISTING_OBJECT_ONE_EXISTING_MOTION_PER_WORK_UNIT',
        objectCount:1,motionCount:1,
        preparationAndQaIncludedInModificationBudget:false,
        sameTargetUntilReviewResolved:true,separateWorkerRequired:false,
        priority:'EXISTING_BASIC_MOTION_AND_ACTION_QUALITY_FIRST',
        stageMinutes:Object.freeze({POSE_AND_WEIGHT_REFINEMENT:15,JOINT_ARCS_CONTACT_REFINEMENT:20,OVERLAP_SETTLE_LOOP_REFINEMENT:15,SAME_MOTION_DETAIL_REPAIR:10}),
        existingModelsAndRigRequired:true,
        preserveClipDurationAndExistingEventTimes:true,
        elapsedTimeIsNotQualityEvidence:true,
        noIdlePaddingToFillBudget:true,
        ownerOrChatgptPresenceRequired:false,
        nativeRuntimeAndBeforeAfterRequiredForQualityPass:true
      }),
      stages:Object.freeze(['ACTING_BRIEF','RIG_DEFORMATION','KEY_POSES','LOCOMOTION','COMBAT_CONTACT','TRANSITIONS','SECONDARY_ACTING','GAME_CAMERA_REVIEW','MOBILE_MULTIPLAYER_REVIEW']),
      actingBriefFields:Object.freeze(['PERSONALITY','INTENT','WEIGHT','BODY_PLAN','WEAPON','SILHOUETTE','STYLE_REFERENCE']),
      performanceBeatOrder:Object.freeze(['EYE_TARGET','HEAD_ORIENT','BODY_WEIGHT_SHIFT','PRIMARY_ACTION','FOLLOW_THROUGH','SETTLE']),
      bodyPlanSpecific:true,
      representativeScene:Object.freeze({durationSeconds:10,beats:Object.freeze(['OBSERVE','TRAVEL','NOTICE_TARGET','ACT','REACT','RECOVER']),combatOnlyWhenApplicable:true}),
      reviewCapture:Object.freeze({sameCamera:true,samePlaybackSpeed:true,referenceAndCandidate:true,frameAddressedFindings:true,sourceAndClipVersionBound:true}),
      secondaryMotion:Object.freeze(['BREATH','GAZE','EARS_TAIL_WINGS_WHEN_PRESENT','INERTIA_AND_SETTLE']),
      studioGradeSystems:createStudioMotionActionProfile().systems,
      gameplayTimingChangesForbidden:true,
      failedStageRepairThenRegression:true,
      promotionRequiresActualNativeEvidence:true
    });

export function createRobloxCharacterMotionPlan({
  actorClass='HUMANOID_NPC',
  bodyPlan='HUMANOID',
  rigProfile='R15',
  gameId='',
  archetype='',
  motionCandidates=[],
  context={},
  recentMotionIds=[],
  blend={},
  procedural={},
  studio={}
}={}){
  const actor=upper(actorClass);
  const normalizedActor=ROBLOX_ACTOR_CLASSES.includes(actor)?actor:'HUMANOID_NPC';
  const source=selectRobloxCharacterMotionSource({
    candidates:motionCandidates,
    context:{...context,bodyPlan,rigProfile,platform:'ROBLOX'},
    gameId,
    archetype,
    recentMotionIds
  });
  const humanoid=normalizedActor!=='CREATURE'||/HUMANOID|BIPED|R15|R6/.test(upper(bodyPlan)+' '+upper(rigProfile));
  const requiredStates=humanoid
    ?['IDLE','WALK','JOG','RUN','START','STOP','TURN','ATTACK','HIT','DEATH']
    :['IDLE_ACTING','BODY_PLAN_LOCOMOTION','TURN','ATTACK','HIT','DEATH'];
  return Object.freeze({
    actorClass:normalizedActor,
    bodyPlan:upper(bodyPlan),
    rigProfile:upper(rigProfile),
    requiredRig:Object.freeze(humanoid
      ?['MOTOR6D_OR_BONES','HUMANOID_OR_ANIMATION_CONTROLLER','ANIMATOR']
      :['BODY_PLAN_SPECIFIC_ARTICULATED_JOINT_CHAIN','ANIMATOR']),
    requiredStates:Object.freeze(requiredStates),
    studioProduction:STUDIO_MOTION_PRODUCTION,
    motionSource:source,
    blend:createRobloxMotionBlendProfile(blend),
    studioGrade:createStudioMotionActionProfile({
      platform:'ROBLOX',actorClass:normalizedActor,bodyPlan,archetype,
      weaponFamily:studio.weaponFamily||context.weaponFamily||'UNARMED',
      weightClass:studio.weightClass||context.weightClass||'STANDARD',
      combat:studio.combat!==false,mobile:studio.mobile!==false,
      limbCount:studio.limbCount||procedural.limbCount||2
    }),
    procedural:createProceduralMotionProfile({
      footIk:procedural.footIk!==false,
      footLock:procedural.footLock!==false,
      multiLimbContact:procedural.multiLimbContact!==false,
      groundNormal:procedural.groundNormal!==false,
      pelvisHeight:procedural.pelvisHeight!==false,
      spineLean:procedural.spineLean!==false,
      headGaze:procedural.headGaze!==false,
      lookAtTarget:procedural.lookAtTarget!==false,
      handGrip:procedural.handGrip!==false,
      handContact:procedural.handContact!==false,
      weaponGripLock:procedural.weaponGripLock!==false,
      contactCorrection:procedural.contactCorrection!==false,
      aimOffset:procedural.aimOffset!==false,
      slopeAdaptation:procedural.slopeAdaptation!==false,
      limbCount:studio.limbCount||procedural.limbCount||2,
      platformBudget:procedural.platformBudget||'MOBILE'
    }),
    runtimeScenario:Object.freeze(['IDLE_5_SECONDS','WALK_10_SECONDS','TURN_LEFT_RIGHT','RUN_AND_STOP','ATTACK_THREE_TIMES_WHEN_COMBATANT','HIT_REACTION_WHEN_DAMAGEABLE','DEATH_WHEN_MORTAL','RESPAWN_WHEN_SUPPORTED']),
    weldConstraintOnlyArticulatedActorForbidden:true,
    rootTransformOnlyVisualLocomotionForbidden:true,
    officialStudioRuntimeEvidenceRequired:true,
    gameplayAuthority:false
  });
}

export function auditRobloxCharacterMotionEvidence({
  actorClass='HUMANOID_NPC',
  articulatedExpected=true,
  hasAnimator=false,
  hasHumanoid=false,
  hasAnimationController=false,
  hasMotor6D=false,
  hasBones=false,
  visibleLocomotion=false,
  rootTransformChanges=false,
  jointTransformChanges=false,
  weldConstraintOnly=false,
  hardStatePop=false,
  playbackSpeedSynced=true,
  footSlideNormalized=0,
  attackRecoverySnap=false,
  officialStudioRuntimeObserved=false,
  sourceRevision='',
  clipVersion='',
  combatant=true,
  studioReview=null
}={}){
  const failures=[];
  const articulated=hasMotor6D===true||hasBones===true;
  const controller=hasHumanoid===true||hasAnimationController===true;
  if(articulatedExpected===true&&!articulated)failures.push('RIG_ARTICULATION_MISSING');
  if(articulatedExpected===true&&hasAnimator!==true)failures.push('ANIMATOR_MISSING');
  if(articulatedExpected===true&&controller!==true)failures.push('ANIMATION_CONTROLLER_MISSING');
  if(weldConstraintOnly===true&&articulatedExpected===true)failures.push('WELD_CONSTRAINT_ONLY_ARTICULATED_BODY');
  if(visibleLocomotion===true&&rootTransformChanges===true&&jointTransformChanges!==true)failures.push('ROOT_ONLY_VISIBLE_LOCOMOTION');
  if(visibleLocomotion===true&&jointTransformChanges!==true)failures.push('JOINT_ACTIVITY_MISSING');
  if(hardStatePop===true)failures.push('HARD_MOTION_STATE_POP');
  if(playbackSpeedSynced!==true)failures.push('LOCOMOTION_PLAYBACK_SPEED_DESYNC');
  if(!Number.isFinite(Number(footSlideNormalized))||Number(footSlideNormalized)<0)failures.push('FOOT_SLIDE_MEASUREMENT_INVALID');
  else if(Number(footSlideNormalized)>.035)failures.push('FOOT_SLIDE_DISTANCE');
  if(attackRecoverySnap===true)failures.push('ATTACK_RECOVERY_SNAP');
  if(officialStudioRuntimeObserved!==true)failures.push('OFFICIAL_STUDIO_RUNTIME_EVIDENCE_MISSING');
  const review=studioReview||{};
  if(!text(sourceRevision)||!text(clipVersion)||review.sourceRevision!==sourceRevision||review.clipVersion!==clipVersion)failures.push('STUDIO_REVIEW_VERSION_BINDING_MISSING');
  if(!text(review.referenceCapture)||!text(review.candidateCapture)||review.sameCamera!==true||review.samePlaybackSpeed!==true)failures.push('STUDIO_COMPARISON_CAPTURE_MISSING');
  for(const stage of ['ACTING_BRIEF','RIG_DEFORMATION','KEY_POSES','LOCOMOTION','COMBAT_CONTACT','TRANSITIONS','SECONDARY_ACTING','GAME_CAMERA_REVIEW','MOBILE_MULTIPLAYER_REVIEW']){
    const row=review.stages?.[stage];
    if(stage==='COMBAT_CONTACT'&&combatant===false&&row?.applicable===false&&text(row.reason)&&text(row.evidence))continue;
    if(row?.pass!==true||!text(row.evidence))failures.push('STUDIO_STAGE_UNVERIFIED:'+stage);
  }
  if(!Number.isInteger(review.playerCount)||review.playerCount<2||!text(review.runtimeRunId))failures.push('STUDIO_MULTIPLAYER_EVIDENCE_MISSING');
  if(review.gameplayTimingPreserved!==true)failures.push('GAMEPLAY_TIMING_PRESERVATION_UNVERIFIED');
  const mannequin=failures.some(value=>[
    'RIG_ARTICULATION_MISSING','ANIMATOR_MISSING','ANIMATION_CONTROLLER_MISSING',
    'WELD_CONSTRAINT_ONLY_ARTICULATED_BODY','ROOT_ONLY_VISIBLE_LOCOMOTION','JOINT_ACTIVITY_MISSING'
  ].includes(value));
  return Object.freeze({
    actorClass:upper(actorClass),
    pass:failures.length===0,
    mannequin,
    failureCode:mannequin?ROBLOX_CHARACTER_MOTION_FAILURE:null,
    failures:Object.freeze(failures),
    articulated,
    animatorBound:hasAnimator===true,
    controllerBound:controller,
    jointActivity:jointTransformChanges===true,
    runtimeObserved:officialStudioRuntimeObserved===true,
    blocksVerifiedPromotion:failures.length>0,
    gameplayAuthority:false
  });
}

export function createSpeciesSignature({archetype='',idle='',locomotion='',attack='',defense='',hit='',death='',specialBodyPart=''}={}){
  return Object.freeze({
    archetype:upper(archetype),
    slots:Object.freeze({
      IDLE_SIGNATURE:text(idle),
      LOCOMOTION_SIGNATURE:text(locomotion),
      ATTACK_SIGNATURE:text(attack),
      DEFENSE_SIGNATURE:text(defense),
      HIT_SIGNATURE:text(hit),
      DEATH_SIGNATURE:text(death),
      SPECIAL_BODY_PART_SIGNATURE:text(specialBodyPart)
    }),
    importantCreatureRequiresNonGenericSignature:true
  });
}

export function createMotionDirectorPlan({
  platform='UNITY',bodyPlan='HUMANOID',rigProfile='HUMANOID',styleFamily='STYLIZED_FANTASY',
  motionCandidates=[],context={},layers={},skill={},pair=null,reaction={},recentMotionIds=[],
  transition=null,contactQa=null,gameplayEvent=null,procedural=null,group=null,multiActor=null,
  emotion=null,lod=null,lineage=null,runtimeSignals=[],robloxCharacterMotion=null,combat=null,studio={},styles=[],styleModifiers={},continuityTrace=null
}={}){
  const selector=selectContextMotion({
    candidates:motionCandidates,
    context:{...context,platform,bodyPlan,rigProfile,styleFamily},
    recentMotionIds
  });
  const selectedDNA=selector.selected?.dna||selector.selected||{BODY_PLAN:bodyPlan,RIG_PROFILE:rigProfile,STYLE_FAMILY:styleFamily,PLATFORM_VARIANT:platform};
  const composition=composeMotionStack({layers,dna:selectedDNA,styleVariant:deriveMotionStyleVariant({parentId:selectedDNA.MOTION_ID||selectedDNA.id,style:styleFamily,styles,modifiers:styleModifiers})});
  return Object.freeze({
    version:2,
    target:MOTION_DIRECTOR_TARGET,
    studioProduction:Object.freeze({...STUDIO_MOTION_PRODUCTION,targetPlatform:upper(platform)}),
    platform:upper(platform),
    motionDNA:createMotionDNA(selectedDNA),
    selector,
    composition,
    studioGrade:createStudioMotionActionProfile({
      platform,bodyPlan,
      actorClass:studio.actorClass||context.actorClass||'HUMANOID_NPC',
      archetype:studio.archetype||context.archetype||selectedDNA.SPECIES_OR_ARCHETYPE,
      weaponFamily:studio.weaponFamily||context.weaponFamily||selectedDNA.WEAPON_FAMILY||'UNARMED',
      weightClass:studio.weightClass||context.weightClass||selectedDNA.WEIGHT_CLASS||'STANDARD',
      combat:studio.combat!==false,mobile:studio.mobile!==false,
      limbCount:studio.limbCount||context.limbCount||2
    }),
    continuityAudit:continuityTrace?auditMotionContinuityTrace(continuityTrace):null,
    continuity:Object.freeze({
      startFromCurrentPoseAndVelocity:true,footPhaseAndContactAwareLocomotion:true,
      turnStartStopAndInterruptedRecoveryRequired:true,poseVelocityContinuityAtEveryTransition:true,
      idleLifeChannels:freezeList(['BREATHING','GAZE','BLINK','WEIGHT_SHIFT','HAND_TENSION']),
      secondaryMotionOrder:freezeList(['BODY_ACCELERATION','HEAD_AND_LIMBS','HAIR_CLOTH_STRAPS_EQUIPMENT','DAMPED_SETTLE']),
      compatibleAdditiveMasksRequired:true,styleProfile:composition.styleVariant?.profileKey||deriveMotionStyleVariant({style:styleFamily,styles}).profileKey,
      authoritativeActionWindowsAndRootMovementImmutable:true,
      measuredTransitionQa:transition?evaluateMotionTransition(transition).verdict:'UNVERIFIED',
      runtimeVerified:false
    }),
    skillSequence:buildSkillMotionSequence(skill),
    reaction:createReactionMatch(reaction),
    pairMotion:pair?createPairMotionContract(pair):null,
    transition:transition?evaluateMotionTransition(transition):null,
    contactQa:contactQa?auditMotionContact(contactQa):null,
    gameplayEventBinding:gameplayEvent?bindGameplayEventToMotion(gameplayEvent):null,
    proceduralMotion:procedural?createProceduralMotionProfile(procedural):null,
    groupMotion:group?createGroupMotionPlan(group):null,
    multiActorMotion:multiActor?createMultiActorMotionContract(multiActor):null,
    emotionIntent:emotion?createEmotionIntentLayer(emotion):null,
    motionLod:lod?selectMotionLod(lod):null,
    lineage:lineage?createMotionLineage(lineage):null,
    runtimeLearning:runtimeSignals?.length?buildRuntimeMotionLearningCandidate({platform,signals:aggregateRuntimeMotionSignals(runtimeSignals),samples:runtimeSignals}):null,
    robloxCharacterMotion:upper(platform)==='ROBLOX'?createRobloxCharacterMotionPlan({
      bodyPlan,rigProfile,motionCandidates,context,recentMotionIds,
      ...(robloxCharacterMotion||{})
    }):null,
    combatLoadout:combat?createDuelCombatMotionLoadout({platform,...combat}):null,
    systems:Object.freeze([
      'MOTION_DNA','COMPATIBILITY_GRAPH','BODY_LAYER_COMPOSER','CONTEXT_SELECTOR','MOTION_GRAMMAR',
      'REACTION_MATCHER','PAIR_MOTION','SPECIES_SIGNATURE','STYLE_MODIFIER','MOTION_MUTATION','VARIATION_MEMORY',
      'TRANSITION_DIRECTOR','POSE_MATCH_TRANSITION','MOTION_WARPING','AUTOMATIC_CONTACT_QA','COMBAT_CONTACT_SOLVER',
      'GAMEPLAY_EVENT_MOTION_BINDING','PROCEDURAL_MOTION_LAYER','PARTIAL_RAGDOLL','MOTION_AUDIO_SYNC',
      'GROUP_MOTION_DIRECTOR','MULTI_ACTOR_MOTION','EMOTION_INTENT_LAYER','MOTION_LOD','MOBILE_FRAME_BUDGET','MOTION_LINEAGE','RUNTIME_MOTION_LEARNING',
      ...(upper(platform)==='ROBLOX'?['ROBLOX_SMOOTH_CHARACTER_MOTION']:[]),
      ...(combat?['DUEL_COMBAT_MOTION_KIT']:[])
    ]),
    libraryGraphNodes:MOTION_LIBRARY_GRAPH_NODES,
    continuousExpansion:true,
    noArtificialCombinationCap:true,
    gameplayAuthority:false
  });
}
