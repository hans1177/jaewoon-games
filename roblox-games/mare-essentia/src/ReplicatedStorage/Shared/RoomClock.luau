--!strict
-- 방 시계: 같은 서버(방)에서 같이 하는 사람들은 현실 시간에 맞춰 흐르는 하나의 시대 시계를 쓴다.
-- 현실 1분 = 게임 6일 (현실 1시간 ≈ 1년). 방 안에서는 항해·전투 같은 행동이 시대를 건너뛰게 하지 않는다.
-- 혼자 하기(솔로)는 지금처럼 행동으로 날짜가 흐른다. 비율은 게임 설정이다.

local R = {}

R.DAYS_PER_MINUTE = 6

-- 방이 만들어진 뒤 흐른 현실 초 → 게임 일수
function R.daysFor(elapsedSeconds: number): number
	return math.floor(math.max(0, elapsedSeconds) / 60 * R.DAYS_PER_MINUTE)
end

-- 같은 방·같은 번호·같은 날을 입력받아 누구에게나 같은 0~1 값을 돌려준다 (후속 사건 추첨용)
function R.hash01(seed: number, key: string, day: number): number
	local h = (seed * 31 + day * 17) % 2147483647
	for i = 1, #key do
		h = (h * 131 + string.byte(key, i)) % 2147483647
	end
	h = (h * 16807) % 2147483647
	return h / 2147483647
end

return R
