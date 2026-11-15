--!nonstrict
-- 지역 경제 건물 표 (docs/BUILDINGS_CATALOG.md 에서 옮김). 마을 안정도(식·의·주·위생·치안)와 교역 보너스의 기준 자료.
-- category: food(식) | cloth(의) | home(주) | industry(산업·교역) | public(공공시설)
-- disc: 연결 학문 id (KnowledgeTree.Disciplines 또는 Planned). where: 건물이 있는 지역 설명(국가별은 docs/BUILDINGS_BY_REGION.md).

local B = {}

B.Categories = {
	{ id = "food", name = "식" },
	{ id = "cloth", name = "의" },
	{ id = "home", name = "주" },
	{ id = "industry", name = "산업·교역" },
	{ id = "public", name = "공공시설" },
}

B.List = {
	{ id = "b_food_01", name = "밀밭·제분소(수차·풍차)", category = "food", where = "유럽", minLevel = 1, disc = { "agronomy", "mechanics" }, effect = "식량↑, 곡물 값 안정" },
	{ id = "b_food_02", name = "풍차 배수 간척지", category = "food", where = "네덜란드", minLevel = 3, disc = { "civil_engineering" }, effect = "농지 확장" },
	{ id = "b_food_03", name = "곡물 창고", category = "food", where = "전 지역", minLevel = 2, disc = { "agronomy" }, effect = "흉년 완충" },
	{ id = "b_food_04", name = "관창(官倉)", category = "food", where = "동아시아", minLevel = 3, disc = { "political_science" }, effect = "기근 대비" },
	{ id = "b_food_05", name = "어시장·염장소", category = "food", where = "북유럽·북해", minLevel = 1, disc = { "zoology", "chemistry" }, effect = "어획 가공, 청어·대구 교역" },
	{ id = "b_food_06", name = "건어물 저장고", category = "food", where = "북유럽", minLevel = 2, disc = { "zoology" }, effect = "장기 항해 식량" },
	{ id = "b_food_07", name = "포도주 저장고·양조장", category = "food", where = "지중해·프랑스", minLevel = 2, disc = { "brewing", "chemistry" }, effect = "술 교역" },
	{ id = "b_food_08", name = "맥주 양조장", category = "food", where = "북유럽·독일", minLevel = 2, disc = { "brewing" }, effect = "선원 사기" },
	{ id = "b_food_09", name = "올리브 압착소", category = "food", where = "지중해", minLevel = 2, disc = { "agronomy" }, effect = "올리브유 교역" },
	{ id = "b_food_10", name = "치즈 공방", category = "food", where = "서유럽", minLevel = 2, disc = { "cooking" }, effect = "저장 식량" },
	{ id = "b_food_11", name = "향신료 창고", category = "food", where = "인도양·동남아", minLevel = 3, disc = { "botany" }, effect = "향신료 교역" },
	{ id = "b_food_12", name = "설탕 정제소", category = "food", where = "대서양 섬·카리브", minLevel = 3, disc = { "chemistry" }, effect = "설탕 교역↑" },
	{ id = "b_food_13", name = "차 시장·찻집", category = "food", where = "동아시아", minLevel = 3, disc = { "botany" }, effect = "차 교역" },
	{ id = "b_food_14", name = "쌀 시장·도정소", category = "food", where = "동·동남아시아", minLevel = 2, disc = { "agronomy" }, effect = "식량↑" },
	{ id = "b_food_15", name = "옥수수·감자 저장고", category = "food", where = "아메리카", minLevel = 2, disc = { "agronomy" }, effect = "식량↑" },
	{ id = "b_food_16", name = "소금 증발지", category = "food", where = "지중해·대서양 연안", minLevel = 2, disc = { "chemistry" }, effect = "소금 교역" },
	{ id = "b_food_17", name = "사하라 소금 교역소", category = "food", where = "서아프리카", minLevel = 3, disc = { "commerce" }, effect = "금·소금 교환" },
	{ id = "b_food_18", name = "푸줏간·정육점", category = "food", where = "전 지역", minLevel = 1, disc = { "zoology" }, effect = "식량 다양성" },
	{ id = "b_food_19", name = "빵집", category = "food", where = "유럽·서아시아", minLevel = 1, disc = { "cooking" }, effect = "안정도↑" },
	{ id = "b_food_20", name = "향신료 시장(바자르)", category = "food", where = "이슬람권", minLevel = 3, disc = { "commerce" }, effect = "시세 정보" },
	{ id = "b_cloth_21", name = "양모 시장·직조 공방", category = "cloth", where = "영국·플랑드르", minLevel = 2, disc = { "textiles" }, effect = "직물 교역" },
	{ id = "b_cloth_22", name = "염색소", category = "cloth", where = "유럽·인도", minLevel = 3, disc = { "chemistry" }, effect = "염료 교역, 안정도↑" },
	{ id = "b_cloth_23", name = "면직 공방", category = "cloth", where = "인도", minLevel = 2, disc = { "textiles" }, effect = "면직 교역" },
	{ id = "b_cloth_24", name = "비단 공방·양잠소", category = "cloth", where = "중국·페르시아·이탈리아", minLevel = 3, disc = { "textiles", "botany" }, effect = "비단 교역" },
	{ id = "b_cloth_25", name = "가죽 무두질 공방", category = "cloth", where = "지중해·이슬람권", minLevel = 2, disc = { "chemistry" }, effect = "가죽 제품" },
	{ id = "b_cloth_26", name = "모직 재단·모자 가게", category = "cloth", where = "서유럽", minLevel = 2, disc = { "crafts" }, effect = "복식 고급화" },
	{ id = "b_cloth_27", name = "이불·솜 공방", category = "cloth", where = "동아시아", minLevel = 2, disc = { "textiles" }, effect = "안정도↑" },
	{ id = "b_cloth_28", name = "깃털·모피 교역소", category = "cloth", where = "북유럽·북미", minLevel = 3, disc = { "zoology" }, effect = "모피 교역" },
	{ id = "b_home_29", name = "서민 주택", category = "home", where = "전 지역(양식 스킨)", minLevel = 1, disc = { "architecture" }, effect = "인구↑" },
	{ id = "b_home_30", name = "상인 저택", category = "home", where = "서유럽·지중해", minLevel = 3, disc = { "architecture" }, effect = "교역 슬롯↑" },
	{ id = "b_home_31", name = "중정 주택·카라반사라이", category = "home", where = "이슬람권", minLevel = 2, disc = { "architecture" }, effect = "대상 교역↑" },
	{ id = "b_home_32", name = "목조 주택·기와 가마", category = "home", where = "동아시아", minLevel = 2, disc = { "architecture" }, effect = "안정도↑" },
	{ id = "b_home_33", name = "흙벽돌 주택", category = "home", where = "아프리카·서아시아", minLevel = 1, disc = { "architecture" }, effect = "저비용 인구↑" },
	{ id = "b_home_34", name = "벽돌 가마", category = "home", where = "네덜란드·북독", minLevel = 2, disc = { "civil_engineering" }, effect = "건축 자재" },
	{ id = "b_home_35", name = "석재 채석장", category = "home", where = "지중해·영국", minLevel = 2, disc = { "mineralogy" }, effect = "석재 자재" },
	{ id = "b_home_36", name = "제재소(톱질 풍차)", category = "home", where = "북유럽·네덜란드", minLevel = 2, disc = { "mechanics" }, effect = "목재 자재, 조선 연계" },
	{ id = "b_home_37", name = "여관·주점", category = "home", where = "전 지역", minLevel = 1, disc = { "commerce" }, effect = "소식·선원 모집" },
	{ id = "b_industry_38", name = "대장간", category = "industry", where = "전 지역", minLevel = 1, disc = { "metallurgy" }, effect = "무기·공구" },
	{ id = "b_industry_39", name = "제련소·광산", category = "industry", where = "스웨덴·영국·독일·안데스", minLevel = 3, disc = { "mineralogy", "metallurgy" }, effect = "구리·철·은" },
	{ id = "b_industry_40", name = "유리 공방", category = "industry", where = "베네치아", minLevel = 3, disc = { "chemistry" }, effect = "유리·렌즈 교역" },
	{ id = "b_industry_41", name = "도자기 가마", category = "industry", where = "중국·일본", minLevel = 3, disc = { "crafts" }, effect = "도자기 교역" },
	{ id = "b_industry_42", name = "화약 공방", category = "industry", where = "유럽·동아시아", minLevel = 3, disc = { "chemistry" }, effect = "포 화약" },
	{ id = "b_industry_43", name = "조선소·건선거", category = "industry", where = "해양 도시", minLevel = 3, disc = { "shipbuilding" }, effect = "선박 건조" },
	{ id = "b_industry_44", name = "밧줄·돛 공방", category = "industry", where = "해양 도시", minLevel = 2, disc = { "textiles" }, effect = "선박 유지" },
	{ id = "b_industry_45", name = "인쇄소·신문사", category = "industry", where = "유럽 도시", minLevel = 4, disc = { "linguistics" }, effect = "정보·학문 효과 (PRINT 설계)" },
	{ id = "b_industry_46", name = "거래소·은행", category = "industry", where = "암스테르담 등", minLevel = 4, disc = { "commerce", "economics" }, effect = "금융·시세" },
	{ id = "b_industry_47", name = "세관·계량소", category = "industry", where = "모든 항구", minLevel = 2, disc = { "law" }, effect = "관세 수입" },
	{ id = "b_industry_48", name = "크레인·부두", category = "industry", where = "항구", minLevel = 3, disc = { "civil_engineering" }, effect = "하역 속도" },
	{ id = "b_public_49", name = "우물·급수탑·수로", category = "public", where = "전 지역", minLevel = 1, disc = { "civil_engineering" }, effect = "위생↑" },
	{ id = "b_public_50", name = "공중목욕탕", category = "public", where = "이슬람권·로마 문화권·일본", minLevel = 2, disc = { "public_health" }, effect = "위생↑, 역병 완화" },
	{ id = "b_public_51", name = "하수·배수로", category = "public", where = "유럽 도시", minLevel = 3, disc = { "civil_engineering" }, effect = "역병 위험↓" },
	{ id = "b_public_52", name = "병원·검역소", category = "public", where = "항구", minLevel = 2, disc = { "medicine" }, effect = "선원 회복, 역병 완화" },
	{ id = "b_public_53", name = "시청·관청", category = "public", where = "전 지역", minLevel = 2, disc = { "political_science" }, effect = "세금 효율" },
	{ id = "b_public_54", name = "재판소·감옥", category = "public", where = "전 지역", minLevel = 2, disc = { "law" }, effect = "치안↑" },
	{ id = "b_public_55", name = "소방대·물탱크", category = "public", where = "목조 도시", minLevel = 3, disc = { "civil_engineering" }, effect = "화재 피해↓" },
	{ id = "b_public_56", name = "구빈원·고아원", category = "public", where = "유럽·이슬람권(와크프)", minLevel = 3, disc = { "sociology" }, effect = "불만↓" },
	{ id = "b_public_57", name = "학교·서원·마드라사", category = "public", where = "유럽·동아시아·이슬람권", minLevel = 2, disc = { "education" }, effect = "학문 효과" },
	{ id = "b_public_58", name = "도서관·박물관", category = "public", where = "학술 도시", minLevel = 4, disc = { "historiography" }, effect = "카드·연구" },
	{ id = "b_public_59", name = "등대·부표", category = "public", where = "항구", minLevel = 2, disc = { "navigation" }, effect = "항해 안전" },
	{ id = "b_public_60", name = "시장 광장", category = "public", where = "전 지역", minLevel = 1, disc = { "commerce" }, effect = "거래 편의" },
	{ id = "b_public_61", name = "묘지·성지", category = "public", where = "전 지역", minLevel = 1, disc = { "religious_studies" }, effect = "안정도" },
}

B.ById = {}
B.ByCategory = {}
for _, b in B.List do
	B.ById[b.id] = b
	B.ByCategory[b.category] = B.ByCategory[b.category] or {}
	table.insert(B.ByCategory[b.category], b)
end

return B
