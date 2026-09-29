/*
 * CHALK MAN 第2章の演出（act）
 * 結果の文章と同じことが、画面の中で起きるようにする台本。書き方は acts.js と同じ。
 *   D.w＝書いた文字、D.man＝棒人間、D.sc＝黒板の様子（scenes-ch2.js）、D.gy＝地面の高さ、D.s＝棒人間の大きさ
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var A = CM.ACTS, K = CM.actKit;
  var onGround = K.onGround, topOf = K.topOf, exitX = K.exitX, pop = K.pop, pickUp = K.pickUp, mount = K.mount, throwTo = K.throwTo, cheer = K.cheer;
  function X(D, f) { return D.st.x + D.st.w * f; }

  /** 光のすじ（光る文字のまわり） */
  function rays(D, w, color) {
    var s = D.s;
    D.chalkHook(function (ctx, t) {
      if (w.alpha <= 0) return;
      var n = 12, r0 = w.dispW() * 0.55 + 8 * s, r1 = r0 + 16 * s;
      for (var i = 0; i < n; i++) {
        var a = i / n * TAU + t * 0.5, p = 0.8 + 0.2 * Math.sin(t * 5 + i);
        CM.chalk.line(ctx, [w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0 * 0.7, w.x + Math.cos(a) * r1 * p, w.y + Math.sin(a) * r1 * p * 0.7], { w: 2, color: color || COL.yellow, seed: i + Math.floor(t * 6), alpha: 0.8 });
      }
    });
  }
  /** 音符をふわっと出す */
  function note(D, x, y, k) {
    D.fx.add({ type: 'note', text: k % 2 ? '♪' : '♫', x: x, y: y, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.1, size: 16 * D.s + 4, color: COL.yellow });
  }
  /** 文字を縦に立てて、h の高さまでのばす（下のはしは gy） */
  function* standUp(D, x, gy, h, sec) {
    var w = D.w, baseW = w.width * w.scale, x0 = w.x, y0 = w.y;
    yield D.tween(0.45, function (k) { w.x = U.lerp(x0, x, k); w.y = U.lerp(y0, gy - baseW / 2, k); w.rot = -PI / 2 * k; });
    D.sfx.play('stretch');
    yield D.tween(sec || 0.9, function (k) { w.sx = U.lerp(1, Math.max(1, h / baseW), U.easeOut(k)); w.y = gy - baseW * w.sx / 2; });
  }

  // ============================================================
  //  空ルート
  // ============================================================

  /** はねる雲：次に着地したところで、跳ねるのを止める */
  function* stopBounce(D) {
    var sc = D.sc;
    if (!sc.bouncing) return;
    sc.stopAtLand = true;
    yield function () { return sc.stopped; };
  }

  // 7問目：のりで、足が雲にくっつく（決まった単語）
  A.glueStop = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale;
    var gs = Math.min(s0, (70 * s) / w.width);
    w.tint = COL.yellow;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x, k); w.scale = U.lerp(s0, gs, k); w.sy = U.lerp(1, 0.35, k); onGround(D, w, D.gy + 3 * s); });
    pop(D, 'sfx_nuri', w.x, D.gy - 30 * s, COL.yellow, 16);
    yield* stopBounce(D);
    D.sfx.play('flop');
    pop(D, 'sfx_pita', m.x + 30 * s, D.gy - 120 * s, COL.yellow, 20);
    m.play('puzzled');
    yield 0.6;
    var t = 0;
    D.follow(function (dt) { t += dt; if (t > 0.55) { t = 0; D.sfx.play('flop'); D.fx.word(D.T('sfx_beri'), m.x - 10 * s, D.gy - 20 * s, { size: 12 * s + 4, color: COL.yellow, life: 0.6 }); } });
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 50 * s });
  };

  // 重い文字をかかえて、ずしん（重い）
  A.weightStop = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x + 34 * s + w.dispW() / 2, k); onGround(D, w); });
    yield* stopBounce(D);
    D.held = 'front';
    D.sfx.play('thud'); D.fx.shake(8, 0.4);
    D.fx.dust(m.x, D.gy, 12, { angle: -PI / 2, spread: 2.6, speed: 70, g: 120 });
    pop(D, 'sfx_zushi', m.x + 30 * s, D.gy - 120 * s, COL.chalk, 22);
    yield 0.6;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 55 * s });
  };

  // やわらかい文字の上に、ぼふっ（柔らかい）
  A.softLand = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale;
    var fs = Math.min(s0 * 1.3, (90 * s) / w.width);
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x, k); w.scale = U.lerp(s0, fs, k); w.sy = U.lerp(1, 0.6, k); onGround(D, w); });
    sc.landY = topOf(w) + 1;
    yield* stopBounce(D);
    D.sfx.play('boing');
    pop(D, 'sfx_bofu', m.x + 30 * s, sc.landY - 110 * s, COL.chalk, 20);
    yield D.tween(0.4, function (k) { w.sy = 0.6 - 0.2 * Math.sin(k * PI); onGround(D, w); m.gy = topOf(w) + 1; });
    cheer(D);
    yield 0.8;
    yield D.hop(m, w.x + w.dispW() / 2 + 20 * s, D.gy, 16 * s, 0.35);
    yield D.walkTo(exitX(D));
  };

  // 長い文字を風見どりに引っかけて、つかまる（長い）
  A.grabHold = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, v = sc.vane;
    yield* stopBounce(D);
    var baseW = w.width * w.scale, hook = { x: v.x - 4 * s, y: v.y - 40 * s };
    var place = function () {
      var j = m.joints, hx = j ? j.handF[0] : m.x + 10 * s, hy = j ? j.handF[1] : D.gy - 70 * s;
      var dx = hook.x - hx, dy = hook.y - hy, len = Math.hypot(dx, dy);
      w.x = (hx + hook.x) / 2; w.y = (hy + hook.y) / 2; w.rot = Math.atan2(dy, dx); w.sx = Math.max(0.3, len / baseW);
    };
    var x0 = w.x, y0 = w.y;
    D.sfx.play('whoosh');
    yield D.tween(0.5, function (k) { place(); var tx = w.x, ty = w.y, r = w.rot, sx = w.sx; w.x = U.lerp(x0, tx, k); w.y = U.lerp(y0, ty, k); w.rot = r * k; w.sx = U.lerp(1, sx, k); });
    D.sfx.play('clink');
    pop(D, 'sfx_gyu', hook.x, hook.y - 30 * s, COL.chalk, 18);
    D.follow(place);
    m.play('push');
    var mx = m.x;
    yield D.tween(2.4, function (k) { m.x = U.lerp(mx, v.x - 50 * s, k); m.gy = D.gy - Math.sin(k * PI) * 6 * s; });
    D.clearFollow();
    m.gy = D.gy;
    yield D.hop(m, v.x - 10 * s, v.y, 30 * s, 0.5);
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 跳ねたいきおいで、飛ぶ文字に飛び乗る（飛ぶ）
  A.catchRide = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, y0 = w.y;
    D.sfx.play('fly');
    var ty = D.gy - sc.amp - 4 * s;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, m.x + 4 * s, k); w.y = U.lerp(y0, ty + w.dispH() / 2, k); });
    // いちばん高いところで、飛び乗る
    yield function () { var ph = (sc.bt % sc.period) / sc.period; return ph > 0.45 && ph < 0.6; };
    sc.bouncing = false;
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    pop(D, 'sfx_fuwa', m.x, topOf(w) - 70 * s, COL.chalk, 18);
    var wx = w.x, wy = w.y;
    yield D.tween(2.0, function (k) { w.x = U.lerp(wx, exitX(D) + 60 * s, U.easeIn(k)); w.y = wy - 30 * s * k + Math.sin(k * 10) * 3 * s; w.rot = Math.sin(k * 8) * 0.05; });
  };

  // 音楽に合わせて、跳ねながら踊って進む（音が出る・珍回答）
  A.bounceDance = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, t = 0, k = 0;
    sc.fixedAmp = true; sc.amp = 48 * s; sc.bounceAnim = 'cheer';
    D.follow(function (dt) {
      t += dt;
      if (t > 0.42) { t = 0; k++; D.sfx.play('note', k); D.fx.add({ type: 'note', text: k % 2 ? '♪' : '♫', x: w.x, y: w.y - 20 * s, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.1, size: 16 * s + 4, color: COL.yellow }); }
    });
    pop(D, 'sfx_boyon', m.x + 30 * s, D.gy - 120 * s, COL.yellow, 18);
    yield 1.4;
    var mx = m.x;
    yield D.tween(3.2, function (q) { m.x = U.lerp(mx, exitX(D) + 20 * s, q); });
  };

  // 8問目：大きな音で、鳥がちりぢりに（音が出る）
  A.scatterBirds = function* (D) {
    var w = D.w, s = D.s, sc = D.sc;
    sc.swoopOn = false;
    yield D.tween(0.3, function (k) { w.sx = w.sy = 1 + 0.3 * k; });
    D.sfx.play('boom');
    D.fx.shake(8, 0.4);
    for (var i = 0; i < 3; i++) D.fx.ring(w.x, w.y, 10 * s, D.st.w * (0.45 + i * 0.2), { life: 0.7 + i * 0.15, size: 2.4 });
    pop(D, 'sfx_boom', w.x, w.y - 40 * s, COL.yellow, 26);
    yield D.tween(0.3, function (k) { w.sx = w.sy = 1.3 - 0.3 * k; });
    sc.birds.forEach(function (b) {
      var a = Math.atan2(b.y - w.y, b.x - w.x) + (Math.random() - 0.5) * 0.6;
      b.mode = 'free'; b.angry = false; b.vx = Math.cos(a) * 320 * s; b.vy = Math.sin(a) * 320 * s - 80 * s;
      D.fx.word('!', b.x, b.y - 14 * s, { size: 14 * s + 4, color: COL.blue, life: 0.5 });
    });
    D.sfx.play('flop');
    yield 0.8;
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 食べられる文字をうしろへ投げると、鳥たちがそっちへ（食べられる）
  A.feedBirds = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    sc.swoopOn = false;
    yield* pickUp(D, 'front');
    m.f = -1;
    yield* throwTo(D, D.st.x + D.st.w * 0.06, 70 * s);
    m.f = 1;
    pop(D, 'cheep', w.x, w.y - 50 * s, COL.blue, 16);
    // 鳥たちが、文字のまわりに集まって、つつく
    var t = 0;
    sc.birds.forEach(function (b, i) { b.mode = 'peck'; b.i = i; b.angry = false; });
    D.follow(function (dt) {
      t += dt;
      sc.birds.forEach(function (b) {
        if (b.mode !== 'peck') return;
        var tx = w.x + (b.i - 3) * 12 * s, ty = D.gy - 12 * s - Math.abs(Math.sin(t * 9 + b.i)) * 6 * s - (b.i % 2) * 14 * s;
        var k = Math.min(1, t * 1.4 - b.i * 0.08);
        if (k <= 0) return;
        b.x = U.lerp(b.x, tx, Math.min(1, 0.08 + k * 0.2)); b.y = U.lerp(b.y, ty, Math.min(1, 0.08 + k * 0.2));
        b.face = w.x > b.x ? 1 : -1; b.flap = k < 1 ? 1 : 0.2;
      });
      if (t > 1 && Math.random() < dt * 5) { D.sfx.play('tiny'); if (w.bites.length < 4 && Math.random() < 0.3) w.bites.push({ x: w.width / 2 - w.bites.length * w.width / 4, y: (Math.random() - 0.5) * 20, r: 20 }); }
    });
    yield 1.0;
    yield D.walkTo(exitX(D));
  };

  // かたい文字を盾にして、鳥がコツン（硬い）
  A.shieldBirds = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    sc.swoopOn = false;
    yield* pickUp(D, 'front');
    m.play('hold');
    var list = sc.birds.slice(0, 4);
    for (var i = 0; i < list.length; i++) {
      var b = list[i], bx = b.x, by = b.y;
      b.mode = 'free'; b.vx = 0; b.vy = 0;
      yield D.tween(0.35, function (k) { b.x = U.lerp(bx, w.x + 14 * s, k * k); b.y = U.lerp(by, w.y, k * k); b.face = -1; });
      D.sfx.play('clink');
      D.fx.add({ type: 'star', x: w.x + w.dispW() / 2, y: w.y, life: 0.4, size: 7 * s, color: COL.yellow });
      pop(D, 'sfx_konn', w.x + 20 * s, w.y - 40 * s, COL.chalk, 16);
      b.dizzy = true; b.angry = false; b.vx = 120 * s; b.vy = -160 * s;
      yield 0.15;
    }
    sc.birds.forEach(function (b) { if (b.mode === 'flock') { b.mode = 'free'; b.angry = false; b.vx = 200 * s; b.vy = -140 * s; } });
    D.sfx.play('flop');
    yield 0.5;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s });
  };

  // 鳥の文字がリーダーになって、群れを連れていく（鳥・珍回答）
  A.birdLeader = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, y0 = w.y;
    sc.swoopOn = false;
    var t = 0;
    D.follow(function (dt) { t += dt; for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 12 + i) * 6; });
    D.sfx.play('fly');
    var lx = D.st.x + D.st.w * 0.55, ly = D.st.y + D.st.h * 0.3;
    yield D.tween(0.9, function (k) { w.x = U.lerp(x0, lx, U.easeInOut(k)); w.y = U.lerp(y0, ly, U.easeInOut(k)); });
    pop(D, 'leaderSay', w.x, w.y - 40 * s, COL.chalk, 18);
    // 群れが V の字に並ぶ
    sc.birds.forEach(function (b, i) { b.mode = 'free'; b.angry = false; b.vx = 0; b.vy = 0; b.i = i; b.sx0 = b.x; b.sy0 = b.y; });
    yield D.tween(0.8, function (k) {
      sc.birds.forEach(function (b) {
        var row = Math.floor(b.i / 2) + 1, side = b.i % 2 ? 1 : -1;
        b.x = U.lerp(b.sx0, w.x - row * 26 * s, k); b.y = U.lerp(b.sy0, w.y + side * row * 16 * s, k); b.face = 1;
      });
    });
    m.play('puzzled');
    D.sfx.play('cheer');
    var wx = w.x, wy = w.y;
    yield D.tween(1.4, function (k) {
      var dx = (exitX(D) + 200 * s - wx) * U.easeIn(k), dy = -60 * s * k;
      w.x = wx + dx; w.y = wy + dy;
      sc.birds.forEach(function (b) { var row = Math.floor(b.i / 2) + 1, side = b.i % 2 ? 1 : -1; b.x = w.x - row * 26 * s; b.y = w.y + side * row * 16 * s; });
    });
    yield 0.3;
    yield D.walkTo(exitX(D));
  };

  // 9問目：長い文字を立てると、雷がそっちに落ちる（長い）
  A.lightningRod = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, rx = X(D, 0.56);
    yield* standUp(D, rx, D.gy, 120 * s);
    sc.rod = { x: rx, y: topOf2(w) };
    sc.boltT = 0.2;
    var hit = 0;
    sc.onStrike = function () { hit = 0.25; pop(D, 'sfx_bari', rx + 30 * s, sc.rod.y + 10 * s, COL.yellow, 18); };
    D.follow(function (dt) { hit -= dt; w.tint = hit > 0 ? COL.yellow : null; });
    yield 1.4;
    yield D.walkTo(exitX(D));
  };
  /** 縦に立てた文字のてっぺん */
  function topOf2(w) { return w.y - w.dispW() / 2; }

  // 建物の中で、雷がやむまで待つ（建物）
  A.hideIn = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale, bx = X(D, 0.5);
    var big = Math.min(s0 * 1.9, (D.st.w * 0.4) / w.width);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, bx, k); w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w); });
    D.sfx.play('thud'); D.fx.shake(5, 0.3);
    yield D.walkTo(bx - 8 * s, { anim: 'walk' });
    yield D.tween(0.3, function (k) { m.alpha = 1 - k; });
    sc.rod = { x: bx, y: topOf(w) };
    sc.boltT = 0.3;
    sc.onStrike = function () { w.shine = 0; };
    D.follow(function (dt) { if (w.shine >= 0) { w.shine += dt * 3; if (w.shine > 1) w.shine = -1; } });
    yield 1.8;
    // 雷雲が行ってしまう
    sc.storm = 0; sc.rod = null;
    pop(D, 'sfx_gorogoro', sc.cloud.x, sc.cloud.y - 40 * s, COL.chalk, 16);
    var cx = sc.cloud.x;
    yield D.tween(1.2, function (k) { sc.cloud.x = U.lerp(cx, exitX(D) + sc.cloud.w, U.easeIn(k)); sc.cloud.alpha = 1 - k * 0.5; });
    yield D.tween(0.3, function (k) { m.alpha = k; });
    m.x = bx + w.dispW() / 2 + 6 * s;
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 雷雲が飲み物をごくごく飲んで、寝てしまう（飲み物・珍回答）
  A.cloudDrink = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, c = sc.cloud, x0 = w.x, y0 = w.y, s0 = w.scale;
    D.sfx.play('fly');
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, c.x, U.easeInOut(k)); w.y = U.lerp(y0, c.y + 20 * s, U.easeInOut(k)) - Math.sin(k * PI) * 30 * s; });
    sc.storm = 0;
    pop(D, 'sfx_gokugoku', c.x, c.y - 50 * s, COL.blue, 20);
    for (var i = 0; i < 3; i++) {
      D.sfx.play('gulp');
      yield D.tween(0.35, function (k) { w.scale = s0 * (1 - (i + k) / 3); c.sw = 1 + 0.08 * (i + k); });
    }
    w.alpha = 0;
    c.face = 'sleep';
    D.sfx.play('yawn');
    yield 1.0;
    m.play('puzzled');
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 10問目：重い文字を風よけにして、押して進む（重い）
  A.pushHeavy = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    yield D.tween(0.35, function (k) { w.x = U.lerp(x0, m.x + 30 * s + w.dispW() / 2, k); onGround(D, w, D.gy - 30 * s * Math.sin(k * PI)); });
    D.sfx.play('thud'); D.fx.shake(7, 0.3);
    D.fx.dust(w.x, D.gy, 12, { angle: -PI / 2, spread: 2.4, speed: 70, g: 120 });
    D.follow(function () { sc.blockX = { x0: m.x - 40 * s, x1: w.x + w.dispW() / 2, y: topOf(w) }; });
    yield 0.3;
    m.play('push');
    pop(D, 'sfx_zuri', w.x, topOf(w) - 30 * s, COL.chalk, 18);
    var wx = w.x, dist = exitX(D) + w.dispW() - wx;
    yield D.tween(3.4, function (k) {
      w.x = wx + dist * k;
      m.x = w.x - w.dispW() / 2 - 18 * s;
      if (Math.random() < 0.15) D.fx.dust(w.x - w.dispW() / 2, D.gy, 1, { angle: PI + 0.3, spread: 0.6, speed: 40, g: 80 });
    });
  };

  // 長い文字を向こうまでのばして、つかまりながら進む（長い）
  A.ropePull = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, y0 = w.y;
    var baseW = w.width * w.scale, hx = m.x + 18 * s, hy = D.gy - 62 * s, len = exitX(D) + 40 * s - hx;
    yield D.tween(0.4, function (k) { w.x = U.lerp(x0, hx + baseW / 2, k); w.y = U.lerp(y0, hy, k); });
    D.sfx.play('stretch');
    pop(D, 'sfx_stretch', X(D, 0.6), hy - 30 * s, COL.chalk, 20);
    yield D.tween(0.8, function (k) { w.sx = U.lerp(1, len / baseW, U.easeOut(k)); w.x = hx + baseW * w.sx / 2; });
    m.play('push');
    var mx = m.x;
    yield D.tween(3.0, function (k) { m.x = U.lerp(mx, exitX(D) + 20 * s, k); });
  };

  // 天気の文字と風がけんか。そのすきに通る（天気・珍回答）
  A.windFight = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, f = sc.face, x0 = w.x, y0 = w.y;
    var fx = f.x - f.r * 1.2, fy = f.y + f.r * 0.3;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, fx, U.easeIn(k)); w.y = U.lerp(y0, fy, k) - Math.sin(k * PI) * 30 * s; });
    // ドタバタ（けむりの玉）
    var cx = (fx + f.x) / 2, cy = fy, fighting = true;
    w.alpha = 0.6;
    D.chalkHook(function (ctx, t) {
      if (!fighting) return;
      var r = U.rng(Math.floor(t * 10)), pts = [];
      for (var i = 0; i <= 18; i++) { var a = i / 18 * TAU, rr = (34 + r() * 12) * s; pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7); }
      CM.chalk.line(ctx, pts, { w: 2.4, seed: Math.floor(t * 10), alpha: 0.8 });
      for (i = 0; i < 4; i++) { var a2 = r() * TAU; CM.chalk.line(ctx, [cx + Math.cos(a2) * 30 * s, cy + Math.sin(a2) * 20 * s, cx + Math.cos(a2) * 48 * s, cy + Math.sin(a2) * 32 * s], { w: 1.8, seed: i + Math.floor(t * 10), alpha: 0.7 }); }
    });
    D.follow(function () { w.x = cx + (Math.random() - 0.5) * 16 * s; w.y = cy + (Math.random() - 0.5) * 12 * s; w.rot = (Math.random() - 0.5) * 0.6; });
    sc.wind = 0.15; f.blow = 0;
    D.sfx.play('rattle');
    pop(D, 'sfx_dotabata', cx, cy - 50 * s, COL.chalk, 20);
    m.play('sneak');
    yield 0.4;
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 52 * s });
    fighting = false;
  };

  // 11問目：食べ物をわたすと、門番がニコニコ（食べ物）
  A.gift = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, g = sc.guard, x0 = w.x;
    sc.guardQuiet = true;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, g.x - 30 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 12 * s; });
    g.play('hold');
    var hold = D.follow(function () { var j = g.joints; if (!j) return; w.scale = Math.min(w.scale, (40 * s) / w.width); w.x = j.handF[0] - 8 * s; w.y = j.handF[1] - 4 * s; });
    D.sfx.play('cute');
    pop(D, 'sfx_nikoniko', g.x, D.gy - 170 * s, COL.pink, 18);
    for (var i = 0; i < 4; i++) D.fx.add({ type: 'heart', x: g.x + (Math.random() - 0.5) * 30 * s, y: D.gy - 150 * s, vy: -40, vx: (Math.random() - 0.5) * 30, life: 1.1, size: 6 * s, color: COL.pink });
    yield 0.8;
    // 門を開けて、わきによける
    D.sfx.play('stretch');
    pop(D, 'sfx_gigii', sc.castle.gx, D.gy - 100 * s, COL.orange, 18);
    yield D.tween(0.9, function (k) { sc.castle.gate = k; });
    // 門番は門の向こうがわへよけて、どうぞ
    yield D.walkTo(sc.castle.gx + sc.castle.gw * 0.5 + 30 * s, { actor: g, anim: 'run' });
    g.f = -1; g.play('hold');
    yield* intoGate(D);
  };
  /** 棒人間が門の中へ入っていく */
  function* intoGate(D) {
    var m = D.man, gx = D.sc.castle.gx;
    yield D.walkTo(gx, { anim: 'walk', speed: 72 * D.s });
    yield D.tween(0.5, function (k) { m.alpha = 1 - k; });
  }

  // 呪文で、門がひとりでに開く（魔法）
  A.openSesame = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, g = sc.guard, y0 = w.y;
    sc.guardQuiet = true;
    w.tint = COL.purple;
    D.sfx.play('sparkle');
    yield D.tween(0.6, function (k) { w.y = y0 - 30 * s * U.easeOut(k); });
    pop(D, 'sfx_kirakira', w.x, w.y - 40 * s, COL.purple, 20);
    for (var i = 0; i < 10; i++) D.fx.add({ type: 'star', x: sc.castle.gx + (Math.random() - 0.5) * 60 * s, y: D.gy - Math.random() * 80 * s, life: 0.8, size: 5 * s, color: COL.purple });
    yield 0.4;
    D.sfx.play('stretch');
    pop(D, 'sfx_gigii', sc.castle.gx, D.gy - 100 * s, COL.orange, 18);
    yield D.tween(1.0, function (k) { sc.castle.gate = k; });
    g.play('puzzled');
    D.fx.word('!?', g.x, D.gy - 160 * s, { size: 20 * s + 4, color: COL.blue, life: 1 });
    yield 0.6;
    yield* intoGate(D);
  };

  // 門番が動物にメロメロ。そのすきに通る（動物・珍回答）
  A.guardPet = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, g = sc.guard, x0 = w.x;
    sc.guardQuiet = true;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, g.x - 34 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 10 * s; });
    g.play('hold');
    g.spear.x = g.x + 26 * s;   // やりを置いて
    var t = 0;
    D.follow(function (dt) {
      t += dt; var j = g.joints; if (!j) return;
      w.scale = Math.min(w.scale, (44 * s) / w.width);
      w.x = j.handF[0] - 6 * s; w.y = j.handF[1] - 2 * s + Math.sin(t * 8) * 2 * s; w.rot = Math.sin(t * 4) * 0.1;
      if (Math.random() < dt * 3) D.fx.add({ type: 'heart', x: g.x + (Math.random() - 0.5) * 30 * s, y: D.gy - 150 * s, vy: -40, vx: (Math.random() - 0.5) * 30, life: 1.1, size: 6 * s, color: COL.pink });
    });
    D.sfx.play('cute');
    pop(D, 'sfx_mero', g.x, D.gy - 175 * s, COL.pink, 18);
    // 門番は門からはなれて、しゃがみこむ
    yield D.walkTo(g.x - 70 * s, { actor: g, anim: 'walk', speed: 70 * s });
    g.f = 1; g.play('hold');
    yield 0.4;
    // しのび足で門へ。門を自分で押して開ける
    yield D.walkTo(sc.castle.gx - 30 * s, { anim: 'sneak', speed: 50 * s });
    m.play('push');
    D.sfx.play('stretch');
    yield D.tween(0.9, function (k) { sc.castle.gate = k; });
    yield* intoGate(D);
  };

  /** 夜の分かれ道：上の道を歩いていく */
  function* walkUpPath(D) {
    var m = D.man, s = D.s, sc = D.sc;
    yield D.walkTo(sc.forkX, { anim: 'walk', speed: 72 * s });
    m.play('walk');
    var x0 = m.x, x1 = exitX(D) + 20 * s;
    yield D.tween((x1 - x0) / (72 * s), function (k) { m.x = U.lerp(x0, x1, k); m.gy = CM.SCENES.nightFork.pathY(sc, D, 'up', m.x); });
  }
  function showArrow(D) { return D.tween(0.6, function (k) { D.sc.arrow = k; }); }

  // 12問目：コンパス・地図で調べる（決まった単語）
  A.readMap = function* (D) {
    var s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    m.play('hold');
    pop(D, 'q', m.x + 20 * s, D.gy - 130 * s, COL.chalk, 16);
    yield 0.8;
    pop(D, 'upPath', m.x + 20 * s, D.gy - 140 * s, COL.yellow, 18);
    D.sfx.play('sparkle');
    yield showArrow(D);
    yield* walkUpPath(D);
  };

  // 光る文字で、道しるべを照らす（光る）
  A.lightSign = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y;
    w.tint = COL.yellow;
    var Lt = { x: w.x, y: w.y, r: 20 * s };
    sc.lights.push(Lt);
    D.follow(function () { Lt.x = w.x; Lt.y = w.y; });
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, sc.forkX - 60 * s, k); w.y = U.lerp(y0, D.gy - 130 * s, k); Lt.r = U.lerp(20 * s, 120 * s, k); });
    D.sfx.play('glow');
    sc.signLit = true;
    pop(D, 'sfx_pika', w.x, w.y - 30 * s, COL.yellow, 20);
    yield 0.8;
    yield showArrow(D);
    yield* walkUpPath(D);
  };

  // 宇宙の文字が夜空で光って、方角を教える（宇宙）
  A.northStar = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y;
    w.tint = COL.yellow;
    D.sfx.play('fly');
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, X(D, 0.86), U.easeInOut(k)); w.y = U.lerp(y0, D.st.y + D.st.h * 0.2, U.easeInOut(k)); });
    D.sfx.play('glow');
    rays(D, w);
    sc.lights.push({ x: w.x, y: w.y, r: 70 * s });
    pop(D, 'upPath', w.x - 40 * s, w.y + 40 * s, COL.yellow, 18);
    yield showArrow(D);
    yield* walkUpPath(D);
  };

  // 鳥の文字が、上の道へ案内する（鳥）
  A.birdGuide = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, y0 = w.y, t = 0;
    var s0 = w.scale, sm = Math.min(s0, (44 * s) / w.width);
    D.sfx.play('fly');
    yield D.tween(0.6, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, m.x + 60 * s, k); w.y = U.lerp(y0, D.gy - 90 * s, k); });
    pop(D, 'thisWay', w.x, w.y - 30 * s, COL.blue, 16);
    D.follow(function (dt) {
      t += dt;
      var tx = m.x + 70 * s;
      w.x = tx; w.y = CM.SCENES.nightFork.pathY(sc, D, 'up', tx) - 90 * s + Math.sin(t * 6) * 6 * s;
      for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 14 + i) * 5;
    });
    yield* walkUpPath(D);
  };

  // 大声を出すと、上の道からだけ、やまびこ（音が出る・珍回答）
  A.echoPath = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    D.sfx.play('boom');
    for (var i = 0; i < 3; i++) D.fx.ring(w.x, w.y, 10 * s, D.st.w * (0.4 + i * 0.2), { life: 0.7 + i * 0.15, size: 2.4 });
    yield 1.0;
    var ex = X(D, 0.92);
    D.fx.word('…', ex, CM.SCENES.nightFork.pathY(sc, D, 'mid', ex) - 40 * s, { size: 18 * s + 4, life: 1.2 });
    D.fx.word('…', ex, CM.SCENES.nightFork.pathY(sc, D, 'low', ex) - 30 * s, { size: 18 * s + 4, life: 1.2 });
    yield 0.4;
    D.sfx.play('note', 3);
    D.fx.word(w.text + '〜', ex - 20 * s, CM.SCENES.nightFork.pathY(sc, D, 'up', ex) - 40 * s, { size: 16 * s + 4, color: COL.yellow, life: 1.6, vy: -10 });
    yield 0.8;
    m.play('cheer');
    pop(D, 'thisWay', m.x, D.gy - 130 * s, COL.chalk, 16);
    yield 0.6;
    yield showArrow(D);
    yield* walkUpPath(D);
  };

  // 13問目：流れ星から、やわらかい文字の上へ飛びおりる（柔らかい）
  /** 流れ星が、びゅーんと飛んでいってしまう */
  function starAway(D, sec) {
    var st = D.sc.star, x0 = st.x, y0 = st.y;
    return D.tween(sec || 0.9, function (k) { st.x = U.lerp(x0, exitX(D) + 120 * D.s, U.easeIn(k)); st.y = y0 - 30 * D.s * k; });
  }
  A.starCushion = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, fl = sc.floorY, x0 = w.x, y0 = w.y, st = sc.star;
    var tx = st.x + 30 * s;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, tx, k); w.y = U.lerp(y0, fl - w.dispH() / 2 - 2, k * k); });
    D.sfx.play('thud');
    pop(D, 'sfx_fuwa', w.x, topOf(w) - 20 * s, COL.chalk, 16);
    yield 0.3;
    sc.riding = false;
    D.follow(starAway(D, 1.0));
    yield D.hop(m, w.x, topOf(w) + 1, 20 * s, 0.6);
    // ぼよーん
    D.sfx.play('boing');
    pop(D, 'sfx_poyon', w.x + 30 * s, topOf(w) - 60 * s, COL.pink, 20);
    yield D.tween(0.25, function (k) { w.sy = 1 - 0.4 * Math.sin(k * PI); onGround(D, w, fl); m.gy = topOf(w) + 1; });
    D.gy = fl;
    yield D.hop(m, w.x + w.dispW() / 2 + 24 * s, fl, 40 * s, 0.6);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 飛ぶ文字に乗りかえて、ゆっくり降りる（飛ぶ）
  A.starHop = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, fl = sc.floorY, st = sc.star, x0 = w.x, y0 = w.y;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, st.x + 50 * s, k); w.y = U.lerp(y0, st.y + 10 * s, k); });
    sc.riding = false;
    yield* mount(D);
    D.follow(starAway(D, 1.0));
    pop(D, 'sfx_fuwa', w.x, topOf(w) - 60 * s, COL.chalk, 18);
    var wx = w.x, wy = w.y, tx = X(D, 0.62), ty = fl - w.dispH() / 2 - 2;
    yield D.tween(2.0, function (k) { w.x = U.lerp(wx, tx, U.easeInOut(k)); w.y = U.lerp(wy, ty, U.easeInOut(k)) + Math.sin(k * 8) * 3 * s; w.rot = Math.sin(k * 8) * 0.05; });
    D.clearFollow();
    D.gy = fl;
    yield D.hop(m, w.x + w.dispW() / 2 + 20 * s, fl, 22 * s, 0.45);
    cheer(D);
    yield 0.7;
    yield D.walkTo(exitX(D));
  };

  // 長い文字をたらして、するする降りる（長い）
  A.starRope = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, fl = sc.floorY, st = sc.star;
    var rx = st.x + 20 * s, top = st.y + st.r * 0.3, len = fl - top;
    var baseW = w.width * w.scale, x0 = w.x, y0 = w.y;
    yield D.tween(0.45, function (k) { w.x = U.lerp(x0, rx, k); w.y = U.lerp(y0, top + baseW / 2, k); w.rot = PI / 2 * k; });
    D.sfx.play('stretch');
    pop(D, 'sfx_stretch', rx + 40 * s, top + 40 * s, COL.chalk, 18);
    yield D.tween(0.8, function (k) { w.sx = U.lerp(1, len / baseW, U.easeOut(k)); w.y = top + baseW * w.sx / 2; });
    sc.riding = false;
    m.x = rx - 12 * s; m.play('cling');
    D.sfx.play('climb');
    var g0 = m.gy;
    yield D.tween(1.4, function (k) { m.gy = U.lerp(g0, fl, U.easeIn(k)); });
    m.play('idle'); D.gy = fl;
    // 流れ星は飛んでいき、文字は下にぱたん
    D.follow(starAway(D, 0.9));
    var wy = w.y, r0 = w.rot, wx = w.x;
    yield D.tween(0.6, function (k) { w.rot = U.lerp(r0, 0, k); w.x = U.lerp(wx, wx + w.dispW() * 0.4, k); w.y = U.lerp(wy, fl - w.dispH() / 2 - 2, k); });
    D.sfx.play('thud');
    cheer(D);
    yield 0.7;
    yield D.walkTo(exitX(D));
  };

  // 流れ星にお願いすると、にっこり止まって送ってくれる（気持ち・珍回答）
  A.starWish = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, fl = sc.floorY, st = sc.star, y0 = w.y;
    w.tint = COL.pink;
    D.sfx.play('sparkle');
    yield D.tween(0.8, function (k) { w.y = y0 - 30 * s * U.easeOut(k); });
    for (var i = 0; i < 6; i++) D.fx.add({ type: i % 2 ? 'heart' : 'star', x: w.x + (Math.random() - 0.5) * 40 * s, y: w.y, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.2, size: 6 * s, color: i % 2 ? COL.pink : COL.yellow });
    pop(D, 'sfx_kirakira', w.x, w.y - 40 * s, COL.pink, 18);
    yield 0.5;
    st.face = 'smile';
    D.sfx.play('cute');
    yield D.tween(1.0, function (k) { sc.speed = 1 - k; st.shake = 1 - k; });
    // そっと下まで
    var sy = st.y;
    yield D.tween(1.6, function (k) { st.y = U.lerp(sy, fl - st.r * 0.85, U.easeInOut(k)); w.alpha = 1 - k; });
    sc.riding = false; D.gy = fl;
    yield D.hop(m, st.x + st.r + 30 * s, fl, 24 * s, 0.45);
    pop(D, 'starBye', st.x, st.y - 60 * s, COL.yellow, 18);
    m.f = -1; m.play('cheer');
    var sx = st.x, sy2 = st.y;
    yield D.tween(1.2, function (k) { st.y = U.lerp(sy2, D.st.y - 80 * s, U.easeIn(k)); st.x = sx - 40 * s * k; });
    m.f = 1;
    yield D.walkTo(exitX(D));
  };

  // ============================================================
  //  地下ルート
  // ============================================================

  // 7問目：まぶしい文字で、モグラが穴にもぐる（光る）
  A.glareMole = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y;
    sc.quiet = true;
    w.tint = COL.yellow;
    yield D.tween(0.7, function (k) { w.x = U.lerp(x0, X(D, 0.42), k); w.y = U.lerp(y0, D.gy - 100 * s, U.easeOut(k)); });
    D.sfx.play('glow');
    rays(D, w);
    pop(D, 'sfx_pika', w.x, w.y - 40 * s, COL.yellow, 24);
    sc.moles.forEach(function (m) { m.mode = 'cover'; });
    yield 0.6;
    pop(D, 'tooBright', X(D, 0.7), D.gy - 90 * s, COL.chalk, 18);
    yield 0.6;
    for (var i = 0; i < sc.moles.length; i++) { sc.moles[i].mode = 'down'; D.sfx.play('pop'); yield 0.2; }
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // かたい文字でモグラたたき（硬い）
  A.whackMole = function* (D) {
    var s = D.s, sc = D.sc, m = D.man;
    sc.quiet = true;
    // モグラはいったん全部もぐって、1ぴきずつ、ちがう穴から顔を出す（モグラたたき）
    sc.moles.forEach(function (ml) { ml.mode = 'down'; });
    yield* pickUp(D, 'swing');
    pop(D, 'whackGo', m.x, D.gy - 130 * s, COL.yellow, 18);
    var order = [1, 0, 2];
    for (var i = 0; i < order.length; i++) {
      var ml = sc.moles[order[i]];
      yield 0.25;
      ml.mode = 'up';
      D.sfx.play('pop');
      D.fx.word('!', ml.hx, D.gy - 70 * s, { size: 14 * s + 4, color: COL.orange, life: 0.4 });
      m.f = ml.hx >= m.x ? 1 : -1;
      yield D.walkTo(ml.hx - m.f * 44 * s, { anim: 'run', speed: 150 * s });
      m.f = ml.hx >= m.x ? 1 : -1;
      m.play('swing');
      yield 0.64;   // ふりかぶって（0.5秒）→ ふりおろしたところで、ポコッ
      D.sfx.play('boing');
      D.fx.shake(4, 0.15);
      pop(D, 'sfx_poko', ml.hx, D.gy - 70 * s, COL.chalk, 18);
      D.fx.add({ type: 'star', x: ml.hx, y: D.gy - 40 * s, life: 0.4, size: 8 * s, color: COL.yellow });
      ml.mode = 'dizzy';
      yield 0.3;
      m.play('idle');
    }
    m.f = 1;
    yield 0.3;
    yield D.walkTo(exitX(D));
  };

  // ころがすと、モグラたちが取り合い（食べられる）
  A.moleFeed = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x;
    sc.quiet = true;
    var mid = sc.moles[1];
    yield D.tween(0.9, function (k) { w.x = U.lerp(x0, mid.hx, k); onGround(D, w); w.rot = k * TAU; });
    w.rot = 0;
    sc.moles.forEach(function (m) { m.mode = 'happy'; });
    D.sfx.play('cute');
    // 取り合い（文字が、モグラの間を行ったり来たり）
    var t = 0, order = [0, 2, 1, 0, 2];
    D.follow(function (dt) {
      t += dt;
      var i = Math.floor(t / 0.45) % order.length, k = (t % 0.45) / 0.45, a = sc.moles[order[i]], b = sc.moles[order[(i + 1) % order.length]];
      w.x = U.lerp(a.hx, b.hx, k); onGround(D, w, D.gy - 30 * s); w.y -= Math.sin(k * PI) * 26 * s;
      if (k < 0.05) { D.fx.word(D.T('mine'), a.hx, D.gy - 80 * s, { size: 12 * s + 4, color: COL.orange, life: 0.6 }); D.sfx.play('tiny'); }
    });
    yield 1.0;
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 60 * s });
  };

  // 虫を見たモグラたちが、追いかけていく（虫・珍回答）
  A.moleChase = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    sc.quiet = true;
    sc.moles.forEach(function (ml) { ml.mode = 'happy'; });
    pop(D, 'moleDinner', X(D, 0.68), D.gy - 90 * s, COL.orange, 18);
    D.sfx.play('cute');
    yield 0.7;
    // 虫の文字はにげる。モグラは土の中をもこもこ追いかける
    sc.moles.forEach(function (ml) { ml.mode = 'gone'; });
    var humps = sc.moles.map(function (ml, i) { return { x: ml.hx, d: i }; });
    D.chalkHook(function (ctx, t) {
      humps.forEach(function (h, i) {
        if (h.x < D.st.x - 40) return;
        var pts = [];
        for (var q = 0; q <= 8; q++) { var a = PI + q / 8 * PI; pts.push(h.x + Math.cos(a) * 18 * s, D.gy + Math.sin(a) * 10 * s); }
        CM.chalk.line(ctx, pts, { w: 2.2, color: '#d2ae88', seed: i + Math.floor(t * 8) });
      });
    });
    m.play('puzzled');
    var t = 0;
    D.follow(function (dt) {
      t += dt;
      w.x = x0 - 200 * s * t; onGround(D, w); w.y -= Math.abs(Math.sin(t * 20)) * 5 * s;
      humps.forEach(function (h, i) {
        if (t > 0.2 + i * 0.15) h.x -= 190 * s * dt;
        if (Math.random() < dt * 8) D.fx.dust(h.x, D.gy - 6 * s, 1, { angle: -PI / 2, spread: 1.4, speed: 60, g: 300, color: '#d2ae88' });
      });
    });
    D.sfx.play('rattle');
    yield 1.6;
    yield D.walkTo(exitX(D));
  };

  // 8問目：泳ぐ文字につかまって、浮かんで進む（泳ぐ）
  A.floatAway = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    var sy = function () { return CM.SCENES.flood.surfaceY(sc, D); };
    D.sfx.play('splash');
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x + 34 * s, k); w.y = U.lerp(w.y, sy() - w.dispH() * 0.25, k); });
    yield D.hop(m, w.x - 4 * s, topOf(w) + 24 * s, 20 * s, 0.4);
    m.play('ride');
    D.follow(function () { w.y = sy() - w.dispH() * 0.25 + Math.sin(D.time * 4) * 2 * s; w.rot = Math.sin(D.time * 3) * 0.06; m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    pop(D, 'sfx_puka', w.x, topOf(w) - 70 * s, COL.blue, 18);
    var wx = w.x;
    yield D.tween(2.6, function (k) { w.x = U.lerp(wx, exitX(D) + 40 * s, k); });
  };

  // 冷たい文字で、水がこおる（冷たい）
  A.freezeFlood = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, y0 = w.y;
    w.tint = COL.ice;
    var sy = CM.SCENES.flood.surfaceY(sc, D);
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, X(D, 0.5), k); w.y = U.lerp(y0, sy - w.dispH() * 0.2, k) - Math.sin(k * PI) * 30 * s; });
    D.sfx.play('freeze');
    pop(D, 'sfx_kachi', w.x, sy - 60 * s, COL.ice, 22);
    for (var i = 0; i < 14; i++) D.fx.add({ type: 'frost', x: D.st.x + Math.random() * D.st.w, y: sy - Math.random() * 10 * s, vy: -10, vr: 2, life: 1.2, size: 5 * s, color: COL.ice });
    sc.rise = 0;
    yield D.tween(0.8, function (k) { sc.frozen = k; });
    yield D.hop(m, m.x + 10 * s, sy, 14 * s, 0.35);
    pop(D, 'sfx_tsuru', m.x + 40 * s, sy - 110 * s, COL.ice, 18);
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * s });
  };

  // 熱い文字で、水が湯気になる（熱い）
  A.boilAway = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y;
    w.tint = COL.red;
    D.sfx.play('fire');
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, X(D, 0.5), k); w.y = U.lerp(y0, D.gy - 70 * s, k); });
    pop(D, 'sfx_shuwa', w.x, w.y - 50 * s, COL.chalk, 20);
    D.sfx.play('swirl');
    sc.rise = 0;
    var l0 = sc.level;
    yield D.tween(2.0, function (k) {
      sc.level = l0 * (1 - k); sc.leak = 1 - k;
      if (Math.random() < 0.6) D.fx.add({ type: 'steam', x: D.st.x + Math.random() * D.st.w, y: D.gy - sc.level, vy: -40, life: 1.0, size: 2.4 * s, color: COL.chalk });
    });
    w.tint = null;
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 大きな文字で、天井のひびをふさぐ（大きい）
  A.plugLeak = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y, s0 = w.scale;
    var big = Math.min(s0 * 1.6, (D.st.w * 0.3) / w.width);
    D.sfx.play('grow');
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, big, k); w.x = U.lerp(x0, sc.leakX, k); w.y = U.lerp(y0, sc.topY + w.dispH() / 2 + 2, U.easeOut(k)); });
    D.sfx.play('thud'); D.fx.shake(5, 0.3);
    pop(D, 'sfx_kyu', sc.leakX + 40 * s, sc.topY + 60 * s, COL.chalk, 20);
    sc.rise = 0;
    yield D.tween(0.5, function (k) { sc.leak = 1 - k; });
    var l0 = sc.level;
    D.sfx.play('swirl');
    yield D.tween(1.4, function (k) { sc.level = l0 * (1 - k); });
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 人がバケツで水をくみ出す。3時間後…（人・珍回答）
  A.bailFlood = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, X(D, 0.5), k); onGround(D, w); });
    pop(D, 'sfx_zabaa', w.x, D.gy - 70 * s, COL.blue, 18);
    sc.rise = 0;
    for (var i = 0; i < 5; i++) {
      yield D.tween(0.22, function (k) { w.rot = -0.5 * k; });
      D.sfx.play('splash');
      D.fx.dust(w.x - w.dispW() / 2, D.gy - 20 * s, 10, { angle: -PI / 2 - 0.9, spread: 0.6, speed: 160, g: 400, color: COL.blue, size: 2 });
      yield D.tween(0.22, function (k) { w.rot = -0.5 * (1 - k); });
      sc.level *= 0.9;
    }
    var st = D.st, l0 = sc.level;
    D.fx.word(D.T('threeHours'), st.x + st.w / 2, st.y + st.h * 0.4, { size: 24 * s + 6, color: COL.chalk, life: 1.6, vy: 0, rot: 0 });
    yield D.tween(1.4, function (k) { sc.level = l0 * (1 - k); sc.leak = 1 - k; });
    m.play('puzzled');
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 植物が水を吸って、ぐんぐん育つ（植物・珍回答）
  A.soakUp = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, sx = X(D, 0.5), top = D.gy;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, sx, k); onGround(D, w); });
    D.chalkHook(function (ctx) {
      if (top >= D.gy - 2) return;
      var pts = [];
      for (var q = 0; q <= 10; q++) pts.push(sx + Math.sin(q * 1.3 + D.time * 2) * 4 * s, U.lerp(D.gy, top, q / 10));
      CM.chalk.line(ctx, pts, { w: 3, color: COL.green, seed: 3 });
      for (q = 1; q < 10; q += 2) { var ly = U.lerp(D.gy, top, q / 10), d = q % 4 === 1 ? 1 : -1; CM.chalk.line(ctx, [sx, ly, sx + d * 14 * s, ly - 8 * s, sx + d * 4 * s, ly - 2 * s], { w: 2, color: COL.green, seed: 10 + q }); }
    });
    pop(D, 'sfx_gokugoku', sx, D.gy - 60 * s, COL.green, 20);
    D.sfx.play('grow');
    sc.rise = 0;
    var l0 = sc.level;
    yield D.tween(2.0, function (k) { sc.level = l0 * (1 - k); sc.leak = 1 - k * 0.8; top = D.gy - 150 * s * k; onGround(D, w, top); w.scale *= 1.004; });
    D.man.play('puzzled');
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 9問目：やわらかい文字を足の下にしいて、音を立てずに（柔らかい）
  A.tiptoe = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, s0 = w.scale;
    var fs = Math.min(s0, (56 * s) / w.width);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, m.x, k); w.scale = U.lerp(s0, fs, k); w.sy = U.lerp(1, 0.5, k); onGround(D, w); });
    D.sfx.play('tiny');
    m.gy = topOf(w) + 1;
    D.follow(function () { w.x = m.x; onGround(D, w); m.gy = topOf(w) + 1; });
    pop(D, 'sfx_sooo', m.x + 20 * s, D.gy - 120 * s, COL.chalk, 16);
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 55 * s });
  };

  // 小さな文字が道案内（小さい）
  A.guide = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, s0 = w.scale;
    var fs = Math.min(s0, (40 * s) / w.width);
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x + 60 * s, k); w.scale = U.lerp(s0, fs, k); onGround(D, w); });
    pop(D, 'whisper', w.x, D.gy - 50 * s, COL.chalk, 13);
    var t = 0, said = 0;
    D.follow(function (dt) {
      t += dt;
      w.x = m.x + 60 * s; onGround(D, w); w.y -= Math.abs(Math.sin(t * 8)) * 6 * s;
      if (t - said > 1.6) { said = t; D.fx.word(D.T('whisper'), w.x, D.gy - 50 * s, { size: 11 * s + 4, color: COL.chalk, life: 0.9 }); }
    });
    yield D.walkTo(exitX(D) + 40 * s, { anim: 'sneak', speed: 58 * s });
  };

  // 武器をかまえてしのび足。起きたコウモリも、武器を見て逃げる（武器）
  A.batsShoo = function* (D) {
    var s = D.s, sc = D.sc, m = D.man;
    yield* pickUp(D, 'front');
    m.play('sneak');
    var b = sc.bats[4];
    var mx = m.x, tx = b.x - 10 * s;
    yield D.tween((tx - mx) / (45 * s), function (k) { m.x = U.lerp(mx, tx, k); });
    // 1ぴきだけ目をさます
    b.hang = false; b.face = -1; b.vx = 0; b.vy = 0; b.y += 30 * s;
    D.fx.word('?', b.x, b.y - 20 * s, { size: 16 * s + 4, color: COL.purple, life: 0.6 });
    D.sfx.play('tiny');
    m.play('hold'); m.shake = true;
    yield 0.6;
    m.shake = false;
    pop(D, 'batEek', b.x + 10 * s, b.y - 30 * s, COL.purple, 16);
    b.face = 1; b.vx = 240 * s; b.vy = -40 * s; b.wob = true;
    D.sfx.play('flop');
    yield 0.6;
    m.play('sneak');
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 55 * s });
  };

  // こもりうたで、コウモリがもっとぐっすり（決まった単語）
  A.lullaby = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, t = 0, k = 0;
    pop(D, 'sfx_nennen', w.x, w.y - 40 * s, COL.pink, 16);
    D.follow(function (dt) {
      t += dt;
      w.rot = Math.sin(D.time * 2) * 0.08;
      if (t > 0.7) { t = 0; k++; D.sfx.play('note', k % 3); D.fx.add({ type: 'note', text: '♪', x: w.x, y: w.y - 20 * s, vy: -25, vx: 20, life: 1.6, size: 12 * s + 4, color: COL.pink }); }
    });
    sc.snoreT = 0; sc.snoreFast = true;
    yield 1.2;
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 55 * s });
  };

  // 飛ぶ文字に乗って、音もなくすーっと（飛ぶ）
  A.glideQuiet = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield D.tween(0.5, function (k) { w.x = U.lerp(D.sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    pop(D, 'sfx_sooo', m.x + 20 * s, D.gy - 130 * s, COL.chalk, 16);
    var x0 = w.x, y0 = w.y;
    yield D.tween(3.0, function (k) { w.x = U.lerp(x0, exitX(D) + 40 * s, k); w.y = y0 - 26 * s * Math.sin(Math.min(1, k * 3) * PI / 2) + Math.sin(k * 9) * 2 * s; });
  };

  // 光や音で、コウモリが起きて追い返される（光る・音が出る＝失敗）
  A.batsWake = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    var glow = D.result && D.result.rule && D.result.rule.tag === 'glow';
    if (glow) {
      w.tint = COL.yellow;
      var Lt = { x: w.x, y: w.y, r: 20 * s, color: 'rgba(255,230,140,A)' };
      sc.lights.push(Lt);
      D.sfx.play('glow');
      pop(D, 'sfx_pika', w.x, w.y - 40 * s, COL.yellow, 22);
      yield D.tween(0.5, function (k) { Lt.r = U.lerp(20 * s, D.st.w * 0.6, k); sc.dark = U.lerp(0.8, 0.45, k); });
    } else {
      D.sfx.play('boom');
      for (var i = 0; i < 3; i++) D.fx.ring(w.x, w.y, 10 * s, D.st.w * (0.4 + i * 0.2), { life: 0.7 + i * 0.15, size: 2.4 });
      pop(D, 'sfx_jaan', w.x, w.y - 40 * s, COL.yellow, 22);
      yield 0.5;
    }
    sc.awake = true;
    yield 0.5;
    D.sfx.play('rattle');
    pop(D, 'sfx_basabasa', X(D, 0.6), sc.topY + 50 * s, COL.purple, 22);
    // コウモリが一斉に、棒人間へ
    sc.bats.forEach(function (b, i) { b.hang = false; b.ph = i; b.wob = true; b.vx = 0; b.vy = 0; });
    var t = 0;
    D.follow(function (dt) {
      t += dt;
      sc.bats.forEach(function (b, i) {
        var tx = m.x + Math.cos(t * 5 + i) * 40 * s, ty = m.gy - 90 * s + Math.sin(t * 4 + i * 1.7) * 30 * s;
        var k = Math.min(1, dt * (1.5 + i * 0.2));
        b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.face = tx > b.x ? 1 : -1;
      });
      if (Math.random() < dt * 6) D.sfx.play('flop');
    });
    yield 0.6;
    m.play('puzzled');
    pop(D, 'eek', m.x, m.gy - 130 * s, COL.chalk, 18);
    yield 0.5;
    w.alpha = 0;
    m.f = -1;
    yield D.walkTo(D.view.x - 80 * s, { anim: 'run' });
  };

  // 「もうそんな時間？」と、コウモリが出かけていく（時間・珍回答）
  A.batsLeave = function* (D) {
    var w = D.w, s = D.s, sc = D.sc;
    sc.awake = true;
    D.sfx.play('cute');
    pop(D, 'batsTime', X(D, 0.62), sc.topY + 70 * s, COL.purple, 16);
    yield 1.0;
    for (var i = 0; i < sc.bats.length; i++) {
      var b = sc.bats[i];
      b.hang = false; b.face = 1; b.vx = 150 * s; b.vy = -10 * s; b.wob = true; b.y += 16 * s;
      D.sfx.play('flop');
      yield 0.18;
    }
    yield 0.8;
    yield D.tween(0.5, function (k) { sc.dark = U.lerp(0.8, 0.55, k); });
    yield D.walkTo(exitX(D));
  };

  // 10問目：かたい文字をヘルメットにして、岩をはね返す（硬い）
  A.helmet = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    yield* pickUp(D, 'overhead');
    m.armsUp = true;
    sc.shields.push({ x0: function () { return w.x - w.dispW() / 2 - 4 * s; }, x1: function () { return w.x + w.dispW() / 2 + 4 * s; }, y: function () { return topOf(w); },
      onHit: function (rk) { pop(D, 'sfx_kakiin', rk.x, rk.y - 30 * s, COL.yellow, 16); } });
    sc.target = function () { return m.x + 20 * s; };
    sc.spawnT = 0.1;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 62 * s });
    m.armsUp = false;
  };

  // 大きな文字を屋根にして、その下をくぐる（大きい）
  A.roof = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y, s0 = w.scale;
    var rx0 = X(D, 0.34), rx1 = D.st.x + D.st.w + 10, ry = D.gy - 118 * s;
    var big = Math.min(s0 * 1.6, (38 * s) / w.height);
    D.sfx.play('grow');
    yield D.tween(0.8, function (k) {
      w.scale = U.lerp(s0, big, U.easeBack(k));
      w.sx = U.lerp(1, Math.max(1, (rx1 - rx0) / (w.width * big)), k);
      w.x = U.lerp(x0, (rx0 + rx1) / 2, k); w.y = U.lerp(y0, ry, U.easeOut(k));
    });
    D.sfx.play('thud');
    sc.shields.push({ x0: function () { return w.x - w.dispW() / 2; }, x1: function () { return w.x + w.dispW() / 2; }, y: function () { return topOf(w); },
      onHit: function () { w.off.forEach(function (o, i) { o.y = (Math.random() - 0.5) * 4; }); } });
    sc.target = function () { return U.lerp(rx0 + 20 * s, rx1 - 20 * s, Math.random()); };
    sc.spawnT = 0.1;
    yield 0.8;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s });
  };

  // 人が岩をキャッチして、ジャグリング（人・珍回答）
  A.juggle = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    var jx = X(D, 0.6);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, jx, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 8 * s; });
    var balls = [], t = 0;
    sc.juggler = {
      x: jx, y: topOf(w),
      catchRock: function (rk) { if (balls.length >= 4) return false; balls.push(rk); D.sfx.play('clink'); return true; }
    };
    sc.target = function () { return jx + (Math.random() - 0.5) * 30 * s; };
    sc.spawnT = 0.1;
    D.follow(function (dt) {
      t += dt;
      w.y = D.gy - w.dispH() / 2 - 2 - Math.abs(Math.sin(t * 8)) * 3 * s;
      balls.forEach(function (rk, i) {
        var a = t * 4.2 + i * TAU / Math.max(3, balls.length);
        rk.x = jx + Math.cos(a) * 30 * s; rk.y = topOf(w) - 24 * s - Math.abs(Math.sin(a)) * 60 * s; rk.rot += dt * 6;
      });
    });
    yield 2.0;
    pop(D, 'sfx_pachipachi', m.x, D.gy - 130 * s, COL.chalk, 18);
    m.play('clap');
    D.sfx.play('cheer');
    yield 1.2;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s });
  };

  // 11問目：音色で、ヘビがうっとり踊る（音が出る）
  A.snakeCharm = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, t = 0, k = 0;
    D.follow(function (dt) {
      t += dt;
      if (t > 0.4) { t = 0; k++; D.sfx.play('note', k); note(D, w.x + 10 * s, w.y - 20 * s, k); }
    });
    yield 0.6;
    sc.snake.mode = 'sway';
    pop(D, 'sfx_uttori', sc.snake.hx, sc.snake.hy - 40 * s, COL.green, 18);
    yield 1.0;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s });
  };

  // 食べ物をまるのみして、眠ってしまう（食べられる）
  A.snakeGulp = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, sn = sc.snake, m = D.man;
    yield* pickUp(D, 'front');
    yield* throwTo(D, sc.chest.x - 96 * s, 50 * s);
    sn.lunge = { x: w.x + 18 * s, y: w.y - 6 * s, k: 0 };
    yield D.tween(0.25, function (k) { sn.lunge.k = k; });
    var s0 = w.scale;
    D.sfx.play('gulp');
    pop(D, 'sfx_gokkun', sn.hx, sn.hy - 40 * s, COL.green, 20);
    yield D.tween(0.35, function (k) { w.scale = s0 * (1 - k); w.x = sn.hx; w.y = sn.hy; });
    w.alpha = 0;
    yield D.tween(0.4, function (k) { sn.lunge.k = 1 - k; });
    sn.lunge = null;
    yield D.tween(1.0, function (k) { sn.bulge = k; });
    sn.mode = 'sleep';
    D.sfx.play('yawn');
    yield 0.8;
    m.play('idle');
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 50 * s });
  };

  // 長い文字を仲間だと思って、からまってしまう（長い・珍回答）
  A.snakeFriend = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, sn = sc.snake, m = D.man, x0 = w.x, t = 0;
    D.follow(function (dt) { t += dt; for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 7 - i) * 8; });
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, sc.chest.x - 80 * s, k); onGround(D, w); });
    sn.mode = 'friend';
    D.sfx.play('cute');
    pop(D, 'snakeHi', sn.hx, sn.hy - 40 * s, COL.green, 18);
    yield 0.6;
    // ぐるぐる、からまる
    var hx = sn.hx, hy = sn.hy + 20 * s, wx = w.x, wy = w.y, tangled = true;
    yield D.tween(1.2, function (k) {
      var a = k * TAU * 1.5;
      w.x = U.lerp(wx, hx + Math.cos(a) * 26 * s, k); w.y = U.lerp(wy, hy + Math.sin(a) * 14 * s, k); w.rot = a * 0.3;
    });
    D.chalkHook(function (ctx, tt) {
      if (!tangled) return;
      var r = U.rng(Math.floor(tt * 6)), pts = [];
      for (var i = 0; i <= 14; i++) { var a = i / 14 * TAU * 2.2; pts.push(hx + Math.cos(a) * (18 + r() * 12) * s, hy + Math.sin(a) * (10 + r() * 8) * s); }
      CM.chalk.line(ctx, pts, { w: 2.4, color: COL.green, seed: Math.floor(tt * 6), alpha: 0.8 });
    });
    D.sfx.play('rattle');
    pop(D, 'sfx_konran', hx, hy - 60 * s, COL.chalk, 20);
    m.play('puzzled');
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 12問目：熱い文字であたたまる。つららもとける（熱い）
  A.warmUp = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    w.tint = COL.red;
    D.sfx.play('fire');
    D.follow(function () { if (Math.random() < 0.3) D.fx.add({ type: 'spark', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y - w.dispH() / 2, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, g: -20, life: 0.6, size: 1.6, color: COL.orange }); });
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x + 44 * s + w.dispW() / 2, k); onGround(D, w); });
    pop(D, 'sfx_pokapoka', m.x, D.gy - 130 * s, COL.orange, 20);
    m.play('idle');
    for (var i = 0; i < 4; i++) D.fx.add({ type: 'steam', x: m.x + (i - 1.5) * 10 * s, y: D.gy - 90 * s, vy: -20, life: 1.2, size: 2 * s, color: COL.chalk });
    yield D.tween(2.0, function (k) { sc.melt = k; sc.cold = 1 - k; });
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // やわらかい文字にくるまって、ぬくぬく（柔らかい）
  A.wrapUp = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, y0 = w.y, s0 = w.scale;
    var ws = Math.min(s0, (58 * s) / w.width);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, m.x, k); w.y = U.lerp(y0, m.gy - 58 * s, k); w.scale = U.lerp(s0, ws, k); });
    // 体にまきつく（まん中がへこんで、はしがまるまる）
    var n = w.chars.length;
    for (var i = 0; i < n; i++) { var u = n > 1 ? i / (n - 1) * 2 - 1 : 0; w.off[i].y = -u * u * 14; w.off[i].r = u * 0.4; }
    D.sfx.play('boing');
    pop(D, 'sfx_nukunuku', m.x, m.gy - 140 * s, COL.pink, 20);
    sc.cold = 0.3;
    m.play('cheer');
    D.follow(function () { w.x = m.x + 2 * s; w.y = m.gy - 58 * s; });
    yield 1.0;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s });
  };

  // 冷たい文字で床がつるつるに。すってーん！とすべっていく（冷たい・珍回答）
  A.iceSlip = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    w.tint = COL.ice;
    D.sfx.play('freeze');
    for (var i = 0; i < 14; i++) D.fx.add({ type: 'frost', x: D.st.x + Math.random() * D.st.w, y: D.gy - Math.random() * 20 * s, vy: -10, vr: 2, life: 1.2, size: 5 * s, color: COL.ice });
    yield D.tween(0.8, function (k) { sc.slick = k; });
    pop(D, 'brr', m.x + 20 * s, D.gy - 120 * s, COL.ice, 18);
    yield 0.4;
    // 一歩ふみだして、すべる
    m.play('walk');
    var mx = m.x;
    yield D.tween(0.5, function (k) { m.x = mx + 20 * s * k; });
    D.sfx.play('whoosh');
    pop(D, 'sfx_sutteen', m.x + 30 * s, D.gy - 100 * s, COL.chalk, 24);
    m.play('lie');
    var lx = m.x, wx = w.x;
    yield D.tween(1.6, function (k) {
      m.x = U.lerp(lx, exitX(D) + 60 * s, U.easeIn(k)); w.x = U.lerp(wx, exitX(D) + 140 * s, U.easeIn(Math.max(0, k - 0.1) / 0.9));
      if (Math.random() < 0.4) D.fx.add({ type: 'frost', x: m.x - 20 * s, y: D.gy - 4 * s, vy: -20, vr: 2, life: 0.6, size: 3 * s, color: COL.ice });
    });
  };

  // 13問目：長い文字を穴に立てて、地上までのぼる（長い）
  A.ladderUp = function* (D) {
    var m = D.man, s = D.s, sc = D.sc, sh = sc.shaft;
    var top = D.st.y - 30 * s;
    yield* standUp(D, sh.x, D.gy, D.gy - top);
    yield D.walkTo(sh.x - 14 * s, { anim: 'walk' });
    m.f = 1; m.play('cling');
    D.sfx.play('climb');
    pop(D, 'toSurface', sh.x - 40 * s, D.gy - 160 * s, COL.yellow, 20);
    var g0 = m.gy;
    yield D.tween(2.4, function (k) { m.gy = U.lerp(g0, D.st.y - 80 * s, U.easeIn(k)); });
  };

  // 飛ぶ文字に乗って、光の方へ（飛ぶ）
  A.flyOut = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, sh = sc.shaft;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(D.sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    pop(D, 'toSurface', m.x, D.gy - 130 * s, COL.yellow, 20);
    var x0 = w.x, y0 = w.y;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, sh.x, U.easeInOut(k)); w.y = y0 - 20 * s * k; });
    var y1 = w.y;
    yield D.tween(1.6, function (k) { w.y = U.lerp(y1, D.st.y - 160 * s, U.easeIn(k)); w.rot = Math.sin(k * 10) * 0.05; });
  };

  // 大きくなる文字に乗って、地上まで持ち上げてもらう（大きい）
  A.growUp = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, sh = sc.shaft, x0 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, sh.x, k); onGround(D, w); });
    yield D.walkTo(sh.x - w.dispW() / 2 - 20 * s, { anim: 'walk' });
    yield D.hop(m, sh.x, topOf(w) + 1, 20 * s, 0.4);
    D.follow(function () { m.x = w.x; m.gy = topOf(w) + 1; });
    D.sfx.play('grow');
    pop(D, 'sfx_gungun', sh.x + 50 * s, D.gy - 80 * s, COL.chalk, 20);
    var s0 = w.scale, s1 = Math.max(s0, ((sh.x1 - sh.x0) * 0.9) / w.width);
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, s1, U.easeOut(k)); onGround(D, w); });
    var h0 = w.dispH(), need = (D.gy - (D.st.y - 60 * s)) / h0;
    yield D.tween(2.0, function (k) { w.sy = U.lerp(1, need, U.easeIn(k)); onGround(D, w); });
    pop(D, 'toSurface', sh.x, D.st.y + 40 * s, COL.yellow, 18);
  };

  // 植えた植物が、にょきにょき育って持ち上げる（植物・珍回答）
  A.sprout = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, sh = sc.shaft, x0 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, sh.x, k); onGround(D, w); });
    // 植える
    D.sfx.play('dig');
    D.fx.dust(sh.x, D.gy, 8, { angle: -PI / 2, spread: 1.4, speed: 80, g: 300, color: '#d2ae88' });
    yield D.walkTo(sh.x - w.dispW() / 2 - 20 * s, { anim: 'walk' });
    yield D.hop(m, sh.x, topOf(w) + 1, 20 * s, 0.4);
    sc.stem = { x: sh.x, top: D.gy };
    D.follow(function () { onGround(D, w, sc.stem.top); m.x = w.x; m.gy = topOf(w) + 1; });
    D.sfx.play('grow');
    pop(D, 'sfx_nyoki', sh.x + 50 * s, D.gy - 80 * s, COL.green, 20);
    yield D.tween(2.6, function (k) { sc.stem.top = U.lerp(D.gy, D.st.y - 60 * s, U.easeIn(k)); });
  };

  // ============================================================
  //  試遊で足した正解（第2章）
  // ============================================================

  // 8問目：大きな文字に、鳥たちがびっくり（大きい）
  A.bigScare = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, s0 = w.scale, big = Math.min(s0 * 2.4, (D.st.w * 0.5) / w.width);
    sc.swoopOn = false;
    D.sfx.play('grow');
    yield D.tween(0.6, function (k) { w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w); });
    D.sfx.play('thud'); D.fx.shake(6, 0.3);
    pop(D, 'huge', sc.center.x, sc.center.y - 40 * s, COL.blue, 22);
    sc.birds.forEach(function (b) { b.mode = 'free'; b.angry = false; b.vx = (120 + Math.random() * 120) * s; b.vy = -(120 + Math.random() * 100) * s; D.fx.word('!', b.x, b.y - 14 * s, { size: 14 * s + 4, color: COL.blue, life: 0.5 }); });
    D.sfx.play('flop');
    yield 1.0;
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 9問目：乗り物に乗って、雷の中をつっきる（乗り物）
  A.carSafe = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    yield* mount(D);
    sc.onStrike = function () { w.shine = 0; D.fx.add({ type: 'star', x: w.x, y: topOf(w), life: 0.4, size: 7 * s, color: COL.yellow }); };
    D.follow(function (dt) { sc.rod = { x: w.x, y: topOf(w) - 40 * s }; if (w.shine >= 0) { w.shine += dt * 3; if (w.shine > 1) w.shine = -1; } });
    sc.boltT = 0.4;
    pop(D, 'safe', w.x + 20 * s, topOf(w) - 90 * s, COL.yellow, 18);
    D.sfx.play('rattle');
    var x0 = w.x;
    yield D.tween(3.0, function (k) { w.x = U.lerp(x0, exitX(D) + 40 * s, U.easeInOut(k)); w.rot = Math.sin(k * 40) * 0.02; });
  };

  // 10問目：扇風機・うちわで、風をふきかえす（決まった単語）
  A.blowBack = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, f = sc.face, x0 = w.x;
    yield D.tween(0.4, function (k) { w.x = U.lerp(x0, m.x + 40 * s + w.dispW() / 2, k); onGround(D, w); });
    pop(D, 'sfx_byuu', w.x + 40 * s, w.y - 40 * s, COL.chalk, 22);
    D.sfx.play('whoosh');
    var t = 0;
    D.follow(function (dt) {
      t += dt;
      w.rot = Math.sin(t * 30) * 0.04;
      if (Math.random() < 0.5) D.fx.add({ type: 'line', x: w.x + w.dispW() / 2, y: w.y + (Math.random() - 0.5) * 30 * s, ang: -0.05 + (Math.random() - 0.5) * 0.2, d0: 0, d1: 220 * s, len: 22 * s, life: 0.6, size: 1.8, color: COL.chalk });
    });
    yield D.tween(1.0, function (k) { sc.wind = 1 - k; f.blow = 1 - k; });
    f.mode = 'dizzy';
    D.sfx.play('rattle');
    var fx0 = f.x;
    yield D.tween(1.2, function (k) { f.x = U.lerp(fx0, exitX(D) + f.r * 2, U.easeIn(k)); f.y -= 0.6 * s; });
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 11問目：新しい門番と交代（職業）
  A.shiftChange = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, g = sc.guard, x0 = w.x;
    sc.guardQuiet = true;
    yield D.tween(0.9, function (k) { w.x = U.lerp(x0, g.x - 44 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 8 * s; });
    pop(D, 'kotai', g.x, D.gy - 175 * s, COL.blue, 18);
    g.play('cheer');
    D.sfx.play('cheer');
    yield 0.8;
    // 前の門番は、お城の中へ帰る
    D.sfx.play('stretch');
    yield D.tween(0.8, function (k) { sc.castle.gate = k; });
    g.f = 1;
    yield D.walkTo(sc.castle.gx, { actor: g, anim: 'walk', speed: 90 * s });
    yield D.tween(0.4, function (k) { g.alpha = 1 - k; });
    g.spear = null;
    var wx = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(wx, sc.castle.gx + sc.castle.gw, k); onGround(D, w); });
    yield* intoGate(D);
  };

  // 13問目：重い文字をいかりにして、ゆっくり下へ（重い）
  A.anchor = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, st = sc.star, fl = sc.floorY, x0 = w.x, y0 = w.y, rope = 44 * s;
    D.chalkHook(function (ctx) { CM.chalk.line(ctx, [st.x + 10 * s, st.y + st.dy + st.r * 0.4, w.x, topOf(w)], { w: 2, seed: 5, color: COL.chalk, alpha: 0.9 }); });
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, st.x + 10 * s, k); w.y = U.lerp(y0, st.y + st.r * 0.4 + rope + w.dispH() / 2, k); });
    D.sfx.play('thud');
    pop(D, 'sfx_zushi', w.x + 40 * s, w.y, COL.chalk, 18);
    var sy = st.y, landY = fl - w.dispH() / 2 - 2, t = 0;
    yield D.tween(2.4, function (k) {
      sc.speed = 1 - 0.9 * k; st.shake = 1 - k;
      st.y = U.lerp(sy, fl - st.r * 0.9 - 6 * s, U.easeInOut(k));
      w.y = Math.min(landY, st.y + st.r * 0.4 + rope + w.dispH() / 2); w.x = st.x + 10 * s + Math.sin(k * 12) * 4 * s * (1 - k);
    });
    D.sfx.play('clink');
    sc.riding = false; D.gy = fl;
    yield D.hop(m, st.x - st.r - 30 * s, fl, 24 * s, 0.45);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 地下7問目：大きな音で、モグラが穴にもぐる（音が出る）
  A.moleScare = function* (D) {
    var w = D.w, s = D.s, sc = D.sc;
    sc.quiet = true;
    yield D.tween(0.25, function (k) { w.sx = w.sy = 1 + 0.3 * k; });
    D.sfx.play('boom');
    for (var i = 0; i < 3; i++) D.fx.ring(w.x, w.y, 10 * s, D.st.w * (0.4 + i * 0.2), { life: 0.7 + i * 0.15, size: 2.4 });
    pop(D, 'sfx_jaan', w.x, w.y - 40 * s, COL.yellow, 22);
    yield D.tween(0.25, function (k) { w.sx = w.sy = 1.3 - 0.3 * k; });
    sc.moles.forEach(function (ml) { D.fx.word('!', ml.hx, D.gy - 70 * s, { size: 16 * s + 4, color: COL.orange, life: 0.6 }); });
    yield 0.4;
    for (i = 0; i < sc.moles.length; i++) { sc.moles[i].mode = 'down'; D.sfx.play('pop'); yield 0.15; }
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 地下10問目：乗り物で、岩が落ちる前にかけぬける（乗り物）
  A.dashThrough = function* (D) {
    var w = D.w, s = D.s;
    yield* mount(D);
    pop(D, 'sfx_byuun', w.x + 60 * s, topOf(w) - 80 * s, COL.chalk, 22);
    D.sfx.play('whoosh');
    var x0 = w.x;
    yield D.tween(1.2, function (k) {
      w.x = U.lerp(x0, exitX(D) + 60 * s, U.easeIn(k));
      if (Math.random() < 0.5) D.fx.dust(w.x - w.dispW() / 2, D.gy, 1, { angle: PI + 0.2, spread: 0.4, speed: 80, g: 60 });
    });
  };

  // 地下11問目：冷たい文字で、ヘビが冬眠（冷たい）
  A.hibernate = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, sn = sc.snake, x0 = w.x, y0 = w.y;
    w.tint = COL.ice;
    D.sfx.play('freeze');
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, sn.hx - 50 * s, k); w.y = U.lerp(y0, sn.hy + 10 * s, k); });
    for (var i = 0; i < 10; i++) D.fx.add({ type: 'frost', x: sn.hx + (Math.random() - 0.5) * 70 * s, y: sn.hy + Math.random() * 80 * s, vy: 10, vr: 2, life: 1.4, size: 5 * s, color: COL.ice });
    pop(D, 'sfx_hinyari', sn.hx, sn.hy - 40 * s, COL.ice, 18);
    yield 0.8;
    sn.mode = 'sleep';
    D.sfx.play('yawn');
    yield 1.0;
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 55 * s });
  };

  // 地下12問目：動物とくっついて、あったか〜い（動物）
  A.huddle = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, m.x + 20 * s + w.dispW() / 2, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 8 * s; });
    for (var i = 0; i < 5; i++) D.fx.add({ type: 'heart', x: m.x + 20 * s, y: D.gy - 90 * s, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.1, size: 6 * s, color: COL.pink });
    D.sfx.play('cute');
    sc.cold = 0.2;
    m.play('cheer');
    pop(D, 'sfx_attaka', m.x, D.gy - 140 * s, COL.pink, 18);
    yield 1.0;
    D.follow(function () { w.x = m.x + 20 * s + w.dispW() / 2; onGround(D, w); w.y -= Math.abs(Math.sin(D.time * 10)) * 5 * s; });
    yield D.walkTo(exitX(D) + w.dispW(), { anim: 'walk', speed: 72 * s });
  };
})(window);
