#!/usr/bin/env python3
"""Owner-authorized, source-only CC0 acquisition, never game publishing.
Only curated original OpenGameArt attachments with individually reviewed CC0 pages.
Never extract archive entries into the repository.
"""
import hashlib
import json
import os
import pathlib
import subprocess
import tarfile
import zipfile
from urllib.parse import quote

REPO = pathlib.Path("assets/external/simple-rpg")
DEST = REPO / "priority-v1"
DEST.mkdir(parents=True, exist_ok=True)

# Priority, unique stored name, upstream original filename, CC0 evidence page slug, file format.
PACKS = [
  ["01-insects", "ant-rigged.blend", "ant.blend", "ant-3d-model-rigging-animated-low-poly-ish", "blend"],
  [
    "01-insects",
    "bee-rigged.blend",
    "bee_rigged_v1.1.blend",
    "bee-0",
    "blend"
  ],
  [
    "02-wildlife-prehistoric",
    "polar-bear.7z",
    "Bear.7z",
    "white-bear-low-poly",
    "7z"
  ],
  [
    "02-wildlife-prehistoric",
    "penguin.tar.gz",
    "penguin.tar.gz",
    "penguin-low-poly-animated-3d-model",
    "tar.gz"
  ],
  [
    "02-wildlife-prehistoric",
    "dromaeosaur.blend",
    "Dromaeosaur.blend",
    "dromaeosaur-dinosaur",
    "blend"
  ],
  [
    "03-equipment",
    "swordtember-30-glb.zip",
    "swordtember2022_glb_0.zip",
    "30-unique-lowpoly-swords-cc0-swordtember2022",
    "zip"
  ],
  [
    "03-equipment",
    "3d-swords-9.zip",
    "swords_pack.zip",
    "3d-swords-pack",
    "zip"
  ],
  [
    "03-equipment",
    "rpg-items-8.zip",
    "low-poly RPG item collection_0.zip",
    "rpg-item-collection-1",
    "zip"
  ],
  [
    "03-equipment",
    "rpg-items-armor-8.zip",
    "low-poly RPG item collection 2.zip",
    "rpg-item-collection-2",
    "zip"
  ],
  [
    "03-equipment",
    "medieval-weapons-14.7z",
    "medieval_weapon_pack.7z",
    "medieval-weapon-pack",
    "7z"
  ],
  ["03-equipment", "rpg-equipment-100.zip", "ultimate_rpg_items_pack_by_quaternius_0.zip", "low-poly-rpg-pack", "zip"],
  ["03-equipment", "wizard-staff-glb.zip", "sws_glb.zip", "stylized-wizard-staff", "zip"],
  ["03-equipment", "medieval-shields.blend", "shields.blend", "low-poly-medieval-shields", "blend"],
  ["03-equipment", "handpainted-rpg-weapons.zip", "handpainted weapons.zip", "cethiels-weapons-3d", "zip"],
  ["03-equipment", "potion-bottles.blend", "potionBottlesOGA.blend", "potions-6", "blend"],
  [
    "04-npc-buildings",
    "modular-rpg-npc.7z",
    "modular_rpg_characters.7z",
    "modular-rpg-characters",
    "7z"
  ],
  [
    "04-npc-buildings",
    "modular-npc-animation-rig.7z",
    "modular_rpg_characters_ik_rig_for_animating.7z",
    "modular-rpg-characters",
    "7z"
  ],
  [
    "04-npc-buildings",
    "kenney-castles.zip",
    "kenney_castle-kit.zip",
    "castle-kit",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-house-a.zip",
    "75519_House1Upload_blend.zip",
    "medieval-house-pack",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-house-b.zip",
    "75861_House2_1Upload_blend.zip",
    "medieval-house-pack",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-house-c.zip",
    "75862_House3Upload_blend.zip",
    "medieval-house-pack",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-house-d.zip",
    "75864_House4Upload_blend.zip",
    "medieval-house-pack",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-village-modular.zip",
    "modular_village_collection.zip",
    "modular-village",
    "zip"
  ],
  [
    "04-npc-buildings",
    "medieval-village-props.zip",
    "55189_props3.zip",
    "medieval-props-pack-3",
    "zip"
  ],
  ["04-npc-buildings", "kenney-hexagon-world.zip", "kenney_hexagon-kit.zip", "hexagon-kit", "zip"],
  [
    "05-environment-sfx",
    "animated-forest-trees.zip",
    "Low_Poly_Forest_Pack_Devilswork.Shop_v02.zip",
    "low-poly-forest-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "vegetation-pack.zip",
    "free_vegetation_pack.zip",
    "free-vegetation-asset-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "vegetation-exotic.zip",
    "vegetationgroup01.zip",
    "group-of-exotic-vegetation",
    "zip"
  ],
  [
    "05-environment-sfx",
    "big-forest-landscape.zip",
    "Environment_pack.zip",
    "big-lowpoly-environment-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "trees-9.zip",
    "tree_pack_v_0_1.zip",
    "fox-trees-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "rpg-environment-items.zip",
    "low-poly RPG item collection 3.zip",
    "rpg-item-collection-3",
    "zip"
  ],
  [
    "05-environment-sfx",
    "mining-caverns.zip",
    "free_mine_assets.zip",
    "free-mine-assets-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "rpg-sfx-95.zip",
    "rpg_sound_pack.zip",
    "rpg-sound-pack",
    "zip"
  ],
  [
    "05-environment-sfx",
    "rpg-sfx-80.zip",
    "80-CC0-RPG-SFX_0.zip",
    "80-cc0-rpg-sfx",
    "zip"
  ],
  [
    "05-environment-sfx",
    "kenney-rpg-sfx-50.zip",
    "RPGsounds_Kenney.zip",
    "50-rpg-sound-effects",
    "zip"
  ],
  [
    "05-environment-sfx",
    "fox-textured-animated.zip",
    "fox_source_v3.zip",
    "fox-0",
    "zip"
  ],
  ["05-environment-sfx", "treasure-collection.zip", "treasure_pack.zip", "treasure-pack", "zip"],
  ["06-arthropods","crab-animated-3d.zip","crab.zip","crab-low-poly-animated-3d-model","zip"],
  ["07-wildlife","deer-male-rigged.blend","deer1.blend","old-deer-male","blend"],
  ["07-wildlife","deer-female-rigged.blend","doe.blend","deer-female","blend"],
  ["07-wildlife","rooster-rigged.zip","rooster.zip","rooster-animated","zip"],
  ["08-npc","fantasy-rpg-npc-six.zip","rpg_characters_-_nov_2020.zip","lowpoly-rpg-characters","zip"],
  ["08-npc","old-lady-rigged.blend","oldlady-v2.blend","old-lady","blend"],
  ["08-npc","knight-animated.zip","Knight Character by @Quaternius.zip","lowpoly-animated-knight","zip"],
  ["08-npc","knight-cartoon.zip","Cartoon Medieval Knight.zip","cartoon-medieval-knight","zip"],
  ["08-npc","female-basic-rigged.zip","female_basic_rigged.zip","basic-female","zip"],
  ["09-buildings","blacksmith-original.zip","75729_Blacksmith1Upload_blend.zip","medieval-blacksmith","zip"],
  ["09-buildings","blacksmith-interior.blend","medievalblacksmith.blend","medieval-blacksmith-interior","blend"],
  ["10-npc-expanded","npc-character-pack20.zip","modelspack2.zip","character-pack2","zip"],
  ["10-npc-expanded","animated-human-rigged.zip","Animated Human by @Quaternius_0.zip","animated-human-low-poly","zip"],
  ["10-npc-expanded","hero-base-rigged.zip","character-base-model-rigged.zip","character-base-model","zip"],
  ["11-unique-bosses","giant-mutant-animated.zip","giant_mutant.zip","giant-mutant","zip"],
  ["12-dungeon-interiors", "modular-dungeon-3d.zip", "free_modular_low_poly_dungeon_by_rgsdev.zip", "free-modular-low-poly-dungeon-pack", "zip"],
  ["09-buildings", "apocalyptic-city-ruins.zip", "lowpoly-apocalyptic-buildings-by-majadroid.zip", "3d-apocalyptic-building-city-cc0", "zip"],
  ["12-dungeon-interiors", "fantasy-ruins-3td.zip", "Fantasy Ruins Pack.zip", "3td-fantasy-ruins-pack", "zip"],
  ["12-dungeon-interiors", "castle-labyrinth.zip", "labyrinth.zip", "3d-walls-props", "zip"],
  ["12-dungeon-interiors","dungeon-interior-kit.zip","Dungeon.zip","dungeon-assets","zip"]
]

