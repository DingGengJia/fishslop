import * as THREE from 'three';
import {batchMeshes} from './reef.js';
import {consolidateFishMaterials} from './fish-materials.js';
import {speciesOf} from './species.js';

export function prepareSpeciesModel(body,type,maxAnisotropy=4){
    const pivots=[];
    body.traverse(o=>{
      if(!o.isMesh&&/Pivot/.test(o.name))pivots.push(o);
      if(o.isMesh){
        o.castShadow=speciesOf(type).length>=1;o.receiveShadow=false;
        if(o.material.transparent){o.material.side=THREE.DoubleSide;o.material.depthWrite=false;o.castShadow=false;}
        if(o.material.name.startsWith('Pearlescent skin')){o.material.roughness=.48;o.material.metalness=.04;}
        if(o.material.name.startsWith('Fin membrane')){o.material.color.set(['#eab566','#69bccb','#bb77bf'][type%3]);o.material.roughness=.55;o.material.envMapIntensity=.2;}
        if(o.material.name.startsWith('Fin rays'))o.material.color.set(['#efd198','#9dd9de','#d1a4d6'][type%3]);
        if(o.material.map)o.material.map.anisotropy=Math.min(4,maxAnisotropy);
      }
    });
    const shell=body.getObjectByName('Carapace'),shellLength=shell?new THREE.Box3().setFromObject(shell).getSize(new THREE.Vector3()).z:null;
    consolidateFishMaterials(body);
    batchMeshes(body,pivots,true);for(const pivot of pivots)batchMeshes(pivot,[],true);
    body.traverse(o=>{if(o.isMesh){o.castShadow=speciesOf(type).length>=1&&!o.material.transparent;o.receiveShadow=false;}});
    const size=new THREE.Box3().setFromObject(body).getSize(new THREE.Vector3());
    return {body,length:shellLength||(speciesOf(type).axis==='x'?size.x:size.z)};

}
