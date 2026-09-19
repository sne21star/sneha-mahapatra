import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const BASE = window.SITE_BASEURL || "";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Section → planet definitions ---------- */
const SECTIONS = [
  { id: "about",        name: "About",        kick: "Who I am",        style: "neon",   colA: 0x5eead4, colB: 0x3b82f6, size: 1.7, dist: 16, speed: 1.25, spin: 0.03, path: "/about/",        orb: ["#8ff5e6", "#5eead4", "#3b82f6", "rgba(94,234,212,.65)"] },
  { id: "resume",       name: "Resume",       kick: "My experience",   style: "neon",   colA: 0xffd24a, colB: 0xff8a1e, size: 1.5, dist: 24, speed: 1.02, spin: 0.028, path: "/cv/",          orb: ["#ffe9a8", "#ffd24a", "#ff8a1e", "rgba(255,180,60,.6)"] },
  { id: "blog",         name: "Blog",         kick: "Thoughts & words", style: "tiedye", colA: 0xff3ea5, colB: 0x8b5cf6, size: 2.0, dist: 33, speed: 0.82, spin: 0.035, path: null,           orb: ["#ff8fd0", "#ff3ea5", "#22d3ee", "rgba(255,62,165,.55)"] },
  { id: "projects",     name: "Projects",     kick: "Things I built",  style: "ico",    colA: 0x5eead4, colB: 0x7c8cff, size: 2.1, dist: 44, speed: 0.6,  spin: 0.02, path: "/projects/",     orb: ["#b6fff2", "#5eead4", "#7c8cff", "rgba(124,140,255,.6)"] },
  { id: "publications", name: "Publications", kick: "Research",        style: "neon",   colA: 0x34d399, colB: 0x10b981, size: 1.6, dist: 54, speed: 0.44, spin: 0.03, path: "/publications/", orb: ["#9df3cf", "#34d399", "#10b981", "rgba(52,211,153,.55)"] },
  { id: "teaching",     name: "Teaching",     kick: "Sharing it",      style: "neon",   colA: 0xff7a4d, colB: 0xef4444, size: 1.7, dist: 64, speed: 0.34, spin: 0.026, path: "/teaching/",    orb: ["#ffb499", "#ff7a4d", "#ef4444", "rgba(239,68,68,.5)"] },
  { id: "contact",      name: "Contact",      kick: "Say hello",       style: "neon",   colA: 0xff5ea8, colB: 0x22d3ee, size: 1.5, dist: 74, speed: 0.26, spin: 0.03, path: "/contact/",      orb: ["#ff9ccb", "#ff5ea8", "#22d3ee", "rgba(255,94,168,.5)"] },
  { id: "earth",        name: "Earth · Travels", kick: "Where I roam", style: "earth",  colA: 0x2b6cb0, colB: 0x38a169, size: 1.9, dist: 86, speed: 0.19, spin: 0.03, path: "/earth/", link: true, orb: ["#a7d8ff", "#2b6cb0", "#38a169", "rgba(79,195,255,.55)"] },
];

