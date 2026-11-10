#!/usr/bin/env python3
"""Open Cloud DataStore(MareDevLog)에서 최근 3일치 오류·FPS를 읽어 마크다운으로 출력한다.
권한 오류와 통신 실패는 실패로 기록하며 데이터 미생성(404)만 허용한다."""
import os, json, urllib.request, urllib.error, datetime
key = os.environ.get("ROBLOX_OPEN_CLOUD_API_KEY", "")
if not key:
    raise SystemExit("MARE_TELEMETRY_API_KEY_MISSING")
uni = os.environ.get("UNIVERSE_ID", "10775310508")
base = f"https://apis.roblox.com/cloud/v2/universes/{uni}/data-stores/MareDevLog/entries/"
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
    # [오류 목록] Roblox DataStore는 Lua 사전이 배열로 읽힐 수 있어 두 형식을 직접 처리한다.
    raw_msgs = v.get("msgs", {})
    if isinstance(raw_msgs, dict):
        records = list(raw_msgs.values())
    elif isinstance(raw_msgs, list):
        records = raw_msgs
    else:
        records = []
        failures.add("INVALID_MESSAGE_LIST_FORMAT")
    msgs = [m for m in records if isinstance(m, dict) and isinstance(m.get("n"), (int, float))]
    if len(msgs) != len(records):
        failures.add("INVALID_MESSAGE_ENTRY_FORMAT")
    msgs.sort(key=lambda m: -m["n"])
    if not msgs and not failures:
        print("- 오류·경고 없음\n")
    else:
        print("| 횟수 | 구분 | 내용 |\n|---|---|---|")
        for m in msgs[:40]:
            print(f"| {m['n']} | {str(m.get('side',''))}/{str(m.get('kind',''))} | {str(m.get('text','')).replace('|','/')} |")
        print()
if not found:
    print("최근 3일간 읽힌 데이터가 없다. HTTP 404는 데이터 미생성일 수 있다.")
if failures:
    raise SystemExit("MARE_TELEMETRY_READ_FAILED: " + ", ".join(sorted(failures)))
