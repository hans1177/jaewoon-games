#!/usr/bin/env python3
"""새 3D 자산 자동 판정 → 자동 배치 보정표(PlacementOverrides.DATA) 갱신 (2026-11-28 오너 지시: 자동 수정).

1) --make-script : Studio 점검 스크립트 studio-scripts/asset-autocheck.json 을 만든다.
   기존 devloop-studio.yml(script 입력)로 돌리면 서버에서 MareAssets 를 모두 받은 뒤 그룹별로 판정해 report.json 에 남긴다.
     T = 질감 없는 회색 덩어리(텍스처·SurfaceAppearance·색 모두 없음)  → 배치 제외(disabled)
     H = 부품 300개 넘는 무거운 모델                                   → 폰에서 숨김(mobileHide, 모바일 경량)
     L = 등록됐는데 Studio 에서 못 받은 모델                            → 보고만(게임은 원래 기존 모델로 대체)
2) --from <report.json> : 결과를 읽어 PlacementOverrides.luau 의 AUTO 구역만 다시 쓰고
   docs/assets/asset_autocheck.md 에 결과표를 남긴다. 사람이 손으로 넣은 항목(AUTO 구역 밖)은 건드리지 않는다.
사용:
  python3 tools/devloop/placement_autofix.py --make-script
  gh workflow run devloop-studio.yml -f game=mare-essentia -f script=roblox-games/mare-essentia/tools/devloop/studio-scripts/asset-autocheck.json
  python3 tools/devloop/placement_autofix.py --from runs/<id>/report.json
"""
import json, os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GAME = os.path.join(REPO, "roblox-games", "mare-essentia")
SCRIPT = os.path.join(GAME, "tools", "devloop", "studio-scripts", "asset-autocheck.json")
OVR = os.path.join(GAME, "src", "ReplicatedStorage", "Shared", "PlacementOverrides.luau")
DOC = os.path.join(GAME, "docs", "assets", "asset_autocheck.md")
GROUPS = ["Town", "Naval", "Terrain", "Animals", "Relics", "Cargo", "People", "Monsters", "Interior", "Castle"]
BEGIN, END = "\t-- AUTO:BEGIN (placement_autofix.py 가 씀)", "\t-- AUTO:END"

CHECK = r"""
local RS=game:GetService('ReplicatedStorage')
local t0=os.clock() while not RS:GetAttribute('MareAssetsSettled') and os.clock()-t0<200 do task.wait(1) end
local ids=require(RS:WaitForChild('Shared'):WaitForChild('AssetIds'))
local lib=RS:FindFirstChild('MareAssets') local g=lib and lib:FindFirstChild('%s')
local out={'AUTOCHECK %s settled='..tostring(RS:GetAttribute('MareAssetsSettled'))}
local function gray(c) return math.abs(c.R-c.G)<0.03 and math.abs(c.G-c.B)<0.03 and c.R>0.55 end
for key in ids do
  local grp,name=string.match(key,'^([^/]+)/(.+)$')
  if grp=='%s' then
    local m=g and g:FindFirstChild(name)
    if not m then table.insert(out,'L '..name) else
      local parts,tex,colored=0,false,false
      for _,d in m:GetDescendants() do
        if d:IsA('BasePart') then parts+=1
          if d:FindFirstChildOfClass('SurfaceAppearance') or (d:IsA('MeshPart') and d.TextureID~='') then tex=true end
          if not gray(d.Color) then colored=true end
        elseif d:IsA('Decal') or d:IsA('Texture') then tex=true end
      end
      if parts>0 and not tex and not colored then table.insert(out,'T '..name) end
      if parts>300 then table.insert(out,'H '..name..' '..parts) end
    end
  end
end
local s=table.concat(out,'\n') if #s>5800 then s=string.sub(s,1,5800)..'\nMORE' end
return s
"""


def make_script():
    steps = [{"type": "wait", "ms": 20000}]
    for g in GROUPS:
        steps.append({"type": "luau", "ctx": "Server", "code": CHECK % (g, g, g)})
    os.makedirs(os.path.dirname(SCRIPT), exist_ok=True)
    json.dump(steps, open(SCRIPT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(SCRIPT, "a", encoding="utf-8").write("\n")
    print("SCRIPT", os.path.relpath(SCRIPT, REPO))


def parse(report):
    found = {"T": [], "H": [], "L": []}
    settled = {}
    for row in report.get("log", []):
        out = str(row.get("out", ""))
        if not out.startswith("AUTOCHECK "):
            continue
        head, *lines = out.split("\n")
        group = head.split()[1]
        settled[group] = "settled=true" in head
        for ln in lines:
            parts = ln.split()
            if len(parts) >= 2 and parts[0] in found:
                found[parts[0]].append((group, parts[1], parts[2] if len(parts) > 2 else ""))
    return found, settled


def write_overrides(found, settled):
    src = open(OVR, encoding="utf-8").read()
    lines = []
    for g, n, _ in sorted(found["T"]):
        if settled.get(g):
            lines.append(f'\t["{g}/{n}"] = {{ disabled = true, reason = "질감 없는 회색 덩어리(Studio 자동 판정)" }},')
    disabled = {(g, n) for g, n, _ in found["T"] if settled.get(g)}
    for g, n, c in sorted(found["H"]):
        if (g, n) not in disabled:
            lines.append(f'\t["{g}/{n}"] = {{ mobileHide = true, reason = "부품 {c}개 — 폰에서 숨김(Studio 자동 판정)" }},')
    block = BEGIN + "\n" + "\n".join(lines) + ("\n" if lines else "") + END
    if BEGIN in src:
        src = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _: block, src, flags=re.S)
    else:
        src = src.replace("PlacementOverrides.DATA = {\n", "PlacementOverrides.DATA = {\n" + block + "\n", 1)
    open(OVR, "w", encoding="utf-8").write(src)
    md = ["# 새 3D 자산 자동 판정 결과", "", "> 자동 생성: `tools/devloop/placement_autofix.py`. 제외·폰 숨김은 `PlacementOverrides.luau` AUTO 구역에 반영됨.", ""]
    for code, title in (("T", "배치 제외 — 질감 없는 회색 덩어리 (원본 다시 만들어 올리기)"), ("H", "폰에서 숨김 — 너무 무거움 (가벼운 판 올리기)"), ("L", "Studio 에서 못 받음 (권한·등록 확인)")):
        md += [f"## {title}", ""] + [f"- `{g}/{n}` {c}".rstrip() for g, n, c in sorted(found[code])] + ["", f"총 {len(found[code])}개", ""]
    open(DOC, "w", encoding="utf-8").write("\n".join(md))
    print("AUTOFIX", {k: len(v) for k, v in found.items()}, "rules", len(lines))


if __name__ == "__main__":
    if "--make-script" in sys.argv:
        make_script()
    elif "--from" in sys.argv:
        rep = json.load(open(sys.argv[sys.argv.index("--from") + 1], encoding="utf-8"))
        write_overrides(*parse(rep))
    else:
        print(__doc__)
