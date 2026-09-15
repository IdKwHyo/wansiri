import * as THREE from './vendor/three.module.min.js';
import { CanvasFabricRenderer } from './fabric-fallback.js?v=4';

// One viewport scene across every device; native scrolling controls its progress.
export async function createFabricDepth(host, { gsap, ScrollTrigger, reducedMotion }) {
  if (reducedMotion.matches) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    try { renderer = new CanvasFabricRenderer(); } catch { return null; }
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const canvas = renderer.domElement;
  canvas.className = 'fabric-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  // A softly lit folded form lives in the right-hand negative space.
  const ribbonGeometry = new THREE.PlaneGeometry(0.72, 2.3, 16, 48);
  const ribbonPositions = ribbonGeometry.attributes.position;
  for (let i = 0; i < ribbonPositions.count; i++) {
    const x = ribbonPositions.getX(i);
    const y = ribbonPositions.getY(i);
    const twist = y * 1.45 + 0.3;
    ribbonPositions.setXYZ(i, x * Math.cos(twist) + Math.sin(y * 2.2) * 0.19, y, x * Math.sin(twist));
  }
  ribbonGeometry.computeVertexNormals();
  const uniforms = { uProgress: { value: 0 }, uPointer: { value: new THREE.Vector2() } };
  const ribbonMaterial = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: `
      uniform float uProgress;
      uniform vec2 uPointer;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.y * 2.8 + uProgress * 20.0) * 0.12;
        p.x += uPointer.x * p.y * 0.045;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform vec2 uPointer;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec2 vUv;
      void main() {
        vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        float chapter = 0.5 + 0.5 * sin(uProgress * 16.0);
        vec3 light = normalize(vec3(-1.0 + chapter * 2.0, 0.8 + uPointer.y * 0.15, 1.0));
        float diffuse = max(dot(n, light), 0.0);
        float edge = pow(1.0 - abs(dot(n, normalize(vView))), 2.0);
        vec3 warm = vec3(0.76, 0.66, 0.51);
        vec3 pearl = vec3(0.86, 0.86, 0.78);
        vec3 color = mix(warm, pearl, chapter);
        color *= 0.42 + 0.75 * diffuse;
        color += vec3(0.22, 0.20, 0.16) * edge;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
  ribbon.rotation.z = -0.18;
  scene.add(ribbon);
  const state = { progress: 0 };
  const pointer = { x: 0, y: 0 };
  let pointerTween;
  let dirty = true;
  let disposed = false;
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const fieldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 4;
    ribbon.scale.setScalar(Math.min(1.12, camera.aspect * 0.88));
    ribbon.position.set(fieldHeight * camera.aspect * 0.28, -0.03, 0.35);
    dirty = true;
  }
  function render() {
    if (disposed || !dirty || document.hidden || reducedMotion.matches) return;
    const p = state.progress;
    camera.position.set(Math.sin(p * 12) * 0.12, Math.sin(p * 8) * 0.06, 4 - Math.sin(p * 10) * 0.1);
    camera.lookAt(0, 0, 0);
    ribbon.rotation.y = Math.sin(p * 14) * 0.42 + pointer.x * 0.07;
    ribbon.rotation.x = pointer.y * 0.035;
    uniforms.uProgress.value = p;
    uniforms.uPointer.value.set(pointer.x, pointer.y);
    renderer.render(scene, camera);
    dirty = false;
  }
  const timeline = gsap.to(state, {
    progress: 1, ease: 'none', onUpdate: () => { dirty = true; },
    scrollTrigger: { trigger: document.querySelector('main'), start: 'top top', end: 'bottom bottom', scrub: 1 },
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  function movePointer(event) {
    if (reducedMotion.matches || event.pointerType !== 'mouse') return;
    const bounds = host.getBoundingClientRect();
    pointerTween?.kill();
    pointerTween = gsap.to(pointer, {
      x: (event.clientX - bounds.left) / bounds.width * 2 - 1,
      y: (event.clientY - bounds.top) / bounds.height * 2 - 1,
      duration: 0.8, ease: 'power2.out', onUpdate: () => { dirty = true; },
    });
  }
  function resetPointer() {
    if (reducedMotion.matches) return;
    pointerTween?.kill();
    pointerTween = gsap.to(pointer, { x: 0, y: 0, duration: 0.8, ease: 'power2.out', onUpdate: () => { dirty = true; } });
  }
  document.addEventListener('pointermove', movePointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer);
  function dispose() {
    if (disposed) return;
    disposed = true;
    timeline.scrollTrigger?.kill();
    timeline.kill();
    pointerTween?.kill();
    document.removeEventListener('pointermove', movePointer);
    document.documentElement.removeEventListener('pointerleave', resetPointer);
    gsap.ticker.remove(render);
    resizeObserver.disconnect();
    host.classList.remove('has-fabric-depth');
    canvas.remove();
    ribbonGeometry.dispose();
    ribbonMaterial.dispose();
    renderer.dispose();
  }
  canvas.addEventListener('webglcontextlost', dispose, { once: true });
  resize();
  try { render(); } catch { dispose(); return null; }
  host.append(canvas);
  host.classList.add('has-fabric-depth');
  gsap.ticker.add(render);
  return { dispose };
}
