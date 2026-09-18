import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("hero-canvas");
if (canvas) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const story = document.getElementById("home-story");
  const chapters = [...document.querySelectorAll(".home-hero .chapter")];
  const progressBar = document.querySelector(".home-hero .hero-progress");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const group = new THREE.Group();
  scene.add(group);
  const baseGeo = new THREE.IcosahedronGeometry(1.5, 1);
  const inner = new THREE.Mesh(
    baseGeo.clone(),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.3, metalness: 0.85, flatShading: true })
  );
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(baseGeo),
    new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.85 })
  );
  const pts = new THREE.Points(baseGeo, new THREE.PointsMaterial({ color: 0x7c8cff, size: 0.06 }));
  group.add(inner, wire, pts);

  const pc = 400, pg = new THREE.BufferGeometry(), pa = new Float32Array(pc * 3);
  for (let i = 0; i < pc * 3; i++) pa[i] = THREE.MathUtils.randFloatSpread(20);
  pg.setAttribute("position", new THREE.BufferAttribute(pa, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x93a0b8, size: 0.03, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0x404060, 1.2));
  const key = new THREE.PointLight(0x5eead4, 40, 30); key.position.set(4, 3, 5); scene.add(key);
  const rim = new THREE.PointLight(0x7c8cff, 30, 30); rim.position.set(-5, -2, 3); scene.add(rim);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.6, 0.2));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  const KEYS = [
    { rotY: 0.0, rotX: 0.0, scale: 1.0, camZ: 6.0, color: 0x5eead4, x: 0.0 },
    { rotY: 2.2, rotX: 0.4, scale: 0.8, camZ: 5.2, color: 0x7c8cff, x: -1.4 },
    { rotY: 4.4, rotX: -0.5, scale: 1.25, camZ: 4.6, color: 0x8b5cf6, x: 1.3 },
    { rotY: 6.6, rotX: 0.2, scale: 1.0, camZ: 6.5, color: 0x5eead4, x: 0.0 },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color(), cCur = new THREE.Color(0x5eead4);
  const state = { rotY: 0, rotX: 0, scale: 1, camZ: 6, x: 0 };
  let targetP = 0, curP = 0;

  function sampleKeys(t) {
    const seg = KEYS.length - 1;
    const f = Math.max(0, Math.min(1, t)) * seg;
    const i = Math.min(Math.floor(f), seg - 1);
    const k = f - i, a = KEYS[i], b = KEYS[i + 1];
    const lerp = (x, y) => x + (y - x) * k;
    cA.setHex(a.color); cB.setHex(b.color);
    return {
      rotY: lerp(a.rotY, b.rotY), rotX: lerp(a.rotX, b.rotX),
      scale: lerp(a.scale, b.scale), camZ: lerp(a.camZ, b.camZ), x: lerp(a.x, b.x),
      color: cA.clone().lerp(cB, k)
    };
  }

  function onScroll() {
    if (!story) return;
    const rect = story.getBoundingClientRect();
    const total = story.offsetHeight - innerHeight;
    targetP = Math.max(0, Math.min(1, (-rect.top) / total));
    if (progressBar) progressBar.style.width = (targetP * 100) + "%";
    const seg = 1 / chapters.length;
    chapters.forEach((c, i) => {
      const center = (i + 0.5) * seg;
      const d = Math.abs(targetP - center) / (seg * 0.75);
      const o = Math.max(0, 1 - d);
      c.style.opacity = o.toFixed(3);
      c.style.transform = `translateY(${(1 - o) * 30}px)`;
    });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    curP += (targetP - curP) * 0.08;
    const s = sampleKeys(curP);
    state.rotY += (s.rotY - state.rotY) * 0.1;
    state.rotX += (s.rotX - state.rotX) * 0.1;
    state.scale += (s.scale - state.scale) * 0.1;
    state.camZ += (s.camZ - state.camZ) * 0.1;
    state.x += (s.x - state.x) * 0.1;
    cCur.lerp(s.color, 0.1);

    group.rotation.y = state.rotY + (reduced ? 0 : clock.elapsedTime * 0.15);
    group.rotation.x = state.rotX;
    group.scale.setScalar(state.scale);
    group.position.x = state.x;
    wire.material.color.copy(cCur);
    if (inner.material.emissive) inner.material.emissive.copy(cCur).multiplyScalar(0.05);
    camera.position.z = state.camZ;
    dust.rotation.y = clock.elapsedTime * 0.02;

    composer.render();
  }
  animate();
}
