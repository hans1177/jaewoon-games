#!/usr/bin/env python3
"""Select real, licensed CC0 images and meshes from already archived simple-rpg sources.

Writes only to the runner's temporary directory. Original licensed archives stay untouched.
Asset conversion is not Roblox registration, validation, or actual game rendering.
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
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


def export_original_blend_house(archive):
    """Export the complete CC0 Blender house intact; never invent block geometry."""
    import subprocess
    if not archive.is_file():
        raise RuntimeError("BLENDER_HOUSE_ARCHIVE_MISSING:" + str(archive))
    if shutil.which("blender") is None:
        raise RuntimeError("HEADLESS_BLENDER_REQUIRED_FOR_CC0_HOUSE")
    with tempfile.TemporaryDirectory(prefix="simple-rpg-complete-house-") as td:
        root = pathlib.Path(td)
        safe_unpack(archive, root)
        originals = sorted(
            [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() == ".blend"],
            key=lambda p: (-p.stat().st_size, str(p)))
        if not originals:
            print("CURATED_HOUSE_ARCHIVE_NO_BLENDER_SOURCE", archive)
            return False
        for source in originals:
            if source.open("rb").read(7) != b"BLENDER":
                print("CURATED_HOUSE_SOURCE_NOT_REAL_BLENDER_FILE", archive, source.name)
                continue
            dest = OUT / "world" / "Building.glb"
            dest.unlink(missing_ok=True)
            command = ["blender", "--background", "--factory-startup",
                       "--python", "tools/simple-rpg-blender-export-house.py",
                       "--", str(source.resolve()), str(dest.resolve())]
            result = subprocess.run(command, capture_output=True, text=True,
                                    timeout=170, check=False)
            print("CURATED_ORIGINAL_BLENDER_EXPORT", archive, source.name,
                  "exit", result.returncode,
                  "tail", (result.stdout + result.stderr)[-600:])
            if result.returncode != 0 or not dest.is_file():
                continue
            binary = dest.read_bytes()
            if not (binary[:4] == b"glTF" and 1_000 < len(binary) < 20_000_000):
                dest.unlink(missing_ok=True)
                print("CURATED_HOUSE_EXPORTED_GLTF_INVALID", archive, source.name,
                      "bytes", len(binary))
                continue
            try:
                imported = trimesh.load(str(dest), force="scene", process=False)
                bounds = imported.bounds
                span = bounds[1] - bounds[0]
                if imported.is_empty or len(imported.geometry) == 0 \
                    or min(float(n) for n in span) <= 0.01:
                    raise ValueError("EMPTY_OR_FLAT_GLTF_FROM_ORIGINAL")
            except (ValueError, OSError, TypeError) as exc:
                dest.unlink(missing_ok=True)
                print("CURATED_HOUSE_GLTF_GEOMETRY_REJECTED", str(exc)[:200])
                continue
            evidence["world"]["Building"] = {
                "archive": str(archive),
                "sourceEntry": str(source.relative_to(root)),
                "exportedFromOriginalUnmodifiedBlenderScene": True,
                "originalBlenderSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                "sha256": hashlib.sha256(binary).hexdigest(),
                "bytes": len(binary)
            }
            print("CURATED_COMPLETE_CC0_BLENDER_HOUSE_EXPORTED", archive,
                  source.relative_to(root), "bytes", len(binary))
            return True
    return False


# Exact CC0 source selections; fail instead of mislabeling an arbitrary person as a creature.
ground_archive = ROOT / "priority-v1" / "kenney-hexagon-world.zip"
town_archive = ROOT / "kenney_fantasy-town-kit_2.0.zip"
if not choose_model(ground_archive, "Ground",
                    ("ground", "grass", "hex", "tile", "plain"), True):
    raise SystemExit("CURATED_GROUND_MODEL_NOT_PREPARED")
# Keep the original town-kit source as the first preference. Its verified ZIP
# sometimes uses internal IDs rather than descriptive "house" filenames.
# Use the already archived *house-specific* CC0 originals before claiming a
# random prop from a town pack is a building.
building_candidates = [
    (town_archive, ("house", "tower", "building", "home", "cottage", "hut"), False),
    (ROOT / "priority-v1" / "medieval-house-a.zip", ("house", "home", "building", "roof", "complete"), True),
    (ROOT / "priority-v1" / "medieval-house-b.zip", ("house", "home", "building", "roof", "complete"), True),
    (ROOT / "priority-v1" / "medieval-house-c.zip", ("house", "home", "building", "roof", "complete"), True),
    (ROOT / "priority-v1" / "medieval-house-d.zip", ("house", "home", "building", "roof", "complete"), True),
]
building_ready = False
# A random wall, shutter, roof segment or doorway must never be called a full building.
for archive, keywords, _house_pack in building_candidates:
    try:
        with tempfile.TemporaryDirectory(prefix="simple-rpg-whole-house-") as td:
            base = pathlib.Path(td)
            safe_unpack(archive, base)
            complete = [p for p in base.rglob("*") if p.is_file()
                        and p.suffix.lower() in (".glb", ".gltf", ".obj")
                        and any(term in p.stem.lower() for term in
                                ("house", "cottage", "building", "tower", "castle", "inn", "hut"))
                        and not any(piece in p.stem.lower() for piece in
                                    ("wall", "roof", "window", "door", "shutter",
                                     "chimney", "floor", "beam", "post", "trim"))]
            if complete:
                # Only non-component candidate names are eligible as whole-building source.
                building_ready = choose_model(archive, "Building",
                    (complete[0].stem.lower(),), False)
            if building_ready:
                break
    except (RuntimeError, zipfile.BadZipFile) as exc:
        print("CURATED_COMPLETE_BUILDING_CANDIDATE_SKIP", archive, str(exc)[:180])
if not building_ready:
    for archive in [ROOT / "priority-v1" / ("medieval-house-" + key + ".zip")
                    for key in ("a", "b", "c", "d")]:
        try:
            if export_original_blend_house(archive):
                building_ready = True
                break
        except (RuntimeError, ValueError, OSError, zipfile.BadZipFile,
                subprocess.TimeoutExpired) as exc:
            print("CURATED_COMPLETE_BLENDER_HOUSE_SOURCE_SKIP",
                  archive, str(exc)[:220])
if not building_ready:
    raise SystemExit("CURATED_COMPLETE_CC0_BUILDING_NOT_PREPARED")

# Optional art is imported only when the content is genuinely of that family.
# Missing tree/rock conversions never turn into a generic block model.
for label, sources, words in [
    ("Tree", [ROOT / "priority-v1" / "animated-forest-trees.zip", town_archive],
     ("tree", "bush", "forest")),
    ("Rock", [ground_archive, ROOT / "priority-v1" / "big-forest-landscape.zip"],
     ("rock", "stone", "cliff", "boulder"))
]:
    for archive in sources:
        try:
            if choose_model(archive, label, words, False):
                break
        except (RuntimeError, zipfile.BadZipFile) as exc:
            print("CURATED_OPTIONAL_SOURCE_SKIP", label, archive, str(exc)[:180])

ui_sources = [
    (ROOT / "kenney_fantasy-ui-borders.zip", "Panel", ("panel", "border", "frame")),
    (ROOT / "UIpack_RPG.zip", "Button", ("button", "btn", "action", "select")),
    (ROOT / "kenney_fantasy-ui-borders.zip", "Button", ("panel", "border", "frame"))
]
ui_approved = set()
for source_archive, label, words in ui_sources:
    if label in ui_approved:
        continue
    if not source_archive.is_file():
        raise SystemExit("CURATED_UI_SOURCE_ARCHIVE_MISSING:" + str(source_archive))
    with tempfile.TemporaryDirectory(prefix="simple-rpg-ui-") as td:
        base = pathlib.Path(td)
        safe_unpack(source_archive, base)
        candidates = [p for p in base.rglob("*") if p.is_file()
                      and p.suffix.lower() == ".png" and
                      not any(word in p.stem.lower() for word in
                              ("sample", "preview", "screenshot", "contact-sheet", "atlas"))]
        def rank(p):
            lower = p.stem.lower()
            score = sum(10 for word in words if word in lower)
            return (-score, -p.stat().st_size, str(p))
        for candidate in sorted(candidates, key=rank):
            if not any(word in candidate.stem.lower() for word in words):
                continue
            try:
                with Image.open(candidate) as img:
                    width, height = img.size
                    img.verify()
                if not 50 <= width < 8000 or not 50 <= height < 8000:
                    continue
                binary = candidate.read_bytes()
                if not 100 < len(binary) < 5_000_000:
                    continue
                output = OUT / "ui" / (label + ".png")
                shutil.copyfile(candidate, output)
                evidence["ui"][label] = {
                    "archive": str(source_archive),
                    "sourceEntry": str(candidate.relative_to(base)),
                    "dimensions": [width, height],
                    "sha256": hashlib.sha256(binary).hexdigest(),
                    "bytes": len(binary)
                }
                ui_approved.add(label)
                print("CURATED_REAL_CC0_UI_IMAGE_SELECTED", label,
                      candidate.relative_to(base), width, height)
                break
            except (ValueError, OSError, TypeError):
                continue
if len(ui_approved) != 2:
    raise SystemExit("CURATED_REAL_PANEL_OR_BUTTON_MISSING")
(OUT / "conversion-evidence.json").write_text(
    json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
if not all((OUT / "world" / (name + ".glb")).is_file() for name in ("Ground", "Building")):
    raise SystemExit("CURATED_WORLD_SOURCE_INCOMPLETE")
if not all((OUT / "ui" / (name + ".png")).is_file() for name in ("Panel", "Button")):
    raise SystemExit("CURATED_UI_SOURCE_INCOMPLETE")
print("CURATED_REAL_SOURCE_ASSET_COUNT=" + str(len(evidence["world"]) + len(evidence["ui"])))
