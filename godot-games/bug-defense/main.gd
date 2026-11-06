extends Node2D

# 파일명: godot-games/bug-defense/main.gd
# 역할: 곤충 디펜스 Godot 실전판 전투/웨이브/포탑/AI/모바일 입력/저장
# 규칙: 모바일 터치+조이스틱 우선. 기존 웹판의 확인 가능한 핵심 수치를 유지.

const VIEW := Vector2(1280, 720)
const BASE_MAX := 300.0
const START_MONEY := 100
const PLAYER_MAX_HP := 100.0
const PLAYER_DAMAGE := 10.0
const TOTAL_WAVES := 30
const PATH := [Vector2(40, 170), Vector2(220, 170), Vector2(380, 300), Vector2(560, 185), Vector2(740, 340), Vector2(920, 205), Vector2(1110, 350), Vector2(1240, 250)]
const TOWER_COST := {"normal": 50, "arrow": 120, "healing": 777, "explosive": 250}
const TOWER_DAMAGE := {"normal": 360.0, "arrow": 520.0, "healing": 0.0, "explosive": 820.0}
const BOUNTIES := {
    "soldier": {"name": "병정개미", "hp": 6000.0, "reward": 200, "speed": 34.0},
    "butterfly": {"name": "나비", "hp": 9000.0, "reward": 350, "speed": 42.0},
    "venom": {"name": "작은 독거미", "hp": 32000.0, "reward": 500, "speed": 21.0}
}

var save_runtime: Node
var base_hp := BASE_MAX
var money := START_MONEY
var player_hp := PLAYER_MAX_HP
var player_damage := PLAYER_DAMAGE
var wave := 1
var active_wave := false
var wave_cleared := false
var spawn_remaining := 0
var spawn_timer := 0.0
var enemy_id := 0
var current_time := 0.0
var attack_timer := 0.0
var status_timer := 0.0
var status_text := "준비"
var ai_enabled := false
var bounty_ready_at := 0.0
var selected_tower := "normal"
var player_pos := Vector2(640, 500)
var joystick_active := false
var joystick_id := -1
var joystick_vector := Vector2.ZERO
var joystick_center := Vector2(120, 600)
var joystick_radius := 68.0
var attack_center := Vector2(1160, 600)
var attack_radius := 58.0
var towers: Array = []
var enemies: Array = []
var effects: Array = []
var ai_units: Array = []
var projectiles: Array = []
var tower_texture: Texture2D
var hero_texture: Texture2D
var base_texture: Texture2D
var ant_texture: Texture2D
var spider_texture: Texture2D
var moth_texture: Texture2D
var boss_texture: Texture2D
var player_sprite: Sprite2D
var base_sprite: Sprite2D
var stats_label: Label
var wave_label: Label
var status_label: Label
var ai_button: Button
var next_wave_button: Button
var tower_buttons: Dictionary = {}
var last_save := 0.0

func _ready() -> void:
    save_runtime = get_node_or_null("SaveRuntime")
    _load_assets()
    _setup_world_visuals()
    _setup_ui()
    _load_game()
    if not active_wave:
        _start_wave()
    queue_redraw()

func _load_assets() -> void:
    tower_texture = load("res://assets/turret.svg")
    hero_texture = load("res://assets/hero.svg")
    base_texture = load("res://assets/base.svg")
    ant_texture = load("res://assets/ant.svg")
    spider_texture = load("res://assets/spider.svg")
    moth_texture = load("res://assets/moth.svg")
    boss_texture = load("res://assets/boss.svg")

func _setup_world_visuals() -> void:
    if base_sprite == null:
        base_sprite = Sprite2D.new()
        base_sprite.texture = base_texture
        base_sprite.position = PATH[PATH.size() - 1] + Vector2(0, -24)
        base_sprite.scale = Vector2.ONE * 0.78
        $World.add_child(base_sprite)
    if player_sprite == null:
        player_sprite = Sprite2D.new()
        player_sprite.texture = hero_texture
        player_sprite.position = player_pos
        player_sprite.scale = Vector2.ONE * 0.68
        $World.add_child(player_sprite)

