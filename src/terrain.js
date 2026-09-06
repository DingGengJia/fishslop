// The renderer and simulation sample the same continuous, deterministic seabed.
export const TERRAIN_STEP=2;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function terrainVertexHeight(x,z){
  // Atlantis occupies a level shelf. The surrounding shelf rolls into open sea.
  const blend=smooth((Math.hypot(x,z)-54)/58);
  if(!blend)return 0;
  const shelves=6*Math.sin(x*.014)*Math.cos(z*.018);
  const dunes=1.8*Math.sin(x*.073+Math.sin(z*.035))*Math.cos(z*.047)+.55*Math.sin(x*.23+z*.11);
  const channel=Math.sin((x+35*Math.sin(z*.014))*.014);
  const trench=18*Math.exp(-channel*channel/.032);
  return blend*(-5+shelves+dunes-trench);
}
export function seabedHeight(x,z){
  // Interpolate the actual mesh triangles, including negative world coordinates.
  const gx=Math.floor(x/TERRAIN_STEP)*TERRAIN_STEP,gz=Math.floor(z/TERRAIN_STEP)*TERRAIN_STEP;
  const u=(x-gx)/TERRAIN_STEP,v=(z-gz)/TERRAIN_STEP;
  const a=terrainVertexHeight(gx,gz),b=terrainVertexHeight(gx+TERRAIN_STEP,gz),c=terrainVertexHeight(gx,gz+TERRAIN_STEP);
  if(u+v<=1)return a+(b-a)*u+(c-a)*v;
  const d=terrainVertexHeight(gx+TERRAIN_STEP,gz+TERRAIN_STEP);
  return d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function terrainNormal(x,z){
  const dx=(terrainVertexHeight(x+TERRAIN_STEP,z)-terrainVertexHeight(x-TERRAIN_STEP,z))/(TERRAIN_STEP*2);
  const dz=(terrainVertexHeight(x,z+TERRAIN_STEP)-terrainVertexHeight(x,z-TERRAIN_STEP))/(TERRAIN_STEP*2);
  const length=Math.hypot(dx,1,dz);return [-dx/length,1/length,-dz/length];
}
