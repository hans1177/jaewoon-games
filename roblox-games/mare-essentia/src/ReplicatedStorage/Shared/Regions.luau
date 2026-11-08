--!strict
-- 해역 단계: 대항해시대 온라인처럼 가까운 바다부터 열린다. 항구의 위도/경도로 해역을 정하고,
-- 해역마다 필요한 모험(항해) 레벨을 둔다.

export type Region = { id: string, name: string, minLevel: number }

local Regions = {}

Regions.List = {
	{ id = "europe", name = "유럽·지중해", minLevel = 1 },
	{ id = "w_africa", name = "서아프리카·대서양 섬", minLevel = 3 },
	{ id = "new_world", name = "신대륙·카리브해", minLevel = 6 },
	{ id = "indian", name = "남아프리카·인도양", minLevel = 10 },
	{ id = "far_east", name = "동남아·극동", minLevel = 14 },
	{ id = "pacific", name = "태평양·오세아니아", minLevel = 18 },
} :: { Region }

-- 위도/경도로 정하기 애매한 항구는 직접 지정한다
local OVERRIDE: { [string]: number } = {
	cape_town = 4, port_louis = 4, mozambique = 4,
	acapulco = 6, guayaquil = 6, callao = 6, valparaiso = 6, san_francisco = 6, sitka = 6, vancouver = 6,
	honolulu = 6, tahiti = 6, suva = 6, auckland = 6, hobart = 6, sydney = 6, perth = 6, darwin = 6, port_moresby = 6, guam = 6,
	montevideo = 3, buenos_aires = 3, rio = 3, panama = 3,
	st_petersburg = 1, helsinki = 1, tallinn = 1,
}

function Regions.tierOf(portId: string, lat: number, lon: number): number
	local o = OVERRIDE[portId]
	if o then
		return o
	end
	if lon >= -12 and lon <= 42 and lat >= 30 then
		return 1
	end
	if lon >= -30 and lon <= 22 and lat < 30 then
		return 2
	end
	if lon >= -30 and lon < -12 and lat >= 30 and lat < 45 then
		return 2 -- 마데이라·아조레스
	end
	if lon < -30 and lon >= -105 then
		return 3
	end
	if lon > 22 and lon <= 82 then
		return 4
	end
	if lon > 82 and lon <= 150 then
		return 5
	end
	return 6
end

-- 시작한 해역은 레벨과 상관없이 갈 수 있다 (인도양·극동에서 시작해도 갇히지 않게)
function Regions.isOpen(level: number, homeTier: number, tier: number): boolean
	return tier == homeTier or Regions.List[tier].minLevel <= level
end

-- 이 나라 주인공이 시작한 해역 단계
function Regions.homeTier(ports: any, nation: any): number
	local sp = ports[nation.startPort]
	return Regions.tierOf(sp.id, sp.lat, sp.lon)
end

function Regions.of(port: { id: string, lat: number, lon: number }): Region
	return Regions.List[Regions.tierOf(port.id, port.lat, port.lon)]
end

return Regions