func _setup_ui() -> void:
    var top := $UI.get_node_or_null("RuntimeTop")
    if top == null:
        top = Panel.new()
        top.name = "RuntimeTop"
        top.position = Vector2(16, 10)
        top.size = Vector2(1248, 58)
        top.mouse_filter = Control.MOUSE_FILTER_IGNORE
        $UI.add_child(top)
    stats_label = Label.new()
    stats_label.position = Vector2(16, 12)
    stats_label.add_theme_font_size_override("font_size", 18)
    top.add_child(stats_label)
    wave_label = Label.new()
    wave_label.position = Vector2(460, 12)
    wave_label.add_theme_font_size_override("font_size", 18)
    top.add_child(wave_label)
    status_label = Label.new()
    status_label.position = Vector2(800, 13)
    status_label.add_theme_font_size_override("font_size", 16)
    top.add_child(status_label)

    var menu := HBoxContainer.new()
    menu.position = Vector2(720, 78)
    menu.add_theme_constant_override("separation", 5)
    $UI.add_child(menu)
    for type in ["normal", "arrow", "healing", "explosive"]:
        var b := Button.new()
        b.text = _tower_label(type)
        b.custom_minimum_size = Vector2(120, 42)
        b.pressed.connect(func(): _select_tower(type))
        menu.add_child(b)
        tower_buttons[type] = b

    next_wave_button = Button.new()
    next_wave_button.text = "다음 웨이브"
    next_wave_button.position = Vector2(16, 646)
    next_wave_button.size = Vector2(122, 46)
    next_wave_button.pressed.connect(_next_wave)
    $UI.add_child(next_wave_button)

    ai_button = Button.new()
    ai_button.text = "AI 지원 OFF"
    ai_button.position = Vector2(146, 646)
    ai_button.size = Vector2(118, 46)
    ai_button.pressed.connect(_toggle_ai)
    $UI.add_child(ai_button)

func _tower_label(type: String) -> String:
    match type:
        "normal": return "일반 50원"
        "arrow": return "화살 120원"
        "healing": return "치유 777원"
        "explosive": return "폭발 250원"
    return type

func _process(delta: float) -> void:
    current_time += delta
    attack_timer = maxf(0.0, attack_timer - delta)
    status_timer = maxf(0.0, status_timer - delta)
    _update_wave(delta)
    _update_enemies(delta)
    _update_towers(delta)
    _update_ai(delta)
    _update_effects(delta)
    _update_projectiles(delta)
    _update_ui()
    if current_time - last_save >= 8.0:
        last_save = current_time
        _save_game()
    queue_redraw()

func _physics_process(delta: float) -> void:
    if joystick_vector.length() > 0.08:
        player_pos += joystick_vector * 220.0 * delta
        player_pos.x = clampf(player_pos.x, 35.0, 1245.0)
        player_pos.y = clampf(player_pos.y, 105.0, 585.0)
    if player_sprite != null:
        player_sprite.position = player_pos + Vector2(0, sin(current_time * 6.0) * 2.0)
        var moving := joystick_vector.length() > 0.08
        var bob := 1.0 + sin(current_time * (8.0 if moving else 3.0)) * (0.045 if moving else 0.018)
        player_sprite.scale = Vector2(0.68, 0.68) * bob

func _update_wave(delta: float) -> void:
    if not active_wave:
        return
    spawn_timer -= delta
    if spawn_remaining > 0 and spawn_timer <= 0.0:
        _spawn_enemy()
        spawn_timer = maxf(0.45, 1.8 - wave * 0.02)
    if spawn_remaining <= 0 and enemies.is_empty():
        active_wave = false
        wave_cleared = true
        money += 100
        _set_status("웨이브 %d 클리어 · 보너스 100원" % wave, 2.5)

func _start_wave() -> void:
    if wave > TOTAL_WAVES:
        return
    active_wave = true
    wave_cleared = false
    spawn_remaining = 6 + wave * 2
    spawn_timer = 0.1
    _set_status("웨이브 %d 시작" % wave, 2.0)

