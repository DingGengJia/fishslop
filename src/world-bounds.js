import {seabedHeight} from './terrain.js';
// Horizontal exploration has no gameplay walls. The sea surface and seabed remain.
export const WORLD_BOUNDS={x:Infinity,z:Infinity,minY:-40,maxY:19};
export const CAMERA_BOUNDS={x:Infinity,z:Infinity,minY:-40,maxY:20.4};
export const MAX_SAVE_COORDINATE=1e12;
export function clampCameraPosition(p,origin={x:0,z:0}){
  p.y=Math.max(seabedHeight(p.x+origin.x,p.z+origin.z)+1,Math.min(CAMERA_BOUNDS.maxY,p.y));return p;
}
// Keep GPU matrices near zero, even on long expeditions.
export function renderOrigin(p){return {x:Math.floor(p.x/512)*512,z:Math.floor(p.z/512)*512};}
