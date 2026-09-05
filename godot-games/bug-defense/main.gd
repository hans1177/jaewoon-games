extends Node2D

# 파일명: godot-games/bug-defense/main.gd
# 역할: 곤충 디펜스 Godot 실전 검증판의 전투/웨이브/포탑/AI/모바일 입력/연출
# 규칙: 기존 웹판의 확인 가능한 핵심 수치(기지 300, 시작 돈 100, 30 웨이브, 현상금)를 유지하고 추가 고급 기능은 별도 시스템으로 적용

const VIEW_SIZE := Vector2(1280, 720)
const BASE_HP_MAX := 300.0
const START_MONEY := 100
const TOTAL_WAVES := 30
const PLAYER_HP := 100.0
const PLAYER_DAMAGE := 10.0
const PLAYER_ATTACK_COOLDOWN := 0.65
const TOWER_UPGRADE_COST := 60
const PLAYER_UPGRADE_COST := 35
const TRAP_COSTS := {"web": 300, "antlion": 500}
const TOWER_COSTS := {"normal": 50, "arrow": 120, "healing": 777, "explosive": 250}
const BOUNTIES := {
	"soldier": {"name": "병정개미", "hp": 6000.0, "reward": 200, "speed": 34.0},
	"butterfly": {"name": "나비", "hp": 9000.0, "reward": 350, "speed": 42.0},
	"venom": {"name": "작은 독거미", "hp": 32000.0, "reward": 500, "speed": 21.0},
}
const PATH := [
	Vector2(50, 190), Vector2(235, 190), Vector2(390, 340), Vector2(570, 195),
	Vector2(760, 355), Vector2(940, 210), Vector2(1120, 360), Vector2(1230, 250)
]

var save_runtime: JaewoonSaveRuntime
var base_hp := BASE_HP_MAX
var money := START_MONEY
var wave := 1
var active_wave := false
var wave_cleared := false
var player_hp := PLAYER_HP
var player_damage := PLAYER_DAMAGE
var player_pos := Vector2(640, 505)
var player_target_facing := 1.0
var player_attack_time := -10.0
var player_attack_flash := 0.0
var selected_tower := "normal"
var towers: Array = []
var traps: Array = []
var enemies: Array = []
var projectiles: Array = []
var effects: Array = []
var ai_enabled := false
var ai_units: Array = []
var bounty_ready_at := 0.0
var selected_bounty := ""
var current_time := 0.0
var spawn_clock := 0.0
var spawn_remaining := 0
var enemy_seed := 0
var joystick_active := false
var joystick_id := -1
var joystick_vector := Vector2.ZERO
var joystick_center := Vector2(130, 612)
var joystick_radius := 72.0
var attack_center := Vector2(1145, 610)
var attack_radius := 62.0
var last_save := 0.0
var status_text := "준비"
var status_timer := 0.0
var base_sprite: Sprite2D
var player_sprite: Sprite2D
var ui_status: Label
var ui_stats: Label
var ui_wave: Label
var ui_help: Label
var ui_shop: VBoxContainer
var ui_ai: Button
var ui_next_wave: Button
var ui_bounty: Button
var ui_bounty_menu: VBoxContainer
var ui_trap: Button
var tower_buttons: Dictionary = {}
var tower_textures := {}
var enemy_textures := {}

func _ready() -> void:
	save_runtime = $SaveRuntime as JaewoonSaveRuntime
	_load_textures()
	_build_hud()
	_load_game()
	if not active_wave:
		_start_wave()
	queue_redraw()

func _load_textures() -> void:
	tower_textures["hero"] = load("res://assets/hero.svg")
	tower_textures["turret"] = load("res://assets/turret.svg")
	tower_textures["base"] = load("res://assets/base.svg")
	enemy_textures["ant"] = load("res://assets/ant.svg")
	enemy_textures["spider"] = load("res://assets/spider.svg")
	enemy_textures["moth"] = load("res://assets/moth.svg")
	enemy_textures["boss"] = load("res://assets/boss.svg")

