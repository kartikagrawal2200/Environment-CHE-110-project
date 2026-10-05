/**
 * ============================================================================
 * BACKGROUND3D.JS — Shared 3D Background & Header Object Showcase Engine
 * ============================================================================
 * Project: Environmental Sustainability Research & Interactive Showcase
 * Topics Demonstrated:
 *   1. Full-screen WebGL Background Canvas with floating leaves, paper sheets,
 *      and origami paper-planes.
 *   2. Page-Specific 3D Showcase (reads data-scene attribute on <body>):
 *      - "home": Stack of paper morphing into a low-poly tree on scroll
 *      - "lifecycle": Stack of paper turning into a rustic wooden log
 *      - "impact": A translucent water drop paired with a flourishing tree
 *      - "compare": A paper sheet standing side-by-side with a modern laptop
 *      - "solutions": Recycling arrows symbol crafted from organic leaves
 *      - other pages: Floating leaves and ecological symbols
 *   3. Performance & Accessibility:
 *      - Single animation loop with visibility change detection (pauses when hidden)
 *      - Particle count capped at ~60 particles
 *      - Device pixel ratio capped at 2 for silky 60fps on laptop screens
 *      - Reduced motion support (prefers-reduced-motion)
 *      - aria-hidden="true" for screen readers
 * ============================================================================
 */

