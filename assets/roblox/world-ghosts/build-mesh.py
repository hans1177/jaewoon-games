# build-mesh.py — original rigged mesh artwork for the existing world-ghosts pack.
# Run with Blender 4.5's Python (bpy). No downloaded models or generated concept images.
import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

# Configuration / source identity
ROOT = Path(__file__).resolve().parent
TAU = math.tau
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--output', type=Path, default=ROOT / 'native' / 'mesh')
PARSER.add_argument('--render', type=Path)
PARSER.add_argument('--frames', type=int, default=0)
PARSER.add_argument('--fbx', action='store_true', help='Also export FBX for a download bundle; GLB is the tracked mesh asset.')
ARGS = PARSER.parse_args()
ARGS.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
PARTS = []
BONES = {}

# Materials / painted surfaces
def material(name, color, roughness=.55, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    return mat

SKIN = material('Porcelain_skin', (.62, .68, .65), .46)
SKIN.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value = .055
SHADOW = material('Plum_eye_shadow', (.105, .033, .046), .63)
SOCKET = material('Orbital_shadow', (.25, .22, .245), .7)
HAIR = material('Ink_blue_hair', (.012, .018, .028), .28)
HAIRLINE = material('Hair_sheen', (.029, .043, .058), .36)
IVORY = material('Aged_ivory_silk', (.63, .60, .48), .66)
RED = material('Cinnabar_silk', (.30, .012, .024), .42)
GOLD = material('Antique_brass', (.49, .28, .085), .29, .68)
JADE = material('Jade_beads', (.025, .22, .16), .26)
WHITE = material('Warm_sclera', (.71, .69, .57), .24)
IRIS = material('Crimson_iris', (.43, .027, .016), .26)
BLACK = material('Pupil_and_lashes', (.002, .004, .007), .29)
LIP = material('Wine_lips', (.26, .015, .034), .35)
NAIL = material('Obsidian_nails', (.027, .025, .04), .32)

# Small woven texture, packed and exported with the actual mesh.
from PIL import Image, ImageDraw
img = Image.new('RGB', (512, 512), (221, 211, 183))
draw = ImageDraw.Draw(img)
for y in range(512):
    for x in range(512):
        weave = ((x % 4 == 0) - (y % 4 == 0)) * 3
        grain = ((x * 73 + y * 43) % 7) - 3
        img.putpixel((x, y), (221 + weave + grain, 211 + weave + grain, 183 + weave + grain))
for x in range(-32, 544, 64):
    for y in range(-32, 544, 80):
        offset = 32 if (y // 80) % 2 else 0
        for radius in [11, 17]:
            draw.arc((x+offset-radius,y-radius,x+offset+radius,y+radius), 10, 325, fill=(192, 178, 145), width=1)
texture_path = ARGS.output / 'silk.png'
img.save(texture_path)
tex = bpy.data.images.load(str(texture_path))
tex.pack()
node = IVORY.node_tree.nodes.new('ShaderNodeTexImage')
node.image = tex
IVORY.node_tree.links.new(node.outputs['Color'], IVORY.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

# Mesh construction / skin weights. These produce triangle surfaces, not Roblox Parts.
def mesh(name, vertices, faces, mat, bone='Spine', uv=None, weights=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    SCENE.collection.objects.link(obj)
    for p in data.polygons:
        p.use_smooth = True
    if uv:
        layer = data.uv_layers.new(name='UVMap')
        for loop in data.loops:
            layer.data[loop.index].uv = uv[loop.vertex_index]
    if weights:
        for index, values in enumerate(weights):
            for group, weight in values.items():
                vg = obj.vertex_groups.get(group) or obj.vertex_groups.new(name=group)
                if weight > 0:
                    vg.add([index], weight, 'REPLACE')
    else:
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(vertices))), 1, 'REPLACE')
    PARTS.append(obj)
    return obj

def ellipsoid(name, center, scale, mat, bone='Head', segments=24, rings=14):
    vertices, faces, uv = [], [], []
    # Avoid coincident pole rings and zero-area triangles.
    vertices.append((center[0], center[1], center[2] + scale[2])); uv.append((.5, 1))
    for j in range(1, rings):
        phi = math.pi*j/rings
        for i in range(segments):
            a = TAU*i/segments
            vertices.append((center[0]+scale[0]*math.sin(phi)*math.cos(a), center[1]+scale[1]*math.sin(phi)*math.sin(a), center[2]+scale[2]*math.cos(phi)))
            uv.append((i/segments, 1-j/rings))
    south = len(vertices)
    vertices.append((center[0], center[1], center[2]-scale[2])); uv.append((.5, 0))
    for i in range(segments):
        n = (i+1)%segments
        faces.append((0, 1+i, 1+n))
        for j in range(rings-2):
            a=1+j*segments+i; b=1+j*segments+n
            faces.append((a, a+segments, b+segments, b))
        faces.append((south, 1+(rings-2)*segments+n, 1+(rings-2)*segments+i))
    return mesh(name, vertices, faces, mat, bone, uv)

def curve_points(points, steps=24):
    # Catmull-Rom interpolation, with duplicated end controls.
    controls = [Vector(points[0])] + [Vector(p) for p in points] + [Vector(points[-1])]
    out=[]
    for k in range(steps+1):
        u=k/steps*(len(points)-1); i=min(int(u),len(points)-2); t=u-i
        a,b,c,d=controls[i:i+4]
        out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return out

def tube(name, points, radii, mat, bone='Head', sides=8, steps=20, flatten=1, chain=None):
    path=curve_points(points,steps)
    verts=[];faces=[];uv=[];weights=[]
    for i,p in enumerate(path):
        t=i/steps; ri=t*(len(radii)-1); j=min(int(ri),len(radii)-2)
        r=max(.002, radii[j]*(1-(ri-j))+radii[j+1]*(ri-j))
        tangent=(path[min(i+1,steps)]-path[max(i-1,0)]).normalized()
        normal=tangent.cross(Vector((0,1,0)))
        if normal.length<.01:normal=tangent.cross(Vector((1,0,0)))
        normal.normalize(); binormal=tangent.cross(normal).normalized()
        for k in range(sides):
            a=TAU*k/sides
            verts.append(tuple(p+r*(math.cos(a)*normal+math.sin(a)*flatten*binormal)))
            uv.append((k/sides,t))
            if chain:
                f=t*(len(chain)-1); ix=min(int(f),len(chain)-2); amount=f-ix
                weights.append({chain[ix]:1} if chain[ix]==chain[ix+1] else {chain[ix]:1-amount, chain[ix+1]:amount})
    for i in range(steps):
        for k in range(sides):
            n=(k+1)%sides; a=i*sides+k; b=i*sides+n
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple(steps*sides+k for k in range(sides)))
    return mesh(name,verts,faces,mat,bone,uv,weights if chain else None)

