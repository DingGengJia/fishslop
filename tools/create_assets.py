"""Original detailed aquarium assets. Rebuild with Blender in background mode."""
import bpy, math, os, random
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','models');os.makedirs(OUT,exist_ok=True)
random.seed(37)

def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,metallic=0,roughness=.4,emission=0,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    p.inputs['Coat Weight'].default_value=.35;p.inputs['Coat Roughness'].default_value=.2
    p.inputs['Alpha'].default_value=alpha
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    if alpha<1:m.surface_render_method='DITHERED'
    return m

def smooth(o):
    for p in o.data.polygons:p.use_smooth=True
    return o

def sphere(name,loc,scale,material,segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=20,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return smooth(o)

def cylinder(name,a,b,r,material,r2=None):
    d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material)
    bevel=o.modifiers.new('Machined edges','BEVEL');bevel.width=.025;bevel.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o

def torus(name,loc,major,minor,material,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=56,minor_segments=10,location=loc,rotation=rot)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);return smooth(o)

def surface(name,verts,faces,material,uv=None):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(material)
    if uv:
        layer=m.uv_layers.new(name='UVMap')
        for polygon in m.polygons:
            for li in polygon.loop_indices:layer.data[li].uv=uv[m.loops[li].vertex_index]
    return smooth(o)

def curve(name,coords,r,material,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2
    spline=c.splines.new('BEZIER');spline.bezier_points.add(len(coords)-1)
    for point,co in zip(spline.bezier_points,coords):point.co=co;point.handle_left_type=point.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    if parent:o.parent=parent
    return o

def empty(name,loc):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;return o

def export(name):
    # Curves are converted so their fine mechanical / fin details survive glTF export.
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(bpy.context.scene.objects):
        if o.type in ['CURVE','FONT']:
            bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,name+'.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',export_apply=True)

reset()
yellow=mat('Saffron enamel',(1,.60,.065),.42,.27)
ivory=mat('Ceramic white',(.91,.94,.82),.22,.3)
steel=mat('Brushed titanium',(.13,.21,.24),.82,.27)
dark=mat('Rubber seals',(.018,.035,.042),.05,.5)
brass=mat('Brass fittings',(.75,.43,.10),.8,.25)
glass=mat('Smoked ocean glass',(.013,.15,.19),.6,.12)
lamp=mat('Lamp phosphor',(.67,1,.96),.1,.16,2.2)
# Blender -Y is the nose; the runtime rotates the exported +Z nose toward -Z.
sphere('Pressure hull',(0,0,0),(.94,1.68,.88),yellow,48)
sphere('Belly fairing',(0,.03,-.39),(.84,1.44,.46),ivory)
sphere('Front glass dome',(0,-1.36,.05),(.70,.51,.62),glass,48)
torus('Front pressure ring',(0,-1.45,.05),.64,.065,ivory,(math.pi/2,0,0))
torus('Front rubber seal',(0,-1.46,.05),.565,.022,dark,(math.pi/2,0,0))
for y,r in [(.68,.80),(-.75,.80)]:
    seam=torus('Hull panel seam',(0,y,0),r,.013,brass,(math.pi/2,0,0));seam.scale.x=1.03
for s in [-1,1]:
    sphere('Observation window',(s*.91,-.22,.12),(.08,.35,.35),glass)
    torus('Window pressure ring',(s*.94,-.22,.12),.35,.045,ivory,(0,math.pi/2,0))
    torus('Window seal',(s*.953,-.22,.12),.30,.012,dark,(0,math.pi/2,0))
    for i in range(10):
        a=i*math.tau/10;sphere('Porthole bolt',(s*.985,-.22+math.cos(a)*.35,.12+math.sin(a)*.35),(.025,.025,.025),steel,12)
    sphere('Ballast tank',(s*.96,.4,-.5),(.22,.86,.24),yellow)
    for y in [-.15,.85]:
        collar=torus('Ballast strap',(s*.96,y,-.5),.225,.027,steel,(math.pi/2,0,0))
    cylinder('Thruster housing',(s*1.09,.45,-.31),(s*1.09,1.25,-.31),.25,steel)
    torus('Thruster light rim',(s*1.09,1.27,-.31),.20,.035,ivory,(math.pi/2,0,0))
    sphere('Thruster lens',(s*1.09,1.28,-.31),(.16,.035,.16),lamp)
    cylinder('Headlight barrel',(s*.70,-1.03,-.40),(s*.70,-1.55,-.40),.16,steel)
    sphere('Headlight lens',(s*.70,-1.58,-.40),(.12,.035,.12),lamp)
    plane=surface('Hydroplane',[(s*.65,.58,.02),(s*1.72,.95,-.06),(s*1.77,1.24,-.06),(s*.65,1.15,.03)],[(0,1,2,3)],ivory)
    sol=plane.modifiers.new('Foil thickness','SOLIDIFY');sol.thickness=.05;bev=plane.modifiers.new('Foil edges','BEVEL');bev.width=.045;bev.segments=3
    curve('Landing skid',[(s*.6,-1.2,-.72),(s*.69,-.9,-1.01),(s*.69,.9,-1.01),(s*.6,1.2,-.72)],.065,steel)
    curve('External pipe',[(s*.74,-.5,.48),(s*.81,.1,.57),(s*.68,.9,.42)],.035,ivory)
    for i in range(5):cylinder('Cooling vent',(s*.88,.38+i*.12,.15),(s*.94,.38+i*.12,.38),.021,dark)