func _next_wave() -> void:
    if active_wave or not wave_cleared or wave >= TOTAL_WAVES:
        return
    wave += 1
    _start_wave()

func _spawn_enemy(kind: String = "") -> void:
    if spawn_remaining <= 0:
        return
    spawn_remaining -= 1
    enemy_id += 1
    var type := kind if not kind.is_empty() else _wave_enemy_type()
    var sprite := Sprite2D.new()
    sprite.texture = _enemy_texture(type)
    sprite.position = PATH[0]
    sprite.scale = Vector2.ONE * (0.9 if type == "boss" else 0.62)
    $World.add_child(sprite)
    var hp := _enemy_hp(type)
    enemies.append({"id": enemy_id, "type": type, "node": sprite, "progress": 0.0, "hp": hp, "max_hp": hp, "speed": _enemy_speed(type), "damage": _enemy_damage(type), "reward": _enemy_reward(type)})

func _wave_enemy_type() -> String:
    if wave % 10 == 0 and spawn_remaining == 1:
        return "boss"
    var roll := (enemy_id + wave * 3) % 10
    if wave < 6:
        return "ant"
    if wave < 16:
        return "spider" if roll >= 6 else "ant"
    return "moth" if roll >= 5 else ("spider" if roll >= 2 else "ant")

func _enemy_texture(type: String) -> Texture2D:
    match type:
        "ant": return ant_texture
        "spider": return spider_texture
        "moth": return moth_texture
        "boss": return boss_texture
    return ant_texture

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

func _update_enemies(delta: float) -> void:
    for i in range(enemies.size() - 1, -1, -1):
        var enemy: Dictionary = enemies[i]
        enemy["progress"] = float(enemy["progress"]) + float(enemy["speed"]) * delta / 1100.0
        var progress := float(enemy["progress"])
        var node: Sprite2D = enemy["node"]
        node.position = _path_position(progress)
        var pulse := 1.0 + sin(current_time * 7.0 + float(enemy["id"])) * 0.05
        node.scale = Vector2.ONE * (0.9 if enemy["type"] == "boss" else 0.62) * pulse
        enemies[i] = enemy
        if progress >= 1.0:
            base_hp = maxf(0.0, base_hp - float(enemy["damage"]))
            _effect(node.position, Color(1.0, 0.22, 0.2, 0.9), 20.0)
            node.queue_free()
            enemies.remove_at(i)
            if base_hp <= 0.0:
                active_wave = false
                wave_cleared = false
                _set_status("기지 파괴", 4.0)

func _update_towers(delta: float) -> void:
    for tower in towers:
        tower["cooldown"] = maxf(0.0, float(tower["cooldown"]) - delta)
        var node: Sprite2D = tower["node"]
        node.rotation = sin(current_time * 2.0 + float(tower["id"])) * 0.03
        var type: String = tower["type"]
        if type == "healing":
            if float(tower["cooldown"]) <= 0.0:
                base_hp = minf(BASE_MAX, base_hp + 4.0 * float(tower["level"]))
                tower["cooldown"] = 1.0
            continue
        if float(tower["cooldown"]) > 0.0:
            continue
        var range_limit := 230.0 + float(tower["level"]) * 15.0
        var target := _nearest_enemy(node.position, range_limit)
        if target.is_empty():
            continue
        var damage := float(TOWER_DAMAGE.get(type, 360.0)) + float(tower["level"] - 1) * 110.0
        target["hp"] = float(target["hp"]) - damage
        tower["cooldown"] = 1.0 if type == "normal" else (0.75 if type == "arrow" else 1.25)
        projectiles.append({"from": node.position, "to": target["node"].position, "life": 0.15, "max": 0.15})
        _effect(target["node"].position, Color(1.0, 0.75, 0.2, 0.95), 12.0)
        if float(target["hp"]) <= 0.0:
            _kill_enemy(target)

