import test from 'node:test';
import assert from 'node:assert/strict';
import {COLUMNS,GATE,collideAtlantis} from '../src/atlantis-layout.js';
import {createGame,tick,restore,serialize,STEP} from '../src/simulation.js';

test('boosting toward a temple column cannot tunnel through it',()=>{
  const c=COLUMNS[0],g=createGame();Object.assign(g.sub,{x:c.x,y:5,z:c.z+3});
  for(let i=0;i<120;i++)tick(g,{forward:1,boost:true});
  assert.ok(g.sub.z>=c.z+c.radius+.16+.65-1e-8);
});
test('the central arch is traversable at swimming height',()=>{
  const g=createGame();Object.assign(g.sub,{x:0,y:4,z:-7});
  for(let i=0;i<100;i++)tick(g,{forward:1});
  assert.ok(g.sub.z<-13,'submarine passes through the arch');
  assert.equal(g.sub.x,0);assert.equal(g.sub.y,4);
});
test('arch masonry blocks its crown but leaves the opening clear',()=>{
  const crown={x:0,y:GATE.base+GATE.spring+(GATE.inner+GATE.outer)/2,z:GATE.z};
  collideAtlantis(crown);
  assert.ok(Math.abs(crown.z-GATE.z)>=GATE.depth/2+.65-1e-8||crown.y>=GATE.base+GATE.spring+GATE.outer+.65-1e-8||crown.y<=GATE.base+GATE.spring+GATE.inner-.65+1e-8);
  const opening={x:0,y:5,z:GATE.z};collideAtlantis(opening);assert.deepEqual(opening,{x:0,y:5,z:GATE.z});
});
test('old saves inside a new column are recovered without resetting residents or coins',()=>{
  const g=createGame(),c=COLUMNS[2];Object.assign(g.sub,{x:c.x,y:4,z:c.z});g.coins=347;
  const loaded=restore(serialize(g));tick(loaded,{},STEP);
  assert.ok(Math.hypot(loaded.sub.x-c.x,loaded.sub.z-c.z)>=c.radius+.81-1e-8);
  assert.equal(loaded.coins,347);assert.equal(loaded.fish.length,g.fish.length);
  assert.ok([loaded.sub.x,loaded.sub.y,loaded.sub.z].every(Number.isFinite));
});
test('descending onto the temple steps stays above the stone',()=>{
  const g=createGame();Object.assign(g.sub,{x:1.8,y:3,z:-13.5});
  for(let i=0;i<120;i++)tick(g,{vertical:-1});
  assert.ok(g.sub.y>=.76+.65-1e-8);
});

// Regression: the old +/-21 by +/-16 aquarium limit cut through the new city.
import {CITY_PAVILIONS,CITY_BOXES,CITY_CYLINDERS} from '../src/city-layout.js';
import {BOUNDS,feed} from '../src/simulation.js';
import {clampCameraPosition} from '../src/world-bounds.js';
test('the submarine can leave the old aquarium and reach the outer city',()=>{
  const g=createGame();Object.assign(g.sub,{x:0,y:4,z:-13});
  for(let i=0;i<180;i++)tick(g,{forward:1,boost:true});
  assert.ok(g.sub.z<-30,'the old z=-16 wall no longer stops exploration');
});
test('every outer pavilion has a clear entrance, interior and exit at swimming height',()=>{
  for(const c of CITY_PAVILIONS){
    const g=createGame(),extent=c.width*(c.round?.65:.5)+.9,start=c.z+extent;Object.assign(g.sub,{x:c.x,y:3.5,z:start});
    for(let i=0;i<240&&g.sub.z>c.z-extent;i++)tick(g,{forward:1});
    assert.ok(g.sub.z<c.z-extent,`exit is blocked at pavilion ${c.x}, ${c.z}: ${g.sub.z}`);
    assert.ok(Math.abs(g.sub.x-c.x)<1e-8,'no invisible sideways push inside the passage');
    assert.ok(Math.abs(g.sub.y-3.5)<1e-8,'no invisible vertical push inside the passage');
  }
});
test('outer city pillars and roof slabs remain solid',()=>{
  const pier=CITY_BOXES.find(b=>b.part==='pier');
  const p={x:pier.x,y:3.5,z:pier.z};collideAtlantis(p);
  assert.ok(Math.abs(p.x-pier.x)>=pier.w/2+.65-1e-8||Math.abs(p.z-pier.z)>=pier.d/2+.65-1e-8);
  const roof=CITY_CYLINDERS.find(c=>c.part==='roof');
  const r={x:roof.x,y:roof.base+.01,z:roof.z};collideAtlantis(r);
  assert.ok(r.y<=roof.base-.65+1e-8||r.y>=roof.base+roof.height+.65-1e-8);
});
test('exploration positions, fish targets and food survive a save roundtrip',()=>{
  const g=createGame();Object.assign(g.sub,{x:BOUNDS.x,y:4,z:-BOUNDS.z});
  for(let i=0;i<120;i++)tick(g,{feed:true});feed(g);
  const loaded=restore(serialize(g));assert.ok(loaded);assert.deepEqual(loaded.sub,g.sub);assert.deepEqual(loaded.food,g.food);assert.deepEqual(loaded.fish,g.fish);
  const corrupt=JSON.parse(serialize(g));corrupt.sub.x=999;assert.equal(restore(JSON.stringify(corrupt)),null);
});
test('chase and observation cameras can follow the submarine beyond the old glass',()=>{
  for(const z of [-40,40]){const p={x:38,y:6,z};assert.deepEqual(clampCameraPosition({...p}),p);}
});
