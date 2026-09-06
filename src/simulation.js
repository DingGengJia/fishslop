import { updateAttitude } from './pilot.js';
import { SPECIES, MAX_RESIDENTS, speciesOf, validSpecies } from './species.js';
// Rendering-independent fixed-step simulation. All coordinates are in tank meters.
export const BOUNDS = { x: 21, z: 16, minY: 1.3, maxY: 19 };
export const STEP = 1 / 60;
export const REEFS=[[-12,-5,3.2],[11,-8,3.8],[-15,9,3.2],[14,8,3.6],[-6,-13,2.1],[20,-1,2.6],[-21,-8,2.5],[-7,5,2.4],[8,4,2.7]];
// Smooth ellipsoid colliders approximate the reef rocks; plants remain non-solid.
const ROCKS=REEFS.flatMap(([x,z,s])=>[[x,z,s],[x+s*.7,z+1,s*.65],[x-1,z+s*.6,s*.55]]);
function collideReef(p) {
  for(const [x,z,size]of ROCKS){
    const rx=size+.7,ry=size*.8+.6,rz=size*.8+.7;
    let dx=(p.x-x)/rx,dy=(p.y-size*.55)/ry,dz=(p.z-z)/rz;
    const length=Math.hypot(dx,dy,dz);
    if(length<1){if(length<.00001){dy=1;dx=dz=0;}else{dx/=length;dy/=length;dz/=length;}p.x=x+dx*rx;p.y=size*.55+dy*ry;p.z=z+dz*rz;}
  }
}
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const bounded = p => { p.x=clamp(p.x,-BOUNDS.x,BOUNDS.x);p.y=clamp(p.y,BOUNDS.minY,BOUNDS.maxY);p.z=clamp(p.z,-BOUNDS.z,BOUNDS.z); };
export function createGame(seed=7142) {
  const g={version:1,seed,time:0,nextId:1,coins:80,earned:0,meals:0,fish:[],food:[],drops:[],events:[],cooldown:0,upgrades:{food:0,speed:0,magnet:0},sub:{x:0,y:7,z:10,yaw:0,pitch:0,vx:0,vy:0,vz:0,heading:0,trim:0,bank:0,lastLookYaw:0,course:0},won:false};
  for(let i=0;i<5;i++) {
    const f=addFish(g,i%3);
    f.x=[-4.8,-2.3,3.8,5.8,-6.8][i];f.y=[6.3,8.2,6.8,8.8,5.1][i];f.z=[5.6,1.8,4.2,-.5,-1.5][i];
    f.yaw=i%2?1.1:-1.1;
  }
  return g;
}
function random(g) { g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296; }
function target(g,type=0) {
  const sp=speciesOf(type),radius=sp.length>1?6:2.5;
  if(sp.kind==='whale')return {x:(random(g)-.5)*22,y:10+random(g)*4,z:(random(g)-.5)*14};
  if(sp.kind==='ray')return {x:(random(g)-.5)*26,y:7+random(g)*7,z:(random(g)-.5)*20};
  return {x:clamp(g.sub.x+(random(g)-.5)*radius*2,-18,18),y:clamp(g.sub.y+(random(g)-.5)*(sp.kind==='jelly'?2:3),2,17),z:clamp(g.sub.z-2.5+(random(g)-.5)*radius*1.5,-14,14)};
}
export function canAddSpecies(g,type){return validSpecies(type)&&g.fish.length<MAX_RESIDENTS&&g.fish.filter(f=>f.type===type).length<(speciesOf(type).limit||MAX_RESIDENTS);}
export function addFish(g,type=g.fish.length%SPECIES.length) {
  if(!canAddSpecies(g,type))return false;
  const p=target(g,type);const f={id:g.nextId++,...p,type,hunger:.35,meals:0,growth:0,coinTimer:10+random(g)*10,target:target(g,type),yaw:0};
  g.fish.push(f);return f;
}
// One-time complimentary arrivals, including existing saves. Never remove residents.
export function ensureDiversity(g) {
  if(g.rosterVersion===2)return false;
  if(g.rosterVersion!==1)for(const type of [4,5,3,6,3,3,6,0,1,2,3,6])addFish(g,type);
  for(const type of [7,8,9,10,11,10,10,10,10,11,11,11])addFish(g,type);
  g.rosterVersion=2;return true;
}
function purchaseType(item){if(item==='fish')return -1;const match=/^fish:(0|[1-9][0-9]*)$/.exec(item);return match&&validSpecies(Number(match[1]))?Number(match[1]):null;}
export function price(g,item){
  const type=purchaseType(item);
  if(type!==null)return (type<0?50:speciesOf(type).cost)+Math.max(0,g.fish.length-(g.rosterVersion===2?29:g.rosterVersion===1?17:5))*20;
  return ({food:90,speed:100,magnet:120}[item]??Infinity)*(1+(g.upgrades[item]||0));
}
export function buy(g,item) {
  const type=purchaseType(item),isFish=type!==null;
  if(!isFish&&!['food','speed','magnet'].includes(item))return false;
  const chosen=type<0?g.fish.length%SPECIES.length:type;
  if(isFish?!canAddSpecies(g,chosen):g.upgrades[item]>=3)return false;
  const cost=price(g,item);if(g.coins<cost)return false;
  g.coins-=cost;
  if(isFish)addFish(g,chosen);else g.upgrades[item]++;
  g.events.push({type:'purchase',item});return true;
}
export function feed(g) {
  if(g.cooldown>0||g.food.length>=45)return false;
  g.cooldown=.45;
  const count=Math.min(2+g.upgrades.food,45-g.food.length);
  const heading=g.sub.heading??g.sub.yaw;
  for(let i=0;i<count;i++)g.food.push({id:g.nextId++,x:g.sub.x+Math.sin(heading)*.5+(random(g)-.5)*.8,y:g.sub.y-.8,z:g.sub.z+Math.cos(heading)*.5,age:0});
  g.events.push({type:'feed'});return true;
}
export function tick(g,input={},dt=STEP) {
  if(!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.05);g.time+=dt;g.cooldown=Math.max(0,g.cooldown-dt);
  const s=g.sub;
  s.yaw+=(input.turn||0)*dt*1.5;
  s.pitch=clamp(s.pitch+(input.pitch||0)*dt*.8,-.7,.7);
  const speed=(4.8+g.upgrades.speed*1.1)*(input.boost?1.65:1);
  let forward=input.forward||0, strafe=input.strafe||0, vertical=input.vertical||0;
  const len=Math.max(1,Math.hypot(forward,strafe,vertical));forward/=len;strafe/=len;vertical/=len;
  const tx=(-Math.sin(s.yaw)*forward*Math.cos(s.pitch)+Math.cos(s.yaw)*strafe)*speed;
  const tz=(-Math.cos(s.yaw)*forward*Math.cos(s.pitch)-Math.sin(s.yaw)*strafe)*speed;
  const ty=(Math.sin(s.pitch)*forward+vertical)*speed;
  const smooth=1-Math.exp(-dt*4);
  s.vx+=(tx-s.vx)*smooth;s.vy+=(ty-s.vy)*smooth;s.vz+=(tz-s.vz)*smooth;
  s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;collideReef(s);bounded(s);
  updateAttitude(s,dt);
  if(input.feed)feed(g);
  for(const p of g.food){p.age+=dt;p.y=Math.max(.65,p.y-dt*.65);}
  g.food=g.food.filter(p=>p.age<24);
  for(const f of g.fish) {
    const sp=speciesOf(f.type),openWater=sp.kind==='whale'||sp.kind==='ray';
    f.hunger=Math.min(1,f.hunger+dt*.009);
    let meal=null,best=Infinity;
    if(f.hunger>.13)for(const p of g.food){const d=distance(f,p);if(d<best&&(!openWater||p.y>7)){best=d;meal=p;}}
    // Curious residents stay in a loose shoal around their caretaker.
    if(!meal&&!openWater&&distance(f,g.sub)>(sp.length>1?10:5))f.target=target(g,f.type);
    if(!meal&&sp.kind==='school')f.target={x:clamp(g.sub.x-2+Math.cos(g.time*.18)*1.6+(f.id%4)*.22,-18,18),y:clamp(g.sub.y-.6+(f.id%3)*.16,2,17),z:clamp(g.sub.z-3+Math.sin(g.time*.18)*1.6+Math.floor(f.id%8/4)*.22,-14,14)};
    const goal=meal||f.target;
    const d=distance(f,goal);
    const speed=sp.kind==='jelly'?sp.speed*(.7+.5*Math.sin(g.time*2+f.id)**2):meal?Math.max(1.1,sp.speed*1.8):sp.speed;
    if(d>.05){const ratio=Math.min(1,speed*dt/d);f.x+=(goal.x-f.x)*ratio;f.y+=(goal.y-f.y)*ratio;f.z+=(goal.z-f.z)*ratio;f.yaw=Math.atan2(-(goal.x-f.x),-(goal.z-f.z));}
    if(meal&&d<.9){
      g.food=g.food.filter(p=>p.id!==meal.id);f.hunger=Math.max(0,f.hunger-.44);f.meals++;g.meals++;
      f.growth=Math.min(2,Math.floor(f.meals/3));
      g.drops.push({id:g.nextId++,x:f.x,y:f.y,z:f.z,age:0,value:5+f.growth*5});
      g.events.push({type:'eat',x:f.x,y:f.y,z:f.z});
    }else if(!meal&&d<.4)f.target=target(g,f.type);
    // Hungry fish remain alive, but stop generating passive income.
    f.coinTimer-=dt;
    if(f.coinTimer<=0){f.coinTimer=16+random(g)*9;if(f.hunger<.7)g.drops.push({id:g.nextId++,x:f.x,y:f.y,z:f.z,age:0,value:5+f.growth*5});}
    bounded(f);
    if(openWater){const margin=sp.kind==='whale'?7:3;f.x=clamp(f.x,-24+margin,24-margin);f.z=clamp(f.z,-18+margin,18-margin);f.y=clamp(f.y,sp.kind==='whale'?8:6,16);}

  }
  const radius=3.8+g.upgrades.magnet*2;
  for(const coin of g.drops) {
    coin.age+=dt;coin.y=Math.max(1,coin.y-dt*.12);
    const d=distance(coin,s);
    if(d<radius){const n=Math.min(1,dt*7);coin.x+=(s.x-coin.x)*n;coin.y+=(s.y-coin.y)*n;coin.z+=(s.z-coin.z)*n;}
    if(d<1.25){g.coins+=coin.value;g.earned+=coin.value;coin.collected=true;g.events.push({type:'coin',value:coin.value});}
  }
  g.drops=g.drops.filter(c=>!c.collected&&c.age<80).slice(-100);
  if(!g.won&&g.fish.length>=10&&g.earned>=500){g.won=true;g.events.push({type:'win'});}
}
export function serialize(g) {const {events,...data}=g;return JSON.stringify(data);}
export function restore(raw) {
  try{
    if(typeof raw!=='string'||raw.length>500000)return null;
    const g=JSON.parse(raw);
    if(g.version!==1||!Array.isArray(g.fish)||g.fish.length<1||g.fish.length>MAX_RESIDENTS)return null;
    const finite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
    const position=p=>p&&finite(p.x,-30,30)&&finite(p.y,0,25)&&finite(p.z,-25,25);
    if(!position(g.sub)||!['yaw','pitch','vx','vy','vz'].every(k=>finite(g.sub[k],-1e9,1e9)))return null;
    if(!['coins','earned','meals','time','nextId','seed','cooldown'].every(k=>finite(g[k],0,1e12)))return null;
    if(!g.upgrades||!['food','speed','magnet'].every(k=>Number.isInteger(g.upgrades[k])&&finite(g.upgrades[k],0,3)))return null;
    if(!g.fish.every(f=>position(f)&&position(f.target)&&finite(f.hunger,0,1)&&finite(f.growth,0,2)&&finite(f.meals,0,1e9)&&finite(f.coinTimer,-1,100)&&finite(f.yaw,-10,10)&&validSpecies(f.type)&&finite(f.id,1,1e12)))return null;
    if(!Array.isArray(g.food)||g.food.length>45||!g.food.every(p=>position(p)&&finite(p.age,0,25)&&finite(p.id,1,1e12)))return null;
    if(!Array.isArray(g.drops)||g.drops.length>100||!g.drops.every(p=>position(p)&&finite(p.age,0,81)&&finite(p.value,1,15)&&finite(p.id,1,1e12)))return null;
    const ids=[...g.fish,...g.food,...g.drops].map(p=>p.id);
    if(new Set(ids).size!==ids.length||g.nextId<=Math.max(...ids))return null;
    // Migrate old saves without discarding the aquarium or its economy.
    for(const [key,fallback,min,max] of [['heading',g.sub.yaw,-1e9,1e9],['trim',g.sub.pitch,-1.05,1.05],['bank',0,-.32,.32],['lastLookYaw',g.sub.yaw,-1e9,1e9],['course',g.sub.heading??g.sub.yaw,-1e9,1e9]]){
      if(g.sub[key]===undefined)g.sub[key]=fallback;
      else if(!finite(g.sub[key],min,max))return null;
    }
    g.events=[];g.sub.vx=g.sub.vy=g.sub.vz=0;g.sub.bank=0;bounded(g.sub);return g;
  }catch{return null;}
}
