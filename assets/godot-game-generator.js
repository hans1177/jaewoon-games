// 파일명: assets/godot-game-generator.js
// 역할: 바이브 게임 패키지를 Godot 프로젝트 파일 집합으로 변환하는 생성 엔진
// 규칙: 게임 규칙/저장 데이터 보존, 기존 Godot 공통 시스템 재사용, 모바일 터치+조이스틱 기본

function clean(value) { return String(value ?? '').trim(); }
function safeSlug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'vibe-game';
}
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function esc(value) { return clean(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

function buildProjectGd({ gameName }) {
  return `[application]\nconfig/name="${esc(gameName)}"\nrun/main_scene="res://main.tscn"\nconfig/features=PackedStringArray("4.7")\n\n[display]\nwindow/size/viewport_width=960\nwindow/size/viewport_height=540\nwindow/size/window_width_override=960\nwindow/size/window_height_override=540\nwindow/stretch/mode="canvas_items"\n\n[rendering]\nrenderer/rendering_method="gl_compatibility"\nrenderer/rendering_method.mobile="gl_compatibility"\ntextures/default_filters/use_nearest_mipmap_filter=false\n\n[input]\nmove_left={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":65)]}\nmove_right={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":68)]}\nmove_up={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":87)]}\nmove_down={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":83)]}\nattack={"deadzone":0.5,"events":[]}\n`;
}

function buildMainScene() {
  return `[gd_scene load_steps=2 format=3]\n\n[ext_resource path="res://main.gd" type="Script" id="1"]\n\n[node name="Game" type="Node2D"]\nscript = ExtResource("1")\n\n[node name="World" type="Node2D" parent="."]\n\n[node name="UI" type="CanvasLayer" parent="."]\n\n[node name="SafeArea" type="MarginContainer" parent="UI"]\noffset_left = 12.0\noffset_top = 12.0\noffset_right = -12.0\noffset_bottom = -12.0\n\n[node name="MobileControls" type="Control" parent="UI"]\nmouse_filter = 2\nlayout_mode = 3\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 2\ngrow_vertical = 2\n\n[node name="Joystick" type="TouchScreenButton" parent="UI/MobileControls"]\nposition = Vector2(72, 420)\nsize = Vector2(132, 132)\n\n[node name="Attack" type="TouchScreenButton" parent="UI/MobileControls"]\nposition = Vector2(810, 438)\nsize = Vector2(96, 72)\n\n[node name="Status" type="Label" parent="UI/SafeArea"]\ntext = "준비 중"\n`;
}

function buildMainScript({ packageData }) {
  const content = packageData?.content || {};
  const player = Array.isArray(content.players) && content.players[0] ? content.players[0] : {};
  const hp = Number(player.hp ?? packageData?.blueprint?.intent?.rules?.hp ?? 100);
  const damage = Number(player.damage ?? packageData?.blueprint?.intent?.rules?.damage ?? 10);
  const waves = Number(content.waves?.total ?? packageData?.blueprint?.intent?.rules?.waves ?? 1);
  const request = JSON.stringify(clean(packageData?.blueprint?.sourcePrompt || packageData?.blueprint?.prompt || ''));
  return `extends Node2D\n\n# 생성 결과의 실제 게임 규칙은 game_data에 보존하고, 화면/연출은 별도로 확장한다.\nconst GAME_DATA := {\n  "hp": ${Number.isFinite(hp) ? hp : 100},\n  "damage": ${Number.isFinite(damage) ? damage : 10},\n  "waves": ${Number.isFinite(waves) ? waves : 1},\n  "request": ${request}\n}\n\nvar animation_state := "idle"\nvar animation_frame := 0\nvar animation_time := 0.0\nvar move_axis := Vector2.ZERO\n\nfunc _ready() -> void:\n  $UI/SafeArea/Status.text = "터치 + 조이스틱 준비 완료"\n\nfunc _process(delta: float) -> void:\n  _update_animation(delta)\n\nfunc _update_animation(delta: float) -> void:\n  animation_time += delta\n  var fps := 8.0\n  match animation_state:\n    "move": fps = 10.0\n    "attack": fps = 12.0\n    "hit": fps = 12.0\n    "skill": fps = 14.0\n    "death": fps = 8.0\n  if animation_time >= 1.0 / fps:\n    animation_time = 0.0\n    animation_frame += 1\n\nfunc set_animation(state: String) -> void:\n  if state == "":\n    state = "idle"\n  if state != animation_state:\n    animation_state = state\n    animation_frame = 0\n    animation_time = 0.0\n\nfunc _on_attack_pressed() -> void:\n  set_animation("attack")\n`;
}

function buildReadme({ gameName }) {
  return `# ${gameName}\n\n이 프로젝트는 재운게임즈 바이브 도우미에서 생성된 Godot 프로젝트입니다.\n\n기본 기준:\n- Godot 4.7 계열\n- 모바일 터치 우선\n- 가상 조이스틱\n- 안전 여백\n- 세로/가로 자동 대응\n- 그래픽과 게임 로직 분리\n- 기존 게임 데이터/세이브 보호\n\n생성 후 실제 에셋과 게임 규칙을 연결하고 Godot 에디터에서 씬/입력/애니메이션을 검증해야 합니다.\n`;
}

export function buildGodotProject({ packageData = {}, title = null, slug = null } = {}) {
  const gameName = clean(title) || clean(packageData?.gameId) || '재운게임즈 게임';
  const projectSlug = safeSlug(slug || packageData?.gameId || gameName);
  const files = {
    'project.godot': buildProjectGd({ gameName }),
    'main.tscn': buildMainScene(),
    'main.gd': buildMainScript({ packageData: clone(packageData) }),
    'README.md': buildReadme({ gameName }),
  };
  return Object.freeze({
    formatVersion: 1,
    slug: projectSlug,
    title: gameName,
    target: 'godot',
    files: Object.freeze(files),
    requirements: Object.freeze({
      mobileTouch: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      animationStates: Object.freeze(['idle', 'move', 'attack', 'hit', 'skill', 'death']),
      needsRealAssetBinding: true,
      needsGodotEditorQa: true,
    }),
  });
}

export const createGodotProject = buildGodotProject;

if (typeof window !== 'undefined') {
  window.buildJaewoonGodotProject = buildGodotProject;
  window.createJaewoonGodotProject = createGodotProject;
}
