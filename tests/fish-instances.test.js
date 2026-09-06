import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFishInstances} from '../src/fish-instances.js';
test('instanced schools preserve individual body and animated tail transforms',()=>{
 const template=new THREE.Group(),pivot=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));template.add(pivot);pivot.position.z=-1;pivot.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
 const scene=new THREE.Scene(),pool=createFishInstances(scene,template,96);
 const fish=new THREE.Group();fish.position.set(32,5,-34);fish.rotation.y=.7;const body=template.clone(true);fish.add(body);body.children[1].rotation.y=.5;
 const meshes=[];body.traverse(o=>{if(o.isMesh)meshes.push(o);});pool.reset();pool.add(fish,meshes);pool.flush();
 const actual=new THREE.Matrix4();pool.parts[1].getMatrixAt(0,actual);assert.ok(actual.elements.every((v,i)=>Math.abs(v-meshes[1].matrixWorld.elements[i])<1e-5));
 assert.equal(scene.children.length,2);assert.equal(pool.parts[0].count,1);
});
test('observation filtering and resident removal clear unused instances',()=>{
 const scene=new THREE.Scene(),template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));const pool=createFishInstances(scene,template,96);
 pool.add(template,[template.children[0]]);pool.flush();assert.equal(pool.parts[0].visible,true);
 pool.reset();pool.flush();assert.equal(pool.parts[0].count,0);assert.equal(pool.parts[0].visible,false);
});
