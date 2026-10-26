#!/usr/bin/env python3
# 파일명: tools/baeksu-war-author-meshes.py
# 역할: 임의 모델 생성이 아닌, 검증된 CC0 원본 메시를 그대로 Roblox GLB로 변환한다.
# 실행: blender --background --disable-autoexec --python tools/baeksu-war-author-meshes.py -- /tmp/baeksu-art
import bpy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parent.parent
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path('/tmp/baeksu-art')
OUT.mkdir(parents=True,exist_ok=True)
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
