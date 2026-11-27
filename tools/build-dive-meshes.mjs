import {gzipSync} from 'node:zlib';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';

const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage();
  await page.route('**/bake-dive', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Bake meshes</title>'}));
  await page.goto(server.resolvedUrls.local[0]+'bake-dive');
  const meshes = await page.evaluate(async () => (await import('/tools/bake-dive-meshes.js')).bake());
  // Interleaved signed positions and RGB, followed by 16-bit triangle indices.
  const chunks = [];
  for (const {vertices,faces} of meshes) {
    const used = [...new Set(faces)].sort((a,b)=>a-b);
    if (used.length > 65535) throw Error('Mesh exceeds 16-bit index range');
    const remap = new Map(used.map((v,i)=>[v,i]));
    const unit = Math.max(1, Math.ceil(used.reduce((max,v) =>
      Math.max(max,...vertices.slice(v*6,v*6+3).map(Math.abs)),0)/32767));
    const header = Buffer.alloc(12);
    header.writeUInt32LE(used.length); header.writeUInt32LE(faces.length,4);
    header.writeFloatLE(unit/1000,8);
    const points = Buffer.alloc(used.length*10), indices = Buffer.alloc(faces.length*2);
    used.forEach((v,i)=>{
      for(let k=0;k<3;k++){
        points.writeInt16LE(Math.round(vertices[v*6+k]/unit),i*10+k*2);
        points[i*10+6+k]=vertices[v*6+3+k];
      }
    });
    faces.forEach((v,i)=>indices.writeUInt16LE(remap.get(v),i*2));
    chunks.push(header,points,indices);
  }
  const bytes = gzipSync(Buffer.concat(chunks), {level:9});
  await writeFile(new URL('../src/dive-meshes.bin',import.meta.url),bytes);
  console.log(meshes.map(mesh=>mesh.faces.length/3), bytes.length, 'bytes');
} finally {
  await browser?.close();
  await server.close();
}
