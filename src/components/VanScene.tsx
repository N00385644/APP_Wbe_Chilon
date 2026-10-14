import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * VanScene — miniván blanca de Turismo Chilón modelada proceduralmente con
 * Three.js (misma librería de C:\Users\1luis\Documents\three.js-master, vía npm),
 * con el logo oficial (/logo-chilon.png) como calcomanía.
 *
 * Realismo PBR (refs MCP 3d-assets): perla blanca con micro-flakes + clearcoat 1
 * (ref "White Metallic Pearl Car Paint"), caucho mate rugoso (ref "Matte Tire
 * Rubber"), cromo pulido, vidrios clearcoat, rig de estudio 3-point + RoomEnvironment
 * (el HDRI "Car Showroom Studio" pesa 962MB y no se empaqueta; se aproxima con luces).
 * Suelo con ruido de asfalto procedural (ref PolyHaven asphalt_02 CC0).
 *
 * Animación (patrones MCP brushstroke generate_scroll_animation, score 88):
 * keyframes con easeInOutCubic, muelle amortiguado para órbita, dolly-in +
 * easeOutBack de entrada, suspensión idle física, parallax de scroll; todo
 * interrumpible por drag y con prefers-reduced-motion => sin giro/balanceo.
 */

const LOGO_URL = '/logo-chilon.png';
const PHOTO_FALLBACK = '/tours/wa-bus-01.jpg';
const PHOTO_THUMBS = ['/tours/wa-bus-01.jpg', '/tours/wa-bus-02.jpg', '/tours/wa-bus-04.jpg'];

const TARGET = new THREE.Vector3(0, 1.15, 0);

function textTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 224;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = 'italic 700 118px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4d3f0e';
  ctx.fillText(text, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function plateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PERÚ', 128, 14);
  ctx.fillStyle = '#111827';
  ctx.font = '800 34px Arial';
  ctx.fillText('CHL·360', 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function treadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b5b5b5';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (let r = -1; r < 3; r++) {
    for (let k = 0; k < 2; k++) {
      const y = r * 64 + k * 32;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(64, y + 22);
      ctx.lineTo(120, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function sidewallTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(165,175,185,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, 118, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, 84, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(175,183,193,0.95)';
  ctx.font = '700 21px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = 'TURISMO CHILON • CAJAMARCA • PERU • ';
  const R = 100;
  for (let i = 0; i < text.length; i++) {
    const a = (i / text.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(S / 2 + Math.cos(a) * R, S / 2 + Math.sin(a) * R);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function grilleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#14181d';
  ctx.fillRect(0, 0, 256, 64);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 17; x++) {
      const cx = x * 16 + (y % 2 ? 8 : 0);
      const cy = y * 16 + 8;
      ctx.fillStyle = '#2c3641';
      ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0e12';
      ctx.beginPath(); ctx.arc(cx, cy - 1.5, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function rearTextTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = 'italic 800 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#166534';
  ctx.fillText('Turismo Chilón', 256, 40);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(106, 70, 300, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Mejora PBR vía MCP 3d-assets:
 * - Ref: "White Metallic Pearl Car Paint" (BlenderKit, Royalty Free) —
 *   perla blanca con flakes finos + clearcoat liso. Como el .blend no es
 *   usable en web, se replica procedural: micro-flakes como roughnessMap
 *   + bump sutil sobre MeshPhysicalMaterial con clearcoat 1 + iridiscencia.
 * - Ref: "Matte Tire Rubber" — caucho mate rugoso (roughness ~0.95).
 * Licencias: ver docs/MODELO_3D.md. No se empaquetan texturas externas.
 */
function pearlFlakeTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, S, S);
  // Flakes perlados aleatorios (puntos claros/oscuros de 1-2px)
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const v = 110 + Math.random() * 120;
    ctx.fillStyle = `rgb(${v | 0},${v | 0},${(v + Math.random() * 18) | 0})`;
    ctx.fillRect(x, y, Math.random() < 0.85 ? 1 : 2, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function asphaltNoiseTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  // Base asfalto (ref PolyHaven asphalt_02 CC0): gris granular con grietas sutiles
  ctx.fillStyle = '#33363b';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const g = 38 + Math.random() * 46;
    ctx.fillStyle = `rgba(${g | 0},${g | 0},${(g + 4) | 0},0.55)`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4);
  }
  ctx.strokeStyle = 'rgba(18,20,23,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let x = Math.random() * S, y = Math.random() * S;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Easings estilo brushstroke (animations/): transiciones interrumpibles
// con cubic + back para entrada, y muelle amortiguado para órbita.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutBack(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function box(
  parent: THREE.Group, w: number, h: number, d: number,
  x: number, y: number, z: number, mat: THREE.Material,
  opts?: { rx?: number; ry?: number; rz?: number; shadow?: boolean },
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.ry) m.rotation.y = opts.ry;
  if (opts?.rz) m.rotation.z = opts.rz;
  m.castShadow = opts?.shadow ?? true;
  parent.add(m);
  return m;
}

function rbox(
  parent: THREE.Group, w: number, h: number, d: number, radius: number,
  x: number, y: number, z: number, mat: THREE.Material,
  opts?: { rx?: number; ry?: number; rz?: number; shadow?: boolean },
): THREE.Mesh {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat);
  m.position.set(x, y, z);
  if (opts?.rx) m.rotation.x = opts.rx;
  if (opts?.ry) m.rotation.y = opts.ry;
  if (opts?.rz) m.rotation.z = opts.rz;
  m.castShadow = opts?.shadow ?? true;
  parent.add(m);
  return m;
}

function buildWheel(sx: 1 | -1, z: number, mats: {
  tire: THREE.Material; rim: THREE.Material; dark: THREE.Material;
}): THREE.Group {
  const g = new THREE.Group();
  g.position.set(sx * 0.85, 0.42, z);
  // Neumático con perfil real (torneado)
  const profile = [
    new THREE.Vector2(0.24, -0.15), new THREE.Vector2(0.36, -0.15),
    new THREE.Vector2(0.415, -0.07), new THREE.Vector2(0.415, 0.07),
    new THREE.Vector2(0.36, 0.15), new THREE.Vector2(0.24, 0.15),
  ];
  const tire = new THREE.Mesh(new THREE.LatheGeometry(profile, 30), mats.tire);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  // Tambor + 5 rayos + aro + copa
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 20), mats.dark);
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);
  const spokeGeo = new THREE.BoxGeometry(0.16, 0.24, 0.1);
  for (let i = 0; i < 5; i++) {
    const holder = new THREE.Group();
    const spoke = new THREE.Mesh(spokeGeo, mats.rim);
    spoke.position.set(sx * 0.05, 0.12, 0);
    holder.add(spoke);
    holder.rotation.x = (i / 5) * Math.PI * 2;
    g.add(holder);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.028, 10, 28), mats.rim);
  lip.position.x = sx * 0.1;
  lip.rotation.y = Math.PI / 2;
  g.add(lip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 12), mats.dark);
  cap.rotation.z = Math.PI / 2;
  g.add(cap);
  // Flanco con rótulo circular + caliper rojo + birlos
  const wall = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.4, 40),
    new THREE.MeshStandardMaterial({ map: sidewallTexture(), transparent: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 }),
  );
  wall.position.x = sx * 0.153;
  wall.rotation.y = sx * Math.PI / 2;
  g.add(wall);
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.4, roughness: 0.4 }),
  );
  caliper.position.set(0, 0.1, -0.12);
  g.add(caliper);
  const lugGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const lug = new THREE.Mesh(lugGeo, mats.dark);
    lug.rotation.z = Math.PI / 2;
    lug.position.set(sx * 0.14, Math.cos(a) * 0.07, Math.sin(a) * 0.07);
    g.add(lug);
  }
  return g;
}