func _build_hud() -> void:
	var top := HBoxContainer.new()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE, Control.PRESET_MODE_MINSIZE, 16)
	top.position.y = 8
	top.add_theme_constant_override("separation", 8)
	$UI.add_child(top)

	ui_stats = Label.new()
	ui_stats.add_theme_font_size_override("font_size", 18)
	top.add_child(ui_stats)
	ui_wave = Label.new()
	ui_wave.add_theme_font_size_override("font_size", 18)
	top.add_spacer(false)
	top.add_child(ui_wave)
	ui_status = Label.new()
	ui_status.add_theme_font_size_override("font_size", 16)
	top.add_spacer(false)
	top.add_child(ui_status)

	var menu := HBoxContainer.new()
	menu.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT, Control.PRESET_MODE_MINSIZE, 16)
	menu.position.y = 55
	menu.add_theme_constant_override("separation", 6)
	$UI.add_child(menu)
	for type in ["normal", "arrow", "healing", "explosive"]:
		var button := Button.new()
		button.text = _tower_label(type)
		button.custom_minimum_size = Vector2(125, 44)
		button.pressed.connect(func(): _select_tower(type))
		menu.add_child(button)
		tower_buttons[type] = button

	var actions := HBoxContainer.new()
	actions.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT, Control.PRESET_MODE_MINSIZE, 16)
	actions.position.y = -100
	actions.add_theme_constant_override("separation", 6)
	$UI.add_child(actions)
	ui_next_wave = Button.new()
	ui_next_wave.text = "다음 웨이브"
	ui_next_wave.custom_minimum_size = Vector2(130, 44)
	ui_next_wave.pressed.connect(_next_wave)
	actions.add_child(ui_next_wave)
	ui_bounty = Button.new()
	ui_bounty.text = "🎯 현상금"
	ui_bounty.custom_minimum_size = Vector2(120, 44)
	ui_bounty.pressed.connect(_toggle_bounty)
	actions.add_child(ui_bounty)
	ui_trap = Button.new()
	ui_trap.text = "🕸 함정"
	ui_trap.custom_minimum_size = Vector2(105, 44)
	ui_trap.pressed.connect(_place_web_trap)
	actions.add_child(ui_trap)
	ui_ai = Button.new()
	ui_ai.text = "AI 지원 OFF"
	ui_ai.custom_minimum_size = Vector2(125, 44)
	ui_ai.pressed.connect(_toggle_ai)
	actions.add_child(ui_ai)
	var shop := Button.new()
	shop.text = "상점"
	shop.custom_minimum_size = Vector2(85, 44)
	shop.pressed.connect(_buy_player_upgrade)
	actions.add_child(shop)

	ui_bounty_menu = VBoxContainer.new()
	ui_bounty_menu.visible = false
	ui_bounty_menu.position = Vector2(16, 108)
	ui_bounty_menu.size = Vector2(280, 185)
	$UI.add_child(ui_bounty_menu)
	for key in ["soldier", "butterfly", "venom"]:
		var b := Button.new()
		var data: Dictionary = BOUNTIES[key]
		b.text = "%s · %d원" % [data.name, int(data.reward)]
		b.custom_minimum_size = Vector2(260, 50)
		b.pressed.connect(func(): _start_bounty(key))
		ui_bounty_menu.add_child(b)

	ui_help = Label.new()
	ui_help.text = "왼쪽 조이스틱 이동 · 오른쪽 공격 · 빈 땅 탭으로 포탑 설치 · 4개 포탑은 위에서 선택"
	ui_help.add_theme_font_size_override("font_size", 13)
	ui_help.position = Vector2(18, 662)
	$UI.add_child(ui_help)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.03, 0.11, 0.07, 0.82)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color(0.25, 0.45, 0.32, 0.9)
	var panel := Panel.new()
	panel.position = Vector2(8, 4)
	panel.size = Vector2(1264, 72)
	panel.add_theme_stylebox_override("panel", style)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$UI.move_child(panel, 0)

func _tower_label(type: String) -> String:
	match type:
		"normal": return "일반 50원"
		"arrow": return "화살 120원"
		"healing": return "치유 777원"
		"explosive": return "폭발 250원"
	return type

func _select_tower(type: String) -> void:
	if type == "explosive" and wave < 10:
		_set_status("폭발 포탑은 10웨이브부터 해금")
		return
	selected_tower = type
	_set_status("선택: %s · 맵의 빈 땅을 탭해서 설치" % _tower_label(type))

func _process(delta: float) -> void:
	current_time += delta
	status_timer = maxf(0.0, status_timer - delta)
	_update_entities(delta)
	_update_towers(delta)
	_update_ai(delta)
	_update_projectiles(delta)
	_update_effects(delta)
	_update_ui()
	if current_time - last_save >= 8.0:
		last_save = current_time
		_save_game()
	queue_redraw()

