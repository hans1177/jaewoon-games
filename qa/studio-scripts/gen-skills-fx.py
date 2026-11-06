#!/usr/bin/env python3
"""모든 스킬·이펙트 캡처용 Studio 스크립트(skills-fx.json) 생성기. 사용: python3 gen-skills-fx.py [out.json] [only,ids...]"""
import json,sys
def lu(code,ctx="Client"): return {"type":"luau","ctx":ctx,"code":code}
def wait(ms): return {"type":"wait","ms":ms}
def cap(n): return {"type":"capture","name":n}
def ct(t): return {"type":"click_text","text":t}
def cf(code,label): return {"type":"click_from_luau","ctx":"Client","code":code,"label":label}
SKIP='local p=game.Players.LocalPlayer.PlayerGui for _,d in ipairs(p:GetDescendants()) do if d:IsA("GuiButton") and d.Visible and d.AbsoluteSize.X>0 then local hit=(d:IsA("TextButton") and string.find(d.Text,"건너뛰기")) if hit then return string.format("%d,%d",math.floor(d.AbsolutePosition.X+d.AbsoluteSize.X/2),math.floor(d.AbsolutePosition.Y+d.AbsoluteSize.Y/2)) end end end return "NONE"'
SETUP='local p=game.Players:GetPlayers()[1] p:SetAttribute("TutorialStep",99) p:SetAttribute("MeadowTalentMartial",5) p:SetAttribute("MeadowTalentSigns",3) p:SetAttribute("MeadowTalentDefense",3) p:SetAttribute("MeadowTalentAgility",5) local t=Instance.new("Tool") t.Name="장검" t.CanBeDropped=false t.RequiresHandle=true t.Grip=CFrame.new(0,0,-1.6)*CFrame.Angles(0,0,0) local h=Instance.new("Part") h.Name="Handle" h.Size=Vector3.new(.35,.35,4.2) h.Color=Color3.fromRGB(190,200,215) h.Material=Enum.Material.Metal h.CanCollide=false h.Massless=true h.Parent=t local g=Instance.new("Part") g.Size=Vector3.new(1.6,.3,.3) g.Color=Color3.fromRGB(200,160,60) g.CanCollide=false g.Massless=true g.CFrame=h.CFrame*CFrame.new(0,0,1.7) g.Parent=t local w=Instance.new("WeldConstraint") w.Part0=h w.Part1=g w.Parent=g t:SetAttribute("WeaponMotionProfile","SWORD") t.Parent=p:FindFirstChildOfClass("Backpack") p.Character.Humanoid:EquipTool(t) return "tool="..t.Name'
HIDE='local g=game.Players.LocalPlayer.PlayerGui for _,d in ipairs(g:GetDescendants()) do if d.Name=="MeadowTutorialCard" or d.Name=="TutorialPointer" or d.Name=="MeadowBeginnerTutorial" then d.Visible=false end end return "hid"'
CAM='local RS=game:GetService("RunService") if _G.QACamConn then _G.QACamConn:Disconnect() end local off=Vector3.new(3.2,2.4,-7.5) _G.QACamConn=RS.RenderStepped:Connect(function() local cam=workspace.CurrentCamera local c=game.Players.LocalPlayer.Character local r=c and c:FindFirstChild("HumanoidRootPart") if not r then return end cam.CameraType=Enum.CameraType.Scriptable local base=_G.QAFace or r.CFrame local pos=r.Position+base.RightVector*off.X+Vector3.new(0,off.Y,0)+base.LookVector*(-off.Z) cam.CFrame=CFrame.lookAt(pos,r.Position+Vector3.new(0,1.2,0)) end) return "cam"'
ERRS='local o={} for _,m in ipairs(game:GetService("LogService"):GetLogHistory()) do if m.messageType==Enum.MessageType.MessageError or m.messageType==Enum.MessageType.MessageWarning then table.insert(o,string.sub(m.message,1,220)) end end local n=#o local out={} for i=math.max(1,n-40),n do table.insert(out,o[i]) end return n.." issues\\n"..table.concat(out,"\\n")'

