import {CITY_BOXES,CITY_CYLINDERS,CITY_DOMES} from './city-layout.js';
// Shared by rendering and physics: meters, with the temple entrance facing +Z.
export const COLUMNS = [
  ...[-6.4,6.4].flatMap(x=>[-10.5,-15].map(z=>({x,z,height:7.2,base:.75,radius:.48}))),
  ...[-15.8,15.8].flatMap((x,side)=>[-9,-2,5].map((z,i)=>({x,z,height:i===1?3.2:5.8,base:0,radius:.46,broken:i===1,lean:side?-.03:.03}))),
];
export const TEMPLE_STEPS = [
  {x:0,y:.14,z:-12.8,w:16,h:.28,d:9},
  {x:0,y:.4,z:-13.1,w:15,h:.24,d:8},
  {x:0,y:.64,z:-13.4,w:14,h:.24,d:7},
];
export const DAIS = [{radius:2.5,height:.24,y:.89},{radius:2.17,height:.23,y:1.12},{radius:1.8,height:.18,y:1.33}];
export const GATE = {x:0,z:-10.5,base:.76,spring:5.1,inner:3.05,outer:3.85,depth:.85};
const BOXES=[...TEMPLE_STEPS,...CITY_BOXES,
  ...COLUMNS.filter(c=>c.broken).map(c=>({x:c.x+1.4,y:.5,z:c.z+1.1,w:3.1,h:1.2,d:1.8})),
  ...[-1,1].map(side=>({x:side*(GATE.inner+GATE.outer)/2,y:GATE.base+GATE.spring/2,z:GATE.z,w:GATE.outer-GATE.inner,h:GATE.spring,d:GATE.depth})),
  ...[-1,1].map(side=>({x:side*6.4,y:8.15,z:-12.75,w:1.8,h:.7,d:6.5})),
  ...[-1,1].map(side=>({x:side*5,y:9.1,z:-12.5,w:3.6,h:1.5,d:1.3})),
];
const SOLID_CYLINDERS=[...CITY_CYLINDERS.map(c=>({...c,radius:c.radius-.16})),...COLUMNS.map(c=>({...c,height:c.height+.35})),...DAIS.map(c=>({x:0,z:-14.6,base:c.y-c.height/2,height:c.height,radius:c.radius-.16}))];
export function collideAtlantis(p,radius=.65){
  for(const c of SOLID_CYLINDERS){
    if(p.y<c.base-radius||p.y>c.base+c.height+radius)continue;
    const dx=p.x-c.x,dz=p.z-c.z,len=Math.hypot(dx,dz),limit=c.radius+.16+radius;
    if(len<limit){
      const bottom=c.base-radius,top=c.base+c.height+radius;
      const vertical=Math.min(p.y-bottom,top-p.y);
      if(vertical<limit-len)p.y=p.y-bottom<top-p.y?bottom:top;
      else {p.x=c.x+(len>1e-8?dx/len:1)*limit;p.z=c.z+(len>1e-8?dz/len:0)*limit;}
    }
  }
  for(const b of BOXES){
    const dx=p.x-b.x,dy=p.y-b.y,dz=p.z-b.z;
    const ox=b.w/2+radius-Math.abs(dx),oy=b.h/2+radius-Math.abs(dy),oz=b.d/2+radius-Math.abs(dz);
    if(ox<=0||oy<=0||oz<=0)continue;
    if(oy<=ox&&oy<=oz)p.y+=(dy<0?-1:1)*oy;
    else if(ox<=oz)p.x+=(dx<0?-1:1)*ox;
    else p.z+=(dz<0?-1:1)*oz;
  }
  for(const dome of CITY_DOMES){
    if(p.y<dome.height)continue;
    const dx=p.x-dome.x,dy=p.y-(dome.height+.15),dz=p.z-dome.z;
    const length=Math.hypot(dx,dy,dz),limit=dome.width*.8+radius;
    if(length<limit){const k=limit/Math.max(length,1e-8);p.x=dome.x+dx*k;p.y=dome.height+.15+(length>1e-8?dy*k:limit);p.z=dome.z+dz*k;}
  }
  // Annular half-cylinder allows an open archway instead of a solid header box.
  const dx=p.x-GATE.x,dy=p.y-(GATE.base+GATE.spring),dz=p.z-GATE.z;
  if(dy>=0&&Math.abs(dz)<GATE.depth/2+radius){
    const len=Math.hypot(dx,dy),inner=GATE.inner-radius,outer=GATE.outer+radius;
    if(len>inner&&len<outer){
      const radial=Math.min(len-inner,outer-len),depth=GATE.depth/2+radius-Math.abs(dz);
      if(depth<radial)p.z=GATE.z+(dz<0?-1:1)*(GATE.depth/2+radius);
      else {const target=len-inner<outer-len?inner:outer;p.x=GATE.x+dx/len*target;p.y=GATE.base+GATE.spring+dy/len*target;}
    }
  }
}
