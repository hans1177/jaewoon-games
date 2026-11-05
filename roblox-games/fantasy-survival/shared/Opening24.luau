-- 마력숲 24컷 60초 2.5D 오프닝 데이터(오너 요청으로 제작한 원화 24컷, 배경·인물·전경 3층).
-- 이미지 ID는 OpeningAssetIds24(업로드 워크플로가 기록)에서만 읽고, 72장이 모두 있을 때만 사용한다.
-- ID가 없거나 일부만 있으면 Resolve()가 nil을 돌려 기존 12장면 오프닝을 그대로 쓴다.
local Module={}
Module.Scenes={
 {id=1,seconds=2.4,camera="push",fx="embers",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="렌스",line="성문이다. 끝내자."},
 {id=2,seconds=2.4,camera="tilt",fx="embers",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="",line=""},
 {id=3,seconds=2.4,camera="push",fx="embers",bgScale={1,1},chShift={18,-0},fgShift={44,0},speaker="닉",line="…가자."},
 {id=4,seconds=2.4,camera="shake",fx="embers",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="",line=""},
 {id=5,seconds=2.4,camera="tilt",fx="embers",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="빅브라더",line="수고했다. 나머지는 내가 맡지."},
 {id=6,seconds=2.4,camera="push",fx="embers",bgScale={1,1},chShift={-18,-0},fgShift={44,0},speaker="",line=""},
 {id=7,seconds=2.4,camera="shake",fx="embers",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="렌스",line="왜 물러나지? 아직 안 끝났다."},
 {id=8,seconds=2.4,camera="pan",fx="embers",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="",line=""},
 {id=9,seconds=2.4,camera="orbit",fx="magic",bgScale={1,1},chShift={18,-0},fgShift={44,0},speaker="렌스",line="미러. 설명해."},
 {id=10,seconds=2.4,camera="push",fx="magic",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="미러",line="계획이 바뀌었습니다."},
 {id=11,seconds=2.4,camera="cut",fx="magic",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="미러",line="여기까지입니다."},
 {id=12,seconds=2.4,camera="zoom",fx="magic",bgScale={1,1},chShift={-18,-0},fgShift={44,0},speaker="",line=""},
 {id=13,seconds=2.4,camera="shake",fx="magic",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="닉",line="…안 움직여."},
 {id=14,seconds=2.4,camera="fade",fx="magic",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="미나",line="카인, 손!"},
 {id=15,seconds=2.4,camera="fade",fx="magic",bgScale={1,1},chShift={18,-0},fgShift={44,0},speaker="렌스",line="가라, 카인."},
 {id=16,seconds=2.4,camera="push",fx="magic",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="카인",line="미나! 렌스! 닉!"},
 {id=17,seconds=2.4,camera="pan",fx="embers",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="빅브라더",line="기록에서 지워라."},
 {id=18,seconds=2.4,camera="particles",fx="embers",bgScale={1,1},chShift={-18,-0},fgShift={44,0},speaker="",line="기사단의 기록이 재가 되었다."},
 {id=19,seconds=2.4,camera="spin",fx="rift",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="",line=""},
 {id=20,seconds=2.4,camera="zoomout",fx="rift",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="",line="카인은 한참을 떨어졌다."},
 {id=21,seconds=2.4,camera="rise",fx="mist",bgScale={1,1},chShift={18,-0},fgShift={44,0},speaker="카인",line="…여긴 어디지?"},
 {id=22,seconds=2.4,camera="tilt",fx="mist",bgScale={1,1},chShift={-18,0},fgShift={44,0},speaker="",line="낡은 기사단 깃발이 남아 있다."},
 {id=23,seconds=2.4,camera="rise",fx="mist",bgScale={1,1},chShift={18,0},fgShift={44,0},speaker="카인",line="렌스… 닉… 미나…"},
 {id=24,seconds=4.8,camera="pullback",fx="mist",bgScale={1,1},chShift={-18,-0},fgShift={44,0},speaker="",line=""},
}
local function validId(value)
 return type(value)=="string" and value:match("^rbxassetid://%d+$")~=nil
end
function Module.Resolve()
 local okIds,ids=pcall(function() return require(script.Parent:WaitForChild("OpeningAssetIds24",3)) end)
 if not okIds or type(ids)~="table" then return nil end
 local out={}
 for _,scene in ipairs(Module.Scenes) do
  local key=string.format("s%02d",scene.id)
  local bg,ch,fg=ids[key.."_bg"],ids[key.."_ch"],ids[key.."_fg"]
  if not validId(bg) or not validId(ch) or not validId(fg) then return nil end
  local copy=table.clone(scene)
  copy.bg,copy.ch,copy.fg=bg,ch,fg
  out[#out+1]=copy
 end
 return out
end
return Module
