import sys, io, trimesh
scene = trimesh.load(io.BytesIO(sys.stdin.buffer.read()), file_type='obj', force='scene')
sys.stdout.buffer.write(scene.export(file_type='glb'))