const canvas = document.getElementById("universe-canvas");
if (canvas) {
  document.body.classList.add("universe-page");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 3000);
  const HOME = new THREE.Vector3(0, 42, 96);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 10;
  controls.maxDistance = 480;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.25;

  /* ---------- Starfield ---------- */
  const starTints = [[1, 1, 1], [0.75, 0.83, 1], [1, 0.9, 0.75], [0.9, 0.95, 1], [1, 0.8, 0.95]];
  function makeStars(count, size, minB, maxB) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 800 + Math.random() * 500;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const tint = starTints[(Math.random() * starTints.length) | 0];
      const b = minB + Math.random() * (maxB - minB);
      col[i * 3] = tint[0] * b; col[i * 3 + 1] = tint[1] * b; col[i * 3 + 2] = tint[2] * b;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ vertexColors: true, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  const starField = new THREE.Group();
  starField.add(makeStars(4500, 1.7, 0.4, 0.8));
  starField.add(makeStars(800, 3.0, 0.7, 1.0));
  starField.add(makeStars(110, 5.5, 0.9, 1.0));
  scene.add(starField);

  /* ---------- Central star (Sneha's Universe core) ---------- */
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 64), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
  scene.add(sun);
  const sunSkin = new THREE.Mesh(new THREE.SphereGeometry(6.3, 64, 64), new THREE.MeshBasicMaterial({ color: 0x7c8cff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
  scene.add(sunSkin);
  function makeHalo(radius, color, opacity) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, color); grd.addColorStop(0.4, color); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    spr.scale.set(radius, radius, 1);
    return spr;
  }
  sun.add(makeHalo(40, "rgba(124,140,255,0.85)", 0.7));
  sun.add(makeHalo(26, "rgba(190,220,255,0.95)", 0.9));
  scene.add(new THREE.PointLight(0xfff2cc, 4.2, 0, 0.16));
  scene.add(new THREE.AmbientLight(0x2a2e45, 1.0));

  /* ---------- Procedural texture helpers ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  function hashSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function valueNoise2D(seed) {
    const r = mulberry32(seed), gs = 256, grid = new Float32Array(gs * gs);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    const at = (x, y) => {
      const xi = Math.floor(x) & (gs - 1), yi = Math.floor(y) & (gs - 1);
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const x1 = (xi + 1) & (gs - 1), y1 = (yi + 1) & (gs - 1);
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const v00 = grid[yi * gs + xi], v10 = grid[yi * gs + x1], v01 = grid[y1 * gs + xi], v11 = grid[y1 * gs + x1];
      return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
    };
    return (x, y, oct = 5) => { let a = 0, amp = 0.5, f = 1, tot = 0; for (let o = 0; o < oct; o++) { a += amp * at(x * f, y * f); tot += amp; f *= 2; amp *= 0.5; } return a / tot; };
  }

  function makeTexture(sec) {
    const W = 512, H = 256;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H), d = img.data;
    const bcv = document.createElement("canvas"); bcv.width = W; bcv.height = H;
    const bctx = bcv.getContext("2d"), bimg = bctx.createImageData(W, H), bd = bimg.data;
    const fbm = valueNoise2D(hashSeed(sec.id));
    const A = hex(sec.colA), B = hex(sec.colB);
    for (let y = 0; y < H; y++) {
      const lat = y / H, polar = Math.pow(Math.abs(lat - 0.5) * 2, 3);
      for (let x = 0; x < W; x++) {
        const u = x / W; let r, g, b, elev;
        if (sec.style === "earth") {
          const n = fbm(u * 5, lat * 5, 6); elev = n;
          if (n < 0.5) { const t = n / 0.5; r = lerp(8, 38, t); g = lerp(26, 108, t); b = lerp(72, 166, t); }
          else { const t = (n - 0.5) / 0.5; r = lerp(30, 128, t); g = lerp(96, 116, t); b = lerp(42, 60, t); }
          if (polar > 0.55) { const w = (polar - 0.55) / 0.45; r = lerp(r, 238, w); g = lerp(g, 244, w); b = lerp(b, 250, w); }
        } else if (sec.style === "tiedye") {
          const warp = fbm(u * 3 + 5, lat * 3, 4) * 2.2;
          const s1 = 0.5 + 0.5 * Math.sin(u * 8 + warp * 3 + lat * 4);
          const s2 = 0.5 + 0.5 * Math.sin(lat * 10 - warp * 4);
          const C = hex(0x22d3ee);
          r = lerp(lerp(A[0], B[0], s1), C[0], s2 * 0.6);
          g = lerp(lerp(A[1], B[1], s1), C[1], s2 * 0.6);
          b = lerp(lerp(A[2], B[2], s1), C[2], s2 * 0.6);
          elev = (s1 + s2) * 0.5;
        } else { // neon: swirling two-tone with bright veins
          const warp = fbm(u * 4, lat * 4, 4);
          const t = 0.5 + 0.5 * Math.sin((lat * 6 + warp * 5) * Math.PI);
          const vein = Math.pow(fbm(u * 9 + 20, lat * 9, 4), 3);
          r = Math.min(255, lerp(A[0], B[0], t) + vein * 160);
          g = Math.min(255, lerp(A[1], B[1], t) + vein * 160);
          b = Math.min(255, lerp(A[2], B[2], t) + vein * 160);
          elev = t * 0.7 + vein * 0.3;
        }
        const idx = (y * W + x) * 4;
        d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
        const bv = (elev || 0.5) * 255 | 0; bd[idx] = bv; bd[idx + 1] = bv; bd[idx + 2] = bv; bd[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0); bctx.putImageData(bimg, 0, 0);
    const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const bump = new THREE.CanvasTexture(bcv);
    return { map, bump };
  }

  /* ---------- Build planets ---------- */
  const planetMeshes = [];
  const orbitGroup = new THREE.Group(); scene.add(orbitGroup);

  SECTIONS.forEach((sec) => {
    const pivot = new THREE.Group(); scene.add(pivot);
    let hit; // clickable mesh placed in planetMeshes

    if (sec.style === "ico") {
      hit = new THREE.Mesh(new THREE.SphereGeometry(sec.size, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
      const g = new THREE.IcosahedronGeometry(sec.size, 1);
      const inner = new THREE.Mesh(g.clone(), new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.3, metalness: 0.85, flatShading: true }));
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: sec.colA, transparent: true, opacity: 0.9 }));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: sec.colB, size: 0.08 }));
      hit.add(inner, wire, pts);
    } else {
      const tex = makeTexture(sec);
      const emissiveIntensity = sec.style === "earth" ? 0.14 : 0.55;
      hit = new THREE.Mesh(
        new THREE.SphereGeometry(sec.size, 64, 64),
        new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 0.05, emissive: sec.colA, emissiveMap: tex.map, emissiveIntensity, roughness: 0.7, metalness: 0.1 })
      );
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(sec.size * 1.25, 48, 48),
        new THREE.MeshBasicMaterial({ color: sec.style === "earth" ? 0x4fc3ff : sec.colB, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      hit.add(atmo);
    }

    hit.position.x = sec.dist;
    hit.userData = sec;
    pivot.add(hit);
    planetMeshes.push(hit);

    // orbit ring
    const seg = 128, ov = new Float32Array((seg + 1) * 3);
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; ov[i * 3] = Math.cos(a) * sec.dist; ov[i * 3 + 2] = Math.sin(a) * sec.dist; }
    const og = new THREE.BufferGeometry(); og.setAttribute("position", new THREE.BufferAttribute(ov, 3));
    orbitGroup.add(new THREE.Line(og, new THREE.LineBasicMaterial({ color: 0x33436b, transparent: true, opacity: 0.45 })));

    sec._pivot = pivot; sec._mesh = hit; sec._angle = Math.random() * Math.PI * 2;
  });

  /* ---------- Bottom quick-nav chips ---------- */
  const nav = document.getElementById("uni-nav");
  SECTIONS.forEach((sec) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="chip-dot" style="color:${sec.orb[1]}"></span>${sec.name}`;
    b.onclick = () => selectPlanet(sec);
    nav.appendChild(b);
  });

  /* ---------- Hover + click ---------- */
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const labelEl = document.getElementById("uni-label");
  let hovered = null;

  addEventListener("pointermove", (e) => {
    if (document.body.classList.contains("panel-open")) return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(planetMeshes, true)[0];
    let obj = hit ? hit.object : null;
    while (obj && !obj.userData.id) obj = obj.parent; // resolve to planet root
    hovered = obj && obj.userData.id ? obj : null;
    if (hovered) {
      labelEl.textContent = hovered.userData.name;
      labelEl.style.left = e.clientX + "px";
      labelEl.style.top = e.clientY + "px";
      labelEl.style.opacity = 1;
      canvas.style.cursor = "pointer";
    } else { labelEl.style.opacity = 0; canvas.style.cursor = "grab"; }
  });

  // Robust click: raycast at release point, ignore drags (orbit) and stale hover state.
  let downX = 0, downY = 0, downT = 0;
  addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
  addEventListener("pointerup", (e) => {
    if (document.body.classList.contains("panel-open")) return;
    if (e.button !== undefined && e.button !== 0) return;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved > 6 || performance.now() - downT > 600) return; // it was a drag/orbit, not a click
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(planetMeshes, true)[0];
    if (!hit) return;
    let obj = hit.object;
    while (obj && !obj.userData.id) obj = obj.parent;
    if (obj && obj.userData.id) selectPlanet(obj.userData);
  });

  let followTarget = null, homing = false;
  const universeEl = document.getElementById("universe");

  function selectPlanet(sec) {
    labelEl.style.opacity = 0;
    canvas.style.cursor = "grab";
    controls.autoRotate = false;
    homing = false;
    followTarget = sec._mesh;
    if (sec.link) {                       // Earth: zoom in first, then open its page
      setTimeout(() => { window.location.href = BASE + sec.path; }, 1300);
      return;
    }
    loadContent(sec);                     // fetch while the camera zooms in
    setTimeout(() => dockAndReveal(sec), 820); // zoom in, then dock to the corner
  }

  /* ---------- Panel ---------- */
  const panel = document.getElementById("planet-panel");
  const panelKick = document.getElementById("panel-kick");
  const panelTitle = document.getElementById("panel-heading");
  const panelBody = document.getElementById("panel-body");

  function loadContent(sec) {
    panelKick.textContent = sec.kick;
    panelTitle.textContent = sec.name;
    panelBody.innerHTML = '<div class="feed-loading"><span class="feed-spinner"></span>Loading…</div>';
    if (sec.id === "blog") {
      panelBody.innerHTML = document.getElementById("tpl-blog").innerHTML;
      initBlogInfinite(panelBody);
      return;
    }
    fetch(BASE + sec.path).then((r) => r.text()).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const content = doc.querySelector(".page-content");
      panelBody.innerHTML = content ? content.innerHTML : '<p>Could not load this section.</p>';
      panelBody.querySelectorAll("script").forEach((s) => {
        const n = document.createElement("script");
        if (s.src) n.src = s.src; else n.textContent = s.textContent;
        s.replaceWith(n);
      });
    }).catch(() => {
      panelBody.innerHTML = `<p>Couldn't load this section. <a href="${BASE + sec.path}">Open the full page →</a></p>`;
    });
  }

  // The page is already sitting under the full-screen canvas. Reveal it by
  // shrinking the live canvas (with the zoomed planet centred) into the
  // top-left corner — the collapsing scene wipes the page into view.
  function dockAndReveal(sec) {
    document.body.classList.add("panel-open");
    panel.classList.add("open");
    panel.scrollTop = 0;
    universeEl.classList.add("docking");           // canvas transforms into the corner
    const after = () => universeEl.classList.add("clip"); // trim to a disc when it lands
    if (reduced) after(); else setTimeout(after, 1620);
  }

  function closePanel() {
    universeEl.classList.remove("clip");           // un-trim, then grow back to full
    universeEl.classList.remove("docking");
    homing = true; followTarget = null;            // camera eases back out to home
    setTimeout(() => {
      panel.classList.remove("open");
      document.body.classList.remove("panel-open");
    }, reduced ? 0 : 1600);
    controls.autoRotate = !reduced;
  }
  document.getElementById("panel-back").onclick = closePanel;
  addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("panel-open")) closePanel(); });

  function initBlogInfinite(root) {
    const BATCH = 6;
    const posts = [...root.querySelectorAll(".post-preview")];
    const buttons = [...root.querySelectorAll(".filter-bar button")];
    const sentinel = root.querySelector("#panel-sentinel");
    let cat = "All", shown = 0;
    const matches = (p) => cat === "All" || p.dataset.cat === cat;
    const filtered = () => posts.filter(matches);
    function reveal(n) {
      const list = filtered(), end = Math.min(shown + n, list.length);
      for (let i = shown; i < end; i++) { list[i].style.display = "block"; requestAnimationFrame(() => list[i].classList.add("in")); }
      shown = end;
      if (sentinel) sentinel.textContent = shown >= list.length ? "" : "Loading more…";
    }
    function resetFeed() { posts.forEach((p) => { p.style.display = "none"; p.classList.remove("in"); }); shown = 0; reveal(BATCH); }
    buttons.forEach((b) => b.addEventListener("click", () => { buttons.forEach((x) => x.classList.remove("active")); b.classList.add("active"); cat = b.dataset.cat; resetFeed(); }));
    if (sentinel && "IntersectionObserver" in window) {
      new IntersectionObserver((en) => { if (en[0].isIntersecting) reveal(BATCH); }, { root: panel, rootMargin: "200px" }).observe(sentinel);
    }
    resetFeed();
  }

  /* ---------- Bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.5, 0.12));

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const speed = reduced ? 0 : dt;

    sun.rotation.y += speed * 0.1;
    sunSkin.rotation.y -= speed * 0.08;
    sunSkin.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.03);
    starField.rotation.y += speed * 0.004;

    SECTIONS.forEach((s) => {
      if (followTarget) return;           // freeze orbits while focusing a planet
      s._angle += speed * s.speed * 0.35;
      s._pivot.rotation.y = s._angle;
      s._mesh.rotation.y += speed * s.spin * 20;
    });

    if (followTarget) {
      followTarget.rotation.y += speed * 0.25;   // keep the focused planet spinning
      const wp = new THREE.Vector3(); followTarget.getWorldPosition(wp);
      controls.target.lerp(wp, 0.12);
      const sz = followTarget.userData.size;
      const desired = wp.clone().add(new THREE.Vector3(0, sz * 0.7, sz * 2.6)); // zoom in close
      camera.position.lerp(desired, 0.12);
    } else if (homing) {
      controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
      camera.position.lerp(HOME, 0.1);
      if (camera.position.distanceTo(HOME) < 1) homing = false;
    }
    planetMeshes.forEach((m) => m.scale.setScalar(m === hovered ? 1.22 : 1 + (m.scale.x - 1) * 0.8));

    controls.update();
    composer.render();
  }
  animate();

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  addEventListener("error", (e) => {
    document.body.insertAdjacentHTML("beforeend",
      `<div style="position:fixed;inset:0;z-index:99;display:grid;place-items:center;color:#93a0b8;font:14px Inter,sans-serif;text-align:center;padding:20px">Universe failed to load:<br>${e.message}</div>`);
  });
}
