# Editable genre-specific Blender character production and hand-keyed animation.
# Run: blender --background --python tools/vibe_genre_character_factory.py -- --output-dir build/genre-heroes
import bpy, math, sys, argparse
from pathlib import Path
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser();parser.add_argument('--output-dir',default='build/genre-heroes');parser.add_argument('--genre',default='all')
args=parser.parse_args(argv);out=Path(args.output_dir).resolve();out.mkdir(parents=True,exist_ok=True)
GENRES={
 'storybook':('Forest Guide',(.18,.44,.30),(.95,.74,.38),'leaf','staff'),
 'illustration':('Watercolor Traveler',(.46,.59,.69),(.94,.78,.63),'beret','bag'),
 'wuxia':('Wuxia Swordsman',(.15,.22,.32),(.78,.67,.45),'topknot','sword'),
 'action':('Action Vanguard',(.38,.14,.16),(.9,.44,.19),'helmet','sword'),
 'voxel':('Block Explorer',(.27,.53,.26),(.52,.36,.20),'cap','pickaxe'),
 'fantasy':('Arcane Guardian',(.30,.26,.55),(.55,.78,.95),'hood','staff'),
 'horror':('Ruin Investigator',(.20,.23,.27),(.54,.64,.68),'hood','lantern'),
 'sciFi':('Star Scout',(.10,.39,.46),(.26,.9,.88),'helmet','scanner'),
 'cozy':('Village Artisan',(.64,.41,.29),(.94,.77,.55),'beret','bag'),
 'platformer':('Jump Adventurer',(.28,.39,.69),(.97,.72,.33),'cap','bag')
}
def mat(name,color,metal=0,rough=.8):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
def sphere(name,pos,scale,material,segments=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=pos)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cube(name,pos,scale,material,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:mod=o.modifiers.new('Soft Edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted Normals','WEIGHTED_NORMAL')
 return o
def rig():
 bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));arm=bpy.context.object;arm.name='Hero_Rig';data=arm.data;data.edit_bones.remove(data.edit_bones[0])
 def bone(name,head,tail,parent=None):
  b=data.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=data.edit_bones[parent]
 bone('Root',(0,0,.7),(0,0,.9));bone('Hips',(0,0,.9),(0,0,1.1),'Root');bone('Spine',(0,0,1.1),(0,0,1.6),'Hips');bone('Chest',(0,0,1.6),(0,0,1.86),'Spine');bone('Neck',(0,0,1.86),(0,0,2.03),'Chest');bone('Head',(0,0,2.03),(0,0,2.55),'Neck')
 for side,sgn in [('L',-1),('R',1)]:
  bone(side+'_UpperArm',(sgn*.34,0,1.75),(sgn*.57,0,1.42),'Chest')
  bone(side+'_Forearm',(sgn*.57,0,1.42),(sgn*.65,0,1.12),side+'_UpperArm')
  bone(side+'_Hand',(sgn*.65,0,1.12),(sgn*.67,0,1.01),side+'_Forearm')
  bone(side+'_Thigh',(sgn*.18,0,.95),(sgn*.19,0,.53),'Hips')
  bone(side+'_Shin',(sgn*.19,0,.53),(sgn*.19,0,.13),side+'_Thigh')
  bone(side+'_Foot',(sgn*.19,0,.13),(sgn*.19,-.2,.08),side+'_Shin')
  for idx,finger in enumerate(['Thumb','Index','Middle','Ring','Pinky']):
   previous=side+'_Hand'
   for joint in range(1,4):
    x=sgn*(.61+(idx-2)*.025);z=1.03-(joint-1)*.055
    name=f'{side}_{finger}{joint}';bone(name,(x,0,z),(x,0,z-.055),previous);previous=name
 bpy.ops.object.mode_set(mode='OBJECT');return arm
def bind(obj,arm,bone):
 world=obj.matrix_world.copy();obj.parent=arm;obj.parent_type='BONE';obj.parent_bone=bone;obj.matrix_world=world
def soft_skin(obj,arm,weights):
 # Weights are based on object-local vertices transformed to rest-world coordinates.
 world=obj.matrix_world.copy()
 groups={name:obj.vertex_groups.new(name=name) for name in weights}
 for v in obj.data.vertices:
  p=world @ v.co
  raw={name:max(0.,fn(p)) for name,fn in weights.items()}
  total=sum(raw.values())
  if total<1e-8:raw[next(iter(raw))]=1.;total=1.
  for name,value in raw.items():
   if value>0:groups[name].add([v.index],value/total,'REPLACE')
 modifier=obj.modifiers.new('SmoothJointSkin','ARMATURE');modifier.object=arm
 obj.parent=arm;obj.matrix_parent_inverse=arm.matrix_world.inverted()
 return obj
def smoothstep(a,b,x):
 t=max(0.,min(1.,(x-a)/max(1e-6,b-a)))
 return t*t*(3-2*t)
