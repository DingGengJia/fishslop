// Outer ruins are accessible pavilions. Rendering and collision use these same
// piers, floor slabs and roofs; there is intentionally no solid building envelope.
export const CITY_PAVILIONS = Array.from({length:26},(_,i)=>{
  const angle=i*Math.PI*2/26,r=38+Math.sin(i*7.13)*3;
  return {x:Math.sin(angle)*r,z:Math.cos(angle)*r*.92,height:6+(Math.sin(i*3.17)+1)*4,width:3.8+(Math.cos(i*4.1)+1)*.6,round:i%3===0};
});
export const CITY_BOXES=[],CITY_CYLINDERS=[];
for(const c of CITY_PAVILIONS){
  const {x,z,height:h,width:w}=c;
  CITY_BOXES.push({x,z,y:.2,w:w+1.5,h:.4,d:w+1.5,part:'floor'});
  if(c.round){
    CITY_CYLINDERS.push({x,z,base:h-.22,height:.44,radius:w*.8,part:'roof'});
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+Math.PI/6;
      CITY_CYLINDERS.push({x:x+Math.sin(a)*w*.65,z:z+Math.cos(a)*w*.65,base:.4,height:h-.4,radius:.25,part:'pier'});
    }
  }else{
    CITY_BOXES.push({x,z,y:h,w:w+1,h:.44,d:w+1,part:'roof'});
    for(const sideX of [-1,1])for(const sideZ of [-1,1])CITY_BOXES.push({x:x+sideX*(w/2-.2),z:z+sideZ*(w/2-.2),y:(h+.4)/2,w:.5,h:h-.4,d:.5,part:'pier'});
  }
}
// A simple rounded volume follows each dome, whose decorative surface is curved.
export const CITY_DOMES=CITY_PAVILIONS.filter(c=>c.round);
