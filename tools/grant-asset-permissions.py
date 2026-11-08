#!/usr/bin/env python3
"""에셋 소유 계정 키로, 게임이 쓰는 에셋 사용 권한을 새 체험(Universe)에 일괄 부여한다.
환경변수: KEY(에셋 소유 계정 API 키). 읽는 곳: AssetIds 파일의 10자리 이상 숫자."""
import json, os, re, sys, time, urllib.request, urllib.error

KEY = os.environ.get("KEY", "")
GAMES = {
    "mare-essentia": ("10775310508", "roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau"),
    "fantasy-survival": ("10775310122", "roblox-games/fantasy-survival/shared/VisualAssetIds.luau"),
}
only = os.environ.get("ONLY_GAME", "")
if not KEY:
    sys.exit("ROBLOX_ASSET_OWNER_API_KEY secret is required")

def call(body):
    req = urllib.request.Request(
        "https://apis.roblox.com/asset-permissions-api/v1/assets/permissions",
        data=json.dumps(body).encode(), method="PATCH",
        headers={"x-api-key": KEY, "content-type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.read().decode()[:400]
        except urllib.error.HTTPError as e:
            text = e.read().decode()[:400]
            if e.code == 429:
                time.sleep(5 * (attempt + 1)); continue
            return e.code, text
    return 429, "rate limited"

for game, (universe, path) in GAMES.items():
    if only and only != game:
        continue
    ids = sorted(set(re.findall(r"\d{10,}", open(path, encoding="utf-8").read())), key=int)
    print(f"GRANT {game} universe={universe} assets={len(ids)}")
    ok = bad = 0
    use_action = True
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        body = {"subjectType": "Universe", "subjectId": universe,
                "requests": [{"assetId": int(a), "grantToDependencies": True} for a in chunk]}
        if use_action:
            body["action"] = "Use"
        status, text = call(body)
        if status == 400 and use_action:
            use_action = False
            body.pop("action", None)
            status, text = call(body)
        if status == 200:
            ok += len(chunk)
        else:
            bad += len(chunk)
            print(f"GRANT_FAIL {game} batch={i // 50} http={status} body={text}")
            if status in (401, 403):
                break
    print(f"GRANT_RESULT {game} ok={ok} failed={bad}")