def deformable_limb(name,position,scale,material,arm,proximal,distal,joint_height,blend_width=.13):
 obj=sphere(name,position,scale,material,32,24)
 # Smoothly distribute influence across the elbow/knee joint instead of rigid pieces.
 soft_skin(obj,arm,{
  proximal:lambda p:smoothstep(joint_height-blend_width,joint_height+blend_width,p.z),
  distal:lambda p:1.-smoothstep(joint_height-blend_width,joint_height+blend_width,p.z)
 })
 return obj
def finger_skin(name,position,scale,material,arm,first,second,third):
 obj=sphere(name,position,scale,material,16,12)
 z=position[2]
 soft_skin(obj,arm,{
  first:lambda p:smoothstep(z-.07,z-.015,p.z),
  second:lambda p:1.-abs(2*smoothstep(z-.07,z+.07,p.z)-1),
  third:lambda p:1.-smoothstep(z+.015,z+.07,p.z)
 })
 return obj
def make_facial_keys(face):
 face.shape_key_add(name='Basis')
 points=[v.co.copy() for v in face.data.vertices]
 # Face local coordinates: front points toward negative Y.
 def mask(v,cx=0,cz=0,rx=.18,rz=.12):
  dx=(v.x-cx)/rx;dz=(v.z-cz)/rz
  return max(0.,1.-dx*dx-dz*dz)**2 * smoothstep(-.08,-.19,v.y)
 def deform(name,fn):
  key=face.shape_key_add(name=name)
  for i,p in enumerate(points):
   dx,dy,dz=fn(p)
   key.data[i].co=p+Vector((dx,dy,dz))
 def lip(v):return mask(v,0,-.14,.2,.105)
 def eye(v,sgn):return mask(v,sgn*.12,.07,.115,.095)
 def brow(v,sgn):return mask(v,sgn*.12,.18,.14,.085)
 deform('jawOpen',lambda v:(0,0,-.12*lip(v)))
 deform('mouthClose',lambda v:(0,0,.025*lip(v)))
 deform('mouthSmileLeft',lambda v:(-.04*lip(v) if v.x<0 else 0,0,.05*lip(v) if v.x<0 else 0))
 deform('mouthSmileRight',lambda v:(.04*lip(v) if v.x>0 else 0,0,.05*lip(v) if v.x>0 else 0))
 deform('mouthFrownLeft',lambda v:(0,0,-.04*lip(v) if v.x<0 else 0))
 deform('mouthFrownRight',lambda v:(0,0,-.04*lip(v) if v.x>0 else 0))
 deform('mouthPucker',lambda v:(-.04*lip(v) if v.x>0 else .04*lip(v),-.045*lip(v),0))
 deform('mouthFunnel',lambda v:(-.02*lip(v) if v.x>0 else .02*lip(v),-.06*lip(v),-.02*lip(v)))
 deform('browInnerUp',lambda v:(0,0,.05*mask(v,0,.18,.19,.09)))
 for side,sgn in [('Left',-1),('Right',1)]:
  deform('eyeBlink'+side,lambda v,s=sgn:(0,0,-.055*eye(v,s)))
  deform('eyeWide'+side,lambda v,s=sgn:(0,0,.045*eye(v,s)))
  deform('browDown'+side,lambda v,s=sgn:(0,0,-.05*brow(v,s)))
  deform('browOuterUp'+side,lambda v,s=sgn:(0,0,.05*brow(v,s)*smoothstep(.05,.25,abs(v.x))))
  deform('cheekSquint'+side,lambda v,s=sgn:(0,-.015*mask(v,s*.18,-.04,.13,.11),.025*mask(v,s*.18,-.04,.13,.11)))
  deform('noseSneer'+side,lambda v,s=sgn:(0,-.018*mask(v,s*.055,.01,.08,.09),.02*mask(v,s*.055,.01,.08,.09)))
 deform('cheekPuff',lambda v:((.035 if v.x>0 else -.035)*mask(v,v.x and (.18 if v.x>0 else -.18),-.06,.14,.13),0,0))
 deform('jawLeft',lambda v:(-.04*lip(v),0,0))
 deform('jawRight',lambda v:(.04*lip(v),0,0))
 deform('chinRaise',lambda v:(0,0,.035*mask(v,0,-.23,.18,.11)))
