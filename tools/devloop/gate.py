#!/usr/bin/env python3
"""공통 합격선 검사: gate.py <게임폴더이름>
- devloop.json 읽기
- 에셋 등록 검사(설정된 경우)
- 최신 사진 캡처 브랜치 확인: 존재, 리포트 오류 0, 사진 있음, 나이 제한
종료 코드 1이면 합격선 미달 (다음 단계로 가지 않는다)."""
import json, os, subprocess, sys, time
game = sys.argv[1]
root = os.path.join("roblox-games", game)
cfg = json.load(open(os.path.join(root, "devloop.json")))
fails = []
if cfg.get("assetRegistry"):
    r = subprocess.run([sys.executable, "roblox-games/mare-scientia/tools/devloop/asset_check.py", root, cfg["assetRegistry"]])
    if r.returncode != 0:
        fails.append("에셋 미등록 참조")
br = cfg.get("framesBranch")
if br:
    f = subprocess.run(["git", "fetch", "-q", "origin", br], capture_output=True)
    if f.returncode != 0:
        fails.append(f"사진 브랜치 {br} 없음 (캡처를 먼저 돌려야 함)")
    else:
        files = subprocess.run(["git", "ls-tree", "-r", "--name-only", "FETCH_HEAD"], capture_output=True, text=True).stdout.split()
        pics = [x for x in files if x.lower().endswith((".png", ".jpg", ".jpeg"))]
        if not pics:
            fails.append("사진 0장")
        rep = subprocess.run(["git", "show", "FETCH_HEAD:report.json"], capture_output=True, text=True)
        if rep.returncode == 0:
            try:
                errs = json.loads(rep.stdout).get("errors", [])
                if errs:
                    fails.append(f"캡처 리포트 오류 {len(errs)}건: {errs[:2]}")
            except Exception:
                fails.append("report.json 해석 실패")
        age = (time.time() - int(subprocess.run(["git", "log", "-1", "--format=%ct", "FETCH_HEAD"], capture_output=True, text=True).stdout.strip() or 0)) / 3600
        if age > cfg.get("maxFrameAgeHours", 24):
            fails.append(f"사진이 {age:.0f}시간 지남")
        print(f"사진 {len(pics)}장, 나이 {age:.1f}시간")
if fails:
    print("합격선 미달:", "; ".join(fails))
    sys.exit(1)
print("합격선 통과")
