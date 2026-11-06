class_name JaewoonSaveRuntime
extends Node

## 파일명: godot-games/bug-defense/save-runtime.gd
## 역할: 곤충 디펜스 자동 저장/복구
## 규칙: 게임 진행이 저장 실패 때문에 멈추지 않으며 게임별 키/버전은 고정

@export var save_key := "bug-defense"
@export var save_version := 1
@export var autosave_interval := 8.0

var _pending_state: Dictionary = {}
var _elapsed := 0.0

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
	var payload := {"version": maxi(1, save_version), "game_id": save_key, "saved_at": Time.get_unix_time_from_system(), "data": state.duplicate(true)}
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
	return DirAccess.rename_absolute(temp_path, path) == OK

func load_state(fallback: Dictionary = {}) -> Dictionary:
	var path := _path()
	if not FileAccess.file_exists(path):
		return fallback.duplicate(true)
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return fallback.duplicate(true)
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed) != TYPE_DICTIONARY or String(parsed.get("game_id", "")) != save_key:
		return fallback.duplicate(true)
	if int(parsed.get("version", 1)) > save_version:
		return fallback.duplicate(true)
	var data = parsed.get("data", fallback)
	return data.duplicate(true) if typeof(data) == TYPE_DICTIONARY else fallback.duplicate(true)

func _path() -> String:
	return "user://jaewoon_%s.save" % save_key.replace("/", "_").replace("\\", "_")
