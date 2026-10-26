#!/usr/bin/env python3
"""Author original mesh assets off-line. Roblox gameplay never creates Part primitives.
Meshes are newly authored by Jaewoon, not falsely represented as third-party CC0.
Generates GLB with real mesh geometry/materials, from Blender-independent trimesh.
"""
import os, sys, math
import numpy as np
import trimesh
OUT = sys.argv[1] if len(sys.argv)>1 else '/tmp/baeksu-art'
os.makedirs(OUT, exist_ok=True)
scene = None
counter = 0
def rgba(hexcode):
    h=hexcode.lstrip('#')
    return [int(h[i:i+2],16) for i in (0,2,4)]+[255]
def add_mesh(mesh,color,name):
    global counter
    mesh.visual.vertex_colors=rgba(color)
    scene.add_geometry(mesh, geom_name=f'{counter:04d}_{name}')
    counter+=1
def ball(name,xyz,scale,color,sub=2):
    mesh=trimesh.creation.icosphere(subdivisions=sub,radius=1)
    mesh.apply_scale(scale)
    mesh.apply_translation(xyz)
    add_mesh(mesh,color,name)
def block(name,xyz,scale,color):
    mesh=trimesh.creation.box(extents=scale)
    mesh.apply_translation(xyz)
    add_mesh(mesh,color,name)
def rod(name,a,b,r,color,n=10):
    a,b=np.array(a),np.array(b)
    v=b-a
    if np.linalg.norm(v)<1e-3:return
    mesh=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(v),sections=n)
    T=trimesh.geometry.align_vectors([0,0,1],v)
    mesh.apply_transform(T)
    mesh.apply_translation((a+b)/2)
    add_mesh(mesh,color,name)
def triangle(name,vertices,color):
    v=np.array(vertices,dtype=float)
    faces=np.array([[0,i,i+1] for i in range(1,len(v)-1)],dtype=int)
    mesh=trimesh.Trimesh(vertices=v,faces=faces,process=False)
    add_mesh(mesh,color,name)
def head(name,xyz,color,eye_z=.95):
    ball(name,xyz,(.72,.7,.8),color,3)
    for side in [-1,1]:
        ball('eye',(xyz[0]+side*.30,xyz[1]+.20,xyz[2]+eye_z),(.15,.17,.13),'#202f42',2)
        ball('eye-glint',(xyz[0]+side*.26,xyz[1]+.25,xyz[2]+eye_z+.07),(.055,.065,.04),'#ffffff',2)
def feet4(c,width,z_back,z_front):
    for side in [-1,1]:
        for z in (z_back,z_front):
            ball('paw',(side*width,-.98,z),(.40,.8,.43),c,2)
