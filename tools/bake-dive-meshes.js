// Bake low-detail meshes from the same geometry used in the full scene.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createReef} from '../src/reef.js';
import {createSpeciesModels} from '../src/species-models.js';
import {prepareSpeciesModel} from '../src/model-preparation.js';

function simplify(root, cell) {
  root.updateMatrixWorld(true);
  const cells = new Map(), faces = [], seen = new Set();
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), normals = new THREE.Matrix3();
  const light = new THREE.Vector3(-.4, 1, .45).normalize(), color = new THREE.Color();
  root.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh || !mesh.material.color || mesh.material.opacity < .12) return;
    const {geometry, material} = mesh;
    const attributes = geometry.attributes;
    normals.getNormalMatrix(mesh.matrixWorld);
    let pixels;
    if (material.map?.image && !material.map.isDataTexture && attributes.uv) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(material.map.image, 0, 0, 64, 64);
      pixels = ctx.getImageData(0, 0, 64, 64).data;
    }
    const indices = [];
    for (let i = 0; i < attributes.position.count; i++) {
      position.fromBufferAttribute(attributes.position, i).applyMatrix4(mesh.matrixWorld);
      const coords = position.toArray().map(n => Math.round(n / cell));
      const key = material.id + ':' + coords.join(',');
      let vertex = cells.get(key);
      if (!vertex) {
        vertex = {index:cells.size, pos:[0,0,0], rgb:[0,0,0], count:0};
        cells.set(key,vertex);
      }
      indices.push(vertex.index);
      color.copy(material.color);
      if (attributes.color) color.multiply(new THREE.Color().fromBufferAttribute(attributes.color,i));
      color.convertLinearToSRGB();
      if (pixels) {
        const u = attributes.uv.getX(i), v = attributes.uv.getY(i);
        const j = (Math.floor((v-Math.floor(v))*64)*64 + Math.floor((u-Math.floor(u))*64))*4;
        color.r *= pixels[j]/255; color.g *= pixels[j+1]/255; color.b *= pixels[j+2]/255;
      }
      normal.fromBufferAttribute(attributes.normal,i).applyNormalMatrix(normals);
      color.multiplyScalar(.76 + .24 * normal.dot(light));
      const rgb = color.toArray();
      for (let k=0;k<3;k++) {
        vertex.pos[k] += position.getComponent(k);
        vertex.rgb[k] += rgb[k];
      }
      vertex.count++;
    }
    const count = geometry.index?.count ?? indices.length;
    for (let i=0;i<count;i+=3) {
      const tri = [0,1,2].map(k => indices[geometry.index ? geometry.index.getX(i+k) : i+k]);
      if (new Set(tri).size < 3) continue;
      const key = [...tri].sort((a,b)=>a-b).join(',');
      if (!seen.has(key)) { seen.add(key); faces.push(...tri); }
    }
  });
  const vertices = [];
  for (const v of cells.values()) {
    vertices.push(...v.pos.map(n => Math.round(n/v.count*1000)),
      ...v.rgb.map(n => Math.round(Math.min(1,n/v.count)*255)));
  }
  return {vertices,faces};
}

export async function bake() {
  const loader = new GLTFLoader();
  const [sub,...fish] = await Promise.all(['submarine','goldfish','azure','orchid'].map(async name =>
    (await loader.loadAsync('/models/'+name+'-lite.glb')).scene));
  sub.rotation.y = Math.PI; sub.scale.setScalar(.34);
  const reef = new THREE.Group();
  await createReef(reef);
  const models = [simplify(reef,.58), simplify(sub,.045)];
  const bodies = [...fish,...createSpeciesModels()];
  bodies.forEach((body,type) => {
    const {length} = prepareSpeciesModel(body,type);
    body.rotation.y = Math.PI; body.scale.setScalar(1/length);
    models.push(simplify(body,.038));
  });
  const pellet=new THREE.Mesh(new THREE.DodecahedronGeometry(.10),new THREE.MeshBasicMaterial({color:'#dca366'}));
  const coin=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.065,16),new THREE.MeshBasicMaterial({color:'#f8d477'}));
  coin.rotation.x=Math.PI/2;
  models.push(simplify(pellet,.01),simplify(coin,.01));
  return models;
}
