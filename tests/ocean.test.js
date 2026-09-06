import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkWindow,oceanChunk,collideOcean,returnToAtlantis,CHUNK_SIZE,MAX_CHUNKS} from '../src/ocean-layout.js';
import {renderOrigin,clampCameraPosition} from '../src/world-bounds.js';
import {createGame,ensureDiversity,tick,serialize,restore,feed} from '../src/simulation.js';

test('streaming windows stay bounded over long journeys and recreate identical reefs',()=>{
  for(const p of [{x:0,z:0},{x:-.01,z:-.01},{x:1e7,z:-1e7},{x:480,z:480}]){
    const window=chunkWindow(p);assert.equal(window.length,MAX_CHUNKS);assert.equal(new Set(window.map(c=>c.key)).size,MAX_CHUNKS);
    for(const c of window){const a=oceanChunk(c.x,c.z);oceanChunk(c.x+100,c.z-2);assert.deepEqual(oceanChunk(c.x,c.z),a);}
  }
});
test('procedural rocks protect the origin city and share collision placement',()=>{
  for(const c of chunkWindow({x:0,z:0}))for(const rock of oceanChunk(c.x,c.z).rocks)assert.ok(Math.hypot(c.x*CHUNK_SIZE+rock.x,c.z*CHUNK_SIZE+rock.z)>60);
  const c=oceanChunk(9,-12),r=c.rocks[0],p={x:c.x*CHUNK_SIZE+r.x,y:r.y+r.size*.6,z:c.z*CHUNK_SIZE+r.z};collideOcean(p);assert.ok(p.y>=r.y+r.size*1.3+.65-1e-8);
});
test('pilot, feeding, camera and saves work kilometers beyond the original walls',()=>{
  const g=createGame();ensureDiversity(g);Object.assign(g.sub,{x:10000,y:12,z:-10000});
  for(let i=0;i<900;i++)tick(g,{forward:1,boost:true});
  assert.ok(g.sub.z<-10100);assert.equal(g.fish.length,72);assert.ok(g.fish.every(f=>Math.hypot(f.x-g.sub.x,f.z-g.sub.z)<75));
  feed(g);const saved=restore(serialize(g));assert.ok(saved);assert.equal(saved.sub.z,g.sub.z);assert.deepEqual(saved.food,g.food);
  const camera={x:g.sub.x+5,y:14,z:g.sub.z+5};assert.deepEqual(clampCameraPosition({...camera}),camera);
});
test('floating render origin keeps precision at distant positive and negative coordinates',()=>{
  for(const p of [{x:513,z:-513},{x:1e9+.125,z:-1e9-.375}]){const o=renderOrigin(p);assert.ok(p.x-o.x>=0&&p.x-o.x<512);assert.ok(p.z-o.z>=0&&p.z-o.z<512);assert.equal(o.x+(p.x-o.x),p.x);}
});
test('returning home preserves residents, upgrades and economy',()=>{
  const g=createGame();ensureDiversity(g);Object.assign(g.sub,{x:1000,z:-2000});for(let i=0;i<10;i++)tick(g);g.coins=1234;
  const residents=g.fish.map(f=>[f.id,f.type,f.hunger,f.meals]),upgrades={...g.upgrades};returnToAtlantis(g);
  assert.equal(g.sub.x,0);assert.equal(g.sub.z,10);assert.equal(g.sub.vx,0);assert.equal(g.coins,1234);assert.deepEqual(g.upgrades,upgrades);assert.deepEqual(g.fish.map(f=>[f.id,f.type,f.hunger,f.meals]),residents);assert.ok(restore(serialize(g)));
});

import * as THREE from 'three';
import {createOcean} from '../src/ocean.js';
test('crossing and revisiting 100 tiles reuses a fixed set of GPU instance buffers',()=>{
  const scene=new THREE.Scene(),ocean=createOcean(scene,m=>m,{value:0});
  ocean.update({x:0,z:0},{x:0,z:0},true);
  const initial=new Set();scene.traverse(o=>{if(o.isInstancedMesh)initial.add(o.instanceMatrix);});
  for(let i=1;i<=100;i++){
    const p={x:i*48,z:-i*48},origin=renderOrigin(p);
    // Repeated direction changes while the queue is still loading.
    ocean.update(p,origin);ocean.update({x:p.x+48,z:p.z},origin);ocean.update(p,origin,true);
    assert.equal(ocean.count,25);assert.equal(ocean.slots,25);
  }
  ocean.update({x:0,z:0},{x:0,z:0},true);
  const final=new Set();scene.traverse(o=>{if(o.isInstancedMesh)final.add(o.instanceMatrix);});
  assert.equal(final.size,100);assert.deepEqual(final,initial);
});
