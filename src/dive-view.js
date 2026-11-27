import {gunzipSync} from 'three/addons/libs/fflate.module.js';
import {speciesOf, adultScale} from './species.js';
import {seabedHeight} from './terrain.js';
import {clampCameraPosition} from './world-bounds.js';

const vertexSource = `#version 300 es
layout(location=0) in vec3 position;
layout(location=1) in vec3 color;
uniform vec3 offset, scale, attitude;
uniform mat3 view;
uniform vec2 lens;
uniform float unit, time, swim;
out vec3 tint, local;
out float depth;
void main() {
  vec3 p = position * unit;
  p.x += swim * smoothstep(0.0,0.5,p.z) * sin(time*6.0+p.z*3.0)*0.09;
  p *= scale;
  vec3 c=cos(attitude), s=sin(attitude);
  p.xy=mat2(c.z,s.z,-s.z,c.z)*p.xy;
  p.yz=mat2(c.x,s.x,-s.x,c.x)*p.yz;
  p.xz=mat2(c.y,-s.y,s.y,c.y)*p.xz;
  vec3 camera = view * (offset + p);
  depth = camera.z;
  gl_Position=vec4(camera.xy*lens, 1.00154*depth-0.20015,depth);
  tint = color;
  local = p;
}`;
const fragmentSource = `#version 300 es
precision highp float;
in vec3 tint, local;
in float depth;
uniform vec3 water;
uniform float night, floorMesh, time;
out vec4 frag;
void main() {
  float ripple=sin(local.x*1.3+sin(local.z+time*.24))+cos(local.z*1.4+time*.2);
  vec3 lit=tint*(1.0+floorMesh*.21*exp(-20.0*ripple*ripple));
  lit *= mix(vec3(.94,1.0,.96),vec3(.26,.43,.62),night);
  frag=vec4(mix(water,lit,exp(-.001*depth*depth)),1);
}`;

function programFor(gl) {
  const program = gl.createProgram();
  for (const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source); gl.compileShader(shader); gl.attachShader(program,shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  return program;
}

// Positions and colors use the same ten-byte layout in every level-of-detail mesh.
function upload(gl, points, indices, unit) {
  const vao=gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vertices=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertices); gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.SHORT,false,10,0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.UNSIGNED_BYTE,true,10,6);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  return {vao,vertices,unit,count:indices.byteLength/2};
}

function readMeshes(gl, data) {
  const bytes=gunzipSync(new Uint8Array(data));
  const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), meshes=[];
  let offset=0;
  while(offset<bytes.length){
    const vertexBytes=header.getUint32(offset,true)*10, indexBytes=header.getUint32(offset+4,true)*2;
    const unit=header.getFloat32(offset+8,true);
    offset+=12;
    const end=offset+vertexBytes;
    meshes.push(upload(gl,bytes.subarray(offset,end),bytes.subarray(end,end+indexBytes),unit));
    offset=end+indexBytes;
  }
  return meshes;
}

function seabed(gl) {
  const width=17, points=new Uint8Array(width*width*10), data=new DataView(points.buffer), indices=[];
  for(let z=0;z<width;z++) for(let x=0;x<width;x++){
    const i=z*width+x;
    data.setInt16(i*10,(x-8)*800,true); data.setInt16(i*10+4,(z-8)*800,true);
    points.set([183,175,139],i*10+6);
    if(x<width-1 && z<width-1) indices.push(i,i+1,i+width,i+1,i+width+1,i+width);
  }
  const mesh=upload(gl,points,new Uint16Array(indices),.01);
  let cx,cz;
  return {mesh, update(player) {
    const x=Math.round(player.x/8)*8, z=Math.round(player.z/8)*8;
    if(x!==cx || z!==cz){
      cx=x;cz=z;
      for(let i=0;i<width*width;i++) data.setInt16(i*10+2,Math.round(100*seabedHeight(cx+(i%width-8)*8,cz+(Math.floor(i/width)-8)*8)),true);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertices); gl.bufferSubData(gl.ARRAY_BUFFER,0,points);
    }
    return [cx,0,cz];
  }};
}

