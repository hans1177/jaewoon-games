"""Actual Blender regression for procedural/baked action isolation.

Run: blender -b --python-exit-code 1 -P qa/shared-character-motion-action-isolation.py
No export, render, registry mutation, or Roblox runtime approval is performed.
"""
import ast
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'assets/roblox/world-ghosts/refine-humanoid-motion.py'
SOURCE = ROOT / 'assets/roblox/world-ghosts/native/mesh/bride.glb'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if args:
    SCRIPT = Path(args[0]).resolve()
if len(args) > 1:
    SOURCE = Path(args[1]).resolve()
tree = ast.parse(SCRIPT.read_text(encoding='utf-8'), filename=str(SCRIPT))
bake_index = next(i for i, node in enumerate(tree.body)
                  if isinstance(node, ast.For) and isinstance(node.target, ast.Tuple)
                  and [item.id for item in node.target.elts] == ['clip_name', 'duration'])

with tempfile.TemporaryDirectory(prefix='motion-action-isolation-') as output:
    old_argv = sys.argv
    sys.argv = [str(SCRIPT), '--', '--source', str(SOURCE), '--output', output]
    scope = {'__file__': str(SCRIPT), '__name__': '__motion_regression__'}
    try:
        # Run the real importer, rig setup, and pose/foot-solver functions. The
        # production bake loop below is also executed unchanged, with fewer frames.
        exec(compile(ast.Module(tree.body[:bake_index], type_ignores=[]), str(SCRIPT), 'exec'), scope)
    finally:
        sys.argv = old_argv
    bpy, rig = scope['bpy'], scope['RIG']
    animate, snapshot, distance = scope['animate'], scope['pose_snapshot'], scope['snapshot_distance']
    rig.animation_data_create()
    previous = bpy.data.actions.new('regression_previous_crouch')
    animate('hero_crouch_hq', 0.0)
    rig.animation_data.action = previous
    for bone in rig.pose.bones:
        if bone.name != 'Root':
            bone.keyframe_insert('rotation_euler', frame=0)
            if bone.name in ('Hips', 'FootL', 'FootR'):
                bone.keyframe_insert('location', frame=0)
    # The first walk evaluation used to be overwritten by the attached crouch
    # Action inside view_layer.update(); a second evaluation falsely appeared fine.
    loops = []
    for _ in range(3):
        animate('hero_walk_hq', 0.0)
        start = snapshot()
        animate('hero_walk_hq', 1.0)
        end = snapshot()
        measured = distance(start, end)
        loops.append(measured)
        assert measured['rotationMaxRad'] <= scope['QA_THRESHOLDS']['loopRotationMaxRad'], measured
        assert measured['locationMax'] <= scope['QA_THRESHOLDS']['loopLocationMax'], measured
        assert rig.animation_data.action is None, 'PROCEDURAL_POSE_RETAINS_ACTIVE_ACTION'

    # Four exact keyed frames in two distinct actions exercise the actual bake
    # ordering and transition from one action to the next without a full export.
    scope['CLIPS'] = {'hero_walk_hq': 0.1, 'hero_crouch_hq': 0.1}
    exec(compile(ast.Module([tree.body[bake_index]], type_ignores=[]), str(SCRIPT), 'exec'), scope)
    baked_errors = []
    for name in scope['CLIPS']:
        action = bpy.data.actions[name]
        assert len(action.fcurves) > 0, 'BAKED_ACTION_HAS_NO_CHANNELS:' + name
        for frame in range(4):
            animate(name, frame / 3)
            expected = snapshot()
            rig.animation_data.action = action
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            measured = distance(expected, snapshot())
            baked_errors.append(measured)
            assert measured['rotationMaxRad'] < 1e-5, (name, frame, measured)
            assert measured['locationMax'] < 1e-5, (name, frame, measured)
    print('MOTION_ACTION_ISOLATION=PASS:' + json.dumps({
        'loops': loops, 'bakedFrames': len(baked_errors),
        'maxBakedRotationError': max(row['rotationMaxRad'] for row in baked_errors),
        'maxBakedLocationError': max(row['locationMax'] for row in baked_errors),
        'blenderVersion': bpy.app.version_string, 'runtimeVerified': False,
    }, sort_keys=True), flush=True)

