import * as THREE from 'three';

// Lighting changes do not reset the simulation or create lights per fish.
export function createLighting({scene,renderer,hemisphere,sun,fill,headlight,reef,templates,night=false}){
  const backgroundDay=new THREE.Color('#075164'),backgroundNight=new THREE.Color('#041631');
  const fogDay=new THREE.Color('#075164'),fogNight=new THREE.Color('#041631');
  const skyDay=new THREE.Color('#bfe9ee'),skyNight=new THREE.Color('#709dd7');
  const groundDay=new THREE.Color('#365957'),groundNight=new THREE.Color('#152e47');
  const sunDay=new THREE.Color('#fff0cf'),sunNight=new THREE.Color('#9dbaf7');
  const jellyGlow=new THREE.Color('#1b668f');
  const jellyMaterials=new Set();templates[6].body.traverse(o=>{if(o.isMesh&&o.material.emissive)jellyMaterials.add(o.material);});
  const jellyDefaults=[...jellyMaterials].map(material=>({material,color:material.emissive.clone(),intensity:material.emissiveIntensity}));
  let value=night?1:0,target=value;
  function apply(){
    scene.background.copy(backgroundDay).lerp(backgroundNight,value);
    scene.fog.color.copy(fogDay).lerp(fogNight,value);scene.fog.density=THREE.MathUtils.lerp(.033,.041,value);
    scene.environmentIntensity=THREE.MathUtils.lerp(.36,.12,value);
    hemisphere.color.copy(skyDay).lerp(skyNight,value);hemisphere.groundColor.copy(groundDay).lerp(groundNight,value);hemisphere.intensity=THREE.MathUtils.lerp(1.25,.48,value);
    sun.color.copy(sunDay).lerp(sunNight,value);sun.intensity=THREE.MathUtils.lerp(2.6,.38,value);fill.intensity=THREE.MathUtils.lerp(.7,.20,value);
    headlight.intensity=THREE.MathUtils.lerp(28,75,value);headlight.distance=THREE.MathUtils.lerp(14,20,value);
    renderer.toneMappingExposure=THREE.MathUtils.lerp(1.05,1.12,value);
    for(const {material,color,intensity}of jellyDefaults){material.emissive.copy(color).lerp(jellyGlow,value);material.emissiveIntensity=THREE.MathUtils.lerp(intensity,.8,value);}
    reef.setNight(value);
  }
  apply();return {setNight(enabled){target=enabled?1:0;},update(dt){
    if(Math.abs(target-value)<.001){if(value!==target){value=target;apply();}return;}
    value+=(target-value)*(1-Math.exp(-Math.max(0,dt)*3));apply();
  }};
}