def byname(n): return 'local p=game.Players.LocalPlayer.PlayerGui for _,d in ipairs(p:GetDescendants()) do if d:IsA("GuiButton") and d.Name=="%s" and d.Visible and d.AbsoluteSize.X>0 then return string.format("%%d,%%d",math.floor(d.AbsolutePosition.X+d.AbsoluteSize.X/2),math.floor(d.AbsolutePosition.Y+d.AbsoluteSize.Y/2)) end end return "NONE"'%n
TOOLQ='local p=game.Players:GetPlayers()[1] local c=p.Character local t=c and c:FindFirstChildOfClass("Tool") return "equipped="..tostring(t and t.Name)'
def trig(i,aid): return lu(f'game.Players:GetPlayers()[1]:SetAttribute("QAAction","{aid}|{i}") return "fired {aid}"',"Server")
def run(ids,steps,start=0):
    for k,aid in enumerate(ids):
        steps+=[trig(start+k,aid),wait(550),cap(f"{aid}-a"),wait(150),cap(f"{aid}-b"),wait(500),cap(f"{aid}-c"),wait(1200)]
def build(only=None):
    s=[wait(9000),ct("모험 시작")]
    for i in range(5): s+=[wait(6000),cf(SKIP,"skip")]
    s+=[wait(7000),lu(SETUP,"Server"),wait(1500),lu(HIDE),lu(CAM),wait(2500),lu(TOOLQ,"Server"),cap("00-idle-sword")]
    armed=["skill-meadow-guard","skill-meadow-parry","skill-meadow-dodge-left","skill-meadow-dodge-right","skill-meadow-heavy","skill-meadow-sweep","skill-meadow-bolt","skill-meadow-heal","skill-meadow-focus","skill-meadow-oath","skill-meadow-sprint","skill-meadow-emote","scope-corefun-ea77622450","scope-coreloop-0-9b2d4dfbc6"]
    unarmed=["meadow-unarmed-rush","meadow-unarmed-uppercut","meadow-unarmed-kick","meadow-unarmed-elbow"]
    if only:
        armed=[a for a in armed if a in only]; unarmed=[a for a in unarmed if a in only]
    if not only or "guard-variants" in only:
        for v in (1,2,3):
            s+=[lu(f'game.Players:GetPlayers()[1]:SetAttribute("QAGuardVariant",{v}) return "v{v}"',"Server"),wait(300)]
            s+=[trig(200+v*10,"skill-meadow-guard"),wait(450),lu('local c=game.Players.LocalPlayer.Character local j=c.Humanoid.RigType.Name local a=c:GetAttribute("NativeSkillActionId") local ua=c:FindFirstChild("RightUpperArm") local sh=c:FindFirstChild("RightShoulder",true) return "rig="..j.." act="..tostring(a).." tool="..tostring(c:FindFirstChildOfClass("Tool")).." shT="..tostring(sh and sh.Transform)'),cap(f"guardV{v}-a"),wait(400),cap(f"guardV{v}-b"),wait(2200)]
            s+=[lu(f'return "variant {v} done"')]
    run(armed,s,0)
    if unarmed:
        s+=[lu('local p=game.Players:GetPlayers()[1] p.Character.Humanoid:UnequipTools() return "unequipped"',"Server"),wait(800),cap("10-idle-unarmed")]
        run(unarmed,s,100)
    s+=[lu(ERRS)]
    return s
if __name__=="__main__":
    out=sys.argv[1] if len(sys.argv)>1 else "skills-fx.json"
    only=sys.argv[2].split(",") if len(sys.argv)>2 else None
    json.dump(build(only),open(out,"w"),ensure_ascii=False,indent=1)
    print(out)