def animate(arm):
 bpy.context.view_layer.objects.active=arm;arm.select_set(True)
 if not arm.animation_data:arm.animation_data_create()
 clips={
  'Idle_Breath':[(1,{'Chest':0,'Head':0}),(20,{'Chest':-.025,'Head':.025}),(40,{'Chest':0,'Head':0})],
  'Walk_Contact':[(1,{'L_Thigh':.42,'R_Thigh':-.42,'L_UpperArm':-.26,'R_UpperArm':.26}),(7,{'L_Thigh':0,'R_Thigh':0}),(13,{'L_Thigh':-.42,'R_Thigh':.42,'L_UpperArm':.26,'R_UpperArm':-.26}),(19,{'L_Thigh':0,'R_Thigh':0}),(25,{'L_Thigh':.42,'R_Thigh':-.42,'L_UpperArm':-.26,'R_UpperArm':.26})],
  'Run_PushOff':[(1,{'L_Thigh':.65,'R_Thigh':-.6,'Chest':.13}),(7,{'L_Thigh':-.6,'R_Thigh':.65,'Chest':.18}),(13,{'L_Thigh':.65,'R_Thigh':-.6,'Chest':.13})],
  'Attack_Anticipate_Impact':[(1,{'R_UpperArm':-.2,'Chest':0}),(6,{'R_UpperArm':1.2,'Chest':-.14}),(9,{'R_UpperArm':-1.1,'Chest':.24}),(15,{'R_UpperArm':-.45,'Chest':.08}),(24,{'R_UpperArm':-.2,'Chest':0})],
  'Dodge_Recover':[(1,{'Hips':0,'Chest':0}),(4,{'Hips':.24,'Chest':-.22}),(10,{'Hips':-.38,'Chest':.34}),(18,{'Hips':0,'Chest':0})],
  'Wave_Gesture':[(1,{'R_UpperArm':0,'R_Forearm':0}),(7,{'R_UpperArm':-1,'R_Forearm':-1}),(12,{'R_UpperArm':-.8,'R_Forearm':-.6}),(17,{'R_UpperArm':-1,'R_Forearm':-1}),(24,{'R_UpperArm':0,'R_Forearm':0})]
 }
 for name,frames in clips.items():
  arm.animation_data.action=None
  for frame,poses in frames:
   for bone,angle in poses.items():
    pb=arm.pose.bones.get(bone)
    if pb:pb.rotation_mode='XYZ';pb.rotation_euler.x=angle;pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=bone)
  action=arm.animation_data.action
  if action:
   action.name=name
   track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=False
 arm.animation_data.action=None
def create(genre):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 label,main,accent,hat,prop=GENRES[genre];skin=mat('Skin',(.77,.57,.43));cloth=mat('Fabric_'+genre,main);gold=mat('Accent_'+genre,accent);dark=mat('Hair',(.12,.1,.09))
 arm=rig()
 for name,pos,scale,m,bone in [
  ('Torso',(0,0,1.43),(.36,.23,.5),cloth,'Spine'),('Face',(0,-.015,2.22),(.29,.25,.34),skin,'Head'),
  ('Hair',(0,.09,2.43),(.30,.24,.15),dark,'Head'),('Belt',(0,-.01,1.1),(.33,.26,.09),gold,'Hips')]:
  obj=sphere(name,pos,scale,m)
  if name=='Face':make_facial_keys(obj)
  bind(obj,arm,bone)
 for side,sgn in [('L',-1),('R',1)]:
  deformable_limb(side+'_ArmSkin',(sgn*.54,0,1.4),(.16,.16,.42),cloth,arm,side+'_UpperArm',side+'_Forearm',1.42)
  deformable_limb(side+'_LegSkin',(sgn*.19,0,.53),(.18,.18,.51),cloth,arm,side+'_Thigh',side+'_Shin',.53)
  for name,pos,scale,m,bone in [
   ('Hand',(sgn*.66,0,1.07),(.11,.09,.13),skin,side+'_Hand'),
   ('Boot',(sgn*.19,-.09,.12),(.19,.3,.13),dark,side+'_Foot'),
   ('Eye',(sgn*.11,-.245,2.27),(.043,.025,.058),dark,'Head')]:
   obj=sphere(side+'_'+name,pos,scale,m);bind(obj,arm,bone)
  for idx,finger in enumerate(['Thumb','Index','Middle','Ring','Pinky']):
   names=[f'{side}_{finger}{joint}' for joint in range(1,4)]
   finger_skin(f'{side}_{finger}_Skinned',(sgn*(.61+(idx-2)*.025),0,.95),(.025,.025,.105),skin,arm,*names)
 if hat in ['cap','beret','helmet','hood']:
  obj=sphere('Headwear',(0,0,2.48),(.33,.29,.17),cloth);bind(obj,arm,'Head')
 elif hat=='topknot':
  obj=sphere('HairKnot',(0,.07,2.63),(.12,.12,.16),dark);bind(obj,arm,'Head')
 else:
  obj=sphere('LeafCrown',(0,0,2.53),(.34,.3,.1),gold);bind(obj,arm,'Head')
 if prop in ['staff','sword','pickaxe']:
  obj=cube('Handheld_'+prop,(.73,-.06,.91),(.07,.07,.82 if prop!='staff' else 1.2),gold);bind(obj,arm,'R_Hand')
 elif prop=='bag':
  obj=cube('TravelBag',(.42,-.04,1.12),(.3,.2,.36),gold);bind(obj,arm,'Spine')
 elif prop=='lantern':
  obj=cube('Lantern',(.7,-.08,.81),(.17,.17,.23),gold);bind(obj,arm,'R_Hand')
 else:
  obj=cube('Scanner',(.72,-.08,.94),(.22,.13,.12),gold);bind(obj,arm,'R_Hand')
 animate(arm)
 scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=40
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(genre+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/(genre+'.glb')),export_format='GLB',export_animations=True,export_morph=True)
 print('GENRE_CHARACTER_COMPLETE',genre)
selected=list(GENRES) if args.genre=='all' else [args.genre]
for genre in selected:
 if genre not in GENRES:raise ValueError('Unknown genre '+genre)
 create(genre)
