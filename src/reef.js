import * as THREE from 'three';
import { REEFS } from './simulation.js';
import { applyCurrent } from './current.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function batchMeshes(root,excluded=[],includeTransparent=false){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
  root.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material)||(!includeTransparent&&o.material.transparent)||o.material.map)return;
    for(let p=o;p;p=p.parent)if(excluded.includes(p))return;
    let geometry=o.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
    if(geometry.index){const old=geometry;geometry=geometry.toNonIndexed();old.dispose();}
    for(const key of Object.keys(geometry.attributes))if(!['position','normal','color','uv'].includes(key))geometry.deleteAttribute(key);
    if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
    const key=o.material.uuid+(geometry.attributes.color?'color':'plain');
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({o,geometry});
  });
  for(const items of buckets.values()){
    if(items.length>1){const combined=mergeGeometries(items.map(i=>i.geometry));const m=new THREE.Mesh(combined,items[0].o.material);m.castShadow=true;m.receiveShadow=true;root.add(m);for(const {o}of items)o.removeFromParent();}
    for(const {geometry}of items)geometry.dispose();
  }
}

export function createReef(scene){
  let seed=415;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const clock={value:0},plants=[],materials=new Map();
  const causticGLSL=`
    uniform float reefTime;
    varying vec3 reefWorld;
    float reefCaustic(vec2 p){
      p+=.34*vec2(sin(p.y*1.5+reefTime*.23),cos(p.x*1.4-reefTime*.19));
      float a=sin(p.x*3.5+p.y*.8+reefTime*.18);
      float b=sin(p.y*3.8-p.x*.6-reefTime*.21);
      float c=sin((p.x+p.y)*2.2+reefTime*.14);
      float edge=abs(a+b+c*.55);
      return exp(-edge*edge*65.0);
    }
  `;
  function caustics(material,strength=.18){material.onBeforeCompile=shader=>{
    shader.uniforms.reefTime=clock;shader.vertexShader='varying vec3 reefWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nreefWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=causticGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat lightNet=reefCaustic(reefWorld.xz*.72+vec2(sin(reefTime*.12)*.4,reefTime*.025));\ndiffuseColor.rgb*=1.0+lightNet*${strength.toFixed(2)};`);
  };material.customProgramCacheKey=()=>`reef-caustic-${strength}`;return material;}
  const mat=color=>{if(!materials.has(color))materials.set(color,caustics(new THREE.MeshStandardMaterial({color,roughness:.72}),.12));return materials.get(color);};
  function mesh(geo,material,pos=[0,0,0],scale=[1,1,1],parent=scene){const o=new THREE.Mesh(geo,material);o.position.set(...pos);o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const sphere=new THREE.SphereGeometry(1,12,8);
  function tube(points,r,material,parent=scene,radial=6){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(4,points.length*2),r,radial,false),material,undefined,undefined,parent);}
  // Warm sand, fine granular bump, and a live projected caustic network.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.fillStyle='#b9aa7d';ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<115000;i++){const n=rand();ctx.fillStyle=n>.5?'rgba(249,237,185,.2)':'rgba(83,91,69,.16)';const r=.4+rand()*1.3;ctx.fillRect(rand()*1024,rand()*1024,r,r);}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,5);texture.colorSpace=THREE.SRGBColorSpace;
  const floorGeo=new THREE.PlaneGeometry(48,36,140,110),p=floorGeo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.08*Math.sin(x*.6)*Math.cos(y*.45)+.028*Math.sin(x*3+y*.6));}floorGeo.computeVertexNormals();
  const floorMat=caustics(new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.06,roughness:.92}),.25);
  const floor=mesh(floorGeo,floorMat);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  // Aquarium panes and silicone seams, with a clearly visible waterline.
  const glass=new THREE.MeshPhysicalMaterial({color:'#117f8b',transparent:true,opacity:.13,roughness:.2,metalness:.15,side:THREE.DoubleSide,depthWrite:false});
  mesh(new THREE.PlaneGeometry(48,21),glass,[0,10.5,-18]);
  for(const x of [-24,24])mesh(new THREE.PlaneGeometry(36,21),glass,[x,10.5,0]).rotation.y=Math.PI/2;
  for(const x of [-24,24])for(const z of [-18,18])mesh(new THREE.BoxGeometry(.07,21,.07),mat('#153e48'),[x,10.5,z]);
  for(const y of [.15,21]){
    mesh(new THREE.BoxGeometry(48,.10,.10),mat('#629d99'),[0,y,-18]);
    for(const x of [-24,24])mesh(new THREE.BoxGeometry(.10,.10,36),mat('#629d99'),[x,y,0]);
  }
  const water=new THREE.ShaderMaterial({uniforms:{time:clock},side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:'varying vec2 waterUV;void main(){waterUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float time;varying vec2 waterUV;void main(){vec2 p=waterUV*vec2(38.,29.);float w=sin(p.x*1.2+sin(p.y+time*.3))*sin(p.y*.7+cos(p.x+time*.2));float glint=pow(max(0.,w),12.);vec3 col=mix(vec3(.15,.48,.47),vec3(.77,.89,.70),glint*.65);gl_FragColor=vec4(col,.73);}`});
  mesh(new THREE.PlaneGeometry(48,36),water,[0,21,0]).rotation.x=Math.PI/2;
  // A few soft shafts: gradient alpha, no hard solid cones.
  const rayCanvas=document.createElement('canvas');rayCanvas.width=64;rayCanvas.height=128;const rc=rayCanvas.getContext('2d');const grad=rc.createLinearGradient(0,0,64,0);grad.addColorStop(0,'black');grad.addColorStop(.5,'white');grad.addColorStop(1,'black');rc.fillStyle=grad;rc.fillRect(0,0,64,128);
  const rayMat=new THREE.MeshBasicMaterial({color:'#cbf9da',alphaMap:new THREE.CanvasTexture(rayCanvas),transparent:true,opacity:.025,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<5;i++){const ray=mesh(new THREE.PlaneGeometry(3,30),rayMat,[-18+i*9,12,-10+(i%2)*7]);ray.rotation.z=-.20;ray.castShadow=false;}
  // Irregular stratified rocks with vertex-colored minerals and algae.
  const rockMaterial=caustics(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),.2);
  function rock(x,z,size){
    const geo=mergeVertices(new THREE.IcosahedronGeometry(1,3).deleteAttribute('normal').deleteAttribute('uv')),pos=geo.attributes.position,colors=[];const stone=new THREE.Color('#7d9189'),algae=new THREE.Color('#648b72'),pale=new THREE.Color('#a3ab94');
    for(let i=0;i<pos.count;i++){
      const vx=pos.getX(i),vy=pos.getY(i),vz=pos.getZ(i);const n=1+.08*Math.sin(vx*4+vz*5)*Math.cos(vy*6)+.035*Math.sin(vz*9);
      pos.setXYZ(i,vx*n,vy*n,vz*n);const c=stone.clone().lerp(vy>.2?algae:pale,.25+.3*Math.sin(vx*4+vy*7+vz*2)**2);colors.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const o=mesh(geo,rockMaterial,[x,size*.53,z],[size,size*.65,size*.8]);o.rotation.y=rand()*6;
  }
  function branchingCoral(x,z,h,color){const group=new THREE.Group();group.position.set(x,.06,z);scene.add(group);const material=mat(color),tips=mat('#f4c8b0');
    function grow(start,dir,length,r,depth){const end=start.map((v,k)=>v+dir[k]*length),mid=start.map((v,k)=>(v+end[k])*.5+(k===1?0:(rand()-.5)*.12));tube([start,mid,end],r,material,group);
      if(depth===0){mesh(sphere,tips,end,[r*.8,r*.9,r*.8],group);return;}
      for(let j=0;j<3;j++){const a=rand()*Math.PI*2;const next=new THREE.Vector3(dir[0]*.35+Math.cos(a)*.45,.65+rand()*.5,dir[2]*.35+Math.sin(a)*.45).normalize();grow(end,next.toArray(),length*(.56+rand()*.1),r*.61,depth-1);}
    }
    for(let i=0;i<4;i++)grow([(rand()-.5)*.4,0,(rand()-.5)*.4],[(rand()-.5)*.35,1,(rand()-.5)*.35],h*.37,.105,3);
    plants.push({object:group,height:h,amplitude:.16});
  }
  function seaFan(x,z,size,color){const g=new THREE.Group();g.position.set(x,.03,z);g.rotation.y=rand()*1.5-.75;g.scale.setScalar(size);scene.add(g);
    const shape=new THREE.Shape();shape.moveTo(-.10,.2);
    for(let i=0;i<=44;i++){const a=-1.16+i/44*2.32,r=2.4+.07*Math.sin(i*2.1);shape.lineTo(Math.sin(a)*r,.2+Math.cos(a)*r*1.12);}shape.lineTo(.10,.2);shape.closePath();
    for(let y=.7;y<2.65;y+=.28)for(let x=-1.9;x<2;x+=.28){const xx=x+((Math.round(y/.28)%2)*.12);if(Math.hypot(xx,(y-.2)/1.12)<2.2&&Math.abs(Math.atan2(xx,y-.2))<1.02){const hole=new THREE.Path();hole.absellipse(xx,y,.070+rand()*.022,.095+rand()*.016,0,Math.PI*2,true,rand()*.5);shape.holes.push(hole);}}
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1,curveSegments:5});mesh(geo,mat(color),undefined,undefined,g);
    tube([[0,0,0],[0,.7,0],[.05,1.7,0],[.2,2.5,0]],.03,mat('#c77c99'),g);
    for(const side of [-1,1])for(let i=0;i<4;i++)tube([[0,.25+i*.25,.06],[side*.45,.8+i*.25,.06],[side*(1+i*.2),1.4+i*.25,.06]],.014,mat('#d997a9'),g);
    rand(); // Preserve the seeded layout across visual revisions.
    plants.push({object:g,height:2.9,amplitude:.24});
  }
  function sponge(x,z,color){const group=new THREE.Group();group.position.set(x,.03,z);scene.add(group);for(let n=0;n<7;n++){
    const height=.6+rand()*1.1,radius=.17+rand()*.13,verts=[],faces=[],N=18;const cx=(rand()-.5)*1.25,cz=(rand()-.5)*1.25;
    const rings=[[0,radius*.8],[height*.3,radius*.94],[height*.7,radius],[height,radius*1.12],[height+.018,radius*.85],[height*.72,radius*.71],[height*.25,radius*.3]];
    for(const [y,r]of rings)for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const rr=r*(1+.035*Math.sin(i*2.2+n));verts.push(cx+Math.cos(a)*rr+y*.08,y,cz+Math.sin(a)*rr);}
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N;faces.push(a,b,b+N,a,b+N,a+N);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(faces);geo.computeVertexNormals();mesh(geo,mat(color),undefined,undefined,group);
    const cap=mesh(new THREE.CircleGeometry(radius*.4,16),mat('#665436'),[cx+height*.02,height*.23,cz],undefined,group);cap.rotation.x=-Math.PI/2;
  }}
  function plateCoral(x,z,color){const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);for(let layer=0;layer<5;layer++){
    const geo=new THREE.CircleGeometry(.55+layer*.12,48,0,Math.PI*2),p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),a=Math.atan2(py,px),r=Math.hypot(px,py);p.setXYZ(i,px*(1+.10*Math.sin(a*7)),py*(1+.12*Math.sin(a*7)),r*.10+Math.sin(a*8)*r*.08);}geo.computeVertexNormals();
    const material=mat(color);material.side=THREE.DoubleSide;const o=mesh(geo,material,[(rand()-.5)*.55,.18+layer*.24,(rand()-.5)*.55],undefined,group);o.rotation.x=-Math.PI/2+.15;o.rotation.z=layer*.7;
  }}
  function kelp(x,z,h){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const material=mat(rand()>.5?'#6b9e6b':'#87ad79');
    for(let stem=0;stem<3;stem++){
      const bend=(rand()-.5)*.6,ox=(rand()-.5)*.5,oz=(rand()-.5)*.5,H=h*(.65+rand()*.35);
      tube([[ox,0,oz],[ox+bend*.3,H*.4,oz],[ox+bend,H,oz+.15]],.017,mat('#739970'),g,4);
      for(let i=1;i<11;i++){
        const y=i/11*H,side=i%2?1:-1,vs=[],fs=[];
        for(let j=0;j<=8;j++){const t=j/8,w=Math.sin(t*Math.PI)*.15;for(const k of [-1,1])vs.push(ox+bend*y/H+side*t*.47,y+t*.20,oz+.1*y/H+k*w+Math.sin(t*3)*.06);}
        for(let j=0;j<8;j++){const a=j*2;fs.push(a,a+1,a+3,a,a+3,a+2);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(fs);geo.computeVertexNormals();material.side=THREE.DoubleSide;mesh(geo,material,undefined,undefined,g);
      }
    }rand();
    plants.push({object:g,height:h,amplitude:h*.105});
  }
  function fingerCoral(x,z,size){
    const group=new THREE.Group();group.position.set(x,.04,z);group.scale.setScalar(size);scene.add(group);
    const body=mat('#67aaa7'),tip=mat('#96c6b7');
    for(let i=0;i<12;i++){
      const a=i*2.4,r=.16+rand()*.65,h=.45+rand()*.95,cx=Math.cos(a)*r,cz=Math.sin(a)*r;
      tube([[cx*.5,0,cz*.5],[cx,h*.5,cz],[cx*1.2,h,cz*1.2]],.13,body,group,8);
      mesh(sphere,tip,[cx*1.2,h,cz*1.2],[.135,.18,.135],group);
    }
    plants.push({object:group,height:1.5,amplitude:.075});
  }
  // A pearly open clam provides a small foreground discovery.
  function clam(x,z){
    const group=new THREE.Group();group.position.set(x,.10,z);group.rotation.y=-.5;scene.add(group);
    const shellMat=mat('#d7d9c3');shellMat.side=THREE.DoubleSide;
    function half(parent,scale){
      const vs=[],indices=[],rays=48,rows=12;
      for(let r=0;r<=rows;r++)for(let i=0;i<=rays;i++){
        const t=r/rows,a=i/rays*Math.PI;
        vs.push(Math.cos(a)*t*1.05*scale,Math.sin(t*Math.PI)*.20+Math.cos(a*13)*t*.025,Math.sin(a)*t*1.45*scale);
      }
      for(let r=0;r<rows;r++)for(let i=0;i<rays;i++){const a=r*(rays+1)+i;indices.push(a,a+1,a+rays+2,a,a+rays+2,a+rays+1);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,shellMat,undefined,undefined,parent);
      const rim=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI;rim.push([Math.cos(a)*1.05*scale,.025*Math.cos(a*13),Math.sin(a)*1.45*scale]);}tube(rim,.034,mat('#b69f74'),parent,6);
      for(let i=1;i<13;i++){const a=i/13*Math.PI;const points=[];for(let j=0;j<=8;j++){const t=j/8;points.push([Math.cos(a)*t*1.05*scale,Math.sin(t*Math.PI)*.20+.025,Math.sin(a)*t*1.45*scale]);}tube(points,.012,mat('#edefd9'),parent,4);}
    }
    half(group,1);const lid=new THREE.Group();lid.rotation.x=-.66;group.add(lid);half(lid,.98);
    mesh(new THREE.SphereGeometry(.18,24,16),new THREE.MeshPhysicalMaterial({color:'#f3e8dd',metalness:.18,roughness:.20,clearcoat:1}),[0,.2,.65],undefined,group);
  }
  clam(4.5,7.3);clam(-11,-1);
  for(const [index,[x,z,s]]of REEFS.entries()){
    rock(x,z,s);rock(x+s*.7,z+1,s*.65);rock(x-1,z+s*.6,s*.55);
    branchingCoral(x+s*.65,z+s*.86,3.1+rand(),['#e8909c','#d67bb2','#deb687'][index%3]);
    sponge(x-s*.65,z+s*.55,index%2?'#c5a368':'#c49974');
    if(index%2===0)seaFan(x+s*.3,z+s*1.05,.60+rand()*.25,index%3?'#be6190':'#a75b87');
    fingerCoral(x-s*.30,z+s*1.05,.7+rand()*.35);
    plateCoral(x-s*.85,z+s*.85,'#a68ab9');
    for(let i=0;i<3;i++)kelp(x+(rand()-.5)*s*2.2,z-s*.4+rand()*s*.5,4.2+rand()*3.4);
  }
  // Low seagrass adds scale and makes open sand feel alive. Batched ribbon meshes.
  const grassMat=mat('#4d9680');grassMat.side=THREE.DoubleSide;
  const grassVerts=[],grassIndices=[];
  for(let tuft=0;tuft<380;tuft++){
    const x=(rand()-.5)*45,z=(rand()-.5)*33;
    if(REEFS.some(([rx,rz,r])=>Math.hypot(x-rx,(z-rz)/.8)<r))continue;
    for(let leaf=0;leaf<5;leaf++){
      const a=rand()*Math.PI*2,h=.18+rand()*.65,bend=.12+rand()*.3,offset=grassVerts.length/3;
      for(let i=0;i<=4;i++){const t=i/4,width=.023*(1-t)+.001;for(const sign of [-1,1])grassVerts.push(x+Math.cos(a)*bend*t*t+Math.sin(a)*width*sign,t*h,z+Math.sin(a)*bend*t*t-Math.cos(a)*width*sign);}
      for(let i=0;i<4;i++){const k=offset+i*2;grassIndices.push(k,k+1,k+3,k,k+3,k+2);}
    }
  }
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grassVerts,3));grassGeo.setIndex(grassIndices);grassGeo.computeVertexNormals();const grass=mesh(grassGeo,grassMat);
  plants.push({object:grass,height:.83,amplitude:.20,spread:1});
  // Shells, rounded gravel, and five-armed sea stars.
  for(let i=0;i<150;i++){
    const x=(rand()-.5)*45,z=(rand()-.5)*33,r=.04+rand()*.11;mesh(sphere,mat(i%3?'#b7b6a1':'#ded2ad'),[x,r*.4,z],[r,r*.6,r*.8]);
  }
  for(let i=0;i<11;i++){
    const g=new THREE.Group();g.position.set((rand()-.5)*38,.06,(rand()-.5)*29);g.rotation.y=rand()*6;scene.add(g);
    for(let a=0;a<5;a++){const angle=a*Math.PI*2/5;tube([[0,.04,0],[Math.sin(angle)*.17,.06,Math.cos(angle)*.17],[Math.sin(angle)*.42,.015,Math.cos(angle)*.42]],.055,mat('#dba381'),g);}
    mesh(sphere,mat('#dba381'),[0,.04,0],[.17,.065,.17],g);
  }
  // Printed sanctuary lettering belongs to the tank wall, not the HUD.
  const signCanvas=document.createElement('canvas');signCanvas.width=2048;signCanvas.height=640;
  const sign=signCanvas.getContext('2d');sign.textAlign='center';sign.fillStyle='#b7dfd7';
  sign.font='italic 700 174px Arial, sans-serif';sign.fillText('SUNLIT SHOALS',1024,246);
  sign.font='italic 62px monospace';sign.fillText('01  /  AQUATIC SANCTUARY',1024,411);
  sign.strokeStyle='#95c8bd';sign.lineWidth=3;sign.beginPath();sign.moveTo(120,502);sign.lineTo(1928,502);sign.stroke();
  const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
  const signMesh=mesh(new THREE.PlaneGeometry(19,5.94),new THREE.MeshBasicMaterial({map:signTexture,transparent:true,opacity:.74,depthWrite:false,toneMapped:false}),[6,12,-17.86]);signMesh.castShadow=false;signMesh.renderOrder=2;
  for(const x of [-12,0,12])mesh(new THREE.BoxGeometry(.038,21,.04),mat('#154b51'),[x,10.5,-17.95]);
  // A few taller stems break up the wall without obscuring the painted title.
  kelp(-5,-15.6,8.2);kelp(18,-14.6,7.5);kelp(-18,1,8.8);
  batchMeshes(scene,plants.map(p=>p.object));
  for(const plant of plants){batchMeshes(plant.object);applyCurrent(plant.object,clock,plant);}
  const dustPositions=new Float32Array(650*3);for(let i=0;i<650;i++){dustPositions[i*3]=(rand()-.5)*48;dustPositions[i*3+1]=rand()*21;dustPositions[i*3+2]=(rand()-.5)*36;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#e2edbc',size:.035,transparent:true,opacity:.45,depthWrite:false}));scene.add(dust);
  return {update(t){clock.value=t;dust.rotation.y=Math.sin(t*.025)*.035;}};
}
