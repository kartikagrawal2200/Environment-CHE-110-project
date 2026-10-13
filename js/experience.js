/**
 * Paper • Earth — Immersive Story (experience.html)
 * One fixed WebGL canvas. Four 3D "hero objects" morph into each other as you scroll:
 *   0 paper ream  ->  1 forest island  ->  2 digital tablet  ->  3 paper-ring globe
 * Big background words, annotated call-out lines, glitch/blur transitions between scenes.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('xpCanvas');
  if (!canvas) return;
  if (typeof THREE === 'undefined' || !window.ProModels) { showFallback(); return; }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { showFallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  var PM = window.ProModels;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  var proLook = !!(PM && PM.installLook(renderer, scene, {}));
  scene.add(new THREE.AmbientLight(0xffffff, proLook ? 0.2 : 0.75));
  var sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(3, 5, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4; sun.shadow.camera.near = 1; sun.shadow.camera.far = 20; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  var rim = new THREE.DirectionalLight(0x9be8b0, 0.55); rim.position.set(-4, 2, -3); scene.add(rim);
  var glow = new THREE.PointLight(0x6df0a0, 0, 12); glow.position.set(0, 0, 3); scene.add(glow);

  /* ------------------------------------------------------------------ helpers */
  function std(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.5, metalness: 0.08 }, o || {})); }
  function flat(color, o) { return new THREE.MeshPhongMaterial(Object.assign({ color: color, flatShading: true, shininess: 8, specular: 0x111111 }, o || {})); }
  function makeTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); draw(ctx, w, h);
    var t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4; return t;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function roundRectShape(w, h, r) {
    var x = -w / 2, y = -h / 2, s = new THREE.Shape();
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function extrudeRound(w, h, r, d, b) {
    var g = new THREE.ExtrudeGeometry(roundRectShape(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 0, -d / 2); return g;
  }
  function drawLeaf(ctx, cx, cy, size, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, size);
    ctx.bezierCurveTo(size * 0.95, size * 0.5, size * 0.95, -size * 0.6, 0, -size);
    ctx.bezierCurveTo(-size * 0.95, -size * 0.6, -size * 0.95, size * 0.5, 0, size); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = size * 0.07;
    ctx.beginPath(); ctx.moveTo(0, size * 0.85); ctx.lineTo(0, -size * 0.6); ctx.stroke(); ctx.restore();
  }
  function leafMesh(size, color) {
    var sh = new THREE.Shape();
    sh.moveTo(0, -0.5); sh.bezierCurveTo(0.5, -0.25, 0.5, 0.3, 0, 0.55); sh.bezierCurveTo(-0.5, 0.3, -0.5, -0.25, 0, -0.5);
    var g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 18 });
    g.center();
    var m = new THREE.Mesh(g, std(color, { roughness: 0.4, emissive: 0x1b5e20, emissiveIntensity: 0.25 }));
    m.scale.setScalar(size); return m;
  }
  function ringTexture() {
    return makeTex(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#e9cf9f'; ctx.fillRect(0, 0, w, h);
      for (var i = 12; i > 0; i--) { ctx.fillStyle = i % 2 ? '#d8aa68' : '#efd6a6'; ctx.beginPath(); ctx.arc(128, 128, i * 10, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#b9873f'; ctx.beginPath(); ctx.arc(128, 128, 5, 0, 7); ctx.fill();
    });
  }
  function makePine(h) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * h, 0.075 * h, 0.3 * h, 6), flat(0x7a5232));
    trunk.position.y = 0.15 * h; g.add(trunk);
    var cols = [0x2e7d32, 0x388e3c, 0x4caf50];
    [[0.34, 0.5, 0.3], [0.27, 0.45, 0.58], [0.19, 0.4, 0.84]].forEach(function (a, i) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(a[0] * h, a[1] * h, 7), flat(cols[i]));
      cone.position.y = a[2] * h; g.add(cone);
    });
    return g;
  }
  function makeLog(len, r) {
    var cap = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1), [flat(0x8a5a3a), cap, cap]);
    m.rotation.z = Math.PI / 2; var g = new THREE.Group(); g.add(m); return g;
  }

  /* ------------------------------------------------------------------ the four hero objects (ProModels) */
  var reamG = PM.ream(), forestG = PM.forestIsland(), tabletG = PM.tablet(), globeG = PM.globe();
  var reamDims = reamG.userData.dims, reamAnchors = {
    band: new THREE.Vector3(0.2, 0.05, reamDims.RD / 2 + 0.05),
    top: new THREE.Vector3(-0.35, reamDims.RH + 0.22, 0.05),
    edge: new THREE.Vector3(reamDims.RW / 2, 0.0, 0.2),
    base: new THREE.Vector3(-0.35, -reamDims.RH, reamDims.RD / 2)
  };
  reamG.rotation.set(0.32, -0.55, 0);
  var tabletParts = { cards: tabletG.userData.parts.floatCards.map(function (c) { return { m: c.mesh, b: c.base, p: c.phase }; }) };
  tabletG.userData.parts.screen.scale.setScalar(1);

  /* ------------------------------------------------------------------ dark-scene particles */
  var particles;
  (function () {
    var N = 260, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = (Math.random() - 0.5) * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1; seed[i] = Math.random() * 6.28;
    }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var m = new THREE.PointsMaterial({ color: 0x6df0a0, size: 0.05, transparent: true, opacity: 0, depthWrite: false });
    particles = new THREE.Points(g, m); particles.userData.seed = seed; scene.add(particles);
  })();

  var objs = [reamG, forestG, tabletG, globeG];
  objs.forEach(function (o) { o.scale.multiplyScalar(0.0001); scene.add(o); if (PM) PM.applyLook(o); });
  var baseScale = [1.0, 1.0, 1.0, 1.0];
  var baseS = objs.map(function (o) { return o === tabletG ? 1.18 : (o === forestG ? 1.12 : (o === globeG ? 1.05 : 1.05)); });

  /* ------------------------------------------------------------------ layout + loop */
  var W = 1, H = 1, isMobile = false;
  var layoutX = [1.15, -2.1, 2.0, -2.1];
  var layoutY = [-0.05, -0.95, -0.05, -0.1];
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    isMobile = W < 860;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.fov = isMobile ? 46 : 40; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  var scenes = [].slice.call(document.querySelectorAll('.xp-scene'));
  var rail = [].slice.call(document.querySelectorAll('.xp-rail a'));
  var bigWords = scenes.map(function (s) { return s.querySelector('.xp-bigword'); });
  var callouts = [].slice.call(document.querySelectorAll('.xp-callout'));
  var lines = document.getElementById('xpLines');
  var flash = document.getElementById('xpFlash');

  function scrollPos() {
    var y = window.scrollY || window.pageYOffset;
    var h = window.innerHeight;
    var tops = scenes.map(function (s) { return s.offsetTop; });
    if (y <= tops[0]) return 0;
    for (var i = 0; i < tops.length - 1; i++) {
      if (y < tops[i + 1]) return i + (y - tops[i]) / Math.max(1, (tops[i + 1] - tops[i]));
    }
    return tops.length - 1;
  }
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  var cur = 0, target = 0, activeIdx = 0, glitchTimer = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', function (e) { tmx = (e.clientX / W - 0.5); tmy = (e.clientY / H - 0.5); }, { passive: true });

  function setActive(idx) {
    if (idx === activeIdx) return;
    activeIdx = idx;
    rail.forEach(function (a, i) { a.classList.toggle('on', i === idx); });
    document.body.classList.toggle('dark-scene', idx === 2);
    if (!reduceMotion) {
      canvas.classList.add('glitch'); flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      clearTimeout(glitchTimer); glitchTimer = setTimeout(function () { canvas.classList.remove('glitch'); }, 320);
    }
  }

  var tmpV = new THREE.Vector3();
  function project(obj, local) {
    tmpV.copy(local); obj.localToWorld(tmpV); tmpV.project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H };
  }

  function updateCallouts(w0) {
    if (isMobile || !lines) { callouts.forEach(function (c) { c.classList.remove('show'); }); return; }
    var show = w0 > 0.6;
    var svg = '';
    var defs = [
      { id: 'co1', anchor: 'band', dx: -230, dy: -150 },
      { id: 'co2', anchor: 'top', dx: 190, dy: -140 },
      { id: 'co3', anchor: 'edge', dx: 210, dy: 10 },
      { id: 'co4', anchor: 'base', dx: 150, dy: 95 }
    ];
    defs.forEach(function (d) {
      var el = document.getElementById(d.id); if (!el) return;
      el.classList.toggle('show', show);
      if (!show) return;
      var p = project(reamG, reamAnchors[d.anchor]);
      var lx = p.x + d.dx, ly = p.y + d.dy;
      if (d.dx > 0) lx = Math.min(lx, W - el.offsetWidth - 60);
      el.style.left = (d.dx < 0 ? lx - el.offsetWidth - 8 : lx + 8) + 'px';
      el.style.top = (ly - el.offsetHeight / 2) + 'px';
      svg += '<path d="M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' L' + (lx - Math.sign(d.dx) * 24).toFixed(1) + ' ' + ly.toFixed(1) + ' L' + lx.toFixed(1) + ' ' + ly.toFixed(1) + '"/><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4"/>';
    });
    lines.innerHTML = svg;
    lines.style.opacity = show ? 1 : 0;
  }

  var clock = new THREE.Clock(), running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), 0.05);
    target = scrollPos();
    cur += (target - cur) * 0.085;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;

    var i0 = Math.max(0, Math.min(objs.length - 2, Math.floor(cur)));
    var f = smooth(cur - i0);
    var x = layoutX[i0] + (layoutX[i0 + 1] - layoutX[i0]) * f;
    var posX = isMobile ? 0 : x;
    var posY = isMobile ? 1.25 : layoutY[i0] + (layoutY[i0 + 1] - layoutY[i0]) * f;
    var s = isMobile ? 0.6 : 1.0;

    objs.forEach(function (o, i) {
      var d = Math.abs(cur - i);
      var w = smooth(1 - d * 1.35);
      var sc = baseS[i] * s * (0.0001 + w * 1.0);
      o.scale.setScalar(sc);
      o.visible = w > 0.01;
      o.position.set(posX, posY + Math.sin(t * 1.4 + i) * 0.06, 0);
      var spin = (i === 2) ? Math.sin(t * 0.6) * 0.55 : t * 0.32 + cur * 1.4;
      o.rotation.y = (i === 0 ? -0.55 : 0) + spin + mx * 0.8 + (1 - w) * (i < cur ? -2.2 : 2.2);
      o.rotation.x = (i === 0 ? 0.32 : 0.1) + my * 0.4;
    });

    // per-object life
    reamG.userData.update(t); forestG.userData.update(t); tabletG.userData.update(t); globeG.userData.update(t);

    // dark scene extras
    var dark = smooth(1 - Math.abs(cur - 2) * 1.2);
    particles.material.opacity = dark * 0.85;
    particles.rotation.y = t * 0.03;
    glow.intensity = dark * 1.6;
    glow.position.x = posX;
    var pp = particles.geometry.attributes.position, sd = particles.userData.seed;
    for (var j = 0; j < pp.count; j += 1) { pp.array[j * 3 + 1] += Math.sin(t * 0.6 + sd[j]) * 0.0016; }
    pp.needsUpdate = true;

    // big words drift opposite to the object for parallax depth
    bigWords.forEach(function (bw, i) {
      if (!bw) return;
      var shift = (cur - i) * -90;
      bw.style.setProperty('--shift', shift.toFixed(1) + 'px');
    });

    setActive(Math.round(cur));
    updateCallouts(smooth(1 - cur * 2.6));
    renderer.render(scene, camera);
  }
  frame();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false; else if (!running) { running = true; clock.getDelta(); frame(); }
  });

  rail.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); var el = document.querySelector(id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });
  });

  function showFallback() {
    var n = document.getElementById('xpNoWebgl'); if (n) n.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
  }
})();
