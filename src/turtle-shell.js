import * as THREE from 'three';
// Planar scute atlas: central vertebral plates, four costal pairs and marginal plates.
export function turtleShellMaterial(){
  const size=384,data=new Uint8Array(size*size*4),seeds=[];
  for(let i=0;i<5;i++)seeds.push([0,-.72+i*.36]);
  for(const side of [-1,1])for(let i=0;i<4;i++)seeds.push([side*.57,-.57+i*.38]);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x/(size-1)*2-1,pz=y/(size-1)*2-1,r=Math.hypot(px,pz);let first=Infinity,second=Infinity,cell=0;
    seeds.forEach(([sx,sz],i)=>{const d=Math.hypot((px-sx)*.9,pz-sz);if(d<first){second=first;first=d;cell=i;}else if(d<second)second=d;});
    const margin=r>.82,border=margin?(Math.abs(Math.sin(Math.atan2(pz,px)*12))<.085||Math.abs(r-.84)<.016):(second-first<.024);
    const streak=Math.sin(px*85+pz*34+Math.sin(pz*21))*2.8+Math.sin(px*28-pz*19)*3;
    const mottling=5*Math.sin(cell*4.7)+streak+8*Math.cos(first*15),base=border?[47,53,31]:[106+mottling,105+mottling,57+mottling*.6],i=(y*size+x)*4;
    data.set([...base.map(c=>THREE.MathUtils.clamp(c,0,255)),255],i);
  }
  const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  return new THREE.MeshStandardMaterial({map,roughness:.47,metalness:.02});
}
