# 파일명: godot-games/ai-squad.gd
# 역할: Godot 게임에서 최대 4명의 인간+AI 혼합 파티를 관리하고 공통 명령/협동 상태를 공유
# 규칙: AI는 판단만 담당하며 실제 이동·공격·피해·보상은 게임이 최종 권한을 가짐

class_name JaewoonAISquad
extends RefCounted

const MAX_SLOTS := 4

var members: Dictionary = {}
var commander_id := ""
var shared_state := {
	"focus_target_id": "",
	"protect_target_id": "",
	"objective": "follow",
	"danger": 0.0,
}
var decision_interval := 0.35
var _elapsed := 0.0

func _init(initial_commander_id: String = "", interval: float = 0.35) -> void:
	commander_id = initial_commander_id
	decision_interval = maxf(0.1, interval)

func add_member(member_id: String, ai: JaewoonCommonAI, role: JaewoonCommonAI.Role = JaewoonCommonAI.Role.MELEE, is_human: bool = false) -> bool:
	if member_id.is_empty():
		push_error("AI squad member_id is required")
		return false
	if not members.has(member_id) and members.size() >= MAX_SLOTS:
		push_error("AI squad is full")
		return false
	members[member_id] = {
		"id": member_id,
		"ai": ai,
		"role": role,
		"is_human": is_human,
	}
	return true

func add_human(member_id: String, role: JaewoonCommonAI.Role = JaewoonCommonAI.Role.MELEE) -> bool:
	return add_member(member_id, null, role, true)

func add_ai(member_id: String, ai: JaewoonCommonAI, role: JaewoonCommonAI.Role = JaewoonCommonAI.Role.MELEE) -> bool:
	return add_member(member_id, ai, role, false)

func fill_empty_slots(factory: Callable, roles: Array = []) -> int:
	if not factory.is_valid():
		return 0
	var created := 0
	var role_list: Array = roles if not roles.is_empty() else [JaewoonCommonAI.Role.TANK, JaewoonCommonAI.Role.RANGED, JaewoonCommonAI.Role.HEALER, JaewoonCommonAI.Role.SUPPORT]
	var role_index := 0
	while members.size() < MAX_SLOTS:
		var role: JaewoonCommonAI.Role = role_list[role_index % role_list.size()]
		var id := "ai-%d" % (members.size() + 1)
		if members.has(id):
			role_index += 1
			continue
		var ai = factory.call(role)
		if ai == null:
			break
		if add_ai(id, ai, role):
			created += 1
		role_index += 1
	return created

func remove_member(member_id: String) -> void:
	members.erase(member_id)

func human_count() -> int:
	var count := 0
	for member in members.values():
		if bool(member.get("is_human", false)):
			count += 1
	return count

func ai_count() -> int:
	return members.size() - human_count()

func set_command(order: JaewoonCommonAI.Order, target_id: String = "") -> void:
	if order == JaewoonCommonAI.Order.FOCUS:
		shared_state.focus_target_id = target_id
	elif order == JaewoonCommonAI.Order.PROTECT:
		shared_state.protect_target_id = target_id
	for member in members.values():
		var ai: JaewoonCommonAI = member.ai
		if ai != null and not bool(member.is_human):
			ai.set_order(order, target_id)

func set_objective(objective: String, target_id: String = "") -> void:
	shared_state.objective = objective if not objective.is_empty() else "follow"
	if not target_id.is_empty():
		shared_state.focus_target_id = target_id

func set_danger(value: float) -> void:
	shared_state.danger = clampf(value, 0.0, 1.0)

func decide(delta: float, context: Dictionary = {}) -> Array:
	_elapsed += maxf(delta, 0.0)
	if _elapsed < decision_interval:
		return []
	_elapsed = 0.0

	var all_members: Array = context.get("members", [])
	var results: Array = []
	for member_id in members.keys():
		var member: Dictionary = members[member_id]
		if bool(member.is_human):
			continue
		var ai: JaewoonCommonAI = member.ai
		if ai == null:
			continue
		var own: Dictionary = _find_member(all_members, member_id)
		var allies: Array = []
		for item in all_members:
			if typeof(item) == TYPE_DICTIONARY and String(item.get("id", "")) != member_id:
				allies.append(item)
		var decision_context := context.duplicate(true)
		decision_context["members"] = all_members
		decision_context["allies"] = allies
		decision_context["shared"] = shared_state.duplicate(true)
		for key in own.keys():
			decision_context[key] = own[key]
		results.append({
			"id": member_id,
			"role": member.role,
			"decision": ai.decide(decision_context),
		})
	return results

func snapshot() -> Dictionary:
	var result: Array = []
	for member in members.values():
		result.append({
			"id": member.id,
			"role": member.role,
			"is_human": member.is_human,
		})
	return {
		"commander_id": commander_id,
		"decision_interval": decision_interval,
		"shared": shared_state.duplicate(true),
		"members": result,
		"human_count": human_count(),
		"ai_count": ai_count(),
	}

func _find_member(items: Array, target_id: String) -> Dictionary:
	for item in items:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("id", "")) == target_id:
			return item
	return {}
