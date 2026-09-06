import * as THREE from 'three';

// Bend batched vertices with the same displacement in the surface and shadow pass.
const declarations = `
  uniform float currentTime;
  uniform vec4 currentPlant; // height, tip displacement, root x/z
  uniform vec2 currentDirection;
  uniform float currentSpread;
  vec4 reefBend(vec3 p) {
    float h=max(p.y,0.0)/currentPlant.x;
    vec2 location=currentPlant.zw+p.xz*currentSpread;
    float phase=location.x*.13+location.y*.09;
    float a=currentTime*.78+phase-h*.65;
    float b=currentTime*1.23+phase*.7-h*.95;
    float wave=.72*sin(a)+.28*sin(b);
    float crossWave=.22*sin(a*.83+.9);
    vec2 side=vec2(-currentDirection.y,currentDirection.x);
    vec2 drift=currentDirection*wave+side*crossWave;
    vec2 derivative=currentDirection*(-.72*.65*cos(a)-.28*.95*cos(b))
      +side*(-.22*.65*.83*cos(a*.83+.9));
    vec2 offset=currentPlant.y*h*h*drift;
    vec2 slope=currentPlant.y/currentPlant.x*(2.0*h*drift+h*h*derivative);
    return vec4(offset,slope);
  }
`;

export function applyCurrent(root,clock,{height,amplitude,spread=0}) {
  const direction=new THREE.Vector3(1,0,.35).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),-root.rotation.y);
  const uniforms={currentTime:clock,
    currentPlant:{value:new THREE.Vector4(height,amplitude,root.position.x,root.position.z)},
    currentDirection:{value:new THREE.Vector2(direction.x,direction.z)},currentSpread:{value:spread}};
  function deform(shader,normals){
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=declarations+shader.vertexShader;
    if(normals)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nvec4 currentNormalBend=reefBend(position);\nobjectNormal.y-=dot(objectNormal.xz,currentNormalBend.zw);');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.xz+=reefBend(position).xy;');
  }
  const materials=new Map(),depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  depth.onBeforeCompile=shader=>deform(shader,false);
  depth.customProgramCacheKey=()=> 'reef-current-depth-v1';
  root.traverse(o=>{
    if(!o.isMesh)return;
    const source=o.material;
    if(!materials.has(source)){
      const material=source.clone(),previous=source.onBeforeCompile,key=source.customProgramCacheKey();
      material.onBeforeCompile=(shader,renderer)=>{previous.call(source,shader,renderer);deform(shader,true);};
      material.customProgramCacheKey=()=>`${key}-current-v1`;
      materials.set(source,material);
    }
    o.material=materials.get(source);o.customDepthMaterial=depth;o.castShadow=false;
    // Include moving tips when culling vegetation at screen edges.
    o.geometry.computeBoundingSphere();o.geometry.boundingSphere.radius+=amplitude*1.5;
  });
}
