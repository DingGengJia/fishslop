import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGame,ensureDiversity,addFish,buy,price,serialize,restore,tick,STEP} from '../src/simulation.js';
import {MAX_RESIDENTS,SPECIES} from '../src/species.js';
import {createSpeciesModels} from '../src/species-models.js';
test('diversity migration adds every new species once and preserves existing residents and economy',()=>{
 const g=createGame(),before=JSON.stringify(g.fish);g.coins=875;assert.equal(ensureDiversity(g),true);assert.equal(g.fish.length,72);assert.equal(JSON.stringify(g.fish.slice(0,5)),before);assert.equal(g.coins,875);for(const type of [3,4,5,6,7,8,9,10,11,12,13,14,15])assert.ok(g.fish.some(f=>f.type===type));assert.equal(ensureDiversity(g),false);assert.equal(g.fish.length,72);
 const loaded=restore(serialize(g));assert.ok(loaded);assert.equal(ensureDiversity(loaded),false);assert.deepEqual(loaded.fish,g.fish);
});
test('species purchases charge the selected species and reject invalid identifiers atomically',()=>{
 const g=createGame();g.coins=10000;const cost=price(g,'fish:5');assert.equal(buy(g,'fish:5'),true);assert.equal(g.fish.at(-1).type,5);assert.equal(g.coins,10000-cost);
 for(const item of ['fish:16','fish:-1','fish:NaN','fish:01']){const coins=g.coins;assert.equal(buy(g,item),false);assert.equal(g.coins,coins);}
 while(g.fish.length<MAX_RESIDENTS)addFish(g,6);assert.equal(addFish(g,4),false);assert.equal(buy(g,'fish:4'),false);assert.ok(restore(serialize(g)));
});
test('new species survive simulation/save roundtrip while drifting and swimming at distinct speeds',()=>{
 const g=createGame();g.fish=[];const jelly=addFish(g,6),dolphin=addFish(g,5);
 for(const f of g.fish)Object.assign(f,{x:0,y:8,z:7,target:{x:4,y:8,z:7}});
 for(let n=0;n<60;n++)tick(g,{},STEP);assert.ok(dolphin.x>jelly.x*4);assert.ok(restore(serialize(g)));
 const bad=JSON.parse(serialize(g));bad.fish[0].type=16;assert.equal(restore(JSON.stringify(bad)),null);
});
test('original new-species geometry remains finite and within the runtime triangle budget',()=>{
 const models=createSpeciesModels();assert.equal(models.length,SPECIES.length-3);
 for(const [i,model]of models.entries()){let triangles=0;model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));for(const attr of Object.values(o.geometry.attributes))assert.equal(attr.count,o.geometry.attributes.position.count,`${o.name}: mismatched vertex attribute count`);}});assert.ok(triangles<10000,`${SPECIES[i+3].name}: ${triangles} triangles`);const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert.ok(size.x>0&&size.y>0&&size.z>0);}
 assert.ok(models[0].getObjectByName('TailPivot'));assert.ok(models[2].getObjectByName('TailPivot'));assert.ok(models[3].getObjectByName('BellPivot'));
});

test('version 6 saves receive only the new arrivals and full aquariums retain all existing animals',()=>{
 const g=createGame();while(g.fish.length<32)addFish(g,0);g.rosterVersion=1;const before=JSON.stringify(g.fish);g.coins=1000;
 assert.equal(ensureDiversity(g),true);assert.equal(g.fish.length,87);assert.equal(JSON.stringify(g.fish.slice(0,32)),before);assert.equal(g.coins,1000);assert.ok(restore(serialize(g)));assert.equal(ensureDiversity(g),false);
});
test('large-animal limits and multi-digit species purchases are atomic',()=>{
 const g=createGame();g.coins=10000;assert.equal(buy(g,'fish:10'),true);assert.equal(g.fish.at(-1).type,10);assert.equal(buy(g,'fish:11'),true);
 assert.equal(buy(g,'fish:7'),true);assert.equal(buy(g,'fish:7'),true);const coins=g.coins;assert.equal(buy(g,'fish:7'),false);assert.equal(g.coins,coins);
});
test('whales stay clear of glass and the sand even while food lies near a boundary',()=>{
 const g=createGame(),whale=addFish(g,7);g.food=[{id:g.nextId++,x:21,y:7.5,z:15,age:0}];
 for(let i=0;i<3600;i++){tick(g,{},STEP);assert.ok(Math.abs(whale.x)<=17&&Math.abs(whale.z)<=11&&whale.y>=8&&whale.y<=16);}
 assert.ok(restore(serialize(g)));
});


test('vertical fish tails extend behind their pivots and dolphin flukes remain horizontal',()=>{
 const models=createSpeciesModels();
 for(const index of [0,1,7,8]){const tail=models[index].getObjectByName('TailPivot'),box=new THREE.Box3().setFromObject(tail);assert.ok(box.max.z<=tail.position.z+.12,`${SPECIES[index+3].name}: tail points into the body`);assert.ok(box.min.z<tail.position.z-.2);}
 const sizeOf=i=>new THREE.Box3().setFromObject(models[i].getObjectByName('TailPivot')).getSize(new THREE.Vector3());
 const shark=sizeOf(1),dolphin=sizeOf(2);assert.ok(shark.y>shark.x*3);assert.ok(dolphin.x>dolphin.y*3);
});


test('existing Atlantis saves receive 43 arrivals once and full saves preserve every resident',()=>{
  const g=createGame();while(g.fish.length<29)addFish(g,0);g.rosterVersion=2;g.coins=590;
  const originals=JSON.stringify(g.fish);ensureDiversity(g);assert.equal(g.fish.length,72);
  assert.equal(JSON.stringify(g.fish.slice(0,29)),originals);assert.equal(g.coins,590);
  const loaded=restore(serialize(g));assert.ok(loaded);assert.equal(ensureDiversity(loaded),false);assert.equal(loaded.fish.length,72);
  const full=createGame();while(full.fish.length<MAX_RESIDENTS)addFish(full,0);full.rosterVersion=2;
  const before=JSON.stringify(full.fish);ensureDiversity(full);assert.equal(JSON.stringify(full.fish),before);assert.ok(restore(serialize(full)));
});
test('new schools spread across distinct targets and remain valid through feeding and saving',()=>{
 const g=createGame();ensureDiversity(g);for(let i=0;i<600;i++)tick(g,{feed:i%60===0});
 const centers=[12,13,14,15].map(type=>{const f=g.fish.find(f=>f.type===type);return f.target;});
 assert.ok(Math.max(...centers.map(p=>p.x))-Math.min(...centers.map(p=>p.x))>3);
 assert.ok(restore(serialize(g)));assert.equal(g.fish.length,72);assert.ok(g.meals>0);
});