func _update_ui() -> void:
	ui_stats.text = "기지 %.0f/%.0f   돈 %d   인간 HP %.0f/%.0f" % [base_hp, BASE_HP_MAX, money, player_hp, PLAYER_HP]
	var enemy_count := enemies.size()
	ui_wave.text = "스테이지 1   웨이브 %d/%d   적 %d" % [wave, TOTAL_WAVES, enemy_count]
	ui_status.text = status_text if status_timer > 0 else ("웨이브 진행 중" if active_wave else "다음 웨이브 준비")
	ui_next_wave.disabled = active_wave or not wave_cleared or wave >= TOTAL_WAVES
	ui_bounty.disabled = current_time < bounty_ready_at
	ui_ai.text = "AI 지원 ON" if ai_enabled else "AI 지원 OFF"
	for key in tower_buttons.keys():
		var button: Button = tower_buttons[key]
		button.disabled = key == "explosive" and wave < 10

func _start_wave() -> void:
	if wave > TOTAL_WAVES:
		return
	active_wave = true
	wave_cleared = false
	spawn_clock = 0.0
	spawn_remaining = 6 + wave * 2
	_set_status("웨이브 %d 시작" % wave, 2.0)

func _next_wave() -> void:
	if active_wave or not wave_cleared or wave >= TOTAL_WAVES:
		return
	wave += 1
	_start_wave()

func _spawn_enemy(type_override: String = "") -> void:
	if spawn_remaining <= 0:
		return
	spawn_remaining -= 1
	enemy_seed += 1
	var type := type_override if not type_override.is_empty() else _wave_enemy_type()
	var node := AnimatedSprite2D.new()
	node.sprite_frames = _frames_for_enemy(type)
	node.animation = "idle"
	node.play()
	node.scale = Vector2.ONE * (1.12 if type == "boss" else 0.72)
	$World.add_child(node)
	var max_hp := _enemy_hp(type)
	enemies.append({
		"id": enemy_seed,
		"type": type,
		"node": node,
		"progress": 0.0,
		"hp": max_hp,
		"max_hp": max_hp,
		"speed": _enemy_speed(type),
		"damage": _enemy_damage(type),
		"attack_cd": 0.0,
		"attack_flash": 0.0,
		"reward": _enemy_reward(type),
	})
	var p: Dictionary = enemies.back()
	p.node.position = _path_position(0.0)

func _wave_enemy_type() -> String:
	if wave % 10 == 0 and spawn_remaining == 1:
		return "boss"
	var roll := (enemy_seed + wave * 7) % 10
	if wave < 6:
		return "ant"
	if wave < 16:
		return "spider" if roll >= 6 else "ant"
	return "moth" if roll >= 5 else ("spider" if roll >= 2 else "ant")

func _enemy_hp(type: String) -> float:
	match type:
		"ant": return 6000.0 + wave * 180.0
		"spider": return 9000.0 + wave * 240.0
		"moth": return 12000.0 + wave * 300.0
		"boss": return 32000.0 + wave * 750.0
	return 5000.0

func _enemy_speed(type: String) -> float:
	match type:
		"ant": return 34.0
		"spider": return 28.0
		"moth": return 42.0
		"boss": return 20.0
	return 30.0

func _enemy_damage(type: String) -> float:
	match type:
		"ant": return 10.0
		"spider": return 15.0
		"moth": return 20.0
		"boss": return 35.0
	return 8.0

func _enemy_reward(type: String) -> int:
	match type:
		"boss": return 500
		"moth": return 80
		"spider": return 50
		"ant": return 20
	return 10

func _update_entities(delta: float) -> void:
	if active_wave:
		spawn_clock -= delta
		if spawn_remaining > 0 and spawn_clock <= 0.0:
			_spawn_enemy()
			spawn_clock = maxf(0.45, 2.2 - wave * 0.025)
		if spawn_remaining <= 0 and enemies.is_empty():
			active_wave = false
			wave_cleared = true
			money += 100
			_set_status("웨이브 %d 클리어 · 보너스 100원" % wave, 2.5)
			if wave >= TOTAL_WAVES:
				_set_status("🏆 30웨이브 최종전 클리어", 6.0)

	for i in range(enemies.size() - 1, -1, -1):
		var enemy: Dictionary = enemies[i]
		var progress := float(enemy.progress)
		var type := String(enemy.type)
		progress += float(enemy.speed) * delta / 1100.0
		enemy.progress = progress
		enemy.attack_cd = maxf(0.0, float(enemy.attack_cd) - delta)
		enemy.attack_flash = maxf(0.0, float(enemy.attack_flash) - delta)
		enemy.node.position = _path_position(progress)
		var bob := sin(current_time * 6.0 + float(enemy.id)) * 0.045
		enemy.node.scale = Vector2.ONE * ((1.12 if type == "boss" else 0.72) * (1.0 + bob))
		if progress >= 1.0:
			base_hp = maxf(0.0, base_hp - float(enemy.damage))
			_effect(enemy.node.position, Color(0.9, 0.3, 0.25, 1.0), 18.0)
			enemy.node.queue_free()
			enemies.remove_at(i)
			if base_hp <= 0.0:
				active_wave = false
				wave_cleared = false
				_set_status("기지 파괴 · 재시작해서 다시 도전", 5.0)
		else:
			enemies[i] = enemy

