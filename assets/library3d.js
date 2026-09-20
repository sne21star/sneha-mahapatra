/* library3d.js — each genre gets a REAL 3D model (actual geometry with depth
 * that fully rotates, lit like the planets) sitting on the bookshelf roof.
 *
 * Rendering: ONE shared offscreen WebGL renderer draws each model, and the
 * frame is blitted with drawImage() into a small 2D <canvas> placed INSIDE that
 * genre's button. Because those canvases are normal in-flow DOM nodes, every
 * model stays locked to its slot, scrolls with the page, is clipped by layout,
 * and can never bleed onto other parts of the page.
 *
 * Classic script + dynamic import() so it re-executes cleanly when universe.js
 * re-injects it into the panel. Idempotent: later runs just rescan the DOM.
 */
(function () {
  var THREE_URL = "https://unpkg.com/three@0.160.0/build/three.module.js";

  function start(THREE) {
    if (!window.__LIB3Dv2) window.__LIB3Dv2 = createEngine(THREE);
    window.__LIB3Dv2.rescan();
  }
  if (window.__LIB3D_THREE) { start(window.__LIB3D_THREE); return; }
  import(THREE_URL)
    .then(function (THREE) { window.__LIB3D_THREE = THREE; start(THREE); })
    .catch(function (e) { console.warn("library3d: could not load three.js", e); });

  /* ================================================================== */
  function createEngine(THREE) {
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var RS = 256;                                   // offscreen render square (px)

    // clean up any stale full-viewport canvas from an earlier version
    var stale = document.getElementById("lib3d-canvas");
    if (stale) stale.remove();

    var gl = document.createElement("canvas");      // offscreen; never added to DOM
    gl.width = gl.height = RS;
    var renderer = new THREE.WebGLRenderer({ canvas: gl, alpha: true, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(RS, RS, false);
    renderer.setClearColor(0x000000, 0);

    /* ---- little geometry helpers ---- */
    function M(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0.05 }, o || {})); }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c, o)); }
    function cyl(rt, rb, h, c, seg, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), M(c, o)); }
    function sph(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 20), M(c, o)); }
    function cone(r, h, c, seg, o) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 24), M(c, o)); }
    function G() { var g = new THREE.Group(); for (var i = 0; i < arguments.length; i++) g.add(arguments[i]); return g; }

    /* ---- per-genre model builders (each returns a THREE.Group) ---- */
    function mBooks() {
      var g = new THREE.Group(), cols = [0xc0392b, 0x2e86c1, 0xd4ac0d, 0x27ae60];
      for (var i = 0; i < 4; i++) { var b = box(1.7, 0.34, 1.15, cols[i], { roughness: 0.7 }); b.position.y = i * 0.36; b.rotation.y = (i % 2 ? -1 : 1) * 0.12; g.add(b); }
      return g;
    }
    function mRobot() {
      var head = box(1.3, 1.2, 1.15, 0x9fb3c8, { metalness: 0.7, roughness: 0.35 });
      var face = box(1.0, 0.7, 0.12, 0x11151c, { metalness: 0.3, roughness: 0.6 }); face.position.set(0, 0.02, 0.6);
      var eye = { color: 0x0a2a33, emissive: 0x27d0ff, emissiveIntensity: 2.4 };
      var e1 = sph(0.13, 0x0a2a33, eye); e1.position.set(-0.28, 0.06, 0.66);
      var e2 = e1.clone(); e2.position.x = 0.28;
      var ant = cyl(0.03, 0.03, 0.5, 0x8895a3, 12, { metalness: 0.8 }); ant.position.set(0, 0.9, 0);
      var bulb = sph(0.11, 0xff4d6d, { emissive: 0xff4d6d, emissiveIntensity: 1.6 }); bulb.position.set(0, 1.18, 0);
      var earL = box(0.12, 0.42, 0.42, 0x8895a3, { metalness: 0.7 }); earL.position.set(-0.72, 0, 0);
      var earR = earL.clone(); earR.position.x = 0.72;
      return G(head, face, e1, e2, ant, bulb, earL, earR);
    }
    function mColumn() {
      var marble = 0xe8e2d0;
      var shaft = cyl(0.42, 0.46, 1.5, marble, 20, { roughness: 0.85 });
      var cap = box(1.15, 0.2, 1.15, marble, { roughness: 0.85 }); cap.position.y = 0.86;
      var abax = box(0.95, 0.16, 0.95, marble, { roughness: 0.85 }); abax.position.y = 0.72;
      var base = box(1.1, 0.22, 1.1, marble, { roughness: 0.85 }); base.position.y = -0.86;
      var base2 = box(0.9, 0.16, 0.9, marble, { roughness: 0.85 }); base2.position.y = -0.72;
      return G(shaft, cap, abax, base, base2);
    }
    function mCrystal() {
      var gem = { roughness: 0.12, metalness: 0.1, emissive: 0x3a1d66, emissiveIntensity: 0.6, flatShading: true };
      var big = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), M(0x9b5cff, gem)); big.scale.set(0.8, 1.5, 0.8);
      var s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), M(0xc79bff, gem)); s1.position.set(0.7, -0.4, 0.2); s1.scale.set(0.7, 1.2, 0.7);
      var s2 = s1.clone(); s2.position.set(-0.65, -0.5, -0.1); s2.scale.set(0.6, 1.0, 0.6);
      return G(big, s1, s2);
    }
    function mHourglass() {
      var wood = 0x6b4a2b, glass = { color: 0xbfe9ff, transparent: true, opacity: 0.32, roughness: 0.1 }, sand = 0xe0a94b;
      var topCap = cyl(0.6, 0.6, 0.14, wood, 24); topCap.position.y = 0.86;
      var botCap = topCap.clone(); botCap.position.y = -0.86;
      var upper = cone(0.55, 0.82, 0xbfe9ff, 24, glass); upper.position.y = 0.41; upper.rotation.x = Math.PI;
      var lower = cone(0.55, 0.82, 0xbfe9ff, 24, glass); lower.position.y = -0.41;
      var sandTop = cone(0.5, 0.5, sand, 24, { roughness: 0.9 }); sandTop.position.y = 0.5; sandTop.rotation.x = Math.PI;
      var g = G(topCap, botCap, upper, lower, sandTop);
      for (var a = 0; a < 3; a++) { var p = cyl(0.05, 0.05, 1.72, wood, 10); var ang = a / 3 * Math.PI * 2; p.position.set(Math.cos(ang) * 0.56, 0, Math.sin(ang) * 0.56); g.add(p); }
      return g;
    }
    function mSkull() {
      var bone = 0xe9e3d1, dark = { color: 0x0a0a0a, roughness: 1.0 };
      var cran = sph(0.8, bone, { roughness: 0.7 }); cran.scale.set(1, 1.05, 1.0); cran.position.y = 0.18;
      var jaw = box(0.9, 0.42, 0.72, bone, { roughness: 0.7 }); jaw.position.y = -0.52;
      var eL = sph(0.22, 0, dark); eL.position.set(-0.3, 0.2, 0.6); eL.scale.set(1, 1, 0.5);
      var eR = eL.clone(); eR.position.x = 0.3;
      var nose = cone(0.1, 0.28, 0, 8, dark); nose.position.set(0, -0.08, 0.72); nose.rotation.x = Math.PI;
      var g = G(cran, jaw, eL, eR, nose);
      for (var i = 0; i < 4; i++) { var t = box(0.13, 0.16, 0.08, bone, { roughness: 0.7 }); t.position.set(-0.3 + i * 0.2, -0.4, 0.34); g.add(t); }
      return g;
    }
    function mMagnifier() {
      var rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 16, 32), M(0xcbb26a, { metalness: 0.85, roughness: 0.3 }));
      var lens = cyl(0.5, 0.5, 0.06, 0xbfe9ff, 32, { transparent: true, opacity: 0.32, roughness: 0.05 }); lens.rotation.x = Math.PI / 2;
      var handle = cyl(0.11, 0.11, 0.9, 0x5a3a1e, 16, { roughness: 0.6 }); handle.position.set(0.5, -0.95, 0); handle.rotation.z = -0.62;
      var g = G(rim, lens, handle); g.rotation.z = 0.2; g.rotation.x = 0.12; return g;
    }
    function mRocket() {
      var body = cyl(0.35, 0.35, 1.4, 0xf3f3f7, 24, { roughness: 0.4, metalness: 0.2 });
      var nose = cone(0.35, 0.55, 0xd94f4f, 24, { roughness: 0.4 }); nose.position.y = 0.97;
      var win = sph(0.16, 0x3fd0ff, { emissive: 0x1088aa, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.2 }); win.position.set(0, 0.2, 0.32); win.scale.z = 0.4;
      var band = cyl(0.36, 0.36, 0.16, 0xd94f4f, 24, { roughness: 0.4 }); band.position.y = -0.2;
      var flame = cone(0.22, 0.5, 0xffb02e, 16, { emissive: 0xff7b00, emissiveIntensity: 1.7, transparent: true, opacity: 0.9 }); flame.position.y = -0.95; flame.rotation.x = Math.PI;
      var g = G(body, nose, win, band, flame);
      for (var a = 0; a < 3; a++) { var fin = box(0.08, 0.5, 0.42, 0xd94f4f, { roughness: 0.4 }); var ang = a / 3 * Math.PI * 2; fin.position.set(Math.cos(ang) * 0.42, -0.6, Math.sin(ang) * 0.42); fin.lookAt(0, -0.6, 0); g.add(fin); }
      return g;
    }
    function mSprout() {
      var pot = cyl(0.5, 0.36, 0.6, 0xc0653b, 20, { roughness: 0.85 }); pot.position.y = -0.5;
      var rim = cyl(0.54, 0.54, 0.12, 0xd07a4e, 20, { roughness: 0.85 }); rim.position.y = -0.22;
      var soil = cyl(0.46, 0.46, 0.08, 0x2c1c10, 20, { roughness: 1.0 }); soil.position.y = -0.18;
      var stem = cyl(0.05, 0.06, 0.7, 0x3fa34d, 10, { roughness: 0.7 }); stem.position.y = 0.2;
      var leafGeo = new THREE.SphereGeometry(0.32, 16, 12);
      var l1 = new THREE.Mesh(leafGeo, M(0x4fbf5f, { roughness: 0.6 })); l1.scale.set(1, 0.13, 0.5); l1.position.set(0.22, 0.4, 0); l1.rotation.z = -0.6;
      var l2 = l1.clone(); l2.position.x = -0.22; l2.rotation.z = 0.6;
      var l3 = l1.clone(); l3.position.set(0, 0.62, 0.05); l3.rotation.set(-0.3, 0, 0);
      return G(pot, rim, soil, stem, l1, l2, l3);
    }
    function mDagger() {
      var blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 4), M(0xcfd6dd, { metalness: 0.9, roughness: 0.22 })); blade.position.y = 0.55; blade.scale.z = 0.35;
      var guard = box(0.7, 0.12, 0.18, 0x8a6a2b, { metalness: 0.6, roughness: 0.4 }); guard.position.y = -0.18;
      var handle = cyl(0.1, 0.12, 0.6, 0x4a2f18, 16, { roughness: 0.6 }); handle.position.y = -0.5;
      var pommel = sph(0.13, 0x8a6a2b, { metalness: 0.6, roughness: 0.4 }); pommel.position.y = -0.82;
      var g = G(blade, guard, handle, pommel); g.rotation.z = 0.5; return g;
    }
    function mScroll() {
      var paper = 0xe8dcc0;
      var sheet = cyl(0.42, 0.42, 1.5, paper, 24, { roughness: 0.9 }); sheet.rotation.z = Math.PI / 2;
      var rollL = cyl(0.5, 0.5, 0.22, 0xcdbb95, 24, { roughness: 0.8 }); rollL.rotation.z = Math.PI / 2; rollL.position.x = -0.82;
      var rollR = rollL.clone(); rollR.position.x = 0.82;
      var barL = cyl(0.07, 0.07, 1.5, 0x6b4a2b, 12, { roughness: 0.6 }); barL.rotation.z = Math.PI / 2; barL.position.set(-0.98, 0, 0);
      var barR = barL.clone(); barR.position.x = 0.98;
      var g = G(sheet, rollL, rollR, barL, barR); g.rotation.x = 0.1; return g;
    }
    function mPortrait() {
      var frame = box(1.35, 1.65, 0.16, 0xb9892b, { metalness: 0.5, roughness: 0.4 });
      var matte = box(1.05, 1.35, 0.06, 0x2a2f3a, { roughness: 0.8 }); matte.position.z = 0.09;
      var head = sph(0.26, 0xe8c9a0, { roughness: 0.7 }); head.position.set(0, 0.18, 0.16);
      var body = cyl(0.18, 0.36, 0.5, 0x3d6ea5, 16, { roughness: 0.7 }); body.position.set(0, -0.42, 0.14);
      return G(frame, matte, head, body);
    }
    function mBook() {
      var cover = box(1.25, 1.6, 0.3, 0x2e6da4, { roughness: 0.6 });
      var pages = box(1.12, 1.46, 0.24, 0xf2ead6, { roughness: 0.9 }); pages.position.z = 0.05;
      var spine = box(0.1, 1.6, 0.32, 0x24506e, { roughness: 0.6 }); spine.position.x = -0.62;
      return G(cover, pages, spine);
    }

    var MODELS = {
      "all": mBooks,
      "artificial intelligence": mRobot,
      "biography": mPortrait,
      "classics": mColumn,
      "fantasy": mCrystal,
      "historical fiction": mHourglass,
      "horror": mSkull,
      "mystery": mMagnifier,
      "nonfiction": mScroll,
      "science fiction": mRocket,
      "self help": mSprout,
      "thriller": mDagger
    };

    /* normalize any model to a uniform framed size, recentred at the origin */
    function fit(model, target) {
      var b = new THREE.Box3().setFromObject(model), size = new THREE.Vector3(), center = new THREE.Vector3();
      b.getSize(size); b.getCenter(center);
      model.position.sub(center);
      var s = target / Math.max(size.x, size.y, size.z);
      var wrap = new THREE.Group(); wrap.add(model); wrap.scale.setScalar(s);
      return wrap;
    }

    /* ---- items ---- */
    var items = [], running = false;

    function makeItem(el) {
      var btn = el.closest(".genre-obj");
      var key = ((btn && btn.dataset.genre) || "").toLowerCase();
      var build = MODELS[key] || mBook;

      var scene = new THREE.Scene();
      var cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0.1, 5.6);
      scene.add(new THREE.AmbientLight(0xffffff, 0.62));
      var kl = new THREE.DirectionalLight(0xfff3df, 2.3); kl.position.set(-3, 4.5, 6); scene.add(kl);
      var fl = new THREE.DirectionalLight(0x9fc6ff, 0.9); fl.position.set(4, -1.5, 3); scene.add(fl);

      var model = fit(build(), 2.15);
      scene.add(model);

      var CSS = 120;
      var cv = document.createElement("canvas"); cv.className = "go-3d";
      cv.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-56%);width:" + CSS + "px;height:" + CSS + "px;pointer-events:none;";
      el.style.position = "relative";
      el.appendChild(cv);
      var pr = Math.min(devicePixelRatio, 2);
      cv.width = CSS * pr; cv.height = CSS * pr;

      var item = { el: el, cv: cv, ctx: cv.getContext("2d"), scene: scene, cam: cam, model: model, phase: Math.random() * Math.PI * 2, hover: 0, hoverTarget: 0 };
      if (btn) {
        btn.addEventListener("pointerenter", function () { item.hoverTarget = 1; });
        btn.addEventListener("pointerleave", function () { item.hoverTarget = 0; });
      }
      return item;
    }

    function disposeObj(o) {
      o.traverse(function (n) {
        if (n.geometry) n.geometry.dispose();
        if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach(function (m) { m.dispose(); }); }
      });
    }
    function dispose(it) {
      if (it.cv && it.cv.parentNode) it.cv.parentNode.removeChild(it.cv);
      disposeObj(it.scene);
    }

    function frame(t) {
      if (!items.length) { running = false; return; }
      var tt = t * 0.001;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!document.contains(it.el)) continue;
        var r = it.el.getBoundingClientRect();
        if (r.bottom < -60 || r.top > innerHeight + 60 || !r.width) continue;   // off-screen: skip

        it.hover += ((it.hoverTarget || 0) - it.hover) * 0.15;
        it.model.rotation.y = (reduced ? 0.6 : tt * (0.55 + it.hover * 0.6)) + it.phase;
        it.model.rotation.x = 0.14 - it.hover * 0.1;
        it.model.position.y = it.hover * 0.12;
        it.model.scale.setScalar(1 + it.hover * 0.06);

        renderer.render(it.scene, it.cam);
        it.ctx.clearRect(0, 0, it.cv.width, it.cv.height);
        it.ctx.drawImage(gl, 0, 0, RS, RS, 0, 0, it.cv.width, it.cv.height);
      }
      requestAnimationFrame(frame);
    }
    function ensureLoop() { if (!running && items.length) { running = true; requestAnimationFrame(frame); } }

    function rescan() {
      items.forEach(dispose); items = [];
      var els = document.querySelectorAll(".genre-obj .go-emoji");
      if (!els.length) return;
      document.querySelectorAll(".genre-ledge-shelf").forEach(function (s) { s.classList.add("has3d"); });
      els.forEach(function (el) { items.push(makeItem(el)); });
      ensureLoop();
    }

    return { rescan: rescan };
  }
})();
