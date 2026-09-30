# 파일명: assets/roblox/midnight-manor/build.py
"""괴물 가족의 저택: 블렌더 기본 메시 + 내부 CC0 GLB + 처녀귀신 원본 재구성.

Downloaded CC0 meshes remain in sources/ with exact licenses and hashes.
The manor, NPC silhouettes and articulated gag props are original geometry.
Coordinates: metres/studs, Y up, front courtyard towards positive Z.
"""
from pathlib import Path
import copy, hashlib, json, math, shutil, struct, tarfile
import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'sources'
for pack in ['graveyard','furniture']:
    if not (SOURCE/pack).exists():
        with tarfile.open(SOURCE/(pack+'.tar.gz')) as archive:
            archive.extractall(SOURCE/pack,filter='data')
OUT = ROOT / 'generated'
OUT.mkdir(parents=True, exist_ok=True)

def read_glb(path):
    raw = path.read_bytes()
    assert raw[:4] == b'glTF' and struct.unpack_from('<I', raw, 4)[0] == 2
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+size])
    offset = 20 + size
    return doc, raw[offset+8:] if offset < len(raw) else b''

# 블렌더 장면 · 좌표 정규화: 로블록스 Y 위, +Z 정면 → 블렌더 Z 위, -Y 정면.
import bpy
from mathutils import Vector, Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)

def xyz(p):
    return (p[0], -p[2], p[1])