def loft(name, rows, mat, bone, segments=48, folds=0, weight_fn=None):
    # z, x radius, y radius, center-y. Cloth uses a continuous folded surface.
    verts=[];faces=[];uv=[];weights=[]
    for j,(z,rx,ry,cy) in enumerate(rows):
        for i in range(segments):
            a=TAU*i/segments
            fold=1+folds*(.67*math.sin(a*12+.17*j)+.33*math.sin(a*23-.1*j))
            v=(rx*math.cos(a)*fold, cy+ry*math.sin(a)*fold,z)
            verts.append(v);uv.append((i/segments,j/(len(rows)-1)))
            if weight_fn:weights.append(weight_fn(v,j/(len(rows)-1)))
    for j in range(len(rows)-1):
        for i in range(segments):
            a=j*segments+i; b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(rows)-1)*segments+i for i in range(segments)))
    return mesh(name,verts,faces,mat,bone,uv,weights if weight_fn else None)

def ribbon(name, points, widths, mat, bone, chain=None):
    path=curve_points(points,24);verts=[];uv=[];weights=[];faces=[]
    for i,p in enumerate(path):
        t=i/24; f=t*(len(widths)-1); k=min(int(f),len(widths)-2);w=widths[k]*(1-f+k)+widths[k+1]*(f-k)
        for side in [-1,1]:
            verts.append(tuple(p+Vector((side*w/2, -.009*side,0))));uv.append(((side+1)/2,t))
            if chain:
                f=t*(len(chain)-1);k=min(int(f),len(chain)-2);u=f-k
                weights.append({chain[k]:1-u,chain[k+1]:u})
        if i:faces.append((i*2-2,i*2-1,i*2+1,i*2))
    obj=mesh(name,verts,faces,mat,bone,uv,weights if chain else None)
    mod=obj.modifiers.new('Cloth_thickness','SOLIDIFY');mod.thickness=.008
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def bone(name, point, parent=None):
    BONES[name]=(point,parent)

