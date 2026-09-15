from pathlib import Path

p=Path('tools/company-development-web-bootstrap.mjs')
s=p.read_text()
old="  if(/mobileux|mobile|touch/.test(text))return 2;\n  if(/explor|area|quest|discover|character/.test(text))return 0;\n  if(/progress through|real ending|complete story|major encounter/.test(text))return 4;\n  if(/fight|combat|attack|enemy|boss/.test(text))return index%2===0?3:1;\n  if(/equip|skill|upgrade|growth|level/.test(text))return 3;"
new="  if(/mobileux|mobile|touch/.test(text))return 2;\n  if(/explor|area|quest|discover|character/.test(text))return 0;\n  if(/fight\\s+enemies|combat|attack/.test(text))return index%2===0?3:1;\n  if(/progress through|real ending|complete story|major encounter/.test(text))return 4;\n  if(/enemy|boss/.test(text))return index%2===0?3:1;\n  if(/equip|skill|upgrade|growth|level/.test(text))return 3;"
if s.count(old)!=1: raise SystemExit(f'mapping target count={s.count(old)}')
p.write_text(s.replace(old,new))

t=Path('qa/company-development-web-runtime.test.mjs')
q=t.read_text()
replacements={
"'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location.'":"'Fight enemies and bosses, gain equipment or skills, and use that growth to reach the next story location or major encounter.'",
"'Progress through the complete story arc to a final boss and a real ending.'":"'Progress through the complete story arc to a final boss and a real ending, with optional post-game or sequel hooks kept separate from the base conclusion.'",
"'Explore an area, meet characters, accept or advance story quests, and discover information.'":"'Explore an area, meet characters, accept or advance story quests, and discover information that moves the main narrative forward.'",
"mobileUx:'touch-first story controls'":"mobileUx:'Story Driven'",
}
for old_text,new_text in replacements.items():
    if old_text not in q: raise SystemExit(f'fixture target missing: {old_text}')
    q=q.replace(old_text,new_text)
old_assert="  assert.equal(output.review.pass,true);\n  assert.equal(output.approvedScopeInventory.length,9);"
new_assert="  assert.equal(output.review.pass,true);\n  assert.equal(output.review.mechanicCount,5);\n  assert.equal(output.approvedScopeInventory.length,9);"
if q.count(old_assert)!=1: raise SystemExit(f'assert target count={q.count(old_assert)}')
t.write_text(q.replace(old_assert,new_assert))
