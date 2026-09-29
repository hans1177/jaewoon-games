class_name JaewoonAnimationController
extends Node

## 파일명: godot-games/animation-controller.gd
## 역할: 실제 AnimatedSprite2D의 상태/프레임/모션 전환을 공통 관리
## 규칙: 그래픽 리소스만 교체해도 게임 로직을 수정하지 않도록 분리

@export var sprite: AnimatedSprite2D
@export var default_state := "idle"

var current_state := ""

func _ready() -> void:
	if sprite == null:
		sprite = get_parent() as AnimatedSprite2D
	play_state(default_state)

func play_state(state: String, restart: bool = false) -> bool:
	var next := state.strip_edges()
	if next == "" or sprite == null or sprite.sprite_frames == null:
		return false
	if not sprite.sprite_frames.has_animation(next):
		return false
	current_state = next
	sprite.play(next)
	if restart:
		sprite.frame = 0
	return true

func set_flip(horizontal: bool) -> void:
	if sprite != null:
		sprite.flip_h = horizontal

func set_speed(scale: float) -> void:
	if sprite != null:
		sprite.speed_scale = maxf(0.01, scale)

func stop() -> void:
	if sprite != null:
		sprite.stop()

func is_playing() -> bool:
	return sprite != null and sprite.is_playing()
