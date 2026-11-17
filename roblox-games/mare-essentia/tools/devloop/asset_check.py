#!/usr/bin/env python3
"""소스가 쓰는 에셋이 모두 등록돼 있는지 검사한다 (없는 에셋은 게임에서 조용히 사라진다).
사용: asset_check.py <게임폴더> [등록파일(기본 assets-registered.json)]  /  실패 시 종료 코드 1"""
import json, re, sys, glob, os
root = sys.argv[1] if len(sys.argv) > 1 else "."
reg_path = os.path.join(root, sys.argv[2] if len(sys.argv) > 2 else "assets-registered.json")
reg = json.load(open(reg_path))["assets"]
kinds = sorted({k.split("/")[0] for k in reg})
p1 = re.compile(r'importedModel\([^,\n]+,\s*"(\w+)",\s*"([\w\-\.]+)"')
# 모델 쌍의 세 번째 항목이 다른 모델 그룹 문자열이면 에셋 참조가 아니라 그룹 목록이다.
# 예: { "Terrain", "Town", "Castle" } 는 Terrain/Town 모델이 아니다.
p2 = re.compile(r'\{\s*"(%s)",\s*"([\w\-\.]+)"(?=\s*(?:\}|,\s*(?!\s*")))' % "|".join(kinds))
p3 = re.compile(r'(?:place|addProp|placeModel)\((?:[^,\n"]+,\s*)?"(%s)",\s*"([\w\-\.]+)"' % "|".join(kinds))
p4 = re.compile(r'\b(?:rowOf|one)\(\s*"(%s)",\s*"([\w\-\.]+)"' % "|".join(kinds))
used, missing = set(), []
for f in glob.glob(os.path.join(root, "src/**/*.luau"), recursive=True):
    text = open(f, encoding="utf-8").read()
    for k, n in p1.findall(text) + p2.findall(text) + p3.findall(text) + p4.findall(text):
        used.add(f"{k}/{n}")
        if f"{k}/{n}" not in reg:
            missing.append((os.path.basename(f), f"{k}/{n}"))
# [모델 그룹 검사] 등록된 모델 종류마다 Rojo의 MareAssets 안에 실제 폴더가 있어야 한다.
# 없으면 AssetLoader가 정상 모델도 INVALID_MODEL로 보고하므로 게시 전에 차단한다.
project_path = os.path.join(root, "default.project.json")
with open(project_path, encoding="utf-8") as project_file:
    asset_groups = json.load(project_file)["tree"]["ReplicatedStorage"]["MareAssets"]
required_groups = {key.split("/")[0] for key, record in reg.items() if record.get("assetType") == "Model"}
missing_groups = sorted(required_groups - set(asset_groups))
if missing_groups:
    print("등록 모델의 MareAssets 폴더 없음: " + ", ".join(missing_groups))
    sys.exit(1)
unused = sorted(set(reg) - used)
print(f"사용 {len(used)}종 / 등록 {len(reg)}종 / 미사용 {len(unused)}종")
if missing:
    print("미등록 에셋 참조:")
    for f, a in sorted(set(missing)):
        print(f"  {f}: {a}")
    sys.exit(1)
print("OK: 모든 참조가 등록돼 있음")