# 좁은 범위만 다운로드: 명시적으로 검증한 CC0 개미만 선택한다.
# 기존 56종 원본과 매니페스트를 다시 다운로드하거나 덮어쓰지 않는다.
ONLY_PACK = os.environ.get("VIBE_CC0_ONLY_PACK", "").strip()
# [선택한 원본만 요청] 기존 PACKS에 출처/원본명/라이선스 증거가 선언된 항목만 허용한다.
# 업스트림 URL이나 파일명은 외부 요청에서 직접 지정하지 않는다.
if ONLY_PACK and ONLY_PACK not in {row[1] for row in PACKS}:
    raise SystemExit("UNAPPROVED_CC0_TARGET_ONLY:" + ONLY_PACK)
prior_manifest_file = DEST / "manifest.json"
prior_manifest = json.loads(prior_manifest_file.read_text("utf-8")) if ONLY_PACK and prior_manifest_file.exists() else {}
if ONLY_PACK and (prior_manifest.get("gameId") != "simple-rpg"
                  or prior_manifest.get("sourceOnly") is not True
                  or not isinstance(prior_manifest.get("packs"), list)):
    raise SystemExit("EXISTING_VERIFIED_SOURCE_MANIFEST_REQUIRED")
if ONLY_PACK:
    old = next((row for row in prior_manifest["packs"] if row.get("file") == ONLY_PACK), None)
    original = DEST / ONLY_PACK
    if old and original.exists() and original.stat().st_size == old.get("bytes"):
        if hashlib.sha256(original.read_bytes()).hexdigest() == old.get("sha256"):
            print("CC0_SOURCE_ALREADY_PRESENT_VERIFIED=" + ONLY_PACK, flush=True)
            raise SystemExit(0)