# Skeleton / body proportions
bone('Root',(0,0,0))
bone('Hips',(0,0,1.68),'Root')
bone('Spine',(0,0,2.08),'Hips')
bone('Chest',(0,0,2.5),'Spine')
bone('Neck',(0,0,2.79),'Chest')
bone('Head',(0,0,3.10),'Neck')
for side,s in [('L',-1),('R',1)]:
    bone('UpperArm'+side,(s*.39,0,2.57),'Chest')
    bone('Forearm'+side,(s*.57,-.05,2.12),'UpperArm'+side)
    bone('Hand'+side,(s*.62,-.13,1.78),'Forearm'+side)
    bone('Thigh'+side,(s*.17,0,1.71),'Hips')
    bone('Shin'+side,(s*.18,0,.95),'Thigh'+side)
    bone('Foot'+side,(s*.18,-.035,.25),'Shin'+side)
    bone('Eye'+side,(s*.173,-.31,3.22),'Head')
    bone('Lid'+side,(s*.173,-.277,3.23),'Head')
bone('Jaw',(0,-.16,2.94),'Head')
for i in range(8):
    a=TAU*i/8
    bone('Hem'+str(i),(math.cos(a)*.42,math.sin(a)*.29,.99),'Hips')
for i in range(12):
    a=math.pi*.05+i/11*math.pi*.9
    for j in range(3):
        bone(f'Hair{i}_{j}',(math.cos(a)*.4,math.sin(a)*.22,3.43-j*.64),'Head' if j==0 else f'Hair{i}_{j-1}')
for i in range(3):bone('Tie'+str(i),(.12,-.25,2.42-i*.35),'Chest' if i==0 else 'Tie'+str(i-1))

# Body / sculpted head
loft('Body',[(1.55,.24,.17,0),(1.85,.24,.18,0),(2.05,.26,.19,0),(2.3,.32,.2,0),(2.53,.4,.19,0),(2.64,.27,.14,0)],SKIN,'Spine',32)
tube('Neck',[(0,0,2.57),(0,0,2.72),(0,.015,2.99)],[.15,.125,.13],SKIN,'Neck',16,12)
loft('Porcelain_face',[(2.79,.04,.07,-.025),(2.82,.15,.17,-.01),(2.9,.24,.225,0),(3.01,.31,.26,0),(3.12,.355,.275,.018),(3.26,.365,.29,.03),(3.40,.34,.27,.045),(3.53,.27,.22,.04),(3.60,.12,.12,.035),(3.63,.015,.018,.03)],SKIN,'Head',48)
for side,s in [('L',-1),('R',1)]:
    ellipsoid('Ear'+side,(s*.355,.015,3.15),(.075,.055,.14),SKIN)
    ellipsoid('Ear_inner'+side,(s*.395,-.01,3.15),(.023,.047,.08),SHADOW,segments=12,rings=8)
    ellipsoid('Socket'+side,(s*.173,-.26,3.24),(.142,.035,.094),SOCKET,segments=24,rings=12)
    ellipsoid('Eye_white'+side,(s*.173,-.307,3.23),(.127,.067,.078),WHITE,'Eye'+side)
    ellipsoid('Iris'+side,(s*.173,-.368,3.23),(.051,.017,.06),IRIS,'Eye'+side,24,12)
    ellipsoid('Iris_inner'+side,(s*.173,-.382,3.23),(.033,.008,.039),GOLD,'Eye'+side,16,8)
    ellipsoid('Pupil'+side,(s*.173,-.39,3.23),(.022,.006,.034),BLACK,'Eye'+side,16,8)
    ellipsoid('Eye_glint'+side,(s*.173-.014,-.396,3.248),(.009,.003,.011),WHITE,'Eye'+side,8,6)
    upper=[(s*.05,-.328,3.23),(s*.11,-.37,3.286),(s*.21,-.375,3.304),(s*.31,-.306,3.267)]
    tube('Upper_eyelid'+side,upper,[.012,.024,.024,.009],SKIN,'Lid'+side,8,16)
    tube('Lash'+side,[(p[0],p[1]-.013,p[2]-.012) for p in upper],[.006,.012,.015,.005],BLACK,'Lid'+side,6,16)
    tube('Lower_eyelid'+side,[(s*.05,-.327,3.218),(s*.15,-.36,3.163),(s*.25,-.344,3.183),(s*.31,-.305,3.258)],[.01,.014,.011,.006],SKIN,'Head',8,16)
    tube('Brow'+side,[(s*.062,-.28,3.36),(s*.16,-.294,3.39),(s*.26,-.26,3.395),(s*.31,-.233,3.372)],[.007,.021,.018,.002],HAIR,'Head',8,14,flatten=.35)
    # Aged mascara trails are independent curved surface details.
    tube('Tear_trace'+side,[(s*.217,-.282,3.14),(s*.232,-.256,3.04),(s*.217,-.234,2.98)],[.009,.012,.002],SHADOW,'Head',6,12,flatten=.24)
    # A fitted upper lid shell rotates over the eyeball, rather than moving a line.
    verts=[];faces=[]
    for j in range(8):
        phi=.02+j/7*.88
        for i in range(25):
            a=TAU*i/24
            verts.append((s*.173+.130*math.sin(phi)*math.cos(a),-.31+.073*math.sin(phi)*math.sin(a),3.23+.084*math.cos(phi)))
    for j in range(7):
        for i in range(24):
            a=j*25+i;faces.append((a,a+1,a+26,a+25))
    mesh('Lid_shell'+side,verts,faces,SKIN,'Lid'+side)
