# 파일명: tools/gen-qa-click-scripts.py
#!/usr/bin/env python3
"""Studio 클릭 점검 스크립트 생성기 (PC 실행기 devloop-studio.yml studio-script 형식).
매 단계: 스크롤로 버튼 보이게 → 실제 마우스 클릭 → 캡처 → 화면 글자(토스트 포함) 수집.
끝에 Output 오류/경고 로그를 모은다. 실행: python3 tools/gen-qa-click-scripts.py"""
import json
SKIP = ["삭제", "초기화", "나가기", "종료", "구매 확정", "결제", "Robux", "로벅스"]
lt = lambda l: "{" + ",".join('"%s"' % x for x in l) + "}"

def pick(prefer, mode):
    return ("local P=game:GetService('Players').LocalPlayer.PlayerGui local done=workspace:GetAttribute('QADone') or '' "
    "local pref=" + lt(prefer) + " local skip=" + lt(SKIP) + " local vp=workspace.CurrentCamera.ViewportSize "
    "local function shown(d) local x=d while x and x~=P do if x:IsA('GuiObject') and not x.Visible then return false end "
    "if x:IsA('LayerCollector') and not x.Enabled then return false end x=x.Parent end return x==P end "
    "local function label(d) if d:IsA('TextButton') and d.Text~='' then return (d.Text:gsub('\\n',' ')) end "
    "for _,c in ipairs(d:GetDescendants()) do if c:IsA('TextLabel') and c.Text~='' then return c.Text end end return d.Name end "
    "local function keyOf(d) local sf=d:FindFirstAncestorWhichIsA('ScrollingFrame') local oy=sf and 0 or math.floor(d.AbsolutePosition.Y/20) "
    "return label(d)..'@'..(sf and sf.Name or '')..math.floor(d.AbsolutePosition.X/20)..','..(sf and (d.LayoutOrder or 0) or oy) end "
    "local best,bs=nil,-1 for _,d in ipairs(P:GetDescendants()) do "
    "if (d:IsA('TextButton') or d:IsA('ImageButton')) and d.AbsoluteSize.X>8 and d.AbsoluteSize.Y>8 and shown(d) then "
    "local sf=d:FindFirstAncestorWhichIsA('ScrollingFrame') "
    "local inview=d.AbsolutePosition.X>=0 and d.AbsolutePosition.X<vp.X and d.AbsolutePosition.Y>=0 and d.AbsolutePosition.Y<vp.Y "
    "if inview or sf then local l=label(d) local key=keyOf(d) local bad=false "
    "for _,s in ipairs(skip) do if string.find(l,s,1,true) then bad=true end end "
    "if not bad and not string.find(done,key,1,true) then local sc=0 for i,p in ipairs(pref) do if string.find(l,p,1,true) then sc=100-i end end "
    "if sc>bs then bs=sc best=d end end end end end "
    "if not best then return 'NONE' end local sf=best:FindFirstAncestorWhichIsA('ScrollingFrame') "
    "if sf then local off=best.AbsolutePosition.Y-sf.AbsolutePosition.Y+sf.CanvasPosition.Y-(sf.AbsoluteSize.Y-best.AbsoluteSize.Y)/2 "
    "sf.CanvasPosition=Vector2.new(0,math.max(0,off)) end "
    + ("return 'SCROLLED '..label(best)" if mode == 'scroll' else
    "local l=label(best) workspace:SetAttribute('QADone',done..'|'..keyOf(best)) "
    "return string.format('%d,%d CLICK=%s',math.floor(best.AbsolutePosition.X+best.AbsoluteSize.X/2),math.floor(best.AbsolutePosition.Y+best.AbsoluteSize.Y/2),l)"))

# [메인] 실제 PC 검증에 성공한 GetDescendants·Text 접근만 사용한다.
# 기존 인위적 BFS·시간 감시 루프를 제거하고 보이는 글자 최대 10개를 UTF-8 문자 경계로 기록한다.
TEXTS = (
    "local P=game:GetService('Players').LocalPlayer.PlayerGui "
    "local out={} "
    "for _,d in ipairs(P:GetDescendants()) do "
    "if d:IsA('TextLabel') and d.Visible then "
    "local value=d.Text "
    "if value~='' and #value>3 then "
    "local cut=utf8.offset(value,41) "
    "out[#out+1]=cut and string.sub(value,1,cut-1) or value "
    "if #out>=10 then break end "
    "end end end "
    "return 'TEXTS: '..table.concat(out,' | ')"
)

LOGS = ("local out={} for _,m in ipairs(game:GetService('LogService'):GetLogHistory()) do "
 "if (m.messageType==Enum.MessageType.MessageError or m.messageType==Enum.MessageType.MessageWarning) and #out<25 then "
 "out[#out+1]=string.sub(m.message,1,160) end end return 'LOGS('..#out..'): '..table.concat(out,' // ')")

def build(first_wait, prefer, n):
    s = [{"type": "wait", "ms": first_wait}, {"type": "capture", "name": "c00_start"}]
    for i in range(1, n + 1):
        s += [{"type": "luau", "ctx": "Client", "code": pick(prefer, 'scroll')}, {"type": "wait", "ms": 600},
              {"type": "click_from_luau", "ctx": "Client", "label": "auto%02d" % i, "code": pick(prefer, 'click')},
              {"type": "wait", "ms": (12000 if i == 1 and "새 게임" in prefer else 2200)}, {"type": "capture", "name": "c%02d" % i},
              {"type": "luau", "ctx": "Client", "code": TEXTS}]
    s += [{"type": "luau", "ctx": "Client", "code": LOGS},
          {"type": "luau", "ctx": "Server", "code": LOGS},
          {"type": "luau", "ctx": "Client", "code": "return 'clicked='..tostring(workspace:GetAttribute('QADone'))"}]
    return s

def write(path, steps):
    json.dump(steps, open(path, 'w'), ensure_ascii=False, indent=1)

mare_steps = build(35000, ["새 게임", "프랑스", "1700", "출항하기", "교역", "조선", "퀘스트", "항해", "지도", "기술", "항구", "설정"], 30)
# 마지막 두 탐색은 아직 방문하지 않은 버튼이 있을 때만 클릭한다.
for step in [step for step in mare_steps if step["type"] == "click_from_luau"][-2:]:
    step["optional"] = True
write('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json', mare_steps)
write('roblox-games/fantasy-survival/tools/devloop/studio-scripts/fantasy-qa-click.json',
      build(30000, ["모험 시작", "이어하기", "가방", "제작", "도감", "기사단", "스킬트리", "설정", "자동질주", "시작", "퀘스트", "인벤", "스킬", "상점", "지도"], 30))
