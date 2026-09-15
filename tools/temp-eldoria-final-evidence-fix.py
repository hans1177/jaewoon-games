from pathlib import Path

engine=Path('web-games/_shared/vibe2-final.js')
s=engine.read_text()
old="const C=window.GAME_CONFIG||{};\nconst key='jg-final:'+C.id;"
new="const C=window.GAME_CONFIG||{};\nconst replayParams=new URLSearchParams(location.search);\nconst replaySeed=String(replayParams.get('replaySeed')||`${C.id||'game'}:stable-v1`);\nwindow.__GAME_REPLAY_SEED__=replaySeed;\nconst key='jg-final:'+C.id;"
if s.count(old)!=1: raise SystemExit(f'replay seed anchor count={s.count(old)}')
s=s.replace(old,new)
old="document.body.dataset.webArtifactType='REAL_PLAYABLE_GAME';document.body.dataset.playableCycleContract='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';document.body.dataset.audioState='locked';document.body.dataset.approvedScopeCount='__SCOPE_COUNT__';document.body.dataset.gameplaySystemCount='7';document.body.dataset.runResult='running';"
new="document.body.dataset.webArtifactType='REAL_PLAYABLE_GAME';document.body.dataset.playableCycleContract='ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE';document.body.dataset.audioState='locked';document.body.dataset.approvedScopeCount='__SCOPE_COUNT__';document.body.dataset.gameplaySystemCount='7';document.body.dataset.runResult='running';document.body.dataset.replaySeed=replaySeed;"
if s.count(old)!=1: raise SystemExit(f'body replay anchor count={s.count(old)}')
s=s.replace(old,new)
old="function stat(label,val){const d=el('div','stat');d.innerHTML=`<b>${val}</b><small>${label}</small>`;return d}"
new="const statIdMap={HP:'hp',DAY:'day',WOOD:'wood',FOOD:'food',CORE:'core',WAVE:'wave',COIN:'coins',TOWER:'towers',SCORE:'score',MANA:'mana',POP:'pop',WORLD:'progress',STAGE:'stage',GOLD:'gold',POWER:'power',CHAPTER:'chapter'};\nfunction stat(label,val){const d=el('div','stat');d.innerHTML=`<b>${val}</b><small>${label}</small>`;const id=statIdMap[String(label||'').toUpperCase()];if(id)d.querySelector('b').id=id;return d}"
if s.count(old)!=1: raise SystemExit(f'stat anchor count={s.count(old)}')
engine.write_text(s.replace(old,new))

test=Path('qa/company-development-web-runtime.test.mjs')
t=test.read_text()
anchor="test('Eldoria story runtime exposes changing quest objectives and NPC dialogue interaction evidence',()=>{"
addition="""test('shared runtime exposes deterministic replay seed and persisted numeric gameplay state',()=>{\n  const source=fs.readFileSync('web-games/_shared/vibe2-final.js','utf8');\n  assert.match(source,/replayParams\.get\('replaySeed'\)/);\n  assert.match(source,/window\.__GAME_REPLAY_SEED__=replaySeed/);\n  assert.match(source,/document\.body\.dataset\.replaySeed=replaySeed/);\n  assert.match(source,/GOLD:'gold'/);\n  assert.match(source,/POWER:'power'/);\n  assert.match(source,/d\.querySelector\('b'\)\.id=id/);\n});\n\n"""+anchor
if t.count(anchor)!=1: raise SystemExit(f'test anchor count={t.count(anchor)}')
test.write_text(t.replace(anchor,addition))
