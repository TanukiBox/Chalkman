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
      // 黒板消しは、棒人間が歩いて入ってきてから、左の外から入ってくる
      sc.ex = st.x - 50 * s; sc.stopX = X(D, 0.44); sc.speed = 1; sc.moving = false; sc.started = false; sc.wait = 0.5;
      sc.e = { x: sc.ex, y: st.y + st.h * 0.4, rot: 0.1, s: s * 1.5 };
      sc.safe = [];          // 消されないところ { x0, y0, x1, y1 }
      sc.t = 0; sc.swishT = 0.4; sc.top = st.y + st.h * 0.14;
    },
    update: function (sc, dt, D) {
      var s = D.s, st = D.st;
      if (!sc.started) {
        if (D.intro) return;                 // 歩いて入ってくるあいだは、まだ来ない
        sc.wait -= dt;
        if (sc.wait > 0) return;
        sc.started = true; sc.moving = true;
        D.sfx.play('whoosh');
        D.fx.word(D.T('eraserComing'), st.x + st.w * 0.3, st.y + st.h * 0.3, { size: 16 * s + 4, color: COL.red, life: 1.4, vy: -10 });
      }
      if (!sc.moving) return;
      sc.t += dt * sc.speed;
      if (sc.ex < sc.stopX) sc.ex += dt * (sc.ex < st.x + 24 * s ? 110 : 18) * s * sc.speed;   // はじめは、すっと入ってくる
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
  //   0.0〜1.1秒 表紙が開く → 絵が1つずつ描かれていく → リボンの題名 → はんこ → 書いたことばが流れる
  //   チョークが多い・隠しエンドは、ファンファーレと紙ふぶき。少ないときは、やさしい曲
  // ------------------------------------------------------------
  var PENCIL = '#5d5d66';
  var RAINBOW = ['#e0567a', '#e07a30', '#e0b21c', '#4caf6a', '#3f8fd1', '#9a6bd1'];
  function pen(c, sd, w, al) { return { w: w || 2, color: c || PENCIL, alpha: al === undefined ? 0.9 : al, seed: sd, wob: 0.6 }; }
  /** 0→1（t0 から sec 秒かけて） */
  function ramp(t, t0, sec) { return U.clamp((t - t0) / (sec || 0.4), 0, 1); }
  /** ぽんっと出てくる大きさ */
  function popK(t, t0) { return U.easeBack(ramp(t, t0, 0.35)); }

  function drawCover(ctx, pg, s, k, label) {
    // 表紙（左はしを軸に開く）
    var w = pg.w * Math.cos(k * PI / 2);
    if (w < 1) return;
    ctx.save();
    ctx.fillStyle = k < 0.5 ? '#e8904a' : '#c9763a';
    ctx.fillRect(pg.x - 6 * s, pg.y - 6 * s, w + 12 * s, pg.h + 12 * s);
    if (k < 0.5) {
      ctx.fillStyle = '#fbfaf2'; ctx.fillRect(pg.x + w * 0.2, pg.y + pg.h * 0.2, w * 0.6, pg.h * 0.16);
      ctx.fillStyle = '#5d5d66'; ctx.font = (18 * s + 4) + 'px ' + CM.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, pg.x + w * 0.5, pg.y + pg.h * 0.28);
      // 表紙の、小さな棒人間のシール
      ctx.strokeStyle = '#fbfaf2'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      var cx = pg.x + w * 0.5, cy = pg.y + pg.h * 0.62;
      ctx.beginPath(); ctx.arc(cx, cy - 30 * s, 10 * s, 0, TAU); ctx.moveTo(cx, cy - 20 * s); ctx.lineTo(cx, cy + 10 * s);
      ctx.moveTo(cx - 16 * s, cy - 18 * s); ctx.lineTo(cx, cy - 8 * s); ctx.lineTo(cx + 16 * s, cy - 18 * s);
      ctx.moveTo(cx - 12 * s, cy + 30 * s); ctx.lineTo(cx, cy + 10 * s); ctx.lineTo(cx + 12 * s, cy + 30 * s); ctx.stroke();
    }
    ctx.restore();
  }
  function drawPage(ctx, pg, s, night) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(pg.x + 6, pg.y + 8, pg.w, pg.h);
    ctx.fillStyle = '#e8904a'; ctx.fillRect(pg.x - 6 * s, pg.y - 6 * s, pg.w + 12 * s, pg.h + 12 * s);
    ctx.fillStyle = '#fbfaf2'; ctx.fillRect(pg.x, pg.y, pg.w, pg.h);
    if (night) { ctx.fillStyle = 'rgba(40,52,110,' + (0.22 * night) + ')'; ctx.fillRect(pg.x, pg.y, pg.w, pg.h); }
    ctx.strokeStyle = 'rgba(120,150,200,0.3)'; ctx.lineWidth = 1;
    for (var y = pg.y + 22 * s; y < pg.y + pg.h - 6 * s; y += 16 * s) { ctx.beginPath(); ctx.moveTo(pg.x + 6 * s, y); ctx.lineTo(pg.x + pg.w - 6 * s, y); ctx.stroke(); }
    ctx.restore();
  }
  function pencilCloud(ctx, x, y, w, sd, c) { L(ctx, CM.cloudPts(x, y, w, w * 0.42, sd), pen(c || '#7aa7d6', sd, 2)); }
  function pencilStar(ctx, x, y, r, sd, c) {
    var pts = [];
    for (var i = 0; i <= 10; i++) { var a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    fill(ctx, pts, c || '#e0b21c', 0.25);
    L(ctx, pts, pen(c || '#e0b21c', sd, 2));
  }
  function heart(ctx, x, y, h, c, sd) {
    var pts = [x, y + h * 0.9, x - h, y - 0.05 * h, x - h * 0.8, y - h * 0.75, x - h * 0.25, y - h * 0.85, x, y - h * 0.35, x + h * 0.25, y - h * 0.85, x + h * 0.8, y - h * 0.75, x + h, y - 0.05 * h, x, y + h * 0.9];
    fill(ctx, pts, c, 0.35); L(ctx, pts, pen(c, sd, 1.8));
  }
  /** リボン（題名） */
  function drawRibbon(ctx, cx, y, w, h, text, k, s) {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(cx, y); ctx.scale(k, k);
    ctx.fillStyle = '#b8323f';
    [-1, 1].forEach(function (d) {
      ctx.beginPath(); ctx.moveTo(d * w / 2, -h * 0.3); ctx.lineTo(d * (w / 2 + 18 * s), -h * 0.3); ctx.lineTo(d * (w / 2 + 10 * s), h * 0.15); ctx.lineTo(d * (w / 2 + 18 * s), h * 0.6); ctx.lineTo(d * w / 2, h * 0.6); ctx.fill();
    });
    ctx.fillStyle = '#d9414f'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.35);
    ctx.fillStyle = '#fff8e6'; ctx.font = 'bold ' + Math.round(h * 0.52) + 'px ' + CM.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width, sc = Math.min(1, (w - 16 * s) / tw);
    ctx.scale(sc, 1); ctx.fillText(text, 0, 1);
    ctx.restore();
  }
  /** はんこ（はなまる・よくがんばりました・でんせつ） */
  function drawStamp(ctx, x, y, r, kind, k, s, t) {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25); ctx.scale(k, k);
    var col = kind === 'legend' ? '#d49a12' : '#d9414f';
    if (kind === 'hanamaru') {
      // うずまき＋花びら
      var pts = [];
      for (var i = 0; i <= 60; i++) { var a = i / 60 * TAU * 2.6, rr = r * 0.12 + r * 0.55 * i / 60; pts.push(Math.cos(a) * rr, Math.sin(a) * rr); }
      L(ctx, pts, pen(col, 5, 3, 0.95));
      for (i = 0; i < 8; i++) { var aa = i / 8 * TAU; L(ctx, oval(Math.cos(aa) * r * 0.82, Math.sin(aa) * r * 0.82, r * 0.26, r * 0.26, 12, aa - PI * 0.9, aa + PI * 0.9), pen(col, 10 + i, 3, 0.95)); }
    } else {
      ctx.globalAlpha = 0.9;
      CM.chalk.circle(ctx, 0, 0, r, pen(col, 20, 3, 0.95));
      CM.chalk.circle(ctx, 0, 0, r * 0.82, pen(col, 21, 1.6, 0.8));
      if (kind === 'legend') pencilStar(ctx, 0, -r * 0.35, r * 0.28, 22, col);
      var lines = kind === 'legend' ? [CM.app.i18n.t('stampLegend')] : CM.app.i18n.t('stampTried').split('|');
      ctx.fillStyle = col; ctx.font = 'bold ' + Math.round(r * (lines.length > 1 ? 0.34 : 0.42)) + 'px ' + CM.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach(function (ln, i) {
        var w = ctx.measureText(ln).width, sc = Math.min(1, r * 1.5 / w);
        ctx.save(); ctx.translate(0, (kind === 'legend' ? r * 0.25 : 0) + (i - (lines.length - 1) / 2) * r * 0.42); ctx.scale(sc, 1); ctx.fillText(ln, 0, 0); ctx.restore();
      });
    }
    ctx.restore();
  }
  /** 紙ふぶき（ステージ全体に降る） */
  function confetti(ctx, D, list, dt) {
    var st = D.st;
    list.forEach(function (c) {
      c.y += c.vy * dt; c.x += Math.sin(c.ph + D.time * 2) * 20 * dt; c.r += c.vr * dt;
      if (c.y > st.y + st.h + 10) { c.y = st.y - 10; c.x = st.x + Math.random() * st.w; }
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.scale(1, Math.cos(D.time * 6 + c.ph));
      ctx.fillStyle = c.col; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
    });
  }
  /** 本物のえんぴつ（気持ちエンドで、ことばを書いていく） */
  function realPencil(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(4, -3 * s + 4, 70 * s, 8 * s);
    ctx.fillStyle = '#f1c232'; ctx.fillRect(10 * s, -4 * s, 60 * s, 8 * s);
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.moveTo(10 * s, -4 * s); ctx.lineTo(0, 0); ctx.lineTo(10 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#e0567a'; ctx.beginPath(); ctx.moveTo(3 * s, -1.2 * s); ctx.lineTo(0, 0); ctx.lineTo(3 * s, 1.2 * s); ctx.fill();
    ctx.fillStyle = '#f2a0b5'; ctx.fillRect(66 * s, -4 * s, 8 * s, 8 * s);
    ctx.restore();
  }

  SC.ending = {
    setup: function (sc, D) {
      var st = D.st, s = D.s;
      sc.segs = [];
      sc.manX = st.x - 200; sc.restX = st.x;
      sc.pg = { x: st.x + 16 * s, y: st.y + 40 * s, w: st.w - 32 * s, h: st.h - 50 * s };
      sc.t = 0; sc.played = {};
      sc.conf = [];
      for (var i = 0; i < 46; i++) sc.conf.push({ x: st.x + Math.random() * st.w, y: st.y - Math.random() * st.h, vy: (50 + Math.random() * 60) * s, vr: (Math.random() - 0.5) * 6, r: Math.random() * TAU, ph: Math.random() * TAU, w: (4 + Math.random() * 4) * s, h: (6 + Math.random() * 5) * s, col: RAINBOW[i % RAINBOW.length] });
      sc.petals = [];
      for (i = 0; i < 16; i++) sc.petals.push({ x: Math.random(), y: Math.random(), sp: 0.3 + Math.random() * 0.3, ph: Math.random() * TAU });
    },
    update: function (sc, dt, D) {
      var t0 = sc.t;
      sc.t += dt; sc.dt = dt; D.man.alpha = 0;
      var big = sc.hi || sc.no === 7;
      function once(key, at, fn) { if (!sc.played[key] && sc.t >= at) { sc.played[key] = true; fn(); } }
      once('open', 0.4, function () { D.sfx.play('whoosh'); });
      [1.3, 1.7, 2.1, 2.5].forEach(function (a, i) { once('pop' + i, a, function () { D.sfx.play('pop'); }); });
      once('ribbon', 3.0, function () { D.sfx.play(big ? 'fanfare' : 'softTune'); });
      once('stamp', 3.9, function () { D.sfx.play(big ? 'boom' : 'thud'); D.fx.shake(big ? 6 : 3, 0.3); });
      void t0;
    },
    drawChalk: function (ctx, sc, D) {
      CM.chalk.text(ctx, D.T('theEnd'), D.st.x + 14, D.st.y + 22, { size: 18, align: 'left', color: COL.yellow });
    },
    drawReal: function (ctx, sc, D) {
      var s = D.s, pg = sc.pg, t = sc.t, n = sc.no, cx = pg.x + pg.w / 2, st = D.st;
      // 上はリボン、下は流れる帯。そのあいだに絵を描く（ページが低い画面では、棒人間を小さくする）
      var gy = pg.y + pg.h - Math.max(40 * s, Math.min(62 * s, pg.h * 0.2)), top = pg.y + 44 * s, room = gy - top, hi = sc.hi, big = hi || n === 7, lang = (CM.app && CM.app.i18n.lang) || 'ja';
      var night = n === 2 ? ramp(t, 1.2, 1) : 0;
      if (t > 0.4) drawPage(ctx, pg, s, night);
      if (t < 1.2) { drawCover(ctx, pg, s, U.easeInOut(ramp(t, 0.5, 0.7)), D.T('notebookLabel')); if (t < 1.1) return; }
      ctx.save();
      ctx.beginPath(); ctx.rect(pg.x, pg.y, pg.w, pg.h); ctx.clip();
      // 棒人間の高さ（手を上げてジャンプ）はだいたい 150。王冠をかぶると +16
      var a1 = ramp(t, 1.2, 0.6), manS = Math.min(s * (hi ? 0.95 : 0.62), room / (n === 7 ? 168 : 152)), faint = hi ? 1 : 0.5;
      var anim = 'cheer', mx = cx, mgy = gy;

      // ---- エンディングごとの絵 ----
      if (n === 1) {
        // 虹（外がわから描かれていく）
        RAINBOW.forEach(function (c, i) {
          var k = ramp(t, 1.2 + i * 0.1, 0.8);
          if (k > 0) L(ctx, oval(cx, gy + 10 * s, pg.w * 0.44 - i * 7 * s, pg.h * 0.5 - i * 7 * s, 30, PI, PI + PI * k), pen(c, 30 + i, 4 * s, 0.85));
        });
        var dx = (t * 12 * s) % (pg.w + 80 * s);
        ctx.save(); ctx.globalAlpha = a1;
        pencilCloud(ctx, pg.x + ((pg.w * 0.15 + dx) % (pg.w + 60 * s)) - 30 * s, pg.y + pg.h * 0.24, 30 * s, 11);
        pencilCloud(ctx, pg.x + ((pg.w * 0.7 + dx * 0.7) % (pg.w + 60 * s)) - 30 * s, pg.y + pg.h * 0.4, 24 * s, 12);
        [[0.2, 0.18, 7], [0.5, 0.14, 10], [0.84, 0.22, 8], [0.66, 0.3, 6]].forEach(function (p, i) { var tw = 0.8 + 0.2 * Math.sin(t * 4 + i); pencilStar(ctx, pg.x + pg.w * p[0], pg.y + pg.h * p[1], p[2] * s * tw * popK(t, 1.5 + i * 0.15), 40 + i); });
        ctx.restore();
        // 鳥が飛んでいく・流れ星
        if (t > 2 && CM.drawBird) [0, 1].forEach(function (i) { var bx = pg.x + ((t * 40 * s + i * pg.w * 0.5) % (pg.w + 60 * s)) - 30 * s; CM.drawBird(ctx, { x: bx, y: pg.y + pg.h * (0.46 + i * 0.08) + Math.sin(t * 3 + i) * 6 * s, face: 1, ph: i, sd: 50 + i, k: 0.8 }, s, D.time); });
        var sp = (t % 3.2) / 0.8;
        if (t > 2.4 && sp < 1) L(ctx, [pg.x + pg.w * (0.9 - sp * 0.5), pg.y + pg.h * (0.08 + sp * 0.18), pg.x + pg.w * (0.98 - sp * 0.5), pg.y + pg.h * (0.04 + sp * 0.18)], pen('#e0b21c', 60, 2.4));
      } else if (n === 2) {
        ctx.save(); ctx.globalAlpha = a1;
        var mx0 = pg.x + pg.w * 0.74, my0 = pg.y + pg.h * 0.4, mr = 22 * s;
        L(ctx, oval(mx0, my0, mr, mr, 20, -PI * 0.62, PI * 0.62).concat(oval(mx0 + mr * 0.45, my0, mr * 0.78, mr * 0.86, 16, PI * 0.5, -PI * 0.5)), pen('#e0b21c', 70, 2.6));
        [[0.2, 0.2], [0.4, 0.12], [0.55, 0.3], [0.3, 0.38]].forEach(function (p, i) { pencilStar(ctx, pg.x + pg.w * p[0], pg.y + pg.h * p[1], 5 * s * (0.7 + 0.3 * Math.sin(t * 1.5 + i)), 71 + i); });
        pencilCloud(ctx, cx + 20 * s, gy - 10 * s, 50 * s, 21, '#9fb6cc');
        ctx.restore();
        anim = 'lie'; mx = cx - 10 * s; mgy = gy - 30 * s;
        var zk = (t % 2) / 2;
        CM.chalk.text(ctx, 'Z', mx + 20 * s + zk * 20 * s, mgy - 30 * s - zk * 30 * s, { size: (10 + zk * 8) * s, color: '#7aa7d6', alpha: 1 - zk });
      } else if (n === 3 || n === 4) {
        // 地面の下（土の断面と、トンネル）
        ctx.save(); ctx.globalAlpha = a1;
        ctx.fillStyle = 'rgba(160,120,78,0.28)'; ctx.fillRect(pg.x, gy, pg.w, pg.y + pg.h - gy);
        var r = U.rng(3);
        ctx.fillStyle = '#a0784e';
        for (var i = 0; i < 24; i++) { ctx.globalAlpha = a1 * 0.5; ctx.beginPath(); ctx.arc(pg.x + r() * pg.w, gy + 6 * s + r() * (pg.y + pg.h - gy - 10 * s), (1 + r() * 2) * s, 0, TAU); ctx.fill(); }
        ctx.restore();
        L(ctx, [pg.x + pg.w * 0.1, gy + 24 * s].concat(bez([pg.x + pg.w * 0.1, gy + 24 * s], [pg.x + pg.w * 0.4, gy + 50 * s], [pg.x + pg.w * 0.6, gy + 10 * s], [pg.x + pg.w * 0.92, gy + 30 * s], 16)), pen('#a0784e', 80, 8 * s, 0.4 * a1));
        // モグラ（穴から出たり入ったり）
        [0.18, 0.82].forEach(function (f, i) {
          var hx = pg.x + pg.w * f, rise = t > 1.6 ? U.clamp(0.5 + Math.sin(t * 1.8 + i * 2) * 1.2, 0, 1) : 0;
          L(ctx, oval(hx, gy + 1, 20 * s, 4 * s, 14), pen('#a0784e', 90 + i, 2));
          if (CM.drawMole && rise > 0) {
            ctx.save(); ctx.beginPath(); ctx.rect(pg.x, pg.y, pg.w, gy - pg.y + 2); ctx.clip();
            CM.drawMole(ctx, { x: hx, hx: hx, rise: rise, mode: 'happy', sd: 91 + i }, { s: s * 0.75, gy: gy, time: D.time });
            ctx.restore();
          }
        });
        if (n === 3) {
          // コウモリと、宝箱（ひらいて、キラキラ）
          if (CM.drawBatFly && t > 1.8) CM.drawBatFly(ctx, { x: pg.x + pg.w * (0.7 + 0.1 * Math.sin(t)), y: top + room * 0.3 + Math.sin(t * 2) * 8 * s, face: -1, ph: 0, sd: 95, k: 1 }, { s: s, time: D.time });
          var bx = pg.x + pg.w * 0.72, bk = popK(t, 2.2);
          if (bk > 0) {
            ctx.save(); ctx.translate(bx, gy); ctx.scale(bk, bk);
            var bw2 = 22 * s, bh2 = 18 * s;
            fill(ctx, [-bw2, 0, -bw2, -bh2, bw2, -bh2, bw2, 0], '#e07a30', 0.3);
            L(ctx, [-bw2, 0, -bw2, -bh2, bw2, -bh2, bw2, 0, -bw2, 0], pen('#e07a30', 96, 2.2));
            L(ctx, [-bw2, -bh2, -bw2 - 4 * s, -bh2 - 14 * s, bw2 - 4 * s, -bh2 - 16 * s, bw2, -bh2], pen('#e07a30', 97, 2.2));
            ctx.restore();
            for (var g = 0; g < 4; g++) { var ga = t * 2 + g * 1.6; pencilStar(ctx, bx + Math.cos(ga) * 18 * s, gy - 30 * s - Math.abs(Math.sin(ga)) * 16 * s, 4 * s, 98 + g, RAINBOW[g + 1]); }
          }
        } else {
          anim = 'lie'; mx = cx - 16 * s;
          var zk2 = (t % 2) / 2;
          CM.chalk.text(ctx, 'Z', mx + 20 * s + zk2 * 20 * s, gy - 30 * s - zk2 * 30 * s, { size: (10 + zk2 * 8) * s, color: '#7aa7d6', alpha: 1 - zk2 });
        }
      } else if (n === 5 || n === 6) {
        // 書いたことばを、えんぴつが書いていく
        var word = sc.word || '', ws = Math.min(52 * s, (pg.w * 0.82) / Math.max(1, U.chars(word).length) * 1.1, room * 0.34), wy = top + ws * 0.55;
        // ことばの下に、棒人間が入るように
        manS = Math.min(manS, (gy - (wy + ws * 0.6) - 4 * s) / 152);
        var wk = ramp(t, 1.3, n === 5 ? 1.4 : 2.2);
        ctx.save(); ctx.font = ws + 'px ' + CM.FONT;
        var tw = Math.min(pg.w * 0.85, ctx.measureText(word).width), wx0 = cx - tw / 2;
        ctx.beginPath(); ctx.rect(wx0 - 10 * s, wy - ws, (tw + 20 * s) * wk, ws * 2); ctx.clip();
        CM.chalk.text(ctx, word, cx, wy, { size: ws, color: '#e0567a', maxW: pg.w * 0.85, alpha: n === 5 ? 1 : 0.4 });
        ctx.restore();
        if (wk > 0 && wk < 1) realPencil(ctx, wx0 + tw * wk, wy + ws * 0.2 + Math.sin(t * 30) * 3 * s, s);
        if (n === 5) {
          for (var h = 0; h < 6; h++) { var hk = ((t * 0.35 + h / 6) % 1); if (t > 2.6) heart(ctx, pg.x + pg.w * (0.1 + (h * 0.37) % 0.8), pg.y + pg.h * (0.9 - hk * 0.8), (5 + h % 3 * 2) * s, '#e0567a', 110 + h); }
          sc.petals.forEach(function (p, i) {
            if (t < 2.8) return;
            var py = pg.y + ((p.y + t * p.sp * 0.25) % 1) * pg.h, px = pg.x + (p.x + Math.sin(t + p.ph) * 0.05) * pg.w;
            ctx.save(); ctx.translate(px, py); ctx.rotate(t * 2 + p.ph); ctx.fillStyle = '#f7a8c0'; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.ellipse(0, 0, 4 * s, 2.4 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
          });
        } else {
          mx = cx + pg.w * 0.3; manS = Math.min(manS, s * 0.5);
        }
      } else if (n === 7) {
        // 旗のかざり
        var fl = [];
        for (var q = 0; q <= 10; q++) fl.push(pg.x + pg.w * q / 10, pg.y + 50 * s + Math.sin(q / 10 * PI) * 16 * s);
        L(ctx, fl, pen(PENCIL, 120, 1.4, a1));
        for (q = 0; q < 10; q++) { var fx0 = pg.x + pg.w * (q + 0.5) / 10, fy0 = pg.y + 50 * s + Math.sin((q + 0.5) / 10 * PI) * 16 * s; fill(ctx, [fx0 - 7 * s, fy0, fx0 + 7 * s, fy0, fx0, fy0 + 14 * s], RAINBOW[q % 6], 0.6 * a1); }
        // 珍回答で書いたことばが、パレードする
        var fw = sc.funnyWords || [];
        fw.slice(0, 12).forEach(function (w, i) {
          var k = (t * 0.08 + i / Math.min(12, fw.length)) % 1, a = k * TAU;
          var px = cx + Math.cos(a) * pg.w * 0.38, py = pg.y + pg.h * 0.45 + Math.sin(a) * pg.h * 0.2 - Math.abs(Math.sin(t * 6 + i)) * 5 * s;
          ctx.save(); ctx.globalAlpha = popK(t, 1.4 + i * 0.12) > 0 ? 1 : 0;
          CM.chalk.text(ctx, w, px, py, { size: 13 * s + 3, color: RAINBOW[i % 6], rot: Math.sin(t * 4 + i) * 0.15, maxW: pg.w * 0.3 });
          ctx.restore();
        });
        // 王冠
        mgy = gy;
      }

      // ---- 地面と、えんぴつの棒人間 ----
      L(ctx, [pg.x + 14 * s, gy, pg.x + pg.w - 14 * s, gy], pen(PENCIL, 1, 1.8, 0.7 * a1));
      var A = CM.MAN_ANIMS[anim], env = { stage: D.st, groundY: mgy, cx: mx, s: manS, fixedX: mx, f: 1 };
      var fr = A.frame(t % A.loop, env, {}, 0), ma = ramp(t, 1.8, 0.6) * faint;
      if (ma > 0) {
        var j = CM.drawMan(ctx, fr.pose, manS, D.time, { color: PENCIL, alpha: ma });
        if (n === 7 && j) {
          var hx = j.head[0], hy = j.head[1] - CM.BODY.head * manS;
          var crown = [hx - 10 * manS, hy, hx - 12 * manS, hy - 14 * manS, hx - 5 * manS, hy - 7 * manS, hx, hy - 16 * manS, hx + 5 * manS, hy - 7 * manS, hx + 12 * manS, hy - 14 * manS, hx + 10 * manS, hy, hx - 10 * manS, hy];
          fill(ctx, crown, '#e0b21c', 0.5); L(ctx, crown, pen('#d49a12', 130, 2));
        }
      }
      if (n === 6) CM.chalk.text(ctx, D.T('byeBye'), mx + 30 * s, mgy - 70 * s, { size: 12 * s + 2, color: PENCIL, alpha: 0.7 * ma });

      // ---- 書いたことばが流れる（下の帯）----
      var tk = ramp(t, 4.4, 0.6);
      if (tk > 0 && sc.helped && sc.helped.length) {
        var ty = pg.y + pg.h - 18 * s;
        ctx.save(); ctx.globalAlpha = tk;
        ctx.fillStyle = 'rgba(255,248,220,0.9)'; ctx.fillRect(pg.x, ty - 13 * s, pg.w, 26 * s);
        ctx.strokeStyle = 'rgba(224,178,28,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(pg.x + 2, ty - 13 * s, pg.w - 4, 26 * s);
        ctx.font = (12 * s + 3) + 'px ' + CM.FONT; ctx.textBaseline = 'middle';
        var items = [D.T('wordsYouWrote')].concat(sc.helped), gap = 16 * s, widths = items.map(function (w) { return ctx.measureText(w).width + gap; });
        var total = widths.reduce(function (a, b) { return a + b; }, 0), off = (t - 4.4) * 40 * s % total;
        for (var rep = 0; rep < 3; rep++) {
          var x = pg.x + pg.w - off + rep * total - total;
          items.forEach(function (w, i) {
            if (x > pg.x - 200 && x < pg.x + pg.w) { ctx.fillStyle = i === 0 ? '#b8323f' : RAINBOW[i % 6]; ctx.fillText(w, x, ty); }
            x += widths[i];
          });
        }
        ctx.restore();
      }
      ctx.restore();

      // ---- リボンの題名と、はんこ ----
      var E = CM.ENDINGS[n] || { title: { ja: '', en: '' } };
      var rk = t >= 3 ? U.easeBack(ramp(t, 3, 0.45)) : 0;
      drawRibbon(ctx, pg.x + pg.w * 0.44, pg.y + 22 * s - (1 - Math.min(1, rk)) * 20 * s, pg.w * 0.74, 30 * s, D.T('endingN', { n: n }) + '  ' + CM.fillWord(E.title[lang], sc.word), rk, s);
      var stk = t >= 3.9 ? 1 + 1.2 * (1 - ramp(t, 3.9, 0.25)) : 0;
      if (stk > 0) drawStamp(ctx, pg.x + pg.w - 26 * s, pg.y + 28 * s, 24 * s, n === 7 ? 'legend' : hi ? 'hanamaru' : 'tried', stk, s, t);

      // ---- 紙ふぶき ----
      if (big && t > 3) confetti(ctx, D, sc.conf, sc.dt || 0.016);
      else if (!big && t > 3) {
        // やさしくふる、小さな光
        for (var p = 0; p < 10; p++) { var pk = ((t * 0.12 + p / 10) % 1); CM.chalk.text(ctx, '✦', st.x + st.w * ((p * 0.37) % 1), st.y + st.h * pk, { size: 8 * s, color: COL.yellow, alpha: 0.5 * (1 - pk) }); }
      }
    }
  };
})(window);
