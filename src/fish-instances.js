import * as THREE from 'three';

// Each animated part gets one instanced draw per species. Fish retain individual
// simulation state and tail/fin transforms, without one draw per animal.
export function createFishInstances(scene,template,capacity){
  const parts=[];
  template.traverse(o=>{if(o.isMesh){
    const mesh=new THREE.InstancedMesh(o.geometry,o.material,capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;
    mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    scene.add(mesh);parts.push(mesh);
  }});
  let count=0;
  return {parts,reset(){count=0;},add(group,meshes){
    if(count>=capacity)throw new Error('Fish instance capacity exceeded');
    group.updateMatrixWorld(true);for(let i=0;i<parts.length;i++)parts[i].setMatrixAt(count,meshes[i].matrixWorld);count++;
  },flush(){for(const p of parts){p.count=count;p.visible=count>0;p.instanceMatrix.needsUpdate=true;}}};
}
