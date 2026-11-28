--!nonstrict
-- SeaAreas.luau · 해역 구분(지시서 docs/battle_backdrops 해역 id)과 항구 → 해역 조회.
-- 자동 배치 규칙: Naval/sea_<해역>_near|mid|far (해전 배경), Naval/voyage_<해역>_near|mid|far (항해 배경, 없으면 sea_ 를 씀).
-- NavalBattle 의 briefPorts 표와 같은 내용이다(그 표를 바꾸면 여기도 같이 바꾼다).
local SeaAreas = {}

SeaAreas.PORTS = {
	north_sea = "london amsterdam antwerp bergen edinburgh rotterdam plymouth hull glasgow",
	baltic = "copenhagen gothenburg hamburg stockholm gdansk lubeck oslo riga tallinn helsinki st_petersburg koenigsberg visby",
	channel = "rouen dublin",
	biscay = "bordeaux la_rochelle",
	iberian_atlantic = "lisbon porto cadiz casablanca safi agadir",
	med_west = "seville marseille livorno barcelona valencia algiers tunis tangier palma cagliari ajaccio toulon oran malaga gibraltar cartagena bone",
	med_east = "naples tripoli palermo valletta ragusa athens istanbul alexandria syracuse thessaloniki candia rhodes famagusta smyrna acre benghazi messina corfu beirut damietta",
	red_sea = "mocha jeddah",
	arabian = "aden muscat bandar_abbas basra",
	swahili = "mozambique kilwa mombasa zanzibar mogadishu port_louis",
	cape = "cape_town",
	malabar = "diu surat goa calicut cochin",
	bengal = "colombo madras calcutta rangoon",
	malacca = "malacca bangkok singapore batavia",
	spice_islands = "makassar ternate ambon banda",
	south_china = "manila macau canton tainan hoi_an brunei",
	east_china = "amoy ningbo shanghai tianjin nagasaki busan incheon",
	japan_sea = "osaka edo hakodate",
	caribbean = "nassau havana kingston santo_domingo san_juan bridgetown port_of_spain la_guaira cartagena_indias portobelo paramaribo panama",
	gulf_mexico = "new_orleans veracruz campeche",
	brazil = "belem recife salvador rio montevideo",
	pacific_south_america = "guayaquil callao valparaiso",
	north_atlantic_america = "halifax st_johns quebec boston new_york philadelphia charleston",
	west_africa = "praia saint_louis dakar bissau freetown elmina ouidah lagos calabar sao_tome luanda benguela",
	atlantic_islands = "las_palmas funchal ponta_delgada",
	south_pacific = "sydney hobart auckland port_moresby suva tahiti",
	north_pacific = "sitka vancouver",
}

local byPort = {}
for sea, ports in SeaAreas.PORTS do
	for port in string.gmatch(ports, "%S+") do
		byPort[port] = sea
	end
end

function SeaAreas.seaOf(portId: string?): string?
	if not portId then return nil end
	return byPort[portId]
end

SeaAreas.BANDS = { "near", "mid", "far" }

return SeaAreas
