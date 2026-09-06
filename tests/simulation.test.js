import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,feed,buy,price,serialize,restore,BOUNDS,STEP} from '../src/simulation.js';
function run(g,seconds,input={}){for(let i=0;i<seconds/STEP;i++)tick(g,input);}
test('fixed step simulation is deterministic and preserves depth limits while exploring the ocean',()=>{
  const a=createGame(10),b=createGame(10);run(a,90,{forward:1,strafe:1,vertical:1,feed:true});run(b,90,{forward:1,strafe:1,vertical:1,feed:true});assert.equal(serialize(a),serialize(b));assert.ok(a.sub.x>48&&a.sub.y<=BOUNDS.maxY&&a.sub.z<-46);assert.ok(a.food.length<=45&&a.drops.length<=100);
});
test('feeding attracts fish, grows them, and produces collectible coins',()=>{
  const g=createGame();g.fish=g.fish.slice(0,1);const f=g.fish[0];Object.assign(f,{x:0,y:6,z:10,hunger:1,target:{x:0,y:6,z:10}});run(g,45,{feed:true});assert.ok(g.meals>=3);assert.ok(f.growth>=1);assert.ok(g.earned>0);assert.ok(g.coins>80);
});
test('purchases are atomic, priced progressively, capped, and reject unknown items',()=>{
  const g=createGame();assert.equal(buy(g,'fish'),true);assert.equal(g.fish.length,6);assert.equal(g.coins,30);assert.equal(price(g,'fish'),70);assert.equal(buy(g,'food'),false);assert.equal(g.upgrades.food,0);assert.equal(buy(g,'__proto__'),false);g.coins=10000;for(let i=0;i<3;i++)assert.equal(buy(g,'food'),true);const coins=g.coins;assert.equal(buy(g,'food'),false);assert.equal(g.coins,coins);
});
test('food cooldown and entity lifetimes prevent unbounded allocation',()=>{
  const g=createGame();assert.equal(feed(g),true);assert.equal(feed(g),false);g.fish=[];run(g,30);assert.equal(g.food.length,0);g.drops.push({id:g.nextId++,x:20,y:2,z:-15,age:0,value:5});run(g,85);assert.equal(g.drops.length,0);
});
test('save roundtrip preserves economy, fish, and upgrades; corrupted saves rejected',()=>{
  const g=createGame();buy(g,'fish');run(g,2,{feed:true});const restored=restore(serialize(g));assert.equal(restored.coins,g.coins);assert.deepEqual(restored.fish,g.fish);assert.deepEqual(restored.upgrades,g.upgrades);assert.equal(restore('invalid'),null);assert.equal(restore('{}'),null);const bad=JSON.parse(serialize(g));bad.sub.x='0';assert.equal(restore(JSON.stringify(bad)),null);bad.sub.x=0;bad.upgrades.food=99;assert.equal(restore(JSON.stringify(bad)),null);
});
test('starvation never kills residents or creates negative balances',()=>{const g=createGame();run(g,500);assert.equal(g.fish.length,5);assert.ok(g.fish.every(f=>f.hunger===1));assert.ok(g.coins>=80);const earned=g.earned;run(g,100);assert.equal(g.earned,earned);});
test('reef milestone triggers exactly once and allows continued play',()=>{const g=createGame();g.coins=10000;for(let i=0;i<5;i++)buy(g,'fish');g.earned=500;tick(g);assert.equal(g.won,true);assert.equal(g.events.filter(e=>e.type==='win').length,1);run(g,1);assert.equal(g.events.filter(e=>e.type==='win').length,1);assert.equal(buy(g,'fish'),true);});
test('submarine is pushed outside reef rocks without leaving the tank',()=>{const g=createGame();Object.assign(g.sub,{x:-12,y:2,z:-5});tick(g);const d=Math.hypot((g.sub.x+12)/3.9,(g.sub.y-1.76)/3.16,(g.sub.z+5)/3.26);assert.ok(d>=.999);assert.ok(g.sub.y>=BOUNDS.minY);});
test('fish can eat food that has settled on the sand',()=>{const g=createGame();g.fish=g.fish.slice(0,1);Object.assign(g.fish[0],{x:0,y:1.3,z:0,hunger:1});g.food=[{id:g.nextId++,x:0,y:.65,z:0,age:1}];tick(g);assert.equal(g.meals,1);assert.equal(g.food.length,0);});
test('loose shoal returns to the caretaker while retaining all residents',()=>{const g=createGame();g.fish[0].x=-19;g.fish[0].z=-14;const before=Math.hypot(g.fish[0].x-g.sub.x,g.fish[0].z-g.sub.z);run(g,18);assert.ok(Math.hypot(g.fish[0].x-g.sub.x,g.fish[0].z-g.sub.z)<before-5);assert.equal(g.fish.length,5);});