func _update_towers(delta: float) -> void:
	for tower in towers:
		tower.cooldown = maxf(0.0, float(tower.cooldown) - delta)
		tower.node.rotation = sin(current_time * 2.0 + float(tower.id)) * 0.025
		if tower.type == "healing":
			if tower.cooldown <= 0.0:
				base_hp = minf(BASE_HP_MAX, base_hp + 4.0 * float(tower.level))
				tower.cooldown = 1.0
				_effect(tower.node.position, Color(0.3, 0.9, 0.55, 0.8), 10.0)
			continue
		if tower.cooldown > 0.0:
			continue
		var target := _nearest_enemy(tower.node.position, _tower_range(tower.type, tower.level))
		if target.is_empty():
			continue
		var damage := _tower_damage(tower.type, tower.level)
		target.hp = float(target.hp) - damage
		_tower_shoot_effect(tower, target)
		tower.cooldown = _tower_cooldown(tower.type)
		if float(target.hp) <= 0.0:
			_kill_enemy(target)

func _tower_range(type: String, level: int) -> float:
	match type:
		"arrow": return 260.0 + level * 22.0
		"explosive": return 210.0 + level * 16.0
	return 220.0 + level * 18.0

func _tower_damage(type: String, level: int) -> float:
	match type:
		"arrow": return 520.0 + level * 140.0
		"explosive": return 820.0 + level * 180.0
	return 360.0 + level * 110.0

func _tower_cooldown(type: String) -> float:
	match type:
		"arrow": return 0.72
		"explosive": return 1.25
	return 0.95

func _nearest_enemy(origin: Vector2, range_limit: float) -> Dictionary:
	var best: Dictionary = {}
	var best_distance := range_limit
	for enemy in enemies:
		var distance := origin.distance_to(enemy.node.position)
		if distance <= best_distance and float(enemy.hp) > 0.0:
			best = enemy
			best_distance = distance
	return best

func _kill_enemy(enemy: Dictionary) -> void:
	var id := enemy.id
	var reward := int(enemy.reward)
	money += reward
	_effect(enemy.node.position, Color(1.0, 0.75, 0.22, 1.0), 20.0)
	enemy.node.queue_free()
	for i in range(enemies.size() - 1, -1, -1):
		if int(enemies[i].id) == int(id):
			enemies.remove_at(i)
			break

func _tower_shoot_effect(tower: Dictionary, target: Dictionary) -> void:
	var projectile := {"from": tower.node.position, "to": target.node.position, "life": 0.16, "max": 0.16, "type": tower.type}
	projectiles.append(projectile)
	_effect(target.node.position, Color(1.0, 0.75, 0.25, 1.0), 12.0)
	if tower.type == "explosive":
		for enemy in enemies.duplicate():
			if enemy.node.position.distance_to(target.node.position) <= 90.0:
				enemy.hp = float(enemy.hp) - _tower_damage("explosive", int(tower.level)) * 0.35
				if float(enemy.hp) <= 0.0:
					_kill_enemy(enemy)

func _update_projectiles(delta: float) -> void:
	for i in range(projectiles.size() - 1, -1, -1):
		var p: Dictionary = projectiles[i]
		p.life = float(p.life) - delta
		projectiles[i] = p
		if float(p.life) <= 0.0:
			projectiles.remove_at(i)

func _update_effects(delta: float) -> void:
	for i in range(effects.size() - 1, -1, -1):
		var effect: Dictionary = effects[i]
		effect.life = float(effect.life) - delta
		effects[i] = effect
		if float(effect.life) <= 0.0:
			effects.remove_at(i)

