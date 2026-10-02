# 파일명: assets/roblox/midnight-manor/build.py
"""괴물 가족의 저택: 블렌더 기본 메시 + 내부 CC0 GLB + 처녀귀신 원본 재구성.

Downloaded CC0 meshes remain in sources/ with exact licenses and hashes.
The manor, NPC silhouettes and articulated gag props are original geometry.
Coordinates: metres/studs, Y up, front courtyard towards positive Z.
"""
from pathlib import Path
import copy, hashlib, json, math, os, shutil, struct, tarfile
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
        # Roblox 모바일 예산: 실루엣을 유지하는 단일 챔퍼로 상자형 건축 부품의 중복 폴리곤을 줄인다.
        bevel=o.modifiers.new('Carved_edges','BEVEL');bevel.width=min(.085,min(size)*.18);bevel.segments=1
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


    def loft(self,name,pos,sections,mat,sides=28,parent=None,rot=0):
        """여러 타원 단면을 연결하는 연속 곡면. NPC 얼굴/몸/의상용."""
        sides=max(16,sides);verts=[]
        for section in sections:
            y,rx,rz=section[:3]
            dx=section[3] if len(section)>3 else 0
            dz=section[4] if len(section)>4 else 0
            front=section[5] if len(section)>5 else 0
            back=section[6] if len(section)>6 else 0
            for i in range(sides):
                a=math.tau*i/sides
                sn=math.sin(a);cs=math.cos(a)
                front_weight=max(0,sn)**4
                back_weight=max(0,-sn)**4
                verts.append((dx+cs*rx,y,dz+sn*rz+front*front_weight-back*back_weight))
        faces=[]
        rings=len(sections)
        faces.append(list(reversed(range(sides))))
        top=[(rings-1)*sides+i for i in range(sides)];faces.append(top)
        for j in range(rings-1):
            base=j*sides;next_base=(j+1)*sides
            for i in range(sides):
                n=(i+1)%sides
                faces.append((base+i,base+n,next_base+n,next_base+i))
        data=self.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        bevel=None
        return self.node(name,data,pos,rot,parent=parent)

    def prism(self,name,pos,outline,depth,mat,parent=None,rot=0):
        """의상 패널/라펠/코트자락용 임의 윤곽 두께 메쉬."""
        z=depth/2;verts=[(x,y,-z)for x,y in outline]+[(x,y,z)for x,y in outline]
        n=len(outline)
        faces=[list(reversed(range(n))),list(range(n,2*n))]
        faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        data=self.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=False
        o=self.node(name,data,pos,rot,parent=parent)
        bevel=o.modifiers.new('Soft_seam','BEVEL');bevel.width=min(.035,depth*.24);bevel.segments=2
        return o

    def capsule(self,name,pos,height,radius,depth,mat,parent=None,taper=.82):
        """세로 관절용 연속 곡면. 구형 파츠를 겹쳐 붙이지 않는다."""
        half=height/2
        sections=[
          (-half, radius*taper, depth*taper, 0, 0, 0, 0),
          (-half*.72, radius, depth, 0, 0, 0, 0),
          (0, radius*1.03, depth*1.02, 0, 0, 0, 0),
          (half*.72, radius, depth, 0, 0, 0, 0),
          (half, radius*taper, depth*taper, 0, 0, 0, 0),
        ]
        return self.loft(name,pos,sections,mat,sides=24,parent=parent)

    def curve_tube(self,name,points,radii,depths,mat,sides=28,parent=None):
        """굽은 팔/다리/손잡이를 위한 경로 기반 연속 곡면."""
        assert len(points)>=2 and len(points)==len(radii)==len(depths)
        sides=max(18,sides);verts=[]
        vectors=[Vector(p) for p in points]
        previous_u=None
        for j,center in enumerate(vectors):
            if j==0:tangent=(vectors[1]-center).normalized()
            elif j==len(vectors)-1:tangent=(center-vectors[j-1]).normalized()
            else:tangent=(vectors[j+1]-vectors[j-1]).normalized()
            ref=Vector((0,0,1)) if abs(tangent.z)<.88 else Vector((1,0,0))
            u=tangent.cross(ref)
            if u.length<.001:u=tangent.cross(Vector((0,1,0)))
            u.normalize()
            if previous_u is not None and u.dot(previous_u)<0:u=-u
            v=tangent.cross(u).normalized();previous_u=u
            for i in range(sides):
                a=math.tau*i/sides
                p=center+u*(math.cos(a)*radii[j])+v*(math.sin(a)*depths[j])
                verts.append(tuple(p))
        faces=[list(reversed(range(sides))),list(range((len(points)-1)*sides,len(points)*sides))]
        for j in range(len(points)-1):
            a0=j*sides;b0=(j+1)*sides
            for i in range(sides):
                n=(i+1)%sides;faces.append((a0+i,a0+n,b0+n,b0+i))
        data=self.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        obj=self.node(name,data,parent=parent)
        obj['continuousPathSurface']=True
        return obj

    def lens(self,name,pos,size,mat,parent=None,sides=32,rings=12):
        """눈/유리용 얇은 타원 렌즈. 박스/평면 카드 대신 자체 곡면을 쓴다."""
        rx,ry,rz=(size[0]/2,size[1]/2,size[2]/2)
        verts=[]
        for j in range(rings+1):
            b=math.pi*j/rings
            for i in range(sides):
                a=math.tau*i/sides
                x=math.sin(b)*math.cos(a)*rx
                y=math.cos(b)*ry
                z=math.sin(b)*math.sin(a)*rz
                verts.append((x,y,z))
        faces=[]
        for j in range(rings):
            for i in range(sides):
                a=j*sides+i;n=j*sides+(i+1)%sides
                faces.append((a,n,n+sides,a+sides))
        data=self.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        obj=self.node(name,data,pos,parent=parent)
        obj['continuousLensSurface']=True
        return obj

    def sculpted_face(self,name,pos,size,mat,profile,parent=None):
        """역할별 얼굴 골격을 한 연속 표면에서 직접 조형한다.

        56방향 x 35단면의 곡면에 턱·광대·안와·눈썹뼈·콧대·인중·턱끝 변위를
        부드럽게 섞는다. 동일 머리 메시 복제나 primitive 얼굴 조립을 사용하지 않는다.
        """
        sides=56;rings=36
        rx,ry,rz=(size[0]/2,size[1]/2,size[2]/2)
        verts=[(0,-ry,0)]
        def gauss(x,y,cx,cy,sx,sy):
            return math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2)*.5)
        for j in range(1,rings):
            lat=-math.pi/2+math.pi*j/rings
            cl=math.cos(lat);yn=math.sin(lat)
            for i in range(sides):
                a=math.tau*i/sides
                ca,sa=math.cos(a),math.sin(a)
                xn=cl*ca
                front=max(0.0,sa)**3
                # 하악·관자·광대 폭을 역할별로 따로 만든다.
                jaw_t=max(0.0,min(1.0,(-yn-.03)/.78))
                temple_t=max(0.0,min(1.0,(yn-.28)/.55))
                cheek_band=math.exp(-((yn-.02)/.28)**2)
                width_scale=1+(profile.get('jaw',1)-1)*jaw_t
                width_scale*=1+(profile.get('temple',1)-1)*temple_t
                width_scale*=1+profile.get('cheek_width',.04)*cheek_band
                x=xn*rx*width_scale
                y=yn*ry
                z=cl*sa*rz
                if front>0:
                    nx=x/max(rx,.001)
                    # 얼굴의 앞면 깊이. 코는 별도 팁 메시와 자연스럽게 이어질 정도만 베이스를 세운다.
                    depth=0.0
                    depth+=profile.get('nose_bridge',.18)*gauss(nx,yn,0,.16,.12,.28)
                    depth+=profile.get('nose_tip',.10)*gauss(nx,yn,0,-.01,.105,.12)
                    depth+=profile.get('nose_wing',.028)*(gauss(nx,yn,-.13,-.05,.075,.08)+gauss(nx,yn,.13,-.05,.075,.08))
                    depth+=profile.get('cheek',.08)*(gauss(nx,yn,-.40,.02,.18,.22)+gauss(nx,yn,.40,.02,.18,.22))
                    depth-=profile.get('eye_socket',.10)*(gauss(nx,yn,-.27,.22,.15,.13)+gauss(nx,yn,.27,.22,.15,.13))
                    depth+=profile.get('brow',.06)*(gauss(nx,yn,-.27,.37,.18,.11)+gauss(nx,yn,.27,.37,.18,.11))
                    depth+=profile.get('muzzle',.035)*gauss(nx,yn,0,-.23,.30,.16)
                    depth-=profile.get('philtrum',.018)*gauss(nx,yn,0,-.16,.055,.08)
                    depth+=profile.get('upper_lip',.020)*gauss(nx,yn,0,-.27,.19,.055)
                    depth+=profile.get('lower_lip',.018)*gauss(nx,yn,0,-.34,.18,.055)
                    depth+=profile.get('chin',.055)*gauss(nx,yn,0,-.58,.26,.17)
                    depth-=profile.get('temple_hollow',.035)*(gauss(nx,yn,-.58,.32,.18,.26)+gauss(nx,yn,.58,.32,.18,.26))
                    # 비대칭은 얼굴 전체를 찌그러뜨리지 않고 입가/광대에만 극소량 적용한다.
                    asym=profile.get('asymmetry',0)
                    depth+=asym*gauss(nx,yn,.34,-.12,.22,.23)
                    z+=rz*front*depth
                verts.append((x,y,z))
        top=len(verts);verts.append((0,ry,0))
        faces=[]
        first=1
        for i in range(sides):
            faces.append((0,first+(i+1)%sides,first+i))
        for j in range(rings-2):
            a0=1+j*sides;b0=a0+sides
            for i in range(sides):
                n=(i+1)%sides
                faces.append((a0+i,a0+n,b0+n,b0+i))
        last=1+(rings-2)*sides
        for i in range(sides):
            faces.append((last+i,last+(i+1)%sides,top))
        data=self.mesh(name,verts,faces,mat)
        for face in data.polygons:face.use_smooth=True
        obj=self.node(name,data,pos,parent=parent)
        obj['roleSpecificFace']=profile.get('role',name)
        obj['faceTopology']='SCULPTED_CONTINUOUS_56x36_V1'
        return obj

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
        triangles=sum(d['accessors'][p['indices']]['count']//3 for m in d.get('meshes',[]) for p in m.get('primitives',[]) if 'indices' in p)
        return {'file':path.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'nodes':len(d['nodes']),'meshes':len(d['meshes']),'triangles':triangles}

    def batch_static(self):
        # 장식의 수는 유지하고 같은 재질의 고정 소품만 병합한다. 움직이는 노드는 보존한다.
        keep=('Butler','Archivist','Undertaker','CoffinLid','CoffinHand','ArmorHelmet','LittleGhost',
              'TeaCup','Tea','ChandelierFlame','MirrorPupil','FamilyPortrait','PortraitCanvas','HearthFlame',
              'MapPin','GhostRelic_','RareRelic_','MemoryRelic','MapMasterpiece_','GallerySet_',
              'FireplaceFeature_','MasterCollectionRelic','ManorCrestSegment',
              'BackWall','HallFloor','Courtyard','CrookedRoof','ClockPendulum','EntryDoor')
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
        'h':10.9,'w':1.78,'lean':-.035,'skin':s.material('ButlerSkin',(.58,.53,.47)),
        'coat':s.material('ButlerCoat',(.038,.045,.055)),'vest':s.material('ButlerVest',(.075,.085,.09)),
        'accent':s.material('ButlerWine',(.22,.025,.05)),'hair':s.material('ButlerHair',(.025,.022,.024)),
        'eye':s.material('ButlerIris',(.075,.09,.075)),'jaw':1.02,'nose':1.16,'head':(.72,1.24,.80),
      },
      'Undertaker':{
        'h':9.65,'w':2.06,'lean':.095,'skin':s.material('UndertakerSkin',(.47,.49,.47)),
        'coat':s.material('UndertakerCoat',(.028,.031,.038)),'vest':s.material('UndertakerVest',(.055,.042,.05)),
        'accent':s.material('UndertakerWine',(.28,.018,.045)),'hair':s.material('UndertakerHair',(.018,.021,.024)),
        'eye':s.material('UndertakerIris',(.11,.075,.065)),'jaw':.94,'nose':1.00,'head':(1.00,1.08,1.00),
      },
      'Archivist':{
        'h':8.85,'w':1.72,'lean':.13,'skin':s.material('ArchivistSkin',(.54,.50,.43)),
        'coat':s.material('ArchivistCoat',(.070,.118,.105)),'vest':s.material('ArchivistVest',(.105,.075,.055)),
        'accent':s.material('ArchivistInk',(.075,.055,.095)),'hair':s.material('ArchivistHair',(.085,.075,.065)),
        'eye':s.material('ArchivistIris',(.095,.12,.11)),'jaw':.82,'nose':.94,'head':(.70,1.20,.78),
      },
    }
    q=profiles[kind];h=q['h'];w=q['w']
    trousers=s.material(kind+'Trousers',(.025,.028,.034) if kind!='Archivist' else (.055,.062,.054))
    leather=s.material(kind+'Leather',(.050,.026,.018) if kind!='Undertaker' else (.032,.020,.018))
    glove=s.material('ButlerGlove',(.60,.59,.55)) if kind=='Butler' else q['skin']
    for mat,rough,metal in [(q['skin'],.56,0),(q['coat'],.86,0),(q['vest'],.78,0),(q['hair'],.68,0),(q['accent'],.75,0),(trousers,.82,0),(leather,.38,0),(glove,.62,0)]:
        if mat.use_nodes:
            bs=mat.node_tree.nodes.get('Principled BSDF')
            if bs:
                bs.inputs['Roughness'].default_value=rough
                bs.inputs['Metallic'].default_value=metal
    q['skin']['manorFinish']='SmoothPlastic'
    q['coat']['manorFinish']='Fabric'
    q['vest']['manorFinish']='Fabric'
    q['accent']['manorFinish']='Fabric'
    q['hair']['manorFinish']='SmoothPlastic'
    q['eye']['manorFinish']='SmoothPlastic'
    trousers['manorFinish']='Fabric'
    leather['manorFinish']='Leather'
    glove['manorFinish']='Fabric' if kind=='Butler' else 'SmoothPlastic'
    p=s.node(kind,pos=pos)
    p.rotation_euler.y=q['lean']

    # 하체는 하나의 타원체가 아니라 허벅지-무릎-종아리 단면이 이어지는 연속 곡면이다.
    stance=.32 if kind=='Butler' else .39 if kind=='Undertaker' else .29
    for side in [-1,1]:
        sx=side*w*stance
        # 무릎을 살짝 굽힌 연속 경로 곡면. 다리 전체가 하나의 메시라 관절 이음새가 없다.
        leg_points=[
          (sx,.62,.04),
          (sx+side*w*.012,h*.13,.02),
          (sx+side*w*.030,h*.23,0),
          (sx-side*w*.018,h*.33,-.025),
          (sx,h*.405,-.035),
        ]
        s.curve_tube(kind+'_Leg'+str(side),leg_points,
          [w*.18,w*.17,w*.205,w*.24,w*.22],
          [w*.20,w*.18,w*.22,w*.255,w*.24],
          trousers,sides=26,parent=p)
        shoe=s.loft(kind+'_Shoe'+str(side),(sx,.05,.10),[
          (-.02,w*.205,w*.22,0,.08,.04),
          (.10,w*.235,w*.27,0,.16,.08),
          (.22,w*.25,w*.32,0,.26,.11),
          (.34,w*.235,w*.34,0,.34,.10),
          (.45,w*.185,w*.27,0,.37,.06)
        ],leather,sides=28,parent=p)
        shoe.rotation_euler.x=.025 if kind=='Butler' else -.015

    # 흉곽/허리/골반을 한 연속 몸통으로 잡아 primitive 겹침 이음새를 제거한다.
    if kind=='Butler':
        torso_sections=[
          (h*.385,w*.46,w*.31,0,-.025,0),(h*.44,w*.47,w*.32,0,-.010,.015),
          (h*.50,w*.43,w*.31,0,.005,.025),(h*.565,w*.52,w*.34,0,.010,.040),
          (h*.625,w*.59,w*.37,0,.006,.050),(h*.675,w*.64,w*.36,0,-.004,.025),
          (h*.715,w*.47,w*.29,0,-.012,.008),
        ]
    elif kind=='Undertaker':
        torso_sections=[
          (h*.385,w*.59,w*.38,0,-.035,0),(h*.44,w*.62,w*.40,0,-.015,.020),
          (h*.50,w*.58,w*.39,0,.006,.030),(h*.565,w*.67,w*.43,0,.018,.055),
          (h*.625,w*.76,w*.47,0,.018,.070),(h*.675,w*.82,w*.46,0,.006,.045),
          (h*.715,w*.66,w*.39,0,-.010,.018),
        ]
    else:
        torso_sections=[
          (h*.385,w*.45,w*.31,0,-.020,0),(h*.44,w*.46,w*.31,0,-.005,.012),
          (h*.50,w*.40,w*.29,0,.010,.025),(h*.565,w*.49,w*.33,0,.020,.040),
          (h*.625,w*.55,w*.35,0,.018,.050),(h*.675,w*.58,w*.34,0,.008,.030),
          (h*.715,w*.44,w*.27,0,-.005,.010),
        ]
    s.loft(kind+'_CoatTorso',(0,0,0),torso_sections,q['coat'],sides=30,parent=p)

    # 셔츠와 조끼는 몸 앞에 붙인 박스가 아니라 실제 윤곽을 가진 얇은 의상 외피다.
    s.prism(kind+'_ShirtFront',(0,h*.475,.405),[
      (-w*.17,0),(w*.17,0),(w*.155,h*.195),(w*.085,h*.245),(-w*.085,h*.245),(-w*.155,h*.195)
    ],.085,c['ivory'],parent=p)
    s.prism(kind+'_Waistcoat',(0,h*.445,.475),[
      (-w*.27,0),(w*.27,0),(w*.255,h*.15),(w*.105,h*.215),(0,h*.17),(-w*.105,h*.215),(-w*.255,h*.15)
    ],.085,q['vest'],parent=p)
    s.prism(kind+'_Belt',(0,h*.425,.405),[
      (-w*.43,-h*.018),(w*.43,-h*.018),(w*.43,h*.018),(-w*.43,h*.018)
    ],.055,leather,parent=p)
    s.prism(kind+'_BeltBuckle',(0,h*.425,.445),[
      (-w*.060,-h*.020),(w*.060,-h*.020),(w*.060,h*.020),(-w*.060,h*.020)
    ],.040,c['brass'],parent=p)
    for i in range(4):
        s.loft(kind+'_Button'+str(i),(0,h*.60-i*h*.034,.61),[
          (-.045,.075,.035),(0,.085,.045),(.045,.075,.035)
        ],c['brass'],sides=18,parent=p)

    # 라펠은 역할별 각도/폭이 다르고 어깨에서 허리까지 실제 패널로 이어진다.
    lapel_drop=.30 if kind=='Butler' else .34 if kind=='Undertaker' else .25
    for side in [-1,1]:
        lapel_outline=[
          (0,0),(side*w*.18,-h*.045),(side*w*.31,-h*lapel_drop),
          (side*w*.12,-h*(lapel_drop+.055)),(side*w*.035,-h*.12)
        ]
        lapel=s.prism(kind+'_Lapel'+str(side),(side*w*.10,h*.695,.59),lapel_outline,.10,q['coat'],parent=p)
        lapel.rotation_euler.y=side*.035

        # 팔은 역할/좌우마다 다른 행동 자세를 가진다. 좌우 대칭 마네킹 포즈를 금지한다.
        shoulder=(side*w*.69,h*.64,.00)
        if kind=='Butler':
            if side<0:
                elbow=(-w*.75,h*.525,.025)
                wrist=(-w*.66,h*.385,.10)
            else:
                elbow=(w*.82,h*.500,.12)
                wrist=(w*.74,h*.365,.53)
        elif kind=='Undertaker':
            if side<0:
                elbow=(-w*.78,h*.505,-.055)
                wrist=(-w*.71,h*.315,-.08)
            else:
                elbow=(w*.75,h*.535,.14)
                wrist=(w*.53,h*.435,.48)
        else:
            if side<0:
                elbow=(-w*.70,h*.530,.16)
                wrist=(-w*.39,h*.455,.48)
            else:
                elbow=(w*.72,h*.520,.10)
                wrist=(w*.50,h*.405,.50)
        arm_points=[
          shoulder,
          (shoulder[0]*.985,h*.595,.018),
          elbow,
          ((elbow[0]+wrist[0])*.5,(elbow[1]+wrist[1])*.5,(elbow[2]+wrist[2])*.5),
          wrist,
        ]
        s.curve_tube(kind+'_Arm'+str(side),arm_points,
          [w*.255,w*.235,w*.205,w*.18,w*.155],
          [w*.27,w*.245,w*.215,w*.195,w*.18],
          q['coat'],sides=28,parent=p)
        s.loft(kind+'_Cuff'+str(side),wrist,[
          (-h*.016,w*.115,w*.125),(0,w*.125,w*.135),(h*.016,w*.115,w*.125)
        ],c['ivory'],sides=22,parent=p)
        hand_center=(wrist[0],wrist[1]-h*.07,wrist[2]+.045)
        s.loft(kind+'_Hand'+str(side),hand_center,[
          (-h*.040,w*.115,w*.125),(0,w*.140,w*.145),(h*.040,w*.120,w*.125)
        ],glove,sides=24,parent=p)
        finger_lengths=[.036,.043,.041,.033]
        for finger in range(4):
            fx=hand_center[0]+(finger-1.5)*w*.048
            length=h*finger_lengths[finger]
            start=(fx,hand_center[1]-h*.040,hand_center[2]+.060)
            mid=(fx+side*(finger-1.5)*w*.004,hand_center[1]-h*.040-length*.52,hand_center[2]+.072)
            tip=(fx+side*(finger-1.5)*w*.006,hand_center[1]-h*.040-length,hand_center[2]+.048)
            s.curve_tube(kind+'_Finger'+str(side)+'_'+str(finger),[start,mid,tip],
              [w*.024,w*.022,w*.017],[w*.026,w*.024,w*.018],glove,sides=18,parent=p)
        thumb_start=(hand_center[0]+side*w*.085,hand_center[1]-h*.008,hand_center[2]+.036)
        thumb_mid=(hand_center[0]+side*w*.120,hand_center[1]-h*.036,hand_center[2]+.064)
        thumb_tip=(hand_center[0]+side*w*.132,hand_center[1]-h*.062,hand_center[2]+.050)
        s.curve_tube(kind+'_Thumb'+str(side),[thumb_start,thumb_mid,thumb_tip],
          [w*.030,w*.027,w*.020],[w*.032,w*.029,w*.021],glove,sides=18,parent=p)
        # 손등 관절/손바닥 접힘은 한 곡선 메시로만 보강해 막대기 손 느낌을 줄이고 메시 폭증을 피한다.
        hand_detail_mat=q['accent'] if kind=='Butler' else leather if kind=='Undertaker' else q['accent']
        s.curve_tube(kind+'_HandCrease'+str(side),[
          (hand_center[0]-side*w*.065,hand_center[1]-h*.060,hand_center[2]+.118),
          (hand_center[0],hand_center[1]-h*.075,hand_center[2]+.132),
          (hand_center[0]+side*w*.065,hand_center[1]-h*.058,hand_center[2]+.112)
        ],[w*.005,w*.006,w*.004],[w*.004,w*.005,w*.003],hand_detail_mat,sides=14,parent=p)

    # 역할별 코트 자락. 앞에서 삼각 판처럼 보이지 않게 허리 뒤에서 시작하고 아래로 자연스럽게 벌어진다.
    if kind=='Butler':
        tail_len=.36
        for side in [-1,1]:
            outline=[
              (side*w*.03,0),(side*w*.24,-h*.015),(side*w*.30,-h*tail_len*.44),
              (side*w*.26,-h*tail_len*.83),(side*w*.16,-h*tail_len),(side*w*.055,-h*tail_len*.94)
            ]
            tail=s.prism('Butler_CoatTail'+str(side),(0,h*.425,-.34),outline,.11,q['coat'],parent=p)
            tail.rotation_euler.x=side*.018
    elif kind=='Undertaker':
        tail_len=.42
        for side in [-1,1]:
            outline=[
              (side*w*.02,0),(side*w*.33,-h*.020),(side*w*.40,-h*tail_len*.34),
              (side*w*.43,-h*tail_len*.74),(side*w*.34,-h*tail_len),(side*w*.08,-h*tail_len*.96)
            ]
            tail=s.prism('Undertaker_CoatTail'+str(side),(0,h*.435,-.31),outline,.15,q['coat'],parent=p)
            lining=s.prism('Undertaker_CoatLining'+str(side),(0,h*.430,-.215),[
              (side*w*.06,-h*.025),(side*w*.27,-h*.045),(side*w*.31,-h*tail_len*.48),
              (side*w*.28,-h*tail_len*.84),(side*w*.12,-h*tail_len*.90)
            ],.028,q['accent'],parent=p)
            lining.rotation_euler.x=side*.012
    else:
        tail_len=.245
        for side in [-1,1]:
            outline=[
              (side*w*.02,0),(side*w*.25,-h*.012),(side*w*.28,-h*tail_len*.44),
              (side*w*.22,-h*tail_len),(side*w*.055,-h*tail_len*.93)
            ]
            tail=s.prism('Archivist_CoatTail'+str(side),(0,h*.425,-.29),outline,.095,q['coat'],parent=p)
            tail.rotation_euler.x=side*.012

    # 의상 중앙 봉제선/허리 접힘. 역할별 재질과 곡률만 달리해 근접에서 천이 한 덩어리처럼 보이지 않게 한다.
    seam_y0=h*.43;seam_y1=h*.69
    s.curve_tube(kind+'_CoatCenterSeam',[
      (0,seam_y0,.505),(w*(.012 if kind=='Undertaker' else -.008),h*.56,.555),(0,seam_y1,.585)
    ],[w*.006,w*.007,w*.005],[w*.004,w*.005,w*.004],q['accent'],sides=14,parent=p)
    for side in [-1,1]:
        s.curve_tube(kind+'_WaistFold'+str(side),[
          (side*w*.12,h*.455,.475),(side*w*.24,h*.445,.455),(side*w*.36,h*.432,.405)
        ],[w*.006,w*.007,w*.004],[w*.004,w*.005,w*.003],q['coat'],sides=14,parent=p)

    # 목/머리: 얼굴은 2천+ 정점 연속 곡면으로 직접 조형한다.
    s.loft(kind+'_Neck',(0,h*.735,-.02),[
      (0,w*.17,w*.16),(h*.055,w*.16,w*.15),(h*.095,w*.145,w*.145)
    ],q['skin'],sides=28,parent=p)
    hx,hy,hz=q['head'];head_y=h*.865
    face_profiles={
      'Butler':dict(role='Butler',jaw=.76,temple=.95,cheek_width=.025,nose_bridge=.26,nose_tip=.15,nose_wing=.022,cheek=.080,eye_socket=.14,brow=.075,muzzle=.026,philtrum=.020,upper_lip=.018,lower_lip=.016,chin=.080,temple_hollow=.055,asymmetry=.008),
      'Undertaker':dict(role='Undertaker',jaw=1.08,temple=1.04,cheek_width=.075,nose_bridge=.14,nose_tip=.090,nose_wing=.042,cheek=.115,eye_socket=.17,brow=.050,muzzle=.045,philtrum=.016,upper_lip=.026,lower_lip=.024,chin=.048,temple_hollow=.028,asymmetry=-.012),
      'Archivist':dict(role='Archivist',jaw=.80,temple=.89,cheek_width=.012,nose_bridge=.18,nose_tip=.085,nose_wing=.018,cheek=.055,eye_socket=.16,brow=.035,muzzle=.024,philtrum=.022,upper_lip=.015,lower_lip=.014,chin=.064,temple_hollow=.075,asymmetry=.014),
    }
    head_size=(w*.98*hx,h*.225*hy,w*.92*hz)
    head=s.sculpted_face(kind+'Head',(0,head_y,0),head_size,q['skin'],face_profiles[kind],parent=p)
    face_front=head_size[2]*.5

    # 코는 실제 얼굴 전면에서 시작해 콧대-콧방울-끝이 앞으로 이어진다.
    nose_forward=(.24 if kind=='Butler' else .15 if kind=='Undertaker' else .13)*w
    s.curve_tube(kind+'_Nose',[
      (0,head_y+h*.070,face_front*.79),
      (0,head_y+h*.030,face_front*.90+nose_forward*.18),
      (0,head_y-h*.005,face_front*.96+nose_forward*.62),
      (0,head_y-h*.022,face_front+.035+nose_forward),
    ],[w*.050,w*.058,w*.064,w*.055],[w*.055,w*.062,w*.067,w*.058],q['skin'],sides=24,parent=p)

    # 눈은 역할별 비율과 처짐을 따로 잡아 얼굴 표면 안쪽에 붙인다.
    eye_profile={
      'Butler':dict(spacing=.184,width=.172,height=.029,depth=.046,y=.019,droop=.010,brow=.067,tilt=-.006),
      'Undertaker':dict(spacing=.198,width=.166,height=.028,depth=.044,y=.020,droop=.004,brow=.072,tilt=.012),
      'Archivist':dict(spacing=.178,width=.168,height=.027,depth=.043,y=.019,droop=.012,brow=.066,tilt=.003),
    }[kind]
    for side in [-1,1]:
        ex=side*w*eye_profile['spacing'];eye_y=head_y+h*eye_profile['y']
        ew=w*eye_profile['width'];eh=h*eye_profile['height'];ed=w*eye_profile['depth']
        s.lens(kind+'_Sclera'+str(side),(ex,eye_y,face_front+.010),(ew,eh,ed),c['ivory'],parent=p,sides=28,rings=10)
        s.lens(kind+'_Iris'+str(side),(ex,eye_y-h*.001,face_front+.032),(w*.050,h*.023,w*.015),q['eye'],parent=p,sides=22,rings=8)
        s.lens(kind+'_Pupil'+str(side),(ex,eye_y-h*.001,face_front+.042),(w*.018,h*.017,w*.008),c['black'],parent=p,sides=18,rings=6)
        lid_half=ew*.48;lid_y=eye_y+eh*.38
        s.curve_tube(kind+'_UpperLid'+str(side),[
          (ex-side*lid_half,lid_y-h*.003,face_front+.039),
          (ex,lid_y+h*(.004-eye_profile['droop']*.35),face_front+.045),
          (ex+side*lid_half,lid_y-h*.004,face_front+.038)
        ],[w*.008,w*.010,w*.007],[w*.006,w*.008,w*.005],q['skin'],sides=16,parent=p)
        lower_y=eye_y-eh*.38
        s.curve_tube(kind+'_LowerLid'+str(side),[
          (ex-side*lid_half*.90,lower_y+h*.002,face_front+.037),
          (ex,lower_y-h*.003,face_front+.041),
          (ex+side*lid_half*.90,lower_y+h*.002,face_front+.036)
        ],[w*.006,w*.007,w*.005],[w*.005,w*.006,w*.004],q['skin'],sides=16,parent=p)
        brow_y=head_y+h*eye_profile['brow'];brow_tilt=eye_profile['tilt']*h
        s.curve_tube(kind+'_Brow'+str(side),[
          (ex-side*w*.095,brow_y-brow_tilt,face_front+.039),
          (ex,brow_y+h*.004,face_front+.044),
          (ex+side*w*.095,brow_y+brow_tilt,face_front+.038)
        ],[w*.010,w*.013,w*.008],[w*.007,w*.009,w*.006],q['hair'],sides=16,parent=p)
        # 눈 밑 접힘과 팔자선은 색으로 그리지 않고 얕은 곡면으로 조형해 정면/3/4에서 얼굴 깊이를 유지한다.
        crease_y=eye_y-h*(.034 if kind=='Undertaker' else .030)
        s.curve_tube(kind+'_UnderEyeCrease'+str(side),[
          (ex-side*w*.080,crease_y+h*.004,face_front+.022),
          (ex,crease_y-h*.005,face_front+.028),
          (ex+side*w*.072,crease_y+h*.002,face_front+.020)
        ],[w*.0048,w*.0062,w*.0042],[w*.0038,w*.0050,w*.0035],q['skin'],sides=16,parent=p)
        cheek_x=side*w*(.105 if kind=='Undertaker' else .092)
        s.curve_tube(kind+'_Nasolabial'+str(side),[
          (cheek_x,head_y-h*.020,face_front+.040),
          (side*w*.120,head_y-h*.070,face_front+.035),
          (side*w*.090,head_y-h*.108,face_front+.025)
        ],[w*.0045,w*.0055,w*.0038],[w*.0035,w*.0045,w*.0030],q['skin'],sides=16,parent=p)
        nostril_x=side*w*(.045 if kind=='Butler' else .052)
        nostril_y=head_y-h*.024
        s.ellipsoid(kind+'_Nostril'+str(side),(nostril_x,nostril_y,face_front+.044+nose_forward*.92),
          (w*.030,h*.008,w*.014),q['hair'])

    # 입과 귀도 역할별 비율로 얼굴에 밀착시킨다.
    lip=s.material(kind+'Lip',(.22,.10,.11))
    mouth_y=head_y-h*.055
    mouth_half={'Butler':.098,'Undertaker':.108,'Archivist':.092}[kind]*w
    s.curve_tube(kind+'_UpperLip',[
      (-mouth_half,mouth_y,face_front+.032),
      (0,mouth_y+h*.003,face_front+.037),
      (mouth_half,mouth_y,face_front+.032)
    ],[w*.009,w*.011,w*.009],[w*.006,w*.008,w*.006],q['accent'] if kind=='Undertaker' else lip,sides=16,parent=p)
    s.curve_tube(kind+'_LowerLip',[
      (-mouth_half*.88,mouth_y-h*.013,face_front+.032),
      (0,mouth_y-h*.017,face_front+.038),
      (mouth_half*.88,mouth_y-h*.013,face_front+.032)
    ],[w*.008,w*.010,w*.008],[w*.006,w*.008,w*.006],lip,sides=16,parent=p)
    ear_profile={
      'Butler':(.405,.035,.045,.034),
      'Undertaker':(.418,.040,.050,.038),
      'Archivist':(.400,.033,.043,.032),
    }[kind]
    for side in [-1,1]:
        ear_x,ear_rx,ear_rz,ear_h=ear_profile
        ear=s.loft(kind+'_Ear'+str(side),(side*w*ear_x,head_y+.002,-.012),[
          (-h*ear_h,w*ear_rx,w*ear_rz),(0,w*(ear_rx+.010),w*(ear_rz+.015)),(h*ear_h,w*ear_rx,w*ear_rz)
        ],q['skin'],sides=18,parent=p)
        ear.rotation_euler.y=side*.14

    # 역할별 헤어/수염/소품. 실루엣만 봐도 세 NPC가 구분되게 한다.
    if kind=='Butler':
        s.loft('Butler_HairCap',(0,head_y+h*.075,-.055),[
          (-h*.015,w*.39,w*.34),(h*.04,w*.41,w*.35),(h*.095,w*.30,w*.28)
        ],q['hair'],sides=30,parent=p)
        for side in [-1,1]:
            s.curve_tube('Butler_HairTemple'+str(side),[
              (side*w*.31,head_y+h*.060,-.02),
              (side*w*.35,head_y+h*.018,.00),
              (side*w*.32,head_y-h*.030,.015)
            ],[w*.045,w*.052,w*.032],[w*.030,w*.035,w*.022],q['hair'],sides=18,parent=p)
            s.curve_tube('Butler_Moustache'+str(side),[
              (side*w*.018,head_y-h*.036,face_front+.071),
              (side*w*.095,head_y-h*.038,face_front+.075),
              (side*w*.190,head_y-h*.052,face_front+.068)
            ],[w*.020,w*.025,w*.014],[w*.013,w*.015,w*.010],q['hair'],sides=16,parent=p)
        s.prism('Butler_BowTie',(0,h*.728,.63),[
          (-w*.16,0),(-w*.045,h*.030),(0,0),(w*.045,h*.030),(w*.16,0),(w*.050,-h*.028),(0,0),(-w*.050,-h*.028)
        ],.075,q['accent'],parent=p)
        s.lathe('Butler_Tray',(w*.74,h*.355,.60),w*.47,w*.47,.075,c['brass'],parent=p)
        s.lathe('Butler_Candle',(w*.74,h*.420,.60),.095,.080,h*.095,c['ivory'],parent=p)
        s.loft('Butler_CandleFlame',(w*.74,h*.475,.60),[
          (-.25,.10,.08),(0,.13,.10),(.30,.03,.025)
        ],c['amber'],sides=18,parent=p)
    elif kind=='Undertaker':
        s.loft('Undertaker_HairBack',(0,head_y+h*.04,-.13),[
          (-h*.055,w*.38,w*.38),(h*.03,w*.44,w*.42),(h*.10,w*.32,w*.34)
        ],q['hair'],sides=28,parent=p)
        s.lathe('UndertakerHatBrim',(0,head_y+h*.145,0),w*.82,w*.82,h*.025,c['black'],sides=36,parent=p)
        s.loft('UndertakerHat',(0,head_y+h*.15,-.03),[
          (0,w*.46,w*.42),(h*.12,w*.43,w*.39),(h*.22,w*.34,w*.33)
        ],c['black'],sides=32,parent=p)
        s.lathe('UndertakerHatRibbon',(0,head_y+h*.175,.02),w*.47,w*.47,h*.026,q['accent'],sides=32,parent=p)
        s.box('Undertaker_Ledger',(w*.50,h*.445,.56),(w*.54,h*.145,.14),q['accent'],parent=p)
        s.box('Undertaker_LedgerBand',(w*.50,h*.445,.645),(w*.090,h*.155,.020),c['brass'],parent=p)
        s.lathe('Undertaker_SpadeHandle',(-w*.70,h*.37,-.12),.055,.055,h*.55,s.material('DarkWood',(.10,.045,.025)),parent=p)
        s.prism('Undertaker_SpadeBlade',(-w*.70,h*.07,-.10),[
          (-w*.20,0),(w*.20,0),(w*.15,h*.13),(0,h*.18),(-w*.15,h*.13)
        ],.18,c['stone'],parent=p)
    else:
        s.loft('Archivist_HairBack',(0,head_y+h*.07,-.09),[
          (-h*.03,w*.31,w*.31),(h*.035,w*.36,w*.34),(h*.095,w*.24,w*.27)
        ],q['hair'],sides=26,parent=p)
        for side in [-1,1]:
            s.curve_tube('Archivist_HairWisp'+str(side),[
              (side*w*.25,head_y+h*.105,-.03),
              (side*w*.30,head_y+h*.145,-.055),
              (side*w*.26,head_y+h*.175,-.075)
            ],[w*.022,w*.017,w*.010],[w*.016,w*.012,w*.008],q['hair'],sides=16,parent=p)
            s.lathe('Archivist_GlassRim'+str(side),(side*w*.205,head_y+h*.03,face_front+.095),w*.105,w*.105,.022,c['brass'],sides=28,parent=p)
        s.prism('Archivist_GlassBridge',(0,head_y+h*.03,face_front+.110),[
          (-w*.070,-h*.006),(w*.070,-h*.006),(w*.070,h*.006),(-w*.070,h*.006)
        ],.020,c['brass'],parent=p)
        s.prism('Archivist_InkStainL',(-w*.11,h*.43,.615),[
          (-w*.05,0),(w*.06,h*.01),(w*.04,h*.05),(-w*.045,h*.04)
        ],.018,q['accent'],parent=p)
        s.box('Archivist_Ledger',(w*.46,h*.415,.57),(w*.58,h*.18,.14),q['accent'],parent=p)
        s.box('Archivist_LedgerLabel',(w*.46,h*.415,.652),(w*.32,h*.085,.020),c['ivory'],parent=p)
        s.lathe('Archivist_Pen',(-w*.23,h*.475,.66),.020,.012,h*.15,c['brass'],parent=p)
        s.lathe('Archivist_KeyStem',(-w*.55,h*.32,.58),.025,.025,h*.13,c['brass'],parent=p)
        s.lathe('Archivist_KeyBow',(-w*.55,h*.40,.58),w*.08,w*.08,.025,c['brass'],sides=24,parent=p)

    # 역할별 기본 포즈: 집사 정자세, 장의사 무게중심 뒤, 기록관은 앞으로 굽힌다.
    if kind=='Butler':
        p.rotation_euler.z=math.radians(-1.5)
    elif kind=='Undertaker':
        p.rotation_euler.z=math.radians(2.5)
    else:
        p.rotation_euler.z=math.radians(-3.0)
    return p

