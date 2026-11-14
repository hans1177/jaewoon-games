--!strict
-- 항구가 속한 문화권(해역): 초상화 시트·지역 배·지역 퀘스트가 같은 구분을 쓴다.
-- 나라(country) id → 문화권 id. 새 나라는 이 표에 더한다.

local Countries: { [string]: { string } } = {
	atlantic_europe = { "france", "spain", "portugal", "ireland", "madeira", "azores", "canary", "gibraltar", "st_helena" },
	mediterranean = { "italy", "venice", "tuscany", "naples", "sicily", "malta", "greece", "levant", "ottoman", "ragusa", "crete", "rhodes", "cyprus", "dalmatia", "papal", "mallorca", "sardinia", "corsica" },
	red_sea = { "egypt", "yemen", "hejaz", "oman", "persia", "mesopotamia", "algeria", "tripoli", "tunisia", "morocco" },
	west_africa = { "senegal", "guinea", "sierra_leone", "gold_coast", "dahomey", "benin", "niger_delta", "angola", "cape_verde", "sao_tome" },
	americas = { "canada", "newfoundland", "new_france", "new_england", "new_netherland", "pennsylvania", "carolina", "louisiana",
		"bahamas", "cuba", "new_spain", "jamaica", "hispaniola", "puerto_rico", "barbados", "trinidad", "venezuela", "new_granada",
		"panama", "suriname", "brazil", "rio_de_la_plata", "quito", "peru", "chile", "california", "pacific_northwest" },
	north_sea = { "england", "netherlands", "denmark", "sweden", "norway", "scotland", "germany", "austria", "estonia", "finland", "gotland", "livonia", "poland", "prussia", "russia", "russian_america" },
	east_africa = { "swahili", "somalia", "mozambique", "cape" },
	east_asia = { "china", "japan", "korea", "macau", "formosa" },
	south_asia = { "gujarat", "portuguese_india", "malabar", "ceylon", "coromandel", "bengal", "mauritius" },
	southeast_asia = { "malay", "vietnam", "java", "celebes", "moluccas", "borneo", "burma", "siam", "philippines", "new_guinea", "marianas", "fiji", "polynesia", "hawaii", "new_zealand", "australia", "tasmania" },
}

local MediterraneanPorts: { [string]: boolean } = { marseille = true, toulon = true, barcelona = true, valencia = true, cartagena = true, malaga = true }

local RegionByCountry: { [string]: string } = {}
for region, ids in Countries do
	for _, id in ids do
		RegionByCountry[id] = region
	end
end

-- 항구 id → 문화권 id (없으면 nil)
local function ofPort(ports: { [string]: any }, portId: string?): string?
	local port = portId and ports[portId]
	if not port then
		return nil
	end
	if MediterraneanPorts[portId :: string] then
		return "mediterranean"
	end
	return RegionByCountry[port.country]
end

return {
	Countries = Countries,
	MediterraneanPorts = MediterraneanPorts,
	RegionByCountry = RegionByCountry,
	ofPort = ofPort,
}