func _update_ai(delta: float) -> void:
	if not ai_enabled:
		return
	for unit in ai_units:
		unit.cooldown = maxf(0.0, float(unit.cooldown) - delta)
		var role := String(unit.role)
		if role == "healer":
			if unit.cooldown <= 0.0:
				base_hp = minf(BASE_HP_MAX, base_hp + 8.0)
				unit.cooldown = 2.0
				_effect(unit.node.position, Color(0.35, 1.0, 0.55, 0.85), 14.0)
		else:
			if unit.cooldown <= 0.0:
				var target := _nearest_enemy(unit.node.position, 360.0)
				if not target.is_empty():
					target.hp = float(target.hp) - (180.0 if role == "tank" else 260.0)
					_effect(target.node.position, Color(0.45, 0.8, 1.0, 0.9), 9.0)
					unit.cooldown = 0.8 if role == "ranged" else 1.1
					if float(target.hp) <= 0.0:
						_kill_enemy(target)
	for ai_unit in ai_units:
			var angle := current_time * (0.55 + float(ai_unit.index) * 0.08) + float(ai_unit.index)
			ai_unit.node.position = Vector2(640, 390) + Vector2(cos(angle), sin(angle) * 0.55) * (90.0 + ai_unit.index * 35.0)
			ai_unit.node.scale = Vector2.ONE * (0.45 + sin(current_time * 3.0 + ai_unit.index) * 0.04)

func _toggle_ai() -> void:
	ai_enabled = not ai_enabled
	if ai_enabled and ai_units.is_empty():
		_spawn_ai_units()
	_set_status("AI 협동 지원 %s" % ("ON" if ai_enabled else "OFF"), 2.0)

func _spawn_ai_units() -> void:
	for i in range(3):
		var roles := ["tank", "ranged", "healer"]
		var node := Sprite2D.new()
		node.texture = tower_textures.hero
		node.modulate = [Color(0.52, 0.8, 1.0), Color(1.0, 0.75, 0.35), Color(0.55, 1.0, 0.7)][i]
		node.scale = Vector2.ONE * 0.36
		$World.add_child(node)
		node.position = Vector2(640, 400 + i * 18)
		ai_units.append({"index": i, "role": roles[i], "node": node, "cooldown": 0.0})

func _toggle_bounty() -> void:
	ui_bounty_menu.visible = not ui_bounty_menu.visible

func _start_bounty(key: String) -> void:
	ui_bounty_menu.visible = false
	if current_time < bounty_ready_at:
		return
	selected_bounty = key
	var info: Dictionary = BOUNTIES[key]
	_spawn_enemy(_bounty_enemy_type(key))
	var target: Dictionary = enemies.back()
	target.hp = info.hp
	target.max_hp = info.hp
	target.speed = info.speed
	target.reward = info.reward
	bounty_ready_at = current_time + 60.0
	_set_status("현상금: %s 추적 시작 · 60초 뒤 다시 가능" % info.name, 3.0)

func _bounty_enemy_type(key: String) -> String:
	match key:
		"soldier": return "ant"
		"butterfly": return "moth"
		"venom": return "spider"
	return "ant"

func _place_web_trap() -> void:
	if money < TRAP_COSTS.web:
		_set_status("거미함정은 300원 필요")
		return
	money -= TRAP_COSTS.web
	traps.append({"type": "web", "position": player_pos + Vector2(0, -80), "uses": 1})
	_effect(player_pos + Vector2(0, -80), Color(0.8, 0.8, 0.9, 0.75), 24.0)
	_set_status("거미함정 설치 · 최대 3개 권장", 2.0)

func _place_antlion_trap(position: Vector2) -> void:
	if money < TRAP_COSTS.antlion:
		_set_status("개미귀신 함정은 500원 필요")
		return
	money -= TRAP_COSTS.antlion
	traps.append({"type": "antlion", "position": position, "uses": 1})
	_set_status("개미귀신 함정 설치", 2.0)

func _buy_player_upgrade() -> void:
	if money < PLAYER_UPGRADE_COST:
		_set_status("공격 강화는 35원 필요")
		return
	money -= PLAYER_UPGRADE_COST
	player_damage += 2.0
	_set_status("플레이어 공격 +2", 2.0)

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_down(event.position, event.index)
		else:
			_touch_up(event.position, event.index)
	elif event is InputEventScreenDrag:
		_touch_drag(event.position, event.index)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_touch_down(event.position, 0)
		else:
			_touch_up(event.position, 0)
	elif event is InputEventMouseMotion and joystick_active:
		_touch_drag(event.position, 0)

func _touch_down(position: Vector2, id: int) -> void:
	if position.distance_to(joystick_center) <= joystick_radius * 1.4 and not joystick_active:
		joystick_active = true
		joystick_id = id
		_update_joystick(position)
		return
	if position.distance_to(attack_center) <= attack_radius * 1.35:
		_player_attack()
		return
	if position.y < 80.0 or position.y > 635.0:
		return
	_try_place_tower(position)

func _touch_up(position: Vector2, id: int) -> void:
	if id == joystick_id:
		joystick_active = false
		joystick_id = -1
		joystick_vector = Vector2.ZERO

