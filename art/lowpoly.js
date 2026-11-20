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
  const mat = {};
  let theme = themes.day;
  function useTheme(name) { theme = themes[name] || themes.day; Object.assign(mat, theme.mat); LP.theme = theme; return theme; }

  // ---------- mesh ----------
  function Mesh(m, seed) { this.v = []; this.f = []; this.mat = m; this.seed = seed || 1; this.center = null; this.snow = null; }
  Mesh.prototype.add = function (p) { this.v.push(p); return this.v.length - 1; };
  Mesh.prototype.tri = function (a, b, c, m) { this.f.push([a, b, c, m]); return this; };
  Mesh.prototype.map = function (fn) { this.v = this.v.map(fn); if (this.center) this.center = fn(this.center); return this; };
  Mesh.prototype.scale = function (x, y, z) { if (y == null) y = z = x; return this.map(p => [p[0] * x, p[1] * y, p[2] * z]); };
  Mesh.prototype.move = function (x, y, z) {
    if (this.snow) this.snow.z += (z || 0);
    return this.map(p => [p[0] + x, p[1] + y, p[2] + (z || 0)]);
  };
  Mesh.prototype.rotZ = function (t) { const c = Math.cos(t), s = Math.sin(t); return this.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]); };
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
  function cylinder(n, top, m, seed) {
    const mesh = new Mesh(m, seed);
    const A = ring(mesh, n, { r: 1, z: 0 }), B = ring(mesh, n, { r: top, z: 1, off: .5 });
    stitch(mesh, A, B); fan(mesh, mesh.add([0, 0, 1]), B); fan(mesh, mesh.add([0, 0, 0]), A);
    return mesh;
  }
  // a tapered branch from p0 to p1
  function limb(p0, p1, r0, r1, m, seed) {
    const d = sub(p1, p0), L = len(d), dir = norm(d);
    const up = Math.abs(dir[2]) < .9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(dir, up)), v = cross(dir, u);
    return cylinder(5, r1 / r0, m, seed).map(p => [
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
    obj.meshes.forEach(mesh => {
      const m = mesh.mat, rand = rng(mesh.seed * 7919 + 17), part = [];
      let c = mesh.center;
      if (!c) { c = [0, 0, 0]; mesh.v.forEach(p => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }); c = c.map(x => x / mesh.v.length); }
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

  const LP = { rng, camera, project, facets, polys, draw, bounds, hull, castShadow, outline, material, mat, themes, useTheme, make, Mesh, icosphere, cone, cylinder, limb, ring, stitch, fan, hex2rgb, rgb2hex };
  root.LP = LP;
  useTheme('day');
})(typeof window !== 'undefined' ? window : globalThis);
