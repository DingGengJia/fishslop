"""Build lightweight runtime copies; keep the original Blender/GLB sources intact."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/models'
for name in ['submarine','goldfish','azure','orchid']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/f'{name}-v2.glb'))
    before=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH': continue
        bpy.context.view_layer.objects.active=o
        if len(o.data.polygons)>120:
            mod=o.modifiers.new('Runtime simplification','DECIMATE');mod.ratio=.22 if name=='submarine' else .14
            bpy.ops.object.modifier_apply(modifier=mod.name)
        for face in o.data.polygons:face.use_smooth=True
    bpy.ops.export_scene.gltf(filepath=str(root/f'{name}-lite.glb'),export_format='GLB',export_yup=True)
    after=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
    print(f'OPTIMIZED {name}: {before} -> {after} triangles')
