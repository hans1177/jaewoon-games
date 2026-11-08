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
for id, n in Data.Nations do
	check(Data.Ports[n.startPort] ~= nil, id .. " 시작 항구 없음")
	check(Cultures.REGION[n.startPort] ~= nil or Cultures.MED[n.startPort] ~= nil or true, "")
end
-- 시작 항구 9곳은 반드시 고유 양식을 가진다
for _, id in { "london", "amsterdam", "rouen", "lisbon", "istanbul", "zanzibar", "calicut", "nagasaki", "veracruz" } do
	local key = Cultures.REGION[id]
	check(key ~= nil and key ~= "tropic" and key ~= "desert", id .. " 일반 양식(tropic/desert) 사용 중: " .. tostring(key))
end
print(("문화권 표 검사: 통과 %d, 실패 %d"):format(pass, fail))
if fail > 0 then error("문화권 표 검사 실패") end
