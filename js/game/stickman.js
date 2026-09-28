/*
 * CHALK MAN 棒人間
 * ・骨組み（腰・首・肩・ひじ・手・ひざ・足）を角度で決めて、チョークの線でつなぐ。
 * ・角度は「真下が 0、向いている方（前）がプラス」。単位はラジアン（π = 180°）。
 * ・動き（アニメーション）は11種類。CM.MAN_ANIMS に1つずつ書いてある。
 *   各動きは t 秒目の姿勢（pose）と、いっしょに描く小道具（extras）を返す。
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;

  // 体の長さ（全身でだいたい 94）
  var BODY = CM.BODY = { thigh: 21, shin: 21, torso: 28, uarm: 15, farm: 14, head: 10 };
  var HIP_H = 41; // 立っているときの腰の高さ

  function v(a, L, f) { return [Math.sin(a) * L * f, Math.cos(a) * L]; }

  /** 姿勢から、各関節の位置を計算する */
  CM.manJoints = function (p, s) {
    var f = p.f || 1;
    var up = [Math.sin(p.lean || 0) * f, -Math.cos(p.lean || 0)];
    var hip = [p.x, p.y];
    var neck = [hip[0] + up[0] * BODY.torso * s, hip[1] + up[1] * BODY.torso * s];
    var sh = [hip[0] + up[0] * (BODY.torso - 3) * s, hip[1] + up[1] * (BODY.torso - 3) * s];
    var ha = (p.lean || 0) + (p.tilt || 0);
    var hd = (BODY.head + 1.5) * s;
    var head = [neck[0] + Math.sin(ha) * f * hd, neck[1] - Math.cos(ha) * hd];
    function limb(root, ang, l1, l2) {
      var a = v(ang[0], l1 * s, f), mid = [root[0] + a[0], root[1] + a[1]];
      var b = v(ang[0] + ang[1], l2 * s, f), end = [mid[0] + b[0], mid[1] + b[1]];
      return [mid, end];
    }
    var aF = limb(sh, p.aF, BODY.uarm, BODY.farm), aB = limb(sh, p.aB, BODY.uarm, BODY.farm);
    var lF = limb(hip, p.lF, BODY.thigh, BODY.shin), lB = limb(hip, p.lB, BODY.thigh, BODY.shin);
    return {
      f: f, hip: hip, neck: neck, shoulder: sh, head: head, headAngle: ha,
      elbowF: aF[0], handF: aF[1], elbowB: aB[0], handB: aB[1],
      kneeF: lF[0], footF: lF[1], kneeB: lB[0], footB: lB[1],
      // 前の手に物を持つときの向き（前腕の向き）
      handAngleF: p.aF[0] + p.aF[1]
    };
  };

  /** 足が地面(groundY)につくように腰の高さを合わせる */
  function plant(p, s, groundY) {
    var j = CM.manJoints(p, s);
    var low = Math.max(j.footF[1], j.footB[1]);
    p.y += groundY - low;
    return p;
  }

  /** 2つの姿勢のあいだ（t = 0〜1） */
  function mix(a, b, t) {
    var o = {};
    for (var k in a) {
      if (Array.isArray(a[k])) o[k] = [U.lerp(a[k][0], b[k][0], t), U.lerp(a[k][1], b[k][1], t)];
      else if (typeof a[k] === 'number' && typeof b[k] === 'number' && k !== 'f') o[k] = U.lerp(a[k], b[k], t);
      else o[k] = t < 0.5 ? a[k] : b[k];
    }
    return o;
  }

  function stand(x, y, f) {
    return { x: x, y: y, f: f || 1, lean: 0, tilt: 0,
      aF: [0.24, 0.12], aB: [-0.22, -0.1], lF: [0.14, -0.03], lB: [-0.14, 0.03],
      mouth: 'none', eyes: 'dot', alpha: 1 };
  }
  CM.manStand = stand;

  /**
   * 棒人間をチョークで描く
   * time：線のふるえ用の時刻、o = { color, alpha }
   */
  CM.drawMan = function (ctx, p, s, time, o) {
    o = o || {};
    var j = CM.manJoints(p, s);
    var lw = Math.max(2.4, 3.5 * s);
    var boil = Math.floor(time * 7) * 31;
    var color = o.color || COL.chalk;
    var base = (p.alpha === undefined ? 1 : p.alpha) * (o.alpha === undefined ? 1 : o.alpha);
    if (base <= 0.001) return j;
    function seg(pts, seed, al) {
      CM.chalk.line(ctx, pts, { w: lw, color: color, seed: boil + seed, alpha: base * (al || 0.95), wob: lw * 0.18 });
    }
    // うしろの手足（少しうすく）
    seg([j.shoulder[0], j.shoulder[1], j.elbowB[0], j.elbowB[1], j.handB[0], j.handB[1]], 1, 0.7);
    seg([j.hip[0], j.hip[1], j.kneeB[0], j.kneeB[1], j.footB[0], j.footB[1]], 2, 0.7);
    // 胴
    seg([j.hip[0], j.hip[1], j.neck[0], j.neck[1]], 3);
    // 前の手足
    seg([j.hip[0], j.hip[1], j.kneeF[0], j.kneeF[1], j.footF[0], j.footF[1]], 4);
    seg([j.shoulder[0], j.shoulder[1], j.elbowF[0], j.elbowF[1], j.handF[0], j.handF[1]], 5);
    // 頭
    var R = BODY.head * s;
    CM.chalk.circle(ctx, j.head[0], j.head[1], R, { w: lw, color: color, seed: boil + 6, alpha: base * 0.95 });
    // 顔（目と口）。頭の傾きに合わせて回す
    ctx.save();
    ctx.translate(j.head[0], j.head[1]);
    ctx.rotate(j.headAngle * j.f);
    ctx.globalAlpha = base;
    ctx.fillStyle = color;
    var f = j.f, er = Math.max(1.1, 1.35 * s);
    var e1 = [f * 0.18 * R, -0.12 * R], e2 = [f * 0.6 * R, -0.12 * R];
    var eyes = p.eyes || 'dot';
    if (eyes === 'happy') {
      [e1, e2].forEach(function (e, i) {
        CM.chalk.line(ctx, [e[0] - er * 1.4, e[1] + er * 0.4, e[0], e[1] - er * 0.9, e[0] + er * 1.4, e[1] + er * 0.4], { w: Math.max(1.3, lw * 0.45), color: color, seed: boil + 20 + i, wob: 0.1, alpha: base });
      });
    } else if (eyes === 'closed') {
      [e1, e2].forEach(function (e, i) {
        CM.chalk.line(ctx, [e[0] - er * 1.2, e[1], e[0] + er * 1.2, e[1]], { w: Math.max(1.3, lw * 0.45), color: color, seed: boil + 22 + i, wob: 0.1, alpha: base });
      });
    } else if (eyes === 'x') {
      [e1, e2].forEach(function (e, i) {
        var d = er * 1.2;
        CM.chalk.line(ctx, [e[0] - d, e[1] - d, e[0] + d, e[1] + d], { w: Math.max(1.2, lw * 0.4), color: color, seed: boil + 24 + i, wob: 0.1, alpha: base });
        CM.chalk.line(ctx, [e[0] + d, e[1] - d, e[0] - d, e[1] + d], { w: Math.max(1.2, lw * 0.4), color: color, seed: boil + 26 + i, wob: 0.1, alpha: base });
      });
    } else {
      var big = eyes === 'wide' ? 1.7 : 1;
      ctx.beginPath(); ctx.arc(e1[0], e1[1], er * big, 0, TAU); ctx.arc(e2[0], e2[1], er * big, 0, TAU); ctx.fill();
    }
    var mx = f * 0.42 * R, my = 0.42 * R;
    var mw = Math.max(1.3, lw * 0.45);
    if (p.mouth === 'smile') {
      CM.chalk.line(ctx, [mx - R * 0.32, my - R * 0.08, mx, my + R * 0.18, mx + R * 0.32, my - R * 0.08], { w: mw, color: color, seed: boil + 30, wob: 0.1, alpha: base });
    } else if (p.mouth === 'o') {
      CM.chalk.circle(ctx, mx, my + R * 0.05, R * 0.16, { w: mw, color: color, seed: boil + 31, alpha: base });
    } else if (p.mouth === 'flat') {
      CM.chalk.line(ctx, [mx - R * 0.22, my, mx + R * 0.22, my + R * 0.05], { w: mw, color: color, seed: boil + 32, wob: 0.1, alpha: base });
    } else if (p.mouth === 'wavy') {
      CM.chalk.line(ctx, [mx - R * 0.3, my, mx - R * 0.1, my - R * 0.1, mx + R * 0.1, my + R * 0.08, mx + R * 0.3, my - R * 0.02], { w: mw, color: color, seed: boil + 33, wob: 0.1, alpha: base });
    }
    ctx.restore();
    return j;
  };

  // ------------------------------------------------------------
  // 11種類の動き
  // env = { stage, groundY, cx, s }（cx = 立つ位置の x）
  // st  = 動きごとに覚えておく値（歩いた位置など）。動きを切り替えると空になる
  // 返すもの：{ pose, extras }。events は「t 秒目に鳴らす音など」
  // ------------------------------------------------------------

  /** 左右に行ったり来たりする（歩く・走る・泳ぐ） */
  function roam(st, env, speed, dt) {
    // 本編の演出では、位置は演出の側で動かす（その場で足だけ動かす）
    if (env.fixedX !== undefined) { st.x = env.fixedX; st.f = env.f || 1; return st; }
    var L = env.stage.x + env.stage.w * 0.14, R = env.stage.x + env.stage.w * 0.86;
    if (st.x === undefined) { st.x = env.cx; st.f = 1; }
    st.x += st.f * speed * dt;
    if (st.x > R) { st.x = R; st.f = -1; }
    if (st.x < L) { st.x = L; st.f = 1; }
    return st;
  }

  CM.MAN_ANIMS = {
    // 1. 待機：息をするように少しゆれる。ときどきまばたき
    idle: {
      loop: 4,
      frame: function (t, env) {
        var s = env.s, b = Math.sin(t * 2.4);
        var p = stand(env.cx, 0, 1);
        p.lean = 0.03 * b;
        p.tilt = 0.04 * Math.sin(t * 1.3);
        p.aF = [0.24 + 0.05 * b, 0.14]; p.aB = [-0.22 - 0.05 * b, -0.1];
        p.lF = [0.14, -0.03 - 0.03 * (b + 1)]; p.lB = [-0.14, 0.03];
        if ((t % 4) > 2.2 && (t % 4) < 2.34) p.eyes = 'closed';
        return { pose: plant(p, s, env.groundY) };
      }
    },

    // 2. 歩く
    walk: {
      loop: 1e9,
      frame: function (t, env, st, dt) {
        var s = env.s;
        roam(st, env, 36 * s, dt);
        var w = t * TAU * 1.4;
        var p = stand(st.x, 0, st.f);
        p.lean = 0.06;
        p.lF = [0.42 * Math.sin(w), -0.08 - 0.75 * Math.max(0, Math.cos(w))];
        p.lB = [-0.42 * Math.sin(w), -0.08 - 0.75 * Math.max(0, -Math.cos(w))];
        p.aF = [-0.4 * Math.sin(w), 0.3 + 0.2 * Math.max(0, -Math.sin(w))];
        p.aB = [0.4 * Math.sin(w), 0.3 + 0.2 * Math.max(0, Math.sin(w))];
        return { pose: plant(p, s, env.groundY), events: stepEvents(w, 'step') };
      }
    },

    // 3. 走る：前かがみ、腕を曲げて大きく振る。うしろに流れる線
    run: {
      loop: 1e9,
      frame: function (t, env, st, dt) {
        var s = env.s;
        roam(st, env, 115 * s, dt);
        var w = t * TAU * 2.4;
        var p = stand(st.x, 0, st.f);
        p.lean = 0.32;
        p.lF = [0.2 + 0.8 * Math.sin(w), -0.3 - 1.2 * Math.max(0, Math.cos(w))];
        p.lB = [0.2 - 0.8 * Math.sin(w), -0.3 - 1.2 * Math.max(0, -Math.cos(w))];
        p.aF = [0.1 - 0.95 * Math.sin(w), 1.55];
        p.aB = [0.1 + 0.95 * Math.sin(w), 1.55];
        p.mouth = 'flat';
        plant(p, s, env.groundY);
        p.y -= 5 * s * Math.abs(Math.sin(w));
        return { pose: p, extras: { speedLines: true }, events: stepEvents(w, 'stepFast') };
      }
    },

    // 4. 跳ぶ：しゃがむ → 跳ぶ（腕を上げ、ひざをかかえる）→ 着地でしゃがむ
    jump: {
      loop: 1.6,
      events: [{ t: 0.32, id: 'jump' }, { t: 1.08, id: 'land' }],
      frame: function (t, env) {
        var s = env.s, gY = env.groundY;
        var st0 = stand(env.cx, 0, 1);
        var crouch = { x: env.cx, y: 0, f: 1, lean: 0.28, tilt: 0.05, aF: [-0.7, 0.3], aB: [-0.9, 0.2], lF: [0.9, -1.7], lB: [0.7, -1.6], mouth: 'flat', eyes: 'dot', alpha: 1 };
        var stretch = { x: env.cx, y: 0, f: 1, lean: 0.05, tilt: -0.1, aF: [2.7, 0.2], aB: [-2.7, -0.2], lF: [0.05, -0.1], lB: [-0.15, -0.15], mouth: 'smile', eyes: 'dot', alpha: 1 };
        var tuck = { x: env.cx, y: 0, f: 1, lean: 0.12, tilt: -0.05, aF: [2.4, 0.4], aB: [-2.5, -0.3], lF: [1.3, -2.2], lB: [1.0, -2.1], mouth: 'smile', eyes: 'dot', alpha: 1 };
        var p, air = 0;
        if (t < 0.32) {
          p = mix(st0, crouch, U.easeOut(t / 0.32));
          plant(p, s, gY);
        } else if (t < 1.08) {
          var u = (t - 0.32) / 0.76;
          p = u < 0.35 ? mix(stretch, tuck, U.easeInOut(u / 0.35)) : u < 0.7 ? tuck : mix(tuck, stretch, U.easeInOut((u - 0.7) / 0.3));
          air = 4 * u * (1 - u) * 62 * s;
          plant(p, s, gY);
          p.y -= air;
        } else {
          var k = (t - 1.08) / 0.52;
          p = k < 0.3 ? mix(crouch, crouch, 0) : mix(crouch, st0, U.easeOut((k - 0.3) / 0.7));
          if (k < 0.3) p.mouth = 'o';
          plant(p, s, gY);
        }
        return { pose: p, extras: { shadow: { x: env.cx, y: gY, k: 1 - air / (70 * s) } } };
      }
    },

    // 5. 登る：はしごを手と足で交互に。上まで行ったら下からもう一度
    climb: {
      loop: 4.8,
      frame: function (t, env) {
        var s = env.s, gY = env.groundY;
        var topY = Math.max(env.stage.y + 20 * s, gY - 190 * s);
        var ladderX = env.cx + 12 * s;
        var climbH = Math.max(40 * s, (gY - topY) - 95 * s);
        var k = U.range(t, 0.3, 4.1);
        var w = k * TAU * 3.2;
        var p = {
          x: ladderX - 15 * s, y: gY - HIP_H * s - k * climbH, f: 1, lean: 0.04, tilt: -0.12,
          aF: [2.45 + 0.4 * Math.sin(w), 0.35], aB: [2.45 - 0.4 * Math.sin(w), 0.35],
          lF: [0.55 + 0.45 * Math.max(0, Math.sin(w)), -0.9 - 0.6 * Math.max(0, Math.sin(w))],
          lB: [0.55 + 0.45 * Math.max(0, -Math.sin(w)), -0.9 - 0.6 * Math.max(0, -Math.sin(w))],
          mouth: 'flat', eyes: 'dot', alpha: 1
        };
        // 上に着いたら消えて、下からまた登りはじめる
        p.alpha = t < 0.3 ? t / 0.3 : t > 4.3 ? Math.max(0, 1 - (t - 4.3) / 0.4) : 1;
        return { pose: p, extras: { ladder: { x: ladderX, top: topY, bottom: gY } }, events: k > 0 && k < 1 ? stepEvents(w, 'climb') : null };
      }
    },

    // 6. 落ちる：地面の穴に、手足をばたばたさせながら落ちていく
    fall: {
      loop: 2.2,
      events: [{ t: 0.55, id: 'fall' }],
      frame: function (t, env) {
        var s = env.s, gY = env.groundY;
        var p;
        var holeX = env.cx;
        if (t < 0.55) {
          // 穴のふちで足をすべらせる
          var k = t / 0.55;
          p = stand(holeX - 26 * s + k * 20 * s, 0, 1);
          p.lean = -0.25 * k; p.aF = [0.6 + 1.6 * k, 0.4]; p.aB = [-0.6 - 1.4 * k, -0.4];
          p.lF = [0.4 * k, -0.1]; p.eyes = k > 0.5 ? 'wide' : 'dot'; p.mouth = k > 0.5 ? 'o' : 'none';
          plant(p, s, gY);
        } else {
          var u = t - 0.55;
          var fy = 0.5 * 900 * s * u * u / 1.8;
          p = {
            x: holeX, y: gY - HIP_H * s + fy, f: 1, lean: -0.15 + 0.2 * Math.sin(u * 4), tilt: 0.1 * Math.sin(u * 9),
            aF: [2.7 + 0.45 * Math.sin(u * 19), 0.5 * Math.sin(u * 23)], aB: [-2.7 + 0.45 * Math.sin(u * 17 + 1), 0.5 * Math.sin(u * 21 + 2)],
            lF: [0.45 * Math.sin(u * 15), -0.7], lB: [-0.35 * Math.sin(u * 15 + 1), -0.5],
            mouth: 'o', eyes: 'wide', alpha: 1
          };
        }
        return { pose: p, extras: { pit: { x0: holeX - 20 * s, x1: holeX + 30 * s, y: gY }, fallLines: t >= 0.55 } };
      }
    },

    // 7. 泳ぐ：体を横にして、腕を大きく回す（クロール）
    swim: {
      loop: 1e9,
      frame: function (t, env, st, dt) {
        var s = env.s;
        roam(st, env, 28 * s, dt);
        var waterY = env.groundY - 30 * s;
        var w = -t * TAU * 0.8;
        var p = {
          x: st.x, y: waterY + 5 * s + Math.sin(t * 3) * 1.5 * s, f: st.f, lean: 1.3, tilt: -0.9 + 0.25 * Math.max(0, Math.sin(-w)),
          aF: [w % TAU, 0.2], aB: [(w + PI) % TAU, 0.2],
          lF: [-1.42 + 0.28 * Math.sin(t * 13), 0.12], lB: [-1.42 - 0.28 * Math.sin(t * 13), 0.12],
          mouth: Math.sin(-w) > 0.6 ? 'o' : 'none', eyes: 'dot', alpha: 1
        };
        return { pose: p, extras: { water: { y: waterY, t: t } }, events: stepEvents(-w, 'stroke') };
      }
    },

    // 8. 物を持つ・振る：書いた文字を手に持って、ふりかぶって振り下ろす
    swing: {
      loop: 1.5,
      events: [{ t: 0.5, id: 'whoosh' }],
      frame: function (t, env) {
        var s = env.s;
        var ready = { x: env.cx - 14 * s, y: 0, f: 1, lean: 0.02, tilt: 0, aF: [0.55, 0.9], aB: [-0.4, -0.3], lF: [0.35, -0.12], lB: [-0.32, 0.05], mouth: 'flat', eyes: 'dot', alpha: 1 };
        var wind = mix(ready, ready, 0); wind.aF = [3.5, 0.5]; wind.lean = -0.14; wind.tilt = -0.12; wind.aB = [0.3, 0.6];
        var hit = mix(ready, ready, 0); hit.aF = [0.85, 0.3]; hit.lean = 0.3; hit.tilt = 0.12; hit.aB = [-0.9, -0.2]; hit.lF = [0.55, -0.4]; hit.mouth = 'o';
        var p, trail = null;
        if (t < 0.5) p = mix(ready, wind, U.easeInOut(t / 0.5));
        else if (t < 0.64) {
          var k = U.easeIn((t - 0.5) / 0.14);
          p = mix(wind, hit, k);
          trail = { from: 4.0 };
        } else if (t < 0.95) { p = hit; trail = { from: 4.0, fade: (t - 0.64) / 0.31 }; }
        else p = mix(hit, ready, U.easeInOut((t - 0.95) / 0.55));
        plant(p, s, env.groundY);
        return { pose: p, extras: { held: true, trail: trail } };
      }
    },

    // 9. 喜ぶ：両手を上げてぴょんぴょん。キラキラ
    cheer: {
      loop: 2.8,
      events: [{ t: 0.05, id: 'cheer' }],
      frame: function (t, env) {
        var s = env.s;
        var u = (t % 0.7) / 0.7;
        var p = stand(env.cx, 0, 1);
        p.aF = [2.55 + 0.18 * Math.sin(t * 13), 0.35]; p.aB = [-2.55 - 0.18 * Math.sin(t * 13 + 1), -0.35];
        p.lF = [0.3, -0.9 * Math.sin(PI * u)]; p.lB = [-0.1, -0.7 * Math.sin(PI * u)];
        p.tilt = 0.1 * Math.sin(t * 7);
        p.mouth = 'smile'; p.eyes = 'happy';
        plant(p, s, env.groundY);
        p.y -= 4 * u * (1 - u) * 20 * s;
        return { pose: p, extras: { sparkle: true } };
      }
    },

    // 10. 首をかしげる：手をあごに当てて「？」
    puzzled: {
      loop: 3,
      events: [{ t: 0.3, id: 'puzzled' }],
      frame: function (t, env) {
        var s = env.s;
        var k = U.easeOut(U.range(t, 0, 0.5));
        var p = stand(env.cx, 0, 1);
        p.tilt = 0.42 * k + 0.05 * Math.sin(t * 2.5) * k;
        p.lean = -0.04 * k;
        p.aF = [U.lerp(0.24, 0.3, k), U.lerp(0.12, 2.5, k)];
        p.aB = [U.lerp(-0.22, -0.75, k), U.lerp(-0.1, 1.75, k)];
        p.lF = [0.1, -0.02]; p.lB = [-0.2, 0.05];
        p.mouth = k > 0.5 ? 'wavy' : 'none';
        return { pose: plant(p, s, env.groundY), extras: { question: t > 0.3 ? U.range(t, 0.3, 0.55) : 0 } };
      }
    },

    // 11. 黒板消しで消される：右から黒板消しが来て、ゴシゴシと消していく
    erased: {
      loop: 4,
      events: [{ t: 0.95, id: 'wipe' }, { t: 1.35, id: 'wipe' }, { t: 1.75, id: 'wipe' }, { t: 0.6, id: 'gasp' }],
      frame: function (t, env) {
        var s = env.s, gY = env.groundY;
        var p = stand(env.cx, 0, 1);
        var shock = U.range(t, 0.55, 0.75);
        if (shock > 0) {
          p.aF = [U.lerp(0.24, 2.3, shock), 0.6]; p.aB = [U.lerp(-0.22, -2.3, shock), -0.6];
          p.lean = -0.12 * shock; p.tilt = -0.15 * shock; p.mouth = 'o'; p.eyes = 'wide';
          p.lF = [0.25, -0.05]; p.lB = [-0.3, 0.05];
        }
        plant(p, s, gY);
        // 黒板消しの位置（右の外から来て、左へゴシゴシ動かしながら通りすぎる）
        var figL = env.cx - 45 * s, figR = env.cx + 45 * s;
        var ex, ey = gY - 50 * s, erase = null;
        var startX = env.stage.x + env.stage.w + 60 * s;
        if (t < 0.9) ex = U.lerp(startX, figR + 20 * s, U.easeOut(U.range(t, 0.1, 0.9)));
        else if (t < 2.2) {
          ex = U.lerp(figR + 20 * s, figL - 30 * s, U.range(t, 0.9, 2.2));
          ey += Math.sin((t - 0.9) * 22) * 32 * s;
          erase = ex + 14 * s;
        } else {
          ex = U.lerp(figL - 30 * s, env.stage.x - 90 * s, U.easeIn(U.range(t, 2.2, 2.8)));
          erase = figL - 16 * s;
        }
        if (t >= 2.2) p.alpha = 0;
        return {
          pose: p,
          extras: {
            eraser: { x: ex, y: ey, rot: 1.45 + 0.1 * Math.sin(t * 22), s: s },
            eraseFrom: erase,
            eraseBox: { y0: gY - 110 * s, y1: gY + 6 * s },
            smear: t > 0.9 ? { x0: Math.max(ex, figL - 20 * s), x1: figR + 10 * s, y0: gY - 100 * s, y1: gY } : null
          }
        };
      }
    }
  };
  CM.MAN_ORDER = ['idle', 'walk', 'run', 'jump', 'climb', 'fall', 'swim', 'swing', 'cheer', 'puzzled', 'erased'];

  // ---- 本編の演出で使う、追加の姿勢（確認用の11種類とは別）----

  // おなかがすいた：前かがみで、両手をおなかに
  CM.MAN_ANIMS.hungry = {
    loop: 3,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), b = Math.sin(t * 2);
      p.lean = 0.3 + 0.03 * b; p.tilt = 0.25;
      p.aF = [0.6, 1.5]; p.aB = [0.4, 1.7];
      p.lF = [0.35, -0.6]; p.lB = [0.05, -0.5];
      p.mouth = 'wavy'; p.eyes = 'closed';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 物に乗る（腰の高さ＝env.groundY。足を前に出してまたがる）
  CM.MAN_ANIMS.ride = {
    loop: 2,
    frame: function (t, env) {
      var s = env.s;
      var p = { x: env.cx, y: env.groundY - 3 * s, f: 1, lean: 0.12, tilt: -0.05 + 0.04 * Math.sin(t * 4),
        aF: [0.9 + 0.1 * Math.sin(t * 5), 0.7], aB: [0.7, 0.9], lF: [1.25, -1.1], lB: [0.95, -1.0], mouth: 'smile', eyes: 'dot', alpha: 1 };
      return { pose: p };
    }
  };
  // 食べる・飲む：両手を口へ。口をぱくぱく
  CM.MAN_ANIMS.eat = {
    loop: 1,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), c = Math.sin(t * 12);
      p.aF = [0.45, 2.4 + 0.15 * c]; p.aB = [0.35, 2.5 - 0.15 * c];
      p.tilt = -0.1 + 0.05 * c;
      p.mouth = c > 0 ? 'o' : 'flat';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 物を胸の前で持つ（env.shake で、ふってみる）
  CM.MAN_ANIMS.hold = {
    loop: 2,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), k = env.shake ? Math.sin(t * 24) * 0.25 : Math.sin(t * 2) * 0.05;
      p.aF = [0.9 + k, 0.9]; p.aB = [0.7 + k, 1.1];
      p.lF = [0.2, -0.05]; p.lB = [-0.2, 0.05];
      p.mouth = env.shake ? 'flat' : 'none';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 空中で止まった姿勢（跳ぶ途中・投げる など、t を決めて使う）
  CM.MAN_ANIMS.throwing = {
    loop: 0.6,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), k = U.easeOut(Math.min(1, t / 0.25));
      p.aF = [U.lerp(3.4, 1.3, k), 0.2]; p.aB = [-0.6, -0.3]; p.lean = U.lerp(-0.15, 0.25, k);
      p.lF = [0.4, -0.2]; p.lB = [-0.35, 0.05]; p.mouth = 'o';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 跳んでいる途中（ひざを曲げて、両手を上げる）
  CM.MAN_ANIMS.hopAir = {
    loop: 1,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1);
      p.aF = [2.3, 0.4]; p.aB = [-2.2, -0.4]; p.lF = [0.9, -1.5]; p.lB = [0.5, -1.2]; p.lean = 0.1; p.mouth = 'o';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 落ちている途中（手足をばたばた。足の先が env.groundY）
  CM.MAN_ANIMS.flail = {
    loop: 1,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), u = t * TAU;
      p.aF = [2.6 + 0.4 * Math.sin(u * 3), 0.4 * Math.sin(u * 4)]; p.aB = [-2.6 + 0.4 * Math.sin(u * 3 + 1), 0.4 * Math.sin(u * 4 + 2)];
      p.lF = [0.4 * Math.sin(u * 3), -0.5]; p.lB = [-0.3 * Math.sin(u * 3 + 1), -0.4];
      p.lean = -0.1; p.mouth = 'o'; p.eyes = 'wide';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };
  // 掘る：シャベルのように、前でザクザク
  CM.MAN_ANIMS.dig = {
    loop: 0.7,
    frame: function (t, env) {
      var p = stand(env.cx, 0, 1), c = Math.sin(t / 0.7 * TAU);
      p.lean = 0.35 + 0.15 * c; p.aF = [0.9 - 0.5 * c, 0.4]; p.aB = [0.7 - 0.5 * c, 0.6];
      p.lF = [0.45, -0.5]; p.lB = [-0.2, -0.2]; p.mouth = 'flat';
      return { pose: plant(p, env.s, env.groundY) };
    }
  };

  /** 足音などを、周期の決まった位置で鳴らすための目印 */
  function stepEvents(w, id) {
    return [{ phase: w, id: id }];
  }

  /**
   * 動きを再生する係
   *   var man = CM.createMan(); man.play('run'); var fr = man.update(dt, env, onEvent);
   */
  CM.createMan = function () {
    var api = {
      name: 'idle', t: 0, st: {}, lastPhase: null,
      play: function (name) {
        if (!CM.MAN_ANIMS[name]) return;
        api.name = name; api.t = 0; api.st = {}; api.lastPhase = null;
      },
      update: function (dt, env, onEvent) {
        var a = CM.MAN_ANIMS[api.name];
        var prev = api.t;
        api.t += dt;
        var loop = a.loop;
        var t = api.t % loop, tp = prev % loop;
        if (a.events && onEvent) {
          a.events.forEach(function (e) {
            if ((tp <= e.t && t > e.t) || (t < tp && (e.t > tp || e.t <= t))) onEvent(e.id);
          });
        }
        var fr = a.frame(t, env, api.st, dt);
        // 周期で鳴らす音（歩く足音など）：位相が半周するたび
        if (fr.events && onEvent) {
          fr.events.forEach(function (e) {
            if (e.phase === undefined) return;
            var n = Math.floor(e.phase / PI);
            if (api.lastPhase !== null && n !== api.lastPhase) onEvent(e.id);
            api.lastPhase = n;
          });
        }
        fr.extras = fr.extras || {};
        return fr;
      }
    };
    return api;
  };
})(window);