func _nearest_enemy(origin: Vector2, max_distance: float) -> Dictionary:
    var best: Dictionary = {}
    var best_distance := max_distance
    for enemy in enemies:
        var node: Sprite2D = enemy["node"]
        var d := origin.distance_to(node.position)
        if d <= best_distance and float(enemy["hp"]) > 0.0:
            best = enemy
            best_distance = d
    return best

func _kill_enemy(enemy: Dictionary) -> void:
    var id := int(enemy["id"])
    money += int(enemy["reward"])
    _effect(enemy["node"].position, Color(1.0, 0.75, 0.22, 1.0), 22.0)
    enemy["node"].queue_free()
    for i in range(enemies.size() - 1, -1, -1):
        if int(enemies[i]["id"]) == id:
            enemies.remove_at(i)
            break

func _update_ai(delta: float) -> void:
    if not ai_enabled:
        return
    if ai_units.is_empty():
        _spawn_ai()
    for unit in ai_units:
        unit["cooldown"] = maxf(0.0, float(unit["cooldown"]) - delta)
        var angle := current_time * (0.5 + float(unit["index"]) * 0.1) + float(unit["index"])
        var node: Sprite2D = unit["node"]
        node.position = Vector2(640, 390) + Vector2(cos(angle), sin(angle) * 0.5) * (85.0 + float(unit["index"]) * 34.0)
        node.scale = Vector2.ONE * (0.34 + sin(current_time * 4.0 + unit["index"]) * 0.025)
        if float(unit["cooldown"]) > 0.0:
            continue
        if String(unit["role"]) == "healer":
            base_hp = minf(BASE_MAX, base_hp + 8.0)
            unit["cooldown"] = 2.0
        else:
            var target := _nearest_enemy(node.position, 360.0)
            if not target.is_empty():
                target["hp"] = float(target["hp"]) - 220.0
                unit["cooldown"] = 1.0
                if float(target["hp"]) <= 0.0:
                    _kill_enemy(target)

func _spawn_ai() -> void:
    ai_units.clear()
    var roles := ["tank", "ranged", "healer"]
    for i in range(3):
        var node := Sprite2D.new()
        node.texture = hero_texture
        $World.add_child(node)
        node.position = Vector2(640, 390 + i * 22)
        ai_units.append({"index": i, "role": roles[i], "node": node, "cooldown": 0.0})

func _toggle_ai() -> void:
    ai_enabled = not ai_enabled
    if ai_enabled:
        _spawn_ai()
    else:
        for unit in ai_units:
            unit["node"].queue_free()
        ai_units.clear()
    _set_status("AI 협동 지원 %s" % ("ON" if ai_enabled else "OFF"), 2.0)

func _select_tower(type: String) -> void:
    if type == "explosive" and wave < 10:
        _set_status("폭발 포탑은 10웨이브부터", 2.0)
        return
    selected_tower = type
    _set_status("선택: %s" % _tower_label(type), 1.5)

func _try_place_tower(pos: Vector2) -> void:
    if pos.y < 105.0 or pos.y > 585.0:
        return
    for tower in towers:
        if tower["node"].position.distance_to(pos) < 70.0:
            _set_status("포탑이 너무 가까워", 1.4)
            return
    var cost := int(TOWER_COST.get(selected_tower, 50))
    if money < cost:
        _set_status("돈이 부족해", 1.4)
        return
    money -= cost
    var node := Sprite2D.new()
    node.texture = tower_texture
    node.position = pos
    node.scale = Vector2.ONE * 0.58
    $World.add_child(node)
    towers.append({"id": towers.size() + 1, "type": selected_tower, "level": 1, "node": node, "cooldown": 0.2})
    _effect(pos, Color(0.35, 1.0, 0.6, 0.9), 22.0)

func _player_attack() -> void:
    if attack_timer > 0.0:
        return
    attack_timer = 0.65
    var target := _nearest_enemy(player_pos, 185.0)
    if target.is_empty():
        _effect(player_pos + Vector2(70, 0), Color(0.7, 0.9, 1.0, 0.55), 12.0)
        return
    target["hp"] = float(target["hp"]) - player_damage
    projectiles.append({"from": player_pos, "to": target["node"].position, "life": 0.12, "max": 0.12})
    _effect(target["node"].position, Color(1.0, 0.85, 0.35, 1.0), 14.0)
    if float(target["hp"]) <= 0.0:
        _kill_enemy(target)

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

