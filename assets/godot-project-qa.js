// 파일명: assets/godot-project-qa.js
// 역할: 생성된 Godot 프로젝트 파일 집합의 구조·모바일 입력·참조 무결성 1차 검사
// 규칙: 실행 검증이 필요한 항목은 명확히 별도 표시하고 추측으로 통과시키지 않음

function clean(value) { return String(value ?? ''); }
function has(text, value) { return clean(text).includes(value); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function checkProjectConfig(text) {
  const errors = [];
  const sectionMatches = clean(text).match(/^\[display\]$/gm) || [];
  if (sectionMatches.length !== 1) errors.push('project.godot display section count must be 1');
  if (!has(text, 'run/main_scene="res://main.tscn"')) errors.push('main scene is not configured');
  if (!has(text, 'renderer/rendering_method.mobile="gl_compatibility"')) errors.push('mobile renderer is not declared');
  if (!has(text, 'window/handheld/orientation=')) errors.push('orientation policy is missing');
  if (/physical_keycode|keycode|InputEventKey/.test(text)) errors.push('keyboard input binding found in mobile-first generated project');
  return errors;
}

function checkScene(text) {
  const errors = [];
  if (!has(text, 'type="Node2D"')) errors.push('root Node2D missing');
  if (!has(text, '[ext_resource path="res://main.gd" type="Script"')) errors.push('main.gd scene reference missing');
  if (!has(text, 'name="SafeArea"')) errors.push('safe area missing');
  if (!has(text, 'name="Mobile"')) errors.push('mobile control root missing');
  return errors;
}

function checkScript(text) {
  const errors = [];
  if (!has(text, 'extends Node2D')) errors.push('main.gd does not extend Node2D');
  if (!has(text, 'InputEventScreenTouch')) errors.push('screen touch input missing');
  if (!has(text, 'InputEventScreenDrag')) errors.push('screen drag input missing');
  if (!has(text, 'joystick_center')) errors.push('virtual joystick state missing');
  if (!has(text, 'set_animation("attack")')) errors.push('attack animation trigger missing');
  if (!has(text, 'NOTIFICATION_RESIZED')) errors.push('responsive resize handling missing');
  if (/Input\.is_action|InputEventKey|physical_keycode/.test(text)) errors.push('keyboard-driven runtime code found');
  return errors;
}

export function auditGodotProjectFiles(files = {}) {
  const project = clean(files['project.godot']);
  const scene = clean(files['main.tscn']);
  const script = clean(files['main.gd']);
  const errors = unique([...checkProjectConfig(project), ...checkScene(scene), ...checkScript(script)]);
  const warnings = [];
  if (!has(script, 'AnimatedSprite2D') && !has(script, 'Sprite2D')) warnings.push('real character sprite/animation resource binding is not yet included');
  if (!has(script, 'AnimationPlayer')) warnings.push('AnimationPlayer resource binding is not yet included');
  if (!has(scene, '.tscn')) warnings.push('scene resource list is minimal');
  return Object.freeze({
    passed: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(unique(warnings)),
    requiresEditorRun: true,
    requiresDeviceTest: true,
  });
}

if (typeof window !== 'undefined') window.auditJaewoonGodotProjectFiles = auditGodotProjectFiles;
