"""Blender 4.x authoring starter: editable character, facial sculpts, painted texture, hand bones, keyed actions.
Run: blender -b -t 2 --python tools/vibe_character_authoring.py -- --output-dir /tmp/vibe-character
Creates .blend and .glb. Artists can open .blend, sculpt shape keys, texture paint and edit actions.
"""
import bpy, math, sys, argparse
from pathlib import Path
from mathutils import Vector

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser()
parser.add_argument('--output-dir',default='build/vibe-character')
args=parser.parse_args(argv)
out=Path(args.output_dir).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1024;scene.render.resolution_y=1024
scene.render.resolution_percentage=100
scene.frame_start=1;scene.frame_end=96;scene.render.fps=30

def material(name,color,metal=0,rough=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m

skin=material('skin_PBR',(.83,.51,.35));suit=material('forest_suit_PBR',(.045,.24,.22))
hair=material('hair_PBR',(.035,.055,.09));trim=material('gold_trim_PBR',(.65,.44,.14),.55,.36)
eyes=material('eye_PBR',(.015,.025,.04),.1,.19)
def sphere(name,location,scale,mat,segments=32,rings=20):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=location)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o

torso=sphere('Torso',(0,0,1.25),(.39,.25,.55),suit)
neck=sphere('Neck',(0,0,1.82),(.12,.12,.18),skin)
head=sphere('Face',(0,0,2.16),(.31,.29,.38),skin,64,40)
sphere('Hair',(0,-.045,2.46),(.32,.3,.17),hair)
for sign,label in [(-1,'L'),(1,'R')]:
 sphere('Eye_'+label,(sign*.13,.266,2.22),(.074,.038,.069),eyes)
 sphere('Ear_'+label,(sign*.31,0,2.13),(.075,.08,.13),skin)
 sphere('Arm_'+label,(sign*.48,0,1.35),(.17,.17,.43),suit)
 sphere('Hand_'+label,(sign*.48,0,.91),(.13,.12,.16),skin)
 sphere('Leg_'+label,(sign*.19,0,.52),(.18,.2,.48),hair)
 sphere('Boot_'+label,(sign*.19,.08,.13),(.2,.3,.15),trim)
sphere('Belt',(0,0,.91),(.4,.26,.09),trim)

# Editable facial sculpt targets: sculpt each key independently in Blender Shape Keys mode.
head.shape_key_add(name='Basis',from_mix=False)
coords=[v.co.copy() for v in head.data.vertices]
def shape(name,transform):
 key=head.shape_key_add(name=name,from_mix=False)
 for i,base in enumerate(coords):key.data[i].co=transform(base.copy())
 return key
shape('jawOpen',lambda v: Vector((v.x,v.y,v.z-(.085 if v.z<-.06 and v.y>.07 else 0))))
shape('mouthSmileLeft',lambda v: Vector((v.x,v.y,v.z+(.05 if v.x<0 and v.z<-.09 and v.y>.12 else 0))))
shape('mouthSmileRight',lambda v: Vector((v.x,v.y,v.z+(.05 if v.x>0 and v.z<-.09 and v.y>.12 else 0))))
shape('browInnerUp',lambda v: Vector((v.x,v.y,v.z+(.045 if abs(v.x)<.19 and v.z>.11 and v.y>.1 else 0))))
shape('mouthFrownLeft',lambda v: Vector((v.x,v.y,v.z-(.04 if v.x<0 and v.z<-.09 and v.y>.12 else 0))))
shape('mouthFrownRight',lambda v: Vector((v.x,v.y,v.z-(.04 if v.x>0 and v.z<-.09 and v.y>.12 else 0))))
shape('eyeBlinkLeft',lambda v: Vector((v.x,v.y,v.z-(.035 if v.x<0 and .02<v.z<.17 and v.y>.15 else 0))))
shape('eyeBlinkRight',lambda v: Vector((v.x,v.y,v.z-(.035 if v.x>0 and .02<v.z<.17 and v.y>.15 else 0))))

# Paintable UV image is saved to disk, linked to a material and packed into the .blend.
image=bpy.data.images.new('Vibe_Paint_2K',width=2048,height=2048,alpha=True)
pixels=[0.0]*(2048*2048*4)
for y in range(2048):
 for x in range(2048):
  idx=(y*2048+x)*4
  noise=.015*math.sin(x*.028)*math.sin(y*.041)
  pixels[idx:idx+4]=[.045+noise,.24+noise,.22+noise,1.0]
