import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createWhale} from './whale-model.js';
import {turtleShellMaterial} from './turtle-shell.js';
// Original lightweight geometry. All swimming animals face +Z before the scene's yaw flip.
export function createSpeciesModels(){
  const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.48,...extra});
  const dark=standard('#13272d'),white=standard('#f6ead5'),sharkSkin=standard('#7c9492'),dolphinSkin=standard('#748f9b');
  const sphere=new THREE.SphereGeometry(1,12,8),wetEye=standard('#0b1a20',{roughness:.16});wetEye.userData.preserveSurface=true;
  const blend=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),THREE.MathUtils.smoothstep(t,0,1));
  function mesh(parent,geo,mat,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
  function group(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
  function line(parent,pts,r,mat){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),12,r,5,false),mat);}
  function hull(parent,profile,mat,colorAt){
    if(profile.length<20){
      const source=profile;profile=[];
      for(let i=0;i<=48;i++){
        const t=i/48*(source.length-1),k=Math.min(source.length-2,Math.floor(t)),f=t-k;
        const p0=source[Math.max(0,k-1)],p1=source[k],p2=source[k+1],p3=source[Math.min(source.length-1,k+2)];
        const row=[];for(let c=0;c<4;c++){const a=p0[c]||0,b=p1[c]||0,d=p2[c]||0,e=p3[c]||0;row.push(.5*((2*b)+(-a+d)*f+(2*a-5*b+4*d-e)*f*f+(-a+3*b-3*d+e)*f*f*f));}
        row[1]=Math.max(.01,row[1]);row[2]=Math.max(.01,row[2]);profile.push(row);
      }
    }
    const vs=[],cs=[],uv=[],ix=[],N=32;
    for(const [z,rx,ry,cy=0] of profile)for(let j=0;j<=N;j++){
      const a=j/N*Math.PI*2;vs.push(Math.cos(a)*rx,Math.sin(a)*ry+cy,z);uv.push((z-profile[0][0])/(profile.at(-1)[0]-profile[0][0]),j/N);
      const c=new THREE.Color(colorAt?colorAt(z,Math.sin(a)):mat.color);cs.push(c.r,c.g,c.b);
    }
    for(let k=0;k<profile.length-1;k++)for(let j=0;j<N;j++){const a=k*(N+1)+j,b=a+N+1;ix.push(a,a+1,b,a+1,b+1,b);}
    // Close the nose and tail stock, then smooth the duplicated angular seam.
    for(const end of [0,profile.length-1]){const [z,,,cy=0]=profile[end],center=vs.length/3;vs.push(0,cy,z);uv.push(end?1:0,.5);const c=new THREE.Color(colorAt?colorAt(z,0):mat.color);cs.push(c.r,c.g,c.b);for(let j=0;j<N;j++){const a=end*(N+1)+j;end?ix.push(center,a,a+1):ix.push(center,a+1,a);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const normals=geo.attributes.normal;for(let i=0;i<profile.length;i++){const a=i*(N+1),b=a+N,n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
    const material=mat.clone();material.color.set('white');material.vertexColors=true;material.userData.preserveSurface=mat.metalness>0;
    const body=mesh(parent,geo,material);body.name='Body';
    body.surface=(z,a,offset=.003)=>{let i=0;while(i<profile.length-2&&profile[i+1][0]<z)i++;const p=profile[i],q=profile[i+1],t=THREE.MathUtils.clamp((z-p[0])/(q[0]-p[0]),0,1),rx=THREE.MathUtils.lerp(p[1],q[1],t),ry=THREE.MathUtils.lerp(p[2],q[2],t),cy=THREE.MathUtils.lerp(p[3]||0,q[3]||0,t);return [Math.cos(a)*(rx+offset),Math.sin(a)*(ry+offset)+cy,z];};return body;
  }
  function fin(parent,points,mat,tip=false){
    const shape=new THREE.Shape(),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    shape.moveTo(...points[0]);shape.lineTo(...mid(points[0],points[1]));
    for(let i=1;i<points.length;i++)shape.quadraticCurveTo(...points[i],...(i===points.length-1?points[0]:mid(points[i],points[i+1])));shape.closePath();
    const geo=mergeVertices(new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSegments:1,bevelSize:.004,bevelThickness:.003,steps:1,curveSegments:3}).deleteAttribute('normal'));
    const p=geo.attributes.position,colors=[];
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,p.getZ(i)+.015*Math.sin(x*3)*Math.sin(y*4));const c=new THREE.Color(mat.color);if(tip)c.lerp(new THREE.Color('#172b30'),THREE.MathUtils.smoothstep(y,.29,.40));colors.push(c.r,c.g,c.b);}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mat=mat.clone();mat.color.set('white');mat.vertexColors=true;mat.side=THREE.DoubleSide;
    return mesh(parent,geo,mat);
  }
  function eyes(parent,x,y,z,r){for(const side of [-1,1]){
    mesh(parent,sphere,standard('#8a9890'),[x*side,y,z],[r*.24,r*.83,r]);
    const pupil=mesh(parent,sphere,wetEye,[(x+r*.14)*side,y,z+.002],[r*.20,r*.66,r*.75]);pupil.material.userData.preserveSurface=true;
  }}
  function bodyEyes(root,body,z,angle,r){const [x,y]=body.surface(z,angle,.002);eyes(root,x,y,z,r);}
  function seam(root,body,side,from,to,angleStart,angleEnd,r=.004){const pts=[];for(let i=0;i<=12;i++){const t=i/12,a=THREE.MathUtils.lerp(angleStart,angleEnd,t);pts.push(body.surface(THREE.MathUtils.lerp(from,to,t),side===1?a:Math.PI-a));}line(root,pts,r,dark);}
  function predator(dolphin){
    const root=new THREE.Group(),skin=dolphin?dolphinSkin:sharkSkin;
    const profile=dolphin?[[-1.12,.055,.065,0],[-.83,.09,.12,0],[-.50,.17,.21,0],[0,.28,.31,0],[.48,.31,.33,.025],[.78,.24,.28,.02],[.94,.12,.15,-.03],[1.17,.075,.065,-.085],[1.25,.018,.035,-.085]]:[[-1.05,.025,.035,0],[-.77,.07,.10,0],[-.46,.15,.19,0],[0,.24,.27,0],[.45,.25,.25,0],[.78,.19,.17,-.015],[1.02,.025,.055,-.045]];
    const body=hull(root,profile,skin,(_,y)=>blend(skin.color,'#d8ded3',(-y-.08)/.78));
    bodyEyes(root,body,dolphin?.74:.73,.19,dolphin?.028:.030);
    const dorsal=fin(root,[[0,0],[.08,.29],[.17,.40],[.22,.34],[.20,.15],[.42,0]],skin,!dolphin);dorsal.rotation.y=Math.PI/2;dorsal.position.set(0,.20,-.10);
    for(const s of [-1,1]){
      const p=group(root,'PectoralPivot'+s,body.surface(.11,s===1?-.50:Math.PI+.50,-.015));const f=fin(p,[[0,.10],[s*.48,-.22],[s*.53,-.32],[s*.30,-.22],[0,-.10]],skin);f.rotation.x=Math.PI/2-.2;
      if(!dolphin){const p=f.geometry.attributes.position,c=f.geometry.attributes.color;for(let i=0;i<p.count;i++){const tint=new THREE.Color(skin.color).lerp(new THREE.Color('#172b30'),THREE.MathUtils.smoothstep(Math.abs(p.getX(i)),.33,.49));c.setXYZ(i,tint.r,tint.g,tint.b);}}
      if(!dolphin)for(let i=0;i<5;i++){const pts=[];for(let k=0;k<=6;k++){const a=.32-k*.14;pts.push(body.surface(.46-i*.053-.015*Math.sin(k/6*Math.PI),s===1?a:Math.PI-a));}line(root,pts,.0035,dark);}
      seam(root,body,s,dolphin?1.22:.96,dolphin?.71:.58,-.18,-.43,.003);
    }
    if(dolphin)mesh(root,sphere,dark,body.surface(.56,Math.PI/2),[.030,.004,.016]);
    const tail=group(root,'TailPivot',[0,0,dolphin?-1.06:-.97]);
    if(dolphin){
      const f=fin(tail,[[-.51,-.29],[-.34,-.02],[0,.06],[.34,-.02],[.51,-.29],[.19,-.24],[0,-.16],[-.19,-.24]],skin);f.rotation.x=Math.PI/2;
    }else{
      const f=fin(tail,[[0,0],[-.28,.46],[-.40,.58],[-.30,.14],[-.10,-.03],[-.24,-.30],[-.05,-.20],[.07,-.02]],skin,true);f.rotation.y=-Math.PI/2;
    }
    return root;
  }
  function clown(){
    const root=new THREE.Group(),orange=standard('#ee791d'),finMat=standard('#f49c35',{side:THREE.DoubleSide});
    const profile=[];for(let i=0;i<=48;i++){const z=-.70+i/48*1.65,t=i/48,r=Math.sin(Math.PI*t)**.65;profile.push([z,.21*r,.38*r,0]);}
    const body=hull(root,profile,orange,(z,y)=>{const edge=Math.min(...[-.48,.02,.59].map(c=>Math.abs(z-c)));return edge<.09?'#fff6db':edge<.13?'#283131':y<-.6?'#f7b047':'#ee791d';});
    bodyEyes(root,body,.65,.23,.074);
    for(const side of [-1,1])seam(root,body,side,.43,.31,.25,-.9,.003);
    mesh(root,sphere,orange,[0,-.015,.94],[.065,.06,.025]);
    const d=fin(root,[[-.63,0],[-.46,.13],[-.22,.17],[.09,.13],[.34,.11],[.55,.025]],finMat);d.rotation.y=Math.PI/2;d.position.y=.27;
    const tail=group(root,'TailPivot',[0,0,-.64]);mesh(tail,sphere,orange,[0,0,-.045],[.035,.055,.12]);const tf=fin(tail,[[0,0],[-.40,.32],[-.55,.26],[-.55,-.26],[-.40,-.32]],finMat);tf.rotation.y=-Math.PI/2;
    // Dark outer rim makes the fan readable even at small, true-to-scale sizes.
    line(tail,[[0,.30,-.40],[0,.26,-.55],[0,0,-.56],[0,-.26,-.55],[0,-.30,-.40]],.005,dark);
    for(const s of [-1,1]){const p=group(root,'PectoralPivot'+s,[s*.19,-.07,.20]);const f=fin(p,[[0,0],[s*.28,-.08],[s*.22,-.25],[0,-.12]],finMat);f.rotation.x=.4;}
    return root;
  }
  function jelly(){
    const root=new THREE.Group(),bell=group(root,'BellPivot');
    const glass=standard('#b2dbe9',{transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,emissive:'#326778',emissiveIntensity:.06});
    mesh(bell,new THREE.SphereGeometry(.5,32,16,0,Math.PI*2,0,Math.PI*.53),glass,[0,0,0],[1,.48,1]);
    const rim=mesh(bell,new THREE.TorusGeometry(.497,.006,5,48),standard('#c0ced8',{transparent:true,opacity:.56,depthWrite:false}));rim.rotation.x=Math.PI/2;
    const organ=standard('#c6abc7',{transparent:true,opacity:.65,depthWrite:false});
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const o=mesh(bell,new THREE.TorusGeometry(.085,.013,5,18,Math.PI*1.6),organ,[Math.sin(a)*.135,.07,Math.cos(a)*.135]);o.rotation.set(Math.PI/2,0,a+.5);}
    const arms=group(root,'ArmsPivot'),tissue=standard('#dabfdf',{transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=.48;line(arms,[[Math.sin(a)*r,0,Math.cos(a)*r],[Math.sin(a+.06)*r,-.09,Math.cos(a+.06)*r],[Math.sin(a+.12)*r,-.20,Math.cos(a+.12)*r]],.0025,tissue);}
    for(let i=0;i<4;i++){const a=i*Math.PI/2,vs=[],uv=[],ix=[];for(let j=0;j<=18;j++){const t=j/18,w=.038*(1-t*.75);for(const side of [-1,1]){const r=.12+Math.sin(t*5)*.04;vs.push(Math.sin(a)*r+Math.cos(a)*side*w,-t*.34,Math.cos(a)*r+Math.sin(a)*side*w+Math.sin(t*15+side)*.013);uv.push(t,side>0?1:0);}if(j<18){const n=j*2;ix.push(n,n+1,n+2,n+1,n+3,n+2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();mesh(arms,geo,tissue);}
    return root;
  }
  function manta(){
    const root=new THREE.Group(),skin=standard('#263c46'),underside=standard('#d5ddd3');
    const body=mesh(root,new THREE.SphereGeometry(1,24,12),skin,[0,0,.10],[.35,.105,.48]);
    mesh(root,sphere,underside,[0,-.042,.1],[.326,.071,.45]);eyes(root,.286,.032,.35,.020);
    for(const side of [-1,1]){
      const wing=group(root,'PectoralPivot'+side,[side*.23,0,.11]);
      const vs=[],cs=[],uv=[],ix=[],rows=24,cols=16;
      for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
        const u=i/rows,a=j/cols*Math.PI*2,w=.36*Math.pow(1-u,.8)+.001,z=-.38*u+Math.cos(a)*w,y=Math.sin(a)*(.048*Math.sqrt(1-u)+.001)+.022*Math.sin(u*Math.PI);
        vs.push(side*1.14*u,y,z);uv.push(u,j/cols);
        const white=Math.sin(a)<-.08||(u<.30&&z>.11+.06*Math.sin(u*19));const c=new THREE.Color(white?'#d5ddd3':'#263c46');c.multiplyScalar(1+.055*Math.sin(u*21+z*10));cs.push(c.r,c.g,c.b);
      }
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;side===1?ix.push(a,b,a+1,a+1,b,b+1):ix.push(a,a+1,b,a+1,b+1,b);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();mesh(wing,geo,standard('#ffffff',{vertexColors:true}));
      line(root,[[side*.19,0,.43],[side*.23,.015,.59],[side*.18,.045,.70],[side*.12,.037,.67]],.027,skin);
      for(let i=0;i<5;i++){const z=.23-i*.072;line(root,[[side*.09,-.115,z],[side*.15,-.105,z-.008],[side*.21,-.087,z-.005]],.0025,dark);}
    }
    mesh(root,sphere,dark,[0,-.013,.556],[.115,.018,.008]);
    line(root,[[0,0,-.35],[0,-.01,-.80],[.035,-.035,-1.25]],.008,skin);return root;
  }
  function turtle(){
    const root=new THREE.Group(),shell=turtleShellMaterial(),skin=standard('#899b6b');
    const shellGeo=new THREE.SphereGeometry(1,32,18,0,Math.PI*2,0,Math.PI*.56),uv=shellGeo.attributes.uv,pos=shellGeo.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)*.5+.5,pos.getZ(i)*.5+.5);
    const carapace=mesh(root,shellGeo,shell,[0,0,0],[.40,.19,.52]);carapace.name='Carapace';
    mesh(root,new THREE.SphereGeometry(1,24,12),skin,[0,-.018,0],[.395,.095,.512]);
    mesh(root,new THREE.SphereGeometry(1,24,12),standard('#c3ba84'),[0,-.038,0],[.38,.075,.50]);
    mesh(root,sphere,skin,[0,-.016,.48],[.11,.08,.17]);
    mesh(root,new THREE.SphereGeometry(1,20,12),skin,[0,-.003,.65],[.12,.10,.18]);eyes(root,.109,.022,.71,.022);
    for(const side of [-1,1]){
      line(root,[[side*.045,-.032,.809],[side*.092,-.046,.75],[side*.111,-.038,.66]],.0025,dark);
      for(let j=0;j<4;j++)mesh(root,sphere,standard('#536a47'),[side*(.08-j*.014),.064+j*.004,.70-j*.042],[.022,.003,.021]);
    }
    for(const side of [-1,1]){
      const arm=group(root,'PectoralPivot'+side,[side*.28,-.03,.31]);const f=fin(arm,[[0,0],[side*.41,-.21],[side*.54,-.43],[side*.36,-.40],[0,-.11]],skin);f.rotation.x=Math.PI/2;
      const rear=fin(root,[[0,0],[side*.24,-.13],[side*.28,-.27],[0,-.13]],skin);rear.position.set(side*.25,-.04,-.29);rear.rotation.x=Math.PI/2;
    }
    line(root,[[0,-.04,-.45],[0,-.06,-.64]],.03,skin);return root;
  }
  function smallFish(goby){
    const root=new THREE.Group(),skin=standard(goby?'#19334a':'#9fced4',{metalness:goby?.05:.28}),finMat=standard(goby?'#429aca':'#a2cace');
    const profile=[[-.75,.025,.05],[-.5,.09,.12],[-.1,.15,goby?.16:.22],[.4,.16,.19],[.72,.11,.12],[.86,.02,.04]];
    const body=hull(root,profile,skin,(_,y)=>goby?(Math.abs(y)<.20?'#49d6ff':'#19334a'):(y>.45?'#397d8c':'#c7dfe1'));
    bodyEyes(root,body,.62,.23,goby?.049:.044);
    for(const side of [-1,1])seam(root,body,side,.40,.25,.55,-1.0,.0025);
    const tail=group(root,'TailPivot',[0,0,-.7]);mesh(tail,sphere,skin,[0,0,-.07],[.026,.042,.14]);const f=fin(tail,goby?[[0,0],[-.3,.15],[-.4,.1],[-.4,-.1],[-.3,-.15]]:[[0,0],[-.45,.31],[-.31,0],[-.45,-.31]],finMat);f.rotation.y=-Math.PI/2;
    const dorsal=fin(root,goby?[[-.20,0],[0,.13],[.20,0]]:[[-.30,0],[0,.19],[.27,0]],finMat);dorsal.rotation.y=Math.PI/2;dorsal.position.set(0,.13,goby?.25:0);
    for(const side of [-1,1]){const p=group(root,'PectoralPivot'+side,[side*.13,-.06,.31]);const f=fin(p,[[0,0],[side*.2,-.15],[0,-.09]],finMat);f.rotation.x=.6;}
    if(!goby)for(const side of [-1,1])for(let i=0;i<6;i++)mesh(root,sphere,dark,body.surface(.17-i*.10,side===1?.32:Math.PI-.32),[.003,.010,.013]);
    if(goby){const rear=fin(root,[[-.37,0],[-.20,.11],[.12,.10],[.20,0]],finMat);rear.rotation.y=Math.PI/2;rear.position.set(0,.11,-.35);}
    return root;
  }
  return [clown(),predator(false),predator(true),jelly(),createWhale(),manta(),turtle(),smallFish(false),smallFish(true)];
}
