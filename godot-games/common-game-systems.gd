class_name JaewoonCommonGameSystems
extends RefCounted

## Godot용 경량 공통 시스템 툴킷.
## 실제 게임 규칙/밸런스/저장 키는 각 게임이 소유하고 이 클래스는 재사용 가능한 상태 처리만 제공합니다.

static func create_inventory(capacity: int = 40) -> Dictionary:
	return {"capacity": maxi(1, capacity), "items": [], "equipment": {}, "currencies": {}}

static func add_item(inventory: Dictionary, item: Dictionary) -> bool:
	var items: Array = inventory.get("items", [])
	if items.size() >= int(inventory.get("capacity", 40)):
		return false
	var entry := item.duplicate(true)
	entry["id"] = String(entry.get("id", "")).strip_edges()
	if entry["id"] == "":
		return false
	entry["quantity"] = maxi(1, int(entry.get("quantity", 1)))
	items.append(entry)
	inventory["items"] = items
	return true

static func remove_item(inventory: Dictionary, item_id: String, quantity: int = 1) -> bool:
	var needed := maxi(1, quantity)
	var items: Array = inventory.get("items", [])
	var total := 0
	for item in items:
		if typeof(item) == TYPE_DICTIONARY and String(item.get("id", "")) == item_id:
			total += int(item.get("quantity", 1))
	if total < needed:
		return false
	for i in range(items.size() - 1, -1, -1):
		if needed <= 0:
			break
		var item: Dictionary = items[i]
		if String(item.get("id", "")) != item_id:
			continue
		var amount := mini(int(item.get("quantity", 1)), needed)
		item["quantity"] = int(item.get("quantity", 1)) - amount
		needed -= amount
		if int(item["quantity"]) <= 0:
			items.remove_at(i)
	inventory["items"] = items
	return true

static func change_currency(inventory: Dictionary, key: String, delta: int) -> int:
	var currencies: Dictionary = inventory.get("currencies", {})
	currencies[key] = maxi(0, int(currencies.get(key, 0)) + delta)
	inventory["currencies"] = currencies
	return int(currencies[key])

static func create_quest_state() -> Dictionary:
	return {"quests": {}, "flags": {}, "npc": {}}

static func start_quest(state: Dictionary, definition: Dictionary) -> bool:
	var id := String(definition.get("id", "")).strip_edges()
	if id == "":
		return false
	var quests: Dictionary = state.get("quests", {})
	quests[id] = {
		"id": id,
		"title": String(definition.get("title", id)),
		"status": "active",
		"objectives": definition.get("objectives", []).duplicate(true),
		"rewards": definition.get("rewards", []).duplicate(true),
	}
	state["quests"] = quests
	return true

static func set_flag(state: Dictionary, key: String, value: Variant = true) -> void:
	var flags: Dictionary = state.get("flags", {})
	flags[key] = value
	state["flags"] = flags

static func create_skill_state() -> Dictionary:
	return {"resources": {}, "cooldowns": {}, "effects": []}

static func set_resource(state: Dictionary, key: String, current: float, maximum: float) -> Dictionary:
	var resources: Dictionary = state.get("resources", {})
	var safe_max := maxf(0.0, maximum)
	resources[key] = {"current": clampf(current, 0.0, safe_max), "max": safe_max}
	state["resources"] = resources
	return resources[key]

static func can_use_skill(state: Dictionary, skill: Dictionary) -> bool:
	var id := String(skill.get("id", ""))
	if id == "":
		return false
	var cooldowns: Dictionary = state.get("cooldowns", {})
	if float(cooldowns.get(id, 0.0)) > 0.0:
		return false
	var resources: Dictionary = state.get("resources", {})
	var costs: Dictionary = skill.get("costs", {})
	for key in costs:
		var resource: Dictionary = resources.get(key, {})
		if float(resource.get("current", 0.0)) < float(costs[key]):
			return false
	return true

static func tick_skills(state: Dictionary, delta: float) -> void:
	var cooldowns: Dictionary = state.get("cooldowns", {})
	for key in cooldowns:
		cooldowns[key] = maxf(0.0, float(cooldowns[key]) - maxf(0.0, delta))
	state["cooldowns"] = cooldowns
	var effects: Array = state.get("effects", [])
	for i in range(effects.size() - 1, -1, -1):
		var effect: Dictionary = effects[i]
		effect["remaining"] = maxf(0.0, float(effect.get("remaining", 0.0)) - maxf(0.0, delta))
		if float(effect["remaining"]) <= 0.0:
			effects.remove_at(i)
	state["effects"] = effects

static func roll_loot(table: Array, rng: RandomNumberGenerator) -> Array:
	var results: Array = []
	for item in table:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var entry: Dictionary = item
		var chance := clampf(float(entry.get("chance", 1.0)), 0.0, 1.0)
		if rng.randf() > chance:
			continue
		var minimum := maxi(0, int(entry.get("min", entry.get("quantity", 1))))
		var maximum := maxi(minimum, int(entry.get("max", minimum)))
		results.append({"id": String(entry.get("id", "")), "quantity": rng.randi_range(minimum, maximum)})
	return results

static func wrap_save(game_id: String, version: int, data: Dictionary) -> Dictionary:
	return {"version": maxi(1, version), "game_id": game_id, "data": data.duplicate(true)}

static func migrate_save(payload: Dictionary, current_version: int, migrations: Dictionary) -> Dictionary:
	var working := payload.duplicate(true)
	var version := maxi(1, int(working.get("version", 1)))
	if version > current_version:
		push_error("Save version is newer than supported")
		return {}
	while version < current_version:
		if not migrations.has(version):
			push_error("Missing save migration %d -> %d" % [version, version + 1])
			return {}
		var callback: Callable = migrations[version]
		working = callback.call(working)
		version += 1
		working["version"] = version
	return working