image.pixels[:]=pixels
image.filepath_raw=str(out/'vibe_suit_basecolor.png');image.file_format='PNG';image.save()
image.pack()
nodes=suit.node_tree.nodes
texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.label='PAINT HERE: 2K editable color'
suit.node_tree.links.new(texture.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

# Full named armature, including three phalanges per finger for both hands.
arm_data=bpy.data.armatures.new('VibeSkeleton');arm=bpy.data.objects.new('VibeSkeleton',arm_data);scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head_pos,tail_pos,parent=None):
 b=arm_data.edit_bones.new(name);b.head=head_pos;b.tail=tail_pos
 if parent:b.parent=arm_data.edit_bones[parent]
 return b
bone('Root',(0,0,.8),(0,0,1.0))
bone('Spine',(0,0,1),(0,0,1.75),'Root')
bone('Neck',(0,0,1.75),(0,0,1.95),'Spine')
bone('Head',(0,0,1.95),(0,0,2.48),'Neck')
for side,sign in [('Left',-1),('Right',1)]:
 bone(side+'Arm',(sign*.36,0,1.68),(sign*.48,0,1.12),'Spine')
 bone(side+'Hand',(sign*.48,0,1.12),(sign*.48,0,.87),side+'Arm')
 bone(side+'Leg',(sign*.18,0,.86),(sign*.18,0,.2),'Root')
 for finger,index in [('Thumb',0),('Index',1),('Middle',2),('Ring',3),('Pinky',4)]:
  previous=side+'Hand'
  for joint in range(1,4):
   x=sign*(.48+(index-2)*.023)
   z=.87-joint*.055
   name=side+'Hand'+finger+str(joint)
   bone(name,(x,0,z+.055),(x,0,z),previous);previous=name
bpy.ops.object.mode_set(mode='OBJECT');arm.select_set(False)

# Build deformable finger segment meshes with weighted vertices, not rigid bone parenting.
def finger_segment(name,base,tip,radius,bone_name,parent_name=None):
 direction=Vector(tip)-Vector(base)
 middle=(Vector(base)+Vector(tip))*.5
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=direction.length,location=middle)
 obj=bpy.context.object;obj.name=name
 obj.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 obj.data.materials.append(skin)
 for polygon in obj.data.polygons:polygon.use_smooth=True
 current=obj.vertex_groups.new(name=bone_name)
 previous=obj.vertex_groups.new(name=parent_name) if parent_name else None
 # Joint blending distributes deformation smoothly between neighboring phalanges.
 for vertex in obj.data.vertices:
  projection=(Vector(obj.matrix_world @ vertex.co)-Vector(base)).dot(direction.normalized())/direction.length
  influence=max(.2,min(1.,.4+projection*.6))
  current.add([vertex.index],influence,'REPLACE')
  if previous:previous.add([vertex.index],1-influence,'REPLACE')
  else:current.add([vertex.index],1,'REPLACE')
 modifier=obj.modifiers.new('SkinFinger','ARMATURE');modifier.object=arm
 obj.parent=arm
 obj.matrix_parent_inverse=arm.matrix_world.inverted()
 return obj

for side,sign in [('Left',-1),('Right',1)]:
 for finger,index in [('Thumb',0),('Index',1),('Middle',2),('Ring',3),('Pinky',4)]:
  previous=side+'Hand'
  for joint in range(1,4):
   name=side+'Hand'+finger+str(joint)
   b=arm.data.bones.get(name)
   if b:
    start=arm.matrix_world @ b.head_local
    end=arm.matrix_world @ b.tail_local
    finger_segment('FingerMesh_'+name,start,end,.023 if finger!='Thumb' else .029,name,previous)
   previous=name

# Add extra independently sculptable facial muscle targets to the head.
def face_muscle(name,selector,delta):
 def deformation(v):
  if selector(v):
   v.x+=delta[0];v.y+=delta[1];v.z+=delta[2]
  return v
 return shape(name,deformation)
