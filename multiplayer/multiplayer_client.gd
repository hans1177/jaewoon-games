class_name JaewoonMultiplayerClient
extends Node

signal authenticated(user: Dictionary)
signal authentication_failed(error: Dictionary)
signal match_found(result: Dictionary)
signal friend_room_created(result: Dictionary)
signal friend_room_joined(result: Dictionary)
signal websocket_connected(room_id: String)
signal websocket_disconnected(code: int, reason: String)
signal player_joined(player: Dictionary)
signal player_left(player: Dictionary)
signal message_received(message: Dictionary)
signal rematch_ready(message: Dictionary)
signal request_failed(endpoint: String, error: Dictionary)

const DEFAULT_BASE_URL := "https://jaewoon-multiplayer.anyanguy12.workers.dev"
const RECONNECT_DELAY_MS := 1500

@export var base_url: String = DEFAULT_BASE_URL
@export var auto_reconnect := true

var access_token := ""
var refresh_token := ""
var current_user: Dictionary = {}
var current_room_id := ""
var current_mode := ""
var current_game_id := "default"

var _socket := WebSocketPeer.new()
var _last_socket_state := WebSocketPeer.STATE_CLOSED
var _manual_disconnect := false
var _reconnect_at_ms := 0

func _ready() -> void:
	set_process(true)

func _process(_delta: float) -> void:
	_poll_socket()
	if auto_reconnect and not _manual_disconnect and current_room_id != "" and access_token != "":
		if _socket.get_ready_state() == WebSocketPeer.STATE_CLOSED and _reconnect_at_ms > 0:
			if Time.get_ticks_msec() >= _reconnect_at_ms:
				_reconnect_at_ms = 0
				_connect_room_socket(current_room_id)

func signup(email: String, password: String, nickname: String) -> Dictionary:
	var result := await _request("/auth/signup", HTTPClient.METHOD_POST, {
		"email": email,
		"password": password,
		"nickname": nickname,
	}, false)
	if result.ok:
		_apply_auth_payload(result.data)
	else:
		authentication_failed.emit(result)
	return result

func login(email: String, password: String) -> Dictionary:
	var result := await _request("/auth/login", HTTPClient.METHOD_POST, {
		"email": email,
		"password": password,
	}, false)
	if result.ok:
		_apply_auth_payload(result.data)
		if access_token != "":
			await load_me()
	else:
		authentication_failed.emit(result)
	return result

func refresh_session() -> Dictionary:
	if refresh_token == "":
		return {"ok": false, "status": 0, "data": {"error": "missing_refresh_token"}}
	var result := await _request("/auth/refresh", HTTPClient.METHOD_POST, {
		"refresh_token": refresh_token,
	}, false)
	if result.ok:
		_apply_auth_payload(result.data)
	return result

func load_me() -> Dictionary:
	var result := await _request("/auth/me", HTTPClient.METHOD_GET, {}, true)
	if result.ok and result.data.has("user"):
		current_user = result.data.user
		authenticated.emit(current_user)
	return result

func logout() -> void:
	disconnect_room()
	access_token = ""
	refresh_token = ""
	current_user = {}
	current_mode = ""
	current_game_id = "default"

func match_coop(auto_connect_room := true) -> Dictionary:
	return await quick_match("coop", auto_connect_room, "default")

func match_coop_for_game(game_id: String, auto_connect_room := true) -> Dictionary:
	return await quick_match("coop", auto_connect_room, game_id)

func match_pvp(auto_connect_room := true) -> Dictionary:
	return await quick_match("pvp", auto_connect_room, "default")

func match_pvp_for_game(game_id: String, auto_connect_room := true) -> Dictionary:
	return await quick_match("pvp", auto_connect_room, game_id)

func quick_match(mode: String, auto_connect_room := true, game_id: String = "default") -> Dictionary:
	var normalized_game_id := _normalize_game_id(game_id)
	var result := await _request("/matchmake", HTTPClient.METHOD_POST, {"mode": mode, "gameId": normalized_game_id}, true)
	if result.ok:
		current_mode = mode
		current_game_id = normalized_game_id
		match_found.emit(result.data)
		if auto_connect_room and result.data.has("roomId"):
			connect_room(String(result.data.roomId))
	return result

func create_friend_room(mode: String = "coop", auto_connect_room := true) -> Dictionary:
	return await create_friend_room_for_game(mode, "default", auto_connect_room)

func create_friend_room_for_game(mode: String, game_id: String, auto_connect_room := true) -> Dictionary:
	var normalized_game_id := _normalize_game_id(game_id)
	var result := await _request("/friend/create", HTTPClient.METHOD_POST, {"mode": mode, "gameId": normalized_game_id}, true)
	if result.ok:
		current_mode = mode
		current_game_id = normalized_game_id
		friend_room_created.emit(result.data)
		if auto_connect_room and result.data.has("roomId"):
			connect_room(String(result.data.roomId))
	return result

func join_friend_room(invite_code: String, auto_connect_room := true) -> Dictionary:
	var result := await _request("/friend/join", HTTPClient.METHOD_POST, {
		"inviteCode": invite_code.strip_edges().to_upper(),
	}, true)
	if result.ok:
		if result.data.has("mode"):
			current_mode = String(result.data.mode)
		if result.data.has("gameId"):
			current_game_id = String(result.data.gameId)
		friend_room_joined.emit(result.data)
		if auto_connect_room and result.data.has("roomId"):
			connect_room(String(result.data.roomId))
	return result