sphere('Hatch base',(0,.03,.85),(.49,.57,.12),steel)
sphere('Hatch cover',(0,.03,.94),(.43,.5,.07),yellow)
torus('Hatch seam',(0,.03,.99),.37,.017,ivory)
for i in range(8):
    a=i*math.tau/8;sphere('Hatch fastener',(math.cos(a)*.39,.03+math.sin(a)*.39,1),(.025,.025,.014),steel,12)
curve('Hatch handle',[(-.16,.01,1.0),(-.16,.01,1.12),(.16,.01,1.12),(.16,.01,1)],.027,steel)
cylinder('Periscope',(0,.40,.9),(0,.40,1.65),.09,steel)
curve('Periscope elbow',[(0,.4,1.55),(0,.38,1.7),(0,.08,1.7)],.1,steel)
sphere('Periscope glass',(0,.015,1.7),(.065,.02,.065),glass)
cylinder('Radio aerial',(-.38,.60,.85),(-.38,.60,1.83),.012,steel)
sphere('Aerial tip',(-.38,.6,1.84),(.036,.036,.036),mat('Aerial amber',(1,.35,.05),0,.3,1))
cylinder('Propeller shaft',(0,1.35,0),(0,2.02,0),.13,steel)
torus('Propeller cage',(0,1.94,0),.73,.065,ivory,(math.pi/2,0,0))
for i in range(4):
    a=i*math.pi/2
    cylinder('Cage strut',(.3*math.cos(a),1.58,.3*math.sin(a)),(.71*math.cos(a),1.94,.71*math.sin(a)),.025,steel)
    blade=sphere('Propeller blade',(.33*math.cos(a),1.95,.33*math.sin(a)),(.36,.048,.12),ivory)
    blade.rotation_euler.y=-a;blade.rotation_euler.x=.2
sphere('Propeller hub',(0,2.02,0),(.17,.12,.17),brass)
# Stern identity plate and embossed warning stripes.
plate=sphere('Stern plate',(0,1.52,.40),(.27,.025,.1),steel)
for i in range(3):cylinder('Stern safety stripe',(-.14+i*.1,1.553,.36),(-.09+i*.1,1.553,.45),.016,yellow)
export('submarine-v2')

def fish_texture(name,base):
    w=h=512;image=bpy.data.images.new(name,width=w,height=h,alpha=True);pixels=[]
    cream=(.94,.89,.70)
    for y in range(h):
        v=y/(h-1)
        for x in range(w):
            u=x/(w-1);dorsal=math.cos(u*math.tau)
            belly=max(0,(-dorsal-.15)/.85)*.78
            stripe=.92+.08*math.cos(v*math.pi)
            # Offset rows of overlapping scale arcs, subtle enough to read as skin.
            row=int(v*32);sx=(u*40+(row%2)*.5)%1;sy=(v*32)%1
            arc=abs(math.sqrt((sx-.5)**2+((sy-.05)*.7)**2)-.48)
            scales=1-.14*math.exp(-arc*arc*1600) if .18<v<.85 else 1
            highlight=.035*math.sin(u*120+v*90)**2
            color=[((base[k]*(1-belly)+cream[k]*belly)*stripe*scales+highlight)*(.86+.14*(1-dorsal)*.5) for k in range(3)]
            pixels.extend([*color,1])
    image.pixels=pixels;image.pack();return image

