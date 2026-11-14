--!nonstrict
-- 항구가 역사에 등장하는 해. 이 표에 없는 항구는 어느 시대에나 열려 있다.
-- (유럽인에게 항구로 쓰이기 시작했거나 도시가 세워진 해를 대략 잡았다. 구현 전 출처 확인이 필요하다 — docs/CATALOG.md)
local PortEras = {}

PortEras.Since = {
	-- 신대륙
	panama = 1519, veracruz = 1519, cartagena_indias = 1533, buenos_aires = 1536, callao = 1537, valparaiso = 1544,
	salvador = 1549, acapulco = 1550, rio = 1565,
	quebec = 1608, new_york = 1624, bridgetown = 1627, boston = 1630, charleston = 1670, nassau = 1670,
	philadelphia = 1682, kingston = 1692, new_orleans = 1718, montevideo = 1726, halifax = 1749, san_francisco = 1776,
	-- 아시아·아프리카·태평양
	macau = 1557, manila = 1571, nagasaki = 1571, luanda = 1576, edo = 1603, batavia = 1619, madras = 1639, cape_town = 1652,
	calcutta = 1690, rangoon = 1755, tahiti = 1767, bangkok = 1782, sydney = 1788, honolulu = 1795, singapore = 1819,
	auckland = 1840, dakar = 1857, tianjin = 1860, incheon = 1883,
	-- 유럽
	helsinki = 1550, livorno = 1577, gothenburg = 1621, st_petersburg = 1703, trieste = 1719,
}

-- 시작 항구가 그 시대에 없는 나라는 가까운 항구에서 시작한다
PortEras.StartFallback = { nagasaki = "osaka", veracruz = "havana", gothenburg = "stockholm" }

function PortEras.startPortFor(nation, year: number): string
	local id = nation.startPort
	if PortEras.isOpen(id, year) then
		return id
	end
	return PortEras.StartFallback[id] or id
end

-- 이야기·인물이 묶인 항구가 그 시대에 닫혀 있으면, 같은 자리를 대신하는 항구로 본다(예: 나가사키 → 오사카)
function PortEras.homeOf(portId: string, year: number): string
	if PortEras.isOpen(portId, year) then
		return portId
	end
	return PortEras.StartFallback[portId] or portId
end

function PortEras.openYear(portId: string): number
	return PortEras.Since[portId] or 0
end

function PortEras.isOpen(portId: string, year: number): boolean
	return year >= (PortEras.Since[portId] or 0)
end

return PortEras