func _touch_drag(position: Vector2, id: int) -> void:
	if id == joystick_id and joystick_active:
		_update_joystick(position)

func _update_joystick(position: Vector2) -> void:
	var offset := position - joystick_center
	if offset.length() > joystick_radius:
		offset = offset.normalized() * joystick_radius
	joystick_vector = offset / joystick_radius

func _physics_process(delta: float) -> void:
	var move := joystick_vector
	if move.length() > 0.12:
		player_pos += move.normalized() * 220.0 * delta
		player_pos.x = clampf(player_pos.x, 30.0, 1250.0)
		player_pos.y = clampf(player_pos.y, 100.0, 585.0)
		player_target_facing = 1.0 if move.x >= 0.0 else -1.0
		player_attack_flash = maxf(0.0, player_attack_flash - delta)
	_update_player_visual(delta)
	_update_traps()

func _update_player_visual(delta: float) -> void:
	if player_sprite == null:
		return
	var bob := sin(current_time * 7.0) * 0.035 if joystick_vector.length() > 0.12 else sin(current_time * 3.0) * 0.018
	var attack_scale := 1.0 + minf(0.25, player_attack_flash * 1.5)
	player_sprite.position = player_pos + Vector2(0, sin(current_time * 5.0) * 2.0)
	player_sprite.scale = Vector2(0.68 * player_target_facing, 0.68) * (1.0 + bob) * attack_scale
	if player_attack_flash > 0.0:
		player_sprite.rotation = sin(current_time * 55.0) * 0.12
	else:
		player_sprite.rotation = 0.0

func _player_attack() -> void:
	if current_time - player_attack_time < PLAYER_ATTACK_COOLDOWN:
		return
	player_attack_time = current_time
	player_attack_flash = 0.22
	var target := _nearest_enemy(player_pos, 180.0)
	if target.is_empty():
		_effect(player_pos + Vector2(70 * player_target_facing, 0), Color(0.8, 0.9, 1.0, 0.5), 12.0)
		return
	target.hp = float(target.hp) - player_damage
	projectiles.append({"from": player_pos, "to": target.node.position, "life": 0.12, "max": 0.12, "type": "player"})
	_effect(target.node.position, Color(1.0, 0.85, 0.35, 1.0), 14.0)
	if float(target.hp) <= 0.0:
		_kill_enemy(target)

func _try_place_tower(position: Vector2) -> void:
	if position.y < 100.0 or position.y > 590.0:
		return
	if _near_path(position, 58.0):
		_set_status("길 위에는 포탑을 설치할 수 없어")
		return
	for tower in towers:
		if tower.node.position.distance_to(position) < 82.0:
		_set_status("포탑이 너무 가까워")
		return
	var cost := int(TOWER_COSTS[selected_tower])
	if money < cost:
		_set_status("%s 부족" % _tower_label(selected_tower))
		return
	money -= cost
	var node := Sprite2D.new()
	node.texture = tower_textures.turret
	node.scale = Vector2.ONE * 0.58
	$World.add_child(node)
	node.position = position
	towers.append({"id": towers.size() + 1, "type": selected_tower, "level": 1, "node": node, "cooldown": 0.15})
	_effect(position, Color(0.45, 1.0, 0.65, 0.9), 22.0)
	_set_status("포탑 설치 완료", 1.5)

func _near_path(position: Vector2, distance: float) -> bool:
	for i in range(PATH.size() - 1):
		var a: Vector2 = PATH[i]
		var b: Vector2 = PATH[i + 1]
		if position.distance_to(_closest_point_segment(position, a, b)) <= distance:
			return true
	return false

func _closest_point_segment(p: Vector2, a: Vector2, b: Vector2) -> Vector2:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(0.01, ab.length_squared()), 0.0, 1.0)
	return a + ab * t

func _update_traps() -> void:
	for i in range(traps.size() - 1, -1, -1):
		var trap: Dictionary = traps[i]
		if int(trap.get("uses", 1)) <= 0:
			traps.remove_at(i)
			continue
		for enemy in enemies.duplicate():
			if enemy.node.position.distance_to(trap.position) > 38.0:
				continue
			if trap.type == "web":
				enemy.hp = float(enemy.hp) - 1200.0
			else:
				enemy.hp = 1.0 if String(enemy.type) == "boss" else 0.0
			trap.uses = 0
			enemies[i if false else 0] = enemies[0] if enemies.size() > 0 else {}
			_effect(trap.position, Color(0.85, 0.9, 1.0, 0.9), 30.0)
			if float(enemy.hp) <= 0.0:
				_kill_enemy(enemy)
			break
		traps[i] = trap

