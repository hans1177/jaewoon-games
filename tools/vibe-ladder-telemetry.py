#!/usr/bin/env python3
"""비주얼 래더용 성능 측정: Open Cloud DataStore(MeadowDevLog)에서 최근 2일의 평균·최저 FPS와 접속 수를 모아 JSON 한 줄로 출력한다.
키가 없거나 읽기에 실패하면 {"sessions":0}을 출력하고 정상 종료한다(성능 게이트는 데이터가 없으면 작동하지 않는다).
사용: ROBLOX_OPEN_CLOUD_API_KEY=... vibe-ladder-telemetry.py --universe <id> [--store MeadowDevLog]"""
import os, sys, json, argparse, datetime, urllib.request
ap = argparse.ArgumentParser()
ap.add_argument("--universe", required=True)
ap.add_argument("--store", default="MeadowDevLog")
a = ap.parse_args()
key = os.environ.get("ROBLOX_OPEN_CLOUD_API_KEY", "")
out = {"sessions": 0}
if key:
    base = f"https://apis.roblox.com/cloud/v2/universes/{a.universe}/data-stores/{a.store}/entries/"
    n = s = 0; mn = 1e9
    for back in range(2):
        day = (datetime.datetime.utcnow() - datetime.timedelta(days=back)).strftime("%Y%m%d")
        try:
            req = urllib.request.Request(base + "d" + day, headers={"x-api-key": key})
            with urllib.request.urlopen(req, timeout=20) as r:
                v = json.load(r); v = v.get("value", v); st = v.get("stats", {})
                n += st.get("sessions", 0)
                if st.get("fpsN"):
                    s += st["fpsSum"]; out["_n"] = out.get("_n", 0) + st["fpsN"]; mn = min(mn, st.get("fpsMin", 1e9))
        except Exception:
            pass
    if out.get("_n"):
        out["fpsAvg"] = round(s / out["_n"], 1); out["fpsMin"] = round(mn, 1)
    out["sessions"] = n
    out.pop("_n", None)
print(json.dumps(out))
