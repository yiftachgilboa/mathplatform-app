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
  themes.day.mat.water = M(['#1b6497', '#2b86bd', '#55acd9', '#a3d8ef'], .05);
  themes.sunset.mat.water = M(['#3a1f55', '#6a2f6e', '#b04a7a', '#f08a7a'], .05);
  themes.ice.mat.water = M(['#4f8fb8', '#7fb4d6', '#b2d6ea', '#e2f1f8'], .04);
  // desert: sand instead of grass, warm red earth, purple shadows (ref 20)
  themes.desert = {
    sky: ['#2a8f9a', '#9fd6c6', '#f6e6b0'], fog: '#f1dcaa', sun: '#fff6d8', glow: '#ffe7a8', shadow: '#5a2450',
    mat: Object.assign({}, themes.day.mat, {
      grass: M(['#b56f34', '#d9944c', '#efb86c', '#fbdb9a'], .1), grassSide: M(['#93522a', '#b46a34', '#d18a48'], .06),
      earth: M(['#5e261c', '#8c3f28', '#b85d36', '#d98652'], .1), stone: M(['#5e3c4a', '#8a5d62', '#b78676', '#dcb196', '#f3d6bb'], .08),
      leaf: M(['#475518', '#6c7f26', '#94a63a', '#c2cd68'], .09), pine: M(['#344516', '#566b22', '#7c9132', '#a8b95a'], .07),
      cloud: M(['#e6cfa6', '#f6e6c8', '#fff7e8', '#ffffff'], .03), snow: M(['#e0c08e', '#f2dcb4', '#fbefd8', '#ffffff'], .04),
      water: M(['#1d7f8a', '#2fa0a8', '#5ac4c4', '#a6e6dc'], .05),
      mountain: M(['#9a4630', '#c46a3c', '#e29356', '#f5be86'], .06), cactus: M(['#1d4f34', '#2c7446', '#46a05a', '#86cc72'], .06),
    }),
  };
  // noir: a detective-film night — indigo sky, a pale moon, cool dark hills; warm windows and the flashlight are the light
  // (the elevator game, approved 24.11.2026)
  themes.noir = {
    sky: ['#161a34', '#2c3260', '#5b5a8c'], fog: '#3f4478', sun: '#f6f0d6', glow: '#c9c4e6', shadow: '#0b0d20',
    mat: Object.assign({}, themes.day.mat, {
      grass: M(['#1f3550', '#2f4d68', '#466a80', '#6d93a0'], .1), grassSide: M(['#1a2c48', '#27415e', '#385a74'], .06),
      earth: M(['#1c1d38', '#2c2d52', '#44446e', '#66648c'], .08), stone: M(['#23264a', '#363a66', '#545a88', '#8085ac', '#b0b4d0'], .07),
      leaf: M(['#17394a', '#235463', '#37777d', '#62a29c'], .09), leafTeal: M(['#152f52', '#22486e', '#386a8c', '#669ab0'], .09),
      pine: M(['#152c46', '#21435e', '#365f78', '#5d8a9a'], .07), trunk: M(['#1e1a34', '#332a4c', '#4c4066'], .05),
      cloud: M(['#3a3f70', '#4f5488', '#6d70a2', '#9492bd'], .03), snow: M(['#5a6096', '#8086b6', '#a9aed2', '#d6d9ee'], .04),
      mountain: M(['#232750', '#353b6c', '#4c5288', '#6c72a4'], .05), water: M(['#152a58', '#234a80', '#3f74a8', '#7fb0d0'], .05),
    }),
  };
  // spider world (twins game, portrait phones — approved 28.11.2026): dusk between purple and orange. Plum moss on dark
  // violet earth, purple hills in a warm fog, an orange sun; glowing orange toadstools and violet crystals are its own things
  themes.spider = {
    sky: ['#2a1640', '#7c3a78', '#f2914c'], fog: '#9c4f78', sun: '#ffcf80', glow: '#ff9a4a', shadow: '#16081f',
    mat: Object.assign({}, themes.day.mat, {
      grass: M(['#4a2050', '#7a3366', '#b4507a', '#e98576'], .1), grassSide: M(['#341540', '#55245c', '#7a3a70'], .06),
      earth: M(['#1c0f2c', '#2f1a44', '#48285e', '#6a3c7a'], .08), stone: M(['#2a1a40', '#46295c', '#6c4078', '#a0608e', '#dc9294'], .08),
      leaf: M(['#33184a', '#552a64', '#843f76', '#bd5f84'], .09), leafTeal: M(['#2c1a50', '#46296c', '#6c408a', '#9e62a6'], .09),
      leafYellow: M(['#5a2440', '#8c3a52', '#c45e5c', '#f08c66'], .09), autumn: M(['#6a2a2a', '#a8452e', '#e0703a', '#ffa65a'], .1),
      pine: M(['#26123a', '#3e1f52', '#5f326c', '#8d4c86'], .07), trunk: M(['#1a0f24', '#2e1c3a', '#4a2e52'], .05),
      cloud: M(['#7a3a6c', '#b55a78', '#ec8a7c', '#ffbf98'], .04), snow: M(['#9a5482', '#cd7a92', '#f4a89e', '#ffd6be'], .04),
      mountain: M(['#36184c', '#582a66', '#87437a', '#bd6688'], .05), water: M(['#2a1440', '#5c2c6c', '#a24c7a', '#f08c6c'], .05),
      cactus: M(['#2a1640', '#4a2556', '#7a3a66', '#b05a74'], .06),
      glowcap: M(['#8a2e12', '#d45a1e', '#f78e30', '#ffc970'], .05), crystal: M(['#3a1c5e', '#6a36a0', '#a066d6', '#e0b8ff'], .05),
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
    // buildings (toy village)
    plaster: M(['#b39b7c', '#d8c4a6', '#efe0c8', '#fff6e4'], .08), masonry: M(['#5e5a57', '#87817a', '#b1a99f', '#d6cfc4'], .08),
    roofRed: M(['#6e2419', '#a63a28', '#d45a3a', '#ef8a5c'], .06), roofBlue: M(['#1d3a66', '#2c5694', '#4a7cc2', '#83abe0'], .06),
    roofGreen: M(['#24502a', '#357a3b', '#55a454', '#94cf82'], .06), glass: M(['#16304f', '#24507e', '#3f78ad', '#86b6de'], .03),
    flag: M(['#8f1c22', '#cf3535', '#ef5c55', '#ff8d80'], .03),
    // city + materials
    towerBlue: M(['#1f3a5c', '#2e557f', '#4a7aa8', '#86b0d6'], .04), coral: M(['#9c3f38', '#d8635a', '#f08c80', '#ffbcae'], .04),
    teal: M(['#0e4c4c', '#16706c', '#2aa39a', '#7fd6c8'], .04), violet: M(['#3c2a5c', '#5e4488', '#8a6ab8', '#c2a6e6'], .04),
    windowDark: M(['#121a2b', '#1c2840', '#2b3c5e'], .02), windowLight: M(['#b8a776', '#e2d29e', '#f8eec8'], .02),
    marble: M(['#8e949c', '#c4c9cf', '#e6e9ec', '#ffffff'], .04), ice: M(['#6ea6c8', '#9ccbe4', '#cbe6f4', '#f2faff'], .05),
    sandstone: M(['#86663f', '#b38d58', '#d6b47b', '#efd5a0'], .06),
    marbleWarm: M(['#9c8f80', '#cdbfae', '#e7dccd', '#fbf4ea'], .03), marbleShade: M(['#8a8f96', '#a9aeb5', '#c3c7cc', '#d8dbdf'], .02),
    sandstoneLight: M(['#9e8256', '#c9a873', '#e4c995', '#f6e3b8'], .04), sandstoneShade: M(['#7a5d3a', '#9c7a50', '#b8956a', '#cfae82'], .03),
    stoneDark: M(['#241a12', '#3a2c21', '#524032'], .02),
    officeWhite: M(['#b9c0c8', '#e3e7ec', '#f6f8fa', '#ffffff'], .02),
    plasterShade: M(['#a38e70', '#c4af8f', '#dcc9a9', '#eee2ca'], .02), mushroom: M(['#7e1c1c', '#c43a2e', '#e8604a', '#ff9078'], .05),
    ballWhite: M(['#b9bec4', '#dfe2e6', '#f4f6f8', '#ffffff'], .02), basket: M(['#9a3f0e', '#d4621c', '#f08a3c', '#ffb878'], .03),
    // animals and creatures (identity colors)
    dark: M(['#1c1d21', '#2f3137', '#474a52'], .03), white: M(['#b9bec4', '#dcdfe3', '#f2f4f6', '#ffffff'], .03),
    pink: M(['#c77c86', '#e8a0aa', '#f7c4ca'], .03), beak: M(['#9a5a0e', '#d48a1e', '#f2b544'], .03),
    bearFur: M(['#3b2416', '#5e3a22', '#87573a', '#b07b55'], .06), bearLight: M(['#9a7a5a', '#c8a47c', '#e6c9a0', '#f6e2c2'], .05),
    foxFur: M(['#8a3412', '#c9531c', '#ee7a32', '#ffad66'], .06), rabbitFur: M(['#6b5442', '#94765e', '#b89a80', '#d9bfa5'], .06),
    birdBlue: M(['#173c78', '#2563b0', '#3f86d6', '#86c4f2'], .07), birdBelly: M(['#c06a1c', '#e8902e', '#f6b356', '#ffd690'], .05),
    monster: M(['#2f1846', '#52287a', '#7a42a8', '#a874d1'], .07), monsterBelly: M(['#5b7a12', '#86a822', '#b2cf3a', '#dcef7a'], .05),
    horn: M(['#8a7a5c', '#bfae88', '#e6d9b8', '#fbf3dc'], .04),
    // detective and his tower
    trench: M(['#5f4a33', '#937452', '#bf9d72', '#e6cb9e'], .04), felt: M(['#1b1d26', '#31343f', '#4c505e', '#727786'], .04),
    brick: M(['#5a2a3a', '#8c4450', '#b86a66', '#dd9a88'], .03), iron: M(['#1d2230', '#333b4c', '#525d72', '#8490a6'], .03),
    cork: M(['#26231f', '#3a342e', '#50483f', '#6b6156'], .03), lampLight: M(['#b8923a', '#eac55a', '#fbe391', '#fff6cf'], .02),
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
  Mesh.prototype.rotY = function (t) { const c = Math.cos(t), s = Math.sin(t); return this.map(p => [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c]); };
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
    // o.kind: 'round' (one big puff with two small ones, round underneath), 'long' (a low row of small puffs),
    // 'tall' (a puff stacked on a puff). No kind = the original flat-bottomed cloud.
    cloud(o) {
      const S = o.size || 160, rand = rng(o.seed || 1), meshes = [], d = clampD(o.detail || 0), sd = (o.seed || 1) * 13;
      const puff = (i, r, x, y, z, fl) => { const m = icosphere(d, mat.cloud, sd + i).jitter(.1, rand).floor(fl).scale(r).move(x, y, z); meshes.push(m); };
      if (o.kind === 'round') { puff(0, S * .3, 0, 0, S * .05, -.75); puff(1, S * .19, -S * .3, S * .03, -S * .02, -.7); puff(2, S * .17, S * .29, -S * .02, -S * .03, -.7); return place(meshes, o, 0); }
      if (o.kind === 'long') { const k = 5 + Math.floor(rand() * 2); for (let i = 0; i < k; i++) { const t = i / (k - 1) - .5; puff(i, S * (.11 + (1 - Math.abs(t) * 2) * .07 + rand() * .03), t * S * 1.1, (rand() - .5) * S * .08, (rand() - .5) * S * .03, -.65); } meshes.forEach(m => m.scale(1, 1, .8)); return place(meshes, o, 0); }
      if (o.kind === 'tall') { puff(0, S * .24, 0, 0, 0, -.75); puff(1, S * .18, S * .08, S * .02, S * .26, -.6); puff(2, S * .14, -S * .22, -S * .02, -S * .05, -.7); return place(meshes, o, 0); }
      const n = 3 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const k = 1 - Math.abs(i - (n - 1) / 2) / n;
        const m = icosphere(clampD(o.detail || 0), mat.cloud, (o.seed || 1) * 13 + i).jitter(.12, rand).floor(-.35);
        m.scale(S * .22 * (.7 + k * .6)).move((i - (n - 1) / 2) * S * .22, (rand() - .5) * S * .1, 0);
        meshes.push(m);
      }
      return place(meshes, o, 0);
    },
    // a row of mountain peaks (background). o.width, o.h, o.count, o.snow (0..1 of height, false = none), o.skirt (extend down)
    ridge(o) {
      const W = o.width || 1400, H = o.h || 260, n = o.count || 6, rand = rng(o.seed || 1), meshes = [];
      for (let i = 0; i < n; i++) {
        const w = W / n * (.75 + rand() * .6), h = H * (.55 + rand() * .45);
        const m = cone(5, o.mat || mat.mountain, (o.seed || 1) * 19 + i, rand, .55).scale(w * .95, w * .4, h);
        // o.skirt: the base ring goes further down along the same slope (the mountain continues below the frame)
        if (o.skirt) { const k = 1 + o.skirt / h; m.map(p => (p[2] < 1e-6 ? [p[0] * k, p[1] * k, -o.skirt] : p)); }
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
  // facet: true → each side gets two jittered inner points at different depths → 6 triangles in varied shades
  // (the triangle-faceted facades of the city references), instead of 4 even facets
  function box(w, d, h, m, seed, bulge, facet) {
    const mesh = new Mesh(m, seed), b = (bulge == null ? .06 : bulge) * Math.min(w, d, h), rand = rng((seed || 1) * 131 + 7);
    const X = [-w / 2, w / 2], Y = [-d / 2, d / 2], Z = [0, h], c = {};
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) c[i + '' + j + k] = mesh.add([X[i], Y[j], Z[k]]);
    const side = (a, b2, c2, d2, n) => {
      const ps = [a, b2, c2, d2].map(i => mesh.v[i]);
      if (facet) {
        let q = [a, b2, c2, d2];
        if (rand() < .5) q = [b2, c2, d2, a]; // random diagonal
        const P = q.map(i => mesh.v[i]);
        const pt = (t, dep) => {
          const jx = (rand() - .5) * .22, jy = (rand() - .5) * .22;
          const x = P[0][0] + (P[2][0] - P[0][0]) * t, y = P[0][1] + (P[2][1] - P[0][1]) * t, z = P[0][2] + (P[2][2] - P[0][2]) * t;
          const u = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], v = [P[3][0] - P[0][0], P[3][1] - P[0][1], P[3][2] - P[0][2]];
          return mesh.add([x + u[0] * jx + v[0] * jy + n[0] * b * dep, y + u[1] * jx + v[1] * jy + n[1] * b * dep, z + u[2] * jx + v[2] * jy + n[2] * b * dep]);
        };
        const p1 = pt(.33 + (rand() - .5) * .1, .4 + rand() * 1.2), p2 = pt(.67 + (rand() - .5) * .1, .4 + rand() * 1.2);
        mesh.tri(q[0], q[1], p1).tri(q[1], p2, p1).tri(q[1], q[2], p2).tri(q[2], q[3], p2).tri(q[3], p1, p2).tri(q[3], q[0], p1);
        return;
      }
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
  // a band that wraps a box drawn on top of it: drop its side faces (±x), which would sit inside the box and show as grey panels
  const noEnds = mesh => { mesh.f = mesh.f.filter(f => { const a = mesh.v[f[0]], n = norm(cross(sub(mesh.v[f[1]], a), sub(mesh.v[f[2]], a))); return Math.abs(n[0]) < .7; }); return mesh; };
  // a band around the body: only its front and back strips (its top would show through the lid, its sides through the body)
  const frontBack = mesh => { mesh.f = mesh.f.filter(f => { const a = mesh.v[f[0]], n = norm(cross(sub(mesh.v[f[1]], a), sub(mesh.v[f[2]], a))); return Math.abs(n[1]) > .7; }); return mesh; };
  // an open tube: drop the two caps (a band around a coat or a hat)
  const noCaps = mesh => { mesh.f = mesh.f.filter(f => { const a = mesh.v[f[0]], n = norm(cross(sub(mesh.v[f[1]], a), sub(mesh.v[f[2]], a))); return Math.abs(n[2]) < .8; }); return mesh; };
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
  // a whole material from one color: dark → base → light, so a color item is just one hex value
  const toHsl = h => {
    const [r, g, b] = hex2rgb(h).map(v => v / 255), M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m, l = (M + m) / 2;
    return [d ? (M === r ? ((g - b) / d + 6) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 : 0, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
  };
  const fromHsl = (h, s, l) => '#' + [0, 8, 4].map(n => {
    const k = (n + h / 30 + 12) % 12, v = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('');
  const dyes = {};
  function dye(c) {
    if (dyes[c]) return dyes[c];
    const [h, s, l] = toHsl(c);
    return dyes[c] = material([fromHsl(h - 4, s, l * .58), fromHsl(h, s, l * .88), c, fromHsl(h + 4, s, l + (1 - l) * .42)], .04);
  }
  // the same color, darker (k < 1)
  function shade(c, k) { const [h, sa, l] = toHsl(c); return fromHsl(h, sa, l * k); }

  Object.assign(make, {
    // treasure chest. o.open = lid angle in radians (0 closed, ~2 wide open)
    chest(o) {
      const S = o.size || 120, seed = o.seed || 1, w = S, d = S * .62, h = S * .5, lh = S * .26, phi = o.open || 0;
      const meshes = [box(w, d, h, mat.wood, seed * 41, .08)];
      [-1, 1].forEach((s, i) => { const b = frontBack(box(w * .09, d * 1.04, h * 1.02, mat.metal, seed * 41 + 1 + i, .04)).move(s * w * .32, 0, 0); b.bias = S; meshes.push(b); });
      const lid = hingeX(lidPrism(w * 1.02, d * 1.02, lh, 4, mat.wood, seed * 41 + 3, mat.woodInner).move(0, 0, h), d * .51, h, phi);
      meshes.push(lid);
      [-1, 1].forEach((s, i) => {
        const band = hingeX(noEnds(lidPrism(w * .09, d * 1.06, lh * 1.05, 4, mat.metal, seed * 41 + 4 + i)).move(s * w * .32, 0, h), d * .53, h, phi);
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
    // gift chest: the treasure chest in gift wrap. o.color (hex) or o.mat = the paper, o.ribbon = the ribbon's material,
    // o.open like the chest (same body, same lid, same hinge, so every chest animation works on it)
    giftChest(o) {
      const S = o.size || 120, seed = o.seed || 1, w = S, d = S * .62, h = S * .5, lh = S * .26, phi = o.open || 0;
      const m = o.mat || dye(o.color || '#ef5c55'), rb = o.ribbon || mat.white, dark = k => { const c = shade(o.color || '#ef5c55', k); return material([c, c], .02); }, inner = o.inner || dye(shade(o.color || '#ef5c55', .5));
      const body = box(w, d, h, m, seed * 41, .08), meshes = [body];
      const strip = frontBack(box(w * .15, d * 1.04, h * 1.02, rb, seed * 41 + 1, .04)); strip.bias = S; meshes.push(strip);
      // (colors of the inside come from the paper, so every box is dark in its own color)
      const onLid = (mesh, bias) => { const q = hingeX(mesh, d * .51, h, phi); q.bias = bias; meshes.push(q); };
      onLid(lidPrism(w * 1.06, d * 1.06, lh, 4, m, seed * 41 + 3, inner).move(0, 0, h), phi > .05 && phi < .9 ? S * 1.5 : 0);
      onLid(noEnds(lidPrism(w * .15, d * 1.1, lh * 1.05, 4, rb, seed * 41 + 4)).move(0, 0, h), phi > .9 ? S * .3 : S * 2);
      // the bow: two loops, two short tails and a knot, on the top of the lid (it swings with the lid)
      const top = h + lh, part = (x, z, rx, rz, tilt, k) => onLid(icosphere(0, rb, seed * 41 + 10 + k).scale(S * rx, S * .075, S * rz).rotY(tilt)
        .move(S * x, -d * .04, top + S * z), (phi > .9 ? -S * 4 : S * 3) + k); // the open lid hides the bow
      part(-.15, .1, .15, .085, .5, 0); part(.15, .1, .15, .085, -.5, 1); part(0, .04, .062, .062, 0, 2);
      if (phi > .05) { // the dark inside, seen between the rims: deeper (darker) toward the back wall
        const iw = w * .47, zi = h + S * .045, strips = [[-.46, -.2, .4], [-.2, .12, .3], [.12, .47, .22]];
        strips.forEach(([y0, y1, k], n) => {
          const q = new Mesh(dark(k), seed * 41 + 20 + n);
          const a = q.add([-iw, d * y0, zi]), b = q.add([iw, d * y0, zi]), e = q.add([iw, d * y1, zi]), f = q.add([-iw, d * y1, zi]);
          q.tri(a, b, e); q.tri(a, e, f); q.center = [0, 0, 0]; q.bias = S * .6 + n; meshes.push(q);
        });
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
  // Game style (approved): big head with a front face (eyes + big brows), small body, NO mouth — the snout is the mouth,
  // and it is big and exaggerated. Signature parts stay big. The monster keeps its toothed jaw on the snout (its roar).
  const BIG = { face: 'buddy', noMouth: true, eyeK: 1.25 };
  const SPECIES = {
    fox:     Object.assign({}, BIG, { body: [.26, .4, .26], leg: [.17, .048], head: [.4, .36, .36], headAt: [.22, .36], snout: [.36, .13], snoutAt: [.62, .3],
               ears: 'pointed', earK: 1.9, tail: 'bushy', tailK: 1.25, tailUp: true, fur: 'foxFur', light: 'white', legMat: 'dark',
               eye: [.9, .36, .2], headPatch: { dir: [0, -.5, -.86], th: .5 }, browColor: '#3a1a0c' }),
    bear:    Object.assign({}, BIG, { body: [.36, .44, .34], leg: [.15, .075], head: [.43, .39, .39], headAt: [.2, .34], snout: [.24, .17], snoutAt: [.6, .32],
               ears: 'round', earK: 1.7, tail: 'stub', fur: 'bearFur', light: 'bearLight', eye: [.9, .38, .24], browColor: '#1f1108' }),
    rabbit:  Object.assign({}, BIG, { body: [.3, .36, .3], leg: [.1, .065], head: [.4, .37, .37], headAt: [.16, .34], snout: [.16, .13], snoutAt: [.62, .34],
               ears: 'long', earK: 1.45, tail: 'puff', fur: 'rabbitFur', light: 'white', nose: 'pink', eye: [.9, .38, .2],
               headPatch: { dir: [0, -.5, -.86], th: .55 }, browColor: '#4a3626' }),
    monster: { body: [.4, .5, .38], leg: [.2, .1], head: [.46, .42, .4], headAt: [.24, .32], snout: [.32, .19], snoutAt: [.6, .32],
               ears: 'horns', earK: 1.35, tail: 'long', fur: 'monster', light: 'monsterBelly', plates: true, face: 'monster', eye: [.86, .42, .28] },
    // classic proportions (approved sample 4) — for large illustrations
    bearClassic:    { body: [.52, .8, .5], leg: [.3, .085], head: [.3, .27, .26], headAt: [.45, .3], snout: [.15, .09], ears: 'round', tail: 'stub', fur: 'bearFur', light: 'bearLight', face: 'animal' },
    foxClassic:     { body: [.3, .78, .3], leg: [.34, .042], head: [.2, .22, .18], headAt: [.46, .26], snout: [.22, .065], ears: 'pointed', tail: 'bushy', fur: 'foxFur', light: 'white', legMat: 'dark', face: 'animal' },
    rabbitClassic:  { body: [.44, .6, .44], leg: [.12, .07], head: [.25, .24, .23], headAt: [.33, .3], snout: [.07, .075], ears: 'long', tail: 'puff', fur: 'rabbitFur', light: 'white', face: 'animal' },
    monsterClassic: { body: [.62, .9, .55], leg: [.32, .11], head: [.36, .34, .3], headAt: [.5, .28], snout: [.12, .15], ears: 'horns', tail: 'long', fur: 'monster', light: 'monsterBelly', plates: true, face: 'monster' },
  };
  SPECIES.foxBig = SPECIES.fox; // name used by the first test page
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
    const nose = icosphere(0, mat[sp.nose] || mat.dark, seed * 79 + 33).scale(sp.snout[1] * S * (sp.noMouth ? .7 : .55)).move(s1[0], s1[1] - sp.snout[1] * S * .1, s1[2] + sp.snout[1] * S * .15); nose.bias = S * .1; meshes.push(nose);
    // ears / horns
    [-1, 1].forEach((sx, i) => {
      const eK = sp.earK || 1;
      if (sp.ears === 'round') meshes.push(icosphere(0, fur, seed * 79 + 40 + i).scale(.07 * S * eK, .035 * S * eK, .07 * S * eK).move(sx * hw * S * .62, hc[1] + hl * S * .1, hc[2] + hh * S * .78));
      if (sp.ears === 'pointed') meshes.push(cone(4, fur, seed * 79 + 40 + i, rand, .5).scale(.06 * S * eK, .03 * S * eK, .14 * S * eK).move(sx * hw * S * .5, hc[1] + hl * S * .05, hc[2] + hh * S * .55));
      if (sp.ears === 'long') {
        const b = [sx * hw * S * .35, hc[1] + .02 * S, hc[2] + hh * S * .7], tp = [b[0] + sx * .07 * S * eK, b[1] + .06 * S * eK, b[2] + .4 * S * eK];
        meshes.push(limb(b, tp, .045 * S * eK, .02 * S * eK, fur, seed * 79 + 40 + i, 5));
        const inner = limb([b[0], b[1] - .016 * S * eK, b[2] + .03 * S], [tp[0], tp[1] - .016 * S * eK, tp[2] - .03 * S * eK], .028 * S * eK, .01 * S * eK, mat.pink, seed * 79 + 42 + i, 4);
        inner.bias = S * .05; meshes.push(inner);
      }
      if (sp.ears === 'horns') meshes.push(limb([sx * hw * S * .45, hc[1], hc[2] + hh * S * .6], [sx * hw * S * (1 + .3 * (eK - 1)), hc[1] + .02 * S, hc[2] + hh * S * (.6 + 1.1 * eK)], .05 * S * eK, .006 * S, mat.horn, seed * 79 + 40 + i, 5));
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
      // mouth line in 3D along the lower half of the snout: corners where the snout leaves the head, tip just behind the nose
      mouth: { L: W([-sr * .9, s0[1] - sr * .15, s0[2] - sr * .3]), tip: W([0, s1[1] + sr * .1, s1[2] - sr * .3]), R: W([sr * .9, s0[1] - sr * .15, s0[2] - sr * .3]), drop: sr * (.25 + 1.1 * (o.roar || 0)) } };
    return obj;
  };
  // small bird: egg body, head, beak, wings, fan tail, thin legs; hops and pecks
  make.bird = function (o) {
    const S = o.size || 80, seed = o.seed || 1, t = o.t || 0, rand = rng(seed * 83), d = clampD(o.detail == null ? 1 : o.detail);
    const fur = o.mat || mat.birdBlue, hop = Math.max(0, Math.sin(t * 5)) * (Math.sin(t * 1.3) > .3 ? .12 * S : 0), meshes = [];
    // o.big: big-head test — small body, huge head with a front face; beak, wings, fan tail and thin legs stay
    const big = o.big !== false;
    const B = big
      ? { zc: .3, body: [.17, .2, .17], hc: [-.06, .33], hr: [.3, .28, .28], peck: .05, beak: [.2, .6, .14], wing: [.05, .17, .11, .17], hipZ: .13, tail: [.14, .34, .3, .09] }
      : { zc: .42, body: [.22, .3, .23], hc: [-.22, .22], hr: [.15, .15, .14], peck: .12, beak: [.11, .27, .05], wing: [.05, .24, .13, .2], hipZ: .18, tail: [.24, .5, .14, .07] };
    const zc = S * B.zc + hop, peck = Math.max(0, Math.sin(t * 1.3 + 2)) * .5;
    const body = icosphere(d, fur, seed * 83 + 1).jitter(.05, rand).scale(S * B.body[0], S * B.body[1], S * B.body[2]).move(0, 0, zc);
    body.patch = { mat: o.belly || mat.birdBelly, dir: [0, -.6, -.8], th: .35 };
    const hc = [0, S * B.hc[0], zc + S * B.hc[1] - peck * S * B.peck];
    const head = icosphere(d, fur, seed * 83 + 2).jitter(.04, rand).scale(S * B.hr[0], S * B.hr[1], S * B.hr[2]).move(hc[0], hc[1], hc[2]);
    if (big) head.patch = { mat: o.belly || mat.birdBelly, dir: [0, -.45, -.9], th: .55 };
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
    obj.face = big
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
    obj.face = { c: [obj.x, obj.y, obj.z + hc[2]], r: hr, k: [.92, 1, .95], f: [Sn, -C, 0], u: [C, Sn, 0], style: 'cyclops', gaze: o.gaze, blink: o.blink, talk: o.talk, brows: o.brows, expr: o.expression };
    return obj;
  };

  // spider monster (twins game, portrait phones — approved 28.11.2026): the monster's colors (purple fur, green-yellow belly
  // and plates, horn fangs). A big front head with three yellow eyes and angry brows; the abdomen above and behind it, where
  // the thread is tied (it comes down head first). Eight legs bent up at the knee, wriggling (t). roar 0..1 spreads the fangs
  // and opens the mouth. obj.top = the point where the thread is tied (for the game's line).
  make.spider = function (o) {
    const S = o.size || 100, seed = o.seed || 1, t = o.t || 0, rand = rng(seed * 97), d = clampD(o.detail == null ? 1 : o.detail);
    const fur = mat.monster, light = mat.monsterBelly, roar = o.roar || 0, meshes = [], sway = Math.sin(t * 1.6) * .02 * S;
    const hr = S * .25, hc = [sway * .5, 0, S * .34];
    const head = icosphere(d, fur, seed * 97 + 1).jitter(.05, rand).scale(hr * 1.06, hr * .95, hr).move(hc[0], hc[1], hc[2]);
    head.patch = { mat: light, dir: [0, -.25, -1], th: .74 };
    const ac = [sway, S * .2, S * .7], ar = S * .28;
    const abd = icosphere(d, fur, seed * 97 + 2).jitter(.06, rand).scale(ar, ar * .95, ar * 1.08).move(ac[0], ac[1], ac[2]);
    abd.patch = { mat: light, dir: [0, -1, .1], th: .9 };
    meshes.push(abd, limb([hc[0], hc[1] + hr * .3, hc[2] + hr * .4], [ac[0], ac[1] - ar * .3, ac[2] - ar * .4], hr * .4, ar * .35, fur, seed * 97 + 3), head);
    // back plates along the top of the abdomen (the monster's signature)
    for (let i = 0; i < 4; i++) {
      const a = -.5 + i * .42, k = 1 - Math.abs(i - 1.5) / 4;
      const pl = cone(4, light, seed * 97 + 10 + i, rand, .45).scale(.05 * S * k, .022 * S, .12 * S * k).move(ac[0], ac[1] + Math.sin(a) * ar * .9, ac[2] + Math.cos(a) * ar * 1.02);
      pl.bias = S * .05; meshes.push(pl);
    }
    // legs: hip on the head's side, knee up and out, foot down and out; each pair wriggles a little out of step
    [-1, 1].forEach(sx => {
      for (let i = 0; i < 4; i++) {
        const w1 = Math.sin(t * 7 + i * 1.3 + (sx > 0 ? 1.7 : 0)) * .03 * S, w2 = Math.cos(t * 6 + i * 1.1 + (sx > 0 ? .6 : 0)) * .035 * S;
        // fanned out so all four show from the front: the first pair high, the last low
        const fi = [.85, .35, -.1, -.55][i], hip = [hc[0] + sx * hr * .8, hc[1] + (-.06 + i * .06) * S, hc[2] + (.06 - i * .04) * S];
        const knee = [hip[0] + sx * Math.cos(fi) * .28 * S, hip[1] + (i - 1.5) * .07 * S, hip[2] + Math.sin(fi) * .28 * S + .07 * S + w1 + roar * .05 * S];
        const foot = [knee[0] + sx * (.13 + i * .015) * S, knee[1] + (i - 1.5) * .05 * S, knee[2] - (.3 - i * .03) * S + w2];
        [limb(hip, knee, .042 * S, .034 * S, fur, seed * 97 + 20 + i * 2 + (sx > 0 ? 9 : 0), 5),
          limb(knee, foot, .032 * S, .01 * S, fur, seed * 97 + 21 + i * 2 + (sx > 0 ? 9 : 0), 5),
          icosphere(0, fur, seed * 97 + 40 + i + (sx > 0 ? 9 : 0)).scale(.046 * S).move(knee[0], knee[1], knee[2])]
          .forEach((m, j) => { m.group = 'leg' + sx + i; m.order = j; meshes.push(m); });
      }
    });
    // fangs below the face
    [-1, 1].forEach((sx, i) => {
      const f = limb([hc[0] + sx * .07 * S, hc[1] - hr * .78, hc[2] - .1 * S], [hc[0] + sx * (.05 + roar * .06) * S, hc[1] - hr * .95, hc[2] - .27 * S], .038 * S, .006 * S, mat.horn, seed * 97 + 60 + i, 5);
      f.bias = S * .08; meshes.push(f);
    });
    const obj = place(meshes, Object.assign({ rot: 0 }, o), S * .3, { ordered: 'depth' });
    const r = o.rot || 0, C = Math.cos(r), Sn = Math.sin(r), W = p => [obj.x + p[0] * C - p[1] * Sn, obj.y + p[0] * Sn + p[1] * C, obj.z + p[2]];
    obj.top = W([ac[0], ac[1], ac[2] + ar * 1.08]);
    obj.face = { c: W(hc), r: hr * 1.06, k: [.95 / 1.06, 1, 1 / 1.06], f: [Sn, -C, 0], u: [C, Sn, 0], style: 'spider', roar,
      gaze: o.gaze, blink: o.blink, brows: o.brows };
    return obj;
  };
  Object.assign(make, {
    // glowing toadstools (the spider world — approved 28.11.2026): two or three pale stalks with round orange caps
    toadstool(o) {
      const S = o.size || 50, seed = o.seed || 1, rand = rng(seed * 101), cap = o.mat || mat.glowcap || mat.mushroom, meshes = [];
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const k = i ? .5 + rand() * .3 : 1, x = i ? (rand() < .5 ? -1 : 1) * S * (.25 + rand() * .15) : 0, y = i ? (rand() - .3) * S * .25 : 0, h = S * .55 * k;
        meshes.push(limb([x, y, 0], [x, y, h], S * .07 * k, S * .055 * k, mat.white, seed * 101 + i * 3, 5));
        meshes.push(icosphere(0, cap, seed * 101 + i * 3 + 1).jitter(.08, rand).floor(-.15).scale(S * .24 * k, S * .24 * k, S * .17 * k).move(x, y, h - S * .02 * k));
      }
      return place(meshes, Object.assign({ rot: rand() * 6.28 }, o), S * .3, { ordered: 'depth' });
    },
  });

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
    // a hand scratches the head (confused)
    think: t => ({ sideR: 2.0, armR: .35, elbowR: .25, elbowSideR: 1.15 + .16 * Math.sin(t * 11), armL: .05, sideL: .25, elbowL: .25, bob: .004 * Math.sin(t * 2.2) }),
    // the right arm points a flashlight: o.aim = the angle on the screen (0 → right, π/2 → up)
    aim: (t, o) => ({ sideR: (o && o.aim != null ? o.aim : .6) + Math.PI / 2 - .35, armR: .12, elbowR: .12, armL: .3, sideL: .45, elbowL: 1.25, bob: .004 * Math.sin(t * 2.2) }),
    wave: t => ({ sideR: 2.1, armR: .2, elbowR: .1, elbowSideR: .75 + .4 * Math.sin(t * 8), armL: .05, elbowL: .25, bob: .004 * Math.sin(t * 2.2) }),
  };
  const poseExpression = { stand: 'happy', walk: 'happy', jump: 'joy', cheer: 'joy', scared: 'scared', wave: 'happy', think: 'puzzled' };

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

  // hats for the head-body character: kind cap | party | crown, mat = the hat's material
  function hatMeshes(hat, H, rx, ry, rz, zc, seed) {
    const m = hat.mat || mat.shirt, sd = seed * 37 + 120, rand = rng(sd), top = zc + rz;
    const ball = (x, y, z, r, mm, k) => icosphere(0, mm, sd + k).scale(r * H).move(x, y, z);
    if (hat.kind === 'cap') {
      const dome = icosphere(1, m, sd), cut = new Set();
      dome.v = dome.v.map((p, i) => { const z0 = .5 - .16 * p[1]; if (p[2] < z0) { cut.add(i); return [p[0], p[1], z0]; } return p; });
      dome.f = dome.f.filter(f => !(cut.has(f[0]) && cut.has(f[1]) && cut.has(f[2])));
      dome.center = [0, 0, 0];
      dome.scale(rx * 1.16, ry * 1.17, rz * 1.12).move(0, ry * .03, zc);
      const visor = icosphere(0, m, sd + 1).scale(rx * .72, ry * .55, .03 * H).map(p => [p[0], p[1] - ry * .95, p[2] + zc + rz * .72 + p[1] * .12]);
      return [dome, visor, ball(0, ry * .03, zc + rz * 1.13, .04, m, 2)];
    }
    if (hat.kind === 'party') {
      const c = cone(7, m, sd, rand, .55).scale(rx * .62, ry * .62, .46 * H).move(0, 0, top - .07 * H);
      return [c, ball(0, 0, top + .4 * H, .075, mat.white, 3)];
    }
    // crown
    const n = 6, R = rx * .66, band = cylinder(n * 2, 1.06, m, sd, m).scale(R, R * .95, .13 * H).move(0, 0, top - .08 * H), out = [band];
    for (let i = 0; i < n; i++) {
      const a = (i + .5) / n * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R * .95;
      out.push(limb([x * .95, y * .95, top + .02 * H], [x * 1.12, y * 1.12, top + .17 * H], .075 * H, .012 * H, m, sd + 10 + i, 4));
    }
    return out;
  }

  // head-body character: one big egg from the legs to the top of the head, so the face is as big as possible
  // (readable small in a game). Same skeleton and poses as the kid. o.outfit:
  //   none     - red player: light face oval + tuft
  //   'kid'    - skin head, hair cap, shirt and pants as color bands on the egg, sleeves, pants legs
  //   'wizard' - robe-colored egg, skin face, big white beard, pointed hat, white brows, staff
  //   'detective' - taller; trench coat (skirt, belt, collar), fedora, thick moustache, narrowed eyes, flashlight in the right
  //              hand (pose 'aim', o.aim). obj.tip = the flashlight's tip in the world, for the beam.
  make.buddy = function (o) {
    const H = o.size || 160, seed = o.seed || 1, d = clampD(o.detail == null ? 1 : o.detail), outfit = o.outfit;
    const P = Object.assign({ legL: 0, legR: 0, kneeL: 0, kneeR: 0, armL: 0, armR: 0, elbowL: .2, elbowR: .2, sideL: .25, sideR: .25, bob: 0 },
      (poses[o.pose || 'stand'] || poses.stand)(o.t || 0, o));
    const det = outfit === 'detective', coat = o.coat || mat.trench, felt = o.felt || mat.felt;
    const shoeM = o.shoe || mat.shoe, hat = o.hat && o.hat.kind ? o.hat : null;
    const skin = o.skin || mat.skin, shirt = o.shirt || mat.shirt, pants = o.pants || mat.pants, robe = o.robe || mat.robe;
    const base = outfit === 'kid' ? skin : outfit === 'wizard' ? robe : det ? skin : (o.mat || mat.buddy);
    const legM = outfit === 'kid' ? pants : det ? felt : base, sleeveM = outfit === 'kid' ? shirt : det ? coat : base, handM = outfit ? skin : base;
    const meshes = [];
    const chain = (g, parts) => parts.forEach((m, i) => { m.group = g; m.order = i; meshes.push(m); });
    const ball = (p, r, m, sd) => icosphere(0, m, sd).scale(r).move(p[0], p[1], p[2]);
    const rx = (det ? .335 : .37) * H, ry = rx * .9, rz = (det ? .5 : .42) * H, legL = .1 * H, zc = .16 * H + rz + P.bob * H;
    // legs: two short segments + shoe; a cover hides the hip
    [[-1, 'L'], [1, 'R']].forEach(([s, k]) => {
      const hip = [s * .14 * H, 0, zc - rz * .82];
      const knee = limbEnd(hip, P['leg' + k], .05, s, legL), ankle = limbEnd(knee, P['leg' + k] - P['knee' + k], .05, s, legL);
      const shoe = icosphere(0, shoeM, seed * 37 + 4 + s).scale(.075 * H, .11 * H, .05 * H).move(ankle[0], ankle[1] - .035 * H, ankle[2] - .01 * H);
      chain('leg' + k, [limb(hip, knee, .055 * H, .05 * H, legM, seed * 37 + s), limb(knee, ankle, .05 * H, .045 * H, legM, seed * 37 + 2 + s), shoe,
        ball(knee, .052 * H, legM, seed * 37 + 90 + s), ball(hip, .075 * H, legM, seed * 37 + 92 + s)]);
    });
    // the head-body
    const egg = icosphere(Math.max(d, 1), base, seed * 37 + 10).jitter(.03, rng(seed * 37 + 11)).scale(rx, ry, rz).move(0, 0, zc);
    if (!outfit) egg.patch = { mat: o.faceMat || mat.buddyFace, dir: [0, -1, .15], th: .66 }; // light face oval
    if (outfit === 'wizard') egg.patch = { mat: skin, dir: [0, -1, .3], th: .62 };
    if (outfit === 'kid') egg.bands = [{ z: zc - rz * .66, mat: pants }, { z: zc - rz * .24, mat: shirt }]; // clothes as bands below the face
    if (det) egg.bands = [{ z: zc - rz * .22, mat: coat }];
    meshes.push(egg);
    let tip = null;
    if (det) { // the coat: a skirt that widens down, a belt with a buckle, collar wings, buttons
      const z1 = zc - rz * .3, z0 = .13 * H + P.bob * H, rB = rx * .99, sd = seed * 37 + 200;
      const put = (m, k) => { m.group = 'coat'; m.order = k; m.bias = rz * .3; meshes.push(m); };
      const zb = z1 - (z1 - z0) * .3, rb = rB + (rx * 1.14 - rB) * .3;
      put(drum(9, [[rx * 1.14, z0], [rB, z1]], coat, sd, rng(sd), null, null, { ry: .9, clean: true, offAll: .25 }), 0);
      put(noCaps(drum(9, [[rb * 1.04, zb - .04 * H], [rb * 1.02, zb + .04 * H]], felt, sd + 1, rng(sd), null, null, { ry: .9, clean: true, offAll: .25 })), 1);
      put(box(.1 * H, .03 * H, .1 * H, mat.gold, sd + 2, .1).move(0, -rb * .95, zb - .05 * H), 2);
      [-1, 1].forEach((sx, i) => put(icosphere(0, felt, sd + 4 + i).scale(.024 * H).move(sx * .1 * H, -rx * 1.02, zb - .12 * H), 3));
      put(limb([0, -ry * .97, zc - rz * .18], [0, -rb * .95, zb + .05 * H], .05 * H, .035 * H, mat.flag, sd + 8, 5), 3); // tie
      // lapels: two wings from the chin outward, standing up at the cheeks
      [-1, 1].forEach((sx, i) => {
        const L = new Mesh(coat, sd + 10 + i), v = [[.06, -1.04, -.5], [.46, -.93, -.06], [1.0, -.5, .1], [1.0, -.62, -.3], [.2, -1.02, -.16]].map(q => L.add([sx * q[0] * rx, q[1] * ry * 1.02, zc + q[2] * rz]));
        L.tri(v[0], v[4], v[3]).tri(v[4], v[1], v[3]).tri(v[1], v[2], v[3]); L.center = [0, 0, zc]; put(L, 4);
      });
    }
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
      if (det && k === 'R') { // flashlight: dark body, brass head, a bright glass
        const at = q => [wr[0] + hd[0] * q * H, wr[1] + hd[1] * q * H - .02 * H, wr[2] + hd[2] * q * H];
        parts.push(limb(at(-.05), at(.17), .035 * H, .035 * H, mat.dark, seed * 37 + 44, 6));
        parts.push(limb(at(.15), at(.26), .036 * H, .07 * H, mat.gold, seed * 37 + 45, 7, mat.lampLight));
        tip = at(.26);
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
      if (!hat) [[-.06, .05, .18], [.05, .08, .14]].forEach(([x, y, h], i) => { // cowlick
        const tf = limb([x * H, y * H, zc + rz * .9], [x * H * 2.2, y * H + .05 * H, zc + rz + h * H], .05 * H, .006 * H, o.hair || mat.hair, seed * 37 + 52 + i, 4);
        tf.bias = rz * .7; meshes.push(tf);
      });
    }
    if (hat) hatMeshes(hat, H, rx, ry, rz, zc, seed).forEach((m, i) => { m.group = 'hat'; m.order = i; m.bias = rz * 1.2; meshes.push(m); });
    if (outfit === 'wizard') {
      const beard = limb([0, -ry * .8, zc - rz * .12], [0, -ry * .98, zc - rz * 1.05], .19 * H, .01 * H, o.beard || mat.white, seed * 37 + 60, 7);
      beard.bias = rz * .5; meshes.push(beard);
      const hb = zc + rz * .74;
      const brim = cylinder(10, .95, robe, seed * 37 + 61).scale(.46 * H, .42 * H, .035 * H).move(0, ry * .05, hb);
      const hat = cone(7, robe, seed * 37 + 62, rng(seed * 37 + 63), .55).scale(.27 * H, .25 * H, .62 * H)
        .map(p => [p[0], p[1] + Math.pow(p[2] / (.62 * H), 2) * .2 * H, p[2]]).move(0, ry * .05, hb);
      brim.bias = rz * 1.2; hat.bias = rz * 1.3; meshes.push(brim, hat);
    }
    if (det) {
      // moustache: two thick tapered wings (wiggles while he talks)
      const tk = o.talk || 0, mz = zc + (.025 + tk * .015) * H, sd = seed * 37 + 230;
      [-1, 1].forEach((sx, i) => {
        const w = limb([sx * .012 * H, -ry * 1.02, mz], [sx * .2 * H, -ry * .9, mz - (.055 - .02 * tk) * H], .062 * H, .014 * H, o.hair || mat.hair, sd + i, 5);
        w.group = 'stache'; w.order = (sx > 0) === ((o.rot || 0) >= 0) ? 0 : 1; w.bias = rz * .9; meshes.push(w);   // the far wing under the near one
      });
      const nose = icosphere(0, skin, sd + 3).scale(.05 * H, .05 * H, .045 * H).move(0, -ry * 1.07, mz + .075 * H); nose.group = 'stache'; nose.order = 3; nose.bias = rz * .9; meshes.push(nose);
      // fedora: a wide brim (dips at the front), a band, a crown with a crease
      const hb = zc + rz * .6, hatPart = (m, k) => { m.group = 'hat'; m.order = k; m.bias = rz * 1.3; meshes.push(m); };
      const dip = p => [p[0], p[1], p[2] + Math.pow(Math.abs(p[0]) / (.46 * H), 2) * .02 * H + p[1] * .2];
      hatPart(cylinder(12, .97, felt, sd + 5).scale(.5 * H, .46 * H, .05 * H).map(dip).move(0, ry * .04, hb), 0);
      hatPart(noCaps(drum(9, [[.275 * H, 0], [.265 * H, .09 * H]], mat.gemRed, sd + 6, rng(sd), null, null, { ry: .92, clean: true })).move(0, ry * .08, hb + .02 * H), 1);
      const crown = drum(9, [[.262 * H, 0], [.25 * H, .13 * H], [.18 * H, .2 * H]], felt, sd + 7, rng(sd + 8), null, null, { ry: .95, jr: .03 });
      crown.v = crown.v.map(p => (p[2] > .15 * H ? [p[0], p[1], p[2] - Math.max(0, .06 * H - Math.abs(p[0]) * .5)] : p));
      hatPart(crown.move(0, ry * .08, hb + .1 * H), 2);
    }
    const obj = place(meshes, Object.assign({ rot: 0 }, o), .3 * H, { ordered: 'depth' });
    if (det) {
      obj.front = { group: 'armR', ref: egg, margin: rx * 2 };
      const r = o.rot || 0, c = Math.cos(r), sn = Math.sin(r);
      obj.tip = [tip[0] * c - tip[1] * sn + obj.x, tip[0] * sn + tip[1] * c + obj.y, tip[2] + obj.z];
    }
    if (outfit === 'wizard') obj.front = { group: 'armR', ref: egg, margin: rx * .3 };
    const r = o.rot || 0;
    obj.face = { c: [obj.x, obj.y, obj.z + zc], r: rx, browColor: det ? '#241a14' : outfit === 'wizard' ? '#f4f5f6' : outfit === 'kid' ? (o.browColor || '#3a271b') : '#4a1216', glasses: o.glasses, k: [.9, 1, rz / rx], f: [Math.sin(r), -Math.cos(r), 0], u: [Math.cos(r), Math.sin(r), 0],
      style: 'buddy', eyeK: 1.4, noMouth: outfit === 'wizard', mouthUp: det ? -.12 : undefined, brows: o.brows, gaze: o.gaze, blink: o.blink, talk: o.talk,
      expr: o.expression || (det ? 'squint' : null) || poseExpression[o.pose || 'stand'] || 'happy' };
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
    const EYE = F.eye || { kid: [.93, .36, .06], buddy: [.92, .33, .2], animal: [.62, .78, .22], monster: [.85, .45, .22], cyclops: [.97, 0, .12], spider: [.88, .42, .14] }[style];
    const both = [at(EYE[0], -EYE[1], EYE[2]), at(EYE[0], EYE[1], EYE[2])], m = at(.95, 0, F.mouthUp != null ? F.mouthUp : style === 'monster' ? -.3 : style === 'cyclops' ? -.42 : style === 'buddy' ? -.12 : -.36);
    const eyes = both.filter(e => e.vis);
    both.forEach((e, i) => { e.inner = Math.sign(both[1 - i][0] - e[0]) || 1; });
    const f1 = n => n.toFixed(1);
    const P = (d, w, fill) => `<path d="${d}" fill="${fill || 'none'}" stroke="${fill ? 'none' : E}" stroke-width="${f1(s * (w || .055))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    // optional life: gaze [x, y] in -1..1 moves the pupils (frames and brows stay), blink closes the eyes, talk 0..1 opens the mouth
    const gz = F.gaze ? [F.gaze[0] * s * .075, F.gaze[1] * s * .06] : [0, 0];
    const dotEye = (e, k) => F.blink ? P(`M${f1(e[0] - s * .1 * k)},${f1(e[1])} Q${f1(e[0])},${f1(e[1] + s * .06)} ${f1(e[0] + s * .1 * k)},${f1(e[1])}`)
      : (k *= F.eyeK || 1, e = [e[0] + gz[0], e[1] + gz[1]], `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(s * .085 * k)}" ry="${f1(s * .125 * k)}" fill="${E}"/><circle cx="${f1(e[0] + s * .03 * k)}" cy="${f1(e[1] - s * .045 * k)}" r="${f1(s * .03 * k)}" fill="#fff"/>`);
    const cheeks = F.noCheeks ? '' : eyes.map(e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1] + s * .2)}" rx="${f1(s * .1)}" ry="${f1(s * .06)}" fill="#ff7b7b" opacity=".45"/>`).join('');
    // innerUp > 0: inner end raised (worried/sad); < 0: lowered (angry)
    const brow = (e, innerUp, lift) => P(`M${f1(e[0] - e.inner * s * .1)},${f1(e[1] - s * (lift - innerUp))} L${f1(e[0] + e.inner * s * .1)},${f1(e[1] - s * (lift + innerUp))}`, .045);
    // BIG thick brows: a tapered, slightly arched wedge, thick at the inner end. Their shape carries the expression.
    // innerUp > 0 raises the inner end (worried, sad), < 0 lowers it (angry); lift = height above the eye; arch = bow
    const kE = F.eyeK || 1, BC = F.browColor || E;
    const bigBrow = (e, innerUp, lift, arch, k, color) => {
      k = (k || 1) * kE;
      // optional life: F.brows = [tilt, lift] for both, or [[tilt, lift], [tilt, lift]] one by one (added to the expression)
      const bo = F.brows ? (Array.isArray(F.brows[0]) ? F.brows[e.inner < 0 ? 1 : 0] : F.brows) : null;
      if (bo) { innerUp += bo[0]; lift += bo[1]; }
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
      // optional life, as in the other characters: gaze moves the iris, blink shuts the lid, talk opens the mouth, brows
      // [[tilt, lift] left, right] tip the one wide brow; expr 'joy' smiles wide, 'surprised' shrinks the iris, 'sad' turns the mouth
      const X = F.expr, gx = gz[0] * 1.45, gy = gz[1] * 1.7, ir = X === 'surprised' ? .8 : 1;
      out += `<circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="${f1(s * .32)}" fill="#fff"/><circle cx="${f1(e[0] + gx)}" cy="${f1(e[1] + s * .03 + gy)}" r="${f1(s * .19 * ir)}" fill="#7b3fd1"/>`;
      out += `<circle cx="${f1(e[0] + gx)}" cy="${f1(e[1] + s * .04 + gy)}" r="${f1(s * .1 * ir)}" fill="${E}"/><circle cx="${f1(e[0] + s * .07 + gx)}" cy="${f1(e[1] - s * .06 + gy)}" r="${f1(s * .055)}" fill="#fff"/>`;
      if (F.blink) out += `<circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="${f1(s * .335)}" fill="#43bb6c"/>` + P(`M${f1(e[0] - s * .27)},${f1(e[1] + s * .04)} Q${f1(e[0])},${f1(e[1] + s * .2)} ${f1(e[0] + s * .27)},${f1(e[1] + s * .04)}`, .05);
      if (m.vis) {
        const w = X === 'joy' ? .2 : .13, dip = X === 'joy' ? .2 : X === 'sad' ? -.1 : .12;
        out += F.talk ? `<ellipse cx="${f1(m[0])}" cy="${f1(m[1] + s * .04)}" rx="${f1(s * .13)}" ry="${f1(s * (.03 + .12 * F.talk))}" fill="${R}"/>`
          : P(`M${f1(m[0] - s * w)},${f1(m[1] - s * .02)} Q${f1(m[0])},${f1(m[1] + s * dip)} ${f1(m[0] + s * w)},${f1(m[1] - s * .02)}`, .05);
      }
      { const w = s * .4, y = e[1] - s * .46, t = s * .13; // one wide brow
        const bo = F.brows ? (Array.isArray(F.brows[0]) ? F.brows : [F.brows, F.brows]) : null, L = bo ? -s * bo[0][1] : 0, Rr = bo ? -s * bo[1][1] : 0, Md = (L + Rr) / 2 - (bo ? s * (bo[0][0] + bo[1][0]) * .5 : 0);
        out += `<path d="M${f1(e[0] - w)},${f1(y + t * .4 + L)} Q${f1(e[0])},${f1(y - s * .12 + Md)} ${f1(e[0] + w)},${f1(y + t * .4 + Rr)} L${f1(e[0] + w * .9)},${f1(y + t * 1.1 + Rr)} Q${f1(e[0])},${f1(y - s * .12 + t * 1.4 + Md)} ${f1(e[0] - w * .9)},${f1(y + t * 1.1 + L)} Z" fill="#124d2c" stroke="#124d2c" stroke-width="${f1(s * .02)}" stroke-linejoin="round"/>`; }
      return `<g class="face">${out}</g>`;
    }
    if (style === 'spider') {
      // three yellow eyes in an arc (the middle one bigger and higher) with slit pupils that follow the gaze, angry brows,
      // a grumpy mouth between the fangs that opens with the roar
      const E3 = [at(.88, -.42, .14), at(.96, 0, .36), at(.88, .42, .14)], gx = gz[0] * 1.2, gy = gz[1] * 1.2;
      E3.forEach((e, i) => { e.inner = i === 1 ? 1 : Math.sign(E3[1][0] - e[0]) || 1; });
      E3.forEach((e, i) => {
        if (!e.vis) return;
        const k = i === 1 ? 1.45 : 1.15, rx = s * .12 * k, ry = s * .105 * k;
        if (F.blink) { out += P(`M${f1(e[0] - rx)},${f1(e[1])} Q${f1(e[0])},${f1(e[1] + ry)} ${f1(e[0] + rx)},${f1(e[1])}`, .05); return; }
        out += `<ellipse cx="${f1(e[0])}" cy="${f1(e[1])}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#ffd23f"/><ellipse cx="${f1(e[0] + gx)}" cy="${f1(e[1] + gy)}" rx="${f1(s * .03 * k)}" ry="${f1(s * .085 * k)}" fill="${E}"/>`;
      });
      E3.forEach((e, i) => { if (e.vis && i !== 1) out += bigBrow(e, -.13, .2, 0, .85, '#1f1030'); });
      if (E3[1].vis) { const e = E3[1], w = s * .17, y = e[1] - s * .2; out += `<path d="M${f1(e[0] - w)},${f1(y - s * .05)} L${f1(e[0])},${f1(y + s * .03)} L${f1(e[0] + w)},${f1(y - s * .05)}" fill="none" stroke="#1f1030" stroke-width="${f1(s * .07)}" stroke-linecap="round" stroke-linejoin="round"/>`; }
      const mo = at(.95, 0, -.42);
      if (mo.vis) out += F.roar > .05 ? `<ellipse cx="${f1(mo[0])}" cy="${f1(mo[1])}" rx="${f1(s * .12)}" ry="${f1(s * (.03 + .1 * F.roar))}" fill="${R}"/>`
        : P(`M${f1(mo[0] - s * .1)},${f1(mo[1] + s * .03)} Q${f1(mo[0])},${f1(mo[1] - s * .05)} ${f1(mo[0] + s * .1)},${f1(mo[1] + s * .03)}`, .05);
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
    // glasses: flat frames over the eyes (kind round | square), lightly tinted so the expression still reads
    const glasses = () => {
      const G = F.glasses; if (!G || !G.kind || !eyes.length) return '';
      const c = G.color || '#33373b', r = s * .25, w = `fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="${f1(s * .075)}" stroke-linejoin="round"`;
      const line = (x1, y1, x2, y2) => `<path d="M${f1(x1)},${f1(y1)} L${f1(x2)},${f1(y2)}" fill="none" stroke="${c}" stroke-width="${f1(s * .075)}" stroke-linecap="round"/>`;
      let g = '';
      eyes.forEach(e => {
        g += G.kind === 'square' ? `<rect x="${f1(e[0] - r * 1.05)}" y="${f1(e[1] - r * .85)}" width="${f1(r * 2.1)}" height="${f1(r * 1.75)}" rx="${f1(s * .07)}" ${w}/>`
          : `<circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="${f1(r)}" ${w}/>`;
        const x = e[0] - e.inner * r * 1.05; g += line(x, e[1] - r * .25, x - e.inner * s * .16, e[1] - r * .35);
      });
      if (eyes.length === 2) { const a = eyes[0], b = eyes[1]; g += line(a[0] + a.inner * r, a[1], b[0] + b.inner * r, b[1]); }
      return g;
    };
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
      case 'squint': // a detective: lids half down, one brow raised; the mouth shows only while he talks (under the moustache)
        if (!F.noMouth && F.talk) out += `<ellipse cx="${f1(m[0])}" cy="${f1(m[1] + s * .05)}" rx="${f1(s * .1)}" ry="${f1(s * (.02 + .07 * F.talk))}" fill="${R}"/>`;
        out += eyes.map(e => {
          if (F.blink) return dotEye(e, 1);
          const w = s * .15, x = e[0], y = e[1] + s * .02;
          return `<path d="M${f1(x - w)},${f1(y - s * .02)} Q${f1(x)},${f1(y - s * .06)} ${f1(x + w)},${f1(y - s * .02)} Q${f1(x)},${f1(y + s * .19)} ${f1(x - w)},${f1(y - s * .02)} Z" fill="#fff"/>`
            + `<circle cx="${f1(x + gz[0])}" cy="${f1(y + s * .03)}" r="${f1(s * .065)}" fill="${E}"/>` + P(`M${f1(x - w)},${f1(y - s * .02)} Q${f1(x)},${f1(y - s * .07)} ${f1(x + w)},${f1(y - s * .02)}`, .06);
        }).join('') + eyes.map(e => (e.inner < 0 ? bigBrow(e, .02, .3, .08, .95) : bigBrow(e, -.05, .2, .02, .95))).join('');
        break;
      case 'puzzled': // confused: one brow up, one down, a small crooked mouth
        out += eyes.map(e => dotEye(e, e.inner < 0 ? 1.15 : .95)).join('') + eyes.map(e => (e.inner < 0 ? bigBrow(e, .03, .46, .12) : bigBrow(e, -.03, .28, 0))).join('');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .13)},${f1(m[1] + s * .03)} q${f1(s * .07)},${f1(-s * .1)} ${f1(s * .13)},${f1(-s * .02)} t${f1(s * .13)},${f1(-s * .02)}`);
        out += cheeks;
        break;
      case 'sad':
        out += eyes.map(e => dotEye(e, .9)).join('') + brows('sad');
        if (!F.noMouth) out += P(`M${f1(m[0] - s * .14)},${f1(m[1] + s * .06)} Q${f1(m[0])},${f1(m[1] - s * .08)} ${f1(m[0] + s * .14)},${f1(m[1] + s * .06)}`);
        break;
      default: // happy
        out += eyes.map(e => dotEye(e, 1)).join('') + brows('happy');
        if (!F.noMouth) out += F.talk ? P(`M${f1(m[0] - s * .16)},${f1(m[1] - s * .04)} Q${f1(m[0])},${f1(m[1] + s * (.1 + .24 * F.talk))} ${f1(m[0] + s * .16)},${f1(m[1] - s * .04)} Z`, 0, R)
          : P(`M${f1(m[0] - s * .18)},${f1(m[1] - s * .03)} Q${f1(m[0])},${f1(m[1] + s * .15)} ${f1(m[0] + s * .18)},${f1(m[1] - s * .03)}`);
        out += cheeks;
    }
    return `<g class="face">${out}${glasses()}</g>`;
  }

  // ---------- buildings: toy village (slightly exaggerated: thick roofs, big doors and windows, a little crooked) ----------
  // a gable roof as two thick slabs from the ridge down to the eaves (ridge along y, so the front shows the gable)
  function roofSlabs(w, d, H, over, t, m, seed, ridgeZ) {
    const hw = w / 2 + over, L = Math.hypot(hw, H), a = Math.atan2(H, hw), e = t * .6;
    return [1, -1].map((sx, i) => box(L + e, d + 2 * over, t, m, seed + i, .06).move((L + e) / 2 - e, 0, 0).rotY(-a)
      .map(p => [p[0] * sx, p[1], p[2] + ridgeZ]));
  }
  // triangle wall under the roof (front and back gables)
  function gableWall(w, d, gh, m, seed) {
    const mesh = new Mesh(m, seed), A = [], B = [];
    [[-w / 2, 0], [w / 2, 0], [0, gh]].forEach(([x, z]) => { A.push(mesh.add([x, -d / 2, z])); B.push(mesh.add([x, d / 2, z])); });
    mesh.tri(A[0], A[1], A[2]).tri(B[0], B[2], B[1]);
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; mesh.tri(A[i], B[i], B[j]).tri(A[i], B[j], A[j]); }
    mesh.center = [0, 0, gh / 3];
    return mesh;
  }
  // arched door on a front wall at y = fy (facing −y)
  function door(x, fy, z0, w, h, seed) {
    const leaf = box(w, w * .18, h, mat.wood, seed, .06).move(x, fy - w * .09, z0);
    const arch = lidPrism(w * .18, w, w * .5, 4, mat.wood, seed + 1).rotZ(Math.PI / 2).move(x, fy - w * .09, z0 + h);
    const knob = icosphere(0, mat.gold, seed + 2).scale(w * .08).move(x + w * .28, fy - w * .22, z0 + h * .5);
    knob.bias = w;
    return [leaf, arch, knob];
  }
  // window: wooden frame, glass, cross bars — on a wall facing direction n (−y front or ±x sides)
  function windowOn(c, n, sz, seed) {
    const side = Math.abs(n[0]) > .5, B = (a, b, h, m, k, sd) => (side ? box(b, a, h, m, sd, .05) : box(a, b, h, m, sd, .05)).move(c[0] + n[0] * k, c[1] + n[1] * k, c[2] - h / 2);
    const parts = [B(sz, sz * .14, sz, mat.wood, sz * .05, seed), B(sz * .74, sz * .14, sz * .74, mat.glass, sz * .1, seed + 1),
      B(sz * .08, sz * .14, sz * .78, mat.wood, sz * .16, seed + 2), B(sz * .78, sz * .14, sz * .08, mat.wood, sz * .17, seed + 3)];
    parts.forEach((m, i) => { m.bias = i * .5; });
    return parts;
  }
  Object.assign(make, {
    // cottage: stone base, plaster walls, gable roof with chimney, arched door and big windows. o.roof: red | blue | green
    house(o) {
      const S = o.size || 160, seed = o.seed || 1, rand = rng(seed * 97), w = S, d = S * .78, h = S * .55, H = S * .42, over = S * .1;
      const roofM = mat['roof' + ({ blue: 'Blue', green: 'Green' }[o.roof] || 'Red')], meshes = [];
      meshes.push(box(w * 1.06, d * 1.06, S * .07, mat.masonry, seed * 97, .06));
      meshes.push(box(w, d, h, mat.plaster, seed * 97 + 1, .02).move(0, 0, S * .05));
      const tilt = (rand() - .5) * .06; // a little crooked
      const fy = -d / 2, zb = S * .05, zt = zb + h, gh = H * (w / 2) / (w / 2 + over);
      {
        const roofParts = [gableWall(w, d, gh, mat.plaster, seed * 97 + 2).move(0, 0, zt)]
          .concat(roofSlabs(w, d, H, over, S * .09, roofM, seed * 97 + 3, zt + H));
        const ch = box(S * .13, S * .13, S * .42, mat.masonry, seed * 97 + 6, .04).rotY(.05).move(w * .24, d * .12, h + H * .35);
        const chTop = box(S * .17, S * .17, S * .05, mat.masonry, seed * 97 + 7, .08).move(w * .24 + S * .02, d * .12, h + H * .35 + S * .42);
        roofParts.push(ch, chTop);
        // the half of the gable away from the light, a shade darker — exactly along the gable's edges
        roofParts.push(decal([[0, zt + gh], [w / 2, zt], [0, zt]], fy, mat.plasterShade, seed * 97 + 8));
        roofParts.forEach(m => { m.rotZ(tilt); meshes.push(m); });
      }
      // small light wedges hanging from the bottom of each window frame
      [-1, 1].forEach((sx, i) => meshes.push(decal([[sx * w * .3 - S * .1, S * .3], [sx * w * .3 + S * .1, S * .3], [sx * w * .3, S * .25]], fy, mat.plasterShade, seed * 97 + 12 + i)));
      door(0, fy, S * .06, S * .24, S * .26, seed * 97 + 10).forEach(m => meshes.push(m));
      [-1, 1].forEach((sx, i) => windowOn([sx * w * .3, fy, S * .4], [0, -1, 0], S * .2, seed * 97 + 20 + 4 * i).forEach(m => meshes.push(m)));
      // annex on one side: lower, with its own slanted roof — breaks the symmetry
      const ax = rand() < .5 ? -1 : 1, aw = w * .5, ad = d * .8, aH = h * .78, aL = h * .5, axc = ax * (w / 2 + aw / 2 - S * .02);
      const hiL = ax < 0 ? aL : aH, hiR = ax < 0 ? aH : aL; // high side against the house
      meshes.push(block(aw, ad, hiL, hiR, mat.plaster, seed * 97 + 40).move(axc, d * .08, S * .05));
      meshes.push(monoRoof(axc - aw / 2, axc + aw / 2, S * .05 + hiL, S * .05 + hiR, ad, S * .06, S * .07, roofM, seed * 97 + 41).move(0, d * .08, 0));
      windowOn([axc, d * .08 - ad / 2, S * .3], [0, -1, 0], S * .17, seed * 97 + 44).forEach(m => meshes.push(m));
      windowOn([-ax * w / 2, 0, S * .36], [-ax, 0, 0], S * .2, seed * 97 + 30).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), S * .7, { ordered: 'depth' });
    },
    // round stone tower with a pointed roof and a flag
    tower(o) {
      const S = o.size || 240, seed = o.seed || 1, rand = rng(seed * 101), r = S * .2, Ht = S * .62, meshes = [];
      const roofM = mat['roof' + ({ blue: 'Blue', green: 'Green' }[o.roof] || 'Blue')];
      meshes.push(cylinder(8, .88, mat.masonry, seed * 101).scale(r, r, Ht));
      meshes.push(cylinder(8, 1, mat.masonry, seed * 101 + 1).scale(r * 1.02, r * 1.02, S * .05).move(0, 0, Ht - S * .05)); // ledge
      const roof = cone(8, roofM, seed * 101 + 2, rand, .6).scale(r * 1.4, r * 1.4, S * .36).map(p => [p[0] + (p[2] / (S * .36)) ** 2 * S * .03, p[1], p[2]]).move(0, 0, Ht);
      meshes.push(roof);
      const top = [S * .03, 0, Ht + S * .36];
      meshes.push(limb(top, [top[0], 0, top[2] + S * .14], S * .01, S * .008, mat.dark, seed * 101 + 3, 4));
      const fl = new Mesh(mat.flag, seed * 101 + 4), ft = top[2] + S * .14, fw = S * .13, wave = Math.sin((o.t || 0) * 4) * S * .015;
      const v = [[0, 0, ft], [fw, wave, ft - S * .035], [0, 0, ft - S * .07]].map(q => [q[0] + top[0], q[1] - S * .004, q[2]]);
      const v2 = v.map(q => [q[0], q[1] + S * .008, q[2]]);
      const ids = v.concat(v2).map(q => fl.add(q));
      fl.tri(ids[0], ids[1], ids[2]).tri(ids[3], ids[5], ids[4]).tri(ids[0], ids[3], ids[4]).tri(ids[0], ids[4], ids[1]).tri(ids[1], ids[4], ids[5]).tri(ids[1], ids[5], ids[2]);
      meshes.push(fl);
      door(0, -r * .95, 0, S * .13, S * .14, seed * 101 + 10).forEach(m => meshes.push(m));
      windowOn([0, -r * .9, Ht * .66], [0, -1, 0], S * .1, seed * 101 + 20).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), r * 1.2, { ordered: 'depth' });
    },
    // stone well with a little roof, crossbar, rope and bucket
    well(o) {
      const S = o.size || 100, seed = o.seed || 1, r = S * .32, meshes = [];
      meshes.push(cylinder(9, 1, mat.masonry, seed * 103, mat.water).scale(r, r, S * .3));
      [-1, 1].forEach((sx, i) => meshes.push(limb([sx * r * .85, 0, S * .25], [sx * r * .85, 0, S * .78], S * .03, S * .028, mat.wood, seed * 103 + 1 + i, 5)));
      meshes.push(limb([-r * .9, 0, S * .64], [r * .9, 0, S * .64], S * .025, S * .025, mat.wood, seed * 103 + 3, 5));
      meshes.push(limb([0, 0, S * .64], [0, 0, S * .42], S * .006, S * .006, mat.dark, seed * 103 + 4, 4));
      meshes.push(cylinder(7, 1.15, mat.wood, seed * 103 + 5).scale(S * .06, S * .06, S * .09).move(0, 0, S * .33));
      roofSlabs(r * 2, r * 1.3, S * .22, S * .06, S * .05, mat.roofRed, seed * 103 + 6, S * 1.0).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), r * 1.1, { ordered: 'depth' });
    },
    // wooden fence along x: pointed posts + two rails
    fence(o) {
      const L = o.length || 200, n = o.posts || Math.max(2, Math.round(L / 40) + 1), h = o.height || 50, seed = o.seed || 1, rand = rng(seed * 107), meshes = [];
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + i * L / (n - 1), hh = h * (.92 + rand() * .16), lean = (rand() - .5) * .05 * h;
        meshes.push(limb([x, 0, 0], [x + lean, 0, hh], h * .07, h * .065, mat.wood, seed * 107 + i, 5));
        meshes.push(cone(5, mat.wood, seed * 107 + 50 + i, rand, .6).scale(h * .07, h * .07, h * .14).move(x + lean, 0, hh));
      }
      [.35, .72].forEach((k, j) => { const b = box(L, h * .05, h * .1, mat.wood, seed * 107 + 90 + j, .1).move(0, -h * .06, h * k); b.bias = h * .2; meshes.push(b); });
      return place(meshes, Object.assign({ rot: 0 }, o), 0, { ordered: 'depth' });
    },
    // flat pond / lake: faceted water with a few ripples
    water(o) {
      const rx = o.rx || 120, ry = o.ry || 70, rand = rng((o.seed || 1) * 109), m = new Mesh(mat.water, (o.seed || 1) * 109);
      const c = m.add([0, 0, 0]), A = ring(m, 6, { r: .5, rx, ry, z: 0, jr: .15, ja: .4, jz: 1.5 }, rand), B = ring(m, 13, { r: 1, rx, ry, z: 0, jr: .07, ja: .3, jz: 1 }, rand);
      fan(m, c, A); stitch(m, A, B);
      m.center = [0, 0, -50]; // facets face up
      return place([m], o, 0);
    },
    // wooden bridge along x: arched deck of planks, posts and rails, stone ends
    bridge(o) {
      const L = o.length || 260, W = o.width || L * .3, n = o.planks || 11, arch = o.arch == null ? L * .12 : o.arch, seed = o.seed || 1, rand = rng(seed * 113), meshes = [];
      const z0 = L * .04, zAt = t => z0 + arch * Math.sin(Math.PI * t);
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, x = -L / 2 + t * L, slope = Math.atan(arch * Math.PI / L * Math.cos(Math.PI * t));
        meshes.push(box(L / n * .9, W * (.96 + rand() * .08), L * .035, mat.wood, seed * 113 + i, .12).rotY(-slope).move(x, (rand() - .5) * W * .03, zAt(t)));
      }
      const ph = W * .5, tops = { '-1': [], '1': [] };
      [0, .25, .5, .75, 1].forEach((t, j) => [-1, 1].forEach(sy => {
        const x = -L / 2 + t * L * .98 + L * .01, z = zAt(t) + L * .03, y = sy * W * .46;
        meshes.push(limb([x, y, z - L * .02], [x, y, z + ph], W * .05, W * .045, mat.wood, seed * 113 + 40 + j * 2 + (sy > 0 ? 1 : 0), 5));
        tops[sy].push([x, y, z + ph * .92]);
      }));
      [-1, 1].forEach(sy => { const tp = tops[sy]; for (let j = 0; j < tp.length - 1; j++) meshes.push(limb(tp[j], tp[j + 1], W * .035, W * .035, mat.wood, seed * 113 + 70 + j + (sy > 0 ? 10 : 0), 5)); });
      [-1, 1].forEach((sx, i) => meshes.push(box(L * .12, W * 1.15, z0 + L * .02, mat.masonry, seed * 113 + 90 + i, .1).move(sx * L * .5, 0, -L * .01)));
      return place(meshes, Object.assign({ rot: 0 }, o), 0, { ordered: 'depth' });
    },
  });

  // decal: a flat polygon [x, z] lying just in front of a wall that faces −y (at y = fy), in its own material
  function decal(pts, fy, m, seed) {
    const mesh = new Mesh(m, seed), ids = pts.map(q => mesh.add([q[0], fy - .8, q[1]]));
    for (let i = 1; i < ids.length - 1; i++) mesh.tri(ids[0], ids[i], ids[i + 1]);
    const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    mesh.center = [cx, fy + 40, cz]; mesh.bias = .6;
    return mesh;
  }
  // a jittered round drum / pillar from rings (organic, like the trees): rs = [[radius, z], ...]
  function drum(n, rs, m, seed, rand, capTop, capBottom, o) {
    o = o || {};
    // o.clean: no jitter (exact joints) · o.offAll: every ring at the same angle (flat faces, e.g. .5 with n=4 → a face toward the camera)
    // o.off0: shifts which rings get the half-step twist (so stacked drums continue the same pattern)
    const mesh = new Mesh(m, seed), R = rs.map((q, i) => ring(mesh, n, { r: q[0], z: q[1], off: o.offAll != null ? o.offAll : ((i + (o.off0 || 0)) % 2 ? .5 : 0),
      jr: o.clean ? 0 : (o.jr == null ? .07 : o.jr), ja: o.clean ? 0 : .25, jz: o.clean ? 0 : q[0] * .04, rx: 1, ry: o.ry || 1, x: (o.lean || 0) * q[1] }, rand));
    for (let i = 0; i < R.length - 1; i++) stitch(mesh, R[i], R[i + 1]);
    const last = rs[rs.length - 1];
    if (o.apex != null) fan(mesh, mesh.add([(o.lean || 0) * o.apex, 0, o.apex]), R[R.length - 1]);
    else fan(mesh, mesh.add([(o.lean || 0) * last[1], 0, last[1]]), R[R.length - 1], capTop);
    fan(mesh, mesh.add([0, 0, rs[0][1]]), R[0], capBottom);
    mesh.center = [0, 0, (rs[0][1] + last[1]) / 2];
    return mesh;
  }

  // ---------- playful blocks: big clean planes, crooked on purpose ----------
  // block: w × d footprint, front-left / front-right heights (a slanted top), o.lean shifts the top in x, o.back = [hBL, hBR]
  function block(w, d, hL, hR, m, seed, o) {
    o = o || {};
    const mesh = new Mesh(m, seed), lean = o.lean || 0, hb = o.back || [hL, hR], x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
    const B = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]].map(q => mesh.add(q));
    const T = [[x0 + lean, y0, hL], [x1 + lean, y0, hR], [x1 + lean, y1, hb[1]], [x0 + lean, y1, hb[0]]].map(q => mesh.add(q));
    const quad = (a, b, c, d2, mm) => { mesh.tri(a, b, c, mm).tri(a, c, d2, mm); };
    quad(B[0], B[1], T[1], T[0]); quad(B[1], B[2], T[2], T[1]); quad(B[2], B[3], T[3], T[2]); quad(B[3], B[0], T[0], T[3]);
    quad(T[0], T[1], T[2], T[3], o.topMat); quad(B[0], B[3], B[2], B[1]);
    mesh.center = [lean / 2, 0, (hL + hR + hb[0] + hb[1]) / 8];
    return mesh;
  }
  // single-slope roof slab from (x0, z0) down to (x1, z1), depth d, overhang, thickness t
  function monoRoof(x0, x1, z0, z1, d, over, t, m, seed) {
    const L = Math.hypot(x1 - x0, z0 - z1) + 2 * over, a = Math.atan2(z0 - z1, x1 - x0);
    const sl = box(L, d + 2 * over, t, m, seed, .06).move(L / 2 - over, 0, 0).rotY(-a).move(x0, 0, z0);
    return sl;
  }
  // a grid of window panes on a front face at y = fy (lean: the face leans by `lean` over height `h`)
  function panes(x0, x1, z0, z1, cols, rows, fy, m, seed, o) {
    o = o || {};
    const out = [], cw = (x1 - x0) / cols, rh = (z1 - z0) / rows, ww = cw * (o.fill || .62), wh = rh * (o.fillH || .62), lean = o.lean || 0, h = o.h || 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const z = z0 + (r + .5) * rh, x = x0 + (c + .5) * cw + lean * z / h;
      const pn = box(ww, Math.max(1.5, ww * .12), wh, m, seed + r * 31 + c, .02).move(x, fy - ww * .05, z - wh / 2); pn.bias = 1; out.push(pn);
    }
    return out;
  }
  Object.assign(make, {
    // skyscraper: a leaning tower with a slanted top, a lower annex, a spire. o.style: bands | stripes | glass. o.mat: towerBlue | coral | teal | violet
    // crystal tower: a cluster of 2–3 leaning, twisted faceted crystals (built like the trees and the igloo);
    // the facets that face you turn to glass. o.mat: towerBlue | coral | teal | violet
    skyscraper(o) {
      const S = o.size || 320, seed = o.seed || 1, rand = rng(seed * 137), body = mat[o.mat || 'towerBlue'], meshes = [];
      const crystal = (x, H, r, lean, sd) => {
        const tw = rand() * .5;
        const c = drum(6, [[r, 0], [r * (.9 + rand() * .1), H * .42], [r * (.7 + rand() * .12), H * .74], [r * .42, H * .88]], body, sd, rand, null, null, { lean, apex: H, jr: .1 });
        c.move(x, 0, 0);
        c.patch = { mat: mat.glass, dir: [0, -1, 0], th: .86 };
        return c;
      };
      const r = S * .12;
      meshes.push(crystal(0, S, r, (rand() - .5) * .08, seed * 137));
      const side = rand() < .5 ? -1 : 1;
      meshes.push(crystal(side * r * 1.45, S * (.5 + rand() * .2), r * .8, side * (.05 + rand() * .06), seed * 137 + 1));
      if (rand() < .7) meshes.push(crystal(-side * r * 1.3, S * (.3 + rand() * .15), r * .65, -side * (.04 + rand() * .05), seed * 137 + 2));
      return place(meshes, Object.assign({ rot: 0 }, o), r * 2, { ordered: 'depth' });
    },
    // office tower: the crystal cluster turned into offices — square parts with a flat front facing you,
    // a grid of white/yellow office windows, and on top a helipad or antennas. o.mat, o.windows: 'windowLight' | 'officeWhite'
    officeTower(o) {
      const S = o.size || 340, seed = o.seed || 1, rand = rng(seed * 179), body = mat[o.mat || 'towerBlue'], meshes = [];
      const win = mat[o.windows || (rand() < .5 ? 'windowLight' : 'officeWhite')], C = Math.SQRT1_2;
      const part = (x, H, R, lean, sd, top) => {
        const rs = [[R, 0], [R * .93, H * .5], [R * .86, H]], Rz = z => z < H * .5 ? R + (R * .93 - R) * z / (H * .5) : R * .93 + (R * .86 - R * .93) * (z - H * .5) / (H * .5);
        meshes.push(drum(4, rs, body, sd, rand, null, null, { clean: true, offAll: .5, lean }).move(x, 0, 0));
        const rows = Math.max(3, Math.round(H / (R * .55))), cols = 3;
        for (let rI = 0; rI < rows; rI++) {
          const z = H * .07 + (rI + .5) * (H * .86 / rows), hw = Rz(z) * C, fy = -Rz(z) * C;
          for (let c = 0; c < cols; c++) {
            const cx = x + lean * z + (c - (cols - 1) / 2) * (hw * 2 * .78 / cols);
            const pn = box(hw * 2 * .78 / cols * .62, 2, H * .86 / rows * .5, win, sd + 10 + rI * 7 + c, .02).move(cx, fy - 1.2, z - H * .86 / rows * .25);
            pn.bias = 1; meshes.push(pn);
          }
        }
        const tx = x + lean * H, Rt = R * .86 * C;
        if (top === 'helipad') {
          const pad = cylinder(10, 1, mat.dark, sd + 90).scale(Rt * .9, Rt * .9, S * .012).move(tx, 0, H); pad.bias = 2; meshes.push(pad);
          [[-Rt * .28, 0, Rt * .08, Rt * .7], [Rt * .28, 0, Rt * .08, Rt * .7], [0, 0, Rt * .56, Rt * .1]].forEach(([dx, dy, w, d2], i) => {
            const b = box(w, d2, S * .004, mat.officeWhite, sd + 91 + i, 0).move(tx + dx, dy, H + S * .012); b.bias = 3; meshes.push(b);
          });
        } else {
          [[-Rt * .4, .2], [Rt * .3, .13]].forEach(([dx, h], i) => {
            meshes.push(limb([tx + dx, 0, H], [tx + dx, 0, H + S * h], S * .008, S * .005, mat.metal, sd + 95 + i, 4));
            const b = icosphere(0, mat.flag, sd + 97 + i).scale(S * .012).move(tx + dx, 0, H + S * h); b.bias = 2; meshes.push(b);
          });
        }
      };
      const R = S * .14, side = rand() < .5 ? -1 : 1;
      part(0, S, R, 0, seed * 179, o.top || (rand() < .5 ? 'helipad' : 'antenna'));
      // wings: each starts exactly on the tower's side wall at the roof line and slopes down and out in big facets —
      // a continuation of the tower's shape, not a separate crystal
      const hw0 = R * Math.SQRT1_2, hwH = R * .86 * Math.SQRT1_2; // tower half-width at the bottom and at the top
      const wing = (sx, H1, H2, ww, sd) => {
        const m = new Mesh(body, sd), X = q => [sx * q[0], q[1], q[2]];
        const xin = z => hw0 + (hwH - hw0) * z / S; // inner face lies on the tower's (slightly tapering) side
        const A = m.add(X([xin(0), -hw0 * .98, 0])), B = m.add(X([xin(0), hw0 * .98, 0]));
        const Cc = m.add(X([xin(H1), -hwH * .96, H1])), Dd = m.add(X([xin(H1), hwH * .96, H1]));
        const E = m.add(X([xin(0) + ww, -hw0 * .55, 0])), F = m.add(X([xin(0) + ww, hw0 * .55, 0]));
        const G = m.add(X([xin(0) + ww * .62, -hw0 * .3, H2])), Hh = m.add(X([xin(0) + ww * .62, hw0 * .3, H2]));
        const P = m.add(X([xin(H1 * .82) + ww * .18, -hw0 * .05, H1 * .9]));
        m.tri(A, E, G).tri(A, G, Cc).tri(Cc, G, P);                  // front: two big facets and a top facet
        m.tri(B, Dd, Hh).tri(B, Hh, F).tri(Dd, P, Hh);              // back
        m.tri(E, F, Hh).tri(E, Hh, G).tri(G, Hh, P).tri(Cc, P, Dd);  // outer and top
        m.center = X([xin(0) + ww * .4, 0, H1 * .4]);
        meshes.push(m);
      };
      wing(side, S * (.92 + rand() * .06), S * (.45 + rand() * .12), R * (.9 + rand() * .3), seed * 179 + 10);
      wing(-side, S * (.62 + rand() * .12), S * (.25 + rand() * .1), R * (1.1 + rand() * .3), seed * 179 + 11);
      return place(meshes, Object.assign({ rot: 0 }, o), R * 2, { ordered: 'depth' });
    },
    // stepped temple (after the jungle-temple reference): a flat-fronted rocky plinth facing the camera (fits the
    // flat style), and on it the temple turned at an angle — a lit face and a face in shadow — with tiers in two
    // sandstone tones, stairs up the lit face, a round shrine on top, rocks, bushes and palms around
    stepTemple(o) {
      const S = o.size || 280, seed = o.seed || 1, rand = rng(seed * 181), C = Math.SQRT1_2, meshes = [];
      const bw = S * .85, bd = S * .6, bh = S * .13, baseR = bw / 2 / C;
      meshes.push(drum(4, [[baseR, 0], [baseR * .95, bh]], mat.sandstone, seed * 181, rand, null, null, { offAll: .5, ry: bd / bw, jr: .03 }));
      [[-.46, -.3, .2], [.5, -.25, .16], [-.36, .3, .14], [.42, .32, .18]].forEach(([x, y, k], i) =>
        meshes.push(make.rock({ size: S * k, h: .8, seed: seed * 181 + 70 + i, mat: mat.sandstone }).meshes[0].move(x * bw, y * bd, 0)));
      // the shrine, built facing −y, then turned: thin wide stone slabs, column stories in front of a dark recess
      // (the dark breaks the stone into layers and reads as wide entrances), a round story and a roof
      const up = [], C2 = C, sq = (w, z0, h, m, sd) => drum(4, [[w / 2 / C2, z0], [w / 2 / C2 * .99, z0 + h]], m, sd, rand, null, null, { clean: true, offAll: .5 });
      const rnd = (r, z0, h, m, sd, r2) => drum(10, [[r, z0], [r2 == null ? r * .98 : r2, z0 + h]], m, sd, rand, null, null, { clean: true });
      const L = mat.sandstoneLight, D = mat.sandstone, K = mat.stoneDark;
      let z = bh;
      const slab = (w, h, m) => { up.push(sq(w, z, h, m, seed * 181 + up.length)); z += h; };
      const story = (w, h, n) => { // dark recessed core + thin columns along the front and both sides
        up.push(sq(w * .78, z, h, K, seed * 181 + up.length));
        const half = w / 2 * .9, col = (x, y) => up.push(drum(4, [[w * .028 / C2, z], [w * .025 / C2, z + h]], L, seed * 181 + up.length, rand, null, null, { clean: true, offAll: .5 }).move(x, y, 0));
        for (let i = 0; i < n; i++) col(-half + i * 2 * half / (n - 1), -half);
        for (let i = 1; i < n - 1; i++) { col(-half, -half + i * 2 * half / (n - 1)); col(half, -half + i * 2 * half / (n - 1)); }
        z += h;
      };
      const W = S * .5;
      slab(W * 1.06, S * .035, L); slab(W, S * .028, D);
      story(W * .92, S * .11, 5);
      slab(W * .98, S * .03, L); slab(W * .88, S * .026, D); slab(W * .8, S * .024, L);
      // round story and roof
      const rr = W * .3;
      up.push(rnd(rr * .8, z, S * .08, K, seed * 181 + 50));
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i - 4.5) * .32; if (Math.sin(a) > .2) continue; up.push(drum(4, [[S * .009, z], [S * .008, z + S * .08]], L, seed * 181 + 51 + i, rand, null, null, { clean: true }).move(Math.cos(a) * rr * .95, Math.sin(a) * rr * .95, 0)); }
      z += S * .08;
      up.push(rnd(rr * 1.18, z, S * .028, L, seed * 181 + 70)); z += S * .028;
      up.push(rnd(rr * 1.0, z, S * .022, D, seed * 181 + 71)); z += S * .022;
      up.push(rnd(rr * .72, z, S * .05, L, seed * 181 + 72, rr * .42)); z += S * .05;
      up.push(rnd(rr * .3, z, S * .03, D, seed * 181 + 73, rr * .12));
      if (o.stairs !== false) for (let k = 0; k < 4; k++) up.push(box(W * .3, S * .04, S * .0155, L, seed * 181 + 80 + k, .03).move(0, -W * .53 - S * .04 * (3 - k) * .6, bh + k * S * .0155));
      const turn = o.turn == null ? -.6 : o.turn;
      up.forEach(m => { m.rotZ(turn); meshes.push(m); });
      // bushes on the plinth and palms around
      for (let i = 0; i < 5; i++) make.bush({ size: S * (.07 + rand() * .05), seed: seed * 181 + 60 + i }).meshes.forEach(mm => { mm.move((rand() - .5) * bw * .9, -bd * (.25 + rand() * .2), bh); meshes.push(mm); });
      [[-.52, .05, .55], [.55, .1, .5], [.3, .35, .62]].forEach(([x, y, k], i) => make.palm({ size: S * k, seed: seed * 181 + 80 + i }).meshes.forEach(mm => { mm.move(x * bw, y * bd, bh * .6); meshes.push(mm); }));
      return place(meshes, Object.assign({ rot: 0 }, o), bw * .55, { ordered: 'depth' });
    },
    // palm tree: a curved trunk and drooping fronds
    palm(o) {
      const S = o.size || 200, seed = o.seed || 1, rand = rng(seed * 191), meshes = [], bend = (rand() < .5 ? -1 : 1) * S * (.12 + rand() * .1);
      const pts = [0, 1, 2, 3, 4].map(i => [bend * (i / 4) ** 2, 0, i / 4 * S * .78]);
      for (let i = 0; i < 4; i++) meshes.push(limb(pts[i], pts[i + 1], S * (.05 - i * .006), S * (.044 - i * .006), mat.trunk, seed * 191 + i, 5));
      const top = pts[4];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28 + rand() * .4, mid = [top[0] + Math.cos(a) * S * .2, top[1] + Math.sin(a) * S * .14, top[2] + S * .05];
        const tip = [top[0] + Math.cos(a) * S * .38, top[1] + Math.sin(a) * S * .26, top[2] - S * (.1 + rand() * .08)];
        meshes.push(limb(top, mid, S * .055, S * .045, mat.leaf, seed * 191 + 10 + i, 3), limb(mid, tip, S * .045, S * .006, mat.leaf, seed * 191 + 20 + i, 3));
      }
      meshes.push(icosphere(0, mat.trunk, seed * 191 + 40).scale(S * .045).move(top[0] + S * .03, top[1] - S * .02, top[2] - S * .03));
      return place(meshes, Object.assign({ rot: 0 }, o), S * .15, { ordered: 'depth' });
    },
    // tall tower of a few big polygons in palette tones (like the low-poly trees and refs 30/39). o.style:
    //   twist   — a square prism whose rings turn half a step each level → big triangle facets, short pyramid top
    //   tiers   — stacked tapering tiers, like a pine
    //   setback — a wide base, narrower middle, slim top and a needle
    tallTower(o) {
      const S = o.size || 380, seed = o.seed || 1, rand = rng(seed * 173), body = mat[o.mat || 'towerBlue'], r = o.width || S * .16, meshes = [];
      const style = o.style || 'twist', lean = (rand() - .5) * .04;
      if (style === 'twist') {
        meshes.push(drum(4, [[r, 0], [r * .97, S * .3], [r * .93, S * .58], [r * .86, S * .84]], body, seed * 173, rand, null, null, { apex: S, jr: .02, lean }));
      } else if (style === 'tiers') {
        let rr = r * 1.25, z0 = 0;
        for (let i = 0; i < 3; i++) {
          const h = S * (.3 - i * .02), top = rr * .8;
          const op = { clean: true, off0: i, lean };
          if (i === 2) op.apex = z0 + h + S * .14;
          meshes.push(drum(5, [[rr, z0], [top, z0 + h]], body, seed * 173 + i, rand, null, null, op));
          z0 += h; rr = top * .9; // the next tier stands on a clean ledge, a little narrower, same angle
        }
      } else { // setback
        meshes.push(drum(4, [[r * 1.3, 0], [r * 1.22, S * .4]], body, seed * 173, rand, null, null, { jr: .02 }));
        meshes.push(drum(4, [[r * .95, S * .4], [r * .9, S * .7]], body, seed * 173 + 1, rand, null, null, { jr: .02, lean }));
        meshes.push(drum(4, [[r * .6, S * .7], [r * .5, S * .86]], body, seed * 173 + 2, rand, null, null, { jr: .02, apex: S * .93, lean }));
        meshes.push(limb([lean * S * .93, 0, S * .92], [lean * S, 0, S * 1.08], r * .07, r * .02, mat.metal, seed * 173 + 3, 4));
      }
      return place(meshes, Object.assign({ rot: 0 }, o), r * 1.6, { ordered: 'depth' });
    },
    // stump house: a fat tree stump with roots, a cut top, a leafy crown, a door and a window
    stumpHouse(o) {
      const S = o.size || 180, seed = o.seed || 1, rand = rng(seed * 149), meshes = [];
      meshes.push(drum(9, [[S * .27, 0], [S * .23, S * .26], [S * .25, S * .44]], mat.trunk, seed * 149, rand, mat.woodEnd));
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.28 + rand() * .6;
        meshes.push(limb([Math.cos(a) * S * .25, Math.sin(a) * S * .2, S * .1], [Math.cos(a) * S * .45, Math.sin(a) * S * .36, 0], S * .07, S * .025, mat.trunk, seed * 149 + 10 + i, 5));
      }
      const leaf = mat[['leaf', 'leafYellow', 'leafTeal'][Math.floor(rand() * 3)]];
      // the crown is a cap: about twice as wide as the stump and overhanging it (the mushroom proportion)
      const crown = icosphere(2, leaf, seed * 149 + 20).jitter(.07, rand).floor(-.3);
      crown.scale(S * .5, S * .47, S * .32).move(0, 0, S * .5); meshes.push(crown);
      meshes.push(icosphere(1, leaf, seed * 149 + 21).jitter(.12, rand).scale(S * .17, S * .16, S * .13).move(S * .12, S * .04, S * .78));
      door(-S * .03, -S * .23, S * .02, S * .15, S * .15, seed * 149 + 30).forEach(m => meshes.push(m));
      windowOn([S * .13, -S * .22, S * .22], [0, -1, 0], S * .1, seed * 149 + 40).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), S * .4, { ordered: 'depth' });
    },
    // mushroom house: a cream stalk with a door and a round window, a big red spotted cap
    mushroomHouse(o) {
      const S = o.size || 180, seed = o.seed || 1, rand = rng(seed * 163), meshes = [];
      meshes.push(drum(8, [[S * .26, 0], [S * .22, S * .25], [S * .24, S * .44]], mat.plaster, seed * 163, rand));
      const cap = icosphere(2, mat.mushroom, seed * 163 + 1).jitter(.04, rand).floor(-.25);
      cap.scale(S * .48, S * .46, S * .32).move(0, 0, S * .46);
      meshes.push(cap);
      for (let i = 0; i < 7; i++) { // white spots on the cap
        const a = rand() * 6.28, el = .35 + rand() * .9, n = [Math.cos(a) * Math.cos(el), Math.sin(a) * Math.cos(el), Math.sin(el)];
        const sp = icosphere(0, mat.ballWhite, seed * 163 + 10 + i).scale(S * .055, S * .055, S * .022).move(n[0] * S * .48, n[1] * S * .46, S * .46 + n[2] * S * .32);
        sp.bias = S * .05; meshes.push(sp);
      }
      door(0, -S * .23, 0, S * .16, S * .14, seed * 163 + 20).forEach(m => meshes.push(m));
      windowOn([S * .13, -S * .21, S * .25], [0, -1, 0], S * .09, seed * 163 + 30).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), S * .45, { ordered: 'depth' });
    },
    // round building with a giant ball for a dome. o.ball: soccer | basket
    dome(o) {
      const S = o.size || 200, seed = o.seed || 1, rand = rng(seed * 167), R = S * .24, meshes = [], ball = o.ball || 'soccer';
      meshes.push(drum(9, [[R, 0], [R * .93, S * .18], [R * .97, S * .32]], mat[o.wall || 'plaster'], seed * 167, rand, null, null, { jr: .04 }));
      const b = icosphere(2, ball === 'basket' ? mat.basket : mat.ballWhite, seed * 167 + 1);
      b.f.forEach(f => {
        if (ball === 'soccer') { if (f[0] < 12 || f[1] < 12 || f[2] < 12) f[3] = mat.dark; } // a black pentagon around each of the 12 corners
        else { const cross = k => { const q = [b.v[f[0]][k], b.v[f[1]][k], b.v[f[2]][k]].map(x => x - .021); return Math.min(...q) < 0 && Math.max(...q) > 0; }; if (cross(0) || cross(2)) f[3] = mat.dark; } // seams: the faces that cross two great circles
      });
      const Rb = R * 1.75; // the ball is the cap: much wider than the base
      b.scale(Rb).rotZ(.4).move(0, 0, S * .3 + Rb * .82);
      meshes.push(b);
      door(0, -R * .95, 0, S * .14, S * .12, seed * 167 + 10).forEach(m => meshes.push(m));
      windowOn([R * .55, -R * .82, S * .2], [0, -1, 0], S * .07, seed * 167 + 20).forEach(m => meshes.push(m));
      return place(meshes, Object.assign({ rot: 0 }, o), R, { ordered: 'depth' });
    },
    // igloo: a dome of ice facets, an entrance tunnel, a little second dome for fun
    igloo(o) {
      const S = o.size || 160, seed = o.seed || 1, R = S * .5, meshes = [];
      const domeOf = (r, sd, det, x) => {
        const dm = icosphere(det, mat.ice, sd).jitter(.02, rng(sd)), cut = new Set();
        dm.v = dm.v.map((q, i) => { if (q[2] < 0) { cut.add(i); return [q[0], q[1], 0]; } return q; });
        dm.f = dm.f.filter(f => !(cut.has(f[0]) && cut.has(f[1]) && cut.has(f[2])));
        dm.center = [0, 0, 0];
        return dm.scale(r, r * .95, r * .82).map(q => [q[0] + q[2] * .08, q[1], q[2]]).move(x, 0, 0);
      };
      meshes.push(domeOf(R, seed * 151, 2, 0), domeOf(R * .42, seed * 151 + 1, 1, R * .95));
      const tun = lidPrism(R * .7, R * .72, R * .42, 4, mat.ice, seed * 151 + 2).rotZ(Math.PI / 2).move(-R * .15, -R * 1.0, 0);
      const hole = lidPrism(R * .05, R * .5, R * .3, 4, mat.windowDark, seed * 151 + 3).rotZ(Math.PI / 2).move(-R * .15, -R * 1.36, 0);
      hole.bias = R; meshes.push(tun, hole);
      return place(meshes, Object.assign({ rot: 0 }, o), R * 1.1, { ordered: 'depth' });
    },
    // ancient stone ruin: a platform, columns of different heights (some broken), a fallen column, scattered blocks
    ruin(o) {
      const S = o.size || 240, seed = o.seed || 1, rand = rng(seed * 157), st = mat.sandstone, r = S * .05, meshes = [];
      const base = icosphere(1, st, seed * 157).jitter(.16, rand).scale(1, 1, 1).floor(0); // sculpted stone, not a flat slab
      base.scale(S * .56, S * .26, S * .1); meshes.push(base);
      [[-S * .36, S * .06], [S * .4, -S * .04]].forEach(([x, y], i) => meshes.push(make.rock({ size: S * .14, h: .7, seed: seed * 157 + 70 + i, mat: st }).meshes[0].move(x, y, S * .04)));
      const hs = [1, .5, .82, .28], xs = [-.38, -.13, .13, .38];
      hs.forEach((k, i) => {
        const x = xs[i] * S, h = S * .5 * k;
        meshes.push(cylinder(8, .9, st, seed * 157 + 10 + i).scale(r, r, h).move(x, 0, S * .06));
        if (k > .8) meshes.push(box(r * 2.8, r * 2.8, S * .035, st, seed * 157 + 20 + i, .05).move(x, 0, S * .06 + h));
        else meshes.push(cone(6, st, seed * 157 + 30 + i, rand, .8).jitter(.25, rand).scale(r * .92, r * .92, S * .05).rotY((rand() - .5) * .5).move(x, 0, S * .06 + h - S * .01));
      });
      const lz = S * .06 + S * .5 * .82 + S * .035;
      meshes.push(box(S * .34, r * 2.6, S * .06, st, seed * 157 + 40, .05).rotY(-.08).move(xs[2] * S + S * .06, 0, lz + S * .01));
      meshes.push(limb([-S * .3, -S * .32, r], [S * .02, -S * .38, r], r, r * .95, st, seed * 157 + 50, 8));
      for (let i = 0; i < 3; i++) meshes.push(box(S * (.07 + rand() * .05), S * .06, S * .05, st, seed * 157 + 60 + i, .1).rotZ(rand() * 2).move(S * (.15 + i * .1), -S * (.3 + rand() * .06), 0));
      return place(meshes, Object.assign({ rot: 0 }, o), S * .5, { ordered: 'depth' });
    },
  });

  // ---------- side-view game world (bridge game) — approved 21.11.2026 ----------
  Object.assign(charMat, {
    fire: M(['#9c2a14', '#e0541f', '#ff8a2e', '#ffd23f'], .06), ember: M(['#5a1a10', '#8e2a18', '#c2402a'], .05),
    swamp: M(['#2f4a1c', '#4d6e2a', '#7a9a3e', '#a8c46a'], .07),
  });
  Object.assign(make, {
    // a stretch of land seen from the side: grass top (depth o.depth), a grass lip, a smooth earth front face in a few
    // big facets (no noise). x 0 → o.w, top at z = 0, front face down to z = −o.h. edgeL / edgeR = a pit on that side.
    // o.float = closed underneath like the floating island (narrowing ends, a few hanging points)
    ground(o) {
      const w = o.w || 400, h = o.h || 150, D = o.depth || 40, seed = o.seed || 1, rand = rng(seed * 137);
      const top = o.top || mat.grass, lipM = o.lip || mat.grassSide, side = o.side || mat.earth, rock = o.rock || mat.stone;
      const n = Math.max(o.float ? 3 : 1, Math.round(w / Math.min(o.step || 150, o.float ? w / 3 : 1e9))), lip = o.lipH == null ? Math.min(10, h * .08) : o.lipH;
      // two meshes, each with its center far away on its inner side (a wide slab has no single center that orients every facet)
      const topM = new Mesh(top, seed * 137), face = new Mesh(side, seed * 137 + 1);
      topM.center = [w / 2, D / 2, -1e6]; face.center = [w / 2, 1e6, -h / 2];
      const xs = []; for (let i = 0; i <= n; i++) xs.push(i === 0 ? 0 : i === n ? w : (i + (rand() - .5) * .5) * w / n);
      const jag = (i, k) => (i === 0 && o.edgeL ? (k % 2 ? 4 : -2) : i === n && o.edgeR ? (k % 2 ? -4 : 2) : 0);
      const grid = (mesh, rows, at) => rows.map((r, k) => xs.map((x, i) => at(x + jag(i, k), r, i, k)));
      const tri4 = (mesh, P, pick) => {
        const id = P.map(row => row.map(p => mesh.add(p)));
        for (let k = 0; k < id.length - 1; k++) for (let i = 0; i < n; i++) {
          const a = id[k][i], b = id[k][i + 1], c = id[k + 1][i + 1], d = id[k + 1][i];
          if ((i + k) % 2) { mesh.tri(a, b, c, pick(k, i)); mesh.tri(a, c, d, pick(k, i)); } else { mesh.tri(a, b, d, pick(k, i)); mesh.tri(b, c, d, pick(k, i)); }
        }
      };
      // top: front edge (y 0) → back (y D), bumpy so the grass gets several shades
      const T = grid(topM, [0, D], (x, y, i, k) => [x, y, k ? (rand() - .5) * D * .1 : 0]);
      tri4(topM, T, () => top);
      // lip + front face (y ≈ 0, jittered in depth so every facet catches the light differently)
      const zs = [0, -lip, -h * (o.float ? .45 : .55), -h];
      // float: closed underneath like the island — the body narrows at both ends and ends in a few big hanging points,
      // its lower faces turn back and down (they catch less light: volume instead of a flat wall)
      const ins1 = Math.min(w * .12, h * .3), ins2 = Math.min(w * .3, h * .7);
      const F = grid(face, zs, (x, z, i, k) => {
        if (o.float && k >= 2) {
          const end = i === 0 ? 1 : i === n ? -1 : 0, bottom = k === 3;
          return [x + end * (bottom ? ins2 : ins1) + (!end && bottom ? (rand() - .5) * w / n * .4 : 0), D * (bottom ? .5 : .15),
            bottom ? -h * (i % 2 ? .78 + rand() * .1 : .95 + rand() * .05) * (end ? .7 : 1) : z + (rand() - .5) * h * .12];
        }
        return [x, k === 0 || k === zs.length - 1 ? 0 : (rand() - .5) * 8 - 1, z + (k === 2 ? (rand() - .5) * h * .2 : 0)];
      });
      F[0] = T[0];
      tri4(face, F, k => (k === 0 ? lipM : o.rocks && rand() < o.rocks ? rock : side));
      return place([topM, face], o, 0);
    },
    // a flame: a pointed cone in fire colors with a glowing core (draw each flame in its own group to flicker it)
    flame(o) {
      const S = o.size || 60, seed = o.seed || 1, rand = rng(seed * 139);
      const outer = cone(5, mat.fire, seed * 139, rand, .55).scale(S * .26, S * .2, S), core = cone(4, mat.gold, seed * 139 + 1, rand, .5).scale(S * .13, S * .1, S * .55).move(0, -S * .12, 0);
      core.bias = S;
      return place([outer, core], o, 0, { ordered: 'depth' });
    },
    // a thorn: a tall thin spike (pit of thorns)
    thorn(o) {
      const S = o.size || 60, seed = o.seed || 1;
      return place([cone(4, o.mat || mat.stone, seed * 149, rng(seed * 149), .4).scale(S * .2, S * .16, S)], o, 0);
    },
    // a lily pad floating flat on the water
    lily(o) {
      const S = o.size || 30, m = new Mesh(o.mat || mat.leaf, (o.seed || 1) * 151), rand = rng((o.seed || 1) * 151);
      const c = m.add([0, 0, S * .05]), A = ring(m, 7, { r: S / 2, ry: .45, z: 0, jr: .1, ja: .3 }, rand);
      fan(m, c, A); m.center = [0, 0, -S];
      return place([m], o, 0);
    },
  });

  // ---------- flat side-view parts (2D, for game layers that must line up exactly with the play grid) ----------
  const flat = {
    // a spider web (waiting for approval): strands are thin lines, so it is flat. o.r = radius, o.kind 'round' | 'corner'
    // (a quarter that fans out from 0,0 toward +x +y — flip or rotate it for other corners), o.spokes, o.rings, o.color,
    // o.opacity, o.seed. → path markup around 0,0
    web(o) {
      o = o || {}; const r = o.r || 60, corner = o.kind === 'corner', n = o.spokes || (corner ? 5 : 9), rings = o.rings || 5, rand = rng(o.seed || 1);
      const a0 = corner ? 0 : rand() * 6.28, sp = [];
      for (let i = 0; i < n; i++) sp.push([corner ? a0 + Math.PI / 2 * i / (n - 1) : a0 + Math.PI * 2 * i / n, r * (.86 + rand() * .2)]);
      const f1 = v => v.toFixed(1);
      let d = '';
      sp.forEach(([a, L]) => { d += `M0,0L${f1(Math.cos(a) * L)},${f1(Math.sin(a) * L)}`; });
      for (let k = 1; k <= rings; k++) {
        const f = k / (rings + .4), pts = sp.map(([a, L]) => { const q = L * f * (.92 + rand() * .12); return [Math.cos(a) * q, Math.sin(a) * q]; });
        const list = corner ? pts : pts.concat([pts[0]]);
        for (let i = 1; i < list.length; i++) {
          const p = list[i - 1], q = list[i], mx = (p[0] + q[0]) / 2 * .9, my = (p[1] + q[1]) / 2 * .9; // each thread sags toward the middle
          d += (i === 1 ? `M${f1(p[0])},${f1(p[1])}` : '') + `Q${f1(mx)},${f1(my)} ${f1(q[0])},${f1(q[1])}`;
        }
      }
      const w = o.width || Math.max(.8, r * .014);
      return `<path d="${d}" fill="none" stroke="${o.color || '#fff'}" stroke-opacity="${o.opacity == null ? .7 : o.opacity}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
    },
    // a thin bridge seen from the side (approved design from the bridge game): a deck in one color per segment,
    // a post on every unit, a wooden rail on top. segs = [{n, color}], unit = px per unit. → {svg, w, h}
    bridge(o) {
      const U = o.unit || 40, segs = o.segs || [{ n: 5, color: '#ad7a45' }], n = segs.reduce((s, g) => s + g.n, 0), w = n * U, H = 24, deckY = 14;
      const post = o.post || '#8A5A34', rail = o.rail || '#A06A40';
      let el = '', x = 0;
      segs.forEach(g => { const sw = g.n * U; el += `<rect x="${x}" y="${deckY}" width="${sw}" height="8" fill="${g.color}"/><rect x="${x}" y="${deckY}" width="${sw}" height="3" fill="rgba(255,255,255,.35)"/>`; x += sw; });
      el += `<rect x="0" y="${deckY + 6}" width="${w}" height="2" fill="rgba(0,0,0,.18)"/>`;
      for (let i = 0; i <= n; i++) { const px = Math.min(w - 3, Math.max(0, i * U - 1.5)); el += `<rect x="${px}" y="3" width="3" height="${deckY - 2}" fill="${post}"/>`; }
      el += `<rect x="0" y="2" width="${w}" height="3" rx="1.5" fill="${rail}"/>`;
      return { svg: `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" style="display:block;overflow:visible">${el}</svg>`, w, h: H, deckY };
    },
  };

  // ---------- the detective's tower (elevator game) ----------
  // one floor seen from the front, like a toy house: a dark shaft on the left, a window, and an iron stairway outside on the
  // right, going up to the next floor. x = 0 is the tower's left edge, z = 0 the floor, y = 0 where a character stands.
  // o: w, h (floor to floor), shaft (its width), sx0 → sx1 (the stairs' bottom and top; omit sx0 for none), lit, ledge, seed
  Object.assign(make, {
    towerFloor(o) {
      const w = o.w, h = o.h, sw = o.shaft, L = o.ledge || h * .34, seed = o.seed || 1, fy = L / 2, D = h * .5, meshes = [];
      const put = (b, x, y, z) => { meshes.push(b.move(x, y, z)); return b; };
      put(box(w - sw, D, h, o.mat || mat.brick, seed * 61, .03), sw + (w - sw) / 2, fy + D / 2, 0);
      put(box(sw, D, h, mat.masonry, seed * 61 + 1, .02), sw / 2, fy + D / 2, 0);
      meshes.push(decal([[sw * .12, 0], [sw * .88, 0], [sw * .88, h], [sw * .12, h]], fy, mat.windowDark, seed * 61 + 2));
      [.3, .7].forEach((k, i) => put(box(sw * .05, 1, h, mat.iron, seed * 61 + 3 + i, .02), sw * k, fy - 1.5, 0));
      // window, dark or lit
      // o.plain: a bare wall — no window and no ledge (nothing to count floor by floor); o.noLedge: the window only
      const ws = Math.min(h * .56, (w - sw) * .3), wx = o.winX != null ? o.winX : sw + (w - sw) * .22, wz = h * .5;
      const B = (a, b, c, m, dx, dz, k, sd) => put(box(a, b, c, m, sd, .04), wx + dx, fy - k, wz - c / 2 + dz);
      if (!o.plain) {
        B(ws * 1.16, 2, ws * 1.2, mat.wood, 0, 0, 1, seed * 61 + 10);
        B(ws * .94, 2, ws * .98, o.lit ? mat.lampLight : mat.windowDark, 0, 0, 2.4, seed * 61 + 11);
        B(ws * .09, 2, ws, mat.wood, 0, 0, 3.4, seed * 61 + 12); B(ws * .96, 2, ws * .09, mat.wood, 0, 0, 3.6, seed * 61 + 13);
      }
      // ledge to walk on
      if (!o.plain && !o.noLedge) put(box(w + h * .12, L, h * .09, mat.iron, seed * 61 + 20, .04), w / 2, 0, -h * .09);
      if (o.sx0 != null) {
        const n = 4, x0 = o.sx0, x1 = o.sx1, dx = (x1 - x0) / n;
        meshes.push(limb([x0, L * .3, -h * .03], [x1, L * .3, h * .95], h * .035, h * .035, mat.iron, seed * 61 + 30, 4));
        for (let i = 0; i < n; i++) put(box(Math.abs(dx) * 1.12, L * .8, h * .075, mat.iron, seed * 61 + 31 + i, .05), x0 + dx * (i + .5), 0, h * (i + 1) / n - h * .11);
        meshes.push(limb([x0, -L * .4, -h * .03], [x1, -L * .4, h * .95], h * .035, h * .035, mat.iron, seed * 61 + 40, 4));
      }
      return place(meshes, Object.assign({ rot: 0 }, o, { x: 0 }), 0, { ordered: 'list' });
    },
    // triangular roof with a thick rim, a round window and an antenna with a bulb; stands at z = 0
    towerRoof(o) {
      const w = o.w, h = o.h, seed = o.seed || 1, D = h * .5, meshes = [], cx = w / 2, over = w * .07, hw = w / 2 + over;
      const gh = h * (w / 2) / hw;
      meshes.push(limb([cx, D * .6, h * .8], [cx, D * .6, h * 1.62], w * .014, w * .008, mat.iron, seed * 67, 4));
      meshes.push(limb([cx - w * .08, D * .6, h * 1.3], [cx + w * .08, D * .6, h * 1.3], w * .008, w * .008, mat.iron, seed * 67 + 1, 4));
      meshes.push(icosphere(0, mat.flag, seed * 67 + 2).scale(w * .03).move(cx, D * .6, h * 1.66));
      meshes.push(gableWall(w, D, gh, mat.brick, seed * 67 + 3).move(cx, D / 2, 0));
      meshes.push(decal([[cx, gh], [cx + w / 2, 0], [cx, 0]], 0, M(['#4a2233', '#743846', '#9a5658'], .02), seed * 67 + 4));
      const ds = h * .2; [[1.25, mat.wood, 1], [1, mat.lampLight, 2]].forEach(([k, m, b], i) => { const d = disc(ds * k, 2, 8, m, seed * 67 + 5 + i, .02).move(cx, -b, h * .34 - ds * k); meshes.push(d); });
      roofSlabs(w, D, h, over, h * .16, mat.roofBlue, seed * 67 + 8, h).forEach(m => meshes.push(m.move(cx, D / 2, 0)));
      return place(meshes, Object.assign({ rot: 0 }, o), 0, { ordered: 'list' });
    },
    // the elevator cabin, in two layers: part 'back' (lit inside) goes behind the rider, 'front' (posts, gate) over the rider
    lift(o) {
      const w = o.w, h = o.h, seed = o.seed || 1, meshes = [], g = mat.gold, t = w * .09;
      const put = (b, x, y, z) => meshes.push(b.move(x, y, z));
      if (o.part === 'front') {
        [-1, 1].forEach((sx, i) => put(box(t, t, h * .9, g, seed * 71 + i, .05), sx * (w / 2 - t / 2), -t, 0));
        [.12, .3].forEach((k, i) => put(box(w * .86, t * .5, t * .55, g, seed * 71 + 4 + i, .05), 0, -t * 1.2, h * k));
        put(box(w * 1.06, t * 1.6, t * 1.1, g, seed * 71 + 2, .06), 0, -t, h * .86);
        put(box(w * 1.06, t * 1.6, t * .9, g, seed * 71 + 8, .06), 0, -t, -t * .5);
      } else {
        put(box(w * .94, t, h * .9, mat.wood, seed * 71 + 10, .02), 0, t, 0);
        put(box(w * .8, 1, h * .78, mat.lampLight, seed * 71 + 11, .03), 0, t * .4, h * .04);
      }
      return place(meshes, Object.assign({ rot: 0 }, o, { w: undefined }), 0, { ordered: 'list' });
    },
    // the evidence board: a wooden frame around dark cork
    board(o) {
      const w = o.w, h = o.h, seed = o.seed || 1, f = o.frame || Math.min(w, h) * .05, meshes = [];
      const put = (b, x, y, z) => meshes.push(b.move(x, y, z));
      put(box(w, 8, h, mat.wood, seed * 73, .02), 0, 4, 0);
      put(box(w - 2 * f, 4, h - 2 * f, mat.cork, seed * 73 + 1, .04), 0, -2, f);
      return place(meshes, Object.assign({ rot: 0 }, o), 0, { ordered: 'list' });
    },
  });

  // ---------- backdrops (whole scenes) ----------
  const scenes = {
    // noir backdrop (the elevator game): LP.useTheme('noir') first. A night city in two rows with a big faceted
    // moon, long clouds and lit windows. Markup for viewBox 0 0 1200 800 (slice); the ground is the game's.
    noir(o) {
      o = o || {}; const T = theme, W = 1200, id = o.id || 'noir', sky = o.sky || T.sky; // o.sky: another sky (an almost black one for contrast); the city does not change
      let svg = `<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".55" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
        <radialGradient id="${id}glow"><stop offset="0" stop-color="${T.glow}" stop-opacity="${o.sky ? .34 : .55}"/><stop offset=".5" stop-color="${T.glow}" stop-opacity="${o.sky ? .07 : .16}"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient></defs>
        <rect width="${W}" height="800" fill="url(#${id}sky)"/><circle cx="600" cy="190" r="260" fill="url(#${id}glow)"/>`;
      svg += draw({ meshes: [icosphere(1, M(['#b7ae96', '#dcd3b4', '#f2ead0', '#fffbea'], .05), 5).scale(86)] }, camera({ a: .2, ox: 600, oy: 190 }));
      const rand = rng(77); for (let i = 0; i < 26; i++) { const x = rand() * W, y = rand() * 330, r = 1.2 + rand() * 1.8; svg += `<polygon points="${x.toFixed(1)},${(y - r * 1.6).toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + r * 1.6).toFixed(1)} ${(x - r).toFixed(1)},${y.toFixed(1)}" fill="#fff" opacity="${(.35 + rand() * .4).toFixed(2)}"/>`; }
      [[180, 150, 130, 170, 'long'], [780, 250, 150, 210, 'long'], [1080, 110, 110, 190, 'long']].forEach(([x, y, sz, dur, kind], i) => {
        svg += `<g class="cloud" style="animation-duration:${dur}s;animation-delay:${-(x / 1400 * dur).toFixed(1)}s" opacity="${o.sky ? .3 : .8}">${draw(make.cloud({ size: sz, seed: i + 3, detail: 1, kind }), camera({ a: .16, ox: 0, oy: y }))}</g>`;
      });
      // o.clear = [x0, x1]: no building of the city may stand there (behind the game's own tower)
      const at = (list, oy, fog) => list.forEach(([mk, x, opt]) => {
        const cam = camera({ a: .1, ox: x, oy }), l = facets(make[mk](Object.assign({ fog }, opt)), cam), b = bounds(l);
        if (!o.clear || b.x + b.w < o.clear[0] || b.x > o.clear[1]) svg += polys(l);
      });
      at([['tallTower', 70, { size: 420, seed: 2, style: 'setback', mat: 'violet' }], ['tallTower', 250, { size: 330, seed: 3, style: 'tiers', mat: 'towerBlue' }], ['tallTower', 420, { size: 440, seed: 4, style: 'twist', mat: 'teal' }],
        ['tallTower', 660, { size: 360, seed: 6, style: 'setback', mat: 'towerBlue' }], ['tallTower', 830, { size: 440, seed: 5, style: 'tiers', mat: 'violet' }], ['tallTower', 1010, { size: 340, seed: 8, style: 'twist', mat: 'teal' }], ['tallTower', 1150, { size: 420, seed: 9, style: 'setback', mat: 'towerBlue' }]], 720, .55);
      at([['officeTower', 160, { size: 270, seed: 2, mat: 'towerBlue', windows: 'windowLight', top: 'antenna' }], ['officeTower', 545, { size: 240, seed: 3, mat: 'teal', windows: 'windowLight', top: 'antenna' }],
        ['officeTower', 925, { size: 260, seed: 4, mat: 'violet', windows: 'windowLight', top: 'helipad' }]], 800, .3);
      return svg;
    },
    // spider world backdrop (twins game, portrait phones — approved 28.11.2026): LP.useTheme('spider') first. Dusk between
    // purple and orange: a big low faceted sun, purple ridges running to the bottom in a warm fog, bare trees on the hills, webs in the
    // top corners, long clouds, glowing spores. The middle third (x 380–820) is what a portrait phone sees.
    spider(o) {
      o = o || {}; const T = theme, W = 1200, id = o.id || 'spd', sx = 690, sy = 250;
      let svg = `<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset=".55" stop-color="${T.sky[1]}"/><stop offset="1" stop-color="${T.sky[2]}"/></linearGradient>
        <radialGradient id="${id}glow"><stop offset="0" stop-color="${T.glow}" stop-opacity=".85"/><stop offset=".45" stop-color="${T.glow}" stop-opacity=".3"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient></defs>
        <rect width="${W}" height="800" fill="url(#${id}sky)"/><circle cx="${sx}" cy="${sy}" r="260" fill="url(#${id}glow)"/><polygon points="${Array.from({ length: 11 }, (_, i) => { const t = i / 11 * 6.283 + .3; return (sx + Math.cos(t) * 62).toFixed(1) + ',' + (sy + Math.sin(t) * 62).toFixed(1); }).join(' ')}" fill="${T.sun}"/>`;
      [[300, 140, 170, 160], [900, 190, 150, 180]].forEach(([x, y, sz, dur], i) => {
        svg += `<g class="cloud" style="animation-duration:${dur}s;animation-delay:${-(x / 1400 * dur).toFixed(1)}s" opacity=".55">${draw(make.cloud({ size: sz, seed: i + 5, detail: 1, kind: 'long' }), camera({ a: .16, ox: 0, oy: y }))}</g>`;
      });
      const rand = rng(41); for (let i = 0; i < 22; i++) { const x = rand() * W, y = 120 + rand() * 480, r = 1.4 + rand() * 2.2; svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#ffc46a" opacity="${(.25 + rand() * .45).toFixed(2)}"/>`; }
      const BASE = 860, ca = Math.cos(.16);
      [{ oy: 520, width: 1700, h: 250, count: 6, seed: 7, fog: .5, snow: false }, { oy: 600, width: 1800, h: 180, count: 7, seed: 15, fog: .28, snow: false, mat: mat.leaf },
       { oy: 650, width: 1900, h: 110, count: 8, seed: 23, fog: .1, snow: false, mat: mat.grass }].forEach(r => {
        svg += draw(make.ridge(Object.assign({ skirt: (BASE - r.oy) / ca }, r)), camera({ a: .16, ox: W / 2, oy: r.oy }));
      });
      const trees = [[330, 632, 100, 1], [560, 620, 82, 2], [820, 634, 108, 3]];   // few: a bare tree is many facets
      trees.forEach(([x, y, sz, k]) => { const l = facets(make.tree({ size: sz, seed: k * 11, kind: 'bare', fog: .2 }), camera({ a: .3, ox: x, oy: y })), b = bounds(l);
        if (!o.clear || b.x + b.w < o.clear[0] || b.x > o.clear[1]) svg += polys(l); });
      // webs hang in the top corners of what a portrait phone sees (x 390–810) and of the wide picture — never behind the game in the middle
      [[392, 1, 150, 3], [808, -1, 150, 4], [0, 1, 190, 5], [1200, -1, 190, 6]].forEach(([x, k, r, sd]) => {
        svg += `<g transform="translate(${x},0) scale(${k},1)">${flat.web({ r, kind: 'corner', seed: sd, opacity: .5, spokes: 6, rings: 6 })}</g>`; });
      return svg;
    },
    // meadow backdrop (approved in the bridge game, 21.11.2026): sky and sun glow from the theme, a far snowy ridge in fog,
    // two rows of green hills whose shapes run down to the bottom, drifting clouds of three kinds, a few low-detail trees. Markup for viewBox 0 0 1200 800 (use preserveAspectRatio
    // "xMidYMid slice"). Clouds come in <g class="cloud"> with a duration and delay: animate .cloud in the page to drift them.
    meadow(o) {
      o = o || {}; const T = theme, W = 1200, id = o.id || 'mdw';
      let svg = `<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset=".55" stop-color="${T.sky[1]}"/><stop offset="1" stop-color="${T.sky[2]}"/></linearGradient>
        <radialGradient id="${id}glow"><stop offset="0" stop-color="${T.glow}" stop-opacity=".9"/><stop offset=".4" stop-color="${T.glow}" stop-opacity=".4"/><stop offset="1" stop-color="${T.glow}" stop-opacity="0"/></radialGradient></defs>
        <rect width="${W}" height="800" fill="url(#${id}sky)"/><circle cx="210" cy="140" r="200" fill="url(#${id}glow)"/><polygon points="${Array.from({ length: 9 }, (_, i) => { const t = i / 9 * 6.283 + .2; return (210 + Math.cos(t) * 38).toFixed(1) + ',' + (140 + Math.sin(t) * 38).toFixed(1); }).join(' ')}" fill="${T.sun}"/>`; // a faceted sun, not a perfect disc
      // clouds: three kinds, never two the same in a row
      [[120, 130, 170, 140, 'long'], [560, 80, 120, 180, 'round'], [860, 210, 100, 110, 'tall'], [1060, 150, 150, 160, 'long']].forEach(([x, y, s, dur, kind], i) => {
        svg += `<g class="cloud" style="animation-duration:${dur}s;animation-delay:${-(x / 1400 * dur).toFixed(1)}s">${draw(make.cloud({ size: s, seed: i + 3, detail: 1, kind }), camera({ a: .16, ox: 0, oy: y }))}</g>`;
      });
      // mountains and hills (approved), unchanged — only each cone's base continues down along its own slope to the bottom
      // of the picture (no flat band under them)
      const BASE = 860, ca = Math.cos(.16);
      [{ oy: 540, width: 1700, h: 230, count: 5, seed: 5, fog: .55, snow: .74 }, { oy: 610, width: 1800, h: 190, count: 6, seed: 13, fog: .3, snow: false, mat: mat.leaf },
       { oy: 650, width: 1900, h: 120, count: 8, seed: 21, fog: .1, snow: false, mat: mat.grass }].forEach(r => {
        svg += draw(make.ridge(Object.assign({ skirt: (BASE - r.oy) / ca }, r)), camera({ a: .16, ox: W / 2, oy: r.oy }));
      });
      [[70, 640, 90, 1], [190, 625, 70, 2], [1110, 640, 95, 3], [1000, 628, 66, 4], [300, 648, 60, 5], [900, 646, 64, 6]].forEach(([x, y, s, k]) => {
        const t = k % 3 ? make.tree({ size: s, seed: k * 7, kind: 'round', detail: 0, fog: .15 }) : make.pine({ size: s * 1.1, seed: k * 7, fog: .15 });
        const l = facets(t, camera({ a: .3, ox: x, oy: y })), b = bounds(l);
        // o.clear = [x0, x1]: no tree may stand there (behind the game's own tower), as in the noir backdrop
        if (!o.clear || b.x + b.w < o.clear[0] || b.x > o.clear[1]) svg += polys(l);
      });
      return svg;
    },
  };

  // ---------- biomes: a ground and the things that belong on it, kept together (ice things on ice, a forest on grass…) ----------
  // ground: materials by name ('grass') or [theme, name] for another theme's material. decor: [make, options, height × the
  // hero's height, tall] — tall things stand at the back of the ground, behind the character; small ones in front.
  const biomes = {
    meadow: { top: 'grass', side: 'earth', decor: [['tree', { kind: 'round', detail: 0 }, 2.2, 1], ['bush', {}, .42], ['flower', {}, .36], ['rock', {}, .13]] },
    hills:  { top: 'grass', side: ['desert', 'earth'], decor: [['tree', { kind: 'tall', detail: 0 }, 2.3, 1], ['stump', {}, .3], ['bush', {}, .42], ['flower', {}, .36]] },
    desert: { top: ['desert', 'grass'], lip: ['desert', 'grassSide'], side: 'sandstone', decor: [['cactus', {}, 1.4, 1], ['rock', { mat: 'sandstone' }, .13], ['log', {}, .28]] },
    rocky:  { top: 'leafTeal', side: 'stone', decor: [['tree', { kind: 'bare' }, 2, 1], ['rock', {}, .16], ['stump', {}, .3]] },
    forest: { top: 'pine', side: 'trunk', decor: [['pine', {}, 2.4, 1], ['tree', { kind: 'round', detail: 0, mat: 'leafTeal' }, 2.1, 1], ['stump', {}, .3], ['log', {}, .28], ['bush', { mat: 'pine' }, .42]] },
    ice:    { top: 'snow', lip: 'snow', side: ['ice', 'stone'], decor: [['pine', { mat: 'ice' }, 2.2, 1], ['rock', { mat: 'ice' }, .15], ['bush', { mat: 'snow' }, .36]] },
    // the spider world (LP.useTheme('spider') first — approved 28.11.2026)
    webwood: { top: ['spider', 'grass'], lip: ['spider', 'grassSide'], side: ['spider', 'earth'], decor: [['tree', { kind: 'bare', web: true }, 2.1, 1], ['toadstool', { mat: ['spider', 'glowcap'] }, .32], ['stump', {}, .3], ['rock', { mat: ['spider', 'stone'] }, .14]] },
    crystal: { top: ['spider', 'leafTeal'], lip: ['spider', 'grassSide'], side: ['spider', 'stone'], decor: [['rock', { mat: ['spider', 'crystal'], h: 1.7 }, .8, 1], ['toadstool', { mat: ['spider', 'glowcap'] }, .32], ['rock', { mat: ['spider', 'stone'] }, .15]] },
    ember:   { top: ['spider', 'autumn'], lip: ['spider', 'leafYellow'], side: ['spider', 'earth'], decor: [['tree', { kind: 'bare', web: true }, 2, 1], ['toadstool', { mat: ['spider', 'glowcap'] }, .3], ['log', {}, .28]] },
  };
  const matOf = v => (v == null ? undefined : Array.isArray(v) ? themes[v[0]].mat[v[1]] : mat[v]);
  // → { top, lip, side (ready for make.ground), decor: [{ size, tall, make(o) }] }
  function biome(name) {
    const b = biomes[name] || biomes.meadow, g = { name, top: matOf(b.top), lip: matOf(b.lip), side: matOf(b.side) };
    g.decor = b.decor.map(([mk, opt, size, tall], i) => ({ id: name + i, size, tall: !!tall, web: !!opt.web,
      make: o => make[mk](Object.assign({}, opt, opt.mat ? { mat: matOf(opt.mat) } : null, o)) }));
    return g;
  }

  // ---------- the child's own hero ----------
  // look = { shirt|pants|shoes|hair: {color}, glasses|hat: {kind, color} } — every slot optional; an empty look is the
  // default hero. Every game and page draws the child's character through this one function.
  function hero(look, o) {
    const L = look || {}, m = k => (L[k] && L[k].color ? dye(L[k].color) : undefined);
    const browOf = c => { const [h, s, l] = toHsl(c); return fromHsl(h, s, Math.min(l * .6, .34)); };
    return make.buddy(Object.assign({ outfit: 'kid', size: 100, shirt: m('shirt'), pants: m('pants'), shoe: m('shoes'), hair: m('hair'),
      browColor: L.hair && L.hair.color ? browOf(L.hair.color) : undefined,
      glasses: L.glasses, hat: L.hat && L.hat.kind ? { kind: L.hat.kind, mat: dye(L.hat.color || '#ef5c55') } : undefined }, o));
  }

  // the colours the hero wears now (look from the shop) — for particles when the hero bursts, and anything else that should match
  function heroColors(look) {
    const L = look || {}, c = (k, d) => (L[k] && L[k].color) || d, shirt = c('shirt', '#ef5c55');
    return [shirt, shade(shirt, .78), '#f2bb92', c('pants', '#4776c0'), c('hair', '#5e4130'), c('shoes', '#3f444c')]
      .concat(L.hat && L.hat.kind ? [L.hat.color || '#ef5c55'] : [], L.glasses && L.glasses.kind ? [L.glasses.color || '#33373b'] : []);
  }

  // ---------- living characters (the elevator game, 24.11.2026): for every character in every game ----------
  // a character is never frozen, also while nothing happens: it looks where something happens, blinks, its brows play, it
  // makes faces and small acts while waiting. One mind per character:
  //   const m = LP.mind({ acts: [...] });  each frame: m(now in ms, input) → { pose, t, rot, expression, gaze, blink, talk, brows }
  // input: look [x, y] in -1..1 (or null: glances around), talking, pose + expression the game wants now (pose 'stand' = free),
  //   mood 'calm' | 'happy' | 'unhappy' (brows), idle: true = waiting for the child, acts are allowed, rot: the resting turn.
  const ACTS = [{ pose: 'wave', expression: 'happy', ms: 1900 }, { expression: 'joy', ms: 1500 }, { expression: 'surprised', ms: 1200 },
    { pose: 'think', expression: 'puzzled', ms: 2000 }, { pose: 'wave', expression: 'joy', ms: 1800 }, { pose: 'jump', expression: 'joy', ms: 1000 }];
  const BROW_ACTS = [[[0, .09], [0, .09]], [[.02, .13], [-.02, -.04]], [[-.02, -.04], [.02, .13]], [[-.06, -.05], [-.06, -.05]], [[.06, .05], [.06, .05]], [[0, .14], [0, .14]]];
  const MOODS = { calm: [0, 0], happy: [.02, .1], unhappy: [-.05, -.03] };
  function mind(o) {
    o = o || {};
    const acts = o.acts || ACTS, turn = o.turn == null ? .3 : o.turn, R = (a, b) => a + Math.random() * (b - a);
    const g = [0, 0], b = [[0, 0], [0, 0]];
    let t0 = null, poseNow = '', poseT = 0, act = null, actEnd = 0, nextAct = 0, lastAct = -1, blinkAt = 0, blink2 = false, glance = [0, 0], nextGlance = 0, brow = null, browEnd = 0, nextBrow = 0, rot = null;
    return function (now, inp) {
      inp = inp || {};
      if (t0 == null) { t0 = now; blinkAt = now + R(800, 2500); nextAct = now + R(2500, 5000); nextBrow = now + R(700, 1800); nextGlance = now + R(800, 2000); }
      const free = !inp.pose || inp.pose === 'stand' || inp.pose === o.rest;
      // acts, only while waiting; never the same one twice in a row
      if (act && (now > actEnd || !inp.idle || !free)) { act = null; nextAct = now + R(2600, 5200); }
      if (!act && inp.idle && free && !inp.talking && acts.length && now > nextAct) {
        let i = Math.floor(Math.random() * acts.length); if (i === lastAct) i = (i + 1) % acts.length;
        lastAct = i; act = acts[i]; actEnd = now + act.ms;
      }
      if (!inp.idle) nextAct = Math.max(nextAct, now + 1200);
      const pose = !free ? inp.pose : (act && act.pose) || o.rest || 'stand';
      if (pose !== poseNow) { poseNow = pose; poseT = now; }
      // eyes: at what happens, or small glances around
      if (now > nextGlance) { nextGlance = now + R(900, 2800); glance = Math.random() < .45 ? [0, 0] : [R(-.8, .8), R(-.5, .5)]; }
      const want = inp.look || glance, far = Math.abs(want[0] - g[0]) + Math.abs(want[1] - g[1]);
      if (far > 1 && now > blinkAt - 900 && now < blinkAt) blinkAt = now; // a big jump of the eyes often comes with a blink
      for (let i = 0; i < 2; i++) g[i] += (want[i] - g[i]) * .3;
      if (now > blinkAt + 130) { blink2 = !blink2 && Math.random() < .2; blinkAt = now + (blink2 ? 180 : R(1800, 4600)); }
      // brows: they play while nothing is said, bounce with the words, and carry the mood
      if (brow && now > browEnd) { brow = null; nextBrow = now + R(900, 2600); }
      if (!brow && now > nextBrow) { brow = BROW_ACTS[Math.floor(Math.random() * BROW_ACTS.length)]; browEnd = now + R(450, 1100); }
      const md = MOODS[inp.mood] || MOODS.calm, sp = inp.talking ? .05 * Math.sin(now / 170) : 0, k = inp.mood && inp.mood !== 'calm' ? .4 : 1;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) b[i][j] += ((brow ? brow[i][j] * k : 0) + md[j] + (j ? sp : 0) - b[i][j]) * .35;
      const base = inp.rot || 0, wr = base + g[0] * turn;
      rot = rot == null || inp.snap ? wr : rot + (wr - rot) * .35;
      return { pose, t: (now - poseT) / 1000, rot, expression: (act && act.expression) || inp.expression, gaze: [g[0], g[1]], blink: now >= blinkAt && now <= blinkAt + 130,
        talk: inp.talking ? .15 + .85 * Math.abs(Math.sin(now / 95) * Math.cos(now / 410)) : 0, brows: [b[0].slice(), b[1].slice()] };
    };
  }
  // draws a living character into an <svg> and keeps it alive (a fixed pool of polygons; a resting body is not redrawn, only its
  // face). o: make(p) → object, mind, input() → the mind's input (+ anything make needs; a number in `redraw` forces a new body),
  // a = camera tilt, fps, talkBody: the body moves with the words (a moustache). → stop()
  const MOVING = { walk: 1, jump: 1, cheer: 1, scared: 1, wave: 1, think: 1 };
  function perform(el, o) {
    const NS = 'http://www.w3.org/2000/svg', D = el.ownerDocument, cam = camera({ a: o.a == null ? .3 : o.a }), g = D.createElementNS(NS, 'g'), fg = D.createElementNS(NS, 'g'), pool = [];
    el.replaceChildren(g, fg);
    const m = o.mind || mind(), still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let obj = null, key = '', faceWas = '', last = -1e9, raf = 0;
    const body = x => {
      const l = facets(x, cam);
      for (let i = 0; i < Math.max(l.length, pool.length); i++) {
        let p = pool[i];
        if (!p) { p = D.createElementNS(NS, 'polygon'); p.setAttribute('stroke-width', '.7'); p.setAttribute('stroke-linejoin', 'round'); g.appendChild(p); pool.push(p); }
        const f = l[i];
        if (!f) { if (!p._h) { p.setAttribute('display', 'none'); p._h = 1; } continue; }
        if (p._h) { p.removeAttribute('display'); p._h = 0; }
        p.setAttribute('points', f.pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '));
        if (p._f !== f.fill) { p.setAttribute('fill', f.fill); p.setAttribute('stroke', f.fill); p._f = f.fill; }
      }
    };
    const frame = now => {
      const inp = o.input ? o.input() : {}, p = m(now, inp);
      if (still) Object.assign(p, { blink: false, talk: 0 });
      const k = [p.pose, p.expression, Math.round(p.rot * 40), inp.redraw, o.talkBody ? p.talk.toFixed(1) : ''].join('|');
      if (!obj || MOVING[p.pose] || k !== key) { key = k; obj = o.make(Object.assign({}, inp, p)); body(obj); }
      else if (obj.face) Object.assign(obj.face, { gaze: p.gaze, blink: p.blink, talk: p.talk, brows: p.brows });
      const f = face(obj, cam); if (f !== faceWas) { faceWas = f; fg.innerHTML = f; }
    };
    const loop = now => { raf = root.requestAnimationFrame(loop); if (now - last < 1000 / (o.fps || 18) - 2) return; last = now; frame(now); };
    frame(root.performance.now());
    raf = root.requestAnimationFrame(loop);
    return () => root.cancelAnimationFrame(raf);
  }
  // where to look, from the middle of an element to a point on the screen (client coordinates) → [x, y] in -1..1
  function lookAt(el, x, y) {
    const r = el.getBoundingClientRect(), c = n => Math.max(-1, Math.min(1, n));
    return [c((x - r.left - r.width / 2) / 110), c((y - r.top - r.height * .4) / 100)];
  }

  const LP = { mind, perform, lookAt, hero, heroColors, dye, flat, scenes, biomes, biome, rng, camera, poses, face, project, facets, polys, draw, bounds, hull, castShadow, outline, material, mat, themes, useTheme, make, Mesh, icosphere, cone, cylinder, limb, ring, stitch, fan, hex2rgb, rgb2hex };
  root.LP = LP;
  useTheme('day');
})(typeof window !== 'undefined' ? window : globalThis);