class Scene:
    def __init__(self):
        self.collection = bpy.data.collections.new('Manor')
        bpy.context.scene.collection.children.link(self.collection)
        self.palette = {}
        self.cache = {}
        self.tinted_images = {}

    def material(self, name, color):
        if name in self.palette:
            return self.palette[name]
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*color, 1)
        m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (*color, 1)
        bs.inputs['Roughness'].default_value = .48 if name in ['brass','glass'] else .76
        bs.inputs['Metallic'].default_value = .65 if name == 'brass' else 0
        m['manorFinish']={'wood':'Wood','plum':'Fabric','teal':'Fabric','red':'Fabric','stone':'Slate','roof':'Slate','brass':'Metal','courtyard':'Cobblestone'}.get(name,'SmoothPlastic')
        if name in ['wood','plum','stone','teal','brass','red']:
            # 작고 반복 가능한 질감. GLB 안에 내장하므로 외부 텍스처 요청이 없다.
            n = 256
            yy,xx = np.mgrid[0:n,0:n]
            grain = np.random.default_rng(17).uniform(-.05,.05,(n,n))
            if name == 'wood':
                pattern = .87 + .13*np.sin(xx*.55 + np.sin(yy*.038)*3)+grain
            elif name in ['plum','teal']:
                petal=np.cos(xx*math.pi/32)*np.cos(yy*math.pi/32)
                pattern=.82+.25*(np.abs(petal)>.73)+.08*np.cos(xx*math.pi/8)+grain*.35
            elif name == 'red':
                pattern=.84+.05*np.sin(xx*math.pi)+.05*np.cos(yy*math.pi)+.08*np.cos(xx*.045)+grain*.4
            elif name == 'stone':
                pattern=.86+.10*np.sin(xx*.049)*np.cos(yy*.061)+grain*1.5
            else:
                pattern = .90 + grain + .07*np.sin(xx*.071+yy*.09)
            pixels=np.ones((n,n,4),dtype=np.float32)
            for i,c in enumerate(color): pixels[:,:,i]=np.clip(c*pattern,0,1)
            if name=='brass':
                patina=np.clip(np.sin(xx*.033)*np.cos(yy*.05)-.5,0,.5)*.3
                pixels[:,:,0]*=1-patina;pixels[:,:,1]+=patina*.055;pixels[:,:,2]+=patina*.03
            img=bpy.data.images.new(name+'_256',width=n,height=n)
            img.pixels.foreach_set(pixels.ravel());img.pack()
            tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
            m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        self.palette[name]=m
        return m

    def mesh(self,name,verts,faces,material):
        data=bpy.data.meshes.new(name)
        data.from_pydata([xyz(v)for v in verts],[],faces)
        data.materials.append(material);data.update()
        uv=data.uv_layers.new(name='UVMap')
        for face in data.polygons:
            normal=face.normal
            axes=(0,1) if abs(normal.z)>.6 else (0,2) if abs(normal.y)>.6 else (1,2)
            coords=[data.vertices[data.loops[i].vertex_index].co for i in face.loop_indices]
            lo=[min(v[a]for v in coords)for a in axes];hi=[max(v[a]for v in coords)for a in axes]
            for i,v in zip(face.loop_indices,coords):
                uv.data[i].uv=tuple(v[a]*.22 for a in axes)
        return data

    def node(self,name,mesh=None,pos=(0,0,0),rot=0,scale=None,parent=None):
        o=bpy.data.objects.new(name,mesh);self.collection.objects.link(o)
        o.parent=parent;o.location=xyz(pos);o.rotation_euler.z=rot
        if scale:o.scale=(scale[0],scale[2],scale[1])
        return o

    def box(self,name,pos,size,mat,rot=0,parent=None,lean=0):
        x,y,z=[v/2 for v in size]
        v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
        for p in v:
            if p[1]>0:p[0]+=lean
        f=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]]
        o=self.node(name,self.mesh(name,v,f,mat),pos,rot,parent=parent)
        bevel=o.modifiers.new('Carved_edges','BEVEL');bevel.width=min(.085,min(size)*.18);bevel.segments=2
        return o

    def lathe(self,name,pos,r0,r1,height,mat,sides=24,parent=None):
        sides=max(20,sides);v=[]
        for r,y in [(r0,-height/2),(r1,height/2)]:
            for i in range(sides):
                a=math.tau*i/sides;v.append((math.cos(a)*r,y,math.sin(a)*r))
        f=[list(reversed(range(sides))),list(range(sides,sides*2))]
        f += [[i,(i+1)%sides,(i+1)%sides+sides,i+sides]for i in range(sides)]
        data=self.mesh(name,v,f,mat)
        for face in data.polygons:face.use_smooth=len(face.vertices)==4
        return self.node(name,data,pos,parent=parent)

    def ellipsoid(self,name,pos,size,mat,parent=None):
        sides=16;rings=10;v=[]
        for j in range(rings+1):
            b=math.pi*j/rings
            for i in range(sides):
                a=math.tau*i/sides
                v.append((math.sin(b)*math.cos(a)*size[0]/2,math.cos(b)*size[1]/2,math.sin(b)*math.sin(a)*size[2]/2))
        f=[]
        for j in range(rings):
            for i in range(sides):
                a=j*sides+i;b=j*sides+(i+1)%sides;f.append((a,b,b+sides,a+sides))
        data=self.mesh(name,v,f,mat)
        for face in data.polygons:face.use_smooth=True
        return self.node(name,data,pos,parent=parent)

    def prop(self,pack,key,name,pos,height,rot=0,stretch=(1,1,1),tilt=0):
        path=(ROOT.parent/'world-ghosts'/'native'/'mesh'/'bride.glb') if pack in ['bride','bridehead'] else SOURCE/pack/(key+'.glb')
        if path not in self.cache:
            before=set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=str(path))
            imported=set(bpy.data.objects)-before
            deps=bpy.context.evaluated_depsgraph_get();templates=[]
            bone_shapes={bone.custom_shape for obj in imported if obj.type=='ARMATURE' for bone in obj.pose.bones if bone.custom_shape}
            for o in imported:
                if o.type!='MESH' or o.hide_render or o in bone_shapes:continue
                data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
                data.transform(o.matrix_world)
                templates.append((o.name,data))
            for o in imported:bpy.data.objects.remove(o,do_unlink=True)
            assert templates, 'EMPTY_GLB:'+str(path)
            coords=[v.co for _,m in templates for v in m.vertices]
            lo=Vector([min(v[i]for v in coords)for i in range(3)])
            hi=Vector([max(v[i]for v in coords)for i in range(3)])
            self.cache[path]=(templates,lo,hi)
        templates,lo,hi=self.cache[path]
        if pack=='bridehead':
            import bmesh
            selected=[]
            for label,data in templates:
                if label not in ['Porcelain_skin','Plum_eye_shadow','Orbital_shadow','Warm_sclera','Crimson_iris','Pupil_and_lashes','Wine_lips']:continue
                cut=data.copy();bm=bmesh.new();bm.from_mesh(cut)
                bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<2.79],context='VERTS')
                bm.to_mesh(cut);bm.free()
                if len(cut.polygons):selected.append((label,cut))
            templates=selected
            points=[v.co for _,m in templates for v in m.vertices]
            lo=Vector([min(v[i]for v in points)for i in range(3)]);hi=Vector([max(v[i]for v in points)for i in range(3)])
        factor=height/max(hi.z-lo.z,.001)
        group=self.node(name,pos=pos,rot=rot)
        group.rotation_euler.y=tilt
        for label,data in templates:
            o=bpy.data.objects.new(name+'_'+label,data.copy());self.collection.objects.link(o);o.parent=group
            o.data.transform(Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))))
            o.scale=(factor*stretch[0],factor*stretch[2],factor*stretch[1])
            if pack in ['bride','bridehead']:
                for face in o.data.polygons:face.use_smooth=True
                if label=='Cinnabar_silk':o.data.materials.clear();o.data.materials.append(self.material('Bella_burgundy',(.22,.018,.06)))
            else:
                # 원본은 그대로 두고 장면 재질만 어두운 목재·석재로 통일한다.
                for slot in o.material_slots:
                    if not slot.material:continue
                    original=slot.material
                    tint=(.32,.19,.15) if pack=='furniture' else (.43,.43,.39)
                    material=original.copy();slot.material=material
                    material['manorFinish']='Wood' if pack=='furniture' else 'Metal' if any(word in key for word in ['iron','fence','lantern','lightpost']) else 'Slate'
                    if material.use_nodes:
                        bs=material.node_tree.nodes.get('Principled BSDF')
                        if bs:
                            color=bs.inputs['Base Color'].default_value
                            bs.inputs['Base Color'].default_value=tuple(color[i]*tint[i]for i in range(3))+(1,)
                            bs.inputs['Roughness'].default_value=.78
                            for tex in material.node_tree.nodes:
                                if tex.type!='TEX_IMAGE' or not tex.image:continue
                                key=(tex.image.name,pack)
                                if key not in self.tinted_images:
                                    img=tex.image.copy();values=np.array(img.pixels[:],dtype=np.float32).reshape(-1,4)
                                    values[:,:3]*=np.array(tint,dtype=np.float32)
                                    img.pixels.foreach_set(values.ravel());img.pack();self.tinted_images[key]=img
                                tex.image=self.tinted_images[key]
            if pack not in ['bride','bridehead'] and len(o.data.polygons)<300:

                bevel=o.modifiers.new('Restored_edges','BEVEL');bevel.width=.015;bevel.segments=2
        return group

    def write(self,path):
        # Roblox 변환에서도 단색 재질이 흰색으로 사라지지 않게 색을 이미지에 고정한다.
        for mat in {m for o in self.collection.objects if o.type=='MESH' for m in o.data.materials if m}:
            if not mat.use_nodes:continue
            bs=mat.node_tree.nodes.get('Principled BSDF')
            if not bs or bs.inputs['Base Color'].is_linked:continue
            color=tuple(bs.inputs['Base Color'].default_value)
            img=bpy.data.images.new(mat.name+'_color',width=4,height=4)
            img.pixels.foreach_set(list(color)*16);img.pack()
            tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
            mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
            bs.inputs['Base Color'].default_value=(1,1,1,1)
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.collection.objects:o.select_set(True)
        bpy.context.view_layer.objects.active=next((o for o in self.collection.objects if o.type=='MESH'),None)
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
        raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n])
        return {'file':path.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'nodes':len(d['nodes']),'meshes':len(d['meshes'])}

    def batch_static(self):
        # 장식의 수는 유지하고 같은 재질의 고정 소품만 병합한다. 움직이는 노드는 보존한다.
        keep=('Butler','Archivist','Undertaker','CoffinLid','CoffinHand','ArmorHelmet','LittleGhost',
              'TeaCup','Tea','Chandelier','Mirror','FamilyPortrait','PortraitCanvas','HearthFlame',
              'ManorSideWall','FacadeWing','BackWall','HallFloor','Courtyard','CrookedRoof','Clock','EntryDoor')
        groups={}
        bpy.context.view_layer.update()
        for o in list(self.collection.objects):
            if o.type!='MESH' or o.name.startswith(keep):continue
            material=o.data.materials[0] if len(o.data.materials)==1 else None
            if not material:continue
            # 재질 복제본도 원본 이미지와 색이 같으면 함께 묶는다.
            bs=material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
            textures=tuple(n.image.name for n in material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image) if material.use_nodes else ()
            key=(textures,tuple(bs.inputs['Base Color'].default_value) if bs else tuple(material.diffuse_color),material.get('manorFinish','SmoothPlastic'))
            groups.setdefault(key,[]).append(o)
        for index,objects in enumerate(groups.values()):
            if len(objects)<2:continue
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.convert(target='MESH')
            bpy.ops.object.join()
            combined=bpy.context.object;combined.name='ManorDetail'+str(index)
            material=combined.data.materials[0]
            combined.data.materials.clear();combined.data.materials.append(material)
            for polygon in combined.data.polygons:polygon.material_index=0

