#!/usr/bin/env python3
# 파일명: tools/baeksu-war-author-meshes.py
# 역할: 임의 모델 생성이 아닌, 검증된 CC0 원본 메시를 그대로 Roblox GLB로 변환한다.
# 실행: blender --background --disable-autoexec --python tools/baeksu-war-author-meshes.py -- /tmp/baeksu-art
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path('/tmp/baeksu-art')
OUT.mkdir(parents=True,exist_ok=True)
if '--game-id=fantasy-survival' in sys.argv:
 # 공식 Model API가 받는 원본 FBX를 변형 없이 전달한다. Blender/도형 생성 없음.
 manifest_path=ROOT/'roblox-games/fantasy-survival/native-assets.json'
 manifest=json.loads(manifest_path.read_text())
 if manifest.get('gameId')!='fantasy-survival' or manifest.get('ownerApproved') is not True or manifest.get('license')!='CC0-1.0' or set(manifest.get('models',{}))!={'bee','wolf','golem','deer','boar','rabbit','tree','bat','mushroom','skeleton','ruin'}:
  raise RuntimeError('FANTASY_NATIVE_APPROVED_MANIFEST_REQUIRED')
 records={}
 for role,row in manifest['models'].items():
  # [사슴 원본] 기존 Gobkit 등록본과 Quaternius CC0 46관절 사슴만 검증한다.
  verified_deer_license=(role=='deer' and (
   (row.get('sourcePath')=='assets/shared/forest/deer-real.glb'
    and row.get('licenseEvidence')=='https://gobkit.com/api/free')
   or (row.get('sourcePath')=='assets/shared/forest/deer-animated.glb'
    and row.get('licenseEvidence')=='https://quaternius.com/packs/ultimateanimatedanimals.html')))
  verified_license=(row.get('licenseEvidence','').startswith('https://opengameart.org/content/')
   or (role in {'tree','ruin'} and row.get('licenseEvidence')=='https://kenney.nl/assets/fantasy-town-kit')
   or verified_deer_license)
  if not re.fullmatch('[a-f0-9]{64}',row.get('sourceSha256','')) or not verified_license:
   raise RuntimeError('FANTASY_NATIVE_SOURCE_PROVENANCE_INVALID:'+role)
  if row.get('sourcePath'):
   source=(ROOT/row['sourcePath']).resolve()
   if ((not source.is_relative_to((ROOT/'assets/shared/forest').resolve())
    and not (role in {'tree','ruin'} and source==(ROOT/('assets/shared/party/tree.glb' if role=='tree' else 'assets/shared/party/wall-broken.glb')).resolve())
    and not (role in {'bat','mushroom','skeleton'} and source.is_relative_to((ROOT/'assets/roblox/actors/sources').resolve())))
    or source.suffix.lower() not in ('.fbx','.glb')):
    raise RuntimeError('FANTASY_NATIVE_SOURCE_PATH_INVALID:'+role)
   data=source.read_bytes()
  else:
   url=row.get('archiveUrl','')
   if not url.startswith('https://opengameart.org/sites/default/files/') or not url.endswith('.zip'):
    raise RuntimeError('FANTASY_NATIVE_ARCHIVE_URL_INVALID')
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Jaewoon-Game-Asset-Provenance/1.0'}),timeout=60) as response:
    if not response.url.startswith('https://opengameart.org/'):
     raise RuntimeError('FANTASY_NATIVE_ARCHIVE_REDIRECT_REJECTED')
    archive=response.read(70*1024*1024+1)
   if len(archive)>70*1024*1024 or hashlib.sha256(archive).hexdigest()!=row.get('archiveSha256'):
    raise RuntimeError('FANTASY_NATIVE_ARCHIVE_HASH_MISMATCH')
   with zipfile.ZipFile(io.BytesIO(archive)) as z:
    info=z.getinfo(row['archiveEntry'])
    if info.file_size>20*1024*1024 or '..' in Path(info.filename).parts or Path(info.filename).is_absolute():
     raise RuntimeError('FANTASY_NATIVE_ARCHIVE_ENTRY_INVALID')
    data=z.read(info)
  ext=Path(row.get('sourcePath') or row.get('archiveEntry','')).suffix.lower()
  signature_ok=data.startswith(b'Kaydara FBX Binary') if ext=='.fbx' else data.startswith(b'glTF') if ext=='.glb' else False
  if not signature_ok or len(data)>20*1024*1024 or hashlib.sha256(data).hexdigest()!=row['sourceSha256']:
   raise RuntimeError('FANTASY_NATIVE_ORIGINAL_HASH_MISMATCH:'+role)
  (OUT/(role+ext)).write_bytes(data)
  records[role]={'sourceFile':row.get('sourcePath') or row['archiveUrl']+'#'+row['archiveEntry'],
   'sourceSha256':row['sourceSha256'],'sha256':row['sourceSha256'],'format':ext.lstrip('.'),
   'license':'CC0-1.0','licenseEvidence':row['licenseEvidence'],'bytes':len(data)}
 # [마력숲 마을] 기존 Kenney 원본 GLB만 추가한다. 11종 생물/숲 모델은 그대로 유지한다.
 village=json.loads((ROOT/'roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json').read_text()).get('villagePrefabs',{})
 if village.get('sourceVerified') is True:
  catalog_path=(ROOT/village.get('sourceManifest','')).resolve()
  if catalog_path!=(ROOT/'assets/shared/party/sources.json').resolve():
   raise RuntimeError('FANTASY_VILLAGE_SOURCE_CATALOG_MISMATCH')
  catalog=json.loads(catalog_path.read_text())
  if village.get('version')!=1 or len(village.get('models',{}))!=23:
   raise RuntimeError('FANTASY_VILLAGE_APPROVED_SOURCE_SET_REQUIRED')
  priority=json.loads((ROOT/'assets/external/simple-rpg/priority-v1/manifest.json').read_text())
  for role,row in village['models'].items():
   if not re.fullmatch(r'village[A-Z][A-Za-z]+',role):
    raise RuntimeError('FANTASY_VILLAGE_ROLE_INVALID')
   filename=row.get('sourceFile','')
   source=(ROOT/filename).resolve()
   is_whole_house=role in {'villageHouseA','villageHouseB','villageHouseC','villageHouseD'}
   if is_whole_house:
    # [원본 완성 집 다운로드·변환] 이미 다운로드된 CC0 .blend 압축을 SHA256으로 검증한다.
    # Blender는 원본 메시를 GLB로 내보내기만 하며 도형 합성/Part 가짜 대체는 하지 않는다.
    if not source.is_relative_to((ROOT/'assets/external/simple-rpg/priority-v1').resolve()) or source.suffix!='.zip':
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_ARCHIVE_PATH_INVALID:'+role)
    pack=next((x for x in priority.get('packs',[]) if x.get('file')==source.name),None)
    if not pack or pack.get('licenseDeclared')!='CC0-1.0' or pack.get('sha256')!=row.get('sourceSha256') or row.get('licenseEvidence')!='https://opengameart.org/content/medieval-house-pack':
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_LICENSE_INVALID:'+role)
    archive=source.read_bytes()
    if len(archive)!=pack.get('bytes') or hashlib.sha256(archive).hexdigest()!=pack['sha256']:
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_ARCHIVE_HASH_INVALID:'+role)
    if shutil.which('blender') is None:
     raise RuntimeError('FANTASY_VILLAGE_BLENDER_EXPORTER_REQUIRED:'+role)
    with tempfile.TemporaryDirectory(prefix='forest-cc0-house-') as temporary:
     temporary=Path(temporary)
     with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
      blends=[]
      total=0
      for entry in zipped.infolist():
       file_path=Path(entry.filename)
       if entry.is_dir():continue
       if entry.file_size>90*1024*1024 or file_path.is_absolute() or '..' in file_path.parts:
        raise RuntimeError('FANTASY_VILLAGE_HOUSE_ARCHIVE_ENTRY_UNSAFE:'+role)
       total+=entry.file_size
       if total>145*1024*1024:raise RuntimeError('FANTASY_VILLAGE_HOUSE_ARCHIVE_EXPANDED_TOO_LARGE:'+role)
       target=temporary/file_path
       target.parent.mkdir(parents=True,exist_ok=True)
       target.write_bytes(zipped.read(entry))
       if target.suffix.lower()=='.blend':blends.append(target)
     if len(blends)!=1 or not blends[0].read_bytes().startswith(b'BLENDER'):
      raise RuntimeError('FANTASY_VILLAGE_HOUSE_ORIGINAL_BLEND_REQUIRED:'+role)
     output=OUT/(role+'.glb')
     expression=(
      'import bpy\n'
      + 'bpy.ops.wm.open_mainfile(filepath='+repr(str(blends[0]))+')\n'
      + "if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')\n"
      + "bpy.ops.object.select_all(action='DESELECT')\n"
      + "for obj in bpy.data.objects:\n"
      + " if obj.type=='MESH':obj.select_set(True)\n"
      + 'bpy.ops.export_scene.gltf(filepath='+repr(str(output))+",export_format='GLB',use_selection=True)\n"
     )
     subprocess.run(['blender','--background','--disable-autoexec','--python-use-system-env','--python-expr',expression],
      check=True,timeout=180)
    if not output.is_file():
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_BLENDER_EXPORT_MISSING:'+role)
    data=output.read_bytes()
    if len(data)<1000 or len(data)>18*1024*1024 or not data.startswith(b'glTF'):
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_GLTF_SIZE_OR_FORMAT_INVALID:'+role)
    if len(data)<20 or struct.unpack_from('<I',data,4)[0]!=2:
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_GLTF_VERSION_INVALID:'+role)
    json_bytes=struct.unpack_from('<I',data,12)[0]
    document=json.loads(data[20:20+json_bytes])
    if len(document.get('meshes',[]))<1:
     raise RuntimeError('FANTASY_VILLAGE_HOUSE_NATIVE_GEOMETRY_EMPTY:'+role)
    digest=hashlib.sha256(data).hexdigest()
    records[role]={'sourceFile':filename,'sourceSha256':row['sourceSha256'],
     'sha256':digest,'format':'glb','license':'CC0-1.0',
     'licenseEvidence':row['licenseEvidence'],'bytes':len(data),
     'sourceModel':blends[0].name}
    continue
   if not source.is_relative_to((ROOT/'assets/shared/party').resolve()) or source.suffix!='.glb':
    raise RuntimeError('FANTASY_VILLAGE_ASSET_PATH_INVALID:'+role)
   entry=next((x for x in catalog.get('records',[]) if x.get('file')==filename),None)
   if not entry or entry.get('license')!='CC0-1.0' or entry.get('sha256')!=row.get('sourceSha256') or row.get('licenseEvidence')!='https://kenney.nl/assets/fantasy-town-kit':
    raise RuntimeError('FANTASY_VILLAGE_SOURCE_LICENSE_INVALID:'+role)
   data=source.read_bytes()
   if not data.startswith(b'glTF') or not (1000<len(data)<20*1024*1024) or hashlib.sha256(data).hexdigest()!=row.get('sourceSha256'):
    raise RuntimeError('FANTASY_VILLAGE_SOURCE_DIGEST_MISMATCH:'+role)
   (OUT/(role+'.glb')).write_bytes(data)
   records[role]={'sourceFile':filename,'sourceSha256':row['sourceSha256'],
    'sha256':row['sourceSha256'],'format':'glb','license':'CC0-1.0',
    'licenseEvidence':row['licenseEvidence'],'bytes':len(data)}
 (OUT/'provenance.json').write_text(json.dumps({'version':5,'gameId':'fantasy-survival',
  'sourceManifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'roles':records},indent=2)+'\n')
 print('FANTASY_NATIVE_ORIGINALS_VERIFIED='+str(len(records)))
 sys.exit(0)

import bpy
ACTORS=json.loads((ROOT/'assets/roblox/actors/manifest.json').read_text())
WILDLIFE=json.loads((ROOT/'assets/external/simple-rpg/wildlife/manifest.json').read_text())
PRIORITY=json.loads((ROOT/'assets/external/simple-rpg/priority-v1/manifest.json').read_text())
EXTERNAL=json.loads((ROOT/'assets/external/simple-rpg/manifest.json').read_text())

# 에셋 역할은 기존 게임 8종을 보존. 유사 후보는 오너의 4차 명시 승인을 따른다.
# 형식: 라이브러리 출처, 원본 파일, ZIP 내부에서 검색할 실물 메시 이름.
ROLES={
 'sparrow':('wildlife','five-animals.zip','bird'),
 'ant':('wildlife','ant.blend','ant'),
 'beetle':('wildlife','shellbug.zip','bug'),
 'wolf':('wildlife','wolf-eagle.zip','wolf'),
 'turtle':('wildlife','turtle.blend','turtle'),
 'slime':('actor','quaternius-monsters/FBX/Slime.fbx','Slime'),
 'golem':('actor','quaternius-cute/FBX/Cyclops.fbx','Cyclops'),
 'dragon':('actor','quaternius-monsters/FBX/Dragon.fbx','Dragon'),
 'home':('priority','medieval-house-a.zip','house'),
 'gate':('priority','kenney-castles.zip','gate'),
 'tree':('actor','quaternius-cute/FBX/Tree.fbx','Tree'),
 'rock':('priority','kenney-hexagon-world.zip','stone-rocks'),
}
EXPECTED=list(ROLES)
FORMATS={'.glb','.gltf','.fbx','.obj','.blend'}
record={}
def sha(data):
 return hashlib.sha256(data).hexdigest()
def download_verified(url,digest):
 if not url.startswith('https://opengameart.org/sites/default/files/'):
  raise RuntimeError('UNAPPROVED_DOWNLOAD_SOURCE:'+url)
 request=urllib.request.Request(url,headers={'User-Agent':'Jaewoon-Game-Asset-Provenance/1.0'})
 with urllib.request.urlopen(request,timeout=60) as response:
  data=response.read(70*1024*1024+1)
 if len(data)>70*1024*1024 or sha(data)!=digest:
  raise RuntimeError('DOWNLOADED_ASSET_DIGEST_MISMATCH')
 return data
def get_source(kind,filename):
 if kind=='actor':
  path=ROOT/'assets/roblox/actors/sources'/filename
  family=filename.split('/')[0]
  item=next(x for x in ACTORS['sources'] if x['id']==family)
  record=next(x for x in item['sourceFiles'] if x['path']==path.relative_to(ROOT).as_posix())
  return path,record['sha256'],item['sourceUrl'],None,item['license'],filename
 if kind=='wildlife':
  item=next(x for x in WILDLIFE['packs'] if x['file']==filename)
  return ROOT/'assets/external/simple-rpg/wildlife'/filename,item['sha256'],item['licenseEvidence'],item['sourceUrl'],item['license'],filename
 if kind=='priority':
  item=next(x for x in PRIORITY['packs'] if x['file']==filename)
  return ROOT/'assets/external/simple-rpg/priority-v1'/filename,item['sha256'],item['licenseSourceUrl'],item['sourceUrl'],item['licenseDeclared'],filename
 raise RuntimeError('UNKNOWN_SOURCE')
def choose_zip_model(zipf,target):
 candidates=[]
 for entry in zipf.infolist():
  path=Path(entry.filename)
  if entry.is_dir() or path.suffix.lower() not in FORMATS or entry.file_size>60*1024*1024:
   continue
  if '..' in path.parts or entry.filename.startswith('/'):
   continue
  stem=path.stem.lower()
  wanted=target.lower().replace('_','-')
  if wanted not in stem.replace('_','-'):
   continue
  # 원본 GLB/FBX 우선. 후보 여러 개면 일반 모델을 우선하며 애니메이션 전용 파일은 제외.
  weight={'.glb':0,'.gltf':1,'.fbx':2,'.blend':3,'.obj':4}[path.suffix.lower()]
  if stem==wanted:weight-=10
  if any(x in stem for x in ('animation','walk','run','rig','skeleton','collision')):weight+=8
  candidates.append((weight,len(path.parts),len(stem),entry.filename))
 if not candidates:raise RuntimeError('SOURCE_MODEL_NOT_FOUND:'+target)
 candidates.sort()
 return candidates[0][3]
def import_source(path):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 ext=path.suffix.lower()
 if ext=='.blend':
  bpy.ops.wm.open_mainfile(filepath=str(path),load_ui=False)
 elif ext=='.fbx':bpy.ops.import_scene.fbx(filepath=str(path))
 elif ext=='.obj':
  if hasattr(bpy.ops.wm,'obj_import'):bpy.ops.wm.obj_import(filepath=str(path))
  else:bpy.ops.import_scene.obj(filepath=str(path))
 elif ext in ('.glb','.gltf'):bpy.ops.import_scene.gltf(filepath=str(path))
 else:raise RuntimeError('UNSUPPORTED_MODEL:'+ext)
 # 원본 장면의 카메라/조명/외부 스크립트는 결과에 넣지 않는다.
 for ob in list(bpy.data.objects):
  if ob.type not in ('MESH','ARMATURE','EMPTY'):
   bpy.data.objects.remove(ob,do_unlink=True)
 meshes=[o for o in bpy.data.objects if o.type=='MESH' and len(o.data.vertices)>=3 and len(o.data.polygons)>=1]
 if not meshes:raise RuntimeError('REAL_MESH_NOT_FOUND:'+str(path))
 for ob in bpy.data.objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 return sum(len(o.data.polygons) for o in meshes)
for role,(family,name,needle) in ROLES.items():
 src,digest,license_url,download_url,license_tag,source_name=get_source(family,name)
 if license_tag not in ('CC0','CC0-1.0'):
  raise RuntimeError('LICENSE_NOT_CC0:'+role)
 data=src.read_bytes() if src.exists() else b''
 # Git LFS 포인터는 실물 에셋이 아니므로 원본 출처에서 다운로드하고 SHA256을 재검증한다.
 if sha(data)!=digest:
  if not download_url:raise RuntimeError('ASSET_SOURCE_MISSING_OR_HASH_FAILED:'+role)
  data=download_verified(download_url,digest)
 with tempfile.TemporaryDirectory(prefix='baeksu-cc0-') as tmp:
  tmpdir=Path(tmp)
  suffix=Path(name).suffix.lower()
  if suffix=='.zip':
   package=tmpdir/'source.zip';package.write_bytes(data)
   with zipfile.ZipFile(package) as z:
    match=choose_zip_model(z,needle)
    # 안전하게 필요한 모델 파일만 꺼내되 OBJ/GLTF의 동반 MTL/텍스처는 허용한다.
    for info in z.infolist():
     entry=Path(info.filename)
     if info.is_dir() or '..' in entry.parts or info.filename.startswith('/') or info.file_size>60*1024*1024:continue
     if entry.suffix.lower() not in FORMATS.union({'.mtl','.png','.jpg','.jpeg','.webp','.bin'}):continue
     dst=tmpdir/'unpacked'/entry
     dst.parent.mkdir(parents=True,exist_ok=True)
     with z.open(info) as f,dst.open('wb') as o:shutil.copyfileobj(f,o)
    model=tmpdir/'unpacked'/match
  else:
   model=tmpdir/Path(name).name
   model.write_bytes(data)
  polygons=import_source(model)
  target=OUT/(role+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_apply=True,export_animations=False)
  output=target.read_bytes()
  if output[:4]!=b'glTF' or len(output)<1000 or polygons<4:
   raise RuntimeError('MODEL_CONVERSION_NOT_VERIFIED:'+role)
  record[role]={'sourceFile':str(src.relative_to(ROOT)),'sourceSha256':digest,
      'license':'CC0-1.0','licenseEvidence':license_url,'sourceModel':str(model.relative_to(tmpdir)) if model.is_relative_to(tmpdir) else model.name,
      'modelPolygons':polygons,'glbSha256':sha(output),'bytes':len(output)}
  print('BAEKSU_CC0_READY:'+role+':'+record[role]['glbSha256'])
(OUT/'provenance.json').write_text(json.dumps({'version':4,'roles':record},indent=2,ensure_ascii=False)+'\n')
assert set(record)==set(EXPECTED)
print('BAEKSU_CC0_MODEL_COUNT='+str(len(record)))
