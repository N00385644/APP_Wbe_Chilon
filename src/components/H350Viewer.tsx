import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = '/models/hyundai-h350-solati.glb';
const HDRI_URL = '/hdri/studio_country_hall_1k.hdr'; // Poly Haven CC0 1K, 1.6MB
const ASPHALT_DIFFUSE = '/textures/asphalt_floor_diff_1k.jpg'; // Poly Haven CC0 1K
const ASPHALT_ROUGH = '/textures/asphalt_floor_rough_1k.jpg';
const ASPHALT_NORMAL = '/textures/asphalt_floor_nor_gl_1k.jpg';
const PHOTO_FALLBACK = '/tours/wa-bus-01.jpg';

type ViewPreset = { label: string; theta: number; phi: number; radius?: number };
const VIEWS: ViewPreset[] = [
  { label: '3/4', theta: 0.75, phi: 1.25 },
  { label: 'Lateral', theta: Math.PI / 2, phi: 1.32 },
  { label: 'Frontal', theta: 0.12, phi: 1.25 },
  { label: 'Trasera', theta: Math.PI - 0.25, phi: 1.28 },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutBack(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Mejora PBR conservando UVs y mapas originales del GLB. */
function enhanceMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!('envMapIntensity' in mat)) continue;
      mat.envMapIntensity = 1.15;
      // Pintura clara: baja rugosidad aparente y más reflejo de entorno.
      const c = (mat.color as THREE.Color) ?? null;
      if (c && c.r > 0.75 && c.g > 0.75 && c.b > 0.75 && mat.roughness > 0.35) {
        mat.roughness = 0.32;
        mat.metalness = Math.min(0.25, mat.metalness + 0.08);
      }
      // Cristales oscuros: darles brillo de vidrio sin romper transparencia.
      if (c && c.r < 0.12 && c.g < 0.14 && c.b < 0.18) {
        mat.roughness = Math.min(mat.roughness, 0.15);
        mat.metalness = Math.max(mat.metalness, 0.35);
      }
      // Neumáticos: mate total.
      if (c && c.r < 0.09 && c.g < 0.09 && c.b < 0.09 && mat.roughness < 0.9) {
        if ((mat.name ?? '').toLowerCase().includes('tire') || mat.roughness > 0.5) {
          mat.roughness = 0.95;
          mat.envMapIntensity = 0.25;
        }
      }
      mat.needsUpdate = true;
    }
  });
}

