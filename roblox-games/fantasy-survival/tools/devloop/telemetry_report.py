#!/usr/bin/env python3
"""Open Cloud DataStore(MeadowDevLog)에서 최근 3일치 오류·FPS를 읽어 마크다운으로 출력한다.
데이터가 없으면 정상 종료하고, 키 누락·권한·통신 실패는 실패로 종료한다."""
import os, json, urllib.request, urllib.error, datetime
key = os.environ.get("ROBLOX_OPEN_CLOUD_API_KEY", "")
if not key:
    raise SystemExit("ROBLOX_MEADOW_TELEMETRY_READ_SECRET_MISSING")
uni = os.environ.get("UNIVERSE_ID", "10775310122")
base = f"https://apis.roblox.com/cloud/v2/universes/{uni}/data-stores/MeadowDevLog/entries/"
def get(entry):
    req = urllib.request.Request(base + entry, headers={"x-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}"
    except Exception as e:
        return None, str(e)
print("# 게임 텔레메트리 (최근 3일)\n")
print(f"> 자동 생성 {datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC. 게임 안 오류·경고·FPS를 모은 값이다.\n")
today = datetime.datetime.utcnow()
found = False
failures = set()
for back in range(3):
    day = (today - datetime.timedelta(days=back)).strftime("%Y%m%d")
    data, err = get("d" + day)
    if err:
        print(f"## {day}\n- 데이터 없음 또는 읽기 실패: {err}\n")
        if err != "HTTP 404":
            failures.add(err)
        continue
    v = data.get("value", data)
    found = True
    st = v.get("stats", {})
    fps = f"{st['fpsSum']/st['fpsN']:.0f} (최저 {st['fpsMin']:.0f})" if st.get("fpsN") else "측정 없음"
    print(f"## {day}\n- 접속 {st.get('sessions',0)}회, 평균 FPS {fps}\n")
    msgs = sorted(v.get("msgs", {}).values(), key=lambda m: -m["n"])
    if not msgs:
        print("- 오류·경고 없음\n")
    else:
        print("| 횟수 | 구분 | 내용 |\n|---|---|---|")
        for m in msgs[:40]:
            print(f"| {m['n']} | {m['side']}/{m['kind']} | {m['text'].replace('|','/')} |")
        print()
if not found:
    print("최근 3일간 읽힌 데이터가 없다. HTTP 404는 데이터 미생성일 수 있다.")
if failures:
    raise SystemExit("ROBLOX_MEADOW_TELEMETRY_READ_FAILED: " + ", ".join(sorted(failures)))