ellipsoid('Nose_bridge',(0,-.272,3.15),(.048,.046,.116),SKIN,segments=16,rings=12)
ellipsoid('Nose_tip',(0,-.307,3.085),(.061,.061,.051),SKIN,segments=20,rings=12)
for s in [-1,1]:
    ellipsoid('Nostril'+str(s),(s*.035,-.337,3.064),(.016,.01,.008),SHADOW,segments=10,rings=6)
tube('Mouth_seam',[(-.127,-.225,2.983),(-.058,-.268,2.971),(0,-.279,2.979),(.061,-.267,2.979),(.123,-.225,2.995)],[.003,.009,.007,.009,.002],SHADOW,'Jaw',8,20)
tube('Upper_lip',[(-.119,-.228,2.991),(-.035,-.273,2.995),(0,-.28,2.987),(.038,-.271,3.001),(.116,-.232,3.003)],[.002,.012,.009,.012,.002],LIP,'Jaw',8,20)
tube('Lower_lip',[(-.106,-.237,2.977),(0,-.281,2.955),(.107,-.237,2.986)],[.002,.017,.002],LIP,'Jaw',8,20)

# Tailored hanbok / continuous cloth with radial folds and secondary joints
def skirt_weights(v,t):
    a=math.atan2(v[1],v[0])%TAU;f=a/TAU*8;i=int(f);u=f-i
    influence=max(0,1-t)**1.2*.9
    return {'Hips':1-influence,'Hem'+str(i%8):influence*(1-u),'Hem'+str((i+1)%8):influence*u}
rows=[]
for j in range(19):
    t=j/18;z=.12+t*1.84
    rx=.26+.56*(1-t)**.68;ry=.19+.39*(1-t)**.72
    rows.append((z,rx,ry,.055*math.sin(t*math.pi)))
loft('Silk_chima',rows,IVORY,'Hips',64,.045,skirt_weights)
loft('Crimson_underskirt',[(.075,.76,.54,.02),(.19,.77,.54,.025),(.35,.71,.50,.03),(.62,.61,.43,.03)],RED,'Hips',64,.04)
loft('Jeogori',[(1.99,.272,.197,0),(2.08,.28,.207,0),(2.22,.30,.225,0),(2.42,.34,.232,0),(2.57,.405,.19,0),(2.64,.275,.143,0)],IVORY,'Chest',48,.007)
# Curved crossed collar and stitched edges, fitted to the garment rather than flat boxes.
for name,points in [('Left',[(-.135,-.12,2.71),(-.18,-.198,2.55),(-.06,-.246,2.37),(.145,-.22,2.20)]),('Right',[(.135,-.12,2.71),(.15,-.196,2.57),(.045,-.245,2.39),(-.12,-.22,2.19)])]:
    ribbon('Collar_'+name,points,[.075,.075,.067,.055],RED,'Chest')
    tube('Collar_stitch_'+name,[(p[0]+.025,p[1]-.007,p[2])for p in points],[.004,.004,.004,.004],GOLD,'Chest',5,20)
