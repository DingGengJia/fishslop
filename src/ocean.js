import * as THREE from 'three';
import {TERRAIN_STEP,terrainVertexHeight,terrainNormal} from './terrain.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CHUNK_SIZE,MAX_CHUNKS,chunkAt,chunkKey,chunkWindow,oceanChunk} from './ocean-layout.js';

export function createOcean(scene,caustics,clock,sand=null){
  sand??=caustics(new THREE.MeshStandardMaterial({color:'#b9aa7d',roughness:.92,vertexColors:true}),.25);
  const deepSand=new THREE.Color('#839d9e'),steepSand=new THREE.Color('#667d7a');
  const stone=caustics(new THREE.MeshStandardMaterial({color:'#78938c',roughness:.92}),.22);
  const coral=caustics(new THREE.MeshStandardMaterial({color:'#ce91ae',roughness:.75}),.16);
  const green=caustics(new THREE.MeshStandardMaterial({color:'#609c7c',side:THREE.DoubleSide,roughness:.8}),.16);
  // Shared plant shaders animate all tiles with one clock and no object loops.
  const previous=green.onBeforeCompile;
  green.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);shader.uniforms.oceanTime=clock;
    shader.vertexShader='uniform float oceanTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float phase=instanceMatrix[3].x*.13+instanceMatrix[3].z*.09;
      transformed.x+=sin(oceanTime*.78+phase-position.y*.8)*position.y*position.y*.10;
      transformed.z+=cos(oceanTime*.53+phase)*position.y*position.y*.035;`);
  };
  green.customProgramCacheKey=()=> 'ocean-kelp-caustic-v1';
  const rockGeo=new THREE.IcosahedronGeometry(1,2);
  const rp=rockGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),n=1+.06*Math.sin(x*7+z*3)*Math.cos(y*5);rp.setXYZ(i,x*n,y*n,z*n);}rockGeo.computeVertexNormals();
  const kelpParts=[];
  const stem=new THREE.CylinderGeometry(.013,.025,1,5,6);stem.translate(0,.5,0);kelpParts.push(stem);
  for(let i=1;i<10;i++){
    const leaf=new THREE.PlaneGeometry(.32,.14,5,2),p=leaf.attributes.position,side=i%2?1:-1;
    for(let j=0;j<p.count;j++){const t=(p.getX(j)+.16)/.32;p.setXYZ(j,side*t*.32,i*.095+t*.06,p.getY(j)*Math.sin(t*Math.PI));}leaf.computeVertexNormals();kelpParts.push(leaf);
  }
  const kelpGeo=mergeGeometries(kelpParts);kelpParts.forEach(g=>g.dispose());
  const coralParts=[];
  for(let i=0;i<9;i++){
    const branch=new THREE.CylinderGeometry(.025,.07,.55,6,3);branch.translate(0,.275,0);branch.rotateZ((i%3-1)*.5);branch.rotateY(i*2.4);branch.translate(Math.sin(i*2.4)*.2,(i%3)*.2,Math.cos(i*2.4)*.2);coralParts.push(branch);
  }
  const coralGeo=mergeGeometries(coralParts);coralParts.forEach(g=>g.dispose());
  const grassParts=[];
  for(let i=0;i<5;i++){const blade=new THREE.PlaneGeometry(.055,.7,1,5);blade.translate(0,.35,0);blade.rotateZ((i-2)*.18);blade.rotateY(i*2.4);grassParts.push(blade);}
  const grassGeo=mergeGeometries(grassParts);grassParts.forEach(g=>g.dispose());
  const active=new Map(),free=[],matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion(),color=new THREE.Color(),axis=new THREE.Vector3(0,1,0);
  const specs=[[rockGeo,stone,7,'rocks'],[kelpGeo,green,22,'plants'],[coralGeo,coral,22,'corals'],[grassGeo,green,64,'grass']];
  function createSlot(){
    const group=new THREE.Group();scene.add(group);
    const meshes=specs.map(([geo,mat,max])=>{const m=new THREE.InstancedMesh(geo,mat,max);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.castShadow=false;m.receiveShadow=true;group.add(m);return m;});
    const steps=CHUNK_SIZE/TERRAIN_STEP,vertices=(steps+1)**2,geometry=new THREE.BufferGeometry(),indices=[];
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(vertices*2),2));
    for(let z=0;z<steps;z++)for(let x=0;x<steps;x++){const a=z*(steps+1)+x,b=a+1,c=a+steps+1,d=c+1;indices.push(a,c,b,b,c,d);}
    geometry.setIndex(indices);const ground=new THREE.Mesh(geometry,sand);ground.receiveShadow=true;ground.name='OceanSeabed';group.add(ground);
    return {group,meshes,ground,x:0,z:0};
  }
  function fill(slot,tile){
    Object.assign(slot,{x:tile.x,z:tile.z});slot.group.visible=true;
    const geometry=slot.ground.geometry,{position:vertices,normal:normals,color:colors,uv}=geometry.attributes,steps=CHUNK_SIZE/TERRAIN_STEP;
    for(let z=0;z<=steps;z++)for(let x=0;x<=steps;x++){
      const i=z*(steps+1)+x,lx=x*TERRAIN_STEP,lz=z*TERRAIN_STEP,wx=tile.x*CHUNK_SIZE+lx,wz=tile.z*CHUNK_SIZE+lz;
      const height=terrainVertexHeight(wx,wz),normal=terrainNormal(wx,wz);
      vertices.setXYZ(i,lx,height,lz);normals.setXYZ(i,...normal);uv.setXY(i,lx/8,lz/8);
      const slope=1-normal[1],deep=Math.max(0,Math.min(1,-height/28));
      color.set('#ffffff').lerp(deepSand,deep*.48).lerp(steepSand,Math.min(1,slope*2.5));colors.setXYZ(i,color.r,color.g,color.b);
    }
    for(const attribute of Object.values(geometry.attributes))attribute.needsUpdate=true;
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    specs.forEach((spec,index)=>{
      const mesh=slot.meshes[index],items=tile[spec[3]];mesh.count=items.length;
      items.forEach((p,i)=>{
        position.set(p.x,p.y+(index===0?p.size*.6:.02),p.z);
        if(index===0){scale.set(p.size,p.size*.7,p.size*.82);rotation.identity();}
        else{const size=p.height??p.size;scale.set(index===1?size*.32:size,size,index===1?size*.32:size);rotation.setFromAxisAngle(axis,p.angle);}
        matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);
        color.set(index===2?['#fff0cd','#ccdfed','#f4bbdb'][(tile.biome+i)%3]:index===1?(tile.biome===1?'#d5edb5':'#aee4d8'):'#ffffff');mesh.setColorAt(i,color);
      });
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=2;
    });
  }
  let center='',pending=[];
  function update(p,origin,immediate=false){
    const c=chunkAt(p),key=chunkKey(c.x,c.z);
    if(key!==center){
      center=key;const wanted=chunkWindow(p),keys=new Set(wanted.map(t=>t.key));
      for(const [key,slot]of active)if(!keys.has(key)){slot.group.visible=false;active.delete(key);free.push(slot);}
      pending=wanted.filter(t=>!active.has(t.key));
    }
    // At most one new tile per frame during normal travel; reuse GPU buffers.
    for(let i=0,n=immediate?MAX_CHUNKS:1;i<n&&pending.length;i++){
      const tile=pending.shift(),slot=free.pop()??createSlot();fill(slot,oceanChunk(tile.x,tile.z));active.set(tile.key,slot);
    }
    for(const slot of active.values())slot.group.position.set(slot.x*CHUNK_SIZE-origin.x,0,slot.z*CHUNK_SIZE-origin.z);
  }
  return {update,get count(){return active.size;},get slots(){return active.size+free.length;}};
}
