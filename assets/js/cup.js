/* =====================================================================
   Tess Coffee · the rotating cup
   A small, dependency-free WebGL renderer for the Tess takeaway cup from
   the shop's poster: deep green paper, gold leaves, cream script, and the
   gold Ethiopian pattern band around the base. "ቡና" (buna, coffee) is
   printed on the back.

   The artwork is drawn at runtime from the logo paths inlined in
   index.html, so it works when the page is opened straight from disk.
   ===================================================================== */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* ---------- small matrix helpers (column-major, like WebGL) ---------- */
  function m4() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  var tmp = new Float32Array(16);
  function mul(out, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      for (var r = 0; r < 4; r++) tmp[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
    }
    out.set(tmp);
    return out;
  }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }
  function lookAt(out, e, t) {
    var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], l = Math.hypot(zx, zy, zz);
    zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xy, xz); xx /= l; xz /= l; // up = (0,1,0)
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    out[15] = 1;
    return out;
  }
  // T(p) * Rx(ax) * Ry(ay) * S(s)
  function compose(out, px, py, pz, ax, ay, sx, sy, sz) {
    var cx = Math.cos(ax), sxn = Math.sin(ax), cy = Math.cos(ay), syn = Math.sin(ay);
    out[0] = cy * sx;          out[1] = sxn * syn * sx;  out[2] = -cx * syn * sx;   out[3] = 0;
    out[4] = 0;                out[5] = cx * sy;         out[6] = sxn * sy;            out[7] = 0;
    out[8] = syn * sz;         out[9] = -sxn * cy * sz;  out[10] = cx * cy * sz;      out[11] = 0;
    out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
    return out;
  }
  function xf(m, x, y, z) {
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  }
  // normal matrix for compose(): R * S^-1
  function normalMat(out, ax, ay, sx, sy, sz) {
    var cx = Math.cos(ax), sxn = Math.sin(ax), cy = Math.cos(ay), syn = Math.sin(ay);
    out[0] = cy / sx;   out[1] = sxn * syn / sx;  out[2] = -cx * syn / sx;
    out[3] = 0;         out[4] = cx / sy;         out[5] = sxn / sy;
    out[6] = syn / sz;  out[7] = -sxn * cy / sz;  out[8] = cx * cy / sz;
    return out;
  }
  function project(vp, x, y, z) {
    var X = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    var Y = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    var W = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    return [X / W, Y / W];
  }

  /* ---------- geometry: surfaces of revolution ---------- */
  // profile: [[r, y, crease?], ...] walked so that the outside is on the right-hand side
  function lathe(profile, segs, vMode) {
    var rows = [], i, j;
    for (j = 0; j < profile.length; j++) {
      var p = profile[j], prev = profile[j - 1], next = profile[j + 1];
      var nIn = prev ? segN(prev, p) : null, nOut = next ? segN(p, next) : null;
      if (p[2] && nIn && nOut) {
        rows.push([p[0], p[1], nIn[0], nIn[1]], [p[0], p[1], nOut[0], nOut[1]]);
      } else {
        var a = nIn || nOut, b = nOut || nIn, nr = a[0] + b[0], ny = a[1] + b[1], l = Math.hypot(nr, ny) || 1;
        rows.push([p[0], p[1], nr / l, ny / l]);
      }
    }
    var cols = segs + 1, pos = [], nrm = [], uv = [], idx = [];
    for (j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (i = 0; i < cols; i++) {
        var u = i / segs, th = (u - 0.5) * TAU, s = Math.sin(th), c = Math.cos(th);
        pos.push(row[0] * s, row[1], row[0] * c);
        nrm.push(row[2] * s, row[3], row[2] * c);
        if (vMode === "disc") uv.push(0.5 + 0.5 * s * row[0] / profile[0][0], 0.5 - 0.5 * c * row[0] / profile[0][0]);
        else uv.push(u, row[1]);
      }
    }
    for (j = 0; j < rows.length - 1; j++) {
      for (i = 0; i < segs; i++) {
        var a0 = j * cols + i, b0 = a0 + 1, c0 = a0 + cols, d0 = c0 + 1;
        idx.push(a0, b0, c0, b0, d0, c0);
      }
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
  }
  function segN(a, b) {
    var dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy) || 1;
    return [dy / l, -dr / l];
  }

  // The cup is modelled at the medium size: 1 unit tall, 0.42 radius at the rim.
  var R0 = 0.292, R1 = 0.42, H1 = 0.985;
  function rAt(y) { return R0 + (R1 - R0) * (y / H1); }
  var FILL = 0.86;

  function cupProfiles() {
    var outer = [[R0 - 0.012, 0.0], [R0, 0.014]];
    for (var k = 1; k <= 8; k++) { var y = 0.014 + (H1 - 0.014) * k / 8; outer.push([rAt(y), y]); }
    var rim = [];
    for (var a = -100; a <= 250; a += 25) {
      var t = a * Math.PI / 180;
      rim.push([R1 + 0.006 + 0.016 * Math.cos(t), 0.993 + 0.016 * Math.sin(t)]);
    }
    var inner = [];
    for (k = 0; k <= 6; k++) { y = 0.998 - (0.998 - 0.03) * k / 6; inner.push([rAt(y) - 0.007, y]); }
    inner.push([0.0, 0.03]);
    var drink = [[rAt(FILL) - 0.008, FILL], [0.0, FILL]];
    // lid, sitting on the rim (local y = 0 at the rim)
    var lid = [
      [0.404, -0.03], [0.438, -0.03, 1], [0.447, -0.016], [0.449, 0.012], [0.445, 0.028, 1],
      [0.426, 0.035], [0.41, 0.04, 1], [0.405, 0.064], [0.399, 0.083], [0.386, 0.094],
      [0.36, 0.098], [0.335, 0.103], [0.305, 0.107], [0.275, 0.104], [0.248, 0.096],
      [0.21, 0.092], [0.12, 0.092], [0.0, 0.092]
    ];
    return { outer: outer, rim: rim, inner: inner, drink: drink, lid: lid };
  }

  /* ---------- artwork ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function readArt() {
    var sym = document.getElementById("tess-logo");
    var buna = document.getElementById("tess-buna");
    if (!sym || !window.Path2D) return null;
    var get = function (cls) { var p = sym.querySelector("." + cls); return p ? p.getAttribute("d") : ""; };
    return {
      vb: sym.getAttribute("viewBox").split(/\s+/).map(Number),
      leaves: get("tl-leaves"), script: get("tl-script"), word: get("tl-word"),
      buna: buna ? buna.querySelector("path").getAttribute("d") : "",
      bunaVb: buna ? buna.getAttribute("viewBox").split(/\s+/).map(Number) : null
    };
  }

  // Albedo (2048x1024) + material map (R = gloss, G = metal). Canvas top = rim.
  function bodyArt(art) {
    var W = 2048, H = 1024;
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    var m = document.createElement("canvas"); m.width = 1024; m.height = 512;
    var gm = m.getContext("2d");
    gm.scale(0.5, 0.5);

    var GOLD = "#d6a752", CREAM = "#f4ead6", PAPER = "#1d3d2a";
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    var r = rng(11);
    for (var i = 0; i < 14000; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255," + (r() * 0.04).toFixed(3) + ")" : "rgba(0,0,0," + (r() * 0.06).toFixed(3) + ")";
      g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
    }
    gm.fillStyle = "rgb(92,0,0)"; gm.fillRect(0, 0, W, H);

    function paint(fn, albedo, gloss, metal) {
      g.fillStyle = albedo; g.strokeStyle = albedo; fn(g);
      var mc = "rgb(" + Math.round(gloss * 255) + "," + Math.round(metal * 255) + ",0)";
      gm.fillStyle = mc; gm.strokeStyle = mc; fn(gm);
    }
    var pxPerUnitX = function (v) { return W / (TAU * rAt(v * H1)); };
    var pxPerUnitY = H; // 1 unit of cup height

    // gold tibeb band around the base
    var top = H * (1 - 0.168), bot = H * (1 - 0.045), bandH = bot - top;
    paint(function (ctx) {
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, top + 4); ctx.lineTo(W, top + 4); ctx.moveTo(0, bot - 4); ctx.lineTo(W, bot - 4); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, top + 13); ctx.lineTo(W, top + 13); ctx.stroke();
      var n = 32, p = W / n, y1 = top + 26, y2 = top + bandH * 0.7;
      ctx.lineWidth = 4.5; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(0, y2);
      for (var k = 0; k < n; k++) { ctx.lineTo(k * p + p / 2, y1); ctx.lineTo((k + 1) * p, y2); }
      ctx.stroke();
      for (k = 0; k < n; k++) {
        var cx = k * p + p / 2, h = (y2 - y1);
        ctx.beginPath();
        ctx.moveTo(cx - p * 0.17, y2 - 6); ctx.lineTo(cx, y2 - 6 - h * 0.45); ctx.lineTo(cx + p * 0.17, y2 - 6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(k * p, y1 + h * 0.28, 4.2, 0, TAU); ctx.fill();
        if (k === 0) { ctx.beginPath(); ctx.arc(W, y1 + h * 0.28, 4.2, 0, TAU); ctx.fill(); }
      }
      var dn = 96, dp = W / dn, dy = bot - 15;
      for (k = 0; k < dn; k++) { ctx.beginPath(); ctx.ellipse(k * dp + dp / 2, dy, dp * 0.26, 3.2, 0, 0, TAU); ctx.fill(); }
    }, GOLD, 0.8, 0.55);

    if (!art) return { albedo: c, material: m };

    // front: the logo, centred at u = 0.5
    var vb = art.vb, logoV = 0.555, logoH = 0.45;
    var sy = (logoH * pxPerUnitY) / vb[3], sx = sy * pxPerUnitX(logoV) / pxPerUnitY;
    function logo(d, albedo, gloss, metal) {
      paint(function (cx) {
        cx.save();
        cx.translate(W * 0.5 - (vb[2] / 2) * sx, H * (1 - logoV) - (vb[3] / 2) * sy);
        cx.scale(sx, sy); cx.translate(-vb[0], -vb[1]);
        cx.fill(new Path2D(d), "evenodd");
        cx.restore();
      }, albedo, gloss, metal);
    }
    logo(art.leaves, GOLD, 0.82, 0.55);
    logo(art.script, CREAM, 0.42, 0);
    logo(art.word, GOLD, 0.82, 0.55);

    // back: the three leaves over "ቡና", centred on the seam (u = 0)
    if (art.buna && art.bunaVb) {
      var bv = art.bunaVb, bunaV = 0.5, bunaH = 0.14;
      var bsy = (bunaH * pxPerUnitY) / bv[3], bsx = bsy * pxPerUnitX(bunaV) / pxPerUnitY;
      var leafBox = [489.8, 9.7, 214.2, 181.2], leafV = 0.68, leafH = 0.13;
      var lsy = (leafH * pxPerUnitY) / leafBox[3], lsx = lsy * pxPerUnitX(leafV) / pxPerUnitY;
      [0, W].forEach(function (x0) {
        paint(function (cx) {
          cx.save();
          cx.translate(x0 - (bv[2] / 2) * bsx, H * (1 - bunaV) - (bv[3] / 2) * bsy);
          cx.scale(bsx, bsy); cx.translate(-bv[0], -bv[1]);
          cx.fill(new Path2D(art.buna));
          cx.restore();
          cx.save();
          cx.translate(x0 - (leafBox[2] / 2) * lsx, H * (1 - leafV) - (leafBox[3] / 2) * lsy);
          cx.scale(lsx, lsy); cx.translate(-leafBox[0], -leafBox[1]);
          cx.fill(new Path2D(art.leaves), "evenodd");
          cx.restore();
        }, GOLD, 0.82, 0.55);
      });
    }
    return { albedo: c, material: m };
  }

  // The drink you see when the lid comes off. 512x512, centre = middle of the cup.
  var DRINKS = {
    espresso:   { base: "#5a2d12", rim: "#2a1206", art: "none", crema: true },
    macchiato:  { base: "#7b4420", rim: "#3d1d0b", art: "dot" },
    cappuccino: { base: "#8a4f26", rim: "#4a2410", art: "heart" },
    latte:      { base: "#a2683a", rim: "#5a3215", art: "rosetta" },
    americano:  { base: "#2c160b", rim: "#130804", art: "none", crema: true },
    mocha:      { base: "#5e3018", rim: "#2c1309", art: "heart", dust: "#2a1208" },
    spiced:     { base: "#9a5d30", rim: "#4f2812", art: "rosetta", dust: "#7a3a14" },
    tea:        { base: "#9a4410", rim: "#5a2205", art: "tea" },
    chocolate:  { base: "#4a2210", rim: "#24100a", art: "swirl", dust: "#1d0b05" }
  };
  function drinkArt(kind) {
    var d = DRINKS[kind] || DRINKS.cappuccino;
    var S = 512, c = document.createElement("canvas"); c.width = c.height = S;
    var g = c.getContext("2d"), r = rng(kind.length * 97 + 3), R = S / 2;
    var grd = g.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, d.base); grd.addColorStop(0.72, d.base); grd.addColorStop(1, d.rim);
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    var i;
    if (d.crema) {
      for (i = 0; i < 260; i++) {
        g.fillStyle = "rgba(196,128,62," + (0.05 + r() * 0.14).toFixed(3) + ")";
        g.beginPath(); g.ellipse(R + (r() - 0.5) * S * 0.8, R + (r() - 0.5) * S * 0.8, 6 + r() * 26, 3 + r() * 10, r() * Math.PI, 0, TAU); g.fill();
      }
    }
    var foam = "#f4ead9";
    g.save();
    g.shadowColor = foam; g.shadowBlur = 10;
    g.fillStyle = foam;
    if (d.art === "dot") {
      g.beginPath(); g.arc(R, R, S * 0.2, 0, TAU); g.fill();
      g.fillStyle = "rgba(160,100,50,0.5)"; g.shadowBlur = 0;
      g.beginPath(); g.arc(R, R, S * 0.05, 0, TAU); g.fill();
    } else if (d.art === "heart") {
      g.beginPath();
      g.moveTo(R, R + S * 0.2);
      g.bezierCurveTo(R - S * 0.36, R - S * 0.02, R - S * 0.16, R - S * 0.3, R, R - S * 0.09);
      g.bezierCurveTo(R + S * 0.16, R - S * 0.3, R + S * 0.36, R - S * 0.02, R, R + S * 0.2);
      g.fill();
      g.shadowBlur = 0; g.strokeStyle = d.base; g.lineWidth = 3;
      g.beginPath(); g.moveTo(R, R - S * 0.2); g.lineTo(R, R + S * 0.17); g.stroke();
    } else if (d.art === "rosetta") {
      for (i = 0; i < 7; i++) {
        var yy = R + S * 0.22 - i * S * 0.058, ww = S * (0.3 - i * 0.03);
        g.fillStyle = foam;
        g.beginPath(); g.ellipse(R, yy, ww, S * 0.05, 0, Math.PI * 0.05, Math.PI * 0.95); g.fill();
        g.save(); g.shadowBlur = 0; g.fillStyle = d.base;
        g.beginPath(); g.ellipse(R, yy - S * 0.02, ww * 0.86, S * 0.034, 0, Math.PI * 0.08, Math.PI * 0.92); g.fill();
        g.restore();
      }
      g.beginPath(); g.arc(R, R - S * 0.2, S * 0.06, 0, TAU); g.fill();
      g.shadowBlur = 0; g.strokeStyle = foam; g.lineWidth = 4;
      g.beginPath(); g.moveTo(R, R - S * 0.22); g.lineTo(R, R + S * 0.28); g.stroke();
    } else if (d.art === "swirl") {
      g.shadowBlur = 0; g.strokeStyle = "rgba(120,70,40,0.55)"; g.lineWidth = 6;
      g.beginPath();
      for (i = 0; i < 220; i++) { var a = i * 0.11, rr = 6 + i * 0.85; g.lineTo(R + Math.cos(a) * rr, R + Math.sin(a) * rr); }
      g.stroke();
    } else if (d.art === "tea") {
      g.shadowBlur = 0;
      var hl = g.createRadialGradient(R * 0.7, R * 0.7, 0, R * 0.7, R * 0.7, R * 0.9);
      hl.addColorStop(0, "rgba(255,200,120,0.45)"); hl.addColorStop(1, "rgba(255,200,120,0)");
      g.fillStyle = hl; g.fillRect(0, 0, S, S);
    }
    g.restore();
    if (d.dust) {
      for (i = 0; i < 900; i++) {
        var ang = r() * TAU, rad = Math.sqrt(r()) * R * 0.6;
        g.fillStyle = d.dust; g.globalAlpha = 0.25 + r() * 0.5;
        g.fillRect(R + Math.cos(ang) * rad, R + Math.sin(ang) * rad, 2, 2);
      }
      g.globalAlpha = 1;
    }
    return c;
  }

  /* ---------- shaders ---------- */
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUV;",
    "uniform mat4 uModel; uniform mat4 uVP; uniform mat3 uNM;",
    "varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec3 vObj;",
    "void main() {",
    "  vec4 w = uModel * vec4(aPos, 1.0);",
    "  vW = w.xyz; vN = uNM * aNrm; vUV = aUV; vObj = aPos;",
    "  gl_Position = uVP * w;",
    "}"
  ].join("\n");

  var FS = [
    "precision mediump float;",
    "varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec3 vObj;",
    "uniform sampler2D uTex; uniform sampler2D uMat;",
    "uniform float uMode;",   // 0 colour, 1 printed body, 2 drink, 3 inner wall, 4 lid
    "uniform vec3 uColor; uniform float uGloss; uniform float uMetal;",
    "uniform vec3 uEye; uniform float uLight;",
    "vec3 env(vec3 r) {",
    "  vec3 c = mix(vec3(0.015, 0.022, 0.016), vec3(0.07, 0.09, 0.07), clamp(r.y * 0.5 + 0.5, 0.0, 1.0));",
    "  c += vec3(2.4, 2.0, 1.45) * pow(max(dot(r, normalize(vec3(-0.15, 1.0, 0.25))), 0.0), 60.0);",
    "  c += vec3(0.9, 0.72, 0.48) * pow(max(dot(r, normalize(vec3(-0.85, 0.3, 0.55))), 0.0), 10.0);",
    "  c += vec3(0.5, 0.42, 0.28) * pow(max(dot(r, normalize(vec3(0.9, 0.15, 0.1))), 0.0), 8.0);",
    "  return c;",
    "}",
    "void main() {",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(uEye - vW);",
    "  vec3 albedo = uColor; float gloss = uGloss; float metal = uMetal;",
    "  if (uMode > 0.5 && uMode < 1.5) {",
    "    albedo = pow(texture2D(uTex, vUV).rgb, vec3(2.2));",
    "    vec2 m = texture2D(uMat, vUV).rg; gloss = m.r; metal = m.g;",
    "  } else if (uMode > 1.5 && uMode < 2.5) {",
    "    albedo = pow(texture2D(uTex, vUV).rgb, vec3(2.2));",
    "  } else if (uMode > 2.5 && uMode < 3.5) {",
    "    albedo *= mix(0.25, 1.0, smoothstep(0.84, 1.0, vObj.y));",
    "  } else if (uMode > 3.5) {",
    "    vec2 d = (vObj.xz - vec2(0.0, 0.305)) / vec2(0.055, 0.021);",
    "    float h = (1.0 - smoothstep(0.8, 1.0, length(d))) * step(0.09, vObj.y);",
    "    albedo = mix(albedo, vec3(0.0), h); gloss = mix(gloss, 0.0, h);",
    "  }",
    "  vec3 L = normalize(vec3(-0.2, 1.0, 0.55));",
    "  vec3 F = normalize(vec3(0.35, 0.25, 1.0));",
    "  float ndl = dot(N, L);",
    "  float wrap = max((ndl + 0.35) / 1.35, 0.0);",
    "  vec3 diff = albedo * (vec3(1.0, 0.88, 0.72) * wrap * 1.5 + vec3(0.55, 0.6, 0.55) * max(dot(N, F), 0.0) * 0.55 + vec3(0.05, 0.06, 0.05));",
    "  float shin = mix(8.0, 220.0, gloss * gloss);",
    "  vec3 H = normalize(L + V);",
    "  vec3 specCol = mix(vec3(0.045), albedo, metal);",
    "  float sp = pow(max(dot(N, H), 0.0), shin) * (shin + 2.0) / 9.0 * max(ndl, 0.0);",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);",
    "  vec3 refl = env(reflect(-V, N)) * (specCol + (1.0 - metal) * fres * 0.5) * mix(0.08, 1.0, gloss);",
    "  vec3 col = diff * (1.0 - metal * 0.75) + specCol * sp * vec3(1.0, 0.92, 0.78) + refl;",
    "  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);",
    "  col += vec3(0.5, 0.38, 0.18) * rim * 0.22;",
    "  col *= uLight;",
    "  col = col / (1.0 + col * 0.22);",
    "  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);",
    "}"
  ].join("\n");

  var SHADOW_VS = "attribute vec2 aP; uniform mat4 uVP; uniform vec3 uC; uniform vec2 uS; varying vec2 vP;" +
    "void main(){ vP = aP; gl_Position = uVP * vec4(uC + vec3(aP.x * uS.x, 0.0, aP.y * uS.y), 1.0); }";
  var SHADOW_FS = "precision mediump float; varying vec2 vP; uniform float uA;" +
    "void main(){ float d = length(vP); float a = pow(max(1.0 - d, 0.0), 1.7) * uA; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }";

  var STEAM_VS = [
    "attribute vec3 aS; uniform mat4 uV; uniform mat4 uP; uniform vec3 uO; uniform float uT; uniform float uK;",
    "varying float vT; varying float vSd; varying float vW;",
    "void main() {",
    "  float t = aS.x; float sd = aS.y; float w = aS.z; float ph = w * 2.39;",
    "  float h = t * 0.6 * uK;",
    "  float sway = (sin(t * 4.5 - uT * 1.25 + ph) * 0.055 + sin(t * 9.0 - uT * 2.2 + ph * 1.7) * 0.022) * (0.25 + t);",
    "  float x = (w - 1.0) * 0.055 * (1.0 - t * 0.4) + sway;",
    "  float wd = mix(0.016, 0.085, t) * uK;",
    "  vec4 p = uV * vec4(uO, 1.0);",
    "  p.xy += vec2(x + sd * wd, h);",
    "  gl_Position = uP * p;",
    "  vT = t; vSd = sd; vW = w;",
    "}"
  ].join("\n");
  var STEAM_FS = [
    "precision mediump float; varying float vT; varying float vSd; varying float vW; uniform float uPh; uniform float uA;",
    "void main() {",
    "  float e = 1.0 - smoothstep(0.1, 1.0, abs(vSd));",
    "  float a = e * smoothstep(0.0, 0.2, vT) * (1.0 - smoothstep(0.35, 1.0, vT));",
    "  a *= 0.55 + 0.45 * sin(vT * 14.0 - uPh + vW * 2.1);",
    "  a *= uA;",
    "  gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a, a);",
    "}"
  ].join("\n");

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var info = { p: p, a: {}, u: {} }, i, n;
    n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < n; i++) { var a = gl.getActiveAttrib(p, i); info.a[a.name] = gl.getAttribLocation(p, a.name); }
    n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < n; i++) { var u = gl.getActiveUniform(p, i); info.u[u.name] = gl.getUniformLocation(p, u.name); }
    return info;
  }

  /* ---------- the renderer ---------- */
  var SIZES = { S: [0.88, 0.84], M: [1, 1], L: [1.04, 1.14] };

  function create(canvas, opts) {
    opts = opts || {};
    var gl;
    try {
      var attrs = { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" };
      gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
    } catch (e) { gl = null; }
    if (!gl) return null;

    var prog, shadowProg, steamProg;
    try {
      prog = compile(gl, VS, FS);
      shadowProg = compile(gl, SHADOW_VS, SHADOW_FS);
      steamProg = compile(gl, STEAM_VS, STEAM_FS);
    } catch (e) {
      if (window.console) console.warn("Tess cup: WebGL shaders failed, showing the photo instead.", e);
      return null;
    }

    var reduced = !!opts.reducedMotion;
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    function mesh(geo) {
      var m = { n: geo.idx.length };
      m.pos = buf(geo.pos); m.nrm = buf(geo.nrm); m.uv = buf(geo.uv);
      m.idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
      return m;
    }
    function buf(data) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
    function texture(source, repeat) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    }

    var P = cupProfiles(), SEG = 112;
    var meshes = {
      outer: mesh(lathe(P.outer, SEG)),
      rim: mesh(lathe(P.rim, SEG)),
      inner: mesh(lathe(P.inner, SEG)),
      drink: mesh(lathe(P.drink, SEG, "disc")),
      lid: mesh(lathe(P.lid, SEG))
    };
    var art = bodyArt(readArt());
    var tex = { body: texture(art.albedo, true), mat: texture(art.material, true) };
    var drinkTex = {}, drinkKind = "cappuccino";
    function getDrinkTex(kind) { if (!drinkTex[kind]) drinkTex[kind] = texture(drinkArt(kind), false); return drinkTex[kind]; }

    var quad = buf(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    var steamGeo = (function () {
      var v = [], ix = [], N = 26, w, k;
      for (w = 0; w < 3; w++) {
        var base = v.length / 3;
        for (k = 0; k <= N; k++) { v.push(k / N, -1, w, k / N, 1, w); }
        for (k = 0; k < N; k++) { var a = base + k * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var b = buf(new Float32Array(v)), ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), gl.STATIC_DRAW);
      return { b: b, ib: ib, n: ix.length };
    })();

    /* camera */
    var proj = m4(), view = m4(), vp = m4(), eye = [0, 1.42, 5.7], aim = [0, 0.6, 0];

    /* animation state */
    var st = {
      spin: -0.5, vel: 0, auto: reduced ? 0 : 0.34,
      sr: 1, sh: 1, vsr: 0, vsh: 0, tsr: 1, tsh: 1,
      lid: 0, vlid: 0, tlid: 0,
      light: 1, tlight: 1,
      time: 0
    };
    var dragging = false, lastX = 0, lastT = 0, dragVel = 0, interacted = false;
    var running = false, inView = true, raf = 0, prevT = 0, w = 0, h = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      w = Math.round(cw * dpr); h = Math.round(ch * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      perspective(proj, 26 * Math.PI / 180, cw / ch, 0.1, 50);
      lookAt(view, eye, aim);
      mul(vp, proj, view);
      if (opts.onLayout) {
        var back = project(vp, 0, 0, -0.85), base = project(vp, 0, 0, 0), front = project(vp, 0, 0, 0.62);
        opts.onLayout({ back: 0.5 - back[1] / 2, base: 0.5 - base[1] / 2, front: 0.5 - front[1] / 2 });
      }
      draw();
    }

    var model = m4(), nm = new Float32Array(9), lidM = m4(), lidNM = new Float32Array(9);

    function spring(x, v, target, dt, k, d) {
      if (reduced) return [target, 0];
      v += (target - x) * k * dt;
      v *= Math.exp(-d * dt);
      return [x + v * dt, v];
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function step(dt) {
      st.time += reduced ? 0 : dt;
      if (!dragging) {
        st.vel += (st.auto - st.vel) * (1 - Math.exp(-dt * 1.1));
        st.spin += st.vel * dt;
      }
      var s = spring(st.sr, st.vsr, st.tsr, dt, 170, 13); st.sr = s[0]; st.vsr = s[1];
      s = spring(st.sh, st.vsh, st.tsh, dt, 170, 13); st.sh = s[0]; st.vsh = s[1];
      s = spring(st.lid, st.vlid, st.tlid, dt, 60, 11); st.lid = s[0]; st.vlid = s[1];
      st.light += (st.tlight - st.light) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
    }

    function settled() {
      return Math.abs(st.sr - st.tsr) < 1e-3 && Math.abs(st.sh - st.tsh) < 1e-3 && Math.abs(st.lid - st.tlid) < 1e-3 &&
        Math.abs(st.vel - st.auto) < 1e-3 && Math.abs(st.light - st.tlight) < 1e-3 && !dragging;
    }

    function useMesh(m, info) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.pos); gl.enableVertexAttribArray(info.a.aPos); gl.vertexAttribPointer(info.a.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.nrm); gl.enableVertexAttribArray(info.a.aNrm); gl.vertexAttribPointer(info.a.aNrm, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.uv); gl.enableVertexAttribArray(info.a.aUV); gl.vertexAttribPointer(info.a.aUV, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    function lin(hex) {
      var n = parseInt(hex.slice(1), 16);
      return [Math.pow((n >> 16 & 255) / 255, 2.2), Math.pow((n >> 8 & 255) / 255, 2.2), Math.pow((n & 255) / 255, 2.2)];
    }
    var C_PAPER = lin("#1d3d2a"), C_INNER = lin("#efe6d4"), C_LID = lin("#121110");

    function draw() {
      if (!w || !h) return;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var e = Math.max(st.lid, 0), peek = ease(Math.min(e, 1));
      var sr = st.sr, sh = st.sh, c = 0.5 * sh;
      var tilt = 0.4 * peek, lift = 0.16 * peek;
      // cup: lifted and tipped toward you when the lid is off
      var ct = Math.cos(tilt), stl = Math.sin(tilt);
      compose(model, 0, lift + c - c * ct, -c * stl, tilt, st.spin, sr, sh, sr);
      normalMat(nm, tilt, st.spin, sr, sh, sr);

      // lid: on the rim, or set aside (floating up and to the right) when you peek
      var onY = lift + c - c * ct + sh * ct, onZ = -c * stl + sh * stl;
      var offX = 0.52 * sr, offY = lift + sh * 0.7 + 0.08, offZ = -0.62;
      var le = Math.min(e, 1.25);
      var lx = offX * le, ly = onY + (offY - onY) * le, lz = onZ + (offZ - onZ) * le, lax = tilt + (0.62 - tilt) * Math.min(e, 1);
      var bob = reduced ? 0 : Math.sin(st.time * 1.6) * 0.012 * Math.min(e, 1);
      compose(lidM, lx, ly + bob, lz, lax, st.spin + 0.9 * Math.min(e, 1), sr, 1, sr);
      normalMat(lidNM, lax, st.spin + 0.9 * Math.min(e, 1), sr, 1, sr);

      // soft shadow on the counter
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(shadowProg.p);
      gl.uniformMatrix4fv(shadowProg.u.uVP, false, vp);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(shadowProg.a.aP);
      gl.vertexAttribPointer(shadowProg.a.aP, 2, gl.FLOAT, false, 0, 0);
      var sa = (0.55 - lift * 1.6) * (0.55 + 0.45 * st.light);
      gl.uniform3f(shadowProg.u.uC, 0.03, 0.001, -0.02);
      gl.uniform2f(shadowProg.u.uS, 0.62 * sr + lift, 0.5 * sr + lift);
      gl.uniform1f(shadowProg.u.uA, sa);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.uniform2f(shadowProg.u.uS, 0.36 * sr, 0.3 * sr);
      gl.uniform1f(shadowProg.u.uA, sa * 0.9 * (1 - peek));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(shadowProg.a.aP);

      // the cup
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.useProgram(prog.p);
      gl.uniformMatrix4fv(prog.u.uVP, false, vp);
      gl.uniform3fv(prog.u.uEye, eye);
      gl.uniform1f(prog.u.uLight, 0.3 + 0.7 * st.light);
      gl.uniform1i(prog.u.uTex, 0);
      gl.uniform1i(prog.u.uMat, 1);
      gl.uniformMatrix4fv(prog.u.uModel, false, model);
      gl.uniformMatrix3fv(prog.u.uNM, false, nm);

      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.body);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex.mat);
      gl.uniform1f(prog.u.uMode, 1);
      useMesh(meshes.outer, prog);

      gl.uniform1f(prog.u.uMode, 0);
      gl.uniform3fv(prog.u.uColor, C_PAPER); gl.uniform1f(prog.u.uGloss, 0.45); gl.uniform1f(prog.u.uMetal, 0);
      useMesh(meshes.rim, prog);

      if (e > 0.02) {
        gl.uniform1f(prog.u.uMode, 3);
        gl.uniform3fv(prog.u.uColor, C_INNER); gl.uniform1f(prog.u.uGloss, 0.2);
        useMesh(meshes.inner, prog);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, getDrinkTex(drinkKind));
        gl.uniform1f(prog.u.uMode, 2); gl.uniform1f(prog.u.uGloss, 0.72); gl.uniform1f(prog.u.uMetal, 0);
        useMesh(meshes.drink, prog);
      }

      gl.uniformMatrix4fv(prog.u.uModel, false, lidM);
      gl.uniformMatrix3fv(prog.u.uNM, false, lidNM);
      gl.uniform1f(prog.u.uMode, 4);
      gl.uniform3fv(prog.u.uColor, C_LID); gl.uniform1f(prog.u.uGloss, 0.86); gl.uniform1f(prog.u.uMetal, 0);
      useMesh(meshes.lid, prog);
      gl.disable(gl.CULL_FACE);
      [prog.a.aPos, prog.a.aNrm, prog.a.aUV].forEach(function (a) { gl.disableVertexAttribArray(a); });

      // steam: from the sip hole, or from the coffee itself when the lid is off
      var sip = xf(lidM, 0, 0.11, 0.305), cup = xf(model, 0, FILL, 0);
      var ox = sip[0] + (cup[0] - sip[0]) * peek, oy = sip[1] + (cup[1] - sip[1]) * peek, oz = sip[2] + (cup[2] - sip[2]) * peek;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.useProgram(steamProg.p);
      gl.uniformMatrix4fv(steamProg.u.uV, false, view);
      gl.uniformMatrix4fv(steamProg.u.uP, false, proj);
      gl.uniform3f(steamProg.u.uO, ox, oy, oz);
      gl.uniform1f(steamProg.u.uT, st.time);
      gl.uniform1f(steamProg.u.uPh, (st.time * 2.6) % TAU);
      gl.uniform1f(steamProg.u.uK, 0.9 + 0.25 * peek);
      gl.uniform1f(steamProg.u.uA, (0.16 + 0.1 * peek) * (0.4 + 0.6 * st.light));
      gl.bindBuffer(gl.ARRAY_BUFFER, steamGeo.b);
      gl.enableVertexAttribArray(steamProg.a.aS);
      gl.vertexAttribPointer(steamProg.a.aS, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, steamGeo.ib);
      gl.drawElements(gl.TRIANGLES, steamGeo.n, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(steamProg.a.aS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function frame(t) {
      raf = 0;
      if (!running) return;
      var dt = prevT ? Math.min((t - prevT) / 1000, 0.05) : 0.016;
      prevT = t;
      step(dt);
      draw();
      if (reduced && settled()) { running = false; prevT = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || !inView || document.hidden) return;
      running = true; prevT = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function kick() { if (!running) start(); }

    /* input */
    function firstTouch() {
      if (interacted) return;
      interacted = true;
      if (opts.onInteract) opts.onInteract();
    }
    canvas.addEventListener("pointerdown", function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      dragging = true; lastX = ev.clientX; lastT = performance.now(); dragVel = 0;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* older browsers */ }
      kick();
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var now = performance.now(), dx = ev.clientX - lastX, dt = Math.max((now - lastT) / 1000, 0.001);
      var k = 5.2 / Math.max(canvas.clientWidth, 200);
      st.spin += dx * k;
      dragVel = dragVel * 0.6 + (dx * k / dt) * 0.4;
      lastX = ev.clientX; lastT = now;
      if (Math.abs(dx) > 2) firstTouch();
      if (!running) draw();
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      if (performance.now() - lastT > 90) dragVel = 0;
      st.vel = Math.max(-14, Math.min(14, dragVel));
      kick();
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("lostpointercapture", release);
    canvas.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        ev.preventDefault();
        if (reduced) st.spin += ev.key === "ArrowLeft" ? -0.35 : 0.35;
        else st.vel += ev.key === "ArrowLeft" ? -3.2 : 3.2;
        firstTouch(); kick(); if (reduced) draw();
      }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        if (inView) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    canvas.addEventListener("webglcontextlost", function (ev) {
      ev.preventDefault(); stop();
      if (opts.onLost) opts.onLost();
    });

    resize();
    start();

    return {
      setSize: function (key) {
        var s = SIZES[key] || SIZES.M;
        st.tsr = s[0]; st.tsh = s[1];
        if (!reduced) st.vsh += (s[1] > st.sh ? 1 : -1) * 0.6;
        kick();
      },
      setDrink: function (kind) { drinkKind = DRINKS[kind] ? kind : "cappuccino"; kick(); },
      setLid: function (off) { st.tlid = off ? 1 : 0; kick(); },
      setLight: function (on) { st.tlight = on ? 1 : 0; kick(); },
      setReducedMotion: function (r) { reduced = r; st.auto = r ? 0 : 0.34; kick(); },
      spinBy: function (rad) { st.vel += rad; kick(); }
    };
  }

  window.TessCup = { create: create, drinks: Object.keys(DRINKS) };
})();
