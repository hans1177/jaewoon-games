from pathlib import Path

validator=Path('tools/company-development-web-gameplay-validation.mjs')
s=validator.read_text()
old="numeric=(el,names)=>{const value=attr(el,names),n=Number(value);return Number.isFinite(n)?n:null;}"
new="numeric=(el,names)=>{const value=attr(el,names);if(value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}"
if s.count(old)!=1: raise SystemExit(f'numeric target count={s.count(old)}')
s=s.replace(old,new)
old_regex="/(move|walk|jump|dash|explore|reposition|route|path|이동|걷|점프|대시|탐험|경로|위치)/i"
new_regex="/(move|walk|jump|dash|explore|reposition|route|path|이동|걷|점프|대시|탐험|탐색|경로|위치)/i"
if s.count(old_regex)!=1: raise SystemExit(f'spatial input regex count={s.count(old_regex)}')
validator.write_text(s.replace(old_regex,new_regex))

test=Path('qa/company-development-web-runtime.test.mjs')
t=test.read_text()
anchor="test('shared preserved engine binds more than five approved scopes without model regeneration',async()=>{"
addition="""test('Web runtime spatial detector does not treat absent coordinates as 3D and recognizes Korean exploration input',()=>{
  const source=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
  assert.ok(source.includes(\"if(value==='')return null;\"));
  assert.match(source,/탐험\\|탐색\\|경로/);
  assert.match(source,/detected3D=spatialDimension==='3d'\\|\\|\\[playerPosition\\.x,playerPosition\\.y,playerPosition\\.z\\]\\.every\\(Number\\.isFinite\\)/);
});

"""+anchor
if t.count(anchor)!=1: raise SystemExit(f'test anchor count={t.count(anchor)}')
test.write_text(t.replace(anchor,addition))