func _path_position(t: float) -> Vector2:
	if t <= 0.0:
		return PATH[0]
	if t >= 1.0:
		return PATH[PATH.size() - 1]
	var scaled := t * float(PATH.size() - 1)
	var index := mini(int(floor(scaled)), PATH.size() - 2)
	var local_t := scaled - index
	return PATH[index].lerp(PATH[index + 1], local_t)

func _frames_for_enemy(type: String) -> SpriteFrames:
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for state in ["idle", "move", "attack"]:
		frames.add_animation(state)
		frames.set_animation_speed(state, 6.0 if state == "idle" else 10.0)
		frames.set_animation_loop(state, state != "attack")
		var texture: Texture2D = enemy_textures.get(type, enemy_textures.ant)
		frames.add_frame(state, texture)
		frames.add_frame(state, texture)
	return frames

func _effect(position: Vector2, tint: Color, radius: float) -> void:
	effects.append({"position": position, "life": 0.35, "max": 0.35, "color": tint, "radius": radius})

func _tower_upgrade() -> void:
	if towers.is_empty():
		_set_status("먼저 포탑을 설치해")
		return
	if money < TOWER_UPGRADE_COST:
		_set_status("포탑 강화는 60원 필요")
		return
	money -= TOWER_UPGRADE_COST
	for tower in towers:
		tower.level = mini(7, int(tower.level) + 1)
	_set_status("설치된 포탑 전부 강화", 2.0)

func _save_game() -> void:
	if save_runtime == null:
		return
	var save := {
		"base_hp": base_hp,
		"money": money,
		"wave": wave,
		"player_hp": player_hp,
		"player_damage": player_damage,
		"player_pos": {"x": player_pos.x, "y": player_pos.y},
		"ai_enabled": ai_enabled,
		"bounty_ready_at": bounty_ready_at,
		"towers": [],
		"traps": [],
	}
	for tower in towers:
		save.towers.append({"type": tower.type, "level": tower.level, "x": tower.node.position.x, "y": tower.node.position.y})
	for trap in traps:
		save.traps.append({"type": trap.type, "uses": trap.uses, "x": trap.position.x, "y": trap.position.y})
	save_runtime.queue_state(save)

func _load_game() -> void:
	var save: Dictionary = save_runtime.load_state({})
	if save.is_empty():
		_base_setup()
		return
	base_hp = clampf(float(save.get("base_hp", BASE_HP_MAX)), 0.0, BASE_HP_MAX)
	money = maxi(0, int(save.get("money", START_MONEY)))
	wave = clampi(int(save.get("wave", 1)), 1, TOTAL_WAVES)
	player_hp = clampf(float(save.get("player_hp", PLAYER_HP)), 0.0, PLAYER_HP)
	player_damage = maxf(PLAYER_DAMAGE, float(save.get("player_damage", PLAYER_DAMAGE)))
	var p: Dictionary = save.get("player_pos", {})
	player_pos = Vector2(float(p.get("x", 640.0)), float(p.get("y", 505.0)))
	ai_enabled = bool(save.get("ai_enabled", false))
	bounty_ready_at = maxf(0.0, float(save.get("bounty_ready_at", 0.0)))
	for tower in towers:
		tower.node.queue_free()
	towers.clear()
	for data in save.get("towers", []):
		if typeof(data) != TYPE_DICTIONARY:
			continue
		var type := String(data.get("type", "normal"))
		var node := Sprite2D.new()
		node.texture = tower_textures.turret
		node.scale = Vector2.ONE * 0.58
		node.position = Vector2(float(data.get("x", 0.0)), float(data.get("y", 0.0)))
		$World.add_child(node)
		towers.append({"id": towers.size() + 1, "type": type, "level": clampi(int(data.get("level", 1)), 1, 7), "node": node, "cooldown": 0.2})
	for data in save.get("traps", []):
		if typeof(data) != TYPE_DICTIONARY:
			continue
		traps.append({"type": String(data.get("type", "web")), "uses": int(data.get("uses", 1)), "position": Vector2(float(data.get("x", 0.0)), float(data.get("y", 0.0)))})
	if ai_enabled:
		_spawn_ai_units()
	_base_setup()

func _base_setup() -> void:
	base_sprite = Sprite2D.new()
	base_sprite.texture = tower_textures.base
	base_sprite.position = PATH[PATH.size() - 1] + Vector2(0, -12)
	base_sprite.scale = Vector2.ONE * 0.75
	$World.add_child(base_sprite)
	player_sprite = Sprite2D.new()
	player_sprite.texture = tower_textures.hero
	player_sprite.position = player_pos
	player_sprite.scale = Vector2.ONE * 0.68
	$World.add_child(player_sprite)

