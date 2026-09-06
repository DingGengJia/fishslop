import * as THREE from 'three';
import { clampCameraPosition } from './world-bounds.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createReef, batchMeshes } from './reef.js';
import { createSpeciesModels } from './species-models.js';
import { prepareSpeciesModel } from './model-preparation.js';
import {createFishInstances} from './fish-instances.js';
import { speciesOf, adultScale, MAX_RESIDENTS } from './species.js';

export async function createWorld(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#073f53');scene.fog=new THREE.FogExp2('#075164',.033);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.1,130);
  scene.add(new THREE.HemisphereLight('#bfe9ee','#365957',1.25));
  const sun=new THREE.DirectionalLight('#fff0cf',2.6);sun.position.set(-9,26,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:70});sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;scene.add(sun);
  const fill=new THREE.DirectionalLight('#8dd6e5',.70);fill.position.set(15,10,-16);scene.add(fill);
  const reef=createReef(scene);
  const loader=new GLTFLoader(),base=import.meta.env.BASE_URL;
  const [subAsset,...fishAssets]=await Promise.all(['submarine-lite','goldfish-lite','azure-lite','orchid-lite'].map(name=>loader.loadAsync(`${base}models/${name}.glb`)));
  const sub=new THREE.Group();scene.add(sub);const subModel=subAsset.scene;subModel.scale.setScalar(.34);subModel.rotation.y=Math.PI;sub.add(subModel);
  const rotor=new THREE.Group();rotor.position.set(0,0,-1.95);subModel.add(rotor);sub.updateMatrixWorld(true);
  const blades=[];subModel.traverse(o=>{if(o.isMesh&&/Propeller_blade/.test(o.name))blades.push(o);});for(const blade of blades)rotor.attach(blade);batchMeshes(subModel,[rotor]);
  subModel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const headlight=new THREE.SpotLight('#d2fbed',28,14,.48,.75,1.4);headlight.position.set(0,-.2,-1);headlight.target.position.set(0,-2,-10);sub.add(headlight,headlight.target);
  const fishModels=new Map(),foodModels=new Map(),coinModels=new Map();
  const foodGeo=new THREE.DodecahedronGeometry(.10,0),foodMat=new THREE.MeshStandardMaterial({color:'#dca366',roughness:.95});
  const coinGeo=new THREE.CylinderGeometry(.24,.24,.065,28);coinGeo.rotateX(Math.PI/2);
  const coinMat=new THREE.MeshStandardMaterial({color:'#f8d477',metalness:.78,roughness:.23,emissive:'#a06517',emissiveIntensity:.3});
  const ringGeo=new THREE.TorusGeometry(.185,.014,5,28);const ringMat=new THREE.MeshStandardMaterial({color:'#fff0b5',metalness:.6,roughness:.28});
  const numberGeo=new THREE.BoxGeometry(.026,.22,.018);
  // Prepare each species once, then share its geometry/materials across residents.
  const templates=[...fishAssets.map(a=>a.scene),...createSpeciesModels()].map((body,type)=>{
    return prepareSpeciesModel(body,type,renderer.capabilities.getMaxAnisotropy());
  });
  const instancePools=new Map();
  function fishModel(f){
    const group=new THREE.Group(),template=templates[f.type],body=template.body.clone(true);body.rotation.y=Math.PI;group.add(body);
    const fins=[];body.traverse(o=>{if(!o.isMesh&&/^PectoralPivot/.test(o.name))fins.push(o);});
    group.rotation.order='YXZ';group.rotation.y=f.yaw;
    const instanced=f.type>=10,parts=[];
    if(instanced){if(!instancePools.has(f.type))instancePools.set(f.type,createFishInstances(scene,template.body,MAX_RESIDENTS));body.traverse(o=>{if(o.isMesh)parts.push(o);});}else scene.add(group);
    return {group,body,instanced,parts,tail:body.getObjectByName('TailPivot'),bell:body.getObjectByName('BellPivot'),arms:body.getObjectByName('ArmsPivot'),fins,length:template.length,swimPhase:f.id*1.7,swimSpeed:0,previous:new THREE.Vector3(f.x,f.y,f.z)};
  }
  function sync(map,data,make,update){
    const ids=new Set(data.map(d=>d.id));for(const[id,obj]of map)if(!ids.has(id)){scene.remove(obj.group||obj);map.delete(id);}
    for(const d of data){if(!map.has(d.id))map.set(d.id,make(d));update(map.get(d.id),d);}
  }
  const bubbleGeometry=new THREE.SphereGeometry(1,12,8),bubbleMaterial=new THREE.MeshPhysicalMaterial({color:'#b1e4df',metalness:.25,roughness:.08,transparent:true,opacity:.23});
  const bubbles=Array.from({length:36},()=>{const m=new THREE.Mesh(bubbleGeometry,bubbleMaterial);m.visible=false;scene.add(m);return {mesh:m,life:0};});let bubbleTimer=0,bubbleIndex=0;
  const cameraGoal=new THREE.Vector3(),lookGoal=new THREE.Vector3(),lookAt=new THREE.Vector3(),pos=new THREE.Vector3(),velocity=new THREE.Vector3(),exhaust=new THREE.Vector3();let initialized=false,focusType=null;
  let shadowTimer=0,qualityTimer=0,slowTime=0;
  renderer.shadowMap.autoUpdate=false;
  const metrics={fps:60,drawCalls:0,triangles:0,pixelRatio:renderer.getPixelRatio()};
  function render(g,dt,playing){
    const t=g.time,s=g.sub;reef.update(t);
    sub.position.set(s.x,s.y,s.z);sub.rotation.set(s.trim??s.pitch,s.heading??s.yaw,(s.bank??0)+Math.sin(t*1.4)*.012,'YXZ');subModel.position.y=Math.sin(t*1.8)*.025;
    const movement=Math.hypot(s.vx,s.vy,s.vz);rotor.rotation.z+=dt*(4+movement*5);
    sync(fishModels,g.fish,fishModel,(m,f)=>{
      pos.set(f.x,f.y,f.z);velocity.copy(pos).sub(m.previous);m.previous.copy(pos);m.group.position.copy(pos);
      const delta=Math.atan2(Math.sin(f.yaw-m.group.rotation.y),Math.cos(f.yaw-m.group.rotation.y));m.group.rotation.y+=delta*(1-Math.exp(-dt*5));
      const pitch=velocity.length()>.003?Math.atan2(velocity.y,Math.hypot(velocity.x,velocity.z)):0;m.group.rotation.x+=(THREE.MathUtils.clamp(pitch,-.5,.5)-m.group.rotation.x)*Math.min(1,dt*4);
      const sp=speciesOf(f.type),size=sp.length/m.length*adultScale(f.growth);m.group.scale.setScalar(size);
      const speed=Math.min(4,velocity.length()/Math.max(dt,.001));
      m.swimSpeed+=(speed-m.swimSpeed)*(1-Math.exp(-dt*4));
      const effort=Math.min(1,m.swimSpeed/2.5),cadence=sp.cadence??[1,.94,1.06,1.5,.60,.55,.30][f.type];
      // Integrate phase so speed changes never snap the tail to a new angle.
      m.swimPhase=(m.swimPhase+dt*(7.2+effort*3.2)*cadence)%(Math.PI*2);
      const swim=m.swimPhase;
      m.body.rotation.z=Math.sin(swim-.8)*.026;
      m.body.rotation.y=Math.PI+Math.sin(swim-.65)*(.055+effort*.025);
      if(m.tail){if(sp.kind==='dolphin'||sp.kind==='whale')m.tail.rotation.x=Math.sin(swim)*(.26+effort*.10);else m.tail.rotation.y=Math.sin(swim)*(sp.kind==='shark'?.28+effort*.1:.56+effort*.16);}
      if(m.bell){m.group.rotation.x=0;const pulse=Math.sin(swim);m.bell.scale.set(1-pulse*.075,1+pulse*.15,1-pulse*.075);m.arms.rotation.z=Math.sin(swim-.8)*.07;m.body.rotation.y=Math.PI;m.body.rotation.z=Math.sin(swim*.7)*.025;}
      for(let i=0;i<m.fins.length;i++)m.fins[i].rotation.z=Math.sin(swim+.65+i*Math.PI)*(sp.kind==='whale'?.08:sp.kind==='ray'?.28:sp.kind==='turtle'?.38:.30+effort*.08);
    });
    sync(foodModels,g.food,()=>{const m=new THREE.Mesh(foodGeo,foodMat);scene.add(m);return m;},(m,p)=>{m.position.set(p.x,p.y,p.z);m.rotation.set(t*.8,p.id,t*.4);});
    sync(coinModels,g.drops,()=>{const group=new THREE.Group();group.add(new THREE.Mesh(coinGeo,coinMat));for(const z of [-.04,.04]){const rim=new THREE.Mesh(ringGeo,ringMat);rim.position.z=z;group.add(rim);const numeral=new THREE.Mesh(numberGeo,ringMat);numeral.position.z=z;group.add(numeral);}scene.add(group);return group;},(m,c)=>{m.position.set(c.x,c.y+Math.sin(t*2+c.id)*.08,c.z);m.rotation.y=t*1.4+c.id;});
    const back=playing?4.8:6.2,up=playing?1.5:2.1;
    cameraGoal.set(s.x+Math.sin(s.yaw)*back,s.y+up-Math.sin(s.pitch)*3,s.z+Math.cos(s.yaw)*back);
    clampCameraPosition(cameraGoal);
    lookGoal.set(s.x-Math.sin(s.yaw)*3,s.y+.35+Math.sin(s.pitch)*3,s.z-Math.cos(s.yaw)*3);
    const observed=focusType===null?null:g.fish.find(f=>f.type===focusType);
    sub.visible=!observed;
    for(const f of g.fish)fishModels.get(f.id).group.visible=!observed||f.type===observed.type;
    for(const coin of coinModels.values())coin.visible=!observed;
    for(const pool of instancePools.values())pool.reset();
    for(const f of g.fish){const m=fishModels.get(f.id);if(m.instanced&&m.group.visible)instancePools.get(f.type).add(m.group,m.parts);}
    for(const pool of instancePools.values())pool.flush();
    if(observed){const distance=Math.max(.30,speciesOf(observed.type).length*(speciesOf(observed.type).length>=6?.95:1.8));cameraGoal.set(observed.x+distance*.85,observed.y+distance*.28,observed.z+distance*.8);lookGoal.set(observed.x,observed.y,observed.z);clampCameraPosition(cameraGoal);}
    if(!initialized){camera.position.copy(cameraGoal);lookAt.copy(lookGoal);initialized=true;}
    camera.position.lerp(cameraGoal,1-Math.exp(-dt*(observed?8:3)));lookAt.lerp(lookGoal,1-Math.exp(-dt*(observed?12:5)));camera.lookAt(lookAt);
    bubbleTimer+=dt;if(bubbleTimer>.055&&movement>.3){bubbleTimer=0;const b=bubbles[bubbleIndex++%bubbles.length];b.life=1.8;b.mesh.position.copy(sub.position).add(exhaust.set(0,-.05,.8).applyQuaternion(sub.quaternion));}
    for(const b of bubbles){b.life-=dt;b.mesh.visible=b.life>0;if(b.life>0){b.mesh.position.y+=dt*.85;b.mesh.scale.setScalar(.035+(1.8-b.life)*.03);}}
    shadowTimer+=dt;if(shadowTimer>=.10){renderer.shadowMap.needsUpdate=true;shadowTimer=0;}
    qualityTimer+=dt;slowTime+=dt>.024?dt:0;
    if(qualityTimer>4){if(slowTime>2&&renderer.getPixelRatio()>.85)renderer.setPixelRatio(Math.max(.85,renderer.getPixelRatio()-.15));qualityTimer=slowTime=0;}
    renderer.render(scene,camera);
    metrics.fps+=(1/Math.max(dt,.001)-metrics.fps)*.04;metrics.drawCalls=renderer.info.render.calls;metrics.triangles=renderer.info.render.triangles;metrics.pixelRatio=renderer.getPixelRatio();
  }
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));}
  addEventListener('resize',resize);return {render,renderer,scene,camera,metrics,async prepare(g){for(const f of g.fish)if(!fishModels.has(f.id))fishModels.set(f.id,fishModel(f));await renderer.compileAsync(scene,camera);},focusSpecies(type){focusType=type;},stopObserving(){focusType=null;}};
}