func _touch_down(pos: Vector2, id: int) -> void:
    if pos.distance_to(joystick_center) <= joystick_radius * 1.35 and not joystick_active:
        joystick_active = true
        joystick_id = id
        _update_joystick(pos)
        return
    if pos.distance_to(attack_center) <= attack_radius * 1.35:
        _player_attack()
        return
    if pos.y >= 105.0 and pos.y <= 585.0:
        _try_place_tower(pos)

func _touch_up(pos: Vector2, id: int) -> void:
    if id == joystick_id:
        joystick_active = false
        joystick_id = -1
        joystick_vector = Vector2.ZERO

func _touch_drag(pos: Vector2, id: int) -> void:
    if id == joystick_id and joystick_active:
        _update_joystick(pos)

func _update_joystick(pos: Vector2) -> void:
    var offset := pos - joystick_center
    if offset.length() > joystick_radius:
        offset = offset.normalized() * joystick_radius
    joystick_vector = offset / joystick_radius

func _update_projectiles(delta: float) -> void:
    for i in range(projectiles.size() - 1, -1, -1):
        projectiles[i]["life"] = float(projectiles[i]["life"]) - delta
        if float(projectiles[i]["life"]) <= 0.0:
            projectiles.remove_at(i)

func _update_effects(delta: float) -> void:
    for i in range(effects.size() - 1, -1, -1):
        effects[i]["life"] = float(effects[i]["life"]) - delta
        if float(effects[i]["life"]) <= 0.0:
            effects.remove_at(i)

func _path_position(t: float) -> Vector2:
    if t <= 0.0:
        return PATH[0]
    if t >= 1.0:
        return PATH[PATH.size() - 1]
    var scaled := t * float(PATH.size() - 1)
    var index := mini(int(floor(scaled)), PATH.size() - 2)
    var local_t := scaled - float(index)
    return PATH[index].lerp(PATH[index + 1], local_t)

func _effect(pos: Vector2, color: Color, radius: float) -> void:
    effects.append({"position": pos, "life": 0.35, "max": 0.35, "color": color, "radius": radius})

func _update_ui() -> void:
    if stats_label != null:
        stats_label.text = "기지 %.0f/300   돈 %d   HP %.0f/100" % [base_hp, money, player_hp]
    if wave_label != null:
        wave_label.text = "웨이브 %d/%d   적 %d" % [wave, TOTAL_WAVES, enemies.size()]
    if status_label != null:
        status_label.text = status_text if status_timer > 0.0 else ("웨이브 진행 중" if active_wave else "다음 웨이브 준비")
    if ai_button != null:
        ai_button.text = "AI 지원 ON" if ai_enabled else "AI 지원 OFF"
    if next_wave_button != null:
        next_wave_button.disabled = active_wave or not wave_cleared or wave >= TOTAL_WAVES

func _set_status(text: String, duration: float = 1.5) -> void:
    status_text = text
    status_timer = duration

func _save_game() -> void:
    if save_runtime == null:
        return
    var state := {"base_hp": base_hp, "money": money, "player_hp": player_hp, "player_damage": player_damage, "wave": wave, "player_x": player_pos.x, "player_y": player_pos.y, "ai_enabled": ai_enabled}
    save_runtime.call("queue_state", state)