(function () {
  'use strict';

  // 1. Accessibility & Performance settings
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // Safety check: verify Three.js is available from CDN
  if (typeof THREE === 'undefined') {
    console.warn('Three.js library not loaded. 3D features will be disabled.');
    return;
  }

  // Active scene mode from body tag: data-scene="home|lifecycle|impact|compare|solutions|..."
  const sceneType = document.body.getAttribute('data-scene') || 'default';

  // ==========================================================================
  // PART A: FULL-SCREEN SHARED 3D BACKGROUND (Floating Leaves, Sheets & Planes)
  // ==========================================================================
  let bgRenderer, bgScene, bgCamera;
  const bgParticles = [];
  const TOTAL_BG_PARTICLES = 60; // strictly limited to ~60 for optimal laptop performance

  function initBackground3D() {
    let canvas = document.getElementById('bg3dCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'bg3dCanvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    // Set fixed background styling via JavaScript if not in CSS
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';

    // Scene & Camera
    bgScene = new THREE.Scene();
    bgCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    bgCamera.position.z = 18;

    // WebGL Renderer
    bgRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    bgRenderer.setSize(window.innerWidth, window.innerHeight);
    bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient and Directional lighting for soft organic shading
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    bgScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xe8f5e9, 0.7);
    dirLight.position.set(5, 10, 7);
    bgScene.add(dirLight);

    // Reusable Materials
    const leafMatGreen1 = new THREE.MeshLambertMaterial({ color: 0x43a047, side: THREE.DoubleSide });
    const leafMatGreen2 = new THREE.MeshLambertMaterial({ color: 0x81c784, side: THREE.DoubleSide });
    const leafMatMint = new THREE.MeshLambertMaterial({ color: 0xa5d6a7, side: THREE.DoubleSide });
    const paperMatWhite = new THREE.MeshLambertMaterial({ color: 0xfcfbf7, side: THREE.DoubleSide });
    const paperMatCream = new THREE.MeshLambertMaterial({ color: 0xf0ede0, side: THREE.DoubleSide });

    // 1. Procedural Leaf Geometry (organic pointed curve shape)
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.4);
    leafShape.quadraticCurveTo(0.35, 0, 0, 0.55);
    leafShape.quadraticCurveTo(-0.35, 0, 0, -0.4);
    const leafGeo = new THREE.ShapeGeometry(leafShape);

    // 2. Procedural Paper Sheet Geometry (mini rectangular sheet)
    const sheetGeo = new THREE.PlaneGeometry(0.55, 0.75);

    // 3. Procedural Origami Paper-Plane Geometry (3D folded triangle shape)
    const planeGeo = new THREE.BufferGeometry();
    const planeVertices = new Float32Array([
      // Left wing
      0.0, 0.0, 0.5,
      -0.5, 0.1, -0.4,
      0.0, 0.2, -0.4,
      // Right wing
      0.0, 0.0, 0.5,
      0.0, 0.2, -0.4,
      0.5, 0.1, -0.4,
      // Bottom keel/body
      0.0, 0.0, 0.5,
      0.0, -0.15, -0.3,
      0.0, 0.2, -0.4
    ]);
    planeGeo.setAttribute('position', new THREE.BufferAttribute(planeVertices, 3));
    planeGeo.computeVertexNormals();

    // Spawn 60 balanced particles: ~25 leaves, ~23 paper sheets, ~12 paper planes
    for (let i = 0; i < TOTAL_BG_PARTICLES; i++) {
      let mesh, type;
      const randType = Math.random();

      if (randType < 0.42) {
        // Organic Leaf
        type = 'leaf';
        const colors = [leafMatGreen1, leafMatGreen2, leafMatMint];
        mesh = new THREE.Mesh(leafGeo, colors[i % colors.length]);
        const s = 0.5 + Math.random() * 0.6;
        mesh.scale.set(s, s, s);
      } else if (randType < 0.8) {
        // Floating Paper Sheet
        type = 'sheet';
        const colors = [paperMatWhite, paperMatCream];
        mesh = new THREE.Mesh(sheetGeo, colors[i % colors.length]);
        const s = 0.6 + Math.random() * 0.7;
        mesh.scale.set(s, s, s);
      } else {
        // Origami Paper Plane
        type = 'plane';
        mesh = new THREE.Mesh(planeGeo, paperMatWhite);
        const s = 0.7 + Math.random() * 0.5;
        mesh.scale.set(s, s, s);
      }

      // Random 3D space distribution
      mesh.position.set(
        (Math.random() - 0.5) * 32,
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 14
      );

      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      bgScene.add(mesh);

      bgParticles.push({
        mesh: mesh,
        type: type,
        speedY: 0.007 + Math.random() * 0.012,
        speedRotX: (Math.random() - 0.5) * 0.014,
        speedRotY: (Math.random() - 0.5) * 0.016,
        speedRotZ: (Math.random() - 0.5) * 0.012,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: 0.01 + Math.random() * 0.015,
        swingAmp: 0.008 + Math.random() * 0.01
      });
    }

    // Resize listener for background canvas
    window.addEventListener('resize', () => {
      bgCamera.aspect = window.innerWidth / window.innerHeight;
      bgCamera.updateProjectionMatrix();
      bgRenderer.setSize(window.innerWidth, window.innerHeight);
    }, { passive: true });
  }

  // ==========================================================================
  // PART B: PAGE-SPECIFIC 3D HEADER SHOWCASE (Right Side of Page Header)
  // ==========================================================================
  let headerRenderer, headerScene, headerCamera;
  let headerMainObjectGroup;
  let headerTargetRotX = 0, headerTargetRotY = 0;
  let isHeaderActive = false;

  // Extra Home Page specific morph elements
  let homePaperStack, homeTreeGroup;

  function initHeaderShowcase() {
    // Look for header container: either #hero3dContainer (Home) or #pageHeader3d (Other pages)
    let headerContainer = document.getElementById('hero3dContainer') || document.getElementById('pageHeader3d');

    if (!headerContainer) return;

    isHeaderActive = true;
    const width = headerContainer.clientWidth || 360;
    const height = headerContainer.clientHeight || 300;

    // Header Scene & Camera
    headerScene = new THREE.Scene();
    headerCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    if (sceneType === 'home') {
      headerCamera.position.set(0, 0.25, 3.7);
    } else {
      headerCamera.position.set(0, 0.8, 5.2);
    }

    // Header Renderer
    headerRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    headerRenderer.setSize(width, height);
    headerRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    headerRenderer.shadowMap.enabled = true;
    headerRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    headerContainer.appendChild(headerRenderer.domElement);

    // Warm Ambient Light + Key Sunlight + Mint Fill Light
    const amb = new THREE.AmbientLight(0xfffbf2, 0.95);
    headerScene.add(amb);

    const sun = new THREE.DirectionalLight(0xffffff, 1.15);
    sun.position.set(4, 7, 5);
    sun.castShadow = true;
    headerScene.add(sun);

    const mintFill = new THREE.DirectionalLight(0x81c784, 0.5);
    mintFill.position.set(-3, -3, -2);
    headerScene.add(mintFill);

    // Master Group that tilts with mouse movement
    headerMainObjectGroup = new THREE.Group();
    headerScene.add(headerMainObjectGroup);

    // Build the specific 3D model according to data-scene attribute
    buildSceneObject(sceneType, headerMainObjectGroup);

    // Mouse tilt tracking
    window.addEventListener('mousemove', (e) => {
      const halfX = window.innerWidth / 2;
      const halfY = window.innerHeight / 2;
      const mouseX = (e.clientX - halfX) / halfX;
      const mouseY = (e.clientY - halfY) / halfY;
      headerTargetRotY = mouseX * 0.35;
      headerTargetRotX = mouseY * 0.25;
    }, { passive: true });

    // Resize listener for header viewport
    window.addEventListener('resize', () => {
      if (!headerContainer) return;
      const w = headerContainer.clientWidth;
      const h = headerContainer.clientHeight;
      if (w > 0 && h > 0) {
        headerCamera.aspect = w / h;
        headerCamera.updateProjectionMatrix();
        headerRenderer.setSize(w, h);
      }
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // SHARED 3D MODEL KIT (helpers used by every page model)
  // --------------------------------------------------------------------------
  function roundRectShape(w, h, r) {
    const x = -w / 2, y = -h / 2, sh = new THREE.Shape();
    sh.moveTo(x + r, y);
    sh.lineTo(x + w - r, y);     sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h);     sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r);         sh.quadraticCurveTo(x, y, x + r, y);
    return sh;
  }
  function canvasRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawLeaf(ctx, cx, cy, size, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, size);
    ctx.bezierCurveTo(size * 0.95, size * 0.5, size * 0.95, -size * 0.6, 0, -size);
    ctx.bezierCurveTo(-size * 0.95, -size * 0.6, -size * 0.95, size * 0.5, 0, size); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = size * 0.07;
    ctx.beginPath(); ctx.moveTo(0, size * 0.85); ctx.lineTo(0, -size * 0.6); ctx.stroke();
    ctx.restore();
  }
  function makeTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  function std(color, o) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.5, metalness: 0.08 }, o || {}));
  }
  function flat(color, o) {
    return new THREE.MeshPhongMaterial(Object.assign({ color: color, flatShading: true, shininess: 8, specular: 0x111111 }, o || {}));
  }
  function extrudeRound(w, h, r, depth, bevel) {
    const g = new THREE.ExtrudeGeometry(roundRectShape(w, h, r), {
      depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  function leafMesh(size, color, emissive) {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.5); sh.bezierCurveTo(0.5, -0.25, 0.5, 0.3, 0, 0.55); sh.bezierCurveTo(-0.5, 0.3, -0.5, -0.25, 0, -0.5);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 18 });
    g.center();
    const m = new THREE.Mesh(g, std(color, { roughness: 0.4, emissive: emissive || 0x1b5e20, emissiveIntensity: 0.25 }));
    m.scale.setScalar(size);
    return m;
  }
  function ringTexture() {
    return makeTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e9cf9f'; ctx.fillRect(0, 0, w, h);
      for (let i = 12; i > 0; i--) {
        ctx.fillStyle = i % 2 ? '#d8aa68' : '#efd6a6';
        ctx.beginPath(); ctx.arc(128, 128, i * 10, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#b9873f'; ctx.beginPath(); ctx.arc(128, 128, 5, 0, 7); ctx.fill();
    });
  }
  // Log lying along the X axis with growth-ring end caps
  function makeLog(len, r) {
    const cap = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    const bark = flat(0x8a5a3a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1), [bark, cap, cap]);
    mesh.rotation.z = Math.PI / 2;
    const g = new THREE.Group(); g.add(mesh);
    return g;
  }
  function makeStump(r, h) {
    const cap = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, h, 22, 1), [flat(0x7d5233), cap, flat(0x6b4529)]);
    return m;
  }
  function makePine(h) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * h, 0.075 * h, 0.3 * h, 6), flat(0x7a5232));
    trunk.position.y = 0.15 * h; g.add(trunk);
    const cols = [0x2e7d32, 0x388e3c, 0x4caf50];
    [[0.34, 0.5, 0.3], [0.27, 0.45, 0.58], [0.19, 0.4, 0.84]].forEach(([rad, ht, y], i) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad * h, ht * h, 7), flat(cols[i]));
      cone.position.y = y * h; g.add(cone);
    });
    return g;
  }
  function makeSheetStack(w, d, n, gap) {
    const g = new THREE.Group();
    const paper = std(0xfdfcf7, { roughness: 0.8 });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, gap * 0.8, d), paper);
      s.position.set((Math.sin(i * 2.3) * 0.02), i * gap, (Math.cos(i * 1.7) * 0.02));
      s.rotation.y = Math.sin(i * 1.3) * 0.05;
      g.add(s);
    }
    return g;
  }
  function cylBetween(a, b, radius, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return m;
  }
  function makeBook(w, h, d, color) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color, { roughness: 0.55 })));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, h - 0.08, d + 0.03), std(0xf7efd9, { roughness: 0.9 }));
    pages.position.set(0.035, 0, 0); g.add(pages);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, h + 0.01, d + 0.04), std(color, { roughness: 0.5 }));
    spine.position.set(-w / 2 + 0.015, 0, 0); g.add(spine);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.02, h * 0.55, d + 0.05), std(0xf1d58a, { metalness: 0.4, roughness: 0.4 }));
    band.position.set(-w / 2 - 0.005, 0, 0); g.add(band);
    return g;
  }
  function platformDisc(radius, color) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, 0.12, 48), std(color || 0xe3f3df, { roughness: 0.6 }));
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 64), new THREE.MeshBasicMaterial({ color: 0x9ed8b0 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.06; g.add(rim);
    return g;
  }

  /**
   * Builds the low-poly 3D object for each page
   */
  function buildSceneObject(type, parentGroup) {
    switch (type) {
      case 'home':
        buildHomeStudioShowcase(parentGroup);
        break;

      case 'lifecycle':
        buildLifecycleLogObject(parentGroup);
        break;

      case 'impact':
        buildImpactWaterDropObject(parentGroup);
        break;

      case 'compare':
        buildCompareLaptopObject(parentGroup);
        break;

      case 'solutions':
        buildSolutionsRecycleObject(parentGroup);
        break;

      case 'calculator':
        buildCalculatorObject(parentGroup);
        break;

      case 'about':
        buildAboutBulbObject(parentGroup);
        break;

      case 'contact':
        buildContactEnvelopeObject(parentGroup);
        break;

      case 'resources':
        buildResourcesBooksObject(parentGroup);
        break;

      case 'privacy':
        buildPrivacyShieldObject(parentGroup);
        break;

      case 'action-plan':
        buildActionPlanObject(parentGroup);
        break;

      default:
        buildDefaultEcoOrbObject(parentGroup);
        break;
    }
  }

  // --------------------------------------------------------------------------
  // MODEL 1: HOME PAGE — Rabbit R1 & Vibram Inspired 3D Eco Studio Engine
  // --------------------------------------------------------------------------
  let homeStudioModels = {};
  let studioActiveMode = 'r1';
  let isExploded = false;
  let isAutoOrbiting = true;
  let studioExplodeProgress = 0;
  let isUserDragging = false;
  let lastPointerX = 0, lastPointerY = 0;
  let dragVelX = 0, dragVelY = 0;
  let updateHomeStudioScene = null;

  function createRabbitScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f1418';
    ctx.fillRect(0, 0, 512, 640);

    // Status bar
    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('10:09 AM', 36, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('r1', 440, 52);

    // Eco Leaf indicator dot
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(412, 45, 9, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Rabbit Silhouette (Exact mascot from reference video)
    ctx.save();
    ctx.translate(256, 310);

    // Soft Orange/Green Glow Aura
    const radGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 140);
    radGlow.addColorStop(0, 'rgba(235, 77, 38, 0.35)');
    radGlow.addColorStop(1, 'rgba(235, 77, 38, 0)');
    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.fill();

    // Head Base (Rounded droplet/egg)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 20, 64, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left Ear
    ctx.beginPath();
    ctx.ellipse(-26, -58, 17, 50, -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Right Ear
    ctx.beginPath();
    ctx.ellipse(26, -58, 17, 50, 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Cute Dark Eyes
    ctx.fillStyle = '#0f1418';
    ctx.beginPath();
    ctx.arc(-22, 18, 6.5, 0, Math.PI * 2);
    ctx.arc(22, 18, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Bottom Status Kicker
    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ECO COMPANION • OS', 256, 520);

    ctx.fillStyle = '#a5d6a7';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('paperless mode active', 256, 556);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  function buildHomeStudioShowcase(group) {
    homeStudioModels = {};

    // ------------------------------------------------------------------------
    // 1. MODEL R1: Rabbit R1 Eco Companion Device (Direct Reference Video Match)
    // ------------------------------------------------------------------------
    const r1Group = new THREE.Group();
    group.add(r1Group);
    homeStudioModels.r1 = r1Group;

    const r1Inner = new THREE.Group();
    r1Group.add(r1Inner);
    const ORANGE = 0xff5a1f, ORANGE_D = 0xd9440f;
    const BW = 1.5, BH = 1.78;

    // Back shell (rounded orange body)
    const r1BackShell = new THREE.Group();
    const backMesh = new THREE.Mesh(extrudeRound(BW, BH, 0.26, 0.2, 0.05), std(ORANGE, { roughness: 0.42, metalness: 0.1 }));
    backMesh.position.z = -0.1;
    r1BackShell.add(backMesh);
    const backLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({
      map: makeTex(128, 128, (ctx) => { ctx.clearRect(0, 0, 128, 128); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(64, 70, 24, 0, 7); ctx.fill(); [[48, 20], [80, 20]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y + 12, 8, 24, 0, 0, 7); ctx.fill(); }); }),
      transparent: true
    }));
    backLogo.position.z = -0.1 - 0.1 - 0.056; backLogo.rotation.y = Math.PI;
    r1BackShell.add(backLogo);
    r1Inner.add(r1BackShell);

    // PCB (revealed when exploded)
    const r1CircuitGroup = new THREE.Group();
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.03), std(0x1f7a3a, { roughness: 0.5 }));
    r1CircuitGroup.add(pcb);
    const chipMat = std(0x1a1a1a, { roughness: 0.4 });
    [[-0.25, 0.35, 0.34, 0.34], [0.3, 0.45, 0.22, 0.22], [0.1, -0.2, 0.4, 0.28], [-0.35, -0.5, 0.2, 0.2]].forEach(([x, y, w, h]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), chipMat); c.position.set(x, y, 0.04); r1CircuitGroup.add(c);
    });
    const traceMat = new THREE.MeshBasicMaterial({ color: 0xffd36b });
    for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.9 - (i % 3) * 0.2, 0.014, 0.004), traceMat); t.position.set((i % 2 ? 0.08 : -0.08), -0.62 + i * 0.2, 0.02); r1CircuitGroup.add(t); }
    r1CircuitGroup.position.z = 0.0;
    r1CircuitGroup.scale.set(0.001, 0.001, 0.001);
    r1Inner.add(r1CircuitGroup);

    // Front shell: orange bezel with a window for the screen
    const r1FrontShell = new THREE.Group();
    const frame = roundRectShape(BW, BH, 0.26);
    const hole = new THREE.Path();
    const hw = 1.22, hh = 1.36, hr = 0.12, hx = -hw / 2, hy = -hh / 2 + 0.02;
    hole.moveTo(hx + hr, hy); hole.lineTo(hx + hw - hr, hy); hole.quadraticCurveTo(hx + hw, hy, hx + hw, hy + hr);
    hole.lineTo(hx + hw, hy + hh - hr); hole.quadraticCurveTo(hx + hw, hy + hh, hx + hw - hr, hy + hh);
    hole.lineTo(hx + hr, hy + hh); hole.quadraticCurveTo(hx, hy + hh, hx, hy + hh - hr);
    hole.lineTo(hx, hy + hr); hole.quadraticCurveTo(hx, hy, hx + hr, hy);
    frame.holes.push(hole);
    const frameMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 12 }), std(ORANGE, { roughness: 0.42, metalness: 0.1 }));
    frameMesh.position.z = 0.0; r1FrontShell.add(frameMesh);
    r1Inner.add(r1FrontShell);

    // Screen
    const r1ScreenGroup = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(hw + 0.02, hh + 0.02), new THREE.MeshBasicMaterial({ map: createRabbitScreenTexture() }));
    glass.position.set(0, hy + hh / 2, 0.075);
    r1ScreenGroup.add(glass);
    r1Inner.add(r1ScreenGroup);

    // Rotating camera eye pod (top-right)
    const eyePodGroup = new THREE.Group();
    eyePodGroup.position.set(0.38, BH / 2 + 0.02, 0.02);
    const podBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 28), std(0x15181a, { roughness: 0.35, metalness: 0.3 }));
    eyePodGroup.add(podBody);
    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 10, 28), std(0x9aa3a8, { metalness: 0.8, roughness: 0.25 }));
    lensRing.position.set(0, 0.04, 0.2); eyePodGroup.add(lensRing);
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), new THREE.MeshBasicMaterial({ color: 0x1b2a4a }));
    lensGlass.position.set(0, 0.04, 0.201); eyePodGroup.add(lensGlass);
    const lensDot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0x7fb2ff }));
    lensDot.position.set(-0.03, 0.07, 0.202); eyePodGroup.add(lensDot);
    r1Inner.add(eyePodGroup);

    // Scroll wheel (right edge) + push-to-talk button
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(BW / 2 + 0.03, 0.2, 0.02);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 28), std(0x1b1d1f, { roughness: 0.5, metalness: 0.2 }));
    wheelGroup.add(wheel);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), std(0x3a3d40));
      rib.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2); rib.rotation.y = -a; wheelGroup.add(rib);
    }
    r1Inner.add(wheelGroup);
    const ptt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.2), std(ORANGE_D, { roughness: 0.4 }));
    ptt.position.set(BW / 2 + 0.06, -0.42, 0.02); r1Inner.add(ptt);

    r1Inner.scale.setScalar(0.86);
    r1Inner.position.y = -0.1;
    homeStudioModels.r1Elements = { r1FrontShell, r1BackShell, r1ScreenGroup, r1CircuitGroup, eyePodGroup, wheelGroup };

    // ------------------------------------------------------------------------
    // 2. MODEL REAM: Paper Ream, Kraft Band, Inner Timber Core, Sprout
    // ------------------------------------------------------------------------
    const reamGroup = new THREE.Group();
    group.add(reamGroup);
    homeStudioModels.ream = reamGroup;
    reamGroup.scale.set(0.001, 0.001, 0.001); // Inactive initially (r1 is active)

    const reamInner = new THREE.Group();
    reamGroup.add(reamInner);
    const RW = 1.5, RD = 1.05, RH = 0.34;

    const edgeTex = makeTex(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#efece0'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(105,120,105,0.6)'; ctx.lineWidth = 1.2;
      for (let y = 2; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    });
    const topTex = makeTex(256, 192, (ctx, w, h) => {
      ctx.fillStyle = '#f6f4ea'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c3d0c3';
      for (let i = 0; i < 9; i++) ctx.fillRect(24, 22 + i * 16, i % 4 === 3 ? 110 : 200, 5);
    });
    const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.85 });
    const plain = std(0xe9e6d8, { roughness: 0.9 });
    function makeStack(topFace) {
      const gp = new THREE.Group();
      gp.add(new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [edgeMat, edgeMat, topFace ? topMat : plain, plain, edgeMat, edgeMat]));
      return gp;
    }
    const topStack = makeStack(true), bottomStack = makeStack(false);
    topStack.position.y = RH / 2; bottomStack.position.y = -RH / 2;
    reamInner.add(topStack, bottomStack);

    // Kraft belly band with label
    const wrapperBand = new THREE.Group();
    const labelTex = makeTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c9a26b'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 30, 1);
      ctx.fillStyle = '#fffaf0'; canvasRoundRect(ctx, 24, 56, 208, 144, 14); ctx.fill();
      drawLeaf(ctx, 70, 112, 26, '#2e7d32');
      ctx.fillStyle = '#1b3d1c'; ctx.font = '800 34px Arial'; ctx.textAlign = 'left'; ctx.fillText('500', 110, 112);
      ctx.font = '700 20px Arial'; ctx.fillText('SHEETS \u00b7 A4', 100, 140);
      ctx.fillStyle = '#6d5a3c'; ctx.font = '600 16px Arial'; ctx.fillText('80 GSM \u00b7 VIRGIN PULP', 40, 178);
    });
    const kraft = std(0xc9a26b, { roughness: 0.8 });
    const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.66, RH * 2 + 0.04, RD + 0.04), [kraft, kraft, kraft, kraft, labelMat, kraft]);
    wrapperBand.add(band);
    reamInner.add(wrapperBand);

    // Timber core revealed when the ream is exploded
    const timberCoreGroup = new THREE.Group();
    const capTex = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.7 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.5, 24), [flat(0x7d5233), capTex, capTex]);
    timberCoreGroup.add(core);
    const sp = leafMesh(0.36, 0x66bb6a); sp.position.set(0.0, 0.5, 0.0); sp.rotation.z = -0.4; timberCoreGroup.add(sp);
    timberCoreGroup.scale.set(0.001, 0.001, 0.001);
    reamInner.add(timberCoreGroup);

    const reamPlat = platformDisc(1.35, 0xd6edd3); reamPlat.position.y = -0.62; reamInner.add(reamPlat);
    reamInner.scale.setScalar(0.82); reamInner.position.y = 0.05;
    homeStudioModels.reamElements = { topStack, bottomStack, wrapperBand, timberCoreGroup };

    // ------------------------------------------------------------------------
    // 3. MODEL DIGITAL: Ultra-thin E-Reader Tablet with Tactile Dial & Circuit Nodes
    // ------------------------------------------------------------------------
    const digitalGroup = new THREE.Group();
    group.add(digitalGroup);
    homeStudioModels.digital = digitalGroup;
    digitalGroup.scale.set(0.001, 0.001, 0.001);

    // ---- helpers -------------------------------------------------------
    function roundRectShape(w, h, r) {
      const x = -w / 2, y = -h / 2, sh = new THREE.Shape();
      sh.moveTo(x + r, y);
      sh.lineTo(x + w - r, y);  sh.quadraticCurveTo(x + w, y, x + w, y + r);
      sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      sh.lineTo(x + r, y + h);  sh.quadraticCurveTo(x, y + h, x, y + h - r);
      sh.lineTo(x, y + r);      sh.quadraticCurveTo(x, y, x + r, y);
      return sh;
    }
    function canvasRoundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function drawLeaf(ctx, cx, cy, size, color) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.6); ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, size);
      ctx.bezierCurveTo(size * 0.95, size * 0.5, size * 0.95, -size * 0.6, 0, -size);
      ctx.bezierCurveTo(-size * 0.95, -size * 0.6, -size * 0.95, size * 0.5, 0, size); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = size * 0.07;
      ctx.beginPath(); ctx.moveTo(0, size * 0.85); ctx.lineTo(0, -size * 0.6); ctx.stroke();
      ctx.restore();
    }
    function makeTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); draw(ctx, w, h);
      const t = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    }

    // ---- tablet body (rounded aluminium slab, standing upright) ----------
    const TW = 1.75, TH = 2.35, TD = 0.1;
    const tablet = new THREE.Group();
    digitalGroup.add(tablet);

    const bodyGeo = new THREE.ExtrudeGeometry(roundRectShape(TW, TH, 0.2), {
      depth: TD, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 18
    });
    bodyGeo.translate(0, 0, -TD / 2);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xcfd8d2, roughness: 0.38, metalness: 0.25 }));
    body.castShadow = true;
    tablet.add(body);

    const front = TD / 2 + 0.027;
    const bezel = new THREE.Mesh(
      new THREE.ShapeGeometry(roundRectShape(TW - 0.06, TH - 0.06, 0.17), 18),
      new THREE.MeshBasicMaterial({ color: 0x10241a })
    );
    bezel.position.z = front;
    tablet.add(bezel);

    // Live-looking dashboard on the screen
    const screenTex = makeTex(640, 860, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save(); canvasRoundRect(ctx, 0, 0, w, h, 38); ctx.clip();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f4fbf2'); g.addColorStop(1, '#e3f3e0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // header
      ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, 0, w, 96);
      drawLeaf(ctx, 56, 48, 22, '#a5e3a0');
      ctx.fillStyle = '#ffffff'; ctx.font = '700 30px Poppins, Arial, sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText('PAPERLESS OFFICE', 92, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(w - 48, 48, 9, 0, 7); ctx.fill();

      // big stat
      ctx.fillStyle = '#1b3d1c'; ctx.font = '800 118px Poppins, Arial, sans-serif'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('92%', 44, 252);
      ctx.fillStyle = '#4a6b4b'; ctx.font = '600 28px Poppins, Arial, sans-serif';
      ctx.fillText('lifetime carbon cut vs. paper', 48, 296);

      // bar chart card
      ctx.fillStyle = '#ffffff'; canvasRoundRect(ctx, 36, 330, w - 72, 270, 26); ctx.fill();
      const bars = [0.35, 0.5, 0.68, 0.82, 1.0];
      bars.forEach((v, i) => {
        const bw = 62, gap = 28, x = 74 + i * (bw + gap), bh = 190 * v, y = 566 - bh;
        const bg = ctx.createLinearGradient(0, y, 0, 566);
        bg.addColorStop(0, i === 4 ? '#2e7d32' : '#81c784'); bg.addColorStop(1, i === 4 ? '#1b5e20' : '#a5d6a7');
        ctx.fillStyle = bg; canvasRoundRect(ctx, x, y, bw, bh, 12); ctx.fill();
      });
      ctx.strokeStyle = 'rgba(46,125,50,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(60, 400 + i * 62); ctx.lineTo(w - 60, 400 + i * 62); ctx.stroke(); }

      // document rows
      for (let i = 0; i < 3; i++) {
        const y = 628 + i * 64;
        ctx.fillStyle = '#ffffff'; canvasRoundRect(ctx, 36, y, w - 72, 52, 16); ctx.fill();
        ctx.fillStyle = '#c8e6c9'; canvasRoundRect(ctx, 52, y + 11, 30, 30, 8); ctx.fill();
        ctx.fillStyle = '#d6e4d6'; canvasRoundRect(ctx, 100, y + 16, 250 - i * 30, 9, 5); ctx.fill();
        ctx.fillStyle = '#e6eee6'; canvasRoundRect(ctx, 100, y + 32, 160 - i * 20, 7, 4); ctx.fill();
        ctx.fillStyle = '#2e7d32'; ctx.font = '700 22px Poppins, Arial, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText('\u2713', w - 76, y + 27);
      }
      ctx.restore();
    });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(TW - 0.14, (TW - 0.14) * 860 / 640),
      new THREE.MeshBasicMaterial({ map: screenTex, transparent: true })
    );
    screen.scale.y = (TH - 0.14) / ((TW - 0.14) * 860 / 640);
    screen.position.z = front + 0.002;
    tablet.add(screen);

    // Soft glass sheen across the screen
    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(TW - 0.14, TH - 0.14),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })
    );
    sheen.position.z = front + 0.004;
    sheen.rotation.z = 0.0;
    tablet.add(sheen);

    // Back logo
    const logoTex = makeTex(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(46,125,50,0.18)'; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.fill();
      drawLeaf(ctx, 128, 128, 70, '#2e7d32');
    });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }));
    logo.position.z = -(front);
    logo.rotation.y = Math.PI;
    tablet.add(logo);

    // Knurled tactile scroll dial on the right edge
    const dialHolder = new THREE.Group();
    dialHolder.position.set(TW / 2 + 0.02, 0.55, 0);
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.35, metalness: 0.3 })
    );
    dial.rotation.z = Math.PI / 2;
    dialHolder.add(dial);
    for (let k = 0; k < 14; k++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 }));
      const ang = (k / 14) * Math.PI * 2;
      rib.position.set(0, Math.cos(ang) * 0.15, Math.sin(ang) * 0.15);
      rib.rotation.x = ang;
      dialHolder.add(rib);
    }
    tablet.add(dialHolder);
    homeStudioModels.digitalWheel = dialHolder;

    // ---- floating UI cards (cloud / document / chart) ---------------------
    function makeCard(drawIcon) {
      const tex = makeTex(256, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.shadowColor = 'rgba(27,94,32,0.25)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#ffffff'; canvasRoundRect(ctx, 28, 24, 200, 200, 46); ctx.fill();
        ctx.shadowColor = 'transparent';
        drawIcon(ctx);
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    }
    const cardCloud = makeCard((ctx) => {
      ctx.fillStyle = '#e8f5e9'; ctx.beginPath();
      ctx.arc(104, 128, 34, 0, 7); ctx.arc(138, 112, 40, 0, 7); ctx.arc(170, 132, 30, 0, 7); ctx.fill();
      ctx.fillRect(104, 128, 66, 34);
      ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke();
      drawLeaf(ctx, 138, 134, 22, '#2e7d32');
    });
    const cardDoc = makeCard((ctx) => {
      ctx.fillStyle = '#f1f8f1'; canvasRoundRect(ctx, 86, 70, 84, 112, 10); ctx.fill();
      ctx.strokeStyle = '#43a047'; ctx.lineWidth = 6; ctx.stroke();
      ctx.fillStyle = '#81c784';
      [96, 114, 132].forEach((y, i) => { canvasRoundRect(ctx, 98, y, 60 - i * 12, 7, 3); ctx.fill(); });
      ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(160, 168, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath();
      ctx.moveTo(151, 168); ctx.lineTo(158, 175); ctx.lineTo(170, 160); ctx.stroke();
    });
    const cardChart = makeCard((ctx) => {
      [[84, 40], [114, 70], [144, 100]].forEach(([x, hh], i) => {
        ctx.fillStyle = ['#a5d6a7', '#66bb6a', '#2e7d32'][i]; canvasRoundRect(ctx, x, 180 - hh, 22, hh, 7); ctx.fill();
      });
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(84, 98); ctx.lineTo(120, 80); ctx.lineTo(170, 56); ctx.stroke();
    });
    const floatCards = [
      { mesh: cardCloud, base: new THREE.Vector3(-1.38, 0.82, 0.55), phase: 0.0 },
      { mesh: cardDoc,   base: new THREE.Vector3(1.42, -0.55, 0.75), phase: 1.7 },
      { mesh: cardChart, base: new THREE.Vector3(-1.22, -0.95, 0.9), phase: 3.1 }
    ];
    floatCards.forEach(c => { c.mesh.position.copy(c.base); digitalGroup.add(c.mesh); });

    // ---- orbiting data nodes (glowing mint gems) -------------------------
    const nodesGroup = new THREE.Group();
    const nodeMat = new THREE.MeshStandardMaterial({ color: 0x8fe39a, emissive: 0x4caf50, emissiveIntensity: 0.55, roughness: 0.3, flatShading: true });
    const nodeGeo = new THREE.OctahedronGeometry(0.09, 0);
    for (let n = 0; n < 6; n++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      const angle = (n / 6) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 1.95, (n % 2 === 0 ? 0.55 : -0.5), Math.sin(angle) * 1.95);
      nodesGroup.add(node);
    }
    digitalGroup.add(nodesGroup);
    homeStudioModels.digitalNodes = nodesGroup;

    homeStudioModels.digitalElements = { screen, sheen, bezel, floatCards };
    // Fit the whole tablet scene comfortably inside the stage
    const digitalInner = new THREE.Group();
    digitalGroup.children.slice().forEach(k => { digitalGroup.remove(k); digitalInner.add(k); });
    digitalInner.scale.setScalar(0.7);
    digitalInner.rotation.x = -0.05;
    digitalGroup.add(digitalInner);

    // ------------------------------------------------------------------------
    // 4. MODEL FOREST: Rustic Birch Log with Annual Rings & Living Foliage Sprout
    // ------------------------------------------------------------------------
    const forestGroup = new THREE.Group();
    group.add(forestGroup);
    homeStudioModels.forest = forestGroup;
    forestGroup.scale.set(0.001, 0.001, 0.001);

    const isle = new THREE.Group();
    forestGroup.add(isle);
    // Floating island: soil underside + grass top
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 0.55, 0.9, 10, 1), flat(0x7a5a3a));
    soil.position.y = -0.55; isle.add(soil);
    const strata = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.38, 0.1, 10), flat(0x5f4429)); strata.position.y = -0.14; isle.add(strata);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.46, 0.16, 10), flat(0x66b05a)); grass.position.y = -0.01; isle.add(grass);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), flat(0x9aa6a0)); rock.position.set(-0.8, 0.12, 1.0); isle.add(rock);

    // Standing pines (deterministic layout)
    const treeSpots = [
      [-0.85, -0.35, 1.35], [-0.2, -0.85, 1.1], [0.6, -0.55, 1.5], [1.0, 0.1, 1.0], [-1.0, 0.45, 0.95], [0.1, 0.1, 1.25], [0.75, 0.75, 0.8], [-0.35, 0.85, 0.85]
    ];
    treeSpots.forEach(([x, z, h]) => { const t = makePine(h); t.position.set(x, 0.07, z); t.rotation.y = x * 3; isle.add(t); });

    // Felled area: stump + log pile
    const stump = makeStump(0.2, 0.2); stump.position.set(0.1, 0.17, 1.05); isle.add(stump);
    const lg = makeLog(0.7, 0.11); lg.position.set(0.85, 0.18, 1.05); lg.rotation.y = 0.5; isle.add(lg);
    const lg2 = makeLog(0.7, 0.11); lg2.position.set(0.95, 0.18, 1.3); lg2.rotation.y = 0.35; isle.add(lg2);
    const lg3 = makeLog(0.7, 0.11); lg3.position.set(0.9, 0.38, 1.18); lg3.rotation.y = 0.42; isle.add(lg3);

    // A new sapling restoring the forest
    const sap = leafMesh(0.3, 0x7ad06a); sap.position.set(-0.3, 0.32, 1.15); isle.add(sap);
    const sapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.2, 5), flat(0x5d8f3a)); sapStem.position.set(-0.3, 0.17, 1.15); isle.add(sapStem);

    isle.scale.setScalar(0.72); isle.position.y = -0.2; isle.rotation.x = 0.0;
    homeStudioModels.forestIsle = isle;

    // ------------------------------------------------------------------------
    // 5. MODEL CIRCULAR: Origami Faceted Sustainable Tree & Circular Recycling Arrows
    // ------------------------------------------------------------------------
    const circularGroup = new THREE.Group();
    group.add(circularGroup);
    homeStudioModels.circular = circularGroup;
    circularGroup.scale.set(0.001, 0.001, 0.001);

    const origamiTrunkMat = new THREE.MeshPhongMaterial({ color: 0xf5f3ed, flatShading: true });
    const origamiTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 1.5, 6), origamiTrunkMat);
    origamiTrunk.position.y = -0.4;
    circularGroup.add(origamiTrunk);

    const origamiLeaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.1, 6), new THREE.MeshPhongMaterial({ color: 0x1b5e20, flatShading: true }));
    origamiLeaves1.position.y = 0.3;
    circularGroup.add(origamiLeaves1);

    const origamiLeaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.95, 6), new THREE.MeshPhongMaterial({ color: 0x2e7d32, flatShading: true }));
    origamiLeaves2.position.y = 0.95;
    circularGroup.add(origamiLeaves2);

    const origamiLeaves3 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.85, 6), new THREE.MeshPhongMaterial({ color: 0x43a047, flatShading: true }));
    origamiLeaves3.position.y = 1.55;
    circularGroup.add(origamiLeaves3);

    const recycleRingGroup = new THREE.Group();
    const arrowMat = new THREE.MeshLambertMaterial({ color: 0x81c784 });
    for (let a = 0; a < 3; a++) {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 5), arrowMat);
      const ang = (a / 3) * Math.PI * 2;
      arrow.position.set(Math.cos(ang) * 1.8, 0.4, Math.sin(ang) * 1.8);
      arrow.rotation.z = -Math.PI / 2;
      arrow.rotation.y = -ang;
      recycleRingGroup.add(arrow);
    }
    circularGroup.add(recycleRingGroup);
    homeStudioModels.recycleRing = recycleRingGroup;

    // ------------------------------------------------------------------------
    // SETUP DRAG & ORBIT LISTENER ON HERO CONTAINER
    // ------------------------------------------------------------------------
    const heroBox = document.getElementById('hero3dContainer');
    if (heroBox) {
      heroBox.addEventListener('pointerdown', (e) => {
        isUserDragging = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        dragVelX = 0;
        dragVelY = 0;
      });

      window.addEventListener('pointermove', (e) => {
        if (!isUserDragging) return;
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;

        dragVelX = dx * 0.008;
        dragVelY = dy * 0.008;

        group.rotation.y += dragVelX;
        group.rotation.x += dragVelY;
        group.rotation.x = Math.max(-0.6, Math.min(0.6, group.rotation.x));
      });

      window.addEventListener('pointerup', () => {
        isUserDragging = false;
      });
      window.addEventListener('pointercancel', () => {
        isUserDragging = false;
      });
    }

    // ------------------------------------------------------------------------
    // WIRE UP STUDIO CONTROLS & LISTENERS
    // ------------------------------------------------------------------------
    initStudioUiListeners(group);

    // Initial orientation
    group.rotation.set(0.12, -0.32, 0);

    // ------------------------------------------------------------------------
    // UPDATE FUNCTION CALLED ON EVERY FRAME IN ANIMATE LOOP
    // ------------------------------------------------------------------------
    updateHomeStudioScene = function (elapsed, delta) {
      // 1. Inertia & Auto-Spin
      if (!isUserDragging) {
        group.rotation.y += dragVelX;
        group.rotation.x += dragVelY;
        dragVelX *= 0.93;
        dragVelY *= 0.93;

        if (isAutoOrbiting && Math.abs(dragVelX) < 0.001) {
          group.rotation.y += 0.006;
        }
        group.rotation.x = Math.max(-0.6, Math.min(0.6, group.rotation.x));
      }

      // Gentle floating bob
      group.position.y = Math.sin(elapsed * 1.5) * 0.07;

      // 2. Smooth Explode Progress
      const targetExplode = isExploded ? 1.0 : 0.0;
      studioExplodeProgress += (targetExplode - studioExplodeProgress) * 0.09;

      // Explode for R1
      if (homeStudioModels.r1Elements) {
        const { r1FrontShell, r1BackShell, r1ScreenGroup, r1CircuitGroup, eyePodGroup, wheelGroup } = homeStudioModels.r1Elements;
        if (r1FrontShell && r1BackShell && r1ScreenGroup && r1CircuitGroup) {
          r1FrontShell.position.z = studioExplodeProgress * 0.65;
          r1ScreenGroup.position.z = studioExplodeProgress * 1.15;
          r1BackShell.position.z = -studioExplodeProgress * 0.75;
          const pcbScale = Math.max(0.001, studioExplodeProgress * 1.0);
          r1CircuitGroup.scale.set(pcbScale, pcbScale, pcbScale);
        }
        if (eyePodGroup) {
          eyePodGroup.rotation.y = Math.sin(elapsed * 1.8) * 0.45;
        }
        if (wheelGroup) {
          wheelGroup.rotation.y += 0.025;
        }
      }

      // Explode for Ream
      if (homeStudioModels.reamElements) {
        const { topStack, bottomStack, wrapperBand, timberCoreGroup } = homeStudioModels.reamElements;
        if (topStack && bottomStack && wrapperBand && timberCoreGroup) {
          topStack.position.y = 0.17 + studioExplodeProgress * 0.95;
          bottomStack.position.y = -0.17 - studioExplodeProgress * 0.7;
          wrapperBand.position.z = studioExplodeProgress * 0.9;
          wrapperBand.scale.set(1 + studioExplodeProgress * 0.16, 1, 1 + studioExplodeProgress * 0.16);

          const coreScale = Math.max(0.001, studioExplodeProgress * 1.0);
          timberCoreGroup.scale.set(coreScale, coreScale, coreScale);
        }
      }

      // Explode / float for Digital tablet
      if (homeStudioModels.digitalElements) {
        const { screen, sheen, bezel, floatCards } = homeStudioModels.digitalElements;
        const e = studioExplodeProgress;
        bezel.position.z = 0.077 + e * 0.12;
        screen.position.z = 0.079 + e * 0.3;
        sheen.position.z = 0.081 + e * 0.42;
        floatCards.forEach(c => {
          const spread = 1 + e * 0.08;
          c.mesh.position.set(
            c.base.x * spread,
            c.base.y * spread + Math.sin(elapsed * 1.4 + c.phase) * 0.06,
            c.base.z + e * 0.3
          );
        });
      }

      // 3. Smooth Scale Transition between Modes
      const modes = ['r1', 'ream', 'digital', 'forest'];
      modes.forEach(m => {
        const obj = homeStudioModels[m];
        if (!obj) return;
        const targetScale = (m === studioActiveMode) ? 1.0 : 0.001;
        const cur = obj.scale.x;
        const next = cur + (targetScale - cur) * 0.1;
        obj.scale.set(next, next, next);
        obj.visible = (next > 0.015);
      });

      // 4. Digital Node Orbit & Circular Recycle Ring Rotation
      if (homeStudioModels.digitalNodes && studioActiveMode === 'digital') {
        homeStudioModels.digitalNodes.rotation.y += 0.02;
        if (homeStudioModels.digitalWheel) {
          homeStudioModels.digitalWheel.rotation.x += 0.03;
        }
      }
      if (homeStudioModels.recycleRing && studioActiveMode === 'circular') {
        homeStudioModels.recycleRing.rotation.y += 0.015;
      }
    };
  }

  /**
   * Wires up buttons, range slider, telemetry segments, callout drawer, and dynamic badges
   */
  function initStudioUiListeners(mainGroup) {
    // A. Explode Layers Button
    const btnExplode = document.getElementById('btnExplodeLayers');
    const lblExplode = document.getElementById('explodeBtnLabel');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => {
        isExploded = !isExploded;
        btnExplode.classList.toggle('active', isExploded);
        btnExplode.setAttribute('aria-pressed', isExploded ? 'true' : 'false');
        if (lblExplode) lblExplode.textContent = isExploded ? '↺ Collapse Layers' : '✦ Explode Layers';
      });
    }

    // B. Auto-Orbit Button
    const btnSpin = document.getElementById('btnToggleSpin');
    const lblSpin = document.getElementById('spinBtnLabel');
    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        isAutoOrbiting = !isAutoOrbiting;
        btnSpin.classList.toggle('active', isAutoOrbiting);
        btnSpin.setAttribute('aria-pressed', isAutoOrbiting ? 'true' : 'false');
        if (lblSpin) lblSpin.textContent = isAutoOrbiting ? '⟳ Auto-Orbit' : '❚❚ Orbit Paused';
      });
    }

    // C. Reset Camera Button
    const btnReset = document.getElementById('btnResetCamera');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        mainGroup.rotation.set(0.12, -0.32, 0);
        dragVelX = 0;
        dragVelY = 0;
        isExploded = false;
        if (btnExplode) {
          btnExplode.classList.remove('active');
          btnExplode.setAttribute('aria-pressed', 'false');
          if (lblExplode) lblExplode.textContent = '✦ Explode Layers';
        }
      });
    }

    // D. Left Stacked Mode Cards (Rabbit R1 style)
    const stackBtns = document.querySelectorAll('.studio-card-btn');
    const bgText = document.getElementById('heroGiantBgText');
    const modelBadge = document.getElementById('studioModelBadge');

    const modeMeta = {
      r1: { bg: 'R1', badge: 'MOD. 01 / RABBIT R1 COMPANION' },
      ream: { bg: 'PAPER', badge: 'MOD. 02 / RECYCLED REAM' },
      digital: { bg: 'DIGITAL', badge: 'MOD. 03 / DIGITAL SLATE' },
      forest: { bg: 'FOREST', badge: 'MOD. 04 / INDUSTRIAL TIMBER' }
    };

    const modeCallouts = {
      r1: [
        { metric: 'water', icon: '👁️', val: '360° Rotational Eye', sub: 'Environmental document vision' },
        { metric: 'timber', icon: '🎙️', val: 'Push-to-Talk AI', sub: 'Instant zero-paper queries' },
        { metric: 'waste', icon: '⚙️', val: 'Analog Scroll Wheel', sub: 'Tactile digital navigation' },
        { metric: 'digital', icon: '⚡', val: 'Pocket Companion', sub: 'Replaces 25 lbs notebooks' }
      ],
      ream: [
        { metric: 'water', icon: '💧', val: '10 L / Sheet', sub: 'Chemical pulping washing' },
        { metric: 'timber', icon: '🌲', val: '24 Trees / Ton', sub: 'Virgin industrial timber' },
        { metric: 'waste', icon: '♻️', val: '26% Landfill', sub: 'Anaerobic methane decay' },
        { metric: 'digital', icon: '⚡', val: '92% Carbon Cut', sub: 'Digital workflow threshold' }
      ],
      digital: [
        { metric: 'water', icon: '☁️', val: 'Cloud Portals', sub: 'Paperless digital workflows' },
        { metric: 'timber', icon: '🌲', val: '0 Virgin Trees', sub: '100% forest preservation' },
        { metric: 'waste', icon: '💧', val: '98% Water Conserved', sub: 'Closed-loop data centers' },
        { metric: 'digital', icon: '⚡', val: '92% Carbon Cut', sub: 'Amortized across lifespan' }
      ],
      forest: [
        { metric: 'water', icon: '🌲', val: 'Boreal Canopy', sub: 'Critical carbon reservoir' },
        { metric: 'timber', icon: '🪓', val: '40% Global Wood', sub: 'Commercial pulp harvest' },
        { metric: 'waste', icon: '🌱', val: 'Soil Carbon Loss', sub: 'Loss of root stabilization' },
        { metric: 'digital', icon: '⏳', val: '50-Yr Recovery', sub: 'Decades to regrow' }
      ]
    };

    function updateCalloutCardsForMode(mode) {
      const items = modeCallouts[mode];
      if (!items) return;
      const calloutCards = document.querySelectorAll('.tech-callout-card');
      calloutCards.forEach((card, idx) => {
        if (items[idx]) {
          const item = items[idx];
          const iconEl = card.querySelector('.callout-icon');
          const valEl = card.querySelector('.callout-val');
          const subEl = card.querySelector('.callout-sub');
          if (iconEl) iconEl.textContent = item.icon;
          if (valEl) valEl.textContent = item.val;
          if (subEl) subEl.textContent = item.sub;
          card.dataset.metric = item.metric;
        }
      });
    }

    stackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (!mode || mode === studioActiveMode) return;
        studioActiveMode = mode;

        stackBtns.forEach(b => {
          const isActive = (b === btn);
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (modeMeta[mode]) {
          if (bgText) {
            bgText.style.opacity = '0';
            bgText.style.transform = 'translate(-50%, -50%) scale(0.92)';
            setTimeout(() => {
              bgText.textContent = modeMeta[mode].bg;
              bgText.style.opacity = '1';
              bgText.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 200);
          }
          if (modelBadge) {
            modelBadge.textContent = modeMeta[mode].badge;
          }
        }

        updateCalloutCardsForMode(mode);
      });
    });

    // Initial callout sync
    updateCalloutCardsForMode(studioActiveMode);

    // E. Telemetry Quick Dial (Slider & Segments)
    const rangeInput = document.getElementById('telemetryRangeInput');
    const segBtns = document.querySelectorAll('#telemetrySegments .seg-pill');
    const txtReams = document.getElementById('telemetryReamsText');
    const txtSheets = document.getElementById('telemetrySheetsText');
    const valTrees = document.getElementById('telemetryTrees');
    const valWater = document.getElementById('telemetryWater');
    const valCarbon = document.getElementById('telemetryCarbon');
    const valEnergy = document.getElementById('telemetryEnergy');

    function updateTelemetry(reams) {
      reams = Math.max(1, Math.min(500, parseInt(reams, 10) || 25));
      if (rangeInput) rangeInput.value = reams;
      segBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.reams, 10) === reams);
      });

      const trees = (reams * 0.06).toFixed(reams < 10 ? 2 : 1);
      const waterLit = reams * 5000;
      const waterDisplay = waterLit >= 1000000 ? (waterLit / 1000000).toFixed(1) + 'M' : Math.round(waterLit / 1000) + 'k';
      const carbon = Math.round(reams * 4.8);
      const energy = Math.round(reams * 12.5);

      if (txtReams) txtReams.textContent = `${reams} Ream${reams > 1 ? 's' : ''}`;
      if (txtSheets) txtSheets.textContent = `(${(reams * 500).toLocaleString()} Sheets)`;
      if (valTrees) valTrees.textContent = trees;
      if (valWater) valWater.textContent = waterDisplay;
      if (valCarbon) valCarbon.textContent = carbon;
      if (valEnergy) valEnergy.textContent = energy;
    }

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => updateTelemetry(e.target.value));
    }
    segBtns.forEach(btn => {
      btn.addEventListener('click', () => updateTelemetry(btn.dataset.reams));
    });

    // F. Technical Callout Cards & Detail Drawer
    const calloutCards = document.querySelectorAll('.tech-callout-card');
    const drawer = document.getElementById('calloutDrawer');
    const drawerClose = document.getElementById('drawerCloseBtn');
    const drawerTitle = document.getElementById('drawerTitle');
    const drawerBadge = document.getElementById('drawerBadge');
    const drawerBody = document.getElementById('drawerBody');
    const drawerHighlight = document.getElementById('drawerHighlight');
    const drawerLink = document.getElementById('drawerLink');

    const calloutData = {
      eye: {
        title: '360° Rotational Computer Vision Eye',
        badge: 'HARDWARE SPECIFICATION',
        body: 'Equipped with an omnidirectional rotating camera module that captures physical paper textbooks and documents for instant AI OCR digitization and cloud indexing.',
        highlight: '360° Mechanical Rotation • Optical Document Extraction',
        link: 'paper-vs-digital.html'
      },
      ptt: {
        title: 'Push-to-Talk AI Eco Assistant',
        badge: 'INTERACTIVE VOICE MODEL',
        body: 'Instant natural voice interface enabling team members and researchers to query organizational sustainability guidelines, calculate print footprints, and retrieve reports paperlessly.',
        highlight: 'Instant Voice Interaction • Zero-Paper Queries',
        link: 'solutions.html'
      },
      wheel: {
        title: 'Tactile Analog Scroll Wheel',
        badge: 'PRECISION ERGONOMICS',
        body: 'A knurled aerospace-grade aluminum rotary dial offering fluid scrolling through complex documents, e-books, and digital portal files without printing single sheets.',
        highlight: 'Tactile Rotary Navigation • Zero Page Turning Loss',
        link: 'solutions.html'
      },
      companion: {
        title: 'Ultra-Compact Pocket Companion',
        badge: 'HARDWARE AMORTIZATION',
        body: 'Consolidates pounds of paper notebooks, printed handouts, and binders into a single pocketable AI hardware unit with negligible lifetime environmental footprint.',
        highlight: '92% Carbon Cut • Cloud Amortization Threshold',
        link: 'calculator.html'
      },
      water: {
        title: 'Industrial Freshwater Depletion',
        badge: 'WATER CONSUMPTION',
        body: 'Pulping and chemical chlorine bleaching require 5 to 10 liters of freshwater per single A4 sheet. A 500-sheet ream embodies between 2,500 and 5,000 liters.',
        highlight: '10 Liters / Sheet • FAO Forest & Water Database 2024',
        link: 'calculator.html'
      },
      timber: {
        title: 'Commercial Timber Deforestation',
        badge: 'FOREST LOSS',
        body: 'Worldwide, roughly 40% of all commercially logged industrial wood feeds directly into pulp mills. Producing 1 metric ton of standard copy paper fells approximately 24 mature trees.',
        highlight: '24 Trees / Tonne • WWF Pulp & Paper Global Assessment',
        link: 'impact.html'
      },
      waste: {
        title: 'Municipal Solid Waste & Methane',
        badge: 'LANDFILL EMISSIONS',
        body: 'Paper products constitute ~26% of all municipal solid waste in landfills. Compressing without oxygen, paper undergoes anaerobic decomposition, releasing methane (CH₄).',
        highlight: '26% Solid Waste • US EPA Municipal Stream Report',
        link: 'lifecycle.html'
      },
      digital: {
        title: 'Digital Lifecycle Carbon Offset',
        badge: 'DIGITAL AMORTIZATION',
        body: 'Transitioning to digital platforms offsets its embodied hardware carbon after roughly 33 reams (or 25-30 textbooks), yielding up to 92% lifetime emissions savings.',
        highlight: '92% Net Carbon Cut • IEEE Green Computing Evaluation',
        link: 'paper-vs-digital.html'
      }
    };

    calloutCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = card.dataset.metric;
        if (!calloutData[m] || !drawer) return;
        const d = calloutData[m];
        if (drawerTitle) drawerTitle.textContent = d.title;
        if (drawerBadge) drawerBadge.textContent = d.badge;
        if (drawerBody) drawerBody.textContent = d.body;
        if (drawerHighlight) drawerHighlight.innerHTML = `<strong>${d.highlight}</strong>`;
        if (drawerLink) drawerLink.setAttribute('href', d.link);
        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
      });
    });

    if (drawerClose && drawer) {
      drawerClose.addEventListener('click', () => {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
      });
    }
    document.addEventListener('click', (e) => {
      if (drawer && drawer.classList.contains('is-open') && !drawer.contains(e.target) && !e.target.closest('.tech-callout-card')) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE — Tree → Log → Paper ream, travelling round a cradle-to-grave loop
  // --------------------------------------------------------------------------
  function buildLifecycleLogObject(group) {
    const g = new THREE.Group();
    const plat = platformDisc(1.85, 0x6fb86a); plat.position.y = -0.75; g.add(plat);

    // Circular "track" the paper travels around
    const R = 1.32, baseY = -0.69;
    const track = new THREE.Mesh(new THREE.TorusGeometry(R, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0xf4fbf2 }));
    track.rotation.x = Math.PI / 2; track.position.y = baseY + 0.01; g.add(track);

    function place(i, obj, spin) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      obj.position.set(Math.cos(a) * R, baseY, -Math.sin(a) * R);
      obj.rotation.y = a + (spin || 0);
      obj.scale.setScalar(1.28);
      g.add(obj);
    }

    // 1. Pine grove (raw timber source)
    const grove = new THREE.Group();
    [[0, 0, 1.0], [0.3, 0.2, 0.7], [-0.28, 0.18, 0.6]].forEach(([x, z, h]) => { const t = makePine(h); t.position.set(x, 0, z); grove.add(t); });
    place(0, grove);

    // 2. Log pile (harvest)
    const logs = new THREE.Group();
    const lg = (x, y, z) => { const l = makeLog(0.62, 0.11); l.position.set(x, y, z); logs.add(l); };
    lg(0, 0.11, -0.12); lg(0, 0.11, 0.12); lg(0, 0.3, 0);
    place(1, logs, Math.PI / 2);

    // 3. Pulp mill (factory with smoking chimney)
    const mill = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.38, 0.52), std(0xe9efe9, { roughness: 0.7 }));
    wall.position.y = 0.19; mill.add(wall);
    for (let i = 0; i < 2; i++) {
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.52, 3, 1), std(0x4e8f5c, { roughness: 0.6 }));
      roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2; roof.rotation.y = 0;
      roof.rotation.set(Math.PI / 2, 0, 0); roof.scale.set(1, 1, 0.6);
      roof.position.set(-0.2 + i * 0.4, 0.44, 0); mill.add(roof);
    }
    const win = new THREE.MeshBasicMaterial({ color: 0x8fd0a0 });
    [-0.22, 0.04, 0.26].forEach(x => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), win); w.position.set(x, 0.2, 0.262); mill.add(w); });
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.62, 12), std(0xb5654a, { roughness: 0.7 }));
    chim.position.set(0.28, 0.5, -0.1); mill.add(chim);
    const smoke = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), flat(0xdfe6e2, { transparent: true, opacity: 0.8 }));
      s.userData.phase = i / 4; mill.add(s); smoke.push(s);
    }
    place(2, mill, Math.PI);

    // 4. Paper roll (product)
    const rollG = new THREE.Group();
    const coreMat = std(0xc9a26b, { roughness: 0.8 });
    const paperMat = std(0xfdfcf7, { roughness: 0.85 });
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.62, 28), [paperMat, coreMat, coreMat]);
    roll.rotation.z = Math.PI / 2; roll.position.y = 0.3; rollG.add(roll);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.64, 16), coreMat);
    hole.rotation.z = Math.PI / 2; hole.position.y = 0.3; rollG.add(hole);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.34), paperMat);
    tail.position.set(0, 0.015, 0.4); rollG.add(tail);
    place(3, rollG, Math.PI / 2);

    // 5. Recycling bin (end of life → starts again)
    const binG = new THREE.Group();
    const binBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.52, 4, 1), std(0x2f9a48, { roughness: 0.5 }));
    binBody.rotation.y = Math.PI / 4; binBody.position.y = 0.26; binG.add(binBody);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.07, 4, 1), std(0x1f7a3a, { roughness: 0.5 }));
    lid.rotation.y = Math.PI / 4; lid.position.y = 0.55; binG.add(lid);
    const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({
      map: makeTex(128, 128, (ctx) => { ctx.clearRect(0, 0, 128, 128); drawLeaf(ctx, 64, 64, 40, '#e8f8e6'); }), transparent: true
    }));
    emblem.position.set(0, 0.28, 0.3); binG.add(emblem);
    const sheetIn = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.34), paperMat);
    sheetIn.position.set(0.02, 0.62, 0); sheetIn.rotation.set(0.5, 0.3, 0.2); binG.add(sheetIn);
    place(4, binG, 0);

    // Flow chevrons between stations (clockwise)
    const chev = std(0x43a047, { emissive: 0x2e7d32, emissiveIntensity: 0.3 });
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) / 5) * Math.PI * 2 + Math.PI / 2;
      const h = new THREE.Group();
      h.position.set(Math.cos(a) * R, baseY + 0.1, -Math.sin(a) * R);
      h.lookAt(h.position.x - Math.sin(a), h.position.y, h.position.z - Math.cos(a));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 4), chev);
      cone.rotation.x = Math.PI / 2; h.add(cone); g.add(h);
    }

    // Centre: new sapling on a little mound (the cycle begins again)
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.14, 14), flat(0x5d4128));
    mound.position.y = baseY + 0.07; g.add(mound);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 14), flat(0x66b05a)); cap.position.y = baseY + 0.15; g.add(cap);
    const sprout = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.34, 6), flat(0x5d8f3a)); stem.position.y = 0.17; sprout.add(stem);
    const l1 = leafMesh(0.3, 0x7ad06a); l1.position.set(0.1, 0.36, 0); l1.rotation.z = -1.0; sprout.add(l1);
    const l2 = leafMesh(0.26, 0x66bb6a); l2.position.set(-0.09, 0.3, 0); l2.rotation.z = 1.0; sprout.add(l2);
    sprout.position.y = baseY + 0.16; g.add(sprout);

    g.rotation.x = 0.12;
    g.scale.setScalar(0.9);
    group.add(g);
    group.userData.tick = (t) => {
      smoke.forEach(s => {
        const p = (t * 0.35 + s.userData.phase) % 1;
        s.position.set(0.28 + p * 0.12, 0.85 + p * 0.55, -0.1);
        s.scale.setScalar(0.6 + p * 0.9);
        s.material.opacity = 0.8 * (1 - p);
      });
      sprout.rotation.y = Math.sin(t * 1.2) * 0.4;
    };
  }

  // --------------------------------------------------------------------------
  // IMPACT — Water droplet, felled stump and CO2 cloud
  // --------------------------------------------------------------------------
  function buildImpactWaterDropObject(group) {
    const g = new THREE.Group();
    const plat = platformDisc(1.75, 0x6fb86a); plat.position.y = -0.95; g.add(plat);

    // Teardrop via a lathe profile
    const R = 0.62, pts = [];
    for (let i = 0; i <= 18; i++) { const th = (i / 18) * Math.PI * 0.62; pts.push(new THREE.Vector2(Math.sin(th) * R, -Math.cos(th) * R)); }
    const last = pts[pts.length - 1];
    const curve = new THREE.QuadraticBezierCurve(last.clone(), new THREE.Vector2(R * 0.62, 0.42), new THREE.Vector2(0.001, 1.35));
    curve.getPoints(22).slice(1).forEach(p => pts.push(p));
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0x34c3f0, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.86,
      clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x0a7fb0, emissiveIntensity: 0.28
    });
    const drop = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), dropMat);
    const dropGroup = new THREE.Group(); dropGroup.add(drop);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    hl.scale.set(0.8, 1.6, 0.4); hl.position.set(-0.28, -0.1, 0.5); hl.rotation.z = 0.35; dropGroup.add(hl);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    hl2.position.set(-0.12, 0.35, 0.5); dropGroup.add(hl2);
    dropGroup.position.set(-0.35, -0.05, 0);
    g.add(dropGroup);

    // Cut stump with rings and a young sprout
    const stump = makeStump(0.42, 0.42); stump.position.set(0.95, -0.7, 0.35); g.add(stump);
    const sprout = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), flat(0x5d8f3a)); stem.position.y = 0.17; sprout.add(stem);
    const lf1 = leafMesh(0.3, 0x66bb6a); lf1.position.set(0.1, 0.36, 0); lf1.rotation.z = -1.0; sprout.add(lf1);
    const lf2 = leafMesh(0.26, 0x81c784); lf2.position.set(-0.09, 0.3, 0); lf2.rotation.z = 1.0; sprout.add(lf2);
    sprout.position.set(0.15, -0.74, 0.85); g.add(sprout);

    // Low-poly CO2 cloud
    const cloudMat = flat(0x9fb0aa, { transparent: true, opacity: 0.95 });
    const cloud = new THREE.Group();
    [[0, 0, 0, 0.3], [0.32, -0.04, 0.05, 0.24], [-0.3, -0.06, 0, 0.22], [0.1, 0.18, -0.05, 0.22]].forEach(([x, y, z, r]) => {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat); p.position.set(x, y, z); cloud.add(p);
    });
    cloud.position.set(1.0, 0.85, -0.2); g.add(cloud);

    g.scale.setScalar(0.95); g.position.y = 0.25;
    group.add(g);
    group.userData.tick = (t) => {
      dropGroup.position.y = -0.05 + Math.sin(t * 1.8) * 0.06;
      dropGroup.rotation.y = Math.sin(t * 0.8) * 0.2;
      cloud.position.x = 1.0 + Math.sin(t * 0.7) * 0.08;
    };
  }

  // --------------------------------------------------------------------------
  // COMPARE — Balance scale: paper stack vs. laptop
  // --------------------------------------------------------------------------
  function buildCompareLaptopObject(group) {
    const g = new THREE.Group();
    const metal = std(0x7d8f86, { metalness: 0.55, roughness: 0.35 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.16, 32), std(0x2e7d32, { roughness: 0.4 }));
    base.position.y = -1.25; g.add(base);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.2, 14), metal);
    pillar.position.y = -0.15; g.add(pillar);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), std(0xf1d58a, { metalness: 0.6, roughness: 0.3 }));
    cap.position.y = 0.98; g.add(cap);

    const beam = new THREE.Group(); beam.position.y = 0.98; g.add(beam);
    const L = 1.5;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(L * 2, 0.08, 0.1), std(0x2e7d32, { roughness: 0.4 })); beam.add(bar);
    [-L, L].forEach(x => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), std(0xf1d58a, { metalness: 0.6 })); k.position.x = x; beam.add(k); });

    function makePan() {
      const pan = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.07, 32), std(0xe8efe9, { metalness: 0.3, roughness: 0.4 }));
      pan.add(dish);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 8, 40), std(0xf1d58a, { metalness: 0.6 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.035; pan.add(rim);
      const top = new THREE.Vector3(0, 0.95, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        pan.add(cylBetween(top, new THREE.Vector3(Math.cos(a) * 0.58, 0.03, Math.sin(a) * 0.58), 0.012, std(0x9aa9a1, { metalness: 0.6 })));
      }
      return pan;
    }
    const panL = makePan(), panR = makePan();
    g.add(panL, panR);

    // Paper pile (left)
    const pile = makeSheetStack(0.74, 0.98, 12, 0.045); pile.position.y = 0.05; panL.add(pile);
    const topSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.9), new THREE.MeshBasicMaterial({
      map: makeTex(256, 340, (ctx, w, h) => {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#9fb3a2';
        for (let i = 0; i < 12; i++) { ctx.fillRect(28, 34 + i * 24, i % 4 === 3 ? 120 : 200, 7); }
      })
    }));
    topSheet.rotation.x = -Math.PI / 2; topSheet.position.y = 0.05 + 11 * 0.045 + 0.025; panL.add(topSheet);

    // Laptop (right)
    const lap = new THREE.Group();
    const lb = new THREE.Mesh(extrudeRound(0.96, 0.66, 0.05, 0.05, 0.015), std(0xb8c4bd, { metalness: 0.4, roughness: 0.35 }));
    lb.rotation.x = -Math.PI / 2; lap.add(lb);
    const scr = new THREE.Group(); scr.position.set(0, 0.03, -0.31); scr.rotation.x = -0.28;
    const sb = new THREE.Mesh(extrudeRound(0.96, 0.64, 0.05, 0.04, 0.012), std(0x2b3a33, { metalness: 0.3 }));
    sb.position.y = 0.32; scr.add(sb);
    const sTex = makeTex(384, 256, (ctx, w, h) => {
      const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8f5e9'); gr.addColorStop(1, '#c8e6c9');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b5e20'; ctx.fillRect(0, 0, w, 40);
      drawLeaf(ctx, 26, 20, 11, '#a5e3a0');
      [0.4, 0.6, 0.8, 1.0].forEach((v, i) => { ctx.fillStyle = i === 3 ? '#2e7d32' : '#81c784'; ctx.fillRect(40 + i * 56, 230 - v * 150, 36, v * 150); });
      ctx.fillStyle = '#1b3d1c'; ctx.font = '800 54px Arial'; ctx.fillText('-92%', 262, 120); ctx.font = '600 16px Arial'; ctx.fillText('carbon', 266, 144);
    });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.54), new THREE.MeshBasicMaterial({ map: sTex }));
    sp.position.set(0, 0.32, 0.031); scr.add(sp);
    lap.add(scr);
    lap.position.y = 0.06; lap.scale.setScalar(0.92); panR.add(lap);
    const lf = leafMesh(0.34, 0x66bb6a); lf.position.set(0.0, 0.95, 0.0); lap.add(lf);

    g.scale.setScalar(0.8); g.position.y = 0.0;
    group.add(g);
    group.userData.tick = (t) => {
      const a = 0.17 + 0.05 * Math.sin(t * 1.3);   // paper side is heavier
      beam.rotation.z = a;
      const H = 0.95 * 1.0;
      panL.position.set(-L * Math.cos(a), 0.98 - L * Math.sin(a) - H, 0);
      panR.position.set(L * Math.cos(a), 0.98 + L * Math.sin(a) - H, 0);
      lf.rotation.y = t * 1.5; lf.position.y = 0.95 + Math.sin(t * 2) * 0.05;
    };
    group.userData.tick(0);
  }

  // --------------------------------------------------------------------------
  // CALCULATOR — Desk calculator printing a sheet, with live sheet count
  // --------------------------------------------------------------------------
  function buildCalculatorObject(group) {
    const g = new THREE.Group();
    const bodyGeo = extrudeRound(1.45, 2.05, 0.2, 0.26, 0.04);
    g.add(new THREE.Mesh(bodyGeo, std(0xeaf3e8, { roughness: 0.4, metalness: 0.15 })));
    const front = 0.13 + 0.04;

    const dTex = makeTex(512, 220, (ctx, w, h) => {
      ctx.fillStyle = '#10241a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#6df0a0'; ctx.font = '800 96px Poppins, Arial'; ctx.textAlign = 'right'; ctx.fillText('12,500', w - 28, 118);
      ctx.fillStyle = '#9ad6a8'; ctx.font = '600 28px Poppins, Arial'; ctx.fillText('SHEETS = 1.5 TREES', w - 28, 178);
      ctx.fillStyle = '#6df0a0'; ctx.textAlign = 'left'; ctx.font = '700 24px Poppins, Arial'; ctx.fillText('PAPER \u2022 EARTH', 28, 40);
    });
    const disp = new THREE.Mesh(extrudeRound(1.2, 0.5, 0.07, 0.03, 0.01), std(0x10241a, { roughness: 0.2 }));
    disp.position.set(0, 0.68, front); g.add(disp);
    const dpl = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.49), new THREE.MeshBasicMaterial({ map: dTex }));
    dpl.position.set(0, 0.68, front + 0.032); g.add(dpl);

    const keyGeo = extrudeRound(0.26, 0.22, 0.06, 0.06, 0.02);
    const labels = [['7','8','9','+'],['4','5','6','-'],['1','2','3','\u00d7'],['C','0','.','=']];
    labels.forEach((row, r) => row.forEach((lab, c) => {
      const isOp = '+-\u00d7='.indexOf(lab) >= 0, isC = lab === 'C';
      const mat = std(isOp ? 0x2e7d32 : (isC ? 0xe57373 : 0xffffff), { roughness: 0.45 });
      const k = new THREE.Mesh(keyGeo, mat);
      k.position.set(-0.49 + c * 0.33, 0.1 - r * 0.3, front + 0.03);
      g.add(k);
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({
        map: makeTex(64, 64, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = isOp || isC ? '#ffffff' : '#1b3d1c'; ctx.font = '700 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, 32, 34); }),
        transparent: true
      }));
      t.position.set(k.position.x, k.position.y, front + 0.095);
      g.add(t);
    }));

    // Printed sheet coming out of the top
    const sheetTex = makeTex(256, 340, (ctx, w, h) => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c9d8c9';
      for (let i = 0; i < 9; i++) ctx.fillRect(26, 30 + i * 28, i % 3 === 2 ? 110 : 200, 8);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(26, 290, 90, 12);
    });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.2, 0.015), [std(0xffffff), std(0xffffff), std(0xffffff), std(0xffffff), new THREE.MeshBasicMaterial({ map: sheetTex }), new THREE.MeshBasicMaterial({ map: sheetTex })]);
    sheet.position.set(0.1, 1.45, -0.04); sheet.rotation.set(-0.08, 0.1, -0.1); g.add(sheet);

    const lf = leafMesh(0.4, 0x66bb6a); lf.position.set(-1.0, 0.9, 0.35); g.add(lf);

    g.rotation.x = -0.1; g.scale.setScalar(0.94); g.position.y = -0.1;
    group.add(g);
    group.userData.tick = (t) => { lf.position.y = 0.9 + Math.sin(t * 1.8) * 0.08; lf.rotation.y = t; };
  }

  // --------------------------------------------------------------------------
  // ABOUT — Idea light-bulb with a living leaf as the filament
  // --------------------------------------------------------------------------
  function buildAboutBulbObject(group) {
    const g = new THREE.Group();
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffefb0, transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xffd95a, emissiveIntensity: 0.28
    });
    const pts = [];
    for (let i = 0; i <= 24; i++) { const th = (i / 24) * Math.PI * 0.78; pts.push(new THREE.Vector2(Math.sin(th) * 0.92, 0.35 + Math.cos(th) * 0.92)); }
    pts.push(new THREE.Vector2(0.5, -0.22), new THREE.Vector2(0.42, -0.62));
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), glassMat);
    g.add(bulb);
    const outline = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshBasicMaterial({ color: 0xd9b84a, transparent: true, opacity: 0.6, side: THREE.BackSide }));
    outline.scale.set(1.035, 1.0, 1.035); g.add(outline);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.13, side: THREE.BackSide }));
    glow.position.y = 0.35; g.add(glow);

    // Screw base
    const metal = std(0xaab4ae, { metalness: 0.65, roughness: 0.35 });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42 - i * 0.02, 0.42 - i * 0.02, 0.16, 24), metal);
      ring.position.y = -0.7 - i * 0.18; g.add(ring);
      const groove = new THREE.Mesh(new THREE.TorusGeometry(0.42 - i * 0.02, 0.018, 6, 24), std(0x7e8a84, { metalness: 0.6 }));
      groove.rotation.x = Math.PI / 2; groove.position.y = -0.62 - i * 0.18; g.add(groove);
    }
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.12, 16), std(0x3d4a43, { metalness: 0.4 }));
    tip.position.y = -1.3; g.add(tip);

    // Leaf filament + supports
    const lf = leafMesh(0.85, 0x66d36e, 0x2e9e4a); lf.position.y = 0.35; lf.rotation.z = -0.25; lf.material.emissiveIntensity = 0.6; g.add(lf);
    const supp = std(0x8a9690, { metalness: 0.6 });
    g.add(cylBetween(new THREE.Vector3(-0.08, -0.5, 0), new THREE.Vector3(-0.05, 0.0, 0), 0.015, supp));
    g.add(cylBetween(new THREE.Vector3(0.08, -0.5, 0), new THREE.Vector3(0.05, 0.0, 0), 0.015, supp));

    // Radiating light rays
    const rays = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xf6c945 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.04), rayMat);
      r.position.set(Math.cos(a) * 1.55, 0.35 + Math.sin(a) * 1.55, 0);
      r.rotation.z = a - Math.PI / 2; rays.add(r);
    }
    g.add(rays);

    g.scale.setScalar(0.85); g.position.y = 0.3;
    group.add(g);
    group.userData.tick = (t) => {
      rays.children.forEach((r, i) => { const s = 0.8 + 0.35 * Math.sin(t * 2.4 + i); r.scale.y = s; });
      lf.rotation.y = Math.sin(t * 1.2) * 0.4;
    };
  }

  // --------------------------------------------------------------------------
  // CONTACT — Envelope opening to reveal a letter, sealed with a leaf
  // --------------------------------------------------------------------------
  function buildContactEnvelopeObject(group) {
    const g = new THREE.Group();
    const W = 1.9, H = 1.25;
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.04), std(0x8a6a35, { roughness: 0.8 }));
    back.position.z = -0.05; g.add(back);

    const letterTex = makeTex(256, 320, (ctx, w, h) => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b5e20'; ctx.font = '700 22px Arial'; ctx.fillText('Dear Earth,', 24, 46);
      ctx.fillStyle = '#c9d8c9'; for (let i = 0; i < 8; i++) ctx.fillRect(24, 70 + i * 26, i % 3 === 2 ? 120 : 208, 7);
      drawLeaf(ctx, 205, 276, 18, '#43a047');
    });
    const letter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.012), [std(0xffffff), std(0xffffff), std(0xffffff), std(0xffffff), new THREE.MeshBasicMaterial({ map: makeTex(320, 200, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b5e20'; c.font = '700 26px Arial'; c.fillText('Dear Earth,', 24, 48); c.fillStyle = '#c9d8c9'; for (let i = 0; i < 5; i++) c.fillRect(24, 74 + i * 24, i % 3 === 2 ? 140 : 250, 7); drawLeaf(c, 270, 166, 16, '#43a047'); }) }), std(0xffffff)]);
    letter.position.z = -0.02; g.add(letter);

    const fs = new THREE.Shape();
    fs.moveTo(-W / 2, -H / 2); fs.lineTo(W / 2, -H / 2); fs.lineTo(W / 2, H / 2); fs.lineTo(0, 0.0); fs.lineTo(-W / 2, H / 2); fs.closePath();
    const frontPanel = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.04, bevelEnabled: false }), std(0xb08c52, { roughness: 0.8 }));
    frontPanel.position.z = 0.0; g.add(frontPanel);

    const flapPivot = new THREE.Group(); flapPivot.position.set(0, H / 2, 0.01); g.add(flapPivot);
    const ft = new THREE.Shape();
    ft.moveTo(-W / 2, 0); ft.lineTo(W / 2, 0); ft.lineTo(0, -H / 2); ft.closePath();
    const flap = new THREE.Mesh(new THREE.ExtrudeGeometry(ft, { depth: 0.03, bevelEnabled: false }), std(0xa07d45, { roughness: 0.8 }));
    flapPivot.add(flap);
    const seal = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), new THREE.MeshBasicMaterial({
      map: makeTex(128, 128, (ctx, w, h) => { ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill(); drawLeaf(ctx, 64, 64, 34, '#c8f0c4'); })
    }));
    seal.position.set(0, -H / 2 + 0.2, 0.04); flapPivot.add(seal);

    g.rotation.x = -0.12; g.scale.setScalar(1.05); g.position.y = 0.25;
    group.add(g);
    group.userData.tick = (t) => {
      const th = 1.2 - 1.15 * Math.cos(t * 0.9);       // 0.05 (closed) … 2.35 (open)
      flapPivot.rotation.x = th;
      const open = Math.max(0, Math.min(1, (th - 0.4) / 1.9));
      letter.position.y = -0.2 + open * 0.55;
      seal.visible = th < 1.5;
    };
    group.userData.tick(0);
  }

  // --------------------------------------------------------------------------
  // RESOURCES — Stack of reference books + magnifying glass
  // --------------------------------------------------------------------------
  function buildResourcesBooksObject(group) {
    const g = new THREE.Group();
    const specs = [
      [1.7, 0.3, 1.15, 0x1b6e34, 0.0], [1.5, 0.26, 1.05, 0x2f8f9d, 0.12],
      [1.6, 0.32, 1.1, 0xc4673a, -0.1], [1.3, 0.24, 0.95, 0x5b7fa6, 0.18]
    ];
    let y = -0.95;
    specs.forEach(([w, h, d, c, rot]) => {
      const b = makeBook(w, h, d, c); b.position.set(Math.sin(y * 3) * 0.05, y + h / 2, 0); b.rotation.y = rot; g.add(b); y += h;
    });
    const lf = leafMesh(0.45, 0x66bb6a); lf.position.set(0.35, y + 0.22, 0.2); lf.rotation.z = -0.5; g.add(lf);

    const mag = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 14, 40), std(0xe0b64a, { metalness: 0.7, roughness: 0.3 }));
    mag.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 36), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.32, roughness: 0.05, clearcoat: 1 }));
    mag.add(lens);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 12), std(0x3d2f24, { roughness: 0.6 }));
    handle.position.set(0.52, -0.52, 0); handle.rotation.z = Math.PI / 4; mag.add(handle);
    mag.position.set(1.05, 0.35, 0.65); mag.rotation.y = -0.4;
    g.add(mag);

    g.scale.setScalar(0.88); g.position.y = 0.05;
    group.add(g);
    group.userData.tick = (t) => { mag.position.y = 0.35 + Math.sin(t * 1.6) * 0.07; mag.rotation.z = Math.sin(t * 1.1) * 0.12; lf.rotation.y = t * 0.8; };
  }

  // --------------------------------------------------------------------------
  // PRIVACY — Green shield with a padlock
  // --------------------------------------------------------------------------
  function buildPrivacyShieldObject(group) {
    const g = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.25); sh.lineTo(0.95, 0.92); sh.lineTo(0.95, 0.1);
    sh.bezierCurveTo(0.95, -0.6, 0.45, -1.05, 0, -1.3);
    sh.bezierCurveTo(-0.45, -1.05, -0.95, -0.6, -0.95, 0.1);
    sh.lineTo(-0.95, 0.92); sh.closePath();
    const outerMat = std(0x1f7a3a, { roughness: 0.35, metalness: 0.25, emissive: 0x0d3d1d, emissiveIntensity: 0.2 });
    const outer = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 20 }), outerMat);
    outer.position.z = -0.09; g.add(outer);
    const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 20 }), std(0x5cc26a, { roughness: 0.35, emissive: 0x2e9e4a, emissiveIntensity: 0.15 }));
    inner.scale.set(0.8, 0.8, 1); inner.position.set(0, 0.0, 0.2); g.add(inner);

    // Padlock
    const lockBody = new THREE.Mesh(extrudeRound(0.55, 0.46, 0.08, 0.14, 0.03), std(0xfdfcf7, { roughness: 0.3, metalness: 0.15 }));
    lockBody.position.set(0, -0.12, 0.33); g.add(lockBody);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 12, 24, Math.PI), std(0xd9e0dc, { metalness: 0.8, roughness: 0.25 }));
    shackle.position.set(0, 0.1, 0.33); g.add(shackle);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshBasicMaterial({ color: 0x1b3d1c }));
    hole.position.set(0, -0.1, 0.43); g.add(hole);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.12), new THREE.MeshBasicMaterial({ color: 0x1b3d1c }));
    slot.position.set(0, -0.2, 0.43); g.add(slot);
    const lf = leafMesh(0.3, 0xa8e6a1); lf.position.set(0.55, 0.75, 0.3); lf.rotation.z = -0.6; g.add(lf);

    g.scale.setScalar(0.88);
    group.add(g);
    group.userData.tick = (t) => { outerMat.emissiveIntensity = 0.2 + 0.12 * Math.sin(t * 2); lf.rotation.y = t; };
  }

  // --------------------------------------------------------------------------
  // ACTION PLAN — Clipboard with a progress checklist
  // --------------------------------------------------------------------------
  function buildActionPlanObject(group) {
    const g = new THREE.Group();
    const board = new THREE.Mesh(extrudeRound(1.6, 2.2, 0.12, 0.1, 0.03), std(0xb98a56, { roughness: 0.7 }));
    g.add(board);
    const listTex = makeTex(384, 520, (ctx, w, h) => {
      ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b5e20'; ctx.font = '800 34px Poppins, Arial'; ctx.fillText('ACTION PLAN', 36, 70);
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(36, 86, 120, 5);
      const rows = ['Go duplex', 'Digitise files', 'Recycle bin', 'Track usage', 'Share goals'];
      rows.forEach((r, i) => {
        const y = 140 + i * 74;
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4; canvasRoundRect(ctx, 36, y - 24, 40, 40, 8); ctx.stroke();
        if (i < 3) { ctx.fillStyle = '#2e7d32'; canvasRoundRect(ctx, 36, y - 24, 40, 40, 8); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(46, y - 4); ctx.lineTo(54, y + 4); ctx.lineTo(68, y - 14); ctx.stroke(); }
        ctx.fillStyle = i < 3 ? '#4a6b4b' : '#1b3d1c'; ctx.font = '600 28px Poppins, Arial'; ctx.fillText(r, 96, y + 8);
        ctx.fillStyle = '#e1ece1'; ctx.fillRect(96, y + 22, 200 - i * 14, 4);
      });
    });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.34 * 520 / 384 * 0.9), new THREE.MeshBasicMaterial({ map: listTex }));
    paper.scale.y = 1.0; paper.position.set(0, -0.08, 0.09); g.add(paper);
    const clipBase = new THREE.Mesh(extrudeRound(0.62, 0.24, 0.05, 0.08, 0.02), std(0xaab4ae, { metalness: 0.7, roughness: 0.3 }));
    clipBase.position.set(0, 1.08, 0.12); g.add(clipBase);
    const clipHole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: 0x59655e }));
    clipHole.position.set(0, 1.08, 0.17); g.add(clipHole);

    const badge = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({
      map: makeTex(128, 128, (ctx, w, h) => { ctx.fillStyle = '#2e9e4a'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(36, 66); ctx.lineTo(56, 86); ctx.lineTo(92, 44); ctx.stroke(); })
    }));
    badge.add(disc); badge.position.set(0.95, 0.65, 0.5); g.add(badge);

    const pencil = new THREE.Group();
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 6), std(0xf2c230, { roughness: 0.5 }));
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), std(0xe9c9a0)); pt.position.y = -0.62; pt.rotation.x = Math.PI;
    const pl = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), std(0x2b2b2b)); pl.position.y = -0.7; pl.rotation.x = Math.PI;
    pencil.add(pb, pt, pl); pencil.position.set(-1.0, -0.35, 0.3); pencil.rotation.z = 0.28; g.add(pencil);

    g.rotation.x = -0.05; g.scale.setScalar(0.8); g.position.y = 0.0;
    group.add(g);
    group.userData.tick = (t) => { badge.position.y = 0.65 + Math.sin(t * 2) * 0.08; badge.rotation.y = Math.sin(t) * 0.4; };
  }

  // --------------------------------------------------------------------------
  // MODEL 5: SOLUTIONS — Recycling Arrows Symbol Made of Organic Leaves
  // --------------------------------------------------------------------------
  function buildSolutionsRecycleObject(group) {
    const emblem = new THREE.Group();

    // One chasing-arrow: a curved band that ends in an arrowhead (flat shape, extruded)
    function makeArrowShape(a0, a1, rIn, rOut, headLen, headFlare) {
      const rMid = (rIn + rOut) / 2;
      const shape = new THREE.Shape();
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (a1 - a0) * (i / steps);
        const x = Math.cos(a) * rOut, y = Math.sin(a) * rOut;
        i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
      }
      shape.lineTo(Math.cos(a1) * (rOut + headFlare), Math.sin(a1) * (rOut + headFlare));
      shape.lineTo(Math.cos(a1 + headLen) * rMid, Math.sin(a1 + headLen) * rMid);
      shape.lineTo(Math.cos(a1) * (rIn - headFlare), Math.sin(a1) * (rIn - headFlare));
      for (let i = steps; i >= 0; i--) {
        const a = a0 + (a1 - a0) * (i / steps);
        shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
      }
      shape.closePath();
      return shape;
    }

    const extrude = { depth: 0.24, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 24 };
    const armColors = [0x1b6e34, 0x2f9a48, 0x5cb85c];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.ExtrudeGeometry(makeArrowShape(0.08, 1.32, 0.86, 1.2, 0.5, 0.2), extrude);
      geo.center();
      const mat = new THREE.MeshStandardMaterial({
        color: armColors[i], roughness: 0.38, metalness: 0.08, emissive: armColors[i], emissiveIntensity: 0.06
      });
      const arm = new THREE.Mesh(geo, mat);
      // geo.center() moved the arrow to the origin; push it back out to the ring position
      const holder = new THREE.Group();
      const ref = makeArrowShape(0.08, 1.32, 0.86, 1.2, 0.5, 0.2);
      const box = new THREE.Box2().setFromPoints(ref.getPoints(40));
      const c = box.getCenter(new THREE.Vector2());
      arm.position.set(c.x, c.y, 0);
      holder.add(arm);
      holder.rotation.z = i * (Math.PI * 2 / 3);
      emblem.add(holder);
    }

    // Glowing leaf in the centre of the loop
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.5);
    leafShape.bezierCurveTo(0.5, -0.25, 0.5, 0.3, 0, 0.55);
    leafShape.bezierCurveTo(-0.5, 0.3, -0.5, -0.25, 0, -0.5);
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 20 });
    leafGeo.center();
    const leaf = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({
      color: 0x2e9e4a, roughness: 0.45, metalness: 0.0, emissive: 0x1b5e20, emissiveIntensity: 0.2
    }));
    leaf.rotation.z = -0.35;
    leaf.scale.setScalar(0.85);
    emblem.add(leaf);

    // Faint disc behind the emblem for depth
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 48),
      new THREE.MeshBasicMaterial({ color: 0xd9f2dc, transparent: true, opacity: 0.35 })
    );
    disc.position.z = -0.25;
    emblem.add(disc);

    // Tiny floating paper sheets that get "recycled"
    const sheetMat = new THREE.MeshLambertMaterial({ color: 0xfdfcf7, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.012), sheetMat);
      sheet.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, (i % 2 ? 0.2 : -0.15));
      sheet.rotation.set(0.4 * i, 0.6, a);
      emblem.add(sheet);
    }

    emblem.rotation.x = -0.12;
    group.add(emblem);
  }

  // --------------------------------------------------------------------------
  // MODEL 6: DEFAULT / OTHER PAGES — "Paper Earth" low-poly globe,
  // wrapped by a ring of paper sheets and leaves, with drifting clouds
  // --------------------------------------------------------------------------
  function buildDefaultEcoOrbObject(group) {
    const earth = new THREE.Group();

    // Deterministic land/ocean noise (same position => same value, so no cracks)
    function landNoise(x, y, z) {
      return Math.sin(x * 2.3 + 1.3) * Math.cos(y * 2.6 + 0.4) +
             Math.sin(z * 2.9 + 0.5) * Math.cos(x * 1.8 + y * 1.2) * 0.8 +
             Math.sin((x + z) * 4.1) * 0.25;
    }

    // Low-poly globe: ocean + raised green continents + polar caps
    const globeGeo = new THREE.IcosahedronGeometry(1.15, 4);
    const pos = globeGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    const oceanA = new THREE.Color(0x1d6fa3), oceanB = new THREE.Color(0x2b8fbf);
    const landA = new THREE.Color(0x1f6b2a), landB = new THREE.Color(0x4f9e45), sand = new THREE.Color(0xc9d98a);

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const n = landNoise(v.x, v.y, v.z);
      if (Math.abs(v.y) > 0.9) {
        c.set(0xf4fbf6);
        v.multiplyScalar(1.15 + 0.015);
      } else if (n > 0.18) {
        const t = Math.min(1, (n - 0.18) / 1.0);
        c.copy(landA).lerp(landB, t);
        if (n < 0.3) c.lerp(sand, 0.55);
        v.multiplyScalar(1.15 + 0.03 + t * 0.05);
      } else {
        c.copy(oceanA).lerp(oceanB, (n + 1.5) / 1.7 * 0.6);
        v.multiplyScalar(1.15);
      }
      pos.setXYZ(i, v.x, v.y, v.z);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    globeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    globeGeo.computeVertexNormals();
    const globe = new THREE.Mesh(
      globeGeo,
      new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 10, specular: 0x1a2a22 })
    );
    earth.add(globe);

    // Soft atmosphere glow
    earth.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xbfeedd, transparent: true, opacity: 0.16, side: THREE.BackSide })
    ));

    // Drifting low-poly clouds
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    [[0.5, 0.75, 0.95], [-0.95, 0.2, 0.8], [0.2, -0.7, -1.05]].forEach(([x, y, z]) => {
      const cloud = new THREE.Group();
      [[0, 0, 0, 0.14], [0.14, -0.02, 0.02, 0.1], [-0.13, -0.02, 0, 0.09]].forEach(([dx, dy, dz, r]) => {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat);
        puff.position.set(dx, dy, dz);
        cloud.add(puff);
      });
      const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(1.38);
      cloud.position.copy(dir);
      cloud.lookAt(0, 0, 0);
      earth.add(cloud);
    });

    // Tilted orbit ring of paper sheets + leaves
    const ring = new THREE.Group();
    const paperMat = new THREE.MeshLambertMaterial({ color: 0xfdfcf7, side: THREE.DoubleSide });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xb9c7b5 });
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x66bb6a, flatShading: true, side: THREE.DoubleSide });
    const COUNT = 12, R = 1.8;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(a) * R, Math.sin(a * 2) * 0.06, Math.sin(a) * R);
      holder.rotation.y = -a;
      if (i % 3 === 2) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 5), leafMat);
        leaf.rotation.z = Math.PI / 2;
        leaf.scale.set(1, 1, 0.35);
        holder.add(leaf);
      } else {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.014), paperMat);
        sheet.rotation.set(0.25, 0, (i % 2 ? 0.18 : -0.18));
        holder.add(sheet);
        for (let l = 0; l < 3; l++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.004), lineMat);
          line.position.set(0, 0.1 - l * 0.09, 0.012);
          sheet.add(line);
        }
      }
      ring.add(holder);
    }
    ring.rotation.set(0.32, 0, -0.38);
    earth.add(ring);

    // Thin guide halo for the ring
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(R, 0.008, 6, 96),
      new THREE.MeshBasicMaterial({ color: 0x9ed8b0, transparent: true, opacity: 0.55 })
    );
    halo.rotation.set(Math.PI / 2, 0, 0);
    ring.add(halo);

    earth.rotation.z = 0.18;
    earth.scale.setScalar(0.8);
    group.add(earth);
  }

  // ==========================================================================
  // PART C: UNIFIED ANIMATION RENDER LOOP & VISIBILITY CONTROL
  // ==========================================================================
  let isRunning = true;
  const clock = new THREE.Clock();

  function animate() {
    if (!isRunning) return;

    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // 1. RENDER BACKGROUND CANVAS PARTICLES (Floating leaves, sheets, planes)
    if (bgRenderer && bgScene && bgCamera) {
      if (!prefersReducedMotion) {
        bgParticles.forEach(p => {
          p.swing += p.swingSpeed;
          p.mesh.position.y -= p.speedY;
          p.mesh.position.x += Math.sin(p.swing) * p.swingAmp;
          p.mesh.rotation.x += p.speedRotX;
          p.mesh.rotation.y += p.speedRotY;
          p.mesh.rotation.z += p.speedRotZ;

          // Wrap particles from bottom to top seamlessly
          if (p.mesh.position.y < -14) {
            p.mesh.position.y = 14;
            p.mesh.position.x = (Math.random() - 0.5) * 30;
          }
        });
      }
      bgRenderer.render(bgScene, bgCamera);
    }

    // 2. RENDER HEADER 3D SHOWCASE OBJECT
    if (isHeaderActive && headerRenderer && headerScene && headerCamera && headerMainObjectGroup) {
      if (!prefersReducedMotion) {
        if (sceneType === 'home' && updateHomeStudioScene) {
          updateHomeStudioScene(elapsed, delta);
        } else {
          // Slow idle 3D rotation
          headerMainObjectGroup.rotation.y += 0.007;

          // Gentle floating bob
          headerMainObjectGroup.position.y = 0.55 + Math.sin(elapsed * 1.6) * 0.07;

          // Smooth mouse tilt lerp
          headerMainObjectGroup.rotation.x += (headerTargetRotX - headerMainObjectGroup.rotation.x) * 0.05;
          headerMainObjectGroup.rotation.z += (-headerTargetRotY * 0.35 - headerMainObjectGroup.rotation.z) * 0.05;
          if (headerMainObjectGroup.userData && headerMainObjectGroup.userData.tick) headerMainObjectGroup.userData.tick(elapsed);
        }
      }
      headerRenderer.render(headerScene, headerCamera);
    }
  }

  // Tab visibility detection to pause loop and save laptop battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isRunning = false;
    } else {
      isRunning = true;
      clock.start();
      requestAnimationFrame(animate);
    }
  });

  // ==========================================================================
  // INITIALIZATION ON DOM READY
  // ==========================================================================
  function init() {
    initBackground3D();
    initHeaderShowcase();
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
