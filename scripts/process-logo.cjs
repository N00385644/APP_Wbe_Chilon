// Procesa img/descargar.png (logo Chilón sobre fondo negro) ->
// public/logo-chilon.png (fondo transparente, 2x, bordes suavizados) +
// public/favicon-chilon.png (192px). Solo usa pngjs (sin binarios).
const fs = require('fs');
const { PNG } = require('pngjs');

const SRC = 'img/descargar.png';
const OUT = 'public/logo-chilon.png';
const FAV = 'public/favicon-chilon.png';

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H, data } = src;

// 1. Key-out del negro con feather + despill suave.
const out = Buffer.alloc(data.length);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const l = Math.max(r, g, b);
  let a;
  if (l <= 14) a = 0;
  else if (l >= 52) a = 255;
  else a = Math.round(255 * ((l - 14) / (52 - 14)));
  const a01 = a / 255;
  // Descontamina el halo oscuro del borde (unblend parcial, capado).
  let nr = r, ng = g, nb = b;
  if (a01 > 0 && a01 < 1) {
    const k = Math.min(1 / Math.max(a01, 0.25), 1.9);
    nr = Math.min(255, Math.round(r * k));
    ng = Math.min(255, Math.round(g * k));
    nb = Math.min(255, Math.round(b * k));
  }
  out[i * 4] = nr; out[i * 4 + 1] = ng; out[i * 4 + 2] = nb; out[i * 4 + 3] = a;
}

// 2. Trim de bordes totalmente transparentes.
let x0 = W, x1 = 0, y0 = H, y1 = 0, solid = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (out[(y * W + x) * 4 + 3] > 8) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    solid++;
  }
}
const tw = x1 - x0 + 1, th = y1 - y0 + 1;
console.log('trim:', tw + 'x' + th, 'pixeles solidos:', solid);

// 3. Bilinear RGBA a altura objetivo.
function resize(x0, y0, tw, th, dstH) {
  const dstW = Math.round((tw / th) * dstH);
  const png = new PNG({ width: dstW, height: dstH });
  const sx = tw / dstW, sy = th / dstH;
  const px = (x, y) => {
    x = Math.min(tw - 1, Math.max(0, x)); y = Math.min(th - 1, Math.max(0, y));
    const o = ((y0 + y) * W + (x0 + x)) * 4;
    return [out[o], out[o + 1], out[o + 2], out[o + 3]];
  };
  for (let y = 0; y < dstH; y++) for (let x = 0; x < dstW; x++) {
    const gx = (x + 0.5) * sx - 0.5, gy = (y + 0.5) * sy - 0.5;
    const fx = Math.max(0, Math.min(tw - 1.001, gx)), fy = Math.max(0, Math.min(th - 1.001, gy));
    const ix = Math.floor(fx), iy = Math.floor(fy), dx = fx - ix, dy = fy - iy;
    const c00 = px(ix, iy), c10 = px(ix + 1, iy), c01 = px(ix, iy + 1), c11 = px(ix + 1, iy + 1);
    const o = (y * dstW + x) * 4;
    for (let c = 0; c < 4; c++) {
      png.data[o + c] = Math.round(
        c00[c] * (1 - dx) * (1 - dy) + c10[c] * dx * (1 - dy) +
        c01[c] * (1 - dx) * dy + c11[c] * dx * dy);
    }
  }
  return png;
}

// 4. Logo grande con padding + favicon.
const big = resize(x0, y0, tw, th, 900);
const pad = Math.round(big.height * 0.05);
const framed = new PNG({ width: big.width + pad * 2, height: big.height + pad * 2 });
framed.data.fill(0);
for (let y = 0; y < big.height; y++)
  big.data.copy(framed.data, ((y + pad) * framed.width + pad) * 4, y * big.width * 4, (y + 1) * big.width * 4);
fs.writeFileSync(OUT, PNG.sync.write(framed));
const fav = resize(x0, y0, tw, th, 192);
fs.writeFileSync(FAV, PNG.sync.write(fav));
console.log('OK:', OUT, framed.width + 'x' + framed.height, '|', FAV);