def palette(s):
    return {k:s.material(k,v) for k,v in {
      'plum':(.18,.075,.115),'wood':(.12,.047,.025),'stone':(.28,.30,.29),'teal':(.055,.14,.12),
      'roof':(.045,.07,.095),'brass':(.34,.25,.14),'bone':(.69,.67,.51),'ivory':(.79,.72,.54),
      'black':(.022,.026,.031),'amber':(1,.52,.13),'red':(.12,.012,.027),'glass':(.13,.26,.28)}.items()}

# NPC: 기존 글비를 정규화해 재사용하고, 역할별 얼굴·복장·소품을 직접 구성한다.
def npc(s,kind,pos):
    if kind=='Undertaker':
        p=s.prop('bride','bride','Undertaker',pos,8.3,rot=-.20)
        c=palette(s)
        # 기존 장식 선택에서 사용하는 모자는 의상실 진열대에도 유지한다.
        s.lathe('UndertakerHatBrim',(3.2,5,0),1.1,1.1,.15,c['black'],parent=p)
        s.lathe('UndertakerHat',(3.2,5.8,0),.7,.6,1.5,c['black'],parent=p)
        s.lathe('UndertakerHatRibbon',(3.2,5.35,0),.72,.72,.22,c['red'],parent=p)
        return p
    c=palette(s);p=s.node(kind,pos=pos)
    h=10.7 if kind=='Butler' else 7.5
    w=1.9 if kind=='Butler' else 2.9
    for side in [-1,1]:
        s.lathe(kind+'_Leg'+str(side),(side*w*.24,h*.23,0),.23,.20,h*.4,c['black'],parent=p)
        s.ellipsoid(kind+'_Shoe'+str(side),(side*w*.24,.4,.4),(.75,.7,1.7),c['black'],parent=p)
    rings=[(h*.36,w*.57,.66),(h*.44,w*.56,.66),(h*.55,w*.39,.52),(h*.64,w*.48,.61),(h*.71,w*.63,.64),(h*.735,w*.35,.47)]
    verts=[];faces=[]
    for y,rx,rz in rings:
        for i in range(32):
            a=i*math.tau/32;verts.append((math.cos(a)*rx,y,math.sin(a)*rz))
    for j in range(len(rings)-1):
        for i in range(32):faces.append((j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i))
    data=s.mesh(kind+'_Tailcoat',verts,faces,c['black'] if kind=='Butler' else c['teal'])
    for poly in data.polygons:poly.use_smooth=True
    s.node(kind+'_Coat',data,parent=p)
    s.ellipsoid(kind+'_Shoulders',(0,h*.69,0),(w*1.3,.8,1.1),c['black'],parent=p)
    s.box(kind+'_Shirt',(0,h*.64,.63),(.62,1.85,.12),c['ivory'],parent=p)
    for side in [-1,1]:
        lapel=s.box(kind+'_Lapel'+str(side),(side*.45,h*.65,.65),(.38,1.7,.13),c['teal'],parent=p,lean=-side*.23)
        s.ellipsoid(kind+'_Sleeve'+str(side),(side*w*.62,h*.57,0),(.55,h*.26,.65),c['black'],parent=p)
        s.lathe(kind+'_Cuff'+str(side),(side*w*.65,h*.37,0),.29,.29,.32,c['ivory'],parent=p)
        s.ellipsoid(kind+'_Glove'+str(side),(side*w*.65,h*.32,.08),(.52,.84,.45),c['bone'],parent=p)
        for finger in range(4):s.lathe(kind+'_Finger'+str(side)+str(finger),(side*w*.65-.18+finger*.12,h*.265,.14),.055,.038,.62,c['bone'],parent=p)
    for i in range(4):s.ellipsoid(kind+'_Button'+str(i),(0,h*.68-i*.43,.66),(.12,.12,.07),c['brass'],parent=p)
    s.box(kind+'_BowTie',(0,h*.735,.83),(.9,.22,.17),c['red'],parent=p)
    s.lathe(kind+'_Neck',(0,h*.78,0),.23,.20,h*.1,c['bone'],parent=p)
    hp=(0,h*.80,0) if kind=='Butler' else (2.2,3.75,.5)
    head=s.prop('bridehead','head',kind+'Head',hp,2.5,stretch=(.86,1.10,.90))
    head.parent=p
    for o in head.children:o.name=kind+'_Skull'+o.name.split('_')[-1]
    # 잘 정돈된 옆머리·수염이 기존 얼굴 원형에 집사/기록관의 성격을 만든다.
    for side in [-1,1]:
        s.ellipsoid(kind+'_SkullHair'+str(side),(side*.61,2.27,-.06),(.47,.75,1.0),c['black'],parent=head)
        s.ellipsoid(kind+'_MouthWhisker'+str(side),(side*.20,.80,.65),(.43,.10,.14),c['black'],parent=head)
    if kind=='Butler':
        s.lathe('Butler_Tray',(w*.65,h*.32+.40,.62),.9,.9,.10,c['brass'],parent=p)
        s.lathe('Butler_Candle',(w*.65,h*.32+.95,.62),.14,.14,1,c['ivory'],parent=p)
    else:
        s.box('Archivist_Ledger',(0,3.5,.90),(2.1,2.4,.3),c['red'],parent=p)
        s.box('Archivist_LedgerLabel',(0,3.5,1.07),(1.4,1.4,.07),c['ivory'],parent=p)
    return p