for side,s in [('L',-1),('R',1)]:
    tube('Sleeve'+side,[(s*.31,0,2.53),(s*.45,.015,2.37),(s*.54,-.016,2.12),(s*.60,-.073,1.98),(s*.62,-.13,1.80)],[.18,.235,.245,.24,.132],IVORY,'UpperArm'+side,24,28,flatten=.8,chain=['UpperArm'+side,'UpperArm'+side,'Forearm'+side,'Forearm'+side])
    tube('Red_cuff'+side,[(s*.617,-.12,1.88),(s*.62,-.13,1.81)],[.143,.134],RED,'Forearm'+side,20,4,flatten=.8)
    ellipsoid('Palm'+side,(s*.624,-.139,1.70),(.083,.042,.12),SKIN,'Hand'+side,16,10)
    for i in range(4):
        x=s*.624+(i-1.5)*.035;length=[.135,.178,.167,.12][i]
        p=[(x,-.14,1.646),(x+s*.006,-.149,1.59),(x+s*.014,-.174,1.646-length)]
        b='Finger'+side+str(i);bone(b,p[0],'Hand'+side)
        tube(b,p,[.023,.019,.01],SKIN,b,8,10)
        tube('Nail'+side+str(i),[p[-1],(p[-1][0]+s*.008,p[-1][1]-.012,p[-1][2]-.057)],[.013,.002],NAIL,b,6,6,flatten=.45)
    thumb=[(s*.57,-.14,1.735),(s*.532,-.16,1.67),(s*.536,-.183,1.62)]
    bone('Thumb'+side,thumb[0],'Hand'+side)
    tube('Thumb'+side,thumb,[.028,.022,.009],SKIN,'Thumb'+side,8,10)
    # Feet are hidden by cloth at rest, but present for animation/import inspection.
    tube('Leg'+side,[(s*.17,0,1.6),(s*.18,0,.95),(s*.18,-.035,.25)],[.11,.09,.055],SKIN,'Thigh'+side,12,16,chain=['Thigh'+side,'Shin'+side,'Foot'+side])
    ellipsoid('Silk_shoe'+side,(s*.18,-.09,.16),(.085,.18,.067),RED,'Foot'+side,16,8)
# Silk bow: four curved ribbons, independent trailing joints.
for s in [-1,1]:
    ribbon('Bow_loop'+str(s),[(.1,-.252,2.38),(.1+s*.17,-.29,2.43),(.1+s*.21,-.26,2.34),(.1,-.26,2.37)],[.048,.08,.065,.04],RED,'Chest')
ribbon('Long_tie',[(.1,-.27,2.37),(.13,-.278,2.11),(.16,-.29,1.88),(.1,-.36,1.56)],[.067,.068,.06,.045],RED,'Tie0',['Tie0','Tie1','Tie2'])
ribbon('Short_tie',[(.13,-.29,2.35),(.25,-.28,2.16),(.22,-.33,1.9)],[.057,.06,.055],RED,'Tie0',['Tie0','Tie1','Tie2'])
# Brass/jade norigae and deliberate asymmetrical tassel.
tube('Pendant_cord',[(-.13,-.235,2.18),(-.18,-.27,2.03),(-.22,-.29,1.89)],[.012,.011,.012],GOLD,'Hips',6,10)
ellipsoid('Jade_pendant',(-.22,-.298,1.88),(.073,.023,.093),JADE,'Hips',20,12)
ellipsoid('Pendant_inlay',(-.22,-.325,1.884),(.026,.009,.034),GOLD,'Hips',12,8)
for i in range(7):
    x=-.22+(i-3)*.018
    tube('Tassel'+str(i),[(x,-.29,1.82),(x+.01,-.32,1.65),(x-.02,-.37,1.47)],[.012,.01,.004],RED,'Tie2',6,10)

# Hair / shaped locks, each with a three-joint bend and delayed follow-through.
# The scalp is an open back shell. It never covers the eyes with a full sphere.
verts=[];faces=[]
for j in range(12):
    v=j/11
    for i in range(36):
        a=-.15+((TAU+.3)*i/35)
        front=max(0,-math.sin(a))
        phi=.04+v*(1.7-front*.78)
        verts.append((.388*math.sin(phi)*math.cos(a),.045+.304*math.sin(phi)*math.sin(a),3.245+.427*math.cos(phi)))
for j in range(11):
    for i in range(35):a=j*36+i;faces.append((a,a+1,a+37,a+36))