def build_creature(kind):
    global scene,counter
    scene=trimesh.Scene();counter=0
    if kind=='sparrow':
        ball('feather body',(0,0,0),(1.05,.87,1.3),'#d9b27c',3)
        head('sparrow head',(0,.70,.8),'#f3d59c')
        triangle('beak',[(-.33,.65,1.55),(.33,.65,1.55),(0,.43,2.2)],'#f5a644')
        for side in [-1,1]:
            ball('wing',(side*.9,.2,-.2),(.8,.27,.95),'#a47755')
            for j in range(3):
                triangle('feather',[(side*1,.2,-.3),(side*(1.85+j*.15),.08,-.8-j*.1),(side*1.5,.05,-.8)],'#bf8b5f')
            rod('bird leg',(side*.43,-.6,.4),(side*.43,-1.65,.65),.13,'#da9852')
        triangle('tail',[(-.5,.2,-1.1),(.5,.2,-1.1),(0,.08,-2.0)],'#b47e50')
    elif kind=='ant':
        ball('head',(0,.25,1.28),(.68,.68,.73),'#845445')
        ball('thorax',(0,0,0),(.53,.57,.73),'#aa6b56')
        ball('abdomen',(0,.05,-1.28),(.94,.76,1.03),'#683c35',3)
        for side in [-1,1]:
            ball('eye',(side*.44,.55,1.7),(.18,.20,.15),'#181e22')
            rod('antenna',(side*.35,.74,1.55),(side*.58,1.42,1.85),.09,'#4b2a2d')
            for j,z in enumerate((.9,0,-.75)):
                rod('insect thigh',(side*.36,-.1,z),(side*1.36,-.45,z+.4),.12,'#694035')
                rod('insect shin',(side*1.36,-.45,z+.4),(side*1.58,-1.25,z+.64),.08,'#694035')
    elif kind=='beetle':
        ball('chest',(0,-.02,.55),(1.1,.85,1.1),'#305e4e')
        ball('elytra',(0,.55,-.68),(1.5,1.14,1.65),'#2d8675',3)
        ball('head',(0,.38,1.55),(.91,.74,.9),'#3b735b')
        rod('front horn',(0,.87,2.0),(0,1.92,2.25),.22,'#344b3a')
        rod('horn fork',(-.6,1.93,2.3),(.6,1.93,2.3),.16,'#344b3a')
        for side in [-1,1]:
            for z in (-1,0,1):
                rod('beetle leg',(side*.8,-.55,z),(side*1.9,-.98,z+.25),.20,'#2c4d43')
    elif kind=='wolf':
        ball('wolf body',(0,.05,0),(.98,1.01,1.75),'#73828d',3)
        ball('chest',(0,.25,1.15),(1.12,1.1,1.0),'#8f9da6')
        head('wolf head',(0,.72,1.92),'#bbc4c8')
        ball('muzzle',(0,.35,2.66),(.43,.33,.76),'#dde0d8')
        ball('nose',(0,.45,3.27),(.25,.17,.22),'#242c37')
        feet4('#5d6c75',.7,-1.1,1.15)
        for side in [-1,1]:
            triangle('pointed ears',[(side*.38,1.26,1.85),(side*.82,2.04,1.62),(side*.93,1.31,2)],'#596777')
        rod('tail',(0,.35,-1.55),(.3,1.35,-2.7),.28,'#8c969e')
    elif kind=='turtle':
        ball('body',(0,-.25,0),(1.42,.83,1.7),'#79a97b',3)
        ball('shell',(0,.42,-.22),(1.72,1.1,1.91),'#4e7660',3)
        for side in [-1,1]:
            for z in [-.8,.6]:
                ball('shell plate',(side*.72,1,-.2+z),(.64,.25,.71),'#7e9c68')
                ball('foot',(side*1.35,-.9,z),(.56,.55,.69),'#a0ba85')
        head('turtle head',(0,0,1.69),'#b5ce98')
        triangle('tail',[(-.25,-.3,-1.7),(.25,-.3,-1.7),(0,-.4,-2.5)],'#76916b')
    elif kind=='slime':
        ball('gel dome',(0,-.1,0),(1.6,1.35,1.4),'#63d8bf',3)
        ball('core',(0,-.2,.8),(.84,.64,.6),'#a4fff1',3)
        for side in [-1,1]:
            ball('eye',(side*.55,.28,1.15),(.2,.24,.15),'#173f47')
        for z in [-.8,.8]:
            ball('bubble',(.85,.92,z),(.3,.26,.32),'#bcfff2')
    elif kind=='golem':
        block('stone torso',(0,.1,0),(2.5,2.8,1.75),'#89796b')
        block('stone head',(0,2.1,.25),(1.95,1.7,1.6),'#a29683')
        for side in [-1,1]:
            ball('shoulder',(side*1.95,.9,0),(.86,.9,.84),'#73695f',2)
            block('stone arm',(side*2.3,-.25,0),(1.05,2.1,1.0),'#9a8770')
            block('stone leg',(side*.7,-2,0),(1.0,1.7,1.15),'#786f62')
            ball('eye',(side*.48,2.18,1.07),(.18,.19,.1),'#e8c95a',2)
        ball('crystal',(0,1,1.05),(.43,.7,.28),'#6fe9d5',2)
    elif kind=='dragon':
        ball('dragon torso',(0,0,0),(1.45,1.27,1.95),'#ae4947',3)
        head('dragon head',(0,1.08,1.74),'#db7969')
        ball('long muzzle',(0,.68,2.7),(.67,.45,.97),'#ce7561')
        for side in [-1,1]:
            triangle('wing leather',[(side*.8,.85,-.3),(side*4.0,2.5,-.9),(side*2.8,.5,-1.7),(side*3.7,.55,-2.3)],'#7e3e4b')
            rod('wing bone',(side*.8,.9,-.4),(side*4.0,2.5,-.9),.17,'#f2bb8d')
            triangle('head horns',[(side*.35,1.65,1.4),(side*1.05,2.6,.6),(side*.8,1.55,1.8)],'#ddbf9e')
            ball('leg',(side*.85,-1.25,.6),(.50,.98,.52),'#6f373d')
        for j in range(4):
            rod('tail',(0,.0,-1.7-j*.6),(0,-.25,-2.5-j*.6),max(.17,.58-j*.11),'#a04d49')
            triangle('dorsal spike',[(-.4,.85,-.1-j*.7),(.4,.85,-.1-j*.7),(0,1.62,-.45-j*.7)],'#d6ac8d')
    scene.export(os.path.join(OUT,kind+'.glb'))
