# Orb Rush

Roblox 모바일 우선 점수 경쟁 게임.

## 핵심 루프

1. 10초 대기 후 90초 라운드가 시작된다.
2. 노란 오브를 직접 밟아 점수를 얻는다.
3. 빨간 위험 구역은 체력을 깎는다.
4. 라운드 종료 시 최고 점수 플레이어를 표시한다.
5. 결과 화면 뒤 다음 라운드로 반복한다.

## 권한 경계

- 점수 증가, 오브 생성/회수, 피해, 라운드 타이머, 승자 판정은 서버에서만 처리한다.
- 클라이언트는 HUD와 서버 상태 표시만 담당한다.
- 클라이언트→서버 점수/피해 RemoteEvent는 없다.
- 저장 기능은 아직 사용하지 않는다.

## 소스

- `shared/Config.luau`: 라운드와 밸런스 설정
- `server/Main.server.luau`: 서버 권한 게임 루프
- `client/Main.client.luau`: 모바일 우선 HUD
- `default.project.json`: Rojo DataModel 매핑

## 검증 경계

소스/계약 CI 통과는 Roblox 실제 런타임 PASS를 대신하지 않는다. 실제 Vibe3 검증 trajectory 승격에는 현재 리비전의 Roblox 런타임, 독립 QA, 회귀 검증, exact revision 증거가 추가로 필요하다.
