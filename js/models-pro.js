/**
 * Paper • Earth — Pro 3D model kit
 * High-fidelity, fully procedural models (no external assets) + a premium render look:
 * studio image-based lighting, ACES tone mapping, soft shadows, physically based materials.
 *
 *   ProModels.installLook(renderer, scene, opts)   -> environment + tone mapping + shadows
 *   ProModels.applyLook(object3d)                  -> shadows + env intensity on every mesh
 *   ProModels.globe() / tablet() / forestIsland() / ream()
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;
  var P = window.ProModels = {};

  /* ============================================================ noise */
  function hash(x, y, z) {
    var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var a = hash(xi, yi, zi), b = hash(xi + 1, yi, zi), c = hash(xi, yi + 1, zi), d = hash(xi + 1, yi + 1, zi);
    var e = hash(xi, yi, zi + 1), f = hash(xi + 1, yi, zi + 1), g = hash(xi, yi + 1, zi + 1), h = hash(xi + 1, yi + 1, zi + 1);
    var x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u;
    var y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
    return y1 + (y2 - y1) * w;
  }
  function fbm(x, y, z, oct) {
    var a = 0.5, s = 0, f = 1, n = 0;
    for (var i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); n += a; f *= 2; a *= 0.5; }
    return s / n;
  }
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function sstep(a, b, t) { t = clamp01((t - a) / (b - a)); return t * t * (3 - 2 * t); }

  /* ============================================================ canvas / shape helpers */
  function makeTex(w, h, draw, opts) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); draw(ctx, w, h);
    var t = new THREE.CanvasTexture(c);
    if (!opts || opts.srgb !== false) { if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; }
    t.anisotropy = 8;
    return t;
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
  function extrudeRound(w, h, r, d, b, segs) {
    var g = new THREE.ExtrudeGeometry(roundRectShape(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: segs || 5, curveSegments: 20 });
    g.translate(0, 0, -d / 2); return g;
  }
  function drawLeaf(ctx, cx, cy, size, color, rot) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot === undefined ? -0.6 : rot); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, size);
    ctx.bezierCurveTo(size * 0.95, size * 0.5, size * 0.95, -size * 0.6, 0, -size);
    ctx.bezierCurveTo(-size * 0.95, -size * 0.6, -size * 0.95, size * 0.5, 0, size); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.beginPath(); ctx.moveTo(0, size * 0.85); ctx.lineTo(0, -size * 0.6); ctx.stroke(); ctx.restore();
  }
  function leafMesh(size, color) {
    var sh = new THREE.Shape();
    sh.moveTo(0, -0.5); sh.bezierCurveTo(0.5, -0.25, 0.5, 0.3, 0, 0.55); sh.bezierCurveTo(-0.5, 0.3, -0.5, -0.25, 0, -0.5);
    var g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, curveSegments: 24 });
    g.center();
    var m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, emissive: 0x1b5e20, emissiveIntensity: 0.18 }));
    m.scale.setScalar(size); return m;
  }
  function pstd(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.55, metalness: 0.05 }, o || {})); }
  function pphys(color, o) { return new THREE.MeshPhysicalMaterial(Object.assign({ color: color, roughness: 0.4, metalness: 0 }, o || {})); }

  function ringTexture() {
    return makeTex(512, 512, function (ctx, w, h) {
      ctx.fillStyle = '#e8cf9f'; ctx.fillRect(0, 0, w, h);
      var cx = 256 + 10, cy = 256 - 6;
      for (var i = 26; i > 0; i--) {
        var jitter = 0.94 + 0.1 * Math.sin(i * 2.3);
        ctx.fillStyle = i % 2 ? '#d6a965' : '#eed6a8';
        ctx.beginPath(); ctx.ellipse(cx, cy, i * 9.4 * jitter, i * 9.4, 0.3, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(120,80,30,0.25)'; ctx.lineWidth = 2;
      for (var k = 0; k < 9; k++) { var a = k * 0.7 + 0.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250); ctx.stroke(); }
      ctx.fillStyle = '#9c6a2b'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
    });
  }
  function barkTexture() {
    var tex = makeTex(256, 512, function (ctx, w, h) {
      ctx.fillStyle = '#6a4a30'; ctx.fillRect(0, 0, w, h);
      var r = rng(7);
      for (var i = 0; i < 260; i++) {
        var x = r() * w, y = r() * h, len = 40 + r() * 140, wd = 2 + r() * 6;
        ctx.fillStyle = r() > 0.5 ? 'rgba(40,24,12,' + (0.25 + r() * 0.3) + ')' : 'rgba(150,110,70,' + (0.15 + r() * 0.2) + ')';
        ctx.fillRect(x, y, wd, len);
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /* ============================================================ premium render look */
  P.makeEnvironment = function (renderer) {
    // Studio environment painted as an equirectangular canvas (LDR, robust on every GPU)
    try {
      var W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0.0, '#f4f9ff'); gr.addColorStop(0.42, '#dcefe2'); gr.addColorStop(0.5, '#c9e4d0');
      gr.addColorStop(0.62, '#7aa384'); gr.addColorStop(1.0, '#2f4f38');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      function soft(x, y, w, h, color, blur) {
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.fillStyle = color;
        ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.restore();
      }
      soft(W * 0.64, H * 0.16, 260, 70, '#ffffff', 60);    // key softbox (upper right)
      soft(W * 0.64, H * 0.16, 200, 44, '#ffffff', 20);
      soft(W * 0.12, H * 0.34, 70, 190, '#e2ffee', 40);    // mint strip (left)
      soft(W * 0.88, H * 0.40, 60, 150, '#ffffff', 36);    // right strip
      soft(W * 0.40, H * 0.10, 320, 40, '#ffffff', 40);    // top rim
      soft(W * 0.00, H * 0.30, 120, 120, '#ffffff', 40);   // back light (wraps seam)
      soft(W * 1.00, H * 0.30, 120, 120, '#ffffff', 40);
      var tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer);
      var rt = pm.fromEquirectangular(tex);
      pm.dispose(); tex.dispose();
      return rt.texture;
    } catch (e) { return null; }
  };
  P.installLook = function (renderer, scene, opts) {
    opts = opts || {};
    try {
      renderer.outputEncoding = THREE.sRGBEncoding;
      var tone = window.PRO_TONE || opts.tone || 'linear';
      renderer.toneMapping = tone === 'none' ? THREE.NoToneMapping : tone === 'linear' ? THREE.LinearToneMapping : tone === 'reinhard' ? THREE.ReinhardToneMapping : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = (window.PRO_EXPOSURE || opts.exposure || 0.88);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) { /* ignore */ }
    var env = P.makeEnvironment(renderer);
    if (env) scene.environment = env;
    return !!env;
  };
  P.applyLook = function (root, opts) {
    opts = opts || {};
    var ei = opts.envIntensity === undefined ? 0.4 : opts.envIntensity;
    root.traverse(function (o) {
      if (!o.isMesh) return;
      var arr = Array.isArray(o.material) ? o.material : [o.material];
      var skip = false;
      arr.forEach(function (m) {
        if (m.isMeshStandardMaterial) { if (m.userData.envSet === undefined) { m.envMapIntensity = m.metalness > 0.5 ? 1.0 : ei; m.userData.envSet = true; } }
        if (m.transparent || m.isMeshBasicMaterial || m.isShaderMaterial) skip = true;
      });
      if (!skip) { o.castShadow = true; o.receiveShadow = true; }
    });
  };

  /* ============================================================ GLOBE */
  var _earth = null;
  function earthTextures() {
    if (_earth) return _earth;
    var W = 768, H = 384;
    function mk() { var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); return { c: c, x: x, d: x.createImageData(W, H) }; }
    var col = mk(), bmp = mk(), rgh = mk(), cld = mk();
    var sea = 0.5;
    for (var y = 0; y < H; y++) {
      var lat = (0.5 - y / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (var x = 0; x < W; x++) {
        var lon = (x / W) * Math.PI * 2 - Math.PI;
        var px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
        var h = fbm(px * 1.55 + 3.1, py * 1.55 + 3.1, pz * 1.55 + 3.1, 5);
        h = (h - 0.5) * 1.9 + 0.5;
        var m = fbm(px * 2.2 + 11, py * 2.2 + 11, pz * 2.2 + 11, 3);
        var r, g, b, bump = 0, rough = 235;
        var polar = Math.abs(lat) > (1.22 + (fbm(px * 5, py * 5, pz * 5, 3) - 0.5) * 0.35);
        if (h < sea) {
          var d = clamp01((sea - h) / 0.28);
          r = lerp(46, 8, d); g = lerp(160, 52, d); b = lerp(196, 98, d); rough = 60;
        } else {
          var e = (h - sea) / (1 - sea);
          bump = clamp01(e * 2.4) * 255;
          var wet = sstep(0.38, 0.62, m), dry = 1 - wet;
          var fr = lerp(150, 40, wet), fg = lerp(150, 108, wet), fb = lerp(92, 54, wet);
          var grr = lerp(fr, 96, 0.35), grg = lerp(fg, 156, 0.35), grb = lerp(fb, 72, 0.35);
          var tf = sstep(0.18, 0.32, e);
          r = lerp(grr, 124, tf * 0.7); g = lerp(grg, 114, tf * 0.7); b = lerp(grb, 100, tf * 0.7);
          var snow = sstep(0.34, 0.46, e + (fbm(px * 6, py * 6, pz * 6, 3) - 0.5) * 0.1);
          r = lerp(r, 246, snow); g = lerp(g, 249, snow); b = lerp(b, 247, snow);
          var beach = 1 - sstep(0.0, 0.03, e);
          r = lerp(r, 218, beach); g = lerp(g, 206, beach); b = lerp(b, 150, beach);
        }
        if (polar) { r = 238; g = 247; b = 250; bump = Math.max(bump, 40); rough = 150; }
        var i4 = (y * W + x) * 4;
        col.d.data[i4] = r; col.d.data[i4 + 1] = g; col.d.data[i4 + 2] = b; col.d.data[i4 + 3] = 255;
        bmp.d.data[i4] = bmp.d.data[i4 + 1] = bmp.d.data[i4 + 2] = bump; bmp.d.data[i4 + 3] = 255;
        rgh.d.data[i4] = rgh.d.data[i4 + 1] = rgh.d.data[i4 + 2] = rough; rgh.d.data[i4 + 3] = 255;
        var cv = fbm(px * 2.6 + 21, py * 3.1 + 21, pz * 2.6 + 21, 5);
        var ca = sstep(0.6, 0.8, cv);
        cld.d.data[i4] = 255; cld.d.data[i4 + 1] = 255; cld.d.data[i4 + 2] = 255; cld.d.data[i4 + 3] = ca * 205;
      }
    }
    [col, bmp, rgh, cld].forEach(function (o) { o.x.putImageData(o.d, 0, 0); });
    function T(o, srgb) { var t = new THREE.CanvasTexture(o.c); if (srgb && THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }
    _earth = { color: T(col, true), bump: T(bmp, false), rough: T(rgh, false), cloud: T(cld, true) };
    return _earth;
  }

  P.globe = function () {
    var T = earthTextures();
    var g = new THREE.Group();
    var earth = new THREE.Mesh(new THREE.SphereGeometry(1.2, 96, 64), new THREE.MeshStandardMaterial({
      map: T.color, bumpMap: T.bump, bumpScale: 0.045, roughnessMap: T.rough, roughness: 1, metalness: 0.0, envMapIntensity: 0.55
    }));
    g.add(earth);
    var clouds = new THREE.Mesh(new THREE.SphereGeometry(1.232, 72, 48), new THREE.MeshStandardMaterial({
      map: T.cloud, transparent: true, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: 0.5
    }));
    g.add(clouds);
    var atmo = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 48), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float f = pow(max(0.0, 0.74 - dot(vN, vec3(0.0,0.0,1.0))), 4.0); gl_FragColor = vec4(0.42, 0.92, 0.78, 1.0) * clamp(f, 0.0, 1.0) * 0.9; }'
    }));
    g.add(atmo);

    // Orbit ring: printed sheets + leaves + a faint guide
    var ring = new THREE.Group();
    var sheetTex = makeTex(256, 340, function (ctx, w, h) {
      ctx.fillStyle = '#fdfcf7'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7fa889'; ctx.fillRect(24, 28, 110, 12);
      ctx.fillStyle = '#c3d1c4'; for (var i = 0; i < 11; i++) ctx.fillRect(24, 64 + i * 22, i % 4 === 3 ? 120 : 208, 6);
      drawLeaf(ctx, 206, 300, 16, '#43a047');
    });
    var paper = new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
    var N = 14, R = 2.05;
    for (var k = 0; k < N; k++) {
      var a = (k / N) * Math.PI * 2, holder = new THREE.Group();
      holder.position.set(Math.cos(a) * R, Math.sin(a * 2) * 0.07, Math.sin(a) * R); holder.rotation.y = -a;
      if (k % 3 === 2) { var lf = leafMesh(0.5, 0x4caf50); lf.rotation.z = 1.2; lf.rotation.x = 0.4; holder.add(lf); }
      else {
        var sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.54, 6, 6), paper);
        var p = sheet.geometry.attributes.position;
        for (var v = 0; v < p.count; v++) { var xx = p.getX(v), yy = p.getY(v); p.setZ(v, 0.05 * Math.sin(xx * 6) + 0.03 * yy); }
        sheet.geometry.computeVertexNormals();
        sheet.rotation.set(0.25, 0, k % 2 ? 0.18 : -0.18); holder.add(sheet);
      }
      ring.add(holder);
    }
    var guide = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 6, 160), new THREE.MeshBasicMaterial({ color: 0xa8e6b8, transparent: true, opacity: 0.55 }));
    guide.rotation.x = Math.PI / 2; ring.add(guide);
    ring.rotation.set(0.32, 0, -0.38); g.add(ring);
    g.rotation.z = 0.2;
    g.userData.ring = ring;
    g.userData.update = function (t) { earth.rotation.y = t * 0.07; clouds.rotation.y = t * 0.1; ring.rotation.y = t * 0.45; };
    return g;
  };

  /* ============================================================ TABLET */
  P.tablet = function () {
    var g = new THREE.Group();
    var TW = 1.7, TH = 2.3, TD = 0.09, BEV = 0.03;
    var front = TD / 2 + BEV;

    var alu = new THREE.MeshStandardMaterial({ color: 0x41544a, roughness: 0.3, metalness: 0.92 });
    var body = new THREE.Mesh(extrudeRound(TW, TH, 0.2, TD, BEV, 8), alu);
    g.add(body);

    // Front glass (deep black, glossy) + bezel
    var glass = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(TW - 0.045, TH - 0.045, 0.175), 24),
      new THREE.MeshPhysicalMaterial({ color: 0x040706, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 }));
    glass.position.z = front + 0.0005; g.add(glass);
    glass.userData.z0 = glass.position.z;

    // UI on screen
    var UW = 1024, UH = Math.round(1024 * (TH - 0.17) / (TW - 0.17));
    var screenTex = makeTex(UW, UH, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.save(); rr(ctx, 0, 0, w, h, 54); ctx.clip();
      var bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0d2a1d'); bg.addColorStop(0.6, '#08170f'); bg.addColorStop(1, '#0a2418');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      var rg = ctx.createRadialGradient(w * 0.75, h * 0.2, 10, w * 0.75, h * 0.2, w * 0.7); rg.addColorStop(0, 'rgba(109,240,160,0.28)'); rg.addColorStop(1, 'rgba(109,240,160,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#eafff1'; ctx.font = '700 36px Arial'; ctx.fillText('9:41', 54, 80);
      ctx.fillStyle = '#6df0a0'; ctx.font = '700 30px Arial'; ctx.fillText('PAPERLESS OFFICE', 54, 150);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, 40, 190, w - 80, 380, 40); ctx.fill();
      // donut
      var cx = 250, cy = 380, R0 = 120;
      ctx.lineWidth = 34; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 7); ctx.stroke();
      var arc = ctx.createLinearGradient(cx - R0, cy - R0, cx + R0, cy + R0); arc.addColorStop(0, '#6df0a0'); arc.addColorStop(1, '#1fb86a');
      ctx.strokeStyle = arc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.92); ctx.stroke();
      ctx.fillStyle = '#eafff1'; ctx.font = '800 70px Arial'; ctx.textAlign = 'center'; ctx.fillText('92%', cx, cy + 22);
      ctx.textAlign = 'left'; ctx.fillStyle = '#9ad6a8'; ctx.font = '600 28px Arial'; ctx.fillText('carbon cut', 436, 330);
      ctx.fillStyle = '#eafff1'; ctx.font = '800 56px Arial'; ctx.fillText('-1.4 t', 436, 392);
      ctx.fillStyle = '#6df0a0'; ctx.font = '600 26px Arial'; ctx.fillText('CO\u2082 saved / year', 436, 436);
      // bars
      var bars = [0.4, 0.55, 0.5, 0.72, 0.64, 0.86, 1.0];
      bars.forEach(function (v, i) { var bw = 70, x = 80 + i * 118, bh = 170 * v, y = 540 - bh; var gr = ctx.createLinearGradient(0, y, 0, 540); gr.addColorStop(0, i === 6 ? '#6df0a0' : 'rgba(109,240,160,0.7)'); gr.addColorStop(1, 'rgba(109,240,160,0.18)'); ctx.fillStyle = gr; rr(ctx, x, y, bw, bh, 14); ctx.fill(); });
      // rows
      var rows = ['Quarterly report.pdf', 'Invoices 2026', 'Team handbook'];
      rows.forEach(function (r, i) { var y = 610 + i * 118; ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(ctx, 40, y, w - 80, 96, 28); ctx.fill(); ctx.fillStyle = 'rgba(109,240,160,0.25)'; rr(ctx, 64, y + 22, 52, 52, 14); ctx.fill(); drawLeaf(ctx, 90, y + 48, 14, '#6df0a0', 0.2); ctx.fillStyle = '#eafff1'; ctx.font = '600 32px Arial'; ctx.fillText(r, 140, y + 60); ctx.fillStyle = '#6df0a0'; ctx.font = '700 30px Arial'; ctx.fillText('\u2713', w - 110, y + 58); });
      // dock
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, 120, h - 150, w - 240, 100, 50); ctx.fill();
      [0, 1, 2, 3].forEach(function (i) { ctx.fillStyle = i === 0 ? '#6df0a0' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(230 + i * 188, h - 100, 24, 0, 7); ctx.fill(); });
      ctx.restore();
    });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.17, TH - 0.17), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, toneMapped: false }));
    screen.position.z = front + 0.002; g.add(screen); screen.userData.z0 = screen.position.z;

    // Diagonal glass reflection
    var sheenTex = makeTex(256, 256, function (ctx, w, h) {
      var gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.32, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.34, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    });
    var sheen = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.17, TH - 0.17), new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, depthWrite: false, toneMapped: false }));
    sheen.position.z = front + 0.004; g.add(sheen); sheen.userData.z0 = sheen.position.z;

    // Front camera
    var fcam = new THREE.Mesh(new THREE.CircleGeometry(0.018, 20), new THREE.MeshBasicMaterial({ color: 0x14202a }));
    fcam.position.set(0, TH / 2 - 0.055, front + 0.0012); g.add(fcam);

    // Side buttons + bottom port & speaker holes
    var btn = new THREE.MeshStandardMaterial({ color: 0x56695e, roughness: 0.3, metalness: 0.9 });
    var pw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.05), btn); pw.position.set(TW / 2 + 0.008, 0.55, 0); g.add(pw);
    [0.62, 0.3].forEach(function (y) { var vb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.05), btn); vb.position.set(-TW / 2 - 0.008, y, 0); g.add(vb); });
    var dark = new THREE.MeshBasicMaterial({ color: 0x050807 });
    var port = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.035), dark); port.position.set(0, -TH / 2 - BEV - 0.001, 0); g.add(port);
    for (var s = -4; s <= 4; s++) { if (s === 0) continue; var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 10), dark); hole.position.set(s * 0.065 + (s > 0 ? 0.12 : -0.12), -TH / 2 - BEV - 0.001, 0); g.add(hole); }

    // Rear camera module
    var cam = new THREE.Group();
    var plate = new THREE.Mesh(extrudeRound(0.62, 0.62, 0.12, 0.03, 0.012, 4), new THREE.MeshStandardMaterial({ color: 0x2c3a33, roughness: 0.35, metalness: 0.9 }));
    cam.add(plate);
    [[-0.14, 0.14], [0.14, 0.14], [-0.14, -0.14]].forEach(function (p, i) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 16, 40), new THREE.MeshStandardMaterial({ color: 0xaab8b0, roughness: 0.2, metalness: 1 }));
      ring.position.set(p[0], p[1], 0.03); cam.add(ring);
      var lens = new THREE.Mesh(new THREE.CircleGeometry(0.098, 36), new THREE.MeshPhysicalMaterial({ color: 0x0a1218, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02 }));
      lens.position.set(p[0], p[1], 0.032); cam.add(lens);
      var dot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x3a63a8 : 0x5a2f6a }));
      dot.position.set(p[0] - 0.02, p[1] + 0.025, 0.033); cam.add(dot);
    });
    var led = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshStandardMaterial({ color: 0xfff3c0, emissive: 0xffe9a0, emissiveIntensity: 0.6, roughness: 0.3 }));
    led.position.set(0.14, -0.14, 0.032); cam.add(led);
    cam.position.set(-TW / 2 + 0.45, TH / 2 - 0.45, -(front + 0.012)); cam.rotation.y = Math.PI; cam.position.x *= -1; g.add(cam);
    var logoTex = makeTex(256, 256, function (ctx) { ctx.clearRect(0, 0, 256, 256); drawLeaf(ctx, 128, 128, 70, '#8fb09a'); });
    var logo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.8 }));
    logo.position.set(0, -0.3, -(front + 0.002)); logo.rotation.y = Math.PI; g.add(logo);

    // Crown / scroll dial (side)
    var dialHolder = new THREE.Group(); dialHolder.position.set(TW / 2 + 0.03, 0.05, 0);
    var dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x6df0a0, roughness: 0.3, metalness: 0.7 }));
    dialMesh.rotation.z = Math.PI / 2; dialHolder.add(dialMesh);
    for (var q = 0; q < 18; q++) { var rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0x2c8a58, roughness: 0.4, metalness: 0.6 })); var an = (q / 18) * Math.PI * 2; rib.position.set(0, Math.cos(an) * 0.1, Math.sin(an) * 0.1); rib.rotation.x = an; dialHolder.add(rib); }
    g.add(dialHolder);

    // Floating glass UI cards
    function card(draw) {
      var tex = makeTex(256, 256, function (ctx, w, h) {
        ctx.clearRect(0, 0, w, h);
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
        var gr = ctx.createLinearGradient(0, 24, 0, 224); gr.addColorStop(0, 'rgba(255,255,255,0.98)'); gr.addColorStop(1, 'rgba(226,244,230,0.96)');
        ctx.fillStyle = gr; rr(ctx, 28, 24, 200, 200, 48); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; rr(ctx, 30, 26, 196, 196, 46); ctx.stroke();
        draw(ctx);
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    }
    var cCloud = card(function (ctx) {
      ctx.fillStyle = '#e8f5e9'; ctx.beginPath(); ctx.arc(104, 130, 34, 0, 7); ctx.arc(138, 114, 40, 0, 7); ctx.arc(170, 134, 30, 0, 7); ctx.fill(); ctx.fillRect(104, 130, 66, 34);
      ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke(); drawLeaf(ctx, 138, 136, 22, '#2e7d32');
    });
    var cDoc = card(function (ctx) {
      ctx.fillStyle = '#f1f8f1'; rr(ctx, 86, 70, 84, 112, 10); ctx.fill(); ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = '#81c784'; [96, 114, 132].forEach(function (y, i) { rr(ctx, 98, y, 60 - i * 12, 7, 3); ctx.fill(); });
      ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(160, 170, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(151, 170); ctx.lineTo(158, 177); ctx.lineTo(170, 162); ctx.stroke();
    });
    var cChart = card(function (ctx) {
      [[84, 40], [114, 70], [144, 100]].forEach(function (a, i) { ctx.fillStyle = ['#a5d6a7', '#66bb6a', '#2e7d32'][i]; rr(ctx, a[0], 184 - a[1], 22, a[1], 7); ctx.fill(); });
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(84, 100); ctx.lineTo(120, 82); ctx.lineTo(170, 58); ctx.stroke();
    });
    var floatCards = [
      { mesh: cCloud, base: new THREE.Vector3(-1.5, 0.9, 0.7), phase: 0 },
      { mesh: cDoc, base: new THREE.Vector3(1.55, -0.5, 0.9), phase: 1.7 },
      { mesh: cChart, base: new THREE.Vector3(-1.35, -1.0, 1.0), phase: 3.1 }
    ];
    floatCards.forEach(function (c) { c.mesh.position.copy(c.base); g.add(c.mesh); });

    // Orbiting data gems
    var nodes = new THREE.Group();
    var gem = new THREE.MeshPhysicalMaterial({ color: 0x8fe39a, emissive: 0x4caf50, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.1, clearcoat: 1 });
    for (var n = 0; n < 6; n++) { var nd = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gem); var ang = (n / 6) * Math.PI * 2; nd.position.set(Math.cos(ang) * 1.95, (n % 2 === 0 ? 0.55 : -0.5), Math.sin(ang) * 1.95); nodes.add(nd); }
    g.add(nodes);

    g.userData.parts = { screen: screen, sheen: sheen, bezel: glass, floatCards: floatCards, dial: dialHolder, nodes: nodes };
    g.userData.update = function (t) { floatCards.forEach(function (c) { c.mesh.position.y = c.base.y + Math.sin(t * 1.4 + c.phase) * 0.07; }); nodes.rotation.y = t * 0.4; };
    return g;
  };

  /* ============================================================ FOREST ISLAND */
  P.forestIsland = function () {
    var g = new THREE.Group();
    var R = 1.5, rand = rng(42);

    function height(x, z) {
      var r = Math.sqrt(x * x + z * z) / R, edge = Math.max(0, 1 - r);
      var base = 0.2 * Math.pow(Math.min(1, edge * 3.2), 0.7);
      var hills = (fbm(x * 1.3 + 7, 0.5, z * 1.3 + 7, 4) - 0.35) * 0.55 * Math.min(1, edge * 2.4);
      var dx = x + 0.2, dz = z - 0.6, pd = Math.sqrt(dx * dx + dz * dz);
      var pond = pd < 0.46 ? -0.2 * Math.pow(1 - pd / 0.46, 0.7) : 0;
      return base + hills + pond;
    }

    // Terrain
    var seg = 110, geo = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
    var cGrass1 = new THREE.Color(0x5fa84f), cGrass2 = new THREE.Color(0x3f8a3f), cDirt = new THREE.Color(0x8a6a44), cSand = new THREE.Color(0xd9cf9a), cMoss = new THREE.Color(0x7ec35c);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), r = Math.sqrt(x * x + z * z);
      if (r > R) { x *= R / r; z *= R / r; r = R; }
      var y = height(x, z);
      pos.setXYZ(i, x, y, z);
      var n1 = fbm(x * 3 + 1, 2, z * 3 + 1, 3), n2 = fbm(x * 9 + 4, 1, z * 9 + 4, 2);
      c.copy(cGrass1).lerp(cGrass2, n1).lerp(cMoss, n2 * 0.35);
      var dx = x + 0.2, dz = z - 0.6, pd = Math.sqrt(dx * dx + dz * dz);
      if (pd < 0.62) c.lerp(cSand, sstep(0.62, 0.44, pd) * 0.85);
      if (pd < 0.46) c.lerp(cDirt, sstep(0.46, 0.2, pd));
      if (r / R > 0.9) c.lerp(cDirt, sstep(0.9, 1.0, r / R));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
    g.add(top);

    // Floating rock underside with strata
    var cone = new THREE.ConeGeometry(R * 1.0, 1.75, 64, 18, true);
    cone.rotateX(Math.PI);
    var cp = cone.attributes.position, ccol = new Float32Array(cp.count * 3), rockA = new THREE.Color(0x6e5a46), rockB = new THREE.Color(0x8d7a63), soil = new THREE.Color(0x4f3a26), grey = new THREE.Color(0x726a60);
    for (var j = 0; j < cp.count; j++) {
      var px = cp.getX(j), py = cp.getY(j), pz = cp.getZ(j);
      var t01 = clamp01((py + 0.875) / 1.75);
      var ang = Math.atan2(pz, px);
      var d = (fbm(Math.cos(ang) * 2.2 + 3, py * 2.3, Math.sin(ang) * 2.2 + 3, 4) - 0.5) * 0.42 * (1.15 - t01 * 0.4);
      var rr0 = Math.sqrt(px * px + pz * pz);
      var k = (rr0 + d) / Math.max(rr0, 0.0001);
      if (t01 < 0.97) { px *= k; pz *= k; py += (fbm(px * 3, py * 3, pz * 3, 3) - 0.5) * 0.18; }
      cp.setXYZ(j, px, py - 0.875 + 0.0, pz);
      var band = Math.floor((t01 * 9) + fbm(px * 2, py * 2, pz * 2, 2) * 2);
      var cc = (band % 2) ? rockA : rockB;
      c.copy(cc).lerp(grey, sstep(0.3, 1.0, 1 - t01) * 0.45);
      if (t01 > 0.9) c.copy(soil).lerp(rockA, (0.97 - t01) * 12);
      ccol[j * 3] = c.r; ccol[j * 3 + 1] = c.g; ccol[j * 3 + 2] = c.b;
    }
    cone.setAttribute('color', new THREE.BufferAttribute(ccol, 3)); cone.computeVertexNormals();
    var under = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
    g.add(under);
    var lip = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.0, 0.1, 80, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a432b, roughness: 1, side: THREE.DoubleSide }));
    lip.position.y = -0.03; g.add(lip);

    // Pond
    var pondY = height(-0.2, 0.6) + 0.1;
    var water = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), new THREE.MeshPhysicalMaterial({ color: 0x2aa6c9, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.03 }));
    water.rotation.x = -Math.PI / 2; water.position.set(-0.2, pondY, 0.6); g.add(water);

    // Trees
    var barkTex = barkTexture();
    var trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 0.6, roughness: 0.95 });
    var trees = [];
    function makePine(h, seed) {
      var tg = new THREE.Group(), rn = rng(seed);
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * h, 0.07 * h, 0.45 * h, 10), trunkMat); trunk.position.y = 0.22 * h; tg.add(trunk);
      var tiers = 7;
      for (var t = 0; t < tiers; t++) {
        var f = t / (tiers - 1), rad = (0.42 - f * 0.34) * h, ht = (0.34 - f * 0.1) * h;
        var cg = new THREE.ConeGeometry(rad, ht, 11, 1);
        var p = cg.attributes.position;
        for (var v = 0; v < p.count; v++) { var vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v); var dd = 1 + (rn() - 0.5) * 0.28; if (vy < 0) { p.setXYZ(v, vx * dd, vy - rn() * 0.02 * h, vz * dd); } }
        cg.computeVertexNormals();
        var col = new THREE.Color().setHSL(0.33 + (rn() - 0.5) * 0.03, 0.5 + rn() * 0.1, 0.19 + f * 0.12 + rn() * 0.03);
        var m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, flatShading: true }));
        m.position.y = (0.32 + f * 0.62) * h; m.rotation.y = rn() * 6; tg.add(m);
      }
      return tg;
    }
    function makeBroadleaf(s, seed, hue) {
      var tg = new THREE.Group(), rn = rng(seed);
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.075 * s, 0.5 * s, 10), trunkMat); trunk.position.y = 0.25 * s; tg.add(trunk);
      for (var i = 0; i < 6; i++) {
        var b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.2 + rn() * 0.08) * s, 2), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue + (rn() - 0.5) * 0.04, 0.55, 0.32 + rn() * 0.12), roughness: 0.8, flatShading: true }));
        var a = rn() * 6.28, rd = (0.12 + rn() * 0.16) * s;
        b.position.set(Math.cos(a) * rd, (0.62 + rn() * 0.22) * s, Math.sin(a) * rd); tg.add(b);
      }
      return tg;
    }
    var spots = [], tries = 0;
    while (spots.length < 22 && tries < 400) {
      tries++;
      var a = rand() * Math.PI * 2, rr0 = Math.sqrt(rand()) * (R - 0.25), sx = Math.cos(a) * rr0, sz = Math.sin(a) * rr0;
      var pdx = sx + 0.2, pdz = sz - 0.6;
      if (Math.sqrt(pdx * pdx + pdz * pdz) < 0.62) continue;
      var ok = true; for (var q = 0; q < spots.length; q++) { var ddx = spots[q][0] - sx, ddz = spots[q][1] - sz; if (ddx * ddx + ddz * ddz < 0.07) { ok = false; break; } }
      if (ok) spots.push([sx, sz]);
    }
    spots.forEach(function (s, i) {
      var tr = (i % 7 === 3) ? makeBroadleaf(1.1 + rand() * 0.4, 100 + i, i % 2 ? 0.1 : 0.27) : makePine(0.85 + rand() * 0.75, 200 + i);
      tr.position.set(s[0], height(s[0], s[1]) - 0.01, s[1]); tr.rotation.y = rand() * 6;
      g.add(tr); trees.push(tr);
    });

    // Rocks
    for (var rk = 0; rk < 6; rk++) {
      var ra = rand() * 6.28, rd = 0.5 + rand() * 0.8, rx = Math.cos(ra) * rd, rz = Math.sin(ra) * rd;
      var rg = new THREE.IcosahedronGeometry(0.09 + rand() * 0.1, 1), rp = rg.attributes.position;
      for (var rv = 0; rv < rp.count; rv++) { var s2 = 0.8 + rand() * 0.4; rp.setXYZ(rv, rp.getX(rv) * s2, rp.getY(rv) * s2 * 0.7, rp.getZ(rv) * s2); }
      rg.computeVertexNormals();
      var rock = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x8b8a84, roughness: 0.9, flatShading: true }));
      rock.position.set(rx, height(rx, rz) + 0.02, rz); g.add(rock);
    }

    // Stump with growth rings + log pile
    var capMat = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.75 });
    var stump = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.2, 32), [trunkMat, capMat, trunkMat]);
    stump.position.set(0.55, height(0.55, 0.85) + 0.09, 0.85); g.add(stump);
    [[0.95, 0.35, 0.5], [1.02, 0.55, 0.38], [0.98, 0.45, 0.46]].forEach(function (lp, i) {
      var log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 24), [trunkMat, capMat, capMat]);
      log.rotation.z = Math.PI / 2; log.rotation.y = lp[2];
      var lx = 0.9 + (i === 2 ? 0.05 : 0), lz = 0.4 + i * 0.12;
      log.position.set(lx, height(lx, lz) + (i === 2 ? 0.27 : 0.11), lz); g.add(log);
    });

    // Grass blades + flowers (instanced)
    var bladeGeo = new THREE.ConeGeometry(0.014, 0.12, 3); bladeGeo.translate(0, 0.06, 0);
    var NB = 900, blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }), NB);
    var dummy = new THREE.Object3D(), bc = new THREE.Color();
    for (var bi = 0; bi < NB; bi++) {
      var ba = rand() * 6.28, br = Math.sqrt(rand()) * (R - 0.08), bx = Math.cos(ba) * br, bz = Math.sin(ba) * br;
      var bdx = bx + 0.2, bdz = bz - 0.6; if (Math.sqrt(bdx * bdx + bdz * bdz) < 0.5) { bx = -bx; bz = -bz; }
      dummy.position.set(bx, height(bx, bz), bz); dummy.rotation.set((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4);
      var sc = 0.6 + rand() * 1.0; dummy.scale.set(sc, sc * (0.7 + rand() * 0.8), sc); dummy.updateMatrix(); blades.setMatrixAt(bi, dummy.matrix);
      bc.setHSL(0.27 + rand() * 0.07, 0.55, 0.28 + rand() * 0.2); blades.setColorAt(bi, bc);
    }
    blades.instanceColor.needsUpdate = true; g.add(blades);
    var NF = 70, flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), NF);
    var fcols = [0xfff4b0, 0xffffff, 0xffb3c9, 0xffd27a];
    for (var fi = 0; fi < NF; fi++) {
      var fa = rand() * 6.28, fr = Math.sqrt(rand()) * (R - 0.15), fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr;
      var fdx = fx + 0.2, fdz = fz - 0.6; if (Math.sqrt(fdx * fdx + fdz * fdz) < 0.5) { fx = -fx; fz = -fz; }
      dummy.position.set(fx, height(fx, fz) + 0.09, fz); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.8 + rand() * 0.7); dummy.updateMatrix(); flowers.setMatrixAt(fi, dummy.matrix);
      flowers.setColorAt(fi, bc.setHex(fcols[fi % 4]));
    }
    flowers.instanceColor.needsUpdate = true; g.add(flowers);

    // Waterfall off the rim
    var wfTex = makeTex(64, 256, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < 26; i++) { var x = (i / 26) * w + Math.random() * 3; ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.5) + ')'; ctx.fillRect(x, Math.random() * h, 2 + Math.random() * 2, 40 + Math.random() * 120); }
      var gr = ctx.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,210,235,0.35)'); gr.addColorStop(1, 'rgba(120,210,235,0.35)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    });
    wfTex.wrapT = THREE.RepeatWrapping;
    var wfAng = 0.7;
    var wf = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.5), new THREE.MeshBasicMaterial({ map: wfTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    wf.position.set(Math.cos(wfAng) * (R * 0.9), -0.78, Math.sin(wfAng) * (R * 0.9)); wf.rotation.y = -wfAng + Math.PI / 2; wf.rotation.x = 0.18; g.add(wf);
    var mistTex = makeTex(128, 128, function (ctx) { var gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128); });
    var mists = [];
    for (var mi = 0; mi < 5; mi++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 })); sp.position.set(Math.cos(wfAng) * (R * 0.78) + (mi - 2) * 0.03, -1.55 - mi * 0.12, Math.sin(wfAng) * (R * 0.78)); sp.scale.setScalar(0.6 + mi * 0.15); g.add(sp); mists.push(sp); }

    // Fireflies
    var NFF = 36, ffPos = new Float32Array(NFF * 3), ffSeed = [];
    for (var ff = 0; ff < NFF; ff++) { var fa2 = rand() * 6.28, fr2 = rand() * 1.3; ffPos[ff * 3] = Math.cos(fa2) * fr2; ffPos[ff * 3 + 1] = 0.3 + rand() * 0.9; ffPos[ff * 3 + 2] = Math.sin(fa2) * fr2; ffSeed.push(rand() * 6.28); }
    var ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    var flies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.045, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(flies);

    g.scale.setScalar(0.92);
    g.userData.update = function (t) {
      trees.forEach(function (tr, i) { tr.rotation.z = Math.sin(t * 0.9 + i) * 0.012; tr.rotation.x = Math.cos(t * 0.7 + i * 1.3) * 0.01; });
      wfTex.offset.y = -t * 0.9;
      mists.forEach(function (m, i) { m.material.opacity = 0.35 + 0.2 * Math.sin(t * 1.3 + i); });
      var a = ffGeo.attributes.position;
      for (var i = 0; i < NFF; i++) { a.array[i * 3 + 1] = 0.35 + (0.5 + 0.5 * Math.sin(t * 0.6 + ffSeed[i])) * 0.8; a.array[i * 3] += Math.sin(t * 0.8 + ffSeed[i]) * 0.0009; }
      a.needsUpdate = true;
      flies.material.opacity = 0.65 + 0.3 * Math.sin(t * 2.2);
    };
    return g;
  };

  /* ============================================================ PAPER REAM */
  P.ream = function () {
    var g = new THREE.Group();
    var RW = 1.55, RD = 1.1, RH = 0.36;

    function printTop() {
      return makeTex(1024, 740, function (ctx, w, h) {
        ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, w, h);
        var gr = ctx.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1b5e20'); gr.addColorStop(1, '#43a047');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, 120); ctx.fillRect(0, h - 70, w, 70);
        ctx.fillStyle = '#fff'; ctx.font = '800 54px Arial'; ctx.fillText('PAPER \u2022 EARTH', 46, 82);
        drawLeaf(ctx, 800, 330, 190, '#2e8b3f', -0.5);
        ctx.fillStyle = '#16301a'; ctx.font = '900 150px Arial'; ctx.fillText('A4', 70, 330);
        ctx.font = '700 46px Arial'; ctx.fillText('MULTIPURPOSE PAPER', 76, 410);
        ctx.fillStyle = '#4a6b4b'; ctx.font = '600 38px Arial'; ctx.fillText('500 SHEETS  \u2022  80 GSM  \u2022  210 \u00d7 297 mm', 76, 470);
        ctx.fillStyle = '#16301a'; for (var i = 0; i < 46; i++) { ctx.fillRect(70 + i * 7, 560, (i % 3) + 2, 90); }
        ctx.fillStyle = '#fff'; ctx.font = '700 32px Arial'; ctx.fillText('Print less. Plant more.', 46, h - 24);
      });
    }
    function printFront() {
      return makeTex(1024, 250, function (ctx, w, h) {
        ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, 0, w, 36);
        for (var i = 0; i < 8; i++) drawLeaf(ctx, 70 + i * 128, 142, 36, i % 2 ? '#43a047' : '#2e7d32', 0.3);
        ctx.fillStyle = '#16301a'; ctx.font = '800 44px Arial'; ctx.fillText('500', 20, 232);
      });
    }
    function printEnd() {
      return makeTex(740, 250, function (ctx, w, h) {
        var gr = ctx.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#f2f1ea'); gr.addColorStop(0.5, '#fbfaf5'); gr.addColorStop(1, '#ebeae2'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(80,90,80,0.35)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.5, h * 0.5); ctx.lineTo(0, h); ctx.moveTo(w, 0); ctx.lineTo(w * 0.5, h * 0.5); ctx.lineTo(w, h); ctx.stroke();
      });
    }
    function sheetEdge() {
      return makeTex(512, 128, function (ctx, w, h) {
        ctx.fillStyle = '#f3f1e8'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(110,125,110,0.5)'; ctx.lineWidth = 1;
        for (var y = 1; y < h; y += 2.4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      });
    }
    var mTop = pstd(0xffffff, { map: printTop(), roughness: 0.62 });
    var mFront = pstd(0xffffff, { map: printFront(), roughness: 0.62 });
    var mEnd = pstd(0xffffff, { map: printEnd(), roughness: 0.62 });
    var mEdge = pstd(0xffffff, { map: sheetEdge(), roughness: 0.9 });
    var mPlain = pstd(0xf1efe5, { roughness: 0.9 });
    var mBack = pstd(0xf6f5ee, { roughness: 0.62 });

    var topStack = new THREE.Group(), bottomStack = new THREE.Group();
    var topBox = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [mEnd, mEnd, mTop, mEdge, mFront, mBack]);
    var botBox = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [mEnd, mEnd, mEdge, mPlain, mFront, mBack]);
    topStack.add(topBox); bottomStack.add(botBox);
    topStack.position.y = RH / 2; bottomStack.position.y = -RH / 2;
    g.add(topStack, bottomStack);

    // A fan of printed sheets rising from the corner of the stack
    var sheetTex = makeTex(512, 700, function (ctx, w, h) {
      ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(44, 52, 160, 16);
      ctx.fillStyle = '#c9d4c9'; for (var i = 0; i < 20; i++) ctx.fillRect(44, 100 + i * 28, i % 5 === 4 ? 230 : 424, 8);
      drawLeaf(ctx, 410, 640, 24, '#43a047');
    });
    var sheetMat = new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.8, side: THREE.DoubleSide });
    var fan = new THREE.Group(); fan.position.set(-RW / 2 + 0.1, RH / 2 + 0.004, 0.0);
    for (var i = 0; i < 5; i++) {
      var geo = new THREE.PlaneGeometry(1.0, 0.8, 24, 12); geo.rotateX(-Math.PI / 2); geo.translate(0.5, 0, 0);
      var p = geo.attributes.position;
      for (var v = 0; v < p.count; v++) { var x = p.getX(v); p.setY(v, p.getY(v) + Math.sin(x * 2.4) * 0.09 * (0.4 + i * 0.25)); }
      geo.computeVertexNormals();
      var sh = new THREE.Mesh(geo, sheetMat);
      var piv = new THREE.Group(); piv.rotation.z = 0.14 + i * 0.2; piv.rotation.y = (i - 2) * 0.05; piv.position.y = i * 0.006;
      piv.add(sh); fan.add(piv);
    }
    topStack.add(fan); fan.position.y = RH / 2 + 0.004; fan.position.x = -RW / 2 + 0.12;

    // Kraft belly band
    var wrapperBand = new THREE.Group();
    var labelTex = makeTex(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#c9a26b'; ctx.fillRect(0, 0, w, h);
      var r = rng(3); for (var i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(r() * w, r() * h, 20 + r() * 40, 1); ctx.fillStyle = 'rgba(80,50,20,0.08)'; ctx.fillRect(r() * w, r() * h, 20 + r() * 40, 1); }
      ctx.fillStyle = '#fffaf0'; rr(ctx, 24, 56, 208, 144, 14); ctx.fill();
      drawLeaf(ctx, 70, 112, 26, '#2e7d32');
      ctx.fillStyle = '#1b3d1c'; ctx.font = '800 34px Arial'; ctx.fillText('500', 110, 112);
      ctx.font = '700 20px Arial'; ctx.fillText('SHEETS \u00b7 A4', 100, 140);
      ctx.fillStyle = '#6d5a3c'; ctx.font = '600 16px Arial'; ctx.fillText('80 GSM \u00b7 RESPONSIBLE', 38, 178);
    });
    var kraft = new THREE.MeshStandardMaterial({ color: 0xc9a26b, roughness: 0.85 });
    var band = new THREE.Mesh(new THREE.BoxGeometry(0.62, RH * 2 + 0.05, RD + 0.05), [kraft, kraft, kraft, kraft, new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.85 }), kraft]);
    wrapperBand.add(band); g.add(wrapperBand);

    // Timber core (revealed when exploded)
    var timberCoreGroup = new THREE.Group();
    var bark = barkTexture(); bark.repeat.set(2, 1);
    var cap = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    var core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.5, 40), [new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 0.8, roughness: 0.95 }), cap, cap]);
    timberCoreGroup.add(core);
    var sprout = leafMesh(0.42, 0x66bb6a); sprout.position.set(0, 0.5, 0); sprout.rotation.z = -0.4; timberCoreGroup.add(sprout);
    timberCoreGroup.scale.set(0.001, 0.001, 0.001);
    g.add(timberCoreGroup);

    g.userData.parts = { topStack: topStack, bottomStack: bottomStack, wrapperBand: wrapperBand, timberCoreGroup: timberCoreGroup, sprout: sprout, fan: fan };
    g.userData.dims = { RW: RW, RD: RD, RH: RH };
    g.userData.update = function (t) { sprout.rotation.y = t * 1.2; };
    return g;
  };
})();