export function createDiveView(canvas, night, data) {
  const layer=document.createElement('canvas');
  layer.id='dive-view'; layer.setAttribute('aria-hidden','true');
  const gl=layer.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
  if(!gl) throw Error('WebGL 2 unavailable');
  function dispose(){ layer.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  try {
    const program=programFor(gl), meshes=readMeshes(gl, data), floor=seabed(gl);
    const uniforms={};
    for(const name of ['offset','scale','attitude','view','lens','unit','time','swim','water','night','floorMesh']){
      uniforms[name]=gl.getUniformLocation(program,name);
    }
    canvas.after(layer);
    gl.enable(gl.DEPTH_TEST);
    let focus=null;
    const metrics={fps:60};
    function render(g,dt,playing){
      const ratio=Math.min(devicePixelRatio,1.5), w=Math.max(1,Math.round(innerWidth*ratio)), h=Math.max(1,Math.round(innerHeight*ratio));
      if(layer.width!==w || layer.height!==h){layer.width=w;layer.height=h;}
      gl.viewport(0,0,w,h);
      const water=night?[.018,.085,.18]:[.03,.32,.39];
      gl.clearColor(...water,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform3fv(uniforms.water,water);gl.uniform1f(uniforms.night,Number(night));
      gl.uniform1f(uniforms.time,g.time);
      const p=g.sub, observed=focus===null?null:g.fish.find(f=>f.type===focus);
      let eye, target;
      if(observed){
        const distance=Math.max(.30,speciesOf(focus).length*1.5);
        eye={x:observed.x+distance*.85,y:observed.y+distance*.28,z:observed.z+distance*.8};
        target=observed;
      }else{
        const back=playing?4.8:6.2;
        eye={x:p.x+Math.sin(p.yaw)*back,y:p.y+(playing?1.5:2.1)-Math.sin(p.pitch)*3,z:p.z+Math.cos(p.yaw)*back};
        target={x:p.x-Math.sin(p.yaw)*3,y:p.y+.35+Math.sin(p.pitch)*3,z:p.z-Math.cos(p.yaw)*3};
      }
      clampCameraPosition(eye);
      const dx=target.x-eye.x, dy=target.y-eye.y, dz=target.z-eye.z;
      const distance=Math.hypot(dx,dy,dz), horizontal=Math.hypot(dx,dz);
      const fx=dx/distance,fy=dy/distance,fz=dz/distance,rx=-dz/horizontal,rz=dx/horizontal;
      gl.uniformMatrix3fv(uniforms.view,false,[rx,-rz*fy,fx,0,horizontal/distance,fy,rz,rx*fy,fz]);
      const lens=1/Math.tan(57*Math.PI/360);
      gl.uniform2f(uniforms.lens,lens*h/w,lens);
      function draw(mesh,x,y,z,scale=1,yaw=0,pitch=0,bank=0,swim=0){
        gl.uniform3f(uniforms.offset,x-eye.x,y-eye.y,z-eye.z);
        gl.uniform3f(uniforms.scale,scale,scale,scale);gl.uniform3f(uniforms.attitude,pitch,yaw,bank);
        gl.uniform1f(uniforms.unit,mesh.unit);gl.uniform1f(uniforms.swim,swim);
        gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
      }
      gl.uniform1f(uniforms.floorMesh,1);draw(floor.mesh,...floor.update(p));
      gl.uniform1f(uniforms.floorMesh,0);
      if(Math.hypot(p.x,p.z)<170)draw(meshes[0],0,0,0);
      for(const f of g.fish){
        if(!observed || f.type===focus)draw(meshes[2+f.type],f.x,f.y,f.z,speciesOf(f.type).length*adultScale(f.growth),f.yaw,0,0,1);
      }
      if(!observed){
        const type=g.playerSpecies,animal=type!=null;
        const size=animal?Math.max(1,Math.min(2.6,speciesOf(type).length)):1;
        draw(meshes[animal?type+2:1],p.x,p.y,p.z,size,p.heading??p.yaw,p.trim??p.pitch,p.bank??0,Number(animal));
      }
      for(const food of g.food)draw(meshes[18],food.x,food.y,food.z);
      for(const coin of g.drops)draw(meshes[19],coin.x,coin.y,coin.z,1,g.time+coin.id);
      if(dt>0)metrics.fps+=(Math.min(120,1/dt)-metrics.fps)*.1;
    }
    return {render,dispose,metrics,setNight(value){night=value;},focusSpecies(type){focus=type;},stopObserving(){focus=null;},resetCamera(){}};
  } catch(error){dispose();throw error;}
}
