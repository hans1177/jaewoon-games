// 파일명: assets/godot-game-generator.js
// 역할: 바이브 게임 패키지를 Godot 프로젝트 파일 집합으로 변환하는 생성 엔진
// 규칙: 게임 규칙/저장 데이터 보존, 모바일 터치+가상 조이스틱 기본, 생성물은 직접 수정 가능한 구조

function clean(value) { return String(value ?? '').trim(); }

function safeSlug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'vibe-game';
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function esc(value) {
  return clean(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildProjectGd({ gameName }) {
  return `[application]\nconfig/name="${esc(gameName)}"\nrun/main_scene="res://main.tscn"\nconfig/features=PackedStringArray("4.7")\n\n[display]\nwindow/size/viewport_width=960\nwindow/size/viewport_height=540\nwindow/size/window_width_override=960\nwindow/size/window_height_override=540\nwindow/stretch/mode="canvas_items"\nwindow/handheld/orientation=0\n\n[rendering]\nrenderer/rendering_method="gl_compatibility"\nrenderer/rendering_method.mobile="gl_compatibility"\ntextures/default_filters/use_nearest_mipmap_filter=false\n`;
}

function buildMainScene() {
  return `[gd_scene load_steps=2 format=3]\n\n[ext_resource path="res://main.gd" type="Script" id="1"]\n\n[node name="Game" type="Node2D"]\nscript = ExtResource("1")\n\n[node name="World" type="Node2D" parent="."]\n\n[node name="UI" type="CanvasLayer" parent="."]\n\n[node name="SafeArea" type="MarginContainer" parent="UI"]\noffset_left = 16.0\noffset_top = 16.0\noffset_right = -16.0\noffset_bottom = -16.0\n\n[node name="Status" type="Label" parent="UI/SafeArea"]\ntext = "준비 중"\nposition = Vector2(8, 8)\n\n[node name="Mobile" type="Control" parent="UI"]\nmouse_filter = 2\nlayout_mode = 3\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 2\ngrow_vertical = 2\n`;
}

function buildMainScript({ packageData }) {
  const content = packageData?.content || {};
  const player = Array.isArray(content.players) && content.players[0] ? content.players[0] : {};
  const hp = Number(player.hp ?? packageData?.blueprint?.intent?.rules?.hp ?? 100);
  const damage = Number(player.damage ?? packageData?.blueprint?.intent?.rules?.damage ?? 10);
  const waves = Number(content.waves?.total ?? packageData?.blueprint?.intent?.rules?.waves ?? 1);
  const request = JSON.stringify(clean(packageData?.blueprint?.sourcePrompt || packageData?.blueprint?.prompt || ''));

  return `extends Node2D

# 파일명: main.gd
# 역할: 생성 게임의 모바일 입력 및 기본 런타임 진입점
# 규칙: 터치+가상 조이스틱 우선, 화면 여백 보호, 게임 규칙은 GAME_DATA에 보존

const GAME_DATA := {
  "hp": ${Number.isFinite(hp) ? hp : 100},
  "damage": ${Number.isFinite(damage) ? damage : 10},
  "waves": ${Number.isFinite(waves) ? waves : 1},
  "request": ${request}
}

var animation_state := "idle"
var animation_frame := 0
var animation_time := 0.0
var animation_fps := 8.0
var move_axis := Vector2.ZERO
var joystick_center := Vector2(110, 430)
var joystick_radius := 66.0
var joystick_knob := Vector2(110, 430)
var joystick_active := false
var joystick_touch_id := -1
var attack_center := Vector2(850, 450)
var attack_radius := 52.0
var attack_pressed := false
var viewport_size := Vector2.ZERO

func _ready() -> void:
  viewport_size = get_viewport_rect().size
  _layout_mobile_controls()
  queue_redraw()
  $UI/SafeArea/Status.text = "터치 + 조이스틱 준비 완료"

func _notification(what: int) -> void:
  if what == NOTIFICATION_RESIZED:
    viewport_size = get_viewport_rect().size
    _layout_mobile_controls()
    queue_redraw()

func _process(delta: float) -> void:
  _update_animation(delta)
  queue_redraw()

func _draw() -> void:
  draw_circle(joystick_center, joystick_radius, Color(1, 1, 1, 0.12))
  draw_arc(joystick_center, joystick_radius, 0.0, TAU, 48, Color(1, 1, 1, 0.28), 2.0)
  draw_circle(joystick_knob, 28.0, Color(0.25, 0.55, 1.0, 0.85))
  draw_circle(attack_center, attack_radius, Color(0.88, 0.2, 0.24, 0.9))
  draw_arc(attack_center, attack_radius, 0.0, TAU, 48, Color(1, 1, 1, 0.38), 2.0)
  draw_string(ThemeDB.fallback_font, attack_center + Vector2(-26, 6), "공격", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.WHITE)
  draw_string(ThemeDB.fallback_font, joystick_center + Vector2(-44, 98), "조이스틱", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(1, 1, 1, 0.7))

func _layout_mobile_controls() -> void:
  var size := viewport_size if viewport_size != Vector2.ZERO else get_viewport_rect().size
  var safe_bottom := max(24.0, size.y - 24.0)
  joystick_center = Vector2(max(92.0, size.x * 0.13), safe_bottom - 88.0)
  attack_center = Vector2(min(size.x - 86.0, size.x * 0.87), safe_bottom - 74.0)
  joystick_knob = joystick_center

func _input(event: InputEvent) -> void:
  if event is InputEventScreenTouch:
    if event.pressed:
      _touch_down(event)
    else:
      _touch_up(event)
  elif event is InputEventScreenDrag:
    _touch_drag(event)

func _touch_down(event: InputEventScreenTouch) -> void:
  if event.position.distance_to(joystick_center) <= joystick_radius * 1.35 and not joystick_active:
    joystick_active = true
    joystick_touch_id = event.index
    _set_joystick(event.position)
    return
  if event.position.distance_to(attack_center) <= attack_radius * 1.25:
    attack_pressed = true
    _on_attack_pressed()

func _touch_up(event: InputEventScreenTouch) -> void:
  if event.index == joystick_touch_id:
    joystick_active = false
    joystick_touch_id = -1
    move_axis = Vector2.ZERO
    joystick_knob = joystick_center
  if event.position.distance_to(attack_center) <= attack_radius * 1.4:
    attack_pressed = false

func _touch_drag(event: InputEventScreenDrag) -> void:
  if event.index == joystick_touch_id and joystick_active:
    _set_joystick(event.position)

func _set_joystick(position: Vector2) -> void:
  var offset := position - joystick_center
  if offset.length() > joystick_radius:
    offset = offset.normalized() * joystick_radius
  joystick_knob = joystick_center + offset
  move_axis = offset / joystick_radius
  if move_axis.length() > 0.12:
    set_animation("move")
  else:
    set_animation("idle")

func _update_animation(delta: float) -> void:
  animation_time += delta
  if animation_time >= 1.0 / max(animation_fps, 1.0):
    animation_time = 0.0
    animation_frame += 1

func set_animation(state: String) -> void:
  var next := state if state != "" else "idle"
  if next != animation_state:
    animation_state = next
    animation_frame = 0
    animation_time = 0.0
  match animation_state:
    "idle": animation_fps = 8.0
    "move": animation_fps = 10.0
    "attack": animation_fps = 12.0
    "hit": animation_fps = 12.0
    "skill": animation_fps = 14.0
    "death": animation_fps = 8.0

func _on_attack_pressed() -> void:
  set_animation("attack")
`;
}

function buildReadme({ gameName }) {
  return `# ${gameName}\n\n재운게임즈 바이브 도우미에서 생성된 Godot 프로젝트입니다.\n\n기본 기준:\n- Godot 4.7 계열\n- 모바일 터치 우선\n- 가상 조이스틱 기본\n- 안전 여백\n- 세로/가로 자동 대응\n- 그래픽과 게임 로직 분리\n- 애니메이션 상태: idle/move/attack/hit/skill/death\n- 기존 게임 규칙/세이브 보호\n\n실제 출시 전에는 Godot 에디터에서 씬/스크립트 참조, 실제 에셋 연결, 애니메이션 리소스, 저장/복원, 입력, 성능을 반드시 검증해야 합니다.\n`;
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
    formatVersion: 2,
    slug: projectSlug,
    title: gameName,
    target: 'godot',
    files: Object.freeze(files),
    requirements: Object.freeze({
      mobileTouch: true,
      virtualJoystick: true,
      safeArea: true,
      responsiveOrientation: true,
      keyboardDefault: false,
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
