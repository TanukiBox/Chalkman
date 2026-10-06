/*
 * CHALK MAN チョークの描き方と黒板の見た目
 *
 * ・チョークで描くものは、いったん「チョーク用の透明な紙（レイヤー）」に白や色で描き、
 *   最後に黒板のざらざら（細かい穴の模様）で削ってから黒板に重ねる。
 *   → どの線も文字も、同じかすれ方になる。ざらざらは黒板に固定なので、動いても本物っぽい。
 * ・線は少しだけ手ぶれさせ、1秒に数回ゆらぎを変える（手描きアニメのような「線のふるえ」）。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU;

  // ---- 黒板のざらざら（チョークのかすれ）----
  var grainCanvas = null;
  function makeGrain() {
    var N = 256;
    var c = document.createElement('canvas'); c.width = N; c.height = N;
    var g = c.getContext('2d');
    var img = g.createImageData(N, N), d = img.data, r = U.rng(20240901);
    for (var i = 0; i < N * N; i++) {
      var v = r();
      // ほとんどは少しだけ削る。ときどき大きく削る（チョークが乗らない凹み）
      var a = v < 0.16 ? 0.55 + r() * 0.45 : v * 0.28;
      d[i * 4 + 3] = Math.floor(a * 255);
    }
    g.putImageData(img, 0, 0);
    // 横方向にこすれた筋（黒板を横に拭いた跡に沿ってかすれる）
    g.fillStyle = '#000';
    for (var k = 0; k < 170; k++) {
      g.globalAlpha = 0.25 + r() * 0.5;
      var x = r() * N, y = r() * N, w = 3 + r() * 16, h = 0.6 + r() * 0.9;
      g.fillRect(x, y, w, h);
      if (x + w > N) g.fillRect(x - N, y, w, h);
    }
    // 小さなかたまりの穴
    for (k = 0; k < 520; k++) {
      g.globalAlpha = 0.5 + r() * 0.5;
      g.beginPath(); g.arc(r() * N, r() * N, 0.5 + r() * 1.1, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  CM.chalk = {
    /** チョークのレイヤーを黒板のざらざらで削る（レイヤーに描き終わった後に1回呼ぶ） */
    applyGrain: function (lctx, strength) {
      if (!grainCanvas) grainCanvas = makeGrain();
      if (!lctx._grainPattern || lctx._grainSrc !== grainCanvas) {
        lctx._grainPattern = lctx.createPattern(grainCanvas, 'repeat');
        lctx._grainSrc = grainCanvas;
      }
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'destination-out';
      lctx.globalAlpha = strength === undefined ? 1 : strength;
      lctx.fillStyle = lctx._grainPattern;
      lctx.fillRect(0, 0, lctx.canvas.width, lctx.canvas.height);
      lctx.restore();
    },

    /**
     * チョークの線。pts = [x0, y0, x1, y1, ...]
     * o = { w: 太さ, color, alpha, seed: ゆらぎの種, wob: 手ぶれの大きさ, close: 閉じる }
     */
    line: function (ctx, pts, o) {
      o = o || {};
      var w = o.w || 3, color = o.color || COL.chalk, wob = o.wob === undefined ? w * 0.22 : o.wob;
      var r = U.rng((o.seed || 1) * 7919 + 13);
      var n = pts.length / 2;
      // 手ぶれした点の列を作る（長い区間は途中に点を足す）
      var P = [];
      for (var i = 0; i < n; i++) {
        var x0 = pts[i * 2], y0 = pts[i * 2 + 1];
        P.push(x0 + (r() - 0.5) * wob * 2, y0 + (r() - 0.5) * wob * 2);
        if (i < n - 1) {
          var x1 = pts[i * 2 + 2], y1 = pts[i * 2 + 3];
          var len = Math.hypot(x1 - x0, y1 - y0);
          var steps = Math.min(6, Math.floor(len / (w * 7)));
          for (var s = 1; s <= steps; s++) {
            var t = s / (steps + 1);
            P.push(x0 + (x1 - x0) * t + (r() - 0.5) * wob * 2.2, y0 + (y1 - y0) * t + (r() - 0.5) * wob * 2.2);
          }
        }
      }
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      // 太い芯 → 細い2本を少しずらして重ねる（チョークの角が当たったムラ）
      var passes = [[1, o.alpha === undefined ? 0.95 : o.alpha, 0], [0.5, 0.55, 0.35], [0.35, 0.45, -0.35]];
      for (var p = 0; p < passes.length; p++) {
        var ps = passes[p], off = ps[2] * w;
        ctx.globalAlpha = ps[1] * (o.alpha === undefined ? 1 : o.alpha > 0.95 ? 1 : o.alpha / 0.95);
        ctx.lineWidth = w * ps[0] * (p === 0 ? 1 : 1.1);
        ctx.beginPath();
        ctx.moveTo(P[0] + off, P[1] - off * 0.6);
        for (var k = 2; k < P.length; k += 2) ctx.lineTo(P[k] + off, P[k + 1] - off * 0.6);
        if (o.close) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },

    /** チョークの円（手描きらしく、少しはみ出して閉じる） */
    circle: function (ctx, x, y, rad, o) {
      o = o || {};
      var r = U.rng((o.seed || 1) * 104729 + 7);
      var pts = [], start = r() * TAU, over = 0.35, n = U.clamp(Math.floor(rad * 0.7), 12, 64);
      var p1 = r() * TAU, p2 = r() * TAU;
      for (var i = 0; i <= n; i++) {
        var a = start + (TAU + over) * (i / n);
        // ゆるやかにゆがんだ円（手描きの丸）
        var rr = rad * (1 + 0.035 * Math.sin(a * 2 + p1) + 0.02 * Math.sin(a * 5 + p2)) + (i / n) * rad * 0.04;
        pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      CM.chalk.line(ctx, pts, { w: o.w, color: o.color, alpha: o.alpha, seed: o.seed, wob: o.wob === undefined ? 0.3 : o.wob });
    },

    /** チョークの字（手描きフォント） */
    text: function (ctx, str, x, y, o) {
      o = o || {};
      var size = o.size || 20;
      ctx.save();
      ctx.font = (o.weight || '400') + ' ' + size + 'px ' + CM.FONT;
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = o.baseline || 'middle';
      ctx.fillStyle = o.color || COL.chalk;
      var sc = 1;
      if (o.maxW) {
        var w = ctx.measureText(str).width;
        if (w > o.maxW) sc = o.maxW / w;
      }
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (sc !== 1) ctx.scale(sc, sc);
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      ctx.fillText(str, 0, 0);
      // 少しずらして重ね、チョークの太さを出す
      ctx.globalAlpha *= 0.55;
      ctx.fillText(str, size * 0.03, size * 0.02);
      ctx.restore();
    },

    /** 黒板（背景・木の枠・消し跡・チョーク置き）を描く。画面の大きさが変わったときだけ */
    renderBoard: function (bctx, L, dpr) {
      var W = L.W, H = L.H, r = U.rng(4242);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 木の枠（全体を木で塗ってから、内側を黒板にする）
      drawWood(bctx, 0, 0, W, H, r);
      var b = L.board;
      // 黒板の面
      var g = bctx.createRadialGradient(b.x + b.w * 0.45, b.y + b.h * 0.4, 10, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.75);
      g.addColorStop(0, COL.boardLight);
      g.addColorStop(0.55, COL.board);
      g.addColorStop(1, COL.boardDark);
      bctx.fillStyle = g;
      bctx.fillRect(b.x, b.y, b.w, b.h);
      bctx.save();
      bctx.beginPath(); bctx.rect(b.x, b.y, b.w, b.h); bctx.clip();
      // 細かいまだら（黒板の表面）
      for (var i = 0; i < (b.w * b.h) / 60; i++) {
        bctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)';
        var s = 0.6 + r() * 1.6;
        bctx.fillRect(b.x + r() * b.w, b.y + r() * b.h, s, s);
      }
      // 黒板消しで拭いた跡（横に大きく弧を描く、ぼんやり白いにじみ）
      var sweeps = 5 + Math.floor(b.w * b.h / 90000);
      for (var k = 0; k < sweeps; k++) {
        var cx = b.x + r() * b.w, cy = b.y + r() * b.h, len = b.w * (0.25 + r() * 0.4);
        var bend = (r() - 0.5) * 0.6, rad = 22 + r() * 36, al = 0.018 + r() * 0.03;
        for (var j = 0; j < 26; j++) {
          var t = j / 25 - 0.5, px = cx + t * len, py = cy + Math.sin(t * Math.PI) * bend * len * 0.4 + (r() - 0.5) * 6;
          var gg = bctx.createRadialGradient(px, py, 0, px, py, rad);
          gg.addColorStop(0, 'rgba(235,240,230,' + al + ')');
          gg.addColorStop(1, 'rgba(235,240,230,0)');
          bctx.fillStyle = gg;
          bctx.beginPath(); bctx.ellipse(px, py, rad * 1.6, rad, 0, 0, TAU); bctx.fill();
        }
      }
      // 消し残りの落書き（うっすら）
      // 消し残り：生徒たちの落書き
      var ghosts = ['へのへのもへじ', '参上！', '☆', '♡', '○×○', 'ねこ', '日直', 'じゃんけん', 'LOVE', '→ →'];
      var ng = 4 + Math.floor(b.w * b.h / 120000);
      for (k = 0; k < ng; k++) {
        var gx = b.x + 20 + r() * (b.w - 40), gy = b.y + 20 + r() * (b.h - 40), gs = 14 + r() * 16;
        var word = ghosts[Math.floor(r() * ghosts.length)];
        for (var q = 0; q < 3; q++) {
          CM.chalk.text(bctx, word, gx + (r() - 0.5) * 5, gy + (r() - 0.5) * 4, { size: gs, alpha: 0.012 + r() * 0.012, rot: (r() - 0.5) * 0.3 });
        }
      }
      // 境目の線（上下・左右の区切り。チョークでうすく引いた線）
      var d = L.divider;
      if (d) {
        bctx.setLineDash([10, 9]);
        CM.chalk.line(bctx, [d.x0, d.y0, d.x1, d.y1], { w: 2, alpha: 0.28, seed: 3, wob: 0.8 });
        bctx.setLineDash([]);
      }
      // 枠の内側のかげ
      var sh = 10;
      shadeEdge(bctx, b.x, b.y, b.w, sh, 0, 1);
      shadeEdge(bctx, b.x, b.y, sh, b.h, 1, 0);
      shadeEdge(bctx, b.x + b.w, b.y, -sh, b.h, -1, 0);
      shadeEdge(bctx, b.x, b.y + b.h, b.w, -sh, 0, -1);
      bctx.restore();
      // 枠の内ふち（明るい線と暗い線で段差を出す）
      bctx.strokeStyle = 'rgba(0,0,0,0.45)'; bctx.lineWidth = 2;
      bctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      bctx.strokeStyle = 'rgba(255,220,170,0.25)'; bctx.lineWidth = 1;
      bctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
      // チョーク置き（下の枠の出っぱり）
      var tr = L.tray;
      var tg = bctx.createLinearGradient(0, tr.y, 0, tr.y + tr.h);
      tg.addColorStop(0, COL.woodLight); tg.addColorStop(0.35, COL.wood); tg.addColorStop(1, COL.woodDark);
      bctx.fillStyle = tg;
      bctx.fillRect(tr.x, tr.y, tr.w, tr.h);
      bctx.fillStyle = 'rgba(255,235,200,0.35)';
      bctx.fillRect(tr.x, tr.y, tr.w, 1.5);
      // たまったチョークの粉
      for (i = 0; i < tr.w / 3; i++) {
        bctx.fillStyle = 'rgba(245,245,235,' + (0.08 + r() * 0.2) + ')';
        var dx = tr.x + r() * tr.w;
        bctx.beginPath(); bctx.arc(dx, tr.y + 2 + r() * 3, 0.5 + r() * 1.3, 0, TAU); bctx.fill();
      }
    }
  };

  function shadeEdge(ctx, x, y, w, h, dx, dy) {
    var g = ctx.createLinearGradient(x, y, x + (dx ? w : 0), y + (dy ? h : 0));
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h));
  }

  function drawWood(ctx, x, y, w, h, r) {
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, COL.woodLight); g.addColorStop(0.5, COL.wood); g.addColorStop(1, COL.woodDark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // 木目：上下の枠は横に、左右の枠は縦に流れる細い線（角は斜めのつなぎ目）
    var F = CM.CFG.FRAME * 1.6;
    ctx.lineWidth = 1;
    function grain(horizontal) {
      for (var i = 0; i < 60; i++) {
        ctx.strokeStyle = 'rgba(60,30,10,' + (0.08 + r() * 0.18) + ')';
        ctx.beginPath();
        if (horizontal) {
          var yy = r() * h;
          ctx.moveTo(0, yy);
          for (var xx = 0; xx <= w; xx += 30) ctx.lineTo(xx, yy + Math.sin(xx * 0.012 + i) * 1.6);
        } else {
          var x2 = r() * w;
          ctx.moveTo(x2, 0);
          for (var y2 = 0; y2 <= h; y2 += 30) ctx.lineTo(x2 + Math.sin(y2 * 0.012 + i) * 1.6, y2);
        }
        ctx.stroke();
      }
    }
    // 上下（横の木目）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w - F, F); ctx.lineTo(F, F); ctx.closePath();
    ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.lineTo(w - F, h - F * 1.6); ctx.lineTo(F, h - F * 1.6); ctx.closePath();
    ctx.clip();
    grain(true);
    ctx.restore();
    // 左右（縦の木目）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(F, F); ctx.lineTo(F, h - F * 1.6); ctx.lineTo(0, h); ctx.closePath();
    ctx.moveTo(w, 0); ctx.lineTo(w - F, F); ctx.lineTo(w - F, h - F * 1.6); ctx.lineTo(w, h); ctx.closePath();
    ctx.clip();
    grain(false);
    ctx.restore();
  }
})(window);