func _load_game() -> void:
    if save_runtime == null:
        return
    var loaded = save_runtime.call("load_state", {})
    if typeof(loaded) != TYPE_DICTIONARY or loaded.is_empty():
        return
    var data: Dictionary = loaded
    base_hp = clampf(float(data.get("base_hp", BASE_MAX)), 0.0, BASE_MAX)
    money = maxi(0, int(data.get("money", START_MONEY)))
    player_hp = clampf(float(data.get("player_hp", PLAYER_MAX_HP)), 0.0, PLAYER_MAX_HP)
    player_damage = maxf(PLAYER_DAMAGE, float(data.get("player_damage", PLAYER_DAMAGE)))
    wave = clampi(int(data.get("wave", 1)), 1, TOTAL_WAVES)
    player_pos = Vector2(float(data.get("player_x", 640.0)), float(data.get("player_y", 500.0)))
    ai_enabled = bool(data.get("ai_enabled", false))
    if ai_enabled:
        _spawn_ai()

func _draw() -> void:
    var size := get_viewport_rect().size
    if size.x <= 0.0 or size.y <= 0.0:
        size = VIEW
    draw_rect(Rect2(Vector2.ZERO, size), Color("07150d"))
    for y in range(90, 620, 48):
        for x in range(20, 1260, 48):
            var n := sin(float(x * 3 + y * 7)) * 0.5 + 0.5
            draw_circle(Vector2(x, y), 1.2 + n * 1.6, Color(0.15, 0.38, 0.22, 0.35))
    for i in range(PATH.size() - 1):
        draw_line(PATH[i], PATH[i + 1], Color(0.18, 0.12, 0.07, 1.0), 58.0, true)
        draw_line(PATH[i], PATH[i + 1], Color(0.42, 0.31, 0.17, 1.0), 46.0, true)
        draw_line(PATH[i], PATH[i + 1], Color(0.68, 0.5, 0.26, 0.25), 2.0, true)
    draw_circle(player_pos, 30.0, Color(0.2, 0.7, 1.0, 0.12))
    for tower in towers:
        var p: Vector2 = tower["node"].position
        draw_circle(p, 31.0 + sin(current_time * 2.0 + tower["id"]) * 2.0, Color(0.25, 1.0, 0.5, 0.1))
        draw_string(ThemeDB.fallback_font, p + Vector2(-10, 46), "Lv.%d" % int(tower["level"]), HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.9, 1.0, 0.9, 0.8))
    for enemy in enemies:
        var p: Vector2 = enemy["node"].position
        var width := 72.0 if enemy["type"] == "boss" else 48.0
        var ratio := clampf(float(enemy["hp"]) / float(enemy["max_hp"]), 0.0, 1.0)
        draw_rect(Rect2(p + Vector2(-width * 0.5, -49), Vector2(width, 6)), Color(0.05, 0.03, 0.03, 0.9))
        draw_rect(Rect2(p + Vector2(-width * 0.5, -49), Vector2(width * ratio, 6)), Color(0.9, 0.25, 0.28, 0.95))
    for projectile in projectiles:
        var t := 1.0 - float(projectile["life"]) / float(projectile["max"])
        draw_circle(projectile["from"].lerp(projectile["to"], t), 6.0, Color(1.0, 0.78, 0.25, 0.95))
    for effect in effects:
        var ratio := clampf(float(effect["life"]) / float(effect["max"]), 0.0, 1.0)
        var color: Color = effect["color"]
        color.a *= ratio
        draw_arc(effect["position"], float(effect["radius"]) * (1.0 - ratio * 0.5), 0.0, TAU, 32, color, 4.0)
    draw_circle(joystick_center, joystick_radius, Color(1, 1, 1, 0.09))
    draw_arc(joystick_center, joystick_radius, 0.0, TAU, 40, Color(1, 1, 1, 0.28), 3.0)
    draw_circle(joystick_center + joystick_vector * joystick_radius, 25.0, Color(0.25, 0.7, 1.0, 0.85))
    draw_circle(attack_center, attack_radius, Color(0.9, 0.18, 0.22, 0.92))
    draw_arc(attack_center, attack_radius, 0.0, TAU, 40, Color.WHITE, 3.0)
    draw_string(ThemeDB.fallback_font, attack_center + Vector2(-17, 7), "공격", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.WHITE)
    draw_string(ThemeDB.fallback_font, joystick_center + Vector2(-18, 100), "이동", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1, 1, 1, 0.75))
