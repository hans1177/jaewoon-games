#!/usr/bin/env python3
"""Run inside Blender with a source .blend and destination .glb.
Exports the existing licensed house geometry and packed textures unmodified.
Does not manufacture replacement meshes or alter the source file.
"""
import pathlib
import sys

import bpy

argv = sys.argv
if "--" not in argv or len(argv[argv.index("--") + 1:]) != 2:
    raise SystemExit("BLENDER_HOUSE_SOURCE_AND_DESTINATION_REQUIRED")
source, destination = [pathlib.Path(p).resolve() for p in argv[argv.index("--") + 1:]]
if not source.is_file() or source.open("rb").read(7) != b"BLENDER":
    raise SystemExit("ORIGINAL_BLENDER_HOUSE_SOURCE_INVALID")
if destination.suffix.lower() != ".glb":
    raise SystemExit("GLB_DESTINATION_REQUIRED")
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise SystemExit("ORIGINAL_CC0_HOUSE_HAS_NO_MESHES")
missing = []
for image in bpy.data.images:
    if image.source != "FILE" or image.packed_file:
        continue
    if not pathlib.Path(bpy.path.abspath(image.filepath)).is_file():
        missing.append(image.filepath)
if missing:
    raise SystemExit("ORIGINAL_BLENDER_TEXTURES_MISSING:" + ",".join(missing[:8]))
bpy.ops.object.select_all(action="DESELECT")
for mesh in meshes:
    mesh.hide_set(False)
    mesh.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(
    filepath=str(destination),
    export_format="GLB",
    use_selection=True,
    export_animations=False
)
if not destination.is_file() or destination.stat().st_size < 1000:
    raise SystemExit("ORIGINAL_CC0_HOUSE_GLTF_EXPORT_FAILED")
print("ORIGINAL_CC0_HOUSE_EXPORTED_MESH_COUNT", len(meshes))
print("ORIGINAL_CC0_HOUSE_GLTF_BYTES", destination.stat().st_size)
