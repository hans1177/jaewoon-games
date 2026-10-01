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

# NPC: 각 역할을 별도 얼굴/체형/의상/소품으로 직접 제작한다.
# 동일 bride head/몸체 재탕은 사용하지 않는다. 모바일 실루엣과 근접 얼굴 판독을 동시에 목표로 한다.
def npc(s,kind,pos):
    c=palette(s)
    profiles={
      'Butler':{
        'h':11.2,'w':1.82,'lean':-.035,'skin':s.material('ButlerSkin',(.56,.51,.46)),
        'coat':s.material('ButlerCoat',(.020,.026,.032)),'vest':s.material('ButlerVest',(.055,.072,.067)),
        'accent':s.material('ButlerWine',(.22,.024,.045)),'hair':s.material('ButlerHair',(.018,.017,.019)),
        'eye':s.material('ButlerIris',(.055,.070,.064)),'jaw':.92,'nose':1.22,
      },
      'Undertaker':{
        'h':10.1,'w':2.18,'lean':.105,'skin':s.material('UndertakerSkin',(.47,.48,.46)),
        'coat':s.material('UndertakerCoat',(.014,.018,.023)),'vest':s.material('UndertakerVest',(.060,.038,.047)),
        'accent':s.material('UndertakerWine',(.28,.016,.040)),'hair':s.material('UndertakerHair',(.015,.018,.021)),
        'eye':s.material('UndertakerIris',(.095,.060,.055)),'jaw':1.08,'nose':1.02,
      },
      'Archivist':{
        'h':9.2,'w':1.72,'lean':.145,'skin':s.material('ArchivistSkin',(.52,.47,.39)),
        'coat':s.material('ArchivistCoat',(.042,.083,.075)),'vest':s.material('ArchivistVest',(.095,.060,.042)),
        'accent':s.material('ArchivistInk',(.054,.038,.075)),'hair':s.material('ArchivistHair',(.070,.060,.050)),
        'eye':s.material('ArchivistIris',(.070,.095,.085)),'jaw':.84,'nose':.92,
      },
    }
    q=profiles[kind];h=q['h'];w=q['w']
    for m,finish in [(q['skin'],'SmoothPlastic'),(q['coat'],'Fabric'),(q['vest'],'Fabric'),(q['accent'],'Fabric'),(q['hair'],'SmoothPlastic'),(q['eye'],'SmoothPlastic')]:
        m['manorFinish']=finish

    p=s.node(kind,pos=pos)
    p.rotation_euler.y=q['lean']

    # 역할별 연속 곡면 메시. 몸통·사지·얼굴을 primitive 조립 대신 단면 loft로 만든다.
    def loft(name,rings,mat,segments=40,parent=p):
        verts=[]
        for y,rx,rz,cx,cz in rings:
            for i in range(segments):
                a=math.tau*i/segments
                # 완전한 타원보다 미세하게 비대칭인 인체 단면
                x=cx+math.cos(a)*rx*(1+.025*math.cos(a*3))
                z=cz+math.sin(a)*rz*(1+.018*math.sin(a*2))
                verts.append((x,y,z))
        faces=[]
        for r in range(len(rings)-1):
            for i in range(segments):
                a=r*segments+i;b=r*segments+(i+1)%segments
                c0=(r+1)*segments+(i+1)%segments;d=(r+1)*segments+i
                faces.append((a,b,c0,d))
        faces.append(tuple(reversed(range(segments))))
        top=(len(rings)-1)*segments
        faces.append(tuple(top+i for i in range(segments)))
        data=s.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        return s.node(name,data,parent=parent)

    def tube(name,points,radii,mat,sides=24,parent=p):
        verts=[]
        for j,point in enumerate(points):
            if j==0:tangent=Vector(points[1])-Vector(point)
            elif j==len(points)-1:tangent=Vector(point)-Vector(points[j-1])
            else:tangent=Vector(points[j+1])-Vector(points[j-1])
            tangent.normalize()
            up=Vector((0,1,0))
            if abs(tangent.dot(up))>.92:up=Vector((1,0,0))
            right=tangent.cross(up);right.normalize();up=right.cross(tangent);up.normalize()
            r=radii[j] if isinstance(radii,(list,tuple)) else radii
            for i in range(sides):
                a=math.tau*i/sides
                v=Vector(point)+(right*math.cos(a)+up*math.sin(a))*r
                verts.append(tuple(v))
        faces=[]
        for j in range(len(points)-1):
            for i in range(sides):
                a=j*sides+i;b=j*sides+(i+1)%sides
                c0=(j+1)*sides+(i+1)%sides;d=(j+1)*sides+i
                faces.append((a,b,c0,d))
        faces.append(tuple(reversed(range(sides))))
        top=(len(points)-1)*sides;faces.append(tuple(top+i for i in range(sides)))
        data=s.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        return s.node(name,data,parent=parent)

    # 하체: 장화/바지 실루엣이 연결되지만 좌우 체중과 발 방향은 다르게 둔다.
    stance=.34 if kind=='Butler' else .40 if kind=='Undertaker' else .30
    for side in [-1,1]:
        sx=side*w*stance
        loft(kind+'_Leg'+str(side),[
            (.52,w*.20,w*.22,sx,.04),
            (1.55,w*.17,w*.20,sx,.02),
            (2.85,w*.22,w*.24,sx,0),
            (4.15,w*.25,w*.27,sx,-.02),
        ],c['black'],32)
        shoe=loft(kind+'_Shoe'+str(side),[
            (.10,w*.30,w*.54,sx,.28),
            (.28,w*.36,w*.72,sx,.34),
            (.62,w*.31,w*.76,sx,.32),
        ],s.material(kind+'Leather',(.055,.035,.028)),32)
        shoe.data.materials[0]['manorFinish']='Leather'

    # 골반/흉곽/허리를 하나의 유기적 실루엣으로 연결한다.
    loft(kind+'_Torso',[
        (3.72,w*.61,w*.38,0,-.03),
        (4.42,w*.67,w*.42,0,-.04),
        (5.20,w*.64,w*.40,0,-.02),
        (6.02,w*.75,w*.44,0,0),
        (6.78,w*.82,w*.43,0,.01),
        (7.38,w*.66,w*.37,0,.01),
    ],q['coat'],48)
    loft(kind+'_Waistcoat',[
        (4.45,w*.38,w*.105,0,.45),
        (5.20,w*.45,w*.115,0,.47),
        (6.05,w*.40,w*.105,0,.46),
    ],q['vest'],32)
    loft(kind+'_Shirt',[
        (5.95,w*.25,w*.085,0,.50),
        (6.60,w*.30,w*.10,0,.49),
        (7.25,w*.24,w*.08,0,.46),
    ],c['ivory'],28)

    # 라펠/코트 앞섶은 별도 외피 레이어.
    for side in [-1,1]:
        lapel=s.box(kind+'_Lapel'+str(side),(side*w*.29,h*.625,.60),(w*.34,h*.24,.10),q['coat'],parent=p,lean=-side*.18)
        lapel.rotation_euler.y=side*.10

    # 어깨부터 손까지 곡선으로 이어지는 팔. 역할별 기본 포즈를 다르게 둔다.
    if kind=='Butler':
        arm_pose={-1:[(-w*.78,h*.67,.02),(-w*.94,h*.55,.06),(-w*.84,h*.42,.30),(-w*.69,h*.35,.54)],
                   1:[(w*.78,h*.67,.02),(w*.92,h*.56,.04),(w*.98,h*.47,.28),(w*.83,h*.40,.56)]}
    elif kind=='Undertaker':
        arm_pose={-1:[(-w*.78,h*.66,.00),(-w*.90,h*.54,-.08),(-w*.88,h*.39,-.12),(-w*.83,h*.27,-.08)],
                   1:[(w*.78,h*.66,.00),(w*.88,h*.55,.05),(w*.73,h*.45,.40),(w*.58,h*.38,.60)]}
    else:
        arm_pose={-1:[(-w*.74,h*.65,.00),(-w*.89,h*.54,.08),(-w*.75,h*.40,.36),(-w*.53,h*.33,.61)],
                   1:[(w*.74,h*.65,.00),(w*.86,h*.53,-.03),(w*.80,h*.39,.18),(w*.66,h*.29,.34)]}
    for side in [-1,1]:
        pts=arm_pose[side]
        tube(kind+'_UpperArm'+str(side),pts[:3],[w*.25,w*.225,w*.205],q['coat'],24)
        tube(kind+'_Forearm'+str(side),pts[2:],[w*.19,w*.155],q['coat'] if kind!='Archivist' else q['vest'],24)
        hand=pts[-1]
        glove=c['ivory'] if kind=='Butler' else q['skin']
        loft(kind+'_Hand'+str(side),[
            (hand[1]-.16,w*.20,w*.16,hand[0],hand[2]),
            (hand[1]+.10,w*.23,w*.18,hand[0],hand[2]+.02),
            (hand[1]+.30,w*.17,w*.15,hand[0],hand[2]+.04),
        ],glove,24)
        for finger in range(4):
            fx=hand[0]+side*(finger-1.5)*w*.055
            tube(kind+'_Finger'+str(side)+'_'+str(finger),
                 [(fx,hand[1]+.18,hand[2]+.08),(fx+side*.015,hand[1]-.12,hand[2]+.12)],
                 [w*.030,w*.021],glove,12)

    # 코트 테일: 집사는 길고 갈라지며, 장의사는 더 넓고 무겁고, 기록관은 짧은 가운.
    tail_len=3.6 if kind=='Butler' else 4.2 if kind=='Undertaker' else 2.45
    tail_w=.62 if kind=='Butler' else .82 if kind=='Undertaker' else .58
    for side in [-1,1]:
        verts=[
          (-tail_w/2,0,0),(tail_w/2,0,0),(tail_w*.62,.18,0),(-tail_w*.62,.18,0),
          (-tail_w*.72,-tail_len,-.12),(tail_w*.72,-tail_len,-.12),(tail_w*.92,-tail_len,.18),(-tail_w*.92,-tail_len,.18)
        ]
        data=s.mesh(kind+'_CoatTail'+str(side),verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],q['coat'])
        tail=s.node(kind+'_CoatTail'+str(side),data,(side*w*.28,h*.43,-.20),parent=p)
        tail.rotation_euler.y=side*(.04 if kind!='Undertaker' else .09)

    for i in range(5):
        s.ellipsoid(kind+'_Button'+str(i),(0,h*(.63-i*.039),.70),(.14,.14,.075),c['brass'],parent=p)

    # 목과 얼굴은 역할별 단면 비율을 완전히 분리한다.
    loft(kind+'_Neck',[(h*.725,w*.16,w*.16,0,0),(h*.785,w*.15,w*.145,0,0)],q['skin'],28)
    if kind=='Butler':
        headrings=[
          (h*.768,.34,.31,0,.03),(h*.790,.53,.45,0,.07),(h*.825,.70,.55,0,.08),
          (h*.865,.74,.58,0,.05),(h*.905,.68,.55,0,0),(h*.940,.55,.48,0,-.04),(h*.960,.22,.24,0,-.08)
        ]
    elif kind=='Undertaker':
        headrings=[
          (h*.755,.40,.35,0,.07),(h*.780,.62,.52,0,.10),(h*.815,.80,.65,0,.10),
          (h*.855,.86,.70,0,.05),(h*.895,.78,.66,0,-.02),(h*.925,.62,.55,0,-.07),(h*.945,.28,.30,0,-.10)
        ]
    else:
        headrings=[
          (h*.748,.28,.27,0,.10),(h*.775,.45,.41,0,.14),(h*.815,.60,.52,0,.13),
          (h*.855,.66,.57,0,.08),(h*.895,.59,.53,0,.01),(h*.930,.46,.43,0,-.06),(h*.952,.20,.23,0,-.10)
        ]
    head=loft(kind+'Head',headrings,q['skin'],56)
    # 기존 물리 개그가 집사 머리 조각을 찾을 수 있게 동일 얼굴 셸을 유지한다.
    loft(kind+'_Skullskin',headrings[1:-1],q['skin'],48)

    head_y=h*.855
    # 광대/턱/콧대
    cheek_x=.34 if kind=='Butler' else .40 if kind=='Undertaker' else .29
    for side in [-1,1]:
        s.ellipsoid(kind+'_Cheek'+str(side),(side*cheek_x,head_y-.02,.52),(.30,.26,.22),q['skin'],parent=p)
    jaw=loft(kind+'_Jaw',[
        (h*.785,.26,.25,0,.16),(h*.805,.48*q['jaw'],.36,0,.20),(h*.835,.53*q['jaw'],.38,0,.22)
    ],q['skin'],36)
    nose_len=.76 if kind=='Butler' else .61 if kind=='Undertaker' else .50
    loft(kind+'_Nose',[
        (h*.825,.10,.10,0,.54),(h*.855,.13,.12,0,.64),(h*.885,.09,.10,0,.54+nose_len*.22)
    ],q['skin'],28)

    # 눈·눈꺼풀·눈썹·눈 밑. 가까운 카메라에서 표정이 읽혀야 한다.
    eye_y=h*.875
    eye_x=.27 if kind=='Butler' else .31 if kind=='Undertaker' else .24
    for side in [-1,1]:
        ex=side*eye_x
        s.ellipsoid(kind+'_Eye'+str(side),(ex,eye_y,.64),(.18,.11,.075),c['ivory'],parent=p)
        s.ellipsoid(kind+'_Iris'+str(side),(ex,eye_y,.705),(.072,.065,.028),q['eye'],parent=p)
        s.ellipsoid(kind+'_Pupil'+str(side),(ex,eye_y,.727),(.030,.036,.014),c['black'],parent=p)
        lid=s.box(kind+'_Lid'+str(side),(ex,eye_y+h*.023,.705),(.38,h*.018,.032),q['skin'],parent=p,lean=-side*.025)
        brow=s.box(kind+'_Brow'+str(side),(ex,eye_y+h*.060,.724),(.42,h*.020,.036),q['hair'],parent=p,lean=side*(.10 if kind=='Undertaker' else -.05 if kind=='Butler' else .025))
        if kind=='Butler':
            s.box('Butler_EyeBag'+str(side),(ex,eye_y-h*.032,.700),(.34,h*.012,.025),q['vest'],parent=p,lean=side*.025)
        elif kind=='Undertaker':
            s.ellipsoid('Undertaker_CheekShadow'+str(side),(ex*1.05,eye_y-h*.065,.58),(.26,.13,.035),q['vest'],parent=p)
    for side in [-1,1]:
        s.ellipsoid(kind+'_Ear'+str(side),(side*(headrings[3][1]*.97),h*.850,.02),(.16,h*.075,.12),q['skin'],parent=p)

    # 입/인중/턱선
    lipmat=q['accent'] if kind=='Undertaker' else s.material(kind+'Lip',(.22,.09,.10))
    lipmat['manorFinish']='SmoothPlastic'
    loft(kind+'_MouthUpper',[(h*.810,.20,.035,0,.67),(h*.822,.31,.045,0,.70)],lipmat,28)
    loft(kind+'_MouthLower',[(h*.795,.18,.035,0,.67),(h*.807,.28,.045,0,.70)],lipmat,28)

    # 머리/수염/소품은 실루엣을 역할별로 완전히 분리.
    if kind=='Butler':
        loft('Butler_HairCrown',[
            (h*.900,.62,.50,0,-.08),(h*.936,.58,.47,0,-.10),(h*.965,.30,.29,0,-.12)
        ],q['hair'],44)
        for side in [-1,1]:
            loft('Butler_HairSide'+str(side),[
                (h*.840,.18,.22,side*.61,-.03),(h*.895,.22,.27,side*.58,-.06),(h*.938,.15,.20,side*.49,-.09)
            ],q['hair'],24)
            tube('Butler_Moustache'+str(side),[(side*.03,h*.817,.72),(side*.34,h*.812,.71)],[.045,.025],q['hair'],14)
        s.box('Butler_BowTie',(0,h*.720,.80),(1.18,.28,.18),q['accent'],parent=p)
        s.lathe('Butler_Tray',(w*.82,h*.415,.86),w*.64,w*.64,.10,c['brass'],sides=40,parent=p)
        s.lathe('Butler_Candle',(w*.82,h*.485,.86),.13,.11,h*.12,c['ivory'],sides=24,parent=p)
        s.ellipsoid('Butler_CandleFlame',(w*.82,h*.565,.86),(.20,.60,.18),c['amber'],parent=p)
    elif kind=='Undertaker':
        loft('Undertaker_HairBack',[
            (h*.845,.72,.62,0,-.16),(h*.900,.76,.67,0,-.20),(h*.940,.52,.50,0,-.22)
        ],q['hair'],44)
        s.lathe('UndertakerHatBrim',(0,h*.952,0),w*.80,w*.80,h*.025,c['black'],sides=56,parent=p)
        s.lathe('UndertakerHat',(0,h*1.015,-.03),w*.47,w*.38,h*.18,c['black'],sides=48,parent=p)
        s.lathe('UndertakerHatRibbon',(0,h*.985,.01),w*.49,w*.49,h*.025,q['accent'],sides=48,parent=p)
        s.box('Undertaker_Ledger',(w*.66,h*.43,.72),(w*.82,h*.19,.20),q['accent'],parent=p)
        s.box('Undertaker_LedgerBand',(w*.66,h*.43,.84),(w*.15,h*.20,.025),c['brass'],parent=p)
        tube('Undertaker_SpadeHandle',[(-w*.72,h*.12,-.10),(-w*.72,h*.58,-.12)],[.07,.06],s.material('DarkWood',(.09,.040,.022)),18)
        s.box('Undertaker_SpadeBlade',(-w*.72,h*.055,-.08),(w*.48,h*.10,w*.55),c['stone'],parent=p)
    else:
        loft('Archivist_HairBack',[
            (h*.885,.52,.46,0,-.12),(h*.925,.46,.42,0,-.15),(h*.952,.22,.25,0,-.17)
        ],q['hair'],32)
        for side in [-1,1]:
            loft('Archivist_HairWisp'+str(side),[
                (h*.900,.09,.11,side*.33,-.06),(h*.947,.07,.09,side*.25,-.13),(h*.975,.04,.06,side*.17,-.18)
            ],q['hair'],16)
            s.lathe('Archivist_GlassLens'+str(side),(side*.25,h*.862,.72),.22,.22,.025,c['glass'],sides=32,parent=p)
            s.lathe('Archivist_GlassRim'+str(side),(side*.25,h*.862,.745),.245,.245,.025,c['brass'],sides=32,parent=p)
        s.box('Archivist_GlassBridge',(0,h*.862,.76),(.20,.035,.030),c['brass'],parent=p)
        s.ellipsoid('Archivist_InkStain',(-w*.60,h*.28,.22),(.14,.08,.14),q['accent'],parent=p)
        s.box('Archivist_Ledger',(w*.56,h*.40,.76),(w*.90,h*.25,.20),q['accent'],parent=p)
        s.box('Archivist_LedgerLabel',(w*.56,h*.40,.88),(w*.52,h*.12,.025),c['ivory'],parent=p)
        tube('Archivist_Pen',[(w*.12,h*.46,.91),(w*.34,h*.52,.91)],[.025,.016],c['brass'],12)
        s.lathe('Archivist_KeyBow',(-w*.58,h*.34,.62),.16,.16,.025,c['brass'],sides=28,parent=p)
        tube('Archivist_KeyStem',[(-w*.58,h*.30,.62),(-w*.58,h*.22,.62)],[.028,.022],c['brass'],10)

    # 서로 다른 기본 자세. 정면 마네킹 정자세를 피한다.
    if kind=='Butler':p.rotation_euler.z=math.radians(-1.2)
    elif kind=='Undertaker':p.rotation_euler.z=math.radians(2.8)
    else:p.rotation_euler.z=math.radians(-3.4)
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
    (OUT/'build-evidence.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string+' / build.py','normalization':{'up':'Y','forward':'+Z','origin':'GROUND_CENTER','units':'STUD','textures':'EMBEDDED','interactionPrefixesPreserved':True},'reusedOriginals':['Kenney CC0 furniture','Kenney CC0 graveyard architecture'],'actualRobloxPlayTest':False,'originalHotelAssetsUsed':False,'style':'괴물 가족의 살아 있는 저택','layers':['foreground','walkable_3d','portrait_relief','midground','background'],'modifiedCC0Props':['bookcaseClosed','chairCushion','coffin','character-ghost','tableRound'],'npcGeometry':'DIRECT_PROCEDURAL_ROLE_SPECIFIC_V3','bounds':{'width':hi.x-lo.x,'height':hi.z-lo.z,'depth':hi.y-lo.y},'models':results},ensure_ascii=False,indent=2)+'\n')
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

    # NPC 별 실제 export GLB를 다시 불러 정면/3/4/전신을 검수한다.
    npc_reviews={}
    for kind in ['butler','undertaker','archivist']:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(OUT/(kind+'.glb')))
        npc_world=bpy.data.worlds.new('NPCReviewWorld_'+kind);npc_world.use_nodes=True
        npc_world.node_tree.nodes['Background'].inputs[0].default_value=(.028,.03,.036,1)
        npc_world.node_tree.nodes['Background'].inputs[1].default_value=.42
        bpy.context.scene.world=npc_world
        npc_collection=bpy.context.scene.collection
        def npc_light(name,pos,energy,color,size):
            data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.size=size
            obj=bpy.data.objects.new(name,data);npc_collection.objects.link(obj);obj.location=xyz(pos)
            obj.rotation_euler=(Vector(xyz((0,5,0)))-obj.location).to_track_quat('-Z','Y').to_euler()
        npc_light('NPCKey',(-4,8,6),2100,(1,.72,.48),5)
        npc_light('NPCFill',(4,6,4),1250,(.45,.62,1),4)
        npc_light('NPCRim',(0,8,-5),1550,(.75,.82,1),4)
        cam_data=bpy.data.cameras.new('NPCReviewCamera');cam=bpy.data.objects.new('NPCReviewCamera',cam_data);npc_collection.objects.link(cam)
        bpy.context.scene.camera=cam;cam_data.lens=58
        sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=20;sc.cycles.use_denoising=True
        sc.render.resolution_x=720;sc.render.resolution_y=900;sc.render.resolution_percentage=100
        sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast';sc.view_settings.exposure=.7
        files=[]
        for view,pos,target in [
            ('front',(0,5.2,14),(0,5.2,0)),
            ('three-quarter',(7.8,5.6,10.5),(0,5.0,0)),
            ('full-body',(0,6.1,18),(0,5.0,0)),
        ]:
            cam.location=xyz(pos);cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler()
            name=kind+'-'+view+'.png';sc.render.filepath=str(review/name);bpy.ops.render.render(write_still=True);files.append(name)
        npc_reviews[kind]=files
    (review/'evidence.json').write_text(json.dumps({
      'renderer':'Blender '+bpy.app.version_string+' Cycles',
      'input':'generated/manor-lobby.glb',
      'sha256':hashlib.sha256((OUT/'manor-lobby.glb').read_bytes()).hexdigest(),
      'method':'Import exported manor and each exported NPC GLB into empty scenes, then render',
      'npcReviewFiles':npc_reviews,
      'npcRoleSpecificGeometry':True,
      'sharedBrideHeadUsedForNPCs':False,
      'actualRobloxPlayTest':False
    },indent=2)+'\n')

if __name__=='__main__':build()