mesh('Sculpted_hair_cap',verts,faces,HAIR,'Head')
for i in range(12):
    a=math.pi*.05+i/11*math.pi*.9;x=math.cos(a)*.38;y=math.sin(a)*.25
    points=[(x*.45,y*.5,3.59),(x,y+.025,3.23),(x*1.12,y+.10,2.66),(x*1.2+.035*math.sin(i),y+.15,2.10),(x*1.18+.08*math.sin(i*.7),y+.12,1.6+(i%3)*.08)]
    chain=[f'Hair{i}_{j}'for j in range(3)]
    tube('Back_lock'+str(i),points,[.052,.088,.077,.048,.003],HAIR,'Head',10,24,.46,chain)
    tube('Back_sheen'+str(i),[(p[0],p[1]-.027,p[2]+.015) for p in points],[.004,.008,.006,.004,.001],HAIRLINE,'Head',5,24,1,chain)
for side,s in [('L',-1),('R',1)]:
    # Asymmetric face framing; the red eyes stay legible.
    i=0 if s<0 else 11;chain=[f'Hair{i}_{j}' for j in range(3)]
    pts=[(s*.08,-.12,3.61),(s*.26,-.255,3.49),(s*.34,-.25,3.16),(s*.38,-.20,2.74),(s*.33,-.23,2.20)]
    tube('Face_lock'+side,pts,[.06,.09,.073,.048,.002],HAIR,'Head',12,30,.4,chain)
    for off in [-.028,.009,.032]:
        tube('Face_striation'+side+str(off),[(p[0]+off,p[1]-.022,p[2])for p in pts],[.0015,.0027,.002,.0015,.001],HAIRLINE,'Head',4,24,1,chain)
for s in [-1,1]:
    # Small pins break the silhouette without a massive crown.
    tube('Hairpin'+str(s),[(s*.29,.10,3.46),(s*.47,.14,3.46)],[.016,.012],GOLD,'Head',8,8)
    for i in range(3):ellipsoid('Pin_bead'+str(s)+str(i),(s*(.37+i*.034),.13,3.46),(.023,.023,.026),JADE,'Head',10,6)

# Refine the orbital depth in the authored geometry, before binding.
for obj in PARTS:
    if obj.name.startswith(('Eye_white','Iris','Pupil','Eye_glint','Upper_eyelid','Lower_eyelid','Lash','Lid_shell')):
        for v in obj.data.vertices:v.co.y+=.035

# Merge surfaces by material and reduce redundant tessellation. Skin weights survive.
by_material={}
for obj in PARTS:by_material.setdefault(obj.data.materials[0].name,[]).append(obj)
PARTS=[]
for name,objects in by_material.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    if name in ['Aged_ivory_silk','Ink_blue_hair','Hair_sheen','Porcelain_skin']:
        dec=obj.modifiers.new('Surface_budget','DECIMATE');dec.ratio=.63
        bpy.ops.object.modifier_apply(modifier=dec.name)
    PARTS.append(obj)

# Armature / bind pose. All bones use the same local axes for stable import.
armdata=bpy.data.armatures.new('GhostSkeleton')
RIG=bpy.data.objects.new('gwisin-bride',armdata);SCENE.collection.objects.link(RIG)
bpy.context.view_layer.objects.active=RIG;RIG.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,(point,parent) in BONES.items():
    eb=armdata.edit_bones.new(name);eb.head=point;eb.tail=Vector(point)+Vector((0,.08,0))
    if parent:eb.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj in PARTS:
    mod=obj.modifiers.new('Ghost_skin','ARMATURE');mod.object=RIG
RIG['AssetId']='gwisin-bride';RIG['RigVersion']='MESH_BRIDE_1';RIG['ProductionVerified']=False

# Authored motion / layered timing. Six independent clips, no root translation.
def smooth(t):return t*t*(3-2*t)
def interp(t,keys):
    if t<=keys[0][0]:return keys[0][1]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]