def make_fish(name,base,fincolor,shape):
    reset()
    bodymat=mat('Pearlescent skin',base,.12,.31)
    node=bodymat.node_tree.nodes.new('ShaderNodeTexImage');node.image=fish_texture(name+' skin',base)
    bodymat.node_tree.links.new(node.outputs['Color'],bodymat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    finmat=mat('Fin membrane',fincolor,.03,.4,alpha=.82)
    rays=mat('Fin rays',tuple(min(1,c*1.15+.1) for c in fincolor),.03,.45)
    eye=mat('Wet pupil',(.005,.011,.017),.2,.12)
    iris=mat('Iris',(.22,.38,.34),.5,.22)
    white=mat('Eye rim',(.86,.87,.69),.1,.3)
    gill=mat('Gill line',tuple(c*.38 for c in base),0,.6)
    verts=[];uv=[];faces=[];rings=44;segments=56
    # Profile: closed nose, head, shoulder, taper, muscular caudal peduncle.
    profile=[(-1.04,.055,.075),(-.92,.20,.24),(-.70,.34,.41),(-.35,.42,.53),(0,.41,.54),(.35,.30,.40),(.65,.14,.21),(.86,.07,.12),(.92,.025,.04)]
    def profile_at(y):
        for i in range(len(profile)-1):
            a,b=profile[i],profile[i+1]
            if a[0]<=y<=b[0]:
                t=(y-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);return ((a[1]*(1-t)+b[1]*t)*shape[0],(a[2]*(1-t)+b[2]*t)*shape[1])
        return (.02,.02)
    for j in range(rings+1):
        v=j/rings;y=-1.04+1.96*v;rx,rz=profile_at(y)
        for i in range(segments+1):
            a=i/segments*math.tau;verts.append((rx*math.sin(a),y,rz*math.cos(a)));uv.append((i/segments,v))
    for j in range(rings):
        for i in range(segments):
            a=j*(segments+1)+i;faces.append((a,a+1,a+segments+2,a+segments+1))
    surface('Body',verts,faces,bodymat,uv)
    for s in [-1,1]:
        sphere('Eye sclera',(s*.247*shape[0],-.78,.16),(.105,.13,.13),white)
        sphere('Iris',(s*.317*shape[0],-.815,.17),(.07,.087,.091),iris)
        sphere('Pupil',(s*.357*shape[0],-.835,.18),(.036,.055,.061),eye)
        sphere('Catchlight',(s*.382*shape[0],-.86,.209),(.010,.018,.018),mat('Sparkle',(1,1,1),0,.1,.3),16)
        curve('Gill cover',[(s*.26*shape[0],-.60,.31),(s*.35*shape[0],-.48,.16),(s*.38*shape[0],-.44,-.05),(s*.29*shape[0],-.46,-.27)],.009,gill)
    lips=torus('Mouth rim',(0,-1.048,-.01),.058,.014,finmat,(math.pi/2,0,0));lips.scale.z=.75
    sphere('Mouth',(0,-1.049,-.01),(.043,.008,.035),gill,20)
    # Every fin is a curved membrane with individually modeled supporting rays.
    def fan(pivot_name,loc,point_fn,ray_count=19):
        pivot=empty(pivot_name,loc);vs=[];fs=[];N=32;M=8
        for j in range(M+1):
            for i in range(N+1):vs.append(point_fn(i/N,j/M))
        for j in range(M):
            for i in range(N):
                a=j*(N+1)+i;fs.append((a,a+1,a+N+2,a+N+1))
        membrane=surface(pivot_name+' membrane',vs,fs,finmat);membrane.parent=pivot
        for i in range(ray_count):curve(pivot_name+' ray',[point_fn(i/(ray_count-1),s) for s in [.06,.35,.65,.98]],.0035,rays,pivot)
        return pivot
    def tail(t,s):
        angle=(t-.5)*2;edge=.88+.18*abs(angle)+.035*math.cos(t*math.pi*12)
        return (.07*math.sin(s*math.pi)*math.sin(t*math.pi*2),s*edge,s*angle*.75*shape[2])
    fan('TailPivot',(0,.80,0),tail,23)
    fan('DorsalPivot',(0,-.48,.36*shape[1]),lambda t,s:(.018*math.sin(t*math.pi),t*1.10,s*(.12+math.sin(t*math.pi)**.7*.43)),19)
    for side in [-1,1]:
        fan('PectoralPivot'+str(side),(side*.31*shape[0],-.38,-.12),lambda t,s,side=side:(side*s*(.22+.32*math.sin(t*math.pi)),s*(t*.70+.12),-s*(.06+.19*math.sin(t*math.pi))),12)
        fan('VentralPivot'+str(side),(side*.12,.18,-.35*shape[1]),lambda t,s,side=side:(side*s*.16,s*t*.36,-s*(.16+.20*math.sin(t*math.pi))),9)
    export(name)

make_fish('goldfish-v2',(1,.43,.065),(1,.71,.30),(1,1,1.15))
make_fish('azure-v2',(.07,.64,.80),(.30,.84,.88),(.88,1.15,.88))
make_fish('orchid-v2',(.60,.19,.66),(.81,.46,.79),(.82,.85,1.05))
print('Detailed submarine + 3 distinct fish assets exported.')
