class_name JaewoonSaveRuntime
extends Node

## 파일명: godot-games/save-runtime.gd
## 역할: Godot 게임의 안전한 자동 저장/복구 런타임
## 규칙: 게임별 save_key/version은 각 게임이 소유하며 저장 실패가 플레이를 막지 않음

@export var save_key := "game"
@export var save_version := 1
@export var autosave_interval := 8.0

var _pending_state: Dictionary = {}
var _elapsed := 0.0

func _ready() -> void:
	set_process(true)
	get_tree().set_auto_accept_quit(false)

func _process(delta: float) -> void:
	_elapsed += maxf(0.0, delta)
	if _elapsed >= maxf(1.0, autosave_interval):
		_elapsed = 0.0
		flush()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST:
		flush()

func queue_state(state: Dictionary) -> void:
	_pending_state = state.duplicate(true)

func flush() -> bool:
	if _pending_state.is_empty():
		return false
	return save_state(_pending_state)

func save_state(state: Dictionary) -> bool:
	var payload := {
		"version": maxi(1, save_version),
		"game_id": save_key,
		"saved_at": Time.get_unix_time_from_system(),
		"data": state.duplicate(true),
	}
	var path := _path()
	var temp_path := path + ".tmp"
	var file := FileAccess.open(temp_path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(payload))
	file.flush()
	file.close()
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)
	var renamed := DirAccess.rename_absolute(temp_path, path)
	return renamed == OK

func load_state(fallback: Dictionary = {}) -> Dictionary:
	var path := _path()
	if not FileAccess.file_exists(path):
		return fallback.duplicate(true)
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return fallback.duplicate(true)
	var text := file.get_as_text()
	file.close()
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return fallback.duplicate(true)
	if String(parsed.get("game_id", "")) != save_key:
		return fallback.duplicate(true)
	var version := int(parsed.get("version", 1))
	if version > save_version:
		return fallback.duplicate(true)
	var data = parsed.get("data", fallback)
	return data.duplicate(true) if typeof(data) == TYPE_DICTIONARY else fallback.duplicate(true)

func delete_save() -> bool:
	var path := _path()
	if not FileAccess.file_exists(path):
		return true
	return DirAccess.remove_absolute(path) == OK

func _path() -> String:
	var clean_key := save_key.strip_edges().to_lower().replace("/", "_").replace("\\", "_")
	return "user://jaewoon_%s.save" % clean_key