def animate(state,time):
    for p in RIG.pose.bones:
        p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
    def rot(name,x=0,y=0,z=0):RIG.pose.bones[name].rotation_euler=(x,y,z)
    phase=TAU*time/3.2
    breath=math.sin(phase)
    rot('Spine',.025*breath,.018*math.sin(phase-.4),.023*math.sin(phase-.8))
    rot('Chest',-.018*math.sin(phase-.7),0,-.018*math.sin(phase-.8))
    rot('Head',-.04+.025*math.sin(phase-.6),.01*math.sin(phase),.10*math.sin(phase-.5))
    RIG.pose.bones['Hips'].location.z=.022*breath
    look=.10*math.sin(phase-.85)
    for side,s in [('L',-1),('R',1)]:
        rot('Eye'+side,.012*math.sin(phase),0,look)
        rot('UpperArm'+side,.025*math.sin(phase+.5*s),s*.025,.02*s)
        rot('Forearm'+side,-.035-.015*breath,s*.015,0)
        rot('Hand'+side,.06+.02*math.sin(phase-.5),0,-s*.07)
        for i in range(4):rot('Finger'+side+str(i),.07+.05*math.sin(phase-i*.22),0,s*.02)
    # One deliberate blink per cycle. The lid slides and rotates over the eyeball.
    blink=interp(time%3.2,[(0,0),(1.23,0),(1.30,1),(1.34,1),(1.47,0),(3.2,0)])
    for side in ['L','R']:
        RIG.pose.bones['Lid'+side].rotation_euler.x=1.02*blink
    amplitude=1
    if state in ['walk','chase']:
        stride=TAU*time/(1.6 if state=='walk' else .8)
        amp=.18 if state=='walk' else .38
        for side,s in [('L',-1),('R',1)]:
            f=stride+(0 if s<0 else math.pi)
            rot('Thigh'+side,math.sin(f)*amp)
            rot('Shin'+side,max(0,math.sin(f-.55))*amp*1.5)
            rot('Foot'+side,-max(0,math.sin(f))*.12)
            rot('UpperArm'+side,-math.sin(f)*amp*.35,.03*s,-.035*s)
        RIG.pose.bones['Hips'].location.z=.022*math.cos(stride*2)
        rot('Chest',.03 if state=='walk' else .13,0,math.sin(stride)*.025)
        amplitude=1.8 if state=='chase' else 1.25
    elif state=='attack':
        wind=interp(time,[(0,0),(.42,1),(.6,-.9),(.88,-.55),(1.35,0)])
        reach=interp(time,[(0,0),(.32,-.12),(.58,1),(.75,.84),(1.35,0)])
        rot('Spine',-.14*wind,0,.09*wind)
        rot('Chest',-.08*wind,0,-.10*wind)
        rot('Head',.14*wind,0,-.16*wind)
        for side,s in [('L',-1),('R',1)]:
            rot('UpperArm'+side,-reach*1.08,s*.13,-s*.14*reach)
            rot('Forearm'+side,-.035-.44*max(0,wind))
            rot('Hand'+side,.32*reach,0,s*.10)
            for i in range(4):rot('Finger'+side+str(i),-.24*reach,0,s*.04)
        RIG.pose.bones['Jaw'].location.z=-.025*max(0,reach)
        amplitude=2
    elif state=='hit':
        recoil=interp(time,[(0,0),(.10,1),(.25,.55),(.6,0)])
        rot('Spine',-.15*recoil,0,.09*recoil);rot('Head',-.19*recoil,0,-.12*recoil)
    elif state=='death':
        fall=interp(time,[(0,0),(.3,.1),(.8,.6),(1.6,1)])
        RIG.pose.bones['Hips'].location.z=-.52*fall
        rot('Spine',.20*fall,0,.34*fall);rot('Head',.33*fall,0,-.16*fall)
        for side,s in [('L',-1),('R',1)]:rot('UpperArm'+side,.13*fall,0,s*.14*fall)
        amplitude=1-fall*.7
    for i in range(12):
        for j in range(3):
            delay=j*.6+i*.13
            rot(f'Hair{i}_{j}',amplitude*.025*math.sin(phase-delay),.021*math.sin(phase-delay+.5),amplitude*.038*math.sin(phase-delay-.3))
    for i in range(8):
        rot('Hem'+str(i),amplitude*.02*math.sin(phase-i*.6),amplitude*.028*math.sin(phase-i*.6-.7),.015*math.sin(phase-i*.6))
    for i in range(3):rot('Tie'+str(i),amplitude*.07*math.sin(phase-i*.65-.5),.04*math.sin(phase-i*.65),0)

CLIPS={'idle':3.2,'walk':3.2,'chase':3.2,'attack':1.6,'hit':.8,'death':1.8}
SCENE.render.fps=30
SCENE.frame_start=0
for name,duration in CLIPS.items():
    RIG.animation_data_create();RIG.animation_data.action=bpy.data.actions.new(name)
    action=RIG.animation_data.action
    for f in range(round(duration*30)+1):
        animate(name,f/30)
        for pb in RIG.pose.bones:
            if pb.name=='Root':continue
            pb.keyframe_insert('rotation_euler',frame=f)
            if pb.name in ['Hips','Jaw','LidL','LidR']:pb.keyframe_insert('location',frame=f)
    action.use_fake_user=True
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
RIG.animation_data.action=bpy.data.actions['idle'];SCENE.frame_set(1)

