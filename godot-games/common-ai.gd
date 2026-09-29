class_name JaewoonCommonAI
extends RefCounted

## 재운게임즈 공통 AI 판단 코어.
## 이동/물리/데미지 수치는 각 게임이 소유하고, 이 클래스는 "무엇을 할지"만 결정합니다.
## 그래서 2D/3D, 협동 동료, 펫, 소환수, NPC에 같은 판단 규칙을 재사용할 수 있습니다.

enum State {
	IDLE,
	FOLLOW,
	SEARCH,
	ATTACK,
	DODGE,
	HEAL,
	RETREAT,
	GUARD,
	REVIVE,
	INTERACT,
	PATROL,
}

enum Role {
	TANK,
	MELEE,
	RANGED,
	HEALER,
	SUPPORT,
}

enum Order {
	AUTO,
	FOLLOW,
	HOLD,
	ATTACK,
	RETREAT,
	FOCUS,
	PROTECT,
}

const DEFAULTS := {
	"retreat_hp_ratio": 0.30,
	"heal_hp_ratio": 0.40,
	"follow_distance": 7.0,
	"attack_distance": 3.0,
	"ranged_attack_distance": 10.0,
	"danger_threshold": 0.75,
}

var role: Role = Role.MELEE
var order: Order = Order.AUTO
var config: Dictionary = DEFAULTS.duplicate(true)
var focus_target_id := ""
var protect_target_id := ""

func _init(initial_role: Role = Role.MELEE, overrides: Dictionary = {}) -> void:
	role = initial_role
	for key in overrides:
		config[key] = overrides[key]

func set_role(value: Role) -> void:
	role = value

func set_order(value: Order, target_id: String = "") -> void:
	order = value
	if value == Order.FOCUS:
		focus_target_id = target_id
	elif value == Order.PROTECT:
		protect_target_id = target_id

func clear_order() -> void:
	order = Order.AUTO
	focus_target_id = ""
	protect_target_id = ""

## context 권장 키:
## entity_kind: "companion" | "npc"
## hp_ratio: 0.0~1.0
## danger: 0.0~1.0
## owner_distance: float
## can_heal: bool
## can_revive: bool
## enemies: [{id, distance, hp_ratio, threat}]
## allies: [{id, distance, hp_ratio, downed}]
## can_interact / patrol_ready: bool
## game_data: 게임별 추가 데이터(Dictionary)
func decide(context: Dictionary) -> Dictionary:
	var entity_kind := String(context.get("entity_kind", "companion"))
	if entity_kind == "npc":
		return _decide_npc(context)
	return _decide_companion(context)

func _decide_companion(context: Dictionary) -> Dictionary:
	var hp_ratio := clampf(float(context.get("hp_ratio", 1.0)), 0.0, 1.0)
	var danger := clampf(float(context.get("danger", 0.0)), 0.0, 1.0)
	var owner_distance := float(context.get("owner_distance", 0.0))
	var enemies: Array = context.get("enemies", [])
	var allies: Array = context.get("allies", [])

	# 플레이어의 직접 명령은 자동 판단보다 우선합니다.
	if order == Order.RETREAT:
		return _action(State.RETREAT, "order_retreat")
	if order == Order.HOLD:
		var hold_target := _choose_enemy(enemies)
		if not hold_target.is_empty() and _can_attack_target(hold_target):
			return _action(State.ATTACK, "hold_attack", hold_target)
		return _action(State.GUARD, "order_hold")
	if order == Order.FOLLOW:
		return _action(State.FOLLOW, "order_follow")
	if order == Order.FOCUS and focus_target_id != "":
		var focused := _find_by_id(enemies, focus_target_id)
		if not focused.is_empty():
			return _action(State.ATTACK, "focus_target", focused)
	if order == Order.PROTECT:
		return _protect_action(context, enemies)

	# 즉시 생존 판단.
	if danger >= float(config.danger_threshold):
		return _action(State.DODGE, "high_danger")
	if hp_ratio <= float(config.retreat_hp_ratio):
		return _action(State.RETREAT, "low_hp")

	# 힐러/지원형은 전투보다 구조와 회복을 먼저 봅니다.
	if role == Role.HEALER or role == Role.SUPPORT:
		if bool(context.get("can_revive", false)):
			var downed := _choose_downed_ally(allies)
			if not downed.is_empty():
				return _action(State.REVIVE, "ally_downed", downed)
		if bool(context.get("can_heal", false)):
			var wounded := _choose_wounded_ally(allies)
			if not wounded.is_empty() and float(wounded.get("hp_ratio", 1.0)) <= float(config.heal_hp_ratio):
				return _action(State.HEAL, "ally_low_hp", wounded)

	# 주인과 너무 멀어지면 전투보다 합류를 우선합니다.
	if owner_distance > float(config.follow_distance):
		return _action(State.FOLLOW, "owner_too_far")

	var target := _choose_enemy(enemies)
	if not target.is_empty():
		if order == Order.ATTACK or _can_attack_target(target):
			return _action(State.ATTACK, "enemy_in_range", target)
		return _action(State.SEARCH, "approach_enemy", target)

	if order == Order.ATTACK:
		return _action(State.SEARCH, "order_attack_no_target")
	return _action(State.FOLLOW, "no_enemy")

