/*
 * CHALK MAN 第3章の演出（act）
 * 結果の文章と同じことが、画面の中で起きるようにする台本。書き方は acts.js と同じ。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var A = CM.ACTS, K = CM.actKit;
  var onGround = K.onGround, topOf = K.topOf, exitX = K.exitX, pop = K.pop, pickUp = K.pickUp, mount = K.mount, cheer = K.cheer;
  function X(D, f) { return D.st.x + D.st.w * f; }
  function hopTo(D, x, sec, h) {
    var w = D.w, x0 = w.x;
    return D.tween(sec, function (k) { w.x = U.lerp(x0, x, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * (h || 8) * D.s; });
  }
  function sparkle(D, x, y, n, color, spread) {
    for (var i = 0; i < n; i++) D.fx.add({ type: 'star', x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread * 0.6, life: 0.8, size: 5 * D.s, color: color });
  }

  // ============================================================
  //  14問目：チョークの粉の嵐
  // ============================================================
  function calm(D, sec) { var sc = D.sc, s0 = sc.storm, p0 = sc.pile; return D.tween(sec, function (k) { sc.storm = s0 * (1 - k); sc.pile = p0 * (1 - k); }); }

  // 傘をさして、粉をはじく
  A.umbrellaDust = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    yield* pickUp(D, 'overhead');
    m.armsUp = true;
    D.follow(function () { sc.shield = { x0: w.x - w.dispW() / 2 - 6 * s, x1: w.x + w.dispW() / 2 + 6 * s, y: w.y }; if (Math.random() < 0.3) D.fx.dust(w.x + w.dispW() / 2, w.y, 1, { angle: -0.4, spread: 0.8, speed: 60, g: 100, color: COL.chalk }); });
    pop(D, 'sfx_pachi2', w.x, w.y - 30 * s, COL.chalk, 16);
    yield D.tween(0.4, function (k) { sc.pile *= 0.9; });
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 62 * s });
  };

  // 掃除機が、粉をぜんぶ吸いこむ
  A.vacuumDust = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, m.x + 70 * s, k); onGround(D, w); });
    D.sfx.play('swirl');
    pop(D, 'sfx_gooo', w.x, w.y - 40 * s, COL.chalk, 22);
    var t = 0;
    D.follow(function (dt) {
      t += dt;
      w.x += Math.sin(t * 50) * 0.6 * s;
      sc.motes.forEach(function (p) { p.x += (w.x + w.dispW() / 2 - p.x) * dt * 3; p.y += (w.y - p.y) * dt * 3; });
    });
    yield calm(D, 1.8);
    m.play('idle');
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 水・雨で、粉がしめってしずまる
  A.wetDust = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, y0 = w.y, x0 = w.x;
    w.tint = COL.blue;
    yield D.tween(0.6, function (k) { w.y = U.lerp(y0, D.st.y + D.st.h * 0.25, U.easeOut(k)); w.x = U.lerp(x0, X(D, 0.55), k); });
    D.sfx.play('splash');
    D.follow(function () { for (var i = 0; i < 2; i++) D.fx.add({ type: 'dust', x: w.x + (Math.random() - 0.5) * w.dispW() * 1.6, y: w.y + w.dispH() / 2, vy: 260, g: 200, life: 0.8, size: 1.6 * s, color: COL.blue }); });
    pop(D, 'sfx_shitoshito', w.x, w.y - 30 * s, COL.blue, 18);
    yield calm(D, 1.6);
    m.play('idle');
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 大きな文字を風よけにして、嵐がおさまるのを待つ
  A.dustWall = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale;
    var big = Math.min(s0 * 2.2, (140 * s) / w.height);
    D.sfx.play('grow');
    yield D.tween(0.6, function (k) { w.scale = U.lerp(s0, big, U.easeBack(k)); w.x = U.lerp(x0, m.x + 50 * s + w.dispW() / 2, k); onGround(D, w); });
    D.sfx.play('thud'); D.fx.shake(5, 0.3);
    sc.shield = { x0: D.st.x - 60 * s, x1: w.x, y: topOf(w) };
    m.play('idle');
    yield 1.2;
    pop(D, 'windowShut', X(D, 0.86), D.st.y + 110 * s, COL.chalk, 14);
    yield calm(D, 1.0);
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 鳥が粉の中で砂あび（鳥・珍回答）
  A.dustBath = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale;
    var sm = Math.min(s0, (50 * s) / w.width);
    yield D.tween(0.6, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, m.x + 60 * s, k); onGround(D, w); w.y -= Math.sin(k * PI) * 30 * s; });
    pop(D, 'sfx_patapata', w.x, w.y - 30 * s, COL.chalk, 18);
    var t = 0;
    D.follow(function (dt) {
      t += dt;
      onGround(D, w); w.y -= Math.abs(Math.sin(t * 14)) * 6 * s; w.rot = Math.sin(t * 20) * 0.15;
      if (Math.random() < 0.5) D.fx.dust(w.x, D.gy, 2, { angle: -PI / 2, spread: 2.4, speed: 60, g: 150, color: COL.chalk });
      sc.motes.forEach(function (p) { p.x += (w.x - p.x) * dt * 2; p.y += (w.y - p.y) * dt * 2; });
    });
    D.sfx.play('flop');
    yield calm(D, 2.0);
    m.play('puzzled');
    pop(D, 'feelsGood', w.x + 30 * s, w.y - 50 * s, COL.chalk, 14);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // ============================================================
  //  15問目：落書きモンスター
  // ============================================================
  function stopMonster(D) { D.sc.approach = false; }

  // けしごむで、ごしごし消す
  A.eraseMonster = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, mon = sc.mon, x0 = w.x, y0 = w.y;
    stopMonster(D);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, mon.x, k); w.y = U.lerp(y0, D.gy - 90 * s, k); });
    pop(D, 'sfx_goshi', mon.x, D.gy - 170 * s, COL.chalk, 20);
    D.sfx.play('wipe');
    var yy = w.y;
    yield D.tween(1.6, function (k) {
      w.x = mon.x + Math.sin(k * 30) * 40 * s; w.y = yy + k * 40 * s; w.rot = Math.sin(k * 30) * 0.2;
      mon.alpha = 1 - k;
      if (Math.random() < 0.5) D.fx.dust(w.x, w.y + w.dispH() / 2, 2, { speed: 40, g: 200, life: 0.7, color: COL.chalk });
    });
    w.rot = 0;
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 武器でえいっ！ 線がほどけて、小さな落書きにもどる
  A.slashMonster = function* (D) {
    var s = D.s, sc = D.sc, mon = sc.mon, m = D.man;
    stopMonster(D);
    yield* pickUp(D, 'swing');
    yield D.walkTo(mon.x - 100 * s, { anim: 'run' });
    m.play('swing');
    yield 0.64;
    D.sfx.play('clang'); D.fx.shake(6, 0.3);
    pop(D, 'sfx_ei', mon.x, D.gy - 170 * s, COL.yellow, 22);
    yield D.tween(0.9, function (k) { mon.unravel = k; mon.alpha = 1 - k * 0.8; });
    m.play('idle');
    sc.tiny = { x: mon.x };
    yield D.tween(0.4, function (k) { mon.alpha = 0.2 * (1 - k); });
    pop(D, 'eek', mon.x, D.gy - 40 * s, COL.chalk, 14);
    var tx = sc.tiny.x;
    yield D.tween(0.8, function (k) { sc.tiny.x = U.lerp(tx, exitX(D) + 40 * s, k); });
    yield D.walkTo(exitX(D));
  };

  // 重い文字で、ぺしゃんこ
  A.squashMonster = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, mon = sc.mon, x0 = w.x, y0 = w.y;
    stopMonster(D);
    D.sfx.play('whoosh');
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, mon.x, k); w.y = U.lerp(y0, D.st.y + 40 * s, U.easeOut(k)); });
    yield 0.2;
    var yy = w.y, gy = D.gy - w.dispH() / 2 - 2;
    yield D.tween(0.3, function (k) { w.y = U.lerp(yy, gy, k * k); mon.flat = Math.max(0, (k - 0.4) / 0.6); });
    D.sfx.play('thud'); D.fx.shake(10, 0.4);
    D.fx.dust(w.x, D.gy, 16, { angle: -PI / 2, spread: 2.6, speed: 100, g: 150 });
    pop(D, 'sfx_pecha', mon.x, D.gy - 90 * s, COL.chalk, 22);
    mon.mode = 'sleep';
    yield 0.8;
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 魔法で、小さくかわいい落書きに
  A.shrinkMonster = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, mon = sc.mon, y0 = w.y;
    stopMonster(D);
    w.tint = COL.purple;
    D.sfx.play('sparkle');
    yield D.tween(0.5, function (k) { w.y = y0 - 30 * s * U.easeOut(k); });
    sparkle(D, mon.x, D.gy - 80 * s, 12, COL.purple, 120 * s);
    pop(D, 'sfx_kira', mon.x, D.gy - 170 * s, COL.purple, 18);
    mon.mode = 'cute';
    yield D.tween(1.2, function (k) { mon.size = U.lerp(1, 0.3, U.easeInOut(k)); });
    D.sfx.play('cute');
    pop(D, 'monCute', mon.x, D.gy - 60 * s, COL.pink, 14);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 身近な人に、しかられて寝てしまう（身近な人・珍回答）
  A.scoldMonster = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, mon = sc.mon, m = D.man;
    stopMonster(D);
    yield hopTo(D, mon.x - 90 * s, 0.8, 8);
    D.sfx.play('boom');
    pop(D, 'kora', w.x, w.y - 50 * s, COL.red, 22);
    yield D.tween(0.3, function (k) { w.sx = w.sy = 1 + 0.2 * Math.sin(k * PI); });
    yield 0.4;
    pop(D, 'goToBed', w.x, w.y - 50 * s, COL.chalk, 14);
    yield 0.6;
    mon.mode = 'sleep';
    D.sfx.play('yawn');
    yield D.tween(0.8, function (k) { mon.size = U.lerp(1, 0.8, k); });
    m.play('puzzled');
    yield 0.8;
    yield D.walkTo(exitX(D), { anim: 'sneak', speed: 55 * s });
  };

  // ============================================================
  //  16問目：赤ペンのバツ印
  // ============================================================
  /** 棒人間が、バツ（または、まる）のところを通りぬける */
  function* walkThrough(D) { yield D.walkTo(exitX(D), { anim: 'walk', speed: 72 * D.s }); }

  // 「まる」と書くと、バツがまるに変わる
  A.turnCircle = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, xs = sc.xs, x0 = w.x, y0 = w.y;
    sc.quiet = true;
    w.tint = COL.red;
    yield D.tween(0.7, function (k) { w.x = U.lerp(x0, xs.x, k); w.y = U.lerp(y0, D.gy - xs.h - 40 * s, k); });
    D.sfx.play('sparkle');
    pop(D, 'sfx_kurutto', xs.x, D.gy - xs.h - 70 * s, COL.red, 18);
    yield D.tween(0.8, function (k) { xs.morph = U.easeInOut(k); w.alpha = 1 - k; });
    D.sfx.play('cheer');
    pop(D, 'correct', xs.x, D.gy - xs.h * 0.5, COL.red, 24);
    yield 0.4;
    yield* walkThrough(D);
  };

  // けしごむで、バツを消す
  A.eraseX = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, xs = sc.xs, x0 = w.x, y0 = w.y, top = D.gy - xs.gap - xs.h;
    sc.quiet = true;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, xs.x, k); w.y = U.lerp(y0, top, k); });
    pop(D, 'sfx_goshi', xs.x + xs.w * 0.6, top, COL.chalk, 18);
    D.sfx.play('wipe');
    yield D.tween(1.6, function (k) {
      xs.erase = k; w.x = xs.x + Math.sin(k * 36) * xs.w * 0.45; w.y = top + xs.h * k;
      if (Math.random() < 0.4) D.fx.dust(w.x, w.y + w.dispH() / 2, 2, { speed: 40, g: 200, life: 0.6, color: COL.red });
    });
    yield D.tween(0.3, function (k) { w.alpha = 1 - k; });
    cheer(D);
    yield 0.5;
    yield* walkThrough(D);
  };

  // 小さな文字について、わくの下のすき間をくぐる
  A.slipX = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, xs = sc.xs, m = D.man, s0 = w.scale;
    sc.quiet = true;
    var sm = Math.min(s0, (xs.gap * 0.9) / w.height);
    yield D.tween(0.4, function (k) { w.scale = U.lerp(s0, sm, k); onGround(D, w); });
    var x0 = w.x, l = xs.x - xs.w / 2, r = xs.x + xs.w / 2;
    yield D.tween(1.2, function (k) { w.x = U.lerp(x0, r + 30 * s, k); onGround(D, w); });
    pop(D, 'foundGap', l, D.gy - 40 * s, COL.chalk, 14);
    yield D.walkTo(l - 50 * s, { anim: 'walk' });
    m.play('lie');
    D.sfx.play('stretch');
    pop(D, 'sfx_zuri', m.x, D.gy - 50 * s, COL.chalk, 14);
    var mx = m.x;
    yield D.tween(1.6, function (k) { m.x = U.lerp(mx, r + 10 * s, k); });
    m.play('idle');
    cheer(D);
    yield 0.5;
    yield* walkThrough(D);
  };

  // 飛ぶ文字で、バツの上を飛びこえる
  A.flyOverX = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, xs = sc.xs, m = D.man;
    sc.quiet = true;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    var x0 = w.x, y0 = w.y, top = D.gy - xs.gap - xs.h, peak = top - 8 * s - w.dispH() / 2;
    // 高く飛ぶので、カメラを少し引く（地面の高さはそのまま）
    var z = 0.78, st = D.st;
    D.follow(D.camTo({ cx: st.x + st.w / 2, cy: D.gy - (D.gy - st.y - st.h / 2) / z, z: z }, 0.6));
    pop(D, 'sfx_fuwa', m.x, topOf(w) - 60 * s, COL.chalk, 18);
    yield D.tween(2.4, function (k) {
      w.x = U.lerp(x0, exitX(D) + 40 * s, k);
      w.y = U.lerp(y0, peak, Math.sin(Math.min(1, k * 1.6) * PI / 2)) + Math.sin(k * 10) * 3 * s;
    });
  };

  // 先生が来て、はなまるに書き直す（先生・珍回答）
  A.teacherFix = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, xs = sc.xs, m = D.man;
    sc.quiet = true;
    yield hopTo(D, xs.x - xs.w / 2 - 20 * s - w.dispW() / 2, 0.8, 6);
    pop(D, 'hmm', w.x, w.y - 40 * s, COL.chalk, 14);
    yield 0.6;
    pop(D, 'oopsMistake', w.x, w.y - 50 * s, COL.chalk, 14);
    yield 0.6;
    xs.star = true;
    D.sfx.play('sparkle');
    yield D.tween(0.9, function (k) { xs.morph = U.easeInOut(k); });
    pop(D, 'hanamaru', xs.x, D.gy - xs.h * 0.5, COL.yellow, 22);
    D.sfx.play('cheer');
    m.play('cheer');
    yield 0.8;
    yield* walkThrough(D);
  };

  // ============================================================
  //  17問目：時計の針
  // ============================================================
  /** 分針の先の位置 */
  function handTip(c, k) { var a = CM.SCENES.clock.angles(c).m + (c.droop || 0); return { x: c.x + Math.cos(a) * c.r * (k || 0.82), y: c.y + Math.sin(a) * c.r * (k || 0.82) }; }

  // 重い文字を分針にぶら下げる
  A.hangWeight = function* (D) {
    var w = D.w, s = D.s, c = D.sc.clk, x0 = w.x, y0 = w.y;
    D.sfx.play('whoosh');
    var tip = handTip(c);
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, tip.x, k); w.y = U.lerp(y0, tip.y + w.dispH() / 2 + 6 * s, k) - Math.sin(k * PI) * 40 * s; });
    c.running = false;
    D.sfx.play('thud');
    pop(D, 'sfx_zushi', tip.x + 40 * s, tip.y, COL.chalk, 18);
    D.follow(function () { var tp = handTip(c); w.x = tp.x; w.y = tp.y + w.dispH() / 2 + 4 * s; w.rot = Math.sin(D.time * 3) * 0.05; });
    yield D.tween(0.5, function (k) { c.droop = 0.12 * k; });
    pop(D, 'stopped', c.x, c.y + c.r + 40 * s, COL.yellow, 18);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 長い文字を、針のあいだのつっかえ棒に
  A.jamHands = function* (D) {
    var w = D.w, s = D.s, c = D.sc.clk, x0 = w.x, y0 = w.y, s0 = w.scale;
    var A2 = CM.SCENES.clock.angles(c), mid = (A2.m + A2.h) / 2 + PI;   // 2本の針の外がわ（開いているほう）
    var sm = Math.min(s0, (c.r * 0.9) / w.width);
    var tx = c.x + Math.cos(mid) * c.r * 0.45, ty = c.y + Math.sin(mid) * c.r * 0.45;
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, tx, k); w.y = U.lerp(y0, ty, k); w.rot = (mid + PI / 2) * k; });
    c.running = false;
    D.sfx.play('clink');
    pop(D, 'sfx_gachi', c.x, c.y - c.r - 30 * s, COL.chalk, 18);
    yield D.tween(0.4, function (k) { w.rot = mid + PI / 2 + Math.sin(k * 30) * 0.05 * (1 - k); });
    pop(D, 'stopped', c.x, c.y + c.r + 40 * s, COL.yellow, 18);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 時間のことばで、針がうしろにもどる
  A.rewind = function* (D) {
    var w = D.w, s = D.s, c = D.sc.clk, x0 = w.x, y0 = w.y;
    c.running = false;
    D.sfx.play('fly');
    yield D.tween(0.7, function (k) { w.x = U.lerp(x0, c.x - c.r - 50 * s, k); w.y = U.lerp(y0, c.y, k); });
    D.sfx.play('swirl');
    pop(D, 'sfx_kurukuru', c.x, c.y - c.r - 30 * s, COL.chalk, 20);
    c.spin = 90;
    yield D.tween(1.6, function (k) { w.rot = -k * TAU; });
    c.spin = 0;
    w.rot = 0;
    pop(D, 'moreTime', c.x, c.y + c.r + 40 * s, COL.yellow, 18);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 魔法で、時計がこおりついたように止まる
  A.freezeClock = function* (D) {
    var w = D.w, s = D.s, c = D.sc.clk, y0 = w.y;
    w.tint = COL.purple;
    D.sfx.play('sparkle');
    yield D.tween(0.5, function (k) { w.y = y0 - 30 * s * U.easeOut(k); });
    c.running = false;
    D.sfx.play('freeze');
    for (var i = 0; i < 12; i++) D.fx.add({ type: 'frost', x: c.x + (Math.random() - 0.5) * c.r * 2, y: c.y + (Math.random() - 0.5) * c.r * 2, vy: 10, vr: 2, life: 1.4, size: 5 * s, color: COL.ice });
    pop(D, 'sfx_pita', c.x, c.y - c.r - 30 * s, COL.ice, 20);
    c.frozen = 1;
    yield 0.6;
    pop(D, 'stopped', c.x, c.y + c.r + 40 * s, COL.yellow, 18);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // 鳥が時計に住みついて、はと時計に（鳥・珍回答）
  A.cuckoo = function* (D) {
    var w = D.w, s = D.s, c = D.sc.clk, x0 = w.x, y0 = w.y, s0 = w.scale;
    var sm = Math.min(s0, (30 * s) / w.width);
    D.sfx.play('fly');
    var hy = c.y - c.r - 14 * s;
    yield D.tween(0.9, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, c.x, k); w.y = U.lerp(y0, hy, k) - Math.sin(k * PI) * 30 * s; });
    c.house = true; c.running = false;
    D.sfx.play('pop');
    yield D.tween(0.3, function (k) { w.alpha = 1 - k; });
    for (var i = 0; i < 3; i++) {
      yield 0.3;
      w.alpha = 1;
      yield D.tween(0.25, function (k) { w.y = hy - 20 * s * k; });
      D.sfx.play('note', i % 2 ? 4 : 2);
      pop(D, 'poppo', c.x + c.r + 30 * s, c.y - 10 * s, COL.chalk, 16);
      yield D.tween(0.25, function (k) { w.y = hy - 20 * s * (1 - k); });
      w.alpha = 0;
    }
    D.man.play('puzzled');
    yield 0.4;
    yield D.walkTo(exitX(D));
  };

  // ============================================================
  //  18問目：せまる黒板消し
  // ============================================================
  /** 黒板消しが、右はしまで一気に消していく（安全なところ以外） */
  function* eraserSweep(D, sec) {
    var sc = D.sc, s = D.s, x0 = sc.ex;
    sc.moving = true; sc.speed = 2.4; sc.stopX = D.st.x + D.st.w + 200;
    var target = D.st.x + D.st.w + 40 * s;
    yield D.tween(sec || 2.4, function (k) { sc.ex = U.lerp(x0, target, k); });
    yield D.tween(0.5, function (k) { sc.e.y -= 12 * s; sc.e.alpha = 1 - k; });
    sc.moving = false;
  }

  // のりで、黒板消しがくっつく
  A.glueEraser = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x, y0 = w.y;
    var gx = sc.ex + 70 * s, gyy = D.st.y + D.st.h * 0.45;
    w.tint = COL.yellow;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, gx, k); w.y = U.lerp(y0, gyy, k); });
    pop(D, 'sfx_nuri', gx, gyy - 30 * s, COL.yellow, 16);
    sc.glue = { x: gx, y: gyy };
    yield D.tween(0.3, function (k) { w.alpha = 1 - k; });
    // 黒板消しが、のりの上へ…ベタッ
    sc.moving = false;
    var ex0 = sc.e.x, ey0 = sc.e.y;
    yield D.tween(0.8, function (k) { sc.e.x = U.lerp(ex0, gx, k); sc.e.y = U.lerp(ey0, gyy, k); sc.ex = sc.e.x; });
    D.sfx.play('flop');
    pop(D, 'sfx_beta', gx, gyy - 40 * s, COL.yellow, 22);
    yield D.tween(1.2, function (k) { sc.e.x = gx + Math.sin(k * 60) * 4 * s; sc.e.rot = Math.sin(k * 40) * 0.1; });
    pop(D, 'eraserStuck', gx, gyy + 40 * s, COL.chalk, 14);
    cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };

  // かたい文字のかげにかくれて、やりすごす
  A.hardBlock = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, x0 = w.x, s0 = w.scale;
    var big = Math.min(s0 * 2, (120 * s) / w.height);
    yield D.tween(0.6, function (k) { w.scale = U.lerp(s0, big, U.easeBack(k)); w.x = U.lerp(x0, m.x - 30 * s - w.dispW() / 2, k); onGround(D, w); });
    D.sfx.play('thud');
    m.play('shiver');
    pop(D, 'hide', m.x + 20 * s, D.gy - 130 * s, COL.chalk, 14);
    sc.safe.push({ x0: w.x - w.dispW() / 2 - 4 * s, y0: topOf(w) - 10 * s, x1: m.x + 40 * s, y1: D.gy + 30 * s });
    yield* eraserSweep(D, 2.6);
    pop(D, 'cantErase', w.x, topOf(w) - 30 * s, COL.yellow, 16);
    m.play('idle');
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 小さな文字が、黒板のすみのすき間を見つける
  A.hideCorner = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man, cx = D.st.x + D.st.w - 18 * s;
    yield hopTo(D, cx, 0.8, 6);
    pop(D, 'foundGap', cx - 20 * s, D.gy - 40 * s, COL.chalk, 14);
    D.chalkHook(function (ctx) { CM.chalk.line(ctx, [cx - 12 * s, D.gy, cx - 12 * s, D.gy - 20 * s, cx + 14 * s, D.gy - 20 * s], { w: 2, seed: 5 }); });
    yield D.walkTo(cx - 30 * s, { anim: 'walk' });
    var mx = m.x;
    yield D.tween(0.6, function (k) { m.k = U.lerp(1, 0.22, k); m.x = U.lerp(mx, cx, k); });
    sc.safe.push({ x0: cx - 30 * s, y0: D.gy - 40 * s, x1: D.st.x + D.st.w + 10, y1: D.gy + 20 * s });
    yield* eraserSweep(D, 2.4);
    yield D.tween(0.5, function (k) { m.k = U.lerp(0.22, 1, k); });
    cheer(D);
    yield 0.6;
    yield D.walkTo(exitX(D));
  };

  // 飛ぶ文字で、黒板のいちばん上へ逃げる
  A.escapeFly = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    var x0 = w.x, y0 = w.y, ty = D.st.y + D.st.h * 0.5;
    pop(D, 'toTop', m.x, topOf(w) - 60 * s, COL.chalk, 16);
    yield D.tween(1.0, function (k) { w.y = U.lerp(y0, ty + w.dispH(), U.easeOut(k)); });
    sc.safe.push({ x0: D.st.x - 40, y0: D.st.y - 40, x1: D.st.x + D.st.w + 40, y1: ty + w.dispH() * 1.5 + 6 * s });
    sc.top = ty + w.dispH() * 1.5 + 30 * s;   // 黒板消しは、ここより下だけを消す
    yield* eraserSweep(D, 2.2);
    var wx = w.x;
    yield D.tween(1.2, function (k) { w.x = U.lerp(wx, exitX(D) + 40 * s, U.easeIn(k)); });
  };

  // かわいすぎて、消せない（かわいい・珍回答）
  A.tooCute = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, x0 = w.x;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, sc.ex + 80 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 8 * s; });
    sc.moving = false;
    var ex0 = sc.e.x;
    D.sfx.play('cute');
    yield D.tween(0.6, function (k) { sc.e.x = U.lerp(ex0, w.x - 50 * s, k); sc.e.y = U.lerp(sc.e.y, D.gy - 60 * s, k); });
    pop(D, 'tooCuteSay', sc.e.x, sc.e.y - 50 * s, COL.pink, 16);
    for (var i = 0; i < 6; i++) D.fx.add({ type: 'heart', x: sc.e.x + (Math.random() - 0.5) * 50 * s, y: sc.e.y - 20 * s, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.2, size: 7 * s, color: COL.pink });
    yield D.tween(0.8, function (k) { sc.e.rot = Math.sin(k * 20) * 0.15; });
    var ey0 = sc.e.y;
    yield D.tween(1.0, function (k) { sc.e.y = U.lerp(ey0, D.st.y - 60 * s, U.easeIn(k)); sc.e.alpha = 1 - k; });
    D.man.play('puzzled');
    yield 0.5;
    yield D.walkTo(exitX(D));
  };

  // ============================================================
  //  19問目：鍵のかかった扉
  // ============================================================
  /** 開いた扉に入っていく */
  function* enterDoor(D) {
    var m = D.man, d = D.sc.door;
    yield D.walkTo(d.x, { anim: 'walk', speed: 72 * D.s });
    yield D.tween(0.5, function (k) { m.alpha = 1 - k; });
  }
  function openDoor(D, sec) { var d = D.sc.door; return D.tween(sec || 0.8, function (k) { d.open = U.easeOut(k); }); }

  // 鍵で開ける
  A.unlock = function* (D) {
    var w = D.w, s = D.s, d = D.sc.door, x0 = w.x, y0 = w.y, s0 = w.scale;
    var sm = Math.min(s0, (40 * s) / w.width), ly = D.gy - d.h * 0.38;
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, d.x - 26 * s, k); w.y = U.lerp(y0, ly, k); });
    yield D.tween(0.3, function (k) { w.rot = k * PI / 2; });
    D.sfx.play('clink');
    pop(D, 'sfx_kacha', d.x, ly - 40 * s, COL.yellow, 20);
    yield D.tween(0.4, function (k) { d.lock = 1 - k; w.alpha = 1 - k; });
    D.sfx.play('stretch');
    yield openDoor(D);
    cheer(D);
    yield 0.5;
    yield* enterDoor(D);
  };

  // 小さな文字といっしょに、鍵穴をくぐる
  A.keyhole = function* (D) {
    var w = D.w, s = D.s, d = D.sc.door, m = D.man, s0 = w.scale;
    var kx = d.x + d.w / 2 - 12 * s, ky = D.gy - d.h + d.h * 0.58 + 16 * s;
    var sm = Math.min(s0, (16 * s) / w.width), x0 = w.x, y0 = w.y;
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, sm, k); w.x = U.lerp(x0, kx, k); w.y = U.lerp(y0, ky, k); });
    D.sfx.play('tiny');
    yield D.tween(0.3, function (k) { w.alpha = 1 - k; });
    yield D.walkTo(d.x - d.w / 2 - 20 * s, { anim: 'walk' });
    pop(D, 'sfx_shukun', kx, ky - 30 * s, COL.chalk, 16);
    D.sfx.play('whoosh');
    var mx = m.x, g0 = m.gy;
    yield D.tween(0.9, function (k) { m.k = U.lerp(1, 0.12, k); m.x = U.lerp(mx, kx, k); m.gy = U.lerp(g0, ky + 6 * s, k); });
    yield D.tween(0.3, function (k) { m.alpha = 1 - k; });
  };

  // 魔法で、扉がひとりでに開く
  A.magicOpen = function* (D) {
    var w = D.w, s = D.s, d = D.sc.door, y0 = w.y;
    w.tint = COL.purple;
    D.sfx.play('sparkle');
    yield D.tween(0.5, function (k) { w.y = y0 - 30 * s * U.easeOut(k); });
    sparkle(D, d.x, D.gy - d.h * 0.5, 12, COL.purple, 90 * s);
    pop(D, 'sfx_gigii', d.x, D.gy - d.h - 30 * s, COL.orange, 18);
    D.sfx.play('stretch');
    yield D.tween(0.4, function (k) { d.lock = 1 - k; });
    yield openDoor(D, 1.0);
    yield* enterDoor(D);
  };

  // 武器で、扉をこわす
  A.breakDoor = function* (D) {
    var s = D.s, d = D.sc.door, m = D.man;
    yield* pickUp(D, 'swing');
    yield D.walkTo(d.x - d.w / 2 - 60 * s, { anim: 'walk' });
    m.play('swing');
    yield 0.64;
    D.sfx.play('snap'); D.fx.shake(8, 0.4);
    pop(D, 'crack', d.x, D.gy - d.h - 20 * s, COL.chalk, 22);
    d.broken = 1;
    for (var i = 0; i < 8; i++) D.fx.add({ type: 'crumb', x: d.x, y: D.gy - d.h * 0.5, vx: (Math.random() - 0.3) * 200 * s, vy: -150 * s * Math.random(), g: 700, life: 0.8, size: 4 * s, vr: 8, color: COL.orange });
    yield 0.5;
    m.play('idle');
    yield* enterDoor(D);
  };

  // コンコン…「はーい」（音が出る・珍回答）
  A.knock = function* (D) {
    var w = D.w, s = D.s, d = D.sc.door, m = D.man;
    yield hopTo(D, d.x - d.w / 2 - w.dispW() / 2 - 4 * s, 0.8, 6);
    for (var i = 0; i < 2; i++) {
      yield D.tween(0.18, function (k) { w.x += 1.5 * s * (k < 0.5 ? 1 : -1); });
      D.sfx.play('clink');
      pop(D, 'sfx_konkon', d.x, D.gy - d.h * 0.7, COL.chalk, 16);
      yield 0.3;
    }
    yield 0.6;
    pop(D, 'haai', d.x, D.gy - d.h - 40 * s, COL.yellow, 18);
    d.lock = 0;
    yield openDoor(D);
    m.play('puzzled');
    pop(D, 'who', m.x, D.gy - 130 * s, COL.chalk, 14);
    yield 0.8;
    yield* enterDoor(D);
  };

  // ============================================================
  //  20問目：最後に一言
  // ============================================================
  function* writeBig(D, feeling) {
    var w = D.w, s = D.s, x0 = w.x, y0 = w.y, s0 = w.scale;
    var big = Math.min((D.st.w * 0.8) / w.width, (70 * s) / w.height);
    var tx = D.st.x + D.st.w / 2, ty = D.st.y + D.st.h * 0.36;
    if (feeling) w.tint = COL.pink;
    D.sfx.play('grow');
    yield D.tween(1.2, function (k) { w.scale = U.lerp(s0, big, U.easeInOut(k)); w.x = U.lerp(x0, tx, U.easeInOut(k)); w.y = U.lerp(y0, ty, U.easeInOut(k)); });
    if (feeling) {
      D.sfx.play('cute');
      for (var i = 0; i < 10; i++) D.fx.add({ type: 'heart', x: tx + (Math.random() - 0.5) * w.dispW(), y: ty, vy: -40, vx: (Math.random() - 0.5) * 50, life: 1.4, size: 7 * s, color: COL.pink });
      w.shine = 0;
      yield D.tween(0.8, function (k) { w.shine = k; });
      w.shine = -1;
    } else {
      D.sfx.play('sparkle');
      yield 0.6;
    }
  }
  /** 手をふって、自由帳に飛びこむ */
  function* jumpIntoNotebook(D) {
    var m = D.man, s = D.s, nb = D.sc.nb;
    m.play('cheer');
    pop(D, 'byeBye', m.x, D.gy - 130 * s, COL.yellow, 18);
    yield 1.2;
    yield D.walkTo(X(D, 0.68), { anim: 'run' });
    yield D.hop(m, nb.x, nb.y - nb.h * 0.5, 50 * s, 0.8);
    D.sfx.play('pop');
    yield D.tween(0.4, function (k) { m.alpha = 1 - k; nb.glow = 1; });
  }
  A.lastFeeling = function* (D) { yield* writeBig(D, true); yield* jumpIntoNotebook(D); };
  A.lastWord = function* (D) { yield* writeBig(D, false); yield* jumpIntoNotebook(D); };
})(window);