# Export / real portable assets, preserving all clip and skin data.
bpy.ops.object.select_all(action='DESELECT')
RIG.select_set(True)
for obj in PARTS:obj.select_set(True)
bpy.context.view_layer.objects.active=RIG
gltf_path=ARGS.output/'bride.glb'
bpy.ops.export_scene.gltf(filepath=str(gltf_path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_all_influences=False)
fbx_path=ARGS.output/'bride.fbx'
if ARGS.fbx:
    bpy.ops.export_scene.fbx(filepath=str(fbx_path),use_selection=True,object_types={'ARMATURE','MESH'},add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=True,bake_anim_use_nla_strips=False,bake_anim_simplify_factor=0,axis_forward='-Z',axis_up='Y',path_mode='COPY',embed_textures=True)
triangles=sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in PARTS)
report={'assetId':'gwisin-bride','rigVersion':'MESH_BRIDE_1','kind':'AUTHORED_SKINNED_MESH','meshObjects':len(PARTS),'vertices':sum(len(o.data.vertices)for o in PARTS),'triangles':triangles,'bones':len(BONES),'clips':CLIPS,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'nativeStudioVerified':False,'productionVerified':False,'artVerified':False,'artifacts':[]}
for p in [gltf_path,texture_path]+([fbx_path] if ARGS.fbx else []):report['artifacts'].append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ARGS.output/'evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

# Preview / camera, lighting, actual rig frames; no painted-over substitute imagery.
if ARGS.render:
    ARGS.render.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    floor=material('Stage',(.019,.029,.037),.65)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
    bpy.context.object.data.materials.append(floor)
    def light(name,loc,power,color,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(name,data);SCENE.collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat('-Z','Y').to_euler()
    light('Warm_key',(-3,-4,5),430,(1,.80,.65),4)
    light('Cool_fill',(3,-2,3),180,(.48,.72,1),3)
    light('Hair_rim',(1,2,4.3),620,(.22,.60,.8),2.5)
    light('Soft_front',(-.2,-4,2.4),45,(1,.88,.75),2)
    world=bpy.data.worlds.new('Night');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.09,.13,1);world.node_tree.nodes['Background'].inputs[1].default_value=.25;SCENE.world=world
    data=bpy.data.cameras.new('Portrait');camera=bpy.data.objects.new('Portrait',data);SCENE.collection.objects.link(camera);SCENE.camera=camera
    camera.location=(4.0,-9.0,3.2);target=Vector((0,0,1.98));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=4.25
    SCENE.render.engine='CYCLES';SCENE.cycles.device='CPU';SCENE.cycles.samples=32;SCENE.cycles.use_denoising=True
    SCENE.render.resolution_x=850;SCENE.render.resolution_y=1050;SCENE.render.resolution_percentage=100
    SCENE.view_settings.view_transform='AgX';SCENE.render.image_settings.file_format='PNG'
    SCENE.render.film_transparent=False
    SCENE.frame_set(18);SCENE.render.filepath=str(ARGS.render/'bride.png');bpy.ops.render.render(write_still=True)
    camera.location=(1.5,-6,3.25);target=Vector((0,0,3.13));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=1.45
    SCENE.render.resolution_x=900;SCENE.render.resolution_y=900
    SCENE.render.filepath=str(ARGS.render/'face.png');bpy.ops.render.render(write_still=True)
    if ARGS.frames:
        camera.location=(2.8,-9,3.0);target=Vector((0,0,1.98));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=4.2
        SCENE.render.resolution_x=540;SCENE.render.resolution_y=700;SCENE.cycles.samples=12
        frames=ARGS.render/'frames';frames.mkdir(exist_ok=True)
        RIG.animation_data.action=None
        for f in range(ARGS.frames):
            t=f/30
            state,local=('idle',t) if t<3.2 else ('attack',t-3.2) if t<4.8 else ('idle',t-4.8)
            animate(state,local)
            # No active action overwrites this exact procedural pose.
            bpy.context.view_layer.update()
            SCENE.render.filepath=str(frames/f'{f:04}.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report,ensure_ascii=False),flush=True)
