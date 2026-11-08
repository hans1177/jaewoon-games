#!/usr/bin/env python3
"""읽기 전용 진단: 게임이 쓰는 Roblox 에셋의 소유자·공개 여부를 공개 API로 조회한다."""
import json, re, random, urllib.request

FILES = {
    "MARE": "roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau",
    "FAN": "roblox-games/fantasy-survival/shared/VisualAssetIds.luau",
}
random.seed(7)
print("PROBE_ASSET experience owner = user 11664914771")
for tag, path in FILES.items():
    ids = sorted(set(re.findall(r"\d{10,}", open(path, encoding="utf-8").read())))
    print(f"PROBE_ASSET {tag} distinct_ids={len(ids)}")
    stats = {}
    for i in random.sample(ids, min(30, len(ids))):
        try:
            with urllib.request.urlopen(f"https://economy.roblox.com/v2/assets/{i}/details", timeout=15) as r:
                d = json.load(r)
            c = d.get("Creator", {})
            key = f"{c.get('CreatorType')}/{c.get('Id')} public={d.get('IsPublicDomain')}"
            kind = d.get("AssetTypeId")
        except Exception as e:
            key, kind = "ERR " + str(e)[:50], "?"
        stats.setdefault(key, []).append((i, kind))
    for key, rows in sorted(stats.items(), key=lambda x: -len(x[1])):
        print(f"PROBE_ASSET {tag} {len(rows):3d}x {key} types={sorted({k for _, k in rows}, key=str)} e.g. {rows[0][0]}")
