import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,STEP,restore,serialize} from '../src/simulation.js';
import {angleDelta,hullDirection,updateAttitude} from '../src/pilot.js';
const run=(g,seconds,input={})=>{for(let i=0;i<seconds/STEP;i++)tick(g,input);};

test('right and diagonal movement turn the nose toward travel, without rotating camera axes',()=>{
  for(const [input,heading]of [[{strafe:1},-Math.PI/2],[{forward:1,strafe:1},-Math.PI/4]]){
    const g=createGame();run(g,1.4,input);assert.ok(Math.abs(angleDelta(g.sub.heading,heading))<.08);
    assert.equal(g.sub.yaw,0);assert.ok(hullDirection(g.sub).x>.6);
  }
});
test('backward camera-relative movement turns the hull around',()=>{
  const g=createGame();run(g,2,{forward:-1});assert.ok(hullDirection(g.sub).z>.99);
});
test('rising and diving pitch the bow in the direction of depth movement',()=>{
  for(const sign of [-1,1]){const g=createGame();run(g,.8,{vertical:sign});assert.ok(hullDirection(g.sub).y*sign>.7);assert.ok(Math.abs(g.sub.trim)<=1.05);}
});
test('turning banks the hull, then hovering levels the roll while retaining course',()=>{
  const g=createGame();run(g,.4,{strafe:1});assert.ok(g.sub.bank<-.15);run(g,1,{strafe:1});run(g,3);assert.ok(Math.abs(g.sub.bank)<.01);assert.ok(Math.abs(angleDelta(g.sub.heading,-Math.PI/2))<.05);
});
test('heading interpolation uses the short path across the wrap boundary',()=>{
  const target=-Math.PI+.03;const s={yaw:0,pitch:0,heading:Math.PI-.03,trim:0,bank:0,lastLookYaw:0,vx:-Math.sin(target),vy:0,vz:-Math.cos(target)};
  const before=s.heading;updateAttitude(s,STEP);assert.ok(Math.abs(angleDelta(before,s.heading))<.02);assert.ok(Math.abs(angleDelta(s.heading,target))<.06);
});
test('legacy saves gain hull attitude while preserving fish and coins; invalid attitude is rejected',()=>{
  const g=createGame();g.coins=345;g.sub.yaw=.7;for(const key of ['heading','trim','bank','lastLookYaw','course'])delete g.sub[key];
  const loaded=restore(serialize(g));assert.ok(loaded);assert.equal(loaded.sub.heading,.7);assert.equal(loaded.coins,345);assert.deepEqual(loaded.fish,g.fish);
  loaded.sub.trim='bad';assert.equal(restore(serialize(loaded)),null);
});

test('a brief look input completes its smooth turn even after the mouse stops',()=>{
  const g=createGame();g.sub.yaw=1.2;run(g,1.5);assert.ok(Math.abs(g.sub.heading-1.2)<.01);assert.equal(g.sub.yaw,1.2);
});
