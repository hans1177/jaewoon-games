#!/usr/bin/env python3
"""Select real, licensed CC0 images and meshes from already archived simple-rpg sources.

Writes only to the runner's temporary directory. Original licensed archives stay untouched.
Asset conversion is not Roblox registration, validation, or actual game rendering.
"""
import hashlib
import json
import pathlib
import shutil
import sys
import tempfile
import zipfile

try:
    import trimesh
    from PIL import Image
except ImportError as exc:
    raise SystemExit("MISSING_CURATED_ART_CONVERTER: install trimesh and pillow") from exc

ROOT = pathlib.Path("assets/external/simple-rpg")
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/simple-rpg-curated")
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "world").mkdir(exist_ok=True)
(OUT / "ui").mkdir(exist_ok=True)
evidence = {"schema": 1, "gameId": "simple-rpg", "sourceOnly": False,
            "robloxImported": False, "gameApplied": False,
            "originalsUntouched": True, "license": "CC0-1.0",
            "world": {}, "ui": {}}


def safe_unpack(path, destination):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip():
            raise RuntimeError("CORRUPT_SOURCE_ARCHIVE:" + str(path))
        for member in archive.infolist():
            dest = pathlib.Path(member.filename)
            if dest.is_absolute() or ".." in dest.parts:
                raise RuntimeError("UNSAFE_SOURCE_ARCHIVE:" + str(path))
            if member.file_size > 80_000_000:
                raise RuntimeError("OVERSIZED_SOURCE_MEMBER:" + member.filename)
        archive.extractall(destination)


def choose_model(archive, label, keywords, allow_any=False):
    if not archive.is_file() or archive.stat().st_size < 1000:
        raise RuntimeError("SOURCE_MISSING:" + str(archive))
    with tempfile.TemporaryDirectory(prefix="simple-rpg-model-") as td:
        base = pathlib.Path(td)
        safe_unpack(archive, base)
        meshes = [p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in
                  (".glb", ".gltf", ".obj")]
        if not meshes:
            raise RuntimeError("NO_SUPPORTED_MESH_IN_CC0_ARCHIVE:" + str(archive))
        def rank(p):
            name = p.stem.lower().replace("-", "_")
            return (sum(10 for term in keywords if term in name),
                    3 if p.suffix.lower() == ".glb" else 2 if p.suffix.lower() == ".gltf" else 1,
                    -len(p.parts))
        meshes.sort(key=rank, reverse=True)
        if not allow_any and rank(meshes[0])[0] == 0:
            raise RuntimeError("NO_RELEVANT_MESH_FOR_" + label + ":" + str(archive))
        for source in meshes[:15]:
            try:
                if source.suffix.lower() == ".glb":
                    binary = source.read_bytes()
                else:
                    scene = trimesh.load(str(source), force="scene", process=False)
                    binary = scene.export(file_type="glb")
                if binary[:4] != b"glTF" or not 200 < len(binary) < 20_000_000:
                    continue
                dest = OUT / "world" / (label + ".glb")
                dest.write_bytes(binary)
                evidence["world"][label] = {
                    "archive": str(archive),
                    "sourceEntry": str(source.relative_to(base)),
                    "sha256": hashlib.sha256(binary).hexdigest(),
                    "bytes": len(binary)
                }
                print("CURATED_WORLD_SOURCE_CONVERTED", label, source.relative_to(base), len(binary))
                return True
            except (ValueError, OSError, TypeError, KeyError) as exc:
                print("CURATED_MODEL_SKIP", label, source.name, str(exc)[:160])
    return False


# Exact CC0 source selections; fail instead of mislabeling an arbitrary person as a creature.
ground_archive = ROOT / "priority-v1" / "kenney-hexagon-world.zip"
town_archive = ROOT / "kenney_fantasy-town-kit_2.0.zip"
if not choose_model(ground_archive, "Ground",
                    ("ground", "grass", "hex", "tile", "plain"), True):
    raise SystemExit("CURATED_GROUND_MODEL_NOT_PREPARED")
if not choose_model(town_archive, "Building", ("house", "tower", "building", "home"), False):
    raise SystemExit("CURATED_BUILDING_MODEL_NOT_PREPARED")
choose_model(town_archive, "Tree", ("tree", "bush"), False)
choose_model(ground_archive, "Rock", ("rock", "stone", "cliff"), False)

ui_archive = ROOT / "kenney_fantasy-ui-borders.zip"
if not ui_archive.is_file():
    raise SystemExit("CURATED_UI_ARCHIVE_MISSING")
with tempfile.TemporaryDirectory(prefix="simple-rpg-ui-") as td:
    base = pathlib.Path(td)
    safe_unpack(ui_archive, base)
    candidates = [p for p in base.rglob("*") if p.is_file() and p.suffix.lower() == ".png"]
    if not candidates:
        raise SystemExit("CURATED_UI_PNG_MISSING")
    used = set()
    for label, words in [("Panel", ("panel", "border", "frame")),
                         ("Button", ("button", "banner", "frame"))]:
        ranked = sorted(candidates, key=lambda p: (
            -sum(10 for w in words if w in p.stem.lower()),
            -p.stat().st_size, str(p)))
        chosen = next((p for p in ranked if p not in used), None)
        if not chosen:
            raise SystemExit("CURATED_" + label.upper() + "_ART_MISSING")
        with Image.open(chosen) as image:
            image.verify()
        binary = chosen.read_bytes()
        if not 100 < len(binary) < 5_000_000:
            raise SystemExit("CURATED_UI_INVALID_SIZE:" + label)
        used.add(chosen)
        output = OUT / "ui" / (label + ".png")
        shutil.copyfile(chosen, output)
        evidence["ui"][label] = {
            "archive": str(ui_archive),
            "sourceEntry": str(chosen.relative_to(base)),
            "sha256": hashlib.sha256(binary).hexdigest(),
            "bytes": len(binary)
        }
        print("CURATED_CC0_UI_SELECTED", label, chosen.relative_to(base))

(OUT / "conversion-evidence.json").write_text(
    json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
if not all((OUT / "world" / (name + ".glb")).is_file() for name in ("Ground", "Building")):
    raise SystemExit("CURATED_WORLD_SOURCE_INCOMPLETE")
if not all((OUT / "ui" / (name + ".png")).is_file() for name in ("Panel", "Button")):
    raise SystemExit("CURATED_UI_SOURCE_INCOMPLETE")
print("CURATED_REAL_SOURCE_ASSET_COUNT=" + str(len(evidence["world"]) + len(evidence["ui"])))
