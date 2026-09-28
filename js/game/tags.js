/*
 * CHALK MAN 性質タグごとの動き方（15種類）
 * 書いた文字オブジェクトが、持っているタグに合わせて動く。
 *
 * 1つのタグの書き方：
 *   key: {
 *     tint: 文字の色（なければ白のまま）
 *     update(w, t, dt, env, st)  … t 秒目の位置・大きさ・傾きを決める（毎回、元の形から計算し直す）
 *     chalkBefore / chalkAfter(ctx, w, t, env) … 文字の前／後にチョークで描き足すもの（羽・波・ツララなど）
 *     light(ctx, w, t, env)       … 黒板の上に重ねる光や暗がり（かすれない）
 *   }
 * env = { stage, groundY, restX, s, fx, sfx, T(文字), size(文字の大きさ) }
 * st  = タグごとに覚えておく値。タグを切り替えると空になる
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;

  /** 地面の上に置く（文字の下の端を地面に合わせる） */
  function onGround(w, env, lift) {
    w.x = env.restX;
    w.y = env.groundY - w.dispH() / 2 - 3 - (lift || 0);
  }
  /** 周期 period の中で at 秒目を通りすぎたか（1周に1回だけ true） */
  function hit(st, key, t, period, at) {
    var n = Math.floor((t - at) / period);
    var k = '_' + key;
    if (st[k] === undefined) { st[k] = t >= at ? n : -1; return t >= at && t - at < 0.05; }
    if (n > st[k]) { st[k] = n; return true; }
    return false;
  }
  function every(st, key, t, sec) {
    var k = '_e' + key, n = Math.floor(t / sec);
    if (st[k] === n) return false;
    st[k] = n; return true;
  }
  function randChar(w) { return Math.floor(Math.random() * w.chars.length); }
  function glow(ctx, x, y, r, color, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', a));
    g.addColorStop(1, color.replace('A', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  CM.TAGS = {
    // 飛ぶ：ふわふわ浮く。両はしに小さな羽
    fly: {
      update: function (w, t, dt, env, st) {
        var lift = U.easeOut(U.range(t, 0, 0.9)) * env.stage.h * 0.3;
        onGround(w, env, lift + Math.sin(t * 2.2) * 6 * env.s);
        w.rot = Math.sin(t * 1.6) * 0.07;
        for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 3 + i * 0.8) * 4;
        if (hit(st, 'go', t, 1e9, 0)) { env.sfx.play('fly'); env.fx.dust(w.x, env.groundY, 10, { angle: -PI / 2, spread: 2.4, speed: 70, g: 40 }); }
      },
      chalkAfter: function (ctx, w, t, env) {
        var n = w.chars.length, s = env.s, flap = Math.sin(t * 11);
        [[w.charPos(0, -1, -0.1), -1], [w.charPos(n - 1, 1, -0.1), 1]].forEach(function (e, i) {
          var p = e[0], d = e[1];
          for (var k = 0; k < 3; k++) {
            var L = (16 + k * 6) * s;
            CM.chalk.line(ctx, [p[0], p[1], p[0] + d * L * 0.6, p[1] - (8 + 10 * flap) * s - k * 3 * s, p[0] + d * L, p[1] - (2 + 16 * flap) * s + k * 4 * s],
              { w: 2 * s, seed: Math.floor(t * 8) + i * 10 + k, alpha: 0.85 });
          }
        });
      }
    },

    // 泳ぐ：水にぷかぷか浮いて、文字が波打ちながら行ったり来たり
    swim: {
      tint: null,
      update: function (w, t, dt, env, st) {
        var wy = env.groundY - env.stage.h * 0.12;
        st.wy = wy;
        w.x = env.restX + Math.sin(t * 0.9) * env.stage.w * 0.16;
        w.y = wy - w.dispH() * 0.12 + Math.sin(t * 2) * 2;
        w.rot = Math.cos(t * 0.9) * 0.05;
        for (var i = 0; i < w.off.length; i++) {
          w.off[i].y = Math.sin(t * 5 - i * 0.9) * 8;
          w.off[i].r = Math.cos(t * 5 - i * 0.9) * 0.12;
        }
        if (hit(st, 'go', t, 1e9, 0)) env.sfx.play('splash');
        if (every(st, 'bub', t, 0.35)) {
          var p = w.charPos(randChar(w), 0, 0.6);
          env.fx.add({ type: 'bubble', x: p[0], y: p[1], vy: -40, vx: (Math.random() - 0.5) * 20, life: 0.9, size: (2 + Math.random() * 3) * env.s, color: COL.blue });
        }
      },
      chalkAfter: function (ctx, w, t, env, st) {
        CM.props.water(ctx, env.stage, { y: st.wy || env.groundY - env.stage.h * 0.12, t: t }, env.s);
      }
    },

    // 熱い：赤っぽく光る。火の粉と、ゆらゆらした湯気
    hot: {
      tint: COL.red,
      update: function (w, t, dt, env, st) {
        onGround(w, env);
        for (var i = 0; i < w.off.length; i++) { w.off[i].y = Math.sin(t * 17 + i * 2) * 1.3; w.off[i].x = Math.sin(t * 13 + i) * 0.8; }
        if (hit(st, 'go', t, 1e9, 0)) env.sfx.play('fire');
        if (Math.random() < dt * 16) {
          var p = w.charPos(randChar(w), (Math.random() - 0.5) * 1.6, -0.7);
          env.fx.add({ type: 'spark', x: p[0], y: p[1], vx: (Math.random() - 0.5) * 40, vy: -70 - Math.random() * 90, g: -30, life: 0.7, size: 1.8, color: Math.random() < 0.5 ? COL.orange : COL.yellow });
        }
        if (every(st, 'steam', t, 0.4)) {
          var q = w.charPos(randChar(w), 0, -1.2);
          env.fx.add({ type: 'steam', x: q[0], y: q[1], vy: -25, life: 1.1, size: 3.2 * env.s, color: COL.red, fadeIn: true });
        }
        if (every(st, 'crackle', t, 0.55)) env.sfx.play('crackle');
      },
      light: function (ctx, w, t) {
        glow(ctx, w.x, w.y, w.dispW() * 0.75 + 30, 'rgba(255,120,70,A)', 0.28 + 0.08 * Math.sin(t * 9));
      }
    },

    // 冷たい：青白くなる。ツララと、ちらちら舞う霜。ときどきブルブル
    cold: {
      tint: COL.ice,
      update: function (w, t, dt, env, st) {
        onGround(w, env);
        var c = t % 1.8;
        if (c > 1.3 && c < 1.6) w.x += Math.sin(t * 70) * 1.8;
        if (hit(st, 'go', t, 1e9, 0)) env.sfx.play('freeze');
        if (every(st, 'frost', t, 0.18)) {
          env.fx.add({ type: 'frost', x: w.x + (Math.random() - 0.5) * w.dispW() * 1.3, y: w.y - w.dispH() * (0.4 + Math.random()), vy: 18, vx: (Math.random() - 0.5) * 10,
            vr: 2, life: 1.4, size: (3 + Math.random() * 3) * env.s, color: COL.ice });
        }
      },
      chalkAfter: function (ctx, w, t, env) {
        // ツララ（文字の下のふちから）
        var r = U.rng(5), n = w.chars.length;
        for (var i = 0; i < n; i++) {
          if (!w.chars[i].text.trim()) continue;
          var p = w.charPos(i, -0.3 + r() * 0.6, 0.85), L = (5 + r() * 9) * env.s * (w.size / 40);
          CM.chalk.line(ctx, [p[0] - 3 * env.s, p[1], p[0], p[1] + L, p[0] + 3 * env.s, p[1]], { w: 1.8, color: COL.ice, seed: i, alpha: 0.9, wob: 0.2 });
        }
      },
      light: function (ctx, w, t) {
        glow(ctx, w.x, w.y, w.dispW() * 0.7 + 26, 'rgba(160,215,255,A)', 0.18);
      }
    },

    // 重い：上からドスンと落ちる。地面でつぶれて、画面がゆれて、粉が舞う
    heavy: {
      update: function (w, t, dt, env, st) {
        var c = t % 2.6, s = env.s;
        var top = Math.min(env.stage.h * 0.45, env.groundY - env.stage.y - w.dispH() - 10);
        var lift = 0;
        if (c < 0.55) { lift = top; w.rot = Math.sin(t * 30) * 0.02 * (c / 0.55); }
        else if (c < 0.8) lift = top * (1 - U.easeIn((c - 0.55) / 0.25));
        else if (c < 2.1) {
          var k = c - 0.8, d = Math.exp(-k * 7) * Math.cos(k * 20);
          w.sy = 1 - 0.32 * d; w.sx = 1 + 0.22 * d;
        } else lift = top * U.easeInOut((c - 2.1) / 0.5);
        if (c >= 2.1) w.alpha = 1 - 0.6 * Math.sin(PI * U.range(c, 2.1, 2.6));
        onGround(w, env, lift);
        if (hit(st, 'thud', t, 2.6, 0.8)) {
          env.sfx.play('thud');
          env.fx.shake(9, 0.45);
          env.fx.dust(w.x - w.dispW() / 2, env.groundY, 12, { angle: PI + 0.3, spread: 0.8, speed: 160, g: 60, size: 2.4, life: 0.8 });
          env.fx.dust(w.x + w.dispW() / 2, env.groundY, 12, { angle: -0.3, spread: 0.8, speed: 160, g: 60, size: 2.4, life: 0.8 });
          env.fx.word(env.T('sfx_thud'), w.x, w.y - w.dispH() - 18 * s, { size: 26 * s + 6 });
        }
      },
      chalkBefore: function (ctx, w, t, env) {
        // 落ちてくる場所のかげ（近づくほど濃く）
        var gap = env.groundY - (w.y + w.dispH() / 2);
        var k = U.clamp(1 - gap / (env.stage.h * 0.45), 0.15, 1);
        CM.chalk.line(ctx, [w.x - w.dispW() * 0.45 * k, env.groundY + 4, w.x + w.dispW() * 0.45 * k, env.groundY + 4], { w: 3, alpha: 0.5 * k, seed: 8 });
      }
    },

    // 大きい：ズーンと大きくなる
    big: {
      update: function (w, t, dt, env, st) {
        var c = t % 3.4;
        var k = c < 0.7 ? U.easeBack(c / 0.7) : c < 2.6 ? 1 : 1 - U.easeInOut((c - 2.6) / 0.6);
        var maxK = Math.min(2.4, (env.halfRoom * 2) / w.dispW(), (env.groundY - env.stage.y - 40) / w.dispH());
        var sc = 1 + (Math.max(1, maxK) - 1) * k;
        w.sx = w.sy = sc;
        onGround(w, env);
        if (hit(st, 'grow', t, 3.4, 0.02)) {
          env.sfx.play('grow');
          env.fx.shake(5, 0.5);
        }
        if (hit(st, 'word', t, 3.4, 0.45)) {
          env.fx.word(env.T('sfx_zoom'), w.x + w.dispW() * 0.2, w.y - w.dispH() * 0.62, { size: 24 * env.s + 6 });
          for (var i = 0; i < 12; i++) {
            var a = i / 12 * TAU;
            env.fx.add({ type: 'line', x: w.x, y: w.y, ang: a, d0: w.dispW() * 0.45, d1: w.dispW() * 0.7, len: 12 * env.s, life: 0.4, size: 2 });
          }
        }
      }
    },

    // 小さい：ポンと小さくなって、ちょこちょこ跳ねる
    small: {
      update: function (w, t, dt, env, st) {
        var c = t % 3, sc, hop = 0;
        if (c < 0.35) sc = 1 - 0.6 * U.easeOut(c / 0.35);
        else if (c < 2.4) { sc = 0.4; hop = Math.abs(Math.sin((c - 0.35) * 8)) * 10 * env.s; }
        else sc = 0.4 + 0.6 * U.easeBack(U.range(c, 2.4, 2.8));
        w.sx = w.sy = sc;
        onGround(w, env, hop);
        if (hit(st, 'pop', t, 3, 0.02)) {
          env.sfx.play('pop');
          env.fx.word(env.T('sfx_pop'), w.x, w.y - 40 * env.s, { size: 18 * env.s + 6 });
          env.fx.dust(w.x, w.y, 10, { speed: 90, g: 0, life: 0.4 });
        }
        if (c > 0.35 && c < 2.4 && hit(st, 'hop', t, PI / 8, 0.35)) env.sfx.play('tiny');
      }
    },

    // 長い：横にビヨーンと伸びる → 立ち上がって縦に伸びる
    long: {
      update: function (w, t, dt, env, st) {
        var c = t % 4.6, s = env.s;
        var baseW = w.width * w.scale;
        var maxH = U.clamp((env.halfRoom * 2) / baseW, 1, 3);
        var maxV = U.clamp((env.groundY - env.stage.y - 12) / baseW, 1, 3.2);
        if (c < 2) {
          var k = c < 0.6 ? U.easeBack(c / 0.6) : c < 1.4 ? 1 : 1 - U.easeInOut((c - 1.4) / 0.5);
          w.sx = 1 + (maxH - 1) * k;
          onGround(w, env);
        } else {
          var r = c < 2.4 ? U.easeInOut((c - 2.0) / 0.4) : c < 4.1 ? 1 : 1 - U.easeInOut((c - 4.1) / 0.4);
          var k2 = c < 2.4 ? 0 : c < 3.0 ? U.easeBack((c - 2.4) / 0.6) : c < 3.6 ? 1 : c < 4.0 ? 1 - U.easeInOut((c - 3.6) / 0.4) : 0;
          w.sx = 1 + (maxV - 1) * k2;
          w.rot = -PI / 2 * r;
          w.x = env.restX;
          // 立っているときは、文字の長さの半分だけ上に
          var lenNow = baseW * w.sx, h = w.dispH();
          w.y = env.groundY - 3 - U.lerp(h / 2, lenNow / 2, r);
        }
        if (hit(st, 'h', t, 4.6, 0.02) || hit(st, 'v', t, 4.6, 2.45)) env.sfx.play('stretch');
      }
    },

    // 硬い：落ちてカキーンと跳ね返る。金属っぽい光が走る
    hard: {
      tint: '#dfe8ee',
      update: function (w, t, dt, env, st) {
        var c = t % 2.3, s = env.s, lift = 0;
        if (c < 0.35) lift = (1 - U.easeIn(c / 0.35)) * 60 * s;
        else if (c < 0.65) { var u = (c - 0.35) / 0.3; lift = 4 * u * (1 - u) * 16 * s; }
        else if (c < 0.8) { var u2 = (c - 0.65) / 0.15; lift = 4 * u2 * (1 - u2) * 4 * s; }
        w.bold = true;
        w.shine = c > 0.9 && c < 1.5 ? (c - 0.9) / 0.6 : -1;
        onGround(w, env, lift);
        if (hit(st, 'clang', t, 2.3, 0.35)) {
          env.sfx.play('clang');
          env.fx.shake(3, 0.2);
          env.fx.word(env.T('sfx_clang'), w.x + w.dispW() * 0.3, w.y - w.dispH() - 12 * s, { size: 22 * s + 6, color: COL.yellow });
          [-1, 1].forEach(function (d) {
            var p = [w.x + d * w.dispW() / 2, env.groundY - 2];
            for (var i = 0; i < 4; i++) env.fx.add({ type: 'spark', x: p[0], y: p[1], vx: d * (60 + Math.random() * 90), vy: -80 - Math.random() * 90, g: 300, life: 0.4, size: 1.8, color: COL.yellow });
          });
        }
        if (hit(st, 'clink', t, 2.3, 0.65)) env.sfx.play('clink');
        if (hit(st, 'shine', t, 2.3, 1.2)) {
          var p = w.charPos(w.chars.length - 1, 0.8, -0.8);
          env.fx.add({ type: 'star', x: p[0], y: p[1], life: 0.5, size: 7 * s, color: '#ffffff' });
        }
      }
    },

    // 柔らかい：ぷるんと揺れて、ゆっくり戻る
    soft: {
      update: function (w, t, dt, env, st) {
        var c = t % 2.2;
        var d = Math.exp(-c * 3) * Math.sin(c * 15);
        w.sx = 1 + 0.26 * d; w.sy = 1 - 0.26 * d;
        for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 4 + i) * 2;
        onGround(w, env);
        if (hit(st, 'boing', t, 2.2, 0.02)) {
          env.sfx.play('boing');
          env.fx.word(env.T('sfx_boing'), w.x, w.y - w.dispH() - 16 * env.s, { size: 20 * env.s + 6, color: COL.pink });
        }
      }
    },

    // 光る：まわりが暗くなって、文字のまわりだけ明るくなる
    glow: {
      tint: COL.yellow,
      update: function (w, t, dt, env, st) {
        onGround(w, env, 6 * env.s + Math.sin(t * 2) * 2 * env.s);
        if (hit(st, 'go', t, 1e9, 0)) env.sfx.play('glow');
      },
      chalkBefore: function (ctx, w, t, env) {
        var n = 12, r0 = w.dispW() * 0.55 + 10 * env.s, r1 = r0 + 16 * env.s;
        for (var i = 0; i < n; i++) {
          var a = i / n * TAU + t * 0.4, pulse = 0.8 + 0.2 * Math.sin(t * 5 + i);
          CM.chalk.line(ctx, [w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0 * 0.7, w.x + Math.cos(a) * r1 * pulse, w.y + Math.sin(a) * r1 * pulse * 0.7],
            { w: 2, color: COL.yellow, seed: i + Math.floor(t * 6), alpha: 0.8 });
        }
      },
      light: function (ctx, w, t, env) {
        var st = env.stage, pulse = 0.5 + 0.5 * Math.sin(t * 3);
        var r0 = w.dispW() * 0.35 + 20, r1 = w.dispW() * 0.9 + 90 + pulse * 10;
        var k = U.easeOut(U.range(t, 0, 0.6));
        ctx.save();
        ctx.beginPath(); ctx.rect(st.x, st.y, st.w, st.h); ctx.clip();
        var g = ctx.createRadialGradient(w.x, w.y, r0, w.x, w.y, r1);
        g.addColorStop(0, 'rgba(4,10,7,0)');
        g.addColorStop(1, 'rgba(4,10,7,' + (0.72 * k) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.restore();
        glow(ctx, w.x, w.y, r1 * 0.8, 'rgba(255,230,140,A)', (0.18 + 0.06 * pulse) * k);
      }
    },

    // 音が出る：リズムに合わせて弾み、音符と輪が出る
    sound: {
      update: function (w, t, dt, env, st) {
        var beat = 0.45, b = (t % beat) / beat, pulse = Math.exp(-b * 6);
        w.sx = w.sy = 1 + 0.1 * pulse;
        var n = Math.floor(t / beat);
        for (var i = 0; i < w.off.length; i++) w.off[i].y = ((i + n) % 2 ? -1 : 1) * 3 * pulse;
        onGround(w, env);
        if (every(st, 'beat', t, beat)) {
          st.k = (st.k || 0) + 1;
          env.sfx.play('note', st.k);
          var p = w.charPos(randChar(w), 0, -1);
          env.fx.add({ type: 'note', text: st.k % 2 ? '♪' : '♫', x: p[0], y: p[1], vx: (Math.random() - 0.5) * 50, vy: -55, life: 1.2, size: 20 * env.s + 4,
            color: st.k % 3 === 0 ? COL.blue : st.k % 3 === 1 ? COL.yellow : COL.pink, vr: (Math.random() - 0.5) * 1.5 });
          env.fx.ring(w.x, w.y, w.dispW() * 0.35, w.dispW() * 0.6 + 16, { life: 0.5, size: 1.6 });
        }
      }
    },

    // 食べられる：湯気が立って、かじられていく（最後に元に戻る）
    edible: {
      update: function (w, t, dt, env, st) {
        var c = t % 4;
        w.rot = Math.sin(t * 2) * 0.03;
        onGround(w, env);
        if (every(st, 'steam', t, 0.45)) {
          var p = w.charPos(randChar(w), 0, -1.1);
          env.fx.add({ type: 'steam', x: p[0], y: p[1], vy: -22, life: 1.2, size: 3 * env.s, color: COL.chalk, fadeIn: true, alpha: 0.7 });
        }
        [0.7, 1.5, 2.3].forEach(function (at, i) {
          if (hit(st, 'bite' + i, t, 4, at)) {
            var bx = w.width / 2 - i * 34, by = -12 + (i % 2) * 20;
            w.bites.push({ x: bx, y: by, r: 30 });
            env.sfx.play('munch');
            var sp = [w.x + (bx * w.scale), w.y + by * w.scale];
            for (var q = 0; q < 6; q++) env.fx.add({ type: 'crumb', x: sp[0], y: sp[1], vx: 30 + Math.random() * 60, vy: -60 - Math.random() * 60, g: 400, life: 0.7, size: 2.5 * env.s + 1, vr: 8 });
            if (i === 0) env.fx.word(env.T('sfx_munch'), w.x + w.dispW() * 0.35, w.y - w.dispH() - 10 * env.s, { size: 20 * env.s + 6 });
          }
        });
        if (hit(st, 'refill', t, 4, 3.3)) {
          w.bites.length = 0;
          env.sfx.play('sparkle');
          for (var k = 0; k < 5; k++) env.fx.add({ type: 'star', x: w.x + (Math.random() - 0.5) * w.dispW(), y: w.y + (Math.random() - 0.5) * w.dispH(), life: 0.5, size: 6 * env.s, color: COL.yellow });
        }
      }
    },

    // 危ない：赤と黄色にチカチカ、ガタガタふるえて「！」が出る
    danger: {
      update: function (w, t, dt, env, st) {
        onGround(w, env);
        w.x += (Math.random() - 0.5) * 3.2;
        w.y += (Math.random() - 0.5) * 1.6;
        w.rot = (Math.random() - 0.5) * 0.04;
        w.tint = Math.floor(t * 5) % 2 ? COL.red : COL.orange;
        for (var i = 0; i < w.off.length; i++) w.off[i].r = (Math.random() - 0.5) * 0.08;
        if (every(st, 'warn', t, 1.1)) env.sfx.play('warn');
      },
      chalkAfter: function (ctx, w, t, env) {
        var s = env.s, on = Math.floor(t * 4) % 2 === 0;
        var hw = w.dispW() / 2 + 18 * s;
        [[-1, -0.9], [1, -0.8], [1.1, 0.2]].forEach(function (d, i) {
          if (!on && i === 1) return;
          CM.chalk.text(ctx, '!', w.x + d[0] * hw, w.y + d[1] * w.dispH() * 0.8, { size: 26 * s + 4, color: COL.red, rot: d[0] * 0.2 });
        });
        // ギザギザの警告線
        var n = 7;
        for (var k = 0; k < n; k++) {
          var a = -PI * 0.92 + (k / (n - 1)) * PI * 0.84, r0 = w.dispW() * 0.5 + 8 * s, r1 = r0 + 12 * s;
          var mx = (r0 + r1) / 2;
          CM.chalk.line(ctx, [w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0 * 0.8, w.x + Math.cos(a + 0.05) * mx, w.y + Math.sin(a + 0.05) * mx * 0.8, w.x + Math.cos(a) * r1, w.y + Math.sin(a) * r1 * 0.8],
            { w: 2, color: COL.orange, seed: k + Math.floor(t * 10), alpha: 0.8 });
        }
      }
    },

    // かわいい：ピンク色になって、文字が順番にぴょこぴょこ。ハートが出る
    cute: {
      tint: COL.pink,
      update: function (w, t, dt, env, st) {
        onGround(w, env);
        w.rot = Math.sin(t * 2) * 0.05;
        for (var i = 0; i < w.off.length; i++) {
          var ph = t * 5 - i * 0.55;
          w.off[i].y = -Math.abs(Math.sin(ph)) * 14;
          w.off[i].r = Math.sin(ph) * 0.1;
        }
        if (every(st, 'heart', t, 0.4)) {
          var p = w.charPos(randChar(w), 0, -1.1);
          env.fx.add({ type: 'heart', x: p[0], y: p[1], vx: (Math.random() - 0.5) * 30, vy: -45, life: 1.1, size: (5 + Math.random() * 3) * env.s, color: COL.pink, vr: (Math.random() - 0.5) });
        }
        if (every(st, 'cute', t, 1.6)) env.sfx.play('cute');
      }
    }
  };

  CM.TAG_ORDER = ['fly', 'swim', 'hot', 'cold', 'heavy', 'big', 'small', 'long', 'hard', 'soft', 'glow', 'sound', 'edible', 'danger', 'cute'];

  /** タグなし：その場で少しゆれるだけ */
  CM.TAG_NONE = {
    update: function (w, t, dt, env) {
      onGround(w, env);
      for (var i = 0; i < w.off.length; i++) w.off[i].y = Math.sin(t * 2 + i * 0.5) * 1.5;
    }
  };

  /**
   * 文字オブジェクトに、いくつかのタグの動きをまとめてかける係。
   * 今は1つずつ見せる（確認用）。本編では、単語の持つタグの中から一番目立つものを選ぶ。
   */
  CM.createTagPlayer = function () {
    var api = {
      key: null, t: 0, st: {},
      set: function (key) { api.key = key; api.t = 0; api.st = {}; },
      def: function () { return (api.key && CM.TAGS[api.key]) || CM.TAG_NONE; },
      update: function (w, dt, env) {
        api.t += dt;
        var d = api.def();
        w.resetPose();
        w.bites.length = api.key === 'edible' ? w.bites.length : 0;
        if (d.tint) w.tint = d.tint;
        d.update(w, api.t, dt, env, api.st);
      },
      chalkBefore: function (ctx, w, env) { var d = api.def(); if (d.chalkBefore) d.chalkBefore(ctx, w, api.t, env, api.st); },
      chalkAfter: function (ctx, w, env) { var d = api.def(); if (d.chalkAfter) d.chalkAfter(ctx, w, api.t, env, api.st); },
      light: function (ctx, w, env) { var d = api.def(); if (d.light) d.light(ctx, w, api.t, env, api.st); }
    };
    return api;
  };
})(window);