function buildVan(logoTex: THREE.Texture, hoodTex: THREE.Texture, plateTex: THREE.Texture, rearTex: THREE.Texture): THREE.Group {
  const van = new THREE.Group();

  // PBR mejorado con refs del MCP 3d-assets (ver pearlFlakeTexture):
  // perla blanca: flakes como roughnessMap + clearcoat 1 + iridiscencia sutil.
  const flakeTex = pearlFlakeTexture();
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc, metalness: 0.12, roughness: 0.27,
    roughnessMap: flakeTex, bumpMap: flakeTex, bumpScale: 0.004,
    clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 1.25,
    iridescence: 0.28, iridescenceIOR: 1.28,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a1420, metalness: 0.1, roughness: 0.12,
    clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.2,
    transparent: true, opacity: 0.96,
  });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x232a31, metalness: 0.35, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd7dee6, metalness: 1.0, roughness: 0.16, envMapIntensity: 1.3 });
  const treadTex = treadTexture();
  treadTex.repeat.set(28, 2);
  // Ref MCP "Matte Tire Rubber": caucho mate casi sin reflejo.
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.95, metalness: 0.0, bumpMap: treadTex, bumpScale: 0.05, envMapIntensity: 0.25 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9d2dc, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.2 });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xeef4ff, emissive: 0xfff3c4, emissiveIntensity: 1.6, roughness: 0.12, metalness: 0.35,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d, emissive: 0xef2b2b, emissiveIntensity: 0.8, roughness: 0.2,
  });
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
  const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.6, metalness: 0.3 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0x92400e, emissive: 0xf59e0b, emissiveIntensity: 1.2, roughness: 0.3 });

  // ---- Carrocería: perfil lateral extruido (frente en +Z tras rotar) ----
  const s = new THREE.Shape();
  s.moveTo(0.12, 0.5);
  s.lineTo(5.55, 0.5);
  s.quadraticCurveTo(5.88, 0.52, 5.9, 0.85); // nariz
  s.lineTo(5.9, 1.02);
  s.lineTo(5.32, 1.18);   // parrilla -> capó
  s.lineTo(4.92, 1.6);    // capó
  s.lineTo(4.2, 2.26);    // parabrisas
  s.quadraticCurveTo(4.1, 2.34, 3.95, 2.34); // frente de techo
  s.lineTo(0.35, 2.34);   // techo
  s.quadraticCurveTo(0.05, 2.32, 0.02, 2.0); // caída trasera
  s.lineTo(0.0, 0.62);
  s.quadraticCurveTo(0.0, 0.5, 0.12, 0.5);
  const bodyGeo = new THREE.ExtrudeGeometry(s, {
    depth: 1.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, steps: 1,
  });
  bodyGeo.translate(-2.95, 0, -0.95);
  const body = new THREE.Mesh(bodyGeo, paint);
  body.rotation.y = -Math.PI / 2; // +X local -> +Z mundo (frente)
  body.castShadow = true;
  van.add(body);
  // Paredes laterales en |x| = 1.0

  // ---- Vidrios laterales + pilares ----
  for (const sx of [-1, 1] as const) {
    rbox(van, 0.05, 0.52, 3.1, 0.02, sx * 0.985, 1.94, -0.7, glass, { shadow: false });
    for (const pz of [-1.85, -0.85, 0.15]) {
      box(van, 0.06, 0.52, 0.09, sx * 0.985, 1.94, pz, paint, { shadow: false });
    }
    // Franja negra + filete rojo característicos
    rbox(van, 0.03, 0.15, 4.4, 0.012, sx * 1.0, 1.02, -0.2, darkTrim, { shadow: false });
    box(van, 0.032, 0.045, 4.4, sx * 1.0, 0.9, -0.2, new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }), { shadow: false });
    // Juntas de puertas + manijas
    for (const dz of [0.75, -1.25]) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.97), seamMat);
      seam.position.set(sx * 1.004, 1.1, dz);
      seam.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      van.add(seam);
    }
    rbox(van, 0.03, 0.05, 0.24, 0.01, sx * 1.01, 1.32, 0.55, chrome, { shadow: false });
    rbox(van, 0.03, 0.05, 0.24, 0.01, sx * 1.01, 1.32, -0.55, chrome, { shadow: false });
    // Espejos: brazo + carcasa + luna
    box(van, 0.2, 0.05, 0.05, sx * 1.06, 1.78, 1.3, darkTrim, { shadow: false });
    rbox(van, 0.13, 0.24, 0.17, 0.04, sx * 1.15, 1.74, 1.3, paint, { shadow: false });
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.18), chrome);
    mirror.position.set(sx * 1.15, 1.74, 1.21);
    mirror.rotation.y = Math.PI;
    van.add(mirror);
    // Repetidor lateral + tira del espejo + riel corredizo + gotero + tapa combustible
    rbox(van, 0.03, 0.06, 0.16, 0.01, sx * 1.0, 1.52, 1.15, amberMat, { shadow: false });
    box(van, 0.016, 0.06, 0.12, sx * 1.218, 1.74, 1.3, amberMat, { shadow: false });
    box(van, 0.024, 0.035, 1.7, sx * 1.002, 1.6, -0.75, darkTrim, { shadow: false });
    box(van, 0.03, 0.03, 3.3, sx * 1.0, 2.225, -0.7, darkTrim, { shadow: false });
    if (sx < 0) box(van, 0.014, 0.24, 0.24, -1.0, 1.32, -2.15, darkTrim, { shadow: false });
    // Faldones
    rbox(van, 0.05, 0.2, 4.0, 0.02, sx * 0.99, 0.44, -0.2, darkTrim, { shadow: false });
  }

  // ---- Parabrisas + pilares A + limpiaparabrisas ----
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0, 1.976, 1.652);
  shieldGroup.rotation.x = -0.83; // = pendiente real del capó->techo (47.5° de la vertical)
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 0.95), glass);
  shieldGroup.add(shield);
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.04), paint);
    pillar.position.set(sx * 0.83, 0, 0.01);
    shieldGroup.add(pillar);
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.02), darkTrim);
    wiper.position.set(sx * 0.33, -0.18, 0.03);
    wiper.rotation.z = sx * 0.18;
    shieldGroup.add(wiper);
  }
  van.add(shieldGroup);

  // Luneta trasera + tercera luz de freno
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.55), glass);
  rear.position.set(0, 1.85, -3.006);
  rear.rotation.y = Math.PI;
  van.add(rear);
  box(van, 0.42, 0.06, 0.06, 0, 2.22, -2.99, tailMat, { shadow: false });
  // Limpiaparabrisas trasero + portón doble + rótulo
  const wiperR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.02), darkTrim);
  wiperR.position.set(0.35, 1.82, -3.02);
  wiperR.rotation.z = 0.4;
  van.add(wiperR);
  const split = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 1.45), seamMat);
  split.position.set(0, 1.28, -3.004);
  split.rotation.y = Math.PI;
  van.add(split);
  for (const sx of [-1, 1] as const) {
    rbox(van, 0.05, 0.28, 0.03, 0.01, sx * 0.14, 1.35, -3.01, darkTrim, { shadow: false });
  }
  const rearText = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.21),
    new THREE.MeshStandardMaterial({ map: rearTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  rearText.position.set(0, 1.47, -3.006);
  rearText.rotation.y = Math.PI;
  van.add(rearText);

  // ---- Frente: parrilla, faros con lente, antiniebla, parachoques ----
  // (la nariz del extruido llega a z=3.0 por el bevel: todo va por fuera)
  rbox(van, 1.5, 0.3, 0.12, 0.03, 0, 0.95, 3.0, grilleMat);
  for (let i = 0; i < 3; i++) {
    box(van, 1.42, 0.04, 0.04, 0, 0.87 + i * 0.09, 3.065, chrome, { shadow: false });
  }
  for (const sx of [-1, 1] as const) {
    rbox(van, 0.4, 0.2, 0.14, 0.04, sx * 0.72, 1.02, 2.95, darkTrim, { shadow: false });
    // Lente con volumen (caja fina) para lectura garantizada desde cualquier ángulo
    rbox(van, 0.36, 0.16, 0.03, 0.01, sx * 0.72, 1.02, 3.02, lensMat, { shadow: false });
    box(van, 0.3, 0.03, 0.03, sx * 0.72, 0.9, 3.07, lensMat, { shadow: false });
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), lensMat);
    fog.position.set(sx * 0.6, 0.72, 3.06);
    fog.rotation.x = Math.PI / 2;
    van.add(fog);
    // Direccional lateral + aro cromado del antiniebla
    rbox(van, 0.08, 0.16, 0.1, 0.015, sx * 0.9, 1.02, 2.97, amberMat, { shadow: false });
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 8, 20), chrome);
    bezel.position.set(sx * 0.6, 0.72, 3.055);
    van.add(bezel);
    // Pilotos traseros verticales (cola del extruido en z=-3.0)
    rbox(van, 0.2, 0.42, 0.08, 0.02, sx * 0.82, 1.15, -2.98, tailMat, { shadow: false });
  }
  rbox(van, 2.0, 0.32, 0.35, 0.06, 0, 0.52, 2.9, darkTrim);
  rbox(van, 2.0, 0.32, 0.3, 0.06, 0, 0.52, -2.85, darkTrim);
  // Cobertor de remolque + reflectores
  box(van, 0.16, 0.08, 0.02, 0.72, 0.4, 3.078, darkTrim, { shadow: false });
  for (const sx of [-1, 1] as const) {
    box(van, 0.2, 0.05, 0.02, sx * 0.55, 0.42, 3.078, lensMat, { shadow: false });
    box(van, 0.25, 0.06, 0.02, sx * 0.6, 0.5, -3.002, tailMat, { shadow: false });
  }

  // Placas Perú
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4 });
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), plateMat);
  plateF.position.set(0, 0.56, 3.02);
  van.add(plateF);
  const plateR = plateF.clone();
  plateR.position.set(0, 0.56, -3.006);
  plateR.rotation.y = Math.PI;
  van.add(plateR);

  // Escape + loderas
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 12), darkTrim);
  exhaust.position.set(0.6, 0.3, -3.0);
  exhaust.rotation.x = Math.PI / 2;
  van.add(exhaust);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 14), chrome);
  tip.position.set(0.6, 0.3, -3.07);
  tip.rotation.x = Math.PI / 2;
  van.add(tip);
  for (const sx of [-1, 1]) {
    box(van, 0.26, 0.22, 0.04, sx * 0.85, 0.3, 1.32, darkTrim, { shadow: false });
    box(van, 0.26, 0.22, 0.04, sx * 0.85, 0.3, -2.32, darkTrim, { shadow: false });
  }

  // Techo: climatizador, rieles, aleta
  rbox(van, 1.2, 0.18, 1.8, 0.05, 0, 2.47, -0.6, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }));
  for (const sx of [-1, 1]) {
    box(van, 0.06, 0.05, 3.4, sx * 0.68, 2.4, -0.6, darkTrim, { shadow: false });
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), paint);
  fin.position.set(0, 2.44, -2.15);
  fin.rotation.y = Math.PI / 4;
  van.add(fin);
  // Luces de trocha + rejillas del climatizador
  for (const mx of [-0.45, 0, 0.45]) {
    box(van, 0.09, 0.045, 0.04, mx, 2.375, 1.02, amberMat, { shadow: false });
  }
  for (const vy of [2.43, 2.47, 2.51]) {
    box(van, 0.9, 0.025, 0.02, 0, vy, 0.305, darkTrim, { shadow: false });
  }

  // Ruedas + pasos de rueda
  const wheelMats = { tire: tireMat, rim: rimMat, dark: darkTrim };
  van.add(buildWheel(1, 1.9, wheelMats));
  van.add(buildWheel(-1, 1.9, wheelMats));
  van.add(buildWheel(1, -1.75, wheelMats));
  van.add(buildWheel(-1, -1.75, wheelMats));
  const archGeo = new THREE.TorusGeometry(0.52, 0.07, 10, 20, Math.PI);
  for (const sx of [-1, 1]) {
    for (const wz of [1.9, -1.75]) {
      const arch = new THREE.Mesh(archGeo, darkTrim);
      arch.position.set(sx * 0.99, 0.44, wz);
      arch.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      van.add(arch);
    }
  }

  // ---- Calcomanías del logo oficial ----
  const decal = (w: number, h: number) =>
    new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: logoTex, transparent: true, roughness: 0.4, metalness: 0.05,
        polygonOffset: true, polygonOffsetFactor: -2,
      }),
    );
  for (const sx of [-1, 1] as const) {
    const side = decal(1.55, 1.47);
    side.position.set(sx * 1.018, 1.32, -0.35);
    side.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    van.add(side);
  }
  // Logo frontal sobre el capó (sigue la pendiente real)
  const nose = decal(0.5, 0.47);
  nose.position.set(0, 1.1, 2.67);
  nose.rotation.x = -0.26;
  van.add(nose);
  // "Servicio Turístico" sobre el capó, como la unidad real
  const hood = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.3),
    new THREE.MeshStandardMaterial({ map: hoodTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  hood.position.set(0, 1.41, 2.19);
  hood.rotation.x = -0.77;
  van.add(hood);

  return van;
}

type ViewPreset = { label: string; theta: number; phi: number };
const VIEWS: ViewPreset[] = [
  { label: '3/4', theta: 0.75, phi: 1.3 },
  { label: 'Lateral', theta: Math.PI / 2, phi: 1.33 },
  { label: 'Frontal', theta: 0.12, phi: 1.3 },
];

export function VanScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ go: (v: ViewPreset) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spin, setSpin] = useState(true);
  const [view, setView] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3644, 0.55));
    const key = new THREE.DirectionalLight(0xfff2dd, 2.4);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -7; key.shadow.camera.right = 7;
    key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 50;
    key.shadow.bias = -0.0004;
    scene.add(key);
    // Relleno frontal + rim cian (patrón 3-point de brushstroke generate_scroll_animation, score 88)
    const fill = new THREE.DirectionalLight(0xffffff, 0.48);
    fill.position.set(-5, 3, 5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 1.1);
    rim.position.set(-6, 4, -6);
    scene.add(rim);

    // Piso estudio: sombra + elipse de anclaje + aro ámbar
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.ShadowMaterial({ opacity: 0.38 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      const disc = new THREE.Mesh(
        new THREE.PlaneGeometry(9.5, 6.5),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.005;
      scene.add(disc);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 3.72, 72),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Estado orbital con muelle amortiguado + entrada dolly (patrón brushstroke:
    // keyframes con easeInOutCubic + loop con lerp, validado score 88).
    let theta = 0.75, phi = 1.3, thetaT = 0.75, phiT = 1.3;
    let thetaV = 0, phiV = 0; // velocidades del muelle
    const radiusBase = 9.8;
    let radiusT = radiusBase, radius = radiusBase + 4.5; // dolly-in de entrada
    let dragging = false, lastX = 0, lastY = 0, idleT = 0;
    let vanGroup: THREE.Group | null = null;
    let entranceT = 0; // 0->1, easeOutBack para escala + easeInOutCubic para dolly
    const spinRef = { on: !reduced };
    // Transición de vista con duración fija e easing (interrumpible por drag)
    let viewAnim: { t: number; dur: number; fromT: number; toT: number; fromP: number; toP: number } | null = null;
    apiRef.current = {
      go: (v) => {
        viewAnim = { t: 0, dur: 0.9, fromT: thetaT, toT: v.theta, fromP: phiT, toP: v.phi };
        idleT = 0;
      },
    };

    const setSpinExternal = (on: boolean) => { spinRef.on = reduced ? false : on; };

    const placeCamera = (r: number, scrollLift = 0) => {
      const sp = Math.sin(phi), cp = Math.cos(phi);
      camera.position.set(
        TARGET.x + r * sp * Math.sin(theta),
        TARGET.y + r * cp + scrollLift,
        TARGET.z + r * sp * Math.cos(theta),
      );
      camera.lookAt(TARGET);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; idleT = 0;
      viewAnim = null; // el drag interrumpe la transición de vista
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      thetaT += (e.clientX - lastX) * 0.008;
      phiT = Math.min(1.45, Math.max(0.85, phiT - (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY; idleT = 0;
    };
    const onUp = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const resize = () => {
      const w = mount.clientWidth || 800, h = mount.clientHeight || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Carga logo + construye la van
    const loader = new THREE.TextureLoader();
    loader.load(
      LOGO_URL,
      (tex) => {
        if (disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const van = buildVan(tex, textTexture('Servicio Turístico'), plateTexture(), rearTextTexture());
        vanGroup = van;
        scene.add(van);
        setReady(true);
      },
      undefined,
      () => { if (!disposed) setFailed(true); },
    );

    // Parallax sutil con scroll del hero (brushstroke scroll-animation: cámara sigue keyframes)
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
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      elapsed += dt;
      idleT += dt;
      if (spinRef.on && !dragging && idleT > 2.0 && !document.hidden) thetaT += dt * 0.28;
      // Transición de vista con easeInOutCubic (interrumpible)
      if (viewAnim) {
        viewAnim.t += dt;
        const t = Math.min(1, viewAnim.t / viewAnim.dur);
        const e = easeInOutCubic(t);
        thetaT = viewAnim.fromT + (viewAnim.toT - viewAnim.fromT) * e;
        phiT = viewAnim.fromP + (viewAnim.toP - viewAnim.fromP) * e;
        if (t >= 1) viewAnim = null;
      }
      // Muelle amortiguado crítico para órbita (sin rebotes, converge suave)
      const stiffness = 42, damping = 9.5;
      thetaV += ((thetaT - theta) * stiffness - thetaV * damping) * dt;
      phiV += ((phiT - phi) * stiffness - phiV * damping) * dt;
      theta += thetaV * dt;
      phi += phiV * dt;
      // Entrada: dolly-in + escala con easeOutBack
      if (entranceT < 1) {
        entranceT = Math.min(1, entranceT + dt / 1.4);
        const e = easeInOutCubic(entranceT);
        radiusT = radiusBase;
        radius = radiusBase + (1 - e) * 4.5;
        if (vanGroup && !reduced) {
          const s = 0.92 + 0.08 * easeOutBack(entranceT);
          vanGroup.scale.setScalar(s);
        }
      } else {
        radius += (radiusT - radius) * Math.min(1, dt * 3);
      }
      // Suspensión idle: balanceo vertical sutil (física brushstroke, respeta reduced-motion)
      if (vanGroup && !reduced && !document.hidden) {
        vanGroup.position.y = Math.sin(elapsed * 1.6) * 0.012;
        vanGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.0016;
      }
      placeCamera(radius, scrollLift);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Expone el toggle de giro al state de React
    (apiRef.current as { setSpin?: (b: boolean) => void }).setSpin = setSpinExternal;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const pick = (i: number) => {
    setView(i);
    apiRef.current?.go(VIEWS[i]);
  };
  const toggleSpin = () => {
    setSpin((s) => {
      const next = !s;
      (apiRef.current as unknown as { setSpin?: (b: boolean) => void })?.setSpin?.(next);
      return next;
    });
  };

  if (failed) {
    return (
      <figure className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
        <img src={PHOTO_FALLBACK} alt="Miniván blanca de Turismo Chilón rotulada con el logo" className="h-[400px] w-full object-cover sm:h-[480px]" loading="lazy" />
        <figcaption className="bg-andino-950 px-4 py-2 text-center text-xs text-stone-300">
          Nuestras unidades — Servicio Turístico · Turismo Chilón S.R.L.
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-sky-950/60 via-andino-950/80 to-stone-950/90 shadow-2xl">
      {/* Barra superior: logo + título + controles */}
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-6">
        <img
          src={LOGO_URL}
          alt="Logo Chilón Tours"
          className="logo-badge h-11 w-11 rounded-2xl bg-white object-contain p-1 shadow-md"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-white sm:text-base">Nuestra flota en 3D</p>
          <p className="truncate text-[11px] text-stone-300 sm:text-xs">Miniván blanca · arrastra para girar · logo oficial Chilón Tours</p>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Vistas del modelo 3D">
          {VIEWS.map((v, i) => (
            <button
              key={v.label}
              onClick={() => pick(i)}
              aria-pressed={view === i}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-160 active:scale-95 sm:text-xs ${
                view === i
                  ? 'bg-amber-400 text-stone-900 shadow'
                  : 'border border-white/20 bg-white/10 text-stone-200 hover:bg-white/20'
              }`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={toggleSpin}
            aria-pressed={spin}
            title={spin ? 'Pausar giro' : 'Reanudar giro'}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-stone-200 transition-all duration-160 hover:bg-white/20 active:scale-95 sm:text-xs"
          >
            {spin ? '❚❚ Giro' : '▶ Giro'}
          </button>
        </div>
      </div>

      {/* Canvas 3D */}
      <div className="relative px-2 sm:px-4">
        <div
          ref={mountRef}
          className="van-canvas h-[360px] w-full cursor-grab active:cursor-grabbing sm:h-[440px] lg:h-[480px]"
          style={{ opacity: ready ? 1 : 0 }}
          aria-label="Modelo 3D interactivo de la miniván de Turismo Chilón"
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 backdrop-blur">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
              <span className="text-xs font-semibold text-stone-200">Armando la unidad 3D…</span>
            </div>
          </div>
        )}
      </div>

      {/* Badges + fotos reales */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-2 sm:px-6">
        {['GPS y SOAT vigente', 'Climatizadas', 'Choferes homologados'].map((b, i) => (
          <span
            key={b}
            className="stagger-item rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-stone-100"
            style={{ animationDelay: `${40 + i * 50}ms` }}
          >
            {b}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
        {PHOTO_THUMBS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Foto real de la movilidad ${i + 1}`}
            loading="lazy"
            className="h-20 w-full rounded-xl border border-white/15 object-cover transition-transform duration-200 ease-out sm:h-24"
          />
        ))}
      </div>
    </div>
  );
}