def build_world():
    global scene,counter
    # Mesh-based art: a forest tree, house and two castle shapes. Terrain is separate.
    scene=trimesh.Scene();counter=0
    block('house body',(0,3.2,0),(7.5,5.5,7.5),'#b58c69')
    block('door',(0,2.5,3.81),(2.0,3.7,.22),'#50392f')
    for side in [-1,1]:
        block('window',(side*2.22,4,3.83),(1.4,1.4,.2),'#f2c77c')
        block('corner trim',(side*3.62,3.5,side*3.62),(.52,6,.5),'#e6d0a5')
    for side in [-1,1]:
        roof=trimesh.creation.box(extents=(4.95,.48,9))
        roof.apply_transform(trimesh.transformations.rotation_matrix(side*.49,[0,0,1]))
        roof.apply_translation((side*2.1,6.5,0))
        add_mesh(roof,'#814b45','sloped roof')
    scene.export(os.path.join(OUT,'home.glb'))
    scene=trimesh.Scene();counter=0
    block('castle core',(0,6,0),(21,12,5),'#8b9caa')
    block('gate door',(0,4,2.7),(7.0,8,.6),'#6d5244')
    for side in [-1,1]:
        block('turret',(side*11.6,8,0),(5.5,16,6),'#8696a7')
        block('turret crenellation',(side*11.6,17,0),(6.3,2,6.5),'#c5ced6')
        for j in range(5):
            block('battlement',(side*(1+j*2),13,0),(1.4,2,5.5),'#afbec9')
    scene.export(os.path.join(OUT,'gate.glb'))
    scene=trimesh.Scene();counter=0
    rod('trunk',(0,0,0),(0,5.6,0),.65,'#90694b')
    for x,y,z,r in [(-1.5,6,0,2),(1.3,6.3,.3,2),(0,8,0,2.1),(.5,7,-1.6,1.9)]:
        ball('foliage',(x,y,z),(r,r*.82,r),'#559663',2)
    scene.export(os.path.join(OUT,'tree.glb'))
    scene=trimesh.Scene();counter=0
    ball('rock base',(0,.4,0),(2.3,1.55,2.1),'#a5a5a0',1)
    ball('slate facets',(.25,1.1,.25),(1.6,.85,1.45),'#7c898e',1)
    scene.export(os.path.join(OUT,'rock.glb'))

for kind in ('sparrow','ant','beetle','wolf','turtle','slime','golem','dragon'):
    build_creature(kind)
build_world()
print('BAEKSU_WAR_MESH_ASSET_COUNT='+str(len(os.listdir(OUT))))
