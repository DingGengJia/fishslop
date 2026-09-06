import * as THREE from 'three';

// A closed-mouth humpback, +Z forward. All landmarks use the same hull surface.
const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const sections=[
  [-1.72,.025,.040,0],[-1.40,.075,.095,0],[-1.08,.14,.18,.018],
  [-.72,.25,.29,.027],[-.30,.36,.38,.020],[.15,.43,.41,0],
  [.55,.44,.35,.015],[.85,.405,.255,.022],[1.14,.31,.17,.025],
  [1.40,.18,.09,.020],[1.56,.012,.035,.015],
];
function section(z){
  let i=0;while(i<sections.length-2&&z>sections[i+1][0])i++;
  const a=sections[Math.max(0,i-1)],b=sections[i],c=sections[i+1],d=sections[Math.min(sections.length-1,i+2)],t=clamp((z-b[0])/(c[0]-b[0]),0,1);
  return [1,2,3].map(k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t));
}
export function whaleSurface(z,angle,offset=0){
  const [rx,ry,cy]=section(z);
  return new THREE.Vector3((Math.max(.008,rx)+offset)*Math.cos(angle),cy+(Math.max(.008,ry)+offset)*Math.sin(angle),z);
}
// Periodic, deterministic skin variation, avoiding visible UV seams.
function grain(z,a){return Math.sin(z*18+Math.sin(a*9)*2)*.4+Math.sin(z*41-a*13)*.22+Math.sin(z*93+Math.cos(a*21))*.12;}
function textures(){
  const W=768,H=384,color=new Uint8Array(W*H*4),bump=new Uint8Array(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const z=-1.72+x/(W-1)*3.28,a=y/(H-1)*Math.PI*2,v=Math.sin(a),n=grain(z,a);
    // Irregular cream ventral patch fades at the flanks, never across the back.
    const pale=(1-smooth(-.80,-.35,v+n*.055))*smooth(-.55,.15,z)*(1-smooth(1.38,1.56,z));
    const front=smooth(-.26,.05,z)*(1-smooth(1.35,1.52,z));
    const ventral=1-smooth(-.25,-.05,v);
    const groove=Math.pow(.5+.5*Math.cos((a+Math.PI/2)*44),22)*front*ventral;
    const scar=Math.pow(Math.max(0,Math.sin(z*89+a*7)),80)*smooth(.30,.7,n)*.12;
    const mottling=n*3.5,base=[38,51,58],cream=[176,180,166],i=(y*W+x)*4;
    for(let c=0;c<3;c++)color[i+c]=clamp(base[c]*(1-pale)+cream[c]*pale+mottling-groove*(12+18*pale)+scar*100,0,255);
    color[i+3]=255;
    const h=clamp(140+n*2-groove*55,0,255);bump.set([h,h,h,255],i);
  }
  const make=(data,srgb)=>{const t=new THREE.DataTexture(data,W,H);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
  return {map:make(color,true),bumpMap:make(bump,false)};
}
function surfaceGeometry(rows,columns,point){
  const positions=[],uv=[],indices=[];
  for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
    const p=point(i/rows,j/columns);positions.push(p.x,p.y,p.z);uv.push(i/rows,j/columns);
  }
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function createWhale(){
  const root=new THREE.Group();root.name='Humpback';
  const skin=new THREE.MeshStandardMaterial({color:'#ffffff',...textures(),bumpScale:.003,roughness:.39,metalness:.025});skin.name='Humpback textured skin';
  const finSkin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42});finSkin.userData.preserveSurface=true;
  const dark=new THREE.MeshStandardMaterial({color:'#1e3037',roughness:.48}),lip=new THREE.MeshStandardMaterial({color:'#33444a',roughness:.46});
  const eyeMat=new THREE.MeshStandardMaterial({color:'#071315',roughness:.17});eyeMat.userData.preserveSurface=true;
  const smallSphere=new THREE.SphereGeometry(1,8,5),eyeSphere=new THREE.SphereGeometry(1,12,7);
  function add(parent,geo,mat,name){const m=new THREE.Mesh(geo,mat);m.name=name||'';parent.add(m);return m;}
  function ellipsoid(parent,p,scale,mat,name){const m=add(parent,name?.startsWith('Eye')?eyeSphere:smallSphere,mat,name);m.position.copy(p);m.scale.set(...scale);return m;}
  function stroke(parent,points,r,mat,name){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,r,4,false),mat,name);}
  const bodyGeometry=surfaceGeometry(64,40,(u,v)=>whaleSurface(-1.72+3.28*u,v*Math.PI*2));
  const positions=Array.from(bodyGeometry.attributes.position.array),uvs=Array.from(bodyGeometry.attributes.uv.array),indices=Array.from(bodyGeometry.index.array);
  for(const end of [0,1]){const z=end?1.56:-1.72,center=positions.length/3,start=end?64*41:0;positions.push(0,section(z)[2],z);uvs.push(end,.5);for(let j=0;j<40;j++)indices.push(center,start+j+(end?0:1),start+j+(end?1:0));}
  bodyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));bodyGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));bodyGeometry.setIndex(indices);bodyGeometry.deleteAttribute('normal');bodyGeometry.computeVertexNormals();
  const body=add(root,bodyGeometry,skin,'WhaleBody');
  // Colors on continuous, lenticular fin surfaces replace thick extruded polygons.
  function wing(parent,side,span,chord,sweep,isFluke){
    const geo=surfaceGeometry(20,12,(u,v)=>{
      const a=v*Math.PI*2,width=isFluke?(.105*(1-u)+.13*Math.sin(Math.PI*u)):(chord*Math.pow(Math.sin(Math.PI*u),.64)*(1-.3*u)+.012*(1-u));
      const scallop=isFluke?.014*Math.sin(u*29)*Math.sin(Math.PI*u):.012*Math.sin(u*35)*Math.sin(Math.PI*u);
      return new THREE.Vector3(side*span*u,Math.sin(a)*(.006+.035*(1-u))*Math.pow(Math.sin(Math.PI*u),.4)-.09*u*u,(isFluke?-.075+sweep*u+.055*Math.sin(Math.PI*u):sweep*u)+Math.cos(a)*(width+scallop));
    });
    if(side===1){const ix=geo.index.array;for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];geo.computeVertexNormals();}
    const pos=geo.attributes.position,colors=[];
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),u=Math.abs(x)/span;
      const pale=isFluke?(y<-.09*u*u&&u>.12):(u>.11+.02*Math.sin(z*45)&&u<.99);
      const c=new THREE.Color(pale?'#c6cec5':'#344951');c.multiplyScalar(1+.055*Math.sin(x*37+z*24));colors.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return add(parent,geo,finSkin,isFluke?'Fluke':'Long pectoral flipper');
  }
  for(const side of [-1,1]){
    // The commissure and small eye lie behind the broad rostrum, ahead of the flipper root.
    const eyeAngle=side===1?-.015:Math.PI+.015,eyePos=whaleSurface(.68,eyeAngle,.004);
    ellipsoid(root,eyePos,[.010,.021,.031],lip,'EyeSocket'+side);
    ellipsoid(root,eyePos.clone().add(new THREE.Vector3(side*.007,0,.002)),[.008,.014,.022],eyeMat,'Eye'+side);
    const seam=[];for(let i=0;i<=24;i++){const t=i/24,z=1.53-t*.93,a=-.43+t*.30;seam.push(whaleSurface(z,side===1?a:Math.PI-a,.003));}
    stroke(root,seam,.0045,dark,'MouthSeam'+side);
    const arm=new THREE.Group();arm.name='PectoralPivot'+side;arm.position.copy(whaleSurface(.39,side===1?-.43:Math.PI+.43,-.012));root.add(arm);
    wing(arm,side,1.15,.13,-.30,false);
    // Tubercles follow the upper rostrum and jaw surface; no floating beads.
    for(let j=0;j<5;j++){
      const z=1.39-j*.135,a=side===1?.48:Math.PI-.48;
      ellipsoid(root,whaleSurface(z,a,.003),[.022,.018,.025],lip,'RostralTubercle');
      const jawAngle=side===1?-.62:Math.PI+.62;
      ellipsoid(root,whaleSurface(z,jawAngle,.002),[.018,.016,.022],lip,'JawTubercle');
    }
  }
  for(let j=0;j<4;j++)ellipsoid(root,whaleSurface(1.30-j*.17,Math.PI/2,.002),[.025,.015,.027],lip,'RostralRidge');
  // A low, swept dorsal fin on the posterior hump.
  const shape=new THREE.Shape();shape.moveTo(-.20,0);shape.bezierCurveTo(-.08,.025,-.045,.21,.025,.235);shape.bezierCurveTo(.09,.25,.025,.09,.21,0);shape.closePath();
  const dg=new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,curveSegments:10});
  const dorsal=add(root,dg,dark,'DorsalFin');dorsal.rotation.y=Math.PI/2;dorsal.position.set(-.007,.275,-.79);
  const tail=new THREE.Group();tail.name='TailPivot';tail.position.set(0,0,-1.65);root.add(tail);
  for(const side of [-1,1])wing(tail,side,.72,.18,-.23,true);
  // Paired nostrils sit on the crown behind the rostral ridge.
  const crown=whaleSurface(.70,Math.PI/2,.003);
  for(const side of [-1,1]){const p=crown.clone();p.x=side*.027;ellipsoid(root,p,[.017,.004,.038],dark,'Blowhole');}
  body.userData.anatomy='Ventral pleats are UV/bump detail on the lower jaw and belly, not separate tubes.';
  return root;
}
