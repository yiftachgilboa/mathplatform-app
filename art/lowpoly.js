/* kidodo — Soft Low-Poly engine. See art/README.md.
   World: x → right, y → away from the viewer, z → up. Orthographic camera tilted down by `a`.
   Usage: const cam = LP.camera({ox, oy}); svg += LP.draw(LP.make.tree({x, y, seed}), cam) */
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

  // ---------- materials: a ramp dark → light, v = how much each facet wanders along it ----------
  function material(stops, v) { return { stops: stops.map(hex2rgb), v: v == null ? 0.08 : v }; }
  const mat = {
    grass:     material(['#4f7d27', '#7fae33', '#a9cf47', '#d3ea7c'], 0.12),
    grassSide: material(['#3b6322', '#55852b', '#78a835'], 0.06),
    earth:     material(['#4b3324', '#6b4a30', '#8e6440', '#b08257'], 0.10),
    stone:     material(['#3b3631', '#5c544d', '#867d74', '#b0a79c', '#d4cdc3'], 0.09),
    leaf:      material(['#46731f', '#76a62a', '#a2c93b', '#cfe56d'], 0.09),
    pine:      material(['#3a651d', '#649326', '#93bb36', '#c0da5c'], 0.07),
    trunk:     material(['#563823', '#7a5034', '#9f6c46'], 0.05),
    cloud:     material(['#b9d0da', '#dcebf1', '#f7fbfd', '#ffffff'], 0.03),
  };

  // ---------- mesh ----------
  function Mesh(m, seed) { this.v = []; this.f = []; this.mat = m; this.seed = seed || 1; this.center = null; }
  Mesh.prototype.add = function (p) { this.v.push(p); return this.v.length - 1; };
  Mesh.prototype.tri = function (a, b, c, m) { this.f.push([a, b, c, m]); return this; };
  Mesh.prototype.map = function (fn) { this.v = this.v.map(fn); if (this.center) this.center = fn(this.center); return this; };
  Mesh.prototype.scale = function (x, y, z) { if (y == null) y = z = x; return this.map(p => [p[0] * x, p[1] * y, p[2] * z]); };
  Mesh.prototype.move = function (x, y, z) { return this.map(p => [p[0] + x, p[1] + y, p[2] + (z || 0)]); };
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
  function cone(n, m, seed, rand) {
    const mesh = new Mesh(m, seed);
    const base = ring(mesh, n, { r: 1, z: 0, jr: .08, ja: .3 }, rand);
    const midR = ring(mesh, n, { r: .58, z: .42, off: .5, jr: .1, ja: .3 }, rand);
    const apex = mesh.add([(rand() - .5) * .08, (rand() - .5) * .08, 1]);
    const bc = mesh.add([0, 0, 0]);
    stitch(mesh, base, midR); fan(mesh, apex, midR); fan(mesh, bc, base);
    return mesh;
  }
  // unit cylinder z 0 → 1, radius 1 at bottom, `top` at the top
  function cylinder(n, top, m, seed) {
    const mesh = new Mesh(m, seed);
    const A = ring(mesh, n, { r: 1, z: 0 }), B = ring(mesh, n, { r: top, z: 1, off: .5 });
    stitch(mesh, A, B); fan(mesh, mesh.add([0, 0, 1]), B); fan(mesh, mesh.add([0, 0, 0]), A);
    return mesh;
  }

  // ---------- camera & light ----------
  function camera(o) {
    o = o || {};
    const az = (o.lightAz == null ? 222 : o.lightAz) * Math.PI / 180, el = (o.lightEl == null ? 38 : o.lightEl) * Math.PI / 180;
    return {
      a: o.a == null ? 0.42 : o.a, s: o.s || 1, ox: o.ox || 0, oy: o.oy || 0,
      L: norm([Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]),
      vary: o.vary == null ? 1 : o.vary, ambient: o.ambient == null ? 0.12 : o.ambient,
      contrast: o.contrast == null ? 1.3 : o.contrast,
      fogColor: hex2rgb(o.fogColor || '#cdeef2'),
    };
  }
  function project(p, cam) {
    const sa = Math.sin(cam.a), ca = Math.cos(cam.a);
    return [cam.ox + p[0] * cam.s, cam.oy - (p[1] * sa + p[2] * ca) * cam.s, -p[1] * ca + p[2] * sa];
  }

  // ---------- render ----------
  // obj = { meshes: [Mesh], fog?: 0..1 }  →  sorted list of {pts, depth, fill}
  function facets(obj, cam) {
    const out = [], toCam = [0, -Math.cos(cam.a), Math.sin(cam.a)];
    obj.meshes.forEach(mesh => {
      const m = mesh.mat, rand = rng(mesh.seed * 7919 + 17);
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
        const fm = f[3] || m;
        const lam = dot(n, cam.L);
        let t = cam.ambient + (1 - cam.ambient) * Math.max(0, Math.min(1, 0.5 + 0.5 * cam.contrast * lam));
        t += (jit - .5) * 2 * fm.v * cam.vary;
        let col = rampAt(fm.stops, t);
        if (obj.fog) col = mix(col, cam.fogColor, obj.fog);
        const q = [project(p0, cam), project(p1, cam), project(p2, cam)];
        out.push({ pts: q, depth: project(cen, cam)[2], fill: rgb2hex(col) });
      });
    });
    out.sort((a, b) => a.depth - b.depth);
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
  // soft contact shadow on the ground under an object
  function shadow(obj, cam, color, opacity) {
    const p = project([obj.x, obj.y, 0], cam), r = obj.r * cam.s;
    return `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * Math.sin(cam.a) * 1.1).toFixed(1)}" fill="${color || '#2d4d14'}" opacity="${opacity == null ? .2 : opacity}"/>`;
  }

  // ---------- objects (the library starts here) ----------
  const clampD = d => Math.max(0, Math.min(2, d | 0));
  function place(meshes, o, r) {
    meshes.forEach(m => { m.rotZ(o.rot || 0).move(o.x || 0, o.y || 0, o.z || 0); });
    return { meshes, x: o.x || 0, y: o.y || 0, z: o.z || 0, r, fog: o.fog || 0 };
  }
  const make = {
    // boulder with a flat bottom; o.h = height ratio
    rock(o) {
      const S = o.size || 100, rand = rng(o.seed || 1);
      const m = icosphere(clampD(o.detail == null ? 0 : o.detail), o.mat || mat.stone, (o.seed || 1) * 3 + 1).jitter(.26, rand);
      m.scale(1, .85 + rand() * .2, o.h || .8).floor(-.25 * (o.h || .8));
      m.move(0, 0, -m.minZ()).scale(S / 2);
      return place([m], Object.assign({ rot: rand() * 6.28 }, o), S * .5);
    },
    // round-crown tree
    tree(o) {
      const S = o.size || 200, rand = rng(o.seed || 1), d = clampD(o.detail == null ? 1 : o.detail);
      const trunk = cylinder(5, .6, mat.trunk, (o.seed || 1) * 5).scale(S * .05, S * .05, S * .5);
      const crown = icosphere(d, o.mat || mat.leaf, (o.seed || 1) * 5 + 2).jitter(.14, rand).scale(S * .3, S * .27, S * .27).move(0, 0, S * .66);
      const meshes = [trunk, crown];
      if (rand() < .7) meshes.push(icosphere(d, o.mat || mat.leaf, (o.seed || 1) * 5 + 3).jitter(.16, rand).scale(S * .19).move((rand() < .5 ? -1 : 1) * S * .2, -S * .04, S * .52));
      return place(meshes, Object.assign({ rot: rand() * 6.28 }, o), S * .3);
    },
    // tall conifer
    pine(o) {
      const S = o.size || 220, rand = rng(o.seed || 1);
      const trunk = cylinder(5, .7, mat.trunk, (o.seed || 1) * 7).scale(S * .035, S * .035, S * .14);
      const body = cone(6 + (o.detail || 0) * 3, o.mat || mat.pine, (o.seed || 1) * 7 + 1, rand).scale(S * .17, S * .17, S * .9).move(0, 0, S * .1);
      return place([trunk, body], Object.assign({ rot: rand() * 6.28 }, o), S * .16);
    },
    bush(o) {
      const S = o.size || 50, rand = rng(o.seed || 1);
      const m = icosphere(clampD(o.detail || 0), o.mat || mat.leaf, (o.seed || 1) * 11).jitter(.18, rand).scale(1, .9, .7).floor(-.3);
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
    // floating island: grass top, grass lip, earth cone below
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
      return place([m], o, 0);
    },
  };

  root.LP = { rng, camera, project, facets, polys, draw, bounds, shadow, material, mat, make, Mesh, icosphere, cone, cylinder, ring, stitch, fan, hex2rgb, rgb2hex };
})(typeof window !== 'undefined' ? window : globalThis);
