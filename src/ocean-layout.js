import {seabedHeight} from './terrain.js';
// Deterministic, bounded streaming: world coordinates persist, tiles do not.
export const CHUNK_SIZE=48, CHUNK_RADIUS=2, MAX_CHUNKS=(CHUNK_RADIUS*2+1)**2;
export const BIOMES=['珊瑚花园','海藻森林','远洋礁原'];
export const chunkAt=p=>({x:Math.floor(p.x/CHUNK_SIZE),z:Math.floor(p.z/CHUNK_SIZE)});
export const chunkKey=(x,z)=>`${x},${z}`;
export function chunkWindow(p){
  const c=chunkAt(p),chunks=[];
  for(let z=c.z-CHUNK_RADIUS;z<=c.z+CHUNK_RADIUS;z++)for(let x=c.x-CHUNK_RADIUS;x<=c.x+CHUNK_RADIUS;x++)chunks.push({x,z,key:chunkKey(x,z)});
  return chunks.sort((a,b)=>(a.x-c.x)**2+(a.z-c.z)**2-((b.x-c.x)**2+(b.z-c.z)**2));
}
export function oceanBiome(x,z){const seed=(Math.imul(x,73856093)^Math.imul(z,19349663)^7142)>>>0;return Math.floor(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296*3);}
export function oceanChunk(x,z){
  let seed=(Math.imul(x,73856093)^Math.imul(z,19349663)^7142)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const biome=Math.floor(random()*3),rocks=[],plants=[],corals=[],grass=[];
  const point=()=>({x:4+random()*40,z:4+random()*40,angle:random()*Math.PI*2});
  const clear=p=>Math.hypot(x*CHUNK_SIZE+p.x,z*CHUNK_SIZE+p.z)>60;
  for(let i=0;i<7;i++){const p=point(),size=1.2+random()*2.8;if(clear(p))rocks.push({...p,size});}
  for(let i=0;i<(biome===1?22:9);i++){const p=point(),height=biome===1?4+random()*6:2+random()*3;if(clear(p))plants.push({...p,height});}
  for(let i=0;i<(biome===0?22:8);i++){const p=point(),size=.7+random()*1.7;if(clear(p))corals.push({...p,size});}
  for(let i=0;i<64;i++){const p=point(),size=.4+random();if(clear(p))grass.push({...p,size});}
  for(const p of [...rocks,...plants,...corals,...grass])p.y=seabedHeight(x*CHUNK_SIZE+p.x,z*CHUNK_SIZE+p.z);
  return {x,z,biome,rocks,plants,corals,grass};
}
// A tiny collision cache, independent of the renderer and its loading queue.
const collisionChunks=new Map();
export function collideOcean(p){
  const c=chunkAt(p);
  for(const [key,tile]of collisionChunks)if(Math.abs(tile.x-c.x)>1||Math.abs(tile.z-c.z)>1)collisionChunks.delete(key);
  for(let z=c.z-1;z<=c.z+1;z++)for(let x=c.x-1;x<=c.x+1;x++){
    const key=chunkKey(x,z);let tile=collisionChunks.get(key);
    if(!tile){tile=oceanChunk(x,z);collisionChunks.set(key,tile);}
    for(const r of tile.rocks){
      const rx=r.size+.7,ry=r.size*.7+.65,rz=r.size*.82+.7;
      const cx=x*CHUNK_SIZE+r.x,cz=z*CHUNK_SIZE+r.z,cy=r.y+r.size*.6;
      let dx=(p.x-cx)/rx,dy=(p.y-cy)/ry,dz=(p.z-cz)/rz,l=Math.hypot(dx,dy,dz);
      if(l<1){if(l<1e-8){dx=dz=0;dy=1;l=1;}p.x=cx+dx/l*rx;p.y=cy+dy/l*ry;p.z=cz+dz/l*rz;}
    }
  }
}
export function returnToAtlantis(g){
  // Keep residents and economy, bring the travelling shoal back with the pilot.
  const dx=-g.sub.x,dz=10-g.sub.z,dy=7-g.sub.y;
  for(const f of g.fish){f.x+=dx;f.z+=dz;f.target.x+=dx;f.target.z+=dz;f.y=Math.max(seabedHeight(f.x,f.z)+1.3,Math.min(17,f.y+dy));f.target.y=Math.max(seabedHeight(f.target.x,f.target.z)+1.3,Math.min(17,f.target.y+dy));}
  Object.assign(g.sub,{x:0,y:7,z:10,yaw:0,pitch:0,vx:0,vy:0,vz:0,heading:0,trim:0,bank:0,lastLookYaw:0,course:0});
}