def build():
    s=Scene();c=palette(s)
    s.box('Courtyard',(0,-.2,9),(84,.8,68),s.material('courtyard',(.13,.19,.19)))
    s.box('HallFloor',(0,.1,-23),(59,.5,40),c['wood'])
    # Compact footprint, exaggerated height and crooked silhouette.
    for side in [-1,1]:
        s.box('ManorSideWall'+str(side),(side*29,11,-23),(1.5,22,40),c['plum'],lean=side*1.0)
        s.box('FacadeWing'+str(side),(side*20,12,-3),(24,24,2),c['plum'],lean=side*.7)
        for z in [-37,-23,-9]:
            s.box('WallRib'+str(side)+str(z),(side*28,10,z),(1.5,20,1),c['wood'])
        for x in [side*13,side*25]:
            for y in [7,17]:
                s.box('WindowFrame'+str(x)+str(y),(x,y,-1.8),(6,8,.8),c['wood'])
                s.box('WindowGlass'+str(x)+str(y),(x,y,-1.25),(4.7,6.8,.12),c['amber'])
                s.box('WindowMullion'+str(x)+str(y),(x,y,-1.0),(.28,7,.15),c['black'])
                s.box('WindowCross'+str(x)+str(y),(x,y,-.9),(5,.25,.2),c['black'])
        s.box('EntryPillar'+str(side),(side*8.1,7,-2),(1.6,14,4),c['stone'],lean=-side*.7)
    s.box('BackWall',(0,11,-43),(60,22,1.5),c['plum'])
    s.box('EntryLintel',(0,14,-2),(18,3,4),c['wood'])
    s.box('EntryThreshold',(0,.40,-2),(16,.4,6),c['stone'])
    for side in [-1,1]:
        door=s.node('EntryDoor'+str(side),pos=(side*7.2,.5,-2))
        s.box('EntryDoorWood'+str(side),(-side*3.5,5.8,0),(7,11.6,.5),c['wood'],parent=door)
        for y in [2.7,8.6]:s.box('EntryDoorPanel'+str(side)+str(y),(-side*3.5,y,.3),(5.3,4.4,.16),c['teal'],parent=door)
        s.lathe('EntryDoorKnob'+str(side),(-side*6.2,5.4,.5),.22,.22,.4,c['brass'],parent=door)
    # Asymmetric roof ridge, using custom six-sided prism rather than a hotel box.
    roof=[[-33,22,-46],[33,22,-46],[33,22,0],[-33,22,0],[-5,39,-46],[-5,36,0]]
    s.node('CrookedRoof',s.mesh('CrookedRoof',roof,[[0,4,1],[3,2,5],[0,3,5,4],[4,5,2,1],[0,1,2,3]],c['roof']))
    s.box('LeaningChimney',(20,34,-30),(5,22,5),c['stone'],lean=3)
    s.box('ChimneyCap',(23,45,-30),(7,1.1,7),c['black'])
    s.lathe('LeftTurret',(-27,24,-35),6,5,22,c['plum'],sides=8)
    s.lathe('LeftTurretRoof',(-28,43,-35),8,0,17,c['roof'],sides=8)
    s.box('Runner',(0,.48,-21),(11,.08,36),c['red'])
    for z in range(3,35,5):s.box('PathStone'+str(z),(math.sin(z)*.4,.35,z),(10,.32,4),c['stone'],rot=math.sin(z)*.06)
    for x in [-35,35]:
        for z in [-28,-8,12,32]:s.prop('graveyard','iron-fence','Fence'+str(x)+str(z),(x,.2,z),5,math.pi/2)
    for x,z,h in [(-36,30,17),(35,28,20),(-39,-14,24),(37,-32,22)]:
        s.box('CrookedTreeTrunk'+str(x),(x,h*.4,z),(1.2,h*.8,1.1),c['wood'],lean=2)
        for i in range(4):
            sign=1 if i%2 else -1
            s.box('BareBranch'+str(x)+str(i),(x+sign*2,h*(.35+i*.12),z),(sign*0+0.65,h*.34,.55),c['wood'],lean=sign*4)
    # Carved trims, imperfect rooflines and pointed arch panels give a western manor silhouette.
    for side in [-1,1]:
        for y in [1,11.5,22.5]:s.box('FacadeCornice'+str(side)+str(y),(side*20,y,-1.35),(25,.6,1.2),c['wood'])
        for x in [side*10,side*19,side*31]:s.box('FacadeTimber'+str(x),(x,11.5,-1.2),(.55,23,.75),c['wood'],lean=side*.55)
        for x in [side*13,side*25]:
            arch=[[-3,0,0],[3,0,0],[2.6,2,0],[0,4,0],[-2.6,2,0]]
            s.node('WindowArch'+str(x),s.mesh('WindowArch',arch,[[0,1,2,3,4]],c['wood']),(x,21,-1.0))
        gable=[[-7,0,-3],[7,0,-3],[1,12,-3],[-7,0,3],[7,0,3],[1,12,3]]
        s.node('Dormer'+str(side),s.mesh('Dormer',gable,[[0,2,1],[3,4,5],[0,3,5,2],[2,5,4,1]],c['roof']),(side*19,25,-10))
        s.box('DormerFace'+str(side),(side*19,29,-6.8),(6,6,.3),c['plum'])
        s.box('DormerLight'+str(side),(side*19,29,-6.5),(2,3,.1),c['amber'])
    for i in range(9):s.box('RoofRib'+str(i),(-32+i*8,22.5,-22),(.25,.6,46),c['black'])
    for side in [-1,1]:
        s.lathe('PorchColumn'+str(side),(side*7,6.5,5),.55,.45,12,c['stone'])
        s.lathe('PorchCapital'+str(side),(side*7,12.5,5),.9,.9,.6,c['brass'])
    s.box('PorchCanopy',(0,13.2,2),(17,1,12),c['roof'])
    for i in range(18):
        x=(-1 if i%2 else 1)*(9+(i*7)%21);z=(i*11)%40
        s.box('LeafCard'+str(i),(x,.24,z),(.5,.015,.9),c['wood'],rot=i*.71)
    for side in [-1,1]:
        s.box('InteriorDado'+str(side),(side*28.1,3,-23),(.3,5,37),c['wood'])
        for z in [-10,-19,-28,-37]:s.box('WallPanel'+str(side)+str(z),(side*27.8,3,z),(.35,4,7),c['teal'])
    s.box('BackDado',(0,3,-42),(56,5,.6),c['wood'])
    # 집안의 시간도 살짝 고장났다. 시계추·시곗바늘은 클라이언트가 느리게 움직인다.
    s.box('ClockCase',(-9,5,-40.3),(3.2,9.2,1.8),c['wood'])
    s.ellipsoid('ClockFace',(-9,8.6,-39.32),(2.5,2.5,.12),c['ivory'])
    s.box('ClockMinute',(-9,9.05,-39.2),(.12,.95,.08),c['black'])
    s.box('ClockHour',(-8.64,8.6,-39.15),(.78,.15,.08),c['black'])
    s.lathe('ClockPendulumRod',(-9,4.8,-39.15),.055,.055,3.8,c['brass'])
    s.ellipsoid('ClockPendulum',(-9,3,-39.1),(1.1,1.1,.14),c['brass'])
    for i in range(9):s.box('FloorPlank'+str(i),(-26+i*6,.365,-23),(.06,.02,36),c['black'])
    for i,(x,z) in enumerate([(-22,15),(24,19),(-22,-10),(22,-9)]):s.prop('graveyard','lightpost-single','LampPost'+str(i),(x,0,z),9)
    for i,(x,z) in enumerate([(-21,29),(22,32)]):s.prop('graveyard','bench-damaged','Bench'+str(i),(x,0,z),3,math.pi)
    for i,(x,z) in enumerate([(-30,7),(29,10),(-33,-35),(30,-37)]):s.prop('graveyard','urn-round','Urn'+str(i),(x,.4,z),3)
    for i,(x,z) in enumerate([(-27,22),(28,25),(-29,1),(30,0)]):s.prop('graveyard','rocks','GardenRock'+str(i),(x,0,z),2)
    for i in range(6):
        s.prop('graveyard','candle-multiple','Candle'+str(i),((-1 if i%2 else 1)*23,1.4,-9-(i//2)*12),2.4)
    for i,x in enumerate([-22,-15,15,22]):s.prop('furniture','bookcaseClosed','Bookcase'+str(i),(x,.4,-39),8,stretch=(.85,1.18,1),tilt=(-1 if i%2 else 1)*.035)
    s.prop('furniture','desk','RecordDesk',(-19,.4,-26),3)
    s.prop('furniture','books','OpenRecords',(-18,3.5,-26),.8)
    s.prop('furniture','coatRackStanding','CoatRack',(23,.4,-18),7)
    s.prop('furniture','chairCushion','MerchantChair',(18,.4,-29),4,stretch=(1.5,1.1,1.25),tilt=-.035)
    s.prop('furniture','tableRound','MerchantTable',(21,.4,-25),3)
    s.prop('graveyard','coffin','Coffin',(17,.5,-14),5.5,math.pi/2,stretch=(1.12,.9,1))
    # Separate lid/hand permit actual collision-driven motion without exploding the scene.
    s.box('CoffinLid',(17,2,-14),(2.8,.25,5.8),c['wood'])
    s.ellipsoid('CoffinHand',(17,1.7,-12),(1.1,.4,1.8),c['bone'])
    s.lathe('ArmorBase',(-16,1,-11),1.6,1.5,1,c['stone'])
    s.lathe('ArmorTorso',(-16,4,-11),1.2,.8,3.4,c['stone'])
    s.ellipsoid('ArmorHelmet',(-16,6.4,-11),(2,2.2,1.8),c['brass'])
    for side in [-1,1]:s.box('ArmorArm'+str(side),(-16+side*1.6,4,-11),(.5,3,.65),c['stone'],lean=-side*.4)
    s.lathe('ChandelierStem',(0,19,-24),.12,.12,5,c['black'])
    s.lathe('ChandelierRing',(0,16.5,-24),3.5,3.5,.35,c['brass'],sides=12)
    for i in range(8):
        a=i*math.pi/4;s.lathe('ChandelierCandle'+str(i),(math.cos(a)*3,17.4,-24+math.sin(a)*3),.15,.12,1.3,c['ivory'])
    # Portraits and stage reward relics; the owner-specific module controls their visibility.
    for i in range(12):
        x=([-24,-17,-10,10,17,24])[i%6];z=-41.7;y=9 if i<6 else 16
        s.box('PortraitFrame'+str(i+1),(x,y,z),(5.2,5.8,.5),c['brass'])
        s.box('PortraitCanvas'+str(i+1),(x,y,z+.3),(4.4,5,.1),c['black'])
    npc(s,'Butler',(5,.5,-9));npc(s,'Undertaker',(20,.5,-22));npc(s,'Archivist',(-21,.5,-30))
    # 가족이 사는 집의 흔적. 동일 무료 GLB를 비율/각도만 바꿔 재사용한다.
    s.prop('furniture','tableRound','FamilyTeaTable',(-15,.4,-18),3.2,stretch=(1.45,1,1.2))
    s.prop('furniture','chairCushion','GrandfatherChair',(-22,.4,-17),5,math.pi/2,stretch=(1.05,1.35,1))
    s.prop('furniture','books','FamilyBedtimeBook',(-15,3.65,-18),.85,rot=.22)
    s.prop('graveyard','character-ghost','LittleGhost',(-12,2,-20),3.8,stretch=(1.15,.85,1.1),tilt=-.12)
    # 작은 귀신은 홍차를 훔치는 막내. 얼굴 앞의 눈/손과 찻잔은 독립 메시다.
    for side in [-1,1]:
        s.ellipsoid('LittleGhostEye'+str(side),(-12+side*.38,4,-18.9),(.2,.35,.12),c['black'])
    s.lathe('TeaCup',(-14.6,3.95,-17.3),.3,.42,.55,c['ivory'])
    s.lathe('Tea',(-14.6,4.22,-17.3),.34,.34,.04,c['wood'])
    # 평면 레이어는 실제 깊이가 다른 위치에 놓여 이동 시 자연스러운 시차가 난다.
    far=s.material('distant_blue',(.14,.23,.31));mid=s.material('distant_teal',(.10,.19,.23))
    moon=s.material('moon_paper',(.69,.78,.70));foreground=s.material('foreground_ink',(.04,.09,.10))
    for layer,(z,mat) in enumerate([(-72,far),(-58,mid)]):
        ridge=[[-53,0,0],[53,0,0],[53,17,0],[40,23,0],[29,19,0],[16,27,0],[3,20,0],[-13,28,0],[-32,20,0],[-53,25,0]]
        s.node('BackdropRidge'+str(layer),s.mesh('BackdropRidge'+str(layer),ridge,[list(range(len(ridge)))],mat),(0,0,z))
        for side in [-1,1]:
            x=side*(39+layer*6)
            silhouette=[[-1,0,0],[1,0,0],[2,13,0],[7,17,0],[8,23,0],[6,20,0],[1,17,0],[0,27,0],[-3,33,0],[-2,23,0],[-6,20,0],[-8,25,0],[-8,19,0],[-2,14,0]]
            s.node('BackdropTree'+str(layer)+str(side),s.mesh('BackdropTree',silhouette,[list(range(len(silhouette)))],mat),(x,0,z+1))
    disk=[[math.cos(i*math.pi/24)*7,math.sin(i*math.pi/24)*7,0]for i in range(48)]
    s.node('PaperMoon',s.mesh('PaperMoon',disk,[list(range(48))],moon),(27,41,-70))
    # 전경은 가장자리만 감싸고 중앙 진입로/터치 시야를 가리지 않는다.
    for side in [-1,1]:
        curtain=[[-2,0,0],[2,0,0],[2,22,0],[7,25,0],[10,26,0],[7,28,0],[1,26,0],[-1,31,0],[-3,30,0]]
        s.node('ForegroundBranch'+str(side),s.mesh('ForegroundBranch',curtain,[list(range(len(curtain)))],foreground),(side*43,0,35),scale=[side*.65,.85,1])
    # 가족 초상화: 반복되는 빈 얼굴 대신 종별 특징을 그린 내부 제작 질감.
    from PIL import Image, ImageDraw
    from io import BytesIO
    for i in range(12):
        x=([-24,-17,-10,10,17,24])[i%6];y=9 if i<6 else 16
        im=Image.new('RGBA',(256,320),(23,29,32,255));d=ImageDraw.Draw(im)
        coat=[(41,54,54),(67,34,47),(31,50,69),(74,60,41)][i%4]
        skin=[(171,166,143),(147,165,154),(168,147,142),(126,148,145)][i%4]
        d.ellipse((24,17,232,312),fill=(43,48,46),outline=(82,74,56),width=3)
        d.polygon([(42,305),(60,238),(93,215),(159,215),(196,244),(218,305)],fill=coat)
        d.polygon([(91,221),(128,269),(165,221),(147,207),(108,207)],fill=(167,155,124))
        width=38+(i%3)*9
        d.ellipse((128-width,75,128+width,229),fill=skin)
        d.polygon([(128-width,129),(121,158),(128-width+8,203),(105,180)],fill=tuple(int(v*.72)for v in skin))
        d.ellipse((97,134,122,150),fill=(216,202,167));d.ellipse((138,134,163,150),fill=(216,202,167))
        for ex in [111,149]:d.ellipse((ex-4,135,ex+4,149),fill=(35,25,26))
        d.line([(126,146),(119,177),(132,180)],fill=(75,81,70),width=3)
        d.line([(110,199),(146,199)],fill=(94,39,42),width=4)
        if i%4==0:
            d.polygon([(85,112),(102,62),(128,92),(157,64),(174,115),(151,100),(127,112),(103,99)],fill=(17,24,25))
            d.polygon([(107,200),(115,200),(111,211)],fill=(218,208,176))
            d.polygon([(141,200),(149,200),(145,211)],fill=(218,208,176))
        elif i%4==1:
            d.ellipse((76,57,181,125),fill=(16,25,30));d.rectangle((76,104,90,247),fill=(16,25,30));d.rectangle((170,104,185,257),fill=(16,25,30))
            d.line([(129,70),(154,105)],fill=(57,73,77),width=3)
        elif i%4==2:
            d.polygon([(76,114),(63,65),(103,95),(154,95),(192,66),(181,128)],fill=(103,104,88))
            d.polygon([(122,165),(153,187),(119,191)],fill=(73,76,64))
            d.line([(83,111),(104,123)],fill=(17,27,26),width=7)
        else:
            d.rectangle((89,57,171,104),fill=(25,30,32));d.ellipse((72,93,187,113),fill=(17,23,25))
            d.rectangle((91,87,170,94),fill=(109,67,53))
            d.arc((92,128,128,159),0,360,fill=(170,148,85),width=3);d.arc((133,128,169,159),0,360,fill=(170,148,85),width=3)
        d.line([(30,286),(224,286)],fill=(126,106,66),width=2)
        for k in range(10):d.line([(83+k*9,297),(87+k*9,297)],fill=(177,154,105),width=2)
        image=bpy.data.images.new('FamilyPortrait'+str(i+1),width=256,height=320)
        array=np.array(im,dtype=np.float32)[::-1]/255
        image.pixels.foreach_set(array.ravel());image.pack()
        mat=bpy.data.materials.new('FamilyPortraitPaint'+str(i+1));mat.use_nodes=True
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.91
        mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        data=s.mesh('FamilyPortrait'+str(i+1),[(-2.2,-2.5,0),(2.2,-2.5,0),(2.2,2.5,0),(-2.2,2.5,0)],[(0,1,2,3)],mat)
        for uv,value in zip(data.uv_layers.active.data,[(0,0),(1,0),(1,1),(0,1)]):uv.uv=value
        s.node('FamilyPortrait'+str(i+1),data,(x,y,-41.26))

    # 저택 배경도 내부 GLB를 재구성한다. 문·기둥·담장 원형의 출처는 기존 CC0 manifest다.
    for side in [-1,1]:
        s.prop('graveyard','column-large','EntryCarvedColumn'+str(side),(side*8,.35,-2),14,stretch=(.85,1,.85))
        s.prop('graveyard','crypt-large-roof','ManorPediment'+str(side),(side*20,21,-4),5.8,stretch=(1.8,1,.6))
        for z in [8,23,38]:
            s.prop('graveyard','stone-wall','GardenWall'+str(side)+str(z),(side*39,0,z),2.2,math.pi/2,stretch=(1.5,1,1))
        s.prop('graveyard','crypt-door','AncestorsDoor'+str(side),(side*24,.4,-41),9,stretch=(1.05,1,.5))
        for z in [-11,-25,-38]:
            s.box('PanelPillar'+str(side)+str(z),(side*27,10,z),(.8,20,.8),c['wood'])
            s.box('PanelCapital'+str(side)+str(z),(side*26.7,19,z),(1.2,.65,1.4),c['brass'])
            s.prop('graveyard','lantern-candle','WallLantern'+str(side)+str(z),(side*26.4,6,z),2.4)
        # 입체 커튼과 황동 타이는 따로 정규화된 메시다.
        for x in [side*13,side*25]:
            for edge in [-1,1]:
                for pleat in range(4):
                    s.ellipsoid('Curtain'+str(x)+str(edge)+str(pleat),(x+edge*(2.0+pleat*.30),6.8,-4.25),(.62,10.5,.60),c['red'])
                s.lathe('CurtainTie'+str(x)+str(edge),(x+edge*2.4,5.5,-4.25),.62,.62,.2,c['brass'])
    book_colors=[s.material('BookWine',(.16,.025,.045)),s.material('BookPine',(.035,.12,.075)),s.material('BookOchre',(.22,.13,.042)),s.material('BookInk',(.035,.06,.095))]
    for row,x in enumerate([-22,-15,15,22]):
        for shelf,y in enumerate([1.1,3.2,5.3,7.4]):
            for k in range(5):
                bx=x-1.3+k*.51;bh=1.1+((k+row+shelf)%3)*.17
                s.box('ArchiveVolume'+str(row)+str(shelf)+str(k),(bx,y+bh/2,-37.9),(.43,bh,.95),book_colors[(k+row+shelf)%4],lean=.035*(k%2))
                s.box('BookSpineGold'+str(row)+str(shelf)+str(k),(bx,y+bh*.7,-37.40),(.27,.07,.015),c['brass'])
    # 굽은 벽난로와 중앙 가족 거울. 기존 방의 통로 폭을 유지한다.
    for x in [-5.8,5.8]:s.box('FireplacePillar'+str(x),(x,4,-40),(1.7,8,3),c['stone'])
    s.box('FireplaceMantel',(0,8.1,-40),(14,1.1,3.6),c['stone'])
    s.box('FireplaceBlack',(0,3.8,-42),(10,6.5,.1),c['black'])
    for i in range(5):
        s.lathe('FireplaceLog'+str(i),(-3+i*1.5,.9,-40),.36,.36,1.4,c['wood'])
        s.ellipsoid('HearthFlame'+str(i),(-3+i*1.5,1.8+(i%2)*.6,-39.8),(.75,2.2+(i%2)*1.1,.55),c['amber'])
    s.ellipsoid('FamilyMirrorFrame',(0,14,-41.5),(11,10,.55),c['brass'])
    s.ellipsoid('FamilyMirror',(0,14,-41.13),(9.7,8.7,.15),c['glass'])
    for side in [-1,1]:
        s.ellipsoid('MirrorEye'+str(side),(side*1.9,14.5,-40.98),(1.4,1.1,.1),c['ivory'])
        s.ellipsoid('MirrorPupil'+str(side),(side*1.9,14.5,-40.87),(.42,.8,.08),c['black'])
    # 얇은 러그와 금색 테두리는 바닥 높이를 거의 바꾸지 않는다.
    for x in [-5.25,5.25]:s.box('RunnerGold'+str(x),(x,.53,-21),(.16,.03,34),c['brass'])
    for z in range(-37,-7,4):
        diamond=s.box('RunnerDiamond'+str(z),(0,.535,z),(1.1,.02,1.1),c['brass'],rot=math.pi/4)
    # 책·재봉 도구·티세트로 각 NPC 주변의 역할을 읽을 수 있게 한다.
    for i in range(9):
        s.prop('furniture','books','ArchiveBookStack'+str(i),(-24+(i%3)*2,.4+(i//3)*.75,-23-(i%2)),.7,rot=i*.22)
    s.prop('furniture','bookcaseClosedDoors','Wardrobe',(24,.4,-31),10,stretch=(1.1,1,1))
    s.prop('furniture','loungeSofa','FamilySofa',(-21,.4,-12),3.6,math.pi/2,stretch=(1.2,1,1))
    s.prop('graveyard','candle-multiple','RecordCandles',(-21,3.9,-26),2)
    s.prop('graveyard','candle-multiple','WardrobeCandles',(23,3.7,-25),2)
    for i in range(4):
        s.lathe('ThreadSpool'+str(i),(20+i*.48,3.75,-25),.16,.16,.65,c['red'] if i%2 else c['teal'])
        s.lathe('ThreadCap'+str(i),(20+i*.48,4.08,-25),.21,.21,.10,c['ivory'])
    # 샹들리에의 실제 곡선 팔과 촛농.
    for i in range(8):
        a=i*math.pi/4
        for step in range(7):
            t=step/6;r=.8+2.4*t
            s.ellipsoid('ChandelierArm'+str(i)+'_'+str(step),(math.cos(a)*r,15.7-math.sin(t*math.pi)*.7,-24+math.sin(a)*r),(.3,.3,.3),c['brass'])
        s.ellipsoid('ChandelierFlame'+str(i),(math.cos(a)*3,18.2,-24+math.sin(a)*3),(.22,.65,.22),c['amber'])
    # 줄·그물은 배경 장식이며 이동과 충돌 판정에는 사용하지 않는다.
    for side in [-1,1]:
        for ring in [2,4,6]:
            points=[]
            for j in range(8):
                a=j*math.pi/14
                points.append((side*(27-math.cos(a)*ring),20-math.sin(a)*ring,-41))
            for j in range(len(points)-1):
                a=Vector(xyz(points[j]));b=Vector(xyz(points[j+1]));delta=b-a
                o=s.lathe('Cobweb'+str(side)+str(ring)+str(j),(0,0,0),.018,.018,delta.length,c['ivory'])
                o.location=(a+b)/2;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler()

    s.batch_static()
    results=[s.write(OUT/'manor-lobby.glb')]
    bpy.context.view_layer.update()
    coords=[o.matrix_world@Vector(v) for o in s.collection.objects if o.type=='MESH' for v in o.bound_box]
    lo=Vector([min(v[i] for v in coords)for i in range(3)]);hi=Vector([max(v[i] for v in coords)for i in range(3)])
    center=(lo+hi)/2
    finishes={o.name:o.data.materials[0].get('manorFinish','SmoothPlastic') for o in s.collection.objects if o.type=='MESH' and o.data.materials}
    (OUT/'import-bounds.json').write_text(json.dumps({'width':hi.x-lo.x,'center':[center.x,center.z,-center.y],'finishes':finishes},indent=2)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'manor.blend'),compress=True)
    for kind in ['Butler','Undertaker','Archivist']:
        p=Scene();npc(p,kind,(0,0,0));results.append(p.write(OUT/(kind.lower()+'.glb')))
    (OUT/'build-evidence.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string+' / build.py','normalization':{'up':'Y','forward':'+Z','origin':'GROUND_CENTER','units':'STUD','textures':'EMBEDDED','interactionPrefixesPreserved':True},'reusedOriginals':['Kenney CC0 furniture','Kenney CC0 graveyard architecture','world-ghosts/native/mesh/bride.glb'],'actualRobloxPlayTest':False,'originalHotelAssetsUsed':False,'style':'괴물 가족의 살아 있는 저택','layers':['foreground','walkable_3d','portrait_relief','midground','background'],'modifiedCC0Props':['bookcaseClosed','chairCushion','coffin','character-ghost','tableRound'],'bounds':{'width':hi.x-lo.x,'height':hi.z-lo.z,'depth':hi.y-lo.y},'models':results},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(results,indent=2))
    import sys
    if '--render' in sys.argv:render_export()

# 검수 렌더 · 게임에 포함되지 않는 카메라와 조명.
def render_export():
    # 제작 장면 대신 실제 배포 GLB를 빈 장면에 재임포트해 재질 누락·축·배치를 검수한다.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/'manor-lobby.glb'))
    collection=bpy.data.collections.new('ExportReview');bpy.context.scene.collection.children.link(collection)
    for o in list(bpy.context.scene.objects):
        for old in list(o.users_collection):old.objects.unlink(o)
        collection.objects.link(o)
    review=OUT/'review';review.mkdir(exist_ok=True)
    world=bpy.context.scene.world or bpy.data.worlds.new('ManorNight')
    bpy.context.scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.055,.075,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.35
    def light(name,pos,energy,color,size):
        d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);collection.objects.link(o);o.location=xyz(pos)
        o.rotation_euler=(Vector(xyz((0,3,-23)))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Moon',(0,20,1),5500,(.40,.64,1),18)
    light('WarmHall',(0,18,-21),7000,(1,.61,.28),16)
    light('BellaKey',(17,10,-12),1700,(.8,.72,1),6)
    light('ArchiveKey',(-19,11,-20),1700,(1,.65,.29),6)
    light('Hearth',(0,4,-38),1000,(1,.32,.08),5)
    d=bpy.data.cameras.new('ReviewCamera');o=bpy.data.objects.new('ReviewCamera',d);collection.objects.link(o)
    bpy.context.scene.camera=o;d.lens=23
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=16;sc.cycles.use_denoising=True
    sc.render.resolution_x=1200;sc.render.resolution_y=780;sc.render.resolution_percentage=100
    sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast';sc.view_settings.exposure=.8
    for name,pos,target in [('interior',(-2,10,-6),(0,8,-27)),('butler',(0,8,-5),(5,6,-9))]:
        o.location=xyz(pos);o.rotation_euler=(Vector(xyz(target))-o.location).to_track_quat('-Z','Y').to_euler()
        sc.render.filepath=str(review/(name+'.png'));bpy.ops.render.render(write_still=True)
    (review/'evidence.json').write_text(json.dumps({'renderer':'Blender '+bpy.app.version_string+' Cycles','input':'generated/manor-lobby.glb','sha256':hashlib.sha256((OUT/'manor-lobby.glb').read_bytes()).hexdigest(),'method':'Import exported GLB into empty scene, then render','actualRobloxPlayTest':False},indent=2)+'\n')

if __name__=='__main__':build()
