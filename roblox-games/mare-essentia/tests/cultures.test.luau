-- 항구 문화권 표 검사 (Roblox 전용 Color3/Enum 은 최소 모의 객체로 대신한다)
local Cultures = require("./Shared/PortCultures")
local Data = require("./Shared/Ports")
local fail, pass = 0, 0
local function check(ok, msg)
	if ok then pass += 1 else fail += 1 print("실패: " .. msg) end
end
for key, s in Cultures.STYLE do
	check(#s.walls > 0 and #s.roofs > 0, key .. " 벽/지붕 색")
	check(s.mat ~= nil, key .. " 재질(mat)")
	check(s.ground ~= nil and s.street ~= nil and s.roofPitch ~= nil, key .. " 바닥/길/지붕각")
	check(Cultures.PROFILE[key] ~= nil, key .. " 배치 프로필")
	check(Cultures.OUTFIT[key] ~= nil or key == "north" or key == "stone", key .. " 복식")
end
for id, key in Cultures.REGION do
	check(Cultures.STYLE[key] ~= nil, id .. " → 알 수 없는 양식 " .. key)
	check(Data.Ports[id] ~= nil, "REGION 에 없는 항구 id: " .. id)
end
-- 모든 항구는 문화권·주택 형식·거리 배치가 정확히 하나의 기존 양식으로 이어져야 한다.
for id in Data.Ports do
	local key = Cultures.REGION[id]
	check(key ~= nil, id .. " 문화권 누락")
	if key then
		check(Cultures.STYLE[key] ~= nil, id .. " 건축 양식 누락")
		check(Cultures.PROFILE[key] ~= nil, id .. " 거리 배치 누락")
		check(Cultures.STYLE[key] ~= nil and Cultures.STYLE[key].house ~= nil, id .. " 주택 형식 누락")
	end
end
-- 역사적 전환 직전의 양식: 1522년 로도스, 1571년 파마구스타 이후는 PortScene에서 오스만으로 변경한다.
check(Cultures.REGION.rhodes == "med", "로도스 전환 이전 기본 양식")
check(Cultures.REGION.famagusta == "italy", "파마구스타 전환 이전 기본 양식")
for id, n in Data.Nations do
	check(Data.Ports[n.startPort] ~= nil, id .. " 시작 항구 없음")
	check(Cultures.REGION[n.startPort] ~= nil, id .. " 시작 항구 문화권 누락")
end
-- 시작 항구 9곳은 반드시 고유 양식을 가진다
for _, id in { "london", "amsterdam", "rouen", "lisbon", "istanbul", "zanzibar", "calicut", "nagasaki", "veracruz" } do
	local key = Cultures.REGION[id]
	check(key ~= nil and key ~= "tropic" and key ~= "desert", id .. " 일반 양식(tropic/desert) 사용 중: " .. tostring(key))
end
print(("문화권 표 검사: 통과 %d, 실패 %d"):format(pass, fail))
if fail > 0 then error("문화권 표 검사 실패") end
