export const WORLD_BOUNDS = {x:48,z:46,minY:1.3,maxY:19};
export const CAMERA_BOUNDS = {x:WORLD_BOUNDS.x+7,z:WORLD_BOUNDS.z+7,minY:1,maxY:20.4};
export function clampCameraPosition(p){
  p.x=Math.max(-CAMERA_BOUNDS.x,Math.min(CAMERA_BOUNDS.x,p.x));
  p.y=Math.max(CAMERA_BOUNDS.minY,Math.min(CAMERA_BOUNDS.maxY,p.y));
  p.z=Math.max(-CAMERA_BOUNDS.z,Math.min(CAMERA_BOUNDS.z,p.z));
  return p;
}
