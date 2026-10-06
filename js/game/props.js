/*
 * CHALK MAN 棒人間のまわりの小道具（地面・はしご・水・穴・「？」・流れる線・黒板消し）
 * chalk〜 はチョークのレイヤーに描くもの、real〜 は黒板の上に置かれた本物の物（かすれない）。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU;

  CM.props = {
    /** 地面の線（穴があればそこだけ空ける） */
    ground: function (ctx, stage, y, time, pit) {
      var x0 = stage.x + 10, x1 = stage.x + stage.w - 10;
      var seed = Math.floor(time * 3);
      if (pit) {
        CM.chalk.line(ctx, [x0, y, pit.x0, y], { w: 2.4, alpha: 0.8, seed: seed, wob: 0.9 });
        CM.chalk.line(ctx, [pit.x1, y, x1, y], { w: 2.4, alpha: 0.8, seed: seed + 1, wob: 0.9 });
        // 穴の中（下に落ちていく壁）
        CM.chalk.line(ctx, [pit.x0, y, pit.x0 - 3, y + 40], { w: 2, alpha: 0.55, seed: seed + 2 });
        CM.chalk.line(ctx, [pit.x1, y, pit.x1 + 3, y + 40], { w: 2, alpha: 0.55, seed: seed + 3 });
      } else {
        CM.chalk.line(ctx, [x0, y, x1, y], { w: 2.4, alpha: 0.8, seed: seed, wob: 0.9 });
      }
      // 地面の下の短い線（地面らしさ）
      var r = U.rng(77);
      for (var i = 0; i < 9; i++) {
        var gx = x0 + r() * (x1 - x0), gl = 6 + r() * 14;
        if (pit && gx > pit.x0 - 20 && gx < pit.x1 + 5) continue;
        CM.chalk.line(ctx, [gx, y + 6 + r() * 6, gx + gl, y + 6 + r() * 6], { w: 1.4, alpha: 0.35, seed: i });
      }
    },

    ladder: function (ctx, L, s, time) {
      var w = 22 * s, seed = Math.floor(time * 3) * 7;
      CM.chalk.line(ctx, [L.x - w / 2, L.bottom, L.x - w / 2, L.top], { w: 2.6 * s, seed: seed, alpha: 0.9 });
      CM.chalk.line(ctx, [L.x + w / 2, L.bottom, L.x + w / 2, L.top], { w: 2.6 * s, seed: seed + 1, alpha: 0.9 });
      for (var y = L.bottom - 12 * s, i = 0; y > L.top + 4; y -= 15 * s, i++) {
        CM.chalk.line(ctx, [L.x - w / 2, y, L.x + w / 2, y + 1], { w: 2.2 * s, seed: seed + 2 + i, alpha: 0.85 });
      }
    },

    /** 水面の波（棒人間のあとに描いて、下半身を水に沈める） */
    water: function (ctx, stage, W, s) {
      var x0 = stage.x + 10, x1 = stage.x + stage.w - 10, seed = Math.floor(W.t * 4);
      for (var row = 0; row < 3; row++) {
        var y = W.y + row * 12 * s, pts = [], amp = 3 * s * (1 - row * 0.25);
        for (var x = x0; x <= x1; x += 8) pts.push(x, y + Math.sin(x * 0.05 + W.t * (3 - row) + row) * amp);
        CM.chalk.line(ctx, pts, { w: 2 * (1 - row * 0.2), color: COL.blue, alpha: 0.85 - row * 0.2, seed: seed + row, wob: 0.4 });
      }
    },

    /** 走るときにうしろへ流れる線 */
    speedLines: function (ctx, j, s, time) {
      var f = j.f, r = U.rng(Math.floor(time * 10) + 5);
      for (var i = 0; i < 4; i++) {
        var y = j.hip[1] - 50 * s + r() * 70 * s, x = j.hip[0] - f * (22 + r() * 18) * s, len = (18 + r() * 26) * s;
        CM.chalk.line(ctx, [x, y, x - f * len, y], { w: 1.6, alpha: 0.6, seed: i });
      }
    },

    /** 落ちるときの、上に伸びる線 */
    fallLines: function (ctx, j, s, time) {
      var r = U.rng(Math.floor(time * 10) + 9);
      for (var i = 0; i < 4; i++) {
        var x = j.hip[0] - 25 * s + r() * 50 * s, y = j.head[1] - 20 * s - r() * 20 * s, len = (20 + r() * 30) * s;
        CM.chalk.line(ctx, [x, y, x, y - len], { w: 1.6, alpha: 0.55, seed: i });
      }
    },

    /** 足もとの影（跳んだ高さで小さくなる） */
    shadow: function (ctx, sh, s) {
      var k = U.clamp(sh.k, 0.3, 1);
      CM.chalk.line(ctx, [sh.x - 16 * s * k, sh.y + 3, sh.x + 16 * s * k, sh.y + 3], { w: 2, alpha: 0.35 * k, seed: 4 });
    },

    /** 頭の上の「？」 */
    question: function (ctx, j, s, k, time) {
      if (k <= 0) return;
      var sc = U.easeBack(k);
      var x = j.head[0] + 16 * s, y = j.head[1] - 26 * s + Math.sin(time * 3) * 2 * s;
      CM.chalk.text(ctx, '?', x, y, { size: 30 * s * sc, color: COL.yellow, rot: 0.15 });
    },

    /** 振った物の軌跡（肩を中心にした弧） */
    trail: function (ctx, j, s, tr, reach) {
      if (!tr) return;
      var f = j.f, a0 = tr.from, a1 = j.handAngleF, n = 10;
      var al = tr.fade ? 1 - tr.fade : 1;
      for (var row = 0; row < 3; row++) {
        var rad = reach * (0.55 + row * 0.22), pts = [];
        for (var i = 0; i <= n; i++) {
          var a = U.lerp(a0, a1, i / n);
          pts.push(j.shoulder[0] + Math.sin(a) * rad * f, j.shoulder[1] + Math.cos(a) * rad);
        }
        CM.chalk.line(ctx, pts, { w: 1.6, alpha: 0.5 * al, seed: row + 40 });
      }
    },

    /** 本物の黒板消し（上はフェルト、下は木。回転して持つ） */
    realEraser: function (ctx, e) {
      var s = e.s, w = 58 * s, h = 24 * s;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot || 0);
      // かげ
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, -w / 2 + 4, -h / 2 + 5, w, h, 4 * s); ctx.fill();
      // 持ち手（木）
      var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#d8b98a'); g.addColorStop(1, '#a88458');
      ctx.fillStyle = g;
      roundRect(ctx, -w / 2, -h / 2, w, h * 0.58, 5 * s); ctx.fill();
      // フェルト（しましま）
      ctx.fillStyle = '#4b4f58';
      roundRect(ctx, -w / 2, -h / 2 + h * 0.55, w, h * 0.45, 3 * s); ctx.fill();
      ctx.fillStyle = '#6b707a';
      for (var i = 0; i < 6; i++) ctx.fillRect(-w / 2 + (i + 0.3) * w / 6, -h / 2 + h * 0.58, w / 14, h * 0.4);
      // フェルトについたチョークの粉
      ctx.fillStyle = 'rgba(240,240,230,0.35)';
      ctx.fillRect(-w / 2, h / 2 - h * 0.12, w, h * 0.12);
      // ふち
      ctx.strokeStyle = 'rgba(40,25,10,0.55)'; ctx.lineWidth = 1.2;
      roundRect(ctx, -w / 2, -h / 2, w, h, 5 * s); ctx.stroke();
      ctx.restore();
    },

    /** 黒板消しで拭いたあとのにじみ */
    realSmear: function (ctx, sm, s) {
      if (!sm || sm.x1 <= sm.x0) return;
      var r = U.rng(99);
      for (var i = 0; i < 16; i++) {
        var x = U.lerp(sm.x0, sm.x1, r()), y = U.lerp(sm.y0, sm.y1, r()), rad = (14 + r() * 18) * s;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(235,240,230,0.07)');
        g.addColorStop(1, 'rgba(235,240,230,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, rad, rad * 1.4, 0, 0, TAU); ctx.fill();
      }
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  CM.roundRect = roundRect;
})(window);