def build():
    s=Scene();c=palette(s)
    # 대저택 전체 규모: 중앙 2층 그랜드홀 + 좌우 날개 + 정식 정원 플레이 영역.
    s.box('Courtyard',(0,-.2,20),(156,.8,132),s.material('courtyard',(.12,.17,.17)))
    s.box('HallFloor',(0,.1,-29),(108,.5,72),c['wood'])
    s.box('LeftWingFloor',(-58,.1,-30),(36,.48,64),c['wood'])
    s.box('RightWingFloor',(58,.1,-30),(36,.48,64),c['wood'])
    s.box('Runner',(0,.48,-25),(12,.08,61),c['red'])
    # 중앙 홀 외피와 좌우 날개. 중앙 시야를 막는 대형 빈 박스가 아니라 방 단위로 깊이를 나눈다.
    for side in [-1,1]:
        # 중앙 홀↔좌우 날개는 통짜 벽이 아니라 세 개의 실제 통로로 연결한다.
        wall_segments=[(-61.5,7),(-43.5,13),(-22.5,13),(-.5,15)]
        for seg,(z0,length) in enumerate(wall_segments):
            s.box('ManorSideWall'+str(side)+'_'+str(seg),(side*54,13,z0),(1.5,26,length),c['plum'],lean=side*.35)
        # 각 통로에 석재 문설주와 뾰족 아치 프레임을 둔다. 이동 폭은 8stud 이상 유지.
        for gate,z0 in enumerate([-54,-33,-12]):
            for jamb in [-1,1]:
                s.box('WingArchJamb'+str(side)+'_'+str(gate)+'_'+str(jamb),(side*53.65,5.0,z0+jamb*4.35),(1.0,10,.65),c['stone'])
            arch_points=[
              (side*53.58,9.4,z0-4.15),
              (side*53.58,11.0,z0-2.85),
              (side*53.58,13.7,z0),
              (side*53.58,11.0,z0+2.85),
              (side*53.58,9.4,z0+4.15),
            ]
            s.curve_tube('WingArch'+str(side)+'_'+str(gate),arch_points,
              [.30,.28,.24,.28,.30],[.30,.28,.24,.28,.30],c['stone'],sides=20)
            s.box('WingThreshold'+str(side)+'_'+str(gate),(side*54,.28,z0),(5.5,.18,8.0),c['stone'])
        s.box('FacadeWing'+str(side),(side*43,13,-2),(34,26,2),c['plum'],lean=side*.5)
        s.box('OuterWingWall'+str(side),(side*75,11,-31),(1.2,22,64),c['plum'],lean=side*.35)
        s.box('WingBackWall'+str(side),(side*58,11,-63),(35,22,1.2),c['plum'])
        for z in [-55,-39,-23,-7]:
            s.box('WallRib'+str(side)+str(z),(side*53.4,11,z),(1.2,22,1),c['wood'])
        # 1·2층 창: 깊은 recess + 석재 jamb/sill + 첨두 아치 + 목재 mullion + 안쪽 커튼 실루엣.
        for x in [side*33,side*45,side*61,side*70]:
            for y in [6.8,17.2]:
                key=str(x)+str(y)
                s.box('WindowRecess'+key,(x,y,-.92),(6.7,8.8,.48),c['black'])
                for jamb in [-1,1]:
                    s.box('WindowJamb'+key+str(jamb),(x+jamb*2.78,y,-.78),(.62,7.9,.78),c['stone'])
                s.box('WindowSill'+key,(x,y-4.05,-.72),(6.15,.48,1.0),c['stone'])
                s.curve_tube('WindowArch'+key,[
                  (x-2.78,y+3.25,-.68),(x-1.85,y+4.45,-.68),(x,y+5.15,-.68),
                  (x+1.85,y+4.45,-.68),(x+2.78,y+3.25,-.68)
                ],[.24,.22,.20,.22,.24],[.20,.18,.17,.18,.20],c['stone'],sides=18)
                s.box('WindowGlass'+key,(x,y,-.38),(4.85,6.8,.10),c['glass'])
                s.box('WindowMullion'+key,(x,y,-.20),(.20,6.9,.12),c['black'])
                s.box('WindowCross'+key,(x,y+.35,-.20),(4.9,.20,.12),c['black'])
                # 얕은 사선 납선과 상부 빗물받이가 평면 유리 느낌을 줄인다.
                for lattice in [-1.65,-.55,.55,1.65]:
                    lead=s.box('WindowLeadA'+key+str(lattice),(x+lattice,y,-.14),(.08,6.25,.07),c['brass'],rot=.20)
                    lead.rotation_euler.x=.16
                    lead2=s.box('WindowLeadB'+key+str(lattice),(x+lattice,y,-.135),(.08,6.25,.07),c['brass'],rot=-.20)
                    lead2.rotation_euler.x=-.16
                s.box('WindowDripCap'+key,(x,y+4.35,-.63),(6.9,.30,1.05),c['stone'])
                for bracket in [-1,1]:
                    s.box('WindowSillBracket'+key+str(bracket),(x+bracket*2.15,y-4.55,-.60),(.48,.95,.78),c['stone'],lean=-bracket*.10)
                # 커튼은 양쪽 가장자리에만 보여 창 내부에 깊이를 만든다.
                curtain=s.material('WindowCurtain',(.16,.035,.055))
                s.box('WindowCurtainL'+key,(x-1.72,y,-.50),(1.05,6.2,.08),curtain,lean=.12)
                s.box('WindowCurtainR'+key,(x+1.72,y,-.50),(1.05,6.2,.08),curtain,lean=-.12)
        s.box('EntryPillar'+str(side),(side*8.5,7.5,-2),(1.8,15,4),c['stone'],lean=-side*.45)
    s.box('BackWall',(0,13,-65),(110,26,1.5),c['plum'])
    for x in [-42,-28,-14,0,14,28,42]:
        s.box('CeilingBeamX'+str(x),(x,24.0,-31),(0.55,.70,64),c['wood'])
    for z0 in [-58,-46,-34,-22,-10]:
        s.box('CeilingBeamZ'+str(z0),(0,23.85,z0),(104,.55,.60),c['wood'])
    for side in [-1,1]:
        s.box('UpperWallMoulding'+str(side),(side*52.9,20.8,-31),(.35,.65,64),c['brass'])
    s.box('BackUpperMoulding',(0,20.8,-64.1),(106,.65,.35),c['brass'])
    s.box('EntryLintel',(0,15,-2),(20,3.5,4),c['wood'])
    s.curve_tube('EntryGrandArch',[
      (-9.2,14.2,-1.0),(-6.5,17.2,-1.0),(0,20.7,-1.0),(6.5,17.2,-1.0),(9.2,14.2,-1.0)
    ],[.42,.38,.32,.38,.42],[.34,.32,.28,.32,.34],c['stone'],sides=22)
    for side in [-1,1]:
        s.lathe('EntryArchCapital'+str(side),(side*9.2,13.7,-1.0),.72,.60,.65,c['brass'],sides=20)
    s.box('EntryThreshold',(0,.40,-2),(18,.4,6),c['stone'])

    # 현관문: 기존 EntryDoor 이름/동작은 유지하고, 깊은 패널·황동 문고리·문패·킥플레이트를 추가한다.
    for side in [-1,1]:
        door=s.node('EntryDoor'+str(side),pos=(side*7.2,.5,-2))
        s.box('EntryDoorWood'+str(side),(-side*3.5,5.8,0),(7,11.6,.62),c['wood'],parent=door)
        for py in [2.7,8.6]:
            s.box('EntryDoorPanelFrame'+str(side)+str(py),(-side*3.5,py,.34),(5.55,4.55,.16),c['brass'],parent=door)
            s.box('EntryDoorPanel'+str(side)+str(py),(-side*3.5,py,.44),(4.85,3.85,.10),c['teal'],parent=door)
        s.box('EntryDoorKickplate'+str(side),(-side*3.5,.85,.43),(5.0,1.0,.10),c['brass'],parent=door)
        s.lathe('EntryDoorKnob'+str(side),(-side*6.0,5.2,.58),.24,.20,.42,c['brass'],parent=door,sides=24)
        s.curve_tube('EntryDoorKnocker'+str(side),[
          (-side*3.5,6.95,.66),(-side*3.9,6.45,.72),(-side*3.5,5.95,.66),(-side*3.1,6.45,.72),(-side*3.5,6.95,.66)
        ],[.09]*5,[.07]*5,c['brass'],sides=16,parent=door)
    s.box('ManorNamePlaque',(0,17.8,-.56),(9.2,1.7,.24),c['wood'])
    s.box('ManorNamePlaqueInset',(0,17.8,-.40),(7.7,1.0,.08),c['brass'])
    # 현관 상부 팬라이트는 문이 열려도 고정된 입면 디테일로 남는다.
    fan_outline=[]
    for i in range(17):
        a=math.pi*i/16
        fan_outline.append((math.cos(a)*5.0,math.sin(a)*2.4))
    s.prism('EntryFanlightGlass',(0,13.9,-.55),fan_outline,.08,c['glass'])
    for i in range(7):
        a=math.pi*(i+1)/8
        s.curve_tube('EntryFanlightBar'+str(i),[
          (0,13.9,-.42),(math.cos(a)*4.55,13.9+math.sin(a)*2.05,-.42)
        ],[.075,.050],[.060,.040],c['brass'],sides=14)
    s.box('EntryFanlightSill',(0,13.55,-.58),(10.8,.34,1.05),c['stone'])

    # 중앙부는 2층 높이로 솟고 좌우 지붕은 낮아 실루엣이 단계적으로 읽힌다.
    roof=[[-61,25,-67],[61,25,-67],[61,25,1],[-61,25,1],[-7,46,-67],[-7,42,1]]
    s.node('CrookedRoof',s.mesh('CrookedRoof',roof,[[0,4,1],[3,2,5],[0,3,5,4],[4,5,2,1],[0,1,2,3]],c['roof']))
    s.box('CentralTower',(0,29,-36),(28,17,25),c['plum'])
    s.lathe('CentralTowerCrown',(0,46,-36),15,11,13,c['roof'],sides=8)
    # 굴뚝은 기단-샤프트-코니스-캡-연도 순서로 쌓아 큰 박스 느낌을 없앤다.
    s.box('LeaningChimneyBase',(31,28.4,-42),(7.2,2.0,7.2),c['stone'],lean=.35)
    s.box('LeaningChimney',(31.7,39.0,-42),(4.8,20.5,4.8),c['stone'],lean=1.25)
    s.box('ChimneyCornice',(32.9,48.9,-42),(6.0,.75,6.0),c['stone'])
    s.box('ChimneyCap',(33.1,50.0,-42),(6.8,.65,6.8),c['black'])
    for side in [-1,1]:
        s.lathe('ChimneyFlue'+str(side),(33.1+side*1.25,51.2,-42),.62,.54,2.0,c['black'],sides=20)
        s.lathe('ChimneyPot'+str(side),(33.1+side*1.25,52.65,-42),.78,.56,.90,c['stone'],sides=20)
    for ci,(x,z,h) in enumerate([(-31,-25,10),(-18,-52,8),(45,-18,9)]):
        s.box('SecondaryChimneyBase'+str(ci),(x,27.0,z),(4.8,1.4,4.8),c['stone'])
        s.box('SecondaryChimney'+str(ci),(x,31.0+h*.20,z),(3.1,7.0+h*.18,3.1),c['stone'],lean=(-.35 if ci%2 else .30))
        s.box('SecondaryChimneyCap'+str(ci),(x,35.0+h*.28,z),(4.1,.52,4.1),c['black'])
        s.lathe('SecondaryChimneyPot'+str(ci),(x,36.0+h*.28,z),.48,.38,1.25,c['stone'],sides=18)
    s.lathe('RightTurret',(57,27,-48),7,5.5,25,c['plum'],sides=10)
    s.lathe('RightTurretRoof',(58,48,-48),9,0,17,c['roof'],sides=10)

    # 개인 저택 외부 정체성: 진행도 가문 문장, 기록탑, 장의사 반입구, 집사 서비스 구역.
    crest_bg=s.material('CrestBlack',(.028,.025,.030))
    crest_wine=s.material('CrestWine',(.25,.028,.055))
    s.prism('ManorCrestShield',(0,22.9,-.72),[
      (-3.2,2.4),(3.2,2.4),(2.85,-.55),(1.55,-3.05),(0,-4.10),(-1.55,-3.05),(-2.85,-.55)
    ],.24,crest_bg)
    s.curve_tube('ManorCrestFrame',[
      (-3.2,25.3,-.54),(3.2,25.3,-.54),(2.85,22.35,-.54),(1.55,19.85,-.54),
      (0,18.80,-.54),(-1.55,19.85,-.54),(-2.85,22.35,-.54),(-3.2,25.3,-.54)
    ],[.14]*8,[.11]*8,c['brass'],sides=18)
    crest_shapes=[
      [(-2.45,1.55),(-1.55,1.80),(-1.35,-1.00),(-2.15,-1.55)],
      [(-1.35,1.85),(-.42,2.05),(-.30,-1.55),(-1.10,-1.05)],
      [(-.30,2.05),(.30,2.05),(.18,-2.55),(-.18,-2.55)],
      [(.42,2.05),(1.35,1.85),(1.10,-1.05),(.30,-1.55)],
      [(1.55,1.80),(2.45,1.55),(2.15,-1.55),(1.35,-1.00)],
      [(-1.55,-1.70),(0,-3.45),(1.55,-1.70),(.65,-1.20),(0,-2.20),(-.65,-1.20)]
    ]
    for i,outline in enumerate(crest_shapes):
        s.prism('ManorCrestSegment'+str(i+1),(0,22.9,-.48),outline,.10,crest_wine)

    # 에드윈 기록탑: 본관에서 자연스럽게 솟는 석재 기단 + 3단 입면 + 아치창 + 코니스 + 뾰족 지붕.
    tower_plum=s.material('ArchivistTowerPlum',(.155,.060,.095))
    tower_stone=s.material('ArchivistTowerStone',(.24,.25,.24))
    s.box('ArchivistTowerPlinth',(-65,24.8,-47),(15.2,2.4,17.2),tower_stone,lean=-.18)
    s.box('ArchivistTowerBase',(-65,31.2,-47),(13.8,10.6,15.4),tower_plum,lean=-.42)
    s.box('ArchivistTowerBelt',(-65.25,36.4,-47),(14.4,.70,16.1),c['stone'],lean=-.20)
    s.box('ArchivistTowerUpper',(-65.5,42.0,-47),(11.7,10.3,12.6),tower_plum,lean=-.26)
    for side in [-1,1]:
        s.box('ArchivistTowerButtress'+str(side),(-58.9,31.5,-47+side*5.6),(1.20,13.0,1.75),tower_stone,lean=-.18)
        s.box('ArchivistTowerButtressFoot'+str(side),(-58.7,25.4,-47+side*5.6),(1.65,1.8,2.3),tower_stone)
    # 창은 빛나는 판 하나가 아니라 깊은 창턱/세로창/뾰족 아치로 구성한다.
    for wi,(y,z0) in enumerate([(29.4,-50.0),(29.4,-44.0),(41.3,-50.0),(41.3,-44.0)]):
        xface=-57.96
        s.box('ArchivistWindowRecess'+str(wi),(xface,y,z0),(.52,4.7,3.7),c['black'])
        s.box('ArchivistWindowGlow'+str(wi),(xface-.08,y,z0),(.10,3.65,2.75),c['amber'])
        for mullion in [-.72,0,.72]:
            s.box('ArchivistWindowMullion'+str(wi)+'_'+str(mullion),(xface-.19,y,z0+mullion),(.16,3.8,.12),c['wood'])
        s.curve_tube('ArchivistWindowArch'+str(wi),[
          (xface-.25,y+1.75,z0-1.38),(xface-.25,y+2.55,z0-.90),
          (xface-.25,y+3.15,z0),(xface-.25,y+2.55,z0+.90),(xface-.25,y+1.75,z0+1.38)
        ],[.12]*5,[.10]*5,c['stone'],sides=16)
        s.box('ArchivistWindowSill'+str(wi),(xface-.28,y-2.35,z0),(.70,.34,3.35),c['stone'])
    s.box('ArchivistTowerCornice',(-65.6,47.35,-47),(12.6,.72,13.6),c['stone'],lean=-.12)
    # 지붕은 단일 원뿔 대신 팔각 드럼 + 갈비뼈 + 첨탑.
    s.lathe('ArchivistTowerRoofDrum',(-65.8,48.6,-47),6.4,5.7,2.1,c['roof'],sides=8)
    s.lathe('ArchivistTowerRoof',(-66.0,54.8,-47),7.2,.35,11.2,c['roof'],sides=8)
    for k in range(8):
        a=math.tau*k/8
        ex=-66.0+math.cos(a)*6.7;ez=-47+math.sin(a)*6.7
        s.curve_tube('ArchivistRoofRib'+str(k),[(ex,49.4,ez),(-66.0,60.0,-47)],[.11,.06],[.09,.05],c['black'],sides=14)
    s.lathe('ArchivistSpire',(-66.0,61.8,-47),.18,.035,3.7,c['brass'],sides=18)
    s.ellipsoid('ArchivistSpireFinial',(-66.0,63.75,-47),(.48,.62,.48),c['brass'])

    # 장의사 관 반입구: 본체에서 돌출된 고딕 적재 베이 + 깊은 아치 포털 + 실제 판넬 쌍문.
    s.box('MortuaryLoadingPlinth',(73.5,.65,-43),(5.0,1.1,15.2),c['stone'])
    for side in [-1,1]:
        zdoor=-43+side*3.0
        s.box('MortuaryPortalJamb'+str(side),(73.05,5.7,-43+side*5.7),(1.65,11.4,1.15),c['stone'])
        s.box('MortuaryLoadingDoor'+str(side),(73.52,5.05,zdoor),(.46,9.9,5.6),c['wood'])
        for py in [2.7,7.0]:
            s.box('MortuaryDoorPanel'+str(side)+str(py),(73.25,py,zdoor),(.16,3.0,4.3),c['plum'])
        s.box('MortuaryDoorBrace'+str(side),(73.14,5.05,zdoor),(.10,.42,4.9),c['brass'])
        s.lathe('MortuaryDoorKnob'+str(side),(72.96,5.0,zdoor-side*1.65),.16,.16,.18,c['brass'],sides=18)
    s.curve_tube('MortuaryPortalArch',[
      (72.95,10.0,-48.6),(72.95,12.0,-47.1),(72.95,13.5,-43),
      (72.95,12.0,-38.9),(72.95,10.0,-37.4)
    ],[.36,.34,.30,.34,.36],[.28,.27,.25,.27,.28],c['stone'],sides=20)
    s.box('MortuaryLoadingCornice',(72.8,14.0,-43),(1.0,.72,14.8),c['stone'])
    # 캐노피는 평판이 아니라 박공지붕 단면.
    canopy=[(-6.2,0,-4.5),(6.2,0,-4.5),(6.2,0,4.5),(-6.2,0,4.5),(0,2.4,-4.5),(0,2.4,4.5)]
    s.node('MortuaryLoadingCanopy',s.mesh('MortuaryLoadingCanopy',canopy,[
      [0,1,4],[3,5,2],[0,4,5,3],[1,2,5,4],[0,3,2,1]
    ],c['roof']),(67.2,11.7,-43))
    for zrail in [-45.0,-41.0]:
        s.curve_tube('CoffinRail'+str(zrail),[(61.5,.20,zrail),(72.3,.20,zrail)],[.11,.11],[.09,.09],c['brass'],sides=18)
    s.box('CoffinTrolleyDeck',(66.5,1.05,-43),(6.2,.34,3.6),c['wood'])
    s.box('CoffinTrolleyLip',(69.55,1.35,-43),(.34,.80,3.75),c['brass'])
    for wx in [64.2,68.8]:
        for wz in [-44.5,-41.5]:
            wheel=s.lathe('CoffinTrolleyWheel'+str(wx)+str(wz),(wx,.67,wz),.54,.54,.18,c['black'],sides=24)
            wheel.rotation_euler.x=math.pi/2

    # 모티머 서비스 구역: 후문을 벽에 파묻힌 작은 서비스 포치로 구성한다.
    s.box('MortimerServicePlinth',(-73.2,.55,-13),(4.0,.9,9.6),c['stone'])
    s.box('MortimerServiceRecess',(-73.65,5.1,-13),(.70,10.2,7.2),c['black'])
    s.box('MortimerServiceDoor',(-73.30,5.0,-13),(.38,9.2,5.3),c['wood'])
    for py in [2.8,6.8]:
        s.box('MortimerServicePanel'+str(py),(-73.07,py,-13),(.10,2.8,4.1),c['teal'])
    s.curve_tube('MortimerServiceArch',[
      (-72.95,9.1,-15.8),(-72.95,10.4,-14.7),(-72.95,11.0,-13),
      (-72.95,10.4,-11.3),(-72.95,9.1,-10.2)
    ],[.24,.22,.20,.22,.24],[.19,.18,.17,.18,.19],c['stone'],sides=18)
    # 박공형 비가림과 작은 벽기둥.
    serviceRoof=[(-4.6,0,-3.7),(4.6,0,-3.7),(4.6,0,3.7),(-4.6,0,3.7),(0,1.8,-3.7),(0,1.8,3.7)]
    s.node('MortimerServiceCanopy',s.mesh('MortimerServiceCanopy',serviceRoof,[
      [0,1,4],[3,5,2],[0,4,5,3],[1,2,5,4],[0,3,2,1]
    ],c['roof']),(-68.7,9.7,-13))
    for zpost in [-16.0,-10.0]:
        s.lathe('MortimerServicePost'+str(zpost),(-69.2,5.0,zpost),.22,.17,8.8,c['stone'],sides=18)
    # 서비스 창/장작걸이/우산걸이.
    s.box('MortimerServiceWindow',(-73.30,5.0,-4.8),(.36,4.4,4.2),c['glass'])
    s.box('MortimerServiceWindowFrame',(-73.08,5.0,-4.8),(.12,4.9,4.8),c['wood'])
    for i in range(10):
        x=-68.9+(i%5)*.82;y=.62+(i//5)*.72
        log=s.lathe('ServiceFirewood'+str(i),(x,y,-8.4),.20,.16,1.30,c['wood'],sides=16)
        log.rotation_euler.x=math.pi/2
    s.box('ServiceWoodRack',(-67.25,1.1,-8.4),(5.1,2.2,2.2),c['black'])
    s.lathe('UmbrellaStand',(-69.2,1.55,-17.0),.62,.50,2.9,c['brass'],sides=24)
    for i in range(4):
        s.curve_tube('ServiceUmbrella'+str(i),[
          (-69.50+i*.20,.72,-17.0),(-69.46+i*.20,2.25,-17.0),(-69.24+i*.20,3.25,-16.95)
        ],[.040,.040,.026],[.035,.035,.022],c['black'],sides=14)

    # 지붕 홈통/배수관은 코니스와 창 사이에 붙어 외벽 높이를 읽게 한다.
    for side in [-1,1]:
        s.curve_tube('FrontGutter'+str(side),[(side*5,24.15,.15),(side*53,24.15,.15)],[.15,.15],[.12,.12],c['black'],sides=18)
        s.curve_tube('RainPipe'+str(side),[
          (side*52.5,23.8,.10),(side*52.5,12.0,.10),(side*52.7,3.0,.35),(side*53.2,.55,1.4)
        ],[.13,.13,.12,.10],[.11,.11,.10,.08],c['black'],sides=16)
        s.curve_tube('WingGutter'+str(side),[
          (side*74.0,23.3,-3),(side*74.0,23.3,-31),(side*74.0,23.3,-61)
        ],[.14,.14,.14],[.11,.11,.11],c['black'],sides=18)
        for index,zpipe in enumerate([-5,-59]):
            s.curve_tube('WingRainPipe'+str(side)+'_'+str(index),[
              (side*74.0,23.1,zpipe),(side*74.1,13.0,zpipe),(side*73.8,3.0,zpipe),(side*73.2,.55,zpipe+1.0)
            ],[.12,.12,.11,.09],[.10,.10,.09,.07],c['black'],sides=16)
        for zchip in [-10,-26,-44,-57]:
            s.box('WingStoneWeathering'+str(side)+str(zchip),(side*74.42,2.2,zchip),(.12,2.8,2.6),c['stone'],lean=-side*.06)

    s.curve_tube('CentralRoofRidge',[(-7,42,-62),(-7,44,-35),(-7,42,-7)],[.17,.20,.17],[.14,.16,.14],c['black'],sides=18)
    for zfinial in [-55,-35,-15]:
        s.lathe('RoofFinial'+str(zfinial),(-7,44.9,zfinial),.22,.035,2.0,c['brass'],sides=18)

    # 큰 계단: 단차는 유지하고 목재 난간/뉴얼/갤러리 앞판을 실제 저택 계단처럼 한 구조로 묶는다.
    stair_rise=.82;stair_tread=1.36
    for i in range(12):
        top_y=stair_rise*(i+1)
        step_z=-40.0-i*stair_tread
        s.box('GrandStair'+str(i),(0,top_y*.5,step_z),(30,top_y,stair_tread+.08),c['wood'])
        s.box('GrandStairRunner'+str(i),(0,top_y+.025,step_z),(9.5,.05,stair_tread*.92),c['red'])
        s.box('GrandStairNosing'+str(i),(0,top_y+.055,step_z+stair_tread*.43),(10.2,.045,.09),c['brass'])
    for side in [-1,1]:
        handrail=[];base_rail=[]
        for i in range(12):
            top_y=stair_rise*(i+1)
            step_z=-40.0-i*stair_tread
            handrail.append((side*13.45,top_y+1.62,step_z))
            base_rail.append((side*13.45,top_y+.26,step_z))
            s.lathe('StairBaluster'+str(side)+'_'+str(i),(side*13.45,top_y+.82,step_z),.10,.065,1.46,c['wood'],sides=16)
            if i in [0,11]:
                s.lathe('GrandStairNewel'+str(side)+'_'+str(i),(side*13.45,top_y+.98,step_z),.28,.18,1.95,c['wood'],sides=22)
                s.lathe('GrandStairNewelCap'+str(side)+'_'+str(i),(side*13.45,top_y+2.02,step_z),.34,.08,.30,c['brass'],sides=22)
        s.curve_tube('GrandStairRail'+str(side),handrail,[.15]*len(handrail),[.12]*len(handrail),c['wood'],sides=20)
        s.curve_tube('GrandStairBaseRail'+str(side),base_rail,[.09]*len(base_rail),[.07]*len(base_rail),c['brass'],sides=16)
        stringer=[(side*14.35,stair_rise*(i+1)-.08,-40.0-i*stair_tread) for i in range(12)]
        s.curve_tube('GrandStairStringer'+str(side),stringer,[.20]*len(stringer),[.10]*len(stringer),c['wood'],sides=18)

    s.box('SecondFloorGallery',(0,10.2,-55),(92,.55,19),c['wood'])
    s.box('SecondFloorGalleryApron',(0,9.72,-45.62),(92,1.02,.48),c['wood'])
    s.box('SecondFloorGalleryBrassLine',(0,10.17,-45.34),(90,.10,.10),c['brass'])
    for side in [-1,1]:
        s.box('BalconyWalk'+str(side),(side*43,10.2,-31),(15,.55,48),c['wood'])
        side_top=[];side_base=[]
        for z in range(-53,-7,3):
            s.lathe('Baluster'+str(side)+str(z),(side*36,11.45,z),.095,.065,2.25,c['wood'],sides=14)
            side_top.append((side*36,12.58,z));side_base.append((side*36,10.62,z))
        s.curve_tube('GallerySideHandrail'+str(side),side_top,[.13]*len(side_top),[.10]*len(side_top),c['wood'],sides=18)
        s.curve_tube('GallerySideBaseRail'+str(side),side_base,[.08]*len(side_base),[.065]*len(side_base),c['brass'],sides=16)
        for z in [-53,-8]:
            s.lathe('GalleryNewel'+str(side)+str(z),(side*36,11.48,z),.25,.16,2.55,c['wood'],sides=20)
            s.lathe('GalleryNewelCap'+str(side)+str(z),(side*36,12.82,z),.30,.07,.28,c['brass'],sides=20)
    back_top=[];back_base=[]
    for x in range(-42,43,4):
        s.lathe('BackBaluster'+str(x),(x,11.45,-46),.095,.065,2.25,c['wood'],sides=14)
        back_top.append((x,12.58,-46));back_base.append((x,10.62,-46))
    s.curve_tube('GalleryRearHandrail',back_top,[.13]*len(back_top),[.10]*len(back_top),c['wood'],sides=18)
    s.curve_tube('GalleryRearBaseRail',back_base,[.08]*len(back_base),[.065]*len(back_base),c['brass'],sides=16)

    # 그랜드홀 천장 코퍼. 계단/샹들리에 축 위는 비워 시야를 막지 않고 주변 천장만 깊이를 준다.
    for row,z0 in enumerate([-55,-47,-39,-31,-23,-15,-7]):
        for col,x0 in enumerate([-45,-30,-15,0,15,30,45]):
            if abs(x0)<10 and z0 in [-31,-23]:continue
            s.box('GrandCeilingCoffer'+str(row)+'_'+str(col),(x0,23.36,z0),(11.6,.22,6.2),c['wood'])
            s.box('GrandCeilingCofferInset'+str(row)+'_'+str(col),(x0,23.20,z0),(10.35,.08,5.0),c['plum'])
            if (row+col)%3==0:
                s.ellipsoid('GrandCeilingBoss'+str(row)+'_'+str(col),(x0,23.05,z0),(1.0,.18,1.0),c['brass'])
    for x0 in [-45,-30,-15,15,30,45]:
        s.box('GrandCeilingCorbel'+str(x0),(x0,21.85,-63.75),(1.2,2.2,.65),c['wood'],lean=(.10 if x0<0 else -.10))

    # 좌우 날개 방: 기록보관실/서재/응접실/의상실/장례용품실/라운지.
    room_specs=[
      (-58,-54,'ArchiveRoom'),(-58,-33,'LibraryRoom'),(-58,-12,'ParlorRoom'),
      (58,-54,'MortuaryRoom'),(58,-33,'WardrobeRoom'),(58,-12,'LoungeRoom')
    ]
    for x,z,name in room_specs:
        # 방 칸막이는 중앙 8stud 통로를 실제로 비운다.
        s.box(name+'DividerLeft',(x-10.5,7,z),(13,14,1),c['plum'])
        s.box(name+'DividerRight',(x+10.5,7,z),(13,14,1),c['plum'])
        s.box(name+'DoorLintel',(x,12,z),(8,4,1),c['plum'])
        for side in [-1,1]:
            s.box(name+'DoorJamb'+str(side),(x+side*4.15,5,z+.08),(.62,10,1.15),c['wood'])
            s.box(name+'Sconce'+str(side),(x+side*8,6,z+.7),(1.3,3,.30),c['brass'])
        s.curve_tube(name+'DoorArch',[
          (x-4.15,9.7,z+.10),(x-2.8,11.1,z+.10),(x,13.25,z+.10),
          (x+2.8,11.1,z+.10),(x+4.15,9.7,z+.10)
        ],[.22,.20,.18,.20,.22],[.18,.17,.15,.17,.18],c['wood'],sides=18)

    # 방마다 천장·벽·가구 언어를 다르게 잡아 좌우 날개가 복제 방처럼 보이지 않게 한다.
    room_accent={
      'ArchiveRoom':s.material('ArchiveRoomWine',(.13,.030,.050)),
      'LibraryRoom':s.material('LibraryRoomGreen',(.035,.090,.065)),
      'ParlorRoom':s.material('ParlorRoomPlum',(.145,.060,.095)),
      'MortuaryRoom':s.material('MortuaryRoomInk',(.040,.045,.055)),
      'WardrobeRoom':s.material('WardrobeRoomWine',(.18,.045,.065)),
      'LoungeRoom':s.material('LoungeRoomTeal',(.045,.105,.095)),
    }
    for x,z,name in room_specs:
        outer=1 if x>0 else -1
        wall_x=x+outer*15.2
        for panel in [-5.5,0,5.5]:
            s.box(name+'WallPanel'+str(panel),(wall_x,5.2,z+panel),(1.0,8.6,4.8),room_accent[name])
            s.box(name+'WallPanelTrim'+str(panel),(wall_x-outer*.58,5.2,z+panel),(.18,9.1,5.2),c['brass'])
        for beam in [-6.3,0,6.3]:
            s.box(name+'CeilingBeam'+str(beam),(x,12.8,z+beam),(31,.42,.52),c['wood'])
        s.lathe(name+'CeilingRose',(x,12.48,z),1.45,.95,.28,c['brass'],sides=24)

        if name=='ArchiveRoom':
            s.prop('furniture','bookcaseClosed',name+'TallArchive',(x+outer*11,.4,z-4.8),8,stretch=(.78,1.12,1))
            s.prop('furniture','desk',name+'Desk',(x+outer*6,.4,z+3.8),3,rot=math.pi/2 if outer<0 else -math.pi/2)
            s.prop('furniture','books',name+'LedgerStack',(x+outer*5.6,3.45,z+3.8),.9,rot=.18)
            for i in range(5):
                s.box(name+'IndexDrawer'+str(i),(x+outer*11.7,2.0+i*.82,z+4.5),(2.8,.62,3.4),c['wood'])
                s.box(name+'IndexLabel'+str(i),(x+outer*10.22,2.0+i*.82,z+4.5),(.08,.24,1.3),c['brass'])
        elif name=='LibraryRoom':
            for dz in [-5.2,4.8]:
                s.prop('furniture','bookcaseClosed',name+'Bookcase'+str(dz),(x+outer*11,.4,z+dz),7.5,stretch=(.75,1.08,1))
            s.prop('furniture','chairCushion',name+'ReadingChair',(x+outer*4.5,.4,z+2.0),4,rot=-outer*math.pi/2,stretch=(1.15,1.1,1.05))
            s.prop('furniture','tableRound',name+'ReadingTable',(x+outer*5.0,.4,z-2.0),2.4)
        elif name=='ParlorRoom':
            s.prop('furniture','loungeSofa',name+'Sofa',(x+outer*9,.4,z),3.4,rot=-outer*math.pi/2,stretch=(1.10,1,1))
            s.prop('furniture','tableRound',name+'TeaTable',(x+outer*4.5,.4,z),2.6)
            for dz in [-4.2,4.2]:
                s.prop('furniture','chairCushion',name+'Chair'+str(dz),(x+outer*5.0,.4,z+dz),3.4,rot=math.pi if dz<0 else 0)
        elif name=='MortuaryRoom':
            s.prop('graveyard','coffin',name+'DisplayCoffin',(x+outer*8.5,.5,z),5.0,rot=0,stretch=(1.0,.85,1))
            for dz in [-5.0,5.0]:
                s.prop('graveyard','urn-round',name+'Urn'+str(dz),(x+outer*11,.4,z+dz),2.6)
            s.prop('graveyard','candle-multiple',name+'Candles',(x+outer*5.0,1.2,z+4.2),1.8)
        elif name=='WardrobeRoom':
            s.prop('furniture','bookcaseClosedDoors',name+'WardrobeA',(x+outer*11,.4,z-4.8),8.5,stretch=(.90,1.05,1))
            s.prop('furniture','bookcaseClosedDoors',name+'WardrobeB',(x+outer*11,.4,z+4.8),8.5,stretch=(.90,1.05,1))
            s.prop('furniture','coatRackStanding',name+'CoatRack',(x+outer*5.0,.4,z),6.5)
            for i in range(5):
                s.lathe(name+'FabricRoll'+str(i),(x+outer*(7.0+i*.55),1.3,z+2.8),.24,.22,2.2,c['red'] if i%2 else c['teal'],sides=18)
        else:
            s.prop('furniture','loungeSofa',name+'Sofa',(x+outer*9,.4,z-1.5),3.5,rot=-outer*math.pi/2,stretch=(1.15,1,1))
            s.prop('furniture','tableRound',name+'Table',(x+outer*4.5,.4,z+1.6),2.7)
            s.prop('furniture','chairCushion',name+'Chair',(x+outer*5.2,.4,z-4.3),3.2,rot=-outer*math.pi/2)

        # 천장등과 벽 장식도 방마다 다른 실루엣을 사용한다.
        if name=='ArchiveRoom':
            s.lathe(name+'PendantStem',(x,11.0,z),.08,.06,2.6,c['black'],sides=16)
            s.ellipsoid(name+'PendantGlass',(x,9.55,z),(1.55,1.95,1.55),c['glass'])
            s.ellipsoid(name+'PendantFlame',(x,9.55,z),(.26,.64,.26),c['amber'])
            for i in range(3):
                s.box(name+'WallLedger'+str(i),(wall_x-outer*.72,7.7-i*1.35,z-4.0+i*4.0),(.18,1.0,3.0),c['wood'])
        elif name=='LibraryRoom':
            s.lathe(name+'ReadingLampStem',(x+outer*4.8,4.2,z-2.0),.07,.055,2.7,c['brass'],sides=16)
            s.loft(name+'ReadingLampShade',(x+outer*4.8,5.85,z-2.0),[
              (-.35,.85,.85),(0,.72,.72),(.45,.30,.30)
            ],s.material('LibraryLampShade',(.11,.18,.10)),sides=24)
            for i in range(4):
                s.box(name+'FramedPage'+str(i),(wall_x-outer*.72,6.4+(i%2)*3.3,z-4.5+(i//2)*9.0),(.16,2.3,3.2),c['wood'])
                s.box(name+'PageInset'+str(i),(wall_x-outer*.84,6.4+(i%2)*3.3,z-4.5+(i//2)*9.0),(.05,1.75,2.55),c['ivory'])
        elif name=='ParlorRoom':
            s.lathe(name+'CeilingDrop',(x,11.2,z),.08,.06,2.0,c['brass'],sides=16)
            for i in range(4):
                a=math.tau*i/4
                px=x+math.cos(a)*1.45;pz=z+math.sin(a)*1.45
                s.curve_tube(name+'LightArm'+str(i),[(x,10.0,z),(px,9.45,pz)],[.08,.06],[.07,.05],c['brass'],sides=16)
                s.ellipsoid(name+'LightFlame'+str(i),(px,9.85,pz),(.20,.52,.20),c['amber'])
            s.ellipsoid(name+'WallCameo',(wall_x-outer*.78,7.1,z),(0.16,4.4,3.8),c['brass'])
            s.ellipsoid(name+'WallCameoInset',(wall_x-outer*.90,7.1,z),(0.05,3.65,3.05),room_accent[name])
        elif name=='MortuaryRoom':
            for i,dz in enumerate([-2.8,2.8]):
                s.curve_tube(name+'LampChain'+str(i),[(x,12.35,z+dz),(x,9.5,z+dz)],[.055,.045],[.045,.035],c['black'],sides=14)
                s.lathe(name+'LampCage'+str(i),(x,8.95,z+dz),.65,.46,1.20,c['brass'],sides=20)
                s.ellipsoid(name+'LampFlame'+str(i),(x,8.95,z+dz),(.18,.48,.18),c['amber'])
            for i in range(4):
                s.box(name+'ToolRack'+str(i),(wall_x-outer*.72,3.6+i*1.55,z+5.0),(0.18,.22,5.2),c['black'])
                s.lathe(name+'ToolHandle'+str(i),(wall_x-outer*.96,3.6+i*1.55,z+4.1-i*.5),.08,.07,1.4,c['wood'],sides=16)
        elif name=='WardrobeRoom':
            s.ellipsoid(name+'VanityFrame',(wall_x-outer*.70,6.7,z),(0.20,7.0,5.4),c['brass'])
            s.ellipsoid(name+'VanityMirror',(wall_x-outer*.84,6.7,z),(0.06,6.15,4.55),c['glass'])
            for i in range(3):
                s.lathe(name+'VanityBottle'+str(i),(x+outer*5.1,3.1,z-1+i*.95),.16,.11,.85,c['glass'],sides=18)
                s.lathe(name+'VanityCap'+str(i),(x+outer*5.1,3.58,z-1+i*.95),.10,.08,.18,c['brass'],sides=16)
        else:
            # 라운지는 오래된 축음기와 낮은 벽 조명으로 가족 생활감을 준다.
            s.lathe(name+'GramophoneBase',(x+outer*5.1,2.0,z+1.5),.90,.82,1.1,c['wood'],sides=24)
            s.curve_tube(name+'GramophoneNeck',[
              (x+outer*5.1,2.6,z+1.5),(x+outer*4.6,3.35,z+1.5),(x+outer*4.2,4.0,z+1.5)
            ],[.12,.10,.09],[.10,.08,.07],c['brass'],sides=18)
            s.loft(name+'GramophoneHorn',(x+outer*3.55,4.15,z+1.5),[
              (-.75,.24,.24),(-.10,.55,.55),(.80,1.15,1.15)
            ],c['brass'],sides=26)
            for dz in [-4.4,4.4]:
                s.ellipsoid(name+'WallLamp'+str(dz),(wall_x-outer*.82,6.5,z+dz),(.18,1.4,1.0),c['glass'])
                s.ellipsoid(name+'WallFlame'+str(dz),(wall_x-outer*.92,6.5,z+dz),(.12,.34,.12),c['amber'])

    # 왼쪽 날개 출정용 실제 벽지도. 서버 승인된 SelectedLobbyMap만 선택 표시를 바꾼다.
    s.box('WallMapFrame',(-74.15,7,-31),(.70,13,27),c['wood'])
    s.box('WallMapPaper',(-73.75,7,-31),(.16,11.4,24.8),s.material('map_parchment',(.47,.40,.28)))
    map_cards=[
      ('SCHOOL',-39,s.material('MapSchoolTint',(.26,.31,.30))),
      ('HOSPITAL',-31,s.material('MapHospitalTint',(.22,.27,.31))),
      ('THEME_PARK',-23,s.material('MapParkTint',(.32,.24,.25))),
    ]
    for map_id,z0,map_mat in map_cards:
        s.box('MapCard_'+map_id,(-73.35,6.5,z0),(.14,4.5,6.1),map_mat)
        s.prism('MapCardLabel_'+map_id,(-73.23,4.75,z0),[
          (-.02,-2.4),(.02,-2.4),(.02,2.4),(-.02,2.4)
        ],.02,c['ivory'])
        s.lathe('MapPin_'+map_id,(-73.08,8.45,z0),.22,.09,.24,c['brass'],sides=20)

    # 기록관의 12개 괴담 전시. 각 괴담마다 단일 고유 실루엣 유물을 하나씩 보존한다.
    # 12칸 유리 진열장. 프레임/선반/유리는 정적 병합 대상이라 런타임 메시 예산을 거의 늘리지 않는다.
    s.box('ArchiveRelicCabinetBack',(-43.75,4.35,-59.55),(10.6,5.9,.35),c['wood'])
    s.box('ArchiveRelicCabinetTop',(-43.75,7.45,-59.18),(11.0,.36,.82),c['brass'])
    s.box('ArchiveRelicCabinetBottom',(-43.75,1.35,-59.18),(11.0,.42,.82),c['brass'])
    for divider in [-48.25,-46.75,-45.25,-43.75,-42.25,-40.75,-39.25]:
        s.box('ArchiveRelicDivider'+str(divider),(divider,4.35,-59.16),(.16,5.7,.62),c['wood'])
    s.box('ArchiveRelicShelf',(-43.75,4.28,-59.15),(10.8,.18,.65),c['wood'])
    s.box('ArchiveRelicGlass',(-43.75,4.35,-58.78),(10.3,5.65,.08),c['glass'])
    relic_slots=[
      ('YUREI','fan',-47.5,3.0),('NOPPERABO','mask',-46.0,3.0),
      ('CHEONNYEO_GWISHIN','hairpin',-44.5,3.0),('KRASUE','orb',-43.0,3.0),
      ('BANSHEE','bell',-41.5,3.0),('JIANGSHI','talisman',-40.0,3.0),
      ('CHUREL','anklet',-47.5,5.55),('WHITE_LADY','veilpin',-46.0,5.55),
      ('DULLAHAN','horseshoe',-44.5,5.55),('LA_LLORONA','locket',-43.0,5.55),
      ('PONTIANAK','flower',-41.5,5.55),('BLACK_SHUCK','collar',-40.0,5.55),
    ]
    relic_mats=[
      s.material('RelicBone',(.48,.47,.42)),s.material('RelicWine',(.19,.035,.05)),
      s.material('RelicBrass',(.34,.25,.14)),s.material('RelicInk',(.035,.045,.055))
    ]
    for idx,(ghost_id,shape,bx,by) in enumerate(relic_slots):
        mat=relic_mats[idx%len(relic_mats)]
        name='GhostRelic_'+ghost_id
        if shape=='fan':
            outline=[(-.58,-.44),(.58,-.44),(.43,.12),(0,.62),(-.43,.12)]
            s.prism(name,(bx,by,-59.05),outline,.12,mat)
        elif shape=='mask':
            s.loft(name,(bx,by,-59.02),[
              (-.58,.42,.18),(0,.50,.22),(.58,.34,.16)
            ],mat,sides=24)
        elif shape=='hairpin':
            s.curve_tube(name,[(bx,by-.62,-59.05),(bx+.12,by,-59.00),(bx-.06,by+.62,-59.05)],
              [.08,.11,.055],[.07,.09,.05],mat,sides=18)
        elif shape=='orb':
            s.ellipsoid(name,(bx,by,-59.0),(1.0,1.0,.64),mat)
        elif shape=='bell':
            s.loft(name,(bx,by,-59.02),[
              (-.58,.18,.16),(-.20,.36,.22),(.18,.46,.28),(.48,.28,.20)
            ],mat,sides=22)
        elif shape=='talisman':
            outline=[(-.28,-.62),(.28,-.62),(.28,.62),(-.28,.62)]
            s.prism(name,(bx,by,-59.02),outline,.08,mat)
        elif shape=='anklet':
            s.lathe(name,(bx,by,-59.02),.42,.42,.16,mat,sides=28)
        elif shape=='veilpin':
            s.curve_tube(name,[(bx-.42,by-.34,-59.03),(bx,by+.44,-59.0),(bx+.42,by-.34,-59.03)],
              [.055,.09,.055],[.045,.075,.045],mat,sides=18)
        elif shape=='horseshoe':
            points=[]
            for a in np.linspace(math.radians(28),math.radians(332),11):
                points.append((bx+math.cos(a)*.42,by+math.sin(a)*.52,-59.02))
            s.curve_tube(name,points,[.07]*len(points),[.06]*len(points),mat,sides=18)
        elif shape=='locket':
            s.ellipsoid(name,(bx,by,-59.01),(.82,1.02,.24),mat)
        elif shape=='flower':
            outline=[]
            for k in range(12):
                a=math.tau*k/12
                r=.50 if k%2==0 else .22
                outline.append((math.cos(a)*r,math.sin(a)*r))
            s.prism(name,(bx,by,-59.02),outline,.10,mat)
        else:
            points=[]
            for a in np.linspace(0,math.tau,13):
                points.append((bx+math.cos(a)*.47,by+math.sin(a)*.31,-59.02))
            s.curve_tube(name,points,[.06]*len(points),[.05]*len(points),mat,sides=18)


    # 희귀 괴담 전용 벽면 유리 케이스. 희귀 판정은 서버가 기존 GhostCatalog.Weight로만 읽고,
    # 여기서는 현재 낮은 등장 가중치 4종의 고유 실루엣만 준비한다. 새 보상/저장값은 만들지 않는다.
    rare_case_specs=[
      ('KRASUE',-58.8,'orb'),('WHITE_LADY',-55.1,'veil'),
      ('PONTIANAK',-51.4,'flower'),('BLACK_SHUCK',-47.7,'collar')
    ]
    rare_case_metal=s.material('RareCaseMetal',(.20,.15,.10))
    rare_case_velvet=s.material('RareCaseVelvet',(.12,.018,.032))
    for ghost_id,z0,shape in rare_case_specs:
        # 케이스 자체는 정적 건축 디테일로 병합하고, 내부 유물만 진행도 제어를 위해 개별 이름을 유지한다.
        s.box('RareCaseBack_'+ghost_id,(-73.7,3.65,z0),(1.05,5.0,3.0),c['wood'])
        s.box('RareCaseVelvet_'+ghost_id,(-73.10,3.65,z0),(.08,4.18,2.22),rare_case_velvet)
        s.box('RareCaseGlass_'+ghost_id,(-73.02,3.65,z0),(.07,4.55,2.55),c['glass'])
        s.box('RareCaseBase_'+ghost_id,(-73.18,1.15,z0),(.62,.38,3.15),rare_case_metal)
        s.box('RareCaseCornice_'+ghost_id,(-73.18,6.05,z0),(.72,.30,3.20),c['brass'])
        s.box('RareCasePlaque_'+ghost_id,(-72.90,1.55,z0),(.12,.56,2.05),c['brass'])
        # 황동 명패의 얕은 음각선. 텍스트는 Roblox SurfaceGui가 실제 괴담 이름을 표시한다.
        for line in [-.34,0,.34]:
            s.box('RareCasePlaqueLine_'+ghost_id+str(line),(-72.82,1.56,z0+line),(.035,.08,.34),c['black'])
        if shape=='orb':
            s.ellipsoid('RareRelic_'+ghost_id+'_Orb',(-72.90,3.55,z0),(1.00,1.00,1.00),relic_mats[1])
            s.curve_tube('RareRelic_'+ghost_id+'_Vein',[
              (-72.82,2.45,z0),(-72.72,3.05,z0+.14),(-72.88,3.45,z0-.08)
            ],[.055,.075,.045],[.045,.060,.035],relic_mats[2],sides=16)
        elif shape=='veil':
            s.curve_tube('RareRelic_'+ghost_id+'_Pin',[
              (-72.90,2.75,z0-.75),(-72.82,3.70,z0),(-72.90,4.55,z0+.75)
            ],[.055,.10,.055],[.045,.075,.045],relic_mats[0],sides=18)
            s.ellipsoid('RareRelic_'+ghost_id+'_Pearl',(-72.82,3.70,z0),(.32,.32,.32),relic_mats[2])
        elif shape=='flower':
            flower=[]
            for k in range(12):
                a=math.tau*k/12;r=.66 if k%2==0 else .30
                flower.append((math.cos(a)*r,math.sin(a)*r))
            petal=s.prism('RareRelic_'+ghost_id+'_Flower',(0,0,0),flower,.12,relic_mats[1])
            petal.location=xyz((-72.90,3.65,z0));petal.rotation_euler.y=math.pi/2
        else:
            ring=[]
            for a in np.linspace(0,math.tau,15):
                ring.append((-72.90,3.65+math.sin(a)*.70,z0+math.cos(a)*.82))
            s.curve_tube('RareRelic_'+ghost_id+'_Collar',ring,[.075]*len(ring),[.060]*len(ring),relic_mats[3],sides=18)
            s.box('RareRelic_'+ghost_id+'_Tag',(-72.78,2.82,z0),(0.18,.66,.52),relic_mats[2])

    # 마당의 맵별 기념 전시. 각 지역에서 괴담을 처음 발견하면 해당 유물이 나타난다.
    # 학교: 오래된 종. 폐병원: 십자가 표식. 폐놀이공원: 찢어진 입장권.
    s.loft('MemoryRelic_SCHOOL',(-30,1.95,35),[
      (-1.15,.55,.48),(-.60,1.10,.68),(.15,1.35,.82),(.85,.78,.58)
    ],s.material('SchoolBellBronze',(.30,.22,.12)),sides=28)
    hospital_cross=[(-.55,-1.5),(.55,-1.5),(.55,-.52),(1.55,-.52),(1.55,.52),(.55,.52),(.55,1.5),(-.55,1.5),(-.55,.52),(-1.55,.52),(-1.55,-.52),(-.55,-.52)]
    s.prism('MemoryRelic_HOSPITAL',(30,2.15,35),hospital_cross,.32,s.material('HospitalCrossPaint',(.30,.055,.065)))
    ticket_outline=[(-2.5,-1.1),(2.15,-1.1),(2.55,-.65),(2.28,-.18),(2.55,.32),(2.22,1.08),(-2.5,1.08),(-2.25,.58),(-2.50,.12),(-2.22,-.42)]
    s.prism('MemoryRelic_THEME_PARK',(45,2.05,54),ticket_outline,.28,s.material('ParkTicketPaint',(.31,.20,.22)))

    # 지역 괴담 100% 완료용 대형 기념 전시. 기존 MemoryRelic과 분리해 '발견'과 '완성'을 공간에서 구분한다.
    s.curve_tube('MapMasterpiece_SCHOOL_BellArch',[
      (-33.0,2.35,35),(-30.0,5.65,35),(-27.0,2.35,35)
    ],[.18,.24,.18],[.15,.20,.15],c['brass'],sides=20)
    s.loft('MapMasterpiece_SCHOOL_Bell',(-30,3.45,35),[
      (-1.25,.62,.52),(-.65,1.22,.76),(.25,1.55,.92),(1.00,.90,.66)
    ],s.material('SchoolMasterBronze',(.39,.27,.12)),sides=30)
    s.prism('MapMasterpiece_HOSPITAL',(30,4.25,35),[
      (-.70,-2.35),(.70,-2.35),(.70,-.72),(2.05,-.72),(2.05,.72),(.70,.72),
      (.70,2.35),(-.70,2.35),(-.70,.72),(-2.05,.72),(-2.05,-.72),(-.70,-.72)
    ],.42,s.material('HospitalMasterEnamel',(.37,.06,.075)))
    park_wheel=[]
    for a in np.linspace(0,math.tau,17):
        park_wheel.append((45+math.cos(a)*2.45,4.15+math.sin(a)*2.45,54))
    s.curve_tube('MapMasterpiece_THEME_PARK_Wheel',park_wheel,[.13]*len(park_wheel),[.11]*len(park_wheel),c['brass'],sides=18)
    for i in range(6):
        a=math.tau*i/6
        s.curve_tube('MapMasterpiece_THEME_PARK_Spoke'+str(i),[
          (45,4.15,54),(45+math.cos(a)*2.25,4.15+math.sin(a)*2.25,54)
        ],[.075,.055],[.065,.045],s.material('ParkMasterIron',(.17,.11,.12)),sides=16)

    # 완료 전에는 빈 건축형 받침대로 보이고, 100%가 되면 위의 대형 유물이 채워진다.
    for map_id,x0,z0 in [('SCHOOL',-30,35),('HOSPITAL',30,35),('THEME_PARK',45,54)]:
        s.lathe('CompletionDaisStone_'+map_id,(x0,.48,z0),3.45,3.15,.72,c['stone'],sides=28)
        s.lathe('CompletionDaisBrass_'+map_id,(x0,.91,z0),3.02,2.92,.16,c['brass'],sides=28)
        for side in [-1,1]:
            s.box('CompletionDaisStep_'+map_id+str(side),(x0+side*2.55,.18,z0+3.0),(2.6,.30,1.55),c['stone'])
        # 정면에 낮은 명패만 두어 정원 동선을 가리지 않는다.
        s.box('CompletionDaisPlaque_'+map_id,(x0,1.16,z0+3.10),(3.8,.68,.18),c['brass'])

    # 2층 완성 세트 갤러리. 객실 자체는 계속 잠겨 있고 벽 사이 전시판만 지역 100%에서 드러난다.
    gallery_specs=[('SCHOOL',-29),('HOSPITAL',0),('THEME_PARK',29)]
    gallery_liner=[s.material('GalleryWine',(.15,.025,.045)),s.material('GalleryTeal',(.035,.11,.095)),s.material('GalleryInk',(.045,.050,.070))]
    for index,(map_id,x0) in enumerate(gallery_specs):
        # 프레임을 벽에서 단계적으로 띄워 2층에서도 평면 카드가 아니라 실제 벽장처럼 읽히게 한다.
        s.box('GalleryFrameBack_'+map_id,(x0,21.2,-63.48),(8.65,4.95,.42),c['wood'])
        s.box('GalleryFrameLiner_'+map_id,(x0,21.2,-63.22),(7.85,4.18,.16),gallery_liner[index])
        s.box('GallerySetFrame_'+map_id,(x0,21.2,-63.02),(7.45,3.78,.24),c['brass'])
        s.box('GallerySetGlass_'+map_id,(x0,21.2,-62.84),(6.90,3.24,.07),c['glass'])
        s.box('GalleryFrameCornice_'+map_id,(x0,23.48,-63.10),(8.75,.42,.58),c['brass'])
        s.box('GalleryFrameBase_'+map_id,(x0,18.92,-63.10),(8.55,.38,.58),c['brass'])
        if map_id=='SCHOOL':
            s.loft('GallerySet_'+map_id,(x0,21.15,-62.68),[
              (-.75,.42,.16),(-.35,.82,.22),(.18,.96,.25),(.65,.50,.18)
            ],c['brass'],sides=24)
        elif map_id=='HOSPITAL':
            s.prism('GallerySet_'+map_id,(x0,21.15,-62.68),[
              (-.28,-1.15),(.28,-1.15),(.28,-.34),(1.0,-.34),(1.0,.34),(.28,.34),
              (.28,1.15),(-.28,1.15),(-.28,.34),(-1.0,.34),(-1.0,-.34),(-.28,-.34)
            ],.10,c['brass'])
        else:
            points=[]
            for a in np.linspace(0,math.tau,13):
                points.append((x0+math.cos(a)*1.05,21.15+math.sin(a)*1.05,-62.68))
            s.curve_tube('GallerySet_'+map_id,points,[.06]*len(points),[.05]*len(points),c['brass'],sides=16)

    # 2층 객실은 잠긴 상태를 유지한다.
    # 2층 잠긴 객실문.
    for i,x in enumerate([-36,-22,-8,8,22,36]):
        s.box('LockedGuestDoor'+str(i),(x,15,-63.9),(5.2,8.5,.34),c['wood'])
        s.lathe('LockedGuestKnob'+str(i),(x+1.7,14.7,-63.55),.13,.13,.18,c['brass'],sides=18)
        s.lathe('GuestDoorSeal'+str(i),(x,15.4,-63.50),.42,.42,.10,s.material('WaxSealMat',(.28,.025,.045)),sides=28)
        s.box('GuestDoorNumber'+str(i),(x,18.1,-63.50),(1.5,.72,.08),c['brass'])

    # 정원 중앙 진입로와 분수/부서진 동상.
    for i,z in enumerate(range(8,71,5)):
        s.box('PathStone'+str(i),(math.sin(i*.9)*.35,.18,z),(12.5,.26,4.2),c['stone'],rot=math.sin(i*.7)*.035)
    s.lathe('FountainBasin',(0,.55,39),7.4,7.0,1.1,c['stone'],sides=48)
    s.lathe('FountainPool',(0,1.15,39),5.8,5.8,.18,c['glass'],sides=48)
    s.lathe('FountainStem',(0,3.2,39),.85,.62,4.7,c['stone'],sides=32)
    s.ellipsoid('BrokenStatueTorso',(0,5.7,39),(2.8,4.2,1.7),c['stone'])
    statue=s.ellipsoid('BrokenStatueHead',(.45,8.0,39.1),(1.4,1.6,1.3),c['stone']);statue.rotation_euler.z=.19

    # 가스등/벤치/폐마차/생울타리/외곽 산책로.
    for i,(x,z) in enumerate([(-13,54),(13,54),(-20,28),(20,28),(-29,9),(29,9),(-57,34),(57,34)]):
        s.lathe('GasLampPole'+str(i),(x,3.5,z),.16,.14,7,c['black'],sides=18)
        s.ellipsoid('GasLampGlass'+str(i),(x,7.4,z),(1.0,1.5,1.0),c['glass'])
        s.ellipsoid('GasLampFlame'+str(i),(x,7.4,z),(.25,.60,.25),c['amber'])
    for i,(x,z,rot) in enumerate([(-31,35,0),(31,35,0),(-57,10,math.pi/2),(57,10,math.pi/2)]):
        s.box('GardenBenchSeat'+str(i),(x,1.6,z),(6,.35,1.5),c['wood'],rot=rot)
        s.box('GardenBenchBack'+str(i),(x,3.0,z-.55),(6,3.0,.30),c['wood'],rot=rot)
    s.box('CarriageBody',(46,2.6,47),(8,3.8,4.6),c['wood'],rot=.12)
    for i,(dx,dz) in enumerate([(-3,-2),(-3,2),(3,-2),(3,2)]):
        wheel=s.lathe('CarriageWheel'+str(i),(46+dx,1.5,47+dz),1.6,1.6,.22,c['black'],sides=32);wheel.rotation_euler.x=math.pi/2
    s.box('CarriageShaft',(37,1.7,48),(11,.35,.35),c['wood'],rot=.12)
    for side in [-1,1]:
        for j,z in enumerate(range(8,67,9)):
            s.box('Hedge'+str(side)+str(j),(side*35,1.3,z),(18,2.6,2.2),s.material('DeadHedge',(.09,.14,.09)))
            s.box('SidePath'+str(side)+str(j),(side*56,.08,z),(11,.12,7),c['stone'])
    # 수집 정원: 기존 맵 기념 유물을 건축형 전시대에 올린다.
    for name,x,z in [('SCHOOL',-30,35),('HOSPITAL',30,35),('THEME_PARK',45,54)]:
        s.box('CollectionPlinth_'+name,(x,.62,z),(7.4,1.15,5.4),c['stone'])
        s.box('CollectionPlaque_'+name,(x,1.38,z+2.73),(4.8,.95,.18),c['brass'])
        for side in [-1,1]:
            s.lathe('CollectionPost_'+name+str(side),(x+side*3.3,2.0,z-2.1),.12,.10,3.0,c['black'],sides=16)
    # 현관↔정원 전시의 중심축은 비워두고 가장자리 표식만 추가한다.
    for i,(x,z) in enumerate([(-8.8,17),(8.8,17),(-9.5,48),(9.5,48),(-10.0,63),(10.0,63)]):
        s.lathe('ApproachWaystone'+str(i),(x,1.0,z),.55,.42,1.8,c['stone'],sides=20)
        s.lathe('ApproachWaystoneCap'+str(i),(x,2.05,z),.72,.50,.32,c['brass'],sides=20)
    s.curve_tube('CollectionGardenRailLeft',[(-35,2.5,31),(-35,2.5,40)],[.10,.10],[.08,.08],c['black'],sides=16)
    s.curve_tube('CollectionGardenRailRight',[(35,2.5,31),(35,2.5,40)],[.10,.10],[.08,.08],c['black'],sides=16)
    # 수집 전시 주변은 낮은 난간·마른 식재·관람 벤치로 작은 정원방처럼 묶는다.
    garden_shrub=s.material('CollectionShrub',(.070,.105,.060))
    for group,(cx,cz) in enumerate([(-30,35),(30,35),(45,54)]):
        for i,a in enumerate([-.9,-.3,.35,.95]):
            x=cx+math.cos(a*2.4)*5.0;z=cz+math.sin(a*2.4)*4.2
            s.curve_tube('CollectionShrubStem'+str(group)+'_'+str(i),[
              (x,.25,z),(x+.18,1.2,z-.10),(x-.12,2.2,z+.16)
            ],[.10,.07,.025],[.08,.055,.020],garden_shrub,sides=14)
            for side in [-1,1]:
                s.curve_tube('CollectionShrubTwig'+str(group)+'_'+str(i)+str(side),[
                  (x,1.1,z),(x+side*.70,1.65,z+side*.35)
                ],[.035,.014],[.028,.010],garden_shrub,sides=12)
        # 전시 정면은 비우고 양옆만 낮은 황동 난간.
        for side in [-1,1]:
            rx=cx+side*5.6
            s.curve_tube('CollectionSideRail'+str(group)+str(side),[
              (rx,1.5,cz-3.2),(rx,1.5,cz+2.7)
            ],[.075,.075],[.060,.060],c['brass'],sides=14)
            for dz in [-2.5,0,2.2]:
                s.lathe('CollectionRailPost'+str(group)+str(side)+str(dz),(rx,.85,cz+dz),.07,.055,1.7,c['black'],sides=14)
        bench_z=cz-6.2
        s.box('CollectionViewingBenchSeat'+str(group),(cx,1.25,bench_z),(5.6,.30,1.35),c['wood'])
        s.box('CollectionViewingBenchBack'+str(group),(cx,2.45,bench_z-.50),(5.6,2.2,.25),c['wood'],lean=.14)

    # 폐쇄된 지하 납골당: 정원 지형에 파묻힌 석재 전면 + 버트레스 + 깊은 철문 + 배수로.
    crypt_stone=s.material('CryptStone',(.205,.215,.205))
    # 계단은 아래로 내려갈수록 벽 사이에 깊이 묻힌다.
    for i in range(6):
        y=.18+i*.18;z=63.6+i*.78
        s.box('CryptStep'+str(i),(-57,y,z),(9.6,.32,1.62),crypt_stone)
    for side in [-1,1]:
        s.box('CryptRetainingWall'+str(side),(-57+side*5.2,2.05,66.0),(1.15,4.1,8.5),crypt_stone,lean=side*.10)
        s.box('CryptButtress'+str(side),(-57+side*6.2,3.2,69.0),(1.8,6.4,2.3),crypt_stone,lean=side*.16)
        s.box('CryptButtressCap'+str(side),(-57+side*6.2,6.3,69.0),(2.2,.55,2.7),c['stone'])
    s.box('CryptFacade',(-57,4.4,69.1),(13.1,8.8,2.0),crypt_stone)
    s.box('CryptDoorRecess',(-57,3.55,67.95),(8.0,7.1,.70),c['black'])
    # 문틀은 속 빈 뾰족 아치.
    s.curve_tube('CryptArch',[
      (-61.0,4.9,67.45),(-59.7,6.8,67.45),(-57,8.3,67.45),
      (-54.3,6.8,67.45),(-53.0,4.9,67.45)
    ],[.34,.31,.27,.31,.34],[.28,.26,.23,.26,.28],crypt_stone,sides=20)
    for side in [-1,1]:
        s.box('CryptDoorJamb'+str(side),(-57+side*4.05,3.45,67.45),(.80,6.9,.85),crypt_stone)
    # 철문은 바/가로띠/중앙 잠금판으로 깊이를 만든다.
    for i,xbar in enumerate([-2.8,-1.85,-.92,0,.92,1.85,2.8]):
        s.lathe('CryptGateBar'+str(i),(-57+xbar,3.55,67.55),.075,.065,6.5,c['brass'],sides=14)
    for ybar in [1.25,3.55,5.75]:
        s.box('CryptGateBand'+str(ybar),(-57,ybar,67.53),(6.9,.18,.22),c['brass'])
    s.box('CryptGateLock',(-57,3.45,67.32),(1.45,1.25,.30),c['brass'])
    s.lathe('CryptGateRing',(-57,3.45,67.10),.50,.50,.11,c['black'],sides=28)
    # 상부 삼각 페디먼트와 작은 가족 봉인.
    ped=[(-6.4,0,0),(6.4,0,0),(0,4.2,0)]
    s.node('CryptPediment',s.mesh('CryptPediment',ped,[[0,1,2]],crypt_stone),(-57,8.65,68.10))
    s.ellipsoid('CryptSeal',(-57,9.35,67.80),(1.3,1.3,.30),c['brass'])
    # 빗물이 계단으로 흐르는 홈.
    for side in [-1,1]:
        s.curve_tube('CryptDrain'+str(side),[
          (-57+side*4.3,.22,63.2),(-57+side*4.45,.22,66.0),(-57+side*4.7,.25,69.0)
        ],[.10,.10,.08],[.07,.07,.06],c['black'],sides=14)

    # 후면 폐쇄 온실: 벽돌 기단 + 다중 베이 철제 프레임 + 아치형 유리 지붕 + 깨진 일부 패널.
    gx,gz=57,69
    greenhouse_metal=s.material('GreenhouseMetal',(.12,.10,.085))
    greenhouse_brick=s.material('GreenhouseBrick',(.23,.16,.13))
    s.box('GreenhouseFoundation',(gx,.35,gz),(25.5,.70,17.5),c['stone'])
    s.box('GreenhouseBrickPlinth',(gx,1.15,gz),(24.2,1.5,16.2),greenhouse_brick)
    # 5개의 구조 베이.
    bay_x=[gx-11,gx-5.5,gx,gx+5.5,gx+11]
    for bi,x in enumerate(bay_x):
        s.box('GreenhousePost'+str(bi),(x,5.55,gz),(.34,8.8,.34),greenhouse_metal)
        s.curve_tube('GreenhouseRoofRib'+str(bi),[
          (x,9.85,gz-7.45),(x,11.55,gz-5.0),(x,12.85,gz-2.6),
          (x,13.35,gz),(x,12.85,gz+2.6),(x,11.55,gz+5.0),(x,9.85,gz+7.45)
        ],[.14,.13,.12,.11,.12,.13,.14],[.11,.10,.095,.09,.095,.10,.11],greenhouse_metal,sides=16)
    # 길이 방향 벽체 가로 프레임.
    for y in [3.0,6.0,9.0]:
        for side in [-1,1]:
            s.box('GreenhouseSideRail'+str(side)+str(y),(gx+side*11,y,gz),(.20,.20,14.6),greenhouse_metal)
    # 전후면 박공지붕 프레임.
    for zi,zpanel in enumerate([gz-7.45,gz+7.45]):
        s.box('GreenhouseEndBeam'+str(zi),(gx,9.7,zpanel),(22.2,.32,.24),greenhouse_metal)
        for x in [gx-11,gx-5.5,gx,gx+5.5,gx+11]:
            s.box('GreenhouseEndMullion'+str(zi)+str(x),(x,5.2,zpanel),(.24,8.7,.18),greenhouse_metal)
        s.curve_tube('GreenhouseEndArch'+str(zi),[
          (gx-11,9.7,zpanel),(gx-7,11.7,zpanel),(gx,13.35,zpanel),
          (gx+7,11.7,zpanel),(gx+11,9.7,zpanel)
        ],[.16,.14,.12,.14,.16],[.12,.11,.10,.11,.12],greenhouse_metal,sides=16)
    # 유리는 베이 단위로 쪼개서 구조가 읽히고 일부 패널은 실제로 비워둔다.
    for side in [-1,1]:
        xwall=gx+side*10.82
        for panel,z0 in enumerate([63.4,66.9,70.4,73.9]):
            if (side<0 and panel==1) or (side>0 and panel==3):continue
            s.box('GreenhouseSideGlass'+str(side)+'_'+str(panel),(xwall,5.15,z0),(.08,7.4,3.15),c['glass'])
    # 깨진 판은 삼각 유리 조각만 남겨 폐쇄된 오래된 온실 느낌을 만든다.
    broken=[(-1.45,-3.4),(1.45,-3.4),(1.45,.35),(.45,1.75),(-.55,.70),(-1.45,1.20)]
    s.prism('GreenhouseBrokenGlassA',(gx-10.72,5.15,66.9),broken,.045,c['glass'])
    broken2=[(-1.35,-3.5),(1.35,-3.5),(1.35,.90),(.30,.25),(-.80,1.40),(-1.35,.55)]
    s.prism('GreenhouseBrokenGlassB',(gx+10.72,5.15,73.9),broken2,.045,c['glass'])
    # 중앙 쌍문은 잠겨 있으며 상부 환기창과 능선 장식이 있다.
    for side in [-1,1]:
        s.box('GreenhouseDoor'+str(side),(gx+side*2.0,4.6,gz-7.58),(3.75,7.2,.26),greenhouse_metal)
        s.box('GreenhouseDoorGlass'+str(side),(gx+side*2.0,5.0,gz-7.42),(2.9,5.8,.08),c['glass'])
    s.box('GreenhouseDoorTransom',(gx,9.0,gz-7.48),(8.4,1.6,.18),c['glass'])
    s.curve_tube('GreenhouseRidge',[(gx-11,13.35,gz),(gx,13.35,gz),(gx+11,13.35,gz)],[.12,.12,.12],[.10,.10,.10],greenhouse_metal,sides=16)
    for i,x in enumerate([gx-7.5,gx,gx+7.5]):
        s.lathe('GreenhouseRoofFinial'+str(i),(x,13.85,gz),.12,.035,1.0,c['brass'],sides=16)
    # 내부 벤치/죽은 식물은 외부 유리를 통해 실루엣만 읽히게 한다.
    for x in [gx-8,gx-2.7,gx+2.7,gx+8]:
        s.box('GreenhouseBench'+str(x),(x,1.55,gz),(3.5,1.15,10.4),c['wood'])
    dead_plant_mat=s.material('DeadPlant',(.08,.11,.07))
    for i,(x,z) in enumerate([(51,66),(55,72),(60,65),(64,72)]):
        s.curve_tube('DeadGreenhousePlant'+str(i),[
          (x,.9,z),(x+.35,2.2,z-.2),(x-.10,3.3,z+.25),(x+.25,4.0,z-.10)
        ],[.14,.10,.055,.025],[.12,.09,.05,.022],dead_plant_mat,sides=14)
        for side in [-1,1]:
            s.curve_tube('DeadGreenhouseTwig'+str(i)+str(side),[
              (x,2.55,z),(x+side*.65,3.05,z+side*.25)
            ],[.045,.018],[.040,.015],dead_plant_mat,sides=12)

    # 마른 나무: 박스 기둥 대신 굽은 연속 곡면 줄기/가지.
    for t,(x,z,h) in enumerate([(-65,49,15),(65,52,17),(-61,19,14),(62,16,16),(-44,66,13),(39,75,15)]):
        lean=(-1 if t%2 else 1)
        trunk=[
          (x,.25,z),
          (x+lean*.45,h*.30,z+.15),
          (x+lean*.85,h*.58,z-.20),
          (x+lean*1.15,h*.82,z+.10),
        ]
        s.curve_tube('DeadTreeTrunk'+str(t),trunk,[.70,.62,.48,.28],[.66,.58,.44,.26],c['wood'],sides=22)
        branch_specs=[
          (.42, 1, .34,.22),(.50,-1,.40,-.28),(.59,1,.48,.30),
          (.66,-1,.42,.25),(.73,1,.36,-.24),(.79,-1,.30,.22)
        ]
        for i,(heightFrac,side,reach,zoff) in enumerate(branch_specs):
            base=(x+lean*(.25+heightFrac*.95),h*heightFrac,z)
            mid=(base[0]+side*h*reach*.32,base[1]+h*.10,base[2]+zoff*h*.18)
            tip=(base[0]+side*h*reach*.58,base[1]+h*.17,base[2]+zoff*h*.30)
            s.curve_tube('DeadTreeBranch'+str(t)+'_'+str(i),[base,mid,tip],
              [.22,.15,.055],[.20,.14,.050],c['wood'],sides=18)
    for i,(x,z) in enumerate([(-69,33),(-63,28),(-59,39),(69,29),(63,35),(58,40),(-47,58),(39,58)]):
        s.box('Gravestone'+str(i),(x,1.7,z),(2.3,3.4,.65),c['stone'],lean=(-.16+i*.04))
        s.box('GraveBase'+str(i),(x,.35,z),(3.3,.55,1.7),c['stone'])
    # 주택 노후화 디테일: 벽면 석재 코너와 일부 깨진 유리/빗물 얼룩.
    for side in [-1,1]:
        for y in range(2,23,4):
            s.box('FacadeQuoin'+str(side)+str(y),(side*52.7,y,-2.15),(1.6,2.8,1.0),c['stone'],lean=side*.08)
    for x in [-45,-31,31,45]:
        s.box('WindowSill'+str(x),(x,3.25,-.10),(6.2,.45,1.0),c['stone'])
        s.box('RainStain'+str(x),(x,1.8,-.18),(3.1,2.7,.05),s.material('RainStainMat',(.10,.09,.09)))
    # 전면 석재 기단의 줄눈/돌출 캡. 얕은 부재만 추가해 실루엣보다 재질 읽기를 강화한다.
    for course,y0 in enumerate([.75,1.55,2.35]):
        for x0 in range(-48,49,8):
            offset=4 if course%2 else 0
            xx=x0+offset
            if abs(xx)<11:continue
            s.box('FacadeStoneCourse'+str(course)+'_'+str(xx),(xx,y0,-1.82),(7.4,.62,.38),c['stone'],lean=.04*((course+x0)%3-1))
    s.box('FacadeStoneCap',(-31,3.02,-1.64),(42,.34,.72),c['stone'])
    s.box('FacadeStoneCapR',(31,3.02,-1.64),(42,.34,.72),c['stone'])

    # 외관 비대칭 노후화: 일부 측면 창은 임시 판자로 막히고, 석재 균열/덩굴은 좌우가 다르게 흐른다.
    board_mat=s.material('WeatheredBoard',(.085,.042,.025))
    for i,(x,y,z0,lean) in enumerate([
      (-74.35,7.2,-18,-.12),(-74.35,17.0,-48,.08),(74.35,7.0,-54,.11)
    ]):
        for plank in range(3):
            p=s.box('BoardedWingWindow'+str(i)+'_'+str(plank),(x,y-2.0+plank*2.0,z0),(.14,.48,5.8),board_mat,rot=(lean if x<0 else -lean))
            p.rotation_euler.x=(plank-1)*.045
        s.box('BoardBrace'+str(i),(x-(-.10 if x<0 else .10),y,z0),(.18,5.8,.42),c['black'],rot=.18 if i%2==0 else -.16)
    for i,(x,y,z0,dx,dz) in enumerate([
      (-74.46,5.0,-7,-.04,4.0),(-74.46,14.5,-37,.03,-4.8),(74.46,9.0,-24,-.03,5.5)
    ]):
        s.curve_tube('FacadeCrack'+str(i),[
          (x,y-2.4,z0),(x+dx,y-1.0,z0+dz*.25),(x-dx*.6,y+.6,z0+dz*.62),(x+dx*.4,y+2.2,z0+dz)
        ],[.045,.038,.030,.018],[.020,.018,.014,.010],c['black'],sides=14)
    vine_mat=s.material('DeadVine',(.055,.075,.045))
    for i,(x,z0,side) in enumerate([(-74.55,-31,-1),(74.55,-11,1)]):
        points=[(x,.7,z0),(x,5.0,z0+side*1.2),(x,10.0,z0-side*.6),(x,16.0,z0+side*2.1),(x,21.0,z0+side*.5)]
        s.curve_tube('FacadeVine'+str(i),points,[.10,.085,.065,.045,.025],[.08,.07,.055,.038,.020],vine_mat,sides=16)
        for j in [1,2,3]:
            p=points[j]
            s.curve_tube('FacadeVineTwig'+str(i)+'_'+str(j),[
              p,(x, p[1]+1.2, p[2]+side*(1.3+j*.35))
            ],[.035,.014],[.028,.010],vine_mat,sides=14)

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
    # 현관 포치: 계단-기단-4기둥-난간-박공지붕 순서로 건축적으로 읽히게 한다.
    for step in range(5):
        width=22-step*1.4
        s.box('PorchStep'+str(step),(0,.16+step*.28,8.8-step*.95),(width,.30,2.0),c['stone'])
    s.box('PorchPlinth',(0,.72,4.9),(20.5,1.0,9.8),c['stone'])
    for side in [-1,1]:
        for depth,zp in enumerate([3.2,8.2]):
            x=side*(7.6 if depth==0 else 8.6)
            s.lathe('PorchColumn'+str(side)+'_'+str(depth),(x,6.7,zp),.62,.48,11.4,c['stone'],sides=28)
            s.lathe('PorchBase'+str(side)+'_'+str(depth),(x,1.05,zp),.86,.72,.72,c['stone'],sides=28)
            s.lathe('PorchCapital'+str(side)+'_'+str(depth),(x,12.5,zp),.98,.78,.72,c['brass'],sides=28)
    for side in [-1,1]:
        s.curve_tube('PorchRail'+str(side),[
          (side*9.0,3.0,3.2),(side*9.0,3.0,8.0)
        ],[.12,.12],[.10,.10],c['brass'],sides=16)
        for zbal in [4.0,5.3,6.6,7.9]:
            s.lathe('PorchBaluster'+str(side)+str(zbal),(side*9.0,2.15,zbal),.08,.06,1.7,c['brass'],sides=14)
    porchRoof=[(-10.5,0,-5.2),(10.5,0,-5.2),(10.5,0,5.2),(-10.5,0,5.2),(0,3.4,-5.2),(0,3.4,5.2)]
    s.node('PorchCanopy',s.mesh('PorchCanopy',porchRoof,[
      [0,1,4],[3,5,2],[0,4,5,3],[1,2,5,4],[0,3,2,1]
    ],c['roof']),(0,13.0,5.4))
    s.curve_tube('PorchGableTrim',[
      (-10.0,13.05,.2),(0,16.2,.2),(10.0,13.05,.2)
    ],[.18,.14,.18],[.14,.11,.14],c['brass'],sides=18)
    # 포치 천장 패널과 코벨. 현관 위가 얇은 지붕판처럼 보이지 않게 목공 깊이를 추가한다.
    for px in [-6,-2,2,6]:
        s.box('PorchCeilingPanel'+str(px),(px,12.68,5.4),(3.2,.16,8.4),c['wood'])
        s.box('PorchCeilingInset'+str(px),(px,12.55,5.4),(2.55,.06,7.5),c['plum'])
    for side in [-1,1]:
        for zp in [2.4,8.4]:
            s.curve_tube('PorchCorbel'+str(side)+str(zp),[
              (side*7.9,12.3,zp),(side*8.5,11.45,zp),(side*9.15,10.95,zp)
            ],[.22,.18,.10],[.16,.13,.08],c['wood'],sides=16)
    for side in [-1,1]:
        s.lathe('PorchLanternPost'+str(side),(side*5.6,4.5,9.8),.12,.09,5.6,c['black'],sides=16)
        s.ellipsoid('PorchLanternGlass'+str(side),(side*5.6,7.75,9.8),(.78,1.15,.78),c['glass'])
        s.ellipsoid('PorchLanternFlame'+str(side),(side*5.6,7.75,9.8),(.16,.42,.16),c['amber'])
    for i in range(18):
        x=(-1 if i%2 else 1)*(9+(i*7)%21);z=(i*11)%40
        s.box('LeafCard'+str(i),(x,.24,z),(.5,.015,.9),c['wood'],rot=i*.71)
    for side in [-1,1]:
        s.box('InteriorDado'+str(side),(side*53.1,3,-33),(.3,5,58),c['wood'])
        for z in [-10,-21,-32,-43,-54]:s.box('WallPanel'+str(side)+str(z),(side*52.8,3,z),(.35,4,8.2),c['teal'])
    s.box('BackDado',(0,3,-64.1),(106,5,.6),c['wood'])
    # 집안의 시간도 살짝 고장났다. 시계추·시곗바늘은 클라이언트가 느리게 움직인다.
    s.box('ClockCase',(-9,5,-61.8),(3.2,9.2,1.8),c['wood'])
    s.ellipsoid('ClockFace',(-9,8.6,-60.82),(2.5,2.5,.12),c['ivory'])
    s.box('ClockMinute',(-9,9.05,-60.70),(.12,.95,.08),c['black'])
    s.box('ClockHour',(-8.64,8.6,-60.65),(.78,.15,.08),c['black'])
    s.lathe('ClockPendulumRod',(-9,4.8,-60.65),.055,.055,3.8,c['brass'])
    s.ellipsoid('ClockPendulum',(-9,3,-60.60),(1.1,1.1,.14),c['brass'])
    for i in range(18):s.box('FloorPlank'+str(i),(-51+i*6,.365,-31),(.055,.02,64),c['black'])
    for i,(x,z) in enumerate([(-22,15),(24,19),(-22,-10),(22,-9)]):s.prop('graveyard','lightpost-single','LampPost'+str(i),(x,0,z),9)
    for i,(x,z) in enumerate([(-21,29),(22,32)]):s.prop('graveyard','bench-damaged','Bench'+str(i),(x,0,z),3,math.pi)
    for i,(x,z) in enumerate([(-30,7),(29,10),(-33,-35),(30,-37)]):s.prop('graveyard','urn-round','Urn'+str(i),(x,.4,z),3)
    for i,(x,z) in enumerate([(-27,22),(28,25),(-29,1),(30,0)]):s.prop('graveyard','rocks','GardenRock'+str(i),(x,0,z),2)
    for i in range(6):
        s.prop('graveyard','candle-multiple','Candle'+str(i),((-1 if i%2 else 1)*23,1.4,-9-(i//2)*12),2.4)
    for i,x in enumerate([-40,-27,27,40]):s.prop('furniture','bookcaseClosed','Bookcase'+str(i),(x,.4,-59.5),8,stretch=(.85,1.18,1),tilt=(-1 if i%2 else 1)*.035)
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
    s.lathe('ChandelierStem',(0,19.5,-24),.11,.11,6,c['black'],sides=20)
    s.lathe('ChandelierRingOuter',(0,16.7,-24),3.6,3.6,.28,c['brass'],sides=32)
    s.lathe('ChandelierRingInner',(0,16.9,-24),2.25,2.25,.18,c['brass'],sides=28)
    for i in range(8):
        a=i*math.pi/4
        x=math.cos(a)*3.15;z=-24+math.sin(a)*3.15
        midx=math.cos(a)*2.55;midz=-24+math.sin(a)*2.55
        s.curve_tube('ChandelierArm'+str(i),[(0,16.85,-24),(midx,16.25,midz),(x,17.0,z)],
          [.10,.085,.075],[.10,.085,.075],c['brass'],sides=18)
        s.lathe('ChandelierCup'+str(i),(x,17.05,z),.28,.18,.26,c['brass'],sides=20)
        s.lathe('ChandelierCandle'+str(i),(x,17.65,z),.12,.10,1.05,c['ivory'],sides=18)
        s.loft('ChandelierFlame'+str(i),(x,18.38,z),[
          (-.20,.07,.06),(0,.10,.075),(.22,.025,.020)
        ],c['amber'],sides=16)
        dropx=math.cos(a)*2.9;dropz=-24+math.sin(a)*2.9
        s.ellipsoid('ChandelierDrop'+str(i),(dropx,15.95,dropz),(.18,.52,.14),c['glass'])
    # Portraits and stage reward relics; the owner-specific module controls their visibility.
    for i in range(12):
        x=([-40,-26,-12,12,26,40])[i%6];z=-63.7;y=9 if i<6 else 16
        s.box('PortraitFrame'+str(i+1),(x,y,z),(6.0,6.6,.5),c['brass'])
        s.box('PortraitCanvas'+str(i+1),(x,y,z+.3),(5.2,5.8,.1),c['black'])
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
    # 가족 초상화: Blender 내장 numpy만 사용한다. 외부 Pillow 의존성 없이 내장 텍스처를 만든다.
    def paint_rect(img,x0,y0,x1,y1,color):
        x0=max(0,int(x0));y0=max(0,int(y0));x1=min(img.shape[1],int(x1));y1=min(img.shape[0],int(y1))
        if x1>x0 and y1>y0:img[y0:y1,x0:x1,:3]=np.array(color,dtype=np.float32)/255
    def paint_ellipse(img,cx,cy,rx,ry,color):
        yy,xx=np.ogrid[:img.shape[0],:img.shape[1]]
        mask=((xx-cx)/max(rx,1))**2+((yy-cy)/max(ry,1))**2<=1
        img[mask,:3]=np.array(color,dtype=np.float32)/255
    def paint_line(img,x0,y0,x1,y1,width,color):
        steps=max(abs(int(x1-x0)),abs(int(y1-y0)),1)
        for t in np.linspace(0,1,steps+1):
            x=x0+(x1-x0)*t;y=y0+(y1-y0)*t
            paint_ellipse(img,x,y,width,width,color)

    for i in range(12):
        x=([-40,-26,-12,12,26,40])[i%6];y=9 if i<6 else 16
        pixels=np.ones((320,256,4),dtype=np.float32)
        pixels[:,:,:3]=np.array((23,29,32),dtype=np.float32)/255
        coat=[(41,54,54),(67,34,47),(31,50,69),(74,60,41)][i%4]
        skin=[(171,166,143),(147,165,154),(168,147,142),(126,148,145)][i%4]
        # 낡은 타원 캔버스, 상체, 얼굴, 목.
        paint_ellipse(pixels,128,164,103,148,(43,48,46))
        paint_rect(pixels,55,236,202,310,coat)
        paint_ellipse(pixels,128,154,43+(i%3)*5,76,skin)
        paint_rect(pixels,113,211,143,242,skin)
        # 역할별 머리 실루엣을 서로 다르게 한다.
        if i%4==0:
            paint_ellipse(pixels,128,97,48,38,(17,24,25))
            for dx in [-32,-18,0,18,32]:paint_line(pixels,128+dx*.45,72,128+dx,112,4,(17,24,25))
        elif i%4==1:
            paint_ellipse(pixels,128,91,58,34,(16,25,30))
            paint_rect(pixels,72,91,88,240,(16,25,30));paint_rect(pixels,168,91,185,246,(16,25,30))
        elif i%4==2:
            paint_ellipse(pixels,128,101,55,31,(72,70,62))
            paint_line(pixels,88,92,72,61,6,(103,104,88));paint_line(pixels,168,92,187,62,6,(103,104,88))
        else:
            paint_rect(pixels,90,58,170,100,(25,30,32));paint_ellipse(pixels,130,102,61,14,(17,23,25))
            paint_rect(pixels,91,86,171,94,(109,67,53))
        # 눈/홍채/코/입. 작은 화면에서도 가족별 표정이 읽히게 대비를 남긴다.
        for ex in [108,148]:
            paint_ellipse(pixels,ex,143,13,8,(216,202,167))
            paint_ellipse(pixels,ex,144,4,6,(35,25,26))
        paint_line(pixels,128,148,120,178,2,(75,81,70))
        paint_line(pixels,120,178,132,181,2,(75,81,70))
        paint_line(pixels,111,200,146,200,3,(94,39,42))
        paint_line(pixels,35,286,220,286,2,(126,106,66))
        for k in range(10):paint_line(pixels,84+k*9,297,88+k*9,297,1,(177,154,105))
        image=bpy.data.images.new('FamilyPortrait'+str(i+1),width=256,height=320)
        image.pixels.foreach_set(pixels[::-1].ravel());image.pack()
        mat=bpy.data.materials.new('FamilyPortraitPaint'+str(i+1));mat.use_nodes=True
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.91
        mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        data=s.mesh('FamilyPortrait'+str(i+1),[(-2.2,-2.5,0),(2.2,-2.5,0),(2.2,2.5,0),(-2.2,2.5,0)],[(0,1,2,3)],mat)
        for uv,value in zip(data.uv_layers.active.data,[(0,0),(1,0),(1,1),(0,1)]):uv.uv=value
        s.node('FamilyPortrait'+str(i+1),data,(x,y,-63.26))

    # 초상화 벽의 가로 몰딩은 가족 기록이 한 벽면 체계로 읽히게 하되 문/통로를 막지 않는다.
    for y in [5.45,12.55,19.55]:
        s.box('PortraitGalleryRail'+str(y),(0,y,-63.36),(102,.28,.22),c['brass'])
    for x in [-47,-33,-19,-5,5,19,33,47]:
        s.box('PortraitGalleryStud'+str(x),(x,12.5,-63.42),(.18,14.0,.20),c['wood'])

    # 저택 배경도 내부 GLB를 재구성한다. 문·기둥·담장 원형의 출처는 기존 CC0 manifest다.
    for side in [-1,1]:
        s.prop('graveyard','column-large','EntryCarvedColumn'+str(side),(side*8,.35,-2),14,stretch=(.85,1,.85))
        s.prop('graveyard','crypt-large-roof','ManorPediment'+str(side),(side*20,21,-4),5.8,stretch=(1.8,1,.6))
        for z in [8,23,38]:
            s.prop('graveyard','stone-wall','GardenWall'+str(side)+str(z),(side*39,0,z),2.2,math.pi/2,stretch=(1.5,1,1))
        s.prop('graveyard','crypt-door','AncestorsDoor'+str(side),(side*36,.4,-63),9,stretch=(1.05,1,.5))
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
    for x in [-7.2,7.2]:s.box('FireplacePillar'+str(x),(x,4,-61.7),(1.9,8,3.2),c['stone'])
    s.box('FireplaceMantel',(0,8.1,-61.7),(17,1.1,3.8),c['stone'])
    s.box('FireplaceBlack',(0,3.8,-63.45),(12.5,6.5,.1),c['black'])
    for i in range(5):
        s.lathe('FireplaceLog'+str(i),(-3+i*1.5,.9,-61.4),.36,.36,1.4,c['wood'])
        s.ellipsoid('HearthFlame'+str(i),(-3+i*1.5,1.8+(i%2)*.6,-61.2),(.75,2.2+(i%2)*1.1,.55),c['amber'])
    s.ellipsoid('FamilyMirrorFrame',(0,15,-63.2),(13,11.5,.55),c['brass'])
    s.ellipsoid('FamilyMirror',(0,15,-62.83),(11.6,10.1,.15),c['glass'])
    # 세계 괴담 12종 완성 기념물. 별도 보상이나 저장키 없이 GhostCompleted=12만 시각화한다.
    s.loft('MasterCollectionRelic',(0,9.25,-61.15),[
      (-.62,1.05,.42),(-.20,1.28,.52),(.28,1.36,.58),(.72,1.02,.44)
    ],s.material('MasterRelicLeather',(.055,.025,.032)),sides=30)
    s.curve_tube('MasterCollectionRelicCrest',[
      (-.82,9.42,-60.82),(0,10.12,-60.74),(.82,9.42,-60.82)
    ],[.10,.14,.10],[.08,.11,.08],c['brass'],sides=20)
    # 전체 완성 전까지는 가장 진척된 괴담 하나를 벽난로 대표 슬롯에 올린다.
    s.box('FireplaceFeatureFrame',(0,10.55,-61.05),(5.6,3.0,.34),c['wood'])
    s.box('FireplaceFeatureGlass',(0,10.55,-60.83),(5.0,2.45,.08),c['glass'])
    # 벽난로-대표 슬롯-가족 거울이 한 축으로 읽히는 중앙 장식. 통로와 충돌하지 않는 벽면 깊이만 사용한다.
    s.box('FireplaceFeaturePediment',(0,12.38,-61.04),(6.6,.46,.44),c['brass'])
    s.curve_tube('FireplaceFeatureCrown',[
      (-3.0,12.45,-60.82),(-1.7,13.15,-60.80),(0,13.55,-60.78),
      (1.7,13.15,-60.80),(3.0,12.45,-60.82)
    ],[.11,.10,.09,.10,.11],[.08,.075,.07,.075,.08],c['brass'],sides=16)
    for side in [-1,1]:
        s.box('FireplaceFeatureBracket'+str(side),(side*2.55,9.15,-61.03),(.42,1.55,.42),c['wood'],lean=-side*.08)
    feature_outline=[(-1.15,-.82),(1.15,-.82),(1.35,-.25),(.92,.68),(0,1.02),(-.92,.68),(-1.35,-.25)]
    for idx,(ghost_id,shape,bx,by) in enumerate(relic_slots):
        medallion=s.prism('FireplaceFeature_'+ghost_id,(0,10.48,-60.66),feature_outline,.09,relic_mats[idx%len(relic_mats)])
        medallion.rotation_euler.z=(idx%3-1)*.045
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
    # NPC 주변 생활 흔적. 상호작용이나 보상 없이 역할만 공간에서 더 읽히게 한다.
    s.box('ServiceConsoleMortimer',(8.7,2.0,-12.2),(5.6,3.6,1.7),c['wood'])
    s.lathe('ServiceBellMortimer',(7.8,4.05,-11.7),.32,.22,.34,c['brass'],sides=20)
    for i in range(3):
        s.box('ServiceFoldedLinen'+str(i),(9.3,3.95+i*.18,-11.7),(1.9,.14,1.2),c['ivory'])
    s.box('RecordIndexCabinet',(-26.4,2.7,-30.0),(5.3,5.0,2.0),c['wood'])
    for row in range(4):
        for col in [-1,0,1]:
            s.box('RecordIndexDrawer'+str(row)+str(col),(-26.0+col*1.25,1.4+row*.90,-28.92),(1.05,.65,.12),c['wood'])
            s.box('RecordIndexTag'+str(row)+str(col),(-26.0+col*1.25,1.4+row*.90,-28.82),(.40,.18,.05),c['brass'])
    s.box('MortuaryMeasureRack',(25.6,3.2,-22.8),(5.0,5.8,1.1),c['wood'])
    for i in range(5):
        s.lathe('MortuaryClothRoll'+str(i),(24.0+i*.75,1.75,-22.05),.28,.25,2.7,c['red'] if i%2 else c['black'],sides=18)
        s.curve_tube('MortuaryTape'+str(i),[
          (24.0+i*.75,3.0,-21.95),(24.1+i*.75,3.9,-21.90),(23.9+i*.75,4.6,-21.95)
        ],[.035,.030,.022],[.028,.024,.018],c['ivory'],sides=14)
    # 작은 역할 소품으로 가까이에서만 보이는 생활 디테일을 추가한다.
    for i in range(3):
        s.lathe('ServiceKeyRing'+str(i),(10.8+i*.35,3.3,-11.55),.20,.20,.045,c['brass'],sides=20)
    s.lathe('RecordInkPot',(-23.8,3.65,-26.0),.30,.22,.52,c['black'],sides=20)
    s.curve_tube('RecordQuill',[
      (-23.8,3.9,-26.0),(-23.5,4.7,-25.9),(-23.0,5.45,-25.8)
    ],[.035,.025,.010],[.028,.020,.008],c['ivory'],sides=14)
    s.curve_tube('MortuaryScissors',[
      (23.6,3.85,-24.8),(24.1,4.15,-24.8),(24.6,3.85,-24.8)
    ],[.05,.08,.05],[.04,.06,.04],c['brass'],sides=16)
    s.lathe('MortuaryScissorLoopA',(23.45,3.75,-24.8),.22,.22,.045,c['brass'],sides=20)
    s.lathe('MortuaryScissorLoopB',(24.75,3.75,-24.8),.22,.22,.045,c['brass'],sides=20)
    # 샹들리에 천장 접속부/사슬/크리스털 드롭. 기존 곡선 팔과 촛불은 중복 생성하지 않는다.
    s.lathe('ChandelierCeilingRose',(0,22.55,-24),2.15,1.55,.44,c['wood'],sides=32)
    s.lathe('ChandelierCanopy',(0,22.08,-24),.82,.48,.72,c['brass'],sides=28)
    for link in range(5):
        y=21.45-link*.72
        points=[]
        for j in range(13):
            angle=j*math.pi/6
            if link%2==0:points.append((math.cos(angle)*.23,y+math.sin(angle)*.38,-24))
            else:points.append((0,y+math.sin(angle)*.38,-24+math.cos(angle)*.23))
        s.curve_tube('ChandelierChainLink'+str(link),points,[.040]*len(points),[.032]*len(points),c['black'],sides=12)
    s.lathe('ChandelierHub',(0,16.55,-24),.62,.38,.95,c['brass'],sides=28)
    for i in range(8):
        angle=i*math.pi/4;r=2.75
        px=math.cos(angle)*r;pz=-24+math.sin(angle)*r
        s.loft('ChandelierPearDrop'+str(i),(px,15.55,pz),[
          (-.34,.06,.05),(-.18,.42,.16),(0,.58,.23),(.24,.22,.12),(.38,.04,.03)
        ],c['glass'],sides=14)

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
    (OUT/'build-evidence.json').write_text(json.dumps({'generator':'Blender '+bpy.app.version_string+' / build.py','normalization':{'up':'Y','forward':'+Z','origin':'GROUND_CENTER','units':'STUD','textures':'EMBEDDED','interactionPrefixesPreserved':True},'reusedOriginals':['Kenney CC0 furniture','Kenney CC0 graveyard architecture'],'actualRobloxPlayTest':False,'originalHotelAssetsUsed':False,'style':'괴물 가족의 고딕 대저택 로비 리빌드','layers':['foreground','walkable_3d','portrait_relief','midground','background'],'modifiedCC0Props':['bookcaseClosed','chairCushion','coffin','character-ghost','tableRound'],'npcGeometry':'DIRECT_PROCEDURAL_ROLE_SPECIFIC_CONTINUOUS_SURFACE_V4','bounds':{'width':hi.x-lo.x,'height':hi.z-lo.z,'depth':hi.y-lo.y},'models':results},ensure_ascii=False,indent=2)+'\n')
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
    sc=bpy.context.scene
    fast_review=str(os.environ.get('GITHUB_REF','')).startswith('refs/heads/chatgpt/')
    def select_review_engine(scene,fast):
        if not fast:
            scene.render.engine='CYCLES'
            return 'CYCLES'
        # Blender 4.x/5.x에서 Eevee 식별자가 달라진다. 설치된 엔진을 직접 선택한다.
        for engine in ('BLENDER_EEVEE_NEXT','BLENDER_EEVEE','BLENDER_WORKBENCH'):
            try:
                scene.render.engine=engine
                return engine
            except (TypeError,ValueError):
                continue
        scene.render.engine='CYCLES'
        return 'CYCLES'
    review_engine=select_review_engine(sc,fast_review)
    if review_engine=='CYCLES':
        sc.cycles.samples=16;sc.cycles.use_denoising=True
    else:
        sc.render.image_settings.file_format='PNG'
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
        bpy.context.scene.camera=cam;cam_data.lens=64
        sc=bpy.context.scene
        npc_review_engine=select_review_engine(sc,fast_review)
        if npc_review_engine=='CYCLES':
            sc.cycles.samples=20;sc.cycles.use_denoising=True
        else:
            sc.render.image_settings.file_format='PNG'
        sc.render.resolution_x=720;sc.render.resolution_y=900;sc.render.resolution_percentage=100
        sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast';sc.view_settings.exposure=.7
        files=[]
        head_target={'butler':9.25,'undertaker':8.15,'archivist':7.55}[kind]
        for view,pos,target in [
            ('front',(0,head_target,7.4),(0,head_target,0)),
            ('three-quarter',(4.8,head_target-.10,6.4),(0,head_target-.08,0)),
            ('full-body',(0,5.8,18.5),(0,5.1,0)),
        ]:
            cam.location=xyz(pos);cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler()
            name=kind+'-'+view+'.png';sc.render.filepath=str(review/name);bpy.ops.render.render(write_still=True);files.append(name)
        npc_reviews[kind]=files
    (review/'evidence.json').write_text(json.dumps({
      'renderer':'Blender '+bpy.app.version_string+' '+(npc_review_engine if fast_review else 'CYCLES'),
      'input':'generated/manor-lobby.glb',
      'sha256':hashlib.sha256((OUT/'manor-lobby.glb').read_bytes()).hexdigest(),
      'method':'Import exported manor and each exported NPC GLB into empty scenes, then render',
      'npcReviewFiles':npc_reviews,
      'npcRoleSpecificGeometry':True,
      'sharedBrideHeadUsedForNPCs':False,
      'actualRobloxPlayTest':False
    },indent=2)+'\n')

if __name__=='__main__':build()
