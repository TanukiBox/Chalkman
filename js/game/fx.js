/*
 * CHALK MAN 演出（チョークの粉・音の文字・ハートなどの小さな飛びもの、画面のゆれ）
 * 飛びものはチョークのレイヤーに描くので、全部かすれたチョークの見た目になる。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU;

  CM.createFx = function () {
    var list = [];
    var shakeAmt = 0, shakeT = 0, shakeDur = 0;

    var fx = {
      list: list,
      /** 画面をゆらす（強さ px、長さ 秒） */
      shake: function (amt, dur) {
        if (amt >= shakeAmt * (1 - shakeT / Math.max(shakeDur, 0.001))) { shakeAmt = amt; shakeT = 0; shakeDur = dur || 0.3; }
      },
      shakeOffset: function () {
        if (shakeT >= shakeDur) return { x: 0, y: 0 };
        var k = 1 - shakeT / shakeDur, a = shakeAmt * k * k;
        return { x: (Math.random() - 0.5) * 2 * a, y: (Math.random() - 0.5) * 2 * a };
      },
      /**
       * 飛びものを1つ出す
       * p = { type, x, y, vx, vy, life, size, color, g(重力), rot, vr, text, drag }
       */
      add: function (p) {
        p.t = 0;
        p.life = p.life || 1;
        p.vx = p.vx || 0; p.vy = p.vy || 0;
        p.g = p.g || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
        p.size = p.size || 3;
        p.color = p.color || COL.chalk;
        p.seed = p.seed || Math.floor(Math.random() * 1e6);
        list.push(p);
        return p;
      },
      /** チョークの粉をぱらぱら */
      dust: function (x, y, n, o) {
        o = o || {};
        for (var i = 0; i < n; i++) {
          var a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * TAU;
          var sp = (o.speed || 60) * (0.3 + Math.random() * 0.9);
          fx.add({ type: 'dust', x: x + (Math.random() - 0.5) * (o.w || 0), y: y + (Math.random() - 0.5) * (o.h || 0),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g === undefined ? 160 : o.g, life: (o.life || 0.7) * (0.6 + Math.random() * 0.8),
            size: (o.size || 1.8) * (0.5 + Math.random()), color: o.color, drag: o.drag === undefined ? 1.5 : o.drag });
        }
      },
      /** 「ドスン」などの音の文字を出す */
      word: function (text, x, y, o) {
        o = o || {};
        fx.add({ type: 'text', text: text, x: x, y: y, vy: o.vy === undefined ? -30 : o.vy, life: o.life || 0.9, size: o.size || 22,
          color: o.color || COL.chalk, rot: o.rot === undefined ? (Math.random() - 0.5) * 0.3 : o.rot });
      },
      /** 輪がひろがる */
      ring: function (x, y, r0, r1, o) {
        o = o || {};
        fx.add({ type: 'ring', x: x, y: y, r0: r0, r1: r1, life: o.life || 0.6, color: o.color, size: o.size || 2.5 });
      },
      clear: function () { list.length = 0; shakeT = shakeDur; },
      update: function (dt) {
        shakeT += dt;
        for (var i = list.length - 1; i >= 0; i--) {
          var p = list[i];
          p.t += dt;
          if (p.t >= p.life) { list.splice(i, 1); continue; }
          if (p.drag) { var k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
          p.vy += p.g * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.rot += p.vr * dt;
        }
      },
      /** チョークのレイヤーに描く */
      draw: function (ctx) {
        for (var i = 0; i < list.length; i++) drawOne(ctx, list[i]);
      }
    };
    return fx;
  };

  function drawOne(ctx, p) {
    var k = p.t / p.life, a = k < 0.15 && p.fadeIn ? k / 0.15 : 1 - Math.pow(k, 2.2);
    var s = p.size;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a) * (p.alpha === undefined ? 1 : p.alpha);
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    var seed = p.seed + Math.floor(p.t * 8);
    switch (p.type) {
      case 'dust':
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill();
        break;
      case 'spark':
        ctx.strokeStyle = p.color; ctx.lineWidth = s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.vx * 0.05, -p.vy * 0.05); ctx.stroke();
        break;
      case 'frost':
        for (var j = 0; j < 3; j++) {
          var an = j * Math.PI / 3;
          CM.chalk.line(ctx, [-Math.cos(an) * s, -Math.sin(an) * s, Math.cos(an) * s, Math.sin(an) * s], { w: Math.max(1.4, s * 0.28), color: p.color, seed: p.seed + j, wob: 0.2 });
        }
        break;
      case 'star':
        var st = s * (0.7 + 0.3 * Math.sin(p.t * 20));
        CM.chalk.line(ctx, [0, -st, 0, st], { w: Math.max(1.4, s * 0.3), color: p.color, seed: p.seed, wob: 0.1 });
        CM.chalk.line(ctx, [-st, 0, st, 0], { w: Math.max(1.4, s * 0.3), color: p.color, seed: p.seed + 1, wob: 0.1 });
        break;
      case 'note':
      case 'text':
        var grow = p.type === 'text' ? U.easeBack(U.clamp(p.t / 0.18, 0, 1)) : 1;
        ctx.scale(grow, grow);
        CM.chalk.text(ctx, p.text, 0, 0, { size: s, color: p.color });
        break;
      case 'heart':
        var h = s;
        CM.chalk.line(ctx, [0, h * 0.9, -h, -0.05 * h, -h * 0.8, -h * 0.75, -h * 0.25, -h * 0.85, 0, -h * 0.35,
          h * 0.25, -h * 0.85, h * 0.8, -h * 0.75, h, -0.05 * h, 0, h * 0.9], { w: Math.max(1.6, h * 0.22), color: p.color, seed: seed, wob: 0.3 });
        break;
      case 'steam':
        var pts = [], L = s * 5;
        for (var q = 0; q <= 6; q++) pts.push(Math.sin(q * 1.1 + p.t * 5) * s * 0.7, -q / 6 * L);
        CM.chalk.line(ctx, pts, { w: Math.max(1.5, s * 0.35), color: p.color, seed: seed, wob: 0.2 });
        break;
      case 'bubble':
        CM.chalk.circle(ctx, 0, 0, s, { w: 1.6, color: p.color, seed: p.seed });
        break;
      case 'ring':
        var rr = U.lerp(p.r0, p.r1, U.easeOut(k));
        CM.chalk.circle(ctx, 0, 0, rr, { w: s, color: p.color, seed: seed });
        break;
      case 'line':
        // 中心から外へ飛ぶ集中線
        var d0 = p.d0 + (p.d1 - p.d0) * U.easeOut(k);
        CM.chalk.line(ctx, [Math.cos(p.ang) * d0, Math.sin(p.ang) * d0, Math.cos(p.ang) * (d0 + p.len), Math.sin(p.ang) * (d0 + p.len)],
          { w: s, color: p.color, seed: p.seed, wob: 0.2 });
        break;
      case 'crumb':
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 2, s, s * 0.8);
        break;
      case 'shard':
        // 折れたチョークのかけら（本物のチョーク）
        ctx.fillStyle = p.color;
        ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
        break;
    }
    ctx.restore();
  }
})(window);
