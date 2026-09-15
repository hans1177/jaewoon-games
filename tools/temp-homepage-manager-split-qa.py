from pathlib import Path
p=Path('tools/homepage-manager.mjs')
s=p.read_text()
old="top30PrimaryPlacementDocumented:operations.includes('홈페이지 게임 구현 = Top30')&&operations.includes('홈페이지의 **주 게임 구현 영역은 canonical Web Top30 그 자체**'),"
new="developmentAndTop30PlacementDocumented:operations.includes('개발게임 자동 표시와 Top30 분리')&&operations.includes('`productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시')&&operations.includes('### canonical Web Top30'),"
if s.count(old)!=1: raise SystemExit(f'old placement check count={s.count(old)}')
s=s.replace(old,new,1)
old2="console.log('HOMEPAGE_PRIMARY_GAME_SOURCE=CANONICAL_TOP30');console.log('HOMEPAGE_TOP30_ORDER=STRICT_IMPLEMENTATION_SCORE_DESC');"
new2="console.log('HOMEPAGE_DEVELOPMENT_SOURCE=DEVELOPMENT_QUEUE');console.log('HOMEPAGE_DEVELOPMENT_VISIBILITY=PROGRESS_ONLY');console.log('HOMEPAGE_TOP30_SOURCE=CANONICAL_TOP30');console.log('HOMEPAGE_TOP30_ORDER=STRICT_IMPLEMENTATION_SCORE_DESC');"
if s.count(old2)!=1: raise SystemExit(f'old source log count={s.count(old2)}')
s=s.replace(old2,new2,1)
old3="console.log('HOMEPAGE_RUNTIME_SYNC=TOP30_MAIN_WITH_COMPANY_RUNTIME_METADATA');"
new3="console.log('HOMEPAGE_RUNTIME_SYNC=DEVELOPMENT_QUEUE_PLUS_SEPARATE_TOP30');"
if s.count(old3)!=1: raise SystemExit(f'old runtime log count={s.count(old3)}')
s=s.replace(old3,new3,1)
p.write_text(s)
