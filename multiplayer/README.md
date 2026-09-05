# 재운게임즈 멀티 환경

## 구성
- 게임 클라이언트: Godot / 웹게임
- 인증: Supabase Auth (이메일 가입, 로그인, 비밀번호 재설정)
- 매칭/실시간 서버: Cloudflare Workers + Durable Objects + WebSocket
- 협동: 최대 4인
- 대전: 기본 2인
- 친구 플레이: 초대 코드 기반 비공개 세션
- 빠른 매칭: 공개 세션 자동 참가/생성
- 재전: 같은 세션 참가자 전원 동의 시 재전 신호

## API
- `POST /auth/signup` `{email,password,nickname}`
- `POST /auth/login` `{email,password}`
- `POST /auth/refresh` `{refresh_token}`
- `POST /auth/recover` `{email}`
- `GET /auth/me` Bearer 토큰
- `POST /matchmake` Bearer 토큰 + `{mode:"coop"|"pvp"}`
- `POST /friend/create` Bearer 토큰 + `{mode:"coop"|"pvp"}`
- `POST /friend/join` Bearer 토큰 + `{inviteCode}`
- `GET /room/<roomId>?token=<access_token>` WebSocket

## Cloudflare 설정
`multiplayer/`에서 Wrangler로 Worker를 배포합니다.

필수 환경값:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_PUBLISHABLE_KEY`는 Supabase의 publishable/anon 계열 공개 클라이언트 키이며 서비스 역할 키를 사용하지 않습니다.

예시 설정:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler deploy
```

## Supabase 설정
1. 새 프로젝트 생성
2. Authentication에서 Email/Password 활성화
3. Site URL을 `https://jaewoon-games.pages.dev`로 설정
4. Redirect URLs에도 위 사이트 주소를 허용
5. Project URL과 publishable key를 Cloudflare Worker secret으로 등록

## 게임에서의 기본 흐름
1. 가입/로그인 후 access token 확보
2. 협동은 `mode=coop`, 대전은 `mode=pvp`로 `/matchmake` 호출
3. 받은 `roomId`로 WebSocket 접속
4. 위치/공격/체력 등의 게임 이벤트는 WebSocket 메시지로 교환
5. 서버 권한 판정이 필요한 게임은 게임별로 `GameRoom` 검증 로직을 추가

## 주의
현재 파일은 공통 멀티 기반입니다. 각 게임의 실제 위치/전투/적/점수 동기화 규칙은 게임을 멀티화할 때 별도로 연결해야 합니다. 기존 게임 수치와 저장키는 변경하지 않습니다.
