from pathlib import Path
p=Path('tools/temp-shared-scope-patch.py')
s=p.read_text()
old="""  if(/mobileux|mobile|touch/.test(text))return 2;
  if(/fight|combat|attack|enemy|boss/.test(text))return index%2===0?3:1;
  if(/progress through|final boss|real ending|advance|next story|major encounter|complete story/.test(text))return 4;
  if(/explor|area|quest|discover|character|story/.test(text))return 0;
  if(/equip|skill|upgrade|growth|level/.test(text))return 3;
"""
new="""  if(/mobileux|mobile|touch/.test(text))return 2;
  if(/explor|area|quest|discover|character/.test(text))return 0;
  if(/progress through|real ending|complete story|major encounter/.test(text))return 4;
  if(/fight|combat|attack|enemy|boss/.test(text))return index%2===0?3:1;
  if(/equip|skill|upgrade|growth|level/.test(text))return 3;
"""
if s.count(old)!=1: raise SystemExit(f'mapping target count={s.count(old)}')
s=s.replace(old,new)
old2="  assert.match(html,/data-area=/);"
new2="  assert.match(html,/dataset\\.area=/);"
if s.count(old2)!=1: raise SystemExit(f'assert target count={s.count(old2)}')
p.write_text(s.replace(old2,new2))
