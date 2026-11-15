--!strict
-- 직업별 탐험 스킬 체계. 순수 데이터와 규칙(엔진 무관)이라 단위 시험이 된다.
--  * 주인공: 한 번에 장착하는 스킬은 최대 3개 (MAX_PLAYER_SKILLS). 공격·회피·방어는 기본 행동이라 세지 않는다.
--  * 동료: 직업 분류(카테고리)에 따라 쓸 수 있는 스킬이 정해지고, 동료 한 명당 최대 2개 (MAX_ALLY_SKILLS).
--  * 분류가 곧 역할이다: 무인=앞에서 때리고 사기, 포수=원거리, 성직·의술=회복·보호, 항해·탐험=순풍·탐색, 상인=행운·보호, 학자=탐색·저격.

local JobSkills = {}

JobSkills.MAX_PLAYER_SKILLS = 3
JobSkills.MAX_ALLY_SKILLS = 2

-- 스킬 정의: kind 는 FieldScene 의 효과 이름과 같다 (heal·armor·volley·snipe·rally·luck·read·bash).
JobSkills.Skills = {
	bash = { id = "bash", name = "강타 지시", cooldown = 10, summary = "가까운 적을 크게 베어 비틀거리게 한다" },
	rally = { id = "rally", name = "사기 고양", cooldown = 16, summary = "8초간 공격력 +30%" },
	volley = { id = "volley", name = "일제 사격", cooldown = 12, summary = "가까운 적 3명을 맞힌다" },
	snipe = { id = "snipe", name = "저격", cooldown = 14, summary = "한 명을 강하게 맞히고 비틀거리게 한다" },
	heal = { id = "heal", name = "응급 치료", cooldown = 14, summary = "체력 25% 회복" },
	armor = { id = "armor", name = "수호의 기도", cooldown = 18, summary = "다음 공격 1회를 막는 보호막" },
	read = { id = "read", name = "약점 간파", cooldown = 12, summary = "주변 적을 잠깐 굳게 한다" },
	luck = { id = "luck", name = "행운의 손", cooldown = 20, summary = "기력을 가득 채우고 체력 조금 회복" },
}

-- 직업 분류: 이름, 동료가 쓸 수 있는 스킬(앞의 것이 우선, 최대 2개)
JobSkills.Categories = {
	warrior = { id = "warrior", name = "무인", skills = { "bash", "rally" } },
	gunner = { id = "gunner", name = "포수", skills = { "volley", "snipe" } },
	healer = { id = "healer", name = "성직·의술", skills = { "heal", "armor" } },
	navigator = { id = "navigator", name = "항해·탐험", skills = { "rally", "read" } },
	merchant = { id = "merchant", name = "상인·회계", skills = { "luck", "armor" } },
	scholar = { id = "scholar", name = "학자", skills = { "read", "snipe" } },
}

-- 직업 이름(한글·영문 role)에서 분류를 찾는 낱말. 위에서부터 먼저 맞는 분류가 이긴다.
local KEYWORDS: { { string | { string } } } = {
	{ "healer", { "성직", "수녀", "승려", "비구니", "순례", "pilgrim", "의사" } },
	{ "gunner", { "포수", "포술", "포병" } },
	{ "scholar", { "학자", "수석", "조수", "필사", "연구" } },
	{ "navigator", { "항해", "조타", "도선", "선장", "선원", "explorer", "여행자", "관측" } },
	{ "merchant", { "merchant", "상인", "회계", "장부", "농부", "농", "광", "감독" } },
	{ "warrior", { "soldier", "privateer", "pirate", "무사", "수군", "부선장", "귀족", "시종", "갑판장" } },
}

function JobSkills.categoryOf(job: string?): string
	if type(job) == "string" then
		for _, entry in KEYWORDS do
			for _, word in entry[2] :: { string } do
				if string.find(job, word, 1, true) then
					return entry[1] :: string
				end
			end
		end
	end
	return "warrior"
end

-- 동료 한 명이 쓸 스킬 목록 (분류 규칙 + 최대 2개)
function JobSkills.allySkills(job: string?): { string }
	local cat = JobSkills.Categories[JobSkills.categoryOf(job)]
	local out = {}
	for _, id in cat.skills do
		if #out >= JobSkills.MAX_ALLY_SKILLS then
			break
		end
		table.insert(out, id)
	end
	return out
end

-- 주인공 장착 스킬: want 는 장착하고 싶은 순서, available 은 지금 쓸 수 있는 것. 중복·없는 것은 빼고 최대 3개.
-- want 가 비어 있으면 available 의 앞에서부터 채운다.
function JobSkills.playerLoadout(want: { string }?, available: { string }): { string }
	local have: { [string]: boolean } = {}
	for _, id in available do
		have[id] = true
	end
	local out, seen = {}, {}
	local function add(id: string)
		if #out < JobSkills.MAX_PLAYER_SKILLS and have[id] and not seen[id] then
			seen[id] = true
			table.insert(out, id)
		end
	end
	for _, id in want or {} do
		add(id)
	end
	for _, id in available do
		add(id)
	end
	return out
end

return JobSkills
