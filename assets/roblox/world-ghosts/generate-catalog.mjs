import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const [header,...lines]=fs.readFileSync(path.join(dir,'catalog.tsv'),'utf8').trimEnd().split('\n');
const columns=header.split('\t');
const rows=lines.map((line,index)=>{
  const values=line.split('\t');
  if(values.length!==columns.length)throw new Error(`Invalid catalogue row ${index+2}`);
  const row=Object.fromEntries(columns.map((key,i)=>[key,values[i]]));
  row.features=row.features.split(',');
  return {...row,index:index+1,provenance:'FOLKLORE_INSPIRED_ORIGINAL_DESIGN',productionVerified:false};
});
if(rows.length!==100 || new Set(rows.map(row=>row.id)).size!==100)throw new Error('Expected 100 unique skin IDs');
const literal=value=>Array.isArray(value)?`{${value.map(literal).join(',')}}`:JSON.stringify(value);
const output='-- Generated from catalog.tsv by generate-catalog.mjs; original visual interpretations.\nreturn {\n'+rows.map(row=>' {'+Object.entries(row).map(([key,value])=>`${key}=${literal(value)}`).join(',')+'},').join('\n')+'\n}\n';
const target=path.join(dir,'GhostSkinCatalog.luau');
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8')!==output)throw new Error('GhostSkinCatalog.luau is out of date');
}else fs.writeFileSync(target,output);
