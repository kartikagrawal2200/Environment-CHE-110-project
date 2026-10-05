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
  if (typeof THREE === 'undefined') { showFallback(); return; }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { showFallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  var sun = new THREE.DirectionalLight(0xffffff, 0.95); sun.position.set(3, 5, 6); scene.add(sun);
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

  /* ------------------------------------------------------------------ 0 · paper ream */
  var reamG = new THREE.Group();
  var reamAnchors = {};
  (function () {
    var RW = 1.6, RD = 1.15, RH = 0.38;
    var edgeTex = makeTex(256, 64, function (ctx, w, h) {
      ctx.fillStyle = '#efece0'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(105,120,105,0.6)'; ctx.lineWidth = 1.2;
      for (var y = 2; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    });
    var topTex = makeTex(256, 192, function (ctx, w, h) {
      ctx.fillStyle = '#f6f4ea'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c3d0c3';
      for (var i = 0; i < 9; i++) ctx.fillRect(24, 22 + i * 16, i % 4 === 3 ? 110 : 200, 5);
    });
    var edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.85 });
    var topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.85 });
    var plain = std(0xe9e6d8, { roughness: 0.9 });
    var topStack = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [edgeMat, edgeMat, topMat, plain, edgeMat, edgeMat]);
    var botStack = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [edgeMat, edgeMat, plain, plain, edgeMat, edgeMat]);
    topStack.position.y = RH / 2; botStack.position.y = -RH / 2;
    reamG.add(topStack, botStack);
    var labelTex = makeTex(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#c9a26b'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fffaf0'; rr(ctx, 24, 56, 208, 144, 14); ctx.fill();
      drawLeaf(ctx, 70, 112, 26, '#2e7d32');
      ctx.fillStyle = '#1b3d1c'; ctx.font = '800 34px Arial'; ctx.fillText('500', 110, 112);
      ctx.font = '700 20px Arial'; ctx.fillText('SHEETS \u00b7 A4', 100, 140);
      ctx.fillStyle = '#6d5a3c'; ctx.font = '600 16px Arial'; ctx.fillText('80 GSM \u00b7 VIRGIN PULP', 40, 178);
    });
    var kraft = std(0xc9a26b, { roughness: 0.8 });
    var band = new THREE.Mesh(new THREE.BoxGeometry(0.72, RH * 2 + 0.04, RD + 0.04), [kraft, kraft, kraft, kraft, new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }), kraft]);
    reamG.add(band);
    var sprout = leafMesh(0.45, 0x66bb6a); sprout.position.set(-0.45, 0.78, 0.1); sprout.rotation.z = -0.5; reamG.add(sprout);
    reamG.userData.sprout = sprout;
    reamAnchors = {
      band: new THREE.Vector3(0.15, 0.1, RD / 2 + 0.03),
      top: new THREE.Vector3(-0.5, RH * 2 - 0.0, 0.1),
      edge: new THREE.Vector3(RW / 2, 0.0, 0.2),
      base: new THREE.Vector3(-0.35, -RH, RD / 2)
    };
    reamG.rotation.set(0.32, -0.55, 0);
  })();

  /* ------------------------------------------------------------------ 1 · forest island */
  var forestG = new THREE.Group();
  (function () {
    var isle = new THREE.Group();
    var soil = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 0.55, 0.9, 10, 1), flat(0x7a5a3a)); soil.position.y = -0.55; isle.add(soil);
    var strata = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.38, 0.1, 10), flat(0x5f4429)); strata.position.y = -0.14; isle.add(strata);
    var grass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.46, 0.16, 10), flat(0x66b05a)); grass.position.y = -0.01; isle.add(grass);
    [[-0.85, -0.35, 1.35], [-0.2, -0.85, 1.1], [0.6, -0.55, 1.5], [1.0, 0.1, 1.0], [-1.0, 0.45, 0.95], [0.1, 0.1, 1.25], [0.75, 0.75, 0.8], [-0.35, 0.85, 0.85]].forEach(function (s) {
      var t = makePine(s[2]); t.position.set(s[0], 0.07, s[1]); t.rotation.y = s[0] * 3; isle.add(t);
    });
    var capTex = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    var stump = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.2, 22), [flat(0x7d5233), capTex, flat(0x6b4529)]); stump.position.set(0.1, 0.17, 1.05); isle.add(stump);
    [[0.85, 0.18, 1.05, 0.5], [0.95, 0.18, 1.3, 0.35], [0.9, 0.38, 1.18, 0.42]].forEach(function (p) { var l = makeLog(0.7, 0.11); l.position.set(p[0], p[1], p[2]); l.rotation.y = p[3]; isle.add(l); });
    var sap = leafMesh(0.3, 0x7ad06a); sap.position.set(-0.3, 0.32, 1.15); isle.add(sap);
    isle.scale.setScalar(0.95); isle.position.y = 0.2;
    forestG.add(isle);
  })();

  /* ------------------------------------------------------------------ 2 · digital tablet */
  var tabletG = new THREE.Group();
  var tabletParts = {};
  (function () {
    var TW = 1.75, TH = 2.35, TD = 0.1;
    var body = new THREE.Mesh(extrudeRound(TW, TH, 0.2, TD, 0.025), std(0xcfd8d2, { roughness: 0.38, metalness: 0.25 }));
    tabletG.add(body);
    var front = TD / 2 + 0.027;
    var bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(TW - 0.06, TH - 0.06, 0.17), 18), new THREE.MeshBasicMaterial({ color: 0x10241a }));
    bezel.position.z = front; tabletG.add(bezel);
    var screenTex = makeTex(640, 860, function (ctx, w, h) {
      ctx.save(); rr(ctx, 0, 0, w, h, 38); ctx.clip();
      var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f2a1d'); g.addColorStop(1, '#07130d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#6df0a0'; ctx.font = '700 28px Arial'; ctx.fillText('PAPERLESS OFFICE', 40, 66);
      ctx.fillStyle = '#eafff1'; ctx.font = '800 130px Arial'; ctx.fillText('92%', 40, 230);
      ctx.fillStyle = '#9ad6a8'; ctx.font = '600 28px Arial'; ctx.fillText('lifetime carbon cut', 44, 276);
      ctx.fillStyle = 'rgba(109,240,160,0.12)'; rr(ctx, 36, 320, w - 72, 280, 26); ctx.fill();
      [0.35, 0.5, 0.68, 0.82, 1.0].forEach(function (v, i) {
        var bw = 62, x = 74 + i * 90, bh = 190 * v, y = 566 - bh;
        ctx.fillStyle = i === 4 ? '#6df0a0' : 'rgba(109,240,160,0.5)'; rr(ctx, x, y, bw, bh, 12); ctx.fill();
      });
      for (var i = 0; i < 3; i++) { var y = 628 + i * 64; ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(ctx, 36, y, w - 72, 52, 16); ctx.fill(); ctx.fillStyle = '#6df0a0'; ctx.fillRect(56, y + 20, 140 - i * 20, 8); }
      ctx.restore();
    });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.14, TH - 0.14), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true }));
    screen.position.z = front + 0.002; tabletG.add(screen);
    function card(draw) {
      var tex = makeTex(256, 256, function (ctx, w, h) {
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
        ctx.fillStyle = 'rgba(255,255,255,0.96)'; rr(ctx, 28, 24, 200, 200, 46); ctx.fill(); ctx.shadowColor = 'transparent'; draw(ctx);
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    }
    var cCloud = card(function (ctx) {
      ctx.fillStyle = '#e8f5e9'; ctx.beginPath(); ctx.arc(104, 128, 34, 0, 7); ctx.arc(138, 112, 40, 0, 7); ctx.arc(170, 132, 30, 0, 7); ctx.fill(); ctx.fillRect(104, 128, 66, 34);
      ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke(); drawLeaf(ctx, 138, 134, 22, '#2e7d32');
    });
    var cDoc = card(function (ctx) {
      ctx.fillStyle = '#f1f8f1'; rr(ctx, 86, 70, 84, 112, 10); ctx.fill(); ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = '#81c784'; [96, 114, 132].forEach(function (y, i) { rr(ctx, 98, y, 60 - i * 12, 7, 3); ctx.fill(); });
      ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(160, 168, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(151, 168); ctx.lineTo(158, 175); ctx.lineTo(170, 160); ctx.stroke();
    });
    var cChart = card(function (ctx) {
      [[84, 40], [114, 70], [144, 100]].forEach(function (a, i) { ctx.fillStyle = ['#a5d6a7', '#66bb6a', '#2e7d32'][i]; rr(ctx, a[0], 180 - a[1], 22, a[1], 7); ctx.fill(); });
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(84, 98); ctx.lineTo(120, 80); ctx.lineTo(170, 56); ctx.stroke();
    });
    var cards = [
      { m: cCloud, b: new THREE.Vector3(-1.5, 0.9, 0.6), p: 0 },
      { m: cDoc, b: new THREE.Vector3(1.55, -0.5, 0.8), p: 1.7 },
      { m: cChart, b: new THREE.Vector3(-1.35, -1.0, 0.95), p: 3.1 }
    ];
    cards.forEach(function (c) { c.m.position.copy(c.b); tabletG.add(c.m); });
    tabletParts.cards = cards;
    tabletG.scale.setScalar(0.95);
  })();

  /* ------------------------------------------------------------------ 3 · globe with paper ring */
  var globeG = new THREE.Group();
  (function () {
    function landNoise(x, y, z) {
      return Math.sin(x * 2.3 + 1.3) * Math.cos(y * 2.6 + 0.4) + Math.sin(z * 2.9 + 0.5) * Math.cos(x * 1.8 + y * 1.2) * 0.8 + Math.sin((x + z) * 4.1) * 0.25;
    }
    var geo = new THREE.IcosahedronGeometry(1.15, 4), pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3), v = new THREE.Vector3(), c = new THREE.Color();
    var oA = new THREE.Color(0x1d6fa3), oB = new THREE.Color(0x2b8fbf), lA = new THREE.Color(0x1f6b2a), lB = new THREE.Color(0x4f9e45), sand = new THREE.Color(0xc9d98a);
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      var n = landNoise(v.x, v.y, v.z);
      if (Math.abs(v.y) > 0.9) { c.set(0xf4fbf6); v.multiplyScalar(1.165); }
      else if (n > 0.18) { var t = Math.min(1, (n - 0.18)); c.copy(lA).lerp(lB, t); if (n < 0.3) c.lerp(sand, 0.55); v.multiplyScalar(1.18 + t * 0.05); }
      else { c.copy(oA).lerp(oB, (n + 1.5) / 1.7 * 0.6); v.multiplyScalar(1.15); }
      pos.setXYZ(i, v.x, v.y, v.z); colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    var globe = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 10, specular: 0x1a2a22 }));
    globeG.add(globe);
    globeG.add(new THREE.Mesh(new THREE.SphereGeometry(1.34, 32, 32), new THREE.MeshBasicMaterial({ color: 0xbfeedd, transparent: true, opacity: 0.18, side: THREE.BackSide })));
    var ring = new THREE.Group();
    var paperMat = std(0xfdfcf7, { roughness: 0.8 }); paperMat.side = THREE.DoubleSide;
    var lineMat = new THREE.MeshBasicMaterial({ color: 0xb9c7b5 });
    var N = 14, R = 2.0;
    for (var k = 0; k < N; k++) {
      var a = (k / N) * Math.PI * 2, holder = new THREE.Group();
      holder.position.set(Math.cos(a) * R, Math.sin(a * 2) * 0.07, Math.sin(a) * R); holder.rotation.y = -a;
      if (k % 3 === 2) { var lf = leafMesh(0.45, 0x66bb6a); lf.rotation.z = 1.2; holder.add(lf); }
      else {
        var sheet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.014), paperMat); sheet.rotation.set(0.25, 0, k % 2 ? 0.18 : -0.18);
        for (var l = 0; l < 3; l++) { var ln = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.014, 0.004), lineMat); ln.position.set(0, 0.1 - l * 0.09, 0.012); sheet.add(ln); }
        holder.add(sheet);
      }
      ring.add(holder);
    }
    ring.rotation.set(0.32, 0, -0.38); globeG.add(ring); globeG.userData.ring = ring;
    globeG.rotation.z = 0.18;
  })();

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
  objs.forEach(function (o) { o.scale.multiplyScalar(0.0001); scene.add(o); });
  var baseScale = [1.0, 1.0, 1.0, 1.0];
  var baseS = objs.map(function (o) { return o === tabletG ? 1.2 : (o === forestG ? 1.2 : 1); });

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
      var spin = (i === 2) ? Math.sin(t * 0.6) * 0.4 : t * 0.32 + cur * 1.4;
      o.rotation.y = (i === 0 ? -0.55 : 0) + spin + mx * 0.8 + (1 - w) * (i < cur ? -2.2 : 2.2);
      o.rotation.x = (i === 0 ? 0.32 : 0.1) + my * 0.4;
    });

    // per-object life
    reamG.userData.sprout.rotation.y = t * 1.4;
    var cds = tabletParts.cards;
    for (var k = 0; k < cds.length; k++) cds[k].m.position.y = cds[k].b.y + Math.sin(t * 1.4 + cds[k].p) * 0.07;
    globeG.userData.ring.rotation.y = t * 0.5;

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
