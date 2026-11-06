# Preview only: run with Blender --background --python this-file. Not Roblox runtime evidence.
import bpy,json,math,os
from pathlib import Path
from mathutils import Vector
root=str(Path(__file__).resolve().parents[3])
manifest=json.load(open(root+'/assets/roblox/common-materials-v1/manifest.json'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1540;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.world.color=(.18,.18,.18)
scene.view_settings.view_transform='AgX'
for i,row in enumerate(manifest['materials']):
 x=(i%7-3)*2.5; z=(1-i//7)*3.2
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,radius=.96,location=(x,0,z))
 obj=bpy.context.object;obj.name=row['id']
 for p in obj.data.polygons:p.use_smooth=True
 mat=bpy.data.materials.new(row['id']);mat.use_nodes=True
 obj.data.materials.append(mat);nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
 for channel,record in row['maps'].items():
  texture=nodes.new('ShaderNodeTexImage');texture.image=bpy.data.images.load(os.path.join(root,record['path']))
  texture.image.colorspace_settings.name='sRGB'if channel=='color'else'Non-Color'
  if channel=='normal':
   normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=1;links.new(texture.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
  else:links.new(texture.outputs['Color'],bsdf.inputs[{'color':'Base Color','roughness':'Roughness','metalness':'Metallic'}[channel]])
 bpy.ops.object.text_add(location=(x,-.1,z-1.24),rotation=(math.pi/2,0,0))
 label=bpy.context.object;label.data.body=row['id'];label.data.align_x='CENTER';label.data.size=.25
 textmat=bpy.data.materials.get('Label')or bpy.data.materials.new('Label');textmat.diffuse_color=(.9,.92,.96,1);label.data.materials.append(textmat)
for name,loc,power,size in [('Key',(-6,-5,9),2500,8),('Fill',(7,-4,1),1600,7),('Top',(0,2,8),2200,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-25,.7));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,-.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=18;scene.camera=cam
scene.render.image_settings.file_format='PNG';scene.render.filepath=root+'/assets/roblox/common-materials-v1/preview-pbr-review.png'
bpy.ops.render.render(write_still=True)
