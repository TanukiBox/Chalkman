/*
 * CHALK MAN 失敗の演出（共通反応のバリエーション）
 * reactions.js の alts に書いた反応の台本。同じ大分類でも、単語によってちがう失敗をする。
 * 書き方は acts.js と同じ。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var A = CM.ACTS, K = CM.actKit;
  var onGround = K.onGround, topOf = K.topOf, exitX = K.exitX, pop = K.pop, pickUp = K.pickUp, dropWord = K.dropWord, mount = K.mount;

  /** 文字が、ぴょこぴょこ跳ねながら x まで行く */
  function hopTo(D, x, sec, h) {
    var w = D.w, x0 = w.x;
    return D.tween(sec, function (k) { w.x = U.lerp(x0, x, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * (h || 8) * D.s; });
  }

  // ---- 生き物 ----
  // うしろをついて回るだけ
  A.followMe = function* (D) {
    var w = D.w, s = D.s, m = D.man, mx = m.x;
    yield hopTo(D, m.x - 40 * s, 0.8);
    var f = D.follow(function () { w.x += (m.x - 44 * s * m.f - w.x) * 0.12; onGround(D, w); w.y -= Math.abs(Math.sin(D.time * 10)) * 5 * s; });
    yield D.walkTo(mx + 60 * s, { anim: 'walk' });
    yield D.walkTo(mx - 30 * s, { anim: 'walk' });
    m.f = 1; m.play('puzzled');
    pop(D, 'dots', m.x, D.gy - 120 * s, COL.chalk, 18);
    yield 1.0;
    D.unfollow(f);
  };
  // その場でごろんと寝る
  A.napHere = function* (D) {
    var w = D.w, s = D.s;
    D.sfx.play('yawn');
    yield D.tween(0.6, function (k) { w.rot = -PI / 2 * U.easeOut(k) * 0.9; w.y = D.gy - U.lerp(w.dispH() / 2, w.dispW() * 0.45, 1 - k) - 2; });
    for (var i = 0; i < 3; i++) { D.fx.add({ type: 'text', text: 'Z', x: w.x + 10 * s, y: w.y - 20 * s, vy: -30, vx: 15, life: 1.4, size: (14 + i * 4) * s, color: COL.blue }); yield 0.6; }
    D.man.play('puzzled');
    yield 0.6;
  };
  // くんくん、においをかいで帰る
  A.sniff = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield hopTo(D, m.x + 36 * s + w.dispW() / 2, 0.8);
    for (var i = 0; i < 3; i++) {
      pop(D, 'sniff', w.x - w.dispW() / 2, w.y - 30 * s, COL.chalk, 13);
      yield D.tween(0.3, function (k) { w.rot = -0.12 * Math.sin(k * PI); });
    }
    D.sfx.play('cute');
    yield 0.3;
    var x1 = w.x;
    yield D.tween(1.2, function (k) { w.x = U.lerp(x1, exitX(D) + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 6)) * 8 * s; });
  };
  // 虫：体をはいのぼって、くすぐったい
  A.tickle = function* (D) {
    var w = D.w, s = D.s, m = D.man, s0 = w.scale;
    yield D.tween(0.3, function (k) { w.scale = U.lerp(s0, (20 * s) / w.width, k); onGround(D, w); });
    yield hopTo(D, m.x + 6 * s, 0.6, 4);
    D.sfx.play('patter');
    var y0 = w.y;
    yield D.tween(1.0, function (k) { w.y = U.lerp(y0, m.gy - 110 * s, k); w.x = m.x + Math.sin(k * 30) * 5 * s; w.rot = -PI / 2; });
    m.play('cheer'); m.shake = true;
    pop(D, 'tickle', m.x + 30 * s, m.gy - 140 * s, COL.pink, 18);
    D.sfx.play('rattle');
    yield 1.0;
    m.shake = false; m.play('puzzled');
    var wy = w.y;
    yield D.tween(0.5, function (k) { w.x = m.x + 30 * s * k; w.y = wy + (D.gy - wy) * k * k; w.rot = -PI / 2 * (1 - k); });
    yield D.tween(0.6, function (k) { w.x = m.x + 30 * s + 120 * s * k; onGround(D, w); });
  };
  // 海の生き物：水をピューッ
  A.squirt = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield D.tween(0.3, function (k) { w.sy = 1 + 0.2 * Math.sin(k * PI); });
    D.sfx.play('splash');
    for (var i = 0; i < 18; i++) D.fx.add({ type: 'dust', x: w.x - w.dispW() / 2, y: w.y - 10 * s, vx: (m.x - w.x) * (1.4 + Math.random() * 0.4), vy: -260 * s - Math.random() * 60, g: 600 * s, life: 0.9, size: 2.4 * s, color: COL.blue });
    yield 0.7;
    m.play('puzzled');
    pop(D, 'soaked', m.x, m.gy - 130 * s, COL.blue, 16);
    for (i = 0; i < 6; i++) { D.fx.add({ type: 'dust', x: m.x + (Math.random() - 0.5) * 20 * s, y: m.gy - 60 * s, vy: 40, g: 400, life: 0.7, size: 2 * s, color: COL.blue }); yield 0.15; }
    yield 0.5;
  };
  // 鳥：頭にとまって、ひと休み
  A.perch = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, y0 = w.y, s0 = w.scale;
    var sm = Math.min(s0, (34 * s) / w.width);
    D.sfx.play('fly');
    yield D.tween(0.9, function (k) {
      var j = m.joints, hx = j ? j.head[0] : m.x, hy = j ? j.head[1] - 14 * s : m.gy - 130 * s;
      w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, hx, k); w.y = U.lerp(y0, hy - w.dispH() / 2, k) - Math.sin(k * PI) * 40 * s;
    });
    D.follow(function () { var j = m.joints; if (j) { w.x = j.head[0]; w.y = j.head[1] - 14 * s - w.dispH() / 2; } });
    m.play('puzzled');
    pop(D, 'rest', m.x + 40 * s, m.gy - 150 * s, COL.chalk, 14);
    yield 1.6;
  };
  // 空想の生き物：魔法を見せびらかす
  A.showOff = function* (D) {
    var w = D.w, s = D.s, y0 = w.y;
    D.sfx.play('sparkle');
    yield D.tween(1.2, function (k) {
      w.y = y0 - 30 * s * Math.sin(k * PI);
      var a = k * TAU * 2;
      D.fx.add({ type: 'star', x: w.x + Math.cos(a) * w.dispW() * 0.7, y: w.y + Math.sin(a) * 26 * s, life: 0.5, size: 5 * s, color: COL.purple });
    });
    pop(D, 'sfx_jaan', w.x, w.y - 40 * s, COL.purple, 18);
    D.man.play('puzzled');
    yield 0.5;
    var x1 = w.x, y1 = w.y;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x1, exitX(D) + 60 * s, U.easeIn(k)); w.y = y1 - 60 * s * k; });
  };

  // ---- 人 ----
  // 記念写真をとって帰る
  A.photo = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield hopTo(D, m.x + 70 * s + w.dispW() / 2, 0.8, 6);
    m.play('cheer');
    yield 0.5;
    var flash = 1;
    D.realHook(function (ctx) { if (flash <= 0) return; var v = D.view; ctx.save(); ctx.globalAlpha = 0.5 * flash; ctx.fillStyle = '#fff'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.restore(); });
    D.follow(function (dt) { flash = Math.max(0, flash - dt * 3); });
    D.sfx.play('clink');
    pop(D, 'photo', w.x, w.y - 40 * s, COL.chalk, 20);
    yield 0.8;
    m.play('idle');
    var x1 = w.x;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x1, exitX(D) + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 5)) * 6 * s; });
  };
  // 長〜いお話
  A.lecture = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield hopTo(D, m.x + 50 * s + w.dispW() / 2, 0.7, 6);
    var keys = ['lecture1', 'dots', 'lecture2', 'dots'];
    for (var i = 0; i < keys.length; i++) {
      pop(D, keys[i], w.x, w.y - 40 * s, COL.chalk, 14);
      yield D.tween(0.55, function (k) { w.rot = Math.sin(k * PI * 4) * 0.05; });
      if (i === 1) m.play('sleepy');
    }
    yield 0.4;
    var x1 = w.x;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x1, exitX(D) + 40 * s, k); onGround(D, w); });
    m.play('puzzled');
    yield 0.4;
  };

  // ---- 食べ物 ----
  // 落として、ころころ
  A.dropFood = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    yield 0.3;
    D.held = null;
    pop(D, 'oops', m.x, m.gy - 130 * s, COL.chalk, 18);
    var x0 = w.x, y0 = w.y;
    yield D.tween(0.3, function (k) { w.y = U.lerp(y0, D.gy - w.dispH() / 2 - 2, k * k); });
    D.sfx.play('clink');
    m.play('puzzled');
    yield D.tween(1.2, function (k) { w.x = U.lerp(x0, exitX(D) + 60 * s, U.easeIn(k)); w.rot = k * TAU * 2; });
  };
  // 食べすぎて動けない
  A.overeat = function* (D) {
    var m = D.man, s = D.s;
    yield* A.eat(D);
    m.play('hungry');
    pop(D, 'full', m.x, m.gy - 130 * s, COL.chalk, 16);
    D.sfx.play('yawn');
    yield 1.2;
  };
  // 飲み物をこぼす
  A.spill = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    D.heldRot = 0;
    yield D.tween(0.4, function (k) { D.heldRot = 1.4 * k; });
    D.sfx.play('splash');
    for (var i = 0; i < 16; i++) D.fx.add({ type: 'dust', x: w.x + w.dispW() * 0.3, y: w.y, vx: (Math.random() - 0.3) * 60, vy: 20, g: 500, life: 0.8, size: 2.4 * s, color: COL.blue });
    var px = w.x;
    D.chalkHook(function (ctx) { CM.chalk.line(ctx, [px - 26 * s, D.gy + 2, px, D.gy + 5 * s, px + 30 * s, D.gy + 2], { w: 3, color: COL.blue, seed: 3, alpha: 0.7 }); });
    pop(D, 'achaa', m.x, m.gy - 130 * s, COL.chalk, 16);
    m.play('puzzled');
    yield 0.8;
    D.heldRot = 0;
    D.held = null; D.wordVisible = false;
    yield 0.4;
  };

  // ---- 自然 ----
  // ころころ転がっていく
  A.rollAway = function* (D) {
    var w = D.w, s = D.s, x0 = w.x;
    yield D.tween(0.3, function (k) { w.rot = 0.2 * k; });
    D.sfx.play('rattle');
    yield D.tween(1.6, function (k) { w.x = U.lerp(x0, exitX(D) + 60 * s, U.easeIn(k)); w.rot = 0.2 + k * TAU * 2.5; onGround(D, w); });
    D.man.play('puzzled');
    yield 0.5;
  };
  // 天気：頭の上にだけ来る
  A.rainOnMan = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, y0 = w.y;
    var ty = m.gy - 170 * s;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, m.x, k); w.y = U.lerp(y0, ty, U.easeOut(k)); });
    D.sfx.play('splash');
    var t = 0;
    D.follow(function (dt) {
      t += dt; w.y = ty + Math.sin(t * 3) * 3 * s;
      if (Math.random() < 0.6) D.fx.add({ type: 'dust', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y + w.dispH() / 2, vy: 160, g: 200, life: 0.7, size: 1.8 * s, color: COL.blue });
    });
    m.play('puzzled');
    yield 0.8;
    pop(D, 'soaked', m.x + 40 * s, m.gy - 110 * s, COL.blue, 16);
    yield 1.0;
  };

  // ---- 人工物 ----
  // バキッとこわれる
  A.breakApart = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    m.play('hold'); m.shake = true;
    yield 0.6;
    m.shake = false;
    D.sfx.play('snap');
    pop(D, 'crack', w.x, w.y - 40 * s, COL.chalk, 20);
    D.held = null;
    var vs = w.off.map(function (o, i) { return { vx: (i - w.off.length / 2) * 30, vy: -80 - Math.random() * 60, vr: (Math.random() - 0.5) * 6 }; });
    var y0 = w.y;
    yield D.tween(0.9, function (k) {
      w.off.forEach(function (o, i) { var t = k * 0.9; o.x = vs[i].vx * t; o.y = vs[i].vy * t + 700 * t * t; o.r = vs[i].vr * t; });
      w.y = y0;
    });
    m.play('puzzled');
    yield D.tween(0.4, function (k) { w.alpha = 1 - k; });
    D.wordVisible = false;
  };
  // 使い方がわからなくて、ぐるぐる
  A.howToUse = function* (D) {
    var s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    m.play('hold');
    D.heldRot = 0;
    for (var i = 0; i < 3; i++) {
      yield D.tween(0.45, function (k) { D.heldRot = (i + k) * PI / 2; });
      pop(D, 'q', m.x + 20 * s, m.gy - 130 * s, COL.chalk, 16);
      yield 0.2;
    }
    D.heldRot = 0;
    m.play('puzzled');
    yield* dropWord(D);
    yield 0.3;
  };
  // 武器：重すぎて持ち上がらない
  A.tooHeavy = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield D.walkTo(w.x - w.dispW() / 2 - 14 * s);
    m.play('dig'); m.shake = true;
    pop(D, 'heavy', m.x, m.gy - 130 * s, COL.chalk, 16);
    for (var i = 0; i < 3; i++) {
      yield D.tween(0.4, function (k) { w.rot = -0.05 * Math.sin(k * PI); });
      D.sfx.play('rattle');
    }
    m.shake = false; m.play('puzzled');
    yield 0.6;
  };
  // 乗り物：プスン…
  A.outOfGas = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* mount(D);
    for (var i = 0; i < 3; i++) {
      D.sfx.play('poof');
      D.fx.add({ type: 'bubble', x: w.x - w.dispW() / 2, y: w.y, vx: -30, vy: -20, life: 1, size: (5 + i * 2) * s, color: '#bbbbbb' });
      yield D.tween(0.35, function (k) { w.x += Math.sin(k * 40) * 0.6 * s; });
    }
    pop(D, 'puson', w.x, topOf(w) - 70 * s, COL.chalk, 16);
    yield 0.6;
    D.clearFollow();
    yield D.hop(m, w.x - w.dispW() / 2 - 20 * s, D.gy, 20 * s, 0.4);
    m.play('puzzled');
    yield 0.3;
  };

  // ---- 目に見えないもの ----
  // 気持ち：てれてしまう
  A.blush = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield D.tween(0.8, function (k) { w.alpha = 1 - k * 0.7; });
    m.play('shiver');
    D.chalkHook(function (ctx) {
      var j = m.joints; if (!j) return;
      var R = CM.BODY.head * s;
      [-0.5, 0.9].forEach(function (d, i) { ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = COL.pink; ctx.beginPath(); ctx.ellipse(j.head[0] + d * R * j.f, j.head[1] + R * 0.35, R * 0.28, R * 0.16, 0, 0, TAU); ctx.fill(); ctx.restore(); });
    });
    pop(D, 'shy', m.x + 30 * s, m.gy - 140 * s, COL.pink, 16);
    D.sfx.play('cute');
    yield 1.4;
    D.wordVisible = false;
  };
  // 魔法：ボンッ！ 頭がちりちり
  A.backfire = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    D.sfx.play('sparkle');
    yield D.tween(0.6, function (k) { w.alpha = 1 - k; w.y -= 0.5 * s; });
    D.wordVisible = false;
    D.sfx.play('poof');
    var j = m.joints, hx = j ? j.head[0] : m.x, hy = j ? j.head[1] : m.gy - 110 * s;
    D.fx.dust(hx, hy, 18, { speed: 90, g: 0, life: 0.8, size: 3 * s, color: '#cccccc' });
    pop(D, 'bon', hx, hy - 40 * s, COL.yellow, 22);
    D.chalkHook(function (ctx, t) {
      var jj = m.joints; if (!jj) return;
      var R = CM.BODY.head * s;
      for (var i = 0; i < 7; i++) {
        var a = -PI * 0.9 + i / 6 * PI * 0.8, x0 = jj.head[0] + Math.cos(a) * R, y0 = jj.head[1] + Math.sin(a) * R;
        CM.chalk.line(ctx, [x0, y0, x0 + Math.cos(a) * 5 * s + 2 * s, y0 + Math.sin(a) * 5 * s - 2 * s, x0 + Math.cos(a) * 9 * s, y0 + Math.sin(a) * 9 * s], { w: 1.6, seed: i + Math.floor(t * 4), alpha: 0.8 });
      }
    });
    m.play('puzzled');
    yield 1.4;
  };
  // 時間：チクタク…何も変わらない
  A.waitTime = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    for (var i = 0; i < 3; i++) {
      pop(D, 'tick', w.x, w.y - 40 * s, COL.chalk, 16);
      D.sfx.play('tiny');
      yield D.tween(0.6, function (k) { w.rot = Math.sin(k * PI * 2) * 0.08; });
    }
    m.play('puzzled');
    pop(D, 'dots', m.x, m.gy - 120 * s, COL.chalk, 18);
    yield D.tween(0.6, function (k) { w.alpha = 1 - k; });
    D.wordVisible = false;
  };
})(window);
