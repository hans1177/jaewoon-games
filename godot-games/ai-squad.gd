# 파일명: godot-games/ai-squad.gd
# 역할: Godot 게임에서 여러 AI 동료와 인간 플레이어가 섞인 파티의 공통 명령/협동 상태 관리
# 규칙: AI는 판단만 담당하고 실제 이동·공격·피해·보상은 각 게임이 최종 권한을 가짐

class_name JaewoonAISquad
extends RefCounted

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

func add_member(member_id: String, ai: JaewoonCommonAI, role: JaewoonCommonAI.Role = JaewoonCommonAI.Role.MELEE, is_human: bool = false) -> void:
	if member_id.is_empty():
		push_error("AI squad member_id is required")
		return
	members[member_id] = {
		"id": member_id,
		"ai": ai,
		"role": role,
		"is_human": is_human,
	}

func remove_member(member_id: String) -> void:
	members.erase(member_id)

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
	}

func _find_member(items: Array, target_id: String) -> Dictionary:
	for item in items:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("id", "")) == target_id:
			return item
	return {}