export function H350Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ go: (v: ViewPreset) => void; setSpin: (b: boolean) => void; zoom: (d: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [spin, setSpin] = useState(true);
  const [view, setView] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Modelo 3D interactivo de la Hyundai H350 Solati 2019 de Turismo Chilón. Usa flechas para girar.');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 26);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // HDRI de estudio 1K (CC0): reemplaza al RoomEnvironment cuando carga,
    // con fallback automático si falla la red. Solo entorno de reflejos,
    // el fondo sigue siendo el gradiente cinematográfico CSS.
    new HDRLoader().load(
      HDRI_URL,
      (hdr) => {
        if (disposed) return;
        try {
          const envTex = pmrem.fromEquirectangular(hdr).texture;
          scene.environment = envTex;
          hdr.dispose();
        } catch { /* conserva RoomEnvironment */ }
      },
      undefined,
      () => { /* conserva RoomEnvironment */ },
    );

    // Rig 3-point (patrón brushstroke generate_scroll_animation): no se descarga
    // el HDRI "Car Showroom Studio" (~GBs); RoomEnvironment + luces lo aproxima.
    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3644, 0.5));
    const key = new THREE.DirectionalLight(0xfff2dd, 2.2);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    key.shadow.camera.left = -7; key.shadow.camera.right = 7;
    key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 50;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-5, 3, 5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 1.0);
    rim.position.set(-6, 4, -6);
    scene.add(rim);

    // Suelo PBR 1K (Poly Haven CC0 asphalt_floor): difuso + rugosidad + normal.
    // Si alguna textura falla, el color base gris conserva la escena.
    const texLoader = new THREE.TextureLoader();
    const asphaltMap = texLoader.load(ASPHALT_DIFFUSE, undefined, undefined, () => {});
    asphaltMap.colorSpace = THREE.SRGBColorSpace;
    asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
    asphaltMap.repeat.set(6, 6);
    asphaltMap.anisotropy = 4;
    const asphaltRough = texLoader.load(ASPHALT_ROUGH, undefined, undefined, () => {});
    asphaltRough.wrapS = asphaltRough.wrapT = THREE.RepeatWrapping;
    asphaltRough.repeat.set(6, 6);
    const asphaltNormal = texLoader.load(ASPHALT_NORMAL, undefined, undefined, () => {});
    asphaltNormal.wrapS = asphaltNormal.wrapT = THREE.RepeatWrapping;
    asphaltNormal.repeat.set(6, 6);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2e3136,
        map: asphaltMap,
        roughnessMap: asphaltRough,
        roughness: 1.0,
        normalMap: asphaltNormal,
        normalScale: new THREE.Vector2(0.7, 0.7),
        metalness: 0.0,
        envMapIntensity: 0.5,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.7, 3.82, 72),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Partículas de polvo andino: 350 puntos, desactivadas en móvil/reduced-motion.
    let particles: THREE.Points | null = null;
    if (!reduced && !isMobile) {
      const N = 350;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = Math.random() * 5 + 0.3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xfcd34d, size: 0.035, transparent: true, opacity: 0.45, depthWrite: false }));
      scene.add(particles);
    }

    // Estado orbital con muelle amortiguado + dolly de entrada.
    const target = new THREE.Vector3(0, 1.1, 0);
    let theta = 0.75, phi = 1.18, thetaT = 0.75, phiT = 1.18;
    let thetaV = 0, phiV = 0;
    let radiusBase = 10.2, radiusT = 10.2, radius = 14.5;
    let dragging = false, lastX = 0, lastY = 0, idleT = 0;
    let model: THREE.Group | null = null;
    let baseY = 0; // altura de apoyo calibrada al cargar el GLB
    const GROUND_CLEARANCE = 0.03; // holgura para que las ruedas nunca toquen bajo y=0
    let entranceT = 0;
    let visible = true;
    const spinRef = { on: !reduced };
    let viewAnim: { t: number; dur: number; fromT: number; toT: number; fromP: number; toP: number } | null = null;
    apiRef.current = {
      go: (v) => { viewAnim = { t: 0, dur: 0.9, fromT: thetaT, toT: v.theta, fromP: phiT, toP: v.phi }; if (v.radius) radiusT = v.radius; else radiusT = radiusBase; idleT = 0; },
      setSpin: (b) => { spinRef.on = reduced ? false : b; },
      zoom: (d) => { radiusT = Math.min(15, Math.max(6.5, radiusT + d)); idleT = 0; },
    };

    const placeCamera = (r: number, lift = 0) => {
      const sp = Math.sin(phi);
      camera.position.set(
        target.x + r * sp * Math.sin(theta),
        target.y + r * Math.cos(phi) + lift,
        target.z + r * sp * Math.cos(theta),
      );
      camera.lookAt(target);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; idleT = 0;
      viewAnim = null;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      thetaT += (e.clientX - lastX) * 0.008;
      phiT = Math.min(1.45, Math.max(0.85, phiT - (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY; idleT = 0;
    };
    const onUp = () => { dragging = false; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { thetaT -= 0.15; idleT = 0; }
      else if (e.key === 'ArrowRight') { thetaT += 0.15; idleT = 0; }
      else if (e.key === 'ArrowUp') { phiT = Math.max(0.85, phiT - 0.08); idleT = 0; }
      else if (e.key === 'ArrowDown') { phiT = Math.min(1.45, phiT + 0.08); idleT = 0; }
      else if (e.key === '+' || e.key === '=') apiRef.current?.zoom(-0.8);
      else if (e.key === '-') apiRef.current?.zoom(0.8);
      else return;
      e.preventDefault();
    };
    // Pinch-to-zoom sin romper el scroll vertical.
    let pinchD = 0;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinchD > 0) radiusT = Math.min(15, Math.max(6.5, radiusT - (d - pinchD) * 0.02));
      pinchD = d;
    };
    const onTouchEnd = () => { pinchD = 0; };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('keydown', onKey);
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    const resize = () => {
      const w = mount.clientWidth || 800, h = mount.clientHeight || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 });
    io.observe(mount);

    // Carga progresiva del GLB real con auto-encuadre por Box3.
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        enhanceMaterials(model);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // Centra el modelo sobre el origen y apoya las ruedas con holgura.
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y = model.position.y - box.min.y + GROUND_CLEARANCE;
        const maxDim = Math.max(size.x, size.y, size.z);
        const fit = 6.4 / Math.max(1, maxDim);
        const s = Math.min(1.6, Math.max(0.6, fit));
        model.scale.setScalar(s);
        // Re-encuadra por esfera de encaje: distancia = radio / tan(fov/2) con
        // margen 1.25 para que el encuadre sea ajustado sin cortar.
        const reBox = new THREE.Box3().setFromObject(model);
        const sphere = reBox.getBoundingSphere(new THREE.Sphere());
        baseY = model.position.y;
        target.copy(sphere.center);
        const fitDist = (sphere.radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.08;
        radiusBase = Math.min(13, Math.max(7, fitDist));
        radiusT = radiusBase;
        if (entranceT >= 1) radius = radiusBase;
        scene.add(model);
        setReady(true);
      },
      (ev) => { if (ev.total > 0 && !disposed) setProgress(Math.round((ev.loaded / ev.total) * 100)); },
      () => { if (!disposed) setFailed(true); },
    );

    let scrollLift = 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      scrollLift = Math.min(1.2, y / 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let raf = 0;
    let prev = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) { prev = now; return; }
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      elapsed += dt;
      idleT += dt;
      if (spinRef.on && !dragging && idleT > 2.0) thetaT += dt * 0.28;
      if (viewAnim) {
        viewAnim.t += dt;
        const t = Math.min(1, viewAnim.t / viewAnim.dur);
        const e = easeInOutCubic(t);
        thetaT = viewAnim.fromT + (viewAnim.toT - viewAnim.fromT) * e;
        phiT = viewAnim.fromP + (viewAnim.toP - viewAnim.fromP) * e;
        if (t >= 1) viewAnim = null;
      }
      const stiffness = 42, damping = 9.5;
      thetaV += ((thetaT - theta) * stiffness - thetaV * damping) * dt;
      phiV += ((phiT - phi) * stiffness - phiV * damping) * dt;
      theta += thetaV * dt;
      phi += phiV * dt;
      if (entranceT < 1) {
        entranceT = Math.min(1, entranceT + dt / 1.4);
        const e = easeInOutCubic(entranceT);
        radius = radiusBase + (1 - e) * 4.5;
        if (model && !reduced) {
          const base = (model.userData.baseScale as number | undefined) ?? model.scale.x;
          model.userData.baseScale = base;
          model.scale.setScalar(base * (0.92 + 0.08 * easeOutBack(entranceT)));
        }
      } else {
        radius += (radiusT - radius) * Math.min(1, dt * 3);
      }
      if (model && !reduced) {
        // Suspensión idle alrededor de la altura de apoyo: nunca bajo baseY.
        model.position.y = baseY + (Math.sin(elapsed * 1.6) * 0.5 + 0.5) * 0.016;
        model.rotation.z = Math.sin(elapsed * 1.1) * 0.0016;
      }
      if (particles) {
        particles.rotation.y = elapsed * 0.02;
        (particles.material as THREE.PointsMaterial).opacity = 0.35 + Math.sin(elapsed * 0.8) * 0.1;
      }
      ring.rotation.z = elapsed * 0.05;
      placeCamera(radius, scrollLift);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      renderer.dispose();
      pmrem.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const pick = (i: number) => { setView(i); apiRef.current?.go(VIEWS[i]); };
  const toggleSpin = () => {
    setSpin((s) => { const next = !s; apiRef.current?.setSpin(next); return next; });
  };

  if (failed) {
    return (
      <figure className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
        <img src={PHOTO_FALLBACK} alt="Miniván blanca de Turismo Chilón en ruta por Cajamarca" className="h-[400px] w-full object-cover sm:h-[480px]" loading="lazy" />
        <figcaption className="bg-andino-950 px-4 py-2 text-center text-xs text-stone-300">
          Hyundai H350 Solati 2019 — Servicio Turístico · Turismo Chilón S.R.L. (vista fotográfica, WebGL no disponible)
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-6">
        <img src="/logo-chilon.png" alt="Logo Chilón Tours" className="logo-badge h-11 w-11 rounded-2xl bg-white object-contain p-1 shadow-md" loading="lazy" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white sm:text-base">Hyundai H350 Solati 2019 · en 3D</p>
          <p className="truncate text-[11px] text-stone-300 sm:text-xs">Arrastra para girar · pellizca o usa +/− para acercar · teclado con ← →</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vistas del modelo 3D">
          {VIEWS.map((v, i) => (
            <button key={v.label} onClick={() => pick(i)} aria-pressed={view === i}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-160 active:scale-95 sm:text-xs ${view === i ? 'bg-amber-400 text-stone-900 shadow' : 'border border-white/20 bg-white/10 text-stone-200 hover:bg-white/20'}`}>
              {v.label}
            </button>
          ))}
          <button onClick={toggleSpin} aria-pressed={spin} title={spin ? 'Pausar giro' : 'Reanudar giro'}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-stone-200 transition-all duration-160 hover:bg-white/20 active:scale-95 sm:text-xs">
            {spin ? '❚❚ Giro' : '▶ Giro'}
          </button>
          <button onClick={() => apiRef.current?.zoom(-0.8)} aria-label="Acercar"
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-stone-200 hover:bg-white/20 active:scale-95">+</button>
          <button onClick={() => apiRef.current?.zoom(0.8)} aria-label="Alejar"
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-stone-200 hover:bg-white/20 active:scale-95">−</button>
        </div>
      </div>

      <div className="relative px-2 sm:px-4">
        <div ref={mountRef} className="van-canvas h-[360px] w-full cursor-grab active:cursor-grabbing sm:h-[440px] lg:h-[500px]"
          style={{ opacity: ready ? 1 : 0 }} aria-hidden={!ready} />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center" role="status" aria-live="polite">
            <div className="w-64 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                <span className="text-xs font-semibold text-stone-200">Cargando H350 Solati 3D… {progress > 0 ? `${progress}%` : ''}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300" style={{ width: `${Math.max(8, progress)}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-stone-400">Modelo GLB real · 607 KB · materiales PBR originales</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
        {['GPS y SOAT vigente', 'Climatizadas', 'Choferes homologados'].map((b, i) => (
          <span key={b} className="stagger-item rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-stone-100" style={{ animationDelay: `${40 + i * 50}ms` }}>{b}</span>
        ))}
        <span className="ml-auto hidden text-[11px] text-stone-400 sm:inline">Hyundai H350 Solati · modelo 2019 · geometría y proporciones originales</span>
      </div>
    </div>
  );
}
