import * as THREE from './vendor/three.module.min.js';

// Render the same projected mesh with Canvas 2D when GPU contexts are disabled.
export class CanvasFabricRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.context = this.domElement.getContext('2d');
    if (!this.context) throw new Error('Canvas is unavailable');
    this.ratio = 1;
  }
  setPixelRatio(ratio) { this.ratio = Math.min(ratio, 1.25); }
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.domElement.width = Math.round(width * this.ratio);
    this.domElement.height = Math.round(height * this.ratio);
  }
  render(scene, camera) {
    const ctx = this.context;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const mesh = scene.children[0];
    const progress = mesh.material.uniforms.uProgress.value;
    const pointer = mesh.material.uniforms.uPointer.value;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const positions = mesh.geometry.attributes.position;
    const normals = mesh.geometry.attributes.normal;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const vertices = [];
    const chapter = 0.5 + 0.5 * Math.sin(progress * 16);
    const light = new THREE.Vector3(-1 + chapter * 2, 0.8 + pointer.y * 0.15, 1).normalize();
    for (let i = 0; i < positions.count; i++) {
      const position = new THREE.Vector3().fromBufferAttribute(positions, i);
      position.z += Math.sin(position.y * 2.8 + progress * 20) * 0.12;
      position.x += pointer.x * position.y * 0.045;
      const projected = position.applyMatrix4(mesh.matrixWorld).project(camera);
      const normal = new THREE.Vector3().fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
      vertices.push({ x: (projected.x + 1) * this.width / 2, y: (1 - projected.y) * this.height / 2, z: projected.z, normal });
    }
    const index = mesh.geometry.index.array;
    const faces = [];
    for (let i = 0; i < index.length; i += 3) {
      const a = vertices[index[i]], b = vertices[index[i + 1]], c = vertices[index[i + 2]];
      faces.push({ a, b, c, depth: (a.z + b.z + c.z) / 3 });
    }
    faces.sort((a, b) => b.depth - a.depth);
    for (const { a, b, c } of faces) {
      const n = a.normal.clone().add(b.normal).add(c.normal).normalize();
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0) n.negate();
      const diffuse = Math.max(0, n.dot(light));
      const tone = 0.62 + diffuse * 0.35;
      const color = [0.76 + chapter * 0.1, 0.66 + chapter * 0.2, 0.51 + chapter * 0.27];
      const rgb = color.map(v => Math.round(Math.pow(v * tone, 1 / 2.2) * 255));
      ctx.fillStyle = ctx.strokeStyle = `rgb(${rgb.join(',')})`;
      ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }
  dispose() { this.context.clearRect(0, 0, this.width, this.height); }
}