def previous_hashes():
    result = set()
    for manifest in (REPO / "manifest.json", REPO / "wildlife" / "manifest.json",
                     REPO / "icons-vfx-npc" / "manifest.json"):
        if not manifest.is_file():
            continue
        for row in json.loads(manifest.read_text("utf-8")).get("packs", []):
            sha = row.get("sha256")
            if sha:
                result.add(sha)
    return result

def verify(path, fmt):
    if not 512 < path.stat().st_size < 95_000_000:
        raise ValueError("INVALID_SOURCE_SIZE")
    source_names = set()
    if fmt == "zip":
        if not zipfile.is_zipfile(path):
            raise ValueError("NOT_ZIP")
        with zipfile.ZipFile(path) as arc:
            entries = arc.infolist()
            if len(entries) > 25000 or sum(x.file_size for x in entries) > 600_000_000:
                raise ValueError("ARCHIVE_RESOURCE_LIMIT")
            if arc.testzip() is not None:
                raise ValueError("ZIP_CRC_ERROR")
            filenames = [x.filename for x in entries if not x.is_dir()]
            if not filenames:
                raise ValueError("EMPTY_ARCHIVE")
            source_names = {
                pathlib.PurePosixPath(x).stem.casefold()
                for x in filenames
                if x.casefold().endswith((".glb", ".gltf", ".fbx", ".obj", ".blend", ".dae", ".3ds", ".vox", ".wav", ".ogg", ".mp3"))
            }
            if not source_names and not any(x.lower().endswith((".png", ".jpg", ".jpeg")) for x in filenames):
                raise ValueError("NO_MODEL_SOUND_OR_TEXTURE")
            return len(source_names), "zip_crc_and_content"
    if fmt == "blend":
        if path.open("rb").read(7) != b"BLENDER":
            raise ValueError("INVALID_BLENDER")
        return 1, "blender_header_only"
    if fmt == "7z":
        if path.open("rb").read(6) != bytes.fromhex("377abcaf271c"):
            raise ValueError("INVALID_7Z_SIGNATURE")
        # 7z format requires external decompressor; do NOT assert model file counts.
        return None, "7z_signature_only_contents_unverified"
    if fmt == "tar.gz":
        if not tarfile.is_tarfile(path):
            raise ValueError("INVALID_TAR_GZ")
        with tarfile.open(path, "r:gz") as arc:
            files = [x for x in arc if x.isfile()]
            if len(files) > 25000 or sum(x.size for x in files) > 600_000_000:
                raise ValueError("TAR_RESOURCE_LIMIT")
            names = {pathlib.PurePosixPath(x.name).stem.casefold()
                     for x in files if x.name.lower().endswith((".glb", ".gltf", ".fbx", ".obj", ".blend", ".dae", ".3ds"))}
            if not names:
                raise ValueError("NO_TAR_MODEL")
            return len(names), "tar_gz_members_checked"
    raise ValueError("UNKNOWN_EXTENSION")

