class_name JaewoonGeminiAI
extends Node

## Gemini는 대화/전략 같은 고수준 판단만 보조합니다.
## 이동, 공격, 데미지, 보상, 저장 등 실제 게임 규칙은 이 클래스가 변경하지 않습니다.
## API 실패/한도초과/오프라인 시 항상 로컬 fallback을 반환합니다.

signal response_received(result: Dictionary)
signal fallback_used(reason: String, result: Dictionary)

@export var endpoint := "https://jaewoon-games.pages.dev/api/ai/gemini"
@export var request_cooldown_ms := 2500
@export var cache_ttl_ms := 60000

var _last_request_ms := 0
var _cache: Dictionary = {}

func ask_dialogue(
	character_id: String,
	personality: String,
	game_context: String,
	player_text: String,
	fallback_speech: String = "..."
) -> Dictionary:
	var fallback := {
		"ok": false,
		"fallback": true,
		"speech": fallback_speech,
		"mood": "neutral",
		"intent": "talk",
	}
	var payload := {
		"purpose": "dialogue",
		"system": "Character ID: %s\nPersonality: %s" % [character_id.left(80), personality.left(800)],
		"context": game_context.left(5000),
		"user_text": player_text.left(2000),
	}
	var cache_key := "dialogue|%s|%s|%s" % [character_id, game_context, player_text]
	return await _ask(payload, cache_key, fallback)

func ask_strategy(
	actor_id: String,
	role: String,
	game_context: String,
	allowed_actions: Array[String],
	fallback_action: String = "follow"
) -> Dictionary:
	var safe_action := fallback_action if allowed_actions.has(fallback_action) else (allowed_actions[0] if not allowed_actions.is_empty() else "follow")
	var fallback := {
		"ok": false,
		"fallback": true,
		"action": safe_action,
		"reason": "local_fallback",
		"speech": "",
	}
	var payload := {
		"purpose": "strategy",
		"system": "Actor ID: %s\nRole: %s\nAllowed actions: %s\nChoose ONLY one action from that list." % [actor_id.left(80), role.left(80), JSON.stringify(allowed_actions)],
		"context": game_context.left(5000),
		"user_text": "Choose the best high-level action.",
	}
	var result := await _ask(payload, "", fallback)
	if bool(result.get("fallback", false)):
		return result
	if not allowed_actions.has(String(result.get("action", ""))):
		return _use_fallback("invalid_strategy_action", fallback)
	return result

func clear_cache() -> void:
	_cache.clear()

func _ask(payload: Dictionary, cache_key: String, fallback: Dictionary) -> Dictionary:
	if cache_key != "":
		var cached := _get_cache(cache_key)
		if not cached.is_empty():
			return cached

	var now := Time.get_ticks_msec()
	if now - _last_request_ms < request_cooldown_ms:
		return _use_fallback("cooldown", fallback)
	_last_request_ms = now

	var http := HTTPRequest.new()
	add_child(http)
	var headers := PackedStringArray(["Content-Type: application/json"])
	var start_error := http.request(endpoint, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	if start_error != OK:
		http.queue_free()
		return _use_fallback("request_start_failed", fallback)

	var completed = await http.request_completed
	http.queue_free()
	var transport_result: int = completed[0]
	var response_code: int = completed[1]
	var body: PackedByteArray = completed[3]
	if transport_result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		return _use_fallback("http_%s" % response_code, fallback)

	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY or not bool(parsed.get("ok", false)):
		return _use_fallback("invalid_response", fallback)
	var model_result = parsed.get("result", {})
	if typeof(model_result) != TYPE_DICTIONARY:
		return _use_fallback("invalid_result", fallback)

	var result: Dictionary = model_result.duplicate(true)
	result["ok"] = true
	result["fallback"] = false
	result["model"] = parsed.get("model", "")
	if cache_key != "":
		_cache[cache_key] = {"expires": Time.get_ticks_msec() + cache_ttl_ms, "result": result.duplicate(true)}
	response_received.emit(result)
	return result

func _get_cache(key: String) -> Dictionary:
	if not _cache.has(key):
		return {}
	var item: Dictionary = _cache[key]
	if Time.get_ticks_msec() >= int(item.get("expires", 0)):
		_cache.erase(key)
		return {}
	var result = item.get("result", {})
	return result.duplicate(true) if typeof(result) == TYPE_DICTIONARY else {}

func _use_fallback(reason: String, fallback: Dictionary) -> Dictionary:
	var result := fallback.duplicate(true)
	result["fallback_reason"] = reason
	fallback_used.emit(reason, result)
	return result
