class_name JaewoonAnimationController
extends Node

## 파일명: godot-games/bug-defense/animation-controller.gd
## 역할: 곤충 디펜스의 실제 AnimatedSprite2D 상태/속도/방향 제어

@export var sprite: AnimatedSprite2D
@export var default_state := "idle"

func _ready() -> void:
	if sprite == null:
		sprite = get_parent() as AnimatedSprite2D
	play_state(default_state)

func play_state(state: String, restart: bool = false) -> bool:
	if sprite == null or sprite.sprite_frames == null:
		return false
	if not sprite.sprite_frames.has_animation(state):
		return false
	if restart:
		sprite.frame = 0
	sprite.play(state)
	return true

func set_speed(scale: float) -> void:
	if sprite != null:
		sprite.speed_scale = maxf(0.05, scale)

func set_flip(horizontal: bool) -> void:
	if sprite != null:
		sprite.flip_h = horizontal
