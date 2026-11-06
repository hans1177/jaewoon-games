import json,importlib.util
sp=importlib.util.spec_from_file_location("g","gen-skills-fx.py");g=importlib.util.module_from_spec(sp);sp.loader.exec_module(g)
lu,wait,cap,ct,cf,SKIP=g.lu,g.wait,g.cap,g.ct,g.cf,g.SKIP
CARD='local o={} for _,d in ipairs(game.Players.LocalPlayer.PlayerGui:GetDescendants()) do if d.Name=="MeadowTutorialCard" and d.Visible then for _,c in ipairs(d:GetChildren()) do if c:IsA("TextLabel") then table.insert(o,c.Text) end end end if d.Name=="MeadowGuideChip" then table.insert(o,"chip="..d.Text.." vis="..tostring(d.Visible).." pos="..math.floor(d.AbsolutePosition.X)..","..math.floor(d.AbsolutePosition.Y)) end if d.Name=="MeadowGuideMarker" then table.insert(o,"marker vis="..tostring(d.Visible)) end end return table.concat(o," | ")'
MOVE='local c=game.Players:GetPlayers()[1].Character c:PivotTo(c:GetPivot()+Vector3.new(0,0,-14)) return "moved"'
s=[wait(9000),ct("모험 시작")]
for i in range(5): s+=[wait(6000),cf(SKIP,"skip")]
s+=[wait(9000),lu(CARD),cap("t1")]
s+=[lu(MOVE,"Server"),wait(1500),lu(CARD),cap("t2")]
for i in (3,4,5):
    s+=[ct("다음"),wait(900),lu(CARD),cap(f"t{i}")]
s+=[ct("다음"),wait(900),lu(CARD),cap("t6")]
s+=[lu(g.ERRS)]
json.dump(s,open("tutorial.json","w"),ensure_ascii=False,indent=1)