existing = previous_hashes()
passed, failed, duplicates = [], [], []
for priority, local_name, remote_name, page_slug, fmt in PACKS:
    if ONLY_PACK and local_name != ONLY_PACK:
        continue
    dest = DEST / local_name
    url = "https://opengameart.org/sites/default/files/" + quote(remote_name)
    evidence = "https://opengameart.org/content/" + page_slug
    if not dest.exists():
        result = subprocess.run(
            ["curl", "-fL", "--retry", "2", "--retry-all-errors", "--retry-delay", "2",
             "--connect-timeout", "12", "--max-time", "160", "-o", str(dest), url],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=190)
        if result.returncode:
            dest.unlink(missing_ok=True)
            failed.append({"file": local_name, "priority": priority, "reason": "DOWNLOAD_HTTP_OR_NETWORK_FAILED", "source": evidence})
            print("PRIORITY_DOWNLOAD_FAILED", priority, local_name, flush=True)
            continue
    try:
        count, method = verify(dest, fmt)
        sha = hashlib.sha256(dest.read_bytes()).hexdigest()
        if sha in existing:
            dest.unlink(missing_ok=True)
            duplicates.append({"file": local_name, "sha256": sha, "reason": "BINARY_DUPLICATE_OF_EXISTING_SOURCE"})
            print("PRIORITY_DUPLICATE_SKIPPED", priority, local_name, flush=True)
            continue
        existing.add(sha)
        passed.append({
            "file": local_name, "priority": priority, "sourceUrl": url, "licenseSourceUrl": evidence,
            "licenseDeclared": "CC0-1.0", "sha256": sha, "bytes": dest.stat().st_size,
            "sourceFileCandidates": count, "validation": method, "sourceOnly": True,
            "robloxImported": False, "gameApplied": False})
        print("PRIORITY_VERIFIED", priority, local_name, "candidates", count, flush=True)
    except (OSError, ValueError, zipfile.BadZipFile, tarfile.TarError) as error:
        dest.unlink(missing_ok=True)
        failed.append({"file": local_name, "priority": priority, "reason": str(error), "source": evidence})
        print("PRIORITY_VERIFY_FAILED", priority, local_name, str(error), flush=True)

if ONLY_PACK:
    # 실제 원본 확보 실패라면 기존 매니페스트를 수정하지 않는다.
    if failed or duplicates or len(passed) != 1:
        raise SystemExit("TARGETED_CC0_ACQUISITION_NOT_VERIFIED")
    retained = [row for row in prior_manifest["packs"] if row.get("file") != ONLY_PACK]
    passed = retained + passed
    duplicates = prior_manifest.get("duplicateSources", [])
    failed = prior_manifest.get("failed", [])

