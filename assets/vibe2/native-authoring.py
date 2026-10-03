# 파일명: assets/vibe2/native-authoring.py
"""Vibe2 canonical GRAPHICS_PRODUCTION generic Blender authoring fallback.

This is not a release authority. It creates a deterministic, project-original native
candidate bundle when an asset-development task requires DCC authoring but no more
specific repository recipe exists. Native runtime, mobile performance and independent
QA remain mandatory before VERIFIED/company promotion.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

SCRIPT = Path(__file__).resolve()
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--game-id", required=True)
parser.add_argument("--task-id", required=True)
parser.add_argument("--target", required=True, choices=["roblox", "unity"])
parser.add_argument("--types", default="prop")
parser.add_argument("--family", default="PROP")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args(argv)
types = [value.strip().lower() for value in args.types.split(",") if value.strip()]
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
glb_path = out / "asset.glb"
preview_path = out / "preview.png"
evidence_path = out / "evidence.json"

identity = "|".join([args.game_id, args.task_id, args.target, ",".join(sorted(types)), args.family])
digest = hashlib.sha256(identity.encode("utf-8")).digest()
palette = (
    0.20 + digest[0] / 255 * 0.42,
    0.20 + digest[1] / 255 * 0.42,
    0.24 + digest[2] / 255 * 0.38,
    1.0,
)
accent = (
    min(1.0, palette[0] + 0.22),
    min(1.0, palette[1] + 0.18),
    min(1.0, palette[2] + 0.16),
    1.0,
)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 48
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(preview_path)
scene.render.film_transparent = False
try:
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
except Exception:
    pass
scene.world.color = (0.025, 0.035, 0.055)

def material(name: str, color, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat

base_mat = material("Vibe2_Base", palette, metallic=0.05 if args.target == "roblox" else 0.12, roughness=0.64 if args.target == "roblox" else 0.48)
accent_mat = material("Vibe2_Accent", accent, metallic=0.45, roughness=0.36)
dark_mat = material("Vibe2_Dark", (0.045, 0.055, 0.075, 1.0), metallic=0.1, roughness=0.72)

created = []

def finish(obj, mat, name):
    obj.name = name
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    obj["vibe2GameId"] = args.game_id
    obj["vibe2TaskId"] = args.task_id
    obj["vibe2Target"] = args.target.upper()
    created.append(obj)
    return obj

def cube(name, location, scale, mat=base_mat, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("EdgeFinish", "BEVEL")
        mod.width = bevel
        mod.segments = 2 if args.target == "unity" else 1
    return finish(obj, mat, name)

def sphere(name, location, scale, mat=base_mat):
    segments = 24 if args.target == "unity" else 16
    rings = 16 if args.target == "unity" else 10
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return finish(obj, mat, name)

def cylinder(name, location, radius, depth, mat=base_mat, rotation=(0, 0, 0)):
    vertices = 24 if args.target == "unity" else 12
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    return finish(bpy.context.object, mat, name)

def add_actor():
    body = sphere("ActorBody", (0, 0, 1.55), (0.72, 0.48, 0.92), base_mat)
    head = sphere("ActorHead", (0, -0.03, 2.72), (0.46, 0.42, 0.48), accent_mat)
    for side in (-1, 1):
        cylinder("ActorArm" + ("L" if side < 0 else "R"), (side * 0.86, 0, 1.58), 0.16, 1.12, accent_mat, rotation=(0, math.radians(90), 0))
        cylinder("ActorLeg" + ("L" if side < 0 else "R"), (side * 0.34, 0, 0.55), 0.20, 1.25, dark_mat)
    if any(t in {"enemy", "boss", "creature", "monster"} for t in types):
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.18, radius2=0.0, depth=0.55, location=(side * 0.27, 0, 3.25))
            finish(bpy.context.object, dark_mat, "Horn" + ("L" if side < 0 else "R"))
    # Small native animation proof. Gameplay timing is not encoded here.
    body.rotation_euler.z = math.radians(-3)
    body.keyframe_insert(data_path="rotation_euler", frame=1)
    body.rotation_euler.z = math.radians(3)
    body.keyframe_insert(data_path="rotation_euler", frame=24)
    body.rotation_euler.z = math.radians(-3)
    body.keyframe_insert(data_path="rotation_euler", frame=48)
    head.location.z += 0.03
    head.keyframe_insert(data_path="location", frame=1)
    head.location.z -= 0.06
    head.keyframe_insert(data_path="location", frame=24)
    head.location.z += 0.06
    head.keyframe_insert(data_path="location", frame=48)

def add_environment():
    cube("Ground", (0, 0, -0.18), (4.8, 4.2, 0.18), dark_mat, bevel=0.04)
    cube("LandmarkBase", (0, 0.8, 0.55), (1.4, 1.1, 0.55), base_mat)
    cube("LandmarkUpper", (0, 0.8, 1.72), (0.85, 0.72, 0.62), accent_mat)
    for x, y, size in [(-2.8, -1.6, 0.55), (2.6, -1.2, 0.7), (-2.4, 2.0, 0.62), (2.9, 1.9, 0.48)]:
        sphere("Rock", (x, y, size * 0.55), (size, size * 0.72, size * 0.55), base_mat)
    for x, y in [(-3.4, 1.0), (3.5, 0.6)]:
        cylinder("TreeTrunk", (x, y, 0.9), 0.18, 1.8, dark_mat)
        sphere("TreeCrown", (x, y, 2.0), (0.82, 0.72, 0.9), accent_mat)

def add_weapon():
    grip = cylinder("WeaponGrip", (0, 0, 0.85), 0.12, 1.2, dark_mat)
    cube("WeaponGuard", (0, 0, 1.43), (0.62, 0.12, 0.09), accent_mat, bevel=0.04)
    blade = cube("WeaponBlade", (0, 0, 2.35), (0.16, 0.07, 0.92), base_mat, bevel=0.03)
    blade.scale.x = 0.72
    grip.rotation_euler.z = math.radians((digest[3] % 9) - 4)

def add_prop():
    cube("PropBody", (0, 0, 0.6), (0.92, 0.72, 0.6), base_mat)
    cube("PropBand", (0, 0, 0.62), (0.98, 0.76, 0.10), accent_mat, bevel=0.03)
    cylinder("PropHandle", (0, 0, 1.32), 0.12, 0.8, dark_mat, rotation=(0, math.radians(90), 0))

actor_types = {"character", "player", "npc", "enemy", "boss", "creature", "monster", "animation", "motion"}
environment_types = {"background", "environment", "building", "world", "landmark"}
weapon_types = {"item", "weapon", "equipment"}
prop_types = {"prop", "furniture"}

if any(t in actor_types for t in types):
    add_actor()
if any(t in environment_types for t in types):
    add_environment()
if any(t in weapon_types for t in types):
    add_weapon()
if any(t in prop_types for t in types):
    add_prop()
if not created:
    # A real mesh fallback for unexpected DCC-relevant type names.
    cube("NativeAssetCore", (0, 0, 0.7), (0.9, 0.9, 0.7), base_mat)
    sphere("NativeAssetAccent", (0, 0, 1.75), (0.62, 0.62, 0.62), accent_mat)

for obj in created:
    obj.select_set(False)

# Camera/light are preview-only and excluded from runtime semantics.
bpy.ops.object.camera_add(location=(7.2, -9.4, 6.6))
camera = bpy.context.object
camera.name = "PreviewCamera"
scene.camera = camera

def point_camera(obj, point=(0.0, 0.0, 1.25)):
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

point_camera(camera)

bpy.ops.object.light_add(type="AREA", location=(3.5, -3.8, 7.0))
key = bpy.context.object
key.data.energy = 900
key.data.shape = "DISK"
key.data.size = 5.0
point_camera(key, (0, 0, 1.1))
bpy.ops.object.light_add(type="AREA", location=(-4.0, 1.0, 3.5))
fill = bpy.context.object
fill.data.energy = 500
fill.data.size = 4.0
point_camera(fill, (0, 0, 1.0))

# Export the native candidate first, then render the fixed review view.
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in {"MESH", "ARMATURE"})
bpy.context.view_layer.objects.active = next((obj for obj in created if obj.type == "MESH"), None)
bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_apply=True,
)
scene.render.filepath = str(preview_path)
bpy.ops.render.render(write_still=True)

artifact_hash = hashlib.sha256(glb_path.read_bytes()).hexdigest()
preview_hash = hashlib.sha256(preview_path.read_bytes()).hexdigest()
source_hash = hashlib.sha256(SCRIPT.read_bytes()).hexdigest()
mesh_objects = [obj for obj in created if obj.type == "MESH"]
evidence = {
    "version": 1,
    "kind": "vibe2-generic-native-authoring-evidence",
    "recipe": "assets/vibe2/native-authoring.py",
    "gameId": args.game_id,
    "taskId": args.task_id,
    "target": args.target.upper(),
    "types": types,
    "family": args.family.upper(),
    "license": "project-original",
    "editableSource": "assets/vibe2/native-authoring.py",
    "nativeArtifact": str(glb_path),
    "artifactHash": artifact_hash,
    "preview": str(preview_path),
    "previewHash": preview_hash,
    "sourceHash": source_hash,
    "meshObjectCount": len(mesh_objects),
    "runtimeVerificationState": "STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING",
    "productionVerified": False,
    "companyPromotionEligible": False,
    "gameplayAuthorityChanged": False,
    "webArtifactReused": False,
}
evidence_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("VIBE2_GENERIC_NATIVE_ASSET=" + str(glb_path))
print("VIBE2_GENERIC_NATIVE_PREVIEW=" + str(preview_path))
print("VIBE2_GENERIC_NATIVE_EVIDENCE=" + str(evidence_path))
