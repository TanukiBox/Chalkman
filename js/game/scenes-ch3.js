/*
 * CHALK MAN 第3章の黒板の様子と、エンディングの画面
 * 第3章：朝。日直が来て、黒板が消される前に自由帳へ（14〜20問目・共通）
 *   通ってきたルートで、少しだけ見た目が変わる（落書きモンスターの体 など）
 * エンディング：自由帳のページ（本物の紙）に、えんぴつで描かれた棒人間
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var K = CM.sceneKit, X = K.X, bez = K.bez, drawGround = K.drawGround, fullGround = K.fullGround;
  var SC = CM.SCENES;
  var BROWN = '#d2ae88', GREY = '#cfd2cc';

  function o(c, sd, w, al) { return { w: w || 2.4, color: c || COL.chalk, alpha: al === undefined ? 0.92 : al, seed: sd }; }
  function L(ctx, pts, opt) { CM.chalk.line(ctx, pts, opt); }
  function fill(ctx, pts, color, al) {
    ctx.save(); ctx.globalAlpha *= al === undefined ? 1 : al; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function oval(x, y, rx, ry, n, a0, a1) {
    var pts = []; n = n || 18; a0 = a0 || 0; a1 = a1 === undefined ? TAU : a1;
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry); }
    return pts;
  }
  function route(D) { return (D.run && D.run.route) || 'sky'; }

  /** 朝の光（窓から、左上にさしこむ） */
  function morning(ctx, D) {
    var st = D.st, v = D.view || st;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(st.x, st.y, st.x + st.w * 0.7, st.y + st.h * 0.8);
    g.addColorStop(0, 'rgba(255,225,160,0.13)'); g.addColorStop(1, 'rgba(255,225,160,0)');
    ctx.fillStyle = g; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.restore();
  }
  CM.morningLight = morning;

  // ------------------------------------------------------------
  // 14問目：チョークの粉の嵐
  // ------------------------------------------------------------
  SC.dustStorm = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.22); sc.restX = X(D, 0.42);
      sc.manAnim = 'shiver'; sc.keepAnim = true;
      sc.storm = 1; sc.pile = 0; sc.shield = null; sc.coughT = 1;
      sc.clap = 0;
      var r = U.rng(21);
      sc.motes = [];
      for (var i = 0; i < 70; i++) sc.motes.push({ x: X(D, r()), y: D.st.y + D.st.h * (0.12 + r() * 0.8), sp: 0.6 + r() * 0.8, ph: r() * TAU, sz: 1 + r() * 2.2 });
      sc.swirls = [];
      for (i = 0; i < 6; i++) sc.swirls.push({ x: X(D, r()), y: D.st.y + D.st.h * (0.2 + r() * 0.6), ph: r() * TAU, sd: 400 + i });
    },
    update: function (sc, dt, D) {
      var s = D.s, st = D.st;
      sc.clap += dt;
      var move = function (p, k) {
        p.x -= (160 + 120 * p.sp) * s * dt * sc.storm * k; p.ph += dt * 4;
        p.y += Math.sin(p.ph) * 30 * s * dt;
        if (p.x < st.x - 30 * s) { p.x = st.x + st.w + Math.random() * 40 * s; p.y = st.y + st.h * (0.12 + Math.random() * 0.8); }
      };
      sc.motes.forEach(function (p) { move(p, 1); });
      sc.swirls.forEach(function (p) { move(p, 0.7); });
      if (sc.storm > 0.3 && !sc.shield) {
        sc.pile = Math.min(30 * s, sc.pile + dt * 2.2 * s);
        sc.coughT -= dt;
        if (sc.coughT <= 0) { sc.coughT = 2.2; D.fx.word(D.T('cough'), D.man.x + 26 * s, D.man.gy - 120 * s, { size: 14 * s + 4, color: GREY, life: 0.9 }); }
      }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, st = D.st;
      drawGround(ctx, sc, D);
      // 右上の窓と、パンパンたたかれる黒板消し（窓の外に、日直の手）
      var wx = st.x + st.w - 50 * s, wy = st.y + st.h * 0.42;
      L(ctx, [wx - 36 * s, wy - 30 * s, wx + 40 * s, wy - 30 * s, wx + 40 * s, wy + 40 * s, wx - 36 * s, wy + 40 * s, wx - 36 * s, wy - 30 * s], o(COL.chalk, 500, 2.2, 0.8));
      L(ctx, [wx + 2 * s, wy - 30 * s, wx + 2 * s, wy + 40 * s], o(COL.chalk, 501, 1.6, 0.6));
      if (sc.storm > 0.2) {
        var gap = Math.abs(Math.sin(sc.clap * 7)) * 12 * s;
        [-1, 1].forEach(function (d, i) {
          var ex = wx - 4 * s + d * (gap / 2 + 9 * s);
          L(ctx, [ex - 7 * s, wy - 12 * s, ex + 7 * s, wy - 12 * s, ex + 7 * s, wy + 14 * s, ex - 7 * s, wy + 14 * s, ex - 7 * s, wy - 12 * s], o(COL.orange, 502 + i, 2));
        });
        if (Math.sin(sc.clap * 7) > 0.95) D.fx.word(D.T('sfx_panpan'), wx - 30 * s, wy - 40 * s, { size: 12 * s + 4, life: 0.5 });
      }
      // 粉（つぶと、うず）
      var al = Math.min(1, sc.storm);
      if (al > 0.02) {
        ctx.save(); ctx.fillStyle = COL.chalk;
        sc.motes.forEach(function (p) {
          if (sc.shield && p.x > sc.shield.x0 && p.x < sc.shield.x1 && p.y > sc.shield.y) return;
          ctx.globalAlpha = 0.55 * al; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * s, 0, TAU); ctx.fill();
        });
        ctx.restore();
        sc.swirls.forEach(function (p) {
          var pts = [];
          for (var i = 0; i <= 14; i++) { var a = p.ph + i / 14 * TAU * 1.2, rr = (4 + i * 1.3) * s; pts.push(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.6); }
          pts.push(p.x + 50 * s, p.y + 4 * s);
          L(ctx, pts, o(GREY, p.sd, 1.8, 0.5 * al));
        });
      }
    },
    // 足もとに積もる粉（棒人間の前）
    drawFront: function (ctx, sc, D) {
      if (sc.pile < 1) return;
      var s = D.s, x = D.man.x, h = sc.pile, w = 34 * s + h;
      var pts = bez([x - w, D.gy], [x - w * 0.4, D.gy - h * 1.3], [x + w * 0.4, D.gy - h * 1.3], [x + w, D.gy], 14);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); ctx.restore();
      fill(ctx, pts, COL.chalk, 0.35);
      L(ctx, pts, o(COL.chalk, 510, 2.2));
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); }
  };

  // ------------------------------------------------------------
  // 15問目：落書きモンスター（ぐちゃぐちゃの線のかたまり）
  // ------------------------------------------------------------
  /** ぐちゃぐちゃの線（だ円の中を、ぐるぐる回る1本の線） */
  function scribble(cx, cy, rx, ry, n, sd) {
    var r = U.rng(sd), pts = [], a = 0;
    for (var i = 0; i <= n; i++) {
      a += 0.9 + r() * 1.3;
      var k = 0.35 + r() * 0.65;
      pts.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
    }
    return pts;
  }
  function drawMonster(ctx, m, D) {
    if (m.alpha <= 0) return;
    var s = D.s * m.size, x = m.x, gy = D.gy, t = D.time, rt = m.route;
    var col = rt === 'under' ? BROWN : COL.blue;
    var bw = 52 * s, bh = 62 * s, cy = gy - bh - 16 * s * Math.min(1, m.size) + (m.flat || 0) * bh * 0.8;
    var sy = 1 - (m.flat || 0) * 0.85;
    ctx.save(); ctx.globalAlpha *= m.alpha;
    ctx.translate(x, gy); ctx.scale(1, sy); ctx.translate(-x, -gy);
    var wob = Math.sin(t * 3) * 2 * s;
    // 体（ぐちゃぐちゃ線を2重に。ほどけるときは線が下へ落ちる）
    var un = m.unravel || 0;
    [0, 1].forEach(function (k) {
      var pts = scribble(x, cy + wob, bw, bh, 34, m.sd + k * 7 + Math.floor(t * 3) % 2);
      if (un > 0) for (var i = 1; i < pts.length; i += 2) pts[i] = U.lerp(pts[i], gy - 2 + ((i * 7) % 11) * s * 0.3, Math.min(1, un * (0.6 + (i % 5) * 0.12)));
      L(ctx, pts, o(k ? COL.chalk : col, 600 + k, 2.2, 0.85));
    });
    // ルートで変わるところ：空＝雲のもこもこ、地下＝ごつごつの岩
    if (un < 0.5) {
      if (rt === 'under') {
        [[-0.8, -0.2], [0.7, -0.6], [0.2, 0.6]].forEach(function (p, i) {
          var rx = x + p[0] * bw, ry = cy + p[1] * bh;
          L(ctx, [rx - 8 * s, ry, rx - 3 * s, ry - 7 * s, rx + 6 * s, ry - 5 * s, rx + 8 * s, ry + 3 * s, rx - 8 * s, ry], o(GREY, 610 + i, 2));
        });
      } else {
        [[-0.9, -0.3], [0.85, -0.5], [0, -1.05]].forEach(function (p, i) {
          L(ctx, oval(x + p[0] * bw, cy + p[1] * bh, 12 * s, 9 * s, 12, PI, TAU), o(COL.chalk, 610 + i, 2));
        });
      }
      // 目（棒人間の方を見る）と、ぎざぎざの口
      var ex = x - 16 * s, ey = cy - bh * 0.35 + wob, look = D.man.x < x ? -1 : 1;
      if (m.mode === 'sleep') {
        [-1, 1].forEach(function (d, i) { L(ctx, [x + d * 16 * s - 8 * s, ey, x + d * 16 * s + 8 * s, ey + 2 * s], o(COL.chalk, 620 + i, 2.2)); });
      } else {
        [-1, 1].forEach(function (d, i) {
          var cx = x + d * 16 * s;
          ctx.save(); ctx.fillStyle = '#1b2a22'; ctx.beginPath(); ctx.arc(cx, ey, 11 * s, 0, TAU); ctx.fill(); ctx.restore();
          CM.chalk.circle(ctx, cx, ey, 11 * s, o(COL.chalk, 620 + i, 2.2));
          ctx.save(); ctx.fillStyle = m.mode === 'cute' ? COL.pink : COL.yellow; ctx.beginPath(); ctx.arc(cx + look * 4 * s, ey + 1 * s, 4 * s, 0, TAU); ctx.fill(); ctx.restore();
          if (m.mode !== 'cute') L(ctx, [cx - d * 12 * s, ey - 16 * s, cx + d * 8 * s, ey - 10 * s], o(COL.chalk, 624 + i, 2.2));
        });
      }
      var my = cy + bh * 0.2 + wob;
      if (m.mode === 'cute' || m.mode === 'sleep') L(ctx, [x - 10 * s, my, x, my + 6 * s, x + 10 * s, my], o(COL.chalk, 630, 2.2));
      else {
        var mo = 6 * s + Math.abs(Math.sin(t * 6)) * 6 * s, mp = [x - 22 * s, my];
        for (var q = 0; q <= 6; q++) mp.push(x - 22 * s + q * 44 * s / 6, my + (q % 2 ? mo : 0));
        L(ctx, mp, o(COL.chalk, 631, 2.2));
      }
      // 手（ばたばた）
      [-1, 1].forEach(function (d, i) {
        var a = Math.sin(t * 5 + i * 2) * 0.5;
        L(ctx, [x + d * bw * 0.85, cy, x + d * (bw + 22 * s), cy - 18 * s + a * 20 * s, x + d * (bw + 30 * s), cy - 30 * s + a * 20 * s], o(col, 640 + i, 2.4));
      });
    }
    ctx.restore();
  }
  CM.drawMonster = drawMonster;
  SC.monster = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.16); sc.restX = X(D, 0.34);
      sc.mon = { x: X(D, 0.86), tx: X(D, 0.7), size: 1, alpha: 1, mode: 'angry', sd: 77, route: route(D), unravel: 0, flat: 0 };
      sc.roarT = 1.2; sc.approach = true;
    },
    update: function (sc, dt, D) {
      var m = sc.mon;
      if (sc.approach) m.x += (m.tx - m.x) * Math.min(1, dt * 0.8);
      if (m.mode === 'angry' && sc.approach) {
        sc.roarT -= dt;
        if (sc.roarT <= 0) { sc.roarT = 2.6; D.fx.word(D.T('monRoar'), m.x, D.gy - 170 * D.s, { size: 15 * D.s + 4, color: m.route === 'under' ? BROWN : COL.blue, life: 1.1 }); D.sfx.play('growl'); }
      }
      if (m.mode === 'sleep') { sc.zT = (sc.zT || 0) - dt; if (sc.zT <= 0) { sc.zT = 1.2; D.fx.word('Zz', m.x + 30 * D.s, D.gy - 120 * D.s, { size: 16 * D.s + 4, color: COL.blue, vy: -24, rot: -0.2, life: 1.4 }); } }
    },
    drawChalk: function (ctx, sc, D) {
      drawGround(ctx, sc, D);
      drawMonster(ctx, sc.mon, D);
      // 小さな落書きにもどったモンスター
      if (sc.tiny) {
        var tn = sc.tiny, s = D.s;
        L(ctx, oval(tn.x, D.gy - 12 * s, 12 * s, 11 * s, 14), o(COL.chalk, 650, 2));
        ctx.save(); ctx.fillStyle = COL.chalk; ctx.beginPath(); ctx.arc(tn.x - 4 * s, D.gy - 14 * s, 1.6 * s, 0, TAU); ctx.arc(tn.x + 4 * s, D.gy - 14 * s, 1.6 * s, 0, TAU); ctx.fill(); ctx.restore();
        L(ctx, [tn.x - 4 * s, D.gy - 8 * s, tn.x, D.gy - 6 * s, tn.x + 4 * s, D.gy - 8 * s], o(COL.chalk, 651, 1.6));
      }
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); }
  };

  // ------------------------------------------------------------
  // 16問目：赤ペンのバツ印（赤いわくの中の、大きな ×）
  // ------------------------------------------------------------
  SC.redX = {
    setup: function (sc, D) {
      var s = D.s;
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.14); sc.restX = X(D, 0.3);
      sc.xs = { x: X(D, 0.64), w: 104 * s, h: 108 * s, gap: 11 * s, morph: 0, erase: 0, alpha: 1 };
      sc.buT = 1;
    },
    update: function (sc, dt, D) {
      if (sc.quiet) return;
      sc.buT -= dt;
      if (sc.buT <= 0) { sc.buT = 3; D.fx.word(D.T('sfx_bubu'), sc.xs.x, D.gy - sc.xs.h - 20 * D.s, { size: 16 * D.s + 4, color: COL.red, life: 1 }); }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, x = sc.xs, gy = D.gy, bot = gy - x.gap, top = bot - x.h, l = x.x - x.w / 2, r = x.x + x.w / 2;
      drawGround(ctx, sc, D);
      // 赤ペン（右はしに立てかけてある）
      var px = D.st.x + D.st.w - 20 * s;
      L(ctx, [px - 6 * s, gy, px - 6 * s, gy - 90 * s, px + 6 * s, gy - 90 * s, px + 6 * s, gy, px - 6 * s, gy], o(COL.red, 700, 2.2));
      L(ctx, [px - 6 * s, gy - 90 * s, px, gy - 104 * s, px + 6 * s, gy - 90 * s], o(COL.red, 701, 2.2));
      L(ctx, [px - 6 * s, gy - 70 * s, px + 6 * s, gy - 70 * s], o(COL.red, 702, 1.6, 0.6));
      // 0てん（テストの落書き）
      CM.chalk.text(ctx, D.T('zeroPoints'), X(D, 0.26), D.st.y + D.st.h * 0.3, { size: 14 * s + 4, color: COL.red, alpha: 0.5, rot: -0.15 });
      if (x.alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= x.alpha;
      var a = 1 - x.morph;
      if (a > 0) {
        // わくと ×（太い線を3本重ねる）
        ctx.save(); ctx.globalAlpha *= a;
        L(ctx, [l, bot, l, top, r, top, r, bot, l, bot], o(COL.red, 710, 3.4));
        for (var k = -1; k <= 1; k++) {
          L(ctx, [l + 8 * s + k * 3 * s, top + 8 * s, r - 8 * s + k * 3 * s, bot - 8 * s], o(COL.red, 711 + k, 3.2));
          L(ctx, [r - 8 * s + k * 3 * s, top + 8 * s, l + 8 * s + k * 3 * s, bot - 8 * s], o(COL.red, 715 + k, 3.2));
        }
        ctx.restore();
      }
      if (x.morph > 0) {
        // まる（くぐれる大きな輪）
        var rr = x.h * 0.5;
        ctx.save(); ctx.globalAlpha *= x.morph;
        CM.chalk.circle(ctx, x.x, bot - rr, rr * (0.6 + 0.4 * x.morph), o(x.star ? COL.yellow : COL.red, 720, 4));
        CM.chalk.circle(ctx, x.x, bot - rr, rr * (0.6 + 0.4 * x.morph) - 5 * s, o(x.star ? COL.yellow : COL.red, 721, 2.4));
        if (x.star) for (var i = 0; i < 5; i++) { var aa = -PI / 2 + i * TAU / 5; L(ctx, oval(x.x + Math.cos(aa) * rr * 1.1, bot - rr + Math.sin(aa) * rr * 1.1, 10 * s, 10 * s, 10, aa - 1, aa + 1), o(COL.yellow, 722 + i, 2.2)); }
        ctx.restore();
      }
      ctx.restore();
      // けしごむで消したところ（上から）
      if (x.erase > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
        ctx.fillRect(l - 10 * s, top - 10 * s, x.w + 20 * s, (x.h + 20 * s) * x.erase); ctx.restore();
      }
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); }
  };

  // ------------------------------------------------------------
  // 17問目：時計の針
  // ------------------------------------------------------------
  SC.clock = {
    setup: function (sc, D) {
      var s = D.s;
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.2); sc.restX = X(D, 0.4);
      sc.clk = { x: X(D, 0.56), y: D.st.y + D.st.h * 0.38, r: 44 * s, min: 55, hour: 7, running: true, frozen: 0, spin: 0 };
      sc.tickT = 0;
    },
    /** 分針・時針の角度 */
    angles: function (c) { var m = c.min; return { m: -PI / 2 + m / 60 * TAU, h: -PI / 2 + ((c.hour % 12) + m / 60) / 12 * TAU }; },
    update: function (sc, dt, D) {
      var c = sc.clk;
      if (c.running) {
        sc.tickT += dt;
        if (sc.tickT > 1.6 && c.min < 59) { sc.tickT = 0; c.min += 1; D.sfx.play('tiny'); D.fx.word(D.T('sfx_kachi2'), c.x + c.r + 16 * D.s, c.y - c.r * 0.6, { size: 12 * D.s + 4, life: 0.6 }); }
      }
      if (c.spin) { c.min -= dt * c.spin; while (c.min < 0) { c.min += 60; c.hour -= 1; } }
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, c = sc.clk, col = c.frozen > 0.5 ? COL.ice : COL.chalk;
      drawGround(ctx, sc, D);
      // 時計（丸いわく・目もり・数字）
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = COL.chalk; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); ctx.restore();
      CM.chalk.circle(ctx, c.x, c.y, c.r, o(col, 800, 3));
      CM.chalk.circle(ctx, c.x, c.y, c.r + 6 * s, o(col, 801, 2, 0.6));
      for (var i = 0; i < 12; i++) {
        var a = -PI / 2 + i / 12 * TAU, r0 = c.r * (i % 3 ? 0.86 : 0.8);
        L(ctx, [c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, c.x + Math.cos(a) * c.r * 0.94, c.y + Math.sin(a) * c.r * 0.94], o(col, 802 + i, i % 3 ? 1.6 : 2.4));
      }
      [['12', 0], ['3', 3], ['6', 6], ['9', 9]].forEach(function (n) {
        var a = -PI / 2 + n[1] / 12 * TAU;
        CM.chalk.text(ctx, n[0], c.x + Math.cos(a) * c.r * 0.62, c.y + Math.sin(a) * c.r * 0.62, { size: 13 * s + 2, color: col, alpha: 0.9 });
      });
      // 針
      var A = SC.clock.angles(c);
      var droop = c.droop || 0;
      L(ctx, [c.x, c.y, c.x + Math.cos(A.h) * c.r * 0.5, c.y + Math.sin(A.h) * c.r * 0.5], o(col, 820, 4));
      L(ctx, [c.x, c.y, c.x + Math.cos(A.m + droop) * c.r * 0.82, c.y + Math.sin(A.m + droop) * c.r * 0.82], o(COL.red, 821, 3));
      ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x, c.y, 4 * s, 0, TAU); ctx.fill(); ctx.restore();
      // はと時計の小屋（珍回答）
      if (c.house) {
        var hx = c.x, hy = c.y - c.r - 8 * s;
        L(ctx, [hx - 26 * s, hy, hx, hy - 24 * s, hx + 26 * s, hy], o(COL.orange, 830, 2.6));
        L(ctx, [hx - 9 * s, hy, hx - 9 * s, hy - 12 * s, hx + 9 * s, hy - 12 * s, hx + 9 * s, hy], o(COL.orange, 831, 2));
      }
      // 8時になったら…（時計の下の張り紙）
      CM.chalk.text(ctx, D.T('eightNote'), c.x - 10 * s, c.y + c.r + 18 * s, { size: 11 * s + 3, color: COL.yellow, alpha: 0.7, maxW: D.st.w * 0.55 });
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); }
  };

  // ------------------------------------------------------------
  // 18問目：せまる黒板消し（本物の黒板消しが、左から消していく）
  // ------------------------------------------------------------
  SC.eraserCome = {
    setup: function (sc, D) {
      var s = D.s, st = D.st;
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.62); sc.restX = X(D, 0.78);
      sc.ex = st.x + 20 * s; sc.stopX = X(D, 0.44); sc.speed = 1; sc.moving = true;
      sc.e = { x: sc.ex, y: st.y + st.h * 0.4, rot: 0.1, s: s * 1.5 };
      sc.safe = [];          // 消されないところ { x0, y0, x1, y1 }
      sc.t = 0; sc.swishT = 0.4; sc.top = st.y + st.h * 0.14;
    },
    update: function (sc, dt, D) {
      var s = D.s, st = D.st;
      if (!sc.moving) return;
      sc.t += dt * sc.speed;
      if (sc.ex < sc.stopX) sc.ex += dt * 18 * s * sc.speed;
      var k = Math.sin(sc.t * 3.2);
      sc.e.x = sc.ex + Math.cos(sc.t * 3.2) * 6 * s;
      sc.e.y = U.lerp(sc.top + 20 * s, st.y + st.h - 20 * s, (k + 1) / 2);
      sc.e.rot = 0.1 + k * 0.06;
      sc.swishT -= dt;
      if (sc.swishT <= 0) { sc.swishT = 0.98; D.sfx.play('wipe'); D.fx.word(D.T('sfx_zaa2'), sc.ex + 40 * s, sc.e.y, { size: 13 * s + 4, color: GREY, life: 0.7 }); }
      if (Math.random() < dt * 12) D.fx.dust(sc.e.x + 30 * s, sc.e.y, 1, { speed: 30, g: 60, life: 0.8, color: COL.chalk });
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, st = D.st;
      CM.drawDoodles(ctx, D, 1);
      drawGround(ctx, sc, D);
      // 消されたところ（左はしから、黒板消しの右はしまで）
      var x1 = sc.ex + 30 * s * sc.e.s / s;
      ctx.save();
      ctx.beginPath();
      ctx.rect(st.x - 40, st.y - 40, x1 - st.x + 40, st.h + 80);
      sc.safe.forEach(function (r) { ctx.rect(r.x1, r.y0, r.x0 - r.x1, r.y1 - r.y0); });   // 逆向きに足して、くりぬく
      ctx.clip('evenodd');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      ctx.fillRect(st.x - 40, st.y - 40, x1 - st.x + 40, st.h + 80);
      ctx.restore();
    },
    drawFront: function (ctx, sc, D) {
      // 消したあとの、白いにじみ（チョークのうすい粉）
      var s = D.s, st = D.st;
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = COL.chalk;
      for (var y = st.y; y < st.y + st.h; y += 26 * s) ctx.fillRect(st.x, y, sc.ex - st.x, 14 * s);
      ctx.restore();
    },
    drawReal: function (ctx, sc, D) {
      morning(ctx, D);
      if (sc.e.alpha !== 0) { ctx.save(); ctx.globalAlpha = sc.e.alpha === undefined ? 1 : sc.e.alpha; CM.props.realEraser(ctx, sc.e); ctx.restore(); }
      if (sc.glue) { ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#f7f1c8'; ctx.beginPath(); ctx.ellipse(sc.glue.x, sc.glue.y, 26 * D.s, 16 * D.s, 0.3, 0, TAU); ctx.fill(); ctx.restore(); }
    }
  };

  // ------------------------------------------------------------
  // 19問目：鍵のかかった扉
  // ------------------------------------------------------------
  SC.door = {
    setup: function (sc, D) {
      var s = D.s;
      sc.segs = [{ x0: D.st.x + 10, x1: X(D, 0.86) }];
      sc.manX = X(D, 0.16); sc.restX = X(D, 0.36);
      sc.door = { x: X(D, 0.74), w: 62 * s, h: 118 * s, open: 0, broken: 0, lock: 1, shake: 0 };
      sc.rattleT = 1.4;
    },
    update: function (sc, dt, D) {
      sc.door.shake = Math.max(0, sc.door.shake - dt * 3);
    },
    drawChalk: function (ctx, sc, D) {
      var s = D.s, d = sc.door, gy = D.gy, l = d.x - d.w / 2, r = d.x + d.w / 2, top = gy - d.h;
      drawGround(ctx, sc, D);
      // 黒板のはし（木のわくの、すぐ手前のかべ）
      L(ctx, [r + 6 * s, gy, r + 6 * s, top - 30 * s, D.st.x + D.st.w + 20, top - 30 * s], o(COL.chalk, 900, 2.2, 0.5));
      // 扉のわく
      L(ctx, [l - 6 * s, gy, l - 6 * s, top - 6 * s, r + 6 * s, top - 6 * s, r + 6 * s, gy], o(COL.chalk, 901, 2.6));
      // 開いた向こうは、明るい（自由帳）
      var ow = d.w * (d.open || d.broken);
      if (ow > 0) {
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff6d8'; ctx.fillRect(l, top, d.w, d.h); ctx.restore();
        CM.chalk.text(ctx, '★', d.x, top + d.h * 0.4, { size: 18 * s, color: COL.yellow, alpha: 0.8 });
      }
      if (d.broken > 0) {
        // こわれた板（下に落ちている）
        for (var i = 0; i < 3; i++) L(ctx, [l + i * 22 * s - 8 * s, gy - 4 * s - i * 3 * s, l + i * 22 * s + 26 * s, gy - 8 * s + i * 2 * s], o(COL.orange, 910 + i, 3));
        return;
      }
      // 扉（開くと、ちょうつがいのほうへ細くなる）
      var sh = Math.sin(D.time * 60) * 2 * s * d.shake, dl = l + sh, dw = d.w * (1 - d.open * 0.85), dr = dl + dw;
      var door = [dl, gy, dl, top, dr, top + d.open * 8 * s, dr, gy - d.open * 8 * s, dl, gy];
      fill(ctx, door, COL.orange, 0.22);
      L(ctx, door, o(COL.orange, 902, 2.6));
      if (d.open < 0.5) {
        L(ctx, [dl + 8 * s, top + 12 * s, dr - 8 * s, top + 12 * s, dr - 8 * s, top + d.h * 0.42, dl + 8 * s, top + d.h * 0.42, dl + 8 * s, top + 12 * s], o(COL.orange, 903, 1.6, 0.6));
        // ドアノブと鍵穴
        var kx = dr - 12 * s, ky = top + d.h * 0.58;
        CM.chalk.circle(ctx, kx, ky, 4.5 * s, o(COL.yellow, 904, 2.2));
        L(ctx, oval(kx, ky + 14 * s, 3 * s, 3 * s, 10).concat([kx - 1.5 * s, ky + 16 * s, kx - 2.5 * s, ky + 23 * s, kx + 2.5 * s, ky + 23 * s, kx + 1.5 * s, ky + 16 * s]), o(COL.chalk, 905, 1.8));
        // 南京錠
        if (d.lock > 0) {
          ctx.save(); ctx.globalAlpha *= d.lock;
          var lx = dl + dw * 0.5, ly = top + d.h * 0.62;
          L(ctx, oval(lx, ly - 8 * s, 7 * s, 8 * s, 12, PI, TAU), o(GREY, 906, 2.4));
          fill(ctx, [lx - 10 * s, ly - 8 * s, lx + 10 * s, ly - 8 * s, lx + 10 * s, ly + 8 * s, lx - 10 * s, ly + 8 * s], GREY, 0.3);
          L(ctx, [lx - 10 * s, ly - 8 * s, lx + 10 * s, ly - 8 * s, lx + 10 * s, ly + 8 * s, lx - 10 * s, ly + 8 * s, lx - 10 * s, ly - 8 * s], o(GREY, 907, 2.4));
          ctx.restore();
        }
      }
      CM.chalk.text(ctx, D.T('exitSign'), d.x, top - 20 * s, { size: 13 * s + 3, color: COL.green, alpha: 0.85 });
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); }
  };

  // ------------------------------------------------------------
  // 20問目：最後に一言（自由帳が見えている）
  // ------------------------------------------------------------
  /** 本物の自由帳（開いたノート。チョーク置きの上に立てかけてある） */
  function drawNotebook(ctx, nb, s) {
    var x = nb.x, y = nb.y, w = nb.w, h = nb.h;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(nb.rot || 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2 + 5, -h + 6, w, h);
    // 表紙（オレンジ）と、白いページ
    ctx.fillStyle = '#e8904a'; ctx.fillRect(-w / 2 - 4 * s, -h - 4 * s, w + 8 * s, h + 8 * s);
    ctx.fillStyle = '#fbfaf2'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = 'rgba(120,150,200,0.35)'; ctx.lineWidth = 1;
    for (var yy = -h + 12 * s; yy < -4 * s; yy += 10 * s) { ctx.beginPath(); ctx.moveTo(-w / 2 + 4 * s, yy); ctx.lineTo(w / 2 - 4 * s, yy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#6b6b6b'; ctx.font = (10 * s + 4) + 'px ' + CM.FONT; ctx.textAlign = 'center';
    ctx.fillText(nb.label || '', -w / 4, -h + 16 * s);
    if (nb.glow) { ctx.globalAlpha = nb.glow * 0.4; ctx.fillStyle = '#fff3b0'; ctx.fillRect(-w / 2, -h, w, h); }
    ctx.restore();
  }
  CM.drawNotebook = drawNotebook;
  SC.finale = {
    setup: function (sc, D) {
      var s = D.s;
      sc.segs = [{ x0: D.st.x + 10, x1: X(D, 0.7), openR: true }];
      sc.manX = X(D, 0.18); sc.restX = X(D, 0.4);
      sc.nb = { x: X(D, 0.86), y: D.st.y + D.st.h + 6 * s, w: 88 * s, h: 64 * s, rot: -0.08, glow: 0, label: D.T('notebookLabel') };
    },
    update: function (sc, dt, D) { sc.nb.glow = 0.4 + 0.3 * Math.sin(D.time * 2.5); },
    drawChalk: function (ctx, sc, D) {
      drawGround(ctx, sc, D);
      CM.chalk.text(ctx, D.T('notebookThere'), X(D, 0.82), D.gy - 40 * D.s, { size: 13 * D.s + 3, color: COL.yellow, alpha: 0.8 });
      L(ctx, [X(D, 0.82), D.gy - 26 * D.s, X(D, 0.84), D.gy + 20 * D.s], o(COL.yellow, 990, 2, 0.7));
      L(ctx, [X(D, 0.82) - 5 * D.s, D.gy + 12 * D.s, X(D, 0.84), D.gy + 20 * D.s, X(D, 0.84) + 6 * D.s, D.gy + 11 * D.s], o(COL.yellow, 991, 2, 0.7));
    },
    drawReal: function (ctx, sc, D) { morning(ctx, D); drawNotebook(ctx, sc.nb, D.s); }
  };

  // ------------------------------------------------------------
  // エンディング：自由帳のページ（本物の紙に、えんぴつと色えんぴつ）
  // ------------------------------------------------------------
  var PENCIL = '#5d5d66';
  function pen(c, sd, w, al) { return { w: w || 2, color: c || PENCIL, alpha: al === undefined ? 0.9 : al, seed: sd, wob: 0.6 }; }
  function drawPage(ctx, pg, s) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(pg.x + 6, pg.y + 8, pg.w, pg.h);
    ctx.fillStyle = '#e8904a'; ctx.fillRect(pg.x - 6 * s, pg.y - 6 * s, pg.w + 12 * s, pg.h + 12 * s);
    ctx.fillStyle = '#fbfaf2'; ctx.fillRect(pg.x, pg.y, pg.w, pg.h);
    ctx.strokeStyle = 'rgba(120,150,200,0.3)'; ctx.lineWidth = 1;
    for (var y = pg.y + 22 * s; y < pg.y + pg.h - 6 * s; y += 16 * s) { ctx.beginPath(); ctx.moveTo(pg.x + 6 * s, y); ctx.lineTo(pg.x + pg.w - 6 * s, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.moveTo(pg.x + pg.w / 2, pg.y); ctx.lineTo(pg.x + pg.w / 2, pg.y + pg.h); ctx.stroke();
    ctx.restore();
  }
  function pencilCloud(ctx, x, y, w, sd, c) {
    var pts = CM.cloudPts(x, y, w, w * 0.42, sd);
    L(ctx, pts, pen(c || '#7aa7d6', sd, 2));
  }
  function pencilStar(ctx, x, y, r, sd) {
    var pts = [];
    for (var i = 0; i <= 10; i++) { var a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    L(ctx, pts, pen('#e0b21c', sd, 2));
  }
  SC.ending = {
    setup: function (sc, D) {
      var st = D.st, s = D.s;
      sc.segs = [];
      sc.manX = st.x - 200; sc.restX = st.x;
      sc.pg = { x: st.x + 16 * s, y: st.y + 44 * s, w: st.w - 32 * s, h: st.h - 60 * s };
      sc.t = 0;
    },
    update: function (sc, dt, D) { sc.t += dt; D.man.alpha = 0; },
    drawChalk: function (ctx, sc, D) {
      CM.chalk.text(ctx, D.T('theEnd'), D.st.x + 14, D.st.y + 22, { size: 18, align: 'left', color: COL.yellow });
    },
    drawReal: function (ctx, sc, D) {
      var s = D.s, pg = sc.pg, t = sc.t, n = sc.no, cx = pg.x + pg.w / 2, gy = pg.y + pg.h * 0.78;
      drawPage(ctx, pg, s);
      // タイトル（えんぴつの字）
      var E = CM.ENDINGS[n] || { title: { ja: '', en: '' } };
      CM.chalk.text(ctx, D.T('endingN', { n: n }) + '  ' + CM.fillWord(E.title[(CM.app && CM.app.i18n.lang) || D.lang], sc.word), cx, pg.y + 16 * s, { size: 13 * s + 3, color: PENCIL, maxW: pg.w - 20 * s });
      var rv = Math.min(1, t / 1.6);   // 描かれていく
      ctx.save();
      ctx.beginPath(); ctx.rect(pg.x, pg.y, pg.w * (0.15 + 0.85 * rv), pg.h); ctx.clip();
      // 地面の線
      L(ctx, [pg.x + 14 * s, gy, pg.x + pg.w - 14 * s, gy], pen(PENCIL, 1, 1.8, 0.7));
      var hi = sc.hi, faint = hi ? 1 : 0.45, manS = s * (hi ? 0.9 : 0.6);
      var anim = 'cheer', mx = cx;
      if (n === 1) {
        pencilCloud(ctx, pg.x + pg.w * 0.2, pg.y + pg.h * 0.3, 34 * s, 11);
        pencilCloud(ctx, pg.x + pg.w * 0.78, pg.y + pg.h * 0.24, 28 * s, 12);
        pencilStar(ctx, pg.x + pg.w * 0.5, pg.y + pg.h * 0.2, 10 * s, 13);
        pencilStar(ctx, pg.x + pg.w * 0.62, pg.y + pg.h * 0.34, 7 * s, 14);
        if (CM.drawBird) CM.drawBird(ctx, { x: pg.x + pg.w * 0.3, y: pg.y + pg.h * 0.5, face: 1, ph: 0, sd: 15, k: 0.9 }, s, D.time);
      } else if (n === 2) {
        pencilCloud(ctx, cx + 36 * s, gy - 22 * s, 38 * s, 21, '#9fb6cc');
        anim = 'lie'; mx = cx - 30 * s;
        CM.chalk.text(ctx, 'Zz', cx + 10 * s, gy - 70 * s, { size: 14 * s + 2, color: '#7aa7d6' });
      } else if (n === 3) {
        if (CM.drawMole) CM.drawMole(ctx, { x: pg.x + pg.w * 0.22, hx: pg.x + pg.w * 0.22, rise: 1, mode: 'happy', sd: 31 }, { s: s * 0.8, gy: gy, time: D.time, fx: null });
        if (CM.drawBatFly) CM.drawBatFly(ctx, { x: pg.x + pg.w * 0.75, y: pg.y + pg.h * 0.3, face: -1, ph: 0, sd: 32, k: 1 }, { s: s, time: D.time });
        L(ctx, oval(pg.x + pg.w * 0.8, gy + 10 * s, 26 * s, 10 * s, 16, 0, PI), pen('#a0784e', 33, 2));
      } else if (n === 4) {
        anim = 'lie'; mx = cx - 20 * s;
        for (var i = 0; i < 8; i++) { ctx.save(); ctx.fillStyle = '#a0784e'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx - 40 * s + i * 11 * s, gy - 4 * s - (i % 3) * 5 * s, 2 * s, 0, TAU); ctx.fill(); ctx.restore(); }
      } else if (n === 5 || n === 6) {
        var ws = Math.min(46 * s, (pg.w * 0.8) / Math.max(1, U.chars(sc.word).length));
        ctx.save(); ctx.globalAlpha = n === 5 ? 1 : 0.45;
        CM.chalk.text(ctx, sc.word, cx, pg.y + pg.h * 0.34, { size: ws, color: '#e0567a', maxW: pg.w * 0.85 });
        ctx.restore();
        if (n === 5) for (var h = 0; h < 5; h++) { var ha = D.time * 1.5 + h * 1.3; CM.chalk.text(ctx, '♡', cx + Math.cos(ha) * pg.w * 0.36, pg.y + pg.h * 0.34 + Math.sin(ha * 1.3) * 26 * s, { size: 14 * s, color: '#e0567a', alpha: 0.8 }); }
        anim = 'cheer'; mx = cx + (n === 6 ? pg.w * 0.3 : 0);
        if (n === 6) manS = s * 0.5;
      } else if (n === 7) {
        var fw = sc.funnyWords || [];
        var cols = ['#e0567a', '#3f8fd1', '#e0b21c', '#4caf6a', '#9a6bd1', '#e07a30'];
        fw.slice(0, 12).forEach(function (w, i) {
          var a = i / Math.min(12, fw.length) * TAU + D.time * 0.3, rx = pg.w * 0.36, ry = pg.h * 0.26;
          CM.chalk.text(ctx, w, cx + Math.cos(a) * rx, pg.y + pg.h * 0.42 + Math.sin(a) * ry, { size: 13 * s + 3, color: cols[i % cols.length], rot: Math.sin(i) * 0.2, maxW: pg.w * 0.3 });
        });
      }
      // えんぴつの棒人間
      var A = CM.MAN_ANIMS[anim], env = { stage: D.st, groundY: gy, cx: mx, s: manS, fixedX: mx, f: 1 };
      var fr = A.frame(t % A.loop, env, {}, 0);
      CM.drawMan(ctx, fr.pose, manS, D.time, { color: PENCIL, alpha: faint });
      if (n === 6 || n === 2 || n === 4) CM.chalk.text(ctx, n === 6 ? D.T('byeBye') : '…', mx + 30 * s, gy - 90 * manS / s * 0.6 - 30 * s, { size: 12 * s + 2, color: PENCIL, alpha: 0.7 });
      ctx.restore();
    }
  };
})(window);
