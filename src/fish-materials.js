import * as THREE from 'three';

// Bake small material color differences into vertices, preserving membrane alpha.
// One shared opaque detail material and one fin material per species enable batching.
export function consolidateFishMaterials(root){
  const opaque=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,side:THREE.DoubleSide});
  const fins=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,side:THREE.DoubleSide,transparent:true,depthWrite:false});
  fins.forceSinglePass=true;
  root.traverse(o=>{
    if(!o.isMesh||o.material.map||o.material.userData.preserveSurface)return;
    const source=o.material;
    // Keep the jelly's emissive tissues and bell as authored.
    if(source.emissiveIntensity>0&&source.emissive?.getHex()!==0){if(source.transparent)source.forceSinglePass=true;return;}
    const geometry=o.geometry.clone(),old=geometry.attributes.color,n=geometry.attributes.position.count,colors=new Float32Array(n*4);
    for(let i=0;i<n;i++){
      colors[i*4]=source.color.r*(old?old.getX(i):1);
      colors[i*4+1]=source.color.g*(old?old.getY(i):1);
      colors[i*4+2]=source.color.b*(old?old.getZ(i):1);
      colors[i*4+3]=source.opacity*(old?.itemSize===4?old.getW(i):1);
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));o.geometry=geometry;
    o.material=source.transparent||source.name.startsWith('Fin rays')?fins:opaque;
  });
}
