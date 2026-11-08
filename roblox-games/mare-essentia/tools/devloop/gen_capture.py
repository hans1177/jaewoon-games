#!/usr/bin/env python3
"""항구 캡처 스크립트(JSON) 생성기. mare-europe.json 의 구조를 따라 항구마다 '위에서'·'골목에서' 2장을 찍는다.
사용: gen_capture.py <출력.json> <항구id[:레벨]> ...   예) gen_capture.py studio-scripts/mare-startports.json zanzibar calicut:3"""
import json, sys
out, ports = sys.argv[1], sys.argv[2:]
BIND = ("for _,g in ipairs(game.Players.LocalPlayer.PlayerGui:GetChildren()) do if g:IsA('ScreenGui') then g.Enabled=false end end "
        "local RS=game:GetService('RunService') pcall(function() RS:UnbindFromRenderStep('MareShot') end) "
        "RS:BindToRenderStep('MareShot',Enum.RenderPriority.Last.Value+1,function() local cam=workspace.CurrentCamera local cf=workspace:GetAttribute('ShotCF') "
        "if cf then cam.CameraType=Enum.CameraType.Scriptable cam.CFrame=cf cam.FieldOfView=workspace:GetAttribute('ShotFov') or 65 end end) return 'bound'")
def build(pid, lvl):
    return ("local RS=game:GetService('ReplicatedStorage') local ok,err=pcall(function() local PS=require(RS.Shared.PortScene) "
            f"PS.build({{portId='{pid}',portName='{pid}',level={lvl},shipId='galleon',hasShipyard=true,facilities={{'bank','guild','harbormaster'}},storyCount=0,companions={{}}}},function() end) end) "
            "local c=game.Players.LocalPlayer.Character if c and c:FindFirstChild('HumanoidRootPart') then c.HumanoidRootPart.Anchored=true c:PivotTo(CFrame.new(-6,6,10)) end "
            "workspace:SetAttribute('ShotFov',60) workspace:SetAttribute('ShotCF',CFrame.lookAt(Vector3.new(-100,330,1),Vector3.new(-100,0,0),Vector3.new(0,1,0))) return tostring(ok)..tostring(err)")
STREET = "workspace:SetAttribute('ShotFov',72) workspace:SetAttribute('ShotCF',CFrame.lookAt(Vector3.new(-92,14,6),Vector3.new(-150,7,2),Vector3.new(0,1,0))) return 'ok'"
steps = [{"type": "wait", "ms": 35000}, {"type": "luau", "ctx": "Client", "code": BIND}]
for spec in ports:
    pid, _, lvl = spec.partition(":")
    lvl = lvl or "3"
    steps += [{"type": "luau", "ctx": "Client", "code": build(pid, lvl)}, {"type": "wait", "ms": 9000},
              {"type": "capture", "name": f"{pid}_L{lvl}_top"},
              {"type": "luau", "ctx": "Client", "code": STREET}, {"type": "wait", "ms": 2500},
              {"type": "capture", "name": f"{pid}_L{lvl}_street"}]
json.dump(steps, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(f"{out}: 항구 {len(ports)}곳, 캡처 {len(ports)*2}장")
