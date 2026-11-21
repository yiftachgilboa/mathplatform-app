/* kidodo — Soft Low-Poly engine. See art/README.md.
   World: x → right, y → away from the viewer, z → up. Orthographic camera tilted down by `a`.
   Usage: LP.useTheme('day'); const cam = LP.camera({ox, oy}); svg += LP.draw(LP.make.tree({x, y, seed}), cam) */
(function (root) {
  'use strict';

  // ---------- random (stable per seed) ----------
  function rng(seed) {
    let a = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- vectors ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // ---------- color ----------
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function rampAt(stops, t) {
    const n = stops.length - 1, x = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  }

  // ---------- materials & themes ----------
  // a material is a ramp dark → light; v = how much each facet wanders along it
  function material(stops, v) { return { stops: stops.map(hex2rgb), v: v == null ? 0.08 : v }; }
  const M = (s, v) => material(s, v);
  // a theme recolors every material + the sky. Objects never pick colors themselves.
  const themes = {
    day: {
      sky: ['#7fcad6', '#bfe8ec', '#e6f6f6'], fog: '#cfeef1', sun: '#fffdf2', glow: '#fff6d6', shadow: '#1f3d0c',
      mat: {
        grass: M(['#4f7d27', '#7fae33', '#a9cf47', '#d3ea7c'], .12), grassSide: M(['#3b6322', '#55852b', '#78a835'], .06),
        earth: M(['#4b3324', '#6b4a30', '#8e6440', '#b08257'], .10), stone: M(['#3b3631', '#5c544d', '#867d74', '#b0a79c', '#d4cdc3'], .09),
        leaf: M(['#46731f', '#76a62a', '#a2c93b', '#cfe56d'], .09), leafTeal: M(['#1f5a45', '#2f8064', '#4fa682', '#8fcfa6'], .09),
        leafYellow: M(['#6b7a1a', '#9aa82a', '#c8cf3e', '#ecea7a'], .09), autumn: M(['#7a2e1a', '#b4492a', '#de7a3a', '#f2b45e'], .1),
        pine: M(['#2f5a1c', '#4f8226', '#7aaa34', '#a9cc58'], .07), trunk: M(['#563823', '#7a5034', '#9f6c46'], .05),
        cloud: M(['#b9d0da', '#dcebf1', '#f7fbfd', '#ffffff'], .03), snow: M(['#a9bccb', '#d6e2eb', '#f1f6f9', '#ffffff'], .04),
        mountain: M(['#5b6f86', '#7d91a6', '#a3b5c6', '#c9d6e0'], .06),
      },
    },
    sunset: {
      sky: ['#5a3a6b', '#c45a6e', '#f6a96b'], fog: '#e98a74', sun: '#ffe2a0', glow: '#ffc27a', shadow: '#2a0f2a',
      mat: {
        grass: M(['#4a1f45', '#7a2f5a', '#b44a6c', '#e8806f'], .1), grassSide: M(['#38163a', '#5a2348', '#843359'], .06),
        earth: M(['#251230', '#3f1b42', '#622a55', '#8a3b64'], .1), stone: M(['#2e1838', '#4f2b55', '#7d4670', '#b36887', '#e0939a'], .08),
        leaf: M(['#3d1c44', '#68305c', '#a14a6e', '#dc7a72'], .09), leafTeal: M(['#2c1c48', '#4b2f68', '#76508a', '#a87aa6'], .09),
        leafYellow: M(['#5e2a3e', '#93404c', '#cf6a5a', '#f6a073'], .09), autumn: M(['#6b1f2c', '#a8333a', '#e0604a', '#ffa066'], .1),
        pine: M(['#26123a', '#41204f', '#683463', '#975075'], .07), trunk: M(['#2a1226', '#46203a', '#663048'], .05),
        cloud: M(['#b9586c', '#e47f78', '#f7ad84', '#ffd5a0'], .04), snow: M(['#a7637f', '#de8f99', '#ffc0a3', '#ffe0c0'], .04),
        mountain: M(['#3e2050', '#64356a', '#934f7c', '#c46f87'], .05),
      },
    },
    ice: {
      sky: ['#bcdcee', '#e3f0f8', '#f6fafc'], fog: '#e7f2f8', sun: '#ffffff', glow: '#ffffff', shadow: '#1d4566',
      mat: {
        grass: M(['#8db1ca', '#b7d2e5', '#dbeaf4', '#f7fbff'], .08), grassSide: M(['#5f8fb3', '#7eaacb', '#a3c6de'], .05),
        earth: M(['#1d4870', '#2c6593', '#4a89b6', '#7db0d4'], .09), stone: M(['#1f4d78', '#33709e', '#5c9bc3', '#a2cde4', '#d7eef7'], .08),
        leaf: M(['#25646f', '#388994', '#66b4b8', '#a9dcd8'], .09), leafTeal: M(['#1e5470', '#2f7896', '#57a2bd', '#9ccde0'], .09),
        leafYellow: M(['#3a6f80', '#5a96a3', '#8cc2c4', '#c6e6e2'], .09), autumn: M(['#2a5d86', '#4583ad', '#74afd0', '#b4dbee'], .1),
        pine: M(['#1a5263', '#2a7383', '#4f9ca4', '#8fcac8'], .07), trunk: M(['#28465f', '#3b617e', '#57809c'], .05),
        cloud: M(['#c3d9e7', '#e2eef6', '#f7fbfd', '#ffffff'], .03), snow: M(['#b4cfe2', '#dbeaf4', '#f3f8fc', '#ffffff'], .04),
        mountain: M(['#5d8fb4', '#82aecb', '#a9cbe0', '#d0e5f1'], .05),
      },
    },
  };
  themes.day.mat.cactus = M(['#1d4f34', '#2c7446', '#46a05a', '#86cc72'], .06);
  themes.sunset.mat.cactus = M(['#2a1640', '#4a2556', '#7a3a66', '#b05a74'], .06);
  themes.ice.mat.cactus = M(['#1d5468', '#2c7790', '#4f9fb6', '#94cfe0'], .06);
  // desert: sand instead of grass, warm red earth, purple shadows (ref 20)
  themes.desert = {
    sky: ['#2a8f9a', '#9fd6c6', '#f6e6b0'], fog: '#f1dcaa', sun: '#fff6d8', glow: '#ffe7a8', shadow: '#5a2450',
    mat: Object.assign({}, themes.day.mat, {
      grass: M(['#b56f34', '#d9944c', '#efb86c', '#fbdb9a'], .1), grassSide: M(['#93522a', '#b46a34', '#d18a48'], .06),
      earth: M(['#5e261c', '#8c3f28', '#b85d36', '#d98652'], .1), stone: M(['#5e3c4a', '#8a5d62', '#b78676', '#dcb196', '#f3d6bb'], .08),
      leaf: M(['#475518', '#6c7f26', '#94a63a', '#c2cd68'], .09), pine: M(['#344516', '#566b22', '#7c9132', '#a8b95a'], .07),
      cloud: M(['#e6cfa6', '#f6e6c8', '#fff7e8', '#ffffff'], .03), snow: M(['#e0c08e', '#f2dcb4', '#fbefd8', '#ffffff'], .04),
      mountain: M(['#9a4630', '#c46a3c', '#e29356', '#f5be86'], .06), cactus: M(['#1d4f34', '#2c7446', '#46a05a', '#86cc72'], .06),
    }),
  };
  // characters keep their colors in every theme (identity), so they live outside the themes
  const charMat = {
    skin: M(['#b9774f', '#dc9b70', '#f2bb92', '#ffd8b4'], .03), hair: M(['#24170f', '#3e2a1d', '#5e4130', '#7f5a42'], .05),
    shirt: M(['#8f1c22', '#cf3535', '#ef5c55', '#ff8d80'], .04), pants: M(['#1c3768', '#2b5398', '#4776c0', '#78a2dd'], .04),
    shoe: M(['#25282d', '#3f444c', '#666c75'], .03),
    // game objects are recognizable things (gold is gold), so they stay fixed too
    wood: M(['#5a3a1f', '#86582f', '#ad7a45', '#d3a26a'], .06), woodInner: M(['#2e1c0f', '#462c18', '#5f3d22'], .04),
    metal: M(['#43484f', '#6d757f', '#9fa8b2', '#d3d9df'], .04), gold: M(['#8a5a0a', '#cf981b', '#f1c43e', '#fff0a0'], .03),
    starOff: M(['#7d858c', '#a6adb3', '#cdd2d6', '#eceff1'], .03),
    gemBlue: M(['#123c7a', '#2a6fd1', '#5aa2f0', '#bfe3ff'], .04), gemRed: M(['#6e0f24', '#c2223f', '#f0566d', '#ffc2cb'], .04),
    gemGreen: M(['#0e5a3a', '#1f9a5f', '#4fd08c', '#c4f5d9'], .04),
    woodEnd: M(['#a8733f', '#cf9c62', '#ebc48a', '#f8dfb0'], .05), petal: M(['#c2410c', '#ea6a1a', '#f79a2e', '#ffd166'], .07),
    // animals and creatures (identity colors)
    dark: M(['#1c1d21', '#2f3137', '#474a52'], .03), white: M(['#b9bec4', '#dcdfe3', '#f2f4f6', '#ffffff'], .03),
    pink: M(['#c77c86', '#e8a0aa', '#f7c4ca'], .03), beak: M(['#9a5a0e', '#d48a1e', '#f2b544'], .03),
    bearFur: M(['#3b2416', '#5e3a22', '#87573a', '#b07b55'], .06), bearLight: M(['#9a7a5a', '#c8a47c', '#e6c9a0', '#f6e2c2'], .05),
    foxFur: M(['#8a3412', '#c9531c', '#ee7a32', '#ffad66'], .06), rabbitFur: M(['#6b5442', '#94765e', '#b89a80', '#d9bfa5'], .06),
    birdBlue: M(['#173c78', '#2563b0', '#3f86d6', '#86c4f2'], .07), birdBelly: M(['#c06a1c', '#e8902e', '#f6b356', '#ffd690'], .05),
    monster: M(['#2f1846', '#52287a', '#7a42a8', '#a874d1'], .07), monsterBelly: M(['#5b7a12', '#86a822', '#b2cf3a', '#dcef7a'], .05),
    horn: M(['#8a7a5c', '#bfae88', '#e6d9b8', '#fbf3dc'], .04),
    robe: M(['#2c1a52', '#46297e', '#6a44b0', '#9a78dc'], .05),
    buddy: M(['#9c1d24', '#d63a3a', '#f05a50', '#ff8c7e'], .05), buddyFace: M(['#e58a74', '#f8b49c', '#ffd3c0', '#ffeae0'], .03),
    alien: M(['#17603a', '#249050', '#43bb6c', '#8fe39f'], .06), alienBelly: M(['#5aa86a', '#8fd09a', '#bfe9c4', '#e6f8e8'], .04),
  };
  const mat = {};
  let theme = themes.day;
  function useTheme(name) { theme = themes[name] || themes.day; Object.assign(mat, charMat, theme.mat); LP.theme = theme; return theme; }

  // ---------- mesh ----------
  function Mesh(m, seed) { this.v = []; this.f = []; this.mat = m; this.seed = seed || 1; this.center = null; this.snow = null; }
  Mesh.prototype.add = function (p) { this.v.push(p); return this.v.length - 1; };
  Mesh.prototype.tri = function (a, b, c, m) { this.f.push([a, b, c, m]); return this; };
  Mesh.prototype.map = function (fn) { this.v = this.v.map(fn); if (this.center) this.center = fn(this.center); return this; };
  Mesh.prototype.scale = function (x, y, z) { if (y == null) y = z = x; return this.map(p => [p[0] * x, p[1] * y, p[2] * z]); };
  Mesh.prototype.move = function (x, y, z) {
    if (this.snow) this.snow.z += (z || 0);
    if (this.bands) this.bands.forEach(b => { b.z += (z || 0); });
    return this.map(p => [p[0] + x, p[1] + y, p[2] + (z || 0)]);
  };
  Mesh.prototype.rotZ = function (t) {
    const c = Math.cos(t), s = Math.sin(t), R = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
    if (this.patch) this.patch.dir = R(this.patch.dir);
    return this.map(R);
  };
  Mesh.prototype.jitter = function (amt, rand) { return this.map(p => [p[0] + (rand() - .5) * 2 * amt, p[1] + (rand() - .5) * 2 * amt, p[2] + (rand() - .5) * 2 * amt]); };
  Mesh.prototype.floor = function (z) { return this.map(p => [p[0], p[1], Math.max(z, p[2])]); }; // flat bottom
  Mesh.prototype.minZ = function () { return Math.min.apply(null, this.v.map(p => p[2])); };

  // unit icosphere, detail 0 → 20 faces, 1 → 80, 2 → 320
  const ICO_V = (() => { const t = (1 + Math.sqrt(5)) / 2; return [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm); })();
  const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  function icosphere(detail, m, seed) {
    const mesh = new Mesh(m, seed);
    ICO_V.forEach(p => mesh.add(p.slice()));
    let faces = ICO_F;
    for (let d = 0; d < detail; d++) {
      const cache = {}, nf = [];
      const mid = (a, b) => {
        const k = a < b ? a + '_' + b : b + '_' + a;
        if (cache[k] == null) { const p = mesh.v[a], q = mesh.v[b]; cache[k] = mesh.add(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2])); }
        return cache[k];
      };
      faces.forEach(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); });
      faces = nf;
    }
    faces.forEach(f => mesh.tri(f[0], f[1], f[2]));
    return mesh;
  }

  // ring of vertices (ellipse), returns ids + unwrapped angles for stitching
  function ring(mesh, n, o, rand) {
    const ids = [], ang = [], r = () => (rand ? rand() - .5 : 0);
    for (let i = 0; i < n; i++) {
      const a = (i + (o.off || 0)) / n * Math.PI * 2 + r() * (o.ja || 0) * Math.PI * 2 / n;
      const R = o.r * (1 + r() * 2 * (o.jr || 0));
      ids.push(mesh.add([Math.cos(a) * R * (o.rx || 1) + (o.x || 0), Math.sin(a) * R * (o.ry || 1) + (o.y || 0), o.z + r() * 2 * (o.jz || 0)]));
      ang.push(a);
    }
    return { ids, ang };
  }
  // triangulate the band between two rings (any vertex counts)
  function stitch(mesh, A, B, m) {
    const nA = A.ids.length, nB = B.ids.length, T = Math.PI * 2;
    const aA = A.ang.concat([A.ang[0] + T]), aB = B.ang.concat([B.ang[0] + T]);
    let i = 0, j = 0;
    while (i < nA || j < nB) {
      if (j >= nB || (i < nA && aA[i + 1] <= aB[j + 1])) { mesh.tri(A.ids[i % nA], A.ids[(i + 1) % nA], B.ids[j % nB], m); i++; }
      else { mesh.tri(A.ids[i % nA], B.ids[(j + 1) % nB], B.ids[j % nB], m); j++; }
    }
  }
  function fan(mesh, c, A, m) { const n = A.ids.length; for (let i = 0; i < n; i++) mesh.tri(c, A.ids[i], A.ids[(i + 1) % n], m); }

  // unit cone: base r=1 at z=0, apex at z=1 (a mid ring gives it more facets)
  function cone(n, m, seed, rand, midR) {
    const mesh = new Mesh(m, seed);
    const base = ring(mesh, n, { r: 1, z: 0, jr: .08, ja: .3 }, rand);
    const mid = ring(mesh, n, { r: midR || .58, z: .42, off: .5, jr: .1, ja: .3 }, rand);
    const apex = mesh.add([(rand() - .5) * .08, (rand() - .5) * .08, 1]);
    const bc = mesh.add([0, 0, 0]);
    stitch(mesh, base, mid); fan(mesh, apex, mid); fan(mesh, bc, base);
    return mesh;
  }
  // unit cylinder z 0 → 1, radius 1 at bottom, `top` at the top
  function cylinder(n, top, m, seed, capMat) {
    const mesh = new Mesh(m, seed);
    const A = ring(mesh, n, { r: 1, z: 0 }), B = ring(mesh, n, { r: top, z: 1, off: .5 });
    stitch(mesh, A, B); fan(mesh, mesh.add([0, 0, 1]), B, capMat); fan(mesh, mesh.add([0, 0, 0]), A, capMat);
    return mesh;
  }
  // a tapered branch from p0 to p1 (n sides; capMat colors the two ends, e.g. a cut log)
  function limb(p0, p1, r0, r1, m, seed, n, capMat) {
    const d = sub(p1, p0), L = len(d), dir = norm(d);
    const up = Math.abs(dir[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(dir, up)), v = cross(dir, u);
    return cylinder(n || 5, r1 / r0, m, seed, capMat).map(p => [
      p0[0] + dir[0] * L * p[2] + (u[0] * p[0] + v[0] * p[1]) * r0,
      p0[1] + dir[1] * L * p[2] + (u[1] * p[0] + v[1] * p[1]) * r0,
      p0[2] + dir[2] * L * p[2] + (u[2] * p[0] + v[2] * p[1]) * r0]);
  }

  // ---------- camera & light ----------
  function camera(o) {
    o = o || {};
    const az = (o.lightAz == null ? 204 : o.lightAz) * Math.PI / 180, el = (o.lightEl == null ? 38 : o.lightEl) * Math.PI / 180;
    return {
      a: o.a == null ? 0.42 : o.a, s: o.s || 1, ox: o.ox || 0, oy: o.oy || 0,
      L: norm([Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]),
      vary: o.vary == null ? 1 : o.vary, ambient: o.ambient == null ? 0.12 : o.ambient,
      contrast: o.contrast == null ? 1.3 : o.contrast,
      fogColor: hex2rgb(o.fogColor || theme.fog),
    };
  }
  function project(p, cam) {
    const sa = Math.sin(cam.a), ca = Math.cos(cam.a);
    return [cam.ox + p[0] * cam.s, cam.oy - (p[1] * sa + p[2] * ca) * cam.s, -p[1] * ca + p[2] * sa];
  }

  // ---------- render ----------
  // obj = { meshes, fog?, ordered? }  →  list of {pts, depth, fill}
  // ordered: draw mesh after mesh (for parts that sit on each other, like pine tiers); otherwise one depth sort
  function facets(obj, cam) {
    const out = [], toCam = [0, -Math.cos(cam.a), Math.sin(cam.a)];
    const centerOf = mesh => {
      if (mesh.center) return mesh.center;
      const c = [0, 0, 0]; mesh.v.forEach(p => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
      return c.map(x => x / mesh.v.length);
    };
    let meshes = obj.meshes;
    // 'depth': whole parts sorted by their center (characters: arm behind / in front of the body); bias nudges a part
    // group: a limb chain (upper, lower, foot, joint covers) sorts as one unit (by its nearest part) and draws
    // in its own order, so a joint cover always sits on top of the connection, whichever way the limb points
    if (obj.ordered === 'depth') {
      const items = meshes.map(m => ({ m, d: project(centerOf(m), cam)[2] + (m.bias || 0) })), gk = {};
      items.forEach(x => { const g = x.m.group; if (g != null) gk[g] = Math.max(gk[g] == null ? -Infinity : gk[g], x.d); });
      // a held object (and its arm) goes in front of the head, hat and every item, when that arm is on the near side
      if (obj.front && gk[obj.front.group] != null && gk[obj.front.group] >= project(centerOf(obj.front.ref), cam)[2] - (obj.front.margin || 0)) gk[obj.front.group] = Infinity;
      items.forEach(x => { x.k = x.m.group != null ? gk[x.m.group] : x.d; });
      meshes = items.sort((a, b) => a.k - b.k || (a.m.order || 0) - (b.m.order || 0)).map(x => x.m);
    }
    meshes.forEach(mesh => {
      const m = mesh.mat, rand = rng(mesh.seed * 7919 + 17), part = [];
      const c = centerOf(mesh);
      mesh.f.forEach(f => {
        const jit = rand(); // drawn for every face so variation stays stable when culling changes
        const p0 = mesh.v[f[0]], p1 = mesh.v[f[1]], p2 = mesh.v[f[2]];
        let n = cross(sub(p1, p0), sub(p2, p0));
        if (len(n) < 1e-9) return;
        n = norm(n);
        const cen = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, (p0[2] + p1[2] + p2[2]) / 3];
        if (dot(n, sub(cen, c)) < 0) n = [-n[0], -n[1], -n[2]];
        if (dot(n, toCam) <= 0.002) return; // back face
        let fm = f[3] || m;
        if (mesh.snow && cen[2] > mesh.snow.z && n[2] > .15) fm = mat.snow; // snow sits on upward faces above the line
        if (mesh.patch && dot(n, mesh.patch.dir) > mesh.patch.th) fm = mesh.patch.mat; // color patch by region (belly, chest, tail tip)
        if (mesh.bands) for (const b of mesh.bands) if (cen[2] < b.z) { fm = b.mat; break; } // clothes as height bands (lowest first)
        const lam = dot(n, cam.L);
        let t = cam.ambient + (1 - cam.ambient) * Math.max(0, Math.min(1, 0.5 + 0.5 * cam.contrast * lam));
        t += (jit - .5) * 2 * fm.v * cam.vary;
        let col = rampAt(fm.stops, t);
        if (obj.fog) col = mix(col, cam.fogColor, obj.fog);
        const q = [project(p0, cam), project(p1, cam), project(p2, cam)];
        part.push({ pts: q, depth: project(cen, cam)[2], fill: rgb2hex(col) });
      });
      if (obj.ordered) part.sort((a, b) => a.depth - b.depth);
      out.push.apply(out, part);
    });
    if (!obj.ordered) out.sort((a, b) => a.depth - b.depth);
    return out;
  }
  function polys(list) {
    return list.map(p => {
      const pts = p.pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
      return `<polygon points="${pts}" fill="${p.fill}" stroke="${p.fill}" stroke-width=".7" stroke-linejoin="round"/>`;
    }).join('');
  }
  function draw(obj, cam) { return polys(facets(obj, cam)); }
  function bounds(list) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach(p => p.pts.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function hull(pts) { // monotone chain, 2D
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // cast shadow: every mesh is flattened onto the ground along the light. Returns polygons (draw them in one
  // group with opacity so overlaps don't get darker).
  function castShadow(obj, cam) {
    const g = obj.z || 0, L = cam.L, k = Math.max(.35, L[2]);
    return obj.meshes.map(mesh => {
      const pts = mesh.v.filter(p => p[2] >= g - 1).map(p => {
        const h = (p[2] - g) / k;
        const q = project([p[0] - L[0] * h, p[1] - L[1] * h, g], cam);
        return [q[0], q[1]];
      });
      const hp = hull(pts);
      return hp.length > 2 ? `<polygon points="${hp.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}"/>` : '';
    }).join('');
  }
  // outline of a set of 3D points on screen (used to clip shadows to the island top)
  function outline(points, cam) { return points.map(p => { const q = project(p, cam); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }

  // ---------- objects (the library starts here) ----------
  const clampD = d => Math.max(0, Math.min(2, d | 0));
  function place(meshes, o, r, extra) {
    meshes.forEach(m => { m.rotZ(o.rot || 0).move(o.x || 0, o.y || 0, o.z || 0); });
    return Object.assign({ meshes, x: o.x || 0, y: o.y || 0, z: o.z || 0, r, fog: o.fog || 0 }, extra);
  }
  const LEAVES = ['leaf', 'leaf', 'leafTeal', 'leafYellow', 'leaf'];
  const make = {
    // boulder with a flat bottom; o.h = height ratio
    rock(o) {
      const S = o.size || 100, rand = rng(o.seed || 1);
      const m = icosphere(clampD(o.detail == null ? 0 : o.detail), o.mat || mat.stone, (o.seed || 1) * 3 + 1).jitter(.26, rand);
      m.scale(1, .85 + rand() * .2, o.h || .8).floor(-.25 * (o.h || .8));
      m.move(0, 0, -m.minZ()).scale(S / 2);
      return place([m], Object.assign({ rot: rand() * 6.28 }, o), S * .5);
    },
    // broadleaf tree. kind: round | tall | umbrella | branches (random by seed if not given)
    tree(o) {
      const S = o.size || 200, seed = o.seed || 1, rand = rng(seed), d = clampD(o.detail == null ? 1 : o.detail);
      const kind = o.kind || ['round', 'tall', 'umbrella', 'branches'][Math.floor(rand() * 4)];
      const leaf = o.mat || mat[LEAVES[Math.floor(rand() * LEAVES.length)]];
      const blob = (k, sx, sy, sz, x, y, z, j) => icosphere(d, leaf, seed * 5 + k).jitter(j || .14, rand).scale(sx, sy, sz).move(x, y, z);
      const meshes = [];
      if (kind === 'bare') { // branches only, forking 3 times (ref 26)
        const grow = (p, dir, L, r, depth) => {
          const q = [p[0] + dir[0] * L, p[1] + dir[1] * L, p[2] + dir[2] * L];
          meshes.push(limb(p, q, r, r * .68, mat.trunk, seed * 5 + meshes.length));
          if (!depth) return;
          const n = 2 + (rand() < .35 ? 1 : 0), a0 = rand() * 6.28;
          for (let i = 0; i < n; i++) {
            const a = a0 + i / n * 6.28, spread = .55 + rand() * .3;
            grow(q, norm([dir[0] + Math.cos(a) * spread, dir[1] + Math.sin(a) * spread * .7, dir[2] + .25]), L * (.62 + rand() * .12), r * .66, depth - 1);
          }
        };
        grow([0, 0, 0], [0, 0, 1], S * .38, S * .055, 3);
        return place(meshes, Object.assign({ rot: rand() * 6.28 }, o), S * .12, { ordered: true, kind });
      }
      if (kind === 'tall') {
        meshes.push(limb([0, 0, 0], [0, 0, S * .4], S * .045, S * .03, mat.trunk, seed * 5));
        meshes.push(blob(2, S * .17, S * .17, S * .4, 0, 0, S * .6, .12));
      } else if (kind === 'umbrella') {
        const fx = (rand() < .5 ? -1 : 1) * S * .16;
        meshes.push(limb([0, 0, 0], [0, 0, S * .4], S * .045, S * .035, mat.trunk, seed * 5));
        meshes.push(limb([0, 0, S * .38], [fx, -S * .02, S * .62], S * .03, S * .018, mat.trunk, seed * 5 + 1));
        meshes.push(limb([0, 0, S * .38], [-fx * .7, S * .02, S * .6], S * .03, S * .018, mat.trunk, seed * 5 + 7));
        meshes.push(blob(2, S * .42, S * .32, S * .15, 0, 0, S * .68, .12));
      } else if (kind === 'branches') {
        meshes.push(limb([0, 0, 0], [0, 0, S * .5], S * .045, S * .025, mat.trunk, seed * 5));
        const n = 3 + Math.floor(rand() * 2), tips = [];
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.28 + rand(), r = S * (.14 + rand() * .08), z = S * (.45 + rand() * .2);
          const tip = [Math.cos(a) * r, Math.sin(a) * r * .7, z];
          meshes.push(limb([0, 0, S * (.25 + i * .07)], tip, S * .022, S * .012, mat.trunk, seed * 5 + 10 + i));
          tips.push(tip);
        }
        tips.forEach((t, i) => meshes.push(blob(20 + i, S * .15, S * .14, S * .12, t[0], t[1], t[2] + S * .04)));
        meshes.push(blob(30, S * .17, S * .16, S * .15, 0, 0, S * .72));
      } else { // round
        meshes.push(limb([0, 0, 0], [0, 0, S * .5], S * .05, S * .03, mat.trunk, seed * 5));
        meshes.push(blob(2, S * .3, S * .27, S * .27, 0, 0, S * .66));
        if (rand() < .7) meshes.push(blob(3, S * .19, S * .19, S * .19, (rand() < .5 ? -1 : 1) * S * .2, -S * .04, S * .52, .16));
      }
      return place(meshes, Object.assign({ rot: rand() * 6.28 }, o), S * .3, { ordered: true, kind });
    },
    // conifer made of stacked tiers
    pine(o) {
      const S = o.size || 220, seed = o.seed || 1, rand = rng(seed), tiers = o.tiers || 3, n = 6 + (o.detail || 0) * 2;
      const meshes = [limb([0, 0, 0], [0, 0, S * .16], S * .035, S * .03, mat.trunk, seed * 7)];
      for (let i = 0; i < tiers; i++) {
        const k = i / tiers, r = S * .2 * (1 - k * .62), h = S * (.42 - k * .12), z = S * (.1 + k * .62);
        meshes.push(cone(n, o.mat || mat.pine, seed * 7 + 1 + i, rand, .45).scale(r, r, h).rotZ(rand() * 6.28).move(0, 0, z));
      }
      return place(meshes, Object.assign({ rot: rand() * 6.28 }, o), S * .16, { ordered: true });
    },
    bush(o) {
      const S = o.size || 50, rand = rng(o.seed || 1);
      const m = icosphere(clampD(o.detail || 0), o.mat || mat[LEAVES[Math.floor(rand() * LEAVES.length)]], (o.seed || 1) * 11).jitter(.18, rand).scale(1, .9, .7).floor(-.3);
      m.move(0, 0, -m.minZ()).scale(S / 2);
      return place([m], Object.assign({ rot: rand() * 6.28 }, o), S * .45);
    },
    // flat-bottomed puffy cloud
    cloud(o) {
      const S = o.size || 160, rand = rng(o.seed || 1), n = 3 + Math.floor(rand() * 2), meshes = [];
      for (let i = 0; i < n; i++) {
        const k = 1 - Math.abs(i - (n - 1) / 2) / n;
        const m = icosphere(clampD(o.detail || 0), mat.cloud, (o.seed || 1) * 13 + i).jitter(.12, rand).floor(-.35);
        m.scale(S * .22 * (.7 + k * .6)).move((i - (n - 1) / 2) * S * .22, (rand() - .5) * S * .1, 0);
        meshes.push(m);
      }
      return place(meshes, o, 0);
    },
    // a row of mountain peaks (background). o.width, o.h, o.count, o.snow (0..1 of height, false = none)
    ridge(o) {
      const W = o.width || 1400, H = o.h || 260, n = o.count || 6, rand = rng(o.seed || 1), meshes = [];
      for (let i = 0; i < n; i++) {
        const w = W / n * (.75 + rand() * .6), h = H * (.55 + rand() * .45);
        const m = cone(5, o.mat || mat.mountain, (o.seed || 1) * 19 + i, rand, .55).scale(w * .95, w * .4, h);
        m.rotZ(rand() * 6.28);
        if (o.snow !== false) m.snow = { z: h * (o.snow || .62) };
        m.move(-W / 2 + (i + .5) * W / n + (rand() - .5) * W / n * .4, (rand() - .5) * 60, 0);
        meshes.push(m);
      }
      meshes.sort((a, b) => b.v[0][1] - a.v[0][1]);
      return place(meshes, o, 0, { ordered: true });
    },
    // floating island: grass top, grass lip, earth cone below. obj.top = rim points (to clip shadows)
    island(o) {
      const rx = o.rx || 360, ry = o.ry || 210, H = o.depth || 320, rand = rng(o.seed || 1);
      const m = new Mesh(mat.earth, (o.seed || 1) * 17);
      m.center = [0, 0, -H * .3];
      const top = ring(m, 7, { r: .5, rx, ry, z: 0, jr: .15, ja: .5, jz: 5 }, rand);
      const rim = ring(m, 20, { r: 1, rx, ry, z: 0, jr: .045, ja: .4, jz: 3 }, rand);
      const lip = ring(m, 20, { r: .985, rx, ry, z: -H * .055, off: .5, jr: .04, ja: .3, jz: 3 }, rand);
      const r1 = ring(m, 15, { r: .86, rx, ry, z: -H * .27, jr: .06, ja: .5, jz: 10 }, rand);
      const r2 = ring(m, 10, { r: .58, rx, ry, z: -H * .55, off: .3, jr: .1, ja: .5, jz: 14 }, rand);
      const r3 = ring(m, 6, { r: .28, rx, ry, x: rx * .05, z: -H * .82, jr: .15, ja: .4, jz: 12 }, rand);
      const apex = m.add([rx * (.06 + (rand() - .5) * .08), ry * (rand() - .5) * .1, -H]);
      fan(m, m.add([0, 0, 2]), top, mat.grass);
      stitch(m, top, rim, mat.grass);
      stitch(m, rim, lip, mat.grassSide);
      stitch(m, lip, r1); stitch(m, r1, r2); stitch(m, r2, r3); fan(m, apex, r3);
      const obj = place([m], o, 0);
      obj.top = rim.ids.map(i => m.v[i]);
      return obj;
    },
  };

  // ---------- game objects ----------
  // "pillow" box: every side gets a center point pushed out a little → 4 soft facets per side instead of a flat square
  function box(w, d, h, m, seed, bulge) {
    const mesh = new Mesh(m, seed), b = (bulge == null ? .06 : bulge) * Math.min(w, d, h);
    const X = [-w / 2, w / 2], Y = [-d / 2, d / 2], Z = [0, h], c = {};
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) c[i + '' + j + k] = mesh.add([X[i], Y[j], Z[k]]);
    const side = (a, b2, c2, d2, n) => {
      const ps = [a, b2, c2, d2].map(i => mesh.v[i]);
      const cc = mesh.add([(ps[0][0] + ps[2][0]) / 2 + n[0] * b, (ps[0][1] + ps[2][1]) / 2 + n[1] * b, (ps[0][2] + ps[2][2]) / 2 + n[2] * b]);
      [a, b2, c2, d2].forEach((v, i, arr) => mesh.tri(cc, v, arr[(i + 1) % 4]));
    };
    side(c['000'], c['100'], c['110'], c['010'], [0, 0, -1]); side(c['001'], c['101'], c['111'], c['011'], [0, 0, 1]);
    side(c['000'], c['100'], c['101'], c['001'], [0, -1, 0]); side(c['010'], c['110'], c['111'], c['011'], [0, 1, 0]);
    side(c['000'], c['010'], c['011'], c['001'], [-1, 0, 0]); side(c['100'], c['110'], c['111'], c['101'], [1, 0, 0]);
    mesh.center = [0, 0, h / 2];
    return mesh;
  }
  // chest lid: a half-round prism along x, sitting on z = 0 between y = ±d/2, height lh
  function lidPrism(w, d, lh, n, m, seed, under) {
    const mesh = new Mesh(m, seed), L = [], R = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n * Math.PI, y = d / 2 * Math.cos(t), z = lh * Math.sin(t);
      L.push(mesh.add([-w / 2, y, z])); R.push(mesh.add([w / 2, y, z]));
    }
    for (let k = 0; k < n; k++) { mesh.tri(L[k], R[k], R[k + 1]); mesh.tri(L[k], R[k + 1], L[k + 1]); }
    const cl = mesh.add([-w / 2, 0, 0]), cr = mesh.add([w / 2, 0, 0]);
    for (let k = 0; k < n; k++) { mesh.tri(cl, L[k], L[k + 1]); mesh.tri(cr, R[k + 1], R[k]); }
    mesh.tri(L[0], R[0], R[n], under); mesh.tri(L[0], R[n], L[n], under); // underside (seen when open)
    mesh.center = [0, 0, lh * .4];
    return mesh;
  }
  const hingeX = (mesh, yh, zh, phi) => mesh.map(p => {
    const dy = p[1] - yh, dz = p[2] - zh, c = Math.cos(phi), s = Math.sin(phi);
    return [p[0], yh + dy * c + dz * s, zh - dy * s + dz * c];
  });
  // standing disc facing the viewer (−y), axis along y; bottom at z = 0
  function disc(r, t, n, m, seed, emboss) {
    const mesh = new Mesh(m, seed);
    const mk = (rr, y) => { const ids = [], ang = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ids.push(mesh.add([Math.cos(a) * rr, y, Math.sin(a) * rr + r])); ang.push(a); } return { ids, ang }; };
    const back = mk(r, t / 2), front = mk(r, -t / 2), inner = mk(r * .72, -t / 2 - r * .03);
    stitch(mesh, back, front); stitch(mesh, front, inner);
    fan(mesh, mesh.add([0, -t / 2 - r * (emboss || .12), r]), inner);
    fan(mesh, mesh.add([0, t / 2 + r * .06, r]), back);
    mesh.center = [0, 0, r];
    return mesh;
  }
  Object.assign(make, {
    // treasure chest. o.open = lid angle in radians (0 closed, ~2 wide open)
    chest(o) {
      const S = o.size || 120, seed = o.seed || 1, w = S, d = S * .62, h = S * .5, lh = S * .26, phi = o.open || 0;
      const meshes = [box(w, d, h, mat.wood, seed * 41, .08)];
      [-1, 1].forEach((s, i) => { const b = box(w * .09, d * 1.04, h * 1.02, mat.metal, seed * 41 + 1 + i, .04).move(s * w * .32, 0, 0); b.bias = S; meshes.push(b); });
      const lid = hingeX(lidPrism(w * 1.02, d * 1.02, lh, 4, mat.wood, seed * 41 + 3, mat.woodInner).move(0, 0, h), d * .51, h, phi);
      meshes.push(lid);
      [-1, 1].forEach((s, i) => {
        const band = hingeX(lidPrism(w * .09, d * 1.06, lh * 1.05, 4, mat.metal, seed * 41 + 4 + i).move(s * w * .32, 0, h), d * .53, h, phi);
        band.bias = S * 2; meshes.push(band);
      });
      if (phi > .3) { // gold heap inside
        const heap = icosphere(1, mat.gold, seed * 41 + 6).jitter(.08, rng(seed)).scale(w * .42, d * .38, h * .3).floor(-.1 * h);
        heap.move(0, 0, h * .9); meshes.push(heap);
      } else {
        const lock = box(w * .12, d * .08, h * .22, mat.gold, seed * 41 + 7, .1).move(0, -d * .52, h * .72); lock.bias = S * 2; meshes.push(lock);
      }
      return place(meshes, o, S * .45, { ordered: 'depth' });
    },
    // gold coin standing up; o.rot spins it around the vertical axis
    coin(o) {
      const S = o.size || 40;
      return place([disc(S / 2, S * .14, 10, o.mat || mat.gold, (o.seed || 1) * 43)], o, S * .3);
    },
    // five-point star, faceted from a front and back apex. o.on = false → grey (rating not earned)
    star(o) {
      const S = o.size || 60, R = S / 2, D = S * .17, m = o.mat || (o.on === false ? mat.starOff : mat.gold);
      const mesh = new Mesh(m, (o.seed || 1) * 47), ring = [];
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .47 : R; ring.push(mesh.add([Math.cos(a) * r, 0, Math.sin(a) * r + R])); }
      const f = mesh.add([0, -D, R]), b = mesh.add([0, D, R]);
      for (let i = 0; i < 10; i++) { mesh.tri(f, ring[i], ring[(i + 1) % 10]); mesh.tri(b, ring[(i + 1) % 10], ring[i]); }
      mesh.center = [0, 0, R];
      return place([mesh], o, S * .3);
    },
    // cut gem (crown + pointed pavilion). o.color: blue | red | green
    gem(o) {
      const S = o.size || 50, m = o.mat || mat['gem' + ({ red: 'Red', green: 'Green' }[o.color] || 'Blue')];
      const mesh = new Mesh(m, (o.seed || 1) * 53), n = 6;
      const table = ring(mesh, n, { r: .55, z: .3, off: .5 }), girdle = ring(mesh, n, { r: 1, z: 0 });
      fan(mesh, mesh.add([0, 0, .3]), table); stitch(mesh, table, girdle); fan(mesh, mesh.add([0, 0, -1.1]), girdle);
      mesh.scale(S / 2).move(0, 0, S * .55); mesh.center = [0, 0, S * .5];
      return place([mesh], Object.assign({ rot: .3 }, o), S * .3);
    },
    // wooden plank of n units, unit seams visible (a number you can count). o.unit = size of one unit
    plank(o) {
      const n = o.n || 3, u = o.unit || 40, meshes = [];
      for (let i = 0; i < n; i++) {
        const b = box(u * .96, u * .62, u * .3, o.mat || mat.wood, (o.seed || 1) * 59 + i, .1).move((i - (n - 1) / 2) * u, 0, 0);
        meshes.push(b);
      }
      return place(meshes, o, 0, { ordered: 'depth', n, unit: u });
    },
  });

  // ---------- more world objects (round 3) ----------
  Object.assign(make, {
    // saguaro cactus: ribbed trunk + arms that bend up (ref 20). o.arms = 0..3
    cactus(o) {
      const S = o.size || 160, seed = o.seed || 1, rand = rng(seed), arms = o.arms == null ? 1 + Math.floor(rand() * 3) : o.arms;
      const m = mat.cactus, r = S * .085, meshes = [];
      const tip = (x, y, z, rr, k) => cone(7, m, seed * 61 + k, rand, .75).scale(rr, rr, rr * 1.3).move(x, y, z);
      meshes.push(limb([0, 0, 0], [0, 0, S * .8], r, r * .92, m, seed * 61, 7), tip(0, 0, S * .8, r * .92, 1));
      for (let i = 0; i < arms; i++) {
        const a = (i % 2 ? Math.PI : 0) + (rand() - .5) * .6, h = S * (i > 1 ? .5 + rand() * .1 : .26 + rand() * .2);
        const out = S * (.15 + rand() * .06), up = S * (.16 + rand() * .16), ar = r * .62;
        const x = Math.cos(a) * out, y = Math.sin(a) * out * .6;
        meshes.push(limb([0, 0, h], [x, y, h + S * .03], ar, ar, m, seed * 61 + 10 + i, 7));
        meshes.push(limb([x, y, h - ar * .4], [x, y, h + up], ar, ar * .92, m, seed * 61 + 20 + i, 7), tip(x, y, h + up, ar * .92, 30 + i));
      }
      return place(meshes, Object.assign({ rot: (rand() - .5) * .8 }, o), r * 1.4, { ordered: 'depth' }); // small turn only: arms stay to the sides
    },
    // log lying on the ground, light cut ends (ref 23)
    log(o) {
      const L = o.size || 140, r = L * .16, seed = o.seed || 1, rand = rng(seed);
      const meshes = [limb([-L / 2, 0, r], [L / 2, 0, r * .96], r, r * .92, mat.trunk, seed * 67, 6, mat.woodEnd)];
      if (rand() < .7) meshes.push(limb([L * .1, 0, r * 1.7], [L * .18, -r * .3, r * 2.5], r * .3, r * .2, mat.trunk, seed * 67 + 1, 5, mat.woodEnd));
      return place(meshes, Object.assign({ rot: rand() * .6 - .3 }, o), r * 1.2, { ordered: 'depth' });
    },
    // tree stump with a cut top
    stump(o) {
      const S = o.size || 60, seed = o.seed || 1, rand = rng(seed);
      const m = limb([0, 0, 0], [0, 0, S * .5], S * .3, S * .26, mat.trunk, seed * 71, 7, mat.woodEnd);
      return place([m], Object.assign({ rot: rand() * 6.28 }, o), S * .3);
    },
    // flower: stem + two rings of pointed petals around a gold center (ref 19)
    flower(o) {
      const S = o.size || 70, seed = o.seed || 1, rand = rng(seed), pm = o.mat || mat.petal, meshes = [];
      const c = [0, 0, S * .6];
      meshes.push(limb([0, 0, 0], c, S * .025, S * .02, mat.leaf, seed * 73, 5));
      [[6, .3, .45, 0], [5, .2, .62, .5]].forEach(([n, out, up, off], k) => {
        for (let i = 0; i < n; i++) {
          const a = (i + off) / n * 6.28 + rand() * .2;
          meshes.push(limb(c, [c[0] + Math.cos(a) * S * out, c[1] + Math.sin(a) * S * out, c[2] + S * up * .5], S * .07, S * .012, pm, seed * 73 + 10 * k + i, 4));
        }
      });
      meshes.push(icosphere(0, mat.gold, seed * 73 + 40).scale(S * .07).move(c[0], c[1], c[2] + S * .04));
      return place(meshes, o, S * .15, { ordered: 'depth' });
    },
  });

  // ---------- creatures (ref 17–27) ----------
  // one body plan for four-legged animals and monsters: body, legs, head, snout, ears, tail, extras.
  // sizes are × S (body length). forward = −y, like the kid.
  const SPECIES = {
    bear:    { body: [.52, .8, .5], leg: [.3, .085], head: [.3, .27, .26], headAt: [.45, .3], snout: [.15, .09], ears: 'round', tail: 'stub', fur: 'bearFur', light: 'bearLight', face: 'animal' },
    // big-head test: a small body, a huge head with a front face (eyes, brows, expressions), signature parts kept big
    foxBig:  { body: [.26, .4, .26], leg: [.17, .048], head: [.4, .36, .36], headAt: [.22, .36], snout: [.36, .13], snoutAt: [.62, .3], noMouth: true, ears: 'pointed', earK: 1.9, tail: 'bushy', tailK: 1.25, tailUp: true,
               fur: 'foxFur', light: 'white', legMat: 'dark', face: 'buddy', eye: [.9, .36, .2], eyeK: 1.25, mouthUp: -.55, headPatch: { dir: [0, -.5, -.86], th: .5 }, browColor: '#3a1a0c' },
    fox:     { body: [.3, .78, .3], leg: [.34, .042], head: [.2, .22, .18], headAt: [.46, .26], snout: [.22, .065], ears: 'pointed', tail: 'bushy', fur: 'foxFur', light: 'white', legMat: 'dark', face: 'animal' },
    rabbit:  { body: [.44, .6, .44], leg: [.12, .07], head: [.25, .24, .23], headAt: [.33, .3], snout: [.07, .075], ears: 'long', tail: 'puff', fur: 'rabbitFur', light: 'white', face: 'animal' },
    monster: { body: [.62, .9, .55], leg: [.32, .11], head: [.36, .34, .3], headAt: [.5, .28], snout: [.12, .15], ears: 'horns', tail: 'long', fur: 'monster', light: 'monsterBelly', plates: true, face: 'monster' },
  };
  make.critter = function (o) {
    const sp = Object.assign({}, SPECIES[o.kind] || SPECIES.bear, o.species), S = o.size || 160, seed = o.seed || 1, t = o.t || 0;
    const rand = rng(seed * 79), d = clampD(o.detail == null ? 1 : o.detail), fur = mat[sp.fur], light = mat[sp.light];
    const walk = o.pose === 'walk', ph = t * Math.PI * 2 * 1.3, meshes = [];
    const [bw, bl, bh] = sp.body, legL = sp.leg[0] * S, legR = sp.leg[1] * S;
    const bob = walk ? Math.abs(Math.sin(ph)) * .015 * S : Math.sin(t * 2.4) * .005 * S;
    const zc = legL + bh * S * .42 + bob;
    const body = icosphere(d, fur, seed * 79 + 1).jitter(.05, rand).scale(bw * S / 2, bl * S / 2, bh * S / 2).move(0, 0, zc);
    body.patch = { mat: light, dir: [0, -.35, -1], th: .55 };
    meshes.push(body);
    // legs (diagonal pairs move together)
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
      const hip = [sx * bw * S * .28, sy * bl * S * .3, zc - bh * S * .2];
      const p = ph + ((sx < 0) !== (sy < 0) ? Math.PI : 0), a = walk ? .45 * Math.sin(p) : 0, lift = walk ? Math.max(0, Math.cos(p)) * .04 * S : 0;
      const foot = [hip[0], hip[1] - Math.sin(a) * legL, Math.max(legR * .5, hip[2] - Math.cos(a) * (hip[2] - legR * .5)) + lift];
      // leg, foot, then the hip cover (in fur) on top of the connection
      const lm = mat[sp.legMat] || fur;
      [limb(hip, foot, legR, legR * .8, lm, seed * 79 + 10 + i),
        icosphere(0, lm, seed * 79 + 20 + i).scale(legR * 1.15, legR * 1.5, legR * .7).move(foot[0], foot[1] - legR * .3, foot[2] - legR * .2),
        icosphere(0, fur, seed * 79 + 24 + i).scale(legR * 1.35).move(hip[0], hip[1], hip[2])]
        .forEach((m, j) => { m.group = 'leg' + i; m.order = j; meshes.push(m); });
    });
    // head
    const [hw, hl, hh] = sp.head, hc = [0, -sp.headAt[0] * S, zc + sp.headAt[1] * S + (walk ? 0 : Math.sin(t * 1.7) * .008 * S)];
    const head = icosphere(d, fur, seed * 79 + 30).jitter(.05, rand).scale(hw * S, hl * S, hh * S).move(hc[0], hc[1], hc[2]);
    if (sp.headPatch) head.patch = { mat: light, dir: sp.headPatch.dir.slice(), th: sp.headPatch.th }; // light cheeks / muzzle
    meshes.push(head, limb([0, -bl * S * .3, zc + bh * S * .1], hc, hw * S * .55, hw * S * .5, fur, seed * 79 + 31));
    // snout + nose
    const sa = sp.snoutAt || [.55, .3];
    const s0 = [hc[0], hc[1] - hl * S * sa[0], hc[2] - hh * S * sa[1]], s1 = [s0[0], s0[1] - sp.snout[0] * S, s0[2] - sp.snout[0] * S * .15];
    const snout = limb(s0, s1, sp.snout[1] * S, sp.snout[1] * S * .55, light, seed * 79 + 32, 6); snout.bias = S * .05; meshes.push(snout);
    const nose = icosphere(0, mat.dark, seed * 79 + 33).scale(sp.snout[1] * S * (sp.noMouth ? .7 : .55)).move(s1[0], s1[1] - sp.snout[1] * S * .1, s1[2] + sp.snout[1] * S * .15); nose.bias = S * .1; meshes.push(nose);
    // ears / horns
    [-1, 1].forEach((sx, i) => {
      if (sp.ears === 'round') meshes.push(icosphere(0, fur, seed * 79 + 40 + i).scale(.07 * S, .035 * S, .07 * S).move(sx * hw * S * .62, hc[1] + hl * S * .1, hc[2] + hh * S * .78));
      const eK = sp.earK || 1;
      if (sp.ears === 'pointed') meshes.push(cone(4, fur, seed * 79 + 40 + i, rand, .5).scale(.06 * S * eK, .03 * S * eK, .14 * S * eK).move(sx * hw * S * .5, hc[1] + hl * S * .05, hc[2] + hh * S * .55));
      if (sp.ears === 'long') {
        const b = [sx * hw * S * .35, hc[1] + .02 * S, hc[2] + hh * S * .7], tp = [b[0] + sx * .07 * S, b[1] + .06 * S, b[2] + .4 * S];
        meshes.push(limb(b, tp, .045 * S, .02 * S, fur, seed * 79 + 40 + i, 5));
        const inner = limb([b[0], b[1] - .016 * S, b[2] + .03 * S], [tp[0], tp[1] - .016 * S, tp[2] - .03 * S], .028 * S, .01 * S, mat.pink, seed * 79 + 42 + i, 4);
        inner.bias = S * .05; meshes.push(inner);
      }
      if (sp.ears === 'horns') meshes.push(limb([sx * hw * S * .45, hc[1], hc[2] + hh * S * .6], [sx * hw * S * 1.0, hc[1] + .02 * S, hc[2] + hh * S * 1.7], .05 * S, .006 * S, mat.horn, seed * 79 + 40 + i, 5));
    });
    // tail
    const tb = [0, bl * S * .48, zc + bh * S * .15], wag = Math.sin(t * (walk ? 8 : 4)) * .04 * S;
    if (sp.tail === 'stub') meshes.push(icosphere(0, fur, seed * 79 + 50).scale(.07 * S).move(tb[0] + wag * .3, tb[1], tb[2]));
    if (sp.tail === 'puff') meshes.push(icosphere(0, mat.white, seed * 79 + 50).scale(.085 * S).move(tb[0] + wag * .3, tb[1], tb[2]));
    if (sp.tail === 'bushy') {
      const tK = sp.tailK || 1;
      const tail = sp.tailUp // standing up behind the head, so it shows from the front too
        ? icosphere(1, fur, seed * 79 + 50).jitter(.06, rand).scale(.11 * S * tK, .12 * S * tK, .22 * S * tK).map(p => [p[0] + p[2] * .45, p[1], p[2]]).move(wag + .2 * S * tK, tb[1] + .02 * S, tb[2] + .22 * S * tK)
        : icosphere(1, fur, seed * 79 + 50).jitter(.06, rand).scale(.09 * S * tK, .25 * S * tK, .09 * S * tK).move(wag, tb[1] + .2 * S * tK, tb[2] + .05 * S * tK);
      tail.patch = { mat: light, dir: sp.tailUp ? [0, .25, 1] : [0, 1, 0], th: .6 }; meshes.push(tail);
    }
    if (sp.tail === 'long') {
      const mid = [wag, tb[1] + .28 * S, tb[2] - .12 * S], tip = [wag * 2, tb[1] + .5 * S, tb[2] + .02 * S];
      meshes.push(limb(tb, mid, .08 * S, .05 * S, fur, seed * 79 + 50), limb(mid, tip, .05 * S, .008 * S, fur, seed * 79 + 51));
    }
    // back plates
    if (sp.plates) for (let i = 0; i < 5; i++) {
      const y = (-.28 + i * .15) * bl * S, k = 1 - Math.abs(i - 1.5) / 4;
      const pl = cone(4, light, seed * 79 + 60 + i, rand, .45).scale(.06 * S * k, .025 * S, .15 * S * k).move(0, y, zc + bh * S * .42);
      pl.bias = S * .05; meshes.push(pl);
    }
    const obj = place(meshes, Object.assign({ rot: 0 }, o), bw * S * .6, { ordered: 'depth' });
    const r = o.rot || 0, C = Math.cos(r), Sn = Math.sin(r);
    const W = p => [obj.x + p[0] * C - p[1] * Sn, obj.y + p[0] * Sn + p[1] * C, obj.z + p[2]];
    const sr = sp.snout[1] * S;
    obj.face = { c: W(hc), r: hw * S, k: [hl / hw, 1, hh / hw], f: [Sn, -C, 0], u: [C, Sn, 0], style: sp.face, roar: o.roar || 0,
      eye: sp.eye, eyeK: sp.eyeK, mouthUp: sp.mouthUp, browColor: sp.browColor, expr: o.expression || 'happy', noMouth: !!sp.noMouth, noCheeks: !!sp.noMouth,
      // mouth line in 3D along the underside of the snout: corners at the cheeks, tip at the front
      mouth: { L: W([-sr * 1.05, s0[1] + sr * .4, s0[2] - sr * .5]), tip: W([0, s1[1] - sr * .25, s1[2] - sr * .5]), R: W([sr * 1.05, s0[1] + sr * .4, s0[2] - sr * .5]), drop: sr * (.3 + 1.1 * (o.roar || 0)) } };
    return obj;
  };
  // small bird: egg body, head, beak, wings, fan tail, thin legs; hops and pecks
  make.bird = function (o) {
    const S = o.size || 80, seed = o.seed || 1, t = o.t || 0, rand = rng(seed * 83), d = clampD(o.detail == null ? 1 : o.detail);
    const fur = o.mat || mat.birdBlue, hop = Math.max(0, Math.sin(t * 5)) * (Math.sin(t * 1.3) > .3 ? .12 * S : 0), meshes = [];
    // o.big: big-head test — small body, huge head with a front face; beak, wings, fan tail and thin legs stay
    const B = o.big
      ? { zc: .3, body: [.17, .2, .17], hc: [-.06, .33], hr: [.3, .28, .28], peck: .05, beak: [.2, .6, .14], wing: [.05, .17, .11, .17], hipZ: .13, tail: [.14, .34, .3, .09] }
      : { zc: .42, body: [.22, .3, .23], hc: [-.22, .22], hr: [.15, .15, .14], peck: .12, beak: [.11, .27, .05], wing: [.05, .24, .13, .2], hipZ: .18, tail: [.24, .5, .14, .07] };
    const zc = S * B.zc + hop, peck = Math.max(0, Math.sin(t * 1.3 + 2)) * .5;
    const body = icosphere(d, fur, seed * 83 + 1).jitter(.05, rand).scale(S * B.body[0], S * B.body[1], S * B.body[2]).move(0, 0, zc);
    body.patch = { mat: o.belly || mat.birdBelly, dir: [0, -.6, -.8], th: .35 };
    const hc = [0, S * B.hc[0], zc + S * B.hc[1] - peck * S * B.peck];
    const head = icosphere(d, fur, seed * 83 + 2).jitter(.04, rand).scale(S * B.hr[0], S * B.hr[1], S * B.hr[2]).move(hc[0], hc[1], hc[2]);
    if (o.big) head.patch = { mat: o.belly || mat.birdBelly, dir: [0, -.45, -.9], th: .55 };
    const beak = limb([0, hc[1] - S * B.beak[0], hc[2] - S * .03], [0, hc[1] - S * B.beak[1], hc[2] - S * .06 - peck * S * .05], S * B.beak[2], S * .005, mat.beak, seed * 83 + 3, 4);
    beak.bias = S * .1;
    meshes.push(body, head, beak);
    [-1, 1].forEach((sx, i) => {
      const w = icosphere(0, fur, seed * 83 + 4 + i).scale(S * B.wing[0], S * B.wing[1], S * B.wing[2]).move(sx * S * B.wing[3], S * .04, zc + S * .03);
      w.bias = S * .02; meshes.push(w);
      const hip = [sx * S * .07, S * .02, zc - S * B.hipZ], ft = [sx * S * .07, -S * .02, Math.max(0, hop - S * .0) + S * .015];
      meshes.push(limb(hip, ft, S * .016, S * .012, mat.beak, seed * 83 + 6 + i, 4));
      meshes.push(limb(ft, [ft[0], ft[1] - S * .07, S * .008], S * .012, S * .006, mat.beak, seed * 83 + 8 + i, 4));
    });
    [-1, 0, 1].forEach((k, i) => meshes.push(limb([0, S * B.tail[0], zc + S * .02], [k * S * B.tail[3], S * B.tail[1], zc + S * B.tail[2]], S * .04, S * .012, fur, seed * 83 + 10 + i, 4)));
    const obj = place(meshes, Object.assign({ rot: 0 }, o), S * .2, { ordered: 'depth' });
    const r = o.rot || 0, C = Math.cos(r), Sn = Math.sin(r);
    obj.face = o.big
      ? { c: [obj.x + hc[0] * C - hc[1] * Sn, obj.y + hc[0] * Sn + hc[1] * C, obj.z + hc[2]], r: S * B.hr[0], k: [B.hr[1] / B.hr[0], 1, B.hr[2] / B.hr[0]], f: [Sn, -C, 0], u: [C, Sn, 0],
          style: 'buddy', eye: [.88, .42, .24], eyeK: 1.2, noMouth: true, noCheeks: true, browColor: '#0f2a52', expr: o.expression || 'happy' } // the beak is the mouth
      : { c: [obj.x + hc[0] * C - hc[1] * Sn, obj.y + hc[0] * Sn + hc[1] * C, obj.z + hc[2]], r: S * .15, k: [1, 1, .93], f: [Sn, -C, 0], u: [C, Sn, 0], style: 'animal' };
    return obj;
  };
  // little alien: egg body, big head with one eye, antennae; floats
  make.alien = function (o) {
    const S = o.size || 120, seed = o.seed || 1, t = o.t || 0, rand = rng(seed * 89), d = clampD(o.detail == null ? 1 : o.detail);
    const g = o.mat || mat.alien, float = (Math.sin(t * 2.2) * .5 + .5) * .06 * S, meshes = [];
    const zc = S * .3 + float;
    const body = icosphere(d, g, seed * 89 + 1).jitter(.04, rand).scale(S * .2, S * .17, S * .24).move(0, 0, zc);
    body.patch = { mat: mat.alienBelly, dir: [0, -1, -.2], th: .7 };
    const hc = [0, 0, zc + S * .38], hr = S * .23;
    meshes.push(body, icosphere(d, g, seed * 89 + 2).jitter(.04, rand).scale(hr, hr * .92, hr * .95).move(hc[0], hc[1], hc[2]));
    [-1, 1].forEach((sx, i) => {
      const wig = Math.sin(t * 3 + i) * .03 * S, tip = [sx * S * .17 + wig, S * .02, hc[2] + S * .36];
      meshes.push(limb([sx * S * .08, 0, hc[2] + hr * .7], tip, S * .016, S * .01, g, seed * 89 + 3 + i, 4));
      const ball = icosphere(0, mat.gold, seed * 89 + 5 + i).scale(S * .04).move(tip[0], tip[1], tip[2]); ball.bias = S * .02; meshes.push(ball);
      const sh = [sx * S * .17, -S * .02, zc + S * .08], hand = [sx * S * .27, -S * .08, zc - S * .04 + Math.sin(t * 2.2 + i) * .02 * S];
      meshes.push(limb(sh, hand, S * .03, S * .022, g, seed * 89 + 7 + i, 5));
      meshes.push(limb([sx * S * .08, 0, zc - S * .18], [sx * S * .09, -S * .02, float], S * .035, S * .03, g, seed * 89 + 9 + i, 5));
      meshes.push(icosphere(0, g, seed * 89 + 11 + i).scale(S * .045, S * .06, S * .025).move(sx * S * .09, -S * .04, float + S * .01));
    });
    const obj = place(meshes, Object.assign({ rot: 0 }, o), S * .18, { ordered: 'depth' });
    const r = o.rot || 0, C = Math.cos(r), Sn = Math.sin(r);
    obj.face = { c: [obj.x, obj.y, obj.z + hc[2]], r: hr, k: [.92, 1, .95], f: [Sn, -C, 0], u: [C, Sn, 0], style: 'cyclops' };
    return obj;
  };

  // ---------- characters ----------
  // a pose = joint angles (radians). leg/arm: swing forward; knee/elbow: bend forward; elbowSide: forearm turns further up/in (for raised arms);
  // side: raise outward (π ≈ straight up); bob: body lift (× height)
  const poses = {
    stand: t => ({ bob: .004 * Math.sin(t * 2.2), armL: .05, armR: .05, elbowL: .25, elbowR: .25 }),
    walk: t => {
      const p = t * Math.PI * 2 * 1.5, s = Math.sin(p), c = Math.cos(p);
      return { legL: .5 * s, legR: -.5 * s, kneeL: .65 * Math.max(0, c), kneeR: .65 * Math.max(0, -c),
        armL: -.5 * s, armR: .5 * s, elbowL: .45, elbowR: .45, bob: .014 * Math.abs(Math.sin(p * 2)) };
    },
    jump: t => {
      const p = (t % 1), up = Math.max(0, Math.sin(p * Math.PI * 2)), crouch = Math.max(0, -Math.sin(p * Math.PI * 2));
      return { bob: .2 * up, kneeL: .25 + .9 * crouch + .3 * up, kneeR: .25 + .9 * crouch + .3 * up, legL: .2 * up + .4 * crouch, legR: .1 * up + .4 * crouch,
        sideL: 2.5 * up + .3, sideR: 2.5 * up + .3, armL: .2, armR: .2, elbowL: .2 * (1 - up), elbowR: .2 * (1 - up), elbowSideL: .25 * up, elbowSideR: .25 * up };
    },
    cheer: t => {
      const w = Math.sin(t * 9);
      return { sideL: 2.55 + .15 * w, sideR: 2.55 - .15 * w, armL: .15, armR: .15, elbowL: .05, elbowR: .05, elbowSideL: .3, elbowSideR: .3, bob: .03 * Math.abs(Math.sin(t * 4.5)) };
    },
    scared: t => {
      const tr = Math.sin(t * 45) * .015;
      return { armL: 1.25, armR: 1.25, sideL: .55 + tr, sideR: .55 - tr, elbowL: 1.9, elbowR: 1.9, kneeL: .35, kneeR: .35, legL: .18, legR: .18, bob: -.02 };
    },
    wave: t => ({ sideR: 2.1, armR: .2, elbowR: .1, elbowSideR: .75 + .4 * Math.sin(t * 8), armL: .05, elbowL: .25, bob: .004 * Math.sin(t * 2.2) }),
  };
  const poseExpression = { stand: 'happy', walk: 'happy', jump: 'joy', cheer: 'joy', scared: 'scared', wave: 'happy' };

  // direction of a limb: down, swung forward by `fwd`, raised outward by `side` (sign = which side)
  function limbEnd(j, fwd, side, sign, L) {
    const vy = -Math.sin(fwd), vz = -Math.cos(fwd);
    return [j[0] + sign * (-vz) * Math.sin(side) * L, j[1] + vy * L, j[2] + vz * Math.cos(side) * L];
  }

  make.kid = function (o) {
    const H = o.size || 200, seed = o.seed || 1, d = clampD(o.detail == null ? 1 : o.detail);
    const P = Object.assign({ legL: 0, legR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, elbowL: .2, elbowR: .2, sideL: .12, sideR: .12, bob: 0 },
      (poses[o.pose || 'stand'] || poses.stand)(o.t || 0));
    // outfit options (test): o.robe = material (long robe, sleeves too), o.hat = 'wizard', o.beard = material, o.staff = true
    const robe = o.robe, skin = o.skin || mat.skin, shirt = robe || o.shirt || mat.shirt, pants = o.pants || mat.pants, hair = o.hair || mat.hair;
    const meshes = [], hipZ = .44 * H + P.bob * H;
    const chain = (g, parts) => parts.forEach((m, i) => { m.group = g; m.order = i; meshes.push(m); });
    const ball = (p, r, m, sd) => icosphere(0, m, sd).scale(r).move(p[0], p[1], p[2]); // joint cover
    // legs + shoes: upper, lower, shoe, then knee and hip covers on top
    [[-1, 'L'], [1, 'R']].forEach(([s, k]) => {
      const hip = [s * .065 * H, 0, hipZ];
      const knee = limbEnd(hip, P['leg' + k], .04, s, .2 * H);
      const ankle = limbEnd(knee, P['leg' + k] - P['knee' + k], .04, s, .2 * H);
      const shoe = icosphere(0, mat.shoe, seed * 31 + 4 + s).scale(.05 * H, .08 * H, .036 * H);
      shoe.move(ankle[0], ankle[1] - .028 * H, ankle[2] - .006 * H);
      if (robe) { meshes.push(shoe); return; } // under a robe only the shoes show
      chain('leg' + k, [limb(hip, knee, .05 * H, .042 * H, pants, seed * 31 + s), limb(knee, ankle, .042 * H, .034 * H, pants, seed * 31 + 2 + s), shoe,
        ball(knee, .045 * H, pants, seed * 31 + 90 + s), ball(hip, .056 * H, pants, seed * 31 + 92 + s)]);
    });
    // body: hips (pants) + shirt + neck — or one long robe from the ground to the shoulders
    if (robe) {
      const rb = cylinder(8, .52, robe, seed * 31 + 7).scale(.2 * H, .16 * H, hipZ + .3 * H - .03 * H).move(0, 0, .03 * H);
      rb.center = [0, 0, hipZ * .9]; meshes.push(rb);
    } else {
      meshes.push(cylinder(6, 1, pants, seed * 31 + 7).scale(.1 * H, .07 * H, .1 * H).move(0, 0, hipZ - .04 * H));
      meshes.push(cylinder(6, .88, shirt, seed * 31 + 8).scale(.112 * H, .075 * H, .27 * H).move(0, 0, hipZ + .04 * H));
    }
    meshes.push(limb([0, 0, hipZ + .29 * H], [0, 0, hipZ + .37 * H], .034 * H, .03 * H, skin, seed * 31 + 9));
    // arms: sleeve + forearm + hand
    [[-1, 'L'], [1, 'R']].forEach(([s, k]) => {
      const sh = [s * .125 * H, 0, hipZ + .28 * H];
      const el = limbEnd(sh, P['arm' + k], P['side' + k], s, .15 * H);
      // elbow bends forward (elbow) and/or toward the head (elbowSide) — a raised arm bends up/in, never back
      const wr = limbEnd(el, P['arm' + k] + P['elbow' + k], P['side' + k] + (P['elbowSide' + k] || 0), s, .14 * H);
      const hand = icosphere(0, skin, seed * 31 + 14 + s).scale(.036 * H);
      const hd = norm(sub(wr, el)); hand.move(wr[0] + hd[0] * .02 * H, wr[1] + hd[1] * .02 * H, wr[2] + hd[2] * .02 * H);
      // sleeve, forearm, elbow and shoulder covers; then a held object (in front of the elbow, since the elbow folds
      // forward); the hand last, so it grips the object
      const parts = [limb(sh, el, .04 * H, .033 * H, shirt, seed * 31 + 10 + s), limb(el, wr, .029 * H, .025 * H, skin, seed * 31 + 12 + s),
        ball(el, .036 * H, shirt, seed * 31 + 94 + s), ball(sh, .05 * H, shirt, seed * 31 + 96 + s)];
      if (o.staff && k === 'R') { // staff held in the right hand, gem on top; the hand is drawn over it
        const top = [wr[0], wr[1] - .03 * H, Math.max(wr[2] + .45 * H, .95 * H)];
        parts.push(limb([wr[0], wr[1] - .03 * H, 0], top, .02 * H, .016 * H, mat.wood, seed * 31 + 98, 5));
        parts.push(icosphere(0, mat.gemBlue, seed * 31 + 99).scale(.045 * H, .045 * H, .06 * H).move(top[0], top[1], top[2] + .04 * H));
      }
      parts.push(hand);
      chain('arm' + k, parts);
    });
    // head + hair cap (cut higher at the front so the face stays clear)
    const hz = hipZ + .5 * H, hr = .145 * H;
    const head = icosphere(d, skin, seed * 31 + 16).scale(hr, hr * .93, hr * 1.02).move(0, 0, hz);
    const hairM = icosphere(d, hair, seed * 31 + 17).jitter(.05, rng(seed * 31 + 18));
    const cut = new Set(); // vertices pushed up to the hairline; faces made only of them (the underside) are dropped
    hairM.v = hairM.v.map((p, i) => { const z0 = -.28 - .5 * p[1]; if (p[2] < z0) { cut.add(i); return [p[0], p[1], z0]; } return p; });
    hairM.f = hairM.f.filter(f => !(cut.has(f[0]) && cut.has(f[1]) && cut.has(f[2])));
    hairM.center = [0, 0, 0];
    hairM.scale(hr * 1.06, hr * 1.02, hr * 1.05).move(0, hr * .05, hz + hr * .03);
    hairM.bias = hr * .7; // drawn after the head, but hands in front of the face still win
    meshes.push(head, hairM);
    if (o.hat === 'wizard') { // tall pointed hat that bends back, on a wide brim
      const hb = hz + hr * .5;
      const brim = cylinder(10, .95, robe || mat.shirt, seed * 31 + 20).scale(.25 * H, .23 * H, .025 * H).move(0, hr * .05, hb);
      const cone0 = cone(7, robe || mat.shirt, seed * 31 + 21, rng(seed * 31 + 22), .55);
      const hat = cone0.scale(.16 * H, .15 * H, .42 * H).map(p => [p[0], p[1] + Math.pow(p[2] / (.42 * H), 2) * .12 * H, p[2]]).move(0, hr * .05, hb);
      brim.bias = hr * 1.2; hat.bias = hr * 1.3;
      meshes.push(brim, hat);
    }
    if (o.beard) { // pointed beard under the chin (it hides the mouth)
      const bd = limb([0, -hr * .55, hz - hr * .3], [0, -hr * .78, hz - hr * 1.6], .1 * H, .008 * H, o.beard, seed * 31 + 23, 6);
      bd.bias = hr * .9; meshes.push(bd);
    }
    const obj = place(meshes, Object.assign({ rot: 0 }, o), .14 * H, { ordered: 'depth' });
    if (o.staff) obj.front = { group: 'armR', ref: head, margin: hr * .4 };
    const r = o.rot || 0;
    obj.face = { c: [obj.x, obj.y, obj.z + hz], r: hr, browColor: '#3a271b', f: [Math.sin(r), -Math.cos(r), 0], u: [Math.cos(r), Math.sin(r), 0],
      expr: o.expression || poseExpression[o.pose || 'stand'] || 'happy', noMouth: !!o.beard };
    return obj;
  };

  // head-body character: one big egg from the legs to the top of the head, so the face is as big as possible
  // (readable small in a game). Same skeleton and poses as the kid. o.outfit:
  //   none     - red player: light face oval + tuft
  //   'kid'    - skin head, hair cap, shirt and pants as color bands on the egg, sleeves, pants legs
  //   'wizard' - robe-colored egg, skin face, big white beard, pointed hat, white brows, staff
  make.buddy = function (o) {
    const H = o.size || 160, seed = o.seed || 1, d = clampD(o.detail == null ? 1 : o.detail), outfit = o.outfit;
    const P = Object.assign({ legL: 0, legR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, elbowL: .2, elbowR: .2, sideL: .25, sideR: .25, bob: 0 },
      (poses[o.pose || 'stand'] || poses.stand)(o.t || 0));
    const skin = o.skin || mat.skin, shirt = o.shirt || mat.shirt, pants = o.pants || mat.pants, robe = o.robe || mat.robe;
    const base = outfit === 'kid' ? skin : outfit === 'wizard' ? robe : (o.mat || mat.buddy);
    const legM = outfit === 'kid' ? pants : base, sleeveM = outfit === 'kid' ? shirt : base, handM = outfit ? skin : base;
    const meshes = [];
    const chain = (g, parts) => parts.forEach((m, i) => { m.group = g; m.order = i; meshes.push(m); });
    const ball = (p, r, m, sd) => icosphere(0, m, sd).scale(r).move(p[0], p[1], p[2]);
    const rx = .37 * H, ry = rx * .9, rz = .42 * H, legL = .1 * H, zc = .16 * H + rz + P.bob * H;
    // legs: two short segments + shoe; a cover hides the hip
    [[-1, 'L'], [1, 'R']].forEach(([s, k]) => {
      const hip = [s * .14 * H, 0, zc - rz * .82];
      const knee = limbEnd(hip, P['leg' + k], .05, s, legL), ankle = limbEnd(knee, P['leg' + k] - P['knee' + k], .05, s, legL);
      const shoe = icosphere(0, mat.shoe, seed * 37 + 4 + s).scale(.075 * H, .11 * H, .05 * H).move(ankle[0], ankle[1] - .035 * H, ankle[2] - .01 * H);
      chain('leg' + k, [limb(hip, knee, .055 * H, .05 * H, legM, seed * 37 + s), limb(knee, ankle, .05 * H, .045 * H, legM, seed * 37 + 2 + s), shoe,
        ball(knee, .052 * H, legM, seed * 37 + 90 + s), ball(hip, .075 * H, legM, seed * 37 + 92 + s)]);
    });
    // the head-body
    const egg = icosphere(Math.max(d, 1), base, seed * 37 + 10).jitter(.03, rng(seed * 37 + 11)).scale(rx, ry, rz).move(0, 0, zc);
    if (!outfit) egg.patch = { mat: o.faceMat || mat.buddyFace, dir: [0, -1, .15], th: .66 }; // light face oval
    if (outfit === 'wizard') egg.patch = { mat: skin, dir: [0, -1, .3], th: .62 };
    if (outfit === 'kid') egg.bands = [{ z: zc - rz * .66, mat: pants }, { z: zc - rz * .24, mat: shirt }]; // clothes as bands below the face
    meshes.push(egg);
    // arms: short, from the sides at mid height; sleeve + forearm + hand
    [[-1, 'L'], [1, 'R']].forEach(([s, k]) => {
      const sh = [s * rx * .9, 0, zc - rz * .2];
      const el = limbEnd(sh, P['arm' + k], P['side' + k] + .35, s, .1 * H);
      const wr = limbEnd(el, P['arm' + k] + P['elbow' + k], P['side' + k] + .35 + (P['elbowSide' + k] || 0), s, .09 * H);
      const hd = norm(sub(wr, el)), hand = icosphere(0, handM, seed * 37 + 14 + s).scale(.055 * H).move(wr[0] + hd[0] * .02 * H, wr[1] + hd[1] * .02 * H, wr[2] + hd[2] * .02 * H);
      // sleeve, forearm, covers; then a held object over the elbow (it folds forward); the hand last, gripping it
      const parts = [limb(sh, el, .05 * H, .045 * H, sleeveM, seed * 37 + 20 + s), limb(el, wr, .04 * H, .036 * H, outfit === 'kid' ? skin : sleeveM, seed * 37 + 22 + s),
        ball(el, .047 * H, sleeveM, seed * 37 + 94 + s), ball(sh, .065 * H, sleeveM, seed * 37 + 96 + s)];
      if (outfit === 'wizard' && k === 'R') { // staff in the right hand, gem on top
        const top = [wr[0], wr[1] - .03 * H, Math.max(wr[2] + .5 * H, 1.1 * H)];
        parts.push(limb([wr[0], wr[1] - .03 * H, 0], top, .025 * H, .02 * H, mat.wood, seed * 37 + 40, 5));
        parts.push(icosphere(0, mat.gemBlue, seed * 37 + 41).scale(.06 * H, .06 * H, .08 * H).move(top[0], top[1], top[2] + .05 * H));
      }
      parts.push(hand);
      chain('arm' + k, parts);
    });
    if (!outfit) [-1, 0, 1].forEach((k, i) => { // tuft: three little leaves
      const b = [k * .04 * H, .02 * H, zc + rz * .95], tip = [k * .12 * H, .03 * H - (k ? 0 : .02 * H), zc + rz + .13 * H - Math.abs(k) * .03 * H];
      const leaf = limb(b, tip, .035 * H, .006 * H, base, seed * 37 + 30 + i, 4); leaf.bias = H * .1; meshes.push(leaf);
    });
    if (outfit === 'kid') { // hair cap: low at the back, a fringe high above the eyes
      const hairM = icosphere(Math.max(d, 1), o.hair || mat.hair, seed * 37 + 50).jitter(.05, rng(seed * 37 + 51));
      const cut = new Set();
      hairM.v = hairM.v.map((p, i) => { const z0 = .3 - .42 * p[1]; if (p[2] < z0) { cut.add(i); return [p[0], p[1], z0]; } return p; });
      hairM.f = hairM.f.filter(f => !(cut.has(f[0]) && cut.has(f[1]) && cut.has(f[2])));
      hairM.center = [0, 0, 0];
      hairM.scale(rx * 1.05, ry * 1.06, rz * 1.04).move(0, ry * .03, zc);
      hairM.bias = rz * .6; meshes.push(hairM);
      [[-.06, .05, .18], [.05, .08, .14]].forEach(([x, y, h], i) => { // cowlick
        const tf = limb([x * H, y * H, zc + rz * .9], [x * H * 2.2, y * H + .05 * H, zc + rz + h * H], .05 * H, .006 * H, o.hair || mat.hair, seed * 37 + 52 + i, 4);
        tf.bias = rz * .7; meshes.push(tf);
      });
    }
    if (outfit === 'wizard') {
      const beard = limb([0, -ry * .8, zc - rz * .12], [0, -ry * .98, zc - rz * 1.05], .19 * H, .01 * H, o.beard || mat.white, seed * 37 + 60, 7);
      beard.bias = rz * .5; meshes.push(beard);
      const hb = zc + rz * .74;
      const brim = cylinder(10, .95, robe, seed * 37 + 61).scale(.46 * H, .42 * H, .035 * H).move(0, ry * .05, hb);
      const hat = cone(7, robe, seed * 37 + 62, rng(seed * 37 + 63), .55).scale(.27 * H, .25 * H, .62 * H)
        .map(p => [p[0], p[1] + Math.pow(p[2] / (.62 * H), 2) * .2 * H, p[2]]).move(0, ry * .05, hb);
      brim.bias = rz * 1.2; hat.bias = rz * 1.3; meshes.push(brim, hat);
    }
    const obj = place(meshes, Object.assign({ rot: 0 }, o), .3 * H, { ordered: 'depth' });
    if (outfit === 'wizard') obj.front = { group: 'armR', ref: egg, margin: rx * .3 };
    const r = o.rot || 0;
    obj.face = { c: [obj.x, obj.y, obj.z + zc], r: rx, browColor: outfit === 'wizard' ? '#f4f5f6' : outfit === 'kid' ? '#3a271b' : '#4a1216', k: [.9, 1, rz / rx], f: [Math.sin(r), -Math.cos(r), 0], u: [Math.cos(r), Math.sin(r), 0],
      style: 'buddy', eyeK: 1.4, noMouth: outfit === 'wizard',
      expr: o.expression || poseExpression[o.pose || 'stand'] || 'happy' };
    return obj;
  };

  // flat face layer on the low-poly head (eyes, brows, mouth, cheeks)
  function face(obj, cam) {
    const F = obj.face; if (!F) return '';
    const toCam = [0, -Math.cos(cam.a), Math.sin(cam.a)];
    const style = F.style || 'kid';
    if ((style === 'kid' || style === 'buddy') && dot(F.f, toCam) < .15) return ''; // facing away
    // a point on the head surface (head ellipsoid radii = F.r × F.k); .vis = it faces the camera
    const K = F.k || [.93, 1, 1.02];
    const at = (fw, sd, up) => {
      const n0 = norm([fw, sd, up]), k = [n0[0] * K[0], n0[1] * K[1], n0[2] * K[2]];
      const v = norm([F.f[0] * fw / K[0] + F.u[0] * sd, F.f[1] * fw / K[0] + F.u[1] * sd, up / K[2]]);
      const q = project([F.c[0] + (F.f[0] * k[0] + F.u[0] * k[1]) * F.r, F.c[1] + (F.f[1] * k[0] + F.u[1] * k[1]) * F.r, F.c[2] + k[2] * F.r], cam);
      q.vis = dot(v, toCam) > .2; return q;
    };
    const s = F.r * cam.s, E = '#2b2f33', R = '#8a2f35';
    const EYE = F.eye || { kid: [.93, .36, .06], buddy: [.92, .33, .2], animal: [.62, .78, .22], monster: [.85, .45, .22], cyclops: [.97, 0, .12] }[style];
    const both = [at(EYE[0], -EYE[1], EYE[2]), at(EYE[0], EYE[1], EYE[2])], m = at(.95, 0, F.mouthUp != null ? F.mouthUp : style === 'monster' ? -.3 : style === 'cyclops' ? -.42 : style === 'buddy' ? -.12 : -.36);
    const eyes = both.filter(e => e.vis);
    both.forEach((e, i) => { e.inner = Math.sign(both[1 - i][0] - e[0]) || 1; });
    const f1 = n => n.toFixed(1);
    const P = (d, w, fill) => `<path d="${d}" fill="${fill || 'none'}" stroke="${fill ? 'none' : E}" stroke-width="${f1(s * (w || .055))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const dotEye = (e, k) => (k *= F.eyeK || 1, `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(s * .085 * k)}" ry="${f1(s * .125 * k)}" fill="${E}"/><circle cx="${f1(e[0] + s * .03 * k)}" cy="${f1(e[1] - s * .045 * k)}" r="${f1(s * .03 * k)}" fill="#fff"/>`);
    const cheeks = F.noCheeks ? '' : eyes.map(e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1] + s * .2)}" rx="${f1(s * .1)}" ry="${f1(s * .06)}" fill="#ff7b7b" opacity=".45"/>`).join('');
    // innerUp > 0: inner end raised (worried/sad); < 0: lowered (angry)
    const brow = (e, innerUp, lift) => P(`M${f1(e[0] - e.inner * s * .1)},${f1(e[1] - s * (lift - innerUp))} L${f1(e[0] + e.inner * s * .1)},${f1(e[1] - s * (lift + innerUp))}`, .045);
    // BIG thick brows: a tapered, slightly arched wedge, thick at the inner end. Their shape carries the expression.
    // innerUp > 0 raises the inner end (worried, sad), < 0 lowers it (angry); lift = height above the eye; arch = bow
    const kE = F.eyeK || 1, BC = F.browColor || E;
    const bigBrow = (e, innerUp, lift, arch, k, color) => {
      k = (k || 1) * kE;
      const w = s * .21 * k, t0 = s * .07 * k, t1 = s * .15 * k, o0 = e[0] - e.inner * w, i0 = e[0] + e.inner * w * .85;
      const yo = e[1] - s * (lift - innerUp) * kE, yi = e[1] - s * (lift + innerUp) * kE, cx = (o0 + i0) / 2, cy = (yo + yi) / 2 - s * arch * kE;
      const d = `M${f1(o0)},${f1(yo)} Q${f1(cx)},${f1(cy)} ${f1(i0)},${f1(yi)} L${f1(i0)},${f1(yi + t1)} Q${f1(cx)},${f1(cy + (t0 + t1) * .5)} ${f1(o0)},${f1(yo + t0)} Z`;
      return `<path d="${d}" fill="${color || BC}" stroke="${color || BC}" stroke-width="${f1(s * .025 * k)}" stroke-linejoin="round"/>`;
    };
    // per expression: [innerUp, lift, arch]
    const BROW = { happy: [0, .3, .07], joy: [-.01, .37, .12], surprised: [.03, .46, .12], scared: [.13, .37, .03], sad: [.12, .29, -.01] };
    const brows = (key, k) => { const b = BROW[key] || BROW.happy; return eyes.map(e => bigBrow(e, b[0], b[1], b[2], k)).join(''); };
    if (!m.vis && !eyes.length) return '';
    let out = '';
    if (style === 'animal') return `<g class="face">${eyes.map(e => dotEye(e, .85) + bigBrow(e, .03, .24, .05, .75, '#2b2f33')).join('')}</g>`;
    if (style === 'cyclops') {
      const e = both[0]; if (!e.vis) return '';
      out += `<circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="${f1(s * .32)}" fill="#fff"/><circle cx="${f1(e[0])}" cy="${f1(e[1] + s * .03)}" r="${f1(s * .19)}" fill="#7b3fd1"/>`;
      out += `<circle cx="${f1(e[0])}" cy="${f1(e[1] + s * .04)}" r="${f1(s * .1)}" fill="${E}"/><circle cx="${f1(e[0] + s * .07)}" cy="${f1(e[1] - s * .06)}" r="${f1(s * .055)}" fill="#fff"/>`;
      if (m.vis) out += P(`M${f1(m[0] - s * .13)},${f1(m[1] - s * .02)} Q${f1(m[0])},${f1(m[1] + s * .12)} ${f1(m[0] + s * .13)},${f1(m[1] - s * .02)}`, .05);
      { const w = s * .34, y = e[1] - s * .44, t = s * .1; // one wide brow
        out += `<path d="M${f1(e[0] - w)},${f1(y + t * .4)} Q${f1(e[0])},${f1(y - s * .12)} ${f1(e[0] + w)},${f1(y + t * .4)} L${f1(e[0] + w * .9)},${f1(y + t * 1.1)} Q${f1(e[0])},${f1(y - s * .12 + t * 1.4)} ${f1(e[0] - w * .9)},${f1(y + t * 1.1)} Z" fill="#124d2c" stroke="#124d2c" stroke-width="${f1(s * .02)}" stroke-linejoin="round"/>`; }
      return `<g class="face">${out}</g>`;
    }
    if (style === 'monster') {
      out += eyes.map(e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(s * .1)}" ry="${f1(s * .085)}" fill="#ffd23f"/><ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(s * .028)}" ry="${f1(s * .07)}" fill="${E}"/>`).join('');
      out += eyes.map(e => bigBrow(e, -.12, .17, 0, .95, '#1f1030')).join('');
      const Mo = F.mouth;
      if (Mo) {
        // a corner shows only when its side of the snout faces the camera (profile → half a mouth)
        const side = sgn => dot([F.u[0] * sgn, F.u[1] * sgn, 0], toCam) > -.25;
        const top = [side(-1) ? Mo.L : null, Mo.tip, side(1) ? Mo.R : null].filter(Boolean);
        const down = (p, k) => [p[0], p[1], p[2] - Mo.drop * k];
        const kOf = p => (p === Mo.tip ? 1 : .35); // the jaw opens most at the front
        const P2 = p => { const q = project(p, cam); return f1(q[0]) + ',' + f1(q[1]); };
        const lower = top.slice().reverse().map(p => down(p, kOf(p)));
        out += `<polygon points="${top.concat(lower).map(P2).join(' ')}" fill="${R}"/>`;
        // teeth hang from the upper line
        let teeth = '';
        for (let i = 0; i < top.length - 1; i++) {
          const a = top[i], b = top[i + 1], n = 3;
          for (let j = 0; j < n; j++) {
            const t0 = j / n, t1 = (j + 1) / n, at3 = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
            const p0 = at3(t0 + .05), p1 = at3(t1 - .05), pm = down(at3((t0 + t1) / 2), .45);
            teeth += `<polygon points="${P2(p0)} ${P2(p1)} ${P2(pm)}" fill="#fff"/>`;
          }
        }
        out += teeth;
      }
      return `<g class="face">${out}</g>`;
    }
    switch (F.expr) {
      case 'joy':
        out += eyes.map(e => P(`M${f1(e[0] - s * .1 * kE)},${f1(e[1] + s * .03)} Q${f1(e[0])},${f1(e[1] - s * .13 * kE)} ${f1(e[0] + s * .1 * kE)},${f1(e[1] + s * .03)}`)).join('') + brows('joy');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .2)},${f1(m[1] - s * .07)} Q${f1(m[0])},${f1(m[1] + s * .32)} ${f1(m[0] + s * .2)},${f1(m[1] - s * .07)} Z`, 0, R)
          + `<ellipse cx="${f1(m[0])}" cy="${f1(m[1] + s * .1)}" rx="${f1(s * .08)}" ry="${f1(s * .045)}" fill="#ef7f86"/>`;
        out += cheeks;
        break;
      case 'surprised':
        out += eyes.map(e => dotEye(e, 1.3)).join('') + brows('surprised');
        if (!F.noMouth) out += `<ellipse cx="${f1(m[0])}" cy="${f1(m[1])}" rx="${f1(s * .07)}" ry="${f1(s * .1)}" fill="${R}"/>`;
        break;
      case 'scared':
        out += eyes.map(e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(s * .12 * kE)}" ry="${f1(s * .16 * kE)}" fill="#fff" stroke="${E}" stroke-width="${f1(s * .03)}"/><circle cx="${f1(e[0])}" cy="${f1(e[1] + s * .02)}" r="${f1(s * .045 * kE)}" fill="${E}"/>`).join('');
        out += brows('scared');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .16)},${f1(m[1])} q${f1(s * .04)},${f1(-s * .06)} ${f1(s * .08)},0 t${f1(s * .08)},0 t${f1(s * .08)},0 t${f1(s * .08)},0`, .045);
        break;
      case 'sad':
        out += eyes.map(e => dotEye(e, .9)).join('') + brows('sad');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .14)},${f1(m[1] + s * .06)} Q${f1(m[0])},${f1(m[1] - s * .08)} ${f1(m[0] + s * .14)},${f1(m[1] + s * .06)}`);
        break;
      default: // happy
        out += eyes.map(e => dotEye(e, 1)).join('') + brows('happy');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .18)},${f1(m[1] - s * .03)} Q${f1(m[0])},${f1(m[1] + s * .15)} ${f1(m[0] + s * .18)},${f1(m[1] - s * .03)}`);
        out += cheeks;
    }
    return `<g class="face">${out}</g>`;
  }

  const LP = { rng, camera, poses, face, project, facets, polys, draw, bounds, hull, castShadow, outline, material, mat, themes, useTheme, make, Mesh, icosphere, cone, cylinder, limb, ring, stitch, fan, hex2rgb, rgb2hex };
  root.LP = LP;
  useTheme('day');
})(typeof window !== 'undefined' ? window : globalThis);
