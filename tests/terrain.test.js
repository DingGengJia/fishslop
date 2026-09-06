import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {terrainVertexHeight,seabedHeight,terrainNormal} from '../src/terrain.js';
import {createOcean} from '../src/ocean.js';
import {createGame,tick,restore,serialize,feed} from '../src/simulation.js';
import {clampCameraPosition,renderOrigin} from '../src/world-bounds.js';

test('Atlantis retains its shelf while surrounding seabed has hills and deep channels',()=>{
  for(let x=-40;x<=40;x+=10)for(let z=-30;z<=30;z+=10)assert.equal(seabedHeight(x,z),0);
  const heights=[];for(let x=100;x<600;x+=10)for(let z=-500;z<500;z+=10)heights.push(seabedHeight(x,z));
  assert.ok(Math.min(...heights)<-25);assert.ok(Math.max(...heights)>2);assert.ok(heights.every(Number.isFinite));
});
test('neighboring terrain meshes have identical edge heights and normals',()=>{
  const scene=new THREE.Scene(),ocean=createOcean(scene,m=>m,{value:0});ocean.update({x:240,z:-192},{x:0,z:0},true);
  const left=scene.children.find(g=>g.position.x===192&&g.position.z===-192).getObjectByName('OceanSeabed').geometry.attributes;
  const right=scene.children.find(g=>g.position.x===240&&g.position.z===-192).getObjectByName('OceanSeabed').geometry.attributes;
  for(let row=0;row<=24;row++){
    const a=row*25+24,b=row*25;
    assert.equal(left.position.getY(a),right.position.getY(b));
    for(const k of ['getX','getY','getZ'])assert.equal(left.normal[k](a),right.normal[k](b));
  }
  const ids=scene.children.map(g=>g.getObjectByName('OceanSeabed').geometry.uuid).sort();
  ocean.update({x:1e6,z:-1e6},renderOrigin({x:1e6,z:-1e6}),true);
  assert.deepEqual(scene.children.map(g=>g.getObjectByName('OceanSeabed').geometry.uuid).sort(),ids);
});
test('collision height interpolates each of the rendered triangles',()=>{
  for(const [x,z]of [[240,-192],[-242,190],[1e9,-1e9]]){
    const a=terrainVertexHeight(x,z),b=terrainVertexHeight(x+2,z),c=terrainVertexHeight(x,z+2),d=terrainVertexHeight(x+2,z+2);
    assert.ok(Math.abs(seabedHeight(x+.5,z+.5)-(a*.5+b*.25+c*.25))<1e-6);
    assert.ok(Math.abs(seabedHeight(x+1.5,z+1.5)-(d*.5+b*.25+c*.25))<1e-6);
    assert.ok(Math.abs(Math.hypot(...terrainNormal(x,z))-1)<1e-9);
  }
});
test('submarine dives below the old floor, stops above terrain and restores its depth',()=>{
  const g=createGame();Object.assign(g.sub,{x:420,z:-380,y:2});
  for(let i=0;i<900;i++)tick(g,{vertical:-1,boost:true});
  assert.ok(g.sub.y< -15);assert.ok(g.sub.y>=seabedHeight(g.sub.x,g.sub.z)+1.3-1e-8);
  const restored=restore(serialize(g));assert.ok(restored);assert.equal(restored.sub.y,g.sub.y);
  const origin=renderOrigin(g.sub),camera={x:g.sub.x-origin.x,y:-60,z:g.sub.z-origin.z};clampCameraPosition(camera,origin);assert.ok(camera.y>=seabedHeight(g.sub.x,g.sub.z)+1);
});
test('food and coins settle on the local seabed instead of the old zero plane',()=>{
  const g=createGame();g.fish=[];const x=420,z=-380,bed=seabedHeight(x,z);Object.assign(g.sub,{x,y:bed+3,z});feed(g);
  const coin={id:g.nextId++,x:x+20,y:seabedHeight(x+20,z)+1.3,z,age:0,value:5};g.drops.push(coin);
  for(let i=0;i<600;i++)tick(g);
  assert.ok(g.food.length>0);for(const p of g.food)assert.ok(Math.abs(p.y-seabedHeight(p.x,p.z)-.65)<1e-8);
  assert.ok(Math.abs(coin.y-seabedHeight(coin.x,coin.z)-1)<1e-8);
});