func _set_status(text: String, duration: float = 1.4) -> void:
	status_text = text
	status_timer = duration

func _draw() -> void:
	var size := get_viewport_rect().size
	if size == Vector2.ZERO:
		size = VIEW_SIZE
	_draw_background(size)
	_draw_path()
	_draw_enemies()
	_draw_towers()
	_draw_projectiles()
	_draw_effects()
	_draw_controls(size)
	if base_sprite != null:
		var pulse := 1.0 + sin(current_time * 3.0) * 0.04
		base_sprite.scale = Vector2.ONE * 0.75 * pulse

func _draw_background(size: Vector2) -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("07150d"))
	for y in range(90, 620, 48):
		for x in range(24, 1260, 48):
			var n := sin(float(x * 3 + y * 7)) * 0.5 + 0.5
			var p := Vector2(x, y)
			draw_circle(p, 1.5 + n * 1.5, Color(0.2, 0.45, 0.28, 0.22))

func _draw_path() -> void:
	for i in range(PATH.size() - 1):
		var a: Vector2 = PATH[i]
		var b: Vector2 = PATH[i + 1]
		draw_line(a, b, Color(0.15, 0.11, 0.08, 1.0), 54.0, true)
		draw_line(a, b, Color(0.3, 0.23, 0.15, 1.0), 46.0, true)
		draw_line(a, b, Color(0.52, 0.42, 0.25, 0.35), 2.0, true)

func _draw_enemies() -> void:
	for enemy in enemies:
		var p: Vector2 = enemy.node.position
		var hp_ratio := clampf(float(enemy.hp) / float(enemy.max_hp), 0.0, 1.0)
		var bar_w := 70.0 if enemy.type == "boss" else 45.0
		draw_rect(Rect2(p + Vector2(-bar_w * 0.5, -58), Vector2(bar_w, 6)), Color(0.05, 0.04, 0.03, 0.85))
		draw_rect(Rect2(p + Vector2(-bar_w * 0.5, -58), Vector2(bar_w * hp_ratio, 6)), Color(0.9, 0.25, 0.28, 0.9))

func _draw_towers() -> void:
	for tower in towers:
		var p: Vector2 = tower.node.position
		var range := _tower_range(tower.type, int(tower.level))
		if current_time - player_attack_time < 0.05:
			draw_arc(p, range, 0.0, TAU, 48, Color(0.3, 0.8, 0.45, 0.08), 1.0)
		var level := int(tower.level)
		draw_string(ThemeDB.fallback_font, p + Vector2(-10, 52), "Lv.%d" % level, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.9, 1.0, 0.9, 0.85))

func _draw_projectiles() -> void:
	for projectile in projectiles:
		var t := 1.0 - float(projectile.life) / float(projectile.max)
		var pos: Vector2 = projectile.from.lerp(projectile.to, t)
		draw_circle(pos, 6.0, Color(1.0, 0.8, 0.3, 0.95))

func _draw_effects() -> void:
	for effect in effects:
		var ratio := clampf(float(effect.life) / float(effect.max), 0.0, 1.0)
		var radius := float(effect.radius) * (1.0 - ratio * 0.55)
		var color: Color = effect.color
		color.a *= ratio
		draw_arc(effect.position, radius, 0.0, TAU, 32, color, 4.0)

func _draw_controls(size: Vector2) -> void:
	draw_circle(joystick_center, joystick_radius, Color(1.0, 1.0, 1.0, 0.09))
	draw_arc(joystick_center, joystick_radius, 0.0, TAU, 48, Color(1.0, 1.0, 1.0, 0.22), 3.0)
	draw_circle(joystick_center + joystick_vector * joystick_radius, 28.0, Color(0.35, 0.7, 1.0, 0.85))
	draw_circle(attack_center, attack_radius, Color(0.9, 0.2, 0.24, 0.9))
	draw_arc(attack_center, attack_radius, 0.0, TAU, 48, Color(1.0, 1.0, 1.0, 0.32), 3.0)
	draw_string(ThemeDB.fallback_font, attack_center + Vector2(-20, 7), "공격", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
	draw_string(ThemeDB.fallback_font, joystick_center + Vector2(-38, 106), "이동", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1, 1, 1, 0.68))

func _bounty_button_cooldown() -> float:
	return maxf(0.0, bounty_ready_at - current_time)