func connect_room(room_id: String) -> Error:
	if access_token == "" or room_id == "":
		return ERR_INVALID_PARAMETER
	current_room_id = room_id
	_manual_disconnect = false
	_reconnect_at_ms = 0
	return _connect_room_socket(room_id)

func disconnect_room() -> void:
	_manual_disconnect = true
	_reconnect_at_ms = 0
	current_room_id = ""
	if _socket.get_ready_state() == WebSocketPeer.STATE_OPEN:
		_socket.send_text(JSON.stringify({"type": "leave"}))
		_socket.close(1000, "client_leave")

func send_state(state: Dictionary) -> Error:
	return send_message({"type": "state", "state": state})

func send_event(event: Dictionary) -> Error:
	var payload := event.duplicate(true)
	payload["type"] = "event"
	return send_message(payload)

func send_ready(extra: Dictionary = {}) -> Error:
	var payload := extra.duplicate(true)
	payload["type"] = "ready"
	return send_message(payload)

func request_rematch() -> Error:
	return send_message({"type": "rematch"})

func send_message(payload: Dictionary) -> Error:
	if _socket.get_ready_state() != WebSocketPeer.STATE_OPEN:
		return ERR_UNAVAILABLE
	return _socket.send_text(JSON.stringify(payload))

func is_room_connected() -> bool:
	return _socket.get_ready_state() == WebSocketPeer.STATE_OPEN

func _connect_room_socket(room_id: String) -> Error:
	_socket = WebSocketPeer.new()
	_last_socket_state = WebSocketPeer.STATE_CLOSED
	var ws_base := base_url.trim_suffix("/").replace("https://", "wss://").replace("http://", "ws://")
	var url := "%s/room/%s?token=%s" % [ws_base, room_id.uri_encode(), access_token.uri_encode()]
	var error := _socket.connect_to_url(url)
	if error != OK:
		_schedule_reconnect()
	return error

func _poll_socket() -> void:
	var state_before := _socket.get_ready_state()
	if state_before == WebSocketPeer.STATE_CONNECTING or state_before == WebSocketPeer.STATE_OPEN or state_before == WebSocketPeer.STATE_CLOSING:
		_socket.poll()
	var state := _socket.get_ready_state()

	if state == WebSocketPeer.STATE_OPEN:
		while _socket.get_available_packet_count() > 0:
			var text := _socket.get_packet().get_string_from_utf8()
			_handle_socket_message(text)

	if state != _last_socket_state:
		if state == WebSocketPeer.STATE_OPEN:
			_reconnect_at_ms = 0
		elif state == WebSocketPeer.STATE_CLOSED and _last_socket_state != WebSocketPeer.STATE_CLOSED:
			var code := _socket.get_close_code()
			var reason := _socket.get_close_reason()
			websocket_disconnected.emit(code, reason)
			if not _manual_disconnect:
				_schedule_reconnect()
		_last_socket_state = state

func _handle_socket_message(text: String) -> void:
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var message: Dictionary = parsed
	var type := String(message.get("type", ""))
	if type == "connected":
		websocket_connected.emit(String(message.get("roomId", current_room_id)))
	elif type == "presence":
		var player := {
			"userId": message.get("userId", ""),
			"nickname": message.get("nickname", "player"),
			"players": message.get("players", []),
		}
		if message.get("action", "") == "join":
			player_joined.emit(player)
		elif message.get("action", "") == "leave":
			player_left.emit(player)
	elif type == "rematch_ready":
		rematch_ready.emit(message)
	message_received.emit(message)

func _normalize_game_id(game_id: String) -> String:
	var normalized := game_id.strip_edges().to_lower()
	if normalized == "":
		return "default"
	var regex := RegEx.new()
	regex.compile("^[a-z0-9][a-z0-9-]{0,49}$")
	return normalized if regex.search(normalized) else "default"

func _schedule_reconnect() -> void:
	if auto_reconnect and not _manual_disconnect and current_room_id != "" and access_token != "":
		_reconnect_at_ms = Time.get_ticks_msec() + RECONNECT_DELAY_MS

func _apply_auth_payload(data: Dictionary) -> void:
	if data.has("access_token"):
		access_token = String(data.access_token)
	if data.has("refresh_token"):
		refresh_token = String(data.refresh_token)
	if data.has("user") and typeof(data.user) == TYPE_DICTIONARY:
		current_user = data.user
		authenticated.emit(current_user)

func _request(endpoint: String, method: int, payload: Dictionary, with_auth: bool) -> Dictionary:
	if with_auth and access_token == "":
		var missing := {"ok": false, "status": 401, "data": {"error": "missing_access_token"}}
		request_failed.emit(endpoint, missing)
		return missing

	var http := HTTPRequest.new()
	add_child(http)
	var headers := PackedStringArray(["Content-Type: application/json"])
	if with_auth:
		headers.append("Authorization: Bearer %s" % access_token)
	var body := ""
	if method != HTTPClient.METHOD_GET:
		body = JSON.stringify(payload)
	var request_error := http.request(base_url.trim_suffix("/") + endpoint, headers, method, body)
	if request_error != OK:
		http.queue_free()
		var failed := {"ok": false, "status": 0, "data": {"error": "request_start_failed", "code": request_error}}
		request_failed.emit(endpoint, failed)
		return failed

	var completed = await http.request_completed
	http.queue_free()
	var response_code: int = completed[1]
	var response_body: PackedByteArray = completed[3]
	var text := response_body.get_string_from_utf8()
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		data = {"raw": text}
	var result := {
		"ok": response_code >= 200 and response_code < 300,
		"status": response_code,
		"data": data,
	}
	if not result.ok:
		request_failed.emit(endpoint, result)
	return result
