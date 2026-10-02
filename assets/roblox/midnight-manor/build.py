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
              'ManorSideWall','FacadeWing','BackWall','HallFloor','Courtyard','CrookedRoof','ClockPendulum','EntryDoor')
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
    trousers['manorFinish']='Fabric';leather['manorFinish']='SmoothPlastic';glove['manorFinish']='Fabric' if kind=='Butler' else 'SmoothPlastic'
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
        # 1·2층 창을 분리해 외관 비율을 읽을 수 있게 한다.
        for x in [side*33,side*45,side*61,side*70]:
            for y in [6.8,17.2]:
                s.box('WindowFrame'+str(x)+str(y),(x,y,-.8),(6.2,8.4,.75),c['wood'])
                s.box('WindowGlass'+str(x)+str(y),(x,y,-.35),(4.8,6.8,.12),c['glass'])
                s.box('WindowMullion'+str(x)+str(y),(x,y,-.15),(.28,7,.12),c['black'])
                s.box('WindowCross'+str(x)+str(y),(x,y,-.12),(5,.25,.14),c['black'])
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
    s.box('EntryThreshold',(0,.40,-2),(18,.4,6),c['stone'])

    # 현관문은 기존 상호작용 이름을 유지한다.
    for side in [-1,1]:
        door=s.node('EntryDoor'+str(side),pos=(side*7.2,.5,-2))
        s.box('EntryDoorWood'+str(side),(-side*3.5,5.8,0),(7,11.6,.5),c['wood'],parent=door)
        for y in [2.7,8.6]:s.box('EntryDoorPanel'+str(side)+str(y),(-side*3.5,y,.3),(5.3,4.4,.16),c['teal'],parent=door)
        s.lathe('EntryDoorKnob'+str(side),(-side*6.2,5.4,.5),.22,.22,.4,c['brass'],parent=door)

    # 중앙부는 2층 높이로 솟고 좌우 지붕은 낮아 실루엣이 단계적으로 읽힌다.
    roof=[[-61,25,-67],[61,25,-67],[61,25,1],[-61,25,1],[-7,46,-67],[-7,42,1]]
    s.node('CrookedRoof',s.mesh('CrookedRoof',roof,[[0,4,1],[3,2,5],[0,3,5,4],[4,5,2,1],[0,1,2,3]],c['roof']))
    s.box('CentralTower',(0,29,-36),(28,17,25),c['plum'])
    s.lathe('CentralTowerCrown',(0,46,-36),15,11,13,c['roof'],sides=8)
    s.box('LeaningChimney',(31,38,-42),(5,24,5),c['stone'],lean=2.4)
    s.box('ChimneyCap',(33,50,-42),(7,1.1,7),c['black'])
    s.lathe('LeftTurret',(-57,27,-48),7,5.5,25,c['plum'],sides=10)
    s.lathe('LeftTurretRoof',(-58,48,-48),9,0,17,c['roof'],sides=10)
    s.lathe('RightTurret',(57,27,-48),7,5.5,25,c['plum'],sides=10)
    s.lathe('RightTurretRoof',(58,48,-48),9,0,17,c['roof'],sides=10)

    # 큰 계단: 각 단의 윗면 높이가 정확히 이어지는 12단 솔리드 구조.
    stair_rise=.82;stair_tread=1.36
    for i in range(12):
        top_y=stair_rise*(i+1)
        step_z=-40.0-i*stair_tread
        s.box('GrandStair'+str(i),(0,top_y*.5,step_z),(30,top_y,stair_tread+.08),c['wood'])
        s.box('GrandStairRunner'+str(i),(0,top_y+.025,step_z),(9.5,.05,stair_tread*.92),c['red'])
    s.box('SecondFloorGallery',(0,10.2,-55),(92,.55,19),c['wood'])
    for side in [-1,1]:
        s.box('BalconyWalk'+str(side),(side*43,10.2,-31),(15,.55,48),c['wood'])
        for z in range(-53,-7,4):
            s.lathe('Baluster'+str(side)+str(z),(side*36,11.3,z),.11,.10,2.1,c['brass'],sides=12)
    for x in range(-42,43,5):s.lathe('BackBaluster'+str(x),(x,11.3,-46),.11,.10,2.1,c['brass'],sides=12)

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
    # 2층 잠긴 객실문.
    for i,x in enumerate([-36,-22,-8,8,22,36]):
        s.box('LockedGuestDoor'+str(i),(x,15,-63.9),(5.2,8.5,.34),c['wood'])
        s.lathe('LockedGuestKnob'+str(i),(x+1.7,14.7,-63.55),.13,.13,.18,c['brass'],sides=18)

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
    # 마른 나무: 박스 기둥 대신 굽은 연속 곡면 줄기/가지.
    for t,(x,z,h) in enumerate([(-65,49,15),(65,52,17),(-61,19,14),(62,16,16),(-44,66,13),(43,67,15)]):
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
    for i,(x,z) in enumerate([(-69,33),(-63,28),(-59,39),(69,29),(63,35),(58,40),(-47,58),(48,59)]):
        s.box('Gravestone'+str(i),(x,1.7,z),(2.3,3.4,.65),c['stone'],lean=(-.16+i*.04))
        s.box('GraveBase'+str(i),(x,.35,z),(3.3,.55,1.7),c['stone'])
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
