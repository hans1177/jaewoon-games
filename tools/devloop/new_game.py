#!/usr/bin/env python3
"""새 Roblox 게임을 사진 검증 엔진에 올리는 표준 절차 (설정 한 줄).
사용: new_game.py <게임폴더이름>  → roblox-games/<게임>/devloop.json, docs/devloop/STATE.md, studio-scripts/ 를 만든다 (이미 있으면 건드리지 않는다)."""
import json, os, sys
g = sys.argv[1]
root = os.path.join("roblox-games", g)
if not os.path.isdir(root):
    sys.exit(f"{root} 폴더가 없습니다")
def write(p, s):
    p = os.path.join(root, p)
    if os.path.exists(p):
        print("있음(건너뜀):", p); return
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(s); print("생성:", p)
write("devloop.json", json.dumps({"game": g, "assetRegistry": "assets-registered.json", "framesBranch": f"{g}-studio-frames",
      "maxFrameAgeHours": 24, "studioScript": "tools/devloop/studio-scripts/main.json"}, ensure_ascii=False, indent=2) + "\n")
write("docs/devloop/STATE.md", f"# {g} 개발 기억 (사람·AI가 이어받는 파일)\n\n## 지금 상태\n- (한두 줄)\n\n## 다음 할 일\n1. \n\n## 최근 기록\n- \n")
write("tools/devloop/studio-scripts/main.json", "[]\n")
print("다음: studio-scripts/main.json 에 캡처 단계를 넣고, gate.py", g, "로 확인")
