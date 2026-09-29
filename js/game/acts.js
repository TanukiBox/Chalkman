/*
 * CHALK MAN 演出（act）
 * 判定の結果の「文章」と同じことが、画面の中で起きるようにする台本。
 * 例：「アリの大群がやって来て、つながって橋になった」→ 小さな「アリ」の文字がたくさん行進してきて、崖の上で1列につながる。
 *
 * 1つの演出は、上から順に進む台本（function*）。
 *   yield 0.5                     … 0.5秒待つ
 *   yield D.tween(0.6, function (k) { … })   … 0.6秒かけて動かす（k が 0→1）
 *   yield D.walkTo(x)            … 棒人間が x まで歩く（遠ければ走る）
 *   yield D.all([ … ])           … いくつかを同時に進めて、全部終わるまで待つ
 * D.w＝書いた文字、D.man＝棒人間、D.sc＝黒板の様子（scenes.js）、D.gy＝地面の高さ、D.s＝棒人間の大きさ
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;
  var A = CM.ACTS = {};

  // ---- 小さな道具 ----
  /** 文字の下のはしを地面(gy)に合わせる */
  function onGround(D, w, gy) { w.y = (gy === undefined ? D.gy : gy) - w.dispH() / 2 - 2; }
  /** 文字の上のはしの高さ */
  function topOf(w) { return w.y - w.dispH() / 2; }
  /** ステージの右の外（退場する場所） */
  function exitX(D) { var v = D.view || D.st; return v.x + v.w + 60 * D.s; }
  function pop(D, key, x, y, color, size) {
    // カメラを引いているときは、文字を大きめに（小さくなりすぎないように）
    var k = D.cam ? Math.pow(1 / D.cam.z, 0.85) : 1;
    D.fx.word(D.T(key), x, y, { size: ((size || 20) * D.s + 6) * k, color: color || COL.chalk });
  }
  /** 棒人間が文字に歩いていって、手に取る */
  function* pickUp(D, mode) {
    yield D.walkTo(D.w.x - 24 * D.s);
    D.held = mode || 'front';
    D.sfx.play('pickup');
    yield 0.2;
  }
  /** 手から離した文字を、地面に落とす */
  function* dropWord(D) {
    var w = D.w;
    D.held = null;
    var y0 = w.y, r0 = w.rot;
    w.rot = 0;
    var yg = D.gy - w.dispH() / 2 - 2;
    w.rot = r0;
    yield D.tween(0.35, function (k) { w.y = U.lerp(y0, yg, k * k); w.rot = U.lerp(r0, 0.12, k); });
    D.sfx.play('clink');
    D.fx.dust(w.x, D.gy, 6, { angle: -PI / 2, spread: 2.4, speed: 50, g: 120 });
  }
  /** 崖・地面のない所の、はし（x0）からはし（x1）まで */
  function gapSpan(D) {
    var g = D.sc.gap || { x0: D.st.x + D.st.w * 0.4, x1: D.st.x + D.st.w * 0.68 };
    return { x0: g.x0 - 10 * D.s, x1: Math.min(g.x1 + 10 * D.s, D.st.x + D.st.w + 40) };
  }
  /** 棒人間が文字の上に跳び乗って、またがる */
  function* mount(D) {
    var m = D.man, w = D.w;
    yield D.hop(m, w.x - 4 * D.s, topOf(w) + 24 * D.s, 26 * D.s, 0.45);
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * D.s; m.gy = topOf(w) + 1; });
  }

  // ============================================================
  //  成功・珍回答の演出（問題ごと）
  // ============================================================

  // 乗って飛んでいく（飛ぶ）
  A.ride = function* (D) {
    var w = D.w, m = D.man, s = D.s;
    D.sfx.play('fly');
    pop(D, 'sfx_fuwa', w.x, topOf(w) - 16 * s, COL.chalk, 18);
    yield D.tween(0.5, function (k) { w.x = U.lerp(D.sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    var x0 = w.x, y0 = w.y;
    yield D.tween(2.2, function (k) {
      w.x = U.lerp(x0, exitX(D) + 40 * s, U.easeIn(k));
      w.y = y0 - D.st.h * 0.22 * U.easeOut(k) + Math.sin(k * 12) * 4 * s;
      w.rot = Math.sin(k * 9) * 0.05;
      if (Math.random() < 0.2) D.fx.dust(w.x - w.dispW() / 2, w.y + w.dispH() / 2, 1, { angle: PI, spread: 0.6, speed: 40, g: 20 });
    });
  };

  // のびて道・橋になる（長い）
  A.extend = function* (D) {
    var w = D.w, s = D.s, sp = gapSpan(D);
    var baseW = w.width * w.scale, need = U.clamp((sp.x1 - sp.x0) / baseW, 0.3, 12);
    // はしに移動して、上のはしを地面の高さにそろえる
    yield D.tween(0.5, function (k) {
      w.x = U.lerp(D.sc.restX, sp.x0 + baseW / 2, k);
      w.y = U.lerp(D.gy - w.dispH() / 2 - 2, D.gy + w.dispH() / 2, k);
    });
    D.sfx.play('stretch');
    pop(D, 'sfx_stretch', (sp.x0 + sp.x1) / 2, D.gy - 40 * s, COL.chalk, 22);
    yield D.tween(0.9, function (k) {
      w.sx = U.lerp(1, need, U.easeBack(k));
      w.x = sp.x0 + baseW * w.sx / 2;
    });
    yield 0.2;
    m_cheer(D);
    yield 0.5;
    yield D.walkTo(exitX(D));
  };

  // 空から落ちてきて、橋・地面になる（ドスン）
  function* dropSpan(D) {
    var w = D.w, s = D.s, sp = gapSpan(D);
    var baseW = w.width * w.scale, need = U.clamp((sp.x1 - sp.x0) / baseW, 0.3, 12);
    var mid = (sp.x0 + sp.x1) / 2, x0 = w.x, y0 = w.y, hy = D.st.y + D.st.h * 0.25;
    D.sfx.play('whoosh');
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, mid, k); w.y = U.lerp(y0, hy, U.easeOut(k)); w.rot = Math.sin(k * PI) * 0.4; });
    yield D.tween(0.35, function (k) { w.sx = U.lerp(1, need, U.easeOut(k)); });
    yield D.tween(0.3, function (k) { w.y = U.lerp(hy, D.gy + w.dispH() / 2, k * k); });
    D.sfx.play('thud');
    D.fx.shake(8, 0.4);
    D.fx.dust(sp.x0, D.gy, 10, { angle: -PI / 2, spread: 2, speed: 90, g: 120 });
    D.fx.dust(sp.x1, D.gy, 10, { angle: -PI / 2, spread: 2, speed: 90, g: 120 });
    pop(D, 'sfx_thud', mid, D.gy - 50 * s, COL.chalk, 26);
    yield 0.6;
    m_cheer(D);
    yield 0.5;
    yield D.walkTo(exitX(D));
  }
  A.floor = dropSpan;   // 地面になる
  A.bridge = dropSpan;  // 橋になる

  // いくつも並べて足場にする（硬い）
  A.stepping = function* (D) {
    var w = D.w, s = D.s, sp = gapSpan(D), m = D.man;
    var stoneW = Math.min(w.width * w.scale, 64 * s);
    var sc = stoneW / w.width;
    var n = U.clamp(Math.round((sp.x1 - sp.x0) / (stoneW * 1.45)), 2, 7);
    var step = (sp.x1 - sp.x0) / n;
    var stones = [];
    for (var i = 0; i < n; i++) {
      var c = i === 0 ? w : D.copy();
      c.scale = sc;
      stones.push({ w: c, x: sp.x0 + step * (i + 0.5) });
      if (i > 0) { c.x = stones[i].x; c.y = D.st.y - 40; }
    }
    var wx0 = w.x, wy0 = w.y;
    // 1つずつ、上から落ちてきて並ぶ（1つめは書いた文字）
    for (i = 0; i < n; i++) {
      (function (st, idx) {
        var sx0 = idx === 0 ? wx0 : st.x, sy0 = idx === 0 ? wy0 : D.st.y - 40;
        D.follow(D.tween(0.4, function (k) {
          st.w.x = U.lerp(sx0, st.x, k);
          st.w.y = U.lerp(sy0, D.gy + st.w.dispH() / 2 - 2, k * k);
        }));
      })(stones[i], i);
      yield 0.4;
      D.sfx.play('clink');
      pop(D, 'sfx_clink', stones[i].x, D.gy - 26 * s, COL.chalk, 14);
      D.fx.dust(stones[i].x, D.gy, 4, { angle: -PI / 2, spread: 2, speed: 40, g: 120 });
    }
    yield 0.3;
    // ぴょんぴょん渡る
    for (i = 0; i < n; i++) yield D.hop(m, stones[i].x, D.gy, 22 * s, 0.38);
    yield D.hop(m, exitX(D), D.gy, 30 * s, 0.6);
  };

  // おんぶして運んでくれる（人）
  A.carry = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    var x0 = w.x;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, m.x + 22 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 5 * s; });
    pop(D, 'sfx_yoisho', m.x, D.gy - 80 * s, COL.chalk, 16);
    yield* mount(D);
    var xs = w.x;
    yield D.tween(3, function (k) {
      w.x = U.lerp(xs, exitX(D) + 20 * s, k);
      onGround(D, w, D.gy);
      w.y -= Math.abs(Math.sin(k * PI * 10)) * 6 * s;
      w.rot = Math.sin(k * PI * 10) * 0.05;
    });
  };

  // ピカッと光って、道が見える（光る）
  A.light = function* (D) {
    var w = D.w, s = D.s, sc = D.sc;
    var x0 = w.x, y0 = w.y, ty = D.gy - D.st.h * 0.28;
    var L = { x: w.x, y: w.y, r: 20 * s, color: 'rgba(255,230,140,A)' };
    sc.lights && sc.lights.push(L);
    w.tint = COL.yellow;
    D.follow(function () { L.x = w.x; L.y = w.y; });
    yield D.tween(0.8, function (k) { w.y = U.lerp(y0, ty, U.easeOut(k)); w.x = U.lerp(x0, D.st.x + D.st.w * 0.42, k); });
    D.sfx.play('glow');
    pop(D, 'sfx_pika', w.x, w.y - 30 * s, COL.yellow, 26);
    D.chalkHook(function (ctx, t) { drawRays(ctx, w, t, s); });
    yield D.tween(0.8, function (k) { L.r = U.lerp(20 * s, D.st.w * 1.1, U.easeOut(k)); if (sc.dark !== undefined) sc.dark = U.lerp(1, 0.25, k); });
    m_cheer(D);
    yield 0.8;
    yield D.walkTo(exitX(D));
  };
  function drawRays(ctx, w, t, s) {
    var n = 12, r0 = w.dispW() * 0.55 + 8 * s, r1 = r0 + 16 * s;
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + t * 0.5, p = 0.8 + 0.2 * Math.sin(t * 5 + i);
      CM.chalk.line(ctx, [w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0 * 0.7, w.x + Math.cos(a) * r1 * p, w.y + Math.sin(a) * r1 * p * 0.7], { w: 2, color: COL.yellow, seed: i + Math.floor(t * 6), alpha: 0.8 });
    }
  }

  // 高くかかげると赤く光る（熱い）
  A.torch = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    yield* pickUp(D, 'overhead');
    w.tint = COL.red;
    m.armsUp = true;
    var L = { x: w.x, y: w.y, r: 20 * s, color: 'rgba(255,120,70,A)' };
    sc.lights && sc.lights.push(L);
    D.follow(function () {
      L.x = w.x; L.y = w.y;
      if (Math.random() < 0.3) D.fx.add({ type: 'spark', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y - w.dispH() / 2, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, g: -20, life: 0.6, size: 1.6, color: COL.orange });
    });
    D.sfx.play('fire');
    yield D.tween(0.9, function (k) { L.r = U.lerp(20 * s, D.st.w * 0.55, U.easeOut(k)); if (sc.dark !== undefined) sc.dark = U.lerp(1, 0.55, k); });
    yield 0.4;
    yield D.walkTo(exitX(D));
  };

  // 音がこだまして、なんとなく道がわかる（音が出る・珍回答）
  A.echo = function* (D) {
    var w = D.w, s = D.s, sc = D.sc, m = D.man;
    for (var i = 0; i < 3; i++) {
      D.sfx.play('note', i * 2);
      D.fx.ring(w.x, w.y, 10 * s, Math.min(D.st.w * 0.6, D.gy - D.st.y - 10), { life: 1.0, size: 2 });
      w.sx = w.sy = 1.15;
      yield D.tween(0.2, function (k) { w.sx = w.sy = U.lerp(1.15, 1, k); });
      sc.reveal = 1;
      D.fx.add({ type: 'note', text: '♪', x: w.x, y: w.y - 20 * s, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1, size: 20 * s + 4, color: COL.yellow });
      yield 0.5;
    }
    m.play('puzzled');
    pop(D, 'hmm', m.x, D.gy - 100 * s, COL.chalk, 16);
    yield 1.2;
    // おそるおそる進む
    yield D.walkTo(D.st.x + D.st.w * 0.5, { anim: 'walk', speed: 30 * s });
    m.play('puzzled');
    yield 0.6;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 34 * s });
  };

  // 大群がやって来て、つながって橋になる（虫・珍回答）
  A.swarm = function* (D) {
    var w = D.w, s = D.s, sp = gapSpan(D), m = D.man;
    // 「大群」に見えるよう、読める大きさの文字を 2段に並べて橋にする（残りは崖のてまえに並ぶ）
    var gapW = sp.x1 - sp.x0;
    var small = U.clamp(gapW / (4.5 * w.width), 15 / 64, w.scale * 0.6), antW = w.width * small, antH = 64 * small;
    var perRow = Math.max(3, Math.round(gapW / (antW * 1.02)));
    var spacing = gapW / perRow;
    var slots = [];
    for (var r = 0; r < 2; r++) {
      for (var k = 0; k < perRow - r; k++) slots.push({ x: sp.x0 + spacing * (k + 0.5 + r * 0.5), dy: r * antH * 0.85 });
    }
    slots.sort(function (a, b) { return b.x - a.x || a.dy - b.dy; });
    var n = slots.length, extra = 6;
    var ants = [];
    var wx0 = w.x;
    yield D.tween(0.3, function (k) { w.scale = U.lerp(small * 2, small, k); onGround(D, w); });
    D.sfx.play('pop');
    for (var i = 0; i < n + extra; i++) {
      var c = i === 0 ? w : D.copy();
      c.scale = small;
      // 先に着いた文字ほど、崖の向こう側へ（先頭が一番遠く）
      var slot = i < n ? slots[i] : { x: sp.x0 - (i - n + 0.8) * antW * 1.05, dy: 0 };
      ants.push({ w: c, t0: i * 0.12, start: i === 0 ? wx0 : D.st.x - 20 * s - i * antW * 0.9, slotX: slot.x, dy: slot.dy, done: false });
    }
    pop(D, 'sfx_warawara', D.st.x + D.st.w * 0.2, D.gy - 70 * s, COL.chalk, 22);
    var speed = 150 * s, t = 0, chainY;
    D.follow(function (dt) {
      t += dt;
      ants.forEach(function (a, i) {
        var tt = Math.max(0, t - a.t0);
        var x = Math.min(a.slotX, a.start + speed * tt);
        var c = a.w, h = c.dispH();
        var inGap = x > sp.x0 && x < sp.x1 - 4;
        var yGround = D.gy - h / 2 - 2, yChain = D.gy + h / 2 - 2 + a.dy;
        c.x = x;
        c.y = inGap ? yChain : yGround;
        if (x < a.slotX) { c.y -= Math.abs(Math.sin(tt * 16 + i)) * 4 * s; c.rot = Math.sin(tt * 16 + i) * 0.08; }
        else { c.rot = Math.sin(t * 6 + i) * 0.04; if (!a.done) { a.done = true; if (i % 3 === 0) D.sfx.play('tiny'); } }
      });
      if (Math.random() < 0.3) D.sfx.play('patter');
    });
    yield function () { return ants.every(function (a) { return a.done; }); };
    pop(D, 'sfx_gyu', (sp.x0 + sp.x1) / 2, D.gy - 40 * s, COL.yellow, 22);
    D.sfx.play('cheer');
    yield 0.6;
    m_cheer(D);
    yield 0.5;
    yield D.walkTo(exitX(D), { anim: 'walk', speed: 60 * s });
  };

  // 食べる（食べられる）
  A.eat = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'mouth');
    m.play('eat');
    pop(D, 'sfx_munch', m.x + 20 * s, D.gy - 110 * s, COL.chalk, 18);
    for (var i = 0; i < 4; i++) {
      yield 0.38;
      w.bites.push({ x: w.width / 2 - i * w.width / 3.5, y: (i % 2 ? 12 : -10), r: 34 });
      D.sfx.play('munch');
      D.fx.add({ type: 'crumb', x: w.x, y: w.y, vx: (Math.random() - 0.5) * 80, vy: -40, g: 400, life: 0.6, size: 2.5 * s + 1, vr: 8 });
    }
    yield 0.3;
    D.held = null; D.wordVisible = false;
    if (D.sc.hungry) D.sc.hungry = false;
    if (D.kind === 'success') { m.play('cheer'); yield 1.2; }
    else { m.play('idle'); yield 0.6; }
  };

  // 飲む（飲み物）
  A.drink = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'mouth');
    m.play('eat');
    D.heldRot = -0.9;
    pop(D, 'sfx_gulp', m.x + 20 * s, D.gy - 110 * s, COL.blue, 18);
    for (var i = 0; i < 3; i++) { D.sfx.play('gulp'); yield 0.4; }
    yield D.tween(0.4, function (k) { D.heldFade = 1 - k; });
    D.held = null; D.wordVisible = false; D.heldRot = 0; D.heldFade = 1;
    if (D.sc.hungry) D.sc.hungry = false;
    pop(D, 'sfx_ahh', m.x, D.gy - 100 * s, COL.chalk, 20);
    m.play(D.kind === 'success' ? 'cheer' : 'idle');
    yield 1.1;
  };

  // ひと口かじって、草の味（植物・珍回答）
  A.nibble = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'mouth');
    m.play('eat');
    yield 0.4;
    w.bites.push({ x: w.width / 2, y: -6, r: 34 });
    D.sfx.play('munch');
    pop(D, 'sfx_mosha', m.x + 20 * s, D.gy - 110 * s, COL.green, 16);
    yield 0.6;
    m.play('idle'); m.mouth = 'wavy';
    yield* dropWord(D);
    yield 0.8;
    m.mouth = null;
  };

  // 料理を作ってくれた…チョークの粉のスープ（人・珍回答）
  A.chef = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    var potX = m.x + 44 * s, x0 = w.x;
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, potX + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 5 * s; });
    D.chalkHook(function (ctx, t) {
      var r = 16 * s;
      CM.chalk.line(ctx, [potX - r, D.gy - r * 1.3, potX - r * 0.9, D.gy - 2, potX + r * 0.9, D.gy - 2, potX + r, D.gy - r * 1.3], { w: 2.2, seed: 5 });
    });
    D.sfx.play('stir');
    var stir = D.follow(function (dt) {
      w.rot = Math.sin(D.time * 10) * 0.12;
      if (Math.random() < 0.15) D.fx.add({ type: 'steam', x: potX + (Math.random() - 0.5) * 16 * s, y: D.gy - 26 * s, vy: -25, life: 1, size: 3 * s, color: COL.chalk, fadeIn: true });
    });
    yield 1.4;
    D.unfollow(stir); w.rot = 0;
    D.sfx.play('poof');
    D.fx.dust(potX, D.gy - 24 * s, 30, { speed: 120, g: 30, life: 1, size: 2.6 });
    pop(D, 'sfx_poof', potX, D.gy - 60 * s, COL.chalk, 20);
    yield 0.6;
    m.play('eat');
    yield 1.0;
    m.play('idle'); m.mouth = 'wavy';
    D.fx.dust(m.x + 14 * s, D.gy - 80 * s, 10, { angle: 0, spread: 1, speed: 60, g: 20, life: 0.7 });
    pop(D, 'chalkSoup', m.x + 10 * s, D.gy - 120 * s, COL.chalk, 16);
    yield 1.3;
    m.mouth = null;
  };

  // かわいさでメロメロ（イヌ）
  A.charm = function* (D) {
    var w = D.w, s = D.s, dog = D.sc.dog, x0 = w.x, tx = dog.x - dog.hw - w.dispW() / 2 - 20 * s;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, tx, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 10 * s; });
    dog.mode = 'happy'; dog.t = 0;
    D.sfx.play('cute');
    for (var i = 0; i < 5; i++) D.fx.add({ type: 'heart', x: dog.x + (Math.random() - 0.5) * 40 * s, y: D.gy - 50 * s, vy: -50, vx: (Math.random() - 0.5) * 30, life: 1.2, size: 7 * s, color: COL.pink });
    pop(D, 'sfx_mero', dog.x, D.gy - 90 * s, COL.pink, 18);
    yield 0.8;
    // 道をあける（うしろへ下がる）
    var dx0 = dog.x;
    yield D.tween(0.6, function (k) { dog.x = U.lerp(dx0, D.st.x + D.st.w * 0.9, k); });
    yield D.walkTo(exitX(D));
  };

  // 大きな音でびっくりさせる（イヌ）
  A.scare = function* (D) {
    var w = D.w, s = D.s, dog = D.sc.dog;
    yield D.tween(0.3, function (k) { w.sx = w.sy = 1 + 0.3 * k; });
    D.sfx.play('boom');
    D.fx.shake(10, 0.5);
    for (var i = 0; i < 3; i++) D.fx.ring(w.x, w.y, 10 * s, D.st.w * (0.5 + i * 0.2), { life: 0.7 + i * 0.15, size: 2.4 });
    pop(D, 'sfx_boom', w.x, w.y - 40 * s, COL.yellow, 28);
    yield D.tween(0.3, function (k) { w.sx = w.sy = 1.3 - 0.3 * k; });
    dog.mode = 'scared';
    pop(D, 'yelp', dog.x, D.gy - 80 * s, COL.orange, 16);
    var dx = dog.x;
    yield D.tween(0.5, function (k) { dog.x = dx + Math.sin(k * 60) * 3 * s; });
    dog.mode = 'run'; dog.face = 1;
    yield D.tween(0.7, function (k) { dog.x = U.lerp(dx, exitX(D) + 80 * s, U.easeIn(k)); });
    yield D.walkTo(exitX(D));
  };

  // 投げると夢中で食べる（イヌ）
  A.feed = function* (D) {
    var w = D.w, s = D.s, m = D.man, dog = D.sc.dog;
    yield* pickUp(D, 'front');
    yield* throwTo(D, dog.x - dog.hw - 10 * s, 60 * s);
    dog.mode = 'eat';
    var dx = dog.x, tx = w.x + dog.hw + 6 * s;
    yield D.tween(0.4, function (k) { dog.x = U.lerp(dx, tx, k); });
    pop(D, 'sfx_munch', dog.x, D.gy - 80 * s, COL.orange, 16);
    var eat = D.follow(function () { if (Math.random() < 0.05) { D.sfx.play('munch'); if (w.bites.length < 3) w.bites.push({ x: w.width / 2 - w.bites.length * 30, y: 0, r: 26 }); } });
    yield 0.5;
    yield D.walkTo(exitX(D));
    D.unfollow(eat);
  };
  /** 手に持った文字を、放物線で投げる */
  function* throwTo(D, tx, h) {
    var w = D.w, m = D.man;
    m.play('throwing');
    yield 0.18;
    D.held = null;
    D.sfx.play('whoosh');
    var x0 = w.x, y0 = w.y, ty = D.gy - w.dispH() / 2 - 2;
    yield D.tween(0.7, function (k) {
      w.x = U.lerp(x0, tx, k);
      w.y = U.lerp(y0, ty, k) - 4 * h * k * (1 - k);
      w.rot = k * 4;
    });
    w.rot = 0;
    D.sfx.play('clink');
    m.play('idle');
  }

  // 遠くへ投げると追いかけていく（イヌ・おもちゃ）
  A.fetch = function* (D) {
    var w = D.w, s = D.s, dog = D.sc.dog;
    yield* pickUp(D, 'front');
    D.man.play('throwing');
    yield 0.18;
    D.held = null;
    D.sfx.play('whoosh');
    var x0 = w.x, y0 = w.y;
    D.follow(D.tween(1.1, function (k) { w.x = U.lerp(x0, exitX(D) + 100 * s, k); w.y = U.lerp(y0, D.st.y + D.st.h * 0.3, k) - 60 * s * Math.sin(k * PI); w.rot = k * 6; }));
    D.man.play('idle');
    yield 0.4;
    dog.mode = 'happy';
    pop(D, 'barkHappy', dog.x, D.gy - 80 * s, COL.orange, 16);
    D.sfx.play('bark');
    yield 0.3;
    dog.mode = 'run'; dog.face = 1;
    var dx = dog.x;
    yield D.tween(0.9, function (k) { dog.x = U.lerp(dx, exitX(D) + 120 * s, U.easeIn(k)); });
    yield D.walkTo(exitX(D));
  };

  // 仲良くなって遊びに行ってしまう（動物・珍回答）
  A.playmate = function* (D) {
    var w = D.w, s = D.s, dog = D.sc.dog, m = D.man, x0 = w.x;
    var mid = dog.x - 60 * s;
    yield D.tween(0.9, function (k) { w.x = U.lerp(x0, mid, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 8 * s; });
    dog.mode = 'play';
    D.sfx.play('cute');
    var cx = (mid + dog.x) / 2, dx0 = dog.x;
    yield D.tween(1.8, function (k) {
      var a = k * TAU * 1.5;
      w.x = cx - Math.cos(a) * 40 * s; onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 8)) * 10 * s;
      dog.x = cx + Math.cos(a) * 40 * s;
      if (Math.random() < 0.12) D.fx.add({ type: Math.random() < 0.5 ? 'heart' : 'note', text: '♪', x: cx, y: D.gy - 60 * s, vy: -50, vx: (Math.random() - 0.5) * 60, life: 1, size: 7 * s + 4, color: Math.random() < 0.5 ? COL.pink : COL.yellow });
    });
    m.play('puzzled');
    dog.mode = 'run'; dog.face = 1;
    var wx = w.x, ddx = dog.x;
    yield D.tween(1.0, function (k) {
      w.x = U.lerp(wx, exitX(D) + 60 * s, U.easeIn(k)); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 6)) * 8 * s;
      dog.x = U.lerp(ddx, exitX(D) + 120 * s, U.easeIn(k));
    });
    yield 0.5;
    yield D.walkTo(exitX(D));
  };

  // 雲の上へ飛んでいく（6問目・飛ぶ → 空ルート）
  A.rise = function* (D) {
    var w = D.w, s = D.s, m = D.man, c = D.sc.cloud;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(D.sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    var x0 = w.x, y0 = w.y;
    pop(D, 'toSky', m.x, D.gy - 100 * s, COL.yellow, 20);
    yield D.tween(2.4, function (k) {
      w.x = U.lerp(x0, c.w.x, U.easeInOut(k));
      w.y = U.lerp(y0, D.st.y - 120 * s, U.easeIn(k)) + Math.sin(k * 10) * 3 * s;
      w.rot = Math.sin(k * 8) * 0.06;
    });
  };

  // かたい文字で穴を掘って、地下へ（6問目・硬い → 地下ルート）
  A.dig = function* (D) {
    var w = D.w, s = D.s, m = D.man, sc = D.sc;
    yield* pickUp(D, 'dig');
    m.play('dig');
    var hx = m.x + 34 * s;
    sc.hole = { x: hx, w: 40 * s, open: 0 };
    pop(D, 'sfx_zaku', hx, D.gy - 50 * s, COL.chalk, 18);
    for (var i = 0; i < 4; i++) {
      D.sfx.play('dig');
      D.fx.dust(hx, D.gy, 8, { angle: -PI / 2 - 0.6, spread: 1, speed: 120, g: 400, size: 2.4, color: '#d9c7a8' });
      sc.hole.open = (i + 1) / 4;
      yield 0.4;
    }
    m.play('idle');
    D.held = null;
    D.wordVisible = false;
    pop(D, 'toUnder', hx, D.gy - 90 * s, COL.yellow, 20);
    yield* dropIntoHole(D, hx);
  };
  /** 穴に跳びこんで、下へ消える */
  function* dropIntoHole(D, hx) {
    var m = D.man, s = D.s;
    yield D.hop(m, hx, D.gy, 24 * s, 0.4);
    m.play('fall');
    D.sfx.play('fall');
    yield D.tween(0.8, function (k) { m.dy = k * k * 80 * s; m.alpha = 1 - k; });
    m.dy = 0;
  }

  // 建物に逃げこむと、地下への穴（6問目・建物 → 地下ルート）
  A.shelter = function* (D) {
    var w = D.w, s = D.s, m = D.man, sc = D.sc;
    var bx = D.st.x + D.st.w * 0.62, x0 = w.x, s0 = w.scale;
    var big = Math.min(s0 * 2, (D.st.w * 0.45) / w.width);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, bx, k); w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w); });
    D.sfx.play('thud'); D.fx.shake(5, 0.3);
    sc.shield = { x0: w.x - w.dispW() / 2, x1: w.x + w.dispW() / 2, y: topOf(w) };
    yield D.walkTo(bx - 10 * s);
    yield D.tween(0.4, function (k) { m.alpha = 1 - k * 0.6; });
    sc.hole = { x: bx, w: 34 * s, open: 0 };
    yield D.tween(0.5, function (k) { sc.hole.open = k; });
    pop(D, 'foundHole', bx, topOf(w) - 20 * s, COL.yellow, 18);
    yield 0.5;
    yield* dropIntoHole(D, bx);
  };

  // 傘をさして歩くと、穴を見つける（6問目・傘 → 地下ルート）
  A.umbrella = function* (D) {
    var w = D.w, s = D.s, m = D.man, sc = D.sc;
    yield* pickUp(D, 'overhead');
    m.armsUp = true;
    D.follow(function () { sc.shield = { x0: w.x - w.dispW() / 2, x1: w.x + w.dispW() / 2, y: w.y }; });
    D.sfx.play('pickup');
    yield D.walkTo(D.st.x + D.st.w * 0.55, { anim: 'walk' });
    var hx = m.x + 40 * s;
    sc.hole = { x: hx, w: 36 * s, open: 0 };
    yield D.tween(0.4, function (k) { sc.hole.open = k; });
    pop(D, 'foundHole', hx, D.gy - 70 * s, COL.yellow, 18);
    yield 0.5;
    D.held = null; D.wordVisible = false; m.armsUp = false; sc.shield = null;
    yield* dropIntoHole(D, hx);
  };

  // 水たまりで泳いで、地下へ流される（6問目・泳ぐ・珍回答 → 地下ルート）
  A.swimDown = function* (D) {
    var w = D.w, s = D.s, m = D.man, sc = D.sc;
    sc.rain = 1.6;
    D.sfx.play('splash');
    yield D.tween(1.0, function (k) { sc.puddle = 22 * s * k; });
    m.play('swim');
    D.follow(function () {
      m.gy = D.gy - sc.puddle + 30 * s;
      w.y = D.gy - sc.puddle - 4 * s;
      for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(D.time * 5 - i * 0.9) * 8;
    });
    var x0 = w.x;
    yield D.tween(1.4, function (k) { w.x = U.lerp(x0, m.x + 50 * s, k); m.x += 0.3 * s; });
    var hx = (m.x + w.x) / 2;
    sc.hole = { x: hx, w: 50 * s, open: 1 };
    pop(D, 'sfx_guru', hx, D.gy - 60 * s, COL.blue, 20);
    D.sfx.play('swirl');
    var mx = m.x, wx = w.x, ws = w.scale;
    yield D.tween(1.4, function (k) {
      var a = k * TAU * 2, r = (1 - k) * 30 * s;
      m.x = hx + Math.cos(a) * r; w.x = hx - Math.cos(a) * r;
      m.dy = k * k * 60 * s; m.alpha = 1 - k;
      w.rot = a; w.scale = ws * (1 - k * 0.8); w.alpha = 1 - k;
    });
  };

  // ============================================================
  //  失敗の演出（大分類・小分類ごとの共通反応）
  // ============================================================

  // ちらっと見て、どこかへ行ってしまう（生き物）
  A.wander = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x;
    yield D.tween(0.8, function (k) { w.x = U.lerp(x0, m.x + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 8 * s; });
    yield D.tween(0.3, function (k) { w.rot = -0.2 * k; });
    pop(D, 'dots', w.x, w.y - 30 * s, COL.chalk, 18);
    yield 0.6;
    var x1 = w.x;
    yield D.tween(1.3, function (k) { w.rot = -0.2 * (1 - k); w.x = U.lerp(x1, exitX(D) + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 6)) * 8 * s; });
  };

  // すき間に隠れてしまう（虫）
  A.scuttle = function* (D) {
    var w = D.w, s = D.s, s0 = w.scale, x0 = w.x;
    var cx = Math.min(D.st.x + D.st.w * 0.85, x0 + 160 * s);
    D.chalkHook(function (ctx) {
      CM.chalk.line(ctx, [cx - 10 * s, D.gy, cx - 4 * s, D.gy + 6 * s, cx + 2 * s, D.gy, cx + 8 * s, D.gy + 8 * s], { w: 2, seed: 7 });
    });
    yield D.tween(0.25, function (k) { w.scale = U.lerp(s0, s0 * 0.5, k); onGround(D, w); });
    D.sfx.play('patter');
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, cx, k); onGround(D, w); w.y += Math.sin(k * 40) * 1.5; });
    yield D.tween(0.3, function (k) { w.scale = s0 * 0.5 * (1 - k); onGround(D, w); });
    D.wordVisible = false;
    yield 0.5;
  };

  // 陸の上でぴちぴち（海の生き物）
  A.flop = function* (D) {
    var w = D.w, s = D.s;
    pop(D, 'sfx_pichi', w.x, w.y - 40 * s, COL.blue, 18);
    for (var i = 0; i < 5; i++) {
      var r = (Math.random() - 0.5) * 1.0;
      D.sfx.play('flop');
      yield D.tween(0.3, function (k) { onGround(D, w); w.y -= Math.sin(k * PI) * 16 * s; w.rot = r * Math.sin(k * PI); });
    }
    yield D.tween(0.3, function (k) { w.rot = 0.18 * k; });
    yield 0.4;
  };

  // あくびをして眠る（空想の生き物）
  A.sleep = function* (D) {
    var w = D.w, s = D.s;
    pop(D, 'sfx_fuaa', w.x, w.y - 40 * s, COL.chalk, 18);
    D.sfx.play('yawn');
    yield D.tween(0.8, function (k) { var a = Math.sin(k * PI); w.sx = 1 - 0.1 * a; w.sy = 1 + 0.3 * a; onGround(D, w); });
    yield D.tween(0.4, function (k) { w.rot = 0.12 * k; });
    for (var i = 0; i < 3; i++) {
      D.fx.add({ type: 'text', text: 'Z', x: w.x + w.dispW() * 0.3, y: w.y - 20 * s, vy: -30, vx: 15, life: 1.4, size: (14 + i * 4) * s, color: COL.blue });
      yield 0.6;
    }
  };

  // 「がんばれ！」と言って帰る（人）
  A.cheerLeave = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x;
    yield D.tween(0.7, function (k) { w.x = U.lerp(x0, m.x + 44 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 3)) * 6 * s; });
    D.sfx.play('cheer');
    pop(D, 'cheerUp', w.x, w.y - 36 * s, COL.yellow, 20);
    yield 1.0;
    var x1 = w.x;
    yield D.tween(1.2, function (k) { w.x = U.lerp(x1, exitX(D) + 40 * s, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 5)) * 6 * s; });
  };

  // いそがしくて帰ってしまう（職業）
  A.busy = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x;
    D.sfx.play('whoosh');
    yield D.tween(0.35, function (k) { w.x = U.lerp(x0, m.x + 40 * s, k); w.rot = -0.15; });
    w.rot = 0;
    pop(D, 'busy', w.x, w.y - 36 * s, COL.chalk, 18);
    yield D.tween(0.8, function (k) { w.x = m.x + 40 * s + Math.sin(k * 30) * 3 * s; });
    D.sfx.play('whoosh');
    var x1 = w.x;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x1, exitX(D) + 60 * s, U.easeIn(k)); w.rot = 0.15; });
  };

  // ただそこにあるだけ（自然）
  A.sitThere = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield D.walkTo(w.x - w.dispW() / 2 - 16 * s);
    m.play('hold');
    yield 0.4;
    D.sfx.play('tiny');
    yield D.tween(0.3, function (k) { w.rot = Math.sin(k * PI * 2) * 0.03; });
    pop(D, 'dots', w.x, w.y - 30 * s, COL.chalk, 18);
    yield 0.9;
  };

  // ちょっとだけ来て、どこかへ行く（天気）
  A.drift = function* (D) {
    var w = D.w, s = D.s, x0 = w.x, y0 = w.y, ty = D.st.y + D.st.h * 0.28;
    yield D.tween(0.7, function (k) { w.y = U.lerp(y0, ty, U.easeOut(k)); });
    yield D.tween(2.0, function (k) {
      w.x = U.lerp(x0, exitX(D) + 60 * s, U.easeIn(k));
      w.y = ty + Math.sin(k * 8) * 6 * s;
      w.alpha = 1 - k * 0.5;
    });
  };

  // 使ってみるけど、うまくいかない（人工物）
  A.tryUse = function* (D) {
    var m = D.man, s = D.s;
    yield* pickUp(D, 'front');
    m.play('hold'); m.shake = true;
    D.sfx.play('rattle');
    pop(D, 'sfx_rattle', m.x, D.gy - 110 * s, COL.chalk, 16);
    yield 1.2;
    m.shake = false;
    yield* dropWord(D);
    yield 0.3;
  };

  // ふりまわして、空ぶり（武器）
  A.swingMiss = function* (D) {
    var m = D.man, s = D.s;
    yield* pickUp(D, 'swing');
    m.play('swing');
    for (var i = 0; i < 2; i++) {
      yield 0.55;
      pop(D, 'sfx_whoosh', m.x + 50 * s, D.gy - 70 * s, COL.chalk, 18);
      yield 0.95;
    }
    m.play('idle');
    yield* dropWord(D);
    yield 0.2;
  };

  // 乗ってみるけど、ここでは動かない（乗り物）
  A.rideStuck = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* mount(D);
    D.sfx.play('rattle');
    pop(D, 'sfx_gata', w.x, topOf(w) - 70 * s, COL.chalk, 16);
    var x0 = w.x;
    yield D.tween(1.4, function (k) { w.x = x0 + Math.sin(k * 60) * 2 * s; w.rot = Math.sin(k * 45) * 0.03; });
    D.clearFollow();
    w.rot = 0;
    yield D.hop(m, w.x - w.dispW() / 2 - 20 * s, D.gy, 20 * s, 0.4);
  };

  // ついちょっと遊んでしまう（おもちゃ）
  A.play = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    yield* pickUp(D, 'front');
    m.play('cheer');
    pop(D, 'yay', m.x, D.gy - 120 * s, COL.yellow, 18);
    for (var i = 0; i < 3; i++) {
      D.held = 'toss';
      D.sfx.play('whoosh');
      yield D.tween(0.55, function (k) { D.tossY = -Math.sin(k * PI) * 60 * s; });
    }
    D.tossY = 0;
    D.held = 'front';
    m.play('idle');
    yield* dropWord(D);
  };

  // ふわっと広がって消える（目に見えないもの）
  A.fade = function* (D) {
    var w = D.w, s0 = D.w.scale;
    D.sfx.play('sparkle');
    yield D.tween(1.4, function (k) {
      w.scale = s0 * (1 + 0.6 * k); w.alpha = 1 - k;
      if (Math.random() < 0.3) D.fx.add({ type: 'star', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y + (Math.random() - 0.5) * w.dispH(), life: 0.5, size: 5 * D.s, color: COL.chalk });
    });
    D.wordVisible = false;
  };

  // 気持ちは伝わった（気持ち）
  A.feel = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, y0 = w.y, s0 = w.scale;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, m.x + 16 * s, k); w.y = U.lerp(y0, D.gy - 55 * s, k); w.scale = U.lerp(s0, s0 * 0.6, k); });
    D.sfx.play('cute');
    for (var i = 0; i < 4; i++) D.fx.add({ type: 'heart', x: m.x, y: D.gy - 70 * s, vy: -40, vx: (Math.random() - 0.5) * 40, life: 1.1, size: 6 * s, color: COL.pink });
    m.mouth = 'smile';
    yield D.tween(0.7, function (k) { w.alpha = 1 - k; });
    D.wordVisible = false;
    yield 0.7;
    m.mouth = null;
  };

  // 何も起きない（魔法・呪文）
  A.fizzle = function* (D) {
    var w = D.w, s = D.s, y0 = w.y;
    D.sfx.play('sparkle');
    pop(D, 'sfx_kira', w.x, w.y - 40 * s, COL.yellow, 16);
    yield D.tween(0.8, function (k) {
      w.y = y0 - Math.sin(k * PI) * 20 * s;
      if (Math.random() < 0.4) D.fx.add({ type: 'star', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y - w.dispH() / 2, life: 0.4, size: 5 * s, color: COL.yellow });
    });
    pop(D, 'dots', w.x, w.y - 30 * s, COL.chalk, 18);
    yield 0.5;
    yield D.tween(0.2, function (k) { w.rot = 0.15 * k; });
    D.sfx.play('clink');
    yield 0.4;
  };

  // ============================================================
  //  特別な単語
  // ============================================================

  // 黒板消しが来て、文字を消し、棒人間を追いかける（ピンチ）
  A.pinch = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    var e = { x: D.st.x + D.st.w + 60 * s, y: D.st.y + 30 * s, rot: 0.2, s: s * 1.2 };
    D.eraser = e;
    D.sfx.play('whoosh');
    yield D.tween(0.5, function (k) { e.x = U.lerp(D.st.x + D.st.w + 60 * s, w.x + w.dispW() / 2, k); e.y = U.lerp(D.st.y + 30 * s, w.y, k); });
    D.sfx.play('wipe');
    var wx0 = w.x - w.dispW() / 2, wx1 = w.x + w.dispW() / 2;
    yield D.tween(0.6, function (k) {
      e.x = U.lerp(wx1, wx0, k); e.y = w.y + Math.sin(k * 30) * 6 * s;
      w.alpha = 1 - k;
    });
    D.wordVisible = false;
    m.play('erased'); m.freezeT = 0.8;
    pop(D, 'eek', m.x, D.gy - 110 * s, COL.chalk, 20);
    yield 0.4;
    m.freezeT = null; m.f = -1; m.play('run');
    var mx = m.x;
    yield D.tween(0.9, function (k) {
      m.x = U.lerp(mx, D.st.x + 30 * s, k);
      e.x = U.lerp(wx0, m.x + 50 * s, k); e.y = D.gy - 40 * s + Math.sin(k * 20) * 8 * s;
    });
    D.sfx.play('wipe');
    var ex = e.x;
    yield D.tween(0.6, function (k) { e.x = U.lerp(ex, D.st.x + D.st.w * 0.6, k); e.y = U.lerp(D.gy - 40 * s, D.st.y - 80 * s, k); });
    D.eraser = null;
    m.f = 1; m.play('idle');
    yield D.walkTo(D.sc.manX, { anim: 'walk' });
  };

  // もう1人の棒人間が現れて、握手して帰っていく
  A.buddy = function* (D) {
    var w = D.w, s = D.s, m = D.man;
    var b = D.addActor(w.x, -1);
    b.alpha = 0;
    yield D.tween(0.6, function (k) { w.alpha = 1 - k; b.alpha = k; });
    D.wordVisible = false;
    D.sfx.play('sparkle');
    yield D.walkTo(b.x - 30 * s, { anim: 'walk' });
    m.play('hold'); b.play('hold');
    pop(D, 'nice', (m.x + b.x) / 2, D.gy - 110 * s, COL.chalk, 16);
    yield 1.0;
    m.play('idle');
    b.f = 1; b.play('walk');
    var bx = b.x;
    yield D.tween(1.4, function (k) { b.x = U.lerp(bx, exitX(D), k); b.alpha = 1 - k * 0.5; });
    D.removeActor(b);
  };

  // 「出口」の矢印…ずっと遠くを指している
  A.arrow = function* (D) {
    var w = D.w, s = D.s, m = D.man, x0 = w.x, y0 = w.y, s0 = w.scale;
    var tx = D.st.x + D.st.w * 0.9, ty = D.st.y + D.st.h * 0.3;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, tx, k); w.y = U.lerp(y0, ty, k); w.scale = U.lerp(s0, s0 * 0.45, k); });
    D.chalkHook(function (ctx) {
      var ax = w.x - w.dispW() / 2 - 8 * s;
      CM.chalk.line(ctx, [m.x + 20 * s, ty, ax, ty], { w: 2, color: COL.yellow, seed: 3, alpha: 0.8 });
      CM.chalk.line(ctx, [ax - 10 * s, ty - 7 * s, ax, ty, ax - 10 * s, ty + 7 * s], { w: 2, color: COL.yellow, seed: 4 });
    });
    m.play('puzzled');
    pop(D, 'far', m.x, D.gy - 110 * s, COL.chalk, 16);
    yield 1.4;
  };

  // 宿題を思い出して、青ざめる
  A.pale = function* (D) {
    var m = D.man, s = D.s;
    m.play('puzzled');
    pop(D, 'homeworkSigh', m.x, D.gy - 110 * s, COL.blue, 16);
    yield D.tween(1.0, function (k) { m.color = k > 0.3 ? COL.blue : null; });
    yield 1.0;
    m.color = null;
  };

  // 黒板がガタガタ…冗談だよ
  A.quake = function* (D) {
    var m = D.man, w = D.w, s = D.s;
    D.fx.shake(14, 1.4);
    D.sfx.play('grow');
    m.play('erased'); m.freezeT = 0.8;
    pop(D, 'sfx_gata', D.st.x + D.st.w / 2, D.st.y + 50 * s, COL.chalk, 24);
    yield 1.5;
    m.freezeT = null; m.play('idle');
    pop(D, 'justKidding', w.x, w.y - 40 * s, COL.yellow, 16);
    yield 1.2;
  };

  // ============================================================
  //  1問目：高い所から、下の地面まで無事に降りる
  // ============================================================
  /** 足元の線が崩れる */
  function* crumbleLedge(D) {
    var seg = D.sc.segs[0], s = D.s;
    if (!seg || seg.gone) return;
    D.sfx.play('crumble');
    for (var i = 0; i < 8; i++) D.fx.dust(U.lerp(seg.x0, seg.x1, Math.random()), seg.y + 2, 3, { angle: PI / 2, spread: 0.8, speed: 40, g: 300, life: 1, size: 2 });
    yield D.tween(0.35, function (k) { seg.alpha = 1 - k; });
    seg.gone = true;
  }
  /** 手足をばたばたさせて、(x, gy) まで落ちる */
  function fallTo(D, a, x1, gy1, sec) {
    var x0 = a.x, g0 = a.gy;
    a.play('flail');
    D.sfx.play('whoosh');
    return D.tween(sec, function (k) { a.x = U.lerp(x0, x1, k); a.gy = U.lerp(g0, gy1, k * k); });
  }
  /** 文字を下の地面の、着地する場所へ */
  function wordToLanding(D, sec) {
    var w = D.w, sc = D.sc, s = D.s, x0 = w.x, y0 = w.y;
    return D.tween(sec || 0.6, function (k) {
      w.x = U.lerp(x0, sc.landX, k);
      w.y = U.lerp(y0, sc.floorY - w.dispH() / 2 - 2, k) - Math.sin(k * PI) * 30 * s;
    });
  }
  function* walkOff(D) {
    yield D.walkTo(exitX(D));
  }

  // クッションになって、ぽよんと着地（柔らかい）
  A.cushion = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield wordToLanding(D);
    D.sfx.play('land');
    yield D.walkTo(sc.edgeX - 8 * s, { anim: 'walk' });
    yield* crumbleLedge(D);
    yield fallTo(D, m, sc.landX, topOf(w) + 2, 0.55);
    D.sfx.play('boing');
    pop(D, 'sfx_boing', w.x, topOf(w) - 70 * s, COL.pink, 20);
    m.play('hopAir');
    yield D.tween(0.7, function (k) {
      var d = Math.exp(-k * 5) * Math.cos(k * 18);
      w.sy = 1 - 0.35 * d; w.sx = 1 + 0.25 * d; onGround(D, w, sc.floorY);
      m.gy = topOf(w) + 2; m.dy = -Math.sin(Math.min(1, k * 1.6) * PI) * 30 * s;
    });
    m.dy = 0; w.sx = w.sy = 1;
    m_cheer(D);
    yield 0.7;
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 22 * s, 0.45);
    yield* walkOff(D);
  };

  // 大きな文字が足場になって、小さくなりながら降ろしてくれる（大きい）
  A.tower = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, s0 = w.scale;
    yield wordToLanding(D);
    var big = Math.min((sc.floorY - sc.gy + 4) / w.height, (D.st.w * 0.5) / w.width);
    D.sfx.play('grow');
    D.fx.shake(4, 0.4);
    pop(D, 'sfx_zoom', sc.landX, sc.gy - 30 * s, COL.chalk, 22);
    yield D.tween(0.7, function (k) { w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w, sc.floorY); });
    yield D.walkTo(sc.edgeX - 6 * s, { anim: 'walk' });
    yield D.hop(m, w.x, topOf(w) + 1, 20 * s, 0.45);
    D.follow(function () { m.x = w.x; m.gy = topOf(w) + 1; });
    yield* crumbleLedge(D);
    D.sfx.play('stretch');
    pop(D, 'sfx_shururu', w.x + w.dispW() / 2, topOf(w) - 20 * s, COL.chalk, 18);
    yield D.tween(1.3, function (k) { w.scale = U.lerp(big, s0, U.easeInOut(k)); onGround(D, w, sc.floorY); });
    D.clearFollow();
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 18 * s, 0.4);
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 落ちる途中で、空中キャッチ（飛ぶ）
  A.catch = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield D.walkTo(sc.edgeX - 8 * s, { anim: 'walk' });
    yield* crumbleLedge(D);
    var midX = sc.edgeX + 50 * s, midGy = (sc.gy + sc.floorY) / 2, x0 = w.x, y0 = w.y;
    D.sfx.play('fly');
    yield D.all([
      fallTo(D, m, midX, midGy, 0.45),
      D.tween(0.45, function (k) { w.x = U.lerp(x0, midX + 4 * s, k); w.y = U.lerp(y0, midGy + w.dispH() / 2 - 2, U.easeOut(k)); })
    ]);
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    pop(D, 'sfx_fuwa', w.x, topOf(w) - 60 * s, COL.chalk, 18);
    var wx = w.x, wy = w.y;
    yield D.tween(1.4, function (k) {
      w.x = U.lerp(wx, sc.landX, k);
      w.y = U.lerp(wy, sc.floorY - w.dispH() / 2 - 2, U.easeInOut(k)) + Math.sin(k * 10) * 3 * s;
      w.rot = Math.sin(k * 8) * 0.05;
    });
    w.rot = 0;
    D.clearFollow();
    yield D.hop(m, sc.landX + w.dispW() / 2 + 24 * s, sc.floorY, 18 * s, 0.4);
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 水の中にばしゃーんと着地して、泳いで岸へ（泳ぐ）
  A.splash = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield wordToLanding(D);
    var px = sc.landX, py = sc.floorY - 8 * s, pw = 70 * s;
    w.tint = COL.blue;
    D.chalkHook(function (ctx, t) {
      for (var r = 0; r < 3; r++) {
        var pts = [];
        for (var x = px - pw; x <= px + pw; x += 8) pts.push(x, py + r * 7 * s + Math.sin(x * 0.08 + t * 3 + r) * 2.5 * s);
        CM.chalk.line(ctx, pts, { w: 1.8, color: COL.blue, alpha: 0.85 - r * 0.2, seed: r + Math.floor(t * 4) });
      }
    });
    D.follow(function () { for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(D.time * 5 - i * 0.9) * 6; });
    D.sfx.play('splash');
    yield 0.4;
    yield D.walkTo(sc.edgeX - 8 * s, { anim: 'walk' });
    yield* crumbleLedge(D);
    yield fallTo(D, m, px - 20 * s, py + 6 * s, 0.55);
    D.sfx.play('splash');
    D.fx.dust(px - 20 * s, py, 20, { angle: -PI / 2, spread: 1.4, speed: 160, g: 400, color: COL.blue, size: 2.4 });
    pop(D, 'sfx_splash', px, py - 70 * s, COL.blue, 22);
    m.play('swim');
    m.gy = py + 30 * s;
    var mx = m.x;
    yield D.tween(1.4, function (k) { m.x = U.lerp(mx, px + pw - 10 * s, k); });
    yield D.hop(m, px + pw + 20 * s, sc.floorY, 20 * s, 0.45);
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 食べ物に頭からずぼっ（食べられる・珍回答）
  A.plunge = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield wordToLanding(D);
    D.sfx.play('land');
    yield D.walkTo(sc.edgeX - 8 * s, { anim: 'walk' });
    yield* crumbleLedge(D);
    yield fallTo(D, m, sc.landX, topOf(w) + 24 * s, 0.55);
    D.sfx.play('poof');
    pop(D, 'sfx_zubo', w.x, topOf(w) - 30 * s, COL.chalk, 22);
    yield D.tween(0.3, function (k) { w.sy = 1 - 0.3 * k; w.sx = 1 + 0.2 * k; onGround(D, w, sc.floorY); m.alpha = 1 - 0.8 * k; });
    yield 0.7;
    // ぷはっと顔を出す
    w.bites.push({ x: 0, y: -18, r: 26 });
    D.sfx.play('munch');
    for (var i = 0; i < 6; i++) D.fx.add({ type: 'crumb', x: w.x, y: topOf(w), vx: (Math.random() - 0.5) * 120, vy: -120, g: 500, life: 0.7, size: 2.5 * s + 1, vr: 8 });
    w.sx = w.sy = 1; onGround(D, w, sc.floorY);
    m.alpha = 1;
    pop(D, 'sfx_puha', w.x + 20 * s, topOf(w) - 60 * s, COL.yellow, 20);
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 30 * s, 0.5);
    m.mouth = 'smile'; m_cheer(D);
    yield 0.8;
    m.mouth = null;
    yield* walkOff(D);
  };

  // 失敗したあと：足元の線が崩れて、下にドテッ
  A.ledgeFall = function* (D) {
    var m = D.man, s = D.s, sc = D.sc;
    if (sc.floorY === undefined || m.gy >= sc.floorY - 1) return;
    yield 0.3;
    yield* crumbleLedge(D);
    yield fallTo(D, m, m.x + 10 * s, sc.floorY, 0.5);
    D.sfx.play('thud');
    D.fx.shake(8, 0.35);
    D.fx.dust(m.x, sc.floorY, 12, { angle: -PI / 2, spread: 2.4, speed: 90, g: 200, size: 2.4 });
    pop(D, 'sfx_dote', m.x, sc.floorY - 90 * s, COL.chalk, 22);
    m.play('puzzled');
    yield 0.6;
  };

  // ============================================================
  //  6問目：雨をよけて、上（空）か下（地下）へ。穴に落ちずに進む
  // ============================================================

  // 熱で雨が湯気になり、湯気に乗って空へ（熱い → 空ルート）
  A.steamUp = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    w.tint = COL.red;
    D.sfx.play('fire');
    pop(D, 'sfx_juwa', w.x, topOf(w) - 30 * s, COL.red, 22);
    D.follow(function () {
      sc.shield = { x0: w.x - w.dispW(), x1: w.x + w.dispW(), y: D.st.y };
      if (Math.random() < 0.5) D.fx.add({ type: 'steam', x: w.x + (Math.random() - 0.5) * w.dispW() * 1.4, y: topOf(w), vy: -40, life: 1.2, size: 3.4 * s, color: COL.chalk, fadeIn: true, alpha: 0.8 });
    });
    yield 1.2;
    // 湯気のかたまり（雲）の上に乗る
    var puff = { x: w.x, y: topOf(w) - 4 * s };
    D.chalkHook(function (ctx, t) {
      [[-1, 0, 13], [0, -6, 17], [1, 0, 13]].forEach(function (c, i) {
        CM.chalk.circle(ctx, puff.x + c[0] * 18 * s, puff.y + c[1] * s, c[2] * s, { w: 2, alpha: 0.8, seed: i + Math.floor(t * 4) });
      });
    });
    yield D.walkTo(puff.x - 6 * s, { anim: 'walk' });
    yield D.hop(m, puff.x, puff.y - 14 * s, 20 * s, 0.4);
    D.follow(function () { m.x = puff.x; m.gy = puff.y - 14 * s; w.x = puff.x; w.y = puff.y + 10 * s; });
    pop(D, 'toSky', m.x, m.gy - 110 * s, COL.yellow, 20);
    D.sfx.play('fly');
    var y0 = puff.y;
    yield D.tween(2.2, function (k) { puff.y = U.lerp(y0, D.st.y - 160 * s, U.easeIn(k)); puff.x += Math.sin(k * 12) * 0.6; });
  };

  /** 文字をボートにして、雨水の流れに乗って、みぞから下へ */
  function* flowAway(D, boatW) {
    var w = boatW || D.w, m = D.man, s = D.s, sc = D.sc;
    sc.rain = 1.5;
    D.sfx.play('splash');
    pop(D, 'overflow', m.x, D.gy - 110 * s, COL.blue, 18);
    yield D.tween(0.9, function (k) { sc.puddle = 18 * s * k; });
    var cx = D.st.x + D.st.w * 0.78;
    sc.crack = { x: cx, w: 44 * s, open: 0 };
    yield D.tween(0.4, function (k) { sc.crack.open = k; });
    // ボートに乗る
    var wx0 = w.x;
    yield D.tween(0.4, function (k) { w.x = U.lerp(wx0, m.x + 8 * s, k); w.y = D.gy - sc.puddle - w.dispH() * 0.2; });
    yield D.hop(m, w.x - 4 * s, topOf(w) + 1, 16 * s, 0.35);
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    var x0 = w.x, y0 = w.y;
    yield D.tween(1.5, function (k) { w.x = U.lerp(x0, cx - 10 * s, k); w.y = y0 + Math.sin(k * 14) * 2 * s; w.rot = Math.sin(k * 10) * 0.06; });
    pop(D, 'toUnder', cx, D.gy - 90 * s, COL.yellow, 20);
    D.sfx.play('swirl');
    var x1 = w.x, y1 = w.y;
    yield D.tween(0.9, function (k) {
      w.x = U.lerp(x1, x1 + 60 * s, k); w.y = y1 + 70 * s * k * k; w.rot = 0.5 * k;
      w.alpha = 1 - k; m.alpha = 1 - k;
    });
  }

  // 雨水の川に乗って、黒板の下へ流れていく（泳ぐ → 地下ルート）
  A.flowDown = function* (D) {
    yield* flowAway(D);
  };

  // 雨を凍らせて、氷のすべり台で下へ（冷たい → 地下ルート）
  A.iceSlide = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    w.tint = COL.ice;
    D.sfx.play('freeze');
    pop(D, 'sfx_kachi', w.x, topOf(w) - 30 * s, COL.ice, 22);
    yield D.tween(0.8, function (k) { sc.rain = 1 - k; });
    for (var i = 0; i < 12; i++) D.fx.add({ type: 'frost', x: D.st.x + Math.random() * D.st.w, y: D.st.y + Math.random() * D.st.h * 0.6, vy: 30, vr: 2, life: 1.5, size: 5 * s, color: COL.ice });
    // 氷のすべり台（地面から、ななめ下のみぞへ）
    var cx = D.st.x + D.st.w * 0.8;
    sc.crack = { x: cx, w: 44 * s, open: 0 };
    yield D.tween(0.4, function (k) { sc.crack.open = k; });
    var sx0 = m.x + 20 * s;
    D.chalkHook(function (ctx) {
      CM.chalk.line(ctx, [sx0, D.gy - 2, cx - 18 * s, D.gy - 2, cx + 30 * s, D.gy + 40 * s], { w: 3, color: COL.ice, seed: 9 });
    });
    // 文字をそりにする
    var wx0 = w.x;
    yield D.tween(0.4, function (k) { w.x = U.lerp(wx0, sx0 + 10 * s, k); onGround(D, w); });
    yield D.hop(m, w.x - 4 * s, topOf(w) + 1, 16 * s, 0.35);
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    pop(D, 'sfx_tsuru', m.x + 60 * s, D.gy - 100 * s, COL.ice, 20);
    D.sfx.play('whoosh');
    var x0 = w.x, y0 = w.y;
    yield D.tween(1.3, function (k) {
      var e = U.easeIn(k);
      w.x = U.lerp(x0, cx + 40 * s, e);
      w.y = y0 + Math.max(0, w.x - (cx - 18 * s)) * 0.8;
      w.rot = w.x > cx - 18 * s ? 0.6 : 0;
      if (k > 0.75) { w.alpha = m.alpha = (1 - k) / 0.25; }
    });
  };

  // 雨雲と仲良くなって、いっしょに空へ（天気・珍回答 → 空ルート）
  A.cloudFriend = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, c = sc.cloud;
    var x0 = w.x, y0 = w.y;
    yield D.tween(1.0, function (k) { w.x = U.lerp(x0, c.w.x - c.w.dispW() * 0.6, k); w.y = U.lerp(y0, c.y, U.easeOut(k)); });
    D.sfx.play('cute');
    for (var i = 0; i < 6; i++) D.fx.add({ type: 'heart', x: c.w.x, y: c.y, vy: -40, vx: (Math.random() - 0.5) * 60, life: 1.2, size: 7 * s, color: COL.pink });
    pop(D, 'sfx_nakayoshi', c.w.x, c.y - 40 * s, COL.pink, 20);
    yield D.tween(0.8, function (k) { sc.rain = 1 - k; });
    // 雲が降りてきて、棒人間を乗せる
    var cy0 = c.y, cty = D.gy - 60 * s;
    c.tx = m.x + 10 * s;
    D.follow(function () { w.x = c.w.x - c.w.dispW() * 0.6; w.y = c.w.y; });
    yield D.tween(1.0, function (k) { c.y = U.lerp(cy0, cty, U.easeInOut(k)); });
    yield D.hop(m, c.w.x, c.w.y - c.w.dispH() / 2 + 4 * s, 20 * s, 0.4);
    m.play('ride');
    D.follow(function () { m.x = c.w.x; m.gy = c.w.y - c.w.dispH() / 2 + 4 * s; });
    pop(D, 'toSky', m.x, m.gy - 110 * s, COL.yellow, 20);
    D.sfx.play('fly');
    yield D.tween(2.0, function (k) { c.y = U.lerp(cty, D.st.y - 150 * s, U.easeIn(k)); });
  };

  // 雨宿りしていたら水があふれて、建物ごと下へ流された（建物・珍回答 → 地下ルート）
  A.houseFlow = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, s0 = w.scale, x0 = w.x;
    var big = Math.min(s0 * 1.8, (D.st.w * 0.4) / w.width);
    yield D.tween(0.6, function (k) { w.x = U.lerp(x0, m.x + 40 * s, k); w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w); });
    D.sfx.play('thud');
    sc.shield = { x0: w.x - w.dispW() / 2, x1: w.x + w.dispW() / 2, y: topOf(w) };
    yield D.walkTo(w.x - 6 * s, { anim: 'walk' });
    m.mouth = 'smile';
    yield 0.6;
    m.mouth = null;
    sc.shield = null;
    yield* flowAway(D);
  };

  // ============================================================
  //  1問目（新）：高いビルの屋上から、下の地面まで降りる（カメラは引いた画）
  // ============================================================
  /** 屋上のはしまで歩いて、えいっと飛び出す */
  function* jumpOff(D) {
    var m = D.man, s = D.s, sc = D.sc;
    yield D.walkTo(sc.edgeX - 8 * s, { anim: 'walk' });
    yield D.hop(m, sc.edgeX + 26 * s, sc.gy, 26 * s, 0.4);
  }
  /** 長い距離を落ちる（落ちる時間は高さに合わせる） */
  function longFall(D, x1, gy1) {
    var h = gy1 - D.man.gy;
    return fallTo(D, D.man, x1, gy1, U.clamp(Math.sqrt(Math.max(1, h)) / 30, 0.5, 1.2));
  }

  // 長い文字を屋上からたらして、つたって降りる（長い）
  A.climbDown = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    var len = sc.floorY - sc.gy, baseW = w.width * w.scale;
    var x0 = w.x, y0 = w.y, rx = sc.edgeX + 8 * s;
    // 屋上のはしへ移動して、下へ向けてのびる
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, rx, k); w.y = U.lerp(y0, sc.gy + baseW / 2, k); w.rot = PI / 2 * k; });
    D.sfx.play('stretch');
    pop(D, 'sfx_stretch', rx + 60 * s, sc.gy + 80 * s, COL.chalk, 22);
    yield D.tween(1.0, function (k) { w.sx = U.lerp(1, len / baseW, U.easeOut(k)); w.y = sc.gy + baseW * w.sx / 2; });
    yield D.walkTo(sc.edgeX - 6 * s, { anim: 'walk' });
    // つかまって、するする降りる
    m.f = -1; m.x = rx + 12 * s; m.play('cling');
    D.sfx.play('climb');
    var g0 = sc.gy + 40 * s;
    yield D.tween(2.2, function (k) { m.gy = U.lerp(g0, sc.floorY, U.easeInOut(k)); });
    m.f = 1; m.play('idle');
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 飛び出したところを、空中でキャッチ（飛ぶ）
  A.catchFall = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield* jumpOff(D);
    var midX = sc.edgeX + 70 * s, midGy = sc.gy + (sc.floorY - sc.gy) * 0.45, x0 = w.x, y0 = w.y;
    D.sfx.play('fly');
    pop(D, 'eek', m.x, m.gy - 110 * s, COL.chalk, 18);
    yield D.all([
      longFall(D, midX, midGy),
      D.tween(0.8, function (k) { w.x = U.lerp(x0, midX + 4 * s, k); w.y = U.lerp(y0, midGy + w.dispH() / 2 - 2, U.easeInOut(k)); })
    ]);
    m.play('ride');
    D.follow(function () { m.x = w.x - 4 * s; m.gy = topOf(w) + 1; });
    pop(D, 'sfx_fuwa', w.x, topOf(w) - 70 * s, COL.chalk, 18);
    var wx = w.x, wy = w.y;
    yield D.tween(1.8, function (k) {
      w.x = U.lerp(wx, sc.landX, k);
      w.y = U.lerp(wy, sc.floorY - w.dispH() / 2 - 2, U.easeInOut(k)) + Math.sin(k * 10) * 4 * s;
      w.rot = Math.sin(k * 8) * 0.05;
    });
    w.rot = 0;
    D.clearFollow();
    yield D.hop(m, sc.landX + w.dispW() / 2 + 24 * s, sc.floorY, 18 * s, 0.4);
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 下にクッション。飛びおりて、ぽよん（柔らかい）
  A.cushionFall = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield wordToLanding(D, 0.9);
    D.sfx.play('land');
    yield* jumpOff(D);
    yield longFall(D, sc.landX, topOf(w) + 2);
    D.sfx.play('boing');
    D.fx.shake(4, 0.3);
    pop(D, 'sfx_boing', w.x, topOf(w) - 80 * s, COL.pink, 22);
    m.play('hopAir');
    yield D.tween(0.8, function (k) {
      var d = Math.exp(-k * 5) * Math.cos(k * 18);
      w.sy = 1 - 0.4 * d; w.sx = 1 + 0.3 * d; onGround(D, w, sc.floorY);
      m.gy = topOf(w) + 2; m.dy = -Math.sin(Math.min(1, k * 1.6) * PI) * 40 * s;
    });
    m.dy = 0; w.sx = w.sy = 1;
    m_cheer(D);
    yield 0.7;
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 22 * s, 0.45);
    yield* walkOff(D);
  };

  // 大きな文字の上に飛びおりて、小さくなりながら降ろしてもらう（大きい）
  A.elevator = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc, s0 = w.scale;
    yield wordToLanding(D, 0.9);
    var big = Math.min((sc.floorY - sc.gy) * 0.75 / w.height, (D.view.w * 0.42) / w.width);
    D.sfx.play('grow');
    D.fx.shake(5, 0.5);
    pop(D, 'sfx_zoom', sc.landX, sc.floorY - 60 * s, COL.chalk, 24);
    yield D.tween(0.8, function (k) { w.scale = U.lerp(s0, big, U.easeBack(k)); onGround(D, w, sc.floorY); });
    yield* jumpOff(D);
    yield longFall(D, w.x, topOf(w) + 1);
    D.sfx.play('thud');
    D.follow(function () { m.x = w.x; m.gy = topOf(w) + 1; });
    D.sfx.play('stretch');
    pop(D, 'sfx_shururu', w.x + w.dispW() / 2, topOf(w) - 30 * s, COL.chalk, 20);
    yield D.tween(1.6, function (k) { w.scale = U.lerp(big, s0, U.easeInOut(k)); onGround(D, w, sc.floorY); });
    D.clearFollow();
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 18 * s, 0.4);
    m_cheer(D);
    yield 0.6;
    yield* walkOff(D);
  };

  // 下の食べ物に、頭からずぼっ（食べられる・珍回答）
  A.plungeFall = function* (D) {
    var w = D.w, m = D.man, s = D.s, sc = D.sc;
    yield wordToLanding(D, 0.9);
    D.sfx.play('land');
    yield* jumpOff(D);
    yield longFall(D, sc.landX, topOf(w) + 24 * s);
    D.sfx.play('poof');
    pop(D, 'sfx_zubo', w.x, topOf(w) - 40 * s, COL.chalk, 24);
    yield D.tween(0.3, function (k) { w.sy = 1 - 0.3 * k; w.sx = 1 + 0.2 * k; onGround(D, w, sc.floorY); m.alpha = 1 - 0.8 * k; });
    yield 0.8;
    w.bites.push({ x: 0, y: -18, r: 26 });
    D.sfx.play('munch');
    for (var i = 0; i < 6; i++) D.fx.add({ type: 'crumb', x: w.x, y: topOf(w), vx: (Math.random() - 0.5) * 120, vy: -120, g: 500, life: 0.7, size: 2.5 * s + 1, vr: 8 });
    w.sx = w.sy = 1; onGround(D, w, sc.floorY);
    m.alpha = 1;
    pop(D, 'sfx_puha', w.x + 20 * s, topOf(w) - 70 * s, COL.yellow, 22);
    yield D.hop(m, sc.landX + w.dispW() / 2 + 26 * s, sc.floorY, 30 * s, 0.5);
    m.mouth = 'smile'; m_cheer(D);
    yield 0.8;
    m.mouth = null;
    yield* walkOff(D);
  };

  // 失敗したあと：足をすべらせて、下までまっさかさま
  A.tumble = function* (D) {
    var m = D.man, s = D.s, sc = D.sc;
    if (m.gy >= sc.floorY - 1) return;
    yield D.walkTo(sc.edgeX - 4 * s, { anim: 'walk' });
    m.play('flail');
    pop(D, 'eek', m.x, m.gy - 110 * s, COL.chalk, 18);
    yield D.hop(m, sc.edgeX + 16 * s, sc.gy, 14 * s, 0.3);
    yield longFall(D, sc.edgeX + 40 * s, sc.floorY);
    D.sfx.play('thud');
    D.fx.shake(10, 0.4);
    D.fx.dust(m.x, sc.floorY, 16, { angle: -PI / 2, spread: 2.4, speed: 120, g: 200, size: 3 });
    pop(D, 'sfx_dote', m.x, sc.floorY - 100 * s, COL.chalk, 26);
    m.play('puzzled');
    yield 0.7;
  };

  // ============================================================
  //  6問目（新）：大きな木の落書き。上（空ルート）か、下（地下ルート）か
  // ============================================================

  // 長い文字を幹に立てかけて、雲の上までのぼる（長い → 空）
  A.climbUp = function* (D) {
    var w = D.w, m = D.man, s = D.s, tr = D.sc.tree;
    var topY = D.st.y - 60 * s, len = D.gy - topY, baseW = w.width * w.scale;
    var lx = tr.x - tr.w / 2 - 12 * s, x0 = w.x, y0 = w.y;
    yield D.tween(0.5, function (k) { w.x = U.lerp(x0, lx, k); w.y = U.lerp(y0, D.gy - baseW / 2, k); w.rot = -PI / 2 * k; });
    D.sfx.play('stretch');
    pop(D, 'sfx_stretch', lx - 50 * s, D.gy - 120 * s, COL.chalk, 22);
    yield D.tween(1.0, function (k) { w.sx = U.lerp(1, len / baseW, U.easeOut(k)); w.y = D.gy - baseW * w.sx / 2; });
    yield D.walkTo(lx - 14 * s, { anim: 'walk' });
    m.f = 1; m.play('cling');
    D.sfx.play('climb');
    pop(D, 'toSky', lx - 40 * s, D.gy - 160 * s, COL.yellow, 20);
    var g0 = m.gy;
    yield D.tween(2.6, function (k) { m.gy = U.lerp(g0, topY - 60 * s, U.easeIn(k)); });
  };

  // 文字に乗って、雲の上まで飛んでいく（飛ぶ → 空）
  A.flyUp = function* (D) {
    var w = D.w, m = D.man, s = D.s, tr = D.sc.tree;
    D.sfx.play('fly');
    yield D.tween(0.5, function (k) { w.x = U.lerp(D.sc.restX, m.x + 30 * s, k); onGround(D, w, D.gy - 6 * s * k); });
    yield* mount(D);
    var x0 = w.x, y0 = w.y;
    pop(D, 'toSky', m.x, D.gy - 120 * s, COL.yellow, 20);
    yield D.tween(2.4, function (k) {
      w.x = U.lerp(x0, tr.x - tr.w * 1.4, U.easeInOut(k));
      w.y = U.lerp(y0, D.st.y - 140 * s, U.easeIn(k)) + Math.sin(k * 10) * 3 * s;
      w.rot = Math.sin(k * 8) * 0.06;
    });
  };

  /** 根っこのすき間から、坂を下って地下へ（落ちずに、歩いて下りる） */
  function* walkDownRoots(D) {
    var m = D.man, s = D.s, tr = D.sc.tree, gx = tr.x - tr.w * 0.9;
    yield D.walkTo(gx - 16 * s, { anim: 'walk' });
    pop(D, 'toUnder', gx, D.gy - 110 * s, COL.yellow, 20);
    m.f = 1; m.play('walk');
    var x0 = m.x, g0 = m.gy;
    yield D.tween(1.6, function (k) { m.x = x0 + 40 * s * k; m.gy = g0 + 70 * s * k; m.alpha = 1 - Math.max(0, k - 0.6) / 0.4; });
  }

  // かたい文字でザクザク掘って、根っこの間の道を作る（硬い → 地下）
  A.digDown = function* (D) {
    var w = D.w, m = D.man, s = D.s, tr = D.sc.tree, gx = tr.x - tr.w * 0.9;
    yield* pickUp(D, 'dig');
    yield D.walkTo(gx - 30 * s, { anim: 'walk' });
    m.play('dig');
    pop(D, 'sfx_zaku', gx, D.gy - 60 * s, COL.chalk, 20);
    for (var i = 0; i < 4; i++) {
      D.sfx.play('dig');
      D.fx.dust(gx, D.gy, 8, { angle: -PI / 2 - 0.6, spread: 1, speed: 120, g: 400, size: 2.4, color: '#d9c7a8' });
      tr.gap = (i + 1) / 4;
      yield 0.4;
    }
    m.play('idle');
    D.held = null; D.wordVisible = false;
    yield* walkDownRoots(D);
  };

  // 小さな文字が、根っこのすき間を見つける（小さい → 地下）
  A.shrinkIn = function* (D) {
    var w = D.w, s = D.s, tr = D.sc.tree, gx = tr.x - tr.w * 0.9, x0 = w.x;
    yield D.tween(0.9, function (k) { w.x = U.lerp(x0, gx, k); onGround(D, w); w.y -= Math.abs(Math.sin(k * PI * 4)) * 8 * s; });
    D.sfx.play('tiny');
    pop(D, 'foundGap', gx, D.gy - 50 * s, COL.chalk, 16);
    yield D.tween(0.5, function (k) { tr.gap = k; });
    var wx = w.x, wy = w.y;
    yield D.tween(0.8, function (k) { w.x = wx + 30 * s * k; w.y = wy + 50 * s * k; w.alpha = 1 - k; });
    yield* walkDownRoots(D);
  };

  // 虫の大群が根っこをかじって、地下への道をあける（虫・珍回答 → 地下）
  A.antsDig = function* (D) {
    var w = D.w, s = D.s, tr = D.sc.tree, gx = tr.x - tr.w * 0.9;
    var small = w.scale * 0.5, ants = [w];
    yield D.tween(0.3, function (k) { w.scale = U.lerp(small * 2, small, k); onGround(D, w); });
    for (var i = 1; i < 12; i++) { var c = D.copy(); c.scale = small; ants.push(c); }
    pop(D, 'sfx_warawara', D.st.x + D.st.w * 0.3, D.gy - 80 * s, COL.chalk, 22);
    var t = 0, starts = ants.map(function (a, i) { return i === 0 ? w.x : D.st.x - 20 * s - i * 30 * s; });
    D.follow(function (dt) {
      t += dt;
      ants.forEach(function (a, i) {
        var tt = Math.max(0, t - i * 0.1), x = Math.min(gx + (i % 4 - 1.5) * 10 * s, starts[i] + 150 * s * tt);
        a.x = x; onGround(D, a); a.y -= Math.abs(Math.sin(tt * 16 + i)) * 4 * s; a.rot = Math.sin(tt * 16 + i) * 0.1;
      });
      if (Math.random() < 0.3) D.sfx.play('patter');
    });
    yield 2.2;
    pop(D, 'sfx_kari', gx, D.gy - 50 * s, COL.chalk, 18);
    D.sfx.play('munch');
    yield D.tween(0.8, function (k) { tr.gap = k; });
    D.clearFollow();
    yield D.tween(0.6, function (k) { ants.forEach(function (a) { a.y += 2; a.alpha = 1 - k; }); });
    yield* walkDownRoots(D);
  };

  /** 喜ぶ（その場でばんざい） */
  function m_cheer(D) { D.man.play('cheer'); D.sfx.play('cheer'); }
})(window);