bypriority = {
    key: {"packs": len([x for x in passed if x["priority"] == key]),
          "fileCandidates": sum(x["sourceFileCandidates"] or 0 for x in passed if x["priority"] == key)}
    for key in sorted(set(x[0] for x in PACKS))
}
manifest = {
    "gameId": "simple-rpg", "version": 1, "license": "CC0-1.0", "sourceOnly": True, "robloxImported": False,
    "gameApplied": False, "speciesCountVerified": False,
    "licenseCaveat": "Source page states CC0; file validation does not independently audit every embedded texture.",
    "priorityOrder": ["01-insects", "02-wildlife-prehistoric", "03-equipment", "04-npc-buildings", "05-environment-sfx"],
    "summary": bypriority, "verifiedPacks": len(passed),
    "packs": passed, "duplicateSources": duplicates, "failed": failed
}
(DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("PRIORITY_FINAL_ARCHIVES", len(passed), "FAILED", len(failed), "DUPLICATES", len(duplicates), flush=True)
if len(passed) < 12 or not all(v["packs"] > 0 for v in bypriority.values()):
    raise SystemExit("PRIORITY_CATEGORY_OR_MINIMUM_PACKS_MISSING")


# [공용 에셋 목록] 기존 원본 매니페스트 4종에서 실제 저장된 CC0 원본만
# SHA256 기준으로 합치고 회사 공용 선택 목록을 자동 갱신한다. 게임 배포는 하지 않는다.
shared_file = pathlib.Path("assets/asset-manifest.json")
if shared_file.exists() and not ONLY_PACK:
    shared = json.loads(shared_file.read_text("utf-8"))
    summary = shared.get("sharedOriginalArchives")
    if isinstance(summary, dict):
        seen = set()
        common = []
        for manifest_name in summary.get("canonicalArchiveManifests", []):
            child_path = pathlib.Path(manifest_name)
            if not str(child_path).startswith("assets/external/simple-rpg/") or child_path.name != "manifest.json":
                raise SystemExit("INVALID_SHARED_SOURCE_MANIFEST")
            child = json.loads(child_path.read_text("utf-8"))
            if child.get("sourceOnly") is not True:
                raise SystemExit("SHARED_SOURCE_MUST_BE_SOURCE_ONLY")
            for row in child.get("packs", []):
                name = row.get("file") or row.get("filename")
                sha256 = str(row.get("sha256", "")).lower()
                if not name or pathlib.PurePosixPath(name).name != name or ".." in name or len(sha256) != 64:
                    raise SystemExit("INVALID_SHARED_SOURCE_IDENTITY")
                if sha256 in seen:
                    continue
                license_name = row.get("licenseDeclared") or row.get("license") or child.get("license")
                if str(license_name).upper() not in ("CC0", "CC0-1.0"):
                    raise SystemExit("INVALID_SHARED_SOURCE_LICENSE")
                relative = child_path.parent / name
                if not relative.is_file():
                    raise SystemExit("MISSING_SHARED_ORIGINAL: " + str(relative))
                total_bytes = int(row.get("bytes") or row.get("archiveBytes") or 0)
                if total_bytes < 512 or relative.stat().st_size != total_bytes:
                    raise SystemExit("SHARED_ORIGINAL_SIZE_MISMATCH: " + str(relative))
                url = row.get("sourceUrl") or row.get("originalUrl") or row.get("sourcePage")
                license_url = row.get("licenseSourceUrl") or row.get("licenseEvidence") or row.get("sourcePage") or row.get("sourceUrl")
                if not url or not license_url:
                    raise SystemExit("SHARED_ORIGINAL_PROVENANCE_MISSING: " + str(relative))
                common.append({
                    "file": name, "sourcePath": relative.as_posix(), "sha256": sha256,
                    "bytes": total_bytes, "sourceUrl": url, "licenseEvidenceUrl": license_url,
                    "role": row.get("priority") or row.get("category") or row.get("assetKind") or "general",
                    "licenseDeclared": "CC0-1.0", "sourceOnly": True, "gameApplied": False,
                })
                seen.add(sha256)
        if summary.get("packs") != common:
            summary["packs"] = common
            shared_file.write_text(json.dumps(shared, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("COMPANY_SHARED_ORIGINALS_SYNCED", len(common), "NEW_PRIORITY", len(passed), flush=True)
        else:
            print("COMPANY_SHARED_ORIGINALS_UNCHANGED", len(common), flush=True)
