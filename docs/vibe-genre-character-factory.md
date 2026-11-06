# Genre character Blender authoring pipeline

Generate all ten editable characters with Blender 4.x:

```bash
blender --background --python tools/vibe_genre_character_factory.py -- --output-dir build/genre-heroes
```

Generate one genre:

```bash
blender --background --python tools/vibe_genre_character_factory.py -- --genre wuxia --output-dir build/genre-heroes
```

Each genre outputs a .blend source scene and a .glb for runtime. Available genres: storybook, illustration, wuxia, action, voxel, fantasy, horror, sciFi, cozy, platformer.

Edit the mesh in Blender Sculpt Mode, adjust the Face shape keys, refine the hand joints in Pose Mode, and edit six named animation actions in Dope Sheet and Graph Editor. GLB export is included.

**Quality boundary:** this generator produces original stylized placeholder characters with editable rigging and basic hand-authored animation curves. It does not create final high-end topology, fully skinned deformation, photoreal textures, professional motion-capture animation, or verified production-grade exports. Finger meshes currently use rigid bone parenting, not smooth skin weights. Test the generated files in Blender and the browser before shipping.