face_muscle('browDownLeft',lambda v:v.x<-.02 and v.z>.12 and v.y>.1,(0,0,-.032))
face_muscle('browDownRight',lambda v:v.x>.02 and v.z>.12 and v.y>.1,(0,0,-.032))
face_muscle('eyeWideLeft',lambda v:v.x<0 and .01<v.z<.18 and v.y>.14,(0,0,.027))
face_muscle('eyeWideRight',lambda v:v.x>0 and .01<v.z<.18 and v.y>.14,(0,0,.027))
face_muscle('cheekPuff',lambda v:abs(v.x)>.13 and v.z<0 and v.y>.1,(.02 if v.x>0 else -.02,.015,0))
face_muscle('mouthPucker',lambda v:abs(v.x)<.17 and v.z<-.08 and v.y>.12,(-.035 if v.x>0 else .035,.03,0))
face_muscle('mouthFunnel',lambda v:abs(v.x)<.15 and v.z<-.07 and v.y>.12,(-.02 if v.x>0 else .02,.045,0))
face_muscle('mouthClose',lambda v:abs(v.x)<.16 and v.z<-.09 and v.y>.12,(0,0,.015))
face_muscle('noseSneerLeft',lambda v:v.x<0 and -.02<v.z<.1 and v.y>.22,(0,.018,.017))
face_muscle('noseSneerRight',lambda v:v.x>0 and -.02<v.z<.1 and v.y>.22,(0,.018,.017))

# Parent rigid mesh pieces to animated bones, keeping editable original geometry.
bindings={'Torso':'Spine','Neck':'Neck','Face':'Head','Hair':'Head','Belt':'Root'}
for side,label in [('Left','L'),('Right','R')]:
 bindings.update({'Eye_'+label:'Head','Ear_'+label:'Head','Arm_'+label:side+'Arm','Hand_'+label:side+'Hand','Leg_'+label:side+'Leg','Boot_'+label:side+'Leg'})
for obj_name,bone_name in bindings.items():
 obj=bpy.data.objects.get(obj_name)
 if obj:
  world=obj.matrix_world.copy();obj.parent=arm;obj.parent_type='BONE';obj.parent_bone=bone_name;obj.matrix_world=world

# Authored keyframes are editable in Dope Sheet and Graph Editor.
def make_action(name,frames):
 if arm.animation_data is None:arm.animation_data_create()
 arm.animation_data.action=None
 for frame,values in frames:
  for bone_name,angle in values.items():
   pose_bone=arm.pose.bones.get(bone_name)
   if not pose_bone:continue
   pose_bone.rotation_mode='XYZ';pose_bone.rotation_euler.x=angle
   pose_bone.keyframe_insert(data_path='rotation_euler',frame=frame,group=bone_name)
 # Blender 4.4 action slots may require stashing through NLA.
 action=arm.animation_data.action
 if action:action.name=name
 for fc in (action.fcurves if action and hasattr(action,'fcurves') else []):
  for point in fc.keyframe_points:point.interpolation='BEZIER'
 if action:
  track=arm.animation_data.nla_tracks.new();strip=track.strips.new(name,1,action)
  track.mute=True
  arm.animation_data.action=None
 return action
make_action('Idle_HandAuthored',[(1,{'Head':-.03,'LeftArm':.06,'RightArm':-.06}),(24,{'Head':.03,'LeftArm':-.03,'RightArm':.03}),(48,{'Head':-.03,'LeftArm':.06,'RightArm':-.06})])
make_action('Walk_HandAuthored',[(1,{'LeftLeg':.42,'RightLeg':-.42,'LeftArm':-.3,'RightArm':.3}),(12,{'LeftLeg':-.42,'RightLeg':.42,'LeftArm':.3,'RightArm':-.3}),(24,{'LeftLeg':.42,'RightLeg':-.42,'LeftArm':-.3,'RightArm':.3})])
make_action('Attack_HandAuthored',[(1,{'RightArm':-.2,'Spine':0}),(6,{'RightArm':1.2,'Spine':-.15}),(11,{'RightArm':-1.1,'Spine':.24}),(23,{'RightArm':-.2,'Spine':0})])
bpy.context.view_layer.objects.active=arm;arm.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'vibe_character_authoring.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'vibe_character.glb'),export_format='GLB',export_animations=True,export_morph=True,export_materials='EXPORT')
print('VIBE_AUTHORING_COMPLETE',out)
