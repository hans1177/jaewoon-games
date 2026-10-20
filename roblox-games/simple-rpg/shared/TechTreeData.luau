--!strict
-- 파일명: roblox-games/simple-rpg/shared/TechTreeData.luau
-- 연구 데이터: 5개 시대/72개 노드, 선행 연구 및 유레카 자원 50% 할인.
export type TechNode = {
  TechID: number, Era: number, Name: string,
  RequiredResources: {[string]: number}, Prerequisite: number,
  EurekaCondition: string, EurekaMetric: string, EurekaCount: number,
}
local TechTreeData = {}
local EraNames: {string} = { "신화 시대", "석기 시대", "청동기 시대", "철기 시대", "영웅 시대" }
local Names: {{string}} = {
  {"신수의 불꽃", "불씨 보존", "드루이드 통찰", "룬 각인", "조상 숭배", "자연의 속삭임", "신화 채집", "정령 교감", "원시 제단", "영물 길들이기", "성스러운 우물", "별빛 항해", "신수의 가호", "신화의 문"},
  {"뗀석기 제작", "원시 도구", "돌도끼", "돌곡괭이", "흑요석 단검", "가죽 가공", "모닥불", "사냥 그물", "석재 방벽", "목제 주거지", "곡식 저장", "낚시 도구", "원시 농경", "석기 정착"},
  {"청동 용해", "주석 탐사", "구리 제련", "청동 검", "청동 방패", "천부인 청동", "관개 수로", "문자 기록", "상인 교역", "성곽 기초", "신전 건축", "선박 제작", "항해술", "합금 주조", "도시 국가", "청동 왕국"},
  {"철광 탐사", "제철 용광로", "철 검", "철 갑옷", "중장갑 전술", "정밀 채광", "수직 광산", "석조 성채", "투석기", "공성 방패", "도로망", "원거리 무기", "대형 작업장", "지식 보관소", "강철 제련", "철기 제국"},
  {"영웅의 부름", "전설 무구", "왕실 수호대", "대원정", "황금 가디언", "위대한 도서관", "영웅의 요새", "최종 랜드마크", "문명 동맹", "세계 무역로", "영원의 봉화", "멀티버스 포털"},
}
local Nodes: {[number]: TechNode} = {}
local Ordered: {TechNode} = {}
local id = 0
for era, group in ipairs(Names) do
  for _, name in ipairs(group) do
    id += 1
    local metricIndex = ((id - 1) % 4) + 1
    local metric = ({ "CivGather", "CivKills", "CivParries", "CivDodges" })[metricIndex]
    local metricLabel = ({ "채집", "몬스터 처치", "퍼펙트 패링", "회피" })[metricIndex]
    local count = math.max(1, era * 2 + math.floor(id / 9))
    local costs: {[string]: number} = {
      Wood = 4 + 2 * id, Stone = 3 + 2 * id,
      Research = 3 + era * 3 + id,
    }
    if era >= 3 then costs.Bronze = 2 + id end
    if era >= 4 then costs.Iron = 3 + id end
    local node: TechNode = {
      TechID = id, Era = era, Name = name, RequiredResources = costs,
      Prerequisite = id - 1,
      EurekaCondition = metricLabel .. " " .. count .. "회 달성",
      EurekaMetric = metric, EurekaCount = count,
    }
    Nodes[id] = node
    table.insert(Ordered, node)
  end
end
assert(id == 72, "72 TECHS REQUIRED")
function TechTreeData.GetTech(techID: number): TechNode?
  if type(techID) ~= "number" or techID % 1 ~= 0 then return nil end
  return Nodes[techID]
end
function TechTreeData.All(): {TechNode}
  return Ordered
end
function TechTreeData.EraName(era: number): string
  return EraNames[era] or "미지의 시대"
end
return table.freeze(TechTreeData)
