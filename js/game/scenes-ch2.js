/*
 * CHALK MAN 第2章の黒板の様子
 * 空ルート：黒板の上のほうに描かれた、空の落書き（雲・鳥・雷雲・風・お城・夜空・流れ星）
 * 地下ルート：地面の線の下に描かれた、地下の落書き（モグラ・地下の川・コウモリ・岩・宝箱とヘビ・つらら・地上への穴）
 * 問題に出てくる生き物や物は「絵」で描く。プレイヤーが書いたことばだけが「文字」の物になる。
 *
 * 1つの様子 = { setup, intro（なくてもよい）, update, drawChalk, drawFront, drawReal }
 *   sc.〜 に置いた値を、演出（acts-ch2.js）が書きかえて動かす。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var K = CM.sceneKit, X = K.X, bez = K.bez, drawGround = K.drawGround, fullGround = K.fullGround;
  var SC = CM.SCENES;

  var BROWN = '#d2ae88', GREY = '#cfd2cc', DARKFILL = 'rgba(8,16,12,0.55)';

  // ------------------------------------------------------------
  // 小さな道具
  // ------------------------------------------------------------
  function o(c, sd, w, al) { return { w: w || 2.4, color: c || COL.chalk, alpha: al === undefined ? 0.92 : al, seed: sd }; }
  function L(ctx, pts, opt) { CM.chalk.line(ctx, pts, opt); }
  /** 点の列を、うすく塗る */
  function fill(ctx, pts, color, al) {
    ctx.save(); ctx.globalAlpha *= al === undefined ? 1 : al; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  /** 楕円の点の列 */
  function oval(x, y, rx, ry, n, a0, a1) {
    var pts = []; n = n || 18; a0 = a0 || 0; a1 = a1 === undefined ? TAU : a1;
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry); }
    return pts;
  }
  /** 手描きの星（5つのとがり）の点の列 */
  function starPts(x, y, r, rot) {
    var pts = [];
    for (var i = 0; i <= 10; i++) { var a = -PI / 2 + (rot || 0) + i * PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    return pts;
  }
  /** ぽこぽこした雲の形（下は平ら）。x, y＝中心、w＝半分の幅 */
  function cloudPts(x, y, w, h) {
    var pts = [x - w, y + h * 0.45];
    var bumps = [[-0.72, 0.1, 0.32], [-0.32, -0.22, 0.4], [0.16, -0.3, 0.38], [0.62, -0.02, 0.34]];
    bumps.forEach(function (b) {
      for (var i = 0; i <= 7; i++) {
        var a = PI + (i / 7) * PI;
        pts.push(x + b[0] * w + Math.cos(a) * b[2] * w, y + b[1] * h * 2 + Math.sin(a) * b[2] * h * 1.9);
      }
    });
    pts.push(x + w, y + h * 0.45, x - w, y + h * 0.45);
    return pts;
  }
  CM.cloudPts = cloudPts;

  /** 空ルートの床：雲のじゅうたん（上は平らで、下がぽこぽこ） */
  function skyFloor(ctx, D, x0, x1, y, sd, color) {
    var s = D.s, top = [], n = Math.max(4, Math.floor((x1 - x0) / (22 * s)));
    for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; top.push(x, y + Math.sin(x * 0.07 + sd) * 1.2 * s); }
    L(ctx, top, o(color, sd, 2.4));
    var bot = [];
    for (var b = 0; b < n; b++) {
      var bx = x0 + (x1 - x0) * (b + 0.5) / n, r = (x1 - x0) / n / 2;
      bot = bot.concat(oval(bx, y + 3 * s, r, 10 * s, 6, 0, PI));
    }
    L(ctx, bot, o(color, sd + 1, 1.8, 0.5));
  }
  /** 遠くの小さな雲（背景） */
  function farClouds(ctx, D, list) {
    list.forEach(function (c, i) {
      var x = X(D, c[0]) + Math.sin(D.time * 0.3 + i) * 4 * D.s, y = D.st.y + D.st.h * c[1];
      L(ctx, cloudPts(x, y, c[2] * D.s, c[2] * 0.42 * D.s), o(COL.chalk, 70 + i, 1.6, 0.3));
    });
  }
  /** 地下ルート：天井（でこぼこの線）と、土のつぶつぶ・根っこ */
  function tunnel(ctx, D, topY, sd, color) {
    var st = D.st, s = D.s, r = U.rng(sd || 5), pts = [];
    for (var x = st.x - 40; x <= st.x + st.w + 40; x += 24 * s) pts.push(x, topY + (r() - 0.5) * 10 * s);
    L(ctx, pts, o(color || BROWN, sd, 2.2, 0.75));
    ctx.save(); ctx.fillStyle = color || BROWN;
    for (var i = 0; i < 26; i++) {
      var px = st.x + r() * st.w, py = st.y + r() * (topY - st.y - 6);
      if (py < st.y + 50 && px > st.x + st.w * 0.6) continue;
      ctx.globalAlpha = 0.25 + r() * 0.2; ctx.beginPath(); ctx.arc(px, py, (1 + r() * 2) * s, 0, TAU); ctx.fill();
    }
    for (i = 0; i < 16; i++) {
      var gx = st.x + r() * st.w, gy = D.gy + 10 * s + r() * (st.y + st.h - D.gy - 14 * s);
      ctx.globalAlpha = 0.2 + r() * 0.2; ctx.beginPath(); ctx.arc(gx, gy, (1 + r() * 1.6) * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // 天井からたれる根っこ
    for (i = 0; i < 3; i++) {
      var rx = st.x + st.w * (0.12 + i * 0.3 + r() * 0.1), len = (14 + r() * 18) * s;
      L(ctx, [rx, topY, rx + 3 * s, topY + len * 0.5, rx - 2 * s, topY + len], o(COL.orange, sd + 10 + i, 1.6, 0.55));
    }
  }
  /** 「Zz」の文字を、ときどき浮かべる */
  function zzz(D, x, y) { D.fx.word('Zz', x, y, { size: 14 * D.s + 4, color: COL.blue, vy: -24, rot: -0.2, life: 1.4 }); }

  // ============================================================
  //  空ルート
  // ============================================================

  // ---- 7問目：雲の上を歩きたい（足が沈む） ----
  SC.cloudWalk = {
    setup: function (sc, D) {
      var st = D.st;
      sc.segs = [];
      sc.left = { x0: st.x - st.w * 0.25, x1: X(D, 0.46) };
      sc.right = { x0: X(D, 0.8), x1: st.x + st.w * 1.25 };
      sc.gap = { x0: sc.left.x1, x1: sc.right.x0 };
      sc.manX = X(D, 0.2); sc.restX = X(D, 0.34);
      sc.sink = 0; sc.sinking = true; sc.pink = 0; sc.grow = 0;
    },
    update: function (sc, dt, D) {
      if (sc.sinking) {
        sc.sink = Math.min(20 * D.s, sc.sink + dt * 2.2 * D.s);
        D.man.gy = D.gy + sc.sink;
      }
    },
    drawChalk: function (ctx, sc, D) {
      farClouds(ctx, D, [[0.15, 0.2, 26], [0.62, 0.14, 34], [0.9, 0.3, 22]]);
      // 木のてっぺん（6問目の木を登ってきた）
      var tx = X(D, 0.12), s = D.s;
      [[-14, 34, 20], [12, 40, 18], [-2, 52, 22]].forEach(function (b, i) {
        CM.chalk.circle(ctx, tx + b[0] * s, D.gy + b[1] * s, b[2] * s, o(COL.green, 90 + i, 2.2, 0.7));
      });
    },
    // 雲は棒人間の前に描く（沈んだ足が、雲の中にかくれるように）
    drawFront: function (ctx, sc, D) {
      var s = D.s, gy = D.gy;
      var col = sc.pink > 0 ? mixCol(COL.chalk, COL.pink, sc.pink) : COL.chalk;
      var lx1 = U.lerp(sc.left.x1, sc.right.x0 + 30 * s, sc.grow);
      [[sc.left.x0, lx1, false, 1], [sc.right.x0, sc.right.x1, true, 2]].forEach(function (c) {
        var x0 = c[0], x1 = c[1], r = 22 * s, depth = 46 * s;
        // 雲の中（足がかくれる）
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
        ctx.fillRect(x0, gy + 2, x1 - x0, depth); ctx.restore();
        if (sc.pink > 0) { ctx.save(); ctx.globalAlpha = 0.25 * sc.pink; ctx.fillStyle = COL.pink; ctx.fillRect(x0, gy + 2, x1 - x0, depth - 6 * s); ctx.restore(); }
        // 上の面（少しぽこぽこ）
        var top = [], n = Math.max(3, Math.floor((x1 - x0) / (30 * s)));
        for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; top.push(x, gy - Math.abs(Math.sin(i * 1.7 + c[3])) * 3 * s); }
        L(ctx, top, o(col, 10 + c[3], 2.6));
        // はし（まるく）
        var endX = c[2] ? x0 : x1, d = c[2] ? -1 : 1;
        L(ctx, oval(endX, gy + r, r, r, 10, -PI / 2, PI / 2).map(function (v, k) { return k % 2 ? v : endX + (v - endX) * d; }), o(col, 20 + c[3], 2.4));
        var bot = [], m = Math.max(2, Math.floor((x1 - x0) / (34 * s)));
        for (var b = 0; b < m; b++) {
          var bx = x0 + (x1 - x0) * (b + 0.5) / m, rr = (x1 - x0) / m / 2;
          bot = bot.concat(oval(bx, gy + depth - 14 * s, rr, 12 * s, 7, 0, PI));
        }
        L(ctx, bot, o(col, 30 + c[3], 2, 0.7));
      });
    }
  };
  function mixCol(a, b, k) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(U.lerp(pa >> 16, pb >> 16, k)), g = Math.round(U.lerp((pa >> 8) & 255, (pb >> 8) & 255, k)), bl = Math.round(U.lerp(pa & 255, pb & 255, k));
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  CM.mixCol = mixCol;

  // ---- 8問目：鳥の群れ ----
  /** 鳥の落書き（まるい体・くちばし・パタパタの羽）。face＝向き、flap＝羽の角度 */
  function drawBird(ctx, b, s, t) {
    var f = b.face || -1, x = b.x, y = b.y, k = s * (b.k || 1), fl = Math.sin(t * 14 + b.ph) * (b.flap === undefined ? 1 : b.flap);
    var col = b.color || COL.blue;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * k, k); if (b.rot) ctx.rotate(b.rot);
    var sd = b.sd || 1;
    L(ctx, [-9, -1, -20, -7, -17, 1, -10, 4], o(col, sd + 2, 2));            // しっぽ
    L(ctx, oval(-1, 1, 11, 7.5, 16), o(col, sd, 2.2));                      // 体
    CM.chalk.circle(ctx, 10, -6, 6.5, o(col, sd + 7, 2.2));                // 頭
    L(ctx, [15.5, -8.5, 23, -5.5, 15.5, -3], o(COL.yellow, sd + 1, 2));      // くちばし
    // 羽（大きく上下にパタパタ）
    L(ctx, [-6, -3, -10 + 2 * fl, -6 - 16 * fl, 0 + 2 * fl, -8 - 18 * fl, 4, -4], o(col, sd + 3, 2.2));
    ctx.fillStyle = COL.chalk;
    if (b.dizzy) { L(ctx, [8, -9, 12, -5], o(COL.chalk, sd + 4, 1.4)); L(ctx, [12, -9, 8, -5], o(COL.chalk, sd + 5, 1.4)); }
    else { ctx.beginPath(); ctx.arc(11, -7, 1.6, 0, TAU); ctx.fill(); }
    if (b.angry) L(ctx, [7, -11, 14, -9.5], o(COL.chalk, sd + 6, 1.5));
    ctx.restore();
  }
  CM.drawBird = drawBird;

  SC.birds = {
    setup: function (sc, D) {
      sc.segs = [];
      sc.manX = X(D, 0.18); sc.restX = X(D, 0.34);
      sc.center = { x: X(D, 0.7), y: D.st.y + D.st.h * 0.38 };
      sc.birds = [];
      for (var i = 0; i < 7; i++) sc.birds.push({ x: 0, y: 0, ph: i * 0.9, a: i / 7 * TAU, mode: 'flock', face: -1, sd: 200 + i * 7, angry: true, k: 1 });
      sc.swoopT = 1.5; sc.cheepT = 0.8;
    },
    update: function (sc, dt, D) {
      var s = D.s, c = sc.center;
      sc.birds.forEach(function (b, i) {
        if (b.mode === 'flock') {
          b.a += dt * 1.3;
          var tx = c.x + Math.cos(b.a) * 58 * s, ty = c.y + Math.sin(b.a * 2) * 26 * s + Math.sin(b.a) * 10 * s;
          if (b.swoop) {
            b.swoop.t += dt;
            var k = b.swoop.t / 1.1, e = Math.sin(k * PI);
            tx = U.lerp(tx, D.man.x + 30 * s, e); ty = U.lerp(ty, D.man.gy - 90 * s, e);
            if (k >= 1) b.swoop = null;
          }
          b.face = tx < b.x ? -1 : 1;
          b.x = b.x ? U.lerp(b.x, tx, Math.min(1, dt * 6)) : tx; b.y = b.y ? U.lerp(b.y, ty, Math.min(1, dt * 6)) : ty;
        } else if (b.mode === 'free') {
          b.x += (b.vx || 0) * dt; b.y += (b.vy || 0) * dt;
          if (b.vx) b.face = b.vx > 0 ? 1 : -1;
        }
      });
      if (sc.swoopOn !== false) {
        sc.swoopT -= dt;
        if (sc.swoopT <= 0) {
          sc.swoopT = 2.2;
          var b = sc.birds[Math.floor(Math.random() * sc.birds.length)];
          if (b.mode === 'flock' && !b.swoop) b.swoop = { t: 0 };
        }
        sc.cheepT -= dt;
        if (sc.cheepT <= 0) { sc.cheepT = 1.6; var bb = sc.birds[Math.floor(Math.random() * sc.birds.length)]; if (bb.mode === 'flock') D.fx.word(D.T('cheep'), bb.x, bb.y - 20 * s, { size: 12 * s + 4, color: COL.blue, life: 0.7 }); }
      }
    },
    drawChalk: function (ctx, sc, D) {
      farClouds(ctx, D, [[0.12, 0.18, 24], [0.5, 0.1, 30]]);
      skyFloor(ctx, D, D.st.x - 20, D.st.x + D.st.w + 20, D.gy, 3);
      sc.birds.forEach(function (b) { if (b.alpha !== 0) drawBird(ctx, b, D.s, D.time); });
    }
  };

  // ---- 9問目：雷雲 ----
  function drawThunderCloud(ctx, c, D) {
    var s = D.s, w = c.w * c.sw, h = 28 * s * (0.8 + 0.2 * c.sw), pts = cloudPts(c.x, c.y, w, h);
    fill(ctx, pts, '#39424a', 0.75);
    L(ctx, pts, o(GREY, 5, 2.6));
    // 顔（怒り顔・寝顔）
    var ex = 14 * s, ey = c.y + 2 * s;
    if (c.face === 'sleep') {
      L(ctx, [c.x - ex - 5 * s, ey, c.x - ex + 5 * s, ey + 2 * s], o(GREY, 6, 2));
      L(ctx, [c.x + ex - 5 * s, ey + 2 * s, c.x + ex + 5 * s, ey], o(GREY, 7, 2));
      L(ctx, oval(c.x, ey + 14 * s, 5 * s, 3 * s, 10), o(GREY, 8, 1.8));
    } else if (c.face === 'happy') {
      L(ctx, [c.x - ex - 5 * s, ey + 2 * s, c.x - ex, ey - 3 * s, c.x - ex + 5 * s, ey + 2 * s], o(GREY, 6, 2));
      L(ctx, [c.x + ex - 5 * s, ey + 2 * s, c.x + ex, ey - 3 * s, c.x + ex + 5 * s, ey + 2 * s], o(GREY, 7, 2));
      L(ctx, [c.x - 8 * s, ey + 11 * s, c.x, ey + 16 * s, c.x + 8 * s, ey + 11 * s], o(GREY, 8, 2));
    } else {
      L(ctx, [c.x - ex - 7 * s, ey - 8 * s, c.x - ex + 5 * s, ey - 3 * s], o(GREY, 9, 2.2));
      L(ctx, [c.x + ex + 7 * s, ey - 8 * s, c.x + ex - 5 * s, ey - 3 * s], o(GREY, 10, 2.2));
      ctx.save(); ctx.fillStyle = GREY;
      ctx.beginPath(); ctx.arc(c.x - ex, ey + 2 * s, 2.4 * s, 0, TAU); ctx.arc(c.x + ex, ey + 2 * s, 2.4 * s, 0, TAU); ctx.fill(); ctx.restore();
      L(ctx, [c.x - 9 * s, ey + 16 * s, c.x, ey + 11 * s, c.x + 9 * s, ey + 16 * s], o(GREY, 11, 2.2));
    }
  }
  function boltPts(x0, y0, x1, y1, seed) {
    var r = U.rng(seed), pts = [x0, y0], n = 6;
    for (var i = 1; i < n; i++) { var k = i / n; pts.push(U.lerp(x0, x1, k) + (r() - 0.5) * 26 * (i % 2 ? 1 : -1), U.lerp(y0, y1, k)); }
    pts.push(x1, y1);
    return pts;
  }
  SC.thunder = {
    setup: function (sc, D) {
      sc.segs = [];
      sc.manX = X(D, 0.16); sc.restX = X(D, 0.34);
      sc.cloud = { x: X(D, 0.64), y: D.st.y + D.st.h * 0.38, w: D.st.w * 0.25, sw: 1, face: 'angry', alpha: 1 };
      sc.storm = 1; sc.bolts = []; sc.boltT = 0.6; sc.flash = 0; sc.rod = null; sc.scorch = [];
    },
    update: function (sc, dt, D) {
      var s = D.s, c = sc.cloud;
      sc.flash = Math.max(0, sc.flash - dt * 4);
      sc.bolts.forEach(function (b) { b.t += dt; });
      sc.bolts = sc.bolts.filter(function (b) { return b.t < 0.28; });
      if (sc.storm > 0) {
        sc.boltT -= dt;
        if (sc.boltT <= 0) {
          sc.boltT = sc.rod ? 0.7 : 1.1 + Math.random() * 0.5;
          var x, y1;
          if (sc.rod) { x = sc.rod.x; y1 = sc.rod.y; }
          else { x = U.lerp(X(D, 0.36), X(D, 0.96), Math.random()); y1 = D.gy; }
          var x0 = c.x + (Math.random() - 0.5) * c.w * 0.8;
          sc.bolts.push({ pts: boltPts(x0, c.y + 18 * s, x, y1, Math.floor(Math.random() * 1000)), t: 0 });
          sc.flash = 1;
          D.sfx.play('crackle');
          D.fx.dust(x, y1, 8, { angle: -PI / 2, spread: 2.4, speed: 80, g: 200, color: COL.yellow, size: 1.6 });
          if (!sc.rod) sc.scorch.push({ x: x, t: 0 });
          if (sc.onStrike) sc.onStrike(x, y1);
        }
      }
      sc.scorch.forEach(function (m) { m.t += dt; });
      sc.scorch = sc.scorch.filter(function (m) { return m.t < 1.2; });
      if (c.face === 'sleep') { sc.zT = (sc.zT || 0) - dt; if (sc.zT <= 0) { sc.zT = 1.1; zzz(D, c.x + c.w * 0.6, c.y - 20 * s); } }
    },
    drawChalk: function (ctx, sc, D) {
      skyFloor(ctx, D, D.st.x - 20, D.st.x + D.st.w + 20, D.gy, 5);
      sc.scorch.forEach(function (m) { L(ctx, [m.x - 8 * D.s, D.gy + 3, m.x + 8 * D.s, D.gy + 3], o('#555', 3, 3, 0.6 * (1 - m.t / 1.2))); });
      if (sc.cloud.alpha > 0) { ctx.save(); ctx.globalAlpha *= sc.cloud.alpha; drawThunderCloud(ctx, sc.cloud, D); ctx.restore(); }
      sc.bolts.forEach(function (b, i) { L(ctx, b.pts, o(COL.yellow, 40 + i, 3.4 * D.s, 1)); });
    },
    drawReal: function (ctx, sc, D) {
      if (sc.flash <= 0) return;
      var v = D.view;
      ctx.save(); ctx.globalAlpha = 0.18 * sc.flash; ctx.fillStyle = '#fffbe0'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.restore();
    }
  };

  // ---- 10問目：向かい風 ----
  /** ほっぺをふくらませて、風をふいている顔の落書き */
  function drawWindFace(ctx, f, D) {
    var s = D.s, r = f.r, x = f.x, y = f.y, pf = 1 + 0.06 * Math.sin(D.time * 6) * f.blow;
    // うしろの雲と、まるい顔
    L(ctx, cloudPts(x + r * 0.5, y - r * 0.1, r * 1.3, r * 0.75), o(COL.chalk, 60, 2, 0.55));
    CM.chalk.circle(ctx, x, y, r, o(COL.chalk, 69, 2.4));
    // ふくらんだほっぺ
    L(ctx, oval(x - r * 0.45, y + r * 0.22, r * 0.3 * pf, r * 0.26 * pf, 12), o(COL.pink, 61, 2.2, 0.85));
    // まゆ・目
    L(ctx, [x - r * 0.42, y - r * 0.42, x - r * 0.12, y - r * 0.32], o(COL.chalk, 62, 2.2));
    L(ctx, [x + r * 0.08, y - r * 0.36, x + r * 0.38, y - r * 0.42], o(COL.chalk, 63, 2.2));
    if (f.mode === 'dizzy') {
      L(ctx, oval(x - r * 0.28, y - r * 0.12, r * 0.11, r * 0.11, 10, 0, TAU * 1.4), o(COL.chalk, 64, 1.8));
      L(ctx, oval(x + r * 0.2, y - r * 0.12, r * 0.11, r * 0.11, 10, 0, TAU * 1.4), o(COL.chalk, 65, 1.8));
    } else {
      L(ctx, [x - r * 0.4, y - r * 0.12, x - r * 0.18, y - r * 0.16], o(COL.chalk, 66, 2.2));
      L(ctx, [x + r * 0.08, y - r * 0.16, x + r * 0.3, y - r * 0.12], o(COL.chalk, 67, 2.2));
    }
    // とがらせた口（ふーっ）
    L(ctx, oval(x - r * 0.92, y + r * 0.22, r * 0.14 * pf, r * 0.12, 10), o(COL.chalk, 68, 2.2));
  }
  SC.wind = {
    setup: function (sc, D) {
      var st = D.st;
      sc.segs = [];
      sc.manX = X(D, 0.2); sc.restX = X(D, 0.38);
      sc.manAnim = 'push';
      sc.face = { x: X(D, 0.84), y: st.y + st.h * 0.42, r: 34 * D.s, blow: 1, mode: 'blow' };
      sc.wind = 1; sc.gusts = [];
      for (var i = 0; i < 9; i++) sc.gusts.push({ x: X(D, Math.random()), y: U.lerp(st.y + st.h * 0.3, D.gy - 12 * D.s, Math.random()), len: (26 + Math.random() * 40) * D.s, spiral: i % 3 === 0, ph: Math.random() * TAU, sd: 300 + i });
      sc.blockX = null;   // 風よけがあるところ（その うしろは風が来ない）
    },
    update: function (sc, dt, D) {
      var s = D.s;
      sc.gusts.forEach(function (g) {
        g.x -= (220 + 160 * sc.wind) * s * dt * Math.max(0.15, sc.wind);
        g.ph += dt * 8;
        if (g.x < D.st.x - 60 * s) { g.x = sc.face.x - sc.face.r; g.y = U.lerp(D.st.y + D.st.h * 0.28, D.gy - 12 * s, Math.random()); }
      });
      if (sc.wind > 0.5 && Math.random() < dt * 3) D.fx.dust(sc.face.x - sc.face.r, sc.face.y + sc.face.r * 0.2, 1, { angle: PI, spread: 0.4, speed: 200, g: 0, life: 0.8 });
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s;
      skyFloor(ctx, D, D.st.x - 20, D.st.x + D.st.w + 20, D.gy, 7);
      if (sc.face.alpha !== 0) drawWindFace(ctx, sc.face, D);
      if (sc.wind <= 0.02) return;
      sc.gusts.forEach(function (g) {
        if (sc.blockX && g.x > sc.blockX.x0 - 10 * s && g.x < sc.blockX.x1 && g.y > sc.blockX.y) return;
        var al = 0.8 * Math.min(1, sc.wind);
        if (g.spiral) {
          var pts = [];
          for (var i = 0; i <= 16; i++) { var a = g.ph + i / 16 * TAU * 1.3, rr = (3 + i * 0.7) * s; pts.push(g.x + Math.cos(a) * rr, g.y + Math.sin(a) * rr * 0.7); }
          pts.push(g.x + g.len, g.y + 2 * s);
          L(ctx, pts, o(COL.chalk, g.sd, 2.2, al));
        } else {
          L(ctx, [g.x, g.y, g.x + g.len * 0.5, g.y + Math.sin(g.ph) * 3 * s, g.x + g.len, g.y], o(COL.chalk, g.sd, 2.2, al));
        }
      });
    }
  };

  // ---- 11問目：空の城の門番 ----
  function drawCastle(ctx, c, D) {
    var s = D.s, gy = D.gy, gx = c.gx, gw = c.gw, gh = c.gh, x0 = c.x0, x1 = c.x1, top = gy - 84 * s;
    // 壁と、ぎざぎざの上
    var wall = [x0, gy, x0, top];
    for (var x = x0; x < x1; x += 20 * s) wall.push(x, top, x, top - 9 * s, x + 10 * s, top - 9 * s, x + 10 * s, top);
    wall.push(x1, top);
    L(ctx, wall, o(COL.chalk, 80, 2.4));
    // 塔（とんがり屋根と旗）
    [[x0 + 14 * s, 118], [x0 + 150 * s, 112]].forEach(function (tw, i) {
      var tx = tw[0], th = tw[1] * s, w2 = 18 * s;
      L(ctx, [tx - w2, top, tx - w2, gy - th, tx + w2, gy - th, tx + w2, top], o(COL.chalk, 81 + i, 2.4));
      L(ctx, [tx - w2 - 4 * s, gy - th, tx, gy - th - 26 * s, tx + w2 + 4 * s, gy - th], o(COL.red, 83 + i, 2.4));
      var fy = gy - th - 26 * s, wv = Math.sin(D.time * 5 + i) * 3 * s;
      L(ctx, [tx, fy, tx, fy - 14 * s], o(COL.chalk, 85 + i, 1.8));
      L(ctx, [tx, fy - 14 * s, tx + 14 * s, fy - 11 * s + wv, tx, fy - 7 * s], o(COL.yellow, 87 + i, 2));
      L(ctx, oval(tx, gy - th + 26 * s, 5 * s, 8 * s, 10, PI, TAU).concat([tx + 5 * s, gy - th + 34 * s, tx - 5 * s, gy - th + 34 * s, tx - 5 * s, gy - th + 26 * s]), o(COL.chalk, 89 + i, 1.6, 0.7));
    });
    // 門（アーチ）と、とびら（左右に開く）
    var arch = [gx - gw / 2, gy, gx - gw / 2, gy - gh + gw / 2].concat(oval(gx, gy - gh + gw / 2, gw / 2, gw / 2, 14, PI, TAU)).concat([gx + gw / 2, gy]);
    fill(ctx, arch, '#0d1a12', 0.5 * c.gate);
    L(ctx, arch, o(COL.chalk, 90, 2.6));
    var open = c.gate, dw = gw / 2 * (1 - open * 0.8);
    [-1, 1].forEach(function (d, i) {
      var hx = gx + d * gw / 2, ex = hx - d * dw, ty = gy - gh + gw / 2 - (1 - open) * 10 * s;
      L(ctx, [hx, gy, ex, gy, ex, ty + (1 - open) * 8 * s, hx, gy - gh + gw * 0.3], o(COL.orange, 91 + i, 2.2));
      if (open < 0.5) for (var k = 1; k < 3; k++) L(ctx, [hx - d * dw * k / 3, gy - 2 * s, hx - d * dw * k / 3, ty + 14 * s], o(COL.orange, 93 + i * 3 + k, 1.4, 0.6));
    });
  }
  /** 門番のかぶと・やり・ひげ（棒人間の形の門番に、あとから描き足す） */
  function drawGuardGear(ctx, g, D) {
    var j = g.joints; if (!j) return;
    var s = D.s, hx = j.head[0], hy = j.head[1], R = CM.BODY.head * s * 1.25, f = j.f;
    L(ctx, oval(hx, hy - R * 0.1, R * 1.12, R * 1.0, 14, PI, TAU).concat([hx + R * 1.12, hy - R * 0.1, hx - R * 1.12, hy - R * 0.1]), o(GREY, 110, 2.4));
    L(ctx, [hx, hy - R * 1.1, hx - f * 6 * s, hy - R * 1.9, hx - f * 14 * s, hy - R * 1.6], o(COL.red, 111, 2.6));
    L(ctx, [hx + f * R * 0.15, hy + R * 0.45, hx + f * R * 0.55, hy + R * 0.35, hx + f * R * 0.95, hy + R * 0.5], o(COL.chalk, 112, 2));
    if (g.spear) {
      // やり（手に持つ。置いたときは、地面に立てる）
      var sx = g.spear.x !== undefined ? g.spear.x : j.handF[0], sb = g.spear.x !== undefined ? D.gy : j.handF[1] + 20 * s, stp = sb - 76 * s;
      L(ctx, [sx, sb, sx, stp], o(COL.orange, 113, 2.4));
      L(ctx, [sx - 6 * s, stp + 4 * s, sx, stp - 14 * s, sx + 6 * s, stp + 4 * s, sx - 6 * s, stp + 4 * s], o(GREY, 114, 2.2));
    }
  }
  SC.castle = {
    setup: function (sc, D) {
      var st = D.st, s = D.s;
      sc.segs = [];
      sc.manX = X(D, 0.14); sc.restX = X(D, 0.3);
      sc.castle = { x0: X(D, 0.64), x1: st.x + st.w + 30, gx: X(D, 0.86), gw: 44 * s, gh: 68 * s, gate: 0 };
      var g = D.addActor(X(D, 0.54), -1);
      g.k = 1.2; g.color = COL.blue; g.spear = {};
      sc.guard = g;
      sc.sayT = 0.6;
    },
    update: function (sc, dt, D) {
      if (sc.guardQuiet) return;
      sc.sayT -= dt;
      if (sc.sayT <= 0) { sc.sayT = 3.2; D.fx.word(D.T('guardHalt'), sc.guard.x - 10 * D.s, D.gy - 150 * D.s, { size: 14 * D.s + 4, color: COL.blue, life: 1.4, vy: -10 }); }
    },
    drawChalk: function (ctx, sc, D) {
      farClouds(ctx, D, [[0.2, 0.2, 26], [0.45, 0.1, 22]]);
      skyFloor(ctx, D, D.st.x - 20, D.st.x + D.st.w + 20, D.gy, 9);
      drawCastle(ctx, sc.castle, D);
    },
    drawFront: function (ctx, sc, D) { drawGuardGear(ctx, sc.guard, D); }
  };

  // ---- 12問目：夜になった ----
  function drawMoon(ctx, x, y, r, sd) {
    var pts = oval(x, y, r, r, 20, -PI * 0.62, PI * 0.62).concat(oval(x + r * 0.45, y, r * 0.78, r * 0.86, 16, PI * 0.5, -PI * 0.5));
    L(ctx, pts, o(COL.yellow, sd, 2.6));
  }
  SC.night = {
    setup: function (sc, D) {
      sc.segs = [];
      sc.manX = X(D, 0.28); sc.restX = X(D, 0.48);
      sc.manAnim = 'sleepy'; sc.keepAnim = true;
      sc.night = 1; sc.sun = 0; sc.zT = 1;
      var r = U.rng(77);
      sc.stars = [];
      for (var i = 0; i < 9; i++) sc.stars.push({ x: X(D, 0.06 + r() * 0.9), y: D.st.y + D.st.h * (0.16 + r() * 0.4), r: (4 + r() * 4) * D.s, ph: r() * TAU });
    },
    update: function (sc, dt, D) {
      if (sc.sleepy === false) return;
      sc.zT -= dt;
      if (sc.zT <= 0) { sc.zT = 1.5; zzz(D, D.man.x + 18 * D.s, D.man.gy - 120 * D.s); if (Math.random() < 0.4) D.sfx.play('yawn'); }
    },
    drawChalk: function (ctx, sc, D) {
      skyFloor(ctx, D, D.st.x - 20, D.st.x + D.st.w + 20, D.gy, 11);
      if (sc.sun > 0) {
        var sx = X(D, 0.82), sy = U.lerp(D.gy + 30 * D.s, D.st.y + D.st.h * 0.3, sc.sun), sr = 20 * D.s;
        CM.chalk.circle(ctx, sx, sy, sr, o(COL.orange, 120, 2.6));
        for (var i = 0; i < 10; i++) { var a = i / 10 * TAU + D.time * 0.3; L(ctx, [sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3, sx + Math.cos(a) * sr * 1.8, sy + Math.sin(a) * sr * 1.8], o(COL.orange, 121 + i, 2)); }
      }
    },
    drawReal: function (ctx, sc, D) {
      if (sc.night <= 0.01) return;
      var v = D.view;
      ctx.save(); ctx.globalAlpha = 0.5 * sc.night; ctx.fillStyle = '#0a1030'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.restore();
      ctx.save(); ctx.globalAlpha = sc.night;
      drawMoon(ctx, X(D, 0.8), D.st.y + D.st.h * 0.26, 24 * D.s, 130);
      sc.stars.forEach(function (st, i) {
        var tw = 0.75 + 0.25 * Math.sin(D.time * 3 + st.ph);
        L(ctx, starPts(st.x, st.y, st.r * tw, st.ph), o(COL.yellow, 140 + i, 1.8, 0.9));
      });
      ctx.restore();
    }
  };

  // ---- 13問目：流れ星から降りたい ----
  function drawStar(ctx, st, D) {
    var s = D.s, r = st.r;
    var pts = starPts(st.x, st.y, r, st.rot);
    fill(ctx, pts, COL.yellow, 0.18);
    L(ctx, pts, o(COL.yellow, 150, 2.8));
    // 顔
    var fx = st.x, fy = st.y + 4 * s; s = s * r / (32 * D.s);
    if (st.face === 'smile') {
      L(ctx, [fx - 10 * s, fy - 2 * s, fx - 7 * s, fy - 5 * s, fx - 4 * s, fy - 2 * s], o(COL.yellow, 151, 1.8));
      L(ctx, [fx + 4 * s, fy - 2 * s, fx + 7 * s, fy - 5 * s, fx + 10 * s, fy - 2 * s], o(COL.yellow, 152, 1.8));
      L(ctx, [fx - 6 * s, fy + 5 * s, fx, fy + 9 * s, fx + 6 * s, fy + 5 * s], o(COL.yellow, 153, 1.8));
    } else {
      ctx.save(); ctx.fillStyle = COL.yellow;
      ctx.beginPath(); ctx.arc(fx - 7 * s, fy - 3 * s, 2.4 * s, 0, TAU); ctx.arc(fx + 7 * s, fy - 3 * s, 2.4 * s, 0, TAU); ctx.fill(); ctx.restore();
      L(ctx, oval(fx, fy + 7 * s, 4 * s, 4 * s, 10), o(COL.yellow, 154, 1.8));
    }
  }
  SC.shootingStar = {
    setup: function (sc, D) {
      var st = D.st, s = D.s;
      sc.floorY = D.gy;
      // カメラを少し引いて、星から下の黒板までの高さを見せる
      var z = 0.8;
      sc.camIn = { cx: st.x + st.w / 2, cy: D.gy - st.h * 0.36 / z, z: z };
      sc.wordBoost = 1.2;
      sc.star = { x: X(D, 0.34), y: st.y + st.h * 0.4, r: 40 * s, rot: 0, face: 'panic', shake: 1 };
      sc.gy = sc.star.y - sc.star.r * 0.62;
      sc.segs = [{ x0: st.x - st.w * 0.3, x1: st.x + st.w * 1.3, y: sc.floorY, alpha: 0.9 }];
      sc.manX = sc.star.x - 14 * s; sc.restX = sc.star.x + 40 * s;   // 書いた文字は、星の上の右がわに着く
      sc.manAnim = 'ride'; sc.keepAnim = true;
      sc.speed = 1;
      sc.lines = [];
      for (var i = 0; i < 12; i++) sc.lines.push({ x: X(D, Math.random() * 1.2), y: st.y + st.h * (0.14 + Math.random() * 0.6), len: (30 + Math.random() * 50) * s, sd: 400 + i });
      sc.riding = true; sc.yellT = 1.2;
    },
    update: function (sc, dt, D) {
      var s = D.s, st = sc.star;
      var v = D.view;
      sc.lines.forEach(function (l) {
        l.x -= 700 * s * dt * sc.speed;
        if (l.x < v.x - l.len - 20) { l.x = v.x + v.w + Math.random() * 60; l.y = v.y + v.h * (0.12 + Math.random() * 0.6); }
      });
      st.dy = Math.sin(D.time * 34) * 1.4 * s * st.shake;
      // 乗っている間は、星といっしょにゆれる（横の位置は演出にまかせる。止めると、歩く演出が終わらなくなる）
      if (sc.riding) D.man.gy = st.y + st.dy - st.r * 0.62;
      if (sc.speed > 0.3 && Math.random() < dt * 20) D.fx.add({ type: 'star', x: st.x - st.r, y: st.y + (Math.random() - 0.5) * st.r, vx: -200 * s, vy: 0, life: 0.4, size: 3 * s, color: COL.yellow });
      if (st.face === 'panic' && sc.riding) { sc.yellT -= dt; if (sc.yellT <= 0) { sc.yellT = 2.4; D.fx.word(D.T('yikes'), st.x + 40 * s, st.y - 60 * s, { size: 16 * s + 4, color: COL.yellow, life: 0.9 }); } }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, st = sc.star;
      sc.lines.forEach(function (l) { L(ctx, [l.x, l.y, l.x + l.len * sc.speed, l.y], o(COL.chalk, l.sd, 1.6, 0.35)); });
      drawGround(ctx, sc, D);
      CM.chalk.text(ctx, D.T('lowerBoard'), X(D, 0.7), sc.floorY + 20 * s, { size: 13 * s + 3, alpha: 0.45, maxW: D.st.w * 0.5 });
      if (st.alpha === 0) return;
      // しっぽ（光のすじ）
      for (var i = 0; i < 3; i++) {
        var yy = st.y + st.dy + (i - 1) * st.r * 0.4, len = st.r * (3 + i % 2) * Math.max(0.2, sc.speed);
        L(ctx, [st.x - st.r * 0.8, yy, st.x - st.r * 0.8 - len * 0.5, yy + Math.sin(D.time * 9 + i) * 3 * s, st.x - st.r * 0.8 - len, yy], o(COL.yellow, 160 + i, 2, 0.6));
      }
      drawStar(ctx, { x: st.x, y: st.y + st.dy, r: st.r, rot: st.rot, face: st.face }, D);
    }
  };

  // ============================================================
  //  地下ルート
  // ============================================================

  // ---- 7問目：モグラ ----
  /** モグラの落書き（正面向き。rise＝穴から出ている分 0〜1） */
  function drawMole(ctx, m, D) {
    var s = D.s, k = s * 1.45, x = m.x, gy = D.gy;
    if (m.rise <= 0.02) return;
    var ty = gy + 8 * k - 36 * k * m.rise, h = gy - ty;   // rise=1 で、つめが穴のふちにかかる
    ctx.save(); ctx.translate(x, ty);
    var hd = bez([-17 * k, 30 * k], [-20 * k, -4 * k], [20 * k, -4 * k], [17 * k, 30 * k], 12);
    fill(ctx, hd, BROWN, 0.22);
    L(ctx, hd, o(BROWN, m.sd, 2.4));
    // 目
    if (m.mode === 'dizzy') {
      [-6, 6].forEach(function (ex, i) { L(ctx, oval(ex * k, 8 * k, 3 * k, 3 * k, 10, 0, TAU * 1.5), o(COL.chalk, m.sd + 1 + i, 1.4)); });
    } else if (m.mode === 'cover') {
      L(ctx, [-12 * k, 6 * k, -2 * k, 9 * k], o(COL.pink, m.sd + 3, 2.4)); L(ctx, [12 * k, 6 * k, 2 * k, 9 * k], o(COL.pink, m.sd + 4, 2.4));
    } else if (m.mode === 'happy') {
      L(ctx, [-8 * k, 9 * k, -6 * k, 6 * k, -4 * k, 9 * k], o(COL.chalk, m.sd + 1, 1.5)); L(ctx, [4 * k, 9 * k, 6 * k, 6 * k, 8 * k, 9 * k], o(COL.chalk, m.sd + 2, 1.5));
    } else {
      ctx.fillStyle = COL.chalk; ctx.beginPath(); ctx.arc(-6 * k, 8 * k, 1.6 * k, 0, TAU); ctx.arc(6 * k, 8 * k, 1.6 * k, 0, TAU); ctx.fill();
    }
    // 鼻とひげ
    ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.ellipse(0, 15 * k, 4.4 * k, 3.4 * k, 0, 0, TAU); ctx.fill();
    [-1, 1].forEach(function (d, i) {
      L(ctx, [d * 6 * k, 16 * k, d * 16 * k, 13 * k], o(COL.chalk, m.sd + 5 + i, 1.2, 0.6));
      L(ctx, [d * 6 * k, 18 * k, d * 16 * k, 19 * k], o(COL.chalk, m.sd + 7 + i, 1.2, 0.6));
    });
    // 手（穴のふちに、つめを出して）
    if (m.mode !== 'cover') {
      [-1, 1].forEach(function (d, i) {
        var hx = d * 16 * k, hy = 28 * k;
        for (var c = 0; c < 3; c++) L(ctx, [hx + (c - 1) * 3 * k, hy, hx + (c - 1) * 3.5 * k + d * 2 * k, hy - 6 * k], o(COL.pink, m.sd + 10 + i * 3 + c, 1.5));
      });
    }
    ctx.restore();
    if (m.mode === 'dizzy') {
      for (var i = 0; i < 3; i++) { var a = D.time * 5 + i * TAU / 3; CM.chalk.text(ctx, '★', x + Math.cos(a) * 16 * k, gy - h - 4 * k + Math.sin(a) * 5 * k, { size: 9 * k, color: COL.yellow }); }
    }
  }
  CM.drawMole = drawMole;
  SC.mole = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.14); sc.restX = X(D, 0.3);
      sc.topY = D.st.y + D.st.h * 0.2;
      sc.moles = [0.5, 0.69, 0.88].map(function (f, i) { return { x: X(D, f), hx: X(D, f), rise: 0, mode: 'pop', t: i * 1.5, sd: 500 + i * 20 }; });
      sc.sayT = 1.4;
    },
    update: function (sc, dt, D) {
      sc.moles.forEach(function (m) {
        m.t += dt;
        if (m.mode === 'pop') m.rise = U.clamp(0.5 + Math.sin(m.t * 1.4) * 1.2, 0, 1);
        else if (m.mode === 'down' || m.mode === 'gone') m.rise = Math.max(0, m.rise - dt * 4);
        else if (m.mode === 'dizzy') m.rise = 0.75 + Math.sin(m.t * 3) * 0.05;
        else if (m.mode === 'cover' || m.mode === 'happy' || m.mode === 'up') m.rise = Math.min(1, m.rise + dt * 5);
      });
      if (sc.quiet) return;
      sc.sayT -= dt;
      if (sc.sayT <= 0) {
        sc.sayT = 2.6;
        var up = sc.moles.filter(function (m) { return m.rise > 0.6; })[0];
        if (up) D.fx.word(D.T('moleSay'), up.x, D.gy - 70 * D.s, { size: 13 * D.s + 4, color: BROWN, life: 1.1 });
      }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s;
      tunnel(ctx, D, sc.topY, 11);
      sc.moles.forEach(function (m) {
        drawMole(ctx, m, D);
        // 地面より下は見えない（穴の中）
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
        ctx.fillRect(m.x - 34 * s, D.gy + 1, 68 * s, 60 * s); ctx.restore();
      });
      drawGround(ctx, sc, D);
      sc.moles.forEach(function (m, i) {
        var hx = m.hx;
        L(ctx, oval(hx, D.gy + 1, 28 * s, 5 * s, 16), o(BROWN, 520 + i, 2, 0.8));
        L(ctx, [hx - 34 * s, D.gy, hx - 26 * s, D.gy - 7 * s, hx - 22 * s, D.gy - 2 * s], o(BROWN, 530 + i, 2, 0.7));
        L(ctx, [hx + 22 * s, D.gy - 2 * s, hx + 27 * s, D.gy - 7 * s, hx + 34 * s, D.gy], o(BROWN, 540 + i, 2, 0.7));
      });
    }
  };

  // ---- 8問目：地下の川 ----
  SC.river = {
    setup: function (sc, D) {
      var st = D.st, s = D.s, a = X(D, 0.4), b = X(D, 0.82);
      sc.segs = [{ x0: st.x + 10, x1: a }, { x0: b, x1: st.x + st.w - 10 }];
      sc.gap = { x0: a, x1: b };
      sc.manX = X(D, 0.12); sc.restX = X(D, 0.28);
      sc.topY = st.y + st.h * 0.16;
      sc.bed = Math.min(52 * s, st.y + st.h - D.gy - 6);
      sc.water = 1; sc.frozen = 0;
      sc.waves = [];
      for (var i = 0; i < 7; i++) sc.waves.push({ f: Math.random(), dy: Math.random(), len: (14 + Math.random() * 16) * s, sd: 600 + i });
      sc.roarT = 0.5;
    },
    surfaceY: function (sc, D) { return D.gy + 10 * D.s + (1 - sc.water) * (sc.bed - 12 * D.s); },
    update: function (sc, dt, D) {
      if (sc.frozen < 1) sc.waves.forEach(function (w) { w.f += dt * 0.9 * (1 - sc.frozen); if (w.f > 1) { w.f -= 1; w.dy = Math.random(); } });
      if (sc.water > 0.3 && sc.frozen < 0.5) { sc.roarT -= dt; if (sc.roarT <= 0) { sc.roarT = 2.4; D.fx.word(D.T('sfx_zaa'), U.lerp(sc.gap.x0, sc.gap.x1, 0.5 + (Math.random() - 0.5) * 0.4), D.gy - 24 * D.s, { size: 13 * D.s + 4, color: COL.blue, life: 0.9 }); } }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, g = sc.gap, gy = D.gy, bedY = gy + sc.bed;
      tunnel(ctx, D, sc.topY, 21);
      drawGround(ctx, sc, D);
      // 川底
      var bed = [g.x0, gy].concat(bez([g.x0, gy], [g.x0 + 6 * s, bedY], [g.x1 - 6 * s, bedY], [g.x1, gy], 14));
      L(ctx, bed, o(BROWN, 610, 2.2, 0.8));
      if (sc.water <= 0.01) return;
      // 水（川底の形にそって、水面の左右のはしを決める）
      var sy = SC.river.surfaceY(sc, D), col = sc.frozen > 0.5 ? COL.ice : COL.blue;
      var lx = g.x0, rx = g.x1;
      for (var i = 0; i < bed.length; i += 2) if (bed[i + 1] >= sy) { lx = bed[i]; break; }
      for (i = bed.length - 2; i >= 0; i -= 2) if (bed[i + 1] >= sy) { rx = bed[i]; break; }
      var wpts = [];
      for (i = 0; i <= 12; i++) { var x = U.lerp(lx, rx, i / 12); wpts.push(x, sy + (1 - sc.frozen) * Math.sin(x * 0.08 + D.time * 6) * 2.5 * s * (i > 0 && i < 12 ? 1 : 0)); }
      ctx.save();
      ctx.beginPath(); ctx.moveTo(g.x0, sy); ctx.lineTo(g.x1, sy); ctx.lineTo(g.x1, gy);
      for (i = bed.length - 2; i >= 2; i -= 2) ctx.lineTo(bed[i], bed[i + 1]);
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha = sc.frozen > 0.5 ? 0.35 : 0.22; ctx.fillStyle = col; ctx.fillRect(g.x0, sy, g.x1 - g.x0, bedY - sy + 4);
      ctx.restore();
      L(ctx, wpts, o(col, 620, 2.4));
      if (sc.frozen < 0.9) {
        sc.waves.forEach(function (w) {
          var y = sy + 8 * s + w.dy * (bedY - sy - 14 * s);
          if (y < sy + 4 * s || y > bedY - 4 * s) return;
          var x = U.lerp(lx + 12 * s, rx - 12 * s - w.len, w.f);
          L(ctx, [x, y, x + w.len * 0.5, y - 2 * s, x + w.len, y], o(COL.blue, w.sd, 1.6, 0.6 * (1 - sc.frozen)));
        });
      }
      if (sc.frozen > 0.3) {
        // 氷のひび
        L(ctx, [U.lerp(lx, rx, 0.3), sy + 2 * s, U.lerp(lx, rx, 0.36), sy + 12 * s, U.lerp(lx, rx, 0.32), sy + 20 * s], o(COL.chalk, 630, 1.4, 0.6 * sc.frozen));
        L(ctx, [U.lerp(lx, rx, 0.7), sy + 2 * s, U.lerp(lx, rx, 0.64), sy + 14 * s], o(COL.chalk, 631, 1.4, 0.6 * sc.frozen));
      }
    }
  };

  // ---- 9問目：コウモリの洞窟 ----
  function drawBatHang(ctx, b, D) {
    var s = D.s, x = b.x, y = b.y;
    L(ctx, [x, y, x, y + 4 * s], o(COL.purple, b.sd, 1.4, 0.8));
    var body = bez([x, y + 4 * s], [x - 14 * s, y + 8 * s], [x - 10 * s, y + 30 * s], [x, y + 30 * s], 8).concat(bez([x, y + 30 * s], [x + 10 * s, y + 30 * s], [x + 14 * s, y + 8 * s], [x, y + 4 * s], 8));
    fill(ctx, body, COL.purple, 0.12);
    L(ctx, body, o(COL.purple, b.sd + 1, 2, 0.85));
    L(ctx, [x - 5 * s, y + 29 * s, x - 7 * s, y + 36 * s, x - 2 * s, y + 31 * s], o(COL.purple, b.sd + 2, 1.6, 0.85));
    L(ctx, [x + 2 * s, y + 31 * s, x + 7 * s, y + 36 * s, x + 5 * s, y + 29 * s], o(COL.purple, b.sd + 3, 1.6, 0.85));
  }
  function drawBatFly(ctx, b, D) {
    var s = D.s * (b.k || 1), x = b.x, y = b.y, fl = Math.sin(D.time * 22 + b.ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(b.face || 1, 1);
    L(ctx, oval(0, 0, 6 * s, 8 * s, 12), o(COL.purple, b.sd, 2));
    L(ctx, [-4 * s, -8 * s, -6 * s, -13 * s, -1 * s, -9 * s], o(COL.purple, b.sd + 1, 1.5)); L(ctx, [1 * s, -9 * s, 6 * s, -13 * s, 4 * s, -8 * s], o(COL.purple, b.sd + 2, 1.5));
    [-1, 1].forEach(function (d, i) {
      L(ctx, [d * 5 * s, -2 * s, d * 14 * s, -6 * s - fl * 10 * s, d * 26 * s, -2 * s - fl * 6 * s, d * 20 * s, 4 * s, d * 14 * s, 1 * s, d * 9 * s, 5 * s, d * 5 * s, 3 * s], o(COL.purple, b.sd + 3 + i, 1.8));
    });
    ctx.restore();
  }
  CM.drawBatFly = drawBatFly;
  SC.bats = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.12); sc.restX = X(D, 0.28);
      sc.topY = D.st.y + D.st.h * 0.2;
      sc.dark = 0.8; sc.lights = []; sc.reveal = 0;
      var r = U.rng(9);
      sc.bats = [];
      for (var i = 0; i < 9; i++) sc.bats.push({ x: X(D, 0.3 + i * 0.075 + (r() - 0.5) * 0.03), y: sc.topY + (r() - 0.5) * 6 * D.s, hang: true, sd: 700 + i * 9, ph: r() * TAU, blinkT: r() * 4, face: 1 });
      sc.snoreT = 1.2;
    },
    update: function (sc, dt, D) {
      sc.reveal = Math.max(0, sc.reveal - dt * 1.5);
      sc.bats.forEach(function (b) {
        b.blinkT -= dt; if (b.blinkT < -0.15) b.blinkT = 2 + Math.random() * 4;
        if (!b.hang) { b.x += (b.vx || 0) * dt; b.y += (b.vy || 0) * dt; if (b.wob) b.y += Math.sin(D.time * 8 + b.ph) * 40 * D.s * dt; }
      });
      if (!sc.awake) { sc.snoreT -= dt; if (sc.snoreT <= 0) { sc.snoreT = 2.2; var b = sc.bats[Math.floor(Math.random() * sc.bats.length)]; zzz(D, b.x + 8 * D.s, b.y + 44 * D.s); } }
    },
    drawChalk: function (ctx, sc, D) {
      tunnel(ctx, D, sc.topY, 31);
      drawGround(ctx, sc, D);
      sc.bats.forEach(function (b) { if (b.hang) drawBatHang(ctx, b, D); else drawBatFly(ctx, b, D); });
    },
    drawReal: function (ctx, sc, D) {
      SC.dark.drawReal(ctx, sc, D);
      // 暗やみの中で光る目（寝ているときは閉じた目）
      var s = D.s;
      ctx.save();
      sc.bats.forEach(function (b) {
        if (!b.hang) return;
        var ey = b.y + 24 * s;
        if (sc.awake || b.blinkT < 0) {
          ctx.fillStyle = COL.yellow; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(b.x - 3.5 * s, ey, 1.6 * s, 0, TAU); ctx.arc(b.x + 3.5 * s, ey, 1.6 * s, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = COL.purple; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.2 * s;
          ctx.beginPath(); ctx.moveTo(b.x - 5.5 * s, ey); ctx.lineTo(b.x - 1.5 * s, ey); ctx.moveTo(b.x + 1.5 * s, ey); ctx.lineTo(b.x + 5.5 * s, ey); ctx.stroke();
        }
      });
      ctx.restore();
    }
  };

  // ---- 10問目：落石 ----
  function rockShape(r, seed) {
    var g = U.rng(seed), pts = [], n = 7;
    for (var i = 0; i <= n; i++) { var a = (i % n) / n * TAU, rr = r * (0.75 + g() * 0.35); pts.push(Math.cos(a) * rr, Math.sin(a) * rr * 0.85); }
    return pts;
  }
  function drawRock(ctx, rk, D) {
    ctx.save(); ctx.translate(rk.x, rk.y); ctx.rotate(rk.rot);
    fill(ctx, rk.pts, '#8b8f88', 0.25);
    L(ctx, rk.pts, o(GREY, rk.sd, 2.2));
    L(ctx, [-rk.r * 0.3, -rk.r * 0.2, 0, rk.r * 0.05, rk.r * 0.2, -rk.r * 0.1], o(GREY, rk.sd + 1, 1.3, 0.6));
    ctx.restore();
  }
  SC.rockfall = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.12); sc.restX = X(D, 0.3);
      sc.topY = D.st.y + D.st.h * 0.2;
      sc.rocks = []; sc.spawnT = 0.4; sc.falling = 1; sc.shields = []; sc.juggler = null; sc.rumbleT = 0;
    },
    spawn: function (sc, D, x) {
      var r = (13 + Math.random() * 8) * D.s, sd = Math.floor(Math.random() * 999);
      var rk = { x: x, y: sc.topY + r, vx: 0, vy: 0, r: r, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 4, pts: rockShape(r, sd), sd: sd, bounced: false };
      sc.rocks.push(rk);
      return rk;
    },
    update: function (sc, dt, D) {
      var s = D.s, g = 900 * s;
      if (sc.falling > 0) {
        sc.spawnT -= dt;
        if (sc.spawnT <= 0) {
          sc.spawnT = 0.55 + Math.random() * 0.4;
          var x = U.lerp(X(D, 0.34), X(D, 0.97), Math.random());
          if (sc.target && Math.random() < 0.6) x = sc.target() + (Math.random() - 0.5) * 24 * s;
          SC.rockfall.spawn(sc, D, x);
          D.fx.dust(x, sc.topY + 4, 3, { angle: PI / 2, spread: 0.6, speed: 30, g: 200, color: BROWN });
        }
        sc.rumbleT -= dt;
        if (sc.rumbleT <= 0) { sc.rumbleT = 3; D.fx.word(D.T('sfx_gogogo'), X(D, 0.7), sc.topY + 26 * s, { size: 14 * s + 4, color: GREY, life: 1.2, vy: 0 }); }
      }
      sc.rocks.forEach(function (rk) {
        if (rk.juggled) return;
        rk.vy += g * dt; rk.x += rk.vx * dt; rk.y += rk.vy * dt; rk.rot += rk.vr * dt;
        // 盾・屋根に当たると、はね返る
        if (!rk.bounced && rk.vy > 0) {
          sc.shields.forEach(function (sh) {
            var x0 = typeof sh.x0 === 'function' ? sh.x0() : sh.x0, x1 = typeof sh.x1 === 'function' ? sh.x1() : sh.x1, y = typeof sh.y === 'function' ? sh.y() : sh.y;
            if (rk.x > x0 && rk.x < x1 && rk.y + rk.r * 0.8 > y && rk.y < y + 10 * s) {
              rk.y = y - rk.r * 0.8; rk.vy = -rk.vy * 0.45; rk.vx = (rk.x < (x0 + x1) / 2 ? -1 : 1) * (140 + Math.random() * 80) * s; rk.vr *= 3; rk.bounced = true;
              D.sfx.play('clang'); D.fx.add({ type: 'star', x: rk.x, y: y - 4 * s, life: 0.4, size: 5 * s, color: COL.yellow });
              if (sh.onHit) sh.onHit(rk);
            }
          });
        }
        // じゃぐりんぐ（人が受け止める）
        if (sc.juggler && !rk.bounced && rk.vy > 0 && Math.abs(rk.x - sc.juggler.x) < 60 * s && rk.y > sc.juggler.y - 60 * s) {
          if (sc.juggler.catchRock(rk)) rk.juggled = true;
        }
        if (rk.y + rk.r * 0.7 >= D.gy) {
          rk.dead = true;
          D.fx.dust(rk.x, D.gy, 8, { angle: -PI / 2, spread: 2.6, speed: 70, g: 200, color: GREY, size: 1.8 });
          for (var i = 0; i < 3; i++) D.fx.add({ type: 'crumb', x: rk.x, y: D.gy - 4, vx: (Math.random() - 0.5) * 140 * s, vy: -120 * s * Math.random() - 40, g: 700, life: 0.6, size: 3 * s, vr: 8, color: GREY });
          D.sfx.play('dig');
        }
      });
      sc.rocks = sc.rocks.filter(function (rk) { return !rk.dead && rk.x > D.st.x - 100 && rk.x < D.st.x + D.st.w + 100; });
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s;
      tunnel(ctx, D, sc.topY, 41, GREY);
      // 天井のひび
      [0.45, 0.72, 0.9].forEach(function (f, i) { var x = X(D, f); L(ctx, [x, sc.topY, x - 6 * s, sc.topY + 10 * s, x + 2 * s, sc.topY + 16 * s], o(GREY, 820 + i, 1.4, 0.6)); });
      drawGround(ctx, sc, D);
      sc.rocks.forEach(function (rk) { drawRock(ctx, rk, D); });
    }
  };

  // ---- 11問目：宝箱の番人（ヘビ） ----
  function drawChest(ctx, c, D) {
    var s = D.s, x = c.x, gy = D.gy, w = 34 * s, h = 34 * s;
    var box = [x - w, gy, x - w, gy - h, x + w, gy - h, x + w, gy, x - w, gy];
    fill(ctx, box, COL.orange, 0.15);
    L(ctx, box, o(COL.orange, 900, 2.6));
    L(ctx, [x - w, gy - h].concat(bez([x - w, gy - h], [x - w, gy - h - 22 * s], [x + w, gy - h - 22 * s], [x + w, gy - h], 10)), o(COL.orange, 901, 2.6));
    L(ctx, [x - w * 0.55, gy, x - w * 0.55, gy - h - 12 * s], o(COL.orange, 902, 1.6, 0.6));
    L(ctx, [x + w * 0.55, gy, x + w * 0.55, gy - h - 12 * s], o(COL.orange, 903, 1.6, 0.6));
    L(ctx, [x - 5 * s, gy - h - 4 * s, x + 5 * s, gy - h - 4 * s, x + 5 * s, gy - h + 8 * s, x - 5 * s, gy - h + 8 * s, x - 5 * s, gy - h - 4 * s], o(COL.yellow, 904, 2));
    // 宝の地図の ×印（赤）
    L(ctx, [x - 60 * s, gy + 6 * s, x - 48 * s, gy + 16 * s], o(COL.red, 905, 2.4)); L(ctx, [x - 48 * s, gy + 6 * s, x - 60 * s, gy + 16 * s], o(COL.red, 906, 2.4));
  }
  /** ヘビ（宝箱にまきついて、首を上げている） */
  function drawSnake(ctx, sn, c, D) {
    var s = D.s, gy = D.gy, x = c.x, t = D.time, col = COL.green;
    var w = 34 * s;
    // 宝箱にまきついた体（2周）
    for (var k = 0; k < 2; k++) {
      var y = gy - 10 * s - k * 16 * s;
      L(ctx, bez([x - w - 6 * s, y + 4 * s], [x - w * 0.4, y + 12 * s], [x + w * 0.4, y - 4 * s], [x + w + 6 * s, y + 4 * s], 12), o(col, 920 + k, 5 * s * 0.9));
    }
    // しっぽ
    L(ctx, [x + w + 6 * s, gy - 6 * s, x + w + 18 * s, gy - 2 * s, x + w + 24 * s, gy - 10 * s], o(col, 924, 3.6 * s * 0.9));
    // 首と頭
    var hx = sn.hx, hy = sn.hy;
    var neck = bez([x - w - 6 * s, gy - 26 * s], [x - w - 26 * s, gy - 34 * s], [hx + 18 * s, hy + 30 * s], [hx + 8 * s, hy + 6 * s], 12);
    L(ctx, neck, o(col, 925, 5 * s * 0.9));
    if (sn.bulge > 0) CM.chalk.circle(ctx, U.lerp(x - w - 10 * s, x - 6 * s, sn.bulge), gy - 10 * s, 10 * s, o(col, 926, 2.4));
    var head = oval(hx, hy, 14 * s, 9 * s, 16);
    fill(ctx, head, col, 0.2);
    L(ctx, head, o(col, 927, 2.6));
    // 目
    if (sn.mode === 'sleep' || sn.mode === 'sway') L(ctx, [hx - 6 * s, hy - 3 * s, hx - 1 * s, hy - 2 * s], o(COL.chalk, 928, 1.6));
    else if (sn.mode === 'friend') L(ctx, [hx - 7 * s, hy - 2 * s, hx - 4 * s, hy - 5 * s, hx - 1 * s, hy - 2 * s], o(COL.chalk, 928, 1.6));
    else { ctx.save(); ctx.fillStyle = COL.yellow; ctx.beginPath(); ctx.ellipse(hx - 4 * s, hy - 3 * s, 2.4 * s, 2.8 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#10301c'; ctx.fillRect(hx - 4.6 * s, hy - 5.2 * s, 1.2 * s, 4.4 * s); ctx.restore(); }
    // 舌（チロチロ）
    if (sn.mode === 'hiss' && Math.sin(t * 9) > 0) L(ctx, [hx - 13 * s, hy + 3 * s, hx - 22 * s, hy + 3 * s, hx - 26 * s, hy, hx - 22 * s, hy + 3 * s, hx - 26 * s, hy + 6 * s], o(COL.red, 929, 1.6));
    if (sn.mode === 'friend') CM.chalk.text(ctx, '♡', hx, hy - 20 * s, { size: 12 * s, color: COL.pink });
  }
  SC.snake = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.12); sc.restX = X(D, 0.3);
      sc.topY = D.st.y + D.st.h * 0.2;
      sc.chest = { x: X(D, 0.74) };
      sc.snake = { mode: 'hiss', hx: 0, hy: 0, bulge: 0, sway: 0, t: 0 };
      sc.hissT = 1;
      SC.snake.place(sc, D);
    },
    place: function (sc, D) {
      var s = D.s, sn = sc.snake, bx = sc.chest.x - 46 * s, by = D.gy - 96 * s;
      if (sn.mode === 'sway') { bx += Math.sin(sn.t * 2.2) * 14 * s; by += Math.cos(sn.t * 4.4) * 4 * s; }
      else if (sn.mode === 'hiss') { bx += Math.sin(sn.t * 1.5) * 3 * s; }
      else if (sn.mode === 'sleep') { bx += 8 * s; by += 50 * s; }
      if (sn.lunge) { bx = U.lerp(bx, sn.lunge.x, sn.lunge.k); by = U.lerp(by, sn.lunge.y, sn.lunge.k); }
      sn.hx = bx; sn.hy = by;
    },
    update: function (sc, dt, D) {
      var sn = sc.snake;
      sn.t += dt;
      SC.snake.place(sc, D);
      if (sn.mode === 'hiss') { sc.hissT -= dt; if (sc.hissT <= 0) { sc.hissT = 2.4; D.fx.word(D.T('hiss'), sn.hx - 30 * D.s, sn.hy - 20 * D.s, { size: 14 * D.s + 4, color: COL.green, life: 1 }); } }
      if (sn.mode === 'sleep') { sc.zT = (sc.zT || 0) - dt; if (sc.zT <= 0) { sc.zT = 1.4; zzz(D, sn.hx, sn.hy - 20 * D.s); } }
      if (Math.random() < dt * 2) D.fx.add({ type: 'star', x: sc.chest.x + (Math.random() - 0.5) * 60 * D.s, y: D.gy - (30 + Math.random() * 30) * D.s, life: 0.5, size: 3 * D.s, color: COL.yellow });
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s;
      tunnel(ctx, D, sc.topY, 51);
      drawGround(ctx, sc, D);
      // 宝の地図の点線（×印まで）
      for (var x = X(D, 0.08); x < sc.chest.x - 60 * s; x += 18 * s) L(ctx, [x, D.gy + 10 * s, x + 8 * s, D.gy + 10 * s], o(COL.red, 950 + Math.floor(x), 1.6, 0.6));
      drawChest(ctx, sc.chest, D);
      drawSnake(ctx, sc.snake, sc.chest, D);
    }
  };

  // ---- 12問目：氷の洞窟 ----
  SC.iceCave = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.2); sc.restX = X(D, 0.38);
      sc.manAnim = 'shiver'; sc.keepAnim = true;
      sc.topY = D.st.y + D.st.h * 0.2;
      sc.melt = 0; sc.slick = 0; sc.cold = 1;
      var r = U.rng(61);
      sc.icicles = [];
      for (var x = D.st.x + 8; x < D.st.x + D.st.w; x += (18 + r() * 16) * D.s) sc.icicles.push({ x: x, len: (16 + r() * 34) * D.s, w: (5 + r() * 4) * D.s });
      sc.breathT = 0.5; sc.brrT = 1.5;
    },
    update: function (sc, dt, D) {
      var s = D.s;
      if (sc.cold > 0.3 && Math.random() < dt * 4) D.fx.add({ type: 'frost', x: D.st.x + Math.random() * D.st.w, y: sc.topY + 10 * s, vy: 30 * s, vx: -10 * s, vr: 1.5, life: 3, size: 4 * s, color: COL.ice });
      if (sc.cold > 0.5) {
        sc.breathT -= dt;
        if (sc.breathT <= 0) { sc.breathT = 1.3; var j = D.man.joints; if (j) D.fx.add({ type: 'steam', x: j.head[0] + 12 * s, y: j.head[1] + 6 * s, vy: -10, vx: 20, life: 0.9, size: 2 * s, color: COL.chalk }); }
        sc.brrT -= dt;
        if (sc.brrT <= 0 && D.man.anim === 'shiver') { sc.brrT = 2.8; D.fx.word(D.T('brr'), D.man.x + 30 * s, D.man.gy - 110 * s, { size: 14 * s + 4, color: COL.ice, life: 0.9 }); }
      }
      if (sc.melt > 0 && Math.random() < dt * 6 * (1 - sc.melt * 0.5)) {
        var ic = sc.icicles[Math.floor(Math.random() * sc.icicles.length)];
        D.fx.add({ type: 'dust', x: ic.x, y: sc.topY + ic.len * (1 - sc.melt), vy: 60, g: 400, life: 0.8, size: 1.8 * s, color: COL.blue });
      }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s;
      tunnel(ctx, D, sc.topY, 61, COL.ice);
      sc.icicles.forEach(function (ic, i) {
        var len = ic.len * (1 - sc.melt * 0.85);
        L(ctx, [ic.x - ic.w, sc.topY + 2, ic.x, sc.topY + len, ic.x + ic.w, sc.topY + 2], o(COL.ice, 1000 + i, 2, 0.85));
      });
      // 氷の床（つるつるの光）
      L(ctx, [D.st.x + 10, D.gy, D.st.x + D.st.w - 10, D.gy], o(COL.ice, 1100, 2.6));
      var sl = 0.4 + 0.6 * sc.slick;
      for (var k = 0; k < 6; k++) { var x = X(D, 0.08 + k * 0.16); L(ctx, [x, D.gy + 6 * s, x + 18 * s, D.gy + 6 * s], o(COL.chalk, 1101 + k, 1.4, 0.5 * sl)); L(ctx, [x + 24 * s, D.gy + 6 * s, x + 28 * s, D.gy + 6 * s], o(COL.chalk, 1110 + k, 1.4, 0.5 * sl)); }
      // 氷のかたまり
      [[0.62, 22], [0.9, 30]].forEach(function (b, i) {
        var bx = X(D, b[0]), h = b[1] * s;
        L(ctx, [bx - h * 0.6, D.gy, bx - h * 0.4, D.gy - h, bx + h * 0.2, D.gy - h * 0.8, bx + h * 0.6, D.gy], o(COL.ice, 1120 + i, 2.2, 0.7));
      });
    }
  };

  // ---- 13問目：地上への出口 ----
  SC.surface = {
    setup: function (sc, D) {
      var st = D.st;
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.16); sc.restX = X(D, 0.36);
      sc.topY = st.y + st.h * 0.44;
      sc.shaft = { x0: X(D, 0.6), x1: X(D, 0.86) };
      sc.shaft.x = (sc.shaft.x0 + sc.shaft.x1) / 2;
      sc.crumbT = 0.6; sc.stem = null;
    },
    update: function (sc, dt, D) {
      sc.crumbT -= dt;
      if (sc.crumbT <= 0) {
        sc.crumbT = 0.5 + Math.random() * 0.6;
        var side = Math.random() < 0.5 ? sc.shaft.x0 : sc.shaft.x1;
        D.fx.dust(side, U.lerp(D.st.y, sc.topY, Math.random()), 2, { angle: PI / 2, spread: 0.4, speed: 20, g: 300, color: BROWN, life: 1.4 });
      }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, st = D.st, sh = sc.shaft;
      // 天井（穴のところだけ上へ抜ける）
      var r = U.rng(71), ceil = [];
      for (var x = st.x - 20; x <= sh.x0; x += 22 * s) ceil.push(x, sc.topY + (r() - 0.5) * 8 * s);
      ceil.push(sh.x0, sc.topY);
      L(ctx, ceil, o(BROWN, 1200, 2.2, 0.75));
      L(ctx, [sh.x1, sc.topY, st.x + st.w + 20, sc.topY + 4 * s], o(BROWN, 1201, 2.2, 0.75));
      // 穴のかべ（ぽろぽろ）
      [sh.x0, sh.x1].forEach(function (wx, i) {
        var pts = [];
        for (var y = sc.topY; y >= st.y - 20; y -= 14 * s) pts.push(wx + (r() - 0.5) * 6 * s, y);
        L(ctx, pts, o(BROWN, 1202 + i, 2.2, 0.8));
      });
      ctx.save(); ctx.fillStyle = BROWN;
      for (var i = 0; i < 30; i++) {
        var px = st.x + r() * st.w, py = st.y + r() * (sc.topY - st.y);
        if (px > sh.x0 - 4 && px < sh.x1 + 4) continue;
        ctx.globalAlpha = 0.25 + r() * 0.2; ctx.beginPath(); ctx.arc(px, py, (1 + r() * 2) * s, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // 上の草（地上）
      for (var g = 0; g < 4; g++) { var gx = U.lerp(sh.x0, sh.x1, 0.15 + g * 0.23); L(ctx, [gx - 4 * s, st.y + 8 * s, gx, st.y - 4 * s, gx + 3 * s, st.y + 8 * s], o(COL.green, 1210 + g, 1.8, 0.8)); }
      drawGround(ctx, sc, D);
      CM.chalk.text(ctx, D.T('exitUp'), sh.x, st.y + 70 * s, { size: 14 * s + 3, color: COL.yellow, alpha: 0.75 });
      // 植物の茎（珍回答）
      if (sc.stem) {
        var stt = sc.stem, pts2 = [];
        for (var q = 0; q <= 10; q++) { var yy = U.lerp(D.gy, stt.top, q / 10); pts2.push(stt.x + Math.sin(q * 1.3 + D.time * 2) * 4 * s, yy); }
        L(ctx, pts2, o(COL.green, 1220, 3));
        for (q = 1; q < 10; q += 2) { var ly = U.lerp(D.gy, stt.top, q / 10), d = q % 4 === 1 ? 1 : -1; if (ly > stt.top + 10 * s) L(ctx, [stt.x, ly, stt.x + d * 14 * s, ly - 8 * s, stt.x + d * 4 * s, ly - 2 * s], o(COL.green, 1230 + q, 2)); }
      }
    },
    drawReal: function (ctx, sc, D) {
      var sh = sc.shaft, st = D.st, s = D.s;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gr = ctx.createLinearGradient(0, st.y, 0, D.gy);
      gr.addColorStop(0, 'rgba(255,230,150,0.28)'); gr.addColorStop(1, 'rgba(255,230,150,0.02)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(sh.x0 + 4 * s, st.y); ctx.lineTo(sh.x1 - 4 * s, st.y); ctx.lineTo(sh.x1 + 30 * s, D.gy); ctx.lineTo(sh.x0 - 30 * s, D.gy); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };
})(window);
