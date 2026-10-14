# Modelo 3D — Hyundai H350 Solati 2019

- Archivo servido: `public/models/hyundai-h350-solati.glb` (607 KB, 5 meshes, 4 materiales, 1 imagen embebida).
- Origen: copia de `2019_hyundai_h350_solati.glb` de la raíz para que Vite lo sirva en `/models/`.
- Visor: `src/components/H350Viewer.tsx` con `GLTFLoader` + entorno PBR.
- Entorno: HDRI de estudio `public/hdri/studio_country_hall_1k.hdr` (Poly Haven, CC0, 1K, 1.6 MB)
  cargado con `RGBELoader` como `scene.environment` (solo reflejos; el fondo sigue
  siendo el gradiente CSS). Fallback a `RoomEnvironment` si falla la red.
- Suelo: `public/textures/asphalt_floor_*_1k.jpg` (Poly Haven, CC0, 1K): difuso
  1.1 MB + rugosidad 0.5 MB + normal OpenGL 1.3 MB ≈ 2.9 MB. `MeshStandardMaterial`
  con `roughness 1.0`, `normalScale 0.7`, `envMapIntensity 0.35`, repetición 6×6.
- Se conservan UVs, mapas y proporciones originales: no se deforman puertas/ruedas ni se inventan animaciones mecánicas.
- Mejora PBR (sin texturas externas):
  - `envMapIntensity = 1.15` global; pintura clara → roughness 0.32; vidrios oscuros → roughness ≤ 0.15 + metalness ≥ 0.35; caucho → roughness 0.95.
  - Luces: Hemisphere 0.5 + key 2.2 con sombras PCFSoft + fill 0.5 + rim 1.0. ToneMapping ACES 1.15.
  - Decisión MCP `3d-assets`: se encontraron HDRIs "Car Showroom Studio" (Poly Haven CC0, BlenderKit Royalty Free) pero pesan GBs en 8K; se aproximan con RoomEnvironment + rig 3-point. Sin descargas, sin créditos adicionales.
- Encuadre automático: esfera de encaje (`Box3.getBoundingSphere`) con
  `distancia = radio / tan(fov/2) × 1.08`, objetivo en el centro de la esfera.
- Apoyo: `baseY = -box.min.y + 0.03` de holgura; el balanceo idle oscila
  `baseY → baseY + 0.016` (nunca bajo la base: corrección del bug que enterraba
  la van medio ciclo). Verificado con captura del MCP chrome-devtools.
- Fondo: `scene.background` negro puro + niebla negra (10–26) y plataforma de
  asfalto oscura (tinte `0x2e3136`, radio 11) que se funde al negro.
- Patrón MCP `brushstroke generate_scroll_animation`: keyframes con `easeInOutCubic`, muelle amortiguado para órbita, dolly-in de entrada con `easeOutBack`, cámara que sube con el scroll. Todo interrumpible por drag.
- Rendimiento: `pixelRatio ≤ 1.75` (1.5 en móvil), sombras 1024 en móvil, partículas desactivadas en móvil, pausa cuando el canvas sale de pantalla o la pestaña se oculta, `prefers-reduced-motion` sin giro ni balanceo, `GLTFLoader` con progreso y fallback fotográfico si falla WebGL o la red.
- Fallback: foto real `/tours/wa-bus-01.jpg` + `MountainScene`/`VanScene` procedural conservados para compatibilidad de imports.
- Accesibilidad: canvas focuseable con `role="img"`, flechas ← → ↑ ↓ para girar, +/− para zoom, botones de vista con `aria-pressed`.