func _decide_npc(context: Dictionary) -> Dictionary:
	var danger := clampf(float(context.get("danger", 0.0)), 0.0, 1.0)
	var hostile := bool(context.get("hostile", false))
	var enemies: Array = context.get("enemies", [])

	if danger >= float(config.danger_threshold) and not hostile:
		return _action(State.RETREAT, "npc_danger")
	if hostile:
		var target := _choose_enemy(enemies)
		if not target.is_empty():
			return _action(State.ATTACK if _can_attack_target(target) else State.SEARCH, "npc_hostile", target)
	if bool(context.get("can_interact", false)):
		return _action(State.INTERACT, "player_nearby")
	if bool(context.get("patrol_ready", true)):
		return _action(State.PATROL, "npc_patrol")
	return _action(State.IDLE, "npc_idle")

func _protect_action(context: Dictionary, enemies: Array) -> Dictionary:
	if protect_target_id != "":
		var allies: Array = context.get("allies", [])
		var protected := _find_by_id(allies, protect_target_id)
		if not protected.is_empty() and bool(protected.get("downed", false)) and bool(context.get("can_revive", false)):
			return _action(State.REVIVE, "protect_revive", protected)
	var target := _choose_enemy(enemies)
	if not target.is_empty():
		return _action(State.ATTACK if _can_attack_target(target) else State.GUARD, "protect_target", target)
	return _action(State.GUARD, "protect_wait")

func _can_attack_target(target: Dictionary) -> bool:
	var distance := float(target.get("distance", INF))
	var range_limit := float(config.ranged_attack_distance if role == Role.RANGED else config.attack_distance)
	return distance <= range_limit

func _choose_enemy(enemies: Array) -> Dictionary:
	var best: Dictionary = {}
	var best_score := -INF
	for item in enemies:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var enemy: Dictionary = item
		var distance := maxf(float(enemy.get("distance", 99999.0)), 0.01)
		var threat := maxf(float(enemy.get("threat", 1.0)), 0.0)
		var hp_ratio := clampf(float(enemy.get("hp_ratio", 1.0)), 0.0, 1.0)
		var score := threat * 3.0 + (1.0 / distance) * 4.0 + (1.0 - hp_ratio)
		if role == Role.TANK:
			score += threat * 2.0
		elif role == Role.RANGED:
			score += minf(distance, float(config.ranged_attack_distance)) * 0.03
		if score > best_score:
			best_score = score
			best = enemy
	return best

func _choose_wounded_ally(allies: Array) -> Dictionary:
	var best: Dictionary = {}
	var lowest_hp := 2.0
	for item in allies:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var ally: Dictionary = item
		if bool(ally.get("downed", false)):
			continue
		var hp_ratio := clampf(float(ally.get("hp_ratio", 1.0)), 0.0, 1.0)
		if hp_ratio < lowest_hp:
			lowest_hp = hp_ratio
			best = ally
	return best

func _choose_downed_ally(allies: Array) -> Dictionary:
	var best: Dictionary = {}
	var nearest := INF
	for item in allies:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var ally: Dictionary = item
		if not bool(ally.get("downed", false)):
			continue
		var distance := float(ally.get("distance", INF))
		if distance < nearest:
			nearest = distance
			best = ally
	return best

func _find_by_id(items: Array, target_id: String) -> Dictionary:
	for item in items:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("id", "")) == target_id:
			return item
	return {}

func _action(state: State, reason: String, target: Dictionary = {}) -> Dictionary:
	return {
		"state": state,
		"state_name": State.keys()[state],
		"reason": reason,
		"target_id": String(target.get("id", "")),
		"target": target,
	}
