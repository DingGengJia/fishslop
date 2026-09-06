import * as THREE from 'three';
import {CITY_BOXES,CITY_CYLINDERS,CITY_DOMES} from './city-layout.js';
import { COLUMNS, TEMPLE_STEPS, GATE, DAIS } from './atlantis-layout.js';

// Static ruins share five materials and join the reef's existing geometry batches.
// No per-stone update loops, textures, or additional shadow-casting lights.
export function createAtlantis(scene,caustics){
  const root=new THREE.Group();root.name='Atlantis';scene.add(root);
  const stone=caustics(new THREE.MeshStandardMaterial({color:'#8cafa7',roughness:.92,vertexColors:true}),.3);
  const dark=new THREE.MeshStandardMaterial({color:'#325f65',roughness:.96});
  const bronze=caustics(new THREE.MeshStandardMaterial({color:'#92764d',metalness:.58,roughness:.53}),.15);
  const patina=new THREE.MeshStandardMaterial({color:'#398b85',roughness:.84});
  const glow=new THREE.MeshStandardMaterial({color:'#91fff0',emissive:'#31ceb9',emissiveIntensity:1.8,roughness:.4});
  let seed=804;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function weather(geo){
    const p=geo.attributes.position,colors=[];const base=new THREE.Color(),moss=new THREE.Color('#53877b');
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=(Math.sin(x*9.7+z*11.3)*Math.cos(y*8.1)+1)*.5;
      base.setRGB(.76+n*.24,.79+n*.21,.73+n*.27).lerp(moss,.11+.13*Math.sin(x*3+y*2+z*7)**2);colors.push(base.r,base.g,base.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
  }
  function add(geo,material,x,y,z,parent=root){if(material===stone)weather(geo);const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,x,y,z,material=stone,parent=root)=>add(new THREE.BoxGeometry(w,h,d,2,2,2),material,x,y,z,parent);
  const ring=(r,t,x,y,z,material=bronze,parent=root)=>add(new THREE.TorusGeometry(r,t,6,64),material,x,y,z,parent);
  function column(c){
    const g=new THREE.Group();g.position.set(c.x,c.base,c.z);root.add(g);
    box(1.45,.22,1.45,0,.11,0,stone,g);box(1.18,.16,1.18,0,.3,0,stone,g);
    const shaftHeight=c.height-.9,segments=64,geo=new THREE.CylinderGeometry(c.radius*.85,c.radius,shaftHeight,segments,12);
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),flute=1-.055*(.5+.5*Math.cos(a*16));
      p.setXYZ(i,x*flute,p.getY(i),z*flute);
    }
    geo.computeVertexNormals();add(geo,stone,0,.44+shaftHeight/2,0,g);
    for(const y of [.47,c.height-.43])add(new THREE.CylinderGeometry(c.radius*1.17,c.radius*1.17,.12,32),bronze,0,y,0,g);
    if(!c.broken){
      add(new THREE.CylinderGeometry(.65,.44,.34,8),stone,0,c.height-.23,0,g);
      box(1.42,.22,1.42,0,c.height,0,stone,g);
      for(const side of [-1,1]){const scroll=ring(.22,.065,side*.46,c.height-.16,.56,stone,g);scroll.scale.y=.85;}
    }else{
      const cap=add(new THREE.IcosahedronGeometry(.52,0),stone,0,c.height-.38,0,g);cap.scale.y=.32;
      const fallen=add(new THREE.CylinderGeometry(.42,.47,2.8,32,3),stone,c.x+1.4,.5,c.z+1.1);fallen.rotation.z=1.42;fallen.rotation.y=.35;
    }
  }
  for(const step of TEMPLE_STEPS)box(step.w,step.h,step.d,step.x,step.y,step.z);
  COLUMNS.forEach(column);
  // Segmented stone arch. Every wedge is solid stone; the center remains traversable.
  const {inner,outer,spring,base,z}=GATE;
  for(const side of [-1,1]){
    for(let row=0;row<8;row++)box(outer-inner-.025,spring/8-.025,.85,side*(inner+outer)/2,base+(row+.5)*spring/8,z);
    box(1.17,.21,1.16,side*(inner+outer)/2,base+spring-.06,z);
  }
  for(let i=0;i<17;i++){
    const a=i*Math.PI/17+.009,b=(i+1)*Math.PI/17-.009,s=new THREE.Shape();
    s.absarc(0,0,outer,a,b,false);s.lineTo(Math.cos(b)*inner,Math.sin(b)*inner);s.absarc(0,0,inner,b,a,true);s.closePath();
    add(new THREE.ExtrudeGeometry(s,{depth:.85,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,steps:1,curveSegments:3}),stone,0,base+spring,z-.425);
    if(i%2===0){const a=(i+.5)*Math.PI/17,m=box(.07,.24,.025,Math.cos(a)*(inner+.38),base+spring+Math.sin(a)*(inner+.38),z+.48,bronze);m.rotation.z=a-Math.PI/2;}
  }
  // Colonnade lintels, triglyph reliefs, broken pediment wings.
  for(const side of [-1,1]){
    box(1.8,.7,6.5,side*6.4,8.15,-12.75);
    box(2,.18,6.8,side*6.4,8.6,-12.75);
    for(let i=0;i<10;i++)box(.12,.32,.08,side*6.4-.65+i*.14,8.18,-9.46,bronze);
    const beam=box(3.6,.55,1.3,side*5,9.1,-12.5);beam.rotation.z=side*-.29;
    for(let i=0;i<3;i++)box(.12,.05,5.8,side*6.4-.5+i*.5,8.72,-12.75,bronze);
  }
  // A bronze armillary marks the inner sanctum, suspended above a carved dais.
  for(const {radius:r,height:h,y}of DAIS)add(new THREE.CylinderGeometry(r,r,h,64),stone,0,y,-14.6);
  for(const [r,y]of [[2.25,1.05],[1.7,1.46]])ring(r,.035,0,y,-14.6).rotation.x=Math.PI/2;
  const core=new THREE.Group();core.position.set(0,4.2,-14.6);root.add(core);
  ring(1.65,.085,0,0,0,bronze,core);ring(1.4,.052,0,0,0,bronze,core).rotation.y=1.05;
  const orbit=ring(1.8,.028,0,0,0,glow,core);orbit.rotation.x=1.1;
  const crystal=add(new THREE.OctahedronGeometry(.6,0),glow,0,0,0,core);crystal.scale.y=1.5;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const mark=box(.06,.17,.06,Math.sin(a)*1.64,Math.cos(a)*1.64,0,glow,core);mark.rotation.z=-a;}
  // Mosaic compass and processional paving, kept low so the swimming lane is clear.
  for(const r of [2.5,3.1,3.45])ring(r,.035,0,.13,-2.5,r===3.1?patina:bronze).rotation.x=Math.PI/2;
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,s=new THREE.Shape();s.moveTo(0,0);s.lineTo(-.2,.8);s.lineTo(0,i%2?2:2.8);s.lineTo(.2,.8);s.closePath();
    const m=add(new THREE.ShapeGeometry(s),i%2?patina:bronze,0,.14,-2.5);m.rotation.set(-Math.PI/2,0,a);
  }
  for(let z=-7;z<=12;z+=1.65)for(const x of [-1.2,0,1.2]){
    if(Math.hypot(x,z+2.5)<3.55)continue;
    const tile=box(1.1,.07,1.35,x,.075,z);tile.rotation.y=(rand()-.5)*.07;
  }
  // Open outer-city halls: doors are negative space between physical piers.
  for(const b of CITY_BOXES){
    box(b.w,b.h,b.d,b.x,b.y,b.z,b.part==='floor'?stone:dark);
    if(b.part==='pier'){
      box(b.w+.16,.13,b.d+.16,b.x,.53,b.z,bronze);
      box(b.w+.22,.18,b.d+.22,b.x,b.y+b.h/2-.12,b.z,stone);
    }
  }
  for(const c of CITY_CYLINDERS){
    add(new THREE.CylinderGeometry(c.radius,c.radius,c.height,c.part==='roof'?40:16),c.part==='roof'?dark:stone,c.x,c.base+c.height/2,c.z);
    if(c.part==='pier')add(new THREE.CylinderGeometry(c.radius+.08,c.radius+.08,.12,16),bronze,c.x,.52,c.z);
  }
  for(const c of CITY_DOMES)add(new THREE.SphereGeometry(c.width*.8,24,12,0,Math.PI*2,0,Math.PI/2),dark,c.x,c.height+.15,c.z);
  // Loose masonry gathers at the flanks rather than blocking the approach.
  for(let i=0;i<44;i++){
    const side=i%2?1:-1,x=side*(9+rand()*12),z=-16+rand()*31;
    const rubble=box(.35+rand()*.7,.2+rand()*.35,.45+rand()*.6,x,.2,z);rubble.rotation.set(rand()*.2,rand()*6,rand()*.15);
  }
  return {animatedObjects:[core],update(t){core.rotation.y=Math.sin(t*.12)*.14;crystal.rotation.y=t*.18;crystal.position.y=Math.sin(t*.9)*.12;}};
}
