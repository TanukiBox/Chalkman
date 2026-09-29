/*
 * CHALK MAN 問題ごとの黒板の様子（シーン）
 * 地面・崖・暗やみ・吠えるイヌ・雨雲など。イヌや雨雲も「文字」で描く（書いた言葉が物になる世界なので）。
 *
 * 1つのシーンの書き方：
 *   name: {
 *     setup(sc, D)          … 最初の配置。sc に 地面(segs)・棒人間の位置(manX)・文字が着く位置(restX) などを書く
 *     update(sc, dt, D)     … 毎フレーム（吠える・雨が降る など）
 *     drawChalk(ctx, sc, D) … チョークで描くもの（文字や棒人間より奥）
 *     drawFront(ctx, sc, D) … チョークで描くもの（棒人間より手前）
 *     drawReal(ctx, sc, D)  … 黒板の上に重ねるもの（暗やみ など）
 *   }
 * D：演出の係（play.js）。D.st＝ステージの四角、D.gy＝地面の高さ、D.s＝棒人間の大きさ
 */
(function (global) {
  'use strict';
  var CM = global.CM = global.CM || {};
  var U = CM.util, COL = CM.COL, TAU = U.TAU, PI = Math.PI;

  function X(D, f) { return D.st.x + D.st.w * f; }

  /** 地面（線の区切り segs と、崖のふち） */
  function drawGround(ctx, sc, D) {
    var seed = Math.floor(D.time * 3);
    sc.segs.forEach(function (g, i) {
      if (g.gone) return;
      var gy = g.y === undefined ? D.gy : g.y, al = g.alpha === undefined ? 1 : g.alpha;
      if (al <= 0.01) return;
      CM.chalk.line(ctx, [g.x0, gy, g.x1, gy], { w: 2.4, alpha: 0.85 * al, seed: seed + i * 7, wob: 0.9 });
      // 地面の下の短い線
      var r = U.rng(31 + i);
      for (var k = 0; k < Math.floor((g.x1 - g.x0) / 40); k++) {
        var gx = g.x0 + 6 + r() * (g.x1 - g.x0 - 30), gl = 6 + r() * 14;
        CM.chalk.line(ctx, [gx, gy + 6 + r() * 6, gx + gl, gy + 6 + r() * 6], { w: 1.4, alpha: 0.35 * al, seed: k });
      }
      // 崖のふち（地面が途切れるところは、下へ落ちるギザギザの線）
      [[g.x0, g.openL], [g.x1, g.openR]].forEach(function (e, j) {
        if (!e[1]) return;
        var x = e[0], d = j === 0 ? -1 : 1, pts = [x, gy], yy = gy;
        for (var q = 0; q < 5; q++) { yy += 14 * D.s; pts.push(x + d * ((q % 2) * 5 - 2) * D.s, yy); }
        CM.chalk.line(ctx, pts, { w: 2, alpha: 0.6 * al, seed: 90 + i * 3 + j });
      });
    });
  }
  CM.drawSceneGround = drawGround;

  /** 全面の地面 */
  function fullGround(D) { return [{ x0: D.st.x + 10, x1: D.st.x + D.st.w - 10 }]; }

  /** 敵やものとして出てくる「文字」を作る */
  function makeProp(D, key, color, sizePx) {
    var w = CM.createWord(D.T(key), D.dpr);
    w.setSize(sizePx);
    w.tint = color;
    return w;
  }

  CM.SCENES = {
    // タイトル画面
    title: {
      setup: function (sc, D) {
        sc.segs = fullGround(D);
        sc.manX = X(D, 0.24); sc.restX = X(D, 0.5);
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        if (sc.hideTitle) return;
        var st = D.st, sz = Math.min(64, st.w / 7);
        CM.chalk.text(ctx, D.T('title'), st.x + st.w * 0.56, st.y + st.h * 0.3, { size: sz, color: COL.chalk, maxW: st.w * 0.8 });
        CM.chalk.text(ctx, D.lang === 'ja' ? 'CHALK MAN' : 'チョークマン', st.x + st.w * 0.56, st.y + st.h * 0.3 + sz * 0.9, { size: sz * 0.42, color: COL.yellow, maxW: st.w * 0.7 });
      }
    },

    // プロローグ：理科の授業「水のゆくえ」の図と、すみの落書きの棒人間
    prologue: {
      setup: function (sc, D) {
        sc.segs = [{ x0: D.st.x + 10, x1: X(D, 0.32) }];
        sc.manX = X(D, 0.14); sc.restX = X(D, 0.26);
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        drawDiagram(ctx, D, 0.9);
      }
    },

    // 1問目：図のはしの高い所。足元の線が崩れかけ（下の地面まで降りたい）
    ledge: {
      setup: function (sc, D) {
        sc.gy = Math.max(D.st.y + D.st.h * 0.52, D.st.y + 70 + 100 * D.s);  // 棒人間が立つ高さ（崩れかけの線）
        sc.floorY = D.gy;                         // 下の地面
        sc.edgeX = X(D, 0.36);
        sc.segs = [
          { x0: D.st.x + 10, x1: sc.edgeX, y: sc.gy, openR: true },
          { x0: D.st.x + 10, x1: D.st.x + D.st.w - 10, y: sc.floorY }
        ];
        sc.manX = X(D, 0.12); sc.restX = X(D, 0.26);
        sc.landX = X(D, 0.56);                    // 着地する場所
        sc.crumbT = 0;
      },
      update: function (sc, dt, D) {
        if (sc.segs[0].gone) return;
        sc.crumbT += dt;
        if (sc.crumbT > 0.45) { sc.crumbT = 0; D.fx.dust(sc.edgeX - Math.random() * 20 * D.s, sc.gy + 2, 2, { angle: PI / 2, spread: 0.5, speed: 20, g: 220, life: 1.4 }); }
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        CM.chalk.text(ctx, D.T('groundLabel'), D.st.x + D.st.w - 34 * D.s, sc.floorY + 18 * D.s, { size: 13 * D.s + 3, alpha: 0.45 });
        // 崩れかけの線のひび
        if (!sc.segs[0].gone) {
          var a = sc.segs[0].alpha === undefined ? 1 : sc.segs[0].alpha;
          CM.chalk.line(ctx, [sc.edgeX - 26 * D.s, sc.gy, sc.edgeX - 22 * D.s, sc.gy + 6 * D.s, sc.edgeX - 16 * D.s, sc.gy + 2 * D.s], { w: 1.4, alpha: 0.6 * a, seed: 2 });
        }
      }
    },

    // （使っていない：初めの版の1問目）足元に地面がない（左のはしの短い線の上だけ）
    noGround: {
      setup: function (sc, D) {
        var edge = X(D, 0.34);
        sc.segs = [{ x0: D.st.x + 10, x1: edge, openR: true }];
        sc.gap = { x0: edge, x1: D.st.x + D.st.w + 20 };
        sc.manX = X(D, 0.1); sc.restX = X(D, 0.24);
        sc.crumbT = 0;
      },
      update: function (sc, dt, D) {
        // ふちから、チョークの粉がぽろぽろ落ちる
        sc.crumbT += dt;
        if (sc.crumbT > 0.5) { sc.crumbT = 0; D.fx.dust(sc.gap.x0 - 3, D.gy + 2, 2, { angle: PI / 2, spread: 0.5, speed: 20, g: 200, life: 1.2 }); }
      },
      drawChalk: drawGround
    },

    // 2問目：真っ暗（棒人間のまわりだけ少し見える）
    dark: {
      setup: function (sc, D) {
        sc.segs = fullGround(D);
        sc.manX = X(D, 0.14); sc.restX = X(D, 0.3);
        sc.dark = 1;              // 暗さ（0〜1）
        sc.lights = [];           // 明かり { x, y, r, color }
        sc.reveal = 0;            // 音で一瞬、地面が見える
      },
      update: function (sc, dt) { sc.reveal = Math.max(0, sc.reveal - dt * 1.5); },
      drawChalk: drawGround,
      drawReal: function (ctx, sc, D) {
        if (sc.dark <= 0.01) return;
        var st = D.st, c = D.darkCanvas(st.w, st.h), g = c.getContext('2d');
        g.setTransform(c.k, 0, 0, c.k, 0, 0);
        g.clearRect(0, 0, st.w, st.h);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(3,8,5,' + (0.84 * sc.dark * (1 - sc.reveal * 0.6)) + ')';
        g.fillRect(0, 0, st.w, st.h);
        g.globalCompositeOperation = 'destination-out';
        var lights = sc.lights.concat([{ x: D.man.x, y: D.gy - 45 * D.s, r: 42 * D.s }]);
        lights.forEach(function (l) {
          var gr = g.createRadialGradient(l.x - st.x, l.y - st.y, 0, l.x - st.x, l.y - st.y, l.r);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(l.x - st.x, l.y - st.y, l.r, 0, TAU); g.fill();
        });
        ctx.drawImage(c, st.x, st.y, st.w, st.h);
        // 明かりの色
        sc.lights.forEach(function (l) {
          if (!l.color) return;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
          gr.addColorStop(0, l.color.replace('A', 0.22)); gr.addColorStop(1, l.color.replace('A', 0));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill();
          ctx.restore();
        });
      }
    },

    // 3問目：崖（まん中が深い裂け目）
    cliff: {
      setup: function (sc, D) {
        var a = X(D, 0.4), b = X(D, 0.68);
        sc.segs = [{ x0: D.st.x + 10, x1: a, openR: true }, { x0: b, x1: D.st.x + D.st.w - 10, openL: true }];
        sc.gap = { x0: a, x1: b };
        sc.manX = X(D, 0.13); sc.restX = X(D, 0.28);
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        // 先生が描いた図の「谷」
        CM.chalk.text(ctx, D.T('valleyLabel'), (sc.gap.x0 + sc.gap.x1) / 2, D.gy + 44 * D.s, { size: 15 * D.s + 4, color: COL.yellow, alpha: 0.6 });
        var mx = sc.gap.x0 - 40 * D.s;
        CM.chalk.line(ctx, [D.st.x + 16, D.gy - 30 * D.s, mx - 30 * D.s, D.gy - 70 * D.s, mx, D.gy - 20 * D.s], { w: 1.6, alpha: 0.25, seed: 6 });
      }
    },

    // 4問目：おなかがすいた
    hungry: {
      setup: function (sc, D) {
        sc.segs = fullGround(D);
        sc.manX = X(D, 0.28); sc.restX = X(D, 0.5);
        sc.manAnim = 'hungry';
        sc.hungry = true;
        sc.growlT = 1.2;
      },
      drawFront: function (ctx, sc, D) {
        // 黒板のすみに残っている、今日の給食の献立
        var x = D.st.x + D.st.w * 0.62, y = D.st.y + D.st.h * 0.24;
        CM.chalk.text(ctx, D.T('menuBoard'), x, y, { size: 15 * D.s + 4, color: COL.orange, alpha: 0.75, maxW: D.st.w * 0.6 });
        CM.chalk.line(ctx, [x - D.st.w * 0.25, y + 14 * D.s, x + D.st.w * 0.25, y + 14 * D.s], { w: 1.4, alpha: 0.4, color: COL.orange, seed: 3 });
      },
      update: function (sc, dt, D) {
        if (!sc.hungry) return;
        sc.growlT -= dt;
        if (sc.growlT <= 0) {
          sc.growlT = 2.8;
          D.fx.word(D.T('growl'), D.man.x + 26 * D.s, D.gy - 60 * D.s, { size: 16 * D.s + 6, color: COL.chalk });
          D.sfx.play('growl');
        }
      },
      drawChalk: drawGround
    },

    // 5問目：吠える「イヌ」
    dog: {
      setup: function (sc, D) {
        sc.segs = fullGround(D);
        sc.manX = X(D, 0.12); sc.restX = X(D, 0.28);
        // 犬の落書き（絵）。hw＝体の半分の幅（演出で、そばに寄るときに使う）
        var ds = D.s * 1.15;
        sc.dog = { x: X(D, 0.7), hop: 0, mode: 'bark', t: 0, alpha: 1, face: -1, tail: 0, ds: ds, hw: 30 * ds };
      },
      update: function (sc, dt, D) {
        var d = sc.dog;
        d.t += dt;
        d.tail += dt * (d.mode === 'happy' || d.mode === 'eat' || d.mode === 'play' ? 14 : 4);
        if (d.mode === 'bark') {
          var c = d.t % 1.3;
          d.hop = c < 0.3 ? Math.sin(c / 0.3 * PI) * 10 * D.s : 0;
          if (c < dt * 1.5 && d.t > 0.2) {
            D.fx.word(D.T('bark'), d.x - 20 * D.s, D.gy - 70 * D.s, { size: 18 * D.s + 6, color: COL.orange });
            D.sfx.play('bark');
          }
        } else if (d.mode === 'happy' || d.mode === 'play') {
          d.hop = Math.abs(Math.sin(d.t * 7)) * 8 * D.s;
        } else if (d.mode === 'eat') {
          d.hop = Math.abs(Math.sin(d.t * 10)) * 2 * D.s;
        } else d.hop = 0;
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        drawDog(ctx, sc.dog, D);
      }
    },

    // 6問目：大きな雨雲（上から雨）
    rain: {
      setup: function (sc, D) {
        sc.segs = fullGround(D);
        sc.manX = X(D, 0.2); sc.restX = X(D, 0.36);
        var cloud = makeProp(D, 'cloudWord', '#b9c7d6', Math.min(56, D.st.h * 0.16));
        sc.cloud = { w: cloud, x: D.st.x + D.st.w + cloud.dispW() * 0.6, tx: X(D, 0.6), y: D.st.y + Math.max(D.st.h * 0.28, 78 + cloud.dispH() / 2) };
        sc.rain = 1;              // 雨の強さ
        sc.shield = null;         // 雨をよける物 { x0, x1, y }
        sc.hole = null;           // 地下への穴 { x, w, open }
        sc.puddle = 0;            // 水たまりの高さ
        sc.drops = [];
        for (var i = 0; i < 60; i++) sc.drops.push({ fx: Math.random(), fy: Math.random(), sp: 0.8 + Math.random() * 0.5 });
      },
      update: function (sc, dt, D) {
        var c = sc.cloud;
        c.x += (c.tx - c.x) * Math.min(1, dt * 0.8);
        c.w.x = c.x + Math.sin(D.time * 0.8) * 4; c.w.y = c.y + Math.sin(D.time * 1.1) * 3;
        sc.drops.forEach(function (d) { d.fy += dt * 1.1 * d.sp; if (d.fy > 1) d.fy -= 1; });
      },
      drawChalk: function (ctx, sc, D) {
        drawGround(ctx, sc, D);
        // みぞ（雨水が流れこむ、ななめの割れ目）
        if (sc.crack && sc.crack.open > 0) {
          var cr = sc.crack, cw = cr.w * cr.open, d = 50 * D.s;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          ctx.fillRect(cr.x - cw / 2 + 2, D.gy - 3, cw - 4, 7);
          ctx.restore();
          CM.chalk.line(ctx, [cr.x - cw / 2, D.gy, cr.x - cw / 2 + d, D.gy + d * 0.8], { w: 2.2, seed: 5 });
          CM.chalk.line(ctx, [cr.x + cw / 2, D.gy, cr.x + cw / 2 + d, D.gy + d * 0.8], { w: 2.2, seed: 6 });
        }
        // 穴
        if (sc.hole && sc.hole.open > 0) {
          var h = sc.hole, hw = h.w * h.open;
          CM.chalk.line(ctx, [h.x - hw / 2, D.gy, h.x - hw / 2 + 3, D.gy + 30 * D.s], { w: 2.2, seed: 3 });
          CM.chalk.line(ctx, [h.x + hw / 2, D.gy, h.x + hw / 2 - 3, D.gy + 30 * D.s], { w: 2.2, seed: 4 });
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = '#000';
          ctx.fillRect(h.x - hw / 2 + 2, D.gy - 3, hw - 4, 7);
          ctx.restore();
        }
        // 水たまり
        if (sc.puddle > 0) CM.props.water(ctx, D.st, { y: D.gy - sc.puddle, t: D.time }, D.s);
        // 雨
        var c = sc.cloud, cw = c.w.dispW() * 1.05, top = c.y + c.w.dispH() * 0.4, fall = D.gy - top;
        if (sc.rain > 0) {
          sc.drops.forEach(function (d, i) {
            var x = c.w.x - cw / 2 + d.fx * cw - d.fy * 10, y = top + d.fy * fall;
            if (sc.shield && x > sc.shield.x0 && x < sc.shield.x1 && y > sc.shield.y) {
              if (Math.random() < 0.02) D.fx.dust(x, sc.shield.y, 1, { speed: 40, g: 200, life: 0.3, color: COL.blue });
              return;
            }
            CM.chalk.line(ctx, [x, y, x - 3, y + 10 * D.s], { w: 1.6, color: COL.blue, alpha: 0.7 * sc.rain, seed: i });
          });
        }
        c.w.draw(ctx);
      }
    }
  };

  /** 理科の授業「水のゆくえ」の図（山・川・海・雲・矢印） */
  function drawDiagram(ctx, D, al) {
    var st = D.st, s = D.s, x = function (f) { return st.x + st.w * f; }, y = function (f) { return st.y + st.h * f; };
    var o = { w: 1.8, alpha: 0.55 * al };
    CM.chalk.text(ctx, D.T('lessonTitle'), x(0.06), y(0.2), { size: 18 * s + 4, align: 'left', color: COL.yellow, alpha: 0.8 * al });
    // 山
    CM.chalk.line(ctx, [x(0.38), y(0.8), x(0.5), y(0.5), x(0.58), y(0.62), x(0.66), y(0.45), x(0.8), y(0.8)], { w: 2, alpha: 0.6 * al, seed: 11 });
    // 海
    for (var i = 0; i < 2; i++) {
      var pts = [];
      for (var xx = 0.82; xx <= 0.97; xx += 0.015) pts.push(x(xx), y(0.78 + i * 0.04) + Math.sin(xx * 90) * 2);
      CM.chalk.line(ctx, pts, { w: 1.6, color: COL.blue, alpha: 0.6 * al, seed: 20 + i });
    }
    // 雲
    [[0.62, 0.2, 16], [0.68, 0.17, 20], [0.74, 0.21, 15]].forEach(function (c, i) {
      CM.chalk.circle(ctx, x(c[0]), y(c[1]), c[2] * s, { w: 1.8, alpha: 0.55 * al, seed: 30 + i });
    });
    CM.chalk.text(ctx, D.T('cloudLabel'), x(0.68), y(0.17), { size: 12 * s + 3, alpha: 0.7 * al });
    // 雨（雲→山）
    for (i = 0; i < 4; i++) CM.chalk.line(ctx, [x(0.6 + i * 0.03), y(0.28), x(0.59 + i * 0.03), y(0.34)], { w: 1.4, color: COL.blue, alpha: 0.5 * al, seed: 40 + i });
    // 矢印：蒸発（海→雲）・しみこむ（山の下へ）
    CM.chalk.line(ctx, [x(0.9), y(0.72), x(0.86), y(0.3), x(0.8), y(0.22)], o);
    CM.chalk.line(ctx, [x(0.82), y(0.2), x(0.8), y(0.22), x(0.825), y(0.245)], o);
    CM.chalk.text(ctx, D.T('evapLabel'), x(0.84), y(0.47), { size: 12 * s + 3, alpha: 0.7 * al, align: 'right' });
    CM.chalk.line(ctx, [x(0.56), y(0.84), x(0.56), y(0.94)], o);
    CM.chalk.line(ctx, [x(0.545), y(0.91), x(0.56), y(0.94), x(0.575), y(0.91)], o);
    CM.chalk.text(ctx, D.T('soakLabel'), x(0.66), y(0.9), { size: 12 * s + 3, alpha: 0.7 * al });
  }
  CM.drawDiagram = drawDiagram;

  /** 犬の落書き（チョークの絵）。d.face＝向き（-1 で左向き） */
  function drawDog(ctx, d, D) {
    if (d.alpha <= 0) return;
    var s = d.ds, f = d.face, seed = Math.floor(D.time * 7);
    var color = d.mode === 'happy' || d.mode === 'play' ? COL.pink : COL.orange;
    var gy = D.gy, by = gy - 22 * s - d.hop;              // 胴のまん中の高さ
    var run = d.mode === 'run' || d.mode === 'play' ? Math.sin(D.time * 25) : 0;
    var o = { w: 2.4 * s, color: color, alpha: d.alpha };
    function L(pts, k) { o.seed = seed + k; CM.chalk.line(ctx, pts, o); }
    var x = d.x;
    // 胴（横長の丸）
    var pts = [];
    for (var i = 0; i <= 16; i++) { var a = i / 16 * TAU; pts.push(x + Math.cos(a) * 26 * s, by + Math.sin(a) * 11 * s); }
    L(pts, 1);
    // 足（4本）
    [-18, -8, 8, 18].forEach(function (lx, k) {
      var sw = (k % 2 ? 1 : -1) * run * 7 * s, eat = d.mode === 'eat' ? 0 : 0;
      L([x + lx * s, by + 8 * s, x + lx * s + sw, gy - d.hop * 0 + eat], 10 + k);
    });
    // しっぽ（うしろ側で、ふりふり）
    var tx = x - f * 25 * s, wag = Math.sin(d.tail) * 0.8;
    L([tx, by - 4 * s, tx - f * 8 * s, by - 14 * s + wag * 5 * s, tx - f * 12 * s + wag * 6 * s, by - 22 * s], 20);
    // 頭（前側）
    var eat2 = d.mode === 'eat' ? 12 * s : 0;
    var hx = x + f * 28 * s, hy = by - 16 * s + eat2;
    CM.chalk.circle(ctx, hx, hy, 12 * s, { w: 2.4 * s, color: color, alpha: d.alpha, seed: seed + 30 });
    // 耳（たれ耳）
    L([hx - f * 4 * s, hy - 10 * s, hx - f * 12 * s, hy - 2 * s, hx - f * 9 * s, hy + 6 * s], 31);
    // 目・鼻・口
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (d.mode === 'happy' || d.mode === 'play') {
      ctx.restore();
      L([hx + f * 1 * s, hy - 3 * s, hx + f * 4 * s, hy - 6 * s, hx + f * 7 * s, hy - 3 * s], 32);
    } else {
      ctx.arc(hx + f * 4 * s, hy - 3 * s, 1.8 * s, 0, TAU);
      ctx.arc(hx + f * 12 * s, hy + 1 * s, 2.2 * s, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (d.mode === 'bark' && (d.t % 1.3) < 0.35) {
      L([hx + f * 6 * s, hy + 5 * s, hx + f * 13 * s, hy + 9 * s, hx + f * 6 * s, hy + 9 * s], 33);   // 口を開けて吠える
    } else if (d.mode === 'eat') {
      L([hx + f * 5 * s, hy + 6 * s, hx + f * 11 * s, hy + 6 * s], 34);
    } else {
      L([hx + f * 5 * s, hy + 6 * s, hx + f * 9 * s, hy + 8 * s, hx + f * 12 * s, hy + 6 * s], 35);
    }
  }

  // ------------------------------------------------------------
  // 落書きの黒板（第1章の作り直し）：絵で描いたもの
  // ------------------------------------------------------------

  /** 黒板いっぱいの、生徒たちの小さな落書き（背景として、うすく） */
  function drawDoodles(ctx, D, al, only) {
    var st = D.st, s = D.s, x = function (f) { return st.x + st.w * f; }, y = function (f) { return st.y + st.h * f; };
    var o = function (c, sd) { return { w: 1.8, color: c || COL.chalk, alpha: 0.55 * al, seed: sd }; };
    // にこにこ顔
    CM.chalk.circle(ctx, x(0.72), y(0.22), 16 * s, o(COL.yellow, 1));
    ctx.save(); ctx.globalAlpha = 0.55 * al; ctx.fillStyle = COL.yellow;
    ctx.beginPath(); ctx.arc(x(0.72) - 5 * s, y(0.22) - 4 * s, 1.8 * s, 0, TAU); ctx.arc(x(0.72) + 5 * s, y(0.22) - 4 * s, 1.8 * s, 0, TAU); ctx.fill(); ctx.restore();
    CM.chalk.line(ctx, [x(0.72) - 8 * s, y(0.22) + 4 * s, x(0.72), y(0.22) + 9 * s, x(0.72) + 8 * s, y(0.22) + 4 * s], o(COL.yellow, 2));
    // 星
    var sx = x(0.9), sy = y(0.14), r1 = 12 * s, r2 = 5 * s, pts = [];
    for (var i = 0; i <= 10; i++) { var a = -PI / 2 + i * PI / 5, r = i % 2 ? r2 : r1; pts.push(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
    CM.chalk.line(ctx, pts, o(COL.yellow, 3));
    // ハート
    var hx = x(0.5), hy = y(0.12), h = 8 * s;
    CM.chalk.line(ctx, [hx, hy + h, hx - h, hy, hx - h * 0.6, hy - h * 0.7, hx, hy - h * 0.2, hx + h * 0.6, hy - h * 0.7, hx + h, hy, hx, hy + h], o(COL.pink, 4));
    // へのへのもへじ
    CM.chalk.text(ctx, D.T('henohenoLabel'), x(0.3), y(0.14), { size: 13 * s + 3, alpha: 0.45 * al });
    // ○×ゲーム
    var gx = x(0.88), gy2 = y(0.5), c = 7 * s;
    CM.chalk.line(ctx, [gx - c, gy2 - 3 * c, gx - c, gy2 + 3 * c], o(null, 5)); CM.chalk.line(ctx, [gx + c, gy2 - 3 * c, gx + c, gy2 + 3 * c], o(null, 6));
    CM.chalk.line(ctx, [gx - 3 * c, gy2 - c, gx + 3 * c, gy2 - c], o(null, 7)); CM.chalk.line(ctx, [gx - 3 * c, gy2 + c, gx + 3 * c, gy2 + c], o(null, 8));
    CM.chalk.circle(ctx, gx, gy2, c * 0.6, o(null, 9));
  }
  CM.drawDoodles = drawDoodles;

  /** 高いビルの落書き（1問目）。屋上の左はし bx、幅 bw、屋上の高さ top、地面 gy */
  function drawBuilding(ctx, b, D) {
    var s = D.s, o = function (sd, al) { return { w: 2.4, alpha: al || 0.9, seed: sd }; };
    CM.chalk.line(ctx, [b.x, b.gy, b.x, b.top, b.x + b.w, b.top, b.x + b.w, b.gy], o(1));
    // 窓（格子）
    var rows = Math.floor((b.gy - b.top) / (34 * s)), cols = 3;
    for (var r = 0; r < rows - 1; r++) {
      for (var c = 0; c < cols; c++) {
        var wx = b.x + b.w * (0.14 + c * 0.3), wy = b.top + 22 * s + r * 34 * s;
        CM.chalk.line(ctx, [wx, wy, wx + b.w * 0.16, wy, wx + b.w * 0.16, wy + 16 * s, wx, wy + 16 * s, wx, wy], { w: 1.6, alpha: 0.55, seed: r * 7 + c });
      }
    }
    // アンテナ
    var ax = b.x + b.w * 0.8;
    CM.chalk.line(ctx, [ax, b.top, ax, b.top - 40 * s], o(40));
    CM.chalk.line(ctx, [ax - 8 * s, b.top - 26 * s, ax + 8 * s, b.top - 26 * s], o(41, 0.7));
    CM.chalk.circle(ctx, ax, b.top - 44 * s, 4 * s, { w: 2, color: COL.red, seed: 42 });
  }

  /** ケーキの落書き（4問目） */
  function drawCake(ctx, x, gy, s, t) {
    var w = 46 * s, h = 34 * s, o = function (c, sd) { return { w: 2.4, color: c, alpha: 0.95, seed: sd }; };
    // 皿
    CM.chalk.line(ctx, [x - w - 10 * s, gy - 2, x + w + 10 * s, gy - 2], o(COL.chalk, 1));
    // 2段のケーキ
    CM.chalk.line(ctx, [x - w, gy - 4, x - w, gy - h, x + w, gy - h, x + w, gy - 4], o(COL.chalk, 2));
    CM.chalk.line(ctx, [x - w * 0.65, gy - h, x - w * 0.65, gy - h * 1.8, x + w * 0.65, gy - h * 1.8, x + w * 0.65, gy - h], o(COL.chalk, 3));
    // クリームのふち（なみなみ）
    var pts = [];
    for (var i = 0; i <= 12; i++) pts.push(x - w + i * w / 6, gy - h + 5 * s + (i % 2) * 5 * s);
    CM.chalk.line(ctx, pts, o(COL.pink, 4));
    // いちご
    [-0.4, 0, 0.4].forEach(function (f, k) {
      var sx = x + f * w, sy = gy - h * 1.8 - 6 * s;
      CM.chalk.line(ctx, [sx - 6 * s, sy, sx, sy + 9 * s, sx + 6 * s, sy, sx - 6 * s, sy], o(COL.red, 5 + k));
    });
    // ろうそくと火
    var cx = x + w * 0.2, cy = gy - h * 1.8 - 10 * s;
    CM.chalk.line(ctx, [cx, cy, cx, cy - 18 * s], o(COL.blue, 9));
    var fl = Math.sin(t * 12) * 1.5 * s;
    CM.chalk.line(ctx, [cx, cy - 20 * s, cx - 4 * s + fl, cy - 26 * s, cx, cy - 33 * s, cx + 4 * s + fl, cy - 26 * s, cx, cy - 20 * s], o(COL.yellow, 10));
  }

  /** 大きな木の落書き（6問目）。幹は空（雲）まで、根は地面の下まで */
  function drawTree(ctx, tr, D) {
    var s = D.s, gy = D.gy, st = D.st, t = D.time;
    var o = function (c, sd, w) { return { w: w || 2.6, color: c || COL.chalk, alpha: 0.95, seed: sd }; };
    var x0 = tr.x - tr.w / 2, x1 = tr.x + tr.w / 2, top = st.y - 20;
    // 幹
    CM.chalk.line(ctx, [x0, gy, x0 + 4 * s, gy - st.h * 0.35, x0 - 2 * s, top], o(COL.orange, 1));
    CM.chalk.line(ctx, [x1, gy, x1 - 4 * s, gy - st.h * 0.35, x1 + 2 * s, top], o(COL.orange, 2));
    // 木の皮のもよう
    for (var i = 0; i < 4; i++) {
      var yy = gy - st.h * (0.12 + i * 0.13);
      CM.chalk.line(ctx, [tr.x - tr.w * 0.25, yy, tr.x - tr.w * 0.05, yy + 3 * s, tr.x + tr.w * 0.15, yy - 2 * s], o(COL.orange, 10 + i, 1.4));
    }
    // 枝と葉（上のほうは雲の中へ）
    [[-1, 0.5], [1, 0.44]].forEach(function (b, k) {
      var by = st.y + st.h * b[1];
      CM.chalk.line(ctx, [tr.x + b[0] * tr.w * 0.4, by + 30 * s, tr.x + b[0] * tr.w * 1.6, by], o(COL.orange, 20 + k));
      CM.chalk.circle(ctx, tr.x + b[0] * tr.w * 1.9, by - 6 * s, 20 * s, o(COL.green, 22 + k));
    });
    // 雲（木のてっぺんのあたり）
    // 雲（木のてっぺんは、この雲の中へ）
    var cy = Math.max(st.y + st.h * 0.24, st.y + 84);
    drawCloud(ctx, tr.x - tr.w * 1.9 + Math.sin(t * 0.5) * 3, cy, 58 * s, 32);
    drawCloud(ctx, tr.x + tr.w * 1.7 + Math.sin(t * 0.5 + 1) * 3, cy + 10 * s, 50 * s, 33);
    function drawCloud(c, x, y, w, sd) {
      var pts = [x - w, y + w * 0.25];
      var bumps = [[-0.75, 0.05, 0.3], [-0.3, -0.25, 0.38], [0.2, -0.3, 0.36], [0.65, -0.05, 0.3]];
      bumps.forEach(function (b, k) {
        for (var i = 0; i <= 6; i++) {
          var a = PI + (i / 6) * PI;
          pts.push(x + b[0] * w + Math.cos(a) * b[2] * w, y + b[1] * w + Math.sin(a) * b[2] * w * 0.9);
        }
      });
      pts.push(x + w, y + w * 0.25, x - w, y + w * 0.25);
      CM.chalk.line(c, pts, o(COL.chalk, sd, 2.2));
    }
    // 根（地面の下へ）
    [[-1, 0.6], [-0.4, 1], [0.3, 0.9], [1, 0.7]].forEach(function (r, k) {
      var rx = tr.x + r[0] * tr.w * 0.4;
      CM.chalk.line(ctx, [rx, gy, rx + r[0] * 18 * s, gy + 22 * s * r[1], rx + r[0] * 34 * s, gy + 40 * s * r[1]], o(COL.orange, 40 + k, 2));
    });
    // 地面の線（木の幹のところは、根元）
    CM.chalk.line(ctx, [st.x + 10, gy, x0 - 2, gy], o(null, 50, 2.4));
    CM.chalk.line(ctx, [x1 + 2, gy, st.x + st.w - 10, gy], o(null, 51, 2.4));
    // 地下へのすき間（根っこの間）
    if (tr.gap > 0) {
      var gx = tr.x - tr.w * 0.9, gw = 30 * s * tr.gap;
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      ctx.fillRect(gx - gw / 2, gy - 3, gw, 7); ctx.restore();
      CM.chalk.line(ctx, [gx - gw / 2, gy, gx - gw / 2 + 24 * s, gy + 50 * s], o(null, 60, 2));
      CM.chalk.line(ctx, [gx + gw / 2, gy, gx + gw / 2 + 24 * s, gy + 50 * s], o(null, 61, 2));
    }
  }

  var SC = CM.SCENES;

  // 1問目：高いビルの落書きの屋上（はじめは寄りの画 → 引いて高さを見せる）
  SC.tower = {
    setup: function (sc, D) {
      var st = D.st, s = D.s;
      var H = st.h * 1.3;                                   // ビルの高さ
      sc.floorY = D.gy;                                     // 下の地面
      sc.gy = D.gy - H;                                     // 屋上（棒人間が立つ高さ）
      sc.bld = { x: st.x + st.w * 0.06, w: st.w * 0.46, top: sc.gy, gy: sc.floorY };
      sc.edgeX = sc.bld.x + sc.bld.w;
      sc.segs = [
        { x0: sc.bld.x, x1: sc.edgeX, y: sc.gy, openR: true },
        { x0: st.x - st.w, x1: st.x + st.w * 2.5, y: sc.floorY }
      ];
      sc.manX = sc.bld.x + sc.bld.w * 0.28; sc.restX = sc.bld.x + sc.bld.w * 0.7;
      sc.landX = sc.edgeX + st.w * 0.32;
      // カメラ：寄り（屋上だけ）と、引き（ビル全体と地面）
      sc.camIn = { cx: st.x + st.w / 2, cy: sc.gy - st.h * 0.3, z: 1 };
      // 引きの画：屋上が上から 3割くらい、地面が下から 1割くらいに見えるように
      var zo = (st.h * 0.62) / H;
      sc.camOut = { cx: (sc.bld.x + sc.landX) / 2 + st.w * 0.1, cy: sc.gy + st.h * 0.22 / zo, z: zo };
    },
    intro: function* (sc, D) {
      yield 0.8;
      D.fx.word(D.T('hmm'), D.man.x + 20 * D.s, sc.gy - 110 * D.s, { size: 20 * D.s + 6 });
      yield 0.6;
      D.sfx.play('whoosh');
      yield D.camTo(sc.camOut, 1.6);
      D.man.play('puzzled');
      D.fx.word(D.T('soHigh'), D.man.x + 40 * D.s, sc.gy - 150 * D.s, { size: (22 * D.s + 6) / sc.camOut.z * 0.8, color: COL.yellow });
      D.sfx.play('gasp');
      yield 1.0;
      D.man.play('idle');
    },
    drawChalk: function (ctx, sc, D) {
      drawBuilding(ctx, sc.bld, D);
      drawGround(ctx, sc, D);
      CM.chalk.text(ctx, D.T('groundLabel'), sc.landX + 60 * D.s, sc.floorY + 22 * D.s, { size: 14 * D.s + 4, alpha: 0.45 });
    }
  };

  // 4問目（新）：おいしそうなケーキの落書き。でも絵は食べられない
  SC.cake = {
    setup: function (sc, D) {
      sc.segs = fullGround(D);
      sc.manX = X(D, 0.2); sc.restX = X(D, 0.4);
      sc.cakeX = X(D, 0.74);
      sc.manAnim = 'hungry';
      sc.hungry = true;
      sc.growlT = 1.2;
    },
    update: function (sc, dt, D) { CM.SCENES.hungry.update(sc, dt, D); },
    drawChalk: function (ctx, sc, D) {
      drawGround(ctx, sc, D);
      drawCake(ctx, sc.cakeX, D.gy, D.s * 1.1, D.time);
      CM.chalk.text(ctx, D.T('cakeLabel'), sc.cakeX, D.gy + 20 * D.s, { size: 13 * D.s + 3, alpha: 0.5 });
    }
  };

  // 3問目（新）：古い黒板の大きなひび割れ
  SC.crack = {
    setup: function (sc, D) {
      SC.cliff.setup(sc, D);
    },
    drawChalk: function (ctx, sc, D) {
      drawGround(ctx, sc, D);
      // ひび（黒板そのものの割れ目。ギザギザが下へのびる）
      var g = sc.gap, s = D.s, m = (g.x0 + g.x1) / 2;
      CM.chalk.line(ctx, [m - 6 * s, D.gy + 20 * s, m + 8 * s, D.gy + 40 * s, m - 4 * s, D.gy + 60 * s], { w: 1.8, alpha: 0.5, seed: 4 });
      CM.chalk.line(ctx, [g.x0, D.gy, g.x0 - 20 * s, D.gy - 30 * s, g.x0 - 8 * s, D.gy - 60 * s], { w: 1.4, alpha: 0.35, seed: 5 });
      CM.chalk.line(ctx, [g.x1, D.gy, g.x1 + 16 * s, D.gy - 24 * s], { w: 1.4, alpha: 0.35, seed: 6 });
    }
  };

  // 6問目（新）：大きな木の落書き。上は雲の中、下は根っこ（分かれ道）
  SC.tree = {
    setup: function (sc, D) {
      sc.segs = [];
      sc.tree = { x: X(D, 0.62), w: 44 * D.s, gap: 0 };
      sc.manX = X(D, 0.14); sc.restX = X(D, 0.34);
    },
    drawChalk: function (ctx, sc, D) { drawTree(ctx, sc.tree, D); }
  };

  // プロローグ（新）：落書きだらけの黒板
  SC.prologue.drawChalk = function (ctx, sc, D) {
    drawGround(ctx, sc, D);
    drawDoodles(ctx, D, 1);
    drawDog(ctx, { x: D.st.x + D.st.w * 0.55, hop: 0, mode: 'idle', t: 0, alpha: 0.6, face: -1, tail: D.time * 3, ds: D.s * 0.7 }, D);
    drawCake(ctx, D.st.x + D.st.w * 0.82, D.gy, D.s * 0.6, D.time);
  };
})(window);
